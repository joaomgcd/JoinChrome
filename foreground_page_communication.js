const foregroundPage = (() => {
    const call = (name) => CrossContext.call(name, CrossContext.TARGET_FOREGROUND);
    const foregroundPage = self["isForegroundPage"] ? self : {
        pickFile: call("pickFile")
    }
    return foregroundPage;
})();