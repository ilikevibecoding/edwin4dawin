// ---------------------------------------------------------------------------
// Sound recipes.  (owner: fable4)
//
// Every entry is a pure synthesis recipe: (kit, opts) -> void. The kit is
// already wired to a voice gain (and 3D panner when the trigger is
// positional); recipes only decide WHAT the sound is, never where it goes in
// the graph. All recipes must schedule every source with a hard stop time.
//
// Naming follows the ids the rest of the game already emits (weapon defs,
// SURFACE_PROPS, AI barks), so the engine can play event payload `audioId`s
// directly. `registerAliases` maps manifest ids (SFX-FIRE-RIFLE) onto these.
// ---------------------------------------------------------------------------

const MIN = 0.0001;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** name -> { bus, priority, hrtf, ref, max, build } */
export const SOUNDS = new Map();

/** Register one recipe under one or more runtime names. */
export function def(names, meta, build) {
  const rec = {
    bus: 'sfx',
    priority: 2,
    hrtf: false,
    ref: 1.6,       // panner refDistance
    max: 48,        // audible ceiling; beyond this the engine culls the trigger
    rolloff: 1.1,
    build,
    ...meta,
  };
  rec.build = build;
  for (const n of Array.isArray(names) ? names : [names]) SOUNDS.set(n, rec);
  return rec;
}

// ===========================================================================
// WEAPONS - firing
// ===========================================================================
//
// A shot is four layers: (1) a 2-10 ms transient click that reads as the
// mechanism, (2) a pitched body thump gliding down into the chest range,
// (3) a driven band-passed noise crack, and (4) a filtered noise tail.
// `opts.distance` (metres from the listener) morphs the same recipe from
// "in your hands" to "somewhere across the building": the transient and
// crack fade out, the low-pass closes, and the tail stretches and swells.

const GUN = {
  pistol:  { weight: 0.8,  body0: 320, body1: 72, bodyDur: 0.085, crackHz: 2900, crackDur: 0.045, drive: 7,  tailDur: 0.34, tailHz: 2400, boom: 0.35 },
  smg:     { weight: 0.85, body0: 300, body1: 66, bodyDur: 0.09,  crackHz: 2500, crackDur: 0.05,  drive: 8,  tailDur: 0.4,  tailHz: 2300, boom: 0.4  },
  rifle:   { weight: 1.05, body0: 270, body1: 56, bodyDur: 0.105, crackHz: 2200, crackDur: 0.06,  drive: 9,  tailDur: 0.52, tailHz: 2100, boom: 0.55 },
  shotgun: { weight: 1.5,  body0: 210, body1: 44, bodyDur: 0.17,  crackHz: 1450, crackDur: 0.09,  drive: 10, tailDur: 0.66, tailHz: 1500, boom: 1.0  },
  sniper:  { weight: 1.65, body0: 240, body1: 38, bodyDur: 0.2,   crackHz: 1800, crackDur: 0.08,  drive: 10, tailDur: 0.9,  tailHz: 1800, boom: 0.9  },
};

function gunshot(k, p, opts = {}) {
  const dist = Math.max(0, opts.distance || 0);
  const far = clamp01((dist - 9) / 32);   // 0 in-hand .. 1 heard across the map
  const near = 1 - far;

  // 1. transient
  if (near > 0.08) {
    k.click({ freq: 3400, Q: 0.7, dur: 0.01, gain: 0.75 * p.weight * near });
  }

  // 2. body
  k.thump({
    freq0: p.body0, freq1: p.body1,
    dur: p.bodyDur * (1 + far * 0.6),
    gain: 0.95 * p.weight * (0.8 + 0.35 * near),
    type: 'triangle',
  });
  // low boom (noise weight under the thump)
  const boomF = k.chain(k.filter('lowpass', 340 - 160 * far, 0.6));
  k.noise({ color: 'brown', dur: p.bodyDur * 2.2, gain: p.boom * (0.9 + 0.3 * near), dest: boomF });

  // 3. crack
  const crackGain = (0.8 + 0.2 * near) * (1 - 0.82 * far);
  if (crackGain > 0.05) {
    const f = k.chain(
      k.filter('bandpass', k.jitter(p.crackHz * (1 - 0.45 * far), 0.08), 0.9),
      k.shaper(p.drive),
      k.gainNode(crackGain)
    );
    k.noise({ dur: p.crackDur, gain: 1, dest: f });
  }

  // 4. tail - duller and LONGER with distance
  const tailDur = p.tailDur * (1 + far * 1.5);
  const tailHz = p.tailHz * (1 - 0.68 * far);
  const tf = k.chain(k.filter('lowpass', tailHz, 0.7, { glideTo: Math.max(220, tailHz * 0.28), glideDur: tailDur }));
  k.noise({
    color: 'pink', dur: tailDur, gain: 0.5 * p.weight * (0.7 + 0.55 * far),
    env: [[0, MIN], [0.012, 0.5 * p.weight], [tailDur, MIN]],
    dest: tf,
  });
}

/** Standalone tail (registered so `tailId`s in weapon defs always resolve). */
function guntail(k, p, opts = {}) {
  gunshot(k, { ...p, weight: p.weight * 0.5, crackHz: p.crackHz, crackDur: 0 },
    { distance: Math.max(14, opts.distance || 14) });
}

const FIRE_META = { priority: 3, hrtf: true, ref: 3, max: 70, rolloff: 0.9 };
def(['weapon_nw9_fire', 'gunshot_pistol'], FIRE_META, (k, o) => gunshot(k, GUN.pistol, o));
def(['weapon_vk7_fire', 'gunshot_smg'], FIRE_META, (k, o) => gunshot(k, GUN.smg, o));
def(['weapon_kd4_fire', 'gunshot_rifle'], FIRE_META, (k, o) => gunshot(k, GUN.rifle, o));
def(['weapon_cs12_fire', 'gunshot_shotgun'], FIRE_META, (k, o) => gunshot(k, GUN.shotgun, o));
def(['weapon_hl700_fire', 'gunshot_sniper'], FIRE_META, (k, o) => gunshot(k, GUN.sniper, o));

def('weapon_nw9_tail', { priority: 1, max: 70 }, (k, o) => guntail(k, GUN.pistol, o));
def('weapon_vk7_tail', { priority: 1, max: 70 }, (k, o) => guntail(k, GUN.smg, o));
def('weapon_kd4_tail', { priority: 1, max: 70 }, (k, o) => guntail(k, GUN.rifle, o));
def('weapon_cs12_tail', { priority: 1, max: 70 }, (k, o) => guntail(k, GUN.shotgun, o));
def('weapon_hl700_tail', { priority: 1, max: 70 }, (k, o) => guntail(k, GUN.sniper, o));

// Suppressed: no supersonic crack, just a compact "thut" plus the action
// cycling - the mechanism is louder than the muzzle.
def(['weapon_vk7_fire_suppressed', 'gunshot_suppressed'], { priority: 3, hrtf: true, ref: 2, max: 26 }, (k, o) => {
  const far = clamp01(((o?.distance || 0) - 6) / 18);
  const pf = k.chain(k.filter('bandpass', 820 * (1 - 0.4 * far), 0.8), k.shaper(4), k.gainNode(0.8 - 0.5 * far));
  k.noise({ dur: 0.055, gain: 1, dest: pf });
  k.thump({ freq0: 210, freq1: 70, dur: 0.07, gain: 0.55, type: 'sine' });
  // bolt clatter, only really audible up close
  if (far < 0.5) {
    k.click({ at: 0.018, freq: 1900, Q: 3, dur: 0.02, gain: 0.3 });
    k.click({ at: 0.055, freq: 1500, Q: 3, dur: 0.025, gain: 0.24 });
  }
  const tf = k.chain(k.filter('lowpass', 900, 0.7));
  k.noise({ color: 'pink', dur: 0.16, gain: 0.2, dest: tf });
});

// Dry fire: firing pin drops on nothing. Two tight clicks, no weight.
def('weapon_dry', { priority: 2, max: 8 }, (k) => {
  k.click({ freq: 2600, Q: 4, dur: 0.014, gain: 0.5 });
  k.click({ at: 0.028, freq: 1800, Q: 4, dur: 0.018, gain: 0.3 });
  k.ping({ freq: 3800, dur: 0.05, gain: 0.06 });
});

// ===========================================================================
// WEAPONS - handling / reload mechanics
// ===========================================================================
//
// All handling is built from three vocabulary elements sized per family:
// metal contact clicks, seated-part thunks, and cloth/gear rustle.

const SIZE = { nw9: 0.62, vk7: 0.8, kd4: 1.0, cs12: 1.3, hl700: 1.5, talon: 0.5, flash: 0.7, smoke: 0.7 };

function cloth(k, { at = 0, dur = 0.16, gain = 0.22 } = {}) {
  const f = k.chain(k.filter('bandpass', k.jitter(1400, 0.2), 0.6));
  k.noise({ color: 'pink', at, dur, gain, env: [[0, MIN], [dur * 0.4, gain], [dur, MIN]], dest: f });
}

function metalTick(k, { at = 0, size = 1, gain = 0.5 } = {}) {
  k.click({ at, freq: 2400 / size, Q: 3, dur: 0.018, gain });
  k.ping({ at: at + 0.004, freq: k.jitter(3100 / size, 0.15), dur: 0.06, gain: gain * 0.28 });
}

function seatThunk(k, { at = 0, size = 1, gain = 0.7 } = {}) {
  k.thump({ at, freq0: 190 / size, freq1: 85 / size, dur: 0.05 * size, gain, type: 'triangle' });
  k.click({ at, freq: 900, Q: 1.4, dur: 0.03, gain: gain * 0.5 });
}

function defHandling(prefix, size) {
  const meta = { priority: 2, max: 10 };
  def(`${prefix}_reload_start`, meta, (k) => {           // mag release + grip shift
    cloth(k, { dur: 0.12, gain: 0.18 });
    metalTick(k, { at: 0.05, size, gain: 0.42 });
  });
  def(`${prefix}_mag_out`, meta, (k) => {                // slide out + hand catch
    k.click({ freq: 1500 / size, Q: 1.5, dur: 0.03, gain: 0.4 });
    const f = k.chain(k.filter('bandpass', 700, 1));
    k.noise({ at: 0.02, dur: 0.09, gain: 0.3, dest: f });
    seatThunk(k, { at: 0.11, size, gain: 0.35 });
  });
  def(`${prefix}_mag_in`, meta, (k) => {                 // insert + seat slap
    const f = k.chain(k.filter('bandpass', 850, 1));
    k.noise({ dur: 0.06, gain: 0.3, dest: f });
    seatThunk(k, { at: 0.05, size, gain: 0.8 });
    metalTick(k, { at: 0.075, size, gain: 0.3 });
  });
  def(`${prefix}_reload_end`, meta, (k) => {             // slide/bolt release, chambering
    metalTick(k, { size, gain: 0.5 });
    k.thump({ at: 0.035, freq0: 240 / size, freq1: 110 / size, dur: 0.045 * size, gain: 0.75, type: 'triangle' });
    k.click({ at: 0.05, freq: 1300 / size, Q: 2, dur: 0.03, gain: 0.45 });
    cloth(k, { at: 0.08, dur: 0.1, gain: 0.12 });
  });
  def(`${prefix}_draw`, meta, (k) => {                   // cloth swish + metal settle
    cloth(k, { dur: 0.2, gain: 0.26 });
    metalTick(k, { at: 0.12, size, gain: 0.3 });
    seatThunk(k, { at: 0.16, size, gain: 0.25 });
  });
  def(`${prefix}_inspect`, meta, (k) => {                // gentle turn-over rattle
    cloth(k, { dur: 0.3, gain: 0.16 });
    metalTick(k, { at: 0.12, size, gain: 0.2 });
    metalTick(k, { at: 0.32, size: size * 1.2, gain: 0.16 });
  });
}
defHandling('weapon_nw9', SIZE.nw9);
defHandling('weapon_vk7', SIZE.vk7);
defHandling('weapon_kd4', SIZE.kd4);
defHandling('weapon_cs12', SIZE.cs12);
defHandling('weapon_hl700', SIZE.hl700);
defHandling('weapon_talon', SIZE.talon);

// Action cycling is characterful per mechanism, so these are bespoke:
def(['weapon_nw9_cycle', 'weapon_vk7_cycle', 'weapon_kd4_cycle'], { priority: 2, max: 12 }, (k, o) => {
  // charging handle: pull (scrape back) ... release (spring slam)
  const size = o?.size || 1;
  const f = k.chain(k.filter('bandpass', 1100 / size, 1.2));
  k.noise({ dur: 0.09, gain: 0.4, env: [[0, MIN], [0.02, 0.4], [0.09, MIN]], dest: f });
  metalTick(k, { at: 0.02, size, gain: 0.4 });
  seatThunk(k, { at: 0.16, size, gain: 0.85 });
  k.click({ at: 0.17, freq: 1600 / size, Q: 2, dur: 0.03, gain: 0.5 });
});
def(['weapon_cs12_cycle', 'weapon_pump'], { priority: 2, max: 14 }, (k) => {
  // pump action: shk (back, ejects) - shk (forward, chambers) + shell rattle
  const back = k.chain(k.filter('bandpass', 750, 0.9));
  k.noise({ dur: 0.1, gain: 0.55, dest: back });
  metalTick(k, { at: 0.03, size: 1.3, gain: 0.5 });
  k.thump({ at: 0.09, freq0: 160, freq1: 78, dur: 0.05, gain: 0.5, type: 'triangle' });
  const fwd = k.chain(k.filter('bandpass', 900, 0.9));
  k.noise({ at: 0.22, dur: 0.09, gain: 0.6, dest: fwd });
  seatThunk(k, { at: 0.3, size: 1.3, gain: 0.95 });
  k.click({ at: 0.31, freq: 1250, Q: 2, dur: 0.03, gain: 0.55 });
});
def(['weapon_hl700_cycle', 'weapon_bolt'], { priority: 2, max: 14 }, (k) => {
  // bolt: up-click, draw scrape, case ping, push scrape, down-clack
  metalTick(k, { size: 1.4, gain: 0.5 });
  const f1 = k.chain(k.filter('bandpass', 950, 1.1));
  k.noise({ at: 0.09, dur: 0.12, gain: 0.35, dest: f1 });
  k.ping({ at: 0.2, freq: k.jitter(5200, 0.12), dur: 0.1, gain: 0.12 });
  const f2 = k.chain(k.filter('bandpass', 820, 1.1));
  k.noise({ at: 0.34, dur: 0.11, gain: 0.35, dest: f2 });
  seatThunk(k, { at: 0.48, size: 1.45, gain: 0.9 });
  metalTick(k, { at: 0.5, size: 1.4, gain: 0.45 });
});

def(['weapon_holster'], { priority: 1, max: 8 }, (k) => {
  cloth(k, { dur: 0.22, gain: 0.24 });
  seatThunk(k, { at: 0.14, size: 1, gain: 0.28 });
});
def(['weapon_mode_switch'], { priority: 1, max: 6 }, (k) => {
  k.click({ freq: 2100, Q: 4, dur: 0.016, gain: 0.4 });
  k.click({ at: 0.03, freq: 1700, Q: 4, dur: 0.016, gain: 0.3 });
});
def(['weapon_flash_draw', 'weapon_smoke_draw'], { priority: 1, max: 8 }, (k) => {
  cloth(k, { dur: 0.18, gain: 0.24 });
  k.ping({ at: 0.1, freq: 2900, dur: 0.05, gain: 0.12 }); // canister tink
});

// --- melee -----------------------------------------------------------------
def(['weapon_talon_slash'], { priority: 2, max: 10 }, (k) => {
  const f = k.chain(k.filter('bandpass', 1500, 0.5, { glideTo: 3400, glideDur: 0.1 }));
  k.noise({ color: 'pink', dur: 0.13, gain: 0.5, env: [[0, MIN], [0.06, 0.5], [0.13, MIN]], dest: f });
});
def(['weapon_talon_stab'], { priority: 2, max: 10 }, (k) => {
  const f = k.chain(k.filter('bandpass', 1100, 0.6, { glideTo: 2200, glideDur: 0.07 }));
  k.noise({ color: 'pink', dur: 0.09, gain: 0.6, dest: f });
  cloth(k, { at: 0.05, dur: 0.08, gain: 0.14 });
});
def(['melee_hit_flesh'], { priority: 3, max: 14 }, (k) => {
  const f = k.chain(k.filter('lowpass', 700, 0.8));
  k.noise({ color: 'pink', dur: 0.08, gain: 0.9, dest: f });
  k.thump({ freq0: 190, freq1: 60, dur: 0.09, gain: 0.8 });
});
def(['melee_hit_world'], { priority: 2, max: 14 }, (k) => {
  k.thump({ freq0: 260, freq1: 90, dur: 0.06, gain: 0.7, type: 'triangle' });
  k.click({ freq: 1800, Q: 1.5, dur: 0.03, gain: 0.5 });
  k.ping({ freq: k.jitter(2600, 0.2), dur: 0.12, gain: 0.12 });
});

// --- shell casings -----------------------------------------------------------
// Brass on a hard floor is a cluster of tiny detuned pings that get faster as
// the casing settles; on carpet it is just a dull tick.
function shellDrop(k, { base = 5600, plastic = false, surface = 'concrete' } = {}) {
  const soft = surface === 'carpet' || surface === 'fabric' || surface === 'snow';
  if (soft) {
    const f = k.chain(k.filter('lowpass', 1200, 0.8));
    k.noise({ color: 'pink', dur: 0.04, gain: 0.22, dest: f });
    return;
  }
  const n = plastic ? 2 : 3 + Math.floor(k.rand(0, 2));
  let at = 0;
  let gap = k.rand(0.05, 0.085);
  for (let i = 0; i < n; i++) {
    const hz = plastic ? k.jitter(1300, 0.25) : k.jitter(base, 0.22);
    if (plastic) {
      k.click({ at, freq: hz, Q: 2, dur: 0.025, gain: 0.3 * (1 - i * 0.25) });
    } else {
      k.ping({ at, freq: hz, dur: 0.07, gain: 0.2 * (1 - i * 0.22), type: 'sine' });
      k.ping({ at, freq: hz * 1.83, dur: 0.05, gain: 0.08 * (1 - i * 0.22) });
    }
    at += gap;
    gap *= 0.62; // settle
  }
}
def(['shell_pistol'], { priority: 0, max: 9 }, (k, o) => shellDrop(k, { base: 6400, surface: o?.surface }));
def(['shell_rifle'], { priority: 0, max: 9 }, (k, o) => shellDrop(k, { base: 5200, surface: o?.surface }));
def(['shell_shotgun'], { priority: 0, max: 9 }, (k, o) => shellDrop(k, { base: 1400, plastic: true, surface: o?.surface }));

// ===========================================================================
// GADGETS
// ===========================================================================
def(['gadget_throw'], { priority: 2, max: 10 }, (k) => {
  const f = k.chain(k.filter('bandpass', 900, 0.5, { glideTo: 2400, glideDur: 0.18 }));
  k.noise({ color: 'pink', dur: 0.2, gain: 0.35, env: [[0, MIN], [0.1, 0.35], [0.2, MIN]], dest: f });
  k.click({ freq: 2400, Q: 3, dur: 0.015, gain: 0.28 }); // spoon/pin
});
def(['gadget_bounce'], { priority: 1, max: 16 }, (k) => {
  k.click({ freq: k.jitter(1600, 0.2), Q: 1.6, dur: 0.025, gain: 0.5 });
  k.ping({ freq: k.jitter(2400, 0.2), dur: 0.09, gain: 0.14 });
  k.thump({ freq0: 200, freq1: 110, dur: 0.03, gain: 0.3 });
});
def(['gadget_flash_detonate'], { priority: 4, hrtf: true, ref: 4, max: 80 }, (k, o) => {
  const far = clamp01(((o?.distance || 0) - 10) / 30);
  k.click({ freq: 3800, Q: 0.5, dur: 0.012, gain: 1.1 * (1 - far) });
  k.thump({ freq0: 400, freq1: 60, dur: 0.16, gain: 1.3, type: 'triangle' });
  const f = k.chain(k.filter('highpass', 1200 - 700 * far, 0.6), k.shaper(9), k.gainNode(1 - 0.7 * far));
  k.noise({ dur: 0.22, gain: 1.1, dest: f });
  const tf = k.chain(k.filter('lowpass', 2400 * (1 - 0.6 * far), 0.7, { glideTo: 400, glideDur: 0.9 }));
  k.noise({ color: 'pink', dur: 0.9, gain: 0.6, dest: tf });
});
def(['gadget_flash_ring'], { priority: 4, bus: 'ui', max: 1e9 }, (k, o) => {
  // The tinnitus whine after a close flash. Non-spatial by design.
  const dur = Math.min(3.2, Math.max(0.8, o?.duration || 2.2));
  k.osc({ type: 'sine', freq: 3800, dur, gain: 0.16, env: [[0, 0.16], [dur * 0.6, 0.05], [dur, MIN]], noPitch: true });
  k.osc({ type: 'sine', freq: 4790, dur: dur * 0.7, gain: 0.05, noPitch: true, env: [[0, 0.05], [dur * 0.7, MIN]] });
});
def(['gadget_smoke_pop'], { priority: 3, max: 30 }, (k) => {
  k.thump({ freq0: 300, freq1: 70, dur: 0.1, gain: 0.9 });
  const f = k.chain(k.filter('bandpass', 600, 1));
  k.noise({ dur: 0.12, gain: 0.6, dest: f });
});
def(['gadget_smoke_hiss'], { priority: 1, ref: 1.2, max: 18 }, (k, o) => {
  // Long pressurised hiss that thins out as the canister empties.
  const dur = Math.min(16, Math.max(3, o?.duration ?? 13));
  const f = k.chain(k.filter('bandpass', 1500, 0.6, { glideTo: 950, glideDur: dur }));
  k.noise({
    color: 'white', dur, gain: 0.34,
    env: [[0, MIN], [0.25, 0.34], [dur * 0.7, 0.2], [dur, MIN]],
    dest: f, noPitch: true,
  });
});

// ===========================================================================
// MOVEMENT
// ===========================================================================
//
// Each surface has 3-4 authored micro-variants; the engine also jitters pitch
// and level per trigger. `opts.soft` (crouch) drops the bright content and
// shortens the contact; `opts.speed` scales weight with locomotion.

function footVariants(list) {
  return (k, o) => {
    const v = list[Math.floor(k.rand(0, list.length)) % list.length];
    const soft = o?.soft ? 0.45 : 1;
    const run = clamp01((o?.speed ?? 3.2) / 5.2) * 0.5 + 0.62;
    v(k, soft * run, o);
  };
}

const FOOT_META = { priority: 1, ref: 1.2, max: 22 };

def(['footstep_carpet', 'footstep_fabric', 'footstep_paper'], FOOT_META, footVariants([
  (k, a) => { const f = k.chain(k.filter('lowpass', 420, 0.7)); k.noise({ color: 'pink', dur: 0.07, gain: 0.5 * a, dest: f }); },
  (k, a) => { const f = k.chain(k.filter('lowpass', 500, 0.7)); k.noise({ color: 'pink', dur: 0.06, gain: 0.44 * a, dest: f }); k.click({ at: 0.015, freq: 800, Q: 1, dur: 0.02, gain: 0.12 * a }); },
  (k, a) => { const f = k.chain(k.filter('lowpass', 380, 0.8)); k.noise({ color: 'pink', dur: 0.085, gain: 0.5 * a, env: [[0, MIN], [0.03, 0.5 * a], [0.085, MIN]], dest: f }); },
  (k, a) => { const f = k.chain(k.filter('lowpass', 460, 0.7)); k.noise({ color: 'pink', dur: 0.05, gain: 0.4 * a, dest: f }); k.thump({ freq0: 130, freq1: 70, dur: 0.04, gain: 0.2 * a }); },
]));

def(['footstep_tile', 'footstep_glass'], FOOT_META, footVariants([
  (k, a) => { k.click({ freq: 1500, Q: 1.4, dur: 0.025, gain: 0.5 * a }); k.ping({ freq: k.jitter(3100, 0.1), dur: 0.05, gain: 0.1 * a }); k.thump({ freq0: 180, freq1: 95, dur: 0.035, gain: 0.3 * a }); },
  (k, a) => { k.click({ freq: 1250, Q: 1.4, dur: 0.03, gain: 0.46 * a }); k.thump({ freq0: 200, freq1: 100, dur: 0.03, gain: 0.32 * a }); },
  (k, a) => { k.click({ freq: 1750, Q: 1.6, dur: 0.02, gain: 0.42 * a }); k.click({ at: 0.028, freq: 2300, Q: 2, dur: 0.014, gain: 0.16 * a }); k.thump({ freq0: 170, freq1: 90, dur: 0.04, gain: 0.28 * a }); },
]));

def(['footstep_vinyl', 'footstep_plastic'], FOOT_META, footVariants([
  (k, a) => { const f = k.chain(k.filter('bandpass', 900, 0.8)); k.noise({ dur: 0.045, gain: 0.42 * a, dest: f }); k.thump({ freq0: 150, freq1: 85, dur: 0.04, gain: 0.3 * a }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 760, 0.8)); k.noise({ dur: 0.05, gain: 0.4 * a, dest: f }); },
  (k, a) => { // occasional sole squeak
    const f = k.chain(k.filter('bandpass', 950, 0.8)); k.noise({ dur: 0.04, gain: 0.38 * a, dest: f });
    if (k.rand() < 0.3) k.osc({ type: 'sine', at: 0.01, dur: 0.07, gain: 0.07 * a, freqEnv: [[0, 1050], [0.07, 780]] });
  },
  (k, a) => { const f = k.chain(k.filter('bandpass', 820, 0.9)); k.noise({ dur: 0.055, gain: 0.36 * a, dest: f }); k.thump({ freq0: 140, freq1: 80, dur: 0.045, gain: 0.26 * a }); },
]));

def(['footstep_concrete', 'footstep_drywall'], FOOT_META, footVariants([
  (k, a) => { const f = k.chain(k.filter('bandpass', 640, 0.7)); k.noise({ dur: 0.055, gain: 0.5 * a, dest: f }); k.thump({ freq0: 160, freq1: 85, dur: 0.045, gain: 0.4 * a }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 720, 0.7)); k.noise({ dur: 0.05, gain: 0.46 * a, dest: f }); k.click({ at: 0.01, freq: 1300, Q: 1.2, dur: 0.02, gain: 0.14 * a }); k.thump({ freq0: 150, freq1: 80, dur: 0.05, gain: 0.36 * a }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 580, 0.8)); k.noise({ dur: 0.06, gain: 0.48 * a, dest: f }); k.thump({ freq0: 170, freq1: 88, dur: 0.04, gain: 0.42 * a }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 680, 0.7)); k.noise({ color: 'pink', dur: 0.05, gain: 0.5 * a, dest: f }); k.thump({ freq0: 145, freq1: 78, dur: 0.05, gain: 0.34 * a }); },
]));

def(['footstep_snow'], FOOT_META, footVariants([
  (k, a) => { const f = k.chain(k.filter('lowpass', 900, 0.7)); k.noise({ color: 'crackle', dur: 0.11, gain: 0.75 * a, rate: 0.8, env: [[0, MIN], [0.04, 0.75 * a], [0.11, MIN]], dest: f }); },
  (k, a) => { const f = k.chain(k.filter('lowpass', 800, 0.7)); k.noise({ color: 'crackle', dur: 0.13, gain: 0.7 * a, rate: 0.65, dest: f }); k.thump({ freq0: 120, freq1: 70, dur: 0.05, gain: 0.2 * a }); },
  (k, a) => { const f = k.chain(k.filter('lowpass', 1000, 0.7)); k.noise({ color: 'crackle', dur: 0.09, gain: 0.8 * a, rate: 0.95, dest: f }); },
]));

def(['footstep_metal'], FOOT_META, footVariants([
  (k, a) => { k.thump({ freq0: 180, freq1: 90, dur: 0.05, gain: 0.45 * a }); k.ping({ freq: k.jitter(310, 0.1), dur: 0.16, gain: 0.16 * a, type: 'triangle' }); k.ping({ freq: k.jitter(470, 0.1), dur: 0.12, gain: 0.1 * a }); },
  (k, a) => { k.click({ freq: 1100, Q: 1.4, dur: 0.03, gain: 0.4 * a }); k.ping({ freq: k.jitter(280, 0.12), dur: 0.2, gain: 0.14 * a, type: 'triangle' }); },
  (k, a) => { k.thump({ freq0: 200, freq1: 95, dur: 0.045, gain: 0.42 * a }); k.ping({ freq: k.jitter(350, 0.14), dur: 0.14, gain: 0.13 * a }); k.ping({ at: 0.02, freq: k.jitter(520, 0.12), dur: 0.1, gain: 0.07 * a }); },
]));

def(['footstep_wood'], FOOT_META, footVariants([
  (k, a) => { const f = k.chain(k.filter('bandpass', 260, 2)); k.noise({ dur: 0.06, gain: 0.9 * a, dest: f }); k.click({ freq: 900, Q: 1.2, dur: 0.02, gain: 0.2 * a }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 230, 2.2)); k.noise({ dur: 0.07, gain: 0.85 * a, dest: f }); },
  (k, a) => { const f = k.chain(k.filter('bandpass', 290, 1.8)); k.noise({ dur: 0.055, gain: 0.8 * a, dest: f }); k.thump({ freq0: 130, freq1: 82, dur: 0.04, gain: 0.25 * a }); },
]));

def(['player_land'], { priority: 2, max: 20 }, (k, o) => {
  const a = 0.5 + clamp01(o?.impact ?? 0.5) * 0.9;
  k.thump({ freq0: 200, freq1: 48, dur: 0.12, gain: 0.9 * a });
  const f = k.chain(k.filter('lowpass', 700, 0.8));
  k.noise({ color: 'pink', dur: 0.09, gain: 0.5 * a, dest: f });
  cloth(k, { at: 0.03, dur: 0.14, gain: 0.24 * a });
});
def(['clothing_rustle', 'gear_rustle'], { priority: 0, max: 8 }, (k) => {
  cloth(k, { dur: 0.22, gain: 0.2 });
  if (k.rand() < 0.4) metalTick(k, { at: 0.1, size: 1.4, gain: 0.08 });
});
def(['stair_scuff', 'ladder_scuff'], { priority: 1, max: 14 }, (k) => {
  const f = k.chain(k.filter('bandpass', k.jitter(760, 0.2), 0.8));
  k.noise({ dur: 0.08, gain: 0.35, env: [[0, MIN], [0.04, 0.35], [0.08, MIN]], dest: f });
  k.thump({ freq0: 150, freq1: 90, dur: 0.04, gain: 0.24 });
});

// ===========================================================================
// BULLET IMPACTS / RICOCHET / GLASS
// ===========================================================================
const IMPACT_META = { priority: 2, ref: 1.6, max: 34 };

def(['impact_drywall'], IMPACT_META, (k) => {
  k.thump({ freq0: 320, freq1: 120, dur: 0.04, gain: 0.6, type: 'triangle' });
  const f = k.chain(k.filter('lowpass', 1600, 0.8));
  k.noise({ dur: 0.06, gain: 0.55, dest: f });
  const dust = k.chain(k.filter('bandpass', 2600, 0.7));
  k.noise({ at: 0.02, color: 'pink', dur: 0.12, gain: 0.14, dest: dust }); // powder rain
});
def(['impact_concrete', 'impact_tile'], IMPACT_META, (k) => {
  k.click({ freq: 2500, Q: 0.9, dur: 0.018, gain: 0.8 });
  k.thump({ freq0: 400, freq1: 150, dur: 0.03, gain: 0.5, type: 'triangle' });
  const grit = k.chain(k.filter('bandpass', 3400, 0.8));
  k.noise({ color: 'crackle', at: 0.012, dur: 0.09, gain: 0.3, rate: 1.4, dest: grit });
});
def(['impact_metal'], IMPACT_META, (k) => {
  k.click({ freq: 2900, Q: 1, dur: 0.014, gain: 0.85 });
  k.ping({ freq: k.jitter(1450, 0.25), dur: 0.22, gain: 0.3, type: 'triangle' });
  k.ping({ freq: k.jitter(2300, 0.2), dur: 0.14, gain: 0.16 });
  k.thump({ freq0: 300, freq1: 130, dur: 0.03, gain: 0.4 });
});
def(['impact_wood'], IMPACT_META, (k) => {
  const f = k.chain(k.filter('bandpass', 340, 1.8));
  k.noise({ dur: 0.05, gain: 1.0, dest: f });
  k.click({ freq: 1400, Q: 1.2, dur: 0.02, gain: 0.4 });
  const sp = k.chain(k.filter('bandpass', 1900, 0.9));
  k.noise({ color: 'crackle', at: 0.01, dur: 0.1, gain: 0.28, dest: sp });
});
def(['impact_glass'], IMPACT_META, (k) => {
  k.click({ freq: 3600, Q: 1.2, dur: 0.014, gain: 0.7 });
  for (let i = 0; i < 3; i++) k.ping({ at: 0.008 + i * 0.02, freq: k.jitter(4200 + i * 900, 0.15), dur: 0.09, gain: 0.14 });
});
def(['impact_soft'], { ...IMPACT_META, priority: 1 }, (k) => {
  const f = k.chain(k.filter('lowpass', 900, 0.8));
  k.noise({ color: 'pink', dur: 0.05, gain: 0.55, dest: f });
  k.thump({ freq0: 200, freq1: 90, dur: 0.035, gain: 0.3 });
});
def(['impact_plastic'], IMPACT_META, (k) => {
  k.click({ freq: 1200, Q: 1.6, dur: 0.025, gain: 0.6 });
  k.click({ at: 0.02, freq: 1900, Q: 2, dur: 0.02, gain: 0.3 });
});
def(['impact_snow'], { ...IMPACT_META, priority: 1 }, (k) => {
  const f = k.chain(k.filter('lowpass', 600, 0.8));
  k.noise({ color: 'pink', dur: 0.06, gain: 0.4, dest: f });
});
def(['impact_flesh'], { ...IMPACT_META, priority: 3 }, (k) => {
  const f = k.chain(k.filter('lowpass', 620, 0.9));
  k.noise({ color: 'pink', dur: 0.07, gain: 0.95, dest: f });
  k.thump({ freq0: 170, freq1: 55, dur: 0.08, gain: 0.7 });
});
def(['impact_electronic'], IMPACT_META, (k) => {
  k.click({ freq: 1600, Q: 1.2, dur: 0.025, gain: 0.6 });
  const arc = k.chain(k.filter('highpass', 3200, 0.7));
  k.noise({ color: 'crackle', dur: 0.16, gain: 0.4, rate: 1.6, dest: arc });
  k.ping({ freq: k.jitter(2800, 0.2), dur: 0.08, gain: 0.12 });
});
def(['ricochet'], { priority: 2, hrtf: true, ref: 2, max: 40 }, (k) => {
  // classic zing: fast downward gliss with vibrato-ish detune pair
  const dur = k.rand(0.28, 0.45);
  k.osc({ type: 'sine', dur, gain: 0.3, freqEnv: [[0, k.jitter(3400, 0.2)], [dur, 700]], env: [[0, MIN], [0.015, 0.3], [dur, MIN]] });
  k.osc({ type: 'sine', dur: dur * 0.8, gain: 0.12, detune: 18, freqEnv: [[0, k.jitter(4100, 0.2)], [dur * 0.8, 900]] });
  k.click({ freq: 2700, Q: 1, dur: 0.015, gain: 0.5 });
});
def(['spark', 'electrical_spark'], { priority: 1, max: 20 }, (k) => {
  const arc = k.chain(k.filter('highpass', 2600, 0.7));
  k.noise({ color: 'crackle', dur: k.rand(0.12, 0.3), gain: 0.5, rate: 1.8, dest: arc });
  k.click({ freq: 3400, Q: 2, dur: 0.012, gain: 0.4 });
});

// --- glass destruction -------------------------------------------------------
def(['glass_crack'], { priority: 2, max: 26 }, (k) => {
  k.click({ freq: 4300, Q: 1.6, dur: 0.02, gain: 0.6 });
  for (let i = 0; i < 4; i++) {
    k.ping({ at: 0.01 + i * 0.025, freq: k.jitter(5200 - i * 700, 0.2), dur: 0.07, gain: 0.12 * (1 - i * 0.18) });
  }
});
def(['glass_shatter'], { priority: 3, hrtf: true, ref: 2.4, max: 44 }, (k) => {
  // burst
  const f = k.chain(k.filter('highpass', 2400, 0.6), k.gainNode(0.9));
  k.noise({ dur: 0.16, gain: 1, env: [[0, MIN], [0.006, 1], [0.16, MIN]], dest: f });
  k.thump({ freq0: 340, freq1: 130, dur: 0.05, gain: 0.5 });
  // shard rain: pings thinning over ~0.7 s
  let at = 0.02;
  for (let i = 0; i < 14; i++) {
    k.ping({ at, freq: k.jitter(3400 + k.rand(0, 3200), 0.1), dur: k.rand(0.04, 0.1), gain: 0.12 * (1 - i / 16) });
    at += k.rand(0.02, 0.07) * (1 + i * 0.12);
  }
});
def(['glass_fragments'], { priority: 0, max: 18 }, (k) => {
  let at = 0;
  for (let i = 0; i < 6; i++) {
    k.ping({ at, freq: k.jitter(4600, 0.3), dur: 0.05, gain: 0.07 * (1 - i * 0.12) });
    at += k.rand(0.08, 0.24);
  }
});

// ===========================================================================
// DOORS
// ===========================================================================
//
// A door sound is handle/latch hardware + leaf movement + a stop. Each
// construction (timber office door, glazed door, security metal, fire door
// with closer, roller shutter) voices those three elements differently.

function doorSwing(k, { dur = 0.5, freq = 300, gain = 0.2, at = 0 } = {}) {
  const f = k.chain(k.filter('bandpass', freq, 0.6));
  k.noise({ color: 'pink', at, dur, gain, env: [[0, MIN], [dur * 0.3, gain], [dur, MIN]], dest: f });
}
function hingeCreak(k, { at = 0.06, dur = 0.4, gain = 0.09 } = {}) {
  k.osc({
    type: 'sawtooth', at, dur, gain,
    freqEnv: [[0, k.jitter(560, 0.2)], [dur * 0.5, k.jitter(440, 0.2)], [dur, 380]],
    dest: k.chain(k.filter('bandpass', 700, 5)),
  });
}

const DOOR_META = { priority: 3, ref: 1.8, max: 30 };

def(['door_wood_open'], DOOR_META, (k) => {
  k.click({ freq: 1900, Q: 2.4, dur: 0.02, gain: 0.5 });      // handle
  k.click({ at: 0.05, freq: 1100, Q: 2, dur: 0.03, gain: 0.4 }); // latch clear
  doorSwing(k, { at: 0.1, dur: 0.55, freq: 280, gain: 0.2 });
  if (k.rand() < 0.5) hingeCreak(k, { at: 0.16, dur: 0.35 });
});
def(['door_wood_close'], DOOR_META, (k) => {
  doorSwing(k, { dur: 0.4, freq: 260, gain: 0.18 });
  k.thump({ at: 0.36, freq0: 220, freq1: 90, dur: 0.06, gain: 0.7, type: 'triangle' }); // leaf meets frame
  k.click({ at: 0.4, freq: 1500, Q: 2, dur: 0.025, gain: 0.5 });                        // latch snaps
});
def(['door_wood_handle', 'door_handle'], { ...DOOR_META, priority: 2 }, (k) => {
  k.click({ freq: 1900, Q: 2.4, dur: 0.02, gain: 0.45 });
  k.click({ at: 0.04, freq: 1300, Q: 2, dur: 0.02, gain: 0.3 });
});
def(['door_glass_open'], DOOR_META, (k) => {
  k.ping({ freq: 3400, dur: 0.05, gain: 0.16 });               // glass tap via handle
  k.click({ at: 0.04, freq: 1500, Q: 2, dur: 0.025, gain: 0.4 });
  doorSwing(k, { at: 0.09, dur: 0.6, freq: 420, gain: 0.14 }); // smoother, lighter leaf
});
def(['door_glass_close'], DOOR_META, (k) => {
  doorSwing(k, { dur: 0.42, freq: 430, gain: 0.13 });
  k.thump({ at: 0.34, freq0: 260, freq1: 120, dur: 0.045, gain: 0.5 });
  k.ping({ at: 0.35, freq: k.jitter(3100, 0.1), dur: 0.1, gain: 0.14 }); // pane ring
});
def(['door_metal_open'], DOOR_META, (k) => {
  k.thump({ freq0: 300, freq1: 140, dur: 0.05, gain: 0.7, type: 'triangle' }); // heavy bolt
  k.click({ at: 0.015, freq: 1100, Q: 1.6, dur: 0.03, gain: 0.55 });
  k.ping({ at: 0.03, freq: k.jitter(640, 0.15), dur: 0.2, gain: 0.14, type: 'triangle' });
  doorSwing(k, { at: 0.12, dur: 0.6, freq: 200, gain: 0.24 });
});
def(['door_metal_close'], DOOR_META, (k) => {
  doorSwing(k, { dur: 0.4, freq: 190, gain: 0.22 });
  k.thump({ at: 0.34, freq0: 180, freq1: 62, dur: 0.1, gain: 1.0, type: 'triangle' });
  k.ping({ at: 0.36, freq: k.jitter(520, 0.12), dur: 0.3, gain: 0.16, type: 'triangle' });
  k.click({ at: 0.4, freq: 1000, Q: 1.6, dur: 0.03, gain: 0.5 });
});
def(['door_fire_open'], DOOR_META, (k) => {
  k.thump({ freq0: 260, freq1: 120, dur: 0.06, gain: 0.8, type: 'triangle' }); // panic-bar clunk
  k.click({ at: 0.02, freq: 900, Q: 1.4, dur: 0.04, gain: 0.5 });
  doorSwing(k, { at: 0.12, dur: 0.7, freq: 220, gain: 0.22 });
  // closer piston hiss
  const f = k.chain(k.filter('bandpass', 1600, 0.7));
  k.noise({ at: 0.2, dur: 0.8, gain: 0.1, env: [[0, MIN], [0.3, 0.1], [0.8, MIN]], dest: f });
});
def(['door_fire_close'], DOOR_META, (k) => {
  const f = k.chain(k.filter('bandpass', 1500, 0.7));
  k.noise({ dur: 1.0, gain: 0.1, env: [[0, MIN], [0.2, 0.1], [1.0, MIN]], dest: f }); // closer eases it home
  doorSwing(k, { at: 0.1, dur: 0.8, freq: 210, gain: 0.16 });
  k.thump({ at: 0.92, freq0: 190, freq1: 70, dur: 0.08, gain: 0.85, type: 'triangle' });
  k.click({ at: 0.97, freq: 1100, Q: 1.6, dur: 0.03, gain: 0.45 });
});
def(['door_locked'], { ...DOOR_META, priority: 2 }, (k) => {
  // handle turns, deadbolt refuses: clunk-clunk rattle
  k.click({ freq: 1700, Q: 2.4, dur: 0.02, gain: 0.5 });
  k.thump({ at: 0.05, freq0: 260, freq1: 160, dur: 0.03, gain: 0.5 });
  k.thump({ at: 0.13, freq0: 240, freq1: 150, dur: 0.03, gain: 0.42 });
  k.click({ at: 0.16, freq: 1400, Q: 2, dur: 0.02, gain: 0.3 });
});
def(['door_unlocked'], { ...DOOR_META, priority: 3 }, (k) => {
  // keycard chirp, then the maglock bolt drops
  k.osc({ type: 'square', freq: 2100, dur: 0.05, gain: 0.12, noPitch: true });
  k.osc({ type: 'square', at: 0.07, freq: 2640, dur: 0.06, gain: 0.12, noPitch: true });
  k.thump({ at: 0.2, freq0: 300, freq1: 110, dur: 0.05, gain: 0.8, type: 'triangle' });
  k.click({ at: 0.22, freq: 1100, Q: 1.6, dur: 0.03, gain: 0.5 });
});
def(['door_damaged', 'door_splinter'], { ...DOOR_META, priority: 3, max: 40 }, (k) => {
  const f = k.chain(k.filter('bandpass', 380, 1.4));
  k.noise({ dur: 0.09, gain: 1.0, dest: f });
  const sp = k.chain(k.filter('bandpass', 1700, 0.8));
  k.noise({ color: 'crackle', dur: 0.35, gain: 0.6, rate: 0.9, dest: sp }); // long splinter tear
  k.thump({ freq0: 200, freq1: 70, dur: 0.1, gain: 0.7 });
});
def(['door_impact'], { ...DOOR_META, priority: 2 }, (k) => {
  k.thump({ freq0: 240, freq1: 90, dur: 0.06, gain: 0.8, type: 'triangle' });
  const f = k.chain(k.filter('bandpass', 500, 1));
  k.noise({ dur: 0.05, gain: 0.5, dest: f });
});

// Roller shutter: motor loop + slat rattle, engine holds it while the
// shutter travels and stops it on the settled DOOR_STATE event.
def(['door_shutter_motor'], { priority: 3, ref: 3, max: 40 }, (k, o) => {
  const dur = Math.min(14, Math.max(2, o?.duration ?? 9));
  const motor = k.chain(k.filter('lowpass', 300, 4), k.gainNode(0.55));
  k.osc({ type: 'sawtooth', freq: 52, dur, gain: 0.5, dest: motor, noPitch: true, env: [[0, MIN], [0.3, 0.5], [dur - 0.3, 0.5], [dur, MIN]] });
  k.osc({ type: 'sawtooth', freq: 104.5, dur, gain: 0.2, dest: motor, noPitch: true, env: [[0, MIN], [0.3, 0.2], [dur - 0.3, 0.2], [dur, MIN]] });
  // slat rattle: crackle through a metal band
  const rattle = k.chain(k.filter('bandpass', 900, 1.2));
  k.noise({ color: 'crackle', dur, gain: 0.3, rate: 0.7, dest: rattle, env: [[0, MIN], [0.4, 0.3], [dur - 0.3, 0.3], [dur, MIN]] });
});
def(['door_shutter_stop'], { priority: 3, ref: 3, max: 40 }, (k) => {
  k.thump({ freq0: 160, freq1: 55, dur: 0.12, gain: 1.0, type: 'triangle' });
  k.ping({ freq: k.jitter(420, 0.15), dur: 0.35, gain: 0.2, type: 'triangle' });
  const rattle = k.chain(k.filter('bandpass', 950, 1.2));
  k.noise({ color: 'crackle', dur: 0.4, gain: 0.3, rate: 0.9, env: [[0, 0.3], [0.4, MIN]], dest: rattle });
});

// ===========================================================================
// WORLD DRESSING ONE-SHOTS
// ===========================================================================
def(['paper_rustle'], { priority: 0, max: 10 }, (k) => {
  const f = k.chain(k.filter('highpass', 1800, 0.7));
  k.noise({ color: 'crackle', dur: k.rand(0.2, 0.4), gain: 0.3, rate: 1.3, dest: f });
});
def(['locker_rattle', 'metal_rattle'], { priority: 1, max: 18 }, (k) => {
  k.thump({ freq0: 200, freq1: 110, dur: 0.04, gain: 0.5 });
  for (let i = 0; i < 3; i++) k.ping({ at: 0.02 + i * 0.06, freq: k.jitter(700 - i * 90, 0.2), dur: 0.12, gain: 0.14 * (1 - i * 0.2), type: 'triangle' });
});
def(['pickup_keycard'], { priority: 3, bus: 'ui', max: 1e9 }, (k) => {
  k.click({ freq: 1600, Q: 2, dur: 0.02, gain: 0.3 });
  k.osc({ type: 'sine', at: 0.03, freq: 1320, dur: 0.07, gain: 0.14, noPitch: true });
  k.osc({ type: 'sine', at: 0.1, freq: 1760, dur: 0.09, gain: 0.14, noPitch: true });
});

// ===========================================================================
// PLAYER FEEDBACK / HITMARKERS  (ui bus - crisp, dry, non-spatial)
// ===========================================================================
def(['hitmarker'], { priority: 3, bus: 'ui', max: 1e9 }, (k) => {
  k.click({ freq: 2300, Q: 3, dur: 0.016, gain: 0.22 });
});
def(['hitmarker_headshot'], { priority: 3, bus: 'ui', max: 1e9 }, (k) => {
  k.click({ freq: 2900, Q: 3, dur: 0.016, gain: 0.26 });
  k.ping({ at: 0.03, freq: 3500, dur: 0.06, gain: 0.12 });
});
def(['hitmarker_kill'], { priority: 3, bus: 'ui', max: 1e9 }, (k) => {
  k.click({ freq: 1500, Q: 2.4, dur: 0.025, gain: 0.3 });
  k.thump({ freq0: 320, freq1: 150, dur: 0.05, gain: 0.2 });
});
def(['player_hit'], { priority: 4, bus: 'ui', max: 1e9 }, (k, o) => {
  const a = 0.5 + clamp01((o?.amount ?? 15) / 50) * 0.6;
  k.thump({ freq0: 260, freq1: 60, dur: 0.1, gain: 0.7 * a });
  const f = k.chain(k.filter('lowpass', 800, 0.8));
  k.noise({ color: 'pink', dur: 0.08, gain: 0.4 * a, dest: f });
});
def(['player_death'], { priority: 4, bus: 'ui', max: 1e9 }, (k) => {
  k.thump({ freq0: 220, freq1: 38, dur: 0.5, gain: 0.9 });
  const f = k.chain(k.filter('lowpass', 500, 0.8, { glideTo: 120, glideDur: 1.4 }));
  k.noise({ color: 'brown', dur: 1.4, gain: 0.5, env: [[0, 0.5], [1.4, MIN]], dest: f });
});

// ===========================================================================
// UI
// ===========================================================================
const UI_META = { priority: 3, bus: 'ui', max: 1e9 };
def(['ui_move', 'ui_nav'], UI_META, (k) => {
  k.click({ freq: 2000, Q: 4, dur: 0.014, gain: 0.14 });
});
def(['ui_select', 'ui_confirm'], UI_META, (k) => {
  const f = k.chain(k.filter('bandpass', 1180, 7));
  k.noise({ dur: 0.09, gain: 0.5, env: [[0, 0.5], [0.09, MIN]], dest: f }); // plucked
  k.osc({ type: 'sine', freq: 880, dur: 0.1, gain: 0.1, noPitch: true });
});
def(['ui_back'], UI_META, (k) => {
  const f = k.chain(k.filter('bandpass', 760, 7));
  k.noise({ dur: 0.09, gain: 0.45, env: [[0, 0.45], [0.09, MIN]], dest: f });
});
def(['ui_deny', 'interact_deny'], UI_META, (k) => {
  k.osc({ type: 'square', freq: 220, dur: 0.06, gain: 0.09, noPitch: true });
  k.osc({ type: 'square', at: 0.08, freq: 185, dur: 0.09, gain: 0.09, noPitch: true });
});
def(['ui_slider'], UI_META, (k, o) => {
  const t = clamp01(o?.value ?? 0.5);
  k.click({ freq: 1500 + 900 * t, Q: 5, dur: 0.012, gain: 0.12 });
});
def(['interact_confirm'], UI_META, (k) => {
  k.click({ freq: 1700, Q: 3, dur: 0.016, gain: 0.2 });
  k.osc({ type: 'sine', at: 0.02, freq: 1240, dur: 0.06, gain: 0.1, noPitch: true });
});
def(['announce_good', 'announce_info'], UI_META, (k) => {
  k.osc({ type: 'sine', freq: 990, dur: 0.09, gain: 0.12, noPitch: true });
  k.osc({ type: 'sine', at: 0.09, freq: 1320, dur: 0.14, gain: 0.12, noPitch: true });
});
def(['announce_alert', 'announce_danger'], UI_META, (k) => {
  k.osc({ type: 'triangle', freq: 620, dur: 0.11, gain: 0.16, noPitch: true });
  k.osc({ type: 'triangle', at: 0.12, freq: 466, dur: 0.16, gain: 0.16, noPitch: true });
});

// ===========================================================================
// STINGERS  (music bus so they respect musicVolume)
// ===========================================================================
const STING_META = { priority: 4, bus: 'music', max: 1e9 };

/** Soft synth note with body: triangle + detuned partner through a lowpass. */
function note(k, { at = 0, freq = 440, dur = 0.6, gain = 0.16, bright = 2200 } = {}) {
  const f = k.chain(k.filter('lowpass', bright, 0.8), k.gainNode(1));
  k.osc({ type: 'triangle', at, freq, dur, gain, dest: f, noPitch: true, env: [[0, MIN], [0.02, gain], [dur, MIN]] });
  k.osc({ type: 'sawtooth', at, freq, detune: 7, dur, gain: gain * 0.35, dest: f, noPitch: true, env: [[0, MIN], [0.02, gain * 0.35], [dur, MIN]] });
}

def(['sting_mission_start'], STING_META, (k) => {
  // A low swell with a heartbeat pulse: "you are inside now".
  const f = k.chain(k.filter('lowpass', 400, 1, { glideTo: 900, glideDur: 1.4 }));
  k.osc({ type: 'sawtooth', freq: 55, dur: 2.4, gain: 0.22, dest: f, noPitch: true, env: [[0, MIN], [1.1, 0.22], [2.4, MIN]] });
  k.osc({ type: 'sawtooth', freq: 82.4, detune: 8, dur: 2.4, gain: 0.14, dest: f, noPitch: true, env: [[0, MIN], [1.2, 0.14], [2.4, MIN]] });
  k.thump({ at: 1.15, freq0: 120, freq1: 44, dur: 0.3, gain: 0.5 });
});
def(['sting_objective_complete'], STING_META, (k) => {
  note(k, { freq: 659.3, dur: 0.35, gain: 0.14 });          // E5
  note(k, { at: 0.16, freq: 987.8, dur: 0.7, gain: 0.16 }); // B5
  k.ping({ at: 0.16, freq: 1975.5, dur: 0.5, gain: 0.05 });
});
def(['sting_objective_failed'], STING_META, (k) => {
  note(k, { freq: 466.2, dur: 0.4, gain: 0.15, bright: 1200 });  // Bb4
  note(k, { at: 0.22, freq: 440, dur: 0.9, gain: 0.16, bright: 900 }); // A4 - semitone sag
  k.thump({ at: 0.22, freq0: 110, freq1: 55, dur: 0.4, gain: 0.3 });
});
def(['sting_victory'], STING_META, (k) => {
  note(k, { freq: 440, dur: 0.5, gain: 0.15 });              // A4
  note(k, { at: 0.22, freq: 554.4, dur: 0.5, gain: 0.15 });  // C#5
  note(k, { at: 0.44, freq: 659.3, dur: 1.4, gain: 0.18 });  // E5
  note(k, { at: 0.44, freq: 220, dur: 1.6, gain: 0.12, bright: 800 });
  const sh = k.chain(k.filter('highpass', 5200, 0.7));
  k.noise({ at: 0.44, dur: 1.4, gain: 0.05, env: [[0, MIN], [0.5, 0.05], [1.4, MIN]], dest: sh });
});
def(['sting_defeat'], STING_META, (k) => {
  // Low minor-second cluster sinking away.
  note(k, { freq: 110, dur: 3.0, gain: 0.17, bright: 500 });     // A2
  note(k, { at: 0.3, freq: 116.5, dur: 2.7, gain: 0.13, bright: 420 }); // Bb2
  note(k, { at: 0.6, freq: 82.4, dur: 2.6, gain: 0.14, bright: 350 });  // E2
  const f = k.chain(k.filter('lowpass', 300, 0.8));
  k.noise({ color: 'brown', dur: 3.2, gain: 0.14, env: [[0, MIN], [1.2, 0.14], [3.2, MIN]], dest: f });
});
def(['sting_hostage_secured'], STING_META, (k) => {
  // Warm two-strike bell.
  for (const [at, hz, g] of [[0, 880, 0.14], [0.18, 1174.7, 0.16]]) {
    k.osc({ type: 'sine', at, freq: hz, dur: 0.9, gain: g, noPitch: true, env: [[0, g], [0.9, MIN]] });
    k.osc({ type: 'sine', at, freq: hz * 2.76, dur: 0.4, gain: g * 0.3, noPitch: true, env: [[0, g * 0.3], [0.4, MIN]] });
  }
});
