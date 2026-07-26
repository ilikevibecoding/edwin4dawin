// Lighting plan — owner: Fable 2. Cold blizzard-overcast daylight (low SE
// winter sun) + a priority-budgeted set of interior point lights aligned with
// the emissive ceiling fixtures placed by archdetail.js. Quality presets
// allow 4/8/12/16 dynamic lights; priorities guarantee the hero path
// (spawn → lobby → cubicles → garage/extraction) reads on every preset.
// Emissive fixtures + hemisphere carry the rooms beyond the budget.
// Scenario switching for QA: default / neutral / emergency / dusk.

import * as THREE from 'three';
import { qualityPreset } from '../core/settings.js';

// Palette (visual bible): neutral/slightly-green fluorescent offices; warm
// exec + lamps; cool blue server + red accent; green-tint basement nav lights;
// cold daylight exterior.
//
// Positions sit on the archdetail fixture grid (y ≈ 0.3 under the ceiling,
// ≥0.6 m from walls). pr 0 survives the low (4-light) budget; the default
// 'high' preset keeps pr 0-2 (12 lights).
//
// Audit-1 containment rule: each light's `distance` stays within its room
// (~half-diagonal + 1 m) and each light sits at its room's center, so
// nothing meaningfully crosses a wall. Greenish whites are desaturated —
// the fluorescent-green feel comes from the subtle tint, not from painting
// neighbouring rooms (the old cubicles/break tints bled a hard green cast
// onto the north-corridor ceiling and viewmodel).
const INTERIOR_LIGHTS = [
  // pr 0 — hero path
  { p: [31, 3.8, 35],      c: 0xd9e2e6, i: 60, d: 11,   pr: 0, name: 'lobby' },
  { p: [29, 2.6, 22],      c: 0xe1e5df, i: 44, d: 14,   pr: 0, name: 'cubicles' },
  { p: [49, -1.0, 8],      c: 0xd8dfe4, i: 40, d: 13,   pr: 0, name: 'garage_w' },
  { p: [59, -1.0, 8],      c: 0xd8dfe4, i: 36, d: 12,   pr: 0, name: 'garage_e' },
  // pr 1 — objectives + spawn approach + main arteries
  { p: [47, 2.6, 39],      c: 0xe8e4d2, i: 30, d: 10,   pr: 1, name: 'conference' },
  { p: [31, 2.85, 42],     c: 0xdde6e8, i: 20, d: 6,    pr: 1, name: 'vestibule' },
  { p: [31, -1.25, 10],    c: 0x9fd6a4, i: 18, d: 13,   pr: 1, name: 'service_nav' },
  { p: [26, 2.55, 12],     c: 0xe3e6e2, i: 22, d: 10,   pr: 1, name: 'ncorr_w' },
  // pr 2 — secondary combat spaces (lobby loop + objective rooms)
  { p: [16, 2.6, 34],      c: 0xe0e4e0, i: 24, d: 9,    pr: 2, name: 'waiting' },
  { p: [44, 2.6, 20],      c: 0xe0e4dd, i: 26, d: 8,    pr: 2, name: 'archive' },
  { p: [59, 2.6, 39],      c: 0xffd9a8, i: 28, d: 8,    pr: 2, name: 'exec_warm' },
  { p: [28, 2.6, 5],       c: 0xe6e8e0, i: 26, d: 9,    pr: 2, name: 'break' },
  // pr 3 — support spaces (ultra only; emissives + hemisphere carry these
  // rooms at lower presets)
  { p: [60, 2.5, 18],      c: 0x86b8ff, i: 24, d: 6,    pr: 3, name: 'server_cool' },
  { p: [52, 2.55, 12],     c: 0xe3e6e2, i: 22, d: 10,   pr: 3, name: 'ncorr_e' },
  { p: [58, -0.5, 26],     c: 0xffc890, i: 16, d: 7,    pr: 3, name: 'stairwell_warm' },
  { p: [37, -1.0, 4],      c: 0xdcdedb, i: 20, d: 8.5,  pr: 3, name: 'loading' },
];

export function setupLighting(scene) {
  const rig = new THREE.Group();
  rig.name = 'lighting';

  // overcast sky dome: cool from above, snow-bounce from below. Carries the
  // rooms whose point lights fall outside the preset budget (audit 1: every
  // room must stay combat-readable at the 'high' 12-light preset).
  const hemi = new THREE.HemisphereLight(0xc2d4e2, 0x646b73, 1.32);
  rig.add(hemi);

  // low SE winter sun — pools through the south/east glazing
  const sun = new THREE.DirectionalLight(0xd8e4f0, 1.9);
  sun.position.set(74, 26, 66);
  sun.target.position.set(32, 0, 20);
  rig.add(sun);
  rig.add(sun.target);
  const q = qualityPreset();
  sun.castShadow = q.shadows;
  sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 190;
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
  const SKY = 0x93a8bc; // colder blizzard-overcast
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 28, 130);

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
        hemi.intensity = 1.32; sun.intensity = 1.9; sun.color.set(0xd8e4f0);
        const src = [...INTERIOR_LIGHTS].sort((a, b) => a.pr - b.pr);
        points.forEach((p, idx) => { p.intensity = src[idx].i; p.color.set(src[idx].c); });
        scene.background = new THREE.Color(SKY);
        scene.fog.color.set(SKY);
        scene.fog.near = 28; scene.fog.far = 130;
      }
    },
    dispose() { scene.remove(rig); },
  };
  return api;
}
