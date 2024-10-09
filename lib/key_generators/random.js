export default class RandomKeyGenerator {
  constructor(options = {}) {
    this.keyspace = options.keyspace || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }

  createKey(keyLength) {
    let text = '';

    for (let i = 0; i < keyLength; i++) {
      const index = Math.floor(Math.random() * this.keyspace.length);
      text += this.keyspace.charAt(index);
    }

    return text;
  }
}
