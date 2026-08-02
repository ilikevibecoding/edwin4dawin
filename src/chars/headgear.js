import * as THREE from 'three';
import { BrickBuilder } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { boxGeo } from '../lego/parts.js';
import { FIG } from '../lego/minifig.js';
import { softenGloss, makeCloth } from './util.js';

/*
 * Headgear: helmets, hairpieces, hoods and droid heads.
 *
 * Every builder here works in HEAD-LOCAL space, which is what Minifig passes to
 * `spec.headgear`: y = 0 is the bottom of the head, y = 1.2 the top, the head is
 * a cylinder of radius 0.6 and the face looks down +Z.
 *
 * Two rules learned the hard way from renders:
 *  - Build with CURVED SHELLS that hug the head, not flat slabs floating in
 *    front of it. Slabs read as loose plastic and catch a mirror-bright
 *    specular; shells read as moulded parts.
 *  - Anything that has to line up with a face print is positioned through
 *    facePx/faceY/faceTheta rather than by eye, so a helmet lens lands exactly
 *    on the lens the SVG drew.
 */

export const HEAD_R = FIG.headR;   // 0.60
export const HEAD_H = FIG.headH;   // 1.20

/** Face-print px -> world. 512 px wraps the whole head, x = 256 is dead ahead. */
export const faceTheta = (px) => (px - 256) / 512 * Math.PI * 2;
export const faceX = (px) => Math.sin(faceTheta(px)) * HEAD_R;
export const faceZ = (px) => Math.cos(faceTheta(px)) * HEAD_R;
export const faceY = (py) => (1 - py / 256) * HEAD_H;

const TWO_PI = Math.PI * 2;

function builder(opts = {}) {
  return new BrickBuilder({ studs: false, bevel: true, seams: false, cullStuds: false, ...opts });
}

/**
 * Open-ended tube / cone shell. `from`/`to` are radians around the head measured
 * from the face (+Z), so `{ from: 1, to: 2*PI - 1 }` wraps everything but the
 * face. rTop > r flares outward going up (a hood brim), rTop < r flares out
 * going down (a helmet skirt).
 */
function shell({ r, rTop = r, y0, y1, from = 0, to = TWO_PI, seg = 28 }) {
  const h = y1 - y0;
  const span = to - from;
  const s = Math.max(3, Math.round(seg * span / TWO_PI));
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

/**
 * Segment of a sphere -- markings that run over the crown of a helmet.
 * phi is measured so PI/2 is the front of the head.
 */
function sphereSeg({ r, phiFrom, phiTo, thetaTo = Math.PI / 2, seg = 6, rings = 8, sy = 1, y = 0 }) {
  const g = new THREE.SphereGeometry(r, seg, rings, phiFrom, phiTo - phiFrom, 0, thetaTo);
  if (sy !== 1) g.scale(1, sy, 1);
  g.translate(0, y, 0);
  return g;
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
 * Vader's helmet: domed skull, cowl flaring over the shoulders, and the angular
 * frame of the face mask. The mask graphics (lenses, vocoder, nose ridge) come
 * from FACE_VADER; the geometry supplies the silhouette and the proud grille.
 */
export function vaderHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const BK = C.black, DG = C.darkBluishGray, SL = C.flatSilver;

  // --- domed skull --------------------------------------------------------
  bb.sphere(0, 0.86, 0, 0.66, { dome: true, sy: 0.95, seg: 26, rings: 10, color: BK });
  bb.custom(shell({ r: 0.664, y0: 1.14, y1: 1.22 }), { color: DG });

  // --- cowl: wraps everything but the face, flaring as it drops -----------
  bb.custom(shell({ r: 0.70, rTop: 0.655, y0: 0.30, y1: 0.90, from: 0.95, to: TWO_PI - 0.95 }), { color: BK });
  bb.custom(shell({ r: 0.86, rTop: 0.70, y0: -0.16, y1: 0.32, from: 0.80, to: TWO_PI - 0.80 }), { color: BK });
  bb.custom(shell({ r: 1.00, rTop: 0.86, y0: -0.34, y1: -0.14, from: 0.78, to: TWO_PI - 0.78 }), { color: BK });
  bb.custom(shell({ r: 1.01, rTop: 0.99, y0: -0.29, y1: -0.21, from: 0.78, to: TWO_PI - 0.78 }), { color: DG });

  // --- mask frame ---------------------------------------------------------
  // brow overhang, kicking out over the eyes
  bb.custom(shell({ r: 0.635, rTop: 0.74, y0: faceY(58), y1: faceY(16), from: faceTheta(176), to: faceTheta(336) }),
    { color: BK });
  bb.custom(shell({ r: 0.752, y0: faceY(28), y1: faceY(14), from: faceTheta(176), to: faceTheta(336) }),
    { color: DG });
  // mask sides: narrow at the brow, flaring out to the jaw
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.84, rTop: 0.635, y0: faceY(240), y1: faceY(44), from: faceTheta(168), to: faceTheta(208) }),
      { color: BK });
  });
  // jaw plate under the vocoder
  bb.custom(shell({ r: 0.72, rTop: 0.635, y0: faceY(248), y1: faceY(204), from: faceTheta(204), to: faceTheta(308) }),
    { color: BK });

  // --- vocoder grille, proud of the face ----------------------------------
  const gy = faceY(198), gy2 = faceY(138);
  bb.brick(0, gy, 0.615, 0.34, 0.11, { h: gy2 - gy, color: C.trueBlack, studs: false });
  for (let i = 0; i < 4; i++) {
    bb.brick(-0.126 + i * 0.084, gy + 0.02, 0.655, 0.034, 0.05,
      { h: gy2 - gy - 0.055, color: SL, studs: false, finish: FINISH.METAL });
  }

  // --- breather pipes down the sides of the jaw ---------------------------
  bb.mirrorX((b) => {
    b.cyl(-0.50, -0.16, 0.24, 0.055, 0.48, { color: DG, stud: false, seg: 8 });
    b.sphere(-0.50, 0.32, 0.24, 0.07, { color: SL, seg: 8, rings: 6, finish: FINISH.METAL });
  });

  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.3, clearcoatRoughness: 0.3, env: 0.55 });
  return g;
}

/** Flared shoulder mantle + armour yoke. Parented to the torso, not the head. */
export function vaderMantle() {
  const g = new THREE.Group();
  const bb = builder();
  const BK = C.black, DG = C.darkBluishGray;
  const yTop = FIG.torsoH;            // 1.95

  // shoulder pads, angled out and down over the tops of the arms
  bb.mirrorX((b) => {
    b.prism([[0.22, yTop + 0.12], [0.90, yTop - 0.14], [0.92, yTop - 0.34], [0.22, yTop - 0.12]], 0.84,
      { color: BK });
    b.prism([[0.26, yTop + 0.06], [0.86, yTop - 0.18], [0.87, yTop - 0.26], [0.26, yTop - 0.04]], 0.78,
      { color: DG });
  });
  // armour yoke across the back
  bb.prism([[-0.52, yTop + 0.06], [0.52, yTop + 0.06], [0.46, yTop - 0.34], [-0.46, yTop - 0.34]], 0.13,
    { z: -FIG.torsoD / 2 - 0.02, color: BK });
  // neck ring under the helmet flare
  bb.cyl(0, yTop - 0.04, 0, 0.42, 0.14, { seg: 16, color: DG, stud: false });

  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.28, clearcoatRoughness: 0.32, env: 0.5 });
  return g;
}

// ---------------------------------------------------------------------------
// HAIR
// ---------------------------------------------------------------------------

function torusAt(r, tube, x, y, z) {
  const g = new THREE.TorusGeometry(r, tube, 6, 12);
  g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Leia: centre parting, side buns, white hood of the gown thrown back. */
export function leiaHair(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const H = C.darkBrown, HL = C.reddishBrown;

  // Crown + back of the head. The band is not optional: a dome alone narrows
  // faster than the head cylinder does, so the head's own rim came out as a
  // yellow crescent above the fringe.
  bb.custom(shell({ r: 0.638, y0: 0.94, y1: 1.20, seg: 26 }), { color: H });
  bb.sphere(0, 1.18, 0, 0.638, { dome: true, sy: 0.44, seg: 26, rings: 7, color: H });
  bb.custom(shell({ r: 0.638, y0: 0.40, y1: 0.98, from: 1.12, to: TWO_PI - 1.12 }), { color: H });
  // fringe swept back off the forehead, plus the parting
  bb.custom(shell({ r: 0.652, rTop: 0.642, y0: 0.94, y1: 1.14, from: faceTheta(176), to: faceTheta(336) }),
    { color: H });
  bb.custom(shell({ r: 0.66, rTop: 0.648, y0: 0.98, y1: 1.16, from: faceTheta(196), to: faceTheta(246) }),
    { color: H });
  bb.custom(shell({ r: 0.66, rTop: 0.648, y0: 0.98, y1: 1.16, from: faceTheta(266), to: faceTheta(316) }),
    { color: H });
  bb.custom(shell({ r: 0.668, rTop: 0.65, y0: 1.06, y1: 1.20, from: faceTheta(248), to: faceTheta(264) }),
    { color: HL });
  // sweeps in front of the ears
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.648, y0: 0.50, y1: 1.00, from: faceTheta(146), to: faceTheta(194) }), { color: H });
  });
  // The buns. Coiled at ear height, which is also eye height, so without the
  // spiral rings and the wedge of hair joining them to the crown they came back
  // reading as a pair of headphones clamped on the sides of the head.
  bb.mirrorX((b) => {
    b.sphere(-0.66, 0.70, -0.06, 0.20, { seg: 12, rings: 8, sx: 0.9, color: H });
    b.sphere(-0.74, 0.70, -0.06, 0.29, { seg: 16, rings: 11, sx: 0.70, color: H });
    b.custom(torusAt(0.225, 0.055, -0.80, 0.70, -0.06), { color: HL });
    b.custom(torusAt(0.150, 0.050, -0.835, 0.70, -0.06), { color: HL });
    b.custom(torusAt(0.075, 0.045, -0.858, 0.70, -0.06), { color: HL });
  });
  g.add(bb.build());

  // white hood of the gown, sitting back off the head
  const hood = new THREE.Group();
  hood.add(twoSided(shell({ r: 0.86, rTop: 0.58, y0: -0.40, y1: 0.92, from: 1.98, to: TWO_PI - 1.98, seg: 26 }),
    C.white));
  hood.add(twoSided(ring(0.62, 0.86, -0.40, 20), C.white));
  makeCloth(hood);
  g.add(hood);
  return g;
}

/** Luke: tousled sandy hair, layered locks over the brow. */
export function lukeHair(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  // Sandy blond, not ginger. One tone only: every attempt at painting individual
  // locks in a second colour (brightLightOrange, then darkTan) came back as flat
  // rectangles stamped on the forehead, because a shell's arc ends square.
  const H = C.tan;

  // band up to the top of the head, then a shallow cap: see leiaHair
  bb.custom(shell({ r: 0.638, y0: 0.92, y1: 1.20, seg: 24 }), { color: H });
  bb.sphere(0, 1.18, 0, 0.638, { dome: true, sy: 0.46, seg: 24, rings: 7, color: H });
  bb.custom(shell({ r: 0.638, y0: 0.56, y1: 0.96, from: 0.92, to: TWO_PI - 0.92 }), { color: H });
  // sideburn tabs, stopping at the top of the ear
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.644, y0: 0.74, y1: 0.98, from: faceTheta(152), to: faceTheta(182) }), { color: H });
  });
  // fringe: a continuous band above the brow so the mass stays solid...
  bb.custom(shell({ r: 0.650, rTop: 0.644, y0: 0.96, y1: 1.20, from: faceTheta(168), to: faceTheta(344) }),
    { color: H });
  // ...then three tabs hanging off it with a sliver of forehead between them. The
  // jagged hairline is the fringe detail that actually survives at film scale.
  bb.custom(shell({ r: 0.660, rTop: 0.652, y0: 0.90, y1: 1.06, from: faceTheta(170), to: faceTheta(218) }),
    { color: H });
  bb.custom(shell({ r: 0.668, rTop: 0.656, y0: 0.85, y1: 1.06, from: faceTheta(228), to: faceTheta(286) }),
    { color: H });
  bb.custom(shell({ r: 0.660, rTop: 0.652, y0: 0.89, y1: 1.06, from: faceTheta(296), to: faceTheta(344) }),
    { color: H });
  // tuft at the crown
  bb.sphere(0.12, 1.16, -0.10, 0.24, { seg: 12, rings: 8, sy: 0.7, color: H });
  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.12, clearcoatRoughness: 0.5, env: 0.4 });
  return g;
}

// ---------------------------------------------------------------------------
// HOODS
// ---------------------------------------------------------------------------

/*
 * Hoods are the hardest thing in here. The trap is to model the front opening as
 * a cone that flares up and OUT, which renders as a cardinal's hat: a wide flat
 * brim with a face under it. A hood reads as a hood when the opening is a narrow
 * collar that stands only slightly proud of the head, the mass sits BEHIND and
 * ABOVE the skull, and the front edges drop down close to the cheeks.
 */

/** Obi-Wan: heavy Jedi cowl, its mouth standing just proud of the brow. */
export function obiwanHood(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const OUT = C.reddishBrown, IN = C.darkBrown;

  // outer cowl, flaring onto the shoulders, and its dark lining
  g.add(twoSided(shell({ r: 1.00, rTop: 0.60, y0: -0.58, y1: 1.16, from: 1.00, to: TWO_PI - 1.00, seg: 30 }), OUT));
  g.add(twoSided(shell({ r: 0.90, rTop: 0.575, y0: -0.52, y1: 1.10, from: 1.10, to: TWO_PI - 1.10, seg: 26 }), IN));

  const bb = builder();
  // crown of the hood: tall and pushed back off the forehead, so it reads as a
  // cowl with cloth bunched behind the head rather than a flat-brimmed hat
  bb.sphere(0, 0.80, -0.20, 0.68, { dome: true, sy: 0.98, seg: 24, rings: 9, color: OUT });
  bb.sphere(0, 0.56, -0.44, 0.56, { dome: true, sy: 1.05, seg: 20, rings: 8, color: OUT });
  // mouth of the hood: a collar barely wider than the head, tipped forward so it
  // overhangs the brow and drops the face into shadow
  bb.custom(shell({ r: 0.66, rTop: 0.70, y0: 0.99, y1: 1.26, from: faceTheta(150), to: faceTheta(362) }),
    { color: OUT });
  bb.custom(shell({ r: 0.645, rTop: 0.665, y0: 0.93, y1: 1.14, from: faceTheta(158), to: faceTheta(354) }),
    { color: IN });
  // front edges of the cowl falling past the cheeks
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.80, rTop: 0.685, y0: -0.30, y1: 1.02, from: faceTheta(132), to: faceTheta(186) }),
      { color: OUT });
    b.custom(shell({ r: 0.755, rTop: 0.66, y0: -0.24, y1: 0.98, from: faceTheta(140), to: faceTheta(184) }),
      { color: IN });
  });
  g.add(bb.build());
  makeCloth(g);
  return g;
}

/** Jawa: tall soft-pointed hood, nothing inside it but the eyes. */
export function jawaHood(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  // reddishBrown rather than darkBrown: the hood faces up and away from the key
  // light, and in darkBrown the whole thing read as a black bucket
  const OUT = C.reddishBrown, IN = C.trueBlack;

  // The cowl comes further round the face than Obi-Wan's (0.80 rather than 0.96)
  // so it can do the framing itself: separate front flaps sat outside the cone's
  // profile and stuck out as two pale blades either side of the head.
  g.add(twoSided(shell({ r: 1.00, rTop: 0.34, y0: -0.62, y1: 1.34, from: 0.80, to: TWO_PI - 0.80, seg: 28 }), OUT));
  g.add(twoSided(shell({ r: 0.89, rTop: 0.31, y0: -0.56, y1: 1.28, from: 0.90, to: TWO_PI - 0.90, seg: 24 }), IN));

  const bb = builder();
  // soft peak leaning back off the crown
  bb.sphere(0, 1.06, -0.12, 0.34, { dome: true, sy: 1.55, seg: 16, rings: 8, color: OUT });
  // hood mouth: tight to the head so only the glow gets out
  bb.custom(shell({ r: 0.66, rTop: 0.74, y0: 0.86, y1: 1.20, from: faceTheta(142), to: faceTheta(370) }),
    { color: OUT });
  bb.custom(shell({ r: 0.645, rTop: 0.70, y0: 0.80, y1: 1.08, from: faceTheta(150), to: faceTheta(362) }),
    { color: IN });
  g.add(bb.build());
  makeCloth(g);
  return g;
}

// ---------------------------------------------------------------------------
// HELMETS
// ---------------------------------------------------------------------------

/**
 * Stormtrooper helmet: dome, raised brow, black lens cowls, the frown vent and
 * the grey ear cups. Sits on a white head printed with FACE_TROOPER, and every
 * piece is aligned to that print's pixel coordinates.
 */
export function trooperHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const W = C.white, BK = C.trueBlack, LG = C.lightBluishGray, DG = C.darkBluishGray;

  // --- dome ---------------------------------------------------------------
  bb.sphere(0, 0.90, 0, 0.625, { dome: true, sy: 0.90, seg: 26, rings: 10, color: W });
  bb.custom(shell({ r: 0.625, y0: 0.30, y1: 0.94, from: 1.02, to: TWO_PI - 1.02 }), { color: W });
  // flared neck skirt
  bb.custom(shell({ r: 0.74, rTop: 0.625, y0: 0.02, y1: 0.32, from: 0.86, to: TWO_PI - 0.86 }), { color: W });
  bb.custom(shell({ r: 0.755, rTop: 0.74, y0: 0.02, y1: 0.10, from: 0.86, to: TWO_PI - 0.86 }), { color: DG });

  // --- raised brow, hugging the curve of the head ------------------------
  bb.custom(shell({ r: 0.655, rTop: 0.645, y0: faceY(64), y1: faceY(30), from: faceTheta(184), to: faceTheta(328) }),
    { color: W });
  bb.custom(shell({ r: 0.66, y0: faceY(40), y1: faceY(30), from: faceTheta(184), to: faceTheta(328) }),
    { color: DG });

  // --- eye lens cowls ----------------------------------------------------
  for (const [x0, x1] of [[194, 250], [262, 318]]) {
    bb.custom(shell({ r: 0.635, y0: faceY(120), y1: faceY(62), from: faceTheta(x0), to: faceTheta(x1) }),
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
  bb.custom(shell({ r: 0.64, rTop: 0.628, y0: faceY(226), y1: faceY(198), from: faceTheta(216), to: faceTheta(296) }),
    { color: W });

  // --- ear cups ----------------------------------------------------------
  bb.mirrorX((b) => {
    b.brick(-0.615, faceY(150), 0, 0.10, 0.46, { h: faceY(74) - faceY(150), color: LG, studs: false });
    b.brick(-0.665, faceY(104), 0, 0.03, 0.16, { h: 0.10, color: DG, studs: false });
    b.brick(-0.665, faceY(140), 0, 0.03, 0.16, { h: 0.10, color: DG, studs: false });
  });

  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.22, clearcoatRoughness: 0.35, env: 0.45 });
  return g;
}

/**
 * Rebel fleet trooper: the short open-crowned combat helmet. Earlier passes made
 * this too tall and too warm and it read as a brass bucket, so the drum barely
 * clears the head now and the trim is dark brown leather rather than tan.
 */
export function rebelHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const SH = C.darkTan, RIM = C.darkBrown;

  // open-topped drum: from above you look straight into it
  g.add(twoSided(shell({ r: 0.705, rTop: 0.675, y0: 0.80, y1: 1.24, seg: 26 }), SH));
  g.add(twoSided(ring(0.615, 0.675, 1.24, 26), RIM));

  const bb = builder();
  // inner crown so the open top never shows daylight through the head
  bb.sphere(0, 1.00, 0, 0.60, { dome: true, sy: 0.32, seg: 20, rings: 6, color: C.darkBrown });
  // padded leather rim at the brow
  bb.custom(shell({ r: 0.755, rTop: 0.725, y0: 0.78, y1: 0.90, seg: 26 }), { color: RIM });
  // front badge
  bb.custom(shell({ r: 0.716, y0: 0.98, y1: 1.16, from: faceTheta(238), to: faceTheta(274) }), { color: C.darkGray });
  // cheek guards, hugging the head
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.655, rTop: 0.675, y0: 0.38, y1: 0.86, from: faceTheta(144), to: faceTheta(190) }),
      { color: SH });
    b.custom(shell({ r: 0.665, y0: 0.38, y1: 0.46, from: faceTheta(144), to: faceTheta(190) }), { color: RIM });
  });
  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.04, clearcoatRoughness: 0.8, env: 0.22, roughness: 0.86 });
  return g;
}

/** Imperial officer's flat cap. */
export function officerCap(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const CAP = C.black, BAND = C.trueBlack;

  bb.cyl(0, 1.00, 0, 0.655, 0.18, { seg: 24, color: BAND, stud: false });
  bb.custom(shell({ r: 0.655, rTop: 0.745, y0: 1.18, y1: 1.40, seg: 24 }), { color: CAP });
  bb.cyl(0, 1.38, 0, 0.748, 0.06, { seg: 24, color: CAP, stud: false });
  bb.cyl(0, 1.40, 0, 0.70, 0.04, { seg: 24, color: C.darkGray, stud: false });
  // peak, drooping over the brow
  bb.custom(boxGeo(0.92, 0.05, 0.48, 0.02), { x: 0, y: 0.99, z: 0.76, rx: -0.30, color: BAND });
  // rank disc on the band
  bb.cyl(0, 1.06, 0.60, 0.075, 0.05,
    { seg: 10, axis: 'z', color: C.flatSilver, finish: FINISH.METAL, stud: false });
  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.1, clearcoatRoughness: 0.6, env: 0.35 });
  return g;
}

/**
 * Rebel pilot helmet: white shell, squadron markings, visor flipped up.
 * Also worn by Luke in his X-wing.
 */
export function pilotHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  const W = C.white, OR = C.orange, DG = C.darkBluishGray, BK = C.trueBlack;

  // shell
  bb.sphere(0, 0.86, 0, 0.665, { dome: true, sy: 0.98, seg: 26, rings: 10, color: W });
  bb.custom(shell({ r: 0.70, rTop: 0.665, y0: 0.16, y1: 0.90, from: 0.98, to: TWO_PI - 0.98 }), { color: W });
  bb.custom(shell({ r: 0.715, rTop: 0.70, y0: 0.16, y1: 0.26, from: 0.94, to: TWO_PI - 0.94 }), { color: DG });
  // brow band
  bb.custom(shell({ r: 0.692, rTop: 0.684, y0: 0.84, y1: 0.96, from: faceTheta(168), to: faceTheta(344) }),
    { color: DG });

  // markings: orange blocks on the sides, stripes over the crown
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.673, y0: 0.56, y1: 0.82, from: faceTheta(118), to: faceTheta(194) }), { color: OR });
    b.custom(shell({ r: 0.674, y0: 0.42, y1: 0.52, from: faceTheta(128), to: faceTheta(184) }), { color: DG });
  });
  // stripe over the crown, front and back
  const HALF = Math.PI / 2;
  bb.custom(sphereSeg({ r: 0.672, phiFrom: HALF - 0.12, phiTo: HALF + 0.12, thetaTo: 1.2, sy: 0.98, y: 0.86 }),
    { color: OR });
  bb.custom(sphereSeg({ r: 0.672, phiFrom: -HALF - 0.12, phiTo: -HALF + 0.12, thetaTo: 1.2, sy: 0.98, y: 0.86 }),
    { color: OR });
  bb.custom(sphereSeg({ r: 0.674, phiFrom: HALF - 0.30, phiTo: HALF - 0.18, thetaTo: 1.1, sy: 0.98, y: 0.86 }),
    { color: DG });
  bb.custom(sphereSeg({ r: 0.674, phiFrom: HALF + 0.18, phiTo: HALF + 0.30, thetaTo: 1.1, sy: 0.98, y: 0.86 }),
    { color: DG });

  // visor, hinged up onto the forehead
  const visor = new THREE.Group();
  visor.position.set(0, 0.92, 0);
  visor.rotation.x = -0.66;
  const vb = builder();
  vb.custom(shell({ r: 0.72, rTop: 0.70, y0: 0.02, y1: 0.32, from: faceTheta(170), to: faceTheta(342) }),
    { color: BK });
  vb.custom(shell({ r: 0.735, y0: 0.28, y1: 0.34, from: faceTheta(170), to: faceTheta(342) }), { color: DG });
  visor.add(vb.build());
  g.add(visor);

  // chin cups
  bb.mirrorX((b) => {
    b.custom(shell({ r: 0.66, rTop: 0.69, y0: faceY(158), y1: faceY(60), from: faceTheta(146), to: faceTheta(196) }),
      { color: W });
  });

  g.add(bb.build());
  softenGloss(g, { clearcoat: 0.2, clearcoatRoughness: 0.38, env: 0.45 });
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

  // dome, sitting flush on the head
  bb.sphere(0, 0.98, 0, 0.605, { dome: true, sy: 0.78, seg: 24, rings: 9, color: GOLD, finish: FINISH.METAL });
  // plate seam where the dome meets the face. In copper and 0.08 tall it read as a
  // headband, so it is gold with only a hairline of shadow under it.
  bb.custom(shell({ r: 0.607, y0: 0.94, y1: 1.02 }), { color: GOLD, finish: FINISH.METAL });
  bb.custom(shell({ r: 0.609, y0: 0.925, y1: 0.945 }), { color: C.copper, finish: FINISH.METAL });
  // low crest along the crown
  bb.sphere(0, 1.30, -0.02, 0.30, { dome: true, sy: 0.5, sx: 0.35, seg: 12, rings: 6, color: GOLD, finish: FINISH.METAL });

  // photoreceptors, on the print's eye centres
  const ey = faceY(106);
  for (const px of [220, 292]) {
    const x = faceX(px), z = faceZ(px);
    bb.cyl(x, ey, z + 0.055, 0.155, 0.11, { axis: 'z', seg: 12, color: GOLD, finish: FINISH.METAL, stud: false });
    bb.cyl(x, ey, z + 0.10, 0.115, 0.05, { axis: 'z', seg: 12, color: DK, stud: false });
    bb.cyl(x, ey, z + 0.125, 0.085, 0.04, { axis: 'z', seg: 12, color: C.brightLightYellow, finish: FINISH.GLOW, stud: false });
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
    b.custom(shell({ r: 0.615, rTop: 0.635, y0: faceY(150), y1: faceY(96), from: faceTheta(140), to: faceTheta(180) }),
      { color: GOLD, finish: FINISH.METAL });
  });
  bb.cyl(0, -0.10, 0, 0.35, 0.08, { seg: 14, color: C.copper, finish: FINISH.METAL, stud: false });
  bb.cyl(0, -0.02, 0, 0.33, 0.06, { seg: 14, color: GOLD, finish: FINISH.METAL, stud: false });

  g.add(bb.build());
  return g;
}
