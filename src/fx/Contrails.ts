import * as THREE from 'three';
import { rng } from '../core/MathUtils';
import type { EngineContext } from '../core/System';
import { resetDesc } from './ParticleSystem';
import type { FXDeps } from './Shared';

const VERTEX = /* glsl */ `
attribute float aSide;
attribute float aFade;

varying float vSide;
varying float vFade;

void main() {
  vSide = aSide;
  vFade = aFade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uAdditive;

varying float vSide;
varying float vFade;

void main() {
  // Soft across the ribbon so the silhouette is a vapour band, not a strip of
  // tape, and squared off along it by the per-vertex fade.
  float edge = pow(max(1.0 - abs(vSide), 0.0), 1.5);
  float alpha = clamp(vFade * uOpacity * edge, 0.0, 1.0);
  if (alpha <= 0.003) discard;
  gl_FragColor = vec4(uColor * alpha, alpha * (1.0 - uAdditive));
}
`;

/** Samples per ribbon. 64 covers ~250 m of jet trail at the sampling distance. */
const SAMPLES = 64;

class Contrail {
  active = false;
  target: THREE.Object3D | null = null;
  remaining = 0;
  /** Seconds of ribbon still drawn after the object is gone. */
  linger = 0;
  jet = false;
  puffAccum = 0;

  mesh!: THREE.Mesh;
  geometry!: THREE.BufferGeometry;
  material!: THREE.ShaderMaterial;
  positions!: Float32Array;
  fades!: Float32Array;
  /** Sampled path, oldest first. */
  readonly path = new Float32Array(SAMPLES * 3);
  readonly ages = new Float32Array(SAMPLES);
  count = 0;
  readonly last = new THREE.Vector3();
  speed = 0;
}

/**
 * Ribbon contrails for rockets and the airstrike jets.
 *
 * The path is sampled at a fixed spatial interval rather than per frame, so the
 * ribbon has the same density whether the object is doing 8 m/s or 200 m/s. Each
 * sample is expanded into two vertices offset along `tangent x toCamera`, which
 * keeps the ribbon facing the camera without a geometry shader, and the offset
 * grows with the sample's age so the trail widens as it disperses — the single
 * cue that reads as "this has been sitting in the air for a while".
 */
export class ContrailSystem {
  private ctx!: EngineContext;
  private readonly root = new THREE.Group();
  private readonly trails: Contrail[] = [];
  private readonly cameraPosition = new THREE.Vector3();
  private readonly worldPosition = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private readonly toCamera = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();

  private capacity = 4;

  constructor(private readonly deps: FXDeps) {}

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.capacity = ctx.config.tier === 'low' ? 2 : 4;
    this.root.name = 'fx:contrails';
    this.root.matrixAutoUpdate = false;
    ctx.scene.add(this.root);
  }

  get roots(): readonly THREE.Object3D[] {
    return [this.root];
  }

  get liveCount(): number {
    let n = 0;
    for (const t of this.trails) if (t.active) n++;
    return n;
  }

  get drawCalls(): number {
    let n = 0;
    for (const t of this.trails) if (t.active && t.mesh.visible) n++;
    return n;
  }

  attach(object: THREE.Object3D, duration: number): void {
    for (const t of this.trails) {
      if (t.active && t.target === object) {
        t.remaining = Math.max(t.remaining, duration);
        return;
      }
    }

    const trail = this.acquire();
    if (!trail) return;
    if (!trail.mesh) this.build(trail);

    trail.active = true;
    trail.target = object;
    trail.remaining = Math.max(0.2, duration);
    trail.linger = 0;
    trail.count = 0;
    trail.puffAccum = 0;
    trail.speed = 0;
    trail.jet = false;
    object.getWorldPosition(trail.last);
    trail.mesh.visible = false;
    trail.geometry.setDrawRange(0, 0);
    this.root.add(trail.mesh);
  }

  private build(trail: Contrail): void {
    const vertices = SAMPLES * 2;
    trail.positions = new Float32Array(vertices * 3);
    trail.fades = new Float32Array(vertices);
    const sides = new Float32Array(vertices);
    for (let i = 0; i < SAMPLES; i++) {
      sides[i * 2] = -1;
      sides[i * 2 + 1] = 1;
    }

    const index = new Uint16Array((SAMPLES - 1) * 6);
    for (let i = 0; i < SAMPLES - 1; i++) {
      const o = i * 6;
      const v = i * 2;
      index[o] = v;
      index[o + 1] = v + 1;
      index[o + 2] = v + 3;
      index[o + 3] = v;
      index[o + 4] = v + 3;
      index[o + 5] = v + 2;
    }

    trail.geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(trail.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const fadeAttribute = new THREE.BufferAttribute(trail.fades, 1);
    fadeAttribute.setUsage(THREE.DynamicDrawUsage);
    trail.geometry.setAttribute('position', positionAttribute);
    trail.geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    trail.geometry.setAttribute('aFade', fadeAttribute);
    trail.geometry.setIndex(new THREE.BufferAttribute(index, 1));
    trail.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    trail.material = new THREE.ShaderMaterial({
      name: 'fx:contrail',
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(1, 1, 1) },
        uOpacity: { value: 0.75 },
        uAdditive: { value: 0 },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      toneMapped: true,
      fog: false,
    });

    trail.mesh = new THREE.Mesh(trail.geometry, trail.material);
    trail.mesh.name = 'fx:contrail';
    trail.mesh.frustumCulled = false;
    trail.mesh.matrixAutoUpdate = false;
    trail.mesh.renderOrder = 6;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    this.ctx.camera.getWorldPosition(this.cameraPosition);

    for (const trail of this.trails) {
      if (!trail.active) continue;

      const target = trail.target;
      const alive = target !== null && target.parent !== null && trail.remaining > 0;
      if (alive && target) {
        trail.remaining -= dt;
        target.getWorldPosition(this.worldPosition);
        const step = this.worldPosition.distanceTo(trail.last);
        trail.speed = step / dt;
        // A jet leaves thin white vapour; a rocket leaves grey exhaust smoke.
        trail.jet = trail.speed > 60;
        if (step > (trail.jet ? 2.5 : 0.4)) {
          this.push(trail, this.worldPosition);
          trail.last.copy(this.worldPosition);
        }
        if (!trail.jet) {
          trail.puffAccum += dt;
          if (trail.puffAccum > 0.05) {
            trail.puffAccum = 0;
            this.emitExhaust(trail, this.worldPosition);
          }
        }
      } else {
        // The rocket is gone; let the ribbon hang and disperse.
        trail.linger += dt;
        if (trail.linger > (trail.jet ? 14 : 5)) {
          this.retire(trail);
          continue;
        }
      }

      for (let i = 0; i < trail.count; i++) trail.ages[i] += dt;
      this.rebuild(trail);
    }
  }

  private push(trail: Contrail, point: THREE.Vector3): void {
    if (trail.count === SAMPLES) {
      // Drop the oldest sample and slide the path down.
      trail.path.copyWithin(0, 3);
      trail.ages.copyWithin(0, 1);
      trail.count--;
    }
    const o = trail.count * 3;
    trail.path[o] = point.x;
    trail.path[o + 1] = point.y;
    trail.path[o + 2] = point.z;
    trail.ages[trail.count] = 0;
    trail.count++;
  }

  /**
   * Expand the sampled path into a camera-facing ribbon. Everything here is
   * writes into pre-allocated typed arrays; the only per-frame work is a cross
   * product per sample.
   */
  private rebuild(trail: Contrail): void {
    const count = trail.count;
    if (count < 2) {
      trail.mesh.visible = false;
      trail.geometry.setDrawRange(0, 0);
      return;
    }

    const path = trail.path;
    const positions = trail.positions;
    const fades = trail.fades;
    const jet = trail.jet;
    const maxAge = jet ? 14 : 4.5;
    // A rocket motor's plume is already about half a metre across as it leaves
    // the nozzle and a couple of metres wide by the time it has hung in the air
    // for a second. Authored much thinner than that it is a hairline at any
    // distance the rocket is actually watched from, which is to say it reads as
    // no trail at all.
    const width0 = jet ? 1.6 : 0.5;
    const growth = jet ? 2.2 : 1.1;

    for (let i = 0; i < count; i++) {
      const o = i * 3;
      this.a.set(path[o], path[o + 1], path[o + 2]);

      const prev = Math.max(0, i - 1) * 3;
      const next = Math.min(count - 1, i + 1) * 3;
      this.b.set(path[next] - path[prev], path[next + 1] - path[prev + 1], path[next + 2] - path[prev + 2]);
      if (this.b.lengthSq() < 1e-8) this.b.set(0, 1, 0);
      this.tangent.copy(this.b).normalize();

      this.toCamera.copy(this.cameraPosition).sub(this.a);
      const distance = this.toCamera.length();
      this.toCamera.multiplyScalar(1 / Math.max(distance, 1e-4));
      this.side.crossVectors(this.tangent, this.toCamera);
      if (this.side.lengthSq() < 1e-8) this.side.set(1, 0, 0);
      this.side.normalize();

      const age = trail.ages[i];
      const t = Math.min(age / maxAge, 1);
      // Widening with age, plus a taper into the head so the trail grows out of
      // the object instead of starting at full width.
      const head = Math.min(1, (count - 1 - i) * 0.5 + 0.15);
      const halfWidth = (width0 + growth * age) * head * 0.5;
      this.side.multiplyScalar(halfWidth);

      const v = i * 6;
      positions[v] = this.a.x - this.side.x;
      positions[v + 1] = this.a.y - this.side.y;
      positions[v + 2] = this.a.z - this.side.z;
      positions[v + 3] = this.a.x + this.side.x;
      positions[v + 4] = this.a.y + this.side.y;
      positions[v + 5] = this.a.z + this.side.z;

      const fade = (1 - t) * (1 - t) * head;
      fades[i * 2] = fade;
      fades[i * 2 + 1] = fade;
    }

    const positionAttribute = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const fadeAttribute = trail.geometry.getAttribute('aFade') as THREE.BufferAttribute;
    positionAttribute.addUpdateRange(0, count * 6);
    positionAttribute.needsUpdate = true;
    fadeAttribute.addUpdateRange(0, count * 2);
    fadeAttribute.needsUpdate = true;

    const uniforms = trail.material.uniforms;
    if (jet) {
      (uniforms.uColor.value as THREE.Color).setRGB(1.15, 1.18, 1.25);
      uniforms.uOpacity.value = 0.5;
      uniforms.uAdditive.value = 0.15;
    } else {
      (uniforms.uColor.value as THREE.Color).setRGB(0.42, 0.41, 0.4);
      uniforms.uOpacity.value = 0.8;
      uniforms.uAdditive.value = 0;
    }

    trail.geometry.setDrawRange(0, (count - 1) * 6);
    trail.mesh.visible = true;
  }

  /** Rocket exhaust: the ribbon carries the shape, the puffs give it body. */
  private emitExhaust(trail: Contrail, position: THREE.Vector3): void {
    const d = resetDesc();
    d.px = position.x;
    d.py = position.y;
    d.pz = position.z;
    d.vx = rng.range(-0.3, 0.3);
    d.vy = rng.range(0.05, 0.5);
    d.vz = rng.range(-0.3, 0.3);
    d.life = rng.range(1.1, 2.4);
    d.size0 = 0.35;
    d.size1 = rng.range(1.6, 2.8);
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-0.4, 0.4);
    d.r0 = 0.5;
    d.g0 = 0.49;
    d.b0 = 0.48;
    d.r1 = 0.26;
    d.g1 = 0.26;
    d.b1 = 0.27;
    d.alpha = rng.range(0.6, 1.0);
    d.gravity = -0.25;
    d.drag = 0.8;
    d.turbulence = 0.35;
    d.cell = (rng.next() * 4) | 0;
    d.fadeIn = 0.15;
    d.softness = 0.6;
    d.priority = 130;
    this.deps.groups.smoke.spawn(this.deps.now, d);
  }

  private retire(trail: Contrail): void {
    trail.active = false;
    trail.target = null;
    trail.count = 0;
    trail.mesh.visible = false;
    trail.mesh.removeFromParent();
  }

  private acquire(): Contrail | null {
    for (const t of this.trails) if (!t.active) return t;
    if (this.trails.length < this.capacity) {
      const t = new Contrail();
      this.trails.push(t);
      return t;
    }
    // Saturated: the trail closest to expiry gives way.
    let victim = this.trails[0];
    for (const t of this.trails) if (t.remaining < victim.remaining) victim = t;
    this.retire(victim);
    return victim;
  }

  clear(): void {
    for (const t of this.trails) if (t.active) this.retire(t);
  }

  dispose(): void {
    this.clear();
    for (const t of this.trails) {
      t.geometry?.dispose();
      t.material?.dispose();
    }
    this.trails.length = 0;
    this.root.removeFromParent();
  }
}
