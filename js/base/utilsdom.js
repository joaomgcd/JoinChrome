var UtilsDom = {
	"getURLParameter" : function(name,url) {
		if(!url){
			url = window.location.href;
		}
		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url)||[,""])[1].replace(/\+/g, '%20'))||null
	},
	"createElement": function(parent, tag, id, attributes, position) {
		var el = document.createElement(tag);
		el.setAttribute('id', id);
		if (attributes !== undefined) {
			for (attribute in attributes) {
				var attributeName = attribute;
				var attributeValue = attributes[attribute];
				//no caso do IE tem que se usar a propriedade "className" senão o estilo não é aplicado. Também são usadas regras CSS específicas para IE porque este não suporta animações
				if (attributeName == "class" && !document.createEvent) { //IE
						el.className = attributeValue + "IE";
				} else { //Non-IE
						el.setAttribute(attribute, attributeValue);
				}
			}
		}
		if(position >= 0){
			parent.insertBefore(el, parent.children[position]);
		}else{
			parent.appendChild(el);	
		}
		return el;
	},
	"waitForKey": function(element, keyCode, funcEvent){
		return new Promise(function(resolve,reject){
			element.addEventListener("keydown",function(e){
				var shouldResolve = e.keyCode == keyCode;
				if(shouldResolve && funcEvent){
					shouldResolve = funcEvent(e);
				}
				if(shouldResolve){
					e.preventDefault();
					resolve(element.value);
				}
			});
		});
	},
	"waitForEnterKey": function(inputElement){
		return UtilsDom.waitForKey(inputElement, 13, function(e){
			return !e.shiftKey;
		});
	},
	"waitForEscKey": function(element){
		return UtilsDom.waitForKey(element, 27);
	}
}