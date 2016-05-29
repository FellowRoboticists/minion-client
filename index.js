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

program
  .version('1.0.0')
  .option('-a,--arduino', 'Arduino robot')
  .option('-c,--create', 'iRobot Create Robot')
  .option('-r,--robot', 'The real robot')
  .option('-b,--baudrate [rate]', 'Baud rate [9600]', 9600)
  .option('-s,--serialport [port]', 'Serial port [/dev/ttyUSB0]', '/dev/ttyUSB0')
  .parse(process.argv)

var initializer = null
if (program.arduino) {
  initializer = require('./lib/arduino-initializer')
}

if (program.robot) {
  initializer = require('./lib/robot-initializer')
}

if (program.create) {
  initializer = require('./lib/create-initializer')
}

if (!initializer) {
  console.error('You must specify the robot type!')
  process.exit(1)
}

var robot = new RobotSerialInterface()

// Start the interface...
robot.start(program.serialport, { baudrate: program.baudrate }, initializer.sensors, initializer.initializer)

// Start up the beanstalk queuing
queueSVC.connect('incomingCommands', beanstalk.host, beanstalk.port)
  .then(() => {
    fs.readFile(secrets.serverKey, 'utf8', (err, key) => {
      if (err) {
        console.error('Error reading file: %j', err)
        process.exit(1)
      }
      var worker = new RobotWorker(robotCFG.name, key, robot)
      console.log('Starting to listen on %sCommand', worker.robotName)
      queueSVC.processRobotJobsInTube('incomingCommands', worker.robotName + 'Command', worker)
        .then(() => console.log('--'))
    })
  })

queueSVC.connect('talker', beanstalk.host, beanstalk.port)
  .then(() => {
    console.log('Connected to Talker')
    // Tell the server we're ready to go
    return signer.sign({ name: robotCFG.name, message: 'ready' })
      .then((token) => {
        queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token)
      })
  })
  .then(() => {
  })

robot.on('ready', function () {
  console.log('The robot is ready for motivation')
  // Report back to the server this very interesting event...
  signer.sign({ name: robotCFG.name, message: 'ready', value: 1 })
    .then((token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token))
})

initializer.registerHandlers(robot)

