// Environments / sets: corridors, dunes, hangars, trench walls.
import { register } from '../registry.js';

import { buildStarfield } from './starfield.js';
import { buildDesertPlanet } from './desertplanet.js';
import { buildTwinSuns } from './twinsuns.js';

register('starfield', (o) => buildStarfield(o), {
  notes: 'deep-space backdrop: ~3200 seeded stars + painted nebula sphere; userData.setStreaks(0..1) for hyperspace',
});

register('desertplanet', (o) => buildDesertPlanet(o), {
  notes: 'banded desert world, r=600 by default, north pole at y=0 so it fills the lower frame',
});

register('twinsuns', (o) => buildTwinSuns(o), {
  notes: 'two additive suns over a horizon; userData.setHeight(0..1)',
});
