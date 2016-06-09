
/*************************CONSTANTS***********************/

//var joinserverBase =  "http://192.168.1.67:8080/";
var joinserverBase =  "https://joinjoaomgcd.appspot.com/";

var joinserver =  joinserverBase + "_ah/api/";


var TEST_PUSH_TEXT = "###Testing Join###";
var TEST_PUSH_EVENT = "testpush";
var EVENT_SMS_HANDLED = "smshandled";
var JOIN_ICON = "icon.png";
var ICON_DATA_PREFIX = "data:image/jpeg;base64,";
var CHROME_EXTENSION_URL = "chrome-extension://flejfacjooompmliegamfbpjjdlhokhj/";
var DEVICES_POPUP_URL = CHROME_EXTENSION_URL + "devices.html?tab=devices";
var AUTH_CALLBACK_URL = "https://joinjoaomgcd.appspot.com/authorize.html";
//var AUTH_CALLBACK_URL = "https://"+chrome.runtime.id+".chromiumapp.org/chrome-extension"

var REQUEST_TYPE_SCREENSHOT = 1;
var REQUEST_TYPE_VIDEO = 2;
var REQUEST_TYPE_CONTACTS = 3;
var REQUEST_TYPE_SMS_HISTORY = 4;
var REQUEST_TYPE_NOTIFICATIONS = 5;

var DEVICE_TYPE_ANDROID_PHONE = 1;
var DEVICE_TYPE_ANDROID_TABLET = 2;
var DEVICE_TYPE_CHROME_BROWSER = 3;
var DEVICE_TYPE_WIDNOWS_PC = 4;
var DEVICE_TYPE_FIREFOX = 6;
var DEVICE_TYPE_GROUP = 7;
var DEVICE_TYPE_ANDROID_TV = 8;


var GCM_PARAM_TIME_TO_LIVE = "time_to_live";
var GCM_PARAM_PRIORITY = "priority";
var GCM_MESSAGE_PRIORITY_HIGH = "high";
var GCM_PARAM_DELAY_WHILE_IDLE = "delay_while_idle";

var createNamespace =function(object, namespace){
	var names = namespace.split(".");
	for (var i = 0; i < names.length; i++) {
		var name = names[i];
		if(!object[name]){
			object[name] = {};
			object = object[name];
		}
	}
}

createNamespace(this,"joindevices.groups");
joindevices.groups.DeviceGroup = function(id, name){
	this.id = id;
	this.name = name;
	this.devices = [];
}
var DEVICE_GROUP_ALL = new joindevices.groups.DeviceGroup("all","All");
var DEVICE_GROUP_ANDROID = new joindevices.groups.DeviceGroup("android","Androids");
var DEVICE_GROUP_CHROME = new joindevices.groups.DeviceGroup("chrome","Chromes");
var DEVICE_GROUP_WINDOWS10 = new joindevices.groups.DeviceGroup("windows10", "Windows 10s");
var DEVICE_GROUP_FIREFOX = new joindevices.groups.DeviceGroup("firefox", "Firefoxes");
var DEVICE_GROUP_PHONE = new joindevices.groups.DeviceGroup("phone","Phones");
var DEVICE_GROUP_TABLET = new joindevices.groups.DeviceGroup("tablet","Tablets");
var DEVICE_GROUP_PC = new joindevices.groups.DeviceGroup("pc","PCs");

joindevices.groups.DeviceGroups = function(){
	var me = this;
	this.allDeviceGroups = [DEVICE_GROUP_ALL,DEVICE_GROUP_ANDROID,DEVICE_GROUP_CHROME,DEVICE_GROUP_WINDOWS10,DEVICE_GROUP_FIREFOX,DEVICE_GROUP_PHONE,DEVICE_GROUP_TABLET,DEVICE_GROUP_PC];
	this.androidGroups = [DEVICE_GROUP_ANDROID,DEVICE_GROUP_PHONE,DEVICE_GROUP_TABLET];
	this.deviceTypeGroups = {};

	this.deviceTypeGroups[DEVICE_TYPE_ANDROID_PHONE] = [DEVICE_GROUP_ALL,DEVICE_GROUP_ANDROID,DEVICE_GROUP_PHONE];
	this.deviceTypeGroups[DEVICE_TYPE_ANDROID_TABLET] = [DEVICE_GROUP_ALL,DEVICE_GROUP_ANDROID,DEVICE_GROUP_TABLET];
	this.deviceTypeGroups[DEVICE_TYPE_CHROME_BROWSER] = [DEVICE_GROUP_ALL,DEVICE_GROUP_CHROME,DEVICE_GROUP_PC];
	this.deviceTypeGroups[DEVICE_TYPE_WIDNOWS_PC] = [DEVICE_GROUP_ALL,DEVICE_GROUP_WINDOWS10,DEVICE_GROUP_PC];
	this.deviceTypeGroups[DEVICE_TYPE_FIREFOX] = [DEVICE_GROUP_ALL,DEVICE_GROUP_FIREFOX,DEVICE_GROUP_PC];
	this.deviceTypeGroups[DEVICE_TYPE_ANDROID_TV] = [DEVICE_GROUP_ALL,DEVICE_GROUP_ANDROID];
	this.putDevicesIntoGroups = function(devices){
		//Group devices into groups
		for (var i = 0; i < this.allDeviceGroups.length; i++) {
			var deviceGroup = this.allDeviceGroups[i];
			deviceGroup.devices = devices.where(function(device){
				return device.deviceType != DEVICE_TYPE_GROUP && me.deviceTypeGroups[device.deviceType].indexOf(deviceGroup) >=0;
			});
		}
		//Check equal groups and remove devices from them
		for (var i = 0; i < this.allDeviceGroups.length; i++) {
			var deviceGroup = this.allDeviceGroups[i];
			var otherGroupsThatAreTheSame = this.allDeviceGroups.where(function(deviceGroupToSearch){
				return deviceGroupToSearch != deviceGroup && deviceGroupToSearch.devices.equalsArrayAnyOrder(deviceGroup.devices);
			});
			otherGroupsThatAreTheSame.doForAll(function(groupToRemoveDevices){
				groupToRemoveDevices.devices = [];
			});
		}
		//console.log(me.allDeviceGroups);
		//
		/*for (var groupId in deviceGroupsToCreate) {
			var devicesForGroup = deviceGroupsToCreate[groupId];
		}*/
	}
	this.getGroups = function(devices){
		this.putDevicesIntoGroups(devices);
		return this.allDeviceGroups.where(function(deviceGroup){
			return deviceGroup.devices.length > 1;
		});
	}
	this.GROUP_PREFIX = "group.";
	this.getGroupDevices = function(devices, groupId){
		if(groupId == null){
			return [];
		}
		if(groupId.indexOf(this.GROUP_PREFIX)==0){
			groupId = groupId.substring(this.GROUP_PREFIX.length);
		}
		this.putDevicesIntoGroups(devices);
		var group = this.allDeviceGroups.first(function(deviceGroup){
			return deviceGroup.id == groupId;
		});
		if(!group){
			return [];
		}
		return group.devices;
	}

}
joindevices.groups.deviceGroups = new joindevices.groups.DeviceGroups();

var RESPONSE_TYPE_PUSH = 0;
var RESPONSE_TYPE_FILE = 1;
var back = chrome.extension.getBackgroundPage();
var doPostWithAuth = back.doPostWithAuth;

/***********************************************************/

/*************************NOTIFICATION PAGES***********************/
var notificationPages = {
	"com.google.android.gm":"https://mail.google.com/mail/u/0/#search/is%3Aunread",
	"com.joaomgcd.autoinput":"http://joaoapps.com/autoinput/",
	"com.joaomgcd.autovoice":"http://joaoapps.com/autovoice/",
	"com.facebook.lite":"https://www.facebook.com/notifications",
	"com.facebook.katana":"https://www.facebook.com/notifications",
	"com.google.android.talk":"https://hangouts.google.com/",
	"com.whatsapp":"https://web.whatsapp.com/",
	"com.google.android.youtube":"https://www.youtube.com/feed/subscriptions",
	"com.google.android.apps.plus":"https://plus.google.com/u/0/notifications/all"
};
var copyUserNotificationPages = function(){
	try{
		var userCreated = JSON.parse(back.getNotificationWebsites());
		for(var prop in userCreated){
			notificationPages[prop] = userCreated[prop];
		}
	}catch(err){
		console.log("Error using user notification pages:");
		console.log(err);
	}
}
var getNotificationPage = function(notification){
	if(notification.url){
		return notification.url;
	}
	copyUserNotificationPages();
	return notificationPages[notification.appPackage];
}
var openNotificationPage = function(notification){
	copyUserNotificationPages();
	var appPage = getNotificationPage(notification);
	if(appPage){
		openTab(appPage);
	}
	return appPage;
}
/***********************************************************/
/*************************EVENTS***********************/
var fire = function(nameOfEvent,description){
	var event = new CustomEvent(nameOfEvent, { "description": description });
	document.dispatchEvent(event);
}
var dispatch = function(eventName, data){
	var event = new Event(eventName);
	event.applyProps(data);
	back.dispatchEvent(event);
}
/***********************************************************/
/*************************GOOGLE DRIVE***********************/
var getFolderId = function(callback,path,parentId){
	var getFolderIdForName = function(callback,name,parentId){
		var query = "name='"+name+"'";
		if(parentId){
			query += " and '"+parentId+"' in parents";
		}
		query = encodeURIComponent(query);
		doGetWithAuth("https://www.googleapis.com/drive/v3/files?q="+query,function(result){
			if(!result || !result.files || result.files.length == 0){
				var createOptions = {"name":name,"mimeType":"application/vnd.google-apps.folder"};
				if(parentId){
					createOptions.parents = [parentId];
				}
				doPostWithAuth("https://www.googleapis.com/drive/v3/files",createOptions,function(createResult){
					callback(createResult.id);
				},function(error){
					console.log("Error: " + error);
				})
				return;
			}else{
				callback(result.files[0].id);
			}
		},function(error){
			console.log("Error: " + error);
		});
	}
	if(path.indexOf("/")>=0){
		var split = path.split("/");
		split.doForChain(function(name,parentId,callback){
			getFolderIdForName(callback,name,parentId);
		},callback);
	}else{
		getFolderIdForName(callback,path,parentId);
	}
}

/***********************************************************/

/*************************HTML STUFF***********************/
var getUrlIfTextMatches = function(texts){
	for (var i = 0; i < texts.length; i++) {
		var text = texts[i];
		if(text){
			var indexHttp = text.indexOf("http");
			if(indexHttp>=0){
			  var url = text.substring(indexHttp);
			  var indexSpace = url.indexOf(" ");
			  if(indexSpace > 0){
				url = url.substring(0, indexSpace);
			  }
			  return url;
			}
		}
	};
}
var getURLParameter = function(name,url) {
	if(!url){
		url = window.location.href;
	}
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url)||[,""])[1].replace(/\+/g, '%20'))||null
}
var createElement = function(parent, tag, id, attributes) {
	var el = document.createElement(tag);
	if (id!=null) {
		el.setAttribute('id', id);
	}
	if (attributes !== undefined) {
		for (attribute in attributes) {
			var attributeName = attribute;
			var attributeValue = attributes[attribute];
			//no caso do IE tem que se usar a propriedade "className" senão o estilo não é aplicado. Também são usadas regras CSS específicas para IE porque este não suporta animações
			if (attributeName == "class" && !document.createEvent) { //IE
				el.className = attributeValue + "IE";
			} else { //Non-IE
				el.setAttribute(attribute, attributeValue);
			}
		}
	}
	parent.appendChild(el);
	return el;
}
var baseDriveUrlFiles = "https://www.googleapis.com/drive/v2/files/";
var getDriveUrlFromFileId = function(fileId){
	if(!fileId){
		return null;
	}
	if(fileId.indexOf(".")>=0){
		return fileId;
	}
	return  baseDriveUrlFiles + fileId + "?alt=media";
}
var getDeviceFileIdFromUrl = function(fileUrl){
	if(fileUrl.indexOf("drive.google.com/file/d")<0){
		return null;
	}
	var match = fileUrl.match(/[^/\\.\\?&=]{20,}/);
	if(!match || match.length==0){
		return null;
	}
	return match[0];
}
var showPopup = function(url, height, width){
	chrome.windows.create({"focused":false, url: url, type: 'detached_panel' , left: screen.width - width, top: Math.round((screen.height / 2) - (height /2)), width : width, height: height});
}
var jump = function(h){
  if(!h){
	h = "";
  }
	var url = window.location.href;               //Save down the URL without hash.
	location.href = "#"+h;                 //Go to the target element.
};
/***********************************************************/
/*************************BASE64***********************/

function base64ArrayBuffer(arrayBuffer) {
	var base64 = ''
	var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	var bytes = new Uint8Array(arrayBuffer)
	var byteLength = bytes.byteLength
	var byteRemainder = byteLength % 3
	var mainLength = byteLength - byteRemainder

	var a, b, c, d
	var chunk

	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
		// Combine the three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
		b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
		c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
		d = chunk & 63 // 63       = 2^6 - 1

		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	}

	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
		chunk = bytes[mainLength]

		a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

		// Set the 4 least significant bits to zero
		b = (chunk & 3) << 4 // 3   = 2^2 - 1

		base64 += encodings[a] + encodings[b] + '=='
	} else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

		a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

		// Set the 2 least significant bits to zero
		c = (chunk & 15) << 2 // 15    = 2^4 - 1

		base64 += encodings[a] + encodings[b] + encodings[c] + '='
	}

	return base64
}
var doGetBase64 = function(url, callback) {

	if (url == null || url == "") {
		callback(null);
		return;
	}
	if(url.indexOf("http") < 0){
		callback(url);
		return;
	}
	chrome.extension.getBackgroundPage().getToken(function(accessToken){
		console.log("Getting binary: " + url);
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		if(isDriveUrl(url)){
			xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		}
		xhr.responseType = 'arraybuffer';
		xhr.onload = function(e) {
			callback(base64ArrayBuffer(e.currentTarget.response));
		};
		xhr.onerror = function(e) {
			callback(null);
		};
		xhr.send();
	});

}
var downloadDriveString = function(filename,callback,callbackError){
	var localFile = localStorage[filename];
	if(localFile){
	   //callback(JSON.parse(localFile));
	}
	setRefreshing(true);
	var url = "https://www.googleapis.com/drive/v3/files?q=name+%3D+'"+encodeURIComponent(filename)+"'";
	doGetWithAuth(url,function(fileInfo){
		// console.log("Got drive file info");
		// console.log(fileInfo);
		if(!fileInfo){
			callbackError("Couldn't get file info for " + filename);
			return;
		}
		if(!fileInfo.files || fileInfo.files.length == 0){
			callbackError("File doesn't exist on your google drive: " + filename);
			return;
		}
		var fileId = fileInfo.files[0].id;
		if(!fileId){
			callbackError("File ID not present for " + filename);
			return;
		}
		// console.log("Found file ID: " + fileId);
		var downloadUrl = "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media";
		doGetWithAuth(downloadUrl,function(result){
			setRefreshing(false);
			localStorage[filename] = JSON.stringify(result);
			callback(result);
		},callbackError);
	},callbackError);
}
var isDriveUrl = function(url){
	return url.indexOf("drive.google") > 0 || url.indexOf("docs.google")>0 || url.indexOf("googleapis.com")>0 ;
}
var doGetBase64Image = function(url, callback) {
	if (url == null || url == "") {
		callback(null);
		return;
	}
	if(url.indexOf("http") < 0){
		callback(url);
		return;
	}
	doGetBase64(url, function(base64) {
		if (base64 != null) {
			base64 = "data:image/png;base64," + base64
		}
		callback(base64);
	});
}

var doGetBase64Images = function(imagesToDownload,callback) {

	imagesToDownload.doForAllAsync(function(imageToDownload,callback){
		doGetBase64Image(imageToDownload.url,callback);
	},function(results){
		for (var i = 0; i < imagesToDownload.length; i++) {
			var imageToDownload = imagesToDownload[i];
			var result = results[i];
			var element = imageToDownload.element;
			if(element){
				element.src = result;
			}
		};
		if(callback){
			callback(results);
		}
	});
}

/***********************************************************/

/*************************ARRAYS***********************/
Array.prototype.removeIf = function(callback) {
	var removed = 0;
	var i = 0;
	while (i < this.length) {
		if (callback(this[i], i)) {
			this.splice(i, 1);
			removed++;
		}
		else {
			++i;
		}
	}
	return removed;
};
Array.prototype.select = function(func) {
	var result = [];
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		result.push(func(item));
	};
	return result;
};
Array.prototype.doForAll = function(func) {
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		func(item,i);
	};
};
Array.prototype.where = function(func) {
	var result = [];
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		if(func(item)){
			result.push(item);
		}
	};
	return result;
};
Array.prototype.equalsArray = function(arr2) {
	if(this.length !== arr2.length)
		return false;
	for(var i = this.length; i--;) {
		if(this[i] !== arr2[i])
			return false;
	}

	return true;
}
Array.prototype.equalsArrayAnyOrder = function(arr2) {
	if(this.length !== arr2.length)
		return false;
	for(var i = this.length; i--;) {
		if(arr2.indexOf(this[i])<0){
			return false;
		}
	}
	for(var i = arr2.length; i--;) {
		if(this.indexOf(arr2[i])<0){
			return false;
		}
	}

	return true;
}
Array.prototype.first = function(func) {
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		if(func(item)){
			return item;
		}
	};
	return null;
};
Array.prototype.joinJoaomgcd = function(joiner) {
	if(!joiner){
		joiner=",";
	}
	var joined = "";
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		if(i>0){
			joined += joiner;
		}
		joined += item;
	};
	return joined;
};
Array.prototype.doForAllAsync = function(func, callbackFinal, shouldProcessItem, callbackEach) {
  var me = this;
  var count = -1;
  var results = [];
  var doAll = function(callback){
	count++;
	if(count == me.length){
	  callback(results);
	}else{
		var item = me[count];
		if(!shouldProcessItem || shouldProcessItem(item)){
			func(item,function(result){
				results.push(result);
				if(callbackEach){
					callbackEach(result, count);
				}
				doAll(callback);
			});
		}else{
			results.push(null);
			doAll(callback);
		}

	}
  };
  doAll(callbackFinal);
};
Array.prototype.doForChain = function(func, callbackFinal) {
  var me = this;
  var count = -1;
  var preivousResult = null;
  var doAll = function(callback){
	count++;
	if(count == me.length){
	  callback(preivousResult);
	}else{
		var item = me[count];
		func(item,preivousResult,function(result){
			preivousResult = result;
			doAll(callback);
		});


	}
  };
  doAll(callbackFinal);
};

/***********************************************************/
/*************************CRYPT***********************/
var encrypt = function(text, password){
	if(!text || text.length == 0){
		return text;
	}
	if(!password){
		password = localStorage.encryptionPassword;
	}
	if(!password){
		return text;
	}
	var isString = (typeof text) == "string";
	var isArray = Object.prototype.toString.call(text);
	if(isString){
		return encryptString(text,password);
	}else if(isArray){
		return encryptArray(text,password);
	}
}
var encryptArray = function(texts, password){
	//return texts;  //HERE UNTIL I'M REGISTERED
	if(!password){
		password = localStorage.encryptionPassword;
	}
	if(!password){
		return texts;
	}
	return texts.select(function(text){
		return encryptString(text,password);
	});
}
var encryptString = function(text, password){
	//return text; //HERE UNTIL I'M REGISTERED
	if(!password){
		password = localStorage.encryptionPassword;
	}
	if(!password){
		return text;
	}
	var key = CryptoJS.enc.Base64.parse(password);
	var iv = CryptoJS.lib.WordArray.random(16);
	var ivBase64 = CryptoJS.enc.Base64.stringify(iv);
	var encrypted = CryptoJS.AES.encrypt(text, key, {iv: iv});
	var encryptedText = encrypted.toString();
	var finalString = ivBase64 + "=:=" + encryptedText
	return finalString;
}
var getStoredKey = function(){
	var stored = localStorage.encryptionPassword;
	if(!stored){
		return null;
	}
	return CryptoJS.enc.Base64.parse(stored);
}
var decryptFields = function(obj){
	if(!localStorage.encryptionPassword){
		return;
	}
	if(!obj.senderId){
		return;
	}
	var key256Bits = getStoredKey();
	for(var prop in obj){
		var value = obj[prop];
		var isString = (typeof value) == "string";
		var isArray = Object.prototype.toString.call(value);
		if(value && value.length > 0){
			var result = null;
			if(isString){
				result = decryptString(value, key256Bits);
			}else if(isArray){
				result = decryptArray(value, key256Bits);
			}
			obj[prop] = result;
		}
	}
}
var decryptArray = function(values, key256Bits){
	//return values;  //HERE UNTIL I'M REGISTERED
	if(!values || values.length == 0){
		return values;
	}
	if(!localStorage.encryptionPassword){
		return values;
	}
	if(!key256Bits){
		key256Bits = getStoredKey();
	}
	var results = values.select(function(value){
		return decryptString(value,key256Bits);
	});
	return results;
}
var decryptString = function(value, key256Bits){
	//return value;  //HERE UNTIL I'M REGISTERED
	if(!value || value.length == 0){
		return value;
	}
	if(!localStorage.encryptionPassword){
		return value;
	}
	if(!key256Bits){
		key256Bits = getStoredKey();
	}
	var separatorIndex = value.indexOf("=:=");
	if(separatorIndex>0){
		var split = value.split("=:=");
		if(split.length==2){
			var iv = CryptoJS.enc.Base64.parse(split[0]);
			var encrypted = CryptoJS.enc.Base64.parse(split[1]);
			var decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted },key256Bits, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7, iv: iv});
			var decryptedString = CryptoJS.enc.Utf8.stringify(decrypted);
			if(decryptedString && decryptedString.length>0){
				return decryptedString;
			}
		}
	}
	return value;
}

/***********************************************************/
/*************************GENERIC***********************/
var toClass = {}.toString;
var openNewTab = function(url,options, callback){
	chrome.windows.getCurrent({ 'populate': false }, function(current) {
		if (current) {
			if(!options){
				options = {};
			}
			options.url = url;
			chrome.tabs.create(options,callback);
		} else {
			var finalOptions = { 'url': url, 'type': 'normal', 'focused': true };
			if(options){
				for(var prop in options){
					finalOptions[prop] = options[prop];
				}
			}
			chrome.windows.create(finalOptions,callback);
		}
	});
}
var openTab = function(url,options,callback){
	chrome.tabs.query({},function(result){
		var correctTab = result.first(function(tab){
			return tab.url == url;
		});
		if(correctTab){
			var finalOptions = {selected: true};
			if(options){
				for(var prop in options){
					finalOptions[prop] = options[prop];
				}
			}
			chrome.tabs.update(correctTab.id, finalOptions,callback);
		}else{
			openNewTab(url,options,callback);
		}
	});
}
function guid() {
  function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
	  .toString(16)
	  .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	s4() + '-' + s4() + s4() + s4();
}
var getCliendId = function(){
	return chrome.runtime.getManifest().oauth2.client_id_web;
}
var getAuthUrl = function(selectAccount,background){
	var manifest = chrome.runtime.getManifest();
	var url = "https://accounts.google.com/o/oauth2/v2/auth?response_type=token";
	url += "&client_id=" + getCliendId();
	if(!background){
		url += "&redirect_uri=" + encodeURIComponent(AUTH_CALLBACK_URL);
	}else{
		url += "&redirect_uri=postmessage";
		url += "&origin=" + encodeURIComponent("https://joinjoaomgcd.appspot.com");
	}
	url += "&scope=" + encodeURIComponent(manifest.oauth2.scopes.joinJoaomgcd(" "));
	if(selectAccount){
		url += "&prompt=select_account";
	}
	return url;
}
/*var getRedirectUrl = function(url,callback){
	var req = new XMLHttpRequest();
	req.open("GET", "https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=596310809542-c2bg952rtmf05el5kouqlcf0ajqnfpdl.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Flocalhost:8080%2Fecho&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.appfolder%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&login_hint=joaomgcd@gmail.com", true);
	req.onload = function() {
		console.log("REDIRECT status: " + this.status);
	}
	req.onloadstart = function(e){
		console.log(e);
	}
	req.onerror = function(e) {
		console.log(e);
	}
	req.send();
}*/
var getRedirectUrl = function(url,callback){
	 var req = new XMLHttpRequest();
	//AQUI DEVE-SE CRIAR UMA PÁGINA LOCAL NA EXTENSION QUE RECEBE O TOKEN E FAZ O CALLBACK
	openTab("https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=596310809542-c2bg952rtmf05el5kouqlcf0ajqnfpdl.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost:8081%2Fauth.html&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.appfolder%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&login_hint=joaomgcd@gmail.com");
}
var onAuth = function(redirect_url){

}
var getUserInfo = function(callback,force,token){
	if(!localStorage){
		return;
	}
	if(localStorage.userinfo && !force){
		callback(JSON.parse(localStorage.userinfo));
		return;
	}
	back.doGetWithAuth("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", function(result){
	  localStorage.userinfo = JSON.stringify(result);
	  callback(result);
	},function(error){
		console.log("Error: " + error);
	},token);

}
Date.prototype.customFormat = function(formatString){
	var YYYY,YY,MMMM,MMM,MM,M,DDDD,DDD,DD,D,hhhh,hhh,hh,h,mm,m,ss,s,ampm,AMPM,dMod,th;
	YY = ((YYYY=this.getFullYear())+"").slice(-2);
	MM = (M=this.getMonth()+1)<10?('0'+M):M;
	MMM = (MMMM=["January","February","March","April","May","June","July","August","September","October","November","December"][M-1]).substring(0,3);
	DD = (D=this.getDate())<10?('0'+D):D;
	DDD = (DDDD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][this.getDay()]).substring(0,3);
	th=(D>=10&&D<=20)?'th':((dMod=D%10)==1)?'st':(dMod==2)?'nd':(dMod==3)?'rd':'th';
	formatString = formatString.replace("#YYYY#",YYYY).replace("#YY#",YY).replace("#MMMM#",MMMM).replace("#MMM#",MMM).replace("#MM#",MM).replace("#M#",M).replace("#DDDD#",DDDD).replace("#DDD#",DDD).replace("#DD#",DD).replace("#D#",D).replace("#th#",th);
	// CHANGE NOTE: There appeared to be a lot of unused material. I cleaned up some of the code. We can restore it later if it was needed.
	h=this.getHours();
	hh = h;
	if (back.get12HourFormat()) {
		if (h==0) hh=12;
		if (h>12) hh-=12;
		AMPM=(h<12)?'AM':'PM';
	} else {
		hh = h<10?('0'+h):h;
		AMPM = "";
	}
	mm=(m=this.getMinutes())<10?('0'+m):m;
	ss=(s=this.getSeconds())<10?('0'+s):s;
	return formatString.replace("#hhhh#",hhhh).replace("#hhh#",hhh).replace("#hh#",hh).replace("#h#",h).replace("#mm#",mm).replace("#m#",m).replace("#ss#",ss).replace("#s#",s).replace("#ampm#",ampm).replace("#AMPM#",AMPM);
};
Number.prototype.formatDate = function(full){
	var date = new Date(this);
	var now = new Date();
	var format = "#hh#:#mm#";
	if (back.get12HourFormat()) {
		format = format+" #AMPM#";
	}

	if(now.getDate() == date.getDate() && now.getMonth() == date.getMonth() && now.getFullYear() == date.getFullYear()){
	return date.customFormat(format);
	}

	var yesterday = new Date(now);
	yesterday.setDate(now.getDate()-1);
	if(yesterday.getDate() == date.getDate() && yesterday.getMonth() == date.getMonth() && yesterday.getFullYear() == date.getFullYear()){
	return "Yesterday<br>" + date.customFormat(format);
	}

	if (full) {
		return date.customFormat("#MMM# #DD#, #hh#:#mm# #AMPM#");
	}
	return date.customFormat("#MMM# #DD#");
}
function tintImage(image, color) {
	var canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	var ctx = canvas.getContext('2d');
	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(image, 0, 0);
	ctx.globalCompositeOperation = "source-in";
	ctx.fillStyle = color;
	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fill();
	ctx.restore();
	image.src = canvas.toDataURL();
}

var setPopupIcon = function(alternative){
	if(alternative){
		chrome.browserAction.setIcon({"path":"/icons/alternative.png"});
	  }else{
		chrome.browserAction.setIcon({"path":"/small.png"});
	  }
}


/***********************************************************/
