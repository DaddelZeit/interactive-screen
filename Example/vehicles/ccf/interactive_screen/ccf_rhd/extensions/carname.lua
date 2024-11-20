return {
    generateCarName = function(saves)
        if not saves['settings.car_name']:match('%d') then
            saves['settings.car_name'] = saves['settings.car_name']..math.random(0,9)..math.random(0,9)..math.random(0,9)..math.random(0,9)..math.random(0,9)
        end
    end
}