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
	me.processResults = function(callback,sortFieldGetter,sortDescending){
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
			var contact = me.contactsInfo.contacts.first(function(contact){
				return contact.number == lastsms.address;
			});
			if(!contact){
				contact = {"name":lastsms.address,"number":lastsms.address}
				me.contactsInfo.contacts.push(contact);
			}
			contact.lastsms = lastsms;
		});
		me.sortContacts(sortFieldGetter,sortDescending);
		callback(me.contactsInfo);
		me.saveLocalContacts();
		setRefreshing(false);
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
	me.getInfo = function(callback,callbackError,sortFieldGetter, sortDescending, local){
		if(me.contactsInfo){
			me.sortContacts(sortFieldGetter,sortDescending);
			callback(me.contactsInfo);
		}
		if(local){
			return;
		}
		setRefreshing(true);
		me.contactsInfo = null;
		me.lastsms = null;
		var callbackForProcessing = function(){
			me.processResults(callback,sortFieldGetter,sortDescending);
		};
		me.getLastSms(callbackForProcessing,callbackError);
		me.getContacts(callbackForProcessing,callbackError);
	}
	me.getLastSms = function(callback,callbackError){
		downloadDriveString("lastsms=:=" + me.deviceId,function(lastsms){
			if(lastsms.error){
				var message = "Error getting lastsms: " + contacts.error.message;
				callbackError(message);
				console.log(message);
				setRefreshing(false);
				return;
			}
			// console.log("Got lastsms info");
			// console.log(lastsms);
			me.lastsms = lastsms;
			callback();
		},function(error){
			var message = "Error downloading lastsms file: " + error;
			// console.log(message);
			callbackError(message);
			setRefreshing(false);
		});
	}
	me.getContacts = function(callback,callbackError){
		downloadDriveString("contacts=:=" + me.deviceId,function(contactsInfo){
			if(contactsInfo.error){
				var message = "Error getting contacts: " + contacts.error.message;
				console.log(message);
				callbackError(message);
				setRefreshing(false);
				return;
			}
			// console.log("Got contacts info");
			// console.log(contactsInfo);
			me.contactsInfo = contactsInfo;
			callback();

		},function(error){
			var message = "Error downloading contacts file: " + error;
			callbackError(message);
			setRefreshing(false);
			console.log(message);
		});
	}
}
var ContactMessagesGetter = function(deviceId, contact){
	var me = this;
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
	this.getInfo = function(callback,callbackProgress,callbackError,sortFieldGetter, sortDescending, local){
		setRefreshing(true);
		if(me.messages){
			callback(me.messages);
		}else if(me.contact.lastsms){
			callback({"smses":[me.contact.lastsms]});
		}
		if(local){
			setRefreshing(false);
			return;
		}
		downloadDriveString(fileKey,function(messages){
			if(messages.error){
				console.log("Error getting messsages for "+me.number+": " + contacts.error.message);
				callbackError(contacts.error.message);
				setRefreshing(false);
				return;
			}
			// console.log("Got sms messages info");
			// console.log(messages);
			me.messages = messages;
			if(me.messages.smses){
				me.messages.smses.sort(sortByField(sortFieldGetter, sortDescending));
			}
			callback(me.messages);
			me.saveLocalMessages();
			setRefreshing(false);
		},function(error){
			delete localStorage[fileKey];
			doPostWithAuth("https://joinjoaomgcd.appspot.com/_ah/api/requestfile/v1/request?alt=json",
				{
					"deviceId":me.deviceId,
					"payload":me.number,
					"requestType":4,
					"senderId": localStorage.deviceId
				},function(response){
					console.log(response);
					var listener = function (event) {
						back.removeEventListener('fileresponse',listener,false);
						console.log("Response File");
						console.log(event.fileId);
						me.getInfo(callback,callbackProgress,callbackError,sortFieldGetter, sortDescending,false);
					};
					back.addEventListener('fileresponse', listener, false);
				});
			console.log("Error downloading lastsms file: " + error);
		});
	}
}
var SmsApp = function(){

	var me = this;
	var smsTitleContainerElement = document.getElementById("smstitlecontainer");
	var smsInputContainerElement = document.getElementById("smssendcontainer");
	var smsInputElement = document.getElementById("smsinput");
	var smsTitleElement = document.getElementById("smstitle");
	var contactFindContainerElement = document.getElementById("contactfindcontainer");
	var contactFindInputElement = document.getElementById("contactfindinput");
	var smsContainerElement = document.getElementById("smscontainer");
	var newSmsButton = document.getElementById("newsmsbutton");
	smsInputElement.addEventListener("keydown",function(e){
		if(e.keyCode == 13 && !e.shiftKey){
			e.preventDefault();
			me.sendSms();
		}
	});
	newSmsButton.addEventListener("click",function(e){
		// console.log("new SMS");
		me.writeContactList(contactFindInputElement.value);
	});
	contactFindInputElement.addEventListener("input",function(e){
		me.writeContactList(contactFindInputElement.value);
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

	me.clearSmsNotification = function(){
		if(localStorage.selectedTab == "sms" && me.number){
			back.notifications.where(function(notification){
				return notification.id == UtilsSMS.getNotificationId(me.deviceId, me.number);
			}).doForAll(function(notification){
				setTimeout(function(){
					notification.cancel();
				},2000);
			});
		}
	}
	var setPlaceholderText = function(text){
		smsContainerElement.innerHTML = "<h5 id='tabsplaceholder'>"+text+"</h5>";
	}
	var setTitleText = function(text){
		smsTitleElement.innerHTML = text;
	}
	var showTitle = function(show){
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
		sms.date = Date.now();
		sms.received = true;
		me.addSms(deviceId,sms);
	}
	if(textFromUrl){
		me.receiveSms(deviceIdFromUrl,{"number":numberFromUrl,"text":textFromUrl});
	}
	me.writeSms = function(deviceId, local){
		me.number = null;
		me.contact = null;
		delete localStorage.smsDeviceContact;
		me.deviceId = deviceId;
		setPlaceholderText("Getting SMS messages and contacts...");
		showTitle(false);
		showInput(false);
		showContactFind(false);
		var contactsGetter = new ContactsGetter(deviceId);
		contactsGetter.getInfo(function(contactsInfo){
			if(contactsInfo.contacts){
				var contacts = contactsInfo.contacts;
					smsContainerElement.innerHTML = "";
					for (var i = 0; i < contacts.length; i++) {
							var contact = contacts[i];
							if(contact.lastsms){
								var contactElement = smsContactHtml.cloneNode(true);
								contactElement.contact = contact;
								var contactNameElement = contactElement.querySelector("#smscontactname");
								var contactTextElement = contactElement.querySelector("#smscontacttext");
								var contactDateElement = contactElement.querySelector("#smscontactdate");
								contactNameElement.innerHTML = contact.name;
								contactTextElement.innerHTML = (contact.lastsms.received ? "" : "You: " )+ contact.lastsms.text;
								contactDateElement.innerHTML = contact.lastsms.date.formatDate(false);

								contactElement.addEventListener("click",function(event){
									var element = event.target;
									while(!element.contact){
										element = element.parentElement;
									}
									var contact = element.contact;
									me.contactsScroll = smsContainerElement.scrollTop;
									me.writeContactMessages(deviceId, contact);
								});
								smsContainerElement.appendChild(contactElement);
							}
					}
					if(me.contactsScroll != null){
						smsContainerElement.scrollTop = me.contactsScroll;
					}
				}
		},function(error){
			setPlaceholderText(error + "<br/><br/>Make sure the SMS Service is enabled on this device in the Android App -&gt; Settings -&gt; SMS.");
		},function(contact){
			var lastsms = contact.lastsms;
			if(!lastsms){
				return null;
			}
			return lastsms.date;
		},true, local);
	}

	me.writeContactMessages = function(deviceId, contact, local){
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
		smsInputElement.focus();
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
						var smsDateElement = smsMessageElement.querySelector("#smsmessagedate");
						var smsLoaderElement = smsMessageElement.querySelector("#smsmessageprogress");

						smsTextElement.innerHTML = Autolinker.link(sms.text.replaceAll("<","&lt;").replaceAll(">","&gt;"));
						smsDateElement.innerHTML = sms.date.formatDate(true);
						if(sms.received){
							smsMessageElement.classList.add("received");
							triangleElement.style.display = "none";
						}else{
							triangleElementReceived.style.display = "none";
						}
						if(!sms.progress){
							smsLoaderElement.classList.add("hidden");
						}else{
							smsLoaderElement.classList.remove("hidden");
						}
						smsContainerElement.appendChild(smsMessageContainerElement);
					}
					smsContainerElement.scrollTop = smsContainerElement.scrollHeight;
		},function(progress){
			setPlaceholderText(progress);
		},function(error){
			setPlaceholderText("Error getting Messages for "+ name +": " + error);
		},function(sms){
			return sms.date;
		},false,local);
	}
	me.writeContactList = function(filter){
		setTitleText("Contacts");
		showTitle(true);
		showContactFind(true);
		var contactsGetter = new ContactsGetter(me.deviceId);
		contactsGetter.getInfo(function(contactsInfo){
			// console.log(contactsInfo);
			if(contactsInfo.contacts){
				var contacts = contactsInfo.contacts;
					smsContainerElement.innerHTML = "";
					if(filter){
						filter = filter.toLowerCase();
					}
					var addContactToList = function(contact){
						var contactElement = smsContactHtml.cloneNode(true);
							contactElement.contact = contact;
							var contactNameElement = contactElement.querySelector("#smscontactname");
							var contactTextElement = contactElement.querySelector("#smscontacttext");
							var contactDateElement = contactElement.querySelector("#smscontactdate");
							contactNameElement.innerHTML = contact.name;
							contactTextElement.innerHTML = contact.number;
							contactDateElement.innerHTML = "";

							contactElement.addEventListener("click",function(event){
								var element = event.target;
								while(!element.contact){
									element = element.parentElement;
								}
								var contact = element.contact;
								me.writeContactMessages(me.deviceId, contact);
							});
							smsContainerElement.appendChild(contactElement);
					}
					for (var i = 0; i < contacts.length; i++) {
							var contact = contacts[i];
							var numberForFilter = contact.number.replace(" ","").replace("+","").replace("-","");
							if(!filter || contact.name.toLowerCase().indexOf(filter) >= 0 || numberForFilter.indexOf(filter) >= 0){
								addContactToList(contact);
							}
					}
					if(filter && filter.match(/[0-9]+/) == filter){
						addContactToList({"name":"Unlisted Contact","number": filter});
					}
				}
		},function(error){
			setPlaceholderText(error);
		},function(contact){
			return contact.name;
		},false,true);
	}
	this.sendSms = function(){
		var text = smsInputElement.value;
		if(!text){
			return;
		}
				var push = new back.GCMPush();
				push.smsnumber = me.number;
				push.smstext = text;
				push.senderId = me.deviceId;
				push.responseType = 0;
				push.requestId = "SMS";
		var sms = {"text": text,"number":me.number,"progress":true};
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
	}
	this.newInput = function(){
		smsInputElement.value = "";
		smsInputElement.focus();
	}
	this.refresh = function(local){
		if(me.contact){
			me.writeContactMessages(me.deviceId,me.contact,local);
		}else{
			me.writeSms(me.deviceId,local);
		}
	}

	document.querySelector("#smstitlecontainer").addEventListener("click",function(){
		me.writeSms(me.deviceId);
	});
	document.querySelector("#smssend").addEventListener("click",function(){
		me.sendSms();
	});
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
	smsApp.writeSms(event.deviceId);
}
back.addEventListener("sendsms",sendSms,false);

var smsReceived = function(event){
	// console.log("Received SMS in popup from " + event.deviceId);
	// console.log(event.sms);
	smsApp.receiveSms(event.deviceId,event.sms);
	smsApp.refresh(true);
	smsApp.clearSmsNotification();
	
}
back.addEventListener('smsreceived', smsReceived, false);

addEventListener("unload", function (event) {
	back.console.log("Unloading sms...");
	back.removeEventListener("sendsms",sendSms,false);
	back.removeEventListener('smsreceived',smsReceived,false);
}, true);
