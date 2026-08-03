/**
 * Scene 4 — Pod Seven.  The hand-off: the plans leave the ship inside a droid.
 *
 *   0.0  the hand-off — a side alcove, the princess pushes the datacard home
 *   5.0  the run — two droids hurry down the corridor under blaster fire
 *  13.3  the launch — the clamps blow back and pod seven jettisons
 *  17.4  outside — the pod tumbles away from the corvette toward the planet
 *  21.2  held fire — an imperial gunsight boxes the pod, then stands down
 *
 * Two sets live in one THREE.Scene: `inside` (corridor, alcove, pod bay) and
 * `outside` (space, planet, hulls). Only one is ever visible; hiding a group
 * also drops its practicals out of the render, so only the two directional
 * rigs parented straight to the scene have to be faded by hand.
 */
import * as THREE from 'three';
import { corvette, starDestroyer, escapePod, turbolaserTower } from '../models/ships.js';
import { corridor, blastDoor, podBay, planet, spaceBackdrop } from '../models/environments.js';
import { princess, protocolDroid, astromech, datacard } from '../models/characters.js';
import { pose, walk, attachToHand } from '../lego/minifig.js';
import { svgTexture, svg } from '../lego/svgtex.js';
import { at, rot, tile, cyl, C, rng } from '../lego/bricks.js';
import {
  lightRig, Bolts, volley, Impacts, Fireball, Smoke,
  clamp, lerp, smoothstep, noise, pulse, flash,
} from './_kit.js';

export const id = 'pod';

/* beat boundaries, local scene time ---------------------------------- */
const S1 = 5.0;       // the run begins
const S1B = 9.2;      // ...and the camera stops chasing and lets them go
const S2 = 13.35;     // the pod bay
const S3 = 16.78;     // exterior — the cut lands on the bang
const S4 = 21.2;      // the gunner
const END = 27.0;
const CARD_IN = 3.05; // the datacard disappears into the droid
const DOOR = 11.15;   // the pod bay hatch cracks open, ahead of their arrival
const CLAMPS = 14.6;  // the clamps snap back
const IRIS = 15.1;    // the launch tube irises open onto the night
const BANG = 16.45;   // explosive bolts fire, the pod goes
const LOCK = 22.55;   // the scan comes back empty, under "no life forms aboard"

/* interior geometry -------------------------------------------------- */
const ALC_Z = 30.8;   // the alcove sits this far down the corridor
const BAY_Z = -160;   // the pod bay is a separate set, parked out of the way
const GRATE = 0.30;   // top of the centre floor grating
const WALK = 0.36;    // top of the raised side walkway
// How far the princess sinks to kneel. The model is a gown — a cone with no
// knee in it — so a kneel can only be read two ways: off her height against the
// droid beside her, and off the hem pooling on the deck. Both want this deep.
// It puts her eyeline a brick under the dome, which is the whole point of the
// shot: she has come down to him.
const KNEEL = 1.62;
const RUN_V = 7.65;   // droid run speed: puts them in the hatch on the cut

/* The hand-off. Staged around one constraint: she has to be looking at what her
 * hands are doing and still show the camera her face, which only works if the
 * droid sits up-corridor of her with his card slot turned across the hall. Her
 * eyeline then runs back past the lens instead of away from it. */
const R2_X = -3.50, R2_Z = 30.70, R2_ROT = -1.465;
const LEIA_X = -1.95, LEIA_Z = 29.70, LEIA_ROT = 3.25;
const SLOT_Y = 1.78;  // height of the card slot up R2's body
const C3_X = -0.90, C3_Z = 24.50, C3_ROT = 4.069;

/** Distance covered `u` seconds into the run, with a soft launch. */
const runDist = (u) => (u <= 0 ? 0 : u < 1.2 ? (RUN_V * u * u) / 2.4 : RUN_V * (u - 0.6));

/** Pod travel out of the cradle, `s` seconds after the bolts fire. Steep: the
 * cut lands a third of a second after the bolts, and at anything gentler the
 * hull has barely shifted a length by then and the launch reads as a nudge. */
const podRun = (s) => (s <= 0 ? 0 : 210 * s * s);

/* ------------------------------------------------------------------ */
/* printed art                                                         */
/* ------------------------------------------------------------------ */

const HUD = '#8dffb4';
const HUD_DIM = '#4f9c72';

/** Soft contact shadow, so figures sit on the deck instead of hovering. */
function blobTex() {
  return svgTexture(svg([0, 0, 128, 128], `
    <defs><radialGradient id="b" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#000" stop-opacity="0.7"/>
      <stop offset="0.4" stop-color="#000" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="128" height="128" fill="url(#b)"/>`), { w: 128, h: 128, key: 'podBlob' });
}

/** What the launch tube looks like once the iris is open: night, and a limb. */
function tubeVoidTex() {
  const r = rng(64);
  const stars = Array.from({ length: 54 }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 122;
    return `<circle cx="${(128 + Math.cos(a) * d).toFixed(1)}" cy="${(128 + Math.sin(a) * d).toFixed(1)}"`
      + ` r="${(0.5 + r() * 1.2).toFixed(2)}" fill="#dfe9ff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }).join('');
  // the limb sits low and inside the aperture, so a 5-unit disc still shows sky
  // above it: a plain black hole reads as a hole in the set, not as space
  return svgTexture(svg([0, 0, 256, 256], [
    `<rect width="256" height="256" fill="#05070e"/>`,
    stars,
    `<path d="M-20 232 Q128 176 276 232 L276 290 L-20 290 Z" fill="#a35f24"/>`,
    `<path d="M-20 252 Q128 200 276 252 L276 290 L-20 290 Z" fill="#c9782f"/>`,
    // a hot terminator line along the limb, which is what makes a curved edge
    // read as the shoulder of a planet instead of a puddle of paint
    `<path d="M-20 232 Q128 176 276 232" fill="none" stroke="#ffe3b0" stroke-width="5"/>`,
    `<path d="M-20 232 Q128 176 276 232" fill="none" stroke="#fff3dc" stroke-width="1.6"/>`,
  ].join('')), { w: 256, h: 256, key: 'podTubeVoid' });
}

/** The nook's wall readout: somebody's cargo manifest, still scrolling. */
function nookScreenTex() {
  const r = rng(77);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const w = 40 + Math.round(r() * 150);
    return `<rect x="18" y="${22 + i * 26}" width="${w}" height="9" fill="#7fd0ff" opacity="${0.35 + r() * 0.5}"/>`
      + `<rect x="196" y="${22 + i * 26}" width="${18 + Math.round(r() * 40)}" height="9" fill="#ffd25a" opacity="0.6"/>`;
  }).join('');
  return svgTexture(svg([0, 0, 256, 208], [
    `<rect width="256" height="208" fill="#0b2233"/>`,
    `<rect x="8" y="8" width="240" height="192" fill="none" stroke="#4fa8d8" stroke-width="3" opacity="0.7"/>`,
    rows,
  ].join('')), { w: 256, h: 208, key: 'podNookScreen' });
}

/** Full-frame gunnery overlay: corner brackets, ladders, captions. */
function hudFrameTex() {
  const tick = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
  return svgTexture(svg([0, 0, 1024, 576], [
    // frame corners
    `<g fill="none" stroke="${HUD}" stroke-width="4" opacity="0.9">`,
    `<path d="M34 118 L34 34 L118 34"/><path d="M990 118 L990 34 L906 34"/>`,
    `<path d="M34 458 L34 542 L118 542"/><path d="M990 458 L990 542 L906 542"/>`,
    `</g>`,
    // elevation ladder, left
    `<g stroke="${HUD}" stroke-width="3" opacity="0.75">`,
    `<path d="M86 150 L86 426"/>`,
    tick(11, (i) => `<path d="M86 ${152 + i * 27} L${i % 2 ? 104 : 116} ${152 + i * 27}"/>`),
    `</g>`,
    `<g fill="${HUD}" opacity="0.85" font-family="Helvetica,Arial,sans-serif" font-size="17" font-weight="700">`,
    `<text x="124" y="158">+04</text><text x="124" y="293">00</text><text x="124" y="428">-04</text>`,
    `</g>`,
    // range ladder, right
    `<g stroke="${HUD}" stroke-width="3" opacity="0.7">`,
    `<path d="M938 150 L938 426"/>`,
    tick(9, (i) => `<path d="M${i % 2 ? 920 : 910} ${156 + i * 34} L938 ${156 + i * 34}"/>`),
    `</g>`,
    // azimuth scale, top, with the boresight index
    `<g stroke="${HUD}" stroke-width="3" opacity="0.7">`,
    `<path d="M300 82 L724 82"/>`,
    tick(15, (i) => `<path d="M${302 + i * 30} 82 L${302 + i * 30} ${i % 3 ? 94 : 102}"/>`),
    `</g>`,
    `<path d="M512 108 L500 88 L524 88 Z" fill="${HUD}" opacity="0.95"/>`,
    // boresight: a broken horizon line through the middle
    `<g stroke="${HUD}" stroke-width="3" opacity="0.5">`,
    `<path d="M300 288 L448 288"/><path d="M576 288 L724 288"/>`,
    `<path d="M300 282 L300 294"/><path d="M724 282 L724 294"/>`,
    `</g>`,
    // caption blocks
    `<g fill="${HUD}" font-family="Helvetica,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3">`,
    `<text x="112" y="516" opacity="0.9">FIRE CTL / BANK 04</text>`,
    `<text x="880" y="516" opacity="0.9" text-anchor="end">SECTOR 7</text>`,
    `<text x="112" y="70" opacity="0.75">IMPERIAL GUNNERY</text>`,
    `</g>`,
    `<g fill="none" stroke="${HUD_DIM}" stroke-width="2" opacity="0.55">`,
    `<rect x="100" y="486" width="230" height="42"/><rect x="700" y="486" width="192" height="42"/>`,
    `</g>`,
  ].join(''), { w: 1024, h: 576 }), { w: 1024, h: 576, key: 'podHudFrame' });
}

/** One corner of the closing box; rotated four ways. */
function bracketTex() {
  return svgTexture(svg([0, 0, 64, 64], [
    `<g fill="none" stroke="${HUD}" stroke-width="8" stroke-linecap="square">`,
    `<path d="M7 42 L7 7 L42 7"/>`,
    `</g>`,
    `<rect x="4" y="4" width="10" height="10" fill="${HUD}"/>`,
  ].join(''), { w: 128, h: 128 }), { w: 128, h: 128, key: 'podBracket' });
}

/** Target ring that rides on the pod. */
function ringTex() {
  return svgTexture(svg([0, 0, 128, 128], [
    `<g fill="none" stroke="${HUD}" stroke-width="3.5" opacity="0.95">`,
    `<circle cx="64" cy="64" r="44" stroke-dasharray="17 13"/>`,
    `<path d="M64 6 L64 26"/><path d="M64 102 L64 122"/>`,
    `<path d="M6 64 L26 64"/><path d="M102 64 L122 64"/>`,
    `</g>`,
    `<g fill="none" stroke="${HUD}" stroke-width="2.5" opacity="0.7"><circle cx="64" cy="64" r="9"/></g>`,
  ].join(''), { w: 256, h: 256 }), { w: 256, h: 256, key: 'podRing' });
}

/** The gunner's readout, before and after the scan comes back. */
function readoutTex(kind) {
  const bar = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="7" fill="${HUD}" opacity="0.8"/>`;
  const body = kind === 'scan'
    ? [
      `<text x="18" y="38">TGT  POD 07</text>`,
      `<text x="18" y="76">RNG  04.62</text>`,
      `<text x="18" y="114">SCAN . . .</text>`,
      bar(202, 30, 96), bar(202, 68, 62), bar(202, 106, 34),
    ].join('')
    : [
      `<text x="18" y="38">LIFE FORMS</text>`,
      `<text x="212" y="38" fill="#ffd25a">NONE</text>`,
      `<text x="18" y="92" font-size="36" fill="#ff8a4a">HOLD FIRE</text>`,
      `<rect x="14" y="104" width="278" height="5" fill="#ff8a4a" opacity="0.85"/>`,
    ].join('');
  return svgTexture(svg([0, 0, 320, 128], [
    `<rect x="4" y="4" width="312" height="120" fill="#04170c" opacity="0.55"/>`,
    `<rect x="4" y="4" width="312" height="120" fill="none" stroke="${HUD}" stroke-width="3" opacity="0.8"/>`,
    `<g fill="${HUD}" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="2">`,
    body,
    `</g>`,
  ].join(''), { w: 640, h: 256 }), { w: 640, h: 256, key: 'podReadout' + kind });
}

/**
 * Repaint a brick with an unlit material. `mat()` keys its cache with
 * JSON.stringify, so it can neither take a texture nor make anything emissive —
 * light panels and screens have to bring their own material.
 */
function lit(mesh, o = {}) {
  mesh.material = new THREE.MeshBasicMaterial({
    color: o.color ?? 0xffffff,
    map: o.map || null,
    transparent: (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
    toneMapped: false,
  });
  return mesh;
}

/* ------------------------------------------------------------------ */
/* the reach solver                                                    */
/* ------------------------------------------------------------------ */

/**
 * Where a minifig hand sits relative to its shoulder with the joint at rest:
 * straight down the upper arm, then out along the fixed elbow bend.
 */
const REST_ARM = new THREE.Vector3(0, -1.235, -0.465).normalize();
const _reach = new THREE.Vector3();

/**
 * Swing an arm so the hand lands on a world point. Call after `pose()` — this
 * overwrites the shoulder joint and needs the torso lean already set.
 */
function reachTo(fig, side, target) {
  const q = fig.userData.parts;
  const arm = side === 'L' ? q.armL : q.armR;
  fig.updateMatrixWorld(true);
  arm.parent.worldToLocal(_reach.copy(target));
  _reach.sub(arm.position).normalize();
  arm.quaternion.setFromUnitVectors(REST_ARM, _reach);
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050a);

  const inLights = lightRig(scene, 'interior', { shadows: false, fog: false, intensity: 0.44 });
  const spLights = lightRig(scene, 'space', { shadows: false, fog: false });
  inLights.key.position.set(10, 22, 34);
  const IN = [inLights.key.intensity, inLights.fill.intensity, inLights.rim.intensity, inLights.amb.intensity];
  const SP = [spLights.key.intensity, spLights.fill.intensity, spLights.rim.intensity, spLights.amb.intensity];

  const inside = new THREE.Group();
  const outside = new THREE.Group();
  scene.add(inside, outside);

  /* --- the corridor and the hatch at the end of it -------------------- */

  const hall = corridor({ segments: 8, width: 12, height: 9, segLen: 10, seed: 33, practicals: 5 });
  inside.add(hall);

  const door = blastDoor({ width: 12, height: 9, seed: 44, label: 'POD BAY 7' });
  door.position.set(0, 0, -40.4);
  inside.add(door);
  // The model slides its leaves straight out sideways with nowhere to go, so in
  // a twelve-wide hallway they end up outboard of the walls with their warning
  // lamps hanging in open space. Give each one a pocket to disappear into.
  for (const sx of [-1, 1]) {
    inside.add(at(tile(5.8, 1.0, 10.2, { color: C.bluishGray }), sx * 8.9, 0, -39.8));
    inside.add(at(tile(6.2, 1.2, 0.6, { color: C.lightGray }), sx * 9.1, 10.2, -39.8));
  }

  // The corridor model stops at z = -40 and the run curve carries the droids on
  // to -50, so the far end of their run is all built here, and it has one job:
  // be somewhere worth running to. By the cut the shot down the hall is 24
  // degrees of lens, so whatever stands at the end of it fills the doorway — a
  // flat wall there reads as a painted backdrop with two droids pasted on. So:
  // a dim antechamber, and the bay door punched through the end of it, lit from
  // the inside, straddling the line they are already running down.
  const VZ = -52.6;                          // the bay door plane
  const OP_X = -0.9, OP_W = 8.4, OP_H = 7.4; // its opening
  const OP_L = OP_X - OP_W / 2, OP_R = OP_X + OP_W / 2;
  const vest = new THREE.Group();
  // Kept dark: this is the only stretch of the hall painted below the corridor
  // model's own greys, and it has to be, or the bay door behind it is just one
  // more pale rectangle among many.
  vest.add(at(tile(13, 12.2, 0.3, { color: C.darkGray }), 0, 0, -46.5));
  vest.add(at(tile(13, 12.2, 0.6, { color: C.darkGray }), 0, 9.2, -46.5));
  for (const sx of [-1, 1]) {
    vest.add(at(tile(1, 12.2, 9.8, { color: C.darkGray }), sx * 6.4, 0, -46.5));
    // pilasters, so the raking light gives the side walls a rhythm of edges
    // rather than one long grey smear
    for (let i = 0; i < 3; i++) {
      vest.add(at(tile(0.55, 1.0, 8.8, { color: C.bluishGray }), sx * 5.6, 0.3, -42.4 - i * 3.4));
    }
    // A cove down each side wall, kept inside the room this time: run out to
    // the jamb they poked through the door and hung glowing in the bay beyond.
    vest.add(at(rot(cyl(0.24, 10.6, { color: 0xffb45e, glow: true, seg: 10 }), Math.PI / 2, 0, 0),
      sx * 5.1, 7.6, -46.6));
    vest.add(at(tile(0.8, 11, 0.5, { color: C.darkGray }), sx * 5.2, 8.15, -46.6));
  }
  // the door: two cheeks, trimmed jambs, a sill, and a hazard-striped lintel
  vest.add(at(tile(OP_L + 6.5, 1, 9.8, { color: C.darkGray }), (OP_L - 6.5) / 2, 0, VZ));
  vest.add(at(tile(6.5 - OP_R, 1, 9.8, { color: C.darkGray }), (OP_R + 6.5) / 2, 0, VZ));
  vest.add(at(tile(OP_W, 1, 9.2 - OP_H, { color: C.bluishGray }), OP_X, OP_H, VZ));
  vest.add(at(tile(0.45, 1.4, OP_H, { color: C.darkGray }), OP_L + 0.15, 0.3, VZ));
  vest.add(at(tile(0.45, 1.4, OP_H, { color: C.darkGray }), OP_R - 0.15, 0.3, VZ));
  vest.add(at(tile(OP_W + 0.9, 1.5, 0.34, { color: C.darkGray }), OP_X, 0, VZ));
  vest.add(at(tile(OP_W + 0.9, 1.5, 0.4, { color: C.darkGray }), OP_X, OP_H, VZ));
  for (let i = 0; i < 9; i++) {
    vest.add(at(tile(0.62, 0.22, 1.2, { color: i % 2 ? 0xd8a319 : 0x191919 }),
      OP_L + 0.6 + i * 0.9, OP_H + 0.45, VZ + 0.6));
  }
  // The bay beyond. Only the eight-by-seven rectangle of it the doorway frames
  // is ever on camera, so it is three walls, a hot panel down the back and a
  // couple of dark shapes to break the light up — enough that it reads as a
  // room and not as a lamp. It is the brightest thing in the set on purpose:
  // the two of them run into it as silhouettes.
  vest.add(at(tile(12, 12.2, 0.3, { color: C.lightGray }), OP_X, 0, -59.2));
  vest.add(at(tile(12, 12.2, 0.6, { color: C.bluishGray }), OP_X, 8.4, -59.2));
  vest.add(at(tile(12, 1, 10.4, { color: C.lightGray }), OP_X, 0, -65.4));
  for (const sx of [-1, 1]) {
    vest.add(at(tile(1, 12.2, 10.4, { color: C.lightGray }), OP_X + sx * 5.5, 0, -59.2));
  }
  // The back of it is one light bank, wall to wall, with ribs down it and a
  // gantry across in front. A single panel in the middle read as a lit sign
  // hung on a grey wall; the whole wall glowing is what puts two black droid
  // shapes in a bright doorway.
  vest.add(at(tile(10.6, 0.7, 1.2, { color: C.bluishGray }), OP_X, 0.3, -64.5));
  vest.add(at(lit(tile(10.4, 0.35, 5.3), { color: 0xffe9ca }), OP_X, 1.2, -64.62));
  for (let i = 0; i < 4; i++) {
    vest.add(at(tile(0.5, 0.5, 5.3, { color: C.darkGray }), OP_X - 4.2 + i * 2.8, 1.2, -64.3));
  }
  vest.add(at(tile(11.2, 0.8, 0.6, { color: C.darkGray }), OP_X, 6.5, -64.5));
  vest.add(at(rot(cyl(0.32, 11.6, { color: C.darkGray, seg: 8 }), 0, 0, Math.PI / 2),
    OP_X, 6.2, -60.4));
  vest.add(at(tile(1.7, 1.7, 2.6, { color: C.darkGray }), OP_X - 4.0, 0.3, -60.6));
  vest.add(at(tile(1.3, 1.3, 3.6, { color: C.bluishGray }), OP_X + 3.4, 0.3, -62.2));
  const vestBeacon = at(lit(cyl(0.3, 0.5, { seg: 10 }), { color: 0xff4a24 }), -5.1, 7.9, -50.2);
  vest.add(vestBeacon);
  const vestBlink = new THREE.PointLight(0xff4a24, 0, 13, 2);
  vestBlink.position.set(-4.6, 7.6, -50.2);
  inside.add(vestBlink);
  // hazard chevrons on the deck, pointing the way they are already going
  for (let i = 0; i < 4; i++) {
    vest.add(at(tile(5.0, 0.7, 0.12, { color: 0xd8a319 }), OP_X, 0.3, -43.4 - i * 2.3));
    vest.add(at(tile(5.0, 0.7, 0.12, { color: C.darkGray }), OP_X, 0.3, -44.55 - i * 2.3));
  }
  // a little dressing, so the antechamber floor is not a bare slab
  vest.add(at(tile(1.6, 1.6, 2.2, { color: C.bluishGray }), 4.6, 0.3, -47.6));
  vest.add(at(tile(1.2, 1.2, 1.6, { color: C.darkGray }), -4.9, 0.3, -49.4));
  vest.add(at(rot(cyl(0.3, 11.4, { color: C.darkGray, seg: 8 }), 0, 0, Math.PI / 2),
    0, 8.5, -43.2));
  inside.add(vest);
  // Two soft sources in the antechamber rather than one hot one: a single lamp
  // near the threshold burned a white pool on the deck and left the walls
  // behind it black. Both held well down, so the bay is what the eye goes to.
  const vestLight = new THREE.PointLight(0xffd9a8, 9, 20, 2);
  vestLight.position.set(0, 6.6, -44.4);
  inside.add(vestLight);
  const vestDeep = new THREE.PointLight(0xffcf98, 22, 16, 2);
  vestDeep.position.set(OP_X, 3.2, -54.4);
  inside.add(vestDeep);
  // and the bay's own light: the thing at the end of the corridor
  const bayGlow = new THREE.PointLight(0xffdcb0, 90, 26, 2);
  bayGlow.position.set(OP_X, 3.4, -62.0);
  inside.add(bayGlow);
  // a second one in the mouth of the door, to put light on the reveal and lay a
  // wedge of it across the antechamber deck in front of the droids
  const bayThrow = new THREE.PointLight(0xffd2a0, 34, 15, 2);
  bayThrow.position.set(OP_X, 3.0, -55.2);
  inside.add(bayThrow);

  // The corridor ships with its +Z mouth open, which reads as a black hole in
  // any shot that looks back up the hall. Cap it with a bulkhead and leave one
  // doorway for the troopers to shoot through.
  const aft = new THREE.Group();
  const JAMB = 2.3;   // half width of the doorway
  for (const sx of [-1, 1]) {
    aft.add(at(tile(3.8, 0.9, 9, { color: C.veryLightGray }), sx * 4.1, 0, 39.5));
    aft.add(at(tile(0.34, 1.0, 6.5, { color: C.darkGray }), sx * (JAMB + 0.17), 0, 39.5));
  }
  aft.add(at(tile(4.6, 0.9, 2.6, { color: C.veryLightGray }), 0, 6.5, 39.5));
  aft.add(at(tile(5.2, 0.34, 0.45, { color: C.darkGray }), 0, 6.5, 39.4));
  aft.add(at(tile(12, 0.5, 0.5, { color: C.lightGray }), 0, 8.4, 39.2));
  // a short run of hallway past the doorway, so the gap reads as somewhere
  aft.add(at(tile(4.6, 5.0, 0.2, { color: C.bluishGray }), 0, 0.15, 40.4));
  aft.add(at(tile(1.2, 5.0, 6.6, { color: C.lightGray }), -2.9, 0, 40.4));
  aft.add(at(tile(1.2, 5.0, 6.6, { color: C.lightGray }), 2.9, 0, 40.4));
  aft.add(at(tile(4.6, 0.6, 6.6, { color: C.bluishGray }), 0, 0, 44.8));
  aft.add(at(tile(6, 5.0, 0.5, { color: C.lightGray }), 0, 6.6, 40.4));
  aft.add(at(rot(cyl(0.2, 3.6, { color: 0xff8a5a, glow: true, seg: 10 }), 0, 0, Math.PI / 2),
    0, 6.3, 42.6));
  inside.add(aft);
  const aftLight = new THREE.PointLight(0xff9060, 16, 20, 2);
  aftLight.position.set(0, 4.2, 42.2);
  inside.add(aftLight);

  /* --- the alcove ----------------------------------------------------- */

  const alcove = new THREE.Group();
  // the bulkhead that closes the nook off down-corridor: the backdrop for the
  // whole hand-off, so it gets the dressing
  alcove.add(at(tile(3.4, 0.9, 7.4, { color: C.veryLightGray }), -4.3, 0, ALC_Z - 3.2));
  alcove.add(at(tile(3.8, 1.1, 0.5, { color: C.lightGray }), -4.3, 7.4, ALC_Z - 3.2));
  alcove.add(at(tile(0.8, 1.0, 7.6, { color: C.bluishGray }), -2.45, 0, ALC_Z - 3.2));
  // The near jamb: three units from the lens in the hand-off, so it is dark on
  // purpose. Painted the same white as the rest of the hall it read as a blank
  // panel filling frame left.
  alcove.add(at(tile(0.9, 0.9, 7.4, { color: C.darkGray }), -5.6, 0, ALC_Z + 4.0));
  alcove.add(at(tile(1.2, 1.1, 0.5, { color: C.darkGray }), -5.6, 7.4, ALC_Z + 4.0));
  // Soffit over the nook with a warm strip tucked under it. The strip is the
  // brightest thing in the hand-off and it is up in the corner of frame, so it
  // is painted well down from white: at anything near it, a five-brick slab of
  // unlit material that close to the lens blooms into a smear that pulls the
  // eye straight off her face.
  alcove.add(at(tile(2.4, 7.0, 0.5, { color: C.lightGray }), -4.8, 6.4, ALC_Z + 0.4));
  alcove.add(at(lit(tile(1.3, 4.4, 0.2), { color: 0x9e7c52 }), -4.8, 6.2, ALC_Z + 0.4));
  // locker bank against the bulkhead
  alcove.add(at(tile(1.3, 0.7, 3.4, { color: C.lightGray }), -5.3, WALK, ALC_Z - 2.4));
  alcove.add(at(tile(1.45, 0.8, 0.24, { color: C.darkGray }), -5.3, WALK + 3.4, ALC_Z - 2.45));
  alcove.add(at(tile(0.16, 0.1, 1.9, { color: C.darkGray }), -4.62, WALK + 0.7, ALC_Z - 2.6));
  // wall readout: behind the droid in the hand-off, straight ahead in the run
  alcove.add(at(tile(1.9, 0.3, 1.5, { color: C.darkGray }), -3.9, 3.8, ALC_Z - 2.72));
  alcove.add(at(lit(tile(1.55, 0.12, 1.15), { map: nookScreenTex(), opacity: 0.94 }),
    -3.9, 3.97, ALC_Z - 2.55));
  alcove.add(at(rot(cyl(0.16, 0.14, { color: 0xff6a3a, glow: true, seg: 10 }), Math.PI / 2, 0, 0),
    -2.9, 5.2, ALC_Z - 2.84));
  // a pair of crates somebody left behind, stacked up-corridor of the droid
  const crateR = rng(19);
  for (let i = 0; i < 3; i++) {
    const w = 0.8 + crateR() * 0.5;
    const c = at(tile(w, w, 0.6 + crateR() * 0.5, { color: i % 2 ? C.bluishGray : C.darkGray }),
      -5.3 + crateR() * 0.3, WALK, ALC_Z + 2.0 + i * 1.2);
    rot(c, 0, (crateR() - 0.5) * 0.5, 0);
    alcove.add(c);
  }
  inside.add(alcove);

  // Hung well clear of the soffit above it. The dome beside it is white and
  // curved and picks up every point source in the nook, so this one also has to
  // stay a good three units off it: brought in close enough to key her face
  // properly it turned the top of the droid into one blown highlight.
  const nookLamp = new THREE.PointLight(0xffc188, 17, 17, 2);
  nookLamp.position.set(-4.2, 4.5, ALC_Z + 1.0);
  inside.add(nookLamp);
  const nookFill = new THREE.PointLight(0xffe6c4, 7.0, 12, 2);
  nookFill.position.set(-1.0, 2.4, ALC_Z + 3.4);
  inside.add(nookFill);
  // red emergency wash for the run
  const alarmA = new THREE.PointLight(0xff3a20, 0, 34, 2);
  alarmA.position.set(0, 6.4, 16);
  const alarmB = new THREE.PointLight(0xff3a20, 0, 34, 2);
  alarmB.position.set(0, 6.4, -16);
  inside.add(alarmA, alarmB);

  /* --- the cast ------------------------------------------------------- */

  const shadowMat = new THREE.MeshBasicMaterial({
    map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8,
  });
  const contact = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    inside.add(m);
    return m;
  };

  const r2 = astromech({ seed: 12 });
  const c3 = protocolDroid();
  const leia = princess({ prop: false });
  const card = datacard();
  // the far arm does the reaching: its shoulder is the only one within a
  // minifig arm's length of the droid once they are far enough apart to read
  attachToHand(leia, card, 'R');
  card.rotation.set(-1.05, 0, 0);
  inside.add(r2, c3, leia);
  const r2Shadow = contact();
  const c3Shadow = contact();
  const leiaShadow = contact();

  // the slot the plans go into, and the tell-tale that lights once they are in
  const r2Body = r2.userData.dome.parent;
  r2Body.add(at(tile(0.66, 0.22, 0.46, { color: C.darkGray }), 0, SLOT_Y, -0.72));
  const slotLamp = at(lit(tile(0.42, 0.1, 0.13), { color: 0x9fe8ff, opacity: 0 }),
    0, SLOT_Y + 0.13, -0.79);
  r2Body.add(slotLamp);

  // world-space aim for her hand: out along the droid's front face
  const R2_FRONT = new THREE.Vector3(-Math.sin(R2_ROT), 0, -Math.cos(R2_ROT));
  const SLOT = new THREE.Vector3(R2_X, GRATE + SLOT_Y, R2_Z)
    .addScaledVector(R2_FRONT, 0.72);
  const HAND_IN = SLOT.clone().addScaledVector(R2_FRONT, 0.3);

  /* --- the run path --------------------------------------------------- */

  const runCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(R2_X, 0, R2_Z),
    new THREE.Vector3(-3.0, 0, 29.4),
    new THREE.Vector3(-2.0, 0, 27.4),
    new THREE.Vector3(-0.9, 0, 24.0),
    new THREE.Vector3(0.2, 0, 15.0),
    new THREE.Vector3(0.5, 0, 0.0),
    new THREE.Vector3(0.1, 0, -20.0),
    new THREE.Vector3(0.3, 0, -38.0),
    // through the hatch and on into the vestibule, so they leave the shot
    // instead of piling up against the door
    new THREE.Vector3(0.2, 0, -50.0),
  ], false, 'catmullrom', 0.4);
  const runLen = runCurve.getLength();
  const _p = new THREE.Vector3();
  const _tg = new THREE.Vector3();

  /** Put `obj` `d` units along the run, `side` units to its own right (+X-ish). */
  const onRun = (obj, d, side, y) => {
    const u = clamp(d / runLen, 0, 1);
    runCurve.getPointAt(u, _p);
    runCurve.getTangentAt(u, _tg);
    obj.position.set(_p.x - _tg.z * side, y, _p.z + _tg.x * side);
    obj.rotation.set(0, Math.atan2(-_tg.x, -_tg.z), 0);
    return obj;
  };

  /* --- blaster fire from around the corner ---------------------------- */

  // every burst runs the length of the hallway close to one wall, so the bolts
  // streak past the droids instead of through them
  const shots = [
    ...volley({
      t0: 5.7, count: 3, interval: 0.17, from: [1.5, 4.4, 38.6], to: [5.0, 2.4, -18],
      speed: 100, color: 0xff2b12, len: 3.6, thick: 0.17, seed: 3, spread: 1.5, fromSpread: 0.7,
    }),
    ...volley({
      t0: 6.9, count: 3, interval: 0.15, from: [-1.4, 5.2, 38.6], to: [-5.0, 3.2, -14],
      speed: 108, color: 0xff2b12, len: 3.6, thick: 0.17, seed: 9, spread: 1.5, fromSpread: 0.7,
    }),
    ...volley({
      t0: 8.3, count: 4, interval: 0.15, from: [1.3, 3.6, 38.6], to: [5.2, 5.2, -26],
      speed: 112, color: 0xff2b12, len: 3.8, thick: 0.17, seed: 17, spread: 1.6, fromSpread: 0.7,
    }),
    ...volley({
      t0: 9.9, count: 3, interval: 0.16, from: [-1.3, 4.6, 38.6], to: [-5.1, 2.0, -30],
      speed: 118, color: 0xff2b12, len: 3.8, thick: 0.17, seed: 23, spread: 1.6, fromSpread: 0.7,
    }),
    ...volley({
      t0: 11.2, count: 4, interval: 0.14, from: [1.2, 5.4, 38.6], to: [4.7, 2.8, -34],
      speed: 124, color: 0xff2b12, len: 4.0, thick: 0.17, seed: 31, spread: 1.7, fromSpread: 0.7,
    }),
    ...volley({
      t0: 12.5, count: 3, interval: 0.15, from: [-1.1, 4.0, 38.6], to: [-4.9, 5.4, -36],
      speed: 130, color: 0xff2b12, len: 4.0, thick: 0.17, seed: 37, spread: 1.7, fromSpread: 0.7,
    }),
  ];
  const bolts = new Bolts(inside, shots);
  // small and hot. At 0.9 and cream they read as soft white balls stuck to the
  // wall rather than as hits, and two overlapping ones make one big pale disc.
  const hits = new Impacts(inside, bolts.impacts().map((h) => ({
    t: h.t, pos: [h.pos.x, h.pos.y, h.pos.z], size: 0.3, color: 0xff9a52,
  })), { dur: 0.22 });
  // kept short-range on purpose: at 50 units it lit the whole hall on every
  // burst and flattened the shot instead of punching the walls behind them
  const muzzleLight = new THREE.PointLight(0xff7a3a, 0, 30, 2);
  muzzleLight.position.set(0.2, 4.4, 38.2);
  inside.add(muzzleLight);

  /* --- the pod bay ---------------------------------------------------- */

  // Wider than it needs to be: the pod only reads as a pod from near abeam, and
  // at the stock 20-24 width the camera has to sit inside the wall ribs to get
  // there. The extra beam is all off-camera deck.
  const BAY_W = 34, BAY_H = 11, BAY_D = 26;
  const bay = podBay({ width: BAY_W, height: BAY_H, depth: BAY_D, seed: 55, practicals: 3 });
  bay.position.set(0, 0, BAY_Z);
  inside.add(bay);
  // the model's floods are set for a wide establishing shot; from inside the bay
  // at 13 units they burn the white hull out to a flat silhouette
  for (const l of bay.userData.lamps) l.intensity = 13;
  // setClamps() is geared for a slimmer pod — at its "clamped" end the pads sit
  // 2.2 out, well inside a 2.5-radius hull. Drive the four arms directly
  // instead, and let them fall away rather than only sliding outboard.
  const clampSide = bay.userData.clamps.map((a) => Math.sign(a.position.x) || 1);
  // podBay leaves its -Z end open around the launch tube; without this the
  // shot looks past the tube ring into empty space.
  const tubeR = bay.userData.tubeRadius;
  const gap = BAY_W / 2 - (tubeR + 1.35);
  for (const sx of [-1, 1]) {
    bay.add(at(tile(gap, 1.0, BAY_H + 0.6, { color: C.veryLightGray }),
      sx * (BAY_W / 2 - gap / 2), 0, -BAY_D / 2 - 0.6));
    bay.add(at(tile(0.5, 1.2, BAY_H + 0.6, { color: C.darkGray }),
      sx * (tubeR + 1.35), 0, -BAY_D / 2 - 0.55));
  }
  bay.add(at(tile(BAY_W, 1.0, 1.6, { color: C.lightGray }), 0, BAY_H + 0.4, -BAY_D / 2 - 0.6));

  // podBay's floods sit on the centreline and leave the pod's flank in shadow.
  // Kept well off the hull: any closer and the inverse square puts a blown
  // highlight on the near cradle post instead of a gradient down the flank.
  // Also kept off the ceiling: an 11-high bay with a 26-strength lamp a unit and
  // a half under the panels put a burnt pale band across the top of frame.
  const podFill = new THREE.PointLight(0xffe8d2, 26, 36, 2);
  podFill.position.set(12.6, 7.6, BAY_Z + 8.0);
  inside.add(podFill);
  // and a second one forward of the cradle, or the hull goes to silhouette the
  // moment it starts down the tube
  const podFore = new THREE.PointLight(0xffe0c0, 20, 30, 2);
  podFore.position.set(11.5, 8.4, BAY_Z - 7.0);
  inside.add(podFore);

  // The tube's blast hatch is a static plate in the model, so the aperture gets
  // its own disc of night laid over it and faded up as the iris runs back.
  // sized to the ring's inner bore (torus minor radius 0.55) so it fills the
  // aperture without poking through the rim
  const voidDisc = new THREE.Mesh(
    new THREE.CircleGeometry(tubeR - 0.62, 40),
    new THREE.MeshBasicMaterial({
      map: tubeVoidTex(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
    }),
  );
  const TUBE_Y = tubeR + 1.2;
  voidDisc.position.set(0, TUBE_Y, BAY_Z - BAY_D / 2 + 0.5);
  voidDisc.renderOrder = 3;
  inside.add(voidDisc);
  const tubeGlow = new THREE.PointLight(0xffb877, 0, 26, 2);
  tubeGlow.position.set(0, TUBE_Y, BAY_Z - BAY_D / 2 + 2.4);
  inside.add(tubeGlow);

  const podIn = escapePod({ seed: 3 });
  inside.add(podIn);
  const POD_Y = 4.0;
  const POD_Z = BAY_Z + 1.2;
  // rides with the hull so the retro ring throws light on the cradle and the
  // tube rim as it goes past them
  const podBurn = new THREE.PointLight(0xffc27a, 0, 22, 2);
  podBurn.position.set(0, 2.8, 5.4);
  podIn.add(podBurn);

  // The explosive bolts are squibs at the four clamp pads, not a fireball on the
  // pod: anything centred on the hull at this focal length swallows the frame.
  const boltFire = [[-3.2, 5.4], [-3.2, -3.0], [3.2, 5.4], [3.2, -3.0]].map(([x, z], i) => new Fireball(inside, {
    t0: BANG - 0.03 + i * 0.02, pos: [x, 4.2, BAY_Z + z], size: 0.62, dur: 0.26,
    seed: 40 + i * 7, brickCount: 5, gravity: -9, ring: false,
    color: 0xfff0cc, color2: 0xffa652,
  }));
  // additive, and the camera is looking through all of it: twenty puffs at 0.22
  // turn the whole launch into a milk-white frame
  const bayHaze = new Smoke(inside, {
    t0: BANG - 0.05, count: 13, origin: [0, 3.0, BAY_Z - 1.0], spread: 10, size: 4.0, rise: 1.1,
    life: 2.4, opacity: 0.05, color: 0xc8cdd4, spawnWindow: 0.8, seed: 19,
  });

  /* --- outside -------------------------------------------------------- */

  const sky = spaceBackdrop({ seed: 31, radius: 6400, count: 5200 });
  outside.add(sky);
  // The galaxy band is tuned for a wide lens. Behind a 30-degree gunsight its
  // core magnifies into a milk-white wedge across the lower half of the frame,
  // so it and the nebula both come down for that beat.
  const bandMat = sky.userData.band.material;
  const nebula = sky.userData.clouds;

  const SUN = new THREE.Vector3(220, 160, 120).normalize();
  const world = planet({ radius: 1000, type: 'desert', seed: 88, seg: 72 });
  world.userData.setSunDir(SUN);
  outside.add(world);

  const cv = corvette({ seed: 11 });
  const sd = starDestroyer({ seed: 7 });
  const podOut = escapePod({ seed: 3 });
  outside.add(cv, sd, podOut);
  cv.userData.setThrottle(0.34);
  for (const i of [0, 3, 7, 9]) cv.userData.killEngine(i, true);
  sd.userData.setThrottle(0.55);

  const vent = new Smoke(cv, {
    t0: -3, count: 10, origin: [0, 5, 24], spread: 7, size: 4.5, rise: 0.2,
    life: 6, opacity: 0.13, color: 0x565d66, spawnWindow: 6, seed: 51,
  });

  // the gun deck: three stepped plates of imperial hull tapering away below the
  // gunner, dark enough that the space key does not blow them out
  const deck = new THREE.Group();
  const DECK_Y = -23;
  // Kept genuinely dark. The space key is set for white hulls at 300 units, and
  // anything mid-grey this close to the lens turns into a blown pale slab under
  // the frame instead of the shadowed foreground the shot needs.
  // Matte, and darker than they look like they should be. The kit's default
  // roughness of 0.42 across a 130-stud plate puts one enormous specular lobe
  // from the space key right across the bottom-left of the gunsight.
  const HULL = { rough: 0.96, metal: 0 };
  const plates = [[130, 62, -30, 0x232629], [104, 44, -84, 0x282b2e], [64, 28, -118, 0x1f2225]];
  plates.forEach(([w, d, z, col], i) => {
    deck.add(at(tile(w, d, 3, { color: col, ...HULL }), 0, DECK_Y - i * 0.7, z));
  });
  for (const sx of [-1, 1]) {
    deck.add(at(tile(5, 120, 0.7, { color: 0x121417, ...HULL }), sx * 21, DECK_Y + 3, -60));
    deck.add(at(tile(2.4, 96, 0.5, { color: 0x181b1e, ...HULL }), sx * 40, DECK_Y + 3, -48));
  }
  const deckR = rng(41);
  for (let i = 0; i < 34; i++) {
    const w = 2 + deckR() * 6;
    deck.add(at(tile(w, 2 + deckR() * 7, 0.6 + deckR() * 2.0, {
      color: deckR() < 0.45 ? 0x1a1d20 : 0x33373a, ...HULL,
    }), -56 + deckR() * 112, DECK_Y + 3, -22 - deckR() * 92));
  }
  outside.add(deck);
  const guns = [turbolaserTower({ seed: 61 }), turbolaserTower({ seed: 62 })];
  for (const g of guns) outside.add(g);

  /* --- the gunsight --------------------------------------------------- */

  const rig = new THREE.Group();
  scene.add(rig);
  const HUD_Z = 2;
  const hud = new THREE.Group();
  hud.position.z = -HUD_Z;
  rig.add(hud);

  const quad = (tex, w, h, order) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    }));
    m.renderOrder = order;
    m.frustumCulled = false;
    hud.add(m);
    return m;
  };
  const hudFrame = quad(hudFrameTex(), 16, 9, 900);
  const brackets = [0, 1, 2, 3].map((i) => {
    const b = quad(bracketTex(), 1, 1, 902);
    b.rotation.z = -i * Math.PI / 2;
    return b;
  });
  const ring = quad(ringTex(), 1, 1, 901);
  const readScan = quad(readoutTex('scan'), 1, 1, 903);
  const readHold = quad(readoutTex('hold'), 1, 1, 903);

  /* --- helpers -------------------------------------------------------- */

  const _v = new THREE.Vector3();
  const _aim = new THREE.Vector3();
  // Steep rather than long: aimed out along the bore the elevating barrels
  // swept up through the pod's corner of the frame and read as still tracking
  // it. Straight up over the deck is unmistakably safe.
  const STAND_DOWN = new THREE.Vector3(-90, 520, -230);

  const shadowAt = (m, obj, w, y, o) => {
    m.position.set(obj.position.x, y + 0.03, obj.position.z);
    m.scale.set(w, w, 1);
    m.material.opacity = 0.8 * o;
    m.visible = o > 0.01;
  };

  return {
    scene,

    cues: [
      /* --- the hand-off --- */
      { t: 0.15, sfx: 'alarm', opts: { gain: 0.1, dur: 5.6, period: 0.72 } },
      { t: 0.9, sfx: 'droidBeep', opts: { gain: 0.3, n: 3, happy: false, speed: 0.8, pan: 0.14 } },
      { t: 2.3, sfx: 'protocolFuss', opts: { gain: 0.22, syllables: 4, speed: 1.05, pan: -0.3 } },
      { t: CARD_IN + 0.02, sfx: 'commBeep', opts: { gain: 0.3, f1: 880, f2: 1320, len: 0.06 } },
      { t: CARD_IN + 0.22, sfx: 'droidBeep', opts: { gain: 0.46, n: 5, happy: true, pan: 0.14 } },
      { t: 3.9, sfx: 'protocolFuss', opts: { gain: 0.36, syllables: 7, pan: -0.3 } },
      { t: 4.8, sfx: 'droidWorry', opts: { gain: 0.34, dur: 0.85, pan: 0.14 } },

      /* --- the run --- */
      { t: S1 + 0.05, sfx: 'alarm', opts: { gain: 0.3, dur: 8.6, period: 0.44 } },
      { t: S1 + 0.4, sfx: 'doorBlast', opts: { gain: 0.7, pan: 0.4 } },
      ...shots.map((s, i) => ({
        t: s.t0,
        sfx: 'blaster',
        opts: { gain: 0.42, pan: clamp(s.from[0] / 6, -1, 1) * 0.7, pitch: 0.9 + (i % 3) * 0.08 },
      })),
      { t: 6.5, sfx: 'droidBeep', opts: { gain: 0.4, n: 4, happy: false, speed: 1.4 } },
      { t: 7.5, sfx: 'protocolFuss', opts: { gain: 0.42, syllables: 8, speed: 1.25, seed: 2 } },
      { t: 9.4, sfx: 'droidWorry', opts: { gain: 0.4, dur: 0.9 } },
      { t: 10.6, sfx: 'protocolFuss', opts: { gain: 0.4, syllables: 6, speed: 1.35, seed: 5 } },
      { t: DOOR + 0.05, sfx: 'doorBlast', opts: { gain: 0.62, pan: -0.15 } },
      { t: 12.7, sfx: 'droidBeep', opts: { gain: 0.42, n: 5, happy: true, speed: 1.5 } },

      /* --- the launch --- */
      { t: S2 + 0.05, sfx: 'alarm', opts: { gain: 0.44, dur: 3.6, period: 0.34, hi: 700, lo: 500 } },
      { t: CLAMPS, sfx: 'doorBlast', opts: { gain: 0.5, pan: 0.2 } },
      { t: IRIS, sfx: 'doorBlast', opts: { gain: 0.44, pan: -0.45 } },
      { t: 15.9, sfx: 'commBeep', opts: { gain: 0.3, f1: 1320, f2: 990 } },
      { t: BANG, sfx: 'podLaunch', opts: { gain: 1.0 } },
      { t: BANG + 0.05, sfx: 'engineWhoosh', opts: { gain: 0.75, dur: 1.3 } },

      /* --- outside --- */
      { t: S3 + 0.03, sfx: 'engineWhoosh', opts: { gain: 0.42, dur: 2.4 } },
      { t: 19.3, sfx: 'radioStatic', opts: { gain: 0.24, dur: 0.6 } },
      { t: 20.8, sfx: 'commBeep', opts: { gain: 0.34, f1: 1180, f2: 1570 } },

      /* --- held fire --- */
      { t: S4 + 0.02, sfx: 'radioStatic', opts: { gain: 0.3, dur: 0.9, crackle: 1.4 } },
      { t: S4 + 0.55, sfx: 'commBeep', opts: { gain: 0.26, f1: 1480, f2: 1480, len: 0.05 } },
      { t: S4 + 1.0, sfx: 'commBeep', opts: { gain: 0.28, f1: 1560, f2: 1560, len: 0.05 } },
      { t: S4 + 1.45, sfx: 'commBeep', opts: { gain: 0.3, f1: 1660, f2: 1660, len: 0.05 } },
      { t: LOCK, sfx: 'commBeep', opts: { gain: 0.42, f1: 1900, f2: 1240, len: 0.12 } },
      { t: 24.8, sfx: 'radioStatic', opts: { gain: 0.26, dur: 1.1 } },
      { t: 26.1, sfx: 'commBeep', opts: { gain: 0.22, f1: 860, f2: 700, len: 0.09 } },
    ],

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);
      const indoors = t < S3;
      inside.visible = indoors;
      outside.visible = !indoors;
      inLights.key.intensity = indoors ? IN[0] : 0;
      inLights.fill.intensity = indoors ? IN[1] : 0;
      inLights.rim.intensity = indoors ? IN[2] : 0;
      inLights.amb.intensity = indoors ? IN[3] : 0;
      spLights.key.intensity = indoors ? 0 : SP[0];
      spLights.fill.intensity = indoors ? 0 : SP[1];
      spLights.rim.intensity = indoors ? 0 : SP[2];
      spLights.amb.intensity = indoors ? 0 : SP[3];
      hud.visible = t >= S4;

      /* ---------------------------------------------------------------- */
      /* inside                                                            */
      /* ---------------------------------------------------------------- */
      if (indoors) {
        // the hallway comes up from a warm brown-out to full emergency power
        const hum = 0.94 + 0.06 * Math.sin(t * 7.3) * Math.sin(t * 1.7);
        // held well down for the hand-off so the nook lamp is doing the work and
        // the three of them sit in a warm pool, then up for the run
        hall.userData.setLights(lerp(0.22, 0.30, smoothstep(S1 - 0.5, S1 + 0.4, t)) * hum);
        bay.userData.update(t);
        door.userData.update(t);
        door.userData.setOpen(0.78 * smoothstep(DOOR, DOOR + 1.0, t));

        bolts.update(t);
        hits.update(t);
        let strobe = 0;
        for (const s of shots) strobe += Math.max(0, 1 - Math.abs(t - s.t0) * 11);
        muzzleLight.intensity = clamp(strobe, 0, 1.6) * 70;
        const running = smoothstep(S1 - 0.2, S1 + 0.6, t);
        nookLamp.intensity = 17 * (1 - 0.6 * smoothstep(S1 + 0.6, S1 + 1.6, t));
        nookFill.intensity = 7.0 * (1 - running);
        const blink = (Math.sin(t * 4.4) > 0 ? 1 : 0.06) * running;
        alarmA.intensity = 24 * blink;
        alarmB.intensity = 24 * (Math.sin(t * 4.4 + 2.1) > 0 ? 1 : 0.06) * running;
        // beacon over the turn past the hatch, off its own phase so the far end
        // of the hall is not blinking in lockstep with the near end
        const bk = 0.3 + 0.7 * (Math.sin(t * 5.9 + 1.1) > 0.1 ? 1 : 0);
        vestBeacon.material.color.setRGB(bk, bk * 0.29, bk * 0.14);
        vestBlink.intensity = 15 * bk * running;

        if (t < S1) {
          /* --- the hand-off ------------------------------------------- */
          r2.position.set(R2_X, GRATE, R2_Z);
          r2.rotation.set(0, R2_ROT, 0);
          r2.userData.setCenterFoot(1);
          r2.userData.roll(0);
          // Watches her hands (0.96 puts the eye on her), then swings round to
          // the corridor she is about to send him down (-1.05 faces the lens).
          r2.userData.dome.rotation.y = lerp(
            lerp(0.4, 0.96, smoothstep(0.7, 2.2, t)),
            -1.05, smoothstep(CARD_IN + 0.15, 4.4, t)
          ) + 0.04 * Math.sin(t * 1.9);
          slotLamp.material.opacity = smoothstep(CARD_IN, CARD_IN + 0.3, t)
            * (0.55 + 0.45 * Math.sin(t * 13));

          leia.position.set(LEIA_X, GRATE - KNEEL, LEIA_Z);
          leia.rotation.set(0, LEIA_ROT, 0);
          const reach = smoothstep(0.5, 2.0, t);
          const push = smoothstep(2.2, CARD_IN, t);
          const rest = smoothstep(CARD_IN + 0.2, 4.2, t);
          // Over the droid, not upright beside him: the root carries the whole
          // figure forward from the hip and cants it toward the slot, and the
          // torso lean stacks on top. Bolt upright at this height she read as a
          // short woman standing, which is exactly the wrong idea.
          leia.userData.parts.root.rotation.set(0.13 + reach * 0.1 - rest * 0.06, 0, 0.05);
          pose(leia, {
            armL: { x: 0.06 + 0.06 * Math.sin(t * 1.1), y: 0, z: -0.05 },
            handL: 0.2,
            handR: -0.35 - reach * 0.3,
            lean: 0.08 + reach * 0.16 - rest * 0.07,
            // headX is a pitch, and positive lifts the chin: she has to look
            // *down* at the slot, which sits a brick and a half below her eyes.
            // The chin comes back up on `rest`, once the card is home and there
            // is nothing left to look at but the corridor she is sending him on.
            headX: -0.16 - reach * 0.26 + rest * 0.38,
            headY: 0.24 + reach * 0.06 - rest * 0.34,
          });
          // her hand tracks the slot: in, press home, then withdraws
          _aim.copy(HAND_IN);
          _aim.y += (1 - reach) * 1.4;
          _aim.z += (1 - reach) * 0.8;
          _aim.addScaledVector(R2_FRONT, -push * 0.12 + rest * 0.85);
          _aim.y += rest * 0.5;
          reachTo(leia, 'R', _aim);
          card.visible = t < CARD_IN;

          // out in the hall down-corridor of them, watching the way they have to
          // go and fretting about it
          c3.position.set(C3_X, GRATE, C3_Z);
          c3.rotation.set(0, C3_ROT, 0);
          const f1 = Math.sin(t * 3.3);
          const f2 = Math.sin(t * 2.1 + 1.2);
          pose(c3, {
            armR: { x: 1.02 + 0.24 * f1, y: 0, z: 0.14 },
            armL: { x: 0.96 - 0.26 * f2, y: 0, z: -0.16 },
            handR: -1.15, handL: 1.15,
            legR: 0.03, legL: -0.03,
            lean: 0.04 + 0.03 * f2,
            headY: 0.55 + 0.3 * Math.sin(t * 1.25),
            headX: -0.04,
            // walk() writes a torso twist and a hip sway that pose() only
            // touches when it is asked to. Without these three, seeking back
            // into the hand-off from the run leaves him standing here wearing
            // the stride he had down the corridor.
            torsoY: 0, turn: 0, sway: 0,
          });

          // Down the hall at dome height, so the three of them stack across the
          // frame instead of one filling it: droid left, princess centre, and
          // the protocol droid small and further off at frame right.
          const k = smoothstep(0, 1, t / S1);
          cam.position.set(2.0 - 0.22 * k, 2.42 - 0.06 * k, 38.6 - 0.85 * k);
          cam.lookAt(-2.9, 2.12, 30.65);
          cam.fov = 40 - 2.6 * k;
        } else {
          /* --- the run ------------------------------------------------ */
          // The cut lands with them already nine units down the hall. That is
          // deliberate: any camera far enough behind them to frame both droids
          // at the mouth of the nook also has the kneeling princess in it, and
          // from four feet away she fills the frame.
          const u = t - S1 + 1.55;
          const d = runDist(u);
          // he starts a pace ahead of the droid at the nook mouth and loses
          // ground steadily once it winds up: the whole joke of the character
          const dG = d + 1.4 - 2.2 * smoothstep(S1 + 0.3, S1 + 2.8, t);
          const drift = smoothstep(S1, S1 + 1.6, t);
          onRun(r2, d, 0, GRATE);
          // he keeps to the port side, away from the lens: five units of
          // protocol droid between the camera and the dome would fill the frame
          onRun(c3, Math.max(0, dG), -(1.6 + 0.6 * drift), GRATE);
          r2.userData.setCenterFoot(1 - smoothstep(S1 + 0.1, S1 + 0.7, t));
          r2.userData.roll(d);
          // glances back at every burst, then fixes on the hatch again
          let look = 0;
          for (const s of shots) look += pulse(t, s.t0 - 0.15, 1.2);
          r2.userData.dome.rotation.y = clamp(look, 0, 1) * 2.7 + 0.2 * Math.sin(t * 2.3);
          slotLamp.material.opacity = 0.35 + 0.3 * Math.sin(t * 9);

          walk(c3, dG / 1.9, { stride: 0.34, arms: 0.5, lean: 0.16, sway: 0.06, twist: 0.11 });
          const flap = Math.sin(t * 11.5);
          const flap2 = Math.sin(t * 11.5 + 2.1);
          pose(c3, {
            armR: { x: -0.55 + 0.8 * flap, y: 0, z: 0.52 },
            armL: { x: -0.55 + 0.8 * flap2, y: 0, z: -0.52 },
            handR: -1.1, handL: 1.1,
            headY: 0.34 * Math.sin(t * 3.1),
            headX: -0.14,
          });

          // she gets up off her knee and watches them go
          const up = smoothstep(S1 + 0.2, S1 + 1.5, t);
          leia.position.set(LEIA_X, GRATE - KNEEL * (1 - up), LEIA_Z);
          leia.rotation.set(0, LEIA_ROT - 0.5 * up, 0);
          // unfolds out of the kneel: matches where the hand-off left the root
          leia.userData.parts.root.rotation.set(0.17 * (1 - up), 0, 0.05 * (1 - up));
          pose(leia, {
            armR: { x: 0.1 - 0.5 * up, y: 0, z: 0.16 },
            armL: { x: 0.12, y: 0, z: -0.16 },
            handR: -0.2, handL: 0.2,
            lean: 0.1 * (1 - up),
            headX: 0.1 - 0.08 * up,
            headY: -0.3 + 0.2 * Math.sin(t * 1.4),
          });
          card.visible = false;

          if (t < S1B) {
            // Retreat down the hall ahead of their starboard bow, matched to
            // their speed. Everything the beat needs is then in one frame: two
            // faces coming at the lens, the hallway they are running from, the
            // muzzle flare at the end of it, and bolts crossing between.
            // Ahead and not behind, because five units of protocol droid is all
            // a trailing camera in a twelve-wide corridor can see.
            const j = smoothstep(S1, S1B, t);
            const jog = noise(t * 4.6, 11) * 0.05;
            _v.copy(r2.position).add(c3.position).multiplyScalar(0.5);
            // The lead shortens as the shot runs, because the protocol droid
            // starts a pace in front of the astromech — nearest the lens — and
            // ends a pace behind it. Held at one distance he tops out of frame
            // for the first second and is a doll by the last.
            cam.position.set(2.15 - 0.35 * j, 2.55 + jog, r2.position.z - 10.2 + 1.0 * j);
            // aimed a little starboard of the pair, which swings the receding
            // hallway and the doorway they are being shot at from into frame
            // left instead of burying it behind the port wall
            cam.lookAt(_v.x + 0.35, 2.75 - 0.15 * j, _v.z + 1.4);
            cam.fov = lerp(44, 42, j);
          } else {
            // and now let them go: dead centre of the hall at dome height,
            // creeping after them on a tightening lens while the hatch opens
            // ahead. Centred on purpose — off to one side, the near wall cove
            // on that side blooms into frame as a slab of white.
            // Aimed above their heads and not at them: on a 24-degree lens the
            // far end of this hall is 45 units off, so a level look puts two
            // small droids dead centre over four hundred pixels of bare deck.
            // Tilted up, the floor drops away and the lit doorway they are
            // running at takes the middle of the frame instead.
            const k = smoothstep(0, 1, (t - S1B) / (S2 - S1B));
            cam.position.set(0.2, 2.36, lerp(8.0, -4.0, k));
            cam.lookAt(0.2, 3.0 + 0.9 * k, -34 - 12 * k);
            cam.fov = lerp(40, 24, k);
          }
        }

        // the emergency wash rides along with them, so the red is always where
        // the action is instead of only over two fixed stretches of hallway
        alarmA.position.z = r2.position.z + 9;
        alarmB.position.z = r2.position.z - 11;

        shadowAt(r2Shadow, r2, 3.4, GRATE, 0.9);
        shadowAt(c3Shadow, c3, 2.7, GRATE, 0.8);
        shadowAt(leiaShadow, leia, 3.2, GRATE, t < S1 + 2 ? 0.85 : 0);

        /* --- the launch --------------------------------------------- */
        const thrown = smoothstep(CLAMPS, CLAMPS + 0.3, t);
        bay.userData.clamps.forEach((arm, i) => {
          const sx = clampSide[i];
          arm.position.x = sx * (6.2 + thrown * 1.1);
          // the model swings the pads up; dropping them instead keeps the near
          // arm out of the lens and reads better as a release anyway
          arm.rotation.z = sx * thrown * 0.85;
        });
        const iris = smoothstep(IRIS, IRIS + 0.7, t);
        voidDisc.material.opacity = iris;
        tubeGlow.intensity = iris * 20;
        const gone = podRun(t - BANG);
        // a shudder in the cradle once the clamps are off, then it goes. The
        // cradle parks the hull 0.76 above the tube's axis, so it also settles
        // down onto the bore line over the first few units of travel.
        const settle = smoothstep(CLAMPS, CLAMPS + 0.5, t) * (1 - smoothstep(BANG - 0.1, BANG, t));
        podIn.position.set(
          noise(t * 13, 8) * 0.05 * settle,
          POD_Y - 0.76 * smoothstep(0, 7, gone) - 0.07 * settle,
          POD_Z - gone
        );
        podIn.rotation.set(0, 0, gone * 0.004 + noise(t * 11, 9) * 0.01 * settle);
        // dropped as it reaches the bore: past that it is outside the set, and
        // the disc of night laid over the aperture draws in front of it
        podIn.visible = gone < 14;
        const burn = clamp((t - BANG + 0.12) * 4);
        podIn.userData.setThrottle(burn);
        podBurn.intensity = burn * 60;
        for (const f of boltFire) f.update(t);
        bayHaze.update(t);

        if (t >= S2) {
          // Near abeam from the starboard gantry, aimed a little forward of the
          // pod so the tube ring sits at frame left with the hull right of
          // centre: the nose cone reads, the cradle and clamps fall into the
          // bottom third, and there is open frame for it to launch into.
          // Looking down a few degrees keeps the ceiling light panels out.
          const k = smoothstep(0, 1, (t - S2) / (BANG - S2));
          const shake = 1.7 * Math.max(0, 1 - Math.abs(t - BANG) * 2.4);
          // and once the bolts fire it whips after the hull rather than sitting
          // on an empty cradle for the last third of a second
          const w = smoothstep(BANG, BANG + 0.3, t);
          cam.position.set(
            lerp(14.9, 14.4, k) + noise(t * 7, 1) * shake,
            lerp(9.6, 9.2, k) + noise(t * 7.4, 2) * shake,
            POD_Z + lerp(3.2, 2.2, k)
          );
          cam.lookAt(
            lerp(-2.2, -3.0, k) - w * 1.2,
            lerp(4.6, 4.4, k),
            POD_Z + lerp(-4.8, -6.2, k) - w * 6.0
          );
          cam.rotateZ(noise(t * 9, 5) * 0.028 * shake);
          cam.fov = lerp(46, 44, k) + w * 3;
        }
      }

      /* ---------------------------------------------------------------- */
      /* outside                                                           */
      /* ---------------------------------------------------------------- */
      if (!indoors) {
        world.userData.update(t);
        podOut.userData.setThrottle(1.75 + 0.4 * Math.sin(t * 7.3));
        vent.update(t);
        const gunsight = t >= S4;
        bandMat.opacity = gunsight ? 0.09 : 0.34;
        nebula.visible = !gunsight;

        if (t < S4) {
          /* --- the wide: pod, corvette, destroyer, planet ------------- */
          // Stacked by depth, which is the only way three hulls 9, 64 and 300
          // units long read at their true relative sizes in one frame: the pod
          // near and falling out of the bottom of frame, the corvette a third of
          // a kilometre back and small with it, the destroyer further again and
          // still the biggest thing in the shot.
          const k = (t - S3) / (S4 - S3);
          world.position.set(300, -1360, -1620);
          cv.position.set(10, 8, -250);
          cv.rotation.set(0.05, 1.66, 0.12 + 0.015 * Math.sin(t * 0.5));
          // 300 units of hull with the tail 120 nearer the lens than the nose:
          // parked any higher and perspective throws the stern clean out of the
          // top-right corner and all that is left is a sliver of grey
          sd.position.set(60, 40, -330);
          sd.rotation.set(0.03, 0.62, 0.02);
          deck.position.y = -9000;
          for (const g of guns) g.position.y = -9000;
          podOut.position.set(
            lerp(0, -18, Math.pow(k, 1.3)),
            lerp(4, -12, k * k * 0.45 + k * 0.55),
            lerp(-112, -18, Math.pow(k, 0.75))
          );
          podOut.rotation.set(t * 1.3, t * 0.7, t * 0.48);
          cam.position.set(lerp(-1, 3, k), lerp(8, 5, k), lerp(26, 22, k));
          cam.lookAt(lerp(6, 8, k), lerp(-16, -14, k), -180);
          cam.fov = 58;
        } else {
          /* --- the gunner: held fire ---------------------------------- */
          const k = (t - S4) / (END - S4);
          world.position.set(1700, -1100, -3600);
          cv.position.set(0, -9000, 0);
          sd.position.set(0, -9000, 0);
          deck.position.y = 0;
          guns[0].position.set(-9, DECK_Y + 3, -32);
          guns[1].position.set(17, DECK_Y + 2.3, -58);
          // held out at gunnery range: any closer and a 9-unit pod behind a
          // 30-degree sight reads as a capital ship
          podOut.position.set(lerp(6, 54, k), lerp(-13, -34, k), lerp(-124, -268, k));
          podOut.rotation.set(t * 1.05, t * 0.58, t * 0.4);

          cam.position.set(0, 0, 0);
          cam.lookAt(6, -9, -100);
          cam.fov = lerp(30, 26.5, k);

          // barrels track the pod, then elevate away as the guns stand down
          const stand = smoothstep(24.4, 26.2, t);
          _aim.copy(podOut.position).lerp(STAND_DOWN, stand);
          for (const g of guns) g.userData.aim(_aim);
        }
      }

      /* ---------------------------------------------------------------- */
      /* the gunsight overlay                                              */
      /* ---------------------------------------------------------------- */
      cam.updateProjectionMatrix();
      if (hud.visible) {
        cam.updateMatrixWorld(true);
        rig.position.copy(cam.position);
        rig.quaternion.copy(cam.quaternion);
        const fh = 2 * Math.tan((cam.fov * Math.PI) / 360) * HUD_Z;
        const fw = fh * cam.aspect;
        hudFrame.scale.set(fw / 16, fh / 9, 1);

        podOut.getWorldPosition(_v).project(cam);
        const tx = _v.x * fw * 0.5;
        const ty = _v.y * fh * 0.5;
        const close = smoothstep(S4 + 0.2, LOCK - 0.15, t);
        const release = smoothstep(25.2, END, t);
        // opens narrower than the frame's own corner brackets, or the two sets
        // sit on top of each other and neither reads
        const box = fh * lerp(0.25, 0.062, close) * (1 + release * 1.8);
        brackets.forEach((b, i) => {
          const sx = i === 0 || i === 3 ? -1 : 1;
          const sy = i < 2 ? 1 : -1;
          b.position.set(tx + sx * box, ty + sy * box, 0);
          b.scale.setScalar(fh * 0.055);
        });
        ring.position.set(tx, ty, 0);
        // does not close all the way onto the hull: at 0.07 the converged ring
        // is smaller than the pod and disappears behind it
        ring.scale.setScalar(fh * lerp(0.2, 0.105, close));

        // clear of the caption row printed into the frame texture
        const rw = fh * 0.34;
        for (const q of [readScan, readHold]) {
          q.position.set(fw * 0.5 - rw * 0.62, -fh * 0.5 + rw * 0.78, 0);
          q.scale.set(rw, rw * 0.4, 1);
        }
        readScan.visible = t < LOCK;
        readHold.visible = t >= LOCK;

        const dim = lerp(1, 0.16, smoothstep(24.5, 26.4, t));
        hudFrame.material.opacity = 0.92 * dim;
        ring.material.opacity = 0.95 * dim;
        for (const b of brackets) b.material.opacity = dim;
        readScan.material.opacity = 0.9 * dim * (Math.sin(t * 11) > -0.2 ? 1 : 0.25);
        readHold.material.opacity = 0.95 * dim * (Math.sin(t * 7.5) > -0.35 ? 1 : 0.2);
      }

      flash(c.stage, t, [
        { t: BANG, dur: 0.2, amount: 0.11, color: 0xffe6b8 },
        { t: DOOR + 0.05, dur: 0.22, amount: 0.12, color: 0xffd0a0 },
      ]);
    },
  };
}
