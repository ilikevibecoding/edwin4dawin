// Tracking turret geometry for the Venator: the heavy dual turbolaser (DBY-827 style: a boxy armoured
// housing with a sloped front, cheek plates and two long barrels) on the dorsal shoulders, and the twin
// point-defence emplacements along the deck edges, lower flanks and terraces. Geometry is in turret
// space — up +Y, rest aim -Z, body base at y = 0; the barrel group's elevation pivot is at its origin —
// and is instanced by the Fleet per type, yawing and pitching toward the ship's target. Hardpoints
// referencing a turret fire from pivot + aim x barrelLen.
import * as THREE from "three";
import { mergeParts } from "../fleet.js";
import { cylZ, yLoft } from "./venatorKit.js";

const box = (sx, sy, sz, x, y, z) =>
  new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);

export const HEAVY = {
  pivotY: 12.5,
  barrelLen: 48,
  yawLimit: 2.6,
  pitchMin: -0.05,
  pitchMax: 1.2,
  rate: 0.5,
};

export const LIGHT = {
  pivotY: 3.6,
  barrelLen: 10,
  yawLimit: 2.4,
  pitchMin: -0.1,
  pitchMax: 1.3,
  rate: 1.1,
};

/**
 * Heavy dual turbolaser: 16 m base ring, armoured box housing whose front slopes back over the barrel
 * root, cheek plates either side of the mantlet slot, a rear hatch block and sensor mast; barrel group =
 * mantlet, two 42 m barrels with recoil sleeves and muzzle collars, a recoil cylinder between them.
 */
export function heavyTurret() {
  const body = [];
  body.push(
    new THREE.CylinderGeometry(15.5, 16.5, 2.5, 12).translate(0, 1.25, 0),
  );
  // housing: plan rectangles (x, z) lofted up; the front (−z) leans back, the sides draw in a little
  const housing = yLoft([
    {
      y: 2.4,
      pts: [
        [-15, -14],
        [15, -14],
        [15, 13],
        [-15, 13],
      ],
    },
    {
      y: 9,
      pts: [
        [-14.5, -10],
        [14.5, -10],
        [14.5, 13],
        [-14.5, 13],
      ],
    },
    {
      y: 16.5,
      pts: [
        [-12.5, -5],
        [12.5, -5],
        [12.5, 12],
        [-12.5, 12],
      ],
    },
  ]);
  body.push(housing.hull);
  // cheek plates flanking the mantlet slot, rear hatch block, sensor mast and a small dish
  for (const s of [-1, 1]) {
    body.push(box(4, 7, 12, s * 10.5, 11.5, -6));
    body.push(box(2.2, 1.2, 6, s * 13.6, 6, 4));
  }
  body.push(box(12, 3, 6, 0, 18, 8));
  body.push(box(4.5, 0.8, 3.5, 6, 16.9, 4));
  body.push(box(1, 5, 1, -7, 19, 9));
  body.push(box(3, 0.5, 3, -7, 21.5, 9));
  const barrels = [];
  // mantlet: a wide armoured block around the barrel roots
  barrels.push(box(16, 8, 7, 0, 0.5, -2.5));
  for (const bx of [-4.8, 4.8]) {
    barrels.push(cylZ(1.5, 1.05, 42, 10).translate(bx, 0.5, -27));
    barrels.push(cylZ(2.7, 2.7, 10, 10).translate(bx, 0.5, -11));
    barrels.push(cylZ(2.2, 2.2, 3, 8).translate(bx, 0.5, -46.5));
    barrels.push(cylZ(1.7, 1.7, 2, 8).translate(bx, 0.5, -37));
  }
  barrels.push(cylZ(1.2, 1.2, 14, 6).translate(0, 2.6, -12));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}

/** Twin point-defence laser: round pedestal, boxy housing, two 8 m barrels from a mantlet block. */
export function lightTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(2.6, 3, 1.4, 8).translate(0, 0.7, 0));
  body.push(box(5.2, 3.4, 5.6, 0, 3.1, 0.6));
  body.push(box(1.2, 1.6, 1.2, 1.6, 5.6, 1.6));
  const barrels = [];
  barrels.push(box(3.4, 2, 2.6, 0, 0, -1));
  for (const bx of [-1.1, 1.1]) {
    barrels.push(cylZ(0.42, 0.34, 8, 6).translate(bx, 0, -6));
    barrels.push(cylZ(0.62, 0.62, 2, 6).translate(bx, 0, -3.2));
  }
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}
