
var OPTIONS_URL = "chrome-extension://flejfacjooompmliegamfbpjjdlhokhj/options.html";
var isPopup = getURLParameter("popup");
if(!isPopup){
	chrome.extension.getBackgroundPage().popupWindow = window;
}


var deviceImages = chrome.extension.getBackgroundPage().deviceImages;
var getDevices = function(){
	return chrome.extension.getBackgroundPage().devices;
}
var refreshDevices = function(callback){
	return chrome.extension.getBackgroundPage().refreshDevices(function(){
		writeDevices();
		if(callback){
			callback();
		}
	});
}
var clearClipboardWindows = function(){
	return chrome.extension.getBackgroundPage().clearClipboardWindows();
}
var pushClipboard = function(deviceId){
	return chrome.extension.getBackgroundPage().pushClipboard(deviceId);
}
var writeText = function(deviceId){
	return chrome.extension.getBackgroundPage().writeText(deviceId);
}
var requestLocation = function(deviceId){
	return chrome.extension.getBackgroundPage().requestLocation(deviceId);
}
var pushUrl = function(deviceId, url,text){
	return chrome.extension.getBackgroundPage().pushUrl(deviceId, url,text);
}
var getScreenshot = function(deviceId, url,text){
	return chrome.extension.getBackgroundPage().getScreenshot(deviceId);
}
var sendSms = function(deviceId, url,text){
	return chrome.extension.getBackgroundPage().sendSms (deviceId);
}
var getDeviceById = function(deviceId){
	return chrome.extension.getBackgroundPage().getDeviceById(deviceId);
}
var doGetWithAuth = function(url, callback, callbackError) {
	return chrome.extension.getBackgroundPage().doGetWithAuth(url, callback, callbackError);
}
var doGetWithAuthAsyncRequest = function(endpointRequest, endpointGet, deviceId, callback, callbackError) {
	return chrome.extension.getBackgroundPage().doGetWithAuthAsyncRequest(endpointRequest, endpointGet, deviceId, callback, callbackError);
}
var getElementDeviceId = function(element){
	return element.attributes.deviceId.value;
}
var doWithDeviceAndCloseWindows = function(doThis){
	var element = event.currentTarget;
	var device = getDeviceById(getElementDeviceId(element));
	doThis(device.deviceId);
	clearClipboardWindows();
}
var setUserInfo = function(){
  getUserInfo(function(result){
	var userIconElement = document.getElementById("usericon");
	document.getElementById("topBarText").onclick = setUserInfo;
	userIconElement.src = result.picture;
	userIconElement.onclick = function(){
		back.getAuthToken(function(){
		  back.refreshDevices(function(){
			setUserInfo();
		  });
		},true);
	};
  });
}
setUserInfo();
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
var joinserver = chrome.extension.getBackgroundPage().joinserver;
var tabs = document.querySelectorAll("div[id^=tab-]");

for (var i = 0; i < tabs.length; i++) {
	var tab = tabs[i];
	tab.addEventListener("click",function(event){
		var idToShow = event.currentTarget.id.replace("tab-","");
		selectTab(idToShow);
	});
};
var tabTitleElement = document.getElementById("currenttabtitle");
var selectTab = function(idToShow){
	 for (var i = 0; i < tabs.length; i++) {
		var tab = tabs[i];
		var currentId = tab.id.replace("tab-","");
		var tabContent = document.getElementById(currentId);
		if(currentId == idToShow){
			tabContent.style.display = "";
			if(tab.className.indexOf("selected")<0){
				tab.classList.add("selected");
				tabTitleElement.innerText = idToShow.substring(0,1).toUpperCase() + idToShow.substring(1);
			}
		}else{
			tabContent.style.display = "none";
			tab.classList.remove("selected");
		}
   }
	localStorage.selectedTab = idToShow;
	document.body.className = idToShow + "body";

	function getUrlParameter(sParam) {
		var sPageURL = window.location.search.substring(1);
		var sURLVariables = sPageURL.split('&');
		for (var i = 0; i < sURLVariables.length; i++) {
			var sParameterName = sURLVariables[i].split('=');
			if (sParameterName[0] == sParam) {
				return sParameterName[1];
			}
		}
	}
	var isPopup;
	isPopup = getUrlParameter('popup') === '1';
	if (isPopup) {
		$('body').toggleClass('popout', isPopup)
	}

}
var refreshTabVisibility = function(){
	var smsTab = document.getElementById("tab-sms");
	if(!localStorage.smsDeviceId){
		smsTab.style.display = "none";
	}else{
		smsTab.style.display = "block";
	}
}
refreshTabVisibility();
var sendSmsDevices = function(event){
	localStorage.smsDeviceId = event.deviceId;
	refreshTabVisibility();
	selectTab("sms");
};

back.addEventListener("sendsms",sendSmsDevices,false);
addEventListener("unload", function (event) {
	back.console.log("Unloading popup devices...");
	back.removeEventListener("sendsms",sendSmsDevices,false);
	if(isPopup){
		/*back.console.log("Is popup. Firing popup closed event");
		dispatch("popupwindowclosed");*/
	}else{
		back.popupWindow = null;
	}
	back.dispatch("popupunloaded");
}, true);
var settingsElement = document.getElementById("settings");
var topBarPopoutElement = document.getElementById("topBarPopout");
settingsElement.onclick = function(){
	openTab(OPTIONS_URL);
}
topBarPopoutElement.onclick = function(){
	back.createPushClipboardWindow(localStorage.selectedTab);
	window.close();
}
var onlyTabToShow = getURLParameter("tab");
if(onlyTabToShow){
	selectTab(onlyTabToShow);
	// CHANGE NOTE: I can't tell what it does. Hope it's not important.
	// document.getElementById("tabscontaineroutter").style.display ="none";
}else{
	if(localStorage.selectedTab){
		selectTab(localStorage.selectedTab);
	}else{
		var idToShow = tabs[0].id.replace("tab-","");
		selectTab(idToShow);
		console.log("Showed tab " + idToShow + " by default");
	}
}
var topBarElement = document.getElementById("topBar");

var devicesElement = document.getElementById("devices");
document.onkeydown = function(e){
	if(e.keyCode == 27){
		window.close();
	}
}

document.getElementById("optionslink").addEventListener("click",function(event){
   openTab(OPTIONS_URL);
});
var refreshElement = document.getElementById("topBarRefresh");
refreshElement.addEventListener("click",function(event){
	var tab = localStorage.selectedTab;
	var func = "refresh" + tab.substring(0,1).toUpperCase() + tab.substring(1);
	setRefreshing(true);
	window[func](function(){
		setRefreshing(false);
   });
});
var setRefreshing = function(refreshing){
	if(refreshing){
		refreshElement.classList.add("rotating");
	}else{
		refreshElement.classList.remove("rotating");
	}
}
back.fileInput = document.getElementById("uploadfile");

var devicesUpdated = function(event){
	writeDevices();
}
back.addEventListener('devicesupdated', devicesUpdated, false);

addEventListener("unload", function (event) {
	back.console.log("Unloading devices...");
	back.removeEventListener("devicesupdated",devicesUpdated,false);
}, true);
