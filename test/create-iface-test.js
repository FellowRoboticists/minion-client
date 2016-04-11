const test = require('blue-tape');
const riface = require('../lib/create-initializer');

/**
 * Defines a stub for the RSI.ready() function.
 */
const RSI = function() {
  var readyCount = 0;
  var commands = [];
  Object.defineProperties(this, {
    "readyCount": {
      "get": function() { return readyCount },
      "set": function(val) { readyCount = val }
    },
    "commands": {
      "get": function() { return commands }
    }
  });
};

RSI.prototype.ready = function() {
  this.readyCount += 1;
};

RSI.prototype.sendCommand = function(cmd, payload) {
  this.commands.push({ command: cmd, payload: payload });
};

RSI.prototype.wait = function(ms) {
  return new Promise( (resolve, reject) => setTimeout(resolve, ms) );
};

const Robot = function() {
  var bumpHandler = null;
  var proximityHandler = null;
  Object.defineProperties(this, {
    "bumpHandler": {
      "get": function() { return bumpHandler },
      "set": function(val) { bumpHandler = val }
    },
    "proximityHandler": {
      "get": function() { return proximityHandler },
      "set": function(val) { proximityHandler = val }
    }
  });
};

Robot.prototype.on = function(name, handler) {
  if (name === 'bump') {
    this.bumpHandler = handler
  }
  if (name === 'proximity') {
    this.proximityHandler = handler;
  }
};

test('there must be an initializer function', (assert) => {
  assert.ok(riface.initializer,
           'The initializer function must be defined');
  assert.equal(typeof riface.initializer, 'function',
              'the initializer must be a function');
  assert.end();
});

test('the initializer should invoke the "ready" function', (assert) => {
  var rsi = new RSI();
  riface.initializer(rsi);
  //assert.equal(rsi.commands.length, 6,
               //'six commands should have been issued to the robot');
  //assert.equal(rsi.readyCount, 1,
              //'ready should have been called exactly once');
  assert.end();
});

// ########################################################

test('there must be a sensors object', (assert) => {
  assert.ok(riface.sensors,
            'the sensors object must be defined');
  assert.equal(typeof riface.sensors, 'object',
               'the sensors object must be an object');
  assert.end();
});

test('there should be two sensors defined', (assert) => {
  assert.equal(riface.sensors.length, 2,
               'there should be two sensors defined');


  var temp = riface.sensors[0];
  assert.equal(temp.name, 'bump',
               'first sensor should be "bump"');
  assert.equal(temp.startByte, 0x07,
               'first sensor start byte should be "0x07"');
  assert.equal(temp.numBytes, 1,
               'first sensor should have one bytes');
  assert.notOk(temp.meetsThreshold,
               'should be no meets threshold function');

  var humidity = riface.sensors[1];
  assert.equal(humidity.name, 'proximity',
               'first sensor should be "proximity"');
  assert.equal(humidity.startByte, 0x21,
               'first sensor start byte should be "0x21"');
  assert.equal(humidity.numBytes, 2,
               'first sensor should have two bytes');
  assert.notOk(humidity.meetsThreshold,
            'Should be no meetsThresold function');

  assert.end();
});

// ########################################################

test('there must be a registerHandlers method', (assert) => {
  assert.ok(riface.registerHandlers,
           'The registerHandlers function must be defined');
  assert.equal(typeof riface.registerHandlers, 'function',
              'the registerHandlers must be a function');
  assert.end();
});

test('should register the actual sensor handlers', (assert) => {
  var robot = new Robot();
  riface.registerHandlers(robot);

  assert.ok(robot.bumpHandler,
            'the bump handler should have been set');
  assert.equal(typeof robot.bumpHandler, 'function',
               'the bump handler should be a function');

  assert.ok(robot.proximityHandler,
            'the proximity handler should have been set');
  assert.equal(typeof robot.proximityHandler, 'function',
               'the proximity handler should be a function');

  assert.end();
});
