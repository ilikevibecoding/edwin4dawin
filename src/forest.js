import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';
import { rbox, tube } from './lib/geo.js';
import { clamp, mulberry32 } from './textures/core.js';
import {
  barkMaps,
  birchBarkMaps,
  fernTexture,
  grassTuftTexture,
  leafClusterTexture,
  needleSprayTexture,
  rockMaps,
} from './textures/nature.js';

// ---------------------------------------------------------------------------
// The forest. A handful of hand-built tree prototypes are instanced across the
// terrain, with an undergrowth layer of ferns, grass and deadfall so the
// ground plane never shows through as an empty surface.
// ---------------------------------------------------------------------------

const _m4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _euler = new THREE.Euler();

const flatten = (g) => (g.index ? g.toNonIndexed() : g);

/** Adds wind sway driven by a per-vertex weight attribute. */
function applyWind(material, { amplitude = 0.16, speed = 1.0 } = {}) {
  material.userData.wind = { uTime: { value: 0 }, uAmp: { value: amplitude }, uSpeed: { value: speed } };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    if (prev) prev(shader);
    Object.assign(shader.uniforms, material.userData.wind);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aWind;
        uniform float uTime;
        uniform float uAmp;
        uniform float uSpeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iOrigin = instanceMatrix[ 3 ].xyz;
        #else
          vec3 iOrigin = vec3( 0.0 );
        #endif
        float ph = iOrigin.x * 0.35 + iOrigin.z * 0.27;
        float gust = sin( uTime * 0.31 * uSpeed + ph * 0.4 ) * 0.5 + 0.75;
        transformed.x += sin( uTime * 1.15 * uSpeed + ph ) * aWind * uAmp * gust;
        transformed.z += cos( uTime * 0.87 * uSpeed + ph * 1.3 ) * aWind * uAmp * 0.75 * gust;
        transformed.y -= abs( sin( uTime * 1.15 * uSpeed + ph ) ) * aWind * uAmp * 0.18;`,
      );
  };
  material.customProgramCacheKey = () => 'wind-' + material.uuid;
  return material;
}

/** Tag geometry with a wind weight; 0 = rigid, 1 = whips around. */
function windWeight(geo, fn) {
  const pos = geo.attributes.position;
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    w[i] = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
  return geo;
}

/** Two crossed quads, pivot at the base. */
function crossCard(width, height, extra = true) {
  const parts = [];
  const a = new THREE.PlaneGeometry(width, height, 1, 2);
  a.translate(0, height * 0.5, 0);
  parts.push(a);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  parts.push(b);
  if (extra) {
    const c = a.clone();
    c.rotateY(Math.PI / 4);
    c.scale(0.85, 0.9, 0.85);
    parts.push(c);
  }
  return BufferGeometryUtils.mergeGeometries(parts);
}

/** A single foliage card placed and oriented in the tree's local space. */
function placedCard(w, h, { pos, rot, tilt = 0 }) {
  const g = new THREE.PlaneGeometry(w, h, 2, 2);
  g.rotateX(tilt);
  g.rotateY(rot);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

// ---------------------------------------------------------------------------
// Tree prototypes
// ---------------------------------------------------------------------------

function buildConifer(seed = 1) {
  const rnd = mulberry32(seed * 7919);
  const height = 15 + rnd() * 9;
  const baseR = 0.28 + rnd() * 0.13;

  // trunk: slight lean and taper, with a flared root
  const segs = 7;
  const pts = [];
  let lean = new THREE.Vector2((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(lean.x * t * t, t * height, lean.y * t * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunkGeo = new THREE.TubeGeometry(curve, 14, 1, 9, false);
  // taper manually so the base flares
  {
    const p = trunkGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = clamp(v.y / height);
      const axis = curve.getPoint(t);
      const r = baseR * (1 - t * 0.82) + (t < 0.06 ? (0.06 - t) * 2.2 : 0);
      v.x = axis.x + (v.x - axis.x) * r;
      v.z = axis.z + (v.z - axis.z) * r;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true;
  }
  // root flares
  const roots = [];
  const rootCount = 5;
  for (let i = 0; i < rootCount; i++) {
    const a = (i / rootCount) * Math.PI * 2 + rnd();
    roots.push(
      tube(
        [
          [0, 0.9, 0],
          [Math.cos(a) * baseR * 1.6, 0.22, Math.sin(a) * baseR * 1.6],
          [Math.cos(a) * baseR * 3.1, -0.1, Math.sin(a) * baseR * 3.1],
        ],
        baseR * 0.34,
        6,
      ),
    );
  }
  // bare lower branches
  const branches = [];
  const branchCount = 7;
  for (let i = 0; i < branchCount; i++) {
    const t = 0.28 + (i / branchCount) * 0.6;
    const a = i * 2.399 + rnd();
    const y = t * height;
    const len = (1 - t) * 3.4 + 0.7;
    branches.push(
      tube(
        [
          [0, y, 0],
          [Math.cos(a) * len * 0.45, y + len * 0.12, Math.sin(a) * len * 0.45],
          [Math.cos(a) * len, y + len * 0.3, Math.sin(a) * len],
        ],
        0.05 * (1 - t) + 0.015,
        6,
      ),
    );
  }
  const trunk = BufferGeometryUtils.mergeGeometries(
    [trunkGeo, ...roots, ...branches].map(flatten),
  );
  windWeight(trunk, (x, y) => clamp((y / height - 0.55) / 0.45) * 0.35);

  // needle sprays hung off the branch tips and up the leader
  const cards = [];
  const tiers = 16;
  for (let i = 0; i < tiers; i++) {
    const t = 0.24 + (i / tiers) * 0.78;
    if (t > 1) break;
    const y = t * height;
    const radius = Math.pow(1 - t, 0.8) * 4.4 + 0.35;
    const perTier = t > 0.85 ? 2 : 3;
    for (let j = 0; j < perTier; j++) {
      const a = i * 2.399 + (j / perTier) * Math.PI * 2 + rnd() * 0.4;
      const r = radius * (0.55 + rnd() * 0.5);
      const size = radius * (0.9 + rnd() * 0.5) + 0.8;
      cards.push(
        placedCard(size * 1.5, size, {
          pos: [Math.cos(a) * r, y + rnd() * 0.4, Math.sin(a) * r],
          rot: a + Math.PI / 2,
          tilt: -0.22 - rnd() * 0.2,
        }),
      );
      cards.push(
        placedCard(size * 1.4, size * 0.9, {
          pos: [Math.cos(a) * r * 0.8, y + 0.25, Math.sin(a) * r * 0.8],
          rot: a,
          tilt: 0.1,
        }),
      );
    }
  }
  // crown
  cards.push(placedCard(2.0, 2.6, { pos: [0, height - 1.1, 0], rot: 0.4 }));
  cards.push(placedCard(2.0, 2.6, { pos: [0, height - 1.1, 0], rot: 1.97 }));
  const foliage = BufferGeometryUtils.mergeGeometries(cards.map(flatten));
  windWeight(foliage, (x, y, z) => clamp(0.25 + Math.hypot(x, z) * 0.16 + (y / height) * 0.45));

  return { trunk, foliage, height, radius: baseR, kind: 'conifer' };
}

function buildBroadleaf(seed = 2) {
  const rnd = mulberry32(seed * 104729);
  const height = 9 + rnd() * 5;
  const baseR = 0.22 + rnd() * 0.1;
  const trunkH = height * 0.42;

  const trunkGeo = new THREE.CylinderGeometry(baseR * 0.55, baseR * 1.25, trunkH, 10, 3);
  trunkGeo.translate(0, trunkH * 0.5, 0);

  const limbs = [];
  const limbCount = 5;
  const tips = [];
  for (let i = 0; i < limbCount; i++) {
    const a = (i / limbCount) * Math.PI * 2 + rnd() * 0.6;
    const len = height * (0.4 + rnd() * 0.25);
    const tip = new THREE.Vector3(Math.cos(a) * len * 0.72, trunkH + len * 0.85, Math.sin(a) * len * 0.72);
    tips.push(tip);
    limbs.push(
      tube(
        [
          [0, trunkH - 0.4, 0],
          [Math.cos(a) * len * 0.28, trunkH + len * 0.32, Math.sin(a) * len * 0.28],
          [tip.x, tip.y, tip.z],
        ],
        baseR * 0.45,
        7,
      ),
    );
    // secondary twigs
    for (let j = 0; j < 2; j++) {
      const a2 = a + (rnd() - 0.5) * 1.4;
      const l2 = len * (0.35 + rnd() * 0.25);
      limbs.push(
        tube(
          [
            [tip.x * 0.6, trunkH + len * 0.45, tip.z * 0.6],
            [tip.x * 0.6 + Math.cos(a2) * l2, trunkH + len * 0.7, tip.z * 0.6 + Math.sin(a2) * l2],
          ],
          baseR * 0.2,
          6,
        ),
      );
    }
  }
  const roots = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd();
    roots.push(
      tube(
        [
          [0, 0.7, 0],
          [Math.cos(a) * baseR * 2.4, -0.08, Math.sin(a) * baseR * 2.4],
        ],
        baseR * 0.3,
        6,
      ),
    );
  }
  const trunk = BufferGeometryUtils.mergeGeometries([trunkGeo, ...limbs, ...roots].map(flatten));
  windWeight(trunk, (x, y) => clamp((y / height - 0.4) / 0.6) * 0.4);

  const cards = [];
  const clusters = 34;
  for (let i = 0; i < clusters; i++) {
    const tip = tips[i % tips.length];
    const spread = height * 0.3;
    const px = tip.x * (0.5 + rnd() * 0.85) + (rnd() - 0.5) * spread;
    const pz = tip.z * (0.5 + rnd() * 0.85) + (rnd() - 0.5) * spread;
    const py = trunkH + height * (0.22 + rnd() * 0.55);
    const size = height * (0.2 + rnd() * 0.13);
    cards.push(placedCard(size * 1.4, size, { pos: [px, py, pz], rot: rnd() * Math.PI, tilt: (rnd() - 0.5) * 0.7 }));
  }
  const foliage = BufferGeometryUtils.mergeGeometries(cards.map(flatten));
  windWeight(foliage, (x, y, z) => clamp(0.4 + Math.hypot(x, z) * 0.12));

  return { trunk, foliage, height, radius: baseR, kind: 'broadleaf' };
}

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

export function createForest({
  terrain,
  env = null,
  treeCount = 210,
  clearRadius = 5.2,
  area = 250,
} = {}) {
  const group = new THREE.Group();
  group.name = 'forest';
  const rnd = mulberry32(20260726);
  const updaters = [];

  const bark = barkMaps();
  const birch = birchBarkMaps();

  const barkMat = new THREE.MeshStandardMaterial({
    map: bark.map,
    normalMap: bark.normal,
    roughnessMap: bark.rough,
    aoMap: bark.ao,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 1.0,
    metalness: 0,
    envMapIntensity: 0.6,
  });
  const birchMat = new THREE.MeshStandardMaterial({
    map: birch.map,
    normalMap: birch.normal,
    roughnessMap: birch.rough,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 1.0,
    metalness: 0,
    envMapIntensity: 0.6,
  });
  applyWind(barkMat, { amplitude: 0.1, speed: 0.7 });
  applyWind(birchMat, { amplitude: 0.12, speed: 0.8 });

  function foliageMaterial(texture, { alphaTest = 0.42, color = 0xffffff } = {}) {
    // NB: no alphaMap here. three reads alphaMap from the green channel, which
    // would punch holes in every dark leaf. The map's own alpha is correct.
    const m = new THREE.MeshStandardMaterial({
      map: texture,
      color,
      transparent: false,
      alphaTest,
      side: THREE.DoubleSide,
      roughness: 0.82,
      metalness: 0,
      envMapIntensity: 0.75,
      // leaves are thin: let a bit of light through so backlit canopy glows
      emissive: new THREE.Color(PALETTE.leafSun).multiplyScalar(0.03),
    });
    m.map.needsUpdate = true;
    return applyWind(m, { amplitude: 0.2, speed: 1.0 });
  }

  const needleMat = foliageMaterial(needleSprayTexture(0), { alphaTest: 0.3 });
  const leafMat = foliageMaterial(leafClusterTexture(0), { alphaTest: 0.4 });

  // --- prototypes ----------------------------------------------------------
  const conifers = [buildConifer(1), buildConifer(2), buildConifer(3)];
  const broadleaves = [buildBroadleaf(4), buildBroadleaf(5)];
  const protos = [...conifers, ...broadleaves];

  // --- placement -----------------------------------------------------------
  const placements = protos.map(() => []);
  let attempts = 0;
  let placed = 0;
  while (placed < treeCount && attempts < treeCount * 40) {
    attempts++;
    const x = (rnd() - 0.5) * area;
    const z = (rnd() - 0.5) * area;
    const d = terrain.roadDistance(x, z);
    if (d < clearRadius) continue;
    // thin out right at the verge so the road has a visible corridor
    if (d < clearRadius + 3 && rnd() < 0.55) continue;
    const y = terrain.heightAt(x, z);
    const pick = rnd() < 0.68 ? Math.floor(rnd() * conifers.length) : conifers.length + Math.floor(rnd() * broadleaves.length);
    placements[pick].push({
      x,
      y: y - 0.15,
      z,
      s: 0.72 + rnd() * 0.62,
      r: rnd() * Math.PI * 2,
      tiltX: (rnd() - 0.5) * 0.07,
      tiltZ: (rnd() - 0.5) * 0.07,
      tint: 0.78 + rnd() * 0.32,
    });
    placed++;
  }

  const tintColor = new THREE.Color();
  protos.forEach((proto, i) => {
    const list = placements[i];
    if (!list.length) return;
    const trunkMat = proto.kind === 'broadleaf' && i === protos.length - 1 ? birchMat : barkMat;
    const foliMat = proto.kind === 'conifer' ? needleMat : leafMat;

    const trunkMesh = new THREE.InstancedMesh(proto.trunk, trunkMat, list.length);
    const foliMesh = new THREE.InstancedMesh(proto.foliage, foliMat, list.length);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    foliMesh.castShadow = true;
    foliMesh.receiveShadow = true;

    list.forEach((p, j) => {
      _pos.set(p.x, p.y, p.z);
      _euler.set(p.tiltX, p.r, p.tiltZ);
      _quat.setFromEuler(_euler);
      _scl.set(p.s, p.s * (0.9 + (p.tint - 0.78) * 0.5), p.s);
      _m4.compose(_pos, _quat, _scl);
      trunkMesh.setMatrixAt(j, _m4);
      foliMesh.setMatrixAt(j, _m4);
      tintColor.setRGB(p.tint, p.tint * (0.94 + p.tint * 0.08), p.tint * 0.9);
      foliMesh.setColorAt(j, tintColor);
      tintColor.setRGB(p.tint * 0.95 + 0.05, p.tint * 0.95 + 0.05, p.tint * 0.95 + 0.05);
      trunkMesh.setColorAt(j, tintColor);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliMesh.instanceMatrix.needsUpdate = true;
    if (trunkMesh.instanceColor) trunkMesh.instanceColor.needsUpdate = true;
    if (foliMesh.instanceColor) foliMesh.instanceColor.needsUpdate = true;
    group.add(trunkMesh, foliMesh);
  });

  // --- undergrowth ---------------------------------------------------------
  const fernMat = foliageMaterial(fernTexture(0), { alphaTest: 0.36 });
  const grassMat = foliageMaterial(grassTuftTexture(0), { alphaTest: 0.3 });
  grassMat.side = THREE.DoubleSide;

  const fernGeo = windWeight(crossCard(1.02, 0.82), (x, y) => clamp(y / 0.82) * 0.9);
  const grassGeo = windWeight(crossCard(0.58, 0.42, false), (x, y) => clamp(y / 0.42) * 1.0);

  function scatterCards(geo, mat, count, { minRoad, maxRoad, scale, radius = area * 0.5 }) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 30) {
      tries++;
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * radius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const d = terrain.roadDistance(x, z);
      if (d < minRoad || d > maxRoad) continue;
      const y = terrain.heightAt(x, z);
      _pos.set(x, y - 0.05, z);
      _quat.setFromEuler(_euler.set((rnd() - 0.5) * 0.14, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.14));
      const s = scale[0] + rnd() * (scale[1] - scale[0]);
      _scl.set(s, s * (0.8 + rnd() * 0.5), s);
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(n, _m4);
      const t = 0.65 + rnd() * 0.5;
      tintColor.setRGB(t, t * (0.95 + rnd() * 0.15), t * 0.85);
      mesh.setColorAt(n, tintColor);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
    return mesh;
  }

  scatterCards(fernGeo, fernMat, 1100, { minRoad: 3.4, maxRoad: 60, scale: [0.55, 1.25], radius: 60 });
  scatterCards(grassGeo, grassMat, 3000, { minRoad: 2.4, maxRoad: 46, scale: [0.6, 1.35], radius: 46 });

  // --- rocks, logs, stumps -------------------------------------------------
  const rock = rockMaps();
  const rockMat = new THREE.MeshStandardMaterial({
    map: rock.map,
    normalMap: rock.normal,
    roughnessMap: rock.rough,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.6,
  });

  const rockProtos = [0, 1, 2].map((i) => {
    const g = new THREE.IcosahedronGeometry(0.5, 1);
    const p = g.attributes.position;
    const r2 = mulberry32(900 + i * 31);
    for (let v = 0; v < p.count; v++) {
      const s = 0.62 + r2() * 0.7;
      p.setXYZ(v, p.getX(v) * s, p.getY(v) * s * 0.72, p.getZ(v) * s);
    }
    g.computeVertexNormals();
    // rocks need UVs that tile — reuse the icosa uv scaled up
    const uv = g.attributes.uv;
    for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * 2, uv.getY(v) * 2);
    return g;
  });

  rockProtos.forEach((geo, i) => {
    const count = 130;
    const mesh = new THREE.InstancedMesh(geo, rockMat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 30) {
      tries++;
      const x = (rnd() - 0.5) * area * 0.75;
      const z = (rnd() - 0.5) * area * 0.75;
      const d = terrain.roadDistance(x, z);
      if (d < 3.0) continue;
      const y = terrain.heightAt(x, z);
      const s = 0.3 + rnd() * (d < 8 ? 0.7 : 1.9);
      _pos.set(x, y - s * 0.22, z);
      _quat.setFromEuler(_euler.set(rnd() * 0.6, rnd() * Math.PI * 2, rnd() * 0.6));
      _scl.set(s, s * (0.7 + rnd() * 0.5), s * (0.85 + rnd() * 0.4));
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(n, _m4);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  // fallen logs and stumps break up the mid-ground
  const logGeo = (() => {
    const g = new THREE.CylinderGeometry(0.26, 0.34, 6.5, 12, 4);
    g.rotateZ(Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const bend = Math.sin(x * 0.4) * 0.06;
      p.setY(i, p.getY(i) + bend);
    }
    g.computeVertexNormals();
    return windWeight(g, () => 0);
  })();
  const logCount = 26;
  const logs = new THREE.InstancedMesh(logGeo, barkMat, logCount);
  logs.castShadow = true;
  logs.receiveShadow = true;
  {
    let n = 0;
    let tries = 0;
    while (n < logCount && tries < 400) {
      tries++;
      const x = (rnd() - 0.5) * area * 0.7;
      const z = (rnd() - 0.5) * area * 0.7;
      if (terrain.roadDistance(x, z) < 4.5) continue;
      const y = terrain.heightAt(x, z);
      _pos.set(x, y + 0.2, z);
      _quat.setFromEuler(_euler.set((rnd() - 0.5) * 0.2, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.15));
      const s = 0.7 + rnd() * 0.7;
      _scl.set(s, s, s);
      _m4.compose(_pos, _quat, _scl);
      logs.setMatrixAt(n, _m4);
      n++;
    }
    logs.count = n;
    logs.instanceMatrix.needsUpdate = true;
  }
  group.add(logs);

  const stumpGeo = (() => {
    const g = new THREE.CylinderGeometry(0.42, 0.58, 0.85, 12, 2);
    g.translate(0, 0.42, 0);
    return windWeight(g, () => 0);
  })();
  const stumps = new THREE.InstancedMesh(stumpGeo, barkMat, 22);
  stumps.castShadow = true;
  stumps.receiveShadow = true;
  {
    let n = 0;
    let tries = 0;
    while (n < 22 && tries < 400) {
      tries++;
      const x = (rnd() - 0.5) * area * 0.6;
      const z = (rnd() - 0.5) * area * 0.6;
      if (terrain.roadDistance(x, z) < 3.6) continue;
      const y = terrain.heightAt(x, z);
      _pos.set(x, y - 0.1, z);
      _quat.setFromEuler(_euler.set((rnd() - 0.5) * 0.14, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.14));
      const s = 0.6 + rnd() * 0.7;
      _scl.set(s, s, s);
      _m4.compose(_pos, _quat, _scl);
      stumps.setMatrixAt(n, _m4);
      n++;
    }
    stumps.count = n;
    stumps.instanceMatrix.needsUpdate = true;
  }
  group.add(stumps);

  if (env) {
    for (const m of [barkMat, birchMat, needleMat, leafMat, fernMat, grassMat, rockMat]) m.envMap = env;
  }

  const windMats = [barkMat, birchMat, needleMat, leafMat, fernMat, grassMat];

  return {
    group,
    materials: { barkMat, birchMat, needleMat, leafMat, fernMat, grassMat, rockMat },
    update(t) {
      for (const m of windMats) {
        if (m.userData.wind) m.userData.wind.uTime.value = t;
      }
      for (const u of updaters) u(t);
    },
  };
}
