import * as THREE from 'three';
import { makeRng, hashString } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { OPENINGS, HOSTAGE_SPOTS, EXTRACTION_ZONE } from '../map/layout.js';
import { prop, propRadius, registerPropManifest } from './library.js';
import { signProp, buildSignageMesh, buildScreenMesh, registerSignageManifest } from './signage.js';
import { decalPart, buildDecalMesh, registerDecalManifest } from './decals.js';

/**
 * DRESS — places every prop, sign and decal into the real rooms.
 * Owner: Fable 3.
 *
 * All coordinates are world metres (+X east, +Z south, ground floor y=0,
 * upper floor y=4.2). Placement is hand-authored per room, seeded per room id
 * so any rng jitter is deterministic. A safety net skips any collider-bearing
 * prop that would violate the gameplay clearances (1.2 m around opening
 * centres, 1.5 m around hostages, the extraction rectangle).
 */

const UP = 4.2; // upper floor slab top
const HW = 0.08; // half wall thickness
const DOOR_CLEAR = 1.2;
const HOSTAGE_CLEAR = 1.5;

/* ---------------- clearance data ---------------- */

const PASSAGE_TYPES = new Set(['door', 'arch', 'open', 'shutter']);
const PASSAGES = OPENINGS.filter((o) => PASSAGE_TYPES.has(o.type)).map((o) => ({
  id: o.id,
  floor: o.floor,
  x: o.axis === 'x' ? o.at : (o.a + o.b) / 2,
  z: o.axis === 'x' ? (o.a + o.b) / 2 : o.at,
}));

function floorOf(y) {
  return y > 2 ? 'upper' : 'ground';
}

/** Returns a reason string if a blocker of radius r at pos violates clearances. */
function violation(pos, r, blocks) {
  const fl = floorOf(pos[1]);
  for (const h of HOSTAGE_SPOTS) {
    if (floorOf(h.pos[1]) !== fl) continue;
    if (Math.hypot(pos[0] - h.pos[0], pos[2] - h.pos[2]) < HOSTAGE_CLEAR + r) return `hostage ${h.id}`;
  }
  if (fl === 'ground'
    && pos[0] + r > EXTRACTION_ZONE.x0 && pos[0] - r < EXTRACTION_ZONE.x1
    && pos[2] + r > EXTRACTION_ZONE.z0 && pos[2] - r < EXTRACTION_ZONE.z1) return 'extraction zone';
  if (!blocks) return null;
  for (const p of PASSAGES) {
    if (p.floor !== fl) continue;
    if (Math.hypot(pos[0] - p.x, pos[2] - p.z) < DOOR_CLEAR + r) return p.id;
  }
  return null;
}

/* ---------------- placement helpers ---------------- */

let CTX = null;
let density = 1;

/** Place a prop from the library at world pos/yaw. Returns true if placed. */
function pl(id, pos, rot = 0, o = {}) {
  const res = prop(id, { pos, rot, ...o });
  const r = propRadius(id) * (o.scale ?? 1);
  const why = violation(pos, r, res.colliders.length > 0);
  if (why) {
    console.warn(`[dress] skipped ${id} at (${pos[0].toFixed(1)}, ${pos[2].toFixed(1)}) — too close to ${why}`);
    return false;
  }
  CTX.parts.push(...res.parts);
  CTX.faces.push(...(res.faces ?? []));
  CTX.screenFaces.push(...(res.screenFaces ?? []));
  CTX.colliders.push(...res.colliders);
  CTX.screens.push(...res.screens);
  CTX.count++;
  return true;
}

/** Place a sign; parts join the static batch, faces the shared signage mesh. */
function sg(kind, opts) {
  const s = signProp(kind, opts);
  if (s.colliders.length) {
    const why = violation(opts.pos, 0.4, true);
    if (why) {
      console.warn(`[dress] skipped sign ${kind} — too close to ${why}`);
      return;
    }
  }
  CTX.parts.push(...s.parts);
  CTX.faces.push(...s.faces);
  CTX.colliders.push(...s.colliders);
  CTX.count++;
}

/** Emit one decal quad. */
function dc(kind, opts) {
  CTX.decals.push(decalPart(kind, opts));
}

/** Local offset [lx,ly,lz] of an object at pos/yaw, matching library's frame. */
function lw(pos, rot, l) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [pos[0] + l[0] * c + l[2] * s, pos[1] + l[1], pos[2] - l[0] * s + l[2] * c];
}

/**
 * Mount point on a wall. axis 'z': wall plane z=at; axis 'x': wall x=at.
 * side +1 → the room lies on the positive side of the wall.
 * Returns { pos, rot, n } with the prop facing into the room, back against
 * the wall's inner face (plus `depth` metres of standoff for prop thickness).
 */
function wallMount(axis, at, side, along, y, depth = 0) {
  const d = HW + depth;
  if (axis === 'z') {
    return side > 0
      ? { pos: [along, y, at + d], rot: Math.PI, n: [0, 0, 1] }
      : { pos: [along, y, at - d], rot: 0, n: [0, 0, -1] };
  }
  return side > 0
    ? { pos: [at + d, y, along], rot: -Math.PI / 2, n: [1, 0, 0] }
    : { pos: [at - d, y, along], rot: Math.PI / 2, n: [-1, 0, 0] };
}

function onWall(id, axis, at, side, along, y, depth = 0, o = {}) {
  const m = wallMount(axis, at, side, along, y, depth);
  return pl(id, m.pos, m.rot, o);
}

function signOnWall(kind, axis, at, side, along, y, opts = {}) {
  const m = wallMount(axis, at, side, along, y, 0.002);
  sg(kind, { ...opts, pos: m.pos, rot: m.rot });
}

/** Whiteboard + written content overlay on a wall (pivot: board bottom-centre). */
function whiteboardOn(axis, at, side, along, yBottom, idx) {
  const m = wallMount(axis, at, side, along, yBottom, 0.016);
  if (!pl('prop.whiteboard', m.pos, m.rot)) return;
  sg('whiteboardContent', {
    idx,
    pos: [m.pos[0] + m.n[0] * 0.024, m.pos[1] + 0.6, m.pos[2] + m.n[2] * 0.024],
    rot: m.rot,
  });
}

const CHAIR_JITTER = 0.35;

/**
 * Dress a standard desk that was placed at pos/rot (desk +Z edge = monitor
 * side). Adds chair on the −Z side, electronics and density-scaled clutter.
 */
function dressDesk(pos, rot, rng, { screenKind = 'monitor', chair = 'prop.chairTask', tower = 0.35, pedestal = 0.4 } = {}) {
  const jr = (rng() - 0.5) * CHAIR_JITTER;
  pl(chair, lw(pos, rot, [(rng() - 0.5) * 0.3, 0, -0.72 - rng() * 0.25]), rot + Math.PI + jr);
  const top = 0.75;
  const mx = (rng() - 0.5) * 0.5;
  if (screenKind === 'laptop') {
    pl('prop.laptop', lw(pos, rot, [mx, top, 0.05]), rot + (rng() - 0.5) * 0.3);
  } else if (screenKind === 'dual') {
    pl('prop.monitorDual', lw(pos, rot, [mx * 0.4, top, 0.24]), rot);
    pl('prop.keyboard', lw(pos, rot, [mx * 0.4, top, -0.08]), rot + (rng() - 0.5) * 0.12);
    pl('prop.mouse', lw(pos, rot, [mx * 0.4 + 0.32, top, -0.08]), rot);
  } else {
    pl('prop.monitor', lw(pos, rot, [mx, top, 0.24]), rot + (rng() - 0.5) * 0.2);
    pl('prop.keyboard', lw(pos, rot, [mx, top, -0.06]), rot + (rng() - 0.5) * 0.12);
    pl('prop.mouse', lw(pos, rot, [mx + 0.31, top, -0.06]), rot);
  }
  if (rng() < tower) pl('prop.computerTower', lw(pos, rot, [0.58, 0, 0.1]), rot);
  if (rng() < pedestal) pl('prop.drawerUnit', lw(pos, rot, [-0.55, 0, 0.06]), rot);
  if (rng() < 0.6 * density) pl('prop.deskPhone', lw(pos, rot, [-0.55, top, 0.2]), rot + (rng() - 0.5) * 0.5);
  if (rng() < 0.75 * density) pl('prop.paperStack', lw(pos, rot, [0.55, top, 0.14]), rot + (rng() - 0.5) * 0.6);
  if (rng() < 0.5 * density) pl('prop.mug', lw(pos, rot, [0.34, top, -0.15]), rng() * 6.28);
  if (rng() < 0.4 * density) pl('prop.notebook', lw(pos, rot, [-0.25, top, -0.12]), rot + (rng() - 0.5) * 0.8);
  if (rng() < 0.4 * density) pl('prop.pen', lw(pos, rot, [-0.1, top, -0.2]), rng() * 6.28);
  if (rng() < 0.35 * density) pl('prop.stickyNotes', lw(pos, rot, [0.15, top, 0.3]), rot + (rng() - 0.5) * 0.9);
  if (rng() < 0.3 * density) pl('prop.deskOrganiser', lw(pos, rot, [0.62, top, 0.28]), rot);
  if (rng() < 0.3 * density) pl('prop.plantDesk', lw(pos, rot, [-0.65, top, 0.28]), 0);
  if (rng() < 0.25 * density) pl('prop.photoFrame', lw(pos, rot, [-0.42, top, 0.3]), rot + 0.4 + rng() * 0.4);
  if (rng() < 0.3 * density) pl('prop.binOffice', lw(pos, rot, [0.85, 0, -0.35]), rng());
  if (rng() < 0.25 * density) pl('prop.headset', lw(pos, rot, [0.68, top, 0.05]), rot + rng());
}

/** One 4-desk cubicle pod centred at (cx, cz). Panels: 1.35 m chest cover. */
function pod(cx, cz, rng) {
  pl('prop.cubiclePanel', [cx - 0.75, 0, cz], 0);
  pl('prop.cubiclePanel', [cx + 0.75, 0, cz], 0, { variant: rng() < 0.5 ? 'teal' : undefined });
  for (const sx of [-1.63, 1.63]) {
    pl('prop.cubiclePanel', [cx + sx, 0, cz - 0.75], Math.PI / 2);
    pl('prop.cubiclePanel', [cx + sx, 0, cz + 0.75], Math.PI / 2, { variant: rng() < 0.4 ? 'teal' : undefined });
  }
  for (const [dx, dz, rot] of [
    [-0.8, -0.46, 0], [0.8, -0.46, 0],
    [-0.8, 0.46, Math.PI], [0.8, 0.46, Math.PI],
  ]) {
    const p = [cx + dx, 0, cz + dz];
    pl('prop.deskStandard', p, rot, { variant: rng() < 0.3 ? 'worn' : undefined });
    const kind = rng() < 0.18 ? 'laptop' : rng() < 0.3 ? 'dual' : 'monitor';
    dressDesk(p, rot, rng, { screenKind: kind });
  }
}

/* ================================================================== */
/* ROOMS — ground floor                                                */
/* ================================================================== */

function dressMechanical(rng) {
  pl('prop.hvacUnit', [-28.6, 0, -17.6], 0);
  sg('equipLabel', { text: 'AHU-1 NORTH', pos: lw([-28.6, 0, -17.6], 0, [-0.6, 1.5, -0.615]), rot: 0 });
  pl('prop.transformerCabinet', [-31.4, 0, -13.2], -Math.PI / 2);
  sg('equipLabel', { text: 'TX-EAST 11kV', danger: true, pos: [-30.98, 1.5, -13.2], rot: -Math.PI / 2 });
  onWall('prop.pipeManifold', 'z', -20, 1, -25.2, 0, 0.18);
  onWall('prop.pipeManifold', 'z', -20, 1, -24.2, 0, 0.18, { variant: 'sprinkler' });
  sg('equipLabel', { text: 'SPRINKLER RISER', pos: [-24.2, 1.9, -19.63], rot: Math.PI });
  onWall('prop.electricalPanel', 'x', -21, -1, -11.5, 1.35, 0.08);
  sg('equipLabel', { text: 'PANEL LP-2 400V', danger: true, pos: [-21.17, 1.95, -11.5], rot: Math.PI / 2 });
  onWall('prop.breakerBox', 'x', -21, -1, -10.6, 1.5, 0.06);
  pl('prop.drum', [-21.7, 0, -18.5], rng());
  pl('prop.drum', [-22.4, 0, -18.2], rng() * 2, { variant: 'dark' });
  pl('prop.shelvingUtility', [-26.5, 0, -19.55], Math.PI);
  pl('prop.toolCase', [-27.4, 0, -16.2], 0.4);
  pl('prop.ladderStep', [-30.4, 0, -16.0], 1.9);
  pl('prop.fireExtinguisher', [-21.4, 0, -10.1], Math.PI / 2);
  pl('prop.coneWarning', [-27.0, 0, -12.5], rng());
  pl('prop.cableBundle', [-25.5, 0, -13.5], 0.7);
  pl('prop.sprinklerHead', [-26.5, 4.0, -14.5], 0);
  pl('prop.smokeDetector', [-29, 4.0, -12], 0);
  signOnWall('evacDiagram', 'x', -21, -1, -12.6, 1.5, { floor: 'G' });
  dc('floorDirt', { pos: [-27, 0, -15], seed: 1, size: 1.8 });
  dc('floorDirt', { pos: [-24, 0, -18], seed: 2 });
  dc('chippedPaint', { pos: [-21.1, 0.5, -16], normalAxis: 'x-', seed: 1 });
  dc('cableMarks', { pos: [-31.92, 1.4, -11], normalAxis: 'x+', seed: 1 });
  dc('waterStain', { pos: [-29.5, 0, -18.5], seed: 3 });
}

function dressVestibule(rng) {
  // Two speed-gate units flank a 0.9 m accessible gate lane centred on the
  // entry axis (x -0.25..0.65), so the straight walk from the exterior doors
  // to the inner glass doors stays open; both flanks stay walkable too.
  pl('prop.turnstile', [-0.8, 0, -18.2], 0);
  pl('prop.turnstile', [1.2, 0, -18.2], 0);
  pl('prop.deskStandard', [3.0, 0, -18.0], Math.PI / 2);
  dressDesk([3.0, 0, -18.0], Math.PI / 2, rng, { screenKind: 'monitor', tower: 1, pedestal: 0 });
  pl('prop.stanchion', [-2.4, 0, -18.2], 0);
  pl('prop.matFloor', [0.2, 0, -19.1], 0);
  signOnWall('securityNotice', 'z', -16.5, -1, 3.4, 1.5);
  dc('snowTracks', { pos: [0.2, 0, -18.4], seed: 1 });
  dc('snowTracks', { pos: [-0.4, 0, -17.4], seed: 20, rot: -0.08 });
  dc('footprints', { pos: [0.3, 0, -17.2], seed: 2 });
}

function dressLobby(rng) {
  // Reception island facing the entrance
  const rp = [-1, 0, -11];
  pl('prop.deskReception', rp, 0);
  sg('brandLogo', { wide: false, pos: [-1, 0.6, -11.51], rot: 0 });
  sg('nameplate', { name: 'I. LINDQVIST', title: 'Reception', pos: [-0.3, 1.12, -11.3], rot: 0 });
  pl('prop.monitor', [-1.8, 0.74, -11.1], Math.PI);
  pl('prop.keyboard', [-1.8, 0.74, -10.85], Math.PI);
  pl('prop.deskPhone', [-0.9, 0.74, -11.05], Math.PI - 0.3);
  pl('prop.chairTask', [-1.6, 0, -10.15], 0.2);
  pl('prop.brochureStack', [0.4, 1.12, -11.32], 0.15);
  sg('notice', { idx: 2, pos: [0.9, 0.9, -11.51], rot: 0 });
  // Queue from the vestibule
  pl('prop.stanchion', [-1.3, 0, -15.2], 0);
  pl('prop.stanchion', [1.3, 0, -15.2], 0);
  pl('prop.stanchion', [-1.3, 0, -13.6], 0);
  pl('prop.stanchion', [1.3, 0, -13.6], 0);
  // West seating cluster
  pl('prop.sofa', [-16, 0, -12.5], -Math.PI / 2);
  pl('prop.chairLounge', [-13.2, 0, -12.6], Math.PI / 2);
  pl('prop.chairLounge', [-14.3, 0, -10.7], Math.PI);
  pl('prop.tableCoffee', [-14.2, 0, -12.4], Math.PI / 2);
  pl('prop.brochureStack', [-14.2, 0.4, -12.2], 0.5);
  if (density > 0.5) pl('prop.cupCoffeeTakeout', [-14.3, 0.4, -12.7], rng());
  pl('prop.plantFloor', [-19.9, 0, -10.2], 0);
  pl('prop.plantFloor', [-11.3, 0, -9.9], 1.2, { variant: 'concrete' });
  // Mid-floor cover: low planter run + stone bench between reception and the
  // west seating, plus a second run screening the east approach
  pl('prop.planterLow', [-8.8, 0, -13.3], 0);
  pl('prop.benchStone', [-5.9, 0, -13.25], 0.06);
  pl('prop.planterLow', [9.7, 0, -12.1], Math.PI / 2);
  // Evacuation beats: a knocked-over chair by the queue, a dropped coffee
  // with its spill, and papers shed on the way out
  pl('prop.chairTask', [1.7, 0, -12.1], 2.55, { variant: 'tipped' });
  pl('prop.cupCoffeeTakeout', [-2.7, 0, -13.6], 1.1, { variant: 'dropped' });
  dc('waterStain', { pos: [-2.9, 0, -13.75], seed: 44, size: 0.4 });
  pl('prop.paperSheet', [-1.9, 0, -13.2], rng() * 3);
  pl('prop.paperSheet', [-1.2, 0, -14.1], rng() * 3);
  pl('prop.paperSheet', [0.6, 0, -12.6], rng() * 3);
  // Brand + wayfinding on the north-corridor wall
  sg('brandLogo', { wide: true, pos: [9.8, 2.8, -9.09], rot: 0 });
  sg('directional', {
    entries: [
      { text: 'Waiting Area', dir: 'right' },
      { text: 'Open Plan Floor', dir: 'left' },
      { text: 'Conference', dir: 'right' },
    ],
    pos: [2.6, 1.8, -9.09], rot: 0,
  });
  sg('directory', { floor: 'ground', pos: [7.5, 0, -13], rot: 0.15 });
  pl('prop.displayCase', [10.8, 0, -9.9], 0);
  pl('prop.wetFloorSign', [0.9, 0, -15.9], 0.5);
  sg('wetFloorFaces', { pos: [0.9, 0, -15.9], rot: 0.5 });
  dc('snowTracks', { pos: [0, 0, -14.8], seed: 3 });
  dc('snowTracks', { pos: [0.3, 0, -12.9], seed: 19, rot: 0.12 });
  dc('footprints', { pos: [-0.4, 0, -12.6], seed: 4, rot: 0.2 });
  dc('footprints', { pos: [0.5, 0, -10.9], seed: 21, rot: -0.25 });
  dc('floorDirt', { pos: [0.4, 0, -16.2], seed: 5, size: 1.1 });
  dc('carpetWear', { pos: [-14.5, 0, -11.8], seed: 1, size: 1.8 });
  dc('fingerprints', { pos: [-2.15, 1.4, -16.52], normalAxis: 'z-', seed: 1 });
  dc('fingerprints', { pos: [3.4, 1.3, -8.99], normalAxis: 'z-', seed: 2 });
}

function dressWaiting(rng) {
  // Chairs along the east glazing and back-to-back row mid-room
  for (let i = 0; i < 4; i++) {
    pl('prop.chairWaiting', [20.25, 0, -18.3 + i * 0.78], Math.PI / 2);
  }
  pl('prop.tableSide', [20.25, 0, -14.9], Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    pl('prop.chairWaiting', [14.6 + i * 0.78, 0, -19.15], Math.PI);
  }
  pl('prop.tableCoffee', [16.8, 0, -13.4], 0);
  pl('prop.brochureStack', [16.6, 0.4, -13.3], 0.3);
  if (density > 0.4) pl('prop.cupPaper', [17.3, 0.4, -13.6], rng());
  pl('prop.chairWaiting', [15.6, 0, -11.9], 0.15);
  pl('prop.chairWaiting', [18.0, 0, -11.9], -0.2);
  pl('prop.plantFloor', [12.8, 0, -19.4], 0.6);
  pl('prop.waterCooler', [12.6, 0, -9.35], 0);
  pl('prop.coatStand', [12.6, 0, -18.6], 0);
  signOnWall('artPrint', 'x', 12, 1, -10.3, 1.6, { idx: 1 });
  onWall('prop.wallClock', 'z', -9, -1, 16.5, 2.4, 0.03);
  dc('carpetWear', { pos: [16.5, 0, -14], seed: 2, size: 2.0 });
  dc('waterStain', { pos: [12.9, 0, -10.3], seed: 4, size: 0.7 });
}

function dressNorthCorr(rng) {
  // Long sightline: only chest-high cover, kept off the opening clearances
  pl('prop.cabinetFiling', [-16.7, 0, -8.55], Math.PI, { variant: 'open' });
  pl('prop.cabinetFiling', [-16.2, 0, -8.55], Math.PI);
  pl('prop.copierFloor', [2.0, 0, -8.5], Math.PI, { variant: 'open' });
  sg('notice', { idx: 6, pos: lw([2.0, 0, -8.5], Math.PI, [-0.2, 0.72, -0.35]), rot: Math.PI, tilt: 0.05 });
  // Printer / recycling station on the south wall — waist-high cover along
  // the corridor fight line without breaking the sightline
  pl('prop.credenza', [11.4, 0, -5.33], 0);
  pl('prop.printerDesk', [11.15, 0.72, -5.33], 0.1);
  pl('prop.paperTrays', [12.0, 0.72, -5.38], -0.15);
  pl('prop.binRecycle', [12.75, 0, -5.55], 0.2, { variant: 'paper' });
  pl('prop.binTrash', [13.25, 0, -5.5], -0.1);
  pl('prop.waterCooler', [10.2, 0, -8.68], Math.PI);
  pl('prop.cupPaper', [10.5, 0, -8.6], rng());
  pl('prop.consoleTable', [-1.0, 0, -8.68], Math.PI);
  pl('prop.plantDesk', [-1.3, 0.8, -8.7], 0);
  pl('prop.chairWaiting', [18.4, 0, -8.55], Math.PI);
  pl('prop.chairWaiting', [19.2, 0, -8.55], Math.PI);
  pl('prop.fireExtinguisher', [-23.7, 0, -6.0], Math.PI / 2);
  pl('prop.matFloor', [22.4, 0, -7.5], Math.PI / 2);
  // Signage
  signOnWall('roomSign', 'z', -9, 1, -22.15, 1.5, { number: 'G-01', name: 'Mechanical\nPlant' });
  signOnWall('deptSign', 'z', -5, -1, -12, 2.78, { name: 'Aurora Analytics', sub: 'Open Plan Floor' });
  // Evacuation notice hastily taped over the corner of the department sign
  sg('notice', { idx: 7, pos: [-11.68, 2.7, -5 - HW - 0.05], rot: 0, tilt: -0.07 });
  signOnWall('roomSign', 'z', -5, -1, 6.95, 1.5, { number: 'G-04', name: 'Aurora\nConference' });
  signOnWall('roomSign', 'z', -5, -1, 17.85, 1.5, { number: 'G-09', name: 'Break Room' });
  signOnWall('directional', 'z', -9, 1, 20.2, 1.8, {
    entries: [
      { text: 'Loading Dock', dir: 'right' },
      { text: 'Break Room', dir: 'right' },
      { text: 'Reception', dir: 'left' },
    ],
  });
  signOnWall('directional', 'z', -9, 1, -20.6, 1.8, {
    entries: [
      { text: 'Records Archive', dir: 'left' },
      { text: 'IT Workspace', dir: 'left' },
      { text: 'Open Plan Floor', dir: 'right' },
    ],
  });
  signOnWall('evacDiagram', 'z', -9, 1, -21.6, 1.5, { floor: 'G' });
  signOnWall('safetyPoster', 'z', -5, -1, 13.6, 1.6, { idx: 3 });
  dc('carpetWear', { pos: [-10, 0, -7], seed: 3, size: [2.4, 1.4], rot: 0.05 });
  dc('carpetWear', { pos: [4, 0, -7], seed: 4, size: [2.6, 1.4] });
  dc('carpetWear', { pos: [16, 0, -7], seed: 5, size: [2.2, 1.4], rot: -0.06 });
  dc('wallScuff', { pos: [-14, 0.35, -8.92], normalAxis: 'z+', seed: 1 });
  dc('wallScuff', { pos: [8, 0.35, -4.92], normalAxis: 'z-', seed: 2 });
  dc('signResidue', { pos: [14, 1.6, -8.93], normalAxis: 'z+', seed: 1 });
}

function dressWestCorr(rng) {
  pl('prop.lockerBank', [-22.9, 0, 17.55], 0);
  pl('prop.lockerBank', [-21.7, 0, 17.55], 0);
  pl('prop.fireExtinguisher', [-23.75, 0, 5.3], -Math.PI / 2);
  pl('prop.plantFloor', [-21.45, 0, -0.9], 0);
  pl('prop.matFloor', [-22.5, 0, -3.9], 0);
  onWall('prop.coatHookRail', 'x', -21, -1, 15.2, 1.65, 0.07);
  signOnWall('safetyPoster', 'x', -24, 1, 12.5, 1.6, { idx: 0 });
  signOnWall('evacDiagram', 'x', -24, 1, 7.0, 1.5, { floor: 'G' });
  signOnWall('roomSign', 'x', -24, 1, 1.35, 1.5, { number: 'G-03', name: 'IT Workspace' });
  signOnWall('roomSign', 'x', -24, 1, -2.35, 1.5, { number: 'G-02', name: 'Records\nArchive' });
  dc('carpetWear', { pos: [-22.5, 0, 4], seed: 6, size: [1.4, 2.6] });
  dc('carpetWear', { pos: [-22.5, 0, 12], seed: 7, size: [1.4, 2.4] });
  dc('wallScuff', { pos: [-20.92, 0.35, 8], normalAxis: 'x-', seed: 3 });
}

function dressEastCorr(rng) {
  pl('prop.boxCardboard', [23.55, 0, 1.1], 0.2);
  pl('prop.boxCardboard', [23.55, 0, 1.6], -0.15, { variant: 'open' });
  pl('prop.boxCardboard', [23.5, 0.35, 1.35], 0.4);
  pl('prop.handTruck', [23.6, 0, -0.6], Math.PI / 2 + 0.3);
  pl('prop.coneWarning', [22.6, 0, 12.6], rng());
  pl('prop.wetFloorSign', [22.4, 0, 12.0], 0.4);
  sg('wetFloorFaces', { pos: [22.4, 0, 12.0], rot: 0.4 });
  pl('prop.cableDrop', [23.9, 0.6, 2.6], Math.PI / 2);
  pl('prop.fireExtinguisher', [21.3, 0, 1.0], -Math.PI / 2);
  signOnWall('safetyPoster', 'x', 24, -1, 5.6, 1.6, { idx: 2 });
  signOnWall('roomSign', 'x', 24, -1, -2.3, 1.5, { number: 'G-15', name: 'Loading Dock' });
  signOnWall('roomSign', 'x', 24, -1, 8.7, 1.5, { number: 'G-16', name: 'Vehicle Bay' });
  signOnWall('directional', 'x', 24, -1, 11.9, 1.8, {
    entries: [
      { text: 'Vehicle Bay', dir: 'right' },
      { text: 'Server Room', dir: 'left' },
      { text: 'North Corridor', dir: 'up' },
    ],
  });
  dc('floorDirt', { pos: [22.5, 0, 6], seed: 6, size: 1.5 });
  dc('floorDirt', { pos: [22.5, 0, -2], seed: 7 });
  dc('ceilingLeak', { pos: [22.5, 3.0, 10], normalAxis: 'y-', seed: 1 });
  dc('waterStain', { pos: [22.4, 0, 11.6], seed: 8 });
  dc('wallScuff', { pos: [23.92, 0.4, 4], normalAxis: 'x-', seed: 4 });
}

function dressSouthCorr(rng) {
  pl('prop.shelvingUtility', [-5, 0, 17.6], 0);
  pl('prop.crateShipping', [3.2, 0, 17.4], 0.08);
  pl('prop.boxCardboard', [4.2, 0, 17.5], 0.5);
  pl('prop.mopBucket', [12.2, 0, 17.5], rng());
  pl('prop.coneWarning', [11.5, 0, 16.9], rng());
  pl('prop.fireExtinguisher', [-20.6, 0, 16.6], Math.PI / 2);
  onWall('prop.fireCabinet', 'z', 18, -1, -2, 1.2, 0.06);
  signOnWall('evacDiagram', 'z', 18, -1, 6, 1.5, { floor: 'G' });
  signOnWall('safetyPoster', 'z', 18, -1, -8, 1.6, { idx: 1 });
  signOnWall('safetyPoster', 'z', 18, -1, -1, 1.6, { idx: 2 });
  dc('floorDirt', { pos: [-10, 0, 16.5], seed: 9, size: 1.6 });
  dc('floorDirt', { pos: [8, 0, 16.5], seed: 10 });
  dc('ceilingLeak', { pos: [-3, 3.0, 16.5], normalAxis: 'y-', seed: 2 });
  dc('wallScuff', { pos: [0, 0.35, 17.92], normalAxis: 'z-', seed: 5 });
  dc('cableMarks', { pos: [12, 1.5, 17.92], normalAxis: 'z-', seed: 2 });
}

function dressSpine(rng) {
  pl('prop.consoleTable', [-2.24, 0, 10.5], -Math.PI / 2);
  pl('prop.brochureStack', [-2.26, 0.8, 10.3], -Math.PI / 2 + 0.2);
  pl('prop.plantFloor', [2.1, 0, 0.2], 0.9);
  pl('prop.plantFloor', [-2.15, 0, -4.4], 2.1);
  pl('prop.binRecycle', [2.2, 0, 8.0], Math.PI / 2);
  signOnWall('directional', 'x', 2.5, -1, 9.9, 1.8, {
    entries: [
      { text: 'Restrooms', dir: 'right' },
      { text: 'Server Room', dir: 'right' },
      { text: 'Copy & Mail', dir: 'up' },
    ],
  });
  signOnWall('roomSign', 'x', 2.5, -1, 5.75, 1.5, { number: 'G-10', name: 'Copy & Mail' });
  signOnWall('evacDiagram', 'x', -2.5, 1, 11.8, 1.5, { floor: 'G' });
  dc('carpetWear', { pos: [0, 0, 2], seed: 11, size: [1.6, 2.8] });
  dc('carpetWear', { pos: [0, 0, 10], seed: 12, size: [1.6, 2.6], rot: 0.04 });
  dc('wallScuff', { pos: [-2.42, 0.35, 5], normalAxis: 'x+', seed: 6 });
}

function dressMidCorr(rng) {
  onWall('prop.fireCabinet', 'z', 11.5, -1, 9, 1.2, 0.06);
  pl('prop.binTrash', [16.3, 0, 11.1], 0);
  pl('prop.binRecycle', [16.9, 0, 11.1], 0.2);
  signOnWall('roomSign', 'z', 8.5, 1, 10.15, 1.5, { number: 'G-11A', name: 'Restroom W' });
  signOnWall('roomSign', 'z', 8.5, 1, 14.75, 1.5, { number: 'G-11B', name: 'Restroom E' });
  signOnWall('roomSign', 'z', 8.5, 1, 19.0, 1.5, { number: 'G-12', name: 'Janitor' });
  signOnWall('roomSign', 'z', 11.5, -1, 14.95, 1.5, { number: 'G-13', name: 'Server Room' });
  signOnWall('notice', 'z', 11.5, -1, 13.35, 1.5, { idx: 1 });
  signOnWall('safetyPoster', 'z', 8.5, 1, 12.45, 1.6, { idx: 3 });
  dc('carpetWear', { pos: [8, 0, 10], seed: 13, size: [2.4, 1.3] });
  dc('carpetWear', { pos: [16, 0, 10], seed: 14, size: [2.2, 1.3] });
  dc('wallScuff', { pos: [12, 0.35, 11.42], normalAxis: 'z-', seed: 7 });
}

function dressArchive(rng) {
  for (const z of [-7.6, -5.4, -3.2]) {
    pl('prop.rackArchive', [-28, 0, z], 0);
  }
  pl('prop.deskStandard', [-28, 0, 0.02], 0);
  dressDesk([-28, 0, 0.02], 0, rng, { screenKind: 'monitor', tower: 1 });
  pl('prop.ladderStep', [-26.5, 0, -4.3], Math.PI / 2 + 0.2);
  pl('prop.boxCardboard', [-31.4, 0, -0.4], 0.3);
  pl('prop.boxCardboard', [-31.4, 0, 0.15], -0.2);
  pl('prop.folder', [-26.9, 0, -1.6], rng() * 2);
  // Half-packed evacuation box: open carton with files pulled but abandoned
  pl('prop.boxCardboard', [-27.5, 0, -1.05], 0.45, { variant: 'open' });
  pl('prop.paperStack', [-28.0, 0, -1.25], 0.2);
  pl('prop.folder', [-27.1, 0, -0.7], rng() * 2);
  signOnWall('deptSign', 'x', -24, -1, -4.75, 2.3, { name: 'Records Archive', sub: 'Meridian Facilities' });
  dc('dust', { pos: [-30.5, 0, -8.4], seed: 1, size: 1.1 });
  dc('dust', { pos: [-25.5, 0, -8.4], seed: 2 });
  dc('carpetWear', { pos: [-28, 0, -4.3], seed: 15, size: [1.2, 2.2] });
  dc('tapeTorn', { pos: [-31.2, 0, -0.9], seed: 1 });
}

function dressIt(rng) {
  for (const x of [-30.4, -28.8, -26.4]) {
    pl('prop.deskStandard', [x, 0, 0.98], Math.PI, { variant: 'worn' });
    dressDesk([x, 0, 0.98], Math.PI, rng, { screenKind: x === -26.4 ? 'dual' : 'monitor', tower: 0.8 });
  }
  pl('prop.shelvingUtility', [-27.6, 0, 9.27], 0);
  pl('prop.shelvingUtility', [-29.0, 0, 9.27], 0);
  pl('prop.boxCardboard', [-25.8, 0, 9.1], 0.4, { variant: 'open' });
  pl('prop.ups', [-31.55, 0, 1.6], Math.PI / 2);
  onWall('prop.switchShelf', 'z', 0.5, 1, -26, 1.62, 0.16);
  pl('prop.cableBundle', [-29.5, 0, 2.2], 0.3);
  pl('prop.cableBundle', [-27, 0, 5.0], 1.8);
  pl('prop.printerDesk', [-31.4, 0.72, 6.4], -Math.PI / 2, { variant: 'jam' });
  pl('prop.credenza', [-31.45, 0, 6.4], -Math.PI / 2);
  pl('prop.monitor', [-31.4, 0.72, 5.55], -Math.PI / 2 + 0.25, { variant: 'nosignal' });
  pl('prop.deskLamp', [-30.4, 0.75, 1.35], Math.PI - 0.4);
  pl('prop.chairTask', [-27.8, 0, 4.6], 2.4);
  whiteboardOn('z', 9.6, -1, -26.4, 0.9, 1);
  signOnWall('safetyPoster', 'z', 0.5, 1, -29.8, 1.7, { idx: 3 });
  signOnWall('notice', 'x', -24, -1, 5.1, 1.5, { idx: 3 });
  dc('cableMarks', { pos: [-28, 1.2, 0.58], normalAxis: 'z+', seed: 3 });
  dc('carpetWear', { pos: [-28.5, 0, 3], seed: 16, size: 1.6 });
  dc('dust', { pos: [-31.5, 0, 8.9], seed: 3 });
}

function dressFireStairG(rng) {
  pl('prop.fireExtinguisher', [-15.5, 0, 0.4], Math.PI / 2);
  signOnWall('stairLevel', 'x', -15, -1, -1.4, 1.7, { label: 'G' });
  dc('chippedPaint', { pos: [-15.08, 1.0, -2.5], normalAxis: 'x-', seed: 2 });
  dc('dust', { pos: [-16, 0, 0.6], seed: 4, size: 0.7 });
  dc('footprints', { pos: [-18.9, 0, -1.5], seed: 5, rot: 0.1 });
}

function dressOpenPlanA(rng) {
  for (const [cx, cz] of [[-11.5, -1.5], [-6.5, -1.5], [-11.5, 3.5], [-6.5, 3.5], [-11.5, 8.5], [-6.5, 8.5]]) {
    pod(cx, cz, rng);
  }
  // Endcap cover on the west aisle
  pl('prop.cabinetFiling', [-13.45, 0, 3.15], -Math.PI / 2);
  pl('prop.cabinetFiling', [-13.45, 0, 3.8], -Math.PI / 2, { variant: 'worn' });
  // Filing runs along the east wall — chest-high cover at the bay edge
  pl('prop.cabinetFiling', [-2.91, 0, 0.7], Math.PI / 2);
  pl('prop.cabinetFiling', [-2.91, 0, 1.35], Math.PI / 2, { variant: 'open' });
  pl('prop.cabinetFiling', [-2.91, 0, 9.7], Math.PI / 2);
  pl('prop.cabinetFiling', [-2.91, 0, 10.35], Math.PI / 2, { variant: 'worn' });
  pl('prop.paperStack', [-2.95, 1.33, 9.75], 0.4);
  // Someone left in a hurry: chair down, papers everywhere
  pl('prop.chairTask', [-8.6, 0, 1.05], 0.75, { variant: 'tipped' });
  pl('prop.paperSheet', [-8.0, 0, 0.6], rng() * 3);
  pl('prop.paperSheet', [-7.5, 0, 1.3], rng() * 3);
  pl('prop.paperSheet', [-8.9, 0, 1.9], rng() * 3);
  pl('prop.folder', [-7.9, 0, 1.7], rng() * 2);
  // South collaboration end
  pl('prop.tableRound', [-9, 0, 12.7], 0);
  for (let i = 0; i < 4; i++) {
    pl('prop.chairConference', lw([-9, 0, 12.7], 0, [Math.cos(i * 1.57 + 0.3) * 1.0, 0, Math.sin(i * 1.57 + 0.3) * 1.0]), -(i * 1.57 + 0.3) - Math.PI / 2 + (rng() - 0.5) * 0.3);
  }
  pl('prop.copierFloor', [-13.3, 0, 13.6], Math.PI / 2);
  pl('prop.paperTrays', [-13.3, 0, 12.5], Math.PI / 2 + 0.2);
  whiteboardOn('z', 15, -1, -8.2, 0.9, 0);
  pl('prop.plantFloor', [-3.1, 0, 14.4], 0.4);
  pl('prop.coatStand', [-14.5, 0, -4.4], 0);
  pl('prop.binRecycle', [-12.3, 0, 13.5], 0.4);
  onWall('prop.wallClock', 'z', -5, 1, -4, 2.4, 0.03);
  signOnWall('bulletinBoard', 'z', 15, -1, -11.5, 1.4, {});
  dc('carpetWear', { pos: [-9, 0, 1], seed: 17, size: [1.6, 2.0] });
  dc('carpetWear', { pos: [-9, 0, 6.8], seed: 18, size: [1.6, 2.0] });
  dc('carpetWear', { pos: [-13.9, 0, 4], seed: 19, size: [1.3, 2.4] });
  dc('wallScuff', { pos: [-3, 0.35, 10], normalAxis: 'x+', seed: 8 });
}

function dressOpenPlanB(rng) {
  pl('prop.lockerBank', [-20.65, 0, 5.6], -Math.PI / 2);
  pl('prop.lockerBank', [-20.65, 0, 6.9], -Math.PI / 2);
  pl('prop.tableRound', [-18, 0, 4.2], 0);
  for (let i = 0; i < 3; i++) {
    pl('prop.chairConference', lw([-18, 0, 4.2], 0, [Math.cos(i * 2.1) * 1.0, 0, Math.sin(i * 2.1) * 1.0]), -(i * 2.1) - Math.PI / 2 + (rng() - 0.5) * 0.4);
  }
  pl('prop.tableRound', [-17.6, 0, 9.0], 0);
  pl('prop.chairConference', [-18.6, 0, 9.2], Math.PI / 2 + 0.2);
  pl('prop.chairConference', [-16.7, 0, 8.6], -Math.PI / 2 - 0.4);
  pl('prop.laptop', [-17.8, 0.74, 9.1], 2.6);
  // A coat left draped over the chair back mid-evacuation
  pl('prop.coatDraped', lw([-18.6, 0.36, 9.2], Math.PI / 2 + 0.2, [0, 0, 0.24]), Math.PI / 2 + 0.2);
  pl('prop.sofa', [-17, 0, 13.5], 0);
  pl('prop.tableCoffee', [-17, 0, 12.3], 0);
  pl('prop.canDrink', [-16.7, 0.4, 12.2], rng());
  whiteboardOn('x', -15, -1, 10, 0.9, 2);
  signOnWall('bulletinBoard', 'x', -15, -1, 6.5, 1.4, {});
  pl('prop.plantFloor', [-20.5, 0, 14.4], 0);
  pl('prop.backpack', [-19.1, 0, 13.9], 0.8);
  // Filing run on the west wall — edge cover for the west bay
  pl('prop.cabinetFiling', [-20.61, 0, 8.75], -Math.PI / 2);
  pl('prop.cabinetFiling', [-20.61, 0, 9.4], -Math.PI / 2, { variant: 'open' });
  pl('prop.binderRow', [-20.63, 1.33, 9.07], -Math.PI / 2, { count: 3 });
  dc('carpetWear', { pos: [-18, 0, 6.6], seed: 20, size: 1.7 });
  dc('carpetWear', { pos: [-16, 0, 11.5], seed: 21, size: [1.3, 2.0] });
}

function dressConference(rng) {
  const tp = [5.5, 0, -1.2];
  pl('prop.tableConference', tp, 0);
  for (const x of [4.3, 5.1, 5.9, 6.7]) {
    pl('prop.chairConference', [x, 0, -2.18], Math.PI + (rng() - 0.5) * 0.3);
    pl('prop.chairConference', [x, 0, -0.22], (rng() - 0.5) * 0.3);
  }
  // table clutter
  pl('prop.laptop', [4.8, 0.75, -1.4], 0.3);
  pl('prop.paperStack', [6.1, 0.75, -1.0], 0.8);
  pl('prop.folder', [5.4, 0.75, -0.9], -0.4);
  pl('prop.mug', [6.5, 0.75, -1.5], rng());
  pl('prop.bottleWater', [4.4, 0.75, -0.9], 0);
  pl('prop.deskPhone', [5.5, 0.75, -1.55], Math.PI, { variant: 'offHook' });
  onWall('prop.displayWall', 'x', 13, -1, -1.2, 1.5, 0.05, { content: 'dashboard' });
  pl('prop.credenza', [4.0, 0, -4.58], Math.PI);
  pl('prop.coffeePot', [3.6, 0.72, -4.6], 0.4);
  pl('prop.cupPaper', [4.3, 0.72, -4.55], rng());
  // Meeting broke up mid-agenda: half-erased whiteboard, chair shoved back
  whiteboardOn('z', -5, 1, 4.2, 0.9, 3);
  pl('prop.chairConference', [7.6, 0, 0.6], 0.5, { variant: 'tipped' });
  pl('prop.paperSheet', [7.0, 0, -0.1], rng() * 3);
  onWall('prop.wallClock', 'z', 2.5, -1, 4.5, 2.35, 0.03);
  pl('prop.plantFloor', [3.3, 0, 1.8], 0.7);
  dc('carpetWear', { pos: [5.5, 0, -3.2], seed: 22, size: [2.6, 1.2] });
  dc('carpetWear', { pos: [9.5, 0, -1.2], seed: 23, size: 1.4 });
}

function dressBreakroom(rng) {
  // L-kitchen on the west wall
  pl('prop.kitchenRun', [13.35, 0, -3.5], -Math.PI / 2, { variant: 'sink' });
  pl('prop.kitchenRun', [13.35, 0, -1.7], -Math.PI / 2);
  pl('prop.kitchenWallCabinet', [13.26, 1.45, -3.5], -Math.PI / 2);
  pl('prop.kitchenWallCabinet', [13.26, 1.45, -1.7], -Math.PI / 2);
  pl('prop.refrigerator', [13.85, 0, -4.42], Math.PI, { variant: 'notes' });
  pl('prop.microwave', [13.35, 0.92, -2.5], -Math.PI / 2);
  pl('prop.coffeeMachine', [13.35, 0.92, -1.2], -Math.PI / 2);
  pl('prop.coffeePot', [13.4, 0.92, -0.85], -Math.PI / 2 + 0.4);
  pl('prop.kettle', [13.35, 0.92, -2.0], -Math.PI / 2 - 0.5);
  pl('prop.plateStack', [13.35, 0.92, -3.9], 0);
  if (density > 0.4) {
    pl('prop.foodContainer', [13.4, 0.92, -3.1], rng());
    pl('prop.snackBox', [13.3, 0.92, -1.55], rng());
    pl('prop.mug', [13.5, 0.92, -2.75], rng());
  }
  onWall('prop.dispenserTowel', 'x', 13, 1, -2.9, 1.25, 0.07);
  // Vending + cooler on the north wall, east of the corridor door
  pl('prop.vendingMachine', [19.3, 0, -4.45], Math.PI);
  sg('vendingHeader', { pos: lw([19.3, 0, -4.45], Math.PI, [-0.02, 1.68, -0.418]), rot: Math.PI });
  pl('prop.waterCooler', [20.35, 0, -4.5], Math.PI);
  // Dining
  for (const [tx, tz] of [[16, -2.5], [18.5, -0.5], [15.5, 0.9]]) {
    pl('prop.tableBreak', [tx, 0, tz], rng());
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      pl('prop.chairBreak', [tx + Math.cos(a) * 0.85, 0, tz + Math.sin(a) * 0.85], -a + Math.PI / 2 + (rng() - 0.5) * 0.5);
    }
    if (rng() < 0.7 * density) pl('prop.mug', [tx + (rng() - 0.5) * 0.4, 0.74, tz + (rng() - 0.5) * 0.4], rng() * 6);
    if (rng() < 0.4 * density) pl('prop.wrapperFood', [tx + (rng() - 0.5) * 0.5, 0.74, tz + (rng() - 0.5) * 0.5], rng() * 6);
    if (rng() < 0.35 * density) pl('prop.canDrink', [tx + (rng() - 0.5) * 0.4, 0.74, tz + (rng() - 0.5) * 0.4], rng());
  }
  pl('prop.binTrash', [20.5, 0, 1.9], 0.2, { variant: 'full' });
  pl('prop.binRecycle', [19.9, 0, 1.95], -0.1);
  // Abandoned lunch: container open, drink still standing, chair pushed out
  pl('prop.foodContainer', [16.15, 0.74, -2.35], 0.7, { variant: 'open' });
  pl('prop.canDrink', [16.4, 0.74, -2.6], rng());
  pl('prop.wrapperFood', [15.85, 0.74, -2.2], rng() * 4);
  pl('prop.cupCoffeeTakeout', [17.8, 0, -1.4], 0.9, { variant: 'dropped' });
  dc('waterStain', { pos: [17.65, 0, -1.55], seed: 45, size: 0.35 });
  signOnWall('bulletinBoard', 'z', 2.5, -1, 17.5, 1.4, {});
  signOnWall('notice', 'x', 13, 1, -2.2, 1.55, { idx: 0 });
  signOnWall('notice', 'x', 13, 1, -0.6, 1.5, { idx: 4, tilt: 0.06 });
  onWall('prop.wallClock', 'z', -5, 1, 19.8, 2.3, 0.03);
  signOnWall('safetyPoster', 'z', 2.5, -1, 15.2, 1.6, { idx: 0 });
  dc('floorDirt', { pos: [14, 0, -2.5], seed: 24, size: 1.2 });
  dc('waterStain', { pos: [20.3, 0, -4.1], seed: 25, size: 0.8 });
  dc('footprints', { pos: [17, 0, -3.6], seed: 26, rot: 1.4 });
}

function dressCopy(rng) {
  pl('prop.copierFloor', [5.0, 0, 3.05], Math.PI);
  // The jammed copier: service door ajar, panel reads PAPER JAM, note taped on
  pl('prop.copierFloor', [6.3, 0, 3.05], Math.PI, { variant: 'open' });
  sg('notice', { idx: 6, pos: lw([6.3, 0, 3.05], Math.PI, [0.15, 0.7, -0.35]), rot: Math.PI, tilt: -0.06 });
  pl('prop.paperSheet', [6.6, 0, 3.9], rng() * 3);
  pl('prop.deskStandard', [5.6, 0, 5.9], Math.PI / 2);
  pl('prop.deskStandard', [6.4, 0, 5.9], -Math.PI / 2);
  pl('prop.monitor', [5.35, 0.75, 5.9], Math.PI / 2, { variant: 'off' });
  pl('prop.paperTrays', [5.5, 0.75, 5.7], Math.PI / 2 + 0.2);
  pl('prop.paperStack', [6.3, 0.75, 6.1], 0.3);
  pl('prop.paperStack', [6.5, 0.75, 5.5], -0.5);
  pl('prop.paperSheet', [5.9, 0.75, 6.3], rng() * 3);
  pl('prop.scissors', [5.3, 0.75, 6.2], rng());
  pl('prop.tapeDispenser', [6.6, 0.75, 5.9], 1.2);
  pl('prop.shelfUnit', [9.22, 0, 4.2], Math.PI / 2);
  pl('prop.shelfUnit', [9.22, 0, 5.2], Math.PI / 2);
  pl('prop.binderRow', [9.22, 0.934, 4.2], Math.PI / 2);
  pl('prop.boxCardboard', [3.1, 0, 7.9], 0.3);
  pl('prop.boxCardboard', [3.7, 0, 8.05], -0.2);
  pl('prop.binRecycle', [4.6, 0, 7.95], 0.1, { variant: 'paper' });
  pl('prop.chairTask', [6.9, 0, 6.7], -2.2);
  signOnWall('notice', 'x', 2.5, 1, 6.4, 1.55, { idx: 3 });
  signOnWall('notice', 'x', 2.5, 1, 7.1, 1.5, { idx: 5, tilt: -0.05 });
  dc('floorDirt', { pos: [5.6, 0, 4.2], seed: 27 });
  dc('tapeTorn', { pos: [8.5, 0, 6.8], seed: 2 });
  dc('carpetWear', { pos: [5.8, 0, 6.9], seed: 28, size: 1.2 });
}

function dressRestroom(rng) {
  // Room 9.5..16 × 2.5..8.5; doors on the north wall at x 10.4–11.3 and
  // 13.6–14.5. One stall run backs onto the SOUTH wall (fronts at z ≈ 4.09,
  // doors ajar/open so stall interiors stay enterable: 1.08 m clear width).
  // Vanities hug the side walls; the whole centre (x 10.2–15.3, z 4.1–8.4)
  // stays an open circulation area well over 1.1 m wide in every lane.
  const zc = 3.33; // stall centres: back edge at wall face 2.58, front stile at ~4.09
  pl('prop.stallPartition', [10.15, 0, zc], Math.PI, { variant: 'ajar' });
  pl('prop.stallPartition', [11.27, 0, zc], Math.PI, { variant: 'open' });
  pl('prop.stallPartition', [12.39, 0, zc], Math.PI, { variant: 'ajar' });
  pl('prop.stallPartition', [13.51, 0, zc], Math.PI, { variant: 'panelOnly' });
  pl('prop.toilet', [10.15, 0, 2.93], Math.PI);
  pl('prop.toilet', [11.27, 0, 2.93], Math.PI, { variant: 'lidUp' });
  pl('prop.toilet', [12.39, 0, 2.93], Math.PI);
  // West (women's) vanity run
  pl('prop.vanityUnit', [9.87, 0, 6.4], -Math.PI / 2);
  onWall('prop.mirrorWall', 'x', 9.5, 1, 6.4, 1.4, 0.02);
  onWall('prop.dispenserSoap', 'x', 9.5, 1, 5.45, 1.1, 0.06);
  onWall('prop.dispenserTowel', 'x', 9.5, 1, 7.5, 1.25, 0.07);
  // East (men's): urinals on the south wall beyond the stall run + vanity
  onWall('prop.urinal', 'z', 2.5, 1, 14.35, 0.45, 0.17);
  onWall('prop.urinal', 'z', 2.5, 1, 15.1, 0.45, 0.17);
  pl('prop.vanityUnit', [15.63, 0, 6.4], Math.PI / 2);
  onWall('prop.mirrorWall', 'x', 16, -1, 6.4, 1.4, 0.02);
  onWall('prop.dispenserSoap', 'x', 16, -1, 5.45, 1.1, 0.06);
  onWall('prop.dispenserTowel', 'x', 16, -1, 7.5, 1.25, 0.07);
  onWall('prop.handDryer', 'z', 8.5, -1, 15.4, 1.15, 0.1);
  pl('prop.binTrash', [12.45, 0, 8.1], 0.1);
  dc('waterStain', { pos: [10.4, 0, 6.2], seed: 29, size: 0.8 });
  dc('waterStain', { pos: [15.2, 0, 6.0], seed: 30, size: 0.7 });
  dc('floorDirt', { pos: [12.6, 0, 5.2], seed: 31, size: 0.9 });
  dc('fingerprints', { pos: [9.62, 1.4, 6.7], normalAxis: 'x+', seed: 3, size: 0.5 });
}

function dressJanitor(rng) {
  pl('prop.shelvingUtility', [18.0, 0, 2.85], Math.PI, { fill: 0.35 });
  pl('prop.cleaningBottles', [17.6, 0.678, 2.85], 0.3);
  pl('prop.cleaningBottles', [18.4, 1.198, 2.85], 1.2);
  pl('prop.janitorCart', [16.9, 0, 5.6], 0.3);
  pl('prop.mopBucket', [16.5, 0, 3.6], rng());
  onWall('prop.mopLean', 'x', 16, 1, 4.3, 0, 0.12);
  onWall('prop.broomLean', 'x', 16, 1, 4.9, 0, 0.12);
  pl('prop.wetFloorSign', [17.6, 0, 7.6], 1.2);
  sg('wetFloorFaces', { pos: [17.6, 0, 7.6], rot: 1.2 });
  pl('prop.boxCardboard', [20.4, 0, 3.0], 0.2);
  onWall('prop.dispenserTowel', 'x', 21, -1, 5.8, 1.25, 0.07);
  onWall('prop.cableDrop', 'x', 21, -1, 6.8, 0.6, 0.03);
  signOnWall('equipLabel', 'x', 16, 1, 6.2, 1.6, { text: 'MOP SINK — RINSE' });
  dc('floorDirt', { pos: [17.5, 0, 4.6], seed: 32, size: 1.4 });
  dc('waterStain', { pos: [16.6, 0, 4.2], seed: 33 });
  dc('wallScuff', { pos: [16.08, 0.4, 5.5], normalAxis: 'x+', seed: 9 });
}

function dressStairwell(rng) {
  pl('prop.fireExtinguisher', [9.6, 0, 14.5], Math.PI / 2);
  signOnWall('stairLevel', 'x', 2.5, 1, 11.85, 1.7, { label: 'G' });
  dc('chippedPaint', { pos: [2.58, 1.1, 12.6], normalAxis: 'x+', seed: 3 });
  dc('footprints', { pos: [3.3, 0, 13.2], seed: 6, rot: Math.PI / 2 });
}

function dressServer(rng) {
  const rackNames = ['RACK A', 'RACK B', 'RACK C', 'RACK D'];
  [12.3, 13.0, 13.7, 14.4].forEach((x, i) => {
    pl('prop.serverRack', [x, 0, 14.28], 0, { variant: i === 2 ? 'openDoor' : undefined });
    if (i % 2 === 0) sg('equipLabel', { text: rackNames[i], pos: [x, 1.86, 13.77], rot: 0 });
  });
  [16.2, 16.9, 17.6].forEach((x, i) => {
    pl('prop.serverRack', [x, 0, 12.38], Math.PI);
    if (i === 1) sg('equipLabel', { text: 'RACK E', pos: [x, 1.86, 12.89], rot: Math.PI });
  });
  pl('prop.ups', [10.45, 0, 12.0], -Math.PI / 2);
  pl('prop.ups', [10.45, 0, 12.75], -Math.PI / 2);
  onWall('prop.switchShelf', 'z', 11.5, 1, 12.2, 1.62, 0.16);
  pl('prop.deskStandard', [11.0, 0, 13.6], -Math.PI / 2);
  pl('prop.securityMonitorBank', [11.15, 0.75, 13.9], -Math.PI / 2);
  pl('prop.monitor', [11.1, 0.75, 13.06], -Math.PI / 2, { content: 'rack' });
  pl('prop.keyboard', [10.85, 0.75, 13.06], -Math.PI / 2);
  pl('prop.chairTask', [11.85, 0, 13.55], Math.PI / 2 + 0.3);
  pl('prop.cableBundle', [13.4, 0, 13.4], 0.1);
  pl('prop.cableBundle', [16.8, 0, 13.3], 1.3);
  pl('prop.boxCardboard', [19.8, 0, 12.2], 0.4, { variant: 'open' });
  pl('prop.smokeDetector', [15, 3.2, 13.2], 0);
  signOnWall('notice', 'z', 11.5, 1, 16.6, 1.5, { idx: 1 });
  dc('cableMarks', { pos: [14, 1.4, 11.58], normalAxis: 'z+', seed: 4 });
  dc('dust', { pos: [19.5, 0, 14.5], seed: 5 });
  dc('floorDirt', { pos: [12.5, 0, 13.3], seed: 34, size: 0.9 });
}

function dressLoading(rng) {
  pl('prop.palletLoad', [29.2, 0, -7.6], 0.06);
  pl('prop.palletLoad', [28.4, 0, -0.4], -0.1);
  pl('prop.pallet', [30.6, 0, -7.0], 0.35);
  pl('prop.crateShipping', [26.4, 0, -6.4], 0.15);
  pl('prop.crateShipping', [27.5, 0, -5.9], -0.08);
  pl('prop.boxCardboard', [26.9, 0.9, -6.15], 0.5);
  sg('shippingLabel', { idx: 0, pos: lw([26.4, 0, -6.4], 0.15, [0.25, 0.5, -0.41]), rot: 0.15 });
  sg('shippingLabel', { idx: 1, pos: lw([27.5, 0, -5.9], -0.08, [-0.2, 0.45, -0.41]), rot: -0.08 });
  sg('shippingLabel', { idx: 2, pos: lw([28.4, 0, -0.4], -0.1, [0.2, 0.7, -0.51]), rot: -0.1 });
  pl('prop.handTruck', [31.2, 0, 0.9], Math.PI / 2 + 0.4);
  pl('prop.barrier', [27.6, 0, -4.1], 0.15);
  sg('hazardStripe', { pos: lw([27.6, 0, -4.1], 0.15, [0, 0.82, -0.022]), rot: 0.15 });
  sg('hazardStripe', { pos: lw([27.6, 0, -4.1], 0.15, [0, 0.82, 0.022]), rot: 0.15 + Math.PI });
  pl('prop.shelvingUtility', [29.5, 0, 4.62], 0);
  pl('prop.boxCardboard', [30.6, 0, 4.4], 0.25);
  pl('prop.drum', [31.4, 0, 2.9], rng());
  pl('prop.matFloor', [30.8, 0, -4.5], Math.PI / 2);
  onWall('prop.garagePanel', 'x', 32, -1, -1.6, 1.3, 0.06);
  sg('equipLabel', { text: 'DOCK DOOR 1', pos: [31.9, 1.7, -1.6], rot: Math.PI / 2 });
  pl('prop.fireExtinguisher', [24.3, 0, 0.3], -Math.PI / 2);
  pl('prop.coneWarning', [29.9, 0, -2.2], rng());
  signOnWall('deptSign', 'x', 24, 1, -7.5, 2.9, { name: 'Polar Logistics', sub: 'Goods In — Dock 2' });
  signOnWall('safetyPoster', 'x', 24, 1, 2.5, 1.6, { idx: 1 });
  signOnWall('securityNotice', 'x', 32, -1, -0.6, 1.6, {});
  dc('floorDirt', { pos: [28, 0, -3], seed: 35, size: 2.0 });
  dc('floorDirt', { pos: [26, 0, 1.5], seed: 36, size: 1.5 });
  dc('snowTracks', { pos: [30.8, 0, -4.4], seed: 7, rot: Math.PI / 2 });
  dc('tapeTorn', { pos: [27.2, 0, -6.9], seed: 3 });
  dc('chippedPaint', { pos: [24.08, 0.9, -5], normalAxis: 'x+', seed: 4 });
  dc('cableMarks', { pos: [31.92, 1.2, 2], normalAxis: 'x-', seed: 5 });
}

function dressGarage(rng) {
  pl('prop.drum', [24.75, 0, 5.7], rng());
  pl('prop.drum', [24.95, 0, 6.3], rng() * 2, { variant: 'dark' });
  pl('prop.shelvingUtility', [31.6, 0, 6.6], Math.PI / 2);
  pl('prop.toolCase', [31.3, 0, 7.6], 1.2);
  pl('prop.ladderStep', [24.7, 0, 10.8], -0.4);
  // Staged freight near the extraction bay: pallet + double-stacked crates
  // form waist/chest-high cover facing the shutter without touching the zone
  pl('prop.palletLoad', [26.3, 0, 9.0], 0.08);
  pl('prop.crateShipping', [26.1, 0, 10.35], -0.06);
  pl('prop.crateShipping', [26.1, 0.9, 10.35], 0.18);
  sg('shippingLabel', { idx: 1, pos: lw([26.1, 0, 10.35], -0.06, [0.3, 0.5, -0.41]), rot: -0.06 });
  sg('shippingLabel', { idx: 2, pos: lw([26.1, 0.9, 10.35], 0.18, [-0.25, 0.45, -0.41]), rot: 0.18 });
  pl('prop.crateShipping', [29.6, 0, 9.2], 0.3);
  pl('prop.boxCardboard', [29.45, 0.9, 9.15], 0.55);
  pl('prop.pallet', [28.3, 0, 8.3], -0.15);
  pl('prop.handTruck', [24.9, 0, 17.3], 2.4);
  onWall('prop.pipeManifold', 'x', 24, 1, 6.2, 0, 0.18);
  pl('prop.barrier', [28, 0, 11.35], 0);
  sg('hazardStripe', { pos: [28, 0.82, 11.33], rot: 0 });
  sg('hazardStripe', { pos: [28, 0.82, 11.37], rot: Math.PI });
  pl('prop.coneWarning', [25.1, 0, 11.85], rng());
  pl('prop.coneWarning', [30.85, 0, 11.85], rng());
  onWall('prop.garagePanel', 'x', 32, -1, 15.1, 1.3, 0.06);
  sg('equipLabel', { text: 'DOCK DOOR 2', pos: [31.9, 1.7, 15.1], rot: Math.PI / 2 });
  pl('prop.fireExtinguisher', [24.3, 0, 9.4], -Math.PI / 2);
  pl('prop.matFloor', [31.0, 0, 10.85], Math.PI / 2);
  signOnWall('securityNotice', 'x', 32, -1, 16.4, 1.5, {});
  signOnWall('safetyPoster', 'x', 24, 1, 10.9, 1.6, { idx: 2 });
  dc('floorDirt', { pos: [28, 0, 8.5], seed: 37, size: 2.2 });
  dc('floorDirt', { pos: [26, 0, 14.5], seed: 38, size: 1.6 });
  dc('snowTracks', { pos: [30.5, 0, 11.5], seed: 8, rot: Math.PI / 2 });
  dc('chippedPaint', { pos: [24.08, 1.1, 12.5], normalAxis: 'x+', seed: 5 });
  dc('waterStain', { pos: [29, 0, 6.5], seed: 39, size: 1.2 });
}

/* ================================================================== */
/* ROOMS — upper floor                                                 */
/* ================================================================== */

function dressMezz(rng) {
  pl('prop.sofa', [-16, UP, -11.7], 0);
  pl('prop.tableCoffee', [-16, UP, -12.5], 0);
  pl('prop.brochureStack', [-16.2, UP + 0.4, -12.4], 0.4);
  pl('prop.chairLounge', [-14.1, UP, -11.9], Math.PI / 2);
  pl('prop.plantFloor', [-19.5, UP, -12.4], 0.8);
  pl('prop.chairWaiting', [17.6, UP, -12.35], Math.PI / 2);
  pl('prop.chairWaiting', [18.4, UP, -12.35], Math.PI / 2);
  pl('prop.tableSide', [16.9, UP, -12.35], 0);
  sg('directory', { floor: 'upper', pos: [13.5, UP, -11], rot: -0.2 });
  signOnWall('artPrint', 'z', -13, 1, 12.1, UP + 1.5, { idx: 0 });
  dc('carpetWear', { pos: [-10, UP, -11], seed: 40, size: [2.6, 1.5] });
  dc('carpetWear', { pos: [8, UP, -11], seed: 41, size: [2.4, 1.5] });
}

function dressExecCorr(rng) {
  pl('prop.displayCase', [-1.5, UP, -5.55], 0);
  pl('prop.displayCase', [3.5, UP, -5.55], 0);
  sg('brandLogo', { wide: true, pos: [1, UP + 1.9, -5.09], rot: 0 });
  pl('prop.consoleTable', [12, UP, -5.42], 0);
  pl('prop.plantDesk', [11.7, UP + 0.8, -5.45], 0);
  pl('prop.plantFloor', [20.2, UP, -5.7], 0.4);
  pl('prop.plantFloor', [-20.2, UP, -8.3], 1.1);
  signOnWall('artPrint', 'z', -5, -1, -16.5, UP + 1.5, { idx: 0 });
  signOnWall('evacDiagram', 'z', -5, -1, -17.8, UP + 1.5, { floor: '1' });
  signOnWall('deptSign', 'z', -5, -1, 13.5, UP + 1.9, { name: 'Northwind People Team', sub: 'Executive Suite' });
  dc('carpetWear', { pos: [-8, UP, -7], seed: 42, size: [2.6, 1.4] });
  dc('carpetWear', { pos: [6, UP, -7], seed: 43, size: [2.4, 1.4] });
}

function dressFireStairU(rng) {
  signOnWall('stairLevel', 'x', -15, -1, -3.2, UP + 1.7, { label: '1' });
  dc('chippedPaint', { pos: [-15.08, UP + 1.0, -3.6], normalAxis: 'x-', seed: 6 });
  dc('dust', { pos: [-20, UP, -3.4], seed: 6, size: 0.6 });
}

function dressBoardroom(rng) {
  const tp = [-8.75, UP, -0.5];
  pl('prop.tableBoardroom', tp, 0);
  for (const x of [-10.3, -9.25, -8.2, -7.15]) {
    pl('prop.chairExec', [x, UP, -1.55], Math.PI + (rng() - 0.5) * 0.25);
    pl('prop.chairExec', [x, UP, 0.55], (rng() - 0.5) * 0.25);
  }
  pl('prop.chairExec', [-11.55, UP, -0.5], -Math.PI / 2);
  pl('prop.chairExec', [-5.95, UP, -0.5], Math.PI / 2);
  pl('prop.paperStack', [-9.5, UP + 0.75, -0.8], 0.3);
  pl('prop.folder', [-8.1, UP + 0.75, -0.3], -0.6);
  pl('prop.laptop', [-9.9, UP + 0.75, -0.2], 0.2);
  pl('prop.deskPhone', [-8.75, UP + 0.75, -0.55], 0, { variant: 'offHook' });
  pl('prop.mug', [-7.4, UP + 0.75, -0.9], rng());
  pl('prop.bottleWater', [-10.4, UP + 0.75, -0.7], 0);
  onWall('prop.displayWall', 'x', -15, -1, -2.2, UP + 1.5, 0.05);
  pl('prop.credenza', [-12, UP, 3.62], 0);
  pl('prop.cupPaper', [-12.4, UP + 0.72, 3.6], rng());
  pl('prop.plateStack', [-11.6, UP + 0.72, 3.65], 0);
  whiteboardOn('z', 4, -1, -4.5, UP + 0.9, 1);
  pl('prop.plantFloor', [-3.1, UP, 3.4], 0.5);
  onWall('prop.wallClock', 'z', 4, -1, -12.9, UP + 2.35, 0.03);
  dc('carpetWear', { pos: [-8.75, UP, -3.2], seed: 44, size: [2.8, 1.2] });
}

function dressBoardroomW(rng) {
  // 6 × 3 m bay: keep all furniture against the walls so the centre band
  // (z 1.8–3.0) stays a continuous walkable strip to the boardroom arch.
  pl('prop.credenza', [-18, UP, 1.35], Math.PI);
  pl('prop.coffeeMachine', [-18.5, UP + 0.72, 1.35], 0.2);
  pl('prop.mug', [-17.6, UP + 0.72, 1.3], rng());
  pl('prop.plateStack', [-17.2, UP + 0.72, 1.4], 0);
  pl('prop.chairLounge', [-19.6, UP, 3.48], 0.15);
  pl('prop.chairLounge', [-18.3, UP, 3.48], -0.2);
  pl('prop.tableSide', [-18.95, UP, 3.6], 0);
  pl('prop.coatStand', [-20.55, UP, 3.6], 0);
  signOnWall('artPrint', 'z', 1, 1, -19, UP + 1.5, { idx: 1 });
  dc('carpetWear', { pos: [-18, UP, 2.3], seed: 45, size: 1.2 });
}

function dressRecords2(rng) {
  for (const z of [6.5, 9, 11.5]) {
    pl('prop.rackArchive', [-13, UP, z], 0);
    pl('prop.rackArchive', [-18.5, UP, z], 0);
  }
  pl('prop.cabinetFiling', [-2.98, UP, 9.25], -Math.PI / 2);
  pl('prop.cabinetFiling', [-2.98, UP, 9.9], -Math.PI / 2, { variant: 'open' });
  pl('prop.deskStandard', [-17.5, UP, 14.4], 0);
  pl('prop.laptop', [-17.5, UP + 0.75, 14.55], 0.15);
  pl('prop.deskLamp', [-18.1, UP + 0.75, 14.6], 0.6);
  pl('prop.chairTask', [-17.4, UP, 13.6], Math.PI + 0.3);
  pl('prop.boxCardboard', [-6.2, UP, 13.6], 0.4);
  pl('prop.boxCardboard', [-5.6, UP, 13.75], -0.3, { variant: 'open' });
  pl('prop.ladderStep', [-15.75, UP, 7.8], Math.PI / 2);
  pl('prop.folder', [-14.5, UP, 10.2], rng() * 2);
  signOnWall('deptSign', 'x', -2.5, 1, 9.6, UP + 2.3, { name: 'Records Annex', sub: 'Authorised Staff Only' });
  dc('dust', { pos: [-19.5, UP, 5.2], seed: 7 });
  dc('dust', { pos: [-11.5, UP, 12.8], seed: 8 });
  dc('waterStain', { pos: [-8, UP, 6.5], seed: 46 });
  dc('carpetWear', { pos: [-15.75, UP, 9], seed: 47, size: [1.1, 2.4] });
}

function dressExecSpine(rng) {
  pl('prop.consoleTable', [2.15, UP, 1.0], Math.PI / 2);
  pl('prop.plantDesk', [2.18, UP + 0.8, 0.8], 0);
  pl('prop.plantFloor', [-2.15, UP, 3.0], 0.7);
  signOnWall('artPrint', 'x', -2.5, 1, 9.8, UP + 1.5, { idx: 2 });
  signOnWall('evacDiagram', 'x', -2.5, 1, 3.5, UP + 1.5, { floor: '1' });
  signOnWall('roomSign', 'x', -2.5, 1, 7.65, UP + 1.5, { number: 'U-07', name: 'Records Annex' });
  dc('carpetWear', { pos: [0, UP, 2], seed: 48, size: [1.5, 2.6] });
  dc('carpetWear', { pos: [0, UP, 10], seed: 49, size: [1.5, 2.4] });
}

function dressExecAnte(rng) {
  for (const x of [6.5, 10]) {
    pl('prop.deskStandard', [x, UP, -0.8], Math.PI);
    dressDesk([x, UP, -0.8], Math.PI, rng, { screenKind: x === 6.5 ? 'dual' : 'monitor', tower: 0.6 });
  }
  sg('nameplate', { name: 'K. HALVORSEN', title: 'Executive Assistant', pos: [6.2, UP + 0.75, -1.12], rot: 0 });
  sg('nameplate', { name: 'T. OKAFOR', title: 'Diary & Travel', pos: [10.3, UP + 0.75, -1.12], rot: 0 });
  pl('prop.cabinetFiling', [3.6, UP, -4.5], Math.PI);
  pl('prop.cabinetFiling', [4.2, UP, -4.5], Math.PI);
  pl('prop.credenza', [13, UP, -4.6], Math.PI);
  pl('prop.printerDesk', [13, UP + 0.72, -4.6], Math.PI);
  pl('prop.paperTrays', [13.8, UP + 0.72, -4.55], 0.2);
  pl('prop.sofa', [20.35, UP, -1.5], Math.PI / 2);
  pl('prop.tableCoffee', [19.2, UP, -1.5], Math.PI / 2);
  pl('prop.brochureStack', [19.2, UP + 0.4, -1.4], 0.7);
  pl('prop.plantFloor', [20.3, UP, -4.5], 0.3);
  onWall('prop.wallClock', 'z', -5, 1, 15.5, UP + 2.35, 0.03);
  signOnWall('roomSign', 'z', 2.5, -1, 6.7, UP + 1.5, { number: 'U-04', name: 'Executive\nOffice' });
  dc('carpetWear', { pos: [8, UP, -2.6], seed: 50, size: [2.2, 1.3] });
}

function dressExec(rng) {
  // Area rug under the desk group; the desk furniture sits on its 16 mm pile
  const RUG = 0.016;
  pl('prop.rugArea', [12, UP, 7.0], 0);
  const dp = [12, UP + RUG, 6.8];
  pl('prop.deskExec', dp, 0);
  pl('prop.chairExec', [12.1, UP + RUG, 7.95], 0.15);
  pl('prop.monitor', [11.6, UP + RUG + 0.76, 7.1], 0.1);
  pl('prop.laptop', [12.6, UP + RUG + 0.76, 6.9], -0.25);
  pl('prop.deskPhone', [11.1, UP + RUG + 0.76, 6.9], 0.4);
  pl('prop.paperStack', [12.9, UP + RUG + 0.76, 6.6], 0.2);
  pl('prop.photoFrame', [11.3, UP + RUG + 0.76, 7.25], 0.5);
  pl('prop.pen', [12.2, UP + RUG + 0.76, 6.55], rng());
  sg('nameplate', { name: 'R. VOSS', title: 'Chief Executive', pos: [12, UP + RUG + 0.76, 6.32], rot: 0 });
  pl('prop.chairConference', [11.2, UP, 5.5], Math.PI + 0.2);
  pl('prop.chairConference', [12.8, UP, 5.5], Math.PI - 0.15);
  // Small meeting group, west end
  pl('prop.tableRound', [6, UP, 7.5], 0);
  for (let i = 0; i < 3; i++) {
    pl('prop.chairConference', lw([6, UP, 7.5], 0, [Math.cos(i * 2.1 + 0.6), 0, Math.sin(i * 2.1 + 0.6)]), -(i * 2.1 + 0.6) - Math.PI / 2);
  }
  pl('prop.laptop', [5.8, UP + 0.74, 7.4], 2.9);
  pl('prop.bookcase', [9.0, UP, 2.85], Math.PI);
  pl('prop.bookcase', [9.95, UP, 2.85], Math.PI);
  pl('prop.credenza', [11.5, UP, 9.66], 0);
  pl('prop.plantDesk', [10.85, UP + 0.72, 9.7], 0.6);
  pl('prop.briefcase', [10.6, UP, 9.3], 1.9);
  pl('prop.coatStand', [3.3, UP, 3.3], 0, { variant: 'coat' });
  pl('prop.plantFloor', [20.4, UP, 9.6], 0.9);
  // East-end reading corner along the window (kept 1.5 m+ clear of the
  // hostage spot at [17, 7.4]): lounge chairs, decanter table, floor lamp
  pl('prop.chairLounge', [19.35, UP, 5.35], Math.PI + 0.45);
  pl('prop.chairLounge', [19.5, UP, 8.95], -0.35);
  pl('prop.tableSide', [19.95, UP, 7.15], 0.3);
  pl('prop.decanterSet', [19.95, UP + 0.515, 7.15], 0.5);
  pl('prop.lampFloor', [20.25, UP, 3.3], 0);
  // Original art on the veneer walls
  signOnWall('artPrint', 'x', 2.5, 1, 7.6, UP + 1.5, { idx: 1 });
  signOnWall('artPrint', 'z', 10, -1, 14.6, UP + 1.5, { idx: 0 });
  signOnWall('artPrint', 'z', 2.5, 1, 15.0, UP + 1.55, { idx: 2 });
  dc('carpetWear', { pos: [12, UP, 5.6], seed: 51, size: 1.6 });
  dc('carpetWear', { pos: [7, UP, 4.5], seed: 52, size: [1.4, 2.0] });
  dc('carpetWear', { pos: [18, UP, 6.6], seed: 55, size: 1.3 });
}

function dressExecGal(rng) {
  pl('prop.plantFloor', [20.5, UP, 10.75], 0.5);
  signOnWall('artPrint', 'z', 11.5, -1, 12.2, UP + 1.5, { idx: 2 });
  dc('carpetWear', { pos: [12, UP, 10.75], seed: 53, size: [2.4, 1.0] });
}

function dressLanding(rng) {
  signOnWall('stairLevel', 'x', 2.5, 1, 11.8, UP + 1.7, { label: '1' });
  dc('footprints', { pos: [3.2, UP, 13.2], seed: 9, rot: Math.PI / 2 });
}

function dressExecLounge(rng) {
  pl('prop.kitchenRun', [18.8, UP, 11.87], Math.PI);
  pl('prop.coffeeMachine', [18.4, UP + 0.92, 11.85], Math.PI - 0.2);
  pl('prop.mug', [19.3, UP + 0.92, 11.85], rng());
  pl('prop.mug', [19.55, UP + 0.92, 11.9], rng() * 2);
  pl('prop.kettle', [17.9, UP + 0.92, 11.85], Math.PI);
  pl('prop.waterCooler', [17.5, UP, 11.9], Math.PI);
  pl('prop.sofa', [17, UP, 14.35], Math.PI);
  pl('prop.chairLounge', [14.1, UP, 13.6], -Math.PI / 2);
  pl('prop.chairLounge', [19.75, UP, 13.35], Math.PI / 2);
  pl('prop.tableCoffee', [16.9, UP, 13.3], 0);
  pl('prop.brochureStack', [16.7, UP + 0.4, 13.2], 0.9);
  pl('prop.cupCoffeeTakeout', [17.2, UP + 0.4, 13.5], rng());
  pl('prop.plantFloor', [10.45, UP, 14.55], 0.2);
  pl('prop.tableSide', [13.3, UP, 14.6], 0);
  signOnWall('artPrint', 'x', 10, 1, 12.6, UP + 1.6, { idx: 2 });
  signOnWall('notice', 'x', 10, 1, 13.5, UP + 1.45, { idx: 5 });
  dc('carpetWear', { pos: [16.5, UP, 13], seed: 54, size: 1.5 });
}

/* ================================================================== */
/* EXTERIOR                                                            */
/* ================================================================== */

function dressCourt(rng) {
  // Flank the cleared entrance path; spawn walks down x=0
  for (const sx of [-1, 1]) {
    pl('prop.planterExt', [sx * 3.4, 0, -22.8], 0);
    pl('prop.planterExt', [sx * 3.4, 0, -26.3], 0);
    pl('prop.bollard', [sx * 2.2, 0, -21.5], 0);
    pl('prop.bollard', [sx * 4.4, 0, -21.5], 0);
  }
  pl('prop.lightPole', [-12, 0, -27], 0);
  pl('prop.lightPole', [12, 0, -27], 0);
  pl('prop.bikeRack', [8.5, 0, -21.2], 0);
  pl('prop.gritBin', [-8.5, 0, -21.1], 0.15);
  sg('gritLabel', { pos: lw([-8.5, 0, -21.1], 0.15, [0, 0.42, -0.315]), rot: 0.15 });
  pl('prop.snowDrift', [-19, 0, -21.3], 0.4);
  pl('prop.snowDrift', [17, 0, -21.5], -0.3, { scale: 1.2 });
  pl('prop.snowDrift', [-22.5, 0, -31.5], 0.9, { scale: 1.4 });
  pl('prop.snowDrift', [20.5, 0, -30], 2.2);
  pl('prop.snowDrift', [-6, 0, -32.5], 1.3);
  dc('snowTracks', { pos: [0, 0.02, -23], seed: 10 });
  dc('snowTracks', { pos: [0.3, 0.02, -26.5], seed: 11 });
  dc('footprints', { pos: [-6, 0.02, -24], seed: 12, rot: 0.9 });
  dc('footprints', { pos: [5, 0.02, -22], seed: 13, rot: -0.6 });
}

function dressWestYard(rng) {
  pl('prop.gritBin', [-25.2, 0, 11.2], -Math.PI / 2);
  sg('gritLabel', { pos: lw([-25.2, 0, 11.2], -Math.PI / 2, [0, 0.42, -0.315]), rot: -Math.PI / 2 });
  pl('prop.drum', [-25.6, 0, 20.6], rng());
  pl('prop.drum', [-26.3, 0, 20.3], rng() * 2);
  pl('prop.crateShipping', [-30.5, 0, 20.4], 0.2);
  pl('prop.pallet', [-33, 0, 18.6], 0.7);
  pl('prop.lightPole', [-30, 0, 15.5], 0);
  pl('prop.snowDrift', [-34.5, 0, 12], 0.5, { scale: 1.3 });
  pl('prop.snowDrift', [-27, 0, 21.4], 1.8);
  pl('prop.coneWarning', [-28, 0, 12.4], rng());
  dc('snowTracks', { pos: [-26, 0.02, 14], seed: 14, rot: 0.3 });
}

function dressEastYard(rng) {
  const vp = [37.5, 0, 13.5];
  const vy = Math.PI / 2;
  pl('prop.vanUtility', vp, vy);
  sg('vanLivery', { pos: lw(vp, vy, [-1.05, 1.2, 0.85]), rot: vy + Math.PI / 2 });
  sg('vanLivery', { pos: lw(vp, vy, [1.05, 1.2, 0.85]), rot: vy - Math.PI / 2 });
  pl('prop.lightPole', [42, 0, 6], 0);
  pl('prop.lightPole', [36, 0, 19.5], 0);
  pl('prop.gritBin', [33, 0, 4.2], Math.PI / 2);
  pl('prop.bollard', [32.8, 0, 7.4], 0);
  pl('prop.bollard', [32.8, 0, 16], 0);
  pl('prop.crateShipping', [34.2, 0, 19.8], 0.4);
  pl('prop.drum', [33.5, 0, 20.4], rng());
  pl('prop.coneWarning', [33.2, 0, 11.4], rng());
  pl('prop.snowDrift', [44, 0, 9], 1.1, { scale: 1.5 });
  pl('prop.snowDrift', [40, 0, 20.5], 0.3, { scale: 1.2 });
  pl('prop.snowDrift', [34, 0, 2.8], 2.0);
  dc('snowTracks', { pos: [33.5, 0.02, 12], seed: 15, rot: Math.PI / 2 });
  dc('snowTracks', { pos: [36, 0.02, 12.5], seed: 16, rot: Math.PI / 2 });
  dc('footprints', { pos: [33, 0.02, 9], seed: 17, rot: 2.4 });
}

/* ================================================================== */
/* ENTRY POINT                                                         */
/* ================================================================== */

const ROOM_DRESSERS = [
  ['mechanical', dressMechanical],
  ['vestibule', dressVestibule],
  ['lobby', dressLobby],
  ['waiting', dressWaiting],
  ['northcorr', dressNorthCorr],
  ['westcorr', dressWestCorr],
  ['eastcorr', dressEastCorr],
  ['southcorr', dressSouthCorr],
  ['spine', dressSpine],
  ['midcorr', dressMidCorr],
  ['archive', dressArchive],
  ['it', dressIt],
  ['firestair', dressFireStairG],
  ['openplanA', dressOpenPlanA],
  ['openplanB', dressOpenPlanB],
  ['conference', dressConference],
  ['breakroom', dressBreakroom],
  ['copy', dressCopy],
  ['restroom', dressRestroom],
  ['janitor', dressJanitor],
  ['stairwell', dressStairwell],
  ['server', dressServer],
  ['loading', dressLoading],
  ['garage', dressGarage],
  ['mezz', dressMezz],
  ['execcorr', dressExecCorr],
  ['firestairU', dressFireStairU],
  ['boardroom', dressBoardroom],
  ['boardroomW', dressBoardroomW],
  ['records2', dressRecords2],
  ['execspine', dressExecSpine],
  ['execante', dressExecAnte],
  ['exec', dressExec],
  ['execgal', dressExecGal],
  ['landing', dressLanding],
  ['execlounge', dressExecLounge],
  ['court', dressCourt],
  ['westyard', dressWestYard],
  ['eastyard', dressEastYard],
];

/**
 * Build every prop, sign and decal for the level.
 * Returns { parts, colliders, dynamic, screens, count }.
 */
export function buildProps() {
  registerPropManifest();
  registerSignageManifest();
  registerDecalManifest();

  CTX = { parts: [], colliders: [], screens: [], faces: [], screenFaces: [], decals: [], count: 0 };
  density = settings.preset?.clutterDensity ?? 1;

  for (const [roomId, fn] of ROOM_DRESSERS) {
    fn(makeRng(hashString(`dress:${roomId}`)));
  }

  let dynamic = null;
  const signMesh = buildSignageMesh(CTX.faces);
  const screenMesh = buildScreenMesh(CTX.screenFaces);
  const decalMesh = buildDecalMesh(CTX.decals);
  if (signMesh || screenMesh || decalMesh) {
    dynamic = new THREE.Group();
    dynamic.name = 'propsDynamic';
    if (signMesh) dynamic.add(signMesh);
    if (screenMesh) dynamic.add(screenMesh);
    if (decalMesh) dynamic.add(decalMesh);
  }

  const out = {
    parts: CTX.parts,
    colliders: CTX.colliders,
    dynamic,
    screens: CTX.screens,
    count: CTX.count,
  };
  CTX = null;
  return out;
}
