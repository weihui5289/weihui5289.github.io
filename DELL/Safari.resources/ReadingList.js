/*
 * Copyright © 2010, 2011 Apple Inc. All rights reserved.
 */

// FIXME: Reader.js has several general-purpose functions that we'll probably end up wanting here.
// We should extract those into a common JS file so we don't duplicate the code.

// These Element prototype additions are copied from Web Inspector's utilities.js file in WebCore.
Element.prototype.removeStyleClass = function(className) 
{
    if (this.className === className) {
        this.className = "";
        return;
    }
    
    var index = this.className.indexOf(className);
    if (index === -1)
        return;
    
    this.className = this.className.split(" ").filter(function(s) { return s && s !== className; } ).join(" ");
}

Element.prototype.removeMatchingStyleClasses = function(classNameRegex)
{
    var regex = new RegExp("(^|\\s+)" + classNameRegex + "($|\\s+)");
    if (regex.test(this.className))
        this.className = this.className.replace(regex, " ");
}

Element.prototype.addStyleClass = function(className) 
{
    if (className && !this.hasStyleClass(className))
        this.className += (this.className.length ? " " + className : className);
}

Element.prototype.hasStyleClass = function(className) 
{
    if (!className)
        return false;
    // Test for the simple case
    if (this.className === className)
        return true;
    
    var index = this.className.indexOf(className);
    if (index === -1)
        return false;
    var toTest = " " + this.className + " ";
    return toTest.indexOf(" " + className + " ", index) !== -1;
}

Function.prototype.bind = function(thisObject)
{
    var func = this;
    var args = Array.prototype.slice.call(arguments, 1);
    return function() { return func.apply(thisObject, args.concat(Array.prototype.slice.call(arguments, 0))) };
}

ReadingListItem = function(dictionary) {
    this.createListItemElement();
    this.updateWithDictionary(dictionary);
    return this;
}

ReadingListItem.prototype = {
    updateWithDictionary: function updateWithDictionary(dictionary)
    {
        this._UUID = dictionary["UUID"];
        this._URL = dictionary["URLString"];
        this._title = dictionary["Title"];
        this._previewText = dictionary["PreviewText"];
        this._isRead = !dictionary["IsUnread"];
        this._isPreviouslyRead = false;
        this._hasBeenFetched = dictionary["ReadingListHasBeenFetched"];
        this._siteIconResourceVersion = dictionary["SiteIconResourceVersion"];
        
        if (!this._hasBeenFetched) {
            // No attempt has yet been made to fetch the previewText, etc. Don't display anything in the UI.
            this._previewText = "";
        } else if (!this._previewText) {
            // An attempt has already been made, but not previewText could be found. Use a placeholder string.
            this._previewText = getLocalizedString("No preview available");
        }
        
        // Extract the domain name from the URL, remove any 'www.' prefix, and prepend it to the preview text.
        var domainName = this._URL ? this._URL.split(/\/+/g)[1] : undefined;
        if (domainName)
            this._domainName = domainName.replace(/^www\./, "");
        
        this.updateListItemElement();
    },
    
    UUID: function UUID()
    {
        return this._UUID;
    },
    
    title: function title()
    {
        return this._title;
    },
    
    URL: function URL()
    {
        return this._URL;
    },
    
    previewText: function previewText()
    {
        return this._previewText;
    },

    domainName: function domainName()
    {
        return this._domainName;
    },
    
    isRead: function isRead()
    {
        return this._isRead;
    },
    
    isPreviouslyRead: function isPreviouslyRead()
    {
        return this._isPreviouslyRead;
    },
    
    setPreviouslyRead: function setPreviouslyRead(newValue)
    {
        this._isPreviouslyRead = newValue;
        
        if (this._isPreviouslyRead)
            this.listItemElement().addStyleClass("previously-read");
        else
            this.listItemElement().removeStyleClass("previously-read");
    },
    
    listItemElement: function listItemElement()
    {
        if (!this._listItemElement)
            this._listItemElement = this.createListItemElement();
        
        return this._listItemElement;
    },

    createListItemElement: function createListItemElement()
    {
        this._genericIconElement = document.createElement("img");
        this._genericIconElement.className = "icon generic";

        this._iconMaskElement = document.createElement("div");
        this._iconMaskElement.className = "icon-mask";
        this._iconMaskElement.appendChild(this._genericIconElement);

        this._iconShadowElement = document.createElement("div");
        this._iconShadowElement.className = "icon-shadow";
        this._iconShadowElement.appendChild(this._iconMaskElement);

        this._titleElement = document.createElement("span");

        // The domain element needs to be an anchor so it will remain visible when the title wraps and overflows.
        this._domainElement = document.createElement("a");
        this._domainElement.className = "domain";
        this._domainElement.href = "javascript:";

        this._titleContainerElement = document.createElement("div");
        this._titleContainerElement.className = "title";
        this._titleContainerElement.appendChild(this._titleElement);
        this._titleContainerElement.appendChild(this._domainElement);

        this._deleteButtonElement = document.createElement("button");
        this._deleteButtonElement.className = "delete";
        this._deleteButtonElement.setAttribute("onclick", "arguments[0].stopPropagation(); ReadingListJS.deleteItem(this.parentElement);");
        this._deleteButtonElement.setAttribute("aria-label", "Delete");
        
        this._deleteButtonDeadZoneElement = document.createElement("div");
        this._deleteButtonDeadZoneElement.className = "delete-button-dead-zone";
        this._deleteButtonDeadZoneElement.setAttribute("onclick", "arguments[0].stopPropagation();");
        
        this._titleDeleteButtonContainerElement = document.createElement("div");
        this._titleDeleteButtonContainerElement.className = "title-delete-button-container"
        this._titleDeleteButtonContainerElement.appendChild(this._deleteButtonDeadZoneElement);
        this._titleDeleteButtonContainerElement.appendChild(this._titleContainerElement);

        this._previewElement = document.createElement("div");
        this._previewElement.className = "preview";
        
        this._listItemElement = document.createElement("li");
        this._listItemElement.item = this;
        this._listItemElement.setAttribute("onclick", "ReadingListJS.clickedItem(this);");
        this._listItemElement.setAttribute("role", "group");

        this._listItemElement.appendChild(this._iconShadowElement);
        this._listItemElement.appendChild(this._titleDeleteButtonContainerElement);
        this._listItemElement.appendChild(this._previewElement);
        this._listItemElement.appendChild(this._deleteButtonElement);
        
        return this._listItemElement;        
    },

    updateListItemElement: function updateListItemElement()
    {
        if (!this._listItemElement)
            this._listItemElement = this.createListItemElement();

        this._loadingIcon = new Image();
        this._loadingIcon.addEventListener("error", this.iconLoadDidFail.bind(this, this._loadingIcon), false);
        this._loadingIcon.addEventListener("load", this.iconLoadDidFinish.bind(this, this._loadingIcon), false);
        // We don't know what size icon will actually be used when the icon is shown, so we
        // optimistically assume it's the same size we would use if it were shown right now.
        this._loadingIcon.src = this.siteIconResourceURL(window.devicePixelRatio >= 2 ? 64 : 32);

        this._listItemElement.insertBefore(this._iconShadowElement, this._listItemElement.firstChild);

        this._titleElement.textContent = this.title();
        this._previewElement.textContent = this.previewText();
        this._listItemElement.setAttribute("UUID", this.UUID());
        this._listItemElement.setAttribute("aria-label", this.title());
        this._listItemElement.addStyleClass(this.isRead() ? "read" : "unread");
        this._listItemElement.removeStyleClass(this.isRead() ? "unread" : "read");

        this.updateListItemTitleLayout();
    },

    updateListItemTitleLayout: function updateListItemTitleLayout()
    {
        this._titleContainerElement.removeStyleClass("single-line-headline");
        this._domainElement.textContent = " — " + this.domainName();

        if (this._titleElement.offsetHeight > 16)
            return;

        this._titleContainerElement.addStyleClass("single-line-headline");
        this._domainElement.textContent = this.domainName();
    },
    
    siteIconResourceURL: function siteIconResourceURL(sideLength)
    {
        return "safari-site-icon:/" + encodeURIComponent(this.URL()) + "/" + sideLength + "x" + sideLength + "?version=" + this._siteIconResourceVersion;
    },

    iconLoadDidFail: function iconLoadDidFail(icon)
    {
        if (icon !== this._loadingIcon)
            return;

        // The passed-in icon might be either low-res or hi-res. We assume here that the lack of a
        // low-res icon implies the lack of a hi-res icon, and vice-versa.

        this._iconShadowElement.addStyleClass("generic");
    },

    iconLoadDidFinish: function iconLoadDidFinish(icon)
    {
        if (icon !== this._loadingIcon)
            return;

        // The passed-in icon might be either low-res or hi-res. We assume here that the presence of
        // a low-res icon implies the presence of a hi-res icon, and vice-versa.

        var lowResImage = document.createElement("img");
        lowResImage.className = "icon low-res";
        lowResImage.src = this.siteIconResourceURL(32);

        var hiResImage = document.createElement("img");
        hiResImage.className = "icon hi-res";
        hiResImage.src = this.siteIconResourceURL(64);

        while (this._iconMaskElement.firstChild)
            this._iconMaskElement.removeChild(this._iconMaskElement.firstChild);

        this._iconMaskElement.appendChild(lowResImage);
        this._iconMaskElement.appendChild(hiResImage);
        this._iconMaskElement.appendChild(this._genericIconElement);

        this._iconShadowElement.removeStyleClass("generic");
    },
}

ReadingListController = function() {
    this._readingListItems = [];
    this._URLsToReadingListItems = {};
    this._UUIDsToReadingListItems = {};
    this._UUIDsOfPreviouslyReadItems = {};
    this._previouslyReadItemsNeedsUpdate = true;
    this._sidebarSetupIsComplete = false;
    this.showingAll = false;
}

ReadingListController.prototype = {
    loaded: function loaded()
    {
        // Provide text for the elements that needs localized content.
        this.localizeContent();

        // The sidebar has already been installed by the time we get the loaded() message, but we want to do that same work now.
        this.willInstallReadingListSidebar();

        window.addEventListener("resize", this.updateReadingListItemsTitleLayout.bind(this), false);

        // Resize both buttons to be the same width, doing it here lets it work when localized.
        var showAllButton = this.showAllButton();
        var showUnreadButton = this.showUnreadButton();
        var maxWidth = Math.max(showAllButton.offsetWidth, showUnreadButton.offsetWidth);
        showAllButton.style.width = maxWidth + "px";
        showUnreadButton.style.width = maxWidth + "px";
        

        this.showingAll = ReadingListJSController.isShowingAllItems();
        if (this.showingAll) {
            showAllButton.addStyleClass("selected");
            showUnreadButton.removeStyleClass("selected");
        } else {
            showUnreadButton.addStyleClass("selected");
            showAllButton.removeStyleClass("selected");
        }
    },

    localizeContent: function localizeContent()
    {
        // The localized strings for the title bar buttons are also needed on the .cpp side to measure the appropriate width of the Reading List page
        document.getElementById("clear-button").textContent = getLocalizedStringFromLocalizableStrings("Clear All");
        this.showAllButton().textContent = getLocalizedStringFromLocalizableStrings("All (Reading List)");
        this.showUnreadButton().textContent = getLocalizedStringFromLocalizableStrings("Unread");
        document.getElementById("add-page-button").textContent = getLocalizedStringFromLocalizableStrings("Add Page");
        
        document.getElementById("explanatory-text-purpose").textContent = getLocalizedString("Reading List helps you collect webpages and links for you to read later.");
        document.getElementById("explanatory-text-adding-items-pt-1").textContent = getLocalizedString("To add the current page to your Reading List, click Add Page. You can also ");
        document.getElementById("explanatory-text-click-modifier").textContent = getLocalizedString("Shift-click");
        document.getElementById("explanatory-text-adding-items-pt-2").textContent = getLocalizedString(" a link to quickly add it to the list.");
        document.getElementById("explanatory-text-hiding-list").textContent = getLocalizedString("To hide and show Reading List, click the Reading List icon (eyeglasses) in the bookmarks bar.");
    },

    didInstallReadingListSidebar: function didInstallReadingListSidebar()
    {
        this._sidebarSetupIsComplete = true;
    },
    
    willInstallReadingListSidebar: function willInstallReadingListSidebar()
    {
        this._previouslyReadItemsNeedsUpdate = true;
        ReadingListJSController.requestReadingListItemsUpdate();
        ReadingListJSController.requestExpectedOrCurrentBrowserURLUpdate();
    },
    
    didUninstallReadingListSidebar: function didUninstallReadingListSidebar()
    {
        if (!this.showingAll)
            this.hideReadItems();
    },

    showAllButton: function showAllButton()
    {
        return document.getElementById("show-all-button");
    },
    
    showUnreadButton: function showUnreadButton()
    {
        return document.getElementById("show-unread-button");
    },

    showAll: function showAll()
    {
        if (this.showingAll)
            return;

        this.showingAll = true;

        this.showAllButton().addStyleClass("selected");
        this.showUnreadButton().removeStyleClass("selected");
        ReadingListJSController.setIsShowingAllItems(this.showingAll);

        var itemsToShow = {};
        for (var i = 0; i < this._readingListItems.length; ++i) {
            var item = this._readingListItems[i];
            if (item.listItemElement().hasStyleClass("hidden"))
                itemsToShow[item.UUID()] = item;
        }

        this.addTransitionsForItems(itemsToShow, {}, true);
    },

    showUnread: function showUnread()
    {
        if (!this.showingAll)
            return;

        this.showingAll = false;

        this.showAllButton().removeStyleClass("selected");
        this.showUnreadButton().addStyleClass("selected");
        ReadingListJSController.setIsShowingAllItems(this.showingAll);
        this.hideReadItemsWithAnimation();
    },

    hideReadItemsWithAnimation: function hideReadItemsWithAnimation()
    {
        if (!this.showUnreadButton().hasStyleClass("selected"))
            return;

        var itemsToHide = {};
        for (var i = 0; i < this._readingListItems.length; ++i) {
            var item = this._readingListItems[i];
            if (item.isRead() && !item.listItemElement().hasStyleClass("selected"))
                itemsToHide[item.UUID()] = item;
        }

        this.addTransitionsForItems({}, itemsToHide, true);
    },

    hideReadItems: function hideReadItems()
    {
        for (var i = 0; i < this._readingListItems.length; ++i) {
            var item = this._readingListItems[i];
            if (item.isRead() && !item.listItemElement().hasStyleClass("selected"))
                item.listItemElement().addStyleClass("hidden");
        }
    },

    addTransitionsForItems : function addTransitionsForItems(itemsComingIn, itemsGoingAway, keepNodeWhenGone)
    {
        // Animate the arrival of newly created items.
        for (var uuid in itemsComingIn) {
            var element = itemsComingIn[uuid].listItemElement();

            function startFade(e) {
                e.addStyleClass("incoming");
                e.removeStyleClass("pre-incoming");
            }

            function didFinishFade(e) {
                e.removeStyleClass("incoming");
            }
            
            (function(e) {
                e.addStyleClass("pre-incoming");
                e.removeStyleClass("hidden");
                setTimeout(function() { startFade(e) }, 0);
                setTimeout(function() { didFinishFade(e) }, 250);
            })(element);
        }

        // Animate the removal of the items that are going away.
        for (var uuid in itemsGoingAway) {
            var elementToRemove = itemsGoingAway[uuid].listItemElement();            

            function didFinishFadeOut(e) {
                e.removeStyleClass("outgoing");

                if (keepNodeWhenGone)
                    e.addStyleClass("hidden");
                else
                    e.parentElement.removeChild(e);
            }

            (function(e) {
                e.addStyleClass("outgoing");
                setTimeout(function() { didFinishFadeOut(e) }, 250);
            })(elementToRemove);
        }
    },
    
    updateReadingListItems: function updateReadingListItems(items)
    {
        var existingItemsByUUID = this._UUIDsToReadingListItems;

        var newlyCreatedItemsByUUID = {};
        var itemsToRemoveByUUID = {};
        
        // Make the itemsToRemoveByUUID object a shallow copy of the existingItemsByUUID.
        // As we iterate through 'items', we'll remove any matches we find, which will leave
        // only items that were removed in itemsToRemoveByUUID.
        for (var uuid in existingItemsByUUID) {
            itemsToRemoveByUUID[uuid] = existingItemsByUUID[uuid];
        }
        
        this._readingListItems = [];
        this._URLsToReadingListItems = {};
        this._UUIDsToReadingListItems = {};

        var listElement = readingListElement();
        var previousItemElement = null;

        for (var i = 0; i < items.length; ++i) {
            var dictionary = items[i];
            var uuid = dictionary["UUID"];
            
            var item;
            var existingItem = existingItemsByUUID[uuid];
            if (existingItem) {
                item = existingItem;
                item.updateWithDictionary(dictionary);
            } else {
                item = new ReadingListItem(dictionary);
                newlyCreatedItemsByUUID[uuid] = item;
                
                // Add the newly-created item to the DOM immediately after the previousItemElement, where possible.
                // Handle the special cases of adding an item to the front or very back.
                var elementToInsert = item.listItemElement();
                if (!previousItemElement) {
                    var elementToInsertBefore = listElement.firstElementChild;
                    listElement.insertBefore(elementToInsert, elementToInsertBefore);
                } else {
                    var elementToInsertBefore = previousItemElement.nextElementSibling;
                    if (elementToInsertBefore)
                        listElement.insertBefore(elementToInsert, elementToInsertBefore);
                    else
                        listElement.appendChild(elementToInsert);
                }
            }
            
            // The item with the UUID still exists, so remove it from our itemsToRemoveByUUID map.
            delete itemsToRemoveByUUID[uuid];
            
            this._URLsToReadingListItems[item.URL()] = item;
            this._UUIDsToReadingListItems[uuid] = item;
            this._readingListItems.push(item);
            
            previousItemElement = item.listItemElement();
        }

        if (!this._sidebarSetupIsComplete && !this.showingAll)
            this.hideReadItems();

        if (this._sidebarSetupIsComplete)
            this.addTransitionsForItems(newlyCreatedItemsByUUID, itemsToRemoveByUUID);

        if (this._previouslyReadItemsNeedsUpdate) {
            this.updatePreviouslyReadItems();
            this._previouslyReadItemsNeedsUpdate = false;
        }

        // If there are no entries in the Reading List, show the explanatory text,
        // and remove the Clear All and Segmented All|Unread control.
        if (this._readingListItems.length === 0)
            document.body.addStyleClass("empty-list");
        else
            document.body.removeStyleClass("empty-list");
    },

    updateReadingListItemsTitleLayout: function updateReadingListItemsTitleLayout()
    {
        for (var i = 0; i < this._readingListItems.length; ++i)
            this._readingListItems[i].updateListItemTitleLayout();
    },

    updatePreviouslyReadItems: function updatePreviouslyReadItems()
    {
        this._UUIDsOfPreviouslyReadItems = {};
        
        for (var i = 0; i < this._readingListItems.length; ++i) {
            var item = this._readingListItems[i];
            var isPreviouslyRead = item.isRead();
            if (isPreviouslyRead)
                this._UUIDsOfPreviouslyReadItems[item.UUID()] = true;

            // Update the actual item, which will also cause the listItemElement() to be updated.
            item.setPreviouslyRead(isPreviouslyRead);
        }
    },
    
    isItemPreviouslyRead: function isItemPreviouslyRead(item)
    {
        if (item && this._UUIDsOfPreviouslyReadItems[item.UUID()])
            return true;
        return false;
    },

    readingListItemForURL: function readingListItemForURL(url)
    {
        return this._URLsToReadingListItems[url];
    },
    
    readingListItemForElement: function readingListItemForElement(element)
    {
        return element ? element.item : null;
    },
    
    clickedItem: function clickedItem(element)
    {
        if (element === this.selectedElement())
            return;
        
        var readingListItem = this.readingListItemForElement(element);
        if (!readingListItem)
            return;
        
        // FIXME: Eventually, we may want to look for modifier keys here and include them
        // in the message ultimately sent to the UI process so it can properly handle them.
        this.selectReadingListItem(readingListItem);
        ReadingListJSController.navigateToReadingListItem(readingListItem.UUID());
    },
    
    deleteItem: function deleteItem(element)
    {
        var readingListItem = this.readingListItemForElement(element);
        if (!readingListItem)
            return;

        // If the element being removed is the selected element, first clear the selection.
        // This keeps the 'Add Page' button's state updated correctly.
        if (element === this.selectedElement())
            this.selectReadingListItem(null);
        
        // Immediately apply the 'outoing' CSS style to the element, which will animate it out from the UI.
        element.addStyleClass("outgoing");
        
        // FIXME: If you try to delete many items in a row, it's possible that you'll send multiple
        // removal messages before the latest "update" has come back. We'll probably need a way to
        // ignore updates that we know are out-of-date by the time we get them.
        ReadingListJSController.removeReadingListItem(readingListItem.UUID());
    },
    
    updateSelection: function updateSelection()
    {
        var readingListItem = this.readingListItemForURL(this._browserExpectedOrCurrentURL);
        this.selectReadingListItem(readingListItem);
    },
    
    selectedElement: function selectedElement()
    {
        return document.querySelector("li.selected");
    },
    
    selectReadingListItem: function selectReadingListItem(newSelectedItem)
    {
        var newSelectedElement = newSelectedItem ? newSelectedItem.listItemElement() : null;
        var oldSelectedElement = this.selectedElement();
        if (oldSelectedElement === newSelectedElement)
            return;
        
        if (oldSelectedElement)
            oldSelectedElement.removeStyleClass("selected");
        
        if (!newSelectedElement) {
            this.updateAddPageButton();
            return;
        }
        
        newSelectedElement.addStyleClass("selected");
        this.updateAddPageButton();
    },
    
    nextReadingListItemElement: function nextReadingListItemElement()
    {
        var nextElement = undefined;
        var selectedElement = this.selectedElement();

        // If nothing is selected, return the first in the list.
        if (!selectedElement) {
            if (this.showingAll)
                nextElement = document.querySelector("li");
            else
                nextElement = document.querySelector("li.unread");
        } else {
            nextElement = selectedElement.nextElementSibling;
            if (!this.showingAll) {
                // If the list view is toggled to show unread items, we could still be showing read items
                // because they're not hidden away until certain user actions trigger the hiding. 
                // (e.g. toggling [All|Unread] or switching windows).  Only skip over hidden items.
                while (nextElement && nextElement.hasStyleClass("hidden"))
                    nextElement = nextElement.nextElementSibling;
            }
        }
        return nextElement;
    },

    previousReadingListItemElement: function previousReadingListItemElement()
    {
        var previousElement = undefined;
        var selectedElement = this.selectedElement();
        
        // If nothing is selected, return the last in the list.
        if (!selectedElement) {
            if (this.showingAll)
                previousElement = document.querySelector("li:last-child");
            else
                previousElement = document.querySelector("li:last-child.unread");
        } else {
            previousElement = selectedElement.previousElementSibling;
            if (!this.showingAll) {
                // If the list view is toggled to show unread items, we could still be showing read items
                // because they're not hidden away until certain user actions trigger the hiding. 
                // (e.g. toggling [All|Unread] or switching windows).  Only skip over hidden items.
                while (previousElement && previousElement.hasStyleClass("hidden"))
                    previousElement = previousElement.previousElementSibling;
            }
        }
        return previousElement;
    },
    
    selectNextReadingListItem: function selectNextReadingListItem()
    {
        var nextItem = this.nextReadingListItemElement();
        nextItem.scrollIntoViewIfNeeded(false); // Passing false means the element is just scrolled into visibility but not centered.
        this.clickedItem(nextItem);
    },

    selectPreviousReadingListItem: function selectPreviousReadingListItem()
    {
        var previousItem = this.previousReadingListItemElement();
        previousItem.scrollIntoViewIfNeeded(false); // Passing false means the element is just scrolled into visibility but not centered.
        this.clickedItem(previousItem);
    },
    
    updateAddPageButton: function updateAddPageButton()
    {
        var httpFamilyURL = RegExp("^http:|^https:").test(this._browserExpectedOrCurrentURL);
        var emptySelection = this.selectedElement() === null;

        var addPageButton = document.getElementById("add-page-button");

        if (httpFamilyURL && emptySelection)
            addPageButton.disabled = false;
        else
            addPageButton.disabled = true;
    },

    updateExpectedOrCurrentBrowserURL: function updateExpectedOrCurrentBrowserURL(url)
    {
        // FIXME: Selection is currently based entirely on this "current or expected" URL of the associated browser view.
        // This is likely to have issues with links that redirect, etc, so more elaborate logic will eventually be needed.
        this._browserExpectedOrCurrentURL = url;

        this.updateSelection();
        this.updateAddPageButton();
    },
    
    uuidForItemContainingElement: function uuidForItemContainingElement(element)
    {
        if (!element)
            return null;

        var testElement = element;
        while (testElement && testElement.tagName !== "LI")
            testElement = testElement.parentElement;

        var item = this.readingListItemForElement(testElement);
        return item ? item.UUID() : null;
    },

    setUsesLegacyScrollers: function setUsesLegacyScrollers(useLegacyScrollers)
    {
        this._useLegacyScrollers = useLegacyScrollers;
        this.updateScrollerStyle();
    },
    
    updateScrollerStyle: function updateScrollerStyle()
    {
        // Don't do anything when we're called before the HTML has been loaded. This can happen when setUsesLegacyScrollers()
        // is initially called after the creation of the ReadingListJSController.
        if (!document.body)
            return;
        
        if (this._useLegacyScrollers)
            document.body.addStyleClass("legacy-scrollers");
        else
            document.body.removeStyleClass("legacy-scrollers");
    }
}

window.addEventListener("pageshow", pageShown, false);

function pageShown(event)
{
    preloadImages();
    
    ReadingListJS.updateAddPageButton();
    ReadingListJS.updateSelection();
    ReadingListJS.updateScrollerStyle();
}

function preloadImages()
{
    var dpiSuffix = "";
    if (window.devicePixelRatio >= 2)
        dpiSuffix = "@2x";

    var imageURLs = ["safari-resource:/ReadingList-BGLinen" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-BGSideShadow" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-TopBar" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-PushButtonActiveBorderImage" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-PushButtonPressedBorderImage" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-RowDividers" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-DeleteButton" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-DeleteButtonPressed" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-DeleteButtonSelection" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-DeleteButtonSelectionPressed" + dpiSuffix + ".png",
                     "safari-resource:/ReadingList-Selection" + dpiSuffix + ".png",
                     ];
    
    for (i = 0; i < imageURLs.length ; i++) { 
        var image = new Image();
        image.src = imageURLs[i];
    }
}

function getLocalizedString(string)
{
    var localizedString = localizedStrings[string];
    if (localizedString)
        return localizedString;
    return string;
}

function getLocalizedStringFromLocalizableStrings(string)
{
    var localizedString = ReadingListJSController.localizedString(string);
    if (localizedString)
        return localizedString;
    return string;
}

function readingListElement()
{
    return document.getElementById("reading-list");
}

var ReadingListJS = new ReadingListController();
