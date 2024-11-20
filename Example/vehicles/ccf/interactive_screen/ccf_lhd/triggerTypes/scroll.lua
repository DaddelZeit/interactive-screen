return function(trigger, dist, ray)
    local im = ui_imgui

    if not ccfScreenInputTexID or not ccfScreenInputWhiteCol then
        rawset(_G, "ccfScreenInputTexID", im.ImTextureHandler("/art/ccf_screen/cursor.png"))
        rawset(_G, "ccfScreenInputWhiteCol", im.GetColorU322(im.ImVec4(1,1,1,1)))
    end

    local scale = im.GetMainViewport().Size.y/1080
    local mousePos = im.GetMousePos()
    mousePos.x = mousePos.x - 20*scale
    mousePos.y = mousePos.y - 10*scale
    local animProgress = math.sin(Engine.Platform.getSystemTimeMS()/1000)+0.3
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x+0.2*scale, mousePos.y), im.ImVec2(mousePos.x+15.2*scale, mousePos.y+20*scale), im.ImVec2(0.339,0), im.ImVec2(0.678,0.415), ccfScreenInputWhiteCol)
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x, mousePos.y-15*scale-5*animProgress), im.ImVec2(mousePos.x+15*scale, mousePos.y-5*animProgress), im.ImVec2(0.074,0.436), im.ImVec2(0.372,0.6259), ccfScreenInputWhiteCol)
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x, mousePos.y+19.75*scale+5*animProgress), im.ImVec2(mousePos.x+15*scale, mousePos.y+34.75*scale+5*animProgress), im.ImVec2(0.074,0.6836), im.ImVec2(0.372,0.873), ccfScreenInputWhiteCol)

    im.SetMouseCursor(3)
    local mousewheel = im.GetIO().MouseWheel
    if mousewheel ~= 0 then
        return trigger.id, mousewheel
    end
end