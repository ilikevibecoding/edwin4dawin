import { Assembly, type PartCtx } from '../parts/Assembly';
import * as C from '../parts/Components';
import { TINT } from '../parts/Components';
import { pose, type ModelDeps, type ModelVariant, type WeaponModel } from '../WeaponModel';
import { finishModel } from './Finish';

/**
 * Short-recoil service pistol.
 *
 * Everything above the frame rails is one node: the slide cycles 26 mm on every
 * shot, taking the sights with it, which is the whole read of a pistol firing.
 * The hammer is exposed and animates separately, and the barrel hood shows
 * through the ejection port when the slide is back — the two details that make
 * a sidearm look mechanical instead of moulded.
 */

/**
 * The bore sits far enough below the origin that the top of the slide clears it
 * by five millimetres, which is where the sights live. Getting this wrong is
 * invisible in a lineup and fatal at full ADS: put the deck on the sight line
 * and the notch and the post are *inside* the slide, so aiming shows a smooth
 * grey slab with the frame centre somewhere in the middle of it.
 */
const BORE = -0.0295;
/** Top of the slide's radiused deck, in weapon space. */
const SLIDE_TOP = BORE + 0.0238;
const SLIDE_REAR = 0.028;
const SLIDE_FRONT = -0.146;
const MUZZLE_Z = -0.15;
const REAR_SIGHT_Z = SLIDE_REAR - 0.008;
const FRONT_SIGHT_Z = SLIDE_FRONT + 0.012;

export function buildPistol(deps: ModelDeps, variant: ModelVariant): WeaponModel {
  const a = new Assembly(deps.materials);
  const detail = deps.quality.preset === 'low' ? 0 : 1;

  const body = a.node('body');
  frame(body, detail);

  const bolt = a.node('bolt', [0, BORE, 0]);
  slide(bolt, variant.suppressor, detail, variant.optic === 'irons' || variant.optic === 'none');
  // A slide-mounted dot rides the slide, and watching it cycle is half the
  // reason to fit one.
  if (variant.optic !== 'irons' && variant.optic !== 'none') opticPlate(bolt);

  const hammer = a.node('hammer', [0, BORE - 0.004, SLIDE_REAR - 0.008]);
  hammerSpur(hammer);

  const mag = a.node('magazine', [0, BORE - 0.038, -0.006]);
  mag.push().pivot().rx(-0.14);
  C.magazine(mag, {
    length: 0.105,
    width: 0.0225,
    depth: 0.032,
    ribs: 0,
    material: 'metal',
    tint: 0x2a2c30,
    witness: 3,
    topRound: true,
    caliber: 9,
  });
  mag.pop();

  const trigger = a.node('trigger', [0, BORE - 0.028, -0.03]);
  trigger.push().pivot();
  C.triggerBlade(trigger, 0.005);
  trigger.pop();

  a.node('optic', [0, 0, 0.006], 'bolt');

  const built = a.build('pistol', 0.58, 68);

  return finishModel({
    id: 'pistol',
    built,
    deps,
    opticKind: variant.optic,
    opticZ: 0.006,
    opticBaseY: SLIDE_TOP - 0.0005,
    vmFovHip: 42,
    vmFovAds: 15,
    baseFov: 80,
    ironRear: [0, 0, REAR_SIGHT_Z],
    ironFront: [0, 0, FRONT_SIGHT_Z],
    muzzle: [0, BORE, variant.suppressor ? MUZZLE_Z - 0.15 : MUZZLE_Z],
    ejectPort: [0.017, BORE + 0.01, -0.012],
    ejectDir: [0.88, 0.45, 0.16],
    magSocket: [0, BORE - 0.05, -0.006],
    hipPose: pose(0.078, -0.05, -0.52, 0.024, 0.155, 0.055),
    sprintPose: pose(0.115, -0.09, -0.46, 0.2, 0.7, 0.44),
    loweredPose: pose(0.088, -0.2, -0.48, -0.78, 0.26, 0.16),
    inspectPose: pose(0.008, -0.066, -0.42, 0.14, -0.95, 0.36),
    boltTravel: 0.026,
    chargeTravel: 0.026,
    triggerPull: 0.34,
    reloadStyle: 'magazine',
    magSize: [0.011, 0.055, 0.016],
    caseRadius: 0.0048,
    caseLength: 0.019,
    boltLockTravel: 0.026,
  });
}

/* -------------------------------- slide ---------------------------------- */

function slide(g: PartCtx, suppressed: boolean, detail: number, irons: boolean): void {
  const top = BORE + 0.016;
  const bottom = BORE - 0.011;
  const len = SLIDE_REAR - SLIDE_FRONT;
  const cz = (SLIDE_REAR + SLIDE_FRONT) * 0.5;
  /* A shade darker than the carbine's receiver, not lighter. A pistol's slide
     is the smallest large flat on any of these weapons and it faces the key
     almost squarely in every pose, so the same tint that reads as parkerised
     steel on a rifle reads as bare aluminium here. */
  g.use('metal', 0x2a2d31);
  g.boxAt(0, (top + bottom) * 0.5, cz, 0.026, top - bottom, len, 0.0022);
  // Radiused top deck.
  g.push().at(0, top - 0.005, cz);
  g.cyl(0.0128, len - 0.002, { segments: detail ? 12 : 8, chamfer: 0.0016, arc: Math.PI });
  g.pop();

  // Cocking serrations, front and rear.
  g.use('metal', 0x232629);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.013, BORE + 0.004, SLIDE_REAR - 0.024).ry((sx * Math.PI) / 2);
    g.serrations(7, 0.0058, 0.018, 0.0016, 0.0011, 0.22);
    g.pop();
    if (detail) {
      g.push().at(sx * 0.013, BORE + 0.004, SLIDE_FRONT + 0.03).ry((sx * Math.PI) / 2);
      g.serrations(4, 0.0058, 0.016, 0.0016, 0.001, 0.22);
      g.pop();
    }
  }

  // Ejection port: a real notch out of the right wall with the barrel hood in it.
  g.use('metal', 0x111214);
  g.boxAt(0.0122, BORE + 0.008, -0.012, 0.005, 0.016, 0.05, 0.0008);
  g.use('metal', 0x5b6067);
  g.push().at(0.004, BORE + 0.006, -0.014);
  g.box(0.014, 0.012, 0.042, 0.0012);
  g.pop();
  g.use('metal', 0x2a2d31);
  g.boxAt(0.0131, BORE + 0.0175, -0.012, 0.005, 0.006, 0.056, 0.0008);
  g.boxAt(0.0131, BORE - 0.005, -0.012, 0.005, 0.012, 0.056, 0.0008);
  g.boxAt(0.0131, BORE + 0.008, -0.041, 0.005, 0.014, 0.01, 0.0008);
  g.boxAt(0.0131, BORE + 0.008, 0.015, 0.005, 0.014, 0.008, 0.0008);
  // Extractor.
  g.use('metal', 0x3d4147);
  g.boxAt(0.0126, BORE + 0.011, 0.006, 0.0055, 0.006, 0.024, 0.0006);

  // Barrel and its crown; the muzzle end pokes out of the slide.
  g.use('metal', 0x4c5158);
  g.push().at(0, BORE, MUZZLE_Z + 0.014);
  g.cyl(0.0072, 0.03, { segments: detail ? 12 : 8, chamfer: 0.0012 });
  g.pop();
  g.use('metal', 0x0e0f11);
  g.push().at(0, BORE, MUZZLE_Z + 0.006);
  g.tube(0.0068, 0.0048, 0.012, 10, 0.0006);
  g.pop();
  // Recoil spring guide under the barrel.
  g.use('metal', 0x494d53);
  g.push().at(0, BORE - 0.012, MUZZLE_Z + 0.012);
  g.cyl(0.0048, 0.024, { segments: 8, chamfer: 0.0008 });
  g.pop();

  if (suppressed) {
    g.push().at(0, BORE, MUZZLE_Z - 0.078);
    C.suppressor(g, 0.0045, 0.185, 0x232527);
    g.pop();
  }

  if (irons) {
    /* Three-dot sights, standing proud of the deck. Both blades top out at
       y = 0 — the sight line — and reach down into the slide, so the notch
       between them and the post at the far end are the two things on the
       screen centre when the gun comes up. The white dots go on the faces
       turned toward the eye, which is the only place they do anything. */
    const rise = -SLIDE_TOP;
    g.use('metal', 0x1e1f22);
    for (const sx of [-1, 1]) {
      g.push().at(sx * 0.0068, -(rise + 0.002) * 0.5, REAR_SIGHT_Z);
      g.box(0.0058, rise + 0.002, 0.0085, 0.0006);
      g.pop();
      g.use('polymer', 0xdcdcd2);
      g.push().at(sx * 0.0068, -rise * 0.45, REAR_SIGHT_Z + 0.0045);
      g.cyl(0.0011, 0.0008, { segments: 6 });
      g.pop();
      g.use('metal', 0x1e1f22);
    }
    g.push().at(0, -(rise + 0.002) * 0.5, FRONT_SIGHT_Z);
    g.box(0.0034, rise + 0.002, 0.0072, 0.0005);
    g.pop();
    g.use('polymer', 0xdcdcd2);
    g.push().at(0, -rise * 0.45, FRONT_SIGHT_Z + 0.0038);
    g.cyl(0.0012, 0.0008, { segments: 6 });
    g.pop();
  }
}

function hammerSpur(g: PartCtx): void {
  g.use('metal', 0x494d53);
  g.push().at(0, BORE - 0.004, SLIDE_REAR - 0.008);
  g.sideProfile([-0.006, 0.0, -0.009, 0.014, -0.003, 0.019, 0.004, 0.016, 0.003, 0.0], 0.007, 0.0008);
  g.pop();
}

/* -------------------------------- frame ---------------------------------- */

function frame(g: PartCtx, detail: number): void {
  const railTop = BORE - 0.012;
  const railBottom = BORE - 0.03;
  g.use('polymer', 0x212327);
  // Dust cover forward of the trigger guard, with an accessory rail.
  g.boxAt(0, (railTop + railBottom) * 0.5, -0.075, 0.024, railTop - railBottom, 0.13, 0.002);
  g.use('polymer', 0x232528);
  for (let i = 0; i < 3; i++) {
    g.boxAt(0, railBottom + 0.002, -0.055 - i * 0.012, 0.021, 0.004, 0.006, 0.0005);
  }
  // Slide rails, a bright machined line down each side of the frame.
  g.use('metal', TINT.bright);
  for (const sx of [-1, 1]) {
    g.boxAt(sx * 0.0124, railTop + 0.0015, -0.05, 0.003, 0.003, 0.15, 0.0004);
  }

  // Grip module: raked, with a beavertail and a magazine well.
  g.use('polymer', 0x212327);
  g.push().at(0, BORE - 0.026, -0.004);
  C.pistolGrip(g, {
    length: 0.096,
    width: 0.031,
    angle: 0.28,
    grooves: detail ? 3 : 0,
    stipple: detail ? 9 : 0,
    beavertail: true,
    tint: 0x212327,
  });
  g.pop();
  // Magwell flare.
  g.use('polymer', 0x232528);
  g.push().at(0, BORE - 0.118, 0.024).rx(-0.28);
  g.trapezoid(0.04, 0.033, 0.01, 0.05, 0.0009);
  g.pop();

  C.triggerGuard(g, -0.03, BORE - 0.03, 0.014, 0x232528);

  // Controls: slide stop, takedown lever, magazine release.
  g.use('metal', 0x3d4045);
  g.push().at(-0.0135, BORE - 0.018, -0.01);
  g.box(0.005, 0.008, 0.036, 0.0008);
  g.pop();
  g.push().at(-0.0145, BORE - 0.018, 0.004).ry(-Math.PI / 2);
  g.cyl(0.0055, 0.004, { segments: 10, chamfer: 0.0008 });
  g.pop();
  g.push().at(0.0135, BORE - 0.02, -0.032).ry(Math.PI / 2);
  g.cyl(0.0048, 0.004, { segments: 10, chamfer: 0.0008 });
  g.pop();
  g.push().at(-0.0155, BORE - 0.02, -0.008);
  g.box(0.004, 0.009, 0.018, 0.0008);
  g.pop();
  // Rear frame block behind the hammer.
  g.use('polymer', 0x212327);
  g.boxAt(0, BORE - 0.016, SLIDE_REAR - 0.004, 0.028, 0.02, 0.016, 0.0018);
}

function opticPlate(g: PartCtx): void {
  // Milled slide cut with a mounting plate, so a micro dot sits low enough for
  // its axis to land on the sight line.
  g.use('metal', 0x25272a);
  g.boxAt(0, -0.014, 0.006, 0.024, 0.004, 0.032, 0.0008);
  g.use('metal', 0x3a3d42);
  g.boxAt(0, -0.0122, 0.021, 0.02, 0.0025, 0.005, 0.0005);
}
