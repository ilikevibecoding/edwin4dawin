import * as THREE from 'three';
import { fbm, SeededRandom } from './seed.js';
import { PALETTE } from './layout.js';

export function createUnderwater(seed = 0x51) {
  const root = new THREE.Group();
  root.name = 'underwater';
  const rng = new SeededRandom(seed);

  const fogColor = new THREE.Color(PALETTE.waterMid);
  const volume = new THREE.Mesh(
    new THREE.SphereGeometry(80, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0x061820,
      side: THREE.BackSide,
      fog: false,
    }),
  );
  volume.scale.set(1, 0.62, 1.4);
  root.add(volume);

  const mid = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 40),
    new THREE.MeshBasicMaterial({
      color: 0x0a2430,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mid.position.set(0, -6, 30);
  root.add(mid);

  const terrain = new THREE.Group();
  terrain.position.set(0, -8.5, 18);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a2e,
    roughness: 0.92,
    metalness: 0.04,
    fog: true,
  });
  const rockGeos = [
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.ConeGeometry(1, 2.2, 6),
  ];
  const inst = new THREE.InstancedMesh(rockGeos[0], rockMat, 48);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 48; i++) {
    dummy.position.set(rng.signed(22), rng.range(-2, 6), rng.range(-8, 70));
    dummy.rotation.set(rng.range(0, 1), rng.range(0, 6), rng.range(0, 1));
    const s = rng.range(0.8, 4.2);
    dummy.scale.set(s, s * rng.range(0.7, 1.8), s);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  terrain.add(inst);

  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 4.5, 28, 7, 1, false),
    new THREE.MeshStandardMaterial({ color: 0x142228, roughness: 0.95, metalness: 0.03 }),
  );
  ridge.rotation.z = 1.15;
  ridge.rotation.y = 0.3;
  ridge.position.set(3.5, 0.2, 22);
  terrain.add(ridge);
  const nearRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x4a646c, roughness: 0.9 }),
  );
  nearRock.position.set(1.6, 9.2, -1.2);
  nearRock.scale.set(1.6, 2.2, 1.8);
  terrain.add(nearRock);
  const floodHit = new THREE.SpotLight(0xb8dce0, 40, 22, 0.35, 0.45, 1.2);
  floodHit.position.set(0, 9.4, -5);
  floodHit.target.position.set(1.6, 9.0, -1.2);
  terrain.add(floodHit, floodHit.target);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4, 18, 50),
    new THREE.MeshStandardMaterial({ color: 0x102026, roughness: 0.96 }),
  );
  wall.position.set(-16, 4, 28);
  wall.rotation.y = 0.18;
  terrain.add(wall);
  root.add(terrain);

  const silt = makePoints(420, 14, 8, 22, 0x9bb8b0, 0.04, rng);
  const midSilt = makePoints(320, 28, 12, 40, 0x6a8884, 0.055, rng.fork(2));
  const farSilt = makePoints(180, 50, 18, 70, 0x3a5858, 0.09, rng.fork(3));
  root.add(silt, midSilt, farSilt);

  const bubbles = makePoints(80, 6, 4, 10, 0xcfe4e0, 0.04, rng.fork(4));
  bubbles.position.set(0.2, 0.4, 13.2);
  root.add(bubbles);

  const bio = makePoints(40, 20, 8, 30, 0x3a8a7a, 0.06, rng.fork(5));
  bio.material.size = 0.07;
  bio.material.color.set(0x2f8f78);
  root.add(bio);

  const floodL = new THREE.SpotLight(0x9fd4dc, 18, 28, 0.28, 0.55, 1.4);
  floodL.position.set(-0.45, 0.85, 13.1);
  floodL.target.position.set(-1.2, -1.5, 22);
  const floodR = new THREE.SpotLight(0x9fd4dc, 16, 26, 0.26, 0.6, 1.4);
  floodR.position.set(0.45, 0.85, 13.1);
  floodR.target.position.set(1.4, -2.0, 21);
  const windowRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x6e8a90, roughness: 0.88, metalness: 0.04 }),
  );
  windowRock.position.set(0.35, 0.35, 15.2);
  const silhouette = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 10, 7, 0, Math.PI, 0.2, 1.8),
    new THREE.MeshBasicMaterial({ color: 0x2a444c, side: THREE.DoubleSide }),
  );
  silhouette.position.set(0.25, -0.8, 17.6);
  silhouette.rotation.y = Math.PI;
  root.add(silhouette);
  windowRock.scale.set(1.4, 2.1, 1.6);
  root.add(windowRock);
  const windowRock2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 0),
    new THREE.MeshStandardMaterial({ color: 0x3a5056, roughness: 0.92 }),
  );
  windowRock2.position.set(-2.2, -0.6, 17.5);
  windowRock2.scale.set(1.8, 1.3, 1.5);
  root.add(windowRock2);

  root.add(floodL, floodL.target, floodR, floodR.target);

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x8ec8d0,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 16, 16, 1, true), coneMat);
  cone.position.set(0, -0.6, 20);
  cone.rotation.x = Math.PI / 2;
  root.add(cone);

  const caustic = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshBasicMaterial({
      color: 0x4a8890,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
    }),
  );
  caustic.rotation.x = -Math.PI / 2;
  caustic.position.set(0, -7.2, 18);
  root.add(caustic);

  let paused = false;
  let time = 0;
  const state = {
    root,
    setPaused(v) {
      paused = v;
    },
    setTime(t) {
      time = t;
      terrain.position.z = 18 - (t * 0.28) % 70;
      cone.position.z = 20;
    },
    update(dt) {
      if (paused) return;
      time += dt;
      silt.position.z -= dt * 1.15;
      if (silt.position.z < -8) silt.position.z = 4;
      midSilt.position.z -= dt * 0.45;
      if (midSilt.position.z < -12) midSilt.position.z = 6;
      farSilt.position.z -= dt * 0.12;
      if (farSilt.position.z < -16) farSilt.position.z = 4;
      terrain.position.z -= dt * 0.28;
      if (terrain.position.z < -40) terrain.position.z = 18;
      bubbles.position.y += dt * 0.15;
      if (bubbles.position.y > 2.2) bubbles.position.y = 0.2;
      bio.rotation.y += dt * 0.02;
      caustic.material.opacity = 0.03 + Math.sin(time * 0.7) * 0.012;
    },
    getTime() {
      return time;
    },
  };
  return state;
}

function makePoints(count, spreadX, spreadY, spreadZ, color, size, rng) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rng.signed(spreadX);
    pos[i * 3 + 1] = rng.range(-spreadY, spreadY * 0.6);
    pos[i * 3 + 2] = rng.range(8, 8 + spreadZ);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export function createWindowFrame(mats, w, h, depth = 0.16) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, depth), mats.steel);
  g.add(frame);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, depth * 0.55), mats.brushed);
  inner.position.z = depth * 0.12;
  g.add(inner);
  const seal = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.02), mats.rubber);
  seal.position.z = depth * 0.28;
  g.add(seal);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), mats.glassThick);
  glass.position.z = depth * 0.2;
  glass.renderOrder = 2;
  g.add(glass);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.3), mats.wetGlass);
  wet.position.set(0, -h * 0.32, depth * 0.24);
  wet.renderOrder = 3;
  g.add(wet);
  const boltR = (w + 0.1) / 2;
  const boltH = (h + 0.1) / 2;
  const corners = [
    [boltR, boltH],
    [-boltR, boltH],
    [boltR, -boltH],
    [-boltR, -boltH],
    [0, boltH],
    [0, -boltH],
    [boltR, 0],
    [-boltR, 0],
  ];
  for (const [x, y] of corners) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 8), mats.steel);
    b.rotation.x = Math.PI / 2;
    b.position.set(x, y, depth * 0.42);
    g.add(b);
  }
  return g;
}

export { fbm };
