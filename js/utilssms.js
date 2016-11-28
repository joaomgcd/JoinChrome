var UtilsSMS = {
	"getNotificationId":function(deviceId,number){
		return deviceId + number;
	},
	"getAttachmentString": function(attachmentId){
  		return "mmsattachment=:=" + attachmentId;
	},
	"getCachedAttachment": function(attachmentId){
		return back.UtilsDB.getMmsImage(attachmentId);
		/*var cached = localStorage[back.UtilsSMS.getAttachmentString(attachmentId)];
		if(!cached || cached == "null"){
			return null;
		}
  		return cached;*/
	},
	"setCachedAttachment": function(attachmentId,attachment){
		if(!attachmentId || !attachment){
			return;
		}
		return back.UtilsDB.setMmsImage(attachmentId,attachment);
		/*try{
			localStorage[back.UtilsSMS.getAttachmentString(attachmentId)] = attachment;
		}catch(error){
			back.console.log("Couldn't set MMS image cache:");
			back.console.log(error);
		}*/
	}	
};