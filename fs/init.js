load('api_adc.js');
load('api_config.js');
load('api_i2c.js');
load('api_mqtt.js');
load('api_timer.js');

// general settings
let deviceId = Cfg.get('device.id');
print('deviceId:', deviceId)
let deviceType = 'esp32';
let pollInterval = Cfg.get('interval') * 1000;

// i2c settings
let i2cAddr = 0x36;
let tempOffset = "\x00\x04";
let touchOffset = "\x0F\x10"; // touch base, touch channel offset

// voltage (analog in) settings
let voltagePin = Cfg.get('pins.voltage');
let r1 = Cfg.get('pins.voltage_r1'); // r1 of voltage divider (ohm)
let r2 = Cfg.get('pins.voltage_r2'); // r2 of voltage divider (ohm)
let adcReadVoltage = ffi('int mgos_adc_read_voltage(int)');
if (voltagePin !== "" && r1 > 0 && r2 > 0) {
  print('voltage reading enabled');
  ADC.enable(voltagePin);
}

// mqtt topics
let tempTopic = deviceType + '/' + deviceId + '/temperature';
let moistureTopic = deviceType + '/' + deviceId + '/moisture';
Cfg.set({mqtt: {will_topic: 'esp32/' + deviceId + '/status', will_message: 'offline'}});

let multiplyVoltage = function(rawVoltage, r1, r2) {
  return (rawVoltage * (r1 + r2) / r2);
};

let getTemp = function(bus) {
  if (I2C.write(bus, i2cAddr, tempOffset, 2, true)) {
    let data = I2C.read(bus, i2cAddr, 4, true);
    if(data) {
      // print(data); \x00\x18+4 -> [0,24,43,52] -> 75.503746 (temp_f)
      // print(JSON.stringify([data.at(0), data.at(1), data.at(2), data.at(3)]));
      let value = 0;
      for (let i = 0; i < data.length; i++) {
        value = (value << 8) | data.at(i);
      }
      return (0.00001525878 * value);
    }
  } else {
    return false
  }
};

let moistureRead = function(bus) {
  if (I2C.write(bus, i2cAddr, touchOffset, 2, true)) {
    let data = I2C.read(bus, i2cAddr, 2, true);
    if(data) {
      let value = 0;
      for (let i = 0; i < data.length; i++) {
        value = (value << 8) | data.at(i);
      }
      return value;
    }
  } else {
    return false;
  }
};

let i2c = I2C.get();
MQTT.pub('esp32/' + deviceId + '/status', 'online');
Timer.set(pollInterval, true, function() {
  let now = Timer.now();

  // temperature (seesaw)
  let tempC = getTemp(i2c);
  if (tempC) {
    let tempF = (tempC * (9/5)) + 32;
    MQTT.pub(tempTopic, JSON.stringify(tempF));
    print("tempF:", JSON.stringify(tempF));
  }

  // moisture (seesaw)
  let moisture = moistureRead(i2c);
  if (moisture) {
    MQTT.pub(moistureTopic, JSON.stringify(moisture));
    print("moisture:", JSON.stringify(moisture))
  }

  // wind direction (voltage/adc)
  if (voltagePin !== "" && r1 > 0 && r2 > 0) {
    voltage = adcReadVoltage(voltagePin);
    print('raw voltage: ', voltage, 'mV');
    let realVoltage = multiplyVoltage(voltage, r1, r2);
    print('real voltage: ', realVoltage, 'mV');
    let topic = 'esp32/' + deviceId + '/voltage/pin' + JSON.stringify(voltagePin);
    print('topic: ', topic);
    let res = MQTT.pub(topic, JSON.stringify(realVoltage));
    print('MQTT Published (polled voltage):', res ? 'yes' : 'no');
  }
}, null);
