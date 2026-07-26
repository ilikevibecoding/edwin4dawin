import * as THREE from 'three';
import { painted, roundRect } from '../art/textures.js';
import { C, mixHex, hexToRgb } from '../art/palette.js';
import { makeRng, hashString } from '../core/rng.js';

/**
 * Procedural face / head textures — Northstar Rescue.
 * Owner: Fable 4 (characters).
 *
 * Every head in the game is a UV sphere (see models.js) wearing one 256×256
 * canvas texture painted here. Sphere UV convention (THREE.SphereGeometry):
 *   u = 0.75  faces -Z  (character forward)   → face features centred at x = 192
 *   u = 0.50  faces +X  (character right ear) → x = 128
 *   u = 0.25  faces +Z  (back of the skull)   → x = 64
 *   u = 0.00  faces -X  (character left ear)  → x = 0 / 256 (wraps)
 *   uv.y = 1 is the crown, uv.y = 0 is under the chin.
 *
 * Feature line placement (canvas y, 256px):
 *   crown/hair     y <  ~120
 *   brow line      y ≈ 102
 *   eye line       y ≈ 123   (≈ uv 0.52 → world eye height ≈ 0.94 × H, see models.js)
 *   nose base      y ≈ 142
 *   mouth          y ≈ 172
 *   jaw/stubble    y ≈ 150–215
 *
 * Masked variants get a knit balaclava painted over the whole head with a
 * rounded eye slot cut out; helmeted variants can additionally ask for a
 * painted goggle strap that wraps the skull under the 3-D goggle mesh.
 */

export const BALACLAVA_HEX = 0x23262b;

/** >= 4 distinct heads. `tone` maps to the shared 'skin.x' material families. */
export const HEAD_VARIANTS = [
  {
    id: 'head.aspen', tone: 'c', skin: C.skinC, hair: 0x3a2e22, hairStyle: 'short',
    facial: 'stubble', brow: 0x33281e, eye: 0x4a6a52, browHeavy: true,
    description: 'Light-neutral skin, short dark-brown crop, heavy brow, three-day stubble',
  },
  {
    id: 'head.birch', tone: 'a', skin: C.skinA, hair: 0xb08d4e, hairStyle: 'crew',
    facial: 'clean', brow: 0x8a6d3c, eye: 0x5b7f9e, browHeavy: false,
    description: 'Light-warm skin, sandy crew cut, clean shaven, blue-grey eyes',
  },
  {
    id: 'head.cedar', tone: 'b', skin: C.skinB, hair: 0x181410, hairStyle: 'buzz',
    facial: 'goatee', brow: 0x14100c, eye: 0x2f2119, browHeavy: true,
    description: 'Deep-warm skin, black buzz cut, trimmed goatee',
  },
  {
    id: 'head.flint', tone: 'd', skin: C.skinD, hair: 0x0f0c0a, hairStyle: 'shaved',
    facial: 'fullbeard', brow: 0x0f0c0a, eye: 0x241811, browHeavy: false,
    description: 'Deep-neutral skin, shaved scalp, full beard shadow',
  },
  {
    id: 'head.larch', tone: 'c', skin: mixHex(C.skinC, 0xffffff, 0.18), hair: 0x7a3b20,
    hairStyle: 'swept', facial: 'moustache', brow: 0x6a3a22, eye: 0x477a63, browHeavy: false,
    description: 'Pale skin, auburn side-swept hair, moustache, green eyes',
  },
];

export const HEAD_BY_ID = Object.fromEntries(HEAD_VARIANTS.map((h) => [h.id, h]));

/** Material family name ('skin.a'…'skin.d') for a head's hands/neck/ears. */
export function toneFamily(headId) {
  const v = HEAD_BY_ID[headId] ?? HEAD_VARIANTS[0];
  return `skin.${v.tone}`;
}

function css(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------------------------------------------ */
/* Painting                                                            */
/* ------------------------------------------------------------------ */

function paintSkinBase(ctx, W, H, v, rnd) {
  ctx.fillStyle = css(v.skin);
  ctx.fillRect(0, 0, W, H);
  // Pore/complexion noise — subtle, no baked lighting ramps.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const darker = rnd() < 0.5;
    ctx.fillStyle = darker ? 'rgba(60,34,22,0.045)' : 'rgba(255,235,220,0.05)';
    ctx.fillRect(x, y, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  // Warm flush across cheeks and nose.
  for (const cx of [168, 192, 216]) {
    const g = ctx.createRadialGradient(cx, 140, 4, cx, 140, 26);
    g.addColorStop(0, 'rgba(190,90,70,0.10)');
    g.addColorStop(1, 'rgba(190,90,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 28, 112, 56, 56);
  }
  // Under-jaw / neck occlusion band at the bottom of the sphere.
  const jaw = ctx.createLinearGradient(0, 196, 0, H);
  jaw.addColorStop(0, 'rgba(40,22,14,0)');
  jaw.addColorStop(1, 'rgba(40,22,14,0.22)');
  ctx.fillStyle = jaw;
  ctx.fillRect(0, 196, W, H - 196);
  // Faint eye-socket modelling.
  for (const ex of [176, 208]) {
    const g = ctx.createRadialGradient(ex, 121, 2, ex, 121, 15);
    g.addColorStop(0, 'rgba(70,40,30,0.14)');
    g.addColorStop(1, 'rgba(70,40,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ex - 16, 105, 32, 32);
  }
}

function paintFeatures(ctx, W, H, v, rnd) {
  const FX = 192; // face centre column (u = 0.75)
  // Brows
  const bw = v.browHeavy ? 19 : 16;
  const bh = v.browHeavy ? 6 : 4;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(FX + s * 16, 103);
    ctx.rotate(s * 0.1);
    ctx.fillStyle = css(v.brow, 0.92);
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 2.4);
    ctx.fill();
    ctx.restore();
  }
  // Eyes
  for (const s of [-1, 1]) {
    const ex = FX + s * 16;
    const ey = 123;
    ctx.fillStyle = 'rgba(238,234,226,0.96)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 7.2, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(v.eye);
    ctx.beginPath();
    ctx.arc(ex, ey + 0.3, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(12,10,10,1)';
    ctx.beginPath();
    ctx.arc(ex, ey + 0.3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ex - 1.1, ey - 1.0, 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Upper lid line
    ctx.strokeStyle = 'rgba(45,26,18,0.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(ex, ey + 1.2, 7.4, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    // Lower lid, fainter
    ctx.strokeStyle = 'rgba(45,26,18,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ex, ey - 1.4, 7.0, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }
  // Nose: bridge shading, tip and nostrils
  const ng = ctx.createLinearGradient(FX - 6, 0, FX + 6, 0);
  ng.addColorStop(0, 'rgba(70,40,28,0.12)');
  ng.addColorStop(0.5, 'rgba(70,40,28,0)');
  ng.addColorStop(1, 'rgba(70,40,28,0.12)');
  ctx.fillStyle = ng;
  ctx.fillRect(FX - 6, 108, 12, 34);
  ctx.fillStyle = 'rgba(50,28,18,0.5)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(FX + s * 4.4, 143, 1.9, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,40,28,0.3)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(FX, 140.5, 5.4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Mouth
  ctx.strokeStyle = 'rgba(88,40,34,0.85)';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(FX - 13, 171);
  ctx.quadraticCurveTo(FX, 174 + (rnd() - 0.5) * 2, FX + 13, 171);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150,80,70,0.22)';
  roundRect(ctx, FX - 11, 173, 22, 5, 2.5);
  ctx.fill();
  // Philtrum + chin crease hints
  ctx.strokeStyle = 'rgba(70,40,28,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(FX, 148);
  ctx.lineTo(FX, 165);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(FX, 186, 8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function stubbleSpeckle(ctx, rnd, x0, y0, x1, y1, color, count, alpha) {
  for (let i = 0; i < count; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    ctx.fillStyle = css(color, alpha * (0.5 + rnd() * 0.5));
    ctx.fillRect(x, y, 1 + rnd(), 1 + rnd());
  }
}

function paintFacialHair(ctx, W, H, v, rnd) {
  const FX = 192;
  const c = v.hair;
  switch (v.facial) {
    case 'stubble':
      stubbleSpeckle(ctx, rnd, FX - 46, 148, FX + 46, 214, c, 750, 0.34);
      stubbleSpeckle(ctx, rnd, FX - 15, 152, FX + 15, 163, c, 130, 0.3); // upper lip
      break;
    case 'goatee':
      ctx.fillStyle = css(c, 0.82);
      roundRect(ctx, FX - 13, 178, 26, 32, 8);
      ctx.fill();
      roundRect(ctx, FX - 15, 152, 30, 10, 4); // moustache
      ctx.fill();
      stubbleSpeckle(ctx, rnd, FX - 20, 150, FX + 20, 214, c, 260, 0.3);
      break;
    case 'fullbeard':
      ctx.fillStyle = css(c, 0.6);
      roundRect(ctx, FX - 46, 150, 92, 66, 22);
      ctx.fill();
      // keep the mouth visible
      ctx.fillStyle = css(v.skin, 0.5);
      roundRect(ctx, FX - 12, 167, 24, 10, 4);
      ctx.fill();
      stubbleSpeckle(ctx, rnd, FX - 46, 146, FX + 46, 218, c, 900, 0.4);
      break;
    case 'moustache':
      ctx.fillStyle = css(c, 0.88);
      roundRect(ctx, FX - 16, 153, 32, 9, 4.5);
      ctx.fill();
      break;
    default:
      break;
  }
}

function paintHair(ctx, W, H, v, rnd) {
  const FX = 192;
  if (v.hairStyle !== 'shaved') {
    // Clip: everything except the face oval keeps hair; the oval carves the
    // hairline arc over the forehead and keeps the cheeks clear.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.ellipse(FX, 152, 55, 102, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    const drop = { short: 132, crew: 112, buzz: 120, swept: 138 }[v.hairStyle] ?? 124;
    const alpha = v.hairStyle === 'buzz' ? 0.6 : 0.96;
    ctx.fillStyle = css(v.hair, alpha);
    ctx.fillRect(0, 0, W, drop);
    // Soft nape fade
    const fade = ctx.createLinearGradient(0, drop - 14, 0, drop + 10);
    fade.addColorStop(0, css(v.hair, alpha));
    fade.addColorStop(1, css(v.hair, 0));
    ctx.fillStyle = fade;
    ctx.fillRect(0, drop - 14, W, 26);
    // Strand streaks for texture
    ctx.strokeStyle = css(mixHex(v.hair, 0x000000, 0.4), 0.35);
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W;
      const y = rnd() * (drop - 10);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 4, y + 6 + rnd() * 10);
      ctx.stroke();
    }
    ctx.restore();
    // Fringe over the forehead (drawn inside the face oval)
    if (v.hairStyle === 'short') {
      ctx.fillStyle = css(v.hair, 0.94);
      ctx.beginPath();
      ctx.moveTo(FX - 44, 52);
      for (let i = 0; i <= 8; i++) {
        ctx.lineTo(FX - 44 + i * 11, 78 + Math.sin(i * 2.1) * 5);
      }
      ctx.lineTo(FX + 44, 52);
      ctx.closePath();
      ctx.fill();
    } else if (v.hairStyle === 'swept') {
      ctx.fillStyle = css(v.hair, 0.94);
      ctx.beginPath();
      ctx.moveTo(FX - 48, 50);
      ctx.quadraticCurveTo(FX - 10, 96, FX + 42, 70);
      ctx.lineTo(FX + 48, 50);
      ctx.closePath();
      ctx.fill();
    } else if (v.hairStyle === 'crew' || v.hairStyle === 'buzz') {
      ctx.fillStyle = css(v.hair, v.hairStyle === 'buzz' ? 0.5 : 0.85);
      ctx.beginPath();
      ctx.moveTo(FX - 42, 52);
      ctx.quadraticCurveTo(FX, 72, FX + 42, 52);
      ctx.closePath();
      ctx.fill();
    }
    // Sideburns beside both ears (right ear u=0.5 → x=128, left ear wraps at 0/256)
    ctx.fillStyle = css(v.hair, 0.8);
    roundRect(ctx, 118, 88, 14, 58, 4);
    ctx.fill();
    roundRect(ctx, 0, 88, 8, 58, 3);
    ctx.fill();
    roundRect(ctx, 248, 88, 8, 58, 3);
    ctx.fill();
  } else {
    // Shaved: scalp shadow only
    ctx.fillStyle = css(v.hair, 0.22);
    ctx.fillRect(0, 0, W, 104);
    const fade = ctx.createLinearGradient(0, 92, 0, 116);
    fade.addColorStop(0, css(v.hair, 0.22));
    fade.addColorStop(1, css(v.hair, 0));
    ctx.fillStyle = fade;
    ctx.fillRect(0, 92, W, 26);
  }
  // Ear shading (3-D ears sit on top; this grounds them)
  for (const ex of [128, 0, 256]) {
    ctx.fillStyle = 'rgba(70,38,26,0.16)';
    ctx.beginPath();
    ctx.ellipse(ex, 128, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBalaclava(ctx, W, H, rnd) {
  const FX = 192;
  const slot = { x: FX - 35, y: 108, w: 70, h: 27, r: 13 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  roundRect(ctx, slot.x, slot.y, slot.w, slot.h, slot.r);
  ctx.clip('evenodd');
  ctx.fillStyle = css(BALACLAVA_HEX);
  ctx.fillRect(0, 0, W, H);
  // Knit rows
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  for (let y = 1; y < H; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + (rnd() - 0.5) * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let y = 2; y < H; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  // Rolled stitch edge around the eye slot
  ctx.strokeStyle = 'rgba(150,155,162,0.4)';
  ctx.lineWidth = 2.4;
  roundRect(ctx, slot.x - 1.5, slot.y - 1.5, slot.w + 3, slot.h + 3, slot.r + 1.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2, slot.r - 1);
  ctx.stroke();
}

function paintGoggleStrap(ctx, W) {
  // Wraps the skull just above the brow; the 3-D goggle body covers the front.
  ctx.fillStyle = 'rgba(26,28,31,0.94)';
  ctx.fillRect(0, 62, W, 13);
  ctx.strokeStyle = 'rgba(120,124,130,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 65);
  ctx.lineTo(W, 65);
  ctx.moveTo(0, 72);
  ctx.lineTo(W, 72);
  ctx.stroke();
  // Rear adjuster buckle at u=0.25 (back of the skull, x=64)
  ctx.fillStyle = 'rgba(60,63,69,0.95)';
  roundRect(ctx, 57, 59, 14, 19, 2.5);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const FACE_TEXTURE_SIZE = 256;

/** Canvas texture for a head sphere. Deterministic per (head, overlays). */
export function headTexture(headId, { masked = false, goggleStrap = false } = {}) {
  const v = HEAD_BY_ID[headId] ?? HEAD_VARIANTS[0];
  const key = `char.face:${v.id}:${masked ? 'mask' : 'bare'}:${goggleStrap ? 'strap' : 'nostrap'}`;
  return painted(key, FACE_TEXTURE_SIZE, (ctx, W, H) => {
    const rnd = makeRng(hashString(key));
    paintSkinBase(ctx, W, H, v, rnd);
    paintFeatures(ctx, W, H, v, rnd);
    paintFacialHair(ctx, W, H, v, rnd);
    paintHair(ctx, W, H, v, rnd);
    if (masked) paintBalaclava(ctx, W, H, rnd);
    if (goggleStrap) paintGoggleStrap(ctx, W);
  });
}

const HEAD_MAT_CACHE = new Map();

/** Standard material carrying the head texture (knit roughness when masked). */
export function headMaterial(headId, { masked = false, goggleStrap = false } = {}) {
  const key = `${headId}:${masked}:${goggleStrap}`;
  let m = HEAD_MAT_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      map: headTexture(headId, { masked, goggleStrap }),
      roughness: masked ? 0.92 : 0.62,
      metalness: 0,
    });
    m.name = `head.${key}`;
    HEAD_MAT_CACHE.set(key, m);
  }
  return m;
}

/**
 * Kestrel Group insignia — fictional PMC patch, original design.
 * Slate shield, ice-white kestrel in a stoop, three gold rank chevrons.
 */
export function kestrelInsigniaTexture() {
  return painted('char.insignia.kestrel', 128, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    // Shield field
    ctx.fillStyle = css(0x1c2733);
    ctx.strokeStyle = css(C.brandGold, 0.95);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(14, 10);
    ctx.lineTo(114, 10);
    ctx.lineTo(114, 74);
    ctx.quadraticCurveTo(114, 104, 64, 120);
    ctx.quadraticCurveTo(14, 104, 14, 74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Kestrel in a stoop (diving falcon): swept wings + body wedge
    ctx.fillStyle = css(C.brandIce);
    ctx.beginPath();
    ctx.moveTo(64, 26); // beak
    ctx.lineTo(96, 44); // right wing tip
    ctx.lineTo(72, 48);
    ctx.lineTo(78, 70); // right tail
    ctx.lineTo(64, 60);
    ctx.lineTo(50, 70); // left tail
    ctx.lineTo(56, 48);
    ctx.lineTo(32, 44); // left wing tip
    ctx.closePath();
    ctx.fill();
    // Eye dot
    ctx.fillStyle = css(0x1c2733);
    ctx.beginPath();
    ctx.arc(64, 34, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Three chevrons
    ctx.strokeStyle = css(C.brandGold);
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const y = 80 + i * 11;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(64, y + 7);
      ctx.lineTo(84, y);
      ctx.stroke();
    }
    // 'KG' block letters at the top band
    ctx.fillStyle = css(C.brandGold);
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KESTREL', 64, 22);
  });
}
