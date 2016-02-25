#!/usr/bin/env node

/**
 * The client for the services provided by the
 * server.
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const queueSVC = require('./lib/queue-service');
const signer = require('./lib/signer');
const beanstalk = require('./config/beanstalk');
const secrets = require('./config/secrets');
const robotCFG = require('./config/robot');
const RobotWorker = require('./lib/robot-worker');
const iRobotCreate = require('create-oi');

//const respond = (robotName, command) => {
  //var payload = {
    //name: command
  //};

  //return __getPrivateKey().
    //then( (key) => {
      //var token = jwt.sign(payload, key, { algorithm: 'RS512' });

      //return queueSVC.queueJob('talker', robotName, 100, 0, 300, token);
    //});
//};

iRobotCreate.init({ serialport: robotCFG.serialport });

iRobotCreate.on('ready', function() {

  // Start up the beanstalk queuing
  queueSVC.connect('incomingCommands', beanstalk.host, beanstalk.port).
    then( () => {
      fs.readFile(secrets.serverKey, 'utf8', (err, key) => {
        if (err) { 
          console.error("Error reading file: %j", err);
          process.exit(1);
        }
        var worker = new RobotWorker(robotCFG.name, key, iRobotCreate);
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

});

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
iRobotCreate.on('bump', bumpHandler);
iRobotCreate.on('proximity', proximityHandler);

