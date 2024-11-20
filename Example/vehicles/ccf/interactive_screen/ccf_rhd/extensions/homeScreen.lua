local apply = false
local lastInput = 0
return {
    screenUpdate = function(dt, state, saves, tempSaves)
        local currentVal = tempSaves['home.scroll'] or 0
        if state == "home" then
            screenManager.sendState("home/"..currentVal)
        end

        if currentVal%1 ~= 0 then
            if apply then
                tempSaves['home.scroll'] = round(currentVal)
                screenManager.sendState("home/"..tempSaves['home.scroll'])
            else
                screenManager.sendState("home/onlyscroll")
            end
            apply = true
        end

        if currentVal ~= lastInput then
            apply = false
            lastInput = currentVal
            screenManager.execFunc("s.home_scroll="..lastInput)
        end
    end
}