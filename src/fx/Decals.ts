import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import type { WorldSystem } from '../core/Contracts';
import { SURFACE_PROPERTIES, type SurfaceType } from '../core/GameTypes';
import { rng } from '../core/MathUtils';
import { DECAL_CELL, type AtlasInfo } from './Textures';
import { DECAL_FRAGMENT, DECAL_VERTEX_INSTANCED, DECAL_VERTEX_PATCH } from './shaders/DecalShader';
import type { FXDeps } from './Shared';

const STRIDE = 28;

const QUAD_POSITION = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

/** Bullet-hole cell per surface family, with variants picked at random. */
const HOLE_CELLS: Record<SurfaceType, readonly number[]> = {
  concrete: [DECAL_CELL.CONCRETE_A, DECAL_CELL.CONCRETE_B],
  brick: [DECAL_CELL.BRICK, DECAL_CELL.CONCRETE_A],
  plaster: [DECAL_CELL.PLASTER, DECAL_CELL.CONCRETE_B],
  tile: [DECAL_CELL.PLASTER, DECAL_CELL.GLASS_A],
  metal: [DECAL_CELL.METAL_A, DECAL_CELL.METAL_B],
  wood: [DECAL_CELL.WOOD_A, DECAL_CELL.WOOD_B],
  glass: [DECAL_CELL.GLASS_A, DECAL_CELL.GLASS_B],
  dirt: [DECAL_CELL.DIVOT_DIRT],
  sand: [DECAL_CELL.DIVOT_DIRT],
  gravel: [DECAL_CELL.DIVOT_GRAVEL],
  grass: [DECAL_CELL.DIVOT_DIRT],
  foliage: [DECAL_CELL.DIVOT_DIRT],
  fabric: [DECAL_CELL.WOOD_B],
  rubber: [DECAL_CELL.METAL_B],
  water: [DECAL_CELL.DIVOT_DIRT],
  flesh: [DECAL_CELL.BLOOD_A, DECAL_CELL.BLOOD_B],
};

export type DecalKind = 'hole' | 'blood' | 'pool' | 'scorch' | 'crater';

export interface DecalRequest {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
  kind: DecalKind;
  surface: SurfaceType;
  /** Override tint; defaults to the surface's authored decal colour. */
  color?: number;
  opacity?: number;
  /** Probe the receiving surface and clip the quad to it. */
  conform?: boolean;
}

/**
 * Pooled, projected decals.
 *
 * Small decals are one instance in a single batched draw. Large ones — craters,
 * scorch fields, pools — additionally get a tessellated patch snapped onto the
 * ground so they follow it instead of floating over it, and their quads get
 * their edges probed against the receiving geometry so a crater at the lip of a
 * kerb is cut off at the kerb.
 *
 * Recycling is a ring: the write cursor advances, and the shader fades whatever
 * is about to be overwritten, so the oldest decal dissolves rather than popping.
 */
export class DecalSystem {
  readonly root = new THREE.Group();

  private ctx!: EngineContext;
  private atlas!: AtlasInfo;
  private deps!: FXDeps;

  private capacity = 256;
  private fadeCount = 24;
  private sequence = 0;
  private writeCursor = 0;
  private live = 0;

  private data!: Float32Array;
  private buffer!: THREE.InstancedInterleavedBuffer;
  private geometry!: THREE.InstancedBufferGeometry;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;

  private patchMaterialTemplate!: THREE.ShaderMaterial;
  private readonly patches: DecalPatch[] = [];
  private patchCursor = 0;
  private patchCapacity = 4;

  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly probeOrigin = new THREE.Vector3();
  private readonly probeDir = new THREE.Vector3();
  private readonly tint = new THREE.Color();
  private readonly tone = new THREE.Color();
  private readonly clip = new THREE.Vector4();
  private readonly rayOptions = { maxDistance: 0.4 };

  private placed = 0;

  init(ctx: EngineContext, atlas: AtlasInfo, deps: FXDeps): void {
    this.ctx = ctx;
    this.atlas = atlas;
    // Physics and world both boot after FX, so they are read through the shared
    // dependency block, which picks them up on the first frame.
    this.deps = deps;
    this.root.name = 'fx:decals';
    this.root.matrixAutoUpdate = false;
    this.build();
    ctx.scene.add(this.root);
  }

  private build(): void {
    const config = this.ctx.config;
    this.capacity = Math.max(32, config.decalBudget);
    this.fadeCount = Math.max(6, Math.round(this.capacity * 0.12));
    this.patchCapacity = config.tier === 'low' ? 2 : config.tier === 'medium' ? 4 : 6;

    this.data = new Float32Array(this.capacity * STRIDE);
    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(QUAD_POSITION, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    this.geometry.setAttribute('aOrigin', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    this.geometry.setAttribute('aRight', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    this.geometry.setAttribute('aUp', new THREE.InterleavedBufferAttribute(this.buffer, 4, 8));
    this.geometry.setAttribute('aColor', new THREE.InterleavedBufferAttribute(this.buffer, 4, 12));
    this.geometry.setAttribute('aParams', new THREE.InterleavedBufferAttribute(this.buffer, 4, 16));
    this.geometry.setAttribute('aClip', new THREE.InterleavedBufferAttribute(this.buffer, 4, 20));
    this.geometry.setAttribute('aTone', new THREE.InterleavedBufferAttribute(this.buffer, 4, 24));
    this.geometry.instanceCount = 0;
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      name: 'fx:decal',
      vertexShader: DECAL_VERTEX_INSTANCED,
      fragmentShader: DECAL_FRAGMENT,
      uniforms: this.commonUniforms(),
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.FrontSide,
      // The quad already sits a couple of millimetres off the surface; the
      // offset covers the rest of the depth-precision range at distance.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
      toneMapped: true,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'fx:decalBatch';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // Before particles, after opaque geometry.
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    this.root.add(this.mesh);

    this.patchMaterialTemplate = new THREE.ShaderMaterial({
      name: 'fx:decalPatch',
      vertexShader: DECAL_VERTEX_PATCH,
      fragmentShader: DECAL_FRAGMENT,
      uniforms: {
        ...this.commonUniforms(),
        aOriginU: { value: new THREE.Vector4() },
        aColorU: { value: new THREE.Vector4(1, 1, 1, 1) },
        aParamsU: { value: new THREE.Vector4() },
        aToneU: { value: new THREE.Vector4(1, 1, 1, 1) },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
      toneMapped: true,
      fog: false,
    });
  }

  private commonUniforms(): Record<string, THREE.IUniform> {
    return {
      uMap: { value: this.atlas.texture },
      uAtlas: { value: new THREE.Vector2(this.atlas.cols, this.atlas.rows) },
      uTime: { value: 0 },
      uSequence: { value: 0 },
      uRing: { value: new THREE.Vector2(this.capacity, this.fadeCount) },
      uSunDirView: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uAmbientColor: { value: new THREE.Color(0.25, 0.28, 0.33) },
    };
  }

  get liveCount(): number {
    return this.live;
  }

  get placedCount(): number {
    return this.placed;
  }

  get drawCalls(): number {
    let n = this.mesh.visible ? 1 : 0;
    for (let i = 0; i < this.patches.length; i++) if (this.patches[i].mesh.visible) n++;
    return n;
  }

  resetStats(): void {
    this.placed = 0;
  }

  /** Cell index for a bullet hole on `surface`. */
  holeCell(surface: SurfaceType): number {
    const cells = HOLE_CELLS[surface] ?? HOLE_CELLS.concrete;
    return cells[Math.min(cells.length - 1, (rng.next() * cells.length) | 0)];
  }

  place(request: DecalRequest): void {
    const point = request.point;
    const normal = this.normal.copy(request.normal);
    if (normal.lengthSq() < 1e-8) normal.set(0, 1, 0);
    normal.normalize();

    const size = Math.max(0.01, request.size);
    let cell: number;
    let opacity = request.opacity ?? 1;
    let fadeDelay = 0;
    let fadeDuration = 0;
    let colorHex = request.color;
    // The light half of the two-tone pair: whatever the atlas marks as spalled,
    // torn or wet rather than as hole.
    let toneHex = 0xffffff;
    let paleBoost = 1;
    /** How far the dark half is pulled toward the light half. */
    let pitLift = 0;

    switch (request.kind) {
      case 'blood':
        cell = rng.bool() ? DECAL_CELL.BLOOD_A : DECAL_CELL.BLOOD_B;
        colorHex ??= 0x4a0c0c;
        // Fresh blood has a wet sheen at the edges of the spatter.
        toneHex = 0x8a1f14;
        fadeDelay = 14;
        fadeDuration = 26;
        break;
      case 'pool':
        cell = DECAL_CELL.BLOOD_POOL;
        colorHex ??= 0x3a0808;
        toneHex = 0x6d1410;
        fadeDelay = 22;
        fadeDuration = 40;
        break;
      case 'scorch':
        cell = DECAL_CELL.CRATER;
        // Burnt, not black. A scorch mark is soot lying on a surface that is
        // still lit by the same sun as everything around it; authoring it at the
        // luminance of actual charcoal is what produces the black-ellipse look.
        colorHex ??= 0x3b332b;
        toneHex = 0x8c8377;
        opacity *= 0.72;
        break;
      case 'crater':
        cell = DECAL_CELL.CRATER;
        colorHex ??= 0x453b31;
        // Pulverised apron: the surface's own dust, thrown out of the hole.
        toneHex = SURFACE_PROPERTIES[request.surface]?.dustColor ?? 0x8b8378;
        break;
      default:
        cell = this.holeCell(request.surface);
        colorHex ??= SURFACE_PROPERTIES[request.surface]?.decalColor ?? 0x24211e;
        toneHex = SURFACE_PROPERTIES[request.surface]?.dustColor ?? 0x9a938a;
        // The authored dust colour is the colour of a *cloud* of the pulverised
        // material. The spall around a hole is the same material as a solid
        // freshly-broken face, which is brighter than both the cloud and the
        // weathered surface next to it — and it has to be brighter, or the mark
        // resolves to one flat tone against the wall and reads as a stain.
        paleBoost = 1.8;
        // The pit is not a void. It is a couple of centimetres deep and open to
        // the sky, so it is lit by the same bounce as everything else and sits a
        // stop or two under the wall rather than at zero. Taken at the authored
        // hole colour alone — every one of which is under six per cent
        // reflectance — a bullet hole renders as a hole punched through to
        // nothing, which is the black-dot look. Lifting it toward the surface's
        // own dust keeps it dark without making it a void.
        pitLift = 0.34;
        break;
    }

    this.basisFor(normal, rng.range(0, Math.PI * 2));

    // Random per-instance aspect so repeated hits on the same wall never stamp
    // an identical shape.
    const halfW = size * 0.5 * rng.range(0.9, 1.14);
    const halfH = size * 0.5 * rng.range(0.9, 1.14);

    this.tint.set(colorHex);
    this.tone.set(toneHex);
    if (pitLift > 0) this.tint.lerp(this.tone, pitLift);
    this.tone.multiplyScalar(paleBoost);
    this.sequence++;
    this.placed++;

    // A conforming ground patch and a flat quad of the same decal would stack
    // their coverage, and two 0.7-opacity stamps on top of each other read as
    // 0.91 — paint rather than soot. The patch replaces the quad instead of
    // joining it, and it needs no edge probing because its vertices are already
    // snapped to the ground.
    if (
      (request.kind === 'crater' || request.kind === 'scorch' || request.kind === 'pool') &&
      size > 0.8 &&
      normal.y > 0.65 &&
      this.placePatch(point, size, cell, this.tint, this.tone, opacity, fadeDelay, fadeDuration)
    ) {
      return;
    }

    this.clip.set(-1, 1, -1, 1);
    if (request.conform && size > 0.3) this.probeEdges(point, normal, halfW, halfH);

    const slot = this.writeCursor;
    this.writeCursor = (this.writeCursor + 1) % this.capacity;
    if (this.live < this.capacity) this.live++;

    const o = slot * STRIDE;
    const a = this.data;
    // Lift off the surface: enough to clear depth precision, small enough that
    // the parallax is invisible at any angle a player can get to.
    const lift = 0.004 + size * 0.004;
    a[o] = point.x + normal.x * lift;
    a[o + 1] = point.y + normal.y * lift;
    a[o + 2] = point.z + normal.z * lift;
    a[o + 3] = this.sequence;
    a[o + 4] = this.right.x;
    a[o + 5] = this.right.y;
    a[o + 6] = this.right.z;
    a[o + 7] = halfW;
    a[o + 8] = this.up.x;
    a[o + 9] = this.up.y;
    a[o + 10] = this.up.z;
    a[o + 11] = halfH;
    a[o + 12] = this.tint.r;
    a[o + 13] = this.tint.g;
    a[o + 14] = this.tint.b;
    a[o + 15] = opacity;
    a[o + 16] = cell;
    a[o + 17] = this.ctx.time.elapsed;
    a[o + 18] = fadeDelay;
    a[o + 19] = fadeDuration;
    a[o + 20] = this.clip.x;
    a[o + 21] = this.clip.y;
    a[o + 22] = this.clip.z;
    a[o + 23] = this.clip.w;
    a[o + 24] = this.tone.r;
    a[o + 25] = this.tone.g;
    a[o + 26] = this.tone.b;
    a[o + 27] = 0;

    this.buffer.addUpdateRange(o, STRIDE);
    this.buffer.needsUpdate = true;
    this.geometry.instanceCount = this.live;
    this.mesh.visible = true;
  }

  /**
   * Stable tangent frame with a random roll. Picking the seed axis by the
   * normal's smallest component keeps the cross product well conditioned on
   * walls, floors and ceilings alike.
   */
  private basisFor(normal: THREE.Vector3, roll: number): void {
    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);
    if (ax <= ay && ax <= az) this.right.set(1, 0, 0);
    else if (ay <= az) this.right.set(0, 1, 0);
    else this.right.set(0, 0, 1);
    this.up.crossVectors(normal, this.right).normalize();
    this.right.crossVectors(this.up, normal).normalize();

    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const rx = this.right.x * c + this.up.x * s;
    const ry = this.right.y * c + this.up.y * s;
    const rz = this.right.z * c + this.up.z * s;
    const ux = this.up.x * c - this.right.x * s;
    const uy = this.up.y * c - this.right.y * s;
    const uz = this.up.z * c - this.right.z * s;
    this.right.set(rx, ry, rz);
    this.up.set(ux, uy, uz);
  }

  /**
   * Walk out along each of the four edges and check the surface is still there.
   * A miss means the decal overhangs, and the clip rectangle pulls that side in.
   */
  private probeEdges(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    halfW: number,
    halfH: number,
  ): void {
    const physics = this.deps.physics;
    if (!physics || !physics.ready) return;
    this.probeDir.copy(normal).negate();
    this.clip.x = -this.probe(point, normal, this.right, -halfW);
    this.clip.y = this.probe(point, normal, this.right, halfW);
    this.clip.z = -this.probe(point, normal, this.up, -halfH);
    this.clip.w = this.probe(point, normal, this.up, halfH);
  }

  /** Returns the fraction of `extent` that still has surface under it. */
  private probe(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    axis: THREE.Vector3,
    extent: number,
  ): number {
    const physics = this.deps.physics;
    if (!physics) return 1;
    const lift = 0.12;
    for (let i = 0; i < 2; i++) {
      const fraction = i === 0 ? 1 : 0.6;
      this.probeOrigin
        .copy(point)
        .addScaledVector(axis, extent * fraction)
        .addScaledVector(normal, lift);
      this.rayOptions.maxDistance = lift * 2.2;
      const hit = physics.raycast(this.probeOrigin, this.probeDir, this.rayOptions);
      if (hit) return fraction;
    }
    return 0.35;
  }

  // -------------------------------------------------------------------------
  // Ground patches
  // -------------------------------------------------------------------------

  /** Returns false when no patch could be built and the caller must fall back. */
  private placePatch(
    point: THREE.Vector3,
    size: number,
    cell: number,
    tint: THREE.Color,
    tone: THREE.Color,
    opacity: number,
    fadeDelay: number,
    fadeDuration: number,
  ): boolean {
    const world = this.deps.world;
    if (!world || this.patchCapacity === 0) return false;

    let patch = this.patches[this.patchCursor];
    if (!patch) {
      if (this.patches.length >= this.patchCapacity) return false;
      patch = new DecalPatch(this.patchMaterialTemplate.clone());
      this.patches.push(patch);
      this.root.add(patch.mesh);
    }
    this.patchCursor = (this.patchCursor + 1) % this.patchCapacity;

    patch.shape(point, size, world);
    patch.style(
      cell,
      tint,
      tone,
      opacity,
      this.sequence,
      this.ctx.time.elapsed,
      fadeDelay,
      fadeDuration,
    );
    return true;
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(time: number, sunDirView: THREE.Vector3, sunColor: THREE.Color, ambient: THREE.Color): void {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uSequence.value = this.sequence;
    (u.uSunDirView.value as THREE.Vector3).copy(sunDirView);
    (u.uSunColor.value as THREE.Color).copy(sunColor);
    (u.uAmbientColor.value as THREE.Color).copy(ambient);

    for (let i = 0; i < this.patches.length; i++) {
      const pu = this.patches[i].material.uniforms;
      pu.uTime.value = time;
      pu.uSequence.value = this.sequence;
      (pu.uSunDirView.value as THREE.Vector3).copy(sunDirView);
      (pu.uSunColor.value as THREE.Color).copy(sunColor);
      (pu.uAmbientColor.value as THREE.Color).copy(ambient);
    }
  }

  clear(): void {
    this.live = 0;
    this.writeCursor = 0;
    this.sequence = 0;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
    this.data.fill(0);
    this.buffer.needsUpdate = true;
    for (let i = 0; i < this.patches.length; i++) this.patches[i].mesh.visible = false;
    this.patchCursor = 0;
  }

  onQualityChanged(): void {
    const wasParent = this.root;
    for (const patch of this.patches) {
      wasParent.remove(patch.mesh);
      patch.dispose();
    }
    this.patches.length = 0;
    this.patchCursor = 0;
    this.root.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.patchMaterialTemplate.dispose();
    this.build();
  }

  dispose(): void {
    this.ctx?.scene.remove(this.root);
    for (const patch of this.patches) patch.dispose();
    this.patches.length = 0;
    this.geometry.dispose();
    this.material.dispose();
    this.patchMaterialTemplate.dispose();
  }
}

const PATCH_SEGMENTS = 10;

/**
 * A decal that follows the ground. Vertices are snapped to `sampleGround` at
 * placement time and the normals are rebuilt from the sampled heights, so a
 * crater across a kerb or a slope bends with it.
 */
class DecalPatch {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly heights: Float32Array;

  constructor(material: THREE.ShaderMaterial) {
    this.material = material;
    const n = PATCH_SEGMENTS + 1;
    const vertexCount = n * n;
    this.positions = new Float32Array(vertexCount * 3);
    this.normals = new Float32Array(vertexCount * 3);
    this.heights = new Float32Array(vertexCount);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint16Array(PATCH_SEGMENTS * PATCH_SEGMENTS * 6);

    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        uvs[i * 2] = x / PATCH_SEGMENTS;
        uvs[i * 2 + 1] = z / PATCH_SEGMENTS;
      }
    }
    let k = 0;
    for (let z = 0; z < PATCH_SEGMENTS; z++) {
      for (let x = 0; x < PATCH_SEGMENTS; x++) {
        const a = z * n + x;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = b;
        indices[k++] = b;
        indices[k++] = c;
        indices[k++] = d;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.name = 'fx:decalPatch';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
  }

  shape(centre: THREE.Vector3, size: number, world: WorldSystem): void {
    const n = PATCH_SEGMENTS + 1;
    const half = size * 0.5;
    const step = size / PATCH_SEGMENTS;
    const positions = this.positions;
    const heights = this.heights;

    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        const wx = centre.x - half + x * step;
        const wz = centre.z - half + z * step;
        const ground = world.sampleGround(wx, wz);
        // Off-mesh samples fall back to the impact height so the patch stays
        // planar rather than collapsing to y = 0.
        const y = (ground ?? centre.y) + 0.012;
        heights[i] = y;
        positions[i * 3] = wx;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = wz;
      }
    }

    const normals = this.normals;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        const l = heights[z * n + Math.max(0, x - 1)];
        const r = heights[z * n + Math.min(n - 1, x + 1)];
        const d = heights[Math.max(0, z - 1) * n + x];
        const u = heights[Math.min(n - 1, z + 1) * n + x];
        const nx = (l - r) / (2 * step);
        const nz = (d - u) / (2 * step);
        const len = Math.sqrt(nx * nx + 1 + nz * nz);
        normals[i * 3] = nx / len;
        normals[i * 3 + 1] = 1 / len;
        normals[i * 3 + 2] = nz / len;
      }
    }

    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('normal').needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.mesh.visible = true;
  }

  style(
    cell: number,
    tint: THREE.Color,
    tone: THREE.Color,
    opacity: number,
    sequence: number,
    time: number,
    fadeDelay: number,
    fadeDuration: number,
  ): void {
    const u = this.material.uniforms;
    (u.aOriginU.value as THREE.Vector4).set(0, 0, 0, sequence);
    (u.aColorU.value as THREE.Vector4).set(tint.r, tint.g, tint.b, opacity);
    (u.aParamsU.value as THREE.Vector4).set(cell, time, fadeDelay, fadeDuration);
    (u.aToneU.value as THREE.Vector4).set(tone.r, tone.g, tone.b, 0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
