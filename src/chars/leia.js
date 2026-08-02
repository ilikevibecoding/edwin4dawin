import * as THREE from 'three';
import { C, FINISH } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { Minifig, FIG } from '../lego/minifig.js';
import { FACE_LEIA, TORSO_LEIA_FRONT } from './prints.js';
import { leiaHair } from './headgear.js';
import { figGroup, flag } from './util.js';

/** Full-length gown skirt hung off the hips, so the legs still animate under it. */
function gownSkirt() {
  const h = FIG.legH * 0.92;
  const geo = new THREE.CylinderGeometry(0.80, 1.18, h, 22, 1, true);
  geo.translate(0, 0.30 - h / 2, 0);
  const m = mat(C.white, FINISH.SOLID, { roughness: 0.6 }).clone();
  m.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * Princess Leia in the white senatorial gown: side buns, hood yoke, disc belt.
 *
 * @param {{ gown?: boolean, pose?: string }} [opts]
 */
export function buildLeia(opts = {}) {
  const fig = new Minifig({
    name: 'leia',
    skin: C.yellow,
    torso: C.white,
    arms: C.white,
    hands: C.yellow,
    hips: C.white,
    legs: C.white,
    collar: C.veryLightGray,
    face: FACE_LEIA,
    torsoFront: TORSO_LEIA_FRONT,
    torsoBack: TORSO_LEIA_FRONT,
    headgear: (f) => leiaHair(f),
  });

  if (flag(opts.gown, true)) fig.hips.add(gownSkirt());
  fig.setPose(opts.pose || 'idle');
  fig.arms.L.rotation.x = -0.18;
  fig.arms.R.rotation.x = -0.18;

  return figGroup(fig, { name: 'leia' });
}
