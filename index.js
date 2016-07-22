#!/usr/bin/env node
'use strict'

/**
 * The client for the services provided by the
 * server.
 */

const fs = require('fs')
const queueSVC = require('robot-queue-service')
const signer = require('./lib/signer')
const rabbit = require('./config/rabbit')
const secrets = require('./config/secrets')
const robotCFG = require('./config/robot')
const RobotWorker = require('./lib/robot-worker')
const RobotSerialInterface = require('robot-serial-iface').RobotSerialInterface
const program = require('commander')
const winston = require('winston')

winston.level = process.env.LOG_LEVEL || 'info'

program
  .version('1.0.0')
  .option('-a,--arduino', 'Arduino robot')
  .option('-c,--create', 'iRobot Create Robot')
  .option('-r,--robot', 'The real robot')
  .option('-b,--baudrate [rate]', `Baud rate [${robotCFG.baudrate}]`, robotCFG.baudrate)
  .option('-s,--serialport [port]', `Serial port [${robotCFG.serialport}]`, robotCFG.serialport)
  .parse(process.argv)

var worker = null

var initializer = null
if (program.arduino) {
  winston.log('debug', 'Using arduino initialer')
  initializer = require('./lib/arduino-initializer')
}

if (program.robot) {
  winston.log('debug', 'Using robot initialer')
  initializer = require('./lib/robot-initializer')
}

if (program.create) {
  winston.log('debug', 'Using create initialer')
  initializer = require('./lib/create-initializer')
}

if (!initializer) {
  winston.log('error', 'You must specify the robot type!')
  process.exit(1)
}

// Start the interface...
winston.log('debug', 'Starting the robot serial interface')
let robot = new RobotSerialInterface()

const handleIncomingCommandsConnect = (reconnectCount = 0) => {
  return queueSVC.connect(rabbit.url, rabbit.options)
    .then((conn) => {
      winston.log('info', 'Established connection to %s', rabbit.url)
      return queueSVC.createChannel('talker')
        .then((ch) => {
          winston.log('info', 'talker channel established')
        })
        .catch((err) => {
          winston.log('error', 'Talker error: %j', err)
          throw err
        })
    })
    .then(() => {
      return queueSVC.createChannel('listener')
        .then((ch) => {
          winston.log('info', 'listener channel established')
        })
    })
    .then(() => {
      let key = fs.readFileSync(secrets.serverKey)
      worker = new RobotWorker(
        robotCFG.name, key, robot, {
          serialport: program.serialport,
          baudrate: program.baudrate,
          initializer: initializer })
      if (!program.none) initializer.registerHandlers(robot, worker)
      winston.log('info', 'Starting to listen on %sCommand', worker.robotName)
      return queueSVC.consume('listener', worker.robotName + 'Command', worker)
    })
    .then(() => {
      // Tell the server we're ready to go
      return signer.sign({ name: robotCFG.name, message: 'ready' })
        .then((token) => queueSVC.sendToQueue('talker', robotCFG.name, new Buffer(token)))
    })
}

handleIncomingCommandsConnect()
  .catch((err) => {
    if (err instanceof Error) {
      console.error(err.stack)
    } else {
      console.error('Error: %j', err)
    }
    process.exit()
  })

robot.on('ready', function () {
  winston.log('info', 'The robot is ready for motivation')
  // Report back to the server this very interesting event...
  signer.sign({ name: robotCFG.name, message: 'connected', value: 1 })
    .then((token) => queueSVC.sendToQueue('talker', robotCFG.name, new Buffer(token)))
})

