import * as THREE from 'three';
import { clamp, clamp01, damp, lerp, remap, smoothstep, TAU, Rng } from '../core/math';
import { Noise2D } from '../core/noise';
import { foliageUniforms } from './props';
import { WaveField } from './waves';
import { ATMOSPHERE_GLSL } from './atmosphere.glsl';

/** Half-extent of the playable sea, in metres. */
export const WORLD_EXTENT = 2400;

export interface SharedUniforms {
  uTime: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uMoonDir: { value: THREE.Vector3 };
  uMoonColor: { value: THREE.Color };
  uSkyZenith: { value: THREE.Color };
  uSkyHorizon: { value: THREE.Color };
  uSkyGround: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogDensity: { value: number };
  uNightFactor: { value: number };
  uStorm: { value: number };
  uCloudCover: { value: number };
  uWaveDir: { value: THREE.Vector4[] };
  uWavePhase: { value: THREE.Vector4[] };
  uWaveTime: { value: number };
  uHeightMap: { value: THREE.Texture | null };
  uWorldExtent: { value: number };
}

interface SkyKey {
  /** Sun elevation (sunDir.y) this key applies at. */
  elevation: number;
  zenith: number;
  horizon: number;
  ground: number;
  sun: number;
  sunIntensity: number;
  ambient: number;
  fog: number;
  fogDensity: number;
}

/** Keyed on sun elevation, from deep night up to high noon. */
const SKY_KEYS: SkyKey[] = [
  {
    elevation: -0.55,
    zenith: 0x04070f,
    horizon: 0x0a1524,
    ground: 0x04070d,
    sun: 0x2c3f63,
    sunIntensity: 0.06,
    ambient: 0.12,
    fog: 0x0a1420,
    fogDensity: 0.00042,
  },
  {
    elevation: -0.16,
    zenith: 0x0a1730,
    horizon: 0x27314f,
    ground: 0x070d18,
    sun: 0x6c5a72,
    sunIntensity: 0.16,
    ambient: 0.2,
    fog: 0x1a2338,
    fogDensity: 0.00055,
  },
  {
    elevation: -0.02,
    zenith: 0x24406e,
    horizon: 0xd4703c,
    ground: 0x101c2c,
    sun: 0xff8b46,
    sunIntensity: 0.75,
    ambient: 0.36,
    fog: 0x6c5a63,
    fogDensity: 0.0006,
  },
  {
    elevation: 0.14,
    zenith: 0x2f6ba8,
    horizon: 0xf0b070,
    ground: 0x16304a,
    sun: 0xffc178,
    sunIntensity: 1.6,
    ambient: 0.5,
    fog: 0xa8a08c,
    fogDensity: 0.00062,
  },
  {
    elevation: 0.45,
    zenith: 0x2a72c4,
    horizon: 0x9fd4e8,
    ground: 0x2c6f88,
    sun: 0xfff0cf,
    sunIntensity: 2.5,
    ambient: 0.72,
    fog: 0xc4e0ea,
    fogDensity: 0.00052,
  },
  {
    elevation: 0.95,
    zenith: 0x1f68c8,
    horizon: 0xbfe4f2,
    ground: 0x2f7f96,
    sun: 0xfffaf0,
    sunIntensity: 3.0,
    ambient: 0.85,
    fog: 0xd2eaf2,
    fogDensity: 0.00046,
  },
];

const STORM_TINT = new THREE.Color(0x2c3a44);
/** Colour of light bouncing off shallow tropical water onto hulls and sails. */
const WATER_BOUNCE = new THREE.Color(0x3fd0c6);

/**
 * Owns the sky dome, sun/moon lighting, the day/night cycle, wind and storms,
 * and the uniform block every custom material in the game samples from.
 */
export class Environment {
  readonly uniforms: SharedUniforms;
  readonly waves = new WaveField();

  readonly sun = new THREE.DirectionalLight(0xffffff, 2.4);
  readonly moon = new THREE.DirectionalLight(0x8fa8d8, 0.12);
  readonly hemi = new THREE.HemisphereLight(0xbfe4f2, 0x1d4a66, 0.7);

  /** Hours, 0-24. Starts mid-morning. */
  timeOfDay = 9.2;
  /** Real seconds per in-game hour. A full day is ~24 minutes by default. */
  secondsPerHour = 60;

  windAngle = 0.8;
  windSpeed = 0.62;

  storm = {
    active: false,
    intensity: 0,
    center: new THREE.Vector2(1400, -900),
    velocity: new THREE.Vector2(9, 5),
    radius: 620,
    timer: 150,
  };
  /** Storm intensity where the listener is, 0..1. */
  localStorm = 0;
  nightFactor = 0;
  cloudCover = 0.35;

  private skyDome: THREE.Mesh;
  private rain: THREE.LineSegments;
  private rainMaterial: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private envScene: THREE.Scene | null = null;
  private envSunElevation = 99;
  private envTimer = 0;
  private noise = new Noise2D(9182);
  private rng = new Rng(4477);
  private flash = 0;
  private nextLightning = 6;
  private pendingThunder: { delay: number; closeness: number }[] = [];
  private fogColorScratch = new THREE.Color();

  onThunder: (closeness: number) => void = () => {};

  constructor(private scene: THREE.Scene) {
    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uSunColor: { value: new THREE.Color(0xfff0cf) },
      uMoonDir: { value: new THREE.Vector3(-0.4, -0.7, -0.5).normalize() },
      uMoonColor: { value: new THREE.Color(0xc8d8ff) },
      uSkyZenith: { value: new THREE.Color(0x2a72c4) },
      uSkyHorizon: { value: new THREE.Color(0x9fd4e8) },
      uSkyGround: { value: new THREE.Color(0x1d4a66) },
      uFogColor: { value: new THREE.Color(0xc4e0ea) },
      uFogDensity: { value: 0.00052 },
      uNightFactor: { value: 0 },
      uStorm: { value: 0 },
      uCloudCover: { value: 0.35 },
      uWaveDir: { value: this.waves.packedDir },
      uWavePhase: { value: this.waves.packedPhase },
      uWaveTime: { value: 0 },
      uHeightMap: { value: null },
      uWorldExtent: { value: WORLD_EXTENT },
    };

    scene.fog = new THREE.FogExp2(0xc4e0ea, 0.00052);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.045;
    scene.add(this.sun, this.sun.target, this.moon, this.hemi);

    this.skyDome = this.buildSkyDome();
    scene.add(this.skyDome);

    const rainBuilt = this.buildRain();
    this.rain = rainBuilt.mesh;
    this.rainMaterial = rainBuilt.material;
    scene.add(this.rain);

    this.applySkyPalette();
  }

  private buildSkyDome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(6000, 48, 32);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms as unknown as Record<string, THREE.IUniform>,
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldDir = world.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${ATMOSPHERE_GLSL}
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          vec3 col = atmosphere(dir, 1.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1000;
    return mesh;
  }

  /**
   * Rain as GPU-animated line streaks inside a box that follows the camera.
   * Each segment carries its own seed so nothing needs CPU updates.
   */
  private buildRain(): { mesh: THREE.LineSegments; material: THREE.ShaderMaterial } {
    const count = 2600;
    const boxXZ = 46;
    const boxY = 30;
    const positions = new Float32Array(count * 6);
    const seeds = new Float32Array(count * 2);
    const ends = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      const x = this.rng.float(-boxXZ, boxXZ);
      const y = this.rng.float(0, boxY);
      const z = this.rng.float(-boxXZ, boxXZ);
      positions.set([x, y, z, x, y, z], i * 6);
      const seed = this.rng.float(0, 1000);
      seeds.set([seed, seed], i * 2);
      ends.set([0, 1], i * 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: this.uniforms.uTime,
        uStorm: this.uniforms.uStorm,
        uOrigin: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector2(0, 0) },
        uBoxY: { value: boxY },
        uTint: { value: new THREE.Color(0xb9d4e0) },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aEnd;
        uniform float uTime;
        uniform float uStorm;
        uniform vec3 uOrigin;
        uniform vec2 uWind;
        uniform float uBoxY;
        varying float vAlpha;

        void main() {
          float speed = 26.0 + fract(aSeed * 0.371) * 16.0;
          float streak = 0.9 + fract(aSeed * 0.117) * 1.4;
          vec3 p = position;
          float fall = mod(p.y - uTime * speed, uBoxY);
          p.y = fall;
          // Slant the streak into the wind; aEnd picks which end of the segment.
          vec3 dir = normalize(vec3(uWind.x * 0.35, -1.0, uWind.y * 0.35));
          p += dir * streak * aEnd;
          p += uOrigin;
          vAlpha = uStorm * (0.35 + 0.65 * fract(aSeed * 0.532));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint;
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.01) discard;
          gl_FragColor = vec4(uTint, vAlpha * 0.42);
        }
      `,
    });

    const mesh = new THREE.LineSegments(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 20;
    return { mesh, material };
  }

  /**
   * Turns the sky shader into an image-based light. A copy of the dome is
   * rendered into a pre-filtered radiance map and used as `scene.environment`,
   * which is what stops shaded timbers from going black and gives iron fittings
   * something to reflect. Rebuilt only when the sun has moved appreciably.
   */
  attachRenderer(renderer: THREE.WebGLRenderer): void {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();

    // A private scene holding just the sky, so the radiance map sees no geometry.
    this.envScene = new THREE.Scene();
    const dome = this.skyDome.clone();
    // Same shader, but the probe only needs the broad shape of the cloud cover
    // and gets re-rendered as the sun moves, so it marches coarsely.
    const probeMaterial = (this.skyDome.material as THREE.ShaderMaterial).clone();
    probeMaterial.uniforms = this.uniforms as unknown as Record<string, THREE.IUniform>;
    probeMaterial.defines = { ...probeMaterial.defines, CLOUD_STEPS: 5, CLOUD_LIGHT_STEPS: 1 };
    dome.material = probeMaterial;
    dome.position.set(0, 0, 0);
    this.envScene.add(dome);

    this.refreshEnvironmentMap();
  }

  private refreshEnvironmentMap(): void {
    if (!this.pmrem || !this.envScene) return;
    const previous = this.envTarget;
    this.envTarget = this.pmrem.fromScene(this.envScene, 0.02, 100, 20000);
    this.scene.environment = this.envTarget.texture;
    this.envSunElevation = this.uniforms.uSunDir.value.y;
    previous?.dispose();
  }

  /** World-space wind vector on the XZ plane, scaled by current strength. */
  windVector(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(this.windAngle), 0, Math.sin(this.windAngle)).multiplyScalar(this.windSpeed);
  }

  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.timeOfDay = (this.timeOfDay + dt / this.secondsPerHour) % 24;
    this.uniforms.uTime.value += dt;

    this.updateWind(dt);
    this.updateStorm(dt, cameraPosition);

    // Choppier water in storms, plus a slight lift from strong wind.
    const choppiness = 1 + this.localStorm * 1.9 + this.windSpeed * 0.22;
    this.waves.update(dt, this.windAngle, choppiness);
    this.uniforms.uWaveTime.value = this.waves.time;

    this.updateSun();
    this.applySkyPalette();

    // Refresh the radiance map when the light has changed enough to notice.
    this.envTimer += dt;
    if (this.pmrem && this.envTimer > 1.5) {
      const moved = Math.abs(this.uniforms.uSunDir.value.y - this.envSunElevation);
      if (moved > 0.012 || this.envTimer > 12) {
        this.envTimer = 0;
        this.refreshEnvironmentMap();
      }
    }

    // Drive every swaying plant from the live wind.
    foliageUniforms.uTime.value = this.uniforms.uTime.value;
    (foliageUniforms.uWind.value as THREE.Vector2)
      .set(Math.cos(this.windAngle), Math.sin(this.windAngle))
      .multiplyScalar(0.4 + this.windSpeed * 0.8 + this.localStorm * 0.6);

    this.skyDome.position.copy(cameraPosition);
    const rainUniforms = this.rainMaterial.uniforms;
    (rainUniforms.uOrigin.value as THREE.Vector3).set(
      Math.round(cameraPosition.x),
      Math.round(cameraPosition.y) - 8,
      Math.round(cameraPosition.z),
    );
    (rainUniforms.uWind.value as THREE.Vector2).set(Math.cos(this.windAngle), Math.sin(this.windAngle));
    this.rain.visible = this.localStorm > 0.03;
  }

  private updateWind(dt: number): void {
    const t = this.uniforms.uTime.value;
    // Slow noise drift keeps the wind believable but never still.
    const drift = this.noise.fbm(t * 0.0075, 11.4, 3) * 1.5;
    const targetAngle = drift * TAU * 0.5 + t * 0.006;
    this.windAngle += (Math.atan2(Math.sin(targetAngle - this.windAngle), Math.cos(targetAngle - this.windAngle))) * dt * 0.12;
    const gust = this.noise.fbm(t * 0.03, 4.2, 2) * 0.5 + 0.5;
    const target = lerp(0.42, 0.95, gust) + this.localStorm * 0.5;
    this.windSpeed = damp(this.windSpeed, clamp(target, 0.25, 1.5), 0.6, dt);
  }

  private updateStorm(dt: number, cameraPosition: THREE.Vector3): void {
    const s = this.storm;
    s.timer -= dt;

    if (!s.active && s.timer <= 0) {
      s.active = true;
      s.timer = this.rng.float(120, 220);
      const angle = this.rng.float(0, TAU);
      const dist = this.rng.float(700, 1500);
      s.center.set(cameraPosition.x + Math.cos(angle) * dist, cameraPosition.z + Math.sin(angle) * dist);
      const heading = Math.atan2(cameraPosition.z - s.center.y, cameraPosition.x - s.center.x) + this.rng.float(-0.7, 0.7);
      s.velocity.set(Math.cos(heading) * 11, Math.sin(heading) * 11);
      s.radius = this.rng.float(520, 780);
    } else if (s.active && s.timer <= 0) {
      s.active = false;
      s.timer = this.rng.float(170, 320);
    }

    s.center.addScaledVector(s.velocity, dt);
    // Keep storms roaming inside the map instead of wandering off forever.
    if (Math.abs(s.center.x) > WORLD_EXTENT * 1.2) s.velocity.x *= -1;
    if (Math.abs(s.center.y) > WORLD_EXTENT * 1.2) s.velocity.y *= -1;

    const dist = Math.hypot(cameraPosition.x - s.center.x, cameraPosition.z - s.center.y);
    const target = s.active ? smoothstep(s.radius, s.radius * 0.42, dist) : 0;
    this.localStorm = damp(this.localStorm, target, 0.35, dt);
    s.intensity = this.localStorm;
    this.uniforms.uStorm.value = this.localStorm;

    this.cloudCover = damp(
      this.cloudCover,
      clamp01(0.3 + this.noise.fbm(this.uniforms.uTime.value * 0.004, 71.2, 2) * 0.3 + this.localStorm * 0.65),
      0.3,
      dt,
    );
    this.uniforms.uCloudCover.value = this.cloudCover;

    this.updateLightning(dt);
  }

  private updateLightning(dt: number): void {
    this.flash = damp(this.flash, 0, 6.5, dt);

    if (this.localStorm > 0.25) {
      this.nextLightning -= dt * (0.4 + this.localStorm);
      if (this.nextLightning <= 0) {
        this.nextLightning = this.rng.float(3.5, 13) / Math.max(0.3, this.localStorm);
        const closeness = clamp01(this.localStorm * this.rng.float(0.5, 1.2));
        this.flash = 0.55 + closeness * 0.8;
        this.pendingThunder.push({ delay: lerp(3.2, 0.35, closeness), closeness });
      }
    }

    for (let i = this.pendingThunder.length - 1; i >= 0; i--) {
      const t = this.pendingThunder[i];
      t.delay -= dt;
      if (t.delay <= 0) {
        this.onThunder(t.closeness);
        this.pendingThunder.splice(i, 1);
      }
    }
  }

  private updateSun(): void {
    // Sun rises at 06:00, peaks at 12:00, sets at 18:00, on a slightly tilted arc.
    const a = (this.timeOfDay / 24) * TAU - Math.PI / 2;
    const tilt = 0.55;
    const dir = this.uniforms.uSunDir.value;
    dir.set(Math.cos(a) * Math.sin(tilt) + 0.18, Math.sin(a) * 0.97, Math.cos(a) * Math.cos(tilt)).normalize();
    this.uniforms.uMoonDir.value.copy(dir).multiplyScalar(-1);
    this.nightFactor = smoothstep(0.05, -0.2, dir.y);
    this.uniforms.uNightFactor.value = this.nightFactor;
  }

  private applySkyPalette(): void {
    const e = this.uniforms.uSunDir.value.y;
    let lo = SKY_KEYS[0];
    let hi = SKY_KEYS[SKY_KEYS.length - 1];
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
      if (e >= SKY_KEYS[i].elevation && e <= SKY_KEYS[i + 1].elevation) {
        lo = SKY_KEYS[i];
        hi = SKY_KEYS[i + 1];
        break;
      }
    }
    const t = clamp01(remap(e, lo.elevation, hi.elevation, 0, 1));
    const u = this.uniforms;
    const storm = this.localStorm;

    const mixKey = (target: THREE.Color, a: number, b: number, stormMix: number, stormScale: number) => {
      target.setHex(a).lerp(this.fogColorScratch.setHex(b), t);
      if (storm > 0) target.lerp(STORM_TINT, storm * stormMix).multiplyScalar(lerp(1, stormScale, storm));
    };

    mixKey(u.uSkyZenith.value, lo.zenith, hi.zenith, 0.55, 0.55);
    mixKey(u.uSkyHorizon.value, lo.horizon, hi.horizon, 0.7, 0.5);
    mixKey(u.uSkyGround.value, lo.ground, hi.ground, 0.5, 0.6);
    mixKey(u.uSunColor.value, lo.sun, hi.sun, 0.45, 0.65);
    mixKey(u.uFogColor.value, lo.fog, hi.fog, 0.72, 0.55);

    if (this.flash > 0.001) {
      const f = this.flash;
      u.uSkyZenith.value.addScalar(f * 0.5);
      u.uSkyHorizon.value.addScalar(f * 0.42);
      u.uFogColor.value.addScalar(f * 0.4);
    }

    const sunIntensity = lerp(lo.sunIntensity, hi.sunIntensity, t) * lerp(1, 0.35, storm) + this.flash * 1.6;
    const ambient = lerp(lo.ambient, hi.ambient, t) * lerp(1, 0.55, storm) + this.flash * 0.8;
    u.uFogDensity.value = lerp(lo.fogDensity, hi.fogDensity, t) * lerp(1, 3.1, storm);

    this.sun.color.copy(u.uSunColor.value);
    this.sun.intensity = sunIntensity;
    this.sun.position.copy(u.uSunDir.value).multiplyScalar(140);
    this.moon.position.copy(u.uMoonDir.value).multiplyScalar(140);
    this.moon.intensity = 0.28 * this.nightFactor * lerp(1, 0.3, storm);
    this.moon.color.copy(u.uMoonColor.value);
    // The radiance map supplies most of the ambient now, so the hemisphere light
    // is only a gentle ground-bounce fill - without this the scene goes flat.
    this.hemi.intensity = ambient * 0.42;
    // Enough sky bounce to keep shadows readable, not so much that the blue
    // ambient swamps the warm sunlight and turns the timbers olive.
    this.scene.environmentIntensity = lerp(0.42, 0.72, clamp01(ambient)) * lerp(1, 0.7, storm);
    this.hemi.color.copy(u.uSkyHorizon.value);
    // Bounce light off the sea: tropical water throws a lot of cyan up onto a hull.
    this.hemi.groundColor.copy(u.uSkyGround.value).lerp(WATER_BOUNCE, 0.28 * (1 - storm * 0.6));

    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(u.uFogColor.value);
    fog.density = u.uFogDensity.value;
  }

  /** Keeps the sun's shadow frustum centred on the action. */
  focusShadows(target: THREE.Vector3): void {
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.uniforms.uSunDir.value, 140);
    this.sun.target.updateMatrixWorld();
  }


  /** Formatted clock for the HUD, e.g. "09:24". */
  clockString(): string {
    const h = Math.floor(this.timeOfDay);
    const m = Math.floor((this.timeOfDay - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
