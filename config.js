{

  "host": "0.0.0.0",
  "port": 777,

  "keyLength": 10,

  "maxLength": 400000,

  "staticMaxAge": 86400,

  "recompressStaticAssets": true,

  "logging": [
    {
      "level": "verbose",
      "type": "Console",
      "colorize": true
    }
  ],

  "keyGenerator": {
    "type": "phonetic"
  },

  "storage": {
    "type": "file",
	"path": "./data",
    "expire": 2592000
  },

  "documents": {
    "about": "./about.md"
  }

}
