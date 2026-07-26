// ============================================================================
// NORTHSTAR RESCUE — architectural finish kit (Fable 2 ownership).
// Generates baseboards/curbs, ceiling light fixtures, structural columns,
// exit signs, window sills + blinds, restroom wainscot, exposed service runs,
// stair handrails, the lobby brand wall and courtyard dressing — all computed
// from the map data in world/layout.js so it stays in sync with the builder.
//
// Contract:
//   buildArchDetails(game) -> { group: THREE.Group,
//                               colliders: [{ min, max, material }] }
// Colliders are world-space AABBs for the pieces players can bump into
// (columns, planters, flagpole). Everything is batched per material key and
// emitted as a handful of merged meshes.
// ============================================================================
import * as THREE from 'three';
import {
  ROOMS, CONNECTIONS, WINDOWS, STAIRS, FLOOR_Y, SLAB, WALL_EXT, WALL_INT,
} from '../world/layout.js';
import { getMaterial } from './materials.js';
import { boxGeo, bevelBoxGeo, cylGeo, GeoBatcher } from './geo.js';
import { makeCanvasTexture } from './textures.js';
import { registerAsset } from './registry.js';

// Batch keys may carry a '#variant' suffix so indexed and non-indexed
// geometries (Box/Cylinder vs Extrude) never end up in the same merge bucket.
const matOf = (k) => getMaterial(k.split('#')[0]);

const roomById = (id) => ROOMS.find((r) => r.id === id);

// deterministic 0..1 hash for per-position variation (blind drops etc.)
function hash01(a, b = 0) {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------------------
// shared layout math (mirrors mapbuilder conventions)
// ---------------------------------------------------------------------------
function contains(rect, x, z) {
  return x >= rect[0] - 0.01 && x <= rect[2] + 0.01 && z >= rect[1] - 0.01 && z <= rect[3] + 0.01;
}

function roomAtFloor(x, z, floor) {
  return ROOMS.find((r) => r.floor === floor && contains(r.rect, x, z));
}

function sharedEdge(ra, rb) {
  const [ax0, az0, ax1, az1] = ra.rect;
  const [bx0, bz0, bx1, bz1] = rb.rect;
  const eps = 0.02;
  if (Math.abs(ax1 - bx0) < eps || Math.abs(ax0 - bx1) < eps) {
    const x = Math.abs(ax1 - bx0) < eps ? ax1 : ax0;
    const lo = Math.max(az0, bz0), hi = Math.min(az1, bz1);
    if (hi - lo > 0.25) return { dir: 'v', coord: x, lo, hi };
  }
  if (Math.abs(az1 - bz0) < eps || Math.abs(az0 - bz1) < eps) {
    const z = Math.abs(az1 - bz0) < eps ? az1 : az0;
    const lo = Math.max(ax0, bx0), hi = Math.min(ax1, bx1);
    if (hi - lo > 0.25) return { dir: 'h', coord: z, lo, hi };
  }
  return null;
}

// connection -> shared edge + clamped absolute opening center (same clamp as
// the map builder, so details line up with the real doors)
function connEdge(conn) {
  const a = roomById(conn.a), b = roomById(conn.b);
  if (!a || !b) return null;
  const edge = sharedEdge(a, b);
  if (!edge) return null;
  const halfW = conn.w / 2;
  let at = conn.at != null ? edge.lo + conn.at : (edge.lo + edge.hi) / 2;
  at = Math.max(edge.lo + halfW + 0.18, Math.min(edge.hi - halfW - 0.18, at));
  return { a, b, edge, at };
}

// half wall thickness between two rooms (mapbuilder rules)
function pairHalfT(a, b) {
  if (a.style === 'exterior' || b.style === 'exterior') return WALL_EXT / 2;
  if (a.isStairwell || b.isStairwell) return 0.12;
  return WALL_INT / 2;
}

const SIDES = [
  { side: 'w', dir: 'v', idx: 0, inward: 1 },
  { side: 'e', dir: 'v', idx: 2, inward: -1 },
  { side: 'n', dir: 'h', idx: 1, inward: 1 },
  { side: 's', dir: 'h', idx: 3, inward: -1 },
];

// 1D interval helpers
function subtract1D(intervals, lo, hi) {
  const out = [];
  for (const [a, b] of intervals) {
    if (hi <= a || lo >= b) { out.push([a, b]); continue; }
    if (lo > a) out.push([a, lo]);
    if (hi < b) out.push([hi, b]);
  }
  return out;
}
function intersect1D(intervals, allowed) {
  const out = [];
  for (const [a, b] of intervals) {
    for (const [c, d] of allowed) {
      const lo = Math.max(a, c), hi = Math.min(b, d);
      if (hi - lo > 0.01) out.push([lo, hi]);
    }
  }
  return out;
}
function rectSub(pieces, cutter) {
  const [cx0, cz0, cx1, cz1] = cutter;
  const out = [];
  for (const p of pieces) {
    const [x0, z0, x1, z1] = p;
    if (cx1 <= x0 + 0.01 || cx0 >= x1 - 0.01 || cz1 <= z0 + 0.01 || cz0 >= z1 - 0.01) { out.push(p); continue; }
    const ix0 = Math.max(x0, cx0), ix1 = Math.min(x1, cx1);
    const iz0 = Math.max(z0, cz0), iz1 = Math.min(z1, cz1);
    if (iz0 > z0) out.push([x0, z0, x1, iz0]);
    if (iz1 < z1) out.push([x0, iz1, x1, z1]);
    if (ix0 > x0) out.push([x0, iz0, ix0, iz1]);
    if (ix1 < x1) out.push([ix1, iz0, x1, iz1]);
  }
  return out;
}

// Where does a wall actually stand on this room's perimeter? Returns runs
// [{dir, side, coord, lo, hi, inset, inward}] — skips floor-1 edges that the
// map builder turns into railings (mezzanine overlook) or omits entirely.
function wallRuns(room) {
  const [x0, z0, x1, z1] = room.rect;
  const runs = [];
  for (const S of SIDES) {
    const coord = room.rect[S.idx];
    const lo0 = S.dir === 'v' ? z0 : x0;
    const hi0 = S.dir === 'v' ? z1 : x1;
    let rest = [[lo0, hi0]];
    for (const other of ROOMS) {
      if (other === room || other.floor !== room.floor) continue;
      const e = sharedEdge(room, other);
      if (!e || e.dir !== S.dir || Math.abs(e.coord - coord) > 0.03) continue;
      rest = subtract1D(rest, e.lo, e.hi);
      if (room.floor === 1) {
        // floor-1 pair edge fully inside one tall ground volume => no wall
        const mid = (e.lo + e.hi) / 2;
        const pIn = S.dir === 'v'
          ? { x: coord + S.inward * 0.45, z: mid } : { x: mid, z: coord + S.inward * 0.45 };
        const pOut = S.dir === 'v'
          ? { x: coord - S.inward * 0.45, z: mid } : { x: mid, z: coord - S.inward * 0.45 };
        const gIn = roomAtFloor(pIn.x, pIn.z, 0), gOut = roomAtFloor(pOut.x, pOut.z, 0);
        if (gIn && gOut && gIn.id === gOut.id && gIn.ceil > 3.7) continue;
      }
      runs.push({ dir: S.dir, side: S.side, coord, lo: e.lo, hi: e.hi, inset: pairHalfT(room, other), inward: S.inward });
    }
    for (const [lo, hi] of rest) {
      if (hi - lo < 0.3) continue;
      if (room.floor === 1) {
        // railing rule: edge hangs inside a tall ground volume => open rail
        const mid = (lo + hi) / 2;
        const pIn = S.dir === 'v' ? { x: coord + S.inward * 0.45, z: mid } : { x: mid, z: coord + S.inward * 0.45 };
        const pOut = S.dir === 'v' ? { x: coord - S.inward * 0.45, z: mid } : { x: mid, z: coord - S.inward * 0.45 };
        const gIn = roomAtFloor(pIn.x, pIn.z, 0), gOut = roomAtFloor(pOut.x, pOut.z, 0);
        if (gIn && gOut && gIn.id === gOut.id && gIn.ceil > 3.7) continue;
      }
      runs.push({ dir: S.dir, side: S.side, coord, lo, hi, inset: WALL_EXT / 2, inward: S.inward });
    }
  }
  return runs;
}

// connection openings that cut a given wall line (with skirting margin)
function openingSpans(room, run) {
  const spans = [];
  for (const conn of CONNECTIONS) {
    if (conn.a !== room.id && conn.b !== room.id) continue;
    const ce = connEdge(conn);
    if (!ce || ce.edge.dir !== run.dir || Math.abs(ce.edge.coord - run.coord) > 0.03) continue;
    spans.push([ce.at - conn.w / 2 - 0.1, ce.at + conn.w / 2 + 0.1]);
  }
  return spans;
}

// floor-1 rooms: keep skirting only where the slab actually exists
function slabAllowed(room, run) {
  if (room.floor !== 1) return null;
  let pieces = [room.rect];
  for (const st of STAIRS) for (const h of st.holes) pieces = rectSub(pieces, h);
  const allowed = [];
  for (const p of pieces) {
    if (run.dir === 'v') {
      const edgeX = run.side === 'w' ? p[0] : p[2];
      if (Math.abs(edgeX - run.coord) < 0.05) allowed.push([p[1], p[3]]);
    } else {
      const edgeZ = run.side === 'n' ? p[1] : p[3];
      if (Math.abs(edgeZ - run.coord) < 0.05) allowed.push([p[0], p[2]]);
    }
  }
  return allowed;
}

// ---------------------------------------------------------------------------
// piece emitters (shared by the world build and the asset gallery)
// ---------------------------------------------------------------------------
function addCylPiece(batch, key, rTop, rBottom, h, x, y, z, o = {}) {
  const g = cylGeo(rTop, rBottom, h, o.seg ?? 12);
  if (o.rotX) g.rotateX(o.rotX);
  if (o.rotZ) g.rotateZ(o.rotZ);
  if (o.rotY) g.rotateY(o.rotY);
  g.translate(x, y, z);
  batch.add(key, g);
}

// square-section strut from p0 to p1 (rails, sloped members)
function addStrut(batch, key, p0, p1, th) {
  const dir = new THREE.Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  const len = dir.length();
  if (len < 0.01) return;
  const g = boxGeo(th, th, len);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  g.applyQuaternion(q);
  g.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
  batch.add(key, g);
}

// recessed office troffer, top embedded 3 mm into the ceiling slab
function emitTroffer(batch, x, ceilY, z) {
  batch.addBox('frame', x, ceilY - 0.022, z, 0.62, 0.05, 0.62);
  batch.addBox('light_panel', x, ceilY - 0.05, z, 0.56, 0.02, 0.56);
}

// suspended industrial strip on two drop rods
function emitStrip(batch, x, ceilY, z, alongX) {
  const rot = alongX ? 0 : Math.PI / 2;
  batch.addBox('metal_dark', x, ceilY - 0.285, z, 1.25, 0.07, 0.16, { rotY: rot });
  batch.addBox('light_panel', x, ceilY - 0.325, z, 1.15, 0.02, 0.1, { rotY: rot });
  for (const s of [-0.45, 0.45]) {
    const rx = alongX ? x + s : x, rz = alongX ? z : z + s;
    batch.addBox('metal_dark', rx, ceilY - 0.125, rz, 0.018, 0.25, 0.018);
  }
}

// lobby pendant: stem + disc + emissive underside
function emitPendant(batch, x, topY, discY, z) {
  addCylPiece(batch, 'metal_dark', 0.012, 0.012, topY - discY, x, (topY + discY) / 2, z, { seg: 8 });
  addCylPiece(batch, 'metal_dark', 0.25, 0.25, 0.05, x, discY - 0.025, z, { seg: 20 });
  addCylPiece(batch, 'light_panel', 0.205, 0.205, 0.016, x, discY - 0.056, z, { seg: 20 });
}

// wall sconce: half-embedded shroud cylinder + glow caps
function emitSconce(batch, x, y, z, proudDir) {
  addCylPiece(batch, 'metal_dark', 0.07, 0.07, 0.26, x, y, z, { seg: 10 });
  const gx = x + (proudDir === 'x+' ? 0.015 : proudDir === 'x-' ? -0.015 : 0);
  const gz = z + (proudDir === 'z+' ? 0.015 : proudDir === 'z-' ? -0.015 : 0);
  addCylPiece(batch, 'light_panel', 0.05, 0.05, 0.02, gx, y - 0.145, gz, { seg: 10 });
  addCylPiece(batch, 'light_panel', 0.05, 0.05, 0.02, gx, y + 0.145, gz, { seg: 10 });
}

// emissive exit sign + dark top bracket. (x,y,z) = sign center, offset
// sgn*(halfT+0.04) from the wall centerline; bracket ties it back to the wall.
function emitExitSign(batch, x, y, z, dir, sgn, halfT) {
  const bLen = 0.075; // bracket depth: wall face -> just past the sign face
  const wallC = dir === 'v' ? x - sgn * (halfT + 0.04) : z - sgn * (halfT + 0.04);
  const bCenter = wallC + sgn * (halfT - 0.01 + bLen / 2);
  if (dir === 'v') {
    batch.addBox('exit_sign', x, y, z, 0.045, 0.16, 0.34);
    batch.addBox('metal_dark', bCenter, y + 0.091, z, bLen, 0.022, 0.2);
  } else {
    batch.addBox('exit_sign', x, y, z, 0.34, 0.16, 0.045);
    batch.addBox('metal_dark', x, y + 0.091, bCenter, 0.2, 0.022, bLen);
  }
}

// venetian blinds run: valance + slat block with per-segment drop
function emitBlindsRun(batch, ww) {
  const glassH = ww.headY - ww.sillY;
  const off = ww.coord + ww.inward * (ww.halfT + 0.055);
  const nSeg = Math.max(1, Math.ceil((ww.hi - ww.lo) / 2.4));
  const segW = (ww.hi - ww.lo) / nSeg;
  for (let s = 0; s < nSeg; s++) {
    const c = ww.lo + (s + 0.5) * segW;
    const drop = glassH * (0.3 + 0.4 * hash01(c * 0.73 + ww.coord, ww.sillY + s * 2.17));
    const put = (w, h, t, y) => {
      if (ww.dir === 'v') batch.addBox('plastic_white', off, y, c, t, h, w);
      else batch.addBox('plastic_white', c, y, off, w, h, t);
    };
    put(segW - 0.03, 0.09, 0.07, ww.headY - 0.005);            // valance
    const bodyTop = ww.headY - 0.05;
    const slabH = (drop - 0.05) / 6;
    for (let i = 0; i < 6; i++) {
      put(segW - 0.07, slabH * 0.8, 0.026, bodyTop - slabH * (i + 0.5));
    }
    put(segW - 0.07, 0.035, 0.032, bodyTop - (drop - 0.05) - 0.017); // bottom rail
  }
}

// duct run + hangers (long axis given by alongX)
function emitDuct(batch, cx, cy, cz, len, alongX, ceilY) {
  const rot = alongX ? 0 : Math.PI / 2;
  batch.addBox('metal_brushed', cx, cy, cz, len, 0.28, 0.5, { rotY: rot });
  const n = Math.max(2, Math.round(len / 2.5));
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + 0.4 + (len - 0.8) * (n === 1 ? 0.5 : i / (n - 1));
    const hx = alongX ? cx + t : cx, hz = alongX ? cz : cz + t;
    const top = ceilY, bot = cy + 0.14;
    if (top - bot > 0.03) {
      batch.addBox('metal_dark', hx, (top + bot) / 2, hz, 0.02, top - bot, 0.02);
    }
  }
}

// pair of wall conduits, horizontal cylinders
function emitConduits(batch, lo, hi, y, face, inward, dir) {
  const len = hi - lo, c = (lo + hi) / 2;
  for (const d of [0.07, 0.19]) {
    const off = face + inward * d;
    if (dir === 'h') { // run along x, wall line at z=face
      addCylPiece(batch, 'metal_dark', 0.05, 0.05, len, c, y, off, { seg: 10, rotZ: Math.PI / 2 });
    } else {
      addCylPiece(batch, 'metal_dark', 0.05, 0.05, len, off, y, c, { seg: 10, rotX: Math.PI / 2 });
    }
  }
}

// concrete planter with snow mound and bare twigs. rotY 0 = long axis on X.
function emitPlanter(batch, x, z, rotY) {
  batch.addBox('column', x, 0.275, z, 1.6, 0.55, 0.6, { rotY });
  const m = new THREE.SphereGeometry(1, 12, 8);
  m.scale(0.72, 0.2, 0.24);
  m.rotateY(rotY);
  m.translate(x, 0.55, z);
  batch.add('snowpile#rnd', m);
  const ca = Math.cos(rotY), sa = Math.sin(rotY);
  const offs = [[-0.45, -0.08], [0.03, 0.1], [0.4, -0.05]];
  for (let i = 0; i < 3; i++) {
    const t = cylGeo(0.008, 0.014, 0.8, 6);
    t.rotateZ((i - 1) * 0.17);
    t.rotateX(i % 2 ? 0.12 : -0.09);
    const [lx, lz] = offs[i];
    t.translate(x + lx * ca + lz * sa, 0.92, z - lx * sa + lz * ca);
    batch.add('frame', t);
  }
}

// tapered snow drift lump. rotY 0 = long axis on X.
function emitDrift(batch, x, z, rotY, scale = 1) {
  const g = bevelBoxGeo(2.0 * scale, 0.35, 0.7, 0.115);
  g.rotateY(rotY + (hash01(x, z) - 0.5) * 0.2);
  g.translate(x, 0.115, z);
  batch.add('snowpile#bev', g);
}

function emitFlagpole(batch, x, z) {
  addCylPiece(batch, 'metal_brushed', 0.09, 0.11, 0.14, x, 0.07, z, { seg: 12 });
  addCylPiece(batch, 'metal_brushed', 0.025, 0.035, 7.0, x, 3.5, z, { seg: 10 });
  const fin = new THREE.SphereGeometry(0.05, 10, 8);
  fin.translate(x, 7.02, z);
  batch.add('metal_brushed', fin);
}

// small warm entry downlight, half-embedded into a wall running along z
function emitDownlight(batch, x, y, z) {
  addCylPiece(batch, 'metal_dark', 0.055, 0.055, 0.2, x, y, z, { seg: 12 });
  addCylPiece(batch, 'light_panel', 0.04, 0.04, 0.02, x + 0.012, y - 0.105, z, { seg: 12 });
}

// navy brand panel + canvas logo plane (built as real meshes, not batched)
let _brandMats = null;
function brandMaterials() {
  if (_brandMats) return _brandMats;
  const tex = makeCanvasTexture(768, 296, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a3d66');
    grad.addColorStop(1, '#122c4c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // hairline frame
    ctx.strokeStyle = 'rgba(143,216,255,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    // 8-point star
    const cx = w * 0.17, cy = h * 0.46, R = h * 0.27;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? R : R * 0.42;
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#dcebf7';
    ctx.fill();
    ctx.strokeStyle = '#8fd8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
    ctx.stroke();
    // wordmark
    ctx.fillStyle = '#e8eff6';
    ctx.font = '600 44px Arial';
    ctx.fillText('NORTHSTAR', w * 0.31, h * 0.4);
    ctx.fillText('LOGISTICS GROUP', w * 0.31, h * 0.58);
    ctx.fillStyle = 'rgba(143,190,220,0.85)';
    ctx.font = '22px Arial';
    ctx.fillText('H O L L O W   P I N E S   C A M P U S', w * 0.31, h * 0.75);
    ctx.fillStyle = 'rgba(143,216,255,0.5)';
    ctx.fillRect(w * 0.31, h * 0.64, w * 0.52, 2);
  }, { repeat: [1, 1], anisotropy: 4 });
  _brandMats = {
    panel: new THREE.MeshStandardMaterial({ color: 0x16365a, roughness: 0.55, metalness: 0.15 }),
    face: new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22,
      roughness: 0.42, metalness: 0.0,
    }),
  };
  return _brandMats;
}

// facing +z by default; rotY spins it around its center
function buildBrandSign(x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const { panel, face } = brandMaterials();
  const body = new THREE.Mesh(boxGeo(3.4, 1.3, 0.06), panel);
  body.castShadow = true; body.receiveShadow = true;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.32, 1.22), face);
  plane.position.z = 0.032;
  g.add(body, plane);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

// ---------------------------------------------------------------------------
// world systems
// ---------------------------------------------------------------------------
const CURB_ROOMS = new Set(['garage', 'loading', 'servicecorr', 'stairwell', 'upperlanding']);
const STRIP_STYLES = new Set(['service', 'garage', 'utility', 'server', 'stairwell']);
const TROFFER_STYLES = new Set(['office', 'conference', 'lobby', 'exec', 'kitchen', 'security', 'archive', 'corridor', 'restroom']);
const BLIND_ROOMS = new Set(['conference', 'itroom', 'execoffice', 'security']);

// skirting board (or curb / wainscot band) along all real walls of a room
function emitSkirting(batch, room, key, h, t) {
  const floorY = FLOOR_Y[room.floor];
  const runs = wallRuns(room);
  const insetOfSide = { w: 0.15, e: 0.15, n: 0.15, s: 0.15 };
  for (const r of runs) insetOfSide[r.side] = Math.max(insetOfSide[r.side] === 0.15 ? 0 : insetOfSide[r.side], r.inset);
  for (const run of runs) {
    let ivs = [[run.lo, run.hi]];
    for (const [a, b] of openingSpans(room, run)) ivs = subtract1D(ivs, a, b);
    const allowed = slabAllowed(room, run);
    if (allowed) ivs = intersect1D(ivs, allowed);
    const [x0, z0, x1, z1] = room.rect;
    const lo0 = run.dir === 'v' ? z0 : x0;
    const hi0 = run.dir === 'v' ? z1 : x1;
    const perpLo = run.dir === 'v' ? insetOfSide.n : insetOfSide.w;
    const perpHi = run.dir === 'v' ? insetOfSide.s : insetOfSide.e;
    for (let [lo, hi] of ivs) {
      if (Math.abs(lo - lo0) < 0.03) lo += perpLo + t + 0.005;
      if (Math.abs(hi - hi0) < 0.03) hi -= perpHi + t + 0.005;
      if (hi - lo < 0.12) continue;
      const c = (lo + hi) / 2, len = hi - lo;
      const off = run.coord + run.inward * (run.inset + t / 2);
      const cy = floorY + h / 2;
      if (run.dir === 'v') batch.addBox(key, off, cy, c, t, h, len);
      else batch.addBox(key, c, cy, off, len, h, t);
    }
  }
}

function buildSkirting(ctx) {
  for (const room of ROOMS) {
    if (room.style === 'exterior') continue;
    if (CURB_ROOMS.has(room.id)) emitSkirting(ctx.batch, room, 'trim', 0.12, 0.03);
    else emitSkirting(ctx.batch, room, 'baseboard', 0.09, 0.015);
  }
}

// absolute ceiling face height over a ground point (floor-1 slab underside
// where an upper room hangs above)
function ceilFaceAt(room, x, z) {
  if (room.floor === 1) return FLOOR_Y[1] + room.ceil;
  const above = roomAtFloor(x, z, 1);
  if (above) return FLOOR_Y[1] - SLAB;
  return room.ceil;
}

function lightGrid(room) {
  const [x0, z0, x1, z1] = room.rect;
  const w = x1 - x0, d = z1 - z0;
  const nx = Math.max(1, Math.round(w / 3.6));
  const nz = Math.max(1, Math.round(d / 3.6));
  const pts = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      pts.push({ x: x0 + (w * (i + 0.5)) / nx, z: z0 + (d * (j + 0.5)) / nz });
    }
  }
  return pts;
}

function buildCeilingFixtures(ctx) {
  const { batch } = ctx;
  for (const room of ROOMS) {
    if (room.style === 'exterior' || room.ceil <= 0) continue;
    if (room.id === 'stairwell') {
      // two sconces on the inner face of the north wall, above the landing
      const face = room.rect[1] + 0.12;
      for (const sx of [-26, -22]) emitSconce(batch, sx, 3.0, face, 'z+');
      continue;
    }
    const [x0, , x1] = room.rect;
    const alongX = (room.rect[2] - room.rect[0]) >= (room.rect[3] - room.rect[1]);
    for (const p of lightGrid(room)) {
      const cy = ceilFaceAt(room, p.x, p.z);
      if (room.id === 'lobby' && cy > 6.0) {
        emitPendant(batch, p.x, cy, cy - 0.6, p.z);
      } else if (STRIP_STYLES.has(room.style)) {
        emitStrip(batch, p.x, cy, p.z, alongX);
      } else {
        emitTroffer(batch, p.x, cy, p.z);
      }
    }
  }
}

function buildColumns(ctx) {
  const { batch, colliders } = ctx;
  // open-plan floor: square structural grid, inset 2.6 m, ~5.5 m bays
  const of = roomById('openfloor').rect;
  const ix0 = of[0] + 2.6, iz0 = of[1] + 2.6, ix1 = of[2] - 2.6, iz1 = of[3] - 2.6;
  const nx = Math.max(1, Math.round((ix1 - ix0) / 5.5)), nz = Math.max(1, Math.round((iz1 - iz0) / 5.5));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const x = ix0 + ((ix1 - ix0) * i) / nx;
      const z = iz0 + ((iz1 - iz0) * j) / nz;
      const g = bevelBoxGeo(0.34, 0.34, 3.0, 0.03);
      g.rotateX(Math.PI / 2);
      g.translate(x, 1.5, z);
      batch.add('column#bev', g);
      colliders.push({
        min: { x: x - 0.17, y: 0, z: z - 0.17 },
        max: { x: x + 0.17, y: 3.0, z: z + 0.17 }, material: 'concrete',
      });
    }
  }
  // lobby: two round columns through the double-height volume
  for (const [x, z] of [[-26, -2], [-26, 3.5]]) {
    addCylPiece(batch, 'column', 0.22, 0.22, 7.0, x, 3.5, z, { seg: 24 });
    colliders.push({
      min: { x: x - 0.22, y: 0, z: z - 0.22 },
      max: { x: x + 0.22, y: 7.0, z: z + 0.22 }, material: 'concrete',
    });
  }
}

// which room each exit sign faces (the "more public" side of the opening)
const EXIT_SIGN_FACES = {
  d_entry: 'vestibule', d_vest: 'lobby', d_stair_lobby: 'lobby',
  d_stair_corr: 'northcorr', d_service: 'southcorr', d_fire_east: 'northcorr',
  d_electrical: 'southcorr', d_loading: 'loading', d_garage_s: 'garage',
  shutter_loading: 'loading',
};

function buildExitSigns(ctx) {
  const { batch } = ctx;
  for (const conn of CONNECTIONS) {
    const faceRoomId = EXIT_SIGN_FACES[conn.id];
    if (!faceRoomId) continue;
    const ce = connEdge(conn);
    if (!ce) continue;
    const faceRoom = roomById(faceRoomId);
    const halfT = pairHalfT(ce.a, ce.b);
    const y = conn.type === 'shutter' ? 3.45 : 2.3;
    const [fx0, fz0, fx1, fz1] = faceRoom.rect;
    if (ce.edge.dir === 'v') {
      const sgn = Math.sign((fx0 + fx1) / 2 - ce.edge.coord) || 1;
      const x = ce.edge.coord + sgn * (halfT + 0.04);
      emitExitSign(batch, x, y, ce.at, 'v', sgn, halfT);
    } else {
      const sgn = Math.sign((fz0 + fz1) / 2 - ce.edge.coord) || 1;
      const z = ce.edge.coord + sgn * (halfT + 0.04);
      emitExitSign(batch, ce.at, y, z, 'h', sgn, halfT);
    }
  }
}

// windows -> world-space descriptor (edge dir/coord, span, heights, wall t)
function windowWorld(w) {
  const room = roomById(w.room);
  const [x0, z0, x1, z1] = room.rect;
  const floorY = FLOOR_Y[room.floor];
  let dir, coord, lo, hi, inward;
  if (w.side === 'w') { dir = 'v'; coord = x0; lo = z0 + w.from; hi = z0 + w.to; inward = 1; }
  else if (w.side === 'e') { dir = 'v'; coord = x1; lo = z0 + w.from; hi = z0 + w.to; inward = -1; }
  else if (w.side === 'n') { dir = 'h'; coord = z0; lo = x0 + w.from; hi = x0 + w.to; inward = 1; }
  else { dir = 'h'; coord = z1; lo = x0 + w.from; hi = x0 + w.to; inward = -1; }
  const mid = (lo + hi) / 2;
  const px = dir === 'v' ? coord - inward * 0.35 : mid;
  const pz = dir === 'v' ? mid : coord - inward * 0.35;
  const other = ROOMS.find((r) => r !== room && r.floor === room.floor && contains(r.rect, px, pz));
  const halfT = other ? pairHalfT(room, other) : WALL_EXT / 2;
  return {
    room, dir, coord, lo, hi, inward, halfT,
    sillY: floorY + w.sill, headY: floorY + w.head,
  };
}

function buildWindowDressing(ctx) {
  const { batch } = ctx;
  for (const w of WINDOWS) {
    const ww = windowWorld(w);
    // interior sill board, centered on the inner wall face
    const face = ww.coord + ww.inward * ww.halfT;
    const c = (ww.lo + ww.hi) / 2, len = ww.hi - ww.lo;
    if (ww.dir === 'v') batch.addBox('trim', face, ww.sillY + 0.02, c, 0.14, 0.03, len);
    else batch.addBox('trim', c, ww.sillY + 0.02, face, len, 0.03, 0.14);
    if (BLIND_ROOMS.has(w.room)) emitBlindsRun(batch, ww);
  }
}

function buildWainscot(ctx) {
  for (const id of ['restroomM', 'restroomW']) {
    emitSkirting(ctx.batch, roomById(id), 'wall_tile_restroom', 1.35, 0.012);
  }
}

// exposed services: duct + conduit pair (+ server cable tray)
const SERVICE_RUNS = [
  { id: 'servicecorr', ductCross: 8.75, cond: 's' },
  { id: 'loading', ductCross: 1.5, cond: 'n' },
  { id: 'garage', ductCross: 31, cond: 's' },
  { id: 'electrical', ductCross: 5, cond: 'w' },
  { id: 'janitor', ductCross: 0, cond: 'w' },
  { id: 'server', ductCross: -16.4, cond: 'n', tray: true },
];

function buildServiceRuns(ctx) {
  const { batch } = ctx;
  for (const cfg of SERVICE_RUNS) {
    const room = roomById(cfg.id);
    const [x0, z0, x1, z1] = room.rect;
    const alongX = (x1 - x0) >= (z1 - z0);
    const ceilY = room.ceil; // all service rooms are ground floor, no slab above
    const ductY = ceilY - 0.35;
    if (alongX) emitDuct(batch, (x0 + x1) / 2, ductY, cfg.ductCross, x1 - x0 - 1.0, true, ceilY);
    else emitDuct(batch, cfg.ductCross, ductY, (z0 + z1) / 2, z1 - z0 - 1.0, false, ceilY);
    // conduit pair on one long wall
    const halfTOf = (side) => {
      const runs = wallRuns(room).filter((r) => r.side === side);
      return runs.length ? runs[0].inset : WALL_EXT / 2;
    };
    if (cfg.cond === 'n' || cfg.cond === 's') {
      const coord = cfg.cond === 'n' ? z0 : z1;
      const inward = cfg.cond === 'n' ? 1 : -1;
      const face = coord + inward * halfTOf(cfg.cond);
      emitConduits(batch, x0 + 0.4, x1 - 0.4, 2.25, face, inward, 'h');
    } else {
      const coord = cfg.cond === 'w' ? x0 : x1;
      const inward = cfg.cond === 'w' ? 1 : -1;
      const face = coord + inward * halfTOf(cfg.cond);
      emitConduits(batch, z0 + 0.4, z1 - 0.4, 2.25, face, inward, 'v');
    }
    if (cfg.tray) {
      // cable tray channel down the room center at y 2.55
      const cz = (z0 + z1) / 2;
      const len = x1 - x0 - 1.2, cx = (x0 + x1) / 2;
      batch.addBox('stainless', cx, 2.55, cz, len, 0.025, 0.3);
      batch.addBox('stainless', cx, 2.59, cz - 0.14, len, 0.09, 0.02);
      batch.addBox('stainless', cx, 2.59, cz + 0.14, len, 0.09, 0.02);
    }
  }
}

function buildHandrails(ctx) {
  const { batch } = ctx;
  const st = STAIRS[0];
  const railKey = 'metal_dark';
  const rail = (p0, p1, postEvery, baseYFn) => {
    addStrut(batch, railKey, p0, p1, 0.045);
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / postEvery));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = p0.x + dx * t, z = p0.z + dz * t;
      const yTop = p0.y + (p1.y - p0.y) * t - 0.02;
      const yBase = baseYFn(x, z) - 0.06;
      if (yTop - yBase < 0.1) continue;
      batch.addBox(railKey, x, (yTop + yBase) / 2, z, 0.03, yTop - yBase, 0.03);
    }
  };
  for (const f of [st.flight1, st.flight2]) {
    const slope = (z) => f.y0 + ((f.y1 - f.y0) * (z - f.zStart)) / (f.zEnd - f.zStart);
    for (const x of [f.x0 + 0.06, f.x1 - 0.06]) {
      rail({ x, y: f.y0 + 0.95, z: f.zStart }, { x, y: f.y1 + 0.95, z: f.zEnd }, 1.2, (px, pz) => slope(pz));
    }
  }
  const L = st.landing;
  const railY = L.y + 0.95;
  const zN = L.z0 + 0.06;
  const flat = () => L.y;
  rail({ x: L.x0 + 0.06, y: railY, z: st.flight1.zEnd }, { x: L.x0 + 0.06, y: railY, z: zN }, 1.1, flat);
  rail({ x: L.x1 - 0.06, y: railY, z: st.flight2.zStart }, { x: L.x1 - 0.06, y: railY, z: zN }, 1.1, flat);
  rail({ x: L.x0 + 0.06, y: railY, z: zN }, { x: L.x1 - 0.06, y: railY, z: zN }, 1.3, flat);
  // wall-side rail across the core face linking the two inner flight rails
  rail({ x: st.flight1.x1 - 0.06, y: railY, z: L.z1 - 0.05 }, { x: st.flight2.x0 + 0.06, y: railY, z: L.z1 - 0.05 }, 1.3, flat);
}

function buildBrandWall(ctx) {
  // lobby north wall (z=-9) faces south; panel sits above the records door
  ctx.group.add(buildBrandSign(-30, 2.78, -8.885, 0));
}

function buildCourtyard(ctx) {
  const { batch, colliders } = ctx;
  // flagpole
  emitFlagpole(batch, -46, -6);
  colliders.push({
    min: { x: -46.12, y: 0, z: -6.12 },
    max: { x: -45.88, y: 7.0, z: -5.88 }, material: 'metal',
  });
  // planters flanking the walkway (long axis north-south)
  for (const z of [-2.5, 8]) {
    emitPlanter(batch, -44, z, Math.PI / 2);
    colliders.push({
      min: { x: -44.3, y: 0, z: z - 0.8 },
      max: { x: -43.7, y: 0.55, z: z + 0.8 }, material: 'concrete',
    });
  }
  // drifts against the building facade (x = -38 wall, face at -38.15)
  for (const z of [-10, -6, 6, 10]) emitDrift(batch, -38.5, z, Math.PI / 2, 0.9 + 0.3 * hash01(z, 3));
  // drifts along the courtyard boundary walls
  for (const z of [-8, -3, 2, 7]) emitDrift(batch, -53.55, z, Math.PI / 2, 0.9 + 0.35 * hash01(z, 7));
  for (const x of [-52, -47.5, -43]) emitDrift(batch, x, -11.55, 0, 0.9 + 0.35 * hash01(x, 11));
  for (const x of [-52.5, -48, -43.5]) emitDrift(batch, x, 11.55, 0, 0.9 + 0.35 * hash01(x, 13));
  // entry downlights flanking the main doors
  for (const z of [-1.8, 1.8]) emitDownlight(batch, -38.1, 2.6, z);
}

// ---------------------------------------------------------------------------
// public entry
// ---------------------------------------------------------------------------
export function buildArchDetails(game) {
  const group = new THREE.Group();
  group.name = 'arch-details';
  const colliders = [];
  const batch = new GeoBatcher();
  const ctx = { batch, group, colliders };
  buildSkirting(ctx);
  buildCeilingFixtures(ctx);
  buildColumns(ctx);
  buildExitSigns(ctx);
  buildWindowDressing(ctx);
  buildWainscot(ctx);
  buildServiceRuns(ctx);
  buildHandrails(ctx);
  buildBrandWall(ctx);
  buildCourtyard(ctx);
  for (const m of batch.buildMeshes(matOf)) group.add(m);
  return { group, colliders };
}

// ---------------------------------------------------------------------------
// asset registry (QA gallery samples)
// ---------------------------------------------------------------------------
function reg(id, name, dims, build) {
  registerAsset({
    id, name, category: 'architecture', agent: 'fable2', status: 'built',
    files: 'src/assets/archkit.js', dims,
    build() {
      const g = new THREE.Group();
      const batch = new GeoBatcher();
      build(batch, g);
      for (const m of batch.buildMeshes(matOf)) {
        m.matrixAutoUpdate = true;
        g.add(m);
      }
      return g;
    },
  });
}

reg('arch_baseboard_kit', 'Baseboard & Concrete Curb', '1.8m runs', (b) => {
  b.addBox('wall_int', 0, 0.5, 0.04, 1.9, 1.0, 0.08);
  b.addBox('baseboard', -0.5, 0.045, -0.0075, 0.9, 0.09, 0.015);
  b.addBox('trim', 0.5, 0.06, -0.015, 0.9, 0.12, 0.03);
});
reg('arch_troffer_light', 'Recessed Troffer Light', '0.62x0.62', (b) => {
  b.addBox('ceiling', 0, 2.28, 0, 1.0, 0.06, 1.0);
  emitTroffer(b, 0, 2.25, 0);
});
reg('arch_pendant_lobby', 'Lobby Pendant Light', 'dia 0.5', (b) => {
  b.addBox('ceiling', 0, 2.62, 0, 0.7, 0.05, 0.7);
  emitPendant(b, 0, 2.6, 2.0, 0);
});
reg('arch_striplight', 'Industrial Strip Light', '1.25m', (b) => {
  b.addBox('ceiling_service', 0, 2.42, 0, 1.5, 0.05, 0.5);
  emitStrip(b, 0, 2.4, 0, true);
});
reg('arch_column_square', 'Square Structural Column', '0.34x3.0', (b) => {
  const g = bevelBoxGeo(0.34, 0.34, 3.0, 0.03);
  g.rotateX(Math.PI / 2);
  g.translate(0, 1.5, 0);
  b.add('column#bev', g);
});
reg('arch_column_round', 'Round Lobby Column', 'dia 0.44', (b) => {
  addCylPiece(b, 'column', 0.22, 0.22, 3.2, 0, 1.6, 0, { seg: 24 });
});
reg('arch_exit_sign', 'Exit Sign', '0.34x0.16', (b) => {
  b.addBox('wall_int', 0, 1.75, 0, 0.8, 0.9, 0.1);
  emitExitSign(b, 0, 1.75, -0.09, 'h', -1, 0.05);
});
reg('arch_blinds', 'Venetian Blinds + Sill', 'per window', (b) => {
  b.addBox('wall_int', 0, 1.5, 0.1, 1.6, 1.9, 0.08);
  emitBlindsRun(b, { dir: 'h', coord: 0.06, inward: -1, halfT: 0.04, lo: -0.7, hi: 0.7, sillY: 0.9, headY: 2.3 });
  b.addBox('trim', 0, 0.92, 0.02, 1.4, 0.03, 0.14);
});
reg('arch_wainscot', 'Restroom Tile Wainscot', '1.35m band', (b) => {
  b.addBox('wall_int', 0, 0.85, 0.04, 1.8, 1.7, 0.08);
  b.addBox('wall_tile_restroom', 0, 0.675, -0.006, 1.8, 1.35, 0.012);
});
reg('arch_duct_kit', 'Duct, Conduit & Cable Tray', '0.5x0.28 duct', (b) => {
  b.addBox('ceiling_service', 0, 2.36, 0, 2.6, 0.05, 1.2);
  emitDuct(b, 0, 1.99, -0.3, 2.4, true, 2.34);
  emitConduits(b, -1.2, 1.2, 1.5, 0.42, -1, 'h');
  b.addBox('stainless', 0, 1.1, 0.1, 2.4, 0.025, 0.3);
  b.addBox('stainless', 0, 1.14, -0.04, 2.4, 0.09, 0.02);
  b.addBox('stainless', 0, 1.14, 0.24, 2.4, 0.09, 0.02);
});
reg('arch_handrail', 'Stair Handrail', '0.95m high', (b) => {
  const p0 = { x: 0, y: 0.95, z: 0.9 }, p1 = { x: 0, y: 1.55, z: -0.9 };
  addStrut(b, 'metal_dark', p0, p1, 0.045);
  for (const t of [0.08, 0.5, 0.92]) {
    const z = p0.z + (p1.z - p0.z) * t;
    const yTop = p0.y + (p1.y - p0.y) * t - 0.02;
    const yBase = (yTop - 0.95) + 0.02;
    b.addBox('metal_dark', 0, (yTop + yBase) / 2, z, 0.03, yTop - yBase, 0.03);
  }
});
reg('arch_brand_wall', 'Lobby Brand Wall', '3.4x1.3', (b, g) => {
  g.add(buildBrandSign(0, 1.5, 0, 0));
});
reg('arch_flagpole', 'Courtyard Flagpole', '7.0m', (b) => {
  emitFlagpole(b, 0, 0);
});
reg('arch_planter', 'Concrete Planter (snowed)', '1.6x0.6', (b) => {
  emitPlanter(b, 0, 0, 0);
});
