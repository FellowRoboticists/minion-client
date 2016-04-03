module.exports = (() => {

  const signer = require('./signer');
  const queueSVC = require('robot-queue-service');
  const robotCFG = require('../config/robot');

  const arduinoInitializer = function(rsi) {
    rsi.ready();
  };

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

  const registerHandlers = (robot) => {
    robot.on('temperature', temperatureHandler);
    robot.on('humidity', humidityHandler);
  };

  var mod = {
    initializer: arduinoInitializer,
    sensors: ARDUINO_SENSORS,
    registerHandlers: registerHandlers
  };

  return mod;
}());
