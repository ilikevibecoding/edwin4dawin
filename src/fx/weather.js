// Weather system — owner: Fable 4b (VFX & atmosphere). Exterior snowfall +
// ground-level snow wisps. Contract with game.js (unchanged):
//   const weather = createWeather(scene, world);
//   weather.update(dt, playerPos);  // each sim step
//   weather.dispose();
//
// Design: one THREE.Points field (600–1200 flakes by quality preset) living in
// a 26 m radius × 12 m tall cylinder that follows the player and wraps
// vertically. Flakes exist ONLY outdoors: above roof level (y > 4.2) anywhere,
// full height outside the building footprint (x 0..64, z 0..44) and inside the
// outdoor pockets the plan carves out of that box. Wind gives a steady lateral
// drift plus slow gust noise; reducedMotion halves density and kills gusts.
// Subtle by design — atmosphere, not a whiteout.

import * as THREE from 'three';
import { qualityPreset, getSetting } from '../core/settings.js';
import { Rng } from '../core/rng.js';
import { roomAt } from '../world/map.js';
import { setVfxWorld } from './vfx.js';

const RADIUS = 26;          // field radius around the player
const HEIGHT = 12;          // vertical span of the field
const ROOF = 4.2;           // above this, snow falls everywhere
const FOOT = { x0: 0, x1: 64, z0: 0, z1: 44 };  // building footprint
// outdoor pockets inside the footprint box (NW corner, west strip, stair notch)
const POCKETS = [
  [0, 0, 18, 10],
  [0, 10, 10, 30],
  [10, 10, 14, 16],
];
const PLAZA = { x0: 22, z0: 44, x1: 40, z1: 56 };

function outdoorAt(x, z) {
  if (x < FOOT.x0 || x > FOOT.x1 || z < FOOT.z0 || z > FOOT.z1) return true;
  for (const [x0, z0, x1, z1] of POCKETS) {
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return true;
  }
  return false;
}
function allowed(x, y, z) { return y > ROOF || outdoorAt(x, z); }
function groundLevel(x, z) {
  // grade is ~0 everywhere outdoors except the garage-ramp trench (east)
  if (x > 64.2 && x < 80 && z > 3.7 && z < 12.3) return -3.8;
  return -0.06;
}

// --- canvas textures ---------------------------------------------------------
function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(244,249,253,0.6)');
  g.addColorStop(1, 'rgba(238,244,249,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const rng = new Rng(20260404);
  for (let i = 0; i < 9; i++) {
    const y = 8 + rng.random() * 48;
    const x0 = rng.random() * 60;
    const len = 120 + rng.random() * 130;
    const g = ctx.createLinearGradient(x0, y, x0 + len, y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${0.28 + rng.random() * 0.3})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5 + rng.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + len * 0.5, y - 3 + rng.random() * 6, x0 + len, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------------------
export function createWeather(scene, world) {
  setVfxWorld(world); // give the VFX pass ground queries for this session

  const rng = new Rng(20260301);
  const q = qualityPreset();
  const reduced = getSetting('reducedMotion');
  let count = q.particleScale >= 1 ? 1200 : q.particleScale >= 0.7 ? 900 : 600;
  if (reduced) count = Math.round(count / 2);

  const group = new THREE.Group();
  group.name = 'weather';
  scene.add(group);

  // ---- snowfall points ----
  const positions = new Float32Array(count * 3);
  const fall = new Float32Array(count);     // fall speed m/s
  const swayA = new Float32Array(count);    // sway amplitude
  const swayP = new Float32Array(count);    // sway phase
  const anchor = { x: 31, z: 51.5 };        // spawn plaza until first update
  const spawn = (i, topOnly = false) => {
    const a = rng.random() * Math.PI * 2;
    const r = Math.sqrt(rng.random()) * RADIUS;
    let x = anchor.x + Math.cos(a) * r;
    let z = anchor.z + Math.sin(a) * r;
    let y = anchor.y0 + rng.random() * HEIGHT;
    if (topOnly) y = anchor.y0 + HEIGHT * (0.75 + rng.random() * 0.25);
    if (!allowed(x, y, z)) y = ROOF + 0.3 + rng.random() * (HEIGHT * 0.6);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    fall[i] = 0.7 + rng.random() * 0.9;
    swayA[i] = 0.15 + rng.random() * 0.4;
    swayP[i] = rng.random() * Math.PI * 2;
  };
  anchor.y0 = -1.5;
  for (let i = 0; i < count; i++) spawn(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const flakeTex = flakeTexture();
  const mat = new THREE.PointsMaterial({
    map: flakeTex, size: 0.11, sizeAttenuation: true, transparent: true,
    opacity: 0.75, depthWrite: false, color: 0xeef4f9,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  // ---- ground wisps: streaking snow sheets across the plaza ----
  const WISPS = reduced ? 0 : 7;
  const streakTex = WISPS ? streakTexture() : null;
  const wisps = [];
  if (WISPS) {
    const wgeo = new THREE.PlaneGeometry(4.6, 1.1);
    for (let i = 0; i < WISPS; i++) {
      const wm = new THREE.MeshBasicMaterial({
        map: streakTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(wgeo, wm);
      m.rotation.x = -Math.PI / 2 + 0.06;
      m.rotation.z = rng.random() * 0.3 - 0.15;
      m.position.set(
        PLAZA.x0 + rng.random() * (PLAZA.x1 - PLAZA.x0),
        0.14 + rng.random() * 0.1,
        PLAZA.z0 + rng.random() * (PLAZA.z1 - PLAZA.z0),
      );
      group.add(m);
      wisps.push({ mesh: m, speed: 2.6 + rng.random() * 2.2, phase: rng.random() * Math.PI * 2, maxO: 0.16 + rng.random() * 0.12 });
    }
    wisps[0] && (wisps[0].geo = wgeo); // for dispose
  }

  let t = 0;
  let wispGate = 0; // 0..1, opens when the player is outdoors

  return {
    update(dt, playerPos) {
      t += dt;
      const px = playerPos.x, pz = playerPos.z;
      anchor.x = px; anchor.z = pz;
      anchor.y0 = Math.max(playerPos.y, -3.6) - 2;

      const reducedNow = getSetting('reducedMotion');
      // wind: steady SE drift + slow multi-sine gusts (no gusts when reduced)
      const gust = reducedNow ? 0 : (Math.sin(t * 0.33) * 0.5 + Math.sin(t * 0.91 + 1.7) * 0.35 + 0.55);
      const wx = 0.8 + gust * 0.9;
      const wz = 0.35 + gust * 0.4;

      const top = anchor.y0 + HEIGHT;
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        let x = positions[ix], y = positions[ix + 1], z = positions[ix + 2];
        y -= fall[i] * dt;
        x += (wx + Math.sin(t * 0.9 + swayP[i]) * swayA[i]) * dt;
        z += (wz + Math.cos(t * 0.7 + swayP[i]) * swayA[i] * 0.7) * dt;
        // horizontal wrap: re-enter on the windward side of the cylinder
        const dx = x - px, dz = z - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 > RADIUS * RADIUS) {
          x = px - dx * 0.96;
          z = pz - dz * 0.96;
        }
        // vertical wrap at the ground (or the ramp trench)
        if (y < groundLevel(x, z)) {
          y = top - rng.random() * 1.5;
          const a = rng.random() * Math.PI * 2;
          const r = Math.sqrt(rng.random()) * RADIUS;
          x = px + Math.cos(a) * r;
          z = pz + Math.sin(a) * r;
        }
        // kill flakes that drift into the building below roof level
        if (!allowed(x, y, z)) {
          y = ROOF + 0.3 + rng.random() * (HEIGHT * 0.55);
          const a = rng.random() * Math.PI * 2;
          const r = Math.sqrt(rng.random()) * RADIUS;
          x = px + Math.cos(a) * r;
          z = pz + Math.sin(a) * r;
        }
        if (y > top) y = anchor.y0 + (y - top);
        positions[ix] = x; positions[ix + 1] = y; positions[ix + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;

      // wisps: only when the player is outdoors, streaking with the wind
      if (wisps.length) {
        const room = roomAt(px, pz, playerPos.y);
        const outdoors = !room || room.outdoor;
        wispGate = THREE.MathUtils.damp(wispGate, outdoors ? 1 : 0, 3, dt);
        for (const w of wisps) {
          w.phase += dt * 0.7;
          const m = w.mesh;
          m.position.x += (wx * 0.6 + w.speed) * dt * 0.55;
          m.position.z += wz * dt * 0.5;
          if (m.position.x > PLAZA.x1 + 2) {
            m.position.x = PLAZA.x0 - 2;
            m.position.z = PLAZA.z0 + rng.random() * (PLAZA.z1 - PLAZA.z0);
          }
          if (m.position.z > PLAZA.z1 + 1) m.position.z = PLAZA.z0 + 0.5;
          m.material.opacity = wispGate * w.maxO * (0.5 + 0.5 * Math.sin(w.phase));
        }
      }
    },

    dispose() {
      scene.remove(group);
      geo.dispose();
      mat.dispose();
      flakeTex.dispose();
      if (wisps.length) {
        wisps[0].geo?.dispose();
        for (const w of wisps) w.mesh.material.dispose();
        streakTex?.dispose();
      }
      setVfxWorld(null);
    },
  };
}
