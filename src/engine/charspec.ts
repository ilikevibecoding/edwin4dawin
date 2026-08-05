/** Shared character description types. */

export type HairStyle = 'short' | 'sidepart' | 'buzz' | 'bald' | 'bob' | 'long' | 'ponytail' | 'braid';

export type HairSpec = {
  style: HairStyle;
  color?: number;
  /** 0 = matte, 1 = wet/gel. */
  gloss?: number;
  greying?: number;
};

export type OutfitKind =
  | 'androidSuit'     // grey/black android uniform with lit armband
  | 'detective'       // shirt, tie, blazer
  | 'trenchcoat'
  | 'hoodie'
  | 'maidUniform'     // household android
  | 'labcoat'
  | 'tshirt'
  | 'winterCoat'
  | 'uniform'         // police
  | 'dress';

export type OutfitSpec = {
  kind: OutfitKind;
  primary?: number;
  secondary?: number;
  accent?: number;
  /** Show the android identity band on the sleeve. */
  armband?: boolean;
  tie?: number;
  wet?: number;
};

export type AndroidSpec = {
  led: boolean;
  ledColor?: number;
  model?: string;
  serial?: string;
  /** Blue thirium bleed on damage. */
  damaged?: number;
};

export type FaceSpec = {
  /** -1 narrow … 1 wide */
  jaw?: number;
  cheek?: number;
  browHeavy?: number;
  noseLength?: number;
  noseWidth?: number;
  lipFull?: number;
  eyeSize?: number;
  eyeSpacing?: number;
  chin?: number;
  age?: number;
  eyeColor?: number;
  stubble?: number;
};

export type CharacterSpec = {
  id: string;
  name: string;
  /** Metres. */
  height?: number;
  /** 0 slim … 1 heavy-set */
  build?: number;
  female?: boolean;
  skinTone?: [number, number, number];
  hair?: HairSpec;
  face?: FaceSpec;
  outfit: OutfitSpec;
  android?: AndroidSpec;
  /** Hand pose baked at build time. */
  hands?: 'relaxed' | 'grip' | 'open' | 'fist';
  seed?: number;
};

export const SKIN_TONES: Record<string, [number, number, number]> = {
  porcelain: [0.72, 0.56, 0.5],
  fair: [0.66, 0.48, 0.41],
  light: [0.58, 0.42, 0.34],
  olive: [0.5, 0.36, 0.27],
  tan: [0.44, 0.3, 0.22],
  brown: [0.32, 0.21, 0.15],
  deep: [0.21, 0.14, 0.1],
};
