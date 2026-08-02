// Environments / sets: corridors, dunes, hangars, trench walls.
import { register } from '../registry.js';
import { triangleCount } from './common.js';

import { buildStarfield } from './starfield.js';
import { buildDesertPlanet } from './desertplanet.js';
import { buildTwinSuns } from './twinsuns.js';
import { buildCorridor, buildCorridorSection } from './corridor.js';
import { buildDunes } from './dunes.js';

/*
 * Sets are big, so every id goes through here: pass tris=1 (e.g.
 * `npm run shot -- --m=trench --tris=1`) and the factory reports its own
 * triangle and draw-call cost, which the renderer's own counters cannot
 * separate from the shadow pass.
 */
function reg(id, build, meta) {
  register(id, (opts = {}) => {
    const g = build(opts);
    if (opts.tris && opts.tris !== '0') {
      let meshes = 0;
      g.traverse((o) => { if (o.isMesh) meshes++; });
      console.warn(`[set ${id}] ${triangleCount(g)} tris, ${meshes} meshes`);
    }
    return g;
  }, meta);
}

reg('starfield', (o) => buildStarfield(o), {
  notes: 'deep-space backdrop: 9000 seeded stars + painted nebula sphere; userData.setStreaks(0..1) for hyperspace',
});

reg('desertplanet', (o) => buildDesertPlanet(o), {
  notes: 'banded desert world, r=600 by default, north pole at y=0 so it fills the lower frame',
});

reg('twinsuns', (o) => buildTwinSuns(o), {
  notes: 'two additive suns over a horizon; userData.setHeight(0..1)',
});

reg('corridor_section', (o) => buildCorridorSection(o), {
  notes: 'one 15-stud rebel corvette hallway module, 11.4 wide x 11.4 tall, tiles along Z',
});

reg('corridor', (o) => buildCorridor(o), {
  notes: '8 chained sections = 120 studs of hallway with blast doors; nodes doorFar/doorNear, userData.setDoor/blowDoor',
});

reg('dunes', (o) => buildDunes(o), {
  notes: 'Tatooine dune sea, 200x200 studs of plate-stepped contours + rock outcrops, bones and scatter',
});
