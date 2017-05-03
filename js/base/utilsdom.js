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
	"findParent": function(element, whereFunc){		
		while(element.parentElement){
			if(whereFunc(element.parentElement)){
				return element.parentElement;
			}
			element = element.parentElement;
		}
	},
	"setCurrentTheme": function(){
		var theme = back.getTheme();
		console.log("Setting theme: " + theme); 
		UtilsDom.setTheme({
			"--theme-accent-color": rootRule => {
				return back.getThemeAccentColor();
			},
			"--theme-accent-color-light": rootRule => {
				return UtilsDom.increaseBrightnessRule(rootRule, "--theme-accent-color", 50);
			}
		});
		UtilsDom.setTheme(theme);
	},
	"setTheme": function(themeToSet){
		var themeSheets = document.querySelectorAll("link[themesheet]");
		if(UtilsObject.isString(themeToSet)){
			var injectedThemeSheets = document.querySelectorAll("link[injected]");
			for(var injected of injectedThemeSheets){
				injected.parentElement.removeChild(injected);
			}				
		}
		if(!themeToSet){
			return;
		}
		var setThemeColors = function(rootRule, sheetName, themeToSet){
			if(UtilsObject.isString(themeToSet)){
				var sheetNode = rootRule.parentStyleSheet.ownerNode;
				var newNode = sheetNode.cloneNode(true);
				/*themeToSet = `_${themeToSet.toLowerCase()}.css`;
				newNode.href = newNode.href.replace(".css",themeToSet);	*/
				newNode.href = newNode.href = `/themes/${themeToSet.toLowerCase()}/${sheetName}.css`;
				newNode.setAttribute("injected","");
				sheetNode.parentNode.appendChild(newNode)	
			}else{	
				var text = "";
				for(var color in themeToSet){
					var colorToSet = null;
					var valueToSet = themeToSet[color];
					if(UtilsObject.isString(valueToSet)){
						colorToSet = valueToSet;
					}else if(UtilsObject.isFunction(valueToSet)){
						var result = valueToSet(rootRule);
						if(result){
							colorToSet = result;
						}
					}
					if(colorToSet){						
						rootRule.style.setProperty(color,colorToSet);
						//text += `${color}:${colorToSet};`;	
					}
				}
				//rootRule.style.cssText += text; 
			}
			/*fetch("/themes.json")
			.then(result=>result.json())
			.then(themes=>{
			console.log("Themes");
			console.log(themes);
			var theme = Array.prototype.find.call(themes.themes, theme=>theme.name == themeToSet);
			var colors = theme.colors[sheetName];
			var text = "";
			for(var color in colors){
				text += `${color}:${colors[color]};`;
			}
			rootRule.style.cssText += text; 
			});*/
		}
		console.log(`Found ${themeSheets.length} theme sheets`);

		//Workaround for when sometimes the sheets aren't immediately available on load
		var hasAll = true;
		for(var themeSheet of themeSheets){
			if(!themeSheet.sheet){
				hasAll = false;
				break;
			}
		}
		if(!hasAll){
			setTimeout(()=>UtilsDom.setTheme(themeToSet),1);
			return;
		}
		for(var themeSheet of themeSheets){
			console.log(themeSheet.sheet);
			var styleSheet = themeSheet.sheet;
			if(!styleSheet){
				continue;
			}
			console.log(styleSheet.href);
			var sheetName = styleSheet.href.substring(styleSheet.href.lastIndexOf("/")+1);
			sheetName = sheetName.substring(0,sheetName.lastIndexOf("."));
			var rootRule = Array.prototype.find.call(styleSheet.cssRules, cssRule=>cssRule instanceof CSSStyleRule && cssRule.selectorText.toLowerCase() == ":root");
			if(!rootRule){
				continue;
			}
			setThemeColors(rootRule, sheetName, themeToSet);
		}
	},
	"getInjectedCSSRule": function(ruleName) {
		ruleName = ruleName.toLowerCase();
		var result = null;
		var find = Array.prototype.find;

		find.call(document.styleSheets, styleSheet => {
			if(!styleSheet.ownerNode.isInjected){
				return false;
			}
			result = find.call(styleSheet.cssRules, cssRule => {
				return cssRule instanceof CSSStyleRule && cssRule.selectorText.toLowerCase() == ruleName;
			});
			return result != null;
		});
		return result;
	},
	"getSvgFromFile": function(imgURL){
		return fetch(imgURL)
		.then(function(response) {
			return response.text();
		})
		.then(function(text){
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(text, "text/xml");

			// Get the SVG tag, ignore the rest
			var svg = xmlDoc.getElementsByTagName('svg')[0];

			// Remove any invalid XML tags as per http://validator.w3.org
			svg.removeAttribute('xmlns:a');

			// Check if the viewport is set, if the viewport is not set the SVG wont't scale.
			if(!svg.getAttribute('viewBox') && svg.getAttribute('height') && svg.getAttribute('width')) {
				svg.setAttribute('viewBox', '0 0 ' + svg.getAttribute('height') + ' ' + svg.getAttribute('width'))
			}
			return svg;
		})
		.catch(e=>console.log(e));
	},
	"replaceAllSvgInline": function(assignmentFunc){
		document.querySelectorAll('img[src$=svg]').forEach(function(img){
			UtilsDom.replaceWithSvgInline(img,null,assignmentFunc);
		})
	},
	"replaceWithSvgInline": function(img, imgURL, assignmentFunc){
		if(!img.parentNode){
			return;
		}
		var imgID = img.id;
		var imgClass = img.className;
		if(!imgURL){
			imgURL = img.src;
		}
		return UtilsDom.getSvgFromFile(imgURL)
		.then(svg=>{
			if(!svg){
				return;
			}
			// Add replaced image's ID to the new SVG
			if(typeof imgID !== 'undefined') {
				svg.setAttribute('id', imgID);
			}
			// Add replaced image's classes to the new SVG
			if(typeof imgClass !== 'undefined') {
				svg.setAttribute('class', imgClass+' replaced-svg');
			}
			if(!img.parentNode){
				return;
			}
			if(img.onclick){
				svg.onclick = img.onclick;
			}
			if(assignmentFunc){
				assignmentFunc(img,svg);
			}
			// Replace image with new SVG
			img.parentNode.replaceChild(svg, img);
			return svg;
		});

	},
	"increaseBrightnessRule": function(rule, propertyName, percent){		
		var originalColor = rule.style.getPropertyValue(propertyName);
		if(!originalColor){
			return;
		}
		var newColor = UtilsDom.increaseBrightness(originalColor,percent);
		return newColor;
	},
	"increaseBrightness": function(hex, percent, darken){
		// strip the leading # if it's there
		hex = hex.replace(/^\s*#|\s*$/g, '');

		// convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
		if(hex.length == 3){
			hex = hex.replace(/(.)/g, '$1$1');
		}

		var r = parseInt(hex.substr(0, 2), 16),
			g = parseInt(hex.substr(2, 2), 16),
			b = parseInt(hex.substr(4, 2), 16);
		if(isNaN(r) || isNaN(g) || isNaN(b)){
			return;
		}
		var changeValue = null;
		if(darken){
			changeValue = value => ((0|(1>>8) + value + (256 - value) * percent / 100).toString(16)).substr(1);
		}else{
			changeValue = value => ((0|(1<<8) + value + (256 - value) * percent / 100).toString(16)).substr(1);
		}
		return '#' + changeValue(r) + changeValue(g) + changeValue(b);
	}
}
