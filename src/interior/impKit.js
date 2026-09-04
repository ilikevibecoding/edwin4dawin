// Imperial interior kit: the shared vocabulary every room is built from. Walls with recessed light
// bands and black ribs, dark decking, consoles with blinking indicator grids and tactical screens,
// officer chairs, railings, stairs, pipes, cargo containers, fixtures. All geometry goes through the
// room's Kit (merged per material) and all colliders / walkables / lights are registered on ctx.
import * as THREE from "three";
import { Frame, wallFrame, ceilingFrame, X_AXIS } from "../core/frame.js";
import { rng, panelWithHoles, fitUVs } from "../kit.js";
import { IMP } from "../materials/imperial.js";
import { impDecalRect } from "../materials/imperialTextures.js";

export { Frame, wallFrame, ceilingFrame, rng };

const GAP = 0.02;

// ---------------------------------------------------------------------------
// Light descriptors (consumed by the light pool). pos is world space.
// ---------------------------------------------------------------------------
export function pointLightDesc(ctx, color, intensity, distance, pos, priority = 1) {
  const d = { type: "point", color: new THREE.Color(color), intensity, distance, pos: [...pos], priority };
  ctx.lights.push(d);
  return d;
}
export function spotLightDesc(ctx, color, intensity, distance, pos, target, { angle = 0.7, penumbra = 0.6, shadow = true, priority = 2 } = {}) {
  const d = { type: "spot", color: new THREE.Color(color), intensity, distance, pos: [...pos], target: [...target], angle, penumbra, shadow, priority };
  ctx.lights.push(d);
  return d;
}

// Walkable floor patch (the player stands on the highest patch under its feet within step height)
export function walkable(ctx, x0, z0, x1, z1, y, tag = "floor") {
  const w = { min: new THREE.Vector3(Math.min(x0, x1), y - 0.01, Math.min(z0, z1)), max: new THREE.Vector3(Math.max(x0, x1), y + 0.01, Math.max(z0, z1)), y, tag };
  ctx.walkables.push(w);
  return w;
}
// Sloped walkable: y goes from y0 at `from` end to y1 at `to` end along `axis` ('x'|'z')
export function ramp(ctx, x0, z0, x1, z1, y0, y1, axis, tag = "ramp") {
  const w = { min: new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1) - 0.01, Math.min(z0, z1)), max: new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1) + 0.01, Math.max(z0, z1)), y0, y1, axis, tag };
  ctx.walkables.push(w);
  return w;
}

// ---------------------------------------------------------------------------
// Imperial wall: black ribs, light-grey panels, recessed light band, kick plate and cornice.
// openings: [{ u0, u1, v0, v1, type: 'door'|'window'|'hole' }] in wall coordinates.
// ---------------------------------------------------------------------------
export function impWall(frame, length, height, opts = {}) {
  const {
    openings = [],
    pitch = 4.0,
    ribW = 0.28,
    ribD = 0.14,
    bandY = 2.05,
    bandH = 0.16,
    band = true,
    bandMat = "lightBand",
    kick = 0.32,
    cornice = 0.22,
    seed = 1,
    tone = IMP.wallLight,
    toneAlt = IMP.wallMid,
    styles = { plain: 0.5, control: 0.12, vent: 0.1, hatch: 0.1, pipes: 0.08, screen: 0.06, niche: 0.04 },
    collide = true,
    tag = "wall",
    depth = 0.25,
    dark = false,
    slabHoles = false, // cut the backing slab around the openings so windows / holes / doorways see through
  } = opts;
  const rand = rng(seed);
  const k = frame.kit;
  const ribMat = "impPaintedMetal";
  // backing slab (the wall proper)
  const slabCuts = slabHoles
    ? openings
        .map((op) => {
          // keep a hair of slab at the wall edges so no hole touches the outline (clean triangulation)
          const u0 = Math.max(0.002, op.u0);
          const u1 = Math.min(length - 0.002, op.u1);
          const v0 = Math.max(0.002, op.v0);
          const v1 = Math.min(height - 0.002, op.v1);
          return { x: (u0 + u1) / 2 - length / 2, y: (v0 + v1) / 2 - height / 2, w: u1 - u0, h: v1 - v0 };
        })
        .filter((c) => c.w > 0.05 && c.h > 0.05)
    : [];
  if (slabCuts.length) frame.add(ribMat, panelWithHoles(length, height, depth, slabCuts), length / 2, height / 2, -depth / 2 - 0.001, { color: IMP.trim, uv: "world", texel: 0.5 });
  else frame.box(ribMat, length / 2, height / 2, -depth / 2 - 0.001, length, height, depth, { color: IMP.trim, texel: 0.5 });

  // column cuts: regular pitch, snapped to opening edges
  let cuts = [0];
  for (let u = pitch; u < length - pitch * 0.5; u += pitch) cuts.push(u);
  cuts.push(length);
  for (const op of openings) cuts.push(op.u0 - ribW, op.u1 + ribW);
  cuts = cuts.filter((c) => c >= -1e-6 && c <= length + 1e-6).sort((a, b) => a - b);
  cuts = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 0.3);
  // drop cuts that fall inside an opening's span
  cuts = cuts.filter((c) => !openings.some((op) => c > op.u0 - ribW + 0.01 && c < op.u1 + ribW - 0.01));

  const pickStyle = (w) => {
    if (w < 1.4) return "plain";
    let r = rand();
    for (const key of Object.keys(styles)) {
      r -= styles[key];
      if (r <= 0) return key;
    }
    return "plain";
  };

  // ribs at every cut (skip ribs that would stand inside an opening)
  for (const c of cuts) {
    if (openings.some((op) => c > op.u0 + 0.01 && c < op.u1 - 0.01)) continue;
    const cu = Math.min(Math.max(c, ribW / 2), length - ribW / 2);
    frame.box(ribMat, cu, height / 2, ribD / 2, ribW, height, ribD, { color: IMP.trim, texel: 1 });
    // rib face: a thin steel inlay line
    frame.box("impMetal", cu, height / 2, ribD + 0.004, 0.04, height - 0.4, 0.008, { color: IMP.gunmetal });
  }
  // cornice + kick across the whole wall (interrupted by door openings)
  const spans = (extra) => {
    let s = [[0, length]];
    for (const op of openings.filter((o) => o.type === "door" || o.type === "hole")) {
      const next = [];
      for (const [a, b] of s) {
        const o0 = op.u0 - extra;
        const o1 = op.u1 + extra;
        if (o1 <= a || o0 >= b) next.push([a, b]);
        else {
          if (o0 > a) next.push([a, o0]);
          if (o1 < b) next.push([o1, b]);
        }
      }
      s = next;
    }
    return s;
  };
  for (const [a, b] of spans(0)) {
    const w = b - a;
    frame.box(ribMat, (a + b) / 2, height - cornice / 2, ribD / 2, w, cornice, ribD, { color: IMP.trim, texel: 1 });
  }
  for (const [a, b] of spans(ribW)) {
    const w = b - a;
    frame.box(ribMat, (a + b) / 2, kick / 2, ribD * 0.6, w, kick, ribD * 1.2, { color: IMP.trim, texel: 1 });
    frame.box("impMetal", (a + b) / 2, kick - 0.03, ribD * 1.2 + 0.004, w, 0.02, 0.008, { color: IMP.steel });
  }

  // bays between cuts
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i] + ribW / 2;
    const u1 = cuts[i + 1] - ribW / 2;
    const w = u1 - u0;
    if (w < 0.2) continue;
    const cu = (u0 + u1) / 2;
    const op = openings.find((o) => cu > o.u0 - 1e-3 && cu < o.u1 + 1e-3);
    if (op && (op.type === "door" || op.type === "hole")) continue;
    // vertical extents: kick .. band .. cornice
    const v0 = kick;
    const v1 = height - cornice;
    const style = pickStyle(w);
    const paint = rand() < 0.82 ? tone : toneAlt;
    const panelMat = rand() < 0.5 ? "impPanel" : "impPanel1";
    if (op && op.type === "window") {
      // window bay: frame + glass, panels above/below
      const wv0 = Math.max(op.v0, v0);
      const wv1 = Math.min(op.v1, v1);
      frame.box(panelMat, cu, (v0 + wv0) / 2, 0.03, w - GAP, Math.max(0.01, wv0 - v0) - GAP, 0.06, { color: paint, uv: "keep" });
      frame.box(panelMat, cu, (wv1 + v1) / 2, 0.03, w - GAP, Math.max(0.01, v1 - wv1) - GAP, 0.06, { color: paint, uv: "keep" });
      const fr = panelWithHoles(w - GAP, wv1 - wv0, 0.1, [{ x: 0, y: 0, w: w - 0.3, h: wv1 - wv0 - 0.3 }]);
      fitUVs(fr, w, wv1 - wv0);
      frame.add(ribMat, fr, cu, (wv0 + wv1) / 2, 0.02, { color: IMP.trim, uv: "keep" });
      frame.quad("glass", cu, (wv0 + wv1) / 2, -0.02, w - 0.3, wv1 - wv0 - 0.3);
      continue;
    }
    if (band) {
      // lower panel, band recess, upper panel
      const b0 = bandY - bandH / 2;
      const b1 = bandY + bandH / 2;
      frame.box(panelMat, cu, (v0 + b0) / 2, 0.03, w - GAP, b0 - v0 - GAP, 0.06, { color: paint, uv: "keep" });
      frame.box(panelMat, cu, (b1 + v1) / 2, 0.03, w - GAP, v1 - b1 - GAP, 0.06, { color: paint, uv: "keep" });
      frame.box(ribMat, cu, bandY, -0.03, w, bandH + 0.04, 0.06, { color: IMP.trim, texel: 1 });
      frame.box(bandMat, cu, bandY, -0.005, w - 0.12, bandH - 0.05, 0.01, { uv: "keep" });
    } else {
      frame.box(panelMat, cu, (v0 + v1) / 2, 0.03, w - GAP, v1 - v0 - GAP, 0.06, { color: paint, uv: "keep" });
    }
    // per-bay feature on the lower panel (below the band) or full height when no band
    const fv0 = v0 + 0.15;
    const fv1 = (band ? bandY - bandH / 2 : v1) - 0.15;
    const fh = fv1 - fv0;
    const fc = (fv0 + fv1) / 2;
    switch (style) {
      case "control": {
        // recessed dark control panel with a blink grid and a small screen
        const pw = Math.min(w - 0.4, 2.2);
        frame.box(ribMat, cu, fc, 0.05, pw, fh * 0.8, 0.04, { color: IMP.consoleDark, texel: 1 });
        frame.box("blink", cu - pw * 0.22, fc + fh * 0.12, 0.075, pw * 0.42, fh * 0.32, 0.01, { uv: "keep" });
        frame.box("darkGloss", cu + pw * 0.24, fc + fh * 0.12, 0.075, pw * 0.4, fh * 0.34, 0.01);
        frame.box("screen" + Math.floor(rand() * 3), cu + pw * 0.24, fc + fh * 0.12, 0.082, pw * 0.36, fh * 0.28, 0.004, { uv: "keep" });
        frame.box("blinkSparse", cu, fc - fh * 0.25, 0.075, pw * 0.86, fh * 0.16, 0.01, { uv: "keep" });
        for (let b = 0; b < 4; b++) frame.box("impRubber", cu - pw * 0.3 + b * pw * 0.2, fc - fh * 0.38, 0.09, 0.09, 0.05, 0.05, { color: IMP.rubber });
        break;
      }
      case "vent": {
        const vw = Math.min(w - 0.5, 1.6);
        frame.box(ribMat, cu, fc, 0.045, vw, fh * 0.7, 0.03, { color: IMP.trim, texel: 1 });
        const slats = Math.max(4, Math.floor((fh * 0.7 - 0.1) / 0.11));
        for (let s = 0; s < slats; s++) {
          const sv = fc - fh * 0.35 + 0.08 + (s / (slats - 1)) * (fh * 0.7 - 0.16);
          frame.box("impMetal", cu, sv, 0.07, vw - 0.14, 0.03, 0.07, { color: IMP.gunmetal, tilt: 0.55 });
        }
        break;
      }
      case "hatch": {
        const hw = Math.min(w - 0.5, 1.4);
        const hh = Math.min(fh - 0.2, 1.3);
        frame.box(ribMat, cu, fc, 0.04, hw + 0.08, hh + 0.08, 0.02, { color: IMP.trim, texel: 1 });
        frame.box(panelMat, cu, fc, 0.065, hw, hh, 0.04, { color: IMP.wallMid, uv: "keep" });
        for (const [bu, bv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.cylN("impMetal", cu + bu * (hw / 2 - 0.08), fc + bv * (hh / 2 - 0.08), 0.09, 0.02, 0.02, { color: IMP.steel, segments: 8 });
        frame.box("darkGloss", cu + hw * 0.3, fc, 0.09, 0.14, 0.05, 0.02);
        frame.quad("impDecal", cu - hw * 0.25, fc + hh * 0.3, 0.088, 0.3, 0.3, { uvRect: impDecalRect(Math.floor(rand() * 16)) });
        break;
      }
      case "pipes": {
        const n = 2 + Math.floor(rand() * 2);
        for (let p = 0; p < n; p++) {
          const r = 0.035 + rand() * 0.04;
          const pu = u0 + 0.3 + ((p + 0.5) / n) * (w - 0.6);
          const col = [IMP.steel, IMP.gunmetal, IMP.darkMetal][Math.floor(rand() * 3)];
          frame.cylV("impMetal", pu, fc, 0.03 + r, r, fh - 0.1, { color: col, segments: 10 });
          frame.box(ribMat, pu, fv0 + 0.15, 0.03 + r, r * 2 + 0.06, 0.07, r * 2 + 0.04, { color: IMP.trim, texel: 2 });
          frame.box(ribMat, pu, fv1 - 0.15, 0.03 + r, r * 2 + 0.06, 0.07, r * 2 + 0.04, { color: IMP.trim, texel: 2 });
          if (rand() < 0.5) frame.box("impMetal", pu, fc, 0.03 + r * 2, r * 2.6, 0.12, 0.04, { color: IMP.steel });
        }
        break;
      }
      case "screen": {
        const sw = Math.min(w - 0.6, 1.8);
        const sh = Math.min(fh * 0.5, 1.0);
        frame.box("darkGloss", cu, fc + fh * 0.1, 0.05, sw + 0.08, sh + 0.08, 0.04);
        frame.box("screen" + Math.floor(rand() * 3), cu, fc + fh * 0.1, 0.075, sw, sh, 0.004, { uv: "keep" });
        frame.box("leds", cu, fc - fh * 0.3, 0.06, sw * 0.6, 0.05, 0.02, { uv: "keep" });
        break;
      }
      case "niche": {
        const nw = Math.min(w - 0.5, 1.2);
        frame.box(ribMat, cu, fc, -0.08, nw, fh * 0.8, 0.02, { color: IMP.consoleDark, texel: 1 });
        for (let s = 0; s < 3; s++) frame.box("impMetal", cu, fv0 + 0.1 + s * (fh * 0.8) / 3, -0.02, nw, 0.03, 0.14, { color: IMP.gunmetal });
        frame.box("emitBlue", cu, fv1 - 0.05, -0.02, nw * 0.7, 0.02, 0.02);
        break;
      }
      default: {
        // plain panel gets a secondary read: seam line, small label, or a status LED strip
        const sub = rand();
        if (sub < 0.3) frame.box(ribMat, cu, fc, 0.062, w - 0.3, 0.02, 0.01, { color: IMP.trim });
        else if (sub < 0.55) frame.quad("impDecal", cu + (rand() - 0.5) * (w - 0.8), fv0 + 0.4, 0.062, 0.36, 0.36, { uvRect: impDecalRect(Math.floor(rand() * 16)) });
        else if (sub < 0.7) frame.box("leds", cu, fv0 + 0.25, 0.065, Math.min(0.8, w - 0.6), 0.05, 0.01, { uv: "keep" });
      }
    }
  }
  if (collide) {
    for (const [a, b] of spans(0)) frame.collider(a, b, 0, height, -depth, ribD + 0.02, tag);
  }
}

// Ceiling: dark panels with a grid of recessed light troughs; every `lightPitch` a light band strip.
export function impCeiling(frame, w, d, opts = {}) {
  const { lightPitch = 4, bandMat = "lightBand", stripW = 0.3, seed = 7, tone = IMP.wallDark, panelW = 2.0, lights = true } = opts;
  const rand = rng(seed);
  frame.box("impPaintedMetal", w / 2, d / 2, -0.1, w, d, 0.2, { color: IMP.trim, texel: 0.5 });
  const nu = Math.max(1, Math.round(w / panelW));
  const nv = Math.max(1, Math.round(d / panelW));
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const cu = ((i + 0.5) / nu) * w;
      const cv = ((j + 0.5) / nv) * d;
      const pw = w / nu - 0.06;
      const ph = d / nv - 0.06;
      frame.box(rand() < 0.5 ? "impPanel" : "impPanel1", cu, cv, 0.02, pw, ph, 0.04, { color: tone, uv: "keep" });
      if (rand() < 0.08) frame.box("impPaintedMetal", cu, cv, 0.045, pw * 0.5, ph * 0.5, 0.01, { color: IMP.consoleDark, texel: 1 });
    }
  }
  if (lights) {
    // troughs run along v every lightPitch across u
    for (let u = lightPitch / 2; u < w; u += lightPitch) {
      frame.box("impPaintedMetal", u, d / 2, 0.04, stripW + 0.16, d - 0.4, 0.08, { color: IMP.trim, texel: 1 });
      frame.box(bandMat, u, d / 2, 0.09, stripW, d - 0.6, 0.01, { uv: "keep" });
    }
  }
}

// Floor slab: dark deck with optional centre gloss strip and edge trim. box = [x0, z0, x1, z1]
export function impFloor(kit, box, y, opts = {}) {
  const { mat = "impDeck", tone = IMP.wallMid, strip = false, stripW = 1.6, stripAxis = "z", texel = 0.5, trim = true } = opts;
  const [x0, z0, x1, z1] = box;
  kit.boxMM(mat, [x0, y - 0.12, z0], [x1, y, z1], { color: tone, texel });
  if (strip) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (stripAxis === "z") kit.boxMM("impGloss", [cx - stripW / 2, y - 0.001, z0], [cx + stripW / 2, y + 0.006, z1], { color: IMP.white, texel: 0.25 });
    else kit.boxMM("impGloss", [x0, y - 0.001, cz - stripW / 2], [x1, y + 0.006, cz + stripW / 2], { color: IMP.white, texel: 0.25 });
  }
  if (trim) {
    const t = 0.12;
    kit.boxMM("impPaintedMetal", [x0, y, z0], [x1, y + 0.012, z0 + t], { color: IMP.trim });
    kit.boxMM("impPaintedMetal", [x0, y, z1 - t], [x1, y + 0.012, z1], { color: IMP.trim });
    kit.boxMM("impPaintedMetal", [x0, y, z0], [x0 + t, y + 0.012, z1], { color: IMP.trim });
    kit.boxMM("impPaintedMetal", [x1 - t, y, z0], [x1, y + 0.012, z1], { color: IMP.trim });
  }
}

// ---------------------------------------------------------------------------
// Consoles & furniture
// ---------------------------------------------------------------------------
// Standing console. pos is the floor point at the operator's side centre; yaw 0 faces -Z (operator looks
// toward -Z over the console). width along the operator's left-right, kind: 'station'|'wide'|'wall'
export function console(kit, ctx, pos, yaw, opts = {}) {
  const { kind = "station", width = kind === "wide" ? 2.4 : kind === "wall" ? 2.0 : 1.3, screens = 2, seed = 3, tall = kind === "wall", light = true, color = IMP.console } = opts;
  const rand = rng(seed);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const tiltQ = (a) => q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, a));
  const depth = tall ? 0.6 : 0.85;
  const h = tall ? 2.0 : 0.78;
  // base pedestal + body
  box("impPaintedMetal", 0, 0.06, -depth / 2, width - 0.2, 0.12, depth - 0.2, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2, -depth / 2, width, h, depth, { color, texel: 1 });
  box("impPaintedMetal", 0, h * 0.35, -depth / 2 + depth / 2 + 0.005, width - 0.16, h * 0.5, 0.01, { color: IMP.consoleDark, texel: 1 });
  // kick strip glow (blue)
  box("emitBlue", 0, 0.16, 0.005, width - 0.3, 0.02, 0.01);
  if (!tall) {
    // sloped top slab facing the operator, with screens and indicator grids
    const slabLen = 0.62;
    const tilt = -0.42;
    const tq = tiltQ(tilt);
    const top = L(0, h + 0.05, -depth + slabLen / 2 + 0.05);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(width, 0.08, slabLen), { pos: [top.x, top.y, top.z], quat: tq, color: IMP.consoleDark, texel: 1 });
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tq);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(tq);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const place = (x, along, lift) => top.clone().addScaledVector(right, x).addScaledVector(fwd, along).addScaledVector(up, 0.04 + lift);
    const n = Math.max(1, Math.min(screens, Math.floor(width / 0.55)));
    for (let i = 0; i < n; i++) {
      const x = -width / 2 + (width / n) * (i + 0.5);
      const sw = width / n - 0.16;
      const p = place(x, 0.12, 0);
      kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.04, 0.02, 0.28), { pos: [p.x, p.y, p.z], quat: tq });
      const p2 = place(x, 0.12, 0.012);
      const sg = new THREE.PlaneGeometry(sw, 0.24);
      sg.rotateX(-Math.PI / 2);
      kit.add("screen" + Math.floor(rand() * 3), sg, { pos: [p2.x, p2.y, p2.z], quat: tq, uv: "keep" });
    }
    // indicator grid row nearest the operator + buttons
    const g = place(0, -0.17, 0.008);
    const gg = new THREE.PlaneGeometry(width - 0.24, 0.1);
    gg.rotateX(-Math.PI / 2);
    kit.add(rand() < 0.5 ? "blink" : "blinkDense", gg, { pos: [g.x, g.y, g.z], quat: tq, uv: "keep" });
    const nb = Math.floor((width - 0.3) / 0.11);
    for (let b = 0; b < nb; b++) {
      const p = place(-width / 2 + 0.2 + b * 0.11, -0.27, 0.012);
      const em = rand() < 0.3;
      kit.add(em ? ["emitRed", "emitBlue", "emitAmber", "emitWhite"][Math.floor(rand() * 4)] : "impRubber", new THREE.BoxGeometry(0.07, 0.025, 0.05), { pos: [p.x, p.y, p.z], quat: tq, color: IMP.rubber });
    }
    // rear riser with a vertical screen (station kind only, when there is room)
    if (kind !== "station" || width > 1.1) {
      box("impPaintedMetal", 0, h + 0.36, -depth + 0.06, width - 0.2, 0.62, 0.1, { color: IMP.consoleDark, texel: 1 });
      box("darkGloss", 0, h + 0.38, -depth + 0.116, width - 0.4, 0.42, 0.01);
      box("screen" + Math.floor(rand() * 3), 0, h + 0.38, -depth + 0.123, width - 0.5, 0.34, 0.004, { uv: "keep" });
      box("blinkSparse", 0, h + 0.09, -depth + 0.116, width - 0.4, 0.1, 0.01, { uv: "keep" });
    }
  } else {
    // wall console: full-height vertical panel with a big screen, a grid and a keyboard shelf
    box("darkGloss", 0, 1.45, 0.006, width - 0.3, 0.7, 0.01);
    box("screen" + Math.floor(rand() * 3), 0, 1.45, 0.013, width - 0.4, 0.6, 0.004, { uv: "keep" });
    box("blink", 0, 0.95, 0.006, width - 0.3, 0.22, 0.01, { uv: "keep" });
    box("impPaintedMetal", 0, 0.78, 0.12, width - 0.2, 0.05, 0.28, { color: IMP.consoleDark, texel: 1 });
    box("blinkSparse", 0, 0.806, 0.12, width - 0.4, 0.01, 0.2, { uv: "keep" });
    box("leds", 0, 0.5, 0.006, width - 0.5, 0.05, 0.01, { uv: "keep" });
    box("emitAmber", -width / 2 + 0.15, 1.9, 0.006, 0.05, 0.05, 0.01);
    box("emitBlue", width / 2 - 0.15, 1.9, 0.006, 0.05, 0.05, 0.01);
  }
  // collider (AABB of the rotated footprint)
  const c0 = L(-width / 2, 0, 0.05);
  const c1 = L(width / 2, 0, -depth - 0.05);
  kit.collider([Math.min(c0.x, c1.x), pos[1], Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), pos[1] + h + 0.7, Math.max(c0.z, c1.z)], "console");
  if (light) {
    const lp = L(0, h + 0.5, 0.3);
    pointLightDesc(ctx, 0x6fa0ff, 1.2, 3.2, [lp.x, lp.y, lp.z], 0);
  }
}

// Imperial officer chair. pos = floor point under the seat centre, yaw 0 faces -Z.
export function chair(kit, pos, yaw, opts = {}) {
  const { color = IMP.fabricBlack, collide = true } = opts;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const base = L(0, 0.03, 0);
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.28, 0.32, 0.06, 16), { pos: [base.x, base.y, base.z], color: IMP.trim, uv: "scale", uvScale: [1, 1] });
  const stem = L(0, 0.24, 0);
  kit.add("impMetal", new THREE.CylinderGeometry(0.06, 0.07, 0.36, 10), { pos: [stem.x, stem.y, stem.z], color: IMP.gunmetal, uv: "scale", uvScale: [0.4, 0.4] });
  box("impRubber", 0, 0.46, 0, 0.56, 0.1, 0.54, { color: IMP.rubber });
  box("impFabric", 0, 0.53, 0.02, 0.44, 0.06, 0.44, { color, uv: "world", texel: 2 });
  // backrest, leaning aft (+z)
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, 0.16));
  const bp = L(0, 0.95, 0.27);
  kit.add("impRubber", new THREE.BoxGeometry(0.5, 0.86, 0.1), { pos: [bp.x, bp.y, bp.z], quat: bq, color: IMP.rubber });
  const bp2 = L(0, 0.95, 0.215);
  kit.add("impFabric", new THREE.BoxGeometry(0.38, 0.7, 0.03), { pos: [bp2.x, bp2.y, bp2.z], quat: bq, color, uv: "world", texel: 2 });
  box("impMetal", 0, 1.42, 0.3, 0.32, 0.12, 0.08, { color: IMP.gunmetal });
  for (const s of [-1, 1]) {
    box("impMetal", s * 0.31, 0.72, 0.05, 0.05, 0.24, 0.08, { color: IMP.gunmetal });
    box("impRubber", s * 0.31, 0.85, 0.02, 0.07, 0.04, 0.42, { color: IMP.rubber });
  }
  if (collide) {
    const a = L(-0.3, 0, -0.3);
    const b = L(0.3, 0, 0.35);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.2, Math.max(a.z, b.z)], "chair");
  }
}

// Railing along a segment from -> to ([x,z]) at floor y. Black posts, steel top bar, mid bar.
export function railing(kit, from, to, y, opts = {}) {
  const { h = 1.05, postPitch = 1.6, collide = true, tag = "rail", lit = false } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.05) return;
  const ux = dx / L;
  const uz = dz / L;
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const mid = [from[0] + dx / 2, from[1] + dz / 2];
  kit.add("impMetal", new THREE.BoxGeometry(L, 0.05, 0.08), { pos: [mid[0], y + h, mid[1]], quat: q, color: IMP.steel, texel: 1 });
  kit.add("impPaintedMetal", new THREE.BoxGeometry(L, 0.04, 0.04), { pos: [mid[0], y + h * 0.55, mid[1]], quat: q, color: IMP.trim, texel: 1 });
  if (lit) kit.add("emitBlue", new THREE.BoxGeometry(L - 0.2, 0.012, 0.03), { pos: [mid[0], y + h - 0.035, mid[1]], quat: q });
  const n = Math.max(2, Math.round(L / postPitch) + 1);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const px = from[0] + dx * t;
    const pz = from[1] + dz * t;
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.07, h, 0.07), { pos: [px, y + h / 2, pz], quat: q, color: IMP.trim, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(0.14, 0.02, 0.14), { pos: [px, y + 0.01, pz], quat: q, color: IMP.gunmetal });
  }
  if (collide) {
    const pad = 0.12;
    kit.collider([Math.min(from[0], to[0]) - pad, y, Math.min(from[1], to[1]) - pad], [Math.max(from[0], to[0]) + pad, y + h + 0.1, Math.max(from[1], to[1]) + pad], tag);
  }
}

// Straight stair from floor y0 up to y1. `from` is the [x,z] centre of the bottom edge, dir is the
// [dx,dz] unit direction of ascent, w the width. Registers a ramp walkable and side colliders.
export function stairs(kit, ctx, from, dir, w, y0, y1, opts = {}) {
  const { riser = 0.19, rails = true, open = false, tone = IMP.wallDark } = opts;
  const rise = y1 - y0;
  const n = Math.max(1, Math.round(rise / riser));
  const stepH = rise / n;
  const tread = opts.tread || 0.3;
  const run = n * tread;
  const ux = dir[0];
  const uz = dir[1];
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  for (let i = 0; i < n; i++) {
    const along = (i + 0.5) * tread;
    const cx = from[0] + ux * along;
    const cz = from[1] + uz * along;
    const top = y0 + (i + 1) * stepH;
    const h = open ? stepH + 0.04 : top - y0 + 0.02;
    const cy = open ? top - h / 2 : y0 + h / 2 - 0.02;
    kit.add("impDeck", new THREE.BoxGeometry(w, h, tread), { pos: [cx, cy, cz], quat: q, color: tone, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(w, 0.02, 0.05), { pos: [cx + ux * (tread / 2 - 0.02), top + 0.005, cz + uz * (tread / 2 - 0.02)], quat: q, color: IMP.steel });
  }
  // walkable ramp: axis-aligned only (stairs in this ship run along x or z)
  const x0 = from[0] - Math.abs(uz) * (w / 2);
  const x1 = from[0] + Math.abs(uz) * (w / 2) + ux * run;
  const z0 = from[1] - Math.abs(ux) * (w / 2);
  const z1 = from[1] + Math.abs(ux) * (w / 2) + uz * run;
  const axis = Math.abs(ux) > 0.5 ? "x" : "z";
  // y0 at the "from" end: ramp() takes y at min-coordinate end first
  const ascending = axis === "x" ? ux > 0 : uz > 0;
  ramp(ctx, x0, z0, x1, z1, ascending ? y0 : y1, ascending ? y1 : y0, axis, "stairs");
  if (rails) {
    const sx = -uz;
    const sz = ux;
    for (const s of [-1, 1]) {
      const a = [from[0] + sx * s * (w / 2 + 0.05), from[1] + sz * s * (w / 2 + 0.05)];
      const b = [a[0] + ux * run, a[1] + uz * run];
      // sloped rail: posts at both ends + a tilted bar
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const len = Math.hypot(run, rise);
      const tiltQ = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(rise, run) * (ux !== 0 ? Math.sign(ux) : Math.sign(uz))));
      kit.add("impMetal", new THREE.BoxGeometry(len, 0.05, 0.06), { pos: [mid[0], (y0 + y1) / 2 + 1.0, mid[1]], quat: tiltQ, color: IMP.steel, texel: 1 });
      kit.add("impPaintedMetal", new THREE.BoxGeometry(0.07, 1.0, 0.07), { pos: [a[0], y0 + 0.5, a[1]], color: IMP.trim });
      kit.add("impPaintedMetal", new THREE.BoxGeometry(0.07, 1.0, 0.07), { pos: [b[0], y1 + 0.5, b[1]], color: IMP.trim });
      kit.collider([Math.min(a[0], b[0]) - 0.08, y0, Math.min(a[1], b[1]) - 0.08], [Math.max(a[0], b[0]) + 0.08, y1 + 1.1, Math.max(a[1], b[1]) + 0.08], "stairRail");
    }
  }
  return { run, n };
}

// Pipe run along a polyline of [x,y,z] points with spherical elbows and clamps.
export function pipeRun(kit, points, r, opts = {}) {
  const { color = IMP.steel, mat = "impMetal", clamps = true, clampPitch = 2.5 } = opts;
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-4) continue;
    const mid = a.clone().addScaledVector(d, 0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    kit.add(mat, new THREE.CylinderGeometry(r, r, len, 12), { pos: [mid.x, mid.y, mid.z], quat: q, color, uv: "scale", uvScale: [2 * Math.PI * r, len] });
    if (i > 0) kit.add(mat, new THREE.SphereGeometry(r * 1.05, 12, 8), { pos: [a.x, a.y, a.z], color, uv: "scale", uvScale: [1, 1] });
    if (clamps) {
      for (let s = clampPitch / 2; s < len; s += clampPitch) {
        const p = a.clone().addScaledVector(d, s / len);
        kit.add("impPaintedMetal", new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.08, 12), { pos: [p.x, p.y, p.z], quat: q, color: IMP.trim, uv: "scale", uvScale: [1, 0.2] });
      }
    }
  }
}

// Imperial cargo container. pos = floor centre, size [w,h,d], yaw. Dark body, corner braces, handles,
// a stencilled label, an amber or blue status light.
export function crate(kit, pos, size, opts = {}) {
  const { yaw = 0, seed = 1, tone = null, collide = true, light = true } = opts;
  const rand = rng(seed);
  const [w, h, d] = size;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const body = tone || [IMP.wallDark, IMP.gunmetal, IMP.consoleDark, IMP.wallMid][Math.floor(rand() * 4)];
  box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: body, texel: 1 });
  // corner braces
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("impMetal", sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05), 0.1, h + 0.02, 0.1, { color: IMP.trim });
  // horizontal bands
  box("impMetal", 0, h * 0.25, 0, w + 0.02, 0.06, d + 0.02, { color: IMP.trim });
  box("impMetal", 0, h * 0.75, 0, w + 0.02, 0.06, d + 0.02, { color: IMP.trim });
  // recessed handles on the ends
  for (const s of [-1, 1]) box("impPaintedMetal", s * (w / 2 + 0.005), h * 0.55, 0, 0.01, 0.08, Math.min(0.4, d * 0.4), { color: IMP.trim });
  // label + status light on the front
  const g = new THREE.PlaneGeometry(Math.min(0.5, h * 0.5), Math.min(0.5, h * 0.5));
  const lp = L(-w * 0.2, h * 0.5, d / 2 + 0.004);
  kit.add("impDecal", g, { pos: [lp.x, lp.y, lp.z], quat: q, uv: "keep", uvRect: impDecalRect([0, 3, 6, 9, 11, 15][Math.floor(rand() * 6)]) });
  if (light) box(rand() < 0.5 ? "emitAmber" : "emitBlue", w * 0.3, h * 0.85, d / 2 + 0.004, 0.06, 0.03, 0.008);
  if (collide) {
    const a = L(-w / 2, 0, -d / 2);
    const b = L(w / 2, 0, d / 2);
    const c = L(-w / 2, 0, d / 2);
    const e = L(w / 2, 0, -d / 2);
    const xs = [a.x, b.x, c.x, e.x];
    const zs = [a.z, b.z, c.z, e.z];
    kit.collider([Math.min(...xs), pos[1], Math.min(...zs)], [Math.max(...xs), pos[1] + h, Math.max(...zs)], "crate");
  }
}

// Recessed ceiling light bar with a real light descriptor under it. axis 'x'|'z', len along axis.
export function ceilingLight(kit, ctx, pos, len, axis, opts = {}) {
  const { mat = "lightBand", color = 0xdfe8ff, intensity = 5, distance = 9, w = 0.3, priority = 1, drop = 0.6 } = opts;
  const [x, y, z] = pos;
  const sx = axis === "x" ? len : w + 0.16;
  const sz = axis === "x" ? w + 0.16 : len;
  kit.box("impPaintedMetal", x, y - 0.05, z, sx, 0.1, sz, { color: IMP.trim, texel: 1 });
  kit.box(mat, x, y - 0.1, z, axis === "x" ? len - 0.2 : w, 0.01, axis === "x" ? w : len - 0.2, { uv: "keep" });
  if (intensity > 0) pointLightDesc(ctx, color, intensity, distance, [x, y - drop, z], priority);
}

// Structural column with light slits. x,z centre; y0..y1
export function column(kit, x, z, y0, y1, opts = {}) {
  const { w = 0.6, d = 0.6, lit = true, collide = true, tone = IMP.wallDark } = opts;
  const h = y1 - y0;
  kit.box("impPaintedMetal", x, y0 + h / 2, z, w, h, d, { color: tone, texel: 1 });
  kit.box("impPaintedMetal", x, y0 + h / 2, z, w + 0.08, h, d * 0.5, { color: IMP.trim, texel: 1 });
  kit.box("impPaintedMetal", x, y0 + h / 2, z, w * 0.5, h, d + 0.08, { color: IMP.trim, texel: 1 });
  if (lit) {
    for (const s of [-1, 1]) {
      kit.box("emitBlue", x + s * (w / 2 + 0.045), y0 + h / 2, z, 0.006, h - 0.8, 0.03);
      kit.box("emitBlue", x, y0 + h / 2, z + s * (d / 2 + 0.045), 0.03, h - 0.8, 0.006);
    }
  }
  if (collide) kit.collider([x - w / 2 - 0.05, y0, z - d / 2 - 0.05], [x + w / 2 + 0.05, y1, z + d / 2 + 0.05], "column");
}

// Grated catwalk at height y: from -> to ([x,z]), width w, with railings on both sides and a walkable.
export function catwalk(kit, ctx, from, to, w, y, opts = {}) {
  const { rails = true, tone = IMP.gunmetal, railH = 1.05 } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const mid = [from[0] + dx / 2, from[1] + dz / 2];
  // frame + deck grate
  kit.add("impPaintedMetal", new THREE.BoxGeometry(L, 0.12, w), { pos: [mid[0], y - 0.08, mid[1]], quat: q, color: IMP.trim, texel: 1 });
  const g = new THREE.PlaneGeometry(L, w - 0.1);
  g.rotateX(-Math.PI / 2);
  kit.add("impGrate", g, { pos: [mid[0], y - 0.01, mid[1]], quat: q, uv: "scale", uvScale: [L / 1.24, (w - 0.1) / 0.9], color: 0xffffff });
  for (const s of [-1, 1]) {
    kit.add("impMetal", new THREE.BoxGeometry(L, 0.06, 0.05), { pos: [mid[0] + -uz * s * (w / 2), y - 0.005, mid[1] + ux * s * (w / 2)], quat: q, color: tone, texel: 1 });
  }
  // cross beams
  for (let s = 1; s < L; s += 2) {
    const p = [from[0] + ux * s, from[1] + uz * s];
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.1, 0.16, w), { pos: [p[0], y - 0.14, p[1]], quat: q, color: IMP.trim });
  }
  const pad = w / 2;
  const x0 = Math.min(from[0], to[0]) - Math.abs(uz) * pad;
  const x1 = Math.max(from[0], to[0]) + Math.abs(uz) * pad;
  const z0 = Math.min(from[1], to[1]) - Math.abs(ux) * pad;
  const z1 = Math.max(from[1], to[1]) + Math.abs(ux) * pad;
  walkable(ctx, x0, z0, x1, z1, y, "catwalk");
  if (rails) {
    for (const s of [-1, 1]) {
      const a = [from[0] - uz * s * (w / 2 - 0.04), from[1] + ux * s * (w / 2 - 0.04)];
      const b = [to[0] - uz * s * (w / 2 - 0.04), to[1] + ux * s * (w / 2 - 0.04)];
      railing(kit, a, b, y, { h: railH, lit: opts.lit });
    }
  }
}

// Wall-mounted screen with bezel (in a wall frame at u, v)
export function wallScreen(frame, u, v, w, h, idx = 0, opts = {}) {
  frame.box("impPaintedMetal", u, v, 0.05, w + 0.14, h + 0.14, 0.06, { color: IMP.consoleDark, texel: 1 });
  frame.box("darkGloss", u, v, 0.083, w + 0.04, h + 0.04, 0.01);
  frame.box("screen" + idx, u, v, 0.09, w, h, 0.004, { uv: "keep" });
  if (opts.leds !== false) frame.box("leds", u, v - h / 2 - 0.11, 0.07, Math.min(w * 0.6, 1.2), 0.05, 0.01, { uv: "keep" });
}

// Small doorway status light + label plate above an opening (corridor side), on a wall frame
export function doorSign(frame, u, v, opts = {}) {
  const { color = "emitBlue", decal = 0 } = opts;
  frame.box("impPaintedMetal", u, v, 0.08, 0.9, 0.22, 0.06, { color: IMP.trim, texel: 1 });
  frame.box(color, u + 0.3, v, 0.115, 0.14, 0.06, 0.01);
  frame.quad("impDecal", u - 0.2, v, 0.112, 0.2, 0.2, { uvRect: impDecalRect(decal) });
}

// Bank of lockers / storage cabinets along a wall frame: from u0 to u1, height h
export function lockers(frame, u0, u1, h, opts = {}) {
  const { doorW = 0.6, tone = IMP.wallMid, seed = 5 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  frame.box("impPaintedMetal", (u0 + u1) / 2, h / 2, 0.25, len, h, 0.5, { color: IMP.trim, texel: 1 });
  const n = Math.max(1, Math.floor(len / doorW));
  const dw = len / n;
  for (let i = 0; i < n; i++) {
    const cu = u0 + dw * (i + 0.5);
    frame.box("impPanel", cu, h / 2, 0.51, dw - 0.04, h - 0.1, 0.02, { color: tone, uv: "keep" });
    frame.box("impMetal", cu + dw * 0.3, h * 0.55, 0.53, 0.03, 0.14, 0.02, { color: IMP.steel });
    frame.box(rand() < 0.7 ? "emitBlue" : "emitAmber", cu - dw * 0.3, h - 0.25, 0.525, 0.04, 0.02, 0.01);
    for (let s = 0; s < 4; s++) frame.box("impPaintedMetal", cu, h * 0.2 + s * 0.05, 0.525, dw * 0.5, 0.012, 0.01, { color: IMP.trim });
    if (rand() < 0.4) frame.quad("impDecal", cu, h * 0.75, 0.522, 0.2, 0.2, { uvRect: impDecalRect(Math.floor(rand() * 16)) });
  }
  frame.collider(u0, u1, 0, h, 0, 0.56, "lockers");
}

// Table (mess / briefing): centre pos, size [w, d], height
export function table(kit, pos, w, d, opts = {}) {
  const { h = 0.76, yaw = 0, tone = IMP.wallDark, top = "impPaintedMetal", collide = true } = opts;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const [x, y, z] = pos;
  kit.add(top, new THREE.BoxGeometry(w, 0.06, d), { pos: [x, y + h - 0.03, z], quat: q, color: tone, texel: 1 });
  kit.add("impMetal", new THREE.BoxGeometry(w + 0.02, 0.02, d + 0.02), { pos: [x, y + h - 0.005, z], quat: q, color: IMP.steel, texel: 1 });
  kit.add("impPaintedMetal", new THREE.BoxGeometry(Math.min(w * 0.3, 0.6), h - 0.06, Math.min(d * 0.5, 0.6)), { pos: [x, y + (h - 0.06) / 2, z], quat: q, color: IMP.trim, texel: 1 });
  kit.add("impPaintedMetal", new THREE.BoxGeometry(w * 0.6, 0.05, d * 0.7), { pos: [x, y + 0.025, z], quat: q, color: IMP.trim, texel: 1 });
  if (collide) kit.collider([x - w / 2, y, z - d / 2], [x + w / 2, y + h, z + d / 2], "table");
}

// Bench seat (mess, briefing rows): centre pos, length along the local x, yaw
export function bench(kit, pos, len, yaw = 0, opts = {}) {
  const { back = true, color = IMP.fabricBlack, collide = true } = opts;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const [x, y, z] = pos;
  const o = new THREE.Vector3(x, y, z);
  const L = (lx, ly, lz) => o.clone().add(new THREE.Vector3(lx, ly, lz).applyQuaternion(q));
  const box = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = L(lx, ly, lz);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.2, 0, len - 0.3, 0.4, 0.3, { color: IMP.trim, texel: 1 });
  box("impRubber", 0, 0.45, 0, len, 0.1, 0.5, { color: IMP.rubber });
  box("impFabric", 0, 0.51, 0.02, len - 0.1, 0.04, 0.42, { color, uv: "world", texel: 2 });
  if (back) {
    box("impRubber", 0, 0.85, 0.24, len, 0.6, 0.08, { color: IMP.rubber });
    box("impFabric", 0, 0.85, 0.195, len - 0.1, 0.5, 0.02, { color, uv: "world", texel: 2 });
  }
  if (collide) {
    const a = L(-len / 2, 0, -0.3);
    const b = L(len / 2, 0, 0.3);
    kit.collider([Math.min(a.x, b.x), y, Math.min(a.z, b.z)], [Math.max(a.x, b.x), y + 1.2, Math.max(a.z, b.z)], "bench");
  }
}

// Bunk (single or stacked): pos = floor centre, yaw 0 => head toward -Z. tiers: 1|2|3
export function bunk(kit, pos, yaw, opts = {}) {
  const { tiers = 2, color = IMP.fabricGrey, collide = true, width = 0.9, length = 2.0 } = opts;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const [x, y, z] = pos;
  const o = new THREE.Vector3(x, y, z);
  const L = (lx, ly, lz) => o.clone().add(new THREE.Vector3(lx, ly, lz).applyQuaternion(q));
  const box = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = L(lx, ly, lz);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const pitch = 0.95;
  for (let t = 0; t < tiers; t++) {
    const by = 0.45 + t * pitch;
    box("impPaintedMetal", 0, by - 0.08, 0, width, 0.14, length, { color: IMP.trim, texel: 1 });
    box("impFabric", 0, by + 0.05, 0, width - 0.1, 0.12, length - 0.1, { color, uv: "world", texel: 2 });
    box("impFabric", 0, by + 0.14, -length / 2 + 0.3, width - 0.3, 0.08, 0.4, { color: IMP.white, uv: "world", texel: 2 });
    box("impFabric", 0, by + 0.12, length * 0.12, width - 0.06, 0.05, length * 0.55, { color: IMP.fabricOlive, uv: "world", texel: 2 });
    // reading light + small locker shelf at the head end
    box("impPaintedMetal", width / 2 - 0.05, by + 0.6, -length / 2 + 0.15, 0.06, 0.16, 0.24, { color: IMP.trim });
    box("emitWarm", width / 2 - 0.075, by + 0.6, -length / 2 + 0.15, 0.01, 0.1, 0.16);
  }
  // frame posts
  const H = 0.45 + (tiers - 1) * pitch + 0.9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("impPaintedMetal", sx * (width / 2 - 0.04), H / 2, sz * (length / 2 - 0.04), 0.08, H, 0.08, { color: IMP.trim, texel: 1 });
  if (collide) {
    const a = L(-width / 2, 0, -length / 2);
    const b = L(width / 2, 0, length / 2);
    kit.collider([Math.min(a.x, b.x), y, Math.min(a.z, b.z)], [Math.max(a.x, b.x), y + H, Math.max(a.z, b.z)], "bunk");
  }
}

// Holographic table projector: base + additive hologram (a wireframe planet or ship), animated by ctx
export function holoTable(kit, ctx, pos, r = 1.4, opts = {}) {
  const { h = 0.9, content = "planet", color = IMP.holo } = opts;
  const [x, y, z] = pos;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(r, r + 0.1, h, 32), { pos: [x, y + h / 2, z], color: IMP.consoleDark, uv: "scale", uvScale: [4, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.08, 32), { pos: [x, y + h, z], color: IMP.steel, uv: "scale", uvScale: [4, 0.2] });
  kit.add("emitBlue", new THREE.TorusGeometry(r - 0.08, 0.02, 8, 48), { pos: [x, y + h + 0.03, z], rot: [Math.PI / 2, 0, 0] });
  kit.add("darkGloss", new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.02, 32), { pos: [x, y + h + 0.02, z] });
  // blink ring around the rim
  const grid = new THREE.CylinderGeometry(r + 0.001, r + 0.001, 0.14, 32, 1, true);
  kit.add("blink", grid, { pos: [x, y + h - 0.2, z], uv: "scale", uvScale: [6, 1] });
  // hologram
  const holo = new THREE.Group();
  holo.position.set(x, y + h + 1.1, z);
  const mats = ctx.mats;
  if (content === "planet") {
    holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), mats.holoWire));
    holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 16), mats.holo));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 48), mats.holo);
    ring.rotation.x = Math.PI / 2 - 0.3;
    holo.add(ring);
  } else {
    // wedge: the ship itself
    const shape = new THREE.Shape([new THREE.Vector2(0, 1.2), new THREE.Vector2(0.7, -0.9), new THREE.Vector2(-0.7, -0.9)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    holo.add(new THREE.Mesh(g, mats.holo));
    holo.add(new THREE.Mesh(g.clone(), mats.holoWire));
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.15), mats.holoWire);
    tower.position.set(0, 0.16, 0.55);
    holo.add(tower);
  }
  // light cone
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.0, r - 0.15, 2.0, 32, 1, true), mats.beam);
  cone.position.set(x, y + h + 1.0, z);
  kit.object(cone);
  kit.object(holo);
  ctx.animate((dt, t) => {
    holo.rotation.y += dt * 0.25;
    holo.position.y = y + h + 1.1 + Math.sin(t * 0.8) * 0.04;
    holo.children.forEach((c, i) => {
      if (c.material === mats.holo) c.material.opacity = 0.3 + 0.06 * Math.sin(t * 5 + i);
    });
  });
  pointLightDesc(ctx, color, 2.6, 6, [x, y + h + 1.4, z], 2);
  kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "holoTable");
  return holo;
}

// ===========================================================================
// Secondary-room props (command tower workstream). Additive block: tiers, instanced equipment racks,
// cable trays, glass partitions, screen arrays, alert beacons, floor stencils.
// ===========================================================================
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit } from "../kit.js";

// Thin blocking colliders around a footprint's four sides (for tiers too tall to step onto), leaving
// `gaps` ([side, a, b] along that side, side in n|s|w|e) open where stairs land.
export function sideColliders(kit, box, y, h, gaps = [], tag = "edge") {
  const [x0, z0, x1, z1] = box;
  const t = 0.05;
  const segs = { n: [[x0, x1]], s: [[x0, x1]], w: [[z0, z1]], e: [[z0, z1]] };
  for (const [side, a, b] of gaps) {
    const next = [];
    for (const [s0, s1] of segs[side]) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
    }
    segs[side] = next;
  }
  for (const [s0, s1] of segs.n) kit.collider([s0, y, z0 - t], [s1, y + h, z0 + t], tag);
  for (const [s0, s1] of segs.s) kit.collider([s0, y, z1 - t], [s1, y + h, z1 + t], tag);
  for (const [s0, s1] of segs.w) kit.collider([x0 - t, y, s0], [x0 + t, y + h, s1], tag);
  for (const [s0, s1] of segs.e) kit.collider([x1 - t, y, s0], [x1 + t, y + h, s1], tag);
}

// Raised deck tier. box = [x0, z0, x1, z1], from floor y up by `rise`: painted-steel body, dark deck
// top, steel nosing and a light strip under the lip on the sides listed in `lit`. Registers a walkable.
// Tiers up to 0.6 m need no colliders (the player steps up); taller ones pass collide: true and `gaps`
// (see sideColliders) where their stairs land.
export function platform(kit, ctx, box, y, rise, opts = {}) {
  const { tone = IMP.wallDark, top = "impDeck", strip = "emitBlue", lit = ["n", "s", "w", "e"], collide = false, gaps = [], tag = "platform", texel = 0.5, nosing = true } = opts;
  const [x0, z0, x1, z1] = box;
  kit.boxMM("impPaintedMetal", [x0, y, z0], [x1, y + rise - 0.04, z1], { color: IMP.trim, texel: 1 });
  kit.boxMM(top, [x0 + 0.03, y + rise - 0.08, z0 + 0.03], [x1 - 0.03, y + rise, z1 - 0.03], { color: tone, texel });
  const sides = {
    n: { c: [(x0 + x1) / 2, z0], out: [0, -1], len: x1 - x0 },
    s: { c: [(x0 + x1) / 2, z1], out: [0, 1], len: x1 - x0 },
    w: { c: [x0, (z0 + z1) / 2], out: [-1, 0], len: z1 - z0 },
    e: { c: [x1, (z0 + z1) / 2], out: [1, 0], len: z1 - z0 },
  };
  for (const [key, s] of Object.entries(sides)) {
    const horiz = key === "n" || key === "s";
    if (nosing) kit.box("impMetal", s.c[0] - s.out[0] * 0.05, y + rise + 0.006, s.c[1] - s.out[1] * 0.05, horiz ? s.len : 0.1, 0.012, horiz ? 0.1 : s.len, { color: IMP.steel });
    if (strip && lit.includes(key) && rise > 0.12) kit.box(strip, s.c[0] + s.out[0] * 0.006, y + rise - 0.1, s.c[1] + s.out[1] * 0.006, horiz ? s.len - 0.2 : 0.012, 0.02, horiz ? 0.012 : s.len - 0.2);
  }
  walkable(ctx, x0, z0, x1, z1, y + rise, tag);
  if (collide) sideColliders(kit, box, y, rise, gaps, tag);
}

// Equipment rack (signal-analysis / data cabinet) geometry, pre-merged per material: `body` for
// impPaintedMetal (vertex-coloured), `face` for blinkDense (indicator grid + status strip). Front is
// local +Z, origin at the floor centre. Feed both to kit.instanced so any number of racks is two draws.
export function rackGeometry(mats, opts = {}) {
  const { w = 0.8, h = 2.2, d = 0.9 } = opts;
  const k = new Kit(mats);
  k.box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: IMP.consoleDark, texel: 1 });
  k.box("impPaintedMetal", 0, 0.06, 0, w + 0.04, 0.12, d + 0.04, { color: IMP.trim, texel: 1 });
  k.box("impPaintedMetal", 0, h + 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: IMP.trim, texel: 1 });
  // door surround, side vent slats, handle, label plate
  k.box("impPaintedMetal", 0, h / 2, d / 2 + 0.01, w - 0.06, h - 0.24, 0.02, { color: IMP.trim, texel: 1 });
  k.box("impPaintedMetal", 0, h * 0.3, d / 2 + 0.025, w - 0.2, h * 0.24, 0.01, { color: IMP.wallDark, texel: 1 });
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) k.box("impPaintedMetal", s * (w / 2 + 0.006), h * 0.55 + i * 0.1, 0, 0.012, 0.03, d * 0.6, { color: IMP.gunmetal, texel: 1 });
  k.box("impPaintedMetal", w * 0.3, h * 0.42, d / 2 + 0.045, 0.03, 0.34, 0.03, { color: IMP.steel, texel: 1 });
  k.box("impPaintedMetal", -w * 0.12, h - 0.3, d / 2 + 0.03, w * 0.5, 0.12, 0.01, { color: IMP.wallMid, texel: 1 });
  k.box("blinkDense", 0, h * 0.66, d / 2 + 0.032, w - 0.26, h * 0.3, 0.008, { uv: "keep" });
  k.box("blinkDense", 0, h * 0.14, d / 2 + 0.032, w - 0.3, 0.05, 0.008, { uv: "keep" });
  const body = mergeGeometries(k.groups.get("impPaintedMetal"), false);
  const face = mergeGeometries(k.groups.get("blinkDense"), false);
  return { body, face, w, h, d };
}

// Rows of instanced racks. rows: [{ from: [x,z], to: [x,z], count, yaw }] — racks spaced evenly between
// the two centres, fronts facing local +Z rotated by yaw (0 faces +Z, PI faces -Z, PI/2 faces +X).
// One collider per row. Two draw calls total, however many racks.
export function rackRows(kit, ctx, y, rows, opts = {}) {
  const g = rackGeometry(kit.materials, opts);
  const transforms = [];
  for (const row of rows) {
    const n = Math.max(1, row.count);
    const xs = [];
    const zs = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = row.from[0] + (row.to[0] - row.from[0]) * t;
      const z = row.from[1] + (row.to[1] - row.from[1]) * t;
      transforms.push({ pos: [x, y, z], rot: [0, row.yaw || 0, 0] });
      xs.push(x);
      zs.push(z);
    }
    const along = Math.abs(Math.sin(row.yaw || 0)) > 0.5 ? [g.d / 2, g.w / 2] : [g.w / 2, g.d / 2];
    kit.collider([Math.min(...xs) - along[0], y, Math.min(...zs) - along[1]], [Math.max(...xs) + along[0], y + g.h + 0.1, Math.max(...zs) + along[1]], "rack");
  }
  kit.instanced("impPaintedMetal", g.body, transforms);
  kit.instanced("blinkDense", g.face, transforms);
  return transforms.length;
}

// Overhead cable tray between two [x,z] points at height y: painted rails, steel rungs, cable runs and
// optional drop rods up to `hang` (ceiling y).
export function cableTray(kit, from, to, y, opts = {}) {
  const { w = 0.6, cables = 3, hang = null, seed = 1, rungPitch = 0.8 } = opts;
  const rand = rng(seed);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.1) return;
  const ux = dx / L;
  const uz = dz / L;
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const at = (along, side, dy) => [from[0] + ux * along - uz * side, y + dy, from[1] + uz * along + ux * side];
  for (const s of [-1, 1]) {
    const p = at(L / 2, s * (w / 2), 0);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(L, 0.1, 0.05), { pos: p, quat: q, color: IMP.trim, texel: 1 });
  }
  for (let a = rungPitch / 2; a < L; a += rungPitch) {
    const p = at(a, 0, -0.03);
    kit.add("impMetal", new THREE.BoxGeometry(0.04, 0.03, w), { pos: p, quat: q, color: IMP.gunmetal });
  }
  for (let c = 0; c < cables; c++) {
    const side = (rand() - 0.5) * (w - 0.16);
    const r = 0.025 + rand() * 0.02;
    const p = at(L / 2, side, r);
    kit.add("impRubber", new THREE.BoxGeometry(L - 0.1, r * 2, r * 2), { pos: p, quat: q, color: IMP.rubber, texel: 2 });
  }
  if (hang !== null && hang > y + 0.2) {
    for (let a = 1; a < L; a += 3) {
      for (const s of [-1, 1]) {
        const p = at(a, s * (w / 2), (hang - y) / 2 + 0.05);
        kit.add("impPaintedMetal", new THREE.BoxGeometry(0.04, hang - y - 0.1, 0.04), { pos: p, quat: q, color: IMP.trim, texel: 1 });
      }
    }
  }
}

// Dark glass partition from -> to ([x,z]) at floor y, height h: painted frame, pane, collider.
export function glassWall(kit, from, to, y, h, opts = {}) {
  const { mat = "glassDark", sill = 0.1, frameW = 0.1, collide = true, mullions = 0, tag = "glassWall" } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.1) return;
  const ux = dx / L;
  const uz = dz / L;
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const at = (along, dy) => [from[0] + ux * along, y + dy, from[1] + uz * along];
  kit.add("impPaintedMetal", new THREE.BoxGeometry(L, Math.max(sill, 0.06), 0.16), { pos: at(L / 2, Math.max(sill, 0.06) / 2), quat: q, color: IMP.trim, texel: 1 });
  kit.add("impPaintedMetal", new THREE.BoxGeometry(L, 0.1, 0.16), { pos: at(L / 2, h - 0.05), quat: q, color: IMP.trim, texel: 1 });
  for (const a of [frameW / 2, L - frameW / 2]) kit.add("impPaintedMetal", new THREE.BoxGeometry(frameW, h, 0.14), { pos: at(a, h / 2), quat: q, color: IMP.trim, texel: 1 });
  for (let m = 1; m <= mullions; m++) kit.add("impMetal", new THREE.BoxGeometry(0.05, h - sill - 0.1, 0.1), { pos: at((L * m) / (mullions + 1), (h + sill) / 2 - 0.05), quat: q, color: IMP.gunmetal });
  const pane = new THREE.PlaneGeometry(L - frameW * 2, h - sill - 0.1);
  kit.add(mat, pane, { pos: at(L / 2, (h + sill) / 2 - 0.05), quat: q, uv: "keep" });
  if (collide) {
    const pad = 0.1;
    kit.collider([Math.min(from[0], to[0]) - pad, y, Math.min(from[1], to[1]) - pad], [Math.max(from[0], to[0]) + pad, y + h, Math.max(from[1], to[1]) + pad], tag);
  }
}

// Grid of tactical screens on a wall frame, centred at (u, v): cols x rows displays of sw x sh with a
// shared backing plate. variants picks from screen0..4.
export function screenArray(frame, u, v, cols, rows, sw, sh, opts = {}) {
  const { gap = 0.12, seed = 1, variants = [0, 1, 2], leds = false } = opts;
  const rand = rng(seed);
  const W = cols * sw + (cols - 1) * gap;
  const H = rows * sh + (rows - 1) * gap;
  frame.box("impPaintedMetal", u, v, 0.04, W + 0.3, H + 0.3, 0.06, { color: IMP.consoleDark, texel: 1 });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cu = u - W / 2 + sw / 2 + i * (sw + gap);
      const cv = v - H / 2 + sh / 2 + j * (sh + gap);
      frame.box("darkGloss", cu, cv, 0.08, sw + 0.03, sh + 0.03, 0.01);
      frame.box("screen" + variants[Math.floor(rand() * variants.length)], cu, cv, 0.087, sw, sh, 0.004, { uv: "keep" });
    }
  }
  if (leds) frame.box("leds", u, v - H / 2 - 0.24, 0.06, Math.min(W * 0.7, 3), 0.05, 0.01, { uv: "keep" });
  return { W, H };
}

// Alert beacon on a wall frame at (u, v): housing, coloured lens, louvre, and a low light descriptor.
export function alertBeacon(frame, ctx, u, v, opts = {}) {
  const { mat = "emitAmber", color = 0xffb020, intensity = 0.8, distance = 4, priority = 0 } = opts;
  frame.box("impPaintedMetal", u, v, 0.08, 0.36, 0.22, 0.16, { color: IMP.trim, texel: 1 });
  frame.box(mat, u, v, 0.165, 0.28, 0.13, 0.01);
  frame.box("impPaintedMetal", u, v, 0.175, 0.3, 0.02, 0.02, { color: IMP.trim, texel: 1 });
  if (ctx && intensity > 0) {
    const p = frame.pos(u, v, 0.5);
    pointLightDesc(ctx, color, intensity, distance, [p.x, p.y, p.z], priority);
  }
}

// Dark riser plates with a light seam under each nosing, for a stairs() run built with the same
// from/dir/w/y0 and n steps of stepH x tread: makes low, wide steps read as steps from the front.
export function stairRisers(kit, from, dir, w, y0, n, stepH, tread, opts = {}) {
  const { strip = "emitBlue", tone = IMP.trim } = opts;
  const horiz = Math.abs(dir[0]) > 0.5;
  for (let i = 0; i < n; i++) {
    const along = i * tread - 0.006;
    const px = from[0] + dir[0] * along;
    const pz = from[1] + dir[1] * along;
    kit.box("impPaintedMetal", px, y0 + i * stepH + stepH / 2, pz, horiz ? 0.012 : w - 0.1, stepH - 0.02, horiz ? w - 0.1 : 0.012, { color: tone, texel: 1 });
    kit.box(strip, px - dir[0] * 0.006, y0 + (i + 1) * stepH - 0.05, pz - dir[1] * 0.006, horiz ? 0.012 : w - 0.3, 0.02, horiz ? w - 0.3 : 0.012);
  }
}

// Stencil on a light placard plate with a dark surround, so ink glyphs read on dark wall panels.
export function placard(frame, u, v, s, idx, opts = {}) {
  const { tone = IMP.wallLight, n = 0 } = opts; // n: extra stand-off, e.g. when mounted on a plate
  frame.box("impPaintedMetal", u, v, n + 0.02, s + 0.24, s + 0.24, 0.03, { color: IMP.trim, texel: 1 });
  frame.box("impPanel", u, v, n + 0.03, s + 0.16, s + 0.16, 0.04, { color: tone, uv: "keep" });
  frame.quad("impDecal", u, v, n + 0.056, s, s, { uvRect: impDecalRect(idx) });
}

// Floor stencil: decal cell `idx`, size s, at (x, z) on floor y, rotated by yaw about the vertical.
export function floorDecal(kit, x, y, z, s, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(s, s);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("impDecal", g, { pos: [x, y + 0.008, z], uv: "keep", uvRect: impDecalRect(idx) });
}
