
class CrossContext {
    static TYPE_LISTENER = "listener"
    static TYPE_CALLER = "caller"
    static LISTENER_ADD = "add"
    static LISTENER_CALLBACK = "callback"
    static TARGET_OFFSCREEN = "target_offscreen"
    static TARGET_FOREGROUND = "target_foreground"
    static TARGET_SERVICE_WORKER = "target_service_worker"
    static RESULT_ERROR = "thesuperdupererrormotherhahaa"
    static LISTENER_ID_DEFAULT = "MyListener"
    static #listeners = {}
    static addForegroundListener({ call, listener, target, addEventListenerType, replyTo }) {
        if (!CrossContext.#listeners[call]) {
            CrossContext.#listeners[call] = [];
        }
        CrossContext.#listeners[call].push({ listener, addEventListenerType });
        const options = {
            call,
            type: CrossContext.TYPE_LISTENER,
            target,
            addEventListenerType,
            replyTo
        };
        chrome.runtime.sendMessage(options)
    }
    static removeForegroundListener({ call, listener, target, addEventListenerType, replyTo }) {
        if (!CrossContext.#listeners[call]) return;

        //remove all matching by finding non-matching and assigning those
        const nonMatchingListeners = CrossContext.#listeners[call].filter(listener => listener.addEventListenerType != addEventListenerType);
        CrossContext.#listeners[call] = nonMatchingListeners;
    }
    static callForegroundListener(call, addEventListenerTypeForCall, input = []) {
        const listenersForCall = CrossContext.#listeners[call];
        if (listenersForCall == null) return;

        listenersForCall.forEach(listenerOptions => {
            const { listener, addEventListenerType } = listenerOptions;
            if (addEventListenerType != addEventListenerTypeForCall) return;

            // console.log("Calling foreground listener", self, call, listener);
            listener(...input)
        });
    }
    static #getBackgroundFunctionFromCall(call) {
        if (call.indexOf(".") < 0) {
            return self[call];
        }
        const callParts = call.split('.');
        const context = callParts.slice(0, callParts.length - 1).reduce((obj, part) => obj[part], self);
        const functionName = callParts[callParts.length - 1];
        const fun = context[functionName].bind(context);
        return fun;
    }
    static #backgroundListeners = {}
    static addBackgroundListener({ call, id = CrossContext.LISTENER_ID_DEFAULT, addEventListenerType, replyTo }) {
        const listenerFunction = CrossContext.#getBackgroundFunctionFromCall(call);
        if (listenerFunction == null) return;

        const removeListenerFunction = CrossContext.#getBackgroundFunctionFromCall(call
            .replace("addListener", "removeListener")
            .replace("addEventListener", "removeEventListener")
        );

        // console.log("Adding background listener", self, call, listenerFunction);
        const finalId = call + id;
        if (removeListenerFunction) {
            const existingListenerWithSameId = CrossContext.#backgroundListeners[finalId];
            if (existingListenerWithSameId) {
                // console.log("Removing existing listener with same ID", finalId, existingListenerWithSameId)
                if (addEventListenerType) {
                    removeListenerFunction(addEventListenerType, existingListenerWithSameId);
                } else {
                    removeListenerFunction(existingListenerWithSameId);
                }
                delete CrossContext.#backgroundListeners[finalId];
            }
        }
        const listener = (...input) => {
            chrome.runtime.sendMessage({ call, type: CrossContext.TYPE_LISTENER, input, target: replyTo, listenerAddOrCallback: CrossContext.LISTENER_CALLBACK, addEventListenerType });
        };
        CrossContext.#backgroundListeners[finalId] = listener
        if (addEventListenerType) {
            listenerFunction(addEventListenerType, listener)
        } else {
            listenerFunction(listener)
        }
    }
    static listen(call, target = CrossContext.TARGET_SERVICE_WORKER, replyTo = isForegroundPage ? CrossContext.TARGET_FOREGROUND : CrossContext.TARGET_OFFSCREEN) {
        return ((...listener) => {
            let addEventListenerType = null;
            let actualListener = null;
            let addEventListenerOptions = null;

            if (listener.length > 1) {
                [addEventListenerType, actualListener, addEventListenerOptions] = listener;
            } else {
                actualListener = listener[0];
            }

            // console.log(`Listening to ${call}`, { self, target, replyTo });
            return CrossContext.addForegroundListener({ call, listener: actualListener, target, addEventListenerType, addEventListenerOptions, replyTo })
        });
    }
    static stopListening(call) {
        return ((...listener) => {
            let addEventListenerType = null;
            let actualListener = null;
            let addEventListenerOptions = null;

            if (listener.length > 1) {
                [addEventListenerType, actualListener] = listener;
            } else {
                actualListener = listener[0];
            }

            // console.log(`Listening to ${call}`, { self, target, replyTo });
            return CrossContext.removeForegroundListener({ call, listener: actualListener, addEventListenerType })
        });
    }

    static async callBackgroundFunction({ call, input, sendResponse, target }) {
        const fun = CrossContext.#getBackgroundFunctionFromCall(call);
        if (fun == null) return

        // console.log("Calling background function", self, call, target, fun)
        try {
            const output = await fun(...input);
            await sendResponse(output);
        } catch (e) {
            const errorResponse = {};
            errorResponse[CrossContext.RESULT_ERROR] = { message: e.toString(), stack: e.stack, info: JSON.stringify(e) };
            await sendResponse(errorResponse);
        }
    }
    static call(call, target = CrossContext.TARGET_SERVICE_WORKER) {
        return (async (...input) => {
            const intputWithoutFunctions = input.filter(i => typeof i !== "function");
            const result = await chrome.runtime.sendMessage({ call, type: CrossContext.TYPE_CALLER, input: intputWithoutFunctions, target });
            const possibleError = result && result[CrossContext.RESULT_ERROR];
            if (possibleError) {
                console.log("Error from cross context call", possibleError);
                throw possibleError;
            }
            const lastArg = input[input.length - 1];
            if (typeof lastArg === 'function') {
                lastArg(result);
            }
            return result;
        });
    }
}
const isServiceWorker = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
const isOffscreenPage = self["isOffscreenPage"] ?? false;
const isForegroundPage = self["isForegroundPage"] ?? false;
console.log("Self", self, "Is Service Worker", isServiceWorker, "Is Offscreen Page", isOffscreenPage, "Is Foreground Page", isForegroundPage);
chrome.runtime.onMessage.addListener(({ call, type, input, target, replyTo, addEventListenerType, listenerAddOrCallback = CrossContext.LISTENER_ADD }, sender, sendResponse) => {
    if (!call || !target || !type) return false;

    const rightTarget = false//!target
        || (target == CrossContext.TARGET_SERVICE_WORKER && isServiceWorker)
        || (target == CrossContext.TARGET_OFFSCREEN && isOffscreenPage)
        || (target == CrossContext.TARGET_FOREGROUND && isForegroundPage);
    if (!rightTarget) return;

    if (type == CrossContext.TYPE_LISTENER) {
        if (listenerAddOrCallback == CrossContext.LISTENER_ADD) {
            CrossContext.addBackgroundListener({ call, addEventListenerType, sender, replyTo });
        } else {
            CrossContext.callForegroundListener(call, addEventListenerType, input);
        }
        return false;
    }
    if (type == CrossContext.TYPE_CALLER) {
        (async () => {
            await CrossContext.callBackgroundFunction({ call, input, target, sendResponse });
        })();
        return true;
    }
});
if (!isServiceWorker) {
    const originalChromeRuntime = chrome.runtime;
    chrome.commands = {
        onCommand: {
            addListener: CrossContext.listen("chrome.commands.onCommand.addListener")
        },
        getAll: CrossContext.call("chrome.commands.getAll")
    };

    chrome.notifications = {
        onClicked: {
            addListener: CrossContext.listen("chrome.notifications.onClicked.addListener")
        },
        onClosed: {
            addListener: CrossContext.listen("chrome.notifications.onClosed.addListener")
        },
        onButtonClicked: {
            addListener: CrossContext.listen("chrome.notifications.onButtonClicked.addListener")
        },
        clear: CrossContext.call("chrome.notifications.clear"),
        create: CrossContext.call("chrome.notifications.create")
    };

    chrome.contextMenus = {
        removeAll: CrossContext.call("chrome.contextMenus.removeAll"),
        create: CrossContext.call("chrome.contextMenus.create"),
        onClicked: {
            addListener: CrossContext.listen("chrome.contextMenus.onClicked.addListener")
        }
    };

    chrome.storage = {
        sync: {
            get: CrossContext.call("chrome.storage.sync.get"),
            set: CrossContext.call("chrome.storage.sync.set"),
            onChanged: {
                addListener: CrossContext.listen("chrome.storage.sync.onChanged.addListener")
            }
        },
        onChanged: {
            addListener: CrossContext.listen("chrome.storage.onChanged.addListener")
        }
    };

    chrome.gcm = {
        onMessage: {
            addListener: CrossContext.listen("chrome.gcm.onMessage.addListener")
        }
    };

    chrome.instanceID = {
        getToken: CrossContext.call("chrome.instanceID.getToken")
    };

    chrome.tabs = {
        create: CrossContext.call("chrome.tabs.create"),
        query: CrossContext.call("chrome.tabs.query"),
        update: CrossContext.call("chrome.tabs.update"),
        remove: CrossContext.call("chrome.tabs.remove"),
        onUpdated: {
            addListener: CrossContext.listen("chrome.tabs.onUpdated.addListener"),
            removeListener: CrossContext.call("chrome.tabs.onUpdated.removeListener")
        },
        onRemoved: {
            addListener: CrossContext.listen("chrome.tabs.onRemoved.addListener"),
            removeListener: CrossContext.call("chrome.tabs.onRemoved.removeListener")
        }
    };

    chrome.windows = {
        onRemoved: {
            addListener: CrossContext.listen("chrome.windows.onRemoved.addListener")
        },
        update: CrossContext.call("chrome.windows.update"),
        create: CrossContext.call("chrome.windows.create"),
        getCurrent: CrossContext.call("chrome.windows.getCurrent")
    };
    chrome.action = {
        setIcon: CrossContext.call("chrome.action.setIcon"),
        setBadgeText: CrossContext.call("chrome.action.setBadgeText"),
        setBadgeBackgroundColor: CrossContext.call("chrome.action.setBadgeBackgroundColor")
    };
    chrome.identity = {
        getProfileUserInfo: CrossContext.call("chrome.identity.getProfileUserInfo"),
        getAuthToken: CrossContext.call("chrome.identity.getAuthToken")
    };
    chrome.runtime = {
        getManifest: CrossContext.call("chrome.runtime.getManifest"),
        sendMessage: originalChromeRuntime.sendMessage,
        onMessage: originalChromeRuntime.onMessage
    }

}

if (isServiceWorker) {
    //needed because otherwise if you do too many requests in a row you'll get an exception
    const originalGetToken = chrome.instanceID.getToken;
    var gcmTokenGetter = null;
    const getFromPending = async () => {
        const token = await gcmTokenGetter;
        console.log("token", token);
        gcmTokenGetter = null;
        return token;
    }
    chrome.instanceID.getToken = async function (...input) {
        if (gcmTokenGetter) {
            console.log("getGCMToken using pending request")
            return await getFromPending();
        }

        console.log("getGCMToken using new request")
        gcmTokenGetter = originalGetToken(...input);
        return await getFromPending();
    }
}