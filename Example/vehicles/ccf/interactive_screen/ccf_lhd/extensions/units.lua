local unitsLookup = {
    length = {"metric", "imperial"},
    temperature = {"c", "f", "k"},
    weight = {"lb", "kg"},
    volume = {"l", "gal"},
    economy = {"metric", "imperial"},
    power = {"hp", "bhp", "kw"},
    torque = {"metric", "imperial"},
    pressure = {"inHg", "bar", "psi", "kPa"},
    energy = {"metric", "imperial"},
    dateformat = {"ger", "uk", "us"}
}
local unitFuncsLookup = {
    length = "uiUnitLength",
    temperature = "uiUnitTemperature",
    weight = "uiUnitWeight",
    volume = "uiUnitVolume",
    economy = "uiUnitConsumptionRate",
    power = "uiUnitPower",
    torque = "uiUnitTorque",
    pressure = "uiUnitPressure",
    energy = "uiUnitEnergy",
    dateformat = "uiUnitDate"
}

local function getUnitActual(savesTbl, key, index)
    if index < 0 then
        local settingsVal = settings.getValue(unitFuncsLookup[key])
        savesTbl["settings.unit_"..key.."_num"] = arrayFindValueIndex(unitsLookup[key], settingsVal)-1
        return settingsVal
    else
        return unitsLookup[key][index+1]
    end
end

return {
    getUnit = getUnitActual,
    unitsReset = function(s)
        s['settings.unit_length'] = getUnitActual(s, "length", -1)
        s["settings.unit_length_num"] = arrayFindValueIndex(unitsLookup["length"], s["settings.unit_length"])-1
        s['settings.unit_temperature'] = getUnitActual(s, "temperature", -1)
        s["settings.unit_temperature_num"] = arrayFindValueIndex(unitsLookup["temperature"], s["settings.unit_temperature"])-1
        s['settings.unit_weight'] = getUnitActual(s, "weight", -1)
        s["settings.unit_weight_num"] = arrayFindValueIndex(unitsLookup["weight"], s["settings.unit_weight"])-1
        s['settings.unit_volume'] = getUnitActual(s, "volume", -1)
        s["settings.unit_volume_num"] = arrayFindValueIndex(unitsLookup["volume"], s["settings.unit_volume"])-1
        s['settings.unit_economy'] = getUnitActual(s, "economy", -1)
        s["settings.unit_economy_num"] = arrayFindValueIndex(unitsLookup["economy"], s["settings.unit_economy"])-1
        s['settings.unit_power'] = getUnitActual(s, "power", -1)
        s["settings.unit_power_num"] = arrayFindValueIndex(unitsLookup["power"], s["settings.unit_power"])-1
        s['settings.unit_torque'] = getUnitActual(s, "torque", -1)
        s["settings.unit_torque_num"] = arrayFindValueIndex(unitsLookup["torque"], s["settings.unit_torque"])-1
        s['settings.unit_pressure'] = getUnitActual(s, "pressure", -1)
        s["settings.unit_pressure_num"] = arrayFindValueIndex(unitsLookup["pressure"], s["settings.unit_pressure"])-1
        s['settings.unit_energy'] = getUnitActual(s, "energy", -1)
        s["settings.unit_energy_num"] = arrayFindValueIndex(unitsLookup["energy"], s["settings.unit_energy"])-1
        s['settings.unit_dateformat'] = getUnitActual(s, "dateformat", -1)
        s["settings.unit_dateformat_num"] = arrayFindValueIndex(unitsLookup["dateformat"], s["settings.unit_dateformat"])-1
    end
}