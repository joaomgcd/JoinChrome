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
	"isNumber": function(obj){
	  return UtilsObject.toClass(obj) == "[object Number]";
	},
	"isBoolean": function(obj){
	  return UtilsObject.toClass(obj) == "[object Boolean]";
	},
	"isFunction": function(obj){
	  return UtilsObject.toClass(obj) == "[object Function]";
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
	},
	"guid": function(){
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	},
	"customFormat": function(date,formatString,is12HourFormat){
		var YYYY,YY,MMMM,MMM,MM,M,DDDD,DDD,DD,D,hhhh,hhh,hh,h,mm,m,ss,s,ampm,AMPM,dMod,th;
		YY = ((YYYY=date.getFullYear())+"").slice(-2);
		MM = (M=date.getMonth()+1)<10?('0'+M):M;
		MMM = (MMMM=["January","February","March","April","May","June","July","August","September","October","November","December"][M-1]).substring(0,3);
		DD = (D=date.getDate())<10?('0'+D):D;
		DDD = (DDDD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][date.getDay()]).substring(0,3);
		th=(D>=10&&D<=20)?'th':((dMod=D%10)==1)?'st':(dMod==2)?'nd':(dMod==3)?'rd':'th';
		formatString = formatString.replace("#YYYY#",YYYY).replace("#YY#",YY).replace("#MMMM#",MMMM).replace("#MMM#",MMM).replace("#MM#",MM).replace("#M#",M).replace("#DDDD#",DDDD).replace("#DDD#",DDD).replace("#DD#",DD).replace("#D#",D).replace("#th#",th);
		// CHANGE NOTE: There appeared to be a lot of unused material. I cleaned up some of the code. We can restore it later if it was needed.
		h=date.getHours();
		hh = h;
		if (is12HourFormat) {
			if (h==0) hh=12;
			if (h>12) hh-=12;
			AMPM=(h<12)?'AM':'PM';
		} else {
			hh = h<10?('0'+h):h;
			AMPM = "";
		}
		mm=(m=date.getMinutes())<10?('0'+m):m;
		ss=(s=date.getSeconds())<10?('0'+s):s;
		return formatString.replace("#hhhh#",hhhh).replace("#hhh#",hhh).replace("#hh#",hh).replace("#h#",h).replace("#mm#",mm).replace("#m#",m).replace("#ss#",ss).replace("#s#",s).replace("#ampm#",ampm).replace("#AMPM#",AMPM);
	},
	"formatDate": function(ms, full, is12HourFormat){
		var date = new Date(ms);
		var now = new Date();
		var format = "#hh#:#mm#";
		if (is12HourFormat) {
			format = format+" #AMPM#";
		}
		date.customFormat = function(format){
			return UtilsObject.customFormat(date,format,is12HourFormat);
		}
		if(now.getDate() == date.getDate() && now.getMonth() == date.getMonth() && now.getFullYear() == date.getFullYear()){
			return date.customFormat(format);
		}

		var yesterday = new Date(now);
		yesterday.setDate(now.getDate()-1);

		if (full) {
			if(yesterday.getDate() == date.getDate() && yesterday.getMonth() == date.getMonth() && yesterday.getFullYear() == date.getFullYear()){
				return "Yesterday, " + date.customFormat(format);
			} else {
				return date.customFormat("#MMM# #DD#, #hh#:#mm# #AMPM#");
			}
		} else {
			if(yesterday.getDate() == date.getDate() && yesterday.getMonth() == date.getMonth() && yesterday.getFullYear() == date.getFullYear()){
				return "Yesterday";
			}
		return date.customFormat("#MMM# #DD#");
		}
	},
	"openTab" : function(url){
		var win = window.open(url, '_blank');
		win.focus();
	},
	"spliceString" : function(original, idx, rem, str) {
		var start = original.slice(0, idx);
		var end = original.slice(idx + Math.abs(rem));
		/*console.log("start: " + start);
		console.log("end: " + end);
		console.log("adding: " + str);*/
	    return  start + str + end;
	},
	"sort" : function(array,invert,...compareFieldFuncs){
		if(compareFieldFuncs.length == 0){
			array.sort();
		}else{
			var invertIfNeeded = value=> invert ? value * -1 : value;
			array.sort((left,right)=>{
				var comparisonResult = 0;
				for(var compareFieldFunc of compareFieldFuncs){
					var leftValue = compareFieldFunc(left);
					var rightValue = compareFieldFunc(right);
					if(leftValue == null){
						if(rightValue != null){
							return invertIfNeeded(1);
						}
					}					
					if(rightValue == null){
						if(leftValue != null){
							return invertIfNeeded(-1);
						}
					}
					if(rightValue == null && rightValue == null){
						return 0;
					}
					if(UtilsObject.toClass(leftValue) == UtilsObject.toClass(rightValue)){
						if(UtilsObject.isString(leftValue)){
							comparisonResult = leftValue.toLowerCase().localeCompare(rightValue.toLowerCase()) * -1;
						}else if(UtilsObject.isNumber(leftValue)){
							comparisonResult =  rightValue - leftValue;
						}else if(UtilsObject.isBoolean(leftValue)){
							comparisonResult =  leftValue ? (rightValue ? 0 : -1) : (!rightValue ? 0 : 1);
						}						
					}
					if(comparisonResult != 0){
						return invertIfNeeded(comparisonResult);
					}
				}
				return invertIfNeeded(comparisonResult);
			});	
		}
	},
	"first" : function(array,...compareFieldFuncs){
		for(compareFieldFunc of compareFieldFuncs){
			var result = array.first(compareFieldFunc);
			if(result){
				return result;
			}
		}
		return null;
	},
	"whereMax" : function(array,...compareFieldFuncs){
		if(!array || array.length == 0){
			return null;
		}
		var max = Number.MIN_VALUE;
		var result = null;
		for(compareFieldFunc of compareFieldFuncs){			
			for(item of array){
				var prop = compareFieldFunc(item);
				if(prop > max){
					max = prop;
					result = item;
				}
			}
		}
		return result;
	}
};

Array.prototype.first = function(func) {
	for (var i = 0; i < this.length; i++) {
		var item = this[i];
		if(func(item)){
			return item;
		}
	};
	return null;
};