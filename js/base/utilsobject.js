var UtilsObject = {
	"applyProps":function(obj,objToApply){
		if(!objToApply){
	        return;
	    }
	    for(var prop in objToApply){
	    	var value = objToApply[prop];
			if(value && UtilsObject.toClass(value) != "[object Function]"){
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
	"isArray": function(obj){
	  return UtilsObject.toClass(obj) == "[object Array]";
	}	
};