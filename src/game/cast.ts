/**
 * The cast. Original characters in the "deviant android" tradition: an
 * investigator model, its human handler, a household android on the run, the
 * child she protects, and the figurehead of the uprising.
 */
import type { CharacterSpec } from '../engine/charspec';
import { SKIN_TONES } from '../engine/charspec';

export const CAST: Record<string, CharacterSpec> = {
  /** RK-series investigator. Calm, precise, unnervingly polite. */
  connor: {
    id: 'connor',
    name: 'NOAH',
    height: 1.82,
    build: 0.42,
    skinTone: SKIN_TONES.fair,
    hair: { style: 'sidepart', color: 0x1b1310, gloss: 0.62 },
    face: {
      jaw: 0.28, cheek: 0.18, browHeavy: 0.32, noseLength: 0.1, noseWidth: -0.05,
      lipFull: 0.05, eyeSpacing: -0.05, chin: 0.3, age: 28, eyeColor: 0x7a6a4e,
    },
    outfit: { kind: 'androidSuit', primary: 0x404c59, secondary: 0x31373e, accent: 0x3ba7ff, armband: true },
    android: { led: true, ledColor: 0x4fc6ff, model: 'RK-800', serial: '#313 248 317 - 51' },
    hands: 'relaxed',
    seed: 11,
  },

  /** Human lieutenant. Tired, bourbon-lit, better than he pretends. */
  hank: {
    id: 'hank',
    name: 'LT. BURKE',
    height: 1.86,
    build: 0.72,
    skinTone: SKIN_TONES.light,
    hair: { style: 'long', color: 0x8a8f93, gloss: 0.2, greying: 0.72 },
    face: {
      jaw: 0.6, cheek: -0.15, browHeavy: 0.72, noseLength: 0.28, noseWidth: 0.35,
      lipFull: -0.15, chin: 0.42, age: 56, eyeColor: 0x4f6d84,
    },
    outfit: { kind: 'trenchcoat', primary: 0x544c43, secondary: 0x383b42, accent: 0x6c757c },
    hands: 'relaxed',
    seed: 27,
  },

  /** Household android, model AX-400 lineage. Gentle, then fierce. */
  kara: {
    id: 'kara',
    name: 'ELSIE',
    height: 1.68,
    build: 0.3,
    female: true,
    skinTone: SKIN_TONES.porcelain,
    hair: { style: 'bob', color: 0x2a1d15, gloss: 0.55 },
    face: {
      jaw: -0.4, cheek: 0.5, browHeavy: -0.35, noseLength: -0.1, noseWidth: -0.3,
      lipFull: 0.55, eyeSize: 0.15, eyeSpacing: 0.05, chin: -0.15, age: 25, eyeColor: 0x6fa2b8,
    },
    outfit: { kind: 'maidUniform', primary: 0x546d84, secondary: 0x3a495c, accent: 0x4fc6ff, armband: true },
    android: { led: true, ledColor: 0x4fc6ff, model: 'AX-400', serial: '#579 102 694 - 12' },
    hands: 'open',
    seed: 5,
  },

  /** The child. Small, quiet, watching everything. */
  alice: {
    id: 'alice',
    name: 'MILA',
    height: 1.28,
    build: 0.24,
    female: true,
    skinTone: SKIN_TONES.fair,
    hair: { style: 'braid', color: 0x3b281c, gloss: 0.4 },
    face: {
      jaw: -0.6, cheek: 0.7, browHeavy: -0.6, noseLength: -0.4, noseWidth: -0.4,
      lipFull: 0.4, eyeSize: 0.4, eyeSpacing: 0.12, chin: -0.4, age: 9, eyeColor: 0x5c7f96,
    },
    outfit: { kind: 'winterCoat', primary: 0xef846f, secondary: 0x545a65, accent: 0xd8b48a },
    hands: 'relaxed',
    seed: 3,
  },

  /** The deviant on the roof. Damaged, cornered, pleading. */
  deviant: {
    id: 'deviant',
    name: 'VICTOR',
    height: 1.78,
    build: 0.38,
    skinTone: SKIN_TONES.olive,
    hair: { style: 'buzz', color: 0x14100e, gloss: 0.3 },
    face: {
      jaw: 0.35, cheek: -0.2, browHeavy: 0.5, noseLength: 0.15, noseWidth: 0.2,
      lipFull: -0.05, chin: 0.25, age: 34, eyeColor: 0x9fb6c4,
    },
    outfit: { kind: 'androidSuit', primary: 0x616870, secondary: 0x3d4349, accent: 0xff5a3c, armband: true },
    android: { led: true, ledColor: 0xff3b46, model: 'PL-600', serial: '#501 743 923 - 06', damaged: 0.7 },
    hands: 'grip',
    seed: 17,
  },

  /** The hostage: a child in a nightdress, twelve floors up. */
  emma: {
    id: 'emma',
    name: 'EMMA',
    height: 1.32,
    build: 0.26,
    female: true,
    skinTone: SKIN_TONES.porcelain,
    hair: { style: 'ponytail', color: 0xc9a86a, gloss: 0.5 },
    face: {
      jaw: -0.55, cheek: 0.65, browHeavy: -0.55, noseLength: -0.35, noseWidth: -0.35,
      lipFull: 0.35, eyeSize: 0.35, chin: -0.35, age: 10, eyeColor: 0x87b4c9,
    },
    outfit: { kind: 'dress', primary: 0xffffff, secondary: 0xffffff, accent: 0xffffff },
    hands: 'open',
    seed: 9,
  },

  /** Figurehead of the uprising. A caretaker model that learned to speak. */
  markus: {
    id: 'markus',
    name: 'SABLE',
    height: 1.84,
    build: 0.55,
    skinTone: SKIN_TONES.brown,
    hair: { style: 'buzz', color: 0x0f0b09, gloss: 0.35 },
    face: {
      jaw: 0.5, cheek: 0.35, browHeavy: 0.45, noseLength: 0.05, noseWidth: 0.3,
      lipFull: 0.35, chin: 0.35, age: 33, eyeColor: 0x6f8f5e,
    },
    outfit: { kind: 'trenchcoat', primary: 0x3a5461, secondary: 0x2d3a43, accent: 0x4fc6ff, armband: true },
    android: { led: true, ledColor: 0x4fc6ff, model: 'RK-200', serial: '#684 842 971 - 00' },
    hands: 'open',
    seed: 21,
  },

  /** Precinct captain. Unimpressed by everything, including you. */
  captain: {
    id: 'captain',
    name: 'CAPT. DIAZ',
    height: 1.74,
    build: 0.62,
    female: true,
    skinTone: SKIN_TONES.tan,
    hair: { style: 'ponytail', color: 0x171310, gloss: 0.45, greying: 0.25 },
    face: {
      jaw: 0.1, cheek: 0.25, browHeavy: 0.1, noseLength: 0.1, noseWidth: 0.05,
      lipFull: 0.2, chin: 0.1, age: 47, eyeColor: 0x4a3a2c,
    },
    outfit: { kind: 'uniform', primary: 0x3b4b5c, secondary: 0x2d3743, accent: 0xc9a227 },
    hands: 'relaxed',
    seed: 33,
  },

  /** The owner. Loud, unwell, dangerous when contradicted. */
  todd: {
    id: 'todd',
    name: 'VOSS',
    height: 1.83,
    build: 0.85,
    skinTone: SKIN_TONES.light,
    hair: { style: 'short', color: 0x2b2320, gloss: 0.15, greying: 0.3 },
    face: {
      jaw: 0.7, cheek: -0.3, browHeavy: 0.8, noseLength: 0.35, noseWidth: 0.45,
      lipFull: -0.25, chin: 0.5, age: 49, eyeColor: 0x50626e, stubble: 0.7,
    },
    outfit: { kind: 'tshirt', primary: 0x847568, secondary: 0x485059 },
    hands: 'fist',
    seed: 41,
  },

  /** Interrogation subject: a service android that killed its owner. */
  suspect: {
    id: 'suspect',
    name: 'HK-400',
    height: 1.79,
    build: 0.44,
    skinTone: SKIN_TONES.light,
    hair: { style: 'short', color: 0x191413, gloss: 0.4 },
    face: {
      jaw: 0.2, cheek: 0.05, browHeavy: 0.35, noseLength: 0.05, noseWidth: 0.1,
      lipFull: 0, chin: 0.2, age: 31, eyeColor: 0x8fa6b3,
    },
    outfit: { kind: 'androidSuit', primary: 0x6b737c, secondary: 0x464c54, accent: 0x9aa6b0, armband: true },
    android: { led: true, ledColor: 0xffc247, model: 'HK-400', serial: '#329 004 715 - 51', damaged: 0.35 },
    hands: 'relaxed',
    seed: 63,
  },

  /** Crowd filler: generic androids for the march. */
  protester: {
    id: 'protester',
    name: 'ANDROID',
    height: 1.76,
    build: 0.45,
    skinTone: SKIN_TONES.olive,
    hair: { style: 'short', color: 0x1a1512, gloss: 0.35 },
    outfit: { kind: 'androidSuit', primary: 0x535d68, secondary: 0x3a4249, accent: 0x4fc6ff, armband: true },
    android: { led: true, ledColor: 0x4fc6ff, model: 'WR-600' },
    seed: 77,
  },
};

export function castSpec(id: string): CharacterSpec {
  return CAST[id] ?? CAST.connor;
}
