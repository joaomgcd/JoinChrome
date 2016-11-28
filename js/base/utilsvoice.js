var UtilsVoice = {
	"doVoiceRequest": function(content){
		return back.UtilsVoice.doAPIRequest("query", content);
	},
	"doUserEntitiesRequest": function(content){
		return back.UtilsVoice.doAPIRequest("userEntities", content);
	},
	"doAPIRequest": function(endpoint, content){
		return new Promise(function(resolve,reject){
			doRequestWithAuth("POST",`https://api.api.ai/v1/${endpoint}?v=20150910`,content,resolve,reject,false,"eb85c6f1eca549b796406fe900f0d73e");
		});
	},
	"getDeviceEntities": function(devices){
		var deviceEntities = [];
		for(device of devices){
			deviceEntities.push({
               "value":device.deviceName,
               "synonyms":[
                  device.deviceName
               ]
            });
		}
		return deviceEntities;
	},
	"handleVoiceCommand" : function(result){
		if(result.command){
			result.command.func(result.device.deviceId,true,result.parameters.input)
		}else if(result.action == "reply"){
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
		}else if(result.action == "open.notification"){
			var lastNotification = UtilsObject.whereMax(notifications, notification => notification.date);
			if(lastNotification){
				lastNotification.doAction(lastNotification.actionId);
				showNotification("Join","Opened notification");
			}else{
				showNotification("Join","No notification to open");
			}
		}
	},
	"doVoiceCommand": UtilsObject.async(function* (devices, callbackPrompt, command){
		var deviceEntities = back.UtilsVoice.getDeviceEntities(devices);
		if(callbackPrompt && !command){
			callbackPrompt("Say something like 'Screenshot on my Nexus 6' or 'send this tab to my LG G4'");
		}
		try{
			var input = {
				"deviceEntities":deviceEntities,
				"callbackPrompt":callbackPrompt,
				"command": command,
				"contexts": []
			};
			if(localStorage.deviceCommandContexts){
				input.contexts.push(JSON.parse(localStorage.deviceCommandContexts));
			}
			var lastReplyNotification = UtilsObject.whereMax(notifications.where(notification => notification.replyId), notification=>notification.date);
			if(lastReplyNotification){
				input.contexts.push({
					"name":"replyInfo",
					"parameters":{
						"replyId": lastReplyNotification.replyId
					}
				});
			}
			var result = yield UtilsVoice.voiceRecognizer.doVoiceCommand(input);

			if(!result){
				throw "No command";
			}
			var contextsInOutput = false;
			if(result.contexts){
				var deviceAndCommandContext = result.contexts.first(context => context.name == "deviceandcommand");
				if(deviceAndCommandContext){
					localStorage.deviceCommandContexts = JSON.stringify(deviceAndCommandContext);
					contextsInOutput = true;
				}
			}
			if(!contextsInOutput){
				delete localStorage.deviceCommandContexts;
			}
			if(result.parameters.device){
				var foundDevice = UtilsObject.first(devices,
					device=>device.deviceId == result.parameters.device,
					device=>device.deviceName.toLowerCase().indexOf(result.parameters.device.toLowerCase()) >= 0);
				if(!foundDevice){
					throw "Device not found";
				}		
				result.command = deviceCommands.first(command => command.commandId == result.parameters.device_command);
				if(!result.command.condition(foundDevice)){
					throw `${foundDevice.deviceName} can't perform command ${result.command.label}`;
				}
				result.device = foundDevice;
			}
			UtilsVoice.handleVoiceCommand(result);	
			return result;
		}catch(error){
			throw error;
		}
	}),
	"toggleContinuous": UtilsObject.async(function* (devices, wakeUp, statusFunc, callbackPrompt, callback, callbackError){
		var status = statusFunc();
		UtilsVoice.voiceRecognizer.stopSpeechRecognition();
		UtilsVoice.voiceRecognizer = new VoiceRecognizer(status,wakeUp);
		if(status){
			var continuousCallback = UtilsObject.async(function* (command){
				if(!command){
					return;
				}
				UtilsVoice.voiceRecognizer.stopSpeechRecognition();
				if(!statusFunc()){
					return;
				}
				UtilsVoice.voiceRecognizer = new VoiceRecognizer(false,wakeUp);
				try{
					var result = yield back.UtilsVoice.doVoiceCommand(devices,callbackPrompt,command);
					if(!result){
						return;
					}
					if(callback){
						callback(result);
					}
				}catch(error){
					if(callbackError){
						callbackError(error);
					}
				}
				UtilsVoice.voiceRecognizer = new VoiceRecognizer(true,wakeUp);
				UtilsVoice.voiceRecognizer.startSpeechRecognition(continuousCallback);
			});
			UtilsVoice.voiceRecognizer.startSpeechRecognition(continuousCallback);
		}
	})
}
var VoiceRecognizer = function(continuous, wakeUp){
	var me = this;
	var continuous = continuous ? true : false;
	var wakeUp = wakeUp ? wakeUp.toLowerCase() : null;
	var timeoutWakeup = null;
	var defaultSessionId = localStorage.apiaiSessionId;
	if(!defaultSessionId){
		defaultSessionId = back.UtilsObject.guid();
		localStorage.apiaiSessionId = defaultSessionId;
	}
	var stopped = true;
	me.doVoiceCommand = UtilsObject.async(function* (input) {
		if(!input.retries){
			input.retries = 0;
		}else{
			if(input.retries>=3){
				throw "Command cancelled";
			}
		}
		var deviceEntities = input.deviceEntities;
		var command = input.command;
		var previousResult = input.previousResult;
		if(!command){
			command = yield me.getVoiceCommand();
		}
		if(!command){
			return doVoiceCommand(input);
		}
		var sendEntities = true;
		if(!deviceEntities){
			sendEntities &= false;
		}
		if(!localStorage.hasOwnProperty("lastEntitySend")){
			localStorage.lastEntitySend = new Date().getTime();
			sendEntities &= true;
		}else{
			var lastEntitySend = parseInt(localStorage.lastEntitySend);
			if(new Date().getTime() - lastEntitySend < 1500000){
				sendEntities &= false;
			}
		}
		if(sendEntities){
			//25 minutes have passed since last send
			back.console.log("25 minutes have passed since last entity send")
			if(deviceEntities){
				var entities = {
				   "sessionId": defaultSessionId,
				   "entities":[
				      {
				         "name":"device",
				         "entries":deviceEntities
				      }
				   ]
				};
				back.UtilsVoice.doUserEntitiesRequest(entities);
			}
		}
		var content = {
			"query": [
		       command,
		    ],
		    "lang": "en",
		    "sessionId": defaultSessionId,
		    "contexts":[]
		};
		if(previousResult && previousResult.contexts){
			content.contexts.push(...previousResult.contexts);
		}
		if(input.contexts){
			content.contexts.push(...input.contexts);
		}
		var response = yield back.UtilsVoice.doVoiceRequest(content);
		back.console.log("Voice Response!");
		back.console.log(response);
		var result = response.result;
		var speech = result.fulfillment.speech;
		if(result.action == "input.unknown"){
			throw speech;
		}
		if(result.actionIncomplete){
			if(input.callbackPrompt){
				yield input.callbackPrompt(speech);
			}
			return me.getVoiceCommand()
			.then(command => {
				if(command){
					input.command = command;
					input.retries = 0;
				}else{
					input.retries++;
				}
				input.previousResult = result;
				return me.doVoiceCommand(input);
			})
			.catch(error=>{
				me.doVoiceCommand(input);
				input.retries++;
			});
		}
		return result;
	});
	var showListeningNotification = function(){
		showNotification("Join","Say your voice command",3000);
	}
	me.stopSpeechRecognition = function(){
	    stopped = true;
		if(VoiceRecognizer.recognition){
			VoiceRecognizer.recognition.continuous = false;
	        back.console.log("Stopping speech recognition");
	        VoiceRecognizer.recognition.stop();
	        VoiceRecognizer.recognition.abort();
	    }
	}
	var getWakeUp = function(){
		return wakeUp;  
	}
	me.getAlwaysListeningEnabled = function(){
		return continuous;  
	}
	var setSpeechRecognitionTimeout = function(){
		back.console.log("restarting awake timeout");
	    clearTimeout(timeoutWakeup);
	    timeoutWakeup = setTimeout(function(){woken = false;showNotification("Join","No command heard");},7500);  
	}
	var getLanguage = VoiceRecognizer.getLanguage;
	me.getVoiceCommand = function(){
		return me.isMicAvailable()
		.then(()=>{
			return new Promise(function(resolve,reject){
				me.startSpeechRecognition(resolve, reject);
			});
		});
	}
	me.isMicAvailable = function(){
		return new Promise(function(resolve,reject){
		    navigator.webkitGetUserMedia({
		        audio: true,
		    }, function(stream) {
		    	if(stream.stop){
			        stream.stop();
			    }
		        resolve();
		    }, function() {
		        reject("Mic not available. Open the Join popup and click on the settings icon to enable mic.");
		    });
		})
	}  
	var woken = false;
	var sentForThisRecognition = false;
	me.startSpeechRecognition = function(callback, callbackError){		
		if(!me.getAlwaysListeningEnabled()){
			woken = true;	
		}
	    if(VoiceRecognizer.recognition == null){
	        VoiceRecognizer.recognition = new webkitSpeechRecognition();
	    }
	    VoiceRecognizer.recognition.stop();
	    VoiceRecognizer.recognition.continuous = VoiceRecognizer.recognition.interimResults = me.getAlwaysListeningEnabled();
	    VoiceRecognizer.recognition.onstart = function(){
	        back.console.log("Speech Start");
	    }
	    VoiceRecognizer.recognition.onresult = function(event) {
	        var wakeup = getWakeUp();        
	        for (var i = event.resultIndex; i < event.results.length; ++i) {
	            var command = event.results[i][0].transcript.trim().toLowerCase();
	            if (event.results[i].isFinal) {
	                back.console.log("command: " + command);
	                if(woken){
	                    if(wakeup){
	                        command = command.replace(wakeup,"");
	                    }
	                    if(command){
	                        clearTimeout(timeoutWakeup);
	                        sentForThisRecognition = true;
	                        callback(command);
	                        woken = false;
	                        if(!VoiceRecognizer.recognition.continuous){
	                            me.stopSpeechRecognition();
	                        }
	                    }
	                }
	            }else{
	                if(!woken){
	                    if(!wakeup){
	                        woken = true;
	                    }else{
	                        woken = command.toLowerCase().indexOf(wakeup.toLowerCase()) >= 0;
	                        if(woken){
	                            showListeningNotification();
	                            setSpeechRecognitionTimeout();
	                            back.console.log("Awake!");
	                        }
	                    }
	                }else{                    
	                    setSpeechRecognitionTimeout();
	                }
	            }
	        }
	    }
	    VoiceRecognizer.recognition.onerror = function(event) {
	        back.console.log("Speech Error: " );
	        back.console.log(event);
	        if(callbackError){
		        callbackError(event.error);
		    }
		    if(event.error == "not-allowed"){
		    	me.stopSpeechRecognition();
		    }
	        /*chrome.tabs.create({
	            'url': "chrome-extension://hglmpnnkhfjpnoheioijdpleijlmfcfb/options.html"
	        });*/
	    }
	    VoiceRecognizer.recognition.onend = function(){
	        back.console.log("Speech End");
	        me.isMicAvailable()
	        .then(()=>{
		        if(me.getAlwaysListeningEnabled() && !stopped){
		            VoiceRecognizer.recognition.start();   
		        }else{
		        	if(!sentForThisRecognition){
			        	callback(null);
			        }
		        }
	        })
	        .catch(()=>{
	        	back.console.log("mic not available. Stopping.")
	        });
			sentForThisRecognition = false;
	    }
	    VoiceRecognizer.recognition.lang = getLanguage();

	    try {
	        VoiceRecognizer.recognition.start();
	    	stopped = false;
	        back.console.log("started recognition with language " + VoiceRecognizer.recognition.lang);
	    }catch(err){
	        back.console.log("Recognition already started");
	    }
	}
}
VoiceRecognizer.getLanguage = function(){
	return "en";
}
back.UtilsVoice.voiceRecognizer = new VoiceRecognizer();