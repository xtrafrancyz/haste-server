import winston from 'winston';
import Busboy from 'busboy';

// For handling serving stored documents

class DocumentHandler {
  static defaultKeyLength = 10;

  constructor(options) {
    if (!options) {
      options = {};
    }
    this.keyLength = options.keyLength || DocumentHandler.defaultKeyLength;
    this.maxLength = options.maxLength; // none by default
    this.store = options.store;
    this.keyGenerator = options.keyGenerator;
  }

  // Handle retrieving a document
  handleGet(request, response, config) {
    const key = request.params.id.split('.')[0];
    const skipExpire = !!config.documents[key];

    this.store.get(key, (ret) => {
      if (ret) {
        winston.verbose('retrieved document', { key: key });
        response.writeHead(200, { 'content-type': 'application/json' });
        if (request.method === 'HEAD') {
          response.end();
        } else {
          response.end(JSON.stringify({ data: ret, key: key }));
        }
      } else {
        winston.warn('document not found', { key: key });
        response.writeHead(404, { 'content-type': 'application/json' });
        if (request.method === 'HEAD') {
          response.end();
        } else {
          response.end(JSON.stringify({ message: 'Document not found.' }));
        }
      }
    }, skipExpire);
  }

  // Handle retrieving the raw version of a document
  handleRawGet(request, response, config) {
    const key = request.params.id.split('.')[0];
    const skipExpire = !!config.documents[key];

    this.store.get(key, (ret) => {
      if (ret) {
        winston.verbose('retrieved raw document', { key: key });
        response.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' });
        if (request.method === 'HEAD') {
          response.end();
        } else {
          response.end(ret);
        }
      } else {
        winston.warn('raw document not found', { key: key });
        response.writeHead(404, { 'content-type': 'application/json' });
        if (request.method === 'HEAD') {
          response.end();
        } else {
          response.end(JSON.stringify({ message: 'Document not found.' }));
        }
      }
    }, skipExpire);
  }

  // Handle adding a new Document
  handlePost(request, response) {
    let buffer = '';
    let cancelled = false;

    // What to do when done
    const onSuccess = () => {
      this.chooseKey((key) => {
        this.store.set(key, buffer, (res) => {
          if (res) {
            winston.verbose('added document', { key: key });
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ key: key }));
          } else {
            winston.verbose('error adding document');
            response.writeHead(500, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ message: 'Error adding document.' }));
          }
        });
      });
    };

    // If we should, parse a form to grab the data
    const ct = request.headers['content-type'];
    if (ct && ct.split(';')[0] === 'multipart/form-data') {
      const busboy = new Busboy({
        headers: request.headers,
        limits: {
          fieldSize: this.maxLength
        }
      });
      busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated) => {
        if (fieldname === 'data') {
          if (valTruncated) {
            cancelled = true;
            winston.warn('document >maxLength', { maxLength: this.maxLength });
            response.writeHead(400, { 'content-type': 'application/json' });
            response.end(
              JSON.stringify({ message: 'Document exceeds maximum length.' })
            );
            return;
          }
          buffer = val;
        }
      });
      busboy.on('finish', () => {
        if (cancelled) { return; }
        onSuccess();
      });
      request.pipe(busboy);
      // Otherwise, use our own and just grab flat data from POST body
    } else {
      request.on('data', (data) => {
        if (cancelled) {
          return;
        }
        buffer += data.toString();
        if (this.maxLength && buffer.length > this.maxLength) {
          cancelled = true;
          winston.warn('document >maxLength', { maxLength: this.maxLength });
          response.writeHead(400, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({ message: 'Document exceeds maximum length.' })
          );
        }
      });
      request.on('end', () => {
        if (cancelled) {
          return;
        }
        onSuccess();
      });
      request.on('error', (error) => {
        winston.error('connection error: ' + error.message);
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Connection error.' }));
        cancelled = true;
      });
    }
  }

  // Keep choosing keys until one isn't taken
  chooseKey(callback) {
    const key = this.acceptableKey();
    this.store.get(key, (ret) => {
      if (ret) {
        this.chooseKey(callback);
      } else {
        callback(key);
      }
    }, true); // Don't bump expirations when key searching
  }

  acceptableKey() {
    return this.keyGenerator.createKey(this.keyLength);
  }
}

export default DocumentHandler;
