String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
Array.prototype.removeIf = function(callback) {
    var removed = 0;
    var i = 0;
    while (i < this.length) {
        if (callback(this[i], i)) {
            this.splice(i, 1);
            removed++;
        }
        else {
            ++i;
        }
    }
    return removed;
};
Array.prototype.select = function(func) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        result.push(func(item));
    };
    return result;
};
Array.prototype.doForAll = function(func) {
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        func(item,i);
    };
};
Array.prototype.where = function(func) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        if(func(item)){
            result.push(item);
        }
    };
    return result;
};
Array.prototype.equalsArray = function(arr2) {
    if(this.length !== arr2.length)
        return false;
    for(var i = this.length; i--;) {
        if(this[i] !== arr2[i])
            return false;
    }

    return true;
}
Array.prototype.equalsArrayAnyOrder = function(arr2) {
    if(this.length !== arr2.length)
        return false;
    for(var i = this.length; i--;) {
        if(arr2.indexOf(this[i])<0){
            return false;
        }
    }
    for(var i = arr2.length; i--;) {
        if(this.indexOf(arr2[i])<0){
            return false;
        }
    }

    return true;
}
Array.prototype.first = function(func) {
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        if(func(item)){
            return item;
        }
    };
    return null;
};
Array.prototype.joinJoaomgcd = function(joiner) {
    if(!joiner){
        joiner=",";
    }
    var joined = "";
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        if(i>0){
            joined += joiner;
        }
        joined += item;
    };
    return joined;
};
Array.prototype.doForAllAsync = function(func, callbackFinal, shouldProcessItem, callbackEach) {
  var me = this;
  var count = -1;
  var results = [];
  var doAll = function(callback){
    count++;
    if(count == me.length){
      callback(results);
    }else{
        var item = me[count];
        if(!shouldProcessItem || shouldProcessItem(item)){
            func(item,function(result){
                results.push(result);
                if(callbackEach){
                    callbackEach(result, count);
                }
                doAll(callback);
            });
        }else{
            results.push(null);
            doAll(callback);
        }
      
    }
  };
  doAll(callbackFinal);
};
Array.prototype.doForChain = function(func, callbackFinal) {
  var me = this;
  var count = -1;
  var preivousResult = null;
  var doAll = function(callback){
    count++;
    if(count == me.length){
      callback(preivousResult);
    }else{
        var item = me[count];
        func(item,preivousResult,function(result){
            preivousResult = result;
            doAll(callback);
        });
        
      
    }
  };
  doAll(callbackFinal);
};
Object.prototype.applyProps = function(objToApply){
    if(!objToApply){
        return;
    }
    for(var prop in objToApply){
      var value = objToApply[prop];
        if(value.toClass() != "[object Function]"){
          this[prop] = value;
        }
    }
    return this;
};
Object.prototype.toClass = function(){
  return {}.toString.call(this);
};
Object.prototype.isString = function(){
  return this.toClass() == "[object String]";
};
Object.prototype.isArray = function(){
  return this.toClass() == "[object Array]";
};
