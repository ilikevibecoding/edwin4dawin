import * as THREE from 'three';
import type { PhysicsSystem } from '../physics/Physics';

/**
 * The shadow a low-flying aircraft throws across the ground.
 *
 * This is the cheapest scale cue in the whole event and, at the ranges an
 * airstrike happens over, the strongest one. A fast jet at 26 m is a dark
 * shape at the top of the frame for about a third of a second and the eye has
 * nothing to judge it against — the sky has no scale. Its shadow is on the
 * market floor, forty metres away, crossing paving the player is standing on
 * at 150 m/s, and *that* the eye can read instantly: it is a thing the size of
 * a house moving faster than anything the player has ever seen move.
 *
 * It is also the anticipation cue. The sun in this level is 26 degrees up, so
 * the shadow of an aeroplane runs about two metres ahead of it along the
 * ground for every metre of altitude — at 26 m that is fifty-three metres of
 * lead. The dark shape crosses the street before the aircraft does.
 *
 * Rendering constraints, both learned elsewhere in this directory and both
 * binding here. It cannot be a shadow-mapped caster: the cascades are sized
 * for a street and an object 300 m outside them either falls off the far
 * cascade or forces the whole map to cover a square kilometre. And it cannot
 * introduce a shader program, because under the software rasteriser used for
 * capture every new program costs tens of seconds to compile. So it is a
 * projected polygon on `MeshBasicMaterial` with per-vertex RGBA, which is the
 * same program `RibbonTrail` already compiles.
 *
 * Black at partial alpha over normal blending is not an approximation of a
 * shadow — in a linear HDR buffer it *is* one. Multiplying the radiance behind
 * it by `1 - alpha` is exactly what occluding a fraction of the sun's disc
 * does, which is why the shape sits down into the ground instead of floating
 * on it.
 */

/**
 * Half-planform of the airframe in metres, nose first, port side only; the
 * starboard side is mirrored. Traced off the geometry in `buildJet` so the
 * shadow is the shape of the aeroplane rather than a blob — the notch behind
 * the wing kink and the twin tails are what make it read as an aircraft in the
 * fifth of a second it is on screen.
 */
const PLANFORM: Array<[number, number]> = [
  [0.0, -8.4],
  [1.1, -5.4],
  [1.6, -1.4],
  [2.6, 0.2],
  [5.0, 2.6],
  [8.2, 4.2],
  [8.2, 5.1],
  [4.6, 5.0],
  [2.4, 4.6],
  [3.1, 6.4],
  [3.0, 7.0],
  [1.5, 6.2],
  [1.0, 7.4],
  [0.0, 7.6],
];

/** Rim vertices per shadow: the planform, mirrored, minus the shared spine. */
const RIM = PLANFORM.length * 2 - 2;
/** A centre vertex, a solid inner ring and a transparent outer ring. */
const VERTS = 1 + RIM * 2;
/** Inner ring as a fraction of the planform, so the falloff is a border. */
const CORE = 0.72;

interface Slot {
  active: boolean;
  /** Ground contact point. */
  readonly at: THREE.Vector3;
  /** Ground normal, so the shape lies on slopes and rooftops. */
  readonly normal: THREE.Vector3;
  heading: number;
  /** Penumbra growth: 1 at the deck, wider the higher the caster is. */
  spread: number;
  alpha: number;
  /** Eased surface height, and whether it has anything to ease from. */
  height: number;
  settled: boolean;
}

const DOWN = new THREE.Vector3(0, -1, 0);

export class JetShadows {
  readonly mesh: THREE.Mesh;

  private readonly slots: Slot[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshBasicMaterial;

  private readonly _v = new THREE.Vector3();
  private readonly _fwd = new THREE.Vector3();
  private readonly _side = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();

  constructor(count: number) {
    this.positions = new Float32Array(count * VERTS * 3);
    this.colors = new Float32Array(count * VERTS * 4);

    const index: number[] = [];
    for (let p = 0; p < count; p++) {
      const b = p * VERTS;
      const inner = b + 1;
      const outer = b + 1 + RIM;
      for (let i = 0; i < RIM; i++) {
        const j = (i + 1) % RIM;
        index.push(b, inner + i, inner + j);
        index.push(inner + i, outer + i, outer + j);
        index.push(inner + i, outer + j, inner + j);
      }
      this.slots.push({
        active: false,
        at: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 1, 0),
        heading: 0,
        spread: 1,
        alpha: 0,
        height: 0,
        settled: false,
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    // Under the dust and the trails, over the world. A shadow that draws on
    // top of the smoke standing in front of it is a decal, not a shadow.
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
  }

  clear(): void {
    this.reset();
    this.unsettle();
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  /**
   * Drops every slot. Call at the top of the frame: an aircraft that has left
   * the run stops calling `place`, and without this its shadow stays welded to
   * the last patch of street it crossed.
   */
  reset(): void {
    for (const s of this.slots) { s.active = false; s.alpha = 0; }
  }

  /** Forgets the eased surface height; call when a run ends. */
  private unsettle(): void {
    for (const s of this.slots) s.settled = false;
  }

  /**
   * Places one aircraft's shadow for this frame.
   *
   * `sun` points *at* the sun. The caster is projected down the light ray to
   * the ground plane and then traced onto whatever is actually there, so the
   * shape climbs a rooftop or a market awning rather than sinking through it.
   */
  place(
    slot: number,
    position: THREE.Vector3,
    heading: number,
    sun: THREE.Vector3,
    groundY: number,
    physics: PhysicsSystem,
    camera: THREE.Vector3,
  ): void {
    const s = this.slots[slot];
    s.active = false;

    const altitude = position.y - groundY;
    // A sun on the horizon throws a shadow at infinity, and a caster higher
    // than the level is tall throws one further away than the world exists.
    if (altitude <= 1 || sun.y < 0.12 || altitude > 150) { s.settled = false; return; }

    // Down the light ray to the nominal ground plane.
    const run = altitude / sun.y;
    this._v.copy(position).addScaledVector(sun, -run).setY(groundY + 12);

    // A shadow forty metres behind the player is not worth a trace, and the
    // projection can easily put one there — the run is twice the altitude at
    // this sun angle, so the shape leads the aeroplane by a long way.
    if (this._v.distanceToSquared(camera) > 300 * 300) { s.settled = false; return; }

    const hit = physics.trace(this._v, DOWN, 60);
    if (hit.hit) {
      s.at.copy(hit.point);
      s.normal.copy(hit.normal);
      // Nearly-vertical faces get the shape laid flat instead; a silhouette
      // stretched down a wall by a grazing normal is a smear, not a shadow.
      if (s.normal.y < 0.35) s.normal.set(0, 1, 0);
    } else {
      s.at.copy(this._v).setY(groundY);
      s.normal.set(0, 1, 0);
    }
    // Ease onto a new surface height instead of snapping to it.
    //
    // The trace is a single ray, so a shadow crossing a market awning steps
    // three metres up in one frame and three back down two frames later — and
    // three metres at forty is a hundred pixels, so the shape reads as
    // teleporting rather than as climbing anything. Measured over the run-in
    // it did that six times. A shadow genuinely does jump surfaces at its
    // edges, but the *whole shape* does not jump at once, and easing is a
    // truer approximation of that than either alternative available here.
    // Reset rather than eased when the shape has been away, or the first
    // frame of a run drags the ghost of the last one across the street.
    if (s.settled && Math.abs(s.at.y - s.height) > 0.05) {
      s.height = THREE.MathUtils.damp(s.height, s.at.y, 9, 1 / 60);
      s.at.y = s.height;
    } else {
      s.height = s.at.y;
      s.settled = true;
    }
    // Off the surface by enough to clear z-fighting at 300 m, along the
    // surface normal so it stays clear on a slope.
    s.at.addScaledVector(s.normal, 0.06);

    s.heading = heading;
    // The penumbra of a 0.53-degree sun grows about a centimetre per metre of
    // separation, so a shadow at 100 m is a metre soft at the edge — the shape
    // is still crisp, and it should stay crisp. What is exaggerated slightly
    // is the *fade*: a hard black aeroplane sliding across the street from a
    // caster the player cannot yet see reads as a bug, so it comes up over the
    // last eighty metres of descent.
    // Grows with height. A real penumbra at sixty metres is about half a metre
    // and would not be worth modelling; this is deliberately several times
    // that, and it is the one liberty taken in the file. The shape at cruise
    // altitude is a hundred and seventy metres up the street and thirty pixels
    // across, which is the size at which a silhouette stops being a silhouette
    // and becomes a speck — and it is the only thing in the world, at that
    // moment, saying an aeroplane is coming. Half again is enough to keep the
    // planform readable and small enough that nobody reads it as a mistake.
    s.spread = 1 + altitude * 0.008;
    // Darker, and holding its density higher up the descent.
    //
    // The reason is that this is the *only* cue in the event that arrives
    // before the aeroplane does. The airframe is a hundred pixels of grey at
    // the top of a bright sky for a fifth of a second; the shadow is on paving
    // the player is standing on, forty metres away, and it gets there first.
    // Sizing it to be tasteful at cruise altitude — which is where nobody can
    // see it anyway — cost it exactly the range where it does the work.
    s.alpha = 0.74 * (1 - THREE.MathUtils.smoothstep(altitude, 40, 140))
      * THREE.MathUtils.clamp(sun.y * 2.4, 0, 1);
    s.active = s.alpha > 0.01;
  }

  /** Rebuilds the buffer. Call once per frame after every `place`. */
  commit(): void {
    let n = 0;
    for (const s of this.slots) {
      if (!s.active) continue;

      // Basis on the receiving surface. `_fwd` is the *reciprocal* of the
      // course, because the planform is authored nose-first in -Z to match the
      // model, so flipping the axis here is what puts the nose down-track
      // instead of behind the aircraft.
      this._up.copy(s.normal);
      this._fwd.set(-Math.sin(s.heading), 0, -Math.cos(s.heading));
      this._fwd.addScaledVector(this._up, -this._fwd.dot(this._up));
      if (this._fwd.lengthSq() < 1e-4) this._fwd.set(0, 0, -1);
      this._fwd.normalize();
      this._side.crossVectors(this._fwd, this._up).normalize();

      const base = n * VERTS;
      const write = (v: number, x: number, z: number, a: number): void => {
        const o3 = (base + v) * 3;
        this.positions[o3] = s.at.x + this._side.x * x + this._fwd.x * z;
        this.positions[o3 + 1] = s.at.y + this._side.y * x + this._fwd.y * z;
        this.positions[o3 + 2] = s.at.z + this._side.z * x + this._fwd.z * z;
        const o4 = (base + v) * 4;
        this.colors[o4] = 0.02;
        this.colors[o4 + 1] = 0.022;
        this.colors[o4 + 2] = 0.028;
        this.colors[o4 + 3] = a;
      };

      write(0, 0, 0, s.alpha);
      const k = s.spread;
      for (let i = 0; i < RIM; i++) {
        // Walk the planform down the port side and back up the starboard.
        const port = i < PLANFORM.length;
        const p = PLANFORM[port ? i : RIM - i];
        const sx = (port ? -1 : 1) * p[0] * k;
        // The model's nose is -Z and the fan is built in the same sense, so
        // the planform's own coordinates go straight in.
        const sz = p[1] * k;
        write(1 + i, sx * CORE, sz * CORE, s.alpha);
        write(1 + RIM + i, sx, sz, 0);
      }
      n++;
    }

    if (n === 0) {
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, n * RIM * 9);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
