'use strict'

module.exports = (function () {
  var mod = {

    // robotKey: '../Keys/sarah_rsa',
    // serverKey: '../Keys/telep_rsa.pub.pem'
    robotKey: '/etc/ssl/private/sarah_rsa',
    serverKey: '/etc/ssl/certs/telep_rsa.pub.pem'
  }

  return mod
}())
