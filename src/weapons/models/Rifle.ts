import { Assembly, type PartCtx } from '../parts/Assembly';
import * as C from '../parts/Components';
import { TINT } from '../parts/Components';
import { pose, type ModelDeps, type ModelVariant, type WeaponModel } from '../WeaponModel';
import { finishModel } from './Finish';

/**
 * AR-pattern carbine.
 *
 * Weapon space has the sight line on the -Z axis through the origin, so every
 * height here is quoted against it: the bore sits 66 mm below (the real height
 * over bore of an AR with a flat-top upper and back-up irons), the rail 38 mm
 * above the bore, the sights 28 mm above the rail. Those three numbers are the
 * whole reason an AR looks like an AR from behind.
 *
 * The ejection port is a genuine hole through the right wall of the receiver —
 * four slabs around a gap rather than a dark decal — because the bolt carrier
 * moving inside it is the single most convincing thing the model does when the
 * gun fires.
 */

const BORE = -0.066;
/** Top face of the flat-top rail. */
const RAIL_TOP = BORE + 0.038;
const RECEIVER_TOP = RAIL_TOP - 0.0065;
const RECEIVER_BOTTOM = BORE - 0.022;
const HALF_W = 0.019;
/** Rear face of the upper receiver. */
const REAR = 0.03;
/** Front face of the upper receiver. */
const FRONT = -0.175;
const HG_FRONT = -0.4;
const MUZZLE_Z = -0.5;

const PORT_Z0 = -0.078;
const PORT_Z1 = -0.018;
const PORT_Y0 = BORE - 0.011;
const PORT_Y1 = BORE + 0.014;

export function buildRifle(deps: ModelDeps, variant: ModelVariant): WeaponModel {
  const a = new Assembly(deps.materials);
  const detail = deps.quality.preset === 'low' ? 0 : 1;

  const body = a.node('body');
  upperReceiver(body, detail);
  lowerReceiver(body, detail);
  handguard(body, detail);
  barrel(body, variant.suppressor, detail);
  furniture(body, detail);
  if (variant.optic === 'irons' || variant.optic === 'none') ironSights(body);
  else opticMount(body, detail);

  const bolt = a.node('bolt', [0, BORE + 0.004, -0.02]);
  boltCarrier(bolt);

  const charge = a.node('charge', [0, RECEIVER_TOP - 0.008, REAR]);
  chargingHandle(charge);

  const mag = a.node('magazine', [0, BORE - 0.024, -0.104]);
  mag.push().pivot();
  C.magazine(mag, {
    length: 0.168,
    width: 0.0254,
    depth: 0.0385,
    curve: 0.5,
    ribs: 4,
    witness: 3,
    tint: TINT.polymer,
    topRound: true,
    caliber: 5.56,
  });
  mag.pop();

  const trigger = a.node('trigger', [0, BORE - 0.021, -0.048]);
  trigger.push().pivot();
  C.triggerBlade(trigger);
  trigger.pop();

  const stock = a.node('stock', [0, BORE + 0.006, 0.05]);
  collapsibleStock(stock, detail);

  a.node('optic', [0, 0, -0.03]);

  const built = a.build('rifle', 0.6, 74);

  return finishModel({
    id: 'rifle',
    built,
    deps,
    opticKind: variant.optic,
    opticZ: -0.03,
    opticBaseY: RAIL_TOP,
    vmFovHip: 36,
    vmFovAds: 16,
    baseFov: 80,
    ironRear: [0, 0, 0],
    ironFront: [0, 0, HG_FRONT + 0.012],
    muzzle: [0, BORE, variant.suppressor ? MUZZLE_Z - 0.14 : MUZZLE_Z],
    ejectPort: [0.024, BORE + 0.004, -0.048],
    ejectDir: [0.86, 0.42, 0.28],
    magSocket: [0, BORE - 0.03, -0.104],
    hipPose: pose(0.086, -0.05, -0.6, 0.02, 0.15, 0.05),
    sprintPose: pose(0.125, -0.095, -0.54, 0.15, 0.6, 0.4),
    loweredPose: pose(0.095, -0.225, -0.56, -0.7, 0.22, 0.14),
    inspectPose: pose(0.012, -0.072, -0.5, 0.1, -0.82, 0.3),
    boltTravel: 0.052,
    chargeTravel: 0.06,
    triggerPull: 0.3,
    reloadStyle: 'magazine',
    magSize: [0.0135, 0.095, 0.021],
    caseRadius: 0.0049,
    caseLength: 0.0449,
    boltLockTravel: 0.05,
  });
}

/* --------------------------- upper receiver ----------------------------- */

function upperReceiver(g: PartCtx, detail: number): void {
  g.use('metal', TINT.receiver);
  const topY = (RECEIVER_TOP + (BORE + 0.019)) * 0.5;

  // Top deck, under the rail, and the bottom rail of the receiver.
  g.boxAt(0, RECEIVER_TOP - 0.0055, (REAR + FRONT) * 0.5, HALF_W * 2, 0.011, REAR - FRONT, 0.0018);
  g.boxAt(
    0,
    RECEIVER_BOTTOM + 0.0045,
    (REAR + FRONT) * 0.5,
    HALF_W * 2,
    0.009,
    REAR - FRONT,
    0.0018,
  );
  // Left flank, unbroken.
  g.boxAt(-HALF_W + 0.003, topY - 0.008, (REAR + FRONT) * 0.5, 0.006, 0.036, REAR - FRONT, 0.0016);

  // Right flank: four slabs around the ejection port, so the port is a hole.
  const rx = HALF_W - 0.003;
  const wallW = 0.006;
  const yLo = RECEIVER_BOTTOM + 0.009;
  const yHi = RECEIVER_TOP - 0.011;
  g.boxAt(rx, (PORT_Y1 + yHi) * 0.5, (REAR + FRONT) * 0.5, wallW, yHi - PORT_Y1, REAR - FRONT, 0.0016);
  g.boxAt(rx, (yLo + PORT_Y0) * 0.5, (REAR + FRONT) * 0.5, wallW, PORT_Y0 - yLo, REAR - FRONT, 0.0016);
  g.boxAt(
    rx,
    (PORT_Y0 + PORT_Y1) * 0.5,
    (PORT_Z1 + REAR) * 0.5,
    wallW,
    PORT_Y1 - PORT_Y0,
    REAR - PORT_Z1,
    0.0016,
  );
  g.boxAt(
    rx,
    (PORT_Y0 + PORT_Y1) * 0.5,
    (FRONT + PORT_Z0) * 0.5,
    wallW,
    PORT_Y1 - PORT_Y0,
    PORT_Z0 - FRONT,
    0.0016,
  );

  // Port interior: a darker liner so the hole reads as depth even before the
  // baked occlusion lands on it.
  g.use('metal', 0x191a1d);
  g.boxAt(
    rx - 0.005,
    (PORT_Y0 + PORT_Y1) * 0.5,
    (PORT_Z0 + PORT_Z1) * 0.5,
    0.002,
    PORT_Y1 - PORT_Y0 - 0.001,
    PORT_Z1 - PORT_Z0 - 0.001,
    0.0004,
  );

  // Rear and front closures for the receiver tube.
  g.use('metal', TINT.receiver);
  g.boxAt(0, topY - 0.006, REAR - 0.008, HALF_W * 2, 0.038, 0.016, 0.0018);
  g.boxAt(0, topY - 0.006, FRONT + 0.012, HALF_W * 2, 0.038, 0.024, 0.0018);

  // Barrel nut shroud at the front of the receiver.
  g.push().at(0, BORE, FRONT + 0.012);
  g.cyl(0.0215, 0.03, { segments: detail ? 16 : 10, chamfer: 0.0018 });
  g.pop();

  // Picatinny rail across the whole flat top.
  g.use('metal', 0x323438);
  g.push().at(0, RECEIVER_TOP + 0.0032, (REAR - 0.005 + FRONT) * 0.5);
  g.picatinny(Math.round((REAR - 0.005 - FRONT) / 0.01), 0.0212, 0.0064);
  g.pop();

  // Brass deflector and forward assist: the two lumps behind the port that make
  // an AR unmistakable from the right-hand side.
  g.use('metal', TINT.receiver);
  g.push().at(HALF_W - 0.001, BORE + 0.012, PORT_Z1 + 0.006).ry(Math.PI / 2);
  g.cyl(0.0105, 0.007, { r2: 0.007, segments: detail ? 12 : 8, chamfer: 0.0012 });
  g.pop();
  g.push().at(HALF_W - 0.002, BORE - 0.004, PORT_Z1 + 0.012).ry(Math.PI / 2);
  g.cyl(0.0072, 0.009, { segments: detail ? 12 : 8, chamfer: 0.0012 });
  g.at(0, 0, 0.006);
  g.use('metal', TINT.steel);
  g.cyl(0.005, 0.004, { segments: 8, chamfer: 0.0008 });
  g.pop();

  // Charging-handle channel, cut into the rear deck.
  g.use('metal', 0x1d1e21);
  g.boxAt(0, RECEIVER_TOP - 0.0085, REAR - 0.014, 0.017, 0.008, 0.03, 0.0006);

  // Dust cover, hinged below the port, plus its rod.
  g.use('metal', 0x2a2c30);
  g.boxAt(HALF_W + 0.0015, PORT_Y0 - 0.0035, (PORT_Z0 + PORT_Z1) * 0.5, 0.003, 0.009, 0.056, 0.0008);
  g.push().at(HALF_W + 0.001, PORT_Y0 - 0.007, (PORT_Z0 + PORT_Z1) * 0.5).rx(Math.PI / 2);
  g.cyl(0.0016, 0.062, { segments: 8 });
  g.pop();

  // Takedown pins and the receiver's engraved detail.
  C.crossPins(
    g,
    [
      [REAR - 0.014, BORE - 0.016],
      [FRONT + 0.02, BORE - 0.016],
    ],
    0.0042,
    HALF_W * 2,
  );
}

function boltCarrier(g: PartCtx): void {
  // Carrier body: only ever seen through the port, but it is what sells the
  // shot, so it gets gas rings, a cam pin and a bolt face.
  g.use('metal', 0x4a4d53);
  g.push().at(0, BORE + 0.004, -0.03).rx(Math.PI / 2).rx(-Math.PI / 2);
  g.cyl(0.0118, 0.115, { segments: 14, chamfer: 0.0012 });
  g.pop();
  g.use('metal', 0x5d6167);
  for (const z of [-0.062, -0.055, -0.048]) {
    g.push().at(0, BORE + 0.004, z);
    g.cyl(0.0124, 0.0026, { segments: 14, chamfer: 0.0005 });
    g.pop();
  }
  // Cam pin boss on top, and the extractor claw at the front.
  g.use('metal', 0x3a3d42);
  g.boxAt(0, BORE + 0.016, -0.048, 0.012, 0.006, 0.018, 0.001);
  g.push().at(0, BORE + 0.004, -0.086);
  g.cyl(0.0105, 0.012, { segments: 12, chamfer: 0.0012 });
  g.pop();
  g.use('metal', 0x1b1c1f);
  g.push().at(0, BORE + 0.004, -0.0925);
  g.cyl(0.0058, 0.002, { segments: 10 });
  g.pop();
}

function chargingHandle(g: PartCtx): void {
  g.use('metal', 0x35383d);
  // Shaft down the receiver channel.
  g.boxAt(0, RECEIVER_TOP - 0.0085, REAR - 0.014, 0.015, 0.0065, 0.032, 0.0008);
  // Rear paddle, wider than the shaft, with a latch on the left.
  g.boxAt(0, RECEIVER_TOP - 0.0085, REAR + 0.006, 0.036, 0.0085, 0.014, 0.0012);
  g.boxAt(-0.019, RECEIVER_TOP - 0.0085, REAR + 0.004, 0.014, 0.0075, 0.019, 0.0012);
  // Grip ribs across the top of the paddle. Positioned explicitly: `serrations`
  // lays its run out around the cursor, and the cursor is the model origin
  // unless something moves it — which here is the sight line, 40 mm in front of
  // the eye at full ADS, where four ribs are a bar across the sight picture.
  g.use('metal', 0x24262a);
  g.push().at(0, RECEIVER_TOP - 0.00315, REAR + 0.006);
  g.serrations(4, 0.0028, 0.03, 0.0022, 0.0009, 0);
  g.pop();
}

/* --------------------------- lower receiver ----------------------------- */

function lowerReceiver(g: PartCtx, detail: number): void {
  const top = RECEIVER_BOTTOM;
  const bottom = BORE - 0.042;
  g.use('metal', TINT.receiver);

  // Body from the buffer tower forward to the magwell.
  g.boxAt(0, (top + bottom) * 0.5, -0.03, 0.034, top - bottom, 0.11, 0.0022);
  // Buffer tower, rising behind the receiver.
  g.boxAt(0, BORE - 0.006, REAR + 0.006, 0.032, 0.03, 0.03, 0.0025);

  // Magwell: four walls so a magazine goes into a hole.
  const mz = -0.104;
  const mw = 0.0322;
  const md = 0.0455;
  const wellTop = top;
  const wellBottom = BORE - 0.038;
  const h = wellTop - wellBottom;
  const cy = (wellTop + wellBottom) * 0.5;
  g.boxAt(mw * 0.5 - 0.002, cy, mz, 0.0042, h, md, 0.0018);
  g.boxAt(-mw * 0.5 + 0.002, cy, mz, 0.0042, h, md, 0.0018);
  g.boxAt(0, cy, mz + md * 0.5 - 0.002, mw, h, 0.0042, 0.0018);
  g.boxAt(0, cy, mz - md * 0.5 + 0.002, mw, h, 0.0042, 0.0018);
  // Flared lip at the mouth of the well.
  g.use('metal', 0x35383c);
  g.push().at(0, wellBottom - 0.002, mz);
  g.trapezoid(0.052, 0.038, 0.011, md + 0.008, 0.0009);
  g.pop();

  // Controls: safety selector, magazine catch, bolt catch, takedown detent.
  g.use('metal', 0x2a2c30);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.018, BORE - 0.027, -0.031).ry((sx * Math.PI) / 2);
    g.cyl(0.0062, 0.005, { segments: 10, chamfer: 0.0009 });
    g.at(0, 0, 0.0035);
    g.boxAt(0, 0.0, 0.004, 0.0055, 0.019, 0.008, 0.0008);
    g.pop();
  }
  g.push().at(0.019, BORE - 0.03, -0.078).ry(Math.PI / 2);
  g.cyl(0.005, 0.006, { segments: 10, chamfer: 0.0008 });
  g.pop();
  g.push().at(-0.02, BORE - 0.031, -0.075);
  g.box(0.005, 0.012, 0.026, 0.0009);
  g.pop();

  C.triggerGuard(g, -0.048, BORE - 0.041, 0.012, 0x2d2f33);

  // Pistol grip.
  g.use('polymer', TINT.polymer);
  g.push().at(0, BORE - 0.036, 0.006);
  C.pistolGrip(g, {
    length: 0.098,
    width: 0.031,
    angle: 0.36,
    grooves: detail ? 3 : 0,
    stipple: detail ? 9 : 0,
    tint: TINT.polymer,
  });
  g.pop();
}

/* ------------------------------ handguard -------------------------------- */

function handguard(g: PartCtx, detail: number): void {
  const seg = detail ? 8 : 6;
  const z0 = FRONT + 0.004;
  const len = z0 - HG_FRONT;
  g.use('metal', 0x2b2d31);
  g.push().at(0, BORE, (z0 + HG_FRONT) * 0.5).rz(Math.PI / 8);
  g.cyl(0.0268, len, { segments: seg, chamfer: 0.0016 });
  g.pop();
  // Hollow the front so the barrel disappears into a tube rather than a cap.
  g.use('metal', 0x131417);
  g.push().at(0, BORE, HG_FRONT + 0.007).rz(Math.PI / 8);
  g.tube(0.0245, 0.014, 0.014, seg, 0.0008);
  g.pop();

  // Continuous top rail, level with the receiver's.
  g.use('metal', 0x323438);
  g.push().at(0, RECEIVER_TOP + 0.0032, (z0 + HG_FRONT) * 0.5 + 0.004);
  g.picatinny(Math.round((len - 0.012) / 0.01), 0.0212, 0.0064);
  g.pop();

  // M-LOK slots down the flanks and the underside.
  g.use('metal', 0x121316);
  for (let i = 0; i < (detail ? 6 : 4); i++) {
    const z = z0 - 0.032 - i * 0.032;
    if (z < HG_FRONT + 0.02) break;
    for (const sx of [-1, 1]) {
      g.push().at(sx * 0.0245, BORE + 0.002, z);
      g.box(0.003, 0.0095, 0.019, 0.0006);
      g.pop();
    }
    g.push().at(0, BORE - 0.0245, z);
    g.box(0.0095, 0.003, 0.019, 0.0006);
    g.pop();
  }

  // Anti-rotation screws at the receiver end.
  g.use('metal', 0x3d4045);
  for (const sx of [-1, 1]) {
    g.screwX(sx * 0.0248, BORE + 0.012, z0 - 0.012, 0.0026, 0.0008);
    g.screwX(sx * 0.0248, BORE - 0.012, z0 - 0.012, 0.0026, 0.0008);
  }

  // Angled fore grip, which also gives the left hand somewhere to be. The
  // profile narrows as it descends and kicks out into a finger stop at the toe,
  // so it does not read as a block bolted under the rail.
  g.use('polymer', TINT.polymer2);
  g.push().at(0, BORE - 0.024, HG_FRONT + 0.058).rx(0.5);
  g.sideProfile(
    [
      0.017, 0.002,
      0.014, -0.022,
      0.010, -0.044,
      0.014, -0.056,
      0.004, -0.060,
      -0.008, -0.050,
      -0.010, -0.026,
      -0.014, 0.002,
    ],
    0.028,
    0.0026,
  );
  // Finger grooves across the front strap.
  g.use('polymer', 0x1e2022);
  for (let i = 0; i < (detail ? 3 : 0); i++) {
    g.push().at(0, -0.014 - i * 0.014, -0.012 + i * 0.001).ry(Math.PI / 2);
    g.cyl(0.0028, 0.026, { segments: 8 });
    g.pop();
  }
  g.pop();
}

/* -------------------------------- barrel --------------------------------- */

function barrel(g: PartCtx, suppressed: boolean, detail: number): void {
  const seg = detail ? 14 : 10;
  g.use('metal', TINT.steel);
  // Inside the handguard, then the exposed section with its step.
  g.push().at(0, BORE, (FRONT + HG_FRONT) * 0.5 - 0.02);
  g.cyl(0.0098, Math.abs(FRONT - HG_FRONT) + 0.04, { segments: seg, chamfer: 0.0008 });
  g.pop();
  g.push().at(0, BORE, (HG_FRONT + MUZZLE_Z) * 0.5 + 0.024);
  g.cyl(0.0082, Math.abs(HG_FRONT - MUZZLE_Z) - 0.048, { segments: seg, chamfer: 0.0008 });
  g.pop();

  // Low-profile gas block and the gas tube running back over the barrel.
  g.use('metal', 0x2f3237);
  g.push().at(0, BORE, HG_FRONT + 0.03);
  g.box(0.021, 0.023, 0.028, 0.0014);
  g.pop();
  g.push().at(0, BORE + 0.0135, (HG_FRONT + FRONT) * 0.5 + 0.005);
  g.cyl(0.0022, Math.abs(HG_FRONT - FRONT) - 0.03, { segments: 8 });
  g.pop();

  if (suppressed) {
    g.push().at(0, BORE, MUZZLE_Z - 0.07);
    C.suppressor(g, 0.00278, 0.19);
    g.pop();
  } else {
    g.push().at(0, BORE, MUZZLE_Z + 0.023);
    C.birdcage(g, 0.00278);
    g.pop();
  }
}

/* ------------------------------ furniture -------------------------------- */

function collapsibleStock(g: PartCtx, detail: number): void {
  const y = BORE + 0.006;
  // Buffer tube, with the position notches a collapsible stock rides on.
  g.use('metal', 0x3a3d42);
  g.push().at(0, y, REAR + 0.09);
  g.cyl(0.0155, 0.13, { segments: detail ? 14 : 10, chamfer: 0.0012 });
  g.pop();
  g.use('metal', 0x2a2c30);
  for (let i = 0; i < 5; i++) {
    g.push().at(0, y - 0.0155, REAR + 0.04 + i * 0.019);
    g.box(0.008, 0.0032, 0.008, 0.0006);
    g.pop();
  }
  // Castle nut and end plate.
  g.push().at(0, y, REAR + 0.028);
  g.cyl(0.019, 0.011, { segments: 12, chamfer: 0.0012 });
  g.pop();

  // Stock body: a side profile so the cheek weld and the sling slot read.
  g.use('polymer', TINT.polymer);
  g.push().at(0, y, REAR + 0.135);
  g.sideProfile(
    [
      -0.098, 0.021,
      -0.086, 0.024,
      0.044, 0.019,
      0.05, 0.012,
      0.05, -0.014,
      0.03, -0.02,
      -0.05, -0.031,
      -0.086, -0.036,
      -0.098, -0.03,
    ],
    0.042,
    0.003,
  );
  g.pop();
  /* Butt pad, proud of the stock and ribbed. The stock is the nearest part of
     the weapon to the eye in every hip-fire frame and the largest unbroken
     surface on the gun, so anything left flat here is flat at 150 px across. */
  g.use('polymer', TINT.rubber);
  g.push().at(0, y - 0.006, REAR + 0.2375);
  g.box(0.042, 0.054, 0.01, 0.003);
  g.pop();
  if (detail) {
    g.use('polymer', 0x131415);
    for (let i = -1; i <= 1; i++) {
      g.push().at(0, y - 0.006 + i * 0.014, REAR + 0.2425);
      g.box(0.036, 0.0055, 0.0016, 0.0006);
      g.pop();
    }
  }
  // Ribs down the flanks and the sling slot near the toe: from the side, which
  // is how the stock is seen when the weapon is at the hip, these are the only
  // things between the receiver and the butt.
  g.use('polymer', TINT.polymer2);
  for (const sx of [-1, 1]) {
    g.push().at(sx * 0.0212, y - 0.016, REAR + 0.175);
    g.box(0.0022, 0.008, 0.085, 0.0009);
    g.pop();
    g.push().at(sx * 0.0212, y + 0.014, REAR + 0.19);
    g.box(0.0022, 0.006, 0.05, 0.0009);
    g.pop();
  }
  g.use('polymer', 0x141517);
  g.push().at(0, y - 0.02, REAR + 0.212);
  g.box(0.03, 0.007, 0.02, 0.0012);
  g.pop();
  // Cheek rest ridge and the release lever underneath.
  g.use('polymer', TINT.polymer2);
  g.push().at(0, y + 0.021, REAR + 0.14);
  g.box(0.026, 0.005, 0.075, 0.0018);
  g.pop();
  // Release latch under the stock body, and the ambidextrous sling loop on its
  // flank. Both have to touch the stock: a control floating a few millimetres
  // off its parent is the detail the eye picks out first.
  g.push().at(0, y - 0.0235, REAR + 0.108);
  g.box(0.02, 0.013, 0.032, 0.0016);
  g.pop();
  C.slingLoop(g, -0.021, y - 0.02, REAR + 0.1, 0.007);
}

function furniture(g: PartCtx, _detail: number): void {
  C.slingLoop(g, -0.026, BORE - 0.012, HG_FRONT + 0.03, 0.0075);
}

/* -------------------------------- sights --------------------------------- */

function ironSights(g: PartCtx): void {
  C.rearAperture(g, 0.028);
  C.frontPost(g, HG_FRONT + 0.012, 0.026);
  // The front sight needs a base that reaches the rail.
  g.use('metal', TINT.steel);
  g.boxAt(0, RAIL_TOP + 0.004, HG_FRONT + 0.012, 0.02, 0.009, 0.019, 0.0009);
}

function opticMount(g: PartCtx, detail: number): void {
  // Folded back-up irons, low enough to sit under an optic. The optic brings
  // its own clamp down to the rail, so nothing else is needed here.
  g.use('metal', 0x2c2e32);
  g.boxAt(0, RAIL_TOP + 0.004, HG_FRONT + 0.012, 0.019, 0.008, 0.022, 0.0009);
  g.boxAt(0, RAIL_TOP + 0.0085, HG_FRONT + 0.012, 0.013, 0.004, 0.019, 0.0007);
  g.boxAt(0, RAIL_TOP + 0.004, 0.012, 0.019, 0.008, 0.022, 0.0009);
  g.boxAt(0, RAIL_TOP + 0.0085, 0.012, 0.013, 0.004, 0.019, 0.0007);
  if (detail) {
    g.screwX(0.0098, RAIL_TOP + 0.004, 0.012, 0.0026, 0.0008);
    g.screwX(-0.0098, RAIL_TOP + 0.004, 0.012, 0.0026, 0.0008);
  }
}
