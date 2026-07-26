// Coherent lighting plan (Fable 2 places, Fable 1 sets palette):
// cold winter sun + sky/snow-bounce hemisphere + per-room fixture fills with distance-based
// enablement to respect the light budget. Scenarios support QA (neutral/dark/emergency).
import * as THREE from 'three';
import { FLOORS, ROOMS } from './layout.js';

const ZONE_LIGHT = {
  lobby:   { color: 0xdfe9f0, intensity: 26, every: 18, warm: false },
  office:  { color: 0xdcE8d8, intensity: 22, every: 16, warm: false },
  service: { color: 0xc9d0d6, intensity: 14, every: 22, warm: false },
  server:  { color: 0x8fb8e6, intensity: 16, every: 14, warm: false },
  exec:    { color: 0xf2ddba, intensity: 20, every: 14, warm: true },
  break:   { color: 0xefe3c8, intensity: 20, every: 14, warm: true },
  rr:      { color: 0xe4ecee, intensity: 16, every: 12, warm: false },
  garage:  { color: 0xcdd6dc, intensity: 18, every: 20, warm: false },
  exterior: null,
};

export function placeLights(map) {
  const scene = map.scene;
  const state = { scenario: 'production', fills: [], hemi: null, sun: null, emergency: [] };

  // Sky / snow bounce (bright overcast winter day)
  const hemi = new THREE.HemisphereLight(0xc4d8ec, 0x6a6a66, 1.25);
  scene.add(hemi);
  state.hemi = hemi;

  // Cold low winter sun from the south-west, raking through the curtain walls
  const sun = new THREE.DirectionalLight(0xd8e8ff, 3.2);
  sun.position.set(2, 38, 85);
  sun.target.position.set(24, 0, 14);
  sun.castShadow = true;
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 160;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  state.sun = sun;

  // Per-room ceiling fixture fills
  for (const room of ROOMS) {
    const zone = ZONE_LIGHT[room.light];
    if (!zone) continue;
    const f = FLOORS[room.floor];
    const ceilY = f.y + f.ceil - 0.55;
    for (const rc of room.rects) {
      const [x0, z0, x1, z1] = rc;
      const area = (x1 - x0) * (z1 - z0);
      const count = Math.max(1, Math.round(area / zone.every));
      const cols = Math.max(1, Math.round(Math.sqrt(count * (x1 - x0) / Math.max(1, z1 - z0))));
      const rows = Math.max(1, Math.ceil(count / cols));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = x0 + ((i + 0.5) / cols) * (x1 - x0);
          const z = z0 + ((j + 0.5) / rows) * (z1 - z0);
          const light = new THREE.PointLight(zone.color, zone.intensity, 11, 1.7);
          light.position.set(x, ceilY, z);
          light.visible = false;
          scene.add(light);
          state.fills.push({ light, base: zone.intensity, room: room.id });
        }
      }
    }
  }

  let lastSort = -1;
  const api = {
    update(camPos, profile, timeSec) {
      if (timeSec - lastSort < 0.25) return;
      lastSort = timeSec;
      const budget = state.scenario === 'dark' ? 0 : (profile?.fillLights ?? 16);
      for (const f of state.fills) {
        f.d2 = (f.light.position.x - camPos.x) ** 2 + (f.light.position.y - camPos.y) ** 2 + (f.light.position.z - camPos.z) ** 2;
      }
      state.fills.sort((a, b) => a.d2 - b.d2);
      for (let i = 0; i < state.fills.length; i++) {
        state.fills[i].light.visible = i < budget && state.fills[i].d2 < 900;
      }
    },
    applyQuality(profile) {
      const size = profile.shadowSize;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    },
    setScenario(name) {
      state.scenario = name;
      if (name === 'neutral') {
        hemi.intensity = 2.4; sun.intensity = 1.2;
        for (const f of state.fills) f.light.intensity = f.base * 0.5;
      } else if (name === 'dark') {
        hemi.intensity = 0.12; sun.intensity = 0.25;
      } else if (name === 'emergency') {
        hemi.intensity = 0.18; sun.intensity = 0.4;
        for (const f of state.fills) { f.light.color.setHex(0xff4433); f.light.intensity = f.base * 0.4; }
      } else {
        hemi.intensity = 1.25; sun.intensity = 3.2;
        for (const f of state.fills) {
          const zone = ZONE_LIGHT[ROOMS.find((r) => r.id === f.room)?.light];
          if (zone) { f.light.color.setHex(zone.color); f.light.intensity = zone.base ?? f.base; }
        }
      }
    },
    scenario: () => state.scenario,
    sun, hemi, fills: state.fills,
  };
  return api;
}
