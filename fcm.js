
class FCM {
	constructor(){
		//this.messageHandler = new MessageHandler();
		this.broadcastChannel = new BroadcastChannelFCM();
		this.isInServiceWorker = navigator.serviceWorker ? false : true;
		if(!FCM.firebaseApp){
			FCM.firebaseApp = {};
		}
	}
	async requestPermissions(){
		if(this.isInServiceWorker) return true;
		
		if(!Notification.requestPermission) return true;
		
		const result = await Notification.requestPermission()
		if (result === 'denied' || result === 'default') return false

		return true;
	}
	getFirebaseMessaging(senderId){
		var existingApp = FCM.firebaseApp[senderId];
		const alreadyInited =  existingApp ? true : false;
		if(!alreadyInited){
			existingApp = firebase.initializeApp({
			  "messagingSenderId": senderId
			},senderId)
			FCM.firebaseApp[senderId] = existingApp;				
		}
		const messaging = existingApp.messaging();
		return messaging;
	}
	async register(senderId){
		const wakeWorkerToRegisterSenderId = senderId =>{
			this.broadcastChannel.requestToken(senderId);
			if(navigator.serviceWorker.controller){
				navigator.serviceWorker.controller.postMessage(senderId);
				return true;			
			}
			return false;
		};
		const hasPermissions = await this.requestPermissions();
		if(!hasPermissions) return null;

		const messaging = this.getFirebaseMessaging(senderId);
		const isInServiceWorker = this.isInServiceWorker;
		
		const handleMessage = async payload => {
			if(!this.messageHandler) return;

			this.messageHandler.handle(payload);			
		};
		if(!isInServiceWorker){
			messaging.onMessage(handleMessage);
			this.broadcastChannel.onMessageReported(handleMessage);
		}
		if(isInServiceWorker){
			messaging.setBackgroundMessageHandler(handleMessage);
		}		
		if(!isInServiceWorker){
			const existingWorkers = await navigator.serviceWorker.getRegistrations();
			const existingWorkerCount = existingWorkers.length;
			var existingWorker = null;
			if(existingWorkerCount == 0){
				console.log("Registering FCM worker");
				existingWorker = await navigator.serviceWorker.register(`/firebase-messaging-sw.js`);
				messaging.useServiceWorker(existingWorker);	
			}else{
				existingWorker = existingWorkers[0];
			}
			this.broadcastChannel.onWorkerRunning(()=>{
				wakeWorkerToRegisterSenderId(senderId);
			});
		}
		if(isInServiceWorker){
			return await messaging.getToken();
		}else{
			const result = new Promise((resolve,reject) => {
				this.broadcastChannel.onTokenReported(payload=>{
					if(payload.senderId != senderId) return;

					resolve(payload.token);
				})
				const canWakeUp = wakeWorkerToRegisterSenderId(senderId);
			});
			return result;
		}
	}
	onMessage(senderId, callback){
		if(this.isInServiceWorker){
			this.getFirebaseMessaging(senderId).setBackgroundMessageHandler(callback);
		}
		this.messageHandler = {"handle":callback}

	}
}

class FCMClient{
	constructor(senderIds){
		this.senderIds = senderIds;
		this.fcm = new FCM();
	}
	async registerServiceWorker(senderId, count,error){
		if(count>=3){
			console.error(`Giving up registration!!`,error);
			return null;
		}
		if(count > 0){
			console.log(`Retrying register ${count}...`)
		}
		try{
			const token = await this.fcm.register(senderId);		
			return token;
		}catch(error){
			if(!count){
				count = 0;
			}
			return this.registerServiceWorker(senderId,++count,error);
		}
	}
	async getTokenAndReport(senderId){
	    console.log("SW registering and Reporting", senderId);
		const token = await this.registerServiceWorker(senderId);
		this.fcm.broadcastChannel.reportToken(senderId,token);
		return token;
	}
	initServiceWorker(serviceWorker, messageCallback){
		this.fcm.broadcastChannel.onTokenRequested(async senderId=>{
			await this.getTokenAndReport(senderId);
		});
		for(var senderId of this.senderIds){	
			this.fcm.onMessage(senderId, async payload=>{
				this.handleBackgroundMessage(serviceWorker, payload);
				this.fcm.broadcastChannel.reportMessage(payload);
			});
		}
		serviceWorker.addEventListener('message', async event => {
			const senderId = event.data;
			await this.getTokenAndReport(senderId);
		});
		this.fcm.broadcastChannel.reportWorkerRunning();
	}
	initPage(tokenCallback,messageCallback){
		for(var senderId of this.senderIds){
			this.fcm.register(senderId).then(token=> {
				tokenCallback(token);
			});			
			this.fcm.onMessage(senderId, payload=>{
				messageCallback(payload);
			});	
		}
	}
	async onMessage(callback){
		this.senderIds.forEach(senderId=>this.fcm.onMessage(senderId, callback));
	}
	async getTokens(){
		const result = [];
		for(const senderId of this.senderIds){
			const token = await this.fcm.register(senderId);
			result.push({"token":token,"senderId":senderId});
		}
		return result;
	}
	async getToken(senderId){
		return await this.fcm.register(senderId);
	}
}

class BroadcastChannelFCM extends BroadcastChannel{
	constructor(){
		super("BroadcastChannelFCM");
		BroadcastChannelFCM.ACTION_REQUEST_TOKEN = 'request-token';
		BroadcastChannelFCM.ACTION_REPORT_TOKEN = 'report-token';

		BroadcastChannelFCM.ACTION_REPORT_MESSAGE = 'report-message';

		BroadcastChannelFCM.ACTION_WORKER_RUNNING = 'worker-running';

		BroadcastChannelFCM.EXTRA_SENDER_ID = 'sender-id';
		BroadcastChannelFCM.EXTRA_TOKEN = 'token';
		BroadcastChannelFCM.EXTRA_MESSAGE = 'message';

		this.addEventListener('message',async event => {
			const data = event.data;
			if(!data) return;

			if(data[BroadcastChannelFCM.ACTION_REQUEST_TOKEN]){
				this.doCallback(this.tokenRequestedCallback, data[BroadcastChannelFCM.EXTRA_SENDER_ID]);
			}else if(data[BroadcastChannelFCM.ACTION_REPORT_TOKEN]){
				this.doCallback(this.tokenReportedCallback, {"senderId":data[BroadcastChannelFCM.EXTRA_SENDER_ID],"token":data[BroadcastChannelFCM.EXTRA_TOKEN]});
			}else if(data[BroadcastChannelFCM.ACTION_REPORT_MESSAGE]){
				this.doCallback(this.messageReportedCallback, data[BroadcastChannelFCM.EXTRA_MESSAGE]);
			}else if(data[BroadcastChannelFCM.ACTION_WORKER_RUNNING]){
				this.doCallback(this.workerRunningCallback);
			}
		});
	}

	doCallback(callback,payload){
		if(!callback) return;

		callback(payload);
	}
	postFcmMessage(messageChanger){
		const message = {};
		messageChanger(message);
		this.postMessage(message);
	}


	requestToken(senderId){
		this.postFcmMessage(message=>{
			message[BroadcastChannelFCM.ACTION_REQUEST_TOKEN] = true;
			message[BroadcastChannelFCM.EXTRA_SENDER_ID] = senderId;
		});
	}
	onTokenRequested(callback){
		this.tokenRequestedCallback = callback;
	}


	reportToken(senderId,token){
		this.postFcmMessage(message=>{
			message[BroadcastChannelFCM.ACTION_REPORT_TOKEN] = true;
			message[BroadcastChannelFCM.EXTRA_SENDER_ID] = senderId;
			message[BroadcastChannelFCM.EXTRA_TOKEN] = token;
		});
	}
	onTokenReported(callback){
		this.tokenReportedCallback = callback;
	}


	reportMessage(fcmMessage){
		this.postFcmMessage(message=>{
			message[BroadcastChannelFCM.ACTION_REPORT_MESSAGE] = true;
			message[BroadcastChannelFCM.EXTRA_MESSAGE] = fcmMessage;
		});
	}
	onMessageReported(callback){
		this.messageReportedCallback = callback;
	}

	reportWorkerRunning(){
		this.postFcmMessage(message=>{
			message[BroadcastChannelFCM.ACTION_WORKER_RUNNING] = true;
		});
	}
	onWorkerRunning(callback){
		this.workerRunningCallback = callback;
	}
}