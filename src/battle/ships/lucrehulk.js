// Lucrehulk-class battleship / Droid Control Ship (Separatist), 3170 m across, ~1000 m tall at the
// core. Original procedural geometry after the film design: a thick broken ring (a 240 m deep annulus,
// arms ≈ 715 m wide, open 56° at the bow, the arms ending in flat faces) with bevelled outer edges, a
// stepped outer deck band, a raised inner rim band, a dark lit inner wall stacked with window rows
// and hangar mouths, a plated outer wall with a dark recessed docking strip, ribs and bay lights, large
// deck plates cut by circumferential and radial seams with per-plate tone, raised sub-plates and
// hatches, disc sensor batteries along the outer bevel, blue-violet Separatist panels and hex
// insignia; arm tips with raised roof plates, hooked docking pills that bend down over the end faces,
// stacked docking tubes, a lit hangar slot and a claw; the 730 m core sphere held at the centre by a
// neck from the stern, with its equatorial groove, plating latitudes and meridians, window rows, the
// bridge tower and T-bar on top and twin aft towers; a stern deck block carrying a cluster of ten
// spires, a large disc and a gantry to the core; six engine pods on the stern of the ring; tracking
// quad-laser batteries along both deck rims and twin turbolasers on the inner decks.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  D2R,
  TAU,
  TriBuf,
  addQuad,
  arcBox,
  arcPanel,
  arcStrip,
  boxIn,
  lpart,
  polar,
  radialDir,
  rng,
  sweepArc,
  tangentDir,
  wallStrip,
} from "./lucrehulkGeo.js";
import { LUCREHULK as K, PAL } from "./lucrehulkSpec.js";
import {
  buildCore,
  buildDishBattery,
  buildEngines,
  buildNeck,
  buildSternBlock,
  buildTip,
  wallHangar,
} from "./lucrehulkDetail.js";
import { quadLaser, twinTurbolaser } from "./lucrehulkTurrets.js";

export { LUCREHULK } from "./lucrehulkSpec.js";

export function buildLucrehulk(mats) {
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(lpart(geo, mat, opts));
  const rand = rng(4211);
  const TEX = 1 / 72; // deck plating scale (plates 10-25 m inside the 100-200 m seam grid)

  const A0 = K.gap;
  const A1 = TAU - K.gap;
  const top = K.halfH;
  const rimY = top + K.rimLift;
  const bandY = top + 6;
  const segs = [128, 48, 32];
  const grooves = [1010, 1200];
  const STRIP = K.strip; // half height of the recessed docking band on the outer wall
  // blue-violet Separatist panels per arm (degrees from the bow, starboard arm; mirrored to port): a
  // long chevron band along the inner half of the deck, a wide trapezoid behind the tip roof, an
  // outer-band patch, a short chevron toward the stern
  const panelDefs = [
    { r: [1020, 1110], inner: [64, 118], outer: [68, 112], color: PAL.indigo },
    { r: [1230, 1340], inner: [54, 66], outer: [52, 70], color: PAL.indigoDk },
    {
      r: [K.bandR + 4, K.bevelR - 6],
      inner: [96, 122],
      outer: [98, 120],
      color: PAL.indigo,
      y: bandY,
    },
    {
      r: [1180, 1290],
      inner: [128, 146],
      outer: [132, 142],
      color: PAL.indigo,
    },
    {
      r: [1000, 1080],
      inner: [150, 160],
      outer: [146, 164],
      color: PAL.indigoDk,
    },
  ];
  const inPanel = (r, d, up) => {
    const dd = d > 180 ? 360 - d : d;
    for (const p of panelDefs) {
      if (up < 0 && p.r[0] < 1200) continue; // only the wide panels are repeated on the belly
      const rr = up > 0 ? p.r : [p.r[0] - 30, p.r[1] - 30];
      if (r < rr[0] - 6 || r > rr[1] + 6) continue;
      if (
        dd >= Math.min(p.inner[0], p.outer[0]) - 1 &&
        dd <= Math.max(p.inner[1], p.outer[1]) + 1
      )
        return true;
    }
    return false;
  };

  // ---------------------------------------------------------------------------
  // ring: plated decks (outer band step, main deck bands, inner rim), plated outer wall with the recessed
  // dark docking strip, dark inner wall; flat end faces
  // ---------------------------------------------------------------------------
  // rounded shoulder from the wall top into the outer band (three facets; one at LOD 2)
  const shoulder = [
    [K.rOut, K.wallY],
    [K.rOut - 10, K.wallY + 20],
    [K.rOut - 38, K.wallY + 38],
    [K.bevelR, bandY],
  ];
  const profTopFor = (lod) => [
    ...(lod < 2 ? shoulder : [shoulder[0], shoulder[3]]),
    [K.bandR, bandY],
    [K.bandR, top],
    [grooves[1], top],
    [grooves[0], top],
    [K.rimR, top],
    [K.rimR, rimY],
    [K.rIn, rimY],
  ];
  const wallTop = [
    [K.rOut - 4, STRIP],
    [K.rOut, STRIP],
    [K.rOut, K.wallY],
  ];
  const wallBot = wallTop.map(([r, y]) => [r, -y]).reverse();
  const profFullFor = (lod) => {
    const pt = profTopFor(lod);
    const pb = pt.map(([r, y]) => [r, -y]).reverse();
    return [
      ...pb,
      ...wallBot.slice(1),
      [K.rOut - 4, STRIP],
      ...wallTop.slice(1),
      ...pt.slice(1),
    ];
  };
  // point at fraction t along the shoulder facet p -> q, lifted h off the facet
  const onFacet = (p, q, t, h) => {
    const dr = q[0] - p[0];
    const dy = q[1] - p[1];
    const L = Math.hypot(dr, dy);
    return [p[0] + dr * t + (dy / L) * h, p[1] + dy * t - (dr / L) * h];
  };
  // per-plate tone: hash of (deck band, 6° cell)
  const cellTone = (r, th) => {
    const band =
      r < K.rimR
        ? 0
        : r < grooves[0]
          ? 1
          : r < grooves[1]
            ? 2
            : r < K.bandR
              ? 3
              : 4;
    const cell = Math.floor(th / (6 * D2R));
    const h = Math.sin(band * 12.9898 + cell * 78.233) * 43758.5453;
    return 0.965 + 0.07 * (h - Math.floor(h));
  };
  const deckTint = (x, y, z, o, nx, ny, nz) => {
    const r = Math.hypot(x, z);
    const th =
      Math.atan2(x, -z) < 0 ? Math.atan2(x, -z) + TAU : Math.atan2(x, -z);
    let k = cellTone(r, th);
    if (Math.abs(ny) < 0.9) k *= 0.88; // bevels and steps
    if (r < K.rimR + 1) k *= 1.06; // inner rim band
    if (r > K.bandR + 1 && Math.abs(ny) > 0.9) k *= 1.03; // outer band
    if (y < 0) k *= 0.9;
    o.copy(PAL.grey).multiplyScalar(k);
  };
  for (const lod of [0, 1, 2]) {
    const n = segs[lod];
    const profTop = profTopFor(lod);
    const profBot = profTop.map(([r, y]) => [r, -y]).reverse();
    for (const prof of [profTop, profBot])
      add(sweepArc(prof, A0, A1, n, { closed: false, texel: TEX }), "hull", {
        uv: "keep",
        lod,
        tint: deckTint,
        flatTint: true,
      });
    for (const prof of [wallTop, wallBot])
      add(sweepArc(prof, A0, A1, n, { closed: false, texel: 1 / 40 }), "hull", {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o
            .copy(PAL.wall)
            .multiplyScalar(
              cellTone(
                K.bandR + 1,
                Math.atan2(x, -z) < 0
                  ? Math.atan2(x, -z) + TAU
                  : Math.atan2(x, -z),
              ),
            ),
        flatTint: true,
      });
    add(
      wallStrip(K.rOut - 4, -STRIP, STRIP, A0, A1, n, { texel: 1 / 10 }),
      "dark",
      {
        color: PAL.band,
        uv: "keep",
        lod,
      },
    );
    add(
      wallStrip(K.rIn, -rimY, rimY, A0, A1, n, { inward: true, texel: 1 / 10 }),
      "dark",
      {
        color: PAL.bandDk,
        uv: "keep",
        lod,
      },
    );
    add(
      sweepArc(profFullFor(lod), A0, A1, 1, {
        capStart: true,
        capEnd: true,
        noSides: true,
        texel: TEX,
      }),
      "hull",
      {
        color: PAL.grey,
        uv: "keep",
        lod,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // inner wall: ledges, window rows (strips at LOD 1/2) and hangar mouths facing the core
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1]) {
    const n = segs[lod];
    for (const y of lod === 0 ? [-100, -50, 50, 100] : [-50, 50])
      add(
        arcBox(
          K.rIn - 6,
          K.rIn + 3,
          y - 3.5,
          y + 3.5,
          A0 + 0.004,
          A1 - 0.004,
          n,
          1 / 8,
        ),
        "hull",
        {
          color: PAL.greyDk,
          uv: "keep",
          lod,
        },
      );
    add(
      arcBox(K.rIn - 4, K.rIn + 3, -2.5, 2.5, A0 + 0.004, A1 - 0.004, n, 1 / 8),
      "hull",
      {
        color: PAL.greyShade,
        uv: "keep",
        lod,
      },
    );
  }
  const winRows = [-125, -75, -25, 25, 75, 125];
  const minorRows = [-112, -88, -62, -38, 38, 62, 88, 112];
  // the two big blue-lit hangar bays on the inner face of each arm (degrees from the bow)
  const bigBays = [96, 128, 232, 264];
  const inBigBay = (d, y) =>
    bigBays.some((b) => Math.abs(d - b) < 5.4 && y > 2 && y < 48);
  {
    // dense lit grid: six main rows plus dimmer intermediate rows, broken by machinery blocks
    const b = new TriBuf();
    const dim = new TriBuf();
    for (const y of [...winRows, ...minorRows]) {
      const minor = minorRows.includes(y);
      const step = (minor ? 1.5 : 1.1) * D2R;
      for (let th = A0 + 3 * D2R; th < A1 - 3 * D2R; th += step) {
        if (rand() < (minor ? 0.4 : 0.22) || inBigBay(th / D2R, y)) continue;
        const c = polar(K.rIn - 0.7, th, y + (rand() - 0.5) * 2);
        addQuad(
          minor ? dim : b,
          c,
          radialDir(th).map((v) => -v),
          tangentDir(th),
          minor ? 7 : 11 + rand() * 4,
          minor ? 3 : 4.2,
          0,
          1 / 4,
        );
      }
    }
    add(b.build(), "windows", { color: PAL.window, uv: "keep", lod: 0 });
    add(dim.build(), "windows", {
      color: new THREE.Color(PAL.window).multiplyScalar(0.6),
      uv: "keep",
      lod: 0,
    });
    // machinery blocks, pipes and vents standing off the inner wall between the window rows
    for (let i = 0; i < 190; i++) {
      const d = 34 + rand() * 292;
      const y = (rand() - 0.5) * 2 * (rimY - 16);
      if (Math.abs(d - 180) < 14 || inBigBay(d, y)) continue;
      const th = d * D2R;
      const F = {
        o: polar(K.rIn, th, y),
        u: radialDir(th).map((v) => -v),
        v: [0, 1, 0],
        w: tangentDir(th),
      };
      const kind = rand();
      if (kind < 0.55) {
        const w = 6 + rand() * 14;
        const h = 5 + rand() * 12;
        const l = 8 + rand() * 26;
        add(
          boxIn(F, [w / 2 - 1, 0, 0], [w, h, l]),
          rand() < 0.5 ? "dark" : "hull",
          {
            color: rand() < 0.5 ? PAL.band : PAL.greyShade,
            texel: 1 / 5,
            lod: 0,
          },
        );
      } else if (kind < 0.8) {
        add(boxIn(F, [3, 0, 0], [6, 2 * rimY - 40, 5 + rand() * 4]), "dark", {
          color: PAL.bandDk,
          texel: 1 / 4,
          lod: 0,
        });
      } else {
        add(
          boxIn(F, [4, 0, 0], [8, 4 + rand() * 3, 30 + rand() * 50]),
          "dark",
          { color: PAL.band, texel: 1 / 4, lod: 0 },
        );
      }
    }
  }
  for (const lod of [1, 2]) {
    const rows = lod === 1 ? winRows : [-75, 25, 125];
    for (const y of rows)
      add(
        wallStrip(
          K.rIn - 0.7,
          y - 2.2,
          y + 2.2,
          A0 + 0.03,
          A1 - 0.03,
          segs[lod],
          { inward: true, texel: 1 / 4 },
        ),
        "windows",
        {
          color: new THREE.Color(PAL.window).multiplyScalar(0.55),
          uv: "keep",
          lod,
        },
      );
  }
  for (const lod of [0, 1]) {
    for (let d = 42; d <= 318; d += 12) {
      const th = d * D2R;
      if (Math.abs(d - 180) < 10 || inBigBay(d, 25)) continue;
      const warm = Math.round(d / 12) % 3 === 0;
      wallHangar(
        add,
        K.rIn,
        th,
        -25,
        1.6 * D2R,
        17,
        lod,
        true,
        warm ? PAL.hangarWarm : PAL.hangar,
      );
    }
    for (const d of bigBays)
      wallHangar(add, K.rIn, d * D2R, 25, 4.6 * D2R, 20, lod, true, PAL.hangar);
  }

  // ---------------------------------------------------------------------------
  // outer wall: dark ribs, docking-bay lights (dense toward the tips), bay mouths in the strip
  // ---------------------------------------------------------------------------
  // ribs spanning the band, every 4° (8° at LOD 1); heavier frames every 16°
  for (const lod of [0, 1]) {
    const step = (lod === 0 ? 4 : 8) * D2R;
    let k = 0;
    for (let th = A0 + 2 * D2R; th < A1 - 1.5 * D2R; th += step, k++) {
      if (Math.abs(th - Math.PI) < 33 * D2R) continue; // engine pods live here
      const heavy = k % (lod === 0 ? 4 : 2) === 0;
      add(
        arcBox(
          K.rOut - 3,
          K.rOut + (heavy ? 4 : 1.5),
          -STRIP - 2,
          STRIP + 2,
          th - (heavy ? 0.22 : 0.12) * D2R,
          th + (heavy ? 0.22 : 0.12) * D2R,
          1,
          1 / 8,
        ),
        "dark",
        {
          color: heavy ? PAL.band : PAL.bandDk,
          uv: "keep",
          lod,
        },
      );
    }
  }
  // the band is a dense grid of bay lights (three rows, denser toward the tips) with machinery blocks
  {
    const b = new TriBuf();
    const inw = (th) => radialDir(th);
    for (let th = A0 + 1.5 * D2R; th < A1 - 1.5 * D2R; th += 1.1 * D2R) {
      if (Math.abs(th - Math.PI) < 33 * D2R) continue;
      const nearTip = Math.min(th - A0, A1 - th) < 48 * D2R;
      for (const y of [-24, -4, 18]) {
        if (rand() < (nearTip ? 0.2 : 0.55)) continue;
        addQuad(
          b,
          polar(K.rOut - 3.3, th, y + (rand() - 0.5) * 3),
          inw(th),
          tangentDir(th),
          8 + rand() * 6,
          3.4,
          0,
          1 / 4,
        );
      }
    }
    add(b.build(), "windows", { color: PAL.windowCool, uv: "keep", lod: 0 });
    for (let i = 0; i < 130; i++) {
      const d = 32 + rand() * 296;
      if (Math.abs(d - 180) < 34) continue;
      const th = d * D2R;
      const y = (rand() - 0.5) * 2 * (STRIP - 8);
      const F = {
        o: polar(K.rOut - 4, th, y),
        u: radialDir(th),
        v: [0, 1, 0],
        w: tangentDir(th),
      };
      const w = 3 + rand() * 4;
      add(
        boxIn(F, [w / 2, 0, 0], [w, 5 + rand() * 10, 10 + rand() * 30]),
        rand() < 0.6 ? "dark" : "hull",
        {
          color: rand() < 0.5 ? PAL.band : PAL.greyShade,
          texel: 1 / 5,
          lod: 0,
        },
      );
    }
  }
  for (const [a, b2] of [
    [A0 + 0.04, A0 + 48 * D2R],
    [A1 - 48 * D2R, A1 - 0.04],
  ])
    for (const y of [-24, 18])
      add(
        wallStrip(K.rOut - 3.3, y - 1.8, y + 1.8, a, b2, 16, { texel: 1 / 4 }),
        "windows",
        {
          color: new THREE.Color(PAL.windowCool).multiplyScalar(0.5),
          uv: "keep",
          lod: 1,
        },
      );
  // docking-bay mouths cut into the band
  for (const lod of [0, 1])
    for (let d = 46; d <= 314; d += 16) {
      if (Math.abs(d - 180) < 40) continue;
      wallHangar(
        add,
        K.rOut - 4,
        d * D2R,
        -2,
        1.3 * D2R,
        16,
        lod,
        false,
        PAL.windowCool,
      );
    }

  // ---------------------------------------------------------------------------
  // decks: circumferential grooves, radial seams, raised plates, hatches, blue panels
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1]) {
    const n = segs[lod];
    for (const up of [1, -1]) {
      const y = up * (top + 0.5);
      for (const r of grooves)
        add(
          arcStrip(r - 2.2, r + 2.2, y, A0 + 0.002, A1 - 0.002, n, {
            down: up < 0,
            texel: 1 / 8,
          }),
          "dark",
          {
            color: PAL.seam,
            uv: "keep",
            lod,
          },
        );
      add(
        arcStrip(
          K.bandR - 2.5,
          K.bandR,
          up * (bandY + 0.3),
          A0 + 0.002,
          A1 - 0.002,
          n,
          { down: up < 0, texel: 1 / 8 },
        ),
        "dark",
        {
          color: PAL.seam,
          uv: "keep",
          lod,
        },
      );
      const b = new TriBuf();
      for (let d = 40; d <= 320; d += 12) {
        const th = d * D2R;
        if (Math.abs(d - 180) < 30 && up > 0) continue;
        addQuad(
          b,
          polar((K.rimR + K.bandR) / 2, th, y),
          [0, up, 0],
          radialDir(th),
          K.bandR - K.rimR - 4,
          4.5,
          0,
          1 / 8,
        );
        if (lod === 0)
          addQuad(
            b,
            polar((K.bandR + K.bevelR) / 2, th + 6 * D2R, up * (bandY + 0.5)),
            [0, up, 0],
            radialDir(th + 6 * D2R),
            K.bevelR - K.bandR - 4,
            4,
            0,
            1 / 8,
          );
      }
      add(b.build(), "dark", { color: PAL.seam, uv: "keep", lod });
    }
  }
  // raised sub-plates in the seam grid (LOD 0), a few at LOD 1
  {
    const rr = [K.rimR + 8, grooves[0], grooves[1], K.bandR - 6];
    for (const up of [1, -1])
      for (let d = 40; d < 320; d += 12) {
        if (Math.abs(d + 6 - 180) < 30 && up > 0) continue;
        for (let i = 0; i + 1 < rr.length; i++) {
          const roll = rand();
          if (roll > 0.55) continue;
          const lodMax = roll < 0.2 ? 1 : 0;
          const r0 = rr[i] + 8 + rand() * 30;
          const r1 = rr[i + 1] - 8 - rand() * 30;
          const a0 = (d + 0.6 + rand() * 2) * D2R;
          const a1 = (d + 12 - 0.6 - rand() * 2) * D2R;
          const tone = 0.94 + rand() * 0.12;
          const h = 2 + rand() * 2.5;
          if (
            inPanel(r0, d + 6, up) ||
            inPanel(r1, d + 6, up) ||
            inPanel((r0 + r1) / 2, d + 1, up) ||
            inPanel((r0 + r1) / 2, d + 11, up)
          )
            continue;
          for (let lod = 0; lod <= lodMax; lod++)
            add(
              arcBox(
                r0,
                r1,
                up > 0 ? top : -top - h,
                up > 0 ? top + h : -top,
                a0,
                a1,
                lod === 0 ? 3 : 2,
                TEX,
              ),
              "hull",
              {
                color: PAL.grey
                  .clone()
                  .multiplyScalar(tone * (up > 0 ? 1 : 0.9)),
                uv: "keep",
                lod,
              },
            );
        }
      }
  }
  // hatches, vents, dark recessed panels and small houses scattered over both decks (LOD 0)
  {
    const flats = new TriBuf();
    for (let i = 0; i < 300; i++) {
      const up = rand() < 0.62 ? 1 : -1;
      const d = 38 + rand() * 284;
      if (Math.abs(d - 180) < 32 && up > 0) continue;
      const th = d * D2R;
      const r = K.rimR + 24 + rand() * (K.bevelR - K.rimR - 50);
      if (inPanel(r, d, up)) continue;
      const kind = rand();
      if (kind < 0.3) {
        // dark recessed panel, flush
        addQuad(
          flats,
          polar(r, th, up * (top + 0.4)),
          [0, up, 0],
          radialDir(th),
          14 + rand() * 30,
          8 + rand() * 18,
          0,
          1 / 6,
        );
        continue;
      }
      const w = 5 + rand() * 12;
      const l = 5 + rand() * 16;
      const h = 1.5 + rand() * 5;
      const F = {
        o: polar(r, th, up * top),
        u: radialDir(th),
        v: [0, up, 0],
        w: tangentDir(th),
      };
      const dark = kind < 0.5;
      add(boxIn(F, [0, h / 2, 0], [w, h, l]), dark ? "dark" : "hull", {
        color: dark ? PAL.band : rand() < 0.5 ? PAL.greyLt : PAL.greyDk,
        texel: 1 / 6,
        lod: 0,
      });
    }
    add(flats.build(), "dark", { color: PAL.bandDk, uv: "keep", lod: 0 });
  }
  for (const lod of [0, 1])
    for (const p of panelDefs)
      for (const mirror of [false, true]) {
        const m = (d) => (mirror ? 360 - d : d) * D2R;
        const inner = mirror
          ? [m(p.inner[1]), m(p.inner[0])]
          : [m(p.inner[0]), m(p.inner[1])];
        const outer = mirror
          ? [m(p.outer[1]), m(p.outer[0])]
          : [m(p.outer[0]), m(p.outer[1])];
        const y = (p.y ?? top) + 0.8;
        add(
          arcPanel(p.r[0], p.r[1], y, inner, outer, lod === 0 ? 8 : 4, {
            texel: 1 / 40,
          }),
          "paint",
          {
            color: p.color,
            uv: "keep",
            lod,
          },
        );
        if (p.r[0] > 1200)
          add(
            arcPanel(
              p.r[0] - 30,
              p.r[1] - 30,
              -(p.y ?? top) - 0.8,
              inner,
              outer,
              lod === 0 ? 8 : 4,
              { down: true, texel: 1 / 40 },
            ),
            "paint",
            {
              color: PAL.indigoDk,
              uv: "keep",
              lod,
            },
          );
      }
  // blue plates on the upper shoulder facet
  for (const lod of [0, 1])
    for (const d of [70, 112, 154, 206, 248, 290]) {
      const a0 = (d - 2.4) * D2R;
      const a1 = (d + 2.4) * D2R;
      add(
        sweepArc(
          [
            onFacet(shoulder[2], shoulder[3], 0.08, 0.8),
            onFacet(shoulder[2], shoulder[3], 0.94, 0.8),
          ],
          a0,
          a1,
          3,
          { closed: false, texel: 1 / 40 },
        ),
        "paint",
        { color: PAL.indigo, uv: "keep", lod },
      );
    }

  // disc sensor batteries along the outer shoulder (top), a few below
  const shoulderY = onFacet(
    shoulder[2],
    shoulder[3],
    (1512 - shoulder[2][0]) / (shoulder[3][0] - shoulder[2][0]),
    0,
  )[1];
  for (const d of [60, 90, 120, 150, 210, 240, 270, 300])
    buildDishBattery(add, d * D2R, shoulderY - 3, 1);
  for (const d of [75, 135, 225, 285])
    buildDishBattery(add, d * D2R, -shoulderY + 3, -1);

  // ---------------------------------------------------------------------------
  // tips, core, neck, stern block, engines
  // ---------------------------------------------------------------------------
  buildTip(add, 1, TEX);
  buildTip(add, -1, TEX);
  buildCore(add, 1 / 56);
  buildNeck(add, TEX);
  buildSternBlock(add, TEX);
  buildEngines(add, engines);

  // ---------------------------------------------------------------------------
  // tracking turrets: quad lasers along both deck rims, twin turbolasers on the inner decks
  // ---------------------------------------------------------------------------
  const light = quadLaser(14, PAL.grey, PAL.bandDk, { rate: 1.1 });
  const heavy = twinTurbolaser(28, PAL.grey, PAL.bandDk, { rate: 0.45 });
  const mount = (type, r, th, up, S, yBase = top) => {
    const y = up * (yBase + 0.4);
    {
      const pad = new THREE.CylinderGeometry(1.25 * S, 1.35 * S, 1.2, 14);
      pad.translate(0, up * 0.6, 0);
      const c = polar(r, th, y);
      pad.translate(c[0], c[1], c[2]);
      add(pad, "hull", { color: PAL.greyDk, texel: 1 / 6, lod: 0 });
    }
    const k = turrets.length;
    const out = radialDir(th);
    turrets.push({
      type,
      pos: polar(r, th, y + up * 1.2),
      up: [0, up, 0],
      forward: out,
    });
    hardpoints.push({
      pos: polar(r, th, y + up * S * 2),
      dir: [out[0] * 0.75, up * 0.6, out[2] * 0.75],
      kind: type === "heavy" ? "heavy" : "light",
      range: type === "heavy" ? 14000 : 7000,
      turret: k,
    });
  };
  for (let d = 42; d <= 318; d += 17) {
    if (Math.abs(d - 180) < 26) continue;
    mount("light", 1360, d * D2R, 1, 14);
  }
  for (let d = 50; d <= 310; d += 17) {
    if (Math.abs(d - 180) < 26) continue;
    mount("light", 1360, d * D2R, -1, 14);
  }
  for (const d of [52, 92, 132, 228, 268, 308])
    mount("heavy", 1090, d * D2R, 1, 28);
  for (const d of [72, 112, 248, 288]) mount("heavy", 1090, d * D2R, -1, 28);
  // two heavies on the stern block top
  for (const d of [158, 202]) mount("heavy", 1330, d * D2R, 1, 28, top + 100);

  return assemble(
    {
      id: "lucrehulk",
      side: "separatist",
      length: K.diameter,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 1700 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
