import * as THREE from 'three';
import { BrickBuilder } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { boxGeo } from '../lego/parts.js';
import { FIG } from '../lego/minifig.js';

/*
 * Headgear: helmets, hairpieces, hoods and droid heads.
 *
 * Every builder here works in HEAD-LOCAL space, which is what Minifig passes to
 * `spec.headgear`: y = 0 is the bottom of the head, y = 1.2 the top, the head is
 * a cylinder of radius 0.6 and the face looks down +Z.
 *
 * Because the face print and the helmet geometry have to agree to within a
 * millimetre, print pixels are converted with facePx/faceY/faceTheta rather than
 * eyeballed: a print pixel column maps to an angle around the head, so a helmet
 * lens can be dropped exactly on top of the lens that the SVG drew.
 */

export const HEAD_R = FIG.headR;   // 0.60
export const HEAD_H = FIG.headH;   // 1.20

/** Face-print px -> world. 512 px wraps the whole head, x = 256 is dead ahead. */
export const faceTheta = (px) => (px - 256) / 512 * Math.PI * 2;
export const faceX = (px) => Math.sin(faceTheta(px)) * HEAD_R;
export const faceY = (py) => (1 - py / 256) * HEAD_H;

function builder(opts = {}) {
  return new BrickBuilder({ studs: false, bevel: true, seams: false, cullStuds: false, ...opts });
}

/**
 * Open-ended tube / cone shell hugging the head. `from`/`to` are radians round
 * the head measured from the face (+Z), so `from: 1.0, to: 5.28` leaves the face
 * clear and wraps everything else.
 */
function shell({ r, rTop = r, y0, y1, from = 0, to = Math.PI * 2, seg = 26 }) {
  const h = y1 - y0;
  const span = to - from;
  const s = Math.max(3, Math.round(seg * span / (Math.PI * 2)));
  const g = new THREE.CylinderGeometry(rTop, r, h, s, 1, true, from, span);
  g.translate(0, y0 + h / 2, 0);
  return g;
}

/** Shell that needs to be visible from the inside too (hoods, open helmets). */
function twoSided(geo, color, opts = {}) {
  const m = mat(color, opts.finish, opts.matOpts || {}).clone();
  m.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Flat ring lying in the XZ plane -- helmet rims, droid collars. */
function ring(rIn, rOut, y, seg = 24) {
  const g = new THREE.RingGeometry(rIn, rOut, seg);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

// ---------------------------------------------------------------------------
// DARTH VADER
// ---------------------------------------------------------------------------

/**
 * Vader's helmet: domed skull, flared cowl over the shoulders, and the angular
 * frame of the face mask. The mask graphics (lenses, vocoder, nose ridge) come
 * from FACE_VADER; the geometry supplies the silhouette and the proud grille.
 */
export function vaderHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const BK = C.black, DG = C.darkBluishGray, SL = C.flatSilver;

  // --- domed skull --------------------------------------------------------
  bb.sphere(0, 0.86, 0, 0.66, { dome: true, sy: 0.95, seg: 24, rings: 9, color: BK });
  // crown seam
  bb.custom(shell({ r: 0.665, y0: 1.16, y1: 1.24, seg: 24 }), { color: DG });

  // --- cowl: wraps everything but the face, flaring as it drops -----------
  bb.custom(shell({ r: 0.70, rTop: 0.655, y0: 0.30, y1: 0.90, from: 0.95, to: Math.PI * 2 - 0.95 }),
    { color: BK });
  bb.custom(shell({ r: 0.86, rTop: 0.70, y0: -0.16, y1: 0.32, from: 0.80, to: Math.PI * 2 - 0.80 }),
    { color: BK });
  // flared rim of the cowl
  bb.custom(shell({ r: 1.02, rTop: 0.86, y0: -0.34, y1: -0.14, from: 0.78, to: Math.PI * 2 - 0.78 }),
    { color: BK });
  g.add(twoSided(ring(0.86, 1.02, -0.34, 26), BK));
  bb.custom(shell({ r: 1.03, rTop: 1.0, y0: -0.30, y1: -0.22, from: 0.78, to: Math.PI * 2 - 0.78 }),
    { color: DG });

  // --- mask frame ---------------------------------------------------------
  // Everything here hugs the head so the printed mask underneath stays legible:
  // the frame supplies the flared triangular silhouette, the print the lenses.
  // brow overhang, kicking out over the eyes
  bb.custom(shell({ r: 0.635, rTop: 0.73, y0: faceY(60), y1: faceY(18), from: faceTheta(178), to: faceTheta(334) }),
    { color: BK });
  bb.custom(shell({ r: 0.745, rTop: 0.745, y0: faceY(30), y1: faceY(16), from: faceTheta(178), to: faceTheta(334) }),
    { color: DG });
  // mask sides: narrow at the brow, flaring out to the jaw
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.84, rTop: 0.635, y0: faceY(238), y1: faceY(46), from: faceTheta(170), to: faceTheta(206) }),
      { color: BK });
    b.custom(shell({ r: 0.86, rTop: 0.66, y0: faceY(238), y1: faceY(60), from: faceTheta(174), to: faceTheta(186) }),
      { color: DG });
  });
  // jaw plate across the bottom of the mask
  bb.custom(shell({ r: 0.80, rTop: 0.64, y0: faceY(250), y1: faceY(206), from: faceTheta(206), to: faceTheta(306) }),
    { color: BK });
  g.add(twoSided(ring(0.64, 0.80, faceY(250), 20), BK));

  // --- vocoder grille, proud of the face ----------------------------------
  const gy = faceY(198), gy2 = faceY(138);
  bb.brick(0, gy, 0.615, 0.34, 0.11, { h: gy2 - gy, color: C.trueBlack, studs: false });
  for (let i = 0; i < 4; i++) {
    bb.brick(-0.126 + i * 0.084, gy + 0.02, 0.655, 0.034, 0.05,
      { h: gy2 - gy - 0.055, color: SL, studs: false, finish: FINISH.METAL });
  }

  // --- breather pipes down the sides of the jaw ---------------------------
  bb.mirrorX((b) => {
    b.cyl(-0.48, -0.14, 0.26, 0.055, 0.46, { color: DG, stud: false, seg: 8 });
    b.sphere(-0.48, 0.32, 0.26, 0.07, { color: SL, seg: 8, rings: 6, finish: FINISH.METAL });
  });

  g.add(bb.build());
  return g;
}

/** Flared shoulder mantle + chest armour yoke. Parented to the torso. */
export function vaderMantle() {
  const g = new THREE.Group();
  const bb = builder();
  const BK = C.black, DG = C.darkBluishGray;
  const yTop = FIG.torsoH;            // 1.95

  // shoulder pads, angled out and down over the tops of the arms
  bb.mirrorX((b) => {
    b.prism([[0.24, yTop + 0.10], [0.92, yTop - 0.16], [0.94, yTop - 0.34], [0.24, yTop - 0.12]], 0.84,
      { color: BK });
    b.prism([[0.30, yTop + 0.04], [0.88, yTop - 0.19], [0.89, yTop - 0.27], [0.30, yTop - 0.04]], 0.78,
      { color: DG });
  });
  // armour yoke across the chest and back
  bb.prism([[-0.52, yTop + 0.06], [0.52, yTop + 0.06], [0.46, yTop - 0.30], [-0.46, yTop - 0.30]], 0.13,
    { z: FIG.torsoD / 2 + 0.02, color: BK });
  bb.prism([[-0.52, yTop + 0.06], [0.52, yTop + 0.06], [0.46, yTop - 0.26], [-0.46, yTop - 0.26]], 0.13,
    { z: -FIG.torsoD / 2 - 0.02, color: BK });
  // neck ring under the helmet flare
  bb.cyl(0, yTop - 0.02, 0, 0.40, 0.12, { seg: 16, color: C.darkBluishGray, stud: false });

  g.add(bb.build());
  return g;
}

// ---------------------------------------------------------------------------
// HAIR
// ---------------------------------------------------------------------------

/** Leia: side buns, centre parting, hood collar at the back. */
export function leiaHair(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const H = C.darkBrown;

  // crown + back of the head
  bb.sphere(0, 0.96, 0, 0.635, { dome: true, sy: 0.72, seg: 24, rings: 8, color: H });
  bb.custom(shell({ r: 0.635, rTop: 0.635, y0: 0.42, y1: 1.00, from: 1.15, to: Math.PI * 2 - 1.15 }),
    { color: H });
  // fringe framing the face
  bb.mirrorX((b) => {
    b.prism([[-0.62, 1.14], [-0.30, 1.20], [-0.26, 1.02], [-0.58, 0.96]], 0.30,
      { z: 0.44, color: H });
    b.prism([[-0.60, 1.02], [-0.44, 1.04], [-0.40, 0.52], [-0.56, 0.52]], 0.44,
      { z: 0.24, color: H });
  });
  // centre parting
  bb.prism([[-0.05, 1.22], [0.05, 1.22], [0.05, 1.06], [-0.05, 1.06]], 0.40, { z: 0.36, color: C.reddishBrown });

  // the buns
  bb.mirrorX((b) => {
    b.sphere(-0.72, 0.64, -0.04, 0.30, { seg: 14, rings: 10, sx: 0.70, color: H });
    b.custom(torusAt(0.22, 0.075, -0.80, 0.64, -0.04), { color: C.reddishBrown });
    b.custom(torusAt(0.13, 0.06, -0.83, 0.64, -0.04), { color: C.reddishBrown });
  });

  g.add(bb.build());

  // white hood of the gown, thrown back off the head
  g.add(twoSided(shell({ r: 0.82, rTop: 0.60, y0: -0.34, y1: 0.86, from: 1.95, to: Math.PI * 2 - 1.95, seg: 24 }),
    C.white));
  g.add(twoSided(ring(0.66, 0.82, -0.34, 20), C.white));
  return g;
}

function torusAt(r, tube, x, y, z) {
  const g = new THREE.TorusGeometry(r, tube, 6, 12);
  g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Luke: tousled sandy hair with a swept fringe. */
export function lukeHair(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const H = C.brightLightOrange;

  bb.sphere(0, 0.94, 0, 0.635, { dome: true, sy: 0.78, seg: 22, rings: 8, color: H });
  bb.custom(shell({ r: 0.635, rTop: 0.635, y0: 0.66, y1: 1.00, from: 0.95, to: Math.PI * 2 - 0.95 }),
    { color: H });
  // sideburn tabs
  bb.mirrorX((b) => {
    b.prism([[-0.62, 1.02], [-0.46, 1.02], [-0.44, 0.66], [-0.60, 0.66]], 0.34, { z: 0.30, color: H });
  });
  // fringe: three swept locks over the brow
  bb.prism([[-0.44, 1.20], [0.10, 1.24], [0.22, 1.06], [-0.40, 1.02]], 0.26, { z: 0.42, color: H });
  bb.prism([[-0.10, 1.22], [0.42, 1.18], [0.44, 1.00], [-0.06, 1.04]], 0.24, { z: 0.44, color: H });
  bb.prism([[-0.30, 1.26], [-0.02, 1.30], [0.06, 1.14], [-0.26, 1.10]], 0.22, { z: 0.34, color: C.tan });
  // tousle at the crown
  bb.prism([[0.10, 1.34], [0.36, 1.24], [0.30, 1.12], [0.06, 1.18]], 0.20, { z: 0.10, color: H });

  g.add(bb.build());
  return g;
}

// ---------------------------------------------------------------------------
// HOODS
// ---------------------------------------------------------------------------

/** Obi-Wan: heavy Jedi cowl that overhangs and shadows the face. */
export function obiwanHood(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const OUT = C.reddishBrown, IN = C.darkBrown;

  // outer cowl, flaring onto the shoulders
  const outer = shell({ r: 1.00, rTop: 0.50, y0: -0.55, y1: 1.30, from: 1.02, to: Math.PI * 2 - 1.02, seg: 28 });
  g.add(twoSided(outer, OUT, { matOpts: { roughness: 0.8 } }));
  // dark lining just inside it
  const inner = shell({ r: 0.90, rTop: 0.48, y0: -0.50, y1: 1.22, from: 1.10, to: Math.PI * 2 - 1.10, seg: 24 });
  g.add(twoSided(inner, IN, { matOpts: { roughness: 0.9 } }));

  const bb = builder();
  // peak of the hood
  bb.sphere(0, 1.10, -0.10, 0.50, { dome: true, sy: 0.70, seg: 20, rings: 7, color: OUT });
  // brow overhang that throws the shadow
  bb.prism([[-0.62, 1.10], [0.62, 1.10], [0.54, 0.86], [-0.54, 0.86]], 0.30, { z: 0.52, color: OUT });
  bb.prism([[-0.58, 0.94], [0.58, 0.94], [0.50, 0.84], [-0.50, 0.84]], 0.26, { z: 0.62, color: IN });
  // the two front edges of the cowl, falling past the jaw
  bb.mirrorX((b) => {
    b.prism([[-0.66, 1.06], [-0.44, 1.02], [-0.30, -0.50], [-0.60, -0.50]], 0.26, { z: 0.44, color: OUT });
  });
  g.add(bb.build());
  return g;
}

/** Jawa: tall pointed hood, nothing visible inside but the eyes. */
export function jawaHood(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const OUT = C.darkBrown, IN = C.trueBlack;

  const outer = shell({ r: 1.05, rTop: 0.34, y0: -0.60, y1: 1.52, from: 0.92, to: Math.PI * 2 - 0.92, seg: 26 });
  g.add(twoSided(outer, OUT, { matOpts: { roughness: 0.85 } }));
  const inner = shell({ r: 0.92, rTop: 0.30, y0: -0.55, y1: 1.40, from: 1.02, to: Math.PI * 2 - 1.02, seg: 22 });
  g.add(twoSided(inner, IN, { matOpts: { roughness: 0.95 } }));

  const bb = builder();
  bb.cone(0, 1.30, -0.08, 0.34, 0.46, { seg: 16, color: OUT });
  // deep brow so only the glow gets out
  bb.prism([[-0.66, 1.16], [0.66, 1.16], [0.58, 0.80], [-0.58, 0.80]], 0.42, { z: 0.50, color: OUT });
  bb.prism([[-0.60, 0.90], [0.60, 0.90], [0.52, 0.78], [-0.52, 0.78]], 0.44, { z: 0.56, color: IN });
  bb.mirrorX((b) => {
    b.prism([[-0.70, 1.12], [-0.46, 1.06], [-0.34, -0.55], [-0.66, -0.55]], 0.34, { z: 0.42, color: OUT });
  });
  g.add(bb.build());
  return g;
}

// ---------------------------------------------------------------------------
// HELMETS
// ---------------------------------------------------------------------------

/**
 * Stormtrooper helmet: dome, raised brow, black lens cowls, the frown vent and
 * the grey ear cups. Sits on a white head printed with FACE_TROOPER, and every
 * piece is aligned to the print's pixel coordinates.
 */
export function trooperHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const W = C.white, BK = C.trueBlack, LG = C.lightBluishGray, DG = C.darkBluishGray;

  // --- dome ---------------------------------------------------------------
  bb.sphere(0, 0.90, 0, 0.625, { dome: true, sy: 0.90, seg: 24, rings: 9, color: W });
  // back and sides of the shell, leaving the printed face clear
  bb.custom(shell({ r: 0.625, rTop: 0.625, y0: 0.30, y1: 0.94, from: 1.02, to: Math.PI * 2 - 1.02 }),
    { color: W });
  // flared neck skirt
  bb.custom(shell({ r: 0.74, rTop: 0.625, y0: 0.02, y1: 0.32, from: 0.86, to: Math.PI * 2 - 0.86 }),
    { color: W });
  bb.custom(shell({ r: 0.76, rTop: 0.74, y0: 0.02, y1: 0.10, from: 0.86, to: Math.PI * 2 - 0.86 }),
    { color: DG });

  // --- raised brow, hugging the curve of the head ------------------------
  bb.custom(shell({ r: 0.655, rTop: 0.645, y0: faceY(64), y1: faceY(30), from: faceTheta(184), to: faceTheta(328) }),
    { color: W });
  bb.custom(shell({ r: 0.66, rTop: 0.66, y0: faceY(40), y1: faceY(30), from: faceTheta(184), to: faceTheta(328) }),
    { color: DG });

  // --- eye lens cowls ----------------------------------------------------
  for (const [x0, x1] of [[194, 250], [262, 318]]) {
    bb.custom(shell({ r: 0.635, rTop: 0.635, y0: faceY(120), y1: faceY(62), from: faceTheta(x0), to: faceTheta(x1) }),
      { color: BK });
    bb.custom(shell({ r: 0.645, rTop: 0.638, y0: faceY(70), y1: faceY(60), from: faceTheta(x0), to: faceTheta(x1) }),
      { color: DG });
  }

  // --- the frown ---------------------------------------------------------
  const fy0 = faceY(196), fy1 = faceY(140);
  bb.brick(0, fy0, 0.54, 0.44, 0.10, { h: fy1 - fy0, color: BK, studs: false });
  for (let i = 0; i < 5; i++) {
    bb.brick(-0.16 + i * 0.08, fy0 + 0.02, 0.585, 0.032, 0.05,
      { h: fy1 - fy0 - 0.05, color: C.veryLightGray, studs: false });
  }
  // chin plate
  bb.prism([[-0.30, faceY(226)], [0.30, faceY(226)], [0.24, faceY(200)], [-0.24, faceY(200)]], 0.16,
    { z: 0.50, color: W });

  // --- ear cups ----------------------------------------------------------
  bb.mirrorX((b) => {
    b.brick(-0.615, faceY(150), 0, 0.10, 0.46, { h: faceY(74) - faceY(150), color: LG, studs: false });
    b.brick(-0.665, faceY(104), 0, 0.03, 0.16, { h: 0.10, color: DG, studs: false });
    b.brick(-0.665, faceY(140), 0, 0.03, 0.16, { h: 0.10, color: DG, studs: false });
  });

  g.add(bb.build());
  return g;
}

/** Rebel fleet trooper: tall open-crowned combat helmet. */
export function rebelHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const SH = C.darkTan, RIM = C.reddishBrown;

  // open-topped drum: seen from above you look straight into it
  const drum = shell({ r: 0.70, rTop: 0.66, y0: 0.72, y1: 1.62, seg: 26 });
  g.add(twoSided(drum, SH));
  g.add(twoSided(ring(0.60, 0.66, 1.62, 26), SH));
  // inner crown so the open top does not show sky through the head
  const bb = builder();
  bb.sphere(0, 1.02, 0, 0.60, { dome: true, sy: 0.45, seg: 20, rings: 6, color: C.darkBrown });
  // brim / rim bands
  bb.custom(shell({ r: 0.745, rTop: 0.72, y0: 0.72, y1: 0.86, seg: 26 }), { color: RIM });
  bb.custom(shell({ r: 0.72, rTop: 0.715, y0: 1.44, y1: 1.56, seg: 26 }), { color: RIM });
  // front badge
  bb.prism([[-0.10, 1.22], [0.10, 1.22], [0.10, 1.02], [-0.10, 1.02]], 0.10, { z: 0.68, color: C.darkGray });
  // cheek guards
  bb.mirrorX((b) => {
    b.prism([[-0.72, 0.86], [-0.52, 0.86], [-0.48, 0.40], [-0.68, 0.42]], 0.34, { z: 0.24, color: SH });
  });
  g.add(bb.build());
  return g;
}

/** Imperial officer's flat cap. */
export function officerCap(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const CAP = C.black, BAND = C.trueBlack;

  // band
  bb.cyl(0, 1.02, 0, 0.655, 0.16, { seg: 22, color: BAND, stud: false });
  // crown, flaring slightly and flat on top
  bb.custom(shell({ r: 0.655, rTop: 0.74, y0: 1.18, y1: 1.42, seg: 22 }), { color: CAP });
  bb.cyl(0, 1.40, 0, 0.745, 0.06, { seg: 22, color: CAP, stud: false });
  bb.cyl(0, 1.42, 0, 0.70, 0.04, { seg: 22, color: C.darkGray, stud: false });
  // peak, drooping over the brow
  bb.custom(boxGeo(0.90, 0.055, 0.46, 0.02), { x: 0, y: 1.02, z: 0.74, rx: -0.24, color: BAND });
  bb.custom(boxGeo(0.94, 0.05, 0.20, 0.02), { x: 0, y: 1.06, z: 0.56, color: BAND });
  // rank disc on the band
  bb.cyl(0, 1.06, 0.60, 0.075, 0.05, { seg: 10, axis: 'z', color: C.flatSilver, finish: FINISH.METAL, stud: false });
  g.add(bb.build());
  return g;
}

/**
 * Rebel pilot helmet: white shell, grey/orange markings, visor flipped up.
 * Also worn by Luke in his X-wing.
 */
export function pilotHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const W = C.white, OR = C.orange, DG = C.darkBluishGray, BK = C.trueBlack;

  // shell
  bb.sphere(0, 0.86, 0, 0.665, { dome: true, sy: 0.98, seg: 24, rings: 9, color: W });
  bb.custom(shell({ r: 0.70, rTop: 0.665, y0: 0.16, y1: 0.90, from: 0.98, to: Math.PI * 2 - 0.98 }),
    { color: W });
  bb.custom(shell({ r: 0.72, rTop: 0.70, y0: 0.16, y1: 0.26, from: 0.94, to: Math.PI * 2 - 0.94 }),
    { color: DG });
  // brow band
  bb.custom(shell({ r: 0.695, rTop: 0.685, y0: 0.86, y1: 0.98, from: faceTheta(170), to: faceTheta(342) }),
    { color: DG });

  // markings: orange blocks on the sides, red-orange stripe over the crown
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.675, rTop: 0.675, y0: 0.58, y1: 0.84, from: faceTheta(120), to: faceTheta(196) }),
      { color: OR });
    b.custom(shell({ r: 0.676, rTop: 0.676, y0: 0.44, y1: 0.54, from: faceTheta(130), to: faceTheta(186) }),
      { color: DG });
  });
  bb.prism([[-0.09, 0.06], [0.09, 0.06], [0.09, -0.06], [-0.09, -0.06]], 1.30,
    { y: 1.44, z: -0.06, color: OR });
  bb.mirrorX((b) => {
    b.prism([[-0.30, 0.05], [-0.14, 0.05], [-0.14, -0.05], [-0.30, -0.05]], 1.10,
      { y: 1.36, z: -0.10, color: DG });
  });

  // visor, hinged up onto the forehead
  const visor = new THREE.Group();
  visor.position.set(0, 0.92, 0);
  visor.rotation.x = -0.72;
  const vb = builder();
  vb.custom(shell({ r: 0.72, rTop: 0.70, y0: 0.02, y1: 0.34, from: faceTheta(168), to: faceTheta(344) }),
    { color: BK, finish: FINISH.SOLID, matOpts: { roughness: 0.12 } });
  vb.custom(shell({ r: 0.735, rTop: 0.735, y0: 0.30, y1: 0.36, from: faceTheta(168), to: faceTheta(344) }),
    { color: DG });
  visor.add(vb.build());
  g.add(visor);

  // chin cups
  bb.mirrorX((b) => {
    b.brick(-0.64, faceY(150), 0.04, 0.12, 0.42, { h: 0.34, color: W, studs: false });
  });

  g.add(bb.build());
  g.userData.visor = visor;
  return g;
}

// ---------------------------------------------------------------------------
// DROID HEADS
// ---------------------------------------------------------------------------

/**
 * C-3PO: gold dome, sunken photoreceptors with a warm glow, mouth grille and
 * the neck rings. The face print underneath supplies the plate seams.
 */
export function c3poHead(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const GOLD = C.pearlGold, DK = C.darkBrown;

  // dome
  bb.sphere(0, 0.96, 0, 0.615, { dome: true, sy: 0.80, seg: 22, rings: 8, color: GOLD, finish: FINISH.METAL });
  bb.custom(shell({ r: 0.615, rTop: 0.612, y0: 0.86, y1: 0.98, seg: 22 }), { color: C.copper, finish: FINISH.METAL });
  // crown crest
  bb.prism([[-0.06, 1.42], [0.06, 1.42], [0.06, 1.20], [-0.06, 1.20]], 0.90, { z: -0.04, color: GOLD, finish: FINISH.METAL });

  // photoreceptors, on the print's eye centres
  const ey = faceY(106);
  for (const px of [220, 292]) {
    const x = faceX(px);
    const z = Math.cos(faceTheta(px)) * HEAD_R;
    bb.cyl(x, ey, z + 0.06, 0.155, 0.12, { axis: 'z', seg: 12, color: GOLD, finish: FINISH.METAL, stud: false });
    bb.cyl(x, ey, z + 0.10, 0.115, 0.05, { axis: 'z', seg: 12, color: DK, stud: false });
    bb.cyl(x, ey, z + 0.13, 0.085, 0.04, { axis: 'z', seg: 12, color: C.transYellow, finish: FINISH.GLOW, stud: false });
  }
  // mouth grille
  const my0 = faceY(208), my1 = faceY(174);
  bb.brick(0, my0, 0.60, 0.44, 0.06, { h: my1 - my0, color: DK, studs: false });
  for (let i = 0; i < 5; i++) {
    bb.brick(-0.16 + i * 0.08, my0 + 0.015, 0.625, 0.03, 0.04,
      { h: my1 - my0 - 0.04, color: GOLD, studs: false, finish: FINISH.METAL });
  }
  // ear plates + neck rings
  bb.mirrorX((b) => {
    b.brick(-0.60, faceY(140), 0, 0.08, 0.30, { h: 0.30, color: GOLD, studs: false, finish: FINISH.METAL });
  });
  bb.cyl(0, -0.10, 0, 0.35, 0.08, { seg: 14, color: C.copper, finish: FINISH.METAL, stud: false });
  bb.cyl(0, -0.02, 0, 0.33, 0.06, { seg: 14, color: GOLD, finish: FINISH.METAL, stud: false });

  g.add(bb.build());
  return g;
}
