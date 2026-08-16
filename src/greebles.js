// Reusable procedural construction kits: pipes, valves, gauges, cables, rails,
// boxes, vents, lamps, fasteners. Owner: pipes/valves/greebles agent.
// Repeated small parts (bolts, rivets, clamps) go through shared instancers.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as M from './materials.js';
import { canvasTexture } from './textures.js';

// ---------------------------------------------------------------------------
// Shared instancers for fasteners
// ---------------------------------------------------------------------------
const instancers = {
  boltS: { mats: [], geo: null, size: 0.011 },
  boltM: { mats: [], geo: null, size: 0.02 },
  rivet: { mats: [], geo: null, size: 0.009 },
  clamp: { mats: [], geo: null },
};

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _v2 = new THREE.Vector3();

// place a bolt at world pos, axis pointing along `normal`
export function addBolt(pos, normal, size = 'S', scale = 1) {
  const key = size === 'M' ? 'boltM' : size === 'R' ? 'rivet' : 'boltS';
  _q.setFromUnitVectors(UP, _v2.copy(normal).normalize());
  _m4.compose(_v.copy(pos), _q, _s.set(scale, scale, scale));
  instancers[key].mats.push(_m4.clone());
}

export function finalizeInstancers(scene) {
  const out = [];
  const mkHex = (r, h) => new THREE.CylinderGeometry(r, r, h, 6);
  const defs = [
    ['boltS', mkHex(0.011, 0.008), M.bareSteel()],
    ['boltM', mkHex(0.02, 0.014), M.darkSteel()],
    ['rivet', new THREE.SphereGeometry(0.009, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.bareSteel()],
  ];
  for (const [key, geo, mat] of defs) {
    const list = instancers[key].mats;
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    for (let i = 0; i < list.length; i++) im.setMatrixAt(i, list[i]);
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = false; im.receiveShadow = true;
    im.userData.static = true;
    scene.add(im);
    out.push(im);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Animatables owned by the kit (fans, gauge needles)
// ---------------------------------------------------------------------------
const kitAnims = [];
let machineryFactor = 1; // 1 = cruising, ~0.35 = silent running
export function setMachineryFactor(f) { machineryFactor = f; }
export function getMachineryFactor() { return machineryFactor; }
export function kitTick(simTime, dt) { for (const fn of kitAnims) fn(simTime, dt); }

// ---------------------------------------------------------------------------
// Pipes
// ---------------------------------------------------------------------------
function buildPath(points, cornerR) {
  const pts = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  if (pts.length === 2) {
    path.add(new THREE.LineCurve3(pts[0], pts[1]));
    return path;
  }
  let prev = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = prev, b = pts[i], c = pts[i + 1];
    const ab = b.clone().sub(a), bc = c.clone().sub(b);
    const lenAB = ab.length(), lenBC = bc.length();
    const r = Math.min(cornerR, lenAB * 0.45, lenBC * 0.45);
    const p1 = b.clone().sub(ab.clone().normalize().multiplyScalar(r));
    const p2 = b.clone().add(bc.clone().normalize().multiplyScalar(r));
    if (p1.distanceTo(a) > 1e-4) path.add(new THREE.LineCurve3(a.clone(), p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    prev = p2;
  }
  path.add(new THREE.LineCurve3(prev, pts[pts.length - 1].clone()));
  return path;
}

// pipeRun: points [[x,y,z],...], opts {r, color|material, flanges:'ends'|'none'|[t..], clampEvery, cornerR}
export function pipeRun(points, opts = {}) {
  const {
    r = 0.05, color = 'gray', material = null,
    flanges = 'ends', clampEvery = 0, cornerR = r * 2.4,
    radialSegments = 10, capEnds = true,
  } = opts;
  const mat = material || M.pipePaint(color);
  const group = new THREE.Group();
  group.userData.static = true;
  const path = buildPath(points, cornerR);
  const len = path.getLength();
  const tubularSegments = Math.max(6, Math.round(len * 14));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, tubularSegments, r, radialSegments, false), mat);
  tube.castShadow = false; tube.receiveShadow = true;
  group.add(tube);

  const addFlange = (t) => {
    const pos = path.getPointAt(t);
    const tan = path.getTangentAt(t);
    const fl = new THREE.Mesh(flangeGeo(r), M.darkSteel());
    fl.position.copy(pos);
    fl.quaternion.setFromUnitVectors(UP, tan);
    fl.receiveShadow = true;
    group.add(fl);
    // bolt circle
    const n = r > 0.06 ? 8 : 6;
    const basis = new THREE.Vector3(1, 0, 0);
    if (Math.abs(tan.x) > 0.9) basis.set(0, 1, 0);
    const u = basis.clone().cross(tan).normalize();
    const w = tan.clone().cross(u).normalize();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bp = pos.clone()
        .add(u.clone().multiplyScalar(Math.cos(a) * r * 1.42))
        .add(w.clone().multiplyScalar(Math.sin(a) * r * 1.42))
        .add(tan.clone().multiplyScalar(r * 0.34));
      addBolt(bp, tan, r > 0.07 ? 'M' : 'S');
    }
  };
  if (flanges === 'ends') { addFlange(0.002); addFlange(0.998); }
  else if (Array.isArray(flanges)) for (const t of flanges) addFlange(t);

  if (capEnds) {
    for (const t of [0, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, radialSegments, 6), mat);
      cap.position.copy(path.getPointAt(t));
      group.add(cap);
    }
  }

  if (clampEvery > 0) {
    const count = Math.floor(len / clampEvery);
    const axis = new THREE.Vector2(0, 0.86); // hull axis in xy
    const m3 = new THREE.Matrix4();
    for (let i = 1; i <= count; i++) {
      const t = (i * clampEvery) / len;
      if (t >= 0.98) break;
      const pos = path.getPointAt(t);
      const tan = path.getTangentAt(t);
      const cl = pipeClamp(r);
      cl.position.copy(pos);
      // base plate (-Y local) points outward toward the hull
      const out = new THREE.Vector3(pos.x - axis.x, pos.y - axis.y, 0).normalize();
      let yAxis = out.clone().multiplyScalar(-1);
      // make orthogonal to tangent
      yAxis.addScaledVector(tan, -yAxis.dot(tan)).normalize();
      if (yAxis.lengthSq() < 0.1) yAxis = new THREE.Vector3(0, 1, 0);
      const xAxis = new THREE.Vector3().crossVectors(yAxis, tan).normalize();
      m3.makeBasis(xAxis, yAxis, tan);
      cl.quaternion.setFromRotationMatrix(m3);
      group.add(cl);
    }
  }
  return group;
}

const flangeGeoCache = new Map();
function flangeGeo(r) {
  const key = r.toFixed(3);
  if (!flangeGeoCache.has(key)) {
    flangeGeoCache.set(key, new THREE.CylinderGeometry(r * 1.55, r * 1.55, r * 0.55, 16));
  }
  return flangeGeoCache.get(key);
}

export function pipeClamp(r) {
  const g = new THREE.Group();
  g.userData.static = true;
  const strap = new THREE.Mesh(new THREE.TorusGeometry(r * 1.12, r * 0.16, 6, 14), M.galvanized());
  g.add(strap);
  const base = new THREE.Mesh(new THREE.BoxGeometry(r * 2.9, r * 0.5, r * 0.8), M.galvanized());
  base.position.y = -r * 1.25;
  g.add(base);
  return g;
}

// ---------------------------------------------------------------------------
// Valves & gauges
// ---------------------------------------------------------------------------
export function valveWheel(r = 0.09, mat = M.functionalRedPaint()) {
  const g = new THREE.Group();
  g.userData.static = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.14, 8, 22), mat);
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.09, r * 0.09, r * 2, 6), mat);
    spoke.rotation.z = (i / 3) * Math.PI;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, r * 0.34, 10), M.bareSteel());
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  return g;
}

// A valve on a pipe of radius pr. Wheel axis = +y by default.
export function valveAssembly(pr = 0.05, { wheelR = null, wheelMat = null, bodyMat = null } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const wr = wheelR || Math.max(0.07, pr * 1.7);
  const body = new THREE.Mesh(new THREE.SphereGeometry(pr * 1.5, 12, 10), bodyMat || M.darkSteel());
  body.scale.set(1, 0.92, 1.25);
  g.add(body);
  const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.85, pr * 1.1, pr * 1.6, 10), bodyMat || M.darkSteel());
  bonnet.position.y = pr * 1.4;
  g.add(bonnet);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.22, pr * 0.22, pr * 2.4, 8), M.bareSteel());
  stem.position.y = pr * 2.2;
  g.add(stem);
  const wheel = valveWheel(wr, wheelMat || M.functionalRedPaint());
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = pr * 3.1;
  g.add(wheel);
  // flange bolts on body sides
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(flangeGeo(pr), M.darkSteel());
    fl.rotation.x = Math.PI / 2;
    fl.position.z = s * pr * 1.5;
    g.add(fl);
  }
  return g;
}

let dialCount = 0;
export function gauge({ r = 0.07, label = 'BAR', max = 16, value = 0.55, unit = '', animate = true } = {}) {
  const g = new THREE.Group();
  g.userData.static = false; // needle animates
  const rng = makeRng(`gauge:${dialCount++}:${label}`);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, r * 0.6, 20), M.gunmetal());
  housing.rotation.x = Math.PI / 2;
  g.add(housing);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, r * 0.09, 8, 22), M.chrome());
  g.add(bezel);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 20), M.dialMaterial(label, max, unit));
  dial.position.z = r * 0.31;
  g.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.72, r * 0.02), new THREE.MeshStandardMaterial({ color: 0x8e3030, roughness: 0.5 }));
  needle.geometry.translate(0, r * 0.3, 0);
  needle.position.z = r * 0.345;
  g.add(needle);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 20), M.glassInstrument());
  glass.position.z = r * 0.38;
  glass.userData.noRaycast = true;
  g.add(glass);
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  const baseVal = value + rng.range(-0.08, 0.08);
  const phase = rng.range(0, 6.28), rate = rng.range(0.3, 0.9);
  const setNeedle = (v) => {
    const a = a0 + (a1 - a0) * Math.max(0, Math.min(1, v));
    needle.rotation.z = -(a - Math.PI * 1.5);
  };
  setNeedle(baseVal);
  if (animate) {
    kitAnims.push((t) => {
      const wob = Math.sin(t * rate + phase) * 0.012 + Math.sin(t * rate * 3.7 + phase) * 0.006;
      setNeedle(baseVal * (0.6 + 0.4 * machineryFactor) + wob);
    });
  }
  return g;
}

// ---------------------------------------------------------------------------
// Cables
// ---------------------------------------------------------------------------
export function cableRun(points, { r = 0.012, sag = 0.05, mat = null, seed = 'cable' } = {}) {
  const rng = makeRng(seed);
  const pts = points.map((p) => new THREE.Vector3(...p));
  const withSag = [];
  for (let i = 0; i < pts.length - 1; i++) {
    withSag.push(pts[i]);
    const mid = pts[i].clone().lerp(pts[i + 1], 0.5);
    mid.y -= sag * (0.6 + rng() * 0.8);
    withSag.push(mid);
  }
  withSag.push(pts[pts.length - 1]);
  const curve = new THREE.CatmullRomCurve3(withSag, false, 'catmullrom', 0.1);
  const len = curve.getLength();
  const geo = new THREE.TubeGeometry(curve, Math.max(8, Math.round(len * 10)), r, 6, false);
  const mesh = new THREE.Mesh(geo, mat || M.plasticBlack());
  mesh.userData.static = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cableBundle(points, { count = 3, r = 0.01, spread = 0.02, sag = 0.05, seed = 'bundle' } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const rng = makeRng(seed);
  const mats = [M.plasticBlack(), M.rubberMat(), M.pipePaint('dark')];
  for (let i = 0; i < count; i++) {
    const off = [rng.range(-spread, spread), rng.range(-spread, spread), rng.range(-spread, spread)];
    const pts = points.map((p, j) => [p[0] + off[0] * (j % 2 ? 1 : 0.5), p[1] + off[1], p[2] + off[2] * 0.4]);
    g.add(cableRun(pts, { r: r * rng.range(0.8, 1.25), sag, mat: mats[i % mats.length], seed: seed + i }));
  }
  return g;
}

export function cableTray(length, { width = 0.16, mat = null } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const m = mat || M.galvanized();
  const side = new THREE.BoxGeometry(0.02, 0.05, length);
  const s1 = new THREE.Mesh(side, m); s1.position.x = -width / 2;
  const s2 = new THREE.Mesh(side, m); s2.position.x = width / 2;
  g.add(s1, s2);
  const rungGeo = new THREE.BoxGeometry(width, 0.015, 0.025);
  const n = Math.floor(length / 0.22);
  for (let i = 0; i <= n; i++) {
    const rung = new THREE.Mesh(rungGeo, m);
    rung.position.set(0, -0.017, -length / 2 + (i / n) * length);
    g.add(rung);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Rails / structure
// ---------------------------------------------------------------------------
export function handrail(points, { r = 0.02, mat = null, stanchionEvery = 0.9, baseY = 0 } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const m = mat || M.bareSteel();
  const path = buildPath(points, 0.08);
  const len = path.getLength();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, Math.round(len * 10)), r, 10, false), m);
  tube.receiveShadow = true;
  g.add(tube);
  for (const t of [0, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
    cap.position.copy(path.getPointAt(t));
    g.add(cap);
  }
  if (stanchionEvery > 0) {
    const count = Math.max(1, Math.floor(len / stanchionEvery));
    for (let i = 0; i <= count; i++) {
      const t = Math.min(0.995, Math.max(0.005, i / count));
      const p = path.getPointAt(t);
      const h = p.y - baseY;
      if (h < 0.05) continue;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, h, 8), m);
      st.position.set(p.x, baseY + h / 2, p.z);
      g.add(st);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 2.2, r * 2.6, 0.012, 10), M.darkSteel());
      foot.position.set(p.x, baseY + 0.006, p.z);
      g.add(foot);
    }
  }
  return g;
}

export function junctionBox(w = 0.22, h = 0.3, d = 0.12, { mat = null, label = null, glands = 2 } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const m = mat || M.cabinetGray();
  const body = new THREE.Mesh(roundedBox(w, h, d, 0.012), m);
  body.castShadow = false; body.receiveShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(roundedBox(w * 0.86, h * 0.86, 0.014, 0.008), m);
  lid.position.z = d / 2 + 0.004;
  g.add(lid);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBolt(new THREE.Vector3(sx * w * 0.36, sy * h * 0.36, d / 2 + 0.012).applyMatrix4(g.matrix), new THREE.Vector3(0, 0, 1), 'S');
  }
  for (let i = 0; i < glands; i++) {
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 8), M.bareSteel());
    gl.position.set(-w / 4 + (i * w) / 2 / Math.max(1, glands - 1), -h / 2 - 0.02, 0);
    g.add(gl);
  }
  if (label) {
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.22), M.labelMaterial(label, { w: 128, h: 40, size: 18 }));
    lab.position.z = d / 2 + 0.013;
    lab.position.y = h * 0.24;
    g.add(lab);
  }
  return g;
}

// flat annular ring with thickness (for bolted retainer rings, trim rings)
export function ringPlate(rIn, rOut, h, segments = 40) {
  const pts = [
    new THREE.Vector2(rIn, -h / 2),
    new THREE.Vector2(rOut, -h / 2),
    new THREE.Vector2(rOut, h / 2),
    new THREE.Vector2(rIn, h / 2),
    new THREE.Vector2(rIn, -h / 2),
  ];
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

const rboxCache = new Map();
export function roundedBox(w, h, d, r = 0.01, seg = 2) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${r}:${seg}`;
  if (rboxCache.has(key)) return rboxCache.get(key);
  // lightweight rounded box: box with beveled edges via extrude
  const shape = new THREE.Shape();
  const hw = w / 2 - r, hh = h / 2 - r;
  shape.moveTo(-hw, -h / 2);
  shape.lineTo(hw, -h / 2);
  shape.absarc(hw, -hh, r, -Math.PI / 2, 0);
  shape.lineTo(w / 2, hh);
  shape.absarc(hw, hh, r, 0, Math.PI / 2);
  shape.lineTo(-hw, h / 2);
  shape.absarc(-hw, hh, r, Math.PI / 2, Math.PI);
  shape.lineTo(-w / 2, -hh);
  shape.absarc(-hw, -hh, r, Math.PI, Math.PI * 1.5);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.99, bevelSegments: seg, curveSegments: 4 });
  geo.translate(0, 0, -(d - r * 2) / 2);
  normalizeUv(geo, Math.max(w, h));
  rboxCache.set(key, geo);
  return geo;
}

// scale raw extrude UVs down to something texture-friendly
function normalizeUv(geo, scale) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) / scale, uv.getY(i) / scale);
  }
}

export function ventGrille(w = 0.3, h = 0.2, { mat = null } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const m = mat || M.cabinetGray();
  const frame = new THREE.Mesh(roundedBox(w, h, 0.02, 0.006), m);
  g.add(frame);
  const n = Math.floor(h / 0.024);
  const louverGeo = new THREE.BoxGeometry(w * 0.86, 0.008, 0.024);
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(louverGeo, m);
    l.position.set(0, -h / 2 + 0.02 + (i / (n - 1)) * (h - 0.04), 0.012);
    l.rotation.x = -0.6;
    g.add(l);
  }
  return g;
}

export function lampCage({ r = 0.075, on = true, color = 0xffd9a3, intensity = 2.2 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.3, 0.035, 14), M.darkSteel());
  g.add(base);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x3a382f, roughness: 0.4,
    emissive: new THREE.Color(color), emissiveIntensity: on ? intensity : 0.02,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  dome.rotation.x = Math.PI; dome.position.y = -0.005;
  g.add(dome);
  // cage bars
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.TorusGeometry(r * 1.12, 0.004, 5, 14, Math.PI), M.bareSteel());
    bar.rotation.z = Math.PI;
    bar.rotation.y = (i / 4) * Math.PI * 2;
    bar.position.y = -0.006;
    g.add(bar);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.12, 0.004, 5, 16), M.bareSteel());
  ring.rotation.x = Math.PI / 2; ring.position.y = -r * 0.62;
  g.add(ring);
  g.userData.lampMat = glassMat;
  g.userData.static = false;
  return g;
}

export function axialFan(r = 0.16, { blades = 5, speed = 6, mat = null } = {}) {
  const g = new THREE.Group();
  g.userData.static = false;
  const m = mat || M.gunmetal();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, 0.05, 12), M.bareSteel());
  hub.rotation.x = Math.PI / 2;
  const rotor = new THREE.Group();
  rotor.add(hub);
  const bladeGeo = new THREE.BoxGeometry(r * 0.3, r * 0.8, 0.008);
  bladeGeo.translate(0, r * 0.55, 0);
  for (let i = 0; i < blades; i++) {
    const b = new THREE.Mesh(bladeGeo, m);
    b.rotation.z = (i / blades) * Math.PI * 2;
    b.rotation.y = 0.5;
    rotor.add(b);
  }
  g.add(rotor);
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, r * 0.09, 8, 22), m);
  g.add(shroud);
  // guard
  for (let i = 0; i < 3; i++) {
    const ringR = r * (0.35 + i * 0.33);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.0035, 4, 20), M.bareSteel());
    ring.position.z = 0.045;
    g.add(ring);
  }
  const spokeGeo = new THREE.BoxGeometry(0.006, r * 2.05, 0.004);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(spokeGeo, M.bareSteel());
    sp.position.z = 0.045;
    sp.rotation.z = (i / 3) * Math.PI;
    g.add(sp);
  }
  kitAnims.push((t, dt) => { rotor.rotation.z += dt * speed * machineryFactor; });
  return g;
}

export function extinguisher() {
  const g = new THREE.Group();
  g.userData.static = true;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.3, 6, 12), M.functionalRedPaint());
  body.position.y = 0.22;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8), M.brass());
  neck.position.y = 0.43;
  g.add(neck);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.11), M.bareSteel());
  handle.position.set(0, 0.465, 0.02);
  g.add(handle);
  const hose = cableRun([[0.0, 0.42, 0.05], [0.06, 0.3, 0.075], [0.05, 0.14, 0.075]], { r: 0.011, sag: 0.02, mat: M.rubberMat(), seed: 'ext-hose' });
  g.add(hose);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.02), M.darkSteel());
  bracket.position.set(0, 0.3, -0.072);
  g.add(bracket);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.11), M.labelMaterial('FIRE', { w: 96, h: 116, bg: '#8e3030', fg: '#d8d4c8', size: 30 }));
  label.position.set(0, 0.26, 0.066);
  g.add(label);
  return g;
}

// dogged pressure-door wheel (for hatches)
export function doorWheel(r = 0.17) {
  const g = new THREE.Group();
  g.userData.static = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 8, 26), M.bareSteel());
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.055, r * 0.055, r * 2, 8), M.bareSteel());
    spoke.rotation.z = (i / 3) * Math.PI;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, r * 0.3, 10), M.darkSteel());
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  return g;
}

// open floor grate: frame + bars, meant to sit over a bilge/underfloor void
export function floorGrate(w = 0.6, l = 0.9, { barEvery = 0.042, mat = null } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const m = mat || M.grateSteel();
  const frameT = 0.03;
  for (const [dx, dz, fw, fl] of [
    [-w / 2 + frameT / 2, 0, frameT, l], [w / 2 - frameT / 2, 0, frameT, l],
    [0, -l / 2 + frameT / 2, w, frameT], [0, l / 2 - frameT / 2, w, frameT],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.032, fl), m);
    f.position.set(dx, 0, dz);
    f.receiveShadow = true;
    g.add(f);
  }
  const n = Math.floor((w - frameT * 2) / barEvery);
  const barGeo = new THREE.BoxGeometry(0.006, 0.028, l - frameT * 2);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(barGeo, m);
    b.position.set(-w / 2 + frameT + (i + 0.5) * barEvery, 0, 0);
    b.receiveShadow = true;
    g.add(b);
  }
  // two cross bars
  const crossGeo = new THREE.BoxGeometry(w - frameT * 2, 0.01, 0.008);
  for (const dz of [-l / 4, l / 4]) {
    const cb = new THREE.Mesh(crossGeo, m);
    cb.position.set(0, -0.008, dz);
    g.add(cb);
  }
  return g;
}

// hose reel station
export function hoseReel() {
  const g = new THREE.Group();
  g.userData.static = true;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 18), M.functionalRedPaint());
  drum.rotation.x = Math.PI / 2;
  g.add(drum);
  for (const s of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 18), M.functionalRedPaint());
    disc.rotation.x = Math.PI / 2;
    disc.position.z = s * 0.056;
    g.add(disc);
  }
  // wrapped hose: torus turns
  for (let i = 0; i < 3; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.115 + i * 0.022, 0.011, 6, 20), M.rubberMat());
    wrap.position.z = (i % 2 ? 0.02 : -0.02);
    g.add(wrap);
  }
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.09, 8), M.brass());
  nozzle.position.set(0.13, -0.14, 0.05);
  nozzle.rotation.z = 0.8;
  g.add(nozzle);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.04), M.darkSteel());
  bracket.position.set(0, 0, -0.08);
  g.add(bracket);
  return g;
}

// simple framed sign plane
export function signPlate(text, w, h, opts = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.labelMaterial(text, { w: Math.round(w * 512), h: Math.round(h * 512), ...opts }));
  g.add(plate);
  return g;
}
