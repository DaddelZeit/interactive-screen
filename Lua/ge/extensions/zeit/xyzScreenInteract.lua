-- Originally written by DaddelZeit
-- Released under GNU GPLv3 at: https://github.com/DaddelZeit/interactive-screen

-- This file should be renamed according to the vehicle name to avoid conflicts.
--[[ Please list changes here:



]]

local M = {}

M.drawBoxes = false -- set this to true for visual debug

local registeredVehicles = {}
local boxes = {}
local boxTypeCache = {}
local vehicle = nil
local timer = 0
local defaultBoxType = "default"

local function drawBox(box)
  local col = ColorF(1,0,0,1)
  local center = box:getCenter()
  local halfExt = box:getHalfExtents()
  local cornerA = center+halfExt.x*box:getAxis(0)+halfExt.y*box:getAxis(1)+halfExt.z*box:getAxis(2)
  local cornerB = center+(-halfExt.x)*box:getAxis(0)+halfExt.y*box:getAxis(1)+halfExt.z*box:getAxis(2)
  local cornerC = center+halfExt.x*box:getAxis(0)+(-halfExt.y)*box:getAxis(1)+halfExt.z*box:getAxis(2)
  local cornerD = center+(-halfExt.x)*box:getAxis(0)+(-halfExt.y)*box:getAxis(1)+halfExt.z*box:getAxis(2)
  debugDrawer:drawLine(cornerA, cornerB, col)
  debugDrawer:drawLine(cornerA, cornerC, col)
  debugDrawer:drawLine(cornerC, cornerD, col)
  debugDrawer:drawLine(cornerD, cornerB, col)

  local cornerE = center+halfExt.x*box:getAxis(0)+halfExt.y*box:getAxis(1)+(-halfExt.z)*box:getAxis(2)
  local cornerF = center+(-halfExt.x)*box:getAxis(0)+halfExt.y*box:getAxis(1)+(-halfExt.z)*box:getAxis(2)
  local cornerG = center+halfExt.x*box:getAxis(0)+(-halfExt.y)*box:getAxis(1)+(-halfExt.z)*box:getAxis(2)
  local cornerH = center+(-halfExt.x)*box:getAxis(0)+(-halfExt.y)*box:getAxis(1)+(-halfExt.z)*box:getAxis(2)
  debugDrawer:drawLine(cornerE, cornerF, col)
  debugDrawer:drawLine(cornerE, cornerG, col)
  debugDrawer:drawLine(cornerG, cornerH, col)
  debugDrawer:drawLine(cornerH, cornerF, col)

  debugDrawer:drawLine(cornerA, cornerE, col)
  debugDrawer:drawLine(cornerB, cornerF, col)
  debugDrawer:drawLine(cornerC, cornerG, col)
  debugDrawer:drawLine(cornerD, cornerH, col)
end

local function send(args, audio)
  if not vehicle then return end

  vehicle:queueLuaCommand([[
    screenManager.input(lpack.decode("]]..lpack.encode(args)..[["))
  ]])

  if audio then
    vehicle:queueLuaCommand([[
      screenManager.playSound(]]..audio..[[)
    ]])
  end
end

local lastTod = -1
local function onUpdate(dt)
  timer = timer + dt
  if timer > 0.25 then
    local tod = core_environment.getTimeOfDay()
    if tod and tod.time ~= lastTod then
      be:sendToMailbox("timeOfDay", (tod.time+0.5)%1*86400000)
      lastTod = tod.time
    end
    timer = 0
  end

  if not vehicle or not vehicle.getPosition or not boxes[1] then return end
  local ray = getCameraMouseRay()

  local matFromRot = vehicle:getRefNodeMatrix()
  local vehRot = quat(vehicle:getRefNodeMatrix():toQuatF())
  local vehPos = vehicle:getPosition()
  for k=1, #boxes do local v = boxes[k];
    local obb = OrientedBox3F()
    matFromRot:setPosition(vehPos+v.pos:rotated(vehRot))
    obb:set2(matFromRot, v.size)

    if M.drawBoxes then
      drawBox(obb)
    end

    local halfExt = obb:getHalfExtents()
    local dist = intersectsRay_OBB(ray.pos, ray.dir, obb:getCenter(), halfExt.x*obb:getAxis(0), halfExt.y*obb:getAxis(1), halfExt.z*obb:getAxis(2))
    local clickable = dist < 2

    if clickable then
      local test = {boxTypeCache[v.type or defaultBoxType](boxes[k], dist, ray, obb)}
      if test[1] then
        send(test, v.audioID)
      end
    end
  end
end

local function loadBoxes(path)
  boxes = jsonReadFile(path or "") or {}
  for k=1, #boxes do local v = boxes[k];
    boxes[k].pos = vec3(v.pos.x, v.pos.y, v.pos.z)
    boxes[k].size = vec3(v.size.x, v.size.y, v.size.z)
  end
end

local function setBox(id, pos, size)
  if not boxes[id] then return end
  boxes[id].pos = pos or boxes[id].pos
  boxes[id].size = size or boxes[id].size
end

local function buildTriggerTypeCache(path)
  boxTypeCache = {}
  for _,v in ipairs(FS:findFiles(path, "*.SCREENTRIGGER", 0, false, false)) do
    local f, err = load(readFile(v) or "", nil, "bt")
    if not f and err then
      print("Can't create function: ")
      print(err)
    elseif type(f) == "function" then
      boxTypeCache[v:match("^.+/(.+)%.(.+)$")] = f()
    end
  end
end

local function setFocusCar(id)
  vehicle = scenetree.findObject(id)
  registeredVehicles[id] = true
end

local function onVehicleDestroyed(vid)
  if vehicle and vehicle:getId() == vid then
    vehicle = nil
  end
  registeredVehicles[vid] = nil
  if not next(registeredVehicles) then
    extensions.unload(M.__extensionName__)
  end
end

local function onExtensionLoaded()
end

M.onUpdate = onUpdate
M.onExtensionLoaded = onExtensionLoaded
M.setFocusCar = setFocusCar
M.loadBoxes = loadBoxes
M.onVehicleDestroyed = onVehicleDestroyed
M.setBox = setBox
M.buildTriggerTypeCache = buildTriggerTypeCache

return M
