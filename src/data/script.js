// The screenplay. This single file feeds three things: the opening crawl
// geometry, the subtitle track, and the offline text-to-speech pipeline
// (tools/tts.py reads it via tools/export-script.mjs), so the words on screen,
// the words in the voice track and the words in the timeline can never drift.
//
// The story is an original one told in the register of a 1977 space opera:
// familiar hardware, unfamiliar names.

export const TITLE = {
  main: ['STAR', 'WARS'],
  sub: 'THE KYBER STAR',
};

export const OPENING_CARD = 'A long time ago in a galaxy far, far away....';

export const CRAWL = {
  title: 'THE KYBER STAR',
  paragraphs: [
    'It is a dark hour for the galaxy. The IMPERIAL FLEET has burned the last free worlds of the Outer Rim, and a new terror waits in the void beyond them: the KYBER STAR, a battle station with the power to end a planet in a single stroke.',
    'Fleeing the fall of Kessendra, a rebel courier runs for the desert world of TESSARU carrying the station\u2019s stolen plans, hunted by the Emperor\u2019s enforcer, DARTH VASHEK.',
    'Aboard the crippled corvette a single astromech droid holds the galaxy\u2019s last hope in its memory core, and the Empire is only minutes behind\u2026.',
  ],
};

/**
 * Voice cast. `voice` names are piper models; `pitch`/`tempo`/`fx` are applied
 * afterwards by ffmpeg so each character sounds like a different person (and so
 * the Dark Lord sounds like he is speaking from inside a bucket).
 */
export const CAST = {
  narrator: { name: 'Narrator', voice: 'en_US-ryan-high', length: 1.04, pitch: 0.94, fx: 'narrator', color: '#e8e2d4' },
  vashek: { name: 'DARTH VASHEK', voice: 'en_US-ryan-high', length: 1.16, pitch: 0.79, fx: 'vader', color: '#ff5a4a' },
  obren: { name: 'OBREN TAL', voice: 'en_GB-alan-medium', length: 1.1, pitch: 0.95, fx: 'room', color: '#8fd7ff' },
  rhea: { name: 'RHEA SUNDER', voice: 'en_US-amy-medium', length: 1.0, pitch: 1.02, fx: 'dry', color: '#ffd06b' },
  rheaComm: { name: 'RHEA SUNDER', voice: 'en_US-amy-medium', length: 1.0, pitch: 1.02, fx: 'comm', color: '#ffd06b' },
  officer: { name: 'IMPERIAL OFFICER', voice: 'en_GB-northern_english_male-medium', length: 1.0, pitch: 0.96, fx: 'comm', color: '#9fb6c9' },
  droid: { name: 'T3-KO', voice: 'en_GB-alan-medium', length: 0.95, pitch: 1.16, fx: 'droid', color: '#ffcf5a' },
  dax: { name: 'DAX CORR', voice: 'en_US-joe-medium', length: 0.98, pitch: 0.97, fx: 'comm', color: '#c8b48a' },
  gold: { name: 'GOLD LEADER', voice: 'en_GB-northern_english_male-medium', length: 0.98, pitch: 0.9, fx: 'comm', color: '#bdd6a0' },
};

/**
 * Every spoken line in the film, keyed by id. Sequences reference these ids in
 * their cue lists; the id is also the audio filename.
 */
export const LINES = {
  // --- Act I: the chase ----------------------------------------------------
  n1: { who: 'narrator', text: 'Above the desert world of Tessaru, a rebel courier was running out of sky.' },
  n2: { who: 'narrator', text: 'Behind it came the hammer of the Empire. A star destroyer. A kilometre and a half of grey iron and green fire.' },
  o1: { who: 'officer', text: 'Tractor beam locked. Bring her into the ventral bay.' },
  n3: { who: 'narrator', text: 'The corvette\u2019s engines died, and the rest was arithmetic.' },

  // --- Act I: boarding -----------------------------------------------------
  n4: { who: 'narrator', text: 'They cut through the hull at deck six, and the corridor filled with white armour.' },
  v1: { who: 'vashek', text: 'The plans were transmitted to this ship. Where are they?' },
  o2: { who: 'officer', text: 'We have stripped every memory core aboard, my lord. There is nothing.' },
  v2: { who: 'vashek', text: 'Then something has already left.' },
  n5: { who: 'narrator', text: 'Something had.' },

  // --- Act I: the pod ------------------------------------------------------
  n6: { who: 'narrator', text: 'One escape pod fell away from the corvette, cold and dark and beneath notice.' },
  o3: { who: 'officer', text: 'Hold your fire. No life forms aboard. Let it go.' },
  n7: { who: 'narrator', text: 'Inside were two droids and the blueprint of a weapon that could unmake a world.' },

  // --- Act II: the desert --------------------------------------------------
  n8: { who: 'narrator', text: 'Tessaru. Two suns, nine thousand kilometres of open sand, and nothing on it that wished to be found.' },
  d1: { who: 'droid', text: 'We have been walking for six hours. Statistically speaking, we are doomed.' },
  d2: { who: 'droid', text: 'Oh, certainly. Easy for you to say. You have treads.' },
  n9: { who: 'narrator', text: 'The scrap haulers found them before the Empire did. That was luck, and luck is a thing that runs out.' },

  // --- Act II: binary sunset ----------------------------------------------
  n10: { who: 'narrator', text: 'And out at the edge of the dune sea there was a farm girl called Rhea Sunder, who had watched two suns go down every evening of her life, and wanted very badly to be somewhere else.' },
  ob1: { who: 'obren', text: 'That droid came a long way to find me. And you, I think, have been looking for a reason.' },
  r1: { who: 'rhea', text: 'I have been looking at those suns since I could walk.' },
  ob2: { who: 'obren', text: 'Then stop looking at them. Fly past them.' },
  n11: { who: 'narrator', text: 'The Empire reached the farm the following morning. There was nothing left of it to argue with.' },

  // --- Act II: departure ---------------------------------------------------
  n12: { who: 'narrator', text: 'They left at first light in a freighter that had no business flying, with the plans, the droids, and an old man who talked to the air.' },
  r2: { who: 'rhea', text: 'Coordinates locked. Hold on to something.' },
  n13: { who: 'narrator', text: 'And the stars stretched, and the desert finally let her go.' },

  // --- Act III: the duel ---------------------------------------------------
  n14: { who: 'narrator', text: 'The Kyber Star swallowed them whole. A moon that was not a moon, with a hangar deep enough to park a city in.' },
  v3: { who: 'vashek', text: 'You should have stayed buried, old man.' },
  ob3: { who: 'obren', text: 'I was never very good at being dead.' },
  v4: { who: 'vashek', text: 'Your kind is finished. The galaxy belongs to order now.' },
  ob4: { who: 'obren', text: 'Order. Is that what you are calling the smoke?' },
  n15: { who: 'narrator', text: 'The old man lifted his blade, and let it fall. The robe hit the deck empty.' },
  r3: { who: 'rhea', text: 'No!' },

  // --- Act III: the trench run --------------------------------------------
  n16: { who: 'narrator', text: 'Thirty pilots flew out to meet the station. The stolen plans gave them exactly one way in.' },
  n17: { who: 'narrator', text: 'A two metre thermal port, at the bottom of a trench nine hundred metres deep, defended by everything the Empire owned.' },
  g1: { who: 'gold', text: 'All wings report in. Lock S-foils in attack position.' },
  g2: { who: 'gold', text: 'Heavy fire, sector four. They are coming down on us!' },
  v5: { who: 'vashek', text: 'I have them. Stay on the leader.' },
  r4: { who: 'rheaComm', text: 'Switching off the targeting computer.' },
  g3: { who: 'gold', text: 'Rhea, you have got one on your tail. Break off, break off!' },
  dx1: { who: 'dax', text: 'Sorry we are late! Go on, kid. The trench is yours.' },
  r5: { who: 'rheaComm', text: 'Torpedoes away.' },

  // --- Finale --------------------------------------------------------------
  n18: { who: 'narrator', text: 'The port was two metres wide. She did not miss.' },
  n19: { who: 'narrator', text: 'A farm girl who had never once left her own planet had just cost the Emperor a moon.' },
  n20: { who: 'narrator', text: 'The galaxy is a very large place. But hope only ever has to fit through a two metre hole.' },
};

export const END_CARDS = [
  { lines: ['STAR WARS', 'THE KYBER STAR'], hold: 4.2 },
  {
    lines: [
      'every ship, planet, explosion and note of music in this film',
      'was generated procedurally in three.js \u2014 no models, no textures,',
      'no audio files were loaded. it is all just code.',
    ],
    hold: 6.5,
    small: true,
  },
];

/** Convenience: an ordered array with ids attached, used by the TTS exporter. */
export function allLines() {
  return Object.entries(LINES).map(([id, l]) => ({ id, ...l, ...CAST[l.who] }));
}
