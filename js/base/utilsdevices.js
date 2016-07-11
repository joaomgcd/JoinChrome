var UtilsDevices = {
	"isDeviceGroup":function(device){
		return device.deviceId.indexOf("group")>=0;
	},
	"isNotDeviceGroup":function(device){
		return !UtilsDevices.isDeviceGroup(device);
	}
};