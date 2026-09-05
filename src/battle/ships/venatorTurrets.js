// Tracking turret geometry for the Venator: heavy dual turbolaser (dorsal shoulders) and light single
// emplacements (wing edges, lower flanks, block ledges). Geometry is in turret space — up +Y, rest aim
// -Z, body base at y = 0; the barrel group's elevation pivot is at its origin — and is instanced by the
// Fleet per type (one body mesh + one barrel mesh per type per class), yawing and pitching toward the
// ship's target. Hardpoints referencing a turret fire from pivot + aim x barrelLen.
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
  pivotY: 12.5,
  barrelLen: 47,
  yawLimit: 2.6,
  pitchMin: -0.05,
  pitchMax: 1.2,
  rate: 0.5,
};

export const LIGHT = {
  pivotY: 3.7,
  barrelLen: 12.5,
  yawLimit: 2.4,
  pitchMin: -0.1,
  pitchMax: 1.3,
  rate: 1.1,
};

/**
 * Heavy dual turbolaser: 16 m base ring, tapering octagonal armoured body with a sensor box and a rear
 * hatch; barrel group = armoured mantlet, two 40 m barrels with recoil sleeves and muzzle collars.
 */
export function heavyTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(16, 17, 3, 12).translate(0, 1.5, 0));
  body.push(
    yLoft([
      { y: 3, pts: oct(14, 13, 4) },
      { y: 9, pts: oct(13, 12.5, 3.5) },
      { y: 14, pts: oct(10.5, 10.5, 3) },
    ]),
  );
  // cheek armour either side of the mantlet slot, sensor box and rear hatch
  for (const s of [-1, 1]) body.push(box(3, 5, 10, s * 8.5, 14.5, -1));
  body.push(box(5, 2.4, 5, 0, 15.2, 5));
  body.push(box(4, 0.5, 3, 5, 14.2, 7));
  body.push(box(1.2, 4, 1.2, -5, 16, 7));
  const barrels = [];
  barrels.push(box(17, 7, 8, 0, 0, -3));
  for (const bx of [-4.6, 4.6]) {
    barrels.push(cylZ(1.3, 1.9, 40, 8).translate(bx, 0.5, -27));
    barrels.push(cylZ(2.5, 2.5, 9, 8).translate(bx, 0.5, -11.5));
    barrels.push(cylZ(2.2, 2.2, 3, 8).translate(bx, 0.5, -45.5));
  }
  // recoil cylinder between the barrels
  barrels.push(cylZ(1.1, 1.1, 14, 6).translate(0, 2.2, -13));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}

/** Light single-barrel emplacement: round base, boxy housing, one 9 m barrel with a mantlet block. */
export function lightTurret() {
  const body = [];
  body.push(new THREE.CylinderGeometry(3.2, 3.6, 1.6, 8).translate(0, 0.8, 0));
  body.push(box(5, 3.4, 6, 0, 3.2, 0.5));
  const barrels = [];
  barrels.push(box(2.6, 2.2, 3, 0, 0, -1));
  barrels.push(cylZ(0.45, 0.62, 9.5, 6).translate(0, 0, -7.5));
  return { body: mergeParts(body), barrels: mergeParts(barrels) };
}
