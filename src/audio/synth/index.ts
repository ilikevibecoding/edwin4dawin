/**
 * The synthesis toolkit. Everything the sound designers in `../sounds` are
 * allowed to use, and nothing that touches the Web Audio graph — these are pure
 * functions over `Float32Array`s so they run identically in the game, in the
 * offline test harness, and in a plain Node process.
 */
export * from './Signal';
export * from './Filters';
export * from './Noise';
export * from './Envelope';
export * from './Osc';
export * from './Shaper';
export * from './Modal';
export * from './Impulse';
