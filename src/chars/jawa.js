import * as THREE from 'three';
import { C, FINISH } from '../lego/palette.js';
import { mat, glow } from '../lego/materials.js';
import { sphereGeo } from '../lego/parts.js';
import { Minifig, FIG } from '../lego/minifig.js';
import { FACE_JAWA, TORSO_JAWA_FRONT } from './prints.js';
import { jawaHood, faceX, faceY, faceTheta, HEAD_R } from './headgear.js';
import { figGroup, num, makeCloth } from './util.js';

/**
 * Robe hem hung off the hips. Without it the jawa reads as a hooded torso on two
 * black posts; with it the silhouette is the sack-shaped robe it should be. Like
 * Leia's gown it is a static cone, so the legs still animate underneath.
 */
function robeHem() {
  const h = FIG.legH * 0.78;
  const geo = new THREE.CylinderGeometry(0.86, 1.16, h, 20, 1, true);
  geo.translate(0, 0.34 - h / 2, 0);
  const m = mat(C.reddishBrown, FINISH.SOLID).clone();
  m.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = mesh.receiveShadow = true;
  return makeCloth(mesh);
}

/** Two hot yellow points in the dark of the hood, plus the light they throw. */
function glowEyes(fig) {
  const g = new THREE.Group();
  const y = faceY(112);
  for (const px of [224, 288]) {
    const x = faceX(px);
    const z = Math.cos(faceTheta(px)) * HEAD_R + 0.03;
    const core = new THREE.Mesh(sphereGeo(0.075, 10, 8), glow(C.transYellow, 1));
    core.position.set(x, y, z);
    g.add(core);
    const halo = new THREE.Mesh(sphereGeo(0.14, 10, 8), glow(C.brightLightYellow, 0.28));
    halo.position.set(x, y, z);
    g.add(halo);
  }
  const lamp = new THREE.PointLight(C.brightLightYellow, 2.2, 2.6, 2);
  lamp.position.set(0, y, 0.55);
  g.add(lamp);
  fig.head.add(g);
  return g;
}

/**
 * Jawa: barely a metre of scavenger inside a hooded brown robe. Built on the
 * standard rig scaled to 0.75 so it can share poses and the walk cycle with
 * everybody else.
 *
 * @param {{ scale?: number, pose?: string }} [opts]
 */
export function buildJawa(opts = {}) {
  const fig = new Minifig({
    name: 'jawa',
    skin: C.trueBlack,
    torso: C.darkBrown,
    arms: C.darkBrown,
    hands: C.darkBrown,
    hips: C.darkBrown,
    legs: C.darkBrown,
    collar: C.trueBlack,
    face: FACE_JAWA,
    torsoFront: TORSO_JAWA_FRONT,
    torsoBack: TORSO_JAWA_FRONT,
    torsoSide: TORSO_JAWA_FRONT,
    headgear: (f) => jawaHood(f),
  });

  glowEyes(fig);
  fig.hips.add(robeHem());
  fig.root.scale.setScalar(num(opts.scale, 0.75));
  fig.setPose(opts.pose || 'idle');
  // short arms held in front, the way jawas carry their loot
  fig.arms.L.rotation.set(-0.85, 0, 0.34);
  fig.arms.R.rotation.set(-0.85, 0, -0.34);

  return figGroup(fig, { name: 'jawa' });
}
