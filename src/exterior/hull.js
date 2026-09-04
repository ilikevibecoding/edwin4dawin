// Exterior hull, first pass: the wedge (dorsal / ventral grids from the analytic layout functions), the side
// trench, stern face with the engine block, terraced superstructure, command tower with glazing, shield
// globes and comms mast, reactor bulb, ventral bay wells with containment fields, a first instanced greeble
// scatter and running lights. Detail passes live in the sibling modules (see PLAN.md §7).
import * as THREE from "three";
import { Kit, rng, prism } from "../core/kit.js";
import { IMP } from "../core/palette.js";
import { HULL, CITY, TOWER, ENGINES, REACTOR_BULB, BAYS, BELLY_PLATE, halfWidth, sternZAt, topY, ventralY, tOf } from "../core/layout.js";

const TR = HULL.trench;

/** Row of z values for the belly grid: uniform, with the bay plate edges inserted exactly. */
function bellyRows(n) {
  const rows = [];
  for (let i = 0; i <= n; i++) rows.push(HULL.bowZ + (i / n) * (HULL.sternZ - HULL.bowZ));
  return rows;
}

/**
 * Surface grid over the plan wedge. yFn(x,z) gives height. Cells whose centre lies inside `skip` (x0,x1,z0,z1)
 * are omitted. `flip` reverses winding (belly faces down). Vertex colour tints per plate band.
 */
function wedgeSurface(kit, mat, yFn, { rows = 96, cols = 48, skip = null, flip = false, color = IMP.hullMid, colorFn = null, uvScale = 1 / 40, edgeY = 0 } = {}) {
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const zs = bellyRows(rows);
  const grid = [];
  for (let i = 0; i <= rows; i++) {
    const zRow = zs[i];
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const s = -1 + (2 * j) / cols; // across, -1..1
      // rays from the bow to the trailing edge: corners bend forward with the stern notch
      const xe = s * HULL.halfWidthStern;
      const u = (zRow - HULL.bowZ) / (HULL.sternZ - HULL.bowZ);
      const z = HULL.bowZ + u * (sternZAt(xe) - HULL.bowZ);
      const x = u * xe;
      const y = Math.abs(s) >= 0.999 ? edgeY : yFn(x, z);
      row.push(positions.length / 3);
      positions.push(x, y, z);
      uvs.push(x * uvScale, z * uvScale);
      const c = colorFn ? colorFn(x, z) : color;
      colors.push(c.r, c.g, c.b);
    }
    grid.push(row);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = grid[i][j],
        b = grid[i][j + 1],
        c = grid[i + 1][j + 1],
        d = grid[i + 1][j];
      if (skip) {
        const cx = (positions[a * 3] + positions[c * 3]) / 2;
        const cz = (positions[a * 3 + 2] + positions[c * 3 + 2]) / 2;
        const inside = cx > skip.x0 && cx < skip.x1 && cz > skip.z0 && cz < skip.z1;
        // omit cells fully inside the plate region (the plate mesh covers it)
        const ax = positions[a * 3],
          cxx = positions[c * 3];
        const az = positions[a * 3 + 2],
          czz = positions[c * 3 + 2];
        const fully = Math.min(ax, cxx) > skip.x0 && Math.max(ax, cxx) < skip.x1 && Math.min(az, czz) > skip.z0 && Math.max(az, czz) < skip.z1;
        if (fully) continue;
        void inside;
      }
      if (flip) indices.push(a, c, b, a, d, c);
      else indices.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const col8 = new Uint8Array(colors.map((v) => Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255)));
  geo.setAttribute("color", new THREE.BufferAttribute(col8, 3, true));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  kit.add(mat, geo, { uv: "keep" });
  return geo;
}

/** Plan-view trapezoid prism between z0..z1 with half widths at each end, from y0 to y1. */
function trapPrism(kit, mat, z0, z1, hw0, hw1, y0, y1, opts = {}) {
  const shape = [
    [-hw0, z0],
    [hw0, z0],
    [hw1, z1],
    [-hw1, z1],
  ];
  const g = prism(shape, y1 - y0);
  // prism extrudes along local Z centred; rotateX(+90°) maps local y -> world z and local z -> world -y
  g.rotateX(Math.PI / 2);
  return kit.add(mat, g, { pos: [0, (y0 + y1) / 2, 0], uv: "world", texel: 1 / 30, ...opts });
}

export function buildExterior(scene, materials) {
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);
  const kit = new Kit(materials);
  const rand = rng(77);
  const bandColor = (x, z) => {
    // plate bands: subtle alternating tint by plan row so the hull never reads as one flat grey
    const band = Math.floor((z + 1100) / 60 + Math.floor(Math.abs(x) / 90) * 0.5);
    const k = ((band * 7919) % 5) / 4;
    return IMP.hullMid.clone().lerp(IMP.hullLight, k * 0.6).lerp(IMP.hullBlue, 0.2 * ((band * 31) % 3 === 0 ? 1 : 0));
  };

  // ---- dorsal and ventral surfaces
  wedgeSurface(kit, "hull", topY, { rows: 96, cols: 48, colorFn: bandColor, edgeY: TR.y1 });
  wedgeSurface(kit, "hull", ventralY, { rows: 96, cols: 48, colorFn: (x, z) => bandColor(x, z).lerp(IMP.hullDark, 0.25), flip: true, skip: BELLY_PLATE, edgeY: TR.y0 });

  // ---- belly plate around the bays: flat plate with the two wells cut through, shaft walls + fields
  {
    const B = BELLY_PLATE;
    const w = B.x1 - B.x0;
    const d = B.z1 - B.z0;
    // after rotateX(+90°) the shape's local y becomes world z
    const holes = Object.values(BAYS).map((b) => ({ x: (b.x0 + b.x1) / 2 - (B.x0 + B.x1) / 2, y: (b.z0 + b.z1) / 2 - (B.z0 + B.z1) / 2, w: b.x1 - b.x0, h: b.z1 - b.z0 }));
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();
    for (const h of holes) {
      const p = new THREE.Path();
      p.moveTo(h.x - h.w / 2, h.y - h.h / 2);
      p.lineTo(h.x - h.w / 2, h.y + h.h / 2);
      p.lineTo(h.x + h.w / 2, h.y + h.h / 2);
      p.lineTo(h.x + h.w / 2, h.y - h.h / 2);
      p.closePath();
      shape.holes.push(p);
    }
    const plate = new THREE.ShapeGeometry(shape, 4);
    // ShapeGeometry lies in XY facing +Z; rotate so it lies in XZ facing down (-Y): local y -> -world z
    plate.rotateX(Math.PI / 2);
    kit.add("hullDark", plate, { pos: [(B.x0 + B.x1) / 2, B.y - 0.15, (B.z0 + B.z1) / 2], uv: "world", texel: 1 / 40, color: IMP.hullDark });
    // shaft walls from the hangar decks down to the belly; containment field at the belly line
    for (const b of Object.values(BAYS)) {
      const depth = b.deckY - b.bellyY;
      const yc = (b.deckY + b.bellyY) / 2;
      kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z0 - 3], [b.x0, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
      kit.boxMM("hullDark", [b.x1, b.bellyY - 1, b.z0 - 3], [b.x1 + 3, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
      kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z0 - 3], [b.x1 + 3, b.deckY, b.z0], { color: IMP.hullShadow, texel: 1 / 8 });
      kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z1], [b.x1 + 3, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
      // lit rim around the mouth
      for (const [x0, x1, z0, z1] of [
        [b.x0 - 3.2, b.x0 - 2.4, b.z0 - 3, b.z1 + 3],
        [b.x1 + 2.4, b.x1 + 3.2, b.z0 - 3, b.z1 + 3],
        [b.x0 - 3, b.x1 + 3, b.z0 - 3.2, b.z0 - 2.4],
        [b.x0 - 3, b.x1 + 3, b.z1 + 2.4, b.z1 + 3.2],
      ]) {
        kit.boxMM("emitAmber", [x0, b.bellyY - 1.4, z0], [x1, b.bellyY - 1.0, z1]);
      }
      // strip lights down the shaft walls
      for (let y = b.bellyY + 4; y < b.deckY - 2; y += 6) {
        kit.boxMM("emitWhite", [b.x0 - 0.05, y, b.z0 + 2], [b.x0 + 0.1, y + 0.4, b.z1 - 2]);
        kit.boxMM("emitWhite", [b.x1 - 0.1, y, b.z0 + 2], [b.x1 + 0.05, y + 0.4, b.z1 - 2]);
      }
      void depth;
      void yc;
    }
  }

  // ---- side trench: recessed back wall + lips along both edges (from 5% of the length aft)
  {
    for (const side of [-1, 1]) {
      const segs = 60;
      const pos = [];
      const idx = [];
      const cols = [];
      const uvs = [];
      const push = (x, y, z, c) => {
        pos.push(x, y, z);
        cols.push(c.r, c.g, c.b);
        uvs.push(z / 40, y / 40);
        return pos.length / 3 - 1;
      };
      for (let i = 0; i <= segs; i++) {
        const u = 0.04 + (i / segs) * 0.96;
        const xe = side * HULL.halfWidthStern;
        const z = HULL.bowZ + u * (sternZAt(xe) - HULL.bowZ);
        const hw = halfWidth(z);
        const xo = side * hw;
        const xi = side * Math.max(0, hw - TR.depth);
        // profile: top lip outer -> top lip inner -> back wall bottom -> bottom lip outer
        const a = push(xo, TR.y1, z, IMP.hullMid);
        const b = push(xi, TR.y1, z, IMP.hullDark);
        const c = push(xi, TR.y0, z, IMP.hullShadow);
        const d = push(xo, TR.y0, z, IMP.hullMid);
        if (i > 0) {
          const base = a - 4;
          for (const [p, q] of [[base, base + 1], [base + 1, base + 2], [base + 2, base + 3]]) {
            const r = p + 4,
              s2 = q + 4;
            if (side > 0) idx.push(p, q, s2, p, s2, r);
            else idx.push(p, s2, q, p, r, s2);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(cols.map((v) => Math.round(v * 255))), 3, true));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      kit.add("hullDark", geo, { uv: "keep" });
    }
  }

  // ---- stern face (flat centre + angled corners) with the engine block
  {
    const pos = [];
    const idx = [];
    const cols = [];
    const uvs = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const x = -HULL.halfWidthStern + (i / n) * 2 * HULL.halfWidthStern;
      const z = sternZAt(x) - 0.01;
      const yt = topY(x, z);
      const yb = ventralY(x, z);
      pos.push(x, yt, z, x, yb, z);
      cols.push(IMP.hullDark.r, IMP.hullDark.g, IMP.hullDark.b, IMP.hullShadow.r, IMP.hullShadow.g, IMP.hullShadow.b);
      uvs.push(x / 40, yt / 40, x / 40, yb / 40);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(cols.map((v) => Math.round(v * 255))), 3, true));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    kit.add("hullDark", geo, { uv: "keep" });
    // engines: nozzle cones protruding aft, glowing cores, collar rings
    const all = [...ENGINES.main.map((e) => ({ ...e, main: true })), ...ENGINES.aux];
    for (const e of all) {
      const L = e.main ? ENGINES.nozzleLen : ENGINES.nozzleLen * 0.5;
      const zc = HULL.sternZ + L / 2;
      kit.add("hullDark", new THREE.CylinderGeometry(e.r * 1.05, e.r * 0.8, L, 32, 1, true), { pos: [e.x, e.y, zc], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [4, 1] });
      // inner throat (visible from behind): dark cone + glow disc
      kit.add("hullDark", new THREE.CylinderGeometry(e.r * 0.95, e.r * 0.45, L * 0.9, 32, 1, true), { pos: [e.x, e.y, zc + L * 0.05], rot: [-Math.PI / 2, 0, 0], color: IMP.hullShadow, uv: "scale", uvScale: [4, 1] });
      kit.add("engineGlow", new THREE.CircleGeometry(e.r * 0.62, 32), { pos: [e.x, e.y, HULL.sternZ + L * 0.35], rot: [0, 0, 0], uv: "keep" });
      kit.add("engineGlow", new THREE.RingGeometry(e.r * 0.78, e.r * 0.92, 32), { pos: [e.x, e.y, HULL.sternZ + L * 0.98], uv: "keep" });
      for (const k of [0.15, 0.55, 0.9]) kit.add("hull", new THREE.TorusGeometry(e.r * (1.06 - 0.12 * k), e.r * 0.05, 8, 32), { pos: [e.x, e.y, HULL.sternZ + L * k], color: IMP.hullMid, uv: "scale", uvScale: [8, 1] });
    }
  }

  // ---- reactor bulb
  kit.add("hull", new THREE.SphereGeometry(REACTOR_BULB.r, 48, 32), { pos: [REACTOR_BULB.x, REACTOR_BULB.y, REACTOR_BULB.z], color: IMP.hullMid, uv: "scale", uvScale: [12, 6] });
  kit.add("hullDark", new THREE.TorusGeometry(REACTOR_BULB.r * 0.98, 3, 8, 64), { pos: [REACTOR_BULB.x, REACTOR_BULB.y - REACTOR_BULB.r * 0.4, REACTOR_BULB.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [40, 1] });

  // ---- superstructure terraces
  for (const lv of CITY.levels) {
    const z0 = lv.z0;
    const z1 = CITY.z1 - lv.inset * 0.5;
    trapPrism(kit, "hull", z0, z1, Math.max(8, CITY.halfWidthAt(z0) - lv.inset), CITY.halfWidthAt(z1) - lv.inset, lv.y0, lv.y1, { color: IMP.hullMid });
    // dark recessed band at the base of each terrace
    trapPrism(kit, "hullDark", z0 + 4, z1 - 2, Math.max(8, CITY.halfWidthAt(z0) - lv.inset) + 1.2, CITY.halfWidthAt(z1) - lv.inset + 1.2, lv.y0, lv.y0 + 3, { color: IMP.hullShadow });
  }
  // heavy turbolaser turrets on the level-1 shoulders
  for (const z of CITY.turbolasers) {
    for (const side of [-1, 1]) {
      const x = side * (CITY.halfWidthAt(z) + 10);
      const y = CITY.levels[0].y1;
      kit.add("hull", new THREE.CylinderGeometry(9, 10, 6, 24), { pos: [x, y + 3, z], color: IMP.hullLight, uv: "scale", uvScale: [6, 1] });
      kit.add("hull", new THREE.SphereGeometry(8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 6, z], color: IMP.hullLight, uv: "scale", uvScale: [6, 3] });
      for (let b = 0; b < 4; b++) {
        const bx = x + (b - 1.5) * 3.2;
        kit.add("hullDark", new THREE.CylinderGeometry(0.8, 1.1, 22, 10), { pos: [bx, y + 10, z - 14], rot: [Math.PI / 2 - 0.25, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [2, 4] });
      }
    }
  }

  // ---- command tower
  for (const n of TOWER.neck) {
    kit.boxMM("hull", [-n.x, n.y0, n.z0], [n.x, n.y1, n.z1], { color: IMP.hullMid, texel: 1 / 30 });
    kit.boxMM("hullDark", [-n.x - 1, n.y0, n.z0 + 6], [n.x + 1, n.y0 + 3, n.z1 - 6], { color: IMP.hullShadow, texel: 1 / 20 });
  }
  const B = TOWER.bridge;
  kit.boxMM("hull", [-B.x, B.y0, B.z0], [B.x, B.y1, B.z1], { color: IMP.hullLight, texel: 1 / 30 });
  // window slots on the forward face: recessed dark channel with the glazing emissive set inside
  for (const w of TOWER.windows) {
    // open frame (sill, lintel, jambs) so the bridge looks straight out over the hull; glazing pane in the slot
    kit.boxMM("hullDark", [w.x0 - 1, w.y0 - 0.6, B.z0 - 1.2], [w.x1 + 1, w.y0, B.z0 + 2.4], { color: IMP.hullShadow, texel: 1 / 10 });
    kit.boxMM("hullDark", [w.x0 - 1, w.y1, B.z0 - 1.2], [w.x1 + 1, w.y1 + 0.6, B.z0 + 2.4], { color: IMP.hullShadow, texel: 1 / 10 });
    kit.boxMM("hullDark", [w.x0 - 1, w.y0, B.z0 - 1.2], [w.x0, w.y1, B.z0 + 2.4], { color: IMP.hullShadow, texel: 1 / 10 });
    kit.boxMM("hullDark", [w.x1, w.y0, B.z0 - 1.2], [w.x1 + 1, w.y1, B.z0 + 2.4], { color: IMP.hullShadow, texel: 1 / 10 });
    kit.boxMM("glass", [w.x0, w.y0, B.z0 - 0.4], [w.x1, w.y1, B.z0 - 0.3]);
    // window mullions
    for (let x = w.x0 + 2; x < w.x1; x += 2.2) kit.boxMM("hullDark", [x - 0.12, w.y0, B.z0 - 0.9], [x + 0.12, w.y1, B.z0 - 0.2], { color: IMP.hullShadow });
    // overhang above the glazing
    kit.boxMM("hull", [w.x0 - 3, w.y1 + 0.6, B.z0 - 3.5], [w.x1 + 3, w.y1 + 2.6, B.z0 + 0.5], { color: IMP.hullLight, texel: 1 / 20 });
  }
  // shield generator globes on pedestals
  for (const side of [-1, 1]) {
    const g = TOWER.globes;
    kit.add("hull", new THREE.CylinderGeometry(9, 12, 10, 24), { pos: [side * g.x, B.y1 + 5, g.z], color: IMP.hullMid, uv: "scale", uvScale: [6, 1] });
    kit.add("hull", new THREE.SphereGeometry(g.r, 40, 28), { pos: [side * g.x, g.y, g.z], color: IMP.hullLight, uv: "scale", uvScale: [10, 5] });
    kit.add("hullDark", new THREE.TorusGeometry(g.r * 0.9, 0.8, 8, 48), { pos: [side * g.x, g.y - g.r * 0.35, g.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [20, 1] });
  }
  // comms mast + dish + antenna
  {
    const m = TOWER.mast;
    kit.boxMM("hull", [m.x - m.w / 2, m.y0, m.z - m.w / 2], [m.x + m.w / 2, m.y1, m.z + m.w / 2], { color: IMP.hullMid, texel: 1 / 10 });
    kit.boxMM("hullDark", [m.x - m.w / 2 - 2, m.y1 - 6, m.z - m.w / 2 - 2], [m.x + m.w / 2 + 2, m.y1, m.z + m.w / 2 + 2], { color: IMP.hullDark, texel: 1 / 10 });
    kit.add("hullDark", new THREE.CylinderGeometry(m.dishR, m.dishR * 0.2, 3, 32, 1, true), { pos: [m.x, m.y1 + 4, m.z], rot: [-0.6, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [6, 1] });
    kit.add("hull", new THREE.CylinderGeometry(0.5, 0.8, m.tipY - m.y1, 8), { pos: [m.x, (m.tipY + m.y1) / 2, m.z], color: IMP.hullLight, uv: "scale", uvScale: [1, 4] });
    for (const y of [m.y1 + 10, m.y1 + 20, m.tipY - 4]) kit.box("hullDark", m.x, y, m.z, 6 - (y - m.y1) * 0.1, 0.4, 0.4, { color: IMP.hullDark });
  }
  // small window rows on the tower (instanced emissive dots)
  kit.proto("winDot", "emitWhite", new THREE.BoxGeometry(1.2, 0.6, 0.3));
  for (const n of [...TOWER.neck, { x: B.x, y0: B.y0, y1: B.y1, z0: B.z0, z1: B.z1 }]) {
    for (let y = n.y0 + 6; y < n.y1 - 4; y += 6) {
      for (let x = -n.x + 6; x < n.x - 4; x += 4.5) {
        if (rand() < 0.35) continue;
        kit.place("winDot", { pos: [x, y, n.z0 - 0.1] });
        if (rand() < 0.6) kit.place("winDot", { pos: [x, y, n.z1 + 0.1] });
      }
      for (let z = n.z0 + 6; z < n.z1 - 4; z += 4.5) {
        if (rand() < 0.35) continue;
        kit.place("winDot", { pos: [-n.x - 0.1, y, z], rot: [0, Math.PI / 2, 0] });
        kit.place("winDot", { pos: [n.x + 0.1, y, z], rot: [0, Math.PI / 2, 0] });
      }
    }
  }

  // ---- first greeble scatter (instanced boxes on the terraces and the trench walls)
  kit.proto("greebleA", "hull", new THREE.BoxGeometry(6, 3, 8), { texel: 1 / 10 });
  kit.proto("greebleB", "hull", new THREE.BoxGeometry(3, 6, 3), { texel: 1 / 10 });
  kit.proto("greebleC", "hullDark", new THREE.BoxGeometry(10, 1.5, 4), { texel: 1 / 10 });
  for (const lv of CITY.levels) {
    const z1 = CITY.z1 - lv.inset * 0.5;
    for (let i = 0; i < 700; i++) {
      const z = lv.z0 + rand() * (z1 - lv.z0);
      const hw = Math.max(8, CITY.halfWidthAt(z) - lv.inset);
      const x = (rand() * 2 - 1) * (hw - 4);
      const name = ["greebleA", "greebleB", "greebleC"][Math.floor(rand() * 3)];
      const s = 0.6 + rand() * 1.2;
      kit.place(name, { pos: [x, lv.y1 + 0.5 * s, z], rot: [0, rand() < 0.5 ? 0 : Math.PI / 2, 0], scale: s, color: rand() < 0.5 ? IMP.hullMid : IMP.hullLight });
    }
  }
  // dorsal plateau greebles either side of the city
  for (let i = 0; i < 1600; i++) {
    const z = -900 + rand() * 1350;
    const hw = halfWidth(z);
    const x = (rand() * 2 - 1) * hw * 0.9;
    if (Math.abs(x) < CITY.halfWidthAt(z) + 6 && z > CITY.z0) continue;
    const y = topY(x, z);
    const s = 0.5 + rand() * 1.0;
    kit.place(rand() < 0.5 ? "greebleA" : "greebleC", { pos: [x, y + 0.5 * s, z], rot: [0, rand() < 0.7 ? 0 : Math.PI / 2, 0], scale: s, color: rand() < 0.6 ? IMP.hullMid : IMP.hullDark });
  }

  // ---- running lights (animated)
  const runLights = [];
  const runMat = new THREE.MeshBasicMaterial({ color: 0xff4040 });
  const runGeo = new THREE.SphereGeometry(1.2, 10, 8);
  for (const [x, y, z, col] of [
    [-440, TR.y1 + 1, 480, 0xff3030],
    [440, TR.y1 + 1, 480, 0x30ff60],
    [0, TR.y1 + 1, -1085, 0xffffff],
    [-TOWER.globes.x, TOWER.globes.y + TOWER.globes.r + 1, TOWER.globes.z, 0xff3030],
    [TOWER.globes.x, TOWER.globes.y + TOWER.globes.r + 1, TOWER.globes.z, 0x30ff60],
    [0, TOWER.mast.tipY + 1, TOWER.mast.z, 0xffffff],
  ]) {
    const m = new THREE.Mesh(runGeo, runMat.clone());
    m.material.color.set(col);
    m.position.set(x, y, z);
    m.userData.phase = rand() * Math.PI * 2;
    group.add(m);
    runLights.push(m);
  }

  const meshes = kit.build(group);
  // the hull receives the sun's shadow; only the big pieces cast (instanced greebles are too small to matter)
  for (const m of meshes) {
    if (m.isInstancedMesh) m.castShadow = false;
  }

  // ---- containment fields at the belly line of both bays (animated shader)
  const fields = [];
  for (const b of Object.values(BAYS)) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), materials.field);
    f.rotation.x = -Math.PI / 2;
    f.position.set((b.x0 + b.x1) / 2, b.bellyY - 0.5, (b.z0 + b.z1) / 2);
    f.renderOrder = 5;
    group.add(f);
    fields.push(f);
  }

  const engineMat = materials.engineGlow;
  const baseEngine = engineMat.emissiveIntensity;
  function update(dt, t) {
    engineMat.emissiveIntensity = baseEngine * (0.9 + 0.1 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 19.1));
    for (const l of runLights) {
      const k = Math.sin(t * 2.2 + l.userData.phase);
      l.visible = k > 0.2;
    }
    materials.field.uniforms.time.value = t;
  }

  return { group, meshes, update, fields, runLights, triangles: kit.triangles };
}

export { tOf };
