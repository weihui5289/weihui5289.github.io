Function.prototype.bind = function(thisObject)
{
    var func = this;
    var args = Array.prototype.slice.call(arguments, 1);
    return function() { return func.apply(thisObject, args.concat(Array.prototype.slice.call(arguments, 0))) };
}

Number.constrain = function(num, min, max)
{
    if (num > max && num < min)
        return ((max + min) / 2);
    if (num < min)
        return min;
    if (num > max)
        return max;
    return num;
}

var SnippetEditor = {
    get dividerPosition()
    {
        return document.getElementById("divider").offsetTop;
    },

    set dividerPosition(newPosition)
    {
        var entryElement = document.getElementById("entry");
        var dividerElement = document.getElementById("divider");
        var previewContainerElement = document.getElementById("preview-container");

        var splitAreaHeight = this.splitAreaHeight;
        newPosition = Number.constrain(newPosition, 50, splitAreaHeight - 50);

        var dividerMiddle = (dividerElement.offsetHeight / 2);
        entryElement.style.height = (newPosition - dividerMiddle) + "px";
        dividerElement.style.top = (newPosition - dividerMiddle) + "px";
        previewContainerElement.style.top = (dividerMiddle + newPosition) + "px";

        SnippetEditorController.dividerRatio = (newPosition / splitAreaHeight);
    },

    get splitAreaHeight()
    {
        var buttonBarElement = document.getElementById("button-bar");
        return (window.innerHeight - buttonBarElement.offsetHeight);
    },

    loaded: function()
    {
        var updateButtonElement = document.getElementById("update-button");
        updateButtonElement.textContent = SnippetEditorController.updateButtonLabel;
        updateButtonElement.addEventListener("click", this.updatePreview.bind(this), false);

        var autoUpdateTextNode = document.createTextNode(SnippetEditorController.autoUpdateCheckboxLabel);
        document.getElementById("auto-update-label").appendChild(autoUpdateTextNode);

        var autoCheckboxElement = document.getElementById("auto-update-checkbox");
        autoCheckboxElement.addEventListener("change", this.changeAutoUpdate.bind(this), false);
        autoCheckboxElement.checked = SnippetEditorController.autoUpdate;

        var dividerElement = document.getElementById("divider");
        dividerElement.addEventListener("mousedown", this.startDividerDragging.bind(this), false);

        var entryElement = document.getElementById("entry");
        entryElement.addEventListener("keydown", this.entryKeyDown.bind(this), false);
        entryElement.addEventListener("DOMSubtreeModified", this.entryModifiedEvent.bind(this), false);

        this.addDocumentEventListeners(document);

        SnippetEditorController.setIsDisconnectedFrame("preview");
        var previewElement = document.getElementById("preview");
        this.addDocumentEventListeners(previewElement.contentDocument);
        previewElement.addEventListener("load", this.previewLoaded.bind(this), false);

        window.addEventListener("resize", this.windowResize.bind(this), false);

        window.getSelection().setBaseAndExtent(entryElement, 0, entryElement, 0);

        document.body.className = "platform-" + SnippetEditorController.platform;

        this.updateDivider();
    },

    addDocumentEventListeners: function(doc)
    {
        doc.defaultView.addEventListener("focus", this.windowFocused.bind(this), true);
        doc.defaultView.addEventListener("blur", this.windowBlurred.bind(this), true);
    },

    windowFocused: function(event)
    {
        if (event.target.nodeType === Node.DOCUMENT_NODE)
            document.body.className = "platform-" + SnippetEditorController.platform;
    },

    windowBlurred: function(event)
    {
        if (event.target.nodeType === Node.DOCUMENT_NODE)
            document.body.className = "inactive platform-" + SnippetEditorController.platform;
    },

    updateDivider: function()
    {
        this.dividerPosition = (SnippetEditorController.dividerRatio * this.splitAreaHeight);
    },

    windowResize: function(event)
    {
        this.updateDivider();
    },

    previewLoaded: function()
    {
        this.addDocumentEventListeners(document.getElementById("preview").contentDocument);
    },

    flashUpdateButton: function()
    {
        var updateButtonElement = document.getElementById("update-button");
        updateButtonElement.className = "selected";
        setTimeout(function() { updateButtonElement.className = "" }, 100);
    },

    updatePreview: function()
    {
        var previewDocument = document.getElementById("preview").contentDocument;
        previewDocument.open();
        previewDocument.write(document.getElementById("entry").textContent);
        previewDocument.close();
    },

    updatePreviewSoon: function()
    {
        if ("updatePreviewTimeout" in this)
            return;

        function delayUpdate()
        {
            this.updatePreview();
            delete this.updatePreviewTimeout;
        }

        this.updatePreviewTimeout = setTimeout(delayUpdate.bind(this), 100);
    },

    changeAutoUpdate: function(event)
    {
        SnippetEditorController.autoUpdate = event.target.checked;
    },

    entryKeyDown: function(event)
    {
        if (event.keyIdentifier === "Enter" && (event.metaKey || event.ctrlKey)) {
            this.updatePreview();
            this.flashUpdateButton();
            event.preventDefault();
            return;
        }

        if (event.keyIdentifier === "U+0009" && !event.metaKey && !event.ctrlKey && !event.altKey && event.cancelable) {
            event.preventDefault();
            if (!event.shiftKey)
                document.execCommand("InsertText", false, "\t");
        }
    },

    entryModifiedEvent: function(event)
    {
        if (SnippetEditorController.autoUpdate)
            this.updatePreviewSoon();
    },

    startDividerDragging: function(event)
    {
        if (this.dividerDraggingEventListener || this.endDividerDraggingEventListener)
            return this.endDividerDragging(event);

        document.body.style.cursor = "row-resize";

        this.dividerDraggingEventListener = this.dividerDragging.bind(this);
        this.endDividerDraggingEventListener = this.endDividerDragging.bind(this);

        window.addEventListener("mousemove", this.dividerDraggingEventListener, false);
        window.addEventListener("mouseup", this.endDividerDraggingEventListener, false);

        this.dividerDragOffset = event.pageY - document.getElementById("divider").offsetTop;

        event.preventDefault();
    },

    dividerDragging: function(event)
    {
        var dividerMiddle = (document.getElementById("divider").offsetHeight / 2);
        this.dividerPosition = (event.pageY + dividerMiddle - this.dividerDragOffset);

        event.preventDefault();
    },

    endDividerDragging: function(event)
    {
        document.body.style.removeProperty("cursor");

        window.removeEventListener("mousemove", this.dividerDraggingEventListener, false);
        window.removeEventListener("mouseup", this.endDividerDraggingEventListener, false);

        delete this.dividerDraggingEventListener;
        delete this.endDividerDraggingEventListener;
        delete this.dividerDragOffset;

        event.preventDefault();
    }
}

window.addEventListener("load", SnippetEditor.loaded.bind(SnippetEditor), false);
