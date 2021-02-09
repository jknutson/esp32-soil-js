# esp32-soil-js

This is a JS application which runs on an ESP32 device with Mongoose OS.

It reads an adafruit capacitive soil moisture sensor. I crudely converted the bitwise logic from a C library so it might not be correct at all.

## Super Basic Setup

```sh
mos wifi SSID PASS
mos config-set mqtt.server=MQTT_SERVER mqtt.enable=true
```
