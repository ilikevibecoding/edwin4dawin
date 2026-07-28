import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import {
  FOOTPRINT_FRAG,
  FOOTPRINT_VERT,
  TACTICAL_FRAG,
  TACTICAL_VERT,
} from '../shaders/killstreak/tactical.glsl';
import { headingToDir, headingToRight } from './Common';

/**
 * The targeting mode.
 *
 * Three pieces, and the reason it is three rather than one is that a targeting
 * interface has to answer three different questions at once and they want
 * different treatments:
 *
 *  - *Where am I looking?* — the camera. It lifts out of the player's head to
 *    an isometric plan of the map, interpolated rather than cut, because the
 *    lift is the moment the player understands they are about to do something
 *    enormous. The interpolation is over the *pose*, not over the two matrices:
 *    a slerp between two look-at quaternions swings the horizon through the
 *    frame and is nauseating, while easing the eye along an arc and re-aiming
 *    at the same ground point every frame keeps the target pinned where the
 *    player put it.
 *
 *  - *What will it hit?* — the footprint. A mesh, not a decal: its vertices are
 *    sampled onto the ground, so it climbs the kerb, follows the ramp into the
 *    underpass and disappears under the souk canopy. That last one is the point.
 *    The part of the marker you cannot see is the part the bombs cannot reach,
 *    so occlusion *is* the feedback and the marker is depth-tested on purpose.
 *
 *  - *Is this a good idea?* — the treatment. A desaturated, edge-outlined,
 *    scanned version of the world, which does two things: it says
 *    unambiguously that the player is in a mode, and it flattens the map's own
 *    contrast so a thin green line reads over a sunlit roof.
 */

/** Plan-space resolution of the footprint mesh. More is smoother on a kerb. */
const GRID_U = 26;
const GRID_V = 14;

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _size = new THREE.Vector2();

export class Footprint {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly position: THREE.BufferAttribute;

  constructor(scene: THREE.Object3D) {
    const cols = GRID_U + 1;
    const rows = GRID_V + 1;
    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const plan = new Float32Array(count * 2);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        plan[k * 2] = (i / GRID_U) * 2 - 1;
        plan[k * 2 + 1] = (j / GRID_V) * 2 - 1;
      }
    }
    const indices = new Uint16Array(GRID_U * GRID_V * 6);
    let w = 0;
    for (let j = 0; j < GRID_V; j++) {
      for (let i = 0; i < GRID_U; i++) {
        const a = j * cols + i;
        indices[w++] = a;
        indices[w++] = a + cols;
        indices[w++] = a + cols + 1;
        indices[w++] = a;
        indices[w++] = a + cols + 1;
        indices[w++] = a + 1;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(positions, 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('aPlan', new THREE.BufferAttribute(plan, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.footprint',
      vertexShader: FOOTPRINT_VERT,
      fragmentShader: FOOTPRINT_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color(0.3, 1.0, 0.55) },
        uValid: { value: 1 },
        uTime: { value: 0 },
        uShape: { value: 0 },
        uAspect: { value: 1 },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.footprint';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 14;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * Rebuilds the marker on the ground.
   *
   * `halfLength` runs along the heading and `halfWidth` across it, so a carpet
   * strike's footprint is a long rectangle that genuinely rotates with the
   * run-in and a precision strike's is a circle that does not care.
   */
  place(
    centre: THREE.Vector3,
    heading: number,
    halfLength: number,
    halfWidth: number,
    ellipse: boolean,
    groundAt: (x: number, z: number) => number,
  ): void {
    headingToDir(heading, _fwd);
    headingToRight(heading, _right);
    const cols = GRID_U + 1;
    const rows = GRID_V + 1;
    const array = this.position.array as Float32Array;
    for (let j = 0; j < rows; j++) {
      const v = (j / GRID_V) * 2 - 1;
      for (let i = 0; i < cols; i++) {
        const u = (i / GRID_U) * 2 - 1;
        const x = centre.x + _fwd.x * u * halfLength + _right.x * v * halfWidth;
        const z = centre.z + _fwd.z * u * halfLength + _right.z * v * halfWidth;
        const k = (j * cols + i) * 3;
        array[k] = x;
        // Just clear of the road so it does not z-fight with the tarmac.
        array[k + 1] = groundAt(x, z) + 0.06;
        array[k + 2] = z;
      }
    }
    this.position.needsUpdate = true;
    this.material.uniforms.uShape.value = ellipse ? 1 : 0;
    this.material.uniforms.uAspect.value = halfLength / Math.max(0.5, halfWidth);
    this.mesh.visible = true;
  }

  setValidity(valid: boolean, time: number, opacity = 1): void {
    const u = this.material.uniforms;
    u.uValid.value = valid ? 1 : 0;
    u.uTime.value = time;
    u.uOpacity.value = opacity;
    (u.uColor.value as THREE.Color).setRGB(
      valid ? 0.26 : 1.0,
      valid ? 1.0 : 0.24,
      valid ? 0.52 : 0.2,
    );
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * The full-screen tactical treatment.
 *
 * A grab of the frame as it stands, drawn back over itself desaturated and
 * outlined. It lives in the late-transparent pass so the grab sees the world
 * with its volumetrics and its particles already composited, and it is written
 * to cost exactly nothing when the amount is zero — the mesh is hidden and the
 * copy never happens.
 */
export class TacticalOverlay {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.ShaderMaterial;
  private grab: THREE.FramebufferTexture | null = null;
  private width = 0;
  private height = 0;
  private amount = 0;
  private readonly grabType: THREE.TextureDataType;
  private readonly supported: boolean;

  constructor(scene: THREE.Object3D, supported: boolean, grabType: THREE.TextureDataType) {
    this.supported = supported;
    this.grabType = grabType;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.tactical',
      vertexShader: TACTICAL_VERT,
      fragmentShader: TACTICAL_FRAG,
      uniforms: {
        uScene: { value: null },
        uHud: { value: null },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
        uHasHud: { value: 0 },
        uAmount: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: false,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.tactical';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // Behind the footprint, in front of everything else in the late pass: the
    // symbology must not be flattened by the treatment it sits on.
    this.mesh.renderOrder = 12;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    this.mesh.onBeforeRender = (renderer) => this.capture(renderer);
    scene.add(this.mesh);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.grab?.dispose();
    if (!this.supported) return;
    this.grab = new THREE.FramebufferTexture(w, h);
    this.grab.name = 'killstreak.tacticalGrab';
    this.grab.type = this.grabType;
    this.grab.format = THREE.RGBAFormat;
    this.grab.minFilter = THREE.LinearFilter;
    this.grab.magFilter = THREE.LinearFilter;
    this.grab.colorSpace = THREE.NoColorSpace;
    this.grab.needsUpdate = true;
    this.material.uniforms.uScene.value = this.grab;
  }

  setDepth(texture: THREE.Texture | null, near: number, far: number, w: number, h: number): void {
    this.material.uniforms.uDepthTexture.value = texture;
    this.material.uniforms.uHasDepth.value = texture ? 1 : 0;
    (this.material.uniforms.uDepthParams.value as THREE.Vector4).set(
      near,
      far,
      1 / Math.max(1, w),
      1 / Math.max(1, h),
    );
  }

  /** The instrument panel, composited over the treated frame. */
  setHud(texture: THREE.Texture | null): void {
    this.material.uniforms.uHud.value = texture;
    this.material.uniforms.uHasHud.value = texture ? 1 : 0;
  }

  set(amount: number, time: number): void {
    this.amount = this.supported ? Math.max(0, Math.min(1, amount)) : 0;
    this.material.uniforms.uAmount.value = this.amount;
    this.material.uniforms.uTime.value = time;
    this.mesh.visible = this.amount > 0.004 && this.grab !== null;
  }

  private capture(renderer: THREE.WebGLRenderer): void {
    if (!this.grab) return;
    renderer.getDrawingBufferSize(_size);
    if (_size.x !== this.width || _size.y !== this.height) return;
    renderer.copyFramebufferToTexture(this.grab);
  }

  dispose(): void {
    this.mesh.onBeforeRender = () => {};
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.grab?.dispose();
    this.grab = null;
  }
}

/**
 * The camera lift.
 *
 * Two poses and a scalar. The near pose is wherever the player's eye was at the
 * moment they called it in; the far pose looks down at the target from an
 * isometric standoff whose bearing is chosen so the low sun is behind the
 * camera rather than in it, since a plan view staring into a golden-hour sun is
 * a white rectangle with a reticle on it.
 *
 * The eye is eased along a path that bulges upward — a straight line from head
 * height to sixty metres passes through the buildings on the way — and the aim
 * point is re-derived every frame from the current target, which is what lets
 * the player move the reticle during the lift without the horizon lurching.
 */
export class TacticalCamera {
  /** 0 = first person, 1 = fully overhead. */
  blend = 0;
  private readonly eyeStart = new THREE.Vector3();
  private readonly aimStart = new THREE.Vector3();
  private readonly eye = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private bearing = 0;
  private standoff = 62;
  private altitude = 74;

  /** Records where the player was looking, so the return is not a cut either. */
  capture(camera: THREE.PerspectiveCamera): void {
    this.eyeStart.copy(camera.position);
    camera.getWorldDirection(_v);
    this.aimStart.copy(camera.position).addScaledVector(_v, 30);
  }

  /**
   * Picks the standoff once, at entry, from the sun and the size of the plan.
   *
   * The elevation is deliberately about thirty-five degrees rather than the
   * sixty a naive "overhead view" reaches for. A steep plan view is a map, and
   * a map of a town is a field of roofs: the buildings lose their height, the
   * streets the bombs will walk down close up, and the player cannot tell a
   * courtyard from an alley. At thirty-five degrees the facades are visible,
   * the shadows have length, and the run-in reads as going *somewhere*.
   */
  frame(sunAzimuth: number, span: number): void {
    // Look downsun: stand between the sun and the target, so the map is lit
    // toward the camera, the shadows point at it, and the buildings keep their
    // modelling instead of flattening out. `sunAzimuth` is the compass bearing
    // *toward* the sun, so this is the bearing itself and not its reciprocal —
    // it was the reciprocal for a while, plus a stray cos/sin that treated a
    // compass bearing as a maths angle, which between them put the tactical
    // camera ninety degrees off and looking straight into a six-degree sun.
    this.bearing = sunAzimuth;
    this.standoff = 52 + span * 1.05;
    this.altitude = 34 + span * 0.62;
  }

  /** Where the camera should be this frame, written into the camera. */
  apply(camera: THREE.PerspectiveCamera, target: THREE.Vector3, baseFov: number): void {
    const t = Math.max(0, Math.min(1, this.blend));
    // Ease in and out; the middle of the move is the fast part.
    const s = t * t * (3 - 2 * t);

    headingToDir(this.bearing, _fwd);
    this.eye.set(
      target.x + _fwd.x * this.standoff,
      target.y + this.altitude,
      target.z + _fwd.z * this.standoff,
    );
    this.aim.copy(target);

    _v.lerpVectors(this.eyeStart, this.eye, s);
    // The bulge. Without it the eye tracks through the roofline on its way up
    // and the transition is three seconds of the inside of a building.
    _v.y += Math.sin(s * Math.PI) * 16;
    camera.position.copy(_v);

    _v.lerpVectors(this.aimStart, this.aim, s);
    camera.lookAt(_v);

    const fov = baseFov + (52 - baseFov) * s;
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  }

  /** Where a screen-space ray meets a horizontal plane at `planeY`. */
  static groundUnder(
    camera: THREE.PerspectiveCamera,
    ndcX: number,
    ndcY: number,
    planeY: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    _v.set(ndcX, ndcY, 0.5).unproject(camera);
    _v.sub(camera.position).normalize();
    if (Math.abs(_v.y) < 1e-4) return out.copy(camera.position);
    const t = (planeY - camera.position.y) / _v.y;
    return out.copy(camera.position).addScaledVector(_v, Math.max(1, t));
  }
}
