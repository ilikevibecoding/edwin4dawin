import * as THREE from 'three';
import { fbm2 } from './seed.js';
import { makeCaustic } from './textures.js';

export function createWaterSystem(renderer, seed = 1) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x021018);
  scene.fog = new THREE.FogExp2(0x031820, 0.055);

  const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 180);
  cam.position.set(0, 0, 0);
  cam.lookAt(0, -0.08, -12);

  const rt = new THREE.WebGLRenderTarget(1024, 576, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });

  const ambient = new THREE.AmbientLight(0x143040, 0.35);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0x6aa8b8, 0.55);
  key.position.set(4, 8, 2);
  scene.add(key);
  const floodL = new THREE.SpotLight(0x88c8d8, 18, 40, 0.35, 0.55, 1.1);
  floodL.position.set(-1.2, 0.4, -1.4);
  floodL.target.position.set(-3, -4, -18);
  scene.add(floodL, floodL.target);
  const floodR = new THREE.SpotLight(0x88c8d8, 18, 40, 0.35, 0.55, 1.1);
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
    m.position.set(((i * 17) % 40) - 20, -12 + (i % 4) * 0.6, -18 - (i * 3) % 36);
    m.scale.set(1.2 + (i % 3) * 0.8, 0.8 + (i % 4) * 0.5, 1.4 + (i % 3));
    rocks.add(m);
  }

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 28), silMat);
  ridge.position.set(-16, -8, -40);
  ridge.rotation.z = 0.3;
  rocks.add(ridge);
  const ridge2 = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 22), silMat);
  ridge2.position.set(18, -10, -50);
  rocks.add(ridge2);

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
