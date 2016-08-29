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
	"wait":function(millis, callback){
		return new Promise(function(resolve){
			if(!millis){
				return resolve();
			}
			var timeOut = setTimeout(resolve,millis);
			if(callback){
				callback(timeOut);
			}
		});
	},
	"timeOut":function(millis){
		return UtilsObject
		.wait(millis)
		.then(function(){
			throw new Error("timeout");
		});
	},
	"errorPromise": function(errorMessage){
		return Promise.reject(new Error(errorMessage));
	},
	"ignoreError": function(error){
		console.log("Unimportant error: " + error);
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
	},
	"async": function(makeGenerator){
		return function () {
			var generator = makeGenerator.apply(this, arguments);

			function handle(result){
				// result => { done: [Boolean], value: [Object] }
				if (result.done) return Promise.resolve(result.value);

				return Promise
				.resolve(result.value)
				.then(function (res){
					return handle(generator.next(res));
				}, function (err){
					return handle(generator.throw(err));
				});
			}

			try {
				return handle(generator.next());
			} catch (ex) {
				return Promise.reject(ex);
			}
		}
	}	
};