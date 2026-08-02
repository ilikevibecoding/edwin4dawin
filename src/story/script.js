/**
 * The screenplay.
 *
 * One source of truth for narration, subtitles and the offline audio mix.
 * `tools/build-audio.mjs` reads this to synthesise voices and writes back the
 * measured durations, which the film timeline then uses to place its shots.
 *
 * Original prose. The story beats are the ones everybody knows; the words are
 * not lifted from the films.
 */

export const VOICES = {
  narrator: { voice: 'en_GB-alan-medium', rate: 1.0, pitch: -1.5, reverb: 0.22, gain: 1.0 },
  vader: { voice: 'en_US-ryan-high', rate: 0.82, pitch: -7.5, reverb: 0.3, gain: 1.05, breath: true, growl: true },
  leia: { voice: 'en_GB-jenny_dioco-medium', rate: 1.02, pitch: 1.0, reverb: 0.16, gain: 1.0 },
  luke: { voice: 'en_US-joe-medium', rate: 1.0, pitch: 2.0, reverb: 0.14, gain: 1.0 },
  obiwan: { voice: 'en_GB-alan-medium', rate: 0.9, pitch: -3.0, reverb: 0.26, gain: 1.0 },
  threepio: { voice: 'en_GB-northern_english_male-medium', rate: 1.08, pitch: 4.5, reverb: 0.12, gain: 0.95, metallic: true },
  officer: { voice: 'en_GB-northern_english_male-medium', rate: 1.05, pitch: -1.0, reverb: 0.18, gain: 0.95 },
  pilot: { voice: 'en_US-lessac-high', rate: 1.06, pitch: 0.5, reverb: 0.08, gain: 1.0, radio: true },
  ghost: { voice: 'en_GB-alan-medium', rate: 0.86, pitch: -2.0, reverb: 0.55, gain: 0.9, ethereal: true },
};

/**
 * Lines are grouped by chapter. `pre` / `post` are silence padding in seconds,
 * used to breathe and to let the picture play.
 */
export const SCRIPT = [
  // ---------------------------------------------------------------- title
  { id: 't1', ch: 'title', who: 'narrator', pre: 1.2, post: 1.0,
    text: 'A long time ago, in a galaxy far, far away.' },
  { id: 't2', ch: 'title', who: 'narrator', pre: 2.6, post: 0.5,
    text: 'Episode Four. A New Hope.' },
  { id: 't3', ch: 'title', who: 'narrator', pre: 0.4, post: 0.4,
    text: 'War burns across the stars. From a hidden base among the outer worlds, a small rebel fleet has struck the first real blow against the Empire, and lived.' },
  { id: 't4', ch: 'title', who: 'narrator', pre: 0.3, post: 0.4,
    text: 'Hidden in the memory of a stolen droid are the plans to the Empire\'s new battle station: a fortress the size of a moon, with power enough to end a world.' },
  { id: 't5', ch: 'title', who: 'narrator', pre: 0.3, post: 1.6,
    text: 'Pursued by the Emperor\'s agents, Princess Leia runs for home, carrying the one secret that can still save her people.' },

  // ---------------------------------------------------------------- chase
  { id: 'c1', ch: 'chase', who: 'narrator', pre: 1.4, post: 0.8,
    text: 'Above a forgotten desert world, a rebel corvette is running for its life.' },
  { id: 'c2', ch: 'chase', who: 'narrator', pre: 1.6, post: 0.6,
    text: 'And out of the dark behind it comes something the size of a city.' },
  { id: 'c3', ch: 'chase', who: 'officer', pre: 2.2, post: 0.3,
    text: 'Hull breach on deck four! They have us in a tractor beam!' },
  { id: 'c4', ch: 'chase', who: 'narrator', pre: 0.6, post: 1.2,
    text: 'Eleven thousand tonnes of consular ship, swallowed whole.' },

  // ------------------------------------------------------------- boarding
  { id: 'b1', ch: 'boarding', who: 'narrator', pre: 1.0, post: 0.7,
    text: 'The corridor goes very quiet. Then the doors come off their hinges.' },
  { id: 'b2', ch: 'boarding', who: 'narrator', pre: 3.4, post: 0.6,
    text: 'And through the smoke walks the thing every soldier aboard had heard about, and hoped was only a rumour.' },
  { id: 'b3', ch: 'boarding', who: 'vader', pre: 1.8, post: 0.5,
    text: 'Where are the plans you intercepted? I will not ask a second time.' },
  { id: 'b4', ch: 'boarding', who: 'officer', pre: 0.4, post: 0.2,
    text: 'This is a consular ship. We carry no transmissions, we are on a diplomatic mission to...' },
  { id: 'b5', ch: 'boarding', who: 'vader', pre: 0.15, post: 1.1,
    text: 'Tear the ship apart.' },

  // -------------------------------------------------------------- message
  { id: 'm1', ch: 'message', who: 'narrator', pre: 1.0, post: 0.7,
    text: 'But the plans are already gone, folded into the memory of one small astromech with a stubborn streak.' },
  { id: 'm2', ch: 'message', who: 'leia', pre: 1.6, post: 0.5,
    text: 'Find the old man on the desert world. Give him this. You are my only hope.' },
  { id: 'm3', ch: 'message', who: 'narrator', pre: 2.4, post: 1.0,
    text: 'One escape pod, no life signs aboard. The gunners let it fall.' },

  // ---------------------------------------------------------------- dunes
  { id: 'd1', ch: 'dunes', who: 'narrator', pre: 1.2, post: 0.6,
    text: 'Two droids. A thousand kilometres of sand. And no plan whatsoever.' },
  { id: 'd2', ch: 'dunes', who: 'threepio', pre: 1.4, post: 0.3,
    text: 'We are doomed. Do you hear me? Doomed. And I blame you entirely.' },
  { id: 'd3', ch: 'dunes', who: 'narrator', pre: 2.6, post: 1.0,
    text: 'By dusk, a sandcrawler had them both.' },

  // ------------------------------------------------------------- twinsuns
  { id: 's1', ch: 'twinsuns', who: 'narrator', pre: 1.6, post: 0.8,
    text: 'On a moisture farm at the edge of nowhere, a boy watches two suns go down, the way he has every evening of his life.' },
  { id: 's2', ch: 'twinsuns', who: 'luke', pre: 2.2, post: 0.8,
    text: 'There is a whole galaxy out there. And I am here, fixing evaporators.' },
  { id: 's3', ch: 'twinsuns', who: 'narrator', pre: 1.8, post: 1.4,
    text: 'He does not know it yet, but the war has already come looking for him.' },

  // ---------------------------------------------------------------- saber
  { id: 'k1', ch: 'saber', who: 'narrator', pre: 1.2, post: 0.6,
    text: 'An old hermit in the hills. A locked chest. A weapon from a cleaner age.' },
  { id: 'k2', ch: 'saber', who: 'obiwan', pre: 1.6, post: 0.4,
    text: 'Your father\'s lightsaber. He would have wanted you to have it, when you were old enough.' },
  { id: 'k3', ch: 'saber', who: 'obiwan', pre: 2.0, post: 0.5,
    text: 'The Force surrounds us. It binds the galaxy together. Learn to listen, and it will tell you what your eyes cannot.' },
  { id: 'k4', ch: 'saber', who: 'luke', pre: 0.6, post: 1.2,
    text: 'Then teach me. I want to learn.' },

  // --------------------------------------------------------------- trench
  { id: 'r1', ch: 'trench', who: 'narrator', pre: 1.0, post: 0.5,
    text: 'Thirty pilots against a moon.' },
  { id: 'r2', ch: 'trench', who: 'narrator', pre: 0.4, post: 0.6,
    text: 'The trench is two metres wide and eleven kilometres long, and every gun on that station is watching it.' },
  { id: 'r3', ch: 'trench', who: 'pilot', pre: 1.6, post: 0.4,
    text: 'Red Five, standing by. Cutting in now, stay on me.' },
  { id: 'r4', ch: 'trench', who: 'vader', pre: 3.2, post: 0.6,
    text: 'The Force is strong with this one. I have you now.' },
  { id: 'r5', ch: 'trench', who: 'ghost', pre: 2.4, post: 0.5,
    text: 'Let go. Trust yourself.' },
  { id: 'r6', ch: 'trench', who: 'narrator', pre: 1.8, post: 0.4,
    text: 'He switched off the targeting computer. And fired.' },

  // --------------------------------------------------------------- medals
  { id: 'f1', ch: 'medals', who: 'narrator', pre: 3.0, post: 0.7,
    text: 'The battle station burns. The war is not over. Not by years.' },
  { id: 'f2', ch: 'medals', who: 'narrator', pre: 1.4, post: 3.0,
    text: 'But tonight, in a hall of white stone, a farm boy, a smuggler and a princess stand in the light, and the galaxy remembers how to hope.' },
];

/** The opening crawl, rendered as receding 3D text. */
export const CRAWL = {
  episode: 'Episode IV',
  title: 'A NEW HOPE',
  body: [
    'War burns across the stars. From a hidden base among',
    'the outer worlds, a small REBEL FLEET has struck the',
    'first real blow against the Galactic Empire, and lived.',
    '',
    'Hidden in the memory of a stolen droid are the plans',
    'to the Empire\'s new battle station: a fortress the size',
    'of a moon, with power enough to end a world.',
    '',
    'Pursued by the Emperor\'s agents, PRINCESS LEIA runs',
    'for home aboard her consular ship, carrying the one',
    'secret that can still save her people....',
  ],
};

export const CHAPTER_ORDER = [
  'title', 'chase', 'boarding', 'message', 'dunes', 'twinsuns', 'saber', 'trench', 'medals',
];

export function linesFor(chapter) {
  return SCRIPT.filter((l) => l.ch === chapter);
}
