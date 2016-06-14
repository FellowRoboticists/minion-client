#!/usr/bin/env node
'use strict'

/**
 * The client for the services provided by the
 * server.
 */

const fs = require('fs')
const queueSVC = require('robot-queue-service')
const signer = require('./lib/signer')
const beanstalk = require('./config/beanstalk')
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
  // Start up the beanstalk queuing
  queueSVC.connect('incomingCommands', beanstalk.host, beanstalk.port, handleIncomingCommandsConnect, reconnectCount)
    .then(() => {
      return new Promise((resolve, reject) => {
        fs.readFile(secrets.serverKey, 'utf8', (err, key) => {
          if (err) {
            winston.log('error', 'Error reading file: %j', err)
            return reject(err)
          }
          resolve(key)
        })
      })
      .then((key) => {
        worker = new RobotWorker(
          robotCFG.name, key, robot, {
            serialport: program.serialport,
            baudrate: program.baudrate,
            initializer: initializer })
        if (!program.none) initializer.registerHandlers(robot, worker)
        winston.log('info', 'Starting to listen on %sCommand', worker.robotName)
        return queueSVC.processRobotJobsInTube('incomingCommands', worker.robotName + 'Command', worker)
          .then(() => winston.log('info', '--'))
      })
    })
    .catch((err) => {
      winston.log('error', 'Error connecting to incomingCommands: %j', err)
      process.exit()
    })
}

handleIncomingCommandsConnect()

const handleTalkerConnect = (reconnectCount = 0) => {
  queueSVC.connect('talker', beanstalk.host, beanstalk.port, handleTalkerConnect, reconnectCount)
    .then(() => {
      winston.log('info', 'Connected to Talker')
      // Tell the server we're ready to go
      return signer.sign({ name: robotCFG.name, message: 'ready' })
        .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))
    })
    .then(() => {
    })
    .catch((err) => {
      winston.log('error', 'Error connecting to talker: %j', err)
      process.exit()
    })
}

handleTalkerConnect()

robot.on('ready', function () {
  winston.log('info', 'The robot is ready for motivation')
  // Report back to the server this very interesting event...
  signer.sign({ name: robotCFG.name, message: 'connected', value: 1 })
    .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))
})

