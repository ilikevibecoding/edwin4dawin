/**
 * Two-track forest road.
 * Added: mesh-sculpted wheel ruts + raised grassy median (not a decal);
 * soft berm shoulders into the forest floor; irregular instanced rocks and
 * a few large verge boulders; 5 sky-reflecting puddles (several in the ruts);
 * exposed roots and a timber water-bar; dirt→grass vertex colors with no hard edge.
 */
import * as THREE from 'three';
import { cyl, group } from './geo.js';
import { PALETTE } from './palette.js';
import { barkAlbedo, dirtAlbedo, dirtNormal, dirtRough, grassAlbedo } from './textures.js';

const TRACK = 0.82;

function saturate(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function fade(t) {
  t = saturate(t);
  return t * t * (3 - 2 * t);
}

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function n2(x, z) {
  return (
    Math.sin(x * 1.73 + z * 0.91) * 0.42 +
    Math.sin(x * 0.39 - z * 1.27 + 1.7) * 0.35 +
    Math.sin(x * 2.81 + z * 2.14 + 0.6) * 0.23
  );
}

export function wanderAt(z) {
  return 0.58 * Math.sin(z * 0.078) + 0.2 * Math.sin(z * 0.21);
}

function heightAt(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  // Keep the Jeep pad nearly planar: |x|<2, |z|<3. Gentle crown only.
  const pad = fade(1 - saturate((ax - 1.55) / 1.35)) * fade(1 - saturate((az - 2.45) / 1.4));

  const xc = x - wanderAt(z);
  const roadW = 2.62 + 0.2 * Math.sin(z * 0.21 + 0.4);
  const rw = roadW * 1.12;
  const roadMask = Math.exp(-((xc / rw) * (xc / rw)));

  const berm = fade((ax - 2.15) / 1.15) * fade((4.6 - ax) / 1.35);
  const bermH = berm * 0.1 * (1 - pad);

  const forest =
    (Math.sin(z * 0.062) * 0.12 +
      Math.sin(x * 0.11 + z * 0.047) * 0.08 +
      Math.sin(x * 0.27 - z * 0.16) * 0.04) *
    (1 - roadMask * 0.9) *
    (1 - pad);

  const rutW = 0.34 + 0.035 * Math.sin(z * 0.31);
  const rutL = Math.exp(-(((xc - TRACK) / rutW) * ((xc - TRACK) / rutW)));
  const rutR = Math.exp(-(((xc + TRACK) / rutW) * ((xc + TRACK) / rutW)));
  const rutAmt = rutL + rutR;
  // ~3 cm under the axles so tires sit in dirt; deeper down the trail.
  const rutDepth = 0.03 + 0.05 * (1 - pad) * (0.55 + 0.45 * Math.abs(Math.sin(z * 0.13 + 0.3)));
  const ruts = rutAmt * rutDepth;

  const midW = 0.3 + 0.05 * Math.sin(z * 0.29);
  const median = Math.exp(-((xc / midW) * (xc / midW)));
  const medianH = median * (0.022 + 0.038 * (1 - pad)) * (1 - rutAmt * 0.4);

  const crown = Math.exp(-((xc / 2.15) * (xc / 2.15))) * 0.01 * (1 - pad * 0.35);
  const micro = n2(x, z) * 0.016 * (1 - pad) * (0.35 + 0.65 * (1 - roadMask));

  return forest + bermH + crown + medianH - ruts + micro;
}

const PUDDLES = [
  { x: 0.86, z: 12.4, rx: 0.38, rz: 0.72 },
  { x: -0.74, z: 9.55, rx: 0.32, rz: 0.55 },
  { x: 0.58, z: 6.7, rx: 0.55, rz: 1.05 },
  { x: 0.88, z: 4.05, rx: 0.4, rz: 0.64 },
  { x: -0.9, z: -7.15, rx: 0.36, rz: 0.82 },
  { x: 0.72, z: 28.4, rx: 0.34, rz: 0.7 },
  { x: -0.8, z: 41.2, rx: 0.3, rz: 0.58 },
  { x: 0.64, z: -22.6, rx: 0.36, rz: 0.66 },
  { x: -0.7, z: -38.5, rx: 0.32, rz: 0.6 },
  { x: 0.78, z: 58.8, rx: 0.3, rz: 0.52 },
  { x: -0.68, z: -54.2, rx: 0.28, rz: 0.5 },
];

function joinRanges(ranges) {
  const out = [];
  for (let r = 0; r < ranges.length; r++) {
    const [a, b, n] = ranges[r];
    const start = r === 0 ? 0 : 1;
    for (let i = start; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  }
  return out;
}

function makeTerrain(xs, zs) {
  const nx = xs.length;
  const nz = zs.length;
  const positions = new Float32Array(nx * nz * 3);
  const uvs = new Float32Array(nx * nz * 2);
  const index = new Uint32Array((nx - 1) * (nz - 1) * 6);
  const x0 = xs[0];
  const z0 = zs[0];
  const xSpan = xs[nx - 1] - x0;
  const zSpan = zs[nz - 1] - z0;
  let p = 0;
  let u = 0;
  for (let iz = 0; iz < nz; iz++) {
    const z = zs[iz];
    for (let ix = 0; ix < nx; ix++) {
      const x = xs[ix];
      positions[p++] = x;
      positions[p++] = heightAt(x, z);
      positions[p++] = z;
      uvs[u++] = (x - x0) / xSpan;
      uvs[u++] = (z - z0) / zSpan;
    }
  }
  let t = 0;
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      index[t++] = a;
      index[t++] = b;
      index[t++] = d;
      index[t++] = a;
      index[t++] = d;
      index[t++] = c;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
}

function paintRoadColors(geo) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cDirt = new THREE.Color(PALETTE.dirtDry);
  const cWet = new THREE.Color(PALETTE.dirtWet);
  const cGrass = new THREE.Color(PALETTE.grass);
  const cMoss = new THREE.Color(PALETTE.moss);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ax = Math.abs(x);
    const xc = x - wanderAt(z);
    const roadW = 2.62 + 0.2 * Math.sin(z * 0.21 + 0.4);
    const roadMask = Math.exp(-((xc / (roadW * 1.18)) * (xc / (roadW * 1.18))));
    const rutW = 0.36 + 0.04 * Math.sin(z * 0.31);
    const rutL = Math.exp(-(((xc - TRACK) / rutW) * ((xc - TRACK) / rutW)));
    const rutR = Math.exp(-(((xc + TRACK) / rutW) * ((xc + TRACK) / rutW)));
    const rutAmt = saturate(rutL + rutR);
    const median = Math.exp(-((xc / 0.38) * (xc / 0.38)));
    const mottling = n2(x * 0.55, z * 0.55);

    c.copy(cGrass).lerp(cMoss, saturate(0.35 + mottling * 0.25));
    c.lerp(cDirt, fade((roadMask - 0.18) / 0.55));
    c.lerp(cGrass, saturate(median * 0.92) * (1 - rutAmt * 0.85));
    c.lerp(cWet, fade(rutAmt * 1.05) * 0.78);
    let puddle = 0;
    for (let p = 0; p < PUDDLES.length; p++) {
      const pud = PUDDLES[p];
      const dx = (x - pud.x) / (pud.rx * 1.45);
      const dz = (z - pud.z) / (pud.rz * 1.45);
      const d = dx * dx + dz * dz;
      if (d < 1) puddle = Math.max(puddle, 1 - d);
    }
    c.lerp(cWet, puddle * 0.7);
    const shade = 1 + mottling * 0.07 - fade((ax - 3.2) / 4.0) * 0.04;
    colors[i * 3] = c.r * shade;
    colors[i * 3 + 1] = c.g * shade;
    colors[i * 3 + 2] = c.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function makeRockGeo(seed, detail) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 0.7 + hash(x * 8.3 + y * 4.1 + z * 6.9 + seed) * 0.48;
    pos.setXYZ(i, x * k, y * k * 0.58, z * k * (0.85 + hash(seed + i) * 0.3));
  }
  geo.computeVertexNormals();
  return geo;
}

function mossyRockGeo(seed, detail) {
  const geo = makeRockGeo(seed, detail);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const rock = new THREE.Color(PALETTE.rock);
  const moss = new THREE.Color(PALETTE.moss);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    c.copy(rock).lerp(moss, saturate(y * 0.85 + 0.15));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

function addRoot(parent, mat, pts, radius) {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z, lift]) => new THREE.Vector3(x, heightAt(x, z) + (lift ?? 0.028), z)),
  );
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 5, false), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

export function createRoad(env) {
  const g = group('ground');

  const dirtMap = dirtAlbedo();
  dirtMap.repeat.set(6.7, 32);
  dirtMap.offset.set(0.21, 0.08);
  const dirtN = dirtNormal();
  dirtN.repeat.set(6.7, 32);
  dirtN.offset.set(0.21, 0.08);
  const dirtR = dirtRough();
  dirtR.repeat.set(6.7, 32);
  dirtR.offset.set(0.21, 0.08);
  const grassMap = grassAlbedo();
  grassMap.repeat.set(1.4, 40);

  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: dirtMap,
    normalMap: dirtN,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: dirtR,
    roughness: 0.92,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.24,
    vertexColors: true,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    map: grassMap,
    roughness: 0.94,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const tuftMat = new THREE.MeshStandardMaterial({
    color: PALETTE.moss,
    roughness: 0.9,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.18,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x3a342c,
    roughness: 0.9,
    metalness: 0.06,
    envMap: env,
    envMapIntensity: 0.22,
  });
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x3a342c,
    roughness: 0.92,
    metalness: 0.05,
    envMap: env,
    envMapIntensity: 0.2,
    vertexColors: true,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bark,
    map: barkAlbedo(),
    roughness: 0.9,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.22,
  });
  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.dirtWet,
    roughness: 0.07,
    metalness: 0.14,
    envMap: env,
    envMapIntensity: 1.65,
  });
  const puddleMatSky = new THREE.MeshPhysicalMaterial({
    color: PALETTE.dirtWet,
    roughness: 0.05,
    metalness: 0.1,
    envMap: env,
    envMapIntensity: 1.85,
  });

  // Dense X across the corridor so the two ruts and median actually sculpt.
  const xs = joinRanges([
    [-23, -4, 12],
    [-4, 4, 51],
    [4, 23, 12],
  ]);
  const zs = joinRanges([
    [-80, -20, 30],
    [-20, 20, 92],
    [20, 80, 30],
  ]);
  const geo = makeTerrain(xs, zs);
  paintRoadColors(geo);
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(geo, dirtMat);
  ground.receiveShadow = true;
  ground.castShadow = false;
  g.add(ground);

  // Grass ribbon draped on the raised median — follows heightAt, not a flat card.
  const strip = new THREE.PlaneGeometry(0.58, 152, 4, 96);
  strip.rotateX(-Math.PI / 2);
  const sPos = strip.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const lx = sPos.getX(i);
    const z = sPos.getZ(i);
    const x = lx + wanderAt(z);
    const edge = Math.abs(lx) / 0.29;
    sPos.setX(i, x);
    sPos.setY(i, heightAt(x, z) + 0.012 + (1 - edge) * 0.006);
  }
  strip.computeVertexNormals();
  const stripMesh = new THREE.Mesh(strip, grassMat);
  stripMesh.receiveShadow = true;
  g.add(stripMesh);

  const dummy = new THREE.Object3D();

  // Center-strip and verge tufts for volume in the road view.
  const tuftGeo = new THREE.ConeGeometry(0.075, 0.17, 5);
  tuftGeo.translate(0, 0.08, 0);
  const tuftCount = 72;
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
  tufts.castShadow = true;
  tufts.receiveShadow = true;
  let placed = 0;
  for (let i = 0; placed < tuftCount && i < 220; i++) {
    const u = hash(i * 17.3 + 2.1);
    const v = hash(i * 9.9 + 4.4);
    const alongCenter = u < 0.62;
    const z = -70 + v * 140;
    const x = alongCenter
      ? wanderAt(z) + (hash(i * 3.7) - 0.5) * 0.28
      : wanderAt(z) + (u < 0.81 ? 1 : -1) * (2.45 + hash(i * 5.1) * 1.6);
    if (Math.abs(x) < 1.5 && Math.abs(z) < 2.7) continue;
    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.set(0, hash(i * 11.2) * Math.PI * 2, (hash(i * 2.2) - 0.5) * 0.25);
    const s = 0.7 + hash(i * 6.6) * 0.7;
    dummy.scale.set(s * (0.8 + hash(i) * 0.4), s, s * (0.8 + hash(i + 1) * 0.4));
    dummy.updateMatrix();
    tufts.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  tufts.count = placed;
  g.add(tufts);

  // Irregular verge rocks — two prototypes so it does not read as one stamp.
  const pebbleGeo = makeRockGeo(1.7, 0);
  const chunkGeo = makeRockGeo(4.2, 1);
  const pebbleCount = 36;
  const chunkCount = 22;
  const pebbles = new THREE.InstancedMesh(pebbleGeo, rockMat, pebbleCount);
  const chunks = new THREE.InstancedMesh(chunkGeo, rockMat, chunkCount);
  pebbles.castShadow = true;
  pebbles.receiveShadow = true;
  chunks.castShadow = true;
  chunks.receiveShadow = true;

  function placeRocks(mesh, count, seed, scale0, scale1, minAbsX) {
    let n = 0;
    for (let i = 0; n < count && i < count * 7; i++) {
      const side = hash(seed + i * 3.1) > 0.5 ? 1 : -1;
      const z = -70 + hash(seed + i * 8.8) * 140;
      const x = side * (minAbsX + hash(seed + i * 5.5) * 4.2);
      if (Math.abs(x) < 2.35 && Math.abs(z) < 3.2) continue;
      if (Math.abs(x) < 2.15) continue;
      const s = scale0 + hash(seed + i * 2.2) * (scale1 - scale0);
      dummy.position.set(x, heightAt(x, z) + s * 0.22, z);
      dummy.rotation.set(hash(i * 1.3) * 1.4, hash(i * 2.7) * 6.2, hash(i * 0.9) * 1.1);
      dummy.scale.set(s * (0.75 + hash(i * 4.4) * 0.55), s * (0.45 + hash(i * 3.3) * 0.4), s * (0.8 + hash(i * 1.8) * 0.5));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      n++;
    }
    mesh.count = n;
  }
  placeRocks(pebbles, pebbleCount, 11, 0.1, 0.22, 2.35);
  placeRocks(chunks, chunkCount, 29, 0.2, 0.42, 2.7);
  g.add(pebbles);
  g.add(chunks);

  // Half-buried cobbles in the ruts, kept off the Jeep pad.
  const cobbleCount = 10;
  const cobbles = new THREE.InstancedMesh(pebbleGeo, rockMat, cobbleCount);
  cobbles.castShadow = true;
  cobbles.receiveShadow = true;
  for (let i = 0; i < cobbleCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = (i < 6 ? 3.8 : -8) + hash(i * 7.7) * 11;
    const x = side * (TRACK + (hash(i * 4.1) - 0.5) * 0.28) + wanderAt(z);
    const s = 0.07 + hash(i * 2.9) * 0.06;
    dummy.position.set(x, heightAt(x, z) + s * 0.18, z);
    dummy.rotation.set(hash(i) * 2, hash(i * 3) * 5, hash(i * 2) * 2);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    cobbles.setMatrixAt(i, dummy.matrix);
  }
  g.add(cobbles);

  // Larger verge boulders framing the trail the road camera sees.
  const boulderSpots = [
    [3.95, 11.7, 0.92, 2.2],
    [-4.35, 8.15, 1.12, 5.1],
    [4.55, 5.05, 0.74, 8.4],
    [-3.85, 14.35, 0.86, 3.7],
    [4.15, 32.4, 0.88, 6.2],
    [-4.25, -26.8, 0.8, 4.4],
    [4.45, 54.2, 0.7, 7.1],
    [-4.05, -48.6, 0.76, 3.2],
  ];
  for (const [x, z, s, seed] of boulderSpots) {
    const boulder = new THREE.Mesh(mossyRockGeo(seed, 1), boulderMat);
    boulder.position.set(x, heightAt(x, z) + s * 0.28, z);
    boulder.rotation.set(0.2, seed, 0.15);
    boulder.scale.set(s * 1.15, s * 0.82, s * 1.05);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    g.add(boulder);
  }

  // Sky-catching puddles, slightly above the dirt to avoid z-fight.
  PUDDLES.forEach((pud, i) => {
    const segs = 20;
    const pgeo = new THREE.CircleGeometry(1, segs);
    pgeo.rotateX(-Math.PI / 2);
    const pp = pgeo.attributes.position;
    for (let v = 0; v < pp.count; v++) {
      const ox = pp.getX(v);
      const oz = pp.getZ(v);
      const ang = Math.atan2(oz, ox);
      const wobble = 1 + 0.14 * Math.sin(ang * 3.0 + pud.x * 2) + 0.08 * Math.sin(ang * 5.0 - pud.z);
      pp.setX(v, ox * wobble);
      pp.setZ(v, oz * wobble);
    }
    pgeo.computeVertexNormals();
    const mesh = new THREE.Mesh(pgeo, i % 2 === 0 ? puddleMat : puddleMatSky);
    const px = pud.x + wanderAt(pud.z);
    mesh.position.set(px, heightAt(px, pud.z) + 0.025, pud.z);
    mesh.scale.set(pud.rx, 1, pud.rz);
    mesh.receiveShadow = true;
    g.add(mesh);
  });

  // Timber water-bar across the approach — reads in the z=16.5 road view.
  const barZ = 8.55;
  const bar = cyl(0.09, 0.075, 4.15, 8, barkMat, wanderAt(barZ) * 0.4, heightAt(0, barZ) + 0.07, barZ, 0.04, 0.16, Math.PI / 2);
  g.add(bar);

  // Exposed roots snaking from the verge onto the trail.
  addRoot(
    g,
    barkMat,
    [
      [2.55, 12.55, 0.02],
      [1.7, 12.85, 0.03],
      [0.95, 13.15, 0.035],
      [0.25, 13.4, 0.02],
    ],
    0.032,
  );
  addRoot(
    g,
    barkMat,
    [
      [-2.7, 7.15, 0.02],
      [-1.85, 7.45, 0.03],
      [-1.15, 7.85, 0.028],
      [-0.45, 8.15, 0.018],
    ],
    0.028,
  );
  addRoot(
    g,
    barkMat,
    [
      [2.4, 3.55, 0.02],
      [1.85, 3.85, 0.03],
      [1.25, 4.2, 0.022],
    ],
    0.024,
  );
  addRoot(
    g,
    barkMat,
    [
      [-2.5, -4.4, 0.02],
      [-1.7, -4.05, 0.03],
      [-0.9, -3.7, 0.02],
    ],
    0.026,
  );

  // Extra water-bars so the long trail keeps a rhythm.
  for (const wz of [26.2, -18.4, 48.6, -42.2]) {
    const bar = cyl(0.09, 0.075, 4.15, 8, barkMat, wanderAt(wz) * 0.4, heightAt(0, wz) + 0.07, wz, 0.04, 0.16, Math.PI / 2);
    g.add(bar);
  }

  return {
    mesh: g,
    heightAt,
    wanderAt,
    colliders: [],
  };
}
