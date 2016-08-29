var doRequestWithAuth = function(method, url,content, callback, callbackError, isRetry, token) {
	getToken(function(token) {
		if(token == null){
			if (callbackError != null) {
				callbackError("noauth");
			}
		}else{
			var toClass = {}.toString;
			var contentClass = toClass.call(content);
			var isFileOrForm = contentClass == "[object File]" || contentClass == "[object FormData]";
			var authHeader = "Bearer " + token;
			//console.log("authHeader: " + authHeader);
			console.log("Posting to: " + url);
			var req = new XMLHttpRequest();
			req.open(method, url, true);
			req.setRequestHeader("authorization", authHeader);
			if(content){
				if(!isFileOrForm){
					req.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
				}
			}
			req.onload = function() {
				console.log("POST status: " + this.status);
				var result = {};
				if(this.responseText){
                    try{
    					result = JSON.parse(this.responseText)
                    }
                    catch(err) {
                        result = this.responseText;
                    }
				}
				if(!isRetry && result.userAuthError){
					console.log("Retrying with new token...");
					removeCachedAuthToken(function(){
						doRequestWithAuth(method, url,content, callback, callbackError, true);
					})
				}else{
					if (callback != null) {
						callback(result);
					}
				}
			}
			req.onerror = function(e) {
				if (callbackError != null) {
					callbackError(e.currentTarget);
				}
			}
			var contentString = null;
			if(content){
				if(isFileOrForm){
					contentString = content;
				}else{
					contentString = JSON.stringify(content);
				}
			}
            try{
                req.send(contentString);
            }catch(error){
                if (callbackError != null) {
                    callbackError(error);
                }
            }
		}
	},token);
}
var doPostWithAuth = function(url,content, callback, callbackError) {
    doRequestWithAuth("POST",url,content,callback,callbackError);
}
var doPostWithAuthPromise = function(url,content) {
    return new Promise(function(resolve,reject){
        doPostWithAuth(url,content,resolve,reject);
    });
}
var doPutWithAuth = function(url,content, callback, callbackError) {
    doRequestWithAuth("PUT",url,content,callback,callbackError);
}
var doPutWithAuthPromise = function(url,content) {
    return new Promise(function(resolve,reject){
        doPutWithAuth(url,content,resolve,reject);
    });
}
var doDeleteWithAuth = function(url,content, callback, callbackError) {
	doRequestWithAuth("DELETE",url,content,callback,callbackError);
}
var doGetWithAuth = function(url, callback, callbackError,token) {
	doRequestWithAuth("GET",url,null,callback,callbackError,false, token);
}
var doGetWithAuthPromise = function(url,token) {
    return new Promise(function(resolve,reject){
        doGetWithAuth(url,resolve,reject,token);
    });
}