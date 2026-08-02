/**
 * Character factory and cast registry.
 *
 * A single place that maps a kind to a constructor, so the timeline, the
 * Explore-mode inspector and the asset preview page all agree on names,
 * descriptions and colours.
 */

import type { Figure } from './figure';
import type { QualitySettings } from '../core/quality';
import { RebelTrooper, Stormtrooper, DarkLord, Princess, ImperialOfficer } from './humans';
import { AstroDroid, ProtocolDroid } from './droids';

export const CHARACTER_KINDS = [
  'rebel',
  'stormtrooper',
  'officer',
  'vader',
  'leia',
  'r2',
  'c3po',
] as const;

export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export interface CharacterProfile {
  kind: CharacterKind;
  /** In-world display name used by the inspector. */
  title: string;
  role: string;
  blurb: string;
  accent: string;
}

export const CHARACTER_PROFILES: Record<CharacterKind, CharacterProfile> = {
  rebel: {
    kind: 'rebel',
    title: 'Rebel fleet trooper',
    role: 'Consular ship security',
    blurb:
      'Ship security, not front-line infantry. A padded flak vest, an open helmet and a carbine intended for pirates, not an armoured boarding party. They hold the corridor anyway.',
    accent: '#6d5a44',
  },
  stormtrooper: {
    kind: 'stormtrooper',
    title: 'Imperial stormtrooper',
    role: 'Boarding party',
    blurb:
      'Sealed white armour over a black bodyglove. Fights in disciplined pairs, advances behind suppressing fire, and never breaks formation without an order.',
    accent: '#eceff2',
  },
  officer: {
    kind: 'officer',
    title: 'Imperial officer',
    role: 'Boarding command',
    blurb:
      'Directs the search from behind the assault line. Carries a sidearm but expects never to draw it.',
    accent: '#4b4f52',
  },
  vader: {
    kind: 'vader',
    title: 'The Dark Lord',
    role: 'Imperial enforcer',
    blurb:
      'Two metres of black armour and a life-support system you can hear from the far end of a corridor. Arrives only after the shooting stops, which is itself a kind of statement.',
    accent: '#131417',
  },
  leia: {
    kind: 'leia',
    title: 'The Princess',
    role: 'Envoy of the Rebel Alliance',
    blurb:
      'A senator on a diplomatic mission that is not a diplomatic mission. She is carrying the technical readout of a weapon that can end a world, and she knows exactly what it is worth.',
    accent: '#f3f1ec',
  },
  r2: {
    kind: 'r2',
    title: 'Astromech unit',
    role: 'Courier',
    blurb:
      'A barrel of tools, sensors and stubbornness. Given the plans and a heading, it will simply go — no argument, no hesitation, no plan B required.',
    accent: '#3f7fc4',
  },
  c3po: {
    kind: 'c3po',
    title: 'Protocol droid',
    role: 'Reluctant companion',
    blurb:
      'Fluent in a great many forms of communication, none of which are useful during a boarding action. Follows the astromech because the alternative is standing still.',
    accent: '#d9a83c',
  },
};

export function makeCharacter(kind: CharacterKind, _quality: QualitySettings, seed?: string): Figure {
  const opts = { seed: seed ?? `char-${kind}` };
  switch (kind) {
    case 'rebel':
      return new RebelTrooper(opts);
    case 'stormtrooper':
      return new Stormtrooper(opts);
    case 'officer':
      return new ImperialOfficer(opts);
    case 'vader':
      return new DarkLord(opts);
    case 'leia':
      return new Princess(opts);
    case 'r2':
      return new AstroDroid(opts);
    case 'c3po':
      return new ProtocolDroid(opts);
  }
}

export { RebelTrooper, Stormtrooper, DarkLord, Princess, ImperialOfficer, AstroDroid, ProtocolDroid };
