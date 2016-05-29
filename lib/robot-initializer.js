'use strict'

module.exports = (function () {
  const robotInitializer = function (rsi) {
    rsi.ready()
  }

  const ROBOT_SENSORS = [
    {
      name: 'proximity',
      startByte: 0x01,
      numBytes: 2,
      meetsThreshold: (value) => true
    }
  ]

  const registerHandlers = (robot) => {
    robot.on('proximity', function (value) {
      console.log('Proximity: %j', value)
    })
  }

  var mod = {
    initializer: robotInitializer,
    sensors: ROBOT_SENSORS,
    registerHandlers: registerHandlers
  }

  return mod
}())
