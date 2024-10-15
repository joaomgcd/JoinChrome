
setTimeout(async function(){		
	const eventBus = new EventBusCrossContext();
	await eventBus.post(new back.Events.TestPopup());
	window.close();
},2000);
