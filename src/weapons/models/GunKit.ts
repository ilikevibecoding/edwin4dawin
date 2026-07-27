import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { MaterialLibrary } from '../../render/textures/MaterialLibrary';

/**
 * GunKit — a library of reusable procedural firearm parts.
 *
 * The individual weapons are compositions of these builders rather than walls
 * of vertex math. Everything is authored in metres in a shared local frame:
 *
 *   -Z = forward (muzzle),  +X = right,  +Y = up.
 *
 * Geometries and any materials the kit creates are registered for disposal;
 * base materials borrowed from the {@link MaterialLibrary} are shared and are
 * NOT disposed here.
 *
 * Nothing built here casts shadows — the viewmodel scene must stay out of the
 * shadow map (see ViewModelPass).
 */

export type PartMaterial =
  | 'steel'
  | 'gunmetal'
  | 'black'
  | 'polymer_grey'
  | 'fde'
  | 'alu'
  | 'wood'
  | 'rubber'
  | 'glove'
  | 'brass';

/** Attachment points + animated parts a weapon exposes to the animator. */
export interface WeaponModel {
  id: string;
  group: THREE.Group;
  /** Muzzle tip; -Z is the bore direction. Flash/tracer origin. */
  muzzle: THREE.Object3D;
  /** The point that must sit at screen centre when fully aimed. */
  sightPoint: THREE.Object3D;
  /** Local eye-relief distance from camera when aimed (m). */
  adsDepth: number;
  /** Reciprocating charging handle / bolt carrier (moves +Z on fire). */
  charging?: THREE.Object3D;
  chargingTravel?: number;
  /** Pistol slide / shotgun forend / sniper bolt body. */
  action?: THREE.Object3D;
  actionTravel?: number;
  /** Ejection port cover that flips open while cycling. */
  ejectionPort?: THREE.Object3D;
  /** Trigger, rotates on pull. */
  trigger?: THREE.Object3D;
  /** Bolt handle to rotate up for the sniper. */
  boltHandle?: THREE.Object3D;
  /** Detachable magazine, hidden + dropped during a reload. */
  mag?: THREE.Object3D;
  /** Where the firing hand grips (pistol grip top). */
  gripRear: THREE.Object3D;
  /** Where the support hand grips (handguard / forend). */
  gripFront: THREE.Object3D;
  /** Emitter for ejected casings. */
  ejectPoint: THREE.Object3D;
  /** Optional muzzle flash scale hint. */
  flashScale: number;
}

const noShadows = (o: THREE.Object3D) => {
  o.castShadow = false;
  o.receiveShadow = false;
};

export class GunKit {
  private geoms = new Set<THREE.BufferGeometry>();
  private mats = new Set<THREE.Material>();
  private palette = new Map<PartMaterial, THREE.Material>();

  constructor(private lib: MaterialLibrary | null) {}

  // -------------------------------------------------------------------------
  // Materials
  // -------------------------------------------------------------------------

  mat(kind: PartMaterial): THREE.Material {
    const cached = this.palette.get(kind);
    if (cached) return cached;
    const m = this.buildMaterial(kind);
    this.palette.set(kind, m);
    return m;
  }

  private buildMaterial(kind: PartMaterial): THREE.Material {
    // Start from a library PBR material where possible so the metal picks up
    // the correct maps + env reflections, then tune colour/roughness.
    const fromLib = (name: string, tune: Partial<THREE.MeshStandardMaterial>) => {
      let base: THREE.MeshStandardMaterial;
      if (this.lib) {
        base = (this.lib.get(name as never) as THREE.MeshStandardMaterial).clone();
      } else {
        base = new THREE.MeshStandardMaterial();
      }
      Object.assign(base, tune);
      // Metal parts read as metal (high metalness) so the PBR maps + sky env
      // give form; value/contrast comes from albedo + baked AO, not flat colour.
      base.userData.gunPart = true;
      this.mats.add(base);
      return base;
    };
    const custom = (m: THREE.MeshStandardMaterial) => {
      m.userData.gunPart = true;
      this.mats.add(m);
      return m;
    };

    switch (kind) {
      // --- Metals: keep metalness high, let roughness + AO do the work. ---
      case 'steel':
        return fromLib('metal_brushed', {
          color: new THREE.Color(0x41464c),
          metalness: 1.0,
          roughness: 0.44,
          envMapIntensity: 1.0,
        });
      case 'gunmetal': // main receiver / upper — dark anodised metal
        return fromLib('gun_metal', {
          color: new THREE.Color(0x30353c),
          metalness: 1.0,
          roughness: 0.5,
          envMapIntensity: 1.2,
        });
      case 'black': // rails / handguard shrouds — matte black metal
        return fromLib('gun_metal', {
          color: new THREE.Color(0x17191d),
          metalness: 0.85,
          roughness: 0.6,
          envMapIntensity: 0.7,
        });
      case 'alu':
        return fromLib('metal_brushed', {
          color: new THREE.Color(0x7a7f86),
          metalness: 1.0,
          roughness: 0.34,
          envMapIntensity: 1.15,
        });
      // --- Polymers: dielectric, dead-matte, distinctly darker than metal. ---
      case 'polymer_grey': // grips / stock / mag
        return fromLib('gun_polymer', {
          color: new THREE.Color(0x1a1c20),
          metalness: 0.0,
          roughness: 0.9,
          envMapIntensity: 0.3,
        });
      case 'fde': // flat-dark-earth accent for value contrast
        return fromLib('gun_polymer', {
          color: new THREE.Color(0x8a7150),
          metalness: 0.0,
          roughness: 0.84,
          envMapIntensity: 0.35,
        });
      case 'wood':
        return fromLib('wood_plank', {
          color: new THREE.Color(0x6d4a2a),
          metalness: 0,
          roughness: 0.55,
          envMapIntensity: 0.5,
        });
      case 'rubber':
        return custom(new THREE.MeshStandardMaterial({
          color: 0x0e0f11,
          metalness: 0,
          roughness: 0.96,
          envMapIntensity: 0.25,
        }));
      case 'glove': // tactical glove — dark olive, faint sheen so it reads fabric
        return custom(new THREE.MeshStandardMaterial({
          color: 0x34362a,
          metalness: 0.0,
          roughness: 0.82,
          envMapIntensity: 0.3,
        }));
      case 'brass':
        return custom(new THREE.MeshStandardMaterial({
          color: 0xb98a2e,
          metalness: 1,
          roughness: 0.3,
        }));
    }
  }

  /** Tinted, semi-transparent optic glass. */
  glassMaterial(tint = 0x223b2a, opacity = 0.32): THREE.Material {
    const m = new THREE.MeshPhysicalMaterial({
      color: tint,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.6,
      transparent: true,
      opacity,
      envMapIntensity: 2.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mats.add(m);
    return m;
  }

  /** Additive emissive material for reticles / glowing dots. */
  reticleMaterial(color = 0xff2a2a): THREE.Material {
    const m = new THREE.MeshBasicMaterial({
      color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mats.add(m);
    return m;
  }

  private track<T extends THREE.BufferGeometry>(g: T): T {
    this.geoms.add(g);
    return g;
  }

  // -------------------------------------------------------------------------
  // Primitive builders
  // -------------------------------------------------------------------------

  /** Chamfered/rounded box. `bevel` is the corner radius in metres. */
  box(
    w: number,
    h: number,
    d: number,
    kind: PartMaterial | THREE.Material,
    bevel = 0.004
  ): THREE.Mesh {
    const r = Math.max(0, Math.min(bevel, Math.min(w, h, d) * 0.49));
    const g =
      r > 0.0005
        ? new RoundedBoxGeometry(w, h, d, 2, r)
        : new THREE.BoxGeometry(w, h, d);
    this.track(g);
    const mesh = new THREE.Mesh(g, this.resolve(kind));
    noShadows(mesh);
    return mesh;
  }

  /** Cylinder with its length along -Z (forward), back face at z=0. */
  tubeZ(
    rTop: number,
    rBot: number,
    len: number,
    kind: PartMaterial | THREE.Material,
    seg = 20,
    open = false
  ): THREE.Mesh {
    const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, open);
    g.rotateX(-Math.PI / 2); // +Y -> -Z
    g.translate(0, 0, -len / 2); // back face at z=0, extends to -len
    this.track(g);
    const mesh = new THREE.Mesh(g, this.resolve(kind));
    noShadows(mesh);
    return mesh;
  }

  /** Cylinder along Y (default), centred. */
  cylY(
    rTop: number,
    rBot: number,
    len: number,
    kind: PartMaterial | THREE.Material,
    seg = 16
  ): THREE.Mesh {
    const g = this.track(new THREE.CylinderGeometry(rTop, rBot, len, seg));
    const mesh = new THREE.Mesh(g, this.resolve(kind));
    noShadows(mesh);
    return mesh;
  }

  /** Lathe/revolve profile around the bore axis, extending along -Z. */
  latheZ(
    profile: THREE.Vector2[],
    kind: PartMaterial | THREE.Material,
    seg = 24
  ): THREE.Mesh {
    const g = new THREE.LatheGeometry(profile, seg);
    g.rotateX(-Math.PI / 2);
    this.track(g);
    const mesh = new THREE.Mesh(g, this.resolve(kind));
    noShadows(mesh);
    return mesh;
  }

  /**
   * Extrude a 2D silhouette (points in the X-Y plane) to a thickness along Z,
   * centred on Z. Good for receivers, grips, mag bodies, rail cross-sections.
   */
  extrude(
    pts: [number, number][],
    thickness: number,
    kind: PartMaterial | THREE.Material,
    bevel = 0.002
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      steps: 1,
    });
    g.translate(0, 0, -thickness / 2);
    this.track(g);
    const mesh = new THREE.Mesh(g, this.resolve(kind));
    noShadows(mesh);
    return mesh;
  }

  private resolve(kind: PartMaterial | THREE.Material): THREE.Material {
    return typeof kind === 'string' ? this.mat(kind) : kind;
  }

  // -------------------------------------------------------------------------
  // Composite gun parts
  // -------------------------------------------------------------------------

  /**
   * Picatinny rail: a base bar with the repeating slotted cross-section along
   * its length. Instantly reads as "real gun".
   */
  picatinnyRail(length: number, width = 0.021, kind: PartMaterial = 'black'): THREE.Group {
    const g = new THREE.Group();
    const baseH = 0.006;
    const base = this.box(width, baseH, length, kind, 0.001);
    base.position.y = baseH / 2;
    g.add(base);

    // Repeating raised ribs with grooves cut between them.
    const ribH = 0.006;
    const pitch = 0.0111; // ~ MIL-STD-1913 slot spacing
    const ribW = 0.0065;
    const topW = width * 0.86;
    const n = Math.max(3, Math.floor(length / pitch));
    const start = -length / 2 + pitch * 0.5;
    for (let i = 0; i < n; i++) {
      const rib = this.box(topW, ribH, ribW, kind, 0.0012);
      rib.position.set(0, baseH + ribH / 2, start + i * pitch);
      g.add(rib);
    }
    // Angled sides to complete the T-profile look.
    return g;
  }

  /** A curved detachable magazine with floorplate + witness holes. */
  magazine(rounds: 30 | 20 | 15 | 100, kind: PartMaterial = 'polymer_grey'): THREE.Group {
    const g = new THREE.Group();
    const width = 0.024;
    const depth = 0.03;
    const len = rounds >= 100 ? 0.12 : rounds >= 30 ? 0.19 : rounds >= 20 ? 0.15 : 0.11;

    if (rounds >= 100) {
      // Box mag: big rectangular body.
      const body = this.box(0.12, 0.11, 0.14, kind, 0.006);
      body.position.y = -0.055;
      g.add(body);
      const lid = this.box(0.122, 0.02, 0.142, 'black', 0.004);
      lid.position.y = -0.002;
      g.add(lid);
      return g;
    }

    // Two-segment curved body: upper straight, lower angled forward.
    const upper = this.box(width, len * 0.55, depth, kind, 0.005);
    upper.position.set(0, -len * 0.27, 0);
    g.add(upper);
    const lower = this.box(width, len * 0.5, depth, kind, 0.005);
    lower.position.set(0, -len * 0.72, -depth * 0.28);
    lower.rotation.x = 0.34; // curve toward the front
    g.add(lower);

    // Floorplate.
    const plate = this.box(width + 0.004, 0.014, depth + 0.006, 'black', 0.003);
    plate.position.set(0, -len - 0.002, -depth * 0.5);
    plate.rotation.x = 0.34;
    g.add(plate);

    // Witness holes down the spine.
    const holeMat = this.mat('black');
    for (let i = 0; i < 4; i++) {
      const hole = this.box(0.004, 0.006, 0.003, holeMat, 0);
      hole.position.set(width * 0.5, -len * 0.35 - i * 0.03, depth * 0.5 - 0.002 - i * 0.006);
      g.add(hole);
    }
    // Feed lips at the top.
    const lips = this.box(width * 0.8, 0.01, depth * 0.7, 'gunmetal', 0.002);
    lips.position.y = 0.006;
    g.add(lips);
    return g;
  }

  /** Pistol grip with finger grooves + a stippled feel (matte polymer). */
  pistolGrip(kind: PartMaterial = 'polymer_grey', angle = 0.28, len = 0.11): THREE.Group {
    const g = new THREE.Group();
    const body = this.box(0.03, len, 0.036, kind, 0.008);
    body.position.y = -len / 2;
    body.rotation.x = angle;
    g.add(body);
    // Finger grooves on the front strap.
    for (let i = 0; i < 3; i++) {
      const groove = this.box(0.032, 0.006, 0.006, 'black', 0.002);
      const t = -0.028 - i * 0.024;
      groove.position.set(0, t, 0.02 + Math.sin(angle) * -t * 0.4);
      groove.rotation.x = angle;
      g.add(groove);
    }
    // Beavertail / backstrap flare.
    const back = this.box(0.028, 0.03, 0.02, kind, 0.006);
    back.position.set(0, -0.01, -0.02);
    back.rotation.x = angle;
    g.add(back);
    return g;
  }

  /** Collapsible stock: buffer tube + sliding butt with adjustment holes. */
  collapsibleStock(kind: PartMaterial = 'polymer_grey'): THREE.Group {
    const g = new THREE.Group();
    const tube = this.tubeZ(0.014, 0.014, 0.2, 'gunmetal', 16);
    tube.position.z = 0.2;
    g.add(tube);
    // Adjustment holes along the underside of the tube.
    const holeMat = this.mat('black');
    for (let i = 0; i < 5; i++) {
      const hole = this.box(0.004, 0.004, 0.006, holeMat, 0);
      hole.position.set(0, -0.014, 0.06 + i * 0.028);
      g.add(hole);
    }
    // Sliding butt piece.
    const butt = this.box(0.05, 0.09, 0.05, kind, 0.008);
    butt.position.set(0, -0.01, 0.28);
    g.add(butt);
    const pad = this.box(0.052, 0.092, 0.016, 'rubber', 0.006);
    pad.position.set(0, -0.01, 0.312);
    g.add(pad);
    // Cheek weld top.
    const cheek = this.box(0.03, 0.02, 0.1, kind, 0.006);
    cheek.position.set(0, 0.045, 0.24);
    g.add(cheek);
    return g;
  }

  /** Fixed rifle stock (for the LMG / classic look). */
  fixedStock(kind: PartMaterial = 'polymer_grey', len = 0.26): THREE.Group {
    const g = new THREE.Group();
    const body = this.extrude(
      [
        [-0.02, 0.05],
        [len, 0.055],
        [len, -0.06],
        [0.02, -0.045],
        [-0.02, 0.0],
      ],
      0.05,
      kind,
      0.004
    );
    body.rotation.y = Math.PI / 2; // silhouette X -> forward/back
    g.add(body);
    const pad = this.box(0.05, 0.11, 0.016, 'rubber', 0.006);
    pad.position.z = len - 0.02;
    g.add(pad);
    return g;
  }

  /** Red-dot / holographic optic: housing, tinted glass, glowing reticle. */
  redDot(kind: PartMaterial = 'black', dotColor = 0xff2a2a): THREE.Group {
    const g = new THREE.Group();
    // Windowed housing (holo-style frame).
    const frameW = 0.05;
    const frameH = 0.044;
    const base = this.box(0.05, 0.014, 0.06, kind, 0.003);
    base.position.y = -0.005;
    g.add(base);
    // Two upright hood walls + a top bar → open window.
    const left = this.box(0.006, frameH, 0.05, kind, 0.002);
    left.position.set(-frameW / 2 + 0.003, 0.02, 0);
    g.add(left);
    const right = this.box(0.006, frameH, 0.05, kind, 0.002);
    right.position.set(frameW / 2 - 0.003, 0.02, 0);
    g.add(right);
    const top = this.box(frameW, 0.006, 0.05, kind, 0.002);
    top.position.set(0, 0.04, 0);
    g.add(top);
    const front = this.box(frameW, frameH, 0.006, kind, 0.002);
    front.position.set(0, 0.02, -0.024);
    g.add(front);

    // Tinted glass across the window (faces the shooter).
    const glass = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(frameW - 0.01, frameH - 0.01)),
      this.glassMaterial(0x0a1a12, 0.28)
    );
    glass.position.set(0, 0.02, -0.006);
    noShadows(glass);
    g.add(glass);

    // Glowing reticle dot (additive, visible on bright + dark).
    const dot = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(0.0016, 12)),
      this.reticleMaterial(dotColor)
    );
    dot.position.set(0, 0.02, -0.005);
    noShadows(dot);
    g.add(dot);
    const glow = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(0.004, 16)),
      this.reticleMaterial(dotColor)
    );
    (glow.material as THREE.Material).opacity = 0.25;
    glow.position.set(0, 0.02, -0.0051);
    noShadows(glow);
    g.add(glow);

    // Elevation/windage turrets.
    const t1 = this.cylY(0.006, 0.006, 0.01, kind);
    t1.position.set(0, 0.03, 0.02);
    g.add(t1);
    return g;
  }

  /** Magnified scope: tube, rings, turrets, eyepiece + reticle glass. */
  scope(length = 0.24, kind: PartMaterial = 'black', reticleColor = 0x111111): THREE.Group {
    const g = new THREE.Group();
    const bodyR = 0.019;
    const body = this.tubeZ(bodyR, bodyR, length, 'gunmetal', 24);
    body.position.z = length / 2;
    g.add(body);
    // Objective bell (front) and eyepiece (rear) flares.
    const bell = this.tubeZ(0.026, bodyR, 0.05, 'gunmetal', 24);
    bell.position.z = -length / 2 - 0.02;
    g.add(bell);
    const eye = this.tubeZ(0.024, bodyR, 0.045, kind, 24);
    eye.position.z = length / 2 + 0.02;
    g.add(eye);
    // Mount rings.
    for (const z of [-length * 0.28, length * 0.28]) {
      const ring = this.cylY(0.023, 0.023, 0.012, kind);
      ring.position.set(0, -0.006, z);
      g.add(ring);
      const foot = this.box(0.03, 0.014, 0.016, kind, 0.002);
      foot.position.set(0, -0.02, z);
      g.add(foot);
    }
    // Turrets.
    const elev = this.cylY(0.011, 0.011, 0.016, kind);
    elev.position.set(0, 0.024, 0);
    g.add(elev);
    const wind = this.tubeZ(0.011, 0.011, 0.016, kind, 16);
    wind.rotation.z = Math.PI / 2;
    wind.position.set(0.024, 0, 0);
    g.add(wind);

    // Ocular glass + crosshair reticle (thin dark lines + centre dot).
    const glass = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(bodyR - 0.001, 24)),
      this.glassMaterial(0x10161c, 0.4)
    );
    glass.position.z = length + 0.0;
    glass.rotation.y = Math.PI;
    noShadows(glass);
    g.add(glass);
    const cross = this.buildCrosshair(bodyR - 0.002, reticleColor);
    cross.position.z = length - 0.001;
    g.add(cross);
    return g;
  }

  private buildCrosshair(r: number, color: number): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide });
    this.mats.add(mat);
    const t = r * 0.03;
    const v = new THREE.Mesh(this.track(new THREE.PlaneGeometry(t, r * 2)), mat);
    noShadows(v);
    g.add(v);
    const h = new THREE.Mesh(this.track(new THREE.PlaneGeometry(r * 2, t)), mat);
    noShadows(h);
    g.add(h);
    return g;
  }

  /** Iron sights: returns { group, front, rear } with a shared aim line. */
  ironSights(kind: PartMaterial = 'gunmetal'): {
    group: THREE.Group;
    front: THREE.Group;
    rear: THREE.Group;
    height: number;
  } {
    const height = 0.03;
    const group = new THREE.Group();

    // Rear aperture with two protective wings.
    const rear = new THREE.Group();
    const aperture = this.tubeZ(0.006, 0.006, 0.006, kind, 16, true);
    aperture.position.y = height;
    rear.add(aperture);
    for (const s of [-1, 1]) {
      const wing = this.box(0.004, 0.016, 0.006, kind, 0.001);
      wing.position.set(s * 0.009, height, 0);
      rear.add(wing);
    }
    const rearBase = this.box(0.024, 0.008, 0.014, kind, 0.002);
    rearBase.position.y = height - 0.012;
    rear.add(rearBase);
    group.add(rear);

    // Front post with protective ears.
    const front = new THREE.Group();
    const post = this.box(0.003, 0.02, 0.003, kind, 0);
    post.position.y = height;
    front.add(post);
    for (const s of [-1, 1]) {
      const ear = this.box(0.003, 0.024, 0.004, kind, 0.001);
      ear.position.set(s * 0.011, height + 0.002, 0);
      front.add(ear);
    }
    const frontBase = this.box(0.024, 0.01, 0.02, kind, 0.002);
    frontBase.position.y = height - 0.014;
    front.add(frontBase);
    group.add(front);

    return { group, front, rear, height };
  }

  /** Flash hider / muzzle brake with ports. */
  muzzleDevice(caliberR = 0.011, kind: PartMaterial = 'gunmetal'): THREE.Group {
    const g = new THREE.Group();
    const body = this.tubeZ(caliberR + 0.004, caliberR + 0.004, 0.05, kind, 18);
    body.position.z = -0.025;
    g.add(body);
    // Slots / ports cut around the body.
    const slotMat = this.mat('black');
    for (let i = 0; i < 3; i++) {
      const slot = this.box(0.006, caliberR * 2.4, 0.006, slotMat, 0);
      slot.position.set(0, 0, -0.012 - i * 0.012);
      g.add(slot);
    }
    // Crown / bore hole.
    const bore = this.tubeZ(caliberR, caliberR, 0.008, 'black', 14, true);
    bore.position.z = -0.05;
    g.add(bore);
    return g;
  }

  /** Trigger + trigger guard. Returns { group, trigger }. */
  triggerGroup(kind: PartMaterial = 'gunmetal'): { group: THREE.Group; trigger: THREE.Object3D } {
    const g = new THREE.Group();
    // Guard: a loop from thin boxes.
    const front = this.box(0.006, 0.03, 0.006, kind, 0.002);
    front.position.set(0, -0.02, -0.028);
    g.add(front);
    const bottom = this.box(0.006, 0.006, 0.044, kind, 0.002);
    bottom.position.set(0, -0.034, -0.008);
    g.add(bottom);
    const back = this.box(0.006, 0.022, 0.006, kind, 0.002);
    back.position.set(0, -0.024, 0.012);
    g.add(back);
    // Trigger blade (pivots at top).
    const trigger = new THREE.Group();
    const blade = this.box(0.005, 0.018, 0.006, 'black', 0.001);
    blade.position.set(0, -0.009, -0.006);
    trigger.add(blade);
    trigger.position.set(0, -0.006, -0.01);
    g.add(trigger);
    return { group: g, trigger };
  }

  /** Small detail stud: screw head / pin / rivet. */
  screw(r = 0.003, kind: PartMaterial = 'steel'): THREE.Mesh {
    const m = this.cylY(r, r, 0.003, kind, 8);
    m.rotation.x = Math.PI / 2;
    return m;
  }

  /** A QD sling socket cup. */
  qdSocket(kind: PartMaterial = 'steel'): THREE.Mesh {
    const m = this.tubeZ(0.006, 0.006, 0.008, kind, 12, true);
    return m;
  }

  /** Sling loop. */
  slingLoop(kind: PartMaterial = 'gunmetal'): THREE.Mesh {
    const g = this.track(new THREE.TorusGeometry(0.008, 0.0016, 8, 16));
    const m = new THREE.Mesh(g, this.mat(kind));
    noShadows(m);
    return m;
  }

  dispose() {
    for (const g of this.geoms) g.dispose();
    for (const m of this.mats) m.dispose();
    this.geoms.clear();
    this.mats.clear();
    this.palette.clear();
  }
}
