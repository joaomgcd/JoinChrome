var smsHtml = document.querySelector('link[href="components/sms.html"]').import;
var smsContactHtml = smsHtml.querySelector('link[href="sms-contact.html"]').import.querySelector('#smscontact');
var smsMessageHtml = smsHtml.querySelector('link[href="sms-message.html"]').import.querySelector('#smsmessagecontainer');

var smsElement = document.getElementById("sms");

function isNumeric(val) {
		return Number(parseFloat(val))==val;
}
function getSortResult(value,sortDescending){
	if(value == 0){
		return 0;
	}
	if(value < 0){
		return sortDescending ? 1 : -1;
	}else{
		return sortDescending ? -1 : 1;
	}
}
function sortByField(sortFieldGetter, sortDescending){
	return function(c1,c2){
		var field1 = sortFieldGetter(c1);
		var field2 = sortFieldGetter(c2);
		if(!field1){
			if(!field2){
				return 0;
			}
			return getSortResult(1,sortDescending);
		}
		if(!field2){
			return getSortResult(-1,sortDescending);
		}
		if(isNumeric(field1)){
			return getSortResult(field1 - field2,sortDescending);
		}else{
			if(field1 < field2) return getSortResult(-1,sortDescending);
				if(field1 > field2) return getSortResult(1,sortDescending);
				return 0;
		}
	};
}
var ContactsGetter = function(deviceId){
	var googleDriveManager = new GoogleDriveManager();
	var me = this;
	this.deviceId = deviceId;
	var fileKey = "contacts=:=" + this.deviceId;
	var localContacts = localStorage[fileKey];
	this.contactsInfo = localContacts ? JSON.parse(localContacts) : null;
	this.lastsms = null;

	me.initContactsIfEmpty = function(){
		if(!me.contactsInfo){
			me.contactsInfo = {};
		}
		if(!me.contactsInfo.contacts){
			me.contactsInfo.contacts = [];
		}
	}
	me.saveLocalContacts = function(){
		localStorage[fileKey] = JSON.stringify(me.contactsInfo);
	}
	me.sortContacts = function(sortFieldGetter,sortDescending){
		if(me.contactsInfo.contacts){
			if(sortFieldGetter){
				me.contactsInfo.contacts.sort(sortByField(sortFieldGetter,sortDescending));
			}
		}
	}
	me.processResults = function(sortFieldGetter,sortDescending){
		if(!me.contactsInfo){
			console.log("Not processing yet. Contacts are empty");
			return;
		}
		if(!me.lastsms){
			console.log("Not processing yet. Last SMS are empty");
			return;
		}
		// console.log("Contacts Getter processing now!");
		me.initContactsIfEmpty();
		me.lastsms.doForAll(function(lastsms){
			if(lastsms && lastsms.address){
				var contact = me.contactsInfo.contacts.first(function(contact){
					return contact.number == lastsms.address;
				});
				if(!contact){
					if(lastsms.address.indexOf(",") > -1){
						var numberSplit = lastsms.address.split(",");
						var contactsForNumbers = numberSplit.select(number=>{
							var contactForNumber = me.contactsInfo.contacts.first(contact=>contact.number == number);
							if(!contactForNumber){
								contactForNumber =  {"name":number,"number":number};
							}
							return contactForNumber;
						});
						contact = {"name":contactsForNumbers.joinJoaomgcd(", ",contact=>contact.name),"number":contactsForNumbers.joinJoaomgcd(",",contact=>contact.number)};
					}else{
						contact = {"name":lastsms.address,"number":lastsms.address}
					}
					me.contactsInfo.contacts.push(contact);
				}
				contact.lastsms = lastsms;
			}
		});
		me.sortContacts(sortFieldGetter,sortDescending);
		me.saveLocalContacts();
		return me.contactsInfo;
	}
	this.addSms = function(sms){
		me.initContactsIfEmpty();
		var contact = me.contactsInfo.contacts.first(function(contact){
			return contact.number == sms.number;
		});
		if(!contact){
			contact = {"name":sms.number,"number":sms.number}
			me.contactsInfo.contacts.push(contact);
		}
		contact.lastsms = sms;
		contact.lastsms.address = sms.number;
		me.saveLocalContacts();
	}
	me.getLocalInfo = function(sortFieldGetter, sortDescending){
		if(me.contactsInfo){
			me.sortContacts(sortFieldGetter,sortDescending);
		}
		return me.contactsInfo;
	}
	me.getInfo = function(sortFieldGetter, sortDescending){		
		setRefreshing(true);
		me.contactsInfo = null;
		me.lastsms = null;
		return Promise
		.all([
			me.getLastSms(),
			me.getContacts()
		])
		.then(function(results){
			setRefreshing(false);
			return me.processResults(sortFieldGetter,sortDescending);
		})
		.catch(function(error){
			console.error(error);
			setRefreshing(false);
			return UtilsObject.errorPromise("Error downloading SMS files: " + error);
		});
	}
	me.getContactForNumber = UtilsObject.async(function* (numberToFind, local){
		var info = null;
		if(local){
			info = yield me.getLocalInfo(null,false);
		}else{
			info = yield me.getInfo(null,false);
		}
		var contact = info.contacts.first(function(contact){
			return contact.number == numberToFind;
		});
		if(!contact){
			contact = {"name":numberToFind,"number":numberToFind};
		}
		return contact;
	});
	me.getLastSms = function(){
		return googleDriveManager.downloadContent({
			fileName: "lastsms=:=" + me.deviceId
		})
		.then(function(lastsms){
			if(lastsms.error){
				var message = "Error getting lastsms: " + lastsms.error.message;				
				return UtilsObject.errorPromise(message);
			}
			me.lastsms = lastsms;
			return lastsms;
		});
	}
	me.getContacts = function(){
		return googleDriveManager.downloadContent({
			fileName: "contacts=:=" + me.deviceId
		})
		.then(function(contactsInfo){
			if(contactsInfo.error){
				var message = "Error getting contacts: " + contactsInfo.error.message;
				return UtilsObject.errorPromise(message);
			}
			me.contactsInfo = contactsInfo;
			return contactsInfo;

		});
	}
}
var ContactMessagesGetter = function(deviceId, contact){
	var me = this;

	var googleDriveManager = new GoogleDriveManager();
	me.deviceId = deviceId;
	me.number = contact.number;
	var fileKey = "sms=:=" + me.deviceId + "=:=" + me.number;
	me.contact = contact;
	var localMessages = localStorage[fileKey];
	me.messages = localMessages ? JSON.parse(localMessages) : null;

	this.saveLocalMessages = function(){
		if(me.messages){
			localStorage[fileKey] = JSON.stringify(me.messages);
		}
	}
	this.addSms = function(sms){
		if(!me.messages){
			me.messages = {"number":sms.number,smses:[]};
		}
		me.messages.smses.removeIf(function(existingSms){
			return existingSms.date == sms.date;
		});
		me.messages.smses.push(sms);
		me.saveLocalMessages();
	}
	var addStoredSmsToMyMessages = function(purge){		
		var storedSmses = back.backgroundEventHandler.getSmsWhilePopupClosed(me.deviceId,purge);
		for(var storedSms of storedSmses){
			if(!me.messages.smses.first((sms)=>{
				if(sms.text != storedSms.text){
					return false;
				}
				var timeDifference = Math.abs(sms.date - storedSms.date);
				console.log("Same text, time difference: " + timeDifference);
				return timeDifference < 10000;
			})){
				if(storedSms.number == me.number){
					back.console.log("Adding stored sms:");
					back.console.log(storedSms);
					me.messages.smses.push(storedSms);
				}else{
					back.console.log("Not Adding stored sms because different number:");
					back.console.log(storedSms);
				}
			}
		}
	}
	this.getInfo = UtilsObject.async(function* (callback,callbackProgress,callbackError,sortFieldGetter, sortDescending, local){
		setRefreshing(true);
		
		if(me.messages){			
			addStoredSmsToMyMessages(false);
			callback(me.messages);
		}else if(me.contact.lastsms){
			callback({"smses":[me.contact.lastsms]});
		}
		if(local){
			setRefreshing(false);
			return;
		}
		try{
			var messages = yield googleDriveManager.downloadContent({fileName: fileKey});
			if(messages.error){
				console.log("Error getting messsages for "+me.number+": " + contacts.error.message);
				callbackError(contacts.error.message);
				setRefreshing(false);
				return;
			}
			me.messages = messages;
			if(me.messages.smses){
				me.messages.smses.sort(sortByField(sortFieldGetter, sortDescending));
			}
			addStoredSmsToMyMessages(true);
			callback(me.messages);
			me.saveLocalMessages();
			setRefreshing(false);
		}catch(error){
			console.log("Error downloading lastsms file: " + error);
			delete localStorage[fileKey];
			fileResponse = yield requestFileAsync(me.deviceId, me.number, 4);
			/*var response = yield doPostWithAuthPromise(joinserver + "requestfile/v1/request?alt=json",
			{
				"deviceId":me.deviceId,
				"payload":me.number,
				"requestType":4,
				"senderId": localStorage.deviceId
			});
			console.log(response);
			if(!response.success){
				throw new Error(response.errorMessage);
			}
			var fileResponse = yield back.eventBus.waitFor(back.Events.FileResponse,60000);*/
			console.log("Response File");
			console.log(fileResponse.fileId);
			me.getInfo(callback,callbackProgress,callbackError,sortFieldGetter, sortDescending,false);
			setRefreshing(false);
		}
	});
}
var SmsApp = function(){

	var me = this;
	var googleDriveManager = new GoogleDriveManager();
	var smsTitleContainerElement = document.getElementById("smstitlecontainer");
	var smsInputContainerElement = document.getElementById("smssendcontainer");
	var smsAttachFileElement = document.getElementById("smsattachment");
	var smsAttachFileImageElement = document.getElementById("smsattachmentimage");
	var smsSubjectElement = document.getElementById("smssubject");
	var smsUrgentElement = document.getElementById("smsurgent");
	var smsMmsExtrasElement = document.getElementById("mmsextras");
	var smsEmojiElement = document.getElementById("smsemoji");
	var smsAttachFileImageLoadingElement = document.getElementById("smsattachmentimageloading");
	var smsInputElement = document.getElementById("smsinput");
	var smsTitleElement = document.getElementById("smstitle");
	var contactFindContainerElement = document.getElementById("contactfindcontainer");
	var contactFindInputElement = document.getElementById("contactfindinput");
	var smsContainerElement = document.getElementById("smscontainer");
	var newSmsButton = document.getElementById("newsmsbutton");
	var newSmsButtonIcon = document.getElementById("newsmsbuttonicon");
	var newCallButtonIcon = document.getElementById("newcallbuttonicon");
	var dropzoneElement = document.getElementById("dropzonemms");
	var mmsAttachment = null;
	var highlightColor = "#FF9800";
	var lowlightColor = "#757575";
	var setButtonColor = function(e, color){
		//tintImage(e.target,color);
	}
	var buttonHover = function(e){
		setButtonColor(e,highlightColor);
	};
	var buttonHoverOut = function(e){
		setButtonColor(e,lowlightColor);
	};
	smsEmojiElement.onclick = e => Dialog.showEmojiDialog()().then(emoji=>{
		var index = smsInputElement.selectionStart;
		smsInputElement.value = UtilsObject.spliceString(smsInputElement.value,index,0,emoji);
		smsInputElement.focus();
		smsInputElement.selectionStart = index+1;
		smsInputElement.selectionEnd = index+1;
	});
	smsInputContainerElement.ondragover = e =>{
		makeDropZoneReady(dropzoneElement)
		.then(files=>attachFile(files));
	}
	var attachFile = function(files){
		try{
			var publiclyUrl = "Publicly accessible image URL";
			var initialAction = files ? Promise.resolve(files) : UtilsDom.pickFile();
			return initialAction
			/*return Dialog.showMultiChoiceDialog({
									    items:[{"id":"file","text":"Local File"},{"id":"url","text":publiclyUrl}],
									    title:"Which Number?"
									})()
		    .then(typeOfFile=>{
		    	if(typeOfFile.id == "file"){
			    	return back.UtilsDom.pickFile()
			    }else{
			    	return Dialog.showInputDialog({
						title: publiclyUrl,
						subtitle:"Make sure that the url corresponds to an image and is a URL accessible from anywhere",
						placeholder:"Image URL"
					});
			    }
		    })*/
		   .then(files => {
		   		if(!files){
		   			files = back.UtilsDom.fileInput.files;
		   		}
		   		if(!files || files.length == 0){
		   			return;
		   		}
		   		var readFile = null;
		   		if(UtilsObject.isString(files)){
		   			readFile = Promise.resolve().then(()=>files);
		   		}else{
		   			readFile = UtilsDom.readPickedFile(files[0]);
		   		}
		   		readFile.then(result=>smsAttachFileImageElement.src = result)
		   		.then(()=>{
		   			smsAttachFileImageLoadingElement.classList.remove("hidden");
		   			return googleDriveManager.uploadFiles({
			            folderName: GoogleDriveManager.getBaseFolderForMyDevice(),
			            notify: false
			        }, files);
			   	})
		        .then(uploadResults => {
		   			smsAttachFileImageLoadingElement.classList.add("hidden");
		        	if(uploadResults && uploadResults.length > 0){
		        		mmsAttachment = GoogleDriveManager.getDownloadUrlFromFileId(uploadResults[0]);
		        		//return setImageFromUrl(uploadedImageUrl,smsAttachFileImageElement);	
		        	}
		        });
		   	});
		}catch(error){
			return Promise.reject(error);
		}
	}
	smsAttachFileImageElement.onclick = e =>{
		var promise = attachFile();//isPopup ? attachFile() : Promise.reject("Not in popup");
		promise
		.catch(error=>makeDropZoneReady(dropzoneElement,"Drop file to attach"))
		.then(files=>{
			if(files){
				attachFile(files);
			}
		});
	}
	smsAttachFileElement.onmouseover = buttonHover;
	smsAttachFileElement.onmouseout = buttonHoverOut;
	smsInputElement.addEventListener("keydown",function(e){
		if(e.keyCode == 13 && !e.shiftKey){
			e.preventDefault();
			me.sendSms();
		}
	});
	smsInputElement.addEventListener("keyup",function(e){
		localStorage.smsDraft = smsInputElement.value;
	});
	if(localStorage.smsDraft){
		smsInputElement.value = localStorage.smsDraft;
	}
	newSmsButtonIcon.addEventListener("click",function(e){
		// console.log("new SMS");
		me.writeContactListFunction = smsApp.writeContactListForSms;
		me.writeContactListFunction(contactFindInputElement.value);
	});
	newCallButtonIcon.addEventListener("click",function(e){
		// console.log("new SMS");
		me.writeContactListFunction = smsApp.writeContactListForCall;
		me.writeContactListFunction(contactFindInputElement.value);
	});
	contactFindInputElement.addEventListener("input",function(e){
		me.writeContactListFunction(contactFindInputElement.value);
	});
	me.contactFindInputElementEnterFunc = null;
	contactFindInputElement.addEventListener("keyup",function(e){
		if(e.keyCode == 13){
			if(me.contactFindInputElementEnterFunc){
				me.contactFindInputElementEnterFunc();
			}
		}
	});
	var deviceIdFromUrl = getURLParameter("deviceId");
	var numberFromUrl = getURLParameter("number");
	var textFromUrl = getURLParameter("text");
	// console.log("Checking URL for params");
	// console.log(deviceIdFromUrl + ";"+numberFromUrl);
	this.deviceId = deviceIdFromUrl ? deviceIdFromUrl : localStorage.smsDeviceId;
	me.contact = numberFromUrl ? {"number":numberFromUrl,"name":getURLParameter("name")} : (localStorage.smsDeviceContact ? JSON.parse(localStorage.smsDeviceContact) : null);
	this.number = null;
	me.contactsScroll = null;
	me.onTabSelected = function(tabSelected){
		if(tabSelected.tabId == "sms"){
			me.clearSmsNotification();
			me.scrollSmsListToBottom();
			me.focusSmsInput();
		}
	}
	me.clearSmsNotification = function(){
		back.getCurrentTabPromise()
		.then(function(currentTab){
			if(isPopup){
				if(!currentTab){
					return;
				}
				if(!currentTab.url){
					return;
				}
				if(currentTab.url != window.location.toString()){
					return;
				}
			}
			back.console.log("Selected tab from clear sms notification: " + localStorage.selectedTab);
			if(localStorage.selectedTab != "sms"){
				return;
			}
			if(!me.number){
				return;
			}
			back.notifications.where(function(notification){
				return notification.id == back.UtilsSMS.getNotificationId(me.deviceId, me.number);
			}).doForAll(function(notification){
				setTimeout(function(){
					notification.cancel();
				},2000);
			});
		});
	}
	me.scrollSmsListToBottom = function(){
		if(me.number){
			smsContainerElement.scrollTop = smsContainerElement.scrollHeight;	
		}
	}
	me.focusSmsInput = function(){
		smsInputElement.focus();
	}
	var setPlaceholderText = function(text){
		smsContainerElement.innerHTML = "<h5 id='tabsplaceholder'>"+text+"</h5>";
	}
	var setTitleText = function(text){
		smsTitleElement.innerHTML = text;
	}
	var showTitle = function(show){
		if(!show){
			me.contactListShowing = false;
		}
		showNewSmsButton(!show);
		if(!show){
			smsTitleContainerElement.classList.add("hidden");
		}else{
			smsTitleContainerElement.classList.remove("hidden");
		}
	}
	if(isPopup){
		smsTitleContainerElement.classList.add("inpopup");
	}else{
		smsTitleContainerElement.classList.remove("inpopup");
	}
	var showInput = function(show){
		if(!show){
			smsInputContainerElement.classList.add("hidden");
		}else{
			smsInputContainerElement.classList.remove("hidden");
		}
	}
	var showContactFind = function(show){
		if(!show){
			contactFindContainerElement.classList.add("hidden");
		}else{
			contactFindContainerElement.classList.remove("hidden");
			contactFindInputElement.focus();
		}
	}
	var showNewSmsButton = function(show){
		if(!show){
			newSmsButton.classList.add("hidden");
		}else{
			newSmsButton.classList.remove("hidden");
		}
	}
	me.addSms = function(deviceId,sms){
		var contact = {"number":sms.number, "lastsms": sms};
		var contactsGetter = new ContactsGetter(deviceId);
		contactsGetter.addSms(sms);
		var contactMessagesGetter = new ContactMessagesGetter(deviceId,contact);
		contactMessagesGetter.addSms(sms);
	}
	me.receiveSms= function(deviceId, sms){
		if(!sms.date){
			sms.date = Date.now();
		}
		sms.received = true;
		me.addSms(deviceId,sms);
	}
	if(textFromUrl){
		//me.receiveSms(deviceIdFromUrl,{"number":numberFromUrl,"text":textFromUrl});
	}
	var findContactForElement = function(element){
		var element = event.target;
		while(!element.contact){
			element = element.parentElement;
		}
		var contact = element.contact;
		return contact;
	}
	var writeContactsInfo = function(deviceId, contactsInfo){
		if(contactsInfo && contactsInfo.contacts){
			var contacts = contactsInfo.contacts;
			smsContainerElement.innerHTML = "";
			for (var i = 0; i < contacts.length; i++) {
					var contact = contacts[i];
					if(contact.lastsms){
						var contactElement = smsContactHtml.cloneNode(true);
						contactElement.contact = contact;
						var contactNameElement = contactElement.querySelector("#smscontactname");
						var contactCallElement = contactElement.querySelector("#smscontactcall");
						var contactTextElement = contactElement.querySelector("#smscontacttext");
						var contactDateElement = contactElement.querySelector("#smscontactdate");
						contactNameElement.innerHTML = contact.name;
						contactTextElement.innerHTML = (contact.lastsms.received ? "" : "You: " )+ contact.lastsms.text;
						contactDateElement.innerHTML = contact.lastsms.date.formatDate(false);

						contactElement.addEventListener("click",function(event){
							var contact = findContactForElement(event.target);
							me.contactsScroll = smsContainerElement.scrollTop;
							me.writeContactMessages(deviceId, contact);
						});
						contactCallElement.addEventListener("click",function(event){
							var contact = findContactForElement(event.target);
							back.pushCall(me.deviceId,true,contact);
							event.stopPropagation();
						});
						smsContainerElement.appendChild(contactElement);
					}
			}
			if(me.contactsScroll){
				smsContainerElement.scrollTop = me.contactsScroll;
			}else{						
				smsContainerElement.scrollTop = 0;
			}
		}
	};
	me.writeSms = UtilsObject.async(function* (deviceId, local){
		me.number = null;
		me.contact = null;
		delete localStorage.smsDeviceContact;
		me.deviceId = deviceId;
		setPlaceholderText("Getting SMS messages and contacts...");
		showTitle(false);
		showInput(false);
		showContactFind(false);
		var contactsGetter = new ContactsGetter(deviceId);
		var sortFunc = function(contact){
			var lastsms = contact.lastsms;
			if(!lastsms){
				return null;
			}
			return lastsms.date;
		};
		var sortDescending = true;
		try{
			writeContactsInfo(deviceId, yield contactsGetter.getLocalInfo(sortFunc,sortDescending));
			if(!local){
				writeContactsInfo(deviceId, yield contactsGetter.getInfo(sortFunc,sortDescending));
			}
		}catch(error){
			console.error(error);
			var deviceSelected = yield me.assureDeviceIdSelected();
			setPlaceholderText("Seems that the SMS service was not enabled for this device or that some files were not synced.</br></br>Enabling SMS remotely now, please wait...");			
			setRefreshing(true);
			var fileResponse = yield requestFileAsync(me.deviceId, "", 3);			
			setRefreshing(false);
			if(fileResponse){
				me.refresh(false);
				return;
			}
			setPlaceholderText(error + "<br/><br/>Make sure the SMS Service is enabled on this device in the Android App -&gt; Settings -&gt; SMS.<br/>If it is, go back to the devices tab here in Chrome, click on your device and select 'Send an SMS message' to re-select your device.");
		}
	});
	var createLinkToRevealMmsAttachment = function(smsAttachmentElement, imageElementId){
		var linkToReveal = UtilsDom.createElement(smsAttachmentElement,"a",imageElementId);
		linkToReveal.innerHTML = "See Image";
		linkToReveal.onclick = e => revealMmsAttachment(e.target.parentElement);
	}
	var hideMmsAttachment = function(imageElement){
		back.console.log("hiding " + imageElement.id);
		var smsAttachmentElement = imageElement.parentElement;
		smsAttachmentElement.innerHTML = "";
		createLinkToRevealMmsAttachment(smsAttachmentElement, imageElement.id);
	}
	var revealMmsAttachment = function(smsAttachmentElement, askForFileRemotely){
		var attachmentId = smsAttachmentElement.sms.attachmentPartId;
		var imageElementId = back.UtilsSMS.getAttachmentString(attachmentId);
		smsAttachmentElement.innerHTML = ``;
		var imageElement = UtilsDom.createElement(smsAttachmentElement,"img",imageElementId,{"src":"icons/loading.gif","class":"loading","title":"Click to hide"});
		var start = null;
		return back.UtilsSMS.getCachedAttachment(attachmentId)
		.then(attachment => {
			if(attachment){
				imageElement.src = attachment.data;
			}else{
				var firstStep = askForFileRemotely ? requestFileAsync(me.deviceId, attachmentId, 6) : Promise.resolve();
				return firstStep.
				then(()=>googleDriveManager.getFile({fileName:imageElementId}))		
				.then(file=>setImageFromUrl(file.url,imageElement))
				.then(()=>UtilsSMS.setCachedAttachment(attachmentId,imageElement.src))
			}
		})
		.then(()=>{
			imageElement.classList.remove("loading");
			imageElement.classList.add("mmsimage");
			imageElement.onclick = event => hideMmsAttachment(event.target);
		})
		.catch(error=>{
			if(!askForFileRemotely){
				return revealMmsAttachment(smsAttachmentElement,true);	
			}else{
				imageElement.src = "error.png"
				console.error(error);
			}
			/*var linkToReveal = UtilsDom.createElement(smsAttachmentElement,"a",imageElementId);
			linkToReveal.innerHTML = " Try Again";
			linkToReveal.onclick = e => revealMmsAttachment(e.target.parentElement, true);	*/
		});
	}
	me.writeContactMessages = function (deviceId, contact, local){
		me.deviceId = deviceId;
		me.contact = contact;
		localStorage.smsDeviceContact = JSON.stringify(me.contact);
		var name = contact.name;
		var number = contact.number;
		me.number = number;
		setPlaceholderText("Getting Messages for "+ name +"...");
		var title = name;
		setTitleText(title);
		showTitle(true);
		showInput(true);
		showContactFind(false);

		me.clearSmsNotification();
		smsInputElement.placeholder = "Send message to " + number;
		me.focusSmsInput();
		var contactMessagesGetter = new ContactMessagesGetter(deviceId,contact);
		contactMessagesGetter.getInfo(function(contactMessages){
			var smses = contactMessages.smses;
			if(!contactMessages || !contactMessages.smses){
				setPlaceholderText("No messages for " + name);
				return;
			}
			smsContainerElement.innerHTML = "";
			for (var i = 0; i < smses.length; i++) {
				var sms = smses[i];
				var smsMessageContainerElement = smsMessageHtml.cloneNode(true);
				smsMessageContainerElement.sms = sms;
				var triangleElement = smsMessageContainerElement.querySelector("#smsbubbletriangle");
				var triangleElementReceived = smsMessageContainerElement.querySelector("#smsbubbletrianglereceived");
				var smsMessageElement = smsMessageContainerElement.querySelector("#smsmessage");
				var smsTextElement = smsMessageElement.querySelector("#smsmessagetext");
				var smsSubjectElement = smsMessageElement.querySelector("#smsmessagesubject");
				var smsSenderElement = smsMessageElement.querySelector("#smsmessagesender");
				var smsUrgentElement = smsMessageElement.querySelector("#smsmessageurgent");
				var smsAttachmentElement = smsMessageElement.querySelector("#smsmessageattachment");
				var smsDateElement = smsMessageElement.querySelector("#smsmessagedate");
				var smsLoaderElement = smsMessageElement.querySelector("#smsmessageprogress");

				var smsText = sms.text;
				if(smsText){
					smsText = smsText.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n","<br/>")	
				}
				smsTextElement.innerHTML = Autolinker.link(smsText,{"stripPrefix" : false});
				if(sms.subject){
					smsSubjectElement.innerHTML = `Subject: ${sms.subject}`;
				}else{
					smsSubjectElement.classList.add("hidden");
				}
				if(sms.urgent){
					smsUrgentElement.classList.remove("hidden");
				}else{
					smsUrgentElement.classList.add("hidden");
				}

				if(number.indexOf(",")>0){
					if(sms.sender){
						smsSenderElement.innerHTML = sms.sender;
					}else{
						smsSenderElement.innerHTML = "You";
					}					
				}else{
					smsSenderElement.classList.add("hidden");
				}
				if(sms.attachmentPartId){
					var imageElementId = back.UtilsSMS.getAttachmentString(sms.attachmentPartId);
					if(!sms.attachment){
						smsAttachmentElement.sms = sms;
						createLinkToRevealMmsAttachment(smsAttachmentElement, imageElementId);
						/*var linkToReveal = UtilsDom.createElement(smsAttachmentElement,"a",imageElementId);
						linkToReveal.innerHTML = "See Image";
						linkToReveal.onclick = e => revealMmsAttachment(e.target.parentElement);*/
						back.UtilsSMS.getCachedAttachment(sms.attachmentPartId)
						.then(attachment =>{
							if(attachment){
								back.console.log("revealing attachment")
								back.console.log(attachment)
								revealMmsAttachment(document.getElementById(back.UtilsSMS.getAttachmentString(attachment.id)).parentElement)
								.then(()=>me.scrollSmsListToBottom());	
							}
						});
					}else{
						UtilsDom.createElement(smsAttachmentElement,"img",imageElementId,{"src":sms.attachment});
					}			
				}else{
					smsAttachmentElement.classList.add("hidden");
				}						
				
				smsDateElement.innerHTML = sms.date.formatDate(true);
				if(sms.received){
					smsMessageElement.classList.add("received");
					triangleElement.style.display = "none";
				}else{
					smsMessageContainerElement.classList.add("sent");
					triangleElementReceived.style.display = "none";
				}
				if(!sms.progress){
					smsLoaderElement.classList.add("hidden");
				}else{
					smsLoaderElement.classList.remove("hidden");
				}
				smsContainerElement.appendChild(smsMessageContainerElement);
			}
			me.scrollSmsListToBottom();
		},function(progress){
			setPlaceholderText(progress);
		},function(error){
			setPlaceholderText("Error getting Messages for "+ name +": " + error);
		},function(sms){
			return sms.date;
		},false,local);

	}
	me.writeContactListForSms = function(filter){
		me.writeContactList(filter,function(deviceId, contact){
			me.writeContactMessages(deviceId, contact);
		});
	}
	me.writeContactListFunction = me.writeContactListForSms;
	me.writeContactListForCall = function(filter){
		me.writeContactList(filter,function(deviceId, contact){
			back.pushCall(deviceId, true, contact);
		});
	}
	var writeContactListFromInfo = function(filter, contactsInfo, callback){
		// console.log(contactsInfo);
		if(contactsInfo.contacts){
			var contacts = contactsInfo.contacts.where(contact=>contact.number && contact.number.indexOf(",")<0);
			smsContainerElement.innerHTML = "";
			if(filter){
				filter = filter.toLowerCase();
			}
			var addContactToList = function(contact){
				var contactElement = smsContactHtml.cloneNode(true);
					contactElement.contact = contact;
					var contactNameElement = contactElement.querySelector("#smscontactname");
					var contactCallElement = contactElement.querySelector("#smscontactcall");
					var contactTextElement = contactElement.querySelector("#smscontacttext");
					var contactDateElement = contactElement.querySelector("#smscontactdate");
					contactNameElement.innerHTML = contact.name;
					contactTextElement.innerHTML = contact.number;
					contactCallElement.innerHTML = "";
					contactDateElement.innerHTML = "";

					contactElement.addEventListener("click",function(event){
						var element = event.target;
						while(!element.contact){
							element = element.parentElement;
						}
						var contact = element.contact;
						callback(me.deviceId, contact)
					});
					smsContainerElement.appendChild(contactElement);
					me.contactFindInputElementEnterFunc = ()=>{
						if(smsContainerElement.children.length > 0){
							var contact = smsContainerElement.children[0].contact;
							callback(me.deviceId, contact);
						}
					}
			}
			for (var i = 0; i < contacts.length; i++) {
					var contact = contacts[i];
					var numberForFilter = contact.number.replace(" ","").replace("+","").replace("-","");
					if(!filter || contact.name.toLowerCase().indexOf(filter) >= 0 || numberForFilter.indexOf(filter) >= 0){
						addContactToList(contact);
					}
			}
			if(filter /*&& filter.match(/[0-9]+/) == filter*/){
				addContactToList({"name":"Unlisted Contact","number": filter});
			}
			me.contactListShowing = true;
		}
	}
	me.writeContactList = function(filter,callback){
		setTitleText("Contacts");
		showTitle(true);
		showContactFind(true);
		var sortFunc = function(contact){
			return contact.name;
		};
		var sortDescending = false;
		var contactsGetter = new ContactsGetter(me.deviceId);
		writeContactListFromInfo(filter, contactsGetter.getLocalInfo(sortFunc,sortDescending),callback);
	}
	this.sendSms = function(){
		var text = smsInputElement.value;
		var mmsfile = mmsAttachment;
		if(!text && !mmsfile){
			return;
		}
		var subject = smsSubjectElement.value;
		var urgent = smsUrgentElement.checked;
		var push = new back.GCMPush();
		push.senderId = me.deviceId;
		push.smsnumber = me.number;
		//push.smscontactname = "João Dias";
		push.smstext = text;
		push.mmssubject = subject;
		push.mmsfile = mmsfile;
		push.mmsurgent = urgent;
		//push.mmsfile = "https://dl.dropboxusercontent.com/u/9787157/battery_half_drive.png";
		push.responseType = 0;
		push.requestId = "SMS";
		var tempAttachId = "sentAttachment";
		back.UtilsSMS.setCachedAttachment(tempAttachId,smsAttachFileImageElement.src)
		.then(()=>{			
			var sms = {
				"text": text,
				"number":me.number,
				"progress":true,
				"attachmentPartId":mmsAttachment ? tempAttachId : null,
				"subject": subject,
				"urgent": urgent
			};
			var sendSmsResult = function(event){
				sms.progress = false;
				back.removeEventListener("smssent",sendSmsResult,false);
				if(event.success){
						// console.log("SMS pushed");
						//back.showNotification("Join","SMS sent!");
				}else{
						var error = "Error sending SMS: " + event.errorMessage;
						console.log(error);
						back.showNotification("Join",error);
				}
				me.addSms(me.deviceId,sms);
				me.refresh(true);
				var isReply = getURLParameter("reply");
				if(isReply){
					window.close();
				}
			};
			back.addEventListener("smssent",sendSmsResult,false);
			push.send(me.deviceId);
			//back.showNotification("Join","SMS pushed. Waiting for response...");
			sms.date = Date.now();
			sms.received = false;
			me.addSms(me.deviceId,sms);
			me.refresh(true);
			me.newInput();
			me.clearSmsNotification();
		});
	}
	this.newInput = function(){
		smsInputElement.value = "";
		smsSubjectElement.value = "";
		smsUrgentElement.checked = false;
		smsMmsExtrasElement.classList.add("hidden")
		smsInputElement.focus();
		mmsAttachment = null;
		smsAttachFileImageElement.src ="icons/attachment.png";		
		delete localStorage.smsDraft;
	}
	this.assureDeviceIdSelected = UtilsObject.async(function* (){
		if(!localStorage.smsDeviceId){
			return true;
		}
		if(!me.deviceId || !back.devices.first(device=>device.deviceId == me.deviceId)){
			console.error("SMS Device doesn't exist!");
			var devicesForSms = back.devices.where(UtilsDevices.canSendSMS);
			var choices = devicesForSms.select(device=>({"id":device.deviceId,"text":device.deviceName}));
			try{
				var chosen = yield Dialog.showMultiChoiceDialog({
				    items:choices,
				    title:"Which device for SMS?"
				})();
				console.log("chosen device: " + chosen.id);
				localStorage.smsDeviceId = chosen.id;
				me.deviceId = chosen.id;
				return true;
			}catch(error){
				delete localStorage.smsDeviceId;
				selectTab("devices");
				return false;
			}		
		}
		return true;
	});
	this.refresh = UtilsObject.async(function* (local){
		yield me.assureDeviceIdSelected();
		if(me.contact){
			me.writeContactMessages(me.deviceId,me.contact,local);
		}else{
			me.writeSms(me.deviceId,local);
		}
	});

	document.querySelector("#smstitlecontainer").addEventListener("click",function(){
		me.writeSms(me.deviceId);
	});
	UtilsDom.onClickAndLongClick(document.querySelector("#smssend"),e=>me.sendSms(),e=>{smsMmsExtrasElement.classList.toggle("hidden")});
	
	if(me.deviceId){
		me.refresh(false);
	}
}

var smsApp = new SmsApp();
//smsApp.contact = localStorage.smsDeviceContact ? JSON.parse(localStorage.smsDeviceContact) : null;
var refreshSms = function(){
	smsApp.refresh();
}
var sendSms = function(event){
	var sms = event.sms;
	if(sms && sms.number){
		var contactsGetter = new ContactsGetter(event.deviceId);
		contactsGetter.getContactForNumber(sms.number,true)
		.then(function(contact){
			smsApp.writeContactMessages(event.deviceId,contact,false);
			smsReceived(event);
		});
	} else {
		smsApp.writeSms(event.deviceId);
	}
}
back.addEventListener("sendsms",sendSms,false);

var phoneCall = function(event){
	smsApp.deviceId = event.deviceId;
    smsApp.writeContactListFunction = smsApp.writeContactListForCall;
    smsApp.writeContactListFunction();
}
back.addEventListener("phonecall",phoneCall,false);

var smsReceived = function(event){
	// console.log("Received SMS in popup from " + event.deviceId);
	// console.log(event.sms);
	smsApp.receiveSms(event.deviceId,event.sms);
	smsApp.refresh(true);
	smsApp.clearSmsNotification();
}

back.addEventListener('smsreceived', smsReceived, false);
back.eventBus.register(smsApp);
addEventListener("unload", function (event) {
	back.console.log("Unloading sms...");
	back.removeEventListener("sendsms",sendSms,false);
	back.removeEventListener("phonecall",phoneCall,false);
	back.removeEventListener('smsreceived',smsReceived,false);
	back.eventBus.unregister(smsApp);
}, true);
