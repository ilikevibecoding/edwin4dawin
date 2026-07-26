// ============================================================================
// NORTHSTAR RESCUE — environmental decal pass (Fable 3 ownership).
// Static, collision-free wear & storytelling marks: traffic darkening, snow-
// melt footprints, coffee rings, scuffs, grime, tire marks. All textures are
// procedural canvases (transparent alpha, original content). Placements are
// deterministic and batched: quads are grouped per texture variant and merged
// into ONE mesh per variant, so the whole pass costs < 15 draw calls.
//
// IMPORTANT: no DOM access at module top level (Node import-check runs this
// file without a real `document`). Canvases are only created inside functions.
// ============================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOOR_Y, STAIRS } from './layout.js';
import { mulberry } from '../assets/textures.js';
import { registerAsset } from '../assets/registry.js';

const TEX = 256;                // texture edge (px)
const LIFT = 0.006;             // offset off the host surface (m)

// ---------------------------------------------------------------------------
// canvas paint helpers (all deterministic through the provided rnd)
// ---------------------------------------------------------------------------
function softDot(ctx, x, y, r, rgb, a) {
  if (r <= 0.5 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.6, `rgba(${rgb},${a * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// soft ellipse smear (scale trick keeps the gradient elliptical)
function softSmear(ctx, x, y, rx, ry, rot, rgb, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  softDot(ctx, 0, 0, rx, rgb, a);
  ctx.restore();
}

// irregular soft blob from clustered dots
function blob(ctx, rnd, cx, cy, rx, ry, rgb, a, n = 16) {
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 0.72;
    softDot(ctx, cx + Math.cos(ang) * d * rx, cy + Math.sin(ang) * d * ry,
      (0.3 + rnd() * 0.3) * Math.min(rx, ry), rgb, a * (0.5 + rnd() * 0.5));
  }
}

// hand-drawn wobbly ring (stain rim)
function wobblyRing(ctx, rnd, cx, cy, r, rgb, a, lw) {
  const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2;
  const w1 = 0.05 + rnd() * 0.06, w2 = 0.02 + rnd() * 0.04;
  const gap = rnd() * Math.PI * 2, gapW = 0.5 + rnd() * 0.9;
  ctx.save();
  ctx.lineCap = 'round';
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2;
    const a1 = ((i + 1) / steps) * Math.PI * 2;
    let da = Math.abs(((a0 - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da < gapW / 2) continue; // rim break
    const rr = (t) => r * (1 + Math.sin(t * 3 + p1) * w1 + Math.sin(t * 7 + p2) * w2);
    ctx.strokeStyle = `rgba(${rgb},${a * (0.55 + 0.45 * Math.sin(a0 * 5 + p2))})`;
    ctx.lineWidth = lw * (0.7 + rnd() * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * rr(a0), cy + Math.sin(a0) * rr(a0));
    ctx.lineTo(cx + Math.cos(a1) * rr(a1), cy + Math.sin(a1) * rr(a1));
    ctx.stroke();
  }
  ctx.restore();
}

function shoePrint(ctx, x, y, ang, rgb, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  softSmear(ctx, 0, -13, 13, 25, 0, rgb, a);          // sole
  softSmear(ctx, 0, 27, 10, 12, 0, rgb, a * 0.92);    // heel
  // tread gaps across the sole
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (let ty = -30; ty <= 4; ty += 9) ctx.fillRect(-12, ty, 24, 3);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// ---------------------------------------------------------------------------
// texture variants — each id maps to a 256px transparent canvas painter.
// order = render layering (soft areas first, crisp details on top).
// ---------------------------------------------------------------------------
const VARIANTS = {
  decal_carpet_wear: {
    name: 'Carpet traffic wear', order: 1,
    draw(ctx, S, rnd) {
      const phase = rnd() * Math.PI * 2;
      // worn-flat pile: pale dusty lane (reads on dark carpet AND, tinted
      // gray per placement, as dull grime on pale tile/wood)
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const y = 30 + t * (S - 60);
        const x = S / 2 + Math.sin(t * Math.PI * 2 + phase) * 8 + (rnd() - 0.5) * 18;
        const fade = 0.45 + 0.55 * Math.sin(t * Math.PI); // fades at both ends
        softDot(ctx, x, y, 30 + rnd() * 20, '196,190,178', (0.075 + rnd() * 0.05) * fade);
      }
      // ground-in grime blotches hugging the lane edges
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const y = 26 + t * (S - 52);
        const x = S / 2 + Math.sin(t * Math.PI * 2 + phase) * 9 + (rnd() - 0.5) * 36;
        const fade = 0.4 + 0.6 * Math.sin(t * Math.PI);
        softDot(ctx, x, y, 15 + rnd() * 16, '26,23,18', (0.06 + rnd() * 0.05) * fade);
      }
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = rnd() < 0.4 ? `rgba(205,200,188,${0.14 + rnd() * 0.2})`
          : `rgba(20,18,14,${0.16 + rnd() * 0.22})`;
        ctx.beginPath();
        ctx.arc(38 + rnd() * (S - 76), 32 + rnd() * (S - 64), 1 + rnd() * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  decal_dirt_patch: {
    name: 'Floor dirt patch', order: 1,
    draw(ctx, S, rnd) {
      blob(ctx, rnd, S / 2, S / 2, 82, 70, '32,26,16', 0.22, 20);
      blob(ctx, rnd, S / 2 + 14, S / 2 - 8, 46, 40, '26,21,13', 0.2, 10);
      for (let i = 0; i < 90; i++) {
        const ang = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 92;
        const x = S / 2 + Math.cos(ang) * d, y = S / 2 + Math.sin(ang) * d * 0.86;
        ctx.fillStyle = rnd() < 0.72 ? `rgba(28,22,13,${0.24 + rnd() * 0.34})`
          : `rgba(186,178,156,${0.1 + rnd() * 0.16})`;
        ctx.beginPath(); ctx.arc(x, y, 0.8 + rnd() * 2.4, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  decal_coffee_stain: {
    name: 'Coffee ring & splash', order: 4,
    draw(ctx, S, rnd) {
      const cx = S / 2 - 6, cy = S / 2 + 4, r = 74;
      softDot(ctx, cx, cy, r * 0.9, '92,58,24', 0.1);          // interior wash
      wobblyRing(ctx, rnd, cx, cy, r, '74,45,17', 0.8, 6.5);   // dark rim
      wobblyRing(ctx, rnd, cx + 6, cy - 4, r * 0.78, '86,54,22', 0.28, 3.5);
      for (let i = 0; i < 7; i++) {                            // droplets
        const ang = rnd() * Math.PI * 2, d = r + 14 + rnd() * 36;
        softDot(ctx, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.9,
          2.5 + rnd() * 6, '78,48,19', 0.3 + rnd() * 0.3);
      }
      softSmear(ctx, cx + 52, cy + 58, 11, 20, 0.6, '82,51,20', 0.22); // drip smear
    },
  },

  decal_scuff_marks: {
    name: 'Heel scuff arcs', order: 4,
    draw(ctx, S, rnd) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const cx = 64 + rnd() * 128, cy = 64 + rnd() * 128;
        const r = 34 + rnd() * 30, a0 = rnd() * Math.PI * 2, span = 0.5 + rnd() * 0.65;
        // faint smear under the mark
        ctx.strokeStyle = `rgba(24,20,15,${0.1 + rnd() * 0.07})`;
        ctx.lineWidth = 13 + rnd() * 5;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + span); ctx.stroke();
        // crisp rubber streak
        ctx.strokeStyle = `rgba(20,16,12,${0.55 + rnd() * 0.3})`;
        ctx.lineWidth = 4.5 + rnd() * 3;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0 + 0.04, a0 + span - 0.04); ctx.stroke();
      }
    },
  },

  decal_water_stain: {
    name: 'Water stain rings', order: 3,
    draw(ctx, S, rnd) {
      const cx = S / 2, cy = S / 2;
      // tea-colored wash filling the stain body — the FILL carries the
      // shape; rims are only accents (crisp rims alone read as stray wires)
      softDot(ctx, cx + 4, cy + 2, 96, '122,94,52', 0.44);
      blob(ctx, rnd, cx, cy, 84, 76, '116,90,50', 0.26, 20);
      softDot(ctx, cx - 8, cy - 6, 60, '108,82,45', 0.34);
      softDot(ctx, cx + 10, cy + 10, 44, '100,76,40', 0.3);
      // tide lines: wide soft halo + a restrained darker line
      wobblyRing(ctx, rnd, cx, cy, 86, '104,80,44', 0.24, 13);
      wobblyRing(ctx, rnd, cx, cy, 89, '96,72,38', 0.24, 4);
      wobblyRing(ctx, rnd, cx + 8, cy + 6, 63, '92,68,35', 0.2, 10);
      wobblyRing(ctx, rnd, cx + 8, cy + 6, 66, '88,64,33', 0.18, 3);
      wobblyRing(ctx, rnd, cx - 4, cy + 2, 38, '82,60,31', 0.13, 2.6);
      // drip tail running down from the stain
      softSmear(ctx, cx + 14, cy + 84, 8, 28, 0.05, '100,78,42', 0.26);
      softSmear(ctx, cx - 20, cy + 80, 5, 18, -0.08, '104,80,44', 0.18);
    },
  },

  decal_dust_corner: {
    name: 'Dust & grit corner', order: 2,
    draw(ctx, S, rnd) {
      // dust banks hugging the two edges that meet at the top-left corner
      let g = ctx.createLinearGradient(14, 0, 74, 0);
      g.addColorStop(0, 'rgba(58,53,44,0.5)'); g.addColorStop(1, 'rgba(58,53,44,0)');
      ctx.fillStyle = g; ctx.fillRect(14, 14, 60, 176);
      g = ctx.createLinearGradient(0, 14, 0, 74);
      g.addColorStop(0, 'rgba(58,53,44,0.5)'); g.addColorStop(1, 'rgba(58,53,44,0)');
      ctx.fillStyle = g; ctx.fillRect(14, 14, 176, 60);
      softDot(ctx, 34, 34, 66, '48,44,36', 0.38);
      for (let i = 0; i < 100; i++) {  // grit specks, denser near the corner
        const d = Math.pow(rnd(), 1.7) * 160;
        const x = 16 + rnd() * (d + 26), y = 16 + rnd() * (d + 26);
        if (x > 210 || y > 210) continue;
        ctx.fillStyle = rnd() < 0.7 ? `rgba(52,47,38,${0.25 + rnd() * 0.35})`
          : `rgba(172,164,146,${0.12 + rnd() * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y, 0.8 + rnd() * 2, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  decal_wet_footprints: {
    name: 'Snow-melt footprints', order: 4,
    draw(ctx, S, rnd) {
      // one stride: left foot near the quad start, right foot ahead.
      // chained quads continue the walking pattern seamlessly enough.
      shoePrint(ctx, 94, 196, -0.07 + rnd() * 0.1, '14,18,24', 0.62);
      shoePrint(ctx, 162, 68, 0.03 + rnd() * 0.1, '14,18,24', 0.56);
      // melt drips between steps
      for (let i = 0; i < 6; i++) {
        softDot(ctx, 80 + rnd() * 100, 30 + rnd() * 200, 2.5 + rnd() * 5,
          '16,20,26', 0.16 + rnd() * 0.14);
      }
    },
  },

  decal_slush_wet: {
    name: 'Slush / wet patch', order: 1,
    draw(ctx, S, rnd) {
      blob(ctx, rnd, S / 2, S / 2, 88, 74, '15,19,24', 0.2, 22);
      blob(ctx, rnd, S / 2 - 10, S / 2 + 8, 50, 42, '12,15,20', 0.2, 10);
      for (let i = 0; i < 8; i++) {   // satellite splashes
        const ang = rnd() * Math.PI * 2, d = 84 + rnd() * 30;
        softDot(ctx, S / 2 + Math.cos(ang) * d, S / 2 + Math.sin(ang) * d * 0.8,
          4 + rnd() * 9, '14,18,23', 0.18 + rnd() * 0.14);
      }
      for (let i = 0; i < 14; i++) {  // road-salt grit
        ctx.fillStyle = `rgba(205,210,216,${0.1 + rnd() * 0.16})`;
        const ang = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 70;
        ctx.beginPath();
        ctx.arc(S / 2 + Math.cos(ang) * d, S / 2 + Math.sin(ang) * d, 0.8 + rnd() * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  decal_tile_grime: {
    name: 'Grime edge band', order: 2,
    draw(ctx, S, rnd) {
      // dark band along the canvas BOTTOM edge (v=0 side of the quad).
      // long plateau before the falloff so the band still reads where a
      // baseboard overlaps the first couple of centimetres.
      const g = ctx.createLinearGradient(0, S - 6, 0, S - 148);
      g.addColorStop(0, 'rgba(42,35,26,0.68)');
      g.addColorStop(0.4, 'rgba(42,35,26,0.48)');
      g.addColorStop(1, 'rgba(42,35,26,0)');
      ctx.fillStyle = g; ctx.fillRect(8, S - 148, S - 16, 142);
      for (let i = 0; i < 34; i++) {  // uneven mop-missed clumps
        softDot(ctx, 14 + rnd() * (S - 28), S - 16 - rnd() * 58, 8 + rnd() * 16,
          '36,30,21', 0.13 + rnd() * 0.13);
      }
      ctx.fillStyle = 'rgba(26,21,15,0.6)';  // seam shadow at the very edge
      ctx.fillRect(10, S - 12, S - 20, 5);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(30,25,18,${0.2 + rnd() * 0.3})`;
        ctx.fillRect(12 + rnd() * (S - 26), S - 44 + rnd() * 30, 1.5 + rnd() * 3, 1.5 + rnd() * 3);
      }
    },
  },

  decal_paper_scraps: {
    name: 'Paper scrap cluster', order: 5,
    draw(ctx, S, rnd) {
      const tones = ['#e8e4d8', '#ded9c8', '#d4d0c4', '#e3dfd2'];
      for (let i = 0; i < 5; i++) {
        const w = 30 + rnd() * 30, h = 40 + rnd() * 40;
        const x = 42 + rnd() * 150, y = 42 + rnd() * 150;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rnd() * Math.PI * 2);
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3;
        ctx.fillStyle = tones[(rnd() * tones.length) | 0];
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(95,100,110,0.55)';   // print lines
        const rows = 2 + (rnd() * 4) | 0;
        for (let r = 0; r < rows; r++) ctx.fillRect(-w / 2 + 5, -h / 2 + 8 + r * 9, w * (0.4 + rnd() * 0.4), 2);
        if (rnd() < 0.5) {                          // folded corner
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 - 12, h / 2); ctx.lineTo(w / 2, h / 2 - 12); ctx.fill();
        }
        ctx.restore();
      }
      // crumpled ball
      ctx.save();
      ctx.translate(180, 170);
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#dcd8ca';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(120,115,100,0.6)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((rnd() - 0.5) * 22, (rnd() - 0.5) * 22);
        ctx.lineTo((rnd() - 0.5) * 22, (rnd() - 0.5) * 22);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  decal_cable_marks: {
    name: 'Cable & tape marks', order: 3,
    draw(ctx, S, rnd) {
      // lengthwise residue strips (tape shadows / cable rub) along v
      for (const bx of [64, 128, 194]) {
        const x = bx + (rnd() - 0.5) * 14;
        let y = 12 + rnd() * 10;
        while (y < S - 20) {
          const seg = 12 + rnd() * 22;
          const w = 9 + rnd() * 6;
          ctx.fillStyle = `rgba(26,23,16,${0.24 + rnd() * 0.26})`;
          ctx.fillRect(x - w / 2 + (rnd() - 0.5) * 3, y, w, seg);
          if (rnd() < 0.4) {  // gummy tape edge
            ctx.fillStyle = `rgba(18,16,11,${0.4 + rnd() * 0.24})`;
            ctx.fillRect(x - w / 2 + (rnd() - 0.5) * 3, y + seg - 2.5, w, 2.5);
          }
          y += seg + 6 + rnd() * 26;
        }
      }
      for (let i = 0; i < 5; i++) {   // scuffy diagonal drags between strips
        softSmear(ctx, 50 + rnd() * 156, 40 + rnd() * 176, 26 + rnd() * 20, 5, 1.2 + rnd() * 0.5, '22,19,14', 0.16);
      }
    },
  },

  decal_wall_scuff: {
    name: 'Wall scuff smear', order: 4,
    draw(ctx, S, rnd) {
      for (let i = 0; i < 3; i++) {
        const y = 96 + rnd() * 64, x = 70 + rnd() * 110;
        softSmear(ctx, x, y, 62 + rnd() * 34, 8 + rnd() * 6, (rnd() - 0.5) * 0.16, '26,22,17', 0.22 + rnd() * 0.12);
      }
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {   // hard rubber nicks
        const x = 66 + rnd() * 120, y = 104 + rnd() * 52;
        ctx.strokeStyle = `rgba(20,17,13,${0.42 + rnd() * 0.24})`;
        ctx.lineWidth = 3.5 + rnd() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 18 + rnd() * 12, y - 6 + rnd() * 12, x + 36 + rnd() * 20, y + (rnd() - 0.5) * 10);
        ctx.stroke();
      }
    },
  },

  decal_mold_corner: {
    name: 'Damp / mildew corner', order: 3,
    draw(ctx, S, rnd) {
      // corner feature at the canvas BOTTOM-LEFT (floor corner when on walls)
      softDot(ctx, 40, S - 40, 74, '32,36,28', 0.16);
      softDot(ctx, 26, S - 26, 44, '26,31,22', 0.2);
      for (let i = 0; i < 110; i++) {
        const d = Math.pow(rnd(), 1.8) * 150;
        const x = 16 + rnd() * (d + 22), y = S - 16 - rnd() * (d + 22);
        if (x > 200 || y < 56) continue;
        const c = rnd();
        ctx.fillStyle = c < 0.45 ? `rgba(40,48,32,${0.22 + rnd() * 0.3})`
          : c < 0.8 ? `rgba(30,36,26,${0.2 + rnd() * 0.28})`
            : `rgba(52,50,42,${0.15 + rnd() * 0.2})`;
        ctx.beginPath(); ctx.arc(x, y, 1 + rnd() * 3.4, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  decal_tire_marks: {
    name: 'Tire tread arcs', order: 3,
    draw(ctx, S, rnd) {
      // mostly a continuous rubber smear; the tread pattern is a faint
      // modulation on top (crisp high-contrast blocks read as a painted
      // dashed stripe from a distance)
      const bend = 10 + rnd() * 12;
      for (const bx of [82, 176]) {
        for (let t = 0; t <= 1; t += 0.07) {
          const y = 14 + t * (S - 28);
          const x = bx + Math.sin(t * Math.PI) * bend;
          const fade = 0.55 + 0.45 * Math.sin(t * Math.PI); // softer entry/exit
          softDot(ctx, x, y, 18, '20,18,13', 0.085 * fade);
        }
        for (let y = 16; y < S - 14; y += 8.5) {
          const t = (y - 16) / (S - 32);
          const x = bx + Math.sin(t * Math.PI) * bend;
          const slope = Math.cos(t * Math.PI) * bend * Math.PI / (S - 32);
          ctx.save();
          ctx.translate(x, y); ctx.rotate(Math.atan(slope));
          ctx.fillStyle = `rgba(19,17,11,${0.1 + rnd() * 0.14})`;
          ctx.fillRect(-15, -2.8, 30, 5.6);
          ctx.restore();
        }
      }
    },
  },
};

// ---------------------------------------------------------------------------
// texture + material caches (persist across world rebuilds)
// ---------------------------------------------------------------------------
const _textures = new Map();
const _materials = new Map();

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function decalTexture(id) {
  if (_textures.has(id)) return _textures.get(id);
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const ctx = c.getContext('2d');
  VARIANTS[id].draw(ctx, TEX, mulberry(hashSeed(id)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  _textures.set(id, t);
  return t;
}

function decalMaterial(id) {
  if (_materials.has(id)) return _materials.get(id);
  const m = new THREE.MeshStandardMaterial({
    map: decalTexture(id),
    transparent: true,
    opacity: 0.95,            // global cap; per-quad alpha rides vertex color
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    roughness: 0.9, metalness: 0,
    vertexColors: true,       // itemSize-4 color => per-quad tint + alpha
    dithering: true,
  });
  m.name = 'decal_' + id;
  _materials.set(id, m);
  return m;
}

// ---------------------------------------------------------------------------
// buildDecals — returns a THREE.Group of merged decal meshes. No collision.
// ---------------------------------------------------------------------------
export function buildDecals(game) {
  const buckets = new Map();  // variant id -> geometries
  let placed = 0;
  const rnd = mulberry(20260127);

  const _rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const _m = new THREE.Matrix4();
  const _r = new THREE.Matrix4();

  function pushQuad(id, matrix, w, h, alpha, tint, flip) {
    const geo = new THREE.PlaneGeometry(w, h);
    if (flip) {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    }
    const col = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      col[i * 4] = tint[0]; col[i * 4 + 1] = tint[1]; col[i * 4 + 2] = tint[2];
      col[i * 4 + 3] = alpha;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.applyMatrix4(matrix);
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(geo);
    placed++;
  }

  // flat on a floor/tabletop. yaw: quad "up" (texture v+) points to
  // world (-sin yaw, -cos yaw). Use dirYaw() for trails.
  function floor(id, x, z, o = {}) {
    const w = o.w ?? 0.6, h = o.h ?? w;
    const y = (o.y ?? 0) + LIFT;
    const yaw = o.yaw ?? rnd() * Math.PI * 2;
    _m.makeRotationY(yaw).multiply(_rotX).setPosition(x, y, z);
    pushQuad(id, _m, w, h, o.a ?? 0.4, o.tint ?? WHITE, o.flip ?? rnd() < 0.5);
  }

  // vertical on a wall. face = direction of the decal NORMAL ('n' faces -Z).
  function wall(id, x, y, z, face, o = {}) {
    const w = o.w ?? 0.6, h = o.h ?? w;
    const yaw = FACE_YAW[face];
    _m.makeRotationY(yaw);
    if (o.roll) _m.multiply(_r.makeRotationZ(o.roll));
    _m.setPosition(
      x + (face === 'e' ? LIFT : face === 'w' ? -LIFT : 0),
      y,
      z + (face === 's' ? LIFT : face === 'n' ? -LIFT : 0));
    pushQuad(id, _m, w, h, o.a ?? 0.35, o.tint ?? WHITE, o.flip ?? rnd() < 0.5);
  }

  const WHITE = [1, 1, 1];
  const FACE_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
  const dirYaw = (dx, dz) => Math.atan2(-dx, -dz);

  // corner-featured variants: put the texture's feature corner onto a given
  // room corner ('nw','ne','se','sw'). featureCorner = local sign pair.
  function cornerFloor(id, cx, cz, size, corner, o = {}) {
    const feat = id === 'decal_mold_corner' ? [-1, -1] : [-1, 1]; // canvas BL / TL
    // world signs of the feature corner at yaw 0 (local +y maps to -z)
    let sx = feat[0], sz = -feat[1];
    const target = { nw: [-1, -1], ne: [1, -1], se: [1, 1], sw: [-1, 1] }[corner];
    let yaw = 0;
    for (let k = 0; k < 4; k++) {
      if (sx === target[0] && sz === target[1]) { yaw = k * Math.PI / 2; break; }
      const t = sx; sx = sz; sz = -t;  // rotate world signs by +90deg yaw
    }
    floor(id, cx + -target[0] * size / 2, cz + -target[1] * size / 2,
      { ...o, w: size, h: size, yaw, flip: false });
  }

  // walking trail of wet prints: fades and shrinks along the path
  function trail(pts, o = {}) {
    const w = o.w ?? 0.62, h = o.h ?? 1.32;
    const a0 = o.a0 ?? 0.55, a1 = o.a1 ?? 0.16;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[Math.min(i + 1, pts.length - 1)];
      const pr = pts[Math.max(i - 1, 0)];
      const dx = q[0] - pr[0], dz = q[1] - pr[1];
      const t = pts.length > 1 ? i / (pts.length - 1) : 0;
      floor('decal_wet_footprints', p[0], p[1], {
        w, h, yaw: dirYaw(dx, dz) + (rnd() - 0.5) * 0.14,
        a: a0 + (a1 - a0) * t, tint: o.tint ?? WHITE, flip: i % 2 === 1,
      });
    }
  }

  // corridor centre-line traffic darkening, alternating shape/offset
  function corridorWear(x0, z0, x1, z1, o = {}) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
    const lo = along === 'x' ? x0 : z0, hi = along === 'x' ? x1 : z1;
    const mid = along === 'x' ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const step = o.step ?? 5.4;
    let i = 0;
    for (let c = lo + step * 0.5; c < hi; c += step * (0.85 + rnd() * 0.35), i++) {
      const off = Math.sin(i * 2.1) * 0.34 + (rnd() - 0.5) * 0.2;
      const x = along === 'x' ? c : mid + off;
      const z = along === 'x' ? mid + off : c;
      const long = 2.6 + rnd() * 1.2, wide = 1.15 + rnd() * 0.4;
      const yaw = (along === 'x' ? Math.PI / 2 : 0) + (i % 2 ? Math.PI : 0) + (rnd() - 0.5) * 0.2;
      if (i % 4 === 3) {
        floor('decal_dirt_patch', x, z, { w: wide * (0.8 + rnd() * 0.3), a: 0.3 + rnd() * 0.1, y: o.y ?? 0, tint: o.tint });
      } else {
        floor('decal_carpet_wear', x, z, { w: wide, h: long, yaw, a: (o.a ?? 0.45) + rnd() * 0.12, y: o.y ?? 0, tint: o.tint });
      }
    }
  }

  // scuffs flanking a door threshold. axis = direction the wall RUNS.
  function doorScuffs(x, z, axis, o = {}) {
    const n = o.n ?? 2;
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const perp = side * (0.3 + rnd() * 0.3);
      const lat = (rnd() - 0.5) * (o.spread ?? 0.7);
      const sx = axis === 'x' ? x + lat : x + perp;
      const sz = axis === 'x' ? z + perp : z + lat;
      floor('decal_scuff_marks', sx, sz, { w: 0.42 + rnd() * 0.3, a: 0.42 + rnd() * 0.18, y: o.y ?? 0, tint: o.tint });
    }
    if (o.wear !== false) { // through-traffic wear strip under the leaf
      floor('decal_carpet_wear', x, z, {
        w: 1.0, h: 1.7, yaw: axis === 'x' ? 0 : Math.PI / 2,
        a: 0.42 + rnd() * 0.1, y: o.y ?? 0, tint: o.tint,
      });
    }
  }

  // dark grime line where floor meets wall. edge = side the band hugs.
  function edgeBand(id, x, z, len, depth, edge, o = {}) {
    const yaw = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[edge];
    floor(id, x, z, { w: len, h: depth, yaw, a: o.a ?? 0.34, y: o.y ?? 0, tint: o.tint, flip: o.flip });
  }

  const F1 = FLOOR_Y[1];
  const GRAY = [0.5, 0.5, 0.5];      // grime tint for pale tile/wood floors
  const GRIME = [0.78, 0.77, 0.74];  // mild grime bias for mid-tone carpet
  const DARK = [0.3, 0.3, 0.33];     // oil / heavy rubber
  const WET = [0.85, 0.9, 0.98];     // cool tint for wet marks

  // ======================================================================
  // 1. ENTRANCE FLOW — courtyard door -> vestibule -> lobby (heaviest wear)
  // ======================================================================
  // slush around the vestibule mats (mats at x -36.3 and door at x -38)
  floor('decal_slush_wet', -37.55, 0.15, { w: 1.5, a: 0.5, tint: WET });
  floor('decal_slush_wet', -37.2, -1.0, { w: 0.85, a: 0.4, tint: WET });
  floor('decal_slush_wet', -35.7, 0.75, { w: 1.1, a: 0.44, tint: WET });
  floor('decal_slush_wet', -35.85, -0.7, { w: 0.8, a: 0.36, tint: WET });
  floor('decal_dirt_patch', -36.9, 1.6, { w: 0.7, a: 0.3 });
  edgeBand('decal_tile_grime', -35.2, -2.75, 2.2, 0.34, 'n', { a: 0.4 });
  // wet boot prints: door -> over the mat -> security door -> into the lobby
  trail([[-37.5, 0.35], [-35.45, -0.2], [-34.15, 0.15], [-32.85, -0.1],
    [-31.55, 0.15], [-30.3, 0.32], [-29.0, 0.1], [-27.85, -0.3]],
  { a0: 0.6, a1: 0.18, tint: WET });
  // faint fork peeling off toward the south corridor arch
  trail([[-30.4, 1.75], [-29.1, 3.6]], { a0: 0.24, a1: 0.13, tint: WET, w: 0.58, h: 1.25 });
  // lobby wear: reception approach + arch thresholds
  floor('decal_carpet_wear', -28.4, -0.4, { w: 1.4, h: 2.6, yaw: Math.PI / 2, a: 0.38, tint: GRAY });
  floor('decal_carpet_wear', -26, 6.4, { w: 1.3, h: 2.4, yaw: 0, a: 0.4, tint: GRAY });
  floor('decal_carpet_wear', -21.2, -1.05, { w: 1.2, h: 2.2, yaw: Math.PI / 2, a: 0.4, tint: GRAY });
  cornerFloor('decal_dust_corner', -31.92, -8.92, 1.1, 'nw', { a: 0.38 });
  doorScuffs(-30, -9, 'x', { n: 1, wear: false });             // records door
  doorScuffs(-22.5, -9, 'x', { n: 2 });                        // stairwell A

  // waiting area: sofa shuffle + a floor coffee ring by the side table
  floor('decal_carpet_wear', -36.2, 7, { w: 1.1, h: 2.4, yaw: 0, a: 0.36, tint: GRAY });
  floor('decal_coffee_stain', -35.6, 6.5, { w: 0.24, a: 0.55 });

  // first aid: one utility dirt patch by the shelf
  floor('decal_dirt_patch', -34.7, -7.6, { w: 0.7, a: 0.3, tint: GRAY });

  // ======================================================================
  // 2. CORRIDORS — traffic darkening + door thresholds
  // ======================================================================
  corridorWear(-19, -12.25, 29, -12.25);                        // north corridor
  doorScuffs(-15, -14, 'x');                                    // copy room
  doorScuffs(-6.8, -14, 'x');                                   // conference glass door
  doorScuffs(7.5, -14, 'x', { n: 3 });                          // breakroom arch
  doorScuffs(16.5, -14, 'x', { n: 1 });                         // IT office
  doorScuffs(27.5, -14, 'x');                                   // server room
  doorScuffs(-20, -11.28, 'z', { n: 1 });                       // stairwell B
  doorScuffs(27.8, -10.5, 'x', { n: 1, wear: false });          // security office
  floor('decal_dirt_patch', 9.6, -12.6, { w: 0.9, a: 0.32 });   // fire door E approach

  corridorWear(-31, 8.75, 11, 8.75);                            // south corridor
  doorScuffs(-11, 10.5, 'x', { n: 2 });                         // restroom M
  doorScuffs(-5, 10.5, 'x', { n: 1 });                          // restroom W
  doorScuffs(0, 10.5, 'x', { n: 1, wear: false });              // janitor
  doorScuffs(5, 10.5, 'x', { n: 1, wear: false });              // electrical
  doorScuffs(12, 8.75, 'z', { n: 1 });                          // service fire door
  floor('decal_slush_wet', -2.6, 9.0, { w: 0.7, a: 0.34, tint: WET }); // by wet-floor sign

  corridorWear(10, -9.5, 10, 6.5, { step: 5.6 });               // east corridor
  doorScuffs(12, -7.3, 'z', { n: 1, wear: false });             // storage door
  doorScuffs(10, -10.5, 'x', { n: 1 });                         // fire door E
  floor('decal_carpet_wear', 10, -1.5, { w: 1.3, h: 2.4, yaw: Math.PI / 2, a: 0.44 }); // arch to open floor

  // ======================================================================
  // 3. OPEN-PLAN OFFICE FLOOR — desk pods, print corner, aisles
  // ======================================================================
  const pods = [[-14.6, -6], [-9.1, -6], [-3.6, -6], [1.9, -6], [-14.6, 0.9], [-9.1, 0.9], [1.9, 0.9]];
  for (const [px, pz] of pods) {
    for (const s of [-1, 1]) {  // chair shuffle zones on both desk rows
      if (rnd() < 0.62) {
        floor('decal_carpet_wear', px - 0.88 + (rnd() - 0.5) * 0.3, pz + s * 1.5, { w: 0.9, h: 0.7, a: 0.44 + rnd() * 0.1, tint: GRIME });
      }
      if (rnd() < 0.36) {
        floor('decal_carpet_wear', px + 0.88 + (rnd() - 0.5) * 0.3, pz + s * 1.5, { w: 0.85, h: 0.65, a: 0.42 + rnd() * 0.1, tint: GRIME });
      }
      if (rnd() < 0.3) {
        floor('decal_scuff_marks', px + (rnd() - 0.5) * 1.8, pz + s * (1.15 + rnd() * 0.5), { w: 0.45, a: 0.4 + rnd() * 0.14 });
      }
    }
  }
  // coffee accidents near pods (kept sparse and small)
  floor('decal_coffee_stain', -13.4, -4.6, { w: 0.3, a: 0.52 });
  floor('decal_coffee_stain', -8.0, 2.3, { w: 0.22, a: 0.48 });
  floor('decal_coffee_stain', -2.5, -7.4, { w: 0.26, a: 0.52 });
  // print corner (7, 6): paper mess + toner-ish grime
  floor('decal_paper_scraps', 6.1, 5.3, { w: 0.75, a: 0.66 });
  floor('decal_paper_scraps', 7.2, 4.9, { w: 0.6, a: 0.6, yaw: 2.1 });
  floor('decal_dirt_patch', 6.5, 5.9, { w: 0.7, a: 0.28 });
  // aisle wear through the open connections
  floor('decal_carpet_wear', -14, -9.9, { w: 1.5, h: 2.8, yaw: 0, a: 0.5, tint: GRIME });
  floor('decal_carpet_wear', 2, -9.9, { w: 1.5, h: 2.8, yaw: 0, a: 0.5, tint: GRIME });
  floor('decal_carpet_wear', -4, 6.3, { w: 1.4, h: 2.6, yaw: 0, a: 0.48, tint: GRIME });
  floor('decal_carpet_wear', -19.2, -1, { w: 1.2, h: 2.4, yaw: Math.PI / 2, a: 0.46, tint: GRIME }); // lobby glass door
  cornerFloor('decal_dust_corner', -19.92, -10.42, 1.0, 'nw', { a: 0.36 });
  floor('decal_paper_scraps', -1.6, 2.6, { w: 0.5, a: 0.55 }); // by the recycling bin

  // ======================================================================
  // 4. BREAK ROOM — counters, vending, under-table crumbs
  // ======================================================================
  floor('decal_coffee_stain', 5.0, -20.85, { w: 0.3, a: 0.55 });
  floor('decal_coffee_stain', 6.5, -20.95, { w: 0.2, a: 0.5 });
  floor('decal_slush_wet', 5.55, -21.0, { w: 0.5, a: 0.34, tint: WET }); // sink drips
  floor('decal_dirt_patch', 10.55, -20.1, { w: 0.7, a: 0.34 });         // vending queue
  floor('decal_scuff_marks', 10.5, -18.9, { w: 0.5, a: 0.44 });
  floor('decal_dirt_patch', 5.6, -17.4, { w: 1.0, a: 0.32 });           // under tables
  floor('decal_dirt_patch', 8.8, -16.5, { w: 0.9, a: 0.32 });
  floor('decal_scuff_marks', 4.8, -16.9, { w: 0.5, a: 0.4 });
  floor('decal_carpet_wear', 7.5, -14.7, { w: 1.2, h: 2.0, yaw: 0, a: 0.36, tint: GRAY }); // arch traffic
  // coffee rings ON the counter top (top at y 0.92; sink is near x 5.5)
  floor('decal_coffee_stain', 6.55, -21.6, { w: 0.12, a: 0.68, y: 0.92 });
  floor('decal_coffee_stain', 7.32, -21.42, { w: 0.1, a: 0.6, y: 0.92 });

  // ======================================================================
  // 5. RESTROOMS + JANITOR / ELECTRICAL — grime, damp, mildew
  // ======================================================================
  // restroom M (tile): grime at wall bases, damp by the vanity
  // (west wall face x -13.85, south face z 18.35, east face x -8.08)
  edgeBand('decal_tile_grime', -13.67, 14.8, 3.4, 0.36, 'w', { a: 0.44 });
  edgeBand('decal_tile_grime', -11, 18.18, 2.6, 0.34, 's', { a: 0.46 });
  floor('decal_slush_wet', -12.9, 14.5, { w: 0.8, a: 0.34, tint: WET });  // vanity splash
  floor('decal_dirt_patch', -9.3, 16.6, { w: 0.6, a: 0.28, tint: GRAY });
  // NOTE: exterior/facade walls carry a 0.028 interior liner — their visible
  // face sits at rectLine +- 0.178, not +- t/2 (interior pair walls: +- 0.08).
  wall('decal_mold_corner', -13.822, 0.5, 17.95, 'e', { w: 0.8, h: 0.8, a: 0.48, flip: false });
  // restroom W (east wall face x -2.08)
  edgeBand('decal_tile_grime', -2.26, 14.8, 3.4, 0.36, 'e', { a: 0.44 });
  edgeBand('decal_tile_grime', -5, 18.18, 2.6, 0.34, 's', { a: 0.46 });
  floor('decal_slush_wet', -3.1, 14.5, { w: 0.75, a: 0.32, tint: WET });
  wall('decal_mold_corner', -2.08, 0.5, 17.97, 'w', { w: 0.75, h: 0.75, a: 0.44, flip: true });
  // janitor: mop-sink damp + mildew, wheel marks from the cart
  floor('decal_slush_wet', 0.3, 17.2, { w: 1.0, a: 0.44, tint: WET });
  wall('decal_mold_corner', 1.5, 0.5, 18.322, 'n', { w: 0.8, h: 0.8, a: 0.5, flip: false });
  floor('decal_cable_marks', -0.6, 15.2, { w: 0.5, h: 1.8, yaw: 0.4, a: 0.3, tint: GRAY }); // cart wheel tracks
  floor('decal_dirt_patch', 1.2, 13.4, { w: 0.7, a: 0.34, tint: GRAY });
  // electrical: dust + drag marks near the transformer
  floor('decal_dirt_patch', 6.4, 16.4, { w: 0.9, a: 0.34, tint: GRAY });
  cornerFloor('decal_dust_corner', 7.85, 10.58, 0.9, 'ne', { a: 0.4 });

  // ======================================================================
  // 6. SERVICE WING — loading drag marks, garage tire arcs + oil
  // ======================================================================
  // service corridor: dirt line + door approaches
  floor('decal_dirt_patch', 14.5, 8.9, { w: 1.0, a: 0.36, tint: GRAY });
  floor('decal_dirt_patch', 18.6, 8.6, { w: 1.2, a: 0.38, tint: GRAY });
  doorScuffs(16, 7, 'x', { n: 2, wear: false, tint: GRAY });    // loading double door
  doorScuffs(24, 8.75, 'z', { n: 1, wear: false, tint: GRAY }); // garage side door
  edgeBand('decal_tile_grime', 18, 10.2, 3.6, 0.3, 's', { a: 0.4 });
  // loading: pallet drag scuffs toward the roller shutter (x 24, z 1.5)
  floor('decal_cable_marks', 15.2, -1.4, { w: 0.5, h: 3.4, yaw: Math.PI / 2 + 0.12, a: 0.4, tint: DARK });
  floor('decal_cable_marks', 18.4, 0.2, { w: 0.45, h: 3.8, yaw: Math.PI / 2 - 0.08, a: 0.38, tint: DARK });
  floor('decal_cable_marks', 21.3, 1.3, { w: 0.5, h: 3.2, yaw: Math.PI / 2 + 0.05, a: 0.4, tint: DARK });
  floor('decal_scuff_marks', 14.2, -2.0, { w: 0.7, a: 0.46, tint: GRAY });
  floor('decal_dirt_patch', 17.0, 3.2, { w: 1.3, a: 0.36, tint: GRAY });
  floor('decal_tire_marks', 22.9, 1.5, { w: 1.5, h: 2.6, yaw: Math.PI / 2, a: 0.36, tint: GRAY }); // hand-truck lane
  cornerFloor('decal_dust_corner', 12.08, -3.92, 1.0, 'nw', { a: 0.38 });
  doorScuffs(12, 0, 'z', { n: 1, wear: false, tint: GRAY });    // side door to east corr
  // garage: van sits x 29..34, z 2.2..4.2 facing the east exit shutter
  floor('decal_tire_marks', 33.9, 2.6, { w: 1.8, h: 3.4, yaw: Math.PI / 2 + 0.18, a: 0.38, tint: DARK });
  floor('decal_tire_marks', 36.3, 2.9, { w: 1.7, h: 3.0, yaw: Math.PI / 2 - 0.1, a: 0.34, tint: DARK });
  floor('decal_tire_marks', 29.6, 3.3, { w: 1.7, h: 3.2, yaw: Math.PI / 2, a: 0.36, tint: DARK });
  floor('decal_dirt_patch', 31.3, 3.2, { w: 1.1, a: 0.5, tint: DARK });  // oil under the van
  floor('decal_dirt_patch', 33.2, 3.0, { w: 0.7, a: 0.55, tint: DARK }); // engine drip
  floor('decal_dirt_patch', 27.9, 5.2, { w: 0.8, a: 0.45, tint: DARK }); // old stain
  floor('decal_slush_wet', 36.8, 2.4, { w: 1.3, a: 0.4, tint: WET });    // melt by the shutter
  edgeBand('decal_tile_grime', 34, -3.68, 3.6, 0.34, 'n', { a: 0.34 });
  cornerFloor('decal_dust_corner', 37.85, 10.35, 1.1, 'se', { a: 0.34 });

  // storage + security (light touch)
  floor('decal_dirt_patch', 17.4, -8.6, { w: 0.9, a: 0.32, tint: GRAY });
  floor('decal_carpet_wear', 27.4, -7.1, { w: 0.85, h: 0.65, a: 0.42, tint: GRIME }); // chair shuffle
  floor('decal_coffee_stain', 26.6, -7.9, { w: 0.2, a: 0.5 });

  // ======================================================================
  // 7. SERVER / IT — cable runs along rack rows, dust corners
  // ======================================================================
  floor('decal_cable_marks', 24.2, -19.0, { w: 0.55, h: 3.6, yaw: Math.PI / 2, a: 0.4 });
  floor('decal_cable_marks', 24.2, -17.3, { w: 0.5, h: 3.4, yaw: Math.PI / 2, a: 0.38 });
  floor('decal_cable_marks', 27.0, -18.1, { w: 0.45, h: 2.6, yaw: 0.25, a: 0.34 });
  floor('decal_carpet_wear', 24.2, -18.15, { w: 1.1, h: 3.4, yaw: Math.PI / 2, a: 0.32, tint: GRAY }); // aisle sheen
  cornerFloor('decal_dust_corner', 21.08, -21.85, 0.9, 'nw', { a: 0.38 });
  cornerFloor('decal_dust_corner', 29.85, -14.08, 0.9, 'se', { a: 0.38 });
  floor('decal_cable_marks', 13.4, -18.9, { w: 0.5, h: 2.2, yaw: 0, a: 0.36 }); // IT rack wall
  floor('decal_carpet_wear', 15.5, -19.9, { w: 0.9, h: 0.7, a: 0.42, tint: GRIME });  // IT chairs
  floor('decal_carpet_wear', 16.7, -19.8, { w: 0.85, h: 0.65, a: 0.4, tint: GRIME });
  floor('decal_coffee_stain', 15.3, -18.3, { w: 0.26, a: 0.52 });
  floor('decal_paper_scraps', 19.4, -16.2, { w: 0.55, a: 0.58 });

  // ======================================================================
  // 8. STAIRWELL + UPPER FLOOR — tread wear, landing dirt, lounge wear
  // ======================================================================
  {
    const st = STAIRS[0];
    for (const key of ['flight1', 'flight2']) {
      const f = st[key];
      const rise = f.y1 - f.y0;
      const n = Math.ceil(rise / 0.175);
      const stepH = rise / n;
      const dirZ = Math.sign(f.zEnd - f.zStart);
      const run = Math.abs(f.zEnd - f.zStart) / n;
      const cx = (f.x0 + f.x1) / 2;
      const picks = key === 'flight1' ? [1, 5, 9] : [3, 7];
      for (const i of picks) {
        if (i >= n) continue;
        const zA = f.zStart + dirZ * run * i;       // tread nose (approach side)
        const top = f.y0 + stepH * (i + 1);
        edgeBand('decal_tile_grime', cx + (rnd() - 0.5) * 0.2, zA + dirZ * 0.09,
          1.75, 0.17, dirZ > 0 ? 'n' : 's', { y: top, a: 0.48, tint: GRAY });
      }
    }
  }
  floor('decal_dirt_patch', -24, -17.9, { w: 1.1, a: 0.36, y: 1.8, tint: GRAY });  // mid landing
  cornerFloor('decal_dust_corner', -27.88, -9.12, 0.9, 'sw', { a: 0.38 });         // ground corner
  floor('decal_dirt_patch', -21.2, -10.2, { w: 0.8, a: 0.32, tint: GRAY });        // door approach
  wall('decal_wall_scuff', -25.6, 1.15, -13.4, 'w', { w: 1.0, h: 0.4, a: 0.46, tint: GRAY }); // core wall rub
  // upper landing strip (y 3.6)
  floor('decal_dirt_patch', -21.3, -10.1, { w: 0.8, a: 0.34, y: F1, tint: GRAY });
  floor('decal_carpet_wear', -24, -9.9, { w: 1.3, h: 2.2, yaw: Math.PI / 2, a: 0.38, y: F1, tint: GRAY });
  // mezzanine lounge
  floor('decal_carpet_wear', -26.2, -5.5, { w: 1.2, h: 2.8, yaw: Math.PI / 2 + 0.12, a: 0.38, y: F1, tint: GRAY });
  floor('decal_carpet_wear', -30.2, -7.4, { w: 1.0, h: 1.8, yaw: 0, a: 0.34, y: F1, tint: GRAY });
  floor('decal_coffee_stain', -29.0, -5.3, { w: 0.22, a: 0.5, y: F1 });
  cornerFloor('decal_dust_corner', -31.92, -8.88, 0.9, 'nw', { a: 0.36, y: F1 });
  // exec hall (wood): runner-line dulling + door scuff
  floor('decal_carpet_wear', -35, -5.4, { w: 1.1, h: 3.0, yaw: 0.05, a: 0.3, y: F1, tint: GRAY });
  doorScuffs(-36, -9, 'x', { n: 1, y: F1, wear: false, tint: GRAY });

  // ======================================================================
  // 9. EXECUTIVE OFFICE (floor 1, wood) — desk scuffs, drag marks
  // ======================================================================
  floor('decal_scuff_marks', -33.2, -16.3, { w: 0.7, a: 0.42, y: F1, tint: GRAY }); // desk chair
  floor('decal_cable_marks', -33.9, -10.6, { w: 0.4, h: 1.4, yaw: Math.PI / 2 + 0.1, a: 0.28, tint: GRAY, y: F1 }); // sofa drag
  floor('decal_scuff_marks', -28.7, -10.4, { w: 0.55, a: 0.4, y: F1, tint: GRAY }); // door to landing
  floor('decal_carpet_wear', -28.6, -10.2, { w: 0.9, h: 1.5, yaw: Math.PI / 2, a: 0.3, y: F1, tint: GRAY });
  // hostage B kneeling spot (-35.3, -18.6)
  floor('decal_scuff_marks', -35.3, -18.6, { w: 0.55, a: 0.4, y: F1, tint: GRAY });
  floor('decal_carpet_wear', -35.15, -18.4, { w: 0.7, h: 0.55, a: 0.28, y: F1, tint: GRAY });

  // ======================================================================
  // 10. CONFERENCE ROOM — chair scuffs, tabletop coffee rings, hostage A
  // ======================================================================
  const confChairs = [[-5.6, -19.6], [-4.15, -19.7], [-2.7, -19.6], [-5.6, -16.4], [-2.7, -16.35], [-0.6, -18.0]];
  for (const [cx, cz] of confChairs) {
    floor('decal_carpet_wear', cx + (rnd() - 0.5) * 0.2, cz, { w: 0.85, h: 0.65, a: 0.42 + rnd() * 0.08, tint: GRIME });
    if (rnd() < 0.35) floor('decal_scuff_marks', cx + (rnd() - 0.5) * 0.4, cz + (rnd() - 0.5) * 0.3, { w: 0.42, a: 0.4 });
  }
  floor('decal_carpet_wear', -6.8, -14.9, { w: 1.1, h: 1.8, yaw: 0, a: 0.48, tint: GRIME }); // door traffic
  floor('decal_carpet_wear', -3.5, -18.0, { w: 1.2, h: 3.6, yaw: Math.PI / 2, a: 0.26, tint: GRIME }); // under-table dim
  // coffee rings on the tabletop (top y 0.744; the boat table is rotated 90:
  // usable top spans x -4.2..-2.8, z -19.9..-16.1; avoid the center hatch)
  floor('decal_coffee_stain', -3.85, -16.9, { w: 0.16, a: 0.72, y: 0.746 });
  floor('decal_coffee_stain', -3.05, -18.6, { w: 0.17, a: 0.66, y: 0.746 });
  floor('decal_coffee_stain', -3.15, -16.55, { w: 0.13, a: 0.6, y: 0.746 });
  // hostage A kneeling spot (-8.2, -20.3)
  floor('decal_scuff_marks', -8.2, -20.3, { w: 0.55, a: 0.4 });
  floor('decal_carpet_wear', -8.05, -20.1, { w: 0.75, h: 0.6, a: 0.4, tint: GRIME });
  floor('decal_paper_scraps', -7.4, -19.6, { w: 0.6, a: 0.58 });

  // copy room + records + file room (light)
  floor('decal_carpet_wear', -18.6, -20.1, { w: 0.95, h: 1.5, yaw: 0, a: 0.44, tint: GRIME }); // copier operator
  floor('decal_paper_scraps', -17.0, -20.0, { w: 0.6, a: 0.58 });
  floor('decal_carpet_wear', -31.4, -10.5, { w: 0.85, h: 0.65, a: 0.42, tint: GRIME }); // records desk chair
  floor('decal_carpet_wear', -24, -20.5, { w: 0.95, h: 1.4, yaw: Math.PI / 2, a: 0.42, tint: GRIME }); // file room path

  // ======================================================================
  // 11. WALL DECALS — scuffs at chair-rail height, water stains up high
  // ======================================================================
  // corridor + room wall scuffs. Coordinates are wall FACE planes:
  // interior walls sit 0.08 off the room line, exterior 0.15, stair core 0.12.
  wall('decal_wall_scuff', -15.9, 0.78, -13.92, 's', { w: 1.0, h: 0.4, a: 0.4 });
  wall('decal_wall_scuff', 6.4, 0.82, -13.92, 's', { w: 0.9, h: 0.38, a: 0.38 });
  wall('decal_wall_scuff', -13.2, 0.85, -10.58, 'n', { w: 1.0, h: 0.4, a: 0.36 });
  wall('decal_wall_scuff', -21.6, 0.78, 7.08, 's', { w: 1.1, h: 0.42, a: 0.4 });  // waiting chairs
  wall('decal_wall_scuff', 0.8, 0.8, 10.42, 'n', { w: 0.9, h: 0.38, a: 0.36 });
  wall('decal_wall_scuff', 12.08, 0.85, 2.2, 'e', { w: 1.3, h: 0.55, a: 0.46, tint: GRAY }); // loading pallets
  wall('decal_wall_scuff', 12.08, 0.6, -1.6, 'e', { w: 1.0, h: 0.5, a: 0.4, tint: GRAY });
  wall('decal_wall_scuff', 14.5, 0.7, -3.92, 's', { w: 1.1, h: 0.5, a: 0.42, tint: GRAY });
  wall('decal_wall_scuff', 25.8, 0.8, -3.92, 's', { w: 1.0, h: 0.45, a: 0.4, tint: GRAY });   // garage crates
  wall('decal_wall_scuff', 37.822, 0.9, 6.1, 'w', { w: 1.1, h: 0.5, a: 0.4, tint: GRAY });    // by the exit shutter
  // water stains (ceiling leaks migrating down walls)
  wall('decal_water_stain', 0.6, 2.32, 18.322, 'n', { w: 0.7, h: 0.6, a: 0.4 });   // janitor
  wall('decal_water_stain', -13.35, 2.28, 18.322, 'n', { w: 0.6, h: 0.55, a: 0.34 }); // restroom M corner
  wall('decal_water_stain', 7.822, 2.3, 15.0, 'w', { w: 0.65, h: 0.6, a: 0.36 });  // electrical
  wall('decal_water_stain', 19.0, 2.2, 10.322, 'n', { w: 0.8, h: 0.65, a: 0.38 }); // service corridor
  wall('decal_water_stain', -27.88, 2.6, -13.0, 'e', { w: 0.7, h: 0.62, a: 0.46 }); // stairwell
  wall('decal_water_stain', 37.822, 3.5, 8.4, 'w', { w: 0.9, h: 0.8, a: 0.38 });   // garage high

  // ======================================================================
  // merge: one mesh per texture variant
  // ======================================================================
  const group = new THREE.Group();
  group.name = 'decals';
  for (const [id, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, decalMaterial(id));
    mesh.name = id + '_batch';
    mesh.renderOrder = 2 + (VARIANTS[id].order ?? 3);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  console.info(`[decals] ${placed} placements in ${group.children.length} draw calls`);
  return group;
}

// ---------------------------------------------------------------------------
// asset registry — one entry per texture variant with a gallery sample
// ---------------------------------------------------------------------------
function gallerySample(id) {
  const g = new THREE.Group();
  // easel-style backing board so the alpha decal reads in the gallery
  const board = new THREE.Group();
  board.position.y = 0.62;
  board.rotation.y = Math.PI / 4;   // face the gallery camera diagonal
  board.rotation.x = -0.42;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.0, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.85 }));
  board.add(plate);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), decalMaterial(id));
  const col = new Float32Array(16).fill(1);
  quad.geometry.setAttribute('color', new THREE.BufferAttribute(col, 4));
  quad.position.z = 0.031;
  quad.renderOrder = 5;
  board.add(quad);
  // leg
  g.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.62, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.8 })));
  g.children[0].position.y = 0.31;
  g.add(board);
  return g;
}

for (const [id, v] of Object.entries(VARIANTS)) {
  registerAsset({
    id, name: v.name, category: 'decal', agent: 'fable3', status: 'built',
    files: 'src/world/decals.js',
    build: () => gallerySample(id),
  });
}
