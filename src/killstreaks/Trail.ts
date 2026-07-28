import * as THREE from 'three';

/**
 * World-space ribbon trail.
 *
 * Aircraft in this game are frequently behind a rooftop at the exact moment
 * the player looks for them, and a strike that leaves no evidence in the sky
 * reads as if nothing flew over. The trail is the persistence: it hangs in the
 * air for several seconds after the airframe has gone, drawing the attack axis
 * across the sky where the player can still read it.
 *
 * Deliberately built on `MeshBasicMaterial` with per-vertex RGBA rather than a
 * custom shader. Under the software rasteriser used for capture, every new
 * program costs tens of seconds to compile, and a ribbon needs nothing a
 * vertex colour cannot express.
 *
 * Three vertices to a rib, not two. A two-vertex ribbon is a constant-alpha
 * strip and therefore has *edges* — against a blue sky a seven-metre-wide one
 * came out as a length of pale grey pipe curving over the target, which is a
 * worse artefact than no trail at all. The third vertex puts the density in
 * the middle and zero at both edges, so the cross-section is a soft core that
 * fades into the sky the way condensation does.
 */
export class RibbonTrail {
  readonly mesh: THREE.Mesh;

  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshBasicMaterial;

  private readonly pts: THREE.Vector3[] = [];
  private readonly ages: number[] = [];
  private readonly widths: number[] = [];
  private readonly densities: number[] = [];

  /** Seconds a sample survives. */
  life = 5.0;
  /** Minimum emitter travel between samples, metres. */
  spacing = 6;
  /** Half-width of the ribbon at birth and at death, metres. */
  widthStart = 2.4;
  widthEnd = 11;
  opacity = 0.5;
  /**
   * Seconds a sample takes to reach full density.
   *
   * Short on purpose. This ramp exists only to detach the ribbon from the
   * nozzle; it must not be long enough to matter at range, because during the
   * run-in *the whole visible trail is young*. At half a second and 195 m/s the
   * ramp covered the first hundred metres behind the aircraft, which was the
   * entire ribbon at the moment the player was being told to look for it — the
   * cue that is supposed to carry the anticipation was fading itself in for
   * exactly as long as the anticipation lasted.
   */
  formTime = 0.14;
  /**
   * Density of newly emitted samples, 0..1, recorded per sample.
   *
   * Contrails are an altitude phenomenon; the same aeroplane that draws a hard
   * white line across a cold sky at 150 m leaves nothing at all down among the
   * rooftops. Driving this from altitude is what lets one ribbon do both jobs:
   * thick where it has to be seen from four hundred metres, and gone by the
   * overflight, where the airframe is doing the reading and a band of white
   * thirty pixels wide behind it would just be in the way.
   *
   * Stored per sample rather than applied globally so the trail keeps a memory
   * of the air it was laid in. Applied globally, the high part of the trail
   * would thin out as the aircraft descended, which reads as the sky forgetting
   * the aeroplane went past.
   */
  density = 1;
  readonly tint = new THREE.Color(0.86, 0.88, 0.92);

  private readonly _last = new THREE.Vector3(Infinity, Infinity, Infinity);
  private readonly _dir = new THREE.Vector3();
  private readonly _view = new THREE.Vector3();
  private readonly _side = new THREE.Vector3();

  constructor(capacity = 48) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3 * 3);
    this.colors = new Float32Array(capacity * 3 * 4);

    const index: number[] = [];
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 3;
      const b = a + 3;
      index.push(a, a + 1, b, a + 1, b + 1, b);
      index.push(a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
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
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
  }

  clear(): void {
    this.pts.length = 0;
    this.ages.length = 0;
    this.widths.length = 0;
    this._last.set(Infinity, Infinity, Infinity);
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  /**
   * @param emitting false once the aircraft has gone; existing samples keep
   *        ageing so the trail dissipates instead of vanishing.
   */
  update(dt: number, emitter: THREE.Vector3 | null, cameraPos: THREE.Vector3, emitting: boolean): void {
    for (let i = this.ages.length - 1; i >= 0; i--) {
      this.ages[i] += dt;
      if (this.ages[i] > this.life) {
        this.ages.splice(i, 1);
        this.pts.splice(i, 1);
        this.widths.splice(i, 1);
        this.densities.splice(i, 1);
      }
    }

    if (emitting && emitter && emitter.distanceToSquared(this._last) > this.spacing * this.spacing) {
      this._last.copy(emitter);
      this.pts.push(emitter.clone());
      this.ages.push(0);
      this.widths.push(1);
      this.densities.push(this.density);
      while (this.pts.length > this.capacity) {
        this.pts.shift();
        this.ages.shift();
        this.widths.shift();
        this.densities.shift();
      }
    }

    const n = this.pts.length;
    if (n < 2) {
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }

    for (let i = 0; i < n; i++) {
      const p = this.pts[i];
      const prev = this.pts[Math.max(0, i - 1)];
      const next = this.pts[Math.min(n - 1, i + 1)];
      this._dir.subVectors(next, prev);
      if (this._dir.lengthSq() < 1e-8) this._dir.set(0, 0, 1);
      this._view.subVectors(p, cameraPos);
      this._side.crossVectors(this._dir, this._view);
      if (this._side.lengthSq() < 1e-8) this._side.set(1, 0, 0);
      this._side.normalize();

      const t = Math.min(1, this.ages[i] / this.life);
      // Widen and fade with age: the plume diffuses rather than simply
      // disappearing, which is what stops it reading as a hard polygon strip.
      const w = THREE.MathUtils.lerp(this.widthStart, this.widthEnd, Math.pow(t, 0.65));
      // Head and tail both taper so the ribbon has no cut ends.
      const endFade = Math.min(1, (n - 1 - i) / 2) * Math.min(1, i / 1.5 + 0.35);
      // Condensation takes a moment to form. Without the ramp the ribbon is at
      // full density the instant it leaves the nozzle, so from below — where
      // the whole trail collapses onto a couple of pixels of screen width — it
      // reads as a hard white line ruled across the sky rather than as
      // something the aircraft is leaving behind it.
      const born = THREE.MathUtils.smoothstep(this.ages[i], 0.02, this.formTime);
      const a = this.opacity * Math.pow(1 - t, 1.35) * endFade * born * this.densities[i];
      if (a < 0.002) {
        // Collapse the rib onto the centreline. A zero-alpha rib at full width
        // still has to be rasterised, and at the overflight these are the ribs
        // covering half the screen.
        const o3z = i * 9;
        for (let k = 0; k < 3; k++) {
          this.positions[o3z + k * 3 + 0] = p.x;
          this.positions[o3z + k * 3 + 1] = p.y;
          this.positions[o3z + k * 3 + 2] = p.z;
        }
        const o4z = i * 12;
        for (let k = 0; k < 3; k++) this.colors[o4z + k * 4 + 3] = 0;
        continue;
      }

      const o3 = i * 9;
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * w;
        this.positions[o3 + k * 3 + 0] = p.x + this._side.x * off;
        this.positions[o3 + k * 3 + 1] = p.y + this._side.y * off;
        this.positions[o3 + k * 3 + 2] = p.z + this._side.z * off;
      }

      const o4 = i * 12;
      for (let k = 0; k < 3; k++) {
        this.colors[o4 + k * 4 + 0] = this.tint.r;
        this.colors[o4 + k * 4 + 1] = this.tint.g;
        this.colors[o4 + k * 4 + 2] = this.tint.b;
        this.colors[o4 + k * 4 + 3] = k === 1 ? a : 0;
      }
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 12);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
