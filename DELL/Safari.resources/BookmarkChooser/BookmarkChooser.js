var collectionViewElement;
var collectionTreeOutline;
var collectionTreeViewController;
var outlineViewElement;
var outlineTreeOutline;
var outlineTreeViewController;
var treeViewWithFocus;
var rootFolderID = "";

// BookmarkTreeViewController is the base class of the CollectionTreeViewController and OutlineTreeViewController.
// It contains the uuid of the bookmarks folder that it controls (empty string for the root folder), and
// a hash map that maps from url to an array of WebBookmark objects.
function BookmarkTreeViewController(elementID)
{
    this.elementID = elementID;
    this._urlToWebBookmarks = new Object();
}

BookmarkTreeViewController.prototype.populateChildrenTreeElements = function(parent)
{
    BookmarkChooserController.populateBookmarkFolderChildren(parent, parent.elementID);
}

BookmarkTreeViewController.prototype.registerWebBookmark = function(webBookmark)
{
    var bookmarksArray = this._urlToWebBookmarks[webBookmark.url];
    if (!bookmarksArray) {
        bookmarksArray = new Array();
        this._urlToWebBookmarks[webBookmark.url] = bookmarksArray;
    }
    bookmarksArray.push(webBookmark);
}

BookmarkTreeViewController.prototype.unregisterWebBookmark = function(webBookmark)
{
    var bookmarksArray = this._urlToWebBookmarks[webBookmark.url];
    if (!bookmarksArray)
        return;
    var index = bookmarksArray.indexOf(webBookmark);
    if (index < 0)
        return;
    bookmarksArray.splice(index, 1);
    if (!bookmarksArray.length)
        this._urlToWebBookmarks[webBookmark.url] = null;
}

BookmarkTreeViewController.prototype.insertBookmark = function(parent, webBookmark, index)
{
    this.registerWebBookmark(webBookmark);
    this.treeOutline.insertTreeElement(parent, webBookmark, webBookmark.hasChildren, index);
}

BookmarkTreeViewController.prototype.handleBookmarkAddedNotification = function(elementIDOfParentFolder, childIndex, webBookmark)
{
    var parentElement = this.treeOutline.treeElementFromID(elementIDOfParentFolder);
    if (!parentElement)
        return;
    this.insertBookmark(parentElement, webBookmark, childIndex);
}

BookmarkTreeViewController.prototype.handleBookmarkRemovedNotification = function(elementIDOfParentFolder, childIndex)
{
    var parentElement = this.treeOutline.treeElementFromID(elementIDOfParentFolder);
    if (!parentElement)
        return;
    if (childIndex < 0 || childIndex >= parentElement.children.length)
        return;
    var childElement = parentElement.children[childIndex];
    this.unregisterWebBookmark(childElement.representedObject);
    this.treeOutline.removeTreeElement(childElement);
}

BookmarkTreeViewController.prototype.handleBookmarkChangedNotification = function(elementIDOfParentFolder, childIndex, url, title, iconURL)
{
    var parentElement = this.treeOutline.treeElementFromID(elementIDOfParentFolder);
    if (!parentElement)
        return;
    if (childIndex < 0 || childIndex >= parentElement.children.length)
        return;
    var childElement = parentElement.children[childIndex];
    this.unregisterWebBookmark(childElement.representedObject);
    childElement.representedObject.url = url;
    childElement.representedObject.title = title;
    childElement.representedObject.iconURL = BookmarkChooser.favIconURL(iconURL);
    this.registerWebBookmark(childElement.representedObject);
    
    this.treeOutline.representedObjectUpdated(childElement.representedObject);
}

BookmarkTreeViewController.prototype.handleFavIconUpdatedNotification = function(url, newIconURL)
{
    var bookmarksArray = this._urlToWebBookmarks[url];
    if (!bookmarksArray)
        return;
    var i;
    for (i = 0; i < bookmarksArray.length; i++) {
        bookmarksArray[i].iconURL = BookmarkChooser.favIconURL(newIconURL);
        this.treeOutline.representedObjectUpdated(bookmarksArray[i]);
    }
}

// CollectionTreeViewController ---------------------------------------------------------
function CollectionTreeViewController()
{
    CollectionTreeViewController.baseConstructor.call(this, rootFolderID);
}

JSClass.inherit(CollectionTreeViewController, BookmarkTreeViewController);

CollectionTreeViewController.prototype.elementSelected = function(treeElement)
{
    treeViewWithFocus = collectionViewElement;
    // If the collection selected hasn't changed, we don't need to do anything.
    if (outlineTreeViewController && outlineTreeViewController.elementID == treeElement.elementID) {
        outlineTreeOutline.selectedTreeElement = null;
        return;
    }
    // When the selected item changes in the collection view, update the outline view on the right
    var oldOutlineTreeOutline = outlineTreeOutline;
    var oldOutlineTreeViewController = outlineTreeViewController;
    outlineTreeViewController = new OutlineTreeViewController(treeElement.elementID);
    var outlineViewListNode = outlineViewElement.getElementsByTagName("ul")[0];
    outlineTreeOutline = new TreeOutline(outlineViewListNode, outlineTreeViewController);
    outlineViewElement.treeOutline = outlineTreeOutline;
    outlineTreeOutline.containsExpandableChildren = true;   // Unlike the collection view, the outline view (on the right) can have expandable children.
    outlineTreeOutline.expand();
    delete oldOutlineTreeOutline;
    delete oldOutlineTreeViewController;
}

// OutlineTreeViewController -----------------------------------------------------
function OutlineTreeViewController(bookmarkFolderID)
{
    OutlineTreeViewController.baseConstructor.call(this, bookmarkFolderID);
}

JSClass.inherit(OutlineTreeViewController, BookmarkTreeViewController);

OutlineTreeViewController.prototype.elementSelected = function(treeElement)
{
    treeViewWithFocus = outlineViewElement;
    collectionTreeOutline.selectedTreeElement = null;
}

// WebBookmark represents a bookmark item.
function WebBookmark(url, title, elementID, iconURL, enabled, hasChildren)
{
    this.url = url;
    this.title = title;
    this.elementID = elementID;
    this.iconURL = iconURL;
    this.enabled = enabled;
    this.hasChildren = hasChildren;
} 

// BookmarkChooser --------------------------------------------------------------------------
var BookmarkChooser = {
    setRootFolderIdentifier: function(value)
    {
        rootFolderID = value;
    },
    
    pageLoaded: function()
    {
        HTMLViewController.pageLoaded();
        BookmarkChooserController.loaded();
        
        collectionViewElement = document.getElementById("collectionView");
        outlineViewElement = document.getElementById("outlineView");
        BookmarkChooser.loadBookmarksDBContents();
    },
    
    loadBookmarksDBContents: function()
    {
        collectionTreeViewController = new CollectionTreeViewController();
        var collectionViewListNode = collectionViewElement.getElementsByTagName("ul")[0];
        collectionTreeOutline = new TreeOutline(collectionViewListNode, collectionTreeViewController);
        collectionViewElement.treeOutline = collectionTreeOutline;
        collectionTreeOutline.expand();        
        // Selects the first collection initially.
        collectionTreeOutline.selectedTreeElement = collectionTreeOutline.children[0];        
    },
    
    keyDown: function(event)
    {
        if (treeViewWithFocus)
            treeViewWithFocus.treeOutline.handleKeyEvent(event);
    },
    
    cancelSelected: function()
    {
        BookmarkChooserController.cancelSelected();
    },
    
    chooseSelected: function()
    {
        var chosenTreeElement = BookmarkChooser.currentlySelectedTreeElement();
        if (chosenTreeElement)
            BookmarkChooserController.chooseSelected(chosenTreeElement.elementID);
        else
            BookmarkChooser.cancelSelected();
    },
    
    currentlySelectedTreeElement: function()
    {
        var result = outlineTreeOutline.selectedTreeElement;
        if (!result)
            result = collectionTreeOutline.selectedTreeElement;
        return result;
    },
    
    favIconURL: function(iconURL)
    {
        if (iconURL == "")  // Empty iconURL means folder.
            return "BookmarkChooser/GenericFolderIcon_16.png";
        return iconURL;
    },
    
    addBookmark: function(parent, url, title, elementID, iconURL, enabled, hasChildren)
    {
        var bookmark = new WebBookmark(url, title, elementID, BookmarkChooser.favIconURL(iconURL), enabled, hasChildren);
        parent.treeOutline.treeViewController.insertBookmark(parent, bookmark, -1);
    },
    
    handleBookmarkAddedNotification: function(parentElementID, url, title, elementID, iconURL, enabled, hasChildren, index)
    {
        var bookmark = new WebBookmark(url, title, elementID, BookmarkChooser.favIconURL(iconURL), enabled, hasChildren);
        outlineTreeViewController.handleBookmarkAddedNotification(parentElementID, index, bookmark);
        collectionTreeViewController.handleBookmarkAddedNotification(parentElementID, index, bookmark);
    },
    
    handleBookmarkRemovedNotification: function(parentElementID, index)
    {
        outlineTreeViewController.handleBookmarkRemovedNotification(parentElementID, index);
        collectionTreeViewController.handleBookmarkRemovedNotification(parentElementID, index);
    },
    
    handleBookmarkChangedNotification: function(parentElementID, index, url, title, iconURL)
    {
        outlineTreeViewController.handleBookmarkChangedNotification(parentElementID, index, url, title, iconURL);
        collectionTreeViewController.handleBookmarkChangedNotification(parentElementID, index, url, title, iconURL);
    },
    
    handleBookmarkIconUpdatedNotification: function(url, iconURL)
    {
        outlineTreeViewController.handleFavIconUpdatedNotification(url, iconURL);
        collectionTreeViewController.handleFavIconUpdatedNotification(url, iconURL);
    },
}
