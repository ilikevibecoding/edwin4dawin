import * as THREE from 'three';

/**
 * Top-down height map of the static world, used as a world-space sky-visibility
 * source for the occlusion pass.
 *
 * The occlusion pass needs to know how much of the sky dome a surface can see,
 * because that — not the geometric cavity term — is what separates a room from a
 * street. A cavity term measures a few metres of local relief and reports the
 * same 0.4 for a crease in plaster and for a covered hall; only the sky term can
 * say that one of them is outdoors.
 *
 * That question cannot be answered in screen space. Marching toward world-up
 * through the depth buffer only ever finds occluders that happen to be in frame
 * and above the pixel, so anything near the top of the image is reported as
 * fully open: standing in a covered hall looking slightly up, the ceiling beams
 * filling the top third of the frame came back as the most sky-exposed surfaces
 * in the shot and were rendered as the brightest thing in the room. Widening the
 * march cannot fix it, because the occluder is off-screen by construction.
 *
 * A single orthographic depth render from directly overhead answers it in world
 * space and does not care where the camera is looking. The level is static, so
 * this is rendered once at load and then sampled like a shadow map. Sampling a
 * small disc of offsets rather than one texel turns "is anything directly above
 * me" into an estimate of what share of the hemisphere is blocked, which is what
 * distinguishes a deep arcade from the shady side of a street.
 */
export class SkyMask {
  readonly target: THREE.WebGLRenderTarget;
  /** World → mask UV in xy, normalised height in z. Same form as a shadow matrix. */
  readonly matrix = new THREE.Matrix4();
  /** World height that a sampled depth of 0 corresponds to. */
  top = 0;
  /** World height span covered by the depth range. */
  range = 1;
  /** World metres per mask texel, so the sampling radius can be kept meaningful. */
  texelSize = 1;

  private readonly camera = new THREE.OrthographicCamera();
  private readonly override = new THREE.MeshBasicMaterial();
  private readonly bias = new THREE.Matrix4().set(
    0.5, 0.0, 0.0, 0.5,
    0.0, 0.5, 0.0, 0.5,
    0.0, 0.0, 0.5, 0.5,
    0.0, 0.0, 0.0, 1.0,
  );

  constructor(size: number) {
    const depth = new THREE.DepthTexture(size, size);
    depth.type = THREE.UnsignedIntType;
    depth.format = THREE.DepthFormat;
    depth.minFilter = THREE.NearestFilter;
    depth.magFilter = THREE.NearestFilter;
    depth.compareFunction = null;

    // The colour attachment is never read. It cannot be dropped entirely, so it
    // is kept at one byte per pixel.
    this.target = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.NoColorSpace,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.target.depthTexture = depth;

    this.camera.up.set(0, 0, -1);
    this.camera.rotation.order = 'YXZ';
  }

  get texture(): THREE.Texture {
    return this.target.depthTexture as THREE.Texture;
  }

  /**
   * Re-renders the mask over `bounds`.
   *
   * `exclude` is consulted per object and is how the sky dome — which would
   * otherwise roof the entire level — stays out of the result.
   */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    bounds: THREE.Box3,
    exclude: (o: THREE.Object3D) => boolean,
  ): void {
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const centre = new THREE.Vector3();
    bounds.getCenter(centre);

    // A metre of margin above the tallest geometry keeps the topmost roof off
    // the near plane, where it would be clipped away and read as open sky.
    const top = bounds.max.y + 1;
    const bottom = bounds.min.y - 1;
    const cam = this.camera;
    cam.left = -size.x * 0.5;
    cam.right = size.x * 0.5;
    cam.top = size.z * 0.5;
    cam.bottom = -size.z * 0.5;
    cam.near = 0;
    cam.far = top - bottom;
    cam.position.set(centre.x, top, centre.z);
    cam.rotation.set(-Math.PI / 2, 0, 0);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();

    this.top = top;
    this.range = cam.far;
    this.texelSize = Math.max(size.x, size.z) / this.target.width;

    this.matrix.copy(this.bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.visible && exclude(o)) {
        o.visible = false;
        hidden.push(o);
      }
    });

    const prevTarget = renderer.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    // Front faces only. A double-sided render would let the inside of a roof
    // shell win the depth test in places where the shell is inverted, and a
    // back-face-only one loses thin single-sided awning geometry entirely.
    scene.overrideMaterial = this.override;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevTarget);
    scene.overrideMaterial = prevOverride;

    for (const o of hidden) o.visible = true;
  }

  dispose(): void {
    this.target.depthTexture?.dispose();
    this.target.dispose();
    this.override.dispose();
  }
}
