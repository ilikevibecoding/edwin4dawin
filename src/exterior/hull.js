// Star Destroyer exterior: the lofted wedge (with knife-edge trenches), the keel with the hangar
// wells cut through it, the terraced dorsal superstructure, the command tower with its bridge module,
// shield domes and sensor mast, the stern engine block and the ventral reactor bulb.
// Surface detail (greebles, turbolasers, hatches, antennas, running lights) lives in greebles.js.
import * as THREE from "three";
import { Kit, loft, taperedBox, panelWithHoles, worldUVs, insideOut } from "../kit.js";
import { HULL, halfWidth, dorsalY, keelY, TERRACES, TOWER_BASE, TOWER, ENGINES, REACTOR_BULB, HANGAR_WELL, SHUTTLE_WELL, ROOMS, terraceTopY, towerBaseTopY } from "../config/layout.js";
import { IMP, NO_SHADOW_KEYS } from "../materials/imperial.js";

const TEXEL = 1 / 48; // one hull-plate tile per 48 m

// per-triangle tone jitter so neighbouring facets never read as one flat sheet
function facetTint(geo, base, spread = 0.05, seed = 1) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rnd() - 0.5) * 2 * spread;
    for (let j = 0; j < 3; j++) {
      arr[(i + j) * 3] = base.r * k;
      arr[(i + j) * 3 + 1] = base.g * k;
      arr[(i + j) * 3 + 2] = base.b * k;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

// Cross-section of the main wedge at z, as an OPEN polyline from the starboard keel corner, around
// the starboard edge, over the top and down the port edge to the port keel corner (CCW seen from +Z).
function wedgeSection(z) {
  const w = halfWidth(z);
  const e = HULL.edgeHalf;
  const yd = dorsalY(z);
  const yk = keelY(z);
  const wt = w * HULL.dorsalPlateauFrac;
  const wk = w * HULL.keelFlatFrac;
  const td = Math.min(HULL.edgeTrenchDepth, w * 0.45);
  // always 12 points so every station lofts to the next
  return [
    [wk, yk],
    [w, -e],
    [w - td, -e * 0.45], // trench floor
    [w - td, e * 0.45],
    [w, e],
    [wt, yd],
    [-wt, yd],
    [-w, e],
    [-w + td, e * 0.45],
    [-w + td, -e * 0.45],
    [-w, -e],
    [-wk, yk],
  ];
}

export function buildExterior(mats, opts = {}) {
  const group = new THREE.Group();
  group.name = "exterior";
  const kit = new Kit(mats);
  const hullCol = IMP.hull;

  // ---- main wedge (open loft, keel strip separate) ------------------------------------------
  const zs = [HULL.bowZ, HULL.bowZ + 4, -600, -400, -200, 0, 200, 400, 600, HULL.sternZ];
  // the tip station needs the same point count as the rest: build every station with the full profile
  const stations = zs.map((z) => ({ z, points: wedgeSection(Math.max(z, HULL.bowZ + 4)) }));
  stations[0].points = stations[0].points.map(([x, y]) => [x * 0.05, y * 0.05]);
  {
    const g = loft(stations, { open: true });
    worldUVs(g, TEXEL);
    // kit.add assigns a uniform vertex colour; the facet tint goes on the merged-ready geometry it returns
    facetTint(kit.add("hullPlate", g, { uv: "keep", color: hullCol }), hullCol, 0.04, 11);
  }
  // trench interiors darker: a second, slightly inset loft of just the trench walls would double
  // geometry; instead tint the trench facets via a dedicated dark loft strip
  {
    const trench = (side) =>
      zs.slice(1).map((z) => {
        const w = halfWidth(z);
        const e = HULL.edgeHalf;
        const td = Math.min(HULL.edgeTrenchDepth, w * 0.5);
        return { z, points: side > 0 ? [[w - td + 0.05, -e * 0.45], [w - td + 0.05, e * 0.45]] : [[-w + td - 0.05, e * 0.45], [-w + td - 0.05, -e * 0.45]] };
      });
    for (const side of [-1, 1]) {
      const g = loft(trench(side), { open: true });
      worldUVs(g, TEXEL * 4);
      kit.add("hullDark", g, { uv: "keep", color: IMP.trench });
    }
  }
  // ---- keel strips with the hangar wells cut out ----------------------------------------------
  {
    const wells = [HANGAR_WELL, SHUTTLE_WELL].sort((a, b) => a.z0 - b.z0);
    const ranges = [];
    let z = HULL.bowZ + 4;
    for (const w of wells) {
      ranges.push({ z0: z, z1: w.z0, hole: null });
      ranges.push({ z0: w.z0, z1: w.z1, hole: w });
      z = w.z1;
    }
    ranges.push({ z0: z, z1: HULL.sternZ, hole: null });
    const keelPts = (z, hole) => {
      const wk = halfWidth(z) * HULL.keelFlatFrac;
      const y = keelY(z);
      // strip runs starboard -> port along -x so its normal faces down (-y)
      if (!hole) return [[[wk, y], [-wk, y]]];
      return [
        [[wk, y], [hole.x1, y]],
        [[hole.x0, y], [-wk, y]],
      ];
    };
    for (const r of ranges) {
      const a = keelPts(r.z0, r.hole);
      const b = keelPts(r.z1, r.hole);
      for (let i = 0; i < a.length; i++) {
        const g = loft([{ z: r.z0, points: a[i] }, { z: r.z1, points: b[i] }], { open: true });
        worldUVs(g, TEXEL);
        kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
      }
      if (r.hole) {
        // well shaft walls from the keel up to the deck opening, plus a lit rim
        const h = r.hole;
        const yTop = h.yDeck + 0.5;
        const yBot = keelY((h.z0 + h.z1) / 2) - 0.2;
        const t = 1.2;
        kit.boxMM("hullDark", [h.x0 - t, yBot, h.z0 - t], [h.x0, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x1, yBot, h.z0 - t], [h.x1 + t, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x0, yBot, h.z0 - t], [h.x1, yTop, h.z0], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x0, yBot, h.z1], [h.x1, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        // rim lights around the opening (visible from below)
        for (const [x0, x1, z0, z1] of [
          [h.x0 - 2.5, h.x0 - 1.2, h.z0, h.z1],
          [h.x1 + 1.2, h.x1 + 2.5, h.z0, h.z1],
          [h.x0, h.x1, h.z0 - 2.5, h.z0 - 1.2],
          [h.x0, h.x1, h.z1 + 1.2, h.z1 + 2.5],
        ]) {
          kit.boxMM("emitWhite", [x0, yBot - 0.3, z0], [x1, yBot - 0.1, z1]);
        }
        // approach lights: rows of red/green markers on the keel leading to the well
        for (let k = 1; k <= 6; k++) {
          const zz = h.z0 - k * 12;
          const yy = keelY(zz) - 0.6;
          kit.box("emitRed", h.x0 - 6, yy, zz, 1.2, 0.6, 1.2);
          kit.box("emitGreen", h.x1 + 6, yy, zz, 1.2, 0.6, 1.2);
        }
      }
    }
  }
  // ---- stern face --------------------------------------------------------------------------
  {
    const pts = wedgeSection(HULL.sternZ);
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape, 1);
    g.translate(0, 0, HULL.sternZ);
    worldUVs(g, TEXEL);
    kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
    // engine block: a recessed dark plate carrying the thrusters, inset from the stern silhouette
    {
      const cy = -8;
      const inset = pts.map(([x, y]) => new THREE.Vector2(x * 0.86, cy + (y - cy) * 0.8));
      const blk = new THREE.ExtrudeGeometry(new THREE.Shape(inset), { depth: 0.8, bevelEnabled: false });
      blk.translate(0, 0, HULL.sternZ - 0.2);
      worldUVs(blk, TEXEL * 6);
      kit.add("hullDark", blk, { uv: "keep", color: IMP.trench });
      // armoured rim around the recessed engine block: a frame (the inset plate outline is the hole),
      // so the dark block reads as a 2 m deep recess with the bells emerging from it
      const lipShape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.9, cy + (y - cy) * 0.86)));
      lipShape.holes.push(new THREE.Path(inset.slice().reverse()));
      const lip = new THREE.ExtrudeGeometry(lipShape, { depth: 2.6, bevelEnabled: false });
      lip.translate(0, 0, HULL.sternZ - 0.1);
      worldUVs(lip, TEXEL);
      kit.add("hullPlate", lip, { uv: "keep", color: IMP.hullLight });
      // inner step of the recess wall (a second, thinner frame) so the rim has a stepped profile
      const lip2Shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.88, cy + (y - cy) * 0.83)));
      lip2Shape.holes.push(new THREE.Path(inset.slice().reverse()));
      const lip2 = new THREE.ExtrudeGeometry(lip2Shape, { depth: 1.2, bevelEnabled: false });
      lip2.translate(0, 0, HULL.sternZ - 0.1);
      worldUVs(lip2, TEXEL * 4);
      kit.add("hullDark", lip2, { uv: "keep", color: IMP.hullDark });
    }
    for (const e of [...ENGINES.main, ...ENGINES.secondary]) {
      const L = e.r > 30 ? ENGINES.bellLength : ENGINES.bellLength * 0.6;
      // outer bell (open cylinder, slightly flared aft)
      const bell = new THREE.CylinderGeometry(e.r * 1.04, e.r * 0.92, L, 40, 1, true);
      bell.rotateX(Math.PI / 2);
      kit.add("hullDark", bell, { pos: [e.x, e.y, HULL.sternZ + L / 2], color: IMP.hullDark, uv: "scale", uvScale: [12, 2] });
      // inner wall (visible looking into the bell) and the glowing throat
      const inner = insideOut(new THREE.CylinderGeometry(e.r * 0.86, e.r * 1.0, L * 0.95, 40, 1, true));
      inner.rotateX(Math.PI / 2);
      kit.add("hullDark", inner, { pos: [e.x, e.y, HULL.sternZ + L / 2], color: IMP.trench, uv: "scale", uvScale: [12, 2] });
      const glow = new THREE.CircleGeometry(e.r * 0.88, 40);
      kit.add("emitEngine", glow, { pos: [e.x, e.y, HULL.sternZ + L * 0.12], uv: "keep" });
      // glowing lining from the throat to just short of the mouth, so the ion glow reads from oblique
      // angles too (the throat disc alone is hidden behind the narrowing inner wall). UVs are remapped
      // so the glow shader's radial falloff runs along the bell: bright at the throat, fading aft.
      {
        const Lg = L * 0.72;
        const lining = insideOut(new THREE.CylinderGeometry(e.r * 0.8, e.r * 0.875, Lg, 40, 1, true));
        lining.rotateX(Math.PI / 2);
        const pos = lining.attributes.position;
        const uv = lining.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const t = (pos.getZ(i) + Lg / 2) / Lg; // 0 at the throat end, 1 toward the mouth
          uv.setXY(i, 0.5 + 0.5 * t, 0.5);
        }
        kit.add("emitEngine", lining, { pos: [e.x, e.y, HULL.sternZ + L * 0.13 + Lg / 2], uv: "keep" });
      }
      // ring vanes around the mouth
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.TorusGeometry(e.r * (0.95 + k * 0.04), e.r * 0.02, 8, 48);
        kit.add("hullPlate", ring, { pos: [e.x, e.y, HULL.sternZ + L * (0.35 + k * 0.28)], color: IMP.hullLight, uv: "scale", uvScale: [8, 1] });
      }
      // mounting collar
      const collar = new THREE.CylinderGeometry(e.r * 1.16, e.r * 1.16, 6, 40);
      collar.rotateX(Math.PI / 2);
      kit.add("hullPlate", collar, { pos: [e.x, e.y, HULL.sternZ + 3], color: hullCol, uv: "scale", uvScale: [16, 0.5] });
    }
  }
  // ---- dorsal terraces ----------------------------------------------------------------------
  {
    const buildTerrace = (t, baseYOf) => {
      const st = [];
      const zs2 = [t.z0, t.z0 + 45, t.z0 + 120, 400, 500, 600, 700, HULL.sternZ].filter((z, i, a) => z >= t.z0 && z <= t.z1 && a.indexOf(z) === i).sort((a, b) => a - b);
      for (const z of zs2) {
        const w = halfWidth(z);
        const top = w * t.halfTopFrac;
        const base = top + t.slopeRun;
        const yb = baseYOf(z);
        const rise = z < t.z0 + 45 ? t.rise * Math.max(0.02, (z - t.z0) / 45) : t.rise;
        st.push({ z, points: [[base, yb], [top, yb + rise], [-top, yb + rise], [-base, yb]] });
      }
      const g = loft(st, { open: true, capEnd: false });
      worldUVs(g, TEXEL);
      return g;
    };
    const t1 = buildTerrace(TERRACES[0], (z) => dorsalY(z) - 0.3);
    kit.add("hullPlate", t1, { uv: "keep", color: hullCol });
    const t2 = buildTerrace(TERRACES[1], (z) => dorsalY(z) + TERRACES[0].rise - 0.3);
    kit.add("hullPlate", t2, { uv: "keep", color: IMP.hullLight });
    // stern faces of the terraces (they end flush with the stern)
    for (const [t, y0, y1] of [
      [TERRACES[0], dorsalY(HULL.sternZ), dorsalY(HULL.sternZ) + TERRACES[0].rise],
      [TERRACES[1], dorsalY(HULL.sternZ) + TERRACES[0].rise, dorsalY(HULL.sternZ) + TERRACES[0].rise + TERRACES[1].rise],
    ]) {
      const w = halfWidth(HULL.sternZ);
      const top = w * t.halfTopFrac;
      const base = top + t.slopeRun;
      const shape = new THREE.Shape([new THREE.Vector2(-base, y0), new THREE.Vector2(base, y0), new THREE.Vector2(top, y1), new THREE.Vector2(-top, y1)]);
      const g = new THREE.ShapeGeometry(shape, 1);
      g.translate(0, 0, HULL.sternZ + 0.05);
      worldUVs(g, TEXEL);
      kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
    }
    // tower base block (T3)
    const tb = TOWER_BASE;
    const yb = dorsalY((tb.z0 + tb.z1) / 2) + TERRACES[0].rise + TERRACES[1].rise - 0.3;
    const g3 = taperedBox((tb.halfTop + tb.slopeRun) * 2, tb.z1 - tb.z0, tb.halfTop * 2, tb.z1 - tb.z0 - 16, tb.rise + 0.3, { shearZ: 4 });
    worldUVs(g3, TEXEL);
    kit.add("hullPlate", g3, { pos: [0, yb, (tb.z0 + tb.z1) / 2], uv: "keep", color: hullCol });
    // plinth: T2's top rises with z, so the block's flat base would float ~3.6 m above it at the front
    // and its base is wider than T2's top everywhere. A vertical foundation slab, sunk deep enough to
    // meet T2's flanks, carries the block; the buried part is hidden inside the terrace.
    kit.boxMM("hullPlate", [-(tb.halfTop + tb.slopeRun) + 1.5, yb - 22, tb.z0 + 0.4], [tb.halfTop + tb.slopeRun - 1.5, yb + 0.4, tb.z1 - 0.4], { color: IMP.hullDark, texel: TEXEL });
  }
  // ---- command tower ------------------------------------------------------------------------
  {
    const nk = TOWER.neck;
    const y0 = towerBaseTopY() - 0.5;
    const h = nk.yTop - y0;
    const neck = taperedBox(nk.halfBase * 2, nk.z1 - nk.z0, nk.halfTop * 2, nk.z1 - nk.z0 - 12, h, { shearZ: 2 });
    worldUVs(neck, TEXEL);
    kit.add("hullPlate", neck, { pos: [0, y0, (nk.z0 + nk.z1) / 2], uv: "keep", color: hullCol });
    // neck detail: spine ribs on the front face and window rows on the flanks. The front face recedes
    // 8 m and the flanks taper 6 m over the neck's height, so both follow the tapered faces instead
    // of standing vertical (which left the rib tops and upper window rows floating in front of them).
    const neckFrontZ = (y) => nk.z0 + 8 * ((y - y0) / h); // front face z at height y (shearZ 2 + taper)
    const neckHalfX = (y) => nk.halfBase - (nk.halfBase - nk.halfTop) * ((y - y0) / h);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const x = s * (nk.halfBase - 6 - k * 7);
        const ry0 = y0 + 4;
        const ry1 = nk.yTop - 3;
        const rib = taperedBox(2.4, 3, 2.4, 3.0001, ry1 - ry0, { shearZ: neckFrontZ(ry1) - neckFrontZ(ry0) });
        worldUVs(rib, TEXEL * 4);
        kit.add("hullPlate", rib, { pos: [x, ry0, neckFrontZ(ry0)], uv: "keep", color: IMP.hullLight });
      }
      for (let row = 0; row < 5; row++) {
        const y = y0 + 12 + row * 11;
        for (let k = 0; k < 6; k++) kit.box("emitWhite", s * (neckHalfX(y) + 0.05), y, nk.z0 + 10 + k * 9, 0.4, 1.4, 3.2);
      }
    }
    // bridge module: box with the window band opening cut out of the front face
    const bm = TOWER.bridgeModule;
    const W = bm.halfX * 2;
    const H = bm.y1 - bm.y0;
    const D = bm.z1 - bm.z0;
    const cy = (bm.y0 + bm.y1) / 2;
    const cz = (bm.z0 + bm.z1) / 2;
    const wb = ROOMS.bridge.windowBand;
    const hole = { x: 0, y: (wb.y0 + wb.y1) / 2 - 0.4 - cy, w: wb.x1 - wb.x0 + 4, h: wb.y1 - wb.y0 + 2.2 };
    const front = panelWithHoles(W, H, 1.0, [hole]);
    worldUVs(front, TEXEL);
    kit.add("hullPlate", front, { pos: [0, cy, bm.z0 + 0.5], uv: "keep", color: IMP.hullLight });
    // window frame lip so the opening reads as a set-in armoured casement from outside
    kit.boxMM("hullDark", [wb.x0 - 3, wb.y0 - 1.6, bm.z0 - 1.2], [wb.x1 + 3, wb.y0 - 0.6, bm.z0 + 2], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [wb.x0 - 3, wb.y1 + 0.8, bm.z0 - 1.2], [wb.x1 + 3, wb.y1 + 1.8, bm.z0 + 2], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [wb.x0 - 3, wb.y0 - 1.6, bm.z0 - 1.2], [wb.x0 - 2, wb.y1 + 1.8, bm.z0 + 2], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [wb.x1 + 2, wb.y0 - 1.6, bm.z0 - 1.2], [wb.x1 + 3, wb.y1 + 1.8, bm.z0 + 2], { color: IMP.trench, texel: 0.2 });
    // other five faces
    kit.boxMM("hullPlate", [-bm.halfX, bm.y0, bm.z0 + 1], [bm.halfX, bm.y0 + 1, bm.z1], { color: IMP.hullDark, texel: TEXEL });
    kit.boxMM("hullPlate", [-bm.halfX, bm.y1 - 1, bm.z0 + 1], [bm.halfX, bm.y1, bm.z1], { color: IMP.hullLight, texel: TEXEL });
    kit.boxMM("hullPlate", [-bm.halfX, bm.y0, bm.z1 - 1], [bm.halfX, bm.y1, bm.z1], { color: hullCol, texel: TEXEL });
    kit.boxMM("hullPlate", [-bm.halfX, bm.y0, bm.z0 + 1], [-bm.halfX + 1, bm.y1, bm.z1], { color: hullCol, texel: TEXEL });
    kit.boxMM("hullPlate", [bm.halfX - 1, bm.y0, bm.z0 + 1], [bm.halfX, bm.y1, bm.z1], { color: hullCol, texel: TEXEL });
    // module trim: a stepped ledge along the front and sides, window rows on the flanks
    kit.boxMM("hullPlate", [-bm.halfX - 2, bm.y0 - 3, bm.z0 - 2], [bm.halfX + 2, bm.y0, bm.z1 + 2], { color: IMP.hullDark, texel: TEXEL });
    for (const s of [-1, 1]) {
      for (let k = 0; k < 10; k++) kit.box("emitWhite", s * (bm.halfX + 0.05), bm.y0 + 14, bm.z0 + 8 + k * 9.5, 0.3, 1.2, 4);
      for (let k = 0; k < 12; k++) kit.box("emitWhite", s * (bm.halfX - 6 - k * 7), bm.y1 + 0.4, bm.z0 + 6, 3.5, 0.6, 0.3);
    }
    // shield generator domes on pedestals
    for (const d of TOWER.domes) {
      const ped = new THREE.CylinderGeometry(d.r * 0.55, d.r * 0.8, d.y - d.r * 0.55 - bm.y1, 24);
      kit.add("hullPlate", ped, { pos: [d.x, (bm.y1 + d.y - d.r * 0.55) / 2, d.z], color: IMP.hullDark, uv: "scale", uvScale: [4, 1] });
      kit.add("hullPlate", new THREE.SphereGeometry(d.r, 40, 28), { pos: [d.x, d.y, d.z], color: IMP.hullLight, uv: "scale", uvScale: [6, 3] });
      // equatorial band + polar cap
      kit.add("hullDark", new THREE.TorusGeometry(d.r * 1.005, d.r * 0.05, 8, 64), { pos: [d.x, d.y - d.r * 0.1, d.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
      kit.add("hullDark", new THREE.CylinderGeometry(d.r * 0.18, d.r * 0.25, 1.5, 16), { pos: [d.x, d.y + d.r, d.z], color: IMP.trench, uv: "scale", uvScale: [2, 0.2] });
    }
    // sensor / comms mast
    const m = TOWER.mast;
    kit.add("hullPlate", new THREE.CylinderGeometry(m.r, m.r * 1.6, m.y1 - m.y0, 12), { pos: [m.x, (m.y0 + m.y1) / 2, m.z], color: hullCol, uv: "scale", uvScale: [4, 3] });
    kit.boxMM("hullPlate", [m.x - 7, m.y1 - 6, m.z - 5], [m.x + 7, m.y1, m.z + 5], { color: IMP.hullLight, texel: TEXEL * 4 });
    kit.boxMM("hullPlate", [m.x - 9, m.y1 - 2, m.z - 1.2], [m.x + 9, m.y1 - 0.6, m.z + 1.2], { color: IMP.hullDark, texel: TEXEL * 4 });
    for (let k = 0; k < 3; k++) kit.add("hullPlate", new THREE.CylinderGeometry(0.25, 0.25, 12 - k * 3, 6), { pos: [m.x - 4 + k * 4, m.y1 + (12 - k * 3) / 2, m.z], color: IMP.steel, uv: "scale", uvScale: [0.5, 2] });
    kit.box("emitRed", m.x, m.y1 + 12.5, m.z, 0.8, 0.8, 0.8);
    kit.box("emitRed", m.x - 4, m.y1 + 12.3, m.z, 0.6, 0.6, 0.6);
  }
  // ---- reactor bulb --------------------------------------------------------------------------
  {
    const b = REACTOR_BULB;
    kit.add("hullPlate", new THREE.SphereGeometry(b.r, 48, 32), { pos: [b.x, b.y, b.z], color: hullCol, uv: "scale", uvScale: [8, 4] });
    // weld collar where the bulb meets the keel, and equatorial armour bands below it
    kit.add("hullDark", new THREE.TorusGeometry(b.r + 0.6, 2.2, 10, 72), { pos: [b.x, keelY(b.z) - 1.5, b.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
    for (let k = 0; k < 3; k++) kit.add("hullDark", new THREE.TorusGeometry(b.r * (1.0 + k * 0.004), b.r * 0.025, 8, 64), { pos: [b.x, b.y - b.r * 0.35 + k * 8, b.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
  }

  const meshes = kit.build(group, { noShadow: NO_SHADOW_KEYS });
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  let tris = 0;
  for (const m of meshes) if (m.geometry) tris += m.geometry.attributes.position.count / 3;
  return {
    group,
    meshes,
    stats: { meshes: meshes.length, triangles: Math.round(tris) },
    update() {},
  };
}
