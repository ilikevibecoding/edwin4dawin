import * as THREE from 'three';
import { ROOMS, INTERIOR_ROOMS, ROOM_BY_ID, FLOOR_Y } from './layout.js';
import * as KIT from './kit.js';
import { box, bevelBox, cyl, plane, matrixFrom } from '../art/geometry.js';
import { C, LIGHT_PLAN } from '../art/palette.js';
import { makeRng } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * LIGHTING PLAN
 * Owner: Fable 1 (colour script) with Fable 2 (fixture placement).
 *
 * Four light families, never mixed arbitrarily:
 *   exterior  cold storm daylight + snow bounce           (5200-6800K feel)
 *   fluoro    slightly green commercial troffers          (4000K, faintly green)
 *   warm      desk lamps and occupied rooms               (2700K)
 *   emergency amber bulkheads + green exit signage        (service spine)
 *
 * Visible fixtures are static emissive geometry so they always read. Actual
 * illumination comes from a pooled set of point lights: the N nearest emitters
 * to the camera are bound to real lights each frame, which keeps the shader
 * light count inside the budget of the selected quality preset.
 */

const RECIPES = {
  lobby: { fixture: 'downlight', spacing: 4.2, color: C.fluoroCool, intensity: 5.5, range: 12, height: 6.6, accentWarm: true },
  vestibule: { fixture: 'troffer', spacing: 2.4, color: C.fluoro, intensity: 3.0, range: 7 },
  waiting: { fixture: 'downlight', spacing: 3.0, color: C.tungsten, intensity: 3.2, range: 8 },
  corridor: { fixture: 'troffer', spacing: 4.0, color: C.fluoro, intensity: 3.4, range: 8.5 },
  corridorWest: { fixture: 'troffer', spacing: 4.5, color: C.fluoroCool, intensity: 2.8, range: 8 },
  service: { fixture: 'batten', spacing: 5.0, color: C.fluoroCool, intensity: 2.2, range: 7, emergency: true },
  openplan: { fixture: 'troffer', spacing: 3.2, color: C.fluoro, intensity: 3.2, range: 8 },
  conference: { fixture: 'downlight', spacing: 2.6, color: C.fluoro, intensity: 2.6, range: 7, accentWarm: true },
  breakroom: { fixture: 'troffer', spacing: 3.0, color: C.fluoro, intensity: 2.8, range: 7.5, accentWarm: true },
  copy: { fixture: 'troffer', spacing: 3.0, color: C.fluoro, intensity: 3.0, range: 7 },
  restroom: { fixture: 'downlight', spacing: 2.2, color: C.fluoroCool, intensity: 2.4, range: 6 },
  archive: { fixture: 'batten', spacing: 3.6, color: C.fluoroCool, intensity: 2.4, range: 7 },
  it: { fixture: 'troffer', spacing: 3.2, color: C.fluoro, intensity: 2.8, range: 7 },
  server: { fixture: 'batten', spacing: 3.4, color: C.fluoroCool, intensity: 1.9, range: 6, serverLeds: true },
  stair: { fixture: 'bulkhead', spacing: 3.0, color: C.fluoroCool, intensity: 2.2, range: 7, emergency: true },
  loading: { fixture: 'highbay', spacing: 5.0, color: C.fluoroCool, intensity: 4.5, range: 12, emergency: true },
  garage: { fixture: 'highbay', spacing: 5.0, color: C.fluoroCool, intensity: 4.2, range: 12, emergency: true },
  mezz: { fixture: 'downlight', spacing: 3.4, color: C.fluoroCool, intensity: 2.6, range: 8 },
  exec: { fixture: 'downlight', spacing: 3.2, color: C.fluoro, intensity: 2.8, range: 8, accentWarm: true },
  execOffice: { fixture: 'downlight', spacing: 3.0, color: C.tungsten, intensity: 3.2, range: 8, accentWarm: true },
  boardroom: { fixture: 'downlight', spacing: 2.8, color: C.fluoro, intensity: 2.6, range: 7, accentWarm: true },
  lounge: { fixture: 'downlight', spacing: 3.0, color: C.tungsten, intensity: 3.0, range: 8 },
  exterior: null,
};

/** Emissive-fixture geometry + one emitter record per lamp. */
function fixtureParts(kind, x, y, z, recipe) {
  const parts = [];
  switch (kind) {
    case 'troffer': {
      parts.push(KIT.part(bevelBox(1.18, 0.075, 0.58, 0.008), 'metal.painted', [x, y - 0.038, z]));
      parts.push(KIT.part(box(1.06, 0.02, 0.46), 'emissive.fluoro', [x, y - 0.078, z]));
      break;
    }
    case 'downlight': {
      parts.push(KIT.part(cyl(0.09, 0.105, 0.05, 14), 'metal.brushed', [x, y - 0.025, z]));
      parts.push(KIT.part(cyl(0.072, 0.072, 0.012, 14), 'emissive.fluoro', [x, y - 0.052, z]));
      break;
    }
    case 'batten': {
      parts.push(KIT.part(bevelBox(1.32, 0.07, 0.11, 0.008), 'metal.galvanised', [x, y - 0.035, z]));
      parts.push(KIT.part(cyl(0.026, 0.026, 1.2, 10), 'emissive.fluoro', [x, y - 0.075, z], [0, 0, Math.PI / 2]));
      break;
    }
    case 'bulkhead': {
      parts.push(KIT.part(bevelBox(0.32, 0.18, 0.11, 0.012), 'metal.painted', [x, y, z]));
      parts.push(KIT.part(bevelBox(0.26, 0.13, 0.06, 0.02), 'emissive.fluoro', [x, y, z + 0.05]));
      break;
    }
    case 'highbay': {
      parts.push(KIT.part(cyl(0.3, 0.16, 0.22, 14), 'metal.painted', [x, y - 0.11, z]));
      parts.push(KIT.part(cyl(0.15, 0.15, 0.02, 14), 'emissive.fluoro', [x, y - 0.225, z]));
      parts.push(KIT.part(cyl(0.014, 0.014, 0.4, 6), 'metal.painted', [x, y + 0.2, z]));
      break;
    }
    default:
      break;
  }
  void recipe;
  return parts;
}

export class LightRig {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
    this.pool = [];
    this.parts = [];
    this.colliders = [];
    this.scenario = 'day';
    this._tick = 0;
    this._tmp = new THREE.Vector3();
  }

  build() {
    const rng = makeRng(0x1177);
    /* ---- Sky and sun ---- */
    const hemi = new THREE.HemisphereLight(LIGHT_PLAN.skyColor, LIGHT_PLAN.groundColor, LIGHT_PLAN.hemiIntensity);
    hemi.position.set(0, 30, 0);
    this.scene.add(hemi);
    this.hemi = hemi;

    const sun = new THREE.DirectionalLight(LIGHT_PLAN.sunColor, LIGHT_PLAN.sunIntensity);
    const d = LIGHT_PLAN.sunDirection;
    sun.position.set(-d[0] * 70, -d[1] * 70, -d[2] * 70);
    sun.target.position.set(0, 0, -2);
    sun.castShadow = true;
    const p = settings.preset;
    sun.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
    // The shadow volume follows the player rather than covering the whole map:
    // a 34 m box at 2048 gives ~17 texels per metre instead of ~16 per 1 m at
    // 124 m, which removes shimmer and keeps the shadow pass cheap.
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    // Cold fill from the snow field, keeps shadowed interiors readable
    const ambient = new THREE.AmbientLight(LIGHT_PLAN.ambientColor, LIGHT_PLAN.ambientIntensity);
    this.scene.add(ambient);
    this.ambient = ambient;

    const bounce = new THREE.DirectionalLight(C.windowBounce, 0.42);
    bounce.position.set(20, 8, -60);
    bounce.target.position.set(0, 0, 0);
    this.scene.add(bounce);
    this.scene.add(bounce.target);
    this.bounce = bounce;

    this.scene.fog = new THREE.Fog(LIGHT_PLAN.fogColor, LIGHT_PLAN.fogNear, LIGHT_PLAN.fogFar);

    /* ---- Room fixtures ---- */
    for (const room of INTERIOR_ROOMS) {
      const recipe = RECIPES[room.light];
      if (!recipe) continue;
      const y = FLOOR_Y[room.floor] + Math.min(room.ceilH, room.ceiling === 'open' ? 3.2 : room.ceilH) - 0.02;
      const w = room.x1 - room.x0;
      const dd = room.z1 - room.z0;
      const nx = Math.max(1, Math.round(w / recipe.spacing));
      const nz = Math.max(1, Math.round(dd / recipe.spacing));
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const x = room.x0 + (w * (i + 0.5)) / nx;
          const z = room.z0 + (dd * (j + 0.5)) / nz;
          this.parts.push(...fixtureParts(recipe.fixture, x, y, z, recipe));
          // The emitter sits well below the fitting: a point light 0.14 m from
          // the soffit blows the ceiling to pure white and makes the tile
          // texture disappear. 0.55 m keeps the floor lit and the ceiling read.
          this.emitters.push({
            x, y: y - 0.55, z, color: recipe.color, intensity: recipe.intensity,
            range: recipe.range, room: room.id, family: 'fluoro', on: true,
          });
        }
      }
      if (recipe.emergency) {
        const ex = room.x0 + w * 0.5;
        const ez = room.z0 + 0.28;
        const ey = FLOOR_Y[room.floor] + 2.45;
        this.parts.push(KIT.part(bevelBox(0.3, 0.14, 0.1, 0.012), 'metal.painted', [ex, ey, ez]));
        this.parts.push(KIT.part(bevelBox(0.09, 0.07, 0.05, 0.014), 'emissive.emergency', [ex - 0.08, ey, ez + 0.05]));
        this.parts.push(KIT.part(bevelBox(0.09, 0.07, 0.05, 0.014), 'emissive.emergency', [ex + 0.08, ey, ez + 0.05]));
        this.emitters.push({ x: ex, y: ey - 0.1, z: ez + 0.4, color: C.emergencyAmber, intensity: 1.6, range: 5, room: room.id, family: 'emergency', on: true });
      }
      if (room.ceilH > 5) {
        // Double-height volumes need a mid-height wash or the floor reads black
        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < nz; j++) {
            const x = room.x0 + (w * (i + 0.5)) / nx;
            const z = room.z0 + (dd * (j + 0.5)) / nz;
            this.emitters.push({
              x, y: FLOOR_Y[room.floor] + 3.6, z, color: recipe.color,
              intensity: recipe.intensity * 0.55, range: recipe.range,
              room: room.id, family: 'fluoro', on: true,
            });
          }
        }
      }
      if (recipe.accentWarm) {
        const ax = room.x0 + w * (0.25 + rng() * 0.5);
        const az = room.z0 + dd * (0.25 + rng() * 0.5);
        this.emitters.push({ x: ax, y: FLOOR_Y[room.floor] + 1.15, z: az, color: C.tungsten, intensity: 1.4, range: 4.5, room: room.id, family: 'warm', on: true });
      }
    }

    /* ---- Exit signage over every escape route ---- */
    const exits = [
      [0, 2.62, -16.2, 0], [-6.6, 2.62, -9.1, 0], [4.6, 2.62, -9.1, 0],
      [-18.9, 2.62, -5.2, 0], [-22.5, 2.62, 15.2, 0], [22.5, 2.62, 15.2, 0],
      [0, 2.62, 14.8, 0], [3.4, 2.62, 11.7, 0], [26.9, 3.2, 5.2, 0],
      [-18.9, 6.82, -5.2, 0], [3.4, 6.82, 11.7, 0], [0, 6.82, -8.9, 0],
    ];
    for (const [x, y, z] of exits) {
      this.parts.push(KIT.part(bevelBox(0.42, 0.2, 0.045, 0.01), 'metal.brushed', [x, y, z]));
      this.parts.push(KIT.part(box(0.38, 0.16, 0.014), 'emissive.exit', [x, y, z + 0.028]));
      this.parts.push(KIT.part(box(0.38, 0.16, 0.014), 'emissive.exit', [x, y, z - 0.028]));
      this.emitters.push({ x, y: y - 0.2, z, color: C.exitGreen, intensity: 0.7, range: 2.6, family: 'exit', on: true });
    }

    /* ---- Server room status glow ---- */
    for (let i = 0; i < 6; i++) {
      this.emitters.push({
        x: 12 + i * 1.5, y: 1.5, z: 13.2, color: i % 2 ? C.serverLed : C.serverLedAmber,
        intensity: 0.55, range: 2.4, room: 'server', family: 'led', on: true,
      });
    }

    /* ---- Light pool ---- */
    this._buildPool();
    return { parts: this.parts, colliders: this.colliders };
  }

  _buildPool() {
    for (const l of this.pool) this.scene.remove(l);
    this.pool = [];
    const n = settings.preset.maxDynamicLights;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 1.8);
      l.visible = false;
      l.castShadow = false;
      this.scene.add(l);
      this.pool.push(l);
    }
    // A few shadow-casting lights reserved for the most important spaces
    this.shadowLights = [];
    for (let i = 0; i < settings.preset.localShadowLights; i++) {
      const l = this.pool[i];
      l.castShadow = true;
      l.shadow.mapSize.set(512, 512);
      l.shadow.bias = -0.004;
      l.shadow.camera.near = 0.2;
      l.shadow.camera.far = 14;
      this.shadowLights.push(l);
    }
  }

  setScenario(name) {
    this.scenario = name;
    const presets = {
      day: { sun: LIGHT_PLAN.sunIntensity, hemi: LIGHT_PLAN.hemiIntensity, fluoro: 1, warm: 1, emergency: 1 },
      overcast: { sun: 1.1, hemi: 0.8, fluoro: 1.1, warm: 1, emergency: 1 },
      dusk: { sun: 0.55, hemi: 0.34, fluoro: 1.15, warm: 1.25, emergency: 1.1 },
      blackout: { sun: 0.9, hemi: 0.28, fluoro: 0, warm: 0, emergency: 1.8 },
      neutral: { sun: 1.6, hemi: 1.5, fluoro: 0.6, warm: 0.6, emergency: 0.4 },
    };
    const p = presets[name] ?? presets.day;
    this.sun.intensity = p.sun;
    this.hemi.intensity = p.hemi;
    this.scenarioScale = p;
  }

  setEmittersOn(family, on) {
    for (const e of this.emitters) if (e.family === family) e.on = on;
  }

  update(cameraPos) {
    this._tick++;
    // Keep the sun's shadow volume centred on the player, snapped to a texel
    // grid so the shadow does not crawl as the camera moves.
    if (this.sun) {
      const snap = (48 / settings.preset.shadowMapSize) * 4;
      const tx = Math.round(cameraPos.x / snap) * snap;
      const tz = Math.round(cameraPos.z / snap) * snap;
      if (tx !== this._shadowX || tz !== this._shadowZ) {
        this._shadowX = tx;
        this._shadowZ = tz;
        const d = LIGHT_PLAN.sunDirection;
        this.sun.target.position.set(tx, 0, tz);
        this.sun.position.set(tx - d[0] * 55, -d[1] * 55, tz - d[2] * 55);
        this.sun.target.updateMatrixWorld();
        this.onShadowMoved?.();
      }
    }
    if (this._tick % 4 !== 0) return;
    const scale = this.scenarioScale ?? { fluoro: 1, warm: 1, emergency: 1 };
    const list = [];
    for (const e of this.emitters) {
      if (!e.on) continue;
      const s = scale[e.family] ?? 1;
      if (s <= 0.001) continue;
      const dx = e.x - cameraPos.x;
      const dy = e.y - cameraPos.y;
      const dz = e.z - cameraPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > (e.range + 16) * (e.range + 16)) continue;
      list.push({ e, d2, s });
    }
    list.sort((a, b) => a.d2 - b.d2);
    const n = this.pool.length;
    for (let i = 0; i < n; i++) {
      const l = this.pool[i];
      const item = list[i];
      if (!item) { l.visible = false; l.intensity = 0; continue; }
      l.visible = true;
      l.position.set(item.e.x, item.e.y, item.e.z);
      l.color.setHex(item.e.color);
      l.intensity = item.e.intensity * item.s * LIGHT_PLAN.fluoroIntensity * 0.5;
      l.distance = item.e.range;
      l.decay = 1.35;
    }
  }

  qualityChanged() {
    this._buildPool();
    if (this.sun) this.sun.shadow.mapSize.set(settings.preset.shadowMapSize, settings.preset.shadowMapSize);
  }

  report() {
    return {
      emitters: this.emitters.length,
      pool: this.pool.length,
      active: this.pool.filter((l) => l.visible).length,
      scenario: this.scenario,
    };
  }
}

let registered = false;
export function registerLightingManifest() {
  if (registered) return;
  registered = true;
  const base = {
    category: 'lighting', owner: OWNERS.FABLE1,
    files: ['src/map/lighting.js', 'src/art/palette.js'],
    collision: 'none (fixtures merged into the ceiling batch)',
    lod: 'emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset',
    status: 'accepted',
  };
  const items = [
    ['light.troffer', 'Recessed fluorescent troffer', '1.18 × 0.58 × 0.075 m', 'open plan, corridors, copy, IT, vestibule', ['metal.painted', 'emissive.fluoro'], 'Slightly green 4000 K; tube face emissive without blowing out; grid-aligned'],
    ['light.downlight', 'Recessed downlight', '0.21 m dia × 0.05 m', 'lobby, conference, executive, restrooms, waiting', ['metal.brushed', 'emissive.fluoro'], 'Clean pool of light; no banding on the wall wash'],
    ['light.batten', 'Surface batten fitting', '1.32 × 0.11 m', 'archive, server, service spaces', ['metal.galvanised', 'emissive.fluoro'], 'Reads as a bare industrial fitting; tube visible'],
    ['light.bulkhead', 'Stair bulkhead', '0.32 × 0.18 × 0.11 m', 'stairwells', ['metal.painted', 'emissive.fluoro'], 'Wall mounted at 2.4 m; casts a readable pool on the treads'],
    ['light.highbay', 'High-bay pendant', '0.6 m dia × 0.22 m', 'loading, garage', ['metal.painted', 'emissive.fluoro'], 'Suspended on a visible stem; lights the full 5 m bay'],
    ['light.emergency', 'Emergency bulkhead', '0.3 × 0.14 × 0.1 m', 'service corridor, stairs, loading, garage', ['metal.painted', 'emissive.emergency'], 'Amber twin-spot; visible in the blackout lighting scenario'],
    ['light.exitsign', 'Exit sign', '0.42 × 0.2 m double sided', 'all escape routes', ['metal.brushed', 'emissive.exit'], 'Legible from 12 m; green face on both sides; original pictogram'],
    ['light.sun', 'Storm daylight key', 'directional, 62 m shadow ortho', 'whole map', ['n/a'], 'Cold 6500 K key with stable shadows and no peter-panning'],
    ['light.snowbounce', 'Snow bounce fill', 'directional fill', 'north and east glazing', ['n/a'], 'Lifts interior shadow without flattening contrast'],
  ];
  for (const [id, name, dimensions, usedIn, materials, acceptance] of items) {
    reg({
      ...base, id, name, dimensions, usedIn, materials,
      pivot: 'fixture centre at ceiling plane, +Y up',
      textures: ['baseColor', 'emissive'],
      acceptance,
      evidence: ['screenshots/lighting/*.png'],
    });
  }
}

export { RECIPES as LIGHT_RECIPES };
void ROOMS; void ROOM_BY_ID; void plane; void matrixFrom;
