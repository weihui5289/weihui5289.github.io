function loaded()
{
    HTMLViewController.pageLoaded();
    ExtensionBuilder.initialize();
    ExtensionBuilderController.loaded();
}

window.addEventListener("load", loaded, false);

const savePendingChangesSoonDelay = 30000; // 30 seconds
const bundleInfoDictionaryVersion = "6.0";
const extensionInfoDictionaryVersion = "1.0";
const infoPropertyListFileName = "Info.plist";
const settingsPropertyListFileName = "Settings.plist";

Extension = function(bundleURL)
{
    this.bundleURL = bundleURL;
    this.bundleFilename = "";

    var pathComponents = bundleURL.split("/");
    for (var i = pathComponents.length - 1; i >= 0; --i) {
        if (!pathComponents[i])
            continue;
        this.bundleFilename = decodeURIComponent(pathComponents[i]);
        break;
    }

    this.initialize();
}

Extension.prototype = {
    get installed()
    {
        return ExtensionBuilderController.isExtensionInstalled(this.bundleIdentifier, this.certificateName);
    },

    get settings()
    {
        return this.settingsPropertyList;
    },

    set settings(x)
    {
        this.settingsPropertyList = x || [];
        this.markSettingsPropertyListAsDirty();
        updateConditionalsForExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    get displayName()
    {
        return this.infoPropertyList["CFBundleDisplayName"];
    },

    set displayName(x)
    {
        this.setInfoPropertyListValue("CFBundleDisplayName", x);

        this.updateSidebarTitleElement();
        this.updateTitleElement();
    },

    get shortVersion()
    {
        return this.infoPropertyList["CFBundleShortVersionString"];
    },

    set shortVersion(x)
    {
        this.setInfoPropertyListValue("CFBundleShortVersionString", x);
    },

    get bundleVersion()
    {
        return this.infoPropertyList["CFBundleVersion"];
    },

    set bundleVersion(x)
    {
        this.setInfoPropertyListValue("CFBundleVersion", x);
    },

    get bundleIdentifier()
    {
        return this.infoPropertyList["CFBundleIdentifier"];
    },

    set bundleIdentifier(x)
    {
        this.setInfoPropertyListValue("CFBundleIdentifier", x);
    },

    get updateManifestURL()
    {
        return this.infoPropertyList["Update Manifest URL"];
    },

    set updateManifestURL(x)
    {
        this.setInfoPropertyListValue("Update Manifest URL", x);
    },

    get description()
    {
        return this.infoPropertyList["Description"];
    },

    set description(x)
    {
        this.setInfoPropertyListValue("Description", x);
    },

    get author()
    {
        return this.infoPropertyList["Author"];
    },

    set author(x)
    {
        this.setInfoPropertyListValue("Author", x);
    },

    get website()
    {
        return this.infoPropertyList["Website"];
    },

    set website(x)
    {
        this.setInfoPropertyListValue("Website", x);
    },

    get content()
    {
        if (typeof this.infoPropertyList["Content"] !== "object")
            this.infoPropertyList["Content"] = {};
        return this.infoPropertyList["Content"];
    },

    set content(x)
    {
        this.setInfoPropertyListValue("Content", x);
    },

    get whitelist()
    {
        return this.content["Whitelist"];
    },

    set whitelist(x)
    {
        this.setInfoPropertyListValue("Whitelist", x, this.content);
    },

    get blacklist()
    {
        return this.content["Blacklist"];
    },

    set blacklist(x)
    {
        this.setInfoPropertyListValue("Blacklist", x, this.content);
    },

    get stylesheets()
    {
        return this.content["Stylesheets"];
    },

    set stylesheets(x)
    {
        this.setInfoPropertyListValue("Stylesheets", x, this.content);
        this.updateWhitelistAndBlacklist();
    },

    get scripts()
    {
        if (typeof this.content["Scripts"] !== "object")
            this.content["Scripts"] = {};
        return this.content["Scripts"];
    },

    set scripts(x)
    {
        this.setInfoPropertyListValue("Scripts", x, this.content);
    },

    get startScripts()
    {
        return this.scripts["Start"];
    },

    set startScripts(x)
    {
        this.setInfoPropertyListValue("Start", x, this.scripts);
        this.updateWhitelistAndBlacklist();
    },

    get endScripts()
    {
        return this.scripts["End"];
    },

    set endScripts(x)
    {
        this.setInfoPropertyListValue("End", x, this.scripts);
        this.updateWhitelistAndBlacklist();
    },

    get chrome()
    {
        if (typeof this.infoPropertyList["Chrome"] !== "object")
            this.infoPropertyList["Chrome"] = {};
        return this.infoPropertyList["Chrome"];
    },

    set chrome(x)
    {
        this.setInfoPropertyListValue("Chrome", x);
    },

    get globalPage()
    {
        return this.chrome["Global Page"];
    },

    set globalPage(x)
    {
        this.setInfoPropertyListValue("Global Page", x, this.chrome);
    },

    get contextMenuItems()
    {
        return this.chrome["Context Menu Items"];
    },

    set contextMenuItems(x)
    {
        this.setInfoPropertyListValue("Context Menu Items", x, this.chrome);
    },

    get bars()
    {
        return this.chrome["Bars"];
    },

    set bars(x)
    {
        this.setInfoPropertyListValue("Bars", x, this.chrome);
    },

    get toolbarItems()
    {
        return this.chrome["Toolbar Items"];
    },

    set toolbarItems(x)
    {
        this.setInfoPropertyListValue("Toolbar Items", x, this.chrome);
    },

    get menus()
    {
        return this.chrome["Menus"];
    },

    set menus(x)
    {
        this.setInfoPropertyListValue("Menus", x, this.chrome);

        refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    get popovers()
    {
        return this.chrome["Popovers"];
    },

    set popovers(x)
    {
        this.setInfoPropertyListValue("Popovers", x, this.chrome);

        refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    get databaseQuota()
    {
        return this.chrome["Database Quota"];
    },

    set databaseQuota(x)
    {
        this.setInfoPropertyListValue("Database Quota", x, this.chrome);
    },

    get permissions()
    {
        if (typeof this.infoPropertyList["Permissions"] !== "object")
            this.infoPropertyList["Permissions"] = {};
        return this.infoPropertyList["Permissions"];
    },

    set permissions(x)
    {
        this.setInfoPropertyListValue("Permissions", x);
    },

    get websiteAccess()
    {
        if (typeof this.permissions["Website Access"] !== "object")
            this.permissions["Website Access"] = {};
        return this.permissions["Website Access"];
    },

    set websiteAccess(x)
    {
        this.setInfoPropertyListValue("Website Access", x, this.permissions);
    },

    get websiteAccessLevel()
    {
        return this.websiteAccess["Level"];
    },

    set websiteAccessLevel(x)
    {
        this.setInfoPropertyListValue("Level", x, this.websiteAccess);

        if (x === "None" || x === "All") {
            this.websiteAccessAllowedDomains = null;
            if (x === "None")
                this.websiteAccessIncludeSecurePages = null;

            refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
            return;
        }

        updateConditionalsForExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    get websiteAccessAllowedDomains()
    {
        return this.websiteAccess["Allowed Domains"];
    },

    set websiteAccessAllowedDomains(x)
    {
        this.setInfoPropertyListValue("Allowed Domains", x, this.websiteAccess);
    },

    get websiteAccessIncludeSecurePages()
    {
        return this.websiteAccess["Include Secure Pages"];
    },

    set websiteAccessIncludeSecurePages(x)
    {
        this.setInfoPropertyListValue("Include Secure Pages", x, this.websiteAccess);
    },

    setInfoPropertyListValue: function(key, value, parentDictionary, dontDeleteWhenEmpty)
    {
        if (!parentDictionary)
            parentDictionary = this.infoPropertyList;

        if (!dontDeleteWhenEmpty && value instanceof Array && !value.length)
            value = null;

        if (parentDictionary[key] === value) {
            // Always mark the property list as dirty for objects and arrays since they might have
            // changed even if the object is the same.
            if (value instanceof Array || value instanceof Object)
                this.markInfoPropertyListAsDirty();
            return;
        }

        if (value === null || typeof value === "undefined" || (!dontDeleteWhenEmpty && !value))
            delete parentDictionary[key];
        else
            parentDictionary[key] = value;

        this.markInfoPropertyListAsDirty();
    },

    hasInjectedContent: function()
    {
        return (this.startScripts && this.startScripts.length) || (this.endScripts && this.endScripts.length) || (this.stylesheets && this.stylesheets.length);
    },

    updateWhitelistAndBlacklist: function()
    {
        if (!this.hasInjectedContent()) {
            this.whitelist = null;
            this.blacklist = null;

            refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
            return;
        }

        updateConditionalsForExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    markInfoPropertyListAsDirty: function()
    {
        this.infoPropertyListDirty = true;
        this.savePendingChangesSoon();
    },

    markSettingsPropertyListAsDirty: function()
    {
        this.settingsPropertyListDirty = true;
        this.savePendingChangesSoon();
    },

    savePendingChangesSoon: function()
    {
        if ("savePendingChangesTimeout" in this)
            return;
        this.savePendingChangesTimeout = setTimeout(this.savePendingChanges.bind(this), savePendingChangesSoonDelay, true);
    },

    savePendingChanges: function(dontValidate)
    {
        if ("savePendingChangesTimeout" in this) {
            clearTimeout(this.savePendingChangesTimeout);
            delete this.savePendingChangesTimeout;
        }

        if (this.infoPropertyListDirty) {
            ExtensionBuilderController.writePropertyList(this.bundleURL + infoPropertyListFileName, this.infoPropertyList);
            this.infoPropertyListDirty = false;
        }

        if (this.settingsPropertyListDirty) {
            ExtensionBuilderController.writePropertyList(this.bundleURL + settingsPropertyListFileName, this.settingsPropertyList);
            this.settingsPropertyListDirty = false;
        }

        if (!dontValidate && ExtensionBuilder.selectedExtension === this) {
            // Do a validate here so any errors that haven't been shown yet will be.
            validateExtensionSettingsTableElement(this.settingsTableElement, this, this);
        }
    },

    setUpInfoPropertyList: function()
    {
        this.infoPropertyList["CFBundleInfoDictionaryVersion"] = bundleInfoDictionaryVersion;
        this.infoPropertyList["ExtensionInfoDictionaryVersion"] = extensionInfoDictionaryVersion;

        var pathComponents = this.bundleURL.split("/");
        var name = this.bundleFilename.replace(/\.safariextension$/, "");

        if (!("CFBundleDisplayName" in this.infoPropertyList))
            this.infoPropertyList["CFBundleDisplayName"] = name;

        if (!("CFBundleShortVersionString" in this.infoPropertyList))
            this.infoPropertyList["CFBundleShortVersionString"] = "1.0";

        if (!("CFBundleVersion" in this.infoPropertyList))
            this.infoPropertyList["CFBundleVersion"] = "1";

        if (!("CFBundleIdentifier" in this.infoPropertyList)) {
            var nameForBundleIdentifier = name.replace(/[^a-zA-Z0-9\-]|^[-\d]+|-+$/g, "").toLowerCase();
            if (!nameForBundleIdentifier)
                nameForBundleIdentifier = "extension";
            this.infoPropertyList["CFBundleIdentifier"] = "com.yourcompany." + nameForBundleIdentifier;
        }

        this.markInfoPropertyListAsDirty();
    },

    loadData: function()
    {
        // FIXME: Only do this if the property list was modified on disk since the last time it was parsed.
        this.infoPropertyList = ExtensionBuilderController.readPropertyList(this.bundleURL + infoPropertyListFileName) || {};
        this.infoPropertyListDirty = false;

        this.settingsPropertyList = ExtensionBuilderController.readPropertyList(this.bundleURL + settingsPropertyListFileName) || [];
        this.settingsPropertyListDirty = false;

        // Migrate the Toolbars to the new Bars name.
        if ("Toolbars" in this.chrome) {
            this.chrome["Bars"] = this.chrome["Toolbars"];
            delete this.chrome["Toolbars"];
            this.markInfoPropertyListAsDirty();
        }

        if (!this.infoPropertyList["CFBundleInfoDictionaryVersion"] || !this.infoPropertyList["ExtensionInfoDictionaryVersion"]) {
            // Assume this is a new extension and populate things.
            this.setUpInfoPropertyList();
        }

        // Set the current application bundle version as the builder version.
        var currentSafariVersion = ExtensionBuilderController.applicationBundleVersion;
        if (this.infoPropertyList["Builder Version"] !== currentSafariVersion) {
            this.infoPropertyList["Builder Version"] = currentSafariVersion;
            this.markInfoPropertyListAsDirty();
        }

        // FIXME: Only do this if the image was modified on disk since the last time it was loaded.
        const uniqueNumber = Number(new Date());
        if (this.sidebarIconElement)
            this.sidebarIconElement.src = this.smallIconURL(IconResolution.LowResolution) + "?" + uniqueNumber;
        if (this.highResSidebarIconElement)
            this.highResSidebarIconElement.src = this.smallIconURL(IconResolution.HighResolution) + "?" + uniqueNumber;

        // FIXME: Only do this if the image was modified on disk since the last time it was loaded.
        if (this.infoIconElement)
            this.infoIconElement.src = this.iconURL(IconResolution.LowResolution) + "?" + uniqueNumber;
        if (this.highResInfoIconElement)
            this.highResInfoIconElement.src = this.iconURL(IconResolution.HighResolution) + "?" + uniqueNumber;

        if (this.sidebarElement)
            this.updateSidebarTitleElement();

        this.availableCertificateNamesDidChange();
    },

    availableCertificateNamesDidChange: function()
    {
        if (!this.certificateElement)
            return;

        if (ExtensionBuilder.selectedExtension === this) {
            // Update the certificate element first so the buttons in the title element will
            // reflect certificate availability correctly.
            this.updateCertificateElement();
            this.updateTitleElement();
            refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
        } else {
            this.certificateElementNeedsUpdate = true;
            this.settingsTableNeedsRefresh = true;
        }
    },

    iconURL: function(resolution)
    {
        return ExtensionBuilderController.computeIconURLForExtensionBundle(this.bundleURL, resolution);
    },

    smallIconURL: function(resolution)
    {
        return ExtensionBuilderController.computeSmallIconURLForExtensionBundle(this.bundleURL, resolution);
    },

    select: function()
    {
        // Update the certificate element first so the buttons in the title element will
        // reflect certificate availability correctly.
        if (this.certificateElementNeedsUpdate) {
            this.updateCertificateElement();
            delete this.certificateElementNeedsUpdate;
        }

        // Always update the title element to reflect the installed status in the buttons.
        this.updateTitleElement();

        if (this.settingsTableNeedsRefresh) {
            refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
            delete this.settingsTableNeedsRefresh;
        }

        ExtensionBuilder.selectedExtension = this;
    },

    initialize: function()
    {
        this.loadData();

        if (ExtensionBuilder.availableCertificateNames.length)
            this.certificateName = ExtensionBuilder.availableCertificateNames[0];

        this.sidebarIconElement = document.createElement("img");
        this.sidebarIconElement.src = this.smallIconURL(IconResolution.LowResolution);
        this.sidebarIconElement.addEventListener("error", this.smallIconLoadFailed.bind(this, IconResolution.LowResolution), false);
        this.sidebarIconElement.addStyleClass("icon");
        this.sidebarIconElement.addStyleClass("low-res");

        this.highResSidebarIconElement = document.createElement("img");
        this.highResSidebarIconElement.src = this.smallIconURL(IconResolution.HighResolution);
        this.highResSidebarIconElement.addEventListener("error", this.smallIconLoadFailed.bind(this, IconResolution.HighResolution), false);
        this.highResSidebarIconElement.addStyleClass("icon");
        this.highResSidebarIconElement.addStyleClass("high-res");

        this.sidebarElement = document.createElement("div");
        this.sidebarElement.className = "item";
        this.sidebarElement.addEventListener("click", this.sidebarItemSelected.bind(this), false);

        this.closeButton = document.createElement("button");
        this.closeButton.className = "close";
        this.closeButton.addEventListener("click", this.closeClicked.bind(this), false);

        this.sidebarTitleElement = document.createElement("span");

        this.sidebarElement.appendChild(this.sidebarIconElement);
        this.sidebarElement.appendChild(this.highResSidebarIconElement);
        this.sidebarElement.appendChild(this.closeButton);
        this.sidebarElement.appendChild(this.sidebarTitleElement);

        this.updateSidebarTitleElement();

        // Add reference back to the Extension object.
        this.sidebarElement.extension = this;

        this.infoElement = document.createElement("section");
        this.infoElement.className = "extension-info";

        var headerElement = document.createElement("header");
        this.infoElement.appendChild(headerElement);

        this.infoIconElement = document.createElement("img");
        this.infoIconElement.src = this.iconURL(IconResolution.LowResolution);
        this.infoIconElement.addEventListener("error", this.iconLoadFailed.bind(this, IconResolution.LowResolution), false);
        this.infoIconElement.addStyleClass("icon");
        this.infoIconElement.addStyleClass("low-res");

        this.highResInfoIconElement = document.createElement("img");
        this.highResInfoIconElement.src = this.iconURL(IconResolution.HighResolution);
        this.highResInfoIconElement.addEventListener("error", this.iconLoadFailed.bind(this, IconResolution.HighResolution), false);
        this.highResInfoIconElement.addStyleClass("icon");
        this.highResInfoIconElement.addStyleClass("high-res");

        headerElement.appendChild(this.infoIconElement);
        headerElement.appendChild(this.highResInfoIconElement);

        var detailsElement = document.createElement("div");
        detailsElement.className = "details";
        headerElement.appendChild(detailsElement);

        this.titleElement = document.createElement("h1");
        this.titleElement.className = "title";
        detailsElement.appendChild(this.titleElement);

        this.installButton = document.createElement("button");
        this.installButton.className = "flat";
        this.installButton.addEventListener("click", this.installClicked.bind(this), false);

        this.reloadButton = document.createElement("button");
        this.reloadButton.className = "flat";
        this.reloadButton.addEventListener("click", this.reloadClicked.bind(this), false);
        this.reloadButton.textContent = HTMLViewController.UIString("Reload");

        var bundlePathElement = document.createElement("div");
        bundlePathElement.className = "bundle-path";

        this.buildPackageButton = document.createElement("button");
        this.buildPackageButton.className = "flat";
        this.buildPackageButton.addEventListener("click", this.buildPackageClicked.bind(this), false);
        this.buildPackageButton.textContent = HTMLViewController.UIString("Build Package…");

        bundlePathElement.appendChild(this.buildPackageButton);
        bundlePathElement.appendChild(document.createTextNode(this.bundleFilename));
        detailsElement.appendChild(bundlePathElement);

        this.certificateElement = document.createElement("div");
        this.certificateElement.className = "certificate";
        detailsElement.appendChild(this.certificateElement);

        // Update the certificate element first so the buttons in the title element will
        // reflect certificate availability correctly.
        this.updateCertificateElement();
        this.updateTitleElement();

        var editorElement = document.createElement("div");
        editorElement.className = "extension-editor";
        this.infoElement.appendChild(editorElement);

        function settingChanged(interfaceItem, newValue, deleted)
        {
            this[interfaceItem["Key"]] = deleted ? null : newValue;
        }

        this.settingsTableElement = createExtensionSettingsTableElement(ExtensionBuilder.editorInterfaceElements, this, this, settingChanged.bind(this));
        editorElement.appendChild(this.settingsTableElement);
    },

    updateSidebarTitleElement: function()
    {
        this.sidebarTitleElement.textContent = this.displayName || HTMLViewController.UIString("Untitled");
    },

    updateTitleElement: function()
    {
        if (!this.titleElement)
            return;

        this.titleElement.removeChildren();

        if (this.installed) {
            this.titleElement.appendChild(this.reloadButton);
            this.installButton.textContent = HTMLViewController.UIString("Uninstall");
        } else {
            this.installButton.textContent = HTMLViewController.UIString("Install");
        }

        var disabled = !this.certificateName;
        this.installButton.disabled = disabled;
        this.reloadButton.disabled = disabled;

        this.titleElement.appendChild(this.installButton);
        this.titleElement.appendChild(document.createTextNode(this.displayName || HTMLViewController.UIString("Untitled")));
    },

    updateCertificateElement: function()
    {
        var certificateNames = ExtensionBuilder.availableCertificateNames;

        if (!certificateNames.length) {
            // FIXME: Handle no certificates better with an error icon and/or red text when not having
            // a certificate will prevent installing. Until then not having a certificate isn't an error.
            this.certificateElement.textContent = HTMLViewController.UIString("No Safari Developer Certificate");
            this.certificateElement.addStyleClass("error");

            this.buildPackageButton.disabled = true;

            delete this.certificateName;

            return;
        }

        this.certificateElement.removeStyleClass("error");
        this.buildPackageButton.disabled = false;

        if (certificateNames.length === 1) {
            this.certificateElement.textContent = certificateNames[0];
            this.certificateName = certificateNames[0];
            return;
        }

        this.certificateElement.removeChildren();

        var selectElement = document.createElement("select");
        selectElement.addEventListener("change", this.certificateChanged.bind(this), false);
        for (var i = 0; i < certificateNames.length; ++i) {
            var option = document.createElement("option");
            option.textContent = certificateNames[i];
            selectElement.appendChild(option);
        }

        var indexOfCurrentCertificate = -1;
        if (this.certificateName)
            indexOfCurrentCertificate = certificateNames.indexOf(this.certificateName);
        if (indexOfCurrentCertificate >= 0)
            selectElement.selectedIndex = indexOfCurrentCertificate;

        this.takeCertificateNameFromSelect(selectElement);

        this.certificateElement.appendChild(selectElement);
    },

    certificateChanged: function(event)
    {
        this.takeCertificateNameFromSelect(event.target);
    },

    takeCertificateNameFromSelect: function(selectElement)
    {
        var selectedOption = selectElement.options[selectElement.selectedIndex];
        this.certificateName = selectedOption ? selectedOption.value : null;
        this.updateTitleElement();
        refreshExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    buildPackageClicked: function(event)
    {
        this.savePendingChanges();

        ExtensionBuilderController.showBuildPackageSaveSheetForExtensionBundle(this.bundleURL, this.certificateName);
    },

    closeClicked: function(event)
    {
        event.stopPropagation();

        this.savePendingChanges(true);

        ExtensionBuilder.removeExtension(this.bundleURL);

        // Refocus the sidebar, because the focus changes to the button element causing the
        // sidebar to dim to the inactive look if we don't focus back to the sidebar.
        document.getElementById("sidebar").focus();
    },

    reloadClicked: function(event)
    {
        this.savePendingChanges();

        ExtensionBuilderController.reloadExtension(this.bundleIdentifier, this.bundleURL, this.certificateName);
    },

    installClicked: function(event)
    {
        if (this.installed)
            ExtensionBuilderController.uninstallExtension(this.bundleIdentifier, this.certificateName);
        else {
            this.savePendingChanges();
            ExtensionBuilderController.installExtensionBundle(this.bundleURL, this.certificateName);
        }

        // Update the conditions for the tabletable once the extension has been installed/uninstalled
        // to correctly set the visibility of the "Inspect Global Page" button.
        updateConditionalsForExtensionSettingsTableElement(this.settingsTableElement, this, this);
    },

    sidebarItemSelected: function(event)
    {
        this.select();
    },

    defaultIconName: function(size, resolution)
    {
        return "ExtensionDefaultIcon" + size + (resolution == Icon.HighResolution ? "@2x" : "") + ".png";
    },

    iconLoadFailed: function(resolution, event)
    {
        event.target.src = defaultIconName(48, resolution);
    },

    smallIconLoadFailed: function(resolution, event)
    {
        event.target.src = defaultIconName(32, resolution);
    }
}

var ExtensionBuilder = {
    _selectedExtension: null,
    extensions: {},

    initialize: function()
    {
        if (navigator.platform === "Win32")
            document.body.addStyleClass("platform-windows");
        else
            document.body.addStyleClass("platform-mac");

        document.getElementById("sidebar").addEventListener("keydown", this.sidebarKeyDown.bind(this), false);
        document.getElementById("sidebar").focus();

        var addSelect = document.getElementById("add-extension").querySelector("select");
        addSelect.addEventListener("change", this.addButtonClicked.bind(this), false);
        addSelect.selectedIndex = -1;

        window.addEventListener("focus", this.windowFocused.bind(this), false);
        window.addEventListener("blur", this.windowBlurred.bind(this), false);
        window.addEventListener("unload", this.windowUnloading.bind(this), false);

        this.barEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Label"), "Type": "TextField", "Key": "Label" },
            { "Title": HTMLViewController.UIString("File"), "Type": "PopUpButton", "Key": "Filename", "DataSource": fileListGenerator.bind(window, "html"), "DefaultIndex": 0, "Validator": popupRequiredValidator },
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier" }
        ];

        this.toolbarItemEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Label"), "Type": "TextField", "Key": "Label", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Palette Label"), "Type": "TextField", "Key": "Palette Label" },
            { "Title": HTMLViewController.UIString("Tooltip"), "Type": "TextField", "Key": "Tool Tip" },
            { "Title": HTMLViewController.UIString("Image"), "Type": "PopUpButton", "Key": "Image", "DataSource": fileListGenerator.bind(window, "png"), "DefaultIndex": 0, "Validator": popupRequiredValidator },
            { "Title": HTMLViewController.UIString("Menu"), "Type": "PopUpButton", "Key": "Menu", "DataSource": identifierMenuGenerator.bind(window, "menus"), "DefaultIndex": 0 },
            { "Title": HTMLViewController.UIString("Popover"), "Type": "PopUpButton", "Key": "Popover", "DataSource": identifierMenuGenerator.bind(window, "popovers"), "DefaultIndex": 0 },
            { "Type": "Separator", "Classes": "empty" },
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Command"), "Type": "TextField", "Key": "Command" },
            { "Title": HTMLViewController.UIString("Include By Default"), "Type": "CheckBox", "Key": "Include By Default", "DefaultValue": true, "Anchored": true }
        ];

        this.contextMenuItemEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Title"), "Type": "TextField", "Key": "Title", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Command"), "Type": "TextField", "Key": "Command" }
        ];

        this.menuItemEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Type"), "Type": "PopUpButton", "Key": "Separator", "Titles": [HTMLViewController.UIString("Normal"), HTMLViewController.UIString("Separator")], "Values": [false, true], "DefaultIndex": 0 },
            { "Title": HTMLViewController.UIString("Title"), "Type": "TextField", "Key": "Title", "Validator": cannotBeEmptyValidator, "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("Image"), "Type": "PopUpButton", "Key": "Image", "DataSource": fileListGenerator.bind(window, "png"), "DefaultIndex": 0, "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("State"), "Type": "PopUpButton", "Key": "Checked State", "Titles": [HTMLViewController.UIString("Unchecked"), HTMLViewController.UIString("Checked"), HTMLViewController.UIString("Mixed")], "Values": [0, 1, -1], "DefaultIndex": 0, "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("Submenu"), "Type": "PopUpButton", "Key": "Submenu", "DataSource": identifierMenuGenerator.bind(window, "menus"), "DefaultIndex": 0, "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("Disabled"), "Type": "CheckBox", "Key": "Disabled", "DefaultValue": false, "Anchored": true, "Condition": normalMenuItemCondition },
            { "Type": "Separator", "Classes": "empty", "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Condition": separatorMenuItemCondition },
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Validator": cannotBeEmptyValidator, "Condition": normalMenuItemCondition },
            { "Title": HTMLViewController.UIString("Command"), "Type": "TextField", "Key": "Command", "Condition": normalMenuItemCondition }
        ];

        this.menuEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Menu Items"), "Type": "Table", "Key": "Menu Items", "Template": this.menuItemEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Menu Item"), "RowHeaderLabel": HTMLViewController.UIString("Menu Item %@") }
        ];

        this.popoverEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Identifier"), "Type": "TextField", "Key": "Identifier", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("File"), "Type": "PopUpButton", "Key": "Filename", "DataSource": fileListGenerator.bind(window, "html"), "DefaultIndex": 0, "Validator": popupRequiredValidator },
            { "Title": HTMLViewController.UIString("Width"), "Type": "TextField", "Key": "Width", "ValueType": "number" },
            { "Title": HTMLViewController.UIString("Height"), "Type": "TextField", "Key": "Height", "ValueType": "number" },
        ];

        this.simpleTextFieldEditorInterfaceElement = [
            { "Type": "TextField", "Validator": cannotBeEmptyValidator }
        ];

        this.autoTypeTextFieldEditorInterfaceElement = [
            { "Type": "TextField", "AutoDetectValueType": true, "Validator": cannotBeEmptyValidator }
        ];

        this.urlPatternTextFieldEditorInterfaceElement = [
            { "Type": "TextField", "Validator": urlPatternValidator }
        ];

        this.domainPatternTextFieldEditorInterfaceElement = [
            { "Type": "TextField", "Validator": domainPatternValidator }
        ];

        this.contentScriptEditorInterfaceElements = [
            { "Type": "PopUpButton", "DataSource": fileListGenerator.bind(window, "js"), "DefaultIndex": 0, "Validator": popupRequiredValidator }
        ];

        this.contentStylesheetEditorInterfaceElements = [
            { "Type": "PopUpButton", "DataSource": fileListGenerator.bind(window, "css"), "DefaultIndex": 0, "Validator": popupRequiredValidator }
        ];

        this.settingItemEditorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Type"), "Type": "PopUpButton", "Key": "Type", "Titles": [HTMLViewController.UIString("Hidden"), "----", HTMLViewController.UIString("Text Field"), HTMLViewController.UIString("Checkbox"), HTMLViewController.UIString("Slider"), "----", HTMLViewController.UIString("Pop-Up Button"), HTMLViewController.UIString("List Box"), HTMLViewController.UIString("Radio Buttons"), "----", HTMLViewController.UIString("Group"), HTMLViewController.UIString("Separator")], "Values": ["Hidden", "", "TextField", "CheckBox", "Slider", "", "PopUpButton", "ListBox", "RadioButtons", "", "Group", "Separator"], "DefaultIndex": 0, "Classes": "medium" },
            { "Title": HTMLViewController.UIString("Title"), "Type": "TextField", "Key": "Title", "Condition": nonSeparatorAndHiddenCondition, "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Key"), "Type": "TextField", "Key": "Key", "Condition": nonGroupAndSeparatorCondition, "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Default Value"), "Type": "TextField", "Key": "DefaultValue", "AutoDetectValueType": true, "Condition": defaultValueCondition },
            { "Title": HTMLViewController.UIString("True Value"), "Type": "TextField", "Key": "TrueValue", "DefaultValue": true, "AutoDetectValueType": true, "Condition": checkBoxCondition },
            { "Title": HTMLViewController.UIString("False Value"), "Type": "TextField", "Key": "FalseValue", "DefaultValue": false, "AutoDetectValueType": true, "Condition": checkBoxCondition },
            { "Title": HTMLViewController.UIString("Minimum Value"), "Type": "TextField", "Key": "MinimumValue", "DefaultValue": 0, "ValueType": "number", "Condition": sliderCondition },
            { "Title": HTMLViewController.UIString("Maximum Value"), "Type": "TextField", "Key": "MaximumValue", "DefaultValue": 100, "ValueType": "number", "Condition": sliderCondition },
            { "Title": HTMLViewController.UIString("Step Value"), "Type": "TextField", "Key": "StepValue", "DefaultValue": 1, "ValueType": "number", "Condition": sliderCondition },
            { "Title": HTMLViewController.UIString("Display as a password"), "Type": "CheckBox", "Key": "Password", "DefaultValue": false, "Anchored": true, "Condition": textFieldCondition },
            { "Title": HTMLViewController.UIString("Store in secure settings"), "Type": "CheckBox", "Key": "Secure", "DefaultValue": false, "Anchored": true, "Condition": nonGroupAndSeparatorCondition },
            { "Type": "Separator", "Classes": "empty", "Condition": multiValueCondition },
            { "Title": HTMLViewController.UIString("Titles"), "Type": "Table", "Key": "Titles", "Template": this.simpleTextFieldEditorInterfaceElement, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Title"), "Condition": multiValueCondition },
            { "Title": HTMLViewController.UIString("Values"), "Type": "Table", "Key": "Values", "Template": this.autoTypeTextFieldEditorInterfaceElement, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Value"), "Condition": multiValueCondition }
        ];

        this.editorInterfaceElements = [
            { "Title": HTMLViewController.UIString("Extension Info"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Display Name"), "Type": "TextField", "Key": "displayName", "Classes": "medium", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Author"), "Type": "TextField", "Key": "author", "Classes": "medium" },
            { "Title": HTMLViewController.UIString("Description"), "Type": "TextField", "Key": "description", "Validator": descriptionValidator },
            { "Title": HTMLViewController.UIString("Website"), "Type": "TextField", "Key": "website", "Validator": urlValidator },

            { "Title": HTMLViewController.UIString("Extension Details"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Bundle Identifier"), "Type": "TextField", "Key": "bundleIdentifier", "Validator": bundleIdentifierValidator },
            { "Title": HTMLViewController.UIString("Update Manifest"), "Type": "TextField", "Key": "updateManifestURL", "Validator": urlValidator },

            { "Title": HTMLViewController.UIString("Extension Versions"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Display Version"), "Type": "TextField", "Key": "shortVersion", "Classes": "small", "Validator": cannotBeEmptyValidator },
            { "Title": HTMLViewController.UIString("Bundle Version"), "Type": "TextField", "Key": "bundleVersion", "Classes": "small", "Validator": cannotBeEmptyValidator },

            { "Title": HTMLViewController.UIString("Extension Website Access"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Access Level"), "Type": "PopUpButton", "Key": "websiteAccessLevel", "Titles": [HTMLViewController.UIString("None"), HTMLViewController.UIString("Some"), HTMLViewController.UIString("All")], "Values": ["None", "Some", "All"], "DefaultIndex": 0, "Classes": "medium" },
            { "Title": HTMLViewController.UIString("Allowed Domains"), "Type": "Table", "Key": "websiteAccessAllowedDomains", "Template": this.domainPatternTextFieldEditorInterfaceElement, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Domain Pattern"), "Condition": someWebsiteAccessCondition },
            { "Title": HTMLViewController.UIString("Include Secure Pages"), "Type": "CheckBox", "Key": "websiteAccessIncludeSecurePages", "Anchored": true, "Condition": someOrAllWebsiteAccessCondition },

            { "Title": HTMLViewController.UIString("Extension Global Page"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Global Page File"), "Type": "PopUpButton", "Key": "globalPage", "DataSource": fileListGenerator.bind(window, "html"), "DefaultIndex": 0, "Classes": "medium" },
            { "Title": HTMLViewController.UIString("Inspect Global Page"), "Type": "Button", "Anchored": true, "Condition": inspectGlobalPageCondition, "Callback": inspectGlobalPageCallback },

            { "Title": HTMLViewController.UIString("Extension Storage"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Database Quota"), "Type": "PopUpButton", "Key": "databaseQuota", "Titles": [HTMLViewController.UIString("None"), HTMLViewController.UIString("1 MB"), HTMLViewController.UIString("5 MB"), HTMLViewController.UIString("10 MB"), HTMLViewController.UIString("50 MB"), HTMLViewController.UIString("100 MB")], "Values": [0, 1048576, 5242880, 10485760, 52428800, 104857600], "DefaultIndex": 0, "Classes": "medium" },

            { "Title": HTMLViewController.UIString("Extension Chrome"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Bars"), "Type": "Table", "Key": "bars", "Template": this.barEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Bar"), "RowHeaderLabel": HTMLViewController.UIString("Bar %@") },
            { "Title": HTMLViewController.UIString("Contextual Menu Items"), "Type": "Table", "Key": "contextMenuItems", "Template": this.contextMenuItemEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Contextual Menu Item"), "RowHeaderLabel": HTMLViewController.UIString("Contextual Menu Item %@") },
            { "Title": HTMLViewController.UIString("Toolbar Items"), "Type": "Table", "Key": "toolbarItems", "Template": this.toolbarItemEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Toolbar Item"), "RowHeaderLabel": HTMLViewController.UIString("Toolbar Item %@") },
            { "Title": HTMLViewController.UIString("Menus"), "Type": "Table", "Key": "menus", "Template": this.menuEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Menu"), "RowHeaderLabel": HTMLViewController.UIString("Menu %@"), "Classes": "unlimited" },
            { "Title": HTMLViewController.UIString("Popovers"), "Type": "Table", "Key": "popovers", "Template": this.popoverEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Popover"), "RowHeaderLabel": HTMLViewController.UIString("Popover %@"), "Classes": "unlimited" },

            { "Title": HTMLViewController.UIString("Injected Extension Content"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Start Scripts"), "Type": "Table", "Key": "startScripts", "Template": this.contentScriptEditorInterfaceElements, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Script") },
            { "Title": HTMLViewController.UIString("End Scripts"), "Type": "Table", "Key": "endScripts", "Template": this.contentScriptEditorInterfaceElements, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Script") },
            { "Type": "Separator", "Classes": "empty" },
            { "Title": HTMLViewController.UIString("Style Sheets"), "Type": "Table", "Key": "stylesheets", "Template": this.contentStylesheetEditorInterfaceElements, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New Style Sheet") },
            { "Type": "Separator", "Classes": "empty" },
            { "Title": HTMLViewController.UIString("Whitelist"), "Type": "Table", "Key": "whitelist", "Template": this.urlPatternTextFieldEditorInterfaceElement, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New URL Pattern"), "Condition": whitelistAndBlacklistCondition },
            { "Title": HTMLViewController.UIString("Blacklist"), "Type": "Table", "Key": "blacklist", "Template": this.urlPatternTextFieldEditorInterfaceElement, "Mutable": true, "Simple": true, "CreateButtonLabel": HTMLViewController.UIString("New URL Pattern"), "Condition": whitelistAndBlacklistCondition },

            { "Title": HTMLViewController.UIString("Extension Settings"), "Type": "Group" },
            { "Title": HTMLViewController.UIString("Setting Items"), "Type": "Table", "Key": "settings", "Template": this.settingItemEditorInterfaceElements, "Mutable": true, "CreateButtonLabel": HTMLViewController.UIString("New Setting Item"), "RowHeaderLabel": HTMLViewController.UIString("Setting Item %@"), "Classes": "unlimited" }
        ];
    },

    addExtension: function(bundleURL, select)
    {
        if (bundleURL in this.extensions) {
            this.extensions[bundleURL].select();
            return;
        }

        var extension = new Extension(bundleURL);
        this.extensions[bundleURL] = extension;

        document.getElementById("extensions").appendChild(extension.sidebarElement);

        if (!this.selectedExtension || select)
            extension.select();
    },

    removeExtension: function(bundleURL)
    {
        var extension = this.extensions[bundleURL];
        if (!extension)
            return;

        // Before removing the extension from the sidebar, determine the next extension to focus in the sidebar.
        if (this.selectedExtension === extension) {
            if (extension.sidebarElement.nextSibling)
                extension.sidebarElement.nextSibling.extension.select();
            else if (extension.sidebarElement.previousSibling)
                extension.sidebarElement.previousSibling.extension.select();
        }

        // Remove the sidebar element of this extension.
        extension.sidebarElement.parentNode.removeChild(extension.sidebarElement);

        // Remove the info element of this extension if it is showing.
        if (extension.infoElement.parentNode)
            extension.infoElement.parentNode.removeChild(extension.infoElement);

        // Unmap it from the extensions map.
        delete this.extensions[bundleURL];

        // Tell the controller to forget the bundle so it will not show up next time.
        ExtensionBuilderController.forgetExtensionBundle(extension.bundleURL);
    },

    extensionWasInstalled: function(bundleIdentifier)
    {
        // Update the title element since it contains the Install/Uninstall button that needs update.
        if (this.selectedExtension && this.selectedExtension.bundleIdentifier === bundleIdentifier)
            this.selectedExtension.updateTitleElement();
    },

    extensionWasUninstalled: function(bundleIdentifier)
    {
        // Update the title element since it contains the Install/Uninstall button that needs update.
        if (this.selectedExtension && this.selectedExtension.bundleIdentifier === bundleIdentifier)
            this.selectedExtension.updateTitleElement();
    },

    certificateHasBeenRevoked: function(certificateName)
    {
        if (!this._availableCertificateNames)
            return;
        this._availableCertificateNames.remove(certificateName);
        for (var key in this.extensions)
            this.extensions[key].availableCertificateNamesDidChange();
    },

    get availableCertificateNames()
    {
        if (!this._availableCertificateNames)
            this._availableCertificateNames = ExtensionBuilderController.availableCertificateNames;
        return this._availableCertificateNames;
    },

    get selectedExtension()
    {
        return this._selectedExtension;
    },

    set selectedExtension(extension)
    {
        if (this._selectedExtension === extension)
            return;

        var contentElement = document.getElementById("content");

        contentElement.removeChildren();

        if (this._selectedExtension)
            this._selectedExtension.sidebarElement.removeStyleClass("selected");

        this._selectedExtension = extension;

        if (!this._selectedExtension)
            return;

        this._selectedExtension.sidebarElement.addStyleClass("selected");
        this._selectedExtension.sidebarElement.scrollIntoViewIfNeeded(true);
        contentElement.appendChild(this._selectedExtension.infoElement);
    },

    addButtonClicked: function(event)
    {
        const selectControl = event.target;
        var selectedOption = selectControl.options[selectControl.selectedIndex];
        if (!selectedOption)
            return;

        if (selectedOption.value === "new")
            ExtensionBuilderController.showNewExtensionSheet();
        else if (selectedOption.value === "add")
            ExtensionBuilderController.showBundlePickerSheet();

        // Revert the selectedIndex to -1 so nothing will have a checkmark in the menu.
        selectControl.selectedIndex = -1;
    },

    sidebarKeyDown: function(event)
    {
        if (!this.selectedExtension)
            return;

        var handled = false;
        var selectedSidebarElement = this.selectedExtension.sidebarElement;
        if (event.keyIdentifier === "Up" && selectedSidebarElement.previousSibling) {
            selectedSidebarElement.previousSibling.extension.select();
            handled = true;
        } else if (event.keyIdentifier === "Down" && selectedSidebarElement.nextSibling) {
            selectedSidebarElement.nextSibling.extension.select();
            handled = true;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    },

    windowFocused: function(event)
    {
        // This check catches frame documents as well as the main document.
        // Only do any work if the target is a document.
        if (event.target.document.nodeType !== Node.DOCUMENT_NODE)
            return;

        document.body.removeStyleClass("inactive");

        // Clear the certificate names so a latest list will be fetched when
        // the first extension's loadData updates the certificate element.
        delete this._availableCertificateNames;

        // Reload any data so changes that were made on disk get reflected.
        for (var key in this.extensions)
            this.extensions[key].loadData();
    },

    windowBlurred: function(event)
    {
        // This check catches frame documents as well as the main document.
        // Only do any work if the target is a document.
        if (event.target.document.nodeType !== Node.DOCUMENT_NODE)
            return;

        document.body.addStyleClass("inactive");

        // Save changes so they will be on disk if the user is going to edit something.
        for (var key in this.extensions)
            this.extensions[key].savePendingChanges();
    },

    windowUnloading: function(event)
    {
        // Save any changes so they are not lost before unloading.
        for (var key in this.extensions)
            this.extensions[key].savePendingChanges(true);

        ExtensionBuilderController.controllerUnloaded();
    }
}

function fileListGenerator(fileExtension, interfaceItem, extension)
{
    var subpaths = ExtensionBuilderController.subpathsForExtensionBundle(extension.bundleURL, fileExtension);

    var values = [""]; // None item
    if (subpaths.length) {
        values.push(null); // Divider
        values = values.concat(subpaths);
    }

    return {"Titles": [HTMLViewController.UIString("None"), "----"], "Values": values};
}

function identifierMenuGenerator(key, interfaceItem, extension)
{
    var identifiers = [];
    if (extension && extension[key]) {
        for (var i = 0; i < extension[key].length; ++i) {
            var identifier = extension[key][i]["Identifier"];
            if (identifier && !extension[key][i]["Separator"])
                identifiers.push(identifier);
        }
    }

    var values = [""]; // None item
    if (identifiers.length) {
        identifiers.sort();

        values.push(null); // Divider
        values = values.concat(identifiers);
    }

    return {"Titles": [HTMLViewController.UIString("None"), "----"], "Values": values};
}

function someWebsiteAccessCondition(interfaceItem, extension)
{
    return extension.websiteAccessLevel === "Some";
}

function someOrAllWebsiteAccessCondition(interfaceItem, extension)
{
    const accessLevel = extension.websiteAccessLevel;
    return accessLevel === "Some" || accessLevel === "All";
}

function whitelistAndBlacklistCondition(interfaceItem, extension)
{
    return extension.hasInjectedContent();
}

function multiValueCondition(interfaceItem, value)
{
    const type = value["Type"];
    return type === "ListBox" || type === "PopUpButton" || type === "RadioButtons";
}

function nonSeparatorAndHiddenCondition(interfaceItem, value)
{
    const type = value["Type"];
    return type && type !== "Hidden" && type !== "Separator";
}

function nonGroupAndSeparatorCondition(interfaceItem, value)
{
    const type = value["Type"];
    return type !== "Separator" && type !== "Group";
}

function textFieldCondition(interfaceItem, value)
{
    return value["Type"] === "TextField";
}

function checkBoxCondition(interfaceItem, value)
{
    return value["Type"] === "CheckBox";
}

function sliderCondition(interfaceItem, value)
{
    return value["Type"] === "Slider";
}

function defaultValueCondition(interfaceItem, value)
{
    return !value["Secure"] && nonGroupAndSeparatorCondition(interfaceItem, value);
}

function inspectGlobalPageCondition(interfaceItem, extension)
{
    return extension.installed && extension.globalPage;
}

function inspectGlobalPageCallback(extension)
{
    ExtensionBuilderController.showInspectorForExtensionGlobalPage(extension.bundleIdentifier, extension.certificateName);
}

function normalMenuItemCondition(interfaceItem, value)
{
    return value && !value["Separator"];
}

function separatorMenuItemCondition(interfaceItem, value)
{
    return value && value["Separator"];
}

function cannotBeEmptyValidator(interfaceItem, value)
{
    if (!value && interfaceItem["Title"])
        return HTMLViewController.UIString("%@ cannot be empty.").format(interfaceItem["Title"]);
    if (!value)
        return HTMLViewController.UIString("Cannot be empty.");
}

function popupRequiredValidator(interfaceItem, value)
{
    if (!value)
        return HTMLViewController.UIString("A selection is required.");
}

function descriptionValidator(interfaceItem, value)
{
    if (value && value.length > 100)
        return HTMLViewController.UIString("The description might be too long, causing it to be truncated.");
}

function bundleIdentifierValidator(interfaceItem, value)
{
    var error = cannotBeEmptyValidator(interfaceItem, value)
    if (error)
        return error;
    if (!ExtensionBuilderController.isValidBundleIdentifier(value))
        return HTMLViewController.UIString("Invalid bundle identifier.");
}

function urlValidator(interfaceItem, value)
{
    if (value && value.toLowerCase().indexOf("http://") !== 0 && value.toLowerCase().indexOf("https://") !== 0)
        return HTMLViewController.UIString("Invalid URL. A HTTP or HTTPS URL is required.");
}

function urlPatternValidator(interfaceItem, value)
{
    var error = cannotBeEmptyValidator(interfaceItem, value)
    if (error)
        return error;
    if (!ExtensionBuilderController.isValidURLPattern(value))
        return HTMLViewController.UIString("Invalid URL pattern.");
}

function domainPatternValidator(interfaceItem, value)
{
    var error = cannotBeEmptyValidator(interfaceItem, value)
    if (error)
        return error;
    if (!ExtensionBuilderController.isValidDomainPattern(value))
        return HTMLViewController.UIString("Invalid domain pattern.");
}
