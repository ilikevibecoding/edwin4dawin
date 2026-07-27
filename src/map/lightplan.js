// Coherent lighting plan (Fable 2 places, Fable 1 sets palette):
// cold winter sun + sky/snow-bounce hemisphere + per-room fixture fills with distance-based
// enablement to respect the light budget. Scenarios support QA (neutral/dark/emergency).
// fixturePlan() is shared with ceilings.js so emissive fixture geometry matches light positions.
import * as THREE from 'three';
import { FLOORS, ROOMS, VOIDS } from './layout.js';

export const ZONE_LIGHT = {
  lobby:   { color: 0xdfe9f0, intensity: 26, every: 18, warm: false },
  office:  { color: 0xdcE8d8, intensity: 22, every: 16, warm: false },
  service: { color: 0xcdd4da, intensity: 24, every: 15, warm: false },
  // server runs moody per the visual bible: sparse dim blue-cyan fills, the prop rack LEDs
  // (+ rack-glow accents below) carry the room; hemi keeps silhouettes readable
  server:  { color: 0x7fc0e4, intensity: 9, every: 18, warm: false },
  exec:    { color: 0xf2ddba, intensity: 20, every: 14, warm: true },
  break:   { color: 0xefe3c8, intensity: 20, every: 14, warm: true },
  rr:      { color: 0xe4ecee, intensity: 18, every: 12, warm: false },
  security: { color: 0xc3ccd4, intensity: 11, every: 26, warm: false }, // NS-11: monitor glow carries this room
  garage:  { color: 0xd2dae0, intensity: 30, every: 13, warm: false },
  exterior: null,
};

// Accent practicals (registered as budget-managed fills alongside the ceiling grid):
// server rack-glow, warm pockets in break/exec, reception brand wall wash.
const ACCENTS = [
  { room: 'server', x: 41.0, y: 1.7, z: 3.2, color: 0x54c4e8, intensity: 20, dist: 8 },
  { room: 'server', x: 44.5, y: 1.7, z: 6.2, color: 0x54c4e8, intensity: 18, dist: 8 },
  { room: 'break', x: 2.2, y: 1.9, z: 17.0, color: 0xe8b45f, intensity: 9, dist: 6 },
  { room: 'exec', x: 44.0, y: 4.9, z: 21.0, color: 0xe8b45f, intensity: 8, dist: 6 },
  { room: 'lobby', x: 17.0, y: 2.6, z: 24.9, color: 0xbfdcec, intensity: 10, dist: 6.5 }, // brand wall wash
  // Warm pools readable through the south curtain wall from the title drift (WP-011c #6):
  // receptionist desk lamp + front-lounge and visitor-lounge pools give the facade its
  // warm-vs-cold contrast from the plaza. Within the 30 m enablement cutoff of the drift path.
  { room: 'lobby', x: 21.8, y: 1.3, z: 25.6, color: 0xe8b45f, intensity: 10, dist: 5.5 },  // reception desk lamp
  { room: 'lobby', x: 27.0, y: 1.4, z: 34.2, color: 0xe8b45f, intensity: 9, dist: 5 },     // lobby front lounge
  { room: 'wait', x: 35.5, y: 1.4, z: 33.0, color: 0xe8b45f, intensity: 9, dist: 5 },      // visitor lounge
  // the drift band mostly shows the F1 mezz glass over the site wall — pools there carry
  // the warm read for the far half of the pan
  { room: 'mezz', x: 18.0, y: 5.0, z: 34.2, color: 0xe8b45f, intensity: 10, dist: 5.5 },   // mezz gallery south
  { room: 'mezz', x: 31.0, y: 5.0, z: 34.2, color: 0xe8b45f, intensity: 9, dist: 5 },      // mezz gallery east
];

/** Deterministic per-room ceiling-fixture grid. Shared by lights and fixture geometry. */
export function fixturePlan() {
  const out = [];
  for (const room of ROOMS) {
    const zone = ZONE_LIGHT[room.light];
    if (!zone) continue;
    const f = FLOORS[room.floor];
    // Open stair shafts (ceilMat 'none') have no ceiling to hang fixtures from: light them from
    // the two vapor-tight wall packs (see structures.js#stairFinish) instead of a floating grid,
    // at reduced intensity — the upper-floor stair room contributes its own deck strips.
    if (room.ceilMat === 'none') {
      const [x0, z0, x1, z1] = room.rects[0];
      for (const z of [z0 + 0.5, z1 - 0.5]) {
        // 12 → 8 (WP-011c): the upper shaft wall still veiled toward white in the tour set
        out.push({ room, zone, x: (x0 + x1) / 2, z, ceilY: f.y + 3.05, floor: room.floor, overVoid: false, intensity: 8, dist: 8 });
      }
      continue;
    }
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
          let overVoid = false;
          if (room.floor === 0) {
            for (const v of VOIDS) {
              if (v.floor === 1 && x >= v.rect[0] && x <= v.rect[2] && z >= v.rect[1] && z <= v.rect[3]) overVoid = true;
            }
          }
          // Upper stair rooms are small shafts with bright walls — full service intensity blows out.
          const intensity = room.stairTop ? 10 : undefined;
          out.push({ room, zone, x, z, ceilY: f.y + f.ceil, floor: room.floor, overVoid, intensity });
        }
      }
    }
  }
  return out;
}

export function placeLights(map) {
  const scene = map.scene;
  const state = { scenario: 'production', fills: [], hemi: null, sun: null, emergency: [] };

  // Sky / snow bounce (bright overcast winter day)
  const hemi = new THREE.HemisphereLight(0xc4d8ec, 0x8f8d88, 1.3);
  scene.add(hemi);
  state.hemi = hemi;

  // Cold low winter sun from the south-west, raking through the curtain walls.
  // 2.6 keeps the snow bright without clipping interior walls the rake lands on
  // (brand wall, stair shafts) to pure white.
  const sun = new THREE.DirectionalLight(0xd8e8ff, 2.6);
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

  const addFill = (x, y, z, color, intensity, dist, roomId) => {
    const light = new THREE.PointLight(color, intensity, dist, 1.7);
    light.position.set(x, y, z);
    light.visible = false;
    scene.add(light);
    state.fills.push({ light, base: intensity, color, room: roomId });
  };

  // Per-room ceiling fixture fills (positions shared with the emissive fixture geometry).
  for (const fx of fixturePlan()) {
    // Fixtures over the atrium void are skipped; the skylight + lobby ring cover that volume.
    if (fx.overVoid) continue;
    addFill(fx.x, fx.ceilY - 0.55, fx.z, fx.zone.color, fx.intensity ?? fx.zone.intensity, fx.dist ?? 11, fx.room.id);
  }
  // Accent practicals
  for (const a of ACCENTS) addFill(a.x, a.y, a.z, a.color, a.intensity, a.dist, a.room);

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
        hemi.intensity = 1.25; sun.intensity = 2.6;
        for (const f of state.fills) { f.light.color.setHex(f.color); f.light.intensity = f.base; }
      }
    },
    scenario: () => state.scenario,
    sun, hemi, fills: state.fills,
  };
  return api;
}
