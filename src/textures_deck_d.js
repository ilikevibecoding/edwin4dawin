// Deck D (engineering) textures: a 2×2 RGBA atlas of wear decals (condensation streaks, oil puddle,
// scorch mark, rust / grime patch) and a coolant-glow disc. Canvas only, no external images.
import { makeCanvas, toTexture, mulberry32, fbm } from "./textures.js";

export const DECK_D_DECAL_CELLS = 2;
export const DECK_D_DECAL = { streak: 0, oil: 1, scorch: 2, grime: 3 };

/** Atlas sub-rectangle [u0, v0, u1, v1] for a decal index (same convention as impDecalRect). */
export function deckDDecalRect(index) {
  const n = DECK_D_DECAL_CELLS;
  const cx = index % n;
  const cy = Math.floor(index / n);
  const pad = 0.01;
  return [cx / n + pad, 1 - (cy + 1) / n + pad, (cx + 1) / n - pad, 1 - cy / n - pad];
}

export function makeDeckDDecals(size = 512, seed = 71) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / DECK_D_DECAL_CELLS;
  ctx.clearRect(0, 0, size, size);
  const at = (index, fn) => {
    const cx = (index % DECK_D_DECAL_CELLS) * cell;
    const cy = Math.floor(index / DECK_D_DECAL_CELLS) * cell;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cell, cell);
    ctx.clip();
    ctx.translate(cx, cy);
    fn(cell);
    ctx.restore();
  };
  // condensation streaks: dark vertical runs fading out, denser at the top edge, with drip beads
  at(DECK_D_DECAL.streak, (s) => {
    for (let k = 0; k < 26; k++) {
      const x = s * (0.05 + rand() * 0.9);
      const w = s * (0.006 + rand() * 0.02);
      const len = s * (0.3 + rand() * 0.65);
      const g = ctx.createLinearGradient(0, 0, 0, len);
      const a = 0.25 + rand() * 0.4;
      g.addColorStop(0, `rgba(10,14,16,${a})`);
      g.addColorStop(0.7, `rgba(10,14,16,${a * 0.6})`);
      g.addColorStop(1, "rgba(10,14,16,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - w / 2, 0, w, len);
      ctx.fillStyle = `rgba(40,60,70,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, len, w * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // a general damp haze across the top band
    const g = ctx.createLinearGradient(0, 0, 0, s * 0.5);
    g.addColorStop(0, "rgba(8,12,14,0.5)");
    g.addColorStop(1, "rgba(8,12,14,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s * 0.5);
  });
  // oil puddle: irregular dark blob with a soft edge and a couple of satellite drips
  at(DECK_D_DECAL.oil, (s) => {
    const blob = (cx, cy, r, alpha) => {
      ctx.beginPath();
      const n = 40;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.75 + 0.35 * fbm(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5, { octaves: 3, freq: 3, seed: seed + cx }));
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, `rgba(6,7,9,${alpha})`);
      g.addColorStop(0.75, `rgba(8,9,12,${alpha * 0.85})`);
      g.addColorStop(1, "rgba(10,11,14,0)");
      ctx.fillStyle = g;
      ctx.fill();
    };
    blob(s * 0.5, s * 0.52, s * 0.38, 0.85);
    blob(s * 0.22, s * 0.3, s * 0.12, 0.6);
    blob(s * 0.78, s * 0.72, s * 0.09, 0.55);
    // faint rainbow sheen highlights
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(${120 + rand() * 60},${90 + rand() * 60},${140 + rand() * 60},0.12)`;
      ctx.beginPath();
      ctx.ellipse(s * (0.35 + rand() * 0.3), s * (0.4 + rand() * 0.25), s * 0.05, s * 0.02, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // scorch: black centre, brown ring, speckled soot
  at(DECK_D_DECAL.scorch, (s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.46);
    g.addColorStop(0, "rgba(6,5,5,0.9)");
    g.addColorStop(0.4, "rgba(20,14,10,0.7)");
    g.addColorStop(0.7, "rgba(60,36,20,0.35)");
    g.addColorStop(1, "rgba(60,36,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let k = 0; k < 220; k++) {
      const a = rand() * Math.PI * 2;
      const r = s * (0.1 + rand() * 0.4);
      ctx.fillStyle = `rgba(8,6,6,${0.2 + rand() * 0.5})`;
      ctx.beginPath();
      ctx.arc(s * 0.5 + Math.cos(a) * r, s * 0.5 + Math.sin(a) * r, 1 + rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // grime / rust patch: mottled brown-orange with dark edges
  at(DECK_D_DECAL.grime, (s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / s;
        const v = y / s;
        const n = fbm(u, v, { octaves: 5, freq: 4, seed: seed + 9 });
        const edge = Math.min(u, 1 - u, v, 1 - v) * 4;
        const a = Math.max(0, Math.min(1, (n - 0.42) * 3)) * Math.min(1, edge) * 0.8;
        const i = (y * s + x) * 4;
        img.data[i] = 120 + n * 60;
        img.data[i + 1] = 60 + n * 30;
        img.data[i + 2] = 30 + n * 15;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  return toTexture(c, { srgb: true, wrap: false });
}

/** Soft radial glow disc with a hot centre (coolant pools, core bloom halos). */
export function makeCoolantGlow(size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(200,240,255,0.8)");
  g.addColorStop(0.6, "rgba(120,200,255,0.3)");
  g.addColorStop(1, "rgba(60,120,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true, wrap: false });
}
