'use strict'

const EventEmitter = require('events')
const winston = require('winston')

class RobotStubInterface extends EventEmitter {

  constructor () {
    super()
    winston.log('info', 'Created RobotStubInterface')
  }

  start (serialPort, options, sensors, initializer) {
    winston.log('info', 'Serial Port: %s', serialPort)
    winston.log('info', 'Options: %j', options)
    winston.log('info', 'Sensors: %j', sensors)

    this.emit('ready')
  }

  sendCommand (command, values) {
    winston.log('info', 'Robot Command: %d', command)
    if (values) {
      winston.log('info', '  Arguments: %j', values)
    }
  }

}

module.exports.RobotStubInterface = RobotStubInterface
