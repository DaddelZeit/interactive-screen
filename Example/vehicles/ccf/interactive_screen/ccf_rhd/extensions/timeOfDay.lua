local lastTime = 0
return {
    screenUpdate = function(dt, state, saves, tempSaves)
        local tod = tonumber(obj:getLastMailbox("timeOfDay") or lastTime) or 0
        if tod ~= lastTime then
            screenManager.setSettingTemp("timeOfDay", tod)
            screenManager.execFunc("s.timeOfDay = "..tod)
            lastTime = tod
        end
    end
}
