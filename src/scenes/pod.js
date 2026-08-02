/**
 * Scene 4 — Pod Seven.  The hand-off: the plans leave the ship inside a droid.
 *
 *   0.0  the hand-off — a side alcove, the princess pushes the datacard home
 *   5.0  the run — two droids hurry down the corridor under blaster fire
 *  13.3  the launch — clamps blow back, pod seven drops out of its cradle
 *  17.4  outside — the pod tumbles away from the corvette toward the planet
 *  21.4  held fire — an imperial gunsight boxes the pod, then stands down
 *
 * Two sets live in one THREE.Scene: `inside` (corridor, alcove, pod bay) and
 * `outside` (space, planet, hulls). Only one is ever visible, and each has its
 * own light rig which is faded to zero when its set is off camera.
 */
import * as THREE from 'three';
import { corvette, starDestroyer, escapePod, turbolaserTower } from '../models/ships.js';
import { corridor, blastDoor, podBay, planet, spaceBackdrop } from '../models/environments.js';
import { princess, protocolDroid, astromech, datacard } from '../models/characters.js';
import { pose, walk, attachToHand } from '../lego/minifig.js';
import { svgTexture, svg } from '../lego/svgtex.js';
import { at, tile, cyl, C } from '../lego/bricks.js';
import {
  lightRig, Bolts, volley, Impacts, Fireball, Smoke,
  clamp, lerp, smoothstep, noise, pulse, flash,
} from './_kit.js';

export const id = 'pod';

/* beat boundaries, local scene time ---------------------------------- */
const S1 = 5.0;      // the run begins
const S1B = 9.4;     // ...and the camera lets them go
const S2 = 13.3;     // pod bay
const S3 = 17.4;     // exterior
const S4 = 21.4;     // gunner's view
const END = 27.0;
const CARD_IN = 3.08;   // the datacard disappears into the droid
const CLAMPS = 14.3;    // clamps snap back
const BANG = 16.5;      // explosive bolts fire, the pod drops

const ALC_Z = 30.8;     // the alcove sits this far down the corridor
const BAY_Z = -140;     // the pod bay is a separate set, parked out of the way
const RUN_V = 8.6;      // droid run speed, units/sec

/** Distance covered `u` seconds into the run, with a soft launch. */
const runDist = (u) => (u <= 0 ? 0 : u < 1.4 ? (RUN_V * u * u) / 2.8 : RUN_V * (u - 0.7));

/* ------------------------------------------------------------------ */
/* printed art                                                         */
/* ------------------------------------------------------------------ */

const HUD = '#8dffb4';
const HUD_DIM = '#4f9c72';

/** Soft contact shadow, so figures sit on the deck instead of hovering. */
function blobTex() {
  return svgTexture(svg([0, 0, 128, 128], `
    <defs><radialGradient id="b" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#000" stop-opacity="0.66"/>
      <stop offset="0.45" stop-color="#000" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="128" height="128" fill="url(#b)"/>`), { w: 128, h: 128, key: 'podBlob' });
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
    `<g stroke="${HUD}" stroke-width="3" opacity="0.55">`,
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
    `<g fill="none" stroke="${HUD}" stroke-width="9" stroke-linecap="square">`,
    `<path d="M6 40 L6 6 L40 6"/>`,
    `</g>`,
    `<rect x="4" y="4" width="9" height="9" fill="${HUD}"/>`,
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
      `<text x="18" y="74">RNG  04.62</text>`,
      `<text x="18" y="110">SCAN . . .</text>`,
      bar(196, 30, 96), bar(196, 66, 62), bar(196, 102, 34),
    ].join('')
    : [
      `<text x="18" y="38">LIFE FORMS</text>`,
      `<text x="196" y="38" fill="#ffd25a">NONE</text>`,
      `<text x="18" y="86" font-size="34" fill="#ff8a4a">HOLD FIRE</text>`,
      `<rect x="14" y="98" width="270" height="4" fill="#ff8a4a" opacity="0.8"/>`,
    ].join('');
  return svgTexture(svg([0, 0, 320, 128], [
    `<rect x="4" y="4" width="312" height="120" fill="#04170c" opacity="0.5"/>`,
    `<rect x="4" y="4" width="312" height="120" fill="none" stroke="${HUD}" stroke-width="3" opacity="0.8"/>`,
    `<g fill="${HUD}" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="2">`,
    body,
    `</g>`,
  ].join(''), { w: 640, h: 256 }), { w: 640, h: 256, key: 'podReadout' + kind });
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060a);

  const inLights = lightRig(scene, 'interior', { shadows: false, fog: false });
  const spLights = lightRig(scene, 'space', { shadows: false, fog: false });
  inLights.key.position.set(6, 24, 30);
  const base = (r) => ({ key: r.key.intensity, fill: r.fill.intensity, rim: r.rim.intensity, amb: r.amb.intensity });
  const IN = base(inLights);
  const SP = base(spLights);

  const inside = new THREE.Group();
  const outside = new THREE.Group();
  scene.add(inside, outside);

  /* --- the corridor and its alcove ----------------------------------- */

  const hall = corridor({ segments: 8, width: 12, height: 9, segLen: 10, seed: 33, practicals: 5 });
  inside.add(hall);

  const door = blastDoor({ width: 12, height: 9, seed: 44, label: 'POD BAY 7' });
  door.position.set(0, 0, -40.4);
  inside.add(door);

  // a lit vestibule behind the hatch, so the opening reveals somewhere to go
  const vest = new THREE.Group();
  vest.add(at(tile(13, 1, 10.4, { color: C.bluishGray }), 0, 0, -50));       // back wall
  vest.add(at(tile(1, 10, 10.4, { color: C.darkGray }), -6.4, 0, -45.6));
  vest.add(at(tile(1, 10, 10.4, { color: C.darkGray }), 6.4, 0, -45.6));
  vest.add(at(tile(13, 10, 0.6, { color: C.darkGray }), 0, 9.2, -45.6));
  vest.add(at(cyl(0.34, 8.6, { color: 0xffc46a, glow: true, seg: 10 }), 0, 7.4, -49.4));
  vest.children[4].rotation.z = Math.PI / 2;
  inside.add(vest);

  const alcove = new THREE.Group();
  for (const dz of [-3.4, 3.4]) {
    alcove.add(at(tile(3.8, 0.9, 7.3, { color: C.veryLightGray }), -4.1, 0, ALC_Z + dz));
    alcove.add(at(tile(4.3, 1.1, 0.55, { color: C.lightGray }), -3.85, 7.3, ALC_Z + dz));
    alcove.add(at(tile(0.7, 1.0, 7.6, { color: C.bluishGray }), -2.35, 0, ALC_Z + dz));
    alcove.add(at(tile(0.9, 0.5, 0.4, { color: 0xffd08a, glow: true }), -2.35, 7.7, ALC_Z + dz));
  }
  // nook fittings: locker bank, pipe run, a warm strip in the ceiling
  alcove.add(at(tile(1.4, 3.2, 2.3, { color: C.lightGray }), -5.2, 0, ALC_Z - 2.0));
  alcove.add(at(tile(1.5, 3.3, 0.24, { color: C.darkGray }), -5.15, 2.3, ALC_Z - 2.0));
  alcove.add(at(tile(1.2, 1.2, 1.1, { color: C.bluishGray }), -5.3, 2.54, ALC_Z - 2.4));
  alcove.add(at(tile(0.4, 2.6, 1.9, { color: C.darkGray }), -5.75, 4.3, ALC_Z + 2.1));
  alcove.add(at(tile(0.3, 2.2, 1.4, { color: 0x2a4a6a, glow: true, opacity: 0.9 }), -5.5, 4.55, ALC_Z + 2.1));
  alcove.add(at(tile(3.4, 5.4, 0.34, { color: 0xffe1ae, glow: true }), -4.2, 6.9, ALC_Z));
  inside.add(alcove);

  const nookLamp = new THREE.PointLight(0xffd2a0, 26, 20, 2);
  nookLamp.position.set(-3.6, 5.4, ALC_Z + 0.2);
  inside.add(nookLamp);
  const nookFill = new THREE.PointLight(0xfff0d6, 12, 14, 2);
  nookFill.position.set(-0.4, 2.4, ALC_Z + 1.4);
  inside.add(nookFill);

  /* --- the cast ------------------------------------------------------ */

  const shadowMat = new THREE.MeshBasicMaterial({
    map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8,
  });
  const contact = (w) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.34;
    m.renderOrder = 2;
    inside.add(m);
    return m;
  };

  const r2 = astromech({ seed: 12 });
  const c3 = protocolDroid();
  const leia = princess({ prop: false });
  const card = datacard();
  attachToHand(leia, card, 'L');
  inside.add(r2, c3, leia);
  const r2Shadow = contact(3.6);
  const c3Shadow = contact(2.8);
  const leiaShadow = contact(3.8);

  /* --- the run path -------------------------------------------------- */

  const runCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.5, 0, ALC_Z - 0.4),
    new THREE.Vector3(-1.4, 0, ALC_Z - 2.2),
    new THREE.Vector3(0.4, 0, 25.4),
    new THREE.Vector3(0.7, 0, 6.0),
    new THREE.Vector3(0.1, 0, -16.0),
    new THREE.Vector3(0.5, 0, -37.0),
  ], false, 'catmullrom', 0.35);
  const runLen = runCurve.getLength();
  const _p = new THREE.Vector3();
  const _tg = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  /** Put `obj` `d` units along the run, `side` units off the centre line. */
  const onRun = (obj, d, side = 0) => {
    const u = clamp(d / runLen, 0, 1);
    runCurve.getPointAt(u, _p);
    runCurve.getTangentAt(u, _tg);
    const rx = _tg.z, rz = -_tg.x;             // tangent x up, normalised already
    obj.position.set(_p.x + rx * side, 0, _p.z + rz * side);
    obj.rotation.set(0, Math.atan2(-_tg.x, -_tg.z), 0);
    return obj;
  };

  /* --- blaster fire from around the corner --------------------------- */

  const shots = [
    ...volley({ t0: 5.8, count: 3, interval: 0.17, from: [2.6, 3.4, 36.5], to: [-5.5, 2.7, 13], speed: 96, color: 0xff2b12, len: 3.4, thick: 0.17, seed: 3, spread: 2.0, fromSpread: 1.6 }),
    ...volley({ t0: 7.25, count: 4, interval: 0.15, from: [-2.4, 3.9, 36.8], to: [5.4, 2.3, 5], speed: 102, color: 0xff2b12, len: 3.4, thick: 0.17, seed: 9, spread: 2.2, fromSpread: 1.8 }),
    ...volley({ t0: 9.1, count: 3, interval: 0.16, from: [1.6, 3.0, 37.2], to: [-5.4, 3.6, -7], speed: 108, color: 0xff2b12, len: 3.6, thick: 0.17, seed: 17, spread: 2.4, fromSpread: 1.6 }),
    ...volley({ t0: 11.0, count: 4, interval: 0.14, from: [-1.2, 3.7, 37.4], to: [5.2, 2.5, -15], speed: 112, color: 0xff2b12, len: 3.6, thick: 0.17, seed: 23, spread: 2.6, fromSpread: 2.0 }),
    ...volley({ t0: 12.3, count: 3, interval: 0.15, from: [2.0, 3.2, 37.4], to: [-5.2, 2.2, -22], speed: 116, color: 0xff2b12, len: 3.6, thick: 0.17, seed: 31, spread: 2.6, fromSpread: 1.8 }),
  ];
  const bolts = new Bolts(inside, shots);
  const hits = new Impacts(inside, bolts.impacts().map((h) => ({
    t: h.t, pos: [h.pos.x, h.pos.y, h.pos.z], size: 0.85, color: 0xffd0a0,
  })), { dur: 0.3 });
  const muzzleLight = new THREE.PointLight(0xff7a3a, 0, 46, 2);
  muzzleLight.position.set(0.5, 4.4, 35);
  inside.add(muzzleLight);

  /* --- the pod bay --------------------------------------------------- */

  const bay = podBay({ width: 20, height: 11, depth: 26, seed: 55 });
  bay.position.set(0, 0, BAY_Z);
  inside.add(bay);

  const podIn = escapePod({ seed: 3 });
  inside.add(podIn);
  const POD_HOME = new THREE.Vector3(0, 4.0, BAY_Z + 1.2);

  const boltFire = [-4.2, 4.2].map((x) => new Fireball(inside, {
    t0: BANG, pos: [x, 4.4, BAY_Z + 1.2], size: 2.6, dur: 0.5, seed: 40 + x,
    brickCount: 10, gravity: -6, ring: false, color: 0xffe0a0,
  }));
  const bayHaze = new Smoke(inside, {
    t0: BANG, count: 16, origin: [0, 4.0, BAY_Z - 1.5], spread: 7, size: 5, rise: 0.7,
    life: 2.2, opacity: 0.3, color: 0xc8cdd4, spawnWindow: 0.6, seed: 19,
  });

  /* --- outside ------------------------------------------------------- */

  outside.add(spaceBackdrop({ seed: 31, radius: 6400, count: 5200 }));

  const SUN = new THREE.Vector3(220, 160, 120).normalize();
  const world = planet({ radius: 1000, type: 'desert', seed: 88, seg: 72 });
  world.userData.setSunDir(SUN);
  outside.add(world);

  const cv = corvette({ seed: 11 });
  const sd = starDestroyer({ seed: 7 });
  const podOut = escapePod({ seed: 3 });
  const gun = turbolaserTower({ seed: 61 });
  outside.add(cv, sd, podOut, gun);
  cv.userData.setThrottle(0);
  for (let i = 0; i < 11; i++) cv.userData.killEngine(i, true);
  sd.userData.setThrottle(0.5);

  const vent = new Smoke(cv, {
    t0: -2, count: 16, origin: [0, 5, 27], spread: 10, size: 8, rise: 0.2,
    life: 7, opacity: 0.22, color: 0x555c65, spawnWindow: 7, seed: 51,
  });

  /* --- the gunsight -------------------------------------------------- */

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
  const hudParts = [hudFrame, ...brackets, ring, readScan, readHold];

  /* --- helpers ------------------------------------------------------- */

  const _v = new THREE.Vector3();
  const setLights = (indoors) => {
    inLights.key.intensity = indoors ? IN.key : 0;
    inLights.fill.intensity = indoors ? IN.fill : 0;
    inLights.rim.intensity = indoors ? IN.rim : 0;
    inLights.amb.intensity = indoors ? IN.amb : 0;
    spLights.key.intensity = indoors ? 0 : SP.key;
    spLights.fill.intensity = indoors ? 0 : SP.fill;
    spLights.rim.intensity = indoors ? 0 : SP.rim;
    spLights.amb.intensity = indoors ? 0 : SP.amb;
  };
  const shadowAt = (m, obj, w, o = 1) => {
    m.position.set(obj.position.x, 0.34, obj.position.z);
    m.scale.setScalar(w);
    m.material.opacity = 0.8 * o;
  };

  return {
    scene,

    cues: [
      /* --- the hand-off --- */
      { t: 0.15, sfx: 'alarm', opts: { gain: 0.12, dur: 5.4, period: 0.62 } },
      { t: 1.05, sfx: 'droidBeep', opts: { gain: 0.3, n: 3, happy: false, speed: 0.8, pan: 0.1 } },
      { t: 2.35, sfx: 'protocolFuss', opts: { gain: 0.24, syllables: 4, speed: 1.1, pan: -0.3 } },
      { t: CARD_IN + 0.02, sfx: 'commBeep', opts: { gain: 0.3, f1: 880, f2: 1320, len: 0.06 } },
      { t: CARD_IN + 0.24, sfx: 'droidBeep', opts: { gain: 0.46, n: 5, happy: true, pan: 0.12 } },
      { t: 3.95, sfx: 'protocolFuss', opts: { gain: 0.36, syllables: 7, pan: -0.3 } },
      { t: 4.86, sfx: 'droidWorry', opts: { gain: 0.34, dur: 0.85, pan: 0.12 } },

      /* --- the run --- */
      { t: S1 + 0.1, sfx: 'alarm', opts: { gain: 0.3, dur: 8.4, period: 0.44 } },
      { t: S1 + 0.42, sfx: 'doorBlast', opts: { gain: 0.72, pan: 0.35 } },
      ...shots.map((s, i) => ({
        t: s.t0,
        sfx: 'blaster',
        opts: { gain: 0.42, pan: clamp(s.from[0] / 6, -1, 1) * 0.7, pitch: 0.92 + (i % 3) * 0.07 },
      })),
      { t: 6.6, sfx: 'droidBeep', opts: { gain: 0.4, n: 4, happy: false, speed: 1.4 } },
      { t: 7.6, sfx: 'protocolFuss', opts: { gain: 0.42, syllables: 8, speed: 1.25, seed: 2 } },
      { t: 9.5, sfx: 'droidWorry', opts: { gain: 0.4, dur: 0.9 } },
      { t: 10.5, sfx: 'protocolFuss', opts: { gain: 0.4, syllables: 6, speed: 1.35, seed: 5 } },
      { t: 11.95, sfx: 'doorBlast', opts: { gain: 0.6, pan: -0.15 } },
      { t: 12.6, sfx: 'droidBeep', opts: { gain: 0.42, n: 5, happy: true, speed: 1.5 } },

      /* --- the launch --- */
      { t: S2 + 0.05, sfx: 'alarm', opts: { gain: 0.42, dur: 3.6, period: 0.34, hi: 700, lo: 500 } },
      { t: CLAMPS, sfx: 'doorBlast', opts: { gain: 0.5, pan: 0.2 } },
      { t: 15.6, sfx: 'commBeep', opts: { gain: 0.3, f1: 1320, f2: 990 } },
      { t: BANG, sfx: 'podLaunch', opts: { gain: 1.0 } },
      { t: BANG + 0.06, sfx: 'engineWhoosh', opts: { gain: 0.72, dur: 1.3 } },

      /* --- outside --- */
      { t: S3 + 0.04, sfx: 'engineWhoosh', opts: { gain: 0.44, dur: 2.4 } },
      { t: 19.4, sfx: 'radioStatic', opts: { gain: 0.24, dur: 0.6 } },
      { t: 20.95, sfx: 'commBeep', opts: { gain: 0.34, f1: 1180, f2: 1570 } },

      /* --- held fire --- */
      { t: S4 + 0.02, sfx: 'radioStatic', opts: { gain: 0.3, dur: 0.9, crackle: 1.4 } },
      { t: S4 + 0.5, sfx: 'commBeep', opts: { gain: 0.26, f1: 1480, f2: 1480, len: 0.05 } },
      { t: S4 + 0.95, sfx: 'commBeep', opts: { gain: 0.28, f1: 1560, f2: 1560, len: 0.05 } },
      { t: S4 + 1.3, sfx: 'commBeep', opts: { gain: 0.3, f1: 1660, f2: 1660, len: 0.05 } },
      { t: 23.4, sfx: 'commBeep', opts: { gain: 0.4, f1: 1900, f2: 1240, len: 0.11 } },
      { t: 24.9, sfx: 'radioStatic', opts: { gain: 0.26, dur: 1.1 } },
      { t: 26.1, sfx: 'commBeep', opts: { gain: 0.22, f1: 860, f2: 700, len: 0.09 } },
    ],

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);
      const indoors = t < S3;
      inside.visible = indoors;
      outside.visible = !indoors;
      setLights(indoors);
      hud.visible = t >= S4;

      /* ---------------------------------------------------------------- */
      /* interior state                                                    */
      /* ---------------------------------------------------------------- */
      if (indoors) {
        hall.userData.update(t);
        bay.userData.update(t);

        // blaster fire behind them, and the light it throws down the hall
        bolts.update(t);
        hits.update(t);
        let strobe = 0;
        for (const s of shots) strobe += Math.max(0, 1 - Math.abs(t - s.t0) * 11);
        muzzleLight.intensity = strobe * 90;
        nookLamp.intensity = t < S1 + 1.4 ? 26 : 0;
        nookFill.intensity = t < S1 ? 12 : 0;
        door.userData.setOpen(0.62 * smoothstep(11.9, 12.9, t));

        if (t < S1) {
          /* --- the hand-off ------------------------------------------- */
          r2.position.set(-3.5, 0, ALC_Z - 0.4);
          r2.rotation.set(0, -Math.PI / 2 - 0.35, 0);
          r2.userData.setCenterFoot(1);
          r2.userData.roll(0);
          // the dome watches her, then drops to the panel, then looks up again
          r2.userData.dome.rotation.y = lerp(
            lerp(-1.28, -0.5, smoothstep(1.4, 2.6, t)),
            -1.15, smoothstep(3.2, 4.2, t)
          ) + 0.05 * Math.sin(t * 1.7);

          leia.position.set(-3.62, -0.62, ALC_Z + 1.35);
          leia.rotation.set(0, -Math.PI / 2 + 0.55, 0);
          leia.userData.parts.root.rotation.set(0.13, 0, 0);
          // reach in, push, hold, then a hand left resting on the dome
          const reach = smoothstep(0.6, 2.15, t);
          const push = 0.16 * smoothstep(2.3, CARD_IN, t);
          const rest = smoothstep(CARD_IN + 0.25, 4.1, t);
          pose(leia, {
            armL: { x: 0.42 + reach * 0.92 + push, y: 0, z: -0.1 - reach * 0.34 - rest * 0.1 },
            armR: { x: 0.12 + 0.06 * Math.sin(t * 1.1), y: 0, z: 0.16 },
            handL: -0.35 - reach * 0.5,
            lean: 0.2 + reach * 0.16 - rest * 0.06,
            headX: 0.1 + reach * 0.16,
            headY: -0.34 - reach * 0.12,
          });
          card.visible = t < CARD_IN;

          c3.position.set(-4.75, 0, ALC_Z - 1.9);
          c3.rotation.set(0, -Math.PI / 2 - 0.5, 0);
          const f1 = Math.sin(t * 3.3);
          const f2 = Math.sin(t * 2.1 + 1.2);
          pose(c3, {
            armR: { x: 0.46 + 0.4 * f1, y: 0, z: 0.3 },
            armL: { x: 0.5 - 0.42 * f2, y: 0, z: -0.32 },
            handR: -0.95, handL: 0.95,
            legR: 0.03, legL: -0.03,
            lean: -0.02 + 0.03 * f2,
            headY: 0.34 * Math.sin(t * 1.25) - 0.1,
            headX: -0.05,
          });

          const k = smoothstep(0, 1, t / S1);
          cam.position.set(4.55 - 1.15 * k, 2.56 - 0.16 * k, ALC_Z + 0.05 + 0.35 * Math.sin(t * 0.5));
          cam.lookAt(-3.66, 2.12 + 0.14 * k, ALC_Z + 0.5);
          cam.fov = 39.5 - 3.4 * k;
        } else {
          /* --- the run ------------------------------------------------ */
          const u = t - S1 - 0.3;
          const d = runDist(u);
          const dG = runDist(u - 0.55);
          onRun(r2, d, -0.55);
          onRun(c3, dG, 1.15);
          r2.userData.setCenterFoot(1 - smoothstep(S1 + 0.15, S1 + 0.75, t));
          r2.userData.roll(d);
          // glances back at the fire, then fixes on the hatch
          let look = 0;
          for (const s of shots) look += pulse(t, s.t0 - 0.12, 1.1);
          r2.userData.dome.rotation.y = clamp(look, 0, 1) * 2.5 + 0.22 * Math.sin(t * 2.3);

          walk(c3, dG / 1.95, { stride: 0.3, arms: 0.5, lean: 0.14, sway: 0.05, twist: 0.1 });
          const flap = Math.sin(t * 11.5);
          const flap2 = Math.sin(t * 11.5 + 2.1);
          pose(c3, {
            armR: { x: -0.5 + 0.75 * flap, y: 0, z: 0.5 },
            armL: { x: -0.5 + 0.75 * flap2, y: 0, z: -0.5 },
            handR: -1.1, handL: 1.1,
            headY: 0.3 * Math.sin(t * 3.1),
            headX: -0.12,
          });
          leia.position.set(-3.62, -0.62, ALC_Z + 1.35);
          card.visible = false;

          if (t < S1B) {
            // tracking alongside, from the far wall
            const cz = r2.position.z + 2.7;
            cam.position.set(4.75, 2.5, cz);
            cam.lookAt(r2.position.x - 0.4, 2.2, r2.position.z - 0.1);
            cam.fov = 52;
          } else {
            // let them go: low and locked, drifting after them
            const k = (t - S1B) / (S2 - S1B);
            cam.position.set(0.75, 2.0 - 0.15 * k, 8.4 - 3.2 * k);
            cam.lookAt(0.3, 1.85, r2.position.z + 1.5);
            cam.fov = 37 - 3 * k;
          }
        }

        shadowAt(r2Shadow, r2, 3.6, 0.9);
        shadowAt(c3Shadow, c3, 2.8, 0.85);
        shadowAt(leiaShadow, leia, 3.6, t < S1 ? 0.9 : 0);

        /* --- the launch --------------------------------------------- */
        bay.userData.setClamps(1 - smoothstep(CLAMPS, CLAMPS + 0.32, t));
        const drop = t > BANG ? 0.5 * 190 * (t - BANG) * (t - BANG) : 0;
        podIn.position.set(POD_HOME.x, POD_HOME.y - drop * 0.05, POD_HOME.z - drop);
        podIn.rotation.set(0, 0, drop * 0.012);
        podIn.userData.setThrottle(t > BANG ? clamp((t - BANG) * 4) * 1.2 : 0);
        for (const f of boltFire) f.update(t);
        bayHaze.update(t);

        if (t >= S2) {
          const k = (t - S2) / (S3 - S2);
          const shake = 1.1 * Math.max(0, 1 - Math.abs(t - BANG) * 3.2);
          cam.position.set(
            9.1 - 1.5 * k + noise(t * 6, 1) * shake,
            6.5 - 1.1 * k + noise(t * 6.4, 2) * shake,
            BAY_Z + 11.4 - 3.4 * k
          );
          cam.lookAt(-0.4, 4.5 - 0.5 * k, BAY_Z - 1.0);
          cam.rotateZ(noise(t * 8, 5) * 0.02 * shake);
          cam.fov = 43 - 2 * k;
        }
      }

      /* ---------------------------------------------------------------- */
      /* exterior state                                                    */
      /* ---------------------------------------------------------------- */
      if (!indoors) {
        world.userData.update(t);
        podOut.userData.setThrottle(0.85 + 0.25 * Math.sin(t * 7.3));
        vent.update(t);

        if (t < S4) {
          /* --- the wide: pod, corvette, destroyer, planet ------------- */
          const k = (t - S3) / (S4 - S3);
          world.position.set(300, -1520, -2400);
          podOut.position.set(lerp(11, 34, k), lerp(5, -26, k * k * 0.7 + k * 0.3), lerp(-31, -108, k));
          podOut.rotation.set(t * 1.35, t * 0.72, t * 0.5);
          cv.position.set(-46, -8, -300);
          cv.rotation.set(0.06, 1.86, 0.16 + 0.02 * Math.sin(t * 0.5));
          sd.position.set(74, 208, -1060);
          sd.rotation.set(0.02, 0.13, 0.02);
          gun.position.set(0, -4000, 0);
          cam.position.set(-6 + k * 2, 10 - k * 3, 34);
          cam.lookAt(6, -34, -380);
          cam.fov = 54;
        } else {
          /* --- the gunner: held fire ---------------------------------- */
          const k = (t - S4) / (END - S4);
          world.position.set(-620, -2500, -3300);
          sd.position.set(0, 0, 0);
          sd.rotation.set(0, 0.05, -0.05);
          cv.position.set(0, -6000, 0);
          gun.position.set(24, 15, -60);
          gun.rotation.set(0, 0, 0);
          podOut.position.set(lerp(-8, -30, k), lerp(-32, -70, k), lerp(-198, -300, k));
          podOut.rotation.set(t * 1.1, t * 0.6, t * 0.42);

          cam.position.set(46, 26, 6);
          cam.lookAt(10, -46, -230);
          cam.fov = 18;

          // barrels track the pod, then elevate away as the guns stand down
          const stand = smoothstep(24.6, 26.2, t);
          const aimAt = _v.copy(podOut.position).lerp(new THREE.Vector3(-140, 220, -700), stand);
          gun.userData.aim(aimAt);
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
        const close = smoothstep(S4 + 0.15, 22.9, t);
        const open = smoothstep(25.0, END, t);
        const box = fh * lerp(0.34, 0.085, close) * (1 + open * 1.6);
        const bs = fh * 0.055;
        brackets.forEach((b, i) => {
          const sx = i === 0 || i === 3 ? -1 : 1;
          const sy = i < 2 ? 1 : -1;
          b.position.set(tx + sx * box, ty + sy * box, 0);
          b.scale.setScalar(bs);
        });
        ring.position.set(tx, ty, 0);
        ring.scale.setScalar(fh * lerp(0.2, 0.075, close));

        const rw = fh * 0.34;
        for (const q of [readScan, readHold]) {
          q.position.set(fw * 0.5 - rw * 0.62, -fh * 0.5 + rw * 0.32, 0);
          q.scale.set(rw, rw * 0.4, 1);
        }
        const blink = Math.sin(t * 7.5) > -0.35 ? 1 : 0.15;
        readScan.visible = t < 23.35;
        readHold.visible = t >= 23.35;
        readScan.material.opacity = 0.9 * (Math.sin(t * 11) > -0.2 ? 1 : 0.25);
        readHold.material.opacity = 0.95 * blink;

        const dim = lerp(1, 0.18, smoothstep(24.7, 26.4, t));
        hudFrame.material.opacity = 0.92 * dim;
        ring.material.opacity = 0.95 * dim;
        for (const b of brackets) b.material.opacity = dim;
        readScan.material.opacity *= dim;
        readHold.material.opacity *= dim;
        void hudParts;
      }

      flash(c.stage, t, [
        { t: BANG, dur: 0.3, amount: 0.4, color: 0xffe6b8 },
        { t: 11.95, dur: 0.22, amount: 0.16, color: 0xffd0a0 },
      ]);
    },
  };
}
