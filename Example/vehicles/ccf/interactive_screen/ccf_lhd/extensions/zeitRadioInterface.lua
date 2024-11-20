local dabTable = {
    {"_", "haricot1","haricot1xtra","haricot2","haricot3","haricot4","haricot4x","haricot5","haricot6","purefm","nova","live_diggi", "nr_niedersachsen"},
    {
        _ = {
            name = "",
            artist = "",
            coverUrl = "vehicles/ccf/infotainment_screen/radio_info/unselected.png",
            channel = ""
        },
        haricot1 = {
            name = "Parallel - Metrik",
            artist = "12B - DAB - DANCE HYMNS",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot1.png",
            channel = "Radio Haricot 1"
        },
        haricot1xtra = {
            name = "Rick Ross - The Devil Is a Lie",
            artist = "12B - DAB - RIOT",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot1x.png",
            channel = "Radio Haricot 1Xtra"
        },
        haricot2 = {
            name = "ABBA - The Winner Takes It All",
            artist = "12B - DAB - BOB RACKET",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot2.png",
            channel = "Radio Haricot 2"
        },
        haricot3 = {
            name = "Words and Music",
            artist = "12B - DAB - WORK AND PLAY",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot3.png",
            channel = "Radio Haricot 3"
        },
        haricot4 = {
            name = "Pick of the Week",
            artist = "12B - DAB - ISAAK MACARONIE",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot4.png",
            channel = "Radio Haricot 4"
        },
        haricot4x = {
            name = "Inheritance Tracks",
            artist = "12B - DAB - ROS ATKINS",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot4_extra.png",
            channel = "Radio Haricot 4 Extra"
        },
        haricot5 = {
            name = "France vs South Africa",
            artist = "12B - DAB - SPORT LIVE",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot5.png",
            channel = "Radio Haricot 5"
        },
        haricot6 = {
            name = "The Fall - Hip Priest",
            artist = "12B - DAB - FREAK ZONE",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot6.png",
            channel = "Radio Haricot 6"
        },
        purefm = {
            name = "Christopher Tin - Flocks a Mile Wide",
            artist = "11D - DAB - JOHN WILSON",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/purefm.png",
            channel = "Pure FM"
        },
        nova = {
            name = "Club der Republik",
            artist = "Es ist kompliziert. Dazu guter Pop.",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/nova.png",
            channel = "Deutschlandwelle Nova"
        },
        live_diggi = {
            name = "Ms. Jackson - Pashanim",
            artist = "Für den Sektor.",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/live_diggi.png",
            channel = "LiveBeat DIGGI"
        },
        nr_niedersachsen = {
            name = "Lotusblume - Die Flippers",
            artist = "NR Niedersachsen - Das beste für den Norden",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/nr_niedersachsen.png",
            channel = "NR Niedersachsen"
        },
    }
}

local fmTable = {
    {"_", "haricot1","haricot2","haricot3","haricot4","purefm"},
    {
        _ = {
            name = "",
            artist = "",
            coverUrl = "vehicles/ccf/infotainment_screen/radio_info/unselected.png",
            channel = ""
        },
        haricot1 = {
            name = "Parallel - Metrik",
            artist = "97.1MHz - FM - DANCE HYMNS",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot1.png",
            channel = "Radio Haricot 1"
        },
        haricot2 = {
            name = "ABBA - The Winner Takes It All",
            artist = "88.1MHz - FM - BOB RACKET",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot2.png",
            channel = "Radio Haricot 2"
        },
        haricot3 = {
            name = "Words and Music",
            artist = "90.2MHz - FM - WORK AND PLAY",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot3.png",
            channel = "Radio Haricot 3"
        },
        haricot4 = {
            name = "Pick of the Week",
            artist = "92.5MHz - FM - ISAAK MACARONIE",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/radio_haricot4.png",
            channel = "Radio Haricot 4"
        },
        purefm = {
            name = "Christopher Tin - Flocks a Mile Wide",
            artist = "99.9MHz - FM - JOHN WILSON",
            coverUrl= "vehicles/ccf/infotainment_screen/radio_info/purefm.png",
            channel = "Pure FM"
        },
    }
}

local radioType = 0

local function sendPlaylist(idArray, songsInList, playlistId, type)
    controller.getControllerSafe("gauges/customModules/zeitRadio").sendPlaylist(idArray, songsInList, playlistId, type)

    screenManager.setSettingTemp("playlistSize", idArray and #idArray-1 or 0)
    screenManager.setSettingTemp("audio.list_scroll", 0)
end

return {
    changeVol = function(val)
        if radioType ~= 2 then return end
        if zeitRadio then
            zeitRadio.tuneRadioVolume(val, true)
        end
    end,
    skipTo = function(val)
        if radioType ~= 2 then return end
        if zeitRadio then
            zeitRadio.skipTo(val)
        end
    end,
    changeSong = function(val, full)
        if radioType ~= 2 then
            if zeitRadio and not zeitRadio.getCurrentlyPlayingSongData().isPaused then
                zeitRadio.pausePlaySong()
            end
            local tbl = deepcopy(radioType==0 and dabTable[2][dabTable[1][val]] or fmTable[2][fmTable[1][val]])
            tbl.currentSongIndex = val
            controller.getControllerSafe("gauges/customModules/zeitRadio").sendSong(tbl)
            return
        end
        if zeitRadio then
            zeitRadio.changeSong(val, full or false)
        end
    end,
    changePlaylist = function(val, full)
        if radioType ~= 2 then return end
        if zeitRadio then
            zeitRadio.changePlaylist(val, full or false)

            local songData = zeitRadio.getCurrentlyPlayingSongData()
            local songsInList = {}
            local idArray = zeitRadio.getPlaylistSongsById(songData.playlist)
            for _,v in ipairs(idArray) do
                songsInList[v] = zeitRadio.getSongDataById(v)
            end
            sendPlaylist(idArray, songsInList, songData.playlist, 2)
        end
    end,
    pausePlaySong = function()
        if radioType ~= 2 then return end
        if zeitRadio then
            zeitRadio.pausePlaySong()
        end
    end,
    updateRadioType = function(type, tempSaves)
        local idArray = {}
        if type == 2 and zeitRadio then
            local songData = zeitRadio.getCurrentlyPlayingSongData()
            local songsInList = {}
            idArray = zeitRadio.getPlaylistSongsById(songData.playlist)
            for _,v in ipairs(idArray) do
                songsInList[v] = zeitRadio.getSongDataById(v)
            end

            sendPlaylist(idArray, songsInList, songData.playlist, type)

            controller.getControllerSafe("gauges/customModules/zeitRadio").sendSong(songData)
        elseif type == 1 then
            sendPlaylist(fmTable[1], fmTable[2], 1, type)

            local tbl = fmTable[2][fmTable[1][1]]
            tbl.currentSongIndex = -1
            controller.getControllerSafe("gauges/customModules/zeitRadio").sendSong(tbl)
        else
            sendPlaylist(dabTable[1], dabTable[2], 1, type)

            local tbl = dabTable[2][dabTable[1][1]]
            tbl.currentSongIndex = -1
            controller.getControllerSafe("gauges/customModules/zeitRadio").sendSong(tbl)
        end
        radioType = type
    end,
    screenInit = function(saves, tempSaves)
        tempSaves['audio.list_scroll'] = 0
        tempSaves['playlistSize'] = 0
    end
}