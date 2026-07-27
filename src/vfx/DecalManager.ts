import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { SurfaceType } from '../core/Contracts';
import { makeRng, TAU, clamp, smoothstep } from '../core/MathX';
import { makeNoise2D } from './ParticleTextures';

/**
 * Projected surface decals: bullet holes (per surface), scorch marks, blood
 * splatter and oil stains.
 *
 * Approach: each decal is a unit quad oriented to the hit normal, nudged along
 * the normal and drawn with `polygonOffset` so it never z-fights the wall. This
 * is robust for the flat plaster / concrete / metal panels that dominate the
 * level and far cheaper than clipping DecalGeometry against the merged world
 * mesh. Every decal carries a procedurally-baked **normal map** so a bullet
 * hole reads as recessed under grazing sun.
 *
 * The pool is a fixed ring of `decalBudget` meshes, each with its own material
 * clone (for independent fade) but sharing a small set of baked textures. Every
 * material is created with map + normalMap already bound so swapping the
 * texture reference never triggers a shader recompile.
 */

type DecalKind =
  | 'bullet_concrete'
  | 'bullet_metal'
  | 'bullet_wood'
  | 'bullet_glass'
  | 'scorch'
  | 'blood'
  | 'oil';

interface DecalTex {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: number;
  metalness: number;
}

interface Slot {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  active: boolean;
  age: number;
  ttl: number;
}

const TEX_SIZE = 128;

export class DecalManager {
  private slots: Slot[] = [];
  private head = 0;
  private geom: THREE.PlaneGeometry;
  private textures = new Map<DecalKind, DecalTex>();
  private allTextures: THREE.Texture[] = [];
  private _z = new THREE.Vector3(0, 0, 1);
  private _q = new THREE.Quaternion();
  private _roll = new THREE.Quaternion();

  constructor(private ctx: EngineContext) {
    this.geom = new THREE.PlaneGeometry(1, 1);

    const kinds: DecalKind[] = [
      'bullet_concrete', 'bullet_metal', 'bullet_wood', 'bullet_glass', 'scorch', 'blood', 'oil',
    ];
    for (const k of kinds) this.textures.set(k, this.buildTexture(k));

    const placeholder = this.textures.get('bullet_concrete')!;
    const budget = Math.max(16, ctx.settings.quality.decalBudget);
    for (let i = 0; i < budget; i++) {
      const mat = new THREE.MeshStandardMaterial({
        map: placeholder.albedo,
        normalMap: placeholder.normal,
        transparent: true,
        depthWrite: false,
        roughness: 0.85,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        normalScale: new THREE.Vector2(1.1, 1.1),
      });
      mat.opacity = 0;
      const mesh = new THREE.Mesh(this.geom, mat);
      mesh.visible = false;
      mesh.frustumCulled = true;
      mesh.renderOrder = 3;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.ctx.scene.add(mesh);
      this.slots.push({ mesh, material: mat, active: false, age: 0, ttl: 30 });
    }
  }

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  /** Place a bullet-hole decal chosen by surface. */
  bulletHole(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType) {
    const kind = this.kindForSurface(surface);
    if (!kind) return;
    const size = surface === 'glass' ? 0.5 : 0.18 + Math.random() * 0.06;
    this.place(kind, point, normal, size, 34);
  }

  scorch(point: THREE.Vector3, normal: THREE.Vector3, radius: number) {
    this.place('scorch', point, normal, clamp(radius * 1.2, 0.6, 6), 60);
  }

  blood(point: THREE.Vector3, normal: THREE.Vector3, size = 0.6) {
    this.place('blood', point, normal, size, 45);
  }

  oil(point: THREE.Vector3, normal: THREE.Vector3, size = 0.8) {
    this.place('oil', point, normal, size, 90);
  }

  private kindForSurface(s: SurfaceType): DecalKind | null {
    switch (s) {
      case 'metal': return 'bullet_metal';
      case 'wood': case 'fabric': return 'bullet_wood';
      case 'glass': return 'bullet_glass';
      case 'water': return null; // ripple handled by particles
      case 'flesh': return null; // blood decals are placed separately
      default: return 'bullet_concrete';
    }
  }

  private place(kind: DecalKind, point: THREE.Vector3, normal: THREE.Vector3, size: number, ttl: number) {
    const tex = this.textures.get(kind);
    if (!tex) return;
    const slot = this.slots[this.head];
    this.head = (this.head + 1) % this.slots.length;

    slot.active = true;
    slot.age = 0;
    slot.ttl = ttl;
    slot.material.map = tex.albedo;
    slot.material.normalMap = tex.normal;
    slot.material.roughness = tex.roughness;
    slot.material.metalness = tex.metalness;
    slot.material.opacity = 1;
    slot.material.needsUpdate = false; // map/normalMap already present → no recompile

    // orient +Z to the surface normal, with a random roll about it
    this._q.setFromUnitVectors(this._z, normal);
    this._roll.setFromAxisAngle(normal, Math.random() * TAU);
    slot.mesh.quaternion.copy(this._roll).multiply(this._q);
    slot.mesh.position.copy(point).addScaledVector(normal, 0.015 + size * 0.01);
    slot.mesh.scale.set(size, size, size);
    slot.mesh.visible = true;
  }

  update(dt: number) {
    for (const s of this.slots) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.ttl) {
        s.active = false;
        s.mesh.visible = false;
        s.material.opacity = 0;
        continue;
      }
      // fade only over the last 3 seconds of life
      const fade = clamp((s.ttl - s.age) / 3, 0, 1);
      s.material.opacity = fade;
    }
  }

  // -------------------------------------------------------------------------
  // Procedural texture baking
  // -------------------------------------------------------------------------

  private buildTexture(kind: DecalKind): DecalTex {
    const n = TEX_SIZE;
    const albedo = new Uint8ClampedArray(n * n * 4);
    const height = new Float32Array(n * n);
    const noise = makeNoise2D(hashKind(kind), 64);
    const rng = makeRng(hashKind(kind) ^ 0x99);

    let roughness = 0.85;
    let metalness = 0;

    // random crack/drip seeds precomputed so the height field is deterministic
    const cracks: number[] = [];
    for (let i = 0; i < 7; i++) cracks.push(rng() * TAU);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const u = x / n - 0.5;
        const v = y / n - 0.5;
        const r = Math.hypot(u, v) * 2; // 0..~1.4
        const a = Math.atan2(v, u);
        let cr = 0, cg = 0, cb = 0, ca = 0, h = 0.5;

        switch (kind) {
          case 'bullet_concrete': {
            const edge = 0.72 + 0.22 * noise(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4, 3, 2);
            const disk = clamp(1 - r / edge, 0, 1);
            const hole = smoothstep((0.16 - r) * 6);
            const crack = crackField(a, r, cracks, noise);
            ca = clamp(disk * 1.6 + crack * disk, 0, 1);
            const dust = 0.55 + 0.25 * noise(x / n * 6, y / n * 6, 4, 2);
            const dark = 1 - hole * 0.85 - crack * 0.4;
            cr = dust * dark; cg = dust * dark * 0.96; cb = dust * dark * 0.9;
            h = 0.6 - hole * 0.6 - crack * 0.25 + (dust - 0.55) * 0.2;
            break;
          }
          case 'bullet_metal': {
            metalness = 0.7; roughness = 0.4;
            const edge = 0.55 + 0.12 * noise(Math.cos(a) * 3, Math.sin(a) * 3, 3, 2);
            const disk = clamp(1 - r / edge, 0, 1);
            const hole = smoothstep((0.14 - r) * 7);
            const rim = smoothstep((r - edge * 0.7) * 8) * disk;
            ca = clamp(disk * 1.8, 0, 1);
            const base = 0.5 - hole * 0.4 + rim * 0.5;
            cr = base; cg = base; cb = base * 1.02;
            h = 0.5 - hole * 0.7 + rim * 0.4;
            break;
          }
          case 'bullet_wood': {
            const edge = 0.6 + 0.28 * noise(Math.cos(a) * 2, Math.sin(a) * 2, 3, 2);
            const disk = clamp(1 - r / edge, 0, 1);
            const hole = smoothstep((0.16 - r) * 6);
            const splinter = Math.pow(Math.abs(Math.cos(a * 5 + noise(a, r, 2, 2) * 3)), 6) * disk;
            ca = clamp(disk * 1.5 + splinter, 0, 1);
            const grain = 0.5 + 0.2 * noise(x / n * 3, y / n * 10, 3, 2);
            const dark = 1 - hole * 0.8;
            cr = 0.42 * grain * dark; cg = 0.28 * grain * dark; cb = 0.15 * grain * dark;
            h = 0.55 - hole * 0.5 + splinter * 0.3;
            break;
          }
          case 'bullet_glass': {
            roughness = 0.2;
            const web = glassWeb(a, r, cracks, noise);
            const ring = Math.exp(-Math.pow((r - 0.28) / 0.05, 2)) * 0.7;
            ca = clamp(web + ring, 0, 1);
            cr = 0.8; cg = 0.86; cb = 0.95;
            h = 0.5 + web * 0.4;
            break;
          }
          case 'scorch': {
            const edge = 0.85 + 0.15 * noise(Math.cos(a) * 1.6 + 2, Math.sin(a) * 1.6 + 2, 4, 1.5);
            const soot = clamp(1 - r / edge, 0, 1);
            const lumps = 0.6 + 0.4 * noise(x / n * 4, y / n * 4, 5, 2);
            ca = clamp(Math.pow(soot, 1.6) * lumps * 1.3, 0, 1);
            const c = 0.06 + 0.05 * lumps;
            cr = c; cg = c * 0.9; cb = c * 0.85;
            h = 0.5; // flat
            break;
          }
          case 'blood': {
            roughness = 0.5;
            const edge = 0.6 + 0.3 * noise(Math.cos(a) * 2.4 + 6, Math.sin(a) * 2.4 + 6, 4, 2);
            let cov = clamp(1 - r / edge, 0, 1);
            // downward drips (v>0 is down in this uv space)
            const drip = v > 0 ? Math.pow(Math.abs(Math.cos(u * 22 + noise(u * 8, 0, 2, 2) * 5)), 20) * smoothstep((0.5 - r) * 3) : 0;
            cov = clamp(cov + drip * 0.8, 0, 1);
            const spatter = noise(x / n * 7, y / n * 7, 4, 2);
            cov *= 0.5 + spatter;
            ca = clamp(cov, 0, 1);
            const dark = 0.35 + 0.25 * spatter - r * 0.15;
            cr = clamp(dark, 0.05, 0.6); cg = 0.03 + 0.03 * spatter; cb = 0.02 + 0.02 * spatter;
            h = 0.5 + cov * 0.12;
            break;
          }
          case 'oil': {
            roughness = 0.12; metalness = 0.1;
            const edge = 0.7 + 0.25 * noise(Math.cos(a) * 1.8 + 3, Math.sin(a) * 1.8 + 3, 4, 1.5);
            let cov = clamp(1 - r / edge, 0, 1);
            const lumps = 0.6 + 0.4 * noise(x / n * 3.5, y / n * 3.5, 5, 2);
            cov = Math.pow(cov, 1.4) * lumps;
            ca = clamp(cov * 1.3, 0, 1);
            const c = 0.03 + 0.03 * lumps;
            cr = c; cg = c * 1.05; cb = c * 1.1;
            h = 0.5 + cov * 0.05;
            break;
          }
        }

        const i = (y * n + x) * 4;
        albedo[i] = cr * 255;
        albedo[i + 1] = cg * 255;
        albedo[i + 2] = cb * 255;
        albedo[i + 3] = ca * 255;
        height[y * n + x] = h;
      }
    }

    const albedoTex = canvasFromRGBA(albedo, n, `decal-${kind}-albedo`);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    const normalTex = normalFromHeight(height, n, kind === 'scorch' || kind === 'oil' ? 0.6 : 2.2, `decal-${kind}-normal`);
    normalTex.colorSpace = THREE.NoColorSpace;

    this.allTextures.push(albedoTex, normalTex);
    return { albedo: albedoTex, normal: normalTex, roughness, metalness };
  }

  dispose() {
    for (const s of this.slots) {
      this.ctx.scene.remove(s.mesh);
      s.material.dispose();
    }
    for (const t of this.allTextures) t.dispose();
    this.geom.dispose();
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function crackField(a: number, r: number, seeds: number[], noise: (x: number, y: number, o?: number, f?: number) => number): number {
  let c = 0;
  for (const s of seeds) {
    const d = Math.abs(((a - s + Math.PI * 3) % TAU) - Math.PI);
    const wob = noise(Math.cos(s) * 3 + r * 4, Math.sin(s) * 3, 2, 2) * 0.15;
    c = Math.max(c, Math.exp(-Math.pow((d - wob) / 0.06, 2)) * clamp(r * 1.4, 0, 1) * (1 - r * 0.6));
  }
  return clamp(c, 0, 1);
}

function glassWeb(a: number, r: number, seeds: number[], noise: (x: number, y: number, o?: number, f?: number) => number): number {
  let radial = 0;
  for (const s of seeds) {
    const d = Math.abs(((a - s + Math.PI * 3) % TAU) - Math.PI);
    radial = Math.max(radial, Math.exp(-Math.pow(d / 0.03, 2)));
  }
  const conc = Math.abs(Math.sin(r * 26 + noise(a, r, 2, 2) * 4));
  const concBands = smoothstep((conc - 0.86) * 20) * clamp(1 - r / 0.9, 0, 1);
  const web = clamp(radial * clamp(1 - r / 0.95, 0, 1) + concBands, 0, 1);
  return web * (0.6 + 0.4 * noise(Math.cos(a) * 5, Math.sin(a) * 5, 2, 2));
}

function hashKind(k: string): number {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function canvasFromRGBA(data: Uint8ClampedArray, n: number, name: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = n; canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.name = name;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function normalFromHeight(h: Float32Array, n: number, strength: number, name: string): THREE.CanvasTexture {
  const out = new Uint8ClampedArray(n * n * 4);
  const at = (x: number, y: number) => h[clamp(y, 0, n - 1) * n + clamp(x, 0, n - 1)];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      out[i] = ((dx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return canvasFromRGBA(out, n, name);
}
