var UtilsDevices = {
	"isDeviceGroup":function(device){
		return device.deviceId.indexOf("group")>=0;
	},
	"isNotDeviceGroup":function(device){
		return !UtilsDevices.isDeviceGroup(device);
	},
	"isDeviceShare":function(device){
		return device.deviceId.indexOf("share")>=0;
	},
	"isNotDeviceShare":function(device){
		return !UtilsDevices.isDeviceShare(device);
	},
	"hasPermissions":function(device,permissions){
		//return true;
		if(UtilsDevices.isNotDeviceShare(device)){
			return true;
		}
		console.log("checking permissions for " + device.deviceName);
		console.log("devicePermissions: " + device.permissions);
		console.log("requested: " + permissions);
		var checked = (device.permissions & permissions) == permissions;
		console.log("has permissions: " + checked);
		return checked;
	},
	"canReceiveNotifications":function(device){
		var canCreateNotifications = UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_CREATE_NOTIFICATIONS);
		var canRunTaskerCommands = UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		if(device.hasTasker){
			return canCreateNotifications && canRunTaskerCommands;
		}else{
			return canCreateNotifications;
		}
	},
	"canSendSMS":function(device){
		return device.deviceType == DEVICE_TYPE_ANDROID_PHONE && UtilsDevices.isNotDeviceShare(device);
	}
};
UtilsDevices.PERMISSION_NONE = 0b0; //0
UtilsDevices.PERMISSION_URL = 0b1; //1
UtilsDevices.PERMISSION_CLIPBOARD = 0b10; //2
UtilsDevices.PERMISSION_TASKER = 0b100; //4
UtilsDevices.PERMISSION_RING = 0b1000; //8
UtilsDevices.PERMISSION_LOCATE = 0b10000; //16
UtilsDevices.PERMISSION_SEND_FILE = 0b100000; //32
UtilsDevices.PERMISSION_REQUEST_SCREEN = 0b1000000; //64
UtilsDevices.PERMISSION_CREATE_NOTIFICATIONS = 0b10000000; //128
UtilsDevices.PERMISSION_ALL = 0b1111111111111111111111111111111;