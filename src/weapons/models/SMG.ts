import { Assembly, type PartCtx } from '../parts/Assembly';
import * as C from '../parts/Components';
import { TINT } from '../parts/Components';
import { pose, type ModelDeps, type ModelVariant, type WeaponModel } from '../WeaponModel';
import { finishModel } from './Finish';

/**
 * MP5-pattern roller-delayed submachine gun.
 *
 * Almost nothing here is shared with the carbine, which is the point: a stamped
 * round receiver instead of a milled slab, a cocking tube welded along the left
 * of the barrel instead of a handle in the top deck, a rotary drum rear sight
 * instead of an aperture leaf, and a side-folding stock instead of a buffer
 * tube. Two black rifles that read as the same gun with different proportions
 * is the usual failure, so the silhouette is built from those differences.
 */

const BORE = -0.05;
const REAR = 0.02;
const FRONT = -0.185;
const MUZZLE_Z = -0.29;
const HALF_W = 0.0175;

export function buildSMG(deps: ModelDeps, variant: ModelVariant): WeaponModel {
  const a = new Assembly(deps.materials);
  const detail = deps.quality.preset === 'low' ? 0 : 1;

  const body = a.node('body');
  receiver(body, detail);
  cockingTube(body, detail);
  handguard(body, detail);
  barrel(body, variant.suppressor, detail);
  triggerGroup(body, detail);
  if (variant.optic === 'irons' || variant.optic === 'none') sights(body, detail);
  else claw(body, detail);

  const bolt = a.node('bolt', [0, BORE + 0.002, -0.02]);
  boltHead(bolt);

  const charge = a.node('charge', [-0.026, BORE + 0.024, FRONT + 0.02]);
  cockingHandle(charge);

  const mag = a.node('magazine', [0, BORE - 0.021, -0.088]);
  mag.push().pivot().rx(-0.07);
  C.magazine(mag, {
    length: 0.17,
    width: 0.024,
    depth: 0.031,
    curve: 0.62,
    ribs: 5,
    material: 'metal',
    tint: 0x2f3236,
    topRound: true,
    caliber: 9,
  });
  mag.pop();

  const trigger = a.node('trigger', [0, BORE - 0.019, -0.05]);
  trigger.push().pivot();
  C.triggerBlade(trigger);
  trigger.pop();

  const stock = a.node('stock', [-0.019, BORE + 0.008, REAR + 0.012]);
  foldingStock(stock, detail);

  a.node('optic', [0, 0, -0.05]);

  const built = a.build('smg', 0.6, 72);

  return finishModel({
    id: 'smg',
    built,
    deps,
    opticKind: variant.optic,
    opticZ: -0.05,
    opticBaseY: -0.0265,
    vmFovHip: 38,
    vmFovAds: 16,
    baseFov: 80,
    ironRear: [0, 0, 0.004],
    ironFront: [0, 0, MUZZLE_Z + 0.016],
    muzzle: [0, BORE, variant.suppressor ? MUZZLE_Z - 0.15 : MUZZLE_Z],
    ejectPort: [0.021, BORE + 0.006, -0.03],
    ejectDir: [0.9, 0.38, 0.2],
    magSocket: [0, BORE - 0.026, -0.088],
    hipPose: pose(0.084, -0.048, -0.58, 0.02, 0.16, 0.052),
    sprintPose: pose(0.122, -0.092, -0.5, 0.17, 0.62, 0.42),
    loweredPose: pose(0.092, -0.215, -0.52, -0.72, 0.24, 0.14),
    inspectPose: pose(0.01, -0.07, -0.46, 0.12, -0.86, 0.32),
    boltTravel: 0.04,
    chargeTravel: 0.062,
    triggerPull: 0.3,
    reloadStyle: 'magazine',
    magSize: [0.012, 0.085, 0.017],
    caseRadius: 0.0048,
    caseLength: 0.019,
    boltLockTravel: 0,
  });
}

/* ------------------------------ receiver --------------------------------- */

function receiver(g: PartCtx, detail: number): void {
  const seg = detail ? 14 : 10;
  g.use('metal', 0x2a2c30);
  // Stamped tube with the flats a real MP5 receiver carries.
  g.push().at(0, BORE + 0.004, (REAR + FRONT) * 0.5);
  g.cyl(0.0182, REAR - FRONT, { segments: seg, chamfer: 0.0016 });
  g.pop();
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0172, BORE + 0.004, (REAR + FRONT) * 0.5);
    g.box(0.004, 0.026, REAR - FRONT, 0.0012);
    g.pop();
  }
  // Welded rib along the crown of the receiver: the sight base at the rear and
  // the claw-mount lugs live on it.
  g.boxAt(0, BORE + 0.0195, (REAR + FRONT) * 0.5, 0.015, 0.008, REAR - FRONT, 0.0012);

  // Ejection port through the right flat.
  g.use('metal', 0x131417);
  g.boxAt(0.0176, BORE + 0.006, -0.03, 0.004, 0.019, 0.05, 0.0008);
  g.use('metal', 0x2a2c30);
  g.boxAt(0.0192, BORE + 0.017, -0.03, 0.0035, 0.008, 0.056, 0.0008);
  g.boxAt(0.0192, BORE - 0.005, -0.03, 0.0035, 0.008, 0.056, 0.0008);
  g.boxAt(0.0192, BORE + 0.006, -0.061, 0.0035, 0.014, 0.012, 0.0008);
  g.boxAt(0.0192, BORE + 0.006, 0.001, 0.0035, 0.014, 0.012, 0.0008);

  // Rear end cap with the stock hinge lugs.
  g.boxAt(0, BORE + 0.004, REAR + 0.006, 0.036, 0.036, 0.014, 0.002);
  g.use('metal', TINT.steel);
  g.push().at(-0.019, BORE + 0.008, REAR + 0.012).ry(Math.PI / 2);
  g.cyl(0.0055, 0.008, { segments: 10, chamfer: 0.001 });
  g.pop();

  // Magazine housing: the distinctive forward-canted well.
  g.use('metal', 0x2f3236);
  g.push().at(0, BORE - 0.017, -0.088).rx(-0.07);
  g.box(0.031, 0.034, 0.042, 0.0018);
  g.pop();
  g.use('metal', 0x35383c);
  g.push().at(0, BORE - 0.032, -0.088).rx(-0.07);
  g.trapezoid(0.04, 0.031, 0.008, 0.05, 0.0009);
  g.pop();
  // Magazine release paddle behind the well.
  g.push().at(0, BORE - 0.026, -0.062);
  g.box(0.03, 0.008, 0.014, 0.001);
  g.pop();
}

function cockingTube(g: PartCtx, detail: number): void {
  const seg = detail ? 12 : 8;
  g.use('metal', 0x2c2e32);
  g.push().at(-0.0175, BORE + 0.019, (FRONT - 0.052) * 0.5 - 0.03);
  g.rz(0.35);
  g.cyl(0.0115, Math.abs(FRONT - MUZZLE_Z) + 0.03, { segments: seg, chamfer: 0.0012 });
  g.pop();
  // The tube blends into the receiver at the rear and into the front sight base.
  g.push().at(-0.0175, BORE + 0.019, FRONT + 0.014);
  g.cyl(0.0128, 0.03, { segments: seg, chamfer: 0.0014 });
  g.pop();
  // Cocking handle slot: a dark channel so the handle looks like it runs in one.
  g.use('metal', 0x131417);
  g.boxAt(-0.028, BORE + 0.022, FRONT - 0.03, 0.0035, 0.007, 0.075, 0.0006);
}

function cockingHandle(g: PartCtx): void {
  g.use('metal', 0x3a3d42);
  g.push().at(-0.028, BORE + 0.022, FRONT + 0.02);
  g.box(0.006, 0.0075, 0.03, 0.0009);
  g.at(-0.008, 0.0, -0.004);
  g.rz(0.25);
  g.box(0.013, 0.0085, 0.02, 0.0014);
  g.pop();
  g.use('metal', 0x25272b);
  g.push().at(-0.038, BORE + 0.024, FRONT + 0.016);
  g.serrations(4, 0.0032, 0.011, 0.002, 0.0008, 0);
  g.pop();
}

function boltHead(g: PartCtx): void {
  g.use('metal', 0x4b4e54);
  g.push().at(0, BORE + 0.005, -0.03);
  g.cyl(0.0135, 0.085, { segments: 12, chamfer: 0.001 });
  g.pop();
  g.use('metal', 0x1e1f22);
  g.push().at(0, BORE + 0.005, -0.073);
  g.cyl(0.0062, 0.0025, { segments: 10 });
  g.pop();
  g.use('metal', 0x5a5e64);
  g.boxAt(0.006, BORE + 0.015, -0.028, 0.008, 0.006, 0.03, 0.0008);
}

/* ------------------------------ handguard -------------------------------- */

function handguard(g: PartCtx, detail: number): void {
  const z0 = FRONT + 0.005;
  const z1 = MUZZLE_Z + 0.028;
  g.use('polymer', TINT.polymer);
  // Wide "tropical" handguard: a rounded slab, not a tube.
  g.push().at(0, BORE - 0.001, (z0 + z1) * 0.5);
  g.rz(Math.PI / 10);
  g.cyl(0.026, z0 - z1, { segments: detail ? 10 : 8, chamfer: 0.0022 });
  g.pop();
  g.use('polymer', TINT.polymer2);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0225, BORE - 0.004, (z0 + z1) * 0.5);
    g.rz(-sx * 0.12);
    g.box(0.004, 0.026, (z0 - z1) * 0.82, 0.0014);
    g.pop();
  }
  // Finger swell underneath and the retaining pin at the rear.
  g.push().at(0, BORE - 0.024, (z0 + z1) * 0.5 - 0.01);
  g.box(0.026, 0.008, 0.05, 0.0022);
  g.pop();
  g.use('metal', TINT.steel);
  g.pinX(0, BORE - 0.016, z0 - 0.008, 0.0028, 0.05, 8);
}

function barrel(g: PartCtx, suppressed: boolean, detail: number): void {
  g.use('metal', TINT.steel);
  g.push().at(0, BORE, (FRONT + MUZZLE_Z) * 0.5);
  g.cyl(0.0092, Math.abs(FRONT - MUZZLE_Z), { segments: detail ? 12 : 8, chamfer: 0.0008 });
  g.pop();
  // Front sight hood: the MP5's open-topped ring.
  g.use('metal', 0x2c2e32);
  g.push().at(0, BORE + 0.005, MUZZLE_Z + 0.016);
  g.rx(Math.PI / 2);
  g.tube(0.0155, 0.0115, 0.02, detail ? 12 : 8, 0.0008);
  g.pop();
  if (suppressed) {
    g.push().at(0, BORE, MUZZLE_Z - 0.075);
    C.suppressor(g, 0.0045, 0.2, 0x232527);
    g.pop();
  } else {
    g.use('metal', 0x3a3d42);
    g.push().at(0, BORE, MUZZLE_Z - 0.004);
    g.cyl(0.0122, 0.014, { segments: detail ? 12 : 8, chamfer: 0.0012 });
    g.pop();
    g.push().at(0, BORE, MUZZLE_Z - 0.012);
    g.tube(0.0098, 0.0048, 0.008, 10, 0.0006);
    g.pop();
  }
}

/* ---------------------------- trigger group ------------------------------ */

function triggerGroup(g: PartCtx, detail: number): void {
  g.use('polymer', TINT.polymer);
  // One-piece polymer trigger group and grip, as on an MP5.
  g.push().at(0, BORE - 0.026, -0.03);
  g.box(0.034, 0.02, 0.088, 0.0022);
  g.pop();
  g.push().at(0, BORE - 0.03, 0.004);
  C.pistolGrip(g, {
    length: 0.09,
    width: 0.032,
    angle: 0.33,
    grooves: detail ? 3 : 0,
    stipple: detail ? 8 : 0,
    tint: TINT.polymer,
  });
  g.pop();
  C.triggerGuard(g, -0.05, BORE - 0.035, 0.013, TINT.polymer);
  // SEF selector, both sides.
  g.use('polymer', 0x1c1d20);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.018, BORE - 0.022, -0.016).ry((sx * Math.PI) / 2);
    g.cyl(0.007, 0.004, { segments: 10, chamfer: 0.0008 });
    g.at(0, -0.009, 0.003);
    g.box(0.006, 0.02, 0.006, 0.0008);
    g.pop();
  }
  g.use('metal', TINT.steel);
  g.pinX(0, BORE - 0.02, -0.062, 0.0032, 0.036, 8);
  g.pinX(0, BORE - 0.02, 0.008, 0.0032, 0.036, 8);
}

/* ------------------------------- stock ----------------------------------- */

function foldingStock(g: PartCtx, _detail: number): void {
  const y = BORE + 0.008;
  g.use('metal', 0x2e3135);
  // Two struts and a butt plate: the folding stock's whole vocabulary.
  for (const sy of [-1, 1]) {
    g.push().at(-0.019, y + sy * 0.014, REAR + 0.085);
    g.rx(sy * 0.02);
    g.box(0.008, 0.008, 0.15, 0.0012);
    g.pop();
  }
  g.push().at(-0.019, y, REAR + 0.165);
  g.box(0.012, 0.05, 0.014, 0.0018);
  g.pop();
  g.use('polymer', TINT.rubber);
  g.push().at(-0.019, y, REAR + 0.176);
  g.box(0.016, 0.056, 0.01, 0.0022);
  g.pop();
  g.use('metal', 0x3a3d42);
  g.push().at(-0.019, y, REAR + 0.014);
  g.box(0.016, 0.034, 0.018, 0.0018);
  g.pop();
}

/* ------------------------------- sights ---------------------------------- */

function sights(g: PartCtx, detail: number): void {
  // Rotary drum rear sight, its aperture on the origin.
  g.use('metal', 0x2c2e32);
  g.push().at(0, -0.012, 0.004).rx(Math.PI / 2);
  g.cyl(0.0125, 0.026, { segments: detail ? 14 : 10, chamfer: 0.0012 });
  g.pop();
  g.use('metal', TINT.steel);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0092, -0.004, 0.004);
    g.box(0.003, 0.018, 0.02, 0.0007);
    g.pop();
  }
  g.push().at(0, 0, 0.004);
  g.torus(0.0032, 0.0011, 12, 6);
  g.pop();
  g.use('metal', 0x2c2e32);
  g.boxAt(0, -0.03, 0.004, 0.022, 0.014, 0.026, 0.0012);
  // Front post inside the hood, tip on the sight line.
  g.use('metal', TINT.steel);
  g.boxAt(0, -0.007, MUZZLE_Z + 0.016, 0.0022, 0.014, 0.0028, 0.0004);
}

function claw(g: PartCtx, detail: number): void {
  // HK claw lugs, welded to the receiver rib. The optic brings its own clamp
  // down onto this, which is exactly how the real mount works.
  g.use('metal', 0x26282c);
  for (const z of [-0.012, -0.09]) {
    g.boxAt(0, -0.0305, z, 0.026, 0.009, 0.016, 0.0014);
    if (detail) {
      g.screwX(0.0135, -0.0305, z, 0.0032, 0.001);
      g.screwX(-0.0135, -0.0305, z, 0.0032, 0.001);
    }
  }
  // Folded drum sight behind the mount.
  g.use('metal', 0x2c2e32);
  g.boxAt(0, -0.032, 0.006, 0.022, 0.01, 0.024, 0.0012);
}
