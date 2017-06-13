-- Main entry point for PubSub template expansion


local format  = string.format
local gsub    = string.gsub
local find    = string.find
local strsub  = string.sub

local concat  = table.concat
local tinsert = table.insert

local compiledTemplates = {}


-- shortcut for localized strings; just use LOC.kSomeKey or LOC['kSomeKey']
LOC = {}
locmeta = {}
function locmeta.__index(table,key)
    local value = pubsub.getLocalizedString(key)
    assert(value, "No localized string")
    rawset(table,key,value) -- cache the value, for performance
    return value
end
setmetatable(LOC,locmeta)

-- escape a string for substitution in HTML text
local kHTMLMap = {['<'] = '&lt;', ['>'] = '&gt;', ['&'] = '&amp;', ['"'] = '&quot;', ["'"] = '&apos;' }
function escape( str )
    if str then
        return string.gsub(str, '([<>&"\'])', function(chr)
                                                return kHTMLMap[chr]
                                              end)
    else
        return str
    end
end

function isAllowableURL(url)
    if url then
        return string.find(url, "^http:") or string.find(url, "^https:")
    else
        return false
    end
end

local function out (s, i, f)
    s = strsub(s, i, f or -1)
    if s == "" then return s end
    -- we could use `%q' here, but this way we have better control
    s = gsub(s, "([\\\n\'])", "\\%1")
    return format(" emit('%s'); ", s)
end


function translate (s)
    s = gsub(s, "<%%(.-)%%>", "<?lua %1 ?>")

    local res = {}
    local start = 1   -- start of untranslated part in `s'

    while true do
        local ip, fp, target, exp, code = find(s, "<%?(%w*)[ \t]*(=?)(.-)%?>", start)
        if not ip then break end

        tinsert(res, out(s, start, ip-1))

        if target ~= "" and target ~= "lua" then
            -- not for Lua; pass whole instruction to the output
            tinsert(res, out(s, ip, fp))
        else
            if exp == "=" then   -- expression?
                tinsert(res, format(" emit(%s);", code))
            else  -- command
                tinsert(res, format(" %s ", code))
            end
        end

        start = fp + 1
    end

    tinsert(res, out(s, start))

    return concat(res)
end


-- Compile the contents string and store the resulting function in compiledTemplates[name]
function compileTemplate (name, contents)
    local prog = "return function(emit, model)\n" .. translate(contents) .. "\nend"
    local code,err = loadstring(prog);

    if code then
        local f = code();
        compiledTemplates[name] = f;
    else
        error(err);
    end
end


-- Run the named precompiled template, with the given model
function applyTemplate (name, model)
    local f = compiledTemplates[name]
    if not f then
        error("template " .. name .. " not compiled");
    end
    
    local resultStrings = {};
    local function collectOutput(str)
        if str then
            tinsert(resultStrings, tostring(str))
        end
    end

    f(collectOutput, model)             -- SHAZAM! Evaluate the compiled template
        
    return concat(resultStrings)
end

