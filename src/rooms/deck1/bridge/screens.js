// Module-local animated Imperial display material for d1-bridge (manifest.materials → "bridgeScreen").
// One 1024×640 canvas (the module's single canvas texture) holds four displays in a 2×2 atlas over a 128 px
// signage row, redrawn in update() at 8 Hz from absolute time only, so the harness's frozen clock gives a
// deterministic frame:
//   CELL.tactical  radar sweep + contacts + heading tape + status list
//   CELL.text      three scrolling text columns + progress stack
//   CELL.wave      three waveform traces + spectrum bars
//   CELL.ship      top-view schematic of the ship with section highlights + scan line + readouts
//   SIGN.aftLock / SIGN.data   static header signs (blast-door lintel, data terminals), text in the canvas font
import * as THREE from "three";

// uvRect [u0, v0, u1, v1] per cell (canvas rows run top-down, texture v runs bottom-up): displays fill canvas
// rows 0..512 (v 0.2..1), the two 512 × 128 signs the bottom row (v 0..0.2)
export const CELL = {
  tactical: [0, 0.6, 0.5, 1],
  text: [0.5, 0.6, 1, 1],
  wave: [0, 0.2, 0.5, 0.6],
  ship: [0.5, 0.2, 1, 0.6],
};
export const CELLS = [CELL.tactical, CELL.text, CELL.wave, CELL.ship];
export const SIGN = {
  aftLock: [0, 0, 0.5, 0.2],
  data: [0.5, 0, 1, 0.2],
};

const BLUE = "#3a7bff";
const RED = "#ff2a1a";
const AMBER = "#ffa028";
const WHITE = "#dfe8ff";
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// deterministic hash 0..1
const h1 = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function makeBridgeScreens() {
  const W = 1024;
  const H = 640;
  const cw = W / 2;
  const ch = 256;
  const SH = 128; // signage row height
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.4, roughness: 0.42, metalness: 0, envMapIntensity: 0.4 }); // anti-glare: 0.18 mirrored the pool spots as white blobs on the sill screens

  function cell(i, fn, t) {
    g.save();
    g.translate((i % 2) * cw, Math.floor(i / 2) * ch);
    g.beginPath();
    g.rect(0, 0, cw, ch);
    g.clip();
    fn(t);
    g.restore();
  }
  function bg() {
    g.fillStyle = "#04060b";
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = rgba(BLUE, 0.09);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 16; x < cw; x += 32) {
      g.moveTo(x, 0);
      g.lineTo(x, ch);
    }
    for (let y = 16; y < ch; y += 32) {
      g.moveTo(0, y);
      g.lineTo(cw, y);
    }
    g.stroke();
  }
  function scan() {
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < ch; y += 3) g.fillRect(0, y, cw, 1);
    // bezel vignette so cells never bleed into each other at the atlas seams
    g.strokeStyle = "#000";
    g.lineWidth = 4;
    g.strokeRect(0, 0, cw, ch);
  }
  function header(w, accent = BLUE) {
    g.fillStyle = accent;
    g.fillRect(14, 12, cw - 28, 2);
    g.fillRect(14, 18, w, 9);
    g.fillStyle = rgba(WHITE, 0.6);
    for (let k = 0; k < 3; k++) g.fillRect(cw - 14 - 26 * (k + 1), 18, 18, 9);
  }

  function tactical(t) {
    bg();
    header(90);
    const cx = 130;
    const cy = 140;
    const R = 96;
    g.strokeStyle = rgba(BLUE, 0.4);
    g.lineWidth = 1;
    for (const r of [R / 3, (2 * R) / 3, R]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.lineTo(cx + R, cy);
    g.moveTo(cx, cy - R);
    g.lineTo(cx, cy + R);
    g.stroke();
    const a = t * 1.1;
    g.fillStyle = rgba(BLUE, 0.22);
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R, a - 0.6, a);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(WHITE, 0.9);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    g.stroke();
    for (let i = 0; i < 9; i++) {
      const hostile = i % 3 === 0;
      const r = R * (0.22 + 0.72 * ((h1(i) + t * 0.004 * (1 + (i % 4))) % 1));
      const th = h1(i + 50) * Math.PI * 2 + t * (0.03 + 0.02 * (i % 3)) * (i % 2 ? 1 : -1);
      const px = cx + r * Math.cos(th);
      const py = cy + r * Math.sin(th);
      g.fillStyle = hostile ? RED : BLUE;
      if (hostile) g.fillRect(px - 4, py - 4, 8, 8);
      else {
        g.beginPath();
        g.moveTo(px, py - 5);
        g.lineTo(px + 5, py + 4);
        g.lineTo(px - 5, py + 4);
        g.closePath();
        g.fill();
      }
      g.fillStyle = rgba(hostile ? RED : WHITE, 0.6);
      g.fillRect(px + 7, py - 3, 14, 4);
    }
    const tx = 270;
    const ty = 46;
    const tw = 228;
    g.fillStyle = rgba(BLUE, 0.15);
    g.fillRect(tx, ty, tw, 22);
    g.fillStyle = rgba(WHITE, 0.7);
    const off = (t * 18) % 24;
    for (let x = tx + 4 - off; x < tx + tw; x += 24) {
      if (x < tx) continue;
      const big = Math.round((x + off) / 24) % 3 === 0;
      g.fillRect(x, ty + (big ? 4 : 10), 2, big ? 14 : 8);
    }
    g.fillStyle = AMBER;
    g.fillRect(tx + tw / 2 - 1, ty - 4, 3, 30);
    for (let i = 0; i < 6; i++) {
      const y = 90 + i * 22;
      g.fillStyle = rgba(BLUE, 0.85);
      g.fillRect(tx, y, 40 + h1(i + 7) * 40, 7);
      g.fillStyle = rgba(WHITE, 0.55);
      g.fillRect(tx + 110, y, 30 + h1(i + 9) * 40, 7);
      const v = 0.5 + 0.5 * Math.sin(t * (0.4 + 0.2 * i) + i);
      g.fillStyle = rgba(BLUE, 0.35);
      g.fillRect(tx + 170, y, 58, 7);
      g.fillStyle = v > 0.85 ? RED : AMBER;
      g.fillRect(tx + 170, y, 58 * v, 7);
    }
    const on = Math.floor(t * 2) % 3 !== 2;
    g.fillStyle = on ? RED : rgba(RED, 0.25);
    g.fillRect(tx, 228, 100, 14);
    g.fillStyle = rgba(WHITE, 0.6);
    g.fillRect(tx + 110, 228, 118, 14);
    scan();
  }

  function textCols(t) {
    bg();
    header(120);
    const lineH = 14;
    const scroll = t * 24;
    const base = Math.floor(scroll / lineH);
    const off = scroll % lineH;
    for (let c = 0; c < 3; c++) {
      const x0 = 14 + c * 150;
      const wmax = 130;
      g.fillStyle = rgba(BLUE, 0.6);
      g.fillRect(x0, 36, wmax, 1);
      for (let k = -1; k < 15; k++) {
        const idx = base + k + c * 100000;
        const y = 44 + k * lineH - off;
        if (y < 40 || y > ch - 14) continue;
        const r = h1(idx);
        const col = r < 0.1 ? RED : r < 0.18 ? AMBER : r < 0.4 ? rgba(BLUE, 0.5) : rgba(BLUE, 0.9);
        g.fillStyle = rgba(WHITE, 0.7);
        g.fillRect(x0, y, 16, 6);
        g.fillStyle = col;
        g.fillRect(x0 + 22, y, 30 + h1(idx + 3) * (wmax - 60), 6);
        if (h1(idx + 5) < 0.3) {
          g.fillStyle = rgba(WHITE, 0.4);
          g.fillRect(x0 + wmax - 24, y, 20, 6);
        }
      }
    }
    const fill = (t * 0.25) % 1;
    for (let k = 0; k < 8; k++) {
      const lit = k / 8 < fill;
      g.fillStyle = lit ? (k > 5 ? RED : BLUE) : rgba(BLUE, 0.15);
      g.fillRect(cw - 30, ch - 30 - k * 24, 14, 18);
    }
    scan();
  }

  function wave(t) {
    bg();
    header(70, RED);
    const y0 = 36;
    const hh = 110;
    g.fillStyle = rgba(BLUE, 0.06);
    g.fillRect(14, y0, cw - 28, hh);
    const traces = [
      [BLUE, 1.5, 0.05, 1.7],
      [RED, 1.2, 0.083, 1.1],
      [AMBER, 1, 0.13, 2.9],
    ];
    traces.forEach(([col, lw, f, sp], k) => {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      for (let x = 14; x <= cw - 14; x += 3) {
        const u = x * f + t * sp;
        const v = Math.sin(u) * 0.5 + Math.sin(u * 2.3 + k) * 0.25 + Math.sin(u * 0.37 - t) * 0.25;
        const y = y0 + hh / 2 + v * hh * 0.4 * (1 - k * 0.2);
        if (x === 14) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    });
    const sy = y0 + hh + 14;
    const sh = 66;
    const n = 40;
    const bw = (cw - 28) / n;
    for (let i = 0; i < n; i++) {
      const v = 0.15 + 0.85 * Math.abs(Math.sin(i * 0.7 + t * 1.7)) * Math.abs(Math.sin(i * 0.23 + t * 0.4 + 1));
      g.fillStyle = v > 0.8 ? RED : rgba(BLUE, 0.5 + v * 0.5);
      g.fillRect(14 + i * bw, sy + sh - sh * v, bw - 3, sh * v);
    }
    const nfr = Math.floor(t * 2);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k === 0 ? AMBER : rgba(WHITE, 0.7);
      g.fillRect(14 + k * 24, ch - 22, 18, 12 * (0.4 + 0.6 * h1(nfr * 7 + k)));
    }
    scan();
  }

  function ship(t) {
    bg();
    header(140);
    const bx = 26;
    const by = 140;
    const L = 300;
    const hw = 86;
    const sx = bx + L;
    g.strokeStyle = rgba(BLUE, 0.9);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(sx, by - hw);
    g.lineTo(sx, by + hw);
    g.closePath();
    g.stroke();
    g.strokeStyle = rgba(BLUE, 0.35);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(sx, by);
    g.stroke();
    for (let i = 0; i < 5; i++) {
      const x0 = bx + 40 + i * 52;
      const x1 = x0 + 44;
      const f0 = (x0 - bx) / L;
      const f1 = (x1 - bx) / L;
      const active = Math.floor(t * 0.8) % 5 === i;
      const fault = i === 3 && Math.floor(t * 3) % 2 === 0;
      g.fillStyle = fault ? rgba(RED, 0.35) : active ? rgba(AMBER, 0.3) : rgba(BLUE, 0.12);
      g.beginPath();
      g.moveTo(x0, by - hw * f0);
      g.lineTo(x1, by - hw * f1);
      g.lineTo(x1, by + hw * f1);
      g.lineTo(x0, by + hw * f0);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(BLUE, 0.4);
      g.lineWidth = 1;
      g.stroke();
    }
    g.strokeStyle = rgba(WHITE, 0.8);
    g.lineWidth = 1;
    g.strokeRect(bx + L * 0.58, by - 21, L * 0.4, 42);
    g.strokeRect(bx + L * 0.78, by - 17, L * 0.06, 34);
    g.fillStyle = BLUE;
    g.fillRect(bx + L * 0.8, by - 3, 6, 6);
    g.strokeStyle = rgba(BLUE, 0.8);
    for (const dy of [-32, 0, 32]) {
      g.beginPath();
      g.arc(sx + 8, by + dy, 8, 0, Math.PI * 2);
      g.stroke();
    }
    const scx = bx + ((t * 55) % L);
    const sf = (scx - bx) / L;
    g.fillStyle = rgba(WHITE, 0.7);
    g.fillRect(scx, by - hw * sf - 6, 2, 2 * hw * sf + 12);
    for (let i = 0; i < 8; i++) {
      const y = 44 + i * 24;
      g.fillStyle = rgba(BLUE, 0.8);
      g.fillRect(352, y, 26 + h1(i) * 30, 7);
      const v = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * (0.3 + i * 0.1) + i * 2));
      g.fillStyle = rgba(BLUE, 0.2);
      g.fillRect(352, y + 10, 140, 5);
      g.fillStyle = i === 5 ? RED : i === 2 ? AMBER : BLUE;
      g.fillRect(352, y + 10, 140 * v, 5);
    }
    scan();
  }

  // Static header sign in one 512 × 128 slot of the bottom row: near-black plate with a thin accent border, end
  // bars, a large title line and a small subtitle. Text at ≤ 0.75 alpha so it lands under the clip level
  // (emissive 1.4 × 0.75 ≈ 1.05) and never blooms.
  function sign(i, title, sub, accent) {
    g.save();
    g.translate(i * cw, 2 * ch);
    g.beginPath();
    g.rect(0, 0, cw, SH);
    g.clip();
    g.fillStyle = "#04060b";
    g.fillRect(0, 0, cw, SH);
    g.strokeStyle = rgba(accent, 0.7);
    g.lineWidth = 3;
    g.strokeRect(8, 8, cw - 16, SH - 16);
    g.fillStyle = rgba(accent, 0.75);
    for (const x of [18, cw - 40]) for (let k = 0; k < 4; k++) g.fillRect(x, 20 + k * 24, 22, 14);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 58px monospace";
    g.fillStyle = rgba(accent, 0.75);
    g.fillText(title, cw / 2, 52);
    g.font = "bold 26px monospace";
    g.fillStyle = rgba(WHITE, 0.55);
    g.fillText(sub, cw / 2, 100);
    g.strokeStyle = "#000";
    g.lineWidth = 4;
    g.strokeRect(0, 0, cw, SH);
    g.restore();
  }

  function draw(t) {
    cell(0, tactical, t);
    cell(1, textCols, t);
    cell(2, wave, t);
    cell(3, ship, t);
    sign(0, "AFT LOCK 01", "BRIDGE \u00b7 DECK 1 \u00b7 SPINE ACCESS", AMBER);
    sign(1, "DATA TERMINAL", "SYSTEMS \u00b7 AUTHORISED CREW", BLUE);
  }

  let lastFrame = -1;
  function update(t) {
    const fr = Math.floor(t * 8);
    if (fr === lastFrame) return;
    lastFrame = fr;
    draw(t);
    tex.needsUpdate = true;
  }
  update(0);
  return { material, texture: tex, canvas, update };
}
