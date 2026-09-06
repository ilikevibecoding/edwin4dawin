// Tracking turret geometry for the Acclamator: heavy quad turbolaser (dorsal shoulders and the ventral
// barbettes) and light single emplacements (deck edges, superstructure ledges, lower flanks). Geometry is
// in turret space — up +Y, rest aim -Z, body base at y = 0; the barrel group's elevation pivot is at its
// origin — and is instanced by the Fleet per type. Hardpoints referencing a turret fire from
// pivot + aim x barrelLen.
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
  pivotY: 9.5,
  barrelLen: 34,
  yawLimit: 2.7,
  pitchMin: -0.05,
  pitchMax: 1.2,
  rate: 0.55,
};

export const LIGHT = {
  pivotY: 3.2,
  barrelLen: 11,
  yawLimit: 2.4,
  pitchMin: -0.1,
  pitchMax: 1.3,
  rate: 1.1,
};

/**
 * Heavy quad turbolaser: 13 m base ring, squat octagonal armoured body with a stepped roof, sensor box and
 * a rear access hatch; barrel group = wide mantlet, two pairs of 28 m barrels with recoil sleeves.
 */
export function heavyTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(13, 14, 2.4, 12).translate(0, 1.2, 0));
  body.push(
    yLoft([
      { y: 2.4, pts: oct(12, 11, 3.5) },
      { y: 7, pts: oct(11, 10.5, 3) },
      { y: 11, pts: oct(8.5, 8.5, 2.5) },
    ]),
  );
  // cheek armour either side of the mantlet slot, sensor box and rear hatch
  for (const s of [-1, 1]) body.push(box(2.6, 4.2, 8, s * 7.2, 11.2, -0.5));
  body.push(box(4.2, 2, 4, 0, 11.8, 4.5));
  body.push(box(3.2, 0.5, 2.6, 4.2, 11, 6));
  body.push(box(1, 3.2, 1, -4, 12.4, 6));
  const barrels = [];
  barrels.push(box(13.5, 5.6, 7, 0, 0, -2.5));
  for (const bx of [-3.8, 3.8]) {
    for (const by of [-1.1, 1.3]) {
      barrels.push(cylZ(1.0, 1.4, 28, 8).translate(bx, by, -20));
      barrels.push(cylZ(1.9, 1.9, 7, 8).translate(bx, by, -9.5));
      barrels.push(cylZ(1.6, 1.6, 2.4, 8).translate(bx, by, -33));
    }
  }
  // recoil cylinder between the barrel pairs
  barrels.push(cylZ(0.9, 0.9, 11, 6).translate(0, 2.4, -10.5));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}

/** Light single-barrel emplacement: round base, boxy housing, one 8 m barrel with a mantlet block. */
export function lightTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(2.8, 3.2, 1.4, 8).translate(0, 0.7, 0));
  body.push(box(4.4, 3, 5.4, 0, 2.8, 0.4));
  const barrels = [];
  barrels.push(box(2.3, 2, 2.6, 0, 0, -0.9));
  barrels.push(cylZ(0.4, 0.55, 8.5, 6).translate(0, 0, -6.6));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}
