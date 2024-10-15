var pendingRequests = [];
var RequestFile = function (requestType) {
    this.senderId = localStorage.deviceId;
    this.requestType = requestType;
    this.send = async function (deviceId, callback, download, keepPendingRequest) {
        var params = this.getParams();
        if (typeof deviceId == "string") {
            if (!deviceId) {
                callback(null);
                return;
            }
            params.deviceId = deviceId;
        } else {
            if (!deviceId || deviceId.length == 0) {
                callback(null);
                return;
            }
            params.deviceIds = deviceId;
        }
        try {
            const result = await doPostWithAuth(joinserver + "requestfile/v1/request/", params);
            if (!result.success) {
                await back.showNotification("Can't request file", result.errorMessage);
                return;
            }
            pendingRequests.push({ "requestId": result.requestId, "callback": callback, "download": download, "keep": keepPendingRequest });
            console.log("Added pending request: " + result.requestId);
        } catch (error) {
            console.log("Error: " + error);
        }
    }
}
RequestFile.prototype = new Request();