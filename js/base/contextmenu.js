
var ContextMenu = function(){
	var OPEN = "Open";
	var PASTE = "Paste";
	var CREATE_NOTIFICATION = "Create Notification";
	var SET_AS_WALLPAPER = "Set As Wallpaper";
	var SEND_TASKER_COMMAND = "Send Tasker Command";
	var WITH = "With";
	var DOWNLOAD = "Download";
	var me = this;
	var push = function(device,data){
		var gcmPush = new GCMPush();
		UtilsObject.applyProps(gcmPush,data);
		//gcmPush.applyProps(data);
		gcmPush.send(device.deviceId,function(result){
			console.log("Pushed");
			console.log(result);
		},function(result){
			console.log("Not Pushed!");
			console.log(result);
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

	//Pastes
	var pasteText = function(device, text){
		push(device, {"clipboard": text});
	}
	var pastePage = function(device, info, tab){
		pasteText(device, info.pageUrl);
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
		notificationForUrl(device, info, tab, info.linkUrl);
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
		    	new ContextMenuItem(PASTE,pasteSelection),
		    	new ContextMenuItem(CREATE_NOTIFICATION,notificationSelection, WITH),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSelection, WITH),
		    ],
		    "link":[		    	
		    	new ContextMenuItem(OPEN,openLink),
		    	new ContextMenuItem(PASTE,pasteLink),
		    	new ContextMenuItem(CREATE_NOTIFICATION,notificationLink, WITH),
		    	new ContextMenuItem(DOWNLOAD,downloadLink),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandLink, WITH),
	    	],
		    "editable":[],
		    "image":[
		    	new ContextMenuItem(SET_AS_WALLPAPER,setWallpaperSourceUrl),
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ],
		    "video":[
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ],
		    "audio":[
		    	new ContextMenuItem(DOWNLOAD,downloadSourceUrl),
		    	new ContextMenuItem(SEND_TASKER_COMMAND,sendTaskerCommandSourceUrl, WITH),
		    ]
		};
	
		if(!devices){
			return;
		}
		devices.doForAll(function(device){
	        chrome.contextMenus.create({
	            "id": device.deviceId,
	            "title": device.deviceName,
	            "contexts": ["all"]
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
			        		"title": actionTitle
			        	});
		        	});
		        }
			}
	    });
	}
	var ContextMenuItem = function(title,handler, joiner){
		this.title = title;
		this.handler = handler;
		this.joiner = joiner;
	}
}