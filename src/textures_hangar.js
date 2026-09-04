// Hangar-deck textures (workstream HANGAR): a stencil decal atlas for the deck markings (landing pad
// ring, launch-lane arrow, rack / bay numbers, fighter footprint outline, drop-hazard sign) and the
// material that carries it. Canvas-generated; nothing downloaded.
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32, TexGen, fbm } from "./textures.js";
import { setDomain } from "./materials.js";

export const HG_DECAL_CELLS = 4;
/** Atlas cell -> [u0, v0, u1, v1] for kit `uvRect`. */
export function hgDecalRect(index) {
  const n = HG_DECAL_CELLS;
  const cx = index % n;
  const cy = Math.floor(index / n);
  const pad = 0.004;
  return [cx / n + pad, 1 - (cy + 1) / n + pad, (cx + 1) / n - pad, 1 - cy / n - pad];
}
export const HG_DECAL = {
  pad: 0, // circular landing pad ring
  launch: 1, // launch-lane arrow band
  num01: 2, // 2..13 = numbers 01..12
  tie: 14, // top-view fighter footprint outline
  drop: 15, // "open deck / drop" hazard sign
};
/** Atlas index of a two-digit number 1..12 (wraps). */
export function hgNumber(n) {
  return HG_DECAL.num01 + ((((n - 1) % 12) + 12) % 12);
}

export function makeHangarDecals(size = 1024, seed = 23) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / HG_DECAL_CELLS;
  ctx.clearRect(0, 0, size, size);
  const yellow = (a = 1) => `rgba(232,195,58,${a})`;
  const white = (a = 1) => `rgba(222,226,234,${a})`;
  const red = (a = 1) => `rgba(215,55,42,${a})`;
  const erode = (x0, y0) => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 220; k++) {
      ctx.globalAlpha = 0.25 + rand() * 0.6;
      const r = 1 + rand() * 4;
      ctx.beginPath();
      ctx.arc(x0 + rand() * cell, y0 + rand() * cell, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const at = (index, fn) => {
    const cx = (index % HG_DECAL_CELLS) * cell;
    const cy = Math.floor(index / HG_DECAL_CELLS) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    fn(cell);
    ctx.restore();
    erode(cx, cy);
  };
  // landing pad: outer ring, dashed inner ring, centre cross, four corner ticks
  at(HG_DECAL.pad, (s) => {
    const c0 = s / 2;
    ctx.strokeStyle = yellow();
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([s * 0.07, s * 0.045]);
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = white();
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(c0 - s * 0.12, c0);
    ctx.lineTo(c0 + s * 0.12, c0);
    ctx.moveTo(c0, c0 - s * 0.12);
    ctx.lineTo(c0, c0 + s * 0.12);
    ctx.stroke();
    ctx.fillStyle = yellow();
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillRect(c0 + dx * s * 0.2 - s * 0.012, c0 + dy * s * 0.2 - s * 0.05, s * 0.024, s * 0.1);
      ctx.fillRect(c0 + dx * s * 0.2 - s * 0.05, c0 + dy * s * 0.2 - s * 0.012, s * 0.1, s * 0.024);
    }
  });
  // launch lane: big chevron arrow with a stencil band underneath
  at(HG_DECAL.launch, (s) => {
    ctx.fillStyle = yellow();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.06);
    ctx.lineTo(s * 0.9, s * 0.42);
    ctx.lineTo(s * 0.72, s * 0.42);
    ctx.lineTo(s * 0.72, s * 0.62);
    ctx.lineTo(s * 0.28, s * 0.62);
    ctx.lineTo(s * 0.28, s * 0.42);
    ctx.lineTo(s * 0.1, s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = white();
    ctx.fillRect(s * 0.14, s * 0.7, s * 0.72, s * 0.05);
    // angular glyph row
    for (let g = 0; g < 7; g++) {
      const gx = s * 0.16 + g * s * 0.1;
      const k = g % 3;
      if (k === 0) ctx.fillRect(gx, s * 0.8, s * 0.07, s * 0.02), ctx.fillRect(gx, s * 0.8, s * 0.02, s * 0.1);
      else if (k === 1) ctx.fillRect(gx, s * 0.84, s * 0.07, s * 0.02), ctx.fillRect(gx + s * 0.05, s * 0.8, s * 0.02, s * 0.1);
      else ctx.fillRect(gx, s * 0.8, s * 0.07, s * 0.02), ctx.fillRect(gx, s * 0.88, s * 0.07, s * 0.02), ctx.fillRect(gx + s * 0.025, s * 0.8, s * 0.02, s * 0.1);
    }
  });
  // numbers 01..12 (stencil, underline bar)
  for (let n = 1; n <= 12; n++) {
    at(hgNumber(n), (s) => {
      ctx.fillStyle = white();
      ctx.font = `bold ${Math.floor(s * 0.66)}px "Arial Narrow", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n).padStart(2, "0"), s / 2, s / 2 - s * 0.02);
      ctx.fillRect(s * 0.14, s * 0.84, s * 0.72, s * 0.045);
    });
  }
  // fighter footprint (top view): two wing slabs, a ball, a centre cross — outline only
  at(HG_DECAL.tie, (s) => {
    ctx.strokeStyle = yellow();
    ctx.lineWidth = s * 0.028;
    ctx.strokeRect(s * 0.08, s * 0.22, s * 0.1, s * 0.56);
    ctx.strokeRect(s * 0.82, s * 0.22, s * 0.1, s * 0.56);
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.5);
    ctx.lineTo(s * 0.33, s * 0.5);
    ctx.moveTo(s * 0.67, s * 0.5);
    ctx.lineTo(s * 0.82, s * 0.5);
    ctx.stroke();
    ctx.setLineDash([s * 0.04, s * 0.03]);
    ctx.strokeStyle = white(0.8);
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.04, s * 0.12, s * 0.92, s * 0.76);
  });
  // drop hazard: red bordered triangle, falling-block glyph and a down arrow
  at(HG_DECAL.drop, (s) => {
    ctx.strokeStyle = red();
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.08);
    ctx.lineTo(s * 0.94, s * 0.86);
    ctx.lineTo(s * 0.06, s * 0.86);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = white();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.72);
    ctx.lineTo(s * 0.36, s * 0.55);
    ctx.lineTo(s * 0.44, s * 0.55);
    ctx.lineTo(s * 0.44, s * 0.36);
    ctx.lineTo(s * 0.56, s * 0.36);
    ctx.lineTo(s * 0.56, s * 0.55);
    ctx.lineTo(s * 0.64, s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(s * 0.3, s * 0.76, s * 0.4, s * 0.035);
  });
  return toTexture(c, { srgb: true, wrap: false, anisotropy: 8 });
}

// Open steel grating for catwalk decks: alpha cut-out (alphaTest), reads from both sides.
export function makeHangarGrate(size = 512, seed = 31) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, size, size);
  const n = 8; // bars per tile (tile = 1 m)
  const bar = size / n;
  ctx.fillStyle = "#5c6068";
  for (let i = 0; i < n; i++) {
    ctx.fillRect(i * bar, 0, bar * 0.28, size);
    ctx.fillRect(0, i * bar, size, bar * 0.18);
  }
  // wear highlights + grime
  for (let k = 0; k < 600; k++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(120,124,132,0.5)" : "rgba(20,22,26,0.5)";
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 6, 1 + rand() * 2);
  }
  return toTexture(c, { srgb: true, wrap: true, anisotropy: 8 });
}

// Kestrel ramp / hull tread: #c8781e chevrons on #1a1a1a, ~40 % coverage, worn at the edges.
export function makeTreadChevron(size = 256, seed = 7) {
  const t = new TexGen(size, size);
  // the albedo map is sRGB-tagged: feed sRGB components (THREE.Color would hand back linear ones)
  const a = { r: 0xc8 / 255, g: 0x78 / 255, b: 0x1e / 255 };
  const b = { r: 0x1a / 255, g: 0x1a / 255, b: 0x1a / 255 };
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (x) => x * x * (3 - 2 * x);
  t.each((u, v, i) => {
    const s = (u + v) % 1;
    const k = smooth(clamp01((Math.abs(s - 0.5) - 0.3) / 0.015));
    const n = fbm(u, v, { octaves: 4, freq: 10, seed });
    const wear = clamp01((n - 0.6) * 4);
    const col = k > 0.5 ? a : b;
    const lum = 1 - wear * 0.45;
    t.setColor(i, (col.r * (1 - wear * 0.5) + 0.3 * wear * 0.5) * lum, (col.g * (1 - wear * 0.5) + 0.3 * wear * 0.5) * lum, (col.b * (1 - wear * 0.5) + 0.3 * wear * 0.5) * lum);
    t.rough[i] = 0.75 + wear * 0.15;
    t.metal[i] = 0.15;
    t.height[i] = 0.5 + (k > 0.5 ? 0.06 : 0) - wear * 0.05;
  });
  const set = t.bake({ normalStrength: 1.2 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

let registered = null;
/**
 * Register the hangar workstream's materials on the shared library (keys prefixed `hangar_`), once.
 * Returns the keys: { decal, grate }.
 */
export function ensureHangarMaterials(materials) {
  if (registered && materials.hangar_decal) return registered;
  const decal = new THREE.MeshStandardMaterial({ map: makeHangarDecals(1024, 23), transparent: true, depthWrite: false, roughness: 0.75, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3, vertexColors: true });
  setDomain(decal, "interior");
  const grateTex = makeHangarGrate(512, 31);
  const grate = new THREE.MeshStandardMaterial({ map: grateTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.85, envMapIntensity: 0.7, vertexColors: true, color: 0xffffff });
  setDomain(grate, "interior");
  // containment-field corner glow: the shared additive glow sprite, tinted to the field's blue and kept
  // faint (round-2 critic: the corner quads were adding to the "blue pool" read of the opening)
  const glow = materials.glowDisc.clone();
  glow.color = new THREE.Color(0x4f8fff);
  glow.opacity = 0.2;
  // hairline blue for the coaming rim: emitBlueDim at 40 % (the rim reads by one faint line, not light bars)
  const blueDim = materials.emitBlueDim.clone();
  blueDim.emissiveIntensity = materials.emitBlueDim.emissiveIntensity * 0.4;
  setDomain(blueDim, "interior");
  // low-level amber for long runs of catwalk rail lighting (the full emitAmber reads as a laser line)
  const amberDim = materials.emitAmber.clone();
  amberDim.emissiveIntensity = 0.75;
  setDomain(amberDim, "interior");
  // ceiling troughs of the hangar complex: warm white at ≈ 30 % of the old emitWhiteSoft output
  const ceilWarm = materials.emitWhiteSoft.clone();
  ceilWarm.emissive = new THREE.Color("#ffd9a8");
  ceilWarm.color = new THREE.Color("#ffd9a8").multiplyScalar(0.08);
  ceilWarm.emissiveIntensity = 0.7;
  setDomain(ceilWarm, "interior");
  // cool-white flood lamp faces (shuttle bay) and warm interior spill panes (Kestrel door): dim glass
  const spillWarm = materials.emitAmber.clone();
  spillWarm.emissive = new THREE.Color("#ffc07a");
  spillWarm.emissiveIntensity = 1.2;
  spillWarm.transparent = true;
  spillWarm.opacity = 0.85;
  setDomain(spillWarm, "interior");
  const treadSet = makeTreadChevron(256, 7);
  const tread = new THREE.MeshStandardMaterial({ map: treadSet.map, roughnessMap: treadSet.roughnessMap, metalnessMap: treadSet.metalnessMap, normalMap: treadSet.normalMap, roughness: 1, metalness: 1, vertexColors: true, color: 0xffffff, envMapIntensity: 0.4 });
  setDomain(tread, "interior");
  materials.hangar_decal = decal;
  materials.hangar_grate = grate;
  materials.hangar_glowBlue = glow;
  materials.hangar_blueDim = blueDim;
  materials.hangar_amberDim = amberDim;
  materials.hangar_ceilWarm = ceilWarm;
  materials.hangar_spillWarm = spillWarm;
  materials.hangar_tread = tread;
  registered = { decal: "hangar_decal", grate: "hangar_grate", glow: "hangar_glowBlue", blueDim: "hangar_blueDim", amberDim: "hangar_amberDim", ceilWarm: "hangar_ceilWarm", tread: "hangar_tread" };
  return registered;
}
