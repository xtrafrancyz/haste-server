import AWS from 'aws-sdk';
import winston from 'winston';

class AmazonS3DocumentStore {
  constructor(options) {
    this.expire = options.expire;
    this.bucket = options.bucket;
    this.client = new AWS.S3({ region: options.region });
  }

  get(key, callback, skipExpire) {
    const req = {
      Bucket: this.bucket,
      Key: key
    };

    this.client.getObject(req, (err, data) => {
      if (err) {
        callback(false);
      } else {
        callback(data.Body.toString('utf-8'));
        if (this.expire && !skipExpire) {
          winston.warn('amazon s3 store cannot set expirations on keys');
        }
      }
    });
  }

  set(key, data, callback, skipExpire) {
    const req = {
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: 'text/plain'
    };

    this.client.putObject(req, (err, data) => {
      if (err) {
        callback(false);
      } else {
        callback(true);
        if (this.expire && !skipExpire) {
          winston.warn('amazon s3 store cannot set expirations on keys');
        }
      }
    });
  }
}

export default AmazonS3DocumentStore;
