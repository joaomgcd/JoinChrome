
setTimeout(function(){
  chrome.extension.getBackgroundPage().confirmTestPopup();
  window.close();
},2000);