local M = {}

local lastKey = ""
local modeCtrl

local function doChecks(modeData)
  if not modeData or not modeData.settings or not modeData.settings.aeb or not modeData.settings.hillStartAssist or not modeData.settings.hillDescentAssist then return end
  screenManager.setSetting("settings.vehicle_aeb_mode_enabled", modeData.settings.aeb.isEnabled)
  screenManager.setSetting("settings.vehicle_hill_start_mode_enabled", modeData.settings.hillStartAssist.isEnabled)
  screenManager.setSetting("settings.vehicle_hill_descent_mode_enabled", modeData.settings.hillDescentAssist.isEnabled)

  screenManager.execFunc("s.settings_aeb_active_mode = "..tostring(modeData.settings.aeb.isEnabled))
  screenManager.execFunc("s.settings_hill_start_active_mode = "..tostring(modeData.settings.hillStartAssist.isEnabled))
  screenManager.execFunc("s.settings_hill_descent_active_mode = "..tostring(modeData.settings.hillDescentAssist.isEnabled))
end

local function screenUpdate(dt)
  if not modeCtrl then
    modeCtrl = controller.getController("driveModes")
    return
  end

  local key = modeCtrl.getCurrentDriveModeKey()
  if key ~= lastKey then
    local modeData = modeCtrl.getDriveModeData(key)
    screenManager.runCustomJS("updateDrivemode", modeData)
    doChecks(modeData)
    lastKey = key
  end
end

M.screenUpdate = screenUpdate

return M
