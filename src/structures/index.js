// Registry of the lazy world structures (everything that is not plain terrain and not the western town's dense
// overlay): Coruscant, the Death Star, the hyperlane and its stations, ... Each module exports
// `register(gen, game)` and calls `gen.addStructure({ name, x0, z0, x1, z1, fill(chunk, gen) })` for its pieces.
// Builders: add ONE import + ONE line to REGISTRARS for your module; keep everything else in your own files.
const REGISTRARS = [
  // (module) => module.register
];

export async function registerAllStructures(gen, game) {
  for (const reg of REGISTRARS) {
    try { await reg(gen, game); } catch (e) { console.error('structure registration failed', e); }
  }
}
