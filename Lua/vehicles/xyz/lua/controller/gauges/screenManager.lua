-- Originally written by DaddelZeit
-- Released under GNU GPLv3 at: https://github.com/DaddelZeit/interactive-screen

--[[ Please list changes here:



]]

local M = {}

local gaugeHTMLTextures = {}

local savePath = ""
local vehType = ""
local workingPath = ""
local currentState = ""
local geExt = ""
local defaultState
local currentBox

local playerSeated = false
local driverNodeCid = 0
local camPos
local combinedPos
local isInside = false

local saves = {}
local defaultSaves = {}
local saveApplyFuncs = {}
local tempSaves = {}
local triggerLinks = {}
local extensions = {}
local audios = {}

M.saves = saves
M.tempSaves = tempSaves
M.extensions = extensions
M.audios = audios

local function loadCurrentStateBoxes(thisState)
  local stateToUse = thisState or currentState
  obj:queueGameEngineLua([[
    if ]]..geExt..[[ then
      ]]..geExt..[[.loadBoxes("]]..workingPath.."triggers/"..stateToUse..[[.SCREENTRIGGERS")
    end
  ]])
end

local function callJS(...)
  for _,v in ipairs(gaugeHTMLTextures) do
    v:callJS(...)
  end
end

local function showBox(text, buttonText, boxFileName)
  boxFileName = boxFileName or "popup_generic"
  loadCurrentStateBoxes(boxFileName)
  currentBox = {true, text, buttonText, boxFileName}
  callJS("screenPopup", currentBox)
end

local function hideBox()
  loadCurrentStateBoxes()
  currentBox = nil
  callJS("screenPopup", {false})
end

local function sendState(state)
  if state ~= currentState then
    currentState = state
    loadCurrentStateBoxes()
    callJS("screenStateUpdate", {state})

    if currentBox then
      showBox(currentBox[2], currentBox[3], currentBox[4])
    end
  end
end

local function writeSave()
  jsonWriteFile(savePath, saves)
end

local function execFunc(func)
  callJS("execFunc", {func})
end

local function sendUpdateCmd(val)
  callJS("valueChanged", {val})
end

local function updateAll(val)
  callJS("valueChanged", {})
end

local function runCustomJS(funcName, ...)
  callJS(funcName, ...)
end

local function makeFunc(data, mode)
  local f, err = load(data, nil, mode)
  if not f and err then
    print("Can't create function: "..data)
    print(err)
  end
  return f
end

local function activateDefaultState()
  sendState(defaultState)
end

local function loadSave(useDefault)
  --local timer = HighPerfTimer()
  --timer:reset()

  local defaultSvs = deepcopy(defaultSaves)
  saves = useDefault and defaultSvs or saves

  loadCurrentStateBoxes()
  for k,v in pairs(defaultSvs) do
    if saves[k] == nil then
      saves[k] = v
    end
  end

  for saveKey,saveVal in pairs(saves) do
    if saveApplyFuncs[saveKey] then
      local applyTbl = saveApplyFuncs[saveKey]
      if applyTbl[1] == 1 then
        execFunc(applyTbl[2]:gsub("VALUE", tostring(saveVal)))
        if applyTbl[3] then
          sendUpdateCmd(applyTbl[3])
        end
      elseif applyTbl[1] == 2 then
        local f = makeFunc(applyTbl[2], "bt")
        if f then
           f()(saves)
        end
      elseif applyTbl[1] == 3 then
        local f = makeFunc(applyTbl[2], "bt")
        if f then
           f()(saves)
        end

        local specificPropertyChosen = applyTbl[3]:match("VALUE{.-}")
        local str = specificPropertyChosen:match("%b{}")
        execFunc(applyTbl[3]:gsub("VALUE{.-}", tostring(saves[str:sub(2,str:len()-1)])))

        if applyTbl[4] then
          sendUpdateCmd(applyTbl[4])
        end
      end
    end
  end
  updateAll()
  --dump("SAVE LOADING TOOK "..timer:stop().."ms")
end

local function onPlayersChanged(active)
  if active then
    loadSave()
    obj:queueGameEngineLua([[
      if ]]..geExt..[[ then
        ]]..geExt..[[.setFocusCar(]]..objectId..[[)
      end
    ]])
  end

  for _, ext in pairs(extensions) do
    if ext.playerChange then
      ext.playerChange(active)
    end
  end
end

local function input(args)
  --local timer = HighPerfTimer()
  --timer:reset()

  local triggerId = table.remove(args, 1)
  local trigger = triggerLinks[triggerId]
  if trigger then
    if type(trigger) == "string" then
      sendState(trigger)
      --dump("STATE UPDATE TOOK "..timer:stop().."ms")
      return
    end

    local saveTableToUse = trigger["0"] and tempSaves or saves
    trigger["1"](saveTableToUse, unpack(args))

    if trigger["2"] then
      local specificPropertyChosen = trigger["2"]:match("VALUE{.-}")
      local tmpstring = trigger["2"]
      while specificPropertyChosen do
        local str = specificPropertyChosen:match("%b{}")
        tmpstring = tmpstring:gsub(specificPropertyChosen, tostring(saveTableToUse[str:sub(2,str:len()-1)]))
        specificPropertyChosen = tmpstring:match("VALUE{.-}")
      end
      execFunc(tmpstring)
    end

    if trigger["3"] then
      sendUpdateCmd(trigger["3"])
    end

    writeSave()
  end

  --dump("INPUT TOOK "..timer:stop().."ms")
end

local function playSound(audioId)
  local audio = audios[audioId]
  if audio then
    local canPlay = true
    if audio.inside ~= nil then
      if audio.inside then
        canPlay = isInside
      else
        canPlay = not isInside
      end
    end

    if canPlay then
      obj:playSFXOnce(audio.name, audio.node, audio.volume, audio.pitch)
    end
  end
end

local function isCamInside()
  camPos = obj:getCameraPosition()
  isInside = combinedPos and (camPos:distance(combinedPos) <= 0.6) or false
  combinedPos = obj:getPosition() + obj:getNodePosition(driverNodeCid)
end

local function updateGFX(dt)
  if playerInfo.anyPlayerSeated ~= playerSeated then
    onPlayersChanged(playerInfo.anyPlayerSeated)
    playerSeated = playerInfo.anyPlayerSeated
  end

  isCamInside()

  for _, ext in pairs(extensions) do
    if ext.screenUpdate then
      ext.screenUpdate(dt, currentState, saves, tempSaves, isInside)
    end
  end
end

local function setSetting(key, val)
  saves[key] = val
  writeSave()
end

local function setSettingTemp(key, val)
  tempSaves[key] = val
end

local function getSetting(key)
  return tempSaves[key] or saves[key] or nil
end

local function processFile(path)
  return jsonReadFile(path or "") or {}
end

local function addScreen(htmlTexture)
  gaugeHTMLTextures[#gaugeHTMLTextures+1] = htmlTexture
end

local function initLastStage()
  local osTime = tostring(os.time())

  for k, file in ipairs(FS:findFiles(workingPath.."audioContexts/", "*.SCREENAUDIO", 0, false, false)) do
    local audio = processFile(file)
    if audio.node and beamstate.nodeNameMap[tostring(audio.node)] then
      local uniqueName = "zeitScreen_"..vehType.."_"..osTime.."_"..k
      audios[k] = {
        sound = obj:createSFXSource(audio.path, audio.description, uniqueName, -1),
        name = uniqueName,
        volume = audio.volume or 1,
        pitch = audio.pitch or 1,
        node = beamstate.nodeNameMap[tostring(audio.node)],
        inside = audio.inside
      }
    end
  end

  activateDefaultState()
end

local function reset()
  activateDefaultState()

  for _, ext in pairs(extensions) do
    if ext.screenReset then
      ext.screenReset()
    end
  end
end

local function init(jbeamData)
  --local timer = HighPerfTimer()
  --timer:reset()

  vehType = jbeamData.type or vehType
  defaultState = jbeamData.defaultState or nil
  workingPath = "vehicles/"..v.data.model.."/interactive_screen/"..vehType.."/"

  triggerLinks = processFile(workingPath.."LINKS.SCREENFUNCS") --jbeamData.triggerLinks or triggerLinks
  defaultSaves =  processFile(workingPath.."DEFAULT.SCREENSTATE") --jbeamData.saves
  saveApplyFuncs = processFile(workingPath.."APPLYFUNCS.SCREENAPPLYFUNCS") --jbeamData.saveApplyFuncs

  local extData = jbeamData.extensions or {}
  for _, path in ipairs(FS:findFiles(workingPath.."extensions/", "*.SCREENEXT", 0, false, false)) do
    local f = makeFunc(readFile(path), "bt")
    if f then
      local _, name = path:match("(.+)%/+(.+)%..+")
      extensions[name] = f()
      if extensions[name] and extensions[name].screenInit then
        extensions[name].screenInit(saves, tempSaves, extData[name])
      end
    end
  end

  savePath = jbeamData.savePath
  local saveIsLpack, lpackRes = pcall(lpack.decode, readFile(savePath))
  saves = (saveIsLpack and lpackRes or jsonReadFile(savePath or "")) or defaultSaves or saves
  M.saves = saves
  M.tempSaves = tempSaves

  geExt = jbeamData.geExt
  obj:queueGameEngineLua([[
    extensions.reload("]]..geExt..[[")
    ]]..geExt..[[.buildTriggerTypeCache("]]..workingPath..[[triggerTypes")
  ]])

  for k,v in pairs(triggerLinks) do
    if type(v) == "table" then
      local f = makeFunc(v["1"], "bt")
      if f then
        triggerLinks[k]["1"] = f()
      end
    end
  end

  driverNodeCid = beamstate.nodeNameMap["driver"] or 0

  --dump("INITIAL LOADING TOOK "..timer:stop().."ms")
end

M.reset = reset
M.init = init
M.initLastStage = initLastStage
M.addScreen = addScreen

M.updateGFX = updateGFX

M.showBox = showBox
M.hideBox = hideBox

M.sendState = sendState
M.execFunc = execFunc
M.sendUpdateCmd = sendUpdateCmd
M.runCustomJS = runCustomJS

M.getSetting = getSetting
M.setSetting = setSetting
M.setSettingTemp = setSettingTemp

M.playSound = playSound
M.input = input

M.loadSave = loadSave

local mt = {
  -- put unknown function calls through to extensions, if possible
  __index = function(self, funcName)
    local res = {}
    for _,ext in pairs(extensions) do
      if ext[funcName] then
        res[#res+1] = ext[funcName]
      end
    end

    if #res == 0 then return nil -- return nil if not found
    elseif #res == 1 then return res[1] -- return immediate function when found
    else -- return iterating help function
      return function(...)
        for i=1, #res do
          res[i](...)
        end
      end
    end
  end,
  __metatable = false
}
setmetatable(M, mt)

rawset(_G, "screenManager", M)
return M
