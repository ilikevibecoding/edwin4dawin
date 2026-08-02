import * as THREE from 'three';
import { BrickBuilder } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { glow } from '../lego/materials.js';
import { cylGeo } from '../lego/parts.js';
import { num } from './util.js';

/*
 * R2-D2. Not a minifig: a brick-built astromech about 3.3 studs tall (R2 is
 * 1.09 m and a minifig reads as 1.8 m). Body and legs bake down into one merged
 * mesh; the dome is a second mesh on its own pivot so it can spin, and the
 * photoreceptor keeps its own material so the eye can flicker.
 */

const BODY_R = 0.85;
const BODY_Y0 = 0.62;
const BODY_Y1 = 2.32;
const DOME_R = 0.85;

function builder() {
  return new BrickBuilder({ studs: false, bevel: true, seams: false, cullStuds: false });
}

/** Curved panel hugging a cylinder of radius r; angles measured from the front. */
function panel({ r, y0, y1, from, to, seg = 26 }) {
  const h = y1 - y0;
  const span = to - from;
  const s = Math.max(3, Math.round(seg * span / (Math.PI * 2)));
  const g = new THREE.CylinderGeometry(r, r, h, s, 1, true, from, span);
  g.translate(0, y0 + h / 2, 0);
  return g;
}

function buildBody(bb) {
  const W = C.white, BL = C.blue, SL = C.flatSilver, DG = C.darkBluishGray, LG = C.lightBluishGray;

  // --- barrel -------------------------------------------------------------
  bb.cyl(0, BODY_Y0, 0, BODY_R, BODY_Y1 - BODY_Y0, { seg: 26, color: W, stud: false });
  bb.cyl(0, BODY_Y1 - 0.02, 0, BODY_R * 0.99, 0.06, { seg: 26, color: LG, stud: false });
  // waist band and lower vents
  bb.custom(panel({ r: BODY_R + 0.012, y0: 1.42, y1: 1.56, from: 0, to: Math.PI * 2 }), { color: LG });
  bb.custom(panel({ r: BODY_R + 0.014, y0: 1.46, y1: 1.52, from: 0, to: Math.PI * 2 }), { color: SL });
  bb.custom(panel({ r: BODY_R + 0.012, y0: 0.66, y1: 0.78, from: 0, to: Math.PI * 2 }), { color: DG });

  // --- front panelling ----------------------------------------------------
  // centre spine with the power coupling
  bb.custom(panel({ r: BODY_R + 0.014, y0: 1.60, y1: 2.24, from: -0.24, to: 0.24 }), { color: DG });
  bb.custom(panel({ r: BODY_R + 0.02, y0: 1.86, y1: 2.02, from: -0.20, to: 0.20 }), { color: SL, finish: FINISH.METAL });
  bb.custom(panel({ r: BODY_R + 0.014, y0: 0.86, y1: 1.36, from: -0.30, to: 0.30 }), { color: BL });
  bb.custom(panel({ r: BODY_R + 0.02, y0: 1.00, y1: 1.22, from: -0.20, to: 0.20 }), { color: LG });

  bb.mirrorX((b) => {
    // big blue shoulder panels
    b.custom(panel({ r: BODY_R + 0.014, y0: 1.62, y1: 2.24, from: -1.06, to: -0.34 }), { color: BL });
    b.custom(panel({ r: BODY_R + 0.02, y0: 2.06, y1: 2.20, from: -0.98, to: -0.42 }), { color: LG });
    b.custom(panel({ r: BODY_R + 0.02, y0: 1.68, y1: 1.80, from: -0.98, to: -0.42 }), { color: LG });
    // lower blue panel + service hatch
    b.custom(panel({ r: BODY_R + 0.014, y0: 0.84, y1: 1.38, from: -1.14, to: -0.44 }), { color: BL });
    b.custom(panel({ r: BODY_R + 0.02, y0: 0.96, y1: 1.26, from: -1.06, to: -0.52 }), { color: W });
    // red logic port on the flank
    b.custom(panel({ r: BODY_R + 0.02, y0: 1.94, y1: 2.10, from: -1.62, to: -1.30 }), { color: C.red });
    b.custom(panel({ r: BODY_R + 0.02, y0: 1.00, y1: 1.20, from: -1.70, to: -1.42 }), { color: DG });
    // vertical seams
    b.custom(panel({ r: BODY_R + 0.016, y0: 0.80, y1: 2.26, from: -1.20, to: -1.16 }), { color: LG });
  });

  // --- side legs ----------------------------------------------------------
  bb.mirrorX((b) => {
    // shoulder hub
    b.cyl(-0.90, 1.98, 0, 0.30, 0.26, { axis: 'x', seg: 14, color: LG, stud: false });
    b.cyl(-1.02, 1.98, 0, 0.16, 0.10, { axis: 'x', seg: 10, color: SL, finish: FINISH.METAL, stud: false });
    // upper leg, blue banded
    b.brick(-1.03, 1.66, 0, 0.32, 0.64, { h: 0.44, color: W, studs: false });
    b.brick(-1.05, 1.72, 0, 0.30, 0.66, { h: 0.10, color: BL, studs: false });
    // shin
    b.brick(-1.03, 0.44, 0, 0.28, 0.54, { h: 1.26, color: W, studs: false });
    b.brick(-1.05, 0.52, 0.02, 0.28, 0.14, { h: 1.10, color: LG, studs: false });
    // foot
    b.brick(-1.03, 0.12, 0.06, 0.44, 0.98, { h: 0.32, color: W, studs: false });
    b.brick(-1.03, 0.0, 0.06, 0.48, 1.04, { h: 0.14, color: DG, studs: false });
    b.brick(-1.03, 0.14, 0.56, 0.30, 0.14, { h: 0.20, color: DG, studs: false });
  });

  // --- centre foot --------------------------------------------------------
  bb.brick(0, 0.44, 0.44, 0.34, 0.40, { h: 0.30, color: LG, studs: false });
  bb.brick(0, 0.16, 0.50, 0.30, 0.34, { h: 0.30, color: W, studs: false });
  bb.brick(0, 0.02, 0.56, 0.40, 0.78, { h: 0.20, color: DG, studs: false });
  bb.brick(0, 0.0, 0.56, 0.44, 0.84, { h: 0.08, color: C.trueBlack, studs: false });
}

function buildDome(bb) {
  const W = C.white, BL = C.blue, SL = C.flatSilver, DG = C.darkBluishGray, LG = C.lightBluishGray;

  bb.sphere(0, 0, 0, DOME_R, { dome: true, sy: 0.82, seg: 26, rings: 10, color: W });
  bb.custom(panel({ r: DOME_R + 0.008, y0: 0.0, y1: 0.10, from: 0, to: Math.PI * 2 }), { color: LG });
  // blue panel band round the dome
  bb.mirrorX((b) => {
    b.custom(panel({ r: DOME_R * 0.995, y0: 0.10, y1: 0.34, from: -1.05, to: -0.42 }), { color: BL });
    b.custom(panel({ r: DOME_R * 0.995, y0: 0.10, y1: 0.30, from: -2.05, to: -1.52 }), { color: BL });
    b.custom(panel({ r: DOME_R * 0.995, y0: 0.12, y1: 0.26, from: -2.95, to: -2.45 }), { color: DG });
    // little radar eye beside the main lens
    b.cyl(-0.30, 0.44, 0.66, 0.07, 0.08, { axis: 'z', seg: 10, color: DG, stud: false });
  });

  // main photoreceptor housing
  bb.cyl(0, 0.30, 0.70, 0.22, 0.10, { axis: 'z', seg: 16, color: DG, stud: false });
  bb.cyl(0, 0.30, 0.76, 0.185, 0.05, { axis: 'z', seg: 16, color: C.trueBlack, stud: false });

  // holo projector + antennae on the crown
  bb.cyl(0, 0.62, 0.14, 0.10, 0.10, { seg: 10, color: LG, stud: false });
  bb.cyl(0, 0.72, 0.14, 0.06, 0.05, { seg: 10, color: C.transLightBlue, finish: FINISH.TRANS, stud: false });
  bb.bar(0.22, 0.74, -0.10, 0.025, 0.30, { color: LG });
  bb.bar(-0.20, 0.72, -0.14, 0.025, 0.24, { color: LG });
}

/**
 * @param {{ dome?: number }} [opts] initial dome angle in degrees
 * @returns {THREE.Group} with userData: spinDome(angle), holoOrigin, update(t,dt)
 */
export function buildR2(opts = {}) {
  const group = new THREE.Group();
  group.name = 'r2';

  const bb = builder();
  buildBody(bb);
  group.add(bb.build());

  const domePivot = new THREE.Group();
  domePivot.position.y = BODY_Y1 - 0.04;
  const db = builder();
  buildDome(db);
  domePivot.add(db.build());

  // the eye keeps its own material so it can flicker
  const lensMat = glow(C.transLightBlue, 0.9).clone();
  const lens = new THREE.Mesh(cylGeo(0.155, 0.155, 0.05, 14), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.30, 0.80);
  domePivot.add(lens);
  const eyeLight = new THREE.PointLight(C.transLightBlue, 1.4, 3.0, 2);
  eyeLight.position.set(0, 0.30, 1.05);
  domePivot.add(eyeLight);

  const holoOrigin = new THREE.Object3D();
  holoOrigin.name = 'holoOrigin';
  holoOrigin.position.set(0, 0.78, 0.14);
  domePivot.add(holoOrigin);

  group.add(domePivot);

  let manual = false;
  const baseY = domePivot.position.y;
  const spinDome = (angle) => { manual = true; domePivot.rotation.y = angle; };
  if (opts.dome !== undefined) spinDome(num(opts.dome, 0) * Math.PI / 180);

  group.userData.dome = domePivot;
  group.userData.holoOrigin = holoOrigin;
  group.userData.spinDome = spinDome;
  group.userData.eye = lens;
  group.userData.update = (t) => {
    // dome bob + idle scan, and the photoreceptor never sits still
    domePivot.position.y = baseY + Math.sin(t * 1.7) * 0.022;
    if (!manual) domePivot.rotation.y = Math.sin(t * 0.42) * 0.55 + Math.sin(t * 1.13) * 0.12;
    const f = 0.62 + 0.3 * Math.abs(Math.sin(t * 5.3)) + 0.08 * Math.sin(t * 23.1);
    lensMat.opacity = THREE.MathUtils.clamp(f, 0.25, 1);
    eyeLight.intensity = 0.7 + f * 1.6;
  };
  group.userData.update(0);
  return group;
}
