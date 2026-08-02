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
const S1B = 9.6;      // ...and the camera stops chasing and lets them go
const S2 = 13.35;     // the pod bay
const S3 = 17.4;      // exterior
const S4 = 21.2;      // the gunner
const END = 27.0;
const CARD_IN = 3.05; // the datacard disappears into the droid
const DOOR = 11.9;    // the pod bay hatch cracks open
const CLAMPS = 14.6;  // the clamps snap back
const IRIS = 15.1;    // the launch tube irises open onto the night
const BANG = 16.45;   // explosive bolts fire, the pod goes
const LOCK = 23.35;   // the scan comes back empty

/* interior geometry -------------------------------------------------- */
const ALC_Z = 30.8;   // the alcove sits this far down the corridor
const BAY_Z = -160;   // the pod bay is a separate set, parked out of the way
const GRATE = 0.30;   // top of the centre floor grating
const WALK = 0.36;    // top of the raised side walkway
const KNEEL = 1.15;   // how far the princess sinks to kneel
const RUN_V = 9.0;    // droid run speed, units/sec

/** Distance covered `u` seconds into the run, with a soft launch. */
const runDist = (u) => (u <= 0 ? 0 : u < 1.4 ? (RUN_V * u * u) / 2.8 : RUN_V * (u - 0.7));

/** Pod travel out of the cradle, `s` seconds after the bolts fire. */
const podRun = (s) => (s <= 0 ? 0 : 46 * s * s);

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
  const stars = Array.from({ length: 40 }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 120;
    return `<circle cx="${(128 + Math.cos(a) * d).toFixed(1)}" cy="${(128 + Math.sin(a) * d).toFixed(1)}"`
      + ` r="${(0.5 + r() * 1.1).toFixed(2)}" fill="#dfe9ff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }).join('');
  return svgTexture(svg([0, 0, 256, 256], [
    `<defs><radialGradient id="limb" cx="0.5" cy="1.08" r="0.66">`,
    `<stop offset="0" stop-color="#e08a3a"/><stop offset="0.42" stop-color="#5c3a24"/>`,
    `<stop offset="0.72" stop-color="#0a1020"/><stop offset="1" stop-color="#05070e"/>`,
    `</radialGradient></defs>`,
    `<rect width="256" height="256" fill="#05070e"/>`,
    stars,
    `<rect width="256" height="256" fill="url(#limb)" opacity="0.92"/>`,
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

  const inLights = lightRig(scene, 'interior', { shadows: false, fog: false, intensity: 0.62 });
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

  // a lit vestibule behind the hatch, so the opening reveals somewhere to go
  const vest = new THREE.Group();
  vest.add(at(tile(13, 1, 10.4, { color: C.bluishGray }), 0, 0, -50));
  vest.add(at(tile(1, 10, 10.4, { color: C.darkGray }), -6.4, 0, -45.6));
  vest.add(at(tile(1, 10, 10.4, { color: C.darkGray }), 6.4, 0, -45.6));
  vest.add(at(tile(13, 10, 0.6, { color: C.darkGray }), 0, 9.2, -45.6));
  vest.add(at(rot(cyl(0.34, 8.6, { color: 0xffc46a, glow: true, seg: 10 }), 0, 0, Math.PI / 2),
    4.3, 7.4, -49.2));
  inside.add(vest);
  vest.add(at(rot(cyl(0.34, 8.6, { color: 0xffc46a, glow: true, seg: 10 }), 0, 0, Math.PI / 2),
    -4.3, 4.6, -49.2));
  const vestLight = new THREE.PointLight(0xffd9a8, 52, 30, 2);
  vestLight.position.set(0, 5.0, -46.5);
  inside.add(vestLight);

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
  // the near jamb, a sliver of foreground at frame left
  alcove.add(at(tile(0.9, 0.9, 7.4, { color: C.veryLightGray }), -5.6, 0, ALC_Z + 4.0));
  alcove.add(at(tile(1.2, 1.1, 0.5, { color: C.lightGray }), -5.6, 7.4, ALC_Z + 4.0));
  // soffit over the nook with a warm strip tucked under it
  alcove.add(at(tile(2.4, 7.0, 0.5, { color: C.lightGray }), -4.8, 6.4, ALC_Z + 0.4));
  alcove.add(at(lit(tile(1.5, 5.2, 0.2), { color: 0xffdda6 }), -4.8, 6.2, ALC_Z + 0.4));
  // locker bank against the bulkhead
  alcove.add(at(tile(1.3, 0.7, 3.4, { color: C.lightGray }), -5.3, WALK, ALC_Z - 2.4));
  alcove.add(at(tile(1.45, 0.8, 0.24, { color: C.darkGray }), -5.3, WALK + 3.4, ALC_Z - 2.45));
  alcove.add(at(tile(0.16, 0.1, 1.9, { color: C.darkGray }), -4.62, WALK + 0.7, ALC_Z - 2.6));
  // wall readout
  alcove.add(at(tile(1.9, 0.3, 1.5, { color: C.darkGray }), -3.85, 3.9, ALC_Z - 2.72));
  alcove.add(at(lit(tile(1.55, 0.12, 1.15), { map: nookScreenTex(), opacity: 0.94 }),
    -3.85, 4.07, ALC_Z - 2.86));
  alcove.add(at(rot(cyl(0.16, 0.14, { color: 0xff6a3a, glow: true, seg: 10 }), Math.PI / 2, 0, 0),
    -2.9, 5.5, ALC_Z - 2.84));
  // a pair of crates somebody left behind
  const crateR = rng(19);
  for (let i = 0; i < 3; i++) {
    const w = 0.8 + crateR() * 0.5;
    const c = at(tile(w, w, 0.6 + crateR() * 0.5, { color: i % 2 ? C.bluishGray : C.darkGray }),
      -5.55 + crateR() * 0.3, WALK, ALC_Z - 0.6 + i * 1.35);
    rot(c, 0, (crateR() - 0.5) * 0.5, 0);
    alcove.add(c);
  }
  inside.add(alcove);

  const nookLamp = new THREE.PointLight(0xffd0a0, 9.5, 15, 2);
  nookLamp.position.set(-4.5, 5.4, ALC_Z + 0.4);
  inside.add(nookLamp);
  const nookFill = new THREE.PointLight(0xfff2dc, 3.2, 11, 2);
  nookFill.position.set(-2.4, 2.6, ALC_Z + 3.0);
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
  attachToHand(leia, card, 'L');
  card.rotation.set(-1.15, 0, 0);
  inside.add(r2, c3, leia);
  const r2Shadow = contact();
  const c3Shadow = contact();
  const leiaShadow = contact();

  // the slot the plans go into, and the tell-tale that lights once they are in
  const r2Body = r2.userData.dome.parent;
  r2Body.add(at(tile(0.62, 0.2, 0.42, { color: C.darkGray }), 0, 1.42, -0.74));
  const slotLamp = at(lit(tile(0.4, 0.1, 0.12), { color: 0x9fe8ff, opacity: 0 }), 0, 1.54, -0.8);
  r2Body.add(slotLamp);

  /* --- the run path --------------------------------------------------- */

  const runCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.95, 0, 31.3),
    new THREE.Vector3(-2.2, 0, 29.6),
    new THREE.Vector3(-0.7, 0, 27.6),
    new THREE.Vector3(0.4, 0, 22.5),
    new THREE.Vector3(0.1, 0, 9.0),
    new THREE.Vector3(0.6, 0, -10.0),
    new THREE.Vector3(0.2, 0, -30.0),
    new THREE.Vector3(0.4, 0, -38.0),
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
  const hits = new Impacts(inside, bolts.impacts().map((h) => ({
    t: h.t, pos: [h.pos.x, h.pos.y, h.pos.z], size: 0.9, color: 0xffd0a0,
  })), { dur: 0.3 });
  const muzzleLight = new THREE.PointLight(0xff7a3a, 0, 52, 2);
  muzzleLight.position.set(0.2, 4.4, 38.2);
  inside.add(muzzleLight);

  /* --- the pod bay ---------------------------------------------------- */

  const bay = podBay({ width: 24, height: 11, depth: 26, seed: 55, practicals: 3 });
  bay.position.set(0, 0, BAY_Z);
  inside.add(bay);
  for (const l of bay.userData.lamps) l.intensity = 26;
  // podBay leaves its -Z end open around the launch tube; without this the
  // shot looks past the tube ring into empty space.
  const tubeR = bay.userData.tubeRadius;
  const gap = 12 - (tubeR + 1.35);
  for (const sx of [-1, 1]) {
    bay.add(at(tile(gap, 1.0, 11.6, { color: C.veryLightGray }),
      sx * (12 - gap / 2), 0, -13.6));
    bay.add(at(tile(0.5, 1.2, 11.6, { color: C.darkGray }), sx * (tubeR + 1.35), 0, -13.55));
  }
  bay.add(at(tile(24, 1.0, 1.6, { color: C.lightGray }), 0, 11.4, -13.6));

  // podBay's floods sit on the centreline and leave the pod's flank in shadow
  const podFill = new THREE.PointLight(0xffe8d2, 34, 26, 2);
  podFill.position.set(7.2, 7.4, BAY_Z + 3.4);
  inside.add(podFill);

  // The tube's blast hatch is a static plate in the model, so the aperture gets
  // its own disc of night laid over it and faded up as the iris runs back.
  const voidDisc = new THREE.Mesh(
    new THREE.CircleGeometry(bay.userData.tubeRadius * 1.02, 40),
    new THREE.MeshBasicMaterial({
      map: tubeVoidTex(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
    }),
  );
  voidDisc.position.set(0, bay.userData.tubeRadius + 1.2, BAY_Z - 12.9);
  inside.add(voidDisc);
  const tubeGlow = new THREE.PointLight(0xc2d8ff, 0, 30, 2);
  tubeGlow.position.set(0, bay.userData.tubeRadius + 1.2, BAY_Z - 10.4);
  inside.add(tubeGlow);

  const podIn = escapePod({ seed: 3 });
  inside.add(podIn);
  const POD_Y = 4.0;
  const POD_Z = BAY_Z + 1.2;

  // The explosive bolts are squibs at the four clamp pads, not a fireball on the
  // pod: anything centred on the hull at this focal length swallows the frame.
  const boltFire = [[-3.6, 5.4], [-3.6, -3.0], [3.6, 5.4], [3.6, -3.0]].map(([x, z], i) => new Fireball(inside, {
    t0: BANG - 0.03 + i * 0.02, pos: [x, 3.0, BAY_Z + z], size: 0.62, dur: 0.26,
    seed: 40 + i * 7, brickCount: 5, gravity: -9, ring: false,
    color: 0xfff0cc, color2: 0xffa652,
  }));
  const bayHaze = new Smoke(inside, {
    t0: BANG - 0.05, count: 20, origin: [0, 3.2, BAY_Z - 1.0], spread: 9, size: 5.5, rise: 1.1,
    life: 2.4, opacity: 0.22, color: 0xc8cdd4, spawnWindow: 0.8, seed: 19,
  });

  /* --- outside -------------------------------------------------------- */

  outside.add(spaceBackdrop({ seed: 31, radius: 6400, count: 5200 }));

  const SUN = new THREE.Vector3(220, 160, 120).normalize();
  const world = planet({ radius: 1000, type: 'desert', seed: 88, seg: 72 });
  world.userData.setSunDir(SUN);
  outside.add(world);

  const cv = corvette({ seed: 11 });
  const sd = starDestroyer({ seed: 7 });
  const podOut = escapePod({ seed: 3 });
  outside.add(cv, sd, podOut);
  cv.userData.setThrottle(0.12);
  for (const i of [0, 3, 7, 9]) cv.userData.killEngine(i, true);
  sd.userData.setThrottle(0.55);

  const vent = new Smoke(cv, {
    t0: -3, count: 14, origin: [0, 6, 26], spread: 12, size: 9, rise: 0.2,
    life: 8, opacity: 0.2, color: 0x565d66, spawnWindow: 8, seed: 51,
  });

  // the gun deck: three stepped plates of imperial hull tapering away below the
  // gunner, dark enough that the space key does not blow them out
  const deck = new THREE.Group();
  const DECK_Y = -23;
  const plates = [[130, 62, -30, 0x44474a], [104, 44, -84, 0x4b4e51], [64, 28, -118, 0x3f4245]];
  plates.forEach(([w, d, z, col], i) => {
    deck.add(at(tile(w, d, 3, { color: col }), 0, DECK_Y - i * 0.7, z));
  });
  for (const sx of [-1, 1]) {
    deck.add(at(tile(5, 120, 0.7, { color: 0x1d2023 }), sx * 21, DECK_Y + 3, -60));
    deck.add(at(tile(2.4, 96, 0.5, { color: 0x2b2e31 }), sx * 40, DECK_Y + 3, -48));
  }
  const deckR = rng(41);
  for (let i = 0; i < 34; i++) {
    const w = 2 + deckR() * 6;
    deck.add(at(tile(w, 2 + deckR() * 7, 0.6 + deckR() * 2.0, {
      color: deckR() < 0.45 ? 0x2f3235 : 0x585c5e,
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
  const STAND_DOWN = new THREE.Vector3(-160, 340, -520);

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
        hall.userData.setLights(lerp(0.42, 0.8, smoothstep(S1 - 0.5, S1 + 0.4, t)) * hum);
        bay.userData.update(t);
        door.userData.update(t);
        door.userData.setOpen(0.78 * smoothstep(DOOR, DOOR + 1.0, t));

        bolts.update(t);
        hits.update(t);
        let strobe = 0;
        for (const s of shots) strobe += Math.max(0, 1 - Math.abs(t - s.t0) * 11);
        muzzleLight.intensity = clamp(strobe, 0, 1.6) * 70;
        const running = smoothstep(S1 - 0.2, S1 + 0.6, t);
        nookLamp.intensity = 9.5 * (1 - smoothstep(S1 + 0.6, S1 + 1.6, t));
        nookFill.intensity = 3.2 * (1 - running);
        const blink = (Math.sin(t * 4.4) > 0 ? 1 : 0.06) * running;
        alarmA.intensity = 16 * blink;
        alarmB.intensity = 16 * (Math.sin(t * 4.4 + 2.1) > 0 ? 1 : 0.06) * running;

        if (t < S1) {
          /* --- the hand-off ------------------------------------------- */
          r2.position.set(-2.95, GRATE, 31.3);
          r2.rotation.set(0, 2.961, 0);
          r2.userData.setCenterFoot(1);
          r2.userData.roll(0);
          // the dome watches her hands, then tips up to her face
          r2.userData.dome.rotation.y = lerp(
            lerp(0.6, 0.12, smoothstep(0.7, 2.2, t)),
            0.72, smoothstep(CARD_IN + 0.1, 4.3, t)
          ) + 0.04 * Math.sin(t * 1.9);
          slotLamp.material.opacity = smoothstep(CARD_IN, CARD_IN + 0.3, t)
            * (0.55 + 0.45 * Math.sin(t * 13));

          leia.position.set(-4.7, WALK - KNEEL, 31.25);
          leia.rotation.set(0, -2.708, 0);
          leia.userData.parts.root.rotation.set(0.07, 0, -0.03);
          const reach = smoothstep(0.5, 2.0, t);
          const push = smoothstep(2.2, CARD_IN, t);
          const rest = smoothstep(CARD_IN + 0.2, 4.2, t);
          pose(leia, {
            armR: { x: 0.3 + 0.1 * Math.sin(t * 1.1), y: 0, z: -0.34 },
            handR: 0.2,
            handL: -0.5 - reach * 0.35,
            lean: 0.1 + reach * 0.08 - rest * 0.05,
            headX: 0.12 + reach * 0.2 - rest * 0.22,
            headY: 0.42 + reach * 0.2 - rest * 0.34,
          });
          // her free hand tracks the slot: in, press home, then settle on the dome
          _aim.set(-3.53, 1.72, 31.28);
          _aim.y += (1 - reach) * 1.5;
          _aim.z += (1 - reach) * 0.7;
          _aim.x -= push * 0.14;
          if (rest > 0) {
            _aim.lerp(_v.set(-3.16, 2.9, 31.44), rest);
          }
          reachTo(leia, 'L', _aim);
          card.visible = t < CARD_IN;

          // out at the mouth of the nook, watching the corridor and fretting
          c3.position.set(-0.6, GRATE, 24.5);
          c3.rotation.set(0, 2.79, 0);
          const f1 = Math.sin(t * 3.3);
          const f2 = Math.sin(t * 2.1 + 1.2);
          pose(c3, {
            armR: { x: 0.5 + 0.42 * f1, y: 0, z: 0.34 },
            armL: { x: 0.54 - 0.44 * f2, y: 0, z: -0.36 },
            handR: -0.95, handL: 0.95,
            legR: 0.03, legL: -0.03,
            lean: -0.02 + 0.03 * f2,
            headY: -0.5 + 0.3 * Math.sin(t * 1.25),
            headX: -0.04,
          });

          const k = smoothstep(0, 1, t / S1);
          cam.position.set(-3.5 + 0.14 * k, 2.46 - 0.08 * k, 38.4 - 1.4 * k);
          cam.lookAt(-3.9, 2.4 + 0.1 * k, 31.1);
          cam.fov = 43 - 3.5 * k;
        } else {
          /* --- the run ------------------------------------------------ */
          const u = t - S1 - 0.3;
          const d = runDist(u);
          const dG = Math.max(0, d - 1.0);
          onRun(r2, d, 0.9, GRATE);
          onRun(c3, dG, -1.5, GRATE);
          r2.userData.setCenterFoot(1 - smoothstep(S1 + 0.1, S1 + 0.7, t));
          r2.userData.roll(d);
          // glances back at every burst, then fixes on the hatch again
          let look = 0;
          for (const s of shots) look += pulse(t, s.t0 - 0.15, 1.2);
          r2.userData.dome.rotation.y = clamp(look, 0, 1) * 2.6 + 0.2 * Math.sin(t * 2.3);
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
          leia.position.set(-4.7, WALK - KNEEL, 31.25);
          card.visible = false;

          if (t < S1B) {
            // dollying with them off their quarter, low enough that the dome
            // fills its share of frame; the bolts come in over our shoulder
            const jog = noise(t * 4.6, 11) * 0.06;
            // clamped so the dolly never backs through the aft bulkhead while
            // the droids are still getting under way
            cam.position.set(3.1, 2.4 + jog, Math.min(37.4, r2.position.z + 9.2));
            cam.lookAt(0.75, 2.2, r2.position.z - 1.0);
            cam.fov = lerp(48, 42, smoothstep(S1, S1B, t));
          } else {
            // and now let them go: locked off, low, the hatch cracking ahead
            const k = smoothstep(0, 1, (t - S1B) / (S2 - S1B));
            cam.position.set(0.9, 2.2, 5.4);
            cam.lookAt(0.25, 2.1 + 0.5 * k, -14 - 12 * k);
            cam.fov = lerp(46, 33, k);
          }
        }

        shadowAt(r2Shadow, r2, 3.4, GRATE, 0.9);
        shadowAt(c3Shadow, c3, 2.7, GRATE, 0.8);
        shadowAt(leiaShadow, leia, 3.4, WALK, t < S1 ? 0.85 : 0);

        /* --- the launch --------------------------------------------- */
        bay.userData.setClamps(1 - smoothstep(CLAMPS, CLAMPS + 0.35, t));
        const iris = smoothstep(IRIS, IRIS + 0.7, t);
        voidDisc.material.opacity = iris;
        tubeGlow.intensity = iris * 16;
        const gone = podRun(t - BANG);
        // a shudder in the cradle once the clamps are off, then it goes
        const settle = smoothstep(CLAMPS, CLAMPS + 0.5, t) * (1 - smoothstep(BANG - 0.1, BANG, t));
        podIn.position.set(
          noise(t * 13, 8) * 0.05 * settle,
          POD_Y + gone * 0.012 - 0.07 * settle,
          POD_Z - gone
        );
        podIn.rotation.set(-gone * 0.004, 0, gone * 0.005 + noise(t * 11, 9) * 0.01 * settle);
        podIn.visible = gone < 26;
        podIn.userData.setThrottle(clamp((t - BANG + 0.12) * 4) * 1.3);
        for (const f of boltFire) f.update(t);
        bayHaze.update(t);

        if (t >= S2) {
          // Near profile from the starboard wall, sat between the two clamp
          // pairs so their arms frame the edges instead of crossing the pod,
          // and angled just far enough down-bay to keep the tube mouth at
          // frame right — the pod then leaves along a line we already read.
          const k = smoothstep(0, 1, (t - S2) / (BANG - S2));
          const shake = 1.5 * Math.max(0, 1 - Math.abs(t - BANG) * 2.6);
          cam.position.set(
            lerp(10.9, 10.2, k) + noise(t * 7, 1) * shake,
            lerp(5.4, 5.0, k) + noise(t * 7.4, 2) * shake,
            POD_Z + lerp(1.6, 0.4, k)
          );
          cam.lookAt(lerp(0.2, -0.2, k), lerp(4.5, 4.4, k), POD_Z + lerp(-2.2, -3.4, k));
          cam.rotateZ(noise(t * 9, 5) * 0.024 * shake);
          cam.fov = lerp(61, 55, k);
        }
      }

      /* ---------------------------------------------------------------- */
      /* outside                                                           */
      /* ---------------------------------------------------------------- */
      if (!indoors) {
        world.userData.update(t);
        podOut.userData.setThrottle(1.5 + 0.45 * Math.sin(t * 7.3));
        vent.update(t);

        if (t < S4) {
          /* --- the wide: pod, corvette, destroyer, planet ------------- */
          const k = (t - S3) / (S4 - S3);
          world.position.set(300, -1360, -1620);
          cv.position.set(-58, 24, -226);
          cv.rotation.set(0.05, 1.7, 0.14 + 0.015 * Math.sin(t * 0.5));
          sd.position.set(128, 54, -318);
          sd.rotation.set(0.04, 0.3, 0.02);
          deck.position.y = -9000;
          for (const g of guns) g.position.y = -9000;
          podOut.position.set(
            lerp(-38, 12, k),
            lerp(15, -20, k * k * 0.55 + k * 0.45),
            lerp(-172, -26, Math.pow(k, 0.75))
          );
          podOut.rotation.set(t * 1.3, t * 0.7, t * 0.48);
          cam.position.set(lerp(0, 3, k), lerp(9, 4.5, k), lerp(26, 21, k));
          cam.lookAt(2, -20, -210);
          cam.fov = 56;
        } else {
          /* --- the gunner: held fire ---------------------------------- */
          const k = (t - S4) / (END - S4);
          world.position.set(1700, -1100, -3600);
          cv.position.set(0, -9000, 0);
          sd.position.set(0, -9000, 0);
          deck.position.y = 0;
          guns[0].position.set(-9, DECK_Y + 3, -32);
          guns[1].position.set(17, DECK_Y + 2.3, -58);
          podOut.position.set(lerp(2, 30, k), lerp(-6, -14, k), lerp(-58, -118, k));
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
        const box = fh * lerp(0.36, 0.075, close) * (1 + release * 1.8);
        brackets.forEach((b, i) => {
          const sx = i === 0 || i === 3 ? -1 : 1;
          const sy = i < 2 ? 1 : -1;
          b.position.set(tx + sx * box, ty + sy * box, 0);
          b.scale.setScalar(fh * 0.055);
        });
        ring.position.set(tx, ty, 0);
        ring.scale.setScalar(fh * lerp(0.2, 0.07, close));

        const rw = fh * 0.36;
        for (const q of [readScan, readHold]) {
          q.position.set(fw * 0.5 - rw * 0.62, -fh * 0.5 + rw * 0.3, 0);
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
        { t: BANG, dur: 0.26, amount: 0.22, color: 0xffe6b8 },
        { t: DOOR + 0.05, dur: 0.22, amount: 0.14, color: 0xffd0a0 },
      ]);
    },
  };
}
