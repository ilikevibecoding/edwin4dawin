import type { ChapterDef } from './Timeline';

/**
 * The written show.
 *
 * All prose here is original. It deliberately paraphrases the situation of
 * the story rather than quoting any screenplay, crawl or dialogue, and no
 * character is named in the spoken narration.
 */

export const CHAPTERS: ChapterDef[] = [
  {
    index: 0,
    id: 'prologue',
    title: 'Prologue',
    synopsis: 'A war, a weapon, and a stolen file.',
    start: 0,
    end: 42,
  },
  {
    index: 1,
    id: 'tatooine',
    title: 'The Desert World',
    synopsis: 'Arrival above Tatooine.',
    start: 42,
    end: 78,
  },
  {
    index: 2,
    id: 'pursuit',
    title: 'The Pursuit',
    synopsis: 'A corvette runs. Something enormous follows.',
    start: 78,
    end: 168,
  },
  {
    index: 3,
    id: 'capture',
    title: 'Capture',
    synopsis: 'The corvette is disabled and drawn in.',
    start: 168,
    end: 210,
  },
  {
    index: 4,
    id: 'corridor',
    title: 'The Forward Passage',
    synopsis: 'Boarding, and the arrival of the dark lord.',
    start: 210,
    end: 288,
  },
  {
    index: 5,
    id: 'plans',
    title: 'The Plans',
    synopsis: 'A princess hides a weapon inside a droid.',
    start: 288,
    end: 332,
  },
  {
    index: 6,
    id: 'pod',
    title: 'Pod Six',
    synopsis: 'Two droids leave without permission.',
    start: 332,
    end: 382,
  },
  {
    index: 7,
    id: 'epilogue',
    title: 'Epilogue',
    synopsis: 'The secret falls toward the sand.',
    start: 382,
    end: 404,
  },
];

export type Speaker = 'narrator' | 'princess' | 'officer';

export interface NarrationLine {
  id: string;
  chapter: number;
  /** Absolute timeline seconds at which the line begins. */
  start: number;
  /** Fallback duration if no generated audio is available. */
  estimate: number;
  text: string;
  speaker: Speaker;
  /** Label shown above character lines. */
  speakerLabel?: string;
}

/** Roughly 2.55 words per second reads as a calm, measured narrator. */
const WPS = 2.55;
export function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1.6, words / WPS + 0.55);
}

function line(
  id: string,
  chapter: number,
  start: number,
  text: string,
  speaker: Speaker = 'narrator',
  speakerLabel?: string,
): NarrationLine {
  return { id, chapter, start, estimate: estimateDuration(text), text, speaker, speakerLabel };
}

export const NARRATION: NarrationLine[] = [
  // ------------------------------------------------------------ prologue
  line('n01', 0, 4.5, 'A civil war burns across ten thousand worlds.'),
  line(
    'n02',
    0,
    9.5,
    'In secret, the Empire has finished a station the size of a small moon, engineered to end a planet in a single stroke.',
  ),
  line('n03', 0, 19.5, 'Rebel agents died stealing its plans.'),
  line(
    'n04',
    0,
    24.0,
    'What they took now runs ahead of the fleet, aboard one small diplomatic ship, above a desert world at the ragged edge of the map.',
  ),
  line('n05', 0, 34.8, 'Its passenger is a princess. Her cargo is a secret worth a galaxy.'),

  // ------------------------------------------------------------ tatooine
  line(
    'n06',
    1,
    47.0,
    'Tatooine. Two suns, no oceans, and nothing on it that anyone in the Senate would call important.',
  ),
  line('n07', 1, 56.5, 'Which is precisely why the ship came here.'),

  // ------------------------------------------------------------- pursuit
  line('n08', 2, 83.0, 'The corvette runs with her engines held past every safe limit.'),
  line('n09', 2, 89.0, 'She was built to carry treaties, not to survive.'),
  line('n10', 2, 97.5, 'What follows her was built for nothing else.'),
  line(
    'n11',
    2,
    103.0,
    'Sixteen hundred metres of grey iron, closing the distance the way a wall closes a corridor.',
  ),
  line('n12', 2, 118.0, 'Green fire crosses the dark, and takes its time arriving.'),
  line('n13', 2, 130.0, 'The corvette holds her shields. Then she does not.'),
  line('n14', 2, 150.0, 'Her drive stutters, flares, and goes out.'),
  line('n15', 2, 158.0, 'She was never escaping. She was only running.'),

  // ------------------------------------------------------------- capture
  line('n16', 3, 172.0, 'The destroyer takes her the way a hand takes a moth.'),
  line(
    'n17',
    3,
    179.0,
    'A tractor field folds around the smaller ship and draws her up beneath the larger one, into shadow.',
  ),
  line('n18', 3, 190.0, 'Boarding clamps bite through the hull. Somewhere inside, the corridor lights turn red.'),

  // ------------------------------------------------------------ corridor
  line(
    'n19',
    4,
    213.0,
    'A handful of the crew hold the forward passage. They know exactly how this ends. They take their positions anyway.',
  ),
  line(
    'o01',
    4,
    223.2,
    'Forward hatch is sealed. Whatever comes through it, we hold this passage.',
    'officer',
    'Rebel Officer',
  ),
  line('n20', 4, 228.5, 'The door begins to glow white along its seam.'),
  line('n21', 4, 238.0, 'The passage fills with armour.'),
  line('n22', 4, 256.0, 'It is finished in ninety seconds.'),
  line('n23', 4, 266.5, 'And then the sound of the ship changes.'),
  line('n24', 4, 272.0, 'Something steps aboard that does not hurry.'),
  line(
    'n25',
    4,
    277.5,
    'The air in the passage seems to cool, and every soldier in it stands a little straighter.',
  ),

  // --------------------------------------------------------------- plans
  line('n26', 5, 290.0, 'Aft of the fighting, the princess is already moving.'),
  line(
    'n27',
    5,
    295.5,
    'She carries a file that three worlds died to obtain, and perhaps a minute in which to hide it.',
  ),
  line(
    'n28',
    5,
    303.5,
    'The plans unfold above the console: a sphere, a service trench, a focusing dish. A weapon drawn as neatly as a bridge.',
  ),
  line(
    'p01',
    5,
    313.5,
    'Everything they built. Every corridor, every reactor line. Carry it, and do not stop for anyone.',
    'princess',
    'Princess',
  ),
  line(
    'n29',
    5,
    321.0,
    'She gives it to the one courier nobody will think to search: a scuffed astromech with a poor temper and a perfect memory.',
  ),

  // ----------------------------------------------------------------- pod
  line('p02', 6, 333.5, 'Go. Take the aft pod, and go.', 'princess', 'Princess'),
  line('n30', 6, 337.0, 'The astromech goes because it was told to.'),
  line('n31', 6, 341.5, 'The protocol droid goes because the alternative is worse.'),
  line('n32', 6, 350.0, 'Pod six clears the hull on cold gas and nerve.'),
  line(
    'n33',
    6,
    356.0,
    'No transponder. No life signs. Nothing worth a shot from a gun crew with a quota to meet.',
  ),
  line('n34', 6, 367.0, 'It falls toward the desert like a dropped coin.'),

  // ------------------------------------------------------------ epilogue
  line(
    'n35',
    7,
    384.0,
    'Above, the corvette is taken, the passage is searched, and the princess is found.',
  ),
  line(
    'n36',
    7,
    391.5,
    'Below, the most dangerous secret of the war is falling through a hot yellow sky, inside an unarmed droid that nobody thought to stop.',
  ),
];

/** Golden prologue stanzas. Original text; never the film crawl. */
export const PROLOGUE_STANZAS: Array<{ start: number; lines: string[] }> = [
  { start: 3.0, lines: ['A CIVIL WAR BURNS', 'BETWEEN THE STARS'] },
  { start: 10.5, lines: ['THE EMPIRE HAS FORGED', 'A STATION THAT CAN', 'UNMAKE A WORLD'] },
  { start: 19.0, lines: ['ITS PLANS WERE STOLEN', 'AT TERRIBLE COST'] },
  { start: 26.5, lines: ['ONE SMALL SHIP CARRIES THEM', 'TOWARD A DESERT WORLD'] },
  { start: 33.5, lines: ['AND THE EMPIRE', 'IS ALREADY BEHIND HER'] },
];

export const TITLE = 'STARFALL';
export const SUBTITLE = 'Flight of the Diplomat';

/** Original closing card. */
export const EPILOGUE_LINES = [
  'THE FATE OF A GALAXY',
  'NOW TRAVELS INSIDE',
  'AN UNARMED DROID',
];

/** Total spoken word count, checked by the QA harness. */
export function narrationWordCount(): number {
  return NARRATION.reduce((n, l) => n + l.text.trim().split(/\s+/).length, 0);
}
