import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals, type SurfaceKind } from '../core/Signals';
import { QUALITY } from '../core/Config';

/**
 * Bullet holes, scorch marks, and blood.
 *
 * All decals live in one instanced mesh with a shared atlas-free procedural
 * shader. They are oriented to the surface normal and pushed a hair along it
 * to avoid z-fighting, then depth-biased in the shader for the rest.
 *
 * Decals matter more than their cost suggests: they are the persistent record
 * of a firefight. A wall that accumulates damage as you shoot it is the
 * clearest possible feedback that the world is reacting to the player.
 */

interface Decal {
  index: number;
  ttl: number;
  maxTtl: number;
  size: number;
}

export class DecalSystem implements System {
  readonly name = 'decals';
  readonly order = 45;

  private mesh!: THREE.InstancedMesh;
  private capacity = 0;
  private next = 0;
  private readonly live: Decal[] = [];

  private attrParams!: THREE.InstancedBufferAttribute; // x=type, y=seed, z=fade, w=size
  private attrColor!: THREE.InstancedBufferAttribute;

  private readonly _m = new THREE.Matrix4();
  private readonly _q = new THREE.Quaternion();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _alt = new THREE.Vector3(1, 0, 0);
  private readonly _scale = new THREE.Vector3();
  private readonly _pos = new THREE.Vector3();
  private readonly _n = new THREE.Vector3();
  private readonly _c = new THREE.Color();

  init(ctx: EngineContext): void {
    this.capacity = QUALITY.decalBudget;

    const geo = new THREE.PlaneGeometry(1, 1);
    const params = new Float32Array(this.capacity * 4);
    const colors = new Float32Array(this.capacity * 3);
    this.attrParams = new THREE.InstancedBufferAttribute(params, 4);
    this.attrColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.attrParams.setUsage(THREE.DynamicDrawUsage);
    this.attrColor.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aParams', this.attrParams);
    geo.setAttribute('aColor', this.attrColor);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      blending: THREE.NormalBlending,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 1, 1) },
        uAmbient: { value: new THREE.Color(0.3, 0.34, 0.4) },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aParams;
        attribute vec3 aColor;
        varying vec2 vUv;
        varying vec4 vParams;
        varying vec3 vColor;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vParams = aParams;
          vColor = aColor;
          vNormal = normalize(mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec4 vParams;
        varying vec3 vColor;
        varying vec3 vNormal;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uAmbient;

        float hash(vec2 p) {
          uvec2 q = uvec2(ivec2(p * 977.0)) * uvec2(1597334673u, 3812015801u);
          uint n = (q.x ^ q.y) * 1597334673u;
          return float(n) * (1.0 / 4294967296.0);
        }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float seed = vParams.y;
          int type = int(vParams.x + 0.5);

          float alpha = 0.0;
          vec3 col = vColor;

          if (type == 0) {
            // Bullet hole: a dark crater with a lighter pulverised rim and a
            // ragged spall pattern. Impacts are never circular.
            float n = fbm(vUv * 6.0 + seed);
            float ragged = r + (n - 0.5) * 0.36;
            float crater = 1.0 - smoothstep(0.14, 0.34, ragged);
            float rim = smoothstep(0.2, 0.42, ragged) * (1.0 - smoothstep(0.42, 0.95, ragged));
            float spall = (1.0 - smoothstep(0.4, 1.0, ragged)) * pow(fbm(vUv * 12.0 + seed * 3.0), 2.0);
            alpha = clamp(crater + rim * 0.55 + spall * 0.4, 0.0, 1.0);
            col = mix(vColor * 1.4, vec3(0.04, 0.035, 0.03), crater);
          } else if (type == 1) {
            // Scorch: soft, very dark, with a sooty feathered edge.
            float n = fbm(vUv * 3.4 + seed);
            alpha = (1.0 - smoothstep(0.15, 1.0, r + (n - 0.5) * 0.5)) * 0.9;
            col = mix(vec3(0.09, 0.075, 0.065), vec3(0.02), 1.0 - r);
          } else if (type == 2) {
            // Blood spatter: a central pool with directional droplets.
            float n = fbm(vUv * 5.0 + seed);
            float core = 1.0 - smoothstep(0.1, 0.55, r + (n - 0.5) * 0.5);
            float droplets = step(0.72, fbm(vUv * 16.0 + seed * 5.0)) * (1.0 - smoothstep(0.3, 1.0, r));
            alpha = clamp(core + droplets * 0.85, 0.0, 1.0);
            col = mix(vec3(0.30, 0.02, 0.015), vec3(0.13, 0.01, 0.01), core);
          } else {
            // Glass crack: radial fractures.
            float ang = atan(p.y, p.x);
            float spokes = abs(sin(ang * 7.0 + seed * 6.28));
            float crack = (1.0 - smoothstep(0.0, 0.14, spokes)) * (1.0 - smoothstep(0.05, 1.0, r));
            alpha = clamp(crack + (1.0 - smoothstep(0.0, 0.14, r)), 0.0, 1.0);
            col = vec3(0.85, 0.9, 0.95);
          }

          alpha *= vParams.z;
          if (alpha < 0.004) discard;

          float ndl = max(dot(normalize(vNormal), normalize(uSunDirection)), 0.0);
          col *= uAmbient + uSunColor * ndl;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 2;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.name = 'decals';
    ctx.scene.add(this.mesh);

    // Park every instance far away so unused slots draw nothing.
    for (let i = 0; i < this.capacity; i++) {
      this._m.makeTranslation(0, -10000, 0);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.count = this.capacity;

    Signals.on('bullet:impact', (hit) => {
      const type =
        hit.surface === 'flesh' ? 2 :
        hit.surface === 'glass' ? 3 : 0;
      const size =
        hit.surface === 'flesh' ? 0.28 + Math.random() * 0.2 :
        hit.surface === 'sand' || hit.surface === 'dirt' ? 0.16 + Math.random() * 0.1 :
        0.09 + Math.random() * 0.06;
      this.spawn(
        this._pos.set(hit.point.x, hit.point.y, hit.point.z),
        this._n.set(hit.normal.x, hit.normal.y, hit.normal.z),
        type,
        size,
        surfaceTint(hit.surface),
        hit.surface === 'flesh' ? 26 : 90,
      );
    });

    Signals.on('explosion:spawn', ({ position, radius, scale }) => {
      this.spawn(
        this._pos.copy(position),
        this._n.set(0, 1, 0),
        1,
        radius * 1.5 * scale,
        this._c.setRGB(0.1, 0.09, 0.08),
        150,
      );
      // Ring of smaller scorches for an irregular edge.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.random();
        const d = radius * (0.5 + Math.random() * 0.7);
        this.spawn(
          this._pos.copy(position).add(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d)),
          this._n.set(0, 1, 0),
          1,
          radius * 0.5 * scale,
          this._c.setRGB(0.12, 0.1, 0.09),
          150,
        );
      }
    });
  }

  spawn(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    type: number,
    size: number,
    color: THREE.Color,
    ttl: number,
  ): void {
    const index = this.next;
    this.next = (this.next + 1) % this.capacity;

    // Orient the quad's +Z along the surface normal, with a random roll so
    // repeated hits on the same wall do not produce identical marks.
    const up = Math.abs(normal.y) > 0.95 ? this._alt : this._up;
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), normal, up);
    this._q.setFromRotationMatrix(m);
    this._q.multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2),
    );

    this._scale.set(size, size, size);
    this._m.compose(
      this._pos.copy(position).addScaledVector(normal, 0.012),
      this._q,
      this._scale,
    );
    this.mesh.setMatrixAt(index, this._m);
    this.attrParams.setXYZW(index, type, Math.random() * 10, 1, size);
    this.attrColor.setXYZ(index, color.r, color.g, color.b);

    const existing = this.live.find((d) => d.index === index);
    if (existing) {
      existing.ttl = ttl;
      existing.maxTtl = ttl;
      existing.size = size;
    } else {
      this.live.push({ index, ttl, maxTtl: ttl, size });
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.attrParams.needsUpdate = true;
    this.attrColor.needsUpdate = true;
  }

  update(dt: number, ctx: EngineContext): void {
    let dirty = false;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const d = this.live[i];
      d.ttl -= dt;
      // Only fade over the last 20% of the lifetime; fading from the moment
      // of impact makes damage feel like it is being undone.
      const fade = THREE.MathUtils.clamp(d.ttl / (d.maxTtl * 0.2), 0, 1);
      if (this.attrParams.getZ(d.index) !== fade) {
        this.attrParams.setZ(d.index, fade);
        dirty = true;
      }
      if (d.ttl <= 0) {
        this._m.makeTranslation(0, -10000, 0);
        this.mesh.setMatrixAt(d.index, this._m);
        this.mesh.instanceMatrix.needsUpdate = true;
        this.live.splice(i, 1);
      }
    }
    if (dirty) this.attrParams.needsUpdate = true;

    const mat = this.mesh.material as THREE.ShaderMaterial;
    (mat.uniforms.uSunDirection.value as THREE.Vector3).copy(ctx.engine.pipeline.sunDirection);
    (mat.uniforms.uSunColor.value as THREE.Color)
      .copy(ctx.engine.pipeline.sunColor)
      .multiplyScalar(ctx.engine.pipeline.sunIntensity * 0.22);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

function surfaceTint(surface: SurfaceKind): THREE.Color {
  switch (surface) {
    case 'concrete': return new THREE.Color(0.72, 0.70, 0.67);
    case 'metal': return new THREE.Color(0.55, 0.56, 0.58);
    case 'sand': return new THREE.Color(0.80, 0.70, 0.52);
    case 'dirt': return new THREE.Color(0.46, 0.39, 0.30);
    case 'wood': return new THREE.Color(0.55, 0.42, 0.26);
    case 'flesh': return new THREE.Color(0.35, 0.04, 0.03);
    case 'fabric': return new THREE.Color(0.6, 0.55, 0.44);
    default: return new THREE.Color(0.6, 0.6, 0.6);
  }
}
