var UtilsBadge = {
	"setColor": function(color){
		if(!color){
			color = "#FF9800";
		}
	  	chrome.action.setBadgeBackgroundColor({"color":color});
	},
	"setBadge": function(text, color){
		chrome.action.setBadgeText({"text": text +""});
	  	UtilsBadge.setColor(color);
	}
}