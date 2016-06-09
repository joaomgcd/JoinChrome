
var deviceId = getURLParameter("deviceId");
var contactParameter = null;
var hashIndex = window.location.href.indexOf("#");
if(hashIndex>=0){
	contactParameter = window.location.href.substring(hashIndex+1);
}
var myWindow = window;
document.addEventListener('DOMContentLoaded', function() {
	console.log(deviceId);
		setFrameUrl();
	chrome.extension.getBackgroundPage().smsWindow = window;
	chrome.extension.getBackgroundPage().onSmsReceived = function(gcmNewSmsReceived){
		var number  = gcmNewSmsReceived.number;
		var text = gcmNewSmsReceived.text;
		if(!text){
			var newUrl = myWindow.location.href;
			var index = newUrl.indexOf("#");
			if(index>0){
				newUrl = newUrl.substring(0,index);
			}
			newUrl += "#" + number;
			myWindow.location.href = newUrl;
			console.log("New href: " + myWindow.location.href);
			myWindow.location.reload();
		}else{
			sendMessageToFrame(gcmNewSmsReceived);
		}
	}
	//frame.style.height = getURLParameter("height") + "px";
	//frame.style.width = getURLParameter("width") + "px";
});
var setFrameUrl = function(){
	var url =  joinserverBase + "sms.html?refresh=false&deviceId="+deviceId;
		var frame = document.getElementById("frame");
		if(contactParameter){
			url = url + "#"+contactParameter;
		}
	frame.src = url;
}

window.onbeforeunload = function(){
		chrome.extension.getBackgroundPage().smsWindow = null;
		chrome.extension.getBackgroundPage().onSmsReceived = null;
}
var sendMessageToFrame = function(obj){
	window.frames[0].window.postMessage(JSON.stringify(obj),"*");
}
