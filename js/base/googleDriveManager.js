var GoogleDriveManager = function(){
	var me = this;
	var getSearchUrl = function(options){
		var folderId = options.folderId;
		var fileName = options.fileName;
		if(!folderId){
			folderId = options.parentId;
		}
		if(!fileName){
			return UtilsObject.errorPromise("No file name provided");
		}
		var query = "name = '" + fileName + "'";
		if(folderId){
			query = "'" + folderId + "' in parents and " + query;
		}
		var url = "https://www.googleapis.com/drive/v3/files?q="+ encodeURIComponent(query);	
		return url;
	}
	me.getFile = function(options){
		if(options.fileId){
			return {id:options.fileId};
		}
		return Promise.resolve()
		.then(function(){
			if(!options.folderName || options.getParents || options.ignoreFolderForGetFile){
				return options;
			}else{
				return me.getFolderId(options);
			}
		})
		.then(getSearchUrl)
		.then(doGetWithAuthPromise)
		.then(function(result){
			var fileName = options.fileName;
			if(!result){
				return UtilsObject.errorPromise("Couldn't get file info for " + fileName);
			}
			if(!result.files || result.files.length == 0){
				return UtilsObject.errorPromise("File doesn't exist on your google drive: " + fileName);
			}
			var fileId = result.files[0].id;
			if(!fileId){
				return UtilsObject.errorPromise("File ID not present for " + fileName);
			}
			var file = result.files[0];
			options.fileId = file.id;
			return file;
		}).then(function(file){
			if(options.getParents){
				return getFileParents(file.id)
				.then(function(fileParents){
					if(fileParents){
						file.parents = fileParents.parents;
						if(file.parents && file.parents.length > 0){
							options.folderId = file.parents[0];
						}
					}
					return file;
				});
			}
			else{
				return file;
			}
		});
		
	}
	var getFolderIdForNameAndParentId = function(name, parentId){
		var query = "name='"+name+"'";
		if(parentId){
			query += " and '"+parentId+"' in parents";
		}
		query = encodeURIComponent(query);
		return doGetWithAuthPromise("https://www.googleapis.com/drive/v3/files?q="+query)
		.then(function(result){
			if(!result || !result.files || result.files.length == 0){
				var createOptions = {"name":name,"mimeType":"application/vnd.google-apps.folder"};
				if(parentId){
					createOptions.parents = [parentId];
				}
				return {createOptions:createOptions};
			}else{
				return {id:result.files[0].id};
			}
		})
		.then(function(result){
			var createOptions = result.createOptions;
			if(createOptions){
				return doPostWithAuthPromise("https://www.googleapis.com/drive/v3/files",createOptions);
			}else{
				return result;
			}
		})
		.then(function(result){
			return result.id;
		});
	}
	me.getFolderId = function(options){
		var folderName = options.folderName;
		var folderId = options.folderId;
		var parentId = options.parentId;
		if(folderId){
			return options;
		}
		if(!folderName){
			return UtilsObject.errorPromise("No folder Name provided");
		}
		var setFolderIdOnOptions = function(folderId){
			options.folderId = folderId;
			return options;
		};
		if(folderName.indexOf("/")>=0){
			var split = folderName.split("/");
			return split.doForChainPromise(getFolderIdForNameAndParentId).then(setFolderIdOnOptions);
		}else{
			return getFolderIdForNameAndParentId(folderName,parentId).then(setFolderIdOnOptions);
		}
	}

	me.uploadFile = function(options){
		var file = options.file;
		if(!file){
			return UtilsObject.errorPromise("No file to upload");
		}
		options.fileName = file.name;
		console.log("Uploading...");
		console.log(file);
		return uploadNewContent(options)
		.then(function(uploadedFile){
			if(options.notify){
				showNotification("Join","Uploaded " + options.fileName);
			}
			options.fileId = uploadedFile.id;
			return options;
		})
		.then(function(options){
			return me.shareFile(options);
		}).then(function(options){			
            return "https://drive.google.com/file/d/" + options.fileId;
		});
	}
	var getShareUrlAndData = function(options){
		var userInfo = options.userInfo;
		var userToShareTo = options.userToShareTo;
		var fileId = options.fileId;
		if(!fileId){
			return UtilsObject.errorPromise("No file Id to share");
		}
		if(!userToShareTo){
			console.log("Not sharing file because no account to share to found");
			return null;
		}
		if(userToShareTo == userInfo.email){
            console.log("Not sharing file to " + userToShareTo + " because it's not another user");
			return null;
		}
        console.log("Sharing file to " + userToShareTo);  
        return {url:"https://www.googleapis.com/drive/v2/files/" + fileId + "/permissions/",data:{"role":"writer","type":"user","value":userToShareTo}};
    }
	
	me.shareFile = function(options){
		//options.userToShareTo = "jakuxes@gmail.com";
		return getUserInfoPromise()
		.then(function(userInfo){
			options.userInfo = userInfo;
			return options;
		})
		.then(getShareUrlAndData)
		.then(function(urlAndData){
			if(!urlAndData){
				return null;
			}        	
            return doPostWithAuthPromise(urlAndData.url,urlAndData.data)
        }).then(function(resultShareFile){
        	if(!resultShareFile){
        		return;
        	}
            console.log("Share file result:");
            console.log(resultShareFile);
            return options;
        });
	}
	me.uploadFiles = function(options,filesToUpload){
		return me.getFolderId(options)
		.then(function(options){			
			var optionsArray = [];
			for (var i = 0; i < filesToUpload.length; i++) {
				var file = filesToUpload[i];
				var newOptions = UtilsObject.applyProps({},options);
				newOptions.file = file;
				optionsArray.push(newOptions);
			}
			return optionsArray;
		})
		.then(function(optionsArray){
			return optionsArray.doForAllPromise(me.uploadFile);
		})
	}

	var overwriteContent = function(options){
		return prepareContent(options)
		.then(function(options){
			var fileId = options.fileId;
			var content = options.content;
			return doPutWithAuthPromise("https://www.googleapis.com/upload/drive/v2/files/" + fileId + "?uploadType=multipart",content);
		});
	}
	var prepareContent = function(options){
		return new Promise(function(resolve,reject){
			var content = options.content;
			var file = options.file;
			if(file){
				content = file;
			}
			if(!content){
				reject("No content for upload");
			}
			options.content = content;
			resolve(options);
		});
	}
	var prepareContentAndFolderId = function(options){
		return prepareContent(options)
		.then(me.getFolderId);
	}
	var uploadNewContent = function(options){		
		return prepareContentAndFolderId(options)
		.then(function(options){
			var formData = new FormData();
			formData.append("data", new Blob([JSON.stringify(
				{
					"name": options.fileName,
					"parents":[options.folderId]
				})],{"type":"application/json"}));
			if(!UtilsObject.isString(options.content) && !UtilsObject.isFile(options.content)){
				options.content = JSON.stringify(options.content);
			}
			formData.append("file", options.content);
			return doPostWithAuthPromise("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",formData);
		});	
		
		
	}
	var getFileToOverWrite = function(options){
		if(options.overwrite){
			return me.getFile(options)
			.catch(function(){
				return Promise.resolve();
			});
		}else{
			return Promise.resolve();
		}
	}
	me.uploadContent = function(options){
		return getFileToOverWrite(options)
		.then(function(existingFile){
			if(existingFile){
				options.fileId = existingFile.id;
				return overwriteContent(options);
			}else{
				return uploadNewContent(options);
			}
		});

	}
	me.getContentCache = function(options){
		var fileName = options.fileName;
		var localFile = localStorage[fileName];
		if(localFile){
		   return JSON.parse(localFile);
		}
		return null;
	}
	var downloadFileContent = function(file){
		if(!file){
			return UtilsObject.errorPromise("No file to download");
		}
		if(!file.id){
			return UtilsObject.errorPromise("No file id to download");
		}
		var downloadUrl = "https://www.googleapis.com/drive/v3/files/" + file.id + "?alt=media";
		return doGetWithAuthPromise(downloadUrl)
		.then(function(content){
			content.fileId = file.id;
			return content;
		});
	}
	var setContentCache = function(fileName, content){
		var contentToStore = content;
		if(!UtilsObject.isString(content)){
			contentToStore = JSON.stringify(content);
		}
		localStorage[fileName] = contentToStore;
		return contentToStore;
	}
	me.downloadContent = function(options){
		return me.getFile(options)
		.then(downloadFileContent)
		.then(function(content){			
			setContentCache(options.fileName,content);
			return content;
		});
	}
	var getDevicePushFileName = function(deviceId){
		return "pushes=:="+deviceId;
	}
	var getFileParents = function(fileId){		
		if(!fileId){
			return UtilsObject.errorPromise("No file Id to look for parents");
		}
		return doGetWithAuthPromise("https://www.googleapis.com/drive/v3/files/"+fileId+"?fields=parents");
	}
	me.getMyDevicePushes = function(forceDownload){		
		var options = {fileName:getDevicePushFileName(localStorage.deviceId),getParents:true};
		return Promise.resolve()
		.then(function(){
			if(!forceDownload){
				return me.getContentCache(options)
			}
		})
		.then(function(device){
			if(device){
				return device;
			}else{
				return me.downloadContent(options);
			}
		})
		.then(function(device){
			device.folderId = options.folderId;
			return device;
		});
	}	
	me.addPushToMyDevice = function(push){	
		var fileName = getDevicePushFileName(localStorage.deviceId);	
		return me.getMyDevicePushes(false)
		.catch(function(error){
			return {};
		}).then(function(device){
			if(!device.pushes){
				device.pushes = [];
			}
			device.pushes.push(push);
			var maxLength = 100;
			if(device.pushes.length > maxLength){
				device.pushes.splice(0,device.pushes.length - maxLength);
			}
			return device;
		}).then(function(device){
			setContentCache(fileName,device);
			return device;
		}).then(function(device){
			return me.uploadContent({
				ignoreFolderForGetFile:true,
				//getParents:true,
				fileId:device.fileId,
				folderId:device.folderId,
				content:device,
				fileName:fileName,
				folderName:GoogleDriveManager.getBaseFolderForMyDevice() + "/Push History Files",
				overwrite:true
			});
		}).then(function(result){
			console.log("Uploaded push history");
			console.log(result);
		}).catch(function(error){
			console.error("Couldn't upload push history");
			console.error(error.stack);
		});
	}
}
GoogleDriveManager.getBaseFolderForMyDevice = function(){
	var deviceName = localStorage.deviceName;
	if(!deviceName){
		deviceName = "Chrome";
	}
	return GoogleDriveManager.getBaseFolder() + "/from " + deviceName;
}
GoogleDriveManager.getBaseFolder = function(){	
	return "Join Files";
}