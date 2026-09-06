// The space train: a sleek maglev (cab car + three passenger cars + observation car, 74 blocks) running on the
// hyperlane between the frontier station and Coruscant on the shared tick clock. One voxel grid holds the whole
// train (walkable end to end through the gangways) and doubles as the collision model; the look comes from the grid
// cells plus visual-only "extras" (recessed glass panes, light strips, panel seams, seats, grab poles, door leaves),
// all in one mesh with a shared material that gets sun / shadow / fog from the shading chunk and a per-vertex
// emissive channel for the strips, head- and tail lights and displays. The sliding doors are two extra meshes (west
// and east leaves) that glide apart along the car axis; holo displays (route map, next stop, station departures)
// are quads on one canvas texture redrawn once a second. Motion follows route.js's timetable exactly at the phase
// boundaries and is eased (jerk-limited) inside the acceleration / braking phases. Sound lives in trainAudio.js.
import * as THREE from 'three';
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS } from '../constants.js';
import { Vehicle } from './vehicle.js';
import { VoxelGrid, buildVoxelMesh, buildExtrasMesh, voxelMaterial, LIGHT_SAMPLES } from './voxelMesh.js';
import { ROUTE, CARS, CAR_LENGTH, DOOR_OFFSETS, TRAIN_LENGTH, TRAIN_HEIGHT, SCHEDULE, RIDE_TIME, PERIOD, trainState } from './route.js';
import { TrainAudio } from './trainAudio.js';

// grid layout: x = along the track (west -> east), y: 0 undercarriage, 1 floor, 2..4 interior, 5 roof; z: 0 north
// wall .. 5 south (platform side) wall. Grid (0,0,0) sits at world (x0, ROUTE.railY, ROUTE.trainZ0).
const W = ROUTE.trainWidth, H = TRAIN_HEIGHT;
const PLATE = B.IRON_BLOCK;          // white hull plating
const DARK = B.DURASTEEL_DARK;       // undercarriage, skirts, gangways
const SEAM = B.PANEL_BLACK;          // panel seams / mullions
const GLASS = B.STEEL_GLASS;         // canopy band (collision cells; rendered as recessed panes)
const FLOOR = B.DECK_PLATE;
const SEAT_CELL = B.STONE_BRICK_SLAB; // collision only (a half slab); the cushion / frame are extras
const CUSHION = B.BLUE_WOOL;
const DOOR_LOW = B.DURASTEEL_DARK, DOOR_HIGH = B.STEEL_GLASS; // collision ids of the closed doorway cells
const CLOCK_SNAP_TICKS = 3;          // re-sync to the server clock when the local clock has drifted more than this
const DOOR_TIME = 0.6;               // seconds for the leaves to slide fully open / closed
const DIST = ROUTE.coruscant.dockX0 - ROUTE.frontier.dockX0;

// emissive channel of grid cells by block id: [intensity, pulse, group]
const GLOW_BY_ID = {
  [B.HOLO_SIGN]: [0.85, 0, 0], [B.CONSOLE]: [0.55, 0, 0], [B.GLOW_PANEL]: [1, 0, 0], [B.GLOW_PANEL_BLUE]: [1, 1, 0],
  [B.NEON_PINK]: [1, 0, 0], [B.CITY_LAMP]: [1, 0, 0], [B.WINDOW_LIT]: [0.7, 0, 0],
};
const cellGlow = (id) => GLOW_BY_ID[id] || null;
// light groups: 1 = on while heading west (engine leads), 2 = on while heading east (observation car leads)
const STRIP = [1, 1, 0], STEADY = [0.85, 0, 0], HEAD_W = [1.2, 0, 1], HEAD_E = [1.2, 0, 2], TAIL_W = [2.2, 0, 1], TAIL_E = [2.2, 0, 2];
const CEILING = [0.45, 0, 0];   // wide cabin ceiling panels: lit, not blown out (the thin strips carry the glow)

// ------------------------------------------------------------------------------------------------ model builder
// Returns the collision grid plus everything the meshes need: `skip` (cells drawn as extras or moving parts),
// `extras` (static visual boxes of the hull mesh), `leaves` (door leaf boxes, west- and east-sliding), `doors`
// (doorway cells, air while open) and `displays` (holo quads: { x, y, z, w, h, n: face normal axis, region }).
export function buildTrainGrid() {
  const g = new VoxelGrid(TRAIN_LENGTH, H, W);
  const skip = new Set(), extras = [], doors = [], displays = [];
  const leaves = { west: [], east: [] };
  const box = (x0, y0, z0, x1, y1, z1, id, opts = {}) => extras.push({ x0, y0, z0, x1, y1, z1, id, ...opts });
  const setSkip = (x, y, z, id) => { g.set(x, y, z, id); skip.add(g.idx(x, y, z)); };
  // recessed glass: the cells stay STEEL_GLASS (collision, culling), the pane is one stretched box shrunk by 0.02
  // so none of its faces is coplanar with the surrounding sills / jambs
  const pane = (x0, y0, z0, x1, y1, z1, px0, py0, pz0, px1, py1, pz1) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) setSkip(x, y, z, GLASS);
    box(px0, py0, pz0, px1, py1, pz1, GLASS, { stretch: true, shade: 1.0, cabin: 0 });   // frames lit by the world; the cabin shows through
  };
  const wallPaneN = (xa, xb) => pane(xa, 3, 0, xb - 1, 3, 0, xa + 0.02, 3.02, 0.3, xb - 0.02, 3.98, 0.7);
  const wallPaneS = (xa, xb) => pane(xa, 3, 5, xb - 1, 3, 5, xa + 0.02, 3.02, 5.3, xb - 0.02, 3.98, 5.7);
  // vertical panel seam / window mullion protruding 0.03 from the wall; `side` -1 / +1 keeps it off a doorway
  const seam = (x, north, side = 0, top = 4.98) => {
    const xa = side > 0 ? x + 0.002 : x - 0.06, xb = side < 0 ? x - 0.002 : x + 0.06;
    if (north) box(xa, 1.02, -0.03, xb, top, 0.75, SEAM, { stretch: true });
    else box(xa, 1.02, 5.25, xb, top, 6.03, SEAM, { stretch: true });
  };
  const roofSeam = (x) => box(x - 0.06, 5.25, 1.02, x + 0.06, 6.03, 4.98, SEAM, { stretch: true });
  // a seat: half-slab collision cell, blue cushion + backrest against the wall, chrome pedestal
  const seat = (x, north) => {
    const z = north ? 1 : 4;
    setSkip(x, 2, z, SEAT_CELL);
    if (north) {
      box(x + 0.08, 2.12, 1.12, x + 0.92, 2.5, 1.92, CUSHION, { stretch: true });
      box(x + 0.08, 2.5, 1.0, x + 0.92, 3.15, 1.18, CUSHION, { stretch: true });
      box(x + 0.2, 2.0, 1.25, x + 0.8, 2.12, 1.85, B.CHROME, { stretch: true });
    } else {
      box(x + 0.08, 2.12, 4.08, x + 0.92, 2.5, 4.88, CUSHION, { stretch: true });
      box(x + 0.08, 2.5, 4.82, x + 0.92, 3.15, 5.0, CUSHION, { stretch: true });
      box(x + 0.2, 2.0, 4.15, x + 0.8, 2.12, 4.75, B.CHROME, { stretch: true });
    }
  };
  const pole = (x, z, top = 5.0) => box(x - 0.06, 2.0, z - 0.06, x + 0.06, top, z + 0.06, B.CHROME);
  // standard body cross-section at grid x: skirt row, floor, lower plating, (glass band set by the caller), upper
  // plating with the shoulder step, roof over z 1..4
  const section = (x) => {
    g.fill(x, 0, 1, x, 0, 4, DARK);
    g.fill(x, 1, 0, x, 1, 5, FLOOR); g.set(x, 1, 0, PLATE); g.set(x, 1, 5, PLATE);
    g.set(x, 2, 0, PLATE); g.set(x, 2, 5, PLATE);
    g.set(x, 3, 0, PLATE); g.set(x, 3, 5, PLATE);
    g.set(x, 4, 0, PLATE); g.set(x, 4, 5, PLATE);
    g.fill(x, 5, 1, x, 5, 4, PLATE);
  };
  // end wall with the gangway opening (2 wide, 2 high) and a holo panel above it
  const endWall = (x, inward) => {
    g.fill(x, 2, 0, x, 4, 5, PLATE);
    g.fill(x, 2, 2, x, 3, 3, 0);
    g.set(x, 4, 2, B.HOLO_SIGN); g.set(x, 4, 3, B.HOLO_SIGN);
    displays.push({ x: inward > 0 ? x + 1.03 : x - 0.03, y: 4.5, z: 3, w: 1.9, h: 0.84, n: inward > 0 ? '+x' : '-x', region: 0 });
  };
  // door: two 2-high cells of the platform wall become the doorway; the leaves (chrome below, glass above, a blue
  // edge light where they meet) pocket into the opaque wall cells on either side
  const door = (x, top = 5.0) => {
    for (let k = 0; k < 2; k++) { g.set(x + k, 2, 5, 0); g.set(x + k, 3, 5, 0); doors.push([x + k, 2, 5], [x + k, 3, 5]); skip.add(g.idx(x + k, 2, 5)); skip.add(g.idx(x + k, 3, 5)); }
    const leaf = (list, xa, xb, edgeX) => {
      list.push({ x0: xa, y0: 2.0, z0: 5.3, x1: xb, y1: 3.0, z1: 5.62, id: B.CHROME, stretch: true });
      list.push({ x0: xa, y0: 3.0, z0: 5.3, x1: xb, y1: 4.0, z1: 5.62, id: GLASS, stretch: true, shade: 1.0 });
      list.push({ x0: edgeX - 0.02, y0: 2.08, z0: 5.33, x1: edgeX + 0.02, y1: 3.92, z1: 5.59, id: B.GLOW_PANEL_BLUE, glow: STEADY, stretch: true });
    };
    leaf(leaves.west, x, x + 1, x + 0.98);
    leaf(leaves.east, x + 1, x + 2, x + 1.02);
    // destination board over the door (outside) and grab poles flanking the vestibule
    displays.push({ x: x + 1, y: 4.5, z: 6.03, w: 2.9, h: 0.84, n: '+z', region: 0 });
    pole(x, 1.5, top); pole(x + 2, 1.5, top); pole(x, 4.5, top); pole(x + 2, 4.5, top);
  };
  const skirts = (xa, xb) => {
    box(xa + 0.25, 0.35, 0.3, xb - 0.25, 1.0, 1.0, DARK, { stretch: true });
    box(xa + 0.25, 0.35, 5.0, xb - 0.25, 1.0, 5.7, DARK, { stretch: true });
    box(xa + 0.5, 0.45, 0.22, xb - 0.5, 0.62, 0.3, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' });
    box(xa + 0.5, 0.45, 5.7, xb - 0.5, 0.62, 5.78, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' });
  };
  const roofline = (xa, xb) => {
    box(xa + 0.5, 5.0, 0.86, xb - 0.5, 5.14, 1.0, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' });
    box(xa + 0.5, 5.0, 5.0, xb - 0.5, 5.14, 5.14, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' });
  };
  const ceilingBar = (xa, xb) => box(xa, 4.9, 2.6, xb, 5.0, 3.4, B.GLOW_PANEL, { glow: CEILING, stretch: 'cell' });

  for (let ci = 0; ci < CARS.length; ci++) {
    const car = CARS[ci], x0 = car.x0, x1 = x0 + CAR_LENGTH - 1;
    const X = (l) => x0 + l;
    if (car.kind === 'engine') {
      // ---- cab car: stepped nose over 8 blocks (deck 1 high at the tip, then 2, glass canopy at 3, cab roof 4,
      // body 5), driver cab behind the windshield, a bulkhead with the aisle opening, seats behind it
      for (let l = 0; l <= 13; l++) g.fill(X(l), 0, 1, X(l), 0, 4, DARK);
      g.fill(X(0), 1, 1, X(0), 1, 4, PLATE);
      for (let l = 1; l <= 7; l++) g.fill(X(l), 1, 0, X(l), 1, 5, PLATE);
      for (let l = 2; l <= 3; l++) g.fill(X(l), 2, 0, X(l), 2, 5, PLATE);
      for (let l = 4; l <= 5; l++) { g.set(X(l), 2, 0, PLATE); g.set(X(l), 2, 5, PLATE); }
      g.fill(X(4), 2, 1, X(4), 2, 4, B.PANEL_BLACK);                 // dash under the windshield
      g.fill(X(5), 2, 1, X(5), 2, 4, B.CONSOLE);                     // console, visible through the canopy
      pane(X(4), 3, 0, X(5), 3, 5, X(4) + 0.02, 3.02, 0.02, X(6) - 0.02, 3.98, 5.98); // windshield canopy
      for (let l = 6; l <= 7; l++) {
        g.fill(X(l), 1, 1, X(l), 1, 4, FLOOR);
        g.set(X(l), 2, 0, PLATE); g.set(X(l), 2, 5, PLATE);
        g.fill(X(l), 4, 0, X(l), 4, 5, PLATE);                       // cab roof
      }
      wallPaneN(X(6), X(8)); wallPaneS(X(6), X(8));                  // cab side windows
      // driver's seat (faces the nose), lit floor in the cab
      box(X(6) + 0.15, 2.12, 2.25, X(6) + 0.85, 2.5, 3.75, CUSHION, { stretch: true });
      box(X(6) + 0.75, 2.5, 2.25, X(6) + 0.92, 3.2, 3.75, CUSHION, { stretch: true });
      box(X(6) + 0.3, 2.0, 2.6, X(6) + 0.7, 2.12, 3.4, B.CHROME, { stretch: true });
      // nose dressing: dark visor bands on the step fronts, head / tail lamp clusters on the tip
      box(X(2) - 0.03, 2.15, 0.5, X(2), 2.85, 5.5, SEAM, { stretch: true });
      box(X(6) - 0.03, 4.15, 0.5, X(6), 4.85, 5.5, SEAM, { stretch: true });
      box(X(8) - 0.03, 5.15, 1.3, X(8), 5.85, 4.7, SEAM, { stretch: true });
      box(X(0) - 0.04, 1.25, 1.15, X(0), 1.75, 2.35, B.GLOW_PANEL, { glow: HEAD_W, stretch: true });
      box(X(0) - 0.04, 1.25, 3.65, X(0), 1.75, 4.85, B.GLOW_PANEL, { glow: HEAD_W, stretch: true });
      box(X(0) - 0.04, 1.3, 2.55, X(0), 1.7, 3.45, B.PANEL_RED, { glow: TAIL_E, stretch: true });
      box(X(0) - 0.03, 0.4, 1.0, X(0), 0.6, 5.0, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' }); // skirt lip
      // bulkhead (l = 8) with the aisle opening and the passengers' display, then the body
      section(X(8)); endWall(X(8), +1);
      for (let l = 9; l <= 13; l++) section(X(l));
      wallPaneN(X(9), X(11)); wallPaneN(X(11), X(13)); wallPaneS(X(9), X(11)); wallPaneS(X(11), X(13));
      for (const l of [9, 10, 11, 12]) { seat(X(l), true); seat(X(l), false); }
      endWall(X(13), -1);
      for (const l of [8, 11]) { seam(X(l), true); seam(X(l), false); }
      roofSeam(X(11));
      skirts(X(1), X(14)); roofline(X(8), X(14)); ceilingBar(X(9), X(13));
      box(X(6), 3.9, 2.6, X(8), 4.0, 3.4, B.GLOW_PANEL, { glow: CEILING, stretch: 'cell' }); // cab ceiling bar (roof at 4)
    } else {
      const tail = car.kind === 'observation';
      const bodyEnd = tail ? 9 : 13;                                  // last x of the full-height body
      for (let l = 0; l <= bodyEnd; l++) section(X(l));
      if (tail) {
        // ---- boat tail shell: roof steps 5 -> 4 (over the rear doors) -> 3 (glass canopy over a rear-facing
        // bench) -> 2 (tip with the lamp cluster); the glass cells are set by the panes below
        for (let l = 10; l <= 11; l++) {
          g.fill(X(l), 0, 1, X(l), 0, 4, DARK);
          g.fill(X(l), 1, 0, X(l), 1, 5, FLOOR); g.set(X(l), 1, 0, PLATE); g.set(X(l), 1, 5, PLATE);
          g.set(X(l), 2, 0, PLATE);
          g.fill(X(l), 4, 0, X(l), 4, 5, PLATE);
        }
        g.fill(X(12), 0, 1, X(12), 0, 4, DARK); g.fill(X(12), 1, 0, X(12), 1, 5, PLATE); g.fill(X(12), 1, 1, X(12), 1, 4, FLOOR);
        g.set(X(12), 2, 0, PLATE); g.set(X(12), 2, 5, PLATE);
        for (let z = 1; z <= 4; z++) setSkip(X(12), 2, z, SEAT_CELL);
        g.set(X(12), 3, 0, PLATE); g.set(X(12), 3, 5, PLATE);
        pane(X(12), 3, 1, X(12), 3, 4, X(12) + 0.02, 3.02, 1.02, X(13) - 0.02, 3.98, 4.98);   // rear canopy
        box(X(12) + 0.1, 2.12, 1.1, X(12) + 0.9, 2.5, 4.9, CUSHION, { stretch: true });        // rear bench
        box(X(12) + 0.1, 2.5, 1.1, X(12) + 0.3, 2.95, 4.9, CUSHION, { stretch: true });
        g.fill(X(13), 0, 1, X(13), 0, 4, DARK); g.fill(X(13), 1, 0, X(13), 1, 5, PLATE); g.fill(X(13), 2, 1, X(13), 2, 4, PLATE);
        box(X(14), 2.25, 1.15, X(14) + 0.04, 2.75, 2.35, B.GLOW_PANEL, { glow: HEAD_E, stretch: true });
        box(X(14), 2.25, 3.65, X(14) + 0.04, 2.75, 4.85, B.GLOW_PANEL, { glow: HEAD_E, stretch: true });
        box(X(14), 2.3, 2.55, X(14) + 0.04, 2.7, 3.45, B.PANEL_RED, { glow: TAIL_W, stretch: true });
        box(X(14), 0.4, 1.0, X(14) + 0.03, 0.6, 5.0, B.GLOW_PANEL_BLUE, { glow: STRIP, stretch: 'cell' });
        box(X(10), 5.15, 1.3, X(10) + 0.03, 5.85, 4.7, SEAM, { stretch: true });               // visor bands on the step fronts
        box(X(12), 4.15, 0.5, X(12) + 0.03, 4.85, 5.5, SEAM, { stretch: true });
      }
      endWall(X(0), +1);
      if (!tail) endWall(X(13), -1);
      // north canopy band: 3-wide panes between the seams at 1, 4, 7, 10 (13)
      const nEnd = tail ? 12 : 13;
      for (let a = 1; a < nEnd; a += 3) wallPaneN(X(a), X(Math.min(a + 3, nEnd)));
      // south: doors at 2..3 and 10..11 with opaque pockets (1, 4, 9, 12), panes between
      wallPaneS(X(5), X(7)); wallPaneS(X(7), X(9));
      for (const dx of DOOR_OFFSETS[car.kind]) door(X(dx), tail && dx === 10 ? 4.0 : 5.0);
      for (const l of [1, 4, 5, 6, 7, 8, 9, 12]) { if (tail && l === 12) continue; seat(X(l), true); seat(X(l), false); }
      for (const l of [1, 4, 7, 10]) seam(X(l), true);
      if (!tail) seam(X(13), true);
      seam(X(2), false, -1); seam(X(4), false, +1); seam(X(7), false); seam(X(10), false, -1); seam(X(12), false, +1, tail ? 3.98 : 4.98);
      roofSeam(X(4)); roofSeam(X(7)); if (!tail) roofSeam(X(10));
      skirts(X(0), X(14)); roofline(X(0), X(bodyEnd + 1)); ceilingBar(X(1), X(bodyEnd + 1));
    }
    // gangway to the next car: dark bellows, floor in the aisle
    if (ci < CARS.length - 1) {
      const gx = x1 + 1;
      g.fill(gx, 0, 1, gx, 0, 4, DARK);
      g.set(gx, 1, 2, FLOOR); g.set(gx, 1, 3, FLOOR);
      g.fill(gx, 1, 1, gx, 5, 1, DARK); g.fill(gx, 1, 4, gx, 5, 4, DARK);
      g.set(gx, 5, 2, DARK); g.set(gx, 5, 3, DARK);
    }
  }
  // lit floor guide strip along the aisle from the cab to the rear bench
  box(CARS[0].x0 + 6, 2.0, 2.9, CARS[CARS.length - 1].x0 + 12, 2.02, 3.1, B.GLOW_PANEL_BLUE, { glow: [0.8, 0, 0], stretch: 'cell' });
  // cabin cells for the mesh's interior / exterior split: the walkable rows between the walls plus the doorways
  const doorCells = new Set(doors.map(([x, y, z]) => g.idx(x, y, z)));
  const inside = (x, y, z) => y >= 2 && y <= 4 && ((z >= 1 && z <= 4) || (z === 5 && doorCells.has(g.idx(x, y, z))));
  return { grid: g, doors, skip, extras, leaves, displays, inside };
}

// ------------------------------------------------------------------------------------------------ holo displays
// One canvas (three 512 x 128 regions) on a MeshBasicMaterial quad mesh: region 0 = the train's own boards (next
// stop, countdown, route map with the moving train), 1 / 2 = the stations' departure displays.
const DISP_W = 512, DISP_H = 128, DISP_REGIONS = 3;
class HoloDisplay {
  constructor() {
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!this.canvas) return;
    this.canvas.width = DISP_W; this.canvas.height = DISP_H * DISP_REGIONS;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter; this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.NoColorSpace;   // the game's shaders are display-referred (see render/post.js)
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, side: THREE.FrontSide, fog: false, toneMapped: false });
    this.lastKey = '';
  }
  // quads: [{ x, y, z, w, h, n: '+x' | '-x' | '+z' | '-z', region }] -> one mesh (positions in the caller's frame)
  buildMesh(quads, name) {
    const pos = [], uv = [], idx = [];
    for (const q of quads) {
      // viewer facing the quad (looking along -n): right = up x n
      const r = q.n === '+x' ? [0, 0, -1] : q.n === '-x' ? [0, 0, 1] : q.n === '+z' ? [1, 0, 0] : [-1, 0, 0];
      const hw = q.w / 2, hh = q.h / 2, base = pos.length / 3;
      const v0 = 1 - (q.region + 1) / DISP_REGIONS + 0.004, v1 = 1 - q.region / DISP_REGIONS - 0.004;
      pos.push(q.x - r[0] * hw, q.y - hh, q.z - r[2] * hw, q.x + r[0] * hw, q.y - hh, q.z + r[2] * hw, q.x + r[0] * hw, q.y + hh, q.z + r[2] * hw, q.x - r[0] * hw, q.y + hh, q.z - r[2] * hw);
      uv.push(0, v0, 1, v0, 1, v1, 0, v1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = name; mesh.frustumCulled = true; mesh.renderOrder = 2;
    mesh.userData.faces = quads.length;
    return mesh;
  }
  static clock(seconds) { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  // seconds until the train next stands at `S` with open doors (0 while it does), from the cycle time
  static untilDock(st, S) {
    const t = st.cycleT, D = SCHEDULE.dwell, R = RIDE_TIME;
    if (S === ROUTE.frontier) return t < D ? 0 : PERIOD - t;
    if (t < D + R) return D + R - t;
    return t < 2 * D + R ? 0 : PERIOD + D + R - t;
  }
  // Redraws when the texts changed (about once a second while counting down). Returns true when redrawn.
  update(st) {
    if (!this.ctx) return false;
    const F = ROUTE.frontier, C = ROUTE.coruscant;
    const docked = st.phase === 'dwell';
    const trainLine = docked ? `BOARDING  ·  DEPARTS ${HoloDisplay.clock(SCHEDULE.dwell - st.phaseT)}` : `ARRIVING IN ${HoloDisplay.clock(RIDE_TIME - st.phaseT)}`;
    const frac = Math.max(0, Math.min(1, (st.x0 - F.dockX0) / DIST));
    const station = (S) => {
      const wait = HoloDisplay.untilDock(st, S);
      const dest = S === F ? C : F;
      if (wait === 0) return [`TO ${dest.name.toUpperCase()}`, `BOARDING  ·  DEPARTS ${HoloDisplay.clock(SCHEDULE.dwell - st.phaseT)}`];
      return [`TO ${dest.name.toUpperCase()}`, `NEXT TRAIN IN ${HoloDisplay.clock(wait)}`];
    };
    const fs = station(F), cs = station(C);
    const key = [st.dest.name, trainLine, frac.toFixed(2), fs.join(), cs.join()].join('|');
    if (key === this.lastKey) return false;
    this.lastKey = key;
    const c = this.ctx;
    c.clearRect(0, 0, DISP_W, DISP_H * DISP_REGIONS);
    const panel = (r, title, big, line2) => {
      const y0 = r * DISP_H;
      c.fillStyle = 'rgba(6, 16, 34, 0.86)'; c.fillRect(0, y0, DISP_W, DISP_H);
      c.strokeStyle = 'rgba(90, 210, 255, 0.9)'; c.lineWidth = 3; c.strokeRect(3, y0 + 3, DISP_W - 6, DISP_H - 6);
      c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillStyle = '#7fd8ff'; c.font = 'bold 22px "DejaVu Sans", Arial, sans-serif'; c.fillText(title, 20, y0 + 24);
      c.fillStyle = '#ffffff'; c.font = 'bold 34px "DejaVu Sans", Arial, sans-serif'; c.fillText(big, 20, y0 + 58);
      c.fillStyle = '#ffd37a'; c.font = 'bold 24px "DejaVu Sans", Arial, sans-serif'; c.fillText(line2, 20, y0 + 96);
    };
    // region 0: the train boards, with the route line under the text
    panel(0, 'NEXT STOP', st.dest.name.toUpperCase(), trainLine);
    c.strokeStyle = 'rgba(120, 220, 255, 0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 118); c.lineTo(492, 118); c.stroke();
    c.fillStyle = '#7fd8ff'; c.beginPath(); c.arc(300, 118, 5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(492, 118, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(300 + 192 * frac, 118, 7, 0, Math.PI * 2); c.fill();
    c.font = 'bold 12px "DejaVu Sans", Arial, sans-serif'; c.fillStyle = '#9fe4ff'; c.textAlign = 'center';
    c.fillText('FRONTIER', 300, 104); c.fillText('CORUSCANT', 492, 104);
    // regions 1 / 2: station departure displays
    panel(1, F.name.toUpperCase(), fs[0], fs[1]);
    panel(2, C.name.toUpperCase(), cs[0], cs[1]);
    this.texture.needsUpdate = true;
    return true;
  }
  dispose() { if (this.texture) this.texture.dispose(); if (this.material) this.material.dispose(); }
}

// ------------------------------------------------------------------------------------------------ motion easing
// The timetable ramps with constant acceleration (infinite jerk at both ends of a ramp). Inside a ramp the pose
// follows a smoothstep speed profile with the same endpoints - identical distance (vmax * T / 2) and speed at the
// phase boundaries, zero acceleration at both ends - so the schedule stays the source of truth.
const RAMP_T = SCHEDULE.accel;
function easedRamp(tau) {
  const u = Math.min(1, Math.max(0, tau / RAMP_T));
  return { s: SCHEDULE.vmax * RAMP_T * (u * u * u - 0.5 * u * u * u * u), v: SCHEDULE.vmax * (3 * u * u - 2 * u * u * u) };
}
export function smoothState(st) {
  if (st.phase !== 'accel' && st.phase !== 'decel') return st;
  const r = st.phase === 'accel' ? easedRamp(st.phaseT) : easedRamp(RIDE_TIME - st.phaseT);
  const s = st.phase === 'accel' ? r.s : DIST - r.s;
  const start = st.dir > 0 ? ROUTE.frontier.dockX0 : ROUTE.coruscant.dockX0;
  return { ...st, x0: start + st.dir * s, v: st.dir * r.v, rawX0: st.x0, rawV: st.v };
}

export class SpaceTrain extends Vehicle {
  constructor() {
    const model = buildTrainGrid();
    super({
      grid: model.grid, name: 'space_train', emissive: 0.5,
      // whole cabin volume (floor top to ceiling), including the doorway cells on the platform side
      interiors: [{ x0: 0, x1: TRAIN_LENGTH, y0: 2, y1: 5, z0: 1, z1: 6 }],
    });
    this.model = model;
    this.doors = model.doors;
    this.doorsClosed = false;
    this.doorAnim = 1;          // 0 = leaves closed .. 1 = fully open (visual, follows doorsClosed over DOOR_TIME)
    this.state = smoothState(trainState(0));
    this.lastState = this.state;
    this.material = null;
    this.doorMeshes = [];
    this.displayMesh = null;    // boards riding with the train
    this.stationMesh = null;    // departure displays at the stations (world space)
    this.stationDisplays = [];  // registered by stations.js before the train is added
    this.display = null;
    this.trainAudio = new TrainAudio(null);
    this.time = 0;
    this.displayTimer = 0;
    this.listeners = []; // (event, train) => void   events: 'doors', 'arrive', 'depart'
    this.preloadStats = { chunks: 0, ms: 0 };
    this.clockOffset = null; // schedule tick - local tick, once synced to a server clock
    this.setDoors(!this.state.doorsOpen);
    this.doorAnim = this.doorsClosed ? 0 : 1;
  }

  // Station dressing hook (stations.js): a holo board in world space { station, kind: 'departure' | 'route', x, y,
  // z, w, h }, drawn double-sided on the train's display canvas (departures count down, route maps show the train).
  addStationDisplay(d) { this.stationDisplays.push(d); }

  // The schedule runs on the shared clock: the server tick while connected (every client computes the same train),
  // otherwise the local vehicle tick. Local ticks advance steadily at 20 Hz, so the offset to the server clock is only
  // re-snapped when the drift exceeds a few ticks (jitter in the estimate must not make the train stutter), and a
  // synced offset is kept through a disconnect so the train does not jump back to the local clock.
  scheduleTick(localTick) {
    const net = this.game && this.game.net;
    const server = net && net.connected ? net.serverTick : null;
    if (typeof server === 'number' && (this.clockOffset === null || Math.abs(localTick + this.clockOffset - server) > CLOCK_SNAP_TICKS)) this.clockOffset = server - localTick;
    return this.clockOffset === null ? localTick : localTick + this.clockOffset;
  }

  pose(tick) {
    this.state = smoothState(trainState(this.scheduleTick(tick)));
    return { x: this.state.x0, y: ROUTE.railY, z: ROUTE.trainZ0, yaw: 0 };
  }

  onAdd(game) {
    this.trainAudio.audio = game.audio;
    super.onAdd(game);
  }

  buildMeshes() {
    const game = this.game, m = this.model;
    this.material = voxelMaterial(game.atlas);
    this.material.uniforms.uEmissive.value = this.emissive;
    this.material.uniforms.uSelfTint.value.set(0.84, 0.9, 1.0);   // the cabin's own light is a cool LED white
    this.material.uniforms.uLightSpan.value = this.grid.w;
    // the hull is built with the doorways open so the jamb faces exist whatever the door state is later
    const closed = this.doorsClosed;
    if (closed) this.applyDoorCells(false);
    this.mesh = buildVoxelMesh(this.grid, game.atlas, { material: this.material, glow: cellGlow, extras: m.extras, inside: m.inside, cells: (x, y, z) => !m.skip.has(this.grid.idx(x, y, z)) });
    if (closed) this.applyDoorCells(true);
    this.mesh.name = this.name;
    game.scene.add(this.mesh);
    this.meshes = [this.mesh];
    this.doorMeshes = [buildExtrasMesh(m.leaves.west, this.material, m.inside), buildExtrasMesh(m.leaves.east, this.material, m.inside)];
    this.doorMeshes[0].name = 'space_train_doors_west'; this.doorMeshes[1].name = 'space_train_doors_east';
    for (const d of this.doorMeshes) { game.scene.add(d); this.meshes.push(d); }
    // holo boards: one canvas texture, one mesh riding with the train, one static mesh for the stations
    this.display = new HoloDisplay();
    if (this.display.material) {
      this.displayMesh = this.display.buildMesh(m.displays, 'space_train_displays');
      game.scene.add(this.displayMesh);
      if (this.stationDisplays.length) {
        const quads = [];
        for (const d of this.stationDisplays) {
          const region = d.kind === 'route' ? 0 : d.station === ROUTE.coruscant ? 2 : 1;
          quads.push({ x: d.x, y: d.y, z: d.z + 0.02, w: d.w, h: d.h, n: '+z', region }, { x: d.x, y: d.y, z: d.z - 0.02, w: d.w, h: d.h, n: '-z', region });
        }
        this.stationMesh = this.display.buildMesh(quads, 'station_departure_displays');
        this.stationMesh.frustumCulled = false;
        game.scene.add(this.stationMesh);
      }
      this.display.update(this.state);
    }
  }

  applyDoorCells(closed) { for (const [x, y, z] of this.doors) this.grid.set(x, y, z, closed ? (y === 2 ? DOOR_LOW : DOOR_HIGH) : 0); }

  setDoors(closed) {
    if (closed === this.doorsClosed) return;
    this.doorsClosed = closed;
    this.applyDoorCells(closed);
    if (closed) this.clearDoorways();
    this.trainAudio.doors(!closed);
    this.emit('doors');
  }

  // A player standing in a doorway when the doors close is nudged to whichever side is nearer (inside the car or out
  // onto the platform / walkway) instead of being sealed into the door panel.
  clearDoorways() {
    const game = this.game, p = game && game.player;
    if (!p || !this.cur) return;
    const hw = (p.width || 0.6) / 2;
    // riders are aligned with the previous pose until their own tick carries them, so test the doors there
    const pose = this.prev || this.cur;
    for (const [gx, gy, gz] of this.doors) {
      if (gy !== 2) continue;
      const w = this.toWorld(gx, gy, gz, pose, { x: 0, y: 0, z: 0 });        // min corner of the door cell
      if (p.pos.x + hw <= w.x || p.pos.x - hw >= w.x + 1 || p.pos.z + hw <= w.z || p.pos.z - hw >= w.z + 1 || p.pos.y + (p.height || 1.8) <= w.y || p.pos.y >= w.y + 2) continue;
      const inside = p.pos.z < w.z + 0.5;                                    // the doors are on the +z (platform) face
      p.pos.z = inside ? w.z - hw - 0.05 : w.z + 1 + hw + 0.05;
      if (game.hud) game.hud.addMessage(inside ? 'Mind the doors.' : 'The doors closed behind you.');
      return;
    }
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev, this); } catch (e) { console.error('train listener', e); } } }

  // distance from a point to the train's bounds (0 inside)
  distanceTo(x, y, z) {
    const b = this.bounds; if (!b) return Infinity;
    const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1), dz = Math.max(b.z0 - z, 0, z - b.z1);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  tick(tickCount) {
    const prevState = this.state;
    super.tick(tickCount); // updates this.state via pose()
    const st = this.state;
    this.setDoors(!st.doorsOpen);
    const game = this.game;
    if (game && game.player) {
      const p = game.player.pos, near = this.distanceTo(p.x, p.y, p.z) <= 80;
      if (prevState.phase === 'dwell' && st.phase !== 'dwell') { this.trainAudio.depart(); this.emit('depart'); if (near && game.hud) game.hud.addMessage(`Space train departing for ${st.dest.name}. Doors seal at ${SCHEDULE.hopSpeed} blocks per second.`); }
      if (prevState.doorsOpen && !st.doorsOpen && st.phase !== 'dwell' && near && game.hud) game.hud.addMessage('Doors sealed for the cruise.');
      if (prevState.phase !== 'dwell' && st.phase === 'dwell') { this.trainAudio.arrive(); this.emit('arrive'); if (near && game.hud) game.hud.addMessage(`Arriving at ${st.at.name}.`); }
      if (prevState.phase === 'accel' && st.phase === 'cruise' && near && game.hud) game.hud.addMessage(`Next stop: ${st.dest.name}. Cruising at ${SCHEDULE.vmax} blocks per second.`);
    }
    this.preloadAhead();
  }

  // While the player rides, generate + light the chunks the train is about to reach (both track rows and one row
  // on each side) so nothing is missing under the train; bounded per tick so the sim never stalls.
  preloadAhead() {
    const game = this.game;
    if (!game || !game.terrain || !game.world || !this.isPlayerRiding()) return;
    const st = this.state;
    if (st.v === 0) return;
    const terrain = game.terrain, world = game.world;
    const dir = st.v > 0 ? 1 : -1;
    const front = dir > 0 ? this.cur.x + this.grid.w : this.cur.x;
    const cxFront = Math.floor(front / CS), pcx = Math.floor(game.player.pos.x / CS);
    const maxLead = terrain.renderDistance + 3; // stay inside the unload radius (renderDistance + 4)
    const t0 = performance.now();
    let done = 0;
    outer: for (let k = 0; k <= 9 && done < 3; k++) {
      const cx = cxFront + dir * k;
      if (Math.abs(cx - pcx) > maxLead) break;
      for (const cz of [-1, 0, -2, 1]) {
        const c = world.getChunk(cx, cz);
        if (c && c.generated && c.lit) continue;
        if (done > 0 && performance.now() - t0 > 3) break outer; // budget: at most ~3 ms per tick
        terrain.ensureChunk(cx, cz);
        done++;
        this.preloadStats.chunks++;
      }
    }
    if (done) this.preloadStats.ms += performance.now() - t0;
  }

  // The door leaves ride with the hull and slide +-1 block along the car axis (yaw is always 0 on the hyperlane).
  placeMeshes(alpha) {
    super.placeMeshes(alpha);
    const open = this.doorAnim * this.doorAnim * (3 - 2 * this.doorAnim);   // smoothstep: eases in and out
    if (this.doorMeshes.length === 2) { this.doorMeshes[0].position.x -= open; this.doorMeshes[1].position.x += open; }
    if (this.displayMesh) { this.displayMesh.position.copy(this.mesh.position); this.displayMesh.rotation.copy(this.mesh.rotation); }
  }

  update(dt, alpha, camera) {
    if (!this.meshes.length) return;
    const target = this.doorsClosed ? 0 : 1;
    if (this.doorAnim !== target) this.doorAnim = target > this.doorAnim ? Math.min(1, this.doorAnim + dt / DOOR_TIME) : Math.max(0, this.doorAnim - dt / DOOR_TIME);
    super.update(dt, alpha, camera);
    const st = this.state, u = this.material.uniforms;
    this.sampleLightAlong();
    this.time += dt;
    u.uTime.value = this.time % 3600;
    u.uPulse.value = Math.min(1, Math.abs(st.v) / SCHEDULE.vmax) * (st.v < 0 ? -1 : 1);
    u.uHeadWest.value = st.dir < 0 ? 1 : 0;
    u.uHeadEast.value = st.dir > 0 ? 1 : 0;
    const night = this.game && this.game.sky ? 1 - Math.max(0, Math.min(1, this.game.sky.dayFactor)) : 0;
    u.uEmissive.value = this.emissive + 0.3 * night;   // the cabin reads lit through the windows at night
    this.trainAudio.update(this);
    this.displayTimer += dt;
    if (this.display && this.displayTimer >= 0.5) {
      this.displayTimer = 0;
      this.display.update(st);
    }
  }

  // World light sampled at cabin height along the train (the base class samples the centre only): the frontier
  // station's hall roofs the dock, so the cars inside are lit by the hall lamps while the nose stands in daylight.
  sampleLightAlong() {
    const world = this.game && this.game.world;
    if (!world || !this.cur) return;
    const g = this.grid, along = this.material.uniforms.uLightAlong.value;
    for (let k = 0; k < LIGHT_SAMPLES; k++) {
      const gx = 0.5 + (g.w - 1) * k / (LIGHT_SAMPLES - 1);
      const w = this.toWorld(gx, 3.5, g.d / 2, this.cur, { x: 0, y: 0, z: 0 });
      const l = world.sampleLight(w.x, w.y, w.z);
      along[k].set(l[0], l[1]);
    }
  }

  onRemove(game) {
    super.onRemove(game);
    for (const m of [this.displayMesh, this.stationMesh]) if (m) { game.scene.remove(m); m.geometry.dispose(); }
    if (this.display) this.display.dispose();
    this.displayMesh = this.stationMesh = null; this.doorMeshes = [];
    this.trainAudio.stop(0.2);
  }

  // debugging / tests
  get drawCalls() { return [...this.meshes, this.displayMesh, this.stationMesh].filter((m) => m && m.visible).length; }
  info() {
    const st = this.state;
    return {
      x0: st.x0, v: st.v, rawX0: st.rawX0 ?? st.x0, rawV: st.rawV ?? st.v, phase: st.phase, at: st.at ? st.at.name : null, dest: st.dest.name, doorsOpen: st.doorsOpen, doorAnim: +this.doorAnim.toFixed(3), cycleT: st.cycleT,
      riding: this.isPlayerRiding(), draws: this.drawCalls, cells: this.grid.count(), faces: [...this.meshes, this.displayMesh, this.stationMesh].reduce((n, m) => n + (m ? m.userData.faces || 0 : 0), 0),
      preload: this.preloadStats, clockOffset: this.clockOffset, audio: this.trainAudio.stats,
    };
  }
}
