import fs from 'fs';
import crypto from 'crypto';
import winston from 'winston';

// For storing in files
// options[type] = file
// options[path] - Where to store

const md5 = (str) => {
	const md5sum = crypto.createHash('md5');
	md5sum.update(str);
	return md5sum.digest('hex');
}

class FileDocumentStore {
	constructor(options) {
		this.basePath = options.path || './data';
		this.expire = options.expire;

		if (this.expire) {
			this.cleanup();
			setInterval(this.cleanup, 60 * 60 * 1000, this); // one hour
		}
	}

	cleanup() {
		fs.readdir(this.basePath, (err, files) => {
			files.forEach((file) => {
				var path = this.basePath + '/' + file;
				fs.stat(path, (err, stat) => {
					if (Date.now() - stat.mtime.getTime() > this.expire * 1000) {
						fs.unlink(path, () => { });
						winston.info('Deleted file: ' + path);
					}
				});
			});
		});
	}

	set(key, data, callback, skipExpire) {
		try {
			fs.mkdir(this.basePath, '700', () => {
				var fn = this.basePath + '/' + md5(key);
				fs.writeFile(fn, data, 'utf8', (err) => {
					if (err) {
						callback(false);
					} else {
						callback(true);
					}
				});
			});
		} catch (err) {
			callback(false);
		}
	}

	get(key, callback, skipExpire) {
		var fn = this.basePath + '/' + md5(key);
		fs.readFile(fn, 'utf8', (err, data) => {
			if (err) {
				callback(false);
			} else {
				callback(data);
				if (this.expire && !skipExpire) {
					fs.stat(fn, () => {
						fs.utimes(fn, Date.now() / 1000, Date.now() / 1000, () => { });
					});
				}
			}
		});
	}
}

export default FileDocumentStore;
