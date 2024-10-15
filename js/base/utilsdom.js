var UtilsDom = {
	"getURLParameter": function (name, url) {
		if (!url) {
			url = window.location.href;
		}
		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url) || [, ""])[1].replace(/\+/g, '%20')) || null
	},
	"createElement": function (parent, tag, id, attributes, position) {
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
		if (position >= 0) {
			parent.insertBefore(el, parent.children[position]);
		} else {
			parent.appendChild(el);
		}
		return el;
	},
	"waitForKey": function (element, keyCode, funcEvent) {
		return new Promise(function (resolve, reject) {
			element.addEventListener("keydown", function (e) {
				var shouldResolve = e.keyCode == keyCode;
				if (shouldResolve && funcEvent) {
					shouldResolve = funcEvent(e);
				}
				if (shouldResolve) {
					e.preventDefault();
					resolve(element.value);
				}
			});
		});
	},
	"waitForEnterKey": function (inputElement) {
		return UtilsDom.waitForKey(inputElement, 13, function (e) {
			return !e.shiftKey;
		});
	},
	"waitForEscKey": function (element) {
		return UtilsDom.waitForKey(element, 27);
	},
	"hideElement": function (element) {
		element.style.display = "none";
	},
	"setElementDisplay": function (element, display) {
		element.style.display = display;
	},
	"pickFile": async function (fileInputElement) {
		var promise = new Promise(function (resolve, reject) {
			if (!fileInputElement) reject("pickFile: No file input element")
			fileInputElement.oncancel = function () {
				console.log("Pick files cancelled")
				reject("User cancelled");
			}
			fileInputElement.onchange = function () {
				const files = fileInputElement.files;
				console.log("Picked files", files)
				resolve(files);
			}
			try {
				fileInputElement.click();
			}
			catch (e) {
				reject(e);
			}
		})
		return await promise;
	},
	"readPickedFile": function (file) {
		return new Promise((resolve, reject) => {
			if (!file) {
				return UtilsObject.errorPromise("No file to read");
			}
			var fr = new FileReader();
			fr.onload = function () {
				resolve(fr.result);
			}
			fr.readAsDataURL(file);
		});
	},
	"onClickAndLongClick": function (element, onclick, onlongclick) {
		element.onmousedown = eDown => {
			var long = true;
			var short = true;
			setTimeout(() => {
				short = false;
				if (long) {
					onlongclick(eDown);
				}
			}, 500);
			element.onmouseup = eUp => {
				element.onmouseup = null;
				long = false;
				if (short) {
					onclick(eUp);
				}
			}
		}
	},
	"findParent": function (element, whereFunc) {
		while (element.parentElement) {
			if (whereFunc(element.parentElement)) {
				return element.parentElement;
			}
			element = element.parentElement;
		}
	},
	"setGeneratedColors": async function (theme) {
		var accentColor = theme ? theme["--theme-accent-color"] : null;
		if (!accentColor) {
			accentColor = await back.getThemeAccentColor();
		}
		await UtilsDom.setTheme({
			"--theme-accent-color": rootRule => {
				return accentColor;
			}
		});
	},
	"setCurrentTheme": async function () {
		var theme = await back.getTheme();

		await UtilsDom.setTheme(theme);
	},
	"setTheme": async function (themeToSet) {
		var themeSheets = document.querySelectorAll("link[themesheet]");
		if (UtilsObject.isString(themeToSet)) {
			await UtilsDom.setGeneratedColors(themeToSet);
			console.log("Setting theme: " + themeToSet);
			var injectedThemeSheets = document.querySelectorAll("link[injected]");
			for (var injected of injectedThemeSheets) {
				injected.parentElement.removeChild(injected);
			}
			if (themeToSet == "random") {
				var items = ["black", "", "dark"];
				themeToSet = items[Math.floor(Math.random() * items.length)];
			} else if (themeToSet == "auto") {
				var hours = new Date().getHours();
				if (hours > 17 || hours < 10) {
					themeToSet = "dark";
				} else {
					themeToSet = "";
				}
			} else if (themeToSet == "normal") {
				themeToSet = "";
			}
		}
		if (!themeToSet) {
			return;
		}
		var setThemeColors = function (rootRule, sheetName, themeToSet) {
			if (UtilsObject.isString(themeToSet)) {
				var sheetNode = rootRule.parentStyleSheet.ownerNode;
				var newNode = sheetNode.cloneNode(true);
				/*themeToSet = `_${themeToSet.toLowerCase()}.css`;
				newNode.href = newNode.href.replace(".css",themeToSet);	*/
				newNode.href = newNode.href = `/themes/${themeToSet.toLowerCase()}/${sheetName}.css`;
				newNode.setAttribute("injected", "");
				sheetNode.parentNode.appendChild(newNode)
			} else {
				UtilsObject.applyProps(themeToSet, {
					"--theme-accent-color-light": rootRule => {
						return UtilsDom.increaseBrightnessRule(rootRule, "--theme-accent-color", 50);
					},
					"--theme-accent-color-dark": rootRule => {
						return UtilsDom.increaseBrightnessRule(rootRule, "--theme-accent-color", -20);
					}
				}, true);

				var text = "";
				for (var color in themeToSet) {
					var colorToSet = null;
					var valueToSet = themeToSet[color];
					if (UtilsObject.isString(valueToSet)) {
						colorToSet = valueToSet;
					} else if (UtilsObject.isFunction(valueToSet)) {
						var result = valueToSet(rootRule);
						if (result) {
							colorToSet = result;
						}
					}
					if (colorToSet) {
						rootRule.style.setProperty(color, colorToSet);
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
		for (var themeSheet of themeSheets) {
			if (!themeSheet.sheet) {
				hasAll = false;
				break;
			}
		}
		if (!hasAll) {
			setTimeout(async () => await UtilsDom.setTheme(themeToSet), 1);
			return;
		}
		for (var themeSheet of themeSheets) {
			console.log(themeSheet.sheet);
			var styleSheet = themeSheet.sheet;
			if (!styleSheet) {
				continue;
			}
			console.log(styleSheet.href);
			var sheetName = styleSheet.href.substring(styleSheet.href.lastIndexOf("/") + 1);
			sheetName = sheetName.substring(0, sheetName.lastIndexOf("."));
			var rootRule = Array.prototype.find.call(styleSheet.cssRules, cssRule => cssRule instanceof CSSStyleRule && cssRule.selectorText.toLowerCase() == ":root");
			if (!rootRule) {
				continue;
			}
			setThemeColors(rootRule, sheetName, themeToSet);
		}
	},
	"getInjectedCSSRule": function (ruleName) {
		ruleName = ruleName.toLowerCase();
		var result = null;
		var find = Array.prototype.find;

		find.call(document.styleSheets, styleSheet => {
			if (!styleSheet.ownerNode.isInjected) {
				return false;
			}
			result = find.call(styleSheet.cssRules, cssRule => {
				return cssRule instanceof CSSStyleRule && cssRule.selectorText.toLowerCase() == ruleName;
			});
			return result != null;
		});
		return result;
	},
	"getSvgFromFile": function (imgURL) {
		return fetch(imgURL)
			.then(function (response) {
				return response.text();
			})
			.then(function (text) {
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(text, "text/xml");

				// Get the SVG tag, ignore the rest
				var svg = xmlDoc.getElementsByTagName('svg')[0];

				// Remove any invalid XML tags as per http://validator.w3.org
				svg.removeAttribute('xmlns:a');

				// Check if the viewport is set, if the viewport is not set the SVG wont't scale.
				if (!svg.getAttribute('viewBox') && svg.getAttribute('height') && svg.getAttribute('width')) {
					svg.setAttribute('viewBox', '0 0 ' + svg.getAttribute('height') + ' ' + svg.getAttribute('width'))
				}
				return svg;
			})
			.catch(e => console.log(e));
	},
	"replaceElement": function (old, newElement) {
		old.parentNode.replaceChild(newElement, old);
	},
	"replaceAllSvgInline": function (assignmentFunc) {
		document.querySelectorAll('img[src$=svg]').forEach(function (img) {
			UtilsDom.replaceWithSvgInline(img, null, assignmentFunc);
		})
	},
	"replaceWithSvgInline": function (img, imgURL, assignmentFunc) {
		if (!img.parentNode) {
			return;
		}
		var imgID = img.id;
		var imgClass = img.className;
		if (!imgURL) {
			imgURL = img.src;
		}
		return UtilsDom.getSvgFromFile(imgURL)
			.then(svg => {
				if (!svg) {
					return;
				}
				// Add replaced image's ID to the new SVG
				if (typeof imgID !== 'undefined') {
					svg.setAttribute('id', imgID);
				}
				// Add replaced image's classes to the new SVG
				if (typeof imgClass !== 'undefined') {
					svg.setAttribute('class', imgClass + ' replaced-svg');
				}
				if (!img.parentNode) {
					return;
				}
				if (img.onclick) {
					svg.onclick = img.onclick;
				}
				if (assignmentFunc) {
					assignmentFunc(img, svg);
				}
				// Replace image with new SVG
				UtilsDom.replaceElement(img, svg);
				return svg;
			});

	},
	"increaseBrightnessRule": function (rule, propertyName, percent, darken) {
		var originalColor = rule.style.getPropertyValue(propertyName);
		if (!originalColor) {
			return;
		}
		var newColor = UtilsDom.shadeBlendConvert(percent / 100, originalColor);
		return newColor;
	},
	"shadeBlendConvert": function (p, from, to) {
		if (typeof (p) != "number" || p < -1 || p > 1 || typeof (from) != "string" || (from[0] != 'r' && from[0] != '#') || (typeof (to) != "string" && typeof (to) != "undefined")) return null; //ErrorCheck
		if (!UtilsDom.sbcRip) UtilsDom.sbcRip = function (d) {
			var l = d.length, RGB = new Object();
			if (l > 9) {
				d = d.split(",");
				if (d.length < 3 || d.length > 4) return null;//ErrorCheck
				RGB[0] = i(d[0].slice(4)), RGB[1] = i(d[1]), RGB[2] = i(d[2]), RGB[3] = d[3] ? parseFloat(d[3]) : -1;
			} else {
				if (l == 8 || l == 6 || l < 4) return null; //ErrorCheck
				if (l < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (l > 4 ? d[4] + "" + d[4] : ""); //3 digit
				d = i(d.slice(1), 16), RGB[0] = d >> 16 & 255, RGB[1] = d >> 8 & 255, RGB[2] = d & 255, RGB[3] = l == 9 || l == 5 ? r(((d >> 24 & 255) / 255) * 10000) / 10000 : -1;
			}
			return RGB;
		}
		var i = parseInt, r = Math.round, h = from.length > 9, h = typeof (to) == "string" ? to.length > 9 ? true : to == "c" ? !h : false : h, b = p < 0, p = b ? p * -1 : p, to = to && to != "c" ? to : b ? "#000000" : "#FFFFFF", f = UtilsDom.sbcRip(from), t = UtilsDom.sbcRip(to);
		if (!f || !t) return null; //ErrorCheck
		if (h) return "rgb(" + r((t[0] - f[0]) * p + f[0]) + "," + r((t[1] - f[1]) * p + f[1]) + "," + r((t[2] - f[2]) * p + f[2]) + (f[3] < 0 && t[3] < 0 ? ")" : "," + (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 10000) / 10000 : t[3] < 0 ? f[3] : t[3]) + ")");
		else return "#" + (0x100000000 + (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 255) : t[3] > -1 ? r(t[3] * 255) : f[3] > -1 ? r(f[3] * 255) : 255) * 0x1000000 + r((t[0] - f[0]) * p + f[0]) * 0x10000 + r((t[1] - f[1]) * p + f[1]) * 0x100 + r((t[2] - f[2]) * p + f[2])).toString(16).slice(f[3] > -1 || t[3] > -1 ? 1 : 3);
	}
}
