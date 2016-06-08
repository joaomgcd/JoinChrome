
var back = chrome.extension.getBackgroundPage();
var testHtml = document.querySelector('link[href="test.html"]').import.querySelector('#test');

var Tests = function(){
	var me = this;
	this.init = function(){
		this.push(new TestAccount());
		this.push(new TestRegister());
		this.push(new TestAuthToken());
		this.push(new TestSendPush());
		this.push(new TestReceivePush());
		this.push(new TestReceivePushRegId());
		this.push(new TestCompareGcmKeys());
		this.push(new TestPopup());
		//this.push(new TestGetSms());
	}
	this.execute = function(elementToInsertResults){
		elementToInsertResults.innerHTML ="";//"Local GCM Key: " + localStorage.regIdLocal + "<br/>Server GCM Key: " + localStorage.regIdServer + "<br/>";
		this.doForAllAsync(function(test, callback){
			var testElement = testHtml.cloneNode(true);
			test.testElement = testElement;
			var textElement = testElement.querySelector("#text");
			textElement.textContent = test.description + "...";
			elementToInsertResults.appendChild(testElement);

			document.body.scrollTop = document.body.scrollHeight;
			test.execute(callback);
		},function(results){
			document.body.scrollTop = document.body.scrollHeight;

		},null,function(result, i){
			var test = me[i];
			var testElement = test.testElement;
			var textElement = testElement.querySelector("#text");
			var iconElement = testElement.querySelector("#iconstatus");
			var text = "";
			if(result.success){
				text = "Success"
				if(result.successMessage){
					text += ": " + result.successMessage;
				}else{
					text += "!";
				}
				iconElement.src = "success.png";
			}else{
				iconElement.src = "error.png";
				text = "<font color='red'>" + result.errorMessage + "</font>";
				if(result.fixMessage){
					text = text + ": " + result.fixMessage;
				}
			}
			textElement.innerHTML += " " + text;
			document.body.scrollTop = document.body.scrollHeight;
		});
	}
}
Tests.prototype = new Array();
var Test = function(){
	this.execute = function(callback){

	}
}
var TestResult = function(){
	this.success = true;
	this.errorMessage = null;
	this.fixMessage = null;
	this.successMessage = null;
}
var TestSendPush = function(){
	var me = this;
	this.description = "Sending Push to server";
	this.execute = function(callback){
		 var gcmPush = new back.GCMPush();
		 gcmPush.text = TEST_PUSH_TEXT;
		 gcmPush.send(localStorage.deviceId, function(result){
				if(result.success){
					callback(new TestResult());
				}else{
					result.fixMessage = "Please check your internet connection.";
					callback(result);
				}
		 },function(error){
			callback({"success":false,"errorMessage":JSON.stringify(error)})
		 });
	}
}
TestSendPush.prototype = new Test();
var messageErrorReceivePush = "Try the steps mentioned in the FAQ <a target='_blank' href='http://joaoapps.com/join/faq/'>here</a>";
var TestReceivePush = function(){
	var me = this;
	this.description = "Receiving Push from server";
	this.receivedPush = false;
	this.timeOut = function(){
		if(!alreadyCalledCallback  && !me.receivedPush){
				alreadyCalledCallback = true;
				me.callback({"success":false,"errorMessage":"Didn't receive push after 5 seconds","fixMessage":messageErrorReceivePush});
		}
	}
	var alreadyCalledCallback = false;
	this.eventListener = function(e){
		me.receivedPush = true;
		back.document.removeEventListener(TEST_PUSH_EVENT,me.eventListener);
		if(!alreadyCalledCallback && me.callback){
			alreadyCalledCallback = true;
			me.callback(new TestResult());
		}
	}
	back.document.addEventListener(TEST_PUSH_EVENT, this.eventListener);
	this.execute = function(callback){
		if(!alreadyCalledCallback && me.receivedPush){
			alreadyCalledCallback = true;
			callback(new TestResult());
		}else{
			me.callback = callback;
		}
		setTimeout(me.timeOut,5000);
	}
}
TestReceivePush.prototype = new Test();
var TestGetSms = function(){
	var me = this;
	var gotSms = false;
	var phone = back.devices.first(function(device){
		return device.deviceType == DEVICE_TYPE_ANDROID_PHONE;
	});
	this.description = "Receiving SMS info from ";
	if(phone){
		this.description += phone.deviceName;
	}else{
		this.description += "Android Device";
	}
	this.execute = function(callback){
		if(!phone){
			callback({"success":false,"errorMessage":"Can't test. No phones on your list.","fixMessage":"Run Join on an Android phone to test."});
			return;
		}
		var requestFile = new back.RequestFile(REQUEST_TYPE_SMS_HISTORY);
		requestFile.payload = "123456789";
		requestFile.send(phone.deviceId, function(responseFile){
				back.downloadFile(responseFile.fileId,function(jsonSMSs){
						var smses = JSON.parse(jsonSMSs);
						var testResults = new TestResult();
						testResults.successMessage = "Got back SMS file";
						if(!gotSms){
							gotSms = true;
							callback(testResults);
						}
				})
		});
		setTimeout(function(){
			if(!gotSms){
				gotSms = true;
				callback({"success":false,"errorMessage":"Can't get SMS from your phone","fixMessage":"<b>Check if your phone is online</b> and that it can <b>upload files to google drive</b>. Also check your Google Drive inside the 'Join' folder for a file called something like '<b>sms=:=0707a8sd08a7s0da7</b>'. If it's not there your phone isn't able to send files to Google Drive."});
			}
		},30000);
	}
}
TestGetSms.prototype = new Test();
back.confirmTestPopup = function(){
	fire("testpopup");
}
var TestPopup = function(){
	var me = this;
	this.description = "Testing popups";
	this.eventListener = function(){
		me.callback(new TestResult());
		document.removeEventListener("testpopup", me.eventListener);
	};
	document.addEventListener("testpopup",me.eventListener);
	this.execute = function(callback){
		this.callback = callback;
		showPopup('testpopup.html',200,500);
	}
}
TestPopup.prototype = new Test();
var TestRegister = function(){
	var me = this;
	this.description = "Testing registration on Join's server";
	this.execute = function(callback){
		back.registerDevice(function(result){
			if(result.success && result.errorMessage){
				result.successMessage = result.errorMessage;
			}
			callback(result);
		},function(error){
			callback({"success":false,"errorMessage":JSON.stringify(error)})
		});
	}
}
TestRegister.prototype = new Test();
var TestCompareGcmKeys = function(){
	var me = this;
	this.description = "Comparing GCM keys";
	this.execute = function(callback){
		back.doGetWithAuth(joinserver + "registration/v1/getGcmKey/?deviceId=" + localStorage.deviceId, function(result){
			if(result.success && result.errorMessage){
				result.successMessage = result.errorMessage;
			}
			callback(result);
		},function(error){
				console.log("Error: " + error);
				callback({"success":false,"errorMessage":JSON.stringify(error)})
		});
	}
}
TestCompareGcmKeys.prototype = new Test();
var TestAccount = function(){
	var me = this;
	this.description = "Getting account details";
	this.execute = function(callback){
		getUserInfo(function(info){
			var testResults = new TestResult();
			var email = info.email;
			if(email){
				testResults.success = true;
				testResults.successMessage = "Signed in with " + email + ": " + info.name;
			}else{
				testResults.errorMessage = "Couldn't get account";
			}
			callback(testResults);
		});
	}
}
TestAccount.prototype = new Test();
var TestReceivePushRegId = function(){
	var me = this;
	this.description = "Receiving Push with GCM key";
	this.received = false;
	 this.eventListener = function(e){
			me.received = true;
			back.document.removeEventListener(TEST_PUSH_EVENT,me.eventListener);
			me.callback(new TestResult());
		}
	this.execute = function(callback){
		 this.callback = callback;
		 var gcmPush = new back.GCMPush();
		 gcmPush.text = TEST_PUSH_TEXT;
		 gcmPush.regId = localStorage.regIdLocal;
		 back.document.addEventListener(TEST_PUSH_EVENT, this.eventListener);
		 gcmPush.send(localStorage.deviceId, function(result){
				setTimeout(function(){
					if(!me.received){
						back.document.removeEventListener(TEST_PUSH_EVENT,me.eventListener);
						me.callback({"success":false,"errorMessage":"Didn't receive push after 5 seconds","fixMessage":messageErrorReceivePush});
					}
				},5000);
		 },function(error){
			callback({"success":false,"errorMessage":JSON.stringify(error)})
		 });
	}
}
TestReceivePushRegId.prototype = new Test();
var TestAuthToken = function(){
	var me = this;
	this.description = "Refreshing Auth Token";
	this.received = false;
	this.execute = function(callback){
		 back.getAuthToken(function(token){
				me.received = true;
				callback({"success":true,"successMessage":"This is a secret so don't show it to anyone: token: " + token});
		 },false);
		 setTimeout(function(){
			if(!me.received){
				me.callback({"success":false,"errorMessage":"Didn't receive token after 5 seconds","fixMessage":"Did you sign in with your account? Try re-installing the extension. If that doesn't work contact the developer."});
			}
		 },5000);
	}
}
TestAuthToken.prototype = new Test();
