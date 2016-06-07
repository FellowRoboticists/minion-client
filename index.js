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
  .option('-b,--baudrate [rate]', 'Baud rate [9600]', 9600)
  .option('-s,--serialport [port]', 'Serial port [/dev/ttyUSB0]', '/dev/ttyUSB0')
  .option('-n,--none', 'Do not connect to serial port')
  .parse(process.argv)

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

if (!program.none && !initializer) {
  winston.log('error', 'You must specify the robot type!')
  process.exit(1)
}

// Start the interface...
let robot = null;
if (!program.none) {
  winston.log('debug', 'Starting the robot serial interface')
  robot = new RobotSerialInterface()
  robot.start(program.serialport, { baudrate: program.baudrate }, initializer.sensors, initializer.initializer)
}

// Start up the beanstalk queuing
queueSVC.connect('incomingCommands', beanstalk.host, beanstalk.port)
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
      var worker = new RobotWorker(robotCFG.name, key, robot)
      winston.log('info', 'Starting to listen on %sCommand', worker.robotName)
      return queueSVC.processRobotJobsInTube('incomingCommands', worker.robotName + 'Command', worker)
        .then(() => winston.log('info', '--'))
    })
  })
  .catch((err) => {
    winston.log('error', 'Error connecting to incomingCommands: %j', err)
    process.exit()
  })

queueSVC.connect('talker', beanstalk.host, beanstalk.port)
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

if (!program.none) {
  robot.on('ready', function () {
    winston.log('info', 'The robot is ready for motivation')
    // Report back to the server this very interesting event...
    signer.sign({ name: robotCFG.name, message: 'ready', value: 1 })
      .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))
  })
}

if (!program.none) initializer.registerHandlers(robot)

