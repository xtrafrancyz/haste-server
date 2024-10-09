import assert from 'assert';
import Generator from '../../lib/key_generators/random.js';

describe('PhoneticKeyGenerator', () => {
  describe('randomKey', () => {
    it('should return a key of the proper length', () => {
      const gen = new Generator();
      assert.equal(6, gen.createKey(6).length);
    });

    it('should use a key from the given keyset if given', () => {
      const gen = new Generator({keyspace: 'A'});
      assert.equal('AAAAAA', gen.createKey(6));
    });
  });
});
