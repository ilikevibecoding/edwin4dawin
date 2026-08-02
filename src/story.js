/**
 * The screenplay.
 *
 * Single source of truth for scene order, running times, narration text and
 * subtitle timing. `tools/tts.mjs` reads this file to synthesise the voice
 * track; the director reads it to cue scenes, subtitles and music sections.
 *
 * The text is an original retelling written for this project.
 */

export const TITLE = 'LEGO STAR WARS — A NEW SPARK';

/**
 * voice ids map to synthesis + processing chains in tools/tts.mjs
 *   narrator : warm storyteller
 *   comm     : squadron radio (band limited, clipped)
 *   vader    : pitched down, cavernous
 *   imperial : clipped shipboard address
 */
export const SCENES = [
  {
    id: 'crawl',
    chapter: 'Episode Brick — A New Spark',
    dur: 41,
    music: 'fanfare',
    lines: [
      { t: 1.2, text: 'A long time ago, in a galaxy far, far away…', voice: 'narrator', gain: 0.9 },
      { t: 10.5, text: 'It is a time of rebellion.', voice: 'narrator' },
      { t: 14.0, text: 'Imperial fleets patrol every hyperlane, and the last free worlds are running out of places to hide.', voice: 'narrator' },
      { t: 22.0, text: 'Aboard a stolen corvette, a rebel princess carries the plans to the Empire\u2019s armoured moon: a fortress with power enough to shatter a planet.', voice: 'narrator' },
      { t: 32.5, text: 'Pursued by the flagship of the dark lord, she runs for home, hunted across the stars.', voice: 'narrator' },
    ],
  },
  {
    id: 'chase',
    chapter: 'I — The Chase',
    dur: 30,
    music: 'chase',
    lines: [
      { t: 1.0, text: 'Above a desert world at the ragged edge of the map, the chase runs out of room.', voice: 'narrator' },
      { t: 8.0, text: 'The corvette is fast. It is not fast enough.', voice: 'narrator' },
      { t: 13.5, text: 'Out of the dark comes two kilometres of grey wedge and turbolaser.', voice: 'narrator' },
      { t: 21.0, text: 'Ion fire rakes the little ship, and her engines die one by one.', voice: 'narrator' },
    ],
  },
  {
    id: 'boarding',
    chapter: 'II — Boarders',
    dur: 33,
    music: 'imperial',
    lines: [
      { t: 1.0, text: 'They breach at the forward corridor.', voice: 'narrator' },
      { t: 5.0, text: 'Rebel troopers hold the line for eleven seconds.', voice: 'narrator' },
      { t: 12.5, text: 'Then the smoke parts.', voice: 'narrator' },
      { t: 20.0, text: 'Where are the transmissions you intercepted?', voice: 'vader' },
      { t: 25.5, text: 'Everyone aboard knows that sound. Nobody wants to be the one who answers.', voice: 'narrator' },
    ],
  },
  {
    id: 'pod',
    chapter: 'III — Pod Seven',
    dur: 27,
    music: 'droids',
    lines: [
      { t: 0.8, text: 'The princess had already made her choice.', voice: 'narrator' },
      { t: 5.0, text: 'She hides the plans inside an astromech, and sends him down the corridor with a protocol droid who has never once been told the plan.', voice: 'narrator' },
      { t: 15.0, text: 'Escape pod seven jettisons at a quarter past the hour.', voice: 'narrator' },
      { t: 21.5, text: 'Hold your fire. No life forms aboard.', voice: 'imperial' },
    ],
  },
  {
    id: 'tatooine',
    chapter: 'IV — Twin Suns',
    dur: 32,
    music: 'desert',
    lines: [
      { t: 1.5, text: 'Tatooine. Twin suns, no shade, and eleven thousand kilometres of nothing.', voice: 'narrator' },
      { t: 9.5, text: 'Two droids walk away from the only argument they will ever win.', voice: 'narrator' },
      { t: 17.0, text: 'By evening a sandcrawler finds them, because on this planet everything is eventually found, and sold.', voice: 'narrator' },
      { t: 26.0, text: 'The plans keep travelling. That is all the plans have to do.', voice: 'narrator' },
    ],
  },
  {
    id: 'trench',
    chapter: 'V — The Trench',
    dur: 46,
    music: 'battle',
    lines: [
      { t: 0.8, text: 'The rest, you know.', voice: 'narrator' },
      { t: 3.5, text: 'A farm boy. A smuggler. A very old man with a very old sword.', voice: 'narrator' },
      { t: 10.0, text: 'And thirty pilots against a moon.', voice: 'narrator' },
      { t: 15.0, text: 'Red Five, standing by.', voice: 'comm' },
      { t: 19.0, text: 'The trench is twelve metres wide and entirely full of guns.', voice: 'narrator' },
      { t: 27.0, text: 'The targeting computer says the shot is impossible.', voice: 'narrator' },
      { t: 33.0, text: 'So he switches it off.', voice: 'narrator' },
      { t: 39.5, text: 'Torpedoes away!', voice: 'comm' },
    ],
  },
  {
    id: 'finale',
    chapter: 'VI — A New Spark',
    dur: 34,
    music: 'finale',
    lines: [
      { t: 3.0, text: 'One pilot, two torpedoes, and a very expensive lesson in exhaust port design.', voice: 'narrator' },
      { t: 11.0, text: 'The Empire built a machine that could kill a planet.', voice: 'narrator' },
      { t: 16.5, text: 'The rebellion built something that could not be shot down.', voice: 'narrator' },
      { t: 22.0, text: 'Every brick, ship, star and note in this film was written by a machine that has never seen a film.', voice: 'narrator' },
    ],
  },
];

/** Absolute start time of each scene, and total running time. */
export function timeline() {
  let t = 0;
  const out = SCENES.map((s) => {
    const entry = { ...s, start: t, end: t + s.dur };
    t += s.dur;
    return entry;
  });
  return { scenes: out, duration: t };
}

/** Flat list of narration cues with absolute times and stable ids. */
export function voiceLines() {
  const { scenes } = timeline();
  const out = [];
  for (const s of scenes) {
    s.lines.forEach((l, i) => {
      out.push({
        id: `${s.id}_${String(i).padStart(2, '0')}`,
        scene: s.id,
        t: s.start + l.t,
        localT: l.t,
        text: l.text,
        voice: l.voice || 'narrator',
        gain: l.gain ?? 1,
      });
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

export const DURATION = timeline().duration;
