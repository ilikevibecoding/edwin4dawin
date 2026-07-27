/**
 * The weapon in the soldier's hands.
 *
 * Not skinned. It is a separate mesh whose transform the animator writes every
 * frame from the aim direction, and both hands are then IK-solved onto its grip
 * points. That ordering is the whole reason it is a prop rather than geometry
 * welded to the hand: the muzzle has to point exactly where the AI is aiming, so
 * the weapon must lead and the arms must follow. A rifle parented to a hand bone
 * ends up pointing wherever the shoulder animation happens to leave it, which is
 * the classic look of an enemy shooting past you while hitting you anyway.
 *
 * Five silhouettes, one per archetype, because an LMG that reads as a carbine
 * removes the only warning a player gets before a hundred-round belt arrives.
 * Each is two draw calls: metal and polymer.
 */
import * as THREE from 'three';
import {
  addBox,
  addDome,
  addRoundedBox,
  addSweep,
  addTube,
  assembleStatic,
  Part,
  tint,
  type Tint,
} from './GeoUtil';

/** Material slots within the weapon mesh. */
export const WSLOT = { metal: 0, polymer: 1 } as const;

export type WeaponShape = 'rifle' | 'smg' | 'dmr' | 'lmg' | 'shotgun';

export interface WeaponProp {
  shape: WeaponShape;
  geometry: THREE.BufferGeometry;
  /** Material slot per geometry group, in group order. */
  slots: number[];
  triangles: number;
  /** Local-space muzzle, where the flash and the tracer start. */
  muzzle: THREE.Vector3;
  /** Local-space ejection port, for shell casings. */
  ejection: THREE.Vector3;
  /** Where the firing hand grips. Always at or near the origin. */
  gripRear: THREE.Vector3;
  /** Where the support hand grips, on the handguard. */
  gripFront: THREE.Vector3;
  /** Bottom of the magazine well, for the reload animation. */
  magazine: THREE.Vector3;
  /**
   * Centre of the butt pad, which is what sits in the shoulder pocket.
   *
   * The animator anchors the weapon here rather than at the grip. Anchoring at the
   * grip puts the firing hand 12 cm from the shoulder joint, and a 49 cm arm folded
   * that far has nowhere to put its elbow except straight out sideways.
   */
  buttPad: THREE.Vector3;
}

const METAL = tint(0xf0f0f0);
const METAL_DARK = tint(0xb4b4b4);
const POLY = tint(0xdcdcdc);
const POLY_DARK = tint(0xa8a8a8);
const GLASS = tint(0x6f8f8a);

interface Layout {
  /** Receiver runs from `+rearZ` to `-frontZ` along local Z. */
  receiverBack: number;
  receiverFront: number;
  handguardFront: number;
  barrelEnd: number;
  stockBack: number;
  receiverHalf: THREE.Vector3;
  magDepth: number;
  magAngle: number;
  optic: 'holo' | 'acog' | 'scope' | 'irons';
  bipod: boolean;
  drum: boolean;
  tube: boolean;
  folding: boolean;
  /**
   * Where the support hand sits along the handguard.
   *
   * Kept close to the receiver on purpose. With the butt in the shoulder pocket,
   * a hand out at the front of a 56 cm handguard is 60 cm from the far shoulder
   * and a 49 cm arm cannot reach it, so the IK leaves the hand hanging in space
   * behind the weapon. A high grip near the mag well is both reachable and a real
   * shooting stance.
   */
  gripFrontZ: number;
}

const LAYOUTS: Record<WeaponShape, Layout> = {
  rifle: {
    receiverBack: 0.07,
    receiverFront: -0.2,
    handguardFront: -0.44,
    barrelEnd: -0.56,
    stockBack: 0.3,
    receiverHalf: new THREE.Vector3(0.024, 0.042, 0.135),
    magDepth: 0.17,
    magAngle: 0.16,
    optic: 'holo',
    bipod: false,
    drum: false,
    tube: false,
    folding: false,
    gripFrontZ: -0.2,
  },
  smg: {
    receiverBack: 0.05,
    receiverFront: -0.15,
    handguardFront: -0.3,
    barrelEnd: -0.36,
    stockBack: 0.22,
    receiverHalf: new THREE.Vector3(0.022, 0.04, 0.1),
    magDepth: 0.19,
    magAngle: 0.05,
    optic: 'holo',
    bipod: false,
    drum: false,
    tube: false,
    folding: true,
    gripFrontZ: -0.16,
  },
  dmr: {
    receiverBack: 0.09,
    receiverFront: -0.24,
    handguardFront: -0.52,
    barrelEnd: -0.72,
    stockBack: 0.33,
    receiverHalf: new THREE.Vector3(0.026, 0.046, 0.165),
    magDepth: 0.15,
    magAngle: 0.1,
    optic: 'scope',
    bipod: false,
    drum: false,
    tube: false,
    folding: false,
    gripFrontZ: -0.24,
  },
  lmg: {
    receiverBack: 0.1,
    receiverFront: -0.26,
    handguardFront: -0.5,
    barrelEnd: -0.68,
    stockBack: 0.32,
    receiverHalf: new THREE.Vector3(0.032, 0.055, 0.18),
    magDepth: 0.2,
    magAngle: 0,
    optic: 'acog',
    bipod: true,
    drum: true,
    tube: false,
    folding: false,
    gripFrontZ: -0.24,
  },
  shotgun: {
    receiverBack: 0.06,
    receiverFront: -0.2,
    handguardFront: -0.42,
    barrelEnd: -0.6,
    stockBack: 0.3,
    receiverHalf: new THREE.Vector3(0.026, 0.05, 0.13),
    magDepth: 0,
    magAngle: 0,
    optic: 'irons',
    bipod: false,
    drum: false,
    tube: true,
    folding: false,
    gripFrontZ: -0.2,
  },
};

/** Builds one weapon silhouette. Called once per shape and shared by every agent. */
export function buildWeapon(shape: WeaponShape, quality = 1): WeaponProp {
  const L = LAYOUTS[shape];
  const seg = (n: number): number => Math.max(4, Math.round(n * quality));
  const metal = new Part(WSLOT.metal, []);
  const poly = new Part(WSLOT.polymer, []);

  const receiverMid = (L.receiverBack + L.receiverFront) * 0.5;
  const receiverLen = (L.receiverBack - L.receiverFront) * 0.5;

  // Receiver: the box everything else hangs off.
  metal.pushTRS(new THREE.Vector3(0, 0, receiverMid));
  addRoundedBox(
    metal,
    new THREE.Vector3(L.receiverHalf.x, L.receiverHalf.y, receiverLen),
    METAL,
    { sides: seg(8), power: 6 },
  );
  metal.pop();

  // Top rail: a short toothed strip. Reads as a rail at any distance because the
  // teeth catch a specular highlight where the flat receiver does not.
  const railTeeth = Math.max(3, Math.round(6 * quality));
  for (let i = 0; i < railTeeth; i++) {
    const z = L.receiverBack - 0.02 - (i / railTeeth) * (L.receiverBack - L.receiverFront - 0.03);
    metal.pushTRS(new THREE.Vector3(0, L.receiverHalf.y + 0.008, z));
    addBox(metal, new THREE.Vector3(0.014, 0.008, 0.008), METAL_DARK);
    metal.pop();
  }

  // Handguard.
  const hgMid = (L.receiverFront + L.handguardFront) * 0.5;
  const hgLen = (L.receiverFront - L.handguardFront) * 0.5;
  poly.pushTRS(new THREE.Vector3(0, -0.004, hgMid));
  addSweep(
    poly,
    [
      { y: -0.03, rx: 0.021, rz: hgLen, power: 5 },
      { y: -0.01, rx: 0.026, rz: hgLen, power: 5 },
      { y: 0.024, rx: 0.024, rz: hgLen * 0.99, power: 5 },
    ],
    seg(10),
    POLY,
    true,
    true,
  );
  poly.pop();

  // Barrel and muzzle device.
  addTube(
    metal,
    [
      new THREE.Vector3(0, 0, L.receiverFront + 0.01),
      new THREE.Vector3(0, 0, L.handguardFront),
      new THREE.Vector3(0, 0, L.barrelEnd + 0.03),
    ],
    { sides: seg(8), radii: [0.014, 0.0105, 0.0095], tint: METAL_DARK, capStart: true },
  );
  metal.pushTRS(new THREE.Vector3(0, 0, L.barrelEnd + 0.015));
  addSweep(
    metal,
    [
      { y: -0.028, rx: 0.017, rz: 0.017, power: 2.2 },
      { y: 0.004, rx: 0.019, rz: 0.019, power: 2.2 },
      { y: 0.028, rx: 0.015, rz: 0.015, power: 2.2 },
    ],
    seg(8),
    METAL_DARK,
    true,
    true,
  );
  metal.pop();

  // Front sight post, folded or fixed depending on the optic.
  if (L.optic === 'irons' || L.optic === 'holo') {
    metal.pushTRS(new THREE.Vector3(0, 0.03, L.handguardFront + 0.02));
    addBox(metal, new THREE.Vector3(0.006, 0.026, 0.006), METAL_DARK);
    metal.pop();
  }

  // Pistol grip, raked back under the receiver.
  poly.pushTRS(
    new THREE.Vector3(0, -0.075, 0.024),
    new THREE.Euler(-0.32, 0, 0),
  );
  addSweep(
    poly,
    [
      { y: -0.058, rx: 0.019, rz: 0.024, power: 3.4 },
      { y: -0.02, rx: 0.021, rz: 0.026, power: 3.2 },
      { y: 0.03, rx: 0.023, rz: 0.03, power: 3 },
      { y: 0.056, rx: 0.022, rz: 0.034, power: 3 },
    ],
    seg(8),
    POLY_DARK,
    true,
    true,
  );
  poly.pop();

  // Trigger guard.
  addTube(
    metal,
    [
      new THREE.Vector3(0, -0.048, 0.006),
      new THREE.Vector3(0, -0.062, -0.024),
      new THREE.Vector3(0, -0.05, -0.05),
      new THREE.Vector3(0, -0.04, -0.056),
    ],
    { sides: 4, radii: [0.006, 0.006, 0.006, 0.006], tint: METAL_DARK },
  );

  // Magazine, or a tube magazine for the shotgun.
  if (L.tube) {
    addTube(
      metal,
      [
        new THREE.Vector3(0, -0.036, L.receiverFront),
        new THREE.Vector3(0, -0.036, L.barrelEnd + 0.14),
      ],
      { sides: seg(8), radii: [0.017, 0.017], tint: METAL_DARK, capStart: true, capEnd: true },
    );
    // Pump handle, on the tube.
    poly.pushTRS(new THREE.Vector3(0, -0.03, L.handguardFront + 0.03));
    addSweep(
      poly,
      [
        { y: -0.03, rx: 0.03, rz: 0.058, power: 4 },
        { y: 0.006, rx: 0.032, rz: 0.062, power: 4 },
        { y: 0.03, rx: 0.028, rz: 0.056, power: 4 },
      ],
      seg(10),
      POLY_DARK,
      true,
      true,
    );
    poly.pop();
  } else if (L.drum) {
    poly.pushTRS(new THREE.Vector3(0, -0.115, -0.03));
    addRoundedBox(poly, new THREE.Vector3(0.052, 0.062, 0.062), POLY_DARK, {
      sides: seg(10),
      power: 4,
    });
    poly.pop();
    // Belt feed lip.
    metal.pushTRS(new THREE.Vector3(0.028, -0.05, -0.02), new THREE.Euler(0, 0, 0.3));
    addBox(metal, new THREE.Vector3(0.006, 0.02, 0.03), METAL_DARK);
    metal.pop();
  } else if (L.magDepth > 0) {
    poly.pushTRS(
      new THREE.Vector3(0, -0.036 - L.magDepth * 0.5, -0.03),
      new THREE.Euler(L.magAngle, 0, 0),
    );
    addSweep(
      poly,
      [
        { y: -L.magDepth * 0.5, rx: 0.019, rz: 0.03, power: 5 },
        { y: 0, rx: 0.02, rz: 0.032, power: 5 },
        { y: L.magDepth * 0.5, rx: 0.021, rz: 0.034, power: 5 },
      ],
      seg(8),
      POLY_DARK,
      true,
      true,
    );
    poly.pop();
  }

  // Stock.
  const stockZ = L.receiverBack;
  if (L.folding) {
    // Side-folding skeleton stock: two struts and a pad.
    for (const side of [-1, 1]) {
      addTube(
        metal,
        [
          new THREE.Vector3(side * 0.012, 0.006, stockZ),
          new THREE.Vector3(side * 0.02, 0.002, stockZ + 0.1),
          new THREE.Vector3(side * 0.018, -0.004, L.stockBack),
        ],
        { sides: 4, radii: [0.007, 0.006, 0.006], tint: METAL_DARK },
      );
    }
    poly.pushTRS(new THREE.Vector3(0, -0.006, L.stockBack + 0.008));
    addRoundedBox(poly, new THREE.Vector3(0.018, 0.04, 0.012), POLY_DARK, { sides: 6, power: 5 });
    poly.pop();
  } else {
    poly.pushTRS(new THREE.Vector3(0, -0.006, (stockZ + L.stockBack) * 0.5));
    addSweep(
      poly,
      [
        { y: -0.034, rx: 0.019, rz: (L.stockBack - stockZ) * 0.5, power: 4.5, z: 0.01 },
        { y: 0, rx: 0.023, rz: (L.stockBack - stockZ) * 0.5, power: 4.5 },
        { y: 0.032, rx: 0.02, rz: (L.stockBack - stockZ) * 0.46, power: 4.5, z: -0.01 },
      ],
      seg(10),
      POLY,
      true,
      true,
    );
    poly.pop();
    // Butt pad and cheek riser: the rear silhouette is what you see when an
    // enemy is shouldered side-on to you.
    poly.pushTRS(new THREE.Vector3(0, -0.008, L.stockBack + 0.008), new THREE.Euler(0.12, 0, 0));
    addRoundedBox(poly, new THREE.Vector3(0.021, 0.05, 0.013), POLY_DARK, { sides: 8, power: 5 });
    poly.pop();
  }

  // Optic.
  buildOptic(metal, L, seg);

  if (L.bipod) {
    for (const side of [-1, 1]) {
      addTube(
        metal,
        [
          new THREE.Vector3(side * 0.012, -0.03, L.handguardFront + 0.04),
          new THREE.Vector3(side * 0.05, -0.13, L.handguardFront + 0.09),
        ],
        { sides: 4, radii: [0.006, 0.005], tint: METAL_DARK, capEnd: true },
      );
    }
  }

  // Sling: a loop from the front of the handguard to the stock. Cheap, and it is
  // one of the details that separates "soldier carrying a rifle" from "rifle".
  addTube(
    poly,
    [
      new THREE.Vector3(0.012, -0.024, L.handguardFront + 0.03),
      new THREE.Vector3(0.05, -0.1, L.handguardFront * 0.5),
      new THREE.Vector3(0.055, -0.13, 0.06),
      new THREE.Vector3(0.03, -0.06, L.stockBack - 0.04),
    ],
    {
      sides: 4,
      radii: [0.005, 0.007, 0.007, 0.005],
      flatten: [2.4, 2.4, 2.4, 2.4],
      tint: POLY_DARK,
    },
  );

  const assembled = assembleStatic([metal, poly]);
  return {
    shape,
    geometry: assembled.geometry,
    slots: assembled.slots,
    triangles: assembled.triangles,
    muzzle: new THREE.Vector3(0, 0, L.barrelEnd - 0.01),
    ejection: new THREE.Vector3(L.receiverHalf.x + 0.01, 0.01, L.receiverFront + 0.06),
    gripRear: new THREE.Vector3(0, -0.052, 0.012),
    gripFront: new THREE.Vector3(0, -0.02, L.gripFrontZ),
    magazine: new THREE.Vector3(0, -0.05 - L.magDepth * 0.6, -0.03),
    buttPad: new THREE.Vector3(0, -0.006, L.stockBack + 0.008),
  };
}

function buildOptic(part: Part, L: Layout, seg: (n: number) => number): void {
  const top = L.receiverHalf.y + 0.016;
  const z = L.receiverBack - 0.09;
  switch (L.optic) {
    case 'holo': {
      part.pushTRS(new THREE.Vector3(0, top + 0.026, z));
      addRoundedBox(part, new THREE.Vector3(0.022, 0.026, 0.034), METAL_DARK, {
        sides: seg(8),
        power: 5,
      });
      part.pop();
      // Lens, tinted, facing the shooter.
      part.pushTRS(new THREE.Vector3(0, top + 0.028, z - 0.03));
      addRoundedBox(part, new THREE.Vector3(0.017, 0.019, 0.004), GLASS, { sides: 8, power: 3 });
      part.pop();
      break;
    }
    case 'acog': {
      addTube(
        part,
        [
          new THREE.Vector3(0, top + 0.03, z + 0.05),
          new THREE.Vector3(0, top + 0.03, z - 0.05),
        ],
        { sides: seg(8), radii: [0.018, 0.022], tint: METAL_DARK, capStart: true },
      );
      part.pushTRS(new THREE.Vector3(0, top + 0.03, z - 0.052));
      addDome(part, {
        centre: new THREE.Vector3(0, 0, 0),
        radius: new THREE.Vector3(0.021, 0.021, 0.006),
        segments: seg(10),
        rings: 3,
        tint: GLASS,
      });
      part.pop();
      break;
    }
    case 'scope': {
      addTube(
        part,
        [
          new THREE.Vector3(0, top + 0.038, z + 0.11),
          new THREE.Vector3(0, top + 0.038, z + 0.03),
          new THREE.Vector3(0, top + 0.038, z - 0.02),
          new THREE.Vector3(0, top + 0.038, z - 0.11),
        ],
        {
          sides: seg(10),
          radii: [0.017, 0.026, 0.026, 0.021],
          tint: METAL_DARK,
          capStart: true,
        },
      );
      part.pushTRS(new THREE.Vector3(0, top + 0.038, z - 0.114));
      addDome(part, {
        centre: new THREE.Vector3(0, 0, 0),
        radius: new THREE.Vector3(0.02, 0.02, 0.006),
        segments: seg(10),
        rings: 3,
        tint: GLASS,
      });
      part.pop();
      // Two ring mounts down to the rail.
      for (const dz of [0.05, -0.05]) {
        part.pushTRS(new THREE.Vector3(0, top + 0.012, z + dz));
        addBox(part, new THREE.Vector3(0.012, 0.026, 0.01), METAL);
        part.pop();
      }
      break;
    }
    default: {
      // Irons: a rear aperture on the receiver.
      part.pushTRS(new THREE.Vector3(0, top + 0.012, z + 0.03));
      addBox(part, new THREE.Vector3(0.012, 0.016, 0.006), METAL_DARK);
      part.pop();
      break;
    }
  }
}

/** A detached magazine, used as a prop in the reload animation. */
export function buildMagazineProp(colour: Tint): THREE.BufferGeometry {
  const part = new Part(WSLOT.polymer, []);
  addSweep(
    part,
    [
      { y: -0.085, rx: 0.019, rz: 0.03, power: 5 },
      { y: 0, rx: 0.02, rz: 0.032, power: 5 },
      { y: 0.085, rx: 0.021, rz: 0.034, power: 5 },
    ],
    8,
    colour,
    true,
    true,
  );
  return assembleStatic([part]).geometry;
}
