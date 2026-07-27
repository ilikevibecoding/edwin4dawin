import * as THREE from 'three';

/**
 * Adapter onto three's built-in L2 spherical-harmonic probe grid.
 *
 * three looks for `isLightProbeGrid` while walking the scene and reads four
 * fields off whatever it finds, so a plain `Object3D` is enough — there is no
 * exported class to extend. Going through the built-in path rather than a
 * bespoke sampler is worth it for one reason: the irradiance lands in three's
 * own `irradiance` accumulator before the BRDF runs, so bounce light gets the
 * same energy handling as everything else and costs one sampler instead of two.
 *
 * The grid must be present from the first frame and its texture must never be
 * null while it is in the scene: three compares "is there a volume" against
 * "did the lookup find one", and disagreeing answers make it rebuild the
 * program every single frame.
 */
export class ProbeGrid extends THREE.Object3D {
  readonly isLightProbeGrid = true;
  readonly boundingBox = new THREE.Box3();
  readonly resolution = new THREE.Vector3(1, 1, 1);
  texture: THREE.Data3DTexture | null = null;

  constructor(texture: THREE.Data3DTexture, bounds: THREE.Box3, resolution: THREE.Vector3) {
    super();
    this.name = 'IrradianceProbeGrid';
    this.texture = texture;
    this.boundingBox.copy(bounds);
    this.resolution.copy(resolution);
    /* Never culled, never drawn: it is metadata that happens to live in the
       scene graph, and three only looks at it during `projectObject`. */
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
  }
}
