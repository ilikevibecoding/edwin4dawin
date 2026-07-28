import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import { CONTRAIL_FRAG, CONTRAIL_VERT } from '../shaders/killstreak/contrail.glsl';

/**
 * Contrails and wingtip vortices.
 *
 * Each ribbon is a ring buffer of world-space points with a birth time. Points
 * are laid down at a fixed spacing rather than at a fixed rate, so a trail
 * behind an aircraft that slows into a turn does not bunch up, and the strip is
 * rebuilt from the ring every frame — seventy segments of four floats is
 * nothing, and doing it on the CPU is what lets the ribbon be billboarded
 * correctly against the current view instead of guessing a fixed up vector.
 *
 * The ribbon is *not* screen-space width. A contrail a kilometre away is
 * genuinely narrow and a wingtip vortex two hundred metres away is genuinely a
 * thread; forcing a minimum pixel width is the thing that makes trails read as
 * chalk lines drawn on the sky.
 */

const MIN_SPACING = 2.5;

export interface TrailStyle {
  color: THREE.Color;
  /** Half-width at birth, in metres. */
  width: number;
  /** How much the ribbon widens over its life, as a multiple of `width`. */
  spread: number;
  /** Seconds a segment survives. */
  life: number;
  opacity: number;
  /** 0 = a clean line, 1 = fully broken up by shear. */
  breakup: number;
}

export const CONTRAIL: TrailStyle = {
  color: new THREE.Color(0.92, 0.95, 1.0),
  width: 1.15,
  spread: 3.4,
  life: 11,
  opacity: 0.62,
  breakup: 1,
};

export const VORTEX: TrailStyle = {
  color: new THREE.Color(0.86, 0.9, 0.98),
  width: 0.3,
  spread: 5.5,
  life: 2.6,
  opacity: 0.42,
  breakup: 0.6,
};

export const SMOKE_TRAIL: TrailStyle = {
  color: new THREE.Color(0.2, 0.19, 0.18),
  width: 0.42,
  spread: 6.5,
  life: 5.5,
  opacity: 0.72,
  breakup: 0.35,
};

const _dir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();

class Ribbon {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly position: THREE.BufferAttribute;
  private readonly normal: THREE.BufferAttribute;
  private readonly age: THREE.BufferAttribute;
  private readonly width: THREE.BufferAttribute;
  private readonly fade: THREE.BufferAttribute;

  /** Ring of laid points: x, y, z, birth time. */
  private readonly ring: Float32Array;
  private readonly capacity: number;
  private head = -1;
  private count = 0;
  private style: TrailStyle = CONTRAIL;
  active = false;

  constructor(capacity: number, material: THREE.ShaderMaterial) {
    this.capacity = capacity;
    this.ring = new Float32Array(capacity * 4);

    const verts = capacity * 2;
    this.geometry = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.normal = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.age = new THREE.BufferAttribute(new Float32Array(verts), 1);
    this.width = new THREE.BufferAttribute(new Float32Array(verts), 1);
    this.fade = new THREE.BufferAttribute(new Float32Array(verts), 1);
    const side = new THREE.BufferAttribute(new Float32Array(verts), 1);
    for (let i = 0; i < capacity; i++) {
      side.setX(i * 2, -1);
      side.setX(i * 2 + 1, 1);
    }
    for (const attr of [this.position, this.normal, this.age, this.width, this.fade]) {
      attr.setUsage(THREE.DynamicDrawUsage);
    }
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('normal', this.normal);
    this.geometry.setAttribute('aSide', side);
    this.geometry.setAttribute('aAge', this.age);
    this.geometry.setAttribute('aWidth', this.width);
    this.geometry.setAttribute('aFade', this.fade);

    const indices = new Uint16Array((capacity - 1) * 6);
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 2;
      indices.set([a, a + 1, a + 3, a, a + 3, a + 2], i * 6);
    }
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.setDrawRange(0, 0);
    // The strip moves every frame and covers unbounded ground; a bounding
    // sphere large enough to never cull is cheaper than recomputing one.
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 6;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
  }

  begin(style: TrailStyle): void {
    this.style = style;
    this.head = -1;
    this.count = 0;
    this.active = true;
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  /** Stops laying new points; the tail is left to age out. */
  end(): void {
    this.active = false;
  }

  get styleRef(): TrailStyle {
    return this.style;
  }

  get live(): boolean {
    return this.count > 0;
  }

  lay(x: number, y: number, z: number, now: number): void {
    if (this.count > 0) {
      const h = this.head * 4;
      const dx = x - this.ring[h];
      const dy = y - this.ring[h + 1];
      const dz = z - this.ring[h + 2];
      if (dx * dx + dy * dy + dz * dz < MIN_SPACING * MIN_SPACING) {
        // Keep the head glued to the emitter between laid points, or the trail
        // visibly detaches from the nozzle at low speed.
        this.ring[h] = x;
        this.ring[h + 1] = y;
        this.ring[h + 2] = z;
        return;
      }
    }
    this.head = (this.head + 1) % this.capacity;
    const h = this.head * 4;
    this.ring[h] = x;
    this.ring[h + 1] = y;
    this.ring[h + 2] = z;
    this.ring[h + 3] = now;
    if (this.count < this.capacity) this.count++;
  }

  /** Rebuilds the strip against the current view. Returns true when visible. */
  build(now: number, camera: THREE.Vector3): boolean {
    const style = this.style;
    if (this.count < 2) {
      this.mesh.visible = false;
      return false;
    }

    const pos = this.position.array as Float32Array;
    const nrm = this.normal.array as Float32Array;
    const ageArr = this.age.array as Float32Array;
    const widthArr = this.width.array as Float32Array;
    const fadeArr = this.fade.array as Float32Array;

    // Walk oldest to newest so the strip runs tail to head.
    const oldest = (this.head - this.count + 1 + this.capacity * 2) % this.capacity;
    let written = 0;
    for (let i = 0; i < this.count; i++) {
      const idx = (oldest + i) % this.capacity;
      const r = idx * 4;
      const age = now - this.ring[r + 3];
      if (age > style.life) continue;

      _p0.set(this.ring[r], this.ring[r + 1], this.ring[r + 2]);
      const nextIdx = (idx + 1) % this.capacity;
      const prevIdx = (idx - 1 + this.capacity) % this.capacity;
      if (i + 1 < this.count) {
        _p1.set(this.ring[nextIdx * 4], this.ring[nextIdx * 4 + 1], this.ring[nextIdx * 4 + 2]);
        _dir.subVectors(_p1, _p0);
      } else {
        _p1.set(this.ring[prevIdx * 4], this.ring[prevIdx * 4 + 1], this.ring[prevIdx * 4 + 2]);
        _dir.subVectors(_p0, _p1);
      }
      if (_dir.lengthSq() < 1e-8) _dir.set(0, 0, 1);
      _toCam.subVectors(camera, _p0);
      _side.crossVectors(_dir, _toCam);
      if (_side.lengthSq() < 1e-8) _side.set(1, 0, 0);
      _side.normalize();

      const v = written * 2;
      for (let s = 0; s < 2; s++) {
        const o = (v + s) * 3;
        pos[o] = _p0.x;
        pos[o + 1] = _p0.y;
        pos[o + 2] = _p0.z;
        nrm[o] = _side.x;
        nrm[o + 1] = _side.y;
        nrm[o + 2] = _side.z;
        ageArr[v + s] = age;
        widthArr[v + s] = style.width;
        // The newest metre of trail has not formed yet, and the oldest end has
        // to run out rather than stop.
        fadeArr[v + s] = Math.min(1, i * 0.5) * Math.min(1, (this.count - i) * 0.34);
      }
      written++;
    }

    if (written < 2) {
      this.mesh.visible = false;
      this.count = 0;
      return false;
    }

    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.age.needsUpdate = true;
    this.width.needsUpdate = true;
    this.fade.needsUpdate = true;
    this.geometry.setDrawRange(0, (written - 1) * 6);
    this.mesh.visible = true;
    return true;
  }

  reset(): void {
    this.active = false;
    this.count = 0;
    this.head = -1;
    this.mesh.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

/**
 * The whole set of ribbons.
 *
 * One material per style, because the style is entirely uniform-driven and
 * three programs beats a uniform block that has to be rebound per ribbon.
 */
export class TrailSystem {
  private readonly group = new THREE.Group();
  private readonly ribbons: Ribbon[] = [];
  private readonly materials = new Map<TrailStyle, THREE.ShaderMaterial>();
  private now = 0;

  constructor(scene: THREE.Object3D, count: number, segments: number) {
    this.group.name = 'killstreak.trails';
    this.group.matrixAutoUpdate = false;
    scene.add(this.group);

    for (const style of [CONTRAIL, VORTEX, SMOKE_TRAIL]) {
      this.materials.set(style, makeMaterial(style));
    }
    // Ribbons are allocated against the first style and re-pointed on acquire;
    // the material swap is free because the geometry never changes shape.
    for (let i = 0; i < count; i++) {
      const ribbon = new Ribbon(segments, this.materials.get(CONTRAIL)!);
      this.ribbons.push(ribbon);
      this.group.add(ribbon.mesh);
    }
  }

  /** Claims a ribbon. Returns -1 when they are all in use. */
  acquire(style: TrailStyle): number {
    for (let i = 0; i < this.ribbons.length; i++) {
      const ribbon = this.ribbons[i];
      if (ribbon.active || ribbon.live) continue;
      ribbon.mesh.material = this.materials.get(style) ?? this.materials.get(CONTRAIL)!;
      ribbon.begin(style);
      return i;
    }
    return -1;
  }

  lay(index: number, x: number, y: number, z: number): void {
    if (index < 0) return;
    this.ribbons[index].lay(x, y, z, this.now);
  }

  release(index: number): void {
    if (index < 0) return;
    this.ribbons[index].end();
  }

  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.now += dt;
    for (const ribbon of this.ribbons) ribbon.build(this.now, cameraPosition);
  }

  clear(): void {
    for (const ribbon of this.ribbons) ribbon.reset();
  }

  dispose(): void {
    for (const ribbon of this.ribbons) ribbon.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.ribbons.length = 0;
    this.materials.clear();
    this.group.removeFromParent();
  }
}

function makeMaterial(style: TrailStyle): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'killstreak.contrail',
    vertexShader: CONTRAIL_VERT,
    fragmentShader: CONTRAIL_FRAG,
    uniforms: {
      uColor: { value: style.color },
      uOpacity: { value: style.opacity },
      uMaxAge: { value: style.life },
      uSpread: { value: style.spread },
      uBreakup: { value: style.breakup },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    toneMapped: false,
    fog: false,
  });
}
