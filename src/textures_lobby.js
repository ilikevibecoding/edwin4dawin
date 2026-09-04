// Canvas textures for the turbolift lobbies: a deck-letter floor inlay (transparent decal, painted
// ring + letter + glyph band) and the lit deck indicator over each lift door (dark screen, big
// letter, up/down arrows). One set per deck letter, created lazily and shared by every lobby.
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "./textures.js";
import { setDomain } from "./materials.js";

/** Blocky Aurebesh-like glyph run (same vocabulary as the Imperial decal atlas). */
function glyphRun(ctx, rand, x, y, n, h, color) {
  ctx.fillStyle = color;
  for (let g = 0; g < n; g++) {
    const gx = x + g * h * 0.9;
    const k = Math.floor(rand() * 6);
    const s = h * 0.7;
    const t = h * 0.14;
    switch (k) {
      case 0:
        ctx.fillRect(gx, y, s, t);
        ctx.fillRect(gx, y, t, s);
        break;
      case 1:
        ctx.fillRect(gx, y + s - t, s, t);
        ctx.fillRect(gx + s - t, y, t, s);
        break;
      case 2:
        ctx.fillRect(gx, y, t, s);
        ctx.fillRect(gx + s - t, y, t, s);
        ctx.fillRect(gx, y + s / 2, s, t);
        break;
      case 3:
        ctx.fillRect(gx, y, s, t);
        ctx.fillRect(gx + s / 2 - t / 2, y, t, s);
        break;
      case 4:
        ctx.beginPath();
        ctx.arc(gx + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.clearRect(gx + t, y + t, s - 2 * t, s - 2 * t);
        break;
      default:
        ctx.fillRect(gx, y + s - t, s, t);
        ctx.fillRect(gx, y, t, s);
        ctx.fillRect(gx + s / 2, y, t, s);
    }
  }
}

/** Floor inlay: outer painted ring, accent ring, deck letter, four ticks, a glyph band (transparent). */
export function makeDeckInlay(letter, accent = "#6fa8ff", size = 1024, seed = 5) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed + letter.charCodeAt(0));
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.47;
  const ring = (r0, r1, color) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.arc(cx, cy, r0, 0, Math.PI * 2, true);
    ctx.fillStyle = color;
    ctx.fill();
  };
  ring(R * 0.9, R, "rgba(214,218,226,0.92)");
  ring(R * 0.82, R * 0.855, accent);
  // ticks between the rings at the quadrants and small hazard blocks at the diagonals
  ctx.fillStyle = "rgba(214,218,226,0.92)";
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillRect(-size * 0.02, -R * 0.82, size * 0.04, R * 0.16);
    ctx.restore();
  }
  // glyph band along the top arc: fake it with a straight run inside the ring
  glyphRun(ctx, rand, cx - size * 0.2, cy - R * 0.62, 10, size * 0.045, "rgba(214,218,226,0.85)");
  glyphRun(ctx, rand, cx - size * 0.16, cy + R * 0.5, 8, size * 0.045, "rgba(214,218,226,0.85)");
  // the deck letter
  ctx.fillStyle = "rgba(226,229,236,0.95)";
  ctx.font = `bold ${Math.round(size * 0.46)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, cx, cy + size * 0.02);
  // accent underline
  ctx.fillStyle = accent;
  ctx.fillRect(cx - size * 0.16, cy + size * 0.27, size * 0.32, size * 0.022);
  return toTexture(c, { srgb: true, wrap: false, anisotropy: 8 });
}

/** Lift deck indicator: dark screen with a bright letter, an accent frame line and up/down arrows. */
export function makeDeckIndicator(letter, accent = "#6fa8ff", w = 512, h = 192) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#07090d";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = "#f2f4f8";
  ctx.font = `bold ${Math.round(h * 0.72)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, w / 2, h / 2 + h * 0.04);
  // arrows either side (up bright in accent, down dim)
  const arrow = (x, up, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const s = h * 0.22;
    if (up) {
      ctx.moveTo(x, h / 2 - s);
      ctx.lineTo(x + s, h / 2 + s * 0.3);
      ctx.lineTo(x - s, h / 2 + s * 0.3);
    } else {
      ctx.moveTo(x, h / 2 + s);
      ctx.lineTo(x + s, h / 2 - s * 0.3);
      ctx.lineTo(x - s, h / 2 - s * 0.3);
    }
    ctx.closePath();
    ctx.fill();
  };
  arrow(w * 0.18, true, accent);
  arrow(w * 0.82, false, "rgba(120,130,150,0.55)");
  return toTexture(c, { srgb: true, wrap: false, anisotropy: 4 });
}

/**
 * Register (once per deck) `lobby_inlay_<L>` (floor decal, lit by the room) and `lobby_ind_<L>`
 * (emissive indicator) and return their keys.
 */
export function ensureLobbyMaterials(materials, letter, accent = "#6fa8ff") {
  const inlayKey = `lobby_inlay_${letter}`;
  const indKey = `lobby_ind_${letter}`;
  if (!materials[inlayKey]) {
    materials[inlayKey] = setDomain(new THREE.MeshStandardMaterial({ map: makeDeckInlay(letter, accent), transparent: true, depthWrite: false, roughness: 0.75, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 }), "interior");
    materials[inlayKey].name = inlayKey;
    materials[indKey] = setDomain(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeDeckIndicator(letter, accent), emissiveIntensity: 1.6, roughness: 0.2, metalness: 0 }), "interior");
    materials[indKey].name = indKey;
  }
  return { inlayKey, indKey };
}
