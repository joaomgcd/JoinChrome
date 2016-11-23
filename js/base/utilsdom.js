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
	},
	"hideElement": function(element){
		element.style.display = "none";
	},
	"setElementDisplay": function(element,display){
		element.style.display = display;
	},
	"pickFile": function(){
		if(!back.UtilsDom.fileInput){
			return back.UtilsObject.errorPromise("No file input. Please set UtilsDom.fileInput to the file input element.");
		}
	    var fileInputListener = null;
	     //check if the popup closes before the user is able to select the file
	    var promise = new Promise(function(resolve,reject){
	        fileInputListener = {
	            "onPopupUnloaded":function(){
	                return reject();
	            },
	            "onFilePicked":function(filePickedEvent){
	                return resolve(filePickedEvent.files);
	            }
	        }
	        back.eventBus.register(fileInputListener);
	    })
	    /*.catch(function(){
	        alert("Seems that the Join popup was closed by your system before you selected the file, which will make file sending not work.\n\nPlease popout the window using the popout button inside the Join popup and try again.");        
	    })*/
	    .then(function(){
	        if(fileInputListener){
	            back.eventBus.unregister(fileInputListener);
	        }
	    });
	    if(!back.UtilsDom.fileInput.onchange){	    
		    back.UtilsDom.fileInput.onchange = function(){
				back.eventBus.post(new back.Events.FilePicked(back.UtilsDom.fileInput.files));
			}	
	    }
		back.UtilsDom.fileInput.click();
		return promise;
	},
	"readPickedFile": function(file){
		return new Promise((resolve,reject) => {
			if(!file){
				return UtilsObject.errorPromise("No file to read");
			}
			var fr = new FileReader();
	        fr.onload = function () {
	            resolve(fr.result);
	        }
	        fr.readAsDataURL(file);
		});
	},
	"onClickAndLongClick": function(element, onclick, onlongclick){
		element.onmousedown = eDown=>{
			var long = true;
			var short = true;
			setTimeout(()=>{
				short = false;
				if(long){
					onlongclick(eDown);
				}
			},500);
			element.onmouseup = eUp => {
				element.onmouseup = null;
				long = false;
				if(short){
					onclick(eUp);
				}
			}
		}
	},
}
