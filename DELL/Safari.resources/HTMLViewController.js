var pageArguments = {};

// Put all windows-specific logic in HTMLViewController in here.
var HTMLViewControllerWin = {
    getDefaultButton: function()
    {
        var submitButtons = document.querySelectorAll("button[type='submit'], input[type='submit']");
        for (var i = 0; i < submitButtons.length; ++i) {
            var computedStyle = window.getComputedStyle(submitButtons[i]);
            if (computedStyle.visibility !== "hidden" && computedStyle.display !== "none")
                return submitButtons[i];
        }
        return null;
    },

    onNonSubmitButtonFocused: function(event)
    {
        var defaultButton = HTMLViewControllerWin.getDefaultButton();
        if (!defaultButton)
            return;
            
        defaultButton.removeStyleClass("default");
    },

    onNonSubmitButtonBlurred: function(event)
    {
        var defaultButton = HTMLViewControllerWin.getDefaultButton();
        if (!defaultButton)
            return;

        defaultButton.addStyleClass("default");
    },

    setUpButtons: function()
    {
        var defaultButton = HTMLViewControllerWin.getDefaultButton();
        if (!defaultButton)
            return;
        
        // We want to keep the default button highlighted unless user has focused another button or link.
        defaultButton.addStyleClass("default");
        defaultButton.focus();
        
        // Set up focus and blur handlers on non-submit buttons and links so that when a non-submit button
        // is focused, it'll remove the default-button appearance on the default button (otherwise
        // we'll see two buttons focused at the same time).  When a non-submit button is blurred, it'll
        // add the default-button apperance back on the default button.
        var nonSubmitButtons = document.querySelectorAll("button[type='button'], button[type='reset'], input[type='button'], input[type='reset'], a");
        for (var i = 0; i < nonSubmitButtons.length; ++i) {
            nonSubmitButtons[i].addEventListener("focus", HTMLViewControllerWin.onNonSubmitButtonFocused);
            nonSubmitButtons[i].addEventListener("blur", HTMLViewControllerWin.onNonSubmitButtonBlurred);
        }
    },

    handleEnterKeyPressed: function(event)
    {
        // On Windows, if another button is focused, the default button no longer has the focus ring.
        if (event.target.tagName === "TEXTAREA")
            return;

        var defaultButton = HTMLViewControllerWin.getDefaultButton();
        if (!defaultButton)
            return;

        // If the submit button is the currently default button, user expects pressing the 
        // enter key would activate it.
        if (defaultButton.hasStyleClass("default")) {
            defaultButton.click();
            event.preventDefault();
        }
    },

    isVisibleButton: function(ele) 
    {
        if (ele.tagName !== "BUTTON" && ele.tagName !== "INPUT")
            return false;
        
        if (ele.type !== "button" && ele.type !== "submit" && ele.type !== "reset")
            return false;
            
        var computedStyle = window.getComputedStyle(ele);
        return computedStyle.visibility !== "hidden" && computedStyle.display !== "none";            
    },

    handleNavigationKeyPressed: function(event)
    {
        // Allow arrow keys to navigate focus between buttons under the same parent element.
        if (!HTMLViewControllerWin.isVisibleButton(event.target))
            return;            
        
        var backward = event.keyIdentifier === "Left" || event.keyIdentifier === "Up";
        e = backward ? event.target.previousSibling : event.target.nextSibling;
        while (e != null) {
            if (HTMLViewControllerWin.isVisibleButton(e)) {
                e.focus();
                return;
            }
            e = backward ? e.previousSibling : e.nextSibling;
        }
    },

    keyDown: function(event)
    {
        switch (event.keyIdentifier) {
            case "Enter":
                HTMLViewControllerWin.handleEnterKeyPressed(event);
                break;

            case "Left":
            case "Up":
            case "Right":
            case "Down": 
                HTMLViewControllerWin.handleNavigationKeyPressed(event);
                break;           
        }
    }
}

// Put all mac-specific logic in HTMLViewController in here.
var HTMLViewControllerMac = {
    trySubmit: function(button)
    {
        var computedStyle = window.getComputedStyle(button);
        // Don't use button.type here, since the default type for button is annoyingly "submit".
        // Check for an explicit type attribute value of "submit".
        if (button.getAttribute("type") !== "submit" || computedStyle.visibility === "hidden" || computedStyle.display === "none")
            return false;
        button.click();
        return true;
    },

    // On Mac, the submit button always has the default button look.
    keyDown: function(event)
    {
        if (event.target.tagName === "TEXTAREA" || event.keyIdentifier !== "Enter")
            return;

        var buttons = document.getElementsByTagName("button");
        for (var i = 0; i < buttons.length; ++i) {
            if (HTMLViewControllerMac.trySubmit(buttons[i])) {
                event.preventDefault();
                return;
            }
        }

        var inputButtons = document.getElementsByTagName("input");
        for (var i = 0; i < inputButtons.length; ++i) {
            if (HTMLViewControllerMac.trySubmit(inputButtons[i])) {
                event.preventDefault();
                return;
            }
        }
    }
}

var HTMLViewController = {
    setItemText: function(itemID, value)
    {
        var ele = document.getElementById(itemID);
        if (ele.tagName == "INPUT" || ele.tagName == "SELECT" || ele.tagName == "TEXTAREA")
            ele.value = value;
        else
            ele.innerText = value;
    },
    
    itemText: function(itemID)
    {
        var ele = document.getElementById(itemID);
        if (ele.tagName == "INPUT" || ele.tagName == "SELECT" || ele.tagName == "TEXTAREA")
            return ele.value;
        else if (ele.firstChild)
            return ele.firstChild.data;
        else return "";
    },

    setItemChecked: function(itemID, value)
    {
        document.getElementById(itemID).checked = value;
    },
    
    itemChecked: function(itemID)
    {
        return document.getElementById(itemID).checked;
    },
    
    setItemEnabled: function(itemID, value)
    {
        var item = document.getElementById(itemID);
        item.disabled = !value;
        if (item.parentElement.tagName == "LABEL") {
            if (value)
                item.parentElement.removeStyleClass("disabled");
            else
                item.parentElement.addStyleClass("disabled");
        }
    },
    
    insertOptionInSelect: function(selectID, position, label, value)
    {
        var select = document.getElementById(selectID);
        var option = document.createElement("option");
        option.appendChild(document.createTextNode(label));
        option.value = value;
        select.add(option, select.options[position]);
    },

    appendToSelect: function(itemID, label, itemValue, itemStyle)
    {
        var selectEle = document.getElementById(itemID);
        var o;
        if (label == "")
            o = document.createElement("hr");
        else {
            o = document.createElement("option");
            o.appendChild(document.createTextNode(label));
            o.value = itemValue ? itemValue : selectEle.length;
            o.style.cssText = itemStyle;
        }
        selectEle.add(o, null);        
    },
    
    setSelectIndex: function(itemID, index)
    {
        var selectEle = document.getElementById(itemID);
        selectEle.selectedIndex = index;
    },

    setOptionEnabled: function(selectID, optionIndex, enabled)
    {
        document.getElementById(selectID)[optionIndex].disabled = !enabled;
    },

    indexOfItemWithValue: function(selectID, value)
    {
        var select = document.getElementById(selectID);
        for (var i = 0; i < select.options.length; ++i) {
            if (select.options[i].value == value)
                return i;
        }
        return -1;
    },
    
    clearSelect: function(itemID)
    {
        var selectEle = document.getElementById(itemID);
        selectEle.removeChildren();
    },
    
    setWidth: function(width)
    {
        window.resizeTo(width);
    },
    
    htmlOffsetHeight: function()
    {
        return document.getElementsByTagName("html")[0].offsetHeight;
    },
    
    addClass: function(itemID, itemClass)
    {
        document.getElementById(itemID).addStyleClass(itemClass);
    },
    
    removeClass: function(itemID, itemClass)
    {
        document.getElementById(itemID).removeStyleClass(itemClass);
    },
    
    setAttribute: function(itemID, attrName, attrValue)
    {
        document.getElementById(itemID).setAttribute(attrName, attrValue);
    },
    
    setTitle: function(newTitle)
    {
        document.title = newTitle;
    },
    
    focusItem: function(itemID)
    {
        var ele = document.getElementById(itemID);
        ele.focus();
        ele.selectionStart = 0;
        ele.selectionEnd = ele.value.length;
    },

    contextMenu: function(event)
    {
        if (event.target.tagName === "TEXTAREA")
            return;

        if (event.target.tagName === "INPUT" && (event.target.type === "password" || event.target.type === "text" || event.target.type == "search"))
            return;

        event.preventDefault();
    },

    pageLoaded: function()
    {
        var query = document.location.search;
        if (query) {
            query = query.substr(1);
            args = query.split("&");
            for (var i = 0; i < args.length; i++) {
                var nameValue = args[i].split("=");
                pageArguments[nameValue[0]] = nameValue[1];
            }
        }
        
        if (isMac())
            document.body.addEventListener("keydown", HTMLViewControllerMac.keyDown);
        else {
            HTMLViewControllerWin.setUpButtons();
            document.body.addEventListener("keydown", HTMLViewControllerWin.keyDown);
        }
        document.addEventListener("contextmenu", HTMLViewController.contextMenu);
        
        var hideList;
        if (navigator.platform == "Win32")
            hideList = document.getElementsByClassName("mac");
        else
            hideList = document.getElementsByClassName("windows");
        
        for (var i = 0; i < hideList.length; i++)
            hideList[i].style.display = "none";
            
        HTMLViewController.localize();
    },
    
    UIString: function(string)
    {
        if (window.localizedStrings && string in window.localizedStrings)
            string = window.localizedStrings[string];
        else {
            console.error("Localized string \"" + string + "\" not found.");
            string = "LOCALIZED STRING NOT FOUND";
        }
        return string;
    },

    loadLocalizedStrings: function(controller)
    {
        var localizedStringsURL;
        if (controller.localizedStringsURL)
            localizedStringsURL = controller.localizedStringsURL;
        if (!localizedStringsURL && pageArguments["lang"])
            localizedStringsURL = pageArguments["lang"] + ".lproj/localizedStrings.js";
        if (!localizedStringsURL) {
            localizedStringsURL = "English.lproj/localizedStrings.js";
            console.error("Localized strings file path not provided.");
        }
        document.write("<script type='text/javascript' charset='utf-8' src='" + localizedStringsURL + "'></" + "script>");
    },
    
    localize: function()
    {
        var elements = document.getElementsByClassName("l12n");
        for (var i = 0; i < elements.length; ++i)
            elements[i].firstChild.data = HTMLViewController.UIString(elements[i].firstChild.data);
        var toolTipElements = document.getElementsByClassName("l12n-tooltip");
        for (var i = 0; i < toolTipElements.length; ++i)
            toolTipElements[i].title = HTMLViewController.UIString(toolTipElements[i].title);
    }
}
