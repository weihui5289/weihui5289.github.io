var MobileTest = {

    urlFieldSubmitted: function()
    {
        MobileTestController.navigateToURL(document.getElementById("urlField").value);
        return false;
    },

    loaded: function()
    {
        HTMLViewController.pageLoaded();
        MobileTestController.loaded(true);
        this.updateRotateAccessibilityHint();
    },

    backButtonPressed: function()
    {
        MobileTestController.goBack();
    },

    forwardButtonPressed: function()
    {
        MobileTestController.goForward();
    },
    
    rotateButtonPressed: function()
    {
        MobileTestController.rotate();
        
        this.updateRotateAccessibilityHint();
    },
    
    visibleURLUpdated: function(url)
    {
        document.getElementById("urlField").value = url;
    },
    
    titleUpdated: function(title)
    {
        document.getElementById("title").innerText = title;
    },

    backForwardButtonStatesChanged: function(backButtonEnabled, forwardButtonEnabled)
    {
        if (backButtonEnabled) {
            document.getElementById("backButton").removeStyleClass("disabled");
            document.getElementById("backButton").setAttribute("aria-disabled", "false");
        } else {
            document.getElementById("backButton").addStyleClass("disabled");
            document.getElementById("backButton").setAttribute("aria-disabled", "true");
        }
 
        if (forwardButtonEnabled) {
            document.getElementById("forwardButton").removeStyleClass("disabled");
            document.getElementById("forwardButton").setAttribute("aria-disabled", "false");
        } else {
            document.getElementById("forwardButton").addStyleClass("disabled");
            document.getElementById("forwardButton").setAttribute("aria-disabled", "true");
        }
    },

    updateRotateAccessibilityHint: function()
    {
        // Adorn with correct accessibility information.
        if (MobileTestController.isPortraitOrientation())
            document.getElementById("rotateButton").setAttribute("aria-help", "Rotate to Landscape");
        else
            document.getElementById("rotateButton").setAttribute("aria-help", "Rotate to Portrait");        
    },
}
