
const USE_LOCAL_SERVER = false;
const JOIN_SERVER_LOCAL = "http://localhost:8080";
// const JOIN_SERVER = "https://joinjoaomgcd.appspot.com";
const JOIN_SERVER = "https://testsjoaomgcd.appspot.com/";
//TEM QUE SE USAR O SERVIDOR CERTO PÁ SE NÂO TÀ TUDO MARADO!!!
const JOIN_BASE_URL = `${USE_LOCAL_SERVER ? JOIN_SERVER_LOCAL : JOIN_SERVER}/_ah/api/`;


GCMBase.getGCMFromType = type => eval(`new ${type}()`);
class GCMBaseServiceWorker extends GCMBase{
	async execute(){
		console.log("Executing GCM from service worker",this);

		const gcmJson = JSON.stringify(this);
		const gcmId = new Date().getTime();
		if(Util.isType(this,"GCMPush")){
			const db = DB.get();
			db.gcm.put({gcmId,json:gcmJson});
		}

		const notifications = [];
		for (let index = 0; index < this.notificationCount; index++) {
			const notification = {};
			await this.modifyNotification(notification,index)
			notifications.push(notification);
		}
		return notifications;
	}
	//abstract
	get notificationCount(){
		return 1;
	}
	//abstract
	async modifyNotification(notification){}
	async handleNotificationClick(serviceWorker,action){
		console.log("Handling Notification click from service worker",this,action);
		const clientList = await clients.matchAll({type: 'window'});
		let client = null;
		if(clientList.length > 0){
			client = clientList[0];
		}
		const url = "/?notifications";
		if(client){
			if(!client.url.endsWith(url)){
				client.navigate(url);
			}	
			client.focus();
		}else{
			Util.openWindow(url);
		}
	}
	get httpHeaders(){
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.authToken}`
		}
	}
	async post(url, obj){
		var options = {
			method: 'POST',
			body: JSON.stringify(obj), 
			headers: this.httpHeaders
		}
		const res = await fetch(url, options);
		return await res.json();
	}
	async get(url){
		var options = {
			method: 'GET',
			headers: this.httpHeaders
		}
		const res = await fetch(url, options);
		return await res.json();
	}
	
	sendPush(push){
		return this.post(`${JOIN_BASE_URL}messaging/v1/sendPush`,push);
	}
	sendRawGcm(rawGcmWithOptions){
		return this.post(`${JOIN_BASE_URL}messaging/v1/sendGenericPush`,rawGcmWithOptions);
	}
	listDevices(apiKey){
		return this.get(`${JOIN_BASE_URL}registration/v1/listDevices/?apikey=${apiKey}`);
	}
	async sendToEndpoint(request){
		return this.post(`${JOIN_BASE_URL}messaging/v1/${this.endpoint}`,this.endpointRequest);
	}
	//open
	get endpoint(){}
	//open
	get endpointRequest(){}

	async getDevice(deviceId){
		if(!deviceId) return null;
		
		const db = (await DB.get());
		const fromDb = await db.devices.get(deviceId);
		if(!fromDb) return null;

		return JSON.parse(fromDb.json);
	}
	async getSender(){
		const senderId = this.senderId;
		if(!senderId) return null;

		return await this.getDevice(senderId);
	}
	async getContact(number){
		if(!number) return null;
		
		const db = (await DB.get());
		const fromDb = await db.contacts.toArray();
		if(!fromDb) return null;

		const contact = fromDb.find(contact=>contact.number == number);
		if(!contact) return;
		
		return JSON.parse(contact.json);
	}
	
}
class GCMGenericPush extends GCMBaseServiceWorker{}
class GCMPush extends GCMBaseServiceWorker{
	async modifyNotification(notification){
		const push = this.push;
		if(!push) return;
	
		var title = push.title;
		var text = push.text;
		const setTitle = toSet => {
			if(title) return;
			title = toSet;
		};
		const setText = toSet => {
			if(text) return;
			text = toSet;
		};
		
        const handleClipboard = async push => {
            const clipboard = push.clipboard;
            if(!clipboard) return;
            
			setTitle(`Setting Clipboard`);
			setText(`Click to copy: ${clipboard}`);
        }
        const handleUrl = async push => {
            const url = push.url;
            if(!url) return;

			setTitle("Click to open URL")
			setText(`${url}`);
        }
        const handleFiles = async push => {
            const files = push.files;
            if(!files || files.length == 0) return;
            
			setTitle("Received Files");
			setText("Click to open");
        }
        const handleLocation = async push => {
            if(!push.location) return;
            
            /*const deviceSender = this.getDevice(push.senderId);
            if(!deviceSender) return;*/

			setTitle("Location Requested");
			setText("Click to respond...");			
        }
        handleUrl(push);
        handleClipboard(push);
        handleFiles(push);
		handleLocation(push);
		
		notification.title = title;
		notification.text = text;
	}
	async handleNotificationClick(serviceWorker,action,data){
		const handleDefault = () => super.handleNotificationClick(serviceWorker,action,data);
		const push = this.push;
		if(!push) return handleDefault();
		if(!push.url) return handleDefault();

		Util.openWindow(push.url);
	}
}
class GCMNotification extends GCMBaseServiceWorker{	
	get notifications(){	
		if(!this.requestNotification) return [];
		if(!this.requestNotification.notifications) return [];

        return this.requestNotification.notifications;
	}
	get notificationCount(){
		this.authToken = this.requestNotification.authToken;
		this.senderId = this.requestNotification.senderId;
		return this.notifications.length;
	}
	async modifyNotification(notification,index){
		const notificationfromGcm = this.notifications[index];
		this.notificationId = notificationfromGcm.id;
		const options = await GCMNotificationBase.getNotificationOptions(notificationfromGcm);
		Object.assign(notification,options);
	}
	async handleNotificationClick(serviceWorker,action,data){
		if(!action){
			const gcmNotificationAction = new GCMNotificationAction();
			gcmNotificationAction.authToken = this.authToken;
			gcmNotificationAction.requestNotification = {
				deviceId:this.senderId,
				actionId:data.notificationForClick.actionId,
				appPackage:data.notificationForClick.appPackage
			};
			const result = await gcmNotificationAction.sendToEndpoint();
			console.log("Notification Action Result", result);
			return;
		}
		if(action == GCMNotificationBase.notificationDismissAction.action){
			const gcmNotificationClear = new GCMNotificationClear();
			gcmNotificationClear.deviceId = this.senderId;
			gcmNotificationClear.authToken = this.authToken;
			gcmNotificationClear.requestNotification = {
				deviceIds:[this.senderId],
				requestId:data.notificationForClick.id,
			};
			const result = await gcmNotificationClear.sendToEndpoint();
			console.log("Notification Clear Result", result);
			return;
		}
		this.requestNotification.notifications = [data.notificationForClick];
		await super.handleNotificationClick(serviceWorker,action,data);
	}
}
class GCMNotificationClear extends GCMGenericPush{
	get endpoint(){
		return "clearNotification";
	}
	get endpointRequest(){
		return this.requestNotification;
	}
}
class GCMNotificationAction extends GCMGenericPush{
	get endpoint(){
		return "doNotificationAction";
	}
	get endpointRequest(){
		return this.requestNotification;
	}
}
class GCMDeviceRegistered extends GCMBaseServiceWorker{}
class GCMLocalNetworkRequest extends GCMBaseServiceWorker{}
class GCMLocalNetworkTest extends GCMGenericPush{}
class GCMWebSocketRequest extends GCMGenericPush{}
class GCMLocalNetworkTestRequest extends GCMGenericPush{}
class GCMDeviceNotOnLocalNetwork extends GCMGenericPush{
	async modifyNotification(notification,index){
		if(!this.senderId) return;

		const device = await this.getSender();
		if(!device) return;

		notification.title = "Local Network";
		notification.body = `${device.deviceName} not on local network`;
	}
}
class GCMNewSmsReceived extends GCMGenericPush{	
	async modifyNotification(notification,index){
		const contact = await this.getContact(this.number);
		GCMNewSmsReceivedBase.modifyNotification(notification, this, contact);
	}
}
class GCMLocation extends GCMGenericPush{	
	async modifyNotification(notification,index){
		notification.title = "Location Received";
		notification.text = "Click to open";
	}
}

class GCMMediaInfo extends GCMGenericPush{
	static get notificationActionBack(){
		return {action: "back",title: '⏪'}
	}
	static get notificationActionPlay(){
		return {action: "play",title: '▶️'}
	}
	static get notificationActionPause(){
		return {action: "pause",title: '⏸️'}
	}
	static get notificationActionSkip(){
		return {action: "skip",title: '⏩'}
	}
	async modifyNotification(notification,index){
		const device = await this.getSender();
		notification.id = this.packageName + this.senderId;
		notification.title = `Media ${this.playing ? "playing" : "stopped"}${device ? " on " + device.deviceName : ""}`
		notification.body = `${this.track} by ${this.artist}`
		notification.icon =  this.art.startsWith("http") ? this.art : Util.getBase64ImageUrl(this.art);
		notification.badge = Util.getBase64SvgUrl(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17S7.79 21 10 21 14 19.21 14 17V7H18V3H12Z" /></svg>`);
		notification.actions = [
			// GCMMediaInfo.notificationActionBack,
			this.playing ? GCMMediaInfo.notificationActionPause : GCMMediaInfo.notificationActionPlay,
			GCMMediaInfo.notificationActionSkip
		]
	}	
	async handleNotificationClick(serviceWorker,action,data){
		if(!action){
			Util.openWindow("?media");
			return;
		}
		const push = {deviceId:this.senderId};
		if(action == GCMMediaInfo.notificationActionPlay.action){
			push.play = true;
		}else if(action == GCMMediaInfo.notificationActionPause.action){
			push.pause = true;
		}else if(action == GCMMediaInfo.notificationActionSkip.action){
			push.next = true;
		}
		push.mediaAppPackage = this.packageName;
		this.sendPush(push);
	}
}
class GCMFile extends GCMGenericPush{

	async modifyNotification(notification,index){
		if(this.errorMessage){
			notification.title = `Error receiving ${this.fileName}`
			notification.body = `${this.errorMessage}`
			return;
		}
		notification.title = "Received File"
		notification.body = `${this.fileName}`
	}	
	async handleNotificationClick(serviceWorker,action,data){
		if(this.errorMessage) return;
		if(!this.url) return;

		Util.openWindow(this.url);
	}
}