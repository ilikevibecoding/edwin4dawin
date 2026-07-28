import * as THREE from 'three';

interface Puff {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  age: number;
  life: number;
  radius0: number;
  radius1: number;
  /** 0 dark smoke, 1 pale dust. Chooses the tint ramp. */
  pale: number;
  spin: number;
  peak: number;
  /** Seconds this puff stays lit from the inside by the fireball. 0 for none. */
  heat: number;
}

/** Options for one spawned puff. Positional arguments ran out of legibility. */
interface PuffSpec {
  radius0: number;
  radius1: number;
  pale: number;
  life: number;
  peak: number;
  heat?: number;
}

/** Rim segments per puff. Eight is round enough at any size that matters. */
const SEG = 8;
/** Vertices per puff: a centre plus two rings. */
const VERTS = 1 + SEG * 2;
/** Radius of the inner ring as a fraction of the puff radius. */
const INNER = 0.5;

/**
 * The dust and smoke a stick of bombs leaves standing in the street.
 *
 * This exists because the strike had no third act. The fireballs are gone
 * inside a second, and two seconds after the last detonation the town looked
 * exactly as it had before the aircraft arrived — which drains the event of
 * consequence more than any amount of missing flash. What sells 500 kg of
 * ordnance is not the bang, it is the column still standing over the target
 * twenty seconds later while the grit comes back down.
 *
 * There are no textures in this game, so a puff cannot be a textured billboard
 * and must not be a flat quad either — an untextured quad at uniform alpha is
 * a *visible rectangle*, and forty of them hanging over the target look like a
 * broken atlas rather than smoke. Each puff is therefore a small radial fan:
 * an opaque centre, a ring at half radius carrying most of the density, and an
 * outer ring at zero alpha, so the falloff is in the vertex colours and the
 * silhouette is a soft disc. The whole field is still one draw call and one
 * `MeshBasicMaterial`, which matters because a new shader program costs tens
 * of seconds to compile under the software rasteriser.
 */
export class DustField {
  readonly mesh: THREE.Mesh;

  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly puffs: Puff[] = [];
  /** Unit-circle lookup for the rim, built once. */
  private readonly rim: Array<[number, number]> = [];

  private readonly _right = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();
  private readonly _a = new THREE.Vector3();
  private readonly _b = new THREE.Vector3();
  /** Sun direction resolved into the view plane, for the cross-puff shading. */
  private sunX = 0.5;
  private sunY = 0.7;

  constructor(capacity = 200) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * VERTS * 3);
    this.colors = new Float32Array(capacity * VERTS * 4);

    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      this.rim.push([Math.cos(a), Math.sin(a)]);
    }

    const index: number[] = [];
    for (let p = 0; p < capacity; p++) {
      const b = p * VERTS;
      const inner = b + 1;
      const outer = b + 1 + SEG;
      for (let i = 0; i < SEG; i++) {
        const j = (i + 1) % SEG;
        index.push(b, inner + i, inner + j);
        index.push(inner + i, outer + i, outer + j);
        index.push(inner + i, outer + j, inner + j);
      }
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
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;

    for (let i = 0; i < capacity; i++) {
      this.puffs.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        life: 0,
        radius0: 1,
        radius1: 2,
        pale: 0,
        spin: 0,
        peak: 0.3,
        heat: 0,
      });
    }
  }

  clear(): void {
    for (const p of this.puffs) p.life = 0;
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  /**
   * A detonation's worth of dust: a fast dirty skirt along the ground and a
   * slower column climbing out of it.
   *
   * The skirt is what gives the blast a footprint the player can judge range
   * against; the column is what is still there when they look back.
   */
  burst(point: THREE.Vector3, scale = 1): void {
    // Skirt: pulverised street thrown outward along the ground. Pale, because
    // that is what the street is made of, and fast, because it is the part
    // that gives the blast a footprint the player can judge range against.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.8;
      const speed = (8 + Math.random() * 7) * scale;
      this.spawn(
        this._a.set(
          point.x + Math.cos(a) * 2.5 * scale,
          point.y + 1.2 + Math.random() * 1.4,
          point.z + Math.sin(a) * 2.5 * scale,
        ),
        this._b.set(Math.cos(a) * speed, 1.6 + Math.random() * 1.6, Math.sin(a) * speed),
        {
          radius0: 5 * scale, radius1: 14 * scale, pale: 0.95,
          life: 4.5 + Math.random() * 2.2, peak: 0.44 + Math.random() * 0.1,
          heat: i < 3 ? 0.4 : 0,
        },
      );
    }

    // Pall: the bank of dust that is simply *left*, hanging in the street at
    // head height with almost no vertical speed.
    //
    // This is the part of the aftermath the player is standing in, and it was
    // missing entirely. A column is a thing you look up at; a few seconds
    // after the last bang the player is looking straight ahead, and if
    // everything the strike produced has climbed forty metres into the sky
    // then what they see down the street is the town exactly as it was. The
    // pall barely moves, lives half a minute, and is the reason the target
    // area still looks bombed when they walk into it.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random();
      this.spawn(
        this._a.set(
          point.x + Math.cos(a) * (3 + Math.random() * 5) * scale,
          point.y + 2 + Math.random() * 5,
          point.z + Math.sin(a) * (3 + Math.random() * 5) * scale,
        ),
        this._b.set(Math.cos(a) * 1.6, 0.5 + Math.random() * 0.6, Math.sin(a) * 1.6),
        {
          radius0: 9 * scale, radius1: 21 * scale,
          pale: 0.62 + Math.random() * 0.3,
          life: 22 + Math.random() * 8, peak: 0.4 + Math.random() * 0.1,
        },
      );
    }

    // Column: each puff starts a little higher and climbs a little harder, so
    // the stack unrolls upward over the first few seconds and then stretches —
    // the top runs away while the seat of it stays over the crater, which is
    // the shape everyone has seen in gun-camera footage.
    //
    // The rise has to *arrest*. Given a constant buoyancy the whole column
    // simply left: by five seconds after the stick the lowest puff was thirty
    // five metres up, the target area was clear, and from eye level the only
    // evidence of a strike was a pale mass overhead that read as weather. Dust
    // is heavier than air. It goes up on the impulse of the burst, stalls, and
    // then hangs.
    //
    // The puffs have to start *large*. Sized to grow into each other they
    // spend the first few seconds as a dotted line of small discs climbing
    // away from the crater — a streak with gaps in it, which is what a lens
    // artefact looks like and not what a column looks like. Overlapping from
    // the first frame costs nothing and is the whole difference.
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      // Leans downwind as it climbs, and widens: a plumb-straight stack of
      // concentric discs is the other way this reads as a graphic.
      const spread = 3 + t * 8;
      this.spawn(
        this._a.set(
          point.x + (Math.random() - 0.5) * spread + t * t * 2.5,
          point.y + 2 + t * 17 * scale,
          point.z + (Math.random() - 0.5) * spread,
        ),
        // Barely any wind. Enough lean that the stack is not a plumb line of
        // concentric discs, and no more: at three times this the column sheared
        // clean off the crater inside four seconds and ended up hanging over
        // the next street, so the player looked at the place they had just
        // bombed and found it clear.
        this._b.set(
          (Math.random() - 0.5) * 1.5 + 0.45,
          (3 + t * 14) * scale,
          (Math.random() - 0.5) * 1.5,
        ),
        {
          radius0: (7 + t * 5) * scale,
          radius1: (16 + t * 12) * scale,
          // Sooty only right at the seat of the burst — and only just, because
          // the explosion VFX already puts a black core there and two dark
          // layers on the same crater read as a hole in the world.
          pale: THREE.MathUtils.clamp(0.35 + t * 1.4, 0, 1),
          life: 18 + t * 10 + Math.random() * 4,
          peak: 0.5 + Math.random() * 0.12,
          heat: t < 0.26 ? 0.5 : 0,
        },
      );
    }
  }

  private spawn(
    position: THREE.Vector3, velocity: THREE.Vector3, spec: PuffSpec,
  ): void {
    // Oldest-first eviction: a fresh column matters more than the tail of the
    // one before it, and the pool is sized so this only bites during a stick.
    let slot: Puff | null = null;
    let worst = -1;
    for (const p of this.puffs) {
      if (p.life <= 0) { slot = p; break; }
      const spent = p.age / p.life;
      if (spent > worst) { worst = spent; slot = p; }
    }
    if (!slot) return;
    slot.position.copy(position);
    slot.velocity.copy(velocity);
    slot.age = 0;
    slot.life = spec.life;
    slot.radius0 = spec.radius0;
    slot.radius1 = spec.radius1;
    slot.pale = spec.pale;
    slot.spin = Math.random() * Math.PI * 2;
    slot.peak = spec.peak;
    slot.heat = spec.heat ?? 0;
  }

  update(dt: number, camera: THREE.Camera, sun?: THREE.Vector3): void {
    this._right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this._up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    // Where the sun is, in the plane the puffs are billboarded into. Each puff
    // is shaded across that axis, which is the entire difference between a
    // disc of flat colour and something with a lit side and a shadow side.
    if (sun) {
      const sx = sun.dot(this._right);
      const sy = sun.dot(this._up);
      const len = Math.hypot(sx, sy);
      if (len > 1e-3) { this.sunX = sx / len; this.sunY = sy / len; }
    }

    let n = 0;
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.age += dt;
      if (p.age >= p.life) { p.life = 0; continue; }

      const t = p.age / p.life;
      // Drag: the skirt stops quickly, the column keeps drifting on the wind.
      const drag = Math.exp(-dt * 1.5);
      p.velocity.x *= drag;
      p.velocity.z *= drag;
      // The rise is an impulse that runs out, not a buoyancy that persists.
      // Total climb is roughly the launch speed over this rate, so the seat of
      // the column settles four metres up and the crown thirty — a stretched
      // stack standing on the crater rather than a mass drifting off it.
      p.velocity.y *= Math.exp(-dt * 0.8);
      p.position.addScaledVector(p.velocity, dt);
      if (p.position.y < 1) p.position.y = 1;

      const radius = THREE.MathUtils.lerp(p.radius0, p.radius1, Math.pow(t, 0.55));
      // Fast in, long slow out — dust hangs. The ramp-in is in seconds, not in
      // life fraction: a twenty-second column and a five-second skirt both
      // have to be there in the same half second, because they are both part
      // of one bang.
      const alpha = p.peak * Math.min(1, p.age * 2.4) * Math.pow(1 - t, 1.5);
      if (alpha < 0.004) continue;

      // Sooty brown through to grit, greying slightly as it thins so a
      // dissipating puff loses colour rather than simply losing opacity.
      // Sooty only right at the seat of the burst. Running the whole ramp dark
      // turned the target area into a row of black cauliflowers against a
      // sunlit desert; what a ground burst actually throws up is mostly the
      // street, and the street is pale.
      //
      // But it is *pale earth*, not white, and the pale end has to be pitched
      // below the sky it stands against. Set to the brightness of sunlit sand
      // it composited a shade lighter than the cloud deck behind it, and a
      // fifty-metre mass brighter than the sky and roughly the colour of the
      // sky is a cumulus, whatever shape it is in. The lit side comes from the
      // sun term below, which is what carries the highlight; the body colour
      // is the shadowed material, and shadowed dust is dark.
      const shade = 0.88 + t * 0.12;
      const cr0 = THREE.MathUtils.lerp(0.13, 0.50, p.pale) * shade;
      const cg0 = THREE.MathUtils.lerp(0.115, 0.40, p.pale) * shade;
      const cb0 = THREE.MathUtils.lerp(0.10, 0.28, p.pale) * shade;

      // For its first half second the seat of the burst is lit from inside.
      // Without this the transition from fireball to smoke is a hard cut: one
      // frame of orange, then a grey cloud that was apparently always grey.
      const glow = p.heat > 0 && p.age < p.heat
        ? Math.pow(1 - p.age / p.heat, 1.6)
        : 0;

      // Rolled about the view axis so a cluster does not read as a lattice of
      // identical discs.
      const cs = Math.cos(p.spin);
      const sn = Math.sin(p.spin);

      const base = n * VERTS;
      const write = (slot: number, ox: number, oy: number, a: number, lit: number): void => {
        const o3 = (base + slot) * 3;
        this.positions[o3] = p.position.x + this._right.x * ox + this._up.x * oy;
        this.positions[o3 + 1] = p.position.y + this._right.y * ox + this._up.y * oy;
        this.positions[o3 + 2] = p.position.z + this._right.z * ox + this._up.z * oy;
        const o4 = (base + slot) * 4;
        this.colors[o4] = THREE.MathUtils.lerp(cr0 * lit, 1.6, glow);
        this.colors[o4 + 1] = THREE.MathUtils.lerp(cg0 * lit, 0.62, glow);
        this.colors[o4 + 2] = THREE.MathUtils.lerp(cb0 * lit, 0.2, glow);
        this.colors[o4 + 3] = a;
      };

      write(0, 0, 0, alpha, 1);
      for (let i = 0; i < SEG; i++) {
        const [rx, ry] = this.rim[i];
        const dx = rx * cs - ry * sn;
        const dy = rx * sn + ry * cs;
        // Gouraud across the puff, keyed off the sun's screen bearing. Cheap,
        // and the only lighting a `MeshBasicMaterial` is ever going to get.
        const lit = 1 + (dx * this.sunX + dy * this.sunY) * 0.85;
        write(1 + i, dx * radius * INNER, dy * radius * INNER, alpha * 0.78, lit);
        write(1 + SEG + i, dx * radius, dy * radius, 0, lit);
      }

      n++;
      if (n >= this.capacity) break;
    }

    if (n === 0) {
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, n * SEG * 9);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
