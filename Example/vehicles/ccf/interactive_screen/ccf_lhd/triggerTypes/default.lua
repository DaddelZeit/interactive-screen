return function(trigger, dist, ray)
    local im = ui_imgui

    if not ccfScreenInputTexID or not ccfScreenInputWhiteCol then
        rawset(_G, "ccfScreenInputTexID", im.ImTextureHandler("/art/ccf_screen/cursor.png"))
        rawset(_G, "ccfScreenInputWhiteCol", im.GetColorU322(im.ImVec4(1,1,1,1)))
    end

    local scale = im.GetMainViewport().Size.y/1080
    local mousePos = im.GetMousePos()
    mousePos.x = mousePos.x + 10*scale
    mousePos.y = mousePos.y
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x+0.2*scale, mousePos.y), im.ImVec2(mousePos.x+15.2*scale, mousePos.y+20*scale), im.ImVec2(0,0), im.ImVec2(0.339,0.415), ccfScreenInputWhiteCol)

    im.SetMouseCursor(7)
    if im.IsMouseClicked(0) then
        return trigger.id
    end
end