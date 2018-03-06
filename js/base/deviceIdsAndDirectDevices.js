
var DeviceIdsAndDirectDevices = function(deviceIds,allDevices, showNotificationFunc){

	var GCM_PARAM_TIME_TO_LIVE = "time_to_live";
	var GCM_PARAM_PRIORITY = "priority";
	var GCM_MESSAGE_PRIORITY_HIGH = "high";
	var GCM_PARAM_DELAY_WHILE_IDLE = "delay_while_idle";
	var doDirectGCMRequest = function(options){
		return new Promise(function(resolve, reject){
			var regId = options.regId;
			if(!regId){
				regId = options.regIds;
			}
			var gcmString = options.gcmString;
			var gcmType = options.gcmType;
			var gcmParams = options.gcmParams;
		    var req = new XMLHttpRequest();
		    req.open("POST", "https://gcm-http.googleapis.com/gcm/send", true);
		    req.setRequestHeader("Authorization", "key=AIzaSyDvDS_KGPYTBrCG7tppCyq9P3_iVju9UkA");
		    req.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
		    req.onload = function() {
		        console.log("POST status: " + this.status);
		        var result = {};
		        if(this.status != 200){
		            reject(this.responseText);
		        }
		        if(this.responseText){
		            result = JSON.parse(this.responseText)
		        }
		       	resolve(result);
		    }
		    req.onerror = function(e) {
		        reject(e.currentTarget);
		    }
		    if(typeof regId == "string"){
		        regId = [regId];
		    }
		    var content = {
		        "data": {
		            "json": gcmString,
		            "type": gcmType
		        },
		        "registration_ids": regId
		    }

			UtilsObject.applyProps(content,gcmParams);
		    //content.applyProps(gcmParams);
		    content[GCM_PARAM_PRIORITY] = GCM_MESSAGE_PRIORITY_HIGH;
		    content[GCM_PARAM_DELAY_WHILE_IDLE] = false;
		    var contentString = JSON.stringify(content);
		    req.send(contentString);

		});
	};
	var me = this;
	if(!allDevices){	
		allDevices = back.devices;
	}
	if(!showNotificationFunc){
		showNotificationFunc = back.showNotification;
	}
	if(!deviceIds){
		deviceIds = [];
	}
	if(typeof deviceIds == "string"){
		deviceIds = deviceIds.split(",");
	}
	deviceIds = deviceIds.where(deviceId=>deviceId?true:false);
	this.deviceIds = deviceIds;
	this.serverDevices = [];
	this.directDevices = [];

	this.convertGroupToDeviceIds = function(device){
		var devicesResult = [];
		if(device.deviceId.indexOf("group." == 0)){
			var devicesForGroup = back.joindevices.groups.deviceGroups.getGroupDevices(allDevices, device.deviceId);
			if(devicesForGroup && devicesForGroup.length > 0){
				for (var i = 0; i < devicesForGroup.length; i++) {
					var deviceForGroup = devicesForGroup[i];
					devicesResult.push(deviceForGroup);
				}
			}else{
				devicesResult.push(device);
			}
		}else{
			devicesResult.push(device);
		}
		return devicesResult;
	}
	var devicesForId = allDevices.where(function(device){
		return deviceIds.indexOf(device.deviceId) >= 0;
	});
	if(devicesForId.length == 0){
		if(deviceIds.length>0){
			me.serverDevices.push({"deviceId":deviceIds[0]});
		}
	}else{
		devicesForId.doForAll(function(deviceForId){
			var devicesExpanded = me.convertGroupToDeviceIds(deviceForId);
			devicesExpanded.doForAll(function(deviceForId){
				if(deviceForId.regId2){
					me.directDevices.removeIf(function(device){
						return device.deviceId == deviceForId.deviceId;
					});
					me.directDevices.push(deviceForId);
				}else{
					me.serverDevices.removeIf(function(device){
						return device.deviceId == deviceForId.deviceId;
					});
					me.serverDevices.push(deviceForId);
				}
			});		
		});
	}
	
	this.callCallback = function(callback,data){
		if(callback){
			callback(data);
		}
	}
	this.sendPromise = function(options){
		return new Promise(function(resolve,reject){
			me.send(options.sendThroughServer,options.gcm,options.gcmParams,function(result){
				if(!result.success){
					reject(result.errorMessage);
				}else{
					resolve(result);
				}
			},reject,options);
		});
	}
	var doIftttRequest = function(options){
		var text = options.gcm.push.text;
		if(!text) return Promise.reject("Push to IFTTT needs text");

		return Promise.all(options.devices.map(device=>{			
			var autoAppsCommand = new AutoAppsCommand(text,"value1,value2,value3");
			var valuesForIfttt = {};
			var url = `https://maker.ifttt.com/trigger/${autoAppsCommand.command}/with/key/${device.regId}`;
			if(autoAppsCommand.values.length > 0){
				url += "?"
			}
			for (var i = 0; i < autoAppsCommand.values.length; i++) {
				var value = autoAppsCommand.values[i]
				var varName = `value${i+1}`;
				valuesForIfttt[varName] = value;
				if(i>0){
					url += "&";
				}
				url += `${varName}=${encodeURIComponent(value)}`;
			}			
			//console.log(valuesForIfttt);
			var postOptions = {
				method: 'GET',
				//body: JSON.stringify(valuesForIfttt), 
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				}
			}
			//console.log(url);
			var getSucess = text => ({"success":true,"message_id":UtilsObject.guid()})
			return fetch(url,postOptions).then(getSucess).catch(getSucess);
		}))
		.then(allResults => ({"results":allResults}));
	}
	var doDirectIpRequest = function(options){
		function IPnumber(IPaddress) {
			var colonPosition = IPaddress.indexOf(":");
			if(colonPosition>=0){
				IPaddress = IPaddress.substring(0,colonPosition);
			}
		    var ip = IPaddress.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
		    if(ip) {
		        return (+ip[1]<<24) + (+ip[2]<<16) + (+ip[3]<<8) + (+ip[4]);
		    }
		    // else ... ?
		    return null;
		}

		function IPmask(maskSize) {
		    return -1<<(32-maskSize)
		}
		function getMyIp(){
			return new Promise((resolve,reject)=>{

				var pc = new RTCPeerConnection({iceServers:[]}), noop = function(){};      
				pc.createDataChannel('');//create a bogus data channel
				pc.createOffer(pc.setLocalDescription.bind(pc), noop);// create offer and set local description
				pc.onicecandidate = ice =>
				{
					if (!ice || !ice.candidate || !ice.candidate.candidate) return;

					var regexResult = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
					if(!regexResult) return;

					var myIP = regexResult[1];   
					pc.onicecandidate = noop;
					resolve(myIP)
				};
			});
		}
		function isInSameLocalNetwork(ipToCheck,myIp){
			if(ipToCheck.indexOf("localhost")>=0) return true;
			return (IPnumber(ipToCheck) & IPmask('24')) == (IPnumber(myIp) & IPmask('24'));
		}
		var rawGcm = {
			"json": options.gcmString,
			"type": options.gcmType
		}
		return getMyIp()
		.then(myIp=>{
			return Promise.all(options.devices.map(device => {
				var doForOneDevice = function(options){
					var sameNetwork  = isInSameLocalNetwork(device.regId2,myIp);
					var regId = options.secondTry || !sameNetwork ? device.regId : device.regId2;
					var postOptions = {
						method: 'POST',
						body: JSON.stringify(rawGcm), 
						headers: {
							'Content-Type': 'application/json'
						}
					}
					var url = `http://${regId}/push`;
					var getSucess = text => ({"success":true,"message_id":UtilsObject.guid()})
					var getError = error => {
						if(options.secondTry) return {"success":false,"error":UtilsObject.isString(error) ? error : error.message};
						options.secondTry = true;
						return doForOneDevice(options);
					}
			    	return fetch(url,postOptions).then(result=>result.text()).then(getSucess).catch(getError)
				}
				return doForOneDevice(options);
			}))
			.then(allResults => ({"results":allResults}));
		});				
		
		
	}
	var deviceTypesDirectFuncs = {};
	deviceTypesDirectFuncs[DEVICE_TYPE_IP+""] = {"func":doDirectIpRequest,"onlySendPushes":true};
	deviceTypesDirectFuncs[DEVICE_TYPE_IFTTT+""] = {"func":doIftttRequest,"onlySendPushes":true};
	this.getDeviceTypeFunc = type => deviceTypesDirectFuncs[type+""];


	var sendAndHandleResult = UtilsObject.async(function* (funcToCall,options){
		var devices = options.devices;
		var gcmString = options.gcmString;
		var gcm = options.gcm;
		var gcmParams = options.gcmParams;
		var callback = options.callback;
		var serverDevices = options.serverDevices;
		var regIds = devices.select(device => device.regId2);
		var multicastResult = yield funcToCall({regIds:regIds,gcmString:gcmString,gcmType:gcm.getCommunicationType(),gcmParams:gcmParams,devices:devices,gcm:gcm});

		for (var i = 0; i < devices.length; i++) {
			var device = devices[i];
			var result = multicastResult.results[i];
			me.handleGcmResult(device, result, options);
		}
		
		if(serverDevices.length == 0){
			me.callCallback(callback,result);
		}

        console.log("Posted direct GCM");
        console.log(gcmString);
	});
	this.send = UtilsObject.async(function* (sendThroughServer, gcm, gcmParams,callback, callbackError, options){
		if(!gcm){
			me.callCallback(callbackError,"No message to push");
			return;
		}
		var serverDevices = me.serverDevices;
		var directDevices = me.directDevices;
		var gcmString = JSON.stringify(gcm);
		if(gcmString.length > 3500){
			serverDevices = serverDevices.concat(directDevices);
			directDevices = [];
		}
		if(directDevices.length > 0){
			if(!gcmParams){
				gcmParams = {};
			}
			try{
				if(!options){
					options = {};
				}
				options.gcmString = gcmString;
				options.gcm = gcm;
				options.gcmParams = gcmParams;	
				options.callback = callback;	
				options.serverDevices = serverDevices;
				var groupsByCustomFunc = directDevices.groupBy(device=>this.getDeviceTypeFunc(device.deviceType)?true:false);
				for(var groupKeyCustomFunc in groupsByCustomFunc){
					var groupCustomFunc = groupsByCustomFunc[groupKeyCustomFunc];					
					if(groupKeyCustomFunc == "false"){
						options.devices = groupCustomFunc;
						yield sendAndHandleResult(doDirectGCMRequest,options);
					}else{
						var groups = groupCustomFunc.groupBy(device=>device.deviceType);
						for(var groupKey in groups){
							var group = groups[groupKey];
							var forThisType = this.getDeviceTypeFunc(group[0].deviceType);

							if(forThisType.onlySendPushes && !gcm.push) continue;

							var funcToCall = forThisType.func;
							options.devices = group;
							yield sendAndHandleResult(funcToCall,options);
						}
					}
					
				}
			}catch(error){
				var title = "Direct GCM error";
	            console.log(title);
	            console.error(error);
	            if(error && error.responseText){
	            	showNotificationFunc(title, "Error: " + error.responseText);            	
					if(serverDevices.length == 0){
						me.callCallback(callbackError,error.toString());
					}	            	
	            }
			}			
		}
		if(serverDevices.length > 0){
			sendThroughServer(serverDevices.select(device => device.deviceId),result=>{				
	        	if(options && options.onSendSuccess){
	        		options.onSendSuccess();
	        	}
	        	if(callback){
	        		callback(result);
	        	}
			},callbackError);
		}
	});
	this.handleGcmResult = function(device, result, options){
		console.log("Direct GCM result");
        console.log(result);
        if(result.message_id){
        	if(result.registration_id){
        		device.regId2 = result.registration_id;
        		console.log("RegId2 changed for " + device.deviceName);
        		setDevices(allDevices);
        	}
        	result.success = true;
        	if(options && options.onSendSuccess){
        		options.onSendSuccess(device);
        	}
        }else{
        	var error = result.error;
        	var errorMessage = error;
        	if(error == "NotRegistered"){
        		errorMessage = "Device not registered!";
        		back.console.error(errorMessage);
        		return;
        	}
    		if(!errorMessage){
    			errorMessage = "Unknown Error";
    		}
    		result.errorMessage = errorMessage;
    		console.log(errorMessage);
    		showNotificationFunc("Error Direct Send", errorMessage);
        }
	}
}