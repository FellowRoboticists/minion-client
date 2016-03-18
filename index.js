#!/usr/bin/env node

/**
 * The client for the services provided by the
 * server.
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const queueSVC = require('robot-queue-service');
const signer = require('./lib/signer');
const beanstalk = require('./config/beanstalk');
const secrets = require('./config/secrets');
const robotCFG = require('./config/robot');
const RobotWorker = require('./lib/robot-worker');
const RobotSerialInterface = require('robot-serial-iface').RobotSerialInterface;
var program = require('commander')

program.
  version('1.0.0').
  option('-a,--arduino', 'Arduino robot').
  option('-b,--baudrate [rate]', 'Baud rate [9600]', 9600).
  option('-c,--create', 'iRobot Create Robot').
  option('-s,--serialport [port]', 'Serial port [/dev/ttyUSB0]', '/dev/ttyUSB0').
  parse(process.argv);

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
    // is greater than 20
    meetsThreshold: (value) => value < 40
  }
];

const CREATE_SENSORS = [
  {
    name: 'bump',
    startByte: 0x07,
    numBytes: 1
  },
  {
    name: 'proximity',
    startByte: 0x21,
    numBytes: 2
  }
];

var sensors = null;
if (program.arduino) {
  sensors = ARDUINO_SENSORS;
}

if (program.create) {
  sensors = CREATE_SENSORS;
}
if (!sensors) {
  console.error("You must specify the robot type!");
  process.exit(1);
}

var robot = new RobotSerialInterface();
// Start the interface...
robot.start(program.serialport, { baudrate: program.baudrate }, sensors);


// Start up the beanstalk queuing
queueSVC.connect('incomingCommands', beanstalk.host, beanstalk.port).
  then( () => {
    fs.readFile(secrets.serverKey, 'utf8', (err, key) => {
      if (err) { 
        console.error("Error reading file: %j", err);
        process.exit(1);
      }
      var worker = new RobotWorker(robotCFG.name, key, robot);
      console.log("Starting to listen on %sCommand", worker.robotName);
      queueSVC.processRobotJobsInTube('incomingCommands', worker.robotName + 'Command', worker).
        then( () => console.log("--") );
      });
  });

queueSVC.connect('talker', beanstalk.host, beanstalk.port).
  then( () => {
    console.log("Connected to Talker");
    // Tell the server we're ready to go
    return signer.sign({ name: robotCFG.name, message: 'ready' }).
      then( (token) => {
        queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token) 
      });
  }).
  then( () => {
  });

const temperatureHandler = function(temp) {
  console.log("Temperature: %d", temp);
  signer.sign({ name: robotCFG.name, message: 'temperature', value: temp }).
    then( (token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token) );
};

const humidityHandler = function(humidity) {
  console.log("Humidity: %d", humidity);
  signer.sign({ name: robotCFG.name, message: 'humidity', value: humidity }).
    then( (token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token) );
};

const bumpHandler = function(bumperEvt) {
  var r = this;
  console.log("Inside the bump handler");

  // Temporarily disable further bump events. Getting
  // multiple bump events while one is in progress will
  // cause weird interleaving of our root behavior.
  r.off('bump');

  signer.sign({ name: robotCFG.name, message: 'bump' }).
    then( (token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token) );

  // Back up a bit
  r.drive(-100, 0);
  r.wait(1000);
  r.drive(0, 0); // Stop..

  r.on('bump', bumpHandler);
};

const proximityHandler = function(proximityEvt) {
  var r = this;
  
  console.log("Inside the proximity handler");

  // Temporarily disable further bump events. Getting
  // multiple bump events while one is in progress will
  // cause weird interleaving of our root behavior.
  r.off('proximity');

  signer.sign({ name: robotCFG.name, message: 'proximity', value: proximityEvt }).
    then( (token) => queueSVC.queueJob('talker', robotCFG.name, 100, 0, 300, token) );

  // Back up a bit
  r.drive(-100, 0);
  r.wait(1000);
  r.drive(0, 0); // Stop..

  r.on('proximity', proximityHandler);
};

// TODO: Add other robot event here (like the bump handler)
if (program.create) {
  robot.on('bump', bumpHandler);
  robot.on('proximity', proximityHandler);
}
if (program.arduino) {
  robot.on('temperature', temperatureHandler);
  robot.on('humidity', humidityHandler);
}

