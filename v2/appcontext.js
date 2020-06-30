
export class AppContext{
    static set context(value){
        Object.assign(_context,value);
    }
    static get context(){
        return _context;
    }
}
const localStorageCache = {};
class LocalStorage{
    
    set(key,value){
        if(!value){
            this.delete(key);
            return;
        }
        localStorageCache[key] = value;
        localStorage.setItem(key,value);
    }
    delete(key){        
        delete localStorageCache[key];
		localStorage.removeItem(key);
    }
    setObject(key,value){
        this.set(key,JSON.stringify(value));
    }
    get(key){
        if(localStorageCache.hasOwnProperty(key)) return localStorageCache[key];

        const value = localStorage.getItem(key);
        if(value == "null"){
            value = null;
        }
        return value;
    }
    getBoolean(key){
        const raw = this.get(key);
        if(!raw) return false;

        if(raw == "false") return false;
        return true;
    }
    getObject(key){
        return JSON.parse(this.get(key));
    }
}
var _context = {
    "localStorage":new LocalStorage(),
    "isThisDevice":device => _context.getMyDeviceId() == device.deviceId,
    "getMyDeviceId":() => _context.localStorage.get("myDeviceId"),
    "setMyDeviceId":deviceId => _context.localStorage.set("myDeviceId",deviceId)
};