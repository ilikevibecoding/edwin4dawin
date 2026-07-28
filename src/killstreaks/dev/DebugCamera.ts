/**
 * A camera the screenshot harness can park anywhere and point at anything.
 *
 * Verifying an air strike from the player's own eyes does not work: the first
 * attempt produced eight photographs of a wall with three specks over it, because
 * the player camera points at the horizon and the aircraft are twelve degrees up
 * and six hundred metres out. Judging whether an airframe reads as an airframe
 * needs a camera that can sit on the formation's beam; judging whether the walked
 * line reads as a carpet needs one ninety metres up.
 *
 * So this is a director, not a free camera: it is told a subject by name and a
 * placement, and it re-resolves the subject every frame. `ks:` roots are added as
 * direct children of the scene, so resolving one is a scan of `scene.children`
 * rather than a traversal, and the whole thing costs nothing on a frame where it
 * is switched off — which is every frame outside `?killstreaktest=1`.
 */
import * as THREE from 'three';
import type { EngineContext } from '../../core/System';

export type DebugCameraMode = 'off' | 'stand' | 'chase';

export interface DebugCameraSettings {
  mode?: DebugCameraMode;
  /** Eye position for `stand`, world space. */
  eye?: readonly number[];
  /** Where to look when no subject resolves. */
  aim?: readonly number[];
  /** Object name, `auto` for the most interesting thing airborne, or `none`. */
  subject?: string;
  /** Chase placement relative to the subject: starboard, up, forward. */
  offset?: readonly number[];
  /** Metres above the subject's origin to aim, so a jet is not framed at its belly. */
  aimLift?: number;
  fov?: number;
  /** Rotate `offset` into the subject's own heading frame rather than world axes. */
  local?: boolean;
}

/**
 * What `auto` looks for, most interesting first. Ordnance beats aircraft because
 * once the stores are off the rack they are the whole story, and a bomb three
 * seconds from the ground is also pointing the camera at where the ground is
 * about to erupt.
 */
const AUTO_SUBJECTS = [
  'ks:bomb',
  'ks:bomblet',
  'ks:canister',
  'ks:carePackage',
  // The rig is dismantled on touchdown and the crate is re-parented to the scene
  // for the physics body, so on the ground it is this name and not the pack's.
  'ks:crate',
  'ks:strikeJet',
  'ks:gunship',
  'ks:transport',
  'ks:reconDrone',
];

/** Names for which the lowest instance is the interesting one. */
const PICK_LOWEST = new Set(['ks:bomb', 'ks:bomblet', 'ks:canister', 'ks:carePackage']);

export class DebugCamera {
  mode: DebugCameraMode = 'off';
  subject = 'auto';
  fov = 0;
  local = true;
  aimLift = 0;

  private readonly eye = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private readonly offset = new THREE.Vector3(-46, 12, -18);

  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly focus = new THREE.Vector3();
  private readonly place = new THREE.Vector3();
  private savedFov = 0;

  /** What the last applied frame was actually looking at. */
  locked: string | null = null;

  configure(settings: DebugCameraSettings): void {
    if (settings.mode) this.mode = settings.mode;
    if (settings.subject !== undefined) this.subject = settings.subject;
    if (settings.local !== undefined) this.local = settings.local;
    if (settings.aimLift !== undefined) this.aimLift = settings.aimLift;
    if (settings.fov !== undefined) this.fov = settings.fov;
    if (settings.eye) this.eye.fromArray(settings.eye as number[]);
    if (settings.aim) this.aim.fromArray(settings.aim as number[]);
    if (settings.offset) this.offset.fromArray(settings.offset as number[]);
  }

  /** Writes the camera. Returns false if the director is off. */
  apply(ctx: EngineContext): boolean {
    if (this.mode === 'off') return false;
    const camera = ctx.camera;
    if (this.savedFov === 0) this.savedFov = camera.fov;

    const target = this.resolve(ctx.scene);
    this.focus.copy(target ? this.place : this.aim);
    if (target) this.focus.y += this.aimLift;

    if (this.mode === 'chase') {
      // A chase with nothing to chase composes off the aim point in world axes
      // rather than reusing whatever eye a previous `stand` left behind, which
      // photographs as the wrong shot with no indication that anything is wrong.
      if (target) {
        this.frameOf(target);
      } else {
        this.forward.set(0, 0, 1);
        this.right.set(-1, 0, 0);
      }
      this.eye
        .copy(this.focus)
        .addScaledVector(this.right, this.offset.x)
        .addScaledVector(this.up, this.offset.y)
        .addScaledVector(this.forward, this.offset.z);
    }

    camera.position.copy(this.eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.focus);
    const wanted = this.fov > 0 ? this.fov : this.savedFov;
    if (Math.abs(camera.fov - wanted) > 1e-3) {
      camera.fov = wanted;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
    return true;
  }

  /** Hands the camera back; the player controller rewrites it next frame. */
  release(ctx: EngineContext | null): void {
    this.mode = 'off';
    this.locked = null;
    if (ctx && this.savedFov > 0 && Math.abs(ctx.camera.fov - this.savedFov) > 1e-3) {
      ctx.camera.fov = this.savedFov;
      ctx.camera.updateProjectionMatrix();
    }
    this.savedFov = 0;
  }

  /** Finds the subject and writes its world position into `place`. */
  private resolve(scene: THREE.Scene): THREE.Object3D | null {
    if (this.subject === 'none') {
      this.locked = null;
      return null;
    }
    if (this.subject !== 'auto') {
      const found = this.pick(scene, this.subject);
      this.locked = found ? this.subject : null;
      return found;
    }
    for (const name of AUTO_SUBJECTS) {
      const found = this.pick(scene, name);
      if (!found) continue;
      this.locked = name;
      return found;
    }
    this.locked = null;
    return null;
  }

  private pick(scene: THREE.Scene, name: string): THREE.Object3D | null {
    const lowest = PICK_LOWEST.has(name);
    let best: THREE.Object3D | null = null;
    let bestY = Infinity;
    for (const child of scene.children) {
      if (child.name !== name || !child.visible) continue;
      if (!lowest) {
        best = child;
        break;
      }
      if (child.position.y >= bestY) continue;
      bestY = child.position.y;
      best = child;
    }
    if (best) best.getWorldPosition(this.place);
    return best;
  }

  /** Heading frame of the subject: nose along +Z, starboard = forward x up. */
  private frameOf(subject: THREE.Object3D): void {
    if (!this.local) {
      this.forward.set(0, 0, 1);
      this.right.set(-1, 0, 0);
      return;
    }
    subject.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, 1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.up).normalize();
  }
}
