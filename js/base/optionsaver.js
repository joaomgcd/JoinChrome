var getOptionType = function (option) {
	if (option.attributes.type) {
		return option.attributes.type.textContent;
	} else {
		return option.localName;
	}
}
var getOptionDelayed = function (option) {
	if (option.attributes.delayed) {
		return true;
	} else {
		return false;
	}
}
var isOptionUndefined = function (value) {
	return !value || value == "undefined" || value == "null" || value == "";
}
var optionSavers = [
	{
		"type": "text",
		"saveevent": "keyup",
		"save": function (option) {
			localStorage[option.id] = option.value;
		},
		"load": function (option) {
			option.value = this.getValue(option, getDefaultValue(option));
		},
		"getValue": function (option, defaultValue) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
			}
			var value = localStorage[id];
			if (isOptionUndefined(value)) {
				if (!defaultValue) {
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id, defaultValue);
			}
			return value;
		}, "setDefaultValue": function (option) {
			if (!option.value) {
				var defaultValue = getDefaultValue(option);
				if (!isOptionUndefined(defaultValue)) {
					option.value = defaultValue;
				}
			}

		}
	},
	{
		"type": "textarea",
		"saveevent": "keyup",
		"save": function (option) {
			localStorage[option.id] = option.value;
		},
		"load": function (option) {
			option.value = this.getValue(option, getDefaultValue(option));
		},
		"getValue": function (option, defaultValue) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
			}
			var value = localStorage[id];
			if (isOptionUndefined(value)) {
				if (!defaultValue) {
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id, defaultValue);
			}
			return value;
		}, "setDefaultValue": function (option) {
			if (!option.value) {
				var defaultValue = getDefaultValue(option);
				if (!isOptionUndefined(defaultValue)) {
					option.value = defaultValue;
				}
			}

		}
	}, {
		"type": "checkbox",
		"saveevent": "click",
		"save": async function (option, value) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
				value = option.checked;
			}
			localStorage[id] = value;
			var onSaveFunc = window["on" + id + "save"];
			if (onSaveFunc) {
				await onSaveFunc(option, value);
			}
		},
		"load": function (option) {
			option.checked = this.getValue(option, getDefaultValue(option));
		},
		"getValue": function (option, defaultValue) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
			}
			var value = localStorage[id];
			if (isOptionUndefined(value)) {
				value = defaultValue;
				this.save(id, defaultValue);
			} else if (value == "false") {
				value = false;
			} else {
				value = true;
			}
			return value;
		}, "setDefaultValue": function (option) {
			if (this.getValue(option, null) == null) {
				var defaultValue = getDefaultValue(option);
				option.checked = defaultValue;
			}
		}
	}, {
		"type": "select",
		"saveevent": "change",
		"save": function (option) {
			localStorage[option.id] = option.value;
		},
		"load": function (option) {
			option.value = this.getValue(option, getDefaultValue(option));
			if (option.funcOnChange) {
				option.funcOnChange();
			}
		},
		"getValue": function (option, defaultValue) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
			}
			var value = localStorage[id];
			if (isOptionUndefined(value)) {
				if (!defaultValue) {
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id, defaultValue);
			}
			return value;
		}, "setDefaultValue": function (option) {
			if (!option.value) {
				var defaultValue = getDefaultValue(option);
				if (!isOptionUndefined(defaultValue)) {
					option.value = defaultValue;
				}
			}

		}
	}, {
		"type": "color",
		"saveevent": "change",
		"save": function (option) {
			localStorage[option.id] = option.value;
		},
		"load": function (option) {
			option.value = this.getValue(option, getDefaultValue(option));
			if (option.funcOnChange) {
				option.funcOnChange();
			}
		},
		"getValue": function (option, defaultValue) {
			var id = null;
			if (typeof option == "string") {
				id = option;
			} else {
				id = option.id;
			}
			var value = localStorage[id];
			if (isOptionUndefined(value)) {
				if (!defaultValue) {
					defaultValue = "";
				}
				value = defaultValue;
				this.save(id, defaultValue);
			}
			return value;
		}, "setDefaultValue": function (option) {
			if (!option.value) {
				var defaultValue = getDefaultValue(option);
				if (!isOptionUndefined(defaultValue)) {
					option.value = defaultValue;
				}
			}

		}
	}
];
var getOptionSaver = function (option) {
	for (var i = 0; i < optionSavers.length; i++) {
		var optionSaver = optionSavers[i];
		var type = typeof option == "string" ? option : getOptionType(option);
		if (optionSaver.type == type) {
			return optionSaver;
		}
	}
}

var deviceSufix = "=:=DeviceAutoClipboard=:=";
var getDeviceIdsToSendAutoClipboard = function () {
	var deviceIds = [];
	for (var i = 0; i < devices.length; i++) {
		var device = devices[i];
		if (device.deviceId == localStorage.deviceId) {
			continue;
		}
		if (UtilsDevices.isDeviceGroup(device) || UtilsDevices.isDeviceShare(device)) {
			continue;
		}
		var key = device.deviceId + deviceSufix;
		var enabled = localStorage[key] == null || localStorage[key] == "true";
		if (enabled) {
			deviceIds.push(device.deviceId);
		}
	};
	return deviceIds;
}

var getOptionValue = function (type, id, defaultValue) {
	if (!defaultValue) {
		defaultValue = getDefaultValue(id);
	}
	var optionSaver = getOptionSaver(type);
	return optionSaver.getValue(id, defaultValue);
}
var saveOptionValue = function (type, id, value) {
	var optionSaver = getOptionSaver(type);
	return optionSaver.save(id, value);
}
var getDownloadScreenshotsEnabled = function () {
	return getOptionValue("checkbox", "downloadscreenshots");
}
var getOpenLinksEnabled = function () {
	return getOptionValue("checkbox", "autoopenlinks");
}
var getDownloadVideosEnabled = function () {
	return getOptionValue("checkbox", "downloadvideos");
}
var get12HourFormat = function () {
	return getOptionValue("checkbox", "12hrformat");
}
var getTheme = function () {
	return getOptionValue("select", "theme");
}
var getAutoClipboard = function () {
	return getOptionValue("checkbox", "autoclipboard");
}
var getClipboardNotificationShowContents = function () {
	return getOptionValue("checkbox", "clipboardnotificationshowcontents");
}
var getAutoClipboardNotification = function () {
	return getOptionValue("checkbox", "autoclipboardnotification");
}
var getFavoriteCommand = function () {
	return getOptionValue("select", "select_favourite_command");
}
var getFavoriteCommandDevice = function () {
	return getOptionValue("select", "select_favourite_command_device");
}
var getNotificationSeconds = function () {
	return getOptionValue("text", "notificationseconds");
}
var getNotificationIgnoreOldPushes = function () {
	return getOptionValue("text", "notificationignoreoldpushes");
}
var getNotificationRequireInteraction = function () {
	return getOptionValue("checkbox", "notificationrequireinteraction");
}
var getAddDismissEverywhereButton = function () {
	return getOptionValue("checkbox", "adddimisseverywherebutton");
}
var getNeverShowSimilarNotifications = function () {
	return getOptionValue("checkbox", "nevershowsimilarnotifications");
}
var getBetaEnabled = function () {
	return getOptionValue("checkbox", "showbetafeatures");
}
var getNotificationSound = function () {
	return getOptionValue("text", "notificationsound");
}
var getNotificationWebsites = function () {
	return getOptionValue("textarea", "notificationwebsites");
}
var getNotificationNoPopupPackages = function () {
	return getOptionValue("textarea", "notificationnopopuppackages");
}
var getShowChromeNotifications = function () {
	return getOptionValue("checkbox", "chromenotifications");
}
var setShowChromeNotifications = function (value) {
	saveOptionValue("checkbox", "chromenotifications", value);
}
var getPrefixTaskerCommands = function () {
	return getOptionValue("checkbox", "prefixtaskercommands");
}
var getHideNotificationText = function () {
	return getOptionValue("checkbox", "hidenotificationtext");
}
var getPlayNotificationSound = function () {
	return getOptionValue("checkbox", "playnotificationsound");
}
var getAlternativePopupIcon = function () {
	return getOptionValue("checkbox", "alternativeicon");
}
var getHideNotificationCount = function () {
	return getOptionValue("checkbox", "hidenotificationcount");
}
var getHideContextMenu = function () {
	return getOptionValue("checkbox", "hidecontextmenu");
}
var getDontPromptUserLogin = function () {
	return getOptionValue("checkbox", "dontpromptuserlogin");
}
var getShowInfoNotifications = function () {
	return getOptionValue("checkbox", "showinfonotifications");
}
var getEventghostPort = function () {
	return getOptionValue("text", "eventghostport");
}
var getEventghostServer = function () {
	return getOptionValue("text", "eventghostserver");
}
var getRedirectFullPush = function () {
	return getOptionValue("checkbox", "redirectionfullpush");
}
var getFavoriteCommandText = function () {
	return getOptionValue("text", "text_favourite_command");
}
var getVoiceEnabled = function () {
	return getOptionValue("checkbox", "voiceenabled");
}
var getVoiceContinuous = function () {
	return getOptionValue("checkbox", "voicecontinuous");
}
var getVoiceWakeup = function () {
	return getOptionValue("text", "voicewakeup");
}
var getThemeAccentColor = function () {
	return getOptionValue("color", "themeColorPicker");
}
var getDefaultTab = function () {
	return getOptionValue("select", "defaulttabb");
}
var onvoiceenabledsave = async function(option, value) {
	if (!option) {
		return;
	}
	if (!option.ownerDocument) {
		return;
	}
	var continuousOption = option.ownerDocument.querySelector("#voicecontinuous");
	var continuousSection = option.ownerDocument.querySelector("#continuoussection");
	if (!value) {
		setVoiceContinuous(false);
		continuousOption.checked = false;
		continuousSection.classList.add("hidden");
	} else {
		continuousSection.classList.remove("hidden");
	}
};
var setVoiceContinuous = function (enabled) {
	saveOptionValue("checkbox", "voicecontinuous", enabled);
}
var onvoicecontinuoussave = async function (option, value) {
	console.log("Continuous: " + value);
	var callbackPromptFunc = (prompt, notificationTime) => {
		return new Promise(function (resolve, reject) {
			if (UtilsObject.isString(prompt)) {
				chrome.tts.speak(prompt, {
					"lang": 'en-US',
					"onEvent": function (event) {
						if (event.type == 'end' || event.type == 'error' || event.type == 'interrupted' || event.type == 'cancelled') {
							resolve();
						}
					}
				});
				showNotification("Voice", prompt, notificationTime);
			} else {
				console.error("Prompt is not text");
				console.error(prompt);
			}
		});
	};
	var errorFunc = error => {
		callbackPromptFunc(error, 10000);
	};
	if (value) {
		try {
			await UtilsVoice.voiceRecognizer.isMicAvailable();
		} catch (error) {
			setVoiceContinuous(false);
			chrome.tts.speak("Click the generated notification to enable your mic");
			var chromeNotification = new ChromeNotification({
				"id": "micnotavailable",
				"title": "Error",
				"text": "Click here to allow Join to access your microphone",
				"url": "chrome-extension://flejfacjooompmliegamfbpjjdlhokhj/options.html"
			});
			chromeNotification.notify();
		}
	}
	UtilsVoice.toggleContinuous(() => devices, getVoiceWakeup, getVoiceContinuous, callbackPromptFunc, null, errorFunc);
};
var onautoclipboardsave = function (option, value) {
	console.log("Auto clipboard: " + value);
	if (handleAutoClipboard) {
		handleAutoClipboard();
	}
}

var getDefaultValue = function (option) {
	var id = null;
	if (typeof option == "string") {
		id = option;
	} else {
		id = option.id;
	}
	return defaultValues[id];
}
var defaultValues = {
	"downloadscreenshots": true,
	"downloadvideos": false,
	"12hrformat": false,
	"autoclipboard": false,
	"clipboardnotificationshowcontents": true,
	"autoclipboardnotification": true,
	"chromenotifications": true,
	"notificationwebsites": JSON.stringify(notificationPages, null, 1),
	"notificationnopopuppackages": "",
	"prefixtaskercommands": false,
	"hidenotificationtext": false,
	"hidenotificationcount": false,
	"hidecontextmenu": false,
	"dontpromptuserlogin": false,
	"playnotificationsound": true,
	"showinfonotifications": true,
	"autoopenlinks": true,
	"notificationrequireinteraction": false,
	"adddimisseverywherebutton": true,
	"showbetafeatures": false,
	"voiceenabled": false,
	"voicecontinuous": false,
	"voicewakeup": "computer",
	"themeColorPicker": "#FF9800",
	"theme": "auto",
	"defaulttabb": "auto",
	"favoritepageOpenenable": true,
	"favoriteselectionPasteenable": true,
	"favoritelinkOpenenable": true,
	"favoriteimageDownloadenable": true,
	"favoritevideoDownloadenable": true,
	"favoriteaudioDownloadenable": true
};