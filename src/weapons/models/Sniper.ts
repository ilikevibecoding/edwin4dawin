import { Assembly, type PartCtx } from '../parts/Assembly';
import * as C from '../parts/Components';
import { TINT } from '../parts/Components';
import { pose, type ModelDeps, type ModelVariant, type WeaponModel } from '../WeaponModel';
import { finishModel } from './Finish';

/**
 * Bolt-action precision rifle in a chassis stock.
 *
 * The heavy fluted barrel does two jobs: it is what a magnum-calibre rifle
 * actually needs, and the flutes give the longest, emptiest part of the
 * silhouette something for the key light to break on. The bolt is a real turn
 * bolt — the handle lifts through 60 degrees before it draws back — because a
 * bolt that slides straight out looks like a mistake.
 */

const BORE = -0.062;
const REAR = 0.075;
const ACTION_FRONT = -0.14;
const MUZZLE_Z = -0.66;

export function buildSniper(deps: ModelDeps, variant: ModelVariant): WeaponModel {
  const a = new Assembly(deps.materials);
  const detail = deps.quality.preset === 'low' ? 0 : 1;

  const body = a.node('body');
  action(body, detail);
  barrel(body, variant.suppressor, detail);
  chassis(body, detail);
  if (variant.optic === 'irons' || variant.optic === 'none') backupSights(body);

  const bolt = a.node('bolt', [0, BORE + 0.012, -0.03]);
  boltAssembly(bolt, detail);

  const bipodNode = a.node('bipod', [0, BORE - 0.03, -0.44]);
  bipod(bipodNode, detail);

  const mag = a.node('magazine', [0, BORE - 0.028, -0.06]);
  mag.push().pivot();
  C.magazine(mag, {
    length: 0.09,
    width: 0.028,
    depth: 0.05,
    ribs: 2,
    material: 'metal',
    tint: 0x2c2e32,
    topRound: true,
    caliber: 8.6,
  });
  mag.pop();

  const trigger = a.node('trigger', [0, BORE - 0.03, -0.012]);
  trigger.push().pivot();
  C.triggerBlade(trigger, 0.0048);
  trigger.pop();

  a.node('optic', [0, 0, -0.05]);

  const built = a.build('sniper', 0.62, 78);

  return finishModel({
    id: 'sniper',
    built,
    deps,
    opticKind: variant.optic,
    opticZ: -0.05,
    opticBaseY: -0.028,
    vmFovHip: 34,
    vmFovAds: 15,
    baseFov: 80,
    ironRear: [0, 0, 0],
    ironFront: [0, 0, ACTION_FRONT - 0.26],
    muzzle: [0, BORE, variant.suppressor ? MUZZLE_Z - 0.16 : MUZZLE_Z],
    ejectPort: [0.024, BORE + 0.014, -0.03],
    ejectDir: [0.92, 0.34, 0.16],
    magSocket: [0, BORE - 0.034, -0.06],
    hipPose: pose(0.088, -0.052, -0.62, 0.018, 0.14, 0.046),
    sprintPose: pose(0.128, -0.098, -0.56, 0.14, 0.58, 0.38),
    loweredPose: pose(0.098, -0.235, -0.58, -0.68, 0.21, 0.13),
    inspectPose: pose(0.013, -0.075, -0.52, 0.1, -0.78, 0.28),
    boltTravel: 0.09,
    chargeTravel: 0.09,
    triggerPull: 0.22,
    boltLift: 1.05,
    reloadStyle: 'boltAction',
    magSize: [0.015, 0.05, 0.026],
    caseRadius: 0.0053,
    caseLength: 0.0635,
    boltLockTravel: 0,
  });
}

/* ------------------------------- action ---------------------------------- */

function action(g: PartCtx, detail: number): void {
  const seg = detail ? 16 : 10;
  g.use('metal', 0x26282c);
  // Round receiver with a flat bottom, as a bedded action has.
  g.push().at(0, BORE + 0.012, (REAR + ACTION_FRONT) * 0.5);
  g.cyl(0.0185, REAR - ACTION_FRONT, { segments: seg, chamfer: 0.0018 });
  g.pop();
  g.boxAt(0, BORE - 0.006, (REAR + ACTION_FRONT) * 0.5, 0.038, 0.02, REAR - ACTION_FRONT, 0.0018);

  // Ejection / loading port on the right of the action.
  g.use('metal', 0x121316);
  g.boxAt(0.0198, BORE + 0.014, -0.03, 0.004, 0.024, 0.088, 0.0008);
  g.use('metal', 0x26282c);
  g.boxAt(0.0208, BORE + 0.03, -0.03, 0.004, 0.01, 0.094, 0.0008);
  g.boxAt(0.0208, BORE - 0.002, -0.03, 0.004, 0.012, 0.094, 0.0008);
  g.boxAt(0.0208, BORE + 0.014, -0.079, 0.004, 0.02, 0.014, 0.0008);
  g.boxAt(0.0208, BORE + 0.014, 0.019, 0.004, 0.02, 0.014, 0.0008);

  // Bolt raceway slot in the right wall, so the handle has somewhere to travel.
  g.use('metal', 0x131417);
  g.boxAt(0.0202, BORE + 0.012, 0.038, 0.005, 0.014, 0.062, 0.0006);

  // Recoil lug, action screws, and the picatinny scope base.
  g.use('metal', 0x2f3237);
  g.boxAt(0, BORE - 0.018, ACTION_FRONT + 0.016, 0.03, 0.012, 0.012, 0.0012);
  g.use('metal', 0x323438);
  g.push().at(0, -0.0312, (REAR - 0.01 + ACTION_FRONT + 0.02) * 0.5);
  g.picatinny(Math.round((REAR - 0.03 - ACTION_FRONT) / 0.01), 0.0212, 0.0064);
  g.pop();
  if (detail) {
    for (const z of [-0.02, -0.1]) C.crossPins(g, [[z, BORE - 0.014]], 0.0035, 0.04);
  }

  // Tang and safety at the rear.
  g.use('metal', 0x2a2c30);
  g.boxAt(0, BORE + 0.006, REAR + 0.012, 0.03, 0.03, 0.02, 0.002);
  g.use('metal', 0x3d4045);
  g.boxAt(0.011, BORE + 0.03, REAR + 0.008, 0.008, 0.008, 0.022, 0.0009);
}

function boltAssembly(g: PartCtx, detail: number): void {
  const seg = detail ? 14 : 10;
  g.use('metal', 0x6a6f76);
  // Bolt body, only partly inside the action.
  g.push().at(0, BORE + 0.012, 0.006);
  g.cyl(0.0108, 0.15, { segments: seg, chamfer: 0.0012 });
  g.pop();
  // Shroud and cocking piece at the rear.
  g.use('metal', 0x4c5057);
  g.push().at(0, BORE + 0.012, REAR + 0.014);
  g.cyl(0.0122, 0.026, { segments: seg, chamfer: 0.0014 });
  g.pop();
  g.use('metal', 0xb03a24);
  g.push().at(0, BORE + 0.012, REAR + 0.03);
  g.cyl(0.0062, 0.008, { segments: 10, chamfer: 0.0008 });
  g.pop();
  // Lugs at the front.
  g.use('metal', 0x7a8087);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    g.push().at(Math.cos(ang) * 0.011, BORE + 0.012 + Math.sin(ang) * 0.011, -0.062);
    g.rz(ang);
    g.box(0.006, 0.008, 0.016, 0.0008);
    g.pop();
  }
  // Handle: root, arm and knob, swept back and down as a bolt handle is.
  g.use('metal', 0x54585f);
  g.push().at(0, BORE + 0.012, 0.04);
  g.cyl(0.0128, 0.018, { segments: seg, chamfer: 0.0012 });
  g.pop();
  g.push().at(0.02, BORE + 0.004, 0.04).rz(-0.42).ry(Math.PI / 2);
  g.cyl(0.005, 0.03, { segments: 10, chamfer: 0.0008 });
  g.pop();
  g.use('metal', 0x3a3d42);
  g.push().at(0.036, BORE - 0.006, 0.04);
  g.cyl(0.0105, 0.019, { r2: 0.0088, segments: detail ? 14 : 10, chamfer: 0.0022 });
  g.pop();
}

/* -------------------------------- barrel --------------------------------- */

function barrel(g: PartCtx, suppressed: boolean, detail: number): void {
  g.use('metal', 0x2f3237);
  // Chamber end, then the fluted section, then the threaded muzzle.
  g.push().at(0, BORE, ACTION_FRONT - 0.03);
  g.cyl(0.0165, 0.06, { r2: 0.0148, segments: detail ? 16 : 10, chamfer: 0.0014 });
  g.pop();
  g.push().at(0, BORE, (ACTION_FRONT - 0.06 + MUZZLE_Z + 0.05) * 0.5);
  if (detail) {
    g.flutedCyl(0.0142, Math.abs(ACTION_FRONT - 0.06 - MUZZLE_Z - 0.05), 8, 0.0026, 40);
  } else {
    g.cyl(0.0142, Math.abs(ACTION_FRONT - 0.06 - MUZZLE_Z - 0.05), { segments: 10 });
  }
  g.pop();
  g.push().at(0, BORE, MUZZLE_Z + 0.028);
  g.cyl(0.0128, 0.05, { segments: detail ? 14 : 10, chamfer: 0.0014 });
  g.pop();

  if (suppressed) {
    g.push().at(0, BORE, MUZZLE_Z - 0.082);
    C.suppressor(g, 0.0043, 0.21, 0x1e2022);
    g.pop();
  } else {
    g.push().at(0, BORE, MUZZLE_Z - 0.024);
    C.muzzleBrake(g, 0.0043);
    g.pop();
  }
}

/* ------------------------------- chassis --------------------------------- */

function chassis(g: PartCtx, detail: number): void {
  g.use('metal', 0x33363b);
  // Chassis body under the action, running back to the buttstock spine.
  g.push().at(0, BORE - 0.03, -0.03);
  g.sideProfile(
    [
      0.12, 0.012,
      0.12, -0.012,
      0.02, -0.026,
      -0.06, -0.03,
      -0.12, -0.024,
      -0.13, 0.012,
    ],
    0.042,
    0.003,
  );
  g.pop();

  // Magazine well.
  g.use('metal', 0x2a2c30);
  const mz = -0.06;
  for (const sx of [-1, 1]) {
    g.boxAt(sx * 0.0175, BORE - 0.036, mz, 0.005, 0.024, 0.056, 0.0016);
  }
  g.boxAt(0, BORE - 0.036, mz + 0.028, 0.04, 0.024, 0.005, 0.0016);
  g.boxAt(0, BORE - 0.036, mz - 0.028, 0.04, 0.024, 0.005, 0.0016);

  C.triggerGuard(g, -0.014, BORE - 0.048, 0.014, 0x2f3237);

  // Thumbhole grip.
  g.use('polymer', TINT.polymer);
  g.push().at(0, BORE - 0.044, 0.052);
  C.pistolGrip(g, {
    length: 0.1,
    width: 0.032,
    angle: 0.2,
    grooves: detail ? 4 : 0,
    stipple: detail ? 10 : 0,
    beavertail: true,
    tint: TINT.polymer,
  });
  g.pop();

  // Buttstock: spine, adjustable comb and butt plate.
  g.use('metal', 0x33363b);
  g.push().at(0, BORE - 0.014, REAR + 0.11);
  g.sideProfile(
    [
      -0.12, 0.03,
      -0.104, 0.036,
      -0.04, 0.03,
      0.055, 0.014,
      0.055, -0.026,
      -0.02, -0.03,
      -0.09, -0.044,
      -0.12, -0.04,
    ],
    0.03,
    0.0028,
  );
  g.pop();
  g.use('polymer', TINT.polymer2);
  g.push().at(0, BORE + 0.024, REAR + 0.078);
  g.box(0.034, 0.016, 0.085, 0.0025);
  g.pop();
  // Comb posts, so the cheek piece looks adjustable rather than moulded on.
  g.use('metal', TINT.bright);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.012, BORE + 0.01, REAR + 0.078).rx(Math.PI / 2);
    g.cyl(0.0028, 0.014, { segments: 8 });
    g.pop();
  }
  g.use('polymer', TINT.rubber);
  g.push().at(0, BORE - 0.014, REAR + 0.235);
  g.box(0.03, 0.072, 0.014, 0.003);
  g.pop();
  // Monopod knob under the toe.
  g.use('metal', 0x3d4045);
  g.push().at(0, BORE - 0.056, REAR + 0.192).rx(Math.PI / 2);
  g.cyl(0.009, 0.026, { segments: 10, chamfer: 0.0014 });
  g.pop();

  // Handguard tube around the barrel, with its own rail.
  g.use('metal', 0x2b2d31);
  g.push().at(0, BORE, ACTION_FRONT - 0.16).rz(Math.PI / 8);
  g.cyl(0.03, 0.29, { segments: detail ? 8 : 6, chamfer: 0.002 });
  g.pop();
  g.use('metal', 0x131417);
  g.push().at(0, BORE, ACTION_FRONT - 0.298).rz(Math.PI / 8);
  g.tube(0.028, 0.019, 0.016, detail ? 8 : 6, 0.001);
  g.pop();
  g.use('metal', 0x323438);
  g.push().at(0, -0.0312, ACTION_FRONT - 0.16);
  g.picatinny(26, 0.0212, 0.0064);
  g.pop();
  g.use('metal', 0x121316);
  for (let i = 0; i < (detail ? 6 : 3); i++) {
    const z = ACTION_FRONT - 0.05 - i * 0.04;
    for (const sx of [-1, 1]) {
      g.push().at(sx * 0.0278, BORE + 0.002, z);
      g.box(0.003, 0.01, 0.022, 0.0006);
      g.pop();
    }
  }
  C.slingLoop(g, -0.03, BORE - 0.014, ACTION_FRONT - 0.1, 0.008);
}

function bipod(g: PartCtx, detail: number): void {
  g.use('metal', 0x2c2e32);
  g.push().at(0, BORE - 0.03, -0.44);
  g.box(0.022, 0.016, 0.03, 0.0016);
  g.pop();
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.012, BORE - 0.038, -0.44);
    g.rz(-sx * 0.42);
    g.push().at(0, -0.045, 0);
    g.box(0.009, 0.09, 0.011, 0.0014);
    g.pop();
    g.use('metal', 0x4a4e54);
    g.push().at(0, -0.1, 0).rx(Math.PI / 2);
    g.cyl(0.0034, 0.05, { segments: 8, chamfer: 0.0006 });
    g.pop();
    g.use('polymer', TINT.rubber);
    g.push().at(0, -0.125, 0).rx(Math.PI / 2);
    g.cyl(0.007, 0.008, { segments: detail ? 10 : 6, chamfer: 0.0012 });
    g.pop();
    g.use('metal', 0x2c2e32);
    g.pop();
  }
}

function backupSights(g: PartCtx): void {
  C.rearAperture(g, 0.026);
  C.frontPost(g, ACTION_FRONT - 0.26, 0.024);
  g.use('metal', TINT.steel);
  g.boxAt(0, -0.0235, ACTION_FRONT - 0.26, 0.019, 0.01, 0.02, 0.0009);
}
