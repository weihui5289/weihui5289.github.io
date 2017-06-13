function refreshExtensionSettingsTableElement(tableElement, settings, secureSettings, dontValidate)
{
    if (!tableElement)
        return;

    const rows = tableElement.rows;
    for (var i = 0; i < rows.length; ++i) {
        if (typeof rows[i].refresh === "function")
            rows[i].refresh(settings, secureSettings, dontValidate, settings, secureSettings);
    }

    updateConditionalsForExtensionSettingsTableElement(tableElement, settings, secureSettings);
}

function validateExtensionSettingsTableElement(tableElement, settings, secureSettings)
{
    const rows = tableElement.rows;
    for (var i = 0; i < rows.length; ++i) {
        if (typeof rows[i].validate === "function")
            rows[i].validate(settings, secureSettings);
    }
}

function updateConditionalsForExtensionSettingsTableElement(tableElement, settings, secureSettings)
{
    const rows = tableElement.rows;
    for (var i = 0; i < rows.length; ++i) {
        if (typeof rows[i].condition === "function") {
            if (rows[i].condition(rows[i].interfaceItem, settings, secureSettings))
                rows[i].removeStyleClass("hidden");
            else
                rows[i].addStyleClass("hidden");
        }

        if (typeof rows[i].updateConditionals === "function")
            rows[i].updateConditionals(settings, secureSettings);
    }
}

function createExtensionSettingsTableElement(settingsInterfaceItems, settings, secureSettings, settingChangedCallback)
{
    var tableElement = document.createElement("table");
    tableElement.className = "extension-settings";

    const rows = createExtensionSettingsTableRows(settingsInterfaceItems, settings, secureSettings, settingChangedCallback, null, settings, secureSettings);
    for (var i = 0; i < rows.length; ++i)
        tableElement.appendChild(rows[i]);

    return tableElement;
}

function createExtensionSettingsTableRows(settingsInterfaceItems, settings, secureSettings, settingChangedCallback, parentInterfaceItem, rootSettings, rootSecureSettings, dontValidate)
{
    function isValidControl()
    {
        if (!interfaceItem)
            return false;
        if (parentInterfaceItem && parentInterfaceItem["Type"] === "Table" && parentInterfaceItem["Simple"])
            return true;
        if (!interfaceItem["Title"] && previousInterfaceItem["Type"] !== "Group")
            return false;
        if (!interfaceItem["Key"])
            return false;
        return true;
    }

    function isValidMultiValueControl()
    {
        if (!isValidControl())
            return false;
        if (typeof interfaceItem["DataSource"] === "function")
            return true;
        if (!interfaceItem["Titles"] || !interfaceItem["Values"])
            return false;
        if (interfaceItem["Titles"].length !== interfaceItem["Values"].length)
            return false;
        return true;
    }

    function valuesEqual(a, b)
    {
        // Checks if two values are identity equal first, since it is faster.
        if (a === b)
            return true;
        // Since the objects can be complex (array or object graphs), convert to JSON and string compare.
        try {
            if (JSON.stringify(a) === JSON.stringify(b))
                return true;
        } catch (e) { }
        return false;
    }

    function valueForInterfaceItem(interfaceItem, settings, secureSettings)
    {
        const settingsToUse = (interfaceItem["Secure"] ? secureSettings : settings);
        if (parentInterfaceItem && parentInterfaceItem["Type"] === "Table" && parentInterfaceItem["Simple"])
            return settingsToUse;
        if (interfaceItem["Key"] in settingsToUse)
            return settingsToUse[interfaceItem["Key"]];
        return interfaceItem["DefaultValue"];
    }

    function validateInput(interfaceItem, value, control)
    {
        if (typeof interfaceItem["Validator"] !== "function")
            return;

        const parentCell = control.enclosingNodeOrSelfWithNodeName("td");
        const result = interfaceItem["Validator"](interfaceItem, value);
        if (result) {
            parentCell.addStyleClass("invalid");
            if (typeof result === "string") {
                if (!parentCell.errorElement) {
                    var errorElement = document.createElement("div");
                    errorElement.className = "error-message";
                    parentCell.appendChild(errorElement);
                    parentCell.errorElement = errorElement;
                }

                parentCell.errorElement.textContent = result;
            }
        } else {
            parentCell.removeStyleClass("invalid");
            if (parentCell.errorElement) {
                parentCell.removeChild(parentCell.errorElement);
                delete parentCell.errorElement;
            }
        }
    }

    function validateControl(control, settings, secureSettings)
    {
        const interfaceItem = control.interfaceItem;
        const value = valueForInterfaceItem(interfaceItem, settings, secureSettings);
        validateInput(interfaceItem, value, control);
    }

    function handleSettingChange(control, newValue, deleted)
    {
        const interfaceItem = control.interfaceItem;
        settingChangedCallback(interfaceItem, newValue, deleted);
        validateInput(interfaceItem, newValue, control);
    }

    function handleTextFieldSettingChange(event)
    {
        const textField = event.target;
        handleSettingChange(textField, convertValue(textField.interfaceItem, textField.value));
    }

    function refreshTextField(textField, settings, secureSettings, dontValidate)
    {
        const value = valueForInterfaceItem(textField.interfaceItem, settings, secureSettings);
        textField.value = typeof value === "undefined" ? "" : value;
        if (!dontValidate)
            validateInput(interfaceItem, value, textField);
    }

    function handleCheckBoxSettingChange(event)
    {
        const checkBox = event.target;
        handleSettingChange(checkBox, checkBox.checked ? checkBox.trueSettingValue : checkBox.falseSettingValue);
    }

    function refreshCheckBox(checkBox, settings, secureSettings, dontValidate)
    {
        const value = valueForInterfaceItem(checkBox.interfaceItem, settings, secureSettings);
        checkBox.checked = valuesEqual(value, checkBox.trueSettingValue);
        if (!dontValidate)
            validateInput(interfaceItem, value, checkBox);
    }

    function handleRadioButtonSettingChange(event)
    {
        const radioButton = event.target;
        handleSettingChange(radioButton, radioButton.settingValue);
    }

    function refreshRadioButtons(radioButtons, settings, secureSettings, dontValidate)
    {
        const interfaceItem = radioButtons[0].interfaceItem;
        const value = valueForInterfaceItem(interfaceItem, settings, secureSettings);

        for (var i = 0; i < radioButtons.length; ++i)
            radioButtons[i].checked = valuesEqual(value, radioButtons[i].settingValue);

        if (!dontValidate)
            validateInput(interfaceItem, value, radioButtons[0]);
    }

    function handleSelectSettingChange(event)
    {
        const selectControl = event.target;
        const selectedOption = selectControl.options[selectControl.selectedIndex];
        handleSettingChange(selectControl, selectedOption ? selectedOption.settingValue : null, !selectedOption);
    }

    function buildSelect(selectControl, settings, secureSettings, rootSettings, rootSecureSettings)
    {
        const interfaceItem = selectControl.interfaceItem;
        var datasource = interfaceItem;
        if (typeof interfaceItem["DataSource"] === "function")
            datasource = interfaceItem["DataSource"](interfaceItem, rootSettings || settings, rootSecureSettings || secureSettings);

        selectControl.removeChildren();

        var values = datasource["Values"];
        var titles = datasource["Titles"];

        selectControl.size = interfaceItem["Type"] === "PopUpButton" ? 1 : Math.min(values.length, 6);

        for (var j = 0; j < values.length; ++j) {
            var title = titles[j] || values[j];
            if (title === "----") {
                selectControl.appendChild(document.createElement("hr"));
                continue;
            }

            var option = document.createElement("option");
            option.settingValue = values[j];
            option.textContent = title;
            selectControl.appendChild(option);
        }
    }

    function refreshSelect(selectControl, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings)
    {
        const interfaceItem = selectControl.interfaceItem;
        const value = valueForInterfaceItem(interfaceItem, settings, secureSettings);

        // If there is a datasource, rebuild the options to account for new/removed items.
        if (typeof interfaceItem["DataSource"] === "function")
            buildSelect(selectControl, settings, secureSettings, rootSettings, rootSecureSettings);

        const options = selectControl.options;

        var selectedIndex = "DefaultIndex" in interfaceItem ? interfaceItem["DefaultIndex"] : -1;
        for (var i = 0; i < options.length; ++i) {
            if (valuesEqual(value, options[i].settingValue))
                selectedIndex = i;
        }

        selectControl.selectedIndex = selectedIndex;

        if (!dontValidate)
            validateInput(interfaceItem, value, selectControl);
    }

    function handleTableRowChange(tableInterfaceItem, tableArray, tableBody, value, rowInterfaceItem, newValue, deleted)
    {
        if (tableInterfaceItem["Simple"]) {
            var index = tableBody.parentNode.indexOfChildNode(tableBody);
            if (index === -1)
                return;
            tableArray[index] = deleted ? null : newValue;
        } else
            value[rowInterfaceItem["Key"]] = deleted ? null : newValue;

        settingChangedCallback(tableInterfaceItem, tableArray);
    }

    function refreshTableEntryHeaders(table, tableInterfaceItem)
    {
        if (!tableInterfaceItem["RowHeaderLabel"])
            return;

        var headers = table.getElementsByClassName("header");
        for (var i = 0; i < headers.length; ++i)
            headers[i].textContent = tableInterfaceItem["RowHeaderLabel"].format(i + 1);
    }

    function handleTableEntryDelete(tableInterfaceItem, tableArray, tableBody, event)
    {
        var index = tableBody.parentNode.indexOfChildNode(tableBody);
        if (index === -1)
            return;

        // Remove the table body before calling settingChangedCallback. This is needed because the callback
        // can do a validate or update conditionals, which relies on this table's DOM being updated.
        const table = tableBody.parentNode;
        table.removeChild(tableBody);

        refreshTableEntryHeaders(table, tableInterfaceItem);

        tableArray.splice(index, 1);
        settingChangedCallback(tableInterfaceItem, tableArray);
    }

    function createTableEntry(tableInterfaceItem, tableArray, value, i, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings)
    {
        var tableBody = document.createElement("tbody");

        var deleteButton = document.createElement("button");
        deleteButton.className = "delete";
        deleteButton.addEventListener("click", handleTableEntryDelete.bind(window, tableInterfaceItem, tableArray, tableBody), false);

        if (!tableInterfaceItem["Simple"]) {
            var headerRow = document.createElement("tr");
            var headerCell = document.createElement("td");
            headerCell.setAttribute("colspan", "2");

            if (tableInterfaceItem["RowHeaderLabel"]) {
                var header = document.createElement("span");
                header.className = "header";
                header.textContent = tableInterfaceItem["RowHeaderLabel"].format(i + 1);
                headerCell.appendChild(header);
            }

            headerCell.insertBefore(deleteButton, headerCell.firstChild);

            headerRow.appendChild(headerCell);
            tableBody.appendChild(headerRow);
        }

        const template = tableInterfaceItem["Template"];
        var rows = createExtensionSettingsTableRows(template, value, value, handleTableRowChange.bind(window, tableInterfaceItem, tableArray, tableBody, value), tableInterfaceItem, rootSettings, rootSecureSettings, dontValidate);
        for (var j = 0; j < rows.length; ++j) {
            if (!j && tableInterfaceItem["Simple"]) {
                var deleteCell = document.createElement("td");
                deleteCell.className = "delete";
                deleteCell.appendChild(deleteButton);
                rows[j].appendChild(deleteCell);
            }

            tableBody.appendChild(rows[j]);
        }

        if (!tableInterfaceItem["Simple"]) {
            // Create an empty row that will be used for padding at the bottom. This is needed because conditional
            // rows can be hidden and the padding would be lost.
            var paddingRow = document.createElement("tr");
            var paddingCell = document.createElement("td");
            paddingCell.setAttribute("colspan", "2");
            paddingRow.appendChild(paddingCell);
            tableBody.appendChild(paddingRow);
        }

        return tableBody;
    }

    function convertValue(interfaceItem, value)
    {
        var valueType = interfaceItem["ValueType"] || "string";

        if (interfaceItem["AutoDetectValueType"]) {
            if (typeof value === "boolean" || value === "true" || value === "false")
                valueType = "boolean";
            else if (typeof value === "number" || parseFloat(value) == value)
                valueType = "number";
            else
                valueType = "string";
        }

        if (typeof value === valueType)
            return value;

        switch (valueType) {
        case "boolean":
            return value === "true";
        case "number":
            return parseFloat(value);
        case "string":
            return String(value);
        }
    }

    function valueForTableArrayValueAtIndex(tableInterfaceItem, tableArray, index)
    {
        // Convert the value or make an empty object if it dosen't match the table type.
        if (tableInterfaceItem["Simple"] && typeof tableArray[index] === "object")
            tableArray[index] = String(tableArray[index]);
        else if (!tableInterfaceItem["Simple"] && typeof tableArray[index] !== "object")
            tableArray[index] = {};
        return tableArray[index];
    }

    function refreshTable(table, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings)
    {
        const tableInterfaceItem = table.interfaceItem;
        var tableArray = valueForInterfaceItem(tableInterfaceItem, settings, secureSettings);

        if (!(tableArray instanceof Array))
            tableArray = [];

        // FIXME: Incrementally rebuild instead of throwing everything away and starting from scratch each time.
        table.removeChildren();

        for (var i = 0; i < tableArray.length; ++i) {
            var value = valueForTableArrayValueAtIndex(tableInterfaceItem, tableArray, i);
            table.appendChild(createTableEntry(tableInterfaceItem, tableArray, value, i, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings));
        }

        if (!tableInterfaceItem["Mutable"]) {
            if (!tableArray.length) {
                var emptyRow = document.createElement("tr");
                emptyRow.className = "empty";

                var emptyCell = document.createElement("td");
                emptyCell.textContent = HTMLViewController.UIString("Empty");

                emptyRow.appendChild(emptyCell);
                table.appendChild(emptyRow);
            }

            return;
        }

        function createNewRow()
        {
            var row = tableArray.length;

            tableArray.push(tableInterfaceItem["Simple"] ? "" : {});
            settingChangedCallback(tableInterfaceItem, tableArray);

            var tableEntry = createTableEntry(tableInterfaceItem, tableArray, tableArray[row], row, settings, secureSettings, false, rootSettings, rootSecureSettings);
            table.insertBefore(tableEntry, creationBody);

            var firstControl = tableEntry.querySelector("input, select");
            if (firstControl)
                firstControl.focus();
        }

        var creationBody = document.createElement("tbody");
        creationBody.className = "creation";

        var creationRow = document.createElement("tr");

        var creationCell = document.createElement("td");
        creationCell.setAttribute("colspan", tableInterfaceItem["Simple"] ? "3" : "2");

        var newEntryButton = document.createElement("button");
        newEntryButton.className = "flat";
        newEntryButton.textContent = tableInterfaceItem["CreateButtonLabel"] || HTMLViewController.UIString("New");
        newEntryButton.addEventListener("click", createNewRow, false);

        creationCell.appendChild(newEntryButton);
        creationRow.appendChild(creationCell);
        creationBody.appendChild(creationRow);
        table.appendChild(creationBody);
    }

    function validateTable(table, settings, secureSettings)
    {
        performTableActionOnTableControl(validateExtensionSettingsTableElement, table, settings, secureSettings);
    }

    function updateTableConditionals(table, settings, secureSettings)
    {
        performTableActionOnTableControl(updateConditionalsForExtensionSettingsTableElement, table, settings, secureSettings);
    }

    function performTableActionOnTableControl(actionFunction, table, settings, secureSettings)
    {
        const tableInterfaceItem = table.interfaceItem;
        var tableArray = valueForInterfaceItem(tableInterfaceItem, settings, secureSettings);

        if (!(tableArray instanceof Array))
            tableArray = [];

        var tableBodies = table.childNodes;
        for (var i = 0; i < tableBodies.length; ++i) {
            var tableBody = tableBodies[i];
            if (tableBody.hasStyleClass("creation"))
                continue;

            var value = valueForTableArrayValueAtIndex(tableInterfaceItem, tableArray, i);
            actionFunction(tableBody, value, value);
        }
    }

    function handleSliderSettingChange(event)
    {
        const slider = event.target;
        handleSettingChange(slider, parseFloat(slider.value));
    }

    function refreshSlider(sliderControl, settings, secureSettings, dontValidate)
    {
        const value = parseFloat(valueForInterfaceItem(sliderControl.interfaceItem, settings, secureSettings));
        sliderControl.value = value;
        if (!dontValidate)
            validateInput(interfaceItem, value, sliderControl);
    }

    var rows = [];

    for (var i = 0; i < settingsInterfaceItems.length; ++i) {
        var previousInterfaceItem = settingsInterfaceItems[i - 1];
        var interfaceItem = settingsInterfaceItems[i];

        var rowElement = document.createElement("tr");
        var controlCell = document.createElement("td");

        if (interfaceItem["Title"]) {
            var titleCell = document.createElement("th");
            titleCell.textContent = interfaceItem["Title"];
        } else
            var titleCell = null;

        rowElement.interfaceItem = interfaceItem;

        if (typeof interfaceItem["Condition"] === "function")
            rowElement.condition = interfaceItem["Condition"];

        switch (interfaceItem["Type"]) {
        case "Group":
            // Prevent empty groups at the end.
            if ((i + 1) >= settingsInterfaceItems.length)
                continue;
            // Prevent empty groups followed by another group.
            if (settingsInterfaceItems[i + 1] && settingsInterfaceItems[i + 1]["Type"] === "Group")
                continue;

            controlCell = null;
            rowElement.className = "group";
            break;

        case "Separator":
            // Prevent separators as the beginning and end.
            if (!i || (i + 1) >= settingsInterfaceItems.length)
                continue;
            // Prevent separators after another separator or as the first item in a group.
            if (settingsInterfaceItems[i - 1] && (settingsInterfaceItems[i - 1]["Type"] === "Separator" || settingsInterfaceItems[i - 1]["Type"] === "Group"))
                continue;
            // Prevent separators before a group.
            if (settingsInterfaceItems[i + 1] && settingsInterfaceItems[i + 1]["Type"] === "Group")
                continue;

            controlCell.appendChild(document.createElement("hr"));
            rowElement.className = "separator";
            titleCell = null;
            break;

        case "TextField":
            if (!isValidControl())
                continue;

            var inputControl = document.createElement("input");
            inputControl.type = (interfaceItem["Password"] ? "password" : "text");
            inputControl.name = interfaceItem["Key"];
            inputControl.interfaceItem = interfaceItem;
            inputControl.addEventListener("change", handleTextFieldSettingChange, false);
            controlCell.appendChild(inputControl);

            refreshTextField(inputControl, settings, secureSettings, dontValidate);

            rowElement.className = "text-field";
            rowElement.refresh = refreshTextField.bind(window, inputControl);
            rowElement.validate = validateControl.bind(window, inputControl);
            break;

        case "Button":
            if (!interfaceItem || !interfaceItem["Title"])
                continue;

            if (typeof interfaceItem["Callback"] !== "function")
                continue;

            var buttonControl = document.createElement("button");
            buttonControl.className = "flat";
            buttonControl.textContent = interfaceItem["Title"];
            buttonControl.addEventListener("click", interfaceItem["Callback"].bind(window, settings, secureSettings));
            controlCell.appendChild(buttonControl);

            rowElement.className = interfaceItem["Anchored"] ? "button anchored" : "button";

            if (interfaceItem["Anchored"])
                titleCell.removeChildren();
            else
                titleCell = null;

            break;

        case "CheckBox":
            if (!isValidControl())
                continue;

            var labelElement = document.createElement("label");
            var inputControl = document.createElement("input");
            inputControl.type = "checkbox";
            inputControl.name = interfaceItem["Key"];

            inputControl.trueSettingValue = ("TrueValue" in interfaceItem ? interfaceItem["TrueValue"] : true);
            inputControl.falseSettingValue = ("FalseValue" in interfaceItem ? interfaceItem["FalseValue"] : false);
            inputControl.interfaceItem = interfaceItem;
            inputControl.addEventListener("change", handleCheckBoxSettingChange, false);

            labelElement.appendChild(inputControl);
            labelElement.appendChild(document.createTextNode(interfaceItem["Title"]));
            controlCell.appendChild(labelElement);

            refreshCheckBox(inputControl, settings, secureSettings, dontValidate);

            rowElement.className = interfaceItem["Anchored"] ? "check-box anchored" : "check-box";
            rowElement.refresh = refreshCheckBox.bind(window, inputControl);
            rowElement.validate = validateControl.bind(window, inputControl);

            if (interfaceItem["Anchored"])
                titleCell.removeChildren();
            else
                titleCell = null;

            break;

        case "RadioButtons":
            if (!isValidMultiValueControl())
                continue;

            var inputControls = [];
            var values = interfaceItem["Values"];
            var titles = interfaceItem["Titles"];
            for (var j = 0; j < values.length; ++j) {
                var labelElement = document.createElement("label");
                var inputControl = document.createElement("input");
                inputControl.type = "radio";
                inputControl.name = interfaceItem["Key"];
                inputControl.settingValue = values[j];
                inputControl.interfaceItem = interfaceItem;
                inputControl.addEventListener("change", handleRadioButtonSettingChange, false);
                inputControls.push(inputControl);

                labelElement.appendChild(inputControl);
                labelElement.appendChild(document.createTextNode(titles[j]));

                controlCell.appendChild(labelElement);
                controlCell.appendChild(document.createElement("br"));
            }

            refreshRadioButtons(inputControls, settings, secureSettings, dontValidate);

            rowElement.className = "radio-buttons";
            rowElement.refresh = refreshRadioButtons.bind(window, inputControls);
            rowElement.validate = validateControl.bind(window, inputControls[0]);
            break;

        case "PopUpButton":
        case "ListBox":
            if (!isValidMultiValueControl())
                continue;

            var inputControl = document.createElement("select");
            inputControl.name = interfaceItem["Key"];
            inputControl.interfaceItem = interfaceItem;
            inputControl.addEventListener("change", handleSelectSettingChange, false);

            buildSelect(inputControl, settings, secureSettings, rootSettings, rootSecureSettings);

            controlCell.appendChild(inputControl);

            refreshSelect(inputControl, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings);

            rowElement.className = interfaceItem["Type"] === "PopUpButton" ? "pop-up-button" : "list-box";
            rowElement.refresh = refreshSelect.bind(window, inputControl);
            rowElement.validate = validateControl.bind(window, inputControl);
            break;

        case "Table":
            if (!isValidControl())
                continue;

            const template = interfaceItem["Template"];
            if (!(template instanceof Array))
                continue;

            var containsInvalidTemplateItem = false;
            for (var j = 0; j < template.length; ++j) {
                switch (template[j]["Type"]) {
                    // Only some control types are allowed in tables.
                    case "CheckBox":
                    case "Custom":
                    case "PopUpButton":
                    case "RadioButtons":
                    case "Separator":
                    case "Slider":
                    case "Table":
                    case "TextField":
                        continue;
                    default:
                        containsInvalidTemplateItem = true;
                        break;
                }
            }

            if (containsInvalidTemplateItem)
                continue;

            var container = document.createElement("div");
            container.className = "table-container";

            var inputControl = document.createElement("table");
            inputControl.interfaceItem = interfaceItem;
            container.appendChild(inputControl);
            controlCell.appendChild(container);

            refreshTable(inputControl, settings, secureSettings, dontValidate, rootSettings, rootSecureSettings);

            rowElement.className = interfaceItem["Simple"] ? "table simple" : "table";
            rowElement.refresh = refreshTable.bind(window, inputControl);
            rowElement.validate = validateTable.bind(window, inputControl);
            rowElement.updateConditionals = updateTableConditionals.bind(window, inputControl);
            break;

        case "Slider":
            if (!isValidControl())
                continue;

            var inputControl = document.createElement("input");
            inputControl.type = "range";
            inputControl.name = interfaceItem["Key"];
            inputControl.min = parseFloat(interfaceItem["MinimumValue"]) || 0;
            inputControl.max = parseFloat(interfaceItem["MaximumValue"]) || 100;
            inputControl.step = parseFloat(interfaceItem["StepValue"]) || 1;
            inputControl.interfaceItem = interfaceItem;
            inputControl.addEventListener("change", handleSliderSettingChange, false);
            controlCell.appendChild(inputControl);

            refreshSlider(inputControl, settings, secureSettings, dontValidate);

            rowElement.className = "slider";
            rowElement.refresh = refreshSlider.bind(window, inputControl);
            rowElement.validate = validateControl.bind(window, inputControl);
            break;

        case "Custom":
            rowElement.className = "custom";

            if (typeof interfaceItem["Generator"] !== "function")
                continue;

            controlCell = interfaceItem["Generator"](interfaceItem, rowElement, settings, secureSettings);
            break;

        default:
            continue;
        }

        if (titleCell) {
            if (!controlCell)
                titleCell.setAttribute("colspan", "2");
            rowElement.appendChild(titleCell);
        }

        if (controlCell) {
            if (!titleCell)
                controlCell.setAttribute("colspan", "2");
            rowElement.appendChild(controlCell);
        }

        if (interfaceItem["Classes"])
            rowElement.className += " " + interfaceItem["Classes"];

        if (rowElement.condition && !rowElement.condition(interfaceItem, settings, secureSettings))
            rowElement.addStyleClass("hidden");

        if (rowElement.cells.length)
            rows.push(rowElement);
    }

    return rows;
}
