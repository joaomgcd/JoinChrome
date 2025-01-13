const backgroundPage = (() => {
    const call = (name) => CrossContext.call(name, CrossContext.TARGET_OFFSCREEN);
    const backgroundPage = self["isOffscreenPage"] ? self : {
        UtilsVoice: {},
        eventBus: {
            register: CrossContext.listen("registerInEventBus")
        },
        backgroundEventHandler: {
            getSmsWhilePopupClosed: call("getSmsWhilePopupClosed")
        },
        console: {
            log: call("console.log")
        },
        getTheme: call("getTheme"),
        getThemeAccentColor: call("getThemeAccentColor"),
        getDefaultTab: call("getDefaultTab"),
        getNotificationsRaw: call("getNotificationsRaw"),
        getCurrentTabPromise: call("getCurrentTabPromise"),
        getSmsWhilePopupClosed: call("getSmsWhilePopupClosed"),
        sanitizeAndCreateLinksInHtml: call("sanitizeAndCreateLinksInHtml"),
        sanitizeHTML: call("sanitizeHTML"),
        get12HourFormat: call("get12HourFormat"),
        addEventListener: CrossContext.listen("addEventListener", target = CrossContext.TARGET_OFFSCREEN, replyTo = CrossContext.TARGET_FOREGROUND),
        removeEventListener: CrossContext.stopListening("addEventListener"),
        showNotification: call("showNotification"),
        setLastPush: call("setLastPush"),
        getOptionValue: call("getOptionValue"),
        getShowInfoNotifications: call("getShowInfoNotifications"),
        getToken: call("getToken"),
        pushUrl: call("pushUrl"),
        pushClipboard: call("pushClipboard"),
        writeText: call("writeText"),
        sendSmsFromButtonCommand: call("sendSmsFromButtonCommand"),
        getScreenshot: call("getScreenshot"),
        getScreenCapture: call("getScreenCapture"),
        requestLocation: call("requestLocation"),
        findDevice: call("findDevice"),
        openApp: call("openApp"),
        speak: call("speak"),
        pushTaskerCommand: call("pushTaskerCommand"),
        pushIFTTTEvent: call("pushIFTTTEvent"),
        pushCustomCommand: call("pushCustomCommand"),
        openClipboard: call("openClipboard"),
        renameDevice: call("renameDevice"),
        deleteDevice: call("deleteDevice"),
        noteToSelf: call("noteToSelf"),
        selectContactForCall: call("selectContactForCall"),
        dispatch: call("dispatch"),
        showPushHistory: call("showPushHistory"),
        refreshDevices: call("refreshDevices"),
        getAuthTokenPromise: call("getAuthTokenPromise"),
        getNotificationWebsites: call("getNotificationWebsites"),
        setLocalDeviceNameFromDeviceList: call("setLocalDeviceNameFromDeviceList"),
        getContextMenuContexts: call("getContextMenuContexts"),
        updateContextMenu: call("updateContextMenu"),
        updateContextMenuDevices: call("updateContextMenuDevices"),
        getVoiceEnabled: call("getVoiceEnabled"),
        onvoiceenabledsave: call("onvoiceenabledsave"),
        updateBadgeText: call("updateBadgeText"),
        getOptionType: call("getOptionType"),
        getURLParameter: call("getURLParameter"),
        registerDevice: call("registerDevice"),
        pushCall: call("pushCall"),
        resetNotifications: call("resetNotifications"),
        getAddDismissEverywhereButton: call("getAddDismissEverywhereButton"),
        cancelNotification: call("cancelNotification"),
        sendFileRequest: call("sendFileRequest"),
        downloadFile: call("downloadFile"),
        createPushClipboardWindow: call("createPushClipboardWindow"),
        doNotificationAction: call("doNotificationAction"),
        getNotifications: call("getNotifications"),
        getNotificationRaw: call("getNotificationRaw"),
        handleAutoClipboard: call("handleAutoClipboard")
    }
    return backgroundPage;
})()

if (!self["chrome.extension"]) {
    chrome.extension = {};
}
chrome.extension.getBackgroundPage = () => {
    return backgroundPage;
};