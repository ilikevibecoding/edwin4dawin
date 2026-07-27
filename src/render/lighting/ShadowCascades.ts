import * as THREE from 'three';
import { Layers } from '../../core/GameContext';

/**
 * Cascaded shadow maps.
 *
 * Four things separate this from a directional light with `castShadow` on:
 *
 *  1. **Stabilisation.** Each cascade is sized by the bounding sphere of its
 *     frustum slice, which depends only on the field of view and the split
 *     distances — never on where the camera is looking. The sphere's centre is
 *     then snapped to whole shadow texels in light space. Both are necessary:
 *     a sphere alone still crawls as the camera translates, and snapping alone
 *     still swims as it rotates, because the extent would keep changing.
 *  2. **Tight depth fitting.** The near and far planes are fitted to the part
 *     of the scene that can actually cast into the slice, quantised so they do
 *     not dither frame to frame.
 *  3. **Per-cascade culling with a caster LOD.** Anything smaller than a few
 *     texels of the cascade it would be drawn into is dropped: it cannot
 *     resolve, so all it costs is draw calls.
 *  4. **One atlas.** Every cascade lives in a tile of a single depth texture,
 *     so a surface shader spends one texture unit on shadows regardless of the
 *     cascade count.
 */

/** Shape the post pipeline's `SunLighting` adapter discovers structurally. */
export interface PublishedCascade {
  shadow: { map: THREE.WebGLRenderTarget | null; matrix: THREE.Matrix4; camera: { far: number } };
  matrix: THREE.Matrix4;
  /** View distance at which this cascade stops being valid. */
  far: number;
  split: number;
}

export interface CascadeConfig {
  count: number;
  /** Atlas edge in texels; tiles are half this for two or more cascades. */
  atlasSize: number;
  distance: number;
  /** 0 = uniform splits, 1 = logarithmic. */
  lambda: number;
  /** Fraction of a cascade cross-faded into the next. */
  blend: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(0, 0, 1);

const _basisX = new THREE.Vector3();
const _basisY = new THREE.Vector3();
const _basisZ = new THREE.Vector3();
const _center = new THREE.Vector3();
const _lightSpace = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _tile = new THREE.Matrix4();
const _bias = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

/** Depth of a caster that is at least this many texels across is worth drawing. */
const LOD_TEXELS = 2.5;

class Cascade {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 100);
  /**
   * World position to *tile-local* uv + depth, all in 0..1.
   *
   * Tile-local rather than atlas-wide because the surface shader has to clamp
   * each filter tap to its own tile before it can place it in the atlas — a tap
   * that walks off the edge of cascade 1 must not read cascade 2. The atlas
   * transform is folded in separately for consumers that sample the atlas
   * directly and cannot clamp, which is what `atlasMatrix` is for.
   */
  readonly matrix = new THREE.Matrix4();
  /** World position to atlas uv + depth, for the volumetric march. */
  readonly atlasMatrix = new THREE.Matrix4();
  /** Tile origin (xy) and extent (zw) in atlas uv. */
  readonly rect = new THREE.Vector4();
  /** x: view depth limit, y: metres per texel, z: depth range, w: uv per metre. */
  readonly params = new THREE.Vector4();
  /** Tile rectangle in atlas texels. */
  readonly viewport = new THREE.Vector4();
  near = 0;
  far = 1;
  radius = 1;

  constructor() {
    this.camera.matrixAutoUpdate = false;
  }
}

export class ShadowCascades {
  readonly cascades: Cascade[] = [];
  /** Adapter-facing view of the rig, rebuilt only when the shape changes. */
  readonly published: PublishedCascade[] = [];

  atlas: THREE.WebGLRenderTarget | null = null;
  config: CascadeConfig = { count: 3, atlasSize: 2048, distance: 200, lambda: 0.72, blend: 0.12 };

  /** Metres of the last cascade over which the shadow eases out to lit. */
  fadeStart = 0;
  fadeEnd = 1;

  private depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.BasicDepthPacking,
    /* Both faces. Front-face culling is the classic acne fix but it detaches
       the shadow of anything thinner than the bias — a fence, a sign, the test
       pole in the showcase — and normal-offset bias removes the acne without
       it. */
    side: THREE.DoubleSide,
  });

  private casters: THREE.Mesh[] = [];
  private casterRadius: number[] = [];
  private casterCount = 0;
  private hidden: THREE.Object3D[] = [];
  private hiddenCount = 0;
  private tileSize = 1024;

  constructor() {
    this.depthMaterial.colorWrite = false;
    this.rebuild(this.config);
  }

  get texture(): THREE.Texture | null {
    return (this.atlas?.depthTexture as THREE.Texture | null) ?? null;
  }

  /** Allocates the atlas and the per-cascade state. Safe to call repeatedly. */
  rebuild(config: CascadeConfig): void {
    this.config = { ...config };
    const count = Math.max(1, Math.min(4, Math.round(config.count)));
    const columns = count > 1 ? 2 : 1;
    const rows = Math.ceil(count / columns);
    const tile = Math.max(256, Math.round(config.atlasSize / columns));
    this.tileSize = tile;

    const width = tile * columns;
    const height = tile * rows;

    if (this.atlas && (this.atlas.width !== width || this.atlas.height !== height)) {
      this.disposeAtlas();
    }

    if (!this.atlas) {
      const depth = new THREE.DepthTexture(width, height, THREE.FloatType);
      depth.format = THREE.DepthFormat;
      depth.minFilter = THREE.NearestFilter;
      depth.magFilter = THREE.NearestFilter;
      /* No comparison function: PCSS needs the blocker depths themselves, not a
         hardware pass/fail, and a comparison sampler cannot give them. */
      depth.compareFunction = null;
      this.atlas = new THREE.WebGLRenderTarget(width, height, {
        /* A depth-only target still needs a colour attachment to be complete.
           One byte per texel, never written to. */
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        depthTexture: depth,
        generateMipmaps: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      });
      this.atlas.texture.name = 'csm-atlas';
    }

    this.cascades.length = 0;
    for (let i = 0; i < count; i++) {
      const cascade = new Cascade();
      const cx = (i % columns) * tile;
      const cy = Math.floor(i / columns) * tile;
      cascade.viewport.set(cx, cy, tile, tile);
      /* A half-texel inset stops a filter tap at the tile edge from reaching
         into the neighbouring cascade. */
      cascade.rect.set(
        (cx + 0.5) / width,
        (cy + 0.5) / height,
        (tile - 1) / width,
        (tile - 1) / height,
      );
      this.cascades.push(cascade);
    }

    this.publish();
  }

  /**
   * Rebuilds the adapter-facing array.
   *
   * The trailing entry is a sentinel whose matrix projects everything outside
   * the atlas. The volumetric march picks the last cascade for anything beyond
   * the final split and marches to 420 m, well past where the rig has data; the
   * sentinel makes those samples read as unshadowed instead of landing in a
   * neighbouring tile and painting phantom shadows across the far fog.
   */
  private publish(): void {
    this.published.length = 0;
    const usable = Math.min(this.cascades.length, 3);
    for (let i = 0; i < usable; i++) {
      const cascade = this.cascades[i];
      this.published.push({
        shadow: { map: this.atlas, matrix: cascade.atlasMatrix, camera: cascade.camera },
        matrix: cascade.atlasMatrix,
        far: 1,
        split: 1,
      });
    }
    const outside = new THREE.Matrix4().set(
      0, 0, 0, 9,
      0, 0, 0, 9,
      0, 0, 0, 0.5,
      0, 0, 0, 1,
    );
    this.published.push({
      shadow: { map: this.atlas, matrix: outside, camera: { far: 1e9 } },
      matrix: outside,
      far: 1e9,
      split: 1e9,
    });
  }

  /**
   * Fits every cascade to the current view.
   *
   * `bounds` is the world extent that can cast, used to pull the near and far
   * planes in around the geometry that actually exists.
   */
  update(camera: THREE.PerspectiveCamera, sunDirection: THREE.Vector3, bounds: THREE.Box3): void {
    const count = this.cascades.length;
    const near = camera.near;
    const far = Math.max(near + 1, this.config.distance);
    const lambda = THREE.MathUtils.clamp(this.config.lambda, 0, 1);

    this.buildBasis(sunDirection);

    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const tanH = tanV * camera.aspect;
    const k2 = tanH * tanH + tanV * tanV;

    camera.getWorldDirection(_forward);

    let sliceNear = near;
    for (let i = 0; i < count; i++) {
      const cascade = this.cascades[i];
      const fraction = (i + 1) / count;
      /* Practical split: the logarithmic distribution is right for texel
         density and wrong for the near field, where it spends a whole cascade
         on the first two metres. Blending it with a uniform one is the standard
         compromise and `lambda` is the dial. */
      const logSplit = near * Math.pow(far / near, fraction);
      const uniformSplit = near + (far - near) * fraction;
      const sliceFar = lambda * logSplit + (1 - lambda) * uniformSplit;

      this.fitSphere(sliceNear, sliceFar, k2, _sphere);
      cascade.radius = _sphere.radius;

      _center.copy(camera.position).addScaledVector(_forward, _sphere.center.z);
      const texelWorld = (2 * _sphere.radius) / this.tileSize;
      this.snapToTexel(_center, texelWorld);

      this.fitDepth(bounds, _center, _sphere.radius, cascade);
      this.placeCamera(cascade);

      const projection = cascade.camera.projectionMatrix;
      const view = cascade.camera.matrixWorldInverse;
      cascade.matrix.copy(_bias).multiply(projection).multiply(view);
      _tile.makeTranslation(cascade.rect.x, cascade.rect.y, 0);
      _tile.scale(_scale.set(cascade.rect.z, cascade.rect.w, 1));
      cascade.atlasMatrix.multiplyMatrices(_tile, cascade.matrix);

      cascade.params.set(
        sliceFar,
        texelWorld,
        Math.max(cascade.far - cascade.near, 1e-3),
        1 / (2 * _sphere.radius),
      );
      sliceNear = sliceFar;
    }

    this.fadeStart = far * 0.88;
    this.fadeEnd = far;

    const usable = Math.min(count, 3);
    for (let i = 0; i < usable; i++) {
      this.published[i].far = this.cascades[i].params.x;
      this.published[i].split = this.cascades[i].params.x;
    }
  }

  /**
   * Bounding sphere of a frustum slice, in view space.
   *
   * Solving for the centre that puts the near and far corners on the same
   * sphere gives the smallest one; when that centre would sit past the far
   * plane the slice is wide rather than long and the far face's circumcircle is
   * the answer instead. Either way the radius depends only on the projection,
   * which is exactly why cascades fitted this way do not breathe when the
   * camera turns.
   */
  private fitSphere(near: number, far: number, k2: number, out: THREE.Sphere): void {
    const centerZ = ((near + far) * (k2 + 1)) / 2;
    if (centerZ >= far) {
      out.center.set(0, 0, far);
      out.radius = far * Math.sqrt(k2);
    } else {
      out.center.set(0, 0, centerZ);
      const dz = far - centerZ;
      out.radius = Math.sqrt(far * far * k2 + dz * dz);
    }
    out.radius = Math.max(out.radius, 0.5);
  }

  /** Orthonormal light basis, stable for a given sun direction. */
  private buildBasis(sunDirection: THREE.Vector3): void {
    _basisZ.copy(sunDirection).normalize();
    const reference = Math.abs(_basisZ.y) > 0.995 ? SIDE : UP;
    _basisX.crossVectors(reference, _basisZ).normalize();
    _basisY.crossVectors(_basisZ, _basisX).normalize();
  }

  /** Quantises a world position to whole texels of the light-space grid. */
  private snapToTexel(center: THREE.Vector3, texelWorld: number): void {
    if (texelWorld <= 0) return;
    _lightSpace.set(center.dot(_basisX), center.dot(_basisY), center.dot(_basisZ));
    _lightSpace.x = Math.round(_lightSpace.x / texelWorld) * texelWorld;
    _lightSpace.y = Math.round(_lightSpace.y / texelWorld) * texelWorld;
    center
      .copy(_basisX)
      .multiplyScalar(_lightSpace.x)
      .addScaledVector(_basisY, _lightSpace.y)
      .addScaledVector(_basisZ, _lightSpace.z);
  }

  /**
   * Near and far along the light axis.
   *
   * The far plane can stop at the bottom of the cascade sphere — nothing below
   * it is visible from inside — but the near plane has to reach up to the
   * highest geometry in the level, or a rooftop stops casting onto the street.
   * Both are quantised so the depth encoding does not shift under the camera.
   */
  private fitDepth(
    bounds: THREE.Box3,
    center: THREE.Vector3,
    radius: number,
    cascade: Cascade,
  ): void {
    const centerZ = center.dot(_basisZ);
    let top = centerZ + radius;
    if (!bounds.isEmpty()) {
      /*
       * How far up the light axis a caster can be and still reach this cascade.
       *
       * Taking the level's whole extent along the light axis is the obvious
       * thing and it is far too generous: at a low sun a wide map projects
       * hundreds of metres of empty space above a cascade that is thirty metres
       * across. What actually matters is the tallest geometry, because a point
       * P casting into the sphere satisfies |P - C - dL| <= r, and so
       * d <= (maxY - C.y + r) / L.y. That is a real bound and it is usually a
       * small fraction of the naive one.
       */
      const lightY = Math.max(_basisZ.y, 0.12);
      const reach = (bounds.max.y - center.y + radius) / lightY;
      top = centerZ + Math.min(Math.max(reach, radius), radius + 250);
    } else {
      top = centerZ + radius + 120;
    }

    const quantum = 0.5;
    const bottom = Math.floor((centerZ - radius) / quantum) * quantum;
    top = Math.ceil(top / quantum) * quantum;

    cascade.near = 0.05;
    cascade.far = Math.max(top - bottom, 1) + 0.05;
    cascade.camera.position
      .copy(center)
      .addScaledVector(_basisZ, top - centerZ + cascade.near);
  }

  /** Writes the light basis straight into the camera matrix; no lookAt needed. */
  private placeCamera(cascade: Cascade): void {
    const camera = cascade.camera;
    const m = camera.matrixWorld.elements;
    m[0] = _basisX.x; m[1] = _basisX.y; m[2] = _basisX.z; m[3] = 0;
    m[4] = _basisY.x; m[5] = _basisY.y; m[6] = _basisY.z; m[7] = 0;
    m[8] = _basisZ.x; m[9] = _basisZ.y; m[10] = _basisZ.z; m[11] = 0;
    m[12] = camera.position.x; m[13] = camera.position.y; m[14] = camera.position.z; m[15] = 1;
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const r = cascade.radius;
    camera.left = -r;
    camera.right = r;
    camera.top = r;
    camera.bottom = -r;
    camera.near = cascade.near;
    camera.far = cascade.far;
    camera.updateProjectionMatrix();
  }

  /* ------------------------------ rendering ------------------------------ */

  /**
   * Collects casters once per frame.
   *
   * `overrideMaterial` draws whatever is visible, so anything that must not
   * cast — the sky dome above all, which would otherwise fill every cascade
   * with a depth of zero and put the entire level in shadow — is hidden for the
   * duration of the pass rather than filtered out of a draw list.
   */
  private collect(scene: THREE.Scene): void {
    this.casterCount = 0;
    this.hiddenCount = 0;
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      const casts =
        mesh.castShadow &&
        !mesh.layers.isEnabled(Layers.NO_SHADOW) &&
        !mesh.layers.isEnabled(Layers.VIEWMODEL);
      if (!casts) {
        this.hidden[this.hiddenCount++] = mesh;
        mesh.visible = false;
        return;
      }
      const geometry = mesh.geometry;
      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
      const local = geometry.boundingSphere?.radius ?? 1;
      _scale.setFromMatrixScale(mesh.matrixWorld);
      const radius = local * Math.max(_scale.x, _scale.y, _scale.z);
      this.casters[this.casterCount] = mesh;
      this.casterRadius[this.casterCount] = radius;
      this.casterCount++;
    });
  }

  private restore(): void {
    for (let i = 0; i < this.hiddenCount; i++) this.hidden[i].visible = true;
    this.hiddenCount = 0;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const atlas = this.atlas;
    if (!atlas) return;

    const previousTarget = renderer.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousAutoClear = renderer.autoClear;
    const previousBackground = scene.background;
    const previousFog = scene.fog;

    this.collect(scene);

    scene.overrideMaterial = this.depthMaterial;
    scene.background = null;
    scene.fog = null;
    renderer.autoClear = false;

    for (let i = 0; i < this.cascades.length; i++) {
      const cascade = this.cascades[i];
      /* Caster LOD: a prop that covers less than a couple of texels in this
         cascade cannot produce a shadow anyone can read, so the distant
         cascades quietly stop drawing the small stuff. */
      const minRadius = cascade.params.y * LOD_TEXELS;
      let lodCount = 0;
      for (let c = 0; c < this.casterCount; c++) {
        if (this.casterRadius[c] >= minRadius) continue;
        const mesh = this.casters[c];
        mesh.visible = false;
        this.hidden[this.hiddenCount + lodCount] = mesh;
        lodCount++;
      }

      const v = cascade.viewport;
      atlas.viewport.set(v.x, v.y, v.z, v.w);
      atlas.scissor.set(v.x, v.y, v.z, v.w);
      atlas.scissorTest = true;
      renderer.setRenderTarget(atlas);
      renderer.clear(false, true, false);
      renderer.render(scene, cascade.camera);

      for (let c = 0; c < lodCount; c++) this.hidden[this.hiddenCount + c].visible = true;
    }

    atlas.scissorTest = false;
    this.restore();

    scene.overrideMaterial = previousOverride;
    scene.background = previousBackground;
    scene.fog = previousFog;
    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(previousTarget);
  }

  private disposeAtlas(): void {
    this.atlas?.depthTexture?.dispose();
    this.atlas?.dispose();
    this.atlas = null;
  }

  dispose(): void {
    this.disposeAtlas();
    this.depthMaterial.dispose();
    this.casters.length = 0;
    this.hidden.length = 0;
  }
}
