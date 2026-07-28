/**
 * Visibility probe, enabled with `?aiprobe=1`.
 *
 * A soldier that is tracked by the AI, counted on the minimap and painted on the
 * airstrike tablet but not visible in the frame can fail in a dozen unrelated
 * places: never parented, parented to the viewmodel scene, positioned under the
 * terrain, scaled to nothing, culled by a stale bounding sphere, on a layer the
 * main camera does not draw, or simply somewhere else by the time the shutter
 * opens. Reading the source cannot distinguish them and a screenshot under
 * software rendering costs a minute, so this dumps everything that could be
 * responsible in one pass.
 *
 * `?aiprobe=2` adds the per-mesh breakdown for every agent rather than only the
 * first, which is worth the log volume when one variant misbehaves.
 */
import * as THREE from 'three';
import type { EngineContext } from '../../core/System';
import type { Director } from '../Director';
import type { Enemy } from '../Enemy';
import { B } from '../model/Rig';

/** Seconds between reports. Slow, because each one is several lines. */
const INTERVAL = 2.5;

/**
 * Reported at warning level on purpose: the screenshot harness only forwards
 * `error` and `warning` to its console log, and a diagnostic nobody can read
 * from the capture is no diagnostic at all. Nothing reaches this unless the URL
 * flag is set.
 */
const say = (line: string): void => console.warn(line);

const BOX = /* @__PURE__ */ new THREE.Box3();
const SIZE = /* @__PURE__ */ new THREE.Vector3();
const WORLD = /* @__PURE__ */ new THREE.Vector3();
const SCALE = /* @__PURE__ */ new THREE.Vector3();
const HEAD = /* @__PURE__ */ new THREE.Vector3();
const FOOT = /* @__PURE__ */ new THREE.Vector3();
const CAMERA = /* @__PURE__ */ new THREE.Vector3();
const AIM = /* @__PURE__ */ new THREE.Vector3();
const PROJECTION = /* @__PURE__ */ new THREE.Matrix4();
const FRUSTUM = /* @__PURE__ */ new THREE.Frustum();

function fixed(v: THREE.Vector3, digits = 2): string {
  return `${v.x.toFixed(digits)},${v.y.toFixed(digits)},${v.z.toFixed(digits)}`;
}

export class AIProbe {
  readonly level: number;
  private accum = 0;
  private reportedFrozen = false;
  /** Where each agent was put, so drift away from a staged position shows up. */
  private readonly origins = new Map<number, THREE.Vector3>();

  constructor() {
    let flag: string | null = null;
    if (typeof location !== 'undefined') {
      try {
        flag = new URLSearchParams(location.search).get('aiprobe');
      } catch {
        flag = null;
      }
    }
    this.level = flag ? Number(flag) || 0 : 0;
  }

  get enabled(): boolean {
    return this.level > 0;
  }

  /** Records a staged spawn position so the report can show how far it moved. */
  noteSpawn(enemy: Enemy): void {
    if (!this.enabled) return;
    const existing = this.origins.get(enemy.id);
    if (existing) existing.copy(enemy.feet);
    else this.origins.set(enemy.id, enemy.feet.clone());
  }

  /**
   * Driven off unscaled time so it keeps reporting while the world is stopped.
   *
   * The capture harness freezes the simulation and then takes the screenshot, so
   * the only sample that can be compared against a PNG is the one taken during
   * that freeze. Everything before it describes a frame nobody photographed.
   */
  update(_dt: number, ctx: EngineContext, director: Director): void {
    if (!this.enabled) return;
    const frozen = ctx.time.timeScale === 0;
    if (!frozen) this.reportedFrozen = false;
    else if (!this.reportedFrozen) {
      this.reportedFrozen = true;
      this.accum = 0;
      this.report(ctx, director, 'shutter');
      return;
    }
    this.accum += ctx.time.deltaUnscaled;
    if (this.accum < INTERVAL) return;
    this.accum = 0;
    this.report(ctx, director, 'live');
  }

  private report(ctx: EngineContext, director: Director, tag: string): void {
    const camera = ctx.camera;
    camera.updateMatrixWorld(true);
    CAMERA.setFromMatrixPosition(camera.matrixWorld);
    PROJECTION.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    FRUSTUM.setFromProjectionMatrix(PROJECTION);

    const info = ctx.renderer.info.render;
    say(
      `[aiprobe:${tag}] t=${ctx.time.elapsed.toFixed(1)} alive=${director.aliveCount} ` +
        `corpses=${director.corpseCount} cam=${fixed(CAMERA)} ` +
        `layers=${camera.layers.mask} fov=${camera.fov} calls=${info.calls} tris=${info.triangles}`,
    );

    let index = 0;
    for (const enemy of director.all) {
      this.reportOne(enemy, index++, ctx);
    }
  }

  private reportOne(enemy: Enemy, index: number, ctx: EngineContext): void {
    const root = enemy.model.root;
    root.updateWorldMatrix(true, true);
    WORLD.setFromMatrixPosition(root.matrixWorld);
    SCALE.setFromMatrixScale(root.matrixWorld);

    // Walk up to whichever scene actually owns it. Putting a soldier in the
    // viewmodel scene draws it at arm's length in front of the camera, which
    // reads as "invisible" because it is behind the gun.
    let top: THREE.Object3D = root;
    let depth = 0;
    while (top.parent && depth++ < 32) top = top.parent;
    const scene =
      top === ctx.scene ? 'scene' : top === ctx.viewScene ? 'VIEWSCENE' : `${top.type}:${top.name}`;

    BOX.makeEmpty();
    let meshes = 0;
    let triangles = 0;
    let visibleMeshes = 0;
    const details: string[] = [];
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      const geometry = mesh.geometry;
      const position = geometry.getAttribute('position');
      const count = geometry.index ? geometry.index.count : (position?.count ?? 0);
      if (mesh.visible) {
        visibleMeshes++;
        triangles += count / 3;
        // The skinned bound is authored in model space, so union it by hand
        // rather than trusting `Box3.expandByObject` on a bound-less skin.
        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        if (geometry.boundingBox) BOX.union(worldBox(geometry.boundingBox, mesh.matrixWorld));
      }
      if (this.level < 2 && index > 0) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const bound = (mesh as THREE.SkinnedMesh).boundingSphere;
      details.push(
        `      ${mesh.type} vis=${mesh.visible} tris=${count / 3} layers=${mesh.layers.mask} ` +
          `culled=${mesh.frustumCulled} shadow=${mesh.castShadow} ` +
          `bs=${bound ? bound.radius.toFixed(2) : 'auto'} ` +
          materials
            .map((m) =>
              m
                ? `[${m.name || m.type} op=${m.opacity} tr=${m.transparent} vis=${m.visible}]`
                : '[NULL]',
            )
            .join(''),
      );
    });
    BOX.getSize(SIZE);

    // The skinned bound is the bind pose, so it says 1.79 m for a man who is
    // lying down. Read the head bone instead, which is where the pose actually
    // put him.
    HEAD.setFromMatrixPosition(enemy.model.bones[B.head].matrixWorld);
    const posedHeight = HEAD.y - enemy.feet.y;

    HEAD.set(enemy.feet.x, enemy.feet.y + 1.8, enemy.feet.z).project(ctx.camera);
    const ndc = HEAD.clone();
    FOOT.copy(enemy.feet).project(ctx.camera);
    // Height on screen is what actually decides whether a model reads, and it is
    // not derivable from distance alone at this field of view.
    const pixels = Math.abs(ndc.y - FOOT.y) * 0.5 * ctx.size.height;
    const origin = this.origins.get(enemy.id);
    const drift = origin ? origin.distanceTo(enemy.feet) : -1;
    const inFrustum = FRUSTUM.intersectsBox(BOX);

    // Where the weapon actually ended up pointing, against where the AI asked it
    // to point. A rifle at the sky is either a bad aim goal or a bad pose, and
    // these two numbers say which without another capture.
    const dir = enemy.animator.muzzleDir;
    const gunPitch = (Math.atan2(dir.y, Math.hypot(dir.x, dir.z)) * 180) / Math.PI;
    AIM.copy(enemy.combatant.aimPoint).sub(enemy.feet);
    const aimPitch = (Math.atan2(AIM.y - 1.63, Math.hypot(AIM.x, AIM.z)) * 180) / Math.PI;

    const ragdoll = enemy.ragdoll;
    const corpse = enemy.dying
      ? ` rag=${ragdoll ? (ragdoll.settled ? 'settled' : 'active') : 'none'}` +
        `${enemy.ragdollAbandoned ? `/abandoned(${enemy.ragdollFault})` : ''}`
      : '';

    say(
      `[aiprobe]  #${enemy.id} ${enemy.archetype.id} v${enemy.variantIndex} ` +
        `${enemy.behavior.state}${enemy.dying ? '/dying' : ''} ` +
        `parent=${root.parent ? `${root.parent.type}:${root.parent.name || '-'}` : 'NONE'} ` +
        `top=${scene} rootVis=${root.visible} pos=${fixed(WORLD)} scale=${fixed(SCALE, 3)} ` +
        `bind=${fixed(SIZE)} headY=${posedHeight.toFixed(2)} ` +
        `meshes=${visibleMeshes}/${meshes} tris=${triangles} ` +
        `lod=${enemy.model.detail} dist=${WORLD.distanceTo(CAMERA).toFixed(1)} ` +
        `drift=${drift.toFixed(1)} ndc=${ndc.x.toFixed(2)},${ndc.y.toFixed(2)},${ndc.z.toFixed(3)} ` +
        `px=${pixels.toFixed(0)} frustum=${inFrustum} ` +
        `gunPitch=${gunPitch.toFixed(1)} aimPitch=${aimPitch.toFixed(1)} aim=${fixed(AIM)} ` +
        `posed=${enemy.posed}${corpse}`,
    );
    for (const line of details) say(line);
  }
}

const SCRATCH_BOX = /* @__PURE__ */ new THREE.Box3();

/** `box` transformed into world space, reusing one scratch instance. */
function worldBox(box: THREE.Box3, matrix: THREE.Matrix4): THREE.Box3 {
  return SCRATCH_BOX.copy(box).applyMatrix4(matrix);
}
