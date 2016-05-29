const test = require('blue-tape')
const riface = require('../lib/arduino-initializer')

/**
 * Defines a stub for the RSI.ready() function.
 */
const RSI = function () {
  let readyCount = 0
  Object.defineProperties(this, {
    'readyCount': {
      'get': function () { return readyCount },
      'set': function (val) { readyCount = val }
    }
  })
}

RSI.prototype.ready = function () {
  this.readyCount += 1
}

const Robot = function () {
  let tempHandler = null
  let humidityHandler = null
  Object.defineProperties(this, {
    'tempHandler': {
      'get': function () { return tempHandler },
      'set': function (val) { tempHandler = val }
    },
    'humidityHandler': {
      'get': function () { return humidityHandler },
      'set': function (val) { humidityHandler = val }
    }
  })
}

Robot.prototype.on = function (name, handler) {
  if (name === 'temperature') {
    this.tempHandler = handler
  }
  if (name === 'humidity') {
    this.humidityHandler = handler
  }
}

test('there must be an initializer function', (assert) => {
  assert.ok(riface.initializer,
           'The initializer function must be defined')
  assert.equal(typeof riface.initializer, 'function',
              'the initializer must be a function')
  assert.end()
})

test('the initializer should invoke the "ready" function', (assert) => {
  let rsi = new RSI()
  riface.initializer(rsi)
  assert.equal(rsi.readyCount, 1,
              'ready should have been called exactly once')
  assert.end()
})

// ########################################################

test('there must be a sensors object', (assert) => {
  assert.ok(riface.sensors,
            'the sensors object must be defined')
  assert.equal(typeof riface.sensors, 'object',
               'the sensors object must be an object')
  assert.end()
})

test('there should be two sensors defined', (assert) => {
  assert.equal(riface.sensors.length, 2,
               'there should be two sensors defined')

  let temp = riface.sensors[0]
  assert.equal(temp.name, 'temperature',
               'first sensor should be "temperature"')
  assert.equal(temp.startByte, 0x03,
               'first sensor start byte should be "0x03"')
  assert.equal(temp.numBytes, 2,
               'first sensor should have two bytes')
  assert.notOk(temp.meetsThreshold,
               'should be no meets threshold function')

  let humidity = riface.sensors[1]
  assert.equal(humidity.name, 'humidity',
               'first sensor should be "humidity"')
  assert.equal(humidity.startByte, 0x02,
               'first sensor start byte should be "0x02"')
  assert.equal(humidity.numBytes, 2,
               'first sensor should have two bytes')
  assert.ok(humidity.meetsThreshold,
            'Should be a meetsThresold function')
  assert.equal(typeof humidity.meetsThreshold, 'function',
               'meetsThreshold should be a function')

  assert.end()
})

// ########################################################

test('there must be a registerHandlers method', (assert) => {
  assert.ok(riface.registerHandlers,
           'The registerHandlers function must be defined')
  assert.equal(typeof riface.registerHandlers, 'function',
              'the registerHandlers must be a function')
  assert.end()
})

test('should register the actual sensor handlers', (assert) => {
  let robot = new Robot()
  riface.registerHandlers(robot)

  assert.ok(robot.tempHandler,
            'the temperature handler should have been set')
  assert.equal(typeof robot.tempHandler, 'function',
               'the temperature handler should be a function')

  assert.ok(robot.humidityHandler,
            'the humidity handler should have been set')
  assert.equal(typeof robot.humidityHandler, 'function',
               'the humidity handler should be a function')

  assert.end()
})
