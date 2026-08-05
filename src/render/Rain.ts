import * as THREE from 'three';
import { RAIN } from './LookConfig';
import { radialSprite } from './Textures';

/**
 * Rain.
 *
 * Three layers, because a single one never convinces:
 *  1. Streaks — instanced camera-facing quads whose fall is computed in the
 *     vertex shader and wrapped inside a box that follows the camera, so the
 *     player can never walk out of the weather.
 *  2. Backlit haze — the same streaks, larger and dimmer, catching key lights.
 *  3. Splashes — short-lived sprites on the ground plane, spawned in a ring
 *     around the camera so impacts appear where the eye is looking.
 */

const STREAK_VERT = /* glsl */ `
attribute vec3 iOffset;
attribute float iSpeed;
attribute float iScale;
attribute float iSeed;

uniform float uTime;
uniform vec3 uWind;
uniform float uBoxSize;
uniform float uHeight;
uniform vec3 uCamPos;
uniform float uLength;
uniform float uWidth;
uniform float uGust;

varying vec2 vUv;
varying float vFade;
varying float vSeed;

void main() {
  vUv = uv;
  vSeed = iSeed;

  // Wrap the spawn volume around the camera.
  vec3 base = iOffset;
  vec3 wrapCentre = uCamPos;
  base.x = mod(base.x - wrapCentre.x + uBoxSize * 0.5, uBoxSize) + wrapCentre.x - uBoxSize * 0.5;
  base.z = mod(base.z - wrapCentre.z + uBoxSize * 0.5, uBoxSize) + wrapCentre.z - uBoxSize * 0.5;

  float fall = uTime * iSpeed;
  float y = mod(base.y - fall, uHeight);
  vec3 wind = uWind * (1.0 + uGust * sin(uTime * 0.7 + iSeed * 6.28));
  vec3 world = vec3(base.x + wind.x * (uHeight - y) * 0.06, y + wrapCentre.y - uHeight * 0.35, base.z + wind.z * (uHeight - y) * 0.06);

  // Billboard the quad, but keep the streak aligned with the fall direction.
  vec3 toCam = normalize(uCamPos - world);
  vec3 fallDir = normalize(vec3(-wind.x * 0.12, -1.0, -wind.z * 0.12));
  vec3 right = normalize(cross(fallDir, toCam));

  float len = uLength * iScale;
  float wid = uWidth * mix(0.7, 1.3, fract(iSeed * 7.31));
  vec3 pos = world + right * position.x * wid + fallDir * (-position.y) * len;

  vec4 mv = viewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Fade out very close and very far streaks.
  float dist = length(uCamPos - world);
  vFade = smoothstep(0.45, 1.6, dist) * (1.0 - smoothstep(uBoxSize * 0.32, uBoxSize * 0.55, dist));
}
`;

const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uLightBias;
varying vec2 vUv;
varying float vFade;
varying float vSeed;

void main() {
  // Soft along the length, sharp across it, brighter at the leading tip.
  float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
  float along = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  float tip = pow(smoothstep(0.35, 0.0, vUv.y), 2.0) * 0.9;
  float a = across * (along + tip) * vFade * uOpacity;
  float flick = 0.82 + 0.18 * sin(vSeed * 91.7);
  gl_FragColor = vec4(uColor * (1.0 + uLightBias) * flick, a * flick);
}
`;

export interface RainOptions {
  count: number;
  splashCount: number;
  boxSize?: number;
  height?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
  groundY?: number;
  /** Extra dim, oversized streaks that catch backlight. */
  hazeLayer?: boolean;
}

export class RainSystem {
  readonly group = new THREE.Group();
  private streaks: THREE.Mesh;
  private streakMat: THREE.ShaderMaterial;
  private haze: THREE.Mesh | null = null;
  private hazeMat: THREE.ShaderMaterial | null = null;
  private splashes: THREE.InstancedMesh | null = null;
  private splashState: { x: number; z: number; t: number; life: number; scale: number }[] = [];
  private splashDummy = new THREE.Object3D();
  private groundY: number;
  private intensity = 1;
  private targetIntensity = 1;
  private time = 0;

  constructor(opts: RainOptions) {
    const boxSize = opts.boxSize ?? 44;
    const height = opts.height ?? 26;
    this.groundY = opts.groundY ?? 0;

    const build = (count: number, scaleMul: number, widthMul: number, opacity: number, color: THREE.Color) => {
      const geo = new THREE.InstancedBufferGeometry();
      const quad = new THREE.PlaneGeometry(1, 1);
      geo.index = quad.index;
      geo.attributes.position = quad.attributes.position;
      geo.attributes.uv = quad.attributes.uv;
      const off = new Float32Array(count * 3);
      const spd = new Float32Array(count);
      const scl = new Float32Array(count);
      const sed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        off[i * 3] = (Math.random() - 0.5) * boxSize;
        off[i * 3 + 1] = Math.random() * height;
        off[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
        spd[i] = RAIN.fallSpeed * (0.72 + Math.random() * 0.6);
        scl[i] = (0.6 + Math.random() * 0.9) * scaleMul;
        sed[i] = Math.random();
      }
      geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(off, 3));
      geo.setAttribute('iSpeed', new THREE.InstancedBufferAttribute(spd, 1));
      geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(scl, 1));
      geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(sed, 1));
      geo.instanceCount = count;
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: new THREE.Vector3(RAIN.windX, 0, RAIN.windZ) },
          uBoxSize: { value: boxSize },
          uHeight: { value: height },
          uCamPos: { value: new THREE.Vector3() },
          uLength: { value: RAIN.streakLength },
          uWidth: { value: RAIN.streakWidth * widthMul },
          uColor: { value: color },
          uOpacity: { value: opacity },
          uLightBias: { value: 0 },
          uGust: { value: 0.25 },
        },
        vertexShader: STREAK_VERT,
        fragmentShader: STREAK_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 10;
      return { mesh, mat };
    };

    const color = new THREE.Color(opts.color ?? 0xa8c4e6);
    const main = build(opts.count, 1, 1, opts.opacity ?? RAIN.opacity, color);
    this.streaks = main.mesh;
    this.streakMat = main.mat;
    this.group.add(this.streaks);

    if (opts.hazeLayer !== false) {
      const hazeCount = Math.max(60, Math.round(opts.count * 0.16));
      const h = build(hazeCount, 2.6, 5.5, (opts.opacity ?? RAIN.opacity) * 0.16, color.clone().lerp(new THREE.Color(0xffffff), 0.3));
      this.haze = h.mesh;
      this.hazeMat = h.mat;
      this.haze.renderOrder = 9;
      this.group.add(this.haze);
    }

    if (opts.splashCount > 0) {
      const tex = radialSprite(48, 0.28, 'rgba(220,235,255,0.95)');
      const splashGeo = new THREE.PlaneGeometry(1, 1);
      const splashMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
        fog: true,
      });
      this.splashes = new THREE.InstancedMesh(splashGeo, splashMat, opts.splashCount);
      this.splashes.frustumCulled = false;
      this.splashes.renderOrder = 8;
      this.splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < opts.splashCount; i++) {
        this.splashState.push({ x: 0, z: 0, t: Math.random(), life: 0.28 + Math.random() * 0.22, scale: 0 });
      }
      this.group.add(this.splashes);
    }
  }

  /** 0 = dry, 1 = full downpour. Ramps smoothly. */
  setIntensity(v: number, immediate = false): void {
    this.targetIntensity = Math.max(0, Math.min(1.4, v));
    if (immediate) this.intensity = this.targetIntensity;
  }

  /** Tints the rain with the dominant light of the scene. */
  setColor(color: THREE.ColorRepresentation, lightBias = 0): void {
    (this.streakMat.uniforms.uColor.value as THREE.Color).set(color);
    this.streakMat.uniforms.uLightBias.value = lightBias;
    if (this.hazeMat) {
      (this.hazeMat.uniforms.uColor.value as THREE.Color).set(color);
      this.hazeMat.uniforms.uLightBias.value = lightBias;
    }
  }

  setWind(x: number, z: number, gust = 0.25): void {
    (this.streakMat.uniforms.uWind.value as THREE.Vector3).set(x, 0, z);
    this.streakMat.uniforms.uGust.value = gust;
    if (this.hazeMat) {
      (this.hazeMat.uniforms.uWind.value as THREE.Vector3).set(x, 0, z);
      this.hazeMat.uniforms.uGust.value = gust;
    }
  }

  setGroundY(y: number): void {
    this.groundY = y;
  }

  update(dt: number, camera: THREE.Camera, timeScale = 1): void {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1.5);
    this.time += dt * timeScale;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    const base = RAIN.opacity * this.intensity;
    this.streakMat.uniforms.uTime.value = this.time;
    (this.streakMat.uniforms.uCamPos.value as THREE.Vector3).copy(camPos);
    this.streakMat.uniforms.uOpacity.value = base;
    this.streaks.visible = this.intensity > 0.01;
    const fullCount = (this.streaks.geometry as THREE.InstancedBufferGeometry).attributes.iSeed.count;
    (this.streaks.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.round(
      fullCount * Math.min(1, this.intensity)
    );

    if (this.haze && this.hazeMat) {
      this.hazeMat.uniforms.uTime.value = this.time;
      (this.hazeMat.uniforms.uCamPos.value as THREE.Vector3).copy(camPos);
      this.hazeMat.uniforms.uOpacity.value = base * 0.16;
      this.haze.visible = this.intensity > 0.01;
    }

    if (this.splashes) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const centre = camPos.clone().add(forward.multiplyScalar(3.2));
      centre.y = this.groundY;
      let visible = 0;
      for (let i = 0; i < this.splashState.length; i++) {
        const s = this.splashState[i];
        s.t += dt / s.life;
        if (s.t >= 1) {
          if (Math.random() > this.intensity) {
            s.scale = 0;
          } else {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 6.5;
            s.x = centre.x + Math.cos(a) * r;
            s.z = centre.z + Math.sin(a) * r;
            s.scale = 0.1 + Math.random() * 0.16;
          }
          s.t = 0;
          s.life = 0.24 + Math.random() * 0.2;
        }
        const grow = Math.sin(s.t * Math.PI * 0.85);
        const sc = s.scale * (0.5 + grow * 1.6);
        this.splashDummy.position.set(s.x, this.groundY + 0.012, s.z);
        this.splashDummy.rotation.set(-Math.PI / 2, 0, 0);
        this.splashDummy.scale.set(sc, sc, sc);
        this.splashDummy.updateMatrix();
        this.splashes.setMatrixAt(i, this.splashDummy.matrix);
        if (s.scale > 0) visible++;
      }
      this.splashes.instanceMatrix.needsUpdate = true;
      const mat = this.splashes.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.38 * this.intensity;
      this.splashes.visible = visible > 0 && this.intensity > 0.02;
    }
  }

  dispose(): void {
    this.streaks.geometry.dispose();
    this.streakMat.dispose();
    this.haze?.geometry.dispose();
    this.hazeMat?.dispose();
    this.splashes?.geometry.dispose();
    (this.splashes?.material as THREE.Material | undefined)?.dispose();
  }
}
