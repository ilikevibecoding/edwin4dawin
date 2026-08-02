/**
 * Scene 2 — boarders.
 *
 *   0.0   the line: four rebels braced behind a barricade, sealed door far off
 *   3.5   the breach: the seams are cut, the charge blows the door in at 4.72
 *   6.5   the firefight: troopers pour through the smoke, two rebels go down
 *  12.6   the aftermath: the smoke parts, the line advances in step
 *  18.8   the arrival: Vader walks out of the light and stops
 *  26.5   he walks: straight down the corridor at camera, troopers snap aside
 *
 * Everything below is computed from `t` alone. Nothing integrates, nothing
 * latches, nothing rolls dice at frame time.
 */
import * as THREE from 'three';
import { corridor, blastDoor, explosionBurst, smokePuff, sparkBurst } from '../models/environments.js';
import { stormtrooper, rebelTrooper, vader } from '../models/characters.js';
import { aimBlaster, walk, idle, fall, capeSim } from '../lego/minifig.js';
import { brick, plate, tile, at, rot, rng, C, BRICK } from '../lego/bricks.js';
import {
  lightRig, Bolts, volley, Impacts, Smoke,
  beat, clamp, lerp, smoothstep, noise, flash,
} from './_kit.js';

export const id = 'boarding';

/* --- the beat sheet, in local scene time ---------------------------- */
const S_LINE = 0;
const S_BREACH = 3.5;      // torches start on the door seam
const BOOM = 4.72;         // the charge goes off, just under narration line 2
const S_FIGHT = 6.5;
const S_CUT = 9.7;         // second angle, down the length of the barricade
const S_AFTER = 12.45;     // cut lands under "then the smoke parts" at 12.5
const S_ARRIVE = 18.8;     // Vader is planted before he speaks at 20.0
const S_WALK = 26.5;
const END = 33;

/* --- the set --------------------------------------------------------
 * corridor() gives a 7.4-wide walking grate between raised side strips, so
 * anybody on their feet lives inside |x| < 3.5 and stands at y = 0.30.
 */
const DECK = 0.30;
const TRIM = 0.36;         // top of the raised side strip, |x| > 3.7
const DOOR_Z = -24;        // the blast door plane
const LINE_Z = 8.6;        // the rebel firing line
const BARR_Z = 6.6;        // the barricade

const BLUE = 0x4fc3ff;
const RED = 0xff3b1f;

/* --- the cast ------------------------------------------------------- */
// A minifig is 2.4 wide and the walkable grate is 7.4, so four of them abreast
// is a solid wall. The two on the wings hold the barricade itself and the
// middle pair stand a stride back, which gives every camera some depth to
// shoot through instead of a row of backs.
const REBELS = [
  { x: -3.40, z: LINE_Z - 0.5, seed: 3, hit: 9.85 },
  { x: -1.55, z: LINE_Z + 1.3, seed: 9, hit: 11.35 },
  { x: 1.55, z: LINE_Z + 0.9, seed: 17, stop: 12.2 },
  { x: 3.40, z: LINE_Z - 0.7, seed: 25, stop: 12.2 },
];

/** Entry time, the station they fight from, and their slot in the formation. */
const TROOPERS = [
  { t0: 6.55, fx: -1.5, fz: -18.6, lane: -1, rank: 3, seed: 41 },
  { t0: 6.85, fx: 1.7, fz: -18.2, lane: 1, rank: 3, seed: 47 },
  { t0: 7.20, fx: -3.1, fz: -20.6, lane: -1, rank: 2, seed: 53 },
  { t0: 7.50, fx: 3.2, fz: -20.2, lane: 1, rank: 2, seed: 59 },
  { t0: 7.95, fx: -2.3, fz: -16.4, lane: -1, rank: 1, seed: 67 },
  { t0: 8.30, fx: 2.5, fz: -16.0, lane: 1, rank: 1, seed: 71 },
  { t0: 8.80, fx: -3.0, fz: -22.4, lane: -1, rank: 0, seed: 79 },
  { t0: 9.20, fx: 3.1, fz: -22.0, lane: 1, rank: 0, seed: 83 },
];
const formX = (tr) => tr.lane * 2.35;
const formZ = (tr) => -21.5 + tr.rank * 2.5;
const ADVANCE = 3.4;       // how far the formation gains in the aftermath

const STRIDE = 3.3;        // world units per full walk cycle
const VADER_HOLD_Z = -18;
const VADER_IN = 6.6;      // 4 half-strides, so he halts with his feet together
const VADER_OUT = 12.5;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function handheld(cam, t, amt, seed) {
  cam.position.x += noise(t * 3.3, seed) * amt;
  cam.position.y += noise(t * 2.6, seed + 1) * amt * 0.8;
  cam.position.z += noise(t * 2.1, seed + 2) * amt * 0.6;
}

/** fall() drives the root joint; every other pose has to put it back. */
function clearRoot(fig) {
  const q = fig.userData.parts;
  q.root.rotation.set(0, 0, 0);
  q.root.position.set(0, 0, 0);
}

/** Strongest muzzle flash from a list of shot times. */
function firing(times, t) {
  let v = 0;
  for (let i = 0; i < times.length; i++) {
    const k = (t - times[i]) / 0.075;
    if (k >= 0 && k < 1) v = Math.max(v, 1 - k);
  }
  return v;
}

/** Stacked supply crates: chest high, uneven, with gaps to shoot through. */
function barricade(seed = 5) {
  const r = rng(seed);
  const g = new THREE.Group();
  const crateCols = [C.darkTan, C.oliveGreen, C.darkOrange, C.bluishGray, C.tan, C.darkGray];
  // six stacks across the corridor; the two outboard ones sit on the raised
  // side strips, so they start a plate higher than the rest
  for (let i = 0; i < 6; i++) {
    const x = -5.1 + i * 2.04;
    const base = Math.abs(x) > 3.7 ? TRIM : DECK;
    const rows = i === 0 || i === 5 ? 3 : (i === 2 ? 1 : 2);
    for (let j = 0; j < rows; j++) {
      const deep = r() < 0.4;
      const b = brick(2, deep ? 3 : 2, BRICK, { color: crateCols[(r() * crateCols.length) | 0] });
      g.add(at(rot(b, 0, (r() - 0.5) * 0.2, 0), x + (r() - 0.5) * 0.22, base + j * BRICK, BARR_Z + (r() - 0.5) * 0.4));
      // a lid plate so the stack does not read as one extruded block
      if (j === rows - 1) {
        g.add(at(plate(2, deep ? 3 : 2, { color: C.darkGray }), x, base + rows * BRICK, BARR_Z));
      }
    }
  }
  // a crate tipped on its corner, and loose kit dumped behind the line
  g.add(at(rot(brick(2, 3, BRICK, { color: C.darkRed }), 0.5, 0.35, 0.22), -2.0, DECK + 2.5, BARR_Z - 0.5));
  g.add(at(rot(brick(2, 2, BRICK, { color: C.oliveGreen }), 0, 0.5, 0), 2.2, DECK + 2.4, BARR_Z + 0.2));
  g.add(at(tile(2, 1, 0.7, { color: C.black }), 0.4, DECK, BARR_Z + 1.5));
  g.add(at(rot(tile(1, 2, 0.6, { color: C.darkGray }), 0, 0.4, 0), -1.4, DECK, BARR_Z + 1.8));
  g.add(at(tile(1.4, 1, 0.5, { color: C.darkOrange }), 2.9, DECK, BARR_Z + 1.6));
  // welded angle irons bracing the front face
  for (const x of [-4.2, -1.3, 1.4, 4.3]) {
    g.add(at(rot(tile(0.45, 0.45, 2.4, { color: C.silver }), 0.62, 0, 0),
      x, (Math.abs(x) > 3.7 ? TRIM : DECK) + 0.55, BARR_Z - 1.15));
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  // a sealed white corridor blows out fast under a normal key, so the rig is
  // kept to a whisper and the practicals inside the set do all the work
  const lights = lightRig(scene, 'interior', { shadows: false, fog: false });
  lights.key.intensity = 0.16;
  lights.key.position.set(6, 20, 30);
  lights.fill.intensity = 0.10;
  lights.rim.color.set(0xffb894);
  lights.rim.intensity = 0.12;
  lights.amb.intensity = 0.10;
  scene.fog = new THREE.Fog(0x070a0f, 26, 130);

  /* ---- corridor + door ------------------------------------------- */
  const corr = corridor({ segments: 12, width: 12, height: 9, segLen: 10, seed: 33, practicals: 6 });
  scene.add(corr);

  const door = blastDoor({ width: 12, height: 8.7, seed: 44, label: 'FWD 3' });
  door.position.set(0, DECK, DOOR_Z);
  scene.add(door);
  const halves = door.userData.halves;

  const debris = door.userData.blowOut({ seed: 91, count: 40, gravity: 30 });
  debris.position.set(0, DECK, DOOR_Z);
  scene.add(debris);

  // the corridor keeps running past the door, capped so we never see the void
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(15, 13, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.85 })
  );
  cap.position.set(0, 5, DOOR_Z - 21);
  scene.add(cap);

  /* ---- the light beyond the doorway ------------------------------ */
  // three stacked cards make a soft box of light that Vader walks out of
  const glowMats = [];
  [[10.5, 7.8, 3.5, 0xffe6c0, 0.42], [8.2, 6.6, 6.5, 0xffd8a8, 0.30], [6.0, 5.4, 10.0, 0xffc890, 0.2]]
    .forEach(([w, h, back, col, o]) => {
      const m = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(0, 4.2, DOOR_Z - back);
      scene.add(p);
      glowMats.push({ m, peak: o });
    });

  const backLight = new THREE.SpotLight(0xffe8cc, 0, 46, 0.62, 0.55, 1.6);
  backLight.position.set(0, 5.2, DOOR_Z - 8);
  backLight.target.position.set(0, 2.4, DOOR_Z + 10);
  scene.add(backLight, backLight.target);

  // the fill that resolves Vader's mask out of the silhouette
  const vaderKey = new THREE.SpotLight(0xc8dcff, 0, 34, 0.46, 0.75, 1.7);
  vaderKey.position.set(2.9, 5.6, -8.5);
  vaderKey.target.position.set(0, 3.2, VADER_HOLD_Z);
  scene.add(vaderKey, vaderKey.target);

  // the sealed door is what everyone in shot one is aiming at, so it gets its
  // own light until the moment it stops existing
  const doorSpot = new THREE.SpotLight(0xe8f0ff, 0, 26, 0.5, 0.7, 1.5);
  doorSpot.position.set(0, 7.4, DOOR_Z + 9);
  doorSpot.target.position.set(0, 3.4, DOOR_Z);
  scene.add(doorSpot, doorSpot.target);

  /* ---- practical shadow casters ---------------------------------- */
  // deliberately cool, so the white bricks do not go sepia under the practicals
  const spotA = new THREE.SpotLight(0xf0f2ff, 0, 42, 0.8, 0.8, 1.7);
  spotA.position.set(1.2, 8.0, 13.5);
  spotA.target.position.set(0, 0, 3);
  spotA.castShadow = true;
  spotA.shadow.mapSize.set(1024, 1024);
  spotA.shadow.camera.near = 1;
  spotA.shadow.camera.far = 60;
  spotA.shadow.bias = -0.0016;
  spotA.shadow.normalBias = 0.05;
  scene.add(spotA, spotA.target);

  const spotB = new THREE.SpotLight(0xdce8ff, 0, 52, 0.8, 0.8, 1.7);
  spotB.position.set(-1.2, 8.0, -9);
  spotB.target.position.set(0, 0, -18);
  spotB.castShadow = true;
  spotB.shadow.mapSize.set(1024, 1024);
  spotB.shadow.camera.near = 1;
  spotB.shadow.camera.far = 60;
  spotB.shadow.bias = -0.0016;
  spotB.shadow.normalBias = 0.05;
  scene.add(spotB, spotB.target);

  /* ---- red emergency lighting ------------------------------------ */
  const ALARM_Z = [32, 21, 11, -1, -12, -20];
  const alarms = ALARM_Z.map((z, i) => {
    const sx = i % 2 ? 1 : -1;
    const lamp = new THREE.MeshBasicMaterial({ color: 0xff2a12 });
    const halo = new THREE.MeshBasicMaterial({
      color: 0xff3a12, transparent: true, opacity: 0.1, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const g = new THREE.Group();
    g.add(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.46, 12), lamp), 0, 0, Math.PI / 2));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 9), halo));
    g.add(at(tile(0.55, 0.85, 0.85, { color: C.darkGray }), sx * 0.4, -0.42, 0));
    g.position.set(sx * 5.35, 7.0, z);
    scene.add(g);
    const light = new THREE.PointLight(0xff3413, 0, 17, 2);
    light.position.set(sx * 4.2, 6.2, z);
    scene.add(light);
    return { lamp, halo, light, i };
  });

  /* ---- the barricade --------------------------------------------- */
  scene.add(barricade(5));

  /* ---- cast ------------------------------------------------------- */
  const muzzleGlow = (fig) => {
    const props = fig.userData.props || {};
    const w = props.blaster || props.blasterRifle || Object.values(props)[0];
    if (!w || !w.userData.muzzle) return null;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfff2d8, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    m.userData.noBake = true;
    w.userData.muzzle.add(m);
    return m;
  };

  const rebels = REBELS.map((rb, i) => {
    const fig = rebelTrooper({ helmet: i % 2 ? 0xc9ae7c : 0xb59b6c });
    fig.position.set(rb.x, DECK, rb.z);
    scene.add(fig);
    return { ...rb, fig, glow: muzzleGlow(fig), shots: [] };
  });

  const troopers = TROOPERS.map((tr, i) => {
    const fig = stormtrooper({ dirty: i % 3 === 0 });
    fig.position.set(tr.fx, DECK, tr.fz);
    fig.rotation.y = Math.PI;
    scene.add(fig);
    return { ...tr, fig, glow: muzzleGlow(fig), shots: [] };
  });

  const lord = vader({ extend: 0, capeLength: 3.5 });
  lord.position.set(0, DECK, VADER_HOLD_Z - VADER_IN);
  lord.rotation.y = Math.PI;
  scene.add(lord);

  /* ---- ordnance --------------------------------------------------- */
  const rebelShots = [];
  rebels.forEach((rb, i) => {
    const stop = rb.hit ?? rb.stop ?? 12.2;
    let ft = 4.95 + i * 0.17;
    let n = 0;
    while (ft < stop) {
      const v = volley({
        t0: ft, count: 3, interval: 0.11,
        from: [rb.x + 0.5, 3.34, rb.z - 1.1],
        to: [rb.x * 0.4 + ((n * 5) % 7 - 3) * 1.1, 2.5, -18.5],
        speed: 100, color: BLUE, len: 4.6, thick: 0.13, seed: 40 + i * 11 + n, spread: 2.6,
      });
      rebelShots.push(...v);
      rb.shots.push(...v.map((s) => s.t0));
      ft += 0.44 + ((n * 13) % 5) * 0.1;
      n++;
    }
  });

  const trooperShots = [];
  troopers.forEach((tr, i) => {
    let ft = tr.t0 + 0.8;
    let n = 0;
    while (ft < 12.1) {
      const v = volley({
        t0: ft, count: 3, interval: 0.11,
        from: [tr.fx * 0.9, 3.42, tr.fz + 1.3],
        to: [tr.fx * 0.3 + ((n * 3) % 7 - 3) * 1.2, 2.7, BARR_Z + 0.5],
        speed: 110, color: RED, len: 5.0, thick: 0.14, seed: 200 + i * 13 + n, spread: 3.0,
      });
      trooperShots.push(...v);
      tr.shots.push(...v.map((s) => s.t0));
      ft += 0.5 + ((n * 17) % 5) * 0.1;
      n++;
    }
  });

  const bolts = new Bolts(scene, [...rebelShots, ...trooperShots]);
  // only every third round gets a flash, and small: a bolt that misses ends in
  // open air, and a fat sprite hanging there reads as a floating ball
  const hits = bolts.impacts().filter((_, i) => i % 3 === 0);
  const impacts = new Impacts(scene, hits.map((h) => ({
    t: h.t, pos: [h.pos.x, h.pos.y, h.pos.z], size: 0.42,
    color: h.color === BLUE ? 0xa8e6ff : 0xffb27a,
  })), { dur: 0.2 });

  /* ---- breach effects --------------------------------------------- */
  const seamMat = new THREE.MeshBasicMaterial({
    color: 0xff8a20, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 8.0), seamMat);
  seam.position.set(0, DECK + 4.3, DOOR_Z + 1.05);
  scene.add(seam);

  const CUTS = [
    { t: 3.62, y: 6.5 }, { t: 4.04, y: 4.4 }, { t: 4.42, y: 2.3 },
  ];
  const cutSparks = CUTS.map((cu, i) => {
    const s = sparkBurst({
      count: 80, color: 0xffcb7a, seed: 30 + i * 7, size: 3.4, gravity: 26,
      cone: 0.85, dir: new THREE.Vector3(0, -0.15, 1),
    });
    s.position.set(0, DECK + cu.y, DOOR_Z + 1.1);
    scene.add(s);
    return { ...cu, g: s };
  });

  const blast = explosionBurst({ size: 8.0, seed: 5, shards: 30, gravity: 12, spread: 0.9 });
  blast.position.set(0, DECK + 3.9, DOOR_Z + 0.4);
  scene.add(blast);

  // wall strikes during the firefight: a few big ones, hand placed
  const WALL_HITS = [
    { t: 7.05, p: [-5.4, 4.4, -6], c: 0xffb27a },
    { t: 7.9, p: [5.4, 3.2, 0], c: 0xffb27a },
    { t: 8.6, p: [-5.4, 2.4, 3], c: 0xa8e6ff },
    { t: 9.3, p: [5.3, 5.0, -8], c: 0xffb27a },
    { t: 9.85, p: [-3.9, 3.2, LINE_Z - 0.9], c: 0xffd0a0 },
    { t: 10.6, p: [-5.4, 4.0, -2], c: 0xa8e6ff },
    { t: 11.35, p: [-2.0, 3.3, LINE_Z + 0.9], c: 0xffd0a0 },
    { t: 11.9, p: [5.3, 2.6, 4], c: 0xffb27a },
  ];
  const wallSparks = WALL_HITS.map((h, i) => {
    const s = sparkBurst({
      count: 46, color: h.c, seed: 120 + i * 5, size: 2.4, gravity: 20, cone: 0.9,
      dir: new THREE.Vector3(-Math.sign(h.p[0]) || 0, 0.2, 0.5),
    });
    s.position.set(h.p[0], DECK + h.p[1], h.p[2]);
    scene.add(s);
    return { ...h, g: s };
  });

  /* ---- smoke ------------------------------------------------------
   * Puff sprites are unlit, so their colour is the colour they read at:
   * the rolls that come down the hall are dark, the bank sitting in the
   * blown doorway is pale because it has the breach light behind it.
   * Every roll decelerates onto a hard stop well short of every camera —
   * a puff on the lens is what turned this shot into a white card.
   */
  const ROLL = [
    { t0: BOOM + 0.02, dur: 4.6, x: -1.5, y: 1.5, run: 15.0, size: 6.6, seed: 3 },
    { t0: BOOM + 0.06, dur: 4.6, x: 1.7, y: 1.3, run: 14.0, size: 7.0, seed: 8 },
    { t0: BOOM + 0.28, dur: 5.0, x: 0.2, y: 2.8, run: 12.5, size: 7.4, seed: 13 },
    { t0: BOOM + 0.6, dur: 5.4, x: -3.2, y: 1.1, run: 10.5, size: 6.2, seed: 21 },
    { t0: BOOM + 0.9, dur: 5.4, x: 3.4, y: 1.1, run: 10.0, size: 6.0, seed: 27 },
    { t0: BOOM + 1.7, dur: 6.0, x: -0.9, y: 2.0, run: 8.0, size: 7.2, seed: 33 },
    { t0: 8.6, dur: 6.5, x: 2.1, y: 1.7, run: 5.5, size: 7.6, seed: 39 },
    { t0: 10.4, dur: 7.0, x: -2.1, y: 1.5, run: 4.0, size: 7.8, seed: 45 },
  ];
  const rolls = ROLL.map((r) => {
    const g = smokePuff({ size: r.size, seed: r.seed, count: 5, rise: 0.13, color: 0x4c525a });
    scene.add(g);
    return { ...r, g };
  });

  // the bank that fills the blown doorway. It is thick from the breach until
  // 12.5 — the troopers arrive out of it and the narration calls it — and then
  // opens up into the rectangle of haze Vader walks through
  const DOORWAY = [
    { t0: 5.2, dur: 9.0, x: 0, y: 1.8, size: 9.5, z: -1.4, seed: 51 },
    { t0: 6.4, dur: 9.0, x: -2.0, y: 2.6, size: 9.0, z: -0.2, seed: 57 },
    { t0: 7.6, dur: 9.5, x: 2.2, y: 1.5, size: 9.0, z: -0.6, seed: 63 },
    { t0: 9.0, dur: 10.0, x: -0.6, y: 2.9, size: 8.6, z: -2.2, seed: 69 },
    { t0: 12.0, dur: 13.0, x: 1.4, y: 1.9, size: 8.0, z: -1.8, seed: 75 },
    { t0: 17.5, dur: 15.0, x: -1.1, y: 2.1, size: 7.6, z: -1.0, seed: 81 },
    { t0: 23.0, dur: 14.0, x: 0.8, y: 1.7, size: 7.2, z: -1.6, seed: 87 },
  ];
  const doorway = DOORWAY.map((d) => {
    const g = smokePuff({ size: d.size, seed: d.seed, count: 5, rise: 0.09, color: 0xa9a49c });
    g.position.set(d.x, DECK + d.y, DOOR_Z + d.z);
    scene.add(g);
    return { ...d, g };
  });

  // thin drifting haze so nothing in the corridor reads as clean air
  const groundHaze = new Smoke(scene, {
    t0: BOOM + 0.4, count: 20, origin: [0, DECK + 1.8, -11], spread: 17, size: 7,
    rise: 0.16, life: 12, opacity: 0.13, color: 0x5b626b, spawnWindow: 8, seed: 12,
  });
  // what the formation marches through for the rest of the scene
  const lateHaze = new Smoke(scene, {
    t0: 11.6, count: 24, origin: [0, DECK + 2.4, -15], spread: 17, size: 8,
    rise: 0.11, life: 17, opacity: 0.2, color: 0xd6d1c7, spawnWindow: 11, seed: 26,
  });

  /* ------------------------------------------------------------------ */
  /* cues                                                                */
  /* ------------------------------------------------------------------ */

  const cues = [
    { t: 0.10, sfx: 'alarm', opts: { gain: 0.3, dur: 9.5 } },
    { t: 0.20, sfx: 'rumbleSub', opts: { gain: 0.5, dur: 3.4 } },
    { t: 2.30, sfx: 'hullImpact', opts: { gain: 0.32, pan: -0.2 } },
    ...CUTS.map((c, i) => ({ t: c.t, sfx: 'ricochet', opts: { gain: 0.4 - i * 0.04, pan: (i - 1) * 0.25 } })),
    { t: 3.55, sfx: 'hullImpact', opts: { gain: 0.42 } },
    { t: 4.30, sfx: 'hullImpact', opts: { gain: 0.5, pan: 0.2 } },
    { t: BOOM, sfx: 'doorBlast', opts: { gain: 1.0 } },
    { t: BOOM + 0.03, sfx: 'explosion', opts: { gain: 0.75, size: 0.8 } },
    { t: BOOM + 0.05, sfx: 'rumbleSub', opts: { gain: 0.95, dur: 3.2 } },
    { t: BOOM + 0.6, sfx: 'hullImpact', opts: { gain: 0.45, pan: -0.35 } },
    { t: BOOM + 0.95, sfx: 'hullImpact', opts: { gain: 0.4, pan: 0.4 } },
    { t: 5.10, sfx: 'alarm', opts: { gain: 0.22, dur: 10 } },
  ];
  // every third bolt gets a report, so it reads as sustained fire without mush
  [...rebelShots, ...trooperShots]
    .slice()
    .sort((a, b) => a.t0 - b.t0)
    .forEach((s, i) => {
      if (i % 3) return;
      cues.push({
        t: s.t0,
        sfx: 'blaster',
        opts: {
          gain: s.color === BLUE ? 0.4 : 0.34,
          pan: clamp(s.from[0] / 6, -1, 1),
          pitch: s.color === BLUE ? 1.14 : 0.9,
        },
      });
    });
  WALL_HITS.forEach((h) => cues.push({ t: h.t, sfx: 'ricochet', opts: { gain: 0.44, pan: clamp(h.p[0] / 6, -1, 1) } }));
  rebels.forEach((rb) => {
    if (rb.hit === undefined) return;
    cues.push({ t: rb.hit, sfx: 'hullImpact', opts: { gain: 0.5, pan: clamp(rb.x / 6, -1, 1) } });
    cues.push({ t: rb.hit + 0.55, sfx: 'ricochet', opts: { gain: 0.28, pan: clamp(rb.x / 6, -1, 1) } });
  });
  cues.push(
    { t: 12.55, sfx: 'rumbleSub', opts: { gain: 0.6, dur: 4.5 } },
    { t: 13.0, sfx: 'ionDrone', opts: { gain: 0.28, dur: 7 } },
    // the advance: boots on the deck plates, in step with the walk cycle
    ...[13.6, 14.4, 15.2, 16.0, 16.8, 17.6].map((tt) => ({
      t: tt, sfx: 'hullImpact', opts: { gain: 0.2, send: 0.5 },
    })),
    { t: 17.3, sfx: 'rumbleSub', opts: { gain: 0.55, dur: 3.6 } },
    { t: 19.2, sfx: 'vaderBreath', opts: { gain: 0.95 } },
    { t: 23.6, sfx: 'vaderBreath', opts: { gain: 0.95 } },
    { t: 26.0, sfx: 'rumbleSub', opts: { gain: 0.55, dur: 5 } },
    { t: 27.8, sfx: 'vaderBreath', opts: { gain: 0.85 } },
    { t: 30.9, sfx: 'alarm', opts: { gain: 0.16, dur: 2.4 } },
    { t: 31.7, sfx: 'vaderBreath', opts: { gain: 0.95 } },
  );
  // Vader's boots on the deck plates
  for (let i = 0; i < 9; i++) {
    const tt = 26.92 + i * 0.79;
    if (tt > END) break;
    cues.push({ t: tt, sfx: 'rumbleSub', opts: { gain: 0.34 + i * 0.02, dur: 0.55, f0: 62, f1: 34 } });
    cues.push({ t: tt, sfx: 'hullImpact', opts: { gain: 0.2 + i * 0.015, send: 0.45 } });
  }

  /* ------------------------------------------------------------------ */
  /* per-frame                                                           */
  /* ------------------------------------------------------------------ */

  /** How far Vader has walked, total, by time t. */
  const vaderDist = (t) => {
    const inK = smoothstep(16.8, 19.6, t);
    const outK = beat(t, S_WALK, END);
    return VADER_IN * inK + VADER_OUT * Math.pow(outK, 1.12);
  };
  const vaderZ = (t) => VADER_HOLD_Z - VADER_IN + vaderDist(t);

  /** Head scan across the corridor while he holds. */
  const scan = (t) => 0.55 * (smoothstep(20.6, 21.7, t) - smoothstep(22.6, 23.6, t))
    - 0.40 * (smoothstep(24.0, 24.9, t) - smoothstep(25.7, 26.4, t));

  const tmpWind = new THREE.Vector3();

  return {
    scene,
    cues,

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);

      /* ---------------- the set ---------------- */
      corr.userData.update(t);
      // the mains are browned out for the whole scene: this is a ship on alert
      const wake = smoothstep(12.4, 17.5, t);
      const mains = 0.27 + 0.02 * Math.sin(t * 5.7) + 0.07 * wake;
      corr.userData.setLights(mains);
      // the practicals are what flattens this set out, so they stay low and the
      // light coming through the blown doorway does the modelling
      for (const l of corr.userData.lamps) l.intensity = 4 + 2.5 * wake;

      for (const a of alarms) {
        const k = 0.5 + 0.5 * Math.sin(t * 3.1 - a.i * 0.85);
        const e = Math.pow(k, 2.4);
        // they carry the first half of the scene and then get out of the way,
        // or every wall near the lens turns into a red card
        const fade = 1 - 0.62 * smoothstep(15.5, 20.5, t);
        a.lamp.color.setRGB(0.26 + 0.74 * e, 0.04 + 0.08 * e, 0.02 + 0.03 * e);
        a.halo.opacity = (0.03 + 0.12 * e) * fade;
        a.light.intensity = (0.7 + 4.2 * e) * fade;
      }

      /* ---------------- the door ---------------- */
      door.userData.update(t);
      const blown = t >= BOOM;
      for (const h of halves) h.visible = !blown;
      debris.visible = blown && t < BOOM + 6;
      if (debris.visible) debris.userData.setT(Math.min(t - BOOM, 1.3));

      seamMat.opacity = blown ? 0
        : 0.85 * beat(t, S_BREACH, BOOM) * (0.55 + 0.45 * Math.sin(t * 26));
      seam.scale.y = lerp(0.25, 1, beat(t, S_BREACH, BOOM - 0.15));

      for (const cu of cutSparks) {
        const k = (t - cu.t) / 0.85;
        cu.g.visible = k >= 0 && k < 1;
        if (cu.g.visible) cu.g.userData.setT(k);
      }
      blast.visible = t >= BOOM && t < BOOM + 2.1;
      if (blast.visible) blast.userData.setT(clamp((t - BOOM) / 1.9));

      // the doorway light box comes up with the breach and stays for Vader
      const doorLit = smoothstep(BOOM, BOOM + 1.4, t) * (0.35 + 0.65 * smoothstep(11.5, 17.5, t));
      glowMats.forEach((g, i) => { g.m.opacity = g.peak * doorLit * (1 - i * 0.06); });
      backLight.intensity = 200 * doorLit;
      doorSpot.intensity = 60 * (1 - smoothstep(BOOM - 0.15, BOOM + 0.1, t));
      vaderKey.intensity = 26 * smoothstep(20.4, 23.0, t) * (1 - 0.3 * beat(t, 30, END));
      vaderKey.target.position.set(0, 3.2, vaderZ(t));

      spotA.intensity = 58 * (0.5 + 0.5 * clamp(1 - beat(t, 12.0, 15.0)));
      spotB.intensity = 40 * (0.35 + 0.65 * smoothstep(6.0, 9.0, t));

      /* ---------------- smoke ---------------- */
      // "then the smoke parts" at 12.5: the bank in the doorway opens up
      const thin = 1 - 0.5 * smoothstep(12.4, 15.0, t);
      for (const r of rolls) {
        const k = (t - r.t0) / r.dur;
        r.g.visible = k >= 0 && k < 1;
        if (!r.g.visible) continue;
        // decelerating run down the hall, asymptotic to r.run
        r.g.position.set(r.x, DECK + r.y, DOOR_Z + 1 + r.run * (1 - Math.exp(-(t - r.t0) * 0.55)));
        r.g.userData.setT(k);
        const f = 0.85 * thin;
        for (const s of r.g.children) s.material.opacity *= f;
      }
      for (const d of doorway) {
        const k = (t - d.t0) / d.dur;
        d.g.visible = k >= 0 && k < 1;
        if (!d.g.visible) continue;
        d.g.userData.setT(k);
        for (const s of d.g.children) s.material.opacity *= thin;
      }
      groundHaze.update(t);
      lateHaze.update(t);

      /* ---------------- ordnance ---------------- */
      bolts.update(t);
      impacts.update(t);
      for (const w of wallSparks) {
        const k = (t - w.t) / 0.7;
        w.g.visible = k >= 0 && k < 1;
        if (w.g.visible) w.g.userData.setT(k);
      }

      flash(c.stage, t, [
        { t: BOOM, dur: 0.5, amount: 0.95, color: 0xfff4e2, pow: 1.5 },
        { t: BOOM + 0.5, dur: 0.7, amount: 0.16, color: 0xffb070, pow: 2.4 },
        ...CUTS.map((cu) => ({ t: cu.t, dur: 0.16, amount: 0.1, color: 0xffd9a0 })),
      ]);

      /* ---------------- rebels ---------------- */
      for (const rb of rebels) {
        const fig = rb.fig;
        if (rb.hit !== undefined && t >= rb.hit) {
          fall(fig, t - rb.hit);
          fig.position.set(rb.x, DECK, rb.z);
          if (rb.glow) rb.glow.material.opacity = 0;
          continue;
        }
        clearRoot(fig);
        const f = firing(rb.shots, t);
        const brace = t < BOOM ? 1 : 0;
        const yaw = 0.1 * Math.sin(t * 0.7 + rb.seed) - rb.x * 0.014;
        aimBlaster(fig, {
          twoHanded: true,
          pitch: 0.03 + f * 0.2 + 0.02 * Math.sin(t * 1.3 + rb.seed),
          yaw,
          lean: 0.08 + brace * 0.05 + f * 0.04,
          crouch: 0.05 + brace * 0.05,
        });
        const q = fig.userData.parts;
        q.torso.rotation.x -= f * 0.09;
        q.head.rotation.x -= 0.06;
        fig.position.set(rb.x, DECK, rb.z + f * 0.09);
        if (rb.glow) {
          rb.glow.material.opacity = f;
          rb.glow.scale.setScalar(0.7 + f * 1.5);
        }
      }

      /* ---------------- stormtroopers ---------------- */
      // the formation advance is shared, so the whole line marches in step
      const advK = smoothstep(12.9, 18.3, t);
      const adv = ADVANCE * advK;
      const marchPhase = adv / STRIDE;
      const formK = smoothstep(12.7, 15.6, t);
      const vz = vaderZ(t);

      for (const tr of troopers) {
        const fig = tr.fig;
        clearRoot(fig);
        if (t < tr.t0) {
          fig.visible = false;
          continue;
        }
        fig.visible = true;
        const entry = clamp((t - tr.t0) / 1.7);

        // where he should stand right now
        let px = lerp(tr.fx * 0.4, tr.fx, smoothstep(0, 1, entry));
        let pz = lerp(DOOR_Z - 3.5, tr.fz, smoothstep(0, 1, entry));
        let ry = Math.PI;
        px = lerp(px, formX(tr), formK);
        pz = lerp(pz, formZ(tr) + adv, formK);

        // he steps back against the wall as Vader comes level with him
        const aside = smoothstep(pz - 6.5, pz - 1.5, vz);
        px += tr.lane * 1.0 * aside;
        ry -= tr.lane * 0.9 * aside;

        fig.position.set(px, DECK, pz);
        fig.rotation.y = ry;

        const f = firing(tr.shots, t);
        const walking = entry < 1 || (formK > 0.02 && advK < 1);
        if (walking) {
          const ph = entry < 1 ? (entry * 6.4) / STRIDE * 1.6 : marchPhase;
          walk(fig, ph, { stride: 0.42, arms: 0.16, lean: 0.06, sway: 0.025, twist: 0.05 });
          // rifle stays up across the chest while they move
          const q = fig.userData.parts;
          q.armR.rotation.x = 0.95;
          q.armL.rotation.x = 0.82;
          q.armL.rotation.z = 0.42;
          q.handL.rotation.y = -0.45;
          q.handR.rotation.set(0, 0, 0);
        } else if (t < 12.6) {
          aimBlaster(fig, {
            twoHanded: true,
            pitch: 0.02 + f * 0.22 + 0.02 * Math.sin(t * 1.1 + tr.seed),
            yaw: 0.1 * Math.sin(t * 0.6 + tr.seed) + tr.fx * 0.012,
            lean: 0.07 + f * 0.05,
          });
          fig.userData.parts.torso.rotation.x -= f * 0.1;
        } else {
          aimBlaster(fig, { twoHanded: true, pitch: -0.5, lean: 0.02 });
          const q = fig.userData.parts;
          q.torso.rotation.x += 0.014 * Math.sin(t * 0.85 + tr.seed);
          q.head.rotation.y += 0.07 * Math.sin(t * 0.45 + tr.seed * 1.7) - tr.lane * 0.35 * aside;
        }
        if (tr.glow) {
          tr.glow.material.opacity = f;
          tr.glow.scale.setScalar(0.9 + f * 1.8);
        }
      }

      /* ---------------- Vader ---------------- */
      lord.visible = t >= 16.6;
      if (lord.visible) {
        clearRoot(lord);
        lord.position.set(0, DECK, vz);
        lord.rotation.y = Math.PI;
        const moving = (t > 17.0 && t < 19.7) || t >= S_WALK;
        if (moving) {
          walk(lord, vaderDist(t) / STRIDE, {
            stride: 0.4, arms: 0.13, lean: 0.015, sway: 0.02, twist: 0.035,
          });
          const q = lord.userData.parts;
          q.armR.rotation.x *= 0.7;
          q.armL.rotation.x *= 0.7;
          q.head.rotation.y = 0.06 * Math.sin(t * 0.5);
        } else {
          idle(lord, t, 4);
          const q = lord.userData.parts;
          q.head.rotation.y = scan(t);
          q.head.rotation.x = 0.03 - 0.05 * Math.abs(scan(t));
          q.torso.rotation.y = scan(t) * 0.18;
          q.armR.rotation.set(0.1, 0, 0.06);
          q.armL.rotation.set(0.08, 0, -0.06);
        }
        // wind runs down the corridor at him, so the cape reads even standing still
        const gust = 1.6 + 1.4 * Math.sin(t * 0.8) + (moving ? 1.2 : 0);
        tmpWind.set(0.5 * Math.sin(t * 1.1), 0, gust);
        capeSim(lord, t, tmpWind);
      }

      /* ---------------- camera ----------------
       * A minifig is 5 units tall, so every setup below keeps at least ~5.5
       * units of standoff from the nearest figure or it stops being a shot
       * of a character and becomes a shot of a shoulder.
       */
      if (t < S_BREACH) {
        /* --- the line: helmet height behind the barricade, tilted just enough
               that the top half of the sealed door clears their heads --- */
        const e = smoothstep(0, 1, beat(t, S_LINE, S_BREACH));
        cam.position.set(-1.4 + e * 0.35, 4.85 - e * 0.1, 18.6 - e * 1.3);
        handheld(cam, t, 0.05, 1);
        cam.lookAt(0.4, 3.6, -20);
        cam.rotateZ(noise(t * 1.6, 5) * 0.006);
        cam.fov = 41 - e * 2;
      } else if (t < S_FIGHT) {
        /* --- the breach: out in the corridor ahead of the line, so the door
               owns the frame and the debris comes at us --- */
        const e = smoothstep(0, 1, beat(t, S_BREACH, S_FIGHT));
        const sh = t >= BOOM ? Math.exp(-(t - BOOM) * 2.4) : 0;
        cam.position.set(2.3 - e * 0.4, 2.95 + e * 0.2, 2.4 - e * 1.4);
        handheld(cam, t, 0.05 + sh * 0.55, 9);
        cam.lookAt(-0.3, 4.1 + sh * 0.45, DOOR_Z - 1);
        cam.rotateZ(noise(t * 8, 13) * 0.05 * sh + noise(t * 1.5, 3) * 0.006);
        cam.fov = 42 - e * 3;
      } else if (t < S_CUT) {
        /* --- firefight, in among the line at helmet height: the middle pair
               flank the lens and the hall stays open above them --- */
        const e = smoothstep(0, 1, beat(t, S_FIGHT, S_CUT));
        cam.position.set(0.35 - e * 0.2, 4.35 - e * 0.12, 16.2 - e * 1.1);
        handheld(cam, t, 0.2, 21);
        cam.lookAt(-0.4, 3.5, -12);
        cam.rotateZ(noise(t * 2.3, 27) * 0.016);
        cam.fov = 45 - e * 2;
      } else if (t < S_AFTER) {
        /* --- firefight, down on the deck behind the line: fall() topples them
               backwards, which from here is straight at camera --- */
        const e = smoothstep(0, 1, beat(t, S_CUT, S_AFTER));
        cam.position.set(-2.25 + e * 0.55, 1.4 + e * 0.15, 20.7 - e * 1.5);
        handheld(cam, t, 0.24, 35);
        cam.lookAt(0.4, 3.4, -6);
        cam.rotateZ(-0.045 + noise(t * 2.7, 41) * 0.026);
        cam.fov = 48;
      } else if (t < S_ARRIVE) {
        /* --- aftermath: push toward the blown doorway --- */
        const e = smoothstep(0, 1, beat(t, S_AFTER, S_ARRIVE));
        cam.position.set(1.7 - e * 1.9, 3.6 - e * 0.4, 4.4 - e * 7.8);
        handheld(cam, t, 0.07, 53);
        cam.lookAt(0, 3.9, DOOR_Z + 1);
        cam.rotateZ(noise(t * 1.4, 57) * 0.007);
        cam.fov = 44 - e * 5;
      } else if (t < S_WALK) {
        /* --- the arrival: low, looking up into the light --- */
        const e = smoothstep(0, 1, beat(t, S_ARRIVE, S_WALK));
        cam.position.set(0.45 - e * 0.15, 1.5 + e * 0.28, -5.2 - e * 0.9);
        handheld(cam, t, 0.045, 67);
        cam.lookAt(0, 3.5, VADER_HOLD_Z + 0.6);
        cam.rotateZ(noise(t * 1.3, 71) * 0.006);
        cam.fov = 31 - e * 1.5;
      } else {
        /* --- he walks --- */
        const k = beat(t, S_WALK, END);
        const e = Math.pow(k, 1.05);
        cam.position.set(0.3 - e * 0.2, 1.78 + e * 0.72, -6.1 + e * 9.4);
        handheld(cam, t, 0.06 + e * 0.05, 83);
        cam.lookAt(0, 3.4 + e * 0.25, vz + 0.6);
        cam.rotateZ(noise(t * 1.7, 89) * 0.01);
        cam.fov = 36;
      }

      cam.updateProjectionMatrix();
    },
  };
}
