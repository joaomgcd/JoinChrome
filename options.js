
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
var getURLParameter = function(url,name) {
		return chrome.extension.getBackgroundPage().getURLParameter(url,name);
}

var listDevices = function(callback){
		return chrome.extension.getBackgroundPage().listDevices(callback);
}

var deviceImages = chrome.extension.getBackgroundPage().deviceImages;
var getDevices = function(){
		return chrome.extension.getBackgroundPage().devices;
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
if(!localStorage.optionsTab){
	localStorage.optionsTab = "shortcuts";
}
var selectTab = function(e){
	var currentTab = e.target;
	var optionTabSelectors = document.querySelectorAll("[showtab]");

	localStorage.optionsTab = currentTab.attributes["showtab"].value;
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
document.addEventListener('DOMContentLoaded', function() {

		document.getElementById("appiconandname").onclick = function(){ openTab("http://joaoapps.com/join");};
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
		var devices = getDevices();
		var htmlDevicesAutoClipboard = "";
		for (var i = 0; i < devices.length; i++) {
				var device = devices[i];
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
		}
}
