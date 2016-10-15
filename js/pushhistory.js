if(!this["getToken"]){
	var back = chrome.extension.getBackgroundPage();
	getToken = back.getToken;
}
var PushHistory = function(deviceId){
	var me = this;
	var fileNamePlaceholder = "File";
	var googleDriveManager = new GoogleDriveManager();
	var pushItemHtml = document.querySelector('link[href="push-item.html"]').import.querySelector('#pushitem');
	var pushItemFileHtml = document.querySelector('link[href="push-item-file.html"]').import.querySelector('#pushitemfile');
	this.get = function(forceDownload){
		if(forceDownload === undefined){
			forceDownload = true;
		}
		return googleDriveManager.getDevicePushes(deviceId, forceDownload);
	}
	var setValueOrHide = function(element,value,valueToSet,prop){
		if(value){
			if(!valueToSet){
				valueToSet = value;
			}
			element[prop] = valueToSet;
		}else{
			UtilsDom.hideElement(element);
		}
	}
	var setTextOrHide = function(element,value,valueToSet){
		setValueOrHide(element,value,valueToSet,"innerHTML");
	}
	var setImgSrcOrHide = function(element,value,valueToSet){
		setValueOrHide(element,value,valueToSet,"src");
	}
	var setInputTextOrHide = function(element,value,valueToSet){
		setValueOrHide(element,value,valueToSet,"value");
	}
	var loadFileNameAndImage = function(linkElement){
		var loadingElement = linkElement.parentNode.querySelector("#loading");
		var imageElement = linkElement.parentNode.querySelector("#image");
		var fileUrl = linkElement.href;
		if(linkElement.innerHTML != fileNamePlaceholder || linkElement.loading){
			return;
		}
		linkElement.loading = true;
		var fileId = GoogleDriveManager.getFileIdFromUrl(fileUrl);
		var options = {
			fileId:fileId,
			fields:[
				"name"
			]
		};

		UtilsDom.setElementDisplay(loadingElement,"block");
		return googleDriveManager.getFileMetadata(options)
		.then(function(metadata){
			linkElement.innerHTML = metadata.name;	
			if(metadata.name.indexOf(".jpg") > 0 || metadata.name.indexOf(".png") > 0){
				return setImageFromUrl(GoogleDriveManager.getDownloadUrlFromFileId(fileId), imageElement);
			}							
		})
		.then(function(base64){
			if(base64){
				UtilsDom.setElementDisplay(imageElement,"block");
			}
		})
		.catch(function(){})
		.then(function(){
			UtilsDom.hideElement(loadingElement);
			linkElement.loading = false;
		});
	}
	var savedFilter = "";
	var cachedHistory = {};
	var contactInfo = null;
	this.render = function(targetElement,forceDownload,history){
		var resetTargetElement = function(){
			targetElement.innerHTML = "";
			var filterElement = UtilsDom.createElement(targetElement,"input","filter",{"type":"text","placeholder":"Filter Pushes","value":savedFilter});
			filterElement.onkeyup = function(event){
				var filterText = event.target.value;
				if(filterText == savedFilter){
					return;
				}
				savedFilter = filterText;
				if(cachedHistory && cachedHistory.pushes && cachedHistory.pushes.length > 0){
					var filteredPushes = [];
					for (var i = 0; i < cachedHistory.pushes.length; i++) {
						var push = cachedHistory.pushes[i];
						var addedPush = false;
						for(var prop in push){
							if(prop.toLowerCase().indexOf(filterText.toLowerCase())>=0){
								filteredPushes.push(push);
								break;
							}
							var value = push[prop];
							if(!value || !UtilsObject.isString(value)){
								continue;
							}
							if(value.toLowerCase().indexOf(filterText.toLowerCase())>=0){
								filteredPushes.push(push);
								break;
							}
						}
					}
					me.render(targetElement,forceDownload,{pushes:filteredPushes})
					.then(function(){
						var filterElement = document.getElementById("filter");
						filterElement.focus();
						var position = filterElement.value.length;
                		filterElement.setSelectionRange(position, position);
					});
				}
			}
		}
		resetTargetElement();
		UtilsDom.createElement(targetElement,"img","loadinganimation",{"src":"../icons/loading.gif","width":"50px","height":"50px"});
		return Promise.resolve()
		.then(function(){
			if(!history){
				return me.get(forceDownload)
				.then(function(history){
					cachedHistory = history;
					return history;
				});
			}else{
				return history;
			}
		})
		.then(history =>{
			if(!contactInfo && history && history.pushes && history.pushes.first(push=>push.smstext && push.smsnumber)){
				return googleDriveManager
				.getDeviceContacts(deviceId,true)
				.then(contactsFromDrive=>{
					contactInfo = contactsFromDrive;
					return history;
				});
			}else{
				return history;
			}
		})
		.then(function(history){
			if(!history){			
				history = {
					pushes:[
						{
							title:"Hello",
							text:"How do you do?",
							icon: "http://www.androidpolice.com/wp-content/uploads/2014/04/nexusae0_d.png",
							url: "http://www.androidpolice.com/",
							clipboard: "haa",
							date: new Date().getTime(),
							files:[
								"https://drive.google.com/file/d/0B8G77eDgeMdwTDhPM2ZycmhuM3M/view?usp=drivesdk"
							]
						},
						{
							title:"Bye",
							text:"See you later",
							icon: "https://lh4.googleusercontent.com/-2lq9WcxRgB0/AAAAAAAAAAI/AAAAAAAAETw/Yk2jY1eiZss/photo.jpg",
							files:[
								"https://drive.google.com/file/d/0B8G77eDgeMdwTDhPM2ZycmhuM3M/view?usp=drivesdk"
							]
						}
					]
				};	
			}
			if(!history || !history.pushes || history.pushes.length == 0){
				throw "No matches";
			}
			resetTargetElement();
			var notifications = [];
			for (var i = 0; i < history.pushes.length; i++) {
				var pushItem = history.pushes[i];
				var notification = {
					title: pushItem.title,
					text: pushItem.text,
					id: UtilsObject.guid()
				}
				notifications.push(notification);
				
				var pushElement = pushItemHtml.cloneNode(true);
				pushElement.push = pushItem;
				var iconElement = pushElement.querySelector("#icon");
				var textElement = pushElement.querySelector("#text");
				var titleElement = pushElement.querySelector("#title");
				var dateElement = pushElement.querySelector("#date");
				var clipboardElement = pushElement.querySelector("#clipboard");
				var clipboardHolderElement = pushElement.querySelector("#clipboardholder");
				var smsElement = pushElement.querySelector("#sms");

				setImgSrcOrHide(iconElement,pushItem.icon);
				setTextOrHide(textElement,pushItem.text);
				setTextOrHide(titleElement,pushItem.title);
				var date = pushItem.date;
				if(!date){
					date = "Unknown Date";
				}else{
					date = UtilsObject.formatDate(date,true,back.get12HourFormat());
				}
				setTextOrHide(dateElement,date);
				//setTextOrHide(urlElement,pushItem.url,"<a href='"+pushItem.url+"'  target='_blank'>"+pushItem.text+"</a>");
				if(pushItem.url){
					pushElement.classList.add("clickable", "url");
				}
				if(pushItem.clipboard){
					setInputTextOrHide(clipboardElement,pushItem.clipboard);
				}else{
					UtilsDom.hideElement(clipboardHolderElement);
				}
				if(pushItem.files && pushItem.files.length > 0){
					console.log(pushItem.files.length);
					for (var e = 0; e < pushItem.files.length; e++) {
						var file = pushItem.files[e];
						var fileElement = pushItemFileHtml.cloneNode(true);
						var linkElement = fileElement.querySelector("#link");
						var imageElement = fileElement.querySelector("#image");
						var loadingElement = fileElement.querySelector("#loading");

						UtilsDom.hideElement(imageElement);
						UtilsDom.hideElement(loadingElement);
						linkElement.href = file;
						linkElement.innerHTML = fileNamePlaceholder;
						linkElement.onmouseover = function(event){
							loadFileNameAndImage(event.target);
						}
						pushElement.querySelector("#files").appendChild(fileElement);
					}
				}
				if(pushItem.smstext && pushItem.smsnumber){
					var smsTextElement = smsElement.querySelector("#smstext");
					var smsNumberElement = smsElement.querySelector("#smsnumber");
					var smsName = pushItem.smsnumber;
					if(contactInfo && contactInfo.contacts){
						var contact = contactInfo.contacts.first(contact=>contact.number == pushItem.smsnumber);
						if(contact){
							smsName = contact.name;
						}
					}
					setTextOrHide(smsTextElement,pushItem.smstext);
					setTextOrHide(smsNumberElement,"To: " + smsName);
				}else{
					UtilsDom.hideElement(smsElement);
				}
				pushElement.onclick = function(event){
					var pushElement = event.target;
					if(pushElement.nodeName == "INPUT"){
						pushElement.setSelectionRange(0,pushElement.value.length)
					}else{		
						while(!pushElement["push"]){
							pushElement = pushElement.parentElement;
						}
						if(!pushElement.push.url){
							return;
						}		
  						var win = window.open(pushElement.push.url, '_blank');
  						win.focus();	
					}
				}		

				targetElement.appendChild(pushElement);

			}
			document.body.scrollTop = targetElement.scrollHeight;
			//writeNotifications(targetElement,notifications);
		})
		.catch(function(error){
			resetTargetElement();
			var errorElement = UtilsDom.createElement(targetElement,"div","nohistoryerror");
			errorElement.innerHTML = "No push history for this device.";
			var errorElementDebug = UtilsDom.createElement(targetElement,"div","nohistoryerrordebug");
			errorElementDebug.innerHTML = "Error detail: " + error;
			console.error(error);
		});
	}
}

