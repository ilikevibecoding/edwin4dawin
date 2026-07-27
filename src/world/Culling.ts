import * as THREE from 'three';
import type { QualityConfig, QualityTier } from '../core/Config';
import type { Chunk } from './Builder';

/**
 * Chunk visibility.
 *
 * The builder files every mesh into a 48 m cell and records the cell's real
 * content bounds, which gives a flat spatial grid to cull against. Testing nine
 * boxes and toggling a group is far cheaper than letting three walk several
 * hundred meshes per frame, and it lets each cell's decoration layer drop out by
 * distance independently of its silhouette.
 *
 * Two details keep it from looking like culling:
 *
 * The frustum is dilated. World culling runs at `ORDER.WORLD`, but the camera is
 * finalised at `ORDER.CAMERA`, so the test uses last frame's pose; a wider FOV
 * plus a few metres of plane slack absorbs a frame of fast turning instead of
 * popping geometry in at the screen edge.
 *
 * Off-screen shadow casters stay alive. With a 31-degree sun a twelve-metre
 * building throws a twenty-metre shadow, and the thing casting it is usually
 * behind the camera. Each cell therefore also gets its bounds swept along the
 * light direction; if that volume is visible the cell keeps its structure layer,
 * which is the only layer that casts.
 */

export interface CullStats {
  chunks: number;
  visible: number;
  shadowOnly: number;
  drawables: number;
  triangles: number;
}

interface CullNode {
  chunk: Chunk;
  box: THREE.Box3;
  sphere: THREE.Sphere;
  /** Bounds swept along the direction light travels, for off-screen casters. */
  shadowBox: THREE.Box3;
  shadowSphere: THREE.Sphere;
  /** False for cells that only hold ground and decoration. */
  casts: boolean;
}

/** Range at which the decoration layer stops drawing, per quality tier. */
const DETAIL_RANGE: Record<QualityTier, number> = {
  low: 40,
  medium: 56,
  high: 78,
  ultra: 96,
};

/** Range at which instanced props swap to their low-detail geometry. */
const LOD_RANGE: Record<QualityTier, number> = {
  low: 24,
  medium: 34,
  high: 48,
  ultra: 62,
};

/**
 * Extra FOV and metres of slack that hide the one-frame camera lag. Seven
 * degrees covers 420 degrees per second of turn at 60 Hz, well past what a
 * player can flick.
 */
const FOV_SLACK = 7;
const ASPECT_SLACK = 1.06;
const PLANE_SLACK = 1.5;
/** How far a silhouette can throw a shadow at this map's sun elevation. */
const SHADOW_SWEEP = 26;

export class ChunkCuller {
  readonly stats: CullStats;

  private readonly nodes: CullNode[] = [];
  private readonly frustum = new THREE.Frustum();
  private readonly probe = new THREE.PerspectiveCamera();
  private readonly view = new THREE.Matrix4();
  private readonly viewProjection = new THREE.Matrix4();
  private readonly eye = new THREE.Vector3();

  private detailRange: number;
  private lodRange: number;
  private shadowRange: number;
  private measureEnabled: boolean;

  constructor(
    chunks: readonly Chunk[],
    private readonly groundRoot: THREE.Group,
    opts: { sunDirection: THREE.Vector3; config: QualityConfig },
  ) {
    // Light travels opposite the direction the sun sits in.
    const sweep = opts.sunDirection.clone().multiplyScalar(-SHADOW_SWEEP);

    for (const chunk of chunks) {
      if (!chunk.active) continue;
      const box = chunk.bounds.clone();
      const shadowBox = box.clone();
      shadowBox.union(box.clone().translate(sweep));
      this.nodes.push({
        chunk,
        box,
        sphere: box.getBoundingSphere(new THREE.Sphere()),
        shadowBox,
        shadowSphere: shadowBox.getBoundingSphere(new THREE.Sphere()),
        casts: chunk.structure !== null,
      });
    }

    this.detailRange = DETAIL_RANGE[opts.config.tier];
    this.lodRange = LOD_RANGE[opts.config.tier];
    this.shadowRange = opts.config.shadowsEnabled ? opts.config.shadowDistance : 0;
    this.measureEnabled = opts.config.showStats;
    this.stats = {
      chunks: this.nodes.length,
      visible: this.nodes.length,
      shadowOnly: 0,
      drawables: 0,
      triangles: 0,
    };
    this.measure();
  }

  onQualityChanged(config: QualityConfig): void {
    this.detailRange = DETAIL_RANGE[config.tier];
    this.lodRange = LOD_RANGE[config.tier];
    this.shadowRange = config.shadowsEnabled ? config.shadowDistance : 0;
    this.measureEnabled = config.showStats;
  }

  update(camera: THREE.PerspectiveCamera, config: QualityConfig): void {
    // `freezeCulling` locks the test where it stands so the result can be
    // inspected from outside the frustum.
    if (config.freezeCulling) return;

    this.probe.fov = camera.fov + FOV_SLACK;
    this.probe.aspect = camera.aspect * ASPECT_SLACK;
    this.probe.near = camera.near;
    this.probe.far = camera.far;
    this.probe.updateProjectionMatrix();

    this.view.copy(camera.matrixWorld).invert();
    this.viewProjection.multiplyMatrices(this.probe.projectionMatrix, this.view);
    this.frustum.setFromProjectionMatrix(this.viewProjection);
    // Frustum plane normals point inward, so a larger constant admits more.
    for (const plane of this.frustum.planes) plane.constant += PLANE_SLACK;

    this.eye.setFromMatrixPosition(camera.matrixWorld);

    let visible = 0;
    let shadowOnly = 0;

    for (const node of this.nodes) {
      const chunk = node.chunk;
      // Distance to the cell's box, not to its sphere. A 48 m cell's bounding
      // sphere has a 40 m radius, so subtracting it from the centre distance puts
      // every cell on the map inside the decoration range and the detail layer
      // never drops — which is where most of the draw calls live.
      const distance = node.box.distanceToPoint(this.eye);

      const inView =
        this.frustum.intersectsSphere(node.sphere) && this.frustum.intersectsBox(node.box);
      let shadowCaster = false;
      if (!inView && node.casts && distance < this.shadowRange) {
        shadowCaster =
          this.frustum.intersectsSphere(node.shadowSphere) &&
          this.frustum.intersectsBox(node.shadowBox);
      }
      if (!inView && !shadowCaster) {
        if (chunk.structure) chunk.structure.visible = false;
        if (chunk.detail) chunk.detail.visible = false;
        continue;
      }
      if (shadowCaster) shadowOnly++;
      else visible++;

      // Beyond the decoration range the cell keeps its silhouette and loses its
      // litter, which is where most of the draw calls are.
      if (chunk.structure) chunk.structure.visible = true;
      if (chunk.detail) chunk.detail.visible = inView && distance < this.detailRange;

      if (chunk.lods.length > 0) {
        const near = distance < this.lodRange;
        for (const pair of chunk.lods) {
          pair.near.visible = near;
          pair.far.visible = !near;
        }
      }
    }

    this.stats.visible = visible;
    this.stats.shadowOnly = shadowOnly;
    if (this.measureEnabled) this.measure();
  }

  /** Counts what is currently drawable. Walks the graph, so call it sparingly. */
  measure(): CullStats {
    const counter = { drawables: 0, triangles: 0 };
    countInto(this.groundRoot, counter);
    for (const node of this.nodes) {
      countInto(node.chunk.structure, counter);
      countInto(node.chunk.detail, counter);
    }
    this.stats.drawables = counter.drawables;
    this.stats.triangles = counter.triangles;
    return this.stats;
  }

  /** Makes everything visible again; used when culling is torn down. */
  reset(): void {
    for (const node of this.nodes) {
      if (node.chunk.structure) node.chunk.structure.visible = true;
      if (node.chunk.detail) node.chunk.detail.visible = true;
    }
  }
}

function countInto(
  group: THREE.Object3D | null,
  out: { drawables: number; triangles: number },
): void {
  if (!group || !group.visible) return;
  group.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const instanced = mesh as THREE.InstancedMesh;
    out.drawables++;
    out.triangles += triangleCount(mesh.geometry) * (instanced.isInstancedMesh ? instanced.count : 1);
  });
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}
