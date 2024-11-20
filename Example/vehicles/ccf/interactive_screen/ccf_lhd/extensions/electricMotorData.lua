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
  powerDisplay = 0,
  gearIndex = 0
}

local min = math.min
local max = math.max
local hasEM = false

local wattToHorsePower = 0.001 * 1.35962

local engines = {}
local batteries = {}

local averagePower = 0
local avgPowerSmoother = newExponentialSmoothing(1000)

local currentConsumptionSmoother = newExponentialSmoothing(50)
local currentPowerSmoother = newExponentialSmoothing(30)
local currentTorqueSmoother = newExponentialSmoothing(30)
local avgConsumptionSmoother = newExponentialSmoothing(1000)
local avgConsumptionSmootherSinceRefuel = newExponentialSmoothing(1000)

local fuelDisplaySmoother = newTemporalSmoothing(5, 3)
local remainingRangeSmoother = newTemporalSmoothing(50, 50)

local avgConsumptionPer100km = 0
local avgConsumptionSinceRefuel = 0
local timeSinceRespawnSeconds = 0

local fuelSmoother = newTemporalSmoothing(50, 50)

local function screenUpdate(dt)
  if not hasEM then return end

  local wheelspeed = electrics.values.wheelspeed
  local isMoving = wheelspeed > 0.5

  timeSinceRespawnSeconds = timeSinceRespawnSeconds + dt
  moduleData.secondsSinceRespawn = math.floor(timeSinceRespawnSeconds%60)
  moduleData.minutesSinceRespawn = math.floor(timeSinceRespawnSeconds/60%60)
  moduleData.hoursSinceRespawn = math.floor(timeSinceRespawnSeconds/3600)

  local powerDisplay = 0
  local motorCount = 0
  local currentPower = 0
  local currentTorque = 0
  for _, motor in ipairs(engines) do
    powerDisplay = powerDisplay + (motor.throttle or 0) - (motor.regenThrottle or 0)
    motorCount = motorCount + 1
    currentPower = currentPower + (motor.outputTorque1 * motor.outputAV1)
    currentTorque = currentTorque + motor.outputTorque1
  end

  moduleData.currentPower = isMoving and currentPowerSmoother:get(currentPower) * wattToHorsePower --HP or 0
  moduleData.averagePower = avgPowerSmoother:get(isMoving and currentPower or averagePower) * wattToHorsePower
  moduleData.currentTorque = currentTorqueSmoother:get(currentTorque) --Nm
  moduleData.powerDisplay = motorCount > 0 and (powerDisplay / motorCount * (isMoving and 1 or 0)) or 0

  if isMoving then
    local timeToGo100km = isMoving and (100 / (wheelspeed * 3.6)) or 0
    local currentConsumptionPer100km = currentPower * timeToGo100km

    currentConsumptionPer100km = currentConsumptionSmoother:get(currentConsumptionPer100km)
    avgConsumptionPer100km = avgConsumptionSmoother:get(isMoving and currentConsumptionPer100km or avgConsumptionPer100km)
    avgConsumptionSinceRefuel = avgConsumptionSmootherSinceRefuel:get(isMoving and currentConsumptionPer100km or avgConsumptionPer100km)

    moduleData.averageFuelConsumption = avgConsumptionPer100km
    moduleData.averageFuelConsumptionSinceRefuel = avgConsumptionSinceRefuel
    moduleData.currentFuelConsumption = currentPower

    local energyLeft = 0
    for _, b in ipairs(batteries) do
      local storage = energyStorage.getStorage(b)
      energyLeft = energyLeft + storage.storedEnergy
    end
    moduleData.remainingRange = remainingRangeSmoother:get(avgConsumptionPer100km > 0 and (energyLeft * 0.0278 / avgConsumptionPer100km) or 0, dt)
  end

  moduleData.gearIndex = electrics.values.gearIndex
  screenManager.runCustomJS("updateElectricMotorData", moduleData)
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

local function screenInit()
  local motors = powertrain.getDevicesByCategory("engine")
  for _, v in pairs(motors) do
    if v.type:match("electric") then
      engines[#engines+1] = v
      arrayConcat(batteries, shallowcopy(v.registeredEnergyStorages))
      hasEM = true
    end
  end
end

M.screenInit = screenInit
M.screenReset = screenReset
M.screenUpdate = screenUpdate

return M
