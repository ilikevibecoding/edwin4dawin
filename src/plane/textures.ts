/**
 * Procedural aircraft textures (canvas-drawn PBR maps), split by subject under `textures/`:
 *  - `common.ts`   canvas helpers (height -> normal, panel lines, per-panel variation, wear, grime), `LIVERY`,
 *                  `CHEAT_LINE`, the `FuselageLayout` contract and the `SURF` finish table of the untextured parts
 *  - `fuselage.ts` fuselage paint (livery bands, registration, panel lines, soot, wear, clear-coat maps)
 *  - `wing.ts`     shared wing / tail paint and the `wingV` / `tailV` span mapping
 *  - `floats.ts`   float hull paint with the packed clear-coat / roughness / metalness map
 *  - `cabin.ts`    cabin lining (headliner, window band, sidewalls, door panel) and the vinyl grain
 *  - `panel.ts`    instrument panel atlas (`PANEL`, `GAUGES`, `DIAL`, `PANEL_UV`), the live-instrument atlas and the GPS screen
 *  - `glass.ts`    cockpit glass smudge mask
 *  - `prop.ts`     propeller motion-blur disc
 * This barrel keeps `./textures` imports working.
 */
export * from './textures/common';
export * from './textures/fuselage';
export * from './textures/wing';
export * from './textures/floats';
export * from './textures/cabin';
export * from './textures/panel';
export * from './textures/glass';
export * from './textures/prop';
