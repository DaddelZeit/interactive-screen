# interactive-screen
Implementation of a mouse-interactive screen in BeamNG.drive

## Folders
### Lua
The Lua folder contains the generic Lua files used as the base for all screens.
This non-specific code is not functional on its own but requires a file setup as shown in the example.
Note: the GELua file should always be renamed to something unique as to avoid inter-mod conflicts.

### Example
The example folder contains the development files from the (Hirochi CCF)[https://www.beamng.com/resources/2020-hirochi-ccf.29318/].
This includes custom screen extensions explained below but may not include GELua or VLua dependencies. In addition, the screen webpages themselves are included.
The JBeam is limited to the screens.

The CCF uses two screens: the Infotainment and Gauge screen. Both are connected to the screenManager, however only the infotainment screen uses manager states and triggers.

### Utils
The Utils folder has zeitScreenUtils.lua file that transforms and condenses the development files to production files.
See documentation below.

## Basic Documentation
### Screen Folder Layout
The main folder name, `interactive_screen`, is hardcoded; the following folder(s) may include different versions of the screen under their respective name.
The screen version to use is defined via "type" in the JBeam when loading the screenManager controller.

Inside every version folder, you should find these files:
- audioContexts
- extensions
- triggers
- triggerTypes
- APPLYFUNCS.json
- DEFAULT.json
- LINKS.json

#### DEFAULT.json
This JSON file contains all default settings that the screen may change.

#### APPLYFUNCS.json
This JSON file lists Lua and JS commands to run upon settings load. This is stored in a dictionary where each key corresponds to a setting from the defaults.
The first item in each array is a number explaining what format the following data has:
1. One following item, JS command
2. One following item, Lua command
3. Two following items: Lua command and JS command

Each command is a string later formatted to these following rules:

- JS
* VALUE: replaced by the raw string data of the setting it is listed in
* VALUE{...}: replaced by the raw string data of the setting listed under the key the brackets contain
* "s" is the dictionary containing the settings, JS-side. All format options use the Lua side table.

- Lua
* "s" is the table containing the settings, Lua-side.

#### LINKS.json
This JSON file matches a trigger ID to either a state or blocks of code to execute.
If the value of a key is a string, it is treated as a file path to a trigger file in the triggers folder. This is known as a state.
If the value of a key is an array, it may include up to 3 items:

1. A Lua command that may receives the arguments:
- s (the main save table)
- ts (a temporary save table)
- any following data returned from the GELua trigger type Lua.
2. A JS command formatted according to the rules established in APPLYFUNCS.json
3. An optional, arbitrary group identifier that can be used to optimise code on the JS-side.

#### triggers
The triggers folder contains a relative file path structure that equates to states used by the screen. Each file includes an array of triggers that are loaded into GELua to check.
A trigger has the following fields:

- pos: is an array containing x,y,z coordinates relative to the car's origin point: this is the ref node position, not the absolute center point
- size: is an array containing x,y,z factors that scale the trigger
- id: this is the trigger ID linking this trigger to a functional block defined in LINKS.json
- audioID: an optional argument, plays a sound according to the numeric index of an audioContext

#### audioContexts
This folder contains JSON files defining an audio link playable by a trigger execution.
Note: these files are named in numeric order, i.e.: 1.json, 2.json, 3.json...

Each audioContext has these following fields:

- path: the file path of an audio file
- volume: the volume this sound is played at
- pitch: the pitch this sound is played at
- node: the origin node used for 3D-audio, needs to be defined always
- description: the SFX description used when playing this sound. Audio2D is recommended.
- inside: a boolean defining where to play the sound. If true, the sound will only play inside the car, if false, the sound will only play outside the car. Remove to play the sound in the both cases.

#### triggerTypes
Has all Lua files available to use in triggers.
Each file contains a Lua function called whenever the player hovers over a trigger, if this function returns the first variable is expected to be the trigger's id (trigger.id).
All following data will be sent to the screen manager, although the function block matched to the trigger id will run regardless.
The returned function may have these arguments:
- trigger: a table containing runtime data about the trigger. This is initially the same as defined in the triggers.json file.
- dist: the distance from the world position of the mouse to the trigger
- ray: the mouse raycast
- obb: the bounding box of the trigger as an OrientedBox3F

#### extensions
Includes screen-internal extensions. Function calls available from the screen manager are:
- playerChange: active
- screenUpdate: dt, currentState, saves, tempSaves, isInside
- screenReset
- screenInit: saves, tempSaves, extension data defined in JBeam

You may also create custom public functions that can interface with the global environment through `screenManager.`.

### Creating usable files
The Utils folder has zeitScreenUtils.lua file that transforms and condenses the development files to production files.
Previously this was used to convert Lua files to bytecode and re-save the JSON files with Lpack, however both functionalities either do not work anymore or are ill-advised.
Still, this is a required process. Use this GELua command to run the process:
`extensions.reload("zeitScreenUtils"); zeitScreenUtils.buildAtPath("/vehicles/xyz/interactive_screen")`
where xyz is your vehicle folder.

### Expected JS functions
The screen manager calls JS functions in the `window` object, however cannot check if these functions exist. Ensure that you have these functions:
- screenPopup: Object: {show, text?, buttonText?, boxTriggerFileName?}
- screenStateUpdate: Object: {state}
- execFunc: Object: {funcString}
- valueChanged: (Object: {valueKey})?
- valueChanged: (Object: {valueKey})?

Example implementation of execFunc:
```JS
$window.execFunc = (data) => {
  var func = new Function(`return function func(s){${data[0]}}`)();
  func(settings)
}
```

See infotainment_screen/info_screen_improv.js in Examples.
