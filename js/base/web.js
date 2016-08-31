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
function base64ArrayBuffer(arrayBuffer) {
	var base64 = ''
	var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	var bytes = new Uint8Array(arrayBuffer)
	var byteLength = bytes.byteLength
	var byteRemainder = byteLength % 3
	var mainLength = byteLength - byteRemainder

	var a, b, c, d
	var chunk

	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
		// Combine the three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
		b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
		c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
		d = chunk & 63 // 63       = 2^6 - 1

		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	}

	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
		chunk = bytes[mainLength]

		a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

		// Set the 4 least significant bits to zero
		b = (chunk & 3) << 4 // 3   = 2^2 - 1

		base64 += encodings[a] + encodings[b] + '=='
	} else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

		a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

		// Set the 2 least significant bits to zero
		c = (chunk & 15) << 2 // 15    = 2^4 - 1

		base64 += encodings[a] + encodings[b] + encodings[c] + '='
	}

	return base64
}
var doGetBase64 = function(url, callback) {

	if (url == null || url == "") {
		callback(null);
		return;
	}
	if(url.indexOf("http") < 0){
		callback(url);
		return;
	}
	getToken(function(accessToken){
		console.log("Getting binary: " + url);
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		if(isDriveUrl(url)){
			xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		}
		xhr.responseType = 'arraybuffer';
		xhr.onload = function(e) {
			callback(base64ArrayBuffer(e.currentTarget.response));
		};
		xhr.onerror = function(e) {
			callback(null);
		};
		xhr.send();
	});
}
var isDriveUrl = function(url){
	return url.indexOf("drive.google") > 0 || url.indexOf("docs.google")>0 || url.indexOf("googleapis.com")>0 ;
}
var doGetBase64Image = function(url, callback) {
	if (url == null || url == "") {
		callback(null);
		return;
	}
	if(url.indexOf("http") < 0){
		callback(url);
		return;
	}
	doGetBase64(url, function(base64) {
		if (base64 != null) {
			base64 = "data:image/png;base64," + base64
		}
		callback(base64);
	});
}
var setImageFromUrl =function(url, imageElement){
	return new Promise(function(resolve, reject){
		doGetBase64Image(url,resolve);
	})
	.then(function(base64){
		imageElement.src = base64;
		return base64;
	});
}