var createElement = function(parent, tag, id, attributes){ 
    var el = document.createElement(tag);
    el.setAttribute('id', id);
    if(attributes !== undefined){
      for(attribute in attributes){
        var attributeName = attribute;
        var attributeValue = attributes[attribute];
        //no caso do IE tem que se usar a propriedade "className" senão o estilo não é aplicado. Também são usadas regras CSS específicas para IE porque este não suporta animações
        if(attributeName == "class" && !document.createEvent){ //IE         
          el.className = attributeValue + "IE";
        }else{ //Non-IE
          el.setAttribute(attribute, attributeValue);
        }
      }
    }
    parent.appendChild(el);
    return el;
}
document.addEventListener('DOMContentLoaded', function () {
    chrome.extension.getBackgroundPage().setWoken(true);
    var prompt = chrome.extension.getBackgroundPage().getWakeUpResponse();
    if(prompt){
      var promptElement = document.getElementById("prompt");
      promptElement.innerText = prompt;
    }
    chrome.extension.getBackgroundPage().setPopupVoiceCommandListener(function(){
      window.close();
    });
});
