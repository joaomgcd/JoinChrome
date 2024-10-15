var notification = null;
var NotificationDialogEventHandler = function(){
	this.onPopupLoaded = function(){
		Dialog.cancel();
	}
	this.onNotificationImagesLoaded = function(){
		Dialog.resizeCurrentDialog();
	}
	this.onNotificationHandled = function(handled){
		if(!handled){
			return;
		}
		var info = handled.info;
		if(!info){
			return;
		}
		if(!notification){
			return;
		}
		if(info.notificationId != notification.id){
			return;
		}
		if(info.dismissed || info.replied){
			Dialog.cancel();
			return;
		}
	}
}
var eventHandler = new NotificationDialogEventHandler();
back.eventBus.register(eventHandler);
addEventListener("unload", function (event) {
	back.console.log("Unloading notification dialog...");
	back.eventBus.unregister(eventHandler);
});
document.addEventListener('DOMContentLoaded', async function() {
	var initResult = Dialog.init({
		showOk:false
	},function(){
		return inputElement.value;
	});	
	var input = initResult.input;	
	notification = await back.getNotificationRaw(input.notificationId);
	console.log(notification);
	await writeNotifications(not=>not.id == notification.id);
});