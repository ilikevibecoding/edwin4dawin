/**
 * The cast.
 *
 * Every figure is the minifig rig from ../lego/minifig.js wearing a costume of
 * bricks, and every printed detail — faces, helmet markings, torso prints,
 * insignia, droid panels — is an SVG string rasterised through svgTexture().
 * No binary art assets, no Math.random().
 *
 * Print geometry (so new art lines up without guesswork):
 *
 *   head / helmet wraps   viewBox 512 x 128, u wraps the whole cylinder.
 *                         x = 256 is dead front, x = 128 the figure's right ear,
 *                         x = 384 its left ear, x = 0/512 the back seam.
 *                         y = 0 is the top of the barrel, y = 128 the chin.
 *                         Face landmarks: brow 32, eyes 50, nose 66, mouth 84.
 *   torso prints          viewBox 152 x 128 clipped to the torso trapezoid,
 *                         79 px per world unit, neck at the top, belt near 108.
 *                         x = 0 is the figure's own right, front and back alike,
 *                         so a shoulder flash keeps the same x on both prints.
 *                         (A back print therefore looks mirrored in a back
 *                         render, exactly as a real back does.)
 *   hips prints           viewBox 160 x 56.
 *
 * Characters expose the rig on `userData.parts`, anything held on
 * `userData.props`, and the character name on `userData.char`.
 */
import * as THREE from 'three';
import {
  tile, slope, cyl, cone, sphere, panel,
  at, rot, group, mat, norm,
  C,
} from '../lego/bricks.js';
import { svgTexture, svg } from '../lego/svgtex.js';
import {
  minifig, pose, walk, run, idle, aimBlaster, fall, sit, attachToHand, capeSim,
  arcShell, slab, assemble, paint, texMat, frontPanel, markNoBake, MINIFIG,
} from '../lego/minifig.js';

/* ------------------------------------------------------------------ */
/* palette + svg plumbing                                              */
/* ------------------------------------------------------------------ */

/** Colours the brick palette does not carry. */
const X = {
  cream: 0xece0c0,        // farm boy tunic
  sandHair: 0x9c6a34,     // farm boy hair: dark enough to read against a yellow head
  brownHair: 0x4a2a15,
  pearlGold: 0xd7a63f,    // protocol droid
  pearlSilver: 0xd3d7da,
  jawaBrown: 0x4e3220,
  helmetTan: 0xc9ae7c,
  smoke: 0x1d252c,
  grime: 0xd8d2c2,        // weathered trooper armour
  officer: 0x898f84,      // imperial olive-grey
  rebelTan: 0xd8c49a,
};

const hx = (c) => '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0');

/** Head / helmet wrap texture. viewBox 512 x 128, front centre at x = 256. */
function wrapTex(body) {
  return svgTexture(svg([0, 0, 512, 128], body, { w: 1024, h: 256 }), { w: 1024, h: 256 });
}
/** angle from dead front in degrees (+ = toward the figure's left) -> wrap x */
const wx = (d) => 256 + d * (512 / 360);

/** Torso print, clipped to the torso trapezoid. */
const TORSO_POLY = '19,128 133,128 144,73 151,33 142,13 104,2 48,2 10,13 1,33 8,73';
function torsoTex(body) {
  const s = svg([0, 0, 152, 128],
    `<defs><clipPath id="t"><polygon points="${TORSO_POLY}"/></clipPath></defs>`
    + `<g clip-path="url(#t)">${body}</g>`, { w: 608, h: 512 });
  return svgTexture(s, { w: 608, h: 512 });
}

/**
 * Back print, same trapezoid as torsoTex.
 *
 * A +Z-facing decal shows its u = 0 edge at -X, which would put the drawing's
 * left on the figure's left — the opposite of the front convention. Mirroring
 * the body fixes that, so both prints are authored the same way: x = 0 is the
 * figure's own right. (The clip polygon is symmetric, so it survives the flip.)
 */
function backTex(body) {
  return torsoTex(`<g transform="translate(152,0) scale(-1,1)">${body}</g>`);
}

/** Hips / belt print. */
function hipsTex(body) {
  return svgTexture(svg([0, 0, 160, 56], body, { w: 640, h: 224 }), { w: 640, h: 224 });
}

/** Free-form square print for props and droid panels. */
function flatTex(body, o = {}) {
  const w = o.vw ?? 128;
  const h = o.vh ?? 128;
  return svgTexture(svg([0, 0, w, h], body, { w: o.w ?? 512, h: o.h ?? 512 }),
    { w: o.w ?? 512, h: o.h ?? 512 });
}

/**
 * Dome / hemisphere with the equator on y = 0 and the crown at y = h.
 *
 * SphereGeometry puts u = 0 at -X, which is a quarter turn away from
 * CylinderGeometry's u = 0 at +Z. Rotating the geometry lines the two up, so a
 * dome print uses exactly the same wrap convention as a head print: x = 256 of
 * a 512-wide viewBox is dead front, x = 128 the figure's right, x = 384 its
 * left. v runs crown -> equator.
 */
function domeMesh(r, h, color, seg = 20, map = null) {
  const g = norm(new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg / 2)),
    0, Math.PI * 2, 0, Math.PI / 2));
  g.rotateY(Math.PI / 2);
  g.scale(1, h / r, 1);
  const m = new THREE.Mesh(g, map ? texMat(map) : mat(color));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* face + helmet art                                                   */
/* ------------------------------------------------------------------ */

const bg = (c) => `<rect x="-2" y="-2" width="516" height="132" fill="${hx(c)}"/>`;

/**
 * Classic minifig face.
 * @param {object} [o] {skin, ink, brow, eyeR, mouth:'smile'|'open'|'grim'|'smirk',
 *                      lashes, beard, wrinkles, cheeks}
 */
function faceTex(o = {}) {
  const skin = o.skin ?? C.yellow;
  const ink = hx(o.ink ?? 0x141a1f);
  const brow = hx(o.brow ?? 0x4c3116);
  const er = o.eyeR ?? 13;
  const ex = o.eyeDx ?? 34;
  const L = 256 + ex;                       // figure's left eye
  const R = 256 - ex;
  let mouth;
  switch (o.mouth || 'smile') {
    case 'open':
      mouth = `<path d="M${256 - 20} 78 Q256 108 ${256 + 20} 78 Z" fill="${ink}"/>`
        + `<path d="M${256 - 20} 78 L${256 + 20} 78" stroke="${ink}" stroke-width="4"/>`;
      break;
    case 'grim':
      mouth = `<path d="M${256 - 26} 88 Q256 80 ${256 + 26} 88" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
      break;
    case 'smirk':
      mouth = `<path d="M${256 - 28} 88 Q256 98 ${256 + 30} 78" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round"/>`;
      break;
    case 'none':
      mouth = '';
      break;
    default:
      mouth = `<path d="M${256 - 29} 82 Q256 102 ${256 + 29} 82" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`;
  }
  return wrapTex([
    bg(skin),
    // soft shading toward the sides so the cylinder reads as a head
    `<rect x="0" y="0" width="90" height="128" fill="#000" opacity="0.1"/>`,
    `<rect x="422" y="0" width="90" height="128" fill="#000" opacity="0.1"/>`,
    o.cheeks ? `<circle cx="${R - 22}" cy="72" r="15" fill="#d0662c" opacity="0.22"/>`
      + `<circle cx="${L + 22}" cy="72" r="15" fill="#d0662c" opacity="0.22"/>` : '',
    `<circle cx="${R}" cy="50" r="${er}" fill="${ink}"/>`,
    `<circle cx="${L}" cy="50" r="${er}" fill="${ink}"/>`,
    `<circle cx="${R + 4}" cy="45" r="${er * 0.32}" fill="#ffffff" opacity="0.92"/>`,
    `<circle cx="${L + 4}" cy="45" r="${er * 0.32}" fill="#ffffff" opacity="0.92"/>`,
    o.brows === false ? '' : `<path d="M${R - 17} ${o.browY ?? 31} L${R + 15} ${(o.browY ?? 31) - 4}" stroke="${brow}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M${L + 17} ${o.browY ?? 31} L${L - 15} ${(o.browY ?? 31) - 4}" stroke="${brow}" stroke-width="7" stroke-linecap="round"/>`,
    o.wrinkles ? `<path d="M${R - 20} 62 q20 6 40 0" fill="none" stroke="#8a6a44" stroke-width="3" opacity="0.7"/>`
      + `<path d="M${L + 20} 62 q-20 6 -40 0" fill="none" stroke="#8a6a44" stroke-width="3" opacity="0.7"/>` : '',
    mouth,
    o.beard || '',
  ].join(''));
}

/** Stormtrooper helmet markings: lenses, brow band, frown vent, ear cups. */
function trooperHelmetTex(o = {}) {
  const shell = o.color ?? C.white;
  const ink = hx(0x11161b);
  const grey = hx(0x9aa0a4);
  const dirt = o.dirty
    ? `<g opacity="0.5" fill="${hx(0xa08a5e)}">`
      + `<path d="M150 96 q40 18 90 12 l0 22 -96 0 z"/>`
      + `<path d="M300 100 q40 6 70 -8 l6 30 -80 4 z"/>`
      + `<rect x="196" y="18" width="40" height="10" rx="4"/>`
      + `<path d="M60 40 q30 20 10 60 l-40 -6 z"/></g>`
    : '';
  return wrapTex([
    bg(shell),
    // side shading
    `<rect x="0" y="0" width="104" height="128" fill="#000" opacity="0.12"/>`,
    `<rect x="408" y="0" width="104" height="128" fill="#000" opacity="0.12"/>`,
    // brow band
    `<path d="M180 26 Q256 14 332 26 L332 40 Q256 29 180 40 Z" fill="${ink}"/>`,
    // eye lenses (inner corners lower, the classic angled read)
    `<path d="M188 44 L246 51 L242 78 L192 71 Z" fill="${ink}"/>`,
    `<path d="M324 44 L266 51 L270 78 L320 71 Z" fill="${ink}"/>`,
    `<path d="M192 47 L240 53 L239 58 L193 53 Z" fill="#5d666d" opacity="0.55"/>`,
    `<path d="M320 47 L272 53 L273 58 L319 53 Z" fill="#5d666d" opacity="0.55"/>`,
    // tears under the inner lens corners
    `<rect x="236" y="80" width="9" height="15" rx="2" fill="${ink}"/>`,
    `<rect x="267" y="80" width="9" height="15" rx="2" fill="${ink}"/>`,
    // nose bridge
    `<path d="M250 52 L262 52 L260 78 L252 78 Z" fill="${grey}" opacity="0.65"/>`,
    // frown vent
    `<path d="M226 96 L286 96 L281 116 L231 116 Z" fill="${ink}"/>`,
    `<g fill="${hx(shell)}" opacity="0.85">`
    + `<rect x="234" y="99" width="5" height="14"/><rect x="245" y="99" width="5" height="14"/>`
    + `<rect x="256" y="99" width="5" height="14"/><rect x="267" y="99" width="5" height="14"/>`
    + `</g>`,
    // cheek traps
    `<path d="M192 74 L184 104 L198 106 L204 78 Z" fill="${ink}"/>`,
    `<path d="M320 74 L328 104 L314 106 L308 78 Z" fill="${ink}"/>`,
    // ear cups at +-90 degrees
    `<circle cx="128" cy="60" r="21" fill="${grey}"/><circle cx="128" cy="60" r="12" fill="${ink}"/>`,
    `<circle cx="384" cy="60" r="21" fill="${grey}"/><circle cx="384" cy="60" r="12" fill="${ink}"/>`,
    // back seam + vents
    `<rect x="504" y="0" width="16" height="128" fill="${ink}" opacity="0.55"/>`,
    `<rect x="-8" y="0" width="16" height="128" fill="${ink}" opacity="0.55"/>`,
    `<g stroke="${ink}" stroke-width="3" opacity="0.4">`
    + `<path d="M56 34 L56 92"/><path d="M456 34 L456 92"/></g>`,
    // neck seal
    `<rect x="0" y="116" width="512" height="14" fill="${ink}"/>`,
    dirt,
  ].join(''));
}

/**
 * Vader's mask. He is black on black, so the printed grey edges are the only
 * thing carrying the face: they are deliberately bright and heavy.
 */
function vaderHelmetTex() {
  const base = 0x161c22;
  const edge = '#98a2a9';
  const soft = '#6a747c';
  return wrapTex([
    bg(base),
    `<rect x="0" y="0" width="118" height="128" fill="#000" opacity="0.4"/>`,
    `<rect x="394" y="0" width="118" height="128" fill="#000" opacity="0.4"/>`,
    // faceplate. The print carries the performance, so the shapes are built
    // from separated values rather than outlines: dark mask, mid-grey cheeks,
    // near-black lenses, bright grille.
    `<path d="M256 6 L322 18 L344 58 L334 104 L256 124 L178 104 L168 58 L190 18 Z"`
    + ` fill="#2b343c" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>`,
    // brow bar
    `<path d="M186 26 L256 15 L326 26 L322 46 L256 33 L190 46 Z" fill="#0a0e12"/>`,
    // triangular eye lenses, deep-set
    `<path d="M186 48 L252 56 L236 88 L192 74 Z" fill="#05080a" stroke="${edge}" stroke-width="3"/>`,
    `<path d="M326 48 L260 56 L276 88 L320 74 Z" fill="#05080a" stroke="${edge}" stroke-width="3"/>`,
    `<path d="M194 54 L246 61 L243 70 L197 61 Z" fill="#aeb8bf" opacity="0.5"/>`,
    `<path d="M318 54 L266 61 L269 70 L315 61 Z" fill="#aeb8bf" opacity="0.5"/>`,
    // nose ridge, catching the light
    `<path d="M256 24 L272 58 L266 90 L246 90 L240 58 Z" fill="#4a555e" stroke="${edge}" stroke-width="2"/>`,
    `<path d="M256 30 L263 58 L259 86 L253 86 L249 58 Z" fill="#6d7982"/>`,
    // mouth grille: the brightest thing on the mask
    `<path d="M224 90 L288 90 L281 116 L231 116 Z" fill="#05080a"/>`,
    `<g fill="#c9d2d8">`
    + `<rect x="232" y="93" width="6" height="20"/><rect x="243" y="93" width="6" height="20"/>`
    + `<rect x="254" y="93" width="6" height="20"/><rect x="265" y="93" width="6" height="20"/>`
    + `<rect x="276" y="93" width="5" height="20"/></g>`,
    `<path d="M224 90 L288 90 L281 116 L231 116 Z" fill="none" stroke="${edge}" stroke-width="3"/>`,
    // cheek plates flaring to the jaw
    `<path d="M182 58 L170 100 L200 110 L208 76 Z" fill="#1b2228" stroke="${edge}" stroke-width="2.5"/>`,
    `<path d="M330 58 L342 100 L312 110 L304 76 Z" fill="#1b2228" stroke="${edge}" stroke-width="2.5"/>`,
    // jaw line under the grille
    `<path d="M206 112 Q256 128 306 112" fill="none" stroke="${soft}" stroke-width="3"/>`,
    // temple vents
    `<g stroke="${soft}" stroke-width="3">`
    + `<path d="M152 40 L152 92"/><path d="M138 48 L138 84"/>`
    + `<path d="M360 40 L360 92"/><path d="M374 48 L374 84"/></g>`,
  ].join(''));
}

/** Vader chest control box print. */
function vaderChestTex() {
  const edge = hx(0x6b757d);
  return flatTex([
    `<rect width="128" height="64" fill="#12171c"/>`,
    `<rect x="3" y="3" width="122" height="58" rx="5" fill="#20272e" stroke="${edge}" stroke-width="2"/>`,
    // button rows
    `<rect x="10" y="10" width="16" height="12" rx="2" fill="#c91a09"/>`,
    `<rect x="30" y="10" width="16" height="12" rx="2" fill="#0055bf"/>`,
    `<rect x="50" y="10" width="16" height="12" rx="2" fill="#f2cd37"/>`,
    `<rect x="70" y="10" width="16" height="12" rx="2" fill="#237841"/>`,
    `<rect x="92" y="8" width="26" height="16" rx="3" fill="#0d1114" stroke="${edge}" stroke-width="1.5"/>`,
    `<circle cx="99" cy="16" r="3.4" fill="#ff5533"/><circle cx="111" cy="16" r="3.4" fill="#57d0ff"/>`,
    // slider bank
    `<rect x="10" y="30" width="52" height="10" rx="2" fill="#0d1114" stroke="${edge}" stroke-width="1.5"/>`,
    `<rect x="14" y="32" width="7" height="6" fill="${edge}"/><rect x="27" y="32" width="7" height="6" fill="${edge}"/>`,
    `<rect x="40" y="32" width="7" height="6" fill="${edge}"/>`,
    `<rect x="68" y="30" width="50" height="10" rx="2" fill="#0d1114"/>`,
    `<g fill="#57d0ff" opacity="0.9"><rect x="71" y="32" width="5" height="6"/><rect x="80" y="32" width="5" height="6"/></g>`,
    // lower readouts
    `<rect x="10" y="45" width="108" height="12" rx="2" fill="#0d1114" stroke="${edge}" stroke-width="1.5"/>`,
    `<g fill="${edge}" opacity="0.7">`
    + `<rect x="14" y="48" width="18" height="6"/><rect x="36" y="48" width="10" height="6"/>`
    + `<rect x="50" y="48" width="26" height="6"/><rect x="80" y="48" width="12" height="6"/>`
    + `<rect x="96" y="48" width="18" height="6"/></g>`,
  ].join(''), { vw: 128, vh: 64, w: 512, h: 256 });
}

/* ------------------------------------------------------------------ */
/* torso prints                                                        */
/* ------------------------------------------------------------------ */

function trooperTorsoTex(o = {}) {
  const shell = o.color ?? C.white;
  const line = '#8f9599';
  const ink = '#141a1f';
  return torsoTex([
    `<rect width="152" height="128" fill="${hx(shell)}"/>`,
    // black undersuit at the neck and arm sockets
    `<path d="M40 0 L112 0 L104 16 L48 16 Z" fill="${ink}"/>`,
    `<path d="M0 22 L18 18 L26 44 L2 50 Z" fill="${ink}"/>`,
    `<path d="M152 22 L134 18 L126 44 L150 50 Z" fill="${ink}"/>`,
    // chest plates
    `<path d="M48 16 L104 16 L110 52 L76 60 L42 52 Z" fill="none" stroke="${line}" stroke-width="3"/>`,
    `<path d="M76 18 L76 59" stroke="${line}" stroke-width="3"/>`,
    `<path d="M20 30 L42 26 L46 54 L24 60 Z" fill="none" stroke="${line}" stroke-width="2.5"/>`,
    `<path d="M132 30 L110 26 L106 54 L128 60 Z" fill="none" stroke="${line}" stroke-width="2.5"/>`,
    // abdomen ribs
    `<g stroke="${line}" stroke-width="3.5" fill="none">`
    + `<path d="M46 68 q30 8 60 0"/><path d="M44 80 q32 8 64 0"/><path d="M46 92 q30 8 60 0"/></g>`,
    `<path d="M40 62 L112 62 L116 100 L36 100 Z" fill="none" stroke="${line}" stroke-width="2.5"/>`,
    // belt: white with black boxes and a grey buckle
    `<rect x="22" y="103" width="108" height="15" fill="#e4e6e3" stroke="${line}" stroke-width="2"/>`,
    `<rect x="64" y="100" width="24" height="21" rx="2" fill="#9aa0a4" stroke="${ink}" stroke-width="2"/>`,
    `<rect x="28" y="104" width="16" height="13" fill="${ink}"/>`,
    `<rect x="108" y="104" width="16" height="13" fill="${ink}"/>`,
    `<rect x="30" y="120" width="92" height="8" fill="${ink}" opacity="0.85"/>`,
    o.dirty ? `<g opacity="0.45" fill="${hx(0xa08a5e)}">`
      + `<path d="M30 70 q30 22 74 12 l4 34 -84 4 z"/>`
      + `<path d="M96 20 q22 14 20 34 l-14 -2 z"/></g>` : '',
  ].join(''));
}

function vaderTorsoTex() {
  const edge = '#6b757d';
  return torsoTex([
    `<rect width="152" height="128" fill="#151b21"/>`,
    // shoulder armour
    `<path d="M0 26 L22 14 L34 40 L4 54 Z" fill="#1e252c" stroke="${edge}" stroke-width="2"/>`,
    `<path d="M152 26 L130 14 L118 40 L148 54 Z" fill="#1e252c" stroke="${edge}" stroke-width="2"/>`,
    // cape clasps
    `<circle cx="42" cy="10" r="7" fill="#8b949a"/><circle cx="110" cy="10" r="7" fill="#8b949a"/>`,
    // ribbed chest under the box
    `<g stroke="${edge}" stroke-width="2" opacity="0.5">`
    + `<path d="M38 20 L38 66"/><path d="M114 20 L114 66"/></g>`,
    // belt with boxes
    `<rect x="16" y="96" width="120" height="18" fill="#20272e" stroke="${edge}" stroke-width="2"/>`,
    `<rect x="56" y="92" width="40" height="26" rx="3" fill="#0e1216" stroke="${edge}" stroke-width="2"/>`,
    `<g fill="#8b949a" opacity="0.85">`
    + `<rect x="62" y="98" width="10" height="7"/><rect x="76" y="98" width="14" height="7"/>`
    + `<rect x="62" y="108" width="28" height="5"/></g>`,
    `<rect x="22" y="99" width="22" height="12" rx="2" fill="#0e1216" stroke="${edge}" stroke-width="1.5"/>`,
    `<rect x="108" y="99" width="22" height="12" rx="2" fill="#0e1216" stroke="${edge}" stroke-width="1.5"/>`,
    `<rect x="30" y="118" width="92" height="10" fill="#10151a"/>`,
  ].join(''));
}

function pilotTorsoTex(o = {}) {
  const stripe = hx(o.color ?? C.red);
  return torsoTex([
    `<rect width="152" height="128" fill="${hx(C.orange)}"/>`,
    // harness straps
    `<path d="M52 0 L66 0 L60 54 L44 50 Z" fill="#2b3238"/>`,
    `<path d="M100 0 L86 0 L92 54 L108 50 Z" fill="#2b3238"/>`,
    // chest box
    `<rect x="40" y="34" width="72" height="34" rx="4" fill="#eceff0" stroke="#2b3238" stroke-width="2.5"/>`,
    `<rect x="46" y="40" width="26" height="10" rx="2" fill="#2b3238"/>`,
    `<circle cx="82" cy="45" r="4.5" fill="${stripe}"/><circle cx="96" cy="45" r="4.5" fill="#0055bf"/>`,
    `<g fill="#8f9599"><rect x="46" y="55" width="60" height="4"/><rect x="46" y="62" width="38" height="4"/></g>`,
    // life support hoses
    `<path d="M40 44 q-18 6 -22 26" fill="none" stroke="#575d61" stroke-width="6"/>`,
    `<path d="M112 44 q18 6 22 26" fill="none" stroke="#575d61" stroke-width="6"/>`,
    // lower boxes + belt
    `<rect x="30" y="74" width="34" height="20" rx="3" fill="#eceff0" stroke="#2b3238" stroke-width="2"/>`,
    `<rect x="88" y="74" width="34" height="20" rx="3" fill="#2b3238"/>`,
    `<g fill="${stripe}"><rect x="93" y="79" width="10" height="4"/><rect x="93" y="86" width="18" height="4"/></g>`,
    `<rect x="22" y="100" width="108" height="14" fill="#4a5157"/>`,
    `<rect x="64" y="97" width="24" height="20" rx="2" fill="#c8cacb" stroke="#2b3238" stroke-width="2"/>`,
    // squadron flash on the left chest
    `<path d="M118 18 l10 6 -10 6 z" fill="${stripe}"/>`,
  ].join(''));
}

function officerTorsoTex(o = {}) {
  const cloth = hx(o.color ?? X.officer);
  return torsoTex([
    `<rect width="152" height="128" fill="${cloth}"/>`,
    // tunic collar + front seam
    `<path d="M44 0 L108 0 L100 18 L52 18 Z" fill="#5f665f"/>`,
    `<path d="M76 18 L76 128" stroke="#5f665f" stroke-width="3"/>`,
    `<path d="M52 18 q24 10 48 0" fill="none" stroke="#5f665f" stroke-width="2.5"/>`,
    // rank badge: three over three squares
    `<rect x="24" y="30" width="34" height="24" rx="2" fill="#2f353a"/>`,
    `<g><rect x="28" y="34" width="8" height="7" fill="#c91a09"/>`
    + `<rect x="39" y="34" width="8" height="7" fill="#0055bf"/>`
    + `<rect x="50" y="34" width="4" height="7" fill="#c8cacb"/>`
    + `<rect x="28" y="44" width="8" height="7" fill="#0055bf"/>`
    + `<rect x="39" y="44" width="8" height="7" fill="#c91a09"/>`
    + `<rect x="50" y="44" width="4" height="7" fill="#f2cd37"/></g>`,
    // code cylinders
    `<g fill="#b8bcbe" stroke="#4a5157" stroke-width="1.2">`
    + `<rect x="98" y="28" width="6" height="30" rx="3"/><rect x="108" y="28" width="6" height="30" rx="3"/></g>`,
    // belt
    `<rect x="16" y="98" width="120" height="16" fill="#20272e"/>`,
    `<rect x="62" y="95" width="28" height="22" rx="2" fill="#8b949a" stroke="#20272e" stroke-width="2"/>`,
    `<rect x="20" y="114" width="112" height="14" fill="#20272e"/>`,
  ].join(''));
}

function jawaTorsoTex() {
  return torsoTex([
    `<rect width="152" height="128" fill="${hx(X.jawaBrown)}"/>`,
    // hood shadow falling over the chest
    `<path d="M30 0 L122 0 L112 30 Q76 44 40 30 Z" fill="#000" opacity="0.4"/>`,
    // bandolier
    `<path d="M30 12 L118 96 L100 116 L12 32 Z" fill="#2f2118" stroke="#7a5a34" stroke-width="2"/>`,
    `<g fill="#8a6a3a">`
    + `<rect x="42" y="34" width="18" height="14" rx="2" transform="rotate(42 51 41)"/>`
    + `<rect x="66" y="58" width="18" height="14" rx="2" transform="rotate(42 75 65)"/>`
    + `<rect x="90" y="82" width="18" height="14" rx="2" transform="rotate(42 99 89)"/></g>`,
    // robe folds + belt
    `<g stroke="#2a1c12" stroke-width="3" opacity="0.8">`
    + `<path d="M22 60 q10 30 6 68"/><path d="M130 60 q-10 30 -6 68"/></g>`,
    `<rect x="18" y="104" width="116" height="12" fill="#2a1c12"/>`,
  ].join(''));
}

function farmBoyTorsoTex() {
  return torsoTex([
    `<rect width="152" height="128" fill="${hx(X.cream)}"/>`,
    // wrap-over tunic front
    `<path d="M76 8 L118 22 L112 128 L76 128 Z" fill="#e2d5b4"/>`,
    `<path d="M76 8 L34 22 L40 128 L76 128 Z" fill="#f3ecd8"/>`,
    `<path d="M76 8 L118 22" stroke="#bcae8c" stroke-width="3"/>`,
    `<path d="M76 8 L34 22" stroke="#bcae8c" stroke-width="3"/>`,
    `<path d="M44 0 L108 0 L96 14 L56 14 Z" fill="#d6c8a4"/>`,
    // collar shadow + sleeve seams
    `<g stroke="#bcae8c" stroke-width="2.5" opacity="0.9">`
    + `<path d="M20 24 q6 40 2 76"/><path d="M132 24 q-6 40 -2 76"/></g>`,
    // belt with a buckle and a pouch
    `<rect x="18" y="100" width="116" height="15" fill="#4b3520"/>`,
    `<rect x="64" y="97" width="24" height="21" rx="2" fill="#b8bcbe" stroke="#3a2818" stroke-width="2"/>`,
    `<rect x="96" y="102" width="18" height="18" rx="2" fill="#5d4227"/>`,
  ].join(''));
}

function smugglerTorsoTex() {
  return torsoTex([
    `<rect width="152" height="128" fill="#f4f5f2"/>`,
    // black vest
    `<path d="M40 0 L18 16 L12 128 L52 128 L58 40 Z" fill="#1b2129"/>`,
    `<path d="M112 0 L134 16 L140 128 L100 128 L94 40 Z" fill="#1b2129"/>`,
    // shirt V and collar
    `<path d="M58 10 L76 46 L94 10 L84 4 L76 26 L68 4 Z" fill="#dfe1dd"/>`,
    `<path d="M44 0 L108 0 L96 12 L56 12 Z" fill="#e6e7e3"/>`,
    `<g stroke="#9b9d99" stroke-width="2" opacity="0.8"><path d="M76 46 L76 100"/></g>`,
    // vest edge stitching
    `<g fill="none" stroke="#3d454d" stroke-width="2">`
    + `<path d="M58 40 L52 126"/><path d="M94 40 L100 126"/></g>`,
    // belt
    `<rect x="14" y="100" width="124" height="15" fill="#3a2a1c"/>`,
    `<rect x="62" y="97" width="28" height="21" rx="2" fill="#b8bcbe" stroke="#2a1c12" stroke-width="2"/>`,
  ].join(''));
}

function robeTorsoTex(o = {}) {
  const cloth = hx(o.color ?? C.tan);
  const dark = hx(o.dark ?? 0xa8926a);
  return torsoTex([
    `<rect width="152" height="128" fill="${cloth}"/>`,
    // crossed-over robe
    `<path d="M76 6 L124 26 L118 128 L76 128 Z" fill="${dark}" opacity="0.55"/>`,
    `<path d="M76 6 L28 26 L34 128 L76 128 Z" fill="${cloth}"/>`,
    `<path d="M76 6 L28 26" stroke="${dark}" stroke-width="3.5"/>`,
    `<path d="M76 6 L124 26" stroke="${dark}" stroke-width="3.5"/>`,
    // over-robe hanging open at the sides
    `<path d="M0 18 L22 12 L16 128 L0 128 Z" fill="${hx(o.outer ?? C.brown)}"/>`,
    `<path d="M152 18 L130 12 L136 128 L152 128 Z" fill="${hx(o.outer ?? C.brown)}"/>`,
    // belt
    `<rect x="20" y="98" width="112" height="14" fill="#4b3520"/>`,
    `<rect x="66" y="95" width="22" height="20" rx="2" fill="#8a6a3a"/>`,
    // folds
    `<g stroke="${dark}" stroke-width="2.5" opacity="0.8">`
    + `<path d="M50 34 q6 34 2 62"/><path d="M104 34 q-6 34 -2 62"/></g>`,
  ].join(''));
}

function princessTorsoTex() {
  return torsoTex([
    `<rect width="152" height="128" fill="#f6f7f4"/>`,
    // gown yoke + collar
    `<path d="M40 0 L112 0 L104 20 L48 20 Z" fill="#e8eae6"/>`,
    `<path d="M48 20 Q76 34 104 20 L108 44 Q76 58 44 44 Z" fill="#eef0ec"/>`,
    // shoulder drape lines
    `<g stroke="#cfd2ce" stroke-width="3">`
    + `<path d="M22 22 q10 44 6 92"/><path d="M130 22 q-10 44 -6 92"/>`
    + `<path d="M60 46 L58 100"/><path d="M92 46 L94 100"/></g>`,
    // silver belt
    `<rect x="24" y="100" width="104" height="12" fill="#b8bcbe"/>`,
    `<g fill="#8b949a">`
    + `<rect x="30" y="102" width="12" height="8" rx="2"/><rect x="48" y="102" width="12" height="8" rx="2"/>`
    + `<rect x="66" y="102" width="12" height="8" rx="2"/><rect x="84" y="102" width="12" height="8" rx="2"/>`
    + `<rect x="102" y="102" width="12" height="8" rx="2"/></g>`,
  ].join(''));
}

function rebelTorsoTex() {
  return torsoTex([
    `<rect width="152" height="128" fill="${hx(X.rebelTan)}"/>`,
    // dark vest over the fatigues
    `<path d="M42 0 L20 14 L14 128 L54 128 L60 38 Z" fill="#3c4650"/>`,
    `<path d="M110 0 L132 14 L138 128 L98 128 L92 38 Z" fill="#3c4650"/>`,
    `<path d="M44 0 L108 0 L98 16 L54 16 Z" fill="#c2ab82"/>`,
    // shoulder straps
    `<path d="M60 20 L96 116 L82 122 L46 26 Z" fill="#eceade" opacity="0.9"/>`,
    // pouches
    `<rect x="96" y="60" width="26" height="22" rx="3" fill="#2f3840"/>`,
    `<rect x="30" y="60" width="26" height="22" rx="3" fill="#2f3840"/>`,
    // belt
    `<rect x="16" y="100" width="120" height="15" fill="#eceade"/>`,
    `<rect x="64" y="97" width="24" height="21" rx="2" fill="#8b949a" stroke="#4a5157" stroke-width="2"/>`,
  ].join(''));
}

function protocolTorsoTex() {
  const gold = hx(X.pearlGold);
  const dark = '#8a6a20';
  return torsoTex([
    `<rect width="152" height="128" fill="${gold}"/>`,
    // collar ring + chest plates
    `<path d="M40 0 L112 0 L106 14 L46 14 Z" fill="#c1912f"/>`,
    `<path d="M46 14 L106 14 L112 44 L40 44 Z" fill="none" stroke="${dark}" stroke-width="3"/>`,
    `<circle cx="76" cy="30" r="9" fill="#7a5c1c"/><circle cx="76" cy="30" r="4" fill="#e7c66a"/>`,
    // exposed wiring at the midriff
    `<rect x="34" y="50" width="84" height="34" rx="3" fill="#20262b"/>`,
    `<g fill="none" stroke-width="3">`
    + `<path d="M40 58 q18 12 36 0 t36 0" stroke="#c91a09"/>`
    + `<path d="M40 66 q18 -10 36 2 t36 -2" stroke="#0055bf"/>`
    + `<path d="M40 76 q18 10 36 -2 t36 2" stroke="#f2cd37"/></g>`,
    `<g fill="#8b949a"><rect x="36" y="52" width="8" height="30"/><rect x="108" y="52" width="8" height="30"/></g>`,
    // hip plates
    `<path d="M30 90 L122 90 L118 116 L34 116 Z" fill="none" stroke="${dark}" stroke-width="3"/>`,
    `<g stroke="${dark}" stroke-width="2.5">`
    + `<path d="M56 90 L56 116"/><path d="M96 90 L96 116"/></g>`,
    `<rect x="22" y="118" width="108" height="10" fill="#c1912f"/>`,
  ].join(''));
}

/* ------------------------------------------------------------------ */
/* back prints                                                         */
/* ------------------------------------------------------------------ */

/**
 * Stormtrooper back plate: shoulder blades, spine ridge, kidney armour.
 * The back is what the camera sees most in the corridor chase, so it carries
 * as much detail as the chest.
 */
function trooperBackTex(o = {}) {
  const shell = o.color ?? C.white;
  const line = '#8f9599';
  const ink = '#141a1f';
  return backTex([
    `<rect width="152" height="128" fill="${hx(shell)}"/>`,
    // undersuit showing at the neck and arm sockets
    `<path d="M42 0 L110 0 L104 14 L48 14 Z" fill="${ink}"/>`,
    `<path d="M0 22 L18 18 L26 44 L2 50 Z" fill="${ink}"/>`,
    `<path d="M152 22 L134 18 L126 44 L150 50 Z" fill="${ink}"/>`,
    // shoulder blade plates, lifted a shade off the shell so they read as plates
    `<path d="M20 24 L66 17 L70 56 L24 62 Z" fill="#f7f8f6" stroke="${line}" stroke-width="3"/>`,
    `<path d="M132 24 L86 17 L82 56 L128 62 Z" fill="#f7f8f6" stroke="${line}" stroke-width="3"/>`,
    // spine ridge: darker channel with a raised strip down it
    `<rect x="66" y="12" width="20" height="92" fill="#b9bdbf"/>`,
    `<rect x="70" y="14" width="12" height="88" fill="#f7f8f6" stroke="${line}" stroke-width="2"/>`,
    `<g fill="${line}">`
    + `<rect x="72" y="26" width="8" height="5"/><rect x="72" y="42" width="8" height="5"/>`
    + `<rect x="72" y="58" width="8" height="5"/><rect x="72" y="74" width="8" height="5"/>`
    + `<rect x="72" y="90" width="8" height="5"/></g>`,
    // kidney plate
    `<path d="M26 66 L126 66 L122 100 L30 100 Z" fill="#dcdfdd" stroke="${line}" stroke-width="3"/>`,
    `<g stroke="${line}" stroke-width="2.5">`
    + `<path d="M30 83 L66 83"/><path d="M86 83 L122 83"/>`
    + `<path d="M46 66 L45 100"/><path d="M107 66 L106 100"/></g>`,
    // belt with the power pack box
    `<rect x="22" y="103" width="108" height="15" fill="#c9cdcf" stroke="${line}" stroke-width="2"/>`,
    `<rect x="56" y="99" width="40" height="24" rx="2" fill="${ink}"/>`,
    `<g fill="#b9bdbf"><rect x="61" y="104" width="30" height="5"/>`
    + `<rect x="61" y="112" width="18" height="5"/></g>`,
    `<rect x="30" y="120" width="92" height="8" fill="${ink}" opacity="0.85"/>`,
    o.dirty ? `<g opacity="0.42" fill="${hx(0xa08a5e)}">`
      + `<path d="M26 72 q34 20 76 8 l4 30 -86 4 z"/>`
      + `<path d="M118 18 q16 18 12 34 l-14 -4 z"/></g>` : '',
  ].join(''));
}

/** Pilot life-support pack: ribbed box, hoses over the shoulders, warning label. */
function pilotBackTex(o = {}) {
  const stripe = hx(o.color ?? C.red);
  return backTex([
    `<rect width="152" height="128" fill="${hx(C.orange)}"/>`,
    // harness straps coming over the shoulders into the pack
    `<path d="M50 0 L64 0 L60 34 L44 30 Z" fill="#2b3238"/>`,
    `<path d="M102 0 L88 0 L92 34 L108 30 Z" fill="#2b3238"/>`,
    // life-support pack
    `<rect x="26" y="26" width="100" height="66" rx="5" fill="#d8dbdc" stroke="#2b3238" stroke-width="3"/>`,
    `<rect x="32" y="32" width="88" height="24" rx="3" fill="#eceff0" stroke="#8f9599" stroke-width="2"/>`,
    // ribbing across the lower half of the pack
    `<g fill="#b7bcbe">`
    + `<rect x="32" y="62" width="88" height="6"/><rect x="32" y="72" width="88" height="6"/>`
    + `<rect x="32" y="82" width="88" height="6"/></g>`,
    // gauges and the warning flash
    `<circle cx="46" cy="44" r="8" fill="#2b3238"/><circle cx="46" cy="44" r="4" fill="#57d0ff"/>`,
    `<circle cx="68" cy="44" r="8" fill="#2b3238"/><circle cx="68" cy="44" r="4" fill="${stripe}"/>`,
    `<rect x="84" y="36" width="32" height="16" rx="2" fill="${stripe}"/>`,
    `<g fill="#eceff0"><rect x="88" y="40" width="10" height="3"/><rect x="88" y="46" width="22" height="3"/></g>`,
    // hoses curling out of the pack top toward the shoulders
    `<path d="M40 28 q-16 -12 -30 -6" fill="none" stroke="#575d61" stroke-width="7"/>`,
    `<path d="M112 28 q16 -12 30 -6" fill="none" stroke="#575d61" stroke-width="7"/>`,
    // belt
    `<rect x="22" y="98" width="108" height="15" fill="#4a5157"/>`,
    `<rect x="60" y="95" width="32" height="21" rx="2" fill="#c8cacb" stroke="#2b3238" stroke-width="2"/>`,
    `<g fill="${stripe}"><rect x="28" y="102" width="18" height="6"/><rect x="106" y="102" width="18" height="6"/></g>`,
  ].join(''));
}

/** Rebel fleet trooper back: vest panel, cross strap, field pouch. */
function rebelBackTex() {
  return backTex([
    `<rect width="152" height="128" fill="${hx(X.rebelTan)}"/>`,
    // vest back, one broad panel
    `<path d="M40 0 L18 14 L12 128 L140 128 L134 14 L112 0 Z" fill="#3c4650"/>`,
    `<path d="M46 0 L106 0 L98 14 L54 14 Z" fill="#c2ab82"/>`,
    // yoke seam and centre seam
    `<path d="M22 26 q54 16 108 0" fill="none" stroke="#2f3840" stroke-width="3"/>`,
    `<path d="M76 26 L76 100" stroke="#2f3840" stroke-width="3"/>`,
    // pale shoulder strap crossing to the belt
    `<path d="M58 16 L96 112 L82 118 L44 22 Z" fill="#eceade" opacity="0.9"/>`,
    // field pouch
    `<rect x="24" y="56" width="30" height="28" rx="3" fill="#2f3840" stroke="#20272e" stroke-width="2"/>`,
    `<rect x="28" y="62" width="22" height="5" fill="#6d757d"/>`,
    // belt
    `<rect x="16" y="100" width="120" height="15" fill="#eceade"/>`,
    `<rect x="16" y="115" width="120" height="8" fill="#c2ab82"/>`,
  ].join(''));
}

/** Smuggler back: black vest over the white shirt, single centre seam. */
function smugglerBackTex() {
  return backTex([
    `<rect width="152" height="128" fill="#f4f5f2"/>`,
    // vest back
    `<path d="M42 0 L18 16 L12 128 L140 128 L134 16 L110 0 Z" fill="#1b2129"/>`,
    // shirt collar showing above it
    `<path d="M44 0 L108 0 L100 14 L52 14 Z" fill="#e6e7e3"/>`,
    `<path d="M52 14 q24 10 48 0" fill="none" stroke="#c9cbc7" stroke-width="3"/>`,
    // vest yoke + centre seam
    `<path d="M24 30 q52 14 104 0" fill="none" stroke="#3d454d" stroke-width="2.5"/>`,
    `<path d="M76 30 L76 100" stroke="#3d454d" stroke-width="2.5"/>`,
    `<g fill="none" stroke="#3d454d" stroke-width="2"><path d="M52 34 L48 126"/><path d="M100 34 L104 126"/></g>`,
    // belt
    `<rect x="14" y="100" width="124" height="15" fill="#3a2a1c"/>`,
    `<rect x="14" y="115" width="124" height="7" fill="#2a1c12"/>`,
  ].join(''));
}

/** Imperial officer back: plain tunic, yoke seam, belt. */
function officerBackTex(o = {}) {
  const cloth = hx(o.color ?? X.officer);
  return backTex([
    `<rect width="152" height="128" fill="${cloth}"/>`,
    `<path d="M44 0 L108 0 L100 16 L52 16 Z" fill="#5f665f"/>`,
    `<path d="M22 24 q54 14 108 0" fill="none" stroke="#5f665f" stroke-width="3"/>`,
    `<path d="M76 24 L76 98" stroke="#5f665f" stroke-width="3"/>`,
    `<g stroke="#5f665f" stroke-width="2.5" opacity="0.8">`
    + `<path d="M30 30 q6 34 2 66"/><path d="M122 30 q-6 34 -2 66"/></g>`,
    `<rect x="16" y="98" width="120" height="16" fill="#20272e"/>`,
    `<rect x="20" y="114" width="112" height="14" fill="#20272e"/>`,
  ].join(''));
}

/** Farm boy back: tunic with a centre seam and the belt carrying over. */
function farmBoyBackTex() {
  return backTex([
    `<rect width="152" height="128" fill="${hx(X.cream)}"/>`,
    `<path d="M44 0 L108 0 L98 14 L54 14 Z" fill="#d6c8a4"/>`,
    `<path d="M22 22 q54 14 108 0" fill="none" stroke="#bcae8c" stroke-width="3"/>`,
    `<path d="M76 22 L76 100" stroke="#bcae8c" stroke-width="3"/>`,
    `<g stroke="#bcae8c" stroke-width="2.5" opacity="0.9">`
    + `<path d="M26 26 q6 38 2 72"/><path d="M126 26 q-6 38 -2 72"/></g>`,
    `<rect x="18" y="100" width="116" height="15" fill="#4b3520"/>`,
    `<rect x="18" y="115" width="116" height="8" fill="#3a2818"/>`,
  ].join(''));
}

/** Robe back for the old man: over-robe panels and a hanging fold. */
function robeBackTex(o = {}) {
  const cloth = hx(o.color ?? C.tan);
  const dark = hx(o.dark ?? 0xa8926a);
  return backTex([
    `<rect width="152" height="128" fill="${cloth}"/>`,
    `<path d="M0 16 L26 10 L20 128 L0 128 Z" fill="${hx(o.outer ?? C.brown)}"/>`,
    `<path d="M152 16 L126 10 L132 128 L152 128 Z" fill="${hx(o.outer ?? C.brown)}"/>`,
    // hood gathered across the shoulders
    `<path d="M40 0 L112 0 L104 26 Q76 40 48 26 Z" fill="${hx(o.outer ?? C.brown)}" opacity="0.85"/>`,
    `<g stroke="${dark}" stroke-width="3" opacity="0.85">`
    + `<path d="M76 34 L76 100"/><path d="M52 40 q4 30 0 58"/><path d="M100 40 q-4 30 0 58"/></g>`,
    `<rect x="20" y="98" width="112" height="14" fill="#4b3520"/>`,
  ].join(''));
}

/** Jawa back: the bandolier crossing under the hood's shadow. */
function jawaBackTex() {
  return backTex([
    `<rect width="152" height="128" fill="${hx(X.jawaBrown)}"/>`,
    `<path d="M28 0 L124 0 L114 34 Q76 48 38 34 Z" fill="#000" opacity="0.45"/>`,
    `<path d="M122 14 L34 98 L52 118 L140 34 Z" fill="#2f2118" stroke="#7a5a34" stroke-width="2"/>`,
    `<g stroke="#2a1c12" stroke-width="3" opacity="0.8">`
    + `<path d="M22 58 q10 30 6 70"/><path d="M130 58 q-10 30 -6 70"/></g>`,
    `<rect x="18" y="104" width="116" height="12" fill="#2a1c12"/>`,
  ].join(''));
}

/** Princess gown back: drape lines under the fall of hair, silver belt. */
function princessBackTex() {
  return backTex([
    `<rect width="152" height="128" fill="#f6f7f4"/>`,
    `<path d="M40 0 L112 0 L104 20 L48 20 Z" fill="#e8eae6"/>`,
    `<path d="M24 24 q52 14 104 0" fill="none" stroke="#cfd2ce" stroke-width="3"/>`,
    `<g stroke="#cfd2ce" stroke-width="3">`
    + `<path d="M76 26 L76 98"/><path d="M22 28 q10 40 6 70"/><path d="M130 28 q-10 40 -6 70"/>`
    + `<path d="M52 34 L50 98"/><path d="M100 34 L102 98"/></g>`,
    `<rect x="24" y="100" width="104" height="12" fill="#b8bcbe"/>`,
    `<g fill="#8b949a">`
    + `<rect x="34" y="102" width="14" height="8" rx="2"/><rect x="56" y="102" width="14" height="8" rx="2"/>`
    + `<rect x="78" y="102" width="14" height="8" rx="2"/><rect x="100" y="102" width="14" height="8" rx="2"/></g>`,
  ].join(''));
}

/** Protocol droid back: vertebra segments and the exposed spine wiring. */
function protocolBackTex() {
  const gold = hx(X.pearlGold);
  const dark = '#8a6a20';
  return backTex([
    `<rect width="152" height="128" fill="${gold}"/>`,
    `<path d="M40 0 L112 0 L106 14 L46 14 Z" fill="#c1912f"/>`,
    // shoulder plates
    `<path d="M46 14 L106 14 L112 46 L40 46 Z" fill="none" stroke="${dark}" stroke-width="3"/>`,
    `<g fill="none" stroke="${dark}" stroke-width="2.5"><path d="M22 22 L34 48"/><path d="M130 22 L118 48"/></g>`,
    // spine: stacked vertebra blocks over a dark channel
    `<rect x="64" y="16" width="24" height="88" fill="#20262b"/>`,
    `<g fill="#c79c33" stroke="${dark}" stroke-width="1.5">`
    + `<rect x="66" y="20" width="20" height="12" rx="2"/><rect x="66" y="36" width="20" height="12" rx="2"/>`
    + `<rect x="66" y="52" width="20" height="12" rx="2"/><rect x="66" y="68" width="20" height="12" rx="2"/>`
    + `<rect x="66" y="84" width="20" height="12" rx="2"/></g>`,
    // wiring bundles either side of the spine
    `<g fill="none" stroke-width="3">`
    + `<path d="M40 54 q10 14 0 28" stroke="#c91a09"/>`
    + `<path d="M48 54 q10 14 0 28" stroke="#0055bf"/>`
    + `<path d="M112 54 q-10 14 0 28" stroke="#f2cd37"/>`
    + `<path d="M104 54 q-10 14 0 28" stroke="#c91a09"/></g>`,
    `<g fill="#8b949a"><rect x="34" y="50" width="8" height="36"/><rect x="110" y="50" width="8" height="36"/></g>`,
    // hip plates
    `<path d="M30 90 L122 90 L118 116 L34 116 Z" fill="none" stroke="${dark}" stroke-width="3"/>`,
    `<rect x="22" y="118" width="108" height="10" fill="#c1912f"/>`,
  ].join(''));
}

/* ------------------------------------------------------------------ */
/* headgear                                                            */
/* ------------------------------------------------------------------ */

/** Stormtrooper helmet. Local origin = the neck joint, like all headgear. */
function trooperHelmet(o = {}) {
  const shell = o.color ?? C.white;
  const barrel = cyl(0.705, 0.92, { seg: 26 });
  barrel.material = texMat(trooperHelmetTex(o));
  return assemble([
    at(barrel, 0, 0.06, 0),
    at(domeMesh(0.705, 0.36, shell, 22), 0, 0.98, 0),
    // jaw flare and neck rim
    paint(at(cone(0.74, 0.705, 0.14, { seg: 26 }), 0, -0.04, 0), shell),
    paint(at(cyl(0.62, 0.08, { seg: 20 }), 0, -0.12, 0), C.black),
    // raised vocoder over the printed frown
    paint(at(tile(0.36, 0.08, 0.16), 0, 0.28, -0.68), C.black),
    // brow ridge
    paint(at(arcShell(0.72, 0.06, { span: 4.0, seg: 20 }), 0, 0.74, 0), shell),
  ]);
}

/** Vader's helmet: dome, jaw flares, rear neck skirt, printed mask. */
function vaderHelmet() {
  const black = C.black;
  const mask = cyl(0.68, 0.82, { seg: 26, rTop: 0.66 });
  mask.material = texMat(vaderHelmetTex());
  // Radii are stepped so nothing interpenetrates: mask 0.68 -> 0.66, the brow
  // hood flares out to 0.78 and back in to the 0.715 crown rim, and the dome
  // equator sits at 0.70 just inside that rim.
  const parts = [
    at(mask, 0, 0.14, 0),
    at(domeMesh(0.7, 0.56, black, 24), 0, 0.94, 0),
    // brow hood: flares forward over the lenses
    paint(at(arcShell(0.78, 0.16, { span: 3.5, center: Math.PI, rTop: 0.715, seg: 18 }), 0, 0.7, 0), black),
    paint(at(arcShell(0.79, 0.05, { span: 3.5, center: Math.PI, seg: 18 }), 0, 0.67, 0), C.darkGray),
    // crown rim, ringing the base of the dome
    paint(at(arcShell(0.715, 0.08, { span: Math.PI * 2, seg: 26 }), 0, 0.86, 0), C.darkGray),
    // rear neck skirt: sits low, over the shoulders, clear of the mask
    paint(at(arcShell(0.94, 0.46, { span: 2.9, center: 0, rTop: 0.7, seg: 20 }), 0, -0.26, 0), black),
    paint(at(arcShell(0.96, 0.07, { span: 2.9, center: 0, seg: 20 }), 0, -0.32, 0), C.darkGray),
    // chin cup
    paint(at(cone(0.56, 0.66, 0.16, { seg: 22 }), 0, 0.0, 0), black),
  ];
  // angular jaw flares either side of the mask
  for (const sx of [1, -1]) {
    parts.push(paint(at(arcShell(0.86, 0.42, { span: 1.15, center: sx * Math.PI / 2, rTop: 0.7, seg: 10 }),
      0, -0.12, 0), black));
    parts.push(paint(at(arcShell(0.88, 0.06, { span: 1.15, center: sx * Math.PI / 2, seg: 10 }),
      0, -0.18, 0), C.darkGray));
  }
  return assemble(parts);
}

/**
 * Rebel fleet trooper crash helmet: covers the crown down past the ears, cut
 * away at the front so the whole face reads.
 */
function rebelHelmet(o = {}) {
  const shell = o.color ?? X.helmetTan;
  // The face opening spans 2.4 rad at the front; the printed brow band fills it
  // so the helmet is not one unbroken slab of tan from the camera's angle.
  const FRONT = 2.4;
  const brow = arcShell(0.69, 0.34, { span: FRONT, center: Math.PI, seg: 18, map: rebelHelmetTex(shell) });
  return assemble([
    // back and sides come down over the ears
    paint(at(arcShell(0.68, 0.62, { span: 4.3, center: 0, seg: 22 }), 0, 0.5, 0), shell),
    at(brow, 0, 0.78, 0),
    at(domeMesh(0.68, 0.4, shell, 22), 0, 1.12, 0),
    // brim flaring forward over the brow, and the crown rib front to back
    paint(at(arcShell(0.82, 0.13, { span: 2.7, center: Math.PI, seg: 18, rTop: 0.69 }), 0, 0.72, 0), C.darkTan),
    paint(at(arcShell(0.7, 0.07, { span: 4.3, center: 0, seg: 22 }), 0, 0.52, 0), C.darkTan),
    paint(at(tile(0.2, 1.34, 0.12), 0, 1.44, 0), C.darkTan),
    paint(at(tile(0.1, 1.36, 0.05), 0, 1.56, 0), C.reddishBrown),
    // ear cups + chin strap
    paint(at(rot(cyl(0.19, 0.1, { seg: 14 }), 0, 0, Math.PI / 2), 0.7, 0.62, 0.02), C.darkTan),
    paint(at(rot(cyl(0.19, 0.1, { seg: 14 }), 0, 0, -Math.PI / 2), -0.7, 0.62, 0.02), C.darkTan),
    paint(at(arcShell(0.615, 0.1, { span: 3.6, center: Math.PI, seg: 16 }), 0, 0.08, 0), C.darkGray),
  ]);
}

/**
 * Rebel crash-helmet brow band. This print rides a 2.4 rad arc centred on the
 * front, so the viewBox spans that arc only: x = 256 is dead front, x = 0 the
 * figure's right cheek and x = 512 its left. y = 0 is the crown seam.
 */
function rebelHelmetTex(shell) {
  const dark = hx(C.darkTan);
  return wrapTex([
    bg(shell),
    // vignette toward the cheeks
    `<rect x="0" y="0" width="70" height="128" fill="#000" opacity="0.14"/>`,
    `<rect x="442" y="0" width="70" height="128" fill="#000" opacity="0.14"/>`,
    // padded brow roll with a stitched seam
    `<rect x="0" y="86" width="512" height="42" fill="${dark}"/>`,
    `<rect x="0" y="80" width="512" height="7" fill="#8a6f42"/>`,
    `<g fill="#8a6f42" opacity="0.8">`
    + `<rect x="40" y="100" width="26" height="6" rx="3"/><rect x="446" y="100" width="26" height="6" rx="3"/></g>`,
    // rank flash above the figure's right brow
    `<path d="M120 24 L168 24 L168 62 L144 74 L120 62 Z" fill="#a02b1c"/>`,
    `<path d="M128 32 L160 32 L160 58 L144 65 L128 58 Z" fill="#d8cdb2"/>`,
    // vent slots over the left temple
    `<g fill="#6f5934" opacity="0.9">`
    + `<rect x="344" y="30" width="46" height="9" rx="4"/><rect x="344" y="46" width="46" height="9" rx="4"/>`
    + `<rect x="344" y="62" width="46" height="9" rx="4"/></g>`,
    // centre ridge continuing the crown rib down the brow
    `<rect x="246" y="0" width="20" height="80" fill="${dark}"/>`,
    `<rect x="252" y="0" width="8" height="80" fill="#8a6f42"/>`,
  ].join(''));
}

/**
 * Rebel pilot helmet: printed brow band, cheek guards down either side of an
 * open face, and a smoked visor pushed up onto the brow. Keeping the face
 * visible is what makes the figure read as a person rather than a bollard.
 */
function pilotHelmet(o = {}) {
  const stripe = o.color ?? C.red;
  const R = 0.715;
  // The head's eyes sit at local y 0.61 and its mouth at 0.34, so the printed
  // brow band has to bottom out at 0.66 to leave the whole face clear.
  const BROW = 0.66;
  const band = cyl(R, 0.4, { seg: 26 });
  band.material = texMat(pilotHelmetTex(stripe));
  // face opening: 105 degrees of clear air at the front
  const OPEN = 1.83;
  return assemble([
    at(band, 0, BROW, 0),
    at(domeMesh(R, 0.4, C.white, 24, pilotDomeTex(stripe)), 0, BROW + 0.4, 0),
    // cheek guards, wrapping the back and coming down beside the jaw
    paint(at(arcShell(R, BROW + 0.02, { span: Math.PI * 2 - OPEN, center: 0, seg: 24 }), 0, -0.02, 0), C.white),
    paint(at(arcShell(R + 0.012, 0.08, { span: Math.PI * 2 - OPEN, center: 0, seg: 24 }), 0, -0.06, 0), C.bluishGray),
    // smoked visor, pushed up onto the brow
    at(arcShell(R + 0.03, 0.18, { span: 2.1, center: Math.PI, seg: 18, color: X.smoke, rough: 0.12 }),
      0, BROW + 0.02, 0),
    paint(at(arcShell(R + 0.045, 0.055, { span: 2.1, center: Math.PI, seg: 18 }), 0, BROW - 0.03, 0), C.bluishGray),
    // ear pads and comm boom curving toward the mouth
    paint(at(rot(cyl(0.2, 0.11, { seg: 14 }), 0, 0, Math.PI / 2), 0.72, 0.42, 0.02), C.darkGray),
    paint(at(rot(cyl(0.2, 0.11, { seg: 14 }), 0, 0, -Math.PI / 2), -0.72, 0.42, 0.02), C.darkGray),
    paint(at(rot(cyl(0.045, 0.52, { seg: 8 }), 0.55, 0, -1.15), -0.68, 0.4, -0.16), C.darkGray),
    paint(at(cyl(0.075, 0.09, { seg: 10 }), -0.3, 0.28, -0.6), C.black),
  ]);
}

/**
 * Pilot brow band print. The 512 x 128 viewBox is squeezed onto a 0.4-tall
 * band, so y = 0 is the crown seam and y = 128 the brow line.
 */
function pilotHelmetTex(stripe) {
  const s = hx(stripe);
  return wrapTex([
    bg(C.white),
    `<rect x="0" y="0" width="100" height="128" fill="#000" opacity="0.12"/>`,
    `<rect x="412" y="0" width="100" height="128" fill="#000" opacity="0.12"/>`,
    // squadron stripes ringing the helmet
    `<rect x="0" y="14" width="512" height="26" fill="${s}"/>`,
    `<rect x="0" y="44" width="512" height="8" fill="#2b3238"/>`,
    // front chevron over the visor
    `<path d="M210 58 L256 48 L302 58 L302 82 L256 72 L210 82 Z" fill="${s}"/>`,
    // rebel starbird on the figure's left temple
    `<g fill="${s}" transform="translate(362 86) scale(0.52)">`
    + `<path d="M0 -46 C 16 -22 30 -8 40 0 C 30 8 16 22 0 46 C -16 22 -30 8 -40 0 C -30 -8 -16 -22 0 -46 Z"/></g>`,
    // vent slots on the right temple
    `<g fill="#2b3238" opacity="0.85">`
    + `<rect x="130" y="66" width="44" height="9" rx="4"/><rect x="130" y="84" width="44" height="9" rx="4"/>`
    + `<rect x="130" y="102" width="44" height="9" rx="4"/></g>`,
    // grey rim along the brow
    `<rect x="0" y="118" width="512" height="10" fill="#8f9599"/>`,
  ].join(''));
}

/**
 * Crown stripe running front to back over the pilot's dome. Each bar is a
 * meridian of the wrap, so it climbs the dome and meets its partner at the pole.
 */
function pilotDomeTex(stripe) {
  const s = hx(stripe);
  return wrapTex([
    bg(C.white),
    // over the forehead
    `<rect x="234" y="0" width="44" height="128" fill="${s}"/>`,
    `<rect x="226" y="0" width="8" height="128" fill="#2b3238"/>`,
    `<rect x="278" y="0" width="8" height="128" fill="#2b3238"/>`,
    // over the nape, meeting it at the crown
    `<rect x="0" y="0" width="22" height="128" fill="${s}"/>`,
    `<rect x="490" y="0" width="22" height="128" fill="${s}"/>`,
    `<rect x="22" y="0" width="8" height="128" fill="#2b3238"/>`,
    `<rect x="482" y="0" width="8" height="128" fill="#2b3238"/>`,
  ].join(''));
}

/**
 * Imperial peaked cap: black band, flared crown, flat top plate, black peak.
 *
 * Heights are in head-local units, where the barrel runs y 0..1.0 and the
 * printed brows sit at 0.77. The band bottoms out at 0.84 to leave them showing,
 * and the crown flares *outward* on the way up to a top plate wider than the
 * band — that overhang is what reads as a peaked cap rather than a lid.
 *
 * The peak is a squashed disc, its back half buried in the head, tilted down 18
 * degrees so a front camera sees its top face as a wide shelf instead of an
 * edge-on line. Its centre sits at the band's own bottom edge so the two touch;
 * lift it clear and a stripe of yellow head shows through at the temples.
 */
function officerCap(o = {}) {
  const cloth = o.color ?? X.officer;
  const BAND = 0.84;
  const CROWN = BAND + 0.16;
  const TOP = CROWN + 0.22;                          // underside of the top plate
  const TILT = 0.36;
  return assemble([
    paint(at(cyl(0.63, 0.16, { seg: 22 }), 0, BAND, 0), C.black),
    paint(at(cyl(0.63, 0.22, { seg: 22, rTop: 0.7 }), 0, CROWN, 0), cloth),
    paint(at(cyl(0.73, 0.06, { seg: 24 }), 0, TOP, 0), cloth),
    // dark rim round the top plate: the cap's outermost silhouette, and the line
    // that separates crown from plate at every camera angle
    paint(at(arcShell(0.735, 0.035, { span: Math.PI * 2, seg: 24 }), 0, TOP + 0.005, 0), 0x4c534c),
    // Peak. Its half-width stays *inside* the band radius: any wider and the
    // parts of the oval abreast of the head stick out as two horizontal wings
    // with daylight under them, which reads as a frisbee through the skull.
    // Tilting it 20 degrees is what turns it from an edge-on line into a shelf
    // for a camera at eye level.
    paint(at(rot(ovalDisc(0.6, 0.56, 0.1, C.black, 24), -TILT, 0, 0), 0, BAND + 0.02, -0.22), C.black),
    // rank disc on the crown front, above the peak's shelf
    paint(at(cyl(0.075, 0.05, { seg: 12 }), 0, CROWN + 0.08, -0.64), C.silver),
    // braid across the band, sitting on the peak's back edge
    paint(at(arcShell(0.64, 0.022, { span: 2.9, center: Math.PI, seg: 16 }), 0, BAND + 0.08, 0), C.silver),
  ]);
}

/** Oval plate: a disc of radius rx squashed to rz along Z. Base at y = 0. */
function ovalDisc(rx, rz, h, color, seg = 20) {
  const m = paint(cyl(rx, h, { seg }), color);
  m.scale.z = rz / rx;
  return m;
}

/** Jawa hood: open at the front, deep shadow inside. */
function jawaHood(o = {}) {
  const cloth = o.color ?? X.jawaBrown;
  return assemble([
    paint(at(arcShell(0.76, 1.0, { span: 4.9, center: 0, seg: 22, rTop: 0.5 }), 0, 0.16, 0), cloth),
    paint(at(cone(0.52, 0.1, 0.42, { seg: 20 }), 0, 1.14, 0), cloth),
    // brow of the hood, casting shade over the eyes
    paint(at(arcShell(0.78, 0.3, { span: 2.9, center: Math.PI, seg: 18, rTop: 0.62 }), 0, 0.82, 0), cloth),
    paint(at(arcShell(0.8, 0.12, { span: 2.9, center: Math.PI, seg: 18 }), 0, 0.78, 0), 0x3a2517),
    // shoulder cowl
    paint(at(cone(0.95, 0.74, 0.3, { seg: 22 }), 0, -0.28, 0), cloth),
  ]);
}

/**
 * Hooded cowl for the old man.
 *
 * The cloth comes forward to within 50 degrees of dead front, close enough to
 * frame the cheeks, and is bridged above the forehead by a brow arch — without
 * it the hood is two thin edges either side of the face and a cap on top. The
 * arch starts at 0.98, clear of the printed brows at 0.75..0.83, so the whole
 * face stays lit: a hood that overhangs the eyes reads as a blank.
 */
function robeHood(o = {}) {
  const cloth = o.color ?? C.brown;
  const R = 0.78;
  const OPEN = 1.75;                                 // 100 degrees of clear air
  const SPAN = Math.PI * 2 - OPEN;
  return assemble([
    // crown, nape and cheeks
    paint(at(arcShell(R, 0.96, { span: SPAN, center: 0, seg: 24, rTop: 0.64 }), 0, 0.32, 0), cloth),
    // Brow arch bridging the opening. Its radius has to stay inside the crown's
    // taper — 0.68 at this height — or it breaks out through the side of the hood
    // and leaves a step at each temple.
    paint(at(arcShell(0.66, 0.3, { span: OPEN + 0.5, center: Math.PI, seg: 16, rTop: 0.56 }),
      0, 0.98, 0), cloth),
    // rounded peak: a cone tapering to a point reads as a wizard's hat from behind
    at(domeMesh(0.64, 0.3, cloth, 20), 0, 1.28, 0),
    // rolled edge of the opening, framing the face without shading it
    paint(at(arcShell(R + 0.02, 0.15, { span: SPAN, center: 0, seg: 24 }), 0, 0.3, 0), 0x40291a),
    paint(at(arcShell(0.672, 0.08, { span: OPEN + 0.5, center: Math.PI, seg: 16 }), 0, 0.96, 0), 0x40291a),
    // cowl over the shoulders
    paint(at(arcShell(0.86, 0.4, { span: 4.4, center: 0, seg: 24 }), 0, -0.1, 0), cloth),
    paint(at(cone(1.02, 0.84, 0.34, { seg: 22 }), 0, -0.38, 0), cloth),
  ]);
}

/**
 * Swept hair piece.
 *
 * The printed eyebrows occupy local y 0.73..0.79 on the head, so the hairline
 * across the brow has to stay above 0.80 or the figure loses its expression.
 * The sides and nape drop much lower, which is what stops the piece reading as
 * a bald cap and gives the buns some hair to emerge from.
 */
function hairPiece(o = {}) {
  const color = o.color ?? X.brownHair;
  const R = 0.638;
  const front = o.front ?? 0.82;
  const sides = o.sides ?? (o.buns ? 0.34 : 0.52);
  const parts = [
    at(domeMesh(R, 0.42, color, 24), 0, 0.98, 0),
    paint(at(arcShell(R, 0.98 - front, { span: Math.PI * 2, seg: 26 }), 0, front, 0), color),
    paint(at(arcShell(R, front - sides, { span: 4.1, center: 0, seg: 22 }), 0, sides, 0), color),
    // fringe swept toward the figure's right, sitting proud of the hairline
    paint(at(arcShell(R + 0.02, 0.16, { span: 1.7, center: Math.PI + 0.4, seg: 14 }), 0, front, 0), color),
  ];
  if (o.buns) {
    // Side buns: three coils stacked outward along X. The rotation sign has to
    // follow the side, or one bun ends up pointing into the skull.
    for (const sx of [1, -1]) {
      const spin = -sx * Math.PI / 2;
      parts.push(paint(at(rot(cyl(0.32, 0.2, { seg: 18 }), 0, 0, spin), sx * 0.48, 0.56, 0.06), color));
      parts.push(paint(at(rot(cyl(0.24, 0.12, { seg: 16 }), 0, 0, spin), sx * 0.68, 0.56, 0.06), color));
      parts.push(paint(at(rot(cyl(0.11, 0.07, { seg: 12 }), 0, 0, spin), sx * 0.8, 0.56, 0.06), 0x2a1608));
    }
  }
  if (o.long) {
    parts.push(paint(at(arcShell(R + 0.01, sides - 0.02, { span: 3.2, center: 0, seg: 20, rTop: 0.72 }),
      0, 0.02, 0), color));
  }
  return assemble(parts);
}

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */

/**
 * Hand blaster. Grip at the origin, barrel down -Z, bar axis +Y — the
 * convention attachToHand() expects.
 * `userData.muzzle` is an anchor at the bore for bolt spawning.
 */
export function blaster(o = {}) {
  const body = o.color ?? C.black;
  const g = group(
    paint(at(tile(0.18, 0.24, 0.44), 0, -0.22, 0.04), body),                    // grip
    paint(at(tile(0.2, 0.62, 0.24), 0, 0.1, -0.18), body),                      // receiver
    paint(at(rot(cyl(0.07, 0.34, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.22, -0.62), body),
    paint(at(rot(cyl(0.09, 0.08, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.22, -0.78), C.darkGray),
    paint(at(tile(0.12, 0.16, 0.12), 0, 0.0, -0.1), C.darkGray),                // trigger guard
    paint(at(tile(0.14, 0.2, 0.08), 0, 0.26, -0.28), C.silver),                 // sight
  );
  const muzzle = at(new THREE.Object3D(), 0, 0.22, -0.84);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.length = 0.9;
  g.name = 'blaster';
  return g;
}

/** Imperial issue long blaster (the trooper carbine). */
export function blasterRifle(o = {}) {
  const body = o.color ?? C.black;
  const g = group(
    paint(at(tile(0.18, 0.24, 0.4), 0, -0.2, 0.06), body),                      // grip
    paint(at(tile(0.22, 1.0, 0.26), 0, 0.08, -0.3), body),                      // receiver
    paint(at(rot(cyl(0.065, 0.8, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.2, -1.15), body),
    paint(at(rot(cyl(0.085, 0.1, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.2, -1.55), C.darkGray),
    paint(at(tile(0.16, 0.3, 0.14), 0, 0.28, -0.5), C.darkGray),                // scope block
    paint(at(rot(cyl(0.06, 0.34, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.36, -0.5), C.darkGray),
    paint(at(tile(0.14, 0.44, 0.1), 0, 0.06, 0.34), C.darkGray),                // folding stock
    paint(at(tile(0.12, 0.1, 0.3), 0, -0.1, 0.5), C.darkGray),
    paint(at(tile(0.2, 0.16, 0.1), 0, -0.06, -0.62), C.darkGray),               // fore grip
  );
  const muzzle = at(new THREE.Object3D(), 0, 0.2, -1.62);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.length = 1.8;
  g.name = 'blasterRifle';
  return g;
}

/**
 * Lightsaber. Hilt along +Y from the grip at the origin.
 * `userData.setBlade(0..1)` extends the blade, `userData.bladeTip` tracks the
 * point for clash sparks.
 */
export function saber(o = {}) {
  const color = o.color ?? C.red;
  const len = o.length ?? 2.3;
  const g = group(
    paint(at(cyl(0.085, 0.5, { seg: 12 }), 0, -0.16, 0), C.silver),
    paint(at(cyl(0.1, 0.07, { seg: 12 }), 0, -0.2, 0), C.black),
    paint(at(cyl(0.098, 0.05, { seg: 12 }), 0, -0.02, 0), C.black),
    paint(at(cyl(0.098, 0.05, { seg: 12 }), 0, 0.16, 0), C.black),
    paint(at(cyl(0.105, 0.08, { seg: 12 }), 0, 0.34, 0), C.darkGray),
    paint(at(tile(0.06, 0.06, 0.12), 0.09, 0.02, 0), C.red),
  );
  const bladeG = at(new THREE.Group(), 0, 0.42, 0);
  const core = cyl(0.05, len, { seg: 10, glow: true, color: 0xfff4ee });
  const halo = cyl(0.1, len, { seg: 12, glow: true, color, opacity: 0.42 });
  const cap = at(sphere(0.1, { seg: 10, glow: true, color, opacity: 0.42 }), 0, len - 0.1, 0);
  bladeG.add(core, halo, cap);
  g.add(bladeG);
  const tip = at(new THREE.Object3D(), 0, 0.42 + len, 0);
  g.add(tip);
  g.userData.bladeTip = tip;
  g.userData.bladeLength = len;
  g.userData.setBlade = (u) => {
    const k = Math.max(0, Math.min(1, u));
    bladeG.visible = k > 0.001;
    core.scale.y = k;
    halo.scale.y = k;
    cap.position.y = len * k - 0.1;
    tip.position.y = 0.42 + len * k;
  };
  g.userData.setBlade(o.extend ?? 1);
  g.name = 'saber';
  return g;
}

/** The princess's message disc: a silver puck projecting a blue hologram. */
export function holodisc(o = {}) {
  const g = group(
    paint(at(cyl(0.3, 0.12, { seg: 20 }), 0, -0.06, 0), C.silver),
    paint(at(cyl(0.32, 0.05, { seg: 20 }), 0, -0.1, 0), C.darkGray),
  );
  const face = panel(0.5, 0.5, holoTex(), {});
  rot(face, -Math.PI / 2, 0, 0);
  at(face, 0, 0.065, 0);
  face.castShadow = false;
  g.add(face);
  // projection cone
  const beam = at(cone(0.08, 0.44, 0.62, { seg: 16, glow: true, color: C.transBlue, opacity: 0.22 }), 0, 0.07, 0);
  g.add(beam);
  g.userData.beam = beam;
  g.userData.gripOffset = [0, -0.02, 0.05];
  // tip the puck back in the palm so the printed face and the beam both read
  g.userData.gripRot = [-1.0, 0, 0];
  g.name = 'holodisc';
  return g;
}

function holoTex() {
  return flatTex([
    `<circle cx="64" cy="64" r="62" fill="#161d24"/>`,
    `<circle cx="64" cy="64" r="62" fill="none" stroke="#b8bcbe" stroke-width="5"/>`,
    `<circle cx="64" cy="64" r="44" fill="none" stroke="#57d0ff" stroke-width="2.5" opacity="0.9"/>`,
    `<circle cx="64" cy="64" r="26" fill="none" stroke="#57d0ff" stroke-width="2" opacity="0.7"/>`,
    `<g stroke="#57d0ff" stroke-width="2" opacity="0.8">`
    + `<path d="M64 6 L64 122"/><path d="M6 64 L122 64"/>`
    + `<path d="M24 24 L104 104"/><path d="M104 24 L24 104"/></g>`,
    `<circle cx="64" cy="64" r="9" fill="#8de4ff"/>`,
    `<g fill="#57d0ff" opacity="0.85">`
    + `<rect x="20" y="18" width="16" height="4"/><rect x="92" y="106" width="16" height="4"/></g>`,
  ].join(''));
}

/** Data card: the stolen plans, held like a tile. */
export function datacard(o = {}) {
  const g = group(paint(at(tile(0.52, 0.1, 0.72), 0, -0.1, 0), o.color ?? C.darkGray));
  const face = frontPanel(0.46, 0.66, datacardTex(), 0, 0.26, -0.06);
  g.add(face);
  g.userData.gripOffset = [0, 0.06, 0];
  g.name = 'datacard';
  return g;
}

function datacardTex() {
  return flatTex([
    `<rect width="128" height="128" fill="#10161b"/>`,
    `<rect x="6" y="6" width="116" height="116" fill="none" stroke="#57d0ff" stroke-width="2.5"/>`,
    `<circle cx="64" cy="52" r="30" fill="none" stroke="#57d0ff" stroke-width="3"/>`,
    `<circle cx="52" cy="42" r="8" fill="none" stroke="#57d0ff" stroke-width="2.5"/>`,
    `<path d="M34 52 L94 52" stroke="#57d0ff" stroke-width="2"/>`,
    `<path d="M64 22 L64 82" stroke="#57d0ff" stroke-width="1.5" opacity="0.7"/>`,
    `<g fill="#57d0ff" opacity="0.85">`
    + `<rect x="18" y="94" width="44" height="5"/><rect x="18" y="104" width="70" height="5"/>`
    + `<rect x="18" y="114" width="30" height="4"/><rect x="70" y="94" width="40" height="5"/></g>`,
  ].join(''));
}

/** Classic two-barrel binoculars. */
export function binoculars(o = {}) {
  const body = o.color ?? C.black;
  const g = group(
    paint(at(rot(cyl(0.13, 0.44, { seg: 12 }), Math.PI / 2, 0, 0), 0.14, 0.24, -0.1), body),
    paint(at(rot(cyl(0.13, 0.44, { seg: 12 }), Math.PI / 2, 0, 0), -0.14, 0.24, -0.1), body),
    paint(at(tile(0.4, 0.16, 0.16), 0, 0.16, -0.1), body),
    paint(at(tile(0.14, 0.14, 0.34), 0, -0.14, 0.02), body),
  );
  for (const sx of [1, -1]) {
    g.add(at(rot(cyl(0.1, 0.03, { seg: 12, glow: true, color: C.transBlue, opacity: 0.6 }),
      Math.PI / 2, 0, 0), sx * 0.14, 0.24, -0.33));
  }
  g.userData.gripOffset = [0, 0.04, 0];
  g.name = 'binoculars';
  return g;
}

/** Macrobinoculars: the boxy desert pair, for scanning dunes. */
export function macrobinoculars(o = {}) {
  const body = o.color ?? C.darkGray;
  const g = group(
    paint(at(tile(0.62, 0.4, 0.36), 0, 0.14, -0.16), body),
    paint(at(tile(0.7, 0.14, 0.2), 0, 0.2, -0.06), C.black),
    paint(at(rot(cyl(0.13, 0.16, { seg: 12 }), Math.PI / 2, 0, 0), 0.17, 0.24, -0.42), C.black),
    paint(at(rot(cyl(0.13, 0.16, { seg: 12 }), Math.PI / 2, 0, 0), -0.17, 0.24, -0.42), C.black),
    paint(at(tile(0.16, 0.16, 0.36), 0, -0.14, 0.0), C.black),
    paint(at(tile(0.1, 0.1, 0.22), 0.28, 0.36, -0.1), C.silver),
  );
  for (const sx of [1, -1]) {
    g.add(at(rot(cyl(0.11, 0.03, { seg: 12, glow: true, color: C.transBlue, opacity: 0.5 }),
      Math.PI / 2, 0, 0), sx * 0.17, 0.24, -0.51));
  }
  g.userData.gripOffset = [0, 0.02, 0.02];
  g.name = 'macrobinoculars';
  return g;
}

/* ------------------------------------------------------------------ */
/* characters                                                          */
/* ------------------------------------------------------------------ */

/**
 * Attach a prop and remember it on the figure. Props ride an animated hand, so
 * they are tagged noBake to survive a bake() by scene code.
 */
function hold(fig, prop, side = 'R') {
  attachToHand(fig, prop, side);
  markNoBake(prop);
  fig.userData.props = fig.userData.props || {};
  fig.userData.props[prop.name || 'prop'] = prop;
  return prop;
}

/** Weapon-ready stance: two hands on the weapon, muzzle level and forward. */
function readyPose(fig, o = {}) {
  if (o.oneHanded) {
    return pose(fig, {
      armR: o.armR ?? 0.5,
      armL: o.armL ?? 0.2,
      handR: o.handR ?? -0.5,
      lean: 0.03,
      legR: -0.05,
      legL: 0.05,
    });
  }
  return aimBlaster(fig, { twoHanded: true, pitch: o.pitch ?? 0.06, lean: 0.05 });
}

/** Imperial stormtrooper: white armour over a black bodysuit. */
export function stormtrooper(o = {}) {
  const shell = o.color ?? C.white;
  const fig = minifig({
    head: C.black,
    torso: shell,
    arms: shell,
    hands: shell,
    legs: shell,
    hips: C.black,
    boots: shell,
    torsoTex: trooperTorsoTex({ color: shell, dirty: o.dirty }),
    backTex: trooperBackTex({ color: shell, dirty: o.dirty }),
    legTex: trooperHipsTex({ dirty: o.dirty }),
    hat: trooperHelmet({ color: shell, dirty: o.dirty }),
  });
  if (o.prop !== false) hold(fig, blasterRifle(), 'R');
  readyPose(fig);
  fig.userData.char = o.char || 'stormtrooper';
  return fig;
}

function trooperHipsTex(o = {}) {
  return hipsTex([
    `<rect width="160" height="56" fill="#e8e9e7"/>`,
    // thigh plates over a black gap at the crotch
    `<path d="M68 0 L92 0 L86 56 L74 56 Z" fill="${hx(C.black)}"/>`,
    `<rect x="0" y="42" width="160" height="14" fill="${hx(C.black)}" opacity="0.9"/>`,
    `<rect x="6" y="4" width="56" height="34" rx="5" fill="none" stroke="#8f9599" stroke-width="3"/>`,
    `<rect x="98" y="4" width="56" height="34" rx="5" fill="none" stroke="#8f9599" stroke-width="3"/>`,
    `<g stroke="#8f9599" stroke-width="2.5" fill="none">`
    + `<path d="M14 10 L14 32"/><path d="M146 10 L146 32"/></g>`,
    o.dirty ? `<g opacity="0.4" fill="${hx(0xa08a5e)}"><path d="M20 20 q40 14 60 4 l0 14 -66 0 z"/>`
      + `<path d="M100 24 q30 8 44 -4 l4 16 -50 4 z"/></g>` : '',
  ].join(''));
}

/** Sandtrooper: weathered armour, orange pauldron, field pack. */
export function sandtrooper(o = {}) {
  const fig = stormtrooper({ color: o.color ?? X.grime, dirty: true, prop: false, char: 'sandtrooper' });
  const q = fig.userData.parts;
  // Pauldron over the figure's right shoulder: a drape, not a barrel.
  //
  // Everything is concentric on the shoulder pivot (x 0.9, y 1.28 in torso
  // space), not on the torso: a torso-concentric arc wide enough to clear the
  // arm socket stands half a unit off the chest. A curved wall wraps the outside
  // of the arm from chest to shoulder blade, a squashed dome caps it, and a bib
  // hangs down the chest.
  //
  // Three clearances set the numbers. The radius has to be at least 0.56 or the
  // drape's front and back edges sink inside the torso faces at z = +-0.53 and
  // only a sliver stays visible; it is flattened to 0.72 in X instead, because at
  // a true 0.58 it clears the arm by a third of a unit and reads as a barrel. The
  // bib stops at x = 0.78, inboard of the arm's swing, and the gap it leaves is
  // covered by the arm itself. And the cone on top has to stay wide enough to
  // swallow the shoulder ball all the way to 1.4 — taper it any harder and the
  // ball's white crown surfaces through the orange. Above the drape the torso's
  // own shoulder corner takes over, which is as high as anything can go here:
  // the helmet's jaw flares to 0.74 at 1.56 and leaves no room.
  const shade = o.pauldron ?? C.orange;
  const SX = MINIFIG.shoulderX;
  const R = 0.58;
  const SPAN = 3.4;
  const CEN = Math.PI / 2;                           // centred on +X, the outer flank
  const HEM = 0.86;
  const CAP = 1.24;                                  // where the wall gives way to the cone
  const squash = (m) => { m.scale.x = 0.72; return m; };
  // bib down the chest: hem angled up toward the neck, top tucked under the cone
  const bib = [[0.28, 0.96], [0.78, 0.8], [0.78, 1.32], [0.28, 1.32]];
  const piping = [[0.28, 0.96], [0.78, 0.8], [0.78, 0.92], [0.28, 1.08]];
  const pauldron = assemble([
    squash(paint(at(arcShell(R, CAP - HEM, { span: SPAN, center: CEN, seg: 18 }), SX, HEM, 0), shade)),
    squash(paint(at(cone(R, 0.42, 0.16, { seg: 20 }), SX, CAP, 0), shade)),
    paint(at(slab(bib, 0.09), 0, 0, -0.575), shade),
    // darker piping along both hems
    squash(paint(at(arcShell(R + 0.02, 0.1, { span: SPAN, center: CEN, seg: 18 }), SX, HEM, 0), C.darkOrange)),
    paint(at(slab(piping, 0.11), 0, 0, -0.575), C.darkOrange),
  ]);
  q.torso.add(pauldron);
  // field pack
  const pack = assemble([
    paint(at(tile(1.1, 0.44, 1.0), 0, 0, 0), C.darkGray),
    paint(at(tile(1.16, 0.16, 0.3), 0, 0.6, 0), C.bluishGray),
    paint(at(rot(cyl(0.16, 0.9, { seg: 12 }), 0, 0, Math.PI / 2), 0, 0.34, 0.16), C.black),
    paint(at(cyl(0.13, 0.5, { seg: 12 }), 0.36, 0.98, 0), C.black),
    paint(at(tile(0.3, 0.2, 0.22), -0.34, 0.98, 0), C.darkOrange),
  ]);
  at(pack, 0, 0.38, 0.74);
  q.torso.add(pack);
  markNoBake(q.torso);
  if (o.prop !== false) hold(fig, blasterRifle(), 'R');
  readyPose(fig);
  fig.userData.char = 'sandtrooper';
  return fig;
}

/** Darth Vader: black armour, flared helmet, long cape, red blade. */
export function vader(o = {}) {
  const fig = minifig({
    head: C.black,
    torso: C.black,
    arms: C.black,
    hands: C.black,
    legs: C.black,
    hips: C.black,
    torsoTex: vaderTorsoTex(),
    legTex: vaderHipsTex(),
    hat: vaderHelmet(),
    cape: {
      color: o.capeColor ?? C.black,
      length: o.capeLength ?? 3.3,
      width: 1.9,
      widthBottom: 2.6,
      segs: 5,
      y: 1.5,
      z: 0.52,
    },
  });
  const q = fig.userData.parts;
  // raised chest control box, printed
  const box = assemble([
    paint(at(tile(0.98, 0.14, 0.46), 0, 0, 0), C.black),
  ], [frontPanel(0.94, 0.42, vaderChestTex(), 0, 0.23, -0.09)]);
  at(box, 0, 0.86, -0.53);
  q.torso.add(box);
  // shoulder armour ridges
  for (const sx of [1, -1]) {
    q.torso.add(paint(at(rot(slab([[-0.34, 0], [0.34, 0], [0.24, 0.22], [-0.3, 0.16]], 0.9), 0, 0, sx * 0.22),
      sx * 0.72, 1.32, 0), C.darkGray));
  }
  // cape collar
  q.torso.add(paint(at(arcShell(0.62, 0.42, { span: 4.2, center: 0, seg: 18, rTop: 0.78 }), 0, 1.44, 0.06), C.black));
  markNoBake(q.torso);
  const s = saber({ color: o.saberColor ?? C.red, length: o.bladeLength ?? 2.4 });
  if (o.prop !== false) {
    hold(fig, s, 'R');
    s.userData.setBlade(o.extend ?? 1);
  }
  fig.userData.saber = s;
  pose(fig, { armR: 0.34, armL: 0.16, handR: -0.4, legR: -0.05, legL: 0.05, lean: 0.02 });
  capeSim(fig, 0, null);
  fig.userData.char = 'vader';
  return fig;
}

function vaderHipsTex() {
  return hipsTex([
    `<rect width="160" height="56" fill="#151b21"/>`,
    `<rect x="0" y="0" width="160" height="16" fill="#20272e"/>`,
    `<g fill="#0e1216" stroke="#6b757d" stroke-width="1.5">`
    + `<rect x="10" y="2" width="26" height="12" rx="2"/><rect x="124" y="2" width="26" height="12" rx="2"/></g>`,
    `<g stroke="#6b757d" stroke-width="2" opacity="0.6">`
    + `<path d="M40 22 L40 52"/><path d="M120 22 L120 52"/></g>`,
    `<rect x="58" y="0" width="44" height="20" rx="3" fill="#0e1216" stroke="#8b949a" stroke-width="2"/>`,
  ].join(''));
}

/** Rebel fleet trooper: tan fatigues, blue trousers, crash helmet. */
export function rebelTrooper(o = {}) {
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({ skin: o.skin ?? C.yellow, mouth: 'grim', brow: 0x3a2a18 }),
    torso: X.rebelTan,
    arms: X.rebelTan,
    hands: o.skin ?? C.yellow,
    legs: C.sandBlue,
    hips: C.sandBlue,
    boots: C.darkGray,
    torsoTex: rebelTorsoTex(),
    backTex: rebelBackTex(),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.sandBlue)}"/>`,
      `<rect x="0" y="0" width="160" height="18" fill="#eceade"/>`,
      `<rect x="58" y="0" width="44" height="22" rx="3" fill="#8b949a"/>`,
      `<rect x="112" y="20" width="30" height="26" rx="3" fill="#2f3840"/>`,
    ].join('')),
    hat: rebelHelmet({ color: o.helmet ?? X.helmetTan }),
  });
  if (o.prop !== false) hold(fig, blaster(), 'R');
  readyPose(fig, { armR: 0.5, armL: 0.2, handR: -0.6, handL: 0 });
  fig.userData.char = 'rebelTrooper';
  return fig;
}

/** The princess: white gown, side buns, holo-disc. */
export function princess(o = {}) {
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({
      skin: o.skin ?? C.yellow, brow: 0x4a2a15, eyeR: 12.5, mouth: 'smile',
      lashes: true, cheeks: true,
    }),
    torso: C.white,
    arms: C.white,
    hands: o.skin ?? C.yellow,
    torsoTex: princessTorsoTex(),
    backTex: princessBackTex(),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="#f6f7f4"/>`,
      `<rect x="0" y="0" width="160" height="14" fill="#b8bcbe"/>`,
      `<g fill="#8b949a"><rect x="14" y="2" width="14" height="9" rx="2"/><rect x="40" y="2" width="14" height="9" rx="2"/>`
      + `<rect x="66" y="2" width="14" height="9" rx="2"/><rect x="92" y="2" width="14" height="9" rx="2"/>`
      + `<rect x="118" y="2" width="14" height="9" rx="2"/></g>`,
    ].join('')),
    skirt: { color: C.white, rTop: 0.8, rBottom: 1.16, length: 1.94, shoes: C.veryLightGray },
    hat: hairPiece({ color: o.hair ?? X.brownHair, buns: true, long: true }),
  });
  if (o.prop !== false) hold(fig, holodisc(), 'L');
  // arm out to the side, not across the chest, so the gown print stays visible
  pose(fig, { armR: 0.12, armL: { x: 0.46, z: -0.3 }, handL: -0.5, handR: 0 });
  fig.userData.char = 'princess';
  return fig;
}

/** Rebel pilot. `o.color` is the squadron colour. */
export function pilot(o = {}) {
  const stripe = o.color ?? C.red;
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({ skin: o.skin ?? C.yellow, mouth: 'grim' }),
    torso: C.orange,
    arms: C.orange,
    hands: C.darkGray,
    legs: C.orange,
    hips: C.darkGray,
    boots: C.darkGray,
    torsoTex: pilotTorsoTex({ color: stripe }),
    backTex: pilotBackTex({ color: stripe }),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.orange)}"/>`,
      `<rect x="0" y="0" width="160" height="16" fill="#4a5157"/>`,
      `<rect x="58" y="0" width="44" height="20" rx="3" fill="#c8cacb"/>`,
      `<rect x="8" y="18" width="34" height="30" rx="4" fill="#eceff0"/>`,
      `<rect x="118" y="18" width="34" height="30" rx="4" fill="#2b3238"/>`,
      `<rect x="124" y="24" width="22" height="5" fill="${hx(stripe)}"/>`,
    ].join('')),
    hat: pilotHelmet({ color: stripe }),
  });
  if (o.prop !== false) hold(fig, blaster(), 'R');
  pose(fig, { armR: 0.28, armL: 0.2, handR: -0.4 });
  fig.userData.char = 'pilot';
  return fig;
}

/** Imperial officer: peaked cap, rank badge, code cylinders. */
export function imperialOfficer(o = {}) {
  const cloth = o.color ?? X.officer;
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({ skin: o.skin ?? C.yellow, mouth: 'grim', brow: 0x30251c, browY: 29 }),
    torso: cloth,
    arms: cloth,
    hands: C.black,
    legs: C.black,
    hips: C.black,
    torsoTex: officerTorsoTex({ color: cloth }),
    backTex: officerBackTex({ color: cloth }),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.black)}"/>`,
      `<rect x="0" y="0" width="160" height="12" fill="#20272e"/>`,
      `<rect x="60" y="0" width="40" height="16" rx="3" fill="#8b949a"/>`,
      `<g stroke="#2f353a" stroke-width="3"><path d="M34 16 L34 52"/><path d="M126 16 L126 52"/></g>`,
    ].join('')),
    hat: officerCap({ color: cloth }),
  });
  if (o.prop !== false) hold(fig, datacard(), 'L');
  pose(fig, { armR: 0.06, armL: 0.5, handL: -0.8, lean: -0.03 });
  fig.userData.char = 'imperialOfficer';
  return fig;
}

/** Jawa: short brown robe, hood, two glowing eyes in the shade. */
export function jawa(o = {}) {
  const cloth = o.color ?? X.jawaBrown;
  const fig = minifig({
    short: true,
    head: 0x120c08,
    headTex: jawaFaceTex(),
    torso: cloth,
    arms: cloth,
    hands: cloth,
    legs: cloth,
    hips: cloth,
    torsoTex: jawaTorsoTex(),
    backTex: jawaBackTex(),
    hat: jawaHood({ color: cloth }),
  });
  const q = fig.userData.parts;
  // robe skirt over the short legs
  q.hips.add(markNoBake(paint(at(cone(1.0, 0.84, 1.0, { seg: 22 }), 0, -0.45, 0), cloth)));
  // glowing eyes, sitting just off the face so they bloom
  for (const sx of [1, -1]) {
    q.head.add(at(rot(cyl(0.085, 0.05, { seg: 12, glow: true, color: C.brightYellow }),
      Math.PI / 2, 0, 0), sx * 0.19, 0.62, -0.58));
    q.head.add(at(rot(cyl(0.15, 0.02, { seg: 12, glow: true, color: C.brightYellow, opacity: 0.3 }),
      Math.PI / 2, 0, 0), sx * 0.19, 0.62, -0.6));
  }
  markNoBake(q.head);
  if (o.prop !== false) hold(fig, ionRifle(), 'R');
  pose(fig, { armR: 0.5, armL: 0.34, handR: -0.5, handL: 0.5 });
  fig.userData.char = 'jawa';
  return fig;
}

function jawaFaceTex() {
  return wrapTex([
    bg(0x120c08),
    `<rect x="150" y="0" width="212" height="128" fill="#000" opacity="0.55"/>`,
    `<ellipse cx="256" cy="58" rx="86" ry="44" fill="#000" opacity="0.5"/>`,
    `<circle cx="222" cy="56" r="12" fill="#ffe14a"/><circle cx="290" cy="56" r="12" fill="#ffe14a"/>`,
    `<circle cx="222" cy="56" r="20" fill="#ffd500" opacity="0.28"/>`,
    `<circle cx="290" cy="56" r="20" fill="#ffd500" opacity="0.28"/>`,
    `<circle cx="222" cy="53" r="4" fill="#fffbe0"/><circle cx="290" cy="53" r="4" fill="#fffbe0"/>`,
  ].join(''));
}

/** The jawa's ion blaster: a stubby scavenged rifle. */
function ionRifle() {
  const g = group(
    paint(at(tile(0.16, 0.22, 0.36), 0, -0.18, 0.04), C.reddishBrown),
    paint(at(tile(0.2, 0.5, 0.22), 0, 0.06, -0.14), C.darkGray),
    paint(at(rot(cyl(0.09, 0.3, { seg: 10 }), Math.PI / 2, 0, 0), 0, 0.17, -0.52), C.bluishGray),
    paint(at(rot(cyl(0.13, 0.12, { seg: 12 }), Math.PI / 2, 0, 0), 0, 0.17, -0.7), C.copper),
    paint(at(tile(0.1, 0.1, 0.2), 0, 0.28, -0.2), C.copper),
  );
  const muzzle = at(new THREE.Object3D(), 0, 0.17, -0.78);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.name = 'ionRifle';
  return g;
}

/** The farm boy: cream tunic, sandy hair, macrobinoculars. */
export function farmBoy(o = {}) {
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({ skin: o.skin ?? C.yellow, brow: 0x8a6320, mouth: 'smile', cheeks: true }),
    torso: X.cream,
    arms: X.cream,
    hands: o.skin ?? C.yellow,
    legs: C.veryLightGray,
    hips: C.veryLightGray,
    boots: C.reddishBrown,
    torsoTex: farmBoyTorsoTex(),
    backTex: farmBoyBackTex(),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.veryLightGray)}"/>`,
      `<rect x="0" y="0" width="160" height="15" fill="#4b3520"/>`,
      `<rect x="60" y="0" width="40" height="19" rx="3" fill="#b8bcbe"/>`,
      `<rect x="112" y="16" width="30" height="28" rx="3" fill="#5d4227"/>`,
    ].join('')),
    hat: hairPiece({ color: o.hair ?? X.sandHair }),
  });
  if (o.prop !== false) hold(fig, macrobinoculars(), 'R');
  pose(fig, { armR: 0.42, armL: 0.12, handR: -0.5 });
  fig.userData.char = 'farmBoy';
  return fig;
}

/** The smuggler: white shirt, black vest, blue trousers, holster. */
export function smuggler(o = {}) {
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({ skin: o.skin ?? C.yellow, brow: 0x3a2415, mouth: 'smirk' }),
    torso: C.white,
    arms: C.white,
    hands: o.skin ?? C.yellow,
    legs: C.darkBlue,
    hips: C.darkBlue,
    boots: C.reddishBrown,
    torsoTex: smugglerTorsoTex(),
    backTex: smugglerBackTex(),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.darkBlue)}"/>`,
      `<rect x="0" y="0" width="160" height="14" fill="#3a2a1c"/>`,
      `<rect x="60" y="0" width="40" height="18" rx="3" fill="#b8bcbe"/>`,
      `<rect x="104" y="14" width="42" height="34" rx="4" fill="#2a1c12"/>`,
      `<rect x="112" y="20" width="26" height="6" fill="#8b949a"/>`,
    ].join('')),
    hat: hairPiece({ color: o.hair ?? X.brownHair }),
  });
  const q = fig.userData.parts;
  // thigh holster on the figure's right leg, plus the trouser seam stripes
  if (q.legR) {
    q.legR.add(paint(at(tile(0.2, 0.3, 0.5), 0.24, -0.9, 0.06), C.black));
    q.legR.add(paint(at(rot(cyl(0.07, 0.34, { seg: 8 }), 0.25, 0, 0), 0.24, -1.3, -0.02), C.darkGray));
  }
  // narrow blood stripe down each outer trouser seam
  for (const leg of [q.legR, q.legL]) {
    if (!leg) continue;
    const sx = leg === q.legR ? 1 : -1;
    leg.add(paint(at(tile(0.05, 0.18, 1.0), sx * 0.34, -1.1, -0.08), C.darkRed));
    markNoBake(leg);
  }
  if (o.prop !== false) hold(fig, blaster(), 'R');
  pose(fig, { armR: 0.3, armL: 0.14, handR: -0.4, torsoY: -0.04 });
  fig.userData.char = 'smuggler';
  return fig;
}

/** The old man: brown robe, white beard, blue blade. */
export function oldMan(o = {}) {
  const fig = minifig({
    head: o.skin ?? C.yellow,
    headTex: faceTex({
      skin: o.skin ?? C.yellow, brow: 0xc8c8c0, mouth: 'none', wrinkles: true,
      eyeR: 11.5, browY: 27,
      // Beard, moustache and sideburns. The top edge has to be a V — up to the
      // ears at the sides, dipping under the mouth in the middle — or the white
      // mass reads as a surgical mask straight across the face.
      beard: `<g stroke="#eef0ec" stroke-width="9" stroke-linecap="round" fill="none">`
        + `<path d="M250 72 Q232 74 220 88"/><path d="M262 72 Q280 74 292 88"/></g>`
        + `<path d="M240 84 q16 4 32 0" fill="none" stroke="#8a6a44" stroke-width="4"/>`
        + `<path d="M196 78 Q204 106 210 128 L302 128 Q308 106 316 78`
        + ` Q288 100 256 100 Q224 100 196 78 Z" fill="#e4e6e2"/>`
        + `<path d="M232 108 Q256 100 280 108 L274 128 L238 128 Z" fill="#f4f5f3"/>`
        + `<g stroke="#e4e6e2" stroke-width="8" stroke-linecap="round" fill="none">`
        + `<path d="M190 48 Q192 66 198 82"/><path d="M322 48 Q320 66 314 82"/></g>`
        + `<g fill="none" stroke="#c3c6c2" stroke-width="3">`
        + `<path d="M226 110 q30 9 60 0"/><path d="M236 120 q20 6 40 0"/></g>`,
    }),
    torso: C.tan,
    arms: C.tan,
    hands: o.skin ?? C.yellow,
    legs: C.darkTan,
    hips: C.brown,
    boots: C.reddishBrown,
    torsoTex: robeTorsoTex({ color: C.tan, outer: C.brown }),
    backTex: robeBackTex({ color: C.tan, outer: C.brown }),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(C.brown)}"/>`,
      `<rect x="0" y="0" width="160" height="16" fill="#4b3520"/>`,
      `<rect x="60" y="0" width="40" height="20" rx="3" fill="#8a6a3a"/>`,
      `<path d="M0 16 L60 16 L40 56 L0 56 Z" fill="#6d4224"/>`,
      `<path d="M160 16 L100 16 L120 56 L160 56 Z" fill="#6d4224"/>`,
    ].join('')),
    skirt: { color: C.tan, rTop: 0.86, rBottom: 1.1, length: 1.6, hideLegs: false },
    hat: robeHood({ color: o.robe ?? C.brown }),
  });
  const q = fig.userData.parts;
  // Beard in the round, so it reads from the side too. Its top edge has to stop
  // at 0.2 — the height the printed beard's V bottoms out at — or the piece
  // stands proud of the print and the seam shows as a band across the mouth.
  q.head.add(paint(at(arcShell(0.625, 0.22, { span: 3.4, center: Math.PI, seg: 18, rTop: 0.6 }),
    0, -0.02, 0), 0xe4e6e2));
  q.head.add(paint(at(cone(0.34, 0.12, 0.2, { seg: 16 }), 0, -0.2, -0.06), 0xe4e6e2));
  markNoBake(q.head);
  const s = saber({ color: o.saberColor ?? C.transBlue, length: o.bladeLength ?? 2.2 });
  if (o.prop !== false) {
    hold(fig, s, 'R');
    s.userData.setBlade(o.extend ?? 1);
  }
  fig.userData.saber = s;
  pose(fig, { armR: 0.5, armL: 0.2, handR: -0.3 });
  fig.userData.char = 'oldMan';
  return fig;
}

/** Gold protocol droid: stiff legs, printed faceplate, one silver shin. */
export function protocolDroid(o = {}) {
  const gold = o.color ?? X.pearlGold;
  const fig = minifig({
    head: gold,
    headTex: protocolFaceTex(gold),
    torso: gold,
    arms: gold,
    hands: gold,
    legs: gold,
    hips: gold,
    boots: gold,
    torsoTex: protocolTorsoTex(),
    backTex: protocolBackTex(),
    legTex: hipsTex([
      `<rect width="160" height="56" fill="${hx(gold)}"/>`,
      `<rect x="0" y="0" width="160" height="12" fill="#c1912f"/>`,
      `<g stroke="#8a6a20" stroke-width="3" fill="none">`
      + `<path d="M46 12 L46 56"/><path d="M114 12 L114 56"/><path d="M0 34 L160 34"/></g>`,
      `<circle cx="80" cy="24" r="8" fill="#7a5c1c"/>`,
    ].join('')),
    hat: protocolCrown(gold),
  });
  const q = fig.userData.parts;
  // the mismatched silver shin
  if (o.silverLeg !== false && q.legR) {
    q.legR.traverse((m) => { if (m.isMesh) m.material = mat(X.pearlSilver); });
  }
  // neck servos
  q.torso.add(paint(at(cyl(0.34, 0.12, { seg: 16 }), 0, 1.56, 0), 0xa8801f));
  markNoBake(q.torso);
  pose(fig, {
    armR: 0.26, armL: 0.3, handR: -0.9, handL: 0.9,
    legR: 0.02, legL: -0.02, lean: -0.04, headY: 0.1,
  });
  fig.userData.char = 'protocolDroid';
  return fig;
}

function protocolCrown(gold) {
  return assemble([
    at(domeMesh(0.6, 0.28, gold, 20), 0, 1.0, 0),
    paint(at(cyl(0.28, 0.1, { seg: 14 }), 0, 1.2, 0), 0xa8801f),
    paint(at(rot(cyl(0.16, 0.1, { seg: 12 }), 0, 0, Math.PI / 2), 0.62, 0.62, 0.04), 0xa8801f),
    paint(at(rot(cyl(0.16, 0.1, { seg: 12 }), 0, 0, -Math.PI / 2), -0.62, 0.62, 0.04), 0xa8801f),
  ]);
}

function protocolFaceTex(gold) {
  const dark = '#6b4f14';
  return wrapTex([
    bg(gold),
    `<rect x="0" y="0" width="110" height="128" fill="#000" opacity="0.16"/>`,
    `<rect x="402" y="0" width="110" height="128" fill="#000" opacity="0.16"/>`,
    // faceplate outline
    `<path d="M256 6 L318 18 L330 66 L302 120 L210 120 L182 66 L194 18 Z" fill="#e2b658" stroke="${dark}" stroke-width="3"/>`,
    // brow bar
    `<path d="M198 30 L256 24 L314 30 L312 40 L256 34 L200 40 Z" fill="${dark}"/>`,
    // round photoreceptors
    `<circle cx="222" cy="56" r="19" fill="#7a5c1c"/><circle cx="222" cy="56" r="13" fill="#2a2118"/>`,
    `<circle cx="222" cy="56" r="7" fill="#ffe9a8" opacity="0.9"/>`,
    `<circle cx="290" cy="56" r="19" fill="#7a5c1c"/><circle cx="290" cy="56" r="13" fill="#2a2118"/>`,
    `<circle cx="290" cy="56" r="7" fill="#ffe9a8" opacity="0.9"/>`,
    // nose ridge
    `<path d="M250 44 L262 44 L266 82 L246 82 Z" fill="#c79c33" stroke="${dark}" stroke-width="2"/>`,
    // mouth grille
    `<rect x="226" y="88" width="60" height="22" rx="3" fill="#2a2118"/>`,
    `<g fill="#c79c33"><rect x="231" y="91" width="6" height="16"/><rect x="243" y="91" width="6" height="16"/>`
    + `<rect x="255" y="91" width="6" height="16"/><rect x="267" y="91" width="6" height="16"/>`
    + `<rect x="277" y="91" width="6" height="16"/></g>`,
    // cheek plates + side vents
    `<g fill="none" stroke="${dark}" stroke-width="2.5">`
    + `<path d="M196 66 L206 104"/><path d="M316 66 L306 104"/></g>`,
    `<g fill="${dark}" opacity="0.8">`
    + `<rect x="128" y="46" width="30" height="6" rx="3"/><rect x="128" y="58" width="30" height="6" rx="3"/>`
    + `<rect x="354" y="46" width="30" height="6" rx="3"/><rect x="354" y="58" width="30" height="6" rx="3"/></g>`,
  ].join(''));
}

/* ------------------------------------------------------------------ */
/* astromech                                                           */
/* ------------------------------------------------------------------ */

/**
 * R2-style astromech. Not a minifig: a barrel body on two legs with a
 * retractable centre foot.
 *   userData.dome              the rotating head group (set rotation.y)
 *   userData.setCenterFoot(u)  0 = retracted (two-leg lean), 1 = tripod
 *   userData.roll(distance)    spin the wheels for `distance` world units
 *   userData.projector         anchor at the holoprojector lens
 */
export function astromech(o = {}) {
  const shell = o.color ?? C.white;
  const trim = o.trim ?? C.blue;
  const g = new THREE.Group();
  g.name = 'astromech';

  const FOOT_H = 0.44;
  const BODY_Y = 0.56;
  const BODY_H = 1.78;
  const R = 0.68;

  // body tilts back a little when the centre foot is up
  const lean = new THREE.Group();
  g.add(lean);

  const bodyShell = cyl(R, BODY_H, { seg: 26 });
  bodyShell.material = texMat(astroBodyTex(shell, trim));
  const body = assemble([
    at(bodyShell, 0, 0, 0),
    paint(at(cyl(R + 0.012, 0.1, { seg: 26 }), 0, BODY_H - 0.1, 0), C.silver),
    paint(at(cyl(R + 0.012, 0.08, { seg: 26 }), 0, 0.02, 0), C.silver),
    paint(at(cone(R - 0.04, R - 0.2, 0.12, { seg: 26 }), 0, -0.1, 0), C.bluishGray),
  ]);
  at(body, 0, BODY_Y, 0);
  lean.add(body);

  // dome
  const dome = new THREE.Group();
  at(dome, 0, BODY_Y + BODY_H, 0);
  lean.add(dome);
  const band = arcShell(R + 0.005, 0.26, { span: Math.PI * 2, seg: 26, map: astroDomeTex(shell, trim) });
  dome.add(at(band, 0, 0, 0));
  dome.add(at(domeMesh(R, 0.44, shell, 24), 0, 0.26, 0));
  dome.add(paint(at(cyl(R * 0.55, 0.05, { seg: 20 }), 0, 0.62, 0), trim));
  // main photoreceptor
  dome.add(paint(at(rot(cyl(0.2, 0.06, { seg: 16 }), Math.PI / 2, 0, 0), 0, 0.14, -R - 0.02), C.darkGray));
  dome.add(at(rot(cyl(0.14, 0.04, { seg: 16, glow: true, color: C.transBlue, opacity: 0.85 }),
    Math.PI / 2, 0, 0), 0, 0.14, -R - 0.06));
  // holoprojector
  const proj = paint(at(cyl(0.1, 0.1, { seg: 12 }), 0.24, 0.4, -0.42), C.silver);
  rot(proj, -0.5, 0, 0.2);
  dome.add(proj);
  const projLens = at(new THREE.Object3D(), 0.24, 0.5, -0.46);
  dome.add(projLens);
  dome.add(at(cyl(0.07, 0.03, { seg: 12, glow: true, color: C.transBlue, opacity: 0.7 }), 0.24, 0.47, -0.44));
  dome.add(paint(at(cyl(0.05, 0.24, { seg: 8 }), -0.3, 0.36, 0.3), C.silver));
  markNoBake(dome);

  // side legs: shoulder hub, tapered shin, chunky foot with three wheels
  const wheels = [];
  const WHEEL_R = 0.13;
  const SHOULDER_Y = BODY_Y + 1.22;
  for (const sx of [1, -1]) {
    const leg = new THREE.Group();
    at(leg, sx * (R + 0.19), 0, 0);
    const shin = SHOULDER_Y - FOOT_H;
    const parts = [
      // shoulder joint: a plain disc with a dark centre cap
      paint(at(rot(cyl(0.34, 0.2, { seg: 18 }), 0, 0, Math.PI / 2), sx * -0.1, SHOULDER_Y, 0), C.silver),
      paint(at(rot(cyl(0.15, 0.09, { seg: 12 }), 0, 0, Math.PI / 2), sx * 0.08, SHOULDER_Y, 0), C.darkGray),
      // shin: deep enough to read as a leg from the side, tapering downward
      paint(at(slab([[-0.26, 0], [0.26, 0], [0.22, shin], [-0.22, shin]], 0.54), 0, FOOT_H, 0), shell),
      // shin greeblies on the leading edge and the outer face
      paint(at(tile(0.22, 0.12, 0.46), 0, shin - 0.16, -0.28), trim),
      paint(at(tile(0.32, 0.1, 0.1), 0, shin - 0.3, -0.28), C.bluishGray),
      paint(at(tile(0.16, 0.1, 0.3), 0, FOOT_H + 0.14, 0.27), C.bluishGray),
      paint(at(tile(0.06, 0.34, 0.62), sx * 0.26, FOOT_H + 0.34, 0), C.bluishGray),
      paint(at(tile(0.06, 0.3, 0.12), sx * 0.26, shin - 0.22, 0), trim),
      // foot: boxy, wheels recessed under it
      paint(at(tile(0.54, 0.88, FOOT_H - 0.12), 0, 0.12, -0.06), shell),
      paint(at(tile(0.46, 0.78, 0.13), 0, 0.0, -0.06), C.bluishGray),
      paint(at(tile(0.28, 0.2, 0.14), 0, FOOT_H - 0.02, -0.42), trim),
      paint(at(rot(cyl(0.09, 0.1, { seg: 12 }), Math.PI / 2, 0, 0), 0, 0.24, -0.52), C.darkGray),
    ];
    leg.add(assemble(parts));
    for (const dz of [-0.28, 0, 0.28]) {
      const w = paint(at(rot(cyl(WHEEL_R, 0.18, { seg: 12 }), 0, 0, Math.PI / 2), 0, WHEEL_R, dz), C.black);
      leg.add(w);
      wheels.push(w);
    }
    markNoBake(leg);
    lean.add(leg);
  }

  // retractable centre foot: swings down out of the body's underside
  const centre = new THREE.Group();
  at(centre, 0, BODY_Y, -0.18);
  lean.add(centre);
  const centreLeg = assemble([
    paint(at(slab([[-0.21, 0], [0.21, 0], [0.18, 0.62], [-0.18, 0.62]], 0.42), 0, 0.24, 0), C.bluishGray),
    paint(at(tile(0.48, 0.9, 0.24), 0, 0.0, -0.1), shell),
    paint(at(tile(0.4, 0.8, 0.12), 0, 0.0, -0.1), C.bluishGray),
    paint(at(tile(0.22, 0.16, 0.12), 0, 0.24, -0.48), trim),
  ]);
  at(centreLeg, 0, -BODY_Y, 0);
  centre.add(centreLeg);
  for (const dz of [-0.3, 0.2]) {
    const w = paint(at(rot(cyl(0.11, 0.13, { seg: 12 }), 0, 0, Math.PI / 2), 0, -BODY_Y + 0.11, dz), C.black);
    centre.add(w);
    wheels.push(w);
  }
  markNoBake(centre);

  // Retracting pulls the foot UP into the body; the other sign would sink the
  // whole droid half a unit below the floor.
  const HEEL = 0.41;                           // rear sole corner, z
  const setCenterFoot = (u) => {
    const k = Math.max(0, Math.min(1, u));
    centre.position.y = BODY_Y + (1 - k) * 0.72;
    centre.visible = k > 0.02;
    // rocks back onto the two side legs, pivoting on their rear wheels
    lean.rotation.x = (1 - k) * 0.12;
    lean.position.y = HEEL * Math.sin(lean.rotation.x);
    lean.position.z = (1 - k) * -0.05;
  };
  g.userData.dome = dome;
  g.userData.wheels = wheels;
  g.userData.setCenterFoot = setCenterFoot;
  g.userData.roll = (d) => { for (const w of wheels) w.rotation.x = d / WHEEL_R; };
  g.userData.projector = projLens;
  g.userData.height = BODY_Y + BODY_H + 0.7;
  g.userData.char = 'astromech';
  setCenterFoot(o.centerFoot ?? 1);
  // the body leans and the whole droid drives, so nothing here may be welded
  // into a static scene mesh; the parts are already merged internally
  markNoBake(g);
  return g;
}

function astroBodyTex(shell, trim) {
  const s = hx(shell);
  const t = hx(trim);
  const line = '#8f9599';
  // the front of the body sits at x = 256
  return wrapTex([
    bg(shell),
    `<rect x="0" y="0" width="96" height="128" fill="#000" opacity="0.13"/>`,
    `<rect x="416" y="0" width="96" height="128" fill="#000" opacity="0.13"/>`,
    // shoulder band
    `<rect x="0" y="0" width="512" height="10" fill="${line}"/>`,
    `<rect x="0" y="10" width="512" height="7" fill="${t}"/>`,
    // front centre panel stack
    `<rect x="212" y="24" width="88" height="34" rx="3" fill="#dfe1dd" stroke="${line}" stroke-width="2.5"/>`,
    `<g fill="${t}"><rect x="218" y="30" width="30" height="9"/><rect x="218" y="44" width="16" height="9"/>`
    + `<rect x="240" y="44" width="26" height="9"/></g>`,
    `<g fill="#c91a09"><rect x="256" y="30" width="12" height="9"/></g>`,
    `<g fill="#2b3238"><rect x="274" y="30" width="20" height="23"/></g>`,
    `<rect x="212" y="64" width="88" height="40" rx="3" fill="#eceff0" stroke="${line}" stroke-width="2.5"/>`,
    `<g stroke="${line}" stroke-width="2" fill="none">`
    + `<path d="M212 78 L300 78"/><path d="M256 64 L256 104"/></g>`,
    `<circle cx="234" cy="71" r="5" fill="${t}"/><circle cx="278" cy="71" r="5" fill="#c91a09"/>`,
    `<g fill="${t}" opacity="0.9"><rect x="218" y="84" width="30" height="14"/><rect x="264" y="84" width="30" height="14"/></g>`,
    // side utility panels
    `<g fill="none" stroke="${line}" stroke-width="2.5">`
    + `<rect x="150" y="26" width="46" height="70" rx="3"/><rect x="316" y="26" width="46" height="70" rx="3"/></g>`,
    `<g fill="${t}" opacity="0.85"><rect x="156" y="32" width="34" height="12"/><rect x="322" y="32" width="34" height="12"/></g>`,
    `<g fill="#2b3238" opacity="0.8"><rect x="156" y="52" width="34" height="8"/><rect x="322" y="52" width="34" height="8"/>`
    + `<rect x="156" y="66" width="34" height="8"/><rect x="322" y="66" width="34" height="8"/></g>`,
    // back vents
    `<g fill="#2b3238" opacity="0.8">`
    + `<rect x="30" y="34" width="52" height="10" rx="4"/><rect x="30" y="50" width="52" height="10" rx="4"/>`
    + `<rect x="30" y="66" width="52" height="10" rx="4"/>`
    + `<rect x="430" y="34" width="52" height="10" rx="4"/><rect x="430" y="50" width="52" height="10" rx="4"/>`
    + `<rect x="430" y="66" width="52" height="10" rx="4"/></g>`,
    // lower band
    `<rect x="0" y="108" width="512" height="8" fill="${line}"/>`,
    `<rect x="0" y="116" width="512" height="12" fill="${t}" opacity="0.85"/>`,
  ].join(''));
}

function astroDomeTex(shell, trim) {
  const t = hx(trim);
  return wrapTex([
    bg(shell),
    `<rect x="0" y="0" width="96" height="128" fill="#000" opacity="0.13"/>`,
    `<rect x="416" y="0" width="96" height="128" fill="#000" opacity="0.13"/>`,
    // eye surround
    `<path d="M214 0 L298 0 L298 128 L214 128 Z" fill="#2b3238"/>`,
    `<path d="M222 8 L290 8 L290 120 L222 120 Z" fill="#1b2129"/>`,
    // blue dome wedges
    `<g fill="${t}">`
    + `<path d="M96 0 L156 0 L146 90 L106 90 Z"/>`
    + `<path d="M356 0 L416 0 L406 90 L366 90 Z"/>`
    + `<path d="M20 0 L60 0 L54 60 L26 60 Z"/>`
    + `<path d="M452 0 L492 0 L486 60 L458 60 Z"/></g>`,
    `<g fill="#8f9599">`
    + `<rect x="160" y="20" width="26" height="70" rx="3"/><rect x="326" y="20" width="26" height="70" rx="3"/></g>`,
    `<rect x="0" y="118" width="512" height="12" fill="#8f9599"/>`,
  ].join(''));
}

/**
 * Mouse droid: a knee-high wedge that scoots along Imperial corridors.
 * userData.roll(distance) spins its wheels.
 */
export function mouseDroid(o = {}) {
  const body = o.color ?? C.black;
  const g = new THREE.Group();
  g.name = 'mouseDroid';
  const wheels = [];
  const WHEEL_R = 0.075;
  const DECK = 0.06;
  // slope() puts its ramp along X and extrudes along Z, so the width and depth
  // arguments swap when it is turned to face -Z.
  const solids = [
    paint(at(rot(slope(0.9, 0.56, 0.34, 0.13), 0, Math.PI / 2, 0), 0, DECK + 0.08, 0), body),
    paint(at(tile(0.58, 0.92, 0.1), 0, DECK, 0), C.darkGray),
    // grey skirt band and rear sensor housing
    paint(at(tile(0.6, 0.14, 0.07), 0, DECK + 0.03, -0.36), C.bluishGray),
    paint(at(tile(0.34, 0.14, 0.09), 0, DECK + 0.42, 0.3), C.bluishGray),
  ];
  // The nose is only 0.13 tall, so the print goes on the sloping deck instead:
  // face it up and tilt it by the ramp angle so it sits flush.
  // slope() bevels its outline outward, so the real deck sits ~0.03 above the
  // nominal surface; the decal has to clear that before it will show at all
  const RAMP = Math.atan2(0.34 - 0.13, 0.9);
  const LIFT = 0.05;
  const deck = panel(0.46, 0.8, mouseDeckTex(), {});
  rot(deck, -(Math.PI / 2 + RAMP), 0, 0);
  at(deck, 0, DECK + 0.315 + Math.cos(RAMP) * LIFT, -Math.sin(RAMP) * LIFT);
  deck.userData.noBake = true;
  deck.castShadow = false;
  g.add(assemble(solids, [deck]));
  // nose lamp and a stub antenna canted back
  g.add(at(rot(cyl(0.045, 0.03, { seg: 10, glow: true, color: C.red }), Math.PI / 2, 0, 0),
    -0.14, DECK + 0.14, -0.47));
  g.add(paint(at(rot(cyl(0.022, 0.26, { seg: 6 }), -0.26, 0, 0), 0.16, DECK + 0.4, 0.22), C.bluishGray));
  for (const sx of [1, -1]) {
    for (const dz of [-0.26, 0.26]) {
      const w = paint(at(rot(cyl(WHEEL_R, 0.06, { seg: 10 }), 0, 0, Math.PI / 2),
        sx * 0.26, WHEEL_R, dz), C.darkGray);
      markNoBake(w);
      g.add(w);
      wheels.push(w);
    }
  }
  g.userData.roll = (d) => { for (const w of wheels) w.rotation.x = d / WHEEL_R; };
  g.userData.wheels = wheels;
  g.userData.height = DECK + 0.42;
  g.userData.char = 'mouseDroid';
  markNoBake(g);
  return g;
}

/** Mouse droid deck plate: hatch, vents and a warning flash. viewBox 74 x 128. */
function mouseDeckTex() {
  const line = '#6b757d';
  return flatTex([
    `<rect width="74" height="128" fill="#1b232a"/>`,
    // recessed hatch
    `<rect x="8" y="26" width="58" height="60" rx="4" fill="#141a20" stroke="${line}" stroke-width="2"/>`,
    `<path d="M37 26 L37 86" stroke="${line}" stroke-width="1.6" opacity="0.7"/>`,
    // louvred vents toward the tail
    `<g fill="${line}" opacity="0.85">`
    + `<rect x="14" y="94" width="46" height="4" rx="2"/><rect x="14" y="102" width="46" height="4" rx="2"/>`
    + `<rect x="14" y="110" width="46" height="4" rx="2"/></g>`,
    // hazard flash and sensor strip at the nose
    `<rect x="10" y="8" width="54" height="10" rx="3" fill="#f2cd37"/>`,
    `<g fill="#141a20"><rect x="12" y="8" width="5" height="10"/><rect x="26" y="8" width="5" height="10"/>`
    + `<rect x="40" y="8" width="5" height="10"/><rect x="54" y="8" width="5" height="10"/></g>`,
    `<circle cx="20" cy="44" r="4" fill="#57d0ff"/>`,
    `<circle cx="54" cy="44" r="4" fill="#c91a09"/>`,
  ].join(''), { vw: 74, vh: 128, w: 296, h: 512 });
}

/* ------------------------------------------------------------------ */
/* contact sheet + rig checks                                          */
/* ------------------------------------------------------------------ */

/** Spawn-by-name table, in film order. */
export const CHARACTERS = {
  stormtrooper, sandtrooper, vader, rebelTrooper, princess, pilot,
  imperialOfficer, jawa, farmBoy, smuggler, oldMan,
  protocolDroid, astromech, mouseDroid,
};

/** Character names in the order cast() lays them out. */
export const ROSTER = Object.keys(CHARACTERS);

/** Resolve a factory from a name, a factory, or nothing. */
function factory(which, fallback) {
  if (typeof which === 'function') return which;
  if (typeof which === 'string' && CHARACTERS[which]) return CHARACTERS[which];
  return fallback;
}

/**
 * Every character in the film, in a row, facing -Z, 4 units apart.
 *
 * The row runs toward -X so that a camera in front of it (which sees +X on its
 * left) reads the roster left to right.
 */
export function cast(o = {}) {
  const gap = o.gap ?? 4;
  const names = o.only || ROSTER;
  const g = new THREE.Group();
  g.name = 'cast';
  names.forEach((name, i) => {
    const c = CHARACTERS[name]();
    at(c, ((names.length - 1) / 2 - i) * gap, 0, 0);
    c.userData.char = name;
    g.add(c);
  });
  return g;
}

/**
 * Rig check: one figure at a given walk phase.
 *   preview.html?m=/src/models/characters.js&f=walkTest&args=[0.25]
 *   preview.html?m=/src/models/characters.js&f=walkTest&args=[0.25,{"char":"vader"}]
 */
export function walkTest(phase = 0, o = {}) {
  const fig = factory(o.char || o.make, rebelTrooper)();
  walk(fig, phase, o);
  if (o.char === 'vader') capeSim(fig, phase * 1.2, [0, 0, -4]);
  return fig;
}

/** The named poses the rig ships with, for rig checks and for scene authors. */
const POSES = {
  rest: (f) => pose(f, {}),
  walk0: (f) => walk(f, 0),
  walk25: (f) => walk(f, 0.25),
  walk50: (f) => walk(f, 0.5),
  walk75: (f) => walk(f, 0.75),
  run0: (f) => run(f, 0),
  run15: (f) => run(f, 0.15),
  run25: (f) => run(f, 0.25),
  idle: (f) => idle(f, 1.4, 9),
  aim: (f) => aimBlaster(f, { pitch: 0 }),
  aimUp: (f) => aimBlaster(f, { pitch: 0.55, twoHanded: true }),
  aimDown: (f) => aimBlaster(f, { pitch: -0.4 }),
  aimLeft: (f) => {
    const p = f.userData.props && Object.values(f.userData.props)[0];
    if (p) attachToHand(f, p, 'L');
    return aimBlaster(f, { side: 'L', pitch: 0.25 });
  },
  sit: (f) => sit(f),
  fall20: (f) => fall(f, 0.2),
  fall45: (f) => fall(f, 0.45),
  fall120: (f) => fall(f, 1.2),
};

/**
 * Rig check: one figure in one named pose, for a tight single-figure render.
 *   preview.html?m=/src/models/characters.js&f=poseTest&args=["aimUp"]
 */
export function poseTest(name = 'rest', o = {}) {
  const fig = factory(o.char || o.make, rebelTrooper)();
  (POSES[name] || POSES.rest)(fig);
  return fig;
}

/** Rig check: one figure through the whole animation set, side by side. */
export function poseSheet(o = {}) {
  const make = factory(o.char || o.make, rebelTrooper);
  const names = o.poses || Object.keys(POSES);
  const g = new THREE.Group();
  g.name = 'poseSheet';
  names.forEach((n, i) => {
    const f = make();
    (POSES[n] || POSES.rest)(f);
    at(f, (i - (names.length - 1) / 2) * (o.gap ?? 3.4), 0, 0);
    g.add(f);
  });
  return g;
}

/** Rig check: the cape under wind, over a few time samples. */
export function capeTest(t = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const v = vader();
    at(v, (i - 1.5) * 4, 0, 0);
    capeSim(v, t + i * 0.7, [i * 2.5, 0, -i * 3.5]);
    g.add(v);
  }
  return g;
}
