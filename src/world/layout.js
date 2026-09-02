/**
 * Seaside plaza layout (meters). Plaza center ≈ origin, +X east, -Z north. The player spawns on the
 * south edge looking north (yaw 0 = -Z). Buildings enclose the plaza; cobbled streets leave between
 * them; a low wall + iron fence separates the plaza from a garden terrace on the east (right side of
 * the reference frame). Facing: rot 0 → front faces +Z (south), π → north, π/2 → east, -π/2 → west.
 */
export const PLAZA = { x0: -26, x1: 18, z0: -18, z1: 24 };
export const GARDEN = { x0: 18, x1: 34, z0: -18, z1: 24 };
export const SIDEWALK_W = 2.5;
export const SIDEWALK_H = 0.15;
export const FENCE_X = 17.5;
export const GATE = { z0: -9.0, z1: -6.0 };

/** Compass rose: big, centred left of the spawn so its bands run under the player's feet like the reference. */
export const ROSE = { x: -2, z: 4, r: 12 };
export const FOUNTAIN = { x: -12, z: -3 };
export const OBJECTIVE = { x: -2, z: 4, r: 6 };
/** Spawn is offset east so the garden fence sits close on the right and the fountain reads left of centre. */
export const PLAYER_SPAWN = { x: 8, z: 17, yaw: 0 };

/** Streets: axis-aligned cobbled corridors leaving the plaza. `axis` is the direction they run. */
export const STREETS = [
  { name: 'nw_alley', axis: 'z', x0: -13.2, x1: -10.6, z0: -32, z1: -18, sidewalk: 0 },
  { name: 'ne_street', axis: 'z', x0: 12.6, x1: 17.2, z0: -42, z1: -18, sidewalk: 1.2 },
  { name: 'w_street', axis: 'x', x0: -50, x1: -26, z0: -9.5, z1: -4.3, sidewalk: 1.2 },
  { name: 's_street', axis: 'z', x0: -3.2, x1: 3.2, z0: 24, z1: 48, sidewalk: 1.5 },
  { name: 'e_street', axis: 'x', x0: 34, x1: 56, z0: -1.0, z1: 3.6, sidewalk: 1.2 },
];

/** Playable extents (streets are closed by barricades/boundary volumes near these limits). */
export const BOUNDS = { x0: -40, x1: 48, z0: -36, z1: 38 };

/**
 * Buildings. w = facade width (along local X), d = depth, floors, style key (see BuildingGenerator
 * STYLES). `front` = which plaza/street the front faces; details on other sides degrade.
 */
export const BUILDINGS = [
  // North row (fronts at z = -18)
  { id: 'N1', x: -19.6, z: -23.5, w: 12.8, d: 11, rot: 0, floors: 2, style: 'ochre_stone', roof: 'gable', balcony: 'wood', door: 0.32, plaque: 'right' },
  { id: 'N2', x: -4.1, z: -24, w: 13, d: 12, rot: 0, floors: 3, style: 'stone_house', roof: 'gable', balcony: 'loggia', door: 0.5 },
  { id: 'N3', x: 7.5, z: -23, w: 10.2, d: 10, rot: 0, floors: 3, style: 'white_blue', roof: 'gable', balcony: 'iron_top', door: 0.5, ivy: true, arch: true },
  { id: 'N4', x: 25.6, z: -23, w: 16.8, d: 10, rot: 0, floors: 3, style: 'pink', roof: 'gable', balcony: 'iron', door: 0.3 },
  // West row (fronts at x = -26)
  { id: 'W1', x: -31, z: -13.75, w: 8.5, d: 10, rot: Math.PI / 2, floors: 3, style: 'yellow', roof: 'gable', balcony: 'iron', door: 0.5 },
  { id: 'W2', x: -31.5, z: 3.85, w: 16.3, d: 11, rot: Math.PI / 2, floors: 2, style: 'cafe', roof: 'flat', balcony: 'iron', door: 0.5, awning: true },
  { id: 'W3', x: -31, z: 18, w: 12, d: 10, rot: Math.PI / 2, floors: 3, style: 'white_green', roof: 'gable', balcony: 'iron', door: 0.4, plaque: 'left' },
  // South row (fronts at z = +24)
  { id: 'S1', x: -14.6, z: 29, w: 22.8, d: 10, rot: Math.PI, floors: 3, style: 'ochre_stone', roof: 'gable', balcony: 'iron', door: 0.3 },
  { id: 'S2', x: 10.6, z: 29, w: 14.8, d: 10, rot: Math.PI, floors: 2, style: 'beige', roof: 'gable', balcony: 'wood', door: 0.6, plaque: 'left' },
  { id: 'S3', x: 26, z: 28.5, w: 16, d: 9, rot: Math.PI, floors: 2, style: 'white_blue', roof: 'flat', balcony: 'iron', door: 0.5 },
  // East row beyond the garden (fronts at x = +34)
  { id: 'E1', x: 39, z: -9.5, w: 17, d: 10, rot: -Math.PI / 2, floors: 3, style: 'beige', roof: 'gable', balcony: 'iron', door: 0.5 },
  { id: 'E2', x: 39, z: 13.8, w: 20.4, d: 10, rot: -Math.PI / 2, floors: 2, style: 'yellow', roof: 'gable', balcony: 'wood', door: 0.5 },
  // Street flanks (plainer)
  { id: 'NEW', x: 6.7, z: -34, w: 12, d: 9.4, rot: Math.PI / 2, floors: 3, style: 'beige', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'NEE', x: 24.2, z: -34, w: 12, d: 11.6, rot: -Math.PI / 2, floors: 2, style: 'white_green', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'NWEND', x: -12, z: -37, w: 20, d: 10, rot: 0, floors: 2, style: 'yellow', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'WWN', x: -42.5, z: -15.5, w: 13, d: 12, rot: 0, floors: 2, style: 'white_blue', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'WWS', x: -43, z: 1.7, w: 12, d: 12, rot: Math.PI, floors: 3, style: 'ochre_stone', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'SSW', x: -12, z: 40, w: 12, d: 14.6, rot: Math.PI / 2, floors: 2, style: 'pink', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'SSE', x: 12, z: 40, w: 12, d: 14.6, rot: -Math.PI / 2, floors: 3, style: 'beige', roof: 'gable', balcony: 'wood', door: 0.5, plain: true },
  { id: 'EEN', x: 50, z: -7, w: 12, d: 12, rot: 0, floors: 2, style: 'yellow', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'EES', x: 50, z: 9.6, w: 12, d: 12, rot: Math.PI, floors: 2, style: 'white_green', roof: 'flat', balcony: 'iron', door: 0.5, plain: true },
  // Vista closers beyond the street barricades (unreachable): the streets appear to continue and bend
  // instead of ending against the backdrop.
  { id: 'WV1', x: -56, z: -13.5, w: 10, d: 8, rot: 0, floors: 2, style: 'pink', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'WV2', x: -56, z: -0.3, w: 10, d: 8, rot: Math.PI, floors: 3, style: 'beige', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'WV3', x: -67, z: -7, w: 14, d: 10, rot: Math.PI / 2, floors: 3, style: 'white_blue', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'SV1', x: -10, z: 53, w: 11, d: 10, rot: Math.PI / 2, floors: 2, style: 'yellow', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'SV2', x: 10, z: 53, w: 11, d: 10, rot: -Math.PI / 2, floors: 2, style: 'white_green', roof: 'gable', balcony: 'wood', door: 0.5, plain: true },
  { id: 'SV3', x: 0, z: 66, w: 16, d: 10, rot: Math.PI, floors: 3, style: 'ochre_stone', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'EV1', x: 62, z: -7, w: 11, d: 12, rot: 0, floors: 2, style: 'white_blue', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'EV2', x: 62, z: 9.6, w: 11, d: 12, rot: Math.PI, floors: 3, style: 'pink', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
  { id: 'EV3', x: 76, z: 1.3, w: 14, d: 10, rot: -Math.PI / 2, floors: 2, style: 'beige', roof: 'gable', balcony: 'iron', door: 0.5, plain: true },
];

/** Church closing the NE street vista; the bell tower rises beside it. */
export const CHURCH = { x: 15, z: -50, w: 22, d: 14, rot: 0, height: 12 };
export const BELL_TOWER = { x: 29.5, z: -49, size: 5.2, height: 26 };

/** Trees: plaza trees sit in octagonal stone planters; garden trees in open gravel. */
export const TREES = [
  { x: -20.5, z: 12, planter: true, scale: 1.15, seed: 1 },
  { x: -21, z: -12.5, planter: true, scale: 1.0, seed: 2 },
  { x: 25.5, z: 7, planter: false, scale: 1.25, seed: 3 },
  { x: 27, z: -12, planter: false, scale: 1.05, seed: 4 },
];

export const STREET_LAMPS = [
  { x: -12.5, z: 18.5 },
  { x: 6.5, z: -10 },
  { x: 12.5, z: 6 },
  { x: -20, z: 20.5 },
  { x: -22, z: -2 },
  { x: 24, z: -3 },
  { x: 13.2, z: -30, y: SIDEWALK_H }, // NE street, on the (raised) west sidewalk
];

/** Cable anchors for the string lights (world coords, y = attachment height). */
export const STRING_LIGHTS = [
  { a: [-9, 6.6, -17.6], b: [17.5, 6.4, 0.0], sag: 1.6 },
  { a: [-1.5, 7.1, -17.6], b: [17.5, 6.6, 10.5], sag: 1.7 },
  { a: [8, 6.7, -17.6], b: [17.5, 6.5, 19.0], sag: 1.5 },
  { a: [-25.6, 6.9, -12], b: [-6, 6.5, 23.6], sag: 2.0 },
  { a: [-25.6, 6.4, 14], b: [17.5, 6.4, 10.5], sag: 2.3 },
  { a: [-25.6, 6.2, 20.5], b: [-3.5, 6.6, 23.6], sag: 1.2 },
  { a: [-10.7, 6.8, -17.6], b: [-25.6, 6.5, -12], sag: 1.1 },
  { a: [3.2, 6.6, 23.6], b: [17.5, 6.5, 19.0], sag: 1.0 },
];

/**
 * Ivy patches: (x, z) wall-base center, yaw = direction the wall faces (0 → +Z), w × h meters.
 * N3 (the ivy-clad house in the reference) gets the big patches; smaller ones break up other facades.
 */
export const IVY = [
  { x: 4.2, z: -17.95, yaw: 0, w: 3.2, h: 7.5, seed: 1 },
  { x: 11.6, z: -17.95, yaw: 0, w: 1.6, h: 4.2, seed: 2 },
  { x: -25.95, z: -15.0, yaw: Math.PI / 2, w: 2.4, h: 5.5, seed: 3 },
  { x: 33.95, z: -13.5, yaw: -Math.PI / 2, w: 3.0, h: 6.5, seed: 4 },
  { x: 33.95, z: 8.0, yaw: -Math.PI / 2, w: 2.0, h: 4.5, seed: 5 },
  { x: -22.6, z: 23.95, yaw: Math.PI, w: 2.6, h: 5.5, seed: 6 },
  { x: 17.2, z: -11.2, yaw: -Math.PI / 2, w: 1.0, h: 2.6, seed: 7, density: 7 },
  { x: 17.2, z: 14.0, yaw: -Math.PI / 2, w: 0.9, h: 2.4, seed: 8, density: 7 },
  { x: -13.15, z: -23.5, yaw: Math.PI / 2, w: 1.6, h: 4.0, seed: 9 },
];

/** Bare utility cables (no bulbs) strung high between facades, above the festoons. */
export const CABLES = [
  { a: [-3.2, 9.3, -17.6], b: [-9, 9.1, 23.6], sag: 1.5 },
  { a: [-25.6, 9.2, -13], b: [-17, 6.5, -17.6], sag: 0.4 },
  { a: [22, 9.2, -17.6], b: [33.9, 9.0, -6], sag: 0.6 },
];

/** Poles on the fence line the eastern cables attach to (no building there). */
export const LIGHT_POLES = [
  { x: 17.5, z: 0.0, h: 6.6 },
  { x: 17.5, z: 10.5, h: 6.8 },
  { x: 17.5, z: 19.0, h: 6.7 },
];
