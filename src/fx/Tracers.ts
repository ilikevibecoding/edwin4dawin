import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import { SoAPool } from '../core/ObjectPool';
import { rng } from '../core/MathUtils';

const STRIDE = 16;

const QUAD_POSITION = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

const VERTEX = /* glsl */ `
attribute vec4 aFrom;   // xyz origin, w spawn time
attribute vec4 aTo;     // xyz endpoint, w speed
attribute vec4 aStyle;  // rgb colour, a width
attribute vec4 aExtra;  // trail length, intensity, seed, kind

uniform float uTime;
/**
 * World metres per screen pixel at one metre of depth.
 *
 * A tracer is 3.5 cm across. At five metres that is a healthy five pixels; at a
 * hundred it is a quarter of one, so the rasteriser drops most of the streak and
 * what survives flickers — a round crossing a street simply vanishes halfway.
 * Widening it in world space by the depth keeps it at a fixed size on screen,
 * which is what a self-luminous streak does anyway once it is small enough to be
 * spread by the lens.
 */
uniform float uPixelWidth;

/** Screen width a tracer is never allowed to fall below, in pixels. */
const float MIN_PIXELS = 2.8;
/** Width, in pixels, at which the cross-section is worth resolving in full. */
const float SHARP_PIXELS = 9.0;

varying vec2 vUv;
varying vec4 vColor;
varying float vKind;
varying float vSharp;

void main() {
  vec3 delta = aTo.xyz - aFrom.xyz;
  float total = length(delta);
  vec3 dir = total > 1e-5 ? delta / total : vec3(0.0, 0.0, 1.0);

  float travel = (uTime - aFrom.w) * aTo.w;
  float trail = aExtra.x;
  if (travel < 0.0 || travel - trail > total) {
    vUv = vec2(0.0);
    vColor = vec4(0.0);
    vKind = 0.0;
    vSharp = 1.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  float head = min(travel, total);
  float tail = max(travel - trail, 0.0);
  vec4 mvHead = viewMatrix * vec4(aFrom.xyz + dir * head, 1.0);
  vec4 mvTail = viewMatrix * vec4(aFrom.xyz + dir * tail, 1.0);

  float along = position.y + 0.5;
  vec4 mv = mix(mvTail, mvHead, along);

  // Screen-space perpendicular keeps the segment facing the camera. A segment
  // pointing straight at the eye degenerates, so fall back to a fixed axis.
  vec2 screen = mvHead.xy / max(-mvHead.z, 1e-3) - mvTail.xy / max(-mvTail.z, 1e-3);
  float len = length(screen);
  vec2 axis = len > 1e-5 ? screen / len : vec2(1.0, 0.0);
  vec2 perp = vec2(-axis.y, axis.x);
  float perPixel = -mv.z * uPixelWidth;
  float width = max(aStyle.a, perPixel * MIN_PIXELS);
  mv.xy += perp * (position.x * width);

  gl_Position = projectionMatrix * mv;

  // Fade in as the round leaves the muzzle and out as it reaches the target, so
  // a tracer never blinks out mid-air.
  float leave = clamp(travel / max(trail * 0.6, 1e-3), 0.0, 1.0);
  float arrive = 1.0 - clamp((travel - total) / max(trail, 1e-3), 0.0, 1.0);
  // Widening the streak to keep it on screen must not also make it brighter, or
  // distant fire glares. Compensating only partly is the honest answer: a very
  // bright sub-pixel line really does survive being spread over a pixel, just
  // dimmer than it was.
  float widen = width / max(aStyle.a, 1e-5);
  vUv = vec2(position.x + 0.5, along);
  vColor = vec4(aStyle.rgb, aExtra.y * leave * arrive / pow(max(widen, 1.0), 0.62));
  vKind = aExtra.w;
  // How much cross-section the rasteriser can actually resolve, which is a
  // question about pixels and not about whether the width was floored. Keying
  // it to the floor instead makes the *near* streak the sharp one, and a needle
  // profile on a four-pixel quad is sampled nowhere near its axis — so the round
  // at five metres, the one round guaranteed to be on screen, came out as a pale
  // hairline while the hundred-metre round it was supposed to rescue was fine.
  vSharp = clamp((width / max(perPixel, 1e-6) - MIN_PIXELS) / (SHARP_PIXELS - MIN_PIXELS), 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec4 vColor;
varying float vKind;
varying float vSharp;

void main() {
  float across = abs(vUv.x * 2.0 - 1.0);
  float edge = max(1.0 - across, 0.0);
  // The cross-section flattens as the streak is held open to its screen-space
  // minimum. At its authored width a tracer is a needle with a very tight core,
  // and that profile is correct while the quad is several pixels across — but
  // once the quad is down to two, no pixel centre ever lands near enough to the
  // axis to sample the core, and the round crossing a street at a hundred metres
  // is drawn entirely from the weak outer falloff. Which is to say: it vanishes.
  float core = pow(edge, mix(1.7, 7.0, vSharp));
  float halo = pow(edge, mix(0.85, 1.8, vSharp));
  // Brightest at the head, thinning back down the trail.
  float along = pow(vUv.y, 1.7);

  if (vKind > 0.5) {
    // Supersonic whip: a wide, dim, cool-toned pressure smear.
    float body = halo * halo * along * 0.5;
    float a = body * vColor.a;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(vec3(0.62, 0.72, 0.9) * a * 0.9, 0.0);
    return;
  }

  float body = (core * 1.6 + halo * 0.32) * along;
  float a = body * vColor.a;
  if (a <= 0.002) discard;
  // The core burns out toward white and carries real HDR headroom so the bloom
  // pass has something to catch. Both are pulled back as the streak is held open
  // to its screen-space minimum: at that point the quad is no longer resolving a
  // hot centre and a cooler edge, it is standing in for a whole streak the
  // rasteriser cannot draw, so every pixel of it takes the burn and a round at a
  // hundred metres comes out a plain white hairline with none of its colour.
  float burn = mix(0.22, 0.72, vSharp);
  vec3 hot = mix(vColor.rgb, vec3(1.0), core * burn) * (1.0 + core * mix(1.3, 3.4, vSharp));
  gl_FragColor = vec4(hot * a, 0.0);
}
`;

/**
 * Instanced, GPU-simulated tracers.
 *
 * A tracer is a short segment travelling from the muzzle to the impact point at
 * the round's velocity, stretched between its head and its tail and billboarded
 * to face the camera. The whole trajectory is a function of spawn time and
 * speed, so the CPU writes sixteen floats once and never touches the tracer
 * again.
 */
export class TracerSystem {
  readonly root = new THREE.Group();

  private ctx!: EngineContext;
  private capacity = 192;
  private data!: Float32Array;
  private buffer!: THREE.InstancedInterleavedBuffer;
  private geometry!: THREE.InstancedBufferGeometry;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private pool!: SoAPool;
  private death!: Float32Array;

  private dirtyMin = Infinity;
  private dirtyMax = -Infinity;
  private readonly color = new THREE.Color();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly closest = new THREE.Vector3();
  private spawned = 0;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.capacity = ctx.config.tier === 'low' ? 96 : 192;
    this.pool = new SoAPool(this.capacity);
    this.death = new Float32Array(this.capacity);
    this.data = new Float32Array(this.capacity * STRIDE);

    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(QUAD_POSITION, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    this.geometry.setAttribute('aFrom', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    this.geometry.setAttribute('aTo', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    this.geometry.setAttribute('aStyle', new THREE.InterleavedBufferAttribute(this.buffer, 4, 8));
    this.geometry.setAttribute('aExtra', new THREE.InterleavedBufferAttribute(this.buffer, 4, 12));
    this.geometry.instanceCount = 0;
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      name: 'fx:tracer',
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uTime: { value: 0 }, uPixelWidth: { value: 0.003 } },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      toneMapped: true,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'fx:tracers';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 14;
    this.mesh.visible = false;

    this.root.name = 'fx:tracerRoot';
    this.root.matrixAutoUpdate = false;
    this.root.add(this.mesh);
    ctx.scene.add(this.root);
  }

  get liveCount(): number {
    return this.pool.count;
  }

  get spawnCount(): number {
    return this.spawned;
  }

  resetStats(): void {
    this.spawned = 0;
  }

  get drawCalls(): number {
    return this.mesh.visible ? 1 : 0;
  }

  spawn(
    from: THREE.Vector3,
    to: THREE.Vector3,
    colorHex: number,
    speed: number,
    width: number,
  ): void {
    const distance = from.distanceTo(to);
    if (distance < 0.25) return;

    const trail = Math.min(Math.max(distance * 0.35, 3.5), 22);
    const life = (distance + trail) / Math.max(speed, 1);
    this.write(from, to, colorHex, speed, width, trail, 1, 0, life);

    // A supersonic round passing close to the head drags a visible pressure
    // smear behind it. Cheap, and it sells the near miss.
    const camera = this.ctx.camera;
    camera.getWorldPosition(this.cameraPosition);
    if (speed > 300 && this.distanceToSegment(from, to) < 3.2) {
      this.write(from, to, 0xa8bcd8, speed, width * 7, trail * 1.5, 0.5, 1, life);
    }
  }

  private write(
    from: THREE.Vector3,
    to: THREE.Vector3,
    colorHex: number,
    speed: number,
    width: number,
    trail: number,
    intensity: number,
    kind: number,
    life: number,
  ): void {
    let index = this.pool.alloc();
    if (index < 0) {
      // Recycle the tracer nearest the end of its flight.
      let best = 0;
      let bestDeath = Infinity;
      for (let i = 0; i < this.pool.count; i++) {
        if (this.death[i] < bestDeath) {
          bestDeath = this.death[i];
          best = i;
        }
      }
      index = best;
    }

    this.color.set(colorHex);
    const now = this.ctx.time.elapsed;
    const o = index * STRIDE;
    const a = this.data;
    a[o] = from.x;
    a[o + 1] = from.y;
    a[o + 2] = from.z;
    a[o + 3] = now;
    a[o + 4] = to.x;
    a[o + 5] = to.y;
    a[o + 6] = to.z;
    a[o + 7] = speed;
    a[o + 8] = this.color.r;
    a[o + 9] = this.color.g;
    a[o + 10] = this.color.b;
    a[o + 11] = width;
    a[o + 12] = trail;
    a[o + 13] = intensity;
    a[o + 14] = rng.next();
    a[o + 15] = kind;

    this.death[index] = now + life;
    if (index < this.dirtyMin) this.dirtyMin = index;
    if (index > this.dirtyMax) this.dirtyMax = index;
    this.spawned++;
  }

  /** Perpendicular distance from the camera to the tracer's flight path. */
  private distanceToSegment(from: THREE.Vector3, to: THREE.Vector3): number {
    const c = this.closest.copy(to).sub(from);
    const lengthSq = c.lengthSq();
    if (lengthSq < 1e-6) return this.cameraPosition.distanceTo(from);
    let t =
      ((this.cameraPosition.x - from.x) * c.x +
        (this.cameraPosition.y - from.y) * c.y +
        (this.cameraPosition.z - from.z) * c.z) /
      lengthSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    this.closest.copy(from).addScaledVector(c, t);
    return this.cameraPosition.distanceTo(this.closest);
  }

  update(time: number): void {
    const pool = this.pool;
    for (let i = pool.count - 1; i >= 0; i--) {
      if (this.death[i] > time) continue;
      const moved = pool.free(i);
      if (moved >= 0) {
        const dst = i * STRIDE;
        const src = moved * STRIDE;
        for (let k = 0; k < STRIDE; k++) this.data[dst + k] = this.data[src + k];
        this.death[i] = this.death[moved];
        if (i < this.dirtyMin) this.dirtyMin = i;
        if (i > this.dirtyMax) this.dirtyMax = i;
      }
    }

    this.material.uniforms.uTime.value = time;
    const camera = this.ctx.camera;
    const height = Math.max(1, this.ctx.size.height);
    this.material.uniforms.uPixelWidth.value =
      (2 * Math.tan((camera.fov * Math.PI) / 360)) / height;
    this.geometry.instanceCount = pool.count;
    this.mesh.visible = pool.count > 0;

    if (this.dirtyMax >= this.dirtyMin) {
      this.buffer.addUpdateRange(this.dirtyMin * STRIDE, (this.dirtyMax - this.dirtyMin + 1) * STRIDE);
      this.buffer.needsUpdate = true;
      this.dirtyMin = Infinity;
      this.dirtyMax = -Infinity;
    }
  }

  clear(): void {
    this.pool.clear();
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.ctx?.scene.remove(this.root);
    this.geometry.dispose();
    this.material.dispose();
  }
}
