// The twelve individually simulated delegations of the Galactic Senate (SPEC §8: "at least twelve differentiated
// playable delegation suites"). Every delegation is an ORIGINAL game invention (no canon worlds, no canon senators);
// the names are sectors and worlds made up for this city. The same table drives the blueprint (suite palette, size,
// layout, artifact, tier) and the session simulation (positions per scenario live in scenarios.js).
//
//   { id, name, world, senator, concern, palette: { wall, floor, accent, trim }, tier, size, layout, artifact,
//     view, extraRoom, emblem }
//
// - palette: block names from blocks.js `B` (wall / floor / accent light or emissive / trim)
// - tier: 1 or 2 (the wall tier whose pod the suite owns; six suites per tier)
// - size: arc width class 'S' | 'M' | 'L' | 'XL' (34 / 38 / 42 / 46 blocks of arc at the suite's mid radius)
// - layout: the order of the five rooms along the arc, reading clockwise (reception is always where the lift lands)
// - artifact: the signature furnishing built in the reception / lounge (see senate.js SUITE_ARTIFACTS)
// - view: 'chamber' (glass in the wall toward the pod gallery), 'city' (slit windows through the drum skin),
//         'skylight' (lit ceiling wells)
// - extraRoom: a sixth room some suites get (null for none) — 'shrine' | 'kitchenette' | 'guest_room' | 'workshop'
// Pairwise the twelve differ in >= 4 of { palette, size, layout, artifact, view, tier, extraRoom } (test-senate).
export const DELEGATIONS = [
  { id: 'kessar', name: 'Kessar Reach Delegation', world: 'Kessar Reach', senator: 'Asha Merin', concern: 'public services and lower-level infrastructure',
    palette: { wall: 'PLASTER', floor: 'GREEN_WOOL', accent: 'GLOW_PANEL', trim: 'CHROME' }, tier: 1, size: 'L', layout: ['lounge', 'records', 'reception', 'office', 'aides'], artifact: 'planters', view: 'chamber', extraRoom: null, emblem: 'a green field under a chrome arch' },
  { id: 'veth', name: 'Veth Combine Delegation', world: 'Veth Combine', senator: 'Doran Vex', concern: 'mining exports and low port charges',
    palette: { wall: 'DURASTEEL_DARK', floor: 'DECK_PLATE', accent: 'GLOW_PANEL', trim: 'GOLD_BLOCK' }, tier: 1, size: 'M', layout: ['reception', 'office', 'aides', 'records', 'lounge'], artifact: 'ore_crates', view: 'city', extraRoom: 'workshop', emblem: 'a gold ingot on dark steel' },
  { id: 'orrin', name: 'Orrin Shoals Delegation', world: 'Orrin Shoals', senator: 'Maela Tirsk', concern: 'fisheries protection and honest customs',
    palette: { wall: 'BLUE_WOOL', floor: 'SMOOTH_STONE', accent: 'GLOW_PANEL_BLUE', trim: 'CHROME' }, tier: 1, size: 'S', layout: ['records', 'reception', 'lounge', 'office', 'aides'], artifact: 'water_tank', view: 'skylight', extraRoom: null, emblem: 'three blue waves' },
  { id: 'talvane', name: 'Talvane Delegation', world: 'Talvane', senator: 'Cassius Orell', concern: 'fiscal restraint and the dignity of the old houses',
    palette: { wall: 'WHITE_WOOL', floor: 'RED_WOOL', accent: 'GOLD_BLOCK', trim: 'GOLD_BLOCK' }, tier: 1, size: 'XL', layout: ['aides', 'office', 'reception', 'lounge', 'records'], artifact: 'banners', view: 'chamber', extraRoom: 'shrine', emblem: 'a white tower on red' },
  { id: 'dhessen', name: 'Dhessen Hub Delegation', world: 'Dhessen Hub', senator: 'Pell Andrassy', concern: 'trade lanes, port capacity and predictable fees',
    palette: { wall: 'DECK_PLATE', floor: 'PANEL_BLACK', accent: 'HOLO_SIGN', trim: 'CHROME' }, tier: 1, size: 'M', layout: ['office', 'reception', 'aides', 'lounge', 'records'], artifact: 'route_map', view: 'city', extraRoom: null, emblem: 'a chrome ring of lanes' },
  { id: 'cavarra', name: 'Cavarra Belt Delegation', world: 'Cavarra Belt', senator: 'Ryn Holloway', concern: 'settler freight and light-touch inspection',
    palette: { wall: 'STONE_BRICKS', floor: 'COARSE_DIRT', accent: 'LANTERN', trim: 'IRON_BLOCK' }, tier: 1, size: 'M', layout: ['reception', 'lounge', 'records', 'aides', 'office'], artifact: 'mineral_display', view: 'skylight', extraRoom: 'kitchenette', emblem: 'an iron asteroid' },
  { id: 'sennet', name: 'Sennet Prime Delegation', world: 'Sennet Prime', senator: 'Ilvara Quen', concern: 'archives, evidence and procedure',
    palette: { wall: 'BOOKSHELF', floor: 'SPRUCE_PLANKS', accent: 'GLOW_PANEL', trim: 'CHROME' }, tier: 2, size: 'L', layout: ['records', 'office', 'reception', 'aides', 'lounge'], artifact: 'library_wall', view: 'chamber', extraRoom: null, emblem: 'an open book' },
  { id: 'brakka', name: 'Brakka Delta Delegation', world: 'Brakka Delta', senator: 'Tomas Greel', concern: 'shipyards and port expansion',
    palette: { wall: 'DURASTEEL', floor: 'DECK_PLATE', accent: 'PANEL_RED', trim: 'PANEL_RED' }, tier: 2, size: 'M', layout: ['aides', 'reception', 'office', 'records', 'lounge'], artifact: 'ship_model', view: 'city', extraRoom: 'workshop', emblem: 'a red hull on steel' },
  { id: 'tyrell', name: 'Tyrell Verge Delegation', world: 'Tyrell Verge', senator: 'Nessa Vahl', concern: 'relief shipments and clinic supplies',
    palette: { wall: 'WHITE_WOOL', floor: 'WHITE_PLANKS', accent: 'GLOW_PANEL_BLUE', trim: 'CHROME' }, tier: 2, size: 'S', layout: ['lounge', 'reception', 'aides', 'office', 'records'], artifact: 'medical_tank', view: 'skylight', extraRoom: null, emblem: 'a blue drop on white' },
  { id: 'ossara', name: 'Ossara Delegation', world: 'Ossara', senator: 'Bren Talwick', concern: 'forest exports and the lower levels\' air and water',
    palette: { wall: 'SPRUCE_PLANKS', floor: 'GRASS', accent: 'LANTERN', trim: 'SPRUCE_LOG' }, tier: 2, size: 'XL', layout: ['office', 'aides', 'reception', 'records', 'lounge'], artifact: 'garden', view: 'chamber', extraRoom: null, emblem: 'a spruce crown' },
  { id: 'quell', name: 'Quell Ministries Delegation', world: 'Quell', senator: 'Hadrik Sol', concern: 'orderly customs and complete records',
    palette: { wall: 'PANEL_BLACK', floor: 'SMOOTH_STONE', accent: 'GLOW_PANEL', trim: 'CHROME' }, tier: 2, size: 'M', layout: ['reception', 'records', 'office', 'lounge', 'aides'], artifact: 'records_vault', view: 'city', extraRoom: 'shrine', emblem: 'a black seal with a chrome border' },
  { id: 'halcyon', name: 'Halcyon Drift Delegation', world: 'Halcyon Drift', senator: 'Jory Kest', concern: 'spacer fleets, open lanes and cheap landings',
    palette: { wall: 'HULL_PLATE', floor: 'DURASTEEL_DARK', accent: 'LANTERN', trim: 'IRON_BLOCK' }, tier: 2, size: 'L', layout: ['lounge', 'aides', 'reception', 'records', 'office'], artifact: 'star_charts', view: 'skylight', extraRoom: 'kitchenette', emblem: 'a lantern over a hull plate' },
];

export const DELEGATION_BY_ID = Object.fromEntries(DELEGATIONS.map((d) => [d.id, d]));
export const SIZE_ARC = { S: 34, M: 38, L: 42, XL: 46 };   // blocks of arc at the suite's mid radius (r 59)

// Meaningful differences between two delegation suites (rubric 17 row 5): palette (any of the four blocks), size,
// layout order, artifact, view, tier, extra room.
export function suiteDifferences(a, b) {
  const out = [];
  const pa = a.palette, pb = b.palette;
  if (pa.wall !== pb.wall || pa.floor !== pb.floor || pa.accent !== pb.accent || pa.trim !== pb.trim) out.push('palette');
  if (a.size !== b.size) out.push('size');
  if (a.layout.join() !== b.layout.join()) out.push('layout');
  if (a.artifact !== b.artifact) out.push('artifact');
  if (a.view !== b.view) out.push('view');
  if (a.tier !== b.tier) out.push('tier');
  if ((a.extraRoom || null) !== (b.extraRoom || null)) out.push('extraRoom');
  return out;
}
