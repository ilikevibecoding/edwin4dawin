// Parametric humanoid character builder — owner: Fable 4.
// createHumanoid({variant, seed}) -> {
//   group, root, joints,   (see JOINT list)
//   dims,                  {headY, hipsY, scale}
//   meshes,           {torso, head, tie}   (tie = zip-tie, hostages only)
// }
// Hierarchy: group -> root -> hips -> spine -> chest -> neck -> head
//   chest -> armL/armR (shoulder pivot) -> forearm -> hand
//   hips  -> thighL/thighR -> shin -> foot
// Meshes attach rigidly to joints; clothing breaks hide the joins (jacket hem
// at hips, sleeve cuffs at wrists, boot tops at shins). No skinning.
// All randomness is a locally seeded Rng — never Math.random.
//
// Audit-1 rebuild (draw-call diet + close-range faces):
//  * Every joint's rigid parts are recorded, then MERGED into one mesh per
//    (joint × material class) with part colors baked as vertex colors —
//    ≤20 meshes per body (was 40-60). Two shared class materials total
//    (cloth r0.9 / skin r0.62); merged geometries cached by recipe so
//    identical bodies share geometry.
//  * Heads get real geometry (brow ridge, nose, jaw/chin step, ear nubs,
//    facial hair with thickness) plus a cached 256px canvas face decal:
//    iris + highlight eyes, eyebrows, mouth, per-variant shapes. Balaclava
//    keeps an eye strip; goggles get a reflection-gradient lens.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng } from '../core/rng.js';

// ---------------------------------------------------------------- materials
// Two shared vertex-colored materials cover every merged body part; a tiny
// mat cache remains for the few standalone meshes (zip-tie, goggle lens).
const CLASS_MATS = {
  cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }),
};
const matCache = new Map();
function mat(color, rough = 0.9, metal = 0) {
  const key = `${color}|${rough}|${metal}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  return matCache.get(key);
}
const SKIN_TONES = [0xc59a76, 0x8a6042];
const ORANGE = 0xd4571e;         // Meridian Cell hostile read
const HAIR_DARK = 0x2b241d;
const HAIR_BROWN = 0x4a3524;

// ---------------------------------------------------------------- geometry
// Helpers return [cacheKey, geometry] so the merge recorder can build
// deterministic recipe keys for the merged-geometry cache.
const geoCache = new Map();
function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return [key, geoCache.get(key)];
}
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 10) => G(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const sph = (r, w = 12, h = 9) => G(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const cap = (r, l, s = 8) => G(`p${r},${l},${s}`, () => new THREE.CapsuleGeometry(r, l, 4, s));

function joint(parent, x, y, z, name) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.name = name;
  parent.add(g);
  return g;
}

// ------------------------------------------------------- per-joint merging
// Joints whose merged meshes render into the sun's shadow map (see flush()).
const CAST_JOINTS = new Set(['hips', 'spine', 'chest', 'head', 'thighL', 'thighR', 'shinL', 'shinR']);
const mergedCache = new Map();
const _bp = new THREE.Vector3(), _bs = new THREE.Vector3();
const _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bm = new THREE.Matrix4();
const _bc = new THREE.Color();

function bakePart(geo, hex, x, y, z, o = {}) {
  const g2 = geo.clone();
  _bq.setFromEuler(_be.set(o.rx || 0, o.ry || 0, o.rz || 0));
  _bm.compose(_bp.set(x, y, z), _bq, _bs.set(o.sx || 1, o.sy || 1, o.sz || 1));
  g2.applyMatrix4(_bm);
  _bc.set(hex);
  const n = g2.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _bc.r; arr[i * 3 + 1] = _bc.g; arr[i * 3 + 2] = _bc.b; }
  g2.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g2;
}

// Recorder: rec(joint, cls, geoTuple, colorHex, x, y, z, opts) collects parts;
// flush() emits one cached merged mesh per (joint × class).
function makeRecorder() {
  const buckets = new Map();
  const rec = (jnt, cls, gk, hex, x, y, z, o = {}) => {
    const bk = `${jnt.name}|${cls}`;
    let b = buckets.get(bk);
    if (!b) buckets.set(bk, (b = { joint: jnt, cls, parts: [], keys: [] }));
    b.parts.push([gk[1], hex, x, y, z, o]);
    b.keys.push(`${gk[0]}~${hex}~${x},${y},${z}~${o.rx || 0},${o.ry || 0},${o.rz || 0}~${o.sx || 1},${o.sy || 1},${o.sz || 1}`);
  };
  const flush = () => {
    const made = new Map();
    for (const [bk, b] of buckets) {
      const ck = `${b.cls}::${b.keys.join(';')}`;
      let geo = mergedCache.get(ck);
      if (!geo) {
        const baked = b.parts.map((p) => bakePart(p[0], p[1], p[2], p[3], p[4], p[5]));
        geo = baked.length > 1 ? mergeGeometries(baked, false) : baked[0];
        mergedCache.set(ck, geo);
      }
      const mesh = new THREE.Mesh(geo, CLASS_MATS[b.cls]);
      // Only torso/head/legs cast: they carry the whole silhouette at the
      // sun shadow map's ~8 cm/texel. Hands, forearms and feet are sub-texel
      // — dropping them cuts ~10 shadow-pass draw calls per character.
      mesh.castShadow = CAST_JOINTS.has(b.joint.name);
      b.joint.add(mesh);
      made.set(bk, mesh);
    }
    return made;
  };
  return { rec, flush };
}

// ---------------------------------------------------------------- recipes
const OUTFITS = {
  // Meridian Cell hostiles — orange accent = enemy read
  scout: {
    s: 0.985, bulk: 0.93, jacket: 0x5a6152, sleeve: 0x515747, pants: 0x474c42,
    boot: 0x2a2c2e, glove: 0x2b2d2f, gear: 'rig', headgear: 'beanie', gearCol: 0x383d35,
  },
  trooper: {
    s: 1.0, bulk: 1.0, jacket: 0x3a4148, sleeve: 0x363c43, pants: 0x33383d,
    boot: 0x26282b, glove: 0x2b2d2f, gear: 'carrier', headgear: 'cap', gearCol: 0x2c3034,
  },
  heavy: {
    s: 1.02, bulk: 1.17, jacket: 0x363b3d, sleeve: 0x323638, pants: 0x2f3335,
    boot: 0x232527, glove: 0x2b2d2f, gear: 'armor', headgear: 'helmet', gearCol: 0x272b2d,
  },
  marksman: {
    s: 1.0, bulk: 0.97, jacket: 0x6b7076, sleeve: 0x62676d, pants: 0x3f444a,
    boot: 0x26282b, glove: 0x2b2d2f, gear: 'pack', headgear: 'hood', gearCol: 0x4b5054,
  },
  // Hostages
  voss: {
    s: 0.97, bulk: 0.88, jacket: 0x33363b, sleeve: 0x33363b, pants: 0x2e3033,
    boot: 0x232527, glove: null, gear: 'lanyard', headgear: 'bun', gearCol: 0x3d949e,
    hostage: true, skinTone: 0, feminine: true,
  },
  reid: {
    s: 1.0, bulk: 1.02, jacket: 0x2e4057, sleeve: 0x2e4057, pants: 0x9a8b6b,
    boot: 0x4a3c2c, glove: null, gear: 'hivis', headgear: 'cap_navy', gearCol: 0xd8c22f,
    hostage: true, skinTone: 1,
  },
};

// ---------------------------------------------------------------- builder
export function createHumanoid({ variant = 'trooper', seed = 1 } = {}) {
  const o = OUTFITS[variant] || OUTFITS.trooper;
  const rng = new Rng((seed * 2654435761) >>> 0 || 7);
  const s = o.s, b = o.bulk;

  const group = new THREE.Group();
  group.name = `humanoid_${variant}`;
  const root = new THREE.Group();
  root.name = 'root';
  group.add(root);
  root.scale.setScalar(s);

  // ---- joint tree (positions in unscaled model space; root carries scale)
  const hips = joint(root, 0, 0.99, 0, 'hips');
  const spine = joint(hips, 0, 0.13, 0, 'spine');
  const chest = joint(spine, 0, 0.21, 0, 'chest');
  const neck = joint(chest, 0, 0.19, 0, 'neck');
  const head = joint(neck, 0, 0.09, 0, 'head');

  const armL = joint(chest, -0.19 * b, 0.15, 0, 'armL');
  const forearmL = joint(armL, 0, -0.29, 0, 'forearmL');
  const handL = joint(forearmL, 0, -0.26, 0, 'handL');
  const armR = joint(chest, 0.19 * b, 0.15, 0, 'armR');
  const forearmR = joint(armR, 0, -0.29, 0, 'forearmR');
  const handR = joint(forearmR, 0, -0.26, 0, 'handR');

  const thighL = joint(hips, -0.095, -0.02, 0, 'thighL');
  const shinL = joint(thighL, 0, -0.46, 0, 'shinL');
  const footL = joint(shinL, 0, -0.43, 0, 'footL');
  const thighR = joint(hips, 0.095, -0.02, 0, 'thighR');
  const shinR = joint(thighR, 0, -0.46, 0, 'shinR');
  const footR = joint(shinR, 0, -0.43, 0, 'footR');

  const { rec, flush } = makeRecorder();
  const tone = o.skinTone ?? (rng.chance(0.5) ? 0 : 1);
  const skinHex = SKIN_TONES[tone % SKIN_TONES.length];

  // ---- torso
  rec(hips, 'cloth', box(0.3, 0.15, 0.19), o.pants, 0, -0.05, 0, { sx: b, sz: b });      // pelvis
  rec(hips, 'cloth', box(0.31, 0.045, 0.2), 0x232527, 0, 0.035, 0, { sx: b, sz: b });    // belt
  rec(spine, 'cloth', box(0.3, 0.2, 0.185), o.jacket, 0, 0.07, 0, { sx: b, sz: b });     // lower torso
  rec(spine, 'cloth', box(0.335, 0.09, 0.215), o.jacket, 0, -0.1, 0, { sx: b, sz: b });  // jacket hem (clothing break)
  rec(chest, 'cloth', cap(0.145, 0.11, 10), o.jacket, 0, 0.075, 0, { sx: 1.32 * b, sz: 0.78 * b }); // chest
  rec(chest, 'cloth', box(0.15, 0.05, 0.16), o.jacket, 0, 0.2, 0, { sx: b, sz: b });     // collar
  rec(neck, 'skin', cyl(0.048, 0.052, 0.09), skinHex, 0, 0.03, 0);

  // ---- head + face/headgear variation (records parts + adds decal meshes)
  buildHead(head, o, rng, tone, rec);

  // ---- arms (shoulder cap, upper sleeve, forearm sleeve, cuff, hand)
  for (const [arm, fore, hand, side] of [[armL, forearmL, handL, -1], [armR, forearmR, handR, 1]]) {
    rec(arm, 'cloth', sph(0.066), o.sleeve, 0, -0.01, 0, { sx: b, sy: 1.05, sz: b });    // deltoid
    rec(arm, 'cloth', cap(0.048, 0.17), o.sleeve, 0, -0.155, 0, { sx: b, sz: b });       // upper sleeve
    rec(fore, 'cloth', cap(0.041, 0.15), o.sleeve, 0, -0.115, 0);                        // forearm sleeve
    rec(fore, 'cloth', cyl(0.045, 0.047, 0.035), o.sleeve, 0, -0.235, 0);                // cuff (clothing break)
    if (o.glove) rec(hand, 'cloth', box(0.05, 0.1, 0.062), o.glove, 0, -0.055, 0);       // glove
    else rec(hand, 'skin', box(0.05, 0.1, 0.062), skinHex, 0, -0.055, 0);                // bare hand
    if (!o.hostage && side === 1) {
      rec(arm, 'cloth', cyl(0.054 * b, 0.056 * b, 0.055), ORANGE, 0, -0.12, 0);          // orange armband
    }
  }

  // ---- legs
  for (const [thigh, shin] of [[thighL, shinL], [thighR, shinR]]) {
    // thigh reaches the knee pivot and the shin's rounded cap hugs it, so the
    // joint stays covered even at the extreme bends of the death poses
    rec(thigh, 'cloth', cap(0.062, 0.32), o.pants, 0, -0.24, 0, { sx: b, sz: b });
    rec(shin, 'cloth', cap(0.05, 0.25), o.pants, 0, -0.15, 0);
    rec(shin, 'cloth', cyl(0.056, 0.06, 0.11), o.boot, 0, -0.35, 0);                     // boot top (clothing break)
  }
  for (const foot of [footL, footR]) {
    rec(foot, 'cloth', box(0.092, 0.075, 0.23), o.boot, 0, -0.042, -0.045);
    rec(foot, 'cloth', box(0.085, 0.045, 0.06), o.boot, 0, -0.057, -0.175);              // toe cap
  }

  // ---- variant gear
  buildGear(o, rng, { hips, chest, armL }, b, rec);

  // ---- hostage zip-tie (hidden after being freed; stays a standalone mesh
  // so bodies.js can toggle .visible)
  let tie = null;
  if (o.hostage) {
    tie = new THREE.Mesh(box(0.05, 0.026, 0.03)[1], mat(0xcfd3d6, 0.6));
    tie.position.set(-0.05, -0.05, 0);
    tie.castShadow = true;
    handR.add(tie);
  }

  const made = flush();

  const dims = { headY: (0.99 + 0.13 + 0.21 + 0.19 + 0.09) * s + 0.05, hipsY: 0.99 * s, scale: s };
  const joints = {
    root, hips, spine, chest, neck, head,
    armL, forearmL, handL, armR, forearmR, handR,
    thighL, shinL, footL, thighR, shinR, footR,
  };
  const torsoMesh = made.get('chest|cloth');
  const headMesh = made.get('head|skin') || made.get('head|cloth');
  return { group, root, joints, dims, meshes: { torso: torsoMesh, head: headMesh, tie }, variant, seed };
}

// ---------------------------------------------------------------- faces
// Cached canvas face decal wrapped on a sphere section that hugs the skull.
// Feature placement is computed from the same sphere angles the geometry
// uses, so paint and geometry stay aligned.
const FACE = {
  r: 0.1065,                       // decal shell radius (skull sphere is 0.105)
  center: [0, 0.05, 0.008],        // skull center in head-joint space
  scale: [0.92, 1.05, 0.98],       // skull squash
  theta0: 1.1, thetaLen: 1.34,     // vertical span (brow line -> under chin)
  phiLen: 1.45,                    // horizontal span
};
const IRIS_COLS = ['#4a3320', '#37474a', '#26282b'];

const faceTexCache = new Map();
function faceTexture(k) {
  const key = JSON.stringify(k);
  if (faceTexCache.has(key)) return faceTexCache.get(key);
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const skin = `#${k.skin.toString(16).padStart(6, '0')}`;
  const hair = `#${k.hair.toString(16).padStart(6, '0')}`;

  // angle -> canvas mapping (matches the decal sphere section UVs)
  const t0 = k.strip ? 1.42 : FACE.theta0;
  const tl = k.strip ? 0.42 : FACE.thetaLen;
  const pl = k.strip ? 1.15 : FACE.phiLen;
  const yOf = (relY) => {
    const th = Math.acos(Math.max(-1, Math.min(1, relY / FACE.r)));
    return ((th - t0) / tl) * S;
  };
  const xOf = (relX, relY) => {
    const th = Math.acos(Math.max(-1, Math.min(1, relY / FACE.r)));
    const rr = FACE.r * Math.sin(th) * 0.92;
    const ph = Math.asin(Math.max(-1, Math.min(1, relX / Math.max(rr, 1e-4))));
    return S / 2 - (ph / pl) * S;
  };
  // head-joint abs y -> rel-to-center y (undo center offset + vertical squash)
  const rel = (absY) => (absY - FACE.center[1]) / FACE.scale[1];

  const eyeY = rel(0.048), browY = rel(0.0715), noseY = rel(0.012), mouthY = rel(-0.006), chinY = rel(-0.026);

  // base skin (or knit for the balaclava strip)
  c.fillStyle = k.strip ? '#24262a' : skin;
  c.fillRect(0, 0, S, S);
  if (!k.strip) {
    // soft vertical shading: brow shadow band + cheek/jaw shade
    const gr = c.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, 'rgba(0,0,0,0.10)');
    gr.addColorStop(0.28, 'rgba(255,255,255,0.05)');
    gr.addColorStop(0.62, 'rgba(0,0,0,0.03)');
    gr.addColorStop(1, 'rgba(0,0,0,0.14)');
    c.fillStyle = gr;
    c.fillRect(0, 0, S, S);
    // cheekbone shade
    for (const sd of [-1, 1]) {
      c.fillStyle = 'rgba(40,20,10,0.07)';
      c.beginPath();
      c.ellipse(xOf(sd * 0.052, eyeY), yOf(eyeY) + 34, 16, 22, sd * 0.35, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ---- eyes (sockets, sclera, iris + pupil + highlight, lids)
  for (const sd of [-1, 1]) {
    const ex = xOf(sd * 0.0245, eyeY), ey = yOf(eyeY);
    c.fillStyle = 'rgba(35,18,10,0.18)';                       // socket shade
    c.beginPath(); c.ellipse(ex, ey, 15, 10.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ece5d8';                                   // sclera
    c.beginPath(); c.ellipse(ex, ey, 11, k.feminine ? 7.5 : 6.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = IRIS_COLS[k.iris % IRIS_COLS.length];        // iris
    c.beginPath(); c.arc(ex, ey + 0.5, 5.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#141210';                                   // pupil
    c.beginPath(); c.arc(ex, ey + 0.5, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)';                    // catchlight
    c.beginPath(); c.arc(ex - 2, ey - 1.6, 1.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30,16,8,0.85)';                      // upper lid
    c.lineWidth = k.feminine ? 2.6 : 2.0;
    c.beginPath(); c.ellipse(ex, ey - 1, 11, 7, 0, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
    c.strokeStyle = 'rgba(30,16,8,0.3)';                       // lower lid hint
    c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(ex, ey + 2, 9, 5.5, 0, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  }

  // ---- eyebrows (3 variants: straight-thick / stern-angled / arched-thin)
  const by = yOf(browY);
  c.strokeStyle = hair;
  c.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x0 = xOf(sd * 0.011, browY), x1 = xOf(sd * 0.042, browY);
    c.lineWidth = k.brow === 2 || k.feminine ? 3.4 : 5.6;
    c.beginPath();
    if (k.brow === 0) { c.moveTo(x0, by + 1); c.lineTo(x1, by); }                    // straight
    else if (k.brow === 1) { c.moveTo(x0, by - 2.4); c.lineTo(x1, by + 2.6); }       // stern (inner low)
    else { c.moveTo(x0, by + 2); c.quadraticCurveTo((x0 + x1) / 2, by - 4.4, x1, by + 1.4); } // arched
    c.stroke();
  }

  if (!k.strip) {
    // ---- nose base shading (geometry block sits above this)
    c.fillStyle = 'rgba(35,18,10,0.22)';
    for (const sd of [-1, 1]) {
      c.beginPath(); c.ellipse(xOf(sd * 0.0085, noseY), yOf(noseY), 2.6, 1.9, 0, 0, Math.PI * 2); c.fill();
    }
    // ---- mouth
    const my = yOf(mouthY);
    c.strokeStyle = 'rgba(48,20,14,0.85)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(xOf(-0.02, mouthY), my);
    c.quadraticCurveTo(S / 2, my + (k.feminine ? 1.6 : 2.6), xOf(0.02, mouthY), my);
    c.stroke();
    if (k.feminine) {                                          // soft lip fill
      c.fillStyle = 'rgba(150,70,60,0.35)';
      c.beginPath(); c.ellipse(S / 2, my + 2.4, 9, 3, 0, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.12)';                        // chin crease
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(xOf(-0.012, chinY), yOf(chinY));
    c.quadraticCurveTo(S / 2, yOf(chinY) + 2, xOf(0.012, chinY), yOf(chinY));
    c.stroke();
    // ---- facial hair paint (stubble mask under the 3D beard shapes)
    if (k.beard) {
      c.fillStyle = hair;
      c.globalAlpha = k.beard === 'stubble' ? 0.38 : 0.8;
      c.beginPath();
      const jy = yOf(rel(-0.002));
      c.moveTo(xOf(-0.055, eyeY), yOf(eyeY) + 16);             // left sideburn
      c.quadraticCurveTo(xOf(-0.05, mouthY), jy + 18, S / 2 - 13, jy + 6);
      c.lineTo(S / 2 - 13, jy - 4);                            // around the mouth
      c.lineTo(S / 2 + 13, jy - 4);
      c.lineTo(S / 2 + 13, jy + 6);
      c.quadraticCurveTo(xOf(0.05, mouthY), jy + 18, xOf(0.055, eyeY), yOf(eyeY) + 16);
      c.lineTo(xOf(0.062, eyeY), S);
      c.lineTo(xOf(-0.062, eyeY), S);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  faceTexCache.set(key, tex);
  return tex;
}

const faceGeoCache = new Map();
function faceGeometry(strip) {
  const key = strip ? 'strip' : 'face';
  if (!faceGeoCache.has(key)) {
    const t0 = strip ? 1.42 : FACE.theta0;
    const tl = strip ? 0.42 : FACE.thetaLen;
    const pl = strip ? 1.15 : FACE.phiLen;
    faceGeoCache.set(key, new THREE.SphereGeometry(FACE.r, 20, strip ? 6 : 14, -Math.PI / 2 - pl / 2, pl, t0, tl));
  }
  return faceGeoCache.get(key);
}

const faceMatCache = new Map();
function faceMaterial(k) {
  const key = JSON.stringify(k);
  if (!faceMatCache.has(key)) {
    faceMatCache.set(key, new THREE.MeshStandardMaterial({ map: faceTexture(k), roughness: 0.62 }));
  }
  return faceMatCache.get(key);
}

function addFaceDecal(head, k) {
  const m = new THREE.Mesh(faceGeometry(!!k.strip), faceMaterial(k));
  m.position.set(FACE.center[0], FACE.center[1], FACE.center[2]);
  m.scale.set(FACE.scale[0], FACE.scale[1], FACE.scale[2]);
  m.castShadow = false;
  head.add(m);
  return m;
}

// Shared goggle lens: amber base with a diagonal reflection-gradient streak.
let goggleLensMat = null;
function lensMaterial() {
  if (goggleLensMat) return goggleLensMat;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 32;
  const c = cv.getContext('2d');
  const base = c.createLinearGradient(0, 0, 0, 32);
  base.addColorStop(0, '#b8873a');
  base.addColorStop(0.55, '#7a5622');
  base.addColorStop(1, '#4a3312');
  c.fillStyle = base; c.fillRect(0, 0, 64, 32);
  const gl = c.createLinearGradient(0, 26, 64, 2);             // diagonal sheen
  gl.addColorStop(0.32, 'rgba(255,255,255,0)');
  gl.addColorStop(0.5, 'rgba(255,244,220,0.55)');
  gl.addColorStop(0.62, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  goggleLensMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 0.35 });
  goggleLensMat.emissive = new THREE.Color(0x2a1c08);
  return goggleLensMat;
}

// ---------------------------------------------------------------- head
// 2 skin tones × 4 styles × brow/iris/beard variants, all deterministic.
function buildHead(head, o, rng, tone, rec) {
  const style = o.hostage ? 'clean' : rng.pick(['clean', 'beard', 'balaclava', 'goggles']);
  const brow = rng.int(0, 2);
  const iris = rng.int(0, 2);
  const balaclava = style === 'balaclava';
  const skinHex = SKIN_TONES[tone % SKIN_TONES.length];
  const hairHex = o.headgear === 'bun' ? HAIR_BROWN : HAIR_DARK;
  const knit = 0x24262a;
  const skullCls = balaclava ? 'cloth' : 'skin';
  const skullHex = balaclava ? knit : skinHex;

  // skull + facial structure (merges into ONE mesh per class)
  rec(head, skullCls, sph(0.105), skullHex, 0, 0.05, 0.008, { sx: 0.92, sy: 1.05, sz: 0.98 });
  rec(head, skullCls, box(0.078, 0.013, 0.02), skullHex, 0, 0.069, -0.084, { rx: 0.18 });   // brow ridge
  rec(head, skullCls, box(0.013, 0.028, 0.014), skullHex, 0, 0.046, -0.094);                // nose bridge
  rec(head, skullCls, box(0.02, 0.032, 0.02), skullHex, 0, 0.026, -0.098);                  // nose block
  const beard = style === 'beard' ? rng.pick(['full', 'goatee']) : (o.headgear === 'cap_navy' ? 'goatee' : null);
  if (!balaclava && beard !== 'full') {
    rec(head, 'skin', box(0.02, 0.028, 0.055), skinHex, -0.05, -0.032, -0.038);             // jaw step L
    rec(head, 'skin', box(0.02, 0.028, 0.055), skinHex, 0.05, -0.032, -0.038);              // jaw step R
  }
  if (!balaclava && !beard) {
    rec(head, 'skin', box(0.046, 0.026, 0.045), skinHex, 0, -0.048, -0.058);                // chin step
  }
  const earsHidden = balaclava || o.headgear === 'helmet' || o.headgear === 'hood';
  if (!earsHidden) {
    rec(head, 'skin', box(0.014, 0.034, 0.026), skinHex, -0.09, 0.042, 0.006);              // ear nubs
    rec(head, 'skin', box(0.014, 0.034, 0.026), skinHex, 0.09, 0.042, 0.006);
  }

  // face decal (eyes/brows/mouth paint; balaclava gets the eye strip)
  addFaceDecal(head, {
    skin: skinHex, hair: hairHex, brow, iris,
    strip: balaclava, feminine: !!o.feminine,
    beard: beard ? (beard === 'goatee' ? 'stubble' : 'full') : null,
  });

  // facial hair with thickness (hair-colored geometry over the paint)
  if (beard === 'full') {
    rec(head, 'cloth', box(0.064, 0.05, 0.052), hairHex, 0, -0.043, -0.054);                // chin block
    rec(head, 'cloth', box(0.02, 0.052, 0.075), hairHex, -0.052, -0.03, -0.033);            // jaw wrap L
    rec(head, 'cloth', box(0.02, 0.052, 0.075), hairHex, 0.052, -0.03, -0.033);             // jaw wrap R
    rec(head, 'cloth', box(0.044, 0.013, 0.012), hairHex, 0, 0.007, -0.1);                  // mustache
  } else if (beard === 'goatee') {
    rec(head, 'cloth', box(0.036, 0.042, 0.042), hairHex, 0, -0.05, -0.06);                 // goatee block
    rec(head, 'cloth', box(0.04, 0.012, 0.011), hairHex, 0, 0.007, -0.099);                 // mustache
  }

  if (style === 'goggles') {
    rec(head, 'cloth', box(0.096, 0.032, 0.028), 0x2a2d30, 0, 0.05, -0.088);                // goggle frame (worn)
    rec(head, 'cloth', box(0.012, 0.02, 0.11), 0x1d1f22, -0.088, 0.05, -0.03);              // strap L
    rec(head, 'cloth', box(0.012, 0.02, 0.11), 0x1d1f22, 0.088, 0.05, -0.03);               // strap R
    const lens = new THREE.Mesh(box(0.08, 0.022, 0.006)[1], lensMaterial());                // gradient lens
    lens.position.set(0, 0.05, -0.104);
    lens.castShadow = false;
    head.add(lens);
  }

  switch (o.headgear) {
    case 'beanie':
      rec(head, 'cloth', sph(0.108), 0x4a5044, 0, 0.105, 0.006, { sx: 0.94, sy: 0.72, sz: 0.98 });
      rec(head, 'cloth', cyl(0.1, 0.102, 0.035), 0x424839, 0, 0.105, 0.004, { sx: 0.96, sz: 1.0 });
      break;
    case 'cap':
    case 'cap_navy': {
      const cc = o.headgear === 'cap' ? 0x2f3438 : 0x27374a;
      rec(head, 'cloth', sph(0.107), cc, 0, 0.098, 0.012, { sx: 0.93, sy: 0.66, sz: 0.97 });
      rec(head, 'cloth', box(0.092, 0.012, 0.09), cc, 0, 0.095, -0.128);                    // brim
      break;
    }
    case 'helmet': {
      // sits high + tilted back so the brow/eyes read at close range
      const hc = 0x2e3234;
      rec(head, 'cloth', sph(0.126), hc, 0, 0.096, 0.024, { sx: 0.96, sy: 0.84, sz: 1.02 });
      rec(head, 'cloth', cyl(0.117, 0.121, 0.035), hc, 0, 0.058, 0.024, { sx: 0.98 });      // rim (above the eye line)
      rec(head, 'cloth', box(0.098, 0.026, 0.03), 0x2a2d30, 0, 0.124, -0.088);              // goggles stowed up
      rec(head, 'cloth', box(0.055, 0.045, 0.012), ORANGE, 0, 0.098, 0.134);                // rear faction patch
      break;
    }
    case 'hood': {
      // shell pulled back so the face opening actually exposes the face
      const hd = 0x62676d;
      rec(head, 'cloth', sph(0.132), hd, 0, 0.062, 0.048, { sx: 0.95, sy: 0.98, sz: 1.02 }); // parka hood shell
      rec(head, 'cloth', box(0.03, 0.09, 0.05), hd, -0.075, 0.0, -0.042);                   // cheek pad L
      rec(head, 'cloth', box(0.03, 0.09, 0.05), hd, 0.075, 0.0, -0.042);                    // cheek pad R
      break;
    }
    case 'bun': {
      rec(head, 'cloth', sph(0.108), HAIR_BROWN, 0, 0.095, 0.018, { sx: 0.93, sy: 0.85, sz: 0.97 }); // hair
      rec(head, 'cloth', sph(0.042), HAIR_BROWN, 0, 0.1, 0.105);                            // bun
      break;
    }
  }
}

// ---------------------------------------------------------------- gear
function buildGear(o, rng, j, b, rec) {
  const { hips, chest, armL } = j;
  const front = 0.105 * b; // chest surface offset (-Z is forward)
  switch (o.gear) {
    case 'rig': // scout: light chest rig
      rec(chest, 'cloth', box(0.23, 0.13, 0.045), o.gearCol, 0, 0.05, -front - 0.015);
      rec(chest, 'cloth', box(0.06, 0.09, 0.03), o.gearCol, -0.07, 0.035, -front - 0.045);
      rec(chest, 'cloth', box(0.06, 0.09, 0.03), o.gearCol, 0.07, 0.035, -front - 0.045);
      rec(chest, 'cloth', box(0.05, 0.05, 0.012), ORANGE, -0.09, 0.13, -front - 0.02);      // faction patch
      break;
    case 'carrier': // trooper: plate carrier + mag pouches
      rec(chest, 'cloth', box(0.27, 0.23, 0.05), o.gearCol, 0, 0.06, -front - 0.018);
      rec(chest, 'cloth', box(0.27, 0.22, 0.045), o.gearCol, 0, 0.06, front + 0.015);
      rec(chest, 'cloth', box(0.05, 0.06, 0.16), o.gearCol, -0.115, 0.2, 0);                // shoulder strap
      rec(chest, 'cloth', box(0.05, 0.06, 0.16), o.gearCol, 0.115, 0.2, 0);
      rec(hips, 'cloth', box(0.055, 0.1, 0.035), o.gearCol, -0.09, -0.03, -0.105 * b - 0.02); // mag pouches
      rec(hips, 'cloth', box(0.055, 0.1, 0.035), o.gearCol, 0, -0.03, -0.105 * b - 0.025);
      rec(hips, 'cloth', box(0.055, 0.1, 0.035), o.gearCol, 0.09, -0.03, -0.105 * b - 0.02);
      rec(chest, 'cloth', box(0.05, 0.05, 0.012), ORANGE, 0.085, 0.15, -front - 0.026);     // faction patch
      break;
    case 'armor': { // heavy: bulky vest + shoulder pads + collar
      rec(chest, 'cloth', box(0.32, 0.3, 0.07), o.gearCol, 0, 0.05, -front - 0.02);
      rec(chest, 'cloth', box(0.32, 0.28, 0.06), o.gearCol, 0, 0.05, front + 0.018);
      rec(chest, 'cloth', box(0.2, 0.06, 0.24), o.gearCol, 0, 0.225, 0);                    // collar guard
      rec(chest, 'cloth', box(0.1, 0.05, 0.17), 0x2e3234, -0.2 * b, 0.16, 0);               // shoulder pad L
      rec(chest, 'cloth', box(0.1, 0.05, 0.17), 0x2e3234, 0.2 * b, 0.16, 0);                // shoulder pad R
      rec(hips, 'cloth', box(0.16, 0.12, 0.04), o.gearCol, 0, -0.1, -0.105 * b - 0.02);     // groin plate
      rec(chest, 'cloth', box(0.07, 0.07, 0.014), ORANGE, 0, 0.09, -front - 0.06);          // big faction patch
      break;
    }
    case 'pack': { // marksman: small backpack + chest strap
      rec(chest, 'cloth', box(0.24, 0.3, 0.11), o.gearCol, 0, 0.03, front + 0.055);
      rec(chest, 'cloth', box(0.2, 0.08, 0.04), 0x43484c, 0, 0.16, front + 0.11);           // pack lid
      rec(chest, 'cloth', box(0.26, 0.045, 0.03), o.gearCol, 0, 0.07, -front - 0.01);       // chest strap
      rec(chest, 'cloth', box(0.05, 0.05, 0.012), ORANGE, -0.09, 0.14, -front - 0.015);     // faction patch
      break;
    }
    case 'lanyard': { // voss: blazer lapels + blouse + ID lanyard
      rec(chest, 'cloth', box(0.1, 0.17, 0.012), 0xcfd3d6, 0, 0.05, -front - 0.008);        // blouse front
      rec(chest, 'cloth', box(0.05, 0.2, 0.016), 0x2b2e33, -0.075, 0.05, -front - 0.012, { rz: 0.14 }); // lapel L
      rec(chest, 'cloth', box(0.05, 0.2, 0.016), 0x2b2e33, 0.075, 0.05, -front - 0.012, { rz: -0.14 }); // lapel R
      rec(chest, 'cloth', box(0.02, 0.2, 0.008), o.gearCol, -0.035, 0.08, -front - 0.02, { rz: 0.12 }); // lanyard strap
      rec(chest, 'cloth', box(0.055, 0.075, 0.008), 0xe8e6dd, 0, -0.045, -front - 0.022);   // ID card
      break;
    }
    case 'hivis': { // reid: hi-vis trim on navy polo
      rec(chest, 'cloth', box(0.28 * b, 0.035, 0.015), o.gearCol, 0, 0.06, -front - 0.008);
      rec(chest, 'cloth', box(0.28 * b, 0.035, 0.015), o.gearCol, 0, 0.06, front + 0.006);
      rec(armL, 'cloth', box(0.02, 0.04, 0.1), o.gearCol, -0.05 * b, -0.12, 0);             // sleeve band
      rec(chest, 'cloth', box(0.055, 0.04, 0.008), 0xe8e6dd, 0.07, 0.12, -front - 0.012);   // name tag
      break;
    }
  }
}

export function humanoidVariants() { return Object.keys(OUTFITS); }
