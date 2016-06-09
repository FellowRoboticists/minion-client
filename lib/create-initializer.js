'use strict'

module.exports = (function () {
  const winston = require('winston')
  const signer = require('./signer')
  const queueSVC = require('robot-queue-service')
  const robotCFG = require('../config/robot')

  const createCommands = {
    START: 0x80,
    SAFE: 0x83,
    DRIVE: 0x89,
    LED: 0x8B,
    SONG: 0x8C,
    PLAY: 0x8D,
    STREAM: 0x94
  }

  let robotWorker = null

  /**
   * NOTE: The interface for the robot serial interface initializer should
   * pass a reference to the RSI rather than the serial port. That way
   * we can call the 'rsi.sendCommand' method.
   */
  const createInitializer = function (rsi) {
    winston.log('debug', 'Sending initializer commands to robot: %j', createCommands.START)
    rsi.sendCommand(createCommands.START)
    rsi.wait(100)
      .then(() => {
        rsi.sendCommand(createCommands.SAFE)
        return 100 // wait amount
      })
      .then(rsi.wait)
      .then(() => {
        // set song 0 to single beep
        rsi.sendCommand(createCommands.SONG, [0x0, 0x01, 72, 10])
        return 100
      })
      .then(rsi.wait)
      .then(() => {
        // play song 0
        rsi.sendCommand(createCommands.PLAY, [0x0])
        return 100
      })
      .then(rsi.wait)
      .then(() => {
        rsi.sendCommand(createCommands.STREAM, [2, 7, 33])
        // rsi.sendCommand(createCommands.STREAM, [3, 7, 19, 20])
        return 100
      })
      .then(rsi.wait)
      .then(() => {
        // turn power LED on (and green)
        rsi.sendCommand(createCommands.LED, [8, 0, 255])
        return 100
      })
      .then(rsi.wait)
      .then(() => {
        // Not really sure if we need to emit an event
        // here. For now, we'll just skip it.
        winston.log('debug', 'Ready to go, dude')
        rsi.ready()
        // eventer.emit('ready')
      })
  }

  let lData = 0

  const CREATE_SENSORS = [
    {
      name: 'bump',
      startByte: 0x07,
      numBytes: 1,
      meetsThreshold: (value) => {
        let bump = value > 0 && value < 4 && lData === 0
        if (bump) {
          winston.log('debug', 'Bump value = %d, lData = %d', value, lData)
        }
        lData = value
        return bump
      }
    },
    {
      name: 'proximity',
      startByte: 0x21,
      numBytes: 2,
      meetsThreshold: (value) => false
    }
  ]

  const bumpHandler = function (bumperEvt) {
    var r = this
    winston.log('debug', 'Inside the bump handler: %j', bumperEvt)

    // Temporarily disable further bump events. Getting
    // multiple bump events while one is in progress will
    // cause weird interleaving of our root behavior.
    // r.off('bump')
    r.removeAllListeners('bump')

    signer.sign({ name: robotCFG.name, message: 'bump' })
      .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))

    // Back up a bit
    robotWorker.__drive(-100, 0)
    winston.log('debug', 'Waiting for a two seconds')
    r.wait(2000)
      .then(() => {
        winston.log('debug', 'Second is up; stop it')
        robotWorker.__drive(0, 0) // Stop..
        r.on('bump', bumpHandler)
      })
  }

  const proximityHandler = function (proximityEvt) {
    var r = this

    winston.log('debug', 'Inside the proximity handler: %j', proximityEvt)

    // Temporarily disable further bump events. Getting
    // multiple bump events while one is in progress will
    // cause weird interleaving of our root behavior.
    r.removeListener('proximity',proximityHandler)

    signer.sign({ name: robotCFG.name, message: 'proximity', value: proximityEvt })
      .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))

    // Back up a bit
    robotWorker.__drive(-100, 0)
    r.wait(2000)
      .then(() => {
        robotWorker.__drive(0, 0) // Stop..
        r.on('proximity', proximityHandler)
      })
  }

  const registerHandlers = function (robot, worker) {
    robotWorker = worker
    robot.on('bump', bumpHandler)
    robot.on('proximity', proximityHandler)
  }

  var mod = {
    initializer: createInitializer,
    sensors: CREATE_SENSORS,
    registerHandlers: registerHandlers
  }

  return mod
}())
