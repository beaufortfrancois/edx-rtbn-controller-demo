/*
 * ble.js
 * Promises base Javascript to handle BLE Connect, Service, and Characteristic
 * discovery for the Texas Instruments Edu BoosterPack MKII fitness device.
 * BLE Service:
 *   Shape The World Service - 0xFFF0
 * BLE Characteristics:
 *   PlotState   - 0xFFF1 - WR
 *   Time        - 0xFFF2 - RD
 *   Sound       - 0xFFF3 - RD
 *   Temperature - 0xFFF4 - RD
 *   Light       - 0xFFF5 - RD
 *   EdxGrader   - 0xFFF6 - WR
 *   Steps       - 0xFFF7 - RD+NOTIFY
 */

(function() {

  const SHAPE_THE_WORLD_SERVICE_UUID        = 0xfff0;
  const SHAPE_THE_WORLD_PLOTSTATE_UUID      = 0xfff1;
  const SHAPE_THE_WORLD_TIME_UUID           = 0xfff2;
  const SHAPE_THE_WORLD_SOUND_UUID          = 0xfff3;
  const SHAPE_THE_WORLD_TEMP_UUID           = 0xfff4;
  const SHAPE_THE_WORLD_LIGHT_UUID          = 0xfff5;
  const SHAPE_THE_WORLD_EDXGRADER_UUID      = 0xfff6;
  const SHAPE_THE_WORLD_STEPS_UUID          = 0xfff7;

  // BLE vars //
  var bleDevice;
  var gattServer;
  var fitnessService;
  var plotStateCharacteristic;
  var timeCharacteristic;
  var soundCharacteristic;
  var tempCharacteristic;
  var lightCharacteristic;
  var edxGraderCharacteristic;
  var stepsCharacteristic;

  // device vars //
  var displayMode = 0;    // plot states index value
  var time;
  var temp;
  var light;
  var sound;
  var serverReady = false;    // set true after BLE Initialization
  var stepsNotify = false;    // steps notification not yet enabled


  function resetVariables() {
    gattServer = null;
    fitnessService = null;
    plotStateCharacteristic = null;
    timeCharacteristic = null;
    soundCharacteristic = null;
    tempCharacteristic = null;
    lightCharacteristic = null;
    edxGraderCharacteristic = null;
    stepsNotify = false;
    stepsCharacteristic = null;
    serverReady = false;
  }

  function connectToggle() {
    if (gattServer != null && gattServer.connected) {
      //if (gattServer.disconnect) {
      if (gattServer.connected) {
        console.log('Disconnecting...');
        gattServer.disconnect();
      }
      resetVariables();
    } else {
      console.log('Request connection to BLE Device <UT - Shape The World> ....');
      navigator.bluetooth.requestDevice({
        filters: [{namePrefix: "Shape"}],
        optionalServices: [0xfff0]
      })
      .then(device => {
        bleDevice = device;
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        return bleDevice.gatt.connect();
      })
      .then(server => {
        gattServer = server;
        return gattServer.getPrimaryService(SHAPE_THE_WORLD_SERVICE_UUID);
      })
      .then(service => {
        console.log('> Found <UT - Shape The World> Service: 0x' + SHAPE_THE_WORLD_SERVICE_UUID.toString(16));
        fitnessService = service;
        console.log('> Looking for => PlotState characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_PLOTSTATE_UUID);
      })
      .then(characteristic => {
        console.log('> Found PlotState RD/WR characteristic: 0x' + SHAPE_THE_WORLD_PLOTSTATE_UUID.toString(16));
        plotStateCharacteristic = characteristic;
        plotstate_btn1.swEnable();
        plotstate_btn2.swEnable();
      })
      .then(_ => {
        console.log('> Looking for => Time characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_TIME_UUID);
      })
      .then(characteristic => {
        console.log('> Found Time RD characteristic: 0x' + SHAPE_THE_WORLD_TIME_UUID.toString(16));
        timeCharacteristic = characteristic;
        time_btn.swEnable();
      })
      .then(_ => {
        console.log('> Looking for => Sound characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_SOUND_UUID);
      })
      .then(characteristic => {
        console.log('> Found Sound RD characteristic: 0x' + SHAPE_THE_WORLD_SOUND_UUID.toString(16));
        soundCharacteristic = characteristic;
        sound_btn.swEnable();
      })
      .then(_ => {
        console.log('> Looking for => Temperature characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_TEMP_UUID);
      })
      .then(characteristic => {
        console.log('> Found Temperature RD characteristic: 0x' + SHAPE_THE_WORLD_TEMP_UUID.toString(16));
        tempCharacteristic = characteristic;
        temp_btn.swEnable();
      })
      .then(_ => {
        console.log('> Looking for => Light characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_LIGHT_UUID);
      })
      .then(characteristic => {
        console.log('> Found Light RD characteristic: 0x' + SHAPE_THE_WORLD_LIGHT_UUID.toString(16));
        lightCharacteristic = characteristic;
        light_btn.swEnable();
      })
      .then(_ => {
        console.log('> Looking for => edX Grader characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_EDXGRADER_UUID);
      })
      .then(characteristic => {
        console.log('> Found edX Grader WR characteristic: 0x' + SHAPE_THE_WORLD_EDXGRADER_UUID.toString(16));
        edxGraderCharacteristic = characteristic;
        submit_btn.disabled = false;
      })
      .then(_ => {
        console.log('> Looking for => Steps characteristic');
        return fitnessService.getCharacteristic(SHAPE_THE_WORLD_STEPS_UUID);
      })
      .then(characteristic => {
        console.log('> Found Steps Notify RD characteristic: 0x' + SHAPE_THE_WORLD_STEPS_UUID.toString(16));
        stepsCharacteristic = characteristic;
        steps_btn.swEnable();
      })
      .then(_ => {
        console.log('> Done <UT - Shape The World> Service Discovery');
        serverReady = true;
      })
      .catch(error => {
        handleError(error);
        powerDown();
      });
    }
  }

  function onDisconnected(event) {
    let device = event.target;
    console.log('> BLE Device disconnected');
    console.log('Device ' + device.name + ' is disconnected');
    powerDown();
  }

  function plotStateUp(callback) {
    if(plotStateCharacteristic) {
      displayMode++;
      displayMode %= 3;
      let mode = new Uint8Array([displayMode]);
      console.log("(Up) Plot mode value to write: " + mode);
      return plotStateCharacteristic.writeValue(mode)
      .then(_ => {
        callback(true,mode);
      })
      .catch(error => {
        console.log("PlotState Error: " + error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function plotStateDown(callback) {
    if(plotStateCharacteristic) {
      displayMode--;
      displayMode = (displayMode < 0) ? 2 : displayMode;
      let mode = new Uint8Array([displayMode]);
      console.log("(Down) Plot mode value to write: " + mode);
      return plotStateCharacteristic.writeValue(mode)
      .then(_ => {
        callback(true,mode);
      })
      .catch(error => {
        console.log("PlotState Error: " + error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function activateGrader(code) {
    let codeArray = new Uint8Array([(code >> 8) & 0xff, code & 0xff]);
    return edxGraderCharacteristic.writeValue(codeArray)
    .then(_ => {
      console.log("Done activating edX Grader - CHECK LAB GRADE -");
    })
    .catch(error => {
      console.log("Activate Grader Error: " + error);
    });
  }

  function readTime(callback) {
    if(timeCharacteristic) {
      return timeCharacteristic.readValue()
      .then(value => {
        time = value.getUint32(0);
        console.log('Time readings of fitness device: ' + time);
      })
      .then(_ => {
        callback(time);
      })
      .catch(error => {
        console.log(error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function readLight(callback) {
    if(lightCharacteristic) {
      return lightCharacteristic.readValue()
      .then(value => {
        light = value.getUint32(0);
        console.log('Light readings of fitness device: ' + light);
      })
      .then(_ => {
        callback(light);
      })
      .catch(error => {
        console.log(error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function readTemp(callback) {
    if(tempCharacteristic) {
      return tempCharacteristic.readValue()
      .then(value => {
        temp = value.getUint8(0);
        console.log('Temperature readings of fitness device: ' + temp);
      })
      .then(_ => {
        callback(temp);
      })
      .catch(error => {
        console.log(error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function readSound(callback) {
    if(soundCharacteristic) {
      return soundCharacteristic.readValue()
      .then(value => {
        sound = value.getUint32(0);
        console.log('Sound readings of fitness device: ' + sound);
      })
      .then(_ => {
        callback(sound);
      })
      .catch(error => {
        console.log(error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function enableStepsNotification(callback) {
    if(stepsCharacteristic && !stepsNotify) {
      return stepsCharacteristic.startNotifications()
      .then(_ => {
        stepsCharacteristic.addEventListener('characteristicvaluechanged', callback);
      })
      .then(_ => {
        console.log('Steps notification started!');
        stepsNotify = true;
      })
      .catch(error => {
        console.log('Notification Error: ' + error);
        stepsNotify = false;
      });
    } else {
      return Promise.resolve();
    }
  }

  function disableStepsNotification() {
    if(stepsCharacteristic) {
      return stepsCharacteristic.stopNotifications()    // NOT SUPPORTED BY ALL PLATFORMS
      .then(_ => {
        console.log('Steps notification stopped!');
        stepsNotify = false;
      })
      .catch(error => {
        console.log('Notification Error: ' + error);
      });
    } else {
      return Promise.resolve();
    }
  }

  function isStepsNotify() {
    if(stepsCharacteristic && stepsNotify) {
      return true;
    }
    return false;
  }

  function isServerReady() {
    return serverReady;
  }

  function handleError(error) {
    console.log("Bluetooth Service Discovery related error: " + error);
  }

  window.ble = {
    resetVariables: resetVariables,
    connectToggle: connectToggle,
    plotStateUp: plotStateUp,
    plotStateDown: plotStateDown,
    activateGrader: activateGrader,
    readTemp: readTemp,
    readSound: readSound,
    readLight: readLight,
    readTime: readTime,
    isStepsNotify: isStepsNotify,
    enableStepsNotification: enableStepsNotification,
    disableStepsNotification: disableStepsNotification,
    isServerReady: isServerReady
  };

})();
