/**
 * Aircraft geometry helpers, split by subject under `geometry/`:
 *  - `loft.ts`      sections, arc-length parameterisation, the station-grid loft (fuselage skin, cabin shell,
 *                   window reveals and panes, glare shield, decks, the wing-root hump)
 *  - `wing.ts`      airfoil profiles and lofted wing / tail panels, `weldSmooth`
 *  - `propeller.ts` blade and spinner
 *  - `floats.ts`    float hull stations and the chined hull loft
 *  - `util.ts`      struts, straps, quads, placements, per-vertex surface tagging and the `Batch` merger
 * This barrel keeps `./geometry` imports working.
 */
export * from './geometry/loft';
export * from './geometry/wing';
export * from './geometry/propeller';
export * from './geometry/floats';
export * from './geometry/util';
