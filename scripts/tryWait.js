#!/usr/bin/env node

const waiter = (ms) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

// Chain up some stuff and see if it works.
waiter(4000)
  .then(() => {
    console.log('First')
    return 4000
  })
  .then(waiter)
  .then(() => {
    console.log('Second')
  })
