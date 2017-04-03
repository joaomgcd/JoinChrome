if(back.eventBus){
	var BackgroundEventHandler = function(){
		var trackReceivedSms = true;
		var smsWhilePopupClosed = {};
		this.onPopupUnloaded = function(){
			trackReceivedSms = true;	
		}
		this.onPopupLoaded = function(){
			trackReceivedSms = false;
		}
		this.onSMSReceived = function(smsReceived){
			if(!trackReceivedSms){
				return;
			}
			var listForDevice = smsWhilePopupClosed[smsReceived.deviceId];
			if(!listForDevice){
				smsWhilePopupClosed[smsReceived.deviceId] = [];
			}
			smsWhilePopupClosed[smsReceived.deviceId].push(smsReceived.sms);
			back.console.log("Added sms to received while no popup");
			back.console.log(smsWhilePopupClosed[smsReceived.deviceId]);
		}
		this.getSmsWhilePopupClosed = function(deviceId,purge){
			if(!deviceId){
				return [];
			}
			var result = smsWhilePopupClosed[deviceId];
			if(!result){
				result = [];
			}
			if(purge){
				smsWhilePopupClosed[deviceId] = [];
			}
			return result;
		}
	}
	back.backgroundEventHandler = new BackgroundEventHandler();

	back.eventBus.register(back.backgroundEventHandler);
}