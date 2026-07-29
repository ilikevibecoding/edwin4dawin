import * as THREE from 'three';
import type { IMaterialLibrary, MaterialName } from '../core/Interfaces';
import { B, BONES, BONE_COUNT, bindPos, createBones, inverseBinds } from './SoldierSkeleton';
import { MeshBuilder, bind1, bind2, bind3, type Binding, type Ring, type Warp } from './MeshBuilder';

/**
 * The soldier, authored in code.
 *
 * Everything is generated in bind space and skinned as it is generated, which
 * is the only way to keep a procedural character honest: a part that knows
 * which joint it belongs to cannot end up weighted to the wrong one, and the
 * blend across a joint is written where the two parts meet rather than
 * inferred afterwards from vertex distance. Auto-skinning by proximity is what
 * produces the collapsed shoulder and the pinched hip, and neither survives a
 * close-up.
 *
 * **A soldier is recognised by his outline.** At the twenty metres he is
 * usually seen from, the shading is a couple of tones and the texture is gone;
 * what is left is a shape against a wall. That is the whole reason this file is
 * as long as it is. An early version was a correct, well-shaded, well-skinned
 * figure that an art review called a shop dummy, and it was right: every
 * volume on it was smooth and convex, so the outline was an outline of a
 * mannequin. The fix is not better materials, it is kit — thirty-odd pouches,
 * straps, pads, cords and lumps that stand proud of the body and interrupt the
 * edge. Boxes are twelve triangles each, so the entire silhouette costs less
 * than one extra ring of tessellation on a thigh.
 *
 * The other half is that cloth is not shrink-wrapped. Real trousers bag at the
 * knee, blouse over the boot and crease behind it; a real shirt gathers where
 * the vest squashes it. None of that is a circular cross-section, which is why
 * `MeshBuilder` grew a warp: it spends the vertices a tube was going to cost
 * anyway on a section that is lumpy instead of round.
 *
 * Six variants exist so a squad is not eight copies of one man, differing in
 * headgear, vest, sleeve state, what is slung on the back, face covering,
 * palette, girth, height and how filthy they are.
 *
 * Three levels of detail are built per variant from the same code. `detail`
 * counts down: 2 builds everything, 1 keeps every volume that changes the
 * outline but drops fingers, laces, eyes, rails and cord, and 0 is the far
 * mesh — body, kit blocks and helmet only.
 */

/* ------------------------------ materials -------------------------------- */

export const MAT = { FABRIC: 0, HARD: 1, RUBBER: 2, SKIN: 3 } as const;
const MAT_COUNT = 4;

/** Where the muzzle sits relative to the weapon bone, in metres. */
export const MUZZLE_LOCAL = new THREE.Vector3(0, 0, 0.467);
/**
 * Grip points on the weapon, relative to the weapon bone.
 *
 * The support hand is on the back of the handguard rather than out at the front
 * of it. The handguard runs from 0.145 to 0.33, so either end is a grip a
 * shooter takes, but the arms have to reach both points at once: with the gun
 * shouldered where it now is, a hand at 0.28 asks the support arm for 62 cm of
 * a 59 cm reach and the IK gives up and leaves it short of the gun. At 0.235 the
 * arm runs to 94% — straight, which is what a support arm on a handguard is.
 */
export const GRIP_R = new THREE.Vector3(0, -0.075, -0.015);
export const GRIP_L = new THREE.Vector3(0, -0.015, 0.235);
/** Where a spent case leaves the receiver. */
export const EJECT_LOCAL = new THREE.Vector3(-0.03, 0.02, 0.06);

export interface VariantSpec {
  id: string;
  headgear: 'helmet' | 'cap' | 'wrap';
  vest: 'carrier' | 'rig';
  nvg: boolean;
  goggles: boolean;
  /** Rolled to above the elbow leaves a bare forearm and a thick cuff. */
  sleeves: 'down' | 'rolled';
  /** What is over the lower face, or a beard, or nothing. */
  face: 'none' | 'scarf' | 'balaclava' | 'beard';
  /** Radio pouch with a whip antenna high on the back of the vest. */
  radio: boolean;
  /** Hydration bladder behind the shoulder blades. */
  hydration: boolean;
  /** Headset with a boom mic, which reads hard against a lit background. */
  headset: boolean;
  /** Something long strapped diagonally across the back. */
  backLoad: 'none' | 'launcher' | 'bar' | 'shovel';
  /** Magazine pouches across the front of the vest. */
  mags: number;
  /** Knee pads worn or not; a man without them has a plainer leg. */
  kneePads: boolean;
  /** Multiplier on limb and torso girth, so builds differ. */
  girth: number;
  /** Uniform scale applied to the whole rig, for height variation. */
  height: number;
  /** How much dust this one has walked through, 0.4 to 1.3. */
  grime: number;
  palette: {
    uniform: number;
    uniformDark: number;
    vest: number;
    vestDark: number;
    webbing: number;
    pouch: number;
    skin: number;
    glove: number;
    boot: number;
    cover: number;
    scarf: number;
    gun: number;
    gunDark: number;
    pad: number;
  };
}

/**
 * The six of them.
 *
 * Values are deliberately darker and further apart than they look on the page.
 * The level is graded for a 6° sun on sand and lifts a mid tone by roughly a
 * factor of two, so an olive drab authored at the value real olive drab has
 * photographs as bone: the first pass of these men came out as one pale mass in
 * which the carrier, the shirt and the helmet were the same tone and the torso
 * read as a single volume. What matters is not the absolute value but the
 * spread — a carrier at forty percent of the shirt's luminance, near-black
 * webbing and pads, and pouches on a different hue from the plate bags they sit
 * on — because that spread is what survives the grade.
 */
export const VARIANTS: readonly VariantSpec[] = [
  {
    id: 'regular',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: false,
    goggles: true,
    sleeves: 'down',
    face: 'none',
    radio: true,
    hydration: false,
    headset: true,
    backLoad: 'none',
    mags: 3,
    kneePads: true,
    girth: 1,
    height: 1,
    grime: 0.85,
    palette: {
      uniform: 0x55503a,
      uniformDark: 0x3a3629,
      vest: 0x2f3227,
      vestDark: 0x1e201a,
      webbing: 0x25271f,
      pouch: 0x494432,
      skin: 0xa87a5c,
      glove: 0x2a2822,
      boot: 0x2c231c,
      cover: 0x4a4835,
      scarf: 0x6c6144,
      gun: 0x2c2e30,
      gunDark: 0x18191b,
      pad: 0x1c1d1a,
    },
  },
  {
    id: 'assaulter',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: true,
    goggles: false,
    sleeves: 'down',
    face: 'balaclava',
    radio: false,
    hydration: true,
    headset: true,
    backLoad: 'bar',
    mags: 4,
    kneePads: true,
    girth: 1.08,
    height: 1.03,
    grime: 0.55,
    palette: {
      uniform: 0x3e4239,
      uniformDark: 0x282b25,
      vest: 0x1e201c,
      vestDark: 0x131513,
      webbing: 0x1a1c18,
      pouch: 0x2e3129,
      skin: 0x9a6f4f,
      glove: 0x1b1a17,
      boot: 0x201c19,
      cover: 0x33372e,
      scarf: 0x2a2c26,
      gun: 0x242628,
      gunDark: 0x141517,
      pad: 0x151614,
    },
  },
  {
    id: 'grenadier',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: false,
    goggles: false,
    sleeves: 'rolled',
    face: 'beard',
    radio: true,
    hydration: true,
    headset: false,
    backLoad: 'none',
    mags: 4,
    kneePads: false,
    girth: 1.03,
    height: 0.995,
    grime: 1.15,
    palette: {
      uniform: 0x625737,
      uniformDark: 0x443c26,
      vest: 0x3c3122,
      vestDark: 0x261f16,
      webbing: 0x2b2418,
      pouch: 0x554728,
      skin: 0xb2895f,
      glove: 0x4a3d29,
      boot: 0x33281d,
      cover: 0x5a5033,
      scarf: 0x7a6c48,
      gun: 0x33322c,
      gunDark: 0x1d1c19,
      pad: 0x221e18,
    },
  },
  {
    id: 'marksman',
    headgear: 'cap',
    vest: 'rig',
    nvg: false,
    goggles: false,
    sleeves: 'rolled',
    face: 'scarf',
    radio: false,
    hydration: false,
    headset: true,
    backLoad: 'none',
    mags: 4,
    kneePads: false,
    girth: 0.93,
    height: 1.015,
    grime: 0.88,
    // Mismatched kit on purpose: a bleached shirt over a rig several shades
    // darker than it, because a man whose shirt, rig and pouches are all one
    // value is the flattest of the six however much noise is written over him.
    palette: {
      uniform: 0x565139,
      uniformDark: 0x333125,
      vest: 0x2b2820,
      vestDark: 0x1c1a15,
      webbing: 0x1e1a14,
      pouch: 0x4b4430,
      skin: 0x8a6244,
      glove: 0x3c3527,
      boot: 0x282018,
      cover: 0x4a4634,
      scarf: 0x6e6a49,
      gun: 0x2b2b26,
      gunDark: 0x191917,
      pad: 0x1d1c18,
    },
  },
  {
    id: 'irregular',
    headgear: 'wrap',
    vest: 'rig',
    nvg: false,
    goggles: false,
    sleeves: 'rolled',
    face: 'scarf',
    radio: false,
    hydration: false,
    headset: false,
    backLoad: 'launcher',
    mags: 4,
    kneePads: false,
    girth: 0.95,
    height: 0.972,
    grime: 1.3,
    palette: {
      uniform: 0x66593d,
      uniformDark: 0x483e29,
      vest: 0x40341f,
      vestDark: 0x281f13,
      webbing: 0x342a1a,
      pouch: 0x4e422c,
      skin: 0x7d5a40,
      glove: 0x5b4c34,
      boot: 0x2e2418,
      cover: 0x6f6446,
      scarf: 0x7d6f4a,
      gun: 0x39311f,
      gunDark: 0x1f1a11,
      pad: 0x261f16,
    },
  },
  {
    id: 'sapper',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: false,
    goggles: true,
    sleeves: 'down',
    face: 'scarf',
    radio: true,
    hydration: true,
    headset: false,
    backLoad: 'shovel',
    mags: 3,
    kneePads: true,
    girth: 1.06,
    height: 0.985,
    grime: 1.25,
    palette: {
      uniform: 0x474b3f,
      uniformDark: 0x30332b,
      vest: 0x2a2d26,
      vestDark: 0x1a1c18,
      webbing: 0x22241e,
      pouch: 0x3d4034,
      skin: 0x6f4a33,
      glove: 0x33362d,
      boot: 0x262019,
      cover: 0x3f4338,
      scarf: 0x585c46,
      gun: 0x2a2c2b,
      gunDark: 0x171818,
      pad: 0x1a1b18,
    },
  },
];

export interface LodSpec {
  /** Radial segments on a limb tube. */
  seg: number;
  /** Segments and stacks on an ellipsoid. */
  sphereSeg: number;
  sphereStack: number;
  /**
   * 2 near, 1 mid, 0 far. Level 1 keeps everything that changes the outline and
   * drops what only reads as texture; level 0 keeps only the volumes that are
   * still more than a pixel across at seventy metres.
   */
  detail: number;
}

const LOD0: LodSpec = { seg: 32, sphereSeg: 36, sphereStack: 20, detail: 2 };
const LOD1: LodSpec = { seg: 11, sphereSeg: 13, sphereStack: 8, detail: 1 };
const LOD2: LodSpec = { seg: 5, sphereSeg: 7, sphereStack: 4, detail: 0 };

/* -------------------------------- builder -------------------------------- */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const UP_Z = new THREE.Vector3(0, 0, 1);
const UP_Y = new THREE.Vector3(0, 1, 0);
/** The side axis, which is the hinge a knee or an elbow plate tilts about. */
const RIGHT_X = new THREE.Vector3(1, 0, 0);
const UP_X = new THREE.Vector3(1, 0, 0);

function jp(name: string, out = new THREE.Vector3()): THREE.Vector3 {
  return bindPos(B[name], out);
}

function lerpJ(a: string, b: string, t: number, out = new THREE.Vector3()): THREE.Vector3 {
  jp(a, out);
  jp(b, _v2);
  return out.lerp(_v2, t);
}

/**
 * The film the level leaves on everything standing in it.
 *
 * An earlier pass applied this as one flat amount over the whole man, which was
 * exactly wrong twice over: it collapsed the carrier, the shirt and the helmet
 * into one sand-coloured mass, and it put as much dust on his shoulders as on
 * his boots. Dust does not work like that. It climbs from the ground — heavy on
 * the welt and the toe cap, still obvious at the knee, a haze at the thigh, and
 * gone by the chest — and that gradient is one of the few things that says a
 * figure has been walking rather than standing on a turntable.
 */
const DUST = new THREE.Color(0xa49474);
/** Above this the film is gone; below it the amount climbs steeply. */
const DUST_TOP = 1.02;
const DUST_MAX = 0.32;
/** Oiled steel and skin shed dust; canvas and webbing hold it. */
const DUST_HARD = 0.16;

/**
 * Author-time value match against the level's grade.
 *
 * The palettes above are written as real pigment, and pigment is not what comes
 * out of the camera. Three captures of the same vantage, sampling the same
 * patch of thigh against the same patch of sunlit sand, bracket where it has to
 * land (all figures are sRGB luminance on 0-255):
 *
 * | palette          | thigh | carrier | sand |
 * | ---------------- | ----- | ------- | ---- |
 * | ungraded pigment |  138  |   128   | 173  |
 * | over-corrected   |   68  |    62   | 174  |
 * | here             |  ~110 |   ~78   | 173  |
 *
 * At 138 the uniform is within a quarter-stop of the ground it is standing on
 * and the man photographs as a bone mannequin; at 68 he is the value of his own
 * cast shadow and the kit that took all this geometry is a black cut-out. What
 * is wanted is a figure that sits clearly under the sand and clearly over the
 * shadows, with the carrier a further half-stop under the shirt so the torso
 * does not read as one volume — which is roughly what a man in olive drab does
 * on a sand street in the morning.
 *
 * The exposure is not far off correct for cloth, so these numbers are close to
 * one; the point of keeping them is that they are the single place to turn if
 * the level's grade moves again, and the table above says which way.
 */
const GRADE_CLOTH = 1;
const GRADE_SKIN = 0.86;

/** Scales an sRGB hex by eye-value, which is what the grade needs. */
function dim(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

/**
 * Brings a palette to the level's exposure.
 *
 * Not one factor for everything. The shirt and the helmet cover want the
 * pigment they were authored with; the carrier wants to go under it rather than
 * with it, because a vest at the shirt's value welds the two into one torso;
 * and skin is the one thing on the man the grade genuinely does overshoot,
 * because a face is the brightest surface in the frame after the sand and
 * clips into the sun's own colour if it is left alone.
 */
function graded(p: VariantSpec['palette']): VariantSpec['palette'] {
  return {
    uniform: dim(p.uniform, GRADE_CLOTH),
    uniformDark: dim(p.uniformDark, GRADE_CLOTH),
    vest: dim(p.vest, 0.9),
    vestDark: dim(p.vestDark, 0.95),
    webbing: dim(p.webbing, 0.95),
    pouch: dim(p.pouch, GRADE_CLOTH),
    skin: dim(p.skin, GRADE_SKIN),
    glove: dim(p.glove, 0.95),
    boot: dim(p.boot, 1),
    cover: dim(p.cover, GRADE_CLOTH),
    scarf: dim(p.scarf, GRADE_CLOTH),
    gun: dim(p.gun, 1),
    gunDark: dim(p.gunDark, 1),
    pad: dim(p.pad, 1),
  };
}

function col(hex: number, jitter = 0): THREE.Color {
  const c = new THREE.Color(hex);
  if (jitter !== 0) {
    const f = 1 + jitter;
    c.multiplyScalar(f);
  }
  return c;
}

function saturate(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function quatX(radians: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(_e.set(radians, 0, 0));
}

function quatXZ(x: number, z: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(_e.set(x, 0, z));
}

class SoldierBuilder {
  private mb: MeshBuilder;
  private p: VariantSpec['palette'];
  private g: number;
  /** Deterministic stream, so a variant is byte-identical every boot. */
  private seed: number;
  /** Vertices the cavity pass darkened, so the pass can be seen to have fired. */
  occluded = 0;

  constructor(
    private spec: VariantSpec,
    private lod: LodSpec,
  ) {
    this.mb = new MeshBuilder(MAT_COUNT);
    this.mb.tile = 0.5;
    this.p = graded(spec.palette);
    this.g = spec.girth;
    let h = 0;
    for (let i = 0; i < spec.id.length; i++) h = (h * 31 + spec.id.charCodeAt(i)) | 0;
    this.seed = ((h >>> 8) & 0xffff) / 65535;
    this.mb.mottleSeed = this.seed * 7.3;
    // Cloth carries most of the break-up, oiled steel almost none. The measured
    // effect on a finished variant is a fabric albedo standard deviation around
    // eighteen on 0-255, against the six the review called flat.
    this.mb.mottle[MAT.FABRIC] = 0.22;
    this.mb.mottle[MAT.HARD] = 0.06;
    this.mb.mottle[MAT.RUBBER] = 0.11;
    this.mb.mottle[MAT.SKIN] = 0.045;
  }

  private get fine(): boolean {
    return this.lod.detail >= 2;
  }

  private get kit(): boolean {
    return this.lod.detail >= 1;
  }

  build(): { geometry: THREE.BufferGeometry; triangles: number; occluded: number } {
    this.legs('L');
    this.legs('R');
    this.boots('L');
    this.boots('R');
    this.hips();
    this.torso();
    this.vest();
    this.backLoad();
    this.arm('L');
    this.arm('R');
    this.hand('L');
    this.hand('R');
    this.neckAndHead();
    this.headgear();
    this.rifle();
    this.occluded = this.mb.occlude(this.cavities());
    return {
      geometry: this.mb.build(`soldier_${this.spec.id}_lod${2 - this.lod.detail}`),
      triangles: this.mb.triangleCount,
      occluded: this.occluded,
    };
  }

  /**
   * Where this figure is in its own shadow.
   *
   * Named by hand because the geometry cannot answer it: the armpit is the gap
   * between two convex volumes and neither of them is concave, so nothing that
   * looks at one surface at a time will ever find it. Every one of these is a
   * place the review pointed at.
   */
  private cavities(): ReadonlyArray<{
    a: THREE.Vector3;
    b: THREE.Vector3;
    radius: number;
    strength: number;
    pinch?: boolean;
  }> {
    const g = this.g;
    const out: {
      a: THREE.Vector3;
      b: THREE.Vector3;
      radius: number;
      strength: number;
      pinch?: boolean;
    }[] = [];
    // Under the chin and behind the jaw, which is what separates a head from a
    // collar. Strong: a jaw with no shadow under it is a mask on a stick.
    out.push({
      a: new THREE.Vector3(-0.05, 1.53, 0.03),
      b: new THREE.Vector3(0.05, 1.53, 0.03),
      radius: 0.075,
      strength: 0.4,
    });
    // The lip of the carrier, front and back, where the plate bag stands off the
    // shirt. One-sided, so it darkens the shirt under the lip and not the belt.
    for (const z of [0.125 * g, -0.125 * g]) {
      out.push({
        a: new THREE.Vector3(-0.15 * g, 1.075, z),
        b: new THREE.Vector3(0.15 * g, 1.075, z),
        radius: 0.07,
        strength: 0.34,
        pinch: true,
      });
    }
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      // Armpit: from the side of the chest out under the deltoid. The single
      // thing the review named for the arm not separating from the torso.
      out.push({
        a: new THREE.Vector3(sx * 0.12 * g, 1.335, 0.005),
        b: new THREE.Vector3(sx * 0.185 * g, 1.305, 0.005),
        radius: 0.085,
        strength: 0.42,
      });
      // Crook of the elbow and the back of the knee, both of which close up on a
      // man holding a rifle or taking a step.
      const elbow = jp(`fore${side}`);
      out.push({
        a: elbow.clone().add(new THREE.Vector3(0, 0, 0.03)),
        b: elbow.clone().add(new THREE.Vector3(0, 0, 0.06)),
        radius: 0.062,
        strength: 0.3,
      });
      lerpJ(`thigh${side}`, `calf${side}`, 1, _v);
      out.push({
        a: _v.clone().add(new THREE.Vector3(0, 0.01, -0.05)),
        b: _v.clone().add(new THREE.Vector3(0, -0.01, -0.085)),
        radius: 0.07,
        strength: 0.34,
      });
      // Where the boot's collar meets the bloused trouser.
      out.push({
        a: new THREE.Vector3(sx * 0.1, 0.175, 0.0),
        b: new THREE.Vector3(sx * 0.1, 0.175, 0.05),
        radius: 0.075,
        strength: 0.3,
        pinch: true,
      });
    }
    // The groin, and under the belt at the small of the back.
    out.push({
      a: new THREE.Vector3(-0.045, 0.9, 0.04),
      b: new THREE.Vector3(0.045, 0.9, 0.04),
      radius: 0.075,
      strength: 0.28,
    });
    return out;
  }

  /* -------------------------------- wear -------------------------------- */

  /**
   * A colour with the dust film this height off the ground, plus whatever extra
   * a part has earned by being the part that takes the knocks.
   */
  private soil(hex: number, y: number, extra = 0): THREE.Color {
    const t = saturate((DUST_TOP - y) / DUST_TOP);
    const amount = this.spec.grime * (DUST_MAX * t * t * t + 0.02) + extra * 0.4;
    return new THREE.Color(hex).lerp(DUST, Math.min(0.3, amount));
  }

  /** Oiled or hard surfaces take a fraction of the film cloth does. */
  private soilHard(hex: number, y: number, extra = 0): THREE.Color {
    const t = saturate((DUST_TOP - y) / DUST_TOP);
    return new THREE.Color(hex).lerp(
      DUST,
      Math.min(0.2, this.spec.grime * DUST_HARD * t * t + extra * 0.3),
    );
  }

  /** Sweat and shadow: cloth that is compressed or damp goes down in value. */
  private damp(hex: number, amount: number): THREE.Color {
    return new THREE.Color(hex).multiplyScalar(1 - amount);
  }

  /**
   * Abrasion on a hard-wearing surface, which goes the other way — the nap is
   * rubbed off a carrier's edges and they come up lighter and greyer than the
   * panel. The vest has to wear differently from the shirt or both read as one
   * garment cut from one bolt.
   */
  private scuff(hex: number, amount: number): THREE.Color {
    return new THREE.Color(hex).lerp(new THREE.Color(0x9b9584), amount);
  }

  /* -------------------------------- warps ------------------------------- */

  /**
   * A lumpy cross-section. Two lobes at different frequencies, drifting along
   * the sweep so no two rings are the same shape, phase-locked to a seed so a
   * given part is the same every boot.
   */
  private lump(amp: number, tag: number, freq = 3): Warp {
    const p1 = (this.seed + tag) * 5.31;
    const p2 = (this.seed + tag) * 11.7 + 1.1;
    return (a, t) =>
      1 +
      amp *
        (Math.sin(freq * a + p1 + t * 1.9) * 0.62 +
          Math.sin((freq + 2) * a + p2 - t * 2.7) * 0.38);
  }

  /**
   * Cloth that hangs. `dir` is the angle it bags towards in the ring's own
   * frame, and the fabric is pulled tight a quarter turn either side of it, so
   * the section comes out as a teardrop rather than an ellipse — which is what a
   * trouser leg with a loaded cargo pocket on it actually is.
   */
  private bag(amp: number, dir: number, tag: number): Warp {
    const l = this.lump(amp * 0.4, tag, 4);
    return (a, t) => l(a, t) + amp * Math.cos(a - dir) * (0.45 + 0.55 * t);
  }

  /**
   * Creases running round a limb rather than up it.
   *
   * Everything above varies the section by angle, which makes a limb lumpy in
   * cross-section but still perfectly smooth along its length — and the review's
   * complaint was cloth that is shrink-wrapped, which is exactly what a smooth
   * sweep is. Real trousers gather into a few deep folds across the thigh and a
   * dense band of them behind the knee, and those creases catch the sun along one
   * edge and shade the other. `cycles` is how many go round the limb over its
   * whole length, and the crease drifts a little with angle so it is not a
   * machined groove; the tube sweeper leans the normal back over each one.
   *
   * Costs nothing per triangle, but it needs rings to live on: a fold between two
   * rings 20 cm apart is a bevel, so the parts that use this carry more sections
   * than a smooth tube would need.
   */
  private crease(amp: number, cycles: number, tag: number): Warp {
    const ph = (this.seed + tag) * 9.17;
    return (a, t) =>
      1 +
      amp *
        (Math.sin(t * cycles * Math.PI * 2 + ph + 0.55 * Math.cos(a * 2 + ph)) * 0.7 +
          Math.sin(t * cycles * Math.PI * 3.7 + ph * 1.7 + Math.sin(a * 3)) * 0.3);
  }

  /** Two warps at once, which is how a bagged trouser leg with folds in it is. */
  private both(a: Warp, b: Warp): Warp {
    return (ang, t) => a(ang, t) * b(ang, t);
  }


  /* --------------------------------- legs ------------------------------- */

  private legs(side: 'L' | 'R'): void {
    const hip = jp(`thigh${side}`);
    const knee = jp(`calf${side}`);
    const ankle = jp(`foot${side}`);
    const g = this.g;
    const sx = side === 'L' ? 1 : -1;
    const out = side === 'L' ? 0 : Math.PI;
    const thighBone = B[`thigh${side}`];
    const calfBone = B[`calf${side}`];
    const footBone = B[`foot${side}`];
    const cloth = (t: number, extra = 0): THREE.Color =>
      this.soil(this.p.uniform, THREE.MathUtils.lerp(hip.y, knee.y, t), extra);

    // Trousers, with the radius rising again below the knee rather than tapering
    // all the way down. A monotonic taper from hip to ankle is a leg on a
    // mannequin; combat trousers are cut full, bunch behind the knee and are
    // gathered into the boot, and the profile has to say so.
    /*
     * Sections are close together for a reason that is not the profile. The
     * crease warp puts folds across the leg, and a fold has to have rings either
     * side of it to be a fold rather than a bevel — the profile below could be
     * drawn with five rings and the folds would come out as three flat facets.
     * At LOD0 that is 64 triangles a ring, and the whole extra set costs about
     * 1,500 across the four limb tubes, which is nothing against what it buys.
     */
    const thighRings: Ring[] = [
      this.ring(hip, knee, -0.06, 0.107 * g, 0.111 * g, bind2(thighBone, 0.6, B.pelvis, 0.4), this.damp(this.p.uniform, 0.12)),
      this.ring(hip, knee, 0.06, 0.105 * g, 0.11 * g, bind1(thighBone), cloth(0.06)),
      this.ring(hip, knee, 0.18, 0.101 * g, 0.106 * g, bind1(thighBone), cloth(0.18)),
      this.ring(hip, knee, 0.3, 0.097 * g, 0.102 * g, bind1(thighBone), cloth(0.3)),
      this.ring(hip, knee, 0.42, 0.094 * g, 0.099 * g, bind1(thighBone), cloth(0.42)),
      this.ring(hip, knee, 0.54, 0.0905 * g, 0.0955 * g, bind1(thighBone), cloth(0.54)),
      // Slack above the knee, then tight across it.
      this.ring(hip, knee, 0.66, 0.089 * g, 0.094 * g, bind1(thighBone), cloth(0.66)),
      this.ring(hip, knee, 0.76, 0.0875 * g, 0.0925 * g, bind1(thighBone), cloth(0.76)),
      this.ring(hip, knee, 0.86, 0.079 * g, 0.083 * g, bind2(thighBone, 0.7, calfBone, 0.3), cloth(0.86, 0.05)),
      this.ring(hip, knee, 0.94, 0.076 * g, 0.08 * g, bind2(thighBone, 0.55, calfBone, 0.45), cloth(0.94, 0.07)),
    ];
    this.mb.tube(
      MAT.FABRIC,
      thighRings,
      this.lod.seg,
      UP_Z,
      true,
      false,
      this.both(this.bag(0.1, out, 1 + sx), this.crease(0.05, 4, 21 + sx)),
    );

    const calfRings: Ring[] = [
      this.ring(knee, ankle, 0.02, 0.076 * g, 0.08 * g, bind2(calfBone, 0.6, thighBone, 0.4), cloth(1, 0.07)),
      // Calf muscle, then the cloth falling away from it.
      this.ring(knee, ankle, 0.13, 0.0765 * g, 0.082 * g, bind1(calfBone), this.soil(this.p.uniform, 0.44)),
      this.ring(knee, ankle, 0.24, 0.077 * g, 0.084 * g, bind1(calfBone), this.soil(this.p.uniform, 0.39)),
      this.ring(knee, ankle, 0.34, 0.0735 * g, 0.0795 * g, bind1(calfBone), this.soil(this.p.uniform, 0.35)),
      this.ring(knee, ankle, 0.44, 0.07 * g, 0.075 * g, bind1(calfBone), this.soil(this.p.uniform, 0.31)),
      this.ring(knee, ankle, 0.54, 0.0655 * g, 0.0695 * g, bind1(calfBone), this.soil(this.p.uniform, 0.27)),
      this.ring(knee, ankle, 0.64, 0.061 * g, 0.064 * g, bind1(calfBone), this.soil(this.p.uniform, 0.24)),
      this.ring(knee, ankle, 0.72, 0.0595 * g, 0.0625 * g, bind2(calfBone, 0.92, footBone, 0.08), this.soil(this.p.uniform, 0.2)),
      // Bloused over the boot: the trouser is gathered by a tie and the cloth
      // above it swells over the top of the collar. This flare, and the shadow
      // under it, is most of what separates a soldier's leg from a trouser leg,
      // so it goes out to 8 cm — a good centimetre over the boot's own collar —
      // with a hard step back at the tie rather than a taper.
      this.ring(knee, ankle, 0.795, 0.0575 * g, 0.0605 * g, bind2(calfBone, 0.85, footBone, 0.15), this.soil(this.p.uniform, 0.17)),
      this.ring(knee, ankle, 0.85, 0.076 * g, 0.078 * g, bind2(calfBone, 0.78, footBone, 0.22), this.soil(this.p.uniform, 0.15)),
      this.ring(knee, ankle, 0.905, 0.08 * g, 0.081 * g, bind2(calfBone, 0.7, footBone, 0.3), this.soil(this.p.uniform, 0.13)),
      this.ring(knee, ankle, 0.945, 0.073 * g, 0.075 * g, bind2(calfBone, 0.62, footBone, 0.38), this.soil(this.p.uniformDark, 0.12)),
      this.ring(knee, ankle, 0.972, 0.062 * g, 0.064 * g, bind2(calfBone, 0.55, footBone, 0.45), this.soil(this.p.uniformDark, 0.11)),
      this.ring(knee, ankle, 0.995, 0.056 * g, 0.058 * g, bind2(calfBone, 0.5, footBone, 0.5), this.soil(this.p.uniformDark, 0.1)),
    ];
    this.mb.tube(
      MAT.FABRIC,
      calfRings,
      this.lod.seg,
      UP_Z,
      false,
      false,
      this.both(this.bag(0.095, Math.PI * 1.5, 3 + sx), this.crease(0.055, 5, 23 + sx)),
    );

    // Cargo pocket, outboard, deep enough to throw its own shadow, with a flap
    // and the snap that holds it.
    lerpJ(`thigh${side}`, `calf${side}`, 0.42, _v);
    const pocket = _v.y;
    this.mb.box(
      MAT.FABRIC,
      _v.clone().add(new THREE.Vector3(sx * 0.078 * g, 0, 0.014)),
      new THREE.Vector3(0.038, 0.082, 0.07),
      null,
      this.soil(this.p.uniform, pocket, 0.02),
      bind1(thighBone),
      0.016,
    );
    if (this.kit) {
      this.mb.box(
        MAT.FABRIC,
        _v.clone().add(new THREE.Vector3(sx * 0.084 * g, 0.072, 0.014)),
        new THREE.Vector3(0.042, 0.016, 0.076),
        null,
        this.soil(this.p.uniformDark, pocket + 0.07),
        bind1(thighBone),
        0.007,
      );
    }
    if (this.fine) {
      this.mb.box(
        MAT.HARD,
        _v.clone().add(new THREE.Vector3(sx * 0.09 * g, 0.056, 0.014)),
        new THREE.Vector3(0.006, 0.008, 0.008),
        null,
        col(this.p.gunDark),
        bind1(thighBone),
        0.002,
      );
    }

    // Trouser over the knee itself. The two tubes stop short of the joint from
    // either side and neither is capped, which is invisible on a straight leg
    // and a hole on a bent one: a crouching soldier photographed at three
    // metres had daylight through the inboard side of his knee, the thigh and
    // the shin having swung apart far enough to see between their open ends.
    // The deltoid caps solve the same problem at the shoulder; this is that.
    lerpJ(`thigh${side}`, `calf${side}`, 1, _v);
    const kneeY = _v.y;
    this.mb.ellipsoid(
      MAT.FABRIC,
      _v.clone(),
      new THREE.Vector3(0.078 * g, 0.09, 0.083 * g),
      Math.max(8, this.lod.sphereSeg - 8),
      Math.max(5, this.lod.sphereStack - 6),
      // Slightly down on the trouser, not up: cloth stretched over a joint is in
      // its own shadow, and the first pass filmed it lighter and read as a
      // bleached patch on the knee.
      this.damp(this.soil(this.p.uniform, kneeY).getHex(), 0.1),
      bind2(calfBone, 0.5, thighBone, 0.5),
      null,
      -1,
      1,
      this.lump(0.045, 7 + sx, 3),
    );

    if (this.spec.kneePads) {
      lerpJ(`thigh${side}`, `calf${side}`, 0.99, _v);
      const joint = bind2(calfBone, 0.5, thighBone, 0.5);
      /*
       * The pad, in four moulded plates rather than one dome.
       *
       * It was an ellipsoid, and at portrait distance it was the loudest wrong
       * thing on the whole man: a smooth glossy egg stuck to each knee, sitting
       * right on the outline where the eye goes first. A sphere is the one
       * shape carrying no silhouette information at all, so no amount of dust
       * or albedo spread rescues it — the fix has to be edges.
       *
       * Real pads are moulded in segments with a groove between them, because a
       * single rigid cap cannot bend with the joint. So this is four plates on
       * an arc round the knee, each tilted a little further back than the one
       * above, with daylight between them. Their rims catch the sun at four
       * different angles, the grooves hold shadow, and the outline against the
       * trouser is now a stepped edge instead of a circle.
       */
      const soft = this.soilHard(this.p.pad, kneeY, 0.14);
      if (this.kit) {
        // dy, dz, half-height, width scale, tilt about the leg's side axis
        const plates: ReadonlyArray<readonly [number, number, number, number, number]> = [
          [0.068, 0.03, 0.023, 0.74, -0.62],
          [0.023, 0.05, 0.027, 0.97, -0.16],
          [-0.029, 0.048, 0.026, 1, 0.3],
          [-0.077, 0.032, 0.021, 0.78, 0.72],
        ];
        for (const [dy, dz, hh, ws, tilt] of plates) {
          _q.setFromAxisAngle(RIGHT_X, tilt);
          this.mb.box(
            MAT.RUBBER,
            _v.clone().add(new THREE.Vector3(0, dy - 0.014, dz)),
            new THREE.Vector3(0.066 * g * ws, hh, 0.021),
            _q,
            this.soilHard(this.p.pad, kneeY + dy, 0.14 + Math.abs(dy) * 0.6),
            joint,
            0.012,
          );
        }
        // The soft backing the plates are moulded onto, flattened against the
        // trouser and just wide enough to show as a rim round them.
        this.mb.ellipsoid(
          MAT.FABRIC,
          _v.clone().add(new THREE.Vector3(0, -0.014, 0.03)),
          new THREE.Vector3(0.071 * g, 0.092, 0.04),
          Math.max(8, this.lod.sphereSeg - 10),
          Math.max(5, this.lod.sphereStack - 7),
          this.damp(this.p.webbing, 0.1),
          joint,
        );
      } else {
        // Distance bands keep one cheap cap; four plates are two pixels there.
        this.mb.ellipsoid(
          MAT.RUBBER,
          _v.clone().add(new THREE.Vector3(0, -0.014, 0.05)),
          new THREE.Vector3(0.07 * g, 0.09, 0.052),
          Math.max(6, this.lod.sphereSeg - 10),
          Math.max(4, this.lod.sphereStack - 8),
          soft,
          joint,
        );
      }
      if (this.kit) {
        // Two elastic straps behind the knee, which is where a knee pad reads
        // from the side — a pad with no strap is a patch.
        for (const dy of [0.052, -0.05]) {
          this.mb.strap(
            MAT.FABRIC,
            [
              new THREE.Vector3(sx * 0.07 * g, _v.y + dy, 0.03),
              new THREE.Vector3(sx * 0.086 * g, _v.y + dy, -0.03),
              new THREE.Vector3(sx * 0.05 * g, _v.y + dy * 0.9, -0.082),
              new THREE.Vector3(-sx * 0.02 * g, _v.y + dy * 0.9, -0.09),
            ],
            0.03,
            0.006,
            UP_Y,
            col(this.p.webbing),
            bind2(calfBone, 0.5, thighBone, 0.5),
          );
        }
      }
    }

    // Drop pouch on the outboard thigh of the leg that is not carrying the
    // holster, hung off the belt on two straps so there is daylight behind it.
    if (this.kit && side === 'L') {
      const y = 0.79;
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(sx * 0.108 * g, y, 0.01),
        new THREE.Vector3(0.036, 0.072, 0.05),
        null,
        this.soil(this.p.pouch, y, 0.04),
        bind1(thighBone),
        0.014,
      );
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(sx * 0.108 * g, y + 0.076, 0.01),
        new THREE.Vector3(0.038, 0.014, 0.054),
        null,
        this.soil(this.p.vestDark, y + 0.08),
        bind1(thighBone),
        0.006,
      );
      if (this.fine) {
        for (const dz of [0.03, -0.03]) {
          this.mb.strap(
            MAT.FABRIC,
            [
              new THREE.Vector3(sx * 0.1 * g, y + 0.088, dz),
              new THREE.Vector3(sx * 0.112 * g, y + 0.15, dz * 0.8),
              new THREE.Vector3(sx * 0.13 * g, y + 0.2, dz * 0.6),
            ],
            0.022,
            0.005,
            UP_Y,
            col(this.p.webbing),
            bind1(thighBone),
          );
        }
      }
    }
  }

  private boots(side: 'L' | 'R'): void {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * 0.1;
    const footBone = B[`foot${side}`];
    const toeBone = B[`toe${side}`];
    // Boots take the whole dust gradient — the dirtiest thing on the man, and
    // the bottom of the figure is where the eye starts. Not more than that: an
    // earlier pass loaded them to sixty percent film on top of the gradient and
    // photographed a pair of cream slippers.
    const upper = this.soil(this.p.boot, 0.15, 0.03);
    const lower = this.soil(this.p.boot, 0.06, 0.06);
    const sole = this.soil(0x191614, 0.03, 0.05);

    // Ankle collar. Flared at the top, where the trouser is bloused over it,
    // and gathered at the ankle: a boot with a constant-section shaft is a
    // wellington.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(x, 0.192, -0.008), rx: 0.062, rz: 0.066, bind: bind2(footBone, 0.5, B[`calf${side}`], 0.5), color: this.soil(this.p.boot, 0.19, 0.06) },
        { p: new THREE.Vector3(x, 0.15, -0.002), rx: 0.055, rz: 0.06, bind: bind2(footBone, 0.7, B[`calf${side}`], 0.3), color: upper },
        { p: new THREE.Vector3(x, 0.112, 0.006), rx: 0.058, rz: 0.068, bind: bind1(footBone), color: upper },
      ],
      Math.max(7, this.lod.seg - 6),
      UP_Z,
      false,
      false,
      this.lump(0.05, 13 + sx, 3),
    );

    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(x, 0.072, 0.028),
      new THREE.Vector3(0.058, 0.05, 0.108),
      null,
      lower,
      bind1(footBone),
      0.014,
    );
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(x, 0.05, 0.144),
      new THREE.Vector3(0.051, 0.036, 0.05),
      null,
      lower,
      bind2(toeBone, 0.65, footBone, 0.35),
      0.016,
    );
    // Rubber toe cap and heel counter, both proud of the leather, which is what
    // makes the boot flare at the bottom instead of ending in a wedge.
    if (this.kit) {
      this.mb.box(
        MAT.RUBBER,
        new THREE.Vector3(x, 0.036, 0.166),
        new THREE.Vector3(0.055, 0.026, 0.032),
        null,
        sole,
        bind2(toeBone, 0.7, footBone, 0.3),
        0.014,
      );
      this.mb.box(
        MAT.RUBBER,
        new THREE.Vector3(x, 0.058, -0.068),
        new THREE.Vector3(0.056, 0.034, 0.036),
        null,
        this.soil(this.p.boot, 0.06, 0.12),
        bind1(footBone),
        0.012,
      );
    }
    // Welt, which oversails the upper on all four sides.
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.02, 0.042),
      new THREE.Vector3(0.064, 0.017, 0.138),
      null,
      sole,
      bind1(footBone),
      0.006,
    );
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.02, 0.166),
      new THREE.Vector3(0.056, 0.017, 0.042),
      null,
      sole,
      bind2(toeBone, 0.65, footBone, 0.35),
      0.008,
    );
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.03, -0.064),
      new THREE.Vector3(0.056, 0.028, 0.044),
      null,
      sole,
      bind1(footBone),
      0.006,
    );
    if (this.fine) {
      // Lugs. Only ever seen on a corpse or a man going prone, but that is two
      // of the five shots this model is judged in.
      for (let i = 0; i < 4; i++) {
        this.mb.box(
          MAT.RUBBER,
          new THREE.Vector3(x, 0.006, -0.078 + i * 0.072),
          new THREE.Vector3(0.058, 0.008, 0.024),
          null,
          col(0x141210),
          bind1(i > 2 ? toeBone : footBone),
          0.004,
        );
      }
      // Laces and speed hooks up the front.
      for (let i = 0; i < 4; i++) {
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(x, 0.13 - i * 0.026, 0.078 + i * 0.011),
          new THREE.Vector3(0.026, 0.005, 0.007),
          null,
          col(this.p.webbing),
          bind1(footBone),
        );
        for (const hx of [1, -1]) {
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(x + hx * 0.028, 0.13 - i * 0.026, 0.074 + i * 0.011),
            new THREE.Vector3(0.005, 0.005, 0.005),
            null,
            col(this.p.gunDark),
            bind1(footBone),
          );
        }
      }
    }
  }

  /* -------------------------------- torso ------------------------------- */

  private hips(): void {
    const g = this.g;
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 0.855, 0.004), rx: 0.134 * g, rz: 0.102 * g, bind: bind1(B.pelvis), color: this.soil(this.p.uniformDark, 0.855, 0.03) },
        { p: new THREE.Vector3(0, 0.925, 0.004), rx: 0.15 * g, rz: 0.117 * g, bind: bind1(B.pelvis), color: this.soil(this.p.uniform, 0.925) },
        { p: new THREE.Vector3(0, 1.0, 0.006), rx: 0.152 * g, rz: 0.12 * g, bind: bind2(B.pelvis, 0.6, B.spine1, 0.4), color: this.soil(this.p.uniform, 1.0) },
      ],
      this.lod.seg,
      UP_Z,
      true,
      false,
      this.lump(0.035, 21, 3),
    );

    // Belt, buckle and the loops the belt runs through.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 1.002, 0.006), rx: 0.158 * g, rz: 0.126 * g, bind: bind2(B.pelvis, 0.5, B.spine1, 0.5), color: col(this.p.webbing) },
        { p: new THREE.Vector3(0, 1.054, 0.008), rx: 0.16 * g, rz: 0.127 * g, bind: bind2(B.pelvis, 0.4, B.spine1, 0.6), color: this.scuff(this.p.webbing, 0.1) },
      ],
      this.lod.seg,
      UP_Z,
      false,
      false,
    );
    this.mb.box(
      MAT.HARD,
      new THREE.Vector3(0, 1.028, 0.13 * g),
      new THREE.Vector3(0.036, 0.026, 0.014),
      null,
      this.scuff(this.p.gun, 0.22),
      bind1(B.spine1),
      0.006,
    );
    if (this.fine) {
      for (const a of [0.5, -0.5, 2.2, -2.2]) {
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(Math.sin(a) * 0.15 * g, 1.028, Math.cos(a) * 0.122 * g),
          new THREE.Vector3(0.012, 0.03, 0.012),
          null,
          col(this.p.uniformDark),
          bind1(B.pelvis),
          0.003,
        );
      }
    }

    // Dump pouch on the left hip: a big soft bag that hangs and swings, and one
    // of the few things on the outline that is not a hard rectangle.
    this.mb.ellipsoid(
      MAT.FABRIC,
      new THREE.Vector3(0.158 * g, 0.955, -0.052),
      new THREE.Vector3(0.048, 0.078, 0.062),
      Math.max(8, this.lod.sphereSeg - 10),
      Math.max(5, this.lod.sphereStack - 7),
      this.soil(this.p.pouch, 0.955, 0.06),
      bind1(B.pelvis),
      null,
      -1,
      0.55,
      this.lump(0.09, 23, 2),
    );
    // Canteen on the back right, with its cap.
    if (this.kit) {
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(-0.128 * g, 0.955, -0.128),
        new THREE.Vector3(0.048, 0.072, 0.036),
        null,
        this.soil(this.p.pouch, 0.955, 0.04),
        bind1(B.pelvis),
        0.018,
      );
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(-0.128 * g, 1.032, -0.126),
        new THREE.Vector3(0.05, 0.015, 0.04),
        null,
        this.soil(this.p.vestDark, 1.03),
        bind1(B.pelvis),
        0.007,
      );
    }

    // Holster on the right thigh, held down by a leg strap so it does not read
    // as a block glued to the trouser.
    if (this.spec.vest === 'carrier') {
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(-0.158 * g, 0.755, 0.024),
        new THREE.Vector3(0.036, 0.088, 0.05),
        null,
        this.soil(this.p.vest, 0.755, 0.05),
        bind1(B.thighR),
        0.014,
      );
      this.mb.box(
        MAT.HARD,
        new THREE.Vector3(-0.158 * g, 0.852, 0.03),
        new THREE.Vector3(0.022, 0.032, 0.016),
        null,
        col(this.p.gunDark),
        bind1(B.thighR),
        0.005,
      );
      if (this.fine) {
        this.mb.strap(
          MAT.FABRIC,
          [
            new THREE.Vector3(-0.16 * g, 0.712, 0.05),
            new THREE.Vector3(-0.18 * g, 0.712, -0.03),
            new THREE.Vector3(-0.11 * g, 0.712, -0.1),
            new THREE.Vector3(-0.02 * g, 0.712, -0.09),
          ],
          0.024,
          0.005,
          UP_Y,
          col(this.p.webbing),
          bind1(B.thighR),
        );
      }
    } else if (this.kit) {
      // No pistol on a chest rig; a bayonet down the left thigh instead.
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0.15 * g, 0.79, -0.062),
        new THREE.Vector3(0.022, 0.096, 0.03),
        null,
        this.soil(this.p.vestDark, 0.79, 0.05),
        bind1(B.thighL),
        0.01,
      );
    }
  }

  private torso(): void {
    const g = this.g;
    const u = this.p.uniform;
    // The shirt. Full and loose where it hangs over the belt, squeezed in under
    // the carrier, and swelling again above it where the cloth is pushed up out
    // of the way — a torso whose radius rises smoothly from waist to chest is a
    // torso with nothing strapped to it.
    const rings: Ring[] = [
      { p: new THREE.Vector3(0, 1.0, 0.006), rx: 0.152 * g, rz: 0.121 * g, bind: bind2(B.pelvis, 0.5, B.spine1, 0.5), color: this.soil(u, 1.0) },
      { p: new THREE.Vector3(0, 1.058, 0.006), rx: 0.157 * g, rz: 0.124 * g, bind: bind1(B.spine1), color: this.soil(u, 1.058) },
      { p: new THREE.Vector3(0, 1.098, 0.008), rx: 0.15 * g, rz: 0.115 * g, bind: bind1(B.spine1), color: this.damp(u, 0.1) },
      { p: new THREE.Vector3(0, 1.14, 0.01), rx: 0.153 * g, rz: 0.116 * g, bind: bind2(B.spine1, 0.5, B.spine2, 0.5), color: this.damp(u, 0.14) },
      { p: new THREE.Vector3(0, 1.205, 0.012), rx: 0.164 * g, rz: 0.121 * g, bind: bind1(B.spine2), color: this.damp(u, 0.14) },
      { p: new THREE.Vector3(0, 1.27, 0.009), rx: 0.176 * g, rz: 0.127 * g, bind: bind2(B.spine2, 0.5, B.chest, 0.5), color: this.damp(u, 0.12) },
      // The top of a uniform is bleached and the bottom of it is not: the sun
      // is on a man's shoulders all day and never on his belly, and a shirt one
      // value from collar to waist is the flattest thing on the model.
      { p: new THREE.Vector3(0, 1.335, 0.006), rx: 0.184 * g, rz: 0.13 * g, bind: bind1(B.chest), color: this.scuff(u, 0.12) },
      { p: new THREE.Vector3(0, 1.4, 0.004), rx: 0.174 * g, rz: 0.121 * g, bind: bind2(B.chest, 0.75, B.neck, 0.25), color: this.scuff(u, 0.18) },
      { p: new THREE.Vector3(0, 1.452, 0.0), rx: 0.134 * g, rz: 0.103 * g, bind: bind2(B.chest, 0.6, B.neck, 0.4), color: this.damp(u, 0.08) },
      { p: new THREE.Vector3(0, 1.478, -0.002), rx: 0.107 * g, rz: 0.086 * g, bind: bind2(B.chest, 0.4, B.neck, 0.6), color: this.damp(u, 0.16) },
      { p: new THREE.Vector3(0, 1.492, -0.002), rx: 0.072 * g, rz: 0.062 * g, bind: bind2(B.chest, 0.3, B.neck, 0.7), color: this.damp(u, 0.2) },
    ];
    this.mb.tube(
      MAT.FABRIC,
      rings,
      this.lod.seg,
      UP_Z,
      false,
      true,
      // Folds round the body as well as lumps across it. Most of this shirt is
      // under the carrier, so the amplitude is set by the band that shows below
      // it, where a combat shirt is pushed down into a roll over the belt.
      this.both(this.lump(0.032, 31, 3), this.crease(0.03, 5, 29)),
    );

    // Deltoid caps. Without these the arm tube meets the torso in a hard step
    // and the shoulder reads as broken the moment the arm moves. Widened from
    // an earlier pass: the figure measured 2.02 head-heights across the
    // shoulders where a fit man in a carrier is 2.2, and narrow shoulders under
    // a helmet is exactly what makes a head look too big.
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(sx * 0.171 * g, 1.392, 0.008),
        new THREE.Vector3(0.093 * g, 0.104, 0.093 * g),
        Math.max(9, this.lod.sphereSeg - 6),
        Math.max(6, this.lod.sphereStack - 5),
        this.scuff(u, 0.09),
        bind3(B[`arm${side}`], 0.62, B[`clav${side}`], 0.23, B.chest, 0.15),
        null,
        -1,
        1,
        this.lump(0.04, 33 + sx, 3),
      );
      if (this.fine) {
        // Sweat under the arm, and the seam that runs into it.
        this.mb.ellipsoid(
          MAT.FABRIC,
          new THREE.Vector3(sx * 0.152 * g, 1.318, 0.006),
          new THREE.Vector3(0.05 * g, 0.052, 0.07 * g),
          10,
          6,
          this.damp(u, 0.3),
          bind3(B[`arm${side}`], 0.4, B.chest, 0.5, B[`clav${side}`], 0.1),
        );
      }
    }
  }

  /**
   * The vest and everything hung on it, which is where most of the outline comes
   * from.
   *
   * The rule followed throughout is that nothing is flush. A pouch drawn at the
   * surface of the plate bag is a coloured rectangle; the same pouch pushed
   * three centimetres out is a shape with a lit top, a shaded underside and an
   * edge against the background, and it costs the same twelve triangles. The
   * plate bag itself oversails the shirt and its bottom edge is a step rather
   * than a taper, so there is a hard shadow under the lip.
   */
  private vest(): void {
    const g = this.g;
    const carrier = this.spec.vest === 'carrier';
    const shell = this.soil(this.p.vest, 1.25, 0.02);
    const shellLit = this.scuff(this.p.vest, 0.14);
    const shellDark = col(this.p.vestDark);
    const front = (carrier ? 0.163 : 0.153) * g;
    const back = -(carrier ? 0.15 : 0.142) * g;
    // Plate carriers are plates: the section is a rounded rectangle, wider at
    // the corners than the ellipse a plain tube would give.
    const plate: Warp = (a, t) => 1 - 0.055 * Math.cos(4 * a) + 0.02 * Math.sin(6 * a + t * 2);

    const rings: Ring[] = carrier
      ? [
          // Cummerbund, with the side plates in it.
          { p: new THREE.Vector3(0, 1.095, 0.012), rx: 0.183 * g, rz: 0.14 * g, bind: bind2(B.spine1, 0.7, B.spine2, 0.3), color: shellDark },
          { p: new THREE.Vector3(0, 1.128, 0.013), rx: 0.192 * g, rz: 0.147 * g, bind: bind2(B.spine2, 0.6, B.spine1, 0.4), color: shell },
          { p: new THREE.Vector3(0, 1.168, 0.014), rx: 0.193 * g, rz: 0.148 * g, bind: bind1(B.spine2), color: shell },
          // Step in at the top of the cummerbund, out again onto the plate bag.
          { p: new THREE.Vector3(0, 1.19, 0.014), rx: 0.186 * g, rz: 0.143 * g, bind: bind1(B.spine2), color: shellDark },
          { p: new THREE.Vector3(0, 1.215, 0.014), rx: 0.198 * g, rz: 0.152 * g, bind: bind1(B.spine2), color: shellLit },
          { p: new THREE.Vector3(0, 1.29, 0.012), rx: 0.203 * g, rz: 0.155 * g, bind: bind2(B.spine2, 0.4, B.chest, 0.6), color: shell },
          { p: new THREE.Vector3(0, 1.36, 0.008), rx: 0.198 * g, rz: 0.148 * g, bind: bind1(B.chest), color: shell },
          { p: new THREE.Vector3(0, 1.406, 0.004), rx: 0.176 * g, rz: 0.126 * g, bind: bind1(B.chest), color: shellDark },
        ]
      : [
          { p: new THREE.Vector3(0, 1.15, 0.012), rx: 0.176 * g, rz: 0.136 * g, bind: bind1(B.spine2), color: shellDark },
          { p: new THREE.Vector3(0, 1.175, 0.013), rx: 0.188 * g, rz: 0.145 * g, bind: bind1(B.spine2), color: shellLit },
          { p: new THREE.Vector3(0, 1.245, 0.014), rx: 0.191 * g, rz: 0.147 * g, bind: bind2(B.spine2, 0.5, B.chest, 0.5), color: shell },
          { p: new THREE.Vector3(0, 1.32, 0.01), rx: 0.191 * g, rz: 0.144 * g, bind: bind1(B.chest), color: shell },
          { p: new THREE.Vector3(0, 1.378, 0.006), rx: 0.178 * g, rz: 0.128 * g, bind: bind1(B.chest), color: shellDark },
        ];
    this.mb.tube(MAT.FABRIC, rings, this.lod.seg, UP_Z, true, true, plate);

    /* ---------------------- magazine shingle, front ---------------------- */

    const magY = carrier ? 1.222 : 1.252;
    const spread = carrier ? 0.084 : 0.075;
    const half = (this.spec.mags - 1) / 2;
    for (let i = 0; i < this.spec.mags; i++) {
      const x = (i - half) * spread;
      // Splayed, following the curve of the chest, and stepping back as they go
      // outboard. Four identical blocks in a straight line is a bandolier from
      // a toy shop.
      const z = front + 0.034 - Math.abs(i - half) * 0.012;
      const tilt = -(i - half) * 0.13;
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(x, magY, z),
        new THREE.Vector3(0.037, 0.064, 0.036),
        quatXZ(0.06, tilt),
        this.soil(this.p.pouch, magY, 0.02 + (i % 2) * 0.03),
        bind1(B.spine2),
        0.013,
      );
      if (this.kit) {
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(x, magY + 0.066, z - 0.004),
          new THREE.Vector3(0.04, 0.017, 0.04),
          quatXZ(0.1, tilt),
          this.soil(this.p.vestDark, magY + 0.07),
          bind1(B.spine2),
          0.007,
        );
      }
      if (this.fine) {
        // Pull tab, hanging off the flap.
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(x, magY + 0.05, z + 0.042),
          new THREE.Vector3(0.008, 0.022, 0.004),
          null,
          col(this.p.webbing),
          bind1(B.spine2),
          0.002,
        );
      }
    }

    /* -------------------------- odds and ends, front --------------------- */

    // Admin pouch high on the right, IFAK low on the left, and the two are
    // deliberately different sizes so the chest is not symmetric.
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(-0.078, 1.322, front + 0.03),
      new THREE.Vector3(0.062, 0.042, 0.03),
      quatXZ(0.12, 0),
      this.soil(this.p.pouch, 1.32, 0.05),
      bind1(B.chest),
      0.013,
    );
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(0.126, 1.322, front + 0.006),
      new THREE.Vector3(0.042, 0.05, 0.03),
      quatXZ(0, -0.2),
      this.soil(this.p.vest, 1.32, 0.02),
      bind1(B.chest),
      0.013,
    );
    if (this.kit) {
      // Grenades, which are the roundest thing on a rig full of rectangles.
      for (const [gx, gy] of [
        [0.148, 1.238],
        [-0.15, 1.244],
      ]) {
        this.mb.ellipsoid(
          MAT.HARD,
          new THREE.Vector3(gx, gy, front * 0.86),
          new THREE.Vector3(0.03, 0.042, 0.03),
          Math.max(7, this.lod.sphereSeg - 12),
          Math.max(5, this.lod.sphereStack - 8),
          this.soilHard(0x34392e, gy, 0.05),
          bind1(B.spine2),
        );
        this.mb.box(
          MAT.HARD,
          new THREE.Vector3(gx, gy + 0.05, front * 0.86),
          new THREE.Vector3(0.013, 0.014, 0.013),
          null,
          col(this.p.gunDark),
          bind1(B.spine2),
          0.004,
        );
      }
    }

    /* ---------------------------- back of the rig ------------------------ */

    if (this.spec.hydration) {
      // Bladder between the shoulder blades. The biggest single volume on the
      // man after the torso itself, and it changes his profile from the side
      // more than anything else here.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.28, back - 0.058),
        new THREE.Vector3(0.14 * g, 0.13, 0.062),
        Math.max(9, this.lod.sphereSeg - 8),
        Math.max(6, this.lod.sphereStack - 6),
        this.soil(this.p.vestDark, 1.28, 0.03),
        bind2(B.chest, 0.55, B.spine2, 0.45),
        null,
        -1,
        1,
        // Compression bands round it as well as lumps across it. A bladder is a
        // bag of water inside a cinched sleeve and this is the largest single
        // volume on the man after his torso: left smooth it photographed as one
        // dark dome filling half his back, which is the whole complaint on one
        // part.
        this.both(this.lump(0.06, 41, 2), this.crease(0.055, 2.5, 43)),
      );
      if (this.kit) {
        // The two compression straps that make those bands, and the seam down
        // the middle of the sleeve between them.
        for (const y of [1.34, 1.22]) {
          this.mb.strap(
            MAT.FABRIC,
            [
              new THREE.Vector3(-0.13 * g, y, back - 0.05),
              new THREE.Vector3(-0.05 * g, y, back - 0.115),
              new THREE.Vector3(0.05 * g, y, back - 0.115),
              new THREE.Vector3(0.13 * g, y, back - 0.05),
            ],
            0.036,
            0.007,
            UP_Y,
            col(this.p.webbing),
            bind2(B.chest, 0.55, B.spine2, 0.45),
          );
        }
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(0, 1.28, back - 0.118),
          new THREE.Vector3(0.012, 0.115, 0.012),
          null,
          col(this.p.vestDark, -0.2),
          bind2(B.chest, 0.55, B.spine2, 0.45),
          0.004,
        );
        // Drink tube over the left shoulder with a bite valve at the end, which
        // is a line crossing the chest and reads at any range.
        this.mb.cord(
          MAT.RUBBER,
          [
            new THREE.Vector3(0.075, 1.33, back - 0.09),
            new THREE.Vector3(0.115, 1.44, back - 0.02),
            new THREE.Vector3(0.118, 1.452, 0.03),
            new THREE.Vector3(0.1, 1.4, front - 0.02),
            new THREE.Vector3(0.115, 1.31, front + 0.01),
          ],
          0.0105,
          Math.max(4, this.lod.seg - 16),
          col(0x1d1f1c),
          bind2(B.chest, 0.8, B.clavL, 0.2),
        );
      }
    }

    if (this.spec.radio) {
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0.108, 1.3, back - 0.036),
        new THREE.Vector3(0.048, 0.07, 0.038),
        null,
        this.soil(this.p.vestDark, 1.3),
        bind1(B.chest),
        0.014,
      );
      if (this.kit) {
        // Whip antenna. Thin, tall, and the only vertical line above the
        // shoulder other than the helmet — it is worth its triangles.
        this.mb.cord(
          MAT.HARD,
          [
            new THREE.Vector3(0.108, 1.37, back - 0.026),
            new THREE.Vector3(0.116, 1.5, back - 0.05),
            new THREE.Vector3(0.128, 1.62, back - 0.088),
            new THREE.Vector3(0.138, 1.71, back - 0.135),
          ],
          0.0055,
          Math.max(3, this.lod.seg - 18),
          col(this.p.gunDark),
          bind1(B.chest),
        );
      }
      if (this.fine) {
        // Handset clipped to the strap, and its coiled cord.
        this.mb.box(
          MAT.HARD,
          new THREE.Vector3(0.104, 1.4, front - 0.03),
          new THREE.Vector3(0.02, 0.038, 0.018),
          quatXZ(0, 0.18),
          col(this.p.gun),
          bind2(B.chest, 0.8, B.clavL, 0.2),
          0.006,
        );
        const coil: THREE.Vector3[] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          const a = t * Math.PI * 4.5;
          coil.push(
            new THREE.Vector3(
              0.104 + Math.cos(a) * 0.019,
              1.36 - t * 0.1,
              front - 0.03 + Math.sin(a) * 0.014,
            ),
          );
        }
        this.mb.cord(MAT.RUBBER, coil, 0.005, 3, col(0x191a18), bind1(B.chest));
      }
    }

    // Utility pouch and a rear IFAK, both on the back where the outline is
    // otherwise a flat wall.
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(-0.08, 1.24, back - 0.03),
      new THREE.Vector3(0.07, 0.056, 0.032),
      null,
      this.soil(this.p.pouch, 1.24, 0.04),
      bind1(B.spine2),
      0.014,
    );
    if (this.kit) {
      // Drag handle across the top of the back panel.
      this.mb.strap(
        MAT.FABRIC,
        [
          new THREE.Vector3(-0.05, 1.372, back - 0.012),
          new THREE.Vector3(-0.02, 1.392, back - 0.042),
          new THREE.Vector3(0.02, 1.392, back - 0.042),
          new THREE.Vector3(0.05, 1.372, back - 0.012),
        ],
        0.05,
        0.009,
        UP_Y,
        this.scuff(this.p.webbing, 0.18),
        bind1(B.chest),
      );
    }

    /* ---------------------------- shoulder straps ------------------------ */

    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      this.mb.strap(
        MAT.FABRIC,
        [
          new THREE.Vector3(sx * 0.08, 1.36, front - 0.012),
          new THREE.Vector3(sx * 0.1, 1.442, 0.06),
          new THREE.Vector3(sx * 0.106, 1.466, -0.01),
          new THREE.Vector3(sx * 0.095, 1.424, -0.09),
          new THREE.Vector3(sx * 0.08, 1.36, back + 0.012),
        ],
        0.078,
        0.014,
        UP_X,
        shellLit,
        bind2(B.chest, 0.8, B[`clav${side}`], 0.2),
      );
      if (this.kit) {
        // Padded yoke over the strap, standing proud of it. A carrier's
        // shoulders are the widest part of a soldier's outline and they should
        // not be a flat band.
        this.mb.ellipsoid(
          MAT.FABRIC,
          new THREE.Vector3(sx * 0.1, 1.462, -0.012),
          new THREE.Vector3(0.05, 0.03, 0.078),
          Math.max(8, this.lod.sphereSeg - 12),
          Math.max(5, this.lod.sphereStack - 9),
          this.soil(this.p.vest, 1.46, 0.02),
          bind2(B.chest, 0.7, B[`clav${side}`], 0.3),
          null,
          -0.15,
          1,
        );
      }
      if (this.fine) {
        // Loose end of the adjustment strap, hanging. Nothing else on the model
        // dangles, and a figure with no dangling anything looks assembled
        // rather than worn.
        this.mb.strap(
          MAT.FABRIC,
          [
            new THREE.Vector3(sx * 0.088, 1.352, front - 0.014),
            new THREE.Vector3(sx * 0.096, 1.3, front + 0.004),
            new THREE.Vector3(sx * 0.1, 1.26, front + 0.002),
          ],
          0.022,
          0.005,
          UP_X,
          col(this.p.webbing),
          bind1(B.chest),
        );
      }
    }

    /* -------------------------------- sling ------------------------------ */

    // Two-point sling over the left shoulder, across the chest and down to the
    // right hip. The gun is skinned to its own bone and moves independently, so
    // this cannot physically reach it — but the diagonal across the body is the
    // read, and a diagonal is the one line a plate carrier does not otherwise
    // have.
    if (this.kit) {
      this.mb.strap(
        MAT.FABRIC,
        [
          new THREE.Vector3(0.105, 1.462, -0.04),
          new THREE.Vector3(0.088, 1.4, front - 0.01),
          new THREE.Vector3(0.02, 1.32, front + 0.016),
          new THREE.Vector3(-0.09, 1.22, front + 0.006),
          new THREE.Vector3(-0.16, 1.14, 0.06),
        ],
        0.032,
        0.009,
        UP_X,
        this.scuff(this.p.webbing, 0.12),
        bind2(B.chest, 0.75, B.spine2, 0.25),
      );
    }
  }

  /* ----------------------------- back load -------------------------------- */

  /**
   * The long thing strapped across the back. A rifleman's outline is a vertical
   * with a helmet on it; one diagonal object changes that completely, and it is
   * the cheapest way to tell two men apart at range.
   */
  private backLoad(): void {
    const load = this.spec.backLoad;
    if (load === 'none') return;
    const bind = bind2(B.chest, 0.5, B.spine2, 0.5);
    const seg = Math.max(5, this.lod.seg - 14);
    // Low on the left, high on the right, clear of the helmet.
    const a = new THREE.Vector3(0.15, 1.09, -0.19);
    const b = new THREE.Vector3(-0.13, 1.46, -0.24);

    if (load === 'launcher') {
      const dir = b.clone().sub(a).normalize();
      this.mb.tube(
        MAT.HARD,
        [
          { p: a.clone().addScaledVector(dir, -0.06), rx: 0.038, rz: 0.038, bind, color: this.soilHard(this.p.gun, 1.1, 0.06) },
          { p: a.clone().lerp(b, 0.45), rx: 0.034, rz: 0.034, bind, color: this.soilHard(this.p.gun, 1.25) },
          { p: a.clone().lerp(b, 0.72), rx: 0.031, rz: 0.031, bind, color: this.soilHard(this.p.gun, 1.35) },
          { p: b.clone(), rx: 0.028, rz: 0.028, bind, color: this.soilHard(this.p.gunDark, 1.45) },
        ],
        seg + 2,
        UP_Y,
        true,
        true,
        this.lump(0.05, 51, 2),
      );
      // Warhead on the top end, and a pistol grip under the tube.
      this.mb.ellipsoid(
        MAT.HARD,
        b.clone().addScaledVector(dir, 0.075),
        new THREE.Vector3(0.05, 0.075, 0.05),
        Math.max(7, this.lod.sphereSeg - 12),
        Math.max(5, this.lod.sphereStack - 8),
        col(this.p.gunDark),
        bind,
        new THREE.Quaternion().setFromUnitVectors(UP_Y, dir),
      );
      if (this.kit) {
        this.mb.box(
          MAT.HARD,
          a.clone().lerp(b, 0.34).add(new THREE.Vector3(0.02, -0.05, 0.02)),
          new THREE.Vector3(0.014, 0.045, 0.02),
          quatX(0.25),
          col(this.p.gunDark),
          bind,
          0.006,
        );
      }
    } else if (load === 'bar') {
      // Breaching bar: a shaft with a forked, flattened end.
      this.mb.tube(
        MAT.HARD,
        [
          { p: a.clone(), rx: 0.014, rz: 0.014, bind, color: this.soilHard(0x413a33, 1.1, 0.1) },
          { p: a.clone().lerp(b, 0.6), rx: 0.013, rz: 0.013, bind, color: this.soilHard(0x4a423a, 1.3) },
          { p: b.clone(), rx: 0.012, rz: 0.012, bind, color: this.scuff(0x4a423a, 0.25) },
        ],
        seg,
        UP_Y,
        true,
        true,
      );
      this.mb.box(
        MAT.HARD,
        b.clone().add(new THREE.Vector3(-0.012, 0.045, -0.008)),
        new THREE.Vector3(0.026, 0.03, 0.008),
        quatXZ(0, 0.3),
        this.scuff(0x4a423a, 0.35),
        bind,
        0.004,
      );
    } else {
      // Entrenching tool, blade down, folded flat against the pack.
      const mid = a.clone().lerp(b, 0.62);
      this.mb.tube(
        MAT.HARD,
        [
          { p: a.clone().lerp(b, 0.2), rx: 0.013, rz: 0.013, bind, color: this.soilHard(0x4c4030, 1.15, 0.1) },
          { p: mid, rx: 0.012, rz: 0.012, bind, color: this.soilHard(0x54472f, 1.35) },
        ],
        seg,
        UP_Y,
        true,
        true,
      );
      this.mb.box(
        MAT.HARD,
        a.clone().lerp(b, 0.06),
        new THREE.Vector3(0.05, 0.055, 0.009),
        quatXZ(0.1, 0.42),
        this.soilHard(0x4a443c, 1.08, 0.14),
        bind,
        0.006,
      );
      this.mb.box(
        MAT.HARD,
        mid.clone().add(new THREE.Vector3(-0.012, 0.03, 0)),
        new THREE.Vector3(0.018, 0.026, 0.014),
        quatXZ(0, 0.42),
        col(this.p.gunDark),
        bind,
        0.005,
      );
    }

    if (this.kit) {
      // The two straps holding it on, which is what stops it looking magnetic.
      for (const t of [0.24, 0.7]) {
        const p = a.clone().lerp(b, t);
        this.mb.strap(
          MAT.FABRIC,
          [
            new THREE.Vector3(p.x - 0.06, p.y, p.z + 0.09),
            new THREE.Vector3(p.x - 0.02, p.y, p.z - 0.02),
            new THREE.Vector3(p.x + 0.05, p.y, p.z - 0.02),
            new THREE.Vector3(p.x + 0.09, p.y, p.z + 0.08),
          ],
          0.03,
          0.006,
          UP_Y,
          col(this.p.webbing),
          bind,
        );
      }
    }
  }

  /* --------------------------------- arms -------------------------------- */

  private arm(side: 'L' | 'R'): void {
    const g = this.g;
    const sx = side === 'L' ? 1 : -1;
    const shoulder = jp(`arm${side}`);
    const elbow = jp(`fore${side}`);
    const hand = jp(`hand${side}`);
    const armBone = B[`arm${side}`];
    const foreBone = B[`fore${side}`];
    const handBone = B[`hand${side}`];
    const cloth = this.damp(this.p.uniform, 0.12);
    const clothDark = col(this.p.uniformDark);
    const rolled = this.spec.sleeves === 'rolled';
    const at = (t: number): THREE.Vector3 => shoulder.clone().lerp(elbow, t);

    /*
     * Upper arm.
     *
     * This is the part of the man the lens sees most of — a soldier with a
     * rifle up has both elbows outside his outline and half the frame is
     * sleeve — and it was the last thing on the model still reading as a
     * mannequin: a smooth pale cylinder with a dark ball at the end of it, which
     * is a doll's arm. Three things were wrong. It was the lightest surface on
     * the figure, because it took the uniform's value undamped while every ring
     * of the shirt was damped; it had no seam, so shoulder-to-elbow was one
     * unbroken sweep; and it tapered monotonically, which no sleeve over a
     * bicep does. The rings below put the seam in, swell over the bicep and
     * pull in above the elbow.
     */
    const upper: Ring[] = [
      this.ring(shoulder, elbow, 0.02, 0.075 * g, 0.075 * g, bind2(armBone, 0.7, B[`clav${side}`], 0.3), this.damp(this.p.uniform, 0.2)),
      // Set-in sleeve seam: a hard step where the sleeve is stitched to the
      // body, which is the line that stops the arm reading as part of the torso.
      this.ring(shoulder, elbow, 0.13, 0.069 * g, 0.069 * g, bind1(armBone), this.damp(this.p.uniform, 0.26)),
      this.ring(shoulder, elbow, 0.17, 0.071 * g, 0.071 * g, bind1(armBone), this.scuff(this.p.uniform, 0.1)),
      this.ring(shoulder, elbow, 0.25, 0.069 * g, 0.07 * g, bind1(armBone), cloth),
      this.ring(shoulder, elbow, 0.32, 0.066 * g, 0.067 * g, bind1(armBone), cloth),
      this.ring(shoulder, elbow, 0.39, 0.062 * g, 0.063 * g, bind1(armBone), cloth),
      this.ring(shoulder, elbow, 0.46, 0.059 * g, 0.06 * g, bind1(armBone), cloth),
    ];
    if (rolled) {
      // Cuff of the roll, which is a fat band with two turns of cloth in it.
      upper.push(
        this.ring(shoulder, elbow, 0.56, 0.058 * g, 0.058 * g, bind1(armBone), clothDark),
        this.ring(shoulder, elbow, 0.6, 0.067 * g, 0.067 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.68, 0.068 * g, 0.068 * g, bind1(armBone), clothDark),
        this.ring(shoulder, elbow, 0.71, 0.056 * g, 0.056 * g, bind1(armBone), this.damp(this.p.uniformDark, 0.25)),
      );
    } else {
      upper.push(
        // Slack gathered in the crook, then tight where the pad grips it.
        this.ring(shoulder, elbow, 0.56, 0.058 * g, 0.059 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.64, 0.057 * g, 0.058 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.71, 0.054 * g, 0.055 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.78, 0.051 * g, 0.052 * g, bind1(armBone), this.damp(this.p.uniform, 0.2)),
        this.ring(shoulder, elbow, 0.84, 0.0495 * g, 0.0505 * g, bind2(armBone, 0.75, foreBone, 0.25), this.damp(this.p.uniform, 0.23)),
        this.ring(shoulder, elbow, 0.9, 0.048 * g, 0.049 * g, bind2(armBone, 0.55, foreBone, 0.45), this.damp(this.p.uniform, 0.26)),
      );
    }
    this.mb.tube(
      MAT.FABRIC,
      upper,
      Math.max(6, this.lod.seg - 4),
      UP_Z,
      false,
      rolled,
      this.both(
        this.bag(0.085, sx > 0 ? 0.6 : Math.PI - 0.6, 61 + sx),
        this.crease(rolled ? 0.038 : 0.05, rolled ? 3 : 4, 25 + sx),
      ),
    );

    // Forearm: cloth, or bare skin below a rolled cuff. Skin is thinner than a
    // sleeve and tapers hard into the wrist, which is a different shape and
    // reads as a different variant from thirty metres.
    const skinArm = rolled ? this.p.skin : this.p.uniform;
    const fmat = rolled ? MAT.SKIN : MAT.FABRIC;
    const fore: Ring[] = rolled
      ? [
          this.ring(shoulder, elbow, 0.7, 0.05 * g, 0.05 * g, bind2(armBone, 0.7, foreBone, 0.3), col(skinArm)),
          this.ring(shoulder, elbow, 0.95, 0.048 * g, 0.048 * g, bind2(armBone, 0.5, foreBone, 0.5), col(skinArm)),
          this.ring(elbow, hand, 0.06, 0.047 * g, 0.047 * g, bind2(foreBone, 0.7, armBone, 0.3), col(skinArm)),
          this.ring(elbow, hand, 0.28, 0.049 * g, 0.049 * g, bind1(foreBone), col(skinArm)),
          this.ring(elbow, hand, 0.62, 0.04 * g, 0.04 * g, bind1(foreBone), col(skinArm)),
          this.ring(elbow, hand, 0.86, 0.032 * g, 0.034 * g, bind1(foreBone), col(skinArm, -0.06)),
          this.ring(elbow, hand, 0.97, 0.031 * g, 0.033 * g, bind2(foreBone, 0.55, handBone, 0.45), col(skinArm, -0.1)),
        ]
      : [
          this.ring(elbow, hand, 0.02, 0.053 * g, 0.053 * g, bind2(foreBone, 0.6, armBone, 0.4), this.damp(this.p.uniform, 0.24)),
          this.ring(elbow, hand, 0.13, 0.0535 * g, 0.054 * g, bind1(foreBone), cloth),
          this.ring(elbow, hand, 0.24, 0.053 * g, 0.054 * g, bind1(foreBone), cloth),
          this.ring(elbow, hand, 0.41, 0.0485 * g, 0.0495 * g, bind1(foreBone), cloth),
          this.ring(elbow, hand, 0.58, 0.044 * g, 0.045 * g, bind1(foreBone), cloth),
          this.ring(elbow, hand, 0.69, 0.0455 * g, 0.0465 * g, bind1(foreBone), cloth),
          // Buttoned cuff: a raised band with the sleeve gathered into it, then
          // a hard step down to the wrist. Without the step the sleeve runs into
          // the glove and forearm plus hand read as one tapered rod.
          this.ring(elbow, hand, 0.79, 0.047 * g, 0.048 * g, bind1(foreBone), cloth),
          this.ring(elbow, hand, 0.83, 0.05 * g, 0.051 * g, bind1(foreBone), this.scuff(this.p.uniform, 0.08)),
          this.ring(elbow, hand, 0.9, 0.049 * g, 0.05 * g, bind1(foreBone), clothDark),
          this.ring(elbow, hand, 0.925, 0.036 * g, 0.038 * g, bind1(foreBone), this.damp(this.p.uniformDark, 0.2)),
          this.ring(elbow, hand, 0.97, 0.035 * g, 0.037 * g, bind2(foreBone, 0.55, handBone, 0.45), clothDark),
        ];
    this.mb.tube(
      fmat,
      fore,
      Math.max(6, this.lod.seg - 4),
      UP_Z,
      rolled,
      false,
      rolled
        ? this.lump(0.03, 63 + sx, 3)
        : this.both(this.bag(0.06, sx > 0 ? -0.5 : Math.PI + 0.5, 63 + sx), this.crease(0.045, 4, 27 + sx)),
    );

    // Sleeve over the elbow, for the reason the knee has one: two uncapped
    // tubes meeting at a joint open a hole as soon as the joint bends, and a
    // soldier with a rifle up has both elbows folded hard.
    this.mb.ellipsoid(
      rolled ? MAT.SKIN : MAT.FABRIC,
      at(1),
      new THREE.Vector3(0.05 * g, 0.06, 0.051 * g),
      Math.max(8, this.lod.sphereSeg - 10),
      Math.max(5, this.lod.sphereStack - 7),
      col(rolled ? skinArm : this.p.uniform),
      bind2(armBone, 0.5, foreBone, 0.5),
    );

    /*
     * Elbow pad, strapped across the joint.
     *
     * An ellipsoid over the joint is a ball bearing in a socket, which is
     * exactly how the first two versions read at portrait distance: a smooth
     * pale tube ending in a dark egg. A real pad is a moulded shell with a
     * hard cap, a rim and a strap, and all three of those are edges. So the
     * soft part is flattened onto the back of the arm where a pad actually
     * sits, and the cap over it is a bevelled box, whose facets catch the sun
     * at three different values and read as a made object rather than a joint.
     */
    if (this.kit && !rolled) {
      const joint = bind2(armBone, 0.5, foreBone, 0.5);
      // Backing, flattened onto the arm. It used to be very nearly a sphere and
      // it swallowed the cap sitting on it, so the arm still ended in an egg
      // however many facets the cap had. Two-thirds of its depth is gone and it
      // now shows only as a soft rim around the plates.
      this.mb.ellipsoid(
        MAT.FABRIC,
        at(0.99).add(new THREE.Vector3(sx * 0.006, 0, -0.012)),
        new THREE.Vector3(0.052 * g, 0.075, 0.034 * g),
        Math.max(8, this.lod.sphereSeg - 12),
        Math.max(5, this.lod.sphereStack - 8),
        this.damp(this.p.webbing, 0.08),
        joint,
        null,
        -1,
        1,
        this.lump(0.06, 67 + sx, 2),
      );
      // Two hinged plates, as on the knee and for the same reason.
      for (const [dy, dz, hh, ws, tilt] of [
        [0.031, -0.025, 0.03, 0.86, -0.34],
        [-0.026, -0.031, 0.032, 1, 0.3],
      ] as ReadonlyArray<readonly [number, number, number, number, number]>) {
        _q.setFromAxisAngle(RIGHT_X, tilt);
        this.mb.box(
          MAT.RUBBER,
          at(0.99).add(new THREE.Vector3(sx * 0.004, dy, dz)),
          new THREE.Vector3(0.042 * ws, hh, 0.019),
          _q,
          this.soilHard(this.p.pad, 1.2, 0.16),
          joint,
          0.011,
        );
      }
      if (this.fine) {
        // Rim of the shell and the strap round the front of the joint.
        this.mb.box(
          MAT.FABRIC,
          at(0.99).add(new THREE.Vector3(0, -0.048, -0.014)),
          new THREE.Vector3(0.05, 0.012, 0.05),
          null,
          col(this.p.webbing),
          joint,
          0.004,
        );
        this.mb.box(
          MAT.FABRIC,
          at(0.99).add(new THREE.Vector3(0, 0.03, 0.038)),
          new THREE.Vector3(0.038, 0.018, 0.012),
          null,
          col(this.p.webbing),
          joint,
          0.004,
        );
      }
    }
    if (this.kit) {
      // Shoulder pocket, standing proud, with a flag patch on one arm.
      this.mb.box(
        MAT.FABRIC,
        at(0.3).add(new THREE.Vector3(sx * 0.052 * g, 0.006, 0.012)),
        new THREE.Vector3(0.028, 0.042, 0.032),
        null,
        this.scuff(this.p.uniform, 0.06),
        bind1(armBone),
        0.009,
      );
      // Zip of the pocket, and the flat of cloth above it where the sleeve is
      // cut wide over the deltoid. Both catch a highlight along one edge, which
      // is what breaks a cylinder.
      this.mb.box(
        MAT.FABRIC,
        at(0.19).add(new THREE.Vector3(sx * 0.046 * g, 0.004, 0.016)),
        new THREE.Vector3(0.03, 0.026, 0.036),
        quatXZ(0, -sx * 0.25),
        this.damp(this.p.uniform, 0.22),
        bind1(armBone),
        0.006,
      );
    }
    if (this.fine) {
      this.mb.box(
        MAT.FABRIC,
        at(0.3).add(new THREE.Vector3(sx * 0.062 * g, 0.006, 0.006)),
        new THREE.Vector3(0.008, 0.024, 0.032),
        null,
        col(side === 'L' ? 0x4a3826 : this.p.uniformDark),
        bind1(armBone),
        0.003,
      );
      // Watch on the support wrist.
      if (side === 'L') {
        this.mb.box(
          MAT.HARD,
          elbow.clone().lerp(hand, 0.88).add(new THREE.Vector3(0, 0.03, 0)),
          new THREE.Vector3(0.02, 0.012, 0.022),
          null,
          col(this.p.gunDark),
          bind1(foreBone),
          0.006,
        );
      }
    }
  }

  private hand(side: 'L' | 'R'): void {
    const hand = jp(`hand${side}`);
    const elbow = jp(`fore${side}`);
    const handBone = B[`hand${side}`];
    const glove = col(this.p.glove);
    _v.copy(hand).sub(elbow).normalize();
    _q.setFromUnitVectors(UP_Y, _v);

    // A gloved fist on a pistol grip, 15% larger than the first pass, where it
    // measured 0.58 head-heights along its longest axis against the 0.62 a real
    // fist is. Small hands are the commonest of the four proportion errors named
    // in the review and they always go the same way.
    this.mb.ellipsoid(
      MAT.FABRIC,
      hand.clone().addScaledVector(_v, 0.012),
      new THREE.Vector3(0.044, 0.067, 0.057),
      Math.max(8, this.lod.sphereSeg - 12),
      Math.max(5, this.lod.sphereStack - 8),
      glove,
      bind1(handBone),
      _q.clone(),
    );
    if (this.fine) {
      // Fingers wrapped around the grip, as four short boxes.
      for (let i = 0; i < 4; i++) {
        const t = (i - 1.5) * 0.023;
        _v2.copy(hand).addScaledVector(_v, 0.042);
        this.mb.box(
          MAT.FABRIC,
          _v2.clone().add(new THREE.Vector3(0, t * 0.4, t)),
          new THREE.Vector3(0.032, 0.012, 0.013),
          null,
          col(this.p.glove, i % 2 === 0 ? 0.1 : -0.06),
          bind1(handBone),
          0.004,
        );
      }
      // Thumb across the top, and the cuff of the glove over the wrist.
      this.mb.box(
        MAT.FABRIC,
        hand.clone().add(new THREE.Vector3(side === 'L' ? -0.028 : 0.028, 0.028, 0.026)),
        new THREE.Vector3(0.015, 0.015, 0.032),
        null,
        glove,
        bind1(handBone),
        0.005,
      );
      this.mb.tube(
        MAT.FABRIC,
        [
          { p: hand.clone().addScaledVector(_v, -0.052), rx: 0.04, rz: 0.042, bind: bind2(handBone, 0.6, B[`fore${side}`], 0.4), color: col(this.p.glove, -0.12) },
          { p: hand.clone().addScaledVector(_v, -0.028), rx: 0.043, rz: 0.045, bind: bind1(handBone), color: glove },
        ],
        Math.max(6, this.lod.seg - 12),
        UP_Z,
        false,
        false,
      );
    }
  }

  /* --------------------------------- head -------------------------------- */

  private neckAndHead(): void {
    const skin = col(this.p.skin);
    const head = bind1(B.head);
    // A neck is deeper than it is wide and thicker than the first pass had it:
    // measured against the skull it came out at 0.70 of head breadth where a fit
    // male is 0.80, and a thin neck under a helmet is the second reason a head
    // looks too big.
    this.mb.tube(
      MAT.SKIN,
      [
        { p: new THREE.Vector3(0, 1.415, 0.0), rx: 0.067, rz: 0.069, bind: bind2(B.neck, 0.5, B.chest, 0.5), color: this.damp(this.p.skin, 0.3) },
        { p: new THREE.Vector3(0, 1.49, 0.004), rx: 0.062, rz: 0.066, bind: bind1(B.neck), color: this.damp(this.p.skin, 0.06) },
        { p: new THREE.Vector3(0, 1.555, 0.008), rx: 0.064, rz: 0.068, bind: bind2(B.neck, 0.4, B.head, 0.6), color: skin },
      ],
      Math.max(7, this.lod.seg - 8),
      UP_Z,
      false,
      false,
    );
    // Collar, standing up at the back the way a combat shirt's does.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 1.442, -0.002), rx: 0.082, rz: 0.079, bind: bind2(B.neck, 0.5, B.chest, 0.5), color: this.damp(this.p.uniformDark, 0.1) },
        { p: new THREE.Vector3(0, 1.5, 0.004), rx: 0.075, rz: 0.076, bind: bind2(B.neck, 0.75, B.chest, 0.25), color: col(this.p.uniformDark) },
      ],
      Math.max(7, this.lod.seg - 8),
      UP_Z,
      false,
      false,
      (a) => 1 + 0.07 * Math.max(0, -Math.sin(a)),
    );

    // Shemagh or a rolled scarf at the throat, which fills the gap between
    // collar and helmet and is the single best thing on the list for breaking
    // the line from shoulder to head.
    if (this.spec.face === 'scarf') {
      this.mb.tube(
        MAT.FABRIC,
        [
          { p: new THREE.Vector3(0, 1.44, -0.004), rx: 0.098, rz: 0.096, bind: bind2(B.neck, 0.4, B.chest, 0.6), color: this.soil(this.p.scarf, 1.44, 0.05) },
          { p: new THREE.Vector3(0, 1.485, 0.002), rx: 0.093, rz: 0.093, bind: bind1(B.neck), color: col(this.p.scarf) },
          { p: new THREE.Vector3(0, 1.522, 0.006), rx: 0.084, rz: 0.086, bind: bind2(B.neck, 0.7, B.head, 0.3), color: this.damp(this.p.scarf, 0.1) },
        ],
        Math.max(8, this.lod.seg - 6),
        UP_Z,
        false,
        false,
        this.lump(0.1, 71, 3),
      );
      if (this.kit) {
        // Tail of it hanging down the back.
        this.mb.strap(
          MAT.FABRIC,
          [
            new THREE.Vector3(0.03, 1.47, -0.09),
            new THREE.Vector3(0.05, 1.4, -0.115),
            new THREE.Vector3(0.062, 1.33, -0.1),
          ],
          0.07,
          0.008,
          UP_X,
          this.damp(this.p.scarf, 0.14),
          bind2(B.chest, 0.7, B.neck, 0.3),
        );
      }
    }

    // Cranium and jaw as two ellipsoids: one shape cannot do both, and a head
    // with no jaw is the single clearest tell of a cheap character. The skull is
    // narrower than the first pass — 0.168 m across where a man is 0.155 — and
    // slightly longer front to back, which is the head-size fix.
    this.mb.ellipsoid(
      MAT.SKIN,
      new THREE.Vector3(0, 1.658, 0.004),
      new THREE.Vector3(0.078, 0.109, 0.101),
      this.lod.sphereSeg,
      this.lod.sphereStack,
      skin,
      head,
    );
    this.mb.ellipsoid(
      MAT.SKIN,
      new THREE.Vector3(0, 1.588, 0.026),
      new THREE.Vector3(0.069, 0.058, 0.087),
      Math.max(9, this.lod.sphereSeg - 10),
      Math.max(6, this.lod.sphereStack - 7),
      this.damp(this.p.skin, 0.07),
      head,
    );
    if (!this.kit) return;

    if (this.spec.face === 'balaclava') {
      // Hood over the whole head below the brow. Reads as a solid dark mass,
      // which is exactly the point of one.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.632, 0.012),
        new THREE.Vector3(0.084, 0.1, 0.098),
        Math.max(9, this.lod.sphereSeg - 8),
        Math.max(6, this.lod.sphereStack - 6),
        col(this.p.scarf),
        head,
        null,
        -1,
        0.62,
        this.lump(0.035, 73, 3),
      );
    } else if (this.spec.face === 'beard') {
      this.mb.ellipsoid(
        MAT.SKIN,
        new THREE.Vector3(0, 1.586, 0.018),
        new THREE.Vector3(0.072, 0.062, 0.09),
        Math.max(9, this.lod.sphereSeg - 10),
        Math.max(6, this.lod.sphereStack - 7),
        col(0x2b211a),
        head,
        null,
        -1,
        0.12,
        this.lump(0.06, 75, 4),
      );
    }

    if (!this.fine) return;

    /*
     * Brow, nose, cheeks, chin, ears and eyes.
     *
     * Every one of these has to be measured against the surface it sits on, and
     * the first pass of them was not: the skull is an ellipsoid 0.101 m deep and
     * the eyes were boxes centred 0.081 m out with an 0.008 m half-depth, so
     * their front faces stopped 7 mm inside the head and never rendered at all.
     * The mouth was the same, 5 mm inside the jaw. The face therefore filmed as
     * a blank ovoid however much detail was nominally on it — which is the single
     * most mannequin thing about a figure, because a face is where the eye goes
     * first. The z of each part below is the surface at its own height plus what
     * the feature ought to stand proud by: 9 mm for a brow ridge, 10 for a nose,
     * 3 for an eyeball, 3 for a lip.
     */
    const faceSkin = this.damp(this.p.skin, 0.06);
    // Brow, tilted down at the front so it shades the sockets under it.
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.687, 0.092),
      new THREE.Vector3(0.058, 0.013, 0.018),
      quatXZ(0.22, 0),
      this.damp(this.p.skin, 0.1),
      head,
      0.006,
    );
    // Nose in two parts: the bridge from between the brows, and the wider block
    // of the tip and nostrils under it. One box is a wedge on a face.
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.664, 0.098),
      new THREE.Vector3(0.011, 0.02, 0.016),
      null,
      faceSkin,
      head,
      0.005,
    );
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.638, 0.101),
      new THREE.Vector3(0.018, 0.016, 0.019),
      null,
      skin,
      head,
      0.008,
    );
    for (const sx of [1, -1]) {
      // Eyeball, standing 3 mm out of the socket, dark enough to read as an eye
      // in shadow at three metres.
      this.mb.ellipsoid(
        MAT.SKIN,
        new THREE.Vector3(sx * 0.031, 1.664, 0.089),
        new THREE.Vector3(0.014, 0.0105, 0.012),
        9,
        6,
        col(0x241d19),
        head,
      );
      // Cheekbone, which is what gives a face a plane to catch the sun on.
      this.mb.ellipsoid(
        MAT.SKIN,
        new THREE.Vector3(sx * 0.05, 1.628, 0.068),
        new THREE.Vector3(0.026, 0.021, 0.028),
        10,
        6,
        this.scuff(this.p.skin, 0.06),
        head,
      );
      this.mb.ellipsoid(
        MAT.SKIN,
        new THREE.Vector3(sx * 0.077, 1.652, -0.008),
        new THREE.Vector3(0.012, 0.03, 0.021),
        8,
        5,
        this.damp(this.p.skin, 0.1),
        head,
      );
    }
    if (this.spec.face !== 'balaclava' && this.spec.face !== 'beard') {
      // Upper lip and the point of the chin, both on the jaw ellipsoid rather
      // than the skull, which is 3 cm further forward at this height.
      this.mb.box(
        MAT.SKIN,
        new THREE.Vector3(0, 1.598, 0.108),
        new THREE.Vector3(0.024, 0.007, 0.008),
        null,
        col(0x53342b),
        head,
        0.002,
      );
      this.mb.box(
        MAT.SKIN,
        new THREE.Vector3(0, 1.558, 0.096),
        new THREE.Vector3(0.021, 0.014, 0.014),
        null,
        faceSkin,
        head,
        0.006,
      );
    }

    // Headset: a boom mic across the cheek and a cup over the ear. Two small
    // parts, both of which cross the outline of the face.
    if (this.spec.headset) {
      for (const sx of [1, -1]) {
        this.mb.ellipsoid(
          MAT.HARD,
          new THREE.Vector3(sx * 0.086, 1.646, -0.006),
          new THREE.Vector3(0.018, 0.036, 0.03),
          9,
          6,
          col(0x1c1d1b),
          head,
        );
      }
      this.mb.cord(
        MAT.RUBBER,
        [
          new THREE.Vector3(0.088, 1.632, 0.014),
          new THREE.Vector3(0.07, 1.606, 0.06),
          new THREE.Vector3(0.04, 1.596, 0.086),
        ],
        0.0055,
        4,
        col(0x171816),
        head,
      );
      this.mb.ellipsoid(
        MAT.HARD,
        new THREE.Vector3(0.034, 1.594, 0.092),
        new THREE.Vector3(0.011, 0.011, 0.011),
        7,
        5,
        col(0x22231f),
        head,
      );
    }
  }

  /**
   * A combat helmet is not a dome.
   *
   * Its brim is swept up at the front and down at the back, it flares over the
   * ears, and the cover on it is a sewn thing with a seam over the crown and
   * loops all over it. The first pass drew a smooth hemisphere and it is the
   * single part of the model the review named twice — a smooth dome above a
   * smooth torso is the whole shop-dummy read. The shell here is warped into
   * that profile and then loaded with the things that actually hang off one.
   */
  private headgear(): void {
    const head = bind1(B.head);
    const cover = this.soil(this.p.cover, 1.67, 0.02);
    const coverDark = col(this.p.cover, -0.24);

    if (this.spec.headgear === 'helmet') {
      // `a` runs +X (his left) through +Z (front) to -X and -Z (back), and `t`
      // climbs from the brim to the crown.
      const shell: Warp = (a, t) => {
        const low = (1 - t) * (1 - t);
        const rear = 0.5 - 0.5 * Math.sin(a);
        const ear = Math.abs(Math.cos(a));
        return (
          1 +
          low * (0.085 * rear + 0.042 * ear) +
          0.024 * Math.sin(4 * a + 0.7) * t +
          0.016 * Math.cos(6 * a) * (1 - t)
        );
      };
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.671, 0.0),
        new THREE.Vector3(0.104, 0.113, 0.116),
        this.lod.sphereSeg,
        Math.max(6, this.lod.sphereStack - 1),
        cover,
        head,
        null,
        -0.42,
        1,
        shell,
      );
      // Rim, which is what gives a helmet its hard edge against the face. Built
      // with the same warp so it follows the brim rather than cutting across it.
      this.mb.ellipsoid(
        MAT.HARD,
        new THREE.Vector3(0, 1.671, 0.0),
        new THREE.Vector3(0.107, 0.116, 0.119),
        this.lod.sphereSeg,
        3,
        coverDark,
        head,
        null,
        -0.46,
        -0.36,
        shell,
      );
      if (this.kit) {
        // Cover seam over the crown, front to back.
        this.mb.cord(
          MAT.FABRIC,
          [
            new THREE.Vector3(0, 1.702, 0.113),
            new THREE.Vector3(0, 1.782, 0.05),
            new THREE.Vector3(0, 1.788, -0.03),
            new THREE.Vector3(0, 1.73, -0.108),
          ],
          0.007,
          Math.max(4, this.lod.seg - 14),
          coverDark,
          head,
          UP_X,
        );
        // Counterweight pouch on the back, which every helmet with anything
        // mounted on the front carries and which changes the profile completely.
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(0, 1.688, -0.118),
          new THREE.Vector3(0.05, 0.042, 0.03),
          quatX(-0.25),
          this.soil(this.p.vestDark, 1.69),
          head,
          0.014,
        );
        // Side rails.
        for (const sx of [1, -1]) {
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(sx * 0.104, 1.664, 0.014),
            new THREE.Vector3(0.008, 0.017, 0.058),
            null,
            col(this.p.gunDark),
            head,
            0.003,
          );
        }
        // Front mount plate: everything else bolts to this.
        this.mb.box(
          MAT.HARD,
          new THREE.Vector3(0, 1.716, 0.096),
          new THREE.Vector3(0.03, 0.02, 0.022),
          quatX(0.3),
          col(this.p.gunDark),
          head,
          0.007,
        );
      }
      if (this.fine) {
        if (this.spec.nvg) {
          // Arm and monocular, folded up onto the front of the helmet.
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(0, 1.752, 0.086),
            new THREE.Vector3(0.017, 0.032, 0.015),
            quatX(0.35),
            col(this.p.gun),
            head,
            0.005,
          );
          this.mb.tube(
            MAT.HARD,
            [
              { p: new THREE.Vector3(0, 1.78, 0.076), rx: 0.023, rz: 0.023, bind: head, color: col(this.p.gunDark) },
              { p: new THREE.Vector3(0, 1.786, 0.132), rx: 0.021, rz: 0.021, bind: head, color: col(this.p.gun) },
            ],
            9,
            UP_Y,
            true,
            true,
          );
        }
        if (this.spec.goggles) {
          // Band round the shell, with the goggle body sitting on the brow.
          this.mb.ellipsoid(
            MAT.RUBBER,
            new THREE.Vector3(0, 1.671, 0.0),
            new THREE.Vector3(0.108, 0.117, 0.12),
            this.lod.sphereSeg,
            3,
            col(0x1c1d1a),
            head,
            null,
            0.14,
            0.3,
            shell,
          );
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(0, 1.712, 0.106),
            new THREE.Vector3(0.064, 0.028, 0.026),
            quatX(0.22),
            col(0x2b3a3f),
            head,
            0.013,
          );
        }
        // Elastic band round the cover with scrim tabs and an IR strobe on it —
        // four small lumps at the widest part of the head, which is where the
        // outline is otherwise a perfect arc.
        for (const a of [0.7, 2.3, 3.9, 5.4]) {
          this.mb.box(
            MAT.FABRIC,
            new THREE.Vector3(Math.cos(a) * 0.1, 1.7 + Math.sin(a * 3) * 0.012, Math.sin(a) * 0.112),
            new THREE.Vector3(0.016, 0.014, 0.016),
            null,
            a > 3 ? this.damp(this.p.cover, 0.22) : this.soil(this.p.scarf, 1.7, 0.06),
            head,
            0.004,
          );
        }
        this.mb.box(
          MAT.HARD,
          new THREE.Vector3(-0.058, 1.744, -0.078),
          new THREE.Vector3(0.014, 0.01, 0.014),
          null,
          col(0x2f3a2c),
          head,
          0.004,
        );
        // Bungee across the crown, hooked either side.
        this.mb.cord(
          MAT.RUBBER,
          [
            new THREE.Vector3(-0.098, 1.7, 0.052),
            new THREE.Vector3(-0.03, 1.766, 0.078),
            new THREE.Vector3(0.045, 1.762, 0.07),
            new THREE.Vector3(0.098, 1.698, 0.046),
          ],
          0.005,
          4,
          col(0x18191a),
          head,
        );
        // Chinstrap, both sides plus the cup under the jaw.
        for (const sx of [1, -1]) {
          this.mb.strap(
            MAT.FABRIC,
            [
              new THREE.Vector3(sx * 0.092, 1.632, 0.03),
              new THREE.Vector3(sx * 0.074, 1.582, 0.05),
              new THREE.Vector3(sx * 0.03, 1.545, 0.062),
            ],
            0.018,
            0.004,
            UP_Y,
            col(this.p.webbing),
            head,
          );
        }
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(0, 1.542, 0.058),
          new THREE.Vector3(0.03, 0.016, 0.022),
          quatX(0.4),
          col(this.p.webbing),
          head,
          0.006,
        );
      }
    } else if (this.spec.headgear === 'cap') {
      // Ball cap, worn backwards-brim-forward and creased down the crown.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.66, 0.004),
        new THREE.Vector3(0.086, 0.098, 0.098),
        Math.max(9, this.lod.sphereSeg - 8),
        Math.max(5, this.lod.sphereStack - 6),
        cover,
        head,
        null,
        -0.1,
        1,
        (a, t) => 1 + 0.03 * Math.cos(2 * a) * t + 0.02 * Math.sin(4 * a + 1.1),
      );
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.664, 0.118),
        new THREE.Vector3(0.076, 0.009, 0.054),
        quatX(0.16),
        coverDark,
        head,
        0.016,
      );
      if (this.fine) {
        // Sunglasses pushed up onto the brim, and the seam over the crown.
        this.mb.box(
          MAT.HARD,
          new THREE.Vector3(0, 1.688, 0.088),
          new THREE.Vector3(0.062, 0.014, 0.022),
          quatX(0.3),
          col(0x181a1c),
          head,
          0.008,
        );
        this.mb.cord(
          MAT.FABRIC,
          [
            new THREE.Vector3(0, 1.7, 0.09),
            new THREE.Vector3(0, 1.756, 0.02),
            new THREE.Vector3(0, 1.716, -0.078),
          ],
          0.006,
          4,
          coverDark,
          head,
          UP_X,
        );
      }
    } else {
      // Head wrap: cloth wound round the skull, so the profile is lumpy and
      // asymmetric where a helmet's is regular, with a brow band and a tail.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.664, 0.002),
        new THREE.Vector3(0.094, 0.108, 0.104),
        Math.max(9, this.lod.sphereSeg - 6),
        Math.max(6, this.lod.sphereStack - 5),
        cover,
        head,
        null,
        -0.22,
        1,
        (a, t) => 1 + 0.055 * Math.sin(3 * a + 0.9 + t * 2.4) + 0.03 * Math.cos(5 * a - 0.4),
      );
      this.mb.tube(
        MAT.FABRIC,
        [
          { p: new THREE.Vector3(0, 1.706, 0.002), rx: 0.098, rz: 0.106, bind: head, color: coverDark },
          { p: new THREE.Vector3(0, 1.664, 0.002), rx: 0.101, rz: 0.109, bind: head, color: coverDark },
        ],
        Math.max(9, this.lod.sphereSeg - 6),
        UP_Z,
        false,
        false,
        (a) => 1 + 0.05 * Math.sin(3 * a + 2.1),
      );
      // Knot and tail at the back, hanging clear of the shoulders.
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0.026, 1.632, -0.098),
        new THREE.Vector3(0.038, 0.032, 0.03),
        quatXZ(0.2, 0.4),
        this.damp(this.p.cover, 0.14),
        head,
        0.012,
      );
      if (this.kit) {
        this.mb.strap(
          MAT.FABRIC,
          [
            new THREE.Vector3(0.03, 1.61, -0.1),
            new THREE.Vector3(0.052, 1.55, -0.12),
            new THREE.Vector3(0.066, 1.49, -0.1),
            new THREE.Vector3(0.058, 1.45, -0.06),
          ],
          0.062,
          0.008,
          UP_X,
          this.damp(this.p.cover, 0.2),
          head,
        );
      }
      // Face wrap over the mouth and jaw.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.585, 0.028),
        new THREE.Vector3(0.079, 0.056, 0.091),
        Math.max(9, this.lod.sphereSeg - 10),
        Math.max(5, this.lod.sphereStack - 7),
        coverDark,
        head,
        null,
        -1,
        0.5,
        this.lump(0.05, 81, 3),
      );
    }
  }

  /* -------------------------------- rifle -------------------------------- */

  /**
   * The carbine, authored around the weapon bone in bind space and skinned
   * entirely to it. The aim solver drives that bone and the arms are then
   * inverse-kinematically pulled onto the two grip points, which is the only
   * arrangement where the hands stay on the gun through a whole animation.
   */
  private rifle(): void {
    const w = jp('weapon');
    const gun = col(this.p.gun);
    const dark = col(this.p.gunDark);
    const bind = bind1(B.weapon);
    const at = (x: number, y: number, z: number): THREE.Vector3 =>
      new THREE.Vector3(w.x + x, w.y + y, w.z + z);
    const seg = Math.max(6, this.lod.seg - 6);

    // Receiver, rail and stock.
    this.mb.box(MAT.HARD, at(0, 0, 0.06), new THREE.Vector3(0.026, 0.039, 0.082), null, gun, bind, 0.007);
    this.mb.box(MAT.HARD, at(0, 0.042, 0.075), new THREE.Vector3(0.014, 0.007, 0.095), null, dark, bind, 0.003);
    this.mb.box(MAT.HARD, at(0, -0.012, -0.105), new THREE.Vector3(0.021, 0.034, 0.078), null, dark, bind, 0.01);
    this.mb.box(MAT.HARD, at(0, -0.02, -0.188), new THREE.Vector3(0.024, 0.046, 0.014), null, dark, bind, 0.008);
    this.mb.tube(
      MAT.HARD,
      [
        { p: at(0, 0.006, -0.02), rx: 0.019, rz: 0.019, bind, color: gun },
        { p: at(0, 0.002, -0.1), rx: 0.018, rz: 0.018, bind, color: gun },
      ],
      seg,
      UP_Y,
      false,
      false,
    );

    // Pistol grip, tilted back the way a real one is.
    this.mb.box(
      MAT.HARD,
      at(0, -0.072, -0.002),
      new THREE.Vector3(0.021, 0.05, 0.026),
      quatX(0.3),
      dark,
      bind,
      0.009,
    );
    this.mb.box(MAT.HARD, at(0, -0.044, 0.038), new THREE.Vector3(0.008, 0.02, 0.026), null, dark, bind, 0.004);

    // Curved magazine, three boxes stepping forward as they go down.
    for (let i = 0; i < 3; i++) {
      this.mb.box(
        MAT.HARD,
        at(0, -0.065 - i * 0.058, 0.078 + i * 0.017),
        new THREE.Vector3(0.017, 0.034 - i * 0.003, 0.032 - i * 0.002),
        quatX(0.12 + i * 0.12),
        i === 2 ? dark : gun,
        bind,
        0.006,
      );
    }

    // Handguard, barrel and flash hider.
    this.mb.tube(
      MAT.HARD,
      [
        { p: at(0, 0, 0.145), rx: 0.031, rz: 0.031, bind, color: gun },
        { p: at(0, 0, 0.33), rx: 0.029, rz: 0.029, bind, color: gun },
      ],
      seg + 2,
      UP_Y,
      true,
      true,
    );
    this.mb.box(MAT.HARD, at(0, 0.034, 0.24), new THREE.Vector3(0.013, 0.006, 0.09), null, dark, bind, 0.003);
    this.mb.tube(
      MAT.HARD,
      [
        { p: at(0, 0, 0.33), rx: 0.011, rz: 0.011, bind, color: dark },
        { p: at(0, 0, 0.43), rx: 0.01, rz: 0.01, bind, color: dark },
      ],
      seg,
      UP_Y,
      false,
      false,
    );
    this.mb.tube(
      MAT.HARD,
      [
        { p: at(0, 0, 0.43), rx: 0.017, rz: 0.017, bind, color: dark },
        { p: at(0, 0, 0.467), rx: 0.016, rz: 0.016, bind, color: dark },
      ],
      seg,
      UP_Y,
      false,
      true,
    );

    if (!this.fine) return;
    // Gas block, optic and its lens.
    this.mb.box(MAT.HARD, at(0, 0.03, 0.348), new THREE.Vector3(0.013, 0.024, 0.019), null, dark, bind, 0.004);
    this.mb.box(MAT.HARD, at(0, 0.072, 0.082), new THREE.Vector3(0.019, 0.026, 0.046), null, gun, bind, 0.008);
    this.mb.box(MAT.HARD, at(0, 0.074, 0.035), new THREE.Vector3(0.014, 0.017, 0.005), null, col(0x14313a), bind, 0.003);
    this.mb.box(MAT.HARD, at(0, 0.052, 0.082), new THREE.Vector3(0.015, 0.018, 0.028), null, dark, bind, 0.004);
    // Sling loop and charging handle.
    this.mb.box(MAT.HARD, at(0.024, 0.03, -0.026), new THREE.Vector3(0.024, 0.008, 0.008), null, dark, bind, 0.003);
  }

  /* -------------------------------- helper ------------------------------- */

  private ring(
    a: THREE.Vector3,
    b: THREE.Vector3,
    t: number,
    rx: number,
    rz: number,
    bind: Binding,
    color: THREE.Color,
  ): Ring {
    return { p: a.clone().lerp(b, t), rx, rz, bind, color };
  }
}

/* ------------------------------- assets ---------------------------------- */

export interface VariantAssets {
  spec: VariantSpec;
  lod0: THREE.BufferGeometry;
  lod1: THREE.BufferGeometry;
  lod2: THREE.BufferGeometry;
  triangles: number;
  trianglesLod1: number;
  trianglesLod2: number;
  /** LOD0 vertices the cavity pass darkened. */
  occluded: number;
}

/**
 * Shared, immutable soldier assets: six variants at three levels of detail,
 * and the four materials they draw with. Built once; every agent instances
 * them and owns only its own skeleton.
 */
export class SoldierAssets {
  readonly variants: VariantAssets[] = [];
  readonly materials: THREE.Material[] = [];
  private owned: THREE.Material[] = [];
  /** Milliseconds the whole set took to author, for the boot readout. */
  readonly buildMs: number;

  constructor(lib: IMaterialLibrary | undefined) {
    const t0 = performance.now();
    this.materials.push(
      this.surface(lib, 'fabric_canvas', 0.92, 0),
      this.surface(lib, 'gun_metal', 0.46, 0.85),
      this.surface(lib, 'rubber', 0.85, 0.02),
      this.skin(),
    );
    for (const spec of VARIANTS) {
      const a = new SoldierBuilder(spec, LOD0).build();
      const b = new SoldierBuilder(spec, LOD1).build();
      const c = new SoldierBuilder(spec, LOD2).build();
      this.variants.push({
        spec,
        lod0: a.geometry,
        lod1: b.geometry,
        lod2: c.geometry,
        triangles: a.triangles,
        trianglesLod1: b.triangles,
        trianglesLod2: c.triangles,
        occluded: a.occluded,
      });
    }
    this.buildMs = performance.now() - t0;
  }

  private surface(
    lib: IMaterialLibrary | undefined,
    name: MaterialName,
    roughness: number,
    metalness: number,
  ): THREE.Material {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness,
      metalness,
    });
    if (lib) {
      try {
        const tex = lib.textures(name);
        // Deliberately no albedo map. The library's is a finished colour —
        // canvas that is already the colour of canvas — and so are the palette
        // vertex colours; three multiplies the two and the result is a fifth as
        // bright as either meant, which is how the first pass of these men came
        // out as black cut-outs standing in full sun. Dividing the map through
        // by its own mean would keep the weave, but these are render targets
        // and there is no cheap way to read one back. What actually sells cloth
        // under a hard sun is the relief and the roughness break-up rather than
        // the albedo grain, and those two maps are kept.
        mat.normalMap = tex.normalMap;
        mat.roughnessMap = tex.armMap;
        mat.metalnessMap = tex.armMap;
        mat.normalScale.set(0.7, 0.7);
      } catch {
        /* the flat material is a perfectly good fallback */
      }
    }
    mat.name = `soldier_${name}`;
    this.owned.push(mat);
    return mat;
  }

  private skin(): THREE.Material {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.62,
      metalness: 0,
    });
    mat.name = 'soldier_skin';
    this.owned.push(mat);
    return mat;
  }

  /** Total triangles a soldier costs at each level, for the perf readout. */
  get triangleReport(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const v of this.variants) {
      out[`${v.spec.id}_lod0`] = v.triangles;
      out[`${v.spec.id}_lod1`] = v.trianglesLod1;
      out[`${v.spec.id}_lod2`] = v.trianglesLod2;
    }
    return out;
  }

  dispose(): void {
    for (const v of this.variants) {
      v.lod0.dispose();
      v.lod1.dispose();
      v.lod2.dispose();
    }
    for (const m of this.owned) m.dispose();
    this.owned.length = 0;
    this.variants.length = 0;
  }
}

/* ------------------------------ instancing -------------------------------- */

export interface SoldierInstance {
  root: THREE.Group;
  bones: THREE.Bone[];
  skeleton: THREE.Skeleton;
  /** Indexed by LOD band: 0 near, 1 mid, 2 far. Exactly one is ever visible. */
  meshes: THREE.SkinnedMesh[];
  variant: VariantAssets;
}

/**
 * One soldier in the scene. All three levels of detail bind the same skeleton,
 * so switching between them is a visibility flip with no pose transfer.
 */
export function createSoldier(assets: SoldierAssets, variantIndex: number): SoldierInstance {
  const variant = assets.variants[variantIndex % assets.variants.length];
  const root = new THREE.Group();
  root.name = `soldier_${variant.spec.id}`;
  const bones = createBones();
  const skeleton = new THREE.Skeleton(bones, inverseBinds());
  root.add(bones[0]);

  const meshes: THREE.SkinnedMesh[] = [];
  const geo = [variant.lod0, variant.lod1, variant.lod2];
  for (let i = 0; i < geo.length; i++) {
    const mesh = new THREE.SkinnedMesh(geo[i], assets.materials);
    mesh.castShadow = true;
    // Only the near mesh takes shadows onto itself; at the mid switch the
    // figure is 34 m away and the self-shadow term is under a pixel.
    mesh.receiveShadow = i === 0;
    mesh.frustumCulled = false;
    mesh.visible = i === 0;
    mesh.bindMode = THREE.AttachedBindMode;
    root.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
    meshes.push(mesh);
  }

  root.scale.setScalar(variant.spec.height);
  return { root, bones, skeleton, meshes, variant };
}

/** Shows exactly the mesh for this LOD band and hides the other two. */
export function showLod(instance: SoldierInstance, lod: number): void {
  const want = lod < 0 ? 0 : lod > 2 ? 2 : lod;
  if (instance.meshes[want].visible) return;
  for (let i = 0; i < instance.meshes.length; i++) instance.meshes[i].visible = i === want;
}

/* ------------------------------- measurement ------------------------------ */

export interface VariantMeasure {
  id: string;
  triangles: number;
  trianglesLod1: number;
  trianglesLod2: number;
  /** Floor to the crown of the skull, ignoring headgear. */
  stature: number;
  /** Crown to the underside of the jaw. */
  headHeight: number;
  /** Ear to ear. */
  headWidth: number;
  /** Stature in head heights; a man is about 7.5. */
  headsTall: number;
  /** Deltoid to deltoid in head heights; a man in a carrier is 2.2 to 2.4. */
  shouldersInHeads: number;
  /** Neck diameter over skull breadth; a fit male is about 0.8. */
  neckOverHead: number;
  /** Longest axis of the gloved fist in head heights; a fist is about 0.62. */
  handInHeads: number;
  /** Albedo mean and standard deviation over the cloth, sRGB encoded, 0-255. */
  clothMean: number;
  clothSd: number;
  /** Volumes standing more than 15 mm outside the body surface. */
  kitVolumes: number;
  /**
   * Millimetres of fold relief on a trouser leg: the peak-to-peak swing of the
   * mean radius from one 15 mm height band to the next, down the shin. A leg
   * swept from a smooth profile reads a fraction of a millimetre here whatever
   * its cross-section is doing, which is what a shrink-wrapped limb is.
   */
  clothReliefMm: number;
}

/**
 * Reads the figures off the built geometry.
 *
 * Every one of these is a claim the review made against the first pass and
 * every one of them was wrong by an amount nobody can see by eye but which adds
 * up to "that is not a man". Head-to-body ratio is the one it named as the
 * commonest error, and the first pass measured 6.98 heads tall against the 7.5 a
 * man is — except that 6.98 was itself measured wrong, over a bounding box with
 * a helmet in it, and the honest figure was 7.46. That is exactly why this is
 * code and not a comment: a proportion you check by eye against a screenshot is
 * a proportion you will get wrong twice.
 */
export function measureVariants(assets: SoldierAssets): VariantMeasure[] {
  const out: VariantMeasure[] = [];
  const encode = (x: number): number =>
    x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

  for (const v of assets.variants) {
    const geo = v.lod0;
    const pos = geo.getAttribute('position');
    const col = geo.getAttribute('color');
    const si = geo.getAttribute('skinIndex');
    const sw = geo.getAttribute('skinWeight');
    const index = geo.getIndex();
    if (!pos || !col || !si || !sw || !index) continue;

    const dominant = (i: number): number => {
      let bone = si.getX(i);
      let weight = sw.getX(i);
      if (sw.getY(i) > weight) {
        weight = sw.getY(i);
        bone = si.getY(i);
      }
      if (sw.getZ(i) > weight) {
        weight = sw.getZ(i);
        bone = si.getZ(i);
      }
      return bone;
    };

    let crown = -Infinity;
    let chin = Infinity;
    let headL = -Infinity;
    let headR = Infinity;
    let handMin = Infinity;
    let handMax = -Infinity;
    let neckMin = Infinity;
    let neckMax = -Infinity;
    const hand = new THREE.Box3().makeEmpty();
    let sum = 0;
    let sum2 = 0;
    let count = 0;
    // Shoulders at the deltoid rather than the widest thing on the man, which is
    // a hanging hand or a dump pouch.
    let shoulderL = -Infinity;
    let shoulderR = Infinity;

    for (const group of geo.groups) {
      const mat = group.materialIndex ?? 0;
      const seen = new Set<number>();
      for (let i = group.start; i < group.start + group.count; i++) seen.add(index.getX(i));
      for (const i of seen) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const bone = dominant(i);
        if (y > 1.34 && y < 1.44) {
          shoulderL = Math.max(shoulderL, x);
          shoulderR = Math.min(shoulderR, x);
        }
        if (mat === MAT.SKIN && bone === B.head) {
          crown = Math.max(crown, y);
          chin = Math.min(chin, y);
          headL = Math.max(headL, x);
          headR = Math.min(headR, x);
        }
        if (mat === MAT.SKIN && bone === B.neck) {
          neckMin = Math.min(neckMin, x);
          neckMax = Math.max(neckMax, x);
        }
        if (bone === B.handL) {
          hand.expandByPoint(_v.set(x, y, pos.getZ(i)));
          handMin = Math.min(handMin, y);
          handMax = Math.max(handMax, y);
        }
        if (mat === MAT.FABRIC) {
          const l =
            255 *
            (0.299 * encode(col.getX(i)) +
              0.587 * encode(col.getY(i)) +
              0.114 * encode(col.getZ(i)));
          sum += l;
          sum2 += l * l;
          count++;
        }
      }
    }

    const headHeight = crown - chin;
    hand.getSize(_v2);
    const mean = sum / Math.max(1, count);
    out.push({
      id: v.spec.id,
      triangles: v.triangles,
      trianglesLod1: v.trianglesLod1,
      trianglesLod2: v.trianglesLod2,
      stature: crown,
      headHeight,
      headWidth: headL - headR,
      headsTall: crown / headHeight,
      shouldersInHeads: (shoulderL - shoulderR) / headHeight,
      neckOverHead: (neckMax - neckMin) / (headL - headR),
      handInHeads: Math.max(_v2.x, _v2.y, _v2.z) / headHeight,
      clothMean: mean,
      clothSd: Math.sqrt(Math.max(0, sum2 / Math.max(1, count) - mean * mean)),
      kitVolumes: countKit(v.spec),
      clothReliefMm: shinRelief(geo),
    });
  }
  return out;
}

/**
 * Fold depth on the left shin, in millimetres.
 *
 * The trouser is swept as a stack of rings and the leg stands vertical in bind
 * pose, so every vertex at one height is one ring and the mean distance of that
 * ring's vertices from the leg's axis is its radius. A crease running round the
 * leg makes that radius rise and fall from ring to ring; a smooth sweep makes it
 * follow a straight taper. What is reported is each ring's departure from the
 * chord between its two neighbours, averaged — which is the depth of the fold and
 * not the size of the leg, and which is insensitive to the uneven ring spacing
 * because the chord is evaluated at the ring's own height.
 *
 * An earlier version of this binned by 15 mm of height instead of by ring, and
 * read 34 mm on a leg with 4 mm folds in it, because a band with two rings in it
 * averages two radii and a band with one averages one. The number was measuring
 * the ring spacing.
 */
function shinRelief(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute('position');
  const si = geo.getAttribute('skinIndex');
  const sw = geo.getAttribute('skinWeight');
  const index = geo.getIndex();
  if (!pos || !si || !sw || !index) return 0;
  // Along the shin's own axis rather than up the world, because the ankle sits
  // forward of the knee and the rings are square to the bone, not to the floor.
  const knee = BONES[B.calfL];
  const ankle = BONES[B.footL];
  const ax = new THREE.Vector3(ankle.x - knee.x, ankle.y - knee.y, ankle.z - knee.z);
  const len = ax.length();
  if (len < 1e-4) return 0;
  ax.multiplyScalar(1 / len);
  // Clear of the knee at the top and the blouse over the boot at the bottom, so
  // this is the plain shin and nothing else.
  const T0 = 0.15;
  const T1 = 0.75;
  const rings = new Map<number, { sum: number; count: number; along: number }>();
  for (const group of geo.groups) {
    if ((group.materialIndex ?? 0) !== MAT.FABRIC) continue;
    const seen = new Set<number>();
    for (let i = group.start; i < group.start + group.count; i++) seen.add(index.getX(i));
    for (const i of seen) {
      let bone = si.getX(i);
      let weight = sw.getX(i);
      if (sw.getY(i) > weight) {
        weight = sw.getY(i);
        bone = si.getY(i);
      }
      // Only cloth bound wholly to the shin. The knee cap and the pad straps
      // blend half and half with the thigh, and they sit far enough off the
      // trouser's own radius to swamp the fold this is looking for.
      if (bone !== B.calfL || weight < 0.85) continue;
      _v.set(pos.getX(i) - knee.x, pos.getY(i) - knee.y, pos.getZ(i) - knee.z);
      const along = _v.dot(ax) / len;
      if (along < T0 || along > T1) continue;
      // Distance from the axis, which is the ring's radius at this angle.
      const key = Math.round(along * 5000);
      const slot = rings.get(key) ?? { sum: 0, count: 0, along };
      slot.sum += _v.addScaledVector(ax, -_v.dot(ax)).length();
      slot.count++;
      rings.set(key, slot);
    }
  }
  const stack = [...rings.values()]
    .filter((s) => s.count > 8)
    .map((s) => ({ y: s.along * len, r: s.sum / s.count }))
    .sort((a, b) => a.y - b.y);
  if (stack.length < 4) return 0;
  let acc = 0;
  for (let i = 1; i < stack.length - 1; i++) {
    const a = stack[i - 1];
    const b = stack[i];
    const c = stack[i + 1];
    const span = c.y - a.y;
    const chord = span > 1e-6 ? a.r + ((c.r - a.r) * (b.y - a.y)) / span : (a.r + c.r) * 0.5;
    acc += Math.abs(b.r - chord);
  }
  return ((acc / (stack.length - 2)) * 1000) / 1;
}

/**
 * How many separate things stand proud of the body on this variant.
 *
 * Counted from the spec rather than the geometry, because "is this vertex part
 * of a pouch or part of a shoulder" is not a question a vertex can answer, and
 * the number that matters is how many discrete interruptions the outline has.
 */
function countKit(spec: VariantSpec): number {
  let n = 0;
  // Fixed on every man: two cargo pockets, two shoulder pockets, belt buckle,
  // dump pouch, canteen, admin pouch, IFAK, rear utility pouch, two shoulder
  // yokes, sling, two grenades, four boot caps, holster or bayonet.
  n += 20;
  n += spec.mags;
  if (spec.kneePads) n += 2;
  if (spec.sleeves === 'down') n += 2;
  if (spec.radio) n += 3;
  if (spec.hydration) n += 2;
  if (spec.headset) n += 3;
  if (spec.backLoad !== 'none') n += 4;
  if (spec.face !== 'none') n += 1;
  if (spec.headgear === 'helmet') n += 9;
  else n += 2;
  if (spec.nvg) n += 2;
  if (spec.goggles) n += 2;
  return n;
}

export { BONE_COUNT, BONES };
