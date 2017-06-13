var treeElementHeight = 17;
var treeViewStartPadding = 8;
var expandableTreeViewExtraStartPadding = 12;
var treeViewLevelIndent = 18;

// TreeElement - represents a single element in the tree.  It can be a leaf element or
// it can contain children.
function TreeElement(representedObject, hasChildren)
{
    this.representedObject = representedObject;
    this.hasChildren = hasChildren;
    this.children = [];
    this.parent = null;
    this._listItemNode = null;
    this._childrenListNode = null;
    this.treeOutline = 0;
    this._depth = 0;
    this._expanded = false;
    this._selectable = representedObject ? representedObject.enabled : true;
    this._selected = false;
}

TreeElement.prototype = {

    get title() {
        return this.representedObject ? this.representedObject.title : null;
    },
    
    get iconURL() {
        return this.representedObject ? this.representedObject.iconURL : null;
    },

    get elementID() {
        return this.representedObject ? this.representedObject.elementID : null;
    },
    
    get depth() {
        return this._depth;
    },
    
    get expanded() {
        return this._expanded;
    },
    
    get selectable() {
        return this._selectable;
    },
    
    set selectable(x) {
        this._selectable = x;
        if (!this._listItemNode)
            return;
        if (this._selectable)
            this._listItemNode.removeStyleClass("disabled");
        else
            this._listItemNode.addStyleClass("disabled");
    },

    get selected() {
        return this._selected;
    },
    
    set selected(x) {
        if (x == this.selected || !this.selectable)
            return;
        this._selected = x;
        if (!this._listItemNode)
            return;
        if (this._selected)
            this._listItemNode.addStyleClass("selected");
        else
            this._listItemNode.removeStyleClass("selected");
    }
            
}

TreeElement._createDisclosureArrowElement = function() 
{
    var element = document.createElement("span");
    element.addStyleClass("disclosureArrow");
    element.addEventListener("click", TreeElement.treeElementToggled, false);
    return element;
}

TreeElement.prototype._createIconElement = function()
{
    var element = document.createElement("img");
    element.addStyleClass("treeViewItemIcon");
    element.src = this.iconURL;
    return element;
}

TreeElement.getTreeElement = function(obj)
{
    while (obj && !obj.treeElement)
        obj = obj.parentNode;
    return obj ? obj.treeElement : null;
}

TreeElement.prototype.createHTMLElementHierarchy = function(index)
{
    /*  Sample element hierarchy looks like this:
      <li>
        <div>
          <span class="disclosureArrow"></span>
          <img class="treeViewItemIcon" src="GenericFolderIcon_16.png" />
          Item
        </div>
      </li>
    */
    
    var oldListItemNode = this._listItemNode;
    
    this._listItemNode = this.treeOutline._childrenListNode.ownerDocument.createElement("li");
    this._listItemNode.treeElement = this;

    // Add event listeners
    this._listItemNode.addEventListener("mousedown", TreeElement.treeElementSelected, false);
    this._listItemNode.addEventListener("dblclick", TreeElement.treeElementToggled, false);
    
    // Reset "selectable" again so the right styles will be applied to the list node.
    this.selectable = this._selectable;

    var innerDiv = this._listItemNode.appendChild(this.treeOutline._childrenListNode.ownerDocument.createElement("div"));
    
    // Set padding based on the depth of the TreeElement
    var padding = treeViewStartPadding + this._depth * treeViewLevelIndent;
    if (this.treeOutline.containsExpandableChildren)
        padding += expandableTreeViewExtraStartPadding;
    innerDiv.style.paddingLeft = padding + "px";

    if (this.hasChildren)
        innerDiv.appendChild(TreeElement._createDisclosureArrowElement());
        
    if (this.iconURL.length > 0)
        innerDiv.appendChild(this._createIconElement());
        
    innerDiv.appendChild(this.treeOutline._childrenListNode.ownerDocument.createTextNode(this.title));

    if (!this.parent._childrenListNode) {
        this.parent._childrenListNode = this.treeOutline._childrenListNode.ownerDocument.createElement("ul");
        this.parent._listItemNode.appendChild(this.parent._childrenListNode);
    }

    // If there was a listItemNode for this TreeElement before, just replace the old one with the new one.
    if (oldListItemNode)
        this.parent._childrenListNode.replaceChild(this._listItemNode, oldListItemNode);
    else {   // Otherwise, just insert to parent based on specified index.
        var listItemBefore = (index >= 0) ? this.parent._childrenListNode.childNodes[index] : null;
        this.parent._childrenListNode.insertBefore(this._listItemNode, listItemBefore);
    }
}

TreeElement.prototype.attachToParent = function(newParent, index)
{
    this.parent = newParent;
    this.treeOutline = newParent.treeOutline;
    this._depth = this.parent._depth + 1;
    
    this.createHTMLElementHierarchy(index);
}

TreeElement.prototype.detachFromParent = function()
{
    if (!this.parent)
        return;
        // We need to detach the html content of this element from its parent
    if (this._listItemNode)
        this.parent._childrenListNode.removeChild(this._listItemNode);
    this.parent = null;
    this.treeOutline = null;
    this._depth = 0;
}

TreeElement.prototype.insertChildTreeElement = function(element, index)
{
    if (index < 0)
        index = this.children.length;
    this.children.splice(index, 0, element);
    element.attachToParent(this, index);
    this.treeOutline.registerElement(element);
}

TreeElement.prototype.indexOfChild = function(element)
{
    return this.children.indexOf(element);
}

TreeElement.prototype.removeChildTreeElement = function(element)
{
    var index = this.indexOfChild(element);
    if (index < 0)
        return;
    this.children.splice(index, 1);
    element.detachFromParent();
    this.treeOutline.unregisterElement(element);
}

TreeElement.prototype.select = function()
{
    this.treeOutline.selectedTreeElement = this;
}

TreeElement.prototype.expand = function()
{
    if (this._expanded || !this.hasChildren)
        return;
        
    this._expanded = true;
    if (this.children.length == 0)
        this.treeOutline.populateChildrenTreeElements(this);
    
    if (this._listItemNode)
        this._listItemNode.addStyleClass("expanded");
}

TreeElement.prototype.collapse = function()
{
    if (!this._expanded)
        return;
    
    this._expanded = false;    
    this._listItemNode.removeStyleClass("expanded");
}

TreeElement.treeElementSelected = function(event)
{
    var element = event.target;
    // Clicking on the disclosure array does not select the item.
    if (!element || element.hasStyleClass("disclosureArrow"))
        return;

    var treeElement = TreeElement.getTreeElement(element);
    if (!treeElement || !treeElement.selectable)
        return;
        
    treeElement.select();
}

TreeElement.treeElementToggled = function(event)
{
    var element = event.currentTarget;
    if (!element)
        return;

    var treeElement = TreeElement.getTreeElement(element);
    if (!treeElement || !treeElement.hasChildren)
        return;
        
    if (treeElement._expanded)
        treeElement.collapse();
    else
        treeElement.expand();
}

// TreeOutline - represents the root of a tree of TreeElements.
function TreeOutline(listNode, treeViewController)
{
    TreeOutline.baseConstructor.call(this, treeViewController, true);
    treeViewController.treeOutline = this;
    if (!listNode)
        throw("Must pass in a non-null listNode!");
    this._childrenListNode = listNode;
    this._childrenListNode.removeChildren();
    this.treeOutline = this;
    this.containsExpandableChildren = false;
    this._selectedTreeElement = null;
    this.treeViewController = treeViewController;
    this._idToElementMap = new Object();
    // Register itself
    this.registerElement(this);
}

JSClass.inherit(TreeOutline, TreeElement);

TreeOutline.prototype.__defineGetter__("selectedTreeElement", function()
{
    return this._selectedTreeElement;
});

TreeOutline.prototype.__defineSetter__("selectedTreeElement", function(x)
{
    if (x == this._selectedTreeElement)
        return;
        
    if (x && !x.selectable)
        return;

    // Deselect the last selected elemenet.        
    if (this._selectedTreeElement)
        this._selectedTreeElement.selected = false;
        
    this._selectedTreeElement = x;
    
    if (this._selectedTreeElement) {
        this._selectedTreeElement.selected = true;
        // Notify the TreeViewController that a new element has been selected
        if (this.treeViewController.elementSelected)
            this.treeViewController.elementSelected(this._selectedTreeElement);
    }
});

TreeOutline.prototype.registerElement = function(element)
{
    this._idToElementMap[element.elementID] = element;
}

TreeOutline.prototype.unregisterElement = function(element)
{
    this._idToElementMap[element.elementID] = null;
}

TreeOutline.prototype.treeElementFromID = function(id)
{
    return this._idToElementMap[id];
}

TreeOutline.prototype.populateChildrenTreeElements = function(element)
{
    if (!this.treeViewController.populateChildrenTreeElements)
        throw("TreeViewController must provide an implementation of populateChildrenTreeElements.");
    this.treeViewController.populateChildrenTreeElements(element);
}

TreeOutline.prototype.representedObjectUpdated = function(representedObject)
{
    // Find the TreeElement associated with that representedObject
    var element = this.treeElementFromID(representedObject.elementID);
    if (!element)
        return;
    element.representedObject = representedObject;
    // Re-generate the html for this TreeElement.
    element.createHTMLElementHierarchy(-1);
}

TreeOutline.prototype.insertTreeElement = function(parent, representedObject, hasChildren, index)
{
    var element = new TreeElement(representedObject, hasChildren);
    parent.insertChildTreeElement(element, index);
}

TreeOutline.prototype.removeTreeElement = function(element)
{
    if (!element || !element.parent)
        return;
    var nextSelectedElement = null;
    if (this.selectedTreeElement == element) {
        // The currently selected element is being deleted.  Find the element to be selected next.
        nextSelectedElement = TreeOutline.neighborElement(element, false);
        if (!nextSelectedElement)
            nextSelectedElement = TreeOutline.neighborElement(element, true);
    }
    element.parent.removeChildTreeElement(element);
    if (nextSelectedElement)
        this.selectedTreeElement = nextSelectedElement;
}

// Retrieve the TreeElement above or below the passed in element.
TreeOutline.neighborElement = function(element, previous)
{
    var elementX = element._listItemNode.totalOffsetLeft;
    var elementY = element._listItemNode.totalOffsetTop;
    
    var newElementY = previous ? elementY - treeElementHeight/2 : elementY + treeElementHeight*3/2;
    
    // Need to adjust for scrollTop
    var parent = element._listItemNode.offsetParent;
    if (parent)
        newElementY -= parent.totalScrollTop;
    
    var result = document.elementFromPoint(elementX+1, newElementY);
    if (!result)
        return 0;
    return TreeElement.getTreeElement(result);
}

TreeOutline.prototype.handleKeyEvent = function(event)
{
    if (!this.selectedTreeElement || event.shiftKey || event.metaKey || event.ctrlKey)
        return false;

    var handled = false;
    var nextSelectedElement;
    var identifier = event.keyIdentifier;
    if (event.keyIdentifier === "Up") {
        nextSelectedElement = TreeOutline.neighborElement(this.selectedTreeElement, true);
        while (nextSelectedElement && !nextSelectedElement.selectable)
            nextSelectedElement = TreeOutline.neighborElement(nextSelectedElement, true);
        handled = nextSelectedElement ? true : false;
    } else if (event.keyIdentifier === "Down") {
        nextSelectedElement = TreeOutline.neighborElement(this.selectedTreeElement, false);
        while (nextSelectedElement && !nextSelectedElement.selectable)
            nextSelectedElement = TreeOutline.neighborElement(nextSelectedElement, false);
        handled = nextSelectedElement ? true : false;
    } else if (event.keyIdentifier === "Left") {
        this.selectedTreeElement.collapse();
        handled = true;
    } else if (event.keyIdentifier === "Right") {
        this.selectedTreeElement.expand();
        handled = true;
    } 

    if (nextSelectedElement)
        this.selectedTreeElement = nextSelectedElement;

    if (handled) {
        event.preventDefault();
        event.stopPropagation();
    }

    return handled;
}
