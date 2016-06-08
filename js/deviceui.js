
var back = chrome.extension.getBackgroundPage();
var writeDevices = function(){
	var commandContainerElement = document.getElementById("devices");
	commandContainerElement.innerHTML = "";
	var deviceCommandsHtml = document.querySelector('link[href="components/device-commands.html"]').import;
	var deviceHtml = document.querySelector('link[href="components/device.html"]').import.querySelector('#device');
	var deviceButtonHtml = document.querySelector('link[href="components/device-button.html"]').import.querySelector('#devicebutton');
	var deviceButtonsHtml = document.querySelector('link[href="components/device-buttons.html"]').import.querySelector('#devicebuttons');
	var buttonsElement = null;
	var selectedDevice = null;

	var deviceHover = function(e){
		var element = e.target;
		if(!element){
			return;
		}
		while(!element.device){
			element = element.parentElement;
		}
		deviceElements.doForAll(function(deviceElement){
			deviceElement.classList.remove("selecteddevice");
		});
		element.classList.add("selecteddevice");
		selectedDevice = element.device;
		localStorage.lastHoveredDeviceId = element.device.deviceId;

		for (var i = 0; i < buttonsElement.children.length; i++) {
			var buttonElement = buttonsElement.children[i];
			var command = buttonElement.command;
			var enabled = true;
			if(selectedDevice.deviceType == DEVICE_TYPE_GROUP){
				var groupId = selectedDevice.deviceId.substring(6);
				var group = joindevices.groups.deviceGroups.allDeviceGroups.first(function(group){
					return group.id == groupId;
				});
				if(group){
					var groups = command.showForGroups;
					if(groups && groups.indexOf(group) >= 0){
						enabled = true;
					}else{
						enabled = false;
					}
				}
			}else{
				if(command.condition){
					if(!command.condition(selectedDevice)){
						enabled = false;
					}
				}
			}
			if(enabled){
				buttonElement.className = buttonElement.className.replace("disabled","");
			}else{
				buttonElement.classList.add("disabled");
			}
		};
	}

	var deviceCommandsElement = deviceCommandsHtml.querySelector("#devicecommands").cloneNode(true);
	back.getCurrentTab(function(tab){
		if(!tab){
			return;
		}
		if(tab.url.indexOf(DEVICES_POPUP_URL)==0){
			deviceCommandsElement.className = "devicecommandsleft";
		}
	});



	var deviceElements = [];
	commandContainerElement.appendChild(deviceCommandsElement);
	deviceCommandsElement.innerHTML = "";
	var devicesElement = deviceCommandsHtml.querySelector("#devicelist").cloneNode(true);
	deviceCommandsElement.appendChild(devicesElement);
	for (var i = 0; i < back.devices.length; i++) {
		var device = back.devices[i];
		var deviceElement = deviceHtml.cloneNode(true);
		deviceElement.onclick = deviceHover;
		deviceElement.device = device;
		deviceElement.querySelector("#devicename").textContent = device.deviceName;
		var deviceIcon = deviceImages[""+device.deviceType](device);
		if(!deviceIcon && device.deviceType == DEVICE_TYPE_GROUP){
			deviceIcon = device.deviceId.substring(6) + ".png";
		}
		deviceElement.querySelector("#deviceicon").src = "icons/" + deviceIcon;
			devicesElement.appendChild(deviceElement);
		deviceElements.push(deviceElement);
	};


	var findButtonElement =function(e){
		if(e.commandLink){
			return e;
		}
		var target = e.target;
		while(!target.commandLink){
			target = target.parentElement;
		}
		return target;
	}
	var highlightColor = "#FF9800";
	var lowlightColor = "#757575";
	var setButtonColor = function(e, color){
		var buttonElement = findButtonElement(e);
		tintImage(buttonElement.commandImage,color);
		buttonElement.commandLink.style.color = color;
	}
	var buttonHover = function(e){
		setButtonColor(e,highlightColor);
	};
	var buttonHoverOut = function(e){
		setButtonColor(e,lowlightColor);
	};
	var buttonClick = function(e){
		var link = findButtonElement(e);
		/*if(link.command.condition && !link.command.condition(selectedDevice)){
			return;
		}*/

		back.getCurrentTab(function(tab){
			if(!tab || isPopup){
				link.command.func(selectedDevice.deviceId,true, tab);
				if(tab && !link.command.keepTab){
									chrome.tabs.remove(tab.id,function(){
									});
							}
						}else{
				link.command.func(selectedDevice.deviceId,true);
						}
		});
	}
	var buttonScroll = 0;
	var buttonDragStart = function(e){
		var buttonElement = findButtonElement(e);
		e.dataTransfer.setData("index",buttonElement.commandIndex);
		console.log(buttonElement);
	}
	var buttonDragDrop = function(e){

		var buttonScroll = commandsElement.scrollTop;
		//console.log(e.target);
		var buttonElement = findButtonElement(e);
			var oldIndex = e.dataTransfer.getData("index");
			var newIndex = buttonElement.commandIndex;
			var commandBeingDragged = null;
			var moveIndex = function(prop, index, value){
			console.log(index + "=>" + (index + value));
			index = index + value;
			commandSortOrder[prop] = index;
			}
			var moveIndexForward = function(prop, index){
			moveIndex(prop,index,1);
			};
			var moveIndexBackward = function(prop, index){
			moveIndex(prop,index,-1);
			};
			for(var prop in commandSortOrder){
				var commandBeingDraggedIndex = commandSortOrder[prop];
				if(newIndex < oldIndex){
					if(commandBeingDraggedIndex >= newIndex && commandBeingDraggedIndex < oldIndex){
						moveIndexForward(prop, commandBeingDraggedIndex);
					}
				}else{
					if(commandBeingDraggedIndex <= newIndex && commandBeingDraggedIndex > oldIndex){
						moveIndexBackward(prop, commandBeingDraggedIndex);
					}
				}
				if(commandBeingDraggedIndex == oldIndex){
					commandBeingDragged = deviceCommands.first(function(command){
						return command.commandId == prop;
					});
				}
			}
		console.log(commandBeingDragged);
		console.log("=>");
		console.log(buttonElement.command);
		commandSortOrder[commandBeingDragged.commandId] = newIndex;
		/*commandSortOrder[buttonElement.command.commandId] = oldIndex;*/
		storeDeviceCommandOrder();
		writeDevices();
		document.querySelector("#commands").scrollTop = buttonScroll;
	}
	var allowDrop = function(e){
		e.preventDefault();
	}
	var commandsElement = deviceCommandsHtml.querySelector("#commands").cloneNode(true);
	buttonsElement = deviceButtonsHtml.cloneNode(true);
	deviceCommandsElement.appendChild(commandsElement);
	commandsElement.appendChild(buttonsElement);
	sortDeviceCommands();
	for (var e = 0; e < deviceCommands.length; e++) {
		var command = deviceCommands[e];
		var buttonElement = deviceButtonHtml.cloneNode(true);
		buttonElement.onmouseover = buttonHover;
		buttonElement.onmouseout = buttonHoverOut;
		var link = buttonElement.querySelector("#link");
		var image = buttonElement.querySelector("#devicebuttonimage");

		image.src = "icons/" + command.commandId + ".png";
		commandSortOrder[command.commandId] = e;
		link.textContent = command.label;
		buttonElement.onclick = buttonClick;
		buttonElement.command = command;
		buttonElement.commandLink = link;
		buttonElement.commandImage = image;
		buttonElement.commandIndex = e;
		buttonElement.ondragstart = buttonDragStart;
		buttonElement.ondragover = allowDrop;
		buttonElement.ondrop = buttonDragDrop;
		buttonsElement.appendChild(buttonElement);
	};
	var lastHoveredDevice = back.devices.first(function(device){
		return device.deviceId == localStorage.lastHoveredDeviceId;
	});
	if(lastHoveredDevice){
		deviceHover({"target":deviceElements.first(function(deviceElement){return deviceElement.device.deviceId == localStorage.lastHoveredDeviceId;})});
	}else{
		deviceHover({"target":deviceElements[0]});
	}

}
document.addEventListener('DOMContentLoaded', function() {
	writeDevices();
});
