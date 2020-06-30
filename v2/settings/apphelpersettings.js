import { EventBus } from "../eventbus.js";
import { AppHelperBase } from "../apphelperbase.js";
import { ControlSettings } from "./controlsetting.js";
import { SettingEncryptionPassword, SettingSingleOption, SettingTheme, SettingThemeAccentColor } from "./setting.js";
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
        setting.value = value;
        await this.controlSettings.update(setting);
    }
}