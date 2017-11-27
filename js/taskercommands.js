var TaskerCommand = function(){
	this.commandId = null;
	this.label = null;
	this.commandText = null;
	this.icon = null;
	this.promptText = null;
	this.deviceIds = [];
}
var TaskerCommands = function(){
	var commands = localStorage.taskerCommands ? JSON.parse(localStorage.taskerCommands) : [];
	var saveCommandsImmediate = () => {
		localStorage.taskerCommands = JSON.stringify(commands);
		return this.getCommands();
	}
	this.saveCommands = debounce(saveCommandsImmediate,1000);
	
	var findCommand = commandId => this.getCommands().find(command=>command.commandId == commandId)
	this.performCommand = UtilsObject.async(function* (deviceId, commandId){
		var command = findCommand(commandId);
		if(!command){
			back.console.error(`Command ${commandId} not found`);
			return;
		}
		var extraText = null;
		if(command.promptText){
			extraText = yield Dialog.showInputDialog({
			    title: command.label,
			    placeholder: "",
			    subtitle: command.promptText
			})();
		}
		var text = extraText ? `${command.commandText}=:=${extraText}` : command.commandText;
		back.pushTaskerCommand(deviceId,true,text);
    	back.setLastPush(deviceId, LAST_PUSH_CUSTOM_COMMAND+"=:="+command.commandId); 
	});
	this.getCommands = ()=>commands;	
	this.addCommand = newCommand => {
		this.removeCommand(newCommand);
		commands.push(newCommand);
		return this.saveCommands();
	}	
	this.setCommandDevices = (commandId,deviceIds) => {
		var command = findCommand(commandId);
		command.deviceIds = deviceIds;
		return this.saveCommands();
	}
	this.addCommandDevice = (commandId,newDeviceId) => {
		var command = findCommand(commandId);
		this.removeCommandDevice(commandId,newDeviceId);
		command.deviceIds.push(newDeviceId);
		return this.saveCommands();
	}
	this.removeCommandDevice = (commandId,deviceIdToRemove) => {
		var command = findCommand(commandId);
		if(!command){
			return;
		}
		if(!command.deviceIds){
			command.deviceIds = [];
		}
		command.deviceIds = command.deviceIds.filter(deviceId=>deviceId != deviceIdToRemove);
		return this.saveCommands();
	}
	this.removeCommand = newCommand => {
		commands = commands.filter(command=>command.commandId != newCommand.commandId);
		return this.saveCommands();
	}	
}

var TaskerCommandsUI = function(taskerCommandsTab){	
	var taskerCommands = new TaskerCommands();

	var divCommands =  document.createElement('div');
	divCommands.classList.add("taskerCommands");	
	var htmlCommand = `
		<div class="taskerCommandTop">
			<div class="taskerCommandIcon"><img id="commandicon" /></div>			
			<div class="taskerCommandName" ><input type="text" placeholder="Name" /></input></div>
			<div class="taskerCommandText" ><input type="text" placeholder="Command"  /></div>
			<div class="taskerCommandDelete"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg></div>
		</div>		
		<div class="taskerCommandPrompt" ><input type="text" placeholder="Prompt Text: if set will use command text above as a prefix and prompt for the suffix when ran"  /></div>
		<div class="devicesToApply"></div>
		`
	var findCommand = event => {
		var element = findCommandElement(event)
		if(element){
			return element.command;
		}
	}
	var findCommandElement = event => {
		var element = event.target;
		while(element && !element.command){
			element = element.parentElement;
		}
		if(element){
			return element;
		}
	}
	var setCommandIcon = event => {
		var imageElement = event.currentTarget;
		var command = findCommand(event);
		Dialog.showInputDialog({
		    title:"Command Icon Url",
		    subtitle:"Set a publicly available URL for this command's icon or a direct <svg> element",
		    text: command.icon,
		    placeholder:`Icon url...`
		})()
		.then(newIcon=>{
			command.icon = newIcon;
			handleDeviceCommandIcon(command,imageElement);
			saveDelayed();
		})
		.catch(error=>{
			back.console.error(error);
		})
	}
	this.save = taskerCommands.saveCommands;
	this.add = ()=>{
		taskerCommands.addCommand({"commandId":guid(),"label":"","commandText":"","icon":"/icons/commands/tasker.svg"});
		this.renderCommands();
	}
	var saveDelayed = this.save;
	this.renderCommands  = () => {
		divCommands.innerHTML = "";
		taskerCommandsTab.appendChild(divCommands);
		for(var command of taskerCommands.getCommands()){
			var divCommand = document.createElement('div');
			divCommands.appendChild(divCommand);
			divCommand.classList.add("taskerCommand");
			divCommand.innerHTML = htmlCommand;
			//divCommand = divCommand.cloneNode(true);
			divCommand.command = command;

			var nameElement = divCommand.querySelector(".taskerCommandName input");
			var textElement = divCommand.querySelector(".taskerCommandText input");
			var promptTextElement = divCommand.querySelector(".taskerCommandPrompt input");
			var imageElement = divCommand.querySelector(".taskerCommandIcon>img");
			var deleteElement = divCommand.querySelector(".taskerCommandDelete");

			if(command.label) nameElement.setAttribute("value",command.label);
			if(command.commandText) textElement.setAttribute("value",command.commandText);
			if(command.promptText) promptTextElement.value = command.promptText;
			nameElement.onkeyup = e => {
				findCommand(e).label = e.target.value;
				saveDelayed();
			}
			textElement.onkeyup = e => {
				findCommand(e).commandText = e.target.value;
				saveDelayed();
			}
			promptTextElement.onkeyup = e => {
				findCommand(e).promptText = e.target.value;
				saveDelayed();
			}
			imageElement.onclick = e => setCommandIcon(e);
			handleDeviceCommandIcon(command,imageElement);
			deleteElement.onclick = e => {
				var element = e.target;
				while(!element.command){
					element = element.parentElement;
				}
				taskerCommands.removeCommand(element.command);this.renderCommands()
			};
			var elementDevices = divCommand.querySelector(".devicesToApply");
			for(var device of back.devices){
				var label = UtilsDom.createElement(elementDevices,"label", device.deviceId + "=:="+command.commandId,{"class":"selection"});
				var text = document.createTextNode(device.deviceName);
				label.appendChild(text);
				var checkbox = UtilsDom.createElement(label,"input", device.deviceId + "=:=" + command.commandId + "enablecommand",{"type":"checkbox","class":"devicecommandstatus"});
				if(command.deviceIds && command.deviceIds.indexOf(device.deviceId)>=0){
					checkbox.checked = true;
				}
				checkbox.device = device;
				checkbox.onchange = e => {
					var commandElement = findCommandElement(e);
					var command = commandElement.command;
					var checkboxes = commandElement.querySelectorAll(".devicecommandstatus");
					var deviceIds = Array.prototype.map.call(Array.prototype.filter.call(checkboxes,checkbox=>checkbox.checked),checkbox => checkbox.device.deviceId);
					taskerCommands.setCommandDevices(command.commandId, deviceIds);
				}
				var selectionIndicator = UtilsDom.createElement(label,"div", device.deviceId + "=:="+command.commandId+ "selectionIndicator",{"class":"selection_indicator"});
			}
		}
		return divCommands;
	}
}