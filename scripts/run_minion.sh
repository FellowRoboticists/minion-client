#!/bin/bash

# This is a Bash wrapper to invoke the minion client. Typically, you'll
# use this to test the minion client code.

# First, source the environment for the application
. /var/www/minion/shared/config/environment-variables

export RABBITMQ_CA_CERT
export CLIENT_CERT
export CLIENT_KEY
export RABBITMQ_URL
export SERIAL_PORT
export BAUD_RATE
export ROBOT_PRIVATE_KEY
export SERVER_PUBLIC_KEY

export LOG_LEVEL=debug

# Now, go ahead and run the client
# /usr/local/node/bin/node ./index.js --robot --test
/usr/local/node/bin/node ./index.js --arduino 
