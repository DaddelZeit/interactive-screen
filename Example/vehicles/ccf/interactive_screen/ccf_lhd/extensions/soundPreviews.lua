local cooldowns = {}

local function screenUpdate(dt)
    for k,v in pairs(cooldowns) do
        cooldowns[k] = v-dt
        if cooldowns[k] < 0 then cooldowns[k] = nil end
    end
end

local function previewSound(audioId, volume, pitch)
    if cooldowns[audioId] then return end
    screenManager.audios[audioId].volume = volume or 1
    screenManager.audios[audioId].pitch = pitch or 1
    screenManager.playSound(audioId)
    cooldowns[audioId] = 0.4
end

return {
    previewSound = previewSound,
    screenUpdate = screenUpdate
}
