
document.addEventListener('DOMContentLoaded', function() {
	var initResult = Dialog.init({
		showOk:false
	},function(){
		return inputElement.value;
	});	
	var input = initResult.input;
	
	var listElement = document.querySelector("#list");
	for (var i = 0; i < input.items.length; i++) {
		var item = input.items[i];
		var liItem = UtilsDom.createElement(listElement,"li",item.id);
		liItem.item = item;
		liItem.innerHTML = item.text;
		liItem.onclick = function(event){
			Dialog.setResult(event.target.item);
		}
	}
});