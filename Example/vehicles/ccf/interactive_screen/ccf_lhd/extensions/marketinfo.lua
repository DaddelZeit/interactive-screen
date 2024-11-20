return {
    sendMarketInfo = function()
        local tbl = {
            market = (v.data.vehMarketInfo_market or {})["val"],
            layout = (v.data.vehMarketInfo_layout or {})["val"],
            fuel = (v.data.vehMarketInfo_fuel or {})["val"],
            rooftype = (v.data.vehMarketInfo_roof or {})["val"],
            carvariant = (v.data.vehMarketInfo_carvariant or {})["val"]
        }
        screenManager.execFunc("s.market_info = "..jsonEncode(tbl))
    end
}