'use strict'

module.exports = (function () {
  var mod = {

    /**
     * This is the name of your robot as it is known to the world.
     * This name determines the names of the beanstalkd tubes that
     * the client will communicate through.
     */
    name: 'sarah',

    /**
     * Here's how to find out what your serial port value
     * should be:
     *
     * After plugging in your Create USB cable you'll need to find
     * out what serial port your operating system has assigned your Create.
     *
     * On linux: make sure your user belongs to the 'dialout' group.
     *
     * $ dmesg | grep tty
     *
     * On a mac:
     *
     * $ ls /dev/tty.*
     *
     * On a windows box, open device manager and look under "Ports":
     *
     * C:\> mmc devmgmt.msc
     *
     */
    // serialport: '/dev/ttyAMA0',
    // This value works from the RaspberryPi to the iRobot Create
    serialport: '/dev/ttyUSB0',

    /**
     * The default baudrate for the iRobot Create is 57600
     */
    baudrate: 57600

  }

  return mod
}())
