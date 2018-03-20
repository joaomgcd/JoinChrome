
var deviceCommands = [
	{
		"label":"Send current tab to your device",
		"commandId":"tab",
		"func":back.pushUrl,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_URL) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
		}
	},
	{
		"label":"Paste clipboard on your device",
		"commandId":"paste",
		"func":back.pushClipboard,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_CLIPBOARD) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
		}
	},
	{
		"label":"Write text in an app on your device",
		"commandId":"write",
		"func":back.writeText,
		"showForGroups":joindevices.groups.deviceGroups.androidGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_CLIPBOARD) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
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
		"func": (deviceId, notify, tab) => {
			var dropzoneElement = document.getElementById("dropzonedevices");
			var showedFileUploadTip = "showedFileUploadTip";
			return Promise.resolve()
			.then(()=>{				
				if(!localStorage[showedFileUploadTip]){
					localStorage[showedFileUploadTip] = true;
					makeDropZoneReady(dropzoneElement);
					return Dialog.showOkDialog({
						"title": "Drag And Drop",
						"subtitle": "You can also drop files in the Join window at any time to send them to the selected device."
					})()
					.then(()=>dropzoneElement.classList.add("hidden"));
				}
			})
			.then(()=>{
				var promise = back.pushFile(deviceId,notify,tab);//isPopup ? back.pushFile(deviceId,notify,tab) : Promise.reject("can't select file if not in popup");
				return promise
				.catch(error=>{
					makeDropZoneReady(dropzoneElement)
					.then(files=>{
						if(files){
							back.pushFile(deviceId,null,null,files)
						}
					});
				});
			})
		},
		"keepTab":true,
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_SEND_FILE) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
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
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_LOCATE) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
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
		"showForGroups":joindevices.groups.deviceGroups.androidGroups,
		"func":back.pushTaskerCommand,
		"hasText":true,
		"condition":function(device){
			return (device.deviceType == DEVICE_TYPE_ANDROID_PHONE || device.deviceType == DEVICE_TYPE_ANDROID_TABLET) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		}
	},
	{
		"label":"Send an EventGhost command",
		"commandId":"eventghost",
		"transformIcon": "rotate(90deg)",
		"showForGroups":joindevices.groups.deviceGroups.pcGroups,
		"func":back.pushTaskerCommand,
		"hasText":true,
		"condition":function(device){
			return (device.deviceType == DEVICE_TYPE_CHROME_BROWSER || device.deviceType == DEVICE_TYPE_WIDNOWS_PC|| device.deviceType == DEVICE_TYPE_FIREFOX) && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		}
	},
	{
		"label":"Send a Maker event",
		"commandId":"maker",
		"func":back.pushIFTTTEvent,
		"hasText":true,
		"condition":function(device){
			return device.deviceType == DEVICE_TYPE_IFTTT  && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		}
	},
	{
		"label":"Send a Command",
		"commandId":"command",
		"func":back.pushCustomCommand,
		"hasText":true,
		"condition":function(device){
			return  device.deviceType == DEVICE_TYPE_IP && UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_TASKER);
		}
	},
	{
		"label":"Open PC Clipboard as file on device",
		"showForGroups":joindevices.groups.deviceGroups.allDeviceGroups,
		"commandId":"openclipboard",
		"func":back.openClipboard,
		"condition":function(device){
			return UtilsDevices.hasPermissions(device,UtilsDevices.PERMISSION_SEND_FILE) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
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
			return UtilsDevices.canReceiveNotifications(device) && device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
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
		"func":back.showPushHistory,
		"condition":function(device){
			return device.deviceType != DEVICE_TYPE_IFTTT && device.deviceType != DEVICE_TYPE_IP;
		}
	},
];

var handleDeviceCommandIcon = function(command,image){
	var setSizeFunc = icon => {
		icon.removeAttribute("width","auto");
		icon.removeAttribute("height","24");
		//icon.setAttribute("viewBox","0 0 24 24");
	}
	if(command.icon){
		if(command.icon.indexOf(".svg")>0){
			UtilsDom.replaceWithSvgInline(image,command.icon,(img,svg)=>setSizeFunc(svg));
		}else if(command.icon.indexOf("<svg") == 0){
			var container = document.createElement('div');
			container.innerHTML = command.icon;
			var icon = container.firstChild;
			setSizeFunc(icon);
			icon.setAttribute("id",image.id);
			icon.onclick = image.onclick;
			//image.parentNode.removeChild(image);
			UtilsDom.replaceElement(image,icon);
		}else {
			if(image.tagName != "img"){
				var icon = document.createElement("img");
				icon.setAttribute("id",image.id);
				icon.onclick = image.onclick;
				icon.src = command.icon;
				setSizeFunc(icon);
				UtilsDom.replaceElement(image,icon);
			}else{
				image.src = command.icon;
			}
		}
	}else{
		UtilsDom.replaceWithSvgInline(image,"/icons/commands/" + command.commandId + ".svg").then(svg=>{
			if(!svg){
				return;
			}
			if(command.transformIcon){
				svg.style.transform = command.transformIcon;
			}
		});
	}
}
var getDeviceCommands = function(){
	var result = deviceCommands.slice();
	var taskerCommands = new TaskerCommands();
	var getOnClickFunc = command => function(deviceId, notify,text){
		taskerCommands.performCommand(deviceId,command.commandId);
	}
	var getConditionFunc = command => function(device){
		return command.deviceIds && command.deviceIds.indexOf(device.deviceId)>=0;
	}
	for(var command of taskerCommands.getCommands()){
		command.keepTab = true;
		command.func = getOnClickFunc(command);
		command.condition = getConditionFunc(command);
		result.push(command);
	}
	return result;
}
var commandSortOrder = {};
var sortDeviceCommands = function(){
	var deviceCommands = getDeviceCommands();
	if(!localStorage){
		return deviceCommands;
	}
	var orderJson = localStorage.deviceCommandsOrder;
	if(!orderJson){
		return deviceCommands;
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
	return deviceCommands;
}

var storeDeviceCommandOrder = function(){
	localStorage.deviceCommandsOrder = JSON.stringify(commandSortOrder);
}

