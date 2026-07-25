import * as THREE from 'three';
import { clamp01, smoothstep } from '../core/math';
import { ATMOSPHERE_GLSL } from './atmosphere.glsl';
import { Environment } from './environment';
import { IslandField } from './islands';
import { WAVE_GLSL } from './waves';

const WAKE_POINTS = 16;
/** Waves flatten out as water gets shallow; matched on CPU and GPU. */
const SHALLOW_FADE = 4.2;

interface WakeSource {
  position: THREE.Vector3;
  speed: number;
  width: number;
}

/**
 * The sea surface: a camera-centred radial mesh displaced by the shared wave
 * field, shaded with depth-based colour from the island height map, whitecaps,
 * shoreline surf and a rolling ship wake.
 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  private wake: THREE.Vector4[] = [];
  private wakeIndex = 0;
  private lastWakePosition: (THREE.Vector3 | undefined)[] = [];
  private underwaterMesh: THREE.Mesh;
  private underwaterMaterial: THREE.ShaderMaterial;
  private scratchNormal = new THREE.Vector3();

  constructor(
    private env: Environment,
    private islands: IslandField,
    scene: THREE.Scene,
    segments: number,
  ) {
    for (let i = 0; i < WAKE_POINTS; i++) this.wake.push(new THREE.Vector4(0, 0, -1, 0));

    // The ocean is the consumer of the terrain height field: bind it here so the
    // shader can read water depth for colour, surf and wave damping.
    this.env.uniforms.uHeightMap.value = islands.heightTexture;

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      // Reflected cloud only has to be convincing at a glance, and the sea
      // covers most of the screen, so it marches at a fraction of the cost.
      defines: { CLOUD_STEPS: 6, CLOUD_LIGHT_STEPS: 1 },
      uniforms: {
        ...(this.env.uniforms as unknown as Record<string, THREE.IUniform>),
        uShallowColor: { value: new THREE.Color(0x3fdccb) },
        uMidColor: { value: new THREE.Color(0x179cb4) },
        uDeepColor: { value: new THREE.Color(0x0a4f74) },
        uSandColor: { value: new THREE.Color(0xdcc79b) },
        uFoamColor: { value: new THREE.Color(0xf2fbff) },
        uWake: { value: this.wake },
        uWakeActive: { value: 0 },
        uCameraXZ: { value: new THREE.Vector2() },
        uInteriorMatrix: { value: new THREE.Matrix4() },
        uInteriorActive: { value: 0 },
        uInteriorMin: { value: new THREE.Vector3() },
        uInteriorMax: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        ${WAVE_GLSL}
        ${IslandField.HEIGHT_SAMPLE_GLSL}

        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;
        varying float vCrest;
        varying float vDepth;
        varying float vShallow;

        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          float terrain = sampleTerrainHeight(world.xz);
          float depth = max(0.0, -terrain);
          float shallow = smoothstep(0.0, ${SHALLOW_FADE.toFixed(1)}, depth);

          // The radial mesh gets very coarse towards the horizon, so wave detail
          // has to fade out with distance or it aliases into concentric rings.
          float camDist = length(world.xz - cameraPosition.xz);
          float detail = shallow * (1.0 - smoothstep(240.0, 1250.0, camDist));

          vec3 waveNormal;
          vec3 disp = gerstnerSurface(world.xz, waveNormal);
          world.xyz += disp * detail;

          vWorldPos = world.xyz;
          vWaveNormal = normalize(mix(vec3(0.0, 1.0, 0.0), waveNormal, detail));
          vCrest = waveCrestFactor(world.xz) * detail;
          vDepth = depth;
          vShallow = shallow;

          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${ATMOSPHERE_GLSL}
        #define WAKE_POINTS ${WAKE_POINTS}

        uniform vec3 uShallowColor;
        uniform vec3 uMidColor;
        uniform vec3 uDeepColor;
        uniform vec3 uSandColor;
        uniform vec3 uFoamColor;
        uniform vec4 uWake[WAKE_POINTS];
        uniform float uWakeActive;
        uniform vec2 uCameraXZ;
        uniform mat4 uInteriorMatrix;
        uniform float uInteriorActive;
        uniform vec3 uInteriorMin;
        uniform vec3 uInteriorMax;

        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;
        varying float vCrest;
        varying float vDepth;
        varying float vShallow;

        /**
         * Wind chop layered on top of the Gerstner normal. Four crossing sine
         * ripples with analytic gradients - far cheaper than sampling noise
         * three times for a finite-difference normal, and it never shimmers.
         */
        vec2 rippleGradient(vec2 p, float strength) {
          // Warp the domain first: four crossing sines alone interfere into a
          // visible lattice, which a sharp sun highlight turns into a grid of
          // bright squares.
          vec2 warp = vec2(
            valueNoise(p * 0.31 + vec2(uTime * 0.021, 4.3)),
            valueNoise(p * 0.29 + vec2(11.7, -uTime * 0.018))
          ) - 0.5;
          p += warp * 1.9;

          const vec2 d0 = vec2(0.86, 0.51);
          const vec2 d1 = vec2(-0.42, 0.91);
          const vec2 d2 = vec2(0.18, -0.98);
          const vec2 d3 = vec2(-0.94, -0.35);
          vec2 grad = vec2(0.0);
          grad += d0 * cos(dot(d0, p) * 1.7 - uTime * 2.9) * 0.55;
          grad += d1 * cos(dot(d1, p) * 2.6 - uTime * 3.7) * 0.36;
          grad += d2 * cos(dot(d2, p) * 4.3 + uTime * 4.6) * 0.22;
          grad += d3 * cos(dot(d3, p) * 7.1 + uTime * 6.1) * 0.12;
          // Two finer bands break the highlight into wavelets rather than sheets.
          grad += d1 * cos(dot(d1, p) * 11.3 - uTime * 8.2) * 0.07;
          grad += d2 * cos(dot(d2, p) * 17.9 + uTime * 11.0) * 0.04;
          return grad * strength;
        }

        float wakeFoam(vec2 p) {
          if (uWakeActive < 0.5) return 0.0;
          float foam = 0.0;
          for (int i = 0; i < WAKE_POINTS; i++) {
            vec4 w = uWake[i];
            if (w.z < 0.0) continue;
            float age = w.z;
            // Radius grows with age only: strength drives how white it is, so a
            // fast ship leaves a broad churned trail rather than a bigger dot.
            float radius = mix(2.6, 15.0, age);
            float d = length(p - w.xy);
            // Soft quadratic falloff, textured with a churn ripple, fading as the
            // foam ages so the trail dissolves behind the ship.
            float t = clamp(1.0 - d / radius, 0.0, 1.0);
            float churn = 0.55 + 0.45 * sin(d * 1.1 - uTime * 3.0);
            foam = max(foam, t * t * t * churn * (1.0 - age) * w.w * 0.34);
          }
          return clamp(foam, 0.0, 1.0);
        }

        void main() {
          // A ship's hold sits below the waterline, so the sea surface would
          // otherwise slice straight through it. While the camera is inside a
          // hull, cut the sea out of that hull's interior volume.
          if (uInteriorActive > 0.5) {
            vec3 interior = (uInteriorMatrix * vec4(vWorldPos, 1.0)).xyz;
            if (all(greaterThan(interior, uInteriorMin)) && all(lessThan(interior, uInteriorMax))) discard;
          }

          vec3 viewVec = vWorldPos - cameraPosition;
          float dist = length(viewVec);
          vec3 viewDir = viewVec / max(dist, 0.001);

          // Ripple detail fades with distance to stop the horizon shimmering.
          float detailFade = 1.0 - smoothstep(70.0, 460.0, dist);
          vec2 ripple = rippleGradient(vWorldPos.xz * 0.55, 0.33 * detailFade * (1.0 + uStorm * 0.6));
          vec3 normal = normalize(vWaveNormal + vec3(ripple.x, 0.0, ripple.y));
          if (dot(normal, -viewDir) < 0.0) normal = -normal;
          bool underside = vWorldPos.y > cameraPosition.y;

          // --- Body colour from water depth, with a hint of the sand below.
          vec3 body = mix(uShallowColor, uMidColor, smoothstep(0.6, 8.0, vDepth));
          body = mix(body, uDeepColor, smoothstep(11.0, 62.0, vDepth));
          float sandShow = (1.0 - smoothstep(0.0, 5.5, vDepth)) * 0.85;
          body = mix(body, uSandColor * (0.55 + 0.45 * uNightFactor * 0.2), sandShow * 0.55);

          // --- Caustics: the surface acts as a lens and focuses sunlight into a
          // moving web of bright lines on the sand. Two drifting noise fields
          // differenced and sharpened give the characteristic filigree.
          if (sandShow > 0.02) {
            vec2 cp = vWorldPos.xz * 0.75 + ripple * 3.0;
            float c1 = valueNoise(cp + vec2(uTime * 0.15, -uTime * 0.11));
            float c2 = valueNoise(cp * 1.6 - vec2(uTime * 0.09, uTime * 0.13));
            float web = pow(clamp(1.0 - abs(c1 - c2) * 2.6, 0.0, 1.0), 4.0);
            body += uSunColor * web * sandShow * 0.5 * clamp(uSunDir.y, 0.0, 1.0) * detailFade;
          }

          // --- Sky reflection with a Fresnel term.
          vec3 reflectDir = reflect(viewDir, normal);
          reflectDir.y = abs(reflectDir.y);
          // No sun disk in the reflection: its threshold is so tight that entire
          // mesh quads flip to white as the interpolated wave normal crosses it.
          // The tight highlight is handled by the Blinn-Phong term below instead.
          vec3 skyCol = atmosphereBase(reflectDir, 0.0);
          // Reflected clouds are marched from the water surface, so a cumulus
          // overhead lands in the right place on the sea. Grazing reflections
          // are mostly haze, so fade the (expensive) march out down there.
          float cloudFade = smoothstep(0.05, 0.3, reflectDir.y);
          if (cloudFade > 0.01) {
            vec3 clouded = applyCloudsFrom(skyCol, reflectDir, vec3(vWorldPos.x, 0.0, vWorldPos.z));
            skyCol = mix(skyCol, clouded, cloudFade);
          }
          float fresnel = pow(1.0 - clamp(dot(normal, -viewDir), 0.0, 1.0), 4.2);
          fresnel = mix(0.03, 1.0, fresnel);

          // --- Cloud shadows drifting across the water.
          float shade = mix(1.0, cloudShadow(vWorldPos), detailFade * 0.9 + 0.1);

          // --- Subsurface glow: crests lit from behind by the sun.
          float sunUp = clamp(uSunDir.y, 0.0, 1.0) * shade;
          float backLight = pow(clamp(dot(viewDir, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0);
          vec3 scatter = uShallowColor * 1.35 * backLight * (0.25 + vCrest * 0.9) * (0.25 + sunUp);
          vec3 color = mix(body * (0.42 + 0.58 * (0.35 + sunUp)) + scatter, skyCol, fresnel * 0.86);

          // --- Sun specular: a tight highlight plus wide glitter.
          vec3 halfVec = normalize(uSunDir - viewDir);
          // The tight highlight is deliberately restrained: the wave normal is
          // interpolated across large mesh cells, so a fierce exponent makes the
          // glitter path break into facets.
          float spec = pow(max(dot(normal, halfVec), 0.0), 55.0);
          float glitter = pow(max(dot(normal, halfVec), 0.0), 22.0) * 0.12;
          // Break the highlight into individual sparks: a smooth streak across
          // open water is the giveaway that a sea is rendered rather than filmed.
          float sparkle = valueNoise(vWorldPos.xz * 4.3 + vec2(uTime * 0.8, uTime * -0.6));
          spec *= 0.45 + 1.15 * sparkle * sparkle;
          color += uSunColor * (spec * 0.6 + glitter) * (1.0 - uStorm * 0.55) * detailFade * shade;
          vec3 moonHalf = normalize(uMoonDir - viewDir);
          color += uMoonColor * pow(max(dot(normal, moonHalf), 0.0), 120.0) * 0.9 * uNightFactor;

          // --- Foam: whitecaps, shoreline surf and ship wake.
          // Whitecaps only on genuinely steep crests, or a calm sea turns into
          // a field of blocky white patches.
          float chopFoam = smoothstep(0.62, 0.96, vCrest + uStorm * 0.34) * (0.4 + uStorm * 0.6);
          // Two noise scales, so the foam mask has no single visible cell size.
          vec2 foamUv = vWorldPos.xz + vec2(uTime * 0.6, -uTime * 0.45);
          float foamNoise = fbm2Cheap(foamUv * 0.33) * 0.62 + fbm2Cheap(foamUv * 0.11 + 7.3) * 0.38;
          float surfBand = 1.0 - smoothstep(0.0, 1.9, vDepth);
          float surfPulse = 0.5 + 0.5 * sin(vDepth * 3.4 - uTime * 1.9 + foamNoise * 5.0);
          float shoreFoam = surfBand * (0.45 + 0.55 * surfPulse) * smoothstep(0.25, 0.75, foamNoise + 0.28);
          float foam = clamp(chopFoam * smoothstep(0.24, 0.86, foamNoise) + shoreFoam + wakeFoam(vWorldPos.xz), 0.0, 1.0);
          foam *= vShallow * 0.4 + 0.6;
          // Foam is aerated water, not paint: keep a little of the sea in it.
          vec3 foamLit = mix(body * 1.4, uFoamColor, 0.82) * (0.4 + 0.6 * (0.3 + sunUp)) * (1.0 - uStorm * 0.25);
          color = mix(color, foamLit, foam * 0.82);

          // Seen from below, the surface acts as a bright ceiling.
          if (underside) {
            color = mix(uMidColor * 0.5, skyCol, 0.35) + uSunColor * spec * 0.6;
          }

          color = applyAtmosphericFog(color, dist, viewDir);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.buildGeometry(segments), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'ocean';
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);

    const built = this.buildUnderwaterVolume();
    this.underwaterMesh = built.mesh;
    this.underwaterMaterial = built.material;
    scene.add(this.underwaterMesh);
  }

  /**
   * Radial fan centred on the camera: dense triangles underfoot for crisp wave
   * shape, huge ones at the horizon for cheap coverage out to 5 km.
   */
  private buildGeometry(segments: number): THREE.BufferGeometry {
    const sectors = segments;
    const rings = Math.round(segments * 0.62);
    const maxRadius = 5200;
    const positions: number[] = [0, 0, 0];
    const indices: number[] = [];

    for (let ring = 1; ring <= rings; ring++) {
      const t = ring / rings;
      const radius = 0.55 + maxRadius * Math.pow(t, 3.1);
      for (let s = 0; s < sectors; s++) {
        const a = (s / sectors) * Math.PI * 2;
        positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }
    }

    // Centre fan.
    for (let s = 0; s < sectors; s++) {
      const next = (s + 1) % sectors;
      indices.push(0, 1 + next, 1 + s);
    }
    // Quad strips between rings.
    for (let ring = 0; ring < rings - 1; ring++) {
      const base = 1 + ring * sectors;
      const nextBase = base + sectors;
      for (let s = 0; s < sectors; s++) {
        const next = (s + 1) % sectors;
        indices.push(base + s, nextBase + s, base + next);
        indices.push(base + next, nextBase + s, nextBase + next);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    geometry.boundingSphere!.radius = Infinity;
    return geometry;
  }

  /** Full-screen tint + murk applied while the camera is below the surface. */
  private buildUnderwaterVolume(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uNightFactor: this.env.uniforms.uNightFactor,
        uSubmerged: { value: 0 },
        uTint: { value: new THREE.Color(0x0d5f70) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uSubmerged;
        uniform float uNightFactor;
        uniform vec3 uTint;
        varying vec2 vUv;
        void main() {
          if (uSubmerged <= 0.001) discard;
          float edge = smoothstep(0.05, 0.6, length(vUv - 0.5));
          vec3 col = uTint * (1.0 - uNightFactor * 0.65);
          gl_FragColor = vec4(col, uSubmerged * (0.42 + edge * 0.3));
        }
      `,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 999;
    return { mesh, material };
  }

  /** Water surface height, including the flattening of waves in shallows. */
  waterHeight(x: number, z: number): number {
    const depth = Math.max(0, -this.islands.heightAt(x, z));
    if (depth <= 0.001) return 0;
    const shallow = smoothstep(0, SHALLOW_FADE, depth);
    return this.env.waves.height(x, z) * shallow;
  }

  waterNormal(x: number, z: number, out = this.scratchNormal): THREE.Vector3 {
    const depth = Math.max(0, -this.islands.heightAt(x, z));
    const shallow = smoothstep(0, SHALLOW_FADE, depth);
    this.env.waves.normal(x, z, out);
    out.x *= shallow;
    out.z *= shallow;
    return out.normalize();
  }

  /** Registers a moving hull so the shader can trail foam behind it. */
  private pushWake(source: WakeSource): void {
    const point = this.wake[this.wakeIndex];
    point.set(source.position.x, source.position.z, 0, source.width * clamp01(source.speed / 3.5));
    this.wakeIndex = (this.wakeIndex + 1) % WAKE_POINTS;
  }

  update(dt: number, cameraPosition: THREE.Vector3, wakeSources: WakeSource[]): void {
    this.mesh.position.set(cameraPosition.x, 0, cameraPosition.z);
    (this.material.uniforms.uCameraXZ.value as THREE.Vector2).set(cameraPosition.x, cameraPosition.z);

    let active = 0;
    for (const point of this.wake) {
      if (point.z >= 0) {
        // Slow ageing keeps a long trail alive in the ring buffer.
        point.z += dt * 0.16;
        if (point.z > 1) point.z = -1;
        else active++;
      }
    }
    this.material.uniforms.uWakeActive.value = active > 0 ? 1 : 0;

    // Lay foam down by distance travelled rather than by time, so the trail is
    // evenly spaced at any speed instead of clumping or breaking into dashes.
    for (let i = 0; i < wakeSources.length; i++) {
      const source = wakeSources[i];
      if (source.speed < 0.7) continue;
      const last = this.lastWakePosition[i];
      if (!last) {
        this.lastWakePosition[i] = source.position.clone();
        this.pushWake(source);
        continue;
      }
      if (last.distanceTo(source.position) >= 3.5) {
        last.copy(source.position);
        this.pushWake(source);
      }
    }

    const surface = this.waterHeight(cameraPosition.x, cameraPosition.z);
    const inside = (this.material.uniforms.uInteriorActive.value as number) > 0.5;
    const submerged = inside ? 0 : clamp01((surface - cameraPosition.y) * 2.2);
    this.underwaterMaterial.uniforms.uSubmerged.value = submerged;
    this.underwaterMesh.visible = submerged > 0.001;
  }

  /**
   * Masks the sea out of a hull's interior. Pass the ship the camera is inside,
   * or null when it is out in the open.
   */
  setInteriorMask(matrixWorld: THREE.Matrix4 | null, min?: THREE.Vector3, max?: THREE.Vector3): void {
    const uniforms = this.material.uniforms;
    if (!matrixWorld || !min || !max) {
      uniforms.uInteriorActive.value = 0;
      return;
    }
    uniforms.uInteriorActive.value = 1;
    (uniforms.uInteriorMatrix.value as THREE.Matrix4).copy(matrixWorld).invert();
    (uniforms.uInteriorMin.value as THREE.Vector3).copy(min);
    (uniforms.uInteriorMax.value as THREE.Vector3).copy(max);
  }

}
