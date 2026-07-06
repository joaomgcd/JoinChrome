
function waitFor(conditionFn, interval = 1000) {
    return new Promise(resolve => {
        const checkCondition = setInterval(() => {
            if (conditionFn()) {
                clearInterval(checkCondition);
                resolve();
            }
        }, interval);
    });
};

function wait(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
};

function getSensitiveLogPreview(value, maxLength = 10) {
    if (value == null) {
        return value;
    }
    let textValue = value;
    if (typeof textValue != "string") {
        try {
            textValue = JSON.stringify(textValue);
        } catch (error) {
            textValue = String(textValue);
        }
    }
    if (textValue.length <= maxLength) {
        return textValue;
    }
    return `${textValue.substring(0, maxLength)}...`;
}

class CrossContext {
    static TYPE_LISTENER = "listener"
    static TYPE_CALLER = "caller"
    static LISTENER_ADD = "add"
    static LISTENER_CALLBACK = "callback"
    static TARGET_OFFSCREEN = "target_offscreen"
    static TARGET_FOREGROUND = "target_foreground"
    static TARGET_SERVICE_WORKER = "target_service_worker"
    static RESULT_ERROR = "thesuperdupererrormotherhahaa"
    static RESULT_OK = "__crossContextResultOK"
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
        if (typeof call !== "string" || call.length === 0) return null;

        const callParts = call.split('.');
        let context = self;
        for (const part of callParts.slice(0, -1)) {
            if (context == null || !(part in context)) return null;
            context = context[part];
        }

        const functionName = callParts[callParts.length - 1];
        const candidate = context == null ? null : context[functionName];
        return typeof candidate === "function" ? candidate.bind(context) : null;
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
        try {
            const fun = CrossContext.#getBackgroundFunctionFromCall(call);
            if (fun == null) {
                sendResponse({ [CrossContext.RESULT_OK]: false });
                return;
            }

            // console.log("Calling background function", self, call, target, fun)
            const output = await fun(...input);
            sendResponse({ [CrossContext.RESULT_OK]: true, value: output });
        } catch (e) {
            const errorResponse = {};
            errorResponse[CrossContext.RESULT_ERROR] = {
                message: e && e.message ? e.message : String(e),
                stack: e && e.stack ? e.stack : null,
                info: (() => {
                    try { return JSON.stringify(e); } catch (_) { return String(e); }
                })()
            };
            sendResponse(errorResponse);
        }
    }
    static call(call, target = CrossContext.TARGET_SERVICE_WORKER) {
        return (async (...input) => {
            const intputWithoutFunctions = input.filter(i => typeof i !== "function");
            const maxAttempts = 30;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                let result;
                try {
                    result = await chrome.runtime.sendMessage({ call, type: CrossContext.TYPE_CALLER, input: intputWithoutFunctions, target });
                } catch (error) {
                    const message = error && error.message ? error.message : String(error);
                    const transient = message.includes("message channel closed")
                        || message.includes("Receiving end does not exist")
                        || message.includes("Extension context invalidated");
                    if (transient && attempt < maxAttempts - 1) {
                        await wait(100);
                        continue;
                    }
                    throw error;
                }
                const possibleError = result && result[CrossContext.RESULT_ERROR];
                if (possibleError) {
                    console.log("Error from cross context call", possibleError);
                    throw possibleError;
                }
                if (result != null && typeof result === "object" && CrossContext.RESULT_OK in result) {
                    if (result[CrossContext.RESULT_OK]) {
                        const value = result.value;
                        const lastArg = input[input.length - 1];
                        if (typeof lastArg === 'function') {
                            lastArg(value);
                        }
                        return value;
                    }
                    // RESULT_OK is false: handler reached but function not available yet
                }
                // No response (undefined) or not ready — target context not loaded yet, retry
                if (attempt < maxAttempts - 1) {
                    await wait(100);
                }
            }
            console.warn(`CrossContext call "${call}" to ${target} failed: target not ready after ${maxAttempts} attempts`);
            return undefined;
        });
    }
}
const isServiceWorker = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
const hasNativeInstanceIdInCurrentContext = typeof chrome.instanceID !== "undefined"
    && typeof chrome.instanceID.getToken === "function";
const hasNativeInstanceId = isServiceWorker && hasNativeInstanceIdInCurrentContext;
if (isServiceWorker) {
    self.isInstanceIdAvailable = () => hasNativeInstanceId;
}
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
        isAvailable: async () => hasNativeInstanceIdInCurrentContext,
        getToken: CrossContext.call("chrome.instanceID.getToken")
    };

    chrome.tabs = {
        create: CrossContext.call("chrome.tabs.create"),
        query: CrossContext.call("chrome.tabs.query"),
        update: CrossContext.call("chrome.tabs.update"),
        remove: CrossContext.call("chrome.tabs.remove"),
        highlight: CrossContext.call("chrome.tabs.highlight"),
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
    if (hasNativeInstanceId) {
        // chrome.instanceID.getToken is callback-based. Convert it to a Promise for
        // cross-context callers and coalesce only identical sender/scope requests.
        const originalGetToken = chrome.instanceID.getToken.bind(chrome.instanceID);
    const pendingInstanceIdRequests = new Map();

    chrome.instanceID.getToken = async function (options = {}) {
        const requestKey = `${options.authorizedEntity || ""}:${options.scope || ""}`;
        const existingRequest = pendingInstanceIdRequests.get(requestKey);
        if (existingRequest) {
            console.log("getGCMToken using pending request", requestKey);
            return await existingRequest;
        }

        console.log("getGCMToken using new request", requestKey);
        const request = new Promise((resolve, reject) => {
            originalGetToken(options, registrationId => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!registrationId) {
                    reject(new Error("chrome.instanceID.getToken returned no registration ID"));
                    return;
                }
                resolve(registrationId);
            });
        });

        pendingInstanceIdRequests.set(requestKey, request);
        try {
            const registrationId = await request;
            console.log("GCM registration ID acquired", requestKey);
            return registrationId;
        } finally {
            pendingInstanceIdRequests.delete(requestKey);
        }
    }
    }

    // I need to replace the original addListener with my own because sometimes gcms will arrive before a background page registers its listeners and those pushes wouldn't be delivered. Wait for the listeners to be available and the push it.
    const replaceListenerThatWakesUpServiceWorker = (addListenerOnThis, tag) => {
        const joinListeners = [];
        addListenerOnThis.addListener(async payload => {
            console.log(`Received ${tag} in service worker`, payload)
            //if no joinListeners are present, wait until there are some and then send the message
            if (joinListeners.length === 0) {
                console.log(`No listeners for ${tag}, waiting for listeners to be added`)
                await waitFor(() => joinListeners.length > 0, 100);
            }
    
            joinListeners.forEach(listener => listener(payload));
        });
        addListenerOnThis.addListener = async (listener) => {
            console.log(`service worker ${tag} onMessage addListener`);
            joinListeners.push(listener);
        }
        addListenerOnThis.removeListener = async (listener) => {
            console.log(`service worker ${tag} onMessage removeListener`);
            const index = joinListeners.indexOf(listener);
            if (index == -1) return;
            
            joinListeners.splice(index, 1);
        }
    }
    replaceListenerThatWakesUpServiceWorker(chrome.contextMenus.onClicked, "context menu click");
    if (chrome.gcm && chrome.gcm.onMessage && chrome.gcm.onMessage.addListener) {
        replaceListenerThatWakesUpServiceWorker(chrome.gcm.onMessage, "gcm");
    }
    // const joinGcmListeners = [];
    // const joinContextMenuListeners = [];
    // chrome.gcm.onMessage.addListener(async payload => {
    //     console.log("Received gcm in service worker", payload)
    //     //if no joinGcmListeners are present, wait until there are some and then send the message
    //     if (joinGcmListeners.length === 0) {
    //         console.log("No listeners, waiting for listeners to be added")
    //         await waitFor(() => joinGcmListeners.length > 0, 100);
    //     }

    //     joinGcmListeners.forEach(listener => listener(payload));
    // });
    // chrome.contextMenus.onClicked.addListener(async payload => {
    //     console.log("Received context menu click in service worker", payload)
    //     //if no joinContextMenuListeners are present, wait until there are some and then send the message
    //     if (joinContextMenuListeners.length === 0) {
    //         console.log("No listeners for context menu, waiting for listeners to be added")
    //         await waitFor(() => joinContextMenuListeners.length > 0, 100);
    //     }

    //     joinContextMenuListeners.forEach(listener => listener(payload));
    // });
    // chrome.gcm.onMessage.addListener = async (listener) => {
    //     console.log("service worker gcm onMessage addListener");
    //     joinGcmListeners.push(listener);
    // }
    // chrome.gcm.onMessage.removeListener = async (listener) => {
    //     console.log("service worker gcm onMessage removeListener");
    //     joinGcmListeners.push(listener);
    // }
    // chrome.contextMenus.onClicked.addListener = async (listener) => {
    //     console.log("service worker contextMenus onClicked addListener");
    //     joinContextMenuListeners.push(listener);
    // }
    // chrome.contextMenus.onClicked.removeListener = async (listener) => {
    //     console.log("service worker contextMenus onClicked removeListener");
    //     joinContextMenuListeners.push(listener);
    // }
    
}