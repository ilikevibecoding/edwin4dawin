/**
 * The screenplay.
 *
 * This module is plain data and is imported by both the browser and the Node
 * TTS tool. It is the single source of truth for scene order, narration text,
 * and who says what. `tools/tts.mjs` synthesises every line, measures the real
 * audio length, and writes `public/audio/manifest.json`; scene durations are
 * derived from that so narration can never be clipped.
 */

export const TITLE = 'BRICK WARS';
export const SUBTITLE = 'A LEGO-Brick Star Wars Story';

/**
 * Voices. `voice` is a Piper model name; the ffmpeg `chain` shapes it into a
 * character (pitch, radio filtering, reverb).
 */
export const SPEAKERS = {
  narrator: {
    name: null, // no on-screen speaker label
    voice: 'en_GB-alan-medium',
    lengthScale: 1.04,
    gain: 1.0,
    // A touch of low shelf and room for an epic read.
    chain: 'highpass=f=70,equalizer=f=170:t=q:w=1.1:g=3,equalizer=f=6000:t=q:w=1.4:g=1.5,aecho=0.85:0.35:22:0.16,dynaudnorm=f=200:g=5',
  },
  vader: {
    name: 'Vader',
    voice: 'en_GB-alan-medium',
    lengthScale: 1.06,
    gain: 1.05,
    // Drop the pitch to roughly 72 Hz (asetrate), pull the tempo back to
    // normal (atempo), then chorus + resonance for the mask.
    chain:
      'asetrate=22050*0.735,aresample=22050,atempo=1.30,' +
      'equalizer=f=85:t=q:w=0.9:g=8,equalizer=f=240:t=q:w=1.2:g=3,equalizer=f=1900:t=q:w=2:g=-5,' +
      'chorus=0.62:0.85:48|63:0.42|0.34:0.28|0.42:2.1|1.4,' +
      'lowpass=f=3100,acompressor=threshold=0.1:ratio=4:attack=8:release=140,' +
      'aecho=0.9:0.35:42:0.2,asubboost=dry=1:wet=0.4:decay=0.6,dynaudnorm=f=250:g=5',
  },
  leia: {
    name: 'Leia',
    voice: 'en_US-amy-medium',
    lengthScale: 1.02,
    gain: 1.0,
    // Already a female voice; no pitch shifting, just presence and a room.
    chain: 'highpass=f=130,equalizer=f=260:t=q:w=1.2:g=-1.5,equalizer=f=3200:t=q:w=1.4:g=2.5,aecho=0.9:0.25:17:0.09,dynaudnorm=f=200:g=5',
  },
  threepio: {
    name: 'C-3PO',
    voice: 'en_GB-alan-medium',
    lengthScale: 0.95,
    gain: 1.0,
    // Fussy protocol droid: a modest pitch lift plus two very short echoes,
    // which comb-filter the voice into something thin and metallic.
    chain:
      'asetrate=22050*1.105,aresample=22050,atempo=0.905,' +
      'highpass=f=250,lowpass=f=5600,equalizer=f=2400:t=q:w=1.6:g=3.5,equalizer=f=1150:t=q:w=2:g=-3,' +
      'aecho=0.88:0.42:7|11:0.4|0.26,dynaudnorm=f=200:g=5',
  },
  officer: {
    name: 'Imperial Officer',
    voice: 'en_US-ryan-high',
    lengthScale: 0.98,
    gain: 0.98,
    // Comms chatter: telephone band, bit-crushed and squashed like a cheap grille.
    chain:
      'highpass=f=460,lowpass=f=3100,equalizer=f=1700:t=q:w=1.4:g=5,' +
      'acrusher=bits=9:mode=log:aa=1,aexciter=amount=2.5,' +
      'acompressor=threshold=0.05:ratio=9:attack=3:release=70,dynaudnorm=f=200:g=5',
  },
  pilot: {
    name: 'Red Leader',
    voice: 'en_GB-northern_english_male-medium',
    lengthScale: 0.98,
    gain: 1.0,
    chain:
      'highpass=f=430,lowpass=f=3300,equalizer=f=1400:t=q:w=1.3:g=4,' +
      'acrusher=bits=10:mode=log:aa=1,aexciter=amount=2,' +
      'acompressor=threshold=0.06:ratio=8:attack=3:release=80,dynaudnorm=f=200:g=5',
  },
  ben: {
    name: 'Obi-Wan',
    voice: 'en_US-joe-medium',
    lengthScale: 1.12,
    gain: 0.95,
    // A voice remembered rather than heard: distant, wide, a little unreal.
    chain: 'asetrate=22050*0.95,aresample=22050,atempo=1.052,highpass=f=95,lowpass=f=6200,equalizer=f=200:t=q:w=1.2:g=2,aecho=0.82:0.85:150|265:0.34|0.24,dynaudnorm=f=200:g=5',
  },
};

/**
 * The film, scene by scene.
 *
 * Line timing: `at` pins a scene-local start time; otherwise the line starts
 * `gap` seconds after the previous one ends. `minDuration` and `tail` set how
 * long the scene runs beyond its last line.
 */
export const SCENES = [
  {
    id: 'crawl',
    title: 'A Long Time Ago',
    minDuration: 46,
    tail: 3.0,
    lines: [
      { at: 2.2, speaker: 'narrator', text: 'A long time ago, in a galaxy far, far away...', subtitle: false },
      {
        at: 9.0,
        speaker: 'narrator',
        gap: 1.0,
        text: 'It is a time of rebellion. A scattered alliance of worlds has struck the first blow against the Empire that rules the stars.',
        subtitle: false,
      },
      {
        gap: 0.7,
        speaker: 'narrator',
        text: 'In the confusion of that battle, rebel agents seized the plans for the Emperor’s newest weapon: a battle station the size of a moon, built to break planets whole.',
        subtitle: false,
      },
      {
        gap: 0.7,
        speaker: 'narrator',
        text: 'Hunted across the dark, Princess Leia runs for home with the stolen plans, and with the last hope of a galaxy in chains.',
        subtitle: false,
      },
    ],
  },

  {
    id: 'chase',
    title: 'The Chase',
    minDuration: 34,
    tail: 3.2,
    lines: [
      { at: 1.6, speaker: 'narrator', text: 'Above the burnt orange deserts of Tatooine, a rebel corvette ran with its engines wide open.' },
      { gap: 0.5, speaker: 'narrator', text: 'And behind it came a shadow with no end: an Imperial destroyer, a wedge of grey brick a mile from nose to tail.' },
      { gap: 1.9, speaker: 'narrator', text: 'Her shields buckled. Her engines went dark. And the great ship swallowed her whole.' },
    ],
  },

  {
    id: 'boarding',
    title: 'Boarders',
    minDuration: 34,
    tail: 2.6,
    lines: [
      { at: 1.4, speaker: 'narrator', text: 'The rebels braced in the corridor, blasters up, counting the seconds.' },
      { gap: 1.7, speaker: 'narrator', text: 'The door came apart in a hail of bricks.' },
      { gap: 3.4, speaker: 'narrator', text: 'Then the shooting stopped, the smoke parted, and something tall and black stepped through it.' },
      { gap: 1.4, speaker: 'vader', text: 'The plans are aboard this ship. Tear her apart, stud by stud, until you find them.' },
    ],
  },

  {
    id: 'plans',
    title: 'The Little Droid',
    minDuration: 40,
    tail: 2.8,
    lines: [
      { at: 1.2, speaker: 'narrator', text: 'Deep in the hold, the Princess knelt beside a small blue and white astromech.' },
      { gap: 0.5, speaker: 'leia', text: 'Everything the Alliance needs is inside you now. Do not stop for anyone.' },
      { gap: 0.4, speaker: 'threepio', text: 'Oh, we are doomed. Absolutely, comprehensively doomed.' },
      { gap: 1.1, speaker: 'narrator', text: 'An escape pod fell away from the captured ship, carrying two droids and the fate of the galaxy.' },
      { gap: 0.5, speaker: 'officer', text: 'Hold your fire. There are no life forms aboard.' },
    ],
  },

  {
    id: 'tatooine',
    title: 'Twin Suns',
    minDuration: 40,
    tail: 3.4,
    lines: [
      { at: 1.6, speaker: 'narrator', text: 'They came down in the dunes of Tatooine, under two suns that never quite set together.' },
      { gap: 0.6, speaker: 'narrator', text: 'A sandcrawler took them in, and traded them away, to a moisture farm at the edge of nowhere.' },
      { gap: 0.7, speaker: 'narrator', text: 'And there a farm boy named Luke found a message hidden in the little droid’s memory.' },
      { gap: 0.5, speaker: 'leia', text: 'This recording is our last hope. Please. Help us.' },
      { gap: 0.9, speaker: 'narrator', text: 'That evening he watched two suns go down, and knew that he could not stay.' },
    ],
  },

  {
    id: 'deathstar',
    title: 'The Battle Station',
    minDuration: 28,
    tail: 2.4,
    lines: [
      { at: 1.4, speaker: 'narrator', text: 'The stolen plans showed a single flaw: a thermal exhaust port, two metres wide, running straight down to the reactor.' },
      { gap: 0.6, speaker: 'narrator', text: 'Thirty small ships launched against a moon of grey brick. Very few of them would come back.' },
    ],
  },

  {
    id: 'trench',
    title: 'The Trench',
    minDuration: 54,
    tail: 4.0,
    lines: [
      { at: 1.2, speaker: 'pilot', text: 'Cut the chatter, Red Squadron. Lock S-foils in attack position.' },
      { gap: 0.5, speaker: 'narrator', text: 'They dropped into the trench with the walls a grey blur on either side.' },
      { gap: 2.6, speaker: 'narrator', text: 'Behind them came the black fighter and its two escorts, and one by one the rebels fell.' },
      { gap: 0.4, speaker: 'vader', text: 'The Force is strong with this one.' },
      { gap: 1.2, speaker: 'narrator', text: 'At the last moment the boy switched off his targeting computer, closed his eyes, and listened.' },
      { gap: 0.3, speaker: 'ben', text: 'Let go, Luke. Trust yourself.' },
      { gap: 1.5, speaker: 'narrator', text: 'Two torpedoes went down the shaft. The station lit up from the inside...' },
      { gap: 1.4, speaker: 'narrator', text: 'and came apart into ten thousand pieces.' },
    ],
  },

  {
    id: 'medals',
    title: 'Medals',
    minDuration: 30,
    tail: 6.0,
    lines: [
      { at: 2.0, speaker: 'narrator', text: 'They gave out medals in a hall of white brick, and for one bright afternoon the galaxy belonged to the people who had saved it.' },
      { gap: 0.8, speaker: 'narrator', text: 'Every last one of them built from two by four bricks, and a little bit of hope.' },
    ],
  },
];

/** Text shown in the opening crawl, paragraph by paragraph. */
export const CRAWL_TEXT = [
  'It is a time of rebellion. A scattered alliance of worlds has struck the first blow against the EMPIRE that rules the stars.',
  'In the confusion of that battle, rebel agents seized the plans for the Emperor\u2019s newest weapon: a battle station the size of a moon, built to break planets whole.',
  'Hunted across the dark, Princess Leia runs for home with the stolen plans, and with the last hope of a galaxy in chains....',
];

export const CRAWL_HEADING = 'EPISODE I\nTHE STOLEN PLANS';
