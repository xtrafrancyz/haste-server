import fs from 'fs';
import crypto from 'crypto';
import winston from 'winston';
import { promisify } from 'util';

const fs_readdir = promisify(fs.readdir);
const fs_stat = promisify(fs.stat);
const fs_unlink = promisify(fs.unlink);

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
			setInterval(() => this.cleanup(), 60 * 60 * 1000); // one hour
		}
	}

	async cleanup() {
		const files = await fs_readdir(this.basePath);
		const BATCH_SIZE = 100;
		for (let i = 0; i < files.length; i += BATCH_SIZE) {
			const batch = files.slice(i, i + BATCH_SIZE);
			const now = Date.now();
			await Promise.allSettled(batch.map(async file => {
				const path = this.basePath + '/' + file;
				const stat = await fs_stat(path);
				if (now - stat.mtime.getTime() > this.expire * 1000) {
					await fs_unlink(path);
					winston.info('Deleted file: ' + path);
				}
			}));
			// Yield to the event loop
			await new Promise(resolve => setImmediate(resolve));
		}
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
