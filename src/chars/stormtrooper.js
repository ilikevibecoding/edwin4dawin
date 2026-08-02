import * as THREE from 'three';
import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import {
  FACE_TROOPER, TORSO_TROOPER_FRONT, TORSO_TROOPER_BACK, TORSO_SIDE_TROOPER,
} from './prints.js';
import { trooperHelmet } from './headgear.js';
import { e11Blaster } from './weapons.js';
import { figGroup, setHeldPitch, num, groundFeet, softenGloss } from './util.js';

/*
 * Stormtroopers come in crowds, so the helmet and the E-11 are each built once
 * and cloned: Object3D.clone() reuses the geometry and the material, and because
 * every trooper Minifig is given the same `name` the face and torso prints share
 * one rasterised texture too.
 */
let helmetTemplate = null;
let blasterTemplate = null;

function sharedHelmet(fig) {
  if (!helmetTemplate) helmetTemplate = trooperHelmet(null);
  if (fig) fig.topStud.visible = false;
  return helmetTemplate.clone();
}

export function sharedE11() {
  if (!blasterTemplate) blasterTemplate = e11Blaster();
  return blasterTemplate.clone();
}

/** The bare Minifig, so the crowd builder can stamp out as many as it likes. */
export function stormtrooperFig() {
  return new Minifig({
    name: 'stormtrooper',
    skin: C.white,
    torso: C.white,
    arms: C.white,
    hands: C.black,
    hips: C.white,
    legs: C.white,
    collar: C.black,
    face: FACE_TROOPER,
    torsoFront: TORSO_TROOPER_FRONT,
    torsoBack: TORSO_TROOPER_BACK,
    torsoSide: TORSO_SIDE_TROOPER,
    headgear: (f) => sharedHelmet(f),
  });
}

/**
 * Imperial stormtrooper: white plastoid armour, brick-built helmet, E-11.
 *
 * @param {{ pose?: string, pitch?: number }} [opts]
 */
export function buildStormtrooper(opts = {}) {
  const fig = stormtrooperFig();
  fig.setPose(opts.pose || 'hold_right');
  const blaster = sharedE11();
  fig.attach('R', blaster);
  // barrel just under horizontal, so the rifle reads in silhouette from the front
  setHeldPitch(fig, 'R', blaster, num(opts.pitch, -1.5));
  return figGroup(fig, { name: 'stormtrooper', userData: { blaster } });
}

/**
 * A squad of troopers in formation with a synchronised march.
 * `group.userData.marchAt(t)` poses the whole squad for time t, so the film and
 * the headless renderer both get the same frame.
 *
 * @param {{ n?: number, cols?: number, spacing?: number, speed?: number }} [opts]
 */
export function buildCrowdTroopers(opts = {}) {
  // a trooper is 3,568 tris, so 22 is the most that fits the 80k crowd budget
  const n = Math.max(1, Math.min(22, Math.round(num(opts.n, 8))));
  const cols = Math.max(1, Math.min(n, Math.round(num(opts.cols, Math.min(4, n)))));
  const rows = Math.ceil(n / cols);
  const dx = num(opts.spacing, 2.5);
  const dz = num(opts.spacing, 2.5) * 1.05;
  const speed = num(opts.speed, 1);

  const group = new THREE.Group();
  group.name = 'crowd_troopers';
  const figs = [];

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fig = stormtrooperFig();
    const blaster = sharedE11();
    fig.setPose('hold_right');
    fig.attach('R', blaster);
    setHeldPitch(fig, 'R', blaster, -0.55);   // rifle shouldered, barrel up
    fig.setPosition((col - (cols - 1) / 2) * dx, 0, -(row - (rows - 1) / 2) * dz);
    group.add(groundFeet(fig.object3D));
    figs.push(fig);
  }
  softenGloss(group);

  const marchAt = (t) => {
    for (const fig of figs) {
      fig.walkPhase = t * 7.0 * speed;
      fig.walk(0, speed);
      // rifle arm stays up on the shoulder instead of swinging
      fig.arms.R.rotation.x = -1.45;
    }
  };
  marchAt(0);

  group.userData.figs = figs;
  group.userData.marchAt = marchAt;
  group.userData.update = (t, dt) => {
    marchAt(t);
    for (const fig of figs) fig.update(dt, t);
  };
  return group;
}
