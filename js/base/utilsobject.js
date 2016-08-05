var UtilsObject = {
	"applyProps":function(obj,objToApply){
		if(!objToApply){
	        return;
	    }
	    for(var prop in objToApply){
	    	var value = objToApply[prop];
			if(value !== null && value !== undefined && value !== "" && UtilsObject.toClass(value) != "[object Function]"){
				obj[prop] = value;
			}
	    }
	    return obj;
	},
	"toClass": function(obj){
	  return {}.toString.call(obj);
	},
	"isString": function(obj){
	  return UtilsObject.toClass(obj) == "[object String]";
	},
	"isFile": function(obj){
	  return UtilsObject.toClass(obj) == "[object File]";
	},
	"isArray": function(obj){
	  return UtilsObject.toClass(obj) == "[object Array]";
	},
	"getArrayIfNot": function(obj){
		if(UtilsObject.isArray(obj)){
			return obj;
		}
	  	return [obj];
	},
	"errorPromise": function(errorMessage){
		return Promise.reject(new Error(errorMessage));
	},
	"handleError": function(error, message){
		if(message){
			message = message + ": ";
		}else{
			message = "";
		}
		var errorMessage = message + error;
		showNotification("Join Error",errorMessage);
		console.log(errorMessage);
		var stack = null;
		if(error.stack){
			stack = error.stack;
		}else{
			//var err = new Error();
    		//stack = err.stack;
		}
		if(stack){
			console.error(stack);
		}
	}	
};