// Registry of the lazy world structures (everything that is not plain terrain and not the western town's dense
// overlay): Coruscant, the Death Star, the hyperlane and its stations, ... Each module exports
// `register(gen, game)` and calls `gen.addStructure({ name, x0, z0, x1, z1, fill(chunk, gen) })` for its pieces.
// Builders: add ONE import + ONE line to REGISTRARS for your module; keep everything else in your own files.
import { register as registerCoruscant } from '../coruscant/city.js';
import { register as registerSpaceport } from '../coruscant/spaceport.js';
import { register as registerDeathStar } from '../deathstar/index.js';

const REGISTRARS = [
  registerCoruscant,
  registerSpaceport,                                                          // Coruscant + frontier spaceports, ship traffic
  registerDeathStar,                                                          // the walkable Death Star in the space region
  async (gen, game) => (await import('./hyperlane.js')).register(gen, game), // hyperlane track, stations, space train
];

export async function registerAllStructures(gen, game) {
  for (const reg of REGISTRARS) {
    try { await reg(gen, game); } catch (e) { console.error('structure registration failed', e); }
  }
}
