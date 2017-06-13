function pageLoaded()
{
    HTMLViewController.pageLoaded();
    ExtensionsViewController.load();
    ExtensionsView.pageDidLoad();
}

Extension = function(identifier)
{
    this.identifier = identifier;

    this.initialize();
}

Extension.prototype = {
    get enabled()
    {
        return ExtensionsViewController.extensionEnabled(this.identifier);
    },

    set enabled(value)
    {
        ExtensionsViewController.setExtensionEnabled(this.identifier, value);
    },

    get authorName()
    {
        return ExtensionsViewController.extensionAuthorName(this.identifier);
    },

    get description()
    {
        return ExtensionsViewController.extensionDescription(this.identifier);
    },

    get displayName()
    {
        return ExtensionsViewController.extensionDisplayName(this.identifier);
    },

    get version()
    {
        return ExtensionsViewController.extensionVersion(this.identifier);
    },

    get websiteURL()
    {
        return ExtensionsViewController.extensionWebsiteURL(this.identifier);
    },

    get settings()
    {
        return ExtensionsViewController.extensionSettings(this.identifier);
    },

    get secureSettings()
    {
        return ExtensionsViewController.extensionSecureSettings(this.identifier);
    },

    get settingsInterfaceItems()
    {
        return ExtensionsViewController.extensionSettingsInterfaceItems(this.identifier);
    },

    select: function()
    {
        ExtensionsView.selectedExtension = this;
    },

    initialize: function()
    {
        var icon = document.createElement("img");
        icon.src = this.smallIconURL(IconResolution.LowResolution);
        icon.addStyleClass("icon");
        icon.addStyleClass("low-res");
        icon.setAttribute("alt", HTMLViewController.UIString("%@ icon").format(this.displayName));

        var highResIcon = document.createElement("img");
        highResIcon.src = this.smallIconURL(IconResolution.HighResolution);
        highResIcon.addStyleClass("icon");
        highResIcon.addStyleClass("high-res");
        highResIcon.setAttribute("alt", HTMLViewController.UIString("%@ icon").format(this.displayName));

        this.sidebarElement = document.createElement("div");
        this.sidebarElement.appendChild(icon);
        this.sidebarElement.appendChild(highResIcon);
        this.sidebarElement.appendChild(document.createTextNode(this.displayName));
        this.sidebarElement.addStyleClass("item");
        this.sidebarElement.addEventListener("click", this.sidebarItemSelected.bind(this), false);
        this.sidebarElement.setAttribute("role", "option");
        this.sidebarElement.setAttribute("aria-flowto", "contentView");

        // Add reference back to the Extension object.
        this.sidebarElement.extension = this;
    },

    display: function()
    {
        document.getElementById("low-res-icon").src = this.iconURL(IconResolution.LowResolution);
        document.getElementById("high-res-icon").src = this.iconURL(IconResolution.HighResolution);
        document.getElementById("low-res-icon").setAttribute("alt", HTMLViewController.UIString("%@ icon").format(this.displayName));
        document.getElementById("high-res-icon").setAttribute("alt", HTMLViewController.UIString("%@ icon").format(this.displayName));
        document.getElementById("title").textContent = this.displayName + " " + this.version;
        document.getElementById("description").textContent = this.description;
        document.getElementById("enableCheckboxLabel").textContent = HTMLViewController.UIString("Enable %@").format(this.displayName);

        var authorElement = document.getElementById("author");
        authorElement.textContent = "";

        if (this.authorName) {
            if (this.websiteURL) {
                var linkElement = document.createElement("a");
                linkElement.href = this.websiteURL;
                authorElement.appendChild(linkElement);
                authorElement = linkElement;
            }

            authorElement.textContent = HTMLViewController.UIString("by %@").format(this.authorName);
        }

        var settingsElement = document.getElementById("settings");
        settingsElement.removeChildren();

        const settingsInterfaceItems = this.settingsInterfaceItems;
        if (settingsInterfaceItems && settingsInterfaceItems.length) {
            function settingChanged(interfaceItem, newValue, deleted)
            {
                var settings = (interfaceItem["Secure"] ? this.secureSettings : this.settings);
                if (deleted)
                    delete settings[interfaceItem["Key"]];
                else
                    settings[interfaceItem["Key"]] = newValue;
            }

            var tableElement = createExtensionSettingsTableElement(settingsInterfaceItems, this.settings, this.secureSettings, settingChanged.bind(this));

            if (tableElement.rows.length) {
                settingsElement.appendChild(tableElement);
                settingsElement.removeStyleClass("empty");
            }
        }

        if (!settingsElement.childNodes.length) {
            settingsElement.addStyleClass("empty");
            settingsElement.textContent = HTMLViewController.UIString("No settings");
        }

        this.updateEnableButton();
    },

    updateEnableButton: function()
    {
        document.getElementById("enableCheckboxButton").checked = this.enabled;
    },

    sidebarItemSelected: function(event)
    {
        this.select();
    },

    iconURL: function(resolution)
    {
        return ExtensionsViewController.extensionIconURL(this.identifier, resolution);
    },

    largeIconURL: function(resolution)
    {
        return ExtensionsViewController.extensionLargeIconURL(this.identifier, resolution);
    },

    smallIconURL: function(resolution)
    {
        return ExtensionsViewController.extensionSmallIconURL(this.identifier, resolution);
    }
}

var ExtensionsView = {
    _selectedExtension: null,

    // All installed extensions in installation order
    extensions: [],

    // Map from identifiers to their Extension objects
    extensionsByIdentifier: {},

    pageDidLoad: function()
    {
        applyPlatformSpecificStyle();

        document.getElementById("updates-item").addEventListener("click", this.updatesItemSelected.bind(this), false);

        document.getElementById("enableCheckboxButton").addEventListener("change", this.enableButtonClicked.bind(this), false);
        document.getElementById("uninstallButton").addEventListener("click", this.uninstallButtonClicked.bind(this), false);
        document.getElementById("get-more").addEventListener("click", this.getMoreExtensionsClicked.bind(this), false);
        document.getElementById("help").addEventListener("click", this.helpClicked.bind(this), false);
        document.getElementById("sidebar").addEventListener("keydown", this.sidebarKeyDown.bind(this), false);

        document.getElementById("sidebar").focus();

        document.documentElement.setAttribute("aria-label", HTMLViewController.UIString("Extensions"));
        document.getElementById("sidebar").setAttribute("aria-label", HTMLViewController.UIString("Extensions"));
        document.getElementById("contentView").setAttribute("aria-label", HTMLViewController.UIString("Extension Info"));
        document.getElementById("help").setAttribute("aria-label", HTMLViewController.UIString("Help"));

        var masterSwitchElement = document.getElementById("master-switch");
        masterSwitchElement.getElementsByClassName("thumb")[0].addEventListener("mousedown", this.startMasterSwitchDragging.bind(this), false);

        var masterSwitchOnLabel = masterSwitchElement.getElementsByClassName("on-label")[0];
        var masterSwitchOffLabel = masterSwitchElement.getElementsByClassName("off-label")[0];
        masterSwitchOnLabel.addEventListener("click", this.enableExtensions.bind(this), false);
        masterSwitchOffLabel.addEventListener("click", this.disableExtensions.bind(this), false);

        const minLabelFontSize = 9;
        const masterSwitchElementMaxWidth = 150;
        const masterSwitchElementPadding = 10;

        // If the master switch is too wide, try shrinking the font size to make it fit.
        var labelFontSize = parseInt(window.getComputedStyle(masterSwitchOnLabel).fontSize);
        while (masterSwitchElement.offsetWidth > masterSwitchElementMaxWidth) {
            if (labelFontSize <= minLabelFontSize)
                break;

            --labelFontSize;

            masterSwitchOnLabel.style.fontSize = labelFontSize + "px";
            masterSwitchOffLabel.style.fontSize = labelFontSize + "px";
        }

        // If the master switch is still too wide, shrink the width of the explanation to account for the width switch.
        if (masterSwitchElement.offsetWidth > masterSwitchElementMaxWidth) {
            var explanationElement = document.getElementById("explanation");
            explanationElement.style.right = (masterSwitchElement.offsetWidth + masterSwitchElementPadding) + "px";
        }

        function sliderKeyDown(event)
        {
            if (event.keyIdentifier === "U+0020" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) { // Space key
                this.toggleExtensionsEnabled();
                event.preventDefault();
            }
        }

        var sliderElement = masterSwitchElement.getElementsByClassName("slider")[0];
        sliderElement.addEventListener("click", this.toggleExtensionsEnabled.bind(this), false);
        sliderElement.addEventListener("keydown", sliderKeyDown.bind(this), false);
        sliderElement.setAttribute("aria-label", HTMLViewController.UIString("Enable Extensions"));

        var installUpdatesAutomaticallyCheckbox = document.getElementById("install-updates-automatically");
        installUpdatesAutomaticallyCheckbox.checked = ExtensionsViewController.shouldInstallUpdatesAutomatically;
        installUpdatesAutomaticallyCheckbox.addEventListener("change", this.installUpdatesAutomaticallyDidChange.bind(this), false);

        document.getElementById("install-all-updates").addEventListener("click", this.installAllUpdatesButtonClicked.bind(this), false);

        this.updateMasterSwitch();
        this.initializeAvailableUpdates();
    },
    
    pageUnloaded: function()
    {
        if (this.installUpdatesAutomaticallyCountdownInterval)
            this.installUpdatesAutomaticallyCountdownDidFinish();
        
        ExtensionsViewController.unload();
    },

    addExtension: function(identifier)
    {
        var extension = new Extension(identifier);
        this.extensions.push(extension);
        this.extensionsByIdentifier[identifier] = extension;
        document.getElementById("extensionList").appendChild(extension.sidebarElement);
        if (!this.selectedExtension)
            extension.select();
    },

    removeExtension: function(identifier)
    {
        var extension = this.extensionsByIdentifier[identifier];
        if (!extension)
            return;

        // Before removing the extension from the sidebar, determine the next extension to focus in the sidebar.
        if (this.selectedExtension == extension) {
            if (extension.sidebarElement.nextSibling)
                extension.sidebarElement.nextSibling.extension.select();
            else if (extension.sidebarElement.previousSibling)
                extension.sidebarElement.previousSibling.extension.select();
            else {
                // There are no installed extensions remaining.
                // FIXME: when there are no installed extensions, we should probably show a different
                // view rather than an empty sidebar and an empty description area.
                this.selectedExtension = null;
            }
        }

        // Remove the sidebar element of this extension.
        document.getElementById("extensionList").removeChild(extension.sidebarElement);
        
        // If the extension to remove has an update, remove it by setting the best available version
        // for the extension to undefined.
        this.bestAvailableExtensionVersionDidChange(identifier, undefined);

        this.extensions.remove(this.extensionsByIdentifier[identifier], true);
        delete this.extensionsByIdentifier[identifier];
    },

    extensionStateChanged: function(identifier, enabled)
    {
        var extension = this.extensionsByIdentifier[identifier];
        if (!extension)
            return;

        if (this.selectedExtension === extension)
            extension.updateEnableButton();
    },

    extensionsEnabledStateChanged: function(enabled)
    {
        if (!enabled) {
            this.selectedExtension = null;
            document.getElementById("extensionList").removeChildren();
            document.getElementById("available-updates-container").removeChildren();

            this.extensions = [];
            this.extensionsByIdentifier = {};
        }

        this.updateMasterSwitch(true);
    },

    updateMasterSwitch: function(animated)
    {
        var masterSwitchElement = document.getElementById("master-switch");
        var sliderElement = masterSwitchElement.getElementsByClassName("slider")[0];

        if (!animated) {
            masterSwitchElement.addStyleClass("disable-animation");

            // Remove the "disable-animation" class on a timeout so the animation wont start after the "on" class is removed.
            setTimeout(function() { masterSwitchElement.removeStyleClass("disable-animation") }, 0);
        }

        var afterWindowResize = null;

        if (this.extensionsEnabled) {
            masterSwitchElement.addStyleClass("on");
            sliderElement.setAttribute("aria-checked", "true");

            afterWindowResize = function() {
                document.body.removeStyleClass("collapsed");
            }
        } else {
            masterSwitchElement.removeStyleClass("on");
            sliderElement.setAttribute("aria-checked", "false");

            document.body.addStyleClass("collapsed");
        }

        // The switch animation defined in ExtensionsView.css takes 250ms. Give some extra time
        // to do a final paint before resizing the window.
        const switchAnimationDuration = 300;

        // Update the window height after a delay so any animation of the content has time to finish.
        setTimeout(this.updateWindowHeight.bind(this, afterWindowResize), switchAnimationDuration);
    },

    updateWindowHeight: function(finishedCallback)
    {
        if (this.extensionsEnabled)
            ExtensionsViewController.resizeWindowToEnabledHeight();
        else
            ExtensionsViewController.resizeWindowToDisabledHeight();

        if (finishedCallback)
            finishedCallback();
    },

    get extensionsEnabled()
    {
        return ExtensionsViewController.extensionsEnabled();
    },

    set extensionsEnabled(enabled)
    {
        ExtensionsViewController.setExtensionsEnabled(enabled);
    },

    toggleExtensionsEnabled: function(event)
    {
        // Do nothing if the thumb was just dragged, since the user might have moused up
        // inside the thumb when ending the drag, causing it to be treated as a click.
        if (this.wasRecentlyDraggingMasterSwitchThumb)
            return;
        this.extensionsEnabled = !this.extensionsEnabled;
    },

    enableExtensions: function(event)
    {
        this.extensionsEnabled = true;
    },

    disableExtensions: function(event)
    {
        this.extensionsEnabled = false;
    },

    startMasterSwitchDragging: function(event)
    {
        var thumbElement = event.target;
        var sliderSwitchElement = thumbElement.parentNode.parentNode;
        sliderSwitchElement.addStyleClass("disable-animation");

        this.draggingThumbElement = thumbElement;
        this.draggingThumbOffset = event.offsetX;

        Dragger.elementDragStart(thumbElement, this.masterSwitchDragging.bind(this), this.endMasterSwitchDragging.bind(this), event, "default");
    },

    masterSwitchDragging: function(event)
    {
        var thumbElement = this.draggingThumbElement;
        var sliderElement = thumbElement.parentNode;

        var sliderPosition = event.pageX - totalLeftOffset(sliderElement) - this.draggingThumbOffset;
        sliderPosition = Number.constrain(sliderPosition, 1, sliderElement.offsetWidth - thumbElement.offsetWidth - 1);

        thumbElement.style.left = sliderPosition + "px";

        this.wasRecentlyDraggingMasterSwitchThumb = true;
    },

    endMasterSwitchDragging: function(event)
    {
        var thumbElement = this.draggingThumbElement;
        var sliderElement = thumbElement.parentNode;
        var sliderSwitchElement = sliderElement.parentNode;
        var sliderPosition = thumbElement.offsetLeft;

        sliderSwitchElement.removeStyleClass("disable-animation");
        thumbElement.style.removeProperty("left");

        this.extensionsEnabled = (sliderPosition + (thumbElement.offsetWidth / 2) >= (sliderElement.offsetWidth / 2));

        delete this.draggingThumbElement;

        // Clear the wasRecentlyDraggingMasterSwitchThumb on a timeout so the click event
        // that might follow this mouse up event can know the thumb was just dragged.
        setTimeout(function() { delete ExtensionsView.wasRecentlyDraggingMasterSwitchThumb }, 0);

        Dragger.elementDragEnd(event);
    },

    sidebarKeyDown: function(event)
    {
        if (!this.extensions.length)
            return;

        var handled = false;

        var selectedSidebarElement;
        if (this.selectedExtension)
            selectedSidebarElement = this.selectedExtension.sidebarElement;

        if (event.keyIdentifier === "Up") {
            if (selectedSidebarElement) {
                if (selectedSidebarElement.previousSibling)
                  selectedSidebarElement.previousSibling.extension.select();  
            } else {
                // Up was pressed when the updates field was selected (therefore there is no selected sidebar
                // extension, so we want to select the last extension on the list.
                this.extensions[this.extensions.length - 1].select();
            }

            handled = true;
        } else if (event.keyIdentifier === "Down") {
            if (selectedSidebarElement && selectedSidebarElement.nextSibling)
                selectedSidebarElement.nextSibling.extension.select();
            else
                this.updatesItemSelected(event);
                
            handled = true;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    },

    enableButtonClicked: function(event)
    {
        if (!this.selectedExtension)
            return;
        this.selectedExtension.enabled = !this.selectedExtension.enabled;
    },

    uninstallButtonClicked: function(event)
    {
        if (!this.selectedExtension)
            return;
        ExtensionsViewController.uninstallExtension(this.selectedExtension.identifier);
    },

    getMoreExtensionsClicked: function(event)
    {
        document.location.href = ExtensionsViewController.extensionGalleryURL();
    },

    helpClicked: function(event)
    {
        document.location.href = "open-help-anchor:sfri32153";
    },

    get selectedExtension()
    {
        return this._selectedExtension;
    },

    set selectedExtension(extension)
    {
        if (this._selectedExtension === extension)
            return;

        if (this._selectedExtension) {
            this._selectedExtension.sidebarElement.removeStyleClass("selected");
            this._selectedExtension.sidebarElement.setAttribute("aria-selected", "false");
        }

        this._selectedExtension = extension;

        if (!this._selectedExtension) {
            document.getElementById("extensionInfo").addStyleClass("hidden");
            return;
        }

        document.getElementById("updates-item").removeStyleClass("selected");
        this._selectedExtension.sidebarElement.addStyleClass("selected");
        this._selectedExtension.sidebarElement.setAttribute("aria-selected", "true");

        this._selectedExtension.sidebarElement.scrollIntoViewIfNeeded(true);
        this._selectedExtension.display();

        document.getElementById("updates").addStyleClass("hidden");
        document.getElementById("extensionInfo").removeStyleClass("hidden");
    },

    updatesItemSelected: function(event)
    {
        this.selectedExtension = null;
        document.getElementById("updates-item").addStyleClass("selected");
        document.getElementById("updates").removeStyleClass("hidden");
        
        ExtensionsViewController.checkForUpdatesNow();
    },

    initializeAvailableUpdates: function()
    {
        var availableUpdates = document.getElementById("available-updates-container");
        for (var index = 0; index < this.extensions.length; ++index) {
            var extension = this.extensions[index];
            var bestAvailableVersionNumber = ExtensionsViewController.bestAvailableVersionNumber(extension.identifier);
            if (!bestAvailableVersionNumber)
                continue;

            extension.availableUpdateElement = this.createAvailableUpdateElement(extension, bestAvailableVersionNumber);
            availableUpdates.appendChild(extension.availableUpdateElement);
        }
        this.numberOfAvailableUpdatesDidChange();
    },
    
    installAllUpdatesButtonClicked: function(event)
    {
        this.extensions.forEach(function(extension) {
            ExtensionsViewController.downloadAndInstallBestAvailableVersionForIdentifier(extension.identifier);
        });
    },
    
    updateExtensionButtonClicked: function(event)
    {
        ExtensionsViewController.downloadAndInstallBestAvailableVersionForIdentifier(event.target.extensionIdentifier);
    },

    createAvailableUpdateElement: function(extension, versionNumber)
    {
        console.assert(versionNumber);

        var container = document.createElement("div");
        container.className = "available-update";

        var icon = document.createElement("img");
        icon.src = extension.largeIconURL(IconResolution.LowResolution);
        icon.className = "low-res";
        container.appendChild(icon);

        var highResIcon = document.createElement("img");
        highResIcon.src = extension.largeIconURL(IconResolution.HighResolution);
        highResIcon.className = "high-res";
        container.appendChild(highResIcon);

        var textChildren = [
            { content: extension.displayName, tag: "h2" },
            { content: extension.authorName, tag: "div" },
            { content: HTMLViewController.UIString("Version: %@").format(versionNumber), tag: "div", className: "version-number" },
            { content: HTMLViewController.UIString("Install"), tag: "button" },
        ];

        for (var childIndex = 0; childIndex < textChildren.length; ++childIndex) {
            var child = document.createElement(textChildren[childIndex].tag);
            child.className = textChildren[childIndex].className;
            child.appendChild(document.createTextNode(textChildren[childIndex].content));
            if (textChildren[childIndex].tag == "button") {
                child.extensionIdentifier = extension.identifier;
                child.addEventListener("click", this.updateExtensionButtonClicked.bind(this), false);
            }
            container.appendChild(child);
        }

        return container;
    },

    bestAvailableExtensionVersionDidChange: function(identifier, versionNumber)
    {
        var extension = this.extensionsByIdentifier[identifier];
        console.assert(extension);

        if (!versionNumber) {
            if (extension.availableUpdateElement)
                extension.availableUpdateElement.parentNode.removeChild(extension.availableUpdateElement);
            delete extension.availableUpdateElement;
            this.numberOfAvailableUpdatesDidChange();
            return;
        }

        if (extension.availableUpdateElement) {
            var versionNumberElement = extension.availableUpdateElement.getElementsByClassName("version-number")[0];
            versionNumberElement.textContent = HTMLViewController.UIString("Version: %@").format(versionNumber);
            return;
        }

        extension.availableUpdateElement = this.createAvailableUpdateElement(extension, versionNumber);

        // Find the next installed extension that has an available update, and insert this one just before it.
        var indexOfExtension = this.extensions.indexOf(extension);
        var nextAvailableUpdateElement;
        for (var index = indexOfExtension + 1; index < this.extensions.length; ++index) {
            if (!this.extensions[index].availableUpdateElement)
                continue;
            nextAvailableUpdateElement = this.extensions[index].availableUpdateElement;
            break;
        }

        document.getElementById("available-updates-container").insertBefore(extension.availableUpdateElement, nextAvailableUpdateElement);
        this.numberOfAvailableUpdatesDidChange();
    },

    numberOfAvailableUpdatesDidChange: function()
    {
        this.updateUpdatesContent();

        var count = ExtensionsViewController.numberOfAvailableUpdates;

        var bubble = document.getElementById("updates-count-bubble");

        if (!count || ExtensionsViewController.shouldInstallUpdatesAutomatically || this.installUpdatesAutomaticallyCountdownInterval) {
            bubble.addStyleClass("hidden");
            return;
        }

        bubble.removeStyleClass("hidden");
        bubble.textContent = count;
    },

    installUpdatesAutomaticallyDidChange: function(event)
    {
        var shouldUpdateAutomatically = event.target.checked;
        
        if (shouldUpdateAutomatically) {
            // We check for elements with the class name available-update, because we only want to start a countdown
            // if there are available updates. If checking the box doesn't have any instant effect, we don't need to
            // have a countdown.
            if (document.getElementsByClassName("available-update").length)
                this.startInstallUpdatesAutomaticallyCountdown();
            else
                ExtensionsViewController.shouldInstallUpdatesAutomatically = true;
        } else {
            this.stopInstallUpdatesAutomaticallyCountdown();
            ExtensionsViewController.shouldInstallUpdatesAutomatically = false;
        }

        // If the user turned off automatic updates, make sure we initialize the available updates,
        // so that the user will be able to see any available updates they might have right after they
        // uncheck the box (the most likely scenario for this would be if the user turned off automatic
        // updates during the countdown, before they were even turned on).
        if (!shouldUpdateAutomatically)
            this.initializeAvailableUpdates();
        else {
            // If the user turned on automatic updates, make sure that we update the number of
            // available updates, so we don't show a bubble with any updates in it during the
            // countdown process.
            this.numberOfAvailableUpdatesDidChange();
        }
    },
    
    startInstallUpdatesAutomaticallyCountdown: function()
    {
        var countdown = document.getElementById("install-updates-automatically-countdown");
        var timeLeft = 10;

        console.assert(!this.installUpdatesAutomaticallyCountdownInterval);

        function updateInstallAutomaticallyCountdown()
        {
            if (!timeLeft) {
                this.stopInstallUpdatesAutomaticallyCountdown();
                this.installUpdatesAutomaticallyCountdownDidFinish();
                return;
            }

            countdown.textContent = HTMLViewController.UIString("Automatic install will begin in %@ seconds…").format(timeLeft);
            countdown.removeStyleClass("hidden");
            --timeLeft;
        }

        updateInstallAutomaticallyCountdown();
        this.installUpdatesAutomaticallyCountdownInterval = setInterval(updateInstallAutomaticallyCountdown.bind(this), 1000);
    },
    
    stopInstallUpdatesAutomaticallyCountdown: function()
    {
        if (this.installUpdatesAutomaticallyCountdownInterval)
            clearTimeout(this.installUpdatesAutomaticallyCountdownInterval);
        delete this.installUpdatesAutomaticallyCountdownInterval;

        document.getElementById("install-updates-automatically-countdown").addStyleClass("hidden");

        this.updateUpdatesContent();
    },
    
    installUpdatesAutomaticallyCountdownDidFinish: function()
    {
        ExtensionsViewController.shouldInstallUpdatesAutomatically = true;
        
        this.updateUpdatesContent();
    },

    updateUpdatesContent: function()
    {
        var text;
        var emptyText;
        var installUpdatesAutomatically = ExtensionsViewController.shouldInstallUpdatesAutomatically || this.installUpdatesAutomaticallyCountdownInterval;
        
        if (installUpdatesAutomatically) {
            text = HTMLViewController.UIString("Safari will automatically install updates for your extensions. If you prefer to install updates manually, deselect Install Updates Automatically.");
            emptyText = HTMLViewController.UIString("Extensions will be automatically updated");
        } else if (ExtensionsViewController.numberOfAvailableUpdates > 0) {
            text = HTMLViewController.UIString("Updates are available for one or more of your extensions. To install an update click its Install button, or click Install All Updates.");
        } else {
            text = HTMLViewController.UIString("To have Safari automatically install updates for your extensions, select Install Updates Automatically.");
            emptyText = HTMLViewController.UIString("No updates available");
        }
        
        if (installUpdatesAutomatically || !ExtensionsViewController.numberOfAvailableUpdates)
            document.getElementById("install-all-updates").addStyleClass("hidden");
        else
            document.getElementById("install-all-updates").removeStyleClass("hidden");
        
        var availableUpdatesContainer = document.getElementById("available-updates-container");
        if (emptyText) {
            availableUpdatesContainer.removeChildren();

            // If there isn't currently a placeholder element, create one.
            var placeholder = document.createElement("div");
            placeholder.id = "available-updates-placeholder";
            placeholder.textContent = emptyText;
            availableUpdatesContainer.appendChild(placeholder);

            // Remove all the available-update elements from the extensions. They were just removed from the DOM,
            // and other code relies on these elements always being in the DOM, if they exist.
            for (var index = 0; index < this.extensions.length; ++index)
                delete this.extensions[index].availableUpdateElement;
        } else {
            // If there is currently placeholder text, make sure we delete it.
            var availableUpdatesPlaceholder = document.getElementById("available-updates-placeholder");
            if (availableUpdatesPlaceholder)
                availableUpdatesPlaceholder.parentNode.removeChild(availableUpdatesPlaceholder);
        }

        document.getElementById("updates-explanation").textContent = text;
    },
}
