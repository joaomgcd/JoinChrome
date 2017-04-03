var device = null;
var DeviceUIEventHandler = function(){
    var INTERRUPTION_FILTER_ALARMS = 4;
    var INTERRUPTION_FILTER_ALL = 1;
    var INTERRUPTION_FILTER_NONE = 3;
    var INTERRUPTION_FILTER_PRIORITY = 2;
    var changeSetting = function(funcSetToChange){
		var gcmChangeSetting = new GCMChangeSetting();
		funcSetToChange(gcmChangeSetting);
		gcmChangeSetting.send(device.deviceId);
    }
	var setText = function(elementId, text){
		document.querySelector("#"+elementId).innerHTML = text;
	}
	var hide = function(elementId){
		document.querySelector("#"+elementId).classList.add("hidden");
	}
	var show = function(elementId){
		document.querySelector("#"+elementId).classList.remove("hidden");
	}
	var setBarPercentage = function(elementId,available,total){
		if(!available || !total){
			hide(elementId);
			return;
		}
		show(elementId);
		var element = document.querySelector("#"+elementId);
		var barElement = element.querySelector(".bar > .using");
		var sizeElement = element.querySelector(".size");
		var percentage = 100 - Math.round(available/total*100);
		barElement.style.width = percentage + "%";
		barElement.innerHTML = (100 - percentage) + "% Free";
		barElement.style["background-color"] = (percentage > 90 ? "red" : (percentage > 75 ? "#d8d070" : "green"));
		sizeElement.innerHTML = available+"MB/"+total+"MB"
	}
	var setRangeValue = function(type, status){
		var rangeElementId =  type+"Range";
		var rangeElement = document.querySelector("#" + rangeElementId);
		if(!rangeElement){
			var image = document.createElement("img");
			image.src = "/icons/"+type+".png";
			var rangeElement = document.createElement("input");
			rangeElement.setAttribute("type", "range");
			rangeElement.volumeType = type;
			rangeElement.id = rangeElementId 
			rangeElement.onchange = e => {
				console.log(e.target.value);
				changeSetting(gcmChangeSetting => gcmChangeSetting[e.target.volumeType + "Volume"] = e.target.value);
			}
			var volumeElement = document.querySelector("#" + type + "volume");
			volumeElement.appendChild(image);
			volumeElement.appendChild(rangeElement);			
		}
		var current = status[type + "Volume"];
		var max = status["max"+ type.substring(0,1).toUpperCase() + type.substring(1) +"Volume"];
		rangeElement.value = current;
		rangeElement.min = 0;
		rangeElement.max = max;
	}
	var setDndStuff = function(status){
		if(!status.canChangeInterruptionFilter){
			hide("dnd");
			return;
		}
		show("dnd");
		var dnd1 = document.querySelector("#dnd1");
		dnd1.onclick = e =>{
			if(e.target.checked){
				changeSetting(gcmChangeSetting => gcmChangeSetting.interruptionFilter = INTERRUPTION_FILTER_NONE);
				document.querySelector("#dnd" + INTERRUPTION_FILTER_NONE).checked = true;
				show("formdnd");
			}else{
				changeSetting(gcmChangeSetting => gcmChangeSetting.interruptionFilter = INTERRUPTION_FILTER_ALL);
				hide("formdnd");
			}
			Dialog.resizeCurrentDialog();
			//changeSetting(gcmChangeSetting => gcmChangeSetting.interruptionFilter = INTERRUPTION_FILTER_NONE);
		}
		var radios = document.querySelectorAll("input[name='dnd']");
		for(var radio of radios){
			radio.onclick = e => {
				console.log(e.target.id);
				changeSetting(gcmChangeSetting => gcmChangeSetting.interruptionFilter = e.target.id.replace("dnd",""));
			};
		}
		if(status.interruptionFilter == INTERRUPTION_FILTER_ALL){
			hide("formdnd");
			dnd1.checked = false;
		}else{
			dnd1.checked = true;
			show("formdnd");
			document.querySelector("#dnd" + status.interruptionFilter).checked = true;
		}
	}

	this.onStatusReceived = function(status){
		hide("loading");
		show("deviceinfo");
		console.log("Received Status!");
		console.log(status);
		if(!status){
			return;
		}
		var gcmStatus = status.gcmStatus;
		if(!gcmStatus){
			return;
		}
		if(device.deviceId != gcmStatus.deviceId){
			return;
		}
		var status = gcmStatus.status;
		if(!status){
			return;
		}
		setText("name",device.deviceName);
		setText("version",UtilsDevices.getDeviceApiLevelName(device));
		if(device.model != device.deviceName){
			setText("model","("+device.model+")");
		}else{
			hide("model");
		}

		UtilsDevices.showBatteryInfo(device, document.querySelector("#icon"), status);
		document.querySelector("#batterypercent").innerHTML = status.batteryPercentage + "%";
		setBarPercentage("internalstorage",status.internalStorageAvailable,status.internalStorageTotal);
		setBarPercentage("externalstorage",status.externalStorageAvailable,status.externalStorageTotal);
		setRangeValue("ring",status);
		setRangeValue("media",status);
		setRangeValue("alarm",status);
		setDndStuff(status);

		show("refresh");
		document.querySelector("#refresh").onclick = e => {			
			var gcmStatus = new back.GCMStatus();
			gcmStatus.request = true;
			gcmStatus.deviceId = localStorage.deviceId;
			gcmStatus.send(device.deviceId);
			hide("refresh");
			show("loading");
			hide("deviceinfo");
			Dialog.resizeCurrentDialog();
		};
		Dialog.resizeCurrentDialog();
		setTimeout(Dialog.resizeCurrentDialog,500);
	}

}
var eventHandler = new DeviceUIEventHandler();
back.eventBus.register(eventHandler);
addEventListener("unload", function (event) {
	back.console.log("Unloading device info...");
	back.eventBus.unregister(eventHandler);
});
document.addEventListener('DOMContentLoaded', function() {
	var initResult = Dialog.init({
		showOk:false
	},function(){
		return inputElement.value;
	});	
	var input = initResult.input;
	device = back.devices.first(device=>device.deviceId == input.deviceId);
	var gcmStatus = new back.GCMStatus();
	gcmStatus.request = true;
	gcmStatus.deviceId = localStorage.deviceId;
	gcmStatus.send(device.deviceId);
	var nameElement = document.querySelector("#name");
	nameElement.innerHTML = device.deviceName;
});