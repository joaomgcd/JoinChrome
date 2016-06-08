var notificationsHtml = document.querySelector('link[href="notifications.html"]').import;
var notificationHtml = notificationsHtml.querySelector('link[href="notification.html"]').import.querySelector('#notification');
var notificationButtonHtml = notificationsHtml.querySelector('link[href="notificationbutton.html"]').import.querySelector('#notificationbutton');

var notificationsElement = document.getElementById("notifications");
var getNotifications = function(){
	return chrome.extension.getBackgroundPage().notifications;
}
window.onbeforeunload = function(){
	chrome.extension.getBackgroundPage().notificationsWindow = null;
}
var refreshNotifications = function(callback){
	chrome.extension.getBackgroundPage().getNotifications(function(notifications){
		writeNotifications();
		if(callback){
			callback();
		}
	});
}
var getHeight = function(){
	return chrome.extension.getBackgroundPage().getNotificationPopupHeight();
}
var getWidth = function(){
	return chrome.extension.getBackgroundPage().getNotificationPopupWidth();
}

var writeNotifications = function(){
	notificationsElement.innerHTML = "";
	var notifications = getNotifications();
	if(notifications.length == 0){
		notificationsElement.innerHTML = "<h5 id='tabsplaceholder'>No notifications</h5>";
		//document.title = "Notifications";
		if(getURLParameter("closeOnEmpty")){
			window.close();
		}
	}else{
		//document.title = notifications.length + " Notifications";
	}
	// if(notifications.length>=1){
	//     var imageClearNotifications = createElement(notificationsElement,"img","clearallnotifications",{"src":"icons/clear.png"});
	//     imageClearNotifications.onclick = function(){
	//         var gcmNotificationClear = new back.GCMNotificationClear();
	//         gcmNotificationClear.clearAll();
	//         back.resetNotifications();
	//         writeNotifications();
	//     }
	// }

	var clearNotificationsFAB = createElement(notificationsElement, "div", "clearAllNotificationButton",{"class":"fixed-action-btn"});
	var clearNotificationsLink = createElement(clearNotificationsFAB, "a", null, {"class":"btn-floating btn-large"});
	var clearNotificationsIcon = createElement(clearNotificationsLink, "div", "clearAllNotificationButtonIcon");
	clearNotificationsFAB.onclick = function(){
		var gcmNotificationClear = new back.GCMNotificationClear();
		gcmNotificationClear.clearAll();
		back.resetNotifications();
		writeNotifications();
	}

	for (var i = 0; i < notifications.length; i++) {
		var not = notifications[i];
		var notificationElement = not.notificationElement;
		if(notificationElement == null){
			var device = getDevices().first(function(device){
				return device.deviceId == not.senderId;
			});
			var iconsToDownload = [];
			var pushIconToDownloadIfNeeded = function(iconElement, iconUrl){
				if(!iconUrl){
					return;
				}
				if(iconUrl.indexOf("http")==0){
					iconElement.src = iconUrl;
				}else{
					if(iconElement.src.indexOf("data:image/png")<0){
						iconsToDownload.push({"url":getDriveUrlFromFileId(iconUrl),"element":iconElement});
					}
				}
			}
			notificationElement = notificationHtml.cloneNode(true);
			not.notificationElement = notificationElement;
			var titleElement = notificationElement.querySelector("#title");
			var dateElement = notificationElement.querySelector("#date");
			var textElement = notificationElement.querySelector("#text");
			var appname = notificationElement.querySelector("#appname");
			var deviceElement = notificationElement.querySelector("#device");
			var iconapp = notificationElement.querySelector("#iconapp");
			var icon = notificationElement.querySelector("#icon");
			var image = notificationElement.querySelector("#image");
			appname.innerText = not.appName;
			if(device){
				deviceElement.innerHTML = device.deviceName;
			}else{
				deviceElement.style.display = "none";
			}
			if(not.color){
				// console.log("setting color to " + not.color);
				//notificationElement.querySelector("#notificationleft").style.backgroundColor = not.color;
			}
			if(not.appIcon){
				var bigIcon = null;
				var smallIcon = null;
				if(!not.notificationIcon){
					iconapp.style.display = "none";
					bigIcon = not.appIcon;
				}else{
					bigIcon = not.notificationIcon;
					smallIcon = not.appIcon;
				}
				pushIconToDownloadIfNeeded(icon,bigIcon);
				pushIconToDownloadIfNeeded(iconapp, smallIcon);
			}else{
				iconapp.style.display = "none";
				if(not.iconData){
					icon.src = ICON_DATA_PREFIX + not.iconData;
				}
			}
			if(not.image){
				pushIconToDownloadIfNeeded(image, not.image);
			}else{
				image.style.display = "none";
			}
			var date_format = "#hh#:#mm#";
			if (back.get12HourFormat()) { date_format = date_format + " #AMPM#";}
			dateElement.innerHTML = new Date().customFormat(date_format);
			titleElement.innerHTML = not.title;
			if(not.lines && not.lines.length>0){
				var linesText = "";
				not.lines.doForAll(function(line){
					linesText += line + "<br/>";
				});
				textElement.innerHTML = linesText;
			}else{
				textElement.innerHTML = not.text.replace(/(?:\r\n|\r|\n)/g, '<br />');
			}
			var buttonsElement = notificationElement.querySelector("#buttons");
			if(not.buttons){
				buttonsElement.style.display = "flex";
				for (var e = 0; e < not.buttons.length; e++) {
					var button = not.buttons[e];
					var buttonElement = notificationButtonHtml.cloneNode(true);
					var buttonTextElement = buttonElement.querySelector("#text");
					// var buttonIconElement = buttonElement.querySelector("#icon");
					// if(!button.icon){
					//     button.icon = not.appIcon;
					// }
					// pushIconToDownloadIfNeeded(buttonIconElement,button.icon);
					buttonTextElement.innerHTML = button.text;
					buttonElement.id = button.actionId;
					buttonsElement.appendChild(buttonElement);
				};
			}else{
				buttonsElement.style.display = "none";
			}
			if(not.replyId){
				buttonsElement.style.display = "flex";
				var buttonElement = notificationButtonHtml.cloneNode(true);
				var buttonTextElement = buttonElement.querySelector("#text");
				// var buttonIconElement = buttonElement.querySelector("#icon");
				buttonTextElement.innerHTML = "Join Reply";
				// buttonIconElement.src = "icons/reply.png"
				buttonElement.id = not.replyId;
				buttonsElement.appendChild(buttonElement);
			}
			doGetBase64Images(iconsToDownload);
		}

		var closeButton = notificationElement.querySelector("#closebutton");
		closeButton.notification = not;
		if(not.persistent){
			closeButton.style.display = "none";
		}else{
			// CHANGE NOTE: Doesn't appear to do anything. Commented out for now.
			// closeButton.style.display = "block";
			closeButton.onclick =  function(event){
				var not = event.currentTarget.notification;
				console.log("Cancelling: ");
				console.log(not);
				not.cancel();
				writeNotifications();
			};
		}
		var notificationright = notificationElement.querySelector("#notificationright");
		notificationright.notification = not;
		if(not.actionId || getNotificationPage(not)){
			notificationright.style.cursor = "pointer";
		}
		notificationright.onclick = function(event){
			var not = event.currentTarget.notification;
			var opened = openNotificationPage(not);
			if(!opened){
				console.log("Doing content action: ");
				console.log(not);
				not.doAction(not.actionId);
			}
		};
		if(not.buttons){
			 for (var j = 0; j < not.buttons.length; j++) {
					var button = not.buttons[j];
					var buttonElement = notificationElement.querySelector("[id='"+button.actionId+"']")
					buttonElement.notification = not;
					buttonElement.onclick = function(event){
						var not = event.currentTarget.notification;
						console.log("Doing button action: ");
						console.log(not);
						not.doAction(event.currentTarget.id);
					};
			 }
		}
		if(not.replyId){
			var buttonElement = notificationElement.querySelector("[id='"+not.replyId+"']")
			buttonElement.notification = not;
			buttonElement.onclick = function(event){
				var not = event.currentTarget.notification;
				console.log("Doing reply action: ");
				console.log(not);
				not.doAction(event.currentTarget.id, not.noPrompt ? null : prompt(not.text),true);
			};
		}
		notificationsElement.appendChild(notificationElement);

	};
	if(onlyTabToShow && onlyTabToShow == "notifications"){
	   // window.resizeTo(getWidth(),getHeight());
	}
}
writeNotifications();

var notificationsUpdated = function(event){
	writeNotifications();
}
back.addEventListener('notificationsupdated', notificationsUpdated, false);

addEventListener("unload", function (event) {
	back.console.log("Unloading notifications...");
	back.removeEventListener("notificationsupdated",notificationsUpdated,false);
}, true);
