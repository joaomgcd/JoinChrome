if (!self["getToken"]) {
	self["getToken"] = back.getToken;
}
var doRequestWithAuth = async function (method, url, content, callback, callbackError, isRetry, tokenInput) {
	const token = await getToken(null, tokenInput);
	if (token == null) {
		if (callbackError != null) {
			callbackError("noauth");
		}
	} else {
		let isFileOrForm = content instanceof File || content instanceof FormData;
		let headers = {
			"Authorization": "Bearer " + token
		};

		if (content && !isFileOrForm) {
			headers["Content-Type"] = "application/json; charset=UTF-8";
		}

		let options = {
			method: method,
			headers: headers,
		};

		if (content) {
			options.body = isFileOrForm ? content : JSON.stringify(content);
		}

		try {
			console.log("Fetching: " + url);
			let response = await fetch(url, options);
			let result;

			try {
				result = await response.json();
			} catch (err) {
				result = await response.text();
			}

			if (!isRetry && result.userAuthError) {
				console.log("Retrying with new token...");
				await removeCachedAuthToken();
				return await doRequestWithAuth(method, url, content, callback, callbackError, true);
			} else {
				if (callback != null) {
					callback(result);
				}
				return result;
			}
		} catch (error) {
			if (callbackError != null) {
				callbackError(error);
			} else {
				throw error;
			}
		}
	}
};
var doPostWithAuth = async function (url, content, callback, callbackError) {
	return await doRequestWithAuth("POST", url, content, callback, callbackError);
}
var doPostWithAuthPromise = function (url, content) {
	return new Promise(async function (resolve, reject) {
		await doPostWithAuth(url, content, resolve, reject);
	});
}
var doPutWithAuth = function (url, content, callback, callbackError) {
	return doRequestWithAuth("PUT", url, content, callback, callbackError);
}
var doPutWithAuthPromise = function (url, content) {
	return new Promise(function (resolve, reject) {
		doPutWithAuth(url, content, resolve, reject);
	});
}
var doDeleteWithAuth = function (url, content, callback, callbackError) {
	return doRequestWithAuth("DELETE", url, content, callback, callbackError);
}
var doGetWithAuth = async function (url, callback, callbackError, token) {
	return await doRequestWithAuth("GET", url, null, callback, callbackError, false, token);
}
var doGetWithAuthPromise = function (url, token) {
	return new Promise(function (resolve, reject) {
		doGetWithAuth(url, resolve, reject, token);
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
var doGetBase64 = function (url, callback) {

	if (url == null || url == "") {
		callback(null);
		return;
	}
	if (url.indexOf("http") < 0) {
		callback(url);
		return;
	}
	getToken(function (accessToken) {
		console.log("Getting binary: " + url);
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		if (isDriveUrl(url)) {
			xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		}
		xhr.responseType = 'arraybuffer';
		xhr.onload = function (e) {
			callback(base64ArrayBuffer(e.currentTarget.response));
		};
		xhr.onerror = function (e) {
			callback(null);
		};
		xhr.send();
	});
}
var isDriveUrl = function (url) {
	return url.indexOf("drive.google") > 0 || url.indexOf("docs.google") > 0 || url.indexOf("googleapis.com") > 0;
}
var doGetBase64Image = function (url, callback) {
	if (url == null || url == "") {
		callback(null);
		return;
	}
	if (url.indexOf("http") < 0) {
		callback(url);
		return;
	}
	doGetBase64(url, function (base64) {
		if (base64 != null) {
			base64 = "data:image/png;base64," + base64
		}
		callback(base64);
	});
}

var doGetBase64ImagePromise = function (url) {
	return new Promise(function (resolve, reject) {
		doGetBase64Image(url, resolve);
	});
}
var setImageFromUrl = function (url, imageElement) {
	return doGetBase64ImagePromise(url)
		.then(function (base64) {
			imageElement.src = base64;
			return base64;
		});
}
var requestFileAsync = async function (deviceId, payload, requestType) {
	console.log("Asking for file remotely");
	console.log(payload);
	var response = await doPostWithAuthPromise(joinserver + "requestfile/v1/request?alt=json",
		{
			"deviceId": deviceId,
			"payload": payload,
			"requestType": requestType,
			"senderId": localStorage.deviceId
		});
	console.log(response);
	if (!response.success) {
		throw new Error(response.errorMessage);
	}
	var fileResponse = await back.eventBus.waitFor(back.Events.FileResponse, 60000);
	return fileResponse;
};