var back = chrome.extension.getBackgroundPage();
var EventBus = function(){
	var me = this;
	var registered = [];
	var registeredSticky = [];
    var stickyData = {};
    var getEventName = function(className){
      return "on" + className;
    }
	me.register = function(obj){	
		var index = registered.indexOf(obj);
        if(index != -1){
          return;
        }
		registered.push(obj);
	}
	me.registerSticky = function(obj){	
		var index = registeredSticky.indexOf(obj);
        if(index != -1){
          return;
        }
		registeredSticky.push(obj);
        for(var propObj in obj){
          for(var propSticky in stickyData){
            if(getEventName(propSticky) == propObj){
              obj[propObj](stickyData[propSticky]);
              return;
            }
          }
        }
	}
    me.removeStickyData = function(clazz){
      if(clazz){
        delete stickyData[clazz.name];
      }else{
        stickyData = {};
      }
    }
	me.unregister = function(obj){		
		var index = registered.indexOf(obj);
        if(index != -1){
          registered.splice(index,1);
        }
		var indexSticky = registeredSticky.indexOf(obj);
        if(indexSticky != -1){
          registeredSticky.splice(indexSticky,1);
        }
	}
    var sendToRegistered = function(data, registered){      
        var className = data.constructor.name;
		for (var i = 0; i < registered.length; i++) {
			var subscriber = registered[i];
			var funcToCall = subscriber[getEventName(className)];
			if(funcToCall){
				funcToCall(data);
			}
		}
    }
	me.post = function(data){    
      sendToRegistered(data,registered);
	}
	me.postSticky = function(data){        
      var className = data.constructor.name;
      stickyData[className] = data;
      sendToRegistered(data,registeredSticky);
	}
    var getWaitForPromise = function(clazz,timeout,registerFunc){
       return new Promise(function(resolve,reject){        
        var objToRegister = {
        };
        var timeOutObject = null;
        if(timeout){
          timeOutObject = back.setTimeout(function(){
          	reject();
            me.unregister(objToRegister);
          },timeout);
        }
        objToRegister[getEventName(clazz.name)] = function(data){
            if(timeOutObject){
              back.clearTimeout(timeOutObject);
            }
            me.unregister(objToRegister);
            resolve(data);
        }
        registerFunc(objToRegister);        
      });
    }
    me.waitFor = function(clazz,timeout){
      return getWaitForPromise(clazz,timeout,me.register);
    }
    me.waitForSticky = function(clazz,timeout){
      return getWaitForPromise(clazz,timeout,me.registerSticky);
    }
    me.getStickyData = function(){
    	return stickyData;
    }
    me.getRegistered = function(){
    	return [registered, registeredSticky];
    }
}
back.eventBus = new EventBus();
back.Events = {
	"TestPush" : function(){		
	},
	"TestPopup" : function(){		
	},
	"PopupUnloaded" : function(){		
	},
	"FilePicked" : function(){		
	},
	"FileResponse" : function(fileId){
		this.fileId = fileId;		
	}
}