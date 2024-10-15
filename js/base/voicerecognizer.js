var VoiceRecognizer = function (continuous, wakeUp) {
	var me = this;
	var continuous = continuous ? true : false;

	var wakeUp = wakeUp;
	var timeoutWakeup = null;
	var defaultSessionId = localStorage.apiaiSessionId;
	if (!defaultSessionId) {
		defaultSessionId = back.UtilsObject.guid();
		localStorage.apiaiSessionId = defaultSessionId;
	}
	var stopped = true;
	me.doVoiceCommand = async function (input) {
		if (!input.retries) {
			input.retries = 0;
		} else {
			if (input.retries >= 3) {
				throw "Command cancelled";
			}
		}
		var deviceEntities = input.deviceEntities;
		var command = input.command;
		var previousResult = input.previousResult;
		if (!command) {
			command = await me.getVoiceCommand();
		}
		/*if(!command){
			return doVoiceCommand(input);
		}*/
		var sendEntities = true;
		if (!deviceEntities) {
			sendEntities &= false;
		}
		if (!localStorage.hasOwnProperty("lastEntitySend")) {
			localStorage.lastEntitySend = new Date().getTime();
			sendEntities &= true;
		} else {
			var lastEntitySend = parseInt(localStorage.lastEntitySend);
			if (new Date().getTime() - lastEntitySend < 1500000) {
				sendEntities &= false;
			}
		}
		if (sendEntities) {
			//25 minutes have passed since last send
			back.console.log("25 minutes have passed since last entity send")
			if (deviceEntities) {
				var entities = {
					"sessionId": defaultSessionId,
					"entities": [
						{
							"name": "device",
							"entries": deviceEntities
						}
					]
				};
				await back.UtilsVoice.doUserEntitiesRequest(entities);
			}
		}
		var content = {
			"query": [
				command,
			],
			"lang": "en",
			"sessionId": defaultSessionId,
			"contexts": []
		};
		if (previousResult && previousResult.contexts) {
			content.contexts.push(...previousResult.contexts);
		}
		if (input.contexts) {
			content.contexts.push(...input.contexts);
		}
		var response = await back.UtilsVoice.doVoiceRequest(content);
		back.console.log("Voice Response!");
		back.console.log(response);
		var result = response.result;
		var speech = result.fulfillment.speech;
		if (result.action == "input.unknown") {
			throw speech;
		}
		if (result.actionIncomplete) {
			if (input.callbackPrompt) {
				await input.callbackPrompt(speech);
			}
			try {
				const command = await me.getVoiceCommand();
				if (command) {
					input.command = command;
					input.retries = 0;
				} else {
					input.retries++;
				}
				if (input.callbackIncomplete) {
					var handleIncompleteInput = { "result": result, "command": command };
					await input.callbackIncomplete(handleIncompleteInput);
					if (handleIncompleteInput.command) {
						input.command = handleIncompleteInput.command;
					}
				}
				input.previousResult = result;
				return await me.doVoiceCommand(input);
			} catch (error) {
				me.doVoiceCommand(input);
				input.retries++;
			}
		}
		return result;
	};
	var showListeningNotification = function () {
		showNotification("Join", "Say your voice command", 3000);
	}
	me.stopSpeechRecognition = function () {
		stopped = true;
		if (VoiceRecognizer.recognition) {
			VoiceRecognizer.recognition.continuous = false;
			back.console.log("Stopping speech recognition");
			VoiceRecognizer.recognition.stop();
			VoiceRecognizer.recognition.abort();
		}
	}
	var getWakeUp = function () {
		var wakeUpFinal = null;
		if (back.UtilsObject.isFunction(wakeUp)) {
			wakeUpFinal = wakeUp();
		}
		wakeUpFinal = wakeUpFinal ? wakeUpFinal.toLowerCase() : null;
		return wakeUpFinal;
	}
	me.getAlwaysListeningEnabled = function () {
		return continuous;
	}
	var setSpeechRecognitionTimeout = function () {
		back.console.log("restarting awake timeout");
		clearTimeout(timeoutWakeup);
		timeoutWakeup = setTimeout(function () { woken = false; showNotification("Join", "No command heard"); }, 7500);
	}
	var getLanguage = VoiceRecognizer.getLanguage;
	me.getVoiceCommand = async function () {
		await me.isMicAvailable();
		return await new Promise(function (resolve, reject) {
			me.startSpeechRecognition(resolve, reject);
		});
	}
	me.isMicAvailable = function () {
		return new Promise(function (resolve, reject) {
			if (!back.getVoiceEnabled()) {
				reject("Voice not enabled");
				return;
			}
			navigator.webkitGetUserMedia({
				audio: true,
			}, function (stream) {
				if (stream.stop) {
					stream.stop();
				}
				resolve();
			}, function () {
				reject("Mic not available. Open the Join popup and click on the settings icon to enable mic.");
			});
		})
	}
	var woken = false;
	var sentForThisRecognition = false;
	me.startSpeechRecognition = function (callback, callbackError) {
		if (!me.getAlwaysListeningEnabled()) {
			woken = true;
		}
		if (VoiceRecognizer.recognition == null) {
			VoiceRecognizer.recognition = new webkitSpeechRecognition();
		}
		VoiceRecognizer.recognition.stop();
		VoiceRecognizer.recognition.continuous = VoiceRecognizer.recognition.interimResults = me.getAlwaysListeningEnabled();
		VoiceRecognizer.recognition.onstart = function () {
			back.console.log("Speech Start");
		}
		VoiceRecognizer.recognition.onresult = function (event) {
			var wakeup = getWakeUp();
			for (var i = event.resultIndex; i < event.results.length; ++i) {
				var command = event.results[i][0].transcript.trim().toLowerCase();
				if (event.results[i].isFinal) {
					back.console.log("command: " + command);
					if (woken) {
						if (wakeup) {
							command = command.replace(wakeup, "");
						}
						if (command) {
							clearTimeout(timeoutWakeup);
							sentForThisRecognition = true;
							callback(command);
							woken = false;
							if (!VoiceRecognizer.recognition.continuous) {
								me.stopSpeechRecognition();
							}
						}
					}
				} else {
					if (!woken) {
						if (!wakeup) {
							woken = true;
						} else {
							woken = command.toLowerCase().indexOf(wakeup.toLowerCase()) >= 0;
							if (woken) {
								showListeningNotification();
								setSpeechRecognitionTimeout();
								back.console.log("Awake!");
							}
						}
					} else {
						setSpeechRecognitionTimeout();
					}
				}
			}
		}
		VoiceRecognizer.recognition.onerror = function (event) {
			back.console.log("Speech Error: ");
			back.console.log(event);
			if (callbackError) {
				callbackError(event.error);
			}
			if (event.error == "not-allowed") {
				me.stopSpeechRecognition();
			}
			/*chrome.tabs.create({
				'url': "chrome-extension://hglmpnnkhfjpnoheioijdpleijlmfcfb/options.html"
			});*/
		}
		VoiceRecognizer.recognition.onend = function () {
			back.console.log("Speech End");
			back.console.log("Is stopped: " + stopped);
			me.isMicAvailable()
				.then(() => {
					if (me.getAlwaysListeningEnabled() && !stopped) {
						VoiceRecognizer.recognition.start();
					} else {
						if (!sentForThisRecognition) {
							callback(null);
						}
					}
				})
				.catch(() => {
					back.console.log("mic not available. Stopping.")
				});
			sentForThisRecognition = false;
		}
		VoiceRecognizer.recognition.lang = getLanguage();

		try {
			VoiceRecognizer.recognition.start();
			stopped = false;
			back.console.log("started recognition with language " + VoiceRecognizer.recognition.lang);
		} catch (err) {
			back.console.log("Recognition already started");
		}
	}
}
VoiceRecognizer.getLanguage = function () {
	return "en";
}
chrome.extension.getBackgroundPage().UtilsVoice.voiceRecognizer = new VoiceRecognizer();