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
 * The three together come to about a third of the sun's intensity, which is the
 * figure that matters: any more and the weapon ends up brighter than the sunlit
 * world behind it, so its polymer reads as pale plastic and its steel as chrome
 * no matter what the palette says. This only ever lifts the shadow side. The
 * lights are static in view space, so it costs one extra light pass and nothing
 * per frame.
 */
export class ViewLighting {
  private readonly root = new THREE.Group();

  constructor() {
    this.root.name = 'viewmodelFill';

    // Cool bounce from the front left, roughly where light off the ground and the
    // player's own kit would come from.
    const fill = new THREE.DirectionalLight(0xc2d4e8, 0.7);
    fill.position.set(-0.55, 0.62, 0.95);
    fill.name = 'ViewmodelFill';

    // Warm edge from behind the weapon, which is what separates the receiver from
    // the world behind it and picks out every chamfer on the model.
    const rim = new THREE.DirectionalLight(0xffd9ac, 0.42);
    rim.position.set(0.85, 0.42, -1.0);
    rim.name = 'ViewmodelRim';

    // Barely-there bottom bounce so the underside of the magazine and the
    // trigger guard do not read as holes.
    const bounce = new THREE.DirectionalLight(0x8f9a86, 0.2);
    bounce.position.set(0.1, -1, 0.3);
    bounce.name = 'ViewmodelBounce';

    this.root.add(fill, fill.target, rim, rim.target, bounce, bounce.target);
  }

  attach(ctx: EngineContext): void {
    ctx.viewScene.add(this.root);
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
