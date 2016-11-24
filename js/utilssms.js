var UtilsSMS = {
	"getNotificationId":function(deviceId,number){
		return deviceId + number;
	},
	"getAttachmentString": function(attachmentId){
  		return "mmsattachment=:=" + attachmentId;
	},
	"isAttachmentCached": function(attachmentId){
		if(!back.UtilsSMS.getCachedAttachment(attachmentId)){
			return false;
		}
		return true;
	},
	"getCachedAttachment": function(attachmentId){
		var cached = localStorage[back.UtilsSMS.getAttachmentString(attachmentId)];
		if(!cached || cached == "null"){
			return null;
		}
  		return cached;
	},
	"setCachedAttachment": function(attachmentId,attachment){
		if(!attachmentId || !attachment){
			return;
		}
		try{
			localStorage[back.UtilsSMS.getAttachmentString(attachmentId)] = attachment;
		}catch(error){
			back.console.log("Couldn't set MMS image cache:");
			back.console.log(error);
		}
	}	
};