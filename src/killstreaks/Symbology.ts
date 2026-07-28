import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import { SYMBOL_FRAG, SYMBOL_VERT } from '../shaders/killstreak/symbol.glsl';
import { headingToDir, headingToRight } from './Common';

/**
 * The tactical plan's symbology.
 *
 * The footprint tells the player where the bombs land. This tells them
 * everything else, and it is the difference between a targeting mode and a
 * debug marker: corner brackets that frame the box, a dashed run-in axis with
 * an arrowhead so the direction of the walk is unambiguous, a chevron on every
 * planned crater, a bearing ring graduated every fifteen degrees with a long
 * tick on the chosen heading, threat diamonds over the enemies standing inside
 * the box, and three seven-segment readouts giving the bearing, the count and
 * the seconds left.
 *
 * ## Why it is built every frame
 *
 * All of it is geometry rather than sprites or DOM, and all of it is rebuilt
 * from scratch into a preallocated buffer whenever the reticle moves. That
 * sounds wasteful and is not: the whole plan is around three hundred quads,
 * the rebuild is a few thousand float writes into a buffer that already
 * exists, and it buys symbology that is genuinely *in the world* — it sits on
 * the ground the strike will hit, tilts with the camera, and gets longer as
 * the run-in gets longer. A screen-space overlay cannot do the one thing this
 * view exists to communicate, which is direction.
 *
 * ## The readouts
 *
 * There is no font here and there does not need to be one. Seven-segment
 * numerals are seven rectangles, they are what the instrument they are
 * imitating would use, and drawing them out of the same ribbons as everything
 * else means they inherit the dash, the strobe and the glow for free.
 */

/** Quads the plan may draw. Around three hundred are used at full dress. */
const CAPACITY = 640;

/** Metres from the back of the box to the centre of the compass rose. */
const TAIL = 16;

/** Which of the seven segments each numeral lights, a..g as bits 0..6. */
const SEGMENTS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

/**
 * Segment layout in units of the digit box: [x0, y0, x1, y1], with the digit
 * one unit wide and two tall, origin at its bottom-left.
 */
const SEGMENT_LINES: Array<[number, number, number, number]> = [
  [0.12, 2.0, 0.88, 2.0], // a: top
  [1.0, 1.88, 1.0, 1.12], // b: upper right
  [1.0, 0.88, 1.0, 0.12], // c: lower right
  [0.12, 0.0, 0.88, 0.0], // d: bottom
  [0.0, 0.12, 0.0, 0.88], // e: lower left
  [0.0, 1.12, 0.0, 1.88], // f: upper left
  [0.12, 1.0, 0.88, 1.0], // g: middle
];

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _v = new THREE.Vector3();

export class TacticalSymbology {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly position: THREE.BufferAttribute;
  private readonly side: THREE.BufferAttribute;
  private readonly along: THREE.BufferAttribute;
  private readonly style: THREE.BufferAttribute;

  /** Quads written so far this rebuild. */
  private cursor = 0;
  /** Plan frame, refreshed by `begin`. */
  private readonly origin = new THREE.Vector3();
  private groundAt: (x: number, z: number) => number = () => 0;

  constructor(scene: THREE.Object3D) {
    const verts = CAPACITY * 4;
    this.geometry = new THREE.BufferGeometry();
    this.position = dynamic(new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    this.side = dynamic(new THREE.BufferAttribute(new Float32Array(verts), 1));
    this.along = dynamic(new THREE.BufferAttribute(new Float32Array(verts), 1));
    this.style = dynamic(new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('aSide', this.side);
    this.geometry.setAttribute('aAlong', this.along);
    this.geometry.setAttribute('aStyle', this.style);

    const indices = new Uint16Array(CAPACITY * 6);
    for (let i = 0; i < CAPACITY; i++) {
      const v = i * 4;
      const k = i * 6;
      indices[k] = v;
      indices[k + 1] = v + 1;
      indices[k + 2] = v + 2;
      indices[k + 3] = v;
      indices[k + 4] = v + 2;
      indices[k + 5] = v + 3;
    }
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.symbology',
      vertexShader: SYMBOL_VERT,
      fragmentShader: SYMBOL_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color(0.35, 1.0, 0.62) },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
        uValid: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      // Instrument, not world: a bracket hidden behind a wall is a bracket the
      // player cannot find.
      depthTest: false,
      side: THREE.DoubleSide,
      // Ordinary alpha, not additive — the strokes carry their own dark halo
      // and additive blending would throw it away.
      blending: THREE.NormalBlending,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.symbology';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 16;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /* ------------------------------ primitives ------------------------------ */

  /**
   * A straight ribbon in plan coordinates: `u` runs along the heading and `v`
   * across it, both in metres from the aim point.
   */
  private seg(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    width: number,
    dash: number,
    intensity: number,
  ): void {
    if (this.cursor >= CAPACITY) return;
    const du = u1 - u0;
    const dv = v1 - v0;
    const length = Math.hypot(du, dv);
    if (length < 1e-4) return;
    // Normal in plan space, scaled to half the ribbon width.
    const nu = (-dv / length) * width * 0.5;
    const nv = (du / length) * width * 0.5;

    const i = this.cursor++;
    const base = i * 4;
    const pos = this.position.array as Float32Array;
    const side = this.side.array as Float32Array;
    const along = this.along.array as Float32Array;
    const style = this.style.array as Float32Array;

    for (let c = 0; c < 4; c++) {
      // 0,1 at the start edge; 2,3 at the end. Sides alternate so the quad
      // winds correctly with the shared index buffer.
      const end = c >= 2 ? 1 : 0;
      const s = c === 0 || c === 3 ? -1 : 1;
      const u = (end ? u1 : u0) + nu * s;
      const v = (end ? v1 : v0) + nv * s;
      const x = this.origin.x + _fwd.x * u + _right.x * v;
      const z = this.origin.z + _fwd.z * u + _right.z * v;
      const k = (base + c) * 3;
      pos[k] = x;
      // Clear of the footprint, which is itself clear of the road.
      pos[k + 1] = this.groundAt(x, z) + 0.16;
      pos[k + 2] = z;
      side[base + c] = s;
      along[base + c] = end ? length : 0;
      style[(base + c) * 2] = dash;
      style[(base + c) * 2 + 1] = intensity;
    }
  }

  /** A polyline's worth of segments with the dash phase carried across joins. */
  private ring(
    cu: number,
    cv: number,
    radius: number,
    steps: number,
    width: number,
    dash: number,
    intensity: number,
  ): void {
    let pu = cu + radius;
    let pv = cv;
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const u = cu + Math.cos(a) * radius;
      const v = cv + Math.sin(a) * radius;
      this.seg(pu, pv, u, v, width, dash, intensity);
      pu = u;
      pv = v;
    }
  }

  /**
   * Right-aligned seven-segment numerals, laid on the ground.
   *
   * `uRight` is the downrange edge of the last digit, so numbers of different
   * widths stay aligned on the rule the readouts hang off. Digits read along
   * the run-in and stand up across it, which is the orientation they have when
   * the plan is viewed from behind the aircraft — the view the tactical camera
   * is deliberately placed in.
   */
  private number(
    value: number,
    uRight: number,
    v: number,
    height: number,
    digits: number,
    intensity: number,
  ): void {
    const scale = height * 0.5;
    const pitch = scale * 1.55;
    const stroke = Math.max(0.55, scale * 0.24);
    let n = Math.max(0, Math.min(Math.round(value), 10 ** digits - 1));
    for (let d = 0; d < digits; d++) {
      const mask = SEGMENTS[n % 10];
      n = Math.floor(n / 10);
      const du = uRight - d * pitch - scale;
      for (let s = 0; s < 7; s++) {
        if (!(mask & (1 << s))) continue;
        const [x0, y0, x1, y1] = SEGMENT_LINES[s];
        this.seg(du + x0 * scale, v + y0 * scale, du + x1 * scale, v + y1 * scale, stroke, 0, intensity);
      }
    }
  }

  /* -------------------------------- build --------------------------------- */

  /**
   * Rebuilds the whole plan.
   *
   * `craters` is where the stick will actually land, in metres along the
   * heading from the aim point — the same numbers the director will integrate
   * to — so the chevrons are a promise the strike keeps rather than an
   * illustration of one.
   */
  build(
    centre: THREE.Vector3,
    heading: number,
    halfLength: number,
    halfWidth: number,
    round: boolean,
    valid: boolean,
    time: number,
    opacity: number,
    craterSpacing: number,
    craterCount: number,
    enemies: readonly THREE.Vector3[],
    enemyCount: number,
    secondsLeft: number,
    groundAt: (x: number, z: number) => number,
  ): void {
    this.cursor = 0;
    this.origin.copy(centre);
    this.groundAt = groundAt;
    headingToDir(heading, _fwd);
    headingToRight(heading, _right);

    const span = Math.max(halfLength, halfWidth);
    // Stroke weight is nearly constant in metres rather than proportional to
    // the plan, because it is answering to the *camera*, which stands off at
    // roughly the same distance whatever is being aimed. A weight that scaled
    // with a carpet run's half-length drew lines eight pixels thick.
    const w = Math.max(1.5, span * 0.03);
    const dim = 0.62;

    // Only what is genuinely *about the ground* is drawn here. The bearing, the
    // hostile count and the clock used to be laid out on the street beside the
    // box in seven-segment numerals and they now live on the screen-space
    // panel, where they can be read: a number on the ground under an isometric
    // camera is a number seen at a sixty degree slant, and it rotated with the
    // run-in, and it was measured in metres so it changed size with the plan.
    this.brackets(halfLength, halfWidth, w);
    this.crosshair(w);
    if (round) this.ring(0, 0, halfLength, 56, w * 0.8, 4.5, dim + 0.2);
    else this.box(halfLength, halfWidth, w * 0.85, 4.5, dim + 0.2);
    this.axis(halfLength, w);
    this.craters(craterSpacing, craterCount, halfWidth, w);
    this.threats(enemies, enemyCount, w);
    void secondsLeft;
    void heading;

    this.position.needsUpdate = true;
    this.side.needsUpdate = true;
    this.along.needsUpdate = true;
    this.style.needsUpdate = true;
    this.geometry.setDrawRange(0, this.cursor * 6);

    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uOpacity.value = opacity;
    u.uValid.value = valid ? 1 : 0;
    (u.uColor.value as THREE.Color).setRGB(
      valid ? 0.32 : 1.0,
      valid ? 1.0 : 0.26,
      valid ? 0.6 : 0.22,
    );
    this.mesh.visible = opacity > 0.01 && this.cursor > 0;
  }

  /** Corner brackets: the single element that says "this is a targeting box". */
  private brackets(halfLength: number, halfWidth: number, w: number): void {
    const armU = Math.min(halfLength * 0.3, 9);
    const armV = Math.min(halfWidth * 0.55, armU);
    const pad = 1.6;
    const L = halfLength + pad;
    const W = halfWidth + pad;
    for (let i = 0; i < 4; i++) {
      const su = i < 2 ? 1 : -1;
      const sv = i % 2 === 0 ? 1 : -1;
      this.seg(su * L, sv * W, su * (L - armU), sv * W, w * 1.7, 0, 1);
      this.seg(su * L, sv * W, su * L, sv * (W - armV), w * 1.7, 0, 1);
    }
  }

  private crosshair(w: number): void {
    const gap = 1.6;
    const arm = 4.2;
    this.seg(gap, 0, gap + arm, 0, w, 0, 1);
    this.seg(-gap, 0, -gap - arm, 0, w, 0, 1);
    this.seg(0, gap, 0, gap + arm, w, 0, 1);
    this.seg(0, -gap, 0, -gap - arm, w, 0, 1);
    // A pip on the aim point itself, so the reticle has a centre.
    this.ring(0, 0, 0.9, 10, w * 0.9, 0, 1);
  }

  private box(
    halfLength: number,
    halfWidth: number,
    w: number,
    dash: number,
    intensity: number,
  ): void {
    this.seg(-halfLength, -halfWidth, halfLength, -halfWidth, w, dash, intensity);
    this.seg(halfLength, -halfWidth, halfLength, halfWidth, w, dash, intensity);
    this.seg(halfLength, halfWidth, -halfLength, halfWidth, w, dash, intensity);
    this.seg(-halfLength, halfWidth, -halfLength, -halfWidth, w, dash, intensity);
  }

  /**
   * The run-in axis.
   *
   * A dashed line from well behind the box to well beyond it, with an
   * arrowhead at the far end and a tail marker at the near one. This is the
   * element that makes the heading control mean something: rotate it and the
   * arrow swings, and the chevrons swing with it.
   */
  private axis(halfLength: number, w: number): void {
    const back = -(halfLength + TAIL);
    const front = halfLength + 15;
    this.seg(back, 0, front, 0, w * 0.7, 4, 0.8);

    const head = 5.5;
    this.seg(front, 0, front - head, head * 0.55, w * 1.7, 0, 1);
    this.seg(front, 0, front - head, -head * 0.55, w * 1.7, 0, 1);
  }

  /** A chevron on every planned crater, pointing downrange. */
  private craters(spacing: number, count: number, halfWidth: number, w: number): void {
    if (count < 2 || spacing <= 0) return;
    const back = ((count - 1) * spacing) / 2;
    const size = Math.min(spacing * 0.26, halfWidth * 0.55, 4.5);
    for (let i = 0; i < count; i++) {
      const u = -back + i * spacing;
      this.seg(u - size, -size, u, 0, w, 0, 0.95);
      this.seg(u - size, size, u, 0, w, 0, 0.95);
      // A ring on the crater itself marks where the fireball will stand.
      this.ring(u, 0, size * 0.55, 12, w * 0.8, 0, 0.7);
    }
  }

  /** A diamond over every hostile standing in the box. */
  private threats(enemies: readonly THREE.Vector3[], count: number, w: number): void {
    const n = Math.min(count, enemies.length, 16);
    for (let i = 0; i < n; i++) {
      _v.copy(enemies[i]).sub(this.origin);
      const u = _v.dot(_fwd);
      const v = _v.dot(_right);
      const s = 2.2;
      this.seg(u - s, v, u, v + s, w * 1.3, 0, 1);
      this.seg(u, v + s, u + s, v, w * 1.3, 0, 1);
      this.seg(u + s, v, u, v - s, w * 1.3, 0, 1);
      this.seg(u, v - s, u - s, v, w * 1.3, 0, 1);
    }
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

function dynamic(attr: THREE.BufferAttribute): THREE.BufferAttribute {
  attr.setUsage(THREE.DynamicDrawUsage);
  return attr;
}
