local M = {}

local uniqueIdLookupTable = {}
local curId = 0

local function getOrAddId(key)
    if uniqueIdLookupTable[key] then
        return uniqueIdLookupTable[key]
    else
        curId = curId + 1
        uniqueIdLookupTable[key] = curId
        return uniqueIdLookupTable[key]
    end
end

local function buildTriggerTypes(path)
    for _,file in ipairs(FS:findFiles(path, "*.lua", 0, false, false)) do
        dump(file)
        --[[
        local f, err = loadfile(file, "t")
        if not f and err then
            print("Can't create function: ")
            print(err)
        end

        if f then
            writeFile(file:gsub("%.lua", ".SCREENTRIGGER"), string.dump(f))
        end
        ]]
        writeFile(file:gsub("%.lua", ".SCREENTRIGGER"), readFile(file))
    end
end

local function buildExtensions(path)
    for _,file in ipairs(FS:findFiles(path, "*.lua", 0, false, false)) do
        dump(file)
        --[[
        local f, err = loadfile(file, "t")
        if not f and err then
            print("Can't create function: ")
            print(err)
        end

        if f then
            writeFile(file:gsub("%.lua", ".SCREENEXT"), string.dump(f))
        end
        ]]
        writeFile(file:gsub("%.lua", ".SCREENEXT"), readFile(file))
    end
end

local function buildScreenApplyFunc(path)
    local file = path:gsub("%.json", ".SCREENAPPLYFUNCS")
    dump(file)
    local data = jsonReadFile(path) or {}
    for k,v in pairs(data) do
        if type(v) == "table" then
            if v[1] == 1 then
                v[2] = v[2]:gsub("%s", "")
            else
                if v[1] == 3 then
                    v[3] = v[3]:gsub("%s", "")
                end
                if v[1] > 1 then
                    --[[
                    local f, err = load("return "..v[2], "t")
                    if not f and err then
                        print("Can't create function: ")
                        print(err)
                    end

                    if f then
                        v[2] = tostring(string.dump(f))
                    end
                    ]]
                    v[2] = "return "..v[2]
                end
            end
        end
    end
    writeFile(file, lpack.encodeBin(data))
end

local function buildScreenFunc(path)
    local file = path:gsub("%.json", ".SCREENFUNCS")
    dump(file)
    local rawdata = jsonReadFile(path) or {}

    local data = {}
    for k,v in pairs(rawdata) do
        if type(v) == "table" then
            rawdata[k][0] = v[1]:match("function%(ts") ~= nil
            --[[
            local f, err = load("return "..v[1], "t")
            if not f and err then
                print("Can't create function: ")
                print(err)
            end
            if f then
                v[1] = tostring(string.dump(f))
            end
            ]]
            v[1] = "return "..v[1]

            if v[2] then
                local hasPropertyChosen = v[2]:match("VALUE{.+}")
                if not hasPropertyChosen and v[2]:match("VALUE") then
                    v[2] = v[2]:gsub("VALUE", "VALUE{"..k.."}")
                end

                v[2] = v[2]:gsub("%s", "")
            end
        end

        data[getOrAddId(k)] = v
    end
    writeFile(file, lpack.encodeBin(data))
end

local function buildScreenState(path)
    local file = path:gsub("%.json", ".SCREENSTATE")
    dump(file)
    writeFile(file, lpack.encodeBin(jsonReadFile(path) or ""))
end

local function buildTriggers(path)
    local settings = loadIni(path.."setup.ini")
    if settings then
        if settings.posScale then
            settings.posScale = vec3():fromString(settings.posScale)
        end
        if settings.posOffset then
            settings.posOffset = vec3():fromString(settings.posOffset)
        end
    else
        settings = {
            posScale = vec3(1,1,1),
            posOffset = vec3(0,0,0)
        }
    end

    dump(FS:findFiles(path, "*.json", -1, false, false))
    for _,file in ipairs(FS:findFiles(path, "*.json", -1, false, false)) do
        dump(file)
        local boxes = jsonReadFile(file) or {}

        for k=1, #boxes do local v = boxes[k];
            boxes[k].pos = vec3(v.pos[1]*settings.posScale.x+settings.posOffset.x,v.pos[2]*settings.posScale.y+settings.posOffset.y,v.pos[3]*settings.posScale.z+settings.posOffset.z)
            boxes[k].size = vec3(v.size[1],v.size[2],v.size[3])

            boxes[k].debugCol = nil
            boxes[k].id = getOrAddId(boxes[k].id)
        end

        writeFile(file:gsub("%.json", ".SCREENTRIGGERS"), lpack.encodeBin(boxes))
    end
end

local function onSchemeCommand(command)
    local cmd = split(command, ":")
    if cmd[1] == "zeitScreenBuild" then
        local f, err = loadstring(cmd[2])
        if not f and err then
            print(err)
        elseif f then
            f()
        end
    end
end

M.buildTriggerTypes = buildTriggerTypes
M.buildExtensions = buildExtensions
M.buildScreenState = buildScreenState
M.buildScreenFunc = buildScreenFunc
M.buildScreenApplyFunc = buildScreenApplyFunc
M.buildTriggers = buildTriggers
M.beginTimer = nop
M.endTimer = nop
M.onSchemeCommand = onSchemeCommand

M.buildAtPath = function(folderpath)
  buildAudioContexts(folderpath.."/audioContexts/")
  buildScreenState(folderpath.."/DEFAULT.json")
  buildScreenApplyFunc(folderpath.."/APPLYFUNCS.json")
  buildScreenFunc(folderpath.."/LINKS.json")
  buildTriggers(folderpath.."/triggers/")
  buildTriggerTypes(folderpath.."/triggerTypes/")
  buildExtensions(folderpath.."/extensions/")
end

return M
