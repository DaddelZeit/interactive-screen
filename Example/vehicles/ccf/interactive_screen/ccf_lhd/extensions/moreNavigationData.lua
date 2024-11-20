local M = {}

local playerSeated = false
local geExt = ""
local lastFirstWPName = ""
local lastLastWPName = ""
local endPoint
local destinations = {}

local speedSampleTimer = 0
local speedSamples = {}

local currentDestinationData = {
    mapPath = {},
    info = {}
}

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

local function setEndPoint(p)
    endPoint = p

    if not endPoint then
        screenManager.runCustomJS("updateMapPath", {mapPath={}})
    end
end

local function screenUpdate(dt)
    if playerSeated and endPoint then
        local pos = obj:getPosition()
        local path = mapmgr.getPointToPointPath(pos, endPoint)
        if path[1] ~= lastFirstWPName or path[#path] ~= lastLastWPName then
            lastFirstWPName = path[1]
            lastLastWPName = path[#path]

            table.remove(path, 1)
            local mapData = mapmgr.mapData
            currentDestinationData.mapPath = {
                pos.x, pos.y, 0
            }

            local i = 4
            for _,v in ipairs(path) do
                local wp = mapData.positions[v]
                currentDestinationData.mapPath[i] = wp.x
                currentDestinationData.mapPath[i+1] = wp.y
                currentDestinationData.mapPath[i+2] = mapData.radius[v]
                i = i + 3
            end

            currentDestinationData.mapPath[i] = endPoint.x
            currentDestinationData.mapPath[i+1] = endPoint.y
            currentDestinationData.mapPath[i+2] = 0

            screenManager.runCustomJS("updateMapPath", currentDestinationData)
        end

        local dist = endPoint:distance(pos)
        currentDestinationData.info.distance = dist

        speedSampleTimer = speedSampleTimer + dt
        if speedSampleTimer > 3 then
            table.insert(speedSamples, 1, electrics.values.wheelspeed or 0)
            table.remove(speedSamples, 40)

            local avgSpeed = 0
            for _,v in ipairs(speedSamples) do
                avgSpeed = avgSpeed + v
            end

            avgSpeed = avgSpeed/#speedSamples
            currentDestinationData.info.est = currentDestinationData.info.distance/avgSpeed

            speedSampleTimer = 0
        end

        if dist < 5 then
            setEndPoint(nil)
        end
    end
end

local function setNavToDest(id)
    if id > 0 and id <= #destinations then
        currentDestinationData.info.name = destinations[id][1]
        currentDestinationData.info.distance = "..."
        currentDestinationData.info.est = "..."

        setEndPoint(destinations[id][4])
    end
end

local function destinationCallback(d)
    destinations = lpack.decode(d) or {}
    screenManager.runCustomJS("updateMapDestinations", destinations)
    screenManager.setSettingTemp("navi_destination_list", #destinations)

    local scroll = (screenManager.getSetting("navi.destination_list_scroll") or 0)+5
    if scroll > #destinations then
        scroll = math.max(math.min(#destinations, scroll)-6,0)
        screenManager.setSettingTemp("navi.destination_list_scroll", scroll)
        screenManager.execFunc("s.navi_scroll="..scroll)
        screenManager.sendUpdateCmd("navi_scroll")
    end
end

local function sendSearchRequest(d)
    obj:queueGameEngineLua([[
        ]]..geExt..[[.getNavDestinations("]]..d..[[")
    ]])
end

local function screenInit(_, _, jbeamData)
    geExt = jbeamData.geExt

    obj:queueGameEngineLua([[
        extensions.load("]]..geExt..[[");
        ]]..geExt..[[.setUseMode(]]..(jbeamData.useStateController and 1 or 0)..[[);
    ]])

    sendSearchRequest("")
end

M.screenUpdate = screenUpdate
M.screenInit = screenInit
M.playerChange = playerChange

M.setEndPoint = setEndPoint
M.destinationCallback = destinationCallback
M.sendSearchRequest = sendSearchRequest
M.setNavToDest = setNavToDest

return M
