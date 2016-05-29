const test = require('blue-tape')
const riface = require('../lib/robot-initializer')

/**
 * Defines a stub for the RSI.ready() function.
 */
const RSI = function () {
  var readyCount = 0
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
  var proximityHandler = null
  Object.defineProperties(this, {
    'proximityHandler': {
      'get': function () { return proximityHandler },
      'set': function (val) { proximityHandler = val }
    }
  })
}

Robot.prototype.on = function (name, handler) {
  if (name === 'proximity') {
    this.proximityHandler = handler
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
  var rsi = new RSI()
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
  assert.equal(riface.sensors.length, 1,
               'there should be one sensors defined')

  var proximity = riface.sensors[0]
  assert.equal(proximity.name, 'proximity',
               'first sensor should be "proximity"')
  assert.equal(proximity.startByte, 0x01,
               'first sensor start byte should be "0x01"')
  assert.equal(proximity.numBytes, 2,
               'first sensor should have two bytes')
  assert.ok(proximity.meetsThreshold,
            'Should be a meetsThresold function')
  assert.equal(typeof proximity.meetsThreshold, 'function',
               'threshold must be a function')

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
  var robot = new Robot()
  riface.registerHandlers(robot)

  assert.ok(robot.proximityHandler,
            'the proximity handler should have been set')
  assert.equal(typeof robot.proximityHandler, 'function',
               'the proximity handler should be a function')

  assert.end()
})
