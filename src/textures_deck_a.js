// Deck A command rooms (ROOMS-A): canvas textures and materials shared by intel, ready room, comms,
// tactical and navigation. Star chart / tactical map / scrolling waveform screens, amber + cyan
// hologram variants, line-hologram materials and a pulsing red alert emissive. Registered lazily
// under the `deckA_` prefix by ensureDeckAMaterials(materials) so several rooms can share them.
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "./textures.js";
import { setDomain } from "./materials.js";

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// angular block glyphs (original set, same family as the Imperial screens)
function glyphRow(ctx, rand, x, y, n, color, s = 6) {
  for (let g = 0; g < n; g++) {
    ctx.fillStyle = color;
    const gx = x + g * (s + 3);
    const k = Math.floor(rand() * 5);
    const t = Math.max(1, s / 3);
    if (k === 0) ctx.fillRect(gx, y, s, s);
    else if (k === 1) {
      ctx.fillRect(gx, y, s, t);
      ctx.fillRect(gx, y + s - t, s, t);
    } else if (k === 2) {
      ctx.fillRect(gx, y, t, s);
      ctx.fillRect(gx + s - t, y, t, s);
    } else if (k === 3) {
      ctx.fillRect(gx, y, s, t);
      ctx.fillRect(gx + s / 2 - t / 2, y, t, s);
    } else {
      ctx.fillRect(gx, y + s - t, s, t);
      ctx.fillRect(gx, y, t, s);
    }
  }
}

function grid(ctx, w, h, color, minor, major, alphaMinor = 0.12, alphaMajor = 0.3) {
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += minor) {
    ctx.strokeStyle = rgba(color, x % major === 0 ? alphaMajor : alphaMinor);
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.strokeStyle = rgba(color, y % major === 0 ? alphaMajor : alphaMinor);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
}

function finishScreen(ctx, w, h, vignette = 0.45) {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
  const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.72);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, `rgba(0,0,0,${vignette})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Navigation star chart: deep field, amber plotting grid, three hyperlane arcs (one active), waypoint
// tags, the ship's own position wedge and a data column.
// ---------------------------------------------------------------------------
export function makeStarChart(w = 1024, h = 512, seed = 21) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const amber = "#ffb347";
  const bright = "#ffe0a8";
  const cold = "#9fc4ff";
  ctx.fillStyle = "#03050c";
  ctx.fillRect(0, 0, w, h);
  const neb = ctx.createRadialGradient(w * 0.62, h * 0.42, 10, w * 0.62, h * 0.42, w * 0.55);
  neb.addColorStop(0, "rgba(60,50,110,0.35)");
  neb.addColorStop(0.5, "rgba(30,40,90,0.15)");
  neb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, w, h);
  grid(ctx, w, h, amber, 32, 128, 0.08, 0.22);
  // stars
  for (let k = 0; k < 700; k++) {
    const x = rand() * w;
    const y = rand() * h;
    const big = rand() < 0.05;
    ctx.fillStyle = rgba(rand() < 0.8 ? "#ffffff" : cold, 0.35 + rand() * 0.65);
    ctx.fillRect(x, y, big ? 2.5 : 1.2, big ? 2.5 : 1.2);
  }
  // hyperlanes
  const lanes = [
    { p: [0.08, 0.82, 0.35, 0.15, 0.7, 0.4, 0.95, 0.3], a: 0.35, lw: 1.5 },
    { p: [0.05, 0.3, 0.3, 0.55, 0.6, 0.85, 0.95, 0.7], a: 0.35, lw: 1.5 },
    { p: [0.12, 0.62, 0.42, 0.2, 0.62, 0.62, 0.88, 0.5], a: 1.0, lw: 3 },
  ];
  for (const ln of lanes) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = ln.p;
    ctx.strokeStyle = rgba(amber, ln.a);
    ctx.lineWidth = ln.lw;
    ctx.setLineDash(ln.a < 1 ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(x0 * w, y0 * h);
    ctx.bezierCurveTo(x1 * w, y1 * h, x2 * w, y2 * h, x3 * w, y3 * h);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // waypoints on the active lane
  const wps = [[0.12, 0.62], [0.36, 0.36], [0.55, 0.5], [0.72, 0.56], [0.88, 0.5]];
  for (let i = 0; i < wps.length; i++) {
    const [fx, fy] = wps[i];
    ctx.strokeStyle = i === 2 ? "#ff5a3a" : bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx * w, fy * h, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(bright, 0.9);
    ctx.fillRect(fx * w - 1.5, fy * h - 1.5, 3, 3);
    glyphRow(ctx, rand, fx * w + 14, fy * h - 4, 4, rgba(bright, 0.9), 7);
    ctx.fillStyle = rgba(amber, 0.6);
    ctx.fillRect(fx * w + 14, fy * h + 8, 30 + rand() * 30, 2);
  }
  // own ship: wedge marker + heading vector at the first waypoint
  {
    const x = wps[0][0] * w;
    const y = wps[0][1] * h;
    ctx.fillStyle = bright;
    ctx.beginPath();
    ctx.moveTo(x + 18, y - 24);
    ctx.lineTo(x + 26, y - 6);
    ctx.lineTo(x + 10, y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(bright, 0.6);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 18, y - 24);
    ctx.lineTo(x + 120, y - 130);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // header strip + data column on the right
  const pad = 14;
  ctx.fillStyle = rgba(amber, 0.9);
  ctx.fillRect(pad, pad, w - pad * 2, 2);
  ctx.fillRect(pad, pad + 7, 160, 10);
  for (let k = 0; k < 5; k++) ctx.fillRect(w - pad - 140 + k * 28, pad + 7, 20, 10);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(w - 190, 44, 176, h - 60);
  ctx.strokeStyle = rgba(amber, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(w - 190 + 0.5, 44.5, 176, h - 60);
  let y = 60;
  while (y < h - 30) {
    glyphRow(ctx, rand, w - 180, y, 5 + Math.floor(rand() * 5), rgba(rand() < 0.12 ? "#ff5a3a" : amber, 0.85), 6);
    ctx.fillStyle = rgba(amber, 0.25);
    ctx.fillRect(w - 180, y + 10, 150, 3);
    ctx.fillStyle = rgba(bright, 0.8);
    ctx.fillRect(w - 180, y + 10, 150 * rand(), 3);
    y += 22;
  }
  // range scale bottom-left
  ctx.fillStyle = rgba(amber, 0.8);
  for (let k = 0; k < 9; k++) ctx.fillRect(pad + k * 18, h - pad - 8, 2, k % 4 === 0 ? 8 : 4);
  ctx.fillRect(pad, h - pad - 1, 8 * 18 + 2, 1.5);
  finishScreen(ctx, w, h, 0.4);
  return toTexture(c, { srgb: true, wrap: false });
}

// ---------------------------------------------------------------------------
// Tactical situation map: range rings around the ship wedge, sector grid, contacts (hostile red
// squares, friendly blue triangles) with vector lines, data sidebars.
// ---------------------------------------------------------------------------
export function makeTacticalMap(w = 1024, h = 512, seed = 33) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const blue = "#3fb0ff";
  const bright = "#bfe4ff";
  const red = "#ff4a3a";
  ctx.fillStyle = "#020610";
  ctx.fillRect(0, 0, w, h);
  grid(ctx, w, h, blue, 32, 128, 0.07, 0.18);
  const cx = w * 0.5;
  const cy = h * 0.52;
  // range rings + bearing spokes
  ctx.lineWidth = 1;
  for (let r = 50; r < h * 0.5; r += 50) {
    ctx.strokeStyle = rgba(blue, r % 100 === 0 ? 0.45 : 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.strokeStyle = rgba(blue, k % 3 === 0 ? 0.4 : 0.15);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * h * 0.48, cy + Math.sin(a) * h * 0.48);
    ctx.stroke();
  }
  // own ship wedge (top view, bow up)
  ctx.strokeStyle = bright;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 34);
  ctx.lineTo(cx + 14, cy + 22);
  ctx.lineTo(cx - 14, cy + 22);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = rgba(bright, 0.35);
  ctx.fill();
  ctx.fillRect(cx - 4, cy + 4, 8, 8);
  // contacts
  for (let k = 0; k < 14; k++) {
    const a = rand() * Math.PI * 2;
    const r = 60 + rand() * h * 0.42;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const hostile = rand() < 0.4;
    ctx.strokeStyle = hostile ? red : blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (hostile) ctx.rect(x - 6, y - 6, 12, 12);
    else {
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 7, y + 6);
      ctx.lineTo(x - 7, y + 6);
      ctx.closePath();
    }
    ctx.stroke();
    // velocity vector
    const va = a + (rand() - 0.5) * 2;
    ctx.strokeStyle = rgba(hostile ? red : blue, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(va) * (12 + rand() * 30), y + Math.sin(va) * (12 + rand() * 30));
    ctx.stroke();
    glyphRow(ctx, rand, x + 10, y - 12, 3, rgba(hostile ? red : bright, 0.85), 5);
  }
  // sidebars
  const pad = 14;
  for (const side of [0, 1]) {
    const x0 = side === 0 ? pad : w - pad - 170;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x0, 40, 170, h - 56);
    ctx.strokeStyle = rgba(blue, 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, 40.5, 170, h - 56);
    let y = 56;
    while (y < h - 30) {
      const warn = rand() < 0.1;
      glyphRow(ctx, rand, x0 + 10, y, 4 + Math.floor(rand() * 5), rgba(warn ? red : blue, 0.85), 6);
      ctx.fillStyle = rgba(blue, 0.22);
      ctx.fillRect(x0 + 10, y + 10, 150, 3);
      ctx.fillStyle = rgba(warn ? red : bright, 0.8);
      ctx.fillRect(x0 + 10, y + 10, 150 * rand(), 3);
      y += 20;
    }
  }
  ctx.fillStyle = rgba(blue, 0.9);
  ctx.fillRect(pad, pad, w - pad * 2, 2);
  ctx.fillRect(pad, pad + 7, 180, 10);
  ctx.fillStyle = rgba(red, 0.9);
  for (let k = 0; k < 3; k++) ctx.fillRect(w - pad - 90 + k * 30, pad + 7, 22, 10);
  finishScreen(ctx, w, h, 0.4);
  return toTexture(c, { srgb: true, wrap: false });
}

// ---------------------------------------------------------------------------
// Signal waveform strip, seamless along x (scrolled by the comms room). Two periodic traces, a
// spectrum-bar row and a faint grid; cyan / green.
// ---------------------------------------------------------------------------
export function makeWaveform(w = 512, h = 256, seed = 45) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cyan = "#5fd0ff";
  const green = "#4fe08a";
  ctx.fillStyle = "#020608";
  ctx.fillRect(0, 0, w, h);
  grid(ctx, w, h, cyan, 16, 64, 0.08, 0.2);
  const trace = (yc, amp, color, lw, f1, f2, f3) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const u = (i / w) * Math.PI * 2;
      const y = yc + amp * (Math.sin(u * f1) * 0.55 + Math.sin(u * f2 + 1.3) * 0.3 + Math.sin(u * f3 + 0.4) * 0.15);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
  };
  trace(h * 0.3, h * 0.16, cyan, 2, 3, 7, 19);
  trace(h * 0.3, h * 0.08, rgba(cyan, 0.45), 1, 5, 11, 23);
  trace(h * 0.62, h * 0.1, green, 1.5, 2, 9, 17);
  // spectrum bars along the bottom (bar pitch divides w so the tile wraps)
  const nb = 64;
  const bw = w / nb;
  for (let k = 0; k < nb; k++) {
    const v = 0.15 + 0.85 * Math.abs(Math.sin(k * 0.7) * 0.6 + Math.sin(k * 0.23) * 0.4) * (0.6 + rand() * 0.4);
    ctx.fillStyle = rgba(k % 8 === 0 ? green : cyan, 0.75);
    ctx.fillRect(k * bw + 1, h * 0.94 - v * h * 0.16, bw - 2, v * h * 0.16);
  }
  // baseline ticks
  ctx.fillStyle = rgba(cyan, 0.7);
  for (let x = 0; x < w; x += 32) ctx.fillRect(x, h * 0.3 - 1, 1, 3);
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
  return toTexture(c, { srgb: true, wrap: true });
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
export function ensureDeckAMaterials(materials) {
  if (materials.deckA_starChart) return materials;
  const screen = (tex, intensity = 1.5) => setDomain(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.15, metalness: 0 }), "interior");
  const emit = (color, intensity) => setDomain(new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.08), emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.45, metalness: 0 }), "interior");
  const holo = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const holoLine = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

  materials.deckA_starChart = screen(makeStarChart(1024, 512, 21), 1.4);
  materials.deckA_tacMap = screen(makeTacticalMap(1024, 512, 33), 1.4);
  const wave = makeWaveform(512, 256, 45);
  materials.deckA_waveform = screen(wave, 1.6);
  materials.deckA_waveform.userData.scroll = wave; // the comms room advances scroll.offset.x per frame

  materials.deckA_holoLine = holoLine(0x7fb8ff, 0.85);
  materials.deckA_holoLineBright = holoLine(0xcfe6ff, 1.0);
  materials.deckA_holoLineDim = holoLine(0x4f8dff, 0.4);
  materials.deckA_holoDim = holo(0x5fa8ff, 0.14);
  materials.deckA_holoLineAmber = holoLine(0xffc060, 0.85);
  materials.deckA_holoLineCyan = holoLine(0x8fe8ff, 0.85);
  materials.deckA_holoAmber = holo(0xffb347, 0.3);
  materials.deckA_holoAmberBright = holo(0xffd890, 0.7);
  materials.deckA_holoCyan = holo(0x5fd0ff, 0.3);
  materials.deckA_holoCyanBright = holo(0xaef0ff, 0.7);

  // animated emissives (intensity driven per frame by the owning room while it is visible)
  materials.deckA_emitRedPulse = emit("#ff3b2e", 2.4);
  materials.deckA_emitGold = emit("#e8c98c", 2.0);
  for (const k of ["deckA_holoLine", "deckA_holoLineBright", "deckA_holoLineDim", "deckA_holoLineAmber", "deckA_holoLineCyan", "deckA_holoDim", "deckA_holoAmber", "deckA_holoAmberBright", "deckA_holoCyan", "deckA_holoCyanBright"]) materials[k].name = k;
  return materials;
}
