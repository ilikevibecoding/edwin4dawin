// ---------------------------------------------------------------------------
// Audio asset manifest.  (owner: fable4)
//
// Every synthesised sound is registered here with a stable manifest ID, the
// runtime sound name it maps to (the id the event payloads / weapon defs
// use), and an acceptance line describing what the sound must convey. There
// are NO audio files: `files` points at the synthesis source.
//
// `SOUND_ALIASES` lets AudioEngine.play() accept manifest IDs directly.
// ---------------------------------------------------------------------------

import { assets } from '../core/assets.js';

const R = [];
/** @param {string} id manifest id @param {string|null} sound runtime name */
function rec(id, sound, name, acceptance, files = ['src/audio/sfx.js']) {
  R.push({ id, sound, name, acceptance, files });
}

// ---------------------------------------------------------------- weapon fire
const FAMS = [
  ['PISTOL', 'nw9', 'NW-9 pistol', 'snappy sidearm report: sharp mid crack, modest low thump, short indoor tail'],
  ['SMG', 'vk7', 'VK-7 SMG', 'compact fast report distinct from the carbine; slightly brighter crack'],
  ['RIFLE', 'kd4', 'KD-4 carbine', 'authoritative rifle report: hard transient, chest-weight thump, controlled tail'],
  ['SHOTGUN', 'cs12', 'CS-12 shotgun', 'huge low boom with wide noise burst; reads as the heaviest close-range weapon'],
  ['SNIPER', 'hl700', 'HL-700 rifle', 'the loudest single shot in the game: deep body, longest rolling tail'],
];
for (const [fam, key, label, acc] of FAMS) {
  rec(`SFX-FIRE-${fam}`, `weapon_${key}_fire`, `${label} fire`, `${acc}; heard from another room the same shot must become duller and longer.`);
  rec(`SFX-TAIL-${fam}`, `weapon_${key}_tail`, `${label} distant tail`, 'standalone low-passed reverberant wash for shots heard far away or through walls.');
}
rec('SFX-FIRE-SMG-SUPPRESSED', 'weapon_vk7_fire_suppressed', 'VK-7 suppressed fire',
  'quiet "thut" where the bolt is louder than the muzzle; clearly stealthy next to any unsuppressed shot.');
rec('SFX-DRYFIRE', 'weapon_dry', 'Dry fire', 'hollow firing-pin double click that instantly reads as "empty".');

// ------------------------------------------------------------ weapon handling
const HANDLING = [
  ['RELOAD-START', 'reload_start', 'grip shift + mag release; starts every reload'],
  ['MAG-OUT', 'mag_out', 'magazine sliding free and caught by hand'],
  ['MAG-IN', 'mag_in', 'fresh magazine seated with a positive slap'],
  ['RELOAD-END', 'reload_end', 'slide/bolt released, round chambered; the "ready again" punctuation'],
  ['DRAW', 'draw', 'cloth-and-metal swish of the weapon coming up'],
  ['INSPECT', 'inspect', 'gentle turn-over rattle, no urgency'],
];
for (const [, key, label] of FAMS) {
  const up = key.toUpperCase();
  for (const [suffix, sound, acc] of HANDLING) {
    rec(`SFX-MECH-${up}-${suffix}`, `weapon_${key}_${sound}`, `${label} ${sound.replace('_', ' ')}`, `${acc}; weight scaled to the ${label}.`);
  }
}
for (const [suffix, sound, acc] of HANDLING) {
  rec(`SFX-MECH-TALON-${suffix}`, `weapon_talon_${sound}`, `Talon knife ${sound.replace('_', ' ')}`, acc);
}
rec('SFX-MECH-KD4-CHARGE', 'weapon_kd4_cycle', 'Charging handle', 'scrape back then spring slam forward; shared by pistol/SMG/carbine.');
rec('SFX-MECH-CS12-PUMP', 'weapon_cs12_cycle', 'Pump action', 'two-stroke shk-shk with shell rattle; must sell the CS-12 cadence.');
rec('SFX-MECH-HL700-BOLT', 'weapon_hl700_cycle', 'Bolt cycle', 'up-draw-ping-push-down five-beat bolt work with a case ping.');
rec('SFX-MECH-HOLSTER', 'weapon_holster', 'Holster', 'soft cloth + settle; the inverse of draw.');
rec('SFX-MECH-MODESWITCH', 'weapon_mode_switch', 'Fire selector', 'tiny two-detent click.');
rec('SFX-MECH-GADGET-DRAW', 'weapon_flash_draw', 'Grenade draw', 'cloth swish plus canister tink (flash + smoke share it).');

// ------------------------------------------------------------------- casings
rec('SFX-SHELL-PISTOL', 'shell_pistol', 'Pistol brass drop', 'bright tinkling brass settling on hard floor; dull tick on carpet/snow.');
rec('SFX-SHELL-RIFLE', 'shell_rifle', 'Rifle brass drop', 'slightly deeper brass ring with a settle pattern; surface aware.');
rec('SFX-SHELL-SHOTGUN', 'shell_shotgun', 'Shotgun hull drop', 'plastic clunk, no ring; clearly not brass.');

// --------------------------------------------------------------------- melee
rec('SFX-MELEE-SLASH', 'weapon_talon_slash', 'Knife slash', 'rising air whoosh, no contact.');
rec('SFX-MELEE-STAB', 'weapon_talon_stab', 'Knife stab', 'shorter, harder thrust whoosh.');
rec('SFX-MELEE-HIT-FLESH', 'melee_hit_flesh', 'Melee hit (flesh)', 'wet muffled thud with low weight.');
rec('SFX-MELEE-HIT-WORLD', 'melee_hit_world', 'Melee hit (world)', 'hard thock with a faint metallic edge.');

// ------------------------------------------------------------------- gadgets
rec('SFX-GADGET-THROW', 'gadget_throw', 'Grenade throw', 'pin click + arm swish.');
rec('SFX-GADGET-BOUNCE', 'gadget_bounce', 'Grenade bounce', 'small hard clack with a metal ping per bounce.');
rec('SFX-FLASH-DETONATE', 'gadget_flash_detonate', 'Flashbang detonation', 'brutal full-band crack, the loudest transient in the game.');
rec('SFX-FLASH-RING', 'gadget_flash_ring', 'Flash tinnitus ring', 'high whine that stands in for deafness after a close flash; duration scales with proximity.');
rec('SFX-SMOKE-POP', 'gadget_smoke_pop', 'Smoke pop', 'dull canister pop.');
rec('SFX-SMOKE-HISS', 'gadget_smoke_hiss', 'Smoke hiss', 'pressurised hiss loop that thins as the canister empties (~13 s).');

// ----------------------------------------------------------------- movement
const FEET = [
  ['CARPET', 'carpet', 'soft muffled compression, almost no transient'],
  ['TILE', 'tile', 'hard heel click with a faint ceramic ring'],
  ['VINYL', 'vinyl', 'dull slap with occasional sole squeak'],
  ['CONCRETE', 'concrete', 'gritty mid thud'],
  ['SNOW', 'snow', 'granular crunch, no ring'],
  ['METAL', 'metal', 'thud plus resonant panel ring'],
  ['WOOD', 'wood', 'hollow thock'],
];
for (const [id, key, acc] of FEET) {
  rec(`SFX-FOOT-${id}`, `footstep_${key}`, `Footstep - ${key}`,
    `${acc}; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller.`);
}
rec('SFX-FOOT-LAND', 'player_land', 'Landing thump', 'body-weight thud scaled by fall impact, with gear rustle.');
rec('SFX-FOOT-GEAR', 'clothing_rustle', 'Clothing/gear rustle', 'cloth movement with occasional sling tick.');
rec('SFX-FOOT-SCUFF', 'stair_scuff', 'Stair/ladder scuff', 'short sole scrape for stairs and ladders.');

// ------------------------------------------------------------------- impacts
const IMPACTS = [
  ['DRYWALL', 'drywall', 'papery punch-through with powder rain'],
  ['CONCRETE', 'concrete', 'sharp crack with grit spray'],
  ['METAL', 'metal', 'clang with a decaying ring'],
  ['WOOD', 'wood', 'hollow thock with splinter crackle'],
  ['GLASS', 'glass', 'brittle tick with small shard pings'],
  ['SOFT', 'soft', 'dull puff for fabric/paper/cushions'],
  ['PLASTIC', 'plastic', 'dry double snap'],
  ['SNOW', 'snow', 'soft muffled puff'],
  ['FLESH', 'flesh', 'wet smack with low body; unmistakably a hit'],
  ['ELECTRONIC', 'electronic', 'crunch with an electrical fizz'],
];
for (const [id, key, acc] of IMPACTS) {
  rec(`SFX-IMPACT-${id}`, `impact_${key}`, `Bullet impact - ${key}`, `${acc}; positional at the hit point.`);
}
rec('SFX-RICOCHET', 'ricochet', 'Ricochet', 'classic descending zing; probability follows SURFACE_PROPS.ricochet.');
rec('SFX-SPARK', 'spark', 'Electrical sparks', 'crackling arc burst for damaged electronics.');

// --------------------------------------------------------------------- glass
rec('SFX-GLASS-CRACK', 'glass_crack', 'Glass crack', 'sharp ping cluster for a pane taking damage without failing.');
rec('SFX-GLASS-SHATTER', 'glass_shatter', 'Glass shatter', 'full pane failure: burst plus a rain of shard pings.');
rec('SFX-GLASS-FRAGMENTS', 'glass_fragments', 'Glass fragments settle', 'sparse late tinkles after a shatter.');

// --------------------------------------------------------------------- doors
const DOORS = [
  ['WOOD-OPEN', 'door_wood_open', 'timber office door: handle, latch, swing, optional hinge creak'],
  ['WOOD-CLOSE', 'door_wood_close', 'timber leaf meets frame with a latch snap'],
  ['GLASS-OPEN', 'door_glass_open', 'lighter glazed leaf, glass tap on the pull'],
  ['GLASS-CLOSE', 'door_glass_close', 'soft stop with a pane ring'],
  ['METAL-OPEN', 'door_metal_open', 'heavy security bolt clunk and steel swing'],
  ['METAL-CLOSE', 'door_metal_close', 'weighty steel slam with a long metal ring'],
  ['FIRE-OPEN', 'door_fire_open', 'panic-bar clunk plus the door-closer piston hiss'],
  ['FIRE-CLOSE', 'door_fire_close', 'closer eases the leaf home, hiss then firm latch'],
];
for (const [id, sound, acc] of DOORS) rec(`SFX-DOOR-${id}`, sound, `Door - ${id.toLowerCase().replace('-', ' ')}`, `${acc}.`);
rec('SFX-DOOR-HANDLE', 'door_handle', 'Door handle / latch', 'bare handle click used for settle latches.');
rec('SFX-DOOR-LOCKED', 'door_locked', 'Locked rattle', 'handle turns, deadbolt refuses; clearly a "no".');
rec('SFX-DOOR-UNLOCK', 'door_unlocked', 'Keycard unlock', 'two-tone card chirp then the maglock bolt drops; clearly a "yes".');
rec('SFX-DOOR-SPLINTER', 'door_damaged', 'Door splintering', 'wood tearing crackle when a door takes fire.');
rec('SFX-DOOR-IMPACT', 'door_impact', 'Door impact', 'blunt thud on a leaf.');
rec('SFX-SHUTTER-MOTOR', 'door_shutter_motor', 'Garage shutter motor', 'geared motor drone with slat rattle while the shutter travels.');
rec('SFX-SHUTTER-STOP', 'door_shutter_stop', 'Garage shutter stop', 'heavy end-stop clunk and settling rattle.');

// --------------------------------------------------------------- world props
rec('SFX-PAPER-RUSTLE', 'paper_rustle', 'Paper rustle', 'dry page flutter.');
rec('SFX-LOCKER-RATTLE', 'locker_rattle', 'Locker rattle', 'thin sheet-metal knock with a rattling resonance.');
rec('SFX-PICKUP-KEYCARD', 'pickup_keycard', 'Keycard pickup', 'plastic snap plus a rising two-note chirp; rewarding.');

// ---------------------------------------------------------- player feedback
rec('UI-HITMARKER', 'hitmarker', 'Hitmarker', 'tiny dry tick confirming a hit; never fatiguing at full fire rate.', ['src/audio/sfx.js']);
rec('UI-HITMARKER-HEADSHOT', 'hitmarker_headshot', 'Headshot marker', 'brighter double tick, clearly distinct.');
rec('UI-HITMARKER-KILL', 'hitmarker_kill', 'Kill confirm', 'lower thock; full stop punctuation.');
rec('UI-PLAYER-HIT', 'player_hit', 'Player damage', 'body thud scaled by damage taken.');
rec('UI-PLAYER-DEATH', 'player_death', 'Player death', 'long low collapse into silence.');

// ------------------------------------------------------------------------ UI
rec('UI-MOVE', 'ui_move', 'Menu move', 'near-subliminal tick.');
rec('UI-SELECT', 'ui_select', 'Menu select', 'short warm pluck; positive.');
rec('UI-BACK', 'ui_back', 'Menu back', 'lower pluck; clearly "retreat" vs select.');
rec('UI-DENY', 'ui_deny', 'Denied', 'flat double buzz; unambiguous refusal.');
rec('UI-SLIDER', 'ui_slider', 'Slider tick', 'pitch tracks the slider value so volume sliders audition themselves.');
rec('UI-INTERACT-CONFIRM', 'interact_confirm', 'Interaction confirm', 'small affirmative blip for generic INTERACT events.');
rec('UI-ANNOUNCE-GOOD', 'announce_good', 'Announcement (good/info)', 'rising two-note blip under HUD announcements; ducks SFX.');
rec('UI-ANNOUNCE-ALERT', 'announce_alert', 'Announcement (alert/danger)', 'falling minor two-note blip; reads as warning.');

// ------------------------------------------------------------------ stingers
rec('MUS-STING-MISSION-START', 'sting_mission_start', 'Mission start sting', 'low swell with a heartbeat hit: "insertion".', ['src/audio/sfx.js']);
rec('MUS-STING-OBJ-COMPLETE', 'sting_objective_complete', 'Objective complete', 'rising fifth with a soft chime; unambiguously positive.');
rec('MUS-STING-OBJ-FAILED', 'sting_objective_failed', 'Objective failed', 'sagging semitone over a low thump; unambiguously negative.');
rec('MUS-STING-VICTORY', 'sting_victory', 'Victory sting', 'three-note major arpeggio with shimmer; release of tension.');
rec('MUS-STING-DEFEAT', 'sting_defeat', 'Defeat sting', 'low minor-second cluster sinking away.');
rec('MUS-STING-HOSTAGE', 'sting_hostage_secured', 'Hostage secured chime', 'warm two-strike bell; the "you did the right thing" sound.');
rec('MUS-BED-TENSION', null, 'Tension music bed', 'procedural drone + sparse pluck that rises with combat heat and relaxes ~8 s after contact ends; respects musicVolume.', ['src/audio/music.js']);

// ------------------------------------------------------------------ vocals
const ENEMY_VOX = [
  ['CONTACT', 'contact', 'hard two-beat shout, falling: "seen you"'],
  ['SUSPICIOUS', 'suspicious', 'rising wary question shape'],
  ['INVESTIGATE', 'investigate', 'neutral checking-it-out phrase'],
  ['SEARCHING', 'searching', 'clipped sweep-pattern phrase'],
  ['LOST', 'lost', 'rising frustrated "where did he go"'],
  ['CLEAR', 'clear', 'relaxed falling stand-down'],
  ['RELOAD', 'reload', 'urgent three-beat call'],
  ['MOVING', 'moving', 'short rising push call'],
  ['FLANK', 'flank', 'directed three-beat command'],
  ['SUPPRESS', 'suppress', 'hardest sustained shout'],
  ['COVER', 'cover', 'quick two-beat drop call'],
  ['HIT', 'hit', 'clenched pain grunt, 0.2 s'],
  ['DOWN', 'down', 'alarmed two-beat casualty call'],
  ['BLINDED', 'blinded', 'panicked fast high syllables with tremor'],
  ['RADIO', 'radio', 'band-passed radio call with squelch clicks'],
  ['LOUD', 'loud', 'facility-wide radio order, hard drive'],
  ['RETREAT', 'retreat', 'strained falling withdrawal call'],
];
for (const [id, line, acc] of ENEMY_VOX) {
  rec(`VOX-ENEMY-${id}`, `voice_enemy_${line}`, `Enemy bark - ${line}`,
    `wordless formant-synth vocalisation; ${acc}. Subtitles carry the words.`, ['src/audio/vox.js']);
}
rec('VOX-ENEMY-DEATH', 'enemy_death', 'Enemy death', 'falling groan collapsing into breath plus gear hitting the floor.', ['src/audio/vox.js']);
rec('VOX-PLAYER-HURT', 'voice_player_hurt', 'Player pain grunt', 'brief clenched grunt on meaningful damage.', ['src/audio/vox.js']);

const HOSTAGE_VOX = [
  ['BREATHING', 'breathing', 'shaky fear breathing cycles while bound'],
  ['SOB', 'sob', 'three small whimpers with tremor'],
  ['SCARED', 'scared', 'sharp frightened cry when approached/grabbed'],
  ['RELIEVED', 'relieved', 'long settling exhale: relief without words'],
  ['FOLLOW', 'follow', 'quick tight assent when told to follow'],
  ['WAIT', 'wait', 'soft acknowledgement when told to wait'],
  ['DEATH', 'death', 'cut-off cry falling away; the worst sound in the game'],
];
for (const [id, key, acc] of HOSTAGE_VOX) {
  rec(`VOX-HOSTAGE-${id}`, `voice_hostage_${key}`, `Hostage - ${key}`,
    `wordless formant-synth vocalisation, higher and breathier than hostiles; ${acc}.`, ['src/audio/vox.js']);
}

// ----------------------------------------------------------------- ambience
const AMBIENCE = [
  ['AMB-HVAC', 'amb_hvac', 'HVAC rumble', 'low ducted air with slow amplitude wander; office ceiling presence'],
  ['AMB-HVAC-HEAVY', 'amb_hvac_heavy', 'Plant-room air handler', 'heavier rumble with a 49 Hz motor fundamental; mechanical room'],
  ['AMB-FLUORESCENT', 'amb_fluorescent', 'Fluorescent hum', '120 Hz mains buzz with thin ballast hiss in every strip-lit room'],
  ['AMB-SERVER-FANS', 'amb_server_fans', 'Server fan wall', 'dense fan broadband with beating twin whines; the loudest room tone'],
  ['AMB-WIND', 'amb_wind', 'Exterior wind', 'gusting band-passed wind at openings and the curtain wall'],
  ['AMB-STORM', 'amb_storm', 'Storm bed', 'global very-low rumble bed under everything outdoors-adjacent'],
  ['AMB-LIGHT-BUZZ', 'amb_light_buzz', 'Dying light buzz', 'sputtering uneven tube in the service corridor; slightly unnerving'],
  ['AMB-DRIP', 'drip', 'Dripping tap', 'randomised drips with a basin echo in the restrooms'],
  ['AMB-LIGHT-FLICKER', 'light_flicker', 'Light flicker tick', 'tick plus a short buzz gasp when a tube stumbles'],
  ['AMB-STORM-GUST', 'storm_gust', 'Storm gust', 'occasional 2-3 s wind swell'],
  ['AMB-STORM-RUMBLE', 'storm_rumble', 'Distant storm rumble', 'far-off low roll every so often'],
];
for (const [id, sound, name, acc] of AMBIENCE) {
  rec(id, sound, name, `${acc}; positional emitters placed from ROOMS, distance-culled.`, ['src/audio/ambience.js']);
}

// ===========================================================================

export const AUDIO_ASSETS = R;

/** Manifest ID -> runtime sound name (lets play() accept manifest IDs). */
export const SOUND_ALIASES = {};
for (const r of R) if (r.sound) SOUND_ALIASES[r.id] = r.sound;

let registered = false;
export function registerAudioAssets() {
  if (registered) return;
  registered = true;
  for (const r of R) {
    assets.register({
      id: r.id,
      name: r.name,
      category: 'audio',
      owner: 'fable4',
      files: r.files,
      rooms: [],
      dims: [0, 0, 0],
      pivot: 'n/a',
      materials: [],
      textures: [],
      collision: 'none',
      lod: 'n/a - synthesised at runtime, zero assets on disk',
      audio: r.sound ? [r.sound] : [],
      status: 'integrated',
      acceptance: r.acceptance,
      evidence: 'headless synthesis smoke test (see src/audio/README.md)',
      discrepancies: 'none',
    });
  }
}
