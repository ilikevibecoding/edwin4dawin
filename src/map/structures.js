// Structural builders: dogleg stairs, atrium railings, exterior shell, roof. (Fable 2 domain)
import * as THREE from 'three';
import { getMaterial } from '../materials/index.js';
import { FLOORS, ROOMS } from './layout.js';
import { addSlab, WALL_TOPS, ROOF_Y } from './builder.js';

const LANE_W = 1.5;
const RISERS = 12;
const RISE = 3.6;
const RISER_H = RISE / 2 / RISERS; // 0.15
const TREAD = 0.3;
const RUN = RISERS * TREAD;        // 3.6
const LANDING_D = 1.5;

// Dogleg stair filling a stair room rect. Lanes ('low'|'high' x side) hold the two flights.
// Landing (h = rise/2) sits at the z-low end. F1 arrival platform at the z-high end + a full-length
// side strip opposite the lanes at F1 height.
export function buildStairs(map) {
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
    dividerRail(map, laneOuterX + (lanesLow ? LANE_W : 0), flightZ, y0);
    // Handrail along outer wall of flight 1 + landing edge guard at h1.8 facing the shaft gap
    const landEdgeX = lanesLow ? laneInnerX + LANE_W : laneInnerX;
    railingRun(map, 'x', landEdgeX, landZ[0], landZ[1], y0 + RISE / 2);
  }
}

function dividerRail(map, xAt, flightZ, y0) {
  const mat = getMaterial('paintedMetal');
  for (let i = 0; i < RISERS; i++) {
    const z = flightZ[1] - i * TREAD - TREAD / 2;
    const hBase = (i + 1) * RISER_H;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), mat);
    post.position.set(xAt, y0 + hBase + 0.475 + RISE / 2 * 0, z);
    map.group.add(post);
    const post2 = post.clone();
    post2.position.y = y0 + RISE / 2 + (RISERS - i) * RISER_H + 0.475;
    map.group.add(post2);
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

// Called from builder for room|__void adjacency segments (atrium edges)
export function buildRailing(map, seg, floorY) {
  railingRun(map, seg.axis, seg.at, seg.from, seg.to, floorY);
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

  // Perimeter fences around walkable exterior (plaza + courtyard)
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? len : 0.06, 2.0, alongX ? 0.06 : len),
      getMaterial('paintedMetal'),
    );
    mesh.position.set(cx, 1.0, cz);
    g.add(mesh);
    const mesh2 = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? len : 0.02, 1.7, alongX ? 0.02 : len),
      new THREE.MeshStandardMaterial({ color: 0x39424a, roughness: 0.7, metalness: 0.6, transparent: true, opacity: 0.45 }),
    );
    mesh2.position.set(cx, 0.95, cz);
    g.add(mesh2);
    const posts = Math.max(2, Math.round(len / 2.4) + 1);
    for (let i = 0; i < posts; i++) {
      const t = i / (posts - 1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.05, 0.07), getMaterial('paintedMetal'));
      post.position.set(x0 + (x1 - x0) * t, 1.02, z0 + (z1 - z0) * t);
      g.add(post);
    }
    map.world.add({
      min: { x: Math.min(x0, x1) - 0.05, y: 0, z: Math.min(z0, z1) - 0.05 },
      max: { x: Math.max(x0, x1) + 0.05, y: 2.0, z: Math.max(z0, z1) + 0.05 },
      material: 'metal', tag: 'fence', blockShot: false, blockSight: false,
    });
  };
  // Plaza bounds (rects [4,36,36,45] + [6,32,14,36])
  fence(4, 36, 4, 45); fence(4, 45, 36, 45); fence(36, 36, 36, 45);
  // Courtyard bounds ([-8,8,0,30])
  fence(-8, 8, -8, 30); fence(-8, 8, 0, 8); fence(-8, 30, 0, 30);

  // Distant surroundings: dark silhouettes + treeline, read through fog
  const silhouetteMat = new THREE.MeshStandardMaterial({ color: 0x2c3540, roughness: 1 });
  const rng = [[-46, -30, 26, 14], [-20, -44, 30, 22], [30, -52, 34, 18], [78, -20, 22, 26], [92, 20, 28, 20], [80, 62, 36, 16], [30, 82, 40, 22], [-30, 72, 30, 18], [-52, 34, 22, 24]];
  for (const [x, z, w, h] of rng) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), silhouetteMat);
    b.position.set(x, h / 2 - 0.3, z);
    g.add(b);
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2f3d38, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 62 + (i % 5) * 7;
    const t = new THREE.Mesh(new THREE.ConeGeometry(2.2 + (i % 3), 7 + (i % 4) * 2, 6), treeMat);
    t.position.set(24 + Math.cos(a) * r, 3 + (i % 4), 18 + Math.sin(a) * r * 0.8);
    g.add(t);
  }
}

export function buildRoof(map) {
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
}
