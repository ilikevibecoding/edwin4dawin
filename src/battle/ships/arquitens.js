// Arquitens-class light cruiser (Republic), 325 m. Original procedural geometry matched against the
// reference stills and orthos: a kite-shaped hull whose bow is cleaved into two long box-section prongs
// with an open fork between them (13 m slot, closed aft by a red-topped nose block over a dark trench),
// a broad ledge at mid-height with a tall flank wall above it, a shallow pyramid deck with a raised
// central spine, a wedge-fronted superstructure block amidships-aft carrying the T-shaped bridge head on
// its neck, a long ramp down to the small transom, and three big engine nacelles in a horizontal row
// (rounded red-ringed domes forward, deep nozzles aft) joined by a red bar and swept ledge struts.
// White-grey plating with deep wine-red Republic stripes along the wall chamfers, ledge faces, nacelle
// rings, bar and nose. Four tracking heavy twin turbolasers (deck shoulders, prong ledges), light twin
// emplacements, fixed broadside bays in the walls and forward tubes beside the nose. Three LODs.
import * as THREE from "three";
import { assemble, part } from "./shipKit.js";
import {
  loftProfile,
  loftFrame,
  framePlate,
  groove,
  quadFacing,
  tube,
  cylZ,
  rng,
  jitterColor,
  mulColor,
  mixColor,
  lin,
  facetedDome,
} from "./venatorKit.js";
import {
  ARQUITENS,
  L,
  Z,
  Y0,
  SLOT_X,
  SPINE_X,
  wOut,
  wallX,
  wallTop,
  deckC,
  spineUp,
  keel,
  keelP,
  BLOCK,
  NECK,
  HEAD,
  NACELLE,
  BAR,
  PAL,
  HULL_TEXEL,
} from "./arquitensSpec.js";
import {
  chamfer,
  blockHalfW,
  mbox,
  prongSection,
  PRONG_TAGS,
  mainSection,
  MAIN_TAGS,
  aftSection,
  AFT_TAGS,
  blockSections,
  BLOCK_TAGS,
  noseSections,
  NOSE_TAGS,
  fillerSections,
  bridgeNeck,
  headSections,
  headCap,
  nacelleDefs,
  nacelle,
  engineBar,
  wing,
} from "./arquitensGeo.js";
import {
  deckDetail,
  deckHeightAt,
  wallDetail,
  bellyDetail,
  tipDetail,
  noseDetail,
  wingDetail,
  blockDetail,
} from "./arquitensDetail.js";
import { heavyTurret, lightTurret, HEAVY, LIGHT } from "./arquitensTurrets.js";

// broadside gun bays in the flank walls (zr), two in each prong wall and two on the main body
const BAY_Z = [46, 86, 150, 200];

export { ARQUITENS };

// zone tag -> [material, tint]
const ZONES = {
  deck: ["hull", PAL.deck],
  spine: ["hull", mulColor(PAL.deck, 0.93)],
  spineTop: ["hull", PAL.deck],
  wall: ["hull", PAL.wall],
  tip: ["hull", PAL.wall],
  ledge: ["hull", PAL.ledge],
  belly: ["hull", PAL.belly],
  inner: ["hull", PAL.inner],
  block: ["hull", PAL.block],
  blockTop: ["hull", PAL.deck],
  transom: ["hull", PAL.transom],
  trim: ["paint", PAL.red],
  noseTop: ["paint", PAL.red],
  slot: ["dark", PAL.recess],
};

function buildLod(lod) {
  const rand = rng(31 + lod * 977);
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const fine = lod === 0;
  const mid = lod <= 1;
  const texel = HULL_TEXEL[lod];
  // every part is shifted by Y0 after tagging so the model origin sits at the hull's mid-height
  const add = (geo, mat, opts = {}) => {
    const p = part(geo, mat, { lod, ...opts });
    p.geo.translate(0, Y0, 0);
    parts.push(p);
    return p;
  };
  const addZones = (geos, texelOverride = null) => {
    for (const [tag, geo] of Object.entries(geos)) {
      const [mat, color] = ZONES[tag] || ZONES.wall;
      add(geo, mat, {
        color,
        uv: mat === "hull" ? "keep" : "planar",
        texel: texelOverride || (mat === "paint" ? 1 / 10 : 1 / 6),
      });
    }
  };
  const loft = (secs, tags, capTag, extra = {}) =>
    loftProfile(secs, { tags, capTag, uv: texel, ...extra });

  // -------------------------------------------------------------------------
  // hull lofts: prongs, main body, aft body, block/ramp, nose, filler
  // -------------------------------------------------------------------------
  const prongZ = fine
    ? [1.5, 8, 20, 35, 50, 57, 64, 82, 96, 107]
    : mid
      ? [1.5, 30, 60, 85, 107]
      : [1.5, 60, 107];
  const prongSecs = {};
  for (const s of [-1, 1]) {
    const secs = prongZ.map((zr) => prongSection(zr, s));
    prongSecs[s] = secs;
    addZones(loft(secs, PRONG_TAGS, "tip"));
  }
  const mainZ = fine
    ? [103, 108, 114, 125, 140, 160, 182, 190, 205, 218, 232]
    : mid
      ? [103, 125, 160, 182, 190, 210, 232]
      : [103, 182, 190, 232];
  const mainSecs = mainZ.map((zr) => mainSection(zr));
  addZones(loft(mainSecs, MAIN_TAGS, "slot"));
  const aftZ = fine
    ? [226, 232, 240, 250, 260, 272]
    : mid
      ? [226, 232, 250, 272]
      : [226, 232, 272];
  const aftSecs = aftZ.map((zr) => aftSection(zr, zr < 232 ? 0.992 : 1));
  addZones(loft(aftSecs, AFT_TAGS, "transom"));
  const blockSecs = blockSections(lod);
  addZones(loft(blockSecs, BLOCK_TAGS, "block"));
  addZones(loft(noseSections(), NOSE_TAGS, "wall"));
  addZones(
    loft(fillerSections(), ["slot", "slot", "slot", "slot"], "slot", {
      capStart: true,
      capEnd: true,
    }),
  );

  // -------------------------------------------------------------------------
  // bridge: neck, head with its window band, mast
  // -------------------------------------------------------------------------
  add(bridgeNeck(), "hull", { color: PAL.block, texel });
  addZones(loft(headSections(), BLOCK_TAGS, "block"));
  add(headCap(), "hull", { color: PAL.deck, texel });
  {
    const H = HEAD;
    // dark recessed window band across the upper half of the front face, lit panes inside it
    const yb = H.y0 + 4.6;
    const hb = 3.6;
    add(
      mbox(
        1,
        -(H.halfW - 2),
        H.halfW - 2,
        yb - hb / 2,
        yb + hb / 2,
        H.z0 - 0.3,
        H.z0 + 0.4,
      ),
      "dark",
      { color: PAL.recess, texel: 1 / 3 },
    );
    const nw = fine ? 7 : mid ? 5 : 3;
    const pitch = ((H.halfW - 2.6) * 2) / nw;
    for (let k = 0; k < nw; k++) {
      const x = -(H.halfW - 2.6) + pitch * (k + 0.5);
      add(
        quadFacing(
          [x, yb + 0.1, Z(H.z0) - 0.36],
          [0, 0, -1],
          [0, 1, 0],
          pitch * 0.72,
          hb - 1.1,
        ),
        "windows",
        { color: k % 3 === 1 ? PAL.windowCool : PAL.windowWarm },
      );
    }
    if (mid) {
      // side panes and a pair of skylights on the cap
      for (const s of [-1, 1])
        for (let k = 0; k < (fine ? 4 : 2); k++) {
          const zr = H.z0 + 3.5 + k * (fine ? 3 : 6);
          add(
            quadFacing(
              [s * (H.halfW + 0.12), yb, Z(zr)],
              [s, 0, 0],
              [0, 1, 0],
              1.8,
              1.6,
            ),
            "windows",
            { color: k % 2 ? PAL.windowCool : PAL.windowWarm },
          );
        }
      for (const s of [-1, 1])
        add(
          quadFacing(
            [s * 6.5, H.y1 + 0.03, Z(H.z0 + 4.5)],
            [0, 1, 0],
            [0, 0, -1],
            5,
            2.6,
          ),
          "windows",
          { color: PAL.windowCool },
        );
      // aerials, a sensor dome and a comm dish on the cap; pipe greebles on the neck
      add(
        tube([0, H.y1, Z(H.z1 - 3)], [0, H.y1 + 5, Z(H.z1 - 3)], 0.28, 6),
        "dark",
        {
          color: PAL.dark,
        },
      );
      add(
        facetedDome(1.8, 1.3, 8, 2).translate(-7.5, H.y1, Z(H.z1 - 3.5)),
        "hull",
        {
          color: PAL.block,
          texel: 1 / 4,
        },
      );
      if (fine) {
        add(
          new THREE.BoxGeometry(2.4, 0.7, 3).translate(
            7,
            H.y1 + 0.35,
            Z(H.z1 - 3.5),
          ),
          "dark",
          {
            color: PAL.dark,
          },
        );
        add(
          tube(
            [7, H.y1 + 0.7, Z(H.z1 - 3.5)],
            [7, H.y1 + 4, Z(H.z1 - 3.5)],
            0.16,
            5,
          ),
          "dark",
          {
            color: PAL.dark,
          },
        );
        for (const s of [-1, 1]) {
          add(
            tube(
              [s * (NECK.halfW + 0.3), NECK.y0, Z(NECK.z0 + 3)],
              [s * (NECK.halfW + 0.3), NECK.y1 - 0.5, Z(NECK.z0 + 3)],
              0.3,
              6,
            ),
            "dark",
            { color: PAL.dark },
          );
          add(
            mbox(
              s,
              NECK.halfW,
              NECK.halfW + 0.8,
              NECK.y0 + 2,
              NECK.y0 + 5.5,
              NECK.z0 + 6,
              NECK.z1 - 2,
            ),
            "dark",
            { color: PAL.recess, texel: 1 / 3 },
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // engines: three nacelles, red rings, bar and struts
  // -------------------------------------------------------------------------
  const N = NACELLE;
  for (const def of nacelleDefs()) {
    const n = nacelle(def, lod);
    for (const g of n.hull) add(g, "hull", { color: PAL.nacelle, texel });
    for (const g of n.dark) add(g, "dark", { color: PAL.dark, texel: 1 / 5 });
    // red ring round the dome base
    const seg = fine ? 24 : mid ? 16 : 10;
    const rr = def.r + 0.45;
    const ringLen = N.ringZ[1] - N.ringZ[0];
    add(
      cylZ(rr, rr, ringLen, seg, true).translate(
        def.x,
        N.y,
        Z((N.ringZ[0] + N.ringZ[1]) / 2),
      ),
      "paint",
      { color: PAL.red, texel: 1 / 10 },
    );
    if (mid)
      for (const zr of N.ringZ) {
        const face = new THREE.RingGeometry(def.r * 0.97, rr, seg, 1)
          .toNonIndexed()
          .translate(def.x, N.y, Z(zr));
        add(face, "paint", { color: PAL.redDark, texel: 1 / 10 });
      }
    if (fine) {
      // longitudinal ribs and two stiffener rings on the body
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const g = new THREE.BoxGeometry(1.2, 0.7, 22);
        g.translate(0, def.r + 0.25, 0);
        g.rotateZ(a);
        g.translate(def.x, N.y, Z((N.ringZ[1] + N.nozzleZ) / 2));
        add(g, "hull", { color: mulColor(PAL.nacelle, 0.9), texel: 1 / 5 });
      }
      for (const zr of [298, 310])
        add(
          cylZ(def.r + 0.3, def.r + 0.3, 1.2, seg, true).translate(
            def.x,
            N.y,
            Z(zr),
          ),
          "dark",
          { color: PAL.dark, texel: 1 / 5 },
        );
    }
    engines.push({ pos: [def.x, N.y + Y0, n.mouth], r: N.nozzleR * 0.85 });
  }
  add(engineBar(), "paint", { color: PAL.red, texel: 1 / 10 });
  if (mid) {
    // dark seam along the bar and end plates where it enters the outer nacelles
    add(
      mbox(1, -BAR.x, BAR.x, BAR.y - 0.5, BAR.y + 0.5, BAR.z0 - 0.15, BAR.z0),
      "dark",
      { color: PAL.seam },
    );
  }
  for (const s of [-1, 1]) add(wing(s), "hull", { color: PAL.ledge, texel });

  // -------------------------------------------------------------------------
  // surface detail
  // -------------------------------------------------------------------------
  const ctx = { add, rand, lod, fine, mid, texel, mainSecs, prongSecs };
  deckDetail(ctx);
  if (mid) {
    wallDetail(ctx, BAY_Z);
    bellyDetail(ctx);
    tipDetail(ctx);
    noseDetail(ctx);
    blockDetail(ctx);
  }
  wingDetail(ctx);

  // -------------------------------------------------------------------------
  // turrets and hardpoints
  // -------------------------------------------------------------------------
  const heavy = (pos, fwd) => {
    turrets.push({
      type: "heavy",
      pos: [pos[0], pos[1] + Y0, pos[2]],
      up: [0, 1, 0],
      forward: fwd,
    });
    const d = new THREE.Vector3(...fwd).normalize();
    hardpoints.push({
      pos: [pos[0], pos[1] + Y0 + HEAVY.pivotY, pos[2]].map(
        (v) => +v.toFixed(2),
      ),
      dir: d.toArray().map((v) => +v.toFixed(3)),
      kind: "heavy",
      range: 12000,
      turret: turrets.length - 1,
    });
  };
  const light = (pos, fwd, up = [0, 1, 0]) => {
    const u = new THREE.Vector3(...up).normalize();
    const d = new THREE.Vector3(...fwd).normalize();
    turrets.push({
      type: "light",
      pos: [pos[0], pos[1] + Y0, pos[2]],
      up: u.toArray(),
      forward: fwd,
    });
    const pv = new THREE.Vector3(pos[0], pos[1] + Y0, pos[2]).addScaledVector(
      u,
      LIGHT.pivotY,
    );
    hardpoints.push({
      pos: pv.toArray().map((v) => +v.toFixed(2)),
      dir: d.toArray().map((v) => +v.toFixed(3)),
      kind: "light",
      range: 6000,
      turret: turrets.length - 1,
    });
  };
  const fixed = (pos, dir, kind = "light") => {
    hardpoints.push({
      pos: [pos[0], pos[1] + Y0, pos[2]].map((v) => +v.toFixed(2)),
      dir,
      kind,
      range: kind === "heavy" ? 12000 : 6000,
    });
  };
  if (lod === 0) {
    for (const s of [-1, 1]) {
      // deck shoulders forward of the bridge
      const zd = 135;
      heavy([s * 26, deckHeightAt(zd, 26) + 0.3, Z(zd)], [s * 0.35, 0, -1]);
      // ledge platforms at the shoulder jog where the deck begins
      const zp = 104;
      heavy([s * (wOut(zp) + 0.5), 0, Z(zp)], [s * 0.7, 0, -1]);
      // light emplacements: prong tips, beside the bridge, ventral
      light([s * 11.5, wallTop(24) + 0.4, Z(24)], [s * 0.3, 0, -1]);
      light([s * 25, deckHeightAt(206, 25) + 0.2, Z(206)], [s * 0.6, 0, -1]);
      light([s * 14, -keel(160) * 0.72, Z(160)], [s * 0.4, 0, -1], [0, -1, 0]);
      // fixed broadside bays in the walls and forward tubes beside the nose block
      for (const zr of BAY_Z)
        fixed([s * (wallX(zr) + 5.8), wallTop(zr) * 0.5, Z(zr)], [s, 0, 0]);
      fixed([s * (SLOT_X + 2.55), wallTop(98) + 1.5, Z(86)], [0, 0, -1]);
    }
  }
  // turret pedestals (hex bases) and prong-shoulder platforms
  for (const s of [-1, 1]) {
    add(mbox(s, wallX(104) - 2, wOut(104) + 4.5, -1.6, 0, 95, 113), "hull", {
      color: PAL.ledge,
      texel,
    });
    if (mid) {
      add(
        new THREE.CylinderGeometry(7, 7.4, 1, 6).translate(
          s * 26,
          deckHeightAt(135, 26) + 0.3,
          Z(135),
        ),
        "hull",
        { color: mulColor(PAL.deck, 0.9), texel: 1 / 4 },
      );
      add(
        new THREE.CylinderGeometry(7, 7.4, 0.6, 6).translate(
          s * (wOut(104) + 0.5),
          0.2,
          Z(104),
        ),
        "hull",
        { color: mulColor(PAL.ledge, 0.9), texel: 1 / 4 },
      );
    }
  }

  return { parts, hardpoints, engines, turrets, prongSecs, mainSecs };
}

function build(mats) {
  const all = [];
  let hardpoints = [];
  let engines = [];
  let turrets = [];
  const triangles = [];
  for (const lod of [0, 1, 2]) {
    const r = buildLod(lod);
    all.push(...r.parts);
    if (lod === 0) {
      hardpoints = r.hardpoints;
      engines = r.engines;
      turrets = r.turrets;
    }
    triangles.push(
      r.parts.reduce((a, p) => a + p.geo.attributes.position.count / 3, 0),
    );
  }
  const heavy = heavyTurret();
  const light = lightTurret();
  const model = assemble(
    {
      id: "arquitens",
      side: "republic",
      length: L,
      parts: all,
      hardpoints,
      engines,
      bounds: { radius: 190 },
      turretTypes: {
        heavy: {
          body: heavy.body,
          barrels: heavy.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(PAL.deck, 0.92),
          barrelColor: PAL.dark,
          texel: 1 / 3,
          ...HEAVY,
        },
        light: {
          body: light.body,
          barrels: light.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(PAL.deck, 0.9),
          barrelColor: PAL.dark,
          texel: 1 / 2,
          ...LIGHT,
        },
      },
      turrets,
    },
    mats,
  );
  model.triangles = triangles;
  return model;
}

export function buildArquitens(mats) {
  return build(mats);
}
