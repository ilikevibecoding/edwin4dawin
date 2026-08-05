// Fictional air-defence site "AEGIS RIDGE": terrain, concrete apron, command
// shelter, radar installation and all of the support clutter that makes the
// place read as a real emplacement. Everything is procedural and merged per
// material to keep the draw-call count low.

import * as THREE from 'three';
import { WORLD, PLAYER } from './config.js';
import { noise } from './util/noise.js';
import { RNG } from './util/rng.js';
import { materials, std, lamp, applyAtmosphere } from './util/materials.js';
import {
  chamferBox,
  corrugatedPanel,
  cylinder,
  mergeParts,
  transform,
  trussSegment,
  ladder,
  handrail,
  wheel,
  cableGeometry,
  pathTube,
  ribbedTube,
  greebleField,
  boltRow,
} from './util/geom.js';
import {
  padMarkingsDecal,
  stencilDecal,
  warningStripes,
  chainLinkTexture,
  tireTrackTexture,
  softSprite,
} from './util/textures.js';

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Single source of truth for ground elevation, shared by placement + collision. */
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  // The graded pad is dead flat, then blends into rolling desert.
  const blend = smoothstep(WORLD.baseRadius + 18, WORLD.baseRadius + 190, r);
  let h = 0;
  h += noise.fbm2(x * 0.00085, z * 0.00085, 4) * 13;
  h += noise.fbm2(x * 0.00019, z * 0.00019, 4) * 82;
  // dune ripples
  h += Math.sin(x * 0.0043 + noise.simplex2(x * 0.0006, z * 0.0006) * 2.4) * 1.6 * smoothstep(200, 900, r);
  const mt = smoothstep(4600, 12000, r) * (1 - smoothstep(29000, 44000, r));
  if (mt > 0) {
    const ridge = Math.pow(Math.max(0, noise.ridged2(x * 0.000058, z * 0.000058, 6, 2.07, 0.52)), 1.35);
    const ridge2 = Math.pow(Math.max(0, noise.ridged2(x * 0.000021 + 9, z * 0.000021 - 4, 4, 2.1, 0.55)), 1.2);
    h += mt * (ridge * 2150 + ridge2 * 1500);
  }
  return h * blend;
}

function terrainNormalY(x, z, e = 6) {
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  const n = new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  return n;
}

/* --------------------------------------------------------------- terrain */

function buildTerrain(quality) {
  const group = new THREE.Group();
  const mats = materials();

  const nearSize = 1300;
  const nearSeg = Math.max(64, Math.round(quality.terrainSegments));
  const near = new THREE.PlaneGeometry(nearSize, nearSize, nearSeg, nearSeg);
  near.rotateX(-Math.PI / 2);
  displace(near, 0);
  {
    // World-space UVs: one texture tile every 18 m.
    const p = near.attributes.position;
    const uv = near.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 18, p.getZ(i) / 18);
  }
  const nearMat = mats.sand.clone();
  applyAtmosphere(nearMat);
  nearMat.vertexColors = true;
  const nearMesh = new THREE.Mesh(near, nearMat);
  nearMesh.receiveShadow = true;
  nearMesh.name = 'terrain.near';
  group.add(nearMesh);

  // Polar far field: dense near the site, coarse toward the mountain ring.
  const rings = Math.max(80, Math.round(quality.terrainSegments * 0.8));
  const sectors = 168;
  const r0 = 560;
  const r1 = WORLD.terrainOuter;
  const pos = [];
  const idx = [];
  const uv = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const r = r0 + (r1 - r0) * Math.pow(t, 2.35);
    for (let j = 0; j <= sectors; j++) {
      const a = (j / sectors) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, terrainHeight(x, z) - 0.2, z);
      // Coarser tiling far out where texel density no longer matters.
      uv.push(x / 60, z / 60);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = i * (sectors + 1) + j;
      const b = a + sectors + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const far = new THREE.BufferGeometry();
  far.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  far.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  far.setIndex(idx);
  far.computeVertexNormals();
  colorize(far);
  const farMat = mats.sand.clone();
  applyAtmosphere(farMat);
  farMat.vertexColors = true;
  farMat.roughness = 1;
  farMat.normalScale = new THREE.Vector2(0.25, 0.25);
  const farMesh = new THREE.Mesh(far, farMat);
  farMesh.name = 'terrain.far';
  group.add(farMesh);

  function displace(geo, yOff) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, terrainHeight(p.getX(i), p.getZ(i)) + yOff);
    }
    geo.computeVertexNormals();
    colorize(geo);
  }

  /**
   * Vertex colours are tint multipliers around 1.0, not absolute albedo — the
   * sand map already carries the base colour.
   */
  function colorize(geo) {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const rock = new THREE.Color(1.02, 1.0, 0.98);
    const scrub = new THREE.Color(0.86, 0.92, 0.74);
    const high = new THREE.Color(0.74, 0.73, 0.76);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const slope = 1 - THREE.MathUtils.clamp(n.getY(i), 0, 1);
      const alt = THREE.MathUtils.clamp(y / 1600, 0, 1);
      const v = noise.fbm2(x * 0.0012, z * 0.0012, 3) * 0.5 + 0.5;
      const w = noise.fbm2(x * 0.012 + 40, z * 0.012 - 20, 2) * 0.5 + 0.5;
      c.setRGB(1, 1, 1).lerp(scrub, v * 0.4);
      c.lerp(rock, THREE.MathUtils.clamp(slope * 2.6, 0, 1));
      c.lerp(high, alt * 0.7);
      c.multiplyScalar(0.86 + w * 0.28);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  return group;
}

/* ------------------------------------------------------------------- pad */

function buildPad(colliders) {
  const g = new THREE.Group();
  const mats = materials();
  const R = WORLD.baseRadius;

  const apron = new THREE.CircleGeometry(R, 96);
  apron.rotateX(-Math.PI / 2);
  const uvs = apron.attributes.uv;
  const pos = apron.attributes.position;
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, pos.getX(i) / 26, pos.getZ(i) / 26);
  const apronMesh = new THREE.Mesh(apron, mats.concretePad);
  apronMesh.position.y = 0.05;
  apronMesh.receiveShadow = true;
  g.add(apronMesh);

  // graded gravel skirt
  const skirt = new THREE.RingGeometry(R - 0.2, R + 26, 96, 1);
  skirt.rotateX(-Math.PI / 2);
  const su = skirt.attributes.uv;
  const sp = skirt.attributes.position;
  for (let i = 0; i < su.count; i++) su.setXY(i, sp.getX(i) / 18, sp.getZ(i) / 18);
  const skirtMesh = new THREE.Mesh(skirt, mats.gravel);
  skirtMesh.position.y = 0.02;
  skirtMesh.receiveShadow = true;
  g.add(skirtMesh);

  // kerb ring
  const kerb = new THREE.TorusGeometry(R, 0.16, 6, 96);
  kerb.rotateX(Math.PI / 2);
  const kerbMesh = new THREE.Mesh(kerb, mats.concreteWall);
  kerbMesh.position.y = 0.12;
  kerbMesh.castShadow = true;
  kerbMesh.receiveShadow = true;
  g.add(kerbMesh);

  return g;
}

function decalPlane(texture, size, opts = {}) {
  const geo = new THREE.PlaneGeometry(size[0], size[1]);
  geo.rotateX(-Math.PI / 2);
  const mat = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      roughness: 0.95,
      metalness: 0,
      ...opts,
    })
  );
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = false;
  return m;
}

/* ------------------------------------------------- command shelter (C2) */

function buildShelter(rng) {
  const g = new THREE.Group();
  g.name = 'shelter';
  const mats = materials();
  const W = 13.5;
  const D = 8.4;
  const H = 3.5;

  // Concrete plinth
  const plinth = new THREE.Mesh(chamferBox(W + 1.6, 0.42, D + 1.6, 0.06), mats.concreteWall);
  plinth.position.y = 0.21;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Corrugated shell: three walls, open front (-Z) with a canopy for sky view.
  const wallParts = [];
  const back = corrugatedPanel(W, H, 22, 0.045);
  wallParts.push({ geometry: back, matrix: transform({ pos: [0, H / 2 + 0.42, D / 2], rot: [0, Math.PI, 0] }) });
  const side = corrugatedPanel(D, H, 14, 0.045);
  wallParts.push({ geometry: side, matrix: transform({ pos: [-W / 2, H / 2 + 0.42, 0], rot: [0, -Math.PI / 2, 0] }) });
  wallParts.push({ geometry: side, matrix: transform({ pos: [W / 2, H / 2 + 0.42, 0], rot: [0, Math.PI / 2, 0] }) });
  // front bulkheads flanking the opening
  const front = corrugatedPanel(3.1, H, 6, 0.045);
  wallParts.push({ geometry: front, matrix: transform({ pos: [-W / 2 + 1.55, H / 2 + 0.42, -D / 2] }) });
  wallParts.push({ geometry: front, matrix: transform({ pos: [W / 2 - 1.55, H / 2 + 0.42, -D / 2] }) });
  const header = chamferBox(W - 6.2, 0.85, 0.16, 0.03);
  wallParts.push({ geometry: header, matrix: transform({ pos: [0, H + 0.42 - 0.42, -D / 2] }) });
  const shell = new THREE.Mesh(mergeParts(wallParts), mats.oliveMetal);
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);
  wallParts.forEach((p) => p.geometry.dispose());

  // Roof with ribs, AC unit, cable trays, antenna
  const roofParts = [];
  roofParts.push({ geometry: chamferBox(W + 0.7, 0.22, D + 0.7, 0.05), matrix: transform({ pos: [0, H + 0.52, 0] }) });
  const rib = chamferBox(W + 0.7, 0.1, 0.14, 0.02);
  for (let i = 0; i < 7; i++) {
    roofParts.push({ geometry: rib, matrix: transform({ pos: [0, H + 0.68, -D / 2 + (i + 0.5) * (D / 7)] }) });
  }
  const roof = new THREE.Mesh(mergeParts(roofParts), mats.oliveMetal);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  roofParts.forEach((p) => p.geometry.dispose());

  // canopy over the open front
  const canopyParts = [];
  canopyParts.push({ geometry: chamferBox(W - 1.0, 0.1, 3.2, 0.04), matrix: transform({ pos: [0, H + 0.34, -D / 2 - 1.6], rot: [0.09, 0, 0] }) });
  const strut = cylinder(0.06, 0.06, 3.0, 8);
  canopyParts.push({ geometry: strut, matrix: transform({ pos: [-W / 2 + 1.0, H - 0.9, -D / 2 - 1.2], rot: [0.7, 0, 0] }) });
  canopyParts.push({ geometry: strut, matrix: transform({ pos: [W / 2 - 1.0, H - 0.9, -D / 2 - 1.2], rot: [0.7, 0, 0] }) });
  const canopy = new THREE.Mesh(mergeParts(canopyParts), mats.tarp);
  canopy.castShadow = true;
  g.add(canopy);
  canopyParts.forEach((p) => p.geometry.dispose());

  // Equipment on the roof
  const acParts = [];
  acParts.push({ geometry: chamferBox(1.9, 0.9, 1.5, 0.05), matrix: transform({ pos: [-3.4, H + 1.08, 1.2] }) });
  acParts.push({ geometry: chamferBox(1.2, 0.6, 1.0, 0.04), matrix: transform({ pos: [3.9, H + 0.94, 1.6] }) });
  acParts.push({ geometry: greebleField(1.7, 0.7, rng, { count: 9, maxSize: 0.2, depth: 0.06 }), matrix: transform({ pos: [-3.4, H + 1.08, 0.44], rot: [0, 0, 0] }) });
  const ac = new THREE.Mesh(mergeParts(acParts), mats.galv);
  ac.castShadow = true;
  g.add(ac);
  acParts.forEach((p) => p.geometry.dispose());

  const fan = new THREE.Mesh(fanBlades(0.42), mats.steel);
  fan.position.set(-3.4, H + 1.54, 1.2);
  fan.rotation.x = -Math.PI / 2;
  fan.userData.spin = 6.2;
  g.add(fan);

  // Interior floor + rear equipment racks
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, D - 0.4), mats.darkMetal);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.44;
  floor.receiveShadow = true;
  g.add(floor);

  const rackParts = [];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 1.6 + i * 1.5;
    rackParts.push({ geometry: chamferBox(1.3, 2.0, 0.75, 0.03), matrix: transform({ pos: [x, 1.44, D / 2 - 0.7] }) });
  }
  const racks = new THREE.Mesh(mergeParts(rackParts), mats.darkMetal);
  racks.castShadow = true;
  racks.receiveShadow = true;
  g.add(racks);
  rackParts.forEach((p) => p.geometry.dispose());

  // rack indicator strips
  const stripGeo = new THREE.PlaneGeometry(1.1, 0.06);
  const stripMat = lamp(0x66ff9a, 3.0);
  const strips = new THREE.InstancedMesh(stripGeo, stripMat, 16);
  let si = 0;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 4; k++) {
      m4.makeTranslation(-W / 2 + 1.6 + i * 1.5, 0.75 + k * 0.42, D / 2 - 1.09);
      strips.setMatrixAt(si++, m4);
    }
  }
  strips.instanceMatrix.needsUpdate = true;
  g.add(strips);

  // cable trays along the walls
  const tray = new THREE.Mesh(
    mergeParts([
      { geometry: chamferBox(W - 1, 0.1, 0.34, 0.02), matrix: transform({ pos: [0, 2.9, D / 2 - 0.3] }) },
      { geometry: chamferBox(0.34, 0.1, D - 1, 0.02), matrix: transform({ pos: [-W / 2 + 0.35, 2.9, 0] }) },
    ]),
    mats.galv
  );
  tray.castShadow = true;
  g.add(tray);

  // ceiling strip lights
  const ceilGeo = new THREE.PlaneGeometry(2.6, 0.22);
  const ceilMat = lamp(0xdfe8ff, 2.4, { side: THREE.DoubleSide });
  for (const x of [-4, 0, 4]) {
    const m = new THREE.Mesh(ceilGeo, ceilMat);
    m.position.set(x, H + 0.3, 0.4);
    m.rotation.x = Math.PI / 2;
    g.add(m);
  }
  const inner = new THREE.PointLight(0xbfd2ff, 6, 16, 2);
  inner.position.set(0, H - 0.4, 0.6);
  g.add(inner);
  g.userData.interiorLight = inner;

  // door on the side wall
  const door = new THREE.Mesh(chamferBox(0.95, 2.1, 0.1, 0.03), mats.darkMetal);
  door.position.set(W / 2 + 0.02, 1.5, 2.2);
  door.rotation.y = Math.PI / 2;
  door.castShadow = true;
  g.add(door);

  // stencils
  const sign = decalPlane(stencilDecal(['C2 SHELTER 01', 'AEGIS RIDGE'], { w: 512, h: 160, color: '#e6e0cd', font: 'bold 62px "Arial Narrow", Impact, sans-serif' }), [4.4, 1.4]);
  sign.rotation.x = 0;
  sign.rotation.set(Math.PI / 2, 0, 0);
  sign.position.set(-W / 2 + 3.2, 2.55, -D / 2 - 0.06);
  g.add(sign);

  const hazard = decalPlane(warningStripes(512, 96), [W - 6.2, 0.42], { transparent: false });
  hazard.rotation.set(Math.PI / 2, 0, 0);
  hazard.position.set(0, H + 0.02, -D / 2 - 0.05);
  g.add(hazard);

  g.userData.colliders = [
    { type: 'box', pos: [0, 2, D / 2 + 0.1], half: [W / 2 + 0.3, 2.2, 0.35], walkable: false },
    { type: 'box', pos: [-W / 2 - 0.1, 2, 0], half: [0.35, 2.2, D / 2 + 0.3], walkable: false },
    { type: 'box', pos: [W / 2 + 0.1, 2, 0], half: [0.35, 2.2, D / 2 + 0.3], walkable: false },
    { type: 'box', pos: [-W / 2 + 1.55, 2, -D / 2], half: [1.6, 2.2, 0.3], walkable: false },
    { type: 'box', pos: [W / 2 - 1.55, 2, -D / 2], half: [1.6, 2.2, 0.3], walkable: false },
    { type: 'box', pos: [-2.9, 1.2, D / 2 - 0.7], half: [3.1, 1.1, 0.45], walkable: false },
    { type: 'box', pos: [0, 0.22, 0], half: [W / 2 + 0.8, 0.22, D / 2 + 0.8], walkable: true },
  ];

  return g;
}

function fanBlades(r) {
  const parts = [];
  const blade = new THREE.BoxGeometry(r * 0.9, 0.02, r * 0.3);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push({
      geometry: blade,
      matrix: transform({ pos: [Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5], rot: [0.4, -a, 0] }),
    });
  }
  parts.push({ geometry: cylinder(r * 0.16, r * 0.16, 0.08, 10), matrix: transform({}) });
  const g = mergeParts(parts);
  blade.dispose();
  return g;
}

/* --------------------------------------------------------------- radar */

function buildRadarSite(rng) {
  const g = new THREE.Group();
  g.name = 'radarSite';
  const mats = materials();

  // Trailer chassis
  const chassisParts = [];
  chassisParts.push({ geometry: chamferBox(7.4, 0.5, 3.0, 0.06), matrix: transform({ pos: [0, 1.0, 0] }) });
  chassisParts.push({ geometry: chamferBox(7.8, 0.16, 0.4, 0.03), matrix: transform({ pos: [0, 0.72, 1.2] }) });
  chassisParts.push({ geometry: chamferBox(7.8, 0.16, 0.4, 0.03), matrix: transform({ pos: [0, 0.72, -1.2] }) });
  const jack = cylinder(0.13, 0.16, 0.9, 8);
  for (const [x, z] of [[-3.2, 1.3], [3.2, 1.3], [-3.2, -1.3], [3.2, -1.3]]) {
    chassisParts.push({ geometry: jack, matrix: transform({ pos: [x, 0.45, z] }) });
    chassisParts.push({ geometry: chamferBox(0.6, 0.1, 0.6, 0.02), matrix: transform({ pos: [x, 0.05, z] }) });
  }
  const chassis = new THREE.Mesh(mergeParts(chassisParts), mats.sandMetal);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);
  chassisParts.forEach((p) => p.geometry.dispose());

  for (const [x, z] of [[-2.4, 1.62], [2.4, 1.62], [-2.4, -1.62], [2.4, -1.62]]) {
    const w = new THREE.Mesh(wheel(0.55, 0.36), mats.rubber);
    w.position.set(x, 0.55, z);
    w.castShadow = true;
    g.add(w);
  }

  // Turntable + phased array panel
  const turn = new THREE.Group();
  turn.position.set(0, 1.3, 0);
  g.add(turn);
  g.userData.turntable = turn;

  const base = new THREE.Mesh(cylinder(1.25, 1.45, 0.6, 20), mats.darkMetal);
  base.position.y = 0.3;
  base.castShadow = true;
  turn.add(base);

  const arrayGroup = new THREE.Group();
  arrayGroup.position.y = 0.62;
  turn.add(arrayGroup);
  g.userData.arrayTilt = arrayGroup;

  const panelParts = [];
  panelParts.push({ geometry: chamferBox(4.6, 3.4, 0.42, 0.06), matrix: transform({ pos: [0, 1.9, 0] }) });
  panelParts.push({ geometry: chamferBox(5.0, 0.22, 0.7, 0.04), matrix: transform({ pos: [0, 0.28, 0] }) });
  // stiffener ribs on the back
  const rib = chamferBox(0.14, 3.2, 0.3, 0.02);
  for (let i = 0; i < 7; i++) panelParts.push({ geometry: rib, matrix: transform({ pos: [-2.1 + i * 0.7, 1.9, 0.34] }) });
  const panel = new THREE.Mesh(mergeParts(panelParts), mats.sandMetal);
  panel.castShadow = true;
  panel.receiveShadow = true;
  arrayGroup.add(panel);
  panelParts.forEach((p) => p.geometry.dispose());

  // radiating face: instanced element grid
  const elemGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.05, 6);
  elemGeo.rotateX(Math.PI / 2);
  const faceMat = std({ color: 0x22262b, roughness: 0.42, metalness: 0.7, emissive: 0x0a2a3a, emissiveIntensity: 0.6 });
  const cols = 22;
  const rows = 16;
  const elems = new THREE.InstancedMesh(elemGeo, faceMat, cols * rows);
  let ei = 0;
  const m4 = new THREE.Matrix4();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m4.makeTranslation(-2.05 + (c / (cols - 1)) * 4.1, 0.42 + (r / (rows - 1)) * 2.95, -0.24);
      elems.setMatrixAt(ei++, m4);
    }
  }
  elems.instanceMatrix.needsUpdate = true;
  elems.castShadow = false;
  arrayGroup.add(elems);
  g.userData.arrayFace = elems;
  g.userData.arrayFaceMat = faceMat;

  // hydraulic tilt rams
  const ramMat = mats.steel;
  for (const s of [-1, 1]) {
    const ram = new THREE.Mesh(cylinder(0.07, 0.07, 1.5, 8), ramMat);
    ram.position.set(s * 1.5, 1.0, 0.9);
    ram.rotation.x = -0.5;
    ram.castShadow = true;
    arrayGroup.add(ram);
  }

  // status light bar
  const lightBar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), lamp(0x44ff88, 3.4));
  lightBar.position.set(2.0, 1.02, -1.52);
  g.add(lightBar);
  g.userData.statusLamp = lightBar;

  // marker beacon on top
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lamp(0xff3a2a, 4));
  beacon.position.set(0, 3.95, 0);
  arrayGroup.add(beacon);
  g.userData.beacon = beacon;

  // cables to the shelter
  g.userData.cableAnchor = new THREE.Vector3(-3.6, 0.9, -1.0);

  // Secondary surveillance dish
  const dishBase = new THREE.Group();
  dishBase.position.set(9.5, 0, 0);
  g.add(dishBase);
  const mast = new THREE.Mesh(trussSegment(0.7, 4.2, 0.04), mats.galv);
  mast.castShadow = true;
  dishBase.add(mast);
  const dishSpin = new THREE.Group();
  dishSpin.position.y = 4.3;
  dishBase.add(dishSpin);
  g.userData.dishSpin = dishSpin;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.34), mats.galv);
  dish.rotation.x = Math.PI * 0.62;
  dish.rotation.z = 0;
  dish.castShadow = true;
  dishSpin.add(dish);
  const feed = new THREE.Mesh(cylinder(0.05, 0.05, 1.3, 6), mats.steel);
  feed.position.set(0, 0.2, 0.75);
  feed.rotation.x = Math.PI / 2;
  dishSpin.add(feed);
  const feedHorn = new THREE.Mesh(cylinder(0.14, 0.07, 0.28, 8), mats.steel);
  feedHorn.position.set(0, 0.2, 1.32);
  feedHorn.rotation.x = Math.PI / 2;
  dishSpin.add(feedHorn);

  g.userData.colliders = [
    { type: 'box', pos: [0, 1.0, 0], half: [3.9, 1.0, 1.7], walkable: true },
    { type: 'cyl', pos: [9.5, 2.1, 0], r: 0.75, hh: 2.1, walkable: false },
  ];
  return g;
}

/* ------------------------------------------------------------- vehicles */

function buildTruck(rng, variant = 0) {
  const g = new THREE.Group();
  const mats = materials();
  const bodyMat = variant === 2 ? mats.sandMetal : mats.oliveMetal;
  const parts = [];
  // cab
  parts.push({ geometry: chamferBox(2.5, 1.55, 2.3, 0.09), matrix: transform({ pos: [0, 1.75, -2.6] }) });
  parts.push({ geometry: chamferBox(2.45, 0.65, 0.9, 0.06), matrix: transform({ pos: [0, 1.15, -3.9] }) });
  // bonnet
  parts.push({ geometry: chamferBox(2.3, 0.5, 1.0, 0.06), matrix: transform({ pos: [0, 1.6, -4.0] }) });
  // chassis
  parts.push({ geometry: chamferBox(2.3, 0.34, 7.6, 0.05), matrix: transform({ pos: [0, 0.95, -0.3] }) });
  // bed
  if (variant === 0) {
    parts.push({ geometry: chamferBox(2.5, 0.16, 4.6, 0.04), matrix: transform({ pos: [0, 1.16, 0.9] }) });
    const side = chamferBox(0.12, 0.95, 4.6, 0.03);
    parts.push({ geometry: side, matrix: transform({ pos: [-1.2, 1.65, 0.9] }) });
    parts.push({ geometry: side, matrix: transform({ pos: [1.2, 1.65, 0.9] }) });
    parts.push({ geometry: chamferBox(2.5, 0.95, 0.12, 0.03), matrix: transform({ pos: [0, 1.65, 3.2] }) });
    // bows for a tarp
    const bow = new THREE.TorusGeometry(1.22, 0.045, 5, 12, Math.PI);
    for (let i = 0; i < 4; i++) {
      parts.push({ geometry: bow, matrix: transform({ pos: [0, 2.1, -1.2 + i * 1.4], rot: [0, Math.PI / 2, 0] }) });
    }
  } else if (variant === 1) {
    // flatbed with cargo boxes
    parts.push({ geometry: chamferBox(2.5, 0.16, 4.8, 0.04), matrix: transform({ pos: [0, 1.16, 0.9] }) });
    for (let i = 0; i < 3; i++) {
      parts.push({ geometry: chamferBox(1.9, 0.9, 1.2, 0.05), matrix: transform({ pos: [rng.range(-0.2, 0.2), 1.7, -0.6 + i * 1.5] }) });
    }
  } else {
    // shelter body (command variant)
    parts.push({ geometry: chamferBox(2.6, 2.2, 4.8, 0.07), matrix: transform({ pos: [0, 2.28, 0.9] }) });
    parts.push({ geometry: greebleField(2.2, 1.7, rng, { count: 10, maxSize: 0.3, depth: 0.07 }), matrix: transform({ pos: [0, 2.28, 3.32] }) });
  }
  // bumper, exhaust, mirrors, spare
  parts.push({ geometry: chamferBox(2.55, 0.28, 0.22, 0.04), matrix: transform({ pos: [0, 0.95, -4.55] }) });
  parts.push({ geometry: cylinder(0.1, 0.1, 2.2, 8), matrix: transform({ pos: [1.3, 2.2, -2.3] }) });
  parts.push({ geometry: cylinder(0.13, 0.13, 0.3, 8), matrix: transform({ pos: [1.3, 3.35, -2.3] }) });
  const arm = cylinder(0.025, 0.025, 0.5, 5);
  parts.push({ geometry: arm, matrix: transform({ pos: [-1.4, 2.3, -3.5], rot: [0, 0, Math.PI / 2] }) });
  parts.push({ geometry: arm, matrix: transform({ pos: [1.4, 2.3, -3.5], rot: [0, 0, Math.PI / 2] }) });
  const body = new THREE.Mesh(mergeParts(parts), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  parts.forEach((p) => p.geometry.dispose());

  if (variant === 0) {
    const tarp = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 4.5, 14, 1, true, 0, Math.PI),
      mats.tarp
    );
    tarp.rotation.z = Math.PI / 2;
    tarp.rotation.y = Math.PI / 2;
    tarp.position.set(0, 2.1, 0.9);
    tarp.castShadow = true;
    tarp.material.side = THREE.DoubleSide;
    g.add(tarp);
  }

  // glass
  const glass = new THREE.Mesh(chamferBox(2.35, 0.85, 0.06, 0.02), mats.glass);
  glass.position.set(0, 2.05, -3.72);
  glass.rotation.x = -0.16;
  g.add(glass);

  // wheels
  const wgeo = wheel(0.62, 0.4);
  for (const [x, z] of [[-1.18, -3.0], [1.18, -3.0], [-1.18, 0.6], [1.18, 0.6], [-1.18, 2.0], [1.18, 2.0]]) {
    const w = new THREE.Mesh(wgeo, mats.rubber);
    w.position.set(x, 0.62, z);
    w.castShadow = true;
    g.add(w);
  }

  // headlights
  const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), lamp(0xfff3d0, 2.2));
  hl.position.set(-0.85, 1.45, -4.62);
  hl.rotation.y = Math.PI;
  g.add(hl);
  const hl2 = hl.clone();
  hl2.position.x = 0.85;
  g.add(hl2);
  g.userData.headlights = [hl, hl2];

  g.userData.colliders = [{ type: 'box', pos: [0, 1.4, -0.4], half: [1.35, 1.4, 4.3], walkable: false }];
  return g;
}

function buildGenerator(rng) {
  const g = new THREE.Group();
  const mats = materials();
  const parts = [];
  parts.push({ geometry: chamferBox(3.2, 1.8, 1.7, 0.07), matrix: transform({ pos: [0, 1.05, 0] }) });
  parts.push({ geometry: chamferBox(3.4, 0.2, 1.9, 0.04), matrix: transform({ pos: [0, 0.1, 0] }) });
  // louvre panels
  const louvre = chamferBox(1.0, 0.08, 0.06, 0.01);
  for (let i = 0; i < 9; i++) {
    parts.push({ geometry: louvre, matrix: transform({ pos: [-0.9, 0.45 + i * 0.14, -0.87], rot: [0.35, 0, 0] }) });
  }
  parts.push({ geometry: greebleField(1.1, 1.2, rng, { count: 8, maxSize: 0.22, depth: 0.07 }), matrix: transform({ pos: [0.9, 1.1, -0.88] }) });
  // exhaust stack
  parts.push({ geometry: cylinder(0.11, 0.11, 1.5, 8), matrix: transform({ pos: [1.3, 2.4, 0.5] }) });
  parts.push({ geometry: cylinder(0.15, 0.11, 0.22, 8), matrix: transform({ pos: [1.3, 3.2, 0.5] }) });
  const gen = new THREE.Mesh(mergeParts(parts), mats.sandMetal);
  gen.castShadow = true;
  gen.receiveShadow = true;
  g.add(gen);
  parts.forEach((p) => p.geometry.dispose());

  const fan = new THREE.Mesh(fanBlades(0.5), mats.steel);
  fan.position.set(-0.9, 1.05, -0.92);
  fan.userData.spin = 22;
  g.add(fan);

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), lamp(0x2fff8a, 2.6));
  panel.position.set(0.9, 1.5, -0.92);
  g.add(panel);

  const strip = decalPlane(warningStripes(256, 64), [3.2, 0.18], { transparent: false });
  strip.rotation.set(Math.PI / 2, 0, 0);
  strip.position.set(0, 1.97, -0.86);
  g.add(strip);

  g.userData.colliders = [{ type: 'box', pos: [0, 1.0, 0], half: [1.75, 1.0, 0.95], walkable: false }];
  g.userData.hum = true;
  return g;
}

function buildAntennaMast(rng, height = 12) {
  const g = new THREE.Group();
  const mats = materials();
  const segH = 3;
  const n = Math.round(height / segH);
  const seg = trussSegment(0.55, segH, 0.035);
  const parts = [];
  for (let i = 0; i < n; i++) parts.push({ geometry: seg, matrix: transform({ pos: [0, i * segH, 0] }) });
  parts.push({ geometry: chamferBox(1.6, 0.24, 1.6, 0.05), matrix: transform({ pos: [0, 0.12, 0] }) });
  // dipole elements
  const dip = cylinder(0.018, 0.018, 1.4, 5);
  for (let i = 0; i < 5; i++) {
    parts.push({ geometry: dip, matrix: transform({ pos: [0, height - 1.2 - i * 0.8, 0], rot: [0, i * 0.5, Math.PI / 2] }) });
  }
  parts.push({ geometry: cylinder(0.03, 0.01, 1.8, 6), matrix: transform({ pos: [0, height + 0.9, 0] }) });
  const mast = new THREE.Mesh(mergeParts(parts), mats.galv);
  mast.castShadow = true;
  g.add(mast);
  parts.forEach((p) => p.geometry.dispose());

  // guy wires
  const wireMat = std({ color: 0x2b2b2b, roughness: 0.8, metalness: 0.3 });
  const wireParts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const anchor = new THREE.Vector3(Math.cos(a) * height * 0.55, 0.1, Math.sin(a) * height * 0.55);
    wireParts.push({ geometry: cableGeometry(new THREE.Vector3(0, height * 0.82, 0), anchor, 0.25, 0.014, 10, 4) });
    wireParts.push({ geometry: cylinder(0.05, 0.05, 0.5, 5), matrix: transform({ pos: [anchor.x, 0.25, anchor.z] }) });
  }
  const wires = new THREE.Mesh(mergeParts(wireParts), wireMat);
  g.add(wires);
  wireParts.forEach((p) => p.geometry.dispose());

  const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lamp(0xff2f22, 4));
  light.position.set(0, height + 1.9, 0);
  g.add(light);
  g.userData.beacon = light;

  g.userData.colliders = [{ type: 'cyl', pos: [0, height / 2, 0], r: 0.5, hh: height / 2, walkable: false }];
  return g;
}

function buildFloodMast(height = 9) {
  const g = new THREE.Group();
  const mats = materials();
  const parts = [];
  parts.push({ geometry: cylinder(0.16, 0.2, height, 10), matrix: transform({ pos: [0, height / 2, 0] }) });
  parts.push({ geometry: chamferBox(1.1, 0.2, 1.1, 0.04), matrix: transform({ pos: [0, 0.1, 0] }) });
  parts.push({ geometry: chamferBox(2.2, 0.14, 0.24, 0.03), matrix: transform({ pos: [0, height, 0] }) });
  const mast = new THREE.Mesh(mergeParts(parts), mats.galv);
  mast.castShadow = true;
  g.add(mast);
  parts.forEach((p) => p.geometry.dispose());

  const headMat = mats.darkMetal;
  const lensMat = lamp(0xfff0d2, 0);
  g.userData.lamps = [];
  for (const s of [-0.8, 0.8]) {
    const head = new THREE.Mesh(chamferBox(0.72, 0.5, 0.34, 0.05), headMat);
    head.position.set(s, height - 0.16, 0.1);
    head.rotation.x = 0.55;
    head.castShadow = true;
    g.add(head);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), lensMat.clone());
    lens.position.set(s, height - 0.3, 0.32);
    lens.rotation.x = 0.55 - Math.PI / 2 + Math.PI / 2;
    lens.rotation.x = 0.55;
    g.add(lens);
    g.userData.lamps.push(lens);
  }
  const ladderMesh = new THREE.Mesh(ladder(height - 1.2, 0.36), mats.galv);
  ladderMesh.position.set(0.28, 0.4, 0);
  ladderMesh.rotation.y = Math.PI / 2;
  g.add(ladderMesh);

  g.userData.colliders = [{ type: 'cyl', pos: [0, height / 2, 0], r: 0.45, hh: height / 2, walkable: false }];
  return g;
}

/* --------------------------------------------------------------- clutter */

function buildBarrierRun(count, spacing, mats) {
  // Jersey barrier profile via lathe-free extrusion
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0);
  shape.lineTo(0.32, 0);
  shape.lineTo(0.22, 0.28);
  shape.lineTo(0.11, 0.5);
  shape.lineTo(0.11, 0.95);
  shape.lineTo(-0.11, 0.95);
  shape.lineTo(-0.11, 0.5);
  shape.lineTo(-0.22, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -0.95);
  const inst = new THREE.InstancedMesh(geo, mats.concreteWall, count);
  inst.castShadow = true;
  inst.receiveShadow = true;
  return inst;
}

function buildCase(rng, w = 1.0, h = 0.55, d = 0.7) {
  const parts = [];
  parts.push({ geometry: chamferBox(w, h, d, 0.04) });
  const edge = chamferBox(w * 1.02, 0.05, 0.05, 0.01);
  parts.push({ geometry: edge, matrix: transform({ pos: [0, h / 2 - 0.02, d / 2 - 0.02] }) });
  parts.push({ geometry: edge, matrix: transform({ pos: [0, -h / 2 + 0.02, d / 2 - 0.02] }) });
  parts.push({ geometry: chamferBox(0.18, 0.06, 0.1, 0.02), matrix: transform({ pos: [w * 0.28, 0, d / 2 + 0.02] }) });
  parts.push({ geometry: chamferBox(0.18, 0.06, 0.1, 0.02), matrix: transform({ pos: [-w * 0.28, 0, d / 2 + 0.02] }) });
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

function buildFence(radius, mats) {
  const g = new THREE.Group();
  const posts = 96;
  const postGeo = cylinder(0.055, 0.055, 2.5, 6);
  const inst = new THREE.InstancedMesh(postGeo, mats.galv, posts);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    m4.makeTranslation(x, terrainHeight(x, z) + 1.25, z);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  g.add(inst);

  // mesh panels as a single cylinder with an alpha texture
  // One texture tile holds 8 mesh cells; aim for ~11 cm cells.
  const circumference = Math.PI * 2 * radius;
  const linkTex = chainLinkTexture(256).clone();
  linkTex.needsUpdate = true;
  linkTex.wrapS = THREE.RepeatWrapping;
  linkTex.wrapT = THREE.RepeatWrapping;
  linkTex.repeat.set(Math.round(circumference / (8 * 0.11)), Math.round(2.3 / (8 * 0.11)));
  const meshMat = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: linkTex,
      alphaMap: linkTex,
      transparent: true,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      color: 0x6e7276,
      roughness: 0.62,
      metalness: 0.7,
      depthWrite: true,
    })
  );
  const panel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.3, 128, 1, true), meshMat);
  panel.position.y = 1.2;
  g.add(panel);

  // razor coil along the top
  const coilPts = [];
  for (let i = 0; i <= 320; i++) {
    const a = (i / 320) * Math.PI * 2;
    const wob = Math.sin(i * 0.9) * 0.11;
    coilPts.push(new THREE.Vector3(Math.cos(a) * (radius + wob), 2.5 + Math.cos(i * 0.9) * 0.11, Math.sin(a) * (radius + wob)));
  }
  const coil = new THREE.Mesh(pathTube(coilPts, 0.022, 4, true, 0.4), mats.galv);
  g.add(coil);

  return g;
}

/* ------------------------------------------------------------ searchlights */

class Searchlight {
  constructor(pos, mats) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const parts = [];
    parts.push({ geometry: cylinder(0.22, 0.28, 1.6, 10), matrix: transform({ pos: [0, 0.8, 0] }) });
    parts.push({ geometry: chamferBox(1.2, 0.2, 1.2, 0.04), matrix: transform({ pos: [0, 0.08, 0] }) });
    const stand = new THREE.Mesh(mergeParts(parts), mats.darkMetal);
    stand.castShadow = true;
    this.group.add(stand);
    parts.forEach((p) => p.geometry.dispose());

    this.yawNode = new THREE.Group();
    this.yawNode.position.y = 1.65;
    this.group.add(this.yawNode);
    this.pitchNode = new THREE.Group();
    this.yawNode.add(this.pitchNode);

    const drum = new THREE.Mesh(cylinder(0.62, 0.62, 0.8, 18), mats.darkMetal);
    drum.rotation.x = Math.PI / 2;
    drum.castShadow = true;
    this.pitchNode.add(drum);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), lamp(0xf4f8ff, 0));
    lens.position.z = 0.42;
    this.pitchNode.add(lens);
    this.lens = lens;

    // volumetric beam cone
    const h = 900;
    const cone = new THREE.CylinderGeometry(0.6, 46, h, 22, 1, true);
    cone.translate(0, h / 2, 0);
    cone.rotateX(Math.PI / 2);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xdce8ff) },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vPos;
        void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vPos;
        uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
        void main(){
          float along = clamp(vUv.y, 0.0, 1.0);
          float fade = pow(1.0 - along, 1.7);
          float edge = pow(sin(vUv.x * 3.14159), 0.6);
          float flick = 0.92 + 0.08 * sin(uTime * 11.0);
          gl_FragColor = vec4(uColor, fade * edge * uIntensity * 0.16 * flick);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.beam = new THREE.Mesh(cone, this.beamMat);
    this.beam.frustumCulled = false;
    this.pitchNode.add(this.beam);

    this.light = new THREE.SpotLight(0xdce8ff, 0, 260, 0.16, 0.55, 1.2);
    this.light.position.set(0, 0, 0);
    this.pitchNode.add(this.light);
    this.light.target.position.set(0, 0, 200);
    this.pitchNode.add(this.light.target);

    this.phase = Math.random() * 10;
    this.enabled = false;
    this.intensity = 0;
    this.group.userData.colliders = [{ type: 'cyl', pos: [0, 1.0, 0], r: 0.6, hh: 1.0, walkable: false }];
  }

  setEnabled(on) {
    this.enabled = on;
  }

  update(dt, t, target) {
    this.intensity += ((this.enabled ? 1 : 0) - this.intensity) * Math.min(1, dt * 3);
    this.beamMat.uniforms.uIntensity.value = this.intensity;
    this.beamMat.uniforms.uTime.value = t;
    this.lens.material.emissiveIntensity = this.intensity * 5;
    this.light.intensity = this.intensity * 900;
    if (this.intensity < 0.01) {
      this.beam.visible = false;
      return;
    }
    this.beam.visible = true;
    if (target) {
      const local = this.yawNode.worldToLocal(target.clone());
      const yawTarget = Math.atan2(local.x, local.z) + this.yawNode.rotation.y;
      this.yawNode.rotation.y += (yawTarget - this.yawNode.rotation.y) * Math.min(1, dt * 1.4);
      const flat = Math.hypot(local.x, local.z);
      const pitchTarget = Math.atan2(local.y, flat);
      this.pitchNode.rotation.x += (pitchTarget - this.pitchNode.rotation.x) * Math.min(1, dt * 1.4);
    } else {
      this.yawNode.rotation.y = Math.sin(t * 0.22 + this.phase) * 1.5 + this.phase;
      this.pitchNode.rotation.x = 0.6 + Math.sin(t * 0.33 + this.phase * 2) * 0.34;
    }
  }
}

/* ------------------------------------------------------------------ Base */

export class Base {
  constructor(scene, quality, seed = 1) {
    this.scene = scene;
    this.quality = quality;
    this.rng = new RNG(`base:${seed}`);
    this.group = new THREE.Group();
    this.group.name = 'base';
    scene.add(this.group);
    this.spinners = [];
    this.beacons = [];
    this.searchlights = [];
    this.floodLamps = [];
    this.floodLights = [];
    this.time = 0;
    this.consoleAnchor = new THREE.Vector3(0, 0, 0);
    this.build();
  }

  build() {
    const rng = this.rng;
    const mats = materials();
    const g = this.group;

    g.add(buildTerrain(this.quality));
    g.add(buildPad());

    // ---- pad markings ------------------------------------------------
    const marks = padMarkingsDecal(1024);
    for (const [x, z, s] of [
      [-64, 3, 34],
      [64, -12, 34],
      [4, -96, 40],
    ]) {
      const d = decalPlane(marks, [s, s]);
      d.position.set(x, 0.07, z);
      g.add(d);
    }

    const roadTex = tireTrackTexture(256).clone();
    roadTex.needsUpdate = true;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 14);

    // ---- service road ------------------------------------------------
    const roadPts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const z = -150 + t * 380;
      const x = 118 + Math.sin(t * 3.1) * 16;
      roadPts.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.06, z));
    }
    g.add(this.buildRibbon(roadPts, 7.5, mats.asphalt, 26));
    const gatePts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = 118 - t * 340;
      const z = 30 + Math.sin(t * 2.2) * 10;
      gatePts.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.055, z));
    }
    g.add(this.buildRibbon(gatePts, 6.5, mats.gravel, 30));

    // ---- shelter -----------------------------------------------------
    const shelter = buildShelter(rng);
    shelter.position.set(28, 0.05, 58);
    shelter.rotation.y = -0.42;
    g.add(shelter);
    this.shelter = shelter;
    // Console sits just inside the open front; the operator stands behind it and
    // looks out through the opening, so the sky stays in view while working.
    this.consoleAnchor = new THREE.Vector3(0, 0.44, -2.2).applyEuler(shelter.rotation).add(shelter.position);
    this.consoleYaw = shelter.rotation.y;

    // ---- radar -------------------------------------------------------
    const radar = buildRadarSite(rng);
    radar.position.set(-26, 0.05, -58);
    radar.rotation.y = 0.35;
    g.add(radar);
    this.radarSite = radar;
    this.spinners.push({ node: radar.userData.turntable, rate: 0 });
    this.spinners.push({ node: radar.userData.dishSpin, rate: 1.15 });
    this.beacons.push(radar.userData.beacon);

    // cable run radar -> shelter
    const cableMat = std({ color: 0x1b1b1d, roughness: 0.85, metalness: 0.1 });
    const cablePts = [
      new THREE.Vector3(-26, 0.9, -58).add(new THREE.Vector3(-3.6, 0, -1)),
      new THREE.Vector3(-14, 0.12, -30),
      new THREE.Vector3(2, 0.12, 10),
      new THREE.Vector3(18, 0.12, 44),
      new THREE.Vector3(26, 0.5, 54),
    ];
    for (let k = 0; k < 3; k++) {
      const pts = cablePts.map((p, i) => p.clone().add(new THREE.Vector3(k * 0.14, 0.02 * k, k * 0.1)));
      const c = new THREE.Mesh(pathTube(pts, 0.045, 5), cableMat);
      c.castShadow = true;
      g.add(c);
    }

    // ---- generators, trucks, masts -----------------------------------
    const genPositions = [
      [42, 0.05, 74, 0.3],
      [50, 0.05, 62, 0.3],
      [-46, 0.05, 70, -1.1],
    ];
    for (const [x, y, z, yaw] of genPositions) {
      const gen = buildGenerator(rng);
      gen.position.set(x, y, z);
      gen.rotation.y = yaw;
      g.add(gen);
      this.spinners.push(...gen.children.filter((c) => c.userData.spin).map((n) => ({ node: n, rate: n.userData.spin, axis: 'z' })));
    }
    // shelter roof fan
    for (const child of shelter.children) {
      if (child.userData.spin) this.spinners.push({ node: child, rate: child.userData.spin, axis: 'z' });
    }

    const truckSpots = [
      [96, 0.05, 44, -1.5, 0],
      [96, 0.05, 26, -1.5, 1],
      [-96, 0.05, 52, 1.4, 2],
      [8, 0.05, 118, 0.1, 0],
    ];
    for (const [x, y, z, yaw, variant] of truckSpots) {
      const t = buildTruck(rng, variant);
      t.position.set(x, terrainHeight(x, z) + y, z);
      t.rotation.y = yaw;
      g.add(t);
      this.floodLamps.push(...(t.userData.headlights || []));
    }

    for (const [x, z, h] of [
      [-104, -16, 14],
      [104, -60, 11],
    ]) {
      const m = buildAntennaMast(rng, h);
      m.position.set(x, terrainHeight(x, z) + 0.05, z);
      g.add(m);
      this.beacons.push(m.userData.beacon);
    }

    // ---- floodlight masts --------------------------------------------
    const floodSpots = [
      [-120, 96],
      [120, 96],
      [-130, -70],
      [128, -96],
      [0, 150],
    ];
    for (const [x, z] of floodSpots) {
      const fm = buildFloodMast(9);
      fm.position.set(x, terrainHeight(x, z) + 0.05, z);
      fm.lookAt(0, 6, 0);
      fm.rotation.x = 0;
      fm.rotation.z = 0;
      g.add(fm);
      this.floodLamps.push(...fm.userData.lamps);
      const sl = new THREE.SpotLight(0xfff0d2, 0, 200, 0.72, 0.6, 1.4);
      sl.position.set(x, terrainHeight(x, z) + 8.8, z);
      sl.target.position.set(x * 0.25, 0, z * 0.25);
      g.add(sl);
      g.add(sl.target);
      this.floodLights.push(sl);
    }

    // ---- barriers ----------------------------------------------------
    const barriers = buildBarrierRun(72, 2, mats);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    let bi = 0;
    const runs = [
      { from: [-88, 96], to: [-20, 96] },
      { from: [22, 100], to: [88, 100] },
      { from: [-104, -96], to: [-104, -34] },
      { from: [100, -108], to: [100, -46] },
    ];
    for (const run of runs) {
      const a = new THREE.Vector3(run.from[0], 0, run.from[1]);
      const b = new THREE.Vector3(run.to[0], 0, run.to[1]);
      const len = a.distanceTo(b);
      const n = Math.floor(len / 2);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (let i = 0; i < n && bi < 72; i++) {
        const p = a.clone().lerp(b, (i + 0.5) / n);
        p.y = terrainHeight(p.x, p.z);
        q.setFromEuler(new THREE.Euler(0, yaw, 0));
        m4.compose(p, q, sc);
        barriers.setMatrixAt(bi++, m4);
      }
    }
    for (; bi < 72; bi++) {
      m4.makeTranslation(0, -50, 0);
      barriers.setMatrixAt(bi, m4);
    }
    barriers.instanceMatrix.needsUpdate = true;
    g.add(barriers);
    this.barrierRuns = runs;

    // ---- equipment cases & clutter -----------------------------------
    const caseGeo = buildCase(rng);
    const cases = new THREE.InstancedMesh(caseGeo, mats.darkMetal, 46);
    const clusters = [
      [30, 70],
      [-58, 34],
      [62, -22],
      [8, -80],
      [44, 84],
    ];
    for (let i = 0; i < 46; i++) {
      const cluster = clusters[i % clusters.length];
      // Small tidy stacks that actually sit on the deck.
      const stack = i % 3;
      const gx = cluster[0] + Math.floor(i / clusters.length / 3) * 1.25 + rng.range(-0.1, 0.1);
      const gz = cluster[1] + (i % 2) * 0.85 + rng.range(-0.1, 0.1);
      const base = Math.max(0.05, terrainHeight(gx, gz));
      q.setFromEuler(new THREE.Euler(0, rng.range(-0.12, 0.12) + (cluster[0] > 0 ? 0.4 : -0.9), 0));
      m4.compose(new THREE.Vector3(gx, base + 0.3 + stack * 0.57, gz), q, sc);
      cases.setMatrixAt(i, m4);
    }
    cases.instanceMatrix.needsUpdate = true;
    cases.castShadow = true;
    cases.receiveShadow = true;
    g.add(cases);

    // Sandbag revetment walls: courses of tightly packed bags in a broken ring
    // around each emplacement, with a gap facing the pad centre.
    const bagGeo = new THREE.SphereGeometry(0.28, 7, 5);
    bagGeo.scale(1.5, 0.62, 0.95);
    const bagMat = std({ color: 0x6f6247, roughness: 1, metalness: 0, flatShading: true });
    const BAG_MAX = 1500;
    const bags = new THREE.InstancedMesh(bagGeo, bagMat, BAG_MAX);
    let bg = 0;
    const bagRng = rng.fork('bags');
    for (const [cx, cz, rad] of [
      [-64, 3, 27],
      [64, -12, 29],
      [4, -96, 32],
    ]) {
      const gapDir = Math.atan2(-cz, -cx);
      const courses = 5;
      for (let row = 0; row < courses; row++) {
        const r = rad + (row % 2) * 0.18;
        const perBag = 0.42;
        const n = Math.floor((Math.PI * 2 * r) / perBag);
        for (let i = 0; i < n && bg < BAG_MAX; i++) {
          const a = (i / n) * Math.PI * 2 + (row % 2) * 0.02;
          let d = Math.abs(a - gapDir) % (Math.PI * 2);
          d = Math.min(d, Math.PI * 2 - d);
          if (d < 0.34) continue;
          // A second gap faces outward so the wall reads as a revetment, not a pen.
          const y = 0.09 + row * 0.17 + bagRng.range(-0.015, 0.015);
          q.setFromEuler(new THREE.Euler(bagRng.range(-0.06, 0.06), a + Math.PI / 2 + bagRng.range(-0.08, 0.08), bagRng.range(-0.05, 0.05)));
          m4.compose(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r), q, sc);
          bags.setMatrixAt(bg++, m4);
        }
      }
    }
    bags.count = bg;
    bags.instanceMatrix.needsUpdate = true;
    bags.castShadow = true;
    bags.receiveShadow = true;
    g.add(bags);

    // ---- desert scatter ----------------------------------------------
    this.buildScatter();

    // ---- perimeter fence --------------------------------------------
    g.add(buildFence(WORLD.fenceRadius, mats));

    // ---- searchlights -----------------------------------------------
    for (const [x, z] of [
      [-86, 122],
      [86, 122],
      [-118, 24],
      [116, -20],
    ]) {
      const sl = new Searchlight(new THREE.Vector3(x, terrainHeight(x, z) + 0.05, z), mats);
      g.add(sl.group);
      this.searchlights.push(sl);
    }

    // ---- wind sock ---------------------------------------------------
    const sockPole = new THREE.Mesh(cylinder(0.07, 0.09, 6, 8), mats.galv);
    sockPole.position.set(-8, 3, 128);
    sockPole.castShadow = true;
    g.add(sockPole);
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.18, 2.2, 12, 1, true),
      std({ color: 0xff7a1e, roughness: 0.9, side: THREE.DoubleSide })
    );
    sock.position.set(-8, 5.7, 129.2);
    sock.rotation.x = Math.PI / 2;
    sock.rotation.z = 0.2;
    g.add(sock);
    this.windSock = sock;
  }

  buildRibbon(points, width, material, uvRepeat = 20) {
    const pos = [];
    const uv = [];
    const idx = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tan = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      tan.subVectors(b, a).normalize();
      side.crossVectors(tan, up).normalize().multiplyScalar(width / 2);
      pos.push(p.x - side.x, p.y, p.z - side.z);
      pos.push(p.x + side.x, p.y, p.z + side.z);
      const t = (i / (points.length - 1)) * uvRepeat;
      uv.push(0, t, 1, t);
      if (i < points.length - 1) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material);
    m.receiveShadow = true;
    return m;
  }

  buildScatter() {
    const rng = this.rng.fork('scatter');
    const mats = materials();
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();

    // rocks
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    const rp = rockGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const n = noise.fbm3(rp.getX(i) * 1.6, rp.getY(i) * 1.6, rp.getZ(i) * 1.6, 3) * 0.34 + 1;
      rp.setXYZ(i, rp.getX(i) * n, rp.getY(i) * n * 0.7, rp.getZ(i) * n);
    }
    rockGeo.computeVertexNormals();
    const rockMat = std({ color: 0x8a8074, roughness: 0.96, metalness: 0.02, flatShading: true });
    const rockCount = 620;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    for (let i = 0; i < rockCount; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = WORLD.baseRadius + 12 + Math.pow(rng.next(), 0.6) * 900;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = rng.range(0.2, 1.5);
      q.setFromEuler(new THREE.Euler(rng.range(0, 0.4), rng.range(0, Math.PI * 2), rng.range(0, 0.4)));
      sc.set(s, s * rng.range(0.5, 1.1), s);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z) + s * 0.15, z), q, sc);
      rocks.setMatrixAt(i, m4);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.group.add(rocks);

    // scrub bushes: crossed alpha cards
    const bladeGeo = new THREE.BufferGeometry();
    {
      const p = [];
      const u = [];
      const idx = [];
      const cards = 3;
      for (let c = 0; c < cards; c++) {
        const a = (c / cards) * Math.PI;
        const dx = Math.cos(a) * 0.55;
        const dz = Math.sin(a) * 0.55;
        const base = c * 4;
        p.push(-dx, 0, -dz, dx, 0, dz, dx, 1.0, dz, -dx, 1.0, -dz);
        u.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      bladeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
      bladeGeo.setIndex(idx);
      bladeGeo.computeVertexNormals();
    }
    const bushTex = softSprite(64, { power: 1.1, colorInner: '150,150,110', colorOuter: '90,96,64' });
    const bushMat = applyAtmosphere(
      new THREE.MeshStandardMaterial({
        map: bushTex,
        alphaMap: bushTex,
        transparent: true,
        alphaTest: 0.32,
        side: THREE.DoubleSide,
        color: 0x8d8a5e,
        roughness: 1,
      })
    );
    const bushCount = 900;
    const bushes = new THREE.InstancedMesh(bladeGeo, bushMat, bushCount);
    for (let i = 0; i < bushCount; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = WORLD.baseRadius + 20 + Math.pow(rng.next(), 0.55) * 1100;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = rng.range(0.5, 1.6);
      q.setFromEuler(new THREE.Euler(0, rng.range(0, Math.PI * 2), 0));
      sc.set(s, s * rng.range(0.5, 1.0), s);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, sc);
      bushes.setMatrixAt(i, m4);
    }
    bushes.instanceMatrix.needsUpdate = true;
    this.group.add(bushes);
  }

  registerColliders(world) {
    world.terrain = terrainHeight;
    world.addFromObject(this.group);
    // pad platform
    world.addCylinder(new THREE.Vector3(0, 0.025, 0), WORLD.baseRadius, 0.05, { walkable: true });
    // barrier runs
    for (const run of this.barrierRuns || []) {
      const a = new THREE.Vector3(run.from[0], 0, run.from[1]);
      const b = new THREE.Vector3(run.to[0], 0, run.to[1]);
      const mid = a.clone().lerp(b, 0.5);
      const len = a.distanceTo(b);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      world.addBox(new THREE.Vector3(mid.x, 0.48, mid.z), new THREE.Vector3(0.35, 0.48, len / 2), yaw, { walkable: false });
    }
    // perimeter fence
    const seg = 48;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = new THREE.Vector3(Math.cos(a0) * WORLD.fenceRadius, 0, Math.sin(a0) * WORLD.fenceRadius);
      const p1 = new THREE.Vector3(Math.cos(a1) * WORLD.fenceRadius, 0, Math.sin(a1) * WORLD.fenceRadius);
      const mid = p0.clone().lerp(p1, 0.5);
      mid.y = terrainHeight(mid.x, mid.z) + 1.2;
      world.addBox(mid, new THREE.Vector3(0.16, 1.2, p0.distanceTo(p1) / 2), Math.atan2(p1.x - p0.x, p1.z - p0.z), { walkable: false });
    }
  }

  setTimeOfDay(id) {
    const night = id === 'night';
    const dusk = id === 'sunset';
    const on = night ? 1 : dusk ? 0.45 : 0;
    for (const l of this.floodLamps) {
      l.material.emissiveIntensity = on * 4.2;
    }
    for (const l of this.floodLights) {
      l.intensity = on * 420;
    }
    if (this.shelter.userData.interiorLight) {
      this.shelter.userData.interiorLight.intensity = night ? 7 : dusk ? 5 : 2.5;
    }
    this.beaconOn = night || dusk;
  }

  setSearchlights(on) {
    for (const s of this.searchlights) s.setEnabled(on);
  }

  update(dt, radarAngle, searchTarget) {
    this.time += dt;
    for (const s of this.spinners) {
      if (s.axis === 'z') s.node.rotation.z += s.rate * dt;
      else s.node.rotation.y += s.rate * dt;
    }
    if (this.radarSite) {
      this.radarSite.userData.turntable.rotation.y = radarAngle;
      const beacon = this.radarSite.userData.beacon;
      const blink = (Math.sin(this.time * 3.4) > 0.4 ? 1 : 0.05) * (this.beaconOn ? 1 : 0.25);
      beacon.material.emissiveIntensity = 2 + blink * 5;
    }
    for (const b of this.beacons) {
      if (!b) continue;
      b.material.emissiveIntensity = 1.5 + (Math.sin(this.time * 2.1) > 0.5 ? 5 : 0.2) * (this.beaconOn ? 1 : 0.3);
    }
    for (const s of this.searchlights) s.update(dt, this.time, searchTarget);
    if (this.windSock) this.windSock.rotation.z = 0.2 + Math.sin(this.time * 1.7) * 0.14;
  }
}
