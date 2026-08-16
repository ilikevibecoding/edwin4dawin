// Canonical dimensions shared by every module. Read-only. See ART_DIRECTION.md.

export const HULL = {
  radius: 1.62,
  axisY: 0.86,
  ribEvery: 0.75,
  ribDepth: 0.11,
  ribThick: 0.05,
};

export const Z = {
  bowTip: -1.4,
  controlStart: 0.4,
  controlEnd: 5.8,
  bulkhead1: 5.8,
  corridorStart: 5.9,
  corridorEnd: 13.4,
  bulkhead2: 13.4,
  aftPassageStart: 13.5,
  aftPassageEnd: 16.8,
  frameRing: 16.8,
  engineStart: 16.8,
  engineEnd: 23.2,
  sternStart: 23.2,
  sternTip: 24.4,
};

export const DECK = {
  mainY: 0,
  engineY: -0.34,
  stepZ0: 16.95, // stairs begin
  stepZ1: 17.75, // stairs end (engine deck level)
};

export const HATCH = {
  width: 0.66,
  height: 1.4,
  sillY: 0.12,     // coaming height above deck
  bottomY: 0.12,   // opening bottom above deck
  centerY: 0.82,   // opening vertical center
};

export const PLAYER = {
  eyeHeight: 1.7,
  radius: 0.27,
  stepUp: 0.32,
};

export const PORTHOLES = [
  { side: +1, z: 6.95, y: 1.42, r: 0.17 },  // starboard corridor
  { side: -1, z: 11.55, y: 1.42, r: 0.17 }, // port crew mess
];

// Longitudinal utility routes shared by all compartments (so pipes/cables connect
// across bulkheads through penetration collars at the same coordinates).
export const ROUTES = {
  stbdBallast: { x: 1.08, y: 1.95, r: 0.075, color: 'green' },   // ballast main
  stbdCool: { x: 1.27, y: 1.72, r: 0.048, color: 'gray' },        // cooling water
  portTrayX: -1.02, portTrayY: 2.02,                              // cable tray
  portWater: { x: -1.34, y: 1.55, r: 0.038, color: 'blue' },      // fresh water
  portAir: { x: -1.47, y: 1.18, r: 0.022, color: 'copper' },      // HP air (copper)
  crownWireY: 2.28,                                               // crown conduit
};

export const VIEWPORT = { z: -0.62, y: 1.28, r: 0.46 }; // forward observation viewport

// Half-width of flat floor at a given deck height inside the hull circle
export function floorHalfWidth(deckY = DECK.mainY) {
  const dy = HULL.axisY - deckY;
  return Math.sqrt(Math.max(0, HULL.radius * HULL.radius - dy * dy));
}
