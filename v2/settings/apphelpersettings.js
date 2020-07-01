import { EventBus } from "../eventbus.js";
import { AppHelperBase } from "../apphelperbase.js";
import { ControlSettings } from "./controlsetting.js";
import { SettingEncryptionPassword, SettingSingleOption, SettingTheme, SettingThemeAccentColor, SettingEventGhostNodeRedPort } from "./setting.js";
import { UtilDOM } from "../utildom.js";

/**@type {App} */
let app = null;
export class AppHelperSettings extends AppHelperBase{
 /**
     * 
     * @param {App} app 
     */
    constructor(args = {app}){
        super();
        app = args.app;
    }
    
    async load(){
        EventBus.register(this);     
        app.controlTop.appName = `Join Settings`;
        app.controlTop.appNameClickable = false;    
        app.controlTop.loading = false;      
        app.controlTop.shouldAlwaysShowImageRefresh = false;  

        this.controlSettings = new ControlSettings([
            new SettingEncryptionPassword(),
            new SettingEventGhostNodeRedPort(),
            new SettingTheme(),
            new SettingThemeAccentColor()
        ]);
        await app.addElement(this.controlSettings);
    }
    updateUrl(){
        Util.changeUrl("/?settings");
    }
    get isPanel(){
        return true;
    }
    async onSettingSaved(settingSaved){
        const setting = settingSaved.setting;
        let value = settingSaved.value;
        if(!setting) return;

        if(setting.id == SettingEncryptionPassword.id && value){
            const email = await app.userEmail;
            value = await Encryption.getEncryptedPasswordInBase64({password:value,salt:email,iterations:5000});
        }
        if(setting.id == SettingEventGhostNodeRedPort.id && value){
            value = parseInt(value);
            const {ControlDialogDialogProgress,ControlDialogOk} = (await import("../dialog/controldialog.js"))
            const dialog = await ControlDialogDialogProgress.show({title:"Testing",text:"Checking if port is listening..."})
            const {GCMPush} = await import("../gcm/gcmapp.js");
            const gcmPush = new GCMPush();
            gcmPush.senderId = app.myDeviceId;
            gcmPush.push = {title:"Test",text:"Testing from Join website..."};
            const {SettingAutomationPortFullPush} = (await import("../settings/setting.js"))
            const settingAutomationPortFullPush = new SettingAutomationPortFullPush();
            try{
                //Try full push first
                await gcmPush.sendToLocalPort({port:value});
                await ControlDialogOk.showAndWait({title:"Success!",text:`Sending full pushes to ${value}`});
                settingAutomationPortFullPush.value = true;
            }catch(error){
                try{
                    //If it doesn't work try only test push (eventgost only works with that for example)                    
                    await gcmPush.sendTextToLocalPort({port:value});
                    await ControlDialogOk.showAndWait({title:"Success!",text:`Sending text pushes to ${value}`});
                    settingAutomationPortFullPush.value = false;
                }catch{
                    await ControlDialogOk.showAndWait({title:"Error!",text:`Couldn't connect. Make sure that the app is listening on port ${value}.`});
                    console.log(error);
                    value = null;
                    settingAutomationPortFullPush.value = false;
                }
            }finally{                
                await dialog.dispose();
            }
        }
        setting.value = value;
        await this.controlSettings.update(setting);
    }
}