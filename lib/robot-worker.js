'use strict'

module.exports = (function () {
  const signer = require('./signer')
  const winston = require('winston')
  const DefaultSpeed = 150
  const SpeedIncrement = 10
  const DRIVE = 0x89
  const SAFE = 0x83
  const DRV_FWD_RAD = 0x7fff;

  const uB = (word) => word >> 8

  const lB = (word) => word & 0x000000ff

  const RobotWorker = function (robotName, serverKey, robot, robotCfg) {
    this.robotName = robotName
    this.serverKey = serverKey
    this.robot = robot
    this.robotCfg = robotCfg
    this.speed = DefaultSpeed
    this.lastCommand = null
    this.connected = false

    this.__drive = function (speed, direction) {
      if (!this.connected) return

      this.robot.sendCommand(SAFE)
      if (Math.abs(direction) < 0.0001) {
         direction = DRV_FWD_RAD;
      }
      this.robot.sendCommand(DRIVE, [uB(speed), lB(speed), uB(direction), lB(direction)])
    }

    this.__robotCommand = function (command) {
      winston.log('debug', 'robotCommand(%s)', command)
      var doLastCommand = false
      switch (command) {
        case 'connect':
          this.robot.start(this.robotCfg.serialport, 
                           { baudrate: this.robotCfg.baudrate }, 
                           this.robotCfg.initializer.sensors, 
                           this.robotCfg.initializer.initializer)
          this.connected = true
          this.lastCommand = null
          break
        case 'forward':
          this.__drive(this.speed, 0)
          this.lastCommand = 'forward'
          break

        case 'backward':
          this.__drive(-this.speed, 0)
          this.lastCommand = 'backward'
          break

        case 'left':
          this.__drive(this.speed, 1)
          this.lastCommand = 'left'
          break

        case 'right':
          this.__drive(-this.speed, 1)
          this.lastCommand = 'right'
          break

        case 'slowdown':
          this.speed -= SpeedIncrement
          doLastCommand = true
          break

        case 'speedup':
          this.speed += SpeedIncrement
          doLastCommand = true
          break

        case 'stop':
          this.__drive(0, 0)
          this.speed = DefaultSpeed
          this.lastCommand = null
          break

        default:
          winston.log('warn', 'Unknown command received: %s', command)
          break
      }

      return doLastCommand
    }

    this.process = function (job) {
      return signer.verify(job.payload, this.serverKey)
        .then((payload) => {
          winston.log('debug', 'Received command: %j', payload, {})
          if (!this.robot) return
          if (this.__robotCommand(payload.command)) {
            if (this.lastCommand) {
              this.__robotCommand(this.lastCommand)
            }
          }
        })
    }
  }

  return RobotWorker
}())
