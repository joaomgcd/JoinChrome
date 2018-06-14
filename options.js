
chrome.extension.getBackgroundPage().setLocalDeviceNameFromDeviceList();
var createElement = function(parent, tag, id, attributes) {
		var el = document.createElement(tag);
		el.setAttribute('id', id);
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

var taskerCommandsUI = null;
var getURLParameter = function(url,name) {
		return chrome.extension.getBackgroundPage().getURLParameter(url,name);
}

var listDevices = function(callback){
		return chrome.extension.getBackgroundPage().listDevices(callback);
}

var deviceImages = chrome.extension.getBackgroundPage().deviceImages;
var getDevices = function(){
	var devices = chrome.extension.getBackgroundPage().devices;
	if(!devices){
		devices = [];
	}
	return devices;
}

var closeOptions = function(){
		chrome.tabs.query({currentWindow: true, active : true},function(tabArray){
				chrome.tabs.remove(tabArray[0].id);
		});
}
function getAllElementsWithAttribute(attribute)
{
	var matchingElements = [];
	var allElements = document.getElementsByTagName('*');
	for (var i = 0, n = allElements.length; i < n; i++)
	{
		if (allElements[i].getAttribute(attribute) !== null)
		{
			// Element exists with attribute. Add to array.
			matchingElements.push(allElements[i]);
		}
	}
	return matchingElements;
}
var back = chrome.extension.getBackgroundPage();
var getOptionType = function(option){
		return chrome.extension.getBackgroundPage().getOptionType(option);
}
var getOptionDelayed = function(option){
		return chrome.extension.getBackgroundPage().getOptionDelayed(option);
}

var getOptionSaver = function(option){
		return chrome.extension.getBackgroundPage().getOptionSaver(option);
}

var saveOption = function(option){
		localStorage[option.id] = option.value;
}

var loadOptions = function(){
		var options = getAllElementsWithAttribute("joaoappsoption");
		for (var i = 0; i < options.length; i++) {
				var option = options[i];
				var optionSaver = getOptionSaver(option);
				var id = option.id;
				optionSaver.load(option);
		};
}
var getOptionValue = function(id,defaultValue){
		var option = document.getElementById(id);
		var type =  getOptionType(option);
		return chrome.extension.getBackgroundPage().getOptionValue(type,option.id,defaultValue);
}
var addOptionListeners = function(){
		var options = getAllElementsWithAttribute("joaoappsoption");
		for (var i = 0; i < options.length; i++) {
				var option = options[i];
				addOptionListener(option);
		};
}

var setUserInfo = function(){
	getUserInfo(function(result){
		var userIconElement = document.getElementById("usericon");
		userIconElement.src = result.picture;
		document.getElementById("username").innerHTML = result.name;
		document.getElementById("userinfo").onclick = function(){
			if(true){//confirm("Want to switch to another account?")){
				back.getAuthToken(function(){
					back.refreshDevices(function(){
						setUserInfo();
					});
				},true)
			}
		}
	});
}
var addOptionListener =function(option){
		var type = getOptionType(option);
		var optionSaver = getOptionSaver(option);
		option.addEventListener(optionSaver.saveevent, function(event){
				optionSaver.save(event.currentTarget);
		});
		optionSaver.setDefaultValue(option);
}
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
}
var voiceRecognizer = new back.VoiceRecognizer();
if(!localStorage.optionsTab){
	localStorage.optionsTab = "shortcuts";
}
var selectTab = function(e){
	var currentTab = e.target;
	var optionTabSelectors = document.querySelectorAll("[showtab]");

	localStorage.optionsTab = currentTab.attributes["showtab"].value;
	manageTabs();
}
var setSelectedTab = function(tabId){
	localStorage.optionsTab = tabId;
	manageTabs();
}
var manageTabs = function(){
	var selectedTab = localStorage.optionsTab;
	if(!selectedTab){
		return;
	}
	var optionTabSelectors = document.querySelectorAll("[showtab]");
	for (var i = 0; i < optionTabSelectors.length; i++) {
		var optionTabSelector = optionTabSelectors[i];
		optionTabSelector.classList.remove("selected");
		if(optionTabSelector.attributes["showtab"].value == selectedTab){
			optionTabSelector.classList.add("selected");
		}
	};
	var optionTabs = document.querySelectorAll("[tab]");
	for (var i = 0; i < optionTabs.length; i++) {
		var optionTab = optionTabs[i];
		var tabName = optionTab.attributes["tab"].value;
		if(tabName == selectedTab){
			optionTab.style.display = "block";
		}else{
			optionTab.style.display = "none";
		}
	};
}
var isTab = back.UtilsDom.getURLParameter("tab", window.location.href) == "1";
var isMicAvailable = function(navigator){
		return new Promise(function(resolve,reject){			
			if(!back.getVoiceEnabled()){
				reject("Voice not enabled");
				return;
			}
			if(isTab){
			    navigator.webkitGetUserMedia({
			        audio: true,
			    }, function(stream) {
			    	var audioTracks = stream.getAudioTracks();
			    	var audioStreamStop = audioTracks.length > 0 ? audioTracks[0].stop : null;
			        if(stream.stop){
				        stream.stop();
				    }
			        resolve();
			    }, function() {
			        reject("Mic not available");
			    });
			}else{
				return back.Dialog.showRequestMicDialog()().then(result=>{
					if(result){
						resolve();
					}else{
						reject();
					}
				});
			}
		})	
}
var handleVoiceOption = function(){
	var optionVoice = document.querySelector("#voiceenabled");
	var optionVoiceContinuous = document.querySelector("#voicecontinuous");
	if(!optionVoice.checked){
		return;
	}
	var initial = isMicAvailable(navigator);
	if(isTab){
		initial = initial
		.catch(Dialog.showOkCancelDialog({
			"title": "Control Join with your voice",
			"subtitle": "If you give Join access to your microphone you can do stuff with your voice like pushing pages or replying to texts.<br/><br/>Want to use your voice to control Join?"
		}))
		.then(()=>isMicAvailable(navigator))		
		
	}
	if(!isTab){
		initial = initial
		.then(()=>back.UtilsObject.wait(500));
	}
	return initial
	.then(command=>{
		back.console.log("Mic YES!!");
		return Dialog.showOkDialog({
			"title": "Control Join with your voice",
			"subtitle": "Try saying <b>Computer</b> and then<ul><li><b>Push this to my Nexus 5</b> while a tab is open on a web page</li><li><b>Reply with hello there!</b> after you receive a new text message</li><li><b>Ring my device</b> to make your phone ring</li><li><b>Write hello on my Nexus 6</b> to write 'hello' on your Android device</li></ul><br/>Experiment with other commands too! 😊<br/><br/>You can also trigger voice recognition with a keyboard shortcut. Configure that in the <b>Shortcuts</b> section."
		})();
	})
	.then(()=>{		
		optionVoice.checked = true;
		getOptionSaver(optionVoice).save(optionVoice,true);
		optionVoiceContinuous.checked = true;
		getOptionSaver(optionVoiceContinuous).save(optionVoiceContinuous,true);
	})
	.catch(error=>{
		back.console.log("Mic NO!!" + error);
		optionVoice.checked = false;
		getOptionSaver(optionVoice).save(optionVoice,false);
	});
}
var deviceAutoClipboardHtml = "<label class='device_selection'><input type='checkbox' id='DEVICE_ID"+ chrome.extension.getBackgroundPage().deviceSufix+"'/><div class='DEVICE_CLASS'><span>DEVICE_NAME</span><img id='DEVICE_ID_icon' class='deviceicon' deviceId='DEVICE_ID' src='DEVICE_ICON'/></div></label>"
var requestingMic = false;
var updatePasswordStatus = function(){
		var passwordStatus = document.getElementById("passwordstatus");
		var text = null;
		if(localStorage.encryptionPassword){
			text = "Password is currently set";
			passwordStatus.classList.add("set");
		}else{
			text = "Password is not set";
			passwordStatus.classList.remove("set");
		}
			passwordStatus.innerHTML = text;
}
var generateHideCommandsOptions = function(){
	var hideCommandsElement = document.querySelector("#hidecommands");
	for(var deviceCommand of deviceCommands){
		var label = UtilsDom.createElement(hideCommandsElement,"label", deviceCommand.commandId + "label",{"class":"selection"});
		var text = document.createTextNode(deviceCommand.label);
		label.appendChild(text);
		var checkbox = UtilsDom.createElement(label,"input", deviceCommand.commandId + "disable",{"type":"checkbox","joaoappsoption":""});
		var selectionIndicator = UtilsDom.createElement(label,"div", deviceCommand.commandId + "selectionIndicator",{"class":"selection_indicator"});
	}
}
var generateHideDevicesOptions = function(){
	if(!UtilsObject.isArray(back.devices)) return;
	var hideCommandsElement = document.querySelector("#hidedevices");
	for(var device of back.devices){
		var label = UtilsDom.createElement(hideCommandsElement,"label", device.deviceId + "label",{"class":"selection"});
		var text = document.createTextNode(device.deviceName);
		label.appendChild(text);
		var checkbox = UtilsDom.createElement(label,"input", device.deviceId + "disable",{"type":"checkbox","joaoappsoption":""});
		checkbox.onchange = e => back.contextMenu.update(back.devices);
		var selectionIndicator = UtilsDom.createElement(label,"div", device.deviceId + "selectionIndicator",{"class":"selection_indicator"});
	}
}
document.addEventListener('DOMContentLoaded', function() {
 		generateHideCommandsOptions();
 		generateHideDevicesOptions();
		var optionVoice = document.querySelector("#voiceenabled");
		if(!back.getVoiceEnabled()){
			back.onvoiceenabledsave(optionVoice,false);
		}
		/*UtilsObject.doOnce("voicereminderrrrrrrrrrrrrrrrrr",()=>{
			Dialog.showOkCancelDialog({
				"title": "Control Join with your voice",
				"subtitle": "You can control Join with your voice.<br/><br/>Want to give it a try?"
			})()
			.then(()=>{
				setSelectedTab("options");
				optionVoice.checked = true;
				handleVoiceOption();
			})
			.catch(()=>console.log("dont show voice intro"));
		})*/
		optionVoice.addEventListener("click", handleVoiceOption);
		// Apply dark or light theme
		document.querySelector("#resettheme").onclick = e => {
			delete localStorage.theme;
			delete localStorage.themeColorPicker;
			document.location.reload();
		}
		UtilsDom.setCurrentTheme();
        document.getElementById("theme").onchange = e => back.eventBus.post(new back.Events.ThemeChanged(e.target.value));
		document.getElementById("themeColorPicker").onchange = e => back.eventBus.post(new back.Events.ThemeChanged({
			"--theme-accent-color": e.target.value
		}));
	
		document.getElementById("appiconandname").onclick = function(){ openTab("http://joaoapps.com/join");};
		document.getElementById("deviceName").innerHTML = localStorage.deviceName;
		var optionTabSelectors = document.querySelectorAll("[showtab]");
		for (var i = 0; i < optionTabSelectors.length; i++) {
			var optionTabSelector = optionTabSelectors[i];
			optionTabSelector.onclick = selectTab;
		};
		manageTabs();
		var optionsElement = document.getElementById("options");
		updatePasswordStatus();
		var passwordSetButton = document.getElementById("buttonsetpassword");
		var passwordResetButton = document.getElementById("buttonresetpassword");
		var overlay = document.getElementById("overlay");
		var overlaycontent = document.getElementById("overlaycontent");
		passwordSetButton.onclick = function(){
			getUserInfo(function(userInfo){
				var userPasswordElement = document.getElementById("encryptionpassword");
				var userPassword = userPasswordElement.value;
				var salt = userInfo.email;
				overlay.classList.add("showing");
				var workerKey = new Worker("js/workerkey.js");
				var workerCount = new Worker("js/workercount.js");
				workerCount.onmessage = function(event){
				 /* var count = event.data;
					var dots = count % 4;
					var dotsString ="";
					for (var i = 0; i < dots; i++) {
						dotsString+=".";
					};
					overlaycontent.innerHTML ="Please Wait" + dotsString;*/
				}
				workerKey.onmessage = function(event){
					overlay.classList.remove("showing");
					workerKey.terminate();
					workerCount.terminate();
					var keyString = event.data;
					console.log(keyString);
					localStorage.encryptionPassword = keyString;
					userPasswordElement.value = "";
					alert("Password set.\n\nFor security reasons it will not show up here again.");
					updatePasswordStatus();
				};
				workerKey.postMessage({userPassword:userPassword,salt:salt,iterations:5000});


			});
		}
		passwordResetButton.onclick = function(){
			delete localStorage.encryptionPassword;
			alert("You are no longer using encryption on this device.");
			updatePasswordStatus();
		}
		/*var toggleAdvancedButton = document.getElementById("toggleadvanced");
		toggleAdvancedButton.onclick = function(){
			var advanced = getAllElementsWithAttribute("advanced");
			for (var i = 0; i < advanced.length; i++) {
				var element = advanced[i];
				if(!element.style.display || element.style.display == "block"){
					element.style.display = "none";
				}else{
					element.style.display = "block";
				}
			};
		}*/
		var advanced = getAllElementsWithAttribute("advanced");
		for (var i = 0; i < advanced.length; i++) {
			var element = advanced[i];
			element.style.display = "none";
		};
		addOptionListeners();
		chrome.commands.getAll(function(commands) {
			for (var commandKey in commands) {
				var command = commands[commandKey];
				if(command.shortcut != ""){
					var commandElement = document.getElementById("shortcut"+command.name);
					if(commandElement){
						commandElement.innerHTML = "<div class='shortcutline'><span class='shortcutdescription'>" + command.description + "</span> <div class='configuredshortcut'>"+command.shortcut + "</div></div>";
					}
				}
			}

			for (var commandKey in commands) {
				var command = commands[commandKey];
				var configureElement = document.getElementById("configure"+command.name);
				if(configureElement){
					configureElement.onclick = function(){
						openTab("chrome://extensions/configureCommands");
					}
				}
			}
		});
		var configureButton = document.getElementById("configure_keyboard_shortcuts");
		configureButton.onclick = function() {
			openTab("chrome://extensions/configureCommands");
		}
		var selectFavoriteCommand = document.getElementById("select_favourite_command");
		var favoriteCommandText = document.getElementById("text_favourite_command");
		var favoriteCommandTextArea = document.getElementById("favouritecommandtextarea");
		var selectFavoriteCommandDevices = document.getElementById("select_favourite_command_device");
		var devices = getDevices().where(UtilsDevices.isNotDeviceGroup);
		var htmlDevicesAutoClipboard = "";
		for (var i = 0; i < devices.length; i++) {
				var device = devices[i];
				if(device.deviceId == localStorage.deviceId){
					continue;
				}
				htmlDevicesAutoClipboard = htmlDevicesAutoClipboard + replaceAll(replaceAll(replaceAll(replaceAll(deviceAutoClipboardHtml,"DEVICE_NAME",device.deviceName),"DEVICE_ICON","icons/"+deviceImages[""+device.deviceType](device)),"DEVICE_CLASS","clipboardDevice"),"DEVICE_ID",device.deviceId);
				selectFavoriteCommandDevices.options.add(new Option(device.deviceName, device.deviceId));
		}
		selectFavoriteCommandDevices.addEventListener("change", function(event){
			setFavoriteCommandOptions();

		});
		selectFavoriteCommand.addEventListener("change", function(event){
			var selectedOptions = event.target.selectedOptions;
			if(selectedOptions && selectedOptions.length>=0){
				var selectedOption = selectedOptions[0];
				var deviceCommand = selectedOption.deviceCommand;
				manageFavoriteCommandTextArea(deviceCommand);
			}
		});
		var devicesAutoClipboardElement = document.getElementById("devicesAutoClipboard");
		devicesAutoClipboardElement.innerHTML = htmlDevicesAutoClipboard;
		for (var i = 0; i < devices.length; i++) {
			var device = devices[i];
			var checkboxes = devicesAutoClipboardElement.getElementsByTagName("input");
			for (var i = 0; i < checkboxes.length; i++) {
				var checkbox = checkboxes[i];
				checkbox.checked = getOptionValue(checkbox.id,true);
				addOptionListener(checkbox);
			};
		}
		loadOptions();
		setFavoriteCommandOptions();
		document.getElementById("starttests").addEventListener("click",function(){
			var tests = new Tests();
			tests.init();
			tests.execute(document.getElementById("tests"));
		});
		setUserInfo();
		document.getElementById("alternativeicon").onclick = function(e){
			setPopupIcon(e.target.checked);
		}
		document.querySelector("#hidecontextmenu").onclick = e => back.updateContextMenu();

		document.getElementById("hidenotificationcount").onclick = function(e){
			back.updateBadgeText(e.target.checked);
		}
		var taskerCommandsTab = document.querySelector("#taskerCommandsContent");
		taskerCommandsUI = new TaskerCommandsUI(taskerCommandsTab);
		taskerCommandsUI.renderCommands();

		var taskerCommandsAddButton = document.querySelector("#taskerCommandsAdd");
		taskerCommandsAddButton.onclick = e => taskerCommandsUI.add();
		

		
});
var manageFavoriteCommandTextArea = function(deviceCommand){
	var favoriteCommandTextArea = document.getElementById("favouritecommandtextarea");
	if(deviceCommand){
		if(!deviceCommand.hasText){
			favoriteCommandTextArea.classList.add("hidden");
		}else{
			favoriteCommandTextArea.classList.remove("hidden");
		}
	}
}
var setFavoriteCommandOptions = function(){
		var selectFavoriteCommand = document.getElementById("select_favourite_command");
		var selectFavoriteCommandDevices = document.getElementById("select_favourite_command_device");
		var devices = getDevices();
		var selected = chrome.extension.getBackgroundPage().getFavoriteCommand();
		var device = devices.first(function(device){return device.deviceId == selectFavoriteCommandDevices.value;});
		if(!device){
			return;
		}
		selectFavoriteCommand.innerHTML = "";
		var deviceCommands = getDeviceCommands();
		for (var i = 0; i < deviceCommands.length; i++) {
			var deviceCommand = deviceCommands[i];
			if(!deviceCommand.condition || deviceCommand.condition(device)){
				var option = new Option(deviceCommand.label, deviceCommand.label);
				option.deviceCommand = deviceCommand;
				selectFavoriteCommand.options.add(option);
				if(selected == deviceCommand.label){
					manageFavoriteCommandTextArea(deviceCommand);
				}
			}
		};
		if(selected){
			selectFavoriteCommand.value = selected;
		}else{
			selectFavoriteCommand.selectedIndex = 0;
			manageFavoriteCommandTextArea(deviceCommands[0]);
		}
}
var OptionsEventHandler = function(){
	this.onThemeChanged = function(themeChanged){
		UtilsDom.setTheme(themeChanged.theme);
	}
}
var eventHandler = new OptionsEventHandler();
back.eventBus.register(eventHandler);
addEventListener("unload", function (event) {
	back.eventBus.unregister(eventHandler);
}, true);