// Recusant aft section (0.68 .. 1.0 of the length), matched to the film model and the Clone Wars
// render: the thin octagonal spine (22 m) leaving the truss tail with a light box on its back and a
// row of dark radiator slats underneath, the vertical hub block with oval shield plates, the two
// thruster pods stacked on the centreline (upper pod 0.70 .. 0.875 L centred at +62, lower pod
// 0.76 .. 0.94 L centred at -38; each a long chamfered box ~42 m wide with a light octagonal forward
// cap, a long rust-red recessed flank panel, a dorsal ridge and a hooded aft exhaust), the small
// central nacelle behind the hub and two needle booms trailing to the full 1187 m.
import * as THREE from "three";
import {
  bar,
  loftZ,
  quadAt,
  ringZ,
  roundedRect,
  sweep,
  tubeZ,
} from "./munificentGeo.js";
import { slotWindow } from "./munificentDetail.js";
import { octagonAt, octNozzle, sectionLoft } from "./recusantGeo.js";
import { TAIL_Z } from "./recusantBody.js";

export const STERN = {
  spineZ0: TAIL_Z,
  hubZ0: 300,
  hubZ1: 372,
  spine: { w: 11, h: 11 },
  hub: { w: 17, y0: -16, y1: 38 },
  topPod: { z0: 240, z1: 418, zMouth: 445, zHood: 462, cy: 62, w: 21, h: 25 },
  lowPod: { z0: 310, z1: 496, zMouth: 522, zHood: 540, cy: -38, w: 21, h: 24 },
  nacelle: { z0: 372, zMouth: 448, cy: 8, w: 10, h: 11 },
};

/**
 * Build the stern. ctx: { add, rand, colours }. Returns the engines[] entries (mouths facing +z).
 */
export function buildStern({ add, rand, colours: K }) {
  const engines = [];
  const S = STERN;

  // ---------------------------------------------------------------------------
  // spine: dark octagonal truss core, light frames every 20 m, side pipes, dorsal raceway, the
  // light box on its back and the radiator slats hanging below
  // ---------------------------------------------------------------------------
  const sw = S.spine.w;
  const sh = S.spine.h;
  for (const lod of [0, 1, 2]) {
    const k = lod === 2 ? 1.3 : 1;
    add(
      sectionLoft(
        [
          { z: S.spineZ0 - 2, pts: octagonAt(sw * k, sh * k, 0, 0, 0.55) },
          { z: S.hubZ0 + 4, pts: octagonAt(sw * k, sh * k, 0, 0, 0.55) },
        ],
        { texel: 1 / 6 },
      ),
      lod === 2 ? "hull" : "dark",
      lod === 2
        ? {
            uv: "keep",
            lod,
            tint: (x, y, z, o) =>
              o.copy(K.MID).multiplyScalar(y < 0 ? 0.75 : 1.0),
          }
        : { uv: "keep", lod, color: K.MACH },
    );
  }
  for (const lod of [0, 1]) {
    for (let z = S.spineZ0 + 10, i = 0; z < S.hubZ0 - 6; z += 20, i++) {
      if (lod === 1 && i % 2) continue;
      add(
        ringZ(
          octagonAt(sw + 2.0, sh + 2.0, 0, 0, 0.55),
          octagonAt(sw - 0.5, sh - 0.5, 0, 0, 0.55),
          z - 1.2,
          z + 1.2,
        ),
        "hull",
        { color: K.FRAME, texel: 1 / 3, lod },
      );
    }
    for (const [x, y] of [
      [-sw - 1.3, 2],
      [sw + 1.3, 2],
      [-sw - 1.0, -5],
      [sw + 1.0, -5],
    ])
      add(
        tubeZ(
          1.5,
          1.5,
          S.hubZ0 - S.spineZ0 - 4,
          lod === 0 ? 6 : 4,
          x,
          y,
          (S.spineZ0 + S.hubZ0) / 2,
          false,
        ),
        "dark",
        {
          color: K.MACH_DK,
          texel: 1 / 2,
          lod,
        },
      );
    add(
      new THREE.BoxGeometry(6, 2.6, S.hubZ0 - S.spineZ0 - 8).translate(
        0,
        sh + 1.1,
        (S.spineZ0 + S.hubZ0) / 2,
      ),
      "hull",
      {
        color: K.MID.getHex(),
        texel: 1 / 3,
        lod,
      },
    );
    // radiator slats under the spine
    for (let z = 228, i = 0; z <= 292; z += 9, i++) {
      if (lod === 1 && i % 2) continue;
      add(
        new THREE.BoxGeometry(13, 15, 1.6).translate(0, -sh - 7.5, z),
        "dark",
        {
          color: i % 3 === 1 ? K.MACH_DK : K.RUST,
          texel: 1 / 3,
          lod,
        },
      );
    }
    add(
      new THREE.BoxGeometry(11, 2, 72).translate(0, -sh - 15.5, 260),
      "dark",
      { color: K.MACH_DK, texel: 1 / 3, lod },
    );
  }
  // light box on the spine's back (and its lit slots), the pylon to the top pod's front
  for (const lod of [0, 1, 2]) {
    add(
      sectionLoft(
        [
          { z: 249, pts: octagonAt(5, 2.5, 0, sh + 3.5, 0.6) },
          { z: 256, pts: octagonAt(6.5, 4.5, 0, sh + 4.6, 0.6) },
          { z: 279, pts: octagonAt(6.5, 4.5, 0, sh + 4.6, 0.6) },
          { z: 285, pts: octagonAt(5, 2.5, 0, sh + 3.5, 0.6) },
        ],
        { capStart: true, capEnd: true, texel: 1 / 5 },
      ),
      "hull",
      { uv: "keep", lod, color: K.LIGHT.getHex() },
    );
    add(
      new THREE.BoxGeometry(9, S.topPod.cy - S.topPod.h - sh + 1, 16).translate(
        0,
        (S.topPod.cy - S.topPod.h + sh) / 2,
        S.topPod.z0 + 12,
      ),
      "dark",
      {
        color: K.MACH,
        texel: 1 / 4,
        lod,
      },
    );
  }
  for (const side of [-1, 1])
    for (let z = S.spineZ0 + 20; z < S.hubZ0 - 12; z += 40)
      add(
        quadAt(
          [side * (sw + 0.3), -1.5, z],
          [side, 0, 0],
          [0, 0, 1],
          7,
          1.3,
          0,
        ),
        "windows",
        {
          color: K.WINDOW_GREEN,
          lod: 0,
          uv: "keep",
        },
      );

  // ---------------------------------------------------------------------------
  // hub: vertical block joining spine, pods and nacelle, oval shield plates, rust-red aft block
  // ---------------------------------------------------------------------------
  const hubC = (S.hub.y0 + S.hub.y1) / 2;
  const hubH = (S.hub.y1 - S.hub.y0) / 2;
  const hw = S.hub.w;
  for (const lod of [0, 1, 2]) {
    add(
      sectionLoft(
        [
          { z: S.hubZ0, pts: octagonAt(hw - 4, hubH - 3, 0, hubC, 0.62) },
          { z: S.hubZ0 + 8, pts: octagonAt(hw, hubH, 0, hubC, 0.62) },
          { z: S.hubZ1 - 8, pts: octagonAt(hw, hubH, 0, hubC, 0.62) },
          { z: S.hubZ1, pts: octagonAt(hw - 4, hubH - 3, 0, hubC, 0.62) },
        ],
        { capStart: true, capEnd: true, texel: 1 / 8 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(K.MID).multiplyScalar(0.78 + 0.06 * Math.sin(z * 0.7)),
      },
    );
    for (const side of [-1, 1])
      add(
        sweep(
          roundedRect(lod === 0 ? 3 : 1, 0.45, 0.35),
          [
            {
              p: [side * (hw + 0.2), hubC + 1, (S.hubZ0 + S.hubZ1) / 2 - 4],
              sx: 24,
              sy: hubH - 4,
              t: [side, 0, 0],
            },
            {
              p: [side * (hw + 2.6), hubC + 1, (S.hubZ0 + S.hubZ1) / 2 - 4],
              sx: 24,
              sy: hubH - 4,
              t: [side, 0, 0],
            },
          ],
          { capStart: true, capEnd: true, flat: true, texel: 1 / 10 },
        ),
        "hull",
        { uv: "keep", lod, color: K.MID.getHex() },
      );
    add(
      new THREE.BoxGeometry(hw * 2 - 4, hubH * 2 - 6, 14).translate(
        0,
        hubC,
        S.hubZ1 - 5,
      ),
      "dark",
      {
        color: K.RUST,
        texel: 1 / 4,
        lod,
      },
    );
  }
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(
          0.6,
          hubH * 2 - 4,
          S.hubZ1 - S.hubZ0 - 14,
        ).translate(side * (hw + 0.1), hubC + 1, (S.hubZ0 + S.hubZ1) / 2 - 4),
        "dark",
        {
          color: K.MACH_DK,
          texel: 1 / 4,
          lod,
        },
      );
      slotWindow(add, {
        c: [side * (hw + 2.7), hubC + 1, (S.hubZ0 + S.hubZ1) / 2 - 4],
        n: [side, 0, 0],
        along: [0, 0, 1],
        len: 14,
        h: 1.8,
        lod,
        panes: 3,
        glow: K.WINDOW,
        rim: K.MACH_DK,
      });
    }

  // ---------------------------------------------------------------------------
  // thruster pods
  // ---------------------------------------------------------------------------
  const pod = (P, up) => {
    // up = +1: top pod (hood on top, cavity opens aft-down); -1: lower pod (hood below)
    const c = 0.62;
    const cap = 0.74;
    const yOut = P.cy + up * P.h;
    const yTip = P.cy + up * P.h * 0.35;
    const body = (lod) => {
      const secs = [
        { z: P.z0, pts: octagonAt(P.w * cap, P.h * cap, 0, P.cy, c) },
        { z: P.z0 + 8, pts: octagonAt(P.w, P.h, 0, P.cy, c) },
        { z: P.z1, pts: octagonAt(P.w, P.h, 0, P.cy, c) },
        {
          z: P.zMouth - 12,
          pts: octagonAt(P.w * 0.88, P.h * 0.8, 0, P.cy - up * P.h * 0.12, c),
        },
        {
          z: P.zMouth,
          pts: octagonAt(P.w * 0.72, P.h * 0.62, 0, P.cy - up * P.h * 0.2, c),
        },
      ];
      add(
        sectionLoft(secs, { capStart: true, capEnd: true, texel: 1 / 22 }),
        "hull",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) => {
            o.copy(K.LIGHT).multiplyScalar(0.74);
            if (up * (y - P.cy) < -P.h * 0.5) o.multiplyScalar(0.78); // inboard face in shadow
            if (Math.abs(x) > P.w * 0.9) o.multiplyScalar(0.94);
            const band = Math.floor((z - P.z0) / 30) % 3 === 1 ? 0.95 : 1;
            return o.multiplyScalar(band);
          },
        },
      );
      // hood: a wedge plate on the outboard face running past the mouth
      const hood = [
        {
          z: P.z1 - 6,
          pts:
            up > 0
              ? [
                  [P.w, yOut - 7],
                  [P.w, yOut + 0.4],
                  [-P.w, yOut + 0.4],
                  [-P.w, yOut - 7],
                ]
              : [
                  [P.w, yOut - 0.4],
                  [P.w, yOut + 7],
                  [-P.w, yOut + 7],
                  [-P.w, yOut - 0.4],
                ],
        },
        {
          z: P.zMouth,
          pts:
            up > 0
              ? [
                  [P.w * 0.8, yTip + 10],
                  [P.w * 0.8, yTip + 13],
                  [-P.w * 0.8, yTip + 13],
                  [-P.w * 0.8, yTip + 10],
                ]
              : [
                  [P.w * 0.8, yTip - 13],
                  [P.w * 0.8, yTip - 10],
                  [-P.w * 0.8, yTip - 10],
                  [-P.w * 0.8, yTip - 13],
                ],
        },
        {
          z: P.zHood,
          pts:
            up > 0
              ? [
                  [P.w * 0.55, yTip + 1.5],
                  [P.w * 0.55, yTip + 3],
                  [-P.w * 0.55, yTip + 3],
                  [-P.w * 0.55, yTip + 1.5],
                ]
              : [
                  [P.w * 0.55, yTip - 3],
                  [P.w * 0.55, yTip - 1.5],
                  [-P.w * 0.55, yTip - 1.5],
                  [-P.w * 0.55, yTip - 3],
                ],
        },
      ];
      add(
        sectionLoft(hood, { capStart: false, capEnd: true, texel: 1 / 12 }),
        "hull",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) =>
            o.copy(K.LIGHT).multiplyScalar(up * (y - P.cy) > 0 ? 0.74 : 0.55),
        },
      );
    };
    for (const lod of [0, 1, 2]) body(lod);
    // forward cap: light octagonal frame with a dark recessed face
    for (const lod of [0, 1]) {
      add(
        ringZ(
          octagonAt(P.w * cap + 0.6, P.h * cap + 0.6, 0, P.cy, c),
          octagonAt(P.w * cap * 0.6, P.h * cap * 0.6, 0, P.cy, c),
          P.z0 - 2.4,
          P.z0 + 0.2,
        ),
        "hull",
        { color: K.LIGHT.getHex(), texel: 1 / 4, lod },
      );
      add(
        sectionLoft(
          [
            {
              z: P.z0 - 1.8,
              pts: octagonAt(P.w * cap * 0.6, P.h * cap * 0.6, 0, P.cy, c),
            },
            {
              z: P.z0 + 1.2,
              pts: octagonAt(P.w * cap * 0.46, P.h * cap * 0.46, 0, P.cy, c),
            },
          ],
          { capStart: true, texel: 1 / 4 },
        ),
        "dark",
        { uv: "keep", lod, color: K.MACH_DK },
      );
    }
    // dorsal ridge (outboard face), flank rails, the long rust panel, recessed panels and slots
    const zc0 = (P.z0 + P.z1) / 2 + 6;
    for (const lod of [0, 1]) {
      add(
        new THREE.BoxGeometry(9, 3.2, P.z1 - P.z0 - 26).translate(
          0,
          yOut + up * 1.5,
          zc0,
        ),
        "hull",
        {
          color: K.LIGHT.getHex(),
          texel: 1 / 5,
          lod,
        },
      );
      add(
        new THREE.BoxGeometry(5, 2.4, 22).translate(
          0,
          yOut + up * 4.2,
          P.z0 + 40,
        ),
        "dark",
        { color: K.MACH, texel: 1 / 4, lod },
      );
      // small equipment boxes on the outboard face
      if (lod === 0)
        for (let i = 0; i < 14; i++) {
          const z = P.z0 + 16 + rand() * (P.z1 - P.z0 - 40);
          const x = (rand() - 0.5) * 2 * (P.w * 0.62 - 6);
          const h = 0.8 + rand() * 2;
          add(
            new THREE.BoxGeometry(
              1.5 + rand() * 3,
              h,
              2 + rand() * 6,
            ).translate(x + Math.sign(x) * 5, yOut + up * (0.2 + h / 2), z),
            "dark",
            { color: i % 3 ? K.MACH : K.MACH_DK, texel: 1 / 3, lod },
          );
        }
      for (const side of [-1, 1]) {
        // the long rust-red recessed panel with a light frame rail above and below
        add(
          quadAt(
            [side * (P.w + 0.3), P.cy + up * 3, zc0],
            [side, 0, 0],
            [0, 0, 1],
            P.z1 - P.z0 - 44,
            8.5,
            0,
          ),
          "dark",
          {
            color: K.RUST,
            texel: 1 / 4,
            lod,
          },
        );
        for (const dy of [up * 8.2, -up * 2.2])
          add(
            new THREE.BoxGeometry(1.8, 1.4, P.z1 - P.z0 - 40).translate(
              side * (P.w + 0.7),
              P.cy + dy,
              zc0,
            ),
            "hull",
            {
              color: K.FRAME,
              texel: 1 / 4,
              lod,
            },
          );
        for (let i = 0; i < 3; i++) {
          const zc = P.z0 + 36 + i * 46;
          add(
            quadAt(
              [side * (P.w + 0.25), P.cy - up * 11, zc],
              [side, 0, 0],
              [0, 0, 1],
              30,
              9,
              0,
            ),
            "dark",
            {
              color: i === 1 ? K.MACH : K.MACH_DK,
              texel: 1 / 4,
              lod,
            },
          );
          if (lod === 0)
            add(
              quadAt(
                [side * (P.w + 0.5), P.cy - up * 13.5, zc],
                [side, 0, 0],
                [0, 0, 1],
                14,
                1.2,
                0,
              ),
              "windows",
              {
                color: K.WINDOW,
                lod,
                uv: "keep",
              },
            );
        }
      }
      // exhaust vanes: dark fins on the taper flanks
      for (const side of [-1, 1])
        for (const dz of [-6, 3])
          add(
            bar(
              [side * (P.w * 0.86), P.cy - up * P.h * 0.05, P.z1 + 4 + dz],
              [side * (P.w * 0.74), P.cy - up * P.h * 0.25, P.zMouth - 4 + dz],
              1.2,
              5,
            ),
            "dark",
            {
              color: K.MACH_DK,
              texel: 1 / 3,
              lod,
            },
          );
    }
    // nozzle in the hooded cavity
    let entry;
    for (const lod of [0, 1, 2])
      entry = octNozzle(add, {
        x: 0,
        y: P.cy - up * P.h * 0.2,
        zMouth: P.zMouth,
        r: P.h * 0.5,
        depth: 30,
        protrude: 9,
        lod,
        shell: K.SHELL,
        shellDark: K.SHELL_DK,
      });
    engines.push(entry);
  };
  pod(S.topPod, 1);
  pod(S.lowPod, -1);

  // ---------------------------------------------------------------------------
  // central nacelle (third thruster), the boom base block and the two needle booms
  // ---------------------------------------------------------------------------
  const N = S.nacelle;
  for (const lod of [0, 1, 2]) {
    add(
      sectionLoft(
        [
          { z: N.z0 - 2, pts: octagonAt(N.w, N.h, 0, N.cy, 0.6) },
          { z: N.zMouth - 30, pts: octagonAt(N.w, N.h, 0, N.cy, 0.6) },
          {
            z: N.zMouth - 8,
            pts: octagonAt(N.w * 0.85, N.h * 0.85, 0, N.cy, 0.6),
          },
        ],
        { capEnd: true, texel: 1 / 8 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(K.MID).multiplyScalar(y > N.cy ? 1.02 : 0.82),
      },
    );
    engines.push(
      octNozzle(add, {
        x: 0,
        y: N.cy,
        zMouth: N.zMouth,
        r: N.h * 0.6,
        depth: 22,
        protrude: 8,
        lod,
        shell: K.SHELL,
        shellDark: K.SHELL_DK,
      }),
    );
    // boom base: light wedge behind the hub top
    add(
      sectionLoft(
        [
          { z: S.hubZ1 - 4, pts: octagonAt(9, 6, 0, S.hub.y1 - 7, 0.6) },
          { z: S.hubZ1 + 30, pts: octagonAt(8, 5, 0, S.hub.y1 - 7, 0.6) },
          { z: S.hubZ1 + 52, pts: octagonAt(4, 2.5, 0, S.hub.y1 - 8, 0.6) },
        ],
        { capEnd: true, texel: 1 / 6 },
      ),
      "hull",
      { uv: "keep", lod, color: K.LIGHT.getHex() },
    );
  }
  for (const lod of [0, 1])
    for (const x of [-3, 3])
      add(
        bar(
          [x, S.hub.y1 - 6, S.hubZ1 + 40],
          [x * 2.3, S.hub.y1 - 16, 593.5],
          lod === 0 ? 1.0 : 1.8,
          lod === 0 ? 1.0 : 1.8,
        ),
        "dark",
        {
          color: K.MACH,
          texel: 1 / 3,
          lod,
        },
      );
  // engine entries are shared by LOD loops; keep one per thruster
  const seen = new Set();
  return engines.filter((e) => {
    const k = e.pos.join(",");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
