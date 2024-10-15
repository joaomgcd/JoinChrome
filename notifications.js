const importNotifications = async () => {
	var notificationsHtml = await import('./notifications-component.js');
	var notificationHtml = await notificationsHtml.getNotification();
	var notificationButtonHtml = await notificationsHtml.getNotificationButton();
	return {
		"notificationHtml": notificationHtml,
		"notificationButtonHtml": notificationButtonHtml
	}
}
var notificationsElement = document.getElementById("notifications");
var getNotifications = async function () {
	return await chrome.extension.getBackgroundPage().getNotificationsRaw();
}
window.onbeforeunload = function () {
	chrome.extension.getBackgroundPage().notificationsWindow = null;
}
var refreshNotifications = async function (callback) {
	const notifications = await chrome.extension.getBackgroundPage().getNotifications();
	await writeNotifications();
	if (callback) {
		callback();
	}
}
var getHeight = function () {
	return chrome.extension.getBackgroundPage().getNotificationPopupHeight();
}
var getWidth = function () {
	return chrome.extension.getBackgroundPage().getNotificationPopupWidth();
}

const semaphore = new Semaphore(1);
var writingNotifications = false;
var writeNotifications = async function (filter) {
	await semaphore.acquire();

	try {

		const { notificationHtml, notificationButtonHtml } = await importNotifications();
		var notifications = await getNotifications();
		if (notifications.length == 0) {
			notificationsElement.innerHTML = "<h5 id='tabsplaceholder'>No notifications</h5>";
			//document.title = "Notifications";
			if (getURLParameter("closeOnEmpty")) {
				window.close();
			}
		} else {
			//document.title = notifications.length + " Notifications";
		}

		notificationsElement.innerHTML = "";
		if (!filter) {
			var clearNotificationsFAB = createElement(notificationsElement, "div", "clearAllNotificationButton", { "class": "fixed-action-btn" });
			var clearNotificationsLink = createElement(clearNotificationsFAB, "a", null, { "class": "btn-floating btn-large" });
			var clearNotificationsIcon = createElement(clearNotificationsLink, "div", "clearAllNotificationButtonIcon");
			clearNotificationsFAB.onclick = async function () {
				var gcmNotificationClear = new GCMNotificationClear();
				gcmNotificationClear.clearAll();
				await back.resetNotifications();
				await writeNotifications();
			}
			if (notifications.length == 0) {
				UtilsDom.hideElement(clearNotificationsFAB);
			}
		}

		for (var i = 0; i < notifications.length; i++) {
			var not = notifications[i];
			if (filter && !filter(not)) {
				continue;
			}
			var notificationElement = not.notificationElement;
			if (notificationElement == null) {
				var device = UtilsDevices.getDevices().first(function (device) {
					return device.deviceId == not.senderId;
				});
				var iconsToDownload = [];
				var pushIconToDownloadIfNeeded = function (iconElement, iconUrl) {
					if (!iconUrl) {
						return;
					}
					if (iconUrl.indexOf("http") == 0) {
						iconElement.src = iconUrl;
					} else {
						if (iconElement.src.indexOf("data:image/png") < 0) {
							iconsToDownload.push({ "url": getDriveUrlFromFileId(iconUrl), "element": iconElement });
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
				if (device) {
					deviceElement.innerHTML = device.deviceName;
				} else {
					deviceElement.style.display = "none";
				}
				if (not.color) {
					// console.log("setting color to " + not.color);
					//notificationElement.querySelector("#notificationleft").style.backgroundColor = not.color;
				}
				if (not.appIcon) {
					var bigIcon = null;
					var smallIcon = null;
					if (!not.notificationIcon) {
						iconapp.style.display = "none";
						bigIcon = not.appIcon;
					} else {
						bigIcon = not.notificationIcon;
						smallIcon = not.appIcon;
					}
					pushIconToDownloadIfNeeded(icon, bigIcon);
					pushIconToDownloadIfNeeded(iconapp, smallIcon);
				} else {
					iconapp.style.display = "none";
					if (not.iconData) {
						icon.src = ICON_DATA_PREFIX + not.iconData;
					}
				}
				if (not.image) {
					pushIconToDownloadIfNeeded(image, not.image);
				} else {
					image.style.display = "none";
				}
				var date_format = "#hh#:#mm#";
				if (back.get12HourFormat()) {
					date_format = date_format + " #AMPM#";
				}
				dateElement.innerHTML = new Date(not.date).customFormat(date_format);
				titleElement.innerHTML = await back.sanitizeHTML(not.title);
				var notificationText = null;
				if (not.lines && not.lines.length > 0) {
					var linesText = "";
					not.lines.doForAll(function (line) {
						linesText += line + "<br/>";
					});
					notificationText = linesText;
				} else {
					notificationText = not.text.replace(/(?:\r\n|\r|\n)/g, '<br />');
				}
				if (!notificationText) {
					notificationText = "";
				}
				textElement.innerHTML = await back.sanitizeAndCreateLinksInHtml(notificationText);
				var buttonsElement = notificationElement.querySelector("#buttons");
				if (not.buttons) {
					buttonsElement.style.display = "flex";
					for (var e = 0; e < not.buttons.length; e++) {
						var button = not.buttons[e];
						if (button.actionId == Constants.ACTION_DIALOG_NOTIFICATION) {
							continue;
						}
						var buttonElement = notificationButtonHtml.cloneNode(true);
						var buttonTextElement = buttonElement.querySelector("#text");
						// var buttonIconElement = buttonElement.querySelector("#icon");
						// if(!button.icon){
						//     button.icon = not.appIcon;
						// }
						// pushIconToDownloadIfNeeded(buttonIconElement,button.icon);
						buttonTextElement.innerHTML = await back.sanitizeHTML(button.text);
						buttonElement.id = button.actionId;
						buttonsElement.appendChild(buttonElement);
					};
				} else {
					buttonsElement.style.display = "none";
				}
				/*if(not.replyId){
					buttonsElement.style.display = "flex";
					var buttonElement = notificationButtonHtml.cloneNode(true);
					var buttonTextElement = buttonElement.querySelector("#text");
					// var buttonIconElement = buttonElement.querySelector("#icon");
					buttonTextElement.innerHTML = Constants.REPLY_DIRECTLY;
					// buttonIconElement.src = "icons/reply.png"
					buttonElement.id = not.replyId;
					buttonsElement.appendChild(buttonElement);
				}*/
				doGetBase64Images(iconsToDownload, null/*results => back.eventBus.post(new back.Events.NotificationImagesLoaded(results))*/);
			}

			var closeButton = notificationElement.querySelector("#closebutton");
			closeButton.notification = not;
			if (not.persistent) {
				closeButton.style.display = "none";
			} else {
				// CHANGE NOTE: Doesn't appear to do anything. Commented out for now.
				// closeButton.style.display = "block";
				closeButton.onclick = async function (event) {
					var not = event.currentTarget.notification;
					console.log("Cancelling: ");
					console.log(not);
					await back.cancelNotification(not, await back.getAddDismissEverywhereButton());
					await writeNotifications();
				};
			}
			var notificationright = notificationElement.querySelector("#notificationright");
			notificationright.notification = not;
			if (not.actionId || await getNotificationPage(not)) {
				notificationright.style.cursor = "pointer";
			}
			notificationright.onclick = async function (event) {
				var url = event.target["href"]
				if (url) {
					event.preventDefault();
					openTab(url);
					return true;
				}
				var not = event.currentTarget.notification;
				var opened = await openNotificationPage(not);
				if (!opened) {
					console.log("Doing content action: ");
					console.log(not);
					await back.doNotificationAction({ notificationId: not.id, actionId: not.actionId })
				}
			};
			if (not.buttons) {
				for (var j = 0; j < not.buttons.length; j++) {
					var button = not.buttons[j];
					if (button.actionId == Constants.ACTION_DIALOG_NOTIFICATION) {
						continue;
					}
					var buttonElement = notificationElement.querySelector("[id='" + button.actionId + "']")
					buttonElement.notification = not;
					buttonElement.onclick = async function (event) {
						var not = event.currentTarget.notification;
						console.log("Doing button action: ");
						console.log(not);
						await back.doNotificationAction({ notificationId: not.id, actionId: event.currentTarget.id })
					};
				}
			}

			notificationsElement.appendChild(notificationElement);

		};

		UtilsDom.replaceAllSvgInline((image, svg) => {
			svg.notification = image.notification;
		});
	} finally {
		writingNotifications = false;
		semaphore.release();
	}
}
// writeNotifications();

var notificationsUpdated = async function (event) {
	await writeNotifications();
}
notificationsUpdated();
back.addEventListener('notificationsupdated', notificationsUpdated, false);

addEventListener("unload", function (event) {
	back.console.log("Unloading notifications...");
	back.removeEventListener("notificationsupdated", notificationsUpdated, false);
}, true);
