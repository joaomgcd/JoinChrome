document.addEventListener('DOMContentLoaded', function() {
	var deviceId = UtilsDom.getURLParameter("deviceId");
	var pushHistory = new PushHistory(deviceId);
	pushHistory.render(document.getElementById("pushhistory"));
});