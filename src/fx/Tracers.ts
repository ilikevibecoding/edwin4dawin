import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import { SoAPool } from '../core/ObjectPool';
import { rng } from '../core/MathUtils';

const STRIDE = 16;

/**
 * Radiance multiplier on a tracer's streak.
 *
 * A tracer element is a burning pyrotechnic and one of the brightest things in a
 * daylight frame, but the shader hands most of that back: a 3.5 cm streak held
 * open to its screen-space minimum is spread over several times its own width and
 * the energy compensation divides the coverage back down again. At unit intensity
 * a round crossing a street landed under the bright-pass threshold, which is part
 * of why thirteen rounds of rifle fire photographed as a pair of faint scratches
 * with no glow around them. Chosen so the head still clears that threshold at
 * forty-five metres after the division — worked through, the axis lands about a
 * fifth of a stop over, which is enough to bloom and not enough to bleach the
 * amber either side of it.
 */
const TRACER_INTENSITY = 3.2;

/**
 * How far back to date the round's departure, in seconds.
 *
 * The trigger breaks somewhere between two frames, never exactly on one, and a
 * tracer written with the current time has travelled nothing at all by the time
 * that same frame draws it: zero length, and a fade-in that is also zero. So the
 * frame which fires the shot draws no tracer, and at 820 m/s over forty-five
 * metres the whole flight is seventy-four milliseconds — four frames at 60 Hz,
 * of which the first shows nothing and the last is already fading. Dating the
 * departure back half a frame is both closer to the truth and worth a fifth of
 * the round's visible life.
 *
 * It also decides whether a tracer can be photographed at all. The screenshot
 * harness runs at about a frame a second and the engine clamps its delta to
 * 100 ms, so a round spawns and expires inside one simulation step: with no lead
 * the harness draws it at travel zero every single time, which is exactly the
 * "thirteen rounds fired, two faint scratches" the review saw. Eight
 * milliseconds puts the head six metres out and the fade two thirds open on the
 * spawn frame, so the shot that fires the round is also the shot that shows it.
 */
const DEPARTURE_LEAD = 0.008;

/**
 * Depths over which a muzzle is treated as the player's own weapon, in metres.
 *
 * The viewmodel lives inside the first metre; nothing else in the game emits a
 * tracer from that close to the eye, and the correction is ramped out rather
 * than switched off so a round fired by someone standing on top of the player
 * cannot jump.
 */
const PARALLAX_NEAR = 1.0;
const PARALLAX_FAR = 1.8;

/** Degrees to half-angle radians, for the field-of-view tangents. */
const DEG2HALFRAD = Math.PI / 360;

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

/**
 * Screen width a tracer is never allowed to fall below, in pixels.
 *
 * Sized against the bloom pass, not against legibility alone. That pass starts
 * by averaging four taps half a pixel apart, so a streak two pixels across is
 * averaged down below the bright-pass threshold before the chain has begun and
 * contributes no halo at all however much radiance it carries — which is why a
 * tracer with plenty of headroom still photographed as a bare scratch. Four
 * pixels leaves fully covered centres for the downsample to find.
 */
const float MIN_PIXELS = 4.2;
/**
 * Screen-space floor on the whole quad, so the glow has somewhere to live.
 *
 * The core and the halo were sharing a four-pixel quad, which meant the halo had
 * about one pixel either side of the core to fall off across and there was no
 * room for a glow at all. That is the whole of "no bloom": the bright pass
 * accumulates over area, and a line four pixels wide has almost none, so
 * whatever radiance the axis carried the halo it produced was a fraction of a
 * pixel wide and invisible. Widening the quad alone does not dim the round --
 * the energy division below is taken on the core's width, not the quad's -- so
 * this buys a real falloff for nothing.
 */
const float GLOW_PIXELS = 13.0;
/** Width, in pixels, at which the cross-section is worth resolving in full. */
const float SHARP_PIXELS = 9.0;

varying vec2 vUv;
varying vec4 vColor;
varying float vKind;
/** x: core's share of the quad. y: how well the core's own width is resolved. */
varying vec2 vProfile;

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
    vProfile = vec2(1.0);
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
  // Two widths: the hot line, and the quad that carries its glow.
  float core = max(aStyle.a, perPixel * MIN_PIXELS);
  float width = max(core, perPixel * GLOW_PIXELS);
  mv.xy += perp * (position.x * width);

  gl_Position = projectionMatrix * mv;

  // Fade in as the round leaves the muzzle and out as it reaches the target, so
  // a tracer never blinks out mid-air.
  float leave = clamp(travel / max(trail * 0.6, 1e-3), 0.0, 1.0);
  float arrive = 1.0 - clamp((travel - total) / max(trail, 1e-3), 0.0, 1.0);
  // Widening the streak to keep it on screen must not also make it brighter, or
  // distant fire glares. Compensating only partly is the honest answer: a very
  // bright sub-pixel line really does survive being spread over a pixel, just
  // dimmer than it was. Taken on the hot line's width and not the quad's: the
  // quad is wider only to give the glow room, and charging the round for that
  // width would dim the very thing the room was bought for.
  float widen = core / max(aStyle.a, 1e-5);
  vUv = vec2(position.x + 0.5, along);
  vColor = vec4(aStyle.rgb, aExtra.y * leave * arrive / pow(max(widen, 1.0), 0.45));
  vKind = aExtra.w;
  // How much cross-section the rasteriser can actually resolve, which is a
  // question about pixels and not about whether the width was floored. Keying
  // it to the floor instead makes the *near* streak the sharp one, and a needle
  // profile on a four-pixel quad is sampled nowhere near its axis — so the round
  // at five metres, the one round guaranteed to be on screen, came out as a pale
  // hairline while the hundred-metre round it was supposed to rescue was fine.
  vProfile = vec2(
    clamp(core / max(width, 1e-6), 0.05, 1.0),
    clamp((core / max(perPixel, 1e-6) - MIN_PIXELS) / (SHARP_PIXELS - MIN_PIXELS), 0.0, 1.0));
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec4 vColor;
varying float vKind;
varying vec2 vProfile;

void main() {
  float across = abs(vUv.x * 2.0 - 1.0);
  float edge = max(1.0 - across, 0.0);
  // The hot line occupies its own share of the quad and falls to nothing at the
  // edge of that share; the glow falls off across the whole quad. Separating the
  // two is what lets a round be a tight bright line *and* carry a halo: on one
  // shared four-pixel quad the second had nowhere to go.
  float inner = max(1.0 - across / vProfile.x, 0.0);
  // The cross-section flattens as the line is held open to its screen-space
  // minimum. At its authored width a tracer is a needle with a very tight core,
  // and that profile is correct while it is several pixels across — but once it
  // is down to two, no pixel centre lands near enough to the axis to sample the
  // core, and the round crossing a street at a hundred metres is drawn entirely
  // from the weak outer falloff. Which is to say: it vanishes.
  float core = pow(inner, mix(1.7, 7.0, vProfile.y));
  float halo = pow(edge, mix(2.4, 1.8, vProfile.y));
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

  // The authored round colour is not the colour that gets spent.
  //
  // Every weapon's tracer hex is a pale cream — 0xffc46a is (1.0, 0.55, 0.14)
  // once it is in linear space — and the composite pass desaturates in
  // proportion to how close to white a value lands, so a streak bright enough
  // for the bright pass to catch comes out of the tonemapper as a white scratch
  // with a cream tint. That is exactly what it looked like. The authored colour
  // instead picks a point on a deep amber ramp whose linear red/blue ratio is in
  // the tens, which is what survives being tonemapped as amber; a paler round
  // lands further up the ramp and stays paler than a heavy one.
  float warmth = clamp((vColor.g / max(vColor.r, 1e-4) - 0.35) / 0.55, 0.0, 1.0);
  vec3 amber = mix(vec3(1.0, 0.24, 0.030), vec3(1.0, 0.52, 0.115), warmth);
  // Amber and white are added, not blended, and that is the whole difference
  // between a hot round and a white scratch.
  //
  // Blending the two and scaling the result puts the white *into* the amber, so
  // the extra radiance that makes the core bloom lifts the blue channel of the
  // whole streak with it and the tonemapper hands back a pale cream line —
  // measured over a real streak, red/blue 1.64 against a linear 33 going in.
  // Keeping the white on a steep power of the *inner* profile confines it to the
  // axis, where the bright pass will find it, and leaves everything either side
  // purely amber: linear red over blue runs about nine one pixel out and is
  // still near three at four, where before there was no four to speak of.
  float burn = pow(core, mix(4.0, 2.5, vProfile.y));
  float lit = along * vColor.a;
  vec3 rgb = amber * ((halo * 3.2 + core * 2.6) * lit) + vec3(burn * lit * 6.0);
  if (max(rgb.r, max(rgb.g, rgb.b)) <= 0.002) discard;
  gl_FragColor = vec4(rgb, 0.0);
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
  private readonly origin = new THREE.Vector3();
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
    const start = this.viewmodelParallax(from);
    const distance = start.distanceTo(to);
    if (distance < 0.25) return;

    const trail = Math.min(Math.max(distance * 0.35, 3.5), 22);
    const life = (distance + trail) / Math.max(speed, 1);
    this.write(start, to, colorHex, speed, width, trail, TRACER_INTENSITY, 0, life);

    // A supersonic round passing close to the head drags a visible pressure
    // smear behind it. Cheap, and it sells the near miss.
    const camera = this.ctx.camera;
    camera.getWorldPosition(this.cameraPosition);
    if (speed > 300 && this.distanceToSegment(start, to) < 3.2) {
      this.write(start, to, 0xa8bcd8, speed, width * 7, trail * 1.5, 0.5, 1, life);
    }
  }

  /**
   * Move a first-person muzzle to where the player can see the barrel.
   *
   * The weapon is drawn in its own scene with its own camera at a narrower
   * field of view than the world's — 62 degrees against 80 — so the barrel tip
   * lands further out from the screen centre than the same point does when the
   * world camera projects it. The muzzle the weapon hands to combat is the true
   * world position of that anchor, so a tracer starting there leaves from
   * somewhere the barrel visibly is not: the viewmodel puts a hipfired carbine's
   * muzzle at (0.17, -0.43) NDC, the world camera projects the same point to
   * (0.12, -0.31), and at 1600x900 that is 39 px inboard and 55 px high — close
   * enough to the gun to look deliberate, far enough to read as a round coming
   * out of the player's chest.
   *
   * Scaling the view-space offset by the ratio of the two half-angle tangents
   * puts the origin exactly under the drawn muzzle, and costs the trajectory a
   * tenth of a degree over the length of a street. Only points close enough to
   * be the player's own weapon are moved; anything further away is drawn by the
   * world camera in the first place and is already where it belongs.
   */
  private viewmodelParallax(from: THREE.Vector3): THREE.Vector3 {
    const out = this.origin.copy(from);
    const camera = this.ctx.camera;
    const view = this.ctx.viewCamera;
    if (Math.abs(view.fov - camera.fov) < 0.05) return out;

    camera.updateMatrixWorld();
    camera.worldToLocal(out);
    const depth = -out.z;
    if (depth <= 0 || depth > PARALLAX_FAR) return out.copy(from);
    const fade =
      depth <= PARALLAX_NEAR
        ? 1
        : 1 - (depth - PARALLAX_NEAR) / (PARALLAX_FAR - PARALLAX_NEAR);
    const k = Math.tan(camera.fov * DEG2HALFRAD) / Math.tan(view.fov * DEG2HALFRAD);
    const scale = 1 + (k - 1) * fade;
    out.x *= scale;
    out.y *= scale;
    return camera.localToWorld(out);
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
    const now = this.ctx.time.elapsed - DEPARTURE_LEAD;
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
