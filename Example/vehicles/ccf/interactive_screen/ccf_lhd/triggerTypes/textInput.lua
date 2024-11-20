return function(trigger, dist, ray)
    local im = ui_imgui

    if not trigger.init then
        trigger.txt = im.ArrayChar(256)
        trigger.cursorPos = 0
        trigger.init = true

        ffi.cdef("int ImGuiInputTextCallbackLua(ImGuiInputTextCallbackData* data);")
    end
    trigger.lastCursorPos = trigger.cursorPos

    local callbackName = "ZeitScreenTextCallback"..trigger.id
    if not _G[callbackName] then
        rawset(_G, callbackName, function(data)
            data = ffi.cast("ImGuiInputTextCallbackData*", data)
            trigger.cursorPos = data.CursorPos
            return 0
        end)
    end

    local returnVal = false
    local mousePos = im.GetMousePos()
    im.PushStyleVar1(im.StyleVar_Alpha, 0.00001)
    im.SetNextWindowPos(im.ImVec2(mousePos.x-20,mousePos.y-15))
    im.Begin("##CCFSCREEN_TEXTINPUT_WINDOW", nil, im.WindowFlags_NoTitleBar+im.WindowFlags_NoResize+im.WindowFlags_NoMove+im.WindowFlags_NoScrollbar+im.WindowFlags_AlwaysAutoResize)
    im.PushItemWidth(20)

    if im.InputText("##CCFSCREEN_TEXTINPUT", trigger.txt, ffi.sizeof(trigger.txt), im.InputTextFlags_CallbackAlways, ffi.C.ImGuiInputTextCallbackLua, ffi.cast("void*", callbackName)) then
        returnVal = true
    end

    im.PopItemWidth()
    if not im.IsItemActive() then
        im.SetMouseCursor(7)
    end
    im.End()
    im.PopStyleVar()

    if not ccfScreenInputTexID or not ccfScreenInputWhiteCol then
        rawset(_G, "ccfScreenInputTexID", im.ImTextureHandler("/art/ccf_screen/cursor.png"))
        rawset(_G, "ccfScreenInputWhiteCol", im.GetColorU322(im.ImVec4(1,1,1,1)))
    end

    local scale = im.GetMainViewport().Size.y/1080
    mousePos.x = mousePos.x + 10*scale
    mousePos.y = mousePos.y
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x+0.2*scale, mousePos.y), im.ImVec2(mousePos.x+15.2*scale, mousePos.y+20*scale), im.ImVec2(0,0), im.ImVec2(0.339,0.415), ccfScreenInputWhiteCol)

    returnVal = returnVal or trigger.cursorPos ~= trigger.lastCursorPos
    if returnVal then
        return trigger.id, ffi.string(trigger.txt), trigger.cursorPos
    end
end