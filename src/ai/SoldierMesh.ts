import * as THREE from 'three';
import type { IMaterialLibrary, MaterialName } from '../core/Interfaces';
import { B, BONES, BONE_COUNT, bindPos, createBones, inverseBinds } from './SoldierSkeleton';
import { MeshBuilder, bind1, bind2, bind3, type Binding, type Ring } from './MeshBuilder';

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
 * Three variants exist so a squad is not eight copies of one man: a regular in
 * a plate carrier and a covered helmet, a heavier assaulter with night vision
 * and goggles, and an irregular in a chest rig and a head wrap. They share the
 * skeleton and the material set, differing in geometry, palette and girth.
 *
 * Two levels of detail are built per variant from the same code with different
 * tessellation, and the far one drops the parts nobody can resolve at range —
 * fingers, eyes, rail sections, laces.
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
  /** Multiplier on limb and torso girth, so builds differ. */
  girth: number;
  /** Uniform scale applied to the whole rig, for height variation. */
  height: number;
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
    gun: number;
    gunDark: number;
    pad: number;
  };
}

export const VARIANTS: readonly VariantSpec[] = [
  {
    id: 'regular',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: false,
    goggles: true,
    girth: 1,
    height: 1,
    palette: {
      uniform: 0x6e6a4e,
      uniformDark: 0x4c4a37,
      vest: 0x474a38,
      vestDark: 0x2f3226,
      webbing: 0x3b3d2f,
      pouch: 0x545540,
      skin: 0xa87a5c,
      glove: 0x38352c,
      boot: 0x3a2f26,
      cover: 0x6a6a4c,
      gun: 0x2c2e30,
      gunDark: 0x1b1c1e,
      pad: 0x272723,
    },
  },
  {
    id: 'assaulter',
    headgear: 'helmet',
    vest: 'carrier',
    nvg: true,
    goggles: false,
    girth: 1.07,
    height: 1.025,
    palette: {
      uniform: 0x4f5347,
      uniformDark: 0x35382f,
      vest: 0x2b2d28,
      vestDark: 0x1d1f1b,
      webbing: 0x262822,
      pouch: 0x35372e,
      skin: 0x9a6f4f,
      glove: 0x25231e,
      boot: 0x2a2521,
      cover: 0x40443a,
      gun: 0x26282a,
      gunDark: 0x171819,
      pad: 0x1e1f1c,
    },
  },
  {
    id: 'irregular',
    headgear: 'wrap',
    vest: 'rig',
    nvg: false,
    goggles: false,
    girth: 0.94,
    height: 0.975,
    palette: {
      uniform: 0x7d6f56,
      uniformDark: 0x5a5040,
      vest: 0x4a3f2f,
      vestDark: 0x342c21,
      webbing: 0x3f3628,
      pouch: 0x5c5140,
      skin: 0x8f6242,
      glove: 0x6a5a44,
      boot: 0x33291f,
      cover: 0x8a8168,
      gun: 0x3a3226,
      gunDark: 0x201c16,
      pad: 0x2b261f,
    },
  },
];

export interface LodSpec {
  /** Radial segments on a limb tube. */
  seg: number;
  /** Segments and stacks on an ellipsoid. */
  sphereSeg: number;
  sphereStack: number;
  /** Skip the parts that stop resolving past the LOD switch. */
  detail: boolean;
}

const LOD0: LodSpec = { seg: 16, sphereSeg: 20, sphereStack: 12, detail: true };
const LOD1: LodSpec = { seg: 7, sphereSeg: 9, sphereStack: 6, detail: false };

/* -------------------------------- builder -------------------------------- */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const UP_Z = new THREE.Vector3(0, 0, 1);
const UP_Y = new THREE.Vector3(0, 1, 0);
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
 * Kept light. An earlier pass ran this at a third, on the theory that olive
 * drab was too dark to photograph against sand — but the men were dark because
 * their faces were being culled, not because of the pigment, and all the film
 * did was collapse a carrier, a uniform and a helmet into one sand-coloured
 * mass. Enough to take the factory look off, not enough to lose the palette.
 *
 * Oiled steel and skin shed dust; canvas and webbing hold it.
 */
const DUST = new THREE.Color(0xbdad8c);
const DUST_FABRIC = 0.12;
const DUST_HARD = 0.05;

function weather(p: VariantSpec['palette'], amount: number): VariantSpec['palette'] {
  const film = (hex: number, a = amount): number => new THREE.Color(hex).lerp(DUST, a).getHex();
  return {
    uniform: film(p.uniform),
    uniformDark: film(p.uniformDark),
    vest: film(p.vest),
    vestDark: film(p.vestDark),
    webbing: film(p.webbing),
    pouch: film(p.pouch),
    skin: film(p.skin, DUST_HARD),
    glove: film(p.glove),
    boot: film(p.boot),
    cover: film(p.cover),
    gun: film(p.gun, DUST_HARD),
    gunDark: film(p.gunDark, DUST_HARD),
    pad: film(p.pad, DUST_HARD),
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

function quatX(radians: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(_e.set(radians, 0, 0));
}

class SoldierBuilder {
  private mb: MeshBuilder;
  private p: VariantSpec['palette'];
  private g: number;

  constructor(
    private spec: VariantSpec,
    private lod: LodSpec,
  ) {
    this.mb = new MeshBuilder(MAT_COUNT);
    this.mb.tile = 0.5;
    this.p = weather(spec.palette, DUST_FABRIC);
    this.g = spec.girth;
  }

  build(): { geometry: THREE.BufferGeometry; triangles: number } {
    this.legs('L');
    this.legs('R');
    this.boots('L');
    this.boots('R');
    this.hips();
    this.torso();
    this.vest();
    this.arm('L');
    this.arm('R');
    this.hand('L');
    this.hand('R');
    this.neckAndHead();
    this.headgear();
    this.rifle();
    return {
      geometry: this.mb.build(`soldier_${this.spec.id}_${this.lod.detail ? 'lod0' : 'lod1'}`),
      triangles: this.mb.triangleCount,
    };
  }

  /* --------------------------------- legs ------------------------------- */

  private legs(side: 'L' | 'R'): void {
    const hip = jp(`thigh${side}`);
    const knee = jp(`calf${side}`);
    const ankle = jp(`foot${side}`);
    const g = this.g;
    const cloth = col(this.p.uniform);
    const clothDark = col(this.p.uniformDark);
    const thighBone = B[`thigh${side}`];
    const calfBone = B[`calf${side}`];
    const footBone = B[`foot${side}`];

    const thighRings: Ring[] = [
      this.ring(hip, knee, -0.06, 0.104 * g, 0.108 * g, bind2(thighBone, 0.6, B.pelvis, 0.4), cloth),
      this.ring(hip, knee, 0.1, 0.101 * g, 0.106 * g, bind1(thighBone), cloth),
      this.ring(hip, knee, 0.38, 0.093 * g, 0.098 * g, bind1(thighBone), cloth),
      this.ring(hip, knee, 0.68, 0.083 * g, 0.088 * g, bind1(thighBone), cloth),
      this.ring(hip, knee, 0.92, 0.075 * g, 0.079 * g, bind2(thighBone, 0.55, calfBone, 0.45), clothDark),
    ];
    this.mb.tube(MAT.FABRIC, thighRings, this.lod.seg, UP_Z, true, false);

    const calfRings: Ring[] = [
      this.ring(knee, ankle, 0.02, 0.075 * g, 0.079 * g, bind2(calfBone, 0.6, thighBone, 0.4), clothDark),
      this.ring(knee, ankle, 0.22, 0.074 * g, 0.081 * g, bind1(calfBone), cloth),
      this.ring(knee, ankle, 0.48, 0.063 * g, 0.068 * g, bind1(calfBone), cloth),
      this.ring(knee, ankle, 0.76, 0.055 * g, 0.058 * g, bind1(calfBone), cloth),
      // Trouser bloused over the boot: the flare is what makes the leg read as
      // a soldier's rather than a mannequin's.
      this.ring(knee, ankle, 0.9, 0.066 * g, 0.068 * g, bind2(calfBone, 0.7, footBone, 0.3), cloth),
      this.ring(knee, ankle, 0.98, 0.058 * g, 0.06 * g, bind2(calfBone, 0.5, footBone, 0.5), clothDark),
    ];
    this.mb.tube(MAT.FABRIC, calfRings, this.lod.seg, UP_Z, false, false);

    // Cargo pocket, outboard, with a flap.
    const sx = side === 'L' ? 1 : -1;
    lerpJ(`thigh${side}`, `calf${side}`, 0.44, _v);
    this.mb.box(
      MAT.FABRIC,
      _v.clone().add(new THREE.Vector3(sx * 0.075 * g, 0, 0.012)),
      new THREE.Vector3(0.026, 0.072, 0.062),
      null,
      col(this.p.uniform, -0.08),
      bind1(thighBone),
      0.012,
    );
    if (this.lod.detail) {
      this.mb.box(
        MAT.FABRIC,
        _v.clone().add(new THREE.Vector3(sx * 0.079 * g, 0.062, 0.012)),
        new THREE.Vector3(0.03, 0.014, 0.066),
        null,
        clothDark,
        bind1(thighBone),
        0.006,
      );
    }

    // Trouser over the knee itself. The two tubes stop short of the joint from
    // either side and neither is capped, which is invisible on a straight leg
    // and a hole on a bent one: a crouching soldier photographed at three
    // metres had daylight through the inboard side of his knee, the thigh and
    // the shin having swung apart far enough to see between their open ends.
    // The deltoid caps solve the same problem at the shoulder; this is that.
    lerpJ(`thigh${side}`, `calf${side}`, 1, _v);
    this.mb.ellipsoid(
      MAT.FABRIC,
      _v.clone(),
      new THREE.Vector3(0.074 * g, 0.086, 0.079 * g),
      Math.max(8, this.lod.sphereSeg - 6),
      Math.max(5, this.lod.sphereStack - 5),
      cloth,
      bind2(calfBone, 0.5, thighBone, 0.5),
    );

    // Knee pad, straddling the joint so it deforms with the knee.
    lerpJ(`thigh${side}`, `calf${side}`, 0.99, _v);
    this.mb.ellipsoid(
      MAT.RUBBER,
      _v.clone().add(new THREE.Vector3(0, -0.012, 0.05)),
      new THREE.Vector3(0.068 * g, 0.082, 0.05),
      Math.max(8, this.lod.sphereSeg - 6),
      Math.max(5, this.lod.sphereStack - 5),
      col(this.p.pad),
      bind2(calfBone, 0.5, thighBone, 0.5),
    );
  }

  private boots(side: 'L' | 'R'): void {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * 0.1;
    const footBone = B[`foot${side}`];
    const toeBone = B[`toe${side}`];
    const leather = col(this.p.boot);
    const sole = col(0x1b1815);

    // Ankle collar, blousing under the trouser.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(x, 0.175, -0.004), rx: 0.058, rz: 0.062, bind: bind2(footBone, 0.6, B[`calf${side}`], 0.4), color: leather },
        { p: new THREE.Vector3(x, 0.115, 0.004), rx: 0.06, rz: 0.068, bind: bind1(footBone), color: leather },
      ],
      Math.max(7, this.lod.seg - 4),
      UP_Z,
      false,
      false,
    );

    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(x, 0.072, 0.028),
      new THREE.Vector3(0.057, 0.05, 0.108),
      null,
      leather,
      bind1(footBone),
      0.014,
    );
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(x, 0.05, 0.144),
      new THREE.Vector3(0.05, 0.036, 0.05),
      null,
      leather,
      bind2(toeBone, 0.65, footBone, 0.35),
      0.016,
    );
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.014, 0.042),
      new THREE.Vector3(0.06, 0.014, 0.132),
      null,
      sole,
      bind1(footBone),
      0.006,
    );
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.014, 0.16),
      new THREE.Vector3(0.052, 0.014, 0.04),
      null,
      sole,
      bind2(toeBone, 0.65, footBone, 0.35),
      0.008,
    );
    this.mb.box(
      MAT.RUBBER,
      new THREE.Vector3(x, 0.028, -0.062),
      new THREE.Vector3(0.052, 0.026, 0.042),
      null,
      sole,
      bind1(footBone),
      0.006,
    );
    if (this.lod.detail) {
      for (let i = 0; i < 3; i++) {
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(x, 0.108 - i * 0.026, 0.086 + i * 0.008),
          new THREE.Vector3(0.03, 0.005, 0.006),
          null,
          col(this.p.webbing),
          bind1(footBone),
        );
      }
    }
  }

  /* -------------------------------- torso ------------------------------- */

  private hips(): void {
    const g = this.g;
    const cloth = col(this.p.uniform);
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 0.855, 0.004), rx: 0.132 * g, rz: 0.1 * g, bind: bind1(B.pelvis), color: col(this.p.uniformDark) },
        { p: new THREE.Vector3(0, 0.925, 0.004), rx: 0.148 * g, rz: 0.115 * g, bind: bind1(B.pelvis), color: cloth },
        { p: new THREE.Vector3(0, 1.0, 0.006), rx: 0.15 * g, rz: 0.118 * g, bind: bind2(B.pelvis, 0.6, B.spine1, 0.4), color: cloth },
      ],
      this.lod.seg,
      UP_Z,
      true,
      false,
    );

    // Belt and buckle.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 1.005, 0.006), rx: 0.156 * g, rz: 0.124 * g, bind: bind2(B.pelvis, 0.5, B.spine1, 0.5), color: col(this.p.webbing) },
        { p: new THREE.Vector3(0, 1.052, 0.008), rx: 0.158 * g, rz: 0.125 * g, bind: bind2(B.pelvis, 0.4, B.spine1, 0.6), color: col(this.p.webbing) },
      ],
      this.lod.seg,
      UP_Z,
      false,
      false,
    );
    this.mb.box(
      MAT.HARD,
      new THREE.Vector3(0, 1.028, 0.128 * g),
      new THREE.Vector3(0.032, 0.022, 0.012),
      null,
      col(this.p.gun),
      bind1(B.spine1),
      0.005,
    );
    // Dump pouch on the left hip.
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(0.15 * g, 0.985, -0.03),
      new THREE.Vector3(0.032, 0.062, 0.055),
      null,
      col(this.p.pouch),
      bind1(B.pelvis),
      0.016,
    );
    // Holster, right thigh.
    if (this.spec.vest === 'carrier') {
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(-0.152 * g, 0.735, 0.024),
        new THREE.Vector3(0.03, 0.08, 0.042),
        null,
        col(this.p.vest),
        bind1(B.thighR),
        0.012,
      );
      this.mb.box(
        MAT.HARD,
        new THREE.Vector3(-0.152 * g, 0.822, 0.03),
        new THREE.Vector3(0.019, 0.03, 0.014),
        null,
        col(this.p.gunDark),
        bind1(B.thighR),
        0.005,
      );
    }
  }

  private torso(): void {
    const g = this.g;
    const cloth = col(this.p.uniform);
    const rings: Ring[] = [
      { p: new THREE.Vector3(0, 1.0, 0.006), rx: 0.148 * g, rz: 0.117 * g, bind: bind2(B.pelvis, 0.5, B.spine1, 0.5), color: cloth },
      { p: new THREE.Vector3(0, 1.075, 0.006), rx: 0.152 * g, rz: 0.118 * g, bind: bind1(B.spine1), color: cloth },
      { p: new THREE.Vector3(0, 1.14, 0.01), rx: 0.159 * g, rz: 0.121 * g, bind: bind2(B.spine1, 0.5, B.spine2, 0.5), color: cloth },
      { p: new THREE.Vector3(0, 1.205, 0.012), rx: 0.169 * g, rz: 0.125 * g, bind: bind1(B.spine2), color: cloth },
      { p: new THREE.Vector3(0, 1.27, 0.009), rx: 0.179 * g, rz: 0.129 * g, bind: bind2(B.spine2, 0.5, B.chest, 0.5), color: cloth },
      { p: new THREE.Vector3(0, 1.335, 0.006), rx: 0.183 * g, rz: 0.129 * g, bind: bind1(B.chest), color: cloth },
      { p: new THREE.Vector3(0, 1.4, 0.004), rx: 0.171 * g, rz: 0.119 * g, bind: bind2(B.chest, 0.75, B.neck, 0.25), color: cloth },
      { p: new THREE.Vector3(0, 1.452, 0.0), rx: 0.132 * g, rz: 0.101 * g, bind: bind2(B.chest, 0.6, B.neck, 0.4), color: cloth },
      { p: new THREE.Vector3(0, 1.478, -0.002), rx: 0.106 * g, rz: 0.085 * g, bind: bind2(B.chest, 0.4, B.neck, 0.6), color: cloth },
      { p: new THREE.Vector3(0, 1.492, -0.002), rx: 0.072 * g, rz: 0.062 * g, bind: bind2(B.chest, 0.3, B.neck, 0.7), color: cloth },
    ];
    this.mb.tube(MAT.FABRIC, rings, this.lod.seg, UP_Z, false, true);

    // Deltoid caps. Without these the arm tube meets the torso in a hard step
    // and the shoulder reads as broken the moment the arm moves.
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(sx * 0.163 * g, 1.392, 0.008),
        new THREE.Vector3(0.086 * g, 0.1, 0.09 * g),
        Math.max(9, this.lod.sphereSeg - 4),
        Math.max(6, this.lod.sphereStack - 3),
        cloth,
        bind3(B[`arm${side}`], 0.62, B[`clav${side}`], 0.23, B.chest, 0.15),
      );
    }
  }

  private vest(): void {
    const g = this.g;
    const shell = col(this.p.vest);
    const shellDark = col(this.p.vestDark);
    const carrier = this.spec.vest === 'carrier';
    const front = carrier ? 0.152 : 0.142;

    const rings: Ring[] = carrier
      ? [
          { p: new THREE.Vector3(0, 1.115, 0.012), rx: 0.184 * g, rz: 0.138 * g, bind: bind2(B.spine2, 0.65, B.spine1, 0.35), color: shellDark },
          { p: new THREE.Vector3(0, 1.19, 0.014), rx: 0.194 * g, rz: 0.145 * g, bind: bind1(B.spine2), color: shell },
          { p: new THREE.Vector3(0, 1.275, 0.012), rx: 0.2 * g, rz: 0.148 * g, bind: bind2(B.spine2, 0.4, B.chest, 0.6), color: shell },
          { p: new THREE.Vector3(0, 1.355, 0.008), rx: 0.193 * g, rz: 0.141 * g, bind: bind1(B.chest), color: shell },
          { p: new THREE.Vector3(0, 1.402, 0.004), rx: 0.174 * g, rz: 0.124 * g, bind: bind1(B.chest), color: shellDark },
        ]
      : [
          { p: new THREE.Vector3(0, 1.16, 0.012), rx: 0.178 * g, rz: 0.134 * g, bind: bind1(B.spine2), color: shellDark },
          { p: new THREE.Vector3(0, 1.235, 0.014), rx: 0.186 * g, rz: 0.14 * g, bind: bind2(B.spine2, 0.5, B.chest, 0.5), color: shell },
          { p: new THREE.Vector3(0, 1.315, 0.01), rx: 0.188 * g, rz: 0.138 * g, bind: bind1(B.chest), color: shell },
          { p: new THREE.Vector3(0, 1.375, 0.006), rx: 0.176 * g, rz: 0.126 * g, bind: bind1(B.chest), color: shellDark },
        ];
    this.mb.tube(MAT.FABRIC, rings, this.lod.seg, UP_Z, true, true);

    // Magazine pouches across the front.
    const pouch = col(this.p.pouch);
    const magCount = carrier ? 3 : 4;
    for (let i = 0; i < magCount; i++) {
      const x = ((i - (magCount - 1) / 2) / Math.max(1, magCount - 1)) * (carrier ? 0.2 : 0.24);
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(x, carrier ? 1.215 : 1.25, front + 0.032),
        new THREE.Vector3(carrier ? 0.036 : 0.031, 0.058, 0.034),
        null,
        pouch,
        bind1(B.spine2),
        0.012,
      );
      if (this.lod.detail) {
        this.mb.box(
          MAT.FABRIC,
          new THREE.Vector3(x, (carrier ? 1.215 : 1.25) + 0.06, front + 0.03),
          new THREE.Vector3(carrier ? 0.038 : 0.033, 0.012, 0.036),
          null,
          shellDark,
          bind1(B.spine2),
          0.006,
        );
      }
    }

    // Admin pouch and a radio on the back, so the silhouette is not symmetric.
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(0.06, 1.315, front + 0.026),
      new THREE.Vector3(0.062, 0.036, 0.026),
      null,
      col(this.p.pouch, -0.1),
      bind1(B.chest),
      0.012,
    );
    this.mb.box(
      MAT.FABRIC,
      new THREE.Vector3(0.115, 1.295, -front - 0.024),
      new THREE.Vector3(0.04, 0.062, 0.03),
      null,
      col(this.p.vestDark),
      bind1(B.chest),
      0.012,
    );
    if (this.lod.detail) {
      this.mb.box(
        MAT.HARD,
        new THREE.Vector3(0.115, 1.375, -front - 0.014),
        new THREE.Vector3(0.005, 0.05, 0.005),
        null,
        col(this.p.gunDark),
        bind1(B.chest),
      );
      // Grenade on the front left.
      this.mb.ellipsoid(
        MAT.HARD,
        new THREE.Vector3(0.135, 1.245, front + 0.014),
        new THREE.Vector3(0.026, 0.036, 0.026),
        8,
        5,
        col(0x3d4436),
        bind1(B.spine2),
      );
    }

    // Shoulder straps over the top of the carrier.
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      this.mb.strap(
        MAT.FABRIC,
        [
          new THREE.Vector3(sx * 0.075, 1.36, front - 0.01),
          new THREE.Vector3(sx * 0.095, 1.44, 0.06),
          new THREE.Vector3(sx * 0.1, 1.462, -0.01),
          new THREE.Vector3(sx * 0.09, 1.42, -0.09),
          new THREE.Vector3(sx * 0.075, 1.36, -front + 0.01),
        ],
        0.072,
        0.012,
        UP_X,
        shell,
        bind2(B.chest, 0.8, B[`clav${side}`], 0.2),
      );
    }

    // Sling across the chest, which reads even though it does not reach the gun.
    if (this.lod.detail) {
      this.mb.strap(
        MAT.FABRIC,
        [
          new THREE.Vector3(-0.09, 1.44, -0.03),
          new THREE.Vector3(-0.02, 1.36, front + 0.03),
          new THREE.Vector3(0.09, 1.25, front + 0.03),
          new THREE.Vector3(0.16, 1.15, 0.06),
        ],
        0.03,
        0.008,
        UP_X,
        col(this.p.webbing),
        bind1(B.chest),
      );
    }
  }

  /* --------------------------------- arms -------------------------------- */

  private arm(side: 'L' | 'R'): void {
    const g = this.g;
    const shoulder = jp(`arm${side}`);
    const elbow = jp(`fore${side}`);
    const hand = jp(`hand${side}`);
    const armBone = B[`arm${side}`];
    const foreBone = B[`fore${side}`];
    const handBone = B[`hand${side}`];
    const cloth = col(this.p.uniform);
    const clothDark = col(this.p.uniformDark);

    this.mb.tube(
      MAT.FABRIC,
      [
        this.ring(shoulder, elbow, 0.02, 0.072 * g, 0.072 * g, bind2(armBone, 0.7, B[`clav${side}`], 0.3), cloth),
        this.ring(shoulder, elbow, 0.28, 0.062 * g, 0.062 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.62, 0.053 * g, 0.053 * g, bind1(armBone), cloth),
        this.ring(shoulder, elbow, 0.9, 0.048 * g, 0.048 * g, bind2(armBone, 0.55, foreBone, 0.45), cloth),
      ],
      Math.max(7, this.lod.seg - 2),
      UP_Z,
      false,
      false,
    );
    this.mb.tube(
      MAT.FABRIC,
      [
        this.ring(elbow, hand, 0.02, 0.05 * g, 0.05 * g, bind2(foreBone, 0.6, armBone, 0.4), cloth),
        this.ring(elbow, hand, 0.24, 0.049 * g, 0.049 * g, bind1(foreBone), cloth),
        this.ring(elbow, hand, 0.58, 0.042 * g, 0.042 * g, bind1(foreBone), cloth),
        this.ring(elbow, hand, 0.84, 0.041 * g, 0.041 * g, bind1(foreBone), clothDark),
        this.ring(elbow, hand, 0.96, 0.036 * g, 0.036 * g, bind2(foreBone, 0.55, handBone, 0.45), clothDark),
      ],
      Math.max(7, this.lod.seg - 2),
      UP_Z,
      false,
      false,
    );

    // Sleeve over the elbow, for the reason the knee has one: two uncapped
    // tubes meeting at a joint open a hole as soon as the joint bends, and a
    // soldier with a rifle up has both elbows folded hard.
    this.mb.ellipsoid(
      MAT.FABRIC,
      this.ring(shoulder, elbow, 1.0, 0, 0, bind1(0), cloth).p.clone(),
      new THREE.Vector3(0.049 * g, 0.058, 0.05 * g),
      Math.max(8, this.lod.sphereSeg - 6),
      Math.max(5, this.lod.sphereStack - 5),
      cloth,
      bind2(armBone, 0.5, foreBone, 0.5),
    );

    // Elbow pad, straddling the joint.
    if (this.lod.detail) {
      this.mb.ellipsoid(
        MAT.RUBBER,
        this.ring(shoulder, elbow, 1.0, 0, 0, bind1(0), cloth).p.clone(),
        new THREE.Vector3(0.055 * g, 0.058, 0.055 * g),
        9,
        6,
        col(this.p.pad),
        bind2(armBone, 0.5, foreBone, 0.5),
      );
      // Shoulder patch, a flash of a different colour high on the sleeve.
      this.mb.box(
        MAT.FABRIC,
        this.ring(shoulder, elbow, 0.24, 0, 0, bind1(0), cloth)
          .p.clone()
          .add(new THREE.Vector3((side === 'L' ? 1 : -1) * 0.055 * g, 0.01, 0)),
        new THREE.Vector3(0.012, 0.03, 0.026),
        null,
        col(side === 'L' ? 0x5a4230 : this.p.uniformDark),
        bind1(armBone),
        0.005,
      );
    }
  }

  private hand(side: 'L' | 'R'): void {
    const hand = jp(`hand${side}`);
    const elbow = jp(`fore${side}`);
    const handBone = B[`hand${side}`];
    const glove = col(this.p.glove);
    _v.copy(hand).sub(elbow).normalize();
    _q.setFromUnitVectors(UP_Y, _v);

    this.mb.ellipsoid(
      MAT.FABRIC,
      hand.clone().addScaledVector(_v, 0.012),
      new THREE.Vector3(0.038, 0.058, 0.05),
      Math.max(8, this.lod.sphereSeg - 8),
      Math.max(5, this.lod.sphereStack - 5),
      glove,
      bind1(handBone),
      _q.clone(),
    );
    if (this.lod.detail) {
      // Fingers wrapped around the grip, as four short boxes.
      for (let i = 0; i < 4; i++) {
        const t = (i - 1.5) * 0.022;
        _v2.copy(hand).addScaledVector(_v, 0.04);
        this.mb.box(
          MAT.FABRIC,
          _v2.clone().add(new THREE.Vector3(0, t * 0.4, t)),
          new THREE.Vector3(0.03, 0.011, 0.012),
          null,
          col(this.p.glove, i % 2 === 0 ? 0.08 : -0.05),
          bind1(handBone),
          0.004,
        );
      }
      // Thumb across the top.
      this.mb.box(
        MAT.FABRIC,
        hand.clone().add(new THREE.Vector3(side === 'L' ? -0.026 : 0.026, 0.026, 0.024)),
        new THREE.Vector3(0.014, 0.014, 0.03),
        null,
        glove,
        bind1(handBone),
        0.005,
      );
    }
  }

  /* --------------------------------- head -------------------------------- */

  private neckAndHead(): void {
    const skin = col(this.p.skin);
    this.mb.tube(
      MAT.SKIN,
      [
        { p: new THREE.Vector3(0, 1.415, 0.0), rx: 0.062, rz: 0.062, bind: bind2(B.neck, 0.5, B.chest, 0.5), color: col(this.p.skin, -0.25) },
        { p: new THREE.Vector3(0, 1.49, 0.004), rx: 0.056, rz: 0.058, bind: bind1(B.neck), color: skin },
        { p: new THREE.Vector3(0, 1.555, 0.008), rx: 0.058, rz: 0.06, bind: bind2(B.neck, 0.4, B.head, 0.6), color: skin },
      ],
      Math.max(7, this.lod.seg - 4),
      UP_Z,
      false,
      false,
    );
    // Collar, so the neck does not emerge from a hole in the shirt.
    this.mb.tube(
      MAT.FABRIC,
      [
        { p: new THREE.Vector3(0, 1.442, -0.002), rx: 0.078, rz: 0.075, bind: bind2(B.neck, 0.5, B.chest, 0.5), color: col(this.p.uniformDark) },
        { p: new THREE.Vector3(0, 1.492, 0.002), rx: 0.07, rz: 0.07, bind: bind2(B.neck, 0.75, B.chest, 0.25), color: col(this.p.uniformDark) },
      ],
      Math.max(7, this.lod.seg - 4),
      UP_Z,
      false,
      false,
    );

    const head = bind1(B.head);
    // Cranium and jaw as two ellipsoids: one shape cannot do both, and a head
    // with no jaw is the single clearest tell of a cheap character.
    this.mb.ellipsoid(
      MAT.SKIN,
      new THREE.Vector3(0, 1.658, 0.004),
      new THREE.Vector3(0.084, 0.109, 0.098),
      this.lod.sphereSeg,
      this.lod.sphereStack,
      skin,
      head,
    );
    this.mb.ellipsoid(
      MAT.SKIN,
      new THREE.Vector3(0, 1.588, 0.026),
      new THREE.Vector3(0.072, 0.058, 0.086),
      Math.max(9, this.lod.sphereSeg - 6),
      Math.max(6, this.lod.sphereStack - 4),
      col(this.p.skin, -0.06),
      head,
    );
    if (!this.lod.detail) return;

    // Brow, nose, ears and eye sockets. Small, but they are what stops a face
    // from reading as an egg at three metres.
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.688, 0.084),
      new THREE.Vector3(0.058, 0.012, 0.016),
      null,
      col(this.p.skin, -0.12),
      head,
      0.006,
    );
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.648, 0.094),
      new THREE.Vector3(0.014, 0.026, 0.019),
      null,
      skin,
      head,
      0.007,
    );
    for (const sx of [1, -1]) {
      this.mb.box(
        MAT.SKIN,
        new THREE.Vector3(sx * 0.033, 1.666, 0.079),
        new THREE.Vector3(0.019, 0.009, 0.008),
        null,
        col(0x2a2320),
        head,
        0.003,
      );
      this.mb.ellipsoid(
        MAT.SKIN,
        new THREE.Vector3(sx * 0.083, 1.652, -0.008),
        new THREE.Vector3(0.012, 0.03, 0.021),
        8,
        5,
        col(this.p.skin, -0.08),
        head,
      );
    }
    // Mouth line and a shadowed chin crease.
    this.mb.box(
      MAT.SKIN,
      new THREE.Vector3(0, 1.594, 0.098),
      new THREE.Vector3(0.024, 0.006, 0.007),
      null,
      col(0x53342b),
      head,
      0.002,
    );
  }

  private headgear(): void {
    const head = bind1(B.head);
    const cover = col(this.p.cover);
    const coverDark = col(this.p.cover, -0.22);

    if (this.spec.headgear === 'helmet') {
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.668, 0.002),
        new THREE.Vector3(0.108, 0.118, 0.121),
        this.lod.sphereSeg,
        Math.max(6, this.lod.sphereStack - 2),
        cover,
        head,
        null,
        -0.46,
        1,
      );
      // Rim, which is what gives a helmet its hard edge against the face.
      this.mb.tube(
        MAT.HARD,
        [
          { p: new THREE.Vector3(0, 1.615, 0.002), rx: 0.104, rz: 0.116, bind: head, color: coverDark },
          { p: new THREE.Vector3(0, 1.6, 0.002), rx: 0.096, rz: 0.107, bind: head, color: coverDark },
        ],
        this.lod.sphereSeg,
        UP_Z,
        false,
        false,
      );
      if (this.lod.detail) {
        // Night-vision shroud or a goggle band, plus side rails.
        if (this.spec.nvg) {
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(0, 1.702, 0.114),
            new THREE.Vector3(0.028, 0.024, 0.022),
            null,
            col(this.p.gunDark),
            head,
            0.006,
          );
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(0, 1.727, 0.096),
            new THREE.Vector3(0.018, 0.03, 0.014),
            null,
            col(this.p.gun),
            head,
            0.005,
          );
        }
        if (this.spec.goggles) {
          this.mb.tube(
            MAT.RUBBER,
            [
              { p: new THREE.Vector3(0, 1.716, 0.002), rx: 0.11, rz: 0.122, bind: head, color: col(0x1e1f1c) },
              { p: new THREE.Vector3(0, 1.696, 0.002), rx: 0.112, rz: 0.124, bind: head, color: col(0x1e1f1c) },
            ],
            this.lod.sphereSeg,
            UP_Z,
            false,
            false,
          );
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(0, 1.706, 0.108),
            new THREE.Vector3(0.062, 0.026, 0.024),
            null,
            col(0x2b3a3f),
            head,
            0.012,
          );
        }
        for (const sx of [1, -1]) {
          this.mb.box(
            MAT.HARD,
            new THREE.Vector3(sx * 0.104, 1.664, 0.016),
            new THREE.Vector3(0.007, 0.016, 0.055),
            null,
            col(this.p.gunDark),
            head,
            0.003,
          );
        }
        // Chinstrap, both sides plus the cup under the jaw.
        for (const sx of [1, -1]) {
          this.mb.strap(
            MAT.FABRIC,
            [
              new THREE.Vector3(sx * 0.09, 1.63, 0.03),
              new THREE.Vector3(sx * 0.072, 1.582, 0.05),
              new THREE.Vector3(sx * 0.03, 1.545, 0.062),
            ],
            0.017,
            0.004,
            UP_Y,
            col(this.p.webbing),
            head,
          );
        }
      }
    } else if (this.spec.headgear === 'cap') {
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.662, 0.004),
        new THREE.Vector3(0.09, 0.1, 0.1),
        Math.max(9, this.lod.sphereSeg - 4),
        Math.max(5, this.lod.sphereStack - 4),
        cover,
        head,
        null,
        -0.1,
        1,
      );
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.668, 0.115),
        new THREE.Vector3(0.078, 0.008, 0.05),
        null,
        coverDark,
        head,
        0.014,
      );
    } else {
      // Head wrap: a cloth dome, a brow band and a tail down the back.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.664, 0.002),
        new THREE.Vector3(0.096, 0.108, 0.106),
        Math.max(9, this.lod.sphereSeg - 4),
        Math.max(6, this.lod.sphereStack - 3),
        cover,
        head,
        null,
        -0.22,
        1,
      );
      this.mb.tube(
        MAT.FABRIC,
        [
          { p: new THREE.Vector3(0, 1.704, 0.002), rx: 0.098, rz: 0.108, bind: head, color: coverDark },
          { p: new THREE.Vector3(0, 1.664, 0.002), rx: 0.1, rz: 0.11, bind: head, color: coverDark },
        ],
        Math.max(9, this.lod.sphereSeg - 4),
        UP_Z,
        false,
        false,
      );
      this.mb.box(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.6, -0.088),
        new THREE.Vector3(0.082, 0.075, 0.03),
        null,
        cover,
        head,
        0.02,
      );
      // Face wrap over the mouth and jaw.
      this.mb.ellipsoid(
        MAT.FABRIC,
        new THREE.Vector3(0, 1.585, 0.028),
        new THREE.Vector3(0.078, 0.055, 0.09),
        Math.max(9, this.lod.sphereSeg - 6),
        Math.max(5, this.lod.sphereStack - 5),
        coverDark,
        head,
        null,
        -1,
        0.5,
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

    if (!this.lod.detail) return;
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
  triangles: number;
  trianglesLod1: number;
}

/**
 * Shared, immutable soldier assets: three variants at two levels of detail,
 * and the four materials they draw with. Built once; every agent instances
 * them and owns only its own skeleton.
 */
export class SoldierAssets {
  readonly variants: VariantAssets[] = [];
  readonly materials: THREE.Material[] = [];
  private owned: THREE.Material[] = [];

  constructor(lib: IMaterialLibrary | undefined) {
    this.materials.push(
      this.surface(lib, 'fabric_canvas', 0.92, 0),
      this.surface(lib, 'gun_metal', 0.46, 0.85),
      this.surface(lib, 'rubber', 0.85, 0.02),
      this.skin(),
    );
    for (const spec of VARIANTS) {
      const a = new SoldierBuilder(spec, LOD0).build();
      const b = new SoldierBuilder(spec, LOD1).build();
      this.variants.push({
        spec,
        lod0: a.geometry,
        lod1: b.geometry,
        triangles: a.triangles,
        trianglesLod1: b.triangles,
      });
    }
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

  /** Total triangles a full-detail soldier costs, for the perf readout. */
  get triangleReport(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const v of this.variants) {
      out[`${v.spec.id}_lod0`] = v.triangles;
      out[`${v.spec.id}_lod1`] = v.trianglesLod1;
    }
    return out;
  }

  dispose(): void {
    for (const v of this.variants) {
      v.lod0.dispose();
      v.lod1.dispose();
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
  near: THREE.SkinnedMesh;
  far: THREE.SkinnedMesh;
  variant: VariantAssets;
}

/**
 * One soldier in the scene. Both levels of detail bind the same skeleton, so
 * switching between them is a visibility flip with no pose transfer.
 */
export function createSoldier(assets: SoldierAssets, variantIndex: number): SoldierInstance {
  const variant = assets.variants[variantIndex % assets.variants.length];
  const root = new THREE.Group();
  root.name = `soldier_${variant.spec.id}`;
  const bones = createBones();
  const skeleton = new THREE.Skeleton(bones, inverseBinds());
  root.add(bones[0]);

  const near = new THREE.SkinnedMesh(variant.lod0, assets.materials);
  near.castShadow = true;
  near.receiveShadow = true;
  near.frustumCulled = false;
  near.bindMode = THREE.AttachedBindMode;
  root.add(near);
  near.bind(skeleton, new THREE.Matrix4());

  const far = new THREE.SkinnedMesh(variant.lod1, assets.materials);
  far.castShadow = true;
  far.receiveShadow = false;
  far.frustumCulled = false;
  far.visible = false;
  far.bindMode = THREE.AttachedBindMode;
  root.add(far);
  far.bind(skeleton, new THREE.Matrix4());

  root.scale.setScalar(variant.spec.height);
  return { root, bones, skeleton, near, far, variant };
}

export { BONE_COUNT, BONES };
