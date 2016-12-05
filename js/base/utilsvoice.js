var UtilsVoice = {
	"isMicAvailable" : function(){
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
	},
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
               "value":device.deviceName.toLowerCase(),
               "synonyms":[
                  device.deviceName.toLowerCase()
               ]
            });
		}
		return deviceEntities;
	},
	"resetDeviceEntities": function(devices){
		delete localStorage.lastEntitySend;
		delete localStorage.deviceCommandContexts;
		delete localStorage.apiaiSessionId;
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
				"contexts": [],
				"callbackIncomplete": VoiceCommandHandlers.handlers.handleIncomplete
			};
			VoiceCommandHandlers.handlers.addCommandContexts(input.contexts);

			var result = yield UtilsVoice.voiceRecognizer.doVoiceCommand(input);

			if(!result){
				throw "No command";
			}
			VoiceCommandHandlers.handlers.handle(result);						
			return result;
		}catch(error){
			throw error;
		}
	}),
	"toggleContinuous": UtilsObject.async(function* (getDevicesFunc, wakeUp, statusFunc, callbackPrompt, callback, callbackError){
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
					var result = yield back.UtilsVoice.doVoiceCommand(getDevicesFunc(),callbackPrompt,command);
					if(!result){
						return;
					}
					if(callback){
						callback(result);
					}
				}catch(error){
					if(callbackError){
						if(command){
							if(UtilsObject.isString(error)){
								if(error.lastIndexOf(".") != error.length - 1){
									error +=".";
								}
								error += " Command was: " + command;	
							}
						}
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
