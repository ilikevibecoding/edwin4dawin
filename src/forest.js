import * as THREE from 'three';
import { cyl, group } from './geo.js';
import { PALETTE } from './palette.js';
import { barkAlbedo, leafAlbedo } from './textures.js';

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function makePine(barkMat, leafMat) {
  const g = group('pine');
  const trunkH = 7.2;
  const trunk = cyl(0.12, 0.22, trunkH, 8, barkMat, 0, trunkH * 0.5, 0);
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const y = 2.1 + i * 0.95;
    const r = 2.4 - i * 0.32;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.5, 7), leafMat);
    cone.position.y = y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  return g;
}

function makeDeciduous(barkMat, leafMat) {
  const g = group('decid');
  g.add(cyl(0.1, 0.16, 4.4, 8, barkMat, 0, 2.2, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sprig = cyl(0.03, 0.05, 1.4, 6, barkMat, Math.cos(a) * 0.35, 3.6, Math.sin(a) * 0.35);
    sprig.rotation.z = Math.cos(a) * 0.6;
    sprig.rotation.x = Math.sin(a) * 0.6;
    g.add(sprig);
  }
  for (let i = 0; i < 7; i++) {
    const a = hash(i * 3.1) * Math.PI * 2;
    const r = 0.7 + hash(i * 7.7) * 0.5;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), leafMat);
    puff.position.set(Math.cos(a) * 0.8, 4.4 + hash(i * 2.2) * 0.8, Math.sin(a) * 0.8);
    puff.castShadow = true;
    puff.receiveShadow = true;
    g.add(puff);
  }
  return g;
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
  const pineMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pine,
    roughness: 0.86,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.22,
  });
  const decidMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pineHi,
    map: leafMap,
    roughness: 0.8,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.25,
  });

  const pineProto = makePine(barkMat, pineMat);
  const decidProto = makeDeciduous(barkMat, decidMat);

  const colliders = [];
  let placed = 0;
  let i = 0;
  while (placed < treeCount && i < treeCount * 6) {
    i++;
    const a = hash(i * 19.7) * Math.PI * 2;
    const r = 6 + hash(i * 31.3) * 38;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 1.15;
    // Keep a sunlit clearing around the jeep and the road corridor
    if (Math.abs(x) < 4.4 && Math.abs(z) < 18) continue;
    if (Math.abs(x) < 3.8) continue;
    const proto = hash(i * 4.4) > 0.35 ? pineProto : decidProto;
    const t = proto.clone();
    const s = 0.75 + hash(i * 8.8) * 0.55;
    t.scale.setScalar(s);
    t.position.set(x, 0, z);
    t.rotation.y = hash(i * 11.1) * Math.PI * 2;
    t.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    root.add(t);
    colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2, z), new THREE.Vector3(0.7, 4, 0.7)));
    placed++;
  }

  // Undergrowth clumps
  const fernMat = new THREE.MeshStandardMaterial({
    color: PALETTE.moss,
    roughness: 0.9,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.2,
  });
  for (let k = 0; k < 70; k++) {
    const a = hash(k * 23.1) * Math.PI * 2;
    const r = 3.2 + hash(k * 17.9) * 22;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 2.2 && Math.abs(z) < 12) continue;
    const fern = new THREE.Mesh(new THREE.ConeGeometry(0.35 + hash(k) * 0.25, 0.45, 5), fernMat);
    fern.position.set(x, 0.2, z);
    fern.rotation.y = k;
    fern.castShadow = true;
    fern.receiveShadow = true;
    root.add(fern);
  }

  // Fallen log
  const log = cyl(0.16, 0.14, 3.2, 8, barkMat, 4.6, 0.16, 3.4, 0, 0, Math.PI / 2);
  log.rotation.y = 0.4;
  root.add(log);

  return { mesh: root, colliders };
}
