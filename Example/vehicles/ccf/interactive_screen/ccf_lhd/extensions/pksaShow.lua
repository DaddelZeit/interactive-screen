local M = {}

local lastParkingSensorShow = 0
local supportedStates = {navi=true, audio=true, ["home/0"]=true, ["home/1"]=true, ["home/2"]=true, ambience=true, ["car/mode"]=true, ["car/trip"]=true, ["car/tpms"]=true}
local lastState = "navi"
local playerSeated = false
local geExt = ""
local node = 0
local target
local geLuaStr = ""
local electricsName

local function playerChange(bool)
    if bool then
        obj:queueGameEngineLua([[
            if ]]..geExt..[[ then
                ]]..geExt..[[.setFocusCar(]]..objectId..[[)
            end
        ]])
    end

    playerSeated = bool
end

local function screenUpdate(dt, state, saves, tempSaves, isInside)
    if supportedStates[state] and lastParkingSensorShow == 0 and electrics.values.parkingSensorShow == 1 or electrics.values.reverse == 1 then
        lastState = state
        screenManager.sendState("pksa")
        lastParkingSensorShow = electrics.values.parkingSensorShow
    elseif state == "pksa" and electrics.values.parkingSensorShow == 0 then
        screenManager.sendState(lastState)
        lastParkingSensorShow = electrics.values.parkingSensorShow
    elseif string.startswith(state, "car") and lastParkingSensorShow == 1 then
        screenManager.sendState("pksa")
    end

    --[[
    if electricsName then electrics.values[electricsName] = 0 end
    if state == "pksa" and playerSeated and isInside and target then
        local pos = obj:getPosition()+obj:getNodePosition(node)
        local rot = quatFromDir(-obj:getDirectionVector(), obj:getDirectionVectorUp())

        obj:queueGameEngineLua(string.format(geLuaStr, tostring(pos), tostring(rot)))

        if electricsName then
            electrics.values[electricsName] = 1
        end
    end
    ]]
end

local function screenInit(_, _, jbeamData)
    geExt = jbeamData.geExt
    node = beamstate.nodeNameMap[jbeamData.camNode or 0]
    target = jbeamData.texTargetName
    electricsName = jbeamData.electricsName

    obj:queueGameEngineLua([[
        extensions.load("]]..geExt..[[");
    ]])

    geLuaStr = geExt..".renderCam('"..target.."', %s, %s)"
    if electricsName then electrics.values[electricsName] = 0 end
end

M.screenUpdate = screenUpdate
M.screenInit = screenInit
M.playerChange = playerChange

return M