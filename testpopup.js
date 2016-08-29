
setTimeout(function(){
	var back = chrome.extension.getBackgroundPage();	
	back.eventBus.post(new back.Events.TestPopup());
	window.close();
},2000);
