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

/**
 * Upper half of a squashed sphere with a round hole at the pole -- an open-crowned
 * helmet. `hole` is the polar half-angle left open; the returned dome runs from
 * that boundary down to its equator at `y`.
 */
function openDome({ r, y, sy = 1, hole, seg = 28, rings = 10 }) {
  const g = new THREE.SphereGeometry(r, seg, rings, 0, TWO_PI, hole, Math.PI / 2 - hole);
  if (sy !== 1) g.scale(1, sy, 1);
  g.translate(0, y, 0);
  return g;
}

/**
 * Flat ring lying in the XZ plane -- helmet rims, droid collars, the lip of a
 * hood. `from`/`to` are the same angles-from-the-face that shell() takes; the
 * -PI/2 turns RingGeometry's from-+X convention into that.
 */
function ring(rIn, rOut, y, seg = 24, from = 0, to = TWO_PI) {
  const span = to - from;
  const s = Math.max(3, Math.round(seg * span / TWO_PI));
  const g = new THREE.RingGeometry(rIn, rOut, s, 1, from - Math.PI / 2, span);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/**
 * Band round the head whose edges FOLLOW A CURVE.
 *
 * shell() and ring() both have level edges, which is right for a helmet rim and
 * wrong for a hairline: one level edge across the brow reads as a swim cap, and
 * the obvious fix -- a staircase of short shells at stepped heights -- renders
 * as literal stairs, blocky enough to look like a bug. This lays down a single
 * strip of quads instead and lets `y0`, `y1`, `r` and `rTop` each be either a
 * number or a function of the angle from the face, so a hairline can sit high
 * over the brow and sweep down over the ears in one smooth run.
 */
function curtain({ r, rTop, y0, y1, from, to, seg = 34 }) {
  const fn = (v) => (typeof v === 'function' ? v : () => v);
  const R0 = fn(r), R1 = fn(rTop === undefined ? r : rTop), Y0 = fn(y0), Y1 = fn(y1);
  const n = Math.max(4, Math.round(seg * Math.abs(to - from) / TWO_PI));
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (to - from) * (i / n);
    const s = Math.sin(a), c = Math.cos(a);
    const rb = R0(a), rt = R1(a);
    pos.push(rb * s, Y0(a), rb * c, rt * s, Y1(a), rt * c);
  }
  for (let i = 0; i < n; i++) {
    const b = i * 2;
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Edge profile for curtain(): level at `flat` across the middle, then easing away
 * to `edge` by the time it reaches `span`, and level again beyond it.
 *
 * `hold` is the fraction of the span that stays flat, and it is there because a
 * hairline has to clear the eyebrows right across the face window before it
 * starts to drop. The smoothstep is there because the ends have to be FLAT: a
 * plain power curve still has slope where it meets the span, and on the rebel
 * helmet that kink showed up in the silhouette as a spike hanging off the jaw.
 */
function sweep(flat, edge, span, hold = 0.45, back = null) {
  const S = (u) => u * u * (3 - 2 * u);
  return (a) => {
    const x = Math.abs(a);
    if (x <= span) {
      const t = x / span;
      const u = t <= hold ? 0 : (t - hold) / (1 - hold);
      return flat - (flat - edge) * S(u);
    }
    // `back` lets the edge rise again behind the ears, which is what a hairline
    // does at the nape; without it the profile is level all round the back and
    // shows as one long horizontal cut across the side of the head.
    if (back === null) return edge;
    return edge + (back - edge) * S(Math.min(1, (x - span) / (Math.PI - span)));
  };
}

/**
 * Ellipsoid with a round hole punched through it facing +Z -- a hood.
 *
 * Everything else in this file builds coverage out of level-edged shells, and
 * for a hood that is exactly wrong: any shell that stops in front of the face
 * leaves a horizontal edge across the forehead, which is a hat brim. Here the
 * opening is a polar cap of SphereGeometry rotated to point at the face, so its
 * edge is a closed curve that runs above the brow, falls away diagonally past
 * the temples and closes under the chin. There is no level edge anywhere.
 *
 * `opening` is the half-angle of the hole and `tilt` swings its axis downward,
 * which is what brings the top of the hole down over the brow while leaving the
 * cheeks clear.
 */
function cowl({ r, opening, tilt = 0, y = 0, z = 0, sy = 1, sz = 1, seg = 28, rings = 16 }) {
  const g = new THREE.SphereGeometry(r, seg, rings, 0, TWO_PI, opening, Math.PI - opening);
  g.rotateX(Math.PI / 2);       // +Y pole (the hole) now points at the face
  if (tilt) g.rotateX(tilt);    // and swings down
  if (sy !== 1 || sz !== 1) g.scale(1, sy, sz);
  g.translate(0, y, z);
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
  // Black ABS wants to look wet, but the mask's cheek flares are smooth-normalled
  // shells: at clearcoat 0.3 the one facing the key light clipped to near-white and
  // Vader grew a grey slab down one side of his face.
  softenGloss(g, { clearcoat: 0.10, clearcoatRoughness: 0.55, env: 0.28, roughness: 0.72 });
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
  softenGloss(g, { clearcoat: 0.10, clearcoatRoughness: 0.55, env: 0.28, roughness: 0.72 });
  return g;
}

// ---------------------------------------------------------------------------
// HAIR
// ---------------------------------------------------------------------------

/**
 * Hair finish.
 *
 * A hairpiece is built from cylindrical shells hugging the head, so a lot of it
 * sits at a grazing angle to the camera -- and at grazing angles Fresnel drives
 * a clearcoat's environment reflection to full, so the shell stops showing its
 * own colour and mirrors the studio backdrop instead. Leia's temple sweeps came
 * back as flat light-grey panels lying across her cheeks for exactly that
 * reason; picking the pixel gave vertex colour 0x694028 under a mirror-bright
 * result. Both sides going grey at once is the tell, since a key-light highlight
 * would favour one. So hair keeps almost no clearcoat and very little env.
 *
 * Raising env is not a way to rescue the shadow side of a bun, either: 0.24 to
 * 0.36 was indistinguishable in the lab, because the env map is dark to the
 * sides. What the shadow side needs is less surface pointing away from the key,
 * which is a geometry question.
 */
function hairFinish(g) {
  return softenGloss(g, { clearcoat: 0.03, clearcoatRoughness: 0.9, env: 0.24, roughness: 0.82 });
}

/** Leia: swept-back hair, side buns, white hood of the gown thrown back. */
export function leiaHair(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  const bb = builder();
  // In darkBrown (0x352100) the whole piece rendered as a black bathing cap, so
  // the hair is reddishBrown -- still a dark brown, but it reads as hair.
  const H = C.reddishBrown;

  /*
   * Crown. A dome alone narrows faster than the head cylinder does -- the head
   * is a 24-gon with a FLAT cap at y 1.2 -- so it needs a band under it or the
   * head's own rim shows as a yellow crescent. The dome's equator sits at 1.08
   * so that it is still 0.659 wide at y 1.10, which swallows the top edge of
   * everything below it.
   */
  bb.sphere(0, 1.08, -0.01, 0.66, { dome: true, sy: 0.50, seg: 26, rings: 8, color: H });

  /*
   * Hairline: swept back off the forehead, then down over the ears in one run.
   * The height at the middle is set off the print -- FACE_LEIA's brows run from
   * px 204 to 308, which is the face window out to +/-37 degrees, and they sit at
   * y 0.853, so the hair has to stay above ~0.88 everywhere inside that window.
   * sweep(0.96, 0.34, 1.35) holds 0.915 at the edge of it and only then falls
   * away. The previous pass built the same shape out of seven stepped shells and
   * the steps were plainly visible as blocks.
   */
  bb.custom(curtain({
    r: 0.654, rTop: 0.646, y1: 1.10, y0: sweep(0.96, 0.34, 1.35, 0.45, 0.50),
    from: -Math.PI, to: Math.PI, seg: 40,
  }), { color: H });

  /*
   * The buns, and the one thing that matters about them: NOTHING CONCENTRIC on
   * the outer face. First pass was a disc at eye height with three rings on it,
   * second was a stepped beehive of decreasing radius, and both rendered as a
   * headphone driver -- the second one so exactly that it had a dust cap in the
   * middle. So each bun is one smooth flattened mass at TEMPLE height, sunk into
   * the hair behind it so there is no air gap and no free-floating rim.
   *
   * There is no second lobe on it either. A smaller sphere set forward of the
   * coil was meant to read as its tucked end and instead gave her a Mickey Mouse
   * ear; the flattening alone (sx 0.60) is enough to say coil rather than ball.
   *
   * How far it stands off the head is a lighting decision as much as a shape
   * one. At x -0.560 the outer half of the bun was a broad wall of normals
   * pointing straight down the +/-X axis, and the bun on the away side of the
   * key light came back near black -- a plastic ball, not hair. Sunk to -0.515
   * the visible surface is mostly the part curving round towards the front, so
   * it picks up the key from either side and still clears the head (radius
   * 0.375 * 0.60 = 0.225 of half-width, on a 0.375-wide head).
   */
  bb.mirrorX((b) => {
    b.sphere(-0.515, 0.78, -0.02, 0.360, { seg: 18, rings: 12, sx: 0.60, color: H });
  });
  g.add(bb.build());

  /*
   * White hood of the gown, thrown back. It stays clear of the hair at every
   * height rather than tapering in over the crown, which had it crossing the
   * temple shells; and its bottom lip is an arc, not a full annulus, or the cloth
   * closes into a ring round the front of her throat.
   */
  const hood = new THREE.Group();
  hood.add(twoSided(shell({ r: 0.92, rTop: 0.845, y0: -0.42, y1: 0.44, from: 2.10, to: TWO_PI - 2.10, seg: 26 }),
    C.white));
  hood.add(twoSided(ring(0.70, 0.92, -0.42, 24, 2.10, TWO_PI - 2.10), C.white));
  hairFinish(g);
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

  // Crown. Its equator is at 1.12 so it is still 0.633 wide at the head's flat
  // top at y 1.2; a lower, flatter dome leaves a yellow ring of scalp up there.
  bb.sphere(0, 1.12, -0.01, 0.655, { dome: true, sy: 0.48, seg: 24, rings: 8, color: H });

  /*
   * Fringe. One strip whose bottom edge is a swept curve plus a ripple, so the
   * hairline undulates the way a fringe does. The ripple is carried in the RADIUS
   * as well as the height and in antiphase to it, which means the locks that hang
   * lowest also stand furthest out, and each one lays a soft shadow on the next.
   *
   * This replaced six stepped shells. They were an attempt at the same idea and
   * the result was six flat-bottomed rectangles of hair, a stair-step so blocky
   * it read as a rendering fault rather than as hair.
   *
   * Amplitude is bounded by the brows: FACE_LUKE has them at y 0.844 and running
   * out to px 203, which is 37 degrees round, so the curve is set to hold 0.901
   * there and 0.040 of ripple keeps the troughs at 0.861.
   */
  const line = sweep(0.96, 0.42, 1.30, 0.45, 0.58);
  // The ripple frequency is an INTEGER number of cycles per turn. At 7.5 the
  // curve did not close: sin was at +1 on one side of the seam behind his head
  // and -1 on the other, which left a 0.08-stud notch cut into the nape.
  const ripple = (a) => Math.sin(a * 8);
  bb.custom(curtain({
    r: (a) => 0.654 - 0.014 * ripple(a),
    rTop: 0.646,
    y1: 1.14,
    y0: (a) => line(a) + 0.040 * ripple(a),
    from: -Math.PI,
    to: Math.PI,
    seg: 48,
  }), { color: H });
  // cowlick, off-centre and toward the back
  bb.sphere(0.07, 1.36, -0.15, 0.22, { seg: 12, rings: 8, sy: 0.66, sz: 1.1, color: H });
  g.add(bb.build());
  hairFinish(g);
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

/** Obi-Wan: heavy Jedi cowl, one shell with the face-hole punched through it. */
export function obiwanHood(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  /*
   * Colour first, because it caused more trouble than the shape. In reddishBrown
   * (0x694028) over a darkBrown lining, every surface of this hood faces away
   * from the key light and the whole piece rendered essentially black -- so the
   * bright yellow face sat in a black surround and the thing read as a wizard
   * with long dark hair. Medium brown outside, reddishBrown inside: the lining
   * is then still clearly in shadow without going to a void.
   */
  const OUT = C.brown, IN = C.reddishBrown;

  /*
   * The whole hood is ONE cowl() shell. Three earlier passes built it as a crown
   * dome plus a front "mouth" shell, and every one of them read as headwear
   * rather than cloth: whichever of the two was widest across the front left a
   * level edge over the eyebrows, which is a hard hat, and the tall side walls
   * either side of the face read as two lengths of hair.
   *
   * The numbers are set off the face print. opening 0.77 rad with the axis tilted
   * 0.36 rad down puts the top of the hole at y 0.94, z 0.81 -- 0.10 above the
   * brow line at 0.834 and standing 0.2 proud of the head, so it overhangs the
   * forehead without cutting the eyebrows, which are most of what makes this face
   * read as old. The same edge passes the temples at y 0.32, level with the
   * mouth, and closes below the chin inside the torso.
   *
   * Stretching y and z well past x is what stops it reading as a crash helmet. A
   * sphere of even radius is a hard shape, and the first pass at this (sy = sz =
   * 1.10) came back looking moulded; tall and deep, with the extra length hung
   * off the BACK of the head -- centre z -0.16, so the shell reaches z -1.2
   * behind a 0.6 head -- gives the drape a hood has and a helmet does not.
   *
   * sy also has to keep the shell off the TOP RIM of the head. The head is a
   * 24-gon of radius 0.6 with a flat cap at y 1.2, and at sy 1.12 the shell
   * passed within a percent of that rim between 45 and 75 degrees round: two
   * yellow slivers of scalp showed through the crown, one per side.
   */
  const HOOD = { r: 0.86, opening: 0.77, tilt: 0.36, y: 0.56, z: -0.16, sy: 1.24, sz: 1.22 };
  g.add(twoSided(cowl({ ...HOOD, seg: 30, rings: 18 }), OUT));
  // Lining, set 0.06 in all round so the rim reads as thick cloth rather than as
  // the knife edge a single surface gives you.
  g.add(twoSided(cowl({ ...HOOD, r: 0.80, seg: 26, rings: 14 }), IN));

  const bb = builder();
  /*
   * Robe collar gathering onto the shoulders. Its top edge IS level, at y 0.30,
   * but the hood is far wider there, so the edge is swallowed and the collar only
   * emerges low down beside the neck. That is the whole difference between a robe
   * collar and the hair curtains this replaced: where the vertical front edge
   * sits. Beside the jaw it is hair; beside the collarbone it is cloth.
   *
   * It starts 1.45 rad round -- nearly at the ear -- because at 1.16 the edge
   * stood 0.2 studs FORWARD of the hood shell beside it and showed as a thin
   * brown thread hanging past his cheek.
   */
  bb.custom(shell({ r: 1.06, rTop: 0.72, y0: -0.62, y1: 0.30, from: 1.45, to: TWO_PI - 1.45, seg: 28 }),
    { color: OUT });
  bb.custom(shell({ r: 0.96, rTop: 0.68, y0: -0.58, y1: 0.26, from: 1.56, to: TWO_PI - 1.56, seg: 24 }),
    { color: IN });
  g.add(bb.build());
  /*
   * Not makeCloth. At env 0.22 the parts of the cowl that face sideways get
   * almost no key light and crush to near-black, so the two edges either side of
   * his face separated from the lit crown and read as lengths of hair rather
   * than as the same piece of cloth. There is still no clearcoat -- the extra
   * env goes into the diffuse ambient, which lifts the grazing faces without
   * putting a highlight anywhere.
   */
  softenGloss(g, { clearcoat: 0, clearcoatRoughness: 1, env: 0.62, roughness: 0.88 });
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
  // profile and stuck out as two pale blades either side of the head. It stops at
  // the crown, where the dome below takes over.
  g.add(twoSided(shell({ r: 1.02, rTop: 0.70, y0: -0.62, y1: 1.00, from: 0.80, to: TWO_PI - 0.80, seg: 28 }), OUT));
  g.add(twoSided(shell({ r: 0.90, rTop: 0.66, y0: -0.56, y1: 0.96, from: 0.90, to: TWO_PI - 0.90, seg: 24 }), IN));

  const bb = builder();
  // Hood mouth. It has to NARROW going up: flared 0.66 -> 0.74 it rendered as a
  // brim and the whole figure came back looking like it was wearing a sombrero.
  bb.custom(shell({ r: 0.74, rTop: 0.68, y0: 0.76, y1: 1.10, from: faceTheta(142), to: faceTheta(370) }),
    { color: OUT });
  bb.custom(shell({ r: 0.70, rTop: 0.645, y0: 0.72, y1: 1.04, from: faceTheta(150), to: faceTheta(362) }),
    { color: IN });
  // Crown: one prolate dome rather than a dome plus a nub, which read as a ball
  // balanced on top of the hood.
  bb.sphere(0, 1.02, -0.02, 0.70, { dome: true, sy: 1.15, seg: 24, rings: 10, color: OUT });
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
 * Rebel fleet trooper: the tall open-crowned combat helmet.
 *
 * The shape is the whole job here, and the failure modes are specific:
 *  - a straight-sided drum with a level lower edge is a flowerpot, and a flat
 *    open crown on top of it turns the lid into a saucepan;
 *  - anything that widens all the way up + a contrast band at the brow is a
 *    bellhop's fez;
 *  - a dark plate on the front reads at any distance as a hole in the helmet.
 *
 * So the wall carries a real helmet section -- 0.712 at the brow, bulging to
 * 0.736, then turning in hard to 0.56 at the crown lip -- and the lower edge is
 * a single swept curve that sits above the brow and falls to below the ears,
 * which does the work the separate slab-sided ear flaps used to do badly.
 */
export function rebelHelmet(fig) {
  if (fig) fig.topStud.visible = false;
  const g = new THREE.Group();
  // The trim is C.brown, not C.darkBrown. darkBrown is 0x352100 and renders as
  // pure black, so a band of it landed across the brow print as a hard black bar
  // -- the figure looked like he was wearing a blindfold under the helmet.
  const SH = C.darkTan, RIM = C.brown, DK = C.darkBrown;
  // Lower edge of the shell. sweep() flattens out past its span, so one call
  // gives the brow curve at the front AND a level nape line round the back.
  const edge = sweep(0.845, 0.40, 1.50, 0.30, 0.30);

  const bb = builder();
  bb.custom(curtain({ r: 0.700, rTop: 0.718, y0: edge, y1: 1.14, from: -Math.PI, to: Math.PI, seg: 34 }),
    { color: SH });
  // Rolled leather rim, following that same curve rather than cutting across it.
  bb.custom(curtain({
    r: 0.7055, rTop: 0.7045, y0: edge, y1: (a) => edge(a) + 0.065, from: -Math.PI, to: Math.PI, seg: 34,
  }), { color: RIM });
  /*
   * Crown: a squashed dome with a 0.35-radius hole at the top. Built out of two
   * cones instead -- 0.736 to 0.690 to 0.560 -- it left a 1.1-stud-wide flat disc
   * up there, and from any camera below 15 degrees of elevation that disc is the
   * silhouette: the helmet read as a kepi. Rounding the section and shrinking the
   * hole to half its old radius is what makes it a helmet.
   */
  bb.custom(openDome({ r: 0.718, y: 1.14, sy: 0.46, hole: 0.50, seg: 28, rings: 10 }), { color: SH });
  // The hole itself: an annular lip, and a dark liner filling the crown behind
  // it. The liner has to be as wide as the HEAD (0.598), not as wide as the hole:
  // a narrow plug left the head's flat yellow top exposed in the annulus around
  // it, and from above you could see scalp through the opening.
  bb.custom(ring(0.296, 0.352, 1.437, 24), { color: DK });
  bb.sphere(0, 1.19, 0, 0.598, { dome: true, sy: 0.40, seg: 22, rings: 8, color: DK });
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

  /*
   * Dome. Its equator has to sit at the TOP of the head, not part way down it.
   * Sunk to y 0.94 -- which is where it was, to keep the seam near the brow -- a
   * dome of radius 0.605 is narrower than the 0.6 head from y 1.01 upward, so the
   * head's own cylinder pushed back out through it: what rendered was a thin gold
   * band from 0.94 to 1.01, bare scalp above that, and the dome's cap emerging
   * again over the top. Three stacked bands, and the whole thing read as a cap
   * with a brim. At 1.14/0.62/0.70 the dome stays wider than the head all the way
   * to its flat top and there is one seam, a 0.02 lip at the crown.
   */
  bb.sphere(0, 1.14, 0, 0.62, { dome: true, sy: 0.70, seg: 24, rings: 10, color: GOLD, finish: FINISH.METAL });

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
  /*
   * Ears. Built as a curved shell hugging the head at 0.615 they had no visible
   * thickness, so each one rendered as a flat rectangle of slightly-off gold on
   * the side of his head -- a sticker, not a part. As a slab that overlaps the
   * head by 0.035 and stands 0.065 proud, the near edge catches the light and it
   * reads as the audio plate it is.
   */
  bb.mirrorX((b) => {
    b.brick(-0.615, faceY(152), 0.01, 0.10, 0.26, {
      h: faceY(96) - faceY(152), color: GOLD, finish: FINISH.METAL, studs: false,
    });
  });
  // Neck joint. In copper it came back #6c3219 in the shadow under his chin and
  // read as a ring of rust; dark grey reads as the machined joint it is.
  bb.cyl(0, -0.10, 0, 0.35, 0.08, { seg: 14, color: C.darkBluishGray, finish: FINISH.METAL, stud: false });
  bb.cyl(0, -0.02, 0, 0.33, 0.06, { seg: 14, color: GOLD, finish: FINISH.METAL, stud: false });

  g.add(bb.build());
  return g;
}
