// d1-tactical holo table (5 × 3 m rectangular instrument: skirt, glow band, facetted body, corner indicator
// posts, sloped edge control panels, emitter field) and the fleet plot projected above it: one additive
// LineSegments object (grid plane, range rings, radar sweep, wireframe wedge silhouettes for own ships, hostile
// contacts with course vectors and id brackets, target lines with travelling pulses) plus one Points object
// (sensor returns / debris field). The commander's lectern console lives here too.
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { placer, placerRad, IND } from "../nav/props.js";
import { HoloLines, HoloStars, HOLO } from "../nav/holo.js";

/** Sloped edge control panel on a placer whose local +z points away from the table (to the operator). */
function edgePanel(kit, p, w, rand, atlasMat, screenRect, { sy0 = 0.9, sz0 = -0.09, tilt = 0.32, screen = true } = {}) {
  p.box("darkGloss", 0, sy0, sz0, w, 0.035, 0.34, { tilt });
  {
    const [, ty, tz] = p.onSlope(0, 0.005, 0.165, tilt);
    p.box("metal", 0, sy0 + ty, sz0 + tz, w, 0.02, 0.025, { color: IMP.mid, texel: 2, tilt });
  }
  const cols = Math.max(4, Math.floor((w - 0.7) / 0.085));
  for (let i = 0; i < cols; i++) {
    const ox = -w / 2 + 0.12 + i * 0.085;
    const [lx, ly, lz] = p.onSlope(ox, 0.026, 0.09, tilt);
    const v = rand();
    const mat = v < 0.5 ? "paintedMetal" : v < 0.72 ? "emitBlue" : v < 0.9 ? "emitAmber" : "emitRedImp";
    p.box(mat, lx, sy0 + ly, sz0 + lz, 0.055, 0.014, 0.045, { color: IMP.black, texel: 4, tilt });
  }
  if (screen) {
    const [sx, sy, sz] = p.onSlope(w / 2 - 0.36, 0.024, -0.03, tilt);
    p.screenH(atlasMat, sx, sy0 + sy, sz0 + sz, 0.6, 0.16, screenRect, tilt);
  } else {
    for (let i = 0; i < 3; i++) {
      const [kx, ky, kz] = p.onSlope(w / 2 - 0.5 + i * 0.12, 0.05, -0.04, tilt);
      p.box("metal", kx, sy0 + ky, sz0 + kz, 0.03, 0.06, 0.03, { color: IMP.steel, texel: 4, tilt });
      const [gx, gy, gz] = p.onSlope(w / 2 - 0.5 + i * 0.12, 0.022, -0.04, tilt);
      p.box("metal", gx, sy0 + gy, sz0 + gz, 0.02, 0.012, 0.2, { color: IMP.black, texel: 4, tilt });
    }
  }
  // rocker switch pair + indicator on the left of the slope
  for (let i = 0; i < 2; i++) {
    const [rx, ry, rz] = p.onSlope(-w / 2 + 0.18 + i * 0.1, 0.04, -0.06, tilt);
    p.box("paintedMetal", rx, sy0 + ry, sz0 + rz, 0.06, 0.03, 0.08, { color: IMP.dark, texel: 4, tilt, roll: 0 });
  }
  const [ix, iy, iz] = p.onSlope(-w / 2 + 0.4, 0.024, -0.06, tilt);
  p.box(IND[Math.floor(rand() * IND.length)], ix, sy0 + iy, sz0 + iz, 0.08, 0.012, 0.03, { tilt });
}

/** Builds the rectangular holo table centred at (cx, cz), long axis along z. atlasMat = atlas material KEY. Returns { top }. */
export function buildHoloTable(kit, atlasMat, cells, cx, floorY, cz, { hx = 1.5, hz = 2.5, seed = 5 } = {}) {
  const rand = rng(seed);
  const y = (v) => floorY + v;
  // floor inlay under the table: black plate + blue border line
  kit.boxMM("paintedMetal", [cx - hx - 0.55, y(0.006), cz - hz - 0.55], [cx + hx + 0.55, y(0.018), cz + hz + 0.55], { color: IMP.black, texel: 1 });
  const bw = 0.035;
  for (const s of [-1, 1]) {
    kit.boxMM("emitBlue", [cx + s * (hx + 0.45) - bw / 2, y(0.012), cz - hz - 0.45], [cx + s * (hx + 0.45) + bw / 2, y(0.024), cz + hz + 0.45]);
    kit.boxMM("emitBlue", [cx - hx - 0.45, y(0.012), cz + s * (hz + 0.45) - bw / 2], [cx + hx + 0.45, y(0.024), cz + s * (hz + 0.45) + bw / 2]);
  }
  // skirt, glow band, body
  kit.boxMM("paintedMetal", [cx - hx + 0.15, y(0), cz - hz + 0.15], [cx + hx - 0.15, y(0.15), cz + hz - 0.15], { color: IMP.black, texel: 1 });
  kit.boxMM("emitBlue", [cx - hx + 0.04, y(0.15), cz - hz + 0.04], [cx + hx - 0.04, y(0.22), cz + hz - 0.04]);
  kit.boxMM("paintedMetal", [cx - hx, y(0.22), cz - hz], [cx + hx, y(0.72), cz + hz], { color: IMP.black, texel: 1 });
  // rim block carrying the sloped edge panels
  kit.boxMM("paintedMetal", [cx - hx - 0.08, y(0.72), cz - hz - 0.08], [cx + hx + 0.08, y(0.86), cz + hz + 0.08], { color: IMP.dark, texel: 1 });
  // top plates (frame, blue border, dark gloss field)
  kit.boxMM("metal", [cx - hx + 0.18, y(0.95), cz - hz + 0.18], [cx + hx - 0.18, y(0.98), cz + hz - 0.18], { color: IMP.mid, texel: 2 });
  kit.boxMM("emitBlue", [cx - hx + 0.28, y(0.98), cz - hz + 0.28], [cx + hx - 0.28, y(0.995), cz + hz - 0.28]);
  kit.boxMM("darkGloss", [cx - hx + 0.32, y(0.985), cz - hz + 0.32], [cx + hx - 0.32, y(1.007), cz + hz - 0.32]);
  const top = y(1.007);
  // emitter field: matrix of small lenses and an amber inner border
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      const ex = cx - 0.75 + i * 0.5;
      const ez = cz - 1.75 + j * 0.5;
      kit.box("metal", ex, top + 0.004, ez, 0.08, 0.008, 0.08, { color: IMP.black });
      kit.box("emitBlue", ex, top + 0.009, ez, 0.028, 0.006, 0.028);
    }
  }
  const ax = 1.02;
  const az = 2.02;
  for (const s of [-1, 1]) {
    kit.boxMM("emitAmber", [cx + s * ax - 0.008, top + 0.002, cz - az], [cx + s * ax + 0.008, top + 0.008, cz + az]);
    kit.boxMM("emitAmber", [cx - ax, top + 0.002, cz + s * az - 0.008], [cx + ax, top + 0.008, cz + s * az + 0.008]);
  }
  // corner posts with indicator clusters and caps
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = cx + sx * (hx + 0.02);
      const pz = cz + sz * (hz + 0.02);
      kit.box("paintedMetal", px, y(0.52), pz, 0.2, 1.04, 0.2, { color: IMP.dark, texel: 1 });
      kit.box("metal", px, y(1.055), pz, 0.22, 0.03, 0.22, { color: IMP.mid, texel: 2 });
      kit.box("emitBlue", px, y(1.077), pz, 0.06, 0.014, 0.06);
      // LED column on both outward faces
      for (let i = 0; i < 6; i++) {
        kit.box(IND[(i + (sx > 0 ? 1 : 0) + (sz > 0 ? 3 : 0)) % IND.length], px + sx * 0.104, y(0.5 + i * 0.07), pz + sz * 0.04, 0.008, 0.03, 0.03);
        kit.box(IND[(i * 2 + (sx > 0 ? 2 : 0)) % IND.length], px + sx * 0.04, y(0.5 + i * 0.07), pz + sz * 0.104, 0.03, 0.03, 0.008);
      }
      placerRad(kit, px + sx * 0.102, floorY, pz, sx > 0 ? Math.PI / 2 : -Math.PI / 2).decal(0, 0.28, 0, 0.12, 9);
    }
  }
  // body facets and edge panels on the long sides (x faces) — three each — and the short sides (z faces) — two each
  const faces = [
    { a: Math.PI / 2, n: 3, len: 2 * hz, dist: hx, panelW: 1.42, cells: [0, 1, 2] },
    { a: -Math.PI / 2, n: 3, len: 2 * hz, dist: hx, panelW: 1.42, cells: [3, 0, 1] },
    { a: 0, n: 2, len: 2 * hx, dist: hz, panelW: 1.2, cells: [2, 3] },
    { a: Math.PI, n: 2, len: 2 * hx, dist: hz, panelW: 1.2, cells: [1, 2] },
  ];
  for (const f of faces) {
    const dir = [Math.sin(f.a), Math.cos(f.a)];
    const right = [Math.cos(f.a), -Math.sin(f.a)];
    for (let k = 0; k < f.n; k++) {
      const along = -f.len / 2 + 0.3 + ((f.len - 0.6) * (k + 0.5)) / f.n;
      const px = cx + dir[0] * f.dist + right[0] * along;
      const pz = cz + dir[1] * f.dist + right[1] * along;
      const p = placerRad(kit, px, floorY, pz, f.a);
      // recessed body panel with seam, LED trio / vent slats alternating
      p.box("paintedMetal", 0, 0.47, 0.01, f.panelW - 0.1, 0.42, 0.02, { color: IMP.dark, texel: 1 });
      p.box("paintedMetal", 0, 0.47, 0.021, f.panelW - 0.16, 0.02, 0.004, { color: IMP.black });
      if (k % 2 === 0) {
        for (let i = 0; i < 3; i++) p.box(IND[(i + k) % IND.length], -0.2 + i * 0.08, 0.6, 0.024, 0.035, 0.02, 0.006);
        for (let j = 0; j < 4; j++) p.box("metal", f.panelW / 2 - 0.3, 0.32 + j * 0.05, 0.026, 0.3, 0.01, 0.012, { color: IMP.mid });
      } else {
        p.decal(-f.panelW / 2 + 0.25, 0.36, 0.026, 0.18, 6);
        for (let i = 0; i < 6; i++) p.box(IND[(i * 2 + k) % IND.length], -0.25 + i * 0.1, 0.62, 0.024, 0.04, 0.02, 0.006);
      }
      // indicator run along the rim block's outer face and the sloped panel above it
      for (let i = 0; i < 7; i++) p.box(IND[(i + k * 3) % IND.length], -0.3 + i * 0.1, 0.8, 0.084, 0.04, 0.02, 0.006);
      p.box("emitBlue", 0, 0.755, 0.084, f.panelW - 0.4, 0.008, 0.006);
      edgePanel(kit, p, f.panelW, rand, atlasMat, cells.con[f.cells[k] % cells.con.length], { screen: k % 2 === 0 || f.n === 2 });
    }
  }
  kit.collider([cx - hx - 0.14, floorY, cz - hz - 0.14], [cx + hx + 0.14, floorY + 1.1, cz + hz + 0.14], "holo-table");
  return { top };
}

// ---------------------------------------------------------------------------
// wireframe ship silhouettes (local frame: u forward, v right, y up)
// ---------------------------------------------------------------------------

function frameAt(c, heading) {
  // forward = (sin h, 0, cos h) — heading 0 points to +z; right = (cos h, 0, -sin h)
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  return (u, yy, v) => [c[0] + u * fx + v * fz, c[1] + yy, c[2] + u * fz - v * fx];
}

/** Dagger-shaped capital ship (our side): wedge hull with a raised spine, conning tower, engine bells. */
function wedge(lines, c, heading, L, color, colorDim, { anim = 3, phase = 0 } = {}) {
  const P = frameAt(c, heading);
  const W = L * 0.62;
  const T = L * 0.06;
  const bow = P(L / 2, 0, 0);
  const sp = P(-L / 2, 0, -W / 2);
  const ss = P(-L / 2, 0, W / 2);
  const ridge = P(-L / 2, T, 0);
  const keel = P(-L / 2, -T * 0.7, 0);
  lines.seg(bow, sp, color, anim, phase);
  lines.seg(bow, ss, color, anim, phase);
  lines.seg(sp, ss, color, anim, phase);
  lines.seg(bow, ridge, colorDim, anim, phase);
  lines.seg(ridge, sp, colorDim, anim, phase);
  lines.seg(ridge, ss, colorDim, anim, phase);
  lines.seg(bow, keel, colorDim, anim, phase);
  lines.seg(keel, sp, colorDim, anim, phase);
  lines.seg(keel, ss, colorDim, anim, phase);
  // conning tower box + bridge bar
  const u0 = -L * 0.36;
  const u1 = -L * 0.18;
  const hv = L * 0.07;
  const y0 = T * 0.6;
  const y1 = T + L * 0.11;
  const corners = [
    [u0, -hv],
    [u1, -hv],
    [u1, hv],
    [u0, hv],
  ];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    lines.seg(P(a[0], y0, a[1]), P(b[0], y0, b[1]), colorDim, anim, phase);
    lines.seg(P(a[0], y1, a[1]), P(b[0], y1, b[1]), color, anim, phase);
    lines.seg(P(a[0], y0, a[1]), P(a[0], y1, a[1]), colorDim, anim, phase);
  }
  lines.seg(P(-L * 0.27, y1, -L * 0.14), P(-L * 0.27, y1, L * 0.14), color, anim, phase);
  for (const s of [-1, 1]) lines.diamond(P(-L * 0.27, y1 + L * 0.02, s * L * 0.14), L * 0.02, color, { anim, phase });
  // engine bells (three squares on the stern face)
  for (let i = -1; i <= 1; i++) {
    const v = i * W * 0.24;
    const r = L * 0.035;
    const q = [P(-L / 2, -r, v - r), P(-L / 2, -r, v + r), P(-L / 2, r, v + r), P(-L / 2, r, v - r)];
    lines.poly(q, colorDim, anim, { phase, closed: true });
  }
}

/** Hostile contact: elongated hexagonal hull, forward hammerhead bar, dorsal fin. */
function hostile(lines, c, heading, L, color, colorDim, { anim = 3, phase = 0 } = {}) {
  const P = frameAt(c, heading);
  const W = L * 0.42;
  const H = L * 0.09;
  const hex = [
    [L / 2, 0],
    [L * 0.2, -W / 2],
    [-L * 0.4, -W / 2],
    [-L / 2, 0],
    [-L * 0.4, W / 2],
    [L * 0.2, W / 2],
  ];
  for (let i = 0; i < 6; i++) {
    const a = hex[i];
    const b = hex[(i + 1) % 6];
    lines.seg(P(a[0], H / 2, a[1]), P(b[0], H / 2, b[1]), color, anim, phase);
    lines.seg(P(a[0], -H / 2, a[1]), P(b[0], -H / 2, b[1]), colorDim, anim, phase);
    lines.seg(P(a[0], H / 2, a[1]), P(a[0], -H / 2, a[1]), colorDim, anim, phase);
  }
  // hammerhead bar across the bow, fin on the back
  lines.seg(P(L * 0.42, 0, -W * 0.75), P(L * 0.42, 0, W * 0.75), color, anim, phase);
  lines.seg(P(L * 0.42, 0, -W * 0.75), P(L * 0.3, 0, -W * 0.5), colorDim, anim, phase);
  lines.seg(P(L * 0.42, 0, W * 0.75), P(L * 0.3, 0, W * 0.5), colorDim, anim, phase);
  lines.seg(P(-L * 0.1, H / 2, 0), P(-L * 0.3, H / 2 + L * 0.12, 0), color, anim, phase);
  lines.seg(P(-L * 0.3, H / 2 + L * 0.12, 0), P(-L * 0.45, H / 2, 0), color, anim, phase);
}

/** Bracket corners (id box) around a contact in the horizontal plane. */
function bracket(lines, c, r, color, { anim = 0, phase = 0 } = {}) {
  const k = r * 0.4;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = c[0] + sx * r;
      const cz = c[2] + sz * r;
      lines.seg([cx, c[1], cz], [cx - sx * k, c[1], cz], color, anim, phase);
      lines.seg([cx, c[1], cz], [cx, c[1], cz - sz * k], color, anim, phase);
    }
  }
}

/** Fleet plot above the table. Own fleet at -z heading +z, hostiles at +z closing. Returns { lines, points }. */
export function buildFleetPlot(cx, top, cz, { seed = 11, sweep = 0.7 } = {}) {
  const rand = rng(seed);
  const gy = top + 0.4; // grid plane
  const hx = 1.1;
  const hz = 2.1;
  const centre = [cx, gy, cz];
  const flag = [cx, top + 0.82, cz - 1.05]; // flagship; the sweep rotates about its ground mark
  const fg = [flag[0], gy + 0.003, flag[2]];
  const lines = new HoloLines(fg, { spin: 0, sweep });
  // grid plane with major lines and a bright border, corner posts and a faint volume box
  lines.grid(cx - hx, cx + hx, cz - hz, cz + hz, gy, { step: 0.2, major: 1.0, minorColor: HOLO.cyanFaint, majorColor: HOLO.cyanDim });
  lines.poly(
    [
      [cx - hx, gy, cz - hz],
      [cx + hx, gy, cz - hz],
      [cx + hx, gy, cz + hz],
      [cx - hx, gy, cz + hz],
    ],
    HOLO.cyan,
    0,
    { closed: true }
  );
  const vy = gy + 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lines.seg([cx + sx * hx, gy, cz + sz * hz], [cx + sx * hx, vy, cz + sz * hz], HOLO.cyanFaint);
  lines.poly(
    [
      [cx - hx, vy, cz - hz],
      [cx + hx, vy, cz - hz],
      [cx + hx, vy, cz + hz],
      [cx - hx, vy, cz + hz],
    ],
    HOLO.cyanFaint,
    0,
    { closed: true }
  );
  // scale ticks along the long edges
  for (let z = -hz; z <= hz + 1e-6; z += 0.2) {
    const major = Math.abs((z / 1.0) % 1) < 1e-3 || Math.abs(Math.abs((z / 1.0) % 1) - 1) < 1e-3;
    for (const s of [-1, 1]) lines.seg([cx + s * hx, gy, cz + z], [cx + s * (hx + (major ? 0.1 : 0.05)), gy, cz + z], major ? HOLO.cyan : HOLO.cyanDim);
  }
  // own fleet
  const own = [
    { c: flag, L: 0.72, h: 0.02 },
    { c: [cx - 0.6, top + 0.72, cz - 1.45], L: 0.42, h: 0.12 },
    { c: [cx + 0.62, top + 0.74, cz - 1.5], L: 0.42, h: -0.1 },
    { c: [cx - 0.36, top + 0.88, cz - 0.5], L: 0.3, h: 0.25 },
    { c: [cx + 0.4, top + 0.9, cz - 0.42], L: 0.3, h: -0.2 },
    { c: [cx + 0.05, top + 0.7, cz - 1.8], L: 0.34, h: 0.0 },
  ];
  own.forEach((s, i) => {
    wedge(lines, s.c, s.h, s.L, i === 0 ? HOLO.white : HOLO.blue, i === 0 ? HOLO.blueDim : HOLO.blueDim, { phase: i * 1.3 });
    lines.dashed(s.c, [s.c[0], gy, s.c[2]], HOLO.blueDim, { dash: 0.04, gap: 0.05 });
    lines.diamond([s.c[0], gy + 0.002, s.c[2]], 0.05, HOLO.blueDim);
    // course vector (solid) with a speed tick
    const vx = Math.sin(s.h);
    const vz = Math.cos(s.h);
    const len = 0.35 + s.L * 0.4;
    lines.seg(s.c, [s.c[0] + vx * len, s.c[1], s.c[2] + vz * len], HOLO.blue, 3, i * 1.3);
    lines.seg([s.c[0] + vx * len - vz * 0.04, s.c[1], s.c[2] + vz * len + vx * 0.04], [s.c[0] + vx * len + vz * 0.04, s.c[1], s.c[2] + vz * len - vx * 0.04], HOLO.blue, 3, i * 1.3);
  });
  // range rings and bearing ticks around the flagship (on the grid plane), weapon arc (amber, dashed)
  lines.circle(fg, 0.5, HOLO.cyanDim, { n: 64 });
  lines.circle(fg, 1.0, HOLO.cyanDim, { n: 96, dashed: 2 });
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    const r0 = k % 3 === 0 ? 0.93 : 0.97;
    lines.seg([fg[0] + Math.sin(a) * r0, fg[1], fg[2] + Math.cos(a) * r0], [fg[0] + Math.sin(a) * 1.0, fg[1], fg[2] + Math.cos(a) * 1.0], HOLO.cyanDim);
  }
  lines.circle([flag[0], flag[1], flag[2]], 0.85, HOLO.amber, { n: 40, a0: -0.75, a1: 0.75, dashed: 2 });
  lines.circle([flag[0], flag[1], flag[2]], 0.85, HOLO.amberDim, { n: 40, a0: -0.75, a1: 0.75 });
  for (const s of [-1, 1]) lines.seg(flag, [flag[0] + Math.sin(s * 0.75) * 0.85, flag[1], flag[2] + Math.cos(s * 0.75) * 0.85], HOLO.amberDim);
  // radar sweep: fan of trailing lines rotating about the flagship's ground mark
  for (let k = 0; k < 14; k++) {
    const f = 1 - k / 14;
    const col = [HOLO.cyan[0] * f * f, HOLO.cyan[1] * f * f, HOLO.cyan[2] * f * f];
    lines.seg(fg, [fg[0], fg[1], fg[2] + 1.0], col, 4, -k * 0.045);
  }
  lines.seg(fg, [fg[0], fg[1] + 0.9, fg[2]], HOLO.cyanFaint, 4, 0);
  // hostiles
  const foes = [];
  for (let i = 0; i < 7; i++) {
    const c = [cx - 0.85 + (i / 6) * 1.7 + (rand() - 0.5) * 0.2, top + 0.68 + rand() * 0.42, cz + 0.55 + rand() * 1.3];
    const h = Math.PI + (rand() - 0.5) * 0.7;
    const L = 0.22 + rand() * 0.16;
    foes.push({ c, h, L });
    hostile(lines, c, h, L, HOLO.red, HOLO.redDim, { phase: 2 + i });
    lines.dashed(c, [c[0], gy, c[2]], HOLO.redDim, { dash: 0.03, gap: 0.05 });
    lines.diamond([c[0], gy + 0.002, c[2]], 0.04, HOLO.redDim);
    bracket(lines, c, L * 0.75, HOLO.redDim, { anim: i % 3 === 0 ? 5 : 0, phase: i * 0.37 });
    const vx = Math.sin(h);
    const vz = Math.cos(h);
    lines.dashed(c, [c[0] + vx * 0.45, c[1], c[2] + vz * 0.45], HOLO.red, { dash: 0.04, gap: 0.04, anim: 3, phase: 2 + i });
    // leader line + small data bar
    const l = [c[0] + 0.18, c[1] + 0.12, c[2] + 0.1];
    lines.seg(c, l, HOLO.redDim);
    lines.seg(l, [l[0] + 0.14, l[1], l[2]], HOLO.red);
    lines.seg([l[0], l[1] + 0.025, l[2]], [l[0] + 0.09, l[1] + 0.025, l[2]], HOLO.redDim);
  }
  // target solutions: flagship → two nearest hostiles (travelling pulse), escort → one hostile
  const byDist = [...foes].sort((a, b) => Math.hypot(a.c[0] - flag[0], a.c[2] - flag[2]) - Math.hypot(b.c[0] - flag[0], b.c[2] - flag[2]));
  for (let i = 0; i < 2; i++) lines.poly([flag, byDist[i].c], HOLO.amber, 2, { phased: true });
  lines.poly([own[3].c, byDist[2].c], HOLO.amberDim, 2, { phased: true });
  for (let i = 0; i < 3; i++) lines.circle(byDist[i].c, 0.09 + i * 0.01, HOLO.amber, { n: 20, anim: 5, phase: i * 0.3 });
  // engagement line (contact boundary) across the plot with hash marks
  const bz = cz + 0.12;
  lines.dashed([cx - hx, gy + 0.004, bz], [cx + hx, gy + 0.004, bz], HOLO.amberDim, { dash: 0.12, gap: 0.08 });
  for (let x = -hx + 0.1; x < hx; x += 0.4) lines.seg([cx + x, gy + 0.004, bz], [cx + x + 0.08, gy + 0.004, bz + 0.08], HOLO.amberDim);
  // jump-in vector for a reinforcement: dashed arc from the plot edge to the fleet (blinking marker at the end)
  const arc = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    arc.push([cx - hx + 0.05 + u * 0.95, gy + 0.3 + Math.sin(u * Math.PI) * 0.35, cz - 1.9 + u * 0.35]);
  }
  lines.poly(arc, HOLO.white, 2, { phased: true });
  lines.diamond([arc[0][0], arc[0][1], arc[0][2]], 0.05, HOLO.white, { anim: 5, vertical: true });

  // sensor returns / debris: a thin band between the fleets plus a faint scatter through the volume
  const stars = new HoloStars(centre, { spin: 0 });
  for (let i = 0; i < 700; i++) {
    const band = i < 480;
    let p;
    if (band) {
      const u = rand() * 2 - 1;
      p = [cx + u * hx * 0.95 + (rand() - 0.5) * 0.1, gy + 0.25 + rand() * 0.5 + Math.sin(u * 3) * 0.08, bz + (rand() - 0.5) * 0.45 + Math.sin(u * 5) * 0.12];
    } else {
      p = [cx + (rand() - 0.5) * 2 * hx, gy + 0.05 + rand() * 0.9, cz + (rand() - 0.5) * 2 * hz];
    }
    const k = band ? 0.35 + rand() * 0.6 : 0.2 + rand() * 0.3;
    const size = band ? 0.006 + rand() * rand() * 0.02 : 0.005 + rand() * 0.008;
    stars.add(p, [0.35 * k, 0.8 * k, 1.0 * k], size, rand() * 6.283);
  }
  return { lines: lines.build("tac-plot-lines"), points: stars.build("tac-plot-points") };
}

// ---------------------------------------------------------------------------
// Commander's lectern (standing console) — p at floor centre, operator on local +z
// ---------------------------------------------------------------------------
export function lectern(kit, p, { w = 1.2, screenMat, screenRect = null, stripRect = null, seed = 0 } = {}) {
  const rand = rng(seed + 7);
  const tilt = 0.36;
  p.box("paintedMetal", 0, 0.03, 0, w - 0.2, 0.06, 0.72, { color: IMP.dark, texel: 1 });
  p.box("paintedMetal", 0, 0.55, -0.04, w - 0.5, 0.98, 0.5, { color: IMP.black, texel: 1 });
  p.box("emitBlue", 0, 0.08, 0.322, w - 0.6, 0.02, 0.006);
  for (const s of [-1, 1]) {
    p.box("paintedMetal", s * (w / 2 - 0.05), 0.62, -0.04, 0.1, 1.24, 0.56, { color: IMP.dark, texel: 1 });
    p.box("metal", s * (w / 2 - 0.05), 1.245, -0.04, 0.11, 0.03, 0.58, { color: IMP.mid, texel: 2 });
    for (let i = 0; i < 4; i++) p.box(IND[(i + seed + (s > 0 ? 3 : 0)) % IND.length], s * (w / 2 - 0.05), 0.5 + i * 0.07, 0.244, 0.03, 0.03, 0.006);
  }
  // sloped top (high at the far side), frame edge, grab bar along the near edge
  const sy0 = 1.1;
  const sz0 = -0.02;
  p.box("darkGloss", 0, sy0, sz0, w - 0.14, 0.04, 0.6, { tilt });
  for (const [s, hh] of [
    [1, 0.03],
    [-1, 0.05],
  ]) {
    const [, ty, tz] = p.onSlope(0, hh / 2 - 0.01, s * 0.305, tilt);
    p.box("metal", 0, sy0 + ty, sz0 + tz, w - 0.14, hh, 0.03, { color: IMP.mid, texel: 2, tilt });
  }
  const [bx, by, bz] = p.onSlope(0, -0.06, 0.34, tilt);
  p.cyl("metal", bx, sy0 + by, sz0 + bz, 0.018, w - 0.3, "x", { color: IMP.steel, segments: 10 });
  for (const s of [-1, 1]) p.box("metal", s * (w / 2 - 0.22), sy0 + by, sz0 + bz - 0.03, 0.03, 0.03, 0.06, { color: IMP.mid, texel: 2 });
  // main screen + strip + keys on the slope
  {
    const [sx, sy, sz] = p.onSlope(-0.14, 0.026, -0.08, tilt);
    p.screenH(screenMat, sx, sy0 + sy, sz0 + sz, 0.62, 0.36, screenRect, tilt);
    const [tx, ty, tz] = p.onSlope(-0.14, 0.026, 0.17, tilt);
    p.screenH(screenMat, tx, sy0 + ty, sz0 + tz, 0.62, 0.08, stripRect || screenRect, tilt);
  }
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 3; i++) {
      const [kx, ky, kz] = p.onSlope(w / 2 - 0.34 + i * 0.09, 0.03, -0.2 + r * 0.09, tilt);
      const v = rand();
      const mat = v < 0.55 ? "paintedMetal" : v < 0.75 ? "emitBlue" : v < 0.9 ? "emitAmber" : "emitRedImp";
      p.box(mat, kx, sy0 + ky, sz0 + kz, 0.07, 0.016, 0.06, { color: IMP.black, texel: 4, tilt });
    }
  }
  const [ax, ay, az] = p.onSlope(w / 2 - 0.25, 0.05, 0.2, tilt);
  p.box("metal", ax, sy0 + ay, sz0 + az, 0.05, 0.07, 0.05, { color: IMP.steel, texel: 4, tilt });
  const [gx, gy, gz] = p.onSlope(w / 2 - 0.25, 0.025, 0.2, tilt);
  p.box("metal", gx, sy0 + gy, sz0 + gz, 0.03, 0.012, 0.16, { color: IMP.black, texel: 4, tilt });
  // far face (toward the audience): rank plate, decal, a red/amber status pair; rear cable duct
  p.box("metal", 0, 0.9, -0.295, w - 0.6, 0.06, 0.02, { color: IMP.mid, texel: 2 });
  placerRad(kit, p.origin[0], p.origin[1], p.origin[2], p.a + Math.PI).decal(0, 0.62, 0.296, 0.26, 14);
  p.box("emitRedImp", -0.18, 0.9, -0.306, 0.04, 0.03, 0.006);
  p.box("emitAmber", -0.1, 0.9, -0.306, 0.04, 0.03, 0.006);
  p.box("paintedMetal", 0, 0.05, -0.36, w - 0.7, 0.1, 0.1, { color: IMP.black, texel: 1 });
  p.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, 1.3, -0.4, 0.4, "lectern");
}

/** Low equipment rack (server base) along a wall under the display screens. p = wallAnchor at floor. */
export function wallRack(kit, p, { w = 6.0, h = 0.9, d = 0.5, seed = 0, screenMat = null, screenRect = null } = {}) {
  const rand = rng(seed + 13);
  const f = 0.05 + d;
  p.box("paintedMetal", 0, h / 2, 0.05 + d / 2, w, h, d, { color: IMP.black, texel: 1 });
  p.box("metal", 0, h + 0.015, 0.05 + d / 2, w + 0.02, 0.03, d + 0.02, { color: IMP.mid, texel: 2 });
  const n = Math.floor(w / 0.75);
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const ox = -w / 2 + cw * (i + 0.5);
    p.box("paintedMetal", ox, h / 2, f + 0.008, cw - 0.06, h - 0.12, 0.016, { color: IMP.dark, texel: 1 });
    if (i % 3 === 1 && screenMat) p.screenV(screenMat, ox, h * 0.6, f + 0.02, cw - 0.2, (cw - 0.2) / 6.5, screenRect);
    else for (let k = 0; k < 4; k++) p.box("metalRough", ox, h * 0.5 + k * 0.045, f + 0.02, cw - 0.22, 0.01, 0.012, { color: IMP.mid });
    for (let k = 0; k < 4; k++) {
      const v = rand();
      p.box(v < 0.55 ? "emitBlue" : v < 0.85 ? "emitAmber" : "emitRedImp", ox - (cw - 0.22) / 2 + 0.05 + k * 0.08, h * 0.84, f + 0.02, 0.035, 0.02, 0.006);
    }
    p.box("metal", ox, h * 0.22, f + 0.025, cw - 0.3, 0.02, 0.02, { color: IMP.steel, texel: 2 });
    p.box("emitBlue", ox, 0.07, f + 0.012, cw - 0.3, 0.008, 0.006);
  }
  p.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, h + 0.05, 0, f + 0.05, "rack");
}

/** A briefing seat block: rows of chairs on stepped platforms with nosing, riser hazard stripe, step lights. */
export function seatBlock(kit, floorY, { rows, zMin, zMax, seatZ, facing = 3, chairFn }) {
  // rows: [{ x, y }] from the front (lowest) to the back (highest); platforms rise toward the back (−x)
  for (let r = 1; r < rows.length; r++) {
    const xe = (rows[r].x + rows[r - 1].x) / 2;
    const xw = r + 1 < rows.length ? (rows[r].x + rows[r + 1].x) / 2 : rows[r].x - 0.55;
    const yBelow = rows[r - 1].y;
    kit.boxMM("impFloor", [xw, floorY, zMin], [xe, rows[r].y, zMax], { color: IMP.dark, texel: 0.5 });
    kit.boxMM("metal", [xe - 0.035, rows[r].y, zMin], [xe, rows[r].y + 0.006, zMax], { color: IMP.steel });
    kit.boxMM("hazard", [xe, yBelow + 0.015, zMin + 0.05], [xe + 0.006, yBelow + 0.065, zMax - 0.05], { texel: 3 });
    kit.boxMM("emitBlue", [xe, rows[r].y - 0.045, zMin + 0.05], [xe + 0.006, rows[r].y - 0.025, zMax - 0.05]);
    kit.collider([xw - 0.02, floorY, zMin - 0.02], [xe + 0.02, rows[r].y, zMax + 0.02], "seat-step");
  }
  for (const row of rows) for (const z of seatZ) chairFn(placer(kit, row.x, row.y, z, facing));
}
