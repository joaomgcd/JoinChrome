
var back = chrome.extension.getBackgroundPage();

var Tests = function () {
	var me = this;
	var testButton = document.getElementById("starttests");
	me.elementToInsertResults = null;
	this.init = async function () {
		this.testHtml = await importComponent('./test.js', '#test');
		this.push(new TestAccount());
		this.push(new TestRegister());
		this.push(new TestAuthToken());
		this.push(new TestSendPush());
		this.push(new TestReceivePush());
		this.push(new TestReceivePushRegId());
		this.push(new TestCompareGcmKeys());
		this.push(new TestPopup());
		this.push(new TestGetSms());
	}
	var handleTestError = function (error) {
		console.error(error);
		var errorMessage = error?.statusText ?? error?.message ?? JSON.stringify(error);
		if (errorMessage == "{}") {
			errorMessage = null;
		}
		if (!errorMessage) {
			errorMessage = "Check your connection";
		}
		return { "success": false, "errorMessage": errorMessage };
	}
	var handleTestResult = function (test, result) {
		var testElement = test.testElement;
		var textElement = testElement.querySelector("#text");
		var iconElement = testElement.querySelector("#iconstatus");
		var text = "";
		if (result.success) {
			text = "Success"
			if (result.successMessage) {
				text += ": " + result.successMessage;
			} else {
				text += "!";
			}
			iconElement.src = "success.png";
		} else {
			iconElement.src = "error.png";
			text = "<font color='red'>" + result.errorMessage + "</font>";
			if (result.fixMessage) {
				text = text + ": " + result.fixMessage;
			}
		}
		textElement.innerHTML += " " + text;
		document.body.scrollTop = document.body.scrollHeight;
	}
	this.executeTest = async function (test) {
		var testElement = me.testHtml.cloneNode(true);
		test.testElement = testElement;
		var textElement = testElement.querySelector("#text");
		textElement.textContent = test.description + "...";
		me.elementToInsertResults.appendChild(testElement);

		document.body.scrollTop = document.body.scrollHeight;
		let result = null;
		try {
			result = await test.execute();
		} catch (error) {
			result = handleTestError(error);
		}
		return handleTestResult(test, result);
	}
	this.execute = async function (elementToInsertResults) {
		me.elementToInsertResults = elementToInsertResults;
		testButton.disabled = true;
		elementToInsertResults.innerHTML = "";//"Local GCM Key: " + localStorage.regIdLocal + "<br/>Server GCM Key: " + localStorage.regIdServer + "<br/>";
		try {
			const results = [];
			for (const test of this) {
				results.push(await me.executeTest(test));
			}
			return results;
		} catch (error) {
			alert("Unknown error: " + error);
			return [];
		} finally {
			document.body.scrollTop = document.body.scrollHeight;
			testButton.disabled = false;
		}

	}
}
Tests.prototype = new Array();
var Test = function () {
	this.execute = function (callback) {

	}
}
var TestResult = function () {
	this.success = true;
	this.errorMessage = null;
	this.fixMessage = null;
	this.successMessage = null;
}
var TestSendPush = function () {
	var me = this;
	this.description = "Sending Push to server";
	this.execute = async function () {
		var gcmPush = new GCMPush();
		gcmPush.text = TEST_PUSH_TEXT;
		const result = await gcmPush.send(localStorage.deviceId);
		if (result.success) {
			return new TestResult();
		} else {
			result.fixMessage = "Please check your internet connection.";
			return result;
		}
	}
}
TestSendPush.prototype = new Test();
TestReceivePush = function () {
	var me = this;
	this.description = "Receiving Push from server";
	var timeOutSeconds = 500;
	this.receiveTestPush = async function () {
		var result = null;
		try {
			await back.eventBus.waitForSticky(back.Events.TestPush, timeOutSeconds * 1000);
			result = new TestResult();
		} catch (error) {
			result = { "success": false, "errorMessage": "Didn't receive push after " + timeOutSeconds + " seconds. Error: " + error, "fixMessage": "Try the steps mentioned in the FAQ <a target='_blank' href='http://joaoapps.com/join/faq/'>here</a>" };
		}
		back.eventBus.removeStickyData(back.Events.TestPush);
		return result;
	};
	this.execute = async function (callback) {
		return await this.receiveTestPush();
	}
}

TestReceivePush.prototype = new Test();

var TestReceivePushRegId = function () {
	var me = this;
	this.description = "Receiving Push with GCM key";
	this.execute = async function (callback) {
		var gcmPush = new GCMPush();
		gcmPush.text = TEST_PUSH_TEXT;
		gcmPush.regId = localStorage.regIdLocal;
		return gcmPush
			.send(localStorage.deviceId)
			.then(me.receiveTestPush);
	}
}
TestReceivePushRegId.prototype = new TestReceivePush();
var TestGetSms = function () {
	var me = this;
	var gotSms = false;
	var phone = UtilsDevices.getDevices().first(function (device) {
		return device.deviceType == DEVICE_TYPE_ANDROID_PHONE;
	});
	this.description = "Receiving SMS info from ";
	if (phone) {
		this.description += phone.deviceName;
	} else {
		this.description += "Android Device";
	}
	this.execute = async function () {
		try {

			if (!phone) {
				return { "success": false, "errorMessage": "Can't test. No phones on your list.", "fixMessage": "Run Join on an Android phone to test." };
			}
			const responseFile = await back.sendFileRequest({
				deviceId: phone.deviceId,
				type: REQUEST_TYPE_SMS_HISTORY,
				payload: "123456789"
			});
			const jsonSMSs = await Promise.race(
				[
					back.downloadFile(responseFile.fileId),
					UtilsObject.timeOut(30000)
				]
			);
			var smses = JSON.parse(jsonSMSs);
			var testResults = new TestResult();
			testResults.successMessage = "Got back SMS file";
			if (!gotSms) {
				gotSms = true;
				return testResults;
			}
		} catch (error) {
			return { "success": false, "errorMessage": `Can't get SMS from your phone (${error})`, "fixMessage": "<b>Check if your phone is online</b> and that it can <b>upload files to google drive</b>. Also check your Google Drive inside the 'Join' folder for a file called something like '<b>sms=:=0707a8sd08a7s0da7</b>'. If it's not there your phone isn't able to send files to Google Drive." };
		}

	}
}
TestGetSms.prototype = new Test();

var TestPopup = function () {
	var me = this;
	this.description = "Testing popups";
	var timeOutSeconds = 5;
	this.execute = function () {
		showPopup('testpopup.html', 200, 500);
		return back.eventBus
			.waitFor(back.Events.TestPopup, timeOutSeconds * 1000)
			.then(function () {
				return new TestResult();
			})
			.catch(function (error) {
				return { "success": false, "errorMessage": "Didn't detect popup after " + timeOutSeconds + " seconds: " + error, "fixMessage": "Check if popup panels aren't blocked on your system." };
			});
	}
}
TestPopup.prototype = new Test();
var TestRegister = function () {
	var me = this;
	this.description = "Testing registration on Join's server";
	this.execute = async function () {
		const result = await back.registerDevice();
		if (result.success && result.errorMessage) {
			result.successMessage = result.errorMessage;
		}
		return result;
	}
}
TestRegister.prototype = new Test();
var TestCompareGcmKeys = function () {
	var me = this;
	this.description = "Comparing GCM keys";
	this.execute = function (callback) {
		return doGetWithAuthPromise(joinserver + "registration/v1/getGcmKey/?deviceId=" + localStorage.deviceId)
			.then(function (result) {
				if (!result.success) {
					return result;
				}
				if (result.gcmKey != localStorage.regIdLocal) {
					return { "success": false, "errorMessage": "Local GCM key doesn't match the one on the server", "fixMessage": "Try to remove the extension and re-install it. That should fix it." }
				}
				return new TestResult();
			});
	}
}
TestCompareGcmKeys.prototype = new Test();
var TestAccount = function () {
	var me = this;
	this.description = "Getting account details";
	this.execute = function () {
		return getUserInfoPromise()
			.then(function (info) {
				var testResults = new TestResult();
				var email = info.email;
				if (email) {
					testResults.success = true;
					testResults.successMessage = "Signed in with " + email + ": " + info.name;
				} else {
					testResults.errorMessage = "Couldn't get account";
				}
				return testResults;
			});
	}
}
TestAccount.prototype = new Test();
var TestAuthToken = function () {
	var me = this;
	this.description = "Refreshing Auth Token";
	var timeOutSeconds = 5;
	this.execute = function (callback) {
		return Promise.race([
			back.getAuthTokenPromise(false),
			UtilsObject.timeOut(timeOutSeconds * 1000)
		])
			.then(function (token) {
				return { "success": true, "successMessage": "This is a secret so don't show it to anyone: token: " + token };
			})
			.catch(function () {
				return { "success": false, "errorMessage": "Didn't receive token after " + timeOutSeconds + " seconds", "fixMessage": "Did you sign in with your account? Try re-installing the extension. If that doesn't work contact the developer." };
			});
	}
}
TestAuthToken.prototype = new Test();
