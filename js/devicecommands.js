var deviceCommands = [
	{"label":"Send current tab to your device","commandId":"tab","func":back.pushUrl,"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups},
	{"label":"Paste clipboard on your device","commandId":"paste","func":back.pushClipboard,"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups},
	{"label":"Write text in an app on your device","commandId":"write","func":back.writeText,"showForGroups":joindevices.groups.deviceGroups.androidGroups,"condition":function(device){return device.deviceType == DEVICE_TYPE_ANDROID_PHONE || device.deviceType == DEVICE_TYPE_ANDROID_TABLET},"hasText":true},
	{"label":"Send an SMS message","commandId":"sms","func":back.sendSms,"keepTab":true,"condition":function(device){return device.deviceType == DEVICE_TYPE_ANDROID_PHONE}},
	{"label":"Send a file to your device","commandId":"file","func":back.pushFile,"keepTab":true,"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups},
	{"label":"Take a screenshot","commandId":"screenshot","func":back.getScreenshot,"condition":function(device){return device.deviceType != DEVICE_TYPE_CHROME_BROWSER && device.apiLevel >=21}},
	{"label":"Locate your device","commandId":"location","func":back.requestLocation},
	{"label":"Ring your device","commandId":"find","func":back.findDevice,"condition":function(device){return device.deviceType == DEVICE_TYPE_ANDROID_PHONE || device.deviceType == DEVICE_TYPE_ANDROID_TABLET}},
	{"label":"Send a Tasker command","commandId":"tasker","showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,"func":back.pushTaskerCommand,"hasText":true},
	{"label":"Open PC Clipboard as file on device","showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,"commandId":"openclipboard","func":back.openClipboard},
	{"label":"Rename device","commandId":"rename","func":back.renameDevice},
	{"label":"Delete device","commandId":"delete","func":back.deleteDevice},
	{"label":"Note To Self","commandId":"note","showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,"func":back.noteToSelf},
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

