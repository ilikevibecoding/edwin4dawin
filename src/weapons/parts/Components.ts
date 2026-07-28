import type { PartCtx } from './Assembly';

/**
 * Shared gun sub-assemblies.
 *
 * Everything here is authored in **weapon space**, whose one rule the whole
 * system rests on: *the sight line of the active sight is the -Z axis through
 * the origin.* Get that right and aiming is exact by construction — the ADS
 * pose is a pure translation back along Z, and the sight picture lands on the
 * optical axis at any field of view.
 *
 * Dimensions are the real ones. An AR-15's sight line sits 66 mm over the bore,
 * a picatinny slot is 5.35 mm wide on a 10 mm pitch, a STANAG magazine is
 * 25.4 mm across — the eye is very good at spotting a gun whose proportions are
 * invented, even when it cannot say why.
 */

export const TINT = {
  /** Hard-anodised aluminium receiver. */
  receiver: 0x2d2f33,
  /** Phosphated / parkerised steel: barrels, bolts, pins. */
  steel: 0x3c3f45,
  /** Bare worn steel on a wear edge. */
  bright: 0x8d9299,
  /** Black polymer furniture. */
  polymer: 0x26282b,
  /** Slightly greyer polymer, so two mouldings never read as one part. */
  polymer2: 0x303336,
  /**
   * Flat dark earth furniture. Warmer and much lighter than the polymer entry,
   * which is the whole point of it.
   */
  fde: 0x8a7452,
  /**
   * Walnut furniture. Cool on purpose, and it has to be: `wood_planks` already
   * supplies the grain *and* the colour, and its colour is a warm pine. A
   * walnut brown here multiplies brown by brown and comes out as terracotta;
   * even a neutral grey leaves the fore-end orange under a low sun. So the
   * tint takes red out and puts blue back, and what survives is the material's
   * own figure over a dark brown.
   */
  walnut: 0x171b24,
  /** Optic housings are usually a flatter black than the receiver. */
  optic: 0x232427,
  brass: 0xb3873a,
  copper: 0x9c6b3f,
  rubber: 0x1c1d1f,
} as const;

/* --------------------------- fasteners ---------------------------------- */

/** A row of cross pins down a receiver flank, both sides. */
export function crossPins(
  g: PartCtx,
  spots: Array<[number, number]>,
  radius: number,
  width: number,
): void {
  for (const [z, y] of spots) {
    g.pinX(0, y, z, radius, width + 0.0008, 10);
    g.push().at(width * 0.5 + 0.0004, y, z).ry(Math.PI / 2);
    g.screw(radius * 1.25, 0.0007, false);
    g.pop();
    g.push().at(-(width * 0.5 + 0.0004), y, z).ry(-Math.PI / 2);
    g.screw(radius * 1.25, 0.0007, false);
    g.pop();
  }
}

/* ---------------------------- magazines --------------------------------- */

export interface MagOptions {
  /** Length of the body along its own axis. */
  length: number;
  width: number;
  depth: number;
  /** Radius of the feed curve; 0 for a straight box magazine. */
  curve?: number;
  /** Number of stiffening ribs down the flank. */
  ribs?: number;
  tint?: number;
  material?: 'metal' | 'polymer';
  /** Draws a witness-hole column, as a polymer magazine carries. */
  witness?: number;
  /** Shows a round in the feed lips. */
  topRound?: boolean;
  caliber?: number;
}

/**
 * A box magazine hanging from the origin downward (its top is at y=0), built
 * as a stack of segments so a curved one follows its arc properly.
 */
export function magazine(g: PartCtx, o: MagOptions): void {
  const seg = o.curve ? 7 : 3;
  const step = o.length / seg;
  const tint = o.tint ?? TINT.polymer;
  const mat = o.material ?? 'polymer';
  const d = o.depth;
  g.use(mat, tint);
  g.push();
  // Segments are chained: each one rotates a little further into the curve.
  // The rotation is +X, which walks the stack forward as it descends — a
  // tapered case stacks on an arc whose outside is the case-head side, so a
  // box magazine always leans its floor plate toward the muzzle.
  const stepAngle = o.curve ? step / o.curve : 0;
  for (let i = 0; i < seg; i++) {
    const taper = 1 - i * 0.004;
    g.at(0, -step * 0.5, 0);
    g.box(o.width * taper, step * 1.02, d * taper, 0.0016);
    // Ribs read as a change of plane rather than as a texture.
    if ((o.ribs ?? 0) > 0 && i > 0) {
      g.push().at(0, step * 0.18, 0);
      g.box(o.width + 0.0011, 0.0022, d * 0.86, 0.0006);
      g.pop();
    }
    if (o.witness && i > 0 && i <= o.witness) {
      g.use(mat, 0x121314);
      for (const sx of [-1, 1]) {
        g.push().at(sx * (o.width * 0.5 - 0.0006), 0, 0).ry((sx * Math.PI) / 2);
        g.cyl(0.0022, 0.0016, { segments: 8, capB: false });
        g.pop();
      }
      g.use(mat, tint);
    }
    g.at(0, -step * 0.5, 0);
    if (stepAngle) g.rx(stepAngle);
  }
  // Floor plate, with the base-pad lug underneath.
  g.use(mat, tint === TINT.polymer ? TINT.polymer2 : tint);
  g.at(0, -0.004, 0);
  g.box(o.width + 0.0022, 0.008, d + 0.0022, 0.0012);
  g.push().at(0, -0.0035, d * 0.2);
  g.box(o.width * 0.5, 0.0022, d * 0.3, 0.0006);
  g.pop();
  g.pop();

  // The top round, then the feed lips folded over it: the pair is what tells
  // the eye the magazine is loaded rather than an empty box.
  const r = (o.caliber ?? 5.56) * 0.0005;
  if (o.topRound) {
    g.use('metal', TINT.brass);
    g.push().at(0, -0.0048, d * 0.13);
    g.cyl(r, d * 0.58, { segments: 10, chamfer: r * 0.15 });
    g.use('metal', TINT.copper);
    g.at(0, 0, -d * 0.42);
    g.cyl(r * 0.3, d * 0.26, { r2: r * 0.95, segments: 10 });
    g.pop();
  }
  g.use('metal', TINT.steel);
  const gap = o.topRound ? Math.min(r * 0.9, o.width * 0.3) : 0;
  const lip = o.width * 0.5 - gap;
  for (const sx of [-1, 1]) {
    g.push().at(sx * (gap + lip * 0.5), -0.005, 0);
    g.box(lip, 0.01, d, 0.0008);
    g.pop();
  }
  if (gap > 0) {
    g.push().at(0, -0.0092, 0);
    g.box(gap * 2, 0.0016, d, 0.0006);
    g.pop();
  }
}

/* ------------------------------ grips ----------------------------------- */

export interface GripOptions {
  length: number;
  width: number;
  /** Rake from vertical, in radians. */
  angle: number;
  tint?: number;
  material?: 'metal' | 'polymer' | 'wood';
  /** Finger grooves down the front strap. */
  grooves?: number;
  beavertail?: boolean;
  /**
   * Rows of stippling on the side panels. A grip is the one part of a weapon
   * held against a hand, so it is the one part that is never smooth; without
   * this the panel is a flat plate and reads as one, particularly on a pistol
   * where the grip is a third of the whole silhouette.
   */
  stipple?: number;
}

/** Pistol grip hanging from the origin, raked backward by `angle`. */
export function pistolGrip(g: PartCtx, o: GripOptions): void {
  const tint = o.tint ?? TINT.polymer;
  g.use(o.material ?? 'polymer', tint);
  g.push();
  g.rx(-o.angle);
  const l = o.length;
  // Side profile: +X forward, +Y up. Swells toward the base and flares at the
  // heel, which is what stops a grip reading as a rectangle.
  const front = 0.019;
  const back = 0.021;
  g.sideProfile(
    [
      front, 0,
      front + 0.002, -l * 0.3,
      front - 0.001, -l * 0.62,
      front - 0.004, -l,
      -back + 0.008, -l - 0.002,
      -back - 0.002, -l * 0.72,
      -back - 0.004, -l * 0.34,
      -back + (o.beavertail ? -0.006 : 0.002), 0,
    ],
    o.width,
    0.0035,
  );
  // Texture panels: a real grip is checkered, and a plane change catches the
  // key light where a normal map alone would not.
  g.use(o.material ?? 'polymer', tint === TINT.polymer ? 0x1e2022 : tint);
  for (const sx of [-1, 1]) {
    g.push().at((sx * o.width) / 2, -l * 0.55, 0.0);
    g.rz(0.04 * sx);
    g.box(0.0018, l * 0.5, 0.028, 0.0008);
    g.pop();
  }
  if (o.stipple) {
    const cols = 4;
    for (const sx of [-1, 1]) {
      for (let r = 0; r < o.stipple; r++) {
        const ty = -l * (0.24 + 0.6 * (r / Math.max(1, o.stipple - 1)));
        for (let c = 0; c < cols; c++) {
          // Offset every other row, so the pattern is a stipple and not a grid.
          const tz = ((c + (r & 1 ? 0.5 : 0)) / cols - 0.44) * 0.026;
          g.push().at((sx * o.width) / 2 + sx * 0.0008, ty, tz);
          g.box(0.0016, 0.0026, 0.0026, 0.0009);
          g.pop();
        }
      }
    }
  }
  // Finger grooves run *across* the front strap, which is at -Z: the profile is
  // authored +X forward and `sideProfile` maps that onto the weapon's -Z.
  if (o.grooves) {
    for (let i = 0; i < o.grooves; i++) {
      const t = (i + 1) / (o.grooves + 1);
      g.push().at(0, -l * t, -(front - 0.005 + 0.001 * Math.sin(t * 3)));
      g.ry(Math.PI / 2);
      g.cyl(0.0035, o.width - 0.004, { segments: 8 });
      g.pop();
    }
  }
  g.pop();
}

/* ------------------------- trigger and guard ----------------------------- */

/** Trigger guard bow. The trigger blade itself is a separate animated node. */
export function triggerGuard(
  g: PartCtx,
  z: number,
  y: number,
  width: number,
  tint: number = TINT.receiver,
): void {
  g.use('metal', tint);
  g.push().at(0, y, z);
  g.sideProfile(
    [
      0.030, 0.000,
      0.030, -0.006,
      0.024, -0.020,
      0.006, -0.027,
      -0.014, -0.026,
      -0.024, -0.018,
      -0.026, 0.000,
      -0.020, 0.000,
      -0.019, -0.015,
      -0.012, -0.021,
      0.004, -0.022,
      0.019, -0.017,
      0.024, -0.006,
      0.024, 0.000,
    ],
    width,
    0.0014,
  );
  g.pop();
}

export function triggerBlade(g: PartCtx, width = 0.0055, tint: number = TINT.steel): void {
  g.use('metal', tint);
  // Curved blade with a wide shoe, authored as a side profile.
  g.sideProfile(
    [
      0.004, 0.000,
      0.005, -0.008,
      0.004, -0.014,
      0.000, -0.018,
      -0.004, -0.017,
      -0.005, -0.010,
      -0.004, 0.000,
    ],
    width,
    0.0008,
  );
  g.push().at(0, 0.002, 0).ry(Math.PI / 2);
  g.cyl(0.0022, width + 0.002, { segments: 10, chamfer: 0.0004 });
  g.pop();
}

/* ------------------------------ sights ----------------------------------- */

/**
 * Rear aperture sight. Its aperture centre is placed **at the origin**, which
 * is the whole basis of the aiming solution.
 */
export function rearAperture(g: PartCtx, height: number, tint: number = TINT.steel): void {
  g.use('metal', tint);
  g.push();
  // Ring around the aperture.
  g.at(0, 0, 0);
  g.rz(0);
  g.torus(0.0034, 0.0011, 14, 6);
  // Protective ears either side.
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0062, -height * 0.28, 0);
    g.box(0.0022, height * 0.8, 0.006, 0.0006);
    g.pop();
  }
  // Base leaf and windage drum.
  g.push().at(0, -height * 0.72, 0);
  g.box(0.016, height * 0.4, 0.010, 0.0009);
  g.pop();
  g.push().at(0.008, -height * 0.5, 0).ry(Math.PI / 2);
  g.cyl(0.0032, 0.004, { segments: 10, chamfer: 0.0006 });
  g.pop();
  g.pop();
}

/** Front post inside protective wings, its tip on the sight axis at `-z`. */
export function frontPost(g: PartCtx, z: number, height: number, tint: number = TINT.steel): void {
  g.use('metal', tint);
  g.push().at(0, 0, z);
  // Post: tip at y = 0.
  g.push().at(0, -height * 0.5, 0);
  g.box(0.0018, height, 0.0026, 0.0004);
  g.pop();
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0068, -height * 0.4, 0);
    g.rz(-sx * 0.12);
    g.box(0.0022, height * 1.15, 0.0075, 0.0007);
    g.pop();
  }
  g.pop();
}

/* ------------------------------ muzzles ---------------------------------- */

export function birdcage(g: PartCtx, bore: number, tint: number = TINT.steel): void {
  g.use('metal', tint);
  const r = bore * 1.9;
  g.tube(r, bore * 0.62, 0.045, 14, 0.0008);
  // Closed rear collar and the port slots that define the silhouette.
  g.push().at(0, 0, 0.019);
  g.cyl(r * 1.05, 0.008, { segments: 14, chamfer: 0.0008 });
  g.pop();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.5 + ((i - 2) / 5) * Math.PI * 1.35;
    g.push().at(Math.cos(a) * r, Math.sin(a) * r, -0.004);
    g.rz(a);
    g.box(0.0022, 0.004, 0.020, 0.0004);
    g.pop();
  }
  for (const z of [0.006, -0.014]) {
    g.push().at(0, 0, z);
    g.cyl(r * 1.02, 0.003, { segments: 14, chamfer: 0.0006 });
    g.pop();
  }
}

export function muzzleBrake(g: PartCtx, bore: number, tint: number = TINT.steel): void {
  g.use('metal', tint);
  const r = bore * 2.1;
  g.tube(r, bore * 0.6, 0.052, 14, 0.001);
  for (let i = 0; i < 3; i++) {
    const z = -0.014 + i * 0.011;
    for (const sx of [-1, 1]) {
      g.push().at(sx * r * 0.72, 0.002, z);
      g.rz(sx * 0.25);
      g.box(0.006, 0.010, 0.0042, 0.0008);
      g.pop();
    }
  }
  g.push().at(0, 0, 0.021);
  g.hexHead(r * 2.0, 0.008);
  g.pop();
}

export function suppressor(g: PartCtx, bore: number, length = 0.19, tint = 0x1f2124): void {
  g.use('metal', tint);
  const r = Math.max(0.0175, bore * 3.1);
  g.lathe(
    [
      [length * 0.5, r * 0.62],
      [length * 0.5 - 0.006, r * 0.94],
      [length * 0.5 - 0.014, r],
      [-length * 0.5 + 0.02, r],
      [-length * 0.5 + 0.008, r * 0.98],
      [-length * 0.5, r * 0.86],
    ],
    18,
    true,
    false,
  );
  // Bore through the front face so the can is not a capped cylinder.
  g.push().at(0, 0, -length * 0.5 + 0.004);
  g.tube(r * 0.86, bore * 0.7, 0.01, 14, 0.0008);
  g.pop();
  // Knurled grip band and a stencilled ring, so the tube is not featureless.
  const bands = 22;
  for (let i = 0; i < bands; i++) {
    const a = (i / bands) * Math.PI * 2;
    g.push().at(Math.cos(a) * r, Math.sin(a) * r, length * 0.5 - 0.03);
    g.rz(a);
    g.box(0.0012, 0.0016, 0.03, 0.0003);
    g.pop();
  }
  g.use('metal', 0x2a2c30);
  g.push().at(0, 0, -length * 0.5 + 0.028);
  g.cyl(r * 1.02, 0.005, { segments: 18, chamfer: 0.001 });
  g.pop();
}

/* ------------------------------- sling ----------------------------------- */

export function slingLoop(g: PartCtx, x: number, y: number, z: number, radius = 0.008): void {
  g.use('metal', TINT.steel);
  g.push().at(x, y, z);
  g.rx(Math.PI / 2);
  g.torus(radius, radius * 0.28, 12, 6);
  g.pop();
}

/* ------------------------------ casings ---------------------------------- */

/** A single cartridge case, used for loaded rounds and ejected brass. */
export function cartridge(
  g: PartCtx,
  caliber: number,
  length: number,
  bulleted: boolean,
): void {
  const r = caliber * 0.0005;
  g.use('metal', TINT.brass);
  g.cyl(r, length, { segments: 10, chamfer: r * 0.15 });
  g.push().at(0, 0, -length * 0.5);
  g.cyl(r * 1.08, 0.0012, { segments: 10, chamfer: 0.0004 });
  g.pop();
  if (!bulleted) return;
  g.use('metal', TINT.copper);
  g.push().at(0, 0, length * 0.5 + 0.004);
  g.cyl(r * 0.86, 0.009, { r2: r * 0.28, segments: 10 });
  g.pop();
}
