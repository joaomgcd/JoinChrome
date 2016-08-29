
document.addEventListener('DOMContentLoaded', function() {
	var inputElement = document.getElementById("inputElement");
	var initResult = Dialog.init({},function(){
		return inputElement.value;
	});	
	var input = initResult.input;

	inputElement.placeholder = input.placeholder;
	if(input.text){
		inputElement.value = input.text;
	}
	inputElement.select();
	UtilsDom.waitForEnterKey(inputElement)
	.then(function(result){
		Dialog.setResult(result);
	});
});