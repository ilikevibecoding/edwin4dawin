// Parametric prop builders (Fable 3 domain). Builders draw into a Frame (local coords, +Z =
// facing) so placement code positions them with one call. All dimensions in meters follow the
// visual bible (desk 0.74h, seat 0.46, counter 0.9, monitor 0.61×0.37, panel 1.5, rack 0.6×1.07×2).
// Merge-friendly: parts are boxes/cylinders/quads pushed into per-room material buckets.
import { registerAsset } from '../core/assets.js';
import { galleryBuild } from './kit.js';
import { getArt } from './signage.js';
import { getFlora } from './flora.js';

// ---------------------------------------------------------------------------
// OFFICE FURNITURE
// ---------------------------------------------------------------------------

// Standard workdesk: laminate top, steel legs, modesty panel.
export function desk(f, { w = 1.4, d = 0.7, h = 0.74, top = 'laminate', legs = 'metalBlack', modesty = true } = {}) {
  f.box(top, w, 0.03, d, 0, h - 0.03, 0, { bevel: 0.008 });
  const lx = w / 2 - 0.05, lz = d / 2 - 0.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    f.box(legs, 0.045, h - 0.03, 0.045, sx * lx, 0, sz * lz);
  }
  if (modesty) f.box(legs, w - 0.16, 0.36, 0.02, 0, h - 0.42, -d / 2 + 0.06);
  f.collide(0, 0, w, d, h, { material: 'wood', blockSight: false });
}

// Executive desk: heavy veneer slab with panel sides + back credenza-style front.
export function deskExec(f, { w = 2.0, d = 0.95, h = 0.75 } = {}) {
  f.box('veneer', w, 0.04, d, 0, h - 0.04, 0, { bevel: 0.012 });
  f.box('woodDark', 0.05, h - 0.04, d - 0.1, -w / 2 + 0.06, 0, 0);
  f.box('woodDark', 0.05, h - 0.04, d - 0.1, w / 2 - 0.06, 0, 0);
  f.box('woodDark', w - 0.2, h - 0.22, 0.05, 0, 0.06, -d / 2 + 0.14);
  f.box('veneer', 0.5, 0.12, d - 0.2, -w / 2 + 0.32, h - 0.16, 0); // drawer block
  f.box('brushedMetal', 0.12, 0.02, 0.02, -w / 2 + 0.32, h - 0.11, d / 2 - 0.16);
  f.collide(0, 0, w, d, h, { material: 'wood', blockSight: false });
}

// Reception desk (HERO): curved two-tier counter with brand plate + work surface.
export function receptionDesk(f) {
  const art = getArt();
  const segs = 5;
  const R = 2.35, aSpan = Math.PI * 0.62;
  // faceted arc of counter segments, bulging toward +Z (visitors)
  for (let i = 0; i < segs; i++) {
    const a = -aSpan / 2 + (i + 0.5) * (aSpan / segs);
    const cx = Math.sin(a) * R, cz = Math.cos(a) * R - R + 0.6;
    const segW = (aSpan / segs) * R + 0.06;
    // ry = +a keeps each facet's width axis tangent to the arc (yaw rotates +Z toward +X);
    // the offsets below are along the local normal so they follow the facet.
    const nx = Math.sin(a), nz = Math.cos(a);
    // outer shell (visitor side): tall panel to 1.12
    f.box('woodDark', segW, 1.12, 0.06, cx, 0, cz, { ry: a });
    // mid band accent
    f.box('brushedMetal', segW, 0.05, 0.065, cx, 0.62, cz, { ry: a });
    // counter cap at 1.12 (bevelled veneer)
    f.box('veneer', segW + 0.04, 0.04, 0.34, cx - nx * 0.12, 1.12, cz - nz * 0.12, { ry: a, bevel: 0.012 });
    // inner work top at 0.74
    f.box('laminateWhite', segW, 0.03, 0.62, cx - nx * 0.42, 0.72, cz - nz * 0.42, { ry: a });
    // kick reveal
    f.box('metalBlack', segW, 0.09, 0.05, cx + nx * 0.005, 0, cz + nz * 0.005, { ry: a });
  }
  // brand plate on the center segment
  f.quad(art.signMat, 1.7, 0.46, 0, 0.4, 0.66, { uv: art.uv.receptionLogo });
  // work-side return + pedestal + gear
  f.box('laminateWhite', 1.5, 0.03, 0.6, 0, 0.72, -2.2);
  f.box('metalBlack', 0.04, 0.7, 0.04, -0.68, 0, -2.45);
  f.box('metalBlack', 0.04, 0.7, 0.04, 0.68, 0, -2.45);
  f.box('metalBlack', 0.04, 0.7, 0.04, -0.68, 0, -1.95);
  f.box('metalBlack', 0.04, 0.7, 0.04, 0.68, 0, -1.95);
  pedestal(f, { at: [0.45, -2.2] });
  monitor(f, { at: [-0.35, 0.75, -0.6], ry: Math.PI * 0.92, variant: 1 });
  monitor(f, { at: [0.45, 0.75, -0.52], ry: Math.PI * 1.08, variant: 0 });
  keyboard(f, { at: [-0.3, 0.75, -0.25], ry: Math.PI });
  deskPhone(f, { at: [0.9, 0.75, -0.3], ry: Math.PI * 0.9 });
  paperStack(f, { at: [-0.95, 0.75, -0.35], n: 3 });
  // colliders: arc approximated by 3 AABBs + return
  f.collide(0, 0.55, 3.4, 1.15, 1.16, { material: 'wood', blockSight: false });
  f.collide(-1.55, 0.1, 0.9, 1.4, 1.16, { material: 'wood', blockSight: false });
  f.collide(1.55, 0.1, 0.9, 1.4, 1.16, { material: 'wood', blockSight: false });
  f.collide(0, -2.2, 1.5, 0.62, 0.75, { material: 'wood', blockSight: false });
}

// Task chair on casters.
export function taskChair(f, { fabricMat = 'upholstery' } = {}) {
  f.box(fabricMat, 0.46, 0.07, 0.44, 0, 0.42, 0, { bevel: 0.02 });
  f.box(fabricMat, 0.44, 0.52, 0.07, 0, 0.52, -0.22, { bevel: 0.02, rx: -0.08 });
  f.cyl('metalBlack', 0.02, 0.24, 0, 0.18, 0, { seg: 6 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    f.box('metalBlack', 0.05, 0.03, 0.26, Math.sin(a) * 0.15, 0.05, Math.cos(a) * 0.15, { ry: a });
    f.sphere('hardPlastic', 0.032, Math.sin(a) * 0.27, 0, Math.cos(a) * 0.27, { seg: 6 });
  }
  for (const s of [-1, 1]) {
    f.box('hardPlastic', 0.03, 0.2, 0.05, s * 0.25, 0.42, 0);
    f.box('hardPlastic', 0.06, 0.025, 0.24, s * 0.25, 0.6, 0);
  }
  f.collide(0, 0, 0.5, 0.5, 0.95, { material: 'wood', blockSight: false });
}

// Stacking side chair (4 legs).
export function stackChair(f, { seatMat = 'hardPlastic' } = {}) {
  f.box(seatMat, 0.44, 0.04, 0.42, 0, 0.44, 0, { bevel: 0.012 });
  f.box(seatMat, 0.44, 0.36, 0.04, 0, 0.5, -0.2, { bevel: 0.012, rx: -0.1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    f.cyl('brushedMetal', 0.014, 0.44, sx * 0.19, 0, sz * 0.18, { seg: 6 });
  }
  f.collide(0, 0, 0.46, 0.46, 0.86, { material: 'metal', blockSight: false });
}

// Waiting sofa (n seats) + arms.
export function sofa(f, { seats = 2, mat = 'upholstery' } = {}) {
  const w = seats * 0.62 + 0.24;
  f.box('metalBlack', w - 0.1, 0.09, 0.66, 0, 0.02, 0);
  f.box(mat, w - 0.16, 0.16, 0.6, 0, 0.11, 0.02, { bevel: 0.03 });
  for (let i = 0; i < seats; i++) {
    const cx = -w / 2 + 0.12 + 0.31 + i * 0.62;
    f.box(mat, 0.58, 0.13, 0.56, cx, 0.27, 0.03, { bevel: 0.035 });
    f.box(mat, 0.58, 0.42, 0.14, cx, 0.36, -0.26, { bevel: 0.035, rx: -0.06 });
  }
  for (const s of [-1, 1]) f.box(mat, 0.12, 0.5, 0.6, s * (w / 2 - 0.06), 0.05, 0, { bevel: 0.03 });
  f.collide(0, 0, w, 0.7, 0.78, { material: 'wood', blockSight: false });
}

// Low side/coffee table.
export function coffeeTable(f, { w = 0.9, d = 0.55, h = 0.42 } = {}) {
  f.box('veneer', w, 0.025, d, 0, h - 0.025, 0, { bevel: 0.008 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    f.box('metalBlack', 0.03, h - 0.02, 0.03, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05));
  }
  f.collide(0, 0, w, d, h, { material: 'wood', blockSight: false });
}

// Conference table: long slab, twin pedestal bases, cable hatch.
export function confTable(f, { l = 3.6, w = 1.3, h = 0.74 } = {}) {
  f.box('veneer', l, 0.04, w, 0, h - 0.04, 0, { bevel: 0.014 });
  for (const s of [-1, 1]) {
    f.box('metalBlack', 0.09, h - 0.06, 0.8, s * (l / 2 - 0.55), 0, 0);
    f.box('metalBlack', 0.5, 0.03, 0.9, s * (l / 2 - 0.55), 0, 0);
  }
  f.box('metalBlack', 0.5, 0.015, 0.18, 0, h - 0.012, 0);
  f.collide(0, 0, l, w, h, { material: 'wood', blockSight: false });
}

// Cubicle workstation: L worksurface inside fabric panels (panels shared between neighbors
// are emitted by the block, not here). This draws surface+gear+chair for one bay.
export function cubicleBay(f, { chairA = 0, variant = 0 } = {}) {
  const art = getArt();
  // L-shaped worksurface along −Z (back) and −X panels
  f.box('laminate', 1.9, 0.03, 0.6, 0, 0.71, -0.55);
  f.box('laminate', 0.6, 0.03, 0.9, -0.65, 0.71, 0.2);
  for (const [lx, lz] of [[-0.9, -0.78], [0.88, -0.78], [-0.9, 0.6], [0.88, -0.3]]) {
    f.box('metalBlack', 0.04, 0.68, 0.04, lx, 0, lz);
  }
  f.collide(-0.05, -0.55, 1.95, 0.65, 0.74, { material: 'wood', blockSight: false });
  f.collide(-0.65, 0.2, 0.62, 0.95, 0.74, { material: 'wood', blockSight: false });
  monitor(f, { at: [0.15 + (variant % 2) * 0.2, 0.74, -0.68], ry: Math.PI + (variant - 1) * 0.12, dual: variant % 3 === 0, variant });
  keyboard(f, { at: [0.1, 0.74, -0.38], ry: Math.PI });
  pedestal(f, { at: [0.62, 0.15] });
  taskChair(f.sub(0.1, 0.28, Math.PI + chairA));
  if (variant % 2 === 0) towerPC(f, { at: [-0.72, 0, -0.6] });
  if (variant % 3 === 0) deskPhone(f, { at: [-0.62, 0.74, 0.0], ry: Math.PI / 2 });
  if (variant % 3 === 1) mug(f, { at: [0.55, 0.74, -0.45] });
  if (variant % 4 === 2) deskPlant(f, { at: [-0.62, 0.74, -0.62] });
  paperStack(f, { at: [-0.6, 0.74, 0.42], n: 2 + (variant % 3) });
}

// Fabric cubicle panel run (with aluminum trim cap).
export function cubiclePanel(f, { len = 1.8, h = 1.5 } = {}) {
  f.box('fabric', len, h - 0.14, 0.05, 0, 0.09, 0);
  f.box('aluminum', len, 0.045, 0.06, 0, h - 0.045, 0);
  f.box('metalBlack', len, 0.09, 0.055, 0, 0, 0);
  f.collide(0, 0, len, 0.08, h, { material: 'drywall', blockSight: false });
}

// Filing cabinet (n drawers).
export function filingCabinet(f, { drawers = 4, mat = 'paintedMetal' } = {}) {
  const h = drawers === 4 ? 1.32 : 0.72;
  f.box(mat, 0.47, h, 0.62, 0, 0, 0, { bevel: 0.01 });
  for (let i = 0; i < drawers; i++) {
    const dy = 0.06 + (i + 0.5) * ((h - 0.1) / drawers);
    f.box('brushedMetal', 0.16, 0.025, 0.02, 0, dy + 0.08, 0.315);
    f.box('metalBlack', 0.4, 0.015, 0.015, 0, dy - 0.06, 0.315);
  }
  f.collide(0, 0, 0.5, 0.65, h, { material: 'metal', blockSight: h > 1.2 });
}

// Under-desk drawer pedestal.
export function pedestal(f, { at = [0, 0] } = {}) {
  const [lx, lz] = at;
  f.box('paintedMetal', 0.4, 0.58, 0.55, lx, 0, lz, { bevel: 0.008 });
  for (let i = 0; i < 3; i++) f.box('brushedMetal', 0.14, 0.02, 0.015, lx, 0.12 + i * 0.17, lz + 0.28);
}

// Open shelving unit with stored contents.
export function shelfUnit(f, { w = 0.9, h = 1.8, d = 0.4, mat = 'paintedMetal', fill = 'boxes', seed = 1 } = {}) {
  const art = getArt();
  const shelves = 4;
  for (const s of [-1, 1]) f.box(mat, 0.05, h, d, s * (w / 2 - 0.025), 0, 0);
  for (let i = 0; i <= shelves; i++) {
    f.box(mat, w - 0.08, 0.03, d, 0, 0.06 + (i * (h - 0.12)) / shelves, 0);
  }
  let sVar = seed;
  for (let i = 0; i < shelves; i++) {
    const y = 0.09 + (i * (h - 0.12)) / shelves;
    sVar = (sVar * 16807) % 2147483647;
    if (fill === 'boxes') {
      const n = 1 + (sVar % 3);
      for (let b = 0; b < n; b++) {
        f.box('cardboard', 0.24, 0.18 + ((sVar >> b) % 3) * 0.03, d - 0.08, -w / 2 + 0.2 + b * 0.28, y, 0);
      }
    } else if (fill === 'binders') {
      f.quad(art.signMat, w - 0.14, 0.26, 0, y, d / 2 - 0.02, { uv: art.uv.books[(seed + i) % 3] });
      f.box('metalBlack', w - 0.12, 0.01, 0.02, 0, y + 0.27, d / 2 - 0.03);
    } else if (fill === 'chem') {
      const n = 2 + (sVar % 3);
      for (let b = 0; b < n; b++) {
        const bmat = ['softPlastic', 'plasticWhite', 'paintedMetalRed'][(sVar >> b) % 3];
        f.cyl(bmat, 0.05, 0.2 + ((sVar >> b) % 2) * 0.06, -w / 2 + 0.16 + b * 0.17, y, 0, { seg: 7 });
      }
    }
  }
  f.collide(0, 0, w, d + 0.02, h, { material: 'metal', blockSight: false });
}

// Wooden bookcase with book rows.
export function bookcase(f, { w = 0.9, h = 1.9, d = 0.32 } = {}) {
  const art = getArt();
  f.box('woodDark', w, h, d, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const y = 0.12 + i * ((h - 0.24) / 4);
    f.box('veneer', w - 0.06, 0.024, d - 0.04, 0, y + 0.32, 0.01);
    f.quad(art.signMat, w - 0.1, 0.3, 0, y, d / 2 + 0.002, { uv: art.uv.books[i % 3] });
  }
  f.collide(0, 0, w, d, h, { material: 'wood', blockSight: true });
}

// Rolling archive rack (records room): tall double-sided shelving with drive wheel.
export function archiveRack(f, { w = 2.4, h = 2.2, d = 0.66, seed = 1 } = {}) {
  const art = getArt();
  f.box('paintedMetal', w, 0.1, d, 0, 0, 0);
  f.box('paintedMetal', w, 0.05, d, 0, h - 0.05, 0);
  for (const s of [-1, 1]) f.box('paintedMetal', 0.05, h, d, s * (w / 2 - 0.025), 0, 0);
  f.box('paintedMetal', 0.05, h, d, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const y = 0.14 + i * ((h - 0.3) / 4);
    f.box('paintedMetal', w - 0.1, 0.03, d, 0, y + 0.36, 0);
    for (const sz of [-1, 1]) {
      // banker's boxes rows on both faces
      const n = Math.floor((w - 0.2) / 0.36);
      for (let b = 0; b < n; b++) {
        if ((seed * (i + 2) * (b + 3)) % 5 === 0) continue;
        f.box('cardboard', 0.32, 0.26, 0.26, -w / 2 + 0.24 + b * 0.36, y + 0.04, sz * (d / 4));
        if (b % 2 === 0) f.quad(art.signMat, 0.24, 0.18, -w / 2 + 0.24 + b * 0.36, y + 0.07, sz * (d / 4 + 0.135) + (sz > 0 ? 0.001 : -0.001), { uv: art.uv.boxLabels[(i + b) % 2], ry: sz > 0 ? 0 : Math.PI });
      }
    }
  }
  // drive wheel on the end panel
  f.cyl('metalBlack', 0.16, 0.05, w / 2 + 0.03, 1.1, 0, { rz: Math.PI / 2, seg: 12 });
  f.cyl('brushedMetal', 0.02, 0.1, w / 2 + 0.02, 1.1, 0.12, { rz: Math.PI / 2, seg: 6 });
  f.collide(0, 0, w + 0.1, d, h, { material: 'metal', blockSight: true });
}

// ---------------------------------------------------------------------------
// ELECTRONICS
// ---------------------------------------------------------------------------
export function monitor(f, { at = [0, 0.74, 0], ry = 0, dual = false, variant = null } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  const N = art.uv.monitors.length;
  // WP-012b: unset variant picks deterministically from world position, so the office doesn't
  // repeat the same two screens (cosmetic-rng contract: stable across runs).
  const v = variant == null ? posHash(f) % N : variant;
  const one = (ox, tilt) => {
    f.box('electronics', 0.61, 0.37, 0.028, lx + ox, ly + 0.12, lz, { ry, bevel: 0.008 });
    f.quad(art.screenMat, 0.565, 0.325, lx + ox, ly + 0.143, lz + 0.016, { ry, uv: art.uv.monitors[(v + (ox > 0 ? 3 : 0)) % N] });
  };
  if (dual) { one(-0.315, 0); one(0.315, 0); } else one(0, 0);
  f.box('metalBlack', 0.05, 0.12, 0.04, lx, ly, lz - 0.02, { ry });
  f.box('metalBlack', 0.22, 0.02, 0.16, lx, ly, lz - 0.02, { ry });
}

export function keyboard(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  f.box('electronics', 0.44, 0.018, 0.15, lx, ly, lz, { ry });
  f.quad(art.signMat, 0.42, 0.13, lx, ly + 0.019, lz, { ry, uv: art.uv.keyboard, horizontal: true });
  f.box('hardPlastic', 0.06, 0.014, 0.1, lx + 0.31, ly, lz + 0.02, { ry, bevel: 0.006 }); // mouse
  f.box('softPlastic', 0.22, 0.004, 0.18, lx + 0.31, ly, lz + 0.01, { ry }); // pad
}

export function towerPC(f, { at = [0, 0, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.box('electronics', 0.18, 0.42, 0.44, lx, ly, lz, { bevel: 0.006 });
  f.box('ledGreen', 0.012, 0.012, 0.005, lx + 0.05, ly + 0.36, lz + 0.222);
}

export function laptop(f, { at = [0, 0.74, 0], ry = 0, open = true, variant = null } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  const N = art.uv.monitors.length;
  const v = variant == null ? (posHash(f) + 5) % N : variant % N;
  f.box('brushedMetal', 0.34, 0.014, 0.24, lx, ly, lz, { ry });
  if (open) {
    f.box('brushedMetal', 0.34, 0.23, 0.008, lx, ly + 0.01, lz - 0.115, { ry, rx: 0.28 });
    f.quad(art.screenMat, 0.31, 0.2, lx, ly + 0.033, lz - 0.108, { ry, rx: 0.28, uv: art.uv.monitors[v] });
  } else {
    f.box('brushedMetal', 0.34, 0.012, 0.24, lx, ly + 0.014, lz, { ry });
  }
}

export function deskPhone(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  f.box('hardPlastic', 0.19, 0.045, 0.19, lx, ly, lz, { ry, rx: 0.12, bevel: 0.008 });
  f.quad(art.signMat, 0.15, 0.16, lx, ly + 0.048, lz - 0.006, { ry, rx: 0.12 - Math.PI / 2, uv: art.uv.phone });
  f.box('hardPlastic', 0.045, 0.035, 0.17, lx - 0.11, ly, lz, { ry, bevel: 0.01 }); // handset
}

export function printerSmall(f, { at = [0, 0, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('plasticBeige', 0.46, 0.24, 0.4, lx, ly, lz, { ry, bevel: 0.012 });
  f.box('electronics', 0.34, 0.03, 0.26, lx, ly + 0.24, lz, { ry });
  f.box('paper', 0.28, 0.02, 0.2, lx, ly + 0.27, lz + 0.02, { ry });
}

// Large office copier (HERO, copy room).
export function copier(f) {
  const art = getArt();
  f.box('plasticBeige', 1.05, 0.86, 0.68, 0, 0.12, 0, { bevel: 0.02 });
  f.box('metalBlack', 0.95, 0.12, 0.6, 0, 0, 0);
  f.box('plasticWhite', 1.05, 0.06, 0.68, 0, 0.98, 0, { bevel: 0.015 }); // lid
  f.box('electronics', 0.4, 0.025, 0.3, 0, 1.04, -0.1, { rx: 0.18 });
  f.quad(art.screenMat, 0.34, 0.15, 0, 1.058, -0.085, { rx: 0.18 - Math.PI / 2, uv: art.uv.copierPanel });
  // output + paper trays
  f.box('plasticBeige', 0.5, 0.03, 0.3, 0.12, 0.62, 0.42, { bevel: 0.008 });
  f.box('paper', 0.3, 0.025, 0.21, 0.12, 0.65, 0.42);
  for (let i = 0; i < 2; i++) f.box('softPlastic', 0.9, 0.16, 0.04, 0, 0.16 + i * 0.22, 0.345);
  f.box('ledGreen', 0.01, 0.01, 0.006, 0.44, 0.9, 0.341);
  f.collide(0, 0.05, 1.1, 0.75, 1.05, { material: 'metal', blockSight: false });
}

// Projector + conference wall display.
export function projector(f, { at = [0, 2.2, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.cyl('plasticWhite', 0.02, 0.35, lx, ly, lz, { seg: 6 });
  f.box('plasticWhite', 0.4, 0.12, 0.3, lx, ly - 0.12, lz, { bevel: 0.02 });
  f.cyl('screenOff', 0.045, 0.02, lx + 0.1, ly - 0.09, lz + 0.15, { rx: Math.PI / 2, seg: 8 });
}

export function confDisplay(f, { w = 2.4 } = {}) {
  const art = getArt();
  const h = w * 0.58;
  f.box('electronics', w, h, 0.06, 0, 0, 0, { bevel: 0.012 });
  f.quad(art.screenMat, w - 0.08, h - 0.08, 0, 0.04, 0.033, { uv: art.uv.slide });
}

export function whiteboard(f, { w = 1.8, variant = 0 } = {}) {
  const art = getArt();
  const h = 1.1;
  f.box('aluminum', w + 0.06, h + 0.06, 0.02, 0, 0, 0);
  f.quad(art.signMat, w, h, 0, 0.03, 0.012, { uv: art.uv.whiteboards[variant % 2] });
  f.box('aluminum', 0.5, 0.03, 0.05, 0, -0.02, 0.02);
}

export function wallClock(f) {
  const art = getArt();
  f.cyl('metalBlack', 0.17, 0.035, 0, 0, 0, { rx: Math.PI / 2, seg: 14 });
  f.quad(art.signMat, 0.3, 0.3, 0, -0.15, 0.019, { uv: art.uv.clock });
}

// Security monitor wall (sec office hero-lite).
export function secMonitorWall(f) {
  const art = getArt();
  f.box('metalBlack', 2.0, 1.24, 0.1, 0, 1.05, 0);
  for (const [ox, oy] of [[-0.51, 0.62], [0.51, 0.62]]) {
    f.quad(art.screenMat, 0.98, 0.6, ox, oy + 0.75, 0.052, { uv: art.uv.secgrid });
  }
  f.box('electronics', 1.9, 0.1, 0.3, 0, 0.9, 0.1);
  for (let i = 0; i < 3; i++) f.box('ledGreen', 0.01, 0.01, 0.006, -0.8 + i * 0.12, 0.94, 0.251);
  f.collide(0, 0.05, 2.0, 0.3, 2.3, { material: 'metal', blockSight: false });
}

// Server rack (HERO, server room): cabinet + rail slots + LED banks + vent door.
export function serverRack(f, { seed = 1, open = false } = {}) {
  const art = getArt();
  const W = 0.6, D = 1.07, H = 2.0;
  f.box('metalBlack', W, H, D, 0, 0, 0, { bevel: 0.012 });
  f.box('paintedMetal', W - 0.04, 0.06, D - 0.04, 0, H - 0.05, 0);
  // front face: unit slots
  let y = 0.14;
  let s = seed;
  while (y < H - 0.3) {
    s = (s * 48271) % 2147483647;
    const uH = [0.045, 0.09, 0.13][s % 3];
    const kind = s % 5;
    if (kind < 3) {
      f.box('electronics', W - 0.08, uH, 0.02, 0, y, D / 2 + 0.002);
      f.quad(art.screenMat, W - 0.14, Math.min(0.035, uH * 0.5), 0, y + uH * 0.28, D / 2 + 0.016, { uv: art.uv.rackled[s % 3] });
    } else if (kind === 3) {
      f.box('hardPlastic', W - 0.08, uH, 0.02, 0, y, D / 2 + 0.002); // blank plate
    } else {
      f.box('electronics', W - 0.08, uH, 0.02, 0, y, D / 2 + 0.002);
      f.box('brushedMetal', W - 0.12, 0.012, 0.01, 0, y + uH / 2 - 0.02, D / 2 + 0.02);
    }
    y += uH + 0.02;
  }
  f.collide(0, 0, W + 0.02, D + 0.02, H, { material: 'metal', blockSight: true });
}

export function networkCabinet(f) {
  const art = getArt();
  f.box('metalBlack', 0.6, 1.2, 0.5, 0, 0, 0, { bevel: 0.01 });
  for (let i = 0; i < 4; i++) {
    f.box('electronics', 0.52, 0.06, 0.02, 0, 0.16 + i * 0.24, 0.252);
    f.quad(art.screenMat, 0.46, 0.028, 0, 0.175 + i * 0.24, 0.263, { uv: art.uv.rackled[i % 3] });
  }
  f.collide(0, 0, 0.62, 0.52, 1.2, { material: 'metal', blockSight: false });
}

export function upsUnit(f, { at = [0, 0, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.box('metalBlack', 0.5, 0.4, 0.7, lx, ly, lz, { bevel: 0.01 });
  f.box('ledAmber', 0.012, 0.012, 0.006, lx - 0.15, ly + 0.32, lz + 0.352);
  f.box('ledGreen', 0.012, 0.012, 0.006, lx - 0.11, ly + 0.32, lz + 0.352);
}

// Cable tray segment (service ceilings) + hanging bundle.
export function cableTray(f, { len = 3 } = {}) {
  f.box('paintedMetal', len, 0.04, 0.3, 0, 0, 0);
  for (const s of [-1, 1]) f.box('paintedMetal', len, 0.09, 0.02, 0, 0, s * 0.15);
  f.box('rubber', len, 0.05, 0.2, 0, 0.03, 0);
}

// ---------------------------------------------------------------------------
// BREAK ROOM / KITCHEN
// ---------------------------------------------------------------------------
export function kitchenRun(f, { len = 3.4 } = {}) {
  // base cabinets + counter + sink + uppers along local +X, back at local -Z
  f.box('laminateWhite', len, 0.86, 0.6, len / 2, 0, 0, { });
  f.box('metalBlack', len, 0.1, 0.55, len / 2, 0, -0.02);
  f.box('laminate', len + 0.04, 0.04, 0.64, len / 2, 0.86, 0.01, { bevel: 0.01 });
  // door + drawer seams
  const doors = Math.round(len / 0.55);
  for (let i = 0; i < doors; i++) {
    const x = (i + 0.5) * (len / doors);
    f.box('plasticWhite', len / doors - 0.04, 0.62, 0.015, x, 0.1, 0.298);
    f.box('brushedMetal', 0.12, 0.02, 0.02, x, 0.72, 0.31);
  }
  // sink + faucet
  const sx = len * 0.3;
  f.box('stainless', 0.5, 0.02, 0.42, sx, 0.885, 0);
  f.box('metalBlack', 0.42, 0.012, 0.34, sx, 0.888, 0, { });
  f.cyl('stainless', 0.02, 0.24, sx - 0.18, 0.9, -0.14, { seg: 8 });
  f.box('stainless', 0.18, 0.025, 0.03, sx - 0.09, 1.12, -0.14);
  // upper cabinets
  f.box('laminateWhite', len * 0.72, 0.65, 0.35, len * 0.4, 1.5, -0.12);
  for (let i = 0; i < Math.round(len * 0.72 / 0.5); i++) {
    f.box('plasticWhite', 0.46, 0.57, 0.015, len * 0.4 - (len * 0.72) / 2 + 0.27 + i * 0.5, 1.54, 0.06);
  }
  f.collide(len / 2, 0, len, 0.66, 0.9, { material: 'wood', blockSight: false });
}

export function fridge(f) {
  f.box('stainless', 0.75, 1.8, 0.72, 0, 0, 0, { bevel: 0.02 });
  f.box('brushedMetal', 0.03, 0.5, 0.05, -0.28, 1.15, 0.37);
  f.box('brushedMetal', 0.03, 0.3, 0.05, -0.28, 0.62, 0.37);
  f.box('metalBlack', 0.7, 0.06, 0.66, 0, 0.0, 0);
  f.collide(0, 0, 0.78, 0.75, 1.8, { material: 'metal', blockSight: true });
}

export function microwave(f, { at = [0, 0.9, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('metalBlack', 0.5, 0.3, 0.36, lx, ly, lz, { ry, bevel: 0.01 });
  f.box('screenOff', 0.3, 0.22, 0.015, lx - 0.06, ly + 0.04, lz + 0.18, { ry });
  f.box('ledGreen', 0.05, 0.015, 0.006, lx + 0.17, ly + 0.22, lz + 0.181, { ry });
}

export function coffeeMachine(f, { at = [0, 0.9, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('electronics', 0.24, 0.36, 0.3, lx, ly, lz, { ry, bevel: 0.01 });
  f.box('hardPlastic', 0.24, 0.05, 0.3, lx, ly + 0.36, lz, { ry });
  f.cyl('glassClear', 0.09, 0.14, lx, ly + 0.02, lz + 0.06, { ry, seg: 10 });
  f.box('ledRed', 0.01, 0.01, 0.005, lx + 0.08, ly + 0.3, lz + 0.151, { ry });
}

export function kettle(f, { at = [0, 0.9, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.cyl('brushedMetal', 0.085, 0.2, lx, ly, lz, { seg: 10, rTop: 0.06 });
  f.box('hardPlastic', 0.03, 0.12, 0.08, lx - 0.1, ly + 0.05, lz);
}

// Vending machine (HERO): emissive "Polar Bites" front.
export function vendingMachine(f) {
  const art = getArt();
  f.box('paintedMetal', 0.95, 1.9, 0.8, 0, 0, 0, { bevel: 0.02 });
  f.box('metalBlack', 0.9, 0.08, 0.75, 0, 0, 0.01);
  f.quad(art.screenMat, 0.62, 1.7, -0.12, 0.12, 0.402, { uv: art.uv.vending });
  f.box('metalBlack', 0.2, 1.7, 0.02, 0.36, 0.12, 0.4);
  f.box('electronics', 0.16, 0.3, 0.03, 0.36, 1.15, 0.407);
  f.box('ledCyan', 0.1, 0.02, 0.005, 0.36, 1.32, 0.425);
  f.box('metalBlack', 0.5, 0.16, 0.04, -0.12, 0.16, 0.41); // pickup flap
  f.collide(0, 0, 0.98, 0.85, 1.9, { material: 'metal', blockSight: true });
}

export function waterCooler(f) {
  f.box('plasticWhite', 0.34, 0.96, 0.34, 0, 0, 0, { bevel: 0.015 });
  f.cyl('glassTinted', 0.14, 0.36, 0, 0.96, 0, { seg: 10, rTop: 0.12 });
  f.box('hardPlastic', 0.2, 0.06, 0.1, 0, 0.78, 0.19);
  f.collide(0, 0, 0.36, 0.36, 1.35, { material: 'metal', blockSight: false });
}

export function cafeTable(f, { r = 0.45 } = {}) {
  f.cyl('laminateWhite', r, 0.03, 0, 0.72, 0, { seg: 14 });
  f.cyl('metalBlack', 0.03, 0.72, 0, 0, 0, { seg: 8 });
  f.cyl('metalBlack', 0.24, 0.02, 0, 0, 0, { seg: 10 });
  f.collide(0, 0, r * 2, r * 2, 0.75, { material: 'metal', blockSight: false });
}

export function mug(f, { at = [0, 0.74, 0], mat = 'plasticWhite', full = false } = {}) {
  const [lx, ly, lz] = at;
  f.cyl(mat, 0.04, 0.095, lx, ly, lz, { seg: 8 });
  // full: fresh coffee surface just under the rim (occupied-room storytelling)
  if (full) f.cyl('leather', 0.033, 0.004, lx, ly + 0.088, lz, { seg: 8 });
}

export function bottle(f, { at = [0, 0, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.cyl('glassTinted', 0.033, 0.19, lx, ly, lz, { seg: 7, rTop: 0.015 });
  f.cyl('ledCyan', 0.016, 0.03, lx, ly + 0.19, lz, { seg: 6 });
}

export function sodaCan(f, { at = [0, 0, 0], mat = 'paintedMetalRed' } = {}) {
  const [lx, ly, lz] = at;
  f.cyl(mat, 0.033, 0.115, lx, ly, lz, { seg: 8 });
}

export function trashBin(f, { mat = 'softPlastic', r = 0.18, h = 0.6, recycle = false } = {}) {
  f.cyl(recycle ? 'drywallBlue' : mat, r, h, 0, 0, 0, { seg: 10, rTop: r * 0.92 });
  f.cyl('metalBlack', r + 0.012, 0.03, 0, h - 0.015, 0, { seg: 10 });
  f.collide(0, 0, r * 2, r * 2, h, { material: 'metal', blockSight: false });
}

export function paperTowel(f, { at = [0, 1.2, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('plasticWhite', 0.26, 0.34, 0.11, lx, ly, lz, { ry, bevel: 0.012 });
}

export function noticeBoard(f, { w = 1.4 } = {}) {
  const art = getArt();
  f.box('aluminum', w + 0.05, 0.95, 0.02, 0, 0, 0);
  f.quad(art.signMat, w, 0.9, 0, 0.025, 0.012, { uv: art.uv.notice });
}

// ---------------------------------------------------------------------------
// RESTROOMS
// ---------------------------------------------------------------------------
export function vanity(f, { sinks = 2 } = {}) {
  const art = getArt();
  const w = sinks * 0.75 + 0.2;
  f.box('laminate', w, 0.05, 0.56, 0, 0.82, 0, { bevel: 0.01 });
  f.box('plasticWhite', w, 0.5, 0.5, 0, 0.3, -0.02);
  for (let i = 0; i < sinks; i++) {
    const x = -w / 2 + 0.48 + i * 0.75;
    f.box('plasticWhite', 0.44, 0.04, 0.36, x, 0.87, 0.02, { bevel: 0.015 });
    f.cyl('chrome', 0.015, 0.16, x, 0.87, -0.16, { seg: 7 });
    f.box('chrome', 0.1, 0.02, 0.025, x, 1.02, -0.15);
    f.quad(art.signMat, 0.56, 0.8, x, 1.15, -0.255, { uv: art.uv.mirror });
    f.box('aluminum', 0.6, 0.84, 0.015, x, 1.13, -0.27);
  }
  f.collide(0, 0, w, 0.6, 0.88, { material: 'tile', blockSight: false });
}

export function toilet(f) {
  f.box('plasticWhite', 0.2, 0.78, 0.16, 0, 0, -0.24, { bevel: 0.02 }); // tank against wall
  f.box('plasticWhite', 0.36, 0.14, 0.5, 0, 0.28, 0.02, { bevel: 0.05 });
  f.box('plasticWhite', 0.3, 0.3, 0.3, 0, 0, 0, { bevel: 0.04 });
  f.box('chrome', 0.06, 0.02, 0.04, 0, 0.62, -0.22);
  f.collide(0, -0.05, 0.4, 0.66, 0.78, { material: 'tile', blockSight: false });
}

export function stallRun(f, { stalls = 2, depth = 1.35, w = 0.95 } = {}) {
  // partitions perpendicular to back wall (-Z), doors at +Z
  for (let i = 0; i <= stalls; i++) {
    f.box('paintedMetal', 0.025, 1.5, depth, -w * stalls / 2 + i * w, 0.25, 0);
    f.collide(-w * stalls / 2 + i * w, 0, 0.05, depth, 1.8, { material: 'metal', blockSight: false });
  }
  // WP-012b: per-stall ajar variance (deterministic by world position) — doors hinge at their
  // left stile and swing inward by a varied angle; only near-closed doors get a collider.
  const swing = [0.14, 0.55, 0, 0.34];
  for (let i = 0; i < stalls; i++) {
    const x = -w * stalls / 2 + (i + 0.5) * w;
    const ajar = swing[(i + posHash(f)) % swing.length];
    const r = (w - 0.12) / 2;
    f.box('paintedMetal', w - 0.12, 1.35, 0.025, x - r + r * Math.cos(ajar), 0.35, depth / 2 - r * Math.sin(ajar), { ry: ajar });
    if (ajar < 0.05) f.collide(x, depth / 2, w - 0.1, 0.06, 1.75, { material: 'metal', blockSight: false, y0: 0.3 });
    toilet(f.sub(x, -depth / 2 + 0.35));
  }
}

export function handDryer(f, { at = [0, 1.15, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('brushedMetal', 0.26, 0.3, 0.16, lx, ly, lz, { ry, bevel: 0.02 });
}

export function wallDispenser(f, { at = [0, 1.1, 0], ry = 0, mat = 'plasticWhite' } = {}) {
  const [lx, ly, lz] = at;
  f.box(mat, 0.14, 0.22, 0.11, lx, ly, lz, { ry, bevel: 0.01 });
}

export function floorDrain(f, { at = [0, 0] } = {}) {
  f.box('brushedMetal', 0.16, 0.004, 0.16, at[0], 0.001, at[1]);
}

// ---------------------------------------------------------------------------
// MAINTENANCE / LOADING / GARAGE
// ---------------------------------------------------------------------------
export function electricalPanel(f, { at = [0, 1.0, 0], ry = 0, w = 0.5, h = 0.7 } = {}) {
  const [lx, ly, lz] = at;
  f.box('paintedMetal', w, h, 0.14, lx, ly, lz, { ry, bevel: 0.01 });
  f.box('metalBlack', 0.05, 0.02, 0.03, lx + w / 2 - 0.08, ly + h / 2, lz + 0.075, { ry });
  f.box('ledRed', 0.012, 0.012, 0.006, lx - w / 2 + 0.08, ly + h - 0.08, lz + 0.072, { ry });
}

export function transformerCabinet(f) {
  f.box('paintedMetal', 1.2, 1.5, 0.8, 0, 0, 0, { bevel: 0.02 });
  f.box('paintedMetal', 1.1, 0.12, 0.7, 0, 1.5, 0);
  for (let i = 0; i < 3; i++) f.box('metalBlack', 0.3, 1.1, 0.02, -0.4 + i * 0.4, 0.2, 0.41);
  f.box('ledAmber', 0.014, 0.014, 0.006, -0.42, 1.32, 0.412);
  f.collide(0, 0, 1.25, 0.85, 1.62, { material: 'metal', blockSight: true });
}

export function pipeRun(f, { len = 4, r = 0.05, mat = 'paintedMetal', valves = 1 } = {}) {
  f.cyl(mat, r, len, 0, 0, 0, { rz: Math.PI / 2, seg: 8 });
  for (let i = 0; i < valves; i++) {
    const x = -len / 2 + (i + 0.6) * (len / (valves + 0.2));
    f.cyl('paintedMetalRed', 0.09, 0.03, x, -0.02, 0, { seg: 8 });
    f.cyl('paintedMetalRed', 0.02, 0.1, x, -0.1, 0, { seg: 5 });
  }
}

export function hvacUnit(f) {
  f.box('paintedMetal', 1.7, 1.3, 0.9, 0, 0.1, 0, { bevel: 0.02 });
  f.box('metalBlack', 1.7, 0.1, 0.9, 0, 0, 0);
  f.cyl('metalBlack', 0.3, 0.06, -0.4, 0.75, 0.43, { rx: Math.PI / 2, seg: 12 });
  f.cyl('metalBlack', 0.3, 0.06, 0.4, 0.75, 0.43, { rx: Math.PI / 2, seg: 12 });
  f.box('paintedMetal', 0.5, 0.5, 0.5, 0.4, 1.4, -0.1);
  f.collide(0, 0, 1.75, 0.95, 1.5, { material: 'metal', blockSight: true });
}

export function ductRun(f, { len = 4, w = 0.5, h = 0.3 } = {}) {
  f.box('paintedMetal', len, h, w, 0, 0, 0);
}

export function fireExtinguisher(f, { at = [0, 0.75, 0], cabinet = false, ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  if (cabinet) {
    f.box('paintedMetalRed', 0.36, 0.7, 0.18, lx, ly - 0.3, lz - 0.04, { ry, bevel: 0.012 });
    f.box('glassFrosted', 0.26, 0.5, 0.01, lx, ly - 0.2, lz + 0.052, { ry });
  } else {
    f.cyl('paintedMetalRed', 0.065, 0.42, lx, ly - 0.21, lz, { seg: 9 });
    f.cyl('metalBlack', 0.02, 0.1, lx, ly + 0.21, lz, { seg: 6 });
    f.box('metalBlack', 0.1, 0.05, 0.03, lx, ly + 0.24, lz + 0.02, { ry });
  }
}

export function emergencyLight(f, { at = [0, 2.4, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('softPlastic', 0.3, 0.12, 0.1, lx, ly, lz, { ry });
  for (const s of [-1, 1]) f.box('lampWarm', 0.07, 0.06, 0.06, lx + s * 0.12, ly - 0.05, lz + 0.02, { ry });
}

export function janitorCart(f) {
  f.box('softPlastic', 0.9, 0.08, 0.5, 0, 0.12, 0);
  f.box('softPlastic', 0.85, 0.5, 0.45, 0, 0.2, 0);
  f.box('fabric', 0.3, 0.4, 0.42, -0.28, 0.72, 0, { bevel: 0.03 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.sphere('hardPlastic', 0.05, sx * 0.36, 0, sz * 0.18, { seg: 6 });
  f.cyl('aluminum', 0.012, 1.1, 0.42, 0.1, -0.2, { rz: 0.12, seg: 5 }); // broom shaft
  f.box('softPlastic', 0.2, 0.06, 0.05, 0.44, 1.16, -0.22);
  f.collide(0, 0, 0.95, 0.55, 0.85, { material: 'metal', blockSight: false });
}

export function mopBucket(f, { at = [0, 0, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.box('drywallBlue', 0.32, 0.3, 0.42, lx, ly, lz, { bevel: 0.02 });
  f.cyl('aluminum', 0.012, 1.25, lx + 0.08, ly, lz + 0.1, { rz: -0.18, seg: 5 });
  f.cyl('paper', 0.05, 0.16, lx + 0.28, ly + 1.16, lz + 0.1, { seg: 6, rTop: 0.02 });
}

export function cardboardBox(f, { w = 0.45, h = 0.32, d = 0.38, open = false, label = true } = {}) {
  const art = getArt();
  f.box('cardboard', w, h, d, 0, 0, 0);
  if (open) {
    f.box('cardboard', w * 0.46, 0.012, d, -w * 0.35, h, 0, { rz: 0.5 });
    f.box('cardboard', w * 0.46, 0.012, d, w * 0.35, h, 0, { rz: -0.5 });
  } else {
    f.box('paper', w * 0.2, 0.004, d, 0, h, 0);
  }
  if (label) f.quad(art.signMat, Math.min(0.3, w * 0.7), Math.min(0.2, h * 0.7), 0, h * 0.15, d / 2 + 0.002, { uv: art.uv.shipLabel });
}

export function crate(f, { w = 1.1, h = 0.85, d = 0.9 } = {}) {
  const art = getArt();
  f.box('wood', w, h, d, 0, 0, 0);
  for (const s of [-1, 1]) {
    f.box('woodDark', 0.07, h, 0.02, s * (w / 2 - 0.06), 0, d / 2 + 0.005);
    f.box('woodDark', 0.07, h, 0.02, s * (w / 2 - 0.06), 0, -d / 2 - 0.005);
    f.box('woodDark', 0.02, h, 0.07, s * (w / 2 + 0.005), 0, 0);
  }
  f.box('woodDark', w + 0.015, 0.06, d + 0.015, 0, h - 0.05, 0);
  f.box('woodDark', w + 0.015, 0.06, d + 0.015, 0, 0, 0);
  f.quad(art.signMat, 0.4, 0.28, w * 0.14, h * 0.3, d / 2 + 0.012, { uv: art.uv.shipLabel });
  f.collide(0, 0, w, d, h, { material: 'wood', blockSight: h > 1.2 });
}

export function pallet(f, { w = 1.2, d = 1.0 } = {}) {
  for (let i = 0; i < 5; i++) f.box('wood', w, 0.022, 0.13, 0, 0.12, -d / 2 + 0.08 + i * ((d - 0.16) / 4));
  for (const x of [-w / 2 + 0.06, 0, w / 2 - 0.06]) f.box('woodDark', 0.09, 0.1, d, x, 0.02, 0);
}

export function handTruck(f) {
  // rails lean back (top toward +Z); wheels sit under the rail feet, toe plate forward
  for (const s of [-1, 1]) {
    f.cyl('paintedMetalRed', 0.014, 1.25, s * 0.17, 0.06, -0.075, { rx: 0.25, seg: 5 });
    f.cyl('rubber', 0.11, 0.05, s * 0.19, 0, -0.22, { rz: Math.PI / 2, seg: 10 });
  }
  f.box('paintedMetalRed', 0.37, 0.025, 0.02, 0, 0.45, -0.14);
  f.box('paintedMetalRed', 0.37, 0.025, 0.02, 0, 0.9, -0.03);
  f.box('paintedMetalRed', 0.4, 0.025, 0.03, 0, 1.28, 0.07); // handle
  f.box('brushedMetal', 0.45, 0.02, 0.3, 0, 0.02, 0.02, { rx: -0.08 }); // toe plate
  f.collide(0, -0.05, 0.5, 0.55, 1.2, { material: 'metal', blockSight: false });
}

export function ladder(f, { h = 1.9, lean = 0.22 } = {}) {
  for (const s of [-1, 1]) f.box('aluminum', 0.035, h, 0.08, s * 0.22, 0, 0, { rx: lean });
  for (let i = 0; i < 5; i++) f.box('aluminum', 0.42, 0.03, 0.06, 0, 0.2 + i * (h - 0.45) / 4, (0.2 + i * (h - 0.45) / 4) * Math.tan(lean) * -1);
  f.collide(0, 0, 0.5, 0.5, h, { material: 'metal', blockSight: false });
}

export function toolCase(f, { at = [0, 0, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('paintedMetalRed', 0.5, 0.22, 0.25, lx, ly, lz, { ry, bevel: 0.012 });
  f.box('metalBlack', 0.16, 0.03, 0.04, lx, ly + 0.22, lz, { ry });
}

export function warningCone(f, { at = [0, 0, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.box('paintedMetalRed', 0.3, 0.02, 0.3, lx, ly, lz);
  f.cyl('paintedMetalRed', 0.09, 0.45, lx, ly, lz, { seg: 8, rTop: 0.025 });
  f.cyl('plasticWhite', 0.075, 0.08, lx, ly + 0.18, lz, { seg: 8, rTop: 0.06 });
}

export function floorMat(f, { w = 1.8, d = 1.1 } = {}) {
  f.box('rubber', w, 0.015, d, 0, 0, 0);
}

export function dockBumper(f, { at = [0, 0.3, 0] } = {}) {
  f.box('rubber', 0.5, 0.35, 0.12, at[0], at[1], at[2]);
}

// Response van (HERO, extraction vehicle) — original fictional livery.
export function responseVan(f) {
  const art = getArt();
  const W = 2.0, L = 5.1, H = 2.15;
  const bodyY = 0.42;
  // wheels first (behind body skirt)
  for (const [lx, lz] of [[-0.85, 1.6], [0.85, 1.6], [-0.85, -1.5], [0.85, -1.5]]) {
    f.cyl('rubber', 0.36, 0.26, lx, 0.0, lz, { rz: Math.PI / 2, seg: 14 });
    f.cyl('brushedMetal', 0.17, 0.27, lx, 0.19, lz, { rz: Math.PI / 2, seg: 10 });
  }
  // main body box
  f.box('plasticWhite', W, 1.62, L - 1.15, 0, bodyY, -0.58, { bevel: 0.07 });
  // cab: hood + windshield mass
  f.box('plasticWhite', W - 0.06, 0.72, 1.25, 0, bodyY, 1.95, { bevel: 0.06 });
  f.box('plasticWhite', W - 0.1, 0.82, 0.95, 0, bodyY + 0.72, 1.55, { bevel: 0.05, rx: 0.0 });
  f.box('glassTinted', W - 0.24, 0.62, 0.06, 0, bodyY + 0.86, 2.06, { rx: 0.42 });
  for (const s of [-1, 1]) f.box('glassTinted', 0.06, 0.5, 0.7, s * (W / 2 - 0.06), bodyY + 0.86, 1.5);
  // livery quads on both flanks + rear doors
  for (const s of [-1, 1]) {
    f.quad(art.signMat, L - 1.2, 1.5, s * (W / 2 + 0.003), bodyY + 0.06, -0.58, { ry: s > 0 ? Math.PI / 2 : -Math.PI / 2, uv: art.uv.vanSide });
  }
  f.quad(art.signMat, W - 0.2, 1.5, 0, bodyY + 0.06, -3.132, { ry: Math.PI, uv: art.uv.vanBack });
  // bumpers, grille, lights
  f.box('metalBlack', W, 0.22, 0.3, 0, 0.28, 2.5);
  f.box('metalBlack', W, 0.26, 0.18, 0, 0.3, -3.05);
  f.box('metalBlack', W - 0.5, 0.3, 0.08, 0, bodyY + 0.28, 2.56);
  for (const s of [-1, 1]) {
    f.box('lampWarm', 0.3, 0.12, 0.06, s * (W / 2 - 0.3), bodyY + 0.62, 2.56);
    f.box('ledRed', 0.09, 0.3, 0.05, s * (W / 2 - 0.14), bodyY + 0.7, -3.1);
  }
  // roof: light bar (amber, extraction marker) + vents
  f.box('metalBlack', 1.1, 0.08, 0.3, 0, bodyY + 1.62, 0.9);
  f.box('ledAmber', 0.9, 0.09, 0.22, 0, bodyY + 1.7, 0.9);
  f.box('plasticWhite', 0.5, 0.09, 0.7, 0, bodyY + 1.62, -1.6, { bevel: 0.02 });
  // side mirrors + step
  for (const s of [-1, 1]) {
    f.box('metalBlack', 0.05, 0.02, 0.25, s * (W / 2 + 0.1), bodyY + 1.15, 1.9);
    f.box('metalBlack', 0.14, 0.2, 0.03, s * (W / 2 + 0.16), bodyY + 1.0, 1.82);
  }
  f.box('brushedMetal', 0.5, 0.06, 0.4, 0.9, 0.18, -3.0);
  f.collide(0, -0.6, W + 0.15, L + 0.2, 2.2, { material: 'metal', blockSight: true });
}

// ---------------------------------------------------------------------------
// DESK / SHELF CLUTTER
// ---------------------------------------------------------------------------
export function paperStack(f, { at = [0, 0.74, 0], n = 3, ry = 0.2 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  for (let i = 0; i < n; i++) {
    f.box('paper', 0.21, 0.012, 0.297, lx, ly + i * 0.012, lz, { ry: ry + i * 0.24 - 0.2 });
  }
  f.quad(art.signMat, 0.19, 0.27, lx, ly + n * 0.012 + 0.001, lz, { ry: ry + (n - 1) * 0.24 - 0.2, uv: art.uv.page, horizontal: true });
}

export function folderStack(f, { at = [0, 0.74, 0], n = 4 } = {}) {
  const [lx, ly, lz] = at;
  const mats = ['plasticBeige', 'drywallBlue', 'plasticWhite', 'upholsteryWarm'];
  for (let i = 0; i < n; i++) f.box(mats[i % 4], 0.24, 0.008, 0.32, lx, ly + i * 0.009, lz, { ry: (i % 3 - 1) * 0.12 });
}

export function binderRow(f, { at = [0, 0.74, 0], n = 4, ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  const mats = ['metalBlack', 'drywallBlue', 'paintedMetalRed', 'softPlastic'];
  for (let i = 0; i < n; i++) f.box(mats[(i + 1) % 4], 0.055, 0.29, 0.26, lx + i * 0.062, ly, lz, { ry });
}

export function stapler(f, { at = [0, 0.74, 0], ry = 0.4 } = {}) {
  const [lx, ly, lz] = at;
  f.box('metalBlack', 0.045, 0.035, 0.16, lx, ly, lz, { ry, bevel: 0.01 });
}

export function tapeDispenser(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('hardPlastic', 0.05, 0.07, 0.13, lx, ly, lz, { ry, bevel: 0.012 });
  f.cyl('softPlastic', 0.035, 0.02, lx, ly + 0.045, lz + 0.01, { rz: Math.PI / 2, ry, seg: 8 });
}

export function stickyNotes(f, { at = [0, 0.74, 0] } = {}) {
  const [lx, ly, lz] = at;
  f.box('ledAmber', 0.076, 0.008, 0.076, lx, ly, lz, { ry: 0.15 });
}

export function deskOrganizer(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('metalBlack', 0.16, 0.1, 0.1, lx, ly, lz, { ry });
  f.cyl('hardPlastic', 0.005, 0.14, lx + 0.03, ly + 0.06, lz, { seg: 4, rz: 0.1 });
  f.cyl('paintedMetalRed', 0.005, 0.13, lx - 0.02, ly + 0.06, lz + 0.02, { seg: 4, rz: -0.14 });
}

// WP-012b flora: species are crossed alpha-card quads from the flora atlas (getFlora), so a
// whole zone's greenery is one cutout draw. `jitter` de-synchronizes card yaw between plants.
function cards(f, uvRect, n, w, h, lx, ly, lz, jitter = 0) {
  const fl = getFlora();
  for (let i = 0; i < n; i++) {
    f.quad(fl.mat, w, h, lx, ly, lz, { ry: jitter + (i * Math.PI) / n, uv: uvRect });
  }
}
const posHash = (f) => Math.abs((f.x * 13.71 + f.z * 7.31) * 97.7) | 0;

export function deskPlant(f, { at = [0, 0.74, 0], species = null } = {}) {
  const [lx, ly, lz] = at;
  const fl = getFlora();
  const sp = species ?? posHash(f) % 2;
  f.cyl('plasticBeige', 0.05, 0.08, lx, ly, lz, { seg: 8, rTop: 0.042 });
  cards(f, sp ? fl.uv.fern : fl.uv.snake, 2, sp ? 0.24 : 0.16, sp ? 0.16 : 0.24, lx, ly + 0.07, lz, posHash(f) * 0.7);
}

// Ficus-style floor plant: pot + trunk + layered canopy cards.
export function floorPlant(f, { h = 1.4 } = {}) {
  const fl = getFlora();
  f.cyl('plasticBeige', 0.16, 0.3, 0, 0, 0, { seg: 10, rTop: 0.14 });
  f.cyl('soil', 0.125, 0.02, 0, 0.29, 0, { seg: 9 });
  f.cyl('wood', 0.02, h * 0.42, 0, 0.3, 0, { seg: 5 });
  const j = posHash(f) * 0.9;
  cards(f, fl.uv.ficus, 3, 0.78, h * 0.72, 0, h * 0.3, 0, j);
  cards(f, fl.uv.ficus, 2, 0.55, h * 0.5, 0.05, h * 0.52, 0.03, j + 0.9);
  f.collide(0, 0, 0.36, 0.36, h, { material: 'wood', blockSight: false });
}

// Snake plant (upright blades) — reads at 2 m as a distinct species.
export function snakePlant(f, { at = [0, 0, 0], s = 1 } = {}) {
  const fl = getFlora();
  const [lx, ly, lz] = at;
  f.cyl('plasticBeige', 0.11 * s, 0.22 * s, lx, ly, lz, { seg: 9, rTop: 0.095 * s });
  f.cyl('soil', 0.085 * s, 0.015, lx, ly + 0.21 * s, lz, { seg: 8 });
  cards(f, fl.uv.snake, 3, 0.42 * s, 0.62 * s, lx, ly + 0.2 * s, lz, posHash(f) * 0.8);
  if (s >= 1) f.collide(lx, lz, 0.26, 0.26, 0.85, { material: 'wood', blockSight: false, blockMove: false });
}

// Boston-fern style: arching fronds, for counters/shelves and planter fills.
export function fernPlant(f, { at = [0, 0, 0], s = 1 } = {}) {
  const fl = getFlora();
  const [lx, ly, lz] = at;
  f.cyl('plasticBeige', 0.09 * s, 0.16 * s, lx, ly, lz, { seg: 8, rTop: 0.08 * s });
  cards(f, fl.uv.fern, 3, 0.56 * s, 0.5 * s, lx, ly + 0.12 * s, lz, posHash(f) * 1.1);
}

export function planterPlants(f, { w = 1.15 } = {}) {
  // fills Fable 2's architectural planter boxes (soil at +0.44): alternating species row
  const fl = getFlora();
  const j = posHash(f);
  cards(f, fl.uv.snake, 2, 0.4, 0.58, -w / 2 + 0.22, 0.44, 0, j * 0.6);
  cards(f, fl.uv.fern, 2, 0.5, 0.42, 0.02, 0.44, 0.02, j * 0.6 + 0.7);
  cards(f, fl.uv.snake, 2, 0.36, 0.5, w / 2 - 0.2, 0.44, -0.02, j * 0.6 + 1.3);
  cards(f, fl.uv.fern, 2, 0.42, 0.36, w / 2 - 0.38, 0.45, 0.04, j * 0.6 + 2.1);
}

export function deskLamp(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.cyl('metalBlack', 0.07, 0.02, lx, ly, lz, { seg: 8 });
  f.cyl('metalBlack', 0.012, 0.3, lx + 0.03, ly, lz, { rz: -0.35, seg: 5 });
  f.cyl('metalBlack', 0.012, 0.24, lx + 0.2, ly + 0.27, lz, { rz: 1.9, seg: 5 });
  f.box('lampWarm', 0.16, 0.05, 0.09, lx + 0.3, ly + 0.3, lz, { ry, rz: 0.3 });
}

export function headsetStand(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.cyl('metalBlack', 0.05, 0.015, lx, ly, lz, { seg: 8 });
  f.cyl('metalBlack', 0.01, 0.24, lx, ly, lz, { seg: 5 });
  f.box('electronics', 0.16, 0.035, 0.04, lx, ly + 0.25, lz, { ry, bevel: 0.012 });
  for (const s of [-1, 1]) f.box('softPlastic', 0.05, 0.09, 0.05, lx + s * 0.07, ly + 0.15, lz, { ry, bevel: 0.02 });
}

// Knocked-over stack chair (struggle storytelling): lying on its back, hand-composed.
export function tippedChair(f) {
  f.box('hardPlastic', 0.44, 0.04, 0.42, 0, 0.2, -0.1, { rx: -Math.PI / 2 + 0.12, bevel: 0.012 });
  f.box('hardPlastic', 0.44, 0.36, 0.04, 0, 0.02, 0.16, { rx: -Math.PI / 2 + 0.12, bevel: 0.012 });
  for (const sx of [-1, 1]) for (const [zo, tilt] of [[-0.35, -0.25], [-0.03, 0.2]]) {
    f.cyl('brushedMetal', 0.014, 0.44, sx * 0.19, 0.22, zo, { rx: Math.PI / 2 + tilt, seg: 6 });
  }
  f.collide(0, 0, 0.5, 0.9, 0.4, { material: 'metal', blockSight: false, blockMove: false });
}

// Coat rack with hooks + one hung coat.
export function coatRack(f) {
  f.cyl('metalBlack', 0.18, 0.02, 0, 0, 0, { seg: 10 });
  f.cyl('metalBlack', 0.022, 1.7, 0, 0, 0, { seg: 7 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    f.box('metalBlack', 0.02, 0.02, 0.16, Math.sin(a) * 0.09, 1.6 - (i % 2) * 0.12, Math.cos(a) * 0.09, { ry: a });
  }
  // one hung coat
  f.box('upholsteryWarm', 0.42, 0.85, 0.14, 0.12, 0.72, 0.06, { bevel: 0.05 });
  f.collide(0, 0, 0.4, 0.4, 1.75, { material: 'metal', blockSight: false });
}

export function backpack(f, { at = [0, 0, 0], ry = 0, mat = 'upholstery' } = {}) {
  const [lx, ly, lz] = at;
  f.box(mat, 0.32, 0.44, 0.18, lx, ly, lz, { ry, bevel: 0.05, rx: 0.12 });
  f.box('metalBlack', 0.26, 0.16, 0.08, lx, ly + 0.06, lz + 0.1, { ry, bevel: 0.03 });
}

export function briefcase(f, { at = [0, 0, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  f.box('leather', 0.42, 0.32, 0.12, lx, ly, lz, { ry, bevel: 0.02 });
  f.box('metalBlack', 0.14, 0.03, 0.02, lx, ly + 0.32, lz, { ry });
}

export function umbrellaStand(f) {
  f.cyl('brushedMetal', 0.09, 0.5, 0, 0, 0, { seg: 9, open: true });
  f.cyl('upholstery', 0.025, 0.75, 0.02, 0.2, 0, { seg: 6, rTop: 0.012, rz: 0.08 });
  f.cyl('metalBlack', 0.008, 0.14, 0.055, 0.92, 0.005, { seg: 4, rz: 0.08 });
}

export function wallSign(f, { uvRect, w = 0.5, h = 0.11 } = {}) {
  const art = getArt();
  f.quad(art.signMat, w, h, 0, 0, 0.012, { uv: uvRect });
  f.box('aluminum', w + 0.02, h + 0.02, 0.012, 0, -0.01, 0);
}

export function poster(f, { uvRect, w = 0.5, h = 0.7 } = {}) {
  const art = getArt();
  f.quad(art.signMat, w, h, 0, 0, 0.006, { uv: uvRect });
}

export function photoFrame(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  f.box('metalBlack', 0.15, 0.11, 0.008, lx, ly, lz, { ry, rx: -0.12 });
  f.quad(art.signMat, 0.13, 0.09, lx, ly + 0.008, lz + 0.005, { ry, rx: -0.12, uv: art.uv.photo });
}

export function brochureHolder(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  f.box('glassFrosted', 0.14, 0.16, 0.04, lx, ly, lz, { ry, rx: -0.14 });
  f.quad(art.signMat, 0.11, 0.15, lx, ly + 0.005, lz + 0.008, { ry, rx: -0.14, uv: art.uv.brochure });
}

// ---------------------------------------------------------------------------
// WP-012b: occupied-room & hostage-site set dressing
// ---------------------------------------------------------------------------
// Static desk fan: base, pole, guard ring, three blades behind it.
export function deskFan(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  const g = f.sub(lx, lz, ry, ly);
  g.cyl('metalBlack', 0.075, 0.02, 0, 0, 0, { seg: 9 });
  g.cyl('metalBlack', 0.012, 0.14, 0, 0.02, 0, { seg: 5 });
  g.cyl('aluminum', 0.115, 0.035, 0, 0.13, 0, { seg: 12, open: true, rx: Math.PI / 2 }); // guard ring
  g.sphere('metalBlack', 0.025, 0, 0.145, 0, { seg: 6 }); // hub
  for (let i = 0; i < 3; i++) {
    g.box('softPlastic', 0.028, 0.085, 0.006, 0, 0.128, -0.008, { rz: (i * Math.PI * 2) / 3 + 0.4 });
  }
}

// Jacket draped over a chair back. Place the frame at the chair position with the chair's yaw.
// top/back locate the backrest crest: task chair ~0.94/-0.22, stack chair ~0.64/-0.2.
export function jacketOnChair(f, { mat = 'upholsteryWarm', top = 0.94, back = -0.22 } = {}) {
  // narrower than the 0.44 chair back so the chair's own upholstery shows at the edges —
  // otherwise the drape reads as a differently-coloured chair, not a left-behind jacket
  f.box(mat, 0.42, 0.09, 0.15, 0, top, back, { bevel: 0.03 }); // shoulder roll
  f.box(mat, 0.12, 0.34, 0.035, -0.13, top - 0.34, back + 0.055, { bevel: 0.015, rx: 0.08 }); // front flap L
  f.box(mat, 0.12, 0.24, 0.035, 0.14, top - 0.24, back + 0.055, { bevel: 0.015, rx: 0.12 }); // front flap R (shorter)
  f.box(mat, 0.09, 0.26, 0.03, -0.17, top - 0.28, back - 0.06, { bevel: 0.012, rz: -0.16 }); // hanging sleeve
  f.box(mat, 0.34, 0.26, 0.035, 0, top - 0.27, back - 0.07, { bevel: 0.015 }); // back panel
}

// Half-eaten snack: plate, half sandwich (bitten corner), crumbs.
export function snackPlate(f, { at = [0, 0.74, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  const g = f.sub(lx, lz, ry, ly);
  g.cyl('plasticWhite', 0.085, 0.012, 0, 0, 0, { seg: 10 });
  g.box('cardboard', 0.085, 0.03, 0.075, -0.015, 0.012, 0, { ry: 0.4, bevel: 0.008 });
  g.box('cardboard', 0.04, 0.028, 0.05, 0.035, 0.012, 0.02, { ry: 0.9, bevel: 0.008 }); // bitten-off corner askew
  for (const [cx, cz] of [[0.06, -0.04], [0.05, 0.055], [-0.06, 0.05]]) {
    g.box('cardboard', 0.008, 0.004, 0.008, cx, 0.012, cz);
  }
}

// Round guard stool (for hostage-watch posts).
export function stool(f, { at = [0, 0, 0], ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  const g = f.sub(lx, lz, ry, ly);
  g.cyl('upholstery', 0.17, 0.06, 0, 0.5, 0, { seg: 12 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    g.cyl('metalBlack', 0.013, 0.52, Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1, { seg: 6, rx: Math.cos(a) * 0.18, rz: Math.sin(a) * 0.18 });
  }
  g.cyl('metalBlack', 0.11, 0.014, 0, 0.18, 0, { seg: 10, open: true }); // foot ring
  f.collide(lx, lz, 0.36, 0.36, 0.56, { material: 'metal', blockSight: false });
}

// Open magazine lying flat (original "COLD ROUTE" cover).
export function magazine(f, { at = [0, 0.56, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, ly, lz] = at;
  f.box('paper', 0.17, 0.006, 0.23, lx, ly, lz, { ry });
  f.quad(art.signMat, 0.16, 0.22, lx, ly + 0.007, lz, { ry, horizontal: true, uv: art.uv.magazine });
}

// Closed venetian blinds panel: mounted inside a window opening (hostage-site "blocked window").
export function blindsClosed(f, { at = [0, 1.0, 0], w = 1.6, h = 1.6, ry = 0 } = {}) {
  const [lx, ly, lz] = at;
  const g = f.sub(lx, lz, ry, ly);
  g.box('plasticBeige', w, 0.06, 0.05, 0, h - 0.06, 0); // headrail
  const slats = 9;
  for (let i = 0; i < slats; i++) {
    g.box('plasticBeige', w - 0.04, (h - 0.1) / slats + 0.015, 0.012, 0, (i * (h - 0.1)) / slats, 0, { rx: 0.28 });
  }
  g.box('plasticBeige', w - 0.04, 0.035, 0.02, 0, -0.02, 0.012); // bottom bar, slightly askew
}

// Zip-tie remnants: snipped white loops scattered on the floor.
export function zipTies(f, { at = [0, 0, 0], n = 3 } = {}) {
  const [lx, , lz] = at;
  for (let i = 0; i < n; i++) {
    const a = i * 2.1 + posHash(f) * 0.37;
    const cx = lx + Math.sin(a) * (0.08 + i * 0.09);
    const cz = lz + Math.cos(a) * (0.1 + i * 0.07);
    f.box('plasticWhite', 0.11, 0.004, 0.008, cx, 0.002, cz, { ry: a * 1.7 });
    f.box('plasticWhite', 0.05, 0.004, 0.008, cx + 0.03, 0.002, cz + 0.02, { ry: a * 1.7 + 1.1 });
  }
}

// Melting snow clump (tracked-in, entrance transition).
export function snowClump(f, { at = [0, 0, 0], s = 1 } = {}) {
  const [lx, , lz] = at;
  f.cyl('snow', 0.05 * s, 0.018 * s, lx, 0, lz, { seg: 7, rTop: 0.028 * s });
  f.cyl('snow', 0.028 * s, 0.014 * s, lx + 0.05 * s, 0, lz + 0.03 * s, { seg: 6, rTop: 0.014 * s });
}

// "CAUTION WET FLOOR" A-frame (original design; face art from the signs atlas).
export function wetFloorSign(f, { at = [0, 0, 0], ry = 0 } = {}) {
  const art = getArt();
  const [lx, , lz] = at;
  const g = f.sub(lx, lz, ry, 0);
  const H = 0.62, tilt = 0.24;
  for (const s of [-1, 1]) {
    g.quad(art.signMat, 0.42, H, 0, 0, s * (Math.sin(tilt) * H) / 2, {
      rx: -s * tilt, ry: s < 0 ? Math.PI : 0, uv: art.uv.wetFloor,
    });
  }
  g.box('paintedMetal', 0.42, 0.02, 0.03, 0, H - 0.02, 0); // hinge cap
}

// ---------------------------------------------------------------------------
// Registration (IDs + gallery builders where meaningful)
// ---------------------------------------------------------------------------
export function registerLibrary() {
  const reg = (id, name, category, buildFn, opts) => registerAsset(id, {
    name, category, agent: 'Fable 3', build: buildFn ? galleryBuild(buildFn, opts) : undefined,
  });
  reg('PROP-DESK-STD', 'Standard workdesk', 'office', desk);
  reg('PROP-DESK-EXEC', 'Executive desk', 'office', deskExec);
  reg('PROP-RECEPTION', 'Reception desk (hero)', 'office', receptionDesk);
  reg('PROP-CHAIR-TASK', 'Task chair (casters)', 'office', taskChair);
  reg('PROP-CHAIR-STACK', 'Stacking chair', 'office', stackChair);
  reg('PROP-SOFA', 'Waiting sofa', 'office', sofa);
  reg('PROP-TABLE-COFFEE', 'Coffee table', 'office', coffeeTable);
  reg('PROP-TABLE-CONF', 'Conference table', 'office', confTable);
  reg('PROP-CUBICLE-BAY', 'Cubicle workstation bay', 'office', cubicleBay);
  reg('PROP-CUBICLE-PANEL', 'Cubicle fabric panel', 'office', cubiclePanel);
  reg('PROP-CAB-FILING', 'Filing cabinet', 'office', filingCabinet);
  reg('PROP-PEDESTAL', 'Drawer pedestal', 'office', (f) => pedestal(f, {}));
  reg('PROP-SHELF-UNIT', 'Utility shelving', 'office', shelfUnit);
  reg('PROP-BOOKCASE', 'Bookcase', 'office', bookcase);
  reg('PROP-ARCHIVE-RACK', 'Rolling archive rack', 'office', archiveRack);
  reg('PROP-MONITOR', 'Monitor (emissive UI)', 'electronics', (f) => monitor(f, { at: [0, 0.1, 0] }));
  reg('PROP-KEYBOARD', 'Keyboard + mouse', 'electronics', (f) => keyboard(f, { at: [0, 0.1, 0] }));
  reg('PROP-TOWER', 'Workstation tower', 'electronics', (f) => towerPC(f, {}));
  reg('PROP-LAPTOP', 'Laptop', 'electronics', (f) => laptop(f, { at: [0, 0.1, 0] }));
  reg('PROP-PHONE', 'Desk phone', 'electronics', (f) => deskPhone(f, { at: [0, 0.1, 0] }));
  reg('PROP-PRINTER', 'Desktop printer', 'electronics', (f) => printerSmall(f, {}));
  reg('PROP-COPIER', 'Office copier (hero)', 'electronics', copier);
  reg('PROP-PROJECTOR', 'Ceiling projector', 'electronics', (f) => projector(f, { at: [0, 0.6, 0] }));
  reg('PROP-CONF-DISPLAY', 'Conference display (emissive)', 'electronics', (f) => confDisplay(f, {}));
  reg('PROP-WHITEBOARD', 'Whiteboard (original writing)', 'electronics', whiteboard);
  reg('PROP-CLOCK', 'Wall clock', 'electronics', wallClock);
  reg('PROP-SEC-WALL', 'Security monitor wall', 'electronics', secMonitorWall);
  reg('PROP-SERVER-RACK', 'Server rack (hero)', 'electronics', serverRack);
  reg('PROP-NET-CABINET', 'Network cabinet', 'electronics', networkCabinet);
  reg('PROP-UPS', 'UPS unit', 'electronics', (f) => upsUnit(f, {}));
  reg('PROP-CABLE-TRAY', 'Cable tray segment', 'electronics', (f) => cableTray(f, { len: 2 }));
  reg('PROP-KITCHEN-RUN', 'Kitchen cabinets + sink', 'break', (f) => kitchenRun(f, { len: 2.4 }));
  reg('PROP-FRIDGE', 'Refrigerator', 'break', fridge);
  reg('PROP-MICROWAVE', 'Microwave', 'break', (f) => microwave(f, { at: [0, 0.1, 0] }));
  reg('PROP-COFFEE', 'Coffee machine', 'break', (f) => coffeeMachine(f, { at: [0, 0.1, 0] }));
  reg('PROP-KETTLE', 'Kettle', 'break', (f) => kettle(f, { at: [0, 0.1, 0] }));
  reg('PROP-VENDING', 'Vending machine "Polar Bites" (hero)', 'break', vendingMachine);
  reg('PROP-WATERCOOLER', 'Water cooler', 'break', waterCooler);
  reg('PROP-TABLE-CAFE', 'Cafe table', 'break', cafeTable);
  reg('PROP-BIN', 'Waste bin', 'break', trashBin);
  reg('PROP-NOTICEBOARD', 'Notice board', 'break', noticeBoard);
  reg('PROP-VANITY', 'Restroom vanity + mirrors', 'restroom', vanity);
  reg('PROP-TOILET', 'Toilet', 'restroom', toilet);
  reg('PROP-STALLS', 'Stall partition run', 'restroom', stallRun);
  reg('PROP-HANDDRYER', 'Hand dryer', 'restroom', (f) => handDryer(f, { at: [0, 0.6, 0] }));
  reg('PROP-ELEC-PANEL', 'Electrical panel', 'maintenance', (f) => electricalPanel(f, { at: [0, 1.0, 0] }));
  reg('PROP-TRANSFORMER', 'Transformer cabinet', 'maintenance', transformerCabinet);
  reg('PROP-PIPE-RUN', 'Pipe run + valves', 'maintenance', (f) => pipeRun(f, { len: 2 }));
  reg('PROP-HVAC', 'HVAC unit', 'maintenance', hvacUnit);
  reg('PROP-DUCT', 'Duct run', 'maintenance', (f) => ductRun(f, { len: 2 }));
  reg('PROP-EXTINGUISHER', 'Fire extinguisher', 'maintenance', (f) => fireExtinguisher(f, {}));
  reg('PROP-EMERG-LIGHT', 'Emergency light pack', 'maintenance', (f) => emergencyLight(f, { at: [0, 0.6, 0] }));
  reg('PROP-JANITOR-CART', 'Janitor cart', 'maintenance', janitorCart);
  reg('PROP-MOP-BUCKET', 'Mop + bucket', 'maintenance', (f) => mopBucket(f, {}));
  reg('PROP-BOX', 'Cardboard box', 'maintenance', (f) => cardboardBox(f, {}));
  reg('PROP-CRATE', 'Shipping crate', 'maintenance', crate);
  reg('PROP-PALLET', 'Pallet', 'maintenance', pallet);
  reg('PROP-HANDTRUCK', 'Hand truck', 'maintenance', handTruck);
  reg('PROP-LADDER', 'Ladder', 'maintenance', ladder);
  reg('PROP-TOOLCASE', 'Tool case', 'maintenance', (f) => toolCase(f, {}));
  reg('PROP-CONE', 'Warning cone', 'maintenance', (f) => warningCone(f, {}));
  reg('PROP-FLOORMAT', 'Entry floor mat', 'maintenance', floorMat);
  reg('PROP-DOCK-BUMPER', 'Dock bumper', 'maintenance', (f) => dockBumper(f, {}));
  reg('PROP-VAN', 'Response van "NORTHSTAR RESPONSE" (hero)', 'maintenance', responseVan);
  reg('PROP-PAPER-STACK', 'Paper stack', 'clutter', (f) => paperStack(f, { at: [0, 0.1, 0] }));
  reg('PROP-FOLDERS', 'Folder stack', 'clutter', (f) => folderStack(f, { at: [0, 0.1, 0] }));
  reg('PROP-BINDERS', 'Binder row', 'clutter', (f) => binderRow(f, { at: [0, 0.1, 0] }));
  reg('PROP-STAPLER', 'Stapler', 'clutter', (f) => stapler(f, { at: [0, 0.1, 0] }));
  reg('PROP-TAPE', 'Tape dispenser', 'clutter', (f) => tapeDispenser(f, { at: [0, 0.1, 0] }));
  reg('PROP-STICKY', 'Sticky notes', 'clutter', (f) => stickyNotes(f, { at: [0, 0.1, 0] }));
  reg('PROP-ORGANIZER', 'Desk organizer + pens', 'clutter', (f) => deskOrganizer(f, { at: [0, 0.1, 0] }));
  reg('PROP-MUG', 'Mug', 'clutter', (f) => mug(f, { at: [0, 0.1, 0] }));
  reg('PROP-BOTTLE', 'Water bottle', 'clutter', (f) => bottle(f, { at: [0, 0.1, 0] }));
  reg('PROP-CAN', 'Soda can', 'clutter', (f) => sodaCan(f, { at: [0, 0.1, 0] }));
  reg('PROP-PLANT-DESK', 'Desk plant (fern/snake mini)', 'clutter', (f) => deskPlant(f, { at: [0, 0.1, 0] }));
  reg('PROP-PLANT-FLOOR', 'Ficus floor plant', 'clutter', floorPlant);
  reg('PROP-PLANT-SNAKE', 'Snake plant', 'clutter', snakePlant);
  reg('PROP-PLANT-FERN', 'Fern plant', 'clutter', fernPlant);
  reg('PROP-PLANTER-FILL', 'Planter greenery (mixed species)', 'clutter', planterPlants);
  reg('PROP-COATRACK', 'Coat rack + coat', 'clutter', coatRack);
  reg('PROP-BACKPACK', 'Backpack', 'clutter', (f) => backpack(f, {}));
  reg('PROP-BRIEFCASE', 'Briefcase', 'clutter', (f) => briefcase(f, {}));
  reg('PROP-UMBRELLA', 'Umbrella stand', 'clutter', umbrellaStand);
  reg('PROP-PHOTO', 'Photo frame', 'clutter', (f) => photoFrame(f, { at: [0, 0.1, 0] }));
  reg('PROP-BROCHURE', 'Brochure holder', 'clutter', (f) => brochureHolder(f, { at: [0, 0.1, 0] }));
  reg('PROP-CALENDAR', 'Wall calendar', 'signage', (f) => poster(f, { uvRect: getArt().uv.calendar, w: 0.3, h: 0.36 }));
  reg('SIGN-DEPT', 'Department sign set', 'signage', (f) => wallSign(f, { uvRect: getArt().uv.dept.reception }));
  reg('SIGN-ROOMPLATE', 'Room number plates', 'signage', (f) => wallSign(f, { uvRect: getArt().uv.roomPlate[0], w: 0.22, h: 0.1 }));
  reg('SIGN-DIRECTORY', 'Directional signs', 'signage', (f) => wallSign(f, { uvRect: getArt().uv.directional, w: 0.8, h: 0.35 }));
  reg('SIGN-SAFETY', 'Safety poster', 'signage', (f) => poster(f, { uvRect: getArt().uv.safety, w: 0.5, h: 0.7 }));
  reg('SIGN-EVAC', 'Evacuation diagram', 'signage', (f) => poster(f, { uvRect: getArt().uv.evac, w: 0.5, h: 0.7 }));
  reg('PROP-DESKLAMP', 'Desk lamp (warm)', 'clutter', (f) => deskLamp(f, { at: [0, 0.1, 0] }));
  reg('PROP-HEADSET', 'Headset stand', 'electronics', (f) => headsetStand(f, { at: [0, 0.1, 0] }));
  reg('PROP-CHAIR-TIPPED', 'Tipped chair (struggle set)', 'storytelling', tippedChair);
  reg('PROP-SEC-DOCS', 'Hostage-holding evidence set', 'storytelling');
  reg('PROP-STRUGGLE', 'Lobby struggle set (tipped chair, papers)', 'storytelling');
  // WP-012b additions
  reg('PROP-DESKFAN', 'Desk fan', 'clutter', (f) => deskFan(f, { at: [0, 0.1, 0] }));
  reg('PROP-JACKET', 'Jacket on chairback', 'storytelling', (f) => { taskChair(f); jacketOnChair(f); });
  reg('PROP-SNACK', 'Half-eaten snack plate', 'storytelling', (f) => snackPlate(f, { at: [0, 0.1, 0] }));
  reg('PROP-STOOL', 'Guard stool', 'storytelling', stool);
  reg('PROP-MAGAZINE', 'Magazine "Cold Route"', 'storytelling', (f) => magazine(f, { at: [0, 0.1, 0] }));
  reg('PROP-BLINDS', 'Closed blinds panel', 'storytelling', (f) => blindsClosed(f, { at: [0, 0.2, 0] }));
  reg('PROP-ZIPTIES', 'Zip-tie remnants', 'storytelling', (f) => zipTies(f, {}));
  reg('PROP-SNOWCLUMP', 'Tracked-in snow clump', 'storytelling', (f) => snowClump(f, {}));
  reg('SIGN-WETFLOOR', 'Caution wet-floor A-frame', 'signage', (f) => wetFloorSign(f, {}));
}
