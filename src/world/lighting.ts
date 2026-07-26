import * as THREE from 'three';
import type { Engine } from '../core/engine';

export type LightScenario = 'day' | 'emergency' | 'service' | 'neutral';

/** Ceiling fixture positions (shared with the prop pass so emissive fixture
 * meshes align exactly with the actual light sources). kind: troffer = office
 * fluorescent, pendant = warm hanging, high = industrial bay, sconce = wall. */
export const LIGHT_FIXTURES: { x: number; y: number; z: number; kind: 'troffer' | 'pendant' | 'high' | 'tube' }[] = [
  { x: 19, y: 6.02, z: 11, kind: 'pendant' },
  { x: 15, y: 6.02, z: 15, kind: 'pendant' },
  { x: 9, y: 2.62, z: 11.5, kind: 'troffer' },
  { x: 9, y: 2.62, z: 17, kind: 'troffer' },
  { x: 31, y: 2.62, z: 8, kind: 'troffer' },
  { x: 42, y: 2.62, z: 8, kind: 'troffer' },
  { x: 51, y: 2.62, z: 10.5, kind: 'troffer' },
  { x: 45, y: 2.52, z: 14, kind: 'tube' },
  { x: 34, y: 2.52, z: 14, kind: 'troffer' },
  { x: 38, y: 2.52, z: 14, kind: 'troffer' },
  { x: 18, y: 2.62, z: 19.5, kind: 'troffer' },
  { x: 30, y: 2.62, z: 19.5, kind: 'troffer' },
  { x: 42, y: 2.62, z: 19.5, kind: 'troffer' },
  { x: 16, y: 2.62, z: 23.5, kind: 'troffer' },
  { x: 16, y: 2.62, z: 29.5, kind: 'troffer' },
  { x: 16, y: 2.62, z: 35.5, kind: 'troffer' },
  { x: 24, y: 2.82, z: 25.5, kind: 'troffer' },
  { x: 32, y: 2.82, z: 25.5, kind: 'troffer' },
  { x: 24, y: 2.82, z: 33.5, kind: 'troffer' },
  { x: 32, y: 2.82, z: 33.5, kind: 'troffer' },
  { x: 38, y: 2.62, z: 25.5, kind: 'troffer' },
  { x: 44, y: 3.32, z: 25.5, kind: 'high' },
  { x: 40, y: 4.1, z: 34, kind: 'high' },
  { x: 47, y: 4.1, z: 34, kind: 'high' },
  { x: 51, y: 2.42, z: 22, kind: 'tube' },
  { x: 52, y: 2.9, z: 34, kind: 'tube' },
  { x: 29, y: 3.4, z: 14, kind: 'tube' },
  { x: 29, y: 6.0, z: 12, kind: 'tube' },
  { x: 31, y: 6.02, z: 8, kind: 'troffer' },
  { x: 41, y: 6.02, z: 8, kind: 'troffer' },
  { x: 38, y: 6.02, z: 14, kind: 'pendant' },
  { x: 49, y: 6.02, z: 12, kind: 'pendant' },
  { x: 9, y: 6.02, z: 13, kind: 'troffer' },
  { x: 19, y: 6.02, z: 8, kind: 'troffer' },
  { x: 9, y: 3.16, z: 7.5, kind: 'tube' },
  { x: 16, y: 3.18, z: 8, kind: 'tube' },
  { x: 22, y: 3.18, z: 8, kind: 'tube' },
];

interface FixtureLight {
  light: THREE.PointLight | THREE.SpotLight;
  base: number;
  priority: number; // 0 = always on, 1 = high quality only
  scenarioMult: Record<LightScenario, number>;
}

/**
 * Lighting rig (Fable 2 placement, Fable 1 color script):
 * cold daylight + snow bounce through glass, neutral-green fluorescents,
 * warm accents, dark navigable service spaces, emissive accents elsewhere.
 */
export class LightingRig {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private fixtures: FixtureLight[] = [];
  scenario: LightScenario = 'day';

  constructor() {
    this.group.name = 'lighting';
    this.hemi = new THREE.HemisphereLight(0xc4d6e8, 0x4a5058, 0.62);
    this.group.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xd8e6f4, 2.6);
    this.sun.position.set(14, 30, 58);            // low south sun through cubicle/curtain glass
    this.sun.target.position.set(28, 0, 16);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // tight frustum follows the player (fewer shadow casters per frame + denser texels)
    const R = 15;
    this.sun.shadow.camera.left = -R;
    this.sun.shadow.camera.right = R;
    this.sun.shadow.camera.top = R;
    this.sun.shadow.camera.bottom = -R;
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(this.sun, this.sun.target);

    const P = (
      x: number, y: number, z: number, color: number, intensity: number, dist: number,
      priority = 0, scen: Partial<Record<LightScenario, number>> = {},
    ): void => {
      const l = new THREE.PointLight(color, intensity, dist, 1.8);
      l.position.set(x, y, z);
      this.group.add(l);
      this.fixtures.push({
        light: l, base: intensity, priority,
        scenarioMult: { day: 1, emergency: 0.12, service: 0.35, neutral: 1, ...scen },
      });
    };

    const FLUOR = 0xeef2ea; // slightly green office fluorescent
    const WARM = 0xffd9a6;
    const COOLDAY = 0xcfe2f2;
    const SODIUM = 0xffb46b;
    const CYAN = 0x59d5e8;
    const RED = 0xff5040;

    // Lobby (two-story): cool daylight volume + warm reception accent
    P(19, 4.6, 11, COOLDAY, 55, 17);
    P(22.5, 2.6, 15.2, WARM, 16, 7);
    P(15, 4.4, 15, FLUOR, 26, 11, 1);
    P(19, 3.0, 8, FLUOR, 12, 8);        // under-balcony soffit lights
    P(19, 5.75, 12.5, COOLDAY, 13, 9, 1); // void ceiling wash
    // Vestibule & security
    P(9, 2.3, 11.5, FLUOR, 13, 7);
    P(9, 2.3, 17, FLUOR, 12, 7, 1);
    // North corridor: two neutral tubes
    P(31, 2.4, 8, FLUOR, 16, 9);
    P(42, 2.4, 8, FLUOR, 16, 9);
    // IT + server
    P(51, 2.3, 10.5, FLUOR, 15, 8);
    P(45, 2.2, 14, CYAN, 9, 7, 0, { emergency: 0.8 });
    // Restrooms/janitor (shared spill)
    P(34, 2.3, 14, FLUOR, 11, 7, 1);
    P(38, 2.3, 14, FLUOR, 11, 7, 1);
    // Main hall: three fixtures along spine
    P(18, 2.4, 19.5, FLUOR, 15, 9);
    P(30, 2.4, 19.5, FLUOR, 15, 9);
    P(42, 2.4, 19.5, FLUOR, 15, 9);
    // Waiting + break + wellness (warmer)
    P(16, 2.4, 23.5, WARM, 13, 8);
    P(16, 2.4, 29.5, WARM, 14, 8);
    P(16, 2.4, 35.5, FLUOR, 12, 7, 1);
    // Cubicles: 4-grid neutral
    P(24, 2.6, 25.5, FLUOR, 17, 10);
    P(32, 2.6, 25.5, FLUOR, 17, 10);
    P(24, 2.6, 33.5, FLUOR, 17, 10);
    P(32, 2.6, 33.5, FLUOR, 17, 10);
    // Copy
    P(38, 2.4, 25.5, FLUOR, 12, 7, 1);
    // Loading (cool metal halide feel)
    P(44, 3.1, 25.5, 0xdfe8ee, 16, 10);
    // Garage: sodium warmth for contrast
    P(40, 3.8, 34, SODIUM, 20, 11, 0, { emergency: 0.5 });
    P(47, 3.8, 34, SODIUM, 18, 11);
    // Service corridor: dim green-ish maintenance light + red exit accents
    P(51, 2.2, 22, 0xd8e6d4, 7, 7, 0, { service: 1, day: 0.7 });
    P(52, 2.6, 34, FLUOR, 10, 8);
    // Stairwell shaft
    P(29, 3.2, 14, FLUOR, 13, 8);
    P(29, 5.6, 12, COOLDAY, 10, 8, 1);
    // Upper floor
    P(31, 6.0, 8, FLUOR, 15, 9);
    P(41, 6.0, 8, FLUOR, 14, 9);
    P(38, 5.9, 14, WARM, 17, 10);        // conference pendants
    P(49, 5.9, 12, WARM, 16, 9);         // exec office lamps
    P(9, 5.9, 13, FLUOR, 15, 9);         // records
    P(19, 5.9, 8, COOLDAY, 13, 9, 1);    // balcony
    // Entrance canopy + courtyard accent
    P(9, 3.0, 7.5, COOLDAY, 12, 8);
    // Emergency-scenario red beacons (off in day)
    P(30, 2.5, 19.5, RED, 0, 10, 0, { day: 0, emergency: 1, service: 0, neutral: 0 });
    P(19, 4.4, 12, RED, 0, 12, 0, { day: 0, emergency: 1, service: 0, neutral: 0 });

    this.applyScenario('day');
  }

  applyQuality(maxLights: number): void {
    let on = 0;
    for (const f of this.fixtures) {
      const allowed = f.priority === 0 || on < maxLights;
      f.light.visible = allowed && (f.base * f.scenarioMult[this.scenario] > 0.01 || f.scenarioMult[this.scenario] > 0);
      if (f.light.visible) on++;
    }
  }

  applyScenario(s: LightScenario): void {
    this.scenario = s;
    for (const f of this.fixtures) {
      const mult = f.scenarioMult[s];
      f.light.intensity = (f.base === 0 ? 14 : f.base) * mult;
      f.light.visible = f.light.intensity > 0.05 && f.light.visible !== false;
    }
    if (s === 'emergency') {
      this.hemi.intensity = 0.22;
      this.sun.intensity = 1.6;
    } else if (s === 'service') {
      this.hemi.intensity = 0.35;
      this.sun.intensity = 2.0;
    } else if (s === 'neutral') {
      this.hemi.intensity = 0.85;
      this.sun.intensity = 1.4;
    } else {
      this.hemi.intensity = 0.62;
      this.sun.intensity = 2.6;
    }
  }

  attach(engine: Engine): void {
    engine.scene.add(this.group);
    this.sun.shadow.mapSize.set(engine.profile.shadowMapSize, engine.profile.shadowMapSize);
  }

  private sunDir = new THREE.Vector3(14 - 28, 30, 58 - 16).normalize();

  /** center the sun shadow frustum on the player, snapped to texel grid */
  followTarget(pos: THREE.Vector3): void {
    const R = 15;
    const texel = (R * 2) / Math.max(1, this.sun.shadow.mapSize.x);
    const tx = Math.round(pos.x / texel) * texel;
    const tz = Math.round(pos.z / texel) * texel;
    this.sun.target.position.set(tx, 0, tz);
    this.sun.position.set(tx + this.sunDir.x * 55, this.sunDir.y * 55 * (55 / 55), tz + this.sunDir.z * 55);
    this.sun.target.updateMatrixWorld();
  }
}
