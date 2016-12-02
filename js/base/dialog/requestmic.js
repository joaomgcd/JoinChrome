var isMicAvailable = function(navigator){
	return new Promise(function(resolve,reject){
	    window.navigator.webkitGetUserMedia({
	        audio: true,
	    }, function(stream) {
	        if(stream.stop){
		        stream.stop();
		    }
	        resolve();
	    }, function() {
	        reject("Mic not available");
	    });
	})
}
document.addEventListener('DOMContentLoaded', function() {
	var initResult = Dialog.init();
	isMicAvailable()
	.then(()=>Dialog.setResult(true))
	.catch(error=>Dialog.setResult(false));
});