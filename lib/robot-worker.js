module.exports = (() => {

  const signer = require('./signer');
  const DefaultSpeed = 100;
  const SpeedIncrement = 10;

  const RobotWorker = function(robotName, serverKey, iRobotCreate) {

    this.robotName = robotName;
    this.serverKey = serverKey;
    this.iRobotCreate = iRobotCreate;
    this.speed = DefaultSpeed;
    this.lastCommand = null;

    this.__robotCommand = function(command) {
      var doLastCommand = false;
      switch (command) {
        case 'forward':
          this.iRobotCreate.drive(this.speed, 0);
          this.lastCommand = 'forward';
          break;

        case 'backward':
          this.iRobotCreate.drive(-this.speed, 0);
          this.lastCommand = 'backward';
          break;

        case 'left':
          this.iRobotCreate.rotate(this.speed);
          this.lastCommand = 'left';
          break;

        case 'right':
          this.iRobotCreate.rotate(-this.speed);
          this.lastCommand = 'right';
          break;

        case 'slowdown':
          this.speed -= SpeedIncrement;
          doLastCommand = true;
          break;

        case 'speedup':
          this.speed += SpeedIncrement;
          doLastCommand = true;
          break;

        case 'stop':
          this.iRobotCreate.drive(0, 0);
          this.speed = DefaultSpeed;
          this.lastCommand = null;
          break;
      }

      return doLastCommand;
    };

    this.process = function(job) {
      return signer.verify(job.payload, this.serverKey).
        then( (payload) => {
          console.log("The payload: %j", payload);
          // TODO: Here's where we put the code that
          // deals with the robot commands.
          if (this.__robotCommand(payload.command)) {
            if (this.lastCommand) {
              this.__robotCommand(this.lastCommand);
            }
          }
        });
    }

  };

  return RobotWorker;

}());
