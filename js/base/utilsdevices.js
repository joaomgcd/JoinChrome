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
	"canReportStatus":function(device){
		if(!device){
			return false;
		}
		if(!device.regId2){
			return false;
		}
		if(UtilsDevices.isDeviceShare(device)){
			return false;
		}
		if(device.deviceType != DEVICE_TYPE_ANDROID_PHONE && device.deviceType != DEVICE_TYPE_ANDROID_TABLET){
			return false;
		}
		return true;
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
	},
	"canContactViaLocalNetwork":function(device){
		return UtilsDevices.getLocalNetworkServerAddress(device) ? true : false;
	},
	"getLocalNetworkServerAddress":function(device){
		var deviceId = device;
		if(typeof deviceId != "string"){
			deviceId = device.deviceId
		}
		const key = `localNetwork${deviceId}`;
		return localStorage[key];
	},
	"setCanContactViaLocalNetwork":function(device,value){
		var deviceId = device;
		if(typeof deviceId != "string"){
			deviceId = device.deviceId
		}else{
			device = back.devices.first(device => device.deviceId == deviceId);
		}
		const key = `localNetwork${deviceId}`;
		const currentValue = UtilsDevices.canContactViaLocalNetwork(deviceId);
		if(currentValue != value){
			back.console.log(`${device.deviceName}: ${value?"local":"remote"}`);
		}
		if(value){
			localStorage[key] = value;
		}else{
			delete localStorage[key];
		}
		
		back.refreshDevicesPopup();
	},
	"isHidden":function(device){
		return back.getOptionValue("checkbox",device.deviceId + "disable");
	},
	"isChrome":function(device){
		return device.deviceType == DEVICE_TYPE_CHROME_BROWSER;
	},
	"isNotHidden":function(device){
		return !UtilsDevices.isHidden(device);
	},
	"getDeviceImage":function(device){
		var func = back.deviceImages[""+device.deviceType];
		var icon = "/icons/" + func(device);
		return icon;
	},
	"getDeviceApiLevelName":function(device){
		if(!device){
			return null;
		}
		for(var version of versions){
			if(version.version == device.apiLevel){
				return `Android ${version.name}`;
			}
		}
	},
	"showBatteryInfo":function(device, imageElement, status){
		if(!imageElement){
			return;
		}
		var newImageElement = document.createElement("img");
		newImageElement.id = imageElement.id;
		var classes = imageElement.classList.value;
		if(classes){
			newImageElement.setAttribute("class",classes.replace("replaced-svg",""));	
		}
		if(status.charging){
			newImageElement.src = "/icons/deviceinfo/charging.svg";
		}else{
			newImageElement.src = UtilsDevices.getDeviceImage(device);
		}

		UtilsDom.replaceElement(imageElement,newImageElement);
		imageElement = newImageElement;
		UtilsDom.replaceWithSvgInline(imageElement);
		var level = status.batteryPercentage;
		back.console.log("Level: "+ level);
		if(!level || level == 0){
			return;
		}
		var c = imageElement.parentElement.querySelector("#canvasBattery");
		var lineWidth = 3;
		var halfLineWidth = lineWidth / 2;
		var size = imageElement.parentElement.clientWidth - halfLineWidth;
		var halfSize = size / 2;
		if(!c){
			c = document.createElement('canvas');
			c.id = "canvasBattery";
			imageElement.parentElement.appendChild(c);
			c.width = size + 3;
			c.height = size + 3;
		}
		if(level == c.batteryLevel){
			return;
		}
		c.batteryLevel = level;

		c.style["z-index"] = 10;
		c.style.position = "absolute";
		c.style.left = imageElement.offsetLeft;
		c.style.top = imageElement.offsetTop;
		var ctx = c.getContext("2d");
		ctx.strokeStyle = (level > 75 ? "green" : (level > 25 ? "green" : "red"));
		ctx.lineWidth = lineWidth;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		//ctx.shadowBlur = 5;
		//ctx.shadowColor = '#656565';
		var percentage = level; 
		var degrees = percentage * 360.0;
		var radians = degrees * (Math.PI / 180);

		var x = halfSize + halfLineWidth;
		var y = halfSize + halfLineWidth;
		var radius = halfSize;
		var endPercent = percentage;
		var curPerc = 0;
		var counterClockwise = false;
		var circ = Math.PI * 2;
		var quart = Math.PI / 2;   
		var iteration = 0;
		var totalIterations = 100;
		var easingValue;
		/*var grd = ctx.createRadialGradient(0, 0, 5, 0, 0, 100);
		//ctx.setTransform(1,0,0,1, x, y);
		grd.addColorStop(0, 'red');
		grd.addColorStop(1, 'white');
		ctx.fillStyle = grd;*/
		function easeOutCubic(currentIteration, startValue, changeInValue, totalIterations) {
		    return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 3) + 1) + startValue;
		}
		function animate(current) {
			 easingValue = easeOutCubic(iteration, 0, percentage, totalIterations);
		     ctx.clearRect(0, 0, c.width, c.height);
		     ctx.beginPath();
		     ctx.arc(x, y, radius, -(quart), ((circ) * current) - quart, false);
		     ctx.stroke();
		     curPerc++;
    		 iteration++;
		     if (easingValue < endPercent) {
		         requestAnimationFrame(function () {
		             animate(easingValue / 100)
		         });
		     }
		 }

		animate(0);
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
var versions = [
    {
        "version": 30,
        "name": "11"
    },
    {
        "version": 29,
        "name": "10"
    },
    {
        "version": 28,
        "name": "P (9.0)"
    },
    {
        "version": 27,
        "name": "Oreo (8.1)"
    },
    {
        "version": 26,
        "name": "Oreo (8.0)"
    },
    {
        "version": 25,
        "name": "Nougat (7.1)"
    },
    {
        "version": 24,
        "name": "Nougat (7.0)"
    },
    {
        "version": 23,
        "name": "Marshmallow (6.0)"
    },
    {
        "version": 22,
        "name": "Lollipop (5.1)"
    },
    {
        "version": 21,
        "name": "Lollipop (5.0)"
    },
    {
        "version": 19,
        "name": "KitKat (4.4 - 4.4.4)"
    },
    {
        "version": 18,
        "name": "Jelly Bean (4.3.x)"
    },
    {
        "version": 17,
        "name": "Jelly Bean (4.2.x)"
    },
    {
        "version": 16,
        "name": "Jelly Bean (4.1.x)"
    },
    {
        "version": 15,
        "name": "Ice Cream Sandwich (4.0.3 - 4.0.4)"
    },
    {
        "version": 14,
        "name": "Ice Cream Sandwich (4.0.1 - 4.0.2)"
    },
    {
        "version": 13,
        "name": "Honeycomb (3.2.x)"
    },
    {
        "version": 12,
        "name": "Honeycomb (3.1)"
    },
    {
        "version": 11,
        "name": "Honeycomb (3.0)"
    },
    {
        "version": 10,
        "name": "Gingerbread (2.3.3 - 2.3.7)"
    },
    {
        "version": 9,
        "name": "Gingerbread (2.3 - 2.3.2)"
    },
    {
        "version": 8,
        "name": "Froyo (2.2.x)"
    },
    {
        "version": 7,
        "name": "Eclair (2.1)"
    },
    {
        "version": 6,
        "name": "Eclair (2.0.1)"
    },
    {
        "version": 5,
        "name": "Eclair (2.0)"
    },
    {
        "version": 4,
        "name": "Donut (1.6)"
    },
    {
        "version": 3,
        "name": "Cupcake (1.5)"
    }
];