class GCMBase{
	static async executeGcmFromJson(type,json){		
		return await GCMBase.doForGCMFromJson(type,json,async gcm=>await gcm.execute(type));
	}
	static async handleClickGcmFromJson(serviceWorker,type,json,action,data){		
		const gcm = await GCMBase.getGCMFromJson(type,json);
		return await gcm.handleNotificationClick(serviceWorker,action,data);
	}
	static async doForGCMFromJson(type,json,action){
		var gcm = await GCMBase.getGCMFromJson(type,json);
		return {
			"gcm":gcm,
			"notifications" : await action(gcm)
		}
	}
	static async getGCMFromJson(type,json){
        var gcm = null;
        try{
            gcm = GCMBase.getGCMFromType(type)
        }catch{
            console.log(`Unkown GCM type: ${type}`)
        }
		if(!gcm){
			gcm = new GCMBase();
		}
		await gcm.fromJsonString(json);
		return gcm;
    }
    //abstract
	static getGCMFromType(type){}
	constructor(){
		this.type = this.constructor.name;
	}
	get gcmRaw(){
		if(this._gcmRaw) return this._gcmRaw;

		if(!this.senderId){
			this.senderId = this.myDeviceId;
		}		
		return (async()=>{
			return {
				"json": await this.json,
				"type": this.type
			}
		})();	
	}
	get json(){
		return JSON.stringify(this);
	}
    //abstract
	get myDeviceId(){}
	//abstract
	execute(){}
	set gcmRaw(value){
		this._gcmRaw = value;
	}
	async storeGcmRaw(){
		this.gcmRaw = await this.gcmRaw;
	}
	getResult(title,text,silent){
		return {
			"title":title,
			"text":text,
			"silent":silent
		}
	}
	async handleNotificationClick(action){
		console.log("GCMBase doing nothing on click",action)
	}
	async fromJson(json) {
		for (const prop in json) {
			const value = json[prop];
			this[prop] = await Encryption.decrypt(value);
		}
	}
	async fromJsonString(str) {
		await Encryption.decrypt(str);
		var json = JSON.parse(str);
		await this.fromJson(json);
		//this.json = str;
	}
	async getImageUrl(image){
		return `data:image/png;base64,${image}`; 
	}
}
class GCMNotificationBase{
	static get notificationDismissAction(){
		return {action: "dismiss",title: 'Dismiss Everywhere'}
	}
	static get notificationReplyAction(){
		return {action: "reply",title: 'Reply Directly'}
	}
	static async getNotificationOptions(notificationfromGcm){
		const icon = Util.getBase64ImageUrl(notificationfromGcm.iconData);
		var badge = notificationfromGcm.statusBarIcon;
		badge =  badge ? Util.getBase64ImageUrl(badge) : icon;
		const image = await GoogleDrive.convertFilesToGoogleDriveIfNeeded({files:notificationfromGcm.image,authToken:this.authToken,downloadToBase64IfNeeded:true});
		const options = {
			"id": notificationfromGcm.id,
			"tag": notificationfromGcm.id,
			"title": notificationfromGcm.title,
			"text": notificationfromGcm.text,
			"body": notificationfromGcm.text,
			"icon": icon,
			"badge": badge,
			"image": image,
			"requireInteraction":true,
			"data": {notificationForClick:notificationfromGcm},
			actions: [
				GCMNotificationBase.notificationDismissAction
			]      
		};
		if(notificationfromGcm.replyId){
			options.actions.push(GCMNotificationBase.notificationReplyAction);
		}
		return options;
	}
	static async getGCMReply({senderId,text,notification}){
		const gcmNotificationAction = GCMBase.getGCMFromType("GCMNotificationAction")
		gcmNotificationAction.requestNotification = {
			deviceId:senderId,
			actionId:notification.replyId,
			appPackage:notification.appPackage,
			text
		};
		return gcmNotificationAction;
	}
	static async getNotificationActionGcm({action,notification,deviceId}){
		if(!action){
			const gcmNotificationAction = GCMBase.getGCMFromType("GCMNotificationAction");
			gcmNotificationAction.authToken = this.authToken;
			gcmNotificationAction.requestNotification = {
				deviceId,
				actionId:notification.actionId,
				appPackage:notification.appPackage
			};
			return gcmNotificationAction;
		}
		if(action == GCMNotificationBase.notificationDismissAction.action){
			const gcmNotificationClear = GCMBase.getGCMFromType("GCMNotificationClear");
			gcmNotificationClear.deviceId = deviceId;
			gcmNotificationClear.authToken = this.authToken;
			gcmNotificationClear.requestNotification = {
				deviceIds:[deviceId],
				requestId:notification.id,
			};
			return gcmNotificationClear;
		}
		const gcmNotificationAction = GCMBase.getGCMFromType("GCMNotificationAction");
        gcmNotificationAction.requestNotification = {
            deviceId,
            actionId:action,
            appPackage:notification.appPackage
		};
		return gcmNotificationAction;
	}
}
class GCMNewSmsReceivedBase{
	static async modifyNotification(notification,gcm,contact){
		const title = contact ? `New SMS from ${contact.name}` : "New SMS";
		const options = {
			"tag": gcm.number,
			title,
			"body": gcm.text,
			"icon": gcm.photo,
			"requireInteraction":true,
			"data": await gcm.gcmRaw
		};
		Object.assign(notification,options);
	}
}