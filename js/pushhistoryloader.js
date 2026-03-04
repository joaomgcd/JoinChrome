document.addEventListener('DOMContentLoaded', async function() {
	await UtilsDom.setCurrentTheme();
	var deviceId = UtilsDom.getURLParameter("deviceId");
	var pushHistory = await new PushHistory(deviceId);
	pushHistory.render(document.getElementById("pushhistory"));
});
