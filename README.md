minion-client
=============

A NodeJs client to control a telepresence robot. Initially, this
client will be used against an iRobot Create. Nothing fancy, just
want to move it around. 

Usage
-----

This is a CLI (command line client) application. As such, it supports
a variety of command-line options (summarized below):

    -h, --help              output usage information
    -V, --version           output the version number
    -a,--arduino            Arduino robot
    -c,--create             iRobot Create Robot
    -r,--robot              The real robot
    -b,--baudrate [rate]    Baud rate [9600]
    -s,--serialport [port]  Serial port [/dev/ttyUSB0]

Three of the command line options are used to identify the type of 'robot'
we're going to connect to. Specifically, you would specify -a (--arduino) if 
you were going to test the client against an Arduino test sketch. This has been
the primary means of testing the client; I have an Arduino test sketch that
flashes LEDs based on the commands it is given. The sketch also outputs sensor
data in the form of temperature and humidity to test data receipt from the
Arduino.

If you have an iRobot Create that you would like to control, specify the -c (--create)
option. Specifying this option ensures that the iRobot Create is initialized properly.
Sensor data in the form of 'bump' and 'proximity' are supported.

The -r (--robot) option is used with my Arduino Leonardo-based robot. This little guy
also provides proximity sensor output.

The remaining options are used to specify information about the serial port to connect
to.
