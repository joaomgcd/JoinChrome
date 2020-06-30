import {AppContext} from './v2/appcontext.js'
const back = chrome.extension.getBackgroundPage();
class AppLoader{
    static get AppHelperMedia(){
        return (async()=>(await import("./v2/media/apphelpermedia.js")).AppHelperMedia)();
    }
    static get AppHelperFiles(){
        return (async()=>(await import("./v2/files/apphelperfiles.js")).AppHelperFiles)();
    }
    static get ControlMediaInfos(){
        return (async()=>(await import("./v2/media/controlmediainfo.js")).ControlMediaInfos)();
    }
    static get MediaInfos(){
        return (async()=>(await import("./v2/media/mediainfo.js")).MediaInfos)();
    }
    static get UtilDOM(){
        return (async()=>(await import("./v2/utildom.js")).UtilDOM)();
    }
    static get Device(){
        return (async()=>(await import("./v2/device/device.js")).Device)();
    }
    static get Devices(){
        return (async()=>(await import("./v2/device/device.js")).Devices)();
    }
    static get EventBus(){
        return (async()=>(await import("./v2/eventbus.js")).EventBus)();
    }
}
class ControlTop{
    set loading(value){
        setRefreshing(value);
    }
}
class App{
    async load(){
        self.getAuthTokenPromise = () => back.getAuthTokenPromise();
        await (await AppLoader.UtilDOM).addScriptFiles(
            "/v2/util.js",
            "/v2/utilweb.js",
            "/v2/google/drive/googledrive.js",
            "/v2/gcm/gcmbase.js",
            "/v2/gcm/gcmmulti.js",
            "/v2/db.js"
        );       
        
        back.v2Stuff.EventBus = await AppLoader.EventBus;
        const device = (await this.devicesFromDb).find(device=>device.canBrowseFiles() && device.deviceName == "Pixel 2");
        const appHelperFiles = new (await AppLoader.AppHelperFiles)({app:new AppForFiles(),device});
        await appHelperFiles.load();
        (await AppLoader.UtilDOM).show(self.document.querySelector("#tab-filebrowser"));
        
        const appHelperMedia = new (await AppLoader.AppHelperMedia)({app:new AppForMedia()});
        appHelperMedia.load();
        (await AppLoader.UtilDOM).show(self.document.querySelector("#tab-media"));
        /*const codeGcmBase = await (await fetch("http://localhost:8080/v2/gcm/gcmbase.js")).text();
        const split = codeGcmBase.split("class");
        split.forEach(clazz => {
            if(!clazz) return;

            clazz = clazz.trim();
            const className = clazz.substring(0,clazz.indexOf("{"));
            self[className] = eval(`(class ${clazz})`);
        });
        (await AppLoader.UtilDOM).setCssVhVariableAndListenToWindowChanges();
        const utilCode = await (await fetch("http://localhost:8080/v2/util.js")).text();
        eval(utilCode);
        const utilClassCode = utilCode.substring(utilCode.indexOf("class"));
        self.Util = eval(`(${utilClassCode})`);
        
        const utilWebCode = await (await fetch("http://localhost:8080/v2/utilweb.js")).text();
        self.UtilWeb = eval(`(${utilWebCode})`);

        const appHelperMedia = new AppHelperMedia(this);
        await appHelperMedia.load();*/
    }

    get rootSelector(){}
    async addElement(control,parent=null){
        const render = await control.render();
        
        if(!parent){
            parent = self.document.querySelector(this.rootSelector);
        }
        parent.appendChild(render);
    }
    async getAuthToken(){
        return await back.getAuthTokenPromise();
    }
    async getDevice(deviceId){
        const devices = await this.devicesFromDb;
        return devices.getDevice(deviceId);
    }
    get devicesFromDb(){
        return (async () =>{
            const Device = await AppLoader.Device;
            const Devices = await AppLoader.Devices;
            const array = back.devices.map(deviceRaw => Device.getDevice(deviceRaw))
            return new Devices(array);
        })();
    }
    storeObject(key,value){
        AppContext.context.localStorage.setObject(key,value);
    }
    restoreObject(key){
        return AppContext.context.localStorage.getObject(key);
    }
    store(key,value){
        AppContext.context.localStorage.set(key,value);
    }
    restoreString(key){
        return AppContext.context.localStorage.get(key);
    }
    restoreBoolean(key){
        return AppContext.context.localStorage.getBoolean(key);
    }
    loadFcmClient(){

    }
    get controlTop(){
        if(this._controlTop == null){
            this._controlTop = new ControlTop();
        }
        return this._controlTop;
    }
    get token(){
        return self.getAuthTokenPromise();
    }
    get back(){
        return chrome.extension.getBackgroundPage();
    }
    get db(){
        if(!this._db){
            this._db = new Dexie("join_app");
            this._db.version(6).stores({
                devices: 'deviceId,json',
                gcm:'gcmId,json',
                smsThreads:'key,address,deviceId,json',
                contacts:'key,number,deviceId,json',
                smsConversations:'key,address,deviceId,json',
                mediaInfos:'key,json'
            });
        }
        return this._db;
    }
}
class AppForMedia extends App{    
    get rootSelector(){
        return "#media";
    }
}
class AppForFiles extends App{    
    get rootSelector(){
        return "#filebrowser";
    }
}
// class AppHelperMedia{
//     constructor(app){
//         this.app = app;
//     }
//     onMediaButtonPressed(mediaButtonPressed){
//         console.log(mediaButtonPressed);
//     }
//     async load(){    
//         (await AppLoader.EventBus).register(this);
//         const MediaInfos = (await AppLoader.MediaInfos);
//         const loader = MediaInfos.loader;
//         const Device = (await AppLoader.Device);
//         const deviceRaw = this.app.back.devices.find(device=>device.deviceName == "Pixel 3");
//         const device = Device.getDevice(deviceRaw);
//         device.canContactViaLocalNetwork = UtilsDevices.getLocalNetworkServerAddress(device);
//         let mediaInfos = await loader.load({db:this.app.db,refresh:false,dbGoogleDriveArgs:{
//             deviceId:device.deviceId,
//             device,
//             token: await this.app.token
//         }});
//         if(!mediaInfos){
//             mediaInfos = new MediaInfos([],device);
//         }
//         const control = new (await AppLoader.ControlMediaInfos)([mediaInfos],()=>this.app.token);
//         const rendered = await control.render();
//         console.log(rendered);
//         self.document.querySelector("#media").appendChild(rendered);
//         (await AppLoader.UtilDOM).show(self.document.querySelector("#tab-media"));
//     }
// }
// const app = new App();
// app.load();