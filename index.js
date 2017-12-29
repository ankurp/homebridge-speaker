const exec = require('child_process').exec;
let Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-speaker', 'Homebridge-Speaker', Speaker);
};

class Speaker {
  constructor(log, config) {
    this.log = log;

    this.name = config.name;

    this.volume = 50;
    this.isMuted = false;
    this.getVolume(volume => this.service.setCharacteristic(Characteristic.Volume, volume));
  }

  getVolume(callback) {
    exec(`amixer get Master | awk '$0~/%/{print $4}' | tr -d '[]%'`, (error, stdout, stderr) => {
      this.volume = stdout.split('\n')[0];
      callback(this.volume);
    });
  }

  identify(callback) {
    this.log('Identify');
    callback();
  }

  getServices() {
    const speakerService = new Service.Speaker(this.name);

    speakerService
      .getCharacteristic(Characteristic.Mute)
      .on('get', this.getMuteState.bind(this))
      .on('set', this.setMuteState.bind(this));

    speakerService
      .addCharacteristic(new Characteristic.Volume())
      .on('get', this.getVolume.bind(this))
      .on('set', this.setVolume.bind(this));

    return [speakerService];
  }

  getMuteState(callback) {
    callback(null, this.isMuted === false);
  }

  setMuteState(isMuted, callback) {
    this.isMuted = isMuted;
    if (this.isMuted) {
      exec('amixer set  Master 0', (error, stdout, stderr) => {
        callback(null);
      });
    } else {
      exec(`amixer set Master ${this.volume}%`, (error, stdout, stderr) => {
        callback(null);
      });
    }
  }

  getVolume(callback) {
    this.getVolume(volume => {
      callback(null, volume);
    });
  }

  setVolume(volume, callback) {
    exec(`amixer set  Master ${volume}%`, (error, stdout, stderr) => {
      this.volume = volume;
      callback(undefined);
    });
  }
};