import * as THREE from 'three';
import { Layers } from '../../core/GameContext';
import type { QualitySettings } from '../../core/Quality';

/**
 * Local lights: registry, culling, budget, froxel assignment and a small spot
 * shadow atlas.
 *
 * Nothing here is a `THREE.PointLight` as far as the renderer is concerned. A
 * light is four texels of data, and the fragment shader reads the handful that
 * reach its froxel. That matters for two reasons:
 *
 *  - **No recompiles.** three bakes `NUM_POINT_LIGHTS` into every program, so
 *    the first muzzle flash of a firefight would rebuild every material in the
 *    scene. Here the count is a uniform and the cost of a flash is a texture
 *    upload of a few hundred bytes.
 *  - **Scale.** Dozens of lights are affordable because a fragment never
 *    iterates the ones that cannot reach it, which is nearly all of them.
 *
 * Registered `THREE.Light` objects are read, not driven — a caller can animate
 * one however it likes and the rig picks the change up next frame.
 */

/** Texels of data per light: position/radius, colour, spot axis, spot terms. */
const LIGHT_TEXELS = 4;
/** 255 terminates a froxel's index list, so this is the hard ceiling. */
const MAX_LIGHTS = 254;
const SPOT_TILE_DIVISOR = 2;

const _view = new THREE.Vector3();
const _corner = new THREE.Vector3();
const _target = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _bounds = new THREE.Vector4();
const _tile = new THREE.Matrix4();
const _bias = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

interface LocalRecord {
  /** Null for a pooled flash, which has no scene object behind it. */
  source: THREE.Light | null;
  position: THREE.Vector3;
  axis: THREE.Vector3;
  color: THREE.Color;
  /** Radiant intensity in engine units (kilocandela); see `LightingSystem`. */
  intensity: number;
  radius: number;
  /** cos of the outer cone half-angle; 1 for a point light. */
  coneCos: number;
  penumbraCos: number;
  spot: boolean;
  castShadow: boolean;
  /** Seconds left for a pooled flash; negative for a persistent light. */
  life: number;
  duration: number;
  active: boolean;
  /** Index in the atlas this frame, or -1. */
  shadowSlot: number;
}

export interface ClusterConfig {
  x: number;
  y: number;
  z: number;
  perCluster: number;
  /** Metres past which a local light stops being submitted at all. */
  cullDistance: number;
  near: number;
  budget: number;
  spotShadows: number;
  spotAtlasSize: number;
}

/** Cluster grid and light budget, scaled by preset. */
export function clusterConfigFor(quality: QualitySettings): ClusterConfig {
  switch (quality.preset) {
    case 'low':
      return {
        x: 8, y: 4, z: 12, perCluster: 4,
        cullDistance: 60, near: 0.5, budget: 24, spotShadows: 0, spotAtlasSize: 512,
      };
    case 'medium':
      return {
        x: 10, y: 6, z: 14, perCluster: 8,
        cullDistance: 80, near: 0.5, budget: 48, spotShadows: 1, spotAtlasSize: 1024,
      };
    case 'cinematic':
      return {
        x: 16, y: 8, z: 24, perCluster: 16,
        cullDistance: 160, near: 0.5, budget: 192, spotShadows: 4, spotAtlasSize: 2048,
      };
    default:
      return {
        x: 12, y: 6, z: 16, perCluster: 8,
        cullDistance: 120, near: 0.5, budget: 96, spotShadows: 2, spotAtlasSize: 1024,
      };
  }
}

export class LocalLights {
  config: ClusterConfig;

  readonly lightData: THREE.DataTexture;
  readonly clusterData: THREE.DataTexture;
  /** xyz = grid dimensions, w = index slots per froxel. */
  readonly gridParams = new THREE.Vector4();
  /** x = slices / log2(far/near), y = -x*log2(near), z = near, w = far. */
  readonly depthParams = new THREE.Vector4();
  /** Perspective terms the shader needs to reproject a view position itself. */
  readonly projParams = new THREE.Vector4(1, 1, 0, 0);

  /** Per-slot projection into the spot atlas, in the order the shader expects. */
  readonly spotMatrices: THREE.Matrix4[] = [];
  readonly spotRects: THREE.Vector4[] = [];
  readonly spotTexel = new THREE.Vector2(1, 1);
  spotAtlas: THREE.WebGLRenderTarget | null = null;

  /** Lights submitted to the GPU this frame, for the perf overlay. */
  visibleCount = 0;

  private records: LocalRecord[] = [];
  private pool: LocalRecord[] = [];
  private byLight = new Map<THREE.Light, LocalRecord>();

  /** Selection scratch, sized to the budget and never reallocated per frame. */
  private order: Int32Array = new Int32Array(0);
  private score: Float32Array = new Float32Array(0);
  private chosen: Int32Array = new Int32Array(0);
  private counts = new Uint8Array(0);
  private lightBytes: Float32Array = new Float32Array(0);
  private clusterBytes = new Uint8Array(0);
  private clusterWidth = 1;
  private clusterTexels = 1;

  private shadowCameras: THREE.PerspectiveCamera[] = [];
  private depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.BasicDepthPacking,
    side: THREE.DoubleSide,
  });
  private hidden: THREE.Object3D[] = [];
  private hiddenCount = 0;
  private shadowSlots = 0;

  constructor(quality: QualitySettings, poolSize = 16) {
    this.config = clusterConfigFor(quality);

    this.lightData = new THREE.DataTexture(
      new Float32Array(LIGHT_TEXELS * MAX_LIGHTS * 4),
      LIGHT_TEXELS,
      MAX_LIGHTS,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    this.lightData.minFilter = THREE.NearestFilter;
    this.lightData.magFilter = THREE.NearestFilter;
    this.lightData.needsUpdate = true;
    this.lightBytes = this.lightData.image.data as Float32Array;

    this.clusterData = new THREE.DataTexture(
      new Uint8Array(4),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    this.clusterData.minFilter = THREE.NearestFilter;
    this.clusterData.magFilter = THREE.NearestFilter;

    this.depthMaterial.colorWrite = false;

    /* Pre-warmed: a flash during combat must never allocate, and the first one
       of a match must not be the frame that proves it. */
    for (let i = 0; i < poolSize; i++) {
      const record = this.makeRecord();
      this.pool.push(record);
      this.records.push(record);
    }

    this.applyConfig(this.config);
  }

  private makeRecord(): LocalRecord {
    return {
      source: null,
      position: new THREE.Vector3(),
      axis: new THREE.Vector3(0, -1, 0),
      color: new THREE.Color(1, 1, 1),
      intensity: 0,
      radius: 1,
      coneCos: 1,
      penumbraCos: 1,
      spot: false,
      castShadow: false,
      life: -1,
      duration: 1,
      active: false,
      shadowSlot: -1,
    };
  }

  /** Reallocates the froxel grid and the spot atlas. */
  applyConfig(config: ClusterConfig): void {
    this.config = { ...config };
    const texels = Math.max(1, Math.ceil(config.perCluster / 4));
    const width = config.x * config.z * texels;
    const height = config.y;

    this.clusterTexels = texels;
    this.clusterWidth = width;
    this.clusterBytes = new Uint8Array(width * height * 4);
    this.counts = new Uint8Array(config.x * config.y * config.z);

    this.clusterData.dispose();
    this.clusterData.image = { data: this.clusterBytes, width, height };
    this.clusterData.needsUpdate = true;

    this.gridParams.set(config.x, config.y, config.z, texels * 4);

    const budget = Math.min(MAX_LIGHTS, Math.max(1, config.budget));
    this.order = new Int32Array(budget * 4);
    this.score = new Float32Array(budget * 4);
    this.chosen = new Int32Array(budget);

    this.rebuildSpotAtlas();
  }

  private rebuildSpotAtlas(): void {
    const slots = Math.max(0, Math.min(4, this.config.spotShadows));
    this.spotMatrices.length = 0;
    this.spotRects.length = 0;
    this.shadowCameras.length = 0;
    this.shadowSlots = slots;

    this.spotAtlas?.depthTexture?.dispose();
    this.spotAtlas?.dispose();
    this.spotAtlas = null;
    if (slots === 0) return;

    const columns = slots > 1 ? SPOT_TILE_DIVISOR : 1;
    const rows = Math.ceil(slots / columns);
    const tile = Math.max(256, Math.round(this.config.spotAtlasSize / columns));
    const width = tile * columns;
    const height = tile * rows;

    const depth = new THREE.DepthTexture(width, height, THREE.FloatType);
    depth.format = THREE.DepthFormat;
    depth.minFilter = THREE.NearestFilter;
    depth.magFilter = THREE.NearestFilter;
    depth.compareFunction = null;

    this.spotAtlas = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture: depth,
      generateMipmaps: false,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.spotAtlas.texture.name = 'spot-shadow-atlas';
    this.spotTexel.set(1 / width, 1 / height);

    for (let i = 0; i < slots; i++) {
      const cx = (i % columns) * tile;
      const cy = Math.floor(i / columns) * tile;
      this.spotMatrices.push(new THREE.Matrix4());
      this.spotRects.push(
        new THREE.Vector4((cx + 0.5) / width, (cy + 0.5) / height, (tile - 1) / width, (tile - 1) / height),
      );
      const camera = new THREE.PerspectiveCamera(60, 1, 0.15, 40);
      camera.matrixAutoUpdate = false;
      this.shadowCameras.push(camera);
    }
  }

  /* ------------------------------ registry ------------------------------- */

  add(light: THREE.Light, radius: number): void {
    if (this.byLight.has(light)) return;
    const record = this.makeRecord();
    record.source = light;
    record.radius = Math.max(0.05, radius);
    record.life = -1;
    record.active = true;
    this.byLight.set(light, record);
    this.records.push(record);
  }

  remove(light: THREE.Light): void {
    const record = this.byLight.get(light);
    if (!record) return;
    this.byLight.delete(light);
    const index = this.records.indexOf(record);
    if (index >= 0) this.records.splice(index, 1);
  }

  /**
   * Claims a pooled flash. Never allocates: when every slot is live the
   * shortest-lived one is recycled, because during a firefight the newest
   * flash is always the one the player is looking at.
   */
  flash(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    intensity: number,
    radius: number,
    duration: number,
  ): void {
    let slot: LocalRecord | null = null;
    let shortest = Infinity;
    for (let i = 0; i < this.pool.length; i++) {
      const record = this.pool[i];
      if (!record.active) {
        slot = record;
        break;
      }
      if (record.life < shortest) {
        shortest = record.life;
        slot = record;
      }
    }
    if (!slot) return;

    slot.position.copy(position);
    slot.color.set(color);
    slot.intensity = Math.max(0, intensity);
    slot.radius = Math.max(0.2, radius);
    slot.duration = Math.max(0.016, duration);
    slot.life = slot.duration;
    slot.spot = false;
    slot.coneCos = 1;
    slot.penumbraCos = 1;
    slot.castShadow = false;
    slot.active = true;
  }

  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < this.records.length; i++) if (this.records[i].active) n++;
    return n;
  }

  /* -------------------------------- frame -------------------------------- */

  /** Ages the flash pool. Separate from `assign` so it runs on a fixed clock. */
  tick(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const record = this.pool[i];
      if (!record.active) continue;
      record.life -= dt;
      if (record.life <= 0) {
        record.active = false;
        record.intensity = 0;
      }
    }
  }

  /**
   * Culls, budgets and writes the froxel assignment for this frame.
   *
   * Priority is screen-space influence — how much of the frame a light can
   * plausibly change — rather than raw brightness or raw distance. A dim lamp
   * two metres away matters more than a floodlight across the map, and sorting
   * by either factor alone gets that backwards.
   */
  assign(camera: THREE.PerspectiveCamera): void {
    const budget = this.chosen.length;
    const cull = this.config.cullDistance;
    let candidates = 0;

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      if (!this.refresh(record)) continue;

      _view.copy(record.position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -_view.z;
      /* Behind the camera by more than its own radius: nothing it lights can
         be on screen, whatever the frustum says about the rest of it. */
      if (depth < -record.radius) continue;
      const distance = Math.max(_view.length() - record.radius, 0.05);
      if (distance > cull) continue;

      const luma =
        record.color.r * 0.2126 + record.color.g * 0.7152 + record.color.b * 0.0722;
      const power = luma * record.intensity;
      if (power <= 1e-6) continue;

      /* Solid angle the influence sphere covers, times how bright it is at its
         own edge. Both halves are needed: the first alone keeps a dead lamp you
         are standing in, the second alone keeps a bright one a street away. */
      const solidAngle = (record.radius * record.radius) / (distance * distance);
      if (candidates < this.order.length) {
        this.order[candidates] = i;
        this.score[candidates] = solidAngle * Math.min(power / (distance * distance), 1e4);
        candidates++;
      }
    }

    /* Insertion sort: the list is small, nearly sorted between frames, and this
       allocates nothing — `Array.sort` with a comparator does neither. */
    for (let i = 1; i < candidates; i++) {
      const index = this.order[i];
      const value = this.score[i];
      let j = i - 1;
      while (j >= 0 && this.score[j] < value) {
        this.order[j + 1] = this.order[j];
        this.score[j + 1] = this.score[j];
        j--;
      }
      this.order[j + 1] = index;
      this.score[j + 1] = value;
    }

    const count = Math.min(candidates, budget);
    this.visibleCount = count;

    let spotSlot = 0;
    for (let i = 0; i < count; i++) {
      const record = this.records[this.order[i]];
      this.chosen[i] = this.order[i];
      record.shadowSlot =
        record.spot && record.castShadow && spotSlot < this.shadowSlots ? spotSlot++ : -1;
      this.writeLight(i, record);
    }
    for (let i = count; i < candidates; i++) this.records[this.order[i]].shadowSlot = -1;

    this.lightData.needsUpdate = true;
    this.buildClusters(camera, count);
  }

  /** Pulls the current state off a registered scene light. */
  private refresh(record: LocalRecord): boolean {
    if (!record.active) return false;
    const light = record.source;
    if (!light) return record.intensity > 0;

    if (!light.visible || light.intensity <= 0) return false;
    light.updateWorldMatrix(true, false);
    record.position.setFromMatrixPosition(light.matrixWorld);
    record.color.copy(light.color);
    record.intensity = light.intensity;

    const spot = light as THREE.SpotLight;
    if (spot.isSpotLight) {
      record.spot = true;
      spot.target.updateWorldMatrix(true, false);
      _target.setFromMatrixPosition(spot.target.matrixWorld);
      record.axis.copy(_target).sub(record.position);
      if (record.axis.lengthSq() < 1e-8) record.axis.set(0, -1, 0);
      record.axis.normalize();
      record.coneCos = Math.cos(spot.angle);
      record.penumbraCos = Math.cos(spot.angle * (1 - THREE.MathUtils.clamp(spot.penumbra, 0, 1)));
      record.castShadow = spot.castShadow;
    } else {
      record.spot = false;
      record.castShadow = false;
    }

    const point = light as THREE.PointLight;
    if (point.distance && point.distance > 0) record.radius = point.distance;
    return true;
  }

  private writeLight(slot: number, record: LocalRecord): void {
    const base = slot * LIGHT_TEXELS * 4;
    const data = this.lightBytes;
    const radius = record.radius;

    /* A flash fades on a smooth curve rather than a linear one: the eye reads
       the tail of a muzzle flash as brightness, not duration, and a linear ramp
       reads as a light being switched off. */
    let intensity = record.intensity;
    if (record.life >= 0) {
      const t = THREE.MathUtils.clamp(record.life / record.duration, 0, 1);
      intensity *= t * t;
    }

    data[base] = record.position.x;
    data[base + 1] = record.position.y;
    data[base + 2] = record.position.z;
    data[base + 3] = radius;

    data[base + 4] = record.color.r * intensity;
    data[base + 5] = record.color.g * intensity;
    data[base + 6] = record.color.b * intensity;
    data[base + 7] = 1 / (radius * radius);

    if (record.spot) {
      const scale = 1 / Math.max(record.penumbraCos - record.coneCos, 1e-4);
      data[base + 8] = record.axis.x;
      data[base + 9] = record.axis.y;
      data[base + 10] = record.axis.z;
      data[base + 11] = scale;
      data[base + 12] = -record.coneCos * scale;
    } else {
      data[base + 8] = 0;
      data[base + 9] = 0;
      data[base + 10] = 0;
      data[base + 11] = 0;
      data[base + 12] = 0;
    }
    data[base + 13] = record.shadowSlot + 1;
    data[base + 14] = 0;
    data[base + 15] = 0;
  }

  /**
   * Writes each light's index into every froxel its influence sphere touches.
   *
   * The screen bound comes from the sphere's world AABB rather than an exact
   * tangent-cone projection: conservative by a froxel or two at the edges,
   * which costs a few wasted iterations and never drops a light — the failure
   * mode of an exact bound that is off by one is a hard-edged rectangle of
   * missing light across the screen.
   */
  private buildClusters(camera: THREE.PerspectiveCamera, count: number): void {
    const { x: gx, y: gy, z: gz } = this.config;
    const perCluster = this.clusterTexels * 4;
    const near = Math.max(0.05, this.config.near);
    const far = Math.max(near * 2, this.config.cullDistance);

    const scale = gz / Math.log2(far / near);
    this.depthParams.set(scale, -scale * Math.log2(near), near, far);

    /* The shader has no projection matrix to hand in the fragment stage, so
       hand it the four terms that matter. Taken from the world camera even
       while the viewmodel draws, which is the point. */
    const p = camera.projectionMatrix.elements;
    this.projParams.set(p[0], p[5], p[8], p[9]);

    this.clusterBytes.fill(255);
    this.counts.fill(0);
    if (count === 0) {
      this.clusterData.needsUpdate = true;
      return;
    }

    for (let i = 0; i < count; i++) {
      const record = this.records[this.chosen[i]];
      const radius = record.radius;
      _view.copy(record.position).applyMatrix4(camera.matrixWorldInverse);

      const zNear = Math.max(-_view.z - radius, near);
      const zFar = Math.min(-_view.z + radius, far);
      if (zFar <= near) continue;

      const sliceMin = THREE.MathUtils.clamp(
        Math.floor(Math.log2(zNear) * scale + this.depthParams.y),
        0,
        gz - 1,
      );
      const sliceMax = THREE.MathUtils.clamp(
        Math.floor(Math.log2(Math.max(zFar, near)) * scale + this.depthParams.y),
        0,
        gz - 1,
      );

      this.screenBounds(camera, record.position, radius, _bounds);
      const xMin = THREE.MathUtils.clamp(Math.floor(_bounds.x * gx), 0, gx - 1);
      const xMax = THREE.MathUtils.clamp(Math.floor(_bounds.z * gx), 0, gx - 1);
      const yMin = THREE.MathUtils.clamp(Math.floor(_bounds.y * gy), 0, gy - 1);
      const yMax = THREE.MathUtils.clamp(Math.floor(_bounds.w * gy), 0, gy - 1);

      for (let cz = sliceMin; cz <= sliceMax; cz++) {
        for (let cy = yMin; cy <= yMax; cy++) {
          const row = cy * this.clusterWidth * 4;
          for (let cx = xMin; cx <= xMax; cx++) {
            const cluster = cx + gx * (cy + gy * cz);
            const used = this.counts[cluster];
            if (used >= perCluster) continue;
            this.counts[cluster] = used + 1;
            const column = cx + gx * cz;
            this.clusterBytes[row + (column * this.clusterTexels + (used >> 2)) * 4 + (used & 3)] = i;
          }
        }
      }
    }

    this.clusterData.needsUpdate = true;
  }

  /** Screen-space [0,1] AABB of a world sphere; (1,1,0,0) when off screen. */
  private screenBounds(
    camera: THREE.PerspectiveCamera,
    center: THREE.Vector3,
    radius: number,
    out: THREE.Vector4,
  ): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let crossesNear = false;

    for (let i = 0; i < 8; i++) {
      _corner.set(
        center.x + (i & 1 ? radius : -radius),
        center.y + (i & 2 ? radius : -radius),
        center.z + (i & 4 ? radius : -radius),
      );
      _corner.applyMatrix4(camera.matrixWorldInverse);
      if (-_corner.z <= camera.near) {
        crossesNear = true;
        break;
      }
      _corner.applyMatrix4(camera.projectionMatrix);
      const u = _corner.x * 0.5 + 0.5;
      const v = _corner.y * 0.5 + 0.5;
      if (u < minX) minX = u;
      if (u > maxX) maxX = u;
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    }

    /* A sphere straddling the near plane projects to nonsense, and it is also
       the case where the player is standing inside the light. Take the whole
       screen; it is one light and it is unquestionably visible. */
    if (crossesNear) out.set(0, 0, 1, 1);
    else out.set(minX, minY, maxX, maxY);
  }

  /* ---------------------------- spot shadows ----------------------------- */

  /**
   * Renders the hero spots into the atlas. Same override-material trick as the
   * cascades: whatever must not cast is hidden for the duration rather than
   * filtered out of a draw list, because `overrideMaterial` draws everything.
   */
  renderShadows(renderer: THREE.WebGLRenderer, scene: THREE.Scene, count: number): void {
    const atlas = this.spotAtlas;
    if (!atlas || this.shadowSlots === 0) return;

    let pending = 0;
    for (let i = 0; i < count; i++) {
      if (this.records[this.chosen[i]].shadowSlot >= 0) pending++;
    }
    if (pending === 0) return;

    const previousTarget = renderer.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousAutoClear = renderer.autoClear;
    const previousBackground = scene.background;
    const previousFog = scene.fog;

    this.hideNonCasters(scene);
    scene.overrideMaterial = this.depthMaterial;
    scene.background = null;
    scene.fog = null;
    renderer.autoClear = false;

    const columns = this.shadowSlots > 1 ? SPOT_TILE_DIVISOR : 1;
    const tile = atlas.width / columns;

    for (let i = 0; i < count; i++) {
      const record = this.records[this.chosen[i]];
      const slot = record.shadowSlot;
      if (slot < 0) continue;

      const camera = this.shadowCameras[slot];
      camera.fov = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(record.coneCos, -1, 1))) * 2;
      camera.near = Math.min(0.2, record.radius * 0.02);
      camera.far = record.radius;
      camera.updateProjectionMatrix();
      camera.position.copy(record.position);
      _target.copy(record.position).add(record.axis);
      camera.matrixWorld.lookAt(record.position, _target, THREE.Object3D.DEFAULT_UP);
      camera.matrixWorld.setPosition(record.position);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

      const rect = this.spotRects[slot];
      _tile.makeTranslation(rect.x, rect.y, 0);
      _tile.scale(_scale.set(rect.z, rect.w, 1));
      this.spotMatrices[slot]
        .copy(_tile)
        .multiply(_bias)
        .multiply(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse);

      const cx = (slot % columns) * tile;
      const cy = Math.floor(slot / columns) * tile;
      atlas.viewport.set(cx, cy, tile, tile);
      atlas.scissor.set(cx, cy, tile, tile);
      atlas.scissorTest = true;
      renderer.setRenderTarget(atlas);
      renderer.clear(false, true, false);
      renderer.render(scene, camera);
    }

    atlas.scissorTest = false;
    for (let i = 0; i < this.hiddenCount; i++) this.hidden[i].visible = true;
    this.hiddenCount = 0;

    scene.overrideMaterial = previousOverride;
    scene.background = previousBackground;
    scene.fog = previousFog;
    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(previousTarget);
  }

  private hideNonCasters(scene: THREE.Scene): void {
    this.hiddenCount = 0;
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if (
        mesh.castShadow &&
        !mesh.layers.isEnabled(Layers.NO_SHADOW) &&
        !mesh.layers.isEnabled(Layers.VIEWMODEL)
      ) {
        return;
      }
      this.hidden[this.hiddenCount++] = mesh;
      mesh.visible = false;
    });
  }

  /** Spot slots the shader was compiled for. */
  get spotShadowCount(): number {
    return this.shadowSlots;
  }

  dispose(): void {
    this.lightData.dispose();
    this.clusterData.dispose();
    this.spotAtlas?.depthTexture?.dispose();
    this.spotAtlas?.dispose();
    this.spotAtlas = null;
    this.depthMaterial.dispose();
    this.records.length = 0;
    this.pool.length = 0;
    this.byLight.clear();
    this.hidden.length = 0;
  }
}
