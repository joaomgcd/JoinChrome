var Request = function(){    
    this.getParams = function() {
        var json = new Object();
        for (prop in this) {
            json[prop] = this[prop];
        }
        return json;
    }
}
var GCM = function(){
    this.execute = function() {
        console.log(this);
    }
    this.fromJson = function(json) {
        this.applyProps(json);
    }
    this.fromJsonString = function(str) {
        str = decryptString(str);
        if(str.indexOf("{") < 0){
            showNotification("Decryption Error","Please check that your encryption password matches the one on other devices.")
            return;
        }
        var json = JSON.parse(str);
        this.fromJson(json);
    }
    this.getCommunicationType = function() {
        return "GCM";
    }
    this.encrypt = function(params){
        var password = localStorage.encryptionPassword;
        if(!password){
            return;
        }
        this.encryptSpecific(params,password);
    }
}
GCM.prototype = new Request();
var GCMPush = function(){   
    this.getCommunicationType = function() {
        return "GCMPush";
    }
    this.send = function(deviceIds,callback,callbackError){
        var push = {}.applyProps(this);
        if(deviceIds.isString()){
            push.deviceIds = [deviceIds];
        }else{
            push.deviceIds = deviceIds;
        }
        joinWebApi.push(push,callback,callbackError);
    }
}
GCMPush.prototype = new GCM();