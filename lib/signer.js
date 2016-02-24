module.exports = (() => {
  const jwt = require('jsonwebtoken');
  const fs = require('fs');
  const secrets = require('../config/secrets');

  var __privateKey = null;

  const __getPrivateKey = () => {
    return new Promise( (resolve, reject) => {
      if (!__privateKey) {
        fs.readFile(secrets.robotKey, 'utf8', (err, key) => {
          if (err) { return reject(err) }
          __privateKey = key;
          resolve(key);
        });
      } else {
        resolve(__privateKey);
      }
    });
  };

  const verify = (token, publicKey) => {
    return new Promise( (resolve, reject) => {
      jwt.verify(token, publicKey, (err, payload) => {
        if (err) { return reject(err) }
        resolve(payload);
      });
    });
  };

  const sign = (payload) => {
    return __getPrivateKey().
      then( (key) => jwt.sign(payload, key, { algorithm: 'RS512' }) );
  };

  var mod = {

    sign: sign,
    verify: verify

  };

  return mod;

}());
