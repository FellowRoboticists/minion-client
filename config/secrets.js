'use strict'

module.exports = (function () {
  var mod = {

    robotKey: process.env.ROBOT_PRIVATE_KEY,
    serverKey: process.env.SERVER_PUBLIC_KEY
  }

  return mod
}())
