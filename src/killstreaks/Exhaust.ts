import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import { AFTERBURNER_FRAG, AFTERBURNER_VERT } from '../shaders/killstreak/afterburner.glsl';
import { DISTORT_FRAG, DISTORT_VERT } from '../shaders/killstreak/distort.glsl';

/**
 * What comes out of the back of the aircraft.
 *
 * Two separate things, and conflating them is the usual mistake. The plume is
 * *emissive*: burning fuel, additively blended, tens of times brighter than a
 * sunlit wall. The haze behind it is *refractive*: hot air is not brighter than
 * cold air, it is a lens, and drawing it as a bright overlay reads as fog. So
 * the plume is a shaded strip and the haze is a framebuffer grab that resamples
 * the world along a noise gradient.
 */

const PLUME_STATIONS = 14;

/** A strip billboarded about its own axis. Built once, shared by every nozzle. */
function buildPlumeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const verts = PLUME_STATIONS * 2;
  const positions = new Float32Array(verts * 3);
  const side = new Float32Array(verts);
  const t = new Float32Array(verts);
  for (let i = 0; i < PLUME_STATIONS; i++) {
    // Packed toward the nozzle: that is where the shock structure lives.
    const u = Math.pow(i / (PLUME_STATIONS - 1), 1.35);
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    t[i * 2] = u;
    t[i * 2 + 1] = u;
  }
  const indices: number[] = [];
  for (let i = 0; i < PLUME_STATIONS - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  return geo;
}

export class Afterburner {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(geometry: THREE.BufferGeometry, throat: number, length: number) {
    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.afterburner',
      vertexShader: AFTERBURNER_VERT,
      fragmentShader: AFTERBURNER_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uLength: { value: length },
        uThroat: { value: throat },
        uCoreColor: { value: new THREE.Color(0.72, 0.82, 1.0) },
        uEdgeColor: { value: new THREE.Color(1.0, 0.52, 0.16) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
  }

  set(throttle: number, time: number): void {
    this.material.uniforms.uThrottle.value = throttle;
    this.material.uniforms.uTime.value = time;
    this.mesh.visible = throttle > 0.02;
  }

  dispose(): void {
    this.material.dispose();
  }
}

export class AfterburnerSet {
  private readonly geometry = buildPlumeGeometry();
  private readonly burners: Afterburner[] = [];

  make(throat: number, length: number): Afterburner {
    const burner = new Afterburner(this.geometry, throat, length);
    this.burners.push(burner);
    return burner;
  }

  dispose(): void {
    for (const b of this.burners) b.dispose();
    this.burners.length = 0;
    this.geometry.dispose();
  }
}

/* ---------------------------- refractive haze ----------------------------- */

const _size = new THREE.Vector2();

/**
 * A pool of refractive cells, drawn in one instanced call.
 *
 * The draw carries a framebuffer grab with it, so it is written to make exactly
 * one copy per frame while any cell is alive and none when the map is quiet.
 * It renders before the fire and smoke it belongs to, which is what lets the
 * grab see the world rather than the effect that is about to be drawn over it.
 */
export class DistortionField {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly cellAttr: THREE.InstancedBufferAttribute;
  private readonly paramAttr: THREE.InstancedBufferAttribute;
  private readonly capacity: number;
  private grab: THREE.FramebufferTexture | null = null;
  private grabWidth = 0;
  private grabHeight = 0;
  private grabType: THREE.TextureDataType;
  private cursor = 0;
  private enabled: boolean;

  constructor(
    scene: THREE.Object3D,
    capacity: number,
    enabled: boolean,
    hdrType: THREE.TextureDataType,
  ) {
    this.capacity = capacity;
    this.enabled = enabled;
    this.grabType = hdrType;

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
        3,
      ),
    );
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    this.cellAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.paramAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.cellAttr.setUsage(THREE.DynamicDrawUsage);
    this.paramAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aCell', this.cellAttr);
    this.geometry.setAttribute('aParam', this.paramAttr);
    this.geometry.instanceCount = 0;
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.distort',
      vertexShader: DISTORT_VERT,
      fragmentShader: DISTORT_FRAG,
      uniforms: {
        uScene: { value: null },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.heathaze';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 4;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.visible = false;
    this.mesh.userData.noPrepass = true;
    this.mesh.onBeforeRender = (renderer) => this.capture(renderer);
    scene.add(this.mesh);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.grabWidth && h === this.grabHeight) return;
    this.grabWidth = w;
    this.grabHeight = h;
    this.grab?.dispose();
    // The grab must match the bound colour attachment's storage exactly or the
    // driver refuses the copy.
    this.grab = new THREE.FramebufferTexture(w, h);
    this.grab.name = 'killstreak.distortGrab';
    this.grab.type = this.grabType;
    this.grab.format = THREE.RGBAFormat;
    this.grab.minFilter = THREE.LinearFilter;
    this.grab.magFilter = THREE.LinearFilter;
    this.grab.colorSpace = THREE.NoColorSpace;
    this.grab.needsUpdate = true;
    this.material.uniforms.uScene.value = this.grab;
    (this.material.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
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

  /** Called once a frame before any `add`. */
  begin(time: number): void {
    this.material.uniforms.uTime.value = time;
    this.cursor = 0;
  }

  add(
    x: number,
    y: number,
    z: number,
    radius: number,
    strength: number,
    stretch: number,
    rise: number,
    seed: number,
  ): void {
    if (!this.enabled || this.cursor >= this.capacity) return;
    const i = this.cursor++;
    const c = this.cellAttr.array as Float32Array;
    const p = this.paramAttr.array as Float32Array;
    c[i * 4] = x;
    c[i * 4 + 1] = y;
    c[i * 4 + 2] = z;
    c[i * 4 + 3] = radius;
    p[i * 4] = strength;
    p[i * 4 + 1] = stretch;
    p[i * 4 + 2] = seed;
    p[i * 4 + 3] = rise;
  }

  commit(): void {
    const live = this.cursor;
    this.geometry.instanceCount = live;
    this.mesh.visible = this.enabled && live > 0 && this.grab !== null;
    if (live > 0) {
      this.cellAttr.needsUpdate = true;
      this.paramAttr.needsUpdate = true;
    }
  }

  private capture(renderer: THREE.WebGLRenderer): void {
    if (!this.grab || this.cursor === 0) return;
    renderer.getDrawingBufferSize(_size);
    if (_size.x !== this.grabWidth || _size.y !== this.grabHeight) return;
    renderer.copyFramebufferToTexture(this.grab);
  }

  clear(): void {
    this.cursor = 0;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
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
