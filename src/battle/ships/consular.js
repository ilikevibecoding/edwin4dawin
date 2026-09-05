// Consular-class cruiser, Charger c70 retrofit (Republic frigate): 139 m long, 87 m across the engine
// pods, 31 m from the pod bellies to the comm dish. Original procedural geometry measured off the
// three-view of the Clone Wars design: a low bow (the 12.4 m salon pod slung under a 4.4 m wide cockpit
// tube whose top rides 11 m up and slopes down into the deck spine), a wide flat main block (30 m across
// with a chamfered bow, deck 4 m over the pod centreline, sloped shoulders and bilges, a long taper into
// a 9 m neck), a keel under the neck with the deflector spheres, an octagonal aft deck (22 m) carrying a
// two-tier bridge tower, the big comm dish (9.5 m, facing up and aft) on its mast, sensor balls and
// antenna rods, a domed command pod on a pedestal behind the tower, and the delta radiator wing (45 deg
// leading edge, on the pod centreline) tying in three 19.5 m engine cylinders in a row (centre one a
// shade higher) with a machinery plate between them aft of the wing. Livery: Republic diplomatic red
// plating with cream trim (nose caps, bow facets, bands, spine strip, wing leading edge and stripes,
// nozzle rims), soot at the mouths, blue-grey ion bands, red comm dish.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  col,
  discAt,
  loftZ,
  mix,
  mpart,
  quadAt,
  rng,
  roundedRect,
  smoothstep,
  superellipse,
} from "./munificentGeo.js";
import { dishMast, hatch, lippedPlate } from "./munificentDetail.js";
import { enginePod, podConnector } from "./consularEngines.js";
import { laserTurret } from "./consularTurrets.js";

export const CONSULAR = { length: 139, width: 87, height: 31 };

// palette: vertex tints over the shared plating (albedo ~0.62 before tint) / machinery textures, and
// flat paint colours. Red calibrated so sunlit plating lands near sRGB (175, 60, 45): the diplomatic
// red of the Radiant VII, a clear step from the Venator's cream-white at every distance.
const RED = col(0xc4472f);
const RED_LT = RED.clone().multiplyScalar(1.1);
const RED_DK = RED.clone().multiplyScalar(0.8);
const RED_FADE = col(0xcf6a52); // paint fade toward the wing tips
const CREAM = col(0xe6dfcf); // plated cream (hull material)
const CREAM_P = col(0xc9c1b1); // painted cream trim (flat paint material)
const BAND = col(0x8592a3); // blue-grey ion generator band
const SOOT = col(0x2a2624);
const DARK = 0x4c4844;
const DARK_DEEP = 0x2f2c29;
const WINDOW = 0xffe6c4;
const WINDOW_COOL = 0xc4e2ff;
const EMBLEM_RED = 0x8a1f18;
const GOLD = 0xd9a441;

// key levels (m, y up, origin on the outer pods' centreline)
const DECK = 4.15; // main block deck at the shoulders
const BELLY = -5.7; // main block belly
const SPINE_TOP = 7.25; // deck spine over the main block
const TUBW = 2.2; // half width of the cockpit tube and the spine
const TUB_BOT = 6.3;
const TUB_TOP = 11.0;
const PODY = 0.4; // salon pod centre
const PODR = 6.2;
const OCT_BOT = 0.45; // aft deck (octagon) bottom / wing top
const OCT_TOP = 3.65;
const KEEL_BOT = -5.0;
const WING_TOP = 0.45;
const WING_BOT = -1.05;

const _a = new THREE.Vector3();
const _n = new THREE.Vector3();

// chamfered hull section in unit half-sizes, CCW from the starboard flank: vertical flanks, sloped
// shoulders up to the flat deck, sloped bilges down to the flat belly
const HULL_PROFILE = [
  [1, -0.45],
  [1, 0.665],
  [0.69, 1],
  [-0.69, 1],
  [-1, 0.665],
  [-1, -0.45],
  [-0.79, -1],
  [0.79, -1],
];
// open strip over the deck and shoulders of the same section (the cream bow facets)
const DECK_STRIP = [
  [1, 0.665],
  [0.69, 1],
  [-0.69, 1],
  [-1, 0.665],
];

/** Row of lit panes over a dark backing strip; LOD 1 keeps a single strip, LOD 2 nothing. */
function winStrip(
  add,
  { c, n, along, total, h = 0.7, panes = 4, lod = 0, glow = WINDOW },
) {
  if (lod > 1) return;
  add(quadAt(c, n, along, total + 0.6, h + 0.5, 0.04), "dark", {
    color: DARK_DEEP,
    texel: 1 / 3,
    lod,
  });
  if (lod === 1 || panes <= 1) {
    add(quadAt(c, n, along, total, h, 0.09), "windows", {
      color: glow,
      lod,
      uv: "keep",
    });
    return;
  }
  _n.set(...n).normalize();
  _a.set(...along);
  _a.addScaledVector(_n, -_a.dot(_n)).normalize();
  const gap = 0.45;
  const pl = (total - gap * (panes - 1)) / panes;
  for (let i = 0; i < panes; i++) {
    const da = -total / 2 + pl / 2 + i * (pl + gap);
    const ci = [c[0] + _a.x * da, c[1] + _a.y * da, c[2] + _a.z * da];
    add(quadAt(ci, n, along, pl, h, 0.09), "windows", {
      color: glow,
      lod,
      uv: "keep",
    });
  }
}

export function buildConsular(mats) {
  const L = CONSULAR.length;
  const Z = (zn) => zn - L / 2; // nose-relative metres -> ship z (forward is -z)
  // loft station from nose-relative z, half-width, bottom and top
  const sec = (zn, hw, yb, yt, k = 1, lift = 0) => ({
    z: Z(zn),
    sx: hw * k,
    sy: ((yt - yb) / 2) * k,
    y: (yt + yb) / 2 + lift,
  });
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(4471);
  const TEX = 1 / 9; // plating scale: 9 m tile, plates 1-3 m
  const pal = {
    hull: RED,
    hullDark: RED_DK,
    hullLight: RED_LT,
    trim: CREAM,
    trimP: CREAM_P,
    band: BAND,
    soot: SOOT,
    dark: DARK,
    darkDeep: DARK_DEEP,
  };
  const belly = (base) => (x, y, z, o) =>
    mix(base, RED_DK, smoothstep(-2.0, -5.5, y), o);

  // ---------------------------------------------------------------------------
  // bow: salon pod (12.4 m round, domed nose, clamp collar and a narrower cowling into the hull) with
  // the 4.4 m cockpit tube riding on top, its roof sloping down aft into the deck spine
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    const prof = superellipse(lod === 0 ? 22 : lod === 1 ? 12 : 8, 2);
    const st =
      lod === 2
        ? [
            [0.8, 1.5],
            [2.6, 4.8],
            [5.5, PODR],
            [17.5, PODR],
            [17.6, 5.6],
            [27.5, 5.6],
          ]
        : [
            [0.8, 1.5],
            [1.5, 3.2],
            [2.6, 4.8],
            [4.0, 5.85],
            [5.5, PODR],
            [17.5, PODR],
            [17.6, 5.6],
            [27.5, 5.6],
          ];
    add(
      loftZ(
        prof,
        st.map(([zn, r]) => ({ z: Z(zn), sx: r, sy: r, y: PODY })),
        { capStart: true, capEnd: true, texel: TEX },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          z < Z(3.4) ? o.copy(CREAM) : belly(RED)(x, y, z, o),
      },
    );
    // cockpit tube: rounded-square section, domed front, roof sloping into the spine aft of zn 22
    const tp = roundedRect(lod === 0 ? 3 : lod === 1 ? 2 : 1, 0.55, 0.55);
    const yc = (TUB_BOT + TUB_TOP) / 2;
    const hh = (TUB_TOP - TUB_BOT) / 2;
    const roof = (top) => ({ sy: (top - TUB_BOT) / 2, y: (top + TUB_BOT) / 2 });
    const ts =
      lod === 2
        ? [
            { z: Z(0), sx: 0.9, sy: 0.9, y: yc },
            { z: Z(2.2), sx: 2.05, sy: 2.2, y: yc },
            { z: Z(4), sx: TUBW, sy: hh, y: yc },
            { z: Z(22), sx: TUBW, sy: hh, y: yc },
            { z: Z(40), sx: TUBW, ...roof(9.45) },
            { z: Z(47), sx: TUBW, ...roof(7.3) },
          ]
        : [
            { z: Z(0), sx: 0.9, sy: 0.9, y: yc },
            { z: Z(0.9), sx: 1.6, sy: 1.65, y: yc },
            { z: Z(2.2), sx: 2.05, sy: 2.2, y: yc },
            { z: Z(4), sx: TUBW, sy: hh, y: yc },
            { z: Z(22), sx: TUBW, sy: hh, y: yc },
            { z: Z(40), sx: TUBW, ...roof(9.45) },
            { z: Z(45), sx: TUBW, ...roof(7.6) },
            { z: Z(47), sx: TUBW, ...roof(7.3) },
          ];
    add(loftZ(tp, ts, { capStart: true, capEnd: true, texel: TEX }), "hull", {
      uv: "keep",
      lod,
      tint: (x, y, z, o) => (z < Z(3.4) ? o.copy(CREAM) : o.copy(RED)),
    });
    // deck spine: from inside the pod collar back to the bridge tower, and the rising neck roof
    add(
      new THREE.BoxGeometry(2 * TUBW, SPINE_TOP - DECK, 65.5).translate(
        0,
        (SPINE_TOP + DECK) / 2,
        Z(51.75),
      ),
      "hull",
      { color: RED_LT, texel: TEX, lod },
    );
    add(
      new THREE.BoxGeometry(3.4, 1.0, 16).translate(0, 7.7, Z(76.5)),
      "hull",
      { color: RED_LT, texel: TEX, lod },
    );
    if (lod < 2)
      add(
        new THREE.BoxGeometry(3.0, 0.22, 37).translate(
          0,
          SPINE_TOP + 0.08,
          Z(65.5),
        ),
        "paint",
        { color: CREAM_P, lod, texel: 1 / 6 },
      );
  }
  for (const lod of [0, 1]) {
    // cream bands round both tubes behind the domes, and the pod's clamp collar
    const prof = superellipse(lod === 0 ? 22 : 12, 2);
    add(
      loftZ(
        prof,
        [
          { z: Z(4.5), sx: PODR + 0.12, sy: PODR + 0.12, y: PODY },
          { z: Z(6.5), sx: PODR + 0.12, sy: PODR + 0.12, y: PODY },
        ],
        { capStart: true, capEnd: true, texel: 1 / 6 },
      ),
      "paint",
      { color: CREAM_P, lod, uv: "keep" },
    );
    add(
      loftZ(
        prof,
        [
          { z: Z(17.5), sx: 6.7, sy: 6.7, y: PODY },
          { z: Z(20), sx: 6.7, sy: 6.7, y: PODY },
        ],
        { capStart: true, capEnd: true, texel: 1 / 6 },
      ),
      "paint",
      { color: CREAM_P, lod, uv: "keep" },
    );
    add(
      loftZ(
        roundedRect(lod === 0 ? 3 : 2, 0.55, 0.55),
        [
          { z: Z(4.5), sx: TUBW + 0.12, sy: 2.47, y: 8.65 },
          { z: Z(6.5), sx: TUBW + 0.12, sy: 2.47, y: 8.65 },
        ],
        { capStart: true, capEnd: true, texel: 1 / 6 },
      ),
      "paint",
      { color: CREAM_P, lod, uv: "keep" },
    );
    // cockpit windows on the dome front and the tube flanks
    winStrip(add, {
      c: [0, 9.8, Z(2.3)],
      n: [0, 0.5, -0.87],
      along: [1, 0, 0],
      total: 2.6,
      h: 0.5,
      panes: 3,
      lod,
      glow: WINDOW_COOL,
    });
    for (const s of [-1, 1])
      winStrip(add, {
        c: [s * (TUBW + 0.02), 9.4, Z(7.5)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 4.5,
        h: 0.55,
        panes: 3,
        lod,
        glow: WINDOW_COOL,
      });
    // salon pod lounge windows (a row each side, upper flank), docking ring under the collar
    for (const s of [-1, 1])
      winStrip(add, {
        c: [s * 0.89 * (PODR + 0.02), PODY + 0.45 * (PODR + 0.02), Z(12)],
        n: [s * 0.89, 0.45, 0],
        along: [0, 0, 1],
        total: 9,
        h: 0.65,
        panes: 4,
        lod,
      });
    const ring = new THREE.CylinderGeometry(
      2.7,
      2.7,
      1.6,
      lod === 0 ? 16 : 10,
      1,
      true,
    );
    ring.translate(0, PODY - 6.7 - 0.3, Z(18.75));
    add(ring, "dark", { color: DARK, texel: 1 / 3, lod });
    add(
      discAt(
        [0, PODY - 6.7 - 1.1, Z(18.75)],
        [0, -1, 0],
        2.3,
        lod === 0 ? 16 : 10,
        0,
      ),
      "paint",
      { color: CREAM_P, lod, texel: 1 / 6 },
    );
    // navigation sensor spike off the cockpit roof
    add(bar([0, 12.3, Z(9)], [0, 13.0, Z(-0.5)], 0.35, 0.35), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod,
    });
    add(new THREE.BoxGeometry(1.2, 1.6, 2.4).translate(0, 11.7, Z(8)), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod,
    });
  }
  {
    // seam rings on the salon pod, hatches, docking clamps (LOD 0)
    for (const zn of [9, 14.5])
      add(
        loftZ(
          superellipse(22, 2),
          [
            { z: Z(zn) - 0.2, sx: PODR + 0.06, sy: PODR + 0.06, y: PODY },
            { z: Z(zn) + 0.2, sx: PODR + 0.06, sy: PODR + 0.06, y: PODY },
          ],
          { texel: 1 / 4 },
        ),
        "dark",
        { color: DARK_DEEP, lod: 0, uv: "keep" },
      );
    for (const s of [-1, 1]) {
      hatch(add, {
        c: [s * PODR * 0.5, PODY - PODR * 0.87, Z(10)],
        n: [s * 0.5, -0.87, 0],
        along: [0, 0, 1],
        w: 2.2,
        h: 3,
        lod: 0,
        color: RED_LT,
        rimColor: DARK_DEEP,
      });
      hatch(add, {
        c: [s * (TUBW + 0.02), 8.4, Z(15)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        w: 2.6,
        h: 1.6,
        lod: 0,
        color: RED_LT,
        rimColor: DARK_DEEP,
      });
      add(
        new THREE.BoxGeometry(1.0, 0.7, 1.2).translate(
          s * 2.9,
          PODY - 6.7 - 0.2,
          Z(18.75),
        ),
        "dark",
        { color: DARK_DEEP, texel: 1 / 3, lod: 0 },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // hull: one chamfered loft from the cowling through the bow chamfer, the main block and the long
  // taper into the neck; cream facets over the bow; keel under the neck; aft deck octagon and keel
  // ---------------------------------------------------------------------------
  const HULL = [
    sec(28, 5.6, -5.2, 6.0),
    sec(38, 15.2, BELLY, DECK),
    sec(63, 15.2, BELLY, DECK),
    sec(77, 4.7, 2.15, 7.15),
    sec(84.5, 4.7, 2.15, 7.15),
  ];
  for (const lod of [0, 1, 2]) {
    add(
      loftZ(HULL_PROFILE, HULL, { capStart: true, capEnd: true, flat: true }),
      "hull",
      { texel: TEX, lod, tint: belly(RED) },
    );
    // bow facets: cream strip over the deck and shoulders of the chamfer
    add(
      loftZ(
        DECK_STRIP,
        [
          sec(28, 5.6, -5.2, 6.0, 1.012, 0.05),
          sec(38.3, 15.2, BELLY, DECK, 1.012, 0.05),
        ],
        { closed: false, flat: true, texel: TEX },
      ),
      "hull",
      { uv: "keep", lod, color: CREAM },
    );
    // cream shoulders continue the facets along the deck edge and down the taper to the neck
    for (const s of [-1, 1])
      add(
        loftZ(
          s > 0
            ? [
                [1, 0.665],
                [0.69, 1],
              ]
            : [
                [-0.69, 1],
                [-1, 0.665],
              ],
          [
            sec(38.3, 15.2, BELLY, DECK, 1.012, 0.05),
            sec(63, 15.2, BELLY, DECK, 1.012, 0.05),
            sec(77, 4.7, 2.15, 7.15, 1.012, 0.05),
          ],
          { closed: false, flat: true, texel: TEX },
        ),
        "hull",
        { uv: "keep", lod, color: CREAM },
      );
    // keel under the neck (deflector spheres hang off it), aft keel with its chamfered nose
    add(new THREE.BoxGeometry(6, 7.7, 16).translate(0, -1.35, Z(74)), "hull", {
      color: RED_DK,
      texel: TEX,
      lod,
    });
    add(
      loftZ(
        roundedRect(1, 0.15, 0.15),
        [
          sec(80, 4.5, -4.2, OCT_BOT),
          sec(84, 6, KEEL_BOT, OCT_BOT),
          sec(112, 6, KEEL_BOT, OCT_BOT),
        ],
        { capStart: true, capEnd: true, flat: true },
      ),
      "hull",
      { texel: TEX, lod, color: RED_DK },
    );
    // aft deck: octagon in plan, stern spine running into the centre engine cone
    add(
      loftZ(
        roundedRect(1, 0.12, 0.12),
        [
          sec(84, 5.0, OCT_BOT, OCT_TOP),
          sec(87.5, 11, OCT_BOT, OCT_TOP),
          sec(100, 11, OCT_BOT, OCT_TOP),
          sec(104, 6.0, OCT_BOT, OCT_TOP),
        ],
        { capStart: true, capEnd: true, flat: true },
      ),
      "hull",
      { texel: TEX, lod, color: RED },
    );
    add(
      new THREE.BoxGeometry(5, OCT_TOP - OCT_BOT, 9).translate(
        0,
        (OCT_TOP + OCT_BOT) / 2,
        Z(107.5),
      ),
      "hull",
      { color: RED_DK, texel: TEX, lod },
    );
  }
  for (const lod of [0, 1]) {
    // emblem pair on the deck: cream disc, red ring, gold centre
    for (const s of [-1, 1]) {
      const c = [s * 8, DECK, Z(45.5)];
      const seg = lod === 0 ? 18 : 10;
      add(discAt(c, [0, 1, 0], 2.2, seg, 0.06), "paint", {
        color: CREAM_P,
        lod,
        texel: 1 / 6,
      });
      add(discAt(c, [0, 1, 0], 1.7, seg, 0.1), "paint", {
        color: EMBLEM_RED,
        lod,
        texel: 1 / 6,
      });
      add(discAt(c, [0, 1, 0], 1.1, seg, 0.14), "paint", {
        color: GOLD,
        lod,
        texel: 1 / 6,
      });
    }
    // window rows: main block flanks (two decks), neck, aft deck flanks
    for (const s of [-1, 1]) {
      winStrip(add, {
        c: [s * 15.2, 1.3, Z(50)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 16,
        h: 0.65,
        panes: 6,
        lod,
      });
      winStrip(add, {
        c: [s * 15.2, -1.6, Z(52)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 10,
        h: 0.6,
        panes: 4,
        lod,
      });
      winStrip(add, {
        c: [s * 4.7, 5.0, Z(80.5)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 5,
        h: 0.6,
        panes: 3,
        lod,
      });
      winStrip(add, {
        c: [s * 11, 2.05, Z(94)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 7,
        h: 0.65,
        panes: 3,
        lod,
      });
    }
    // deflector spheres under the neck
    for (const s of [-1, 1]) {
      const g = new THREE.SphereGeometry(
        2.4,
        lod === 0 ? 14 : 8,
        lod === 0 ? 10 : 6,
      );
      g.translate(s * 2.4, 0.3, Z(77));
      add(g, "hull", { color: RED_LT, texel: 1 / 5, lod });
    }
    // belly escape pods (four short cylinders) and the big ventral hatch
    for (const s of [-1, 1])
      for (const zn of [44, 51]) {
        const g = new THREE.CylinderGeometry(2.0, 1.9, 1.2, lod === 0 ? 14 : 8);
        g.translate(s * 9.5, BELLY - 0.4, Z(zn));
        add(g, "hull", { color: RED_DK, texel: 1 / 4, lod });
        add(
          discAt(
            [s * 9.5, BELLY - 1.02, Z(zn)],
            [0, -1, 0],
            1.5,
            lod === 0 ? 14 : 8,
            0,
          ),
          "paint",
          { color: CREAM_P, lod, texel: 1 / 6 },
        );
      }
    hatch(add, {
      c: [0, BELLY, Z(60)],
      n: [0, -1, 0],
      along: [0, 0, 1],
      w: 5,
      h: 9,
      lod,
      color: RED_DK,
      rimColor: DARK_DEEP,
      big: true,
    });
    // turret pads (dorsal and ventral pairs on the main block)
    for (const s of [-1, 1])
      for (const up of [1, -1]) {
        const y = up > 0 ? DECK : BELLY;
        const pad = new THREE.CylinderGeometry(
          2.8,
          3.05,
          0.3,
          lod === 0 ? 16 : 10,
        );
        pad.translate(s * 8, y + up * 0.15, Z(58.5));
        add(pad, "hull", { color: RED_DK, texel: 1 / 4, lod });
      }
  }
  {
    // raised plates, hatches and vents on the deck, flanks and belly (LOD 0)
    const tone = () => RED.clone().multiplyScalar(0.94 + rand() * 0.12);
    for (const s of [-1, 1]) {
      lippedPlate(add, {
        c: [s * 5.6, DECK, Z(43.5)],
        n: [0, 1, 0],
        along: [0, 0, 1],
        len: 5,
        wid: 3.2,
        lod: 0,
        color: tone(),
        lipColor: DARK,
      });
      lippedPlate(add, {
        c: [s * 5.6, DECK, Z(64)],
        n: [0, 1, 0],
        along: [0, 0, 1],
        len: 7,
        wid: 3.2,
        lod: 0,
        color: tone(),
        lipColor: DARK,
      });
      lippedPlate(add, {
        c: [s * 8.2, DECK, Z(51.5)],
        n: [0, 1, 0],
        along: [0, 0, 1],
        len: 6,
        wid: 3.4,
        lod: 0,
        color: tone(),
        lipColor: DARK,
      });
      hatch(add, {
        c: [s * 6.2, BELLY, Z(40)],
        n: [0, -1, 0],
        along: [0, 0, 1],
        w: 2.4,
        h: 3.2,
        lod: 0,
        color: tone(),
        rimColor: DARK_DEEP,
      });
      hatch(add, {
        c: [s * 8.5, OCT_TOP, Z(93)],
        n: [0, 1, 0],
        along: [0, 0, 1],
        w: 2.4,
        h: 3.0,
        lod: 0,
        color: tone(),
        rimColor: DARK_DEEP,
      });
      add(
        quadAt([s * 15.2, -0.4, Z(44)], [s, 0, 0], [0, 0, 1], 4, 1.2, 0.08),
        "dark",
        { color: DARK_DEEP, texel: 1 / 3, lod: 0 },
      );
      add(
        quadAt([s * 15.2, -0.4, Z(61)], [s, 0, 0], [0, 0, 1], 3, 1.2, 0.08),
        "dark",
        { color: DARK_DEEP, texel: 1 / 3, lod: 0 },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // tracking turrets: dorsal and ventral pairs on the main block
  // ---------------------------------------------------------------------------
  const laser = laserTurret(
    2.2,
    RED.clone().multiplyScalar(0.96),
    CREAM,
    col(DARK),
    { rate: 1.1, yawLimit: 2.7 },
  );
  for (const s of [-1, 1])
    for (const up of [1, -1]) {
      const y = up > 0 ? DECK + 0.3 : BELLY - 0.3;
      const k = turrets.length;
      turrets.push({
        type: "laser",
        pos: [s * 8, y, Z(58.5)],
        up: [0, up, 0],
        forward: [0, 0, -1],
      });
      hardpoints.push({
        pos: [s * 8, y + up * 3.5, Z(52.5)],
        dir: [s * 0.45, up * 0.35, -0.82],
        kind: "light",
        range: 6500,
        turret: k,
      });
    }

  // ---------------------------------------------------------------------------
  // radiator wing: flat delta on the pod centreline with a 45 degree leading edge from the neck
  // keel out to the pods, cream leading-edge trim and stripes, struts underneath
  // ---------------------------------------------------------------------------
  const WX0 = 8.5;
  const WZ0 = 82;
  const WX1 = 38.5;
  const WZ1 = 113.5;
  const WZT = 117; // trailing edge
  const PX = 33.5; // outer pod centres
  const leZ = (x) => WZ0 + ((Math.abs(x) - WX0) * (WZ1 - WZ0)) / (WX1 - WX0);
  // where a fore-aft stripe at x disappears into the pod (its cone starts at zn 110)
  const stripeEnd = (x) => {
    const d = Math.abs(Math.abs(x) - PX);
    if (d > 9.75) return WZT;
    return Math.min(WZT, 110 + Math.max(0, ((d - 6) / 3.75) * 4.5));
  };
  for (const lod of [0, 1, 2]) {
    const shape = new THREE.Shape();
    const pts = [
      [-WX1, WZT],
      [-WX1, WZ1],
      [-WX0, WZ0],
      [WX0, WZ0],
      [WX1, WZ1],
      [WX1, WZT],
    ];
    pts.forEach(([x, zn], i) =>
      i === 0 ? shape.moveTo(x, -Z(zn)) : shape.lineTo(x, -Z(zn)),
    );
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: WING_TOP - WING_BOT,
      bevelEnabled: false,
    });
    g.rotateX(-Math.PI / 2); // shape y -> -z, depth -> +y
    g.translate(0, WING_BOT, 0);
    add(g, "hull", {
      texel: TEX,
      lod,
      tint: (x, y, z, o) => {
        mix(RED, RED_FADE, 0.6 * smoothstep(14, 36, Math.abs(x)), o);
        if (y < 0) o.multiplyScalar(0.9);
      },
    });
  }
  for (const lod of [0, 1]) {
    for (const s of [-1, 1]) {
      // stripes running fore-aft on the top face from just behind the leading edge to the trailing edge
      const xs = lod === 0 ? [11, 15, 19, 23, 27, 31] : [13, 19, 25];
      for (const x of xs) {
        const z0 = leZ(x) + 3;
        const z1 = stripeEnd(x);
        if (z1 - z0 < 1.5) continue;
        add(
          quadAt(
            [s * x, WING_TOP, Z((z0 + z1) / 2)],
            [0, 1, 0],
            [0, 0, 1],
            z1 - z0,
            lod === 0 ? 1.8 : 2.8,
            0.07,
          ),
          "paint",
          { color: CREAM_P, lod, texel: 1 / 6 },
        );
      }
      if (lod === 0)
        for (const x of [13, 21, 29]) {
          const z0 = leZ(x) + 3;
          const z1 = stripeEnd(x);
          if (z1 - z0 < 1.5) continue;
          add(
            quadAt(
              [s * x, WING_BOT, Z((z0 + z1) / 2)],
              [0, -1, 0],
              [0, 0, 1],
              z1 - z0,
              2.4,
              0.07,
            ),
            "paint",
            { color: CREAM_P, lod, texel: 1 / 6 },
          );
        }
      // leading-edge trim, both faces, set a little inboard of the edge
      const dx = WX1 - WX0;
      const dz = WZ1 - WZ0;
      const len = Math.hypot(dx, dz);
      const nx = (-s * dz) / len;
      const nz = dx / len;
      const cx = (s * (WX0 + WX1)) / 2 + nx * 1.1;
      const cz = Z((WZ0 + WZ1) / 2) + nz * 1.1;
      for (const up of [1, -1])
        add(
          quadAt(
            [cx, up > 0 ? WING_TOP : WING_BOT, cz],
            [0, up, 0],
            [s * dx, 0, dz],
            len - 2,
            2.0,
            0.07,
          ),
          "paint",
          { color: CREAM_P, lod, texel: 1 / 6 },
        );
      // struts from the aft keel out to the pod undersides
      add(
        bar([s * 5.5, KEEL_BOT + 0.5, Z(92)], [s * 30, -8.5, Z(117)], 1.0, 1.0),
        "dark",
        { color: DARK, texel: 1 / 3, lod },
      );
      add(
        bar(
          [s * 5.5, KEEL_BOT + 0.5, Z(104)],
          [s * 33, -9.0, Z(115)],
          0.8,
          0.8,
        ),
        "dark",
        { color: DARK, texel: 1 / 3, lod },
      );
    }
  }
  for (const s of [-1, 1])
    hatch(add, {
      c: [s * 21, WING_TOP, Z(113.5)],
      n: [0, 1, 0],
      along: [0, 0, 1],
      w: 2.2,
      h: 2.2,
      lod: 0,
      color: RED_FADE,
      rimColor: DARK_DEEP,
    });

  // ---------------------------------------------------------------------------
  // dorsal superstructure on the aft deck: two-tier bridge tower with slanted faces, the comm dish on
  // its mast facing up and aft, sensor balls, horn dish, antenna rods, and the domed command pod on a
  // pedestal with its cream ring and stern antenna rods
  // ---------------------------------------------------------------------------
  const TOWER_TOP = 10.15;
  const POD_Z = 106.5;
  for (const lod of [0, 1, 2]) {
    const rr = roundedRect(1, 0.12, 0.12);
    add(
      loftZ(
        rr,
        [
          sec(84.5, 5.5, OCT_TOP, 4.85),
          sec(86.5, 6, OCT_TOP, 7.15),
          sec(101, 6, OCT_TOP, 7.15),
        ],
        { capStart: true, capEnd: true, flat: true },
      ),
      "hull",
      { color: RED, texel: TEX, lod },
    );
    add(
      loftZ(
        rr,
        [
          sec(87.5, 4.2, 7.15, 8.15),
          sec(89.5, 4.5, 7.15, TOWER_TOP),
          sec(97.5, 4.5, 7.15, TOWER_TOP),
        ],
        { capStart: true, capEnd: true, flat: true },
      ),
      "hull",
      { color: RED_LT, texel: TEX, lod },
    );
    // comm dish: red, 9.5 m, facing up and aft on a mast off the tower roof
    if (lod < 2)
      dishMast(add, {
        base: [0, TOWER_TOP, Z(91.5)],
        up: [0, 1, 0.08],
        height: 6.2,
        aim: [0, 0.5, 0.866],
        r: 4.75,
        lod,
        mast: DARK,
        dish: RED_LT,
        braceSpan: 0.3,
      });
    else {
      add(bar([0, TOWER_TOP, Z(91.5)], [0, 16.4, Z(92)], 1.2, 1.2), "dark", {
        color: DARK,
        texel: 1 / 3,
        lod,
      });
      add(discAt([0, 16.9, Z(92.9)], [0, 0.5, 0.866], 4.6, 8, 0), "hull", {
        color: RED_LT,
        texel: 1 / 4,
        lod,
      });
    }
    // command pod: pedestal, cream ring, body, domed cap
    const seg = lod === 0 ? 18 : lod === 1 ? 10 : 8;
    if (lod === 2) {
      const cyl = new THREE.CylinderGeometry(3.0, 3.0, 9.4, seg);
      cyl.translate(0, OCT_TOP + 4.7, Z(POD_Z));
      add(cyl, "hull", { color: RED, texel: 1 / 5, lod });
      continue;
    }
    const ped = new THREE.CylinderGeometry(2.4, 2.6, 2.95, seg, 1, true);
    ped.translate(0, OCT_TOP + 1.475, Z(POD_Z));
    add(ped, "hull", { color: RED_DK, texel: 1 / 5, lod });
    const ring = new THREE.CylinderGeometry(4.25, 4.25, 1.0, seg);
    ring.translate(0, 7.1, Z(POD_Z));
    add(ring, "paint", { color: CREAM_P, lod, texel: 1 / 6 });
    const body = new THREE.CylinderGeometry(3.0, 3.0, 5.0, seg, 1, true);
    body.translate(0, 10.1, Z(POD_Z));
    add(body, "hull", { color: RED, texel: 1 / 5, lod });
    const dome = new THREE.SphereGeometry(
      3.0,
      seg,
      lod === 0 ? 6 : 4,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    dome.scale(1, 0.36, 1);
    dome.translate(0, 12.6, Z(POD_Z));
    add(dome, "hull", { color: RED_LT, texel: 1 / 5, lod });
    const band = new THREE.CylinderGeometry(3.06, 3.06, 0.6, seg, 1, true);
    band.translate(0, 11.7, Z(POD_Z));
    add(band, "windows", { color: WINDOW_COOL, lod, uv: "keep" });
    // bridge windows: slanted face of the upper tier and its flanks
    winStrip(add, {
      c: [0, 8.9, Z(88.2)],
      n: [0, 0.46, -0.89],
      along: [1, 0, 0],
      total: 6.5,
      h: 0.65,
      panes: 5,
      lod,
      glow: WINDOW_COOL,
    });
    for (const s of [-1, 1])
      winStrip(add, {
        c: [s * 4.5, 9.0, Z(93)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 5.5,
        h: 0.6,
        panes: 4,
        lod,
      });
    // sensor balls on the tower's aft roof, antenna rods aft from the command pod
    for (const s of [-1, 1]) {
      const b = new THREE.SphereGeometry(
        1.75,
        lod === 0 ? 14 : 8,
        lod === 0 ? 10 : 6,
      );
      b.translate(s * 2.5, 11.6, Z(98.8));
      add(b, "hull", { color: RED_LT, texel: 1 / 4, lod });
      add(
        bar([s * 1.1, 12.3, Z(108.5)], [s * 1.1, 13.2, Z(118.5)], 0.4, 0.4),
        "dark",
        { color: DARK, texel: 1 / 3, lod },
      );
    }
    // tallest antenna rod
    add(
      bar([0.7, TOWER_TOP, Z(92.5)], [0.9, 21.3, Z(92.3)], 0.3, 0.3),
      "dark",
      {
        color: DARK,
        texel: 1 / 3,
        lod,
      },
    );
  }
  {
    // LOD 0 extras: horn dish, more rods (one hooked), roof tanks, deck machinery, pod dish, windows
    dishMast(add, {
      base: [-3.0, TOWER_TOP, Z(96.5)],
      up: [-0.35, 1, 0.1],
      height: 2.4,
      aim: [-0.25, 0.55, -0.8],
      r: 2.0,
      lod: 0,
      mast: DARK,
      dish: RED_LT,
      braceSpan: 0.3,
    });
    add(
      bar([-1.6, TOWER_TOP, Z(91)], [-1.6, 19.2, Z(90.5)], 0.3, 0.3),
      "dark",
      {
        color: DARK,
        texel: 1 / 3,
        lod: 0,
      },
    );
    add(bar([1.9, TOWER_TOP, Z(90)], [1.9, 17.5, Z(89.8)], 0.3, 0.3), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod: 0,
    });
    add(bar([0.9, 21.3, Z(92.3)], [0.9, 21.0, Z(90.6)], 0.3, 0.3), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod: 0,
    });
    for (const s of [-1, 1]) {
      const t = new THREE.CylinderGeometry(0.9, 0.9, 3.6, 10);
      t.rotateX(Math.PI / 2);
      t.translate(s * 2.7, TOWER_TOP + 0.6, Z(90.8));
      add(t, "dark", { color: DARK, texel: 1 / 3, lod: 0 });
      add(
        bar(
          [s * 7.4, OCT_TOP + 0.4, Z(87)],
          [s * 7.4, OCT_TOP + 0.4, Z(99.5)],
          0.9,
          0.9,
        ),
        "dark",
        { color: DARK, texel: 1 / 3, lod: 0 },
      );
      add(
        new THREE.BoxGeometry(2.2, 1.4, 3).translate(
          s * 9.0,
          OCT_TOP + 0.7,
          Z(90),
        ),
        "dark",
        { color: DARK_DEEP, texel: 1 / 3, lod: 0 },
      );
      add(
        new THREE.BoxGeometry(1.6, 1.2, 2.4).translate(
          s * 8.8,
          OCT_TOP + 0.6,
          Z(96.5),
        ),
        "hull",
        { color: RED_DK, texel: 1 / 3, lod: 0 },
      );
      winStrip(add, {
        c: [s * 6.0, 5.6, Z(94)],
        n: [s, 0, 0],
        along: [0, 0, 1],
        total: 6,
        h: 0.55,
        panes: 3,
        lod: 0,
      });
    }
    dishMast(add, {
      base: [0.9, 13.5, Z(POD_Z)],
      up: [0.2, 1, 0],
      height: 0.8,
      aim: [0.1, 0.5, -0.86],
      r: 1.1,
      lod: 0,
      mast: DARK,
      dish: CREAM,
      braceSpan: 0.3,
    });
    hatch(add, {
      c: [0, TOWER_TOP, Z(94)],
      n: [0, 1, 0],
      along: [0, 0, 1],
      w: 2.4,
      h: 3.0,
      lod: 0,
      color: RED,
      rimColor: DARK_DEEP,
    });
  }

  // ---------------------------------------------------------------------------
  // stern: three engine pods in a row (centre one 0.8 m higher) and the machinery plates between them
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    for (const [x, y, bulb] of [
      [-PX, 0, -1],
      [0, 0.8, 0],
      [PX, 0, 1],
    ]) {
      const e = enginePod(add, { x, y, Z, lod, pal, texel: TEX, bulb });
      if (lod === 0) engines.push(e);
    }
    for (const s of [-1, 1])
      podConnector(add, {
        x0: s * 9.3,
        x1: s * (PX - 9.3),
        y: WING_TOP,
        Z,
        lod,
        pal,
        texel: TEX,
      });
  }

  return assemble(
    {
      id: "consular",
      side: "republic",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 84 },
      turretTypes: { laser },
      turrets,
    },
    mats,
  );
}
