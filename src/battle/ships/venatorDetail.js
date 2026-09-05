// Venator surface detail: stern engine bank (deep nozzle bells; plumes are the fleet's), the lit window
// trench along both flanks with its machinery, ventral bays, bevelled plate fields with panel-line
// grooves on the deck / doors / lower hull / belly / terraces, point-defence turrets and running lights.
// Everything reads the hull sections built by venatorHull so detail sits on the actual loft surface.
import * as THREE from "three";
import {
  loftFrame,
  loftEdgeLength,
  framePlate,
  plateMM,
  grooveMM,
  groove,
  surfaceBox,
  quadFacing,
  nozzle,
  partition,
  jitterColor,
  mulColor,
  tube,
} from "./venatorKit.js";
import { boxMM } from "./shipKit.js";
import { LIGHT } from "./venatorTurrets.js";
import { EDGE } from "./venatorHull.js";
import {
  Z,
  L,
  halfW,
  yTop,
  yBot,
  flankSteps,
  doorEdge,
  redInner,
  turretX,
  DOOR_Z0,
  DOOR_Z1,
  DOOR_H,
  CENTRE_HALF,
  BAY_HALF,
  SEAM_HALF,
  WING,
  BLOCK,
  ENGINES,
  BELLY_BAYS,
  VENT_Z1,
  GREY_DECK,
  GREY_WING,
  GREY_FLANK,
  GREY_LOWER,
  GREY_BELLY,
  DARK,
  DARK_RECESS,
  DARK_SEAM,
  RED,
  ROW_WARM,
  ROW_COOL,
  HANGAR_WARM,
  sootAt,
} from "./venatorSpec.js";

export function buildDetail(ctx, secs) {
  const { lod, fine, mid, add, hullTexel, rand, open } = ctx;
  const plateTexel = lod === 0 ? 1 / 30 : 1 / 40;
  const soot = (color, z) => {
    const s = sootAt(z);
    return mulColor(color, s[0], s[1], s[2]);
  };
  const plateTint = (base, z, jit = 0.07) =>
    soot(jitterColor(rand, base, jit, 0.015), z);

  // -------------------------------------------------------------------------
  // stern engine bank
  // -------------------------------------------------------------------------
  const zs = Z(L) - 3;
  // dark recessed band behind the main row and the small upper row
  add(boxMM([-238, -46, zs - 1], [238, 14, Z(L) + 0.4]), "dark", {
    color: DARK_RECESS,
    texel: 1 / 10,
  });
  add(boxMM([-120, 8, zs - 1], [120, 34, Z(L) + 0.3]), "dark", {
    color: DARK_RECESS,
    texel: 1 / 10,
  });
  for (const [ex, ey, r] of ENGINES) {
    const nz = nozzle(r, {
      depth: r * 1.2,
      lip: r * 0.5,
      seg: lod === 0 ? (r > 12 ? 20 : 12) : lod === 1 ? 12 : 8,
      rings: 2,
      vanes: r > 12 ? 8 : 6,
      detail: lod === 0 ? 2 : lod === 1 ? 1 : 0,
    });
    for (const g of nz.dark)
      add(g.translate(ex, ey, zs), "dark", {
        color: DARK_RECESS,
        texel: 1 / 6,
      });
    if (lod === 0)
      ctx.engines.push({ pos: [ex, ey, zs + nz.mouth], r: r * 0.85 });
  }
  if (mid) {
    // heat-stained armour frames between the bells and the stern's greebled upper wall
    for (const s of [-1, 1]) {
      add(boxMM([s * 84 - 3, -46, zs + 1], [s * 84 + 3, 14, zs + 8]), "hull", {
        color: soot(GREY_FLANK, Z(L)),
        texel: 1 / 8,
      });
      add(
        boxMM([s * 160 - 3, -46, zs + 1], [s * 160 + 3, 14, zs + 8]),
        "hull",
        { color: soot(GREY_FLANK, Z(L)), texel: 1 / 8 },
      );
    }
    for (let i = 0; i < (fine ? 22 : 8); i++) {
      const x = -230 + rand() * 460;
      const y = 16 + rand() * 20;
      const w = 4 + rand() * 10;
      const h = 2 + rand() * 5;
      if (Math.abs(x) < 122 && y < 34) continue;
      add(
        boxMM(
          [x - w / 2, y - h / 2, Z(L) - 2],
          [x + w / 2, y + h / 2, Z(L) + 1.5 + rand() * 2],
        ),
        "dark",
        {
          color: DARK,
          texel: 1 / 4,
        },
      );
    }
  }

  // -------------------------------------------------------------------------
  // flank trench: window rows on the recessed wall, machinery on the floor, pipes
  // -------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    const j = s > 0 ? EDGE.trenchWallR : EDGE.trenchWallL;
    const jFloor = s > 0 ? EDGE.trenchFloorR : EDGE.trenchFloorL;
    if (lod === 2) {
      // far LOD: two long lit strips per side
      for (const [z0, z1] of [
        [330, 700],
        [760, 1110],
      ]) {
        const fr = loftFrame(secs, j, 0.55, Z((z0 + z1) / 2));
        const c = fr.p.clone().addScaledVector(fr.n, 0.3);
        add(
          quadFacing(c.toArray(), fr.n.toArray(), [0, 1, 0], z1 - z0, 2.4),
          "windows",
          { color: ROW_WARM, uv: "keep" },
        );
      }
      continue;
    }
    const step = fine ? 7 : 30;
    for (let zr = 210; zr < 1118; zr += step) {
      const f = flankSteps(zr);
      if (f.trenchH < 10) continue;
      const zc = Z(zr);
      // window group: a band of 3-6 lit panes across two rows (LOD 1: one long pane)
      if (rand() < (fine ? 0.66 : 0.8)) {
        const rows = fine ? (rand() < 0.5 ? 2 : 1) : 1;
        for (let rI = 0; rI < rows; rI++) {
          const t = rows === 2 ? 0.36 + rI * 0.3 : 0.5;
          const fr = loftFrame(secs, j, t, zc);
          const c = fr.p.clone().addScaledVector(fr.n, 0.2);
          const w = fine ? step - 2.5 : step - 6;
          add(
            quadFacing(
              c.toArray(),
              fr.n.toArray(),
              [0, 1, 0],
              w,
              fine ? 1.6 : 2.2,
            ),
            "windows",
            {
              color: rand() < 0.7 ? ROW_WARM : ROW_COOL,
              uv: "keep",
            },
          );
        }
      }
      if (!fine) continue;
      // machinery: boxes standing on the trench floor (dark and light, the reference trench is a dense
      // mix of both), tanks hanging from the deck lip, pipe runs along the floor
      if (rand() < 0.8) {
        const fr = loftFrame(secs, jFloor, 0.5, zc);
        if (fr.n.y < 0) fr.n.negate();
        const h = 3 + rand() * (f.trenchH * 0.6);
        const w = 3 + rand() * 5;
        const d = 3 + rand() * (f.recess - 4);
        const light = rand() < 0.35;
        add(
          surfaceBox(fr, [w, h, d], { dv: 0, du: (rand() - 0.5) * 2 }),
          light ? "hull" : "dark",
          { color: light ? GREY_FLANK : DARK, texel: light ? 1 / 6 : 1 / 3 },
        );
      }
      if (rand() < 0.3) {
        // tank / duct hanging from the deck lip underside
        const hw = halfW(zr);
        const x0 = s * (hw - f.recess + 1);
        const x1 = s * (hw - 2);
        const h = 2 + rand() * (f.trenchH * 0.3);
        add(
          boxMM(
            [Math.min(x0, x1), f.yLipBot - h, zc - 2],
            [Math.max(x0, x1), f.yLipBot, zc + 2 + rand() * 3],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      }
      if (rand() < 0.22) {
        // pipe run along the trench, a little above the floor
        const fr = loftFrame(secs, jFloor, 0.7, zc + 8);
        const a = fr.p.clone().addScaledVector(fr.n, 2.2);
        const b = a.clone().add(new THREE.Vector3(0, 0, 22 + rand() * 30));
        add(tube(a, b, 0.6 + rand() * 0.5, 6), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
      }
    }
    // dark ribs across the trench every ~80 m: structural frames the windows sit between
    if (mid) {
      for (let zr = 260; zr < 1120; zr += fine ? 80 : 160) {
        const f = flankSteps(zr);
        if (f.trenchH < 10) continue;
        const hw = halfW(zr);
        add(
          boxMM(
            [s * (hw - f.recess) - 2, f.yTrBot, Z(zr) - 1.5],
            [s * (hw - 1) + 2, f.yLipBot, Z(zr) + 1.5],
          ),
          "dark",
          {
            color: soot(DARK, Z(zr)),
            texel: 1 / 4,
          },
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // ventral bays and keel detail
  // -------------------------------------------------------------------------
  if (mid) {
    for (const s of [-1, 1]) {
      for (const [z0, z1, x0, x1] of BELLY_BAYS) {
        const yb = yBot((z0 + z1) / 2);
        // bay door frame sunk into the belly with a lit slit along its inboard edge
        add(
          boxMM(
            [Math.min(s * x0, s * x1), yb - 1.2, Z(z0)],
            [Math.max(s * x0, s * x1), yb + 4, Z(z1)],
          ),
          "dark",
          {
            color: DARK_RECESS,
            texel: 1 / 8,
          },
        );
        add(
          quadFacing(
            [s * (x0 + 4), yb - 1.35, Z((z0 + z1) / 2)],
            [0, -1, 0],
            [0, 0, 1],
            2.2,
            z1 - z0 - 16,
          ),
          "windows",
          {
            color: HANGAR_WARM,
            uv: "keep",
          },
        );
      }
      // keel spine: a long shallow ridge either side of the centreline aft of the ventral hangar
      add(
        boxMM(
          [s * 6, yBot(700) - 2.2, Z(VENT_Z1 + 20)],
          [s * 16, yBot(700) + 6, Z(1080)],
        ),
        "hull",
        {
          color: GREY_LOWER,
          texel: hullTexel,
        },
      );
    }
    if (fine) {
      for (let i = 0; i < 60; i++) {
        const zr = 380 + rand() * 700;
        const x = (rand() - 0.5) * 2 * (halfW(zr) * 0.42);
        const w = 4 + rand() * 12;
        const d = 4 + rand() * 14;
        const yb = yBot(zr);
        add(
          boxMM(
            [x - w / 2, yb - 0.4 - rand() * 1.4, Z(zr) - d / 2],
            [x + w / 2, yb + 3, Z(zr) + d / 2],
          ),
          rand() < 0.5 ? "dark" : "hull",
          {
            color: rand() < 0.5 ? DARK : GREY_BELLY,
            texel: 1 / 6,
          },
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // plating: bevelled plate fields with grooves
  // -------------------------------------------------------------------------
  if (!mid) return;
  const NOM = 100;
  // plate field on a loft strip (edge j): cells in (t across, z along), placed on the surface frames
  const stripField = (
    j,
    base,
    {
      zr0,
      zr1,
      t0 = 0.05,
      t1 = 0.95,
      max = 60,
      keep = 0.22,
      skip = 0.3,
      mat = "hull",
      grooves = true,
    },
    filter = null,
  ) => {
    const cells = partition(
      rand,
      { u0: t0 * NOM, u1: t1 * NOM, v0: Z(zr0), v1: Z(zr1) },
      { max, keep },
    );
    for (const c of cells) {
      const cv = (c.v0 + c.v1) / 2;
      const ta = c.u0 / NOM;
      const tb = c.u1 / NOM;
      if (filter && filter(cv, ta, tb)) continue;
      const len = loftEdgeLength(secs, j, cv);
      const fr = loftFrame(secs, j, (ta + tb) / 2, cv);
      if (grooves) {
        const fa = loftFrame(secs, j, (ta + tb) / 2, c.v0);
        add(groove(fa, (tb - ta) * len, 0.7), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
        const fb = loftFrame(secs, j, ta, cv);
        add(groove(fb, 0.7, c.v1 - c.v0), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      }
      if (!fine) continue;
      const r = rand();
      if (r < skip) continue;
      const w = (tb - ta) * len - 3;
      const d = c.v1 - c.v0 - 3;
      if (w < 4 || d < 4) continue;
      const th = 0.5 + rand() * 0.9;
      add(
        framePlate(fr, w, d, th, 0.7 + rand() * 0.8, {
          texel: plateTexel,
          sink: 0.5,
        }),
        mat,
        {
          color: plateTint(base, cv),
          uv: mat === "hull" ? "keep" : "planar",
        },
      );
      if (rand() < 0.3)
        add(
          framePlate(
            fr,
            w * 0.4,
            d * 0.4,
            th + 0.5,
            0.6,
            { texel: 1 / 18, sink: 0.4 },
            (rand() - 0.5) * w * 0.4,
            (rand() - 0.5) * d * 0.3,
          ),
          mat,
          {
            color: plateTint(base, cv, 0.1),
            uv: mat === "hull" ? "keep" : "planar",
          },
        );
      else if (rand() < 0.35)
        add(
          surfaceBox(fr, [3.5, th + 0.6, 3.5], {
            du: (rand() - 0.5) * w * 0.5,
            dv: (rand() - 0.5) * d * 0.5,
          }),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
    }
  };
  for (const s of [-1, 1]) {
    const R = s > 0;
    // wings: from the bow wedge to the shoulders (skip the turret barbettes and the insignia).
    // Starboard edge 8 runs from the deck edge (t=0) to the door edge (t=1); port runs the other way.
    stripField(
      R ? EDGE.wingR : EDGE.wingL,
      GREY_WING,
      { zr0: 300, zr1: 686, max: 24, skip: 0.3 },
      (cv, ta, tb) => {
        const zr = cv - Z(0);
        const tm = R ? (ta + tb) / 2 : 1 - (ta + tb) / 2;
        const x = halfW(zr) - tm * WING;
        const dx = Math.abs(x - turretX(zr));
        const nearTurret = [292, 445, 600].some(
          (tz) => Math.abs(zr - tz) < 34 && dx < 30,
        );
        const nearRing =
          Math.abs(zr - 560) < 26 &&
          Math.abs(x - (doorEdge(560) + halfW(560)) / 2) < 26;
        return nearTurret || nearRing;
      },
    );
    // door tops: red plating on the red strips only (the grey inner margin stays bare deck).
    // Starboard edge 10 runs from the door edge (t=0) to the centre (t=1); port the other way.
    const gapHalf = open ? BAY_HALF : SEAM_HALF;
    stripField(
      R ? EDGE.doorR : EDGE.doorL,
      RED,
      {
        zr0: DOOR_Z0 + 4,
        zr1: DOOR_Z1 - 4,
        max: 36,
        keep: 0.3,
        skip: 0.45,
        mat: "paint",
        grooves: false,
      },
      (cv, ta, tb) => {
        const zr = cv - Z(0);
        const xw = doorEdge(zr);
        const tIn = R ? tb : 1 - ta; // parameter of the cell edge nearest the centre, in starboard terms
        const xInner = xw - tIn * (xw - gapHalf);
        const ri = redInner(zr, open);
        return xInner < ri + 2 || xw - ri < 12;
      },
    );
    // lower hull slope and the belly halves
    stripField(R ? EDGE.lowerR : EDGE.lowerL, GREY_LOWER, {
      zr0: 200,
      zr1: 1120,
      max: 30,
      skip: 0.3,
    });
    stripField(
      R ? EDGE.bellyR : EDGE.bellyL,
      GREY_BELLY,
      { zr0: 350, zr1: 1120, max: 34, skip: 0.34 },
      (cv) => {
        const zr = cv - Z(0);
        return BELLY_BAYS.some(([z0, z1]) => zr > z0 - 10 && zr < z1 + 10);
      },
    );
  }
  // centre strip between the doors: hatches and small plates (flat, axis aligned)
  if (fine) {
    // (on the bow wedge too, where the centre strip is bare deck between the two red panels)
    for (let zr = 140; zr < DOOR_Z1 - 20; zr += 14 + rand() * 24) {
      const inDoor = zr > DOOR_Z0 + 8;
      if (zr > DOOR_Z0 - 10 && !inDoor) continue;
      if (inDoor && open) continue;
      const s = rand() < 0.5 ? -1 : 1;
      const xMax = inDoor ? redInner(zr, open) - 5 : CENTRE_HALF - 4;
      const x = s * (5 + rand() * Math.max(2, xMax - 5));
      const w = 3 + rand() * 4;
      const y = yTop(zr) + (inDoor ? DOOR_H : 0);
      add(
        boxMM(
          [x - w / 2, y, Z(zr) - 3],
          [x + w / 2, y + 0.5 + rand() * 0.8, Z(zr) + 3],
        ),
        rand() < 0.5 ? "dark" : "hull",
        {
          color: rand() < 0.5 ? DARK : GREY_FLANK,
          texel: 1 / 4,
        },
      );
    }
    // deck greebles along the wing edge: small hatches and vents
    for (const s of [-1, 1])
      for (let zr = 320; zr < 830; zr += 12 + rand() * 20) {
        if ([292, 445, 600, 755].some((tz) => Math.abs(zr - tz) < 26)) continue;
        const x = s * (halfW(zr) - 8 - rand() * 14);
        const w = 2.5 + rand() * 4;
        const d = 2.5 + rand() * 6;
        add(
          boxMM(
            [x - w / 2, yTop(zr), Z(zr) - d / 2],
            [x + w / 2, yTop(zr) + 0.5 + rand() * 1.4, Z(zr) + d / 2],
          ),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
      }
    // terrace tops: axis-aligned plate fields (clipped to the taper)
    const t1 = BLOCK.t1;
    const cells = partition(
      rand,
      {
        u0: BLOCK.t2.hx + 6,
        u1: halfW(t1.z1) - t1.inset - 10,
        v0: Z(t1.z0 + 30),
        v1: Z(t1.z1 - 6),
      },
      { max: 28, keep: 0.25 },
    );
    for (const c of cells)
      for (const s of [-1, 1]) {
        const cv = (c.v0 + c.v1) / 2;
        const xa = Math.min(s * c.u0, s * c.u1) + 1.5;
        const xb = Math.max(s * c.u0, s * c.u1) - 1.5;
        add(grooveMM(xa - 0.35, xa + 0.35, c.v0, c.v1, t1.y1), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
        add(grooveMM(xa, xb, c.v0 - 0.35, c.v0 + 0.35, t1.y1), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
        if (rand() < 0.35) continue;
        add(
          plateMM(
            xa,
            xb,
            c.v0 + 1.5,
            c.v1 - 1.5,
            t1.y1,
            0.5 + rand() * 0.9,
            0.8,
            { texel: plateTexel },
          ),
          "hull",
          {
            color: plateTint(GREY_WING, cv),
            uv: "keep",
          },
        );
      }
  }

  // -------------------------------------------------------------------------
  // point-defence turrets (tracking) and running lights
  // -------------------------------------------------------------------------
  if (lod === 0) {
    const light = (pos, dir, up = [0, 1, 0]) => {
      const d = new THREE.Vector3(...dir).normalize();
      ctx.turrets.push({ type: "light", pos, up, forward: d.toArray() });
      ctx.hardpoints.push({
        pos: pos.map((v) => +v.toFixed(2)),
        dir: d.toArray().map((v) => +v.toFixed(3)),
        kind: "light",
        range: 6000,
        turret: ctx.turrets.length - 1,
      });
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const zr = 360 + i * 95;
        light(
          [s * (halfW(zr) - 9), yTop(zr) + 0.2, Z(zr)],
          [s * 0.6, 0.15, -0.8],
        );
      }
      for (const zr of [470, 660, 900]) {
        const j = s > 0 ? EDGE.lowerR : EDGE.lowerL;
        const fr = loftFrame(secs, j, 0.5, Z(zr));
        const p = fr.p.clone().addScaledVector(fr.n, 0.2);
        light(p.toArray(), [s * 0.5, -0.5, -0.7], fr.n.toArray());
      }
      light(
        [s * (BLOCK.t2.hx + 20), BLOCK.t1.y1 + 0.2, Z(960)],
        [s * 0.7, 0.3, -0.6],
      );
      light(
        [s * 60, yBot(900) - 0.2, Z(900)],
        [s * 0.4, -0.9, -0.2],
        [0, -1, 0],
      );
    }
    // running lights: wing tips, tower masts (in venatorTowers), stern corners
    for (const s of [-1, 1]) {
      add(
        quadFacing(
          [s * (halfW(830) - 3), yTop(830) + 0.3, Z(830)],
          [0, 1, 0],
          [0, 0, -1],
          1.6,
          1.6,
        ),
        "windows",
        { color: 0xffffff, uv: "keep" },
      );
      add(
        quadFacing(
          [s * 40, yTop(0) + 0.3, Z(4)],
          [0, 1, 0],
          [0, 0, -1],
          1.4,
          1.4,
        ),
        "windows",
        { color: s > 0 ? 0x80ff90 : 0xff7070, uv: "keep" },
      );
      add(
        quadFacing(
          [s * (halfW(L) - 6), 36, Z(L) + 0.5],
          [0, 0, 1],
          [0, 1, 0],
          1.6,
          1.6,
        ),
        "windows",
        { color: 0xffffff, uv: "keep" },
      );
    }
  }
  void GREY_DECK;
  void LIGHT;
}
