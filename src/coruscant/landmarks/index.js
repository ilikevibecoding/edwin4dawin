// Registry of Coruscant signature landmarks (docs/rubrics/06_landmarks.md). One module per building under this
// directory, each exporting `LANDMARK = { id, name, span, height, build(bp, lot, ctx) }` where `build` fills a
// Blueprint (src/coruscant/blueprint.js) for the lot and records NPC metadata through the Blueprint API.
// `layout.js` reserves the lots (LANDMARKS there is the placement table, keyed by the same ids); buildings.js asks
// `landmarkFor(lot.family)` first and falls back to its generic landmark builders for ids without a module.
//
// Modules do not import this file (no cycles): add one import line and one list entry per building below.

import { LANDMARK as plaza_monument } from './plaza_monument.js';

const MODULE_LIST = [
  // { LANDMARK } imports go here, e.g.  senate, temple, plaza_monument, ...
  plaza_monument,
];

const MODULES = new Map();
for (const lm of MODULE_LIST) {
  if (!lm || !lm.id || typeof lm.build !== 'function') throw new Error('landmark module needs { id, build }');
  MODULES.set(lm.id, lm);
}

export function landmarkFor(family) { return MODULES.get(family) || null; }
export function landmarkIds() { return [...MODULES.keys()]; }
