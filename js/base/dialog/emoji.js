var emojRange = [
  [128513, 128592] ,[128640,128704]
];
document.addEventListener('DOMContentLoaded', function() {
	var initResult = Dialog.init();
	var divs = window.document.querySelectorAll("div");
	console.log(divs);
	var emojisElement = document.querySelector("#emojis");
	for (var i = 0; i < emojRange.length; i++) {
	  var range = emojRange[i];
	  for (var x = range[0]; x < range[1]; x++) {
	  	var div = UtilsDom.createElement(emojisElement,"div",""+x,{"class":"emoji"});
	  	div.innerHTML = "&#" + x + ";";
	  }
	}
	for(var div of divs){
		div.onclick = e => Dialog.setResult(e.target.innerHTML);
	}
});