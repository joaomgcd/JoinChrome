var UtilsSMS = {
	"getNotificationId":function(deviceId,number){
		return deviceId + number;
	},
	"getAttachmentString": function(attachmentId){
  		return "mmsattachment=:=" + attachmentId;
	},
	"isAttachmentCached": function(attachmentId){
		return localStorage.hasOwnProperty(back.UtilsSMS.getAttachmentString(attachmentId));
	},
	"getCachedAttachment": function(attachmentId){
		if(!back.UtilsSMS.isAttachmentCached(attachmentId)){
			return null;
		}
  		return localStorage[back.UtilsSMS.getAttachmentString(attachmentId)];
	},
	"setCachedAttachment": function(attachmentId,attachment){
		localStorage[back.UtilsSMS.getAttachmentString(attachmentId)] = attachment;
	}	
};