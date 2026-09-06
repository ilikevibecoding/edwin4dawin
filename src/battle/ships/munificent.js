// Munificent-class star frigate (Separatist / InterGalactic Banking Clan), 825 m long, 426 m across the
// lateral wing, 243 m tall. Rebuilt one-to-one against the reference stills and the two ICS cutaways;
// the layout (see munificentSpec.js) runs bow to stern: the 132 m hood cowl with its wedge lip and
// crescent nose, open aft over the transceiver drums on the dark machinery deck; the sensor cross at
// 26 % (tall dorsal blade, ventral blade, 426 m wing on a dark spar); the dark machinery neck with its
// row of round reactor ports and tall lit bays; the 164 m dome with the dark spine trench along its
// top, its shell edge raked back over the reactor sphere, shallow dark lower hull and keel; the tiered
// bridge tower at the trench end; and the two armour shells thinning past the tower into the long
// inward-curving stern blades either side of the thruster block (three thrusters up, two below).
// Banking Clan livery: pale grey-white plating with dark plank seams, blue bands and the white hexagon
// with the Confederacy emblem on each flank, ochre wing stripes, yellow running lights and the
// green-lit bridge glass.
// Tracking heavy turrets on the dome deck, light turrets along the lower hull, hood flanks and wing.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import { mpart, rng } from "./munificentGeo.js";
import { turretType } from "./munificentTurrets.js";
import { scorchRing } from "./munificentDetail.js";
import { buildBow, hoodTint } from "./munificentBow.js";
import { buildAft, domeTint } from "./munificentAft.js";
import {
  D2R,
  HULL,
  HULL_DK,
  HW,
  MACH_DK,
  MUNIFICENT,
  SOOT,
  Y,
  Z,
  domeNormal,
  domePoint,
  hoodNormal,
  hoodPoint,
} from "./munificentSpec.js";

export { MUNIFICENT };

export function buildMunificent(mats) {
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(4127);

  buildBow(add, rand);
  buildAft(add, rand, engines);

  // ---------------------------------------------------------------------------
  // tracking turrets: heavy on the dome deck flanking the trench, light along the hull
  // ---------------------------------------------------------------------------
  const heavy = turretType(7.5, HULL, MACH_DK, 1, { rate: 0.5 });
  const light = turretType(4.0, HULL, MACH_DK, 0, { rate: 0.9, yawLimit: 2.8 });
  const mount = (type, pos, up, forward, dir, kind, range, padR) => {
    const u = new THREE.Vector3(...up).normalize();
    for (const lod of [0, 1]) {
      const pad = new THREE.CylinderGeometry(padR, padR * 1.1, 1.2, lod === 0 ? 14 : 8);
      pad.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u),
      );
      pad.translate(pos[0] - u.x * 0.3, pos[1] - u.y * 0.3, pos[2] - u.z * 0.3);
      add(pad, "hull", { color: HULL_DK, texel: 1 / 4, lod });
    }
    const k = turrets.length;
    turrets.push({
      type,
      pos: [pos[0] + u.x * 0.4, pos[1] + u.y * 0.4, pos[2] + u.z * 0.4],
      up,
      forward,
    });
    const muzzle = type === "heavy" ? 26 : 12;
    const d = new THREE.Vector3(...dir).normalize();
    hardpoints.push({
      pos: [
        pos[0] + u.x * 6 + d.x * muzzle,
        pos[1] + u.y * 6 + d.y * muzzle,
        pos[2] + u.z * 6 + d.z * muzzle,
      ],
      dir,
      kind,
      range,
      turret: k,
    });
  };
  for (const side of [-1, 1]) {
    // heavy turrets on the shells' upper slopes
    for (const z of [100, 172]) {
      const a = 63 * D2R;
      const p = domePoint(z, a, side, 0);
      const n = domeNormal(z, a, side);
      mount("heavy", p, n, [0, 0, -1], [side * 0.5, 0.55, -0.7], "heavy", 12000, 9.5);
    }
    // light turrets: lower hull flanks, hood flanks, spar top, neck deck, dome deck aft
    for (const z of [50, 125, 200, 268])
      mount(
        "light",
        [side * (HW.lower + 1.2), -21.5, z],
        [side, 0, 0],
        [0, 0, -1],
        [side * 0.85, 0.05, -0.5],
        "light",
        7000,
        5,
      );
    for (const z of [-352, -302]) {
      const a = (side > 0 ? 16 : 164) * D2R;
      mount(
        "light",
        hoodPoint(z, a, 0),
        hoodNormal(z, a),
        [0, 0, -1],
        [side * 0.8, 0.15, -0.6],
        "light",
        7000,
        5,
      );
    }
    mount("light", [side * 70, 10.2, Z.fin], [0, 1, 0], [0, 0, -1], [side * 0.4, 0.6, -0.7], "light", 7000, 5);
    mount("light", [side * 42, Y.neckTop + 0.2, -96], [0, 1, 0], [0, 0, -1], [side * 0.4, 0.6, -0.7], "light", 7000, 5);
    {
      const a = 72 * D2R;
      mount(
        "light",
        domePoint(226, a, side, 0),
        domeNormal(226, a, side),
        [0, 0, -1],
        [side * 0.3, 0.7, -0.65],
        "light",
        7000,
        5,
      );
    }
    // fixed twin batteries along the dome eave and the neck flank
    for (const z of [70, 140, 210])
      hardpoints.push({
        pos: domePoint(z, 6 * D2R, side, 1),
        dir: [side * 0.9, 0.05, -0.45],
        kind: "light",
        range: 7000,
      });
    for (const z of [-100, -40])
      hardpoints.push({
        pos: [side * (HW.neck + 1), 6, z],
        dir: [side * 0.9, 0.05, -0.45],
        kind: "light",
        range: 7000,
      });
    // forward heavy guns in the hood lip (the lip is a crescent: it sits 16 m aft of the corners here)
    hardpoints.push({
      pos: [side * 22, 9.5, Z.nose + 17],
      dir: [side * 0.15, 0, -1],
      kind: "heavy",
      range: 12000,
    });
  }
  // scorch marks near the heavy turrets and on the hood
  for (const side of [-1, 1]) {
    const a = 50 * D2R;
    scorchRing(add, {
      c: domePoint(150, a, side, 0),
      n: domeNormal(150, a, side),
      r: 8,
      base: domeTint(side),
      soot: SOOT,
      strength: 0.7,
      lod: 0,
    });
  }
  scorchRing(add, {
    c: hoodPoint(-320, 70 * D2R, 0),
    n: hoodNormal(-320, 70 * D2R),
    r: 9,
    base: hoodTint,
    soot: SOOT,
    strength: 0.75,
    lod: 0,
  });

  return assemble(
    {
      id: "munificent",
      side: "separatist",
      length: MUNIFICENT.length,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 440 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
