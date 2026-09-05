// Recusant-class light destroyer (Separatist / Commerce Guild), 1187 m, matched one-to-one against
// the film model's side view and the Fact File / Clone Wars renders: bow forward (-z) is the flat
// spade-shaped body with the prow heavy turbolaser in its needle tip, a raised forward deck with a low
// dark platform, spike forests and the port-side bridge pod, blue bow stripes / roundel / chevron
// band, a ribbed tent dome over the middle of the body (crest +83 m), a dark skeletal flank under the
// dome hem with an underslung hangar module, and an exposed-truss tail narrowing into the thin spine;
// aft (+z) the vertical hub carries two stacked thruster pods (upper pod forward, lower pod aft), a
// small central nacelle and two needle booms to the full length. Canonical: 1187 x 157 x 163 m.
// Original procedural geometry, three LODs, tracking turrets.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import { col, mpart, rng } from "./munificentGeo.js";
import { turretType } from "./munificentTurrets.js";
import {
  buildBody,
  domeAt,
  halfW,
  MODULE,
  platformHalfW,
  topAt,
} from "./recusantBody.js";
import { buildStern, STERN } from "./recusantStern.js";

export const RECUSANT = { length: 1187, width: 157, height: 163 };

// palette: vertex tints over the shared plating (albedo ~0.62 before tint): grey-white upper hull,
// mid grey structure, dark lower hull; machinery tints on the dark texture; rust-red recessed
// panels; cobalt paint and white markings
const COLOURS = {
  LIGHT: col(0xd9dce1),
  MID: col(0x9ea2a8),
  LOW: col(0x565a62),
  FRAME: 0x8e9298,
  MACH: 0x62646a,
  MACH_C: col(0x62646a),
  MACH_DK: 0x393b41,
  RUST: 0x5e433d,
  BLUE: 0x2e4aa8,
  WHITE: 0xeef0f2,
  WINDOW: 0xfff0d8,
  WINDOW_GREEN: 0xc8ffd8,
  SHELL: col(0x6a6c72),
  SHELL_DK: col(0x3a3c42),
};

export function buildRecusant(mats) {
  const K = COLOURS;
  const parts = [];
  const hardpoints = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(7719);
  const ctx = { add, rand, colours: K };

  buildBody(ctx);
  const engines = buildStern(ctx);

  // ---------------------------------------------------------------------------
  // fixed guns: the prow heavy turbolaser in the needle tip, two heavy cannons on the blade flanks
  // ---------------------------------------------------------------------------
  hardpoints.push({
    pos: [0, -7.6, -593],
    dir: [0, 0, -1],
    kind: "heavy",
    range: 15000,
  });
  for (const side of [-1, 1]) {
    hardpoints.push({
      pos: [side * 17, 6, -506],
      dir: [side * 0.32, 0.04, -0.95],
      kind: "heavy",
      range: 13000,
    });
    for (const lod of [0, 1])
      add(
        new THREE.BoxGeometry(5, 3.5, 10).translate(side * 16, 6, -501),
        "dark",
        {
          color: K.MACH_DK,
          texel: 1 / 3,
          lod,
        },
      );
  }

  // ---------------------------------------------------------------------------
  // tracking turrets: heavies on the deck beside the platform, under the hangar module and on the
  // dome's aft slope; lights on the deck shoulders, beside the dome front and on the pods
  // ---------------------------------------------------------------------------
  const heavy = turretType(9, K.LIGHT, K.MACH_DK, 1, { rate: 0.5 });
  const light = turretType(4.4, K.LIGHT, K.MACH_DK, 0, {
    rate: 0.9,
    yawLimit: 2.8,
  });
  const pad = (p, n, r, lod) => {
    const g = new THREE.CylinderGeometry(r, r * 1.08, 1.2, lod === 0 ? 14 : 10);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(...n),
      ),
    );
    g.translate(...p);
    add(g, "hull", { color: K.MID.getHex(), texel: 1 / 5, lod });
  };
  const place = (type, p, n, r, hpKind, range) => {
    const nn = new THREE.Vector3(...n).normalize();
    const base = new THREE.Vector3(...p).addScaledVector(nn, 0.4);
    for (const lod of [0, 1]) pad(base.toArray(), n, r, lod);
    const k = turrets.length;
    turrets.push({
      type,
      pos: base.clone().addScaledVector(nn, 0.6).toArray(),
      up: nn.toArray(),
      forward: [0, 0, -1],
    });
    hardpoints.push({
      pos: base
        .clone()
        .addScaledVector(nn, r)
        .add(new THREE.Vector3(0, 0, -2 * r))
        .toArray(),
      dir: [Math.sign(p[0]) * 0.4, nn.y * 0.5, -0.75],
      kind: hpKind,
      range,
      turret: k,
    });
  };
  for (const side of [-1, 1]) {
    {
      const z = -282;
      const x = side * (platformHalfW(z) + 12);
      place("heavy", [x, topAt(x, z) + 0.2, z], [0, 1, 0], 10, "heavy", 13000);
    }
    place(
      "heavy",
      [side * 10, MODULE.bottom - 0.3, -300],
      [0, -1, 0],
      10,
      "heavy",
      13000,
    );
    {
      const s = domeAt(Math.PI / 2 - side * 0.4, 46, 0);
      place("heavy", s.p, s.n, 10, "heavy", 13000);
    }
    {
      const z = -372;
      const x = side * (platformHalfW(z) + 9);
      place("light", [x, topAt(x, z) + 0.2, z], [0, 1, 0], 5.5, "light", 7000);
    }
    {
      const z = -205;
      const x = side * (halfW(z) - 9);
      place("light", [x, topAt(x, z) + 0.2, z], [0, 1, 0], 5.5, "light", 7000);
    }
    const T = STERN.topPod;
    place(
      "light",
      [side * 12, T.cy + T.h + 0.3, 300],
      [0, 1, 0],
      5.5,
      "light",
      7000,
    );
    const Lp = STERN.lowPod;
    place(
      "light",
      [side * 12, Lp.cy - Lp.h - 0.3, 400],
      [0, -1, 0],
      5.5,
      "light",
      7000,
    );
  }

  return assemble(
    {
      id: "recusant",
      side: "separatist",
      length: RECUSANT.length,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 610 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
