// Forest stand: layered pines with shaded undersides, clustered deciduous
// canopies + fork branches, yaw/scale/lean jitter (no grid), ferns/saplings/
// stumps, two fallen logs, and a boulder cluster on the clearing edge.
import * as THREE from 'three';
import { cyl, group } from './geo.js';
import { PALETTE } from './palette.js';
import { barkAlbedo, leafAlbedo } from './textures.js';

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function shade(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function inRoadOrClearing(x, z) {
  if (Math.abs(x) < 4.4 && Math.abs(z) < 18) return true;
  if (Math.abs(x) < 3.8) return true;
  return false;
}

function inJeepPad(x, z) {
  return Math.abs(x) < 2.6 && Math.abs(z) < 9;
}

function shadedConeGeo(segments = 7) {
  const geo = new THREE.ConeGeometry(1, 1, segments, 1, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(PALETTE.pineHi);
  const mid = new THREE.Color(PALETTE.pine);
  const under = new THREE.Color(PALETTE.pine).multiplyScalar(0.55);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -0.48) {
      c.copy(under);
    } else {
      const t = THREE.MathUtils.clamp(y + 0.5, 0, 1);
      c.copy(mid).lerp(top, t * t);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function makePine(barkMat, crownMat, underMat, coneGeo, seed) {
  const g = group('pine');
  const layers = 7 + (seed % 3);
  const trunkH = 6.4 + (seed % 3) * 0.85;
  const slim = 0.82 + (seed % 2) * 0.22;
  g.add(cyl(0.07 + seed * 0.012, 0.2 + seed * 0.02, trunkH, 7, barkMat, 0, trunkH * 0.5, 0));

  // A couple of bare lower limbs so the trunk is not a naked stick.
  for (let b = 0; b < 2; b++) {
    const a = hash(seed * 4.1 + b * 8.2) * Math.PI * 2;
    const y = 1.15 + b * 0.7 + hash(seed + b) * 0.25;
    const len = 0.55 + hash(seed * 2 + b) * 0.35;
    const br = cyl(0.012, 0.03, len, 5, barkMat, Math.cos(a) * 0.16, y, Math.sin(a) * 0.16);
    br.rotation.z = Math.cos(a) * 1.05;
    br.rotation.x = Math.sin(a) * 1.05;
    g.add(br);
  }

  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const y = trunkH * 0.26 + t * trunkH * 0.74;
    const rJitter = 0.82 + hash(seed * 9.1 + i * 3.7) * 0.34;
    const hJitter = 0.88 + hash(seed * 5.5 + i * 6.1) * 0.28;
    const r = (2.55 - t * 2.05) * slim * rJitter;
    const h = (1.28 + (1 - t) * 0.28) * hJitter;
    const cone = shade(new THREE.Mesh(coneGeo, t < 0.28 ? underMat : crownMat));
    cone.position.set(
      (hash(seed * 2.2 + i * 1.7) - 0.5) * 0.28,
      y,
      (hash(seed * 4.4 + i * 2.3) - 0.5) * 0.28,
    );
    cone.rotation.y = hash(seed * 11 + i * 9.1) * Math.PI * 2;
    cone.rotation.z = (hash(seed * 6.6 + i) - 0.5) * 0.1;
    cone.rotation.x = (hash(seed * 3.3 + i * 4) - 0.5) * 0.08;
    cone.scale.set(r, h, r * (0.92 + hash(i + seed) * 0.12));
    g.add(cone);
  }
  return g;
}

function makeDeciduous(barkMat, leafHi, leafLo, puffGeo, seed) {
  const g = group('decid');
  const trunkH = 4.5 + (seed % 2) * 0.55;
  g.add(cyl(0.07, 0.17, trunkH, 7, barkMat, 0, trunkH * 0.5, 0));

  const branchCount = 3;
  for (let i = 0; i < branchCount; i++) {
    const a = (i / branchCount) * Math.PI * 2 + seed * 0.4;
    const y = 2.7 + hash(seed * 3 + i) * 1.1;
    const len = 1.35 + hash(seed + i * 2.2) * 0.45;
    const elev = 0.55 + hash(seed * 2 + i) * 0.28;
    const ox = Math.cos(a) * 0.22;
    const oz = Math.sin(a) * 0.22;
    const br = cyl(0.02, 0.048, len, 5, barkMat, ox, y, oz);
    br.rotation.z = Math.cos(a) * elev;
    br.rotation.x = Math.sin(a) * elev;
    g.add(br);

    const tipX = ox + Math.cos(a) * Math.sin(elev) * len * 0.68;
    const tipY = y + Math.cos(elev) * len * 0.52;
    const tipZ = oz + Math.sin(a) * Math.sin(elev) * len * 0.68;
    for (let k = 0; k < 3; k++) {
      const puff = shade(new THREE.Mesh(puffGeo, k === 0 ? leafHi : leafLo));
      const pr = 0.52 + hash(seed * 7 + i * 5 + k) * 0.38;
      puff.position.set(
        tipX + (hash(i * 3.1 + k + seed) - 0.5) * 0.7,
        tipY + hash(i * 2.2 + k) * 0.38,
        tipZ + (hash(i * 4.7 + k + seed) - 0.5) * 0.7,
      );
      puff.scale.set(pr, pr * (0.55 + hash(k + seed) * 0.18), pr);
      g.add(puff);
    }
  }

  // Tight central canopy so it is not a single meatball.
  for (let i = 0; i < 5; i++) {
    const a = hash(seed * 8.8 + i * 3.1) * Math.PI * 2;
    const r = 0.85 + hash(seed * 2.2 + i * 7.7) * 0.45;
    const puff = shade(new THREE.Mesh(puffGeo, i < 2 ? leafLo : leafHi));
    puff.position.set(
      Math.cos(a) * (0.35 + hash(i * 1.4 + seed) * 0.45),
      trunkH + 0.15 + hash(i * 2.2 + seed) * 0.7,
      Math.sin(a) * (0.35 + hash(i * 5.1 + seed) * 0.45),
    );
    puff.scale.set(r, r * 0.62, r);
    g.add(puff);
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

function plantScatter(i, { r0, r1, zStretch = 1.12 }) {
  const a = hash(i * 19.7) * Math.PI * 2;
  const r = r0 + hash(i * 31.3) * (r1 - r0);
  const x = Math.cos(a) * r + (hash(i * 5.5) - 0.5) * 2.4;
  const z = Math.sin(a) * r * zStretch + (hash(i * 9.9) - 0.5) * 2.6;
  return [x, z];
}

function plantClearingWall(i) {
  const side = hash(i * 7.1) > 0.5 ? 1 : -1;
  const z = (hash(i * 13.7) - 0.5) * 46;
  const x = side * (4.55 + hash(i * 21.3) * 14) + (hash(i * 5.5) - 0.5) * 1.6;
  return [x, z + (hash(i * 9.9) - 0.5) * 1.8];
}

export function createForest(env, { treeCount = 90 } = {}) {
  const root = group('forest');

  const barkMap = barkAlbedo();
  barkMap.repeat.set(1, 3);
  const leafMap = leafAlbedo();

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
  const pineUnderMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pine,
    roughness: 0.9,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.16,
  });
  const decidHi = new THREE.MeshStandardMaterial({
    color: PALETTE.pineHi,
    map: leafMap,
    roughness: 0.82,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
  });
  const decidLo = new THREE.MeshStandardMaterial({
    color: PALETTE.pine,
    map: leafMap,
    roughness: 0.88,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.18,
  });
  const fernMat = new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    roughness: 0.86,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
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

  const coneGeo = shadedConeGeo(7);
  const puffGeo = new THREE.SphereGeometry(1, 6, 5);
  const frondGeo = new THREE.ConeGeometry(0.28, 0.52, 5);
  const mossGeo = new THREE.SphereGeometry(1, 5, 4);
  const fernSimpleGeo = new THREE.ConeGeometry(0.3, 0.46, 5);

  const pineProtos = [0, 1, 2].map((s) => makePine(barkMat, pineCrownMat, pineUnderMat, coneGeo, s + 1));
  const decidProtos = [0, 1].map((s) => makeDeciduous(barkMat, decidHi, decidLo, puffGeo, s + 3));
  const fernProto = makeFernCluster(fernHiMat, frondGeo);
  const saplingProto = makeSapling(barkMat, pineCrownMat, coneGeo);
  const stumpProto = makeStump(barkMat, cutMat);

  const colliders = [];
  const spots = [];
  let placed = 0;
  let i = 0;
  while (placed < treeCount && i < treeCount * 8) {
    i++;
    const [x, z] = hash(i * 4.4) > 0.42 ? plantClearingWall(i) : plantScatter(i, { r0: 8, r1: 42 });
    if (inRoadOrClearing(x, z)) continue;
    let crowded = false;
    for (let s = 0; s < spots.length; s++) {
      const dx = spots[s][0] - x;
      const dz = spots[s][1] - z;
      if (dx * dx + dz * dz < 2.4) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    const pine = hash(i * 3.3) > 0.22;
    const proto = pine
      ? pineProtos[Math.floor(hash(i * 6.6) * pineProtos.length)]
      : decidProtos[Math.floor(hash(i * 8.1) * decidProtos.length)];
    const t = proto.clone();
    const s = 0.7 + hash(i * 8.8) * 0.68;
    t.scale.setScalar(s);
    t.position.set(x, 0, z);
    t.rotation.y = hash(i * 11.1) * Math.PI * 2;
    t.rotation.x = (hash(i * 15.3) - 0.5) * 0.1;
    t.rotation.z = (hash(i * 17.9) - 0.5) * 0.08;
    root.add(t);
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 1.7 * s, z),
        new THREE.Vector3(0.55 * s, 3.4 * s, 0.55 * s),
      ),
    );
    spots.push([x, z]);
    placed++;
  }

  // Instanced ferns + moss cushions — one draw each, values lifted vs dirt.
  const fernCount = 56;
  const ferns = new THREE.InstancedMesh(fernSimpleGeo, fernMat, fernCount);
  ferns.castShadow = true;
  ferns.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let fernPlaced = 0;
  for (let k = 0; fernPlaced < fernCount && k < fernCount * 5; k++) {
    const [x, z] = hash(k * 2.1) > 0.35
      ? [ (hash(k * 7.7) > 0.5 ? 1 : -1) * (3.1 + hash(k * 11.3) * 8), (hash(k * 19.1) - 0.5) * 36 ]
      : plantScatter(k + 200, { r0: 3.4, r1: 24, zStretch: 1 });
    if (inJeepPad(x, z) || Math.abs(x) < 3.8) continue;
    dummy.position.set(x, 0.2, z);
    dummy.rotation.set((hash(k * 3.2) - 0.5) * 0.25, hash(k * 13.1) * Math.PI * 2, (hash(k * 4.8) - 0.5) * 0.25);
    const fs = 0.75 + hash(k * 6.6) * 0.7;
    dummy.scale.set(fs, 0.7 + hash(k * 2.2) * 0.55, fs);
    dummy.updateMatrix();
    ferns.setMatrixAt(fernPlaced, dummy.matrix);
    fernPlaced++;
  }
  ferns.count = fernPlaced;
  ferns.instanceMatrix.needsUpdate = true;
  root.add(ferns);

  const mossCount = 28;
  const moss = new THREE.InstancedMesh(mossGeo, mossMat, mossCount);
  moss.castShadow = true;
  moss.receiveShadow = true;
  let mossPlaced = 0;
  for (let k = 0; mossPlaced < mossCount && k < mossCount * 4; k++) {
    const side = hash(k * 8.8) > 0.5 ? 1 : -1;
    const x = side * (3.4 + hash(k * 14.2) * 6.5);
    const z = (hash(k * 22.7) - 0.5) * 32;
    if (inJeepPad(x, z) || Math.abs(x) < 3.8) continue;
    dummy.position.set(x, 0.07, z);
    dummy.rotation.set(0, hash(k * 5.5) * Math.PI * 2, 0);
    const ms = 0.35 + hash(k * 3.3) * 0.4;
    dummy.scale.set(ms, ms * 0.28, ms * 0.85);
    dummy.updateMatrix();
    moss.setMatrixAt(mossPlaced, dummy.matrix);
    mossPlaced++;
  }
  moss.count = mossPlaced;
  moss.instanceMatrix.needsUpdate = true;
  root.add(moss);

  // Hero fern clusters, saplings, stumps along the sunlit verge.
  for (let k = 0; k < 10; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const x = side * (4.2 + hash(k * 6.1) * 2.4);
    const z = -10 + k * 2.3 + (hash(k * 4.4) - 0.5) * 1.2;
    if (Math.abs(x) < 3.8) continue;
    const f = fernProto.clone();
    f.position.set(x, 0, z);
    f.rotation.y = hash(k * 9.9) * Math.PI * 2;
    f.scale.setScalar(0.85 + hash(k * 2.2) * 0.45);
    root.add(f);
  }

  for (let k = 0; k < 12; k++) {
    const side = hash(k * 3.7) > 0.5 ? 1 : -1;
    const x = side * (4.7 + hash(k * 12.2) * 5.5);
    const z = (hash(k * 18.4) - 0.5) * 28;
    if (inRoadOrClearing(x, z)) continue;
    const sap = saplingProto.clone();
    const s = 0.7 + hash(k * 7.7) * 0.55;
    sap.position.set(x, 0, z);
    sap.rotation.y = hash(k * 10.1) * Math.PI * 2;
    sap.rotation.z = (hash(k * 2.9) - 0.5) * 0.12;
    sap.scale.setScalar(s);
    root.add(sap);
  }

  for (let k = 0; k < 6; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const x = side * (4.6 + hash(k * 5.5) * 1.8);
    const z = -8 + k * 3.4 + hash(k) * 0.8;
    if (Math.abs(x) < 3.8) continue;
    const st = stumpProto.clone();
    st.position.set(x, 0, z);
    st.rotation.y = hash(k * 8.8) * Math.PI * 2;
    st.scale.setScalar(0.8 + hash(k * 3.3) * 0.45);
    root.add(st);
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.25, z), new THREE.Vector3(0.4, 0.5, 0.4)),
    );
  }

  // Two fallen logs on the clearing edge.
  const logA = cyl(0.15, 0.13, 3.4, 8, barkMat, 4.85, 0.15, 3.1, 0, 0.55, Math.PI / 2);
  logA.rotation.y = 0.38;
  root.add(logA);
  const nubA = cyl(0.03, 0.045, 0.55, 5, barkMat, 4.55, 0.28, 2.4);
  nubA.rotation.z = 0.9;
  root.add(nubA);
  colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4.85, 0.2, 3.1), new THREE.Vector3(1.4, 0.45, 3.2)));

  const logB = cyl(0.13, 0.11, 2.6, 8, barkMat, -5.15, 0.13, 5.4, 0, -0.35, Math.PI / 2);
  logB.rotation.y = -0.55;
  root.add(logB);
  colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5.15, 0.18, 5.4), new THREE.Vector3(1.2, 0.4, 2.5)));

  // Boulder cluster, hero/forest right verge.
  const cluster = [
    [5.15, 5.55, 0.95, 0],
    [5.55, 6.15, 0.62, 1],
    [4.75, 6.35, 0.48, 2],
    [5.7, 5.2, 0.4, 3],
  ];
  for (const [x, z, s, seed] of cluster) {
    const b = makeBoulder(seed % 2 === 0 ? rockMat : rockLo, seed + 2);
    b.position.set(x, 0.12 * s, z);
    b.scale.setScalar(s);
    b.rotation.set(hash(seed * 2.2) * 0.6, hash(seed * 5.5) * Math.PI * 2, hash(seed * 3.3) * 0.4);
    root.add(b);
  }
  colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5.25, 0.35, 5.8), new THREE.Vector3(1.6, 0.8, 1.6)));

  return { mesh: root, colliders };
}
