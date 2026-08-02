/**
 * Where each sound effect sits.
 *
 * Placement is relative to the narration, not to absolute seconds, so the mix
 * follows the script if a line is rewritten:
 *   { ch, at }                seconds from the start of the chapter
 *   { after: 'b1', at }       seconds after that line starts
 *   { afterEnd: 'b1', at }    seconds after that line finishes
 *   { untilEnd: true }        stretch a loop to the end of the chapter
 *
 * `loop` repeats a cue to fill `dur` seconds (the loopable cues are built with
 * matching ends so this does not click).
 */
export const SFX_CUES = [
  // ------------------------------------------------------------------ title
  { ch: 'title', at: 0, cue: 'hall_ambience', gain: 0.10, loop: true, dur: 6 },

  // ------------------------------------------------------------------ chase
  { ch: 'chase', at: 0, cue: 'engine_rumble', gain: 0.22, loop: true, untilEnd: true },
  { afterEnd: 'c1', at: 0.4, cue: 'engine_pass', gain: 0.45 },
  { after: 'c2', at: 1.6, cue: 'laser_turbolaser', gain: 0.7, pan: -0.3 },
  { after: 'c2', at: 2.9, cue: 'laser_turbolaser', gain: 0.62, pan: 0.35 },
  { after: 'c2', at: 3.6, cue: 'explosion_small', gain: 0.55 },
  { after: 'c3', at: -0.9, cue: 'alarm_klaxon', gain: 0.28, loop: true, dur: 9 },
  { after: 'c3', at: 1.2, cue: 'explosion_small', gain: 0.6 },
  { after: 'c3', at: 2.1, cue: 'laser_turbolaser', gain: 0.66, pan: 0.2 },
  { after: 'c3', at: 3.0, cue: 'blaster_impact', gain: 0.5 },
  { after: 'c4', at: 0.6, cue: 'hyperspace_jump', gain: 0.30 },

  // --------------------------------------------------------------- boarding
  { ch: 'boarding', at: 0, cue: 'alarm_klaxon', gain: 0.18, loop: true, dur: 14 },
  { afterEnd: 'b1', at: 0.30, cue: 'door_slam', gain: 0.85 },
  { afterEnd: 'b1', at: 0.34, cue: 'explosion_small', gain: 0.8 },
  { afterEnd: 'b1', at: 0.9, cue: 'door_hiss', gain: 0.4 },
  ...[0.55, 0.78, 1.02, 1.31, 1.5, 1.82, 2.14, 2.4, 2.72, 3.05, 3.4, 3.7, 4.05, 4.5, 4.9]
    .map((d, i) => ({
      afterEnd: 'b1', at: 1.0 + d, cue: i % 3 === 2 ? 'blaster_rebel' : (i % 2 ? 'blaster_a' : 'blaster_b'),
      gain: 0.5, pan: (i % 2 ? 0.35 : -0.35),
    })),
  { after: 'b2', at: -1.2, cue: 'vader_breath_loop', gain: 0.34, loop: true, untilEnd: true },
  { after: 'b3', at: -0.5, cue: 'console_beep', gain: 0.25 },
  { after: 'b5', at: 1.3, cue: 'door_hiss', gain: 0.35 },

  // ---------------------------------------------------------------- message
  { ch: 'message', at: 0.5, cue: 'console_beep', gain: 0.3 },
  { after: 'm1', at: 2.2, cue: 'holo_shimmer', gain: 0.42 },
  { after: 'm1', at: 3.0, cue: 'r2_beep_a', gain: 0.45 },
  { afterEnd: 'm2', at: 0.25, cue: 'r2_worried', gain: 0.5 },
  { afterEnd: 'm2', at: 1.4, cue: 'door_hiss', gain: 0.35 },
  { after: 'm3', at: 0.7, cue: 'engine_pass', gain: 0.5 },
  { after: 'm3', at: 1.1, cue: 'engine_rumble', gain: 0.18, loop: true, untilEnd: true },

  // ------------------------------------------------------------------ dunes
  { ch: 'dunes', at: 0, cue: 'wind_desert', gain: 0.30, loop: true, untilEnd: true },
  { after: 'd1', at: 2.0, cue: 'r2_beep_c', gain: 0.4, pan: 0.2 },
  { afterEnd: 'd2', at: 0.3, cue: 'r2_alarm', gain: 0.45, pan: 0.25 },
  { after: 'd3', at: -1.6, cue: 'sandcrawler_treads', gain: 0.34, loop: true, untilEnd: true },

  // --------------------------------------------------------------- twinsuns
  { ch: 'twinsuns', at: 0, cue: 'wind_desert', gain: 0.22, loop: true, untilEnd: true },

  // ------------------------------------------------------------------ saber
  { ch: 'saber', at: 0, cue: 'hall_ambience', gain: 0.14, loop: true, untilEnd: true },
  { after: 'k2', at: 1.0, cue: 'console_beep', gain: 0.18 },
  { after: 'k2', at: 3.8, cue: 'saber_on', gain: 0.8 },
  { after: 'k2', at: 4.9, cue: 'saber_hum', gain: 0.22, loop: true, untilEnd: true },
  { after: 'k3', at: 3.2, cue: 'saber_swing', gain: 0.3 },

  // ----------------------------------------------------------------- trench
  { ch: 'trench', at: 0, cue: 'engine_rumble', gain: 0.26, loop: true, untilEnd: true },
  { after: 'r2', at: 1.0, cue: 'engine_pass', gain: 0.45 },
  { after: 'r3', at: 1.2, cue: 'tie_scream', gain: 0.42, pan: -0.4 },
  ...[0, 0.7, 1.5, 2.4, 3.1, 4.2, 5.0, 6.1, 7.2, 8.0, 9.4, 10.2]
    .map((d, i) => ({
      after: 'r4', at: -4 + d, cue: i % 2 ? 'blaster_a' : 'blaster_rebel',
      gain: 0.42, pan: (i % 2 ? 0.4 : -0.4),
    })),
  { after: 'r4', at: -2.0, cue: 'tie_scream', gain: 0.46, pan: 0.35 },
  { after: 'r4', at: 2.4, cue: 'explosion_small', gain: 0.6 },
  { after: 'r4', at: 5.0, cue: 'tie_scream', gain: 0.4, pan: -0.2 },
  { after: 'r5', at: 1.4, cue: 'console_beep', gain: 0.3 },
  { afterEnd: 'r6', at: 0.2, cue: 'blaster_rebel', gain: 0.7 },
  { afterEnd: 'r6', at: 1.3, cue: 'explosion_big', gain: 0.75 },
  { afterEnd: 'r6', at: 2.9, cue: 'explosion_massive', gain: 0.95 },

  // ----------------------------------------------------------------- medals
  { ch: 'medals', at: 0, cue: 'hall_ambience', gain: 0.22, loop: true, untilEnd: true },
  { after: 'f2', at: 2.4, cue: 'crowd_cheer', gain: 0.4 },
  { after: 'f2', at: 4.0, cue: 'r2_happy', gain: 0.35, pan: -0.3 },
];

/** Which score cue underscores each chapter, and where it starts. */
export const MUSIC_CUES = [
  { ch: 'title', cue: 'main_fanfare', at: 5.6, gain: 0.85 },
  { ch: 'title', cue: 'hope_theme', at: 26.0, gain: 0.62, fadeOut: 4 },
  { ch: 'chase', cue: 'chase', at: 0.4, gain: 0.62 },
  { ch: 'boarding', cue: 'imperial_menace', at: 1.0, gain: 0.68 },
  { ch: 'message', cue: 'mystic', at: 0.5, gain: 0.6 },
  { ch: 'dunes', cue: 'desert_wander', at: 0.3, gain: 0.66 },
  { ch: 'twinsuns', cue: 'binary_sunset', at: 1.0, gain: 0.78 },
  { ch: 'saber', cue: 'mystic', at: 0.5, gain: 0.62 },
  { ch: 'saber', cue: 'hope_theme', at: 20.0, gain: 0.6, fadeOut: 4 },
  { ch: 'trench', cue: 'battle', at: 0.5, gain: 0.66 },
  { ch: 'medals', cue: 'triumph', at: 0.6, gain: 0.8 },
];
