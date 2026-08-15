import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import { SEED, mulberry32, PALETTE } from './seed.js';
import { latheProfile } from './geom.js';

const rockMat = new MeshStandardMaterial({
  color: 0x1a2a2e,
  roughness: 0.95,
  metalness: 0.02,
  envMapIntensity: 0.25,
});

const deepMat = new MeshBasicMaterial({
  color: PALETTE.waterDeep,
  side: 1,
  fog: false,
});

function rockGeometry(seed, scale) {
  const rand = mulberry32(seed);
  const pts = [];
  const h = 2 + rand() * 4;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const r = (0.3 + rand() * 0.7) * (1 - t * 0.55) * scale;
    pts.push([r, t * h * scale]);
  }
  const geo = latheProfile(pts, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = (rand() - 0.5) * 0.12 * scale;
    pos.setXYZ(i, x + n, y, z + n);
  }
  geo.computeVertexNormals();
  return geo;
}

function particleMap() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

const _particleMap = particleMap();

function makeParticles(count, spread, size, color, opacity) {
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rand = mulberry32(SEED + count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * spread.x;
    pos[i * 3 + 1] = (rand() - 0.5) * spread.y;
    pos[i * 3 + 2] = (rand() - 0.5) * spread.z;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const mat = new PointsMaterial({
    color,
    size,
    map: _particleMap,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export function createUnderwater(scene) {
  const root = new Group();
  root.name = 'underwater';

  const dome = new Mesh(new SphereGeometry(80, 24, 16), deepMat);
  dome.scale.y = 0.72;
  root.add(dome);

  const mid = new Mesh(
    new SphereGeometry(48, 20, 12),
    new MeshBasicMaterial({
      color: PALETTE.waterMid,
      transparent: true,
      opacity: 0.18,
      side: 1,
      depthWrite: false,
    })
  );
  mid.scale.y = 0.7;
  root.add(mid);

  const terrain = new Group();
  const rand = mulberry32(SEED + 200);
  for (let i = 0; i < 18; i++) {
    const rock = new Mesh(rockGeometry(SEED + i * 13, 1.4 + rand() * 2.2), rockMat);
    rock.position.set(
      -10 + rand() * 20,
      -3.2 - rand() * 2.2,
      -3 - rand() * 22
    );
    rock.rotation.y = rand() * Math.PI * 2;
    rock.scale.setScalar(0.8 + rand() * 1.6);
    terrain.add(rock);
  }
  const ridge = new Group();
  for (let i = 0; i < 10; i++) {
    const rock = new Mesh(rockGeometry(SEED + 400 + i * 7, 2.4), rockMat);
    rock.position.set(3.2 + rand() * 2.2, -2.4, -2.5 - i * 3.4);
    rock.scale.set(1.6, 2.2 + rand(), 1.4);
    ridge.add(rock);
  }
  terrain.add(ridge);
  const hero = new Mesh(rockGeometry(SEED + 77, 3.4), rockMat);
  hero.position.set(1.6, -2.1, -6.5);
  hero.scale.set(2.2, 2.6, 1.8);
  terrain.add(hero);
  root.add(terrain);

  const near = makeParticles(420, new Vector3(8, 5, 10), 0.035, 0xb7d4d8, 0.35);
  const midP = makeParticles(280, new Vector3(16, 8, 22), 0.05, 0x7aa8b0, 0.22);
  const farP = makeParticles(160, new Vector3(28, 10, 36), 0.08, 0x3a6870, 0.14);
  const bio = makeParticles(40, new Vector3(20, 8, 24), 0.04, 0x6ad0c8, 0.18);
  root.add(near, midP, farP, bio);

  const bubbles = makeParticles(24, new Vector3(3, 2, 4), 0.025, 0xd0e8ec, 0.28);
  bubbles.position.set(0, 1.1, -0.6);
  root.add(bubbles);

  const coneMat = new MeshBasicMaterial({
    color: 0x8ec8c4,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
  });
  const cone = new Mesh(new CylinderGeometry(0.08, 1.8, 7, 16, 1, true), coneMat);
  cone.position.set(-0.45, 0.7, -2.1);
  cone.rotation.x = Math.PI * 0.72;
  const cone2 = cone.clone();
  cone2.position.set(0.55, 0.85, -2.4);
  root.add(cone, cone2);

  const silt = makeParticles(80, new Vector3(10, 2, 14), 0.09, 0x6a8080, 0.1);
  silt.position.y = -4.5;
  root.add(silt);

  root.userData = {
    terrain,
    ridge,
    near,
    midP,
    farP,
    bio,
    bubbles,
    silt,
    motion: 0,
  };
  scene.add(root);
  return root;
}

export function updateUnderwater(water, dt, enabled, time) {
  if (!water) return;
  const u = water.userData;
  if (enabled) u.motion += dt;
  const t = u.motion;
  water.position.x = Math.sin(t * 0.04) * 0.15;
  if (u.terrain) u.terrain.position.z = (t * 0.085) % 18;
  if (u.ridge) u.ridge.position.z = (t * 0.07) % 12;
  if (u.near) {
    u.near.position.x = (t * 0.35) % 2;
    u.near.position.y = Math.sin(t * 0.2) * 0.1;
  }
  if (u.midP) u.midP.position.z = (t * 0.16) % 4;
  if (u.farP) u.farP.position.z = (t * 0.05) % 6;
  if (u.bio) {
    u.bio.position.x = Math.sin(t * 0.08) * 1.2;
    u.bio.position.y = Math.sin(t * 0.11) * 0.4;
  }
  if (u.bubbles) {
    u.bubbles.position.y = 1.0 + ((t * 0.12) % 1.4);
    u.bubbles.position.x = Math.sin(t * 0.3) * 0.2;
  }
  if (u.silt) u.silt.position.x = Math.sin(t * 0.05) * 2;
}

export function setWaterFrozen(water, seedOffset = 0) {
  if (!water) return;
  const t = 18 + seedOffset;
  water.userData.motion = t;
  updateUnderwater(water, 0, false, t);
}
