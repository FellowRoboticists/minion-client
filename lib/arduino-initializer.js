'use strict'

module.exports = (function () {
  const signer = require('./signer')
  const queueSVC = require('robot-queue-service')
  const robotCFG = require('../config/robot')

  const arduinoInitializer = function (rsi) {
    rsi.ready()
  }

  const ARDUINO_SENSORS = [
    {
      name: 'temperature',
      startByte: 0x03,
      numBytes: 2
    },
    {
      name: 'humidity',
      startByte: 0x02,
      numBytes: 2,
      // Only emit the humidity event if the humidity
      // is less than 40
      meetsThreshold: (value) => value < 40
    },
    {
      name: 'proximity',
      startByte: 0x01,
      numBytes: 2
    }
  ]

  const temperatureHandler = function (temp) {
    console.log('Temperature: %d', temp)
    signer.sign({ name: robotCFG.name, message: 'temperature', value: temp })
      .then((token) => queueSVC.sendToQueue('talker', robotCFG.name, new Buffer(token)))
  }

  const humidityHandler = function (humidity) {
    console.log('Humidity: %d', humidity)
    signer.sign({ name: robotCFG.name, message: 'humidity', value: humidity })
      .then((token) => queueSVC.sendToQueue('talker', robotCFG.name, new Buffer(token)))
  }

  const proximityHandler = function (distance) {
    console.log('Proximity: %d', distance)
    signer.sign({ name: robotCFG.name, message: 'proximity', value: distance })
      .then((token) => queueSVC.sendToQueue('talker', robotCFG.name, new Buffer(token)))
  }

  const registerHandlers = (robot) => {
    robot.on('temperature', temperatureHandler)
    robot.on('humidity', humidityHandler)
    robot.on('proximity', proximityHandler)
  }

  var mod = {
    initializer: arduinoInitializer,
    sensors: ARDUINO_SENSORS,
    registerHandlers: registerHandlers
  }

  return mod
}())
