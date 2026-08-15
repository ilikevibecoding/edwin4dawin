import * as THREE from "three";
import { GLOBAL_SEED, fbm2, ridged2, valueNoise2, mulberry32 } from "./rng.js";
import { PALETTE } from "./layout.js";

const cache = new Map();
let wearAmount = 0.85;

export function setWearAmount(v) {
  wearAmount = THREE.MathUtils.clamp(v, 0, 1);
}

export function getWearAmount() {
  return wearAmount;
}

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return { c, ctx: c.getContext("2d", { willReadFrequently: true }) };
}

function toTexture(c, repeat = 2, wrap = THREE.RepeatWrapping) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = wrap;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function toDataTexture(c, repeat = 2, colorSpace = THREE.NoColorSpace) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function heightToNormal(src, strength = 2.4) {
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  const srcData = sctx.getImageData(0, 0, w, h).data;
  const { c, ctx } = canvas(w);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const lum = (i) => srcData[i] * 0.35 + srcData[i + 1] * 0.45 + srcData[i + 2] * 0.2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = lum((((x - 1 + w) % w) + y * w) * 4);
      const r = lum((((x + 1) % w) + y * w) * 4);
      const u = lum((x + ((y - 1 + h) % h) * w) * 4);
      const dn = lum((x + ((y + 1) % h) * w) * 4);
      const nx = (l - r) * strength;
      const ny = (dn - u) * strength;
      const nz = 255;
      const inv = 127.5 / Math.hypot(nx, ny, nz);
      const i = (x + y * w) * 4;
      d[i] = nx * inv + 128;
      d[i + 1] = ny * inv + 128;
      d[i + 2] = nz * inv + 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function paintPixels(size, fn) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const [r, g, b, a = 255] = fn(u, v, x, y);
      const i = (x + y * size) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function mix3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function paintedSteelMaps(baseHex, size = 512, seedOff = 0) {
  const base = hexToRgb(baseHex);
  const dirt = [62, 54, 44];
  const rust = [110, 58, 32];
  const chip = [78, 82, 86];
  const albedo = paintPixels(size, (u, v) => {
    const n = fbm2(u * 7 + seedOff, v * 7, 5);
    const n2 = fbm2(u * 19 + 3, v * 17 + seedOff, 4);
    const edge = Math.pow(Math.min(u, v, 1 - u, 1 - v) * 2.2, 0.55);
    const wear = clamp01((n2 - 0.62) * 3.4) * wearAmount;
    const chipAmt = clamp01((n2 - 0.78) * 8) * wearAmount * (1.15 - edge);
    const rustAmt = clamp01((fbm2(u * 11, v * 5 + 8, 3) - 0.72) * 6) * wearAmount * (1 - edge);
    const foot = clamp01((v - 0.55) * 1.6) * fbm2(u * 4, v * 3, 3) * 0.22 * wearAmount;
    let col = mix3(base, dirt, n * 0.16 + wear * 0.28 + foot);
    col = mix3(col, rust, rustAmt * 0.55);
    col = mix3(col, chip, chipAmt);
    const speckle = (valueNoise2(u * 80, v * 80) - 0.5) * 10;
    return [col[0] + speckle, col[1] + speckle, col[2] + speckle];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 9 + seedOff, v * 9, 4);
    const grease = clamp01((fbm2(u * 6, v * 3 + 4, 3) - 0.55) * 2) * 0.25;
    const g = lerp(118, 200, n) - grease * 80;
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const n = fbm2(u * 14 + seedOff, v * 14, 4);
    const rivet =
      Math.hypot((u * 8) % 1 - 0.5, (v * 8) % 1 - 0.5) < 0.07
        ? 40
        : 0;
    const g = n * 180 + 40 + rivet;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, 1.8) };
}

function metalMaps(size = 512, brushed = true) {
  const albedo = paintPixels(size, (u, v) => {
    const grain = brushed
      ? fbm2(u * 2, v * 70, 3) * 0.55 + fbm2(u * 40, v * 4, 2) * 0.2
      : fbm2(u * 18, v * 18, 4);
    const oil = clamp01(fbm2(u * 5, v * 3 + 2, 3) - 0.5) * 0.35 * wearAmount;
    const g = lerp(58, 118, grain) - oil * 30;
    return [g * 0.95, g, g * 1.04];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 12, v * 12, 4);
    const oil = clamp01(fbm2(u * 4, v * 6, 3) - 0.48) * wearAmount;
    const g = lerp(40, 130, n) - oil * 50;
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const n = brushed ? fbm2(u * 3, v * 60, 3) : fbm2(u * 20, v * 20, 4);
    const g = n * 200 + 30;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, brushed ? 1.1 : 2.2) };
}

function oilyMaps(size = 512) {
  const albedo = paintPixels(size, (u, v) => {
    const n = fbm2(u * 8, v * 8, 5);
    const stain = ridged2(u * 6 + 2, v * 4, 3);
    const g = lerp(28, 52, n) + stain * 8;
    return [g * 0.85, g * 0.9, g];
  });
  const rough = paintPixels(size, (u, v) => {
    const oil = ridged2(u * 5, v * 7, 4);
    const g = lerp(30, 110, 1 - oil);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const n = fbm2(u * 16, v * 16, 4);
    return [n * 160 + 50, n * 160 + 50, n * 160 + 50];
  });
  return { albedo, rough, normal: heightToNormal(height, 1.6) };
}

function rubberMaps(size = 512) {
  const albedo = paintPixels(size, (u, v) => {
    const dim = 18;
    const gx = Math.abs(((u * dim) % 1) - 0.5);
    const gy = Math.abs(((v * dim) % 1) - 0.5);
    const diamond = clamp01(0.22 - (gx + gy) * 0.55);
    const wear = fbm2(u * 6, v * 6, 4) * wearAmount;
    const g = 32 + diamond * 18 + wear * 14;
    return [g + 4, g, g - 2];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 10, v * 10, 3);
    const g = lerp(170, 230, n);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const dim = 18;
    const gx = Math.abs(((u * dim) % 1) - 0.5);
    const gy = Math.abs(((v * dim) % 1) - 0.5);
    const diamond = clamp01(0.22 - (gx + gy) * 0.55);
    const g = 80 + diamond * 140;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, 3.2) };
}

function fabricMaps(base, size = 512) {
  const albedo = paintPixels(size, (u, v) => {
    const weave = ((Math.sin(u * Math.PI * 90) * 0.5 + 0.5) * 0.35 +
      (Math.sin(v * Math.PI * 70) * 0.5 + 0.5) * 0.35);
    const wrinkle = fbm2(u * 5, v * 4, 4);
    const fold = Math.pow(Math.abs(Math.sin(v * Math.PI * 3 + wrinkle * 2)), 1.4);
    const lint = valueNoise2(u * 60, v * 60);
    const t = clamp01(0.35 + weave * 0.25 + wrinkle * 0.2 - fold * 0.18);
    const col = mix3(mix3(base, [20, 18, 16], 0.15), [base[0] + 30, base[1] + 28, base[2] + 22], t);
    const speckle = (lint - 0.5) * 12;
    return [col[0] + speckle, col[1] + speckle, col[2] + speckle];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 8, v * 8, 3);
    const g = lerp(150, 230, n);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const weave = Math.sin(u * Math.PI * 90) * 8 + Math.sin(v * Math.PI * 70) * 8;
    const wrinkle = fbm2(u * 5, v * 4, 4) * 80;
    const g = 110 + weave + wrinkle;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, 2.6) };
}

function plasticMaps(size = 256) {
  const albedo = paintPixels(size, (u, v) => {
    const n = fbm2(u * 10, v * 10, 3);
    const g = lerp(36, 52, n);
    return [g + 4, g, g - 2];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 14, v * 14, 3);
    const g = lerp(70, 140, n);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const n = fbm2(u * 20, v * 20, 3);
    return [n * 80 + 90, n * 80 + 90, n * 80 + 90];
  });
  return { albedo, rough, normal: heightToNormal(height, 1.2) };
}

function wetMaps(size = 512) {
  const albedo = paintPixels(size, (u, v) => {
    const drop = ridged2(u * 18, v * 16, 3);
    const streak = fbm2(u * 3, v * 14, 3);
    const g = lerp(70, 110, streak);
    const d = drop > 0.78 ? 18 : 0;
    return [g + d, g + d * 0.9, g + d * 0.7];
  });
  const rough = paintPixels(size, (u, v) => {
    const drop = ridged2(u * 18, v * 16, 3);
    const streak = fbm2(u * 3, v * 14, 3);
    const wet = clamp01(streak * 0.7 + (drop > 0.74 ? 0.8 : 0));
    const g = lerp(200, 25, wet);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const drop = ridged2(u * 18, v * 16, 3);
    const g = drop > 0.76 ? 200 : 90 + fbm2(u * 8, v * 8, 3) * 40;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, 3.4) };
}

function pipeMaps(hex, size = 512) {
  const base = hexToRgb(hex);
  const albedo = paintPixels(size, (u, v) => {
    const ring = Math.pow(Math.abs(Math.sin(v * Math.PI * 10)), 8) * 18;
    const n = fbm2(u * 8, v * 8, 4);
    const rust = clamp01((fbm2(u * 12, v * 4, 3) - 0.7) * 5) * wearAmount;
    let col = mix3(base, [40, 38, 34], n * 0.2);
    col = mix3(col, [108, 56, 30], rust * 0.7);
    return [col[0] + ring, col[1] + ring, col[2] + ring];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 10, v * 10, 3);
    const g = lerp(90, 180, n);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const ring = Math.pow(Math.abs(Math.sin(v * Math.PI * 10)), 8) * 70;
    const n = fbm2(u * 16, v * 16, 3) * 50;
    const g = 90 + ring + n;
    return [g, g, g];
  });
  return { albedo, rough, normal: heightToNormal(height, 1.7) };
}

function grateMaps(size = 512) {
  const albedo = paintPixels(size, (u, v) => {
    const bars = 10;
    const bx = Math.abs(((u * bars) % 1) - 0.5);
    const by = Math.abs(((v * bars) % 1) - 0.5);
    const hole = bx > 0.18 && by > 0.18 ? 1 : 0;
    const metal = 48 + fbm2(u * 20, v * 20, 3) * 20;
    if (hole) return [18, 16, 14, 220];
    return [metal, metal * 0.95, metal * 0.88];
  });
  const rough = paintPixels(size, (u, v) => {
    const n = fbm2(u * 12, v * 12, 3);
    const g = lerp(80, 160, n);
    return [g, g, g];
  });
  const height = paintPixels(size, (u, v) => {
    const bars = 10;
    const bx = Math.abs(((u * bars) % 1) - 0.5);
    const by = Math.abs(((v * bars) % 1) - 0.5);
    const hole = bx > 0.18 && by > 0.18 ? 20 : 180;
    return [hole, hole, hole];
  });
  return { albedo, rough, normal: heightToNormal(height, 2.8) };
}

function makeMat(maps, opts, repeat = 2) {
  const map = toTexture(maps.albedo, repeat);
  const roughnessMap = toDataTexture(maps.rough, repeat);
  const normalMap = toDataTexture(maps.normal, repeat);
  return new THREE.MeshPhysicalMaterial({
    map,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.65,
    metalness: 0.2,
    envMapIntensity: 0.85,
    ...opts,
  });
}

export function createLabelTexture(text, opts = {}) {
  const w = opts.w || 256;
  const h = opts.h || 96;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = opts.bg || "#c9a24a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1a140c";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = opts.fg || "#1a140c";
  ctx.font = `bold ${opts.size || 28}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = String(text).split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (opts.size || 28) * 1.1);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function createGaugeFace(label, value = 0.42, units = "BAR") {
  const { c, ctx } = canvas(256);
  ctx.fillStyle = "#d8d2c4";
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a2a28";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.translate(128, 128);
  ctx.fillStyle = "#222";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 36);
  ctx.font = "12px sans-serif";
  ctx.fillText(units, 0, 54);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (Math.PI * 1.5 * i) / 10;
    ctx.strokeStyle = i >= 8 ? "#a03020" : "#222";
    ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 88, Math.sin(a) * 88);
    ctx.lineTo(Math.cos(a) * 104, Math.sin(a) * 104);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return { texture: t, value };
}

export function createDisplayTexture(kind, time = 0) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext("2d");
  const draw = (t) => {
    ctx.fillStyle = "#07140e";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "#163822";
    ctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 320);
      ctx.stroke();
    }
    for (let y = 0; y < 320; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#3dba6e";
    ctx.font = "12px monospace";
    if (kind === "sonar") {
      ctx.fillText("ACTIVE SONAR  ·  FWD ARRAY", 16, 20);
      ctx.fillText("RNG  4.0 km    PRF  1.2", 16, 38);
      ctx.strokeStyle = "#1f6a3a";
      ctx.beginPath();
      ctx.arc(256, 175, 130, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(256, 175, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(256, 175, 40, 0, Math.PI * 2);
      ctx.stroke();
      const sweep = (t * 0.7) % (Math.PI * 2);
      const grad = ctx.createRadialGradient(256, 175, 0, 256, 175, 130);
      grad.addColorStop(0, "rgba(61,186,110,0.0)");
      grad.addColorStop(1, "rgba(61,186,110,0.0)");
      ctx.fillStyle = "rgba(61,186,110,0.12)";
      ctx.beginPath();
      ctx.moveTo(256, 175);
      ctx.arc(256, 175, 130, sweep - 0.45, sweep);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#7dff9a";
      ctx.beginPath();
      ctx.moveTo(256, 175);
      ctx.lineTo(256 + Math.cos(sweep) * 130, 175 + Math.sin(sweep) * 130);
      ctx.stroke();
      ctx.fillStyle = "#8ee8a8";
      ctx.fillText("NO CONTACT", 210, 300);
    } else if (kind === "nav") {
      ctx.fillText("NAV  ·  DEAD RECKONING", 16, 20);
      ctx.fillText("HDG  247°   SPD  4.2 kn", 16, 40);
      ctx.fillText("LAT  34°12.4' N", 16, 60);
      ctx.fillText("LON  148°03.1' E", 16, 80);
      ctx.strokeStyle = "#3dba6e";
      ctx.beginPath();
      ctx.moveTo(40, 280);
      let x = 40;
      let y = 200;
      for (let i = 0; i < 18; i++) {
        x += 22;
        y += Math.sin(i * 0.7 + t * 0.15) * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillText("TRACK  NEREID-4", 16, 300);
    } else if (kind === "depth") {
      ctx.fillText("DEPTH / PRESSURE", 16, 20);
      ctx.font = "28px monospace";
      ctx.fillText("412.4 m", 16, 70);
      ctx.font = "12px monospace";
      ctx.fillText("HULL  4.18 MPa    SAFE", 16, 100);
      ctx.strokeStyle = "#3dba6e";
      ctx.beginPath();
      ctx.moveTo(30, 260);
      for (let i = 0; i < 40; i++) {
        const y = 220 + Math.sin(i * 0.35 + t * 0.4) * 18 + i * 0.2;
        ctx.lineTo(30 + i * 11, y);
      }
      ctx.stroke();
      ctx.fillText("TREND  +0.4 m / min", 16, 300);
    } else if (kind === "status") {
      ctx.fillText("PLANT STATUS", 16, 20);
      const rows = [
        ["PROP MOTOR", "NOM"],
        ["REDUCTION", "NOM"],
        ["BALLAST A", "HOLD"],
        ["BALLAST B", "HOLD"],
        ["HYD PRESS", "18.4"],
        ["BATTERY", "86%"],
        ["SCRUBBER", "ON"],
        ["COOLANT", "41°C"],
      ];
      rows.forEach((r, i) => {
        ctx.fillStyle = "#3dba6e";
        ctx.fillText(r[0], 24, 56 + i * 28);
        ctx.fillStyle = "#c4a04a";
        ctx.fillText(r[1], 360, 56 + i * 28);
      });
    } else if (kind === "helm") {
      ctx.fillText("HELM  ·  COURSE KEEP", 16, 20);
      ctx.beginPath();
      ctx.arc(256, 170, 100, 0, Math.PI * 2);
      ctx.strokeStyle = "#3dba6e";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(256, 170);
      ctx.lineTo(256 + Math.cos(-0.7) * 80, 170 + Math.sin(-0.7) * 80);
      ctx.stroke();
      ctx.fillText("RUD  2° P    PLANES  1° D", 16, 300);
    }
    const scan = ctx.getImageData(0, 0, 512, 320);
    const d = scan.data;
    const rng = mulberry32(0x51 + ((t * 10) | 0));
    for (let i = 0; i < d.length; i += 16) {
      const n = (rng() - 0.5) * 18;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(scan, 0, 0);
  };
  draw(time);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas: c, ctx, texture, draw, kind };
}

export function createMaterials() {
  if (cache.has("mats")) return cache.get("mats");

  const hull = paintedSteelMaps(PALETTE.hullWarm, 512, 0);
  const hullG = paintedSteelMaps(PALETTE.hullGreen, 512, 2);
  const chip = paintedSteelMaps(0x8a8680, 512, 5);
  const brushed = metalMaps(512, true);
  const oily = oilyMaps(512);
  const rubber = rubberMaps(512);
  const fabricN = fabricMaps([52, 62, 74], 512);
  const fabricO = fabricMaps([86, 82, 56], 512);
  const plastic = plasticMaps(256);
  const wet = wetMaps(512);
  const pipeW = pipeMaps(0xb7b29f, 512);
  const pipeB = pipeMaps(0x3d4a55, 512);
  const pipeO = pipeMaps(0xa85a28, 512);
  const grate = grateMaps(512);
  const leather = fabricMaps([62, 42, 30], 256);

  const mats = {
    hullPaint: makeMat(hull, {
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.12,
      clearcoat: 0.12,
      clearcoatRoughness: 0.45,
    }, 3),
    hullGreen: makeMat(hullG, {
      roughness: 0.64,
      metalness: 0.14,
      clearcoat: 0.08,
    }, 2.5),
    chippedPaint: makeMat(chip, {
      roughness: 0.7,
      metalness: 0.22,
    }, 2),
    brushedMetal: makeMat(brushed, {
      roughness: 0.32,
      metalness: 0.86,
      envMapIntensity: 1.15,
    }, 1.5),
    oilyMachinery: makeMat(oily, {
      roughness: 0.38,
      metalness: 0.78,
      envMapIntensity: 1.05,
    }, 2),
    rubber: makeMat(rubber, {
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.25,
    }, 4),
    fabric: makeMat(fabricN, {
      roughness: 0.88,
      metalness: 0.0,
      sheen: 0.55,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color(0x8899aa),
      envMapIntensity: 0.3,
    }, 2),
    fabricOlive: makeMat(fabricO, {
      roughness: 0.9,
      metalness: 0.0,
      sheen: 0.4,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color(0xaa9966),
      envMapIntensity: 0.28,
    }, 2),
    leather: makeMat(leather, {
      roughness: 0.72,
      metalness: 0.04,
      sheen: 0.25,
      sheenColor: new THREE.Color(0x553322),
    }, 1.5),
    plastic: makeMat(plastic, {
      roughness: 0.48,
      metalness: 0.04,
      envMapIntensity: 0.55,
    }, 1),
    bakelite: makeMat(plastic, {
      color: 0x3a2e22,
      roughness: 0.55,
      metalness: 0.02,
    }, 1),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9bb8bc,
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.0,
      transparent: true,
      opacity: 0.22,
      ior: 1.5,
      thickness: 0.08,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
    glassThick: new THREE.MeshPhysicalMaterial({
      color: 0x7a9aa0,
      roughness: 0.08,
      metalness: 0.02,
      transparent: true,
      opacity: 0.28,
      envMapIntensity: 1.8,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    wetMetal: makeMat(wet, {
      roughness: 0.22,
      metalness: 0.7,
      clearcoat: 0.45,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.2,
    }, 2),
    paintedPipe: makeMat(pipeW, {
      roughness: 0.58,
      metalness: 0.18,
    }, 1),
    pipeBlue: makeMat(pipeB, {
      roughness: 0.5,
      metalness: 0.22,
    }, 1),
    pipeOrange: makeMat(pipeO, {
      roughness: 0.55,
      metalness: 0.16,
    }, 1),
    antiSlip: makeMat(rubber, {
      color: 0x2c2a28,
      roughness: 0.95,
      metalness: 0.02,
    }, 5),
    grate: makeMat(grate, {
      roughness: 0.55,
      metalness: 0.65,
      transparent: true,
      alphaTest: 0.15,
    }, 2),
    emissiveGreen: new THREE.MeshStandardMaterial({
      color: 0x08140c,
      emissive: 0x3dba6e,
      emissiveIntensity: 0.85,
      roughness: 0.4,
      metalness: 0.1,
    }),
    emissiveAmber: new THREE.MeshStandardMaterial({
      color: 0x1a1006,
      emissive: 0xe0a030,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    }),
    emissiveRed: new THREE.MeshStandardMaterial({
      color: 0x140606,
      emissive: 0xa02020,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    }),
    emissiveWarm: new THREE.MeshStandardMaterial({
      color: 0x22180c,
      emissive: 0xffcc88,
      emissiveIntensity: 1.1,
      roughness: 0.35,
    }),
    blackout: new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.9,
      metalness: 0,
    }),
    brass: makeMat(brushed, {
      color: 0xb08a46,
      roughness: 0.35,
      metalness: 0.85,
    }, 1),
    rust: makeMat(chip, {
      color: 0x6a3a22,
      roughness: 0.82,
      metalness: 0.25,
    }, 2),
  };

  cache.set("mats", mats);
  return mats;
}

export function createStencil(text, color = "#c9a24a") {
  return createLabelTexture(text, { bg: color, w: 320, h: 80, size: 26 });
}
