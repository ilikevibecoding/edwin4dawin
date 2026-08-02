/**
 * Explore-mode dossiers.
 *
 * Short original descriptions written for this project. They describe the
 * fictional objects as this production imagines them; nothing is quoted from
 * any published source.
 */

export interface ObjectDossier {
  id: string;
  name: string;
  classification: string;
  description: string;
}

export const DOSSIERS: Record<string, ObjectDossier> = {
  'blockade-runner': {
    id: 'blockade-runner',
    name: 'Diplomatic Corvette',
    classification: 'Rebel · 150 m · courier / blockade runner',
    description:
      'A civilian-registry corvette with an over-built engine block and a hammerhead bow. Fast enough '
      + 'to outrun most patrols, thin enough that a single capital-grade turbolaser ends the argument. '
      + 'Her white plating is a diplomatic flag; nobody aboard believes it will help today.',
  },
  'star-destroyer': {
    id: 'star-destroyer',
    name: 'Imperial Destroyer',
    classification: 'Imperial · 1,600 m · line capital ship',
    description:
      'A kilometre and a half of armoured wedge with a command tower stacked at the stern and a hangar '
      + 'trench cut into its belly. It carries more crew than most of the settlements below it. '
      + 'It does not chase; it simply arrives and removes the option of leaving.',
  },
  'escape-pod': {
    id: 'escape-pod',
    name: 'Escape Pod 1-4',
    classification: 'Rebel · 9 m · unarmed lifeboat',
    description:
      'Nine metres of ablative shell, four retro thrusters and a beacon. It has no weapons, no shields '
      + 'and no way to change its mind once launched. Which is exactly why the gunners above will let '
      + 'it go.',
  },
  tatooine: {
    id: 'tatooine',
    name: 'Tatooine',
    classification: 'Outer world · desert · minimal Imperial presence',
    description:
      'Sand seas, salt flats and canyon systems, baked pale by a hard sky. Strategically worthless, '
      + 'which is the whole point: nobody thinks to search a place nobody wants.',
  },
  vader: {
    id: 'vader',
    name: 'The Dark Lord',
    classification: 'Imperial · enforcer',
    description:
      'Two metres of black armour and a respirator that fills whatever room he stands in. He arrives '
      + 'only after the shooting is finished, because the shooting was never his part of the job.',
  },
  leia: {
    id: 'leia',
    name: 'The Princess',
    classification: 'Rebel · senator · courier',
    description:
      'Nineteen years old, travelling under diplomatic cover, carrying the only complete copy of a '
      + 'weapon design worth a hundred worlds. She will be captured in under four minutes and she '
      + 'has already made sure that will not matter.',
  },
  r2: {
    id: 'r2',
    name: 'Astromech Unit',
    classification: 'Rebel · repair and navigation droid',
    description:
      'A metre of stubborn cylinder on three legs. Carries starship schematics, a plasma cutter, an '
      + 'unhelpful opinion about most things, and — as of ninety seconds ago — the plans.',
  },
  threepio: {
    id: 'threepio',
    name: 'Protocol Droid',
    classification: 'Rebel · translation and etiquette droid',
    description:
      'Fluent in an enormous number of communication forms, none of which are useful during a '
      + 'boarding action. Walks with locked knees, worries out loud, and follows the astromech anyway.',
  },
  'blast-door': {
    id: 'blast-door',
    name: 'Frame 9 Blast Door',
    classification: 'Rebel · pressure bulkhead',
    description:
      'Rated to hold vacuum and small-arms fire indefinitely. Rated to hold a boarding charge for '
      + 'roughly twelve seconds.',
  },
  plans: {
    id: 'plans',
    name: 'The Stolen Design',
    classification: 'Imperial · classified · complete structural schematic',
    description:
      'A full volumetric survey of a battle station large enough to be mistaken for a moon: every '
      + 'tower, every corridor, every reactor feed — and one exhaust path nobody thought worth '
      + 'armouring.',
  },
  trooper: {
    id: 'trooper',
    name: 'Imperial Stormtrooper',
    classification: 'Imperial · boarding infantry',
    description:
      'White composite armour, sealed helmet, standard-issue rifle. Trained to advance into a corridor '
      + 'that is already firing at them, and to keep advancing.',
  },
  rebel: {
    id: 'rebel',
    name: 'Rebel Trooper',
    classification: 'Rebel · ship security',
    description:
      'A ship-security detail in fatigues and a padded helmet, holding a corridor against boarders '
      + 'they cannot beat, for exactly as long as somebody further aft needs.',
  },
};

export function dossierFor(id: string): ObjectDossier {
  if (DOSSIERS[id]) return DOSSIERS[id];
  if (id.startsWith('trooper')) return DOSSIERS.trooper;
  if (id.startsWith('rebel')) return DOSSIERS.rebel;
  return {
    id,
    name: id,
    classification: 'Unclassified',
    description: 'No dossier on file.',
  };
}
