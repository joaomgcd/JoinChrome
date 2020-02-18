document.addEventListener('DOMContentLoaded', async function() {
	var deviceId = UtilsDom.getURLParameter("deviceId");
	var pushHistory = await new PushHistory(deviceId);
	pushHistory.render(document.getElementById("pushhistory"));
});