module.exports = (() => {

  const signer = require('./signer');
  const DefaultSpeed = 100;
  const SpeedIncrement = 10;
  const DRIVE = 0x89;

  const uB = (word) => word >> 8;

  const lB = (word) => word & 0x000000ff;

  const RobotWorker = function(robotName, serverKey, robot) {

    this.robotName = robotName;
    this.serverKey = serverKey;
    this.robot = robot;
    this.speed = DefaultSpeed;
    this.lastCommand = null;
    
    this.__drive = function(speed, direction) {
      this.robot.sendCommand(DRIVE, [uB(speed), lB(speed), uB(direction), lB(direction)]);
    };

    this.__robotCommand = function(command) {
      var doLastCommand = false;
      switch (command) {
        case 'forward':
          this.__drive(this.speed, 0);
          this.lastCommand = 'forward';
          break;

        case 'backward':
          this.__drive(-this.speed, 0);
          this.lastCommand = 'backward';
          break;

        case 'left':
          this.__drive(this.speed, 1);
          this.lastCommand = 'left';
          break;

        case 'right':
          this.__drive(-this.speed, 1);
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
          this.__drive(0, 0);
          this.speed = DefaultSpeed;
          this.lastCommand = null;
          break;
      }

      return doLastCommand;
    };

    this.process = function(job) {
      return signer.verify(job.payload, this.serverKey).
        then( (payload) => {
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
