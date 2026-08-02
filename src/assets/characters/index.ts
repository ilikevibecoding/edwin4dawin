import type { CharacterRig } from './CharacterRig';
import { DarkLord, Princess, RebelTrooper, ShipOfficer, Stormtrooper } from './Humanoids';
import { Astromech, ProtocolDroid } from './Droids';

export type CharacterKind =
  | 'stormtrooper'
  | 'rebel'
  | 'officer'
  | 'vader'
  | 'leia'
  | 'r2'
  | 'c3po';

export const CHARACTER_KINDS: readonly CharacterKind[] = [
  'rebel',
  'officer',
  'stormtrooper',
  'vader',
  'leia',
  'r2',
  'c3po',
];

export function createCharacter(kind: CharacterKind, seed = 0): CharacterRig {
  switch (kind) {
    case 'stormtrooper':
      return new Stormtrooper(seed);
    case 'rebel':
      return new RebelTrooper(seed);
    case 'officer':
      return new ShipOfficer(seed);
    case 'vader':
      return new DarkLord(seed);
    case 'leia':
      return new Princess(seed);
    case 'r2':
      return new Astromech(seed);
    case 'c3po':
      return new ProtocolDroid(seed);
    default:
      return new RebelTrooper(seed);
  }
}

export { CharacterRig } from './CharacterRig';
export type { CharacterState } from './CharacterRig';
export { DarkLord, Princess, RebelTrooper, ShipOfficer, Stormtrooper } from './Humanoids';
export { Astromech, ProtocolDroid } from './Droids';
