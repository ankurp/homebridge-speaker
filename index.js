const exec = require('child_process').exec;
let Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-speaker', 'Speaker', Speaker);
};

class Speaker {
  constructor(log, config) {
    this.log = log;

    this.name = config.name;

    this.volume = 50;
    this.isMuted = false;
    this.isPoweredOn = true;
  }

  getSystemVolume(callback) {
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
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Encore Dev Labs')
      .setCharacteristic(Characteristic.Model, 'Voicekit')
      .setCharacteristic(Characteristic.SerialNumber, 'Raspberry Pi 3');

    this.service = new Service.Speaker(this.name);

    this.service
      .addCharacteristic(Characteristic.On)
      .on('get', callback => callback(null, this.isPoweredOn))
      .on('set', (value, callback) => {
        this.isPoweredOn = value;
        callback(null);
      });

    this.service
      .getCharacteristic(Characteristic.Mute)
      .on('get', callback => callback(null, this.isMuted === false))
      .on('set', (value, callback) => {
        this.isMuted = value;
        if (this.isMuted) {
          exec('amixer set  Master 0', (error, stdout, stderr) => {
            callback(null);
          });
        } else {
          exec(`amixer set Master ${this.volume}%`, (error, stdout, stderr) => {
            callback(null);
          });
        }
      });

    this.service
      .addCharacteristic(Characteristic.Volume)
      .on('get', callback => {
        this.getSystemVolume(volume => {
          callback(null, volume);
        });    
      })
      .on('set', () => {
        exec(`amixer set  Master ${volume}%`, (error, stdout, stderr) => {
          this.volume = volume;
          callback(undefined);
        });    
      });

    this.getSystemVolume(volume => this.service.setCharacteristic(Characteristic.Volume, volume));

    return [informationService, speakerService];
  }
};