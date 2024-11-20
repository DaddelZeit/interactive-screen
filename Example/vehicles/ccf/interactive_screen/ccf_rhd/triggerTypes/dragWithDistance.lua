return function(trigger, dist, ray, obb)
    local im = ui_imgui

    if not ccfScreenInputTexID or not ccfScreenInputWhiteCol then
        rawset(_G, "ccfScreenInputTexID", im.ImTextureHandler("/art/ccf_screen/cursor.png"))
        rawset(_G, "ccfScreenInputWhiteCol", im.GetColorU322(im.ImVec4(1,1,1,1)))
    end

    local scale = im.GetMainViewport().Size.y/1080
    local mousePos = im.GetMousePos()
    mousePos.x = mousePos.x - 7.5*scale
    mousePos.y = mousePos.y - 25*scale
    local animProgress = math.sin(Engine.Platform.getSystemTimeMS()/1000)+0.3
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x, mousePos.y), im.ImVec2(mousePos.x+15*scale, mousePos.y+20*scale), im.ImVec2(0,0), im.ImVec2(0.339,0.415), ccfScreenInputWhiteCol)
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x-15*scale-5*animProgress, mousePos.y), im.ImVec2(mousePos.x-5*animProgress, mousePos.y+20*scale), im.ImVec2(0.496,0.526), im.ImVec2(0.6855,0.824), ccfScreenInputWhiteCol)
    im.ImDrawList_AddImage(im.GetBackgroundDrawList1(), ccfScreenInputTexID:getID(), im.ImVec2(mousePos.x+15*scale+5*animProgress, mousePos.y), im.ImVec2(mousePos.x+30*scale+5*animProgress, mousePos.y+20*scale), im.ImVec2(0.743,0.526), im.ImVec2(0.9326,0.824), ccfScreenInputWhiteCol)

    im.SetMouseCursor(4)
    if im.IsMouseDragging(0) then
        local rayHitPos = ray.pos+ray.dir*dist
        local halfExt = obb:getHalfExtents()
        local center, halfExtX, halfExtY, halfExtZ = obb:getCenter(), halfExt.x*obb:getAxis(0), halfExt.y*obb:getAxis(1), halfExt.z*obb:getAxis(2)
        return trigger.id, rayHitPos:distanceToLine(
            center+halfExtX+halfExtY+halfExtZ,
            center+halfExtX+halfExtY-halfExtZ),
            rayHitPos:distanceToLine(
            center-halfExtX+halfExtY+halfExtZ,
            center-halfExtX+halfExtY-halfExtZ)
    end
end