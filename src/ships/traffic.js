// Ship traffic over Coruscant: deterministic lanes above the city plus landing / take-off cycles on the spaceport
// pads. Every ship's pose is a pure function of the shared 20 TPS clock (tick + render alpha), so all clients agree
// and the same landing happens at the same tick on every load. Rendering is one InstancedMesh per ship model
// (<= 1 draw call per model type); ships farther than HIDE_DIST from the camera are not submitted.
//
// Route model: a route is a periodic list of segments
//   fly   - arc-length parameterised Catmull-Rom path with an accelerate / cruise / decelerate speed profile
//   vert  - vertical translation over a pad (descent, touchdown, lift, climb) with the approach heading held
//   hold  - hover (small bob) or dwell on the pad
// Pad routes: closed loop around the city that stops above the pad -> descend -> hover 2 s -> touch down ->
// dwell 15..40 s -> lift -> hover -> climb -> next loop. Lane routes: closed loop at constant speed.
// Banking comes from the path curvature (lateral acceleration vs gravity), pitch from the climb angle.
import * as THREE from 'three';
import { hash2 } from '../rng.js';
import { TICK_RATE } from '../constants.js';
import { shipModels, shipMaterial, makeShipInstances } from './models.js';

export const HIDE_DIST = 300;          // ships beyond this are not drawn
const AUDIO_DIST = 220, MAX_LOOPS = 3;
const G = 9.81;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const wrapAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// ------------------------------------------------------------------------------------------------ paths
function catmullRom(p0, p1, p2, p3, t, out) {
  const t2 = t * t, t3 = t2 * t;
  for (let i = 0; i < 3; i++) {
    out[i] = 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
  }
}

export class Path {
  constructor(points, closed) {
    const n = points.length, segs = closed ? n : n - 1;
    const get = (i) => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
    const samples = [], tmp = [0, 0, 0];
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
      const steps = Math.max(2, Math.ceil(segLen / 2));
      for (let k = 0; k < steps; k++) { catmullRom(p0, p1, p2, p3, k / steps, tmp); samples.push(tmp[0], tmp[1], tmp[2]); }
    }
    const last = closed ? points[0] : points[n - 1];
    samples.push(last[0], last[1], last[2]);
    this.pts = new Float32Array(samples);
    this.n = samples.length / 3;
    this.cum = new Float32Array(this.n);
    let L = 0;
    for (let i = 1; i < this.n; i++) {
      const a = (i - 1) * 3, b = i * 3;
      L += Math.hypot(this.pts[b] - this.pts[a], this.pts[b + 1] - this.pts[a + 1], this.pts[b + 2] - this.pts[a + 2]);
      this.cum[i] = L;
    }
    this.length = L;
    this.closed = closed;
  }
  // position at arc length s (wrapped when closed, clamped otherwise) -> out {x,y,z}
  at(s, out) {
    const L = this.length;
    if (this.closed) { s %= L; if (s < 0) s += L; } else s = clamp(s, 0, L);
    let lo = 0, hi = this.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (this.cum[mid] <= s) lo = mid; else hi = mid; }
    const segL = this.cum[hi] - this.cum[lo], f = segL > 0 ? (s - this.cum[lo]) / segL : 0;
    const a = lo * 3, b = hi * 3, p = this.pts;
    out.x = p[a] + (p[b] - p[a]) * f; out.y = p[a + 1] + (p[b + 1] - p[a + 1]) * f; out.z = p[a + 2] + (p[b + 2] - p[a + 2]) * f;
    return out;
  }
  // unit tangent at s (central difference over 3 blocks)
  tangent(s, out) {
    const a = this.at(s - 1.5, { x: 0, y: 0, z: 0 }), b = this.at(s + 1.5, { x: 0, y: 0, z: 0 });
    out.x = b.x - a.x; out.y = b.y - a.y; out.z = b.z - a.z;
    const l = Math.hypot(out.x, out.y, out.z) || 1;
    out.x /= l; out.y /= l; out.z /= l;
    return out;
  }
  heading(s) { const t = this.tangent(s, { x: 0, y: 0, z: 0 }); return Math.atan2(-t.x, -t.z); }
}

// accelerate (linear) over accelDist, cruise at v, decelerate over accelDist; accelDist 0 = constant speed
function makeProfile(L, v, accelDist) {
  const Da = Math.min(accelDist, L / 2);
  const ta = Da > 0 ? 2 * Da / v : 0, tc = (L - 2 * Da) / v, T = 2 * ta + tc;
  return {
    T,
    s(t) {
      if (t < ta) return (v / (2 * ta)) * t * t;
      if (t < ta + tc) return Da + v * (t - ta);
      const r = Math.max(0, T - t); return L - (v / (2 * ta)) * r * r;
    },
    v(t) {
      if (t < ta) return v * t / ta;
      if (t < ta + tc) return v;
      return v * Math.max(0, T - t) / ta;
    },
  };
}

// ------------------------------------------------------------------------------------------------ routes
function makeRoute(segs) {
  let t0 = 0;
  for (const s of segs) { s.t0 = t0; t0 += s.dur; }
  return { segs, period: t0 };
}

// Pad ship: loop over the city starting/ending above the pad, then the landing cycle.
function padRoute(pad, side, k, speed, deckY, dwell) {
  const s = side, P = pad;
  const loop = [
    [P.x, 130, P.z],
    [P.x - 70, 140, P.z - s * 10],
    [2430, 158 + 4 * k, s * (200 + 30 * k)],
    [2560, 190 + 4 * k, s * (470 - 10 * k)],
    [3050, 196 + 4 * k, s * (482 - 12 * k)],
    [3400, 182 + 4 * k, s * (300 + 25 * k)],
    [3050, 170 + 4 * k, s * (120 + 40 * k)],
    [2790, 150 + 2 * k, s * (160 + 15 * k)],
    [P.x + 70, 138, P.z + s * 10],
  ];
  const path = new Path(loop, true);
  const prof = makeProfile(path.length, speed, 120);
  const yaw = path.heading(0);
  const hover = deckY + 4, top = 130;
  return makeRoute([
    { kind: 'fly', path, prof, dur: prof.T, phase: 'fly' },
    { kind: 'vert', x: P.x, z: P.z, y0: top, y1: hover, dur: 8, yaw, thrust: 0.8, phase: 'descend' },
    { kind: 'hold', x: P.x, z: P.z, y: hover, dur: 2, yaw, bob: 0.25, thrust: 0.7, phase: 'hover' },
    { kind: 'vert', x: P.x, z: P.z, y0: hover, y1: deckY, dur: 2.5, yaw, thrust: 0.45, thrust1: 0.15, phase: 'touchdown' },
    { kind: 'hold', x: P.x, z: P.z, y: deckY, dur: dwell, yaw, bob: 0, thrust: 0.12, phase: 'dwell' },
    { kind: 'vert', x: P.x, z: P.z, y0: deckY, y1: hover, dur: 2.5, yaw, thrust: 0.9, phase: 'lift' },
    { kind: 'hold', x: P.x, z: P.z, y: hover, dur: 1, yaw, bob: 0.2, thrust: 0.9, phase: 'hover' },
    { kind: 'vert', x: P.x, z: P.z, y0: hover, y1: top, dur: 7, yaw, thrust: 1, phase: 'climb' },
  ]);
}

function laneRoute(points, speed) {
  const path = new Path(points, true);
  const prof = makeProfile(path.length, speed, 0);
  return makeRoute([{ kind: 'fly', path, prof, dur: prof.T, phase: 'fly' }]);
}

// The sky lanes over the plateau (city centre (3000, 0), half size 512).
function laneLoops() {
  const ring = (cx, cz, r, y, n, wobble, ywob) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r + wobble * Math.sin(3 * a);
      pts.push([cx + Math.cos(a) * rr, y + ywob * Math.cos(2 * a), cz + Math.sin(a) * rr]);
    }
    return pts;
  };
  return [
    { name: 'outer ring', pts: ring(3000, 0, 440, 160, 12, 25, 10), types: [0, 1, 3], speedMul: 1 },
    { name: 'inner ring', pts: ring(3030, 30, 260, 132, 10, 18, 6).reverse(), types: [1, 3, 0], speedMul: 0.9 },
    { name: 'high cross', pts: [[2560, 205, -430], [3000, 212, -470], [3440, 205, -430], [3480, 200, 0], [3440, 205, 430], [3000, 212, 470], [2560, 205, 430], [2520, 200, 0]], types: [0, 1], speedMul: 1.1 },
    { name: 'spaceport low loop', pts: [[2540, 118, -240], [2700, 122, -250], [2790, 126, -60], [2790, 126, 60], [2700, 122, 250], [2540, 118, 240], [2480, 121, 0]], types: [2, 2, 2], speedMul: 1 },
  ];
}

// Builds the deterministic ship list: { type, route, offset, name, pad } (pure data, no THREE).
export function buildShips(pads, deckY) {
  const models = shipModels();
  const ships = [];
  const padTypes = [0, 1, 3, 1, 0, 2, 3, 0];
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i], type = padTypes[i % padTypes.length], side = pad.z < 0 ? -1 : 1;
    const k = i % 4;
    const dwell = Math.round(15 + hash2(i, 3, 901) * 25);
    const route = padRoute(pad, side, k, models[type].speed, deckY, dwell);
    ships.push({ type, route, offset: Math.floor(hash2(i, 5, 902) * route.period), name: `${models[type].name} pad ${i + 1}`, pad: i });
  }
  laneLoops().forEach((lane, li) => {
    lane.types.forEach((type, j) => {
      const route = laneRoute(lane.pts, models[type].speed * lane.speedMul);
      const offset = (j / lane.types.length) * route.period + hash2(li, j, 903) * 20;
      ships.push({ type, route, offset, name: `${models[type].name} ${lane.name} #${j + 1}`, pad: null });
    });
  });
  return ships;
}

// Pose of a route at time t (seconds): position, yaw/pitch/roll, thrust 0..1, phase name, speed.
const _tan = { x: 0, y: 0, z: 0 };
export function routePose(route, t, out) {
  let tl = t % route.period; if (tl < 0) tl += route.period;
  const segs = route.segs;
  let i = 0;
  while (i < segs.length - 1 && tl >= segs[i].t0 + segs[i].dur) i++;
  const seg = segs[i], u = tl - seg.t0;
  out.phase = seg.phase; out.roll = 0; out.pitch = 0;
  if (seg.kind === 'fly') {
    const s = seg.prof.s(u), v = seg.prof.v(u), path = seg.path;
    path.at(s, out);
    path.tangent(s, _tan);
    out.yaw = Math.atan2(-_tan.x, -_tan.z);
    out.pitch = Math.asin(clamp(_tan.y, -1, 1)) * 0.7;
    // bank from horizontal curvature: lateral acceleration v^2 * kappa against gravity
    const d = 4;
    const k = wrapAngle(path.heading(s + d) - path.heading(s - d)) / (2 * d);
    out.roll = clamp(Math.atan2(v * v * k, G), -0.75, 0.75);
    out.thrust = 1; out.speed = v;
  } else if (seg.kind === 'vert') {
    const f = smooth(u / seg.dur);
    out.x = seg.x; out.z = seg.z; out.y = seg.y0 + (seg.y1 - seg.y0) * f; out.yaw = seg.yaw;
    out.thrust = seg.thrust1 !== undefined ? seg.thrust + (seg.thrust1 - seg.thrust) * f : seg.thrust;
    out.speed = Math.abs(seg.y1 - seg.y0) / seg.dur;
  } else {
    out.x = seg.x; out.z = seg.z; out.y = seg.y + seg.bob * Math.sin(u * 2.5); out.yaw = seg.yaw;
    out.thrust = seg.thrust; out.speed = 0;
  }
  return out;
}

// Next time >= t at which the ship's segment `phase` starts (for cameras / tests). Returns null for lane ships.
export function nextPhaseStart(ship, phase, t) {
  const r = ship.route;
  const seg = r.segs.find((s) => s.phase === phase);
  if (!seg) return null;
  const ts = t + ship.offset;
  const cycles = Math.floor((ts - seg.t0) / r.period);
  let start = seg.t0 + (cycles + 1) * r.period;
  if (seg.t0 + cycles * r.period >= ts) start = seg.t0 + cycles * r.period;
  return start - ship.offset;
}

// ------------------------------------------------------------------------------------------------ vehicle
export class ShipTraffic {
  constructor(game, spec) {
    this.game = game;
    this.pads = spec.pads;
    this.deckY = spec.deckY;
    this.ships = buildShips(this.pads, this.deckY);
    this.models = shipModels();
    this.tickCount = 0;
    this.group = new THREE.Group();
    this.group.name = 'ship-traffic';
    this.material = shipMaterial(game.atlas);
    this.types = this.models.map((m, ti) => {
      const capacity = Math.max(1, this.ships.filter((s) => s.type === ti).length);
      const inst = makeShipInstances(m, this.material, capacity);
      this.group.add(inst.mesh);
      return { ...inst, capacity, count: 0 };
    });
    this._pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, thrust: 1, phase: 'fly', speed: 0 };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    for (const sh of this.ships) { sh.x = 0; sh.y = 0; sh.z = 0; sh.dist = Infinity; sh.phase = 'fly'; sh.prevPhase = 'fly'; sh.speed = 0; sh.loop = false; sh.prevDist = Infinity; }
    this.audioTimer = 0;
    this.stats = { ships: this.ships.length, visible: 0, drawCalls: 0, loops: 0 };
  }

  onAdd(game) { game.scene.add(this.group); }
  onRemove(game) { game.scene.remove(this.group); this.stopAudio(); }

  tick(tickCount) { this.tickCount = tickCount; }

  // current simulation time in seconds (tick clock + render alpha)
  timeAt(alpha) { return (this.tickCount + alpha) / TICK_RATE; }

  update(dt, alpha, camera) {
    const t = this.timeAt(alpha);
    this.material.uniforms.uTime.value = t % 1000;
    const cam = camera.position, world = this.game.world;
    for (const ty of this.types) ty.count = 0;
    let visible = 0;
    const pose = this._pose;
    for (const sh of this.ships) {
      routePose(sh.route, t + sh.offset, pose);
      sh.x = pose.x; sh.y = pose.y; sh.z = pose.z; sh.prevPhase = sh.phase; sh.phase = pose.phase; sh.speed = pose.speed; sh.thrust = pose.thrust;
      sh.dist = Math.hypot(pose.x - cam.x, pose.y - cam.y, pose.z - cam.z);
      if (sh.dist > HIDE_DIST) continue;
      const ty = this.types[sh.type], k = ty.count++;
      this._e.set(pose.pitch, pose.yaw, pose.roll);
      this._q.setFromEuler(this._e);
      this._p.set(pose.x, pose.y, pose.z);
      this._m.compose(this._p, this._q, this._s);
      ty.mesh.setMatrixAt(k, this._m);
      const l = world.sampleLight(pose.x, pose.y + 1, pose.z);
      ty.attr.setXYZ(k, l[0], l[1], pose.thrust);
      visible++;
    }
    let calls = 0;
    for (const ty of this.types) {
      ty.mesh.count = ty.count;
      ty.mesh.visible = ty.count > 0;
      if (ty.count > 0) { ty.mesh.instanceMatrix.needsUpdate = true; ty.attr.needsUpdate = true; calls++; }
    }
    this.stats.visible = visible; this.stats.drawCalls = calls;
    this.updateAudio(dt);
  }

  // Engine whine: sawtooth through a resonant low-pass per ship, at most MAX_LOOPS nearest ships within AUDIO_DIST;
  // one-shots on touchdown and lift-off.
  updateAudio(dt) {
    const audio = this.game.audio;
    if (!audio || !audio.ctx) return;
    for (const sh of this.ships) {
      if (sh.phase !== sh.prevPhase && sh.dist < 160) {
        const pos = { x: sh.x, y: sh.y, z: sh.z };
        if (sh.phase === 'dwell') { audio.noise(0.6, 'lowpass', 420, 0.7, 0.55, pos, 170, 0.01, 90); audio.tone('sine', 70, 40, 0.5, 0.25, pos, 170, 0.01); }
        else if (sh.phase === 'lift') audio.noise(1.4, 'bandpass', 700, 0.8, 0.35, pos, 170, 0.4, 1600);
      }
    }
    this.audioTimer += dt;
    if (this.audioTimer < 0.12) return;
    this.audioTimer = 0;
    const near = this.ships.filter((s) => s.dist < AUDIO_DIST).sort((a, b) => a.dist - b.dist).slice(0, MAX_LOOPS);
    let loops = 0;
    for (let i = 0; i < this.ships.length; i++) {
      const sh = this.ships[i], id = 'ship' + i;
      const keep = near.includes(sh);
      if (!keep) { if (sh.loop) { audio.loopStop(id, 0.5); sh.loop = false; } continue; }
      const m = this.models[sh.type];
      if (!sh.loop) { audio.loopStart(id, { kind: 'osc', type: 'sawtooth', freq: m.engineHz, cutoff: 400, q: 2.5, gain: 0 }); sh.loop = true; }
      const nearF = 1 - sh.dist / AUDIO_DIST;
      const radial = (sh.prevDist - sh.dist) / 0.12;                 // closing speed (blocks/s), exaggerated doppler
      const thr = 0.35 + 0.65 * sh.thrust;
      const gain = m.gain * 0.2 * Math.pow(nearF, 1.6) * thr;
      const freq = m.engineHz * (0.85 + 0.3 * Math.min(1, sh.speed / 40) + 0.2 * sh.thrust) * clamp(1 + radial / 400, 0.8, 1.25);
      const sp = audio.spatialFor({ x: sh.x, y: sh.y, z: sh.z }, AUDIO_DIST);
      audio.loopSet(id, { gain, freq, cutoff: 250 + 1600 * nearF * thr, pan: sp.pan }, 0.15);
      loops++;
    }
    for (const sh of this.ships) sh.prevDist = sh.dist;
    this.stats.loops = loops;
  }

  stopAudio() {
    const audio = this.game.audio;
    for (let i = 0; i < this.ships.length; i++) if (this.ships[i].loop) { if (audio) audio.loopStop('ship' + i, 0.3); this.ships[i].loop = false; }
  }

  // --- helpers for tests / cameras --------------------------------------------------------------
  poseOf(i, t) { return routePose(this.ships[i].route, t + this.ships[i].offset, { ...this._pose }); }
  // ticks until ship i next starts `phase` (e.g. 'descend'), from the current clock
  ticksUntil(i, phase) { const t = this.timeAt(0); const nt = nextPhaseStart(this.ships[i], phase, t); return nt === null ? null : Math.round((nt - t) * TICK_RATE); }
  summary() {
    const byPhase = {};
    for (const sh of this.ships) byPhase[sh.phase] = (byPhase[sh.phase] || 0) + 1;
    return { ...this.stats, byPhase, tick: this.tickCount };
  }
}

// Adds the traffic vehicle once the game has its vehicle manager, world and atlas (register() runs before they exist).
export function installShipTraffic(game, spec) {
  if (!game || typeof requestAnimationFrame !== 'function') return;
  const tryInstall = () => {
    if (game.shipTraffic) return;
    if (game.vehicles && game.world && game.scene && game.atlas) { game.shipTraffic = game.vehicles.add(new ShipTraffic(game, spec)); return; }
    requestAnimationFrame(tryInstall);
  };
  tryInstall();
}
