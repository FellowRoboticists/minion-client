'use strict'

module.exports = (function () {
  const fs = require('fs')

  const CA_CERT = process.env.RABBITMQ_CA_CERT
  const CLIENT_CERT = process.env.CLIENT_CERT
  const CLIENT_KEY = process.env.CLIENT_KEY

  var mod = {
    url: process.env.RABBITMQ_URL,
    options: {
      cert: fs.readFileSync(CLIENT_CERT),
      key: fs.readFileSync(CLIENT_KEY),
      rejectUnauthorized: false,
      ca: [ fs.readFileSync(CA_CERT) ]
    }
  }

  return mod
}())
