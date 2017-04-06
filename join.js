chrome.commands.onCommand.addListener(function(command) {
	console.log('Command:', command);
	if(command == "popup"){
		createPushClipboardWindowAndCloseAfterCommand();
	}else if(command == "repeat-last-command"){
		repeatLastCommand();
	}else if(command == "favorite-command"){
		var favoriteCommand = getFavoriteCommand();
		favoriteCommand = deviceCommands.first(function(command){return command.label == favoriteCommand;});
		var favoriteCommandDevice = getFavoriteCommandDevice();
		if(favoriteCommand && favoriteCommandDevice){
			favoriteCommand.func(favoriteCommandDevice, true,getFavoriteCommandText());
		}
	}else if(command == "notifications-popup"){
		showNotificationsPopup();
	}else if(command == "voice-command"){
		if(!getVoiceEnabled()){
			return;
		}
		if(back.UtilsVoice.voiceRecognizer != null && back.UtilsVoice.voiceRecognizer.getAlwaysListeningEnabled()){
			back.console.log("Not starting because it's on continuous");
			return;
		}
		UtilsVoice.doVoiceCommand(devices,prompt=>showNotification("Join",prompt))
		/*.then(result=>{
			result.command.func(result.device.deviceId,true,result.parameters.input);
		})*/
		.catch(error=>{
			showNotification("Join Voice Command",`Error recognizing: ${error}`);
			console.log("Error recognizing!")
			console.log(error);
		});
	}
});
var repeatLastCommand = function(){	
	if(localStorage["lastpush"]){
		window[localStorage["lastpushtype"]](localStorage["lastpush"], true);
	}else{
		createPushClipboardWindowAndCloseAfterCommand();
	}
}
var getNotificationPopupHeight = function(){
	var height = Math.min(Math.round((203 * notifications.length) + 80), screen.height * 0.75);
	if(notifications.length == 0){
		height = 150;
	}
	return height;
}
var getNotificationPopupWidth = function(){
	return 375;
}
var notificationsWindow = null;
var showNotificationsPopup = function(tab){
	if(!tab){
		tab = "notifications";
	}
	if(notificationsWindow != null){
		return;
	}
	var height = getNotificationPopupHeight();
	var width = getNotificationPopupWidth();
	chrome.windows.create({"focused":false, url: 'devices.html?tab='+tab+'&closeOnEmpty=true', type: 'popup' , left: screen.width - width, top: Math.round((screen.height / 2) - (height /2)), width : width, height: height},function(win){
			notificationsWindow = win;
	});
}
var createPushClipboardWindowAndCloseAfterCommand = function(){
    createPushClipboardWindow(null,null,null,true);
}
var createPushClipboardWindow = function(tab,params,paramsIfClosed,closeAfterCommand){
	if(!tab){
		tab = "devices";
	}
	var url = 'devices.html?tab='+ tab+'&popup=1' + (closeAfterCommand ? '&closeAfterCommand=1' : '');
	if(params){
		var addParams = function(params){
			if(!params){
				return;
			}
			for(var prop in params){
				var value = params[prop];
				if(value){
					url += "&" + prop + "=" + encodeURIComponent(value);
				}
			}
		}
		addParams(params);
		if(!popupWindowClipboard){
			addParams(paramsIfClosed);
		}
	}
	if(!devices || devices.length == 0){
		alert("Join doesn't have any other devices available to send stuff to. Please log in on the same account on other devices to make them appear here.");
		return;
	}
	if(popupWindowClipboard){
		var tab = popupWindowClipboard.tabs[0];
		chrome.tabs.update(tab.id,{"url":url});
		chrome.windows.update(popupWindowClipboardId,{"focused":true});
	}else{
		/*var height = Math.min(Math.round((88 * devices.length) + 100), screen.height * 0.75);
		height = Math.max(height, (deviceCommands.length * 25) + 100);*/
		var width = parseInt(localStorage.popoutWidth);
        if(!width){
            width = 456;
        }
		var height = parseInt(localStorage.popoutHeight);
        if(!height){
            height = 606;
        }
		chrome.windows.create({ url: url, type: 'popup' , left: screen.width - 230, top: Math.round((screen.height / 2) - (height /2)), width : width, height: height},function(clipboardWindow){
				popupWindowClipboard = clipboardWindow;
				popupWindowClipboardId = clipboardWindow.id;
		});
	}
}
var popupWindowClipboard = null;
var popupWindowClipboardId = null;
chrome.windows.onRemoved.addListener(function(windowId) {
  // If the window getting closed is the popup we created
  if (windowId === popupWindowClipboardId) {
	// Set popupId to undefined so we know the popups not open
	popupWindowClipboard = null;
  }
});

var clipboardWindows = [];
var clearClipboardWindows = function(){
	for (var i = 0; i < clipboardWindows.length; i++) {
		var win = clipboardWindows[i];
		chrome.windows.remove(win.id);
	};
	clipboardWindows = [];
}
var getToken = function(callback, token){
	getAuthToken(callback, false, token);
	/*chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
		callback(token);
	});*/
}
var isDoingAuth = false;
var waitingForAuthCallbacks = [];
/*var getAuthToken = function(callback, selectAccount){
	if(selectAccount){
		removeAuthToken();
	}
	//removeAuthToken();
	if(localStorage.accessToken && localStorage.authExpires && new Date(new Number(localStorage.authExpires)) > new Date()){
		if(callback){
			callback(localStorage.accessToken);
		}
	}else{
		if(!isDoingAuth){
			isDoingAuth = true;
			var url = getAuthUrl(selectAccount);
			chrome.identity.launchWebAuthFlow({'url': url, 'interactive': true},function(redirect_url) {
				var token = null;
				if(redirect_url){
					token = getAuthTokenFromUrl(redirect_url);
					var expiresIn = new Number(getURLParameter(redirect_url,"expires_in"));
					localStorage.authExpires = new Date().getTime() + ((expiresIn - 120) * 1000);
					localStorage.accessToken = token;
					console.log(token+":"+expiresIn);
				}
				if(callback){
					callback(token);
				}
				waitingForAuthCallbacks.doForAll(function(waitingCallback){
					waitingCallback(token)
				});
				waitingForAuthCallbacks = [];
				isDoingAuth = false;
			});
		}else{
			if(callback){
				waitingForAuthCallbacks.push(callback);
			}
		}
	}
}*/
var getAuthTokenBackground = function(callback,selectAccount){
	if(isLocalAccessTokenValid()){
		if(callback){
			callback(localStorage.accessToken)
		}
		return;
	}
	var authUrl = getAuthUrl(selectAccount,true);
	if(localStorage.userinfo){
		var userinfo = JSON.parse(localStorage.userinfo);
		if(userinfo.email){
				authUrl += "&login_hint="+ userinfo.email;
		}
	}
	fetch(authUrl,{"redirect": 'manual',"credentials": 'include'}).then(function(response) {
	  return response.text();
	}).then(function(response) {
		var tokenIndex = response.indexOf("access_token=");
		if(tokenIndex > 0){
			var token = response.substring(tokenIndex + 13)
			token = token.substring(0, token.indexOf("&"))
			var expiresIn = response.substring(response.indexOf("expires_in=") + 11);
			expiresIn = expiresIn.substring(0, expiresIn.indexOf("\""));
			setLocalAccessToken(token,expiresIn);
			console.log(token);
			console.log(expiresIn);
			if(callback){
				callback(token);
			}
		}else{
			getAuthTokenFromTab(callback,selectAccount);
		}
	}).catch(function(error) {
		console.log('There has been a problem with your fetch operation: ' + error.message);

		if(callback){
			callback(null);
		}
	});
}
var authTabId = null;
var isLocalAccessTokenValid = function(){
	return localStorage.accessToken && localStorage.authExpires && new Date(new Number(localStorage.authExpires)) > new Date();
}
var setLocalAccessToken = function(token, expiresIn){
	localStorage.authExpires = new Date().getTime() + ((expiresIn - 120) * 1000);
	localStorage.accessToken = token;
}
var getAuthTokenFromTab = function(callback,selectAccount){

	if(selectAccount){
		removeAuthToken();
	}
	//removeAuthToken();
	if(isLocalAccessTokenValid()){
		if(callback){
			callback(localStorage.accessToken);
		}
	}else{
		var focusOnAuthTabId = function(){
			if(authTabId){
				chrome.tabs.update(authTabId,{"active":true});
				if(!localStorage.warnedLogin){
					localStorage.warnedLogin = true;
					alert("Please login to use Join");
				}
			}else{
				//alert("Something went wrong. Please reload the Join extension.");
			}
		}
		if(!isDoingAuth){
			isDoingAuth = true;
			var url = getAuthUrl(selectAccount);

			if(localStorage.userinfo){
				var userinfo = JSON.parse(localStorage.userinfo);
				if(userinfo.email){
						url += "&login_hint="+ userinfo.email;
				}
			}
			var closeListener = function(tabId,removeInfo){
				 if(authTabId && tabId == authTabId){
					finisher(tabId);
				 }
			}
			var authListener = function(tabId,changeInfo,tab){
				if(tab.url && tab.url.indexOf(getCliendId())>0){
					authTabId = tabId;
					focusOnAuthTabId();
				}
				if(tab && tab.url && tab.url.indexOf(AUTH_CALLBACK_URL) == 0){
					var redirect_url = tab.url;
					var token = getAuthTokenFromUrl(redirect_url);
					finisher(tabId,token,redirect_url);
				}
			}
			var finisher = function(tabId,token,redirect_url){
				authTabId = null;
				chrome.tabs.onUpdated.removeListener(authListener);
				chrome.tabs.onRemoved.removeListener(closeListener);
				console.log("Auth token found from tab: " + token);
				chrome.tabs.remove(tabId);
				var finshCallback = function(token){
					if(callback){
						callback(token);
					}
					waitingForAuthCallbacks.doForAll(function(waitingCallback){
						waitingCallback(token)
					});
					waitingForAuthCallbacks = [];
					isDoingAuth = false;
				}
				if(token && redirect_url){
					var expiresIn = new Number(getURLParameter(redirect_url,"expires_in"));
					setLocalAccessToken(token,expiresIn);
					console.log("Token expires in " + expiresIn + " seconds");
					getUserInfo(function(userInfoFromStorage){
						console.log("Logged in with: " + userInfoFromStorage.email);
						finshCallback(token);
					},true,token);
				}else{
				   finshCallback(null);
				}

			}
			chrome.tabs.onUpdated.addListener(authListener);
			chrome.tabs.onRemoved.addListener(closeListener)
			openTab( url ,{selected: false,active:false},function(tab){
				console.log("Tab auth created");
				console.log(tab);
			});
		}else{
			if(callback){
				waitingForAuthCallbacks.push(callback);
				focusOnAuthTabId();
			}
		}
	}
}
var getAuthTokenFromChrome = function(callback){

}
var getAuthTokenPromise =function(selectAccount, token){
    return new Promise(function(resolve){
        getAuthToken(resolve, selectAccount, token);
    });
}
var getAuthToken = function(callback, selectAccount, token){
	if(token){
		if(callback){
			callback(token);
		}
		return;
	}
	if(selectAccount){
		getAuthTokenFromTab(callback,selectAccount);
		return;
	}
	chrome.identity.getProfileUserInfo(function(userInfoFromChrome){
		if(!userInfoFromChrome.email){
			getAuthTokenFromTab(callback,selectAccount);
			return;
		}
		if(localStorage.userinfo){
			var userInfoFromStorage = JSON.parse(localStorage.userinfo);
			if(userInfoFromStorage.email && userInfoFromStorage.email != userInfoFromChrome.email){
				getAuthTokenBackground(callback,selectAccount);
				return;
			}
		}
		chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
			if(callback){
				callback(token);
			}
		});

	});

}
var getAuthTokenFromUrl =function(url){
	if(url.indexOf("#access_token=")>0){
		return url.substring(url.indexOf("#")+"#access_token=".length,url.indexOf("&"));
	}
}
var removeAuthToken = function(callback){
	delete localStorage.accessToken;
	delete localStorage.authExpires;
	delete localStorage.userinfo;
}

/*var doRequestWithAuth = function(method, url,content, callback, callbackError, isRetry, token) {
	getToken(function(token) {
		if(token == null){
			if (callbackError != null) {
				callbackError("noauth");
			}
		}else{

			var contentClass = toClass.call(content);
			var isFileOrForm = contentClass == "[object File]" || contentClass == "[object FormData]";
			var authHeader = "Bearer " + token;
			//console.log("authHeader: " + authHeader);
			console.log("Posting to: " + url);
			var req = new XMLHttpRequest();
			req.open(method, url, true);
			req.setRequestHeader("authorization", authHeader);
			if(content){
				if(!isFileOrForm){
					req.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
				}
			}
			req.onload = function() {
				console.log("POST status: " + this.status);
				var result = {};
				if(this.responseText){
                    try{
    					result = JSON.parse(this.responseText)
                    }
                    catch(err) {
                        result = this.responseText;
                    }
				}
				if(!isRetry && result.userAuthError){
					console.log("Retrying with new token...");
					removeCachedAuthToken(function(){
						doRequestWithAuth(method, url,content, callback, callbackError, true);
					})
				}else{
					if (callback != null) {
						callback(result);
					}
				}
			}
			req.onerror = function(e) {
				if (callbackError != null) {
					callbackError(e.currentTarget);
				}
			}
			var contentString = null;
			if(content){
				if(isFileOrForm){
					contentString = content;
				}else{
					contentString = JSON.stringify(content);
				}
			}
            try{
                req.send(contentString);
            }catch(error){
                if (callbackError != null) {
                    callbackError(error);
                }
            }
		}
	},token);
}
var doPostWithAuth = function(url,content, callback, callbackError) {
    doRequestWithAuth("POST",url,content,callback,callbackError);
}
var doPostWithAuthPromise = function(url,content) {
    return new Promise(function(resolve,reject){
        doPostWithAuth(url,content,resolve,reject);
    });
}
var doPutWithAuth = function(url,content, callback, callbackError) {
    doRequestWithAuth("PUT",url,content,callback,callbackError);
}
var doPutWithAuthPromise = function(url,content) {
    return new Promise(function(resolve,reject){
        doPutWithAuth(url,content,resolve,reject);
    });
}
var doDeleteWithAuth = function(url,content, callback, callbackError) {
	doRequestWithAuth("DELETE",url,content,callback,callbackError);
}
var doGetWithAuth = function(url, callback, callbackError,token) {
	doRequestWithAuth("GET",url,null,callback,callbackError,false, token);
}
var doGetWithAuthPromise = function(url,token) {
    return new Promise(function(resolve,reject){
        doGetWithAuth(url,resolve,reject,token);
    });
}*/
var doGetWithAuthAsyncRequest = function(endpointRequest, endpointGet, deviceId, callback, callbackError) {
	doRequestWithAuth("GET",joinserver + "messaging/v1/" + endpointRequest + "?deviceId=" + deviceId,null,function(response){
		var requestId = response.requestId;
		if(requestId){
			doGetWithAuthAsyncRequestGetResponse(joinserver + "messaging/v1/" + endpointGet + "?requestId=" + requestId,callback,callbackError);
		}else{
			callbackError({"error":"didn't get request id"});
		}
	},callbackError);
}
var doGetWithAuthAsyncRequestGetResponse = function(urlGet, callback, callbackError,count) {
	if(count > 5){
		callbackError({"error":"couldn't contact device"});
		return;
	}
	setTimeout(function(){
		if(!count){
			count = 0;
		}
		doRequestWithAuth("GET",urlGet,null,function(responseGet){
			if(responseGet.responseAvailable){
				callback(responseGet);
			}else{
				doGetWithAuthAsyncRequestGetResponse(urlGet,callback,callbackError,++count);
			}
		},callbackError);
	},2000);

}


var getURLParameter = function(url,name) {
	if(url == null){
		url = window.location.href;
	}
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url)||[,""])[1].replace(/\+/g, '%20'))||null
}
var removeCachedAuthToken = function(callback){
	removeAuthToken();
	if(callback){
		callback();
	}
	/*chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
		chrome.identity.removeCachedAuthToken({ 'token': token }, function(){
				console.log("cached token removed");
				if(callback){
					callback();
				}
		});
	});*/
}



/****************************OPTIONS********************************/
var getOptionType = function(option){
	if(option.attributes.type){
		return option.attributes.type.textContent;
	}else{
		return option.localName;
	}
}
var getOptionDelayed = function(option){
	if(option.attributes.delayed){
		return true;
	}else{
		return false;
	}
}
var isOptionUndefined = function(value){
	return !value || value == "undefined" || value == "null" || value == "";
}
var optionSavers = [
	{
		"type":"text",
		"saveevent":"keyup",
		"save": function(option){
			localStorage[option.id] = option.value;
		},
		"load":function(option){
			option.value = this.getValue(option,getDefaultValue(option));
		},
		"getValue":function(option, defaultValue){
			var id = null;
			if(typeof option == "string"){
				id = option;
			}else{
				id = option.id;
			}
			var value = localStorage[id];
			if(isOptionUndefined(value)){
				if(!defaultValue){
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id,defaultValue);
			}
			return value;
		},"setDefaultValue" :function(option){
			if(!option.value){
			   var defaultValue =  getDefaultValue(option);
			   if(!isOptionUndefined(defaultValue)){
				   option.value = defaultValue;
			   }
		   }

		}
	},
	{
		"type":"textarea",
		"saveevent":"keyup",
		"save": function(option){
			localStorage[option.id] = option.value;
		},
		"load":function(option){
			option.value = this.getValue(option,getDefaultValue(option));
		},
		"getValue":function(option, defaultValue){
			var id = null;
			if(typeof option == "string"){
				id = option;
			}else{
				id = option.id;
			}
			var value = localStorage[id];
			if(isOptionUndefined(value)){
				if(!defaultValue){
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id,defaultValue);
			}
			return value;
		},"setDefaultValue" :function(option){
			if(!option.value){
			   var defaultValue =  getDefaultValue(option);
			   if(!isOptionUndefined(defaultValue)){
				   option.value = defaultValue;
			   }
		   }

		}
	},{
		"type":"checkbox",
		"saveevent":"click",
		"save": function(option,value){
			var id = null;
			if(typeof option == "string"){
				id = option;
			}else{
				id = option.id;
				value = option.checked;
			}
			localStorage[id] = value;
			var onSaveFunc = window["on" + id + "save"];
			if(onSaveFunc){
				onSaveFunc(option, value);
			}
		},
		"load":function(option){
			option.checked = this.getValue(option,getDefaultValue(option));
		},
		"getValue":function(option,defaultValue){
			var id = null;
			if(typeof option == "string"){
				id = option;
			}else{
				id = option.id;
			}
			var value = localStorage[id];
			if(isOptionUndefined(value)){
				value = defaultValue;
				this.save(id,defaultValue);
			}else if(value == "false"){
				value = false;
			}else{
				value = true;
			}
			return value;
		},"setDefaultValue" :function(option){
			if(this.getValue(option,null) == null){
				var defaultValue = getDefaultValue(option);
				option.checked = defaultValue;
			}
		}
	}, {
		"type":"select",
		"saveevent":"change",
		"save": function(option){
			localStorage[option.id] = option.value;
		},
		"load":function(option){
			option.value = this.getValue(option,getDefaultValue(option));
			if(option.funcOnChange){
				option.funcOnChange();
			}
		},
		"getValue":function(option, defaultValue){
			var id = null;
			if(typeof option == "string"){
				id = option;
			}else{
				id = option.id;
			}
			var value = localStorage[id];
			if(isOptionUndefined(value)){
				if(!defaultValue){
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id,defaultValue);
			}
			return value;
		},"setDefaultValue" :function(option){
			if(!option.value){
			   var defaultValue =  getDefaultValue(option);
			   if(!isOptionUndefined(defaultValue)){
				   option.value = defaultValue;
			   }
		   }

		}
	}
];
var getOptionSaver = function(option){
	for (var i = 0; i < optionSavers.length; i++) {
		var optionSaver = optionSavers[i];
		var type = typeof option == "string" ? option : getOptionType(option);
		if(optionSaver.type == type)
		{
			return optionSaver;
		}
	}
}

var deviceSufix = "=:=DeviceAutoClipboard=:=";
var getDeviceIdsToSendAutoClipboard = function(){
	var deviceIds = [];
	for (var i = 0; i < devices.length; i++) {
		var device = devices[i];
        if(device.deviceId == localStorage.deviceId){
            continue;
        }
        if(UtilsDevices.isDeviceGroup(device) || UtilsDevices.isDeviceShare(device)){
            continue;
        }
		var key = device.deviceId + deviceSufix;
		var enabled = localStorage[key] == null || localStorage[key] == "true";
		if(enabled){
			deviceIds.push(device.deviceId);
		}
	};
	return deviceIds;
}

var getOptionValue = function(type, id, defaultValue){
    if(!defaultValue){
        defaultValue = getDefaultValue(id);
    }
    var optionSaver = getOptionSaver(type);
    return optionSaver.getValue(id,defaultValue);
}
var saveOptionValue = function(type, id, value){
    var optionSaver = getOptionSaver(type);
    return optionSaver.save(id,value);
}
var getDownloadScreenshotsEnabled = function(){
	return getOptionValue("checkbox","downloadscreenshots");
}
var getOpenLinksEnabled = function(){
	return getOptionValue("checkbox","autoopenlinks");
}
var getDownloadVideosEnabled = function(){
	return getOptionValue("checkbox","downloadvideos");
}
var get12HourFormat = function(){
	return getOptionValue("checkbox","12hrformat");
}
var getAutoClipboard = function(){
	return getOptionValue("checkbox","autoclipboard");
}
var getClipboardNotificationShowContents = function(){
	return getOptionValue("checkbox","clipboardnotificationshowcontents");
}
var getAutoClipboardNotification = function(){
	return getOptionValue("checkbox","autoclipboardnotification");
}
var getFavoriteCommand = function(){
	return getOptionValue("select","select_favourite_command");
}
var getFavoriteCommandDevice = function(){
	return getOptionValue("select","select_favourite_command_device");
}
var getNotificationSeconds = function(){
    return getOptionValue("text","notificationseconds");
}
var getNotificationRequireInteraction = function(){
    return getOptionValue("checkbox","notificationrequireinteraction");
}
var getAddDismissEverywhereButton = function(){
    return getOptionValue("checkbox","adddimisseverywherebutton");
}
var getBetaEnabled = function(){
    return getOptionValue("checkbox","showbetafeatures");
}
var getNotificationSound = function(){
	return getOptionValue("text","notificationsound");
}
var getNotificationWebsites = function(){
	return getOptionValue("textarea","notificationwebsites");
}
var getNotificationNoPopupPackages = function(){
	return getOptionValue("textarea","notificationnopopuppackages");
}
var getShowChromeNotifications = function(){
    return getOptionValue("checkbox","chromenotifications");
}
var setShowChromeNotifications = function(value){
    saveOptionValue("checkbox","chromenotifications",value);
}
var getPrefixTaskerCommands = function(){
	return getOptionValue("checkbox","prefixtaskercommands");
}
var getHideNotificationText = function(){
	return getOptionValue("checkbox","hidenotificationtext");
}
var getPlayNotificationSound = function(){
	return getOptionValue("checkbox","playnotificationsound");
}
var getAlternativePopupIcon = function(){
	return getOptionValue("checkbox","alternativeicon");
}
var getShowInfoNotifications = function(){
	return getOptionValue("checkbox","showinfonotifications");
}
var getEventghostPort = function(){
	return getOptionValue("text","eventghostport");
}
var getFavoriteCommandText = function(){
	return getOptionValue("text","text_favourite_command");
}
var getVoiceEnabled = function(){
	return getOptionValue("checkbox","voiceenabled");
}
var getVoiceContinuous = function(){
	return getOptionValue("checkbox","voicecontinuous");
}
var getVoiceWakeup = function(){
	return getOptionValue("text","voicewakeup");
}
var onvoiceenabledsave = UtilsObject.async(function* (option, value){
	if(!option){
		return;
	}
	if(!option.ownerDocument){
		return;
	}
	var continuousOption = option.ownerDocument.querySelector("#voicecontinuous");
	var continuousSection = option.ownerDocument.querySelector("#continuoussection");
	if(!value){
		setVoiceContinuous(false);
		continuousOption.checked = false;
		continuousSection.classList.add("hidden");	
	}else{
		continuousSection.classList.remove("hidden");	
	}
});
var setVoiceContinuous = function(enabled){
    saveOptionValue("checkbox","voicecontinuous",enabled);
}
var onvoicecontinuoussave = UtilsObject.async(function* (option, value){
    console.log("Continuous: " + value);
    var callbackPromptFunc =  (prompt, notificationTime)=>{
    	return new Promise(function(resolve,reject){
			if(UtilsObject.isString(prompt)){
				chrome.tts.speak(prompt,{
					"lang": 'en-US',
					"onEvent": function(event){
						if(event.type == 'end' || event.type == 'error'|| event.type == 'interrupted'|| event.type == 'cancelled'){
							resolve();
						}
					}
				});
				showNotification("Voice",prompt,notificationTime);	
			}else{
				console.error("Prompt is not text");
				console.error(prompt);
			}
    	});
	};
	var errorFunc = error=>{
		callbackPromptFunc(error,10000);
	};
	if(value){
		try{
			yield UtilsVoice.voiceRecognizer.isMicAvailable();
		}catch(error){
    		setVoiceContinuous(false);
			chrome.tts.speak("Click the generated notification to enable your mic");
			var chromeNotification = new ChromeNotification({
				"id":"micnotavailable",
				"title":"Error",
				"text":"Click here to allow Join to access your microphone",
				"url": "chrome-extension://flejfacjooompmliegamfbpjjdlhokhj/options.html"
			});
			chromeNotification.notify();
		}
	}
	UtilsVoice.toggleContinuous(()=>devices, getVoiceWakeup, getVoiceContinuous, callbackPromptFunc,null,errorFunc);
});
var onautoclipboardsave = function(option, value){
    console.log("Auto clipboard: " + value);
    if(handleAutoClipboard){
        handleAutoClipboard();   
    }
}
var onchromenotificationssave = function(option, value){
    console.log("Changed chrome notification popup setting: " + value);
    contextMenu.update(devices);
}
var onshowbetafeaturessave = function(option, value){
	if(!option){
		return;
	}
	if(!option.ownerDocument){
		return;
	}
    back.console.log("Changed beta setting: " + value);
    option.ownerDocument.location.reload();
}
var getDefaultValue = function(option){
	var id = null;
	if(typeof option == "string"){
		id = option;
	}else{
		id = option.id;
	}
	return defaultValues[id];
}
var defaultValues = {
	"downloadscreenshots": true,
	"downloadvideos":false,
	"12hrformat":false,
	"autoclipboard":false,
	"clipboardnotificationshowcontents":true,
	"autoclipboardnotification":true,
	"chromenotifications":true,
	"notificationwebsites":JSON.stringify(notificationPages,null,1),
	"notificationnopopuppackages":"",
	"prefixtaskercommands":false,
	"hidenotificationtext": false,
	"playnotificationsound": true,
    "showinfonotifications": true,
    "autoopenlinks": true,
    "notificationrequireinteraction": false,
    "adddimisseverywherebutton": true,
    "showbetafeatures": false,
    "voiceenabled": false,
    "voicecontinuous": false,
    "voicewakeup": "computer"
};
if(getVoiceContinuous()){
	onvoicecontinuoussave(null,true);
}
//setShowChromeNotifications(true);
/******************************************************************************/

/*************************************************************************************/

/**************************************************************************************/
setPopupIcon(getAlternativePopupIcon());
var popupWindow = null;
updateBadgeText();
var refreshNotificationsPopup = function(){

	updateBadgeText();
	dispatch("notificationsupdated");
	/*if(popupWindow){
		try{
			popupWindow.writeNotifications();
		}catch(e){
			popupWindow = null;
		}
	}*/
}
var refreshDevicesPopup = function(){
	dispatch("devicesupdated");
	/*if(popupWindow){
		try{
			popupWindow.writeDevices();
		}catch(e){
			popupWindow = null;
		}
	}*/
}
var pendingRequests = [];
var RequestFile = function(requestType){
	this.senderId = localStorage.deviceId;
	this.requestType = requestType;
	this.send = function(deviceId, callback, download, keepPendingRequest){
		var params = this.getParams();
		if(typeof deviceId == "string"){
			if(!deviceId){
				callback(null);
				return;
			}
			params.deviceId = deviceId;
		}else{
			if(!deviceId || deviceId.length==0){
				callback(null);
				return;
			}
			params.deviceIds = deviceId;
		}
		doPostWithAuth(joinserver + "requestfile/v1/request/",params, function(result){
            if(!result.success){
                showNotification("Can't request file",result.errorMessage);
                return;
            }
			pendingRequests.push({"requestId":result.requestId,"callback":callback,"download":download,"keep":keepPendingRequest});
			console.log("Added pending request: " + result.requestId);
		},function(error){
			console.log("Error: " + error);
		});
	}
}
RequestFile.prototype = new Request();
function downloadFile(fileId, callback) {
  if (fileId) {
	getToken(function(accessToken){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', "https://www.googleapis.com/drive/v2/files/" + fileId + "?alt=media");
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.onload = function() {
		  callback(xhr.responseText);
		};
		xhr.onerror = function() {
		  callback(null);
		};
		xhr.send();
	});

  } else {
	callback(null);
  }
}
/**************************************************************************************/

var resetNotifications = function(){
	notifications = new Notifications();
	updateBadgeText();
}
var getNotifications = function(callback){
	resetNotifications();
	var requestId = guid();
	var gcm = new GCMRequestNotifications();
	gcm.requestId = requestId;
	var deviceIds = devices.select(function(device){return device.deviceId;});
	if(!deviceIds || deviceIds.length == 0){
		callback(notifications);
		return;
	}
	pendingRequests.push({"requestId":requestId,"callback":function(result){
		callback(notifications);
		console.log(result);
	}});
	gcm.send(deviceIds);
	console.log("Requested notifications from: ");
	console.log(deviceIds);
}
var pushClipboard = function(deviceId, notify){
	getClipboard(function(clipboardData){
		var push = new GCMPush();
		push.clipboard = clipboardData;
        push.send(deviceId,function(){
            if(notify){
                showNotification("Join","Sent Clipboard");
            }
        },function(error){
            showNotification("Couldn't send clipboard", error);
        });
		setLastPush(deviceId, "pushClipboard");
		
	});
}
var openClipboard = function(deviceId, notify){
	getClipboard(function(clipboardData){
		var push = new GCMPush();
		push.files = [clipboardData];
        push.send(deviceId,function(){
            if(notify){
                showNotification("Join","Sent Clipboard to open");
            }
        },function(error){
            showNotification("Couldn't send", error);
        });
		setLastPush(deviceId, "openClipboard");
	});
}
var findDevice = function(deviceId, notify, ignorePrompt){
	if(!ignorePrompt && !confirm("This will make your phone play your default ringtone at full volume. Are you sure?")){
		return;
	}
	var push = new GCMPush();
	push.find = true;
	push.send(deviceId,function(){
        if(notify){
            showNotification("Join","Device will now ring...");
        }
    },function(error){
        showNotification("Couldn't ring device", error);
    });
	setLastPush(deviceId, "findDevice");
	
}
var getClipboardPush = function(text){    
    var push = new GCMPush();
    push.clipboard = text;
    return push;
}
var sendPushToDeviceId = function(deviceId){    
    return function(push){
        return push.send(deviceId);
    }
}
var setLastPushAndNotify = function(deviceId, notify, functionName, notificationMessage){    
    return function(result){
        setLastPush(deviceId, functionName);
        if(notify){
            showNotification("Join",notificationMessage);
        }
    }
}
var writeText = UtilsObject.async(function* (deviceId, notify, text){
	if(!text || (typeof text) != "string"){
		text = yield Dialog.showInputDialog({
	        title:"Text to write",
	        placeholder:"Type some text"
	    })();
	}
	var push = getClipboardPush(text);
	var pushResult = yield push.send(deviceId);
	setLastPushAndNotify(deviceId, notify, "writeText",`Wrote ${text}`)();
	
});
var requestLocation = function(deviceId, notify){
	var push = new GCMPush();
	push.location = true;
	push.send(deviceId,function(){
        if(notify){
            showNotification("Join","Requested location...");
        }
    },function(error){
        showNotification("Couldn't locate device", error);
    });
	setLastPush(deviceId, "requestLocation");
}
var doRequestFile = function(deviceId, notify, requestType, funcName, notificationText, startText){
	if(notify){
        if(!startText){
            startText = "Getting "+ notificationText + "...";
        }
		showNotification("Join", startText);
	}
	var requestFile = new RequestFile(requestType);
	requestFile.send(deviceId, function(responseFile){
		var url = responseFile.viewUrl;
		if(getDownloadScreenshotsEnabled()){
			url = responseFile.downloadUrl;
		}
		openTab(url);
		showNotification("Join", "Got "+notificationText+"!");
	});
	setLastPush(deviceId, funcName);
}
var getScreenshot = function(deviceId, notify){
    doRequestFile(deviceId, notify, REQUEST_TYPE_SCREENSHOT,"getScreenshot","screenshot");
}
var getScreenCapture = function(deviceId, notify){
    doRequestFile(deviceId, notify, REQUEST_TYPE_VIDEO,"getScreenCapture","screen capture","Toggling screen capture...");
}
var renameDevice = function(deviceId, notify){
	var device = devices.first(function(device){return device.deviceId == deviceId;});
	if(!device){
		return;
	}
	var oldName = device.deviceName;
    return Promise.resolve()
    .then(Dialog.showInputDialog({
            title:"What do you want to name " + device.deviceName + "?",
            text: device.deviceName,
            placeholder:"Device Name"
    }))
    .then(function(confirm){
        if(confirm){
            doPostWithAuth(joinserver + "registration/v1/renameDevice/?deviceId="+deviceId+"&newName="+encodeURIComponent(confirm),{"deviceId":deviceId,"newName":confirm}, function(result){
              console.log(result);
             
              var device = devices.first(function(device){
                return device.deviceId == deviceId;
              });
               if(!result.success){
                showNotification("Couldn't rename " + device.deviceName, result.errorMessage);
                return;
              }
              device.deviceName = confirm;
              setDevices(devices);
              refreshDevicesPopup();
              if(showNotification){
                showNotification("Renamed",oldName + " renamed to " +confirm);
              }
            },function(error){
                console.log("Error: " + error);
                showNotification("Error renaming",error);
            });
        }
    }).catch(UtilsObject.ignoreError);	
}
var deleteDevice = function(deviceId, notify){
	var device = devices.first(function(device){return device.deviceId == deviceId;});
	if(!device){
		return;
	}
	var confirm = window.confirm("Are you sure you want to delete " + device.deviceName + "?");
	if(confirm){
		doPostWithAuth(joinserver + "registration/v1/unregisterDevice/?deviceId="+deviceId,{"deviceId":deviceId}, function(result){
		  console.log(result);
		  devices.removeIf(function(device){
			return device.deviceId == deviceId;
		  });
		  setDevices(devices);
		  refreshDevicesPopup();
		  if(showNotification){
			showNotification("Deleted",device.deviceName + " deleted.");
		  }
		},function(error){
			console.log("Error: " + error);
			showNotification("Error deleting",error);
		});
	}
}
var noteToSelf = UtilsObject.async(function* (deviceId, notify, text){	
		var noteText = text;
		if(!noteText || !UtilsObject.isString(text)){
			noteText = yield Dialog.showInputDialog({
			    title:"Note to self",
			    placeholder:"Note text here..."
			})();
		}
		if(!noteText){
            return;
        }
		var push = new GCMPush();
		push.title = "Note To Self";
        push.text = noteText;
        push.send(deviceId)
        .then(function(){
            if(notify){
            	var device = devices.first(device=>device.deviceId == deviceId);
            	if(device){
	                showNotification("Join", `Created note on ${device.deviceName}: "${noteText}"`);
	            }
            }
        })
        .catch(UtilsObject.handleError);
		setLastPush(deviceId, "noteToSelf");
});
var getCurrentTab = function(callback){
    chrome.tabs.query({'active': true, currentWindow: true}, function (tabs) {
        if(tabs && tabs.length > 0){
            callback(tabs[0]);
        }else{
            callback(null);
        }
    });
}
var getCurrentTabPromise = function(){
    return new Promise(function(resolve,reject){
        getCurrentTab(resolve);
    });
}
var pushUrl = function(deviceId, notify,callback){
	getCurrentTab(function(tab){
		if(!tab){
			showNotification("Join", "No opened tab detected.");
			return;
		}
		console.log("pushing tab " + tab.url );
		if(tab.url.indexOf(DEVICES_POPUP_URL) == 0){
			setTimeout(function(){
			   pushUrl(deviceId,notify,callback);
			},100);
			return;
		}
		var pushed = false;
		if(tab.url.indexOf("http") == 0){
			var url = tab.url;
			text = tab.title;
			var push = new GCMPush();
			push.url = url;
			push.text = text;
			push.send(deviceId,function(){
                if(notify){
                    showNotification("Join", "Pushed current tab");
                }
            },function(error){
                showNotification("Couldn't push current tab", error);
            });
			setLastPush(deviceId, "pushUrl");
			pushed = true;
		}
		if(!pushed){
			showNotification("Join", "Link not supported. Must start with http. Was " + tab.url);
		}
		if(callback){
			callback();
		}
	});
}
var pushTaskerCommand = function(deviceId, notify,text){
    var push = new GCMPush();
    if(!text || (typeof text) != "string" ){
        text = prompt("Write your Tasker command.\n\nSetup a profile with the AutoApps condition to react to it.");
    }
    if(!text){
        return;
    }
    if(getPrefixTaskerCommands()){
         text = "=:=" + text;
    }
    push.text =text;
    push.send(deviceId,function(){
        if(notify){
            showNotification("Join", "Sent command " + text);
        }
    },function(error){
        showNotification("Couldn't push tasker command", error);
    });
    setLastPush(deviceId, "pushTaskerCommand"); 
}
var selectContactForCall = function(deviceId){
    if(!popupWindow && !popupWindowClipboard){
        showSmsPopup(deviceId);
        back.console.log("Waiting for popup to open...");
		back.eventBus.waitFor(back.Events.PopupLoaded,5000)
		.then(()=>UtilsObject.wait(500))
		.then(()=>{
        	back.console.log("Popup opened!");
			dispatch("phonecall",{"deviceId":deviceId})
		});
    }else{
		dispatch("phonecall",{"deviceId":deviceId});
	}
}
var showPushHistory = function(deviceId){
    openTab("components/push-history.html?deviceId=" + deviceId);
}
var pushCall = function(deviceId, notify, contact){
    var number = contact.number;
    var name = contact.name;
    var push = new GCMPush();
    if(!number){
        return;
    }
    if(!name){
        name = number;
    }
    return Dialog
    .confirm("Calling " + name,"This will call " + name +" ("+number+") on your device. Are you sure?")
    .then(function(){     
        push.callnumber = number;
        push
        .send(deviceId)
        .then(function(){
            if(notify){
                showNotification("Join", "Sent request to call " + number);
            }
        })
        .catch(function(error){
            showNotification("Couldn't Push Call Request", error);
        });    
    })
    .catch(function(){
        console.log("Not calling " + number);
    });
}
var fileInput = null;
var pushFile = function(deviceId, notify, tab, files){
	try{
		var initialAction = files ? Promise.resolve(files) : UtilsDom.pickFile();
	   return initialAction
	   .then(files => {
	   		if(!files){
	   			files = back.UtilsDom.fileInput.files;
	   		}
	   		var fileInput = {"files" : files};
			if(tab){
				chrome.tabs.remove(tab.id,function(){
				});
			}
			if(!fileInput.files || fileInput.files.length == 0){
				return;
			}

			var filesLength = fileInput.files.length;
			var whatsUploading = filesLength == 1 ? fileInput.files[0].name : filesLength + " files";
			showNotification("Join", "Uploading " + whatsUploading);
	        var googleDriveManager = new GoogleDriveManager();
	        var filesToUpload = fileInput.files;
	        var device = devices.first(function(device){return device.deviceId == deviceId});
	        var accountToShareTo = null;
	        if(device){
	            accountToShareTo = device.userAccount;
	        }
	        return googleDriveManager.uploadFiles({
	            folderName: GoogleDriveManager.getBaseFolderForMyDevice(),
	            accountToShareTo:accountToShareTo,
	            notify: getShowInfoNotifications()
	        }, filesToUpload)
	        .then(function(uploadResults){
	            var push = new GCMPush();
	            push.files = uploadResults;
	            push.send(deviceId,function(){
	                console.log("pushed files");
	                //showNotification("Join", "Sent " + whatsUploading);
	            },function(error){
	                showNotification("Join", "Couldn't send file: " + error);
	            });
	            setLastPush(deviceId, "pushFile");
	        })
	        .catch(UtilsObject.handleError);
	   });
	}catch(error){
		return Promise.reject(error);
	}
}
var smsWindow = null;
var smsWindowId = null;
var showSmsPopup = function(deviceId,number,name,isReply,text){
    if(!name){
        name = number;
    }
    dispatch("sendsms",{"deviceId":deviceId,"sms":{"number":number,"text":text},"reply":isReply});
    if(!popupWindow && !popupWindowClipboard){
	   createPushClipboardWindow("sms",{"deviceId":deviceId,"number":number,"name":name},{"reply":isReply,"text":text});
    }
	
}
addEventListener(EVENT_SMS_HANDLED,function(event){
	var text = event.text;
	var deviceId = event.deviceId;
	if(!text || !deviceId){
		return;
	}
	var gcm = new GCMSMSHandled();
	gcm.text = text;
	gcm.send(deviceId);
});
var sendSmsFromButtonCommand = function(deviceId){
	showSmsPopup(deviceId);
	/*if(smsWindow != null){
		chrome.windows.update(smsWindowId,{"focused":true});
		return;
	}
	//var url =  joinserverBase + "sms.html?deviceId="+deviceId;
	var height = 690;
	var width = 460;
	var url = "smschrome.html?deviceId="+deviceId+"&height="+height+"&width="+width;
	if(number){
		url += "#" + number;
	}
	chrome.windows.create({ url: url, type: 'popup' , left: screen.width - 230, top: Math.round((screen.height / 2) - (height /2)), width : width, height: height},function(win){
		smsWindow = win;
		smsWindowId = win.id;
	});*/
	/*var requestFile = new RequestFile(REQUEST_TYPE_SMS_HISTORY);
	requestFile.send(deviceId, function(responseFile){
		var url = responseFile.viewUrl;
		console.log(url);
		downloadFile(responseFile,function(jsonSMSs){
			showNotification("Join", "Got SMS!");
			var smses = JSON.parse(jsonSMSs);
			console.log(smses);
		})
	});
	setLastPush(deviceId, "sendSms");*/
}
var setLastPush = function(deviceId, functionName){
	localStorage["lastpush"] = deviceId;
	localStorage["lastpushtype"] = functionName;
}
/******************************************************************************/


var showNotification = function(title, message, timeout, notificationId){
	if(!timeout)timeout = 3000;
	var options = {
		"type":"basic",
		"iconUrl":"icons/big.png",
		"title": title,
		"message": message
	};
	if(!notificationId){
		notificationId = guid();
	}
    if(!title || !message){
        return;
    }
	chrome.notifications.create(notificationId, options,function(){
		setInterval(function() {
			chrome.notifications.clear(notificationId, function() {})
		}, timeout);
	});
}
var registerDevice = function(callback,callbackError){
    var registrationId = localStorage.regIdLocal;
    var registrationId2 = localStorage.regIdLocal2;
    if(!registrationId2){
    	registrationId2 = registrationId;
    }
    return doPostWithAuthPromise(joinserver + "registration/v1/registerDevice/",{"deviceId":localStorage.deviceId,"regId":registrationId,"regId2":registrationId2,"deviceName":"Chrome","deviceType":3})
    .then(function(result){
    	if(localStorage.deviceId == result.deviceId){
    		result.sameDeviceId = true;
    	}
        localStorage.deviceId = result.deviceId;
        localStorage.regIdServer = result.regId;
        if(callback){
            callback(result);
        }
        return result;
    })
    .catch(function(error){
        console.error("Error: " + error);
        if(callbackError){
            callbackError(error);
        }
        if(!callback){
            return Promise.reject(error);
        }   
    });
}
chrome.gcm.onMessage.addListener(function(message){
	console.log(message);
	var multiIndexString = message.data.multi;
	var type = message.data.type;
	if(!multiIndexString){
		executeGcm(message.data.type,message.data.json);
	}else{
		var multiIndex = Number(multiIndexString);
		var length = Number(message.data.length);
		console.log("Got multi message index: " + multiIndex+"/"+length);
		var id = message.data.id;
		var value = message.data.value;
		var gcmMultis = gcmMultiMap.add(id,multiIndex,value,type,length);
		var complete = gcmMultis.getComplete();
		if(complete){
			console.log("GCM complete! Executing of type " + type);
			delete gcmMultiMap[id];
			executeGcm(complete.type,complete.json);
		}
	}
});
var executeGcm = function(type, json){
	var gcmFunc = window[type];
	if(!gcmFunc){
		return;
	}
	var gcm = new gcmFunc();
	gcm.fromJsonString(json);
	gcm.execute();
}

var refreshDevices = function(callback){
	console.log("Refreshing devices...");
	 doGetWithAuth(joinserver + "registration/v1/listDevices/", function(result){
	  console.log(result);

	  setDevices(result.records);
	  if(callback != null){
		callback(result.records);
	  }
	},function(error){
		console.log("Error: " + error);
		if(callback != null){
			callback(null);
		}
	});
}
if(!localStorage.firstRunDone){
	localStorage.firstRunDone = true;
	if(!localStorage.accessToken){
		getAuthToken(null,true);
	}
}else{		
	getToken();
}
var handleRegIdRegistration = function(registrationId, regIdLocalKey){
	if (registrationId == null || registrationId == "") {
        var errorMessage = null;
        if(chrome.runtime.lastError){
            errorMessage = chrome.runtime.lastError.message;
        }
        if(!errorMessage){
            errorMessage = "unknown error";
        }
		console.error("Error getting key: " + errorMessage);
		return {"success":false};
	} else {
		console.log(`Got reg id ${regIdLocalKey}:` + registrationId);
		var result = {"success":true};
		if(localStorage[regIdLocalKey] == registrationId){
			result.sameRegId = true;
		}
		localStorage[regIdLocalKey] = registrationId;
		return result;
	}
}
chrome.instanceID.getToken({"authorizedEntity":"596310809542","scope":"GCM"},registrationId1=>{
	var resultRegId1 = handleRegIdRegistration(registrationId1,"regIdLocal");
	if(resultRegId1.success){
		chrome.instanceID.getToken({"authorizedEntity":"737484412860","scope":"GCM"},registrationId2=>{
			var resultRegId2 = handleRegIdRegistration(registrationId2,"regIdLocal2");
			if(resultRegId2.success){
				if(!resultRegId1.sameRegId || !resultRegId2.sameRegId || !localStorage.deviceId){
					registerDevice(function(result){
						if(!result.sameDeviceId){
							refreshDevices();	
						}
					});	
				}
			}
		});		
	}
});

/*chrome.gcm.register(["596310809542","737484412860"],function(registrationId) {
	if (registrationId == null || registrationId == "") {
        var errorMessage = null;
        if(chrome.runtime.lastError){
            errorMessage = chrome.runtime.lastError.message;
        }
        if(!errorMessage){
            errorMessage = "unknown error";
        }
		console.log("Error getting key: " + errorMessage);
	} else {
		console.log("Got key: " + registrationId);
		localStorage.regIdLocal = registrationId;
		registerDevice(function(){
			refreshDevices();
		});
	}
});*/

var deviceImages = {};
deviceImages[""+DEVICE_TYPE_ANDROID_PHONE] =function(device){return "phone.png";};
deviceImages[""+DEVICE_TYPE_ANDROID_TABLET]=function(device){return"tablet.png";};
deviceImages[""+DEVICE_TYPE_IOS_PHONE] =function(device){return "iphone.png";};
deviceImages[""+DEVICE_TYPE_IOS_TABLET]=function(device){return"ipad.png";};
deviceImages[""+DEVICE_TYPE_CHROME_BROWSER]=function(device){return"chrome.png";};
deviceImages[""+DEVICE_TYPE_WIDNOWS_PC]=function(device){return"windows10.png";};
deviceImages[""+DEVICE_TYPE_FIREFOX]=function(device){return"firefox.png";};
deviceImages[""+DEVICE_TYPE_GROUP]=function(device){return device.deviceId.substring(6) + ".png"};
deviceImages[""+DEVICE_TYPE_ANDROID_TV]=function(device){return "tv.png"};
var devicesJson = localStorage["devices"];

var devices = null;
if(devicesJson){
	devices = JSON.parse(devicesJson);
}


var getDeviceById = function(deviceId){
	for (var i = 0; i < devices.length; i++) {
		var device = devices[i];
		if(device.deviceId == deviceId){
			return device;
		}
	}
}
var setDevices = function(devicesToSet){
	UtilsVoice.resetDeviceEntities();
	devices = [];
	if(devicesToSet){
		for (var i = 0; i < devicesToSet.length; i++) {
			var device = devicesToSet[i];
			if(!localStorage.deviceId || localStorage.deviceId != device.deviceId){
				devices.push(device);
			}else{
                devices.unshift(device);
            }
		}
		console.log("After setting devices: " + localStorage.deviceId);
		if(localStorage.deviceId){
			devicesToSet.doForAll(function(deviceToSet){
				if(localStorage.deviceId == deviceToSet.deviceId){
					localStorage.deviceName = deviceToSet.deviceName;
				}
			});
		}
		if(localStorage.deviceName){
			devices.doForAll(function(storedDevice){
				if(storedDevice.deviceName == localStorage.deviceName && storedDevice.deviceId != localStorage.deviceId){
					var newName = prompt("One of your Join devices is already named '" + localStorage.deviceName + "'. What do you want to name this Chrome installation?");
					var message = "You can always rename your devices by long-touching them in the Android app.";
					if(newName){
						localStorage.deviceName = newName;
						doPostWithAuth(joinserver + "registration/v1/renameDevice/?deviceId=" + localStorage.deviceId + "&newName=" + encodeURIComponent(newName),{}, function(result){
							alert("Renamed. " + message);
						},function(error){
							alert("Error renaming: " + JSON.stringify(error));
						});
					}else{
						alert(message);
					}
				}
			});
		}
		devices.removeIf(device=>device.deviceType == DEVICE_TYPE_GROUP);
		var groups = joindevices.groups.deviceGroups.getGroups(devices);
		for (var i = 0;i < groups.length;i++) {
			var group = groups[i];
			var deviceFromGroup = {
				"deviceId": "group." + group.id,
				"deviceName": group.name,
				"deviceType": DEVICE_TYPE_GROUP
			};
			devices.push(deviceFromGroup);
		}
        UtilsObject.sort(devices,true,device=>device.deviceId.indexOf("group")>=0,device=>device.deviceId.indexOf("share")>=0,device=>device.deviceType,device=>device.deviceName);
		localStorage["devices"] = JSON.stringify(devices);
	}
	contextMenu.update(devices);
  	refreshDevicesPopup();
}
function directCopy(str,setLastClipboard){
	if(!str){
		return;
	}
	if(setLastClipboard){
		lastClipboard = str;
	}
	document.oncopy = function(event) {
		event.clipboardData.setData("Text", str);
		event.preventDefault();
	};
	document.execCommand("Copy");
	document.oncopy = undefined;
	console.log("Set clipboard to: " + str);
}
function getClipboard(callback){

	document.onpaste = function(event) {
		var clipboardData = event.clipboardData.getData("Text");
		event.preventDefault();
		callback(clipboardData);
	};
	document.execCommand("paste");
	document.onpaste = undefined;
}
function doForDevices(action) {
	if(!devices || devices.length == 0){
		return;
	}
	for (var i = 0; i < devices.length; i++) {
		var device = devices[i];
		action(device);
	}
}

var lastClipboard = null;
var autoCheckClipboard = getAutoClipboard();
var checkClipboardRecursive = function(){
	if(!autoCheckClipboard){
		return;
	}
	getClipboard(function(clipboardData){
		if(lastClipboard != clipboardData){
			lastClipboard = clipboardData;
			var devicesToSendClipboard = getDeviceIdsToSendAutoClipboard();
			if(devicesToSendClipboard.length>0){
				var gcmParams = {};
				gcmParams[GCM_PARAM_TIME_TO_LIVE] = 0;
				var params = {"deviceIds" : devicesToSendClipboard, "text":encrypt(clipboardData)};
				var gcmAutoClipboard = new GCMAutoClipboard();
				gcmAutoClipboard.text = params.text;
				new DeviceIdsAndDirectDevices(devicesToSendClipboard).send(function(serverDeviceIds,callback, callbackError){
					params.deviceIds = serverDeviceIds;
					doPostWithAuth(joinserver + "messaging/v1/sendAutoClipboard/",params,callback, callbackError);
				},gcmAutoClipboard,gcmParams, function(result){
					  console.log("Sent clipboard automatically: " + JSON.stringify(result));
					},function(error){
						console.log("Error: " + error);
				});
			}
		}
	});
	if(autoCheckClipboard){
		setTimeout(checkClipboardRecursive,2000);
	}
}
var handleAutoClipboard = function(){
	if(getAutoClipboard()){
		autoCheckClipboard = true;
		getClipboard(function(clipboardData){
			lastClipboard = clipboardData;
			checkClipboardRecursive();
		});
	}else{
		autoCheckClipboard = false;
	}
}
handleAutoClipboard();


contextMenu.update(devices);
/*UtilsObject.wait(2000,function(timeOut){
   // clearTimeout(timeOut);
})
.then(()=>{

    var test = "aaaa";
    console.log(`done waiting ${test}`)
})*/
/*var result = Dialog.showInputDialog({
    text:"Something",
    title:"Input stuffs",
    subtitle:"I said stufff",
    placeholder:"write stuff man"
})()
.then(function(result){
    console.log("Input result");
    console.log(result);
}).catch(UtilsObject.ignoreError);*/
/*var result = Dialog.showMultiChoiceDialog({
    items:[
        {id:0,text:"First"},
        {id:1,text:"Second"},
        {id:2,text:"Third"},
        {id:2,text:"Fourth"},
    ],
    title:"Select One"
})()
.then(function(result){
    console.log("Input result");
    console.log(result);
}).catch(UtilsObject.ignoreError);*/
/*var googleDriveManager = new GoogleDriveManager();
    console.log("Finding file");*/
/*googleDriveManager.getFile({
    folderName:"Join Files/From Nexus 5X",
    fileName:"faqold.png"
}).then(function(file){
    console.log("Found file");
    console.log(file);
}).catch(function(error){
    console.log("Error: " + error);
});*/
/*googleDriveManager.getFolderId({
    folderName: "Join Files/blabla"
}).then(function(result){
    console.log("FOLDER RESULT");
    console.log(result)
}).catch(function(error){
    console.log("FOLDER ERROR");
    console.log(error)
});*/
/*var promise = googleDriveManager.uploadContent({
    folderName:"Join Files/From Nexus 5X",
    fileName:"stuff.json",
    content:{"hello":"bye"},
    overwrite:false
}).then(function(file){
    console.log("Uploaded file");
    console.log(file);
}).catch(function(error){
    console.log("Didn't upload file: " + error);
});*/
//Dialog.showEmojiDialog()();
/*navigator.webkitTemporaryStorage.requestQuota(1024*1024, function(grantedBytes) {
  window.requestFileSystem(PERSISTENT, grantedBytes, function(){},  function(){});
}, function(e) {
  console.log('Error', e);
});*/
//UtilsVoice.doVoiceCommand("screenshot my chrome");

/*UtilsVoice.doVoiceCommand(devices,prompt=>console.log(prompt),"locate my lg g4")
.then(result=>{
	console.log("Done recognizing!")
	console.log(result);
	result.command.func(result.device.deviceId,true);
})
.catch(error=>{
	console.log("Error recognizing!")
	console.log(error);
});
*/
//back.Dialog.showRequestMicDialog()().then(result=>console.log("Got mic: " + result));