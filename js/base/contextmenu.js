
var back = chrome.extension.getBackgroundPage();
var ContextMenu = function(){
	var OPEN = "Open";
	var PASTE = "Paste";
	var CREATE_NOTIFICATION = "Create Notification";
	var SET_AS_WALLPAPER = "Set As Wallpaper";
	var SEND_TASKER_COMMAND = "Send Tasker Command";
	var CALL = "Call";
	var WITH = "With";
	var DOWNLOAD = "Download";
	var me = this;
	var timeOut = null;
	var push = function(device,data){
		var gcmPush = new GCMPush();
		UtilsObject.applyProps(gcmPush,data);
		//gcmPush.applyProps(data);
		gcmPush.send(device.deviceId,function(result){
			console.log("Pushed");
			console.log(result);
		},function(result){
			var title = "Not Pushed!";
			console.log(title);
			console.log(result);
			if(showNotification){
				showNotification(title, result);
			}
		});
	}
	//Opens
	var openUrl = function(device, url){
		push(device, {"url": url});
	}
	var openPage = function(device, info, tab){
		openUrl(device, info.pageUrl);
	}
	var openLink = function(device, info, tab){
		openUrl(device, info.linkUrl);
	}
	var openSelection = function(device, info, tab){
		openUrl(device, info.selectionText);
	}

	//Pastes
	var pasteText = function(device, text){
		push(device, {"clipboard": text});
	}
	var pastePage = function(device, info, tab){
		pasteText(device, info.pageUrl);
	}
	var pasteSourceUrl = function(device, info, tab){
		pasteText(device, info.srcUrl);
	}
	var pasteLink = function(device, info, tab){
		pasteText(device, info.linkUrl);
	}
	var pasteSelection = function(device, info, tab){
		pasteText(device, info.selectionText);
	}

	//Notifications
	var notificationForUrl = function(device, info, tab, url, title, text){
		if(!title){
			title = "Saved Page";
		}
		if(!text){
			text = tab.title;
		}
		push(device, {"url": url,"text": text,"title": title});
	}
	var notificationPage = function(device, info, tab){
		notificationForUrl(device, info, tab, info.pageUrl);
	}
	var notificationLink = function(device, info, tab){
		var url = info.linkUrl;
		//showNotification("Join","Getting link's title...");
		doGetWithAuthPromise(url)
		.then(function(html){
    		var matches = html.match(/<title>(.*?)<\/title>/);
    		if(matches && matches.length>0){
    			return matches[0];
    		}
		})
		.catch(function(error){
			console.log("Couldn't get title for link. Using current title instead");
		})
		.then(function(title){
			notificationForUrl(device, info, tab, url, null, title);
		});
	}
	var notificationSelection = function(device, info, tab){
		notificationForUrl(device, info, tab, info.pageUrl, "Note To Self", info.selectionText);
	}

	//Downloads
	var downloadUrl = function(device, url){
		push(device, {"files": [url]});
	}
	var downloadLink = function(device, info, tab){
		downloadUrl(device, info.linkUrl);
	}
	var downloadSourceUrl = function(device, info, tab){
		downloadUrl(device, info.srcUrl);
	}

	//Wallpapers
	var setWallpaper = function(device, url){
		push(device, {"wallpaper": url});
	}
	var setWallpaperSourceUrl = function(device, info, tab){
		setWallpaper(device, info.srcUrl);
	}

	//Tasker Commands
	var sendTaskerCommand = function(device, text){ 
        var prefix = prompt("Enter Tasker command prefix.\n\nSent command will be 'prefix=:=selection'");
        if(!prefix){
            return;
        }
        text = prefix + "=:=" + text;
		push(device, {"text": text});
	}
	var sendTaskerCommandLink = function(device, info, tab){
		sendTaskerCommand(device, info.linkUrl);
	}
	var sendTaskerCommandSelection = function(device, info, tab){
		sendTaskerCommand(device, info.selectionText);
	}
	var sendTaskerCommandPage = function(device, info, tab){
		sendTaskerCommand(device, info.pageUrl);
	}
	var sendTaskerCommandSourceUrl = function(device, info, tab){
		sendTaskerCommand(device, info.srcUrl);
	}

	//Calls
	var callNumber = function(device, number){ 
		push(device, {"callnumber": number});
	}
	var callNumberSelection = function(device, info, tab){ 
		callNumber(device, info.selectionText);
	}
	var callNumberLink = function(device, info, tab){ 
		callNumber(device, info.linkUrl);
	}
	this.update = function(devices){
	    chrome.contextMenus.removeAll();
	    var contexts = {
	    	"page":[
		    	new ContextMenuItem(OPEN,openPage),
		    	new ContextMenuItem(PASTE,pastePage),
		    	new ContextMenuItem(CREATE_NOTIFICATION,notificationPage, WITH),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandPage, WITH),
		    ],
		    "selection":[
		    	new ContextMenuItem(OPEN,openSelection),
		    	new ContextMenuItem(PASTE,pasteSelection),
		    	new ContextMenuItem(CREATE_NOTIFICATION,notificationSelection, WITH),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSelection, WITH),
		    	new ContextMenuItem(CALL,callNumberSelection),
		    ],
		    "link":[		    	
		    	new ContextMenuItem(OPEN,openLink),
		    	new ContextMenuItem(PASTE,pasteLink),
		    	new ContextMenuItem(CREATE_NOTIFICATION,notificationLink, WITH),
		    	new ContextMenuItem(DOWNLOAD,downloadLink),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandLink, WITH),
		    	new ContextMenuItem(CALL,callNumberLink),
	    	],
		    "editable":[],
		    "image":[
		    	new ContextMenuItem(SET_AS_WALLPAPER,setWallpaperSourceUrl),
		    	new ContextMenuItem(PASTE,pasteSourceUrl),
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ],
		    "video":[
		    	new ContextMenuItem(PASTE,pasteSourceUrl),
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ],
		    "audio":[
		    	new ContextMenuItem(PASTE,pasteSourceUrl),
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ]
		};
		
		chrome.contextMenus.create({
			"type":"checkbox",
			"checked": !getShowChromeNotifications(),
			"title":"Mute Notifications",
			"contexts":["browser_action"],
			"onclick":function(info, tab) {
				return Promise.resolve()
				.then(Dialog.showMultiChoiceDialog({
				    items:[
				        {id:15,text:"15 Minutes"},
				        {id:30,text:"30 Minutes"},
				        {id:60,text:"1 Hour"},
				        {id:180,text:"3 Hours"},
				        {id:360,text:"6 Hours"},
				    ],
				    title:"Mute Fotifications For"
				},{
				    shouldShow:info.checked
				}))
				.catch(function(){
					console.log("Mute cancelled")
				})
				.then(function(item){
					var shouldMute = true;
					if(!item){
						shouldMute = false;
					}
					back.setShowChromeNotifications(!shouldMute);
					if(shouldMute){
						var minutesToWait = item.id;
						var timeToWait = minutesToWait * 1000 * 60;
						showNotification("Join", "Notifications Muted for " + minutesToWait + " minutes");	
						console.log("Muted");				
						return timeToWait;
					}
				})
				.then(function(timeToWait){
					return UtilsObject.wait(timeToWait,function(to){
						timeOut = to;
					});
				})
				.then(function(){
					showNotification("Join", "Notifications Unmuted");
					setShowChromeNotifications(true);
					console.log("Mute ended");
					if(timeOut){
						clearTimeout(timeOut);
						timeOut = null;
						console.log("Cleared timeout");
					}
				});
			}
		});
		if(!devices){
			return;
		}
		var contextNames = [];
		for(var contextName in contexts){
			contextNames.push(contextName);
		}
		devices.doForAll(function(device){
	        chrome.contextMenus.create({
	            "id": device.deviceId,
	            "title": device.deviceName,
	            "contexts": contextNames
	        });
	        for(var contextId in contexts){
	        	var context = contexts[contextId];
	        	if(!UtilsObject.isArray(context)){
	        		continue;
	        	}
	        	if(context.length > 0){
		        	var contextForDevice = contextId + device.deviceId;
		        	var contextName = contextId.substring(0,1).toUpperCase() + contextId.substring(1);
		        	var multipleFuncsForContext = context.length > 1;
		        	if(multipleFuncsForContext){
			        	chrome.contextMenus.create({
			            	"id": contextForDevice,
			        		"parentId": device.deviceId,
			        		"contexts": [contextId],
			        		"title": contextName
			        	});
			        }else{
			        	contextForDevice = device.deviceId;
			        }

		        	context.doForAll(function(contextMenuItem){
		        		var actionTitle = contextMenuItem.title;
		        		if(!multipleFuncsForContext){
		        			var joiner = " ";
		        			if(contextMenuItem.joiner){
		        				joiner = " " + contextMenuItem.joiner + " ";
		        			}
			        		actionTitle = actionTitle + joiner + contextName;
		        		}
			        	chrome.contextMenus.create({
			        		"parentId": contextForDevice,
			        		"contexts": [contextId],
			        		"onclick": function(info, tab){
			        			contextMenuItem.handler(device, info, tab);
			        		},
			        		"title": actionTitle,
			        		"targetUrlPatterns": contextMenuItem.patterns
			        	});
		        	});
		        }
			}
	    });
	}
	var ContextMenuItem = function(title,handler, joiner, patterns){
		this.title = title;
		this.handler = handler;
		this.joiner = joiner;
		if(UtilsObject.isString(patterns)){
			patterns = [patterns];
		}
		this.patterns = patterns;
	}
}