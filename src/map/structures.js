// Structural builders: dogleg stairs (+finish kit), atrium railings, exterior shell, roof.
// (Fable 2 domain.) Stair/railing geometry is gameplay-validated — the finish pass adds
// stringers, handrails, nosings, cage rails and signage without moving any walkable surface.
import * as THREE from 'three';
import { getMaterial } from '../materials/index.js';
import { FLOORS, ROOMS, OPENINGS } from './layout.js';
import { addSlab, WALL_TOPS, ROOF_Y } from './builder.js';

const LANE_W = 1.5;
const RISERS = 12;
const RISE = 3.6;
const RISER_H = RISE / 2 / RISERS; // 0.15
const TREAD = 0.3;
const RUN = RISERS * TREAD;        // 3.6
const LANDING_D = 1.5;
const SLOPE = Math.atan2(RISE / 2, RUN); // flight pitch ≈ 26.6°

// Dogleg stair filling a stair room rect. Lanes ('low'|'high' x side) hold the two flights.
// Landing (h = rise/2) sits at the z-low end. F1 arrival platform at the z-high end + a full-length
// side strip opposite the lanes at F1 height.
export function buildStairs(map, kit) {
  for (const room of ROOMS) {
    if (!room.stair) continue;
    const rc = room.rects[0];
    const [x0, z0, x1, z1] = rc;
    const y0 = FLOORS[room.floor].y;
    const conc = getMaterial('concrete');
    // ground-level floor slab of the stair shaft (generic builder skips stair rooms)
    addSlab(map, rc, y0 - 0.12, y0, 'concrete', 'concrete', 'floor');
    const lanesLow = room.stair.lanes === 'low';
    const laneOuterX = lanesLow ? x0 + 0.3 : x1 - 0.3 - LANE_W;      // flight 1 (going up from ground)
    const laneInnerX = lanesLow ? x0 + 0.3 + LANE_W : x1 - 0.3 - 2 * LANE_W; // flight 2
    const stripX = lanesLow ? [x0 + 0.3 + 2 * LANE_W + 0.6, x1] : [x0, x1 - 0.3 - 2 * LANE_W - 0.6];
    const landZ = [z0 + 0.3, z0 + 0.3 + LANDING_D];
    const flightZ = [landZ[1], landZ[1] + RUN]; // z range of both flights
    const platZ = [flightZ[1], z1];             // F1 platform strip behind flight bottoms

    const solidStep = (lx, w, zFrom, zTo, hTop) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hTop, zTo - zFrom), conc);
      mesh.position.set(lx + w / 2, y0 + hTop / 2, (zFrom + zTo) / 2);
      mesh.castShadow = true; mesh.receiveShadow = true;
      map.group.add(mesh);
      map.world.add({
        min: { x: lx, y: y0, z: zFrom }, max: { x: lx + w, y: y0 + hTop, z: zTo },
        material: 'concrete', tag: 'stair',
      });
    };

    // Flight 1: bottom at flightZ[1] (h0) rising to landing at flightZ[0] (h=1.8)
    for (let i = 1; i <= RISERS; i++) {
      const zTo = flightZ[1] - (i - 1) * TREAD;
      const zFrom = zTo - TREAD;
      solidStep(laneOuterX, LANE_W, zFrom, zTo, i * RISER_H);
    }
    // Landing (solid block, top at 1.8)
    solidStep(Math.min(laneOuterX, laneInnerX), LANE_W * 2, landZ[0], landZ[1], RISE / 2);
    // Flight 2: from landing rising to platform (h=3.6 at flightZ[1])
    for (let i = 1; i <= RISERS; i++) {
      const zFrom = flightZ[0] + (i - 1) * TREAD;
      const zTo = zFrom + TREAD;
      // solid mass below each step keeps the underside clean
      solidStep(laneInnerX, LANE_W, zFrom, zTo, RISE / 2 + i * RISER_H);
    }
    // F1 platform strip (z-high end, spanning lanes) + side strip along the opposite x side
    addSlab(map, [x0, platZ[0], x1, platZ[1]], y0 + RISE - 0.18, y0 + RISE, 'concrete', 'concrete', 'floor');
    addSlab(map, [stripX[0], z0, stripX[1], platZ[0]], y0 + RISE - 0.18, y0 + RISE, 'concrete', 'concrete', 'floor');

    // Railings at F1: side-strip inner edge along the shaft + platform edge over flight-1 lane & gap
    const stripInnerX = lanesLow ? stripX[0] : stripX[1];
    railingRun(map, 'x', stripInnerX, z0 + 0.2, platZ[0], y0 + RISE);
    const gapX = lanesLow ? [laneInnerX + LANE_W, stripX[0]] : [stripX[1], laneInnerX];
    railingRun(map, 'z', platZ[0], Math.min(laneOuterX, gapX[0]), Math.max(laneOuterX + LANE_W, gapX[1]),
      y0 + RISE, { skip: [laneInnerX, laneInnerX + LANE_W] });
    // Stepped divider rail between the two flights
    dividerRail(map, kit, laneOuterX + (lanesLow ? LANE_W : 0), flightZ, y0);
    // Handrail along outer wall of flight 1 + landing edge guard at h1.8 facing the shaft gap
    const landEdgeX = lanesLow ? laneInnerX + LANE_W : laneInnerX;
    railingRun(map, 'x', landEdgeX, landZ[0], landZ[1], y0 + RISE / 2);

    if (kit) {
      stairFinish(map, kit, { room, x0, z0, x1, z1, y0, lanesLow, laneOuterX, laneInnerX, flightZ, landZ, platZ });
    }
  }
}

// --- finish kit: stringers, nosings, wall handrail, cage rail, signage, wall packs ---
function stairFinish(map, kit, S) {
  const { room, x0, z0, x1, z1, y0, lanesLow, laneOuterX, laneInnerX, flightZ, landZ } = S;
  const midZ = (flightZ[0] + flightZ[1]) / 2;
  const noseW = LANE_W - 0.06;

  // painted step nosings (safety yellow)
  for (let i = 1; i <= RISERS; i++) {
    const zTo = flightZ[1] - (i - 1) * TREAD;
    kit.box('nosingPaint', noseW, 0.022, 0.05, laneOuterX + LANE_W / 2, y0 + i * RISER_H - 0.011, zTo - 0.028, { cast: false });
    const zFrom = flightZ[0] + (i - 1) * TREAD;
    kit.box('nosingPaint', noseW, 0.022, 0.05, laneInnerX + LANE_W / 2, y0 + RISE / 2 + i * RISER_H - 0.011, zFrom + 0.028, { cast: false });
  }
  kit.box('nosingPaint', 2 * LANE_W - 0.06, 0.022, 0.05, Math.min(laneOuterX, laneInnerX) + LANE_W,
    y0 + RISE / 2 - 0.011, landZ[1] - 0.028, { cast: false });

  // steel stringers along both edges of each flight
  const strLen = RUN / Math.cos(SLOPE) - 0.15;
  for (const [laneX, cy, rot] of [
    [laneOuterX, y0 + RISE / 4 + 0.075 - 0.1, SLOPE],
    [laneInnerX, y0 + RISE * 0.75 + 0.075 - 0.1, -SLOPE],
  ]) {
    for (const ex of [laneX + 0.033, laneX + LANE_W - 0.033]) {
      kit.box('stringerMetal', 0.055, 0.32, strLen, ex, cy, midZ, { rotX: rot, cast: false });
    }
  }

  // wall-mounted handrail along flight 1 + horizontal run along the landing wall
  const wallRailX = lanesLow ? x0 + 0.19 : x1 - 0.19;
  const bracketWallX = lanesLow ? x0 + 0.105 : x1 - 0.105;
  kit.box('stringerMetal', 0.05, 0.075, RUN / Math.cos(SLOPE) - 0.2, wallRailX, y0 + RISE / 4 + 0.075 + 0.9, midZ, { rotX: SLOPE });
  for (const dz of [-1.25, 0, 1.25]) {
    kit.box('stringerMetal', 0.17, 0.028, 0.04, (wallRailX + bracketWallX) / 2, y0 + RISE / 4 + 0.96 - dz * (RISE / 2 / RUN), midZ + dz, { cast: false });
  }
  kit.box('stringerMetal', 0.05, 0.075, LANDING_D + 0.2, wallRailX, y0 + RISE / 2 + 0.94, (landZ[0] + landZ[1]) / 2, { cast: false });

  // cage rail on the open edge of flight 2 (over the shaft gap)
  const openX = lanesLow ? laneInnerX + LANE_W : laneInnerX;
  kit.box('cageMetal', 0.05, 0.06, strLen, openX, y0 + RISE * 0.75 + 0.99, midZ, { rotX: -SLOPE });
  kit.box('cageMetal', 0.04, 0.04, strLen, openX, y0 + RISE * 0.75 + 0.52, midZ, { rotX: -SLOPE, cast: false });
  for (const i of [1, 4, 7, 10]) {
    const z = flightZ[0] + (i - 0.5) * TREAD;
    kit.box('cageMetal', 0.05, 0.98, 0.05, openX, y0 + RISE / 2 + i * RISER_H + 0.49, z, { cast: false });
  }
  kit.collide(openX - 0.05, y0 + RISE / 2, flightZ[0], openX + 0.05, y0 + RISE + 1.0, flightZ[1],
    { tag: 'railing', material: 'metal', blockShot: false, blockSight: false });

  // floor-number signage next to the shaft doors (F0 on the z0 wall, F1 on the z1 wall)
  const sign = (mat, x, y, z) => {
    const g = new THREE.BoxGeometry(0.42, 0.42, 0.03);
    g.translate(x, y, z);
    kit.add(mat, g, { uv: 0, cast: false });
  };
  const f0x = room.id === 'stair-a' ? 31.4 : 16.5;
  sign('signStair1', f0x, y0 + 1.55, z0 + 0.105);
  const f1x = room.id === 'stair-a' ? 31.9 : 16.3;
  sign('signStair2', f1x, y0 + RISE + 1.55, z1 - 0.105);

  // vapor-tight wall packs at the shaft mid-height (the shaft fills sit at ~2.45)
  for (const [zc, sgn] of [[z0 + 0.12, 1], [z1 - 0.12, -1]]) {
    kit.box('fixtureHousing', 0.5, 0.13, 0.07, (x0 + x1) / 2, y0 + 2.5, zc + 0.02 * sgn, { cast: false });
    kit.box('fixtureLensCold', 0.42, 0.08, 0.03, (x0 + x1) / 2, y0 + 2.48, zc + 0.055 * sgn, { cast: false, receive: false });
  }

  shaftDado(kit, room, x0, z0, x1, z1, y0);
}

// Two-tone shaft paint (WP-011c): dado rings at each floor + a slab-line band break the tall
// white drywall field, which read as a blown highlight under hemi light + fog veil no matter
// how far the shaft fills were dialed down. 15mm-proud panels (serverLiner pattern) — cosmetic,
// no colliders; door/arch spans skipped with a casing margin.
function shaftDado(kit, room, x0, z0, x1, z1, y0) {
  const FACE = 0.08 + 0.0075; // interior wall face + half panel thickness
  const ids = [room.id, room.id + '1'];
  const openingsOn = (axis, at, f1) => OPENINGS
    .filter((o) => ids.includes(o.a) || ids.includes(o.b))
    .filter((o) => (axis === 'z' ? o.at[1] === at : o.at[0] === at))
    .filter((o) => (o.a.endsWith('1') || o.b.endsWith('1')) === f1)
    .map((o) => [(axis === 'z' ? o.at[0] : o.at[1]) - o.w / 2 - 0.15, (axis === 'z' ? o.at[0] : o.at[1]) + o.w / 2 + 0.15]);
  const segs = (c0, c1, skips) => {
    let out = [[c0 + 0.05, c1 - 0.05]];
    for (const [s0, s1] of skips) out = out.flatMap(([a, b]) => (s1 <= a || s0 >= b ? [[a, b]] : [[a, Math.min(b, s0)], [Math.max(a, s1), b]]));
    return out.filter(([a, b]) => b - a > 0.1);
  };
  // [yBottom, yTop, opening floor to skip (null = clear band)] — bands run to just below door
  // head height so most of the camera-visible field carries tone
  const bands = [[y0 + 0.09, y0 + 1.9, false], [y0 + 3.3, y0 + 3.6, null], [y0 + 3.69, y0 + 5.6, true]];
  for (const [axis, at, sgn] of [['z', z0, 1], ['z', z1, -1], ['x', x0, 1], ['x', x1, -1]]) {
    const [c0, c1] = axis === 'z' ? [x0, x1] : [z0, z1];
    for (const [yb, yt, f1] of bands) {
      const skips = f1 === null ? [] : openingsOn(axis, at, f1);
      for (const [a, b] of segs(c0, c1, skips)) {
        const mid = (a + b) / 2, len = b - a, h = yt - yb, yc = (yb + yt) / 2;
        if (axis === 'z') kit.box('shaftPaint', len, h, 0.015, mid, yc, at + FACE * sgn, { cast: false });
        else kit.box('shaftPaint', 0.015, h, len, at + FACE * sgn, yc, mid, { cast: false });
      }
    }
  }
}

function dividerRail(map, kit, xAt, flightZ, y0) {
  const mat = getMaterial('paintedMetal');
  for (let i = 0; i < RISERS; i++) {
    const z = flightZ[1] - i * TREAD - TREAD / 2;
    const hBase = (i + 1) * RISER_H;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), mat);
    post.position.set(xAt, y0 + hBase + 0.475, z);
    map.group.add(post);
    const post2 = post.clone();
    post2.position.y = y0 + RISE / 2 + (RISERS - i) * RISER_H + 0.475;
    map.group.add(post2);
  }
  if (kit) {
    // continuous sloped top rails so the divider reads as a proper guardrail
    const midZ = (flightZ[0] + flightZ[1]) / 2;
    const len = RUN / Math.cos(SLOPE) - 0.1;
    kit.box('cageMetal', 0.055, 0.06, len, xAt, y0 + RISE / 4 + 0.99, midZ, { rotX: SLOPE });
    kit.box('cageMetal', 0.055, 0.06, len, xAt, y0 + RISE * 0.75 + 0.99, midZ, { rotX: -SLOPE });
  }
  // one long collider between lanes, generous height
  map.world.add({
    min: { x: xAt - 0.04, y: y0, z: flightZ[0] }, max: { x: xAt + 0.04, y: y0 + RISE + 1.0, z: flightZ[1] },
    material: 'metal', tag: 'railing', blockShot: false, blockSight: false,
  });
}

export function railingRun(map, axis, at, from, to, floorY, opts = {}) {
  // axis 'x': railing plane at x=at spanning z; axis 'z': plane z=at spanning x
  const mat = getMaterial('brushedMetal');
  const glass = getMaterial('railGlass');
  const H = 1.06;
  const spans = opts.skip ? subtract1D([from, to], opts.skip) : [[from, to]];
  for (const [f, t] of spans) {
    if (t - f < 0.1) continue;
    const len = t - f;
    const cx = axis === 'x' ? at : (f + t) / 2;
    const cz = axis === 'x' ? (f + t) / 2 : at;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 0.07 : len, 0.07, axis === 'x' ? len : 0.07), mat);
    rail.position.set(cx, floorY + H - 0.035, cz);
    rail.castShadow = true;
    map.group.add(rail);
    if (opts.woodCap) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'x' ? 0.15 : len + 0.04, 0.045, axis === 'x' ? len + 0.04 : 0.15),
        getMaterial('woodTrim'));
      cap.position.set(cx, floorY + H + 0.0225, cz);
      cap.castShadow = true;
      map.group.add(cap);
    }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 0.03 : len - 0.08, H - 0.28, axis === 'x' ? len - 0.08 : 0.03), glass);
    panel.position.set(cx, floorY + 0.14 + (H - 0.28) / 2, cz);
    map.group.add(panel);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 0.1 : len, 0.13, axis === 'x' ? len : 0.1), getMaterial('paintedMetal'));
    curb.position.set(cx, floorY + 0.065, cz);
    map.group.add(curb);
    const posts = Math.max(2, Math.round(len / 1.4) + 1);
    for (let i = 0; i < posts; i++) {
      const p = f + (len * i) / (posts - 1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, 0.05), mat);
      post.position.set(axis === 'x' ? at : p, floorY + H / 2, axis === 'x' ? p : at);
      map.group.add(post);
    }
    map.world.add({
      min: { x: cx - (axis === 'x' ? 0.06 : len / 2), y: floorY, z: cz - (axis === 'x' ? len / 2 : 0.06) },
      max: { x: cx + (axis === 'x' ? 0.06 : len / 2), y: floorY + H, z: cz + (axis === 'x' ? len / 2 : 0.06) },
      material: 'metal', tag: 'railing', blockShot: false, blockSight: false,
    });
  }
}

function subtract1D([from, to], [sf, st]) {
  const out = [];
  if (sf > from) out.push([from, Math.min(sf, to)]);
  if (st < to) out.push([Math.max(st, from), to]);
  return out;
}

// Called from builder for room|__void adjacency segments (atrium edges): wood-capped glass rail
export function buildRailing(map, seg, floorY) {
  railingRun(map, seg.axis, seg.at, seg.from, seg.to, floorY, { woodCap: true });
}

// ---------------------------------------------------------------------------
export function buildExterior(map) {
  const g = map.group;
  // Global snow ground
  const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 0.3, 180), getMaterial('snow'));
  ground.position.set(24, -0.17, 18);
  ground.receiveShadow = true;
  g.add(ground);
  map.world.add({
    min: { x: -76, y: -0.4, z: -72 }, max: { x: 124, y: -0.02, z: 108 },
    material: 'snow', tag: 'ground',
  });
  // NOTE: the graybox perimeter fences were removed — they were fully embedded inside the
  // 3.6 m site walls that enclose the plaza/courtyard (dead geometry + dead colliders).
  // Distant surroundings now live in snowscape.buildSurroundings().
}

export function buildRoof(map, kit) {
  // Roof slabs over F1 rooms; skylight over atrium void.
  const covered = [];
  for (const room of ROOMS) {
    if (room.floor !== 1) continue;
    for (const rc of room.rects) covered.push(rc);
  }
  for (const rc of covered) {
    addSlab(map, rc, ROOF_Y, ROOF_Y + 0.28, 'parapet', 'concrete', 'roof');
  }
  // Skylight over the atrium void (14,24)-(28,30)
  const frame = getMaterial('frame');
  const glass = getMaterial('glassFrosted');
  const [x0, z0, x1, z1] = [14, 24, 28, 30];
  for (let gx = 0; gx < 7; gx++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, z1 - z0), frame);
    bar.position.set(x0 + (gx * (x1 - x0)) / 6, ROOF_Y + 0.08, (z0 + z1) / 2);
    map.group.add(bar);
  }
  for (let gz = 0; gz < 4; gz++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.16, 0.1), frame);
    bar.position.set((x0 + x1) / 2, ROOF_Y + 0.08, z0 + (gz * (z1 - z0)) / 3);
    map.group.add(bar);
  }
  const pane = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.04, z1 - z0), glass);
  pane.position.set((x0 + x1) / 2, ROOF_Y + 0.1, (z0 + z1) / 2);
  map.group.add(pane);
  map.world.add({
    min: { x: x0, y: ROOF_Y, z: z0 }, max: { x: x1, y: ROOF_Y + 0.2, z: z1 },
    material: 'glass', tag: 'roof', blockSight: false,
  });
  if (kit) {
    // wind-blown snow resting on the skylight — reads from the atrium as soft dark patches
    kit.box('snow', 3.4, 0.05, 1.6, 15.9, ROOF_Y + 0.15, 25.1, { cast: false });
    kit.box('snow', 2.6, 0.05, 1.2, 25.4, ROOF_Y + 0.15, 28.6, { cast: false });
    kit.box('snow', 1.7, 0.04, 0.9, 20.6, ROOF_Y + 0.15, 24.9, { cast: false });
    kit.box('snow', 13.6, 0.05, 0.55, 21, ROOF_Y + 0.15, 24.45, { cast: false });
  }
}
