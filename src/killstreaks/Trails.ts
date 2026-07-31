/**
 * Pooled vapour ribbons for wingtips, bomb bodies and the cluster canister.
 *
 * `fx.contrail` exists and is used for the jets' engine trails, but it holds four
 * slots on high and two on low — enough for a couple of rockets, nowhere near the
 * six wingtips and nine bomb trails a carpet run puts in the air at once. Rather
 * than thrash the fx pool, this is a second, cheaper ribbon system sized for the
 * job: twenty ribbons in one geometry, one draw call, no allocation after init.
 *
 * The whole pool is a single indexed mesh. A ribbon that is not in use has its
 * fade attribute zeroed, so its triangles are discarded in the fragment shader
 * and cost nothing beyond the vertex transform. Sampling is by distance rather
 * than by frame, so a 180 m/s bomb and a 27 m/s drone leave the same ribbon
 * density.
 */
import * as THREE from 'three';
import type { EngineContext } from '../core/System';

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
varying float vSide;
varying float vFade;
void main() {
  float edge = pow(max(1.0 - abs(vSide), 0.0), 1.4);
  float alpha = clamp(vFade * uOpacity * edge, 0.0, 1.0);
  if (alpha <= 0.004) discard;
  gl_FragColor = vec4(uColor * alpha, alpha * 0.86);
}
`;

/** Samples per ribbon. 32 x 6 m spacing covers ~190 m of bomb trail. */
const SAMPLES = 32;

interface Ribbon {
  active: boolean;
  /** Still drawn while it disperses after the object is gone. */
  lingering: boolean;
  target: THREE.Object3D | null;
  count: number;
  spacing: number;
  width: number;
  growth: number;
  maxAge: number;
  linger: number;
  /** Bumped on every acquire so a stale handle cannot touch a reused slot. */
  generation: number;
}

export interface RibbonOptions {
  /** Ribbon half-width at birth, metres. */
  width?: number;
  /** Metres of extra width per second of age. */
  growth?: number;
  /** Age at which a sample has fully dispersed. */
  maxAge?: number;
  /** Distance between path samples, metres. */
  spacing?: number;
}

export class RibbonTrails {
  private ctx: EngineContext | null = null;
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private readonly ribbons: Ribbon[] = [];
  private readonly capacity: number;

  private positions!: Float32Array;
  private fades!: Float32Array;
  /** Sampled world paths, `capacity * SAMPLES * 3`. */
  private paths!: Float32Array;
  private ages!: Float32Array;
  private last!: Float32Array;

  private readonly cameraPosition = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private readonly toCamera = new THREE.Vector3();
  private readonly side = new THREE.Vector3();

  constructor(capacity = 20) {
    this.capacity = capacity;
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const verts = this.capacity * SAMPLES * 2;
    this.positions = new Float32Array(verts * 3);
    this.fades = new Float32Array(verts);
    this.paths = new Float32Array(this.capacity * SAMPLES * 3);
    this.ages = new Float32Array(this.capacity * SAMPLES);
    this.last = new Float32Array(this.capacity * 3);

    const sides = new Float32Array(verts);
    for (let i = 0; i < verts; i += 2) {
      sides[i] = -1;
      sides[i + 1] = 1;
    }

    const triangles = this.capacity * (SAMPLES - 1) * 2;
    const index = verts > 65535 ? new Uint32Array(triangles * 3) : new Uint16Array(triangles * 3);
    let o = 0;
    for (let r = 0; r < this.capacity; r++) {
      const base = r * SAMPLES * 2;
      for (let s = 0; s < SAMPLES - 1; s++) {
        const v = base + s * 2;
        index[o++] = v;
        index[o++] = v + 1;
        index[o++] = v + 3;
        index[o++] = v;
        index[o++] = v + 3;
        index[o++] = v + 2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const fadeAttribute = new THREE.BufferAttribute(this.fades, 1);
    fadeAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    geometry.setAttribute('aFade', fadeAttribute);
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const material = new THREE.ShaderMaterial({
      name: 'ks:ribbon',
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(1.1, 1.13, 1.2) },
        uOpacity: { value: 0.6 },
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

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ks:ribbons';
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 6;
    mesh.visible = false;
    ctx.scene.add(mesh);

    this.mesh = mesh;
    this.geometry = geometry;
    this.material = material;

    for (let i = 0; i < this.capacity; i++) {
      this.ribbons.push({
        active: false,
        lingering: false,
        target: null,
        count: 0,
        spacing: 4,
        width: 0.6,
        growth: 1.2,
        maxAge: 6,
        linger: 0,
        generation: 0,
      });
    }
  }

  /**
   * Starts a ribbon on `target`. Returns a handle, or -1 when the pool is full
   * and every slot is still being actively fed.
   */
  attach(target: THREE.Object3D, options: RibbonOptions = {}): number {
    let slot = -1;
    for (let i = 0; i < this.ribbons.length; i++) {
      if (!this.ribbons[i].active) {
        slot = i;
        break;
      }
    }
    if (slot < 0) {
      // Saturated: take the one that has been dispersing longest.
      let oldest = -1;
      let best = -1;
      for (let i = 0; i < this.ribbons.length; i++) {
        const r = this.ribbons[i];
        if (r.lingering && r.linger > best) {
          best = r.linger;
          oldest = i;
        }
      }
      if (oldest < 0) return -1;
      slot = oldest;
    }

    const ribbon = this.ribbons[slot];
    ribbon.active = true;
    ribbon.lingering = false;
    ribbon.target = target;
    ribbon.count = 0;
    ribbon.linger = 0;
    ribbon.spacing = options.spacing ?? 4;
    ribbon.width = options.width ?? 0.6;
    ribbon.growth = options.growth ?? 1.2;
    ribbon.maxAge = options.maxAge ?? 6;
    ribbon.generation++;

    target.getWorldPosition(this.point);
    const o = slot * 3;
    this.last[o] = this.point.x;
    this.last[o + 1] = this.point.y;
    this.last[o + 2] = this.point.z;
    this.zero(slot);
    return (slot << 8) | (ribbon.generation & 0xff);
  }

  /** Detaches the ribbon; the vapour already laid down hangs and disperses. */
  release(handle: number): void {
    const ribbon = this.resolve(handle);
    if (!ribbon) return;
    ribbon.target = null;
    ribbon.lingering = true;
    ribbon.linger = 0;
  }

  private resolve(handle: number): Ribbon | null {
    if (handle < 0) return null;
    const slot = handle >> 8;
    if (slot < 0 || slot >= this.ribbons.length) return null;
    const ribbon = this.ribbons[slot];
    if (!ribbon.active || (ribbon.generation & 0xff) !== (handle & 0xff)) return null;
    return ribbon;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const geometry = this.geometry;
    if (!ctx || !geometry || dt <= 0) return;
    ctx.camera.getWorldPosition(this.cameraPosition);

    let anyActive = false;
    let dirty = false;
    for (let slot = 0; slot < this.ribbons.length; slot++) {
      const ribbon = this.ribbons[slot];
      if (!ribbon.active) continue;
      anyActive = true;
      dirty = true;

      if (ribbon.target && ribbon.target.parent) {
        ribbon.target.getWorldPosition(this.point);
        const o = slot * 3;
        const dx = this.point.x - this.last[o];
        const dy = this.point.y - this.last[o + 1];
        const dz = this.point.z - this.last[o + 2];
        if (dx * dx + dy * dy + dz * dz > ribbon.spacing * ribbon.spacing) {
          this.push(slot, this.point);
          this.last[o] = this.point.x;
          this.last[o + 1] = this.point.y;
          this.last[o + 2] = this.point.z;
        }
      } else {
        ribbon.lingering = true;
        ribbon.linger += dt;
        if (ribbon.linger > ribbon.maxAge) {
          this.retire(slot);
          continue;
        }
      }

      const ageBase = slot * SAMPLES;
      for (let i = 0; i < ribbon.count; i++) this.ages[ageBase + i] += dt;
      this.rebuild(slot, ribbon);
    }

    if (this.mesh) this.mesh.visible = anyActive;
    if (dirty) {
      (geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (geometry.getAttribute('aFade') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private push(slot: number, point: THREE.Vector3): void {
    const ribbon = this.ribbons[slot];
    const pathBase = slot * SAMPLES * 3;
    const ageBase = slot * SAMPLES;
    if (ribbon.count === SAMPLES) {
      this.paths.copyWithin(pathBase, pathBase + 3, pathBase + SAMPLES * 3);
      this.ages.copyWithin(ageBase, ageBase + 1, ageBase + SAMPLES);
      ribbon.count--;
    }
    const o = pathBase + ribbon.count * 3;
    this.paths[o] = point.x;
    this.paths[o + 1] = point.y;
    this.paths[o + 2] = point.z;
    this.ages[ageBase + ribbon.count] = 0;
    ribbon.count++;
  }

  private rebuild(slot: number, ribbon: Ribbon): void {
    const count = ribbon.count;
    const vertexBase = slot * SAMPLES * 2;
    if (count < 2) {
      this.zero(slot);
      return;
    }

    const paths = this.paths;
    const pathBase = slot * SAMPLES * 3;
    const ageBase = slot * SAMPLES;

    for (let i = 0; i < count; i++) {
      const o = pathBase + i * 3;
      const px = paths[o];
      const py = paths[o + 1];
      const pz = paths[o + 2];

      const prev = pathBase + Math.max(0, i - 1) * 3;
      const next = pathBase + Math.min(count - 1, i + 1) * 3;
      this.tangent.set(
        paths[next] - paths[prev],
        paths[next + 1] - paths[prev + 1],
        paths[next + 2] - paths[prev + 2],
      );
      if (this.tangent.lengthSq() < 1e-8) this.tangent.set(0, 1, 0);
      this.tangent.normalize();

      this.toCamera.set(
        this.cameraPosition.x - px,
        this.cameraPosition.y - py,
        this.cameraPosition.z - pz,
      );
      const distance = this.toCamera.length();
      this.toCamera.multiplyScalar(1 / Math.max(distance, 1e-4));
      this.side.crossVectors(this.tangent, this.toCamera);
      if (this.side.lengthSq() < 1e-8) this.side.set(1, 0, 0);
      this.side.normalize();

      const age = this.ages[ageBase + i];
      const t = Math.min(age / ribbon.maxAge, 1);
      // Taper into the head so the ribbon grows out of the object rather than
      // starting at full width, and widen with age as the vapour disperses.
      const head = Math.min(1, (count - 1 - i) * 0.6 + 0.12);
      const half = (ribbon.width + ribbon.growth * age) * head;
      this.side.multiplyScalar(half);

      const v = (vertexBase + i * 2) * 3;
      this.positions[v] = px - this.side.x;
      this.positions[v + 1] = py - this.side.y;
      this.positions[v + 2] = pz - this.side.z;
      this.positions[v + 3] = px + this.side.x;
      this.positions[v + 4] = py + this.side.y;
      this.positions[v + 5] = pz + this.side.z;

      const fade = (1 - t) * (1 - t) * head;
      this.fades[vertexBase + i * 2] = fade;
      this.fades[vertexBase + i * 2 + 1] = fade;
    }

    // Collapse the unused tail of the slot onto the last live sample so its
    // triangles are zero-area as well as transparent.
    const tail = pathBase + (count - 1) * 3;
    for (let i = count; i < SAMPLES; i++) {
      const v = (vertexBase + i * 2) * 3;
      this.positions[v] = this.positions[v + 3] = paths[tail];
      this.positions[v + 1] = this.positions[v + 4] = paths[tail + 1];
      this.positions[v + 2] = this.positions[v + 5] = paths[tail + 2];
      this.fades[vertexBase + i * 2] = 0;
      this.fades[vertexBase + i * 2 + 1] = 0;
    }
  }

  private zero(slot: number): void {
    const vertexBase = slot * SAMPLES * 2;
    this.positions.fill(0, vertexBase * 3, (vertexBase + SAMPLES * 2) * 3);
    this.fades.fill(0, vertexBase, vertexBase + SAMPLES * 2);
  }

  private retire(slot: number): void {
    const ribbon = this.ribbons[slot];
    ribbon.active = false;
    ribbon.lingering = false;
    ribbon.target = null;
    ribbon.count = 0;
    this.zero(slot);
  }

  clear(): void {
    for (let i = 0; i < this.ribbons.length; i++) if (this.ribbons[i].active) this.retire(i);
    if (this.mesh) this.mesh.visible = false;
    const geometry = this.geometry;
    if (geometry) {
      (geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (geometry.getAttribute('aFade') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    this.clear();
    this.mesh?.removeFromParent();
    this.geometry?.dispose();
    this.material?.dispose();
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.ribbons.length = 0;
    this.ctx = null;
  }
}
