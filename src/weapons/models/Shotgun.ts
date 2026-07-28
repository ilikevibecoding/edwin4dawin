import { Assembly, type PartCtx } from '../parts/Assembly';
import * as C from '../parts/Components';
import { TINT } from '../parts/Components';
import { pose, type ModelDeps, type ModelVariant, type WeaponModel } from '../WeaponModel';
import { finishModel } from './Finish';

/**
 * Pump-action 12-gauge with walnut furniture.
 *
 * The wood is the whole point of this weapon existing in the loadout — it is
 * the one surface in the game lit as a dielectric with visible grain right in
 * front of the player, and it needs the `wood_planks` maps at their authored
 * scale to read. The rest is silhouette: a low sight line over a fat barrel, a
 * magazine tube slung underneath, and a fore-end that travels 90 mm every shot.
 */

/**
 * Riot guns wear rifle sights rather than a bead, which is convenient: it puts
 * the sight line 46 mm over the bore, high enough that a red dot clamped to the
 * receiver lands on the same axis without a riser.
 */
const BORE = -0.046;
const REAR = 0.03;
const ACTION_FRONT = -0.135;
const MUZZLE_Z = -0.56;
const PUMP_Z = -0.335;

export function buildShotgun(deps: ModelDeps, variant: ModelVariant): WeaponModel {
  const a = new Assembly(deps.materials);
  const detail = deps.quality.preset === 'low' ? 0 : 1;

  const body = a.node('body');
  receiver(body, detail);
  barrelAndTube(body, variant.suppressor, detail);
  stock(body, detail);
  if (variant.optic === 'irons' || variant.optic === 'none') ghostRing(body, detail);

  const bolt = a.node('bolt', [0, BORE + 0.006, -0.02]);
  breechBolt(bolt);

  const pump = a.node('pump', [0, BORE - 0.022, PUMP_Z]);
  foreEnd(pump, detail);

  const trigger = a.node('trigger', [0, BORE - 0.028, -0.048]);
  trigger.push().pivot();
  C.triggerBlade(trigger, 0.006);
  trigger.pop();

  // The shell held in the hand during a shell-by-shell reload.
  const loose = a.node('loose', [0.06, BORE - 0.09, -0.03]);
  loose.push().pivot().rx(Math.PI / 2);
  shell(loose);
  loose.pop();

  a.node('optic', [0, 0, -0.05]);

  const built = a.build('shotgun', 0.6, 76);

  return finishModel({
    id: 'shotgun',
    built,
    deps,
    opticKind: variant.optic,
    opticZ: -0.05,
    opticBaseY: -0.022,
    vmFovHip: 36,
    vmFovAds: 15,
    baseFov: 80,
    ironRear: [0, 0, 0.004],
    ironFront: [0, 0, MUZZLE_Z + 0.03],
    muzzle: [0, BORE, MUZZLE_Z],
    ejectPort: [0.026, BORE + 0.008, -0.05],
    ejectDir: [0.94, 0.3, 0.1],
    magSocket: [0, BORE - 0.03, -0.06],
    hipPose: pose(0.087, -0.05, -0.6, 0.02, 0.145, 0.048),
    sprintPose: pose(0.126, -0.096, -0.54, 0.15, 0.6, 0.4),
    loweredPose: pose(0.096, -0.228, -0.56, -0.7, 0.22, 0.13),
    inspectPose: pose(0.012, -0.074, -0.5, 0.1, -0.8, 0.3),
    boltTravel: 0.02,
    chargeTravel: 0.02,
    pumpTravel: 0.088,
    triggerPull: 0.26,
    reloadStyle: 'shellByShell',
    magSize: [0.012, 0.03, 0.012],
    caseRadius: 0.0093,
    caseLength: 0.07,
    boltLockTravel: 0,
  });
}

/* ------------------------------ receiver --------------------------------- */

function receiver(g: PartCtx, detail: number): void {
  const top = BORE + 0.024;
  const bottom = BORE - 0.034;
  g.use('metal', 0x24262a);
  // Milled slab receiver: flat sides, radiused top, flat crown for a mount.
  g.boxAt(0, (top + bottom) * 0.5, (REAR + ACTION_FRONT) * 0.5, 0.042, top - bottom, REAR - ACTION_FRONT, 0.0025);
  g.push().at(0, top - 0.018, (REAR + ACTION_FRONT) * 0.5);
  g.cyl(0.021, REAR - ACTION_FRONT - 0.004, {
    segments: detail ? 12 : 8,
    chamfer: 0.0018,
    arc: Math.PI,
    arcStart: 0,
  });
  g.pop();

  // Ejection port through the right wall, with the shell lifter visible inside.
  g.use('metal', 0x0f1012);
  g.boxAt(0.0206, BORE + 0.008, -0.05, 0.004, 0.026, 0.066, 0.0008);
  g.use('metal', 0x24262a);
  g.boxAt(0.0216, BORE + 0.026, -0.05, 0.004, 0.012, 0.072, 0.0008);
  g.boxAt(0.0216, BORE - 0.014, -0.05, 0.004, 0.018, 0.072, 0.0008);
  g.boxAt(0.0216, BORE + 0.008, -0.087, 0.004, 0.02, 0.014, 0.0008);
  g.boxAt(0.0216, BORE + 0.008, -0.013, 0.004, 0.02, 0.014, 0.0008);
  g.use('metal', 0x3d4045);
  g.push().at(0.008, BORE - 0.012, -0.05).rz(-0.2);
  g.box(0.02, 0.005, 0.05, 0.0008);
  g.pop();

  // Loading port and carrier underneath.
  g.use('metal', 0x131417);
  g.boxAt(0, bottom + 0.002, -0.05, 0.026, 0.005, 0.062, 0.0008);
  g.use('metal', 0x2f3237);
  g.boxAt(0, bottom + 0.005, -0.05, 0.022, 0.004, 0.05, 0.0006);

  // Trigger group, guard, safety button, action release.
  C.triggerGuard(g, -0.05, bottom + 0.002, 0.016, 0x2a2c30);
  g.use('metal', 0x3d4045);
  g.push().at(0, bottom - 0.004, -0.076).ry(Math.PI / 2);
  g.cyl(0.0042, 0.03, { segments: 10, chamfer: 0.0008 });
  g.pop();
  g.push().at(-0.02, bottom + 0.006, -0.086);
  g.box(0.006, 0.01, 0.016, 0.0008);
  g.pop();
  if (detail) {
    C.crossPins(g, [[-0.03, bottom + 0.012], [-0.086, bottom + 0.012]], 0.0034, 0.042);
  }

  // Barrel ring at the front of the receiver.
  g.use('metal', 0x2a2c30);
  g.push().at(0, BORE, ACTION_FRONT + 0.008);
  g.cyl(0.019, 0.018, { segments: detail ? 14 : 8, chamfer: 0.0016 });
  g.pop();
}

function breechBolt(g: PartCtx): void {
  g.use('metal', 0x585d64);
  g.push().at(0, BORE + 0.006, -0.03);
  g.cyl(0.0155, 0.075, { segments: 12, chamfer: 0.0012 });
  g.pop();
  g.use('metal', 0x1d1e21);
  g.push().at(0, BORE + 0.006, -0.066);
  g.cyl(0.0098, 0.003, { segments: 10 });
  g.pop();
  g.use('metal', 0x6d737a);
  g.boxAt(0.011, BORE + 0.014, -0.03, 0.008, 0.008, 0.04, 0.0008);
}

/* --------------------------- barrel and tube ----------------------------- */

function barrelAndTube(g: PartCtx, suppressed: boolean, detail: number): void {
  const seg = detail ? 14 : 8;
  g.use('metal', 0x2c2e32);
  g.push().at(0, BORE, (ACTION_FRONT + MUZZLE_Z) * 0.5);
  g.cyl(0.0118, Math.abs(ACTION_FRONT - MUZZLE_Z), { segments: seg, chamfer: 0.001 });
  g.pop();
  // Chamber swell at the breech end.
  g.push().at(0, BORE, ACTION_FRONT - 0.03);
  g.cyl(0.0138, 0.07, { r2: 0.0124, segments: seg, chamfer: 0.0012 });
  g.pop();
  // Muzzle crown, open so the bore is a hole.
  g.use('metal', 0x0e0f11);
  g.push().at(0, BORE, MUZZLE_Z + 0.008);
  g.tube(0.0112, 0.0092, 0.016, seg, 0.0007);
  g.pop();

  // Magazine tube, its end cap and the barrel band that ties them together.
  g.use('metal', 0x2c2e32);
  g.push().at(0, BORE - 0.0225, (ACTION_FRONT + MUZZLE_Z + 0.06) * 0.5);
  g.cyl(0.0118, Math.abs(ACTION_FRONT - MUZZLE_Z - 0.06), { segments: seg, chamfer: 0.001 });
  g.pop();
  g.use('metal', 0x3a3d42);
  g.push().at(0, BORE - 0.0225, MUZZLE_Z + 0.072);
  g.cyl(0.0132, 0.016, { segments: seg, chamfer: 0.0016 });
  g.pop();
  g.push().at(0, BORE - 0.011, MUZZLE_Z + 0.088);
  g.box(0.026, 0.036, 0.012, 0.0018);
  g.pop();

  if (suppressed) {
    g.push().at(0, BORE, MUZZLE_Z - 0.07);
    C.suppressor(g, 0.0093, 0.17, 0x232527);
    g.pop();
  }

}

/** Ghost-ring rear on the receiver, protected post at the muzzle. */
function ghostRing(g: PartCtx, detail: number): void {
  g.use('metal', 0x2a2c30);
  // Rear: a big shallow aperture on a folding leaf, its centre on the origin.
  g.push().at(0, 0, 0.004);
  g.torus(0.0042, 0.0013, detail ? 16 : 10, 6);
  g.pop();
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0075, -0.008, 0.004);
    g.box(0.0028, 0.02, 0.008, 0.0007);
    g.pop();
  }
  g.boxAt(0, -0.019, 0.004, 0.02, 0.008, 0.018, 0.0012);
  // Front: a post whose tip is on the sight line, inside protective wings.
  C.frontPost(g, MUZZLE_Z + 0.03, 0.024, 0x2a2c30);
  g.use('metal', 0x2a2c30);
  g.boxAt(0, BORE + 0.017, MUZZLE_Z + 0.03, 0.012, 0.014, 0.016, 0.0012);
  /* A fat brass bead rather than a pinhead. The sight radius here is 530 mm,
     so with the rear ring on the aimed focus plane the front sits at nearly a
     metre and carries five pixels of defocus; a 1.6 mm bead dissolves into
     that, and a 3 mm one stays a bead. Which is exactly why shotguns wear
     beads and rifles wear posts. */
  g.use('metal', 0xd8b25a);
  g.push().at(0, -0.0026, MUZZLE_Z + 0.0268);
  g.cyl(0.003, 0.0024, { segments: 8, chamfer: 0.0006 });
  g.pop();
}

function foreEnd(g: PartCtx, detail: number): void {
  // Walnut fore-end, ribbed, riding the magazine tube.
  g.use('wood', TINT.walnut);
  g.push().at(0, BORE - 0.022, PUMP_Z);
  g.rz(Math.PI / 8);
  g.cyl(0.0275, 0.13, { segments: detail ? 10 : 6, chamfer: 0.0035 });
  g.pop();
  g.use('wood', 0x1e2126);
  for (let i = 0; i < (detail ? 9 : 4); i++) {
    const z = PUMP_Z - 0.05 + i * 0.012;
    g.push().at(0, BORE - 0.022, z);
    g.rz(Math.PI / 8);
    g.cyl(0.0287, 0.0055, { segments: detail ? 10 : 6, chamfer: 0.0012 });
    g.pop();
  }
  // Action bars running back into the receiver.
  g.use('metal', 0x3a3d42);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.016, BORE - 0.017, PUMP_Z + 0.1);
    g.box(0.0045, 0.012, 0.14, 0.0009);
    g.pop();
  }
}

function shell(g: PartCtx): void {
  g.use('polymer', 0x8f2320);
  g.cyl(0.0093, 0.055, { segments: 10, chamfer: 0.0008 });
  g.use('metal', 0xb08a3c);
  g.push().at(0, 0, -0.032);
  g.cyl(0.0098, 0.012, { segments: 10, chamfer: 0.0012 });
  g.pop();
}

/* ------------------------------- furniture -------------------------------- */

function stock(g: PartCtx, detail: number): void {
  g.use('wood', TINT.walnut);
  // Classic straight-comb walnut stock with a pistol wrist.
  g.push().at(0, BORE - 0.006, REAR + 0.11);
  g.sideProfile(
    [
      -0.13, 0.024,
      -0.11, 0.03,
      -0.02, 0.024,
      0.075, 0.008,
      0.075, -0.028,
      0.03, -0.044,
      -0.03, -0.05,
      -0.09, -0.05,
      -0.126, -0.036,
      -0.135, -0.006,
    ],
    0.038,
    0.0045,
  );
  g.pop();
  // Wrist swell, so the grip is not a flat plank.
  g.push().at(0, BORE - 0.05, REAR + 0.055).rx(-0.42);
  g.box(0.04, 0.05, 0.05, 0.006);
  g.pop();
  if (detail) {
    // Checkering panels on the wrist.
    g.use('wood', 0x1b1e23);
    for (const sx of [-1, 1]) {
      g.push().at(sx * 0.0205, BORE - 0.05, REAR + 0.056).rx(-0.42);
      g.box(0.0016, 0.036, 0.036, 0.001);
      g.pop();
    }
  }
  // Recoil pad and its white line spacer.
  g.use('polymer', TINT.rubber);
  g.push().at(0, BORE - 0.016, REAR + 0.242);
  g.box(0.036, 0.09, 0.016, 0.004);
  g.pop();
  g.use('polymer', 0xb8b2a4);
  g.push().at(0, BORE - 0.016, REAR + 0.2335);
  g.box(0.037, 0.09, 0.002, 0.0004);
  g.pop();
  C.slingLoop(g, 0, BORE - 0.056, REAR + 0.2, 0.0075);
}

