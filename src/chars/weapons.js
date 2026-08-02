import * as THREE from 'three';
import { BrickBuilder } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';

/*
 * Hand props.
 *
 * Everything here is authored in MINIFIG HAND SPACE: the barrel runs down -Y and
 * the sights sit on -Z. A minifig hand grips a bar along its own Y axis, so with
 * the arm swung up into the `aim` pose (rotation.x = -1.62) a -Y barrel ends up
 * pointing straight down +Z, which is the way the character faces.
 */

function gunBuilder() {
  return new BrickBuilder({ studs: false, bevel: true, seams: false, cullStuds: false });
}

/** Imperial E-11 blaster rifle: stubby receiver, folding stock, scope. */
export function e11Blaster() {
  const bb = gunBuilder();
  const BK = C.trueBlack, DG = C.darkBluishGray, SL = C.flatSilver;

  bb.brick(0, -0.12, 0.03, 0.11, 0.16, { h: 0.36, color: BK });        // grip in the fist
  bb.brick(0, -0.68, -0.10, 0.14, 0.26, { h: 0.60, color: BK });       // receiver
  bb.brick(0, -0.58, 0.06, 0.10, 0.10, { h: 0.26, color: DG });        // power cell
  bb.cyl(0, -1.22, -0.10, 0.055, 0.56, { seg: 8, color: BK, stud: false });
  bb.cyl(0, -1.34, -0.10, 0.075, 0.13, { seg: 8, color: DG, stud: false, finish: FINISH.METAL });
  bb.brick(0, -1.02, -0.25, 0.06, 0.06, { h: 0.36, color: DG });       // scope tube
  bb.brick(0, -1.06, -0.25, 0.10, 0.10, { h: 0.06, color: SL, finish: FINISH.METAL });
  bb.brick(0, 0.12, -0.10, 0.08, 0.09, { h: 0.28, color: DG });        // folding stock
  bb.brick(0, 0.38, -0.16, 0.07, 0.26, { h: 0.07, color: DG });

  const g = bb.build();
  g.name = 'e11';
  return g;
}

/** Rebel DH-17: shorter, chunkier, no scope. */
export function dh17Blaster() {
  const bb = gunBuilder();
  const BK = C.trueBlack, DG = C.darkBluishGray;

  bb.brick(0, -0.12, 0.03, 0.11, 0.16, { h: 0.34, color: BK });
  bb.brick(0, -0.62, -0.08, 0.15, 0.28, { h: 0.52, color: DG });
  bb.brick(0, -0.70, -0.24, 0.10, 0.08, { h: 0.38, color: BK });
  bb.cyl(0, -1.06, -0.08, 0.06, 0.46, { seg: 8, color: BK, stud: false });
  bb.cyl(0, -1.16, -0.08, 0.085, 0.11, { seg: 8, color: DG, stud: false });
  bb.brick(0, -0.50, 0.09, 0.09, 0.09, { h: 0.22, color: BK });

  const g = bb.build();
  g.name = 'dh17';
  return g;
}

/**
 * Tilt a hand prop so it reads as "carried" rather than "welded on":
 * minifig fists are canted forward about 0.4 rad.
 */
export function holdIn(fig, side, prop, { pitch = -0.30, yaw = 0, roll = 0 } = {}) {
  prop.rotation.set(pitch, yaw, roll);
  fig.attach(side, prop);
  return prop;
}

/** Small glowing bolt, handy for shots of troopers firing. */
export function blasterBolt({ color = C.transRed, len = 1.6 } = {}) {
  const bb = new BrickBuilder({ studs: false, bevel: false, seams: false });
  bb.cyl(0, -len, 0, 0.05, len, { seg: 6, color, finish: FINISH.GLOW, stud: false });
  return bb.build();
}
