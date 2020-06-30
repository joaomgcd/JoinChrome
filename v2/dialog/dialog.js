class Dialog{

}

export class DialogSingleChoice extends Dialog{
    constructor({choices}){
        super()
        this.choices = choices;
    }
}

export class DialogInput extends Dialog{
    constructor({title,placeholder}){
        super()
        this.title = title;
        this.placeholder = placeholder;
    }
}