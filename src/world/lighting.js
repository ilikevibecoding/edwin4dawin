// Lighting plan: cold overcast daylight through windows + zoned interior
// lights. Light count respects the quality budget; scenario switching is
// exposed for QA (default / neutral / emergency / dusk).

import * as THREE from 'three';
import { qualityPreset } from '../core/settings.js';

// Priority-ordered interior lights: [x, y, z, color, intensity, distance, priority]
const INTERIOR_LIGHTS = [
  // hero areas first (survive low quality budgets)
  { p: [31, 3.9, 35], c: 0xd8e6ea, i: 55, d: 16, pr: 0, name: 'lobby' },
  { p: [29, 2.7, 22], c: 0xdfe8dd, i: 40, d: 14, pr: 0, name: 'cubicles' },
  { p: [47, 2.7, 39], c: 0xe8e4d2, i: 26, d: 11, pr: 1, name: 'conference' },
  { p: [60, 2.6, 18], c: 0x86b8ff, i: 22, d: 9, pr: 1, name: 'server_cool' },
  { p: [54, -0.6, 8], c: 0xd8dfe4, i: 34, d: 15, pr: 1, name: 'garage' },
  { p: [41, 2.6, 12], c: 0xd8e4d8, i: 22, d: 12, pr: 2, name: 'corridor_mid' },
  { p: [28, 2.7, 5], c: 0xe4e8dc, i: 24, d: 11, pr: 2, name: 'break' },
  { p: [59, 2.7, 39], c: 0xffd9a8, i: 20, d: 9, pr: 2, name: 'exec_warm' },
  { p: [31, -1.0, 10], c: 0x9adf9a, i: 14, d: 10, pr: 3, name: 'service_nav' },
  { p: [16, 2.7, 34], c: 0xe0e6e0, i: 18, d: 10, pr: 3, name: 'waiting' },
  { p: [44, 2.7, 20], c: 0xdfe4da, i: 16, d: 9, pr: 3, name: 'archive' },
  { p: [52, 2.7, 20], c: 0xdfe8e0, i: 16, d: 9, pr: 4, name: 'it' },
  { p: [37, -1.0, 4], c: 0xd8dcd2, i: 16, d: 9, pr: 4, name: 'loading' },
  { p: [14, 2.7, 20], c: 0xdfe4da, i: 14, d: 8, pr: 4, name: 'copy' },
  { p: [52, 2.7, 5], c: 0xe4e8dc, i: 18, d: 10, pr: 5, name: 'training' },
  { p: [8, 2.6, 37], c: 0xdce4e6, i: 12, d: 7, pr: 5, name: 'restrooms' },
];

export function setupLighting(scene) {
  const rig = new THREE.Group();
  rig.name = 'lighting';

  const hemi = new THREE.HemisphereLight(0xbfd4e4, 0x3c4148, 0.85);
  rig.add(hemi);

  const sun = new THREE.DirectionalLight(0xd8e6f2, 2.0);
  sun.position.set(42, 46, 74);
  sun.target.position.set(32, 0, 22);
  rig.add(sun);
  rig.add(sun.target);
  const q = qualityPreset();
  sun.castShadow = q.shadows;
  sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
  sun.shadow.camera.left = -75;
  sun.shadow.camera.right = 75;
  sun.shadow.camera.top = 75;
  sun.shadow.camera.bottom = -75;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 170;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;

  const points = [];
  const budget = q.dynamicLights;
  const sorted = [...INTERIOR_LIGHTS].sort((a, b) => a.pr - b.pr).slice(0, budget);
  for (const L of sorted) {
    const pt = new THREE.PointLight(L.c, L.i, L.d, 2);
    pt.position.set(...L.p);
    pt.name = `light_${L.name}`;
    rig.add(pt);
    points.push(pt);
  }

  scene.add(rig);
  scene.background = new THREE.Color(0x9fb4c4);
  scene.fog = new THREE.Fog(0x9fb4c4, 34, 150);

  const api = {
    rig, hemi, sun, points,
    scenario: 'default',
    setScenario(name) {
      this.scenario = name;
      if (name === 'neutral') {
        hemi.intensity = 2.2; sun.intensity = 1.2;
        for (const p of points) p.intensity = 8;
        scene.background = new THREE.Color(0x707880);
        scene.fog.near = 300; scene.fog.far = 500;
      } else if (name === 'emergency') {
        hemi.intensity = 0.32; sun.intensity = 0.9;
        for (const p of points) { p.intensity = 6; p.color.set(0xff5a4e); }
        scene.background = new THREE.Color(0x5c6e7c);
      } else if (name === 'dusk') {
        hemi.intensity = 0.4; sun.intensity = 0.7; sun.color.set(0x8fa8c4);
        scene.background = new THREE.Color(0x51637a);
        scene.fog.color.set(0x51637a);
      } else {
        hemi.intensity = 0.85; sun.intensity = 2.0; sun.color.set(0xd8e6f2);
        const src = [...INTERIOR_LIGHTS].sort((a, b) => a.pr - b.pr);
        points.forEach((p, idx) => { p.intensity = src[idx].i; p.color.set(src[idx].c); });
        scene.background = new THREE.Color(0x9fb4c4);
        scene.fog.color.set(0x9fb4c4);
        scene.fog.near = 34; scene.fog.far = 150;
      }
    },
    dispose() { scene.remove(rig); },
  };
  return api;
}
