return {
    updateAvailable = function()
        screenManager.showBox("Update available.")
    end,
    noRepoInstall = function()
        screenManager.showBox("Software is not\nan OEM install.")
    end,
    checkForUpdate = function()
        obj:queueGameEngineLua([[
            local vehicle = scenetree.findObject(]]..objectId..[[)
            if not vehicle then return end

            local modData = core_modmanager.getModDB("thw_ccf2")
            if modData.modData and modData.modData.current_version_id then
                core_online.apiCall('s1/v4/getMod/MB29O8CT3', function(responseData)
                    responseData = responseData.responseData
                    if responseData and responseData.data then
                        if modData.modData.current_version_id ~= responseData.data.current_version_id then
                            vehicle:queueLuaCommand("screenManager.updateAvailable()")
                        end
                    end
                end)
            else
                vehicle:queueLuaCommand("screenManager.noRepoInstall()")
            end
        ]])
    end
}