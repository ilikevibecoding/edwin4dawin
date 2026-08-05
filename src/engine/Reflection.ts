import * as THREE from 'three';

/**
 * Planar mirror reflection for wet floors: renders the scene from a camera
 * mirrored through a horizontal plane, clipped to everything above it.
 * Much cheaper than screen-space reflections and stable under motion.
 */
export class PlanarReflection {
  readonly renderTarget: THREE.WebGLRenderTarget;
  readonly textureMatrix = new THREE.Matrix4();
  private virtualCamera = new THREE.PerspectiveCamera();
  private clipPlane: THREE.Plane;
  private excluded = new Set<THREE.Object3D>();
  /** Reflections are expensive; refresh them every other frame. */
  interval = 3;
  private tick = 0;

  constructor(
    private height: number,
    width = 640,
    heightPx = 360,
  ) {
    this.renderTarget = new THREE.WebGLRenderTarget(width, heightPx, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.renderTarget.texture.colorSpace = THREE.NoColorSpace;
    this.renderTarget.texture.wrapS = this.renderTarget.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height + 0.002);
  }

  exclude(obj: THREE.Object3D) {
    this.excluded.add(obj);
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    if (this.interval > 1 && this.tick++ % this.interval !== 0) return;
    const vc = this.virtualCamera;
    vc.copy(camera);
    vc.position.copy(camera.position);
    vc.position.y = 2 * this.height - camera.position.y;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y *= -1;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    up.y *= -1;
    const target = vc.position.clone().add(forward);
    vc.up.copy(up);
    vc.lookAt(target);
    vc.near = camera.near;
    vc.far = camera.far;
    vc.fov = camera.fov;
    vc.aspect = camera.aspect;
    vc.updateProjectionMatrix();
    vc.updateMatrixWorld(true);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);

    const hidden: THREE.Object3D[] = [];
    for (const obj of this.excluded) {
      if (obj.visible) {
        obj.visible = false;
        hidden.push(obj);
      }
    }

    const prevClipping = renderer.localClippingEnabled;
    const prevPlanes = renderer.clippingPlanes;
    renderer.clippingPlanes = [this.clipPlane];
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(prevTarget);
    renderer.clippingPlanes = prevPlanes;
    renderer.localClippingEnabled = prevClipping;

    for (const obj of hidden) obj.visible = true;
  }

  dispose() {
    this.renderTarget.dispose();
  }
}
