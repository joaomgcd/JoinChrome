document.addEventListener('DOMContentLoaded', function() {
	var inputElement = document.getElementById("inputElement");
	var initResult = Dialog.init({},function(){
		return inputElement.value;
	});
	
	var input = initResult.input;
	inputElement.value = input.initValue;
});
