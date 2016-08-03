
var back = chrome.extension.getBackgroundPage();
var ChromeNotification = function(notificationFromGcm){
	var me = this;
	if(notificationFromGcm){
		for(var prop in notificationFromGcm){
			this[prop] = notificationFromGcm[prop];
		}
	}
	var getIcon = function(icon){
		return icon == null ? "icons/notificationbutton.png" : icon;
	}
	this.notify = function(timeout){
		if(!getShowChromeNotifications()){
			return;
		}
		var timeoutFromSettings = getNotificationSeconds();
		if(!timeout && timeoutFromSettings)
		{
			timeout = timeoutFromSettings * 1000;
		}
			var imagesToDownload = [];
			imagesToDownload.push({"url":getDriveUrlFromFileId(this.notificationIcon ? this.notificationIcon : this.appIcon)});
			imagesToDownload.push({"url":getDriveUrlFromFileId(this.image)});
			if(me.buttons){
				for (var i = 0; i < this.buttons.length; i++) {
					var button = this.buttons[i];
					imagesToDownload.push({"url":getDriveUrlFromFileId(button.icon)});
				};
			}			
			doGetBase64Images(imagesToDownload,function(results){
				var notificationIcon = getIcon(results[0]);
				if(notificationIcon == "icons/notificationbutton.png" && me.iconData){
					notificationIcon = ICON_DATA_PREFIX + me.iconData;
				}
				var image = getIcon(results[1]);
				var notificationButtons = [];
				if(me.replyId){
					notificationButtons.push({"title":Constants.REPLY_DIRECTLY,"iconUrl":"icons/reply.png"});
				}
				if(me.buttons){
					for (var i = 0; i < me.buttons.length; i++) {
						var button = me.buttons[i];
						notificationButtons.push({"title":button.text,"iconUrl":getIcon(results[i+2])});
					};
			}
			var text = me.text;
			if(back.getHideNotificationText()){
				text = "Content hidden";
			}
				var options = {
						"type":"basic",
						"iconUrl":notificationIcon,
						"title": me.title,
						"message": text,
						"contextMessage": me.subText,
						"buttons": notificationButtons,
						"eventTime": Date.now()
				};
				if(me.image){
					options.type = "image";
					options.imageUrl = image;
				}
				if(me.priority){
					if(me.priority < 0){
						me.priority = 0;
					}
					options.priority = me.priority;
				}
						var appPage = getNotificationPage(me);
				if(me.actionId || appPage){
					options.isClickable = true;
				}else{
					options.isClickable = false;
				}
				chrome.notifications.create(me.id, options,function(){});
				if(back.getPlayNotificationSound()){
					var notificationSound = back.getNotificationSound();
					if(!notificationSound){
						notificationSound = "resources/notification.mp3";
					}
					new Audio(notificationSound).play();
			}
				if(timeout){
					if(timeout > 8000){
						options.priority = 2;
					}
					var storedTimeout = timeouts[me.id];
					if(storedTimeout){
						delete timeouts[me.id];
						clearTimeout(storedTimeout);
					}
					var timeoutFunc = setTimeout(function(){
							chrome.notifications.clear(me.id, function(){});
						delete timeouts[me.id];
					},timeout);
					timeouts[me.id] = timeoutFunc;
				}
			})

	}
}
var timeouts = {};
var getNotification = function(notificationId){
	var notification = notifications.first(function(notification){
		return notification.id == notificationId;
	});
	return notification;
}
chrome.notifications.onClicked.addListener(function(id){
	var notification = getNotification(id);
	if(!notification){
		//console.log("WARNING: notification clicked but didn't exist! Shouldn't happen!" );
		return;
	}
		var opened = openNotificationPage(notification);
		if(!opened){
		notification.doAction(notification.actionId);
	}
});
chrome.notifications.onClosed.addListener(function(id,byUser) {
	if(!byUser){
		return;
	}
	var notification = getNotification(id);
	if(!notification){
		console.log("WARNING: notification closed but didn't exist! Shouldn't happen!" );
		return;
	}
	if(notification.persistent){
		console.log("Not clearing persistent notification from phone");
		return;
	}
	notification.cancel();
});
chrome.notifications.onButtonClicked.addListener(function(id,index){
	var notification = getNotification(id);
	if(!notification){
		console.log("WARNING: button clicked but didn't exist! Shouldn't happen!" );
		return;
	}
	if(notification.replyId && index == 0){
		notification.doAction(notification.replyId,notification.noPrompt ? null : prompt(notification.text),true);
		return;
	}
	var buttons = notification.buttons;
	if(!buttons){
		console.log("WARNING: button clicked but didn't find buttons! Shouldn't happen!" );
		return;
	}
	if(notification.replyId){
		index--;
	}
	if(buttons.length <= index){
		console.log("WARNING: button " + (index + 1) + " clicked but didn't find that many buttons! Shouldn't happen!" );
		return;
	}
	notification.doAction(buttons[index].actionId);
});
