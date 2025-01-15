importScripts("./cross_context.js");
(async () => {
    try {
        await chrome.offscreen.closeDocument()
        console.log("existing offscreen document closed");
    } catch (error) {
        console.log("no offscreen document to close")
    }
    try {
        const result = await chrome.offscreen.createDocument({
            url: 'join.html',
            reasons: ['CLIPBOARD', 'LOCAL_STORAGE'],
            justification: 'reason for needing the document',
        });
        console.log('Offscreen document created successfully:', result);
    } catch (error) {
        console.warn('Error creating offscreen document:', error);
    }
})();

chrome.notifications.onClicked.addListener(id => {
    console.log("Notification clicked", id)
})
chrome.notifications.onButtonClicked.addListener((id, index) => {
    console.log("Notification button clicked", id, index)
})