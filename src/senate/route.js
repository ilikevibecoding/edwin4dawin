// Street routing on the layout alone (no NPC modules): a coarse A* over the undercity ground — everything inside the
// plateau that is not a lot (plazas stay walkable), the spaceport or the rim promenade railing — string-pulled into
// corner waypoints no more than LEG blocks apart. Used for the Jedi liaison's walk Temple <-> Senate.
import { PLATEAU, RIM } from '../coruscant/layout.js';

const CELL = 4;
export const LEG = 40;

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// walkability bitmap of the ground level (1 = street / plaza)
export function groundGrid(layout) {
  const x0 = PLATEAU.x0, z0 = PLATEAU.z0, w = Math.ceil((PLATEAU.x1 - PLATEAU.x0) / CELL), d = Math.ceil((PLATEAU.z1 - PLATEAU.z0) / CELL);
  const g = new Uint8Array(w * d).fill(1);
  const mark = (ax0, az0, ax1, az1, v) => {   // block coords, x1/z1 exclusive; any overlap marks the cell
    const cx0 = Math.max(0, Math.floor((ax0 - x0) / CELL)), cz0 = Math.max(0, Math.floor((az0 - z0) / CELL));
    const cx1 = Math.min(w - 1, Math.floor((ax1 - 1 - x0) / CELL)), cz1 = Math.min(d - 1, Math.floor((az1 - 1 - z0) / CELL));
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) g[cx * d + cz] = v;
  };
  mark(PLATEAU.x0, PLATEAU.z0, PLATEAU.x1, PLATEAU.z0 + RIM, 0); mark(PLATEAU.x0, PLATEAU.z1 - RIM, PLATEAU.x1, PLATEAU.z1, 0);
  mark(PLATEAU.x0, PLATEAU.z0, PLATEAU.x0 + RIM, PLATEAU.z1, 0); mark(PLATEAU.x1 - RIM, PLATEAU.z0, PLATEAU.x1, PLATEAU.z1, 0);
  if (layout.spaceport) mark(layout.spaceport.x0, layout.spaceport.z0, layout.spaceport.x1, layout.spaceport.z1, 0);
  for (const lot of layout.lots) if (lot.kind !== 'plaza') mark(lot.x0, lot.z0, lot.x1, lot.z1, 0);
  return { g, w, d, x0, z0, cellOf: (x, z) => [Math.floor((x - x0) / CELL), Math.floor((z - z0) / CELL)], centre: (cx, cz) => ({ x: x0 + cx * CELL + CELL / 2, z: z0 + cz * CELL + CELL / 2 }) };
}

// nearest walkable cell to a block position (search radius in cells)
function snap(G, x, z, r = 6) {
  const [cx, cz] = G.cellOf(x, z);
  let best = null;
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const ax = cx + dx, az = cz + dz;
    if (ax < 0 || az < 0 || ax >= G.w || az >= G.d || G.g[ax * G.d + az] !== 1) continue;
    const dd = dx * dx + dz * dz; if (!best || dd < best.dd) best = { cx: ax, cz: az, dd };
  }
  return best;
}

// A* from block (ax, az) to (bx, bz); returns block-coordinate waypoints (corners only, legs <= LEG) or null
export function streetRoute(layout, ax, az, bx, bz, maxNodes = 60000) {
  const G = groundGrid(layout);
  const s = snap(G, ax, az), t = snap(G, bx, bz);
  if (!s || !t) return null;
  const key = (cx, cz) => cx * G.d + cz;
  const open = new Heap(); const came = new Map(); const gScore = new Map();
  const h = (cx, cz) => Math.abs(cx - t.cx) + Math.abs(cz - t.cz);
  const sk = key(s.cx, s.cz); gScore.set(sk, 0); open.push({ cx: s.cx, cz: s.cz, f: h(s.cx, s.cz), g: 0 });
  let n = 0, found = false;
  while (open.size && n++ < maxNodes) {
    const cur = open.pop();
    if (cur.cx === t.cx && cur.cz === t.cz) { found = true; break; }
    const ck = key(cur.cx, cur.cz);
    if (cur.g > (gScore.get(ck) ?? Infinity)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.cx + dx, nz = cur.cz + dz;
      if (nx < 0 || nz < 0 || nx >= G.w || nz >= G.d || G.g[nx * G.d + nz] !== 1) continue;
      const nk = key(nx, nz), ng = cur.g + 1;
      if (ng < (gScore.get(nk) ?? Infinity)) { gScore.set(nk, ng); came.set(nk, ck); open.push({ cx: nx, cz: nz, f: ng + h(nx, nz), g: ng }); }
    }
  }
  if (!found) return null;
  const cells = []; let k = key(t.cx, t.cz);
  while (k !== undefined) { cells.push([Math.floor(k / G.d), k % G.d]); if (k === sk) break; k = came.get(k); }
  cells.reverse();
  // corners only, then split long legs
  const pts = [cells[0]];
  for (let i = 1; i < cells.length - 1; i++) { const [px, pz] = cells[i - 1], [cx, cz] = cells[i], [nx, nz] = cells[i + 1]; if ((cx - px) !== (nx - cx) || (cz - pz) !== (nz - cz)) pts.push(cells[i]); }
  if (cells.length > 1) pts.push(cells[cells.length - 1]);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const c = G.centre(pts[i][0], pts[i][1]);
    if (i > 0) { const p = out[out.length - 1]; const len = Math.abs(c.x - p.x) + Math.abs(c.z - p.z); const parts = Math.ceil(len / LEG); for (let j = 1; j < parts; j++) out.push({ x: Math.round(p.x + (c.x - p.x) * j / parts), z: Math.round(p.z + (c.z - p.z) * j / parts) }); }
    out.push({ x: Math.round(c.x), z: Math.round(c.z) });
  }
  return out;
}

// true when (x, z) lies on a walkable street / plaza cell of the ground grid or inside a lot of the layout
export function onLayout(layout, x, z, G = groundGrid(layout)) {
  if (x < PLATEAU.x0 || z < PLATEAU.z0 || x >= PLATEAU.x1 || z >= PLATEAU.z1) return false;
  const [cx, cz] = G.cellOf(x, z);
  if (cx >= 0 && cz >= 0 && cx < G.w && cz < G.d && G.g[cx * G.d + cz] === 1) return true;
  return layout.lots.some((l) => x >= l.x0 && x < l.x1 && z >= l.z0 && z < l.z1);
}
