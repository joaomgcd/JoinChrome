
var SMS_ACTION_ID = "SMS_ACTION_ID";
var COPY_NUMBER = "COPY_NUMBER";
var HANG_UP = "HANG_UP";
var CALL_BACK = "CALL_BACK";
var REPLY_ACTION = "REPLY_ACTION";
var LOCAL_DISMISS = "LOCAL_DISMISS";
var regexNumbers = /[0-9\.]{4,}/g;

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
		try{
			str = decryptString(str);
		}catch(error){
			console.log("Wasn't encrypted: " + str);
		}
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
		var devicesForGroup = joindevices.groups.deviceGroups.getGroupDevices(back.devices,deviceId);
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
        return new DeviceIdsAndDirectDevices(deviceId)
        .sendPromise({
            gcm:gcm,
            gcmParams:gcmParams,
            sendThroughServer:function(deviceIds,callback,callbackError){
                params.deviceId = null;
                params.deviceIds = deviceIds.join();
                doPostWithAuth(joinserver + "messaging/v1/sendPush/",params,callback,callbackError);
            }
        })
        .then(function(result){
            console.log("Sent push: " + JSON.stringify(result));
            if(callback){
                callback(result);
            }else{
            	return result;
            }
        })
        .catch(function(error){
            console.log("Error: " + error);
            if(callbackError){
                callbackError(error);
            }else{
                return Promise.reject(error);
            }
        });
		/*new DeviceIdsAndDirectDevices(deviceId).send(function(deviceIds,callback,callbackError){
			params.deviceId = null;
			params.deviceIds = deviceIds.join();
			doPostWithAuth(joinserver + "messaging/v1/sendPush/",params,callback,callbackError);
		},gcm,gcmParams, function(result){
			  if(!result.success){
				  console.log("Couldn't send push: " + result.errorMessage);
				  if(callbackError){
					callbackError(result.errorMessage);
				  }
				  return;
			  }
			  console.log("Sent push: " + JSON.stringify(result));
			  if(callback){
				callback(result);
			  }
			},function(error){
				console.log("Error: " + error);
				if(callbackError){
					callbackError(error);
				}
		});*/


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
		not.id = push.id;
		not.title= title;
		not.text = text;
		not.appIcon = push.icon;
		not.url = url;
		not.priority = 2;
		not.appName = "Join";
		not.keepRemote = true;
		not.gcmDeleteOnCancel = true;
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
				oReq.open("GET", "http://localhost:"+eventGhostPort+"/?message=" +encodeURIComponent(this.push.text));
				oReq.send();
			}else{
				if(!me.push.title){
					me.createNotificationFromPush();
				}
			}
			if(this.push.text == TEST_PUSH_TEXT){
                back.eventBus.postSticky(new back.Events.TestPush());
				/*setTimeout(function(){*///fire(TEST_PUSH_EVENT)//},2000);
			}
		}
		if(this.push.title){
			me.createNotificationFromPush();
		}
		if(this.push.clipboard){
			directCopy(this.push.clipboard);
			var notificationText = this.push.clipboard;
			if(!back.getClipboardNotificationShowContents()){
				notificationText = "Clipboard content hidden";
			}
			showNotification("Clipboard Set",  notificationText,5000);
		}
		if(!this.push.url){
			var toCheck = [this.push.clipboard];
			if(this.push.text && this.push.text.indexOf("=:=")<0){
				toCheck.push(this.push.text);
			}
			this.push.url = getUrlIfTextMatches(toCheck);
		}
		if(this.push.url && !this.push.title){
			var url = this.push.url;
			if (getOpenLinksEnabled()) {
				openTab(url);
			} else {
				if (!this.push.text) {
					this.push.title = "URL";
					me.createNotificationFromPush();
				}
			}
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
					if(me.push.fromTasker){
						gcmLocation.forTasker = true;
					}
					gcmLocation.requestId = me.push.requestId;
					gcmLocation.send(me.push.senderId);
				});
			}
		}
		var googleDriveManager = new GoogleDriveManager();
		googleDriveManager.addPushToMyDevice(this.push);
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
		/*var event = new Event('fileresponse',{"fileId":this.responseFile.fileId});
		event.fileId = this.responseFile.fileId;
		back.dispatchEvent(event);
        */
        back.eventBus.post(new back.Events.FileResponse(this.responseFile.fileId));
	}
}
GCMRespondFile.prototype = new GCM();

var GCMDeviceRegistered = function(){

	this.getCommunicationType = function() {
		return "GCMDeviceRegistered";
	}
	this.execute = function() {
		if(!this.device || !devices){
			return;
		}
		var funcSameDevice = device => device.deviceId == this.device.deviceId;
		var existingDevice = devices.first(funcSameDevice);
		if(!existingDevice){
			refreshDevices();
		}else{
			devices.removeIf(funcSameDevice);
			if(!this.deleted){
				devices.push(this.device);
			}
			setDevices(devices);
		}
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
		if(this.latitude && this.longitude){			
			var location = this.latitude + "," + this.longitude;
			openTab("https://www.google.com/maps?q="+location+"&ll="+location+"&z=17");
		}
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
		if(!id){
			return;
		}
		var removed = this.removeIf(function(notification){
			var remove = notification.id == id;
			if(remove){
				notification.announceNotificationHandled({"dismissed":true});
			}
			return remove;
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
			if(!title || !text){
				result = false;
			}else{
				result = sameId && notification.title == title && notification.text == text;
			}
			return result;
		});
	}
};
Notifications.prototype = new Array();
var notifications = new Notifications();
var updateBadgeText = function(){
	if(!notifications || notifications.length == 0){
		UtilsBadge.setBadge("");
	}else{
		UtilsBadge.setBadge(notifications.length);
		back.localStorage.areNotificationsUnread = true;
	}
}
var GCMNotification = function(notification, senderId){

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
			not.isSmsNotification = function(actionId){
				return actionId && actionId == SMS_ACTION_ID;
			}
			not.cancel = function(localOnly){
				if(not.isSmsNotification(not.actionId)){
					back.dispatch(EVENT_SMS_HANDLED,{"text":not.text,"deviceId":not.senderId});
				}
				notifications.removeNotificationsWithSameId(this.id);
				if(!localOnly && this.gcmDeleteOnCancel){
					var deviceIdsToDelete = back.devices.where(device=>device.regId2?true:false).select(device=>device.deviceId);
					var gcmPushDelete = new GCMDeleteNotification();
					gcmPushDelete.notificationId = not.id;
					gcmPushDelete.send(deviceIdsToDelete);
				}
				if(!this.keepRemote && !localOnly){
					var gcmNotificationClear = new GCMNotificationClear();
					gcmNotificationClear.send(this,me.requestNotification.senderId);
				}else{
					console.log("keeping remote");
				}
				deleteIcon(this.notificationIcon);
				updateBadgeText();
				refreshNotificationsPopup();
			}
			not.announceNotificationHandled = function(info){
				info.notificationId = not.id;
				back.eventBus.post(new back.Events.NotificationHandled(info));
			}
			not.doAction = function(actionId, text, isReply){
				var notification = this;
				
				if(actionId == Constants.ACTION_DIALOG_NOTIFICATION){
					back.console.log("Showing notification in dialog");
					chrome.notifications.clear(notification.id, function(){});
					Dialog.showNotificationDialog({
					    notificationId:notification.id
					},{
					    shouldShow:true
					})();

					return;
				}
				if(actionId == REPLY_ACTION){
					var shouldPrompt = !notification.noPrompt;
					Promise.resolve()
					.then(Dialog.showNotificationReplyDialog(notification, shouldPrompt))
					.catch(UtilsObject.ignoreError).then(function(input){
						not.announceNotificationHandled({"replied":true});
						notification.doAction(notification.replyId, input, true);
					});
					return;
				}
				if(actionId == LOCAL_DISMISS){
					notification.cancel(false);
					return;
				}
				if(actionId == COPY_NUMBER){
					var matches = notification.text.match(regexNumbers);
					if(matches){
						Promise.resolve()
						.then(()=>{
							var removeLastDot = match => match.lastIndexOf(".") == match.length-1 ? match.substring(0,match.length-1) : match;
							if(matches.length == 1){
								return removeLastDot(matches[0]);
							}else{
								var items = matches.select(match => ( {"id":removeLastDot(match),"text":removeLastDot(match)}));
								return Dialog.showMultiChoiceDialog({
								    items:items,
								    title:"Which Number?"
								})();
							}
						})
						.then(result=>{
							if(result.id){
								return result.id;
							}else{
								return result;
							}
						})
						.then(number=>{
							directCopy(number);
							showNotification("Clipboard Set To Number", number,5000);
						});
					}else{
						showNotification("Couldn't copy number", notification.text,5000);
					}
					return;
				}
				if(notification.isSmsNotification(actionId)){
					if(text){
						var push = new back.GCMPush();
						push.smsnumber = notification.smsnumber;
						push.smstext = text;
						push.send(me.requestNotification.senderId)
						.then(result=>showNotification("Join",`Replied to ${notification.smsname}: ${text}`));						
					}else{					
						var number = notification.smsnumber;
						showSmsPopup(me.requestNotification.senderId,number,notification.smsname,isReply,notification.smstext);
						notification.cancel();
					}
					return;	
				}
				if(!actionId || (!text && isReply)){
					return;
				}
				var gcmParams = {};
				gcmParams[GCM_PARAM_TIME_TO_LIVE] = 0;
				var params = {};
				params.deviceIds = [me.requestNotification.senderId];
				params.senderId = localStorage.deviceId;
				params.actionId = actionId;
				params.appPackage = notification.appPackage;
				params.text = text;
				var gcm = {"requestNotification":params,"getCommunicationType":function(){return "GCMNotificationAction"}};
				new DeviceIdsAndDirectDevices(params.deviceIds).send(function(deviceIdsServer,callback, callbackError){
					params.deviceId = deviceIdsServer[0];
					doPostWithAuth(joinserver + "messaging/v1/doNotificationAction/",params,callback, callbackError);
				},gcm,gcmParams, function(result){
				  	if(result.success){
						console.log("Sent notification action: " + notification.id);
						var message = notification.actionDescription;
						if(!message){
							if(text && isReply){
								message = `Replied to ${notification.title}: ${text}`;
							}else{
								message = "Performed action remotely.";
							}
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
					showNotification("Join","Couldn't perform action: " + error);
					console.log("Error: " + error);
				});
				/*doPostWithAuth(joinserver + "messaging/v1/doNotificationAction/",{"actionId":actionId,"text":text,"deviceId":me.requestNotification.senderId,"appPackage":notification.appPackage}, function(result){
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
				});*/
			}
			if(!not.buttons){
				not.buttons = [];
			}
			var actionTexts = not.buttons.select(button=>button.text).join(", ");
			if(not.replyId){
				not.buttons.splice(0,0,{"text":Constants.REPLY_DIRECTLY,"icon":"/icons/reply.png","actionId":REPLY_ACTION});
				if(back.getAddDismissEverywhereButton()){
					actionTexts = "Reply" + (actionTexts.length>0 ? ", ": "") + actionTexts ;	
				}
			}
			if(back.getAddDismissEverywhereButton()){
				not.buttons.splice(0,0,{"text":"Dismiss Everywhere","icon":"/icons/close.png","actionId":LOCAL_DISMISS});
			}
			if(not.buttons.length>2){
				not.buttons.splice(0,0,{"text":actionTexts + "...","icon":"/icons/actions.png","actionId":Constants.ACTION_DIALOG_NOTIFICATION});
			}
			var chromeNotification = new ChromeNotification(not);
			var similar = notifications.getSimilarNotification(not);
			var removed = notifications.removeNotificationsWithSameId(not.id);
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
			if(not.priority >= 2){
				shouldNotify = true;
			}
			if(!not.date){
				not.date = Date.now();
			}
			var notificationNoPopupPackages = back.getNotificationNoPopupPackages().split("\n");
			if(notificationNoPopupPackages.indexOf(not.appPackage) >= 0){
				shouldNotify = false;
			}
			if(shouldNotify){
				chromeNotification.notify();
			}
			notifications.push(not);
			if(not.replyId){
				back.UtilsVoice.isMicAvailable()
				.then(()=>true)
				.catch(()=>false)
				.then(micAvailable=>{
					if(micAvailable){
						if(back.getVoiceEnabled() && back.getVoiceContinuous() && back.getVoiceWakeup()){						
							UtilsObject.doOnce("replywithvoicee",()=>showNotification("Reply With Voice",showNotification("Reply With Voice",`Say "${back.getVoiceWakeup()} reply with hello" for example to reply to this notification with your voice`,30000)));	
						}
						if(!back.getVoiceContinuous()){
							back.UtilsVoice.doVoiceCommand(devices)
							.catch(error=>back.console.log("Error with reply voice command: " + error));									
						}
					}else{
						UtilsObject.doOnce("replywithvoicenomiccc",()=>{
							var chromeNotification = new ChromeNotification({
								"id":"replyvoice",
								"title":"Did you know?",
								"text":"You can reply to notifications with your voice. Click here to allow Join to access your microphone",
								"url": "chrome-extension://flejfacjooompmliegamfbpjjdlhokhj/options.html"
							});
							chromeNotification.notify();
						})
					}
				});
				
			}
			notifications.sort(function(left,right){
				var leftPriority = left.priority;
				var rightPriority = right.priority;
				if(!leftPriority){
					leftPriority = 0;
				}
				if(!rightPriority){
					rightPriority = 0;
				}
				if(leftPriority || leftPriority == 0){
					leftPriority += 5;
				}
				if(rightPriority || rightPriority == 0){
					rightPriority += 5;
				}
				if(leftPriority && rightPriority){
					if(leftPriority > rightPriority){
						return -1;
					}else if(rightPriority > leftPriority){
						return 1;
					}else{
						return right.date - left.date;
					}
				}
				if(leftPriority){
					return -1;
				}
				if(rightPriority){
					return 1;
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
	if(notification && senderId){
		this.requestNotification = {notifications:[notification], senderId:senderId};
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
	var me = this;
	this.getCommunicationType = function() {
		return "GCMNewSmsReceived";
	}
	this.execute = UtilsObject.async(function* () {
		
		var SMSorMMS = "SMS";
		if(me.subject || me.attachmentPartId || me.number.indexOf(",")>-1 || me.urgent){
			SMSorMMS = "MMS";
		}
		var title = `New ${SMSorMMS} from ${me.name}`;
		/*var chromeNotification = new ChromeNotification({
				"id":"sms=:=" + me.senderId + "=:=" + me.number + "=:=" + me.text,
				"title":title,
				"text":me.text,"actionId":"newsms",
				"buttons":[{
					"text": Constants.REPLY_DIRECTLY,
					"icon": "icons/reply.png"
				}]
			});
		chromeNotification.notify(); */

		var not = {};
		not.id = back.UtilsSMS.getNotificationId(me.senderId, me.number);
		not.title= title;
		not.text = me.text;
		not.priority = 2;
		not.appName = "Join";
		not.replyId = SMS_ACTION_ID;
		not.noPrompt = true;
		not.actionDescription = "Sending SMS to " + me.name + "...";
		not.cancelOnAction = true;
		not.smsnumber = me.number;
		not.smsname = me.name;
		not.smstext = me.text;
		not.actionId = SMS_ACTION_ID;
		not.buttons = [];
		not.appIcon = me.photo || "/icons/contact.png";
		not.gcmDeleteOnCancel = true;
		if(me.attachmentPartId){
			var imageUrl = yield GoogleDriveManager.getDownloadUrlFromFileName(back.UtilsSMS.getAttachmentString(me.attachmentPartId));
			not.image = yield doGetBase64ImagePromise(imageUrl);
			back.UtilsSMS.setCachedAttachment(me.attachmentPartId,not.image);
		}
		if(me.text && me.text.match(regexNumbers)){
			not.buttons.push({
				text: "Copy Number",
				actionId: COPY_NUMBER
			});
		}
		var gcmNtification = new GCMNotification();
		gcmNtification.requestNotification = {notifications:[not], senderId:me.senderId};
		gcmNtification.execute();
		var sms = {
			"number":me.number,
			"sender":me.name,
			"text":me.text,
			"date":me.date,
			"received":true,
			"subject":me.subject,
			"urgent":me.urgent,
			"attachmentPartId":me.attachmentPartId, 
			"attachment":not.image
		};
		console.log(`Received ${SMSorMMS}`);
		console.log(sms);
		dispatch('smsreceived',{"sms":sms,"deviceId":me.senderId});

		back.eventBus.post(new back.Events.SMSReceived(sms,me.senderId));
				
		
	});
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
var GCMPhoneCall = function(){
    var PHONE_CALL_STATE_INCOMING_RECEIVED = 0;
    var PHONE_CALL_STATE_INCOMING_ANSWERED = 1;
    var PHONE_CALL_STATE_INCOMING_ENDED = 2;
    var PHONE_CALL_STATE_OUTGOING_STARTED = 3;
    var PHONE_CALL_STATE_OUTGOING_ENDED = 4;
    var PHONE_CALL_STATE_MISSED = 5;
	this.getCommunicationType = function() {
		return "GCMPhoneCall";
	}
	this.execute = function() {	
		if(!this.name){
			this.name = this.number;
		}
		var buttons = [];
		var title = null;
		var icon = null;
		if(this.state == PHONE_CALL_STATE_INCOMING_RECEIVED){
			title = "Incoming Call";
			buttons.push({
				text: "Hang Up",
				actionId: HANG_UP
			});
			icon = "icons/phone_incoming.png";
		}else if(this.state == PHONE_CALL_STATE_MISSED){
			title = "Missed Call";
			buttons.push({
				text: "Call Back",
				actionId: CALL_BACK + "=:=" + this.number
			});
			icon = "icons/phone_missed.png";
		}
		if(title){
			var not = {};
			not.senderId = this.senderId;
			not.id = this.senderId + this.number + "PHONE_CALL";
			not.title = title;
			not.text = this.name;
			not.appIcon = icon;
			not.priority = 2;
			not.appName = "Join";
			not.keepRemote = true;
			not.buttons = buttons;
			not.cancelOnAction = false;			
			var gcmNotification = new GCMNotification(not,this.senderId);			
			gcmNotification.execute();
		}
		
	}
}
GCMPhoneCall.prototype = new GCM();
var GCMRequestFile = function(){
	this.getCommunicationType = function() {
		return "GCMRequestFile";
	}
}
GCMRequestFile.prototype = new GCM();

var GCMStatus = function(){
	var me = this;
	this.getCommunicationType = function() {
		return "GCMStatus";
	}
	this.execute = function() {
		if(me.request || !me.deviceId || !me.status){
			return
		}
		console.log("New Status response");
		console.log(me);
		back.eventBus.post(new back.Events.StatusReceived(me));
		//handlePendingRequest(this,this.requestId);

	}
}
GCMStatus.prototype = new GCMGenericPush();
var GCMChangeSetting = function(){
	var me = this;
	this.getCommunicationType = function() {
		return "GCMChangeSetting";
	}
	this.execute = function() {	
		console.log("Can't change settings in Chrome yet...");
	}
}
GCMChangeSetting.prototype = new GCMGenericPush();
var GCMDeleteNotification = function(){
	var me = this;
	this.getCommunicationType = function() {
		return "GCMDeleteNotification";
	}
	this.execute = function() {	
		if(!this.notificationId){
			return;
		}
		var notificationToCancel = notifications.first(n=>n.id==this.notificationId);
		if(!notificationToCancel){
			return;
		}
		notificationToCancel.cancel();
	}
}
GCMDeleteNotification.prototype = new GCMGenericPush();

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
