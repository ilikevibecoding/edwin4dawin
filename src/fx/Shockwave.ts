import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import { SHOCKWAVE_FRAG, SHOCKWAVE_VERT } from '../shaders/fx/shockwave.glsl';

/**
 * Pool of blast waves.
 *
 * All of them are one instanced draw, which matters because the draw carries a
 * framebuffer grab with it: one copy per frame while any wave is alive, none
 * when the map is quiet. The copy happens in `onBeforeRender`, at which point
 * the HDR target holds the world, the volumetric composite and every late
 * transparent that sorts ahead of this one — which is nothing, because the wave
 * deliberately renders before the smoke and fire it belongs to.
 */

const MAX_WAVES = 6;

interface Wave {
  active: boolean;
  age: number;
  duration: number;
  radius: number;
  peak: number;
  strength: number;
}

const _size = new THREE.Vector2();

export class ShockwavePool {
  private waves: Wave[] = [];
  private mesh: THREE.Mesh;
  private geometry: THREE.InstancedBufferGeometry;
  private material: THREE.ShaderMaterial;
  private waveAttr: THREE.InstancedBufferAttribute;
  private shapeAttr: THREE.InstancedBufferAttribute;
  private grab: THREE.FramebufferTexture | null = null;
  private grabWidth = 0;
  private grabHeight = 0;
  private liveCount = 0;
  private enabled: boolean;
  private grabType: THREE.TextureDataType;

  constructor(enabled: boolean, hdrType: THREE.TextureDataType) {
    this.enabled = enabled;
    this.grabType = hdrType;

    for (let i = 0; i < MAX_WAVES; i++) {
      this.waves.push({ active: false, age: 0, duration: 1, radius: 1, peak: 1, strength: 1 });
    }

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
        3,
      ),
    );
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    this.waveAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAVES * 4), 4);
    this.shapeAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAVES * 4), 4);
    this.waveAttr.setUsage(THREE.DynamicDrawUsage);
    this.shapeAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aWave', this.waveAttr);
    this.geometry.setAttribute('aShape', this.shapeAttr);
    this.geometry.instanceCount = 0;
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      name: 'fx.shockwave',
      vertexShader: SHOCKWAVE_VERT,
      fragmentShader: SHOCKWAVE_FRAG,
      uniforms: {
        uScene: { value: null },
        uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
      lights: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'fx.shockwaves';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // Ahead of the smoke and fire: the grab must see the world, not the
    // fireball that is about to be drawn over the top of it.
    this.mesh.renderOrder = 5;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.visible = false;
    this.mesh.userData.noPrepass = true;
    this.mesh.onBeforeRender = (renderer) => this.capture(renderer);
  }

  get object(): THREE.Object3D {
    return this.mesh;
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
    this.grab = new THREE.FramebufferTexture(w, h);
    this.grab.name = 'fx.shockwaveGrab';
    // The grab must match the bound colour attachment's storage exactly or the
    // driver refuses the copy: half-float when the pipeline runs an HDR target,
    // byte when it is rendering straight to the canvas.
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

  /**
   * `radius` is where the front ends up; `speed` sets how fast it gets there.
   * A grenade front covers eight metres in a fifth of a second, an airstrike
   * front forty in six tenths, and that difference alone reads as scale.
   */
  spawn(x: number, y: number, z: number, radius: number, duration: number, strength: number): void {
    if (!this.enabled || !this.grab) return;
    let wave: Wave | null = null;
    for (const candidate of this.waves) {
      if (!candidate.active) {
        wave = candidate;
        break;
      }
    }
    // Full pool: overwrite the oldest, which is the least interesting.
    if (!wave) {
      wave = this.waves[0];
      for (const candidate of this.waves) {
        if (candidate.age / candidate.duration > wave.age / wave.duration) wave = candidate;
      }
    }
    wave.active = true;
    wave.age = 0;
    wave.duration = Math.max(0.05, duration);
    wave.peak = Math.max(0.4, radius);
    wave.radius = 0.15;
    wave.strength = strength;

    const index = this.waves.indexOf(wave);
    const w = this.waveAttr.array as Float32Array;
    w[index * 4] = x;
    w[index * 4 + 1] = y;
    w[index * 4 + 2] = z;
  }

  update(dt: number): void {
    if (!this.enabled) return;
    const w = this.waveAttr.array as Float32Array;
    const s = this.shapeAttr.array as Float32Array;
    let live = 0;
    let highWater = 0;

    for (let i = 0; i < MAX_WAVES; i++) {
      const wave = this.waves[i];
      if (!wave.active) {
        s[i * 4 + 3] = 0;
        continue;
      }
      wave.age += dt;
      const u = wave.age / wave.duration;
      if (u >= 1) {
        wave.active = false;
        s[i * 4 + 3] = 0;
        continue;
      }
      live++;
      highWater = i + 1;

      // Decelerating front: fast off the mark, then the wave runs out of
      // overpressure and the radius asymptotes.
      const expand = 1 - Math.pow(1 - u, 2.4);
      w[i * 4 + 3] = 0.15 + wave.peak * expand;
      // Thickening shell, weakening as it spreads over a larger sphere.
      const decay = (1 - u) * (1 - u);
      s[i * 4] = 0.055 + 0.13 * u;
      s[i * 4 + 1] = 26 * wave.strength * decay;
      s[i * 4 + 2] = 0.9 * wave.strength * decay;
      s[i * 4 + 3] = Math.min(1, (1 - u) * 1.6);
    }

    this.liveCount = live;
    this.geometry.instanceCount = highWater;
    this.mesh.visible = live > 0 && this.grab !== null;
    if (live > 0) {
      this.waveAttr.needsUpdate = true;
      this.shapeAttr.needsUpdate = true;
    }
  }

  private capture(renderer: THREE.WebGLRenderer): void {
    const grab = this.grab;
    if (!grab || this.liveCount === 0) return;
    renderer.getDrawingBufferSize(_size);
    if (_size.x !== this.grabWidth || _size.y !== this.grabHeight) return;
    renderer.copyFramebufferToTexture(grab);
  }

  clear(): void {
    for (const wave of this.waves) wave.active = false;
    this.liveCount = 0;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.onBeforeRender = () => {};
    this.geometry.dispose();
    this.material.dispose();
    this.grab?.dispose();
    this.grab = null;
  }
}
