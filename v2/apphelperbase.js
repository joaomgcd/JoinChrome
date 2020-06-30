import { EventBus } from "./eventbus.js";
import { Control } from "./control.js";

export class AppHelperBase{
    async unload(){
        await Control.unloadControls(this);
    }
    //abstract
    updateUrl(){}
}