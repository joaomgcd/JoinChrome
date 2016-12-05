var VoiceCommandHandler = function(){

	this.handle = function(result){
		if(result.action != this.getAction()){
			return;
		}
		this.handleSpecific(result);
		if(result.contexts){
			var sepecificContextName = this.getContextName();
			if(sepecificContextName){
				var specificContext = result.contexts.first(context => context.name == sepecificContextName);
				if(specificContext){
					this.handleResultContext(specificContext);
				}
			}
		}
	}
	this.handleSpecific = function(result){

	}
	this.handleIncomplete = function(result){

	}
	this.getAction = function(result){
		return null;
	}
	this.addCommandContexts = function(contexts){

	}
	this.getContextName = function(){

	}
	this.handleResultContext = function(context){

	}
}
var VoiceCommandHandlerDeviceCommands = function(){
	this.getAction = function(){
		return "devicecommand";
	}
	var aliasForTypes = [
		{
			type:DEVICE_TYPE_ANDROID_PHONE,
			alias:["phone","device","mobile","android"]
		},
		{
			type:DEVICE_TYPE_ANDROID_TABLET,
			alias:["tablet","android"]
		},
		{
			type:DEVICE_TYPE_CHROME_BROWSER,
			alias:["chrome","browser","pc"]
		},
		{
			type:DEVICE_TYPE_WIDNOWS_PC,
			alias:["windows","browser","pc"]
		},
		{
			type:DEVICE_TYPE_FIREFOX,
			alias:["browser","pc","firefox"]
		},
	];
	var findDeviceForSaidCommand = function(command){
		if(!command){
			return;
		}
		command = command.toLowerCase().replace("my","").trim();
		return UtilsObject.first(devices,
				device=>device.deviceId == command,
				device=>device.deviceName.toLowerCase().indexOf(command) >= 0,
				device=>{
					var foundFromAlias = aliasForTypes.first(alias => alias.type == device.deviceType);
					if(foundFromAlias){
						var foundCorrect = foundFromAlias.alias.first(alias => alias.indexOf(command) >= 0);
						if(foundCorrect){
							return true;
						}else{
							return false;
						}
					}
				});
	}
	this.handleSpecific = function(result){
		if(result.parameters.device){
			var foundDevice = findDeviceForSaidCommand(result.parameters.device);
			if(!foundDevice){
				throw `Device not found: ${result.parameters.device}`;
			}		
			result.command = deviceCommands.first(command => command.commandId == result.parameters.device_command);
			if(!result.command.condition(foundDevice)){
				throw `${foundDevice.deviceName} can't perform command ${result.command.label}`;
			}
			result.device = foundDevice;
		}
		if(result.command.commandId == "find"){
			result.command.func(result.device.deviceId, true, true);
		}else{
			result.command.func(result.device.deviceId, true, result.parameters.input);	
		}
	}
	this.addCommandContexts = function(contexts){
		if(localStorage.deviceCommandContexts){
			contexts.push(JSON.parse(localStorage.deviceCommandContexts));
		}
	}
	this.getContextName = function(){
		return "deviceandcommand";
	}
	this.handleResultContext = function(context){		
		localStorage.deviceCommandContexts = JSON.stringify(context);
		contextsInOutput = true;
	}
	this.handleIncomplete = function(input){
		if(!input.result.parameters.device){
			var foundDevice = findDeviceForSaidCommand(input.command);
			if(foundDevice){
				input.command = foundDevice.deviceName.toLowerCase();
			}
		}
	}
}
VoiceCommandHandlerDeviceCommands.prototype = new VoiceCommandHandler();
var VoiceCommandHandlerReply = function(){
	this.getAction = function(){
		return "reply";
	}
	this.handleSpecific = function(result){
		var replyId = result.parameters.replyId;
		var name = result.parameters.name;
		var notification = null;
		if(!name){
			notification = notifications.first(notification => notification.replyId == replyId);
		}else{
			notification = notifications.first(notification => notification.title.toLowerCase().indexOf(name.toLowerCase()) > 0);
		}
		if(notification){
				notification.doAction(notification.replyId, result.parameters.input, true);
		}else{
			showNotification("Can't reply","Notification to reply to doesn't exist");
		}
	}
	this.addCommandContexts = function(contexts){
		var lastReplyNotification = UtilsObject.whereMax(notifications.where(notification => notification.replyId), notification=>notification.date);
		if(lastReplyNotification){
			contexts.push({
				"name":"replyInfo",
				"parameters":{
					"replyId": lastReplyNotification.replyId
				}
			});
		}
	}
}
VoiceCommandHandlerReply.prototype = new VoiceCommandHandler();
var VoiceCommandHandlerOpenNotification = function(){
	this.getAction = function(){
		return "open.notification";
	}
	this.handleSpecific = function(result){
		var lastNotification = UtilsObject.whereMax(notifications, notification => notification.date);
		if(lastNotification){
			lastNotification.doAction(lastNotification.actionId);
			showNotification("Join","Opened notification");
		}else{
			showNotification("Join","No notification to open");
		}
	}
}
VoiceCommandHandlerOpenNotification.prototype = new VoiceCommandHandler();
var VoiceCommandHandlerRepeatLastCommand = function(){
	this.getAction = function(){
		return "repeat";
	}
	this.handleSpecific = function(result){
		back.repeatLastCommand();
	}
}
VoiceCommandHandlerRepeatLastCommand.prototype = new VoiceCommandHandler();
var VoiceCommandHandlers = function(){
	var me = this;
	var list = [
		new VoiceCommandHandlerDeviceCommands(),
		new VoiceCommandHandlerReply(),
		new VoiceCommandHandlerOpenNotification(),
		new VoiceCommandHandlerRepeatLastCommand()
	];
	this.handle = function(result){
		for(handler of list){
			handler.handle(result);
		}
	}
	this.handleIncomplete = function(input){
		for(handler of list){
			handler.handleIncomplete(input);
		}
	}
	this.addCommandContexts = function(contexts){
		if(!contexts){
			return;
		}
		for(handler of list){
			handler.addCommandContexts(contexts);
		}
	}
}
VoiceCommandHandlers.handlers = new VoiceCommandHandlers();