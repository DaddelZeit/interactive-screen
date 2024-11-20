-- This Source Code Form is subject to the terms of the bCDDL, v. 1.1.
-- If a copy of the bCDDL was not distributed with this
-- file, You can obtain one at http://beamng.com/bCDDL-1.1.txt

local M = {}

local moduleData = {
  averageFuelConsumption = 0,
  averageFuelConsumptionSinceRefuel = 0,
  currentFuelConsumption = 0,
  currentPower = 0,
  averagePower = 0,
  currentTorque = 0,
  remainingRange = 0,
  secondsSinceRespawn = 0,
  minutesSinceRespawn = 0,
  hoursSinceRespawn = 0,
  fuelDisplay = 0,
  gearIndex = 0
}

local min = math.min
local max = math.max
local hasICE = false

local wattToHorsePower = 0.001 * 1.35962

local engines = {}
local fuelTanks = {}

local averagePower = 0
local avgPowerSmoother = newExponentialSmoothing(1000)

local currentPowerSmoother = newExponentialSmoothing(30)
local currentTorqueSmoother = newExponentialSmoothing(30)
local avgConsumptionSmoother = newExponentialSmoothing(5000)
local avgConsumptionSmootherSinceRefuel = newExponentialSmoothing(5000)
local fuelDisplaySmoother = newTemporalSmoothing(5, 3)
local remainingRangeSmoother = newTemporalSmoothing(50, 50)

local avgConsumptionPer100km = 0
local avgConsumptionSinceRefuel = 0
local timeSinceRespawnSeconds = 0

local previousFuel = 0
local fuelSmoother = newTemporalSmoothing(50, 50)

local function screenUpdate(dt)
  if not hasICE then return end

  local wheelspeed = electrics.values.wheelspeed
  local isMoving = wheelspeed > 0.5

  timeSinceRespawnSeconds = timeSinceRespawnSeconds + dt
  moduleData.secondsSinceRespawn = math.floor(timeSinceRespawnSeconds%60)
  moduleData.minutesSinceRespawn = math.floor(timeSinceRespawnSeconds/60%60)
  moduleData.hoursSinceRespawn = math.floor(timeSinceRespawnSeconds/3600)

  local fuelVolume = electrics.values.fuelVolume or 0
  local fuelConsumption = min(max((previousFuel - fuelVolume) / (dt * wheelspeed) * 1000 * 100, 0), 100) -- l/100km
  fuelConsumption = fuelSmoother:getUncapped(fuelConsumption, dt)
  previousFuel = fuelVolume

  local fuelDisplay = min(max((3 * fuelConsumption) / 30, 0), 3)
  if (electrics.values.engineLoad or 0) <= 0 then
    fuelDisplay = -1
  end
  if wheelspeed < 1 and (electrics.values.throttle or 0) <= 0 then
    fuelDisplay = 0
  end
  moduleData.fuelDisplay = fuelDisplaySmoother:getUncapped(fuelDisplay, dt)

  if isMoving then
    avgConsumptionPer100km = avgConsumptionSmoother:get(min(max(fuelConsumption, 0), 50))
    avgConsumptionSinceRefuel = avgConsumptionSmootherSinceRefuel:get(min(max(fuelConsumption, 0), 50))

    moduleData.averageFuelConsumption = avgConsumptionPer100km
    moduleData.averageFuelConsumptionSinceRefuel = avgConsumptionSinceRefuel
    moduleData.currentFuelConsumption = fuelConsumption

    local energyLeft = 0
    local JToLiterCoef = 0
    for _, b in ipairs(fuelTanks) do
      local storage = energyStorage.getStorage(b)
      energyLeft = energyLeft + storage.storedEnergy
      JToLiterCoef = storage.energyDensity * storage.fuelLiquidDensity * 0.000000001
    end
    moduleData.remainingRange = remainingRangeSmoother:get(avgConsumptionPer100km > 0 and (energyLeft * JToLiterCoef / avgConsumptionPer100km * 0.0001) or 0, dt)
  end

  local currentPower = 0
  local currentTorque = 0
  for _, motor in ipairs(engines) do
    currentPower = currentPower + (motor.outputTorque1 * motor.outputAV1)
    currentTorque = currentTorque + motor.outputTorque1
  end
  currentPower = currentPowerSmoother:get(currentPower) * wattToHorsePower --HP
  averagePower = avgPowerSmoother:get(isMoving and currentPower or averagePower)
  currentTorque = currentTorqueSmoother:get(currentTorque) --Nm
  moduleData.currentPower = isMoving and currentPower or 0
  moduleData.averagePower = averagePower
  moduleData.currentTorque = currentTorque

  moduleData.gearIndex = moduleData.gearIndex or 0
  local gearIndex = electrics.values.gearIndex
  moduleData.gearIndex = (gearIndex ~= 0 and gearIndex) or (electrics.values.clutch < 0.6 and gearIndex) or moduleData.gearIndex

  screenManager.runCustomJS("updateCombustionEngineData", moduleData)
end

local function screenReset()
  avgPowerSmoother:reset()
  currentPowerSmoother:reset()
  currentTorqueSmoother:reset()
  avgConsumptionSmoother:set(0)
  fuelDisplaySmoother:reset()
  fuelSmoother:reset()
  remainingRangeSmoother:reset()
  avgConsumptionPer100km = 0
end

local function screenInit(saves, tempSaves)
  local motors = powertrain.getDevicesByCategory("engine")
  for _, v in pairs(motors) do
    if v.type:match("combustion") then
      engines[#engines+1] = v
      arrayConcat(fuelTanks, shallowcopy(v.registeredEnergyStorages))
      hasICE = true
    end
  end
end

M.screenInit = screenInit
M.screenReset = screenReset
M.screenUpdate = screenUpdate

return M
