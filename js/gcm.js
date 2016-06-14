
var SMS_ACTION_ID = "SMS_ACTION_ID";
var COPY_NUMBER = "COPY_NUMBER";
var regexNumbers = /[0-9]{4,}/;

var Request = function(){
	this.getParams = function() {
		var json = new Object();
		for (prop in this) {
			json[prop] = this[prop];
		}
		return json;
	}
}
var GCM = function(){
	this.execute = function() {
		console.log(this);
	}
	this.fromJson = function(json) {
		for (prop in json) {
			this[prop] = json[prop];
		}
	}
	this.fromJsonString = function(str) {
		str = decryptString(str);
		if(str.indexOf("{") < 0){
			showNotification("Decryption Error","Please check that your encryption password matches the one on other devices.")
			return;
		}
		var json = JSON.parse(str);
		this.fromJson(json);
	}
	this.getCommunicationType = function() {
		return "GCM";
	}
	this.send = function(deviceId, callback, callbackError) {
		var params = this.getParams();
		params.deviceId = deviceId;
		var devicesForGroup = joindevices.groups.deviceGroups.getGroupDevices(devices,deviceId);
		if(devicesForGroup && devicesForGroup.length > 0){
			params.deviceId = null;
			params.deviceIds = devicesForGroup.select(function(device){
				return device.deviceId;
			}).join(",");
		}
		params.senderId = localStorage.deviceId;
		params.id = guid();
		this.encrypt(params);
		var gcmParams = {};
		if(params.clipboard){
			gcmParams[GCM_PARAM_TIME_TO_LIVE] = 0;
		}
		var gcm = {"push":params};
		gcm.getCommunicationType = this.getCommunicationType;
		new DeviceIdsAndDirectDevices(deviceId).send(function(deviceIds,callback,callbackError){
			params.deviceId = null;
			params.deviceIds = deviceIds.join();
			doPostWithAuth(joinserver + "messaging/v1/sendPush/",params,callback,callbackError);
		},gcm,gcmParams, function(result){
			  console.log("Sent push: " + JSON.stringify(result));
			  if(callback){
				callback(result);
			  }
			},function(error){
				console.log("Error: " + error);
				if(callbackError){
					callbackError(error);
				}
		});


	}
	this.encrypt = function(params){
		var password = localStorage.encryptionPassword;
		if(!password){
			return;
		}
		this.encryptSpecific(params,password);
	}
}
GCM.prototype = new Request();


var lastTextPushed = null;
var GCMPush = function(){
	var me = this;
	this.createNotificationFromPush = function(){

		var push = me.push;
		var title = push.title;
		var url = push.url;
		var text = push.text;
		if(!title){
			if(url){
				title = text;
				text = url;
			}else{
				title = "Join";
			}
		}

		if(!text){
			if(url){
				text = url;
			}
		}
		if(!text){
			text = "Join";
		}
		var not = {};
		not.senderId = push.senderId;
		not.id = guid();
		not.title= title;
		not.text = text;
		not.appIcon = push.icon;
		not.url = url;
		not.priority = 2;
		not.appName = "Join";
		not.keepRemote = true;
		if(text && text.match(regexNumbers)){
			not.buttons = [];
			not.buttons.push({
				text: "Copy Number",
				actionId: COPY_NUMBER
			});
		}
		var gcmNtification = new GCMNotification();
		gcmNtification.requestNotification = {notifications:[not], senderId:push.senderId};
		gcmNtification.execute();
	}
	this.getCommunicationType = function() {
		return "GCMPush";
	}
	this.execute = function() {
		decryptFields(this.push);
		console.log("Received push!!");
		if(this.push.text){
			lastTextPushed = this.push.text;
			var eventGhostPort = getEventghostPort();
			if(eventGhostPort){
				var oReq = new XMLHttpRequest();
				oReq.addEventListener("load", function(result){
					console.log(result);
					var response = result.target.responseText;
					if(response && response == "OK"){
						//showNotification("Redirected to EventGhost",me.push.text,5000);
					}else{
						if(!response){
							response = result.target.statusText;
						}
					   // showNotification("Couldn't redirect to EventGhost",response,5000);
					}
					if(!me.push.title){
						//me.createNotificationFromPush();
					}
				});
				oReq.addEventListener("error", function(result){

					if(!me.push.title){
						//me.createNotificationFromPush();
					}
				});
				oReq.open("GET", "http://localhost:"+eventGhostPort+"/?message=" + this.push.text);
				oReq.send();
			}else{
				if(!me.push.title){
					me.createNotificationFromPush();
				}
			}
			if(this.push.text == TEST_PUSH_TEXT){
				/*setTimeout(function(){*/fire(TEST_PUSH_EVENT)//},2000);
			}
		}
		if(this.push.title){
			me.createNotificationFromPush();
		}
		if(this.push.clipboard){
			directCopy(this.push.clipboard);
			showNotification("Clipboard Set", this.push.clipboard ,5000);
		}
		if(!this.push.url){
			this.push.url = getUrlIfTextMatches([this.push.text,this.push.clipboard]);
		}
		if(this.push.url && !this.push.title){
			var url = this.push.url;
			openTab(url);
		}
		if(this.push.files && this.push.files.length > 0){
			for (var i = 0; i < this.push.files.length; i++) {
				var file = this.push.files[i];
				if(getDownloadScreenshotsEnabled()){
					var fileId = getDeviceFileIdFromUrl(file);
					if(fileId){
						file = "https://drive.google.com/uc?export=download&id=" + fileId;
					}
				}
				openTab(file);
			}
			showNotification("Join", "Received " + this.push.files.length + " file" + (this.push.files.length == 1 ? "" : "s") ,5000);
		}
		if(this.push.location){
			if(this.push.senderId){
				navigator.geolocation.getCurrentPosition(function(location){
					var gcmLocation = new GCMLocation();
					gcmLocation.latitude = location.coords.latitude;
					gcmLocation.longitude = location.coords.longitude;
					gcmLocation.send(me.push.senderId);
				});
			}
		}
	}
	this.encryptSpecific = function(push, password){
		push.encrypted = true;
		push.text = encrypt(push.text,password);
		push.url = encrypt(push.url,password);
		push.smsnumber = encrypt(push.smsnumber,password);
		push.smstext = encrypt(push.smstext,password);
		push.clipboard = encrypt(push.clipboard,password);
		push.file = encrypt(push.file,password);
		push.files = encrypt(push.files,password);
		push.wallpaper = encrypt(push.wallpaper,password);
	}
}
GCMPush.prototype = new GCM();
var GCMPushOther = function(){

	this.getCommunicationType = function() {
		return "GCMPushOther";
	}
	this.execute = function() {
		console.log("Push for other");
	}
}
GCMPushOther.prototype = new GCM();
var handlePendingRequest = function(responseObject, requestId,senderId, fileId){
	for (var i = 0; i < pendingRequests.length; i++) {
		var pendingRequest = pendingRequests[i];
		if(pendingRequest.requestId == requestId){
			console.log("found pending request");
			if(pendingRequest.download){
				downloadFile(fileId,function(fileContents){
					var fileObject =JSON.parse(fileContents);
					fileObject.senderId = senderId;
					pendingRequest.callback(fileObject);
				});
			}else{
				pendingRequest.callback(responseObject);
			}
			if(!pendingRequest.keep){
				pendingRequests.splice(i,1);
			}
			break;
		}
	};
}
var GCMRespondFile = function(){

	this.getCommunicationType = function() {
		return "GCMRespondFile";
	}
	this.execute = function() {
		var me = this;
		console.log("got file response for requestId: " + this.responseFile.request.requestId);
		handlePendingRequest(this.responseFile,this.responseFile.request.requestId,me.responseFile.senderId,this.responseFile.fileId);
		console.log("got file response");
		var event = new Event('fileresponse',{"fileId":this.responseFile.fileId});
		event.fileId = this.responseFile.fileId;
		back.dispatchEvent(event);
	}
}
GCMRespondFile.prototype = new GCM();

var GCMDeviceRegistered = function(){

	this.getCommunicationType = function() {
		return "GCMDeviceRegistered";
	}
	this.execute = function() {
		refreshDevices();
	}
}
GCMDeviceRegistered.prototype = new GCM();
var GCMAutoClipboard = function(){

	this.getCommunicationType = function() {
		return "GCMAutoClipboard";
	}
	this.execute = function() {
		this.text = decryptString(this.text);
		directCopy(this.text,true);
		if(getAutoClipboardNotification()){
			showNotification("Clipboard Automatically Set", this.text ,5000);
		}
	}
}
GCMAutoClipboard.prototype = new GCM();
var GCMGenericPush = function(){

	this.getCommunicationType = function() {
		return "GCMGenericPush";
	}
	this.send = function(deviceIds) {
		var params = this.getParams();
		if(typeof deviceIds == "string"){
			deviceIds = [deviceIds];
		}
		params.deviceIds = deviceIds;
		params.senderId = localStorage.deviceId;
		params.type = this.getCommunicationType();
		params.json = JSON.stringify(params);
		this.encrypt(params);
		params.getCommunicationType = this.getCommunicationType;
		new DeviceIdsAndDirectDevices(deviceIds).send(function(deviceIds,callback, callbackError){
			params.deviceIds = deviceIds;
			doPostWithAuth(joinserver + "messaging/v1/sendGenericPush/",params,callback, callbackError);

		},params,{}, function(result){
			  console.log("Sent generic push: " + JSON.stringify(result));
			},function(error){
				console.log("Error: " + error);
		});

	}
	this.encryptSpecific = function(gcm, password){
		gcm.json = encrypt(gcm.json,password);
	}
}
GCMGenericPush.prototype = new GCM();
var GCMLocation = function(){

	this.getCommunicationType = function() {
		return "GCMLocation";
	}
	this.execute = function() {
		var location = this.latitude + "," + this.longitude;
		openTab("https://www.google.com/maps?q="+location+"&ll="+location+"&z=17");
	}
}
GCMLocation.prototype = new GCMGenericPush();
var GCMSMSHandled = function(){

	this.text = null;
	this.getCommunicationType = function() {
		return "GCMSMSHandled";
	}
	this.execute = function() {


	}
}
GCMSMSHandled.prototype = new GCMGenericPush();
var GCMRequestNotifications = function(){

	this.getCommunicationType = function() {
		return "GCMRequestNotifications";
	}
}
GCMRequestNotifications.prototype = new GCMGenericPush();
var Notifications = function(){
	this.removeNotificationsWithSameId = function(id){
		var removed = this.removeIf(function(notification){
			return notification.id == id;
		});
		chrome.notifications.clear(id, function(){});
		return removed;
	}
	this.getSimilarNotification = function(notification){
		var id = notification.id;
		var title = notification.title;
		var text = notification.text;
		return notifications.first(function(notification){
			var sameId = notification.id == id;
			var result = false;
			if(sameId){
				result = true;
			}else if(!title || !text){
				result = false;
			}else{
				result = notification.title == title && notification.text == text;
			}
			return result;
		});
	}
};
Notifications.prototype = new Array();
var notifications = new Notifications();
var updateBadgeText = function(){
	if(!notifications || notifications.length == 0){
		chrome.browserAction.setBadgeText({text: ""});
	}else{
		chrome.browserAction.setBadgeText({text: ""+ notifications.length});
	}
}
var GCMNotification = function(){

	this.getCommunicationType = function() {
		return "GCMNotification";
	}
	this.decryptNotification = function(not){
		var key = getStoredKey();
		not.text = decryptString(not.text,key);
		not.title = decryptString(not.title,key);
		not.appName = decryptString(not.appName,key);
		not.appPackage = decryptString(not.appPackage,key);
		not.subText = decryptString(not.subText,key);
		not.lines = decryptArray(not.lines,key);
		not.iconData = decryptString(not.iconData,key);
		not.group = decryptString(not.group,key);
		not.id = decryptString(not.id,key);
		not.color = decryptString(not.color,key);
		if(not.buttons && not.buttons.length > 0){
			for (var i = 0; i < not.buttons.length; i++) {
				var button = not.buttons[i];
				button.text = decryptString(button.text,key);
			};
		}
		if(not.appPackage && not.appPackage.indexOf("=:=")>=0){
			not.text = "Seems like you forgot to set the encryption password on this device or it is different from the device that sent this. Go to the extension options to set it.";
			not.iconData = null;
			not.appName ="";
		}
	}
	
	this.execute = function() {

		var me = this;
		for (var i = 0; i < this.requestNotification.notifications.length; i++) {
			var not = this.requestNotification.notifications[i];
			this.decryptNotification(not);
			not.senderId = me.requestNotification.senderId;
			not.isSmsNotification = function(){
				return this.actionId && this.actionId == SMS_ACTION_ID;
			}
			not.cancel = function(){
				if(not.isSmsNotification()){
					back.dispatch(EVENT_SMS_HANDLED,{"text":not.text,"deviceId":not.senderId});
				}
				notifications.removeNotificationsWithSameId(this.id);
				if(!this.keepRemote){
					var gcmNotificationClear = new GCMNotificationClear();
					gcmNotificationClear.send(this,me.requestNotification.senderId);
				}else{
					console.log("keeping remote");
				}
				deleteIcon(this.notificationIcon);
				updateBadgeText();
				refreshNotificationsPopup();
			}
			not.doAction = function(actionId,text, isReply){
				var notification = this;
				
				if(actionId == COPY_NUMBER){
					var matches = notification.text.match(regexNumbers);
					if(matches && matches.length > 0){
						var number = matches[0];
						directCopy(number);
						showNotification("Clipboard Set To Number", number,5000);
					}else{
						showNotification("Couldn't copy number", notification.text,5000);
					}
					return;
				}
				if(notification.isSmsNotification()){
					var number = notification.smsnumber;
					showSmsPopup(me.requestNotification.senderId,number,notification.smsname,isReply,notification.smstext);
					notification.cancel();
					return;
				}
				if(!actionId || (!text && isReply)){
					return;
				}
				doPostWithAuth(joinserver + "messaging/v1/doNotificationAction/",{"actionId":actionId,"text":text,"deviceId":me.requestNotification.senderId,"appPackage":notification.appPackage}, function(result){
				  if(result.success){
					console.log("Sent notification action: " + notification.id);
					var message = notification.actionDescription;
					if(!message){
						message = "Performed action remotely.";
					}
					if(back.getShowInfoNotifications()){
						showNotification("Join",message);
					}
				  }else{
					console.log("Sent notification action error: " + result.errorMessage);
					showNotification("Join","Error performing action: " + result.errorMessage);
				  }
				  if(notification.cancelOnAction){
					notification.cancel();
				  }
				},function(error){
					console.log("Error: " + error);
				});
			}

			var chromeNotification = new ChromeNotification(not);
			var removed = notifications.removeNotificationsWithSameId(not.id);
			var similar = notifications.getSimilarNotification(not);
			var shouldNotify = false;
			if(similar){
				console.log("Similar notification present");
				console.log(similar);
				if(not.replyId){
					notifications.removeNotificationsWithSameId(similar.id);
					shouldNotify = true;
				}
			}else{
				//if(removed == 0){
					shouldNotify = true;
				//}
			}
			if(not.priority >= 1){
				shouldNotify = true;
			}
			var notificationNoPopupPackages = back.getNotificationNoPopupPackages().split("\n");
			if(notificationNoPopupPackages.indexOf(not.appPackage) >= 0){
				shouldNotify = false;
			}
			if(shouldNotify){
				chromeNotification.notify();
			}
			notifications.push(not);
			notifications.sort(function(left,right){
				if(left.priority && right.priority){
					return left.priority - right.priority;
				}
				if(left.priority){
					return 1;
				}
				if(right.priority){
					return -1;
				}
				return 0;
			});
			refreshNotificationsPopup();
			//showNotificationsPopup();
		}
		var requestId = this.requestNotification.requestId;
		if(requestId){
			handlePendingRequest(this,requestId);
		}

	}
}
GCMNotification.prototype = new GCM();
var deleteIcon = function(iconFileId){
	if(!iconFileId){
		return;
	}
	if(iconFileId.indexOf("http")>=0){
		return;
	}
	doDeleteWithAuth(baseDriveUrlFiles + iconFileId,null,function(){
		console.log("deleted icon from drive: " + iconFileId);
	});
}
var GCMNotificationClear = function(){

	this.getCommunicationType = function() {
		return "GCMNotificationClear";
	}
	this.execute = function() {
		var requestNotification = this.requestNotification;
		notifications.removeNotificationsWithSameId(requestNotification.requestId);
		refreshNotificationsPopup();
	}
	this.send = function(notification, deviceId) {
		var params = {};
		params.deviceIds = [deviceId];
		params.senderId = localStorage.deviceId;
		params.requestId = notification.id;
		var gcm = {"requestNotification":params,"getCommunicationType":this.getCommunicationType};

		new DeviceIdsAndDirectDevices(params.deviceIds).send(function(deviceIdsServer,callback, callbackError){
			params.deviceIds = deviceIdsServer;
			doPostWithAuth(joinserver + "messaging/v1/clearNotification/",params,callback, callbackError);
		},gcm,{}, function(result){
			  console.log("Sent notification cancel: " + notification.id);
			},function(error){
				console.log("Error: " + error);
		});

	}
	this.clearAll = function() {
		var params = {};
		params.deviceIds = devices.select(function(device){return device.deviceId});
		params.senderId = localStorage.deviceId;
		params.notificationIds = notifications.select(function(notification){return notification.id});
		doPostWithAuth(joinserver + "messaging/v1/clearNotification/",params, function(result){
		  console.log("Sent notification cancel: " + params.notificationIds);
		},function(error){
			console.log("Error: " + error);
		});

	}
}
GCMNotificationClear.prototype = new GCM();

var GCMNewSmsReceived = function(){

	this.getCommunicationType = function() {
		return "GCMNewSmsReceived";
	}
	this.execute = function() {
		var title = "New SMS from " + this.name + " (" + this.number +")";
		/*var chromeNotification = new ChromeNotification({
				"id":"sms=:=" + this.senderId + "=:=" + this.number + "=:=" + this.text,
				"title":title,
				"text":this.text,"actionId":"newsms",
				"buttons":[{
					"text": Constants.REPLY_DIRECTLY,
					"icon": "icons/reply.png"
				}]
			});
		chromeNotification.notify(); */

		var not = {};
		not.id = UtilsSMS.getNotificationId(this.senderId, this.number);
		not.title= title;
		not.text = this.text;
		not.priority = 2;
		not.appName = "Join";
		not.replyId = SMS_ACTION_ID;
		not.noPrompt = true;
		not.actionDescription = "Sending SMS to " + this.name + "...";
		not.cancelOnAction = true;
		not.smsnumber = this.number;
		not.smsname = this.name;
		not.smstext = this.text;
		not.actionId = SMS_ACTION_ID;
		not.buttons = [];
		if(this.text.match(regexNumbers)){
			not.buttons.push({
				text: "Copy Number",
				actionId: COPY_NUMBER
			});
		}
		var gcmNtification = new GCMNotification();
		gcmNtification.requestNotification = {notifications:[not], senderId:this.senderId};
		gcmNtification.execute();
		var sms = {"number":this.number,"text":this.text};
		dispatch('smsreceived',{"sms":sms,"deviceId":this.senderId});
	}
}
GCMNewSmsReceived.prototype = new GCM();
var GCMSmsSentResult = function(){

	this.getCommunicationType = function() {
		return "GCMSmsSentResult";
	}
	this.execute = function() {
		if(this.success){
			console.log("SMS pushed");
			//showNotification("Join","SMS pushed. Waiting for response...");
		}else{
			var error = "Error pushing SMS: " + this.errorMessage;
			console.log(error);
			//showNotification("Join",error);
		}
		dispatch("smssent",{"success":this.success,"errorMessage":this.errorMessage,"requestId":this.requestId});
		//handlePendingRequest(this,this.requestId);

	}
}
GCMSmsSentResult.prototype = new GCM();
chrome.notifications.onClicked.addListener(function(id){
	if(id.indexOf("clipboardlasttext")==0){
		directCopy(lastTextPushed);
		showNotification("Join", "Copied text to clipboard");
		return;
	}
	if(id.indexOf("sms=:=")<0){
		return;
	}
	chrome.notifications.clear(id, function(){});
	var split = id.split("=:=");
	var senderId = split[1];
	var number = split[2];
	showSmsPopup(senderId,number);
});
chrome.notifications.onButtonClicked.addListener(function(id,index){
	if(id.indexOf("sms=:=")<0){
		return;
	}
	chrome.notifications.clear(id, function(){});
	var split = id.split("=:=");
	var senderId = split[1];
	var number = split[2];
	var text = split[3];
	var reply = prompt(text);
	if(!reply){
		return;
	}
	var requestId = guid();
	var push = new GCMPush();
	push.smsnumber = number;
	push.smstext = reply;
	push.requestId = requestId;
	push.responseType = RESPONSE_TYPE_PUSH;
	pendingRequests.push({"requestId":requestId,"callback":function(result){
		if(result.success){
			showNotification("Join","SMS sent!");
		}else{
			showNotification("Join","SMS not sent: " + result.errorMessage);
		}
		console.log(result);
	}});
	push.send(senderId,function(result){
		if(result.success){
			console.log("SMS pushed");
			showNotification("Join","SMS pushed. Waiting for response...");
		}else{
			var error = "Error pushing SMS: " + result.errorMessage;
			console.log(error);
			showNotification("Join",error);
		}
	});

});
