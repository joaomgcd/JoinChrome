
var deviceCommands = [
	{
		"label":"Send current tab to your device",
		"commandId":"tab",
		"func":back.pushUrl,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_URL);
		}
	},
	{
		"label":"Paste clipboard on your device",
		"commandId":"paste",
		"func":back.pushClipboard,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_CLIPBOARD);
		}
	},
	{
		"label":"Write text in an app on your device",
		"commandId":"write",
		"func":back.writeText,
		"showForGroups":joindevices.groups.deviceGroups.androidGroups,
		"condition":function(device){
			return (device.deviceType == DEVICE_TYPE_ANDROID_PHONE || device.deviceType == DEVICE_TYPE_ANDROID_TABLET) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_CLIPBOARD);
		},
		"hasText":true
	},
	{
		"label":"Send an SMS message",
		"commandId":"sms",
		"func":back.sendSmsFromButtonCommand,
		"keepTab":true,
		"condition":function(device){
			return device.deviceType == DEVICE_TYPE_ANDROID_PHONE && UtilsDevices.isNotDeviceShare(device);
		}
	},
	{
		"label":"Send a file to your device",
		"commandId":"file",
		"func":back.pushFile,
		"keepTab":true,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_SEND_FILE);
		}
	},
	{
		"label":"Take a screenshot",
		"commandId":"screenshot",
		"func":back.getScreenshot,
		"condition":function(device){
			return (device.deviceType != DEVICE_TYPE_CHROME_BROWSER && device.apiLevel >=21) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_REQUEST_SCREEN);
		}
	},
	{
		"label":"Toggle screen capture",
		"commandId":"screencapture",
		"func":back.getScreenCapture,
		"keepTab":true,
		"condition":function(device){
			return (device.deviceType != DEVICE_TYPE_CHROME_BROWSER && device.apiLevel >=21) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_REQUEST_SCREEN);
		}
	},
	{
		"label":"Locate your device",
		"commandId":"location",
		"func":back.requestLocation,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_LOCATE);
		}
	},
	{
		"label":"Ring your device",
		"commandId":"find",
		"func":back.findDevice,
		"condition":function(device){
			return (device.deviceType == DEVICE_TYPE_ANDROID_PHONE || device.deviceType == DEVICE_TYPE_ANDROID_TABLET) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_RING);
		}
	},
	{
		"label":"Send a Tasker command",
		"commandId":"tasker",
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"func":back.pushTaskerCommand,
		"hasText":true,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		}
	},
	{
		"label":"Open PC Clipboard as file on device",
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"commandId":"openclipboard",
		"func":back.openClipboard,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_SEND_FILE);
		}
	},
	{
		"label":"Rename device",
		"commandId":"rename",
		"func":back.renameDevice,
		"condition":function(device){
			return UtilsDevices.isNotDeviceShare(device);
		}
	},
	{
		"label":"Delete device",
		"commandId":"delete",
		"func":back.deleteDevice,
		"condition":function(device){
			return UtilsDevices.isNotDeviceShare(device);
		}
	},
	{
		"label":"Note To Self",
		"commandId":"note",
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"func":back.noteToSelf,
		"condition":function(device){
			return UtilsDevices.canReceiveNotifications(device);
		}
	},
	{
		"label":"Make a Phone Call",
		"commandId":"call",
		"func":back.selectContactForCall,
		"keepTab":true,
		"condition":function(device){
			return device.deviceType == DEVICE_TYPE_ANDROID_PHONE && UtilsDevices.isNotDeviceShare(device);
		}
	},
	{
		"label":"Check Device's Push History",
		"commandId":"pushhistory",
		"func":back.showPushHistory
	},
];
var commandSortOrder = {};
var sortDeviceCommands = function(){
	if(!localStorage){
		return;
	}
	var orderJson = localStorage.deviceCommandsOrder;
	if(!orderJson){
		return;
	}
	var sortOrder = JSON.parse(orderJson);
	deviceCommands.sort(function(c1,c2){
		var order1 = sortOrder[c1.commandId];
		var order2 = sortOrder[c2.commandId];
		if(order1 == null){
			order1 = 99999;
		}
		if(order2 == null){
			order2 = 99999;
		}
		return order1 - order2;
	});
}

var storeDeviceCommandOrder = function(){
	localStorage.deviceCommandsOrder = JSON.stringify(commandSortOrder);
}

