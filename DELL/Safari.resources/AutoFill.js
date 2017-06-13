// Keep in synch with FormAutoFillTypes.h
const UndeterminedAutoFillFormType = 0;
const AutoFillableStandardForm = 1;
const NonAutoFillableForm = 2;
const AutoFillableLoginForm = 3;

Node.prototype.traversePreviousNode = function(stayWithin)
{
    if (!this)
        return;
    if (stayWithin && this === stayWithin)
        return null;
    var node = this.previousSibling;
    while (node && node.lastChild)
        node = node.lastChild;
    if (node)
        return node;
    return this.parentNode;
}

Node.prototype.traverseNextNode = function(stayWithin)
{
    if (!this)
        return;

    var node = this.firstChild;
    if (node)
        return node;

    if (stayWithin && this === stayWithin)
        return null;

    node = this.nextSibling;
    if (node)
        return node;

    node = this;
    while (node && !node.nextSibling && (!stayWithin || !node.parentNode || node.parentNode !== stayWithin))
        node = node.parentNode;
    if (!node)
        return null;

    return node.nextSibling;
}

Node.prototype.isVisible = function()
{
    var node = this;

    // Text nodes aren't elements, but the text node's parent will be an element.
    var element = node.nodeType == Node.TEXT_NODE ? node.parentNode : node;
    console.assert(element);
    var computedStyle = getComputedStyle(element, null);
    console.assert(computedStyle);

    return computedStyle.getPropertyValue('visibility') === 'visible';
}

RegExp.prototype.searchReverse = function(string)
{
    // FIXME: This could be faster if it actually searched backwards.
    // Instead, it just searches forwards - multiple times - until it finds the last match.
    var lastMatch;

    var match;
    while (match = this.exec(string)) {
        var pos = match.index;
        var matchLength = match[0].length;

        var lastPos = -1;
        var lastMatchLength = -1;
        if (lastMatch) {
            var lastPos = lastMatch.index;
            var lastMatchLength = lastMatch[0].length;
        }

        if (pos + matchLength > lastPos + lastMatchLength) {
            // Replace last match if this one is later and not a subset of the last match.
            lastMatch = match;
        }
        // lastIndex is used by the regex engine to set the start of the next possible match.
        this.lastIndex = pos + 1;
    }

    return lastMatch;
}

RegExp.prototype.longestMatch = function(string)
{
    // Return the longest match we can find in the whole string.
    var longestMatch;

    var match;
    while (match = this.exec(string)) {
        if (!longestMatch || match[0].length > longestMatch[0].length)
            longestMatch = match;
        // lastIndex is used by the regex engine to set the start of the next possible match.
        this.lastIndex = match.index + 1;
    }
    return longestMatch;
}

AutoFill = function() {
    this._forms = [];
    this._formMetadata = [];
};

AutoFill.prototype = {
    // When trying to determine whether an object is hidden, we test for a minimal
    // offsetWidth/Height, which catches "display: none", and any value of
    // "visibility" property other than "visible" (e.g., "hidden" and
    // "collapsed"). Testing for width/height of 1 rather than 0 catches cases on
    // some sites (see 9090399).
    // Note that there are lots of other ways to hide a DOMElement from the
    // user's sight, so this isn't a complete fix for the general problem. Other
    // ways include opacity of 0 on this or containing element, obscuring by
    // covering with another element, being clipped out of sight, etc.
    _isFormControlHidden: function(element) {
        if (element.offsetWidth < 2)
            return true;
        if (element.offsetHeight < 2)
            return true;
        if (window.getComputedStyle(element, null).getPropertyValue('visibility') !== 'visible')
            return true;
        return false;
    },

    _createRegExpForLabels: function(labels)
    {
        var startsWithWordPattern = /^\w/;
        var endsWithWordPattern = /\w$/;
        var pattern = "";
        var numLabels = labels.length;
        for (var i = 0; i < labels.length; ++i) {
            if (i)
                pattern += '|';

            // Search for word boundaries only if label starts/ends with "word characters".
            // If we always searched for word boundaries, this wouldn't work for languages
            // such as Japanese.
            var label = labels[i];
            if (startsWithWordPattern.test(label))
                pattern += "\\b";
            pattern += label;
            if (endsWithWordPattern.test(label))
                pattern += "\\b";
        }
        return new RegExp(pattern, "ig");
    },
    
    // Because Form elements can reference children by their name, when getting tagName
    // try both tagName and nodeName to get a string, otherwise return null.
    _getTagName: function(node)
    {
        var tagName = node.tagName;
        if (typeof tagName === "string")
            return tagName;
        else {
            tagName = node.nodeName;
            if (typeof tagName === "string")
                return tagName;
        }
    },

    _searchForLabelsAboveCell: function(regExp, cell)
    {
        var computedStyle = window.getComputedStyle(cell, null);
        if (!computedStyle || computedStyle.getPropertyValue("display") !== "table-cell")
            return null;

        var cellAbove = AutoFillJSController.cellAbove(cell);
        if (!cellAbove)
            return null;

        // Search within the above cell we found for a match.
        var lengthSearched = 0;
        for (var n = cellAbove.firstChild; n; n = n.traverseNextNode(cellAbove)) {
            if (n.nodeType == Node.TEXT_NODE && n.isVisible()) {
                var nodeString = n.nodeValue;
                var lastMatch = regExp.searchReverse(nodeString);
                if (lastMatch) {
                    return {
                        Distance: lengthSearched,
                        Match: lastMatch[0],
                    }
                }
                lengthSearched += nodeString.length;
            }
        }
        // Any reason in practice to search all cells that are above the cell?
        return null;
    },

    _searchForLabelsBeforeElement: function(labels, element) {
        // FIXME <rdar://problem/8537213>: If the element has an id, we should try
        // searching for an explicit <label> for this element.
        var regExp = this._createRegExpForLabels(labels);

        // We stop searching after we've seen this many chars
        const charsSearchedThreshold = 500;

        // This is the absolute max we search.  We allow a little more slop than
        // charsSearchedThreshold, to make it more likely that we'll search whole nodes.
        const maxCharsSearched = 600;

        // If the starting element is within a table, the cell that contains it
        var startingTableCell;
        var searchedCellAbove = false;

        // Walk backwards in the node tree until we encounter another element,
        // form, or end of tree
        var lengthSearched = 0;

        for (var n = element.traversePreviousNode(); n && lengthSearched < charsSearchedThreshold; n = n.traversePreviousNode()) {
            var tagName = this._getTagName(n);
            if (tagName)
                tagName = tagName.toLowerCase();

            if (tagName === "form" || this._isFormControl(n)) {
                // We hit another form element or the start of the form - bail out.
                break;
            } else if (tagName === "td" && !startingTableCell) {
                startingTableCell = n;
            } else if (tagName === "tr" && startingTableCell) {
                var result = this._searchForLabelsAboveCell(regExp, startingTableCell);
                if (result) {
                    result.IsInCellAbove = true;
                    return result;
                }
                searchedCellAbove = true;
            } else if (n.nodeType == Node.TEXT_NODE && n.isVisible()) {
                // For each text chunk, run the regexp
                var nodeString = n.nodeValue;
                if (lengthSearched + nodeString.length > maxCharsSearched)
                    nodeString = nodeString.substr(-(charsSearchedThreshold - lengthSearched));
                var lastMatch = regExp.searchReverse(nodeString);
                if (lastMatch) {
                    return {
                        Distance: lengthSearched,
                        Match: lastMatch[0],
                    }
                }
                lengthSearched += nodeString.length;
            }
        }

        // If we started in a cell, but bailed because we found the start of the form or the
        // previous element, we still might need to search the row above us for a label.
        if (startingTableCell && !searchedCellAbove) {
            var result = this._searchForLabelsAboveCell(regExp, startingTableCell);
            if (result) {
                result.IsInCellAbove = true;
                return result;
            }
        }
        return null;
    },

    _matchLabelsAgainstString: function(labels, string)
    {
        if (!string)
            return null;

        // Make numbers and _'s in field names behave like word boundaries, e.g., "address2"
        var stringWithWordBoundaries = string.replace(/[\d_]/g, ' ');

        var regExp = this._createRegExpForLabels(labels);
        var match = regExp.longestMatch(stringWithWordBoundaries);
        if (!match)
            return null;

        return match[0];
    },

    _matchLabelsAgainstElement: function(labels, element)
    {
        // Match against the name element, then against the id element if no match is found for the name element.
        // See 7538330 for one popular site that benefits from the id element check.
        var result = this._matchLabelsAgainstString(labels, element.name);
        if (result)
            return result;

        return this._matchLabelsAgainstString(labels, element.id);
    },

    _matchForElement: function(element, fieldLabelSets, useName)
    {
        if (!element)
            return null;

        if (useName) {
            // Look for a match by checking the name attribute of the form element
            for (var pass = 0; pass < fieldLabelSets.length; ++pass) {
                var nameMatch = this._matchLabelsAgainstElement(fieldLabelSets[pass], element);
                if (!nameMatch)
                    continue;

                return {
                    FoundByPageScan: false,
                    Match: nameMatch.toLowerCase(),
                }
            }
        }

        // No match in the name attribute; look for a match by scanning text that occurs before the element.
        // Search through all passes because the physical distance is more important than the quality of the match (see zip code issue in 7538495).
        var bestPageScanMatch = null;
        for (var pass = 0; pass < fieldLabelSets.length; ++pass) {
            var pageScanMatch = this._searchForLabelsBeforeElement(fieldLabelSets[pass], element);
            // We shouldn't be getting empty matches here, but we'll be robust against them anyway (see 5079700).
            console.assert(!pageScanMatch || pageScanMatch.Match.length);
            if (pageScanMatch && pageScanMatch.Match.length) {
                // Check whether this match is better than our previous best. Any match is better than no match. Matches that are not in
                // the cell above are preferred to matches in the cell above. If both matches are not in the cell above, or both matches
                // are in the cell above, then the match with the smaller distance is preferred. Ties go to the first match found, since
                // each pass is considered a lower-quality match than the previous pass.
                var newMatchIsBest = !bestPageScanMatch || (!pageScanMatch.IsInCellAbove && bestPageScanMatch.IsInCellAbove) || (pageScanMatch.IsInCellAbove == bestPageScanMatch.IsInCellAbove && pageScanMatch.Distance < bestPageScanMatch.Distance);
                if (newMatchIsBest)
                    bestPageScanMatch = pageScanMatch;
            }
        }

        if (bestPageScanMatch) {
            bestPageScanMatch.FoundByPageScan = true;
            bestPageScanMatch.Match = bestPageScanMatch.Match.toLowerCase();
        }

        return bestPageScanMatch;
    },

    setAddressBookFieldLabels: function(primaryLabels, secondaryLabels)
    {
        this._primaryLabels = primaryLabels;
        this._secondaryLabels = secondaryLabels;
    },

    setCreditCardFieldLabels: function(creditCardLabels, securityCodeLabels)
    {
        this._creditCardLabels = creditCardLabels;
        this._securityCodeLabels = securityCodeLabels;
    },

    _addressBookLabelForElement: function(element)
    {
        if (!this._primaryLabels)
            return null;

        if (!this._isAutoFillableTextField(element))
            return null;

        var primaryMatch = this._matchForElement(element, this._primaryLabels, true);
        var primaryMatchLabel = primaryMatch ? primaryMatch.Match : null;

        if (primaryMatch && !primaryMatch.FoundByPageScan)
            return primaryMatchLabel;

        if (!this._secondaryLabels)
            return primaryMatchLabel;

        var secondaryMatch = this._matchForElement(element, this._secondaryLabels, true);
        var secondaryMatchLabel = secondaryMatch ? secondaryMatch.Match : null;

        if (secondaryMatch && !secondaryMatch.FoundByPageScan)
            return secondaryMatchLabel;

        return primaryMatchLabel ? primaryMatchLabel : secondaryMatchLabel;
    },

    _elementAllowsAutocomplete: function(element) {
        var autocomplete = element.getAttribute("autocomplete");
        return !autocomplete || autocomplete.toLowerCase() !== "off";
    },
    
    _isInputElement: function(element) {
        var tagName = this._getTagName(element);
        return tagName && tagName.toLowerCase() === "input";
    },
    
    _isTextArea: function(element) {
        var tagName = this._getTagName(element);
        return tagName && tagName.toLowerCase() === "textarea";
    },

    _isFormControl: function(element) {
        console.assert(element);
        if (!this._getTagName(element))
            return false;

        const formControlTagNames = {
            input: true,
            isindex: true,
            fieldset: true,
            legend: true,
            meter: true,
            optgroup: true,
            option: true,
            progress: true,
            select: true,
            textarea: true,
        }
        return this._getTagName(element).toLowerCase() in formControlTagNames;
    },

    _isTextField: function(element) {
        if (!this._isInputElement(element))
            return false;

        const textFieldInputTypes = {
            color : true,
            date : true,
            datetime : true,
            datetimelocal : true,
            email : true,
            isindex : true,
            month : true,
            number : true,
            password : true,
            search : true,
            telephone : true,
            text : true,
            time : true,
            url : true,
            week : true,
        }

        const nonTextFieldInputTypes = {
            button : true,
            checkbox : true,
            file : true,
            hidden : true,
            image : true,
            radio : true,
            range : true,
            reset : true,
            submit : true,
        }

        var type = element.type;

        // No "type" attribute gets default "text" type.
        if (!type)
            return true;

        type = type.toLowerCase();

        if (type in textFieldInputTypes)
            return true;

        console.assert(nonTextFieldInputTypes[type]);
        return false;
    },

    _isPasswordField: function(element) {
        if (!this._isInputElement(element))
            return false;

        var type = element.type;
        return type && type.toLowerCase() === "password";
    },

    _isAutoFillableTextField: function(element) {
        if (!this._isTextField(element))
            return false;

        if (element.disabled || element.readOnly)
            return false;

        if (!element.name)
            return false;

        return true;
    },

    _looksLikeCreditCardNumberField: function(element) {
        if (!this._creditCardLabels)
            return false;

        if (!this._isAutoFillableTextField(element))
            return false;

        return !!this._matchForElement(element, this._creditCardLabels, true);
    },

    _looksLikeCreditCardSecurityCodeField: function(element) {
        if (!this._securityCodeLabels)
            return false;

        if (!this._isAutoFillableTextField(element))
            return false;

        return !!this._matchForElement(element, this._securityCodeLabels, true);
    },

    _collectControlMetadata: function(control) {
        var controlData = {
            // These property names match the keys in InjectedBundleMessageKeys.
            ControlTagName: this._getTagName(control),
            ControlFieldName: control.name,
            ControlIsActiveElement: control === document.activeElement,
            ControlIsDisabled: control.disabled,
            ControlIsReadOnly: control.readOnly,
            ControlIsTextField: this._isTextField(control),
            ControlIsPasswordField: this._isPasswordField(control),
            ControlLooksLikeCreditCardNumberField: this._looksLikeCreditCardNumberField(control),
            ControlLooksLikeCreditCardSecurityCodeField: this._looksLikeCreditCardSecurityCodeField(control),
            ControlMaxLength: control.maxLength,
            ControlValue: control.value,
            AllowsAutocomplete: this._elementAllowsAutocomplete(control),
            AddressBookLabel: this._addressBookLabelForElement(control),
        };
        return controlData;
    },

    _collectFormMetadata: function(form, formID) {
        var formData = {
            // These property names match the keys in InjectedBundleMessageKeys.
            FormID: formID,
            ContainsActiveElement: false,
            FormControls: [],
            AllowsAutocomplete: this._elementAllowsAutocomplete(form),
            AutoFillFormType: AutoFillableStandardForm,
            UsernameElementName: undefined,
            PasswordElementName: undefined,
        };

        if (!formData.AllowsAutocomplete) {
            formData.AutoFillFormType = NonAutoFillableForm;
            return formData;
        }

        var textFieldsCount = 0;
        var secureTextFieldsCount = 0;
        var allowsAutoCompleteInUsername = true;

        for (var i = 0; i < form.elements.length; ++i) {
            var control = form.elements[i];

            if (this._isFormControlHidden(control))
                continue;

            var controlData = this._collectControlMetadata(control);
            formData.FormControls.push(controlData);
            
            if (controlData.ControlIsActiveElement)
                formData.ContainsActiveElement = true;

            if (!controlData.ControlIsTextField)
                continue;

            if (!controlData.ControlIsPasswordField) {
                // Assume first plain text field is username; we'll clear this later if we change our mind.
                if (!formData.UsernameElementName)
                    formData.UsernameElementName = controlData.ControlFieldName;
                if (!controlData.AllowsAutocomplete)
                    allowsAutoCompleteInUsername = false;
                ++textFieldsCount;
            } else {
                // Assume first secure text field is password; we'll clear this later if we change our mind.
                if (!formData.PasswordElementName)
                    formData.PasswordElementName = controlData.ControlFieldName;
                ++secureTextFieldsCount;
                // FIXME: Might be nice to check for whether the password autocompletes too.
                // In old WebKit we didn't make this check because the API didn't support it,
                // but that seemed OK because the important forms (e.g. Wells Fargo) either
                // have autocomplete=off set on the username field or on the entire form.
            }
        }

        if (textFieldsCount == 1 && secureTextFieldsCount == 1 && formData.UsernameElementName) {
            // We found the right set of elements, so treat this form as an AutoFillableLoginForm
            // unless autofill has been explicitly turned off.
            if (allowsAutoCompleteInUsername) {
                formData.AutoFillFormType = AutoFillableLoginForm;
                console.assert(formData.PasswordElementName);
            } else
                formData.AutoFillFormType = NonAutoFillableForm;
        } else if (textFieldsCount <= 2 && secureTextFieldsCount != 0) {
            // We found some other bunch of stuff that we don't want to save autocomplete data for,
            // possibly a login with extra text field (like NT domain), possibly a change
            // password form.
            formData.AutoFillFormType = NonAutoFillableForm;
        }

        if (formData.AutoFillFormType != AutoFillableLoginForm) {
            formData.UsernameElementName = undefined;
            formData.PasswordElementName = undefined;
        }
        return formData;
    },
    
    _cachedMetadataForForm: function(form) {
        var index = this._forms.indexOf(form);
        if (index === -1)
            return null;
        
        return this._formMetadata[index];
    },

    _collectMetadata: function() {
        this._forms = [];
        this._formMetadata = [];

        var forms = document.getElementsByTagName("form");
        for (var i = 0; i < forms.length; ++i) {
            var form = forms[i];
            this._forms.push(form);
            this._formMetadata.push(this._collectFormMetadata(form, i));
        }
    },

    formsAndMetadata: function() {
        this._collectMetadata();
        return [this._forms, this._formMetadata];
    },
    
    formControl: function(formID, controlName) {
        // Walk through forms saved previously, looking for one with the same ID.
        // We could keep a mapping, but it might be overkill since the vast majority
        // of pages have 0, 1, or 2 forms.
        for (var i = 0; i < this._formMetadata.length; ++i) {
            var metadata = this._formMetadata[i];
            if (metadata.FormID == formID)
                return this._forms[i][controlName];
        }
        
        return null;
    },
    
    selectIfTextField: function(control) {
        if (this._isTextField(control))
            control.select();
    },
    
    textFieldMetadata: function(textField) {
        // Returns a three-element array. The first element is a dictionary of metadata about
        // this text field. The second element is a dictionary of metadata about this text
        // field's form. The third element is a boolean representing whether this text field
        // is eligible for autocompletion.
        var result = [null, null, null];
        var canAutocomplete = true;
        
        // If this isn't a text field, return no information.
        if (!this._isTextField(textField))
            return result;
        
        // Also return no information if the text field isn't in a form, or we can't find any
        // data about the form.
        var form = textField.form;
        if (!form)
            return result;
        
        var formMetadata = this._cachedMetadataForForm(form);
        if (!formMetadata)
            return result;
        
        // Don't autocomplete passwords.
        if (this._isPasswordField(textField))
            canAutocomplete = false;
        
        // Only autocomplete in standard forms and in login forms (but only in the username field; we've
        // already ruled out password fields).
        if (formMetadata.AutoFillFormType != AutoFillableStandardForm && formMetadata.AutoFillFormType != AutoFillableLoginForm)
            canAutocomplete = false;

        // Start with the metadata that's used for autofill (as distinct from autocomplete).
        var textFieldData = this._collectControlMetadata(textField);

        // Rule out the various criteria that would make this field not eligible for autocomplete.
        if (!textFieldData.AllowsAutocomplete)
            canAutocomplete = false;
        
        if (!textFieldData.ControlFieldName.length)
            canAutocomplete = false;
                
        // Add in additional metadata needed for autocomplete UI.
        // These property names match the keys in InjectedBundleMessageKeys.
        var rect = textField.getBoundingClientRect();
        textFieldData.SelectionStart = textField.selectionStart;
        textFieldData.SelectionLength = textField.selectionEnd - textField.selectionStart;
        
        // FIXME (WebKit2) 8552928: Need to pass info to identify font.
        
        result[0] = textFieldData;
        result[1] = formMetadata;
        result[2] = canAutocomplete;

        return result;
    },
    
    replaceFormFieldRangeAndSelectTail: function(formID, controlName, rangeStart, rangeLength, replacementString, selectionStart) {
        var formField = this.formControl(formID, controlName);
        if (!formField)
            return;
        
        if (!this._isTextField(formField))
            return;

        var oldValue = formField.value;
        var newValue = oldValue.substr(0, rangeStart) + replacementString + oldValue.substr(rangeStart + rangeLength);
        formField.value = newValue;
        formField.selectionStart = selectionStart;
        formField.selectionEnd = newValue.length;
    },
    
    visibleNonEmptyFormTextControls: function() {
        // Returns a two-element array. The first element is an array of visible non-empty text fields (input elements).
        // The second element is an array of non-empty textareas.
        var nonEmptyTextFields = [];
        var nonEmptyTextAreas = [];
        var result = [];
        result[0] = nonEmptyTextFields;
        result[1] = nonEmptyTextAreas;
        
        var forms = document.getElementsByTagName("form");
        for (var formIndex = 0; formIndex < forms.length; ++formIndex) {
            var form = forms[formIndex];
            for (var elementIndex = 0; elementIndex < form.elements.length; ++elementIndex) {
                var control = form.elements[elementIndex];

                if (this._isFormControlHidden(control))
                    continue;
                
                // At least HTMLFieldSetElements can be in the form's list with an undefined "value".
                if (control.value == undefined || !control.value.length)
                    continue;
                
                if (this._isTextField(control))
                    result[0].push(control);
                else if (this._isTextArea(control))
                    result[1].push(control);
            }
        }
        
        return result;
    }
};

var AutoFillJS = new AutoFill;
