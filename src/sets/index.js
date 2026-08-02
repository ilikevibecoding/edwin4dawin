// Environments / sets: corridors, dunes, hangars, trench walls.
import { register } from '../registry.js';
import { triangleCount } from './common.js';

import { buildStarfield } from './starfield.js';
import { buildDesertPlanet } from './desertplanet.js';
import { buildTwinSuns } from './twinsuns.js';
import { buildCorridor, buildCorridorSection } from './corridor.js';
import { buildDunes } from './dunes.js';
import { buildMoistureFarm } from './moisturefarm.js';
import { buildHermitHut } from './hermithut.js';
import { buildDeathStarSurface } from './deathstar_surface.js';
import { buildTrench, buildTrenchSegment } from './trench.js';
import { buildThroneRoom } from './throneroom.js';
import { buildHangarBay } from './hangarbay.js';

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

reg('moisturefarm', (o) => buildMoistureFarm(o), {
  notes: 'homestead on a 130-stud dune plot: sunken courtyard 13 deep, 3 domes, 4 vaporators; nodes courtyard/hutDoor',
});

reg('hermithut', (o) => buildHermitHut(o), {
  notes: 'stone dome ~26x23 studs with the +Z wall removed for filming; chest, table, window slit, practicals',
});

reg('deathstar_surface', (o) => buildDeathStarSurface(o), {
  notes: '400x400 studs of greebled battle-station deck, periodic on a 10-stud cell so copies tile seamlessly',
});

reg('trench_segment', (o) => buildTrenchSegment(o), {
  notes: 'one 60-stud trench module, 40 wide x 30 deep; pass index= to reseed the greebles',
});

reg('trench', (o) => buildTrench(o), {
  notes: '10 chained segments = 600 studs of trench run; userData.exhaustPort near the -Z end',
});

reg('throneroom', (o) => buildThroneRoom(o), {
  notes: 'medal hall 88 wide x 150 deep x 46 tall, dais and extruded SVG starbird at the -Z end; node dais',
});

reg('hangarbay', (o) => buildHangarBay(o), {
  notes: 'rebel hangar 120x130x44 with an open blast-door mouth at -Z showing sky; nodes mouth/sky',
});
