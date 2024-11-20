// written by DaddelZeit
// DO NOT USE WITHOUT PERMISSION

//console.log("load gaugesScreen");
angular.module('gaugesScreen', ["ScreenUnits", "ScreenUtils"])
.directive('bngMapRenderUncompressed', function () {
  return {
    template: `<svg width="100%" height="100%" class="container"></svg>`,
    scope: {
      map: '<',
      color: '@?',
      width: '@?',
      drivability: '@?'
    },
    replace: true,
    restrict: 'E',
    link: function (scope, element, attrs) {
      "use strict";
      var svg = element[0],
        domElems = {},
        mapScale = 1

      function getDrivabilityColor(d) {
        if (d <= 0.1) return '#967864'; //'#967864'
        if (d > 0.1 && d < 0.9) return '#969678'; //'#969678'
        return '#CCCCCC'; //orig '#DCDCDC', changed as too bright '#CCCCCC'
      }

      function isEmpty (obj) {
        return Object.keys(obj).length === 0;
      }

      function calcRadius (radius) {
        return  Math.min(Math.max(radius, 0), 5) * 3
      }

      scope.$watch('map', function (newVal) {
        if (newVal && !isEmpty(newVal)) {
          setupMap(newVal, angular.element(svg));
        }
      })

      function _createLine(p1, p2, color) {
         return hu('<line>', svg).attr({
          x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
          stroke: color,
          strokeWidth: Math.max(p1.radius, p2.radius),
          strokeLinecap: "round",
        });
      }

      function drawRoads(nodes, drivabilityMin, drivabilityMax) {
        var drawn = {};
        for (var key in nodes) {
          var el = nodes[key];
          // walk the links of the node
          if (el.links !== undefined) { // links
            for (var key2 in el.links) {
              var el2 = nodes[key2];
              var drivability = el.links[key2].drivability;
              if (el2 !== undefined) {
                if (drivability >= drivabilityMin && drivability <= drivabilityMax) {
                  // TODO: can we find a better key here please?
                  drawn[key + '.' + key2 + drivabilityMin + drivabilityMax] = true;
                  if (domElems[key + '.' + key2 + drivabilityMin + drivabilityMax] !== undefined) {
                    domElems[key + '.' + key2 + drivabilityMin + drivabilityMax].remove();
                  }
                  domElems[key + '.' + key2 + drivabilityMin + drivabilityMax] = _createLine({
                    x: el.pos[0] / mapScale,
                    y: -el.pos[1] / mapScale,
                    radius: calcRadius(el.radius)
                  }, {
                      x: el2.pos[0] / mapScale,
                      y: -el2.pos[1] / mapScale,
                      radius: calcRadius(el2.radius)    // prevents massive blobs due to waypoints having larger radius'
                    }, getDrivabilityColor(drivability)
                  );
                }
              }
            }
          }
        }

        // remove all elems that are from previous calls
        for (var key in domElems) {
          if (!drawn[key] && key.endsWith('' + drivabilityMin + drivabilityMax)) {
            domElems[key].remove()
            domElems[key] = undefined; // delete domNode reference and allow for gc
          }
        }
      }

      function setupMap(data) {
        if (data != null) {
          svg.setAttribute('viewBox', data.viewParams.join(' '));

          // draw dirt roads and then normal on top
          if (scope.drivability !== 'false') {
            drawRoads(data.nodes, 0, 0.9);
            drawRoads(data.nodes, 0.9, 1);
          } else {
            drawRoads(data.nodes, 0, 1);
          }
        }
      }
    }
  };
})

.controller('GaugesScreenController', function ($scope, $element, $window, ScreenUnits, ScreenUtils) {
  "use strict";

  var svg;
  var bootsvg;
  var navContainer = document.getElementById("mapcontainer");

  let navMarker;
  var navDimensions = [];
  let mapPathGroup;
  let mapPath = {};

  var overlays = {};
  var screen = {};
  var zeidio = {};

  let isLhd = false;
  var ready = false;

  var units = {
    uiUnitConsumptionRate: "metric",
    uiUnitDate: "ger",
    uiUnitEnergy: "metric",
    uiUnitLength: "metric",
    uiUnitPower: "hp",
    uiUnitPressure: "bar",
    uiUnitTemperature: "c",
    uiUnitTorque: "metric",
    uiUnitVolume: "l",
    uiUnitWeight: "kg"
  };

  let date = 0;
  let settings = {};
  settings.mapState = [false,false];
  settings.navi_text_offset = 0;
  settings.last_navi_text_offset = 0;

  let economyScreenModes = {
    "avg_consumption_reset": "Average Consumption\nAfter Reset",
    "avg_consumption_refuel": "Average Consumption\nAfter Refuel",
    "trip_elapsed": "Trip Elapsed",
    "cruise_range": "Cruising Range",
    "instant_consumption": "Instant Consumption",
    "avg_speed": "Average Speed",
  }

  let state = ""
  let updateTrip = true
  var lastIgnitionState = 5
  let time = 0

  let carSpeed = 0
  let tripVal = 0

  let zeidioAnimation
  let lastHomeScreenScroll = 0
  let lastLastHomeScreenScroll = 0

  let currentDestinationInfo
  let destDestinationAnimation
  let mainDestinationAnimation
  let homeScreenAmbColorMatrix
  let video

  let playlistData = {}
  let songData = {}

  // Make sure SVG is loaded
  $scope.onSVGLoaded = function () {
    svg = $element[0].children[1].children[0];

    ScreenUtils.svgDimensions.fromX = 1024
    ScreenUtils.svgDimensions.fromY = 512
    ScreenUtils.svgDimensions.toX = svg.viewBox.baseVal.width
    ScreenUtils.svgDimensions.toY = svg.viewBox.baseVal.height

    zeidio.text = hu('#zeidio_text', screen.root)
    zeidio.text.n.style.transform = "translate( -3px, 0px)"
    zeidio.phoneName = hu('#phone_name', screen.root)

    // POPUP AND BOOT
    overlays.block = hu('#block', screen.root)
    overlays.block.css({"display":"inline"})
    overlays.time = hu('#time_text', screen.root)
    overlays.popup = { root: hu('#popup_message', screen.root)}
    overlays.popup.text = hu('#popup_msg', overlays.popup.root)
    overlays.popup.button_text = hu('#popup_ok', overlays.popup.root)
    overlays.popup.root.css({"display": "none"})
    overlays.network = hu('#network', screen.root)
    overlays.phone_names = hu('#phone_name_group', screen.root)

    // NAVI
    screen.navi = { root: hu('#navi', screen.root) }
    screen.navi.button_text_north_lock = hu('#navi_text_north_lock', screen.navi.root)
    //screen.navi.marker = hu('#navmarker', screen.navi.root)
    //screen.navi.marker.css({"transform-origin": "center"})
    screen.navi.destination_info = hu('#navi_destination_info_main', screen.navi.root)
    screen.navi.destination_info_name = hu('#navi_main_destination_text', screen.navi.destination_info)
    screen.navi.destination_info_distance = hu('#navi_main_destination_distance_text', screen.navi.destination_info)
    screen.navi.destination_info_est = hu('#navi_main_destination_estimate_text', screen.navi.destination_info)

    screen.destination = { root: hu('#navi_destination', screen.root) }
    screen.destination.destinations_group = hu('#navi_destinations_group', screen.destination.root)
    screen.destination.destinations_group.n.style.transition = "transform 0.3s"
    screen.destination.search_result_template = hu('#navi_destination_search_result_template', screen.destination.root)
    screen.destination.searchtext_fallback = hu('#navi_destination_searchtext_fallback', screen.destination.root)
    screen.destination.searchtext_group = hu('#navi_destination_searchtext_group', screen.destination.root)
    screen.destination.searchtext = hu('#navi_destination_searchtext', screen.destination.root)
    screen.destination.searchtext_cursor = hu('#navi_destination_searchtext_cursor', screen.destination.root)
    screen.destination.destination_info = hu('#navi_destination_info_dest', screen.destination.root)
    screen.destination.destination_info_name = hu('#navi_dest_destination_text', screen.destination.destination_info)
    screen.destination.destination_info_distance = hu('#navi_dest_destination_distance_text', screen.destination.destination_info)
    screen.destination.destination_info_est = hu('#navi_dest_destination_estimate_text', screen.destination.destination_info)

    screen.destination.searchtext_cursor.n.animate(
      [
        {opacity:0.1},
        {opacity:1.0},
        {opacity:0.1},
      ], {
        duration: 1000,
        iterations: Infinity,
        easing: "ease-in-out"
      },
    )

    // PKSA
    screen.pksa = { root: hu('#pksa', screen.root)}
    screen.pksa.sensors = {
      front: [
        [
          hu('#sensor_frr_green', screen.pksa.root),
          hu('#sensor_frr_yellow', screen.pksa.root),
          hu('#sensor_frr_red', screen.pksa.root)
        ],
        [
          hu('#sensor_fr_green', screen.pksa.root),
          hu('#sensor_fr_yellow', screen.pksa.root),
          hu('#sensor_fr_red', screen.pksa.root)
        ],
        [
          hu('#sensor_fl_green', screen.pksa.root),
          hu('#sensor_fl_yellow', screen.pksa.root),
          hu('#sensor_fl_red', screen.pksa.root)
        ],
        [
          hu('#sensor_fll_green', screen.pksa.root),
          hu('#sensor_fll_yellow', screen.pksa.root),
          hu('#sensor_fll_red', screen.pksa.root)
        ],
      ],
      rear: [
        [
          hu('#sensor_rrr_green', screen.pksa.root),
          hu('#sensor_rrr_yellow', screen.pksa.root),
          hu('#sensor_rrr_red', screen.pksa.root)
        ],
        [
          hu('#sensor_rr_green', screen.pksa.root),
          hu('#sensor_rr_yellow', screen.pksa.root),
          hu('#sensor_rr_red', screen.pksa.root)
        ],
        [
          hu('#sensor_rl_green', screen.pksa.root),
          hu('#sensor_rl_yellow', screen.pksa.root),
          hu('#sensor_rl_red', screen.pksa.root)
        ],
        [
          hu('#sensor_rll_green', screen.pksa.root),
          hu('#sensor_rll_yellow', screen.pksa.root),
          hu('#sensor_rll_red', screen.pksa.root)
        ]
      ]
    }
    screen.pksa.backgroundCar = hu('#image11003', screen.pksa.root)
    screen.pksa.backgroundCol = hu('#rect11029', screen.pksa.root)
    screen.pksa.options = hu('#image999', screen.pksa.root)

    // AUDIO
    screen.audio = { root: hu('#audio', screen.root) }
    screen.audio.no_zeidio_blackout = hu('#audio_no_zeidio_blackout', screen.audio.root)
    screen.audio.source_text = hu('#audio_source_text', screen.audio.root)
    screen.audio.source_list_text = hu('#audio_source_list_text', screen.audio.root)
    screen.audio.list_entry_template = hu('#audio_list_entry_template', screen.audio.root)
    screen.audio.list_selected = hu('#audio_list_selected', screen.audio.root)
    screen.audio.list_wrap = hu('#audio_list_wrap', screen.audio.root)
    screen.audio.list_wrap.n.style.transition = "transform 0.3s"
    screen.audio.list_entries = hu('#audio_list_entries', screen.audio.root)
    screen.audio.list_scrollbar = hu('#audio_scrollbar', screen.audio.root)
    screen.audio.list_scrollbar.n.style.transition = "transform 0.3s"
    screen.audio.song_author_name = hu('#audio_song_author_name', screen.audio.root)
    screen.audio.channel_subtitle = hu('#audio_channel_subtitle', screen.audio.root)
    screen.audio.channel_text = hu('#audio_channel_text', screen.audio.root)
    screen.audio.song_info_cover = hu('#audio_song_info_cover', screen.audio.root)
    screen.audio.progress_circle = hu('#audio_progress_circle', screen.audio.root)

    screen.audio.audio_progress = hu('#audio_progress', screen.audio.root)
    screen.audio.audio_skippb_button = hu('#audio_skippb_button', screen.audio.root)
    screen.audio.audio_skipb_button = hu('#audio_skipb_button', screen.audio.root)
    screen.audio.audio_skipf_button = hu('#audio_skipf_button', screen.audio.root)
    screen.audio.audio_skippf_button = hu('#audio_skippf_button', screen.audio.root)

    screen.audio.play_button_icon = hu('#audio_play_button_icon', screen.audio.root)
    screen.audio.pause_button_icon = hu('#audio_pause_button_icon', screen.audio.root)
    screen.audio.pause_button_icon.css({"display": "none"})
    screen.audio.audio_stop_button = hu('#audio_stop_button', screen.audio.root)

    // GENERAL SETTINGS
    screen.settings_general = { root: hu('#settings_general', screen.root) }

    // GENERAL SETTINGS - TIME
    screen.settings_general_time = { root: hu('#settings_general_time', screen.root) }
    screen.settings_general_time.format = {
      time_24h_selected: hu('#settings_time_24h_selected', screen.settings_general_time.root),
      time_12h_selected: hu('#settings_time_12h_selected', screen.settings_general_time.root),
    }
    screen.settings_general_time.dropdown_text = hu('#settings_time_zone_dropdown_text', screen.settings_general_time.root)
    screen.settings_general_time_dropdown = { root: hu('#settings_time_zone_dropdown_open', screen.root) }
    screen.settings_general_time_dropdown.texts = [
      hu('#settings_time_zone_dropdown_open_text_0', screen.settings_general_time_dropdown.root),
      hu('#settings_time_zone_dropdown_open_text_1', screen.settings_general_time_dropdown.root),
    ]

    // GENERAL SETTINGS - EXTERNAL UI
    screen.settings_general_extui = { root: hu('#settings_general_extui', screen.root) }
    screen.settings_general_extui.android_1_selected = [
      hu('#settings_android_1_disabled_selected', screen.settings_general_extui.root),
      hu('#settings_android_1_enabled_selected', screen.settings_general_extui.root)
    ]
    screen.settings_general_extui.android_2_selected = [
      hu('#settings_android_2_disabled_selected', screen.settings_general_extui.root),
      hu('#settings_android_2_enabled_selected', screen.settings_general_extui.root)
    ]

    screen.settings_general_extui.carplay_1_selected = [
      hu('#settings_carplay_1_disabled_selected', screen.settings_general_extui.root),
      hu('#settings_carplay_1_enabled_selected', screen.settings_general_extui.root)
    ]
    screen.settings_general_extui.carplay_2_selected = [
      hu('#settings_carplay_2_disabled_selected', screen.settings_general_extui.root),
      hu('#settings_carplay_2_enabled_selected', screen.settings_general_extui.root)
    ]

    // GENERAL SETTINGS - CONNECTIVITY
    screen.settings_general_connectivity = { root: hu('#settings_general_connectivity', screen.root) }
    screen.settings_general_connectivity.connected_devices = [
      hu('#settings_connected_device1_text', screen.settings_general_connectivity.root),
      hu('#settings_connected_device2_text', screen.settings_general_connectivity.root),
      hu('#settings_connected_device3_text', screen.settings_general_connectivity.root),
      hu('#settings_connected_device4_text', screen.settings_general_connectivity.root),
    ]
    screen.settings_general_connectivity.contact_sort_text = hu('#settings_contact_sort_text', screen.settings_general_connectivity.root)
    screen.settings_general_connectivity.bluetooth_vehname = hu('#settings_bluetooth_vehname', screen.settings_general_connectivity.root)
    screen.settings_general_connectivity.bluetooth_active_button = hu('#settings_bluetooth_active_button', screen.settings_general_connectivity.root)
    screen.settings_general_connectivity.mute_nav_active_button = hu('#settings_mute_nav_active_button', screen.settings_general_connectivity.root)
    screen.settings_general_connectivity.refresh_contacts_button = hu('#settings_refresh_contacts_button', screen.settings_general_connectivity.root)

    // GENERAL SETTINGS - SYSTEM
    screen.settings_general_system = { root: hu('#settings_general_system', screen.root) }
    screen.settings_general_system.check_update_button = hu('#settings_check_update_button', screen.root)
    screen.settings_general_system.settings_vehinfo_market = hu('#settings_vehinfo_market', screen.root)
    screen.settings_general_system.settings_vehinfo_layout = hu('#settings_vehinfo_layout', screen.root)
    screen.settings_general_system.settings_vehinfo_fuel = hu('#settings_vehinfo_fuel', screen.root)
    screen.settings_general_system.settings_vehinfo_rooftype = hu('#settings_vehinfo_rooftype', screen.root)

    // GENERAL SETTINGS - UNITS
    screen.settings_general_units = { root: hu('#settings_general_units', screen.root) }
    screen.settings_general_units.length = hu('#settings_units_length_text', screen.root)
    screen.settings_general_units.temperature = hu('#settings_units_temperature_text', screen.root)
    screen.settings_general_units.weight = hu('#settings_units_weight_text', screen.root)
    screen.settings_general_units.volume = hu('#settings_units_volume_text', screen.root)
    screen.settings_general_units.economy = hu('#settings_units_economy_text', screen.root)
    screen.settings_general_units.power = hu('#settings_units_power_text', screen.root)
    screen.settings_general_units.torque = hu('#settings_units_torque_text', screen.root)
    screen.settings_general_units.energy = hu('#settings_units_energy_text', screen.root)
    screen.settings_general_units.pressure = hu('#settings_units_pressure_text', screen.root)
    screen.settings_general_units.dateformat = hu('#settings_units_dateformat_text', screen.root)

    // GENERAL SETTINGS - LANG
    screen.settings_general_lang = { root: hu('#settings_general_lang', screen.root) }

    // GENERAL SETTINGS - RESET
    screen.settings_general_reset = { root: hu('#settings_general_reset', screen.root) }
    screen.settings_general_reset_prompt = { root: hu('#reset_prompt', screen.root) }

    // GAUGE SETTINGS
    screen.settings_gauges = { root: hu('#settings_gauges', screen.root) }
    screen.settings_gauges_right = { root: hu('#settings_gauges_right', screen.root) }
    screen.settings_gauges_left = { root: hu('#settings_gauges_left', screen.root) }
    screen.settings_gauges_left_overview = { root: hu('#settings_gauges_left_overview', screen.root) }
    screen.settings_gauges_left_economy = { root: hu('#settings_gauges_left_economy', screen.root) }
    screen.settings_gauges_left_economy_dropdown = { root: hu('#settings_gauges_left_economy_dropdown', screen.root) }
    screen.settings_gauges_left_economy_dropdown.selected = hu('#settings_gauges_left_economy_dropdown_selected', screen.settings_gauges_left_economy_dropdown.root)

    screen.settings_gauges_left_economy.economy_menu = [
      hu('#settings_gauges_left_economy_menu1', screen.settings_gauges_left_economy.root),
      hu('#settings_gauges_left_economy_menu2', screen.settings_gauges_left_economy.root),
      hu('#settings_gauges_left_economy_menu3', screen.settings_gauges_left_economy.root),
      hu('#settings_gauges_left_economy_menu4', screen.settings_gauges_left_economy.root),
    ]

    // AUDIO SETTINGS
    screen.settings_audio = { root: hu('#settings_audio', screen.root) }
    screen.settings_audio_overview = { root: hu('#settings_audio_overview', screen.root) }
    screen.settings_audio_notifications = { root: hu('#settings_audio_notifications', screen.root) }
    screen.settings_audio_notifications.ringtone_active = hu('#settings_audio_notifications_ringtone_active', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.rear_sensors_active = hu('#settings_audio_notifications_rear_sensors_active', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.front_sensors_active = hu('#settings_audio_notifications_front_sensors_active', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.notifications_active = hu('#settings_audio_notifications_notifications_active', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.speed_warning_active = hu('#settings_audio_notifications_speed_warning_active', screen.settings_audio_notifications.root)

    screen.settings_audio_notifications.rear_sensors_volume = hu('#settings_audio_notifications_rear_sensors_volume', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.front_sensors_volume = hu('#settings_audio_notifications_front_sensors_volume', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.notifications_volume = hu('#settings_audio_notifications_notifications_volume', screen.settings_audio_notifications.root)
    screen.settings_audio_notifications.speed_warning_volume = hu('#settings_audio_notifications_speed_warning_volume', screen.settings_audio_notifications.root)

    screen.settings_vehicle = { root: hu('#settings_vehicle', screen.root) }
    screen.settings_vehicle_car_display = { root: hu('#settings_vehicle_car_display', screen.root) }
    screen.settings_vehicle_car_display.ccf = hu('#settings_vehicle_car_display_normal', screen.settings_vehicle_car_display.root)
    screen.settings_vehicle_car_display.eccf = hu('#settings_vehicle_car_display_electric', screen.settings_vehicle_car_display.root)
    screen.settings_vehicle_car_display.country = hu('#settings_vehicle_car_display_country', screen.settings_vehicle_car_display.root)

    screen.settings_vehicle_light = { root: hu('#settings_vehicle_light', screen.root) }
    screen.settings_vehicle_light.lights_highbeam_timer = hu('#settings_vehicle_lights_highbeam_timer', screen.settings_vehicle_light.root)
    screen.settings_vehicle_light.lights_mode = hu('#settings_vehicle_lights_mode', screen.settings_vehicle_light.root)
    screen.settings_vehicle_light.entry_exit = hu('#settings_vehicle_lights_entry_exit', screen.settings_vehicle_light.root)
    screen.settings_vehicle_light.lights_interior_timer = hu('#settings_vehicle_lights_interior_timer', screen.settings_vehicle_light.root)
    screen.settings_vehicle_lights_highbeam_timer_dropdown = { root: hu('#settings_vehicle_lights_highbeam_timer_dropdown', screen.root) }
    screen.settings_vehicle_lights_mode_dropdown = { root: hu('#settings_vehicle_lights_mode_dropdown', screen.root) }
    screen.settings_vehicle_lights_entry_exit_timer_dropdown = { root: hu('#settings_vehicle_lights_entry_exit_timer_dropdown', screen.root) }

    screen.settings_vehicle_aeb = { root: hu('#settings_vehicle_aeb', screen.root) }
    screen.settings_vehicle_aeb.global_active = hu('#settings_vehicle_aeb_global_enabled', screen.settings_vehicle_aeb.root)
    screen.settings_vehicle_aeb.mode_active = hu('#settings_vehicle_aeb_drivemode_enabled', screen.settings_vehicle_aeb.root)
    screen.settings_vehicle_pksa = { root: hu('#settings_vehicle_pksa', screen.root) }
    screen.settings_vehicle_pksa.front_sensors_enabled = hu('#settings_vehicle_front_sensors_enabled', screen.settings_vehicle_pksa.root)
    screen.settings_vehicle_pksa.rear_sensors_enabled = hu('#settings_vehicle_rear_sensors_enabled', screen.settings_vehicle_pksa.root)
    screen.settings_vehicle_pksa.front_sensors_sound_enabled = hu('#settings_vehicle_front_sensors_sound_enabled', screen.settings_vehicle_pksa.root)
    screen.settings_vehicle_pksa.rear_sensors_sound_enabled = hu('#settings_vehicle_rear_sensors_sound_enabled', screen.settings_vehicle_pksa.root)

    screen.settings_vehicle_hill = { root: hu('#settings_vehicle_hill', screen.root) }
    screen.settings_vehicle_hill.start_global_active = hu('#settings_vehicle_hillstart_enabled', screen.settings_vehicle_hill.root)
    screen.settings_vehicle_hill.start_mode_active = hu('#settings_vehicle_hillstart_drivemode_enabled', screen.settings_vehicle_hill.root)
    screen.settings_vehicle_hill.descent_global_active = hu('#settings_vehicle_hilldescent_enabled', screen.settings_vehicle_hill.root)
    screen.settings_vehicle_hill.descent_mode_active = hu('#settings_vehicle_hilldescent_drivemode_enabled', screen.settings_vehicle_hill.root)

    screen.settings_vehicle_ass = { root: hu('#settings_vehicle_ass', screen.root) }
    screen.settings_vehicle_ass.start_stop_active = hu('#settings_vehicle_ass_enabled', screen.settings_vehicle_ass.root)

    screen.ambience = { root: hu('#ambience', screen.root) }
    screen.ambience.color_display = hu('#ambience_color_display', screen.ambience.root)
    screen.ambience.ambience_colour_picker = hu('#ambience_colour_picker', screen.ambience.root)
    screen.ambience.ambience_brightness_picker = hu('#ambience_brightness_picker', screen.ambience.root)
    screen.ambience.enable_button_text = hu('#ambience_disable_button_text', screen.ambience.root)

    screen.home = { root: hu('#home', screen.root) }
    screen.home.islands_group = hu('#home_islands', screen.home.root)
    screen.home.scrollbar = hu('#home_scrollbar', screen.home.root)
    screen.home.ass = hu('#home_start_stop_enabled', screen.home.root)
    screen.home.ambience_image = hu('#home_ambience_image', screen.home.root)
    screen.home.ambience_button_text = hu('#home_ambience_button_text', screen.home.root)

    screen.home.ccf = hu('#home_cartype_ccf', screen.home.root)
    screen.home.eccf = hu('#home_cartype_eccf', screen.home.root)
    screen.home.country = hu('#home_cartype_country', screen.home.root)
    screen.home.profileText = hu('#home_profile_text', screen.home.root)
    screen.home.destination_text = hu('#home_destination_text', screen.home.root)

    screen.car = { root: hu('#car', screen.root) }

    screen.car_mode = { root: hu('#car_mode', screen.root) }
    screen.car_mode.ccf = hu('#car_mode_cartype_ccf', screen.car_mode.root)
    screen.car_mode.eccf = hu('#car_mode_cartype_eccf', screen.car_mode.root)
    screen.car_mode.country = hu('#car_mode_cartype_country', screen.car_mode.root)
    screen.car_mode.anti_rollbar_extra = hu('#car_mode_anti_rollbar_extra', screen.car_mode.root)
    screen.car_mode.modename = hu('#car_mode_modename', screen.car_mode.root)
    screen.car_mode.modebg = hu('#car_mode_modebgblur', screen.car_mode.root)
    screen.car_mode.options = {
      aeb: hu('#car_mode_aeb', screen.car_mode.root),
      yawControl: hu('#car_mode_esc', screen.car_mode.root),
      tractionControl: hu('#car_mode_tc', screen.car_mode.root),
      motorTorqueControl: hu('#car_mode_mtc', screen.car_mode.root),
      brakeControl: hu('#car_mode_bc', screen.car_mode.root),
      twoStepLaunch: hu('#car_mode_lc', screen.car_mode.root),
      adaptiveFrontSwayBar: hu('#car_mode_anti_rollbars', screen.car_mode.root),
    }

    screen.car_trip = { root: hu('#car_trip', screen.root) }
    screen.car_trip.ccf = hu('#car_trip_cartype_ccf', screen.car_trip.root)
    screen.car_trip.eccf = hu('#car_trip_cartype_eccf', screen.car_trip.root)
    screen.car_trip.country = hu('#car_trip_cartype_country', screen.car_trip.root)

    screen.car_trip.units = {
      avg_consumption_refuel: hu('#car_trip_avg_consumption_refuel_unit', screen.car_trip.root),
      avg_consumption_reset: hu('#car_trip_avg_consumption_reset_unit', screen.car_trip.root),
      trip: hu('#car_trip_time_unit', screen.car_trip.root),
      avg_speed: hu('#car_trip_avg_speed_unit', screen.car_trip.root),
      distance: hu('#car_trip_distance_unit', screen.car_trip.root),
    }

    screen.car_trip.values = {
      avg_consumption_refuel: hu('#car_trip_avg_consumption_refuel', screen.car_trip.root),
      avg_consumption_reset: hu('#car_trip_avg_consumption_reset', screen.car_trip.root),
      trip: hu('#car_trip_time', screen.car_trip.root),
      avg_speed: hu('#car_trip_avg_speed', screen.car_trip.root),
      distance: hu('#car_trip_distance', screen.car_trip.root),
    }

    screen.car_tpms = { root: hu('#car_tpms', screen.root) }
    screen.car_tpms.disabled = hu('#car_tpms_disabled', screen.car_tpms.root)
    screen.car_tpms.unit = hu('#car_tpms_readout_unit', screen.car_tpms.root)
    screen.car_tpms.country = hu('#car_tpms_cartype_country', screen.car_tpms.root)
    screen.car_tpms.ccf_eccf = hu('#car_tpms_cartype_ccf_eccf', screen.car_tpms.root)
    screen.car_tpms.readouts = {
      FL: hu('#car_tpms_readout_fl', screen.car_tpms.root),
      FR: hu('#car_tpms_readout_fr', screen.car_tpms.root),
      RL: hu('#car_tpms_readout_rl', screen.car_tpms.root),
      RR: hu('#car_tpms_readout_rr', screen.car_tpms.root),
    }

    homeScreenAmbColorMatrix = document.getElementById("feColorMatrix167819")
    video = document.getElementById("bootscreenvideo")

    ready = true;
  }

  // overwriting plain javascript function so we can access from within the controller
  $window.setup = (data) => {
    if(!ready){
      setTimeout(function(){ $window.setup(data) }, 100);
      return;
    }

    isLhd = data.isLhd || false
    if (data.versionId) {
      document.getElementById("settings_system_version").children[0].innerHTML = data.versionId
    }
    if (data.versionDate) {
      document.getElementById("settings_system_version_date").children[0].innerHTML = data.versionDate.replace(/\s/g,'')
    }

    setTimeout(function(){
      var button = document.querySelector('[title="Play"]') || false;
      if (button) {
          console.log('Click', button)
          button.click()
      }
  }, 999)
  }

  $window.initMap = (data) => {
    navDimensions = data.viewParams = [
      data.terrainOffset[0],
      data.terrainOffset[1],
      data.terrainSize[0],
      data.terrainSize[1]
    ];

    if (data.terrainOffset && data.terrainSize) {
      if (data.terrainTiles && data.terrainTiles[0] && data.terrainTiles[0].size) {
        for (let tile of data.terrainTiles) {
          if (!tile.file || !tile.offset || !tile.size)
            continue;
          if (!tile.file.startsWith("/"))
            tile.file = "/" + tile.file;

          let dest = [
            tile.offset[0],
            -tile.offset[1],
            tile.size[0],
            tile.size[1],
          ];

          hu('<image>', navContainer).attr({
            'x': dest[0],
            'y': dest[1],
            'width': dest[2],
            'height': dest[3],
            'transform': "scale(1,1)",
            'xlink:href': tile.file,
          }).prependTo(navContainer)
        }
      } else if (data.minimapImage) {
        hu('<image>', navContainer).attr({
          'x': data.terrainOffset[0],
          'y': data.terrainOffset[1],
          'width': data.terrainSize[0],
          'height': data.terrainSize[1],
          'transform': "scale(-1,-1)",
          'xlink:href': "/" + data.minimapImage,
        }).prependTo(navContainer)
      }
    }

    $scope.$apply(() => {
      this.mapData = data;
    });

    mapPathGroup = hu('<g>', navContainer).attr({
      'x': "0",
      'y': "0",
    })

    navMarker = hu('<g>', navContainer).attr({
      'x': "0",
      'y': "0",
    })

    hu('<image>', navContainer).attr({
      'x': "-16.5px",
      'y': "-16.5px",
      'width': "33px",
      'height': "33px",
      'xlink:href': "img/navigator.png",
      'style': "display:inline"
    }).prependTo(navMarker)

    navContainer.style.width = data.terrainSize[0] + "px";
    navContainer.style.height = data.terrainSize[1] + "px";
  }

  $window.updateMap = (data) => {
    if(!ready || state[0] !== "navi"){return}

    if (mapPath[0]) {
      mapPath[0].attr({"x1": data.x})
      mapPath[0].attr({"y1": -data.y})
    }

    let focusX = -data.x;
    let focusY = data.y;

    if (settings.navi_move_x && settings.navi_move_y) {
      focusX = settings.mapState[2] + settings.navi_move_x * 512;
      focusY = settings.mapState[3] - settings.navi_move_y * 256;
      settings.mapState[1] = true;
    } else {
      settings.mapState[2] = -data.x;
      settings.mapState[3] = data.y;
    }

    var origin = `${((navDimensions[0] * -1)) - focusX}px ${((navDimensions[1] * -1)) - focusY}px`;
    navContainer.style.transformOrigin = origin;

    let move = state[1]?(isLhd?128:-128):0
    $element[0].children[0].style.perspectiveOrigin = `${512+move}px 256px`

    var translateX = (navDimensions[0] + 512 + move + focusX);
    var translateY = (navDimensions[1] + 256 + focusY);
    navContainer.style.transform = `translate3d(${translateX}px,${translateY}px, 0px) rotateX(${settings.mapState[0]==true?60:0}deg) rotateZ(${settings.mapState[1]==false?(180 + (data.rotation + 360)):0}deg) scale(${1.5-Math.min(carSpeed/56, 0.5)})`;

    var carPosX = data.x;
    var carPosY = -data.y;

    navMarker.n.style.transformOrigin = `${carPosX}px,${carPosY}px`;
    let transform = `translate(${carPosX}px,${carPosY}px) rotateZ(${180-data.rotation+360}deg)`
    navMarker.n.style.transform = transform
  }

  $window.updateMapPath = (data) => {
    for (var key in mapPath) {
      mapPath[key].remove();
    }

    function _createLine(p1, p2, color) {
      return hu('<line>', mapPathGroup).attr({
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        stroke: color,
        strokeWidth: Math.max(p1.radius, p2.radius),
        strokeLinecap: "round",
      });
    }

    let routeData = data.mapPath
    let i = 0;
    let j = 0
    for (i=0; i<routeData.length-6; i+=3) {
      mapPath[j] = _createLine({
        x: routeData[i] / 1,
        y: -routeData[i+1] / 1,
        radius: Math.min(Math.max(i+2, 0), 5) * 3
      }, {
        x: routeData[i+3] / 1,
        y: -routeData[i+4] / 1,
        radius: Math.min(Math.max(i+5, 0), 5) * 3
      },
      '#0094FF');
      j++;
    }

    currentDestinationInfo = data.info
    if (currentDestinationInfo) {
      if (currentDestinationInfo.name != screen.navi.destination_info_name.n.children[0].innerHTML) {
        screen.home.destination_text.text(currentDestinationInfo.name);
        screen.navi.destination_info_name.text(currentDestinationInfo.name)
        screen.destination.destination_info_name.text(currentDestinationInfo.name)

        let textWidth = screen.destination.destination_info_name.n.getBoundingClientRect().width
        if (textWidth > 160) {
          destDestinationAnimation = screen.destination.destination_info_name.n.animate(
            [
              {transform:`translateX( ${ScreenUtils.XpxToSVG(161)}px)`},
              {transform:`translateX(                 0px)`},
              {transform:`translateX(                 0px)`},
              {transform:`translateX(-${ScreenUtils.XpxToSVG(textWidth,0.02)}px)`}
            ], {
              duration: 8000,
              iterations: Infinity,
            },
          )
        } else if (destDestinationAnimation) {
          destDestinationAnimation.cancel()
        }

        if (textWidth > 410) {
          mainDestinationAnimation = screen.navi.destination_info_name.n.animate(
            [
              {transform:`translateX( ${ScreenUtils.XpxToSVG(410)}px)`},
              {transform:`translateX(                 8px)`},
              {transform:`translateX(                 8px)`},
              {transform:`translateX(-${ScreenUtils.XpxToSVG(textWidth,0.02)}px)`}
            ], {
              duration: 8000,
              iterations: Infinity,
            },
          )
        } else if (mainDestinationAnimation) {
          mainDestinationAnimation.cancel()
        }
      }

      let text
      if (typeof currentDestinationInfo.distance == "number") {
        if (settings.settings_unit_length === "metric") {
          text = (currentDestinationInfo.distance/1000).toFixed(1)
          screen.navi.destination_info_distance.text(text + " kilometers")
          screen.destination.destination_info_distance.text(text + " km")
        } else {
          text = (currentDestinationInfo.distance/1609.34).toFixed(1)
          screen.navi.destination_info_distance.text(text + " miles")
          screen.destination.destination_info_distance.text(text + " mi")
        }
      } else {
        screen.navi.destination_info_distance.text("...")
        screen.destination.destination_info_distance.text("...")
      }

      if (typeof currentDestinationInfo.est == "string") {
        screen.navi.destination_info_est.text(currentDestinationInfo.est)
        screen.destination.destination_info_est.text(currentDestinationInfo.est)
      } else {
        let arrivalSeconds = date + 1000*currentDestinationInfo.est
        let current_time = new Date(arrivalSeconds);
        if (settings.settings_time_12h) {
          text = current_time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
        } else {
          text = current_time.getHours() + ":" + ScreenUtils.fixClock(current_time.getMinutes())
        }
        screen.navi.destination_info_est.text(text)
        screen.destination.destination_info_est.text(text)
      }
    } else {
      screen.home.destination_text.text("No Destination Set");
    }

    if (state[0] === "navi") {
      if (state[1] === "destination") {
        screen.navi.destination_info.css({"opacity":0});
        screen.destination.destination_info.css({"opacity":currentDestinationInfo?1:0});
      } else {
        screen.navi.destination_info.css({"opacity":currentDestinationInfo?1:0});
        screen.destination.destination_info.css({"opacity":0});
      }
    }
  }

  $window.updateMapDestinations = (data) => {
    screen.destination.destinations_group.n.innerHTML = ""

    for (let i = 0; i < data.length; i++) {
      var newGroup = hu('<g>', screen.destination.destinations_group).attr({
        'transform': `translate(0, ${(i+1)*5.4570316})`,
      }).prependTo(screen.destination.destinations_group)

      newGroup.n.innerHTML = screen.destination.search_result_template.n.innerHTML
      newGroup.n.children[0].children[0].children[0].innerHTML = data[i][0]

      let textWidth = newGroup.n.children[0].children[0].children[0].getBoundingClientRect().width
      if (textWidth > 300) {
        newGroup.n.children[0].children[0].animate(
          [
            {transform:`translateX( ${ScreenUtils.XpxToSVG(300)}px)`},
            {transform:`translateX(                 0px)`},
            {transform:`translateX(                 0px)`},
            {transform:`translateX(-${ScreenUtils.XpxToSVG(textWidth, 0.02)}px)`}
          ], {
            duration: 8000,
            iterations: Infinity,
          },
        )
      }

      if (settings.settings_unit_length === "metric") {
        newGroup.n.children[1].children[0].innerHTML = (data[i][2]/1000).toFixed(1) + " kilometers"
      } else {
        newGroup.n.children[1].children[0].innerHTML = (data[i][2]/1609.34).toFixed(1) + " miles"
      }
    }
  }

  $window.screenPopup = (data) => {
    overlays.popup.root.css({"display": data[0]===true?"inline":"none"})
    if (data[0]===true) {
      ScreenUtils.addText(overlays.popup.text, data[1], {"font-size":"3.66497px","line-height":"1.25","font-family":"'Nasalization'","font-variant-ligatures":"none","text-align":"center","text-anchor":"middle","stroke-width":"0.305414","fill":"#ffffff"})
      overlays.popup.button_text.text(data[2]||"OK")
    }
  }

  $window.updateDrivemode = (data) => {
    if (data.name === "TCS Disabled") {
      data.name = "TCS OFF"
    } else if (data.name === "DSE Fully Disabled") {
      data.name = "DSE OFF"
    }

    screen.car_mode.modename.text(data.name)
    screen.car_mode.modename.n.style.fill = data.settings.gauge.modeColor
    screen.car_mode.modename.n.children[0].style.fill = data.settings.gauge.modeColor
    screen.car_mode.modebg.css({"fill": data.settings.gauge.modeColor})

    screen.car_mode.options.aeb.css({"fill": data.settings.aeb.isEnabled?"#00ff00ff":"#ff0000ff"})
    screen.car_mode.options.yawControl.css({"fill": data.settings.yawControl.isEnabled?"#00ff00ff":"#ff0000ff"})
    screen.car_mode.options.tractionControl.css({"fill": data.settings.tractionControl.isEnabled?"#00ff00ff":"#ff0000ff"})

    if (data.settings.motorTorqueControl.isEnabled !== undefined) {
      screen.car_mode.options.motorTorqueControl.css({"fill": data.settings.motorTorqueControl.isEnabled?"#00ff00ff":"#ff0000ff"})
    } else {
      let isDefault = (data.settings.motorTorqueControl.yawControl === "default" && data.settings.motorTorqueControl.tractionControl === "default")
      let isTrue = (data.settings.motorTorqueControl["yawControl.isEnabled"] || data.settings.motorTorqueControl["tractionControl.isEnabled"])
      screen.car_mode.options.motorTorqueControl.css({"fill": (isDefault || isTrue)?"#00ff00ff":"#ff0000ff"})
    }

    if (data.settings.brakeControl.isEnabled !== undefined) {
      screen.car_mode.options.brakeControl.css({"fill": data.settings.brakeControl.isEnabled?"#00ff00ff":"#ff0000ff"})
    } else {
      let isDefault = (data.settings.brakeControl.yawControl === "default" && data.settings.brakeControl.tractionControl === "default")
      let isTrue = (data.settings.brakeControl["yawControl.isEnabled"] || data.settings.brakeControl["tractionControl.isEnabled"])
      screen.car_mode.options.brakeControl.css({"fill": (isDefault || isTrue)?"#00ff00ff":"#ff0000ff"})
    }

    screen.car_mode.options.twoStepLaunch.css({"fill": (data.settings.twoStepLaunch && data.settings.twoStepLaunch.isEnabled)?"#00ff00ff":"#ff0000ff"})
    screen.car_mode.options.adaptiveFrontSwayBar.css({"fill": data.settings.adaptiveFrontSwayBar.torsionBarMode==="off"?"#ff0000ff":"#00ff00ff"})
  }

  let stateUpdate = {
    navi: function() {
      screen.navi.destination_info.css({"opacity":currentDestinationInfo?1:0});
      screen.destination.destination_info.css({"opacity":0});
    },
    ['navi/destination']: function() {
      screen.navi.destination_info.css({"opacity":0});
      screen.destination.destination_info.css({"opacity":currentDestinationInfo?1:0});
    }
  }

  $window.screenStateUpdate = (data) => {
    state = data[0].split("/")
    let tempsave = {}
    for (var key in screen) {
      for (var key2 in state) {
        tempsave[key] = tempsave[key]==true?true:(state[key2] === key)
        screen[key].root.css({"display": tempsave[key]?"inline":"none"})
      }
    }

    if (stateUpdate[data[0]]) {
      stateUpdate[data[0]]()
    }
  }

  $window.execFunc = (data) => {
    var func = new Function("return function func(s){"+data[0]+"}")();
    func(settings)
  }

  $window.setLeftScreen = (data) => {}
  $window.setRightScreen = (data) => {}
  $window.setLeftEconomyScreen = (data) => {}

  $window.screenEnableZeidio = (data) => {}

  $window.zeidioPlaylistChanged = (data) => {
    if(!ready){
      setTimeout(function(){ $window.zeidioPlaylistChanged(data) }, 100);
      return;
    }

    settings.audio_radio_type = data[3]

    playlistData = data[0]
    settings.audio_list_selected = -1
    settings.audio_list_scroll = 0
    settings.audio_max_scroll = Math.max(playlistData.length-5, 0)

    screen.audio.list_entries.n.innerHTML = ""
    screen.audio.source_text.text(settings.audio_radio_type===2?"Zeidio":(settings.audio_radio_type===1?"FM":"DAB"))
    screen.audio.source_list_text.text(settings.audio_radio_type===2?"Playlist "+data[2]:"SOURCE LIST")
    let offset = -8.7178147*2
    for (let i = 1; i < playlistData.length; i++) {
      var newGroup = hu('<g>', screen.audio.list_entries).attr({
        'transform': `translate(0, ${offset+i*8.7178147})`,
      }).prependTo(screen.audio.list_entries)
      newGroup.n.innerHTML = screen.audio.list_entry_template.n.innerHTML

      let songData = data[1][playlistData[i]]
      newGroup.n.children[0].children[0].innerHTML = songData.channel || songData.name
      let textWidth = newGroup.n.children[0].children[0].getBoundingClientRect().width
      if (textWidth > 170) {
        newGroup.n.children[0].animate(
          [
            {transform:`translateX( ${ScreenUtils.XpxToSVG(textWidth, 0.05)}px)`},
            {transform:`translateX(                 0px)`},
            {transform:`translateX(                 0px)`},
            {transform:`translateX(-${ScreenUtils.XpxToSVG(textWidth, 0.05)}px)`}
          ], {
            duration: 8000,
            iterations: Infinity,
          },
        )
      }
      newGroup.n.children[3].setAttribute('xlink:href',"/"+songData.coverUrl)
    }

    //screen.audio.audio_skippb_button.css({"display": settings.audio_radio_type==2?"inline":"none"});
    //screen.audio.audio_skipb_button.css({"display": settings.audio_radio_type==2?"inline":"none"});
    //screen.audio.audio_skipf_button.css({"display": settings.audio_radio_type==2?"inline":"none"});
    //screen.audio.audio_skippf_button.css({"display": settings.audio_radio_type==2?"inline":"none"});
    //screen.audio.audio_stop_button.css({"display": settings.audio_radio_type==2?"none":"inline"});

    screen.audio.progress_circle.css({"display": settings.audio_radio_type==2?"inline":"none"});
    screen.audio.no_zeidio_blackout.css({"display": settings.audio_radio_type==2?"none":"inline"});
    screen.audio.audio_stop_button.css({"display": settings.audio_radio_type==2?"none":"inline"});
  }

  $window.zeidioSongChanged = (data) => {
    if(!ready){
      setTimeout(function(){ $window.zeidioSongChanged(data) }, 100);
      return;
    }

    songData = data[0]
    settings.audio_list_selected = songData.currentSongIndex-1
    if (settings.audio_list_selected === 0) {
      settings.audio_list_selected = -1
    }

    screen.audio.channel_text.text(songData.channel===undefined?"Zeit Radio":songData.channel)
    if (songData.name==="empty") {
      screen.audio.song_author_name.text("")
      screen.audio.channel_subtitle.text("")
      screen.audio.song_info_cover.attr({'xlink:href':"img/zeit.gif"})
      zeidio.text.text("NO SONG SELECTED")
    } else {
      screen.audio.song_author_name.text(songData.name)
      screen.audio.channel_subtitle.text(songData.artist)
      screen.audio.song_info_cover.attr({'xlink:href':"/"+songData.coverUrl})
      zeidio.text.text(songData.artist + " - " + songData.name)
    }

    let textWidth = zeidio.text.n.getBoundingClientRect().width
    if (textWidth > 260) {
      zeidioAnimation = zeidio.text.n.animate(
        [
          {transform:`translate( ${ScreenUtils.XpxToSVG(260)}px, 0px)`},
          {transform:`translate( -5px, 0px)`},
          {transform:`translate( -5px, 0px)`},
          {transform:`translate(-${ScreenUtils.XpxToSVG(textWidth, 0.2)}px, 0px)`}
        ], {
          duration: 8000,
          iterations: Infinity,
        },
      )
    } else {
      if (zeidioAnimation) {
        zeidioAnimation.cancel()
        zeidio.text.n.style.transform = "translate( -3px, 0px)"
        zeidioAnimation = undefined
      }
    }

    screen.audio.list_selected.attr({'y': `${7.5207603+8.7178147*settings.audio_list_selected}`})
  }

  $window.zeidioTimeChanged = (data) => {
    if(!ready){
      setTimeout(function(){ $window.zeidioTimeChanged(data) }, 100);
      return;
    }
    if (data[1] === 0) {return}
    screen.audio.progress_circle.attr({'cx':12.048352+data[0]/data[1]*39.864726})
  }

  $window.zeidioPlayPauseChanged = (data) => {
    if(!ready){
      setTimeout(function(){ $window.zeidioTimeChanged(data) }, 100);
      return;
    }
    screen.audio.play_button_icon.css({"display": data[0]===true?"inline":"none"})
    screen.audio.pause_button_icon.css({"display": data[0]===false?"inline":"none"})
  }

  $window.zeidioSetSteamName = (data) => {
    let connectText = `'${data[0][0]}'s Phone' Connected`
    zeidio.phoneName.n.children[0].innerHTML = connectText

    let textWidth = zeidio.phoneName.n.getBoundingClientRect().width
    if (textWidth > 272) {
      zeidio.phoneName.n.animate(
        [
          {transform:`translate( ${ScreenUtils.XpxToSVG(285)}px, 0.9px)`},
          {transform:`translate( -2px, 0.9px)`},
          {transform:`translate( -2px, 0.9px)`},
          {transform:`translate(-${ScreenUtils.XpxToSVG(textWidth, 0.05)}px, 0.9px)`}
        ], {
          duration: 8000,
          iterations: Infinity,
        },
      )
    } else {
      zeidio.phoneName.n.style.transform = "translate(-2px, 1px)"
    }

    screen.home.profileText.text(data[0][0]+"'s Profile")
  }

  /*
  function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
          callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
  }
  */

  function updateDestination() {
    if (!settings.navi_search) {return};
    screen.destination.searchtext.text(settings.navi_search.substring(0, settings.navi_cursor));
    let leftTextWidth = screen.destination.searchtext.n.getBoundingClientRect().width;
    let textOffset = settings.navi_text_offset;
    let lastTextOffset = settings.last_navi_text_offset;

    if (leftTextWidth < textOffset) {
      textOffset = Math.max(leftTextWidth,0);
    } else if (leftTextWidth > 360+Math.max(textOffset, lastTextOffset)) {
      textOffset = leftTextWidth-360;
    }

    screen.destination.searchtext_group.css({"transform":`translateX(${-ScreenUtils.XpxToSVG(textOffset)}px)`});
    settings.last_navi_text_offset = settings.navi_text_offset;
    settings.navi_text_offset = textOffset;

    screen.destination.searchtext_cursor.css({"transform":`translateX(${ScreenUtils.XpxToSVG(leftTextWidth)}px)`});
  }

  function updateTime() {
    date = time + settings.time_manual_offset_h*3.6e+6 + settings.time_manual_offset_m*60000
    let current_time = new Date(date);
    if (settings.settings_time_12h) {
      overlays.time.text(current_time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }))
    } else {
      overlays.time.text(ScreenUtils.fixClock(current_time.getHours()) + ":" + ScreenUtils.fixClock(current_time.getMinutes()));
    }
  }

  let changeCalls = {
    navi_scroll: function() {
      screen.destination.destinations_group.css({"transform":`translateY(${-settings.navi_scroll*5.4570316}px)`});
    },
    navi_search: function() {
      screen.destination.searchtext_fallback.css({"display":settings.navi_search?"none":"inline"});
      screen.destination.searchtext_group.css({"display":settings.navi_search?"inline":"none"});
      updateDestination();
      screen.destination.searchtext.text(settings.navi_search);
    },
    navi_cursor: function() {
      updateDestination();
    },
    time: function() {
      screen.settings_general_time.format.time_12h_selected.css({"display":settings.settings_time_12h===true?"inline":"none"});
      screen.settings_general_time.format.time_24h_selected.css({"display":settings.settings_time_12h===false?"inline":"none"});
      screen.settings_general_time.dropdown_text.text(screen.settings_general_time_dropdown.texts[settings.timezone].n.children[0].innerHTML);

      updateTime()
    },
    settings_android_carplay: function() {
      screen.settings_general_extui.android_1_selected[0].css({"display":settings.settings_android_1===true?"none":"inline"});
      screen.settings_general_extui.android_1_selected[1].css({"display":settings.settings_android_1===true?"inline":"none"});
      screen.settings_general_extui.android_2_selected[0].css({"display":settings.settings_android_2===true?"none":"inline"});
      screen.settings_general_extui.android_2_selected[1].css({"display":settings.settings_android_2===true?"inline":"none"});

      screen.settings_general_extui.carplay_1_selected[0].css({"display":settings.settings_carplay_1===true?"none":"inline"});
      screen.settings_general_extui.carplay_1_selected[1].css({"display":settings.settings_carplay_1===true?"inline":"none"});
      screen.settings_general_extui.carplay_2_selected[0].css({"display":settings.settings_carplay_2===true?"none":"inline"});
      screen.settings_general_extui.carplay_2_selected[1].css({"display":settings.settings_carplay_2===true?"inline":"none"});
    },
    units: function() {
      screen.settings_general_units.length.text(settings.settings_unit_length==="metric"?"Metric (SI)":"Imperial");
      screen.settings_general_units.temperature.text(settings.settings_unit_temperature==="c"?"Degree Celsius":settings.settings_unit_temperature==="f"?"Degree Fahrenheit":"Degree Kelvin");
      screen.settings_general_units.weight.text(settings.settings_unit_weight==="kg"?"Kilograms":"Pounds");
      screen.settings_general_units.volume.text(settings.settings_unit_volume==="l"?"Liters":"Gallons");
      screen.settings_general_units.economy.text(settings.settings_unit_economy==="metric"?"Liter/100km":"MPG");
      screen.settings_general_units.power.text(settings.settings_unit_power==="hp"?"Horsepower":settings.settings_unit_power==="bhp"?"Brake Horsepower":"Kilowatt");
      screen.settings_general_units.torque.text(settings.settings_unit_torque==="metric"?"Newton-meter":"Pound-foot");
      screen.settings_general_units.energy.text(settings.settings_unit_energy==="metric"?"Joule":"Foot-pound");
      screen.settings_general_units.pressure.text(settings.settings_unit_pressure==="inHg"?"in.Hg":settings.settings_unit_pressure==="bar"?"Bar":settings.settings_unit_pressure==="psi"?"PSI":"kPa");
      screen.settings_general_units.dateformat.text(settings.settings_unit_dateformat==="ger"?"DD.MM.YYYY":settings.settings_unit_dateformat==="uk"?"DD/MM/YYYY":"MM/DD/YYYY");

      units = {
        uiUnitConsumptionRate: settings.settings_unit_economy,
        uiUnitDate: settings.settings_unit_dateformat,
        uiUnitEnergy: settings.settings_unit_energy,
        uiUnitLength: settings.settings_unit_length,
        uiUnitPower: settings.settings_unit_power,
        uiUnitPressure: settings.settings_unit_pressure,
        uiUnitTemperature: settings.settings_unit_temperature,
        uiUnitTorque: settings.settings_unit_torque,
        uiUnitVolume: settings.settings_unit_volume,
        uiUnitWeight: settings.settings_unit_weight
      };

      ScreenUnits.settingsChanged(units)
    },
    market_info: function() {
      let marketdata = settings.market_info;
      if (marketdata) {
        screen.settings_general_system.settings_vehinfo_market.text(marketdata.market);
        screen.settings_general_system.settings_vehinfo_layout.text(marketdata.layout);
        screen.settings_general_system.settings_vehinfo_fuel.text(marketdata.fuel);
        screen.settings_general_system.settings_vehinfo_rooftype.text(marketdata.rooftype);

        screen.settings_vehicle_car_display.ccf.css({"display": marketdata.carvariant==="ccf"?"inline":"none"});
        screen.settings_vehicle_car_display.eccf.css({"display": marketdata.carvariant==="eccf"?"inline":"none"});
        screen.settings_vehicle_car_display.country.css({"display": marketdata.carvariant==="country"?"inline":"none"});

        screen.home.ccf.css({"display": marketdata.carvariant==="ccf"?"inline":"none"});
        screen.home.eccf.css({"display": marketdata.carvariant==="eccf"?"inline":"none"});
        screen.home.country.css({"display": marketdata.carvariant==="country"?"inline":"none"});

        screen.car_tpms.country.css({"display": marketdata.carvariant==="country"?"inline":"none"});
        screen.car_tpms.ccf_eccf.css({"display": marketdata.carvariant!=="country"?"inline":"none"});

        screen.car_mode.ccf.css({"display": marketdata.carvariant==="ccf"?"inline":"none"});
        screen.car_mode.eccf.css({"display": marketdata.carvariant==="eccf"?"inline":"none"});
        screen.car_mode.country.css({"display": marketdata.carvariant==="country"?"inline":"none"});
        screen.car_mode.anti_rollbar_extra.css({"display": marketdata.carvariant==="country"?"inline":"none"});

        screen.car_trip.ccf.css({"display": marketdata.carvariant==="ccf"?"inline":"none"});
        screen.car_trip.eccf.css({"display": marketdata.carvariant==="eccf"?"inline":"none"});
        screen.car_trip.country.css({"display": marketdata.carvariant==="country"?"inline":"none"});

        screen.settings_general_connectivity.bluetooth_vehname.text(settings.bluetooth_vehname);
      }
    },
    settings_refresh_contacts: function() {
      if (!settings.settings_bluetooth) {
        settings.settings_refresh_contacts = false;
        return;
      }
      screen.settings_general_connectivity.refresh_contacts_button.css({"fill-opacity":1});
      setTimeout(function() {
        settings.settings_refresh_contacts = false;
        screen.settings_general_connectivity.refresh_contacts_button.css({"fill-opacity":0});
      },
      Math.random()*600+400)
    },
    settings_mute_nav: function() {
      screen.settings_general_connectivity.mute_nav_active_button.css({"fill-opacity":settings.settings_mute_nav===true?1:0});
    },
    settings_bluetooth: function() {
      screen.settings_general_connectivity.bluetooth_active_button.css({"fill-opacity":settings.settings_bluetooth===true?1:0});
      overlays.network.css({"display": settings.settings_bluetooth===true?"inline":"none"})
      overlays.phone_names.css({"display": settings.settings_bluetooth===true?"inline":"none"})
    },
    settings_contact_sort: function() {
      if (settings.settings_contact_sort === 0) {
        screen.settings_general_connectivity.contact_sort_text.text("ALPHABETICAL");
      } else if (settings.settings_contact_sort === 1) {
        screen.settings_general_connectivity.contact_sort_text.text("RECENCY");
      } else if (settings.settings_contact_sort === 2) {
        screen.settings_general_connectivity.contact_sort_text.text("FREQUENCY");
      }
    },
    settings_gauges_left_economy: function() {
      function createText(obj, val) {
        var txt = economyScreenModes[val];
        ScreenUtils.addText(obj, txt, {"line-height":"1.15", "font-style":"normal","font-variant":"normal","font-weight":"normal","font-stretch":"normal","font-size":"1.59767px","font-family":"Nasalization","text-align":"start","text-anchor":"start","fill":"#ffffff","stroke-width":"0.0887595"});
      }

      createText(screen.settings_gauges_left_economy.economy_menu[0], settings.settings_gauges_left_economy_slot1);
      createText(screen.settings_gauges_left_economy.economy_menu[1], settings.settings_gauges_left_economy_slot2);
      createText(screen.settings_gauges_left_economy.economy_menu[2], settings.settings_gauges_left_economy_slot3);
      createText(screen.settings_gauges_left_economy.economy_menu[3], settings.settings_gauges_left_economy_slot4);

      if (state[4]) {
        screen.settings_gauges_left_economy_dropdown.selected.attr({"transform": `translate(0, ${4.598288*(state[4]-1)})`});
      }
    },
    settings_audio: function() {
      screen.settings_vehicle_pksa.rear_sensors_sound_enabled.css({"fill": settings.settings_rear_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_vehicle_pksa.front_sensors_sound_enabled.css({"fill": settings.settings_front_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});

      screen.settings_audio_notifications.ringtone_active.css({"fill": settings.settings_ringtone_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_audio_notifications.rear_sensors_active.css({"fill": settings.settings_rear_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_audio_notifications.front_sensors_active.css({"fill": settings.settings_front_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_audio_notifications.notifications_active.css({"fill": settings.settings_notifications_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_audio_notifications.speed_warning_active.css({"fill": settings.settings_speed_warning_active===true?"#00ff00ff":"#ff0000ff"});

      screen.settings_audio_notifications.rear_sensors_volume.text(settings.settings_rear_sensors_volume);
      screen.settings_audio_notifications.front_sensors_volume.text(settings.settings_front_sensors_volume);
      screen.settings_audio_notifications.notifications_volume.text(settings.settings_notifications_volume);
      screen.settings_audio_notifications.speed_warning_volume.text(settings.settings_speed_warning_volume);
    },
    settings_vehicle_light: function() {
      screen.settings_vehicle_light.lights_highbeam_timer.text(settings.settings_vehicle_highbeam_timer);
      screen.settings_vehicle_light.lights_mode.text(settings.settings_vehicle_headlight_mode===1?"Full":settings.settings_vehicle_headlight_mode===2?"Lowbeams":"Off");
      screen.settings_vehicle_light.entry_exit.css({"fill": settings.settings_vehicle_lights_entry_exit===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_vehicle_light.lights_interior_timer.text(settings.settings_vehicle_lights_entry_exit_timer);
    },
    settings_vehicle_aeb: function() {
      screen.settings_vehicle_aeb.global_active.css({"fill": settings.settings_aeb_active===true?"#00ff00ff":"#ff0000ff"});
    },
    settings_vehicle_pksa: function() {
      screen.settings_vehicle_pksa.rear_sensors_sound_enabled.css({"fill": settings.settings_rear_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_vehicle_pksa.front_sensors_sound_enabled.css({"fill": settings.settings_front_sensors_audio_active===true?"#00ff00ff":"#ff0000ff"});

      screen.settings_vehicle_pksa.rear_sensors_enabled.css({"fill": settings.settings_rear_sensors_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_vehicle_pksa.front_sensors_enabled.css({"fill": settings.settings_front_sensors_active===true?"#00ff00ff":"#ff0000ff"});
    },
    settings_vehicle_hill: function() {
      screen.settings_vehicle_hill.start_global_active.css({"fill": settings.settings_hill_start_active===true?"#00ff00ff":"#ff0000ff"});
      screen.settings_vehicle_hill.descent_global_active.css({"fill": settings.settings_hill_descent_active===true?"#00ff00ff":"#ff0000ff"});
    },
    settings_vehicle_ass: function() {
      screen.settings_vehicle_ass.start_stop_active.css({"fill": settings.settings_start_stop_active===true?"#00ff00ff":"#ff0000ff"});
      screen.home.ass.css({"fill": settings.settings_start_stop_active===true?"#00ff00ff":"#ff0000ff"});
    },
    ambient: function() {
      if (typeof settings.ambient_color === "number") {
        function HSVtoHex(h, s, v) {
          function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
          }

          function rgbToHex(r, g, b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
          }

          var r, g, b, i, f, p, q, t;
          i = Math.floor(h * 6);
          f = h * 6 - i;
          p = v * (1 - s);
          q = v * (1 - f * s);
          t = v * (1 - (1 - f) * s);
          switch (i % 6) {
              case 0: r = v, g = t, b = p; break;
              case 1: r = q, g = v, b = p; break;
              case 2: r = p, g = v, b = t; break;
              case 3: r = p, g = q, b = v; break;
              case 4: r = t, g = p, b = v; break;
              case 5: r = v, g = p, b = q; break;
          }
          return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
        };

        screen.ambience.color_display.css({"fill": HSVtoHex(settings.ambient_color, 1, settings.ambient_brightness)});
        screen.ambience.enable_button_text.text(settings.ambient_enabled===true?"Disable Lighting":"Enable Lighting");
        screen.ambience.ambience_colour_picker.attr({"transform": `translate(${settings.ambient_color*100}, 0)`});
        screen.ambience.ambience_brightness_picker.attr({"transform": `translate(${settings.ambient_brightness*96}, 0)`});

        screen.home.ambience_image.css({"display":settings.ambient_enabled===true?"inline":"none"});
        screen.home.ambience_image.css({"opacity":settings.ambient_brightness});

        let ambCol = (settings.ambient_color || 0)*360;
        if (homeScreenAmbColorMatrix.getAttribute("values") != ambCol) {
          homeScreenAmbColorMatrix.setAttribute("values",ambCol);
        }

        screen.home.ambience_button_text.text(settings.ambient_enabled===true?"Disable":"Enable");
      }
    },
    navi_move: function() {
      screen.navi.button_text_north_lock.text(settings.navi_move_x?"RESET FOCUS":"NORTH LOCK")
      screen.navi.button_text_north_lock.css({'text-decoration-line':settings.navi_move_x?"underline":"none"})

    }
  }

  $window.valueChanged = (data) => {
    if (!ready) {
      setTimeout(function(){ $window.valueChanged(data) }, 100);
      return;
    }

    let id = data[0];
    if (!id) {
      for (var val in changeCalls) {
        changeCalls[val]()
      }
      return
    }

    if (changeCalls[id]) { changeCalls[id]() }
  }

  let updateFuncs = {
    pksa: function(data) {
      let hits = data.electrics.parkingSensorHits.frontBumper.reverse();
      for (let i = 0; i < hits.length; i+=(hits.length/4)) {
        let dist = Math.min(hits[i], hits[i+1], hits[i+2]);
        let index = i/(hits.length/4);
        screen.pksa.sensors.front[index][0].css({"fill": dist<1.5?"#00ff00ff":"#202020ff"});
        screen.pksa.sensors.front[index][1].css({"fill": dist<0.9?"#ffff00ff":"#202020ff"});
        screen.pksa.sensors.front[index][2].css({"fill": dist<0.4?"#ff0000ff":"#202020ff"});
      }

      hits = data.electrics.parkingSensorHits.rearBumper;
      for (let i = 0; i < hits.length; i+=(hits.length/4)) {
        let dist = Math.min(hits[i], hits[i+1], hits[i+2]);
        let index = i/(hits.length/4);
        screen.pksa.sensors.rear[index][0].css({"fill": dist<1.5?"#00ff00ff":"#202020ff"});
        screen.pksa.sensors.rear[index][1].css({"fill": dist<0.9?"#ffff00ff":"#202020ff"});
        screen.pksa.sensors.rear[index][2].css({"fill": dist<0.4?"#ff0000ff":"#202020ff"});
      }
    },
    audio: function() {
      let listScroll = -settings.audio_list_scroll;
      screen.audio.list_wrap.attr({'transform': `translate(0, ${8.7178147*listScroll})`});
      screen.audio.list_scrollbar.attr({'transform': `translate(0, ${(listScroll/settings.audio_max_scroll)*-31.353126})`});

      /*
      readTextFile("local://local/temp/zeit/playing_media/info.json", function(text){
        var data = JSON.parse(text);

        if (data.title != screen.audio.song_author_name.n.children[0].innerHTML) {
          screen.audio.song_author_name.text(data.title)
          screen.audio.channel_subtitle.text(data.artist)
          screen.audio.channel_text.text("Computer Playback")
          screen.audio.song_info_cover.attr({'xlink:href':"/temp/zeit/playing_media/media_thumb.jpg?" + new Date().getTime()})
        }
      })
      */
    },
    settings_general: function() {
      if (state[1] === "settings_general_system") {
        screen.settings_general_system.check_update_button.css({"fill-opacity":settings.settings_check_update===true?1:0});
      }
    },
    settings_vehicle_car_display: function() {
      switch(state[2]) {
        case "settings_vehicle_aeb": {
          screen.settings_vehicle_aeb.mode_active.css({"fill": settings.settings_aeb_active_mode===true?"#00ff00ff":"#ff0000ff"});
          break;
        }
        case "settings_vehicle_hill": {
          screen.settings_vehicle_hill.start_mode_active.css({"fill": settings.settings_hill_start_active_mode===true?"#00ff00ff":"#ff0000ff"});
          screen.settings_vehicle_hill.descent_mode_active.css({"fill": settings.settings_hill_descent_active_mode===true?"#00ff00ff":"#ff0000ff"});
          break;
        }
      }
    },
    home: function() {
      lastLastHomeScreenScroll = lastHomeScreenScroll || 0;
      lastHomeScreenScroll = settings.home_scroll || 0;

      if (lastLastHomeScreenScroll == settings.home_scroll) {
        screen.home.scrollbar.n.style.transition = "transform 0.3s";
        screen.home.islands_group.n.style.transition = "transform 0.3s";
      } else {
        screen.home.scrollbar.n.style.transition = "";
        screen.home.islands_group.n.style.transition = "";
      }

      screen.home.scrollbar.attr({'transform': `translate(${(lastLastHomeScreenScroll)*40.4}, 0)`});
      screen.home.islands_group.attr({'transform': `translate(${(lastLastHomeScreenScroll)*-20}, 0)`});
    },
    car: function(data) {
      switch(state[1]) {
        case "car_tpms": {
          screen.car_tpms.unit.text(settings.settings_unit_pressure==="inHg"?"in.Hg":settings.settings_unit_pressure==="bar"?"Bar":settings.settings_unit_pressure==="psi"?"PSI":"kPa")

          screen.car_tpms.disabled.css({"opacity":Math.max(1-Math.min(data.electrics.wheelspeed-0.1,1),0)})
          if (data.electrics.wheelspeed < 0.2) {
            for (var val in screen.car_tpms.readouts) {
              screen.car_tpms.readouts[val].text("---")
            }
          } else {
            for (var val in screen.car_tpms.readouts) {
              let value = ScreenUnits.pressure(data.customModules.tireData.pressures[val])
              screen.car_tpms.readouts[val].text(value.val.toFixed(1))
            }
          }
          break;
        }
      }
    }
  }

  $window.updateCombustionEngineData = (data) => {
    let trip = tripVal*1000;

    let tmp = data.hoursSinceRespawn + ":" + ScreenUtils.fixClock(data.minutesSinceRespawn) + ":" + ScreenUtils.fixClock(data.secondsSinceRespawn);
    screen.car_trip.values.trip.text(tmp);

    if (updateTrip) {
      let fulltime = data.secondsSinceRespawn+data.minutesSinceRespawn*60+data.hoursSinceRespawn*60*60;

      tmp = ScreenUnits.consumptionRate(1.0E-5*data.averageFuelConsumption);
      screen.car_trip.values.avg_consumption_reset.text(tmp.val.toFixed(1));
      screen.car_trip.units.avg_consumption_reset.text(tmp.unit);

      tmp = ScreenUnits.consumptionRate(1.0E-5*data.averageFuelConsumptionSinceRefuel);
      screen.car_trip.values.avg_consumption_refuel.text(tmp.val.toFixed(1));
      screen.car_trip.units.avg_consumption_refuel.text(tmp.unit);

      tmp = ScreenUnits.speed(trip/fulltime);
      screen.car_trip.values.avg_speed.text(tmp.val.toFixed(1));
      screen.car_trip.units.avg_speed.text(tmp.unit);

      tmp = ScreenUnits.length(trip)
      screen.car_trip.values.distance.text(tmp.val.toFixed(1));
      screen.car_trip.units.distance.text(tmp.unit);

      updateTrip = false
      setTimeout(function() { updateTrip = true }, 500)
    }
  }

  $window.updateElectricMotorData = (data) => {
    let trip = tripVal*1000;

    let tmp = data.hoursSinceRespawn + ":" + ScreenUtils.fixClock(data.minutesSinceRespawn) + ":" + ScreenUtils.fixClock(data.secondsSinceRespawn);
    screen.car_trip.values.trip.text(tmp);

    if (updateTrip) {
      let fulltime = data.secondsSinceRespawn+data.minutesSinceRespawn*60+data.hoursSinceRespawn*60*60;

      // ScreenUnits doesnt support ev...
      // data is in wh/100km
      if (units.uiUnitConsumptionRate=="metric") {
        // convert to kwh/100km
        tmp = data.averageFuelConsumption*0.001;
        screen.car_trip.values.avg_consumption_reset.text(tmp.toFixed(1));
        screen.car_trip.units.avg_consumption_reset.text("kWh/100km");

        tmp = data.averageFuelConsumptionSinceRefuel*0.001;
        screen.car_trip.values.avg_consumption_refuel.text(tmp.toFixed(1));
        screen.car_trip.units.avg_consumption_refuel.text("kWh/100km");
      } else {
        // convert to kwh/mi
        tmp = 100/1.609344/(data.averageFuelConsumption*0.001);
        screen.car_trip.values.avg_consumption_reset.text(tmp.toFixed(1));
        screen.car_trip.units.avg_consumption_reset.text("mi/kWh");

        tmp = 100/1.609344/(data.averageFuelConsumptionSinceRefuel*0.001);
        screen.car_trip.values.avg_consumption_refuel.text(tmp.toFixed(1));
        screen.car_trip.units.avg_consumption_refuel.text("mi/kWh");
      }

      tmp = ScreenUnits.speed(trip/fulltime);
      screen.car_trip.values.avg_speed.text(tmp.val.toFixed(1));
      screen.car_trip.units.avg_speed.text(tmp.unit);

      tmp = ScreenUnits.length(trip)
      screen.car_trip.values.distance.text(tmp.val.toFixed(1));
      screen.car_trip.units.distance.text(tmp.unit);

      updateTrip = false
      setTimeout(function() { updateTrip = true }, 500)
    }
  }

  $window.updateData = (data) => {
    if(!data){return}
    if(!ready){return}

    carSpeed = data.electrics.wheelspeed
    tripVal = data.electrics.ccfOdometerTrip
    if (data.electrics.ignitionLevel != lastIgnitionState) {
      bootsvg = document.getElementById("bootsvg")
      video.currentTime = 0

      if (data.electrics.ignitionLevel <= 1) {
        overlays.block.n.style.transition = ""
        overlays.block.css({"opacity": "1"})
        video.style.transition = ""
        video.style.opacity = "1"
        bootsvg.style.transition = ""
        bootsvg.style.opacity = "1"
        video.pause()
      } else {
        overlays.block.n.style.transition = "opacity 0.75s ease-in 2.25s"
        overlays.block.css({"opacity": "0"})
        video.style.transition = "opacity 0.75s ease-in 2s"
        video.style.opacity = "0"
        bootsvg.style.transition = "opacity 0.75s ease-in 2s"
        bootsvg.style.opacity = "0"
        video.play()
      }

      lastIgnitionState = data.electrics.ignitionLevel
    }

    let lastTime = time
    if (settings.timezone === 1 && settings.timeOfDay) {
      time = settings.timeOfDay-3600000 || 0
    } else {
      time = Date.now()
    }

    if (time !== lastTime) { updateTime(); lastTime = time; }
    if (updateFuncs[state[0]]) { updateFuncs[state[0]](data) }
  }
});
