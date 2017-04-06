
var back = chrome.extension.getBackgroundPage();
var Dialog = function(htmlPath, input){
	var me = this;
	me.show = function(options){
		return new Promise(function(resolve,reject){
			if(options.shouldShow == false){
				return reject("Should not show dialog");
			}
			var query = "";
			if(input){
				query += "?json=" + encodeURIComponent(JSON.stringify(input));
			}
			var height = options.height;
			var width = options.width;
			if(!height){
				height = 500;
			}
			if(!width){
				width = 500;
			}
			chrome.windows.create({
				"focused":true,
				url: htmlPath + query,
				type: 'popup' ,
				width : width,
				height: height,
				left: Math.round((screen.width / 2) - (width /2)),
				top: Math.round((screen.height / 2) - (height /2))
			});
			var resultListener = function(event){
				back.removeEventListener("dialogresult",arguments.callee);
				resolve(event.result);
			};
			var cancelListener = function(event){
				back.removeEventListener("dialogcancel",arguments.callee);
				reject(new Error(event.result));
			};
			back.addEventListener("dialogresult",resultListener,false);
			back.addEventListener("dialogcancel",cancelListener,false);
		});
	}
}
Dialog.show = function(htmlName, input,options){
	return new Dialog("components/dialog/"+htmlName +".html",input)
	.show(options);
}

Dialog.showInputDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 600;
		options.height = 405;
		if(!input.subtitle){
			options.height = 205;
		}
		return Dialog.show("input",input,options);	
	}
}
Dialog.showNotificationReplyDialog = function(notification, shouldShow){
	return Dialog.showInputDialog({
		title:notification.title + " said",
		subtitle:"\"" + notification.text + "\"",
		placeholder:"Type your reply"
	},{
		shouldShow: shouldShow
	});
}
Dialog.showMultiChoiceDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 473;
		options.height = 195;

		var itemHeight = 42;
		//options.height += input.items.length * itemHeight;	
		return Dialog.show("multichoice",input,options);	
	}
}
Dialog.showDeviceInfoDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 473;
		options.height = 195;

		var itemHeight = 42;
		//options.height += input.items.length * itemHeight;	
		return Dialog.show("deviceinfo",input,options);	
	}
}
Dialog.showNotificationDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 473;
		options.height = 195;

		var itemHeight = 42;
		//options.height += input.items.length * itemHeight;	
		return Dialog.show("notification",input,options);	
	}
}

Dialog.showOkCancelDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 600;
		options.height = 405;
		if(!input.subtitle){
			options.height = 205;
		}
		return Dialog.show("okcancel",input,options);	
	}
}
Dialog.showOkDialog = function(input,options){
	return function(){
		if(!options){
			options = {};
		}
		options.width = 600;
		options.height = 405;
		if(!input.subtitle){
			options.height = 205;
		}
		return Dialog.show("ok",input,options);	
	}
}
Dialog.showRequestMicDialog = function(){
	return function(){
		var options = {};
		options.width = 600;
		options.height = 405;
		input = {
			"title": "Microphone Access",
			"subtitle": "<br/><br/><br/><br/><br/>Please allow Join to access your microphone so that you can issue voice commands with it"
		}
		if(!input.subtitle){
			options.height = 205;
		}
		return Dialog.show("requestmic",input,options).catch(error=>{
			back.console.log("Couldn't get mic: " + error);
			return false;
		});	
	}
}
Dialog.showEmojiDialog = function(input,options){
	return function(){
		if(!input){
			input = {
				"title":"Choose Emoji"
			};
		}
		if(!options){
			options = {};
		}
		options.width = 600;
		options.height = 405;
		return Dialog.show("emoji",input,options);	
	}
}
Dialog.confirm = function(title,subtitle){
	 return Promise
    .resolve()
    .then(Dialog.showOkCancelDialog({
        title:title,
        subtitle: subtitle
    }));
}


//**************FUNCTIONS TO USE INSIDE DIALOGS
Dialog.setResult = function(result){
	back.dispatch("dialogresult",{result:result});
	if(window){
		window.close();
	}
}
Dialog.cancel = function(result){
	if(window.dialogResultSet){
		return;
	}
	back.dispatch("dialogcancel",{result:result});
	if(window){
		window.close();
	}
}
Dialog.getInput = function(){
	var json = UtilsDom.getURLParameter("json");
	if(json){
		return JSON.parse(json);
	}
}
Dialog.init = function(options, getResultFunc){
	if(!options){
		options = {};
	}
	var input = Dialog.getInput();
	var bodyElement = window.document.body;
	window.document.title = "Join";
	if(input.subtitle){
		var subtitleElement = UtilsDom.createElement(bodyElement,"div","subtitle",{},0);
		subtitleElement.innerHTML = input.subtitle;
	}
	if(input.title){
		var titleElement = UtilsDom.createElement(bodyElement,"div","title",{},0);
		titleElement.innerHTML = input.title;
	}
	var buttonsElement = UtilsDom.createElement(bodyElement,"div","buttons");
	var resultFunc = function(){
		var result = null;
		if(getResultFunc){
			result = getResultFunc();
		}
		window.dialogResultSet = true;
		Dialog.setResult(result);
	};
	if(options.showOk === undefined || options.showOk){
		var buttonOk = UtilsDom.createElement(buttonsElement,"input","buttonOk",{type:"button",value:"OK"});
		buttonOk.onclick = resultFunc;
	}
	if(options.showCancel === undefined || options.showCancel){
		var buttonCancel = UtilsDom.createElement(buttonsElement,"input","buttonCancel",{type:"button",value:"Cancel"});
		buttonCancel.onclick = function(){
			Dialog.cancel("cancel");
		}
	}
	var buttons = {};
	for (var i = 0; i < buttonsElement.children.length; i++) {
		var button = buttonsElement.children[i];
		buttons[button.id] = button;
	}
	var sheet = document.getElementById("dialog_style");
    if(back.getDarkMode()) {
        sheet.setAttribute("href","../../css/dialog_dark.css");
    }
    else {
        sheet.setAttribute("href","../../css/dialog.css");
    }
	window.addEventListener("unload",function(){
		Dialog.cancel("closed window");
	});
	UtilsDom.waitForEscKey(window.document)
	.then(function(){
		Dialog.cancel("closed window with Esc");
	});
	UtilsDom.waitForEnterKey(window.document)
	.then(function(result){
		resultFunc();
	});
	setTimeout(Dialog.resizeCurrentDialog,200);
	return {
		buttons:buttons,
		input:input
	};
}
Dialog.resizeCurrentDialog = function(){
	back.getCurrentTab(function(tab){
		console.log("height:" +window.document.body.offsetHeight)
		console.log(tab);
		chrome.windows.update(tab.windowId,{
			height:window.document.body.offsetHeight + 60
		});
	});
}