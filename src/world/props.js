import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib, canvas, tex } from './textures.js';
import { makeRNG } from '../core/math.js';

/**
 * Prop builders. Each returns a THREE.Group positioned at origin; the map
 * places it and registers colliders. Shadows enabled on everything.
 */

const rng = makeRNG(4451);
// Dedicated stream for car roof accessories so the antenna/rack mix stays
// deterministic regardless of how many other rolls buildCar consumes.
// Seed 144 lands 5 of the map's 11 cars (~40%): whips on the far-east wreck
// + maroon hatch + sand hatch, racks on the 44m burned sedan + gunmetal pickup.
const accRng = makeRNG(144);

export function shadow(obj) {
  obj.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

const _contactTexCache = new Map();
/** Soft dark blob under vehicles/props — subtle contact AO. The mask is a
 *  heavily feathered stadium (rounded-rect core) evaluated per pixel in the
 *  plane's own aspect ratio, so long shadows (cars, sandbag walls) keep a
 *  smooth footprint-hugging falloff. The old shared radial gradient got
 *  stretched up to 3.6:1 by callers and its hard outer stop read as a
 *  faceted hex decal on bright asphalt. */
export function addContactShadow(group, w, d, opacity = 0.22, y = 0.024) {
  const aspectKey = Math.max(2, Math.min(64, Math.round((w / d) * 8)));
  let t = _contactTexCache.get(aspectKey);
  if (!t) {
    const S = 128;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const px = img.data;
    const aspect = aspectKey / 8;
    const hw = Math.max(aspect, 1), hd = Math.max(1 / aspect, 1);
    const soft = 0.62;                          // feather span, short-axis units
    const cx = Math.max(hw - soft, hw * 0.34);  // dark-core half extents
    const cz = Math.max(hd - soft, hd * 0.34);
    for (let j = 0; j < S; j++) {
      const pz = (((j + 0.5) / S) * 2 - 1) * hd;
      for (let i = 0; i < S; i++) {
        const pxx = (((i + 0.5) / S) * 2 - 1) * hw;
        const qx = Math.max(Math.abs(pxx) - cx, 0);
        const qz = Math.max(Math.abs(pz) - cz, 0);
        const dist = Math.min(Math.hypot(qx, qz) / soft, 1);
        const fall = 1 - dist * dist * (3 - 2 * dist); // smoothstep to zero
        px[(j * S + i) * 4 + 3] = Math.round(Math.pow(fall, 1.4) * 234);
      }
    }
    ctx.putImageData(img, 0, 0);
    t = tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    _contactTexCache.set(aspectKey, t);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 3;
  m.userData.noShadow = true;
  m.castShadow = false;
  group.add(m);
  return m;
}

/**
 * Per-variant car geometry facts shared by buildCar and every skin bake, so
 * baked panel features (shutlines, gaskets, arch shadows) land exactly on
 * the extruded geometry. All coordinates are side-profile world units.
 */
const CAR_SPECS = {
  sedan: {
    L: 4.15, ax: 1.328, archR: 0.46,
    seams: [-1.5, -0.85, 0.15, 1.05, 1.62],
    holes: [
      [[-0.66, 1.02], [0.05, 1.02], [0.05, 1.38], [-0.34, 1.38]],
      [[0.2, 1.02], [1.15, 1.02], [0.78, 1.38], [0.2, 1.38]],
    ],
    handles: [0.02, 0.92], fuel: 1.42, hoodY: 0.75, bootY: 0.86,
    topline: [[-2.075, 0.78], [-1.9, 0.86], [-0.95, 0.94], [-0.28, 1.52], [0.82, 1.48], [1.45, 0.98], [2.045, 0.92], [2.075, 0.62]],
    roof: [-0.28, 0.82],
  },
  hatch: {
    L: 3.62, ax: 1.2489, archR: 0.44,
    seams: [-1.28, -0.62, 0.55, 1.45],
    holes: [
      [[-0.5, 1.03], [0.12, 1.03], [0.12, 1.36], [-0.2, 1.36]],
      [[0.26, 1.03], [0.95, 1.03], [0.72, 1.36], [0.26, 1.36]],
    ],
    handles: [0.4], fuel: 1.28, hoodY: 0.77, bootY: 0.8,
    topline: [[-1.81, 0.8], [-1.5, 0.88], [-0.75, 0.95], [-0.15, 1.5], [1.51, 1.44], [1.81, 0.86]],
    roof: [-0.15, 0.55],
  },
  pickup: {
    L: 4.15, ax: 1.328, archR: 0.46,
    seams: [-1.55, -0.82, 0.55],
    holes: [
      [[-0.78, 1.04], [0.36, 1.04], [0.36, 1.28], [-0.5, 1.28]],
    ],
    handles: [0.38], fuel: null, hoodY: 0.77, bootY: 0.93,
    topline: [[-2.075, 0.8], [-1.95, 0.87], [-1.05, 0.94], [-0.45, 1.41], [0.52, 1.39], [0.55, 0.98], [2.075, 0.98]],
    roof: [-0.45, 0.52],
  },
};

/** Painter kit for profile-space skins: canvas + world→px mapping, a
 *  world-circular radial splat (canvas px/m differs on x vs y), world-space
 *  line/ring helpers and a finisher that bakes the uv transform so mesh
 *  UVs in raw profile units sample the canvas 1:1. */
function skinKit(CW, CH, x0, spanX, y0, spanY) {
  const c = canvas(CW, CH);
  const ctx = c.getContext('2d');
  const X = (wx) => ((wx - x0) / spanX) * CW;
  const Y = (wy) => (1 - (wy - y0) / spanY) * CH;
  const PXM = CW / spanX;
  const KY = (CH / spanY) / PXM;
  const splat = (wx, wy, wr, stops) => {
    ctx.save();
    ctx.translate(X(wx), Y(wy));
    ctx.scale(1, KY);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, wr * PXM);
    for (const [t, col] of stops) g.addColorStop(t, col);
    ctx.fillStyle = g;
    const R = wr * PXM;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
  };
  const line = (xa, ya, xb, yb, w, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(X(xa), Y(ya));
    ctx.lineTo(X(xb), Y(yb));
    ctx.stroke();
  };
  const ring = (wx, wy, wr, w, strokeStyle, fillStyle = null) => {
    ctx.save();
    ctx.translate(X(wx), Y(wy));
    ctx.scale(1, KY);
    ctx.beginPath();
    ctx.arc(0, 0, wr * PXM, 0, 7);
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = w; ctx.stroke(); }
    ctx.restore();
  };
  const finish = (opts) => {
    const t = tex(c, opts);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(1 / spanX, 1 / spanY);
    t.offset.set(-x0 / spanX, -y0 / spanY);
    return t;
  };
  return { c, ctx, X, Y, PXM, KY, splat, line, ring, finish };
}

/** Near-black wheel wells: the arch reveal faces sample UVs inside the arc,
 *  so a dark disc buries them; the short fade past the lip is the fender AO
 *  ring that grounds the tire. */
function paintArchWells(kit, spec) {
  for (const ax of [-spec.ax, spec.ax]) {
    const R = spec.archR;
    kit.splat(ax, 0.28, R + 0.06, [
      [0, 'rgba(8,8,7,0.97)'],
      [(R - 0.03) / (R + 0.06), 'rgba(8,8,7,0.95)'],
      [R / (R + 0.06), 'rgba(10,9,8,0.5)'],
      [1, 'rgba(12,10,9,0)'],
    ]);
  }
}

/** Dark rubber gaskets around the punched window openings (+ optional dirt
 *  drips off the lower corners). Hole reveal faces sample the outline path,
 *  so they read as recessed rubber too. */
function paintGaskets(kit, spec, r, dripStyle) {
  const { ctx, X, Y, PXM, KY } = kit;
  ctx.lineJoin = 'round';
  for (const hole of spec.holes) {
    ctx.beginPath();
    ctx.moveTo(X(hole[0][0]), Y(hole[0][1]));
    for (let i = 1; i < hole.length; i++) ctx.lineTo(X(hole[i][0]), Y(hole[i][1]));
    ctx.closePath();
    ctx.fillStyle = 'rgba(13,12,11,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(13,12,10,0.88)';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    for (const [dx, dy] of [hole[0], hole[1]]) {
      if (r.chance(0.72)) {
        ctx.fillStyle = dripStyle;
        ctx.fillRect(X(dx + r.spread(0.04)) - 1, Y(dy), 2, (0.08 + r() * 0.22) * PXM * KY);
      }
    }
  }
}

/** Streaked-corrosion painter for profile-space skins: every bloom is a hot
 *  oxide splat that can trail a tapered smear DOWN the panel (canvas +y =
 *  world -y), so edge rust reads as run-off staining instead of the round 7
 *  confetti dots. The smear is two stacked fading rects — a wide head under
 *  the bloom and a narrow tail — which mips into a believable drip. */
function makeRustPainter(kit, r) {
  const { ctx, X, Y, PXM, KY } = kit;
  return (wx, wy, wr, a, streak = 0) => {
    kit.splat(wx, wy, wr, [
      [0, `rgba(${r.chance(0.4) ? '96,52,26' : '124,72,34'},${a})`],
      [0.7, `rgba(88,48,26,${a * 0.5})`],
      [1, 'rgba(0,0,0,0)'],
    ]);
    if (streak > 0) {
      const hPx = streak * PXM * KY;
      const w0 = Math.max(2.2, wr * 1.25 * PXM);
      const gg = ctx.createLinearGradient(0, Y(wy), 0, Y(wy) + hPx);
      gg.addColorStop(0, `rgba(92,52,27,${Math.min(1, a * 0.45)})`);
      gg.addColorStop(0.5, `rgba(86,48,26,${Math.min(1, a * 0.26)})`);
      gg.addColorStop(1, 'rgba(80,46,25,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(X(wx) - w0 / 2 + r.spread(0.8), Y(wy), w0, hPx * 0.36);
      ctx.fillRect(X(wx) - w0 / 4 + r.spread(1.2), Y(wy), w0 / 2, hPx);
    }
  };
}

const _rustCarMats = new Map();
/**
 * Burned-wreck body material, replacing the old uniform tiling rust noise
 * that read as "noise shader applied to a box". Painted in the same
 * side-profile space as the clean skin so corrosion concentrates where rust
 * actually lives — arch lips, rockers, shutlines, gasket drips, blister
 * clusters — around scorched cabin/hood zones, with a still-readable
 * bleached body colour between. Round 8: blooms gained downward smears via
 * makeRustPainter, concentrated at panel bottoms / seams / behind the
 * arches, so corrosion reads streaked rather than dotted. Glass and trim
 * keep their own soot-dark materials, so the weathering never bleeds onto
 * panes or bumpers.
 */
function rustCarMat(variant) {
  if (_rustCarMats.has(variant)) return _rustCarMats.get(variant);
  const spec = CAR_SPECS[variant];
  const halfL = spec.L / 2;
  const kit = skinKit(1024, 384, -2.2, 4.4, -0.1, 1.8);
  const { ctx, X, Y, PXM, KY, splat, line, ring } = kit;
  const r = makeRNG(6021 + variant.length * 131);
  const topAt = (x) => {
    const pts = spec.topline;
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (x >= ax && x <= bx) return bx === ax ? ay : ay + (by - ay) * ((x - ax) / (bx - ax));
    }
    return pts[pts.length - 1][1];
  };
  const strokeTop = (x0, x1, w, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(topAt(x0)));
    for (let x = x0 + 0.05; x < x1; x += 0.05) ctx.lineTo(X(x), Y(topAt(x)));
    ctx.lineTo(X(x1), Y(topAt(x1)));
    ctx.stroke();
  };
  // Bleached body colour still reads between the damage zones
  ctx.fillStyle = '#8f887a';
  ctx.fillRect(0, 0, 1024, 384);
  for (let i = 0; i < 9; i++) {
    splat(-2 + r() * 4, 0.2 + r() * 1.3, 0.35 + r() * 0.5, [
      [0, `rgba(${r.chance(0.5) ? '126,118,104' : '160,152,136'},${0.25 + r() * 0.25})`],
      [1, 'rgba(0,0,0,0)'],
    ]);
  }
  const zones = [-2.2, ...spec.seams, 2.2];
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < zones.length - 1; i++) {
    const v = Math.round(132 + r.spread(20));
    ctx.fillStyle = `rgb(${v},${Math.round(v * 0.94)},${Math.round(v * 0.84)})`;
    ctx.fillRect(X(zones[i]), 0, X(zones[i + 1]) - X(zones[i]), 384);
  }
  ctx.globalAlpha = 1;
  // Scorch: engine bay + cabin cores, vertical heat tongues over the doors
  splat(-1.9, 0.82, 0.85, [[0, 'rgba(26,22,18,0.72)'], [0.6, 'rgba(30,25,20,0.35)'], [1, 'rgba(0,0,0,0)']]);
  splat(-1.35, 0.9, 0.6, [[0, 'rgba(28,23,19,0.5)'], [1, 'rgba(0,0,0,0)']]);
  splat(0.15, 1.28, 1.0, [[0, 'rgba(24,20,17,0.68)'], [0.65, 'rgba(26,22,18,0.3)'], [1, 'rgba(0,0,0,0)']]);
  splat(0.85, 1.2, 0.8, [[0, 'rgba(24,20,17,0.5)'], [1, 'rgba(0,0,0,0)']]);
  for (let i = 0; i < 7; i++) {
    const txx = -1.2 + r() * 2.6;
    ctx.save();
    ctx.translate(X(txx), Y(0.95));
    ctx.scale(1, 2 + r());
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, (0.16 + r() * 0.14) * PXM);
    gg.addColorStop(0, `rgba(22,19,16,${0.28 + r() * 0.3})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    const RR = 0.32 * PXM;
    ctx.fillRect(-RR, -RR, RR * 2, RR * 2);
    ctx.restore();
  }
  // Charred roof; blotchy scorch bites on hood/trunk (top faces sample the
  // outline row, so strokes along the profile curve print across them)
  strokeTop(spec.roof[0] - 0.06, spec.roof[1] + 0.06, 9, 'rgba(22,18,15,0.82)');
  strokeTop(spec.roof[0] - 0.06, spec.roof[1] + 0.06, 16, 'rgba(24,20,16,0.3)');
  for (let i = 0; i < 6; i++) {
    const seg = r.chance(0.6) ? [-halfL + 0.1, spec.roof[0] - 0.2] : [spec.roof[1] + 0.15, halfL - 0.1];
    const x0 = seg[0] + r() * Math.max(0.05, seg[1] - seg[0] - 0.3);
    strokeTop(x0, x0 + 0.14 + r() * 0.3, 7, `rgba(30,25,20,${0.3 + r() * 0.35})`);
  }
  // Streaked-corrosion painter (bloom + downward smear)
  const rust = makeRustPainter(kit, r);
  // Rocker: heavy ragged rust band
  const rocker = ctx.createLinearGradient(0, Y(0.5), 0, Y(0.28));
  rocker.addColorStop(0, 'rgba(86,48,26,0)');
  rocker.addColorStop(0.55, 'rgba(90,50,26,0.4)');
  rocker.addColorStop(1, 'rgba(70,40,22,0.75)');
  ctx.fillStyle = rocker;
  ctx.fillRect(0, Y(0.5), 1024, Y(0.28) - Y(0.5));
  for (let i = 0; i < 30; i++) {
    rust(-2.1 + r() * 4.2, 0.31 + Math.pow(r(), 1.7) * 0.22, 0.025 + r() * 0.055,
      0.3 + r() * 0.4, r.chance(0.7) ? 0.04 + r() * 0.12 : 0);
  }
  // Blooms seeded along the door-bottom line, bleeding down into the rocker
  for (let i = 0; i < 10; i++) {
    rust(-1.9 + r() * 3.7, 0.5 + r() * 0.14, 0.02 + r() * 0.035,
      0.32 + r() * 0.35, 0.12 + r() * 0.24);
  }
  // Arch wells + corroded lips; fender blooms fore/aft of each arch smear
  // down toward the rocker (the classic behind-the-wheel corrosion spray)
  paintArchWells(kit, spec);
  for (const ax of [-spec.ax, spec.ax]) {
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI;
      rust(ax + Math.cos(a) * (spec.archR + 0.015), 0.28 + Math.sin(a) * (spec.archR + 0.015),
        0.02 + r() * 0.045, 0.35 + r() * 0.4, 0);
    }
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        rust(ax + sgn * (spec.archR + 0.05 + r() * 0.1), 0.38 + r() * 0.2,
          0.02 + r() * 0.03, 0.32 + r() * 0.34, 0.08 + r() * 0.18);
      }
    }
  }
  // Shutlines with rust weeping out of the seams and running down
  for (const sx of spec.seams) {
    line(sx, 1.36, sx + 0.022, 0.3, 7, 'rgba(70,42,24,0.3)');
    line(sx, 1.36, sx + 0.022, 0.3, 2.6, 'rgba(14,12,10,0.8)');
    for (let i = 0; i < 6; i++) {
      rust(sx + r.spread(0.035), 0.38 + Math.pow(r(), 1.4) * 0.9, 0.016 + r() * 0.04,
        0.3 + r() * 0.42, r.chance(0.65) ? 0.08 + r() * 0.28 : 0);
    }
  }
  // Gaskets stay soot-black; rust tears run from the lower corners
  paintGaskets(kit, spec, r, 'rgba(96,54,28,0.42)');
  // Corrosion blooming off the window-corner drips, smearing down the doors
  for (const hole of spec.holes) {
    for (const [hx, hy] of [hole[0], hole[1]]) {
      if (r.chance(0.75)) {
        rust(hx + r.spread(0.03), hy - 0.015, 0.014 + r() * 0.02,
          0.3 + r() * 0.3, 0.12 + r() * 0.28);
      }
    }
  }
  // Boot / hood cut lines on the end caps
  line(halfL - 0.05, spec.bootY, 2.2, spec.bootY, 3, 'rgba(16,14,12,0.6)');
  line(-2.2, spec.hoodY, -halfL + 0.05, spec.hoodY, 3, 'rgba(16,14,12,0.6)');
  // Paint blister clusters (dark rings, some with oxide cores) hugging the
  // damage zones — the classic "rust creeping out from the edges" read
  const clusters = [
    [-spec.ax, 0.58], [spec.ax, 0.58], [spec.seams[0] + 0.15, 0.5],
    [spec.seams[1] + 0.2, 0.45], [0.6, 0.44], [-0.5, 0.46], [spec.fuel ?? 1.2, 0.85],
  ];
  for (const [cx, cy] of clusters) {
    const n = 4 + r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const bx = cx + r.spread(0.14), by = cy + r.spread(0.1);
      const br = 0.005 + r() * 0.009;
      ring(bx, by, br, 1.2, `rgba(58,32,18,${0.32 + r() * 0.26})`,
        r.chance(0.6) ? 'rgba(112,62,30,0.38)' : null);
      // nearly half the blisters have burst and bled a short tail
      if (r.chance(0.45)) rust(bx, by, br * 1.1, 0.28, 0.05 + r() * 0.11);
    }
  }
  // Weep under the fuel-filler door
  if (spec.fuel != null) rust(spec.fuel, 0.885, 0.02, 0.42, 0.12 + r() * 0.18);
  // Bullet strikes: pale chipped halo, dark core, occasional rust tail
  for (let i = 0; i < 7; i++) {
    const bx = -1.6 + r() * 3.2, by = 0.5 + r() * 0.75;
    splat(bx, by, 0.035, [[0, 'rgba(224,214,192,0.5)'], [1, 'rgba(0,0,0,0)']]);
    ring(bx, by, 0.011, 0, null, 'rgba(12,11,10,0.92)');
    if (r.chance(0.5)) {
      ctx.fillStyle = 'rgba(100,56,28,0.35)';
      ctx.fillRect(X(bx) - 1, Y(by), 2, (0.05 + r() * 0.16) * PXM * KY);
    }
  }
  // Grime streaks off the beltline
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = `rgba(34,28,22,${0.08 + r() * 0.14})`;
    ctx.fillRect(X(-1.9 + r() * 3.8), Y(1.02), 1.6 + r() * 2, (0.12 + r() * 0.42) * PXM * KY);
  }
  // Mild dust skirt so the hulk still sits in the sand-blown street
  const dust = ctx.createLinearGradient(0, Y(0.6), 0, 384);
  dust.addColorStop(0, 'rgba(180,160,126,0)');
  dust.addColorStop(1, 'rgba(180,160,126,0.22)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, Y(0.6), 1024, 384 - Y(0.6));
  for (const hx of spec.handles) {
    ctx.fillStyle = 'rgba(14,12,10,0.8)';
    ctx.fillRect(X(hx), Y(1.08), 0.16 * PXM, 5);
  }
  const albedo = kit.finish({ srgb: true });

  // Roughness companion: matte everywhere, extra-matte oxide, a few flaked
  // bare-metal glints on doors/hood
  const rk = skinKit(512, 192, -2.2, 4.4, -0.1, 1.8);
  const rr = makeRNG(707 + variant.length);
  rk.ctx.fillStyle = 'rgb(206,206,206)';
  rk.ctx.fillRect(0, 0, 512, 192);
  for (let i = 0; i < 60; i++) {
    rk.splat(-2.1 + rr() * 4.2, 0.28 + rr() * 0.5, 0.04 + rr() * 0.1,
      [[0, 'rgba(242,242,242,0.7)'], [1, 'rgba(0,0,0,0)']]);
  }
  for (let i = 0; i < 8; i++) {
    rk.ctx.fillStyle = 'rgba(120,120,120,0.7)';
    rk.ctx.fillRect(rr() * 512, rk.Y(0.55 + rr() * 0.6), 6 + rr() * 26, 2 + rr() * 5);
  }
  for (const ax of [-spec.ax, spec.ax]) {
    rk.ring(ax, 0.28, spec.archR + 0.05, 0, null, 'rgb(242,242,242)');
  }
  const roughT = rk.finish({});

  const m = new THREE.MeshStandardMaterial({
    map: albedo, roughnessMap: roughT, roughness: 1, metalness: 0.3, envMapIntensity: 0.55,
  });
  _rustCarMats.set(variant, m);
  return m;
}

let _busWreckMat = null;
/**
 * Burned coach hull skin painted in side-profile space (u = x, v = y):
 * soot tongues venting over each window bay, charred roofline, rust-eaten
 * skirt and arch lips, bay-pillar seams and streaking — with a readable
 * bleached livery (pale coach white + faded stripe) between the damage.
 */
function busWreckMat() {
  if (_busWreckMat) return _busWreckMat;
  const kit = skinKit(1024, 320, -5.4, 10.8, 0, 3.4);
  const { ctx, X, Y, PXM, KY, splat, line } = kit;
  const r = makeRNG(4188);
  const bays = [[-4.8, -4.06]];
  for (let i = 0; i < 7; i++) bays.push([-3.94 + i * 1.24, -3.94 + i * 1.24 + 1.12]);
  const rust = makeRustPainter(kit, r);
  // Bleached coach white + patchiness (kept dim — this hull burned)
  ctx.fillStyle = '#8f887c';
  ctx.fillRect(0, 0, 1024, 320);
  for (let i = 0; i < 12; i++) {
    splat(-5 + r() * 10, 0.4 + r() * 2.4, 0.5 + r() * 0.9, [
      [0, `rgba(${r.chance(0.55) ? '122,114,101' : '160,152,138'},${0.2 + r() * 0.22})`],
      [1, 'rgba(0,0,0,0)'],
    ]);
  }
  // Faded livery stripe under the windows + thin accent
  ctx.fillStyle = 'rgba(94,54,40,0.8)';
  ctx.fillRect(0, Y(1.32), 1024, Y(0.98) - Y(1.32));
  ctx.fillStyle = 'rgba(94,54,40,0.45)';
  ctx.fillRect(0, Y(1.46), 1024, 2.5);
  for (let i = 0; i < 8; i++) { // scrapes through the stripe
    ctx.fillStyle = `rgba(154,146,134,${0.3 + r() * 0.3})`;
    ctx.fillRect(r() * 1024, Y(1.32), 4 + r() * 26, Y(0.98) - Y(1.32));
  }
  // Window band: smoke-stained pillars + per-bay frames + soot tongues
  ctx.fillStyle = 'rgba(30,27,24,0.72)';
  ctx.fillRect(0, Y(2.6), 1024, Y(1.74) - Y(2.6));
  ctx.lineJoin = 'round';
  for (const [x0, x1] of bays) {
    ctx.strokeStyle = 'rgba(14,13,11,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(X(x0), Y(2.6), X(x1) - X(x0), Y(1.74) - Y(2.6));
    if (r.chance(0.75)) {
      const mid = (x0 + x1) / 2;
      ctx.save();
      ctx.translate(X(mid), Y(2.62));
      ctx.scale(1.6, 1);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, (x1 - x0) * 0.56 * PXM);
      gg.addColorStop(0, `rgba(18,15,13,${0.62 + r() * 0.3})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      const RR = (x1 - x0) * 0.56 * PXM;
      ctx.fillRect(-RR, -RR, RR * 2, RR * 2);
      ctx.restore();
    }
    // rust weeps under the sills, bleeding down the bay panels
    for (let i = 0; i < 2; i++) {
      if (r.chance(0.7)) {
        rust(x0 + r() * (x1 - x0), 1.73, 0.018 + r() * 0.02, 0.36 + r() * 0.2, 0.2 + r() * 0.5);
      }
    }
  }
  // Charred roofline (top faces sample the outline row)
  ctx.strokeStyle = 'rgba(22,18,15,0.82)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(X(-5.2), Y(2.8));
  ctx.lineTo(X(-4.7), Y(3.18));
  ctx.lineTo(X(4.78), Y(3.18));
  ctx.lineTo(X(5.2), Y(2.86));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(24,20,16,0.3)';
  ctx.lineWidth = 17;
  ctx.stroke();
  // Skirt: grime + rust-eaten lower band, arch wells with corroded lips
  const skirt = ctx.createLinearGradient(0, Y(0.85), 0, Y(0.34));
  skirt.addColorStop(0, 'rgba(30,26,22,0)');
  skirt.addColorStop(0.6, 'rgba(30,26,22,0.35)');
  skirt.addColorStop(1, 'rgba(26,22,18,0.6)');
  ctx.fillStyle = skirt;
  ctx.fillRect(0, Y(0.85), 1024, Y(0.34) - Y(0.85));
  for (let i = 0; i < 42; i++) {
    rust(-5.2 + r() * 10.4, 0.4 + Math.pow(r(), 1.6) * 0.33, 0.035 + r() * 0.085,
      0.28 + r() * 0.38, r.chance(0.55) ? 0.05 + r() * 0.16 : 0);
  }
  for (const ax of [-3.15, 2.65]) {
    const R = 0.66;
    splat(ax, 0.34, R + 0.08, [
      [0, 'rgba(8,8,7,0.97)'],
      [(R - 0.04) / (R + 0.08), 'rgba(8,8,7,0.95)'],
      [R / (R + 0.08), 'rgba(10,9,8,0.5)'],
      [1, 'rgba(12,10,9,0)'],
    ]);
    for (let i = 0; i < 13; i++) {
      const a = r() * Math.PI;
      rust(ax + Math.cos(a) * (R + 0.02), 0.34 + Math.sin(a) * (R + 0.02), 0.03 + r() * 0.06,
        0.32 + r() * 0.4, 0);
    }
    // corrosion spray smearing down the skirt fore/aft of each arch
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        rust(ax + sgn * (R + 0.08 + r() * 0.15), 0.55 + r() * 0.25,
          0.025 + r() * 0.04, 0.3 + r() * 0.32, 0.1 + r() * 0.22);
      }
    }
  }
  // Big soot fields over the upper hull — fire core amidships and aft, so
  // the wreck reads burned from every angle instead of "dusty but clean"
  for (let i = 0; i < 10; i++) {
    splat(-1.8 + r() * 6.6, 1.5 + r() * 1.4, 0.8 + r() * 1.3, [
      [0, `rgba(24,20,17,${0.36 + r() * 0.3})`],
      [1, 'rgba(0,0,0,0)'],
    ]);
  }
  // Heat scorch climbing from the engine bay over the tail
  splat(4.9, 1.6, 1.5, [[0, 'rgba(22,18,15,0.66)'], [0.6, 'rgba(24,20,17,0.32)'], [1, 'rgba(0,0,0,0)']]);
  // Panel seams at bay pitch continuing below the windows
  for (const [x0] of bays) {
    line(x0 - 0.06, 2.6, x0 - 0.055, 0.4, 2, 'rgba(18,16,13,0.4)');
  }
  line(4.62 + 0.06, 2.6, 4.62 + 0.065, 0.4, 2, 'rgba(18,16,13,0.4)');
  // Bullet strikes scattered mid-hull
  for (let i = 0; i < 9; i++) {
    const bx = -4.6 + r() * 9, by = 0.9 + r() * 1.4;
    splat(bx, by, 0.045, [[0, 'rgba(216,206,186,0.5)'], [1, 'rgba(0,0,0,0)']]);
    kit.ring(bx, by, 0.014, 0, null, 'rgba(12,11,10,0.92)');
  }
  // Rear engine-bay scorch column (the fire started here); the rear cap
  // face samples this strip, so the tail reads properly burned
  const rear = ctx.createLinearGradient(X(4.6), 0, 1024, 0);
  rear.addColorStop(0, 'rgba(22,18,15,0)');
  rear.addColorStop(1, 'rgba(22,18,15,0.62)');
  ctx.fillStyle = rear;
  ctx.fillRect(X(4.6), 0, 1024 - X(4.6), 320);
  // Dust skirt
  const dust = ctx.createLinearGradient(0, Y(0.8), 0, 320);
  dust.addColorStop(0, 'rgba(180,160,126,0)');
  dust.addColorStop(1, 'rgba(180,160,126,0.2)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, Y(0.8), 1024, 320 - Y(0.8));
  _busWreckMat = new THREE.MeshStandardMaterial({
    map: kit.finish({ srgb: true }), roughness: 0.9, metalness: 0.16, envMapIntensity: 0.45,
  });
  return _busWreckMat;
}

/* ---------------------------------- cars ---------------------------------- */

// Paint palette used when the caller passes color=null: dusty white, faded
// red, desaturated blue, gunmetal, sand — five readable families instead of
// one beige mush.
// Deeper than the target read: the warm sun + exposure neutralise chroma
const CAR_COLORS = [0xcfc8b8, 0x8a352a, 0x38536e, 0x35373d, 0x9c8557];

let _glassGradTex = null;
/** Vertical reflection gradient baked once for all car glazing: bright sky
 *  tone along the top edge falling through a pale horizon streak to a dark
 *  lower half, so panes read as curved glass catching the sky instead of a
 *  uniform pale-blue slab. Panes remap v to height via heightUVs. */
function glassGradientTexture() {
  if (_glassGradTex) return _glassGradTex;
  const c = canvas(8, 128);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#eef6fb');   // hot sky ping at the roofline
  g.addColorStop(0.28, '#b7cdd9');
  g.addColorStop(0.55, '#5d7183');
  g.addColorStop(1, '#161c22');   // falls near-black toward the beltline
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  // Reflected-horizon streak
  ctx.fillStyle = 'rgba(232, 226, 206, 0.38)';
  ctx.fillRect(0, 58, 8, 4);
  _glassGradTex = tex(c, { srgb: true });
  _glassGradTex.wrapS = _glassGradTex.wrapT = THREE.ClampToEdgeWrapping;
  return _glassGradTex;
}

/** Remap UVs so v tracks the geometry's local height span (u constant):
 *  every face of a pane samples the glass gradient top-to-bottom no matter
 *  how it's sloped. Bake any rotation into the geometry first. */
function heightUVs(geo) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const span = Math.max(1e-5, max.y - min.y);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, (pos.getY(i) - min.y) / span);
  uv.needsUpdate = true;
  return geo;
}

let _carGlassMat = null;
/** Car glazing: dark tinted panes over a near-black cabin. High metalness +
 *  hot envMapIntensity turn scene.environment into a real mirror ping, and
 *  the baked sky gradient (bright roofline → dark beltline) tints that
 *  reflection so every pane reads as curved glass catching the sky. */
function carGlass() {
  if (!_carGlassMat) {
    _carGlassMat = new THREE.MeshStandardMaterial({
      map: glassGradientTexture(), color: 0xe9f1f6,
      roughness: 0.06, metalness: 0.62, envMapIntensity: 2.6,
      transparent: true, opacity: 0.92,
    });
  }
  return _carGlassMat;
}

let _hubTex = null;
/** Steel wheel face baked once: lighter grey dish, rim crease, 5 lug hints
 *  with specular dots, centre cap. Mapped onto the hub cylinder caps. */
function hubcapTexture() {
  if (_hubTex) return _hubTex;
  const c = canvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#161616'; // matches tire rubber where the barrel side peeks
  ctx.fillRect(0, 0, 128, 128);
  const disc = ctx.createRadialGradient(56, 56, 6, 64, 64, 58);
  disc.addColorStop(0, '#9c9c96');
  disc.addColorStop(0.72, '#84837d');
  disc.addColorStop(0.92, '#6a6963');
  disc.addColorStop(1, '#3a3a37');
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(64, 64, 58, 0, 7); ctx.fill();
  // Rim dish crease
  ctx.strokeStyle = 'rgba(30, 30, 28, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(64, 64, 44, 0, 7); ctx.stroke();
  // 5 lug hints: dark socket + small bright catch
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const lx = 64 + Math.cos(a) * 27, ly = 64 + Math.sin(a) * 27;
    ctx.fillStyle = '#3f3f3c';
    ctx.beginPath(); ctx.arc(lx, ly, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c4c3bc';
    ctx.beginPath(); ctx.arc(lx - 1.8, ly - 1.8, 2.2, 0, 7); ctx.fill();
  }
  // Centre cap
  ctx.fillStyle = '#8f8e88';
  ctx.beginPath(); ctx.arc(64, 64, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(38, 38, 36, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(64, 64, 11, 0, 7); ctx.stroke();
  _hubTex = tex(c, { srgb: true });
  _hubTex.wrapS = _hubTex.wrapT = THREE.ClampToEdgeWrapping;
  return _hubTex;
}

let _hubMats = null;
/** Wheel-hub materials as cylinder material arrays [barrel, cap, cap]: the
 *  barrel stays rubber-dark (it used to smear the cap texture into noise)
 *  while both cap faces get the baked steel dish + lug hints. */
function hubcapMat(burned) {
  if (!_hubMats) {
    const barrel = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.88, metalness: 0.2 });
    const capClean = new THREE.MeshStandardMaterial({ map: hubcapTexture(), roughness: 0.38, metalness: 0.7, envMapIntensity: 1.3 });
    const capBurned = new THREE.MeshStandardMaterial({ map: hubcapTexture(), color: 0x4a4844, roughness: 0.8, metalness: 0.4 });
    _hubMats = {
      clean: [barrel, capClean, capClean],
      burned: [barrel, capBurned, capBurned],
    };
  }
  return burned ? _hubMats.burned : _hubMats.clean;
}

let _plateTex = null;
/** License-plate decal baked once: pale field, thin border, blocky dark
 *  registration glyphs that read as text without resolving to letters. */
function plateTexture() {
  if (_plateTex) return _plateTex;
  const c = canvas(64, 32);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9d3bf';
  ctx.fillRect(0, 0, 64, 32);
  ctx.strokeStyle = 'rgba(70, 66, 56, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1.5, 1.5, 61, 29);
  const r = makeRNG(3311);
  ctx.fillStyle = 'rgba(44, 42, 38, 0.9)';
  let gx = 8;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(gx, 10.5 + r.spread(1.5), 4 + r() * 2.5, 11);
    gx += 8 + r() * 1.6;
  }
  _plateTex = tex(c, { srgb: true });
  _plateTex.wrapS = _plateTex.wrapT = THREE.ClampToEdgeWrapping;
  return _plateTex;
}

let _trimMatSets = null;
/** Bumper/plate/grille/light/mirror materials shared by every car build. */
function carTrimMats(burned) {
  if (!_trimMatSets) {
    const mk = (b) => ({
      bumper: new THREE.MeshStandardMaterial({ color: b ? 0x151515 : 0x2c2c2c, roughness: 0.7 }),
      strip: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.9 }),
      plate: b
        ? new THREE.MeshStandardMaterial({ color: 0x3a3832, roughness: 0.55, metalness: 0.2 })
        : new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.55, metalness: 0.2 }),
      grille: new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.85, metalness: 0.2 }),
      light: new THREE.MeshStandardMaterial({ color: b ? 0x222222 : 0xd8d2b8, roughness: 0.25, metalness: 0.4, envMapIntensity: 1.4 }),
      tail: new THREE.MeshStandardMaterial({
        color: b ? 0x1a1a1a : 0x6a1a12, roughness: 0.3, metalness: 0.3, envMapIntensity: 1.5,
      }),
      mirror: new THREE.MeshStandardMaterial({
        color: b ? 0x26241f : 0x9fb4c0, roughness: b ? 0.85 : 0.14, metalness: 0.7, envMapIntensity: 1.7,
      }),
    });
    _trimMatSets = { clean: mk(false), burned: mk(true) };
  }
  return burned ? _trimMatSets.burned : _trimMatSets.clean;
}

let _kitGeos = null;
/** Silhouette-kit geometry shared by every car: one unit box scaled per use
 *  (strips, rails, plates, lights), chamfered mirror housing, whip antenna. */
function carKitGeos() {
  if (_kitGeos) return _kitGeos;
  const antenna = new THREE.CylinderGeometry(0.005, 0.01, 0.66, 5);
  antenna.translate(0, 0.33, 0); // base at origin so the whip rakes from its foot
  _kitGeos = {
    unit: new THREE.BoxGeometry(1, 1, 1),
    mirror: new RoundedBoxGeometry(0.085, 0.1, 0.16, 1, 0.024),
    mirrorFace: new THREE.BoxGeometry(0.012, 0.068, 0.118),
    antenna,
    antennaBase: new THREE.CylinderGeometry(0.014, 0.02, 0.05, 6),
  };
  return _kitGeos;
}

let _glintMat = null;
/** Shattered-glass / rubble scatter decal laid under wrecks: soot crumbs plus
 *  a few hot pinpoint glints (unlit material so they sparkle in any light). */
function glassGlintMat() {
  if (_glintMat) return _glintMat;
  const c = canvas(128, 128);
  const ctx = c.getContext('2d');
  const r = makeRNG(7741);
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 60;
    const x = 64 + Math.cos(a) * rad, y = 64 + Math.sin(a) * rad * 0.72;
    if (r.chance(0.28)) {
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, 2.6);
      g2.addColorStop(0, 'rgba(235, 244, 250, 0.95)');
      g2.addColorStop(0.4, 'rgba(190, 210, 224, 0.5)');
      g2.addColorStop(1, 'rgba(190, 210, 224, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    } else {
      const s = 0.8 + r() * 2.4;
      ctx.fillStyle = `rgba(${r.chance(0.4) ? '58, 52, 45' : '26, 23, 20'}, ${0.4 + r() * 0.45})`;
      ctx.fillRect(x, y, s, s);
    }
  }
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  _glintMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return _glintMat;
}

const _carSkinCache = new Map();
/**
 * Body-panel albedo baked in side-profile space (uv = shape x/y). This layer
 * is what separates "car" from "clay": wide-halo + crisp-core shutlines at
 * every door/hood/trunk cut with a 1px sun-catch edge, dark rubber gaskets
 * around the punched window openings, near-black wheel wells with a short
 * AO lip, per-panel value shifts, rocker grime and a bottom-up dust film
 * with wind streaks and sand speckle. Top faces sample their own profile
 * row, so shutlines print across the hood/roof/trunk at seam x positions.
 */
function carBodySkin(colorHex, variant) {
  const key = colorHex + ':' + variant;
  if (_carSkinCache.has(key)) return _carSkinCache.get(key);
  const spec = CAR_SPECS[variant];
  const kit = skinKit(1024, 384, -2.2, 4.4, -0.1, 1.8);
  const { ctx, X, Y, PXM, KY, line, ring } = kit;
  // Minimal sun-fade (the warm sun + exposure already lift/neutralise paint);
  // palette hues must survive to the screen
  const base = new THREE.Color(colorHex).lerp(new THREE.Color(0xb0a890), 0.08);
  ctx.fillStyle = '#' + base.getHexString();
  ctx.fillRect(0, 0, 1024, 384);
  const r = makeRNG(colorHex + (variant === 'pickup' ? 17 : variant === 'hatch' ? 29 : 5));
  // Panel-to-panel value shifts (±10% — the warm sun flattens anything less)
  const zones = [-2.2, ...spec.seams, 2.2];
  ctx.globalAlpha = 0.62;
  for (let i = 0; i < zones.length - 1; i++) {
    const cc = base.clone().multiplyScalar(1 + r.spread(0.1));
    ctx.fillStyle = '#' + cc.getHexString();
    ctx.fillRect(X(zones[i]), 0, X(zones[i + 1]) - X(zones[i]), 384);
  }
  ctx.globalAlpha = 1;
  // Subtle body character line + sill crease
  line(-1.85, 0.98, 1.7, 1.04, 1.5, 'rgba(20,17,14,0.22)');
  line(-1.7, 0.4, 1.75, 0.41, 1.5, 'rgba(20,17,14,0.3)');
  // Scuffs / sun streaks
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(${r.chance(0.5) ? '214,208,194' : '56,48,40'}, ${0.05 + r() * 0.1})`;
    ctx.fillRect(r() * 1024, Y(0.25 + r() * 1.05), 6 + r() * 60, 1 + r() * 2);
  }
  // Roof/hood sun bleach: top rows lift slightly so upward panels read hotter
  const sun = ctx.createLinearGradient(0, 0, 0, Y(1.1));
  sun.addColorStop(0, 'rgba(255, 250, 238, 0.09)');
  sun.addColorStop(1, 'rgba(255, 250, 238, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 1024, Y(1.1));
  // Bottom-up dust film + horizontal wind streaks + sand speckle near sills
  const dust = ctx.createLinearGradient(0, Y(0.75), 0, 384);
  dust.addColorStop(0, 'rgba(185, 165, 130, 0)');
  dust.addColorStop(0.55, 'rgba(185, 165, 130, 0.22)');
  dust.addColorStop(1, 'rgba(185, 165, 130, 0.34)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, Y(0.75), 1024, 384 - Y(0.75));
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = `rgba(${r.chance(0.6) ? '196,176,140' : '150,132,104'}, ${0.06 + r() * 0.1})`;
    ctx.fillRect(r() * 1024, Y(0.16 + r() * 0.5), 20 + r() * 130, 1 + r() * 2.2);
  }
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${r.chance(0.5) ? '203,184,148' : '124,108,84'}, ${0.12 + r() * 0.2})`;
    ctx.fillRect(r() * 1024, Y(0.14 + Math.pow(r(), 2.2) * 0.5), 1 + r() * 1.6, 1 + r());
  }
  // Near-black wheel wells + fender AO lip
  paintArchWells(kit, spec);
  // Rocker grime band
  const rocker = ctx.createLinearGradient(0, Y(0.44), 0, Y(0.28));
  rocker.addColorStop(0, 'rgba(24,20,16,0)');
  rocker.addColorStop(0.6, 'rgba(24,20,16,0.24)');
  rocker.addColorStop(1, 'rgba(22,18,15,0.46)');
  ctx.fillStyle = rocker;
  ctx.fillRect(0, Y(0.44), 1024, Y(0.28) - Y(0.44));
  // Window gaskets + dirt drips off the lower corners
  paintGaskets(kit, spec, r, 'rgba(28,24,19,0.18)');
  // Shutlines — halo, crisp dark core, then a 1px sun-catch on the trailing
  // edge; drawn after the dust film so the grooves stay readable low down.
  // Core is ~1.5cm wide at texture scale: oversized against a real 5mm gap,
  // but the oblique eye-level views + minification eat anything thinner.
  for (const sx of spec.seams) {
    line(sx, 1.36, sx + 0.022, 0.3, 7.5, 'rgba(16,14,12,0.3)');
    line(sx, 1.36, sx + 0.022, 0.3, 3.6, 'rgba(14,12,10,0.9)');
    line(sx + 0.015, 1.36, sx + 0.037, 0.3, 1.4, 'rgba(255,250,236,0.2)');
  }
  // Rocker shutline
  line(-1.55, 0.335, 1.65, 0.345, 2.2, 'rgba(18,16,13,0.55)');
  // Boot/tailgate + hood cuts: the tail and nose faces sample the x≈±(L/2)
  // texture columns, so horizontal lines drawn at the strip edges wrap those
  // faces (with a ~5cm return onto the quarter panels / fenders)
  const halfL = spec.L / 2;
  line(halfL - 0.05, spec.bootY, 2.2, spec.bootY, 3, 'rgba(17,15,13,0.6)');
  line(-2.2, spec.hoodY, -halfL + 0.05, spec.hoodY, 3, 'rgba(17,15,13,0.6)');
  // Door handles: dark recess + bright pull bar at the beltline
  for (const hx of spec.handles) {
    ctx.fillStyle = 'rgba(15,13,11,0.72)';
    ctx.fillRect(X(hx) - 1.5, Y(1.08), 0.17 * PXM + 3, 6.6);
    ctx.fillStyle = 'rgba(214,208,193,0.88)';
    ctx.fillRect(X(hx), Y(1.075), 0.16 * PXM, 3);
  }
  // Fuel filler door
  if (spec.fuel != null) {
    ring(spec.fuel, 0.94, 0.052, 2, 'rgba(17,15,13,0.62)');
    line(spec.fuel + 0.052, 0.94, spec.fuel + 0.085, 0.94, 1.5, 'rgba(17,15,13,0.4)');
  }
  const t = kit.finish({ srgb: true });
  _carSkinCache.set(key, t);
  return t;
}

const _carRoughCache = new Map();
/** Roughness companion to carBodySkin: per-panel gloss jitter, slightly
 *  polished upper panels (so the env map pings the roof/hood/shoulders),
 *  matte dust toward the sills, matte-black wells, scuff patches. */
function carBodyRough(colorHex, variant) {
  const key = colorHex + ':' + variant;
  if (_carRoughCache.has(key)) return _carRoughCache.get(key);
  const spec = CAR_SPECS[variant];
  const kit = skinKit(512, 192, -2.2, 4.4, -0.1, 1.8);
  const { ctx, X, Y, ring } = kit;
  const r = makeRNG((colorHex ^ 0x2f19) + (variant === 'pickup' ? 5 : variant === 'hatch' ? 11 : 3));
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fillRect(0, 0, 512, 192);
  const zones = [-2.2, ...spec.seams, 2.2];
  for (let i = 0; i < zones.length - 1; i++) {
    const v = Math.round(150 + r.spread(22));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(X(zones[i]), 0, X(zones[i + 1]) - X(zones[i]), 192);
  }
  // Upper panels polish up (roof/hood catch the env ping)
  const up = ctx.createLinearGradient(0, 0, 0, Y(0.9));
  up.addColorStop(0, 'rgba(112,112,112,0.6)');
  up.addColorStop(1, 'rgba(112,112,112,0)');
  ctx.fillStyle = up;
  ctx.fillRect(0, 0, 512, Y(0.9));
  // Matte dust toward the sills
  const dn = ctx.createLinearGradient(0, Y(0.8), 0, 192);
  dn.addColorStop(0, 'rgba(215,215,215,0)');
  dn.addColorStop(1, 'rgba(215,215,215,0.85)');
  ctx.fillStyle = dn;
  ctx.fillRect(0, Y(0.8), 512, 192 - Y(0.8));
  // Scuff patches break the panel sheen
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = `rgba(${r.chance(0.5) ? '228,228,228' : '96,96,96'},${0.25 + r() * 0.3})`;
    ctx.fillRect(r() * 512, Y(0.3 + r() * 1.1), 14 + r() * 70, 3 + r() * 9);
  }
  // Matte wells
  for (const ax of [-spec.ax, spec.ax]) {
    ring(ax, 0.28, spec.archR + 0.05, 0, null, 'rgb(238,238,238)');
  }
  const t = kit.finish({});
  _carRoughCache.set(key, t);
  return t;
}

// Body materials shared per paint/variant so the ~10 street cars reuse the
// same compiled program + baked skins. metalness 0.2 + envMapIntensity 1.25
// give the paint a real sky response (the roughness map decides where).
const _carBodyMatCache = new Map();
function carBodyMat(colorHex, variant) {
  const key = colorHex + ':' + variant;
  if (!_carBodyMatCache.has(key)) {
    _carBodyMatCache.set(key, new THREE.MeshStandardMaterial({
      map: carBodySkin(colorHex, variant),
      roughnessMap: carBodyRough(colorHex, variant),
      roughness: 1.0, metalness: 0.2, envMapIntensity: 1.25,
    }));
  }
  return _carBodyMatCache.get(key);
}

export function buildCar({ burned = false, color = null, pickup = false, hatch = false } = {}) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  // Everything body-mounted lives in `shell` so wrecks can roll on a
  // deflated corner while the wheels stay planted
  const shell = new THREE.Group();
  g.add(shell);
  const col = color ?? CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
  const variant = hatch ? 'hatch' : pickup ? 'pickup' : 'sedan';
  const bodyMat = burned ? rustCarMat(variant) : carBodyMat(col, variant);
  const glassMat = burned ? lib.darkInterior : carGlass();
  const wsMat = burned ? lib.charred : carGlass();

  const L = hatch ? 3.62 : 4.15;
  const W = hatch ? 1.72 : 1.85;
  const bottomY = 0.28, archR = hatch ? 0.44 : 0.46;
  const axFront = hatch ? -L * 0.345 : -L * 0.32;
  const axRear = -axFront;

  // Body: one extruded 2D side profile (hood/cabin/trunk steps) with real
  // wheel-arch cutouts carved into the outline, extruded across the width.
  const profile = new THREE.Shape();
  profile.moveTo(-L / 2, bottomY);
  profile.lineTo(axFront - archR, bottomY);
  profile.absarc(axFront, bottomY, archR, Math.PI, 0, true);
  profile.lineTo(axRear - archR, bottomY);
  profile.absarc(axRear, bottomY, archR, Math.PI, 0, true);
  profile.lineTo(L / 2, bottomY);
  if (pickup) {
    profile.lineTo(L / 2, 0.98);        // tailgate
    profile.lineTo(0.55, 0.98);         // bed rail
    profile.lineTo(0.52, 1.39);         // cab rear (chopped ~10% — no more tall slab)
    profile.lineTo(-0.45, 1.41);        // roof
    profile.lineTo(-1.05, 0.94);        // windshield base
    profile.lineTo(-1.95, 0.87);        // hood
    profile.lineTo(-L / 2, 0.8);        // grille top
  } else if (hatch) {
    profile.lineTo(L / 2, 0.86);        // tail face
    profile.lineTo(L / 2 - 0.3, 1.44);  // hatch glass top
    profile.lineTo(-0.15, 1.5);         // roof
    profile.lineTo(-0.75, 0.95);        // windshield base
    profile.lineTo(-1.5, 0.88);         // hood
    profile.lineTo(-L / 2, 0.8);        // grille top
  } else {
    profile.lineTo(L / 2, 0.62);        // rear face
    profile.lineTo(L / 2 - 0.03, 0.92); // tail top
    profile.lineTo(1.45, 0.98);         // trunk lid
    profile.lineTo(0.82, 1.48);         // C-pillar (raised greenhouse)
    profile.lineTo(-0.28, 1.52);        // roof
    profile.lineTo(-0.95, 0.94);        // windshield base
    profile.lineTo(-1.9, 0.86);         // hood
    profile.lineTo(-L / 2, 0.78);       // grille top
  }
  profile.closePath();
  // Punched side-window openings (real pillars, glass recessed inside)
  const winHole = (pts) => {
    const p = new THREE.Path();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    profile.holes.push(p);
  };
  if (pickup) {
    winHole([[-0.78, 1.04], [0.36, 1.04], [0.36, 1.28], [-0.5, 1.28]]);
  } else if (hatch) {
    winHole([[-0.5, 1.03], [0.12, 1.03], [0.12, 1.36], [-0.2, 1.36]]);
    winHole([[0.26, 1.03], [0.95, 1.03], [0.72, 1.36], [0.26, 1.36]]);
  } else {
    winHole([[-0.66, 1.02], [0.05, 1.02], [0.05, 1.38], [-0.34, 1.38]]);
    winHole([[0.2, 1.02], [1.15, 1.02], [0.78, 1.38], [0.2, 1.38]]);
  }
  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: W - 0.08, bevelEnabled: true, bevelThickness: 0.04,
    bevelSize: 0.04, bevelSegments: 2, curveSegments: 12,
  });
  bodyGeo.translate(0, 0, -(W - 0.08) / 2);
  // Project all UVs into side-profile space so the panel skin maps cleanly
  // on the sides and shutlines cross the hood/roof at the right x
  {
    const uv = bodyGeo.attributes.uv, pos = bodyGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    uv.needsUpdate = true;
  }
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  shell.add(body);

  // Dark underbody / wheel-well fill visible through the arch openings
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(L * 0.76, 0.56, W - 0.42), lib.darkInterior);
  chassis.position.set(0, 0.44, 0);
  g.add(chassis);

  // Recessed side glass behind the punched window openings (v maps to
  // height so the pane samples the sky gradient vertically)
  const sgLen = pickup ? 1.3 : hatch ? 1.65 : 2.0;
  const sgX = pickup ? -0.18 : hatch ? 0.2 : 0.24;
  const sgY = pickup ? 1.14 : 1.2;
  const sideGlass = new THREE.Mesh(heightUVs(new THREE.BoxGeometry(sgLen, 0.46, W - 0.22)), glassMat);
  sideGlass.position.set(sgX, sgY, 0);
  shell.add(sideGlass);
  if (!burned) {
    // Dark cabin volume just inside the panes: the 15% transmission of the
    // tinted glass lands on this instead of bleeding through the body
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(sgLen - 0.06, 0.44, W - 0.4), lib.darkInterior);
    cabin.position.set(sgX, sgY, 0);
    shell.add(cabin);
  }

  // Windshield / rear glass laid on the profile slopes: dark backing plate
  // + reflective semi-transparent pane so it reads as tinted glass depth
  const glassOnSlope = (x0, y0, x1, y1, wFrac) => {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const nx = -dy / len, ny = dx / len; // outward slope normal
    if (!burned) {
      const back = new THREE.Mesh(new THREE.BoxGeometry(len * 0.86, 0.02, W * wFrac * 0.98), lib.darkInterior);
      back.rotation.z = ang;
      back.position.set((x0 + x1) / 2 + nx * 0.012, (y0 + y1) / 2 + ny * 0.012, 0);
      shell.add(back);
    }
    // Rotation baked into the geometry so heightUVs can map v to height —
    // the raked pane still samples the sky gradient top-to-bottom
    const paneGeo = heightUVs(new THREE.BoxGeometry(len * 0.86, 0.03, W * wFrac).rotateZ(ang));
    const m = new THREE.Mesh(paneGeo, wsMat);
    m.position.set((x0 + x1) / 2 + nx * 0.03, (y0 + y1) / 2 + ny * 0.03, 0);
    shell.add(m);
  };
  if (pickup) {
    glassOnSlope(-1.05, 0.94, -0.45, 1.41, 0.78);
    // Rear cab window so the bulkhead over the bed isn't a blank wall
    const cabGlass = new THREE.Mesh(heightUVs(new THREE.BoxGeometry(0.02, 0.22, W * 0.55)), wsMat);
    cabGlass.position.set(0.548, 1.22, 0);
    shell.add(cabGlass);
  } else if (hatch) {
    glassOnSlope(-0.75, 0.95, -0.15, 1.5, 0.78);
    glassOnSlope(L / 2 - 0.3, 1.44, L / 2, 0.86, 0.74);
  } else {
    glassOnSlope(-0.95, 0.94, -0.28, 1.52, 0.78);
    glassOnSlope(0.82, 1.48, 1.45, 0.98, 0.76);
  }

  if (pickup) {
    // Open bed read: dark floor recessed below the rails
    const bedIn = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, W - 0.36), lib.darkInterior);
    bedIn.position.set(1.37, 0.9, 0);
    shell.add(bedIn);
  }
  // Contact AO blob — dark plateau under the chassis, feathered past the sills
  addContactShadow(g, L * 1.15, W * 1.7, 0.62);

  // Wheels that read at close range: dark rubber torus tire around a lighter
  // grey hub disc (5 baked lug hints), both sunk into a darkened arch cavity
  const tireOuter = archR - 0.1;
  const tube = 0.115;
  const ringR = tireOuter - tube;
  const tireGeo = new THREE.TorusGeometry(ringR, tube, 10, 22);
  const hubGeo = new THREE.CylinderGeometry(ringR - 0.028, ringR - 0.028, 0.2, 18);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = hubcapMat(burned);
  const archInGeo = new THREE.CylinderGeometry(archR - 0.005, archR - 0.005, 0.14, 14);
  archInGeo.rotateX(Math.PI / 2);
  for (const [x, zs] of [[axFront, 1], [axFront, -1], [axRear, 1], [axRear, -1]]) {
    const z = zs * (W / 2 - 0.18); // sunk slightly inside the body plane
    const t = new THREE.Mesh(tireGeo, lib.tire);
    t.position.set(x, tireOuter, z);
    t.scale.z = 1.3;
    g.add(t);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(x, tireOuter, z - zs * 0.035); // dished inboard of the sidewall
    g.add(hub);
    const liner = new THREE.Mesh(archInGeo, lib.darkInterior);
    liner.position.set(x, bottomY, zs * (W / 2 - 0.33));
    g.add(liner);
  }
  // Bumpers pushed ~0.11m proud of the beveled shell (chrome-less dark
  // plastic) with rub strips + baked license plates front/rear, so the ends
  // stop reading as sheer extrusion cliffs
  const trim = carTrimMats(burned);
  const kit = carKitGeos();
  for (const s of [-1, 1]) {
    // seg-1 chamfer: reads identical to seg-2 at bumper scale, 108 vs 300 tris
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.24, W * 1.02, 1, 0.06), trim.bumper);
    b.position.set(s * (L / 2 + 0.02), 0.49, 0);
    shell.add(b);
    const rub = new THREE.Mesh(kit.unit, trim.strip);
    rub.scale.set(0.02, 0.055, W * 0.99);
    rub.position.set(s * (L / 2 + 0.145), 0.49, 0);
    shell.add(rub);
    const plate = new THREE.Mesh(kit.unit, trim.plate);
    plate.scale.set(0.016, 0.13, 0.36);
    plate.position.set(s * (L / 2 + 0.152), 0.53, 0);
    shell.add(plate);
  }
  // Front fascia: full-width dark grille slot between pale headlight lenses
  const faceX = -(L / 2 + 0.045);
  const grille = new THREE.Mesh(kit.unit, trim.grille);
  grille.scale.set(0.05, 0.14, W * 0.44);
  grille.position.set(faceX, 0.68, 0);
  shell.add(grille);
  for (const s of [-1, 1]) {
    const li = new THREE.Mesh(kit.unit, trim.light);
    li.scale.set(0.05, 0.13, 0.34);
    li.position.set(faceX, 0.7, s * (W / 2 - 0.3));
    shell.add(li);
  }
  // Rear: tail-light blocks at the corners
  const tailY = pickup ? 0.84 : hatch ? 0.72 : 0.74;
  for (const s of [-1, 1]) {
    const tl = new THREE.Mesh(kit.unit, trim.tail);
    tl.scale.set(0.05, pickup ? 0.16 : 0.2, 0.24);
    tl.position.set(L / 2 + 0.05, tailY, s * (W / 2 - 0.28));
    shell.add(tl);
  }
  // Side mirrors: chamfered housings on thin arms at the A-pillar base,
  // reflective face plate on the trailing side
  const mirX = pickup ? -0.85 : hatch ? -0.56 : -0.72;
  const mirY = pickup ? 1.05 : 1.06;
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(kit.unit, trim.strip);
    arm.scale.set(0.034, 0.022, 0.1);
    arm.position.set(mirX, mirY + 0.028, s * (W / 2 + 0.03));
    shell.add(arm);
    const housing = new THREE.Mesh(kit.mirror, trim.bumper);
    housing.position.set(mirX, mirY, s * (W / 2 + 0.115));
    shell.add(housing);
    const face = new THREE.Mesh(kit.mirrorFace, trim.mirror);
    face.position.set(mirX + 0.043, mirY, s * (W / 2 + 0.115));
    shell.add(face);
  }
  // Door-handle-level trim strip down each flank (kept within the door band
  // — the body side is shorter than 1m over the hood/fenders)
  const beltLen = pickup ? L * 0.35 : hatch ? L * 0.5 : L * 0.46;
  const beltX = pickup ? -0.21 : hatch ? 0.35 : 0.1;
  for (const s of [-1, 1]) {
    const belt = new THREE.Mesh(kit.unit, trim.strip);
    belt.scale.set(beltLen, 0.028, 0.02);
    belt.position.set(beltX, 1.0, s * (W / 2 + 0.002));
    shell.add(belt);
  }
  // Seeded roof accessory on ~40% of cars: whip antenna (20%) or roof rack
  // (20%). Both rolls always consume accRng so the mix stays deterministic.
  const accRoll = accRng();
  const accSide = accRng() < 0.5 ? 1 : -1;
  if (accRoll < 0.2) {
    const ax = pickup ? -1.7 : hatch ? -1.35 : -1.72;
    const ay = hatch ? 0.885 : 0.875;
    const whip = new THREE.Mesh(kit.antenna, trim.strip);
    whip.rotation.z = -0.16; // raked back
    whip.position.set(ax, ay, accSide * (W / 2 - 0.22));
    shell.add(whip);
    const abase = new THREE.Mesh(kit.antennaBase, trim.strip);
    abase.position.set(ax, ay + 0.012, accSide * (W / 2 - 0.22));
    shell.add(abase);
  } else if (accRoll < 0.4) {
    const rackLen = pickup ? 0.8 : hatch ? 0.85 : 0.95;
    const rackX = pickup ? 0.03 : hatch ? 0.32 : 0.27;
    const rackY = pickup ? 1.445 : hatch ? 1.52 : 1.545;
    const railZ = W / 2 - 0.33;
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(kit.unit, trim.strip);
      rail.scale.set(rackLen, 0.034, 0.046);
      rail.position.set(rackX, rackY, s * railZ);
      shell.add(rail);
      for (const fx of [-1, 1]) {
        const foot = new THREE.Mesh(kit.unit, trim.strip);
        foot.scale.set(0.032, 0.055, 0.036);
        foot.position.set(rackX + fx * rackLen * 0.38, rackY - 0.035, s * railZ);
        shell.add(foot);
      }
    }
    for (const fx of [-1, 1]) {
      const bar = new THREE.Mesh(kit.unit, trim.strip);
      bar.scale.set(0.032, 0.028, railZ * 2 + 0.05);
      bar.position.set(rackX + fx * rackLen * 0.26, rackY + 0.028, 0);
      shell.add(bar);
    }
  }
  if (burned) {
    // Deflated-corner roll: the shell sags ~3.5° on Z so the nose drops
    // over the front wheel while wheels/underbody stay planted
    shell.rotation.z = 0.061;
    shell.position.y -= 0.02;
    // Ash dusting + open hood feel
    const hood = new THREE.Mesh(new THREE.BoxGeometry(L * 0.3, 0.04, W * 0.8), lib.charred);
    hood.position.set(-1.45, 1.0, 0);
    hood.rotation.z = 0.5;
    shell.add(hood);
    // Shattered glass + rubble scatter under the hulk (sparkly decal)
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.78, W * 1.25), glassGlintMat());
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = rng() * Math.PI;
    glint.position.y = 0.034;
    glint.renderOrder = 4;
    glint.userData.noShadow = true;
    glint.castShadow = false;
    g.add(glint);
  }
  return shadow(g);
}

let _destTex = null;
/** Destination-board decal: dark matrix field with amber blocky glyph hints
 *  that read as a route name without resolving to letters. */
function destBoardTexture() {
  if (_destTex) return _destTex;
  const c = canvas(128, 32);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0e120f';
  ctx.fillRect(0, 0, 128, 32);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 125, 29);
  const r = makeRNG(9944);
  ctx.fillStyle = 'rgba(226, 174, 74, 0.92)';
  ctx.fillRect(10, 12, 8, 9); // route number block
  let gx = 26;
  for (let i = 0; i < 7; i++) {
    const w = 5 + r() * 7;
    if (gx + w > 118) break;
    ctx.fillRect(gx, 12 + r.spread(1.5), w, 9);
    gx += w + 4 + r() * 3;
  }
  _destTex = tex(c, { srgb: true });
  _destTex.wrapS = _destTex.wrapT = THREE.ClampToEdgeWrapping;
  return _destTex;
}

/**
 * Coach bus (hero prop, ~3.8k tris). One extruded side-profile hull with REAL
 * punched window openings (glass planes inset ~4.5 cm behind the pillar
 * plane) and carved wheel arches; car-pattern wheels sunk in dark wells; roof
 * AC hump + hatches; full-length rub-rail trim + darkened skirt panels;
 * detailed front (windshield band, destination board) and rear (window,
 * engine louvres, lights) caps. Burned variant keeps charred materials,
 * blown-out panes, ash ring and glass-glint scatter.
 */
export function buildBus({ burned = true } = {}) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const r = makeRNG(88);
  const hull = burned ? busWreckMat() : lib.metalWhite;
  const trim = carTrimMats(burned);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.7, metalness: 0.5 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: burned ? 0x141210 : 0x1c1a18, roughness: 0.92 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: burned ? 0x211d19 : 0x3e3a34, roughness: 0.88, metalness: 0.15 });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: burned ? 0x2b2521 : 0x7d4636, roughness: burned ? 0.8 : 0.62, metalness: 0.2,
  });
  const acMat = new THREE.MeshStandardMaterial({ color: burned ? 0x2e2a26 : 0xb2aea4, roughness: 0.75, metalness: 0.3 });
  const seatMat = new THREE.MeshStandardMaterial({ color: burned ? 0x141110 : 0x2f3538, roughness: 1 });
  // Intact panes: sooty dark reflective glass on the wreck, sky-gradient
  // tinted glazing on the clean coach.
  const paneMat = burned ? lib.glassDark : carGlass();

  const L = 10.4, W = 2.5;
  const y0 = 0.34;           // skirt bottom
  const yBelt = 1.74;        // window sill line
  const yWinTop = 2.6;       // window head line
  const yRoof = 3.18;        // roof crown
  const axF = -3.15, axR = 2.65, archR = 0.66;

  // Hull: full side silhouette (front/rear roof domes, wheel-arch cutouts)
  // with the window band punched straight through as holes — the remaining
  // wall strips ARE the pillars, and the hole reveals give the glazing real
  // recessed depth instead of surface-taped panes.
  const profile = new THREE.Shape();
  profile.moveTo(-L / 2, y0);
  profile.lineTo(axF - archR, y0);
  profile.absarc(axF, y0, archR, Math.PI, 0, true);
  profile.lineTo(axR - archR, y0);
  profile.absarc(axR, y0, archR, Math.PI, 0, true);
  profile.lineTo(L / 2, y0);
  profile.lineTo(L / 2, yRoof - 0.32);
  profile.quadraticCurveTo(L / 2, yRoof, L / 2 - 0.42, yRoof);
  profile.lineTo(-L / 2 + 0.5, yRoof);
  profile.quadraticCurveTo(-L / 2, yRoof, -L / 2, yRoof - 0.38);
  profile.closePath();
  // Window bays: short driver pane up front, then 7 passenger bays with
  // 12 cm pillars between them.
  const bays = [[-4.8, -4.06]];
  for (let i = 0; i < 7; i++) bays.push([-3.94 + i * 1.24, -3.94 + i * 1.24 + 1.12]);
  for (const [x0, x1] of bays) {
    const h = new THREE.Path();
    h.moveTo(x0, yBelt); h.lineTo(x1, yBelt); h.lineTo(x1, yWinTop); h.lineTo(x0, yWinTop);
    h.closePath();
    profile.holes.push(h);
  }
  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: W - 0.07, bevelEnabled: true, bevelThickness: 0.035,
    bevelSize: 0.035, bevelSegments: 1, curveSegments: 10,
  });
  bodyGeo.translate(0, 0, -(W - 0.07) / 2);
  {
    // Project UVs into side-profile space (u = x, v = y), matching the
    // wreck-skin bake so soot tongues / rust bands land on real panel
    // features. Top faces collapse onto the outline row, which the bake
    // chars deliberately (burned roofline).
    const uv = bodyGeo.attributes.uv, pos = bodyGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    uv.needsUpdate = true;
  }
  g.add(new THREE.Mesh(bodyGeo, hull));
  const faceX = L / 2 + 0.035; // true cap plane after the bevel expansion

  // Recessed glazing: panes 4.5 cm inside the wall plane, some blown out on
  // the wreck so the charred cabin and seat rows read through the openings.
  const paneGeoStd = heightUVs(new THREE.BoxGeometry(1.2, 0.94, 0.025));
  const paneGeoDrv = heightUVs(new THREE.BoxGeometry(0.82, 0.94, 0.025));
  for (const side of [1, -1]) {
    for (const [x0, x1] of bays) {
      if (r.chance(burned ? 0.5 : 0.08)) continue; // blown out
      const pane = new THREE.Mesh(x1 - x0 < 1 ? paneGeoDrv : paneGeoStd, paneMat);
      pane.position.set((x0 + x1) / 2, (yBelt + yWinTop) / 2, side * (W / 2 - 0.055));
      g.add(pane);
    }
  }
  // Cabin: dark volume behind the glass line + seat rows silhouetted in the
  // openings (backs poke past the dark box toward each window band).
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(L - 0.9, yWinTop - 0.9, 1.5), lib.darkInterior);
  cabin.position.set(0, (0.9 + yWinTop) / 2, 0);
  g.add(cabin);
  const seatGeo = new THREE.BoxGeometry(0.24, 0.62, 2.06);
  for (let i = 0; i < 9; i++) {
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(-3.55 + i * 0.92, 1.72, 0);
    if (burned) seat.rotation.z = r.spread(0.14);
    g.add(seat);
  }
  // Underbody fill behind the arch openings
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 0.5, W - 0.6), lib.darkInterior);
  chassis.position.set(0, 0.42, 0);
  g.add(chassis);

  // Wheels (car pattern): rubber torus + baked-hub disc sunk into a
  // shadowed well behind the carved arch lip.
  const tireOuter = 0.57, tube = 0.13, ringR = tireOuter - tube;
  const tireGeo = new THREE.TorusGeometry(ringR, tube, 9, 18);
  const hubGeo = new THREE.CylinderGeometry(ringR - 0.03, ringR - 0.03, 0.22, 16);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = hubcapMat(burned);
  const linerGeo = new THREE.CylinderGeometry(archR - 0.01, archR - 0.01, 0.4, 14);
  linerGeo.rotateX(Math.PI / 2);
  for (const [x, zs] of [[axF, 1], [axF, -1], [axR, 1], [axR, -1]]) {
    const t = new THREE.Mesh(tireGeo, lib.tire);
    t.position.set(x, tireOuter, zs * (W / 2 - 0.2));
    t.scale.z = 1.35;
    g.add(t);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(x, tireOuter, zs * (W / 2 - 0.245)); // dished inboard
    g.add(hub);
    const liner = new THREE.Mesh(linerGeo, lib.darkInterior);
    liner.position.set(x, y0 + 0.1, zs * (W / 2 - 0.42));
    g.add(liner);
  }

  // Skirt panels: darkened band proud of the hull between the arches (the
  // kerb-side front segment is owned by the door).
  const skirtSegs = [
    [-L / 2 + 0.14, axF - archR - 0.06],
    [axF + archR + 0.06, axR - archR - 0.06],
    [axR + archR + 0.06, L / 2 - 0.14],
  ];
  for (const side of [1, -1]) {
    for (const [x0, x1] of skirtSegs) {
      if (side === 1 && x0 < axF) continue; // door bay
      const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.3, 0.03), skirtMat);
      s.position.set((x0 + x1) / 2, y0 + 0.17, side * (W / 2 - 0.005));
      g.add(s);
    }
  }
  // Full-length rub-rail trim line + rubber sill strip under the glazing
  // (kerb side stops at the door frame, as trim does).
  for (const side of [1, -1]) {
    const railLen = side === 1 ? 8.96 : L - 0.12;
    const railX = side === 1 ? 0.6 : 0;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.07, 0.025), stripeMat);
    rail.position.set(railX, 1.24, side * (W / 2 + 0.005));
    g.add(rail);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(railLen - 0.06, 0.045, 0.02), rubberMat);
    sill.position.set(railX, yBelt - 0.045, side * (W / 2 + 0.002));
    g.add(sill);
  }

  // Front door (kerb side, ahead of the front axle): black opening behind a
  // proud surround frame so it reads punched into the hull.
  const doorX = -4.43, doorW = 0.86;
  const opening = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.26, 0.05), lib.darkInterior);
  opening.position.set(doorX, 1.51, W / 2 - 0.01);
  g.add(opening);
  if (!burned) {
    const leaf = new THREE.Mesh(heightUVs(new THREE.BoxGeometry(doorW - 0.1, 1.9, 0.02)), paneMat);
    leaf.position.set(doorX, 1.62, W / 2 + 0.02);
    g.add(leaf);
    const split = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, 0.015), frameMat);
    split.position.set(doorX, 1.62, W / 2 + 0.038);
    g.add(split);
  }
  for (const [fx, fy, sx, sy] of [
    [doorX - doorW / 2 - 0.05, 1.53, 0.1, 2.36],
    [doorX + doorW / 2 + 0.05, 1.53, 0.1, 2.36],
    [doorX, 2.69, doorW + 0.2, 0.1],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.07), frameMat);
    f.position.set(fx, fy, W / 2 + 0.01);
    g.add(f);
  }

  // Front cap: split windshield band recessed behind proud pillars/header,
  // destination board above, lights low on the corners.
  const wsGeo = heightUVs(new THREE.BoxGeometry(0.03, 0.96, 1.05));
  for (const s of [-1, 1]) {
    const pane = new THREE.Mesh(wsGeo, paneMat);
    pane.position.set(-faceX - 0.037, 2.06, s * 0.545);
    g.add(pane);
  }
  if (!burned) {
    // Dark cab behind the 15%-transmission glazing
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.02, 2.34), lib.darkInterior);
    back.position.set(-faceX - 0.011, 2.06, 0);
    g.add(back);
  }
  for (const [fy, fz, sy, sz] of [
    [2.58, 0, 0.12, W * 0.96],      // header (laps the pane top edge)
    [1.52, 0, 0.16, W * 0.96],      // sill panel (laps the pane bottom)
    [2.06, 0, 1.0, 0.09],           // centre divider
    [2.06, W * 0.44, 1.24, 0.14],   // A-pillars
    [2.06, -W * 0.44, 1.24, 0.14],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, sy, sz), frameMat);
    f.position.set(-faceX - 0.055, fy, fz);
    g.add(f);
  }
  for (const s of [-1, 1]) { // parked wipers
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.5, 0.02), frameMat);
    wiper.position.set(-faceX - 0.056, 1.78, s * 0.5);
    wiper.rotation.x = s * 0.9;
    g.add(wiper);
  }
  const boardBack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 1.98), frameMat);
  boardBack.position.set(-faceX - 0.015, 2.78, 0);
  g.add(boardBack);
  const boardMat = burned ? lib.charred : new THREE.MeshStandardMaterial({
    map: destBoardTexture(), roughness: 0.4,
    emissive: 0xffffff, emissiveMap: destBoardTexture(), emissiveIntensity: 0.3,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 1.9), boardMat);
  board.position.set(-faceX - 0.055, 2.78, 0);
  g.add(board);
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.34), trim.light);
    hl.position.set(-faceX - 0.025, 0.82, s * (W / 2 - 0.34));
    g.add(hl);
  }

  // Rear cap: high window, engine louvres, tail-light stacks, plate.
  const rw = new THREE.Mesh(heightUVs(new THREE.BoxGeometry(0.03, 0.62, 1.75)), paneMat);
  rw.position.set(faceX + 0.027, 2.24, 0);
  g.add(rw);
  if (!burned) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.66, 1.8), lib.darkInterior);
    back.position.set(faceX + 0.005, 2.24, 0);
    g.add(back);
  }
  for (const [fy, fz, sy, sz] of [
    [2.58, 0, 0.12, 1.95], [1.9, 0, 0.12, 1.95],
    [2.24, 0.92, 0.88, 0.12], [2.24, -0.92, 0.88, 0.12],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, sy, sz), frameMat);
    f.position.set(faceX + 0.045, fy, fz);
    g.add(f);
  }
  for (let i = 0; i < 4; i++) {
    const lo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 1.5), frameMat);
    lo.position.set(faceX + 0.012, 1.06 + i * 0.15, 0);
    g.add(lo);
  }
  for (const s of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.16), trim.tail);
    tl.position.set(faceX + 0.02, 1.06, s * (W / 2 - 0.24));
    g.add(tl);
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.16), trim.light);
    rev.position.set(faceX + 0.02, 0.78, s * (W / 2 - 0.24));
    g.add(rev);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.13, 0.36), trim.plate);
  plate.position.set(faceX + 0.012, 0.86, 0);
  g.add(plate);
  // Bumpers front + rear
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.34, W * 1.02, 1, 0.05), trim.bumper);
    b.position.set(s * (L / 2 + 0.06), 0.52, 0);
    g.add(b);
  }

  // Roof gear: AC hump with side vent grilles, two escape hatches (one
  // blown open on the wreck), aft vent dome.
  const roofY = yRoof + 0.035;
  const hump = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.26, 1.72, 1, 0.09), acMat);
  hump.position.set(0.9, roofY + 0.1, 0);
  g.add(hump);
  for (const s of [-1, 1]) {
    const vents = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.03), frameMat);
    vents.position.set(0.9, roofY + 0.1, s * 0.86);
    g.add(vents);
  }
  const hatchGeo = new THREE.BoxGeometry(0.72, 0.06, 0.66);
  for (const [hx, blown] of [[-2.9, burned], [-1.2, false]]) {
    const hatch = new THREE.Mesh(hatchGeo, frameMat);
    hatch.position.set(hx, roofY + (blown ? 0.17 : 0.03), 0);
    if (blown) hatch.rotation.z = 0.55;
    g.add(hatch);
  }
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 10), frameMat);
  vent.position.set(3.4, roofY + 0.05, 0.5);
  g.add(vent);

  if (burned) {
    // Ash ring + shattered-glass scatter around the hulk
    const ashes = new THREE.Mesh(
      new THREE.CircleGeometry(L * 0.62, 22),
      new THREE.MeshStandardMaterial({ color: 0x17150f, roughness: 1, transparent: true, opacity: 0.72 })
    );
    ashes.rotation.x = -Math.PI / 2;
    ashes.position.y = 0.03;
    ashes.scale.y = 0.42;
    ashes.userData.noShadow = true;
    ashes.castShadow = false;
    g.add(ashes);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.8, W * 1.5), glassGlintMat());
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = r() * Math.PI;
    glint.position.y = 0.034;
    glint.renderOrder = 4;
    glint.userData.noShadow = true;
    glint.castShadow = false;
    g.add(glint);
  }
  addContactShadow(g, L * 1.15, W * 1.9, 0.55);
  g.rotation.y = 0.35;
  return shadow(g);
}

/* ------------------------------- barriers etc ------------------------------ */

let _barrierMats = null;
/** Weathered jersey-barrier materials, baked once as 2 alternating variants
 *  (9 barriers on the map — clones sitting side by side would tell).
 *  Painted in run/height space (u = along the 3m run, v = height 0..0.82):
 *  pour mottle + aggregate speckle over the concrete tone, a form-line seam
 *  at the y=0.28 profile kink, dirt splash climbing ~20cm off the road,
 *  vertical rain streaking, chipped arris highlights along the top chamfer
 *  (the top face samples the last texel rows), scupper shadows at the feet
 *  and the occasional rust weep / tar splash. Concrete, not ruins — every
 *  layer stays low-alpha. */
function jerseyBarrierMats() {
  if (_barrierMats) return _barrierMats;
  const lib = getMaterialLib();
  _barrierMats = [];
  for (let vi = 0; vi < 2; vi++) {
    const W = 768, H = 192;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = makeRNG(7211 + vi * 977);
    const seamY = Math.round(H * (1 - 0.28 / 0.82)); // form kink height
    // Base + pour mottle
    ctx.fillStyle = 'rgb(138,132,120)';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const x = r() * W, y = r() * H, rad = 30 + r() * 90;
      const lite = r.chance(0.5);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, lite ? `rgba(158,152,139,${0.2 + r() * 0.24})` : `rgba(110,104,93,${0.15 + r() * 0.2})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Aggregate speckle (fine grain that survives the first mip or two)
    for (let i = 0; i < 640; i++) {
      const lite = r.chance(0.48);
      ctx.fillStyle = `rgba(${lite ? '170,164,151' : '92,86,76'},${0.1 + r() * 0.2})`;
      ctx.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r());
    }
    // Form-line seam: jittered dark score with a pale sun-catch beneath
    ctx.fillStyle = 'rgba(58,53,46,0.4)';
    for (let x = 0; x < W; x += 16) {
      ctx.fillRect(x, seamY + Math.round(r.spread(0.8)), 16, 1.6);
    }
    ctx.fillStyle = 'rgba(178,172,158,0.22)';
    ctx.fillRect(0, seamY + 2, W, 1);
    // Form-tie divots in two courses above the seam (faint)
    for (const ty of [seamY - 34, seamY - 66]) {
      for (let i = 0; i < 4; i++) {
        const x = W * (0.11 + i * 0.26) + r.spread(10);
        ctx.fillStyle = 'rgba(70,64,55,0.22)';
        ctx.beginPath(); ctx.arc(x, ty + r.spread(3), 2, 0, 7); ctx.fill();
      }
    }
    // Rain streaks: dark run-off + a few pale lime leaches, seeded at the
    // top edge and at the seam ledge where water collects
    for (let i = 0; i < 30; i++) {
      const x = r() * W;
      const fromSeam = r.chance(0.35);
      const y0 = fromSeam ? seamY + 2 : 4 + r() * 8;
      const ln = (0.16 + r() * 0.5) * H;
      const w = 1 + r() * 2;
      const pale = r.chance(0.25);
      const col = pale ? '190,184,170' : '62,56,48';
      const a = pale ? 0.1 + r() * 0.08 : 0.05 + r() * 0.09;
      const gg = ctx.createLinearGradient(0, y0, 0, y0 + ln);
      gg.addColorStop(0, `rgba(${col},${a})`);
      gg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gg;
      ctx.fillRect(x, y0, w, ln);
    }
    // Dirt splash climbing off the road (~20cm) with a blotchy upper edge
    const dirtTop = H * 0.7;
    const dg = ctx.createLinearGradient(0, dirtTop, 0, H);
    dg.addColorStop(0, 'rgba(88,74,56,0)');
    dg.addColorStop(0.55, 'rgba(86,72,54,0.26)');
    dg.addColorStop(1, 'rgba(78,64,48,0.5)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, dirtTop, W, H - dirtTop);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = dirtTop + r() * (H - dirtTop) * 0.55, rad = 6 + r() * 15;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, `rgba(84,70,52,${0.14 + r() * 0.18})`);
      gg.addColorStop(1, 'rgba(84,70,52,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 120; i++) { // splash speckle
      ctx.fillStyle = `rgba(${r.chance(0.5) ? '96,80,60' : '70,58,44'},${0.16 + r() * 0.22})`;
      ctx.fillRect(r() * W, dirtTop + Math.pow(r(), 1.6) * (H - dirtTop), 1 + r() * 1.8, 1 + r());
    }
    // Scupper shadows at the feet (drain slots at the base of real units)
    for (const sx of [0.22, 0.74]) {
      const x = W * sx + r.spread(14), sw = 34 + r() * 10;
      const gg = ctx.createLinearGradient(0, H - 13, 0, H);
      gg.addColorStop(0, 'rgba(24,21,18,0)');
      gg.addColorStop(0.45, 'rgba(24,21,18,0.5)');
      gg.addColorStop(1, 'rgba(24,21,18,0.62)');
      ctx.fillStyle = gg;
      ctx.fillRect(x, H - 13, sw, 13);
    }
    // Top chamfer: sun-bleached strip + chipped arris nicks (top face
    // collapses onto the last rows, so these straddle the edge)
    const tg = ctx.createLinearGradient(0, 0, 0, 12);
    tg.addColorStop(0, 'rgba(196,190,175,0.34)');
    tg.addColorStop(1, 'rgba(196,190,175,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 12);
    for (let i = 0; i < 11; i++) {
      const x = r() * W, cw = 3 + r() * 7;
      ctx.fillStyle = `rgba(186,180,165,${0.5 + r() * 0.3})`;
      ctx.fillRect(x, 1 + r() * 4, cw, 2.5 + r() * 3);
      ctx.fillStyle = 'rgba(52,47,40,0.4)';
      ctx.fillRect(x - 0.5, 5 + r() * 4, cw + 1, 1.6);
    }
    // Two deeper spalls: pale bite with a shadowed underlip
    for (let i = 0; i < 2; i++) {
      const x = W * (0.15 + r() * 0.7), sw = 9 + r() * 9;
      ctx.fillStyle = 'rgba(174,168,152,0.7)';
      ctx.beginPath();
      ctx.moveTo(x, 1); ctx.lineTo(x + sw, 1);
      ctx.lineTo(x + sw * 0.62, 9 + r() * 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(48,43,37,0.42)';
      ctx.fillRect(x + 1, 8 + r() * 5, sw * 0.6, 1.8);
    }
    // Occasional rust weep off rebar + one tar splash near the base
    for (let i = 0; i < 2; i++) {
      const x = r() * W, y0 = r.chance(0.5) ? 6 : seamY + 2;
      const ln = 20 + r() * 46;
      ctx.fillStyle = `rgba(122,70,34,${0.4 + r() * 0.2})`;
      ctx.beginPath(); ctx.arc(x + 1, y0 + 2, 2.2, 0, 7); ctx.fill();
      const gg = ctx.createLinearGradient(0, y0, 0, y0 + ln);
      gg.addColorStop(0, 'rgba(116,66,32,0.34)');
      gg.addColorStop(1, 'rgba(108,62,30,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x, y0, 2.2, ln);
    }
    {
      const x = r() * W * 0.9 + W * 0.05, y = H - 8 - r() * 10;
      for (let i = 0; i < 3; i++) {
        const rad = 7 + r() * 9;
        const gg = ctx.createRadialGradient(x + r.spread(9), y + r.spread(4), 0, x, y, rad);
        gg.addColorStop(0, `rgba(30,26,22,${0.28 + r() * 0.16})`);
        gg.addColorStop(1, 'rgba(30,26,22,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(x - rad * 2, y - rad * 2, rad * 4, rad * 4);
      }
    }
    const t = tex(c, { srgb: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    // Reuse the concrete micro normal, tiled ~0.85m in u so grain density
    // matches the walls (three r166 keeps per-map transforms independent)
    const nrm = new THREE.CanvasTexture(lib.concreteDark.normalMap.image);
    nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
    nrm.repeat.set(3.5, 0.95);
    nrm.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({
      map: t, normalMap: nrm, roughness: 0.94, metalness: 0, envMapIntensity: 0.5,
    });
    m.normalScale.set(0.85, 0.85);
    _barrierMats.push(m);
  }
  return _barrierMats;
}

let _barrierCount = 0;
export function buildJerseyBarrier(len = 3) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0); shape.lineTo(0.34, 0);
  shape.lineTo(0.22, 0.28); shape.lineTo(0.12, 0.82);
  shape.lineTo(-0.12, 0.82); shape.lineTo(-0.22, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  // Remap UVs into run/height space so the weathering bake lands upright:
  // sloped flanks map u=along the run / v=height, the top face collapses
  // onto the chip-strip rows, and the end caps sample a mid-run column so
  // they pick up the same dirt band and streaking.
  geo.computeBoundingBox();
  const x0 = geo.boundingBox.min.x;
  const spanX = geo.boundingBox.max.x - x0;
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(nor.getX(i)) > 0.9) {
      uv.setXY(i, 0.5 + pos.getZ(i) * 0.8, pos.getY(i) / 0.82);
    } else if (nor.getY(i) > 0.9) {
      uv.setXY(i, (pos.getX(i) - x0) / spanX, 0.985);
    } else {
      uv.setXY(i, (pos.getX(i) - x0) / spanX, pos.getY(i) / 0.82);
    }
  }
  uv.needsUpdate = true;
  const mats = jerseyBarrierMats();
  const m = new THREE.Mesh(geo, mats[_barrierCount++ % mats.length]);
  const g = new THREE.Group();
  g.add(m);
  return shadow(g);
}

let _bagAlbedos = null;
/** lib.sandbag burlap re-baked into 3 mottled variants. The 1cm weave mips
 *  away past ~4m, so everything here is bag-scale: a crevice AO wrap (u
 *  runs the girth; after the rotateZ bake u=0.75 faces world -Y) that is
 *  wider and much deeper than round 7's, contact AO at both cinched ends
 *  (v runs the bag axis), faint side-contact bands where neighbours press
 *  in, and large dirt/bleach blotches that survive minification at the
 *  vista's 10m viewing distance. */
function sandbagAlbedos() {
  if (_bagAlbedos) return _bagAlbedos;
  const src = getMaterialLib().sandbag.map.image;
  const r = makeRNG(9313);
  _bagAlbedos = [];
  for (let vi = 0; vi < 3; vi++) {
    const c = canvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const W = c.width, H = c.height;
    // Girth AO: clean crown at u=0.25 (+Y), heavy shade through the
    // underside, matched alpha at u=0/1 so the wrap seam stays invisible
    const band = ctx.createLinearGradient(0, 0, W, 0);
    band.addColorStop(0, 'rgba(40,31,18,0.18)');
    band.addColorStop(0.1, 'rgba(40,31,18,0.02)');
    band.addColorStop(0.27, 'rgba(40,31,18,0)');
    band.addColorStop(0.45, 'rgba(40,31,18,0.08)');
    band.addColorStop(0.58, 'rgba(40,31,18,0.34)');
    band.addColorStop(0.75, 'rgba(38,29,17,0.62)');
    band.addColorStop(0.9, 'rgba(40,31,18,0.26)');
    band.addColorStop(1, 'rgba(40,31,18,0.18)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, H);
    // End AO: bags butt end-to-end along the row, so both tips shade
    const ends = ctx.createLinearGradient(0, 0, 0, H);
    ends.addColorStop(0, 'rgba(36,28,16,0.44)');
    ends.addColorStop(0.09, 'rgba(36,28,16,0)');
    ends.addColorStop(0.91, 'rgba(36,28,16,0)');
    ends.addColorStop(1, 'rgba(36,28,16,0.44)');
    ctx.fillStyle = ends;
    ctx.fillRect(0, 0, W, H);
    // Bag-scale dirt / sun-bleach mottle (drawn with wrap copies in u so
    // no blotch hard-cuts at the girth seam)
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = r() * H, rad = W * (0.1 + r() * 0.17);
      const dark = r.chance(0.6);
      const col = dark ? '76,58,34' : '212,194,154';
      const a = dark ? 0.15 + r() * 0.19 : 0.12 + r() * 0.13;
      for (const ox of [-W, 0, W]) {
        const g2 = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
        g2.addColorStop(0, `rgba(${col},${a})`);
        g2.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g2;
        ctx.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
      }
    }
    _bagAlbedos.push(tex(c, { srgb: true }));
  }
  return _bagAlbedos;
}

let _bagGeoVariants = null;
/** 4 lumpy bag geometries shared by every wall (bags appear ~100x). A
 *  higher-seg capsule displaced by low-frequency harmonics so each bag
 *  reads as a slumped burlap sack instead of a smooth pill: fill lumps,
 *  end droop, a sideways belly spread, and a cinched tied-off nub baked
 *  into one end (alternating ends across variants). */
function sandbagGeos() {
  if (_bagGeoVariants) return _bagGeoVariants;
  _bagGeoVariants = [];
  for (let vi = 0; vi < 4; vi++) {
    const r = makeRNG(4700 + vi * 131);
    const geo = new THREE.CapsuleGeometry(0.14, 0.3, 6, 14);
    const pos = geo.attributes.position;
    const tip = 0.29; // half length along the pre-rotation +Y axis
    const cinch = vi % 2 ? 1 : -1;
    const lumps = [];
    for (let k = 0; k < 3; k++) {
      lumps.push({
        m: r.int(1, 3), n: k + 1,
        p: r() * Math.PI * 2, q: r() * Math.PI * 2,
        a: (0.075 - k * 0.02) * (0.7 + r() * 0.6),
      });
    }
    const pk = r() * Math.PI * 2;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = Math.max(-1, Math.min(1, y / tip));
      const ang = Math.atan2(z, x);
      const rad = Math.hypot(x, z);
      let k = 1;
      for (const L of lumps) {
        k += L.a * Math.sin(ang * L.m + L.p) * Math.sin((t * 0.5 + 0.5) * Math.PI * L.n + L.q);
      }
      // Cinched end: neck taper + radial pucker + a short knot nub
      const ce = t * cinch;
      if (ce > 0.6) {
        const s = (ce - 0.6) / 0.4;
        k *= 1 - 0.48 * s * s;
        k *= 1 + 0.13 * s * Math.sin(ang * 6 + pk);
        y += cinch * s * s * 0.035;
      }
      k = Math.max(0.78, Math.min(1.24, k));
      pos.setXYZ(i, Math.cos(ang) * rad * k, y, Math.sin(ang) * rad * k);
    }
    geo.rotateZ(Math.PI / 2);   // axis -> world X (u=0.75 faces -Y)
    geo.scale(1, 0.7, 1.15);    // drooped sack proportions
    // Settle pass in final space: ends sag, belly spreads under the fill
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = Math.max(-1, Math.min(1, x / tip));
      const belly = y < 0 ? 1 + Math.min(1, -y / 0.1) * 0.12 : 1;
      pos.setXYZ(i, x, y - t * t * 0.018, z * belly);
    }
    geo.computeVertexNormals();
    _bagGeoVariants.push(geo);
  }
  return _bagGeoVariants;
}

let _bagMatPool = null;
/** Shared per-bag material pool. Round 7 set the HSL lightness to 0.88
 *  (+-0.105) — near-WHITE, which rendered the pile as pale loaves no
 *  matter what the burlap map held. Dropped to a dusty-tan 0.55-0.72,
 *  stratified across the pool so neighbouring bags always carry a real
 *  value step, over the 3 mottled albedo variants. A normal-space dust
 *  wash keeps upward faces sun-bleached against the darker flanks. */
function sandbagMats() {
  if (_bagMatPool) return _bagMatPool;
  const lib = getMaterialLib();
  const albs = sandbagAlbedos();
  const r = makeRNG(6127);
  _bagMatPool = [];
  for (let i = 0; i < 10; i++) {
    const m = lib.sandbag.clone();
    m.map = albs[i % albs.length];
    // One faded-olive bag per ~10 (surplus military bags mixed into the
    // tan pile); the rest dusty khaki-tan, stratified 0.56-0.74
    m.color = i === 6
      ? new THREE.Color().setHSL(0.155, 0.16, 0.52)
      : new THREE.Color().setHSL(
        0.092 + r.spread(0.018), 0.27 + r.spread(0.06), 0.56 + (i / 9) * 0.18 + r.spread(0.015));
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBagN;')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvBagN = normalize(mat3(modelMatrix) * objectNormal);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBagN;')
        .replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.67, 0.5), smoothstep(0.38, 0.95, vBagN.y) * 0.38);`);
    };
    _bagMatPool.push(m);
  }
  return _bagMatPool;
}

let _bagCreviceMat = null;
/** Near-black filler for the reentrant groove between bag courses: reads
 *  as the deep contact shadow the capsules can't self-shadow into. */
function bagCreviceMat() {
  if (!_bagCreviceMat) {
    _bagCreviceMat = new THREE.MeshStandardMaterial({ color: 0x18130b, roughness: 1 });
  }
  return _bagCreviceMat;
}

let _spillMat = null;
/** Sand-spill skirt decal at the base of sandbag walls. */
function sandSpillMat() {
  if (_spillMat) return _spillMat;
  const c = canvas(256, 128);
  const ctx = c.getContext('2d');
  const r = makeRNG(5150);
  // Overlapping soft lobes along the wall line
  for (let i = 0; i < 9; i++) {
    const x = 24 + (i / 8) * 208 + r.spread(8);
    const y = 56 + r.spread(14);
    const rad = 26 + r() * 22;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g2.addColorStop(0, 'rgba(201, 178, 138, 0.5)');
    g2.addColorStop(0.6, 'rgba(196, 172, 130, 0.28)');
    g2.addColorStop(1, 'rgba(196, 172, 130, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Spilled grains
  for (let i = 0; i < 240; i++) {
    const x = r() * 256, y = 30 + r() * 68;
    ctx.fillStyle = `rgba(${r.chance(0.35) ? '148, 124, 88' : '214, 192, 150'}, ${0.25 + r() * 0.4})`;
    ctx.fillRect(x, y, 1 + r() * 1.6, 1 + r());
  }
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  _spillMat = new THREE.MeshStandardMaterial({
    map: t, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
  });
  return _spillMat;
}

export function buildSandbagWall(rows = 4, cols = 5) {
  const g = new THREE.Group();
  const geos = sandbagGeos();
  const mats = sandbagMats();
  const r = makeRNG(rows * 100 + cols);
  const pickMat = () => mats[r.int(0, mats.length - 1)];
  const pickGeo = () => geos[r.int(0, geos.length - 1)];
  for (let y = 0; y < rows; y++) {
    const n = cols - (y % 2 ? 1 : 0);
    // Bottom rows squash harder under the load and bulge sideways
    const squash = rows <= 1 ? 1 : 0.84 + 0.16 * (y / (rows - 1));
    const top = y === rows - 1;
    for (let i = 0; i < n; i++) {
      const bag = new THREE.Mesh(pickGeo(), pickMat());
      // Top-row bags slump hard — nothing pressing them into shape
      const flat = top ? 0.76 + r() * 0.09 : 1;
      const s = 1 + r.spread(0.1); // ±10% overall bag size
      const sag = top ? r.spread(0.035) - 0.024 : 0;
      bag.scale.set(
        s * (1 + (1 - squash) * 0.8) * (1 + (1 - flat) * 0.7),
        s * squash * flat,
        s * (1 + (1 - squash) * 0.9) * (1 + (1 - flat) * 0.5)
      );
      bag.position.set(
        (i - n / 2 + 0.5) * 0.56 + r.spread(0.04),
        0.105 * squash * flat * s + y * 0.172 + sag,
        r.spread(0.05)
      );
      bag.rotation.y = r.spread(0.21); // yaw ±12°
      bag.rotation.x = r.spread(0.07);
      if (top) bag.rotation.z = r.spread(0.08); // slumped bags roll a touch
      g.add(bag);
    }
  }
  // Shadow-gap strips recessed into the groove between courses: the dark
  // horizontal seams are what make the pile read as stacked bags at 10m
  const slabLen = Math.max(0.6, (cols - 2) * 0.56 + 0.24);
  for (let y = 1; y < rows; y++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabLen, 0.05, 0.22), bagCreviceMat());
    slab.position.set(0, y * 0.172 + 0.002, 0);
    slab.userData.noShadow = true;
    slab.castShadow = false;
    g.add(slab);
  }
  // 2-3 loose bags dropped on the ground beside the wall
  const hl = cols * 0.56 / 2;
  const nLoose = r.int(2, 3);
  for (let i = 0; i < nLoose; i++) {
    const bag = new THREE.Mesh(pickGeo(), pickMat());
    const s = 1 + r.spread(0.1);
    bag.scale.set(s * 1.08, s * 0.55, s * 1.12); // slumped flat on the ground
    if (i < 2) bag.position.set((i === 0 ? -1 : 1) * (hl + 0.25 + r() * 0.3), 0.075 * s, r.spread(0.4));
    else bag.position.set(r.spread(hl * 0.7), 0.075 * s, 0.55 + r() * 0.3);
    bag.rotation.y = r() * Math.PI;
    bag.rotation.z = r.spread(0.1);
    g.add(bag);
  }
  // Sand-spill skirt bleeding out from the wall base
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(cols * 0.56 + 1.1, 1.6), sandSpillMat());
  spill.rotation.x = -Math.PI / 2;
  spill.position.y = 0.03;
  spill.renderOrder = 4;
  spill.userData.noShadow = true;
  spill.castShadow = false;
  spill.receiveShadow = true;
  g.add(spill);
  addContactShadow(g, cols * 0.56 + 0.6, 1.1, 0.4);
  return shadow(g);
}

export function buildBarrel({ color = 0x5a6a52, rusty = true } = {}) {
  const g = new THREE.Group();
  const r = makeRNG(color);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.6 });
  if (rusty) mat.color.lerp(new THREE.Color(0x7a4a2c), 0.25 + r() * 0.3);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), mat);
  body.position.y = 0.45;
  g.add(body);
  for (const y of [0.18, 0.45, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 20), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  addContactShadow(g, 1.1, 1.1, 0.5);
  return shadow(g);
}

export function buildTireStack(n = 3) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const geo = new THREE.TorusGeometry(0.33, 0.13, 10, 20);
  geo.rotateX(Math.PI / 2);
  const r = makeRNG(n * 17);
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(geo, lib.tire);
    t.position.set(r.spread(0.05), 0.13 + i * 0.25, r.spread(0.05));
    t.rotation.y = r() * Math.PI;
    g.add(t);
  }
  addContactShadow(g, 1.35, 1.35, 0.44);
  return shadow(g);
}

export function buildCrate(size = 0.8) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), lib.wood);
  box.position.y = size / 2;
  g.add(box);
  // Edge frames
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a4c30, roughness: 0.9 });
  const t = size * 0.07;
  for (const [x, y, z, sx, sy, sz] of [
    [0, size - t / 2, size / 2 - t / 2, size, t, t], [0, size - t / 2, -size / 2 + t / 2, size, t, t],
    [0, t / 2, size / 2 - t / 2, size, t, t], [0, t / 2, -size / 2 + t / 2, size, t, t],
    [size / 2 - t / 2, size / 2, size / 2 - t / 2, t, size, t], [-size / 2 + t / 2, size / 2, size / 2 - t / 2, t, size, t],
    [size / 2 - t / 2, size / 2, -size / 2 + t / 2, t, size, t], [-size / 2 + t / 2, size / 2, -size / 2 + t / 2, t, size, t],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
    f.position.set(x, y, z);
    g.add(f);
  }
  addContactShadow(g, size * 1.7, size * 1.7, 0.4);
  return shadow(g);
}

/* ------------------------------ street furniture --------------------------- */

export function buildPowerPole(height = 8) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4a36, roughness: 0.95 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, height, 10), woodMat);
  pole.position.y = height / 2;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.09), woodMat);
  arm.position.y = height - 0.5;
  g.add(arm);
  const insMat = new THREE.MeshStandardMaterial({ color: 0x354a42, roughness: 0.3 });
  for (const x of [-0.7, 0, 0.7]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), insMat);
    ins.position.set(x, height - 0.4, 0);
    g.add(ins);
  }
  return shadow(g);
}

/** Sagging wire between two world points. */
export function buildWire(a, b, sag = 0.8) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const geo = new THREE.TubeGeometry(curve, 14, 0.014, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

let _lampMats = null;
function streetLightMats() {
  if (!_lampMats) {
    _lampMats = {
      // Weathered galvanized grey — metalness 0.4 / roughness 0.6 catches a
      // sky gradient instead of collapsing to a black silhouette
      pole: new THREE.MeshStandardMaterial({ color: 0x60666b, roughness: 0.6, metalness: 0.4, envMapIntensity: 1.1 }),
      lens: new THREE.MeshStandardMaterial({ color: 0xd9d4c2, roughness: 0.35, metalness: 0.1 }),
    };
  }
  return _lampMats;
}

export function buildStreetLight(height = 6.4) {
  const g = new THREE.Group();
  const { pole: mat, lens: lensMat } = streetLightMats();
  // Tapered column over a base collar, not a constant-radius tube
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, height, 12), mat);
  pole.position.y = height / 2;
  g.add(pole);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.42, 12), mat);
  collar.position.y = 0.21;
  g.add(collar);
  const armCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(0.7, height + 0.35, 0),
    new THREE.Vector3(1.5, height + 0.2, 0)
  );
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 10, 0.05, 8), mat);
  g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.24), mat);
  head.position.set(1.55, height + 0.16, 0);
  g.add(head);
  // Pale lens plate on the underside of the head
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.17), lensMat);
  lens.position.set(1.58, height + 0.09, 0);
  g.add(lens);
  return shadow(g);
}

export function buildDumpster() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.15, 1.1, 2, 0.05), lib.metalGreen);
  body.position.y = 0.68;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.06, 1.14), lib.metalGreen);
  lid.position.set(0, 1.28, -0.1);
  lid.rotation.x = -0.35;
  g.add(lid);
  // Pressed side ribs + dark lift pockets so it doesn't read as a flat box
  for (const i of [-1, 0, 1]) {
    for (const s of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.92, 0.06), lib.metalGreen);
      rib.position.set(i * 0.62, 0.66, s * 0.56);
      g.add(rib);
    }
  }
  const pocketMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.1), pocketMat);
    pocket.position.set(s * 0.72, 0.42, 0.53);
    g.add(pocket);
  }
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), lib.tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.8, 0.09, 0.4);
    g.add(wheel);
  }
  addContactShadow(g, 2.5, 1.6, 0.42);
  return shadow(g);
}

/* --------------------------------- market ---------------------------------- */

let _fruitGeo = null, _fruitMats = null;
/** 4 produce families × 3 hue/value-jittered variants, shared by all stalls. */
function fruitMaterials() {
  if (_fruitMats) return _fruitMats;
  const r = makeRNG(9182);
  _fruitGeo = new THREE.SphereGeometry(0.05, 8, 6);
  _fruitMats = [0xa8432a, 0xc27e2f, 0xb9a13c, 0x74883e].map((baseHex) => {
    const fam = [];
    for (let i = 0; i < 3; i++) {
      const col = new THREE.Color(baseHex);
      col.offsetHSL(r.spread(0.02), r.spread(0.08), r.spread(0.05));
      fam.push(new THREE.MeshStandardMaterial({ color: col, roughness: 0.62 }));
    }
    return fam;
  });
  return _fruitMats;
}

function stripeTexture(c1 = '#a03428', c2 = '#d8cfc0') {
  const c = canvas(128, 128);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.fillRect(i * 16, 0, 16, 128);
  }
  return tex(c, { srgb: true, repeat: [2, 1] });
}

export function buildMarketStall(seed = 1) {
  const lib = getMaterialLib();
  const r = makeRNG(seed * 31 + 7);
  const g = new THREE.Group();
  // Dark scorched lumber — stalls must not read self-lit at dusk
  const postMat = new THREE.MeshStandardMaterial({ color: 0x54402c, roughness: 0.9 });
  const W = 3, D = 2, H = 2.3;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H, 8), postMat);
    post.position.set(x, H / 2, z);
    g.add(post);
  }
  // Canopy
  const colors = [['#a03428', '#d8cfc0'], ['#3c5a50', '#d8cfc0'], ['#8a6a28', '#d0c4ae']];
  const [c1, c2] = colors[Math.floor(r() * colors.length)];
  const canopyMat = new THREE.MeshStandardMaterial({ map: stripeTexture(c1, c2), roughness: 0.9, side: THREE.DoubleSide });
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, D + 0.5, 6, 2), canopyMat);
  // gentle sag
  const posAttr = canopy.geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    posAttr.setZ(i, -Math.cos((x / (W + 0.4)) * Math.PI) * 0.12);
  }
  canopy.geometry.computeVertexNormals();
  canopy.rotation.x = -Math.PI / 2 + 0.12;
  canopy.position.y = H + 0.05;
  g.add(canopy);
  // Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 0.08, D * 0.7), lib.woodStall);
  table.position.y = 0.85;
  g.add(table);
  for (const [x, z] of [[-W * 0.36, -D * 0.28], [W * 0.36, -D * 0.28], [-W * 0.36, D * 0.28], [W * 0.36, D * 0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.07), postMat);
    leg.position.set(x, 0.42, z);
    g.add(leg);
  }
  // Clutter: slatted produce crates, fruit nestled inside with per-fruit
  // hue jitter (module-level material pool — no per-stall bakes)
  const pool = fruitMaterials();
  for (let i = 0; i < 4; i++) {
    const crate = new THREE.Group();
    crate.position.set(r.spread(W * 0.32), 0.89, r.spread(D * 0.24));
    crate.rotation.y = r.spread(0.4);
    g.add(crate);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.34), lib.woodStall);
    base.position.y = 0.02;
    crate.add(base);
    for (const [wx, wz, sx, sz] of [
      [0, 0.17, 0.46, 0.025], [0, -0.17, 0.46, 0.025],
      [0.23, 0, 0.025, 0.34], [-0.23, 0, 0.025, 0.34],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.13, sz), lib.woodStall);
      wall.position.set(wx, 0.08, wz);
      crate.add(wall);
    }
    const fam = pool[(i + seed) % pool.length];
    for (let f = 0; f < 6; f++) {
      const fs = 0.85 + r() * 0.3;
      const fr = new THREE.Mesh(_fruitGeo, fam[r.int(0, fam.length - 1)]);
      fr.scale.set(fs, fs * 0.92, fs);
      fr.position.set(
        ((f % 3) - 1) * 0.125 + r.spread(0.02),
        0.1 + r.spread(0.012),
        (f < 3 ? -0.07 : 0.07) + r.spread(0.02)
      );
      crate.add(fr);
    }
  }
  addContactShadow(g, W * 0.95, D * 0.85, 0.3);
  return shadow(g);
}

/* --------------------------------- rubble ---------------------------------- */

export function buildRubblePile(radius = 2.4, height = 1.1, seed = 5) {
  const lib = getMaterialLib();
  const r = makeRNG(seed * 97);
  const g = new THREE.Group();
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  const n = Math.floor(radius * 10);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(chunkGeo, lib.rubble);
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * radius;
    const s = 0.14 + r() * 0.45 * (1 - rr / radius * 0.5);
    c.scale.set(s * (0.7 + r() * 0.7), s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.7));
    c.position.set(Math.cos(a) * rr, Math.max(0.03, (1 - rr / radius) * height * r()), Math.sin(a) * rr);
    c.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
    g.add(c);
  }
  // Rebar
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.7, metalness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3 + r(), 6), rebarMat);
    bar.position.set(r.spread(radius * 0.6), 0.5, r.spread(radius * 0.6));
    bar.rotation.set(r.spread(1.2), r() * Math.PI, r.spread(1.2));
    g.add(bar);
  }
  addContactShadow(g, radius * 2.1, radius * 2.1, 0.38, 0.05);
  return shadow(g);
}

/* ------------------------------ roof clutter ------------------------------- */

export function buildWaterTank() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 14), lib.metalWhite);
  tank.position.y = 1.15;
  g.add(tank);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lib.metalWhite);
  cap.position.y = 1.8;
  g.add(cap);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.7 });
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), legMat);
    leg.position.set(x, 0.3, z);
    g.add(leg);
  }
  return shadow(g);
}

export function buildAntenna(h = 3.2) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.8 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h, 6), mat);
  mast.position.y = h / 2;
  g.add(mast);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7 - i * 0.16, 4), mat);
    arm.rotation.z = Math.PI / 2;
    arm.position.y = h - 0.35 - i * 0.4;
    g.add(arm);
  }
  return shadow(g);
}

export function buildACUnit() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.42), lib.metalWhite);
  g.add(box);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x333638, roughness: 0.8 }));
  grill.position.z = 0.22;
  g.add(grill);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.6 }));
  fan.rotation.x = Math.PI / 2;
  fan.position.z = 0.23;
  g.add(fan);
  return shadow(g);
}

/* -------------------------------- billboards ------------------------------- */

export function buildShopSign(text, w = 3.2, h = 0.8, bg = '#7a2c20', fg = '#e8dcc0') {
  const c = canvas(512, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  // weathering
  const r = makeRNG(text.length * 771);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(40,28,20,${r() * 0.25})`;
    ctx.fillRect(r() * 512, r() * 128, r() * 30, r() * 6);
  }
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  // Slightly emissive face: reads as a lit shop sign in the dusk menu
  // frame, near-invisible lift in full daylight
  const signTex = tex(c, { srgb: true });
  const mat = new THREE.MeshStandardMaterial({
    map: signTex, roughness: 0.85,
    emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.32,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
  return shadow(sign);
}

/** Distant skyline silhouette ring + mountain ridges (cheap, fog does the rest). */
export function buildDistantScenery(scene) {
  const r = makeRNG(2222);
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xb3a288 });
  const matFar = new THREE.MeshBasicMaterial({ color: 0xbfae92 });

  // City blocks ring
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 + r.spread(0.04);
    const dist = 240 + r() * 120;
    const w = 14 + r() * 26, h = 12 + r() * 34, d = 14 + r() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), r() > 0.4 ? mat : matFar);
    b.position.set(Math.cos(a) * dist, h / 2 - 2, Math.sin(a) * dist);
    b.rotation.y = r() * Math.PI;
    g.add(b);
  }
  // Minarets / towers
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const dist = 260 + r() * 90;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 40 + r() * 22, 8), mat);
    tower.position.set(Math.cos(a) * dist, 20, Math.sin(a) * dist);
    g.add(tower);
    const domeG = new THREE.SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeG, mat);
    dome.position.set(tower.position.x, 40 + r() * 10, tower.position.z);
    g.add(dome);
  }
  // Mountain ridge
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dist = 520 + r() * 120;
    const m = new THREE.Mesh(new THREE.ConeGeometry(120 + r() * 90, 90 + r() * 80, 5), matFar);
    m.position.set(Math.cos(a) * dist, 8, Math.sin(a) * dist);
    m.rotation.y = r() * Math.PI;
    g.add(m);
  }
  scene.add(g);
  return g;
}
