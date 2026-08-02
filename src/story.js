/*
 * The script.
 *
 * Pure data, no imports — tools/vo.mjs reads this file in Node to synthesize the
 * narration, and the film imports it in the browser to schedule playback and
 * captions. Every line's `id` is the filename of its rendered audio.
 *
 * The story is our own telling of the opening of the Rebellion. It follows the
 * familiar beats but the words are written for this film.
 */

export const VOICES = {
  narrator: {
    model: 'en_GB-alan-medium',
    lengthScale: 1.10,
    label: 'NARRATOR',
    // A little room, and a gentle low shelf to sit it under the score.
    filter: 'highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=8:release=180,aecho=0.8:0.85:38:0.16,alimiter=limit=0.93',
  },
  leia: {
    model: 'en_GB-jenny_dioco-medium',
    lengthScale: 1.0,
    label: 'LEIA',
    filter: 'highpass=f=110,acompressor=threshold=-18dB:ratio=3:attack=6:release=140,aecho=0.8:0.8:22:0.10,alimiter=limit=0.93',
  },
  vader: {
    model: 'en_US-ryan-high',
    lengthScale: 1.30,
    label: 'VADER',
    // Drop the pitch a fifth, restore the tempo, then squeeze it through a
    // helmet: band-limited, compressed hard, with a short metallic tail.
    filter: 'asetrate=22050*0.74,aresample=22050,atempo=1.3514,'
      + 'highpass=f=90,lowpass=f=3400,'
      + 'acompressor=threshold=-24dB:ratio=6:attack=4:release=120,'
      + 'aecho=0.85:0.75:26|48:0.22|0.12,alimiter=limit=0.92',
  },
  threepio: {
    model: 'en_GB-alan-medium',
    lengthScale: 0.94,
    label: 'C-3PO',
    // Up a little, thin and reedy, with a faint servo shimmer.
    filter: 'asetrate=22050*1.14,aresample=22050,atempo=0.8772,'
      + 'highpass=f=260,lowpass=f=6200,'
      + 'chorus=0.6:0.9:40:0.35:0.28:2,alimiter=limit=0.93',
  },
  luke: {
    model: 'en_US-lessac-high',
    lengthScale: 0.98,
    label: 'LUKE',
    filter: 'highpass=f=110,acompressor=threshold=-18dB:ratio=3:attack=6:release=140,alimiter=limit=0.93',
  },
  ben: {
    model: 'en_GB-northern_english_male-medium',
    lengthScale: 1.16,
    label: 'BEN',
    // A voice remembered rather than heard: distant, washed, ethereal.
    filter: 'asetrate=22050*0.94,aresample=22050,atempo=1.0638,'
      + 'highpass=f=120,lowpass=f=4200,aecho=0.9:0.9:120|240:0.4|0.25,alimiter=limit=0.9',
  },
  trooper: {
    model: 'en_US-ryan-high',
    lengthScale: 0.96,
    label: 'TROOPER',
    // Comlink: band-limited, crunched, a touch of grit.
    filter: 'highpass=f=520,lowpass=f=2900,acrusher=level_in=1:level_out=1:bits=9:mode=log:aa=1,'
      + 'acompressor=threshold=-20dB:ratio=8:attack=2:release=60,alimiter=limit=0.9',
  },
  officer: {
    model: 'en_GB-northern_english_male-medium',
    lengthScale: 1.0,
    label: 'OFFICER',
    filter: 'highpass=f=100,acompressor=threshold=-18dB:ratio=3:attack=6:release=140,alimiter=limit=0.93',
  },
  rebel: {
    model: 'en_US-ryan-high',
    lengthScale: 0.94,
    label: 'REBEL',
    filter: 'highpass=f=120,acompressor=threshold=-18dB:ratio=4:attack=4:release=100,alimiter=limit=0.92',
  },
};

/** The crawl text, rendered to SVG and flown into the distance. */
export const CRAWL = {
  episode: 'Episode IV',
  title: 'A NEW HOPE',
  paragraphs: [
    'It is a time of rebellion. From a hidden base among the outer stars, '
    + 'a ragged fleet has struck the first real blow against the Galactic Empire.',

    'In the confusion of that battle, rebel agents seized the plans to the '
    + "Empire's terrible new battle station — a moon-sized fortress with power "
    + 'enough to shatter a world.',

    'Now, hunted across the galaxy, Princess Leia runs for home with the stolen '
    + 'plans hidden aboard her ship, and with them the last hope of freedom '
    + 'that remains....',
  ],
};

/**
 * Every spoken line. `id` is the audio filename; `voice` selects the synthesis
 * and processing chain; `caption` is what the subtitle plate shows (defaults to
 * the spoken text).
 */
export const LINES = [
  // --- titles -------------------------------------------------------------
  { id: 'n01', voice: 'narrator', text: 'A long time ago in a galaxy far, far away....' },

  { id: 'c01', voice: 'narrator', text: 'It is a time of rebellion. From a hidden base among the outer stars, a ragged fleet has struck the first real blow against the Galactic Empire.' },
  { id: 'c02', voice: 'narrator', text: "In the confusion of that battle, rebel agents seized the plans to the Empire's terrible new battle station. A moon-sized fortress, with power enough to shatter a world." },
  { id: 'c03', voice: 'narrator', text: 'Now, hunted across the galaxy, Princess Leia runs for home with the stolen plans hidden aboard her ship. And with them, the last hope of freedom that remains.' },

  // --- the chase ----------------------------------------------------------
  { id: 'n02', voice: 'narrator', text: 'Above the desert world of Tatooine, the chase came to an end.' },
  { id: 'n03', voice: 'narrator', text: 'They had run out of sky.' },
  { id: 'o01', voice: 'officer', text: 'Tractor beam engaged. Prepare a boarding party.' },

  // --- boarding -----------------------------------------------------------
  { id: 'n04', voice: 'narrator', text: 'They held the corridor for eleven seconds.' },
  { id: 'r01', voice: 'rebel', text: 'Hold the line! Hold it!' },
  { id: 't01', voice: 'trooper', text: 'Move in. Take the ship.' },
  { id: 'v01', voice: 'vader', text: 'The plans were transmitted to this ship. Find them.' },
  { id: 'v02', voice: 'vader', text: 'Tear this vessel apart, piece by piece.' },

  // --- the droids ---------------------------------------------------------
  { id: 'n05', voice: 'narrator', text: 'While the Empire searched the upper decks, the princess found the only couriers left to her.' },
  { id: 'l01', voice: 'leia', text: 'Take this. Get it off the ship. Everything depends on you now.' },
  { id: 'p01', voice: 'threepio', text: 'Oh, this is madness! Absolute madness!' },
  { id: 'p02', voice: 'threepio', text: 'Wait! Where are you going? We are certainly not authorised to leave!' },
  { id: 'n06', voice: 'narrator', text: 'One escape pod, one little astromech, and the whole future of the galaxy rattling around inside him.' },

  // --- tatooine -----------------------------------------------------------
  { id: 'n07', voice: 'narrator', text: 'They came down in the dune sea, under two suns and no shade at all.' },
  { id: 'p03', voice: 'threepio', text: 'We are going to be melted down. I just know it.' },
  { id: 'n08', voice: 'narrator', text: 'And so the fate of a galaxy went walking across the sand, arguing all the way.' },

  // --- the battle ---------------------------------------------------------
  { id: 'n09', voice: 'narrator', text: 'The plans reached the Rebellion. The Rebellion found one weakness. A thermal exhaust port, two metres wide.' },
  { id: 'k01', voice: 'luke', text: "I'm going in. Cover me." },
  { id: 'b01', voice: 'ben', text: 'Let go. Trust yourself.' },
  { id: 'k02', voice: 'luke', text: "That's it. Torpedoes away!" },
  { id: 'n10', voice: 'narrator', text: 'Two metres wide. And that was enough.' },

  // --- finale -------------------------------------------------------------
  { id: 'n11', voice: 'narrator', text: 'A galaxy far, far away. Built, brick by brick, out of nothing but code.' },
];

export const BY_ID = Object.fromEntries(LINES.map((l) => [l.id, l]));

export function lineText(id) {
  const l = BY_ID[id];
  return l ? (l.caption || l.text) : '';
}

export function lineSpeaker(id) {
  const l = BY_ID[id];
  if (!l) return '';
  return l.voice === 'narrator' ? '' : (VOICES[l.voice]?.label || '');
}
