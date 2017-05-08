
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
			},reject);
		});
	}
	this.send = UtilsObject.async(function* (sendThroughServer, gcm, gcmParams,callback, callbackError){
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
			var regIds = directDevices.select(device => device.regId2);
			if(!gcmParams){
				gcmParams = {};
			}
			try{
				var multicastResult = yield doDirectGCMRequest({regIds:regIds,gcmString:gcmString,gcmType:gcm.getCommunicationType(),gcmParams:gcmParams});
				for (var i = 0; i < directDevices.length; i++) {
					var device = directDevices[i];
					var result = multicastResult.results[i];
					me.handleGcmResult(device, result);
				}
				
				if(serverDevices.length == 0){
					me.callCallback(callback,result);
				}

	            console.log("Posted direct GCM");
	            console.log(gcmString);
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
			sendThroughServer(serverDevices.select(device => device.deviceId),callback,callbackError);
		}
	});
	this.handleGcmResult = function(device, result){
		console.log("Direct GCM result");
        console.log(result);
        if(result.message_id){
        	if(result.registration_id){
        		device.regId2 = result.registration_id;
        		console.log("RegId2 changed for " + device.deviceName);
        		setDevices(allDevices);
        	}
        	result.success = true;
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