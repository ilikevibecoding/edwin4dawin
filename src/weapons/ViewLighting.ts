import * as THREE from 'three';
import type { EngineContext } from '../core/System';

/**
 * Viewmodel fill rig.
 *
 * The render module lights the view scene with a single sun rotated to match the
 * world's, plus a hemisphere fill. That is correct, and it is also why a weapon
 * lit from behind collapses into a black silhouette in the lower third of the
 * frame — the one place in the game where that is unacceptable. Every shipped
 * shooter solves it the same way, with a small camera-locked rig that guarantees
 * the gun always has a readable front value and a defining edge.
 *
 * The intensities are fractions of the scene's own sun rather than constants,
 * and that is the whole point of this file. They used to be constants summing to
 * 1.32, chosen when the renderer's sun was near 3. The renderer now runs at
 * physical scale — a little over 29 at noon — so the rig was delivering five per
 * cent of the sun while its own comment claimed a third, and a weapon held with
 * the sun behind it had essentially nothing lighting the faces pointed at the
 * camera. That is the black-smudge bug: not a broken material or a NaN tangent,
 * just a fill rig left two orders of magnitude behind a lighting rebalance, on
 * the one object in the game that cannot survive being underlit.
 *
 * Reading the sun off the scene rather than taking it as a parameter keeps this
 * correct through dusk, night and the occlusion term the lighting module already
 * applies to `ViewmodelSun`, with no coupling to the render module beyond a
 * light's name.
 */

/**
 * Rig intensity as a fraction of the reference sun, per light.
 *
 * Set against a measurement rather than by eye, because the failure mode is not
 * obvious from a single frame. A sunlit brick wall in these scenes sits at about
 * 4.8 units of irradiance. At three times these fractions the weapon was
 * receiving nine to ten — twice the sunlit world behind it — because the rig is
 * camera-locked and a weapon held out in the open catches the scene's sun *and*
 * the whole rig on the same faces. The result photographs as pale cream plastic
 * whatever albedo it is given, which is the state the untextured report was
 * describing and which no amount of retinting the palette can fix.
 *
 * These sum to about 8 per cent by luminance, which lands a weapon in the open
 * just under the sunlit background and still keeps a weapon in full shade near
 * 3.3 units — dim, but an order of magnitude clear of the black silhouette that
 * the scene's own lighting alone would give it.
 */
const FILL_FRACTION = 0.055;
const RIM_FRACTION = 0.028;
const BOUNCE_FRACTION = 0.016;

/** Used until the render module's lights exist, and at night. */
const FALLBACK_SUN = 6;

export class ViewLighting {
  private readonly root = new THREE.Group();

  /** Cool bounce from the front left, where light off the ground would come from. */
  private readonly fill = new THREE.DirectionalLight(0xc2d4e8, 0);
  /** Warm edge from behind, which separates the receiver from the world. */
  private readonly rim = new THREE.DirectionalLight(0xffd9ac, 0);
  /** Bottom bounce, so the magazine and trigger guard are not holes. */
  private readonly bounce = new THREE.DirectionalLight(0x8f9a86, 0);

  /** The render module's view sun, found by name; drives the rig's scale. */
  private reference: THREE.DirectionalLight | null = null;
  private referenceFill: THREE.HemisphereLight | null = null;
  private scene: THREE.Scene | null = null;

  constructor() {
    this.root.name = 'viewmodelFill';
    this.fill.name = 'ViewmodelRigFill';
    this.fill.position.set(-0.55, 0.62, 0.95);
    this.rim.name = 'ViewmodelRigRim';
    this.rim.position.set(0.85, 0.42, -1.0);
    this.bounce.name = 'ViewmodelRigBounce';
    this.bounce.position.set(0.1, -1, 0.3);
    this.root.add(
      this.fill,
      this.fill.target,
      this.rim,
      this.rim.target,
      this.bounce,
      this.bounce.target,
    );
  }

  attach(ctx: EngineContext): void {
    this.scene = ctx.viewScene;
    ctx.viewScene.add(this.root);
    this.update();
  }

  /**
   * Rescales the rig to the current sun. Cheap enough to run every frame, and it
   * has to: the sun's intensity carries both the time of day and the occlusion
   * term, so a player walking into a building would otherwise keep a weapon lit
   * for open ground.
   */
  update(): void {
    const scene = this.scene;
    if (!scene) return;
    if (!this.reference) {
      const sun = scene.getObjectByName('ViewmodelSun');
      if (sun && (sun as THREE.DirectionalLight).isDirectionalLight) {
        this.reference = sun as THREE.DirectionalLight;
      }
    }
    if (!this.referenceFill) {
      const hemi = scene.getObjectByName('ViewmodelFill');
      if (hemi && (hemi as THREE.HemisphereLight).isHemisphereLight) {
        this.referenceFill = hemi as THREE.HemisphereLight;
      }
    }
    // The hemisphere term counts because it is what carries a heavily occluded or
    // overcast scene, where the sun alone would scale the rig to nothing.
    const sun = this.reference?.intensity ?? 0;
    const ambient = (this.referenceFill?.intensity ?? 0) * 2;
    const scale = Math.max(sun + ambient, sun > 0 || ambient > 0 ? 0 : FALLBACK_SUN);
    this.fill.intensity = scale * FILL_FRACTION;
    this.rim.intensity = scale * RIM_FRACTION;
    this.bounce.intensity = scale * BOUNCE_FRACTION;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.reference = null;
    this.referenceFill = null;
    this.scene = null;
  }
}
