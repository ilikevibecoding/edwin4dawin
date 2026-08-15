// Designed pine corridor along the two-track — ranks of the same species,
// regular spacing with light jitter, road kept clear. Not a random scatter.
import * as THREE from 'three';
import { cyl, group } from './geo.js';
import { PALETTE } from './palette.js';
import { barkAlbedo } from './textures.js';

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function shade(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pineConeGeo() {
  const geo = new THREE.ConeGeometry(1, 1.12, 7, 1);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(PALETTE.pineHi);
  const mid = new THREE.Color(PALETTE.pine);
  const under = new THREE.Color(PALETTE.pine).multiplyScalar(0.42);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -0.2) c.copy(under);
    else c.copy(mid).lerp(top, THREE.MathUtils.clamp(y * 0.85 + 0.28, 0, 1));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function makeHeroPine(barkMat, crownMat, coneGeo, seed) {
  const g = group('pine-hero');
  const layers = 8;
  const trunkH = 7.1 + (seed % 3) * 0.45;
  g.add(cyl(0.09, 0.2, trunkH, 7, barkMat, 0, trunkH * 0.5, 0));
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2 + seed * 0.4;
    const y = 1.25 + b * 0.55;
    const len = 0.62 + hash(seed + b) * 0.2;
    const br = cyl(0.012, 0.028, len, 5, barkMat, Math.cos(a) * 0.16, y, Math.sin(a) * 0.16);
    br.rotation.z = Math.cos(a) * 1.02;
    br.rotation.x = Math.sin(a) * 1.02;
    g.add(br);
  }
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const y = trunkH * 0.28 + t * trunkH * 0.7;
    const r = (2.35 - t * 1.85) * (0.94 + hash(seed * 3 + i) * 0.1);
    const h = 1.15 + (1 - t) * 0.22;
    const cone = shade(new THREE.Mesh(coneGeo, crownMat));
    cone.position.set((hash(seed + i) - 0.5) * 0.12, y, (hash(seed * 2 + i) - 0.5) * 0.12);
    cone.rotation.y = hash(seed * 7 + i) * Math.PI * 2;
    cone.scale.set(r, h * 0.52, r * 0.96);
    g.add(cone);
  }
  return g;
}

function makeFernCluster(mat, frondGeo) {
  const g = group('fern');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.18;
    const frond = shade(new THREE.Mesh(frondGeo, mat));
    frond.position.set(Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.1);
    frond.rotation.z = Math.cos(a) * 0.95;
    frond.rotation.x = Math.sin(a) * 0.95;
    frond.scale.set(0.55 + (i % 3) * 0.12, 0.85 + (i % 2) * 0.15, 0.42);
    g.add(frond);
  }
  return g;
}

function makeSapling(barkMat, crownMat, coneGeo) {
  const g = group('sapling');
  g.add(cyl(0.025, 0.045, 1.35, 5, barkMat, 0, 0.68, 0));
  for (let i = 0; i < 3; i++) {
    const cone = shade(new THREE.Mesh(coneGeo, crownMat));
    cone.position.y = 0.7 + i * 0.38;
    const r = 0.42 - i * 0.1;
    cone.scale.set(r, 0.48, r);
    cone.rotation.y = i * 0.7;
    g.add(cone);
  }
  return g;
}

function makeStump(barkMat, cutMat) {
  const g = group('stump');
  g.add(cyl(0.16, 0.2, 0.42, 7, barkMat, 0, 0.21, 0));
  const cap = shade(new THREE.Mesh(new THREE.CircleGeometry(0.155, 8), cutMat));
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.43;
  g.add(cap);
  return g;
}

function makeBoulder(mat, seed) {
  const geo = new THREE.IcosahedronGeometry(0.55, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = 0.78 + hash(i * 1.7 + seed * 9.3) * 0.36;
    pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * 0.62, pos.getZ(i) * n);
  }
  geo.computeVertexNormals();
  return shade(new THREE.Mesh(geo, mat));
}

export function createForest(env, { treeCount = 90, wanderAt = () => 0, heightAt = () => 0 } = {}) {
  const root = group('forest');
  const rich = treeCount >= 80;

  const barkMap = barkAlbedo();
  barkMap.repeat.set(1, 3);

  const barkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bark,
    map: barkMap,
    roughness: 0.92,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
  });
  const pineCrownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
  });
  const fernMat = new THREE.MeshStandardMaterial({
    color: PALETTE.moss,
    roughness: 0.88,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.18,
  });
  const fernHiMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pineHi,
    roughness: 0.84,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    roughness: 0.92,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.18,
  });
  const cutMat = new THREE.MeshStandardMaterial({
    color: 0x4a3828,
    roughness: 0.78,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.15,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.9,
    metalness: 0.04,
    envMap: env,
    envMapIntensity: 0.22,
  });
  const rockLo = new THREE.MeshStandardMaterial({
    color: 0x4a453c,
    roughness: 0.94,
    metalness: 0.02,
    envMap: env,
    envMapIntensity: 0.2,
  });

  const coneGeo = pineConeGeo();
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.2, 1, 6);
  const frondGeo = new THREE.ConeGeometry(0.28, 0.52, 5);
  const mossGeo = new THREE.SphereGeometry(1, 5, 4);
  const fernSimpleGeo = new THREE.ConeGeometry(0.3, 0.46, 5);

  const heroProtos = [0, 1, 2].map((s) => makeHeroPine(barkMat, pineCrownMat, coneGeo, s + 1));
  const fernProto = makeFernCluster(fernHiMat, frondGeo);
  const saplingProto = makeSapling(barkMat, pineCrownMat, coneGeo);
  const stumpProto = makeStump(barkMat, cutMat);

  const maxTrunks = 220;
  const maxCrowns = 1760;
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, maxTrunks);
  const crowns = new THREE.InstancedMesh(coneGeo, pineCrownMat, maxCrowns);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let trunkN = 0;
  let crownN = 0;
  const colliders = [];

  function plantPine(x, z, seed, scale) {
    const y0 = heightAt(x, z);
    const trunkH = (6.6 + hash(seed) * 1.4) * scale;
    dummy.position.set(x, y0 + trunkH * 0.5, z);
    dummy.rotation.set(0, hash(seed * 3.1) * Math.PI * 2, 0);
    dummy.scale.set(scale, trunkH, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunkN++, dummy.matrix);

    const layers = 7;
    for (let i = 0; i < layers && crownN < maxCrowns; i++) {
      const t = i / (layers - 1);
      const y = y0 + trunkH * 0.3 + t * trunkH * 0.68;
      const r = (2.2 - t * 1.7) * scale * (0.92 + hash(seed * 5 + i) * 0.12);
      dummy.position.set(
        x + (hash(seed + i * 1.7) - 0.5) * 0.16 * scale,
        y,
        z + (hash(seed * 2 + i) - 0.5) * 0.16 * scale,
      );
      dummy.rotation.set(
        (hash(seed * 4 + i) - 0.5) * 0.06,
        hash(seed * 8 + i) * Math.PI * 2,
        (hash(seed * 6 + i) - 0.5) * 0.06,
      );
      dummy.scale.set(r, (1.05 + (1 - t) * 0.2) * 0.5 * scale, r * 0.96);
      dummy.updateMatrix();
      crowns.setMatrixAt(crownN++, dummy.matrix);
    }

    colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, y0 + 1.7 * scale, z),
        new THREE.Vector3(0.55 * scale, 3.4 * scale, 0.55 * scale),
      ),
    );
  }

  function keepClear(x, z, minAbs = 4.35) {
    const xc = x - wanderAt(z);
    if (Math.abs(xc) < minAbs) return true;
    if (Math.abs(xc) < 5.4 && Math.abs(z) < 8.5) return true;
    return false;
  }

  const ranks = rich
    ? [
        { offset: 5.85, step: 4.05, z0: -76, z1: 76, scale: 1.0, padBoost: 0.55 },
        { offset: 9.35, step: 5.15, z0: -76, z1: 76, scale: 1.12, padBoost: 0.2 },
        { offset: 15.8, step: 6.8, z0: -74, z1: 74, scale: 1.35, padBoost: 0 },
      ]
    : [
        { offset: 5.95, step: 5.1, z0: -76, z1: 76, scale: 1.0, padBoost: 0.55 },
        { offset: 10.1, step: 6.4, z0: -76, z1: 76, scale: 1.18, padBoost: 0.2 },
      ];

  let seed = 11;
  for (const rank of ranks) {
    for (const side of [-1, 1]) {
      for (let z = rank.z0; z <= rank.z1; z += rank.step) {
        const gapWave = (z + 90) / 22;
        const gap = Math.abs(gapWave - Math.round(gapWave)) < 0.08 && ((Math.round(gapWave) + side) & 1) === 0;
        if (gap && rank.offset < 12) continue;
        const pad = Math.abs(z) < 8.5 ? rank.padBoost : 0;
        const along = wanderAt(z);
        const jitterX = (hash(seed * 1.7) - 0.5) * 0.55;
        const jitterZ = (hash(seed * 2.9) - 0.5) * 0.7;
        const x = along + side * (rank.offset + pad) + jitterX;
        const zz = z + jitterZ;
        if (keepClear(x, zz, 4.35)) {
          seed++;
          continue;
        }
        if (trunkN >= maxTrunks) break;
        const scale = rank.scale * (0.92 + 0.1 * Math.sin(z * 0.22 + side) + hash(seed) * 0.08);
        plantPine(x, zz, seed, scale);
        seed++;
      }
    }
  }

  trunks.count = trunkN;
  crowns.count = crownN;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  root.add(trunks);
  root.add(crowns);

  // Hero pines near the parked Jeep — full meshes for the beauty cameras.
  const heroSpots = [
    [6.5, -3.2, 1.05],
    [-6.7, -1.4, 0.98],
    [6.8, 4.8, 1.12],
    [-7.1, 6.2, 1.08],
    [7.4, 10.6, 0.94],
    [-6.9, 12.4, 1.02],
  ];
  for (let i = 0; i < heroSpots.length; i++) {
    const [lx, z, s] = heroSpots[i];
    const x = wanderAt(z) + lx;
    const proto = heroProtos[i % heroProtos.length].clone();
    proto.position.set(x, heightAt(x, z), z);
    proto.rotation.y = hash(i * 9.1) * Math.PI * 2;
    proto.scale.setScalar(s);
    root.add(proto);
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 1.7 * s, z),
        new THREE.Vector3(0.55 * s, 3.4 * s, 0.55 * s),
      ),
    );
  }

  const fernCount = rich ? 80 : 48;
  const ferns = new THREE.InstancedMesh(fernSimpleGeo, fernMat, fernCount);
  ferns.castShadow = true;
  ferns.receiveShadow = true;
  let fernPlaced = 0;
  for (let k = 0; fernPlaced < fernCount; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const z = -72 + (k * 1.85) % 144;
    const x = wanderAt(z) + side * (4.25 + hash(k * 3.3) * 1.15);
    if (Math.abs(x - wanderAt(z)) < 3.9 || (Math.abs(z) < 6 && Math.abs(x) < 5.2)) continue;
    dummy.position.set(x, heightAt(x, z) + 0.18, z);
    dummy.rotation.set((hash(k * 3.2) - 0.5) * 0.2, hash(k * 13.1) * Math.PI * 2, (hash(k * 4.8) - 0.5) * 0.2);
    const fs = 0.72 + hash(k * 6.6) * 0.4;
    dummy.scale.set(fs, 0.68 + hash(k * 2.2) * 0.35, fs);
    dummy.updateMatrix();
    ferns.setMatrixAt(fernPlaced, dummy.matrix);
    fernPlaced++;
  }
  ferns.count = fernPlaced;
  ferns.instanceMatrix.needsUpdate = true;
  root.add(ferns);

  const mossCount = rich ? 36 : 22;
  const moss = new THREE.InstancedMesh(mossGeo, mossMat, mossCount);
  moss.castShadow = true;
  moss.receiveShadow = true;
  let mossPlaced = 0;
  for (let k = 0; mossPlaced < mossCount; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const z = -60 + k * 3.4;
    const x = wanderAt(z) + side * (4.1 + hash(k * 4.4) * 1.4);
    if (Math.abs(z) < 7 && Math.abs(x) < 5) continue;
    dummy.position.set(x, heightAt(x, z) + 0.07, z);
    dummy.rotation.set(0, hash(k * 5.5) * Math.PI * 2, 0);
    const ms = 0.35 + hash(k * 3.3) * 0.32;
    dummy.scale.set(ms, ms * 0.28, ms * 0.85);
    dummy.updateMatrix();
    moss.setMatrixAt(mossPlaced, dummy.matrix);
    mossPlaced++;
  }
  moss.count = mossPlaced;
  moss.instanceMatrix.needsUpdate = true;
  root.add(moss);

  for (let k = 0; k < 8; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const z = -9 + k * 2.6;
    const x = wanderAt(z) + side * (4.35 + hash(k * 2.2) * 0.45);
    const f = fernProto.clone();
    f.position.set(x, heightAt(x, z), z);
    f.rotation.y = hash(k * 9.9) * Math.PI * 2;
    f.scale.setScalar(0.9 + hash(k) * 0.25);
    root.add(f);
  }

  for (let k = 0; k < (rich ? 16 : 10); k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const z = -48 + k * 6.2;
    const x = wanderAt(z) + side * (4.7 + hash(k * 2.8) * 0.8);
    if (Math.abs(z) < 8) continue;
    const sap = saplingProto.clone();
    sap.position.set(x, heightAt(x, z), z);
    sap.rotation.y = hash(k * 10.1) * Math.PI * 2;
    sap.scale.setScalar(0.75 + hash(k * 3.3) * 0.3);
    root.add(sap);
  }

  for (let k = 0; k < 8; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const z = -36 + k * 10.5;
    const x = wanderAt(z) + side * 4.7;
    if (Math.abs(z) < 8) continue;
    const st = stumpProto.clone();
    st.position.set(x, heightAt(x, z), z);
    st.rotation.y = hash(k * 8.8) * Math.PI * 2;
    st.scale.setScalar(0.85 + hash(k) * 0.25);
    root.add(st);
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, heightAt(x, z) + 0.25, z), new THREE.Vector3(0.4, 0.5, 0.4)),
    );
  }

  const logA = cyl(0.15, 0.13, 3.4, 8, barkMat, 4.85, heightAt(4.85, 3.1) + 0.15, 3.1, 0, 0.55, Math.PI / 2);
  logA.rotation.y = 0.38;
  root.add(logA);
  colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4.85, 0.2, 3.1), new THREE.Vector3(1.4, 0.45, 3.2)));

  const logB = cyl(0.13, 0.11, 2.8, 8, barkMat, wanderAt(22) - 5.05, heightAt(wanderAt(22) - 5.05, 22) + 0.13, 22, 0, -0.4, Math.PI / 2);
  logB.rotation.y = -0.4;
  root.add(logB);

  const cluster = [
    [5.15, 5.55, 0.95, 0],
    [5.55, 6.15, 0.62, 1],
    [4.75, 6.35, 0.48, 2],
    [5.7, 5.2, 0.4, 3],
  ];
  for (const [x, z, s, seedB] of cluster) {
    const b = makeBoulder(seedB % 2 === 0 ? rockMat : rockLo, seedB + 2);
    b.position.set(x, heightAt(x, z) + 0.12 * s, z);
    b.scale.setScalar(s);
    b.rotation.set(hash(seedB * 2.2) * 0.6, hash(seedB * 5.5) * Math.PI * 2, hash(seedB * 3.3) * 0.4);
    root.add(b);
  }
  colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5.25, 0.35, 5.8), new THREE.Vector3(1.6, 0.8, 1.6)));

  return { mesh: root, colliders };
}
