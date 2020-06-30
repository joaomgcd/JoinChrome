import { DialogSingleChoice,DialogInput } from "./dialog.js";
import { Control } from "../control.js";
import { UtilDOM } from "../utildom.js";
import { EventBus } from "../eventbus.js";

export class ControlDialog extends Control {
    constructor({dialog}){
        super();
        this.dialog = dialog;
    }
    async show(position = {x,y}){
        if(!this.rendered){
            this.rendered = await this.render();
            this.rendered.classList.add("dialog");
            this.rendered.style.left = `${position.x}px`;
            this.rendered.style.top = `${position.y}px`;
            UtilDOM.makeInvisible(this.rendered);
            document.body.appendChild(this.rendered);
            const bottomDocument = UtilDOM.getElementBounds(document.body).bottom;
            const bottomRendered = UtilDOM.getElementBounds(this.rendered).bottom;
            if(bottomRendered > bottomDocument){
                const finalPositionY = position.y - (bottomRendered - bottomDocument) - 8;
                this.rendered.style.top = `${finalPositionY}px`;
            }
        }
        UtilDOM.show(this.rendered);
        this.onShown();
    }
    //open
    onShown(){}
}
const showDialog = async ({args,dialogclass,controlclass}) => {
    args.dialog = new dialogclass(args);
    const control = new controlclass(args);
    control.show(args.position);
    return control;
}
const showDialogAndWait = async (showArgs = {args,dialogclass,controlclass,waitForClass,timeout}) => {
    if(!showArgs.timeout){
        showArgs.timeout = 15000;
    }
    const control = await showDialog(showArgs);
    try{
        const result = await EventBus.waitFor(showArgs.waitForClass,showArgs.timeout);
        return result
    }catch(error){
        console.log("Didn't get choice from dialog",error);
        return null;
    }finally{
        await control.dispose();
    }
}
export class ControlDialogSingleChoice extends ControlDialog {
    static getDialogArgs(args){
        return {args,dialogclass:DialogSingleChoice,controlclass:ControlDialogSingleChoice,waitForClass:SingleChoiceChosen};
    }
    static async show(args = {position,choices,choiceToLabelFunc}){
        return showDialog(ControlDialogSingleChoice.getDialogArgs(args));        
    }
    static async showAndWait(args){       
        const result = (await showDialogAndWait(ControlDialogSingleChoice.getDialogArgs(args)));
        if(!result) return;
        
        return result.choice;
    }
    constructor(args = {dialog,choiceToLabelFunc}){
        super(args);
        this.choiceToLabelFunc = args.choiceToLabelFunc;
    }
    getHtmlFile(){
        return "/v2/dialog/dialogsinglechoice.html";
    }
    getStyleFile(){
        return "/v2/dialog/dialogsinglechoice.css";
    }
    async renderSpecific({root}){
        this.dialogElement = root;

        this.dialogElement.innerHTML = "";
        for(const choice of this.dialog.choices){
            const choiceElement = document.createElement("div");
            choiceElement.classList.add("dialogchoice");
            choiceElement.innerHTML = this.choiceToLabelFunc(choice);
            choiceElement.onclick = async () => await EventBus.post(new SingleChoiceChosen(choice));
            this.dialogElement.appendChild(choiceElement);
        }
    }
}
export class SingleChoiceChosen{
    constructor(choice){
        this.choice = choice;
    }
}


export class ControlDialogInput extends ControlDialog {
    static getDialogArgs(args){
        return {args,dialogclass:DialogInput,controlclass:ControlDialogInput,waitForClass:InputSubmitted};
    }
    static async show(args = {position,choices,choiceToLabelFunc}){
        return showDialog(ControlDialogInput.getDialogArgs(args));        
    }
    static async showAndWait(args){      
        const result = (await showDialogAndWait(ControlDialogInput.getDialogArgs(args)));
        if(!result) return;
        
        return result.text;
    }
    constructor(args = {dialog}){
        super(args);
    }
    getHtmlFile(){
        return "/v2/dialog/dialoginput.html";
    }
    getStyleFile(){
        return "/v2/dialog/dialoginput.css";
    }
    async renderSpecific({root}){
        this.dialogElement = root;

        this.titleElement = await this.$(".dialoginputtitle");
        this.labelElement = await this.$("label");
        this.textElement = await this.$("input");
        this.okElement = await this.$(".dialogbuttonok");
        this.cancelElement = await this.$(".dialogbuttoncancel");
        
        this.textElement.value = "";
        this.titleElement.innerHTML = this.dialog.title;
        this.labelElement.innerHTML = this.dialog.placeholder;
        const submit = async () => {
            const text = this.textElement.value;
            await EventBus.post(new InputSubmitted(text));
        }
        UtilDOM.onEnterKey(this.textElement,async ()=> await submit())
        this.okElement.onclick = async ()=> await submit();
        this.cancelElement.onclick = async () => await EventBus.post(new InputSubmitted(null));
    }
    onShown(){
        this.textElement.focus()
    }
}
export class InputSubmitted{
    constructor(text){
        this.text = text;
    }
}
