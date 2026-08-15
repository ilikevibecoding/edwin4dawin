import * as THREE from 'three';
import { fbm2 } from './seed.js';
import { makeCaustic } from './textures.js';

export function createWaterSystem(renderer, seed = 1) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x041820);
  scene.fog = new THREE.FogExp2(0x062830, 0.028);

  const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 180);
  cam.position.set(0, 0.2, 0.4);
  cam.lookAt(1.2, -2.4, -10);

  const rt = new THREE.WebGLRenderTarget(1024, 576, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });

  const ambient = new THREE.AmbientLight(0x245060, 0.7);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0x8ac8d4, 1.15);
  key.position.set(4, 8, 2);
  scene.add(key);
  const floodL = new THREE.SpotLight(0xa8e0ec, 36, 48, 0.38, 0.45, 1.0);
  floodL.position.set(-1.2, 0.4, -1.4);
  floodL.target.position.set(-3, -4, -18);
  scene.add(floodL, floodL.target);
  const floodR = new THREE.SpotLight(0xa8e0ec, 36, 48, 0.38, 0.45, 1.0);
  floodR.position.set(1.2, 0.4, -1.4);
  floodR.target.position.set(3, -5, -20);
  scene.add(floodR, floodR.target);

  const caustic = makeCaustic(seed + 20);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1a2a28,
      map: caustic,
      roughness: 0.92,
      metalness: 0.05,
      emissive: 0x021018,
      emissiveIntensity: 0.15,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -14, -28);
  scene.add(floor);

  const rocks = new THREE.Group();
  scene.add(rocks);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x243230,
    roughness: 0.9,
    metalness: 0.04,
    flatShading: true,
  });
  const silMat = new THREE.MeshStandardMaterial({
    color: 0x0a181c,
    roughness: 1,
    metalness: 0,
    fog: true,
  });

  for (let i = 0; i < 18; i++) {
    const geo = new THREE.IcosahedronGeometry(1.2 + (i % 5) * 0.45, 1);
    displace(geo, seed + i, 0.35);
    const m = new THREE.Mesh(geo, i < 8 ? rockMat : silMat);
    m.position.set(((i * 17) % 36) - 16, -9 + (i % 4) * 0.8, -10 - (i * 2.4) % 28);
    m.scale.set(1.2 + (i % 3) * 0.8, 0.8 + (i % 4) * 0.5, 1.4 + (i % 3));
    rocks.add(m);
  }

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8, 16, 32), silMat);
  ridge.position.set(-10, -5, -22);
  ridge.rotation.z = 0.35;
  rocks.add(ridge);
  const ridge2 = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 26), silMat);
  ridge2.position.set(12, -6, -28);
  rocks.add(ridge2);
  const nearRock = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 1), rockMat);
  displace(nearRock.geometry, seed + 40, 0.45);
  nearRock.position.set(1.4, -3.2, -9);
  nearRock.scale.set(2.1, 1.4, 2.6);
  rocks.add(nearRock);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 4), silMat);
  wall.position.set(2, -3.5, -16);
  wall.rotation.y = 0.25;
  rocks.add(wall);

  const near = makeParticles(420, 0x9ad0c8, 0.018, 6, seed);
  const mid = makeParticles(280, 0x6a9aa0, 0.03, 16, seed + 3);
  const far = makeParticles(160, 0x3a6068, 0.05, 32, seed + 7);
  const bio = makeParticles(40, 0x6ad0c8, 0.012, 22, seed + 11, true);
  const bubbles = makeParticles(24, 0xc8e8e8, 0.01, 8, seed + 15, true);
  scene.add(near, mid, far, bio, bubbles);

  const cones = createFloodCones();
  scene.add(cones);

  const state = {
    time: 0,
    motion: true,
    rocks,
    near,
    mid,
    far,
    bio,
    bubbles,
    floor,
    caustic,
  };

  function update(dt, forcedTime) {
    if (forcedTime != null) state.time = forcedTime;
    else if (state.motion) state.time += dt;
    const t = state.time;
    rocks.position.z = (t * 0.22) % 70;
    near.position.z = (t * 1.15) % 8;
    mid.position.z = (t * 0.45) % 14;
    far.position.z = (t * 0.12) % 20;
    bio.position.x = Math.sin(t * 0.15) * 2;
    bubbles.position.y = (t * 0.35) % 6;
    caustic.offset.set(t * 0.02, t * 0.01);
  }

  function render() {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
  }

  return { scene, cam, rt, update, render, state };
}

function makeParticles(count, color, size, spread, seed, additive = false) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = ((hash(seed + i) - 0.5) * 2) * spread;
    pos[i * 3 + 1] = ((hash(seed + i * 3) - 0.5) * 2) * (spread * 0.55);
    pos[i * 3 + 2] = -2 - hash(seed + i * 7) * 40;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: additive ? 0.45 : 0.35,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

function createFloodCones() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x6ab0c0,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 16, 1, true), mat);
  c1.position.set(-1.1, -2.2, -10);
  c1.rotation.x = 1.2;
  const c2 = c1.clone();
  c2.position.set(1.2, -2.4, -11);
  g.add(c1, c2);
  return g;
}

function displace(geo, seed, amp) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm2(x * 0.6 + seed, z * 0.6, seed, 3);
    const k = 1 + (n - 0.5) * amp * 2;
    pos.setXYZ(i, x * k, y * (1 + n * amp), z * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
