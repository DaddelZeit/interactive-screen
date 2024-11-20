return function(trigger, dist, ray, obb)
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

    if im.IsMouseClicked(0) then
        trigger.curPos = nil
    end

    im.SetMouseCursor(2)
    if im.IsMouseDragging(0) then
        local rayHitPos = ray.pos+ray.dir*dist
        local halfExt = obb:getHalfExtents()
        local center, halfExtX, halfExtY, halfExtZ = obb:getCenter(), halfExt.x*obb:getAxis(0), halfExt.y*obb:getAxis(1), halfExt.z*obb:getAxis(2)

        local curPos = vec3(
            rayHitPos:distanceToLine(
                center+halfExtX+halfExtY+halfExtZ,
                center+halfExtX+halfExtY-halfExtZ)/trigger.size.x,
            rayHitPos:distanceToLine(
                center-halfExtZ+halfExtY+halfExtX,
                center-halfExtZ+halfExtY-halfExtX)/trigger.size.z
        )

        local offset = vec3()
        if trigger.curPos then
            offset = curPos-trigger.curPos
        end
        trigger.curPos = curPos

        return trigger.id, offset.x, offset.y
    end
end