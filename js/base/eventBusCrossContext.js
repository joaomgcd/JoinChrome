class EventBusCrossContext {
    static get() {
        return instance
    }
    static register(obj) {
        return EventBusCrossContext.get().register(obj)
    }
    static unregister(obj) {
        return EventBusCrossContext.get().unregister(obj)
    }
    static registerSticky(obj) {
        return EventBusCrossContext.get().registerSticky(obj)
    }
    static async post(obj, className) {
        return await (EventBusCrossContext.get().post(obj, className));
    }
    static async postAndWaitForResponse(data, classResponse, timeout, className) {
        return await (EventBusCrossContext.get().postAndWaitForResponse(data, classResponse, timeout, className));
    }
    static postSticky(obj) {
        return EventBusCrossContext.get().postSticky(obj)
    }
    static waitFor(clazz, timeout) {
        return EventBusCrossContext.get().waitFor(clazz, timeout)
    }
    static TAG = "EventBusCrossContext"
    static MESSAGE_TYPE_EVENT_BUS = "EventBusCrossContext"
    static MESSAGE_ACTION_REGISTER_OTHER_CONTEXTS = "RegisterOtherContexts"
    static MESSAGE_ACTION_EVENT_FROM_OTHER_CONTEXT = "EventFromOtherContext"
    static MESSAGE_ACTION_STICKY_EVENT_FROM_OTHER_CONTEXT = "StickyEventFromOtherContext"
    static #getEventName(className) {
        return "on" + className;
    }
    constructor() {
        chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
            const messageType = message["messageType"];
            if (!messageType || messageType != EventBusCrossContext.MESSAGE_TYPE_EVENT_BUS) return false;

            console.log(EventBusCrossContext.TAG, message);
            const funcToCall = await this.#functionMap[message.action];
            funcToCall(message)
            return false;
        });
    }
    async #sendToOtherContexts(message) {
        message.messageType = EventBusCrossContext.MESSAGE_TYPE_EVENT_BUS;
        await chrome.runtime.sendMessage(message);
    }

    #registered = [];
    register(toRegister) {
        if (this.#registered.some(registered => registered === toRegister)) return;

        this.#registered.push(toRegister);
    }
    async #handleEventFromOtherContext(input) {
        // console.log(EventBusCrossContext.TAG, "Event from other context", input);
        await this.#sendToRegistered(input)
    }
    async #handleStickyEventFromOtherContext(input) {
        console.log(EventBusCrossContext.TAG, "Sticky Event from other context", input);
        await this.#sendToRegisteredSticky(input)
    }
    async #sendToRegisteredSticky({ className, data }) {
        this.#stickyData[className] = data;
        const options = { eventName: EventBusCrossContext.#getEventName(className), data };
        await this.#sendTo(options, this.#registeredSticky);
        const nonSticky = this.#registered.filter(r => !this.#registeredSticky.includes(r));
        await this.#sendTo(options, nonSticky);
    }
    async #sendToRegistered({ eventName, data }) {
        return await this.#sendTo({ eventName, data }, this.#registered)
    }
    async #sendTo({ eventName, data }, registered) {
        registered.forEach((registered) => {
            const funcToCall = registered[eventName];
            if (!funcToCall) return;

            funcToCall(data);
        });
    }
    async post(data) {
        const eventName = EventBusCrossContext.#getEventName(data.constructor.name);
        await this.#sendToRegistered({ eventName, data });
        await this.#sendToOtherContexts({ action: EventBusCrossContext.MESSAGE_ACTION_EVENT_FROM_OTHER_CONTEXT, eventName, data });
    }
    #functionMap = {
        [EventBusCrossContext.MESSAGE_ACTION_EVENT_FROM_OTHER_CONTEXT]: this.#handleEventFromOtherContext.bind(this),
        [EventBusCrossContext.MESSAGE_ACTION_STICKY_EVENT_FROM_OTHER_CONTEXT]: this.#handleStickyEventFromOtherContext.bind(this)
    }
    unregister(registered) {
        const unregisterFrom = (arr) => {
            const index = arr.indexOf(registered);
            if (index == -1) return

            arr.splice(index, 1);
        };
        unregisterFrom(this.#registered);
    }
    #registeredSticky = []
    #stickyData = {}
    registerSticky(toRegister) {
        if (this.#registeredSticky.some(registered => registered === toRegister)) return;

        this.#registeredSticky.push(toRegister);
        for (const propObj in toRegister) {
            for (const propSticky in this.#stickyData) {
                if (EventBusCrossContext.#getEventName(propSticky) == propObj) {
                    toRegister[propObj].call(toRegister, this.#stickyData[propSticky])
                    return
                }
            }
        }
    }
    async postSticky(data) {
        var className = data.constructor.name;
        await this.#sendToRegisteredSticky({ className, data });
        await this.#sendToOtherContexts({ action: EventBusCrossContext.MESSAGE_ACTION_STICKY_EVENT_FROM_OTHER_CONTEXT, className, data });
    }
    removeStickyData(clazz) {
        if (clazz) {
            delete this.#stickyData[clazz.name];
        } else {
            this.#stickyData = {};
        }
    }
    getSticky(clazz) {
        return this.#stickyData[clazz.name];
    }
    getStickyData() {
        return this.#stickyData;
    }
    #getWaitForPromise(clazz, timeout, registerFunc) {
        const me = this;
        let nameToWait = null;
        if (clazz && clazz.constructor && clazz.constructor.name == "String") {
            nameToWait = clazz;
        } else {
            nameToWait = clazz.name;
        }
        return new Promise((resolve, reject) => {
            var objToRegister = {};
            var timeOutObject = null;
            if (timeout) {
                timeOutObject = setTimeout(() => {
                    reject("Timed out");
                    me.unregister(objToRegister);
                }, timeout);
            }
            objToRegister[EventBusCrossContext.#getEventName(nameToWait)] = (data) => {
                if (timeOutObject) {
                    clearTimeout(timeOutObject);
                }
                me.unregister(objToRegister);
                resolve(data);
            }
            registerFunc.call(me, objToRegister);
        });
    }
    waitFor(clazz, timeout) {
        return this.#getWaitForPromise(clazz, timeout, this.register);
    }
    waitForSticky(clazz, timeout) {
        return this.#getWaitForPromise(clazz, timeout, this.registerSticky);
    }
}
const instance = new EventBusCrossContext();
if (!self["back"]) {
    self["back"] = chrome.extension.getBackgroundPage();
}
back.Events = {
    "TestPush": function () {
    },
    "TestPopup": function () {
    },
    "PopupUnloaded": function () {
    },
    "PopupLoaded": function () {
    },
    "FilePicked": function (files) {
        this.files = files;
    },
    "FileResponse": function (fileId) {
        this.fileId = fileId;
    },
    "TabSelected": function (tabId) {
        this.tabId = tabId;
    },
    "SMSReceived": function (sms, senderId) {
        this.sms = sms;
        this.deviceId = senderId;
    },
    "StatusReceived": function (gcmStatus) {
        this.gcmStatus = gcmStatus;
    },
    "NotificationHandled": function (info) {
        this.info = info;
    },
    "NotificationImagesLoaded": function (results) {
        this.results = results;
    },
    "ThemeChanged": function (theme) {
        back.console.log("Theme changed: " + theme);
        this.theme = theme;
    }
}