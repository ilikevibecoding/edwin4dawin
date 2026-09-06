// Tracking turret geometry for the Arquitens: a heavy twin turbolaser (the show's long paired barrels
// on the deck shoulders and prong ledges) and a light twin laser emplacement. Turret space: up +Y, rest
// aim -Z, body base at y = 0; the barrel group's elevation pivot is at its origin. The Fleet instances
// one body mesh + one barrel mesh per type per class and aims them at the ship's target.
import * as THREE from "three";
import { mergeParts } from "../fleet.js";
import { cylZ, loftProfile } from "./venatorKit.js";

const oct = (hx, hz, c) => [
  [-hx + c, -hz],
  [hx - c, -hz],
  [hx, -hz + c],
  [hx, hz - c],
  [hx - c, hz],
  [-hx + c, hz],
  [-hx, hz - c],
  [-hx, -hz + c],
];

// loft along +y from [{ y, pts: [[x, z], ...] }]
function yLoft(secs) {
  const out = loftProfile(
    secs.map(({ y, pts }) => ({ z: y, pts: pts.map(([x, z]) => [x, -z]) })),
  );
  for (const g of Object.values(out)) g.rotateX(-Math.PI / 2);
  return out.hull;
}

const box = (sx, sy, sz, x, y, z) =>
  new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);

export const HEAVY = {
  pivotY: 3.7,
  barrelLen: 10,
  yawLimit: 2.7,
  pitchMin: -0.05,
  pitchMax: 1.2,
  rate: 0.75,
};

export const LIGHT = {
  pivotY: 2.1,
  barrelLen: 7.5,
  yawLimit: 2.5,
  pitchMin: -0.1,
  pitchMax: 1.3,
  rate: 1.3,
};

/**
 * Heavy quad turbolaser (the show's chunky deck mounts flanking the bridge, ~10 m across): base ring,
 * tapering octagonal armoured body with cheek plates and a rear sensor box; barrel group = a wide
 * mantlet block and four 9 m barrels in two stacked pairs, with recoil sleeves and muzzle collars.
 */
export function heavyTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(4.8, 5.2, 1, 12).translate(0, 0.5, 0));
  body.push(
    yLoft([
      { y: 1, pts: oct(4.3, 4, 1.1) },
      { y: 2.9, pts: oct(4, 3.8, 1) },
      { y: 4.6, pts: oct(3, 3.2, 0.8) },
    ]),
  );
  for (const s of [-1, 1]) body.push(box(1, 1.6, 3.4, s * 2.6, 4.6, -0.3));
  body.push(box(1.6, 0.8, 1.6, 0, 4.9, 1.7));
  body.push(box(0.4, 1.5, 0.4, -1.4, 5.4, 2.2));
  const barrels = [];
  barrels.push(box(5.6, 3, 2.8, 0, 0.3, -1));
  for (const bx of [-1.4, 1.4])
    for (const by of [-0.55, 0.95]) {
      barrels.push(cylZ(0.36, 0.5, 8.5, 8).translate(bx, by, -6.2));
      barrels.push(cylZ(0.66, 0.66, 2.4, 8).translate(bx, by, -3.2));
      barrels.push(cylZ(0.56, 0.56, 0.9, 8).translate(bx, by, -10.1));
    }
  barrels.push(cylZ(0.3, 0.3, 3, 6).translate(0, 1.9, -3.4));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}

/** Light twin laser emplacement: round base, boxy housing, two 6 m barrels with a mantlet block. */
export function lightTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(2.2, 2.5, 0.8, 8).translate(0, 0.4, 0));
  body.push(box(3.2, 2.2, 3.6, 0, 1.9, 0.3));
  const barrels = [];
  barrels.push(box(2.4, 1.4, 1.8, 0, 0, -0.6));
  for (const bx of [-0.7, 0.7])
    barrels.push(cylZ(0.24, 0.32, 6.2, 6).translate(bx, 0, -4.6));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}
