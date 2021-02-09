MOS=mos

.PHONY: all build flash configure reboot

build:
	$(MOS) build

flash:
	$(MOS) flash

wifi:
	$(MOS) wifi "${WIFI_SSID}" "${WIFI_PASS}"

wifi-nsm2:
	$(MOS) wifi "nsm2" "${WIFI_PASS}"

configure-mdash:
	 $(MOS) config-set dash.enable=true dash.token="${MDASH_TOKEN}" mdash.device_id="${MDASH_DEVICE_ID}"

configure-mqtt:
	$(MOS) config-set mqtt.server="${MQTT_HOST}" mqtt.enable=true

reboot:
	$(MOS) call Sys.Reboot

all: build flash wifi configure-mdash reboot
