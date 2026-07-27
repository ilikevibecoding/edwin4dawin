import * as THREE from 'three';
import { generateImageTexture } from '../art/texgen.js';
import { settings } from '../core/settings.js';
import { Rng } from '../core/rng.js';
import { assets } from '../core/assets.js';
import { FLOOR_Y, OPENINGS } from '../map/layout.js';

// ---------------------------------------------------------------------------
// Decal system.  (owner: fable3)
//
// Two populations share one quad geometry:
//  * DYNAMIC decals (bullet impacts, blood, scorch) come from a recycled pool
//    sized by settings.quality.decalBudget. When the budget is hit the oldest
//    decal fades out over FADE_TIME and its mesh is reused.
//  * STATIC decals (environmental wear/storytelling) are placed once, from
//    `placeEnvironmentalDecals(level)`, which the CONSTRUCTOR calls itself
//    (game.level already exists when DecalSystem is created in game.js).
//    They share cached materials, are never pooled and survive reset().
//
// Every texture is painted procedurally through generateImageTexture on an
// RGBA canvas; each kind has several seeded variants so repetition never
// reads. Quads sit 0.006 m off the surface along its normal with
// polygonOffset(-4,-4), depthWrite:false and transparent:true, so they never
// z-fight the architecture. Craters are shaded in the albedo (dark upper
// bowl, lit lower rim — the building light comes from above) so impacts read
// as dents rather than stickers.
//
// Orientation conventions (see _orient):
//  * wall decals (horizontal normal): canvas-up = world up.
//  * floor decals (normal +Y): canvas-up = world −Z (north); rotation spins
//    in-plane, so rotation 0 keeps a streak drawn along canvas-X running
//    east–west.
// ---------------------------------------------------------------------------

const OFFSET = 0.006;       // metres along the surface normal
const FADE_TIME = 0.45;     // seconds a recycled decal takes to fade out
const POOL_SLACK = 12;      // extra meshes so fades never steal a live slot

// Combat passes SURFACE_PROPS[surface].decal names; map them onto our kinds.
const KIND_ALIASES = {
  drywall: 'bullet_drywall', concrete: 'bullet_concrete', metal: 'bullet_metal',
  wood: 'bullet_wood', glass: 'bullet_glass', carpet: 'bullet_carpet',
  fabric: 'bullet_carpet', paper: 'bullet_carpet', tile: 'bullet_tile',
  snow: 'bullet_snow', plastic: 'bullet_metal', electronic: 'bullet_metal',
};

const ASSET_ID = (kind) => {
  if (kind === 'blood') return 'DECAL-BLOOD';
  if (kind === 'scorch') return 'DECAL-SCORCH';
  if (kind.startsWith('bullet_')) return 'DECAL-BULLET-SET';
  return 'DECAL-WEAR-SET';
};

// ------------------------------------------------------------ paint toolkit

function radial(ctx, cx, cy, r, c0, c1 = 'rgba(0,0,0,0)', rInner = 0) {
  const g = ctx.createRadialGradient(cx, cy, rInner, cx, cy, r);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Irregular closed blob path (does not fill — caller sets fillStyle). */
function blobPath(ctx, rng, cx, cy, r, wobble = 0.35) {
  const n = 12;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - wobble + rng.float() * wobble * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n; i++) ctx.lineTo(pts[i % n][0], pts[i % n][1]);
  ctx.closePath();
}

function speckles(ctx, rng, cx, cy, spread, count, color, rMin, rMax) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = spread * Math.sqrt(rng.float());
    const r = rng.range(rMin, rMax);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Kinked radial hairline cracks. */
function cracks(ctx, rng, cx, cy, count, len, color, width = 1.3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let a = rng.range(0, Math.PI * 2);
    let x = cx, y = cy;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + rng.int(0, 2);
    for (let s = 0; s < segs; s++) {
      a += rng.range(-0.5, 0.5);
      const l = (len / segs) * rng.range(0.7, 1.3);
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Normal-ish crater shading: dark bowl biased up, catch-light on the low rim. */
function craterShade(ctx, cx, cy, r, dark = 'rgba(10,8,6,0.5)', light = 'rgba(255,250,240,0.35)') {
  radial(ctx, cx - r * 0.22, cy - r * 0.28, r * 0.9, dark);
  ctx.strokeStyle = light;
  ctx.lineWidth = Math.max(1.4, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
}

// --------------------------------------------------------- dynamic painters

function pDrywall(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.48, 'rgba(214,208,196,0.30)');
  blobPath(ctx, rng, c, c, w * 0.24, 0.45); ctx.fillStyle = '#d9d3c7'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.165, 0.5); ctx.fillStyle = '#b9b0a0'; ctx.fill();
  cracks(ctx, rng, c, c, 4 + rng.int(0, 2), w * 0.3, 'rgba(84,74,60,0.5)', 1.1);
  speckles(ctx, rng, c, c, w * 0.3, 14, 'rgba(230,226,214,0.6)', 0.6, 1.8);
  blobPath(ctx, rng, c, c, w * 0.082, 0.3); ctx.fillStyle = '#171310'; ctx.fill();
  craterShade(ctx, c, c, w * 0.12);
}

function pConcrete(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.46, 'rgba(118,118,114,0.28)');
  blobPath(ctx, rng, c, c, w * 0.21, 0.5); ctx.fillStyle = '#a8a8a1'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.14, 0.45); ctx.fillStyle = '#7c7c76'; ctx.fill();
  cracks(ctx, rng, c, c, 5 + rng.int(0, 3), w * 0.34, 'rgba(52,50,46,0.6)', 1.3);
  speckles(ctx, rng, c, c, w * 0.28, 16, 'rgba(190,190,184,0.55)', 0.6, 1.6);
  blobPath(ctx, rng, c, c, w * 0.075, 0.3); ctx.fillStyle = '#211f1c'; ctx.fill();
  craterShade(ctx, c, c, w * 0.11);
}

function pMetal(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.34, 'rgba(28,30,34,0.55)');
  // bright displacement petals around the dent
  ctx.strokeStyle = 'rgba(224,230,238,0.7)';
  ctx.lineCap = 'round';
  const n = 5 + rng.int(0, 3);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r0 = w * rng.range(0.07, 0.1), r1 = w * rng.range(0.14, 0.2);
    ctx.lineWidth = rng.range(1.2, 2.4);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    ctx.stroke();
  }
  blobPath(ctx, rng, c, c, w * 0.06, 0.25); ctx.fillStyle = '#0e1013'; ctx.fill();
  craterShade(ctx, c, c, w * 0.085, 'rgba(0,0,0,0.6)', 'rgba(235,242,250,0.55)');
}

function pWood(ctx, w, h, rng) {
  const c = w / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(rng.range(0, Math.PI));
  ctx.translate(-c, -c);
  // splintered gouge, elongated with the grain
  ctx.save();
  ctx.translate(c, c); ctx.scale(1.6, 0.85); ctx.translate(-c, -c);
  blobPath(ctx, rng, c, c, w * 0.2, 0.5); ctx.fillStyle = '#c69a62'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.13, 0.45); ctx.fillStyle = '#7a5530'; ctx.fill();
  ctx.restore();
  // fibre splinters along the long axis
  ctx.strokeStyle = 'rgba(90,62,34,0.6)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 7 + rng.int(0, 4); i++) {
    const dir = rng.bool() ? 1 : -1;
    const y = c + rng.range(-w * 0.08, w * 0.08);
    const x0 = c + dir * w * rng.range(0.1, 0.2);
    ctx.lineWidth = rng.range(0.8, 1.8);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + dir * w * rng.range(0.08, 0.18), y + rng.range(-2, 2));
    ctx.stroke();
  }
  blobPath(ctx, rng, c, c, w * 0.06, 0.35); ctx.fillStyle = '#241a10'; ctx.fill();
  craterShade(ctx, c, c, w * 0.09, 'rgba(20,12,4,0.5)', 'rgba(232,206,160,0.4)');
  ctx.restore();
}

function pGlass(ctx, w, h, rng) {
  const c = w / 2;
  // long radial fractures
  ctx.strokeStyle = 'rgba(236,244,252,0.55)';
  ctx.lineCap = 'round';
  const n = 7 + rng.int(0, 3);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    let x = c, y = c;
    ctx.lineWidth = rng.range(0.8, 1.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      a += rng.range(-0.25, 0.25);
      const l = w * rng.range(0.1, 0.17);
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // conchoidal partial rings
  ctx.strokeStyle = 'rgba(228,238,248,0.35)';
  for (let i = 0; i < 2 + rng.int(0, 2); i++) {
    const r = w * rng.range(0.12, 0.3);
    const a0 = rng.range(0, Math.PI * 2);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(c, c, r, a0, a0 + rng.range(1.2, 3.6));
    ctx.stroke();
  }
  radial(ctx, c, c, w * 0.1, 'rgba(242,248,252,0.9)');
  radial(ctx, c, c, w * 0.035, 'rgba(18,22,28,0.65)');
}

function pCarpet(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.3, 'rgba(38,34,30,0.35)');
  // frayed tuft: dense dark fleck cloud with fibres pulled outwards
  speckles(ctx, rng, c, c, w * 0.16, 26, 'rgba(30,26,22,0.75)', 1.0, 2.4);
  ctx.strokeStyle = 'rgba(46,40,34,0.6)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 10 + rng.int(0, 6); i++) {
    const a = rng.range(0, Math.PI * 2);
    const r0 = w * rng.range(0.06, 0.12), r1 = r0 + w * rng.range(0.05, 0.12);
    ctx.lineWidth = rng.range(0.7, 1.4);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * r1 + rng.range(-2, 2), c + Math.sin(a) * r1 + rng.range(-2, 2));
    ctx.stroke();
  }
  radial(ctx, c, c, w * 0.07, 'rgba(14,12,10,0.85)');
}

function pTile(ctx, w, h, rng) {
  const c = w / 2;
  blobPath(ctx, rng, c, c, w * 0.2, 0.55); ctx.fillStyle = '#e9e7e0'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.13, 0.5); ctx.fillStyle = '#c9c7c0'; ctx.fill();
  // one or two long glaze hairlines
  cracks(ctx, rng, c, c, 1 + rng.int(0, 1), w * 0.42, 'rgba(72,72,68,0.5)', 0.8);
  blobPath(ctx, rng, c, c, w * 0.055, 0.3); ctx.fillStyle = '#2a2825'; ctx.fill();
  craterShade(ctx, c, c, w * 0.09, 'rgba(30,30,28,0.4)', 'rgba(255,255,252,0.5)');
}

function pSnow(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.4, 'rgba(148,162,182,0.35)');
  blobPath(ctx, rng, c, c, w * 0.18, 0.4); ctx.fillStyle = 'rgba(94,110,132,0.7)'; ctx.fill();
  radial(ctx, c, c, w * 0.09, 'rgba(52,64,84,0.85)');
  speckles(ctx, rng, c, c, w * 0.3, 18, 'rgba(240,246,252,0.7)', 0.8, 2.0);
  craterShade(ctx, c, c, w * 0.14, 'rgba(30,40,58,0.45)', 'rgba(248,252,255,0.5)');
}

function pBlood(ctx, w, h, rng) {
  const c = w / 2 + rng.range(-4, 4);
  const cy = w / 2 + rng.range(-4, 4);
  radial(ctx, c, cy, w * rng.range(0.16, 0.22), 'rgba(96,10,14,0.9)', 'rgba(96,10,14,0)');
  blobPath(ctx, rng, c, cy, w * rng.range(0.1, 0.15), 0.5); ctx.fillStyle = 'rgba(74,6,10,0.9)'; ctx.fill();
  radial(ctx, c, cy, w * 0.06, 'rgba(46,2,6,0.95)');
  // satellite droplets, elongated away from the centre
  for (let i = 0; i < 9 + rng.int(0, 6); i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = w * rng.range(0.14, 0.42);
    const x = c + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const r = rng.range(1, 3.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(rng.range(1, 2.4), 1);
    radial(ctx, 0, 0, r * 2, `rgba(88,8,12,${rng.range(0.55, 0.85).toFixed(2)})`, 'rgba(88,8,12,0)');
    ctx.restore();
  }
}

function pScorch(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.48, 'rgba(30,26,22,0.4)');
  radial(ctx, c, c, w * 0.3, 'rgba(22,18,15,0.7)');
  radial(ctx, c, c, w * 0.13, 'rgba(10,8,7,0.9)');
  // sooty radial licks
  ctx.strokeStyle = 'rgba(18,15,12,0.5)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 10 + rng.int(0, 6); i++) {
    const a = rng.range(0, Math.PI * 2);
    const r0 = w * rng.range(0.18, 0.28), r1 = r0 + w * rng.range(0.1, 0.2);
    ctx.lineWidth = rng.range(2, 5);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    ctx.stroke();
  }
  speckles(ctx, rng, c, c, w * 0.36, 12, 'rgba(60,52,44,0.4)', 1, 3);
}

/** Neutral dark scuff — also the reducedBlood substitute. */
function pScuff(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.34, 'rgba(50,48,46,0.2)');
  ctx.lineCap = 'round';
  for (let i = 0; i < 3 + rng.int(0, 3); i++) {
    ctx.strokeStyle = `rgba(38,38,40,${rng.range(0.3, 0.5).toFixed(2)})`;
    ctx.lineWidth = rng.range(2.5, 6);
    const y = c + rng.range(-w * 0.16, w * 0.16);
    const x0 = c - w * rng.range(0.18, 0.3);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(c + rng.range(-8, 8), y + rng.range(-10, 10), c + w * rng.range(0.18, 0.3), y + rng.range(-6, 6));
    ctx.stroke();
  }
}

// ---------------------------------------------------------- static painters

function pCarpetWear(ctx, w, h, rng) {
  const c = w / 2;
  ctx.save();
  ctx.translate(c, c); ctx.scale(1, 0.32); ctx.translate(-c, -c);
  radial(ctx, c, c, w * 0.48, 'rgba(58,52,46,0.26)');
  ctx.restore();
  speckles(ctx, rng, c, c, w * 0.4, 30, 'rgba(50,45,40,0.14)', 1.5, 4);
  speckles(ctx, rng, c, c, w * 0.34, 16, 'rgba(120,112,100,0.1)', 2, 5);
}

function pWallScuff(ctx, w, h, rng) {
  const c = w / 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4 + rng.int(0, 3); i++) {
    ctx.strokeStyle = `rgba(40,37,34,${rng.range(0.25, 0.42).toFixed(2)})`;
    ctx.lineWidth = rng.range(1.8, 4.5);
    const y = c + rng.range(-w * 0.18, w * 0.18);
    const x0 = w * rng.range(0.08, 0.25);
    const x1 = w - w * rng.range(0.08, 0.3);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + rng.range(-5, 5), x1, y + rng.range(-4, 4));
    ctx.stroke();
  }
}

/** Contact grime where a wall meets the floor: dark at the base, fading up. */
function pContactGrime(ctx, w, h, rng) {
  const grad = ctx.createLinearGradient(0, h, 0, h * 0.35);
  grad.addColorStop(0, 'rgba(46,42,38,0.30)');
  grad.addColorStop(0.55, 'rgba(52,48,44,0.12)');
  grad.addColorStop(1, 'rgba(52,48,44,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Break the band's top edge so it never reads as a printed stripe.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) {
    const x = w * rng.range(0, 1);
    const y = h * rng.range(0.3, 0.62);
    radial(ctx, x, y, w * rng.range(0.04, 0.1), 'rgba(0,0,0,0.5)');
  }
  ctx.globalCompositeOperation = 'source-over';
  speckles(ctx, rng, w / 2, h * 0.78, w * 0.46, 22, 'rgba(40,36,32,0.2)', 0.8, 2.4);
}

/** Hand grime around door handles and switch plates: a soft oval halo. */
function pHandleGrime(ctx, w, h, rng) {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(cx + rng.range(-w * 0.08, w * 0.08), cy + rng.range(-h * 0.08, h * 0.08));
    ctx.rotate(rng.range(-0.4, 0.4));
    ctx.scale(1, rng.range(1.2, 1.6));
    radial(ctx, 0, 0, w * rng.range(0.16, 0.26), 'rgba(52,46,40,0.16)');
    ctx.restore();
  }
  // A few fingertip dabs trailing off toward the pull side.
  for (let f = 0; f < 5; f++) {
    radial(ctx, cx + rng.range(-w * 0.3, w * 0.3), cy + rng.range(-h * 0.26, h * 0.26),
      w * rng.range(0.03, 0.055), 'rgba(48,42,36,0.18)');
  }
}

function pFloorDirt(ctx, w, h, rng) {
  const c = w / 2;
  for (let i = 0; i < 3; i++) {
    radial(ctx, c + rng.range(-w * 0.14, w * 0.14), c + rng.range(-w * 0.12, w * 0.12),
      w * rng.range(0.2, 0.34), 'rgba(70,62,52,0.2)');
  }
  speckles(ctx, rng, c, c, w * 0.36, 34, 'rgba(58,50,42,0.2)', 0.8, 2.6);
}

function pWaterStain(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.36, 'rgba(140,115,80,0.14)');
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    blobPath(ctx, rng, c, c, w * (0.18 + i * 0.09), 0.22);
    ctx.strokeStyle = `rgba(122,96,60,${(0.34 - i * 0.08).toFixed(2)})`;
    ctx.lineWidth = rng.range(1.5, 3);
    ctx.stroke();
  }
}

function pCeilingLeak(ctx, w, h, rng) {
  const c = w / 2;
  radial(ctx, c, c, w * 0.4, 'rgba(120,95,60,0.28)');
  radial(ctx, c, c, w * 0.16, 'rgba(90,68,42,0.45)');
  for (let i = 0; i < 2; i++) {
    blobPath(ctx, rng, c, c, w * (0.24 + i * 0.1), 0.25);
    ctx.strokeStyle = 'rgba(104,80,50,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  speckles(ctx, rng, c, c, w * 0.2, 14, 'rgba(60,58,52,0.4)', 0.8, 2);
}

function pDust(ctx, w, h, rng) {
  const c = w / 2;
  ctx.save();
  ctx.translate(c, c); ctx.scale(1, 0.6); ctx.translate(-c, -c);
  radial(ctx, c, c, w * 0.46, 'rgba(150,144,132,0.3)');
  ctx.restore();
  speckles(ctx, rng, c, c, w * 0.4, 40, 'rgba(170,164,150,0.18)', 0.6, 1.8);
  speckles(ctx, rng, c, c, w * 0.36, 20, 'rgba(120,114,102,0.12)', 1, 2.5);
}

function pFootprintSnow(ctx, w, h, rng) {
  // A left+right pair of wet shoe prints, toes towards canvas-up.
  const drawPrint = (px, py, tilt) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(tilt);
    ctx.fillStyle = `rgba(56,64,76,${rng.range(0.42, 0.55).toFixed(2)})`;
    // sole
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.06, w * 0.075, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    // heel
    ctx.beginPath();
    ctx.ellipse(0, h * 0.12, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // tread bars knocked out of the sole
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(-w * 0.07, -h * 0.06 + i * h * 0.045 - 1.5, w * 0.14, 3);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  };
  drawPrint(w * 0.36, h * 0.32, rng.range(-0.14, 0.02));
  drawPrint(w * 0.64, h * 0.68, rng.range(-0.02, 0.14));
  speckles(ctx, rng, w / 2, h / 2, w * 0.3, 10, 'rgba(70,80,94,0.25)', 1, 2.4);
}

function pSnowMelt(ctx, w, h, rng) {
  const c = w / 2;
  blobPath(ctx, rng, c, c, w * 0.3, 0.4); ctx.fillStyle = 'rgba(52,62,76,0.4)'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.18, 0.4); ctx.fillStyle = 'rgba(44,54,68,0.35)'; ctx.fill();
  radial(ctx, c - w * 0.08, c - w * 0.08, w * 0.12, 'rgba(255,255,255,0.1)');
  // slush crumbs around the rim
  speckles(ctx, rng, c, c, w * 0.34, 16, 'rgba(232,238,246,0.5)', 1, 3);
}

function pGlassSmudge(ctx, w, h, rng) {
  for (let i = 0; i < 3 + rng.int(0, 3); i++) {
    const x = w * rng.range(0.2, 0.8), y = h * rng.range(0.2, 0.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(0, Math.PI));
    ctx.scale(1, rng.range(1.4, 2.2));
    radial(ctx, 0, 0, w * rng.range(0.06, 0.12), 'rgba(205,212,222,0.16)');
    ctx.restore();
    // fingertip cluster beside the palm smear
    for (let f = 0; f < 4; f++) {
      radial(ctx, x + rng.range(-14, 14), y - rng.range(8, 22),
        rng.range(2.5, 4.5), 'rgba(212,218,228,0.2)');
    }
  }
}

function pTapeResidue(ctx, w, h, rng) {
  // ghost of a removed sign: pale rectangle where the paint didn't fade
  if (rng.bool(0.6)) {
    const rw = w * rng.range(0.4, 0.6), rh = h * rng.range(0.3, 0.45);
    ctx.fillStyle = 'rgba(228,224,208,0.12)';
    ctx.fillRect((w - rw) / 2, (h - rh) / 2, rw, rh);
    ctx.strokeStyle = 'rgba(220,215,195,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect((w - rw) / 2, (h - rh) / 2, rw, rh);
  }
  // torn tape strips at the corners
  ctx.fillStyle = 'rgba(196,188,158,0.42)';
  for (let i = 0; i < 2 + rng.int(0, 2); i++) {
    const x = w * rng.range(0.15, 0.7), y = h * rng.range(0.15, 0.75);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(-0.5, 0.5));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.18, rng.range(-2, 2));
    ctx.lineTo(w * 0.18 - 4, 6);
    ctx.lineTo(w * 0.16, 12);
    ctx.lineTo(2, 11 + rng.range(-2, 2));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function pCableMark(ctx, w, h, rng) {
  ctx.lineCap = 'round';
  const lines = 2 + rng.int(0, 1);
  for (let i = 0; i < lines; i++) {
    const y = h * (0.35 + i * 0.18) + rng.range(-4, 4);
    ctx.strokeStyle = `rgba(35,33,31,${rng.range(0.3, 0.42).toFixed(2)})`;
    ctx.lineWidth = rng.range(2, 3.2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(w / 2, y + rng.range(4, 12), w, y + rng.range(-4, 4));
    ctx.stroke();
    // old tape stubs that held the run down
    ctx.fillStyle = 'rgba(120,112,96,0.3)';
    for (let t = 0; t < 3; t++) {
      const x = w * rng.range(0.1, 0.9);
      ctx.fillRect(x - 3, y - 7, 6, 14);
    }
  }
}

function pCrackedPlaster(ctx, w, h, rng) {
  // pale disturbed halo behind the crack
  radial(ctx, w / 2, h / 2, w * 0.3, 'rgba(235,230,220,0.16)');
  const trace = (x, y, a, len, width) => {
    let cw = width;
    while (len > 4 && cw > 0.4) {
      const l = rng.range(8, 18);
      const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
      ctx.strokeStyle = 'rgba(48,42,36,0.68)';
      ctx.lineWidth = cw;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      if (rng.bool(0.3)) trace(nx, ny, a + rng.range(0.6, 1.2) * (rng.bool() ? 1 : -1), len * 0.4, cw * 0.6);
      x = nx; y = ny;
      a += rng.range(-0.35, 0.35);
      len -= l;
      cw *= 0.92;
    }
  };
  trace(w * rng.range(0.3, 0.7), h * 0.06, Math.PI / 2 + rng.range(-0.3, 0.3), h * 0.9, 2.2);
}

function pChippedPaint(ctx, w, h, rng) {
  // chips clustered down one edge line (a door frame corner)
  const x0 = w * rng.range(0.42, 0.58);
  for (let i = 0; i < 7 + rng.int(0, 4); i++) {
    const y = h * rng.range(0.08, 0.92);
    const x = x0 + rng.range(-w * 0.08, w * 0.08);
    const r = rng.range(2.5, 6.5);
    blobPath(ctx, rng, x, y, r * 1.6, 0.5); ctx.fillStyle = 'rgba(216,210,196,0.5)'; ctx.fill();
    blobPath(ctx, rng, x, y, r, 0.45); ctx.fillStyle = '#4d463c'; ctx.fill();
  }
}

function pCoffeeStain(ctx, w, h, rng) {
  const c = w / 2;
  blobPath(ctx, rng, c, c, w * 0.24, 0.4); ctx.fillStyle = 'rgba(96,62,28,0.3)'; ctx.fill();
  blobPath(ctx, rng, c, c, w * 0.25, 0.35);
  ctx.strokeStyle = 'rgba(60,36,14,0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  radial(ctx, c, c, w * 0.12, 'rgba(78,50,22,0.4)');
  for (let i = 0; i < 6 + rng.int(0, 5); i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = w * rng.range(0.26, 0.44);
    radial(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, rng.range(2, 5), 'rgba(70,44,18,0.5)');
  }
}

// -------------------------------------------------------------- kind table

/** kind -> { px: texture size, variants, size: default world size, paint } */
const KINDS = {
  // dynamic (combat)
  bullet_drywall: { px: 128, variants: 4, size: 0.13, paint: pDrywall },
  bullet_concrete: { px: 128, variants: 4, size: 0.11, paint: pConcrete },
  bullet_metal: { px: 128, variants: 4, size: 0.09, paint: pMetal },
  bullet_wood: { px: 128, variants: 4, size: 0.11, paint: pWood },
  bullet_glass: { px: 128, variants: 4, size: 0.16, paint: pGlass },
  bullet_carpet: { px: 128, variants: 4, size: 0.1, paint: pCarpet },
  bullet_tile: { px: 128, variants: 4, size: 0.1, paint: pTile },
  bullet_snow: { px: 128, variants: 4, size: 0.16, paint: pSnow },
  blood: { px: 192, variants: 4, size: 0.45, paint: pBlood },
  scorch: { px: 192, variants: 3, size: 0.7, paint: pScorch },
  scuff: { px: 128, variants: 3, size: 0.3, paint: pScuff },
  // static (environmental)
  carpet_wear: { px: 192, variants: 3, size: 2.0, paint: pCarpetWear },
  wall_scuff: { px: 160, variants: 3, size: 0.85, paint: pWallScuff },
  contact_grime: { px: 160, variants: 3, size: 1.6, paint: pContactGrime },
  handle_grime: { px: 96, variants: 3, size: 0.34, paint: pHandleGrime },
  floor_dirt: { px: 160, variants: 3, size: 1.0, paint: pFloorDirt },
  water_stain: { px: 160, variants: 3, size: 0.85, paint: pWaterStain },
  ceiling_leak: { px: 160, variants: 2, size: 1.0, paint: pCeilingLeak },
  dust: { px: 160, variants: 3, size: 1.4, paint: pDust },
  footprint_snow: { px: 128, variants: 3, size: 0.55, paint: pFootprintSnow },
  snow_melt: { px: 160, variants: 3, size: 0.9, paint: pSnowMelt },
  glass_smudge: { px: 160, variants: 3, size: 0.6, paint: pGlassSmudge },
  tape_residue: { px: 160, variants: 3, size: 0.42, paint: pTapeResidue },
  cable_mark: { px: 192, variants: 3, size: 2.2, paint: pCableMark },
  cracked_plaster: { px: 160, variants: 3, size: 0.95, paint: pCrackedPlaster },
  chipped_paint: { px: 160, variants: 3, size: 0.5, paint: pChippedPaint },
  coffee_stain: { px: 160, variants: 3, size: 0.5, paint: pCoffeeStain },
};

function decalTexture(kind, variant) {
  const cfg = KINDS[kind];
  return generateImageTexture(`decal:${kind}:${variant}`, cfg.px, cfg.px, (ctx, w, h) => {
    cfg.paint(ctx, w, h, new Rng(`decal:${kind}:${variant}`));
  });
}

// Wall face offsets from a wall's centre-line: past the 0.1 m interior wall
// (and its optional 16 mm second-side skin) / past the 0.24 m exterior wall.
const WIN = 0.064;
const WEX = 0.124;

const TRAVERSABLE = new Set(['door', 'doubledoor', 'arch', 'shutter', 'passthrough']);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3();

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  return v.isVector3 ? v : new THREE.Vector3(v[0] ?? v.x ?? 0, v[1] ?? v.y ?? 0, v[2] ?? v.z ?? 0);
}

// ---------------------------------------------------------------------------

export class DecalSystem {
  constructor(game) {
    this.game = game || null;
    this.scene = game?.scene || null;

    this.group = new THREE.Group();
    this.group.name = 'decals';
    this.staticGroup = new THREE.Group();
    this.staticGroup.name = 'decals-static';
    this.dynamicGroup = new THREE.Group();
    this.dynamicGroup.name = 'decals-dynamic';
    this.group.add(this.staticGroup, this.dynamicGroup);
    if (this.scene) this.scene.add(this.group);

    this.budget = Math.max(8, settings.quality?.decalBudget ?? 96);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.rng = new Rng('decals:dynamic');

    this.pool = [];      // every dynamic mesh ever created
    this.free = [];      // idle dynamic meshes
    this.active = [];    // live dynamic decals, oldest first
    this.statics = [];
    this._staticMats = new Map();
    this._staticsPlaced = false;
    this.time = 0;

    // Static environmental decals go in at construction time: game.level is
    // already built when game.js creates the DecalSystem.
    if (this.game?.level) this.placeEnvironmentalDecals(this.game.level);
  }

  // --------------------------------------------------------------- lifecycle

  update(dt) {
    this.time += dt;
    if (!this.active.length) return;
    let write = 0;
    for (const d of this.active) {
      if (d.fade >= 0) {
        d.fade -= dt;
        if (d.fade <= 0) {
          this._release(d);
          continue;
        }
        d.mesh.material.opacity = d.fade / FADE_TIME;
      }
      this.active[write++] = d;
    }
    this.active.length = write;
  }

  /** Clears dynamic decals only; the environmental set is part of the level. */
  reset() {
    for (const d of this.active) this._release(d);
    this.active.length = 0;
    this.rng.reseed('decals:dynamic');
  }

  // ----------------------------------------------------------- dynamic pool

  _makeMesh() {
    const mat = new THREE.MeshLambertMaterial({
      map: decalTexture('bullet_concrete', 0),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(this.geometry, mat);
    mesh.visible = false;
    mesh.renderOrder = 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.dynamicGroup.add(mesh);
    this.pool.push(mesh);
    return mesh;
  }

  _release(d) {
    d.mesh.visible = false;
    this.free.push(d.mesh);
  }

  _acquire() {
    // Over budget: start fading the oldest decal that isn't already dying.
    if (this.active.length >= this.budget) {
      const victim = this.active.find((d) => d.fade < 0);
      if (victim) victim.fade = FADE_TIME;
    }
    if (this.free.length) return this.free.pop();
    if (this.pool.length < this.budget + POOL_SLACK) return this._makeMesh();
    // Pool exhausted (update() starved or a burst) — hard-recycle the oldest.
    const oldest = this.active.shift();
    if (oldest) this._release(oldest);
    return this.free.pop() || this._makeMesh();
  }

  _orient(mesh, point, normal, rotation) {
    const n = toVec3(normal).normalize();
    if (n.lengthSq() < 0.5) n.set(0, 1, 0);
    mesh.position.copy(toVec3(point)).addScaledVector(n, OFFSET);
    mesh.quaternion.setFromUnitVectors(Z_AXIS, n);
    if (rotation) mesh.rotateZ(rotation);
  }

  /** Dynamic decal. `kind` accepts both our names and SURFACE_PROPS aliases. */
  add(point, normal, kind, size) {
    let k = KIND_ALIASES[kind] || kind;
    if (!KINDS[k]) k = 'bullet_concrete';
    if (k === 'blood' && settings.get('reducedBlood')) k = 'scuff';
    const cfg = KINDS[k];

    const mesh = this._acquire();
    if (!mesh) return null;
    const variant = this.rng.int(0, cfg.variants - 1);
    mesh.material.map = decalTexture(k, variant);
    mesh.material.opacity = 1;
    mesh.material.needsUpdate = true;

    const s = (size || cfg.size) * this.rng.range(0.88, 1.15);
    this._orient(mesh, point, normal, this.rng.range(0, Math.PI * 2));
    // tiny per-decal ladder so overlapping hits never sort-flicker
    mesh.position.addScaledVector(_v.copy(mesh.position).sub(toVec3(point)).normalize(), this.rng.range(0, 0.001));
    mesh.scale.set(s, s, 1);
    mesh.visible = true;
    assets.tag(mesh, ASSET_ID(k));

    const decal = { mesh, kind: k, born: this.time, fade: -1 };
    this.active.push(decal);
    return decal;
  }

  // ---------------------------------------------------------------- statics

  _staticMaterial(kind, variant) {
    const key = `${kind}:${variant}`;
    let mat = this._staticMats.get(key);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({
        map: decalTexture(kind, variant),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      this._staticMats.set(key, mat);
    }
    return mat;
  }

  /**
   * Permanent decal; survives reset(). `size` may be a number (square) or
   * [width, height] for elongated marks (cable runs, rack-top dust).
   */
  addStatic(point, normal, kind, size, rotation = 0) {
    const cfg = KINDS[kind] || KINDS.floor_dirt;
    const k = KINDS[kind] ? kind : 'floor_dirt';
    const variant = (this._staticRng ||= new Rng('decals:variants')).int(0, cfg.variants - 1);
    const mesh = new THREE.Mesh(this.geometry, this._staticMaterial(k, variant));
    mesh.renderOrder = 1;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this._orient(mesh, point, normal, rotation);
    // step overlapping statics apart by a fraction of a millimetre
    const n = toVec3(normal).normalize();
    mesh.position.addScaledVector(n, (this.statics.length % 8) * 0.0004);
    const [sw, sh] = Array.isArray(size) ? size : [size || cfg.size, size || cfg.size];
    mesh.scale.set(sw, sh, 1);
    assets.tag(mesh, ASSET_ID(k));
    this.staticGroup.add(mesh);
    const decal = { mesh, kind: k, static: true };
    this.statics.push(decal);
    return decal;
  }

  /**
   * Seeded environmental storytelling pass. Called once from the constructor
   * (game.level exists by then); safe to call again — it is idempotent.
   */
  placeEnvironmentalDecals(level) { // eslint-disable-line no-unused-vars
    if (this._staticsPlaced) return this;
    this._staticsPlaced = true;
    const rng = new Rng('decals:static');
    const j = (a) => rng.range(-a, a);

    // Floor decal: canvas-up points north at rot 0; rot spins in-plane.
    const F = (kind, x, z, size, rot = rng.range(0, Math.PI * 2), fl = 'ground') =>
      this.addStatic([x, FLOOR_Y[fl], z], [0, 1, 0], kind, size, rot);
    const Wall = (kind, x, y, z, nx, nz, size, rot = j(0.08)) =>
      this.addStatic([x, y, z], [nx, 0, nz], kind, size, rot);

    // ---- floor dirt at every traversable opening -------------------------
    for (const o of OPENINGS) {
      if (!TRAVERSABLE.has(o.type)) continue;
      const y = FLOOR_Y[o.floor];
      const [x, z] = o.axis === 'x' ? [o.at, o.coord] : [o.coord, o.at];
      const size = Math.min(1.5, o.width * 0.6 + 0.35);
      const rot = (o.axis === 'x' ? 0 : Math.PI / 2) + j(0.12);
      this.addStatic([x + j(0.08), y, z + j(0.08)], [0, 1, 0], 'floor_dirt', size, rot);
    }

    // ---- snow tracked in: entrance -> vestibule -> south-west door -> lobby
    const track = [
      [0.0, -15.4], [-0.15, -14.3], [0.1, -13.2], [-0.1, -12.1], [0.15, -11.0],
      [-0.2, -9.9], [-1.0, -9.1], [-1.9, -8.3], [-2.1, -7.2], [-2.0, -6.1],
    ];
    for (let i = 0; i < track.length; i++) {
      const [x, z] = track[i];
      const [nx, nz] = track[Math.min(i + 1, track.length - 1)];
      const dx = nx - x, dz = nz - z;
      // canvas-up maps to world -Z at rot 0, so heading = atan2(-dx, -dz)
      const rot = (dx || dz) ? Math.atan2(-dx, -dz) : Math.PI;
      const size = 0.62 - i * 0.02; // prints dry out as they go
      F('footprint_snow', x + j(0.06), z + j(0.06), size, rot + j(0.1));
    }
    F('snow_melt', 0 + j(0.1), -15.1, 1.0, undefined);
    F('snow_melt', 0.35, -13.6, 0.8);
    F('snow_melt', -0.2, -11.6, 0.7);

    // ---- carpet wear along the circulation routes ------------------------
    for (let i = 0; i < 7; i++) {
      F('carpet_wear', -11 + i * 3.3 + j(0.3), 4.5 + j(0.25), 2.3, j(0.1)); // open office aisle
    }
    for (const x of [12.5, 15.5, 18.5]) F('carpet_wear', x, -1 + j(0.15), 2.0, j(0.1)); // east link
    for (const x of [-7, -2.5, 2, 6.5]) F('carpet_wear', x + j(0.2), -6.5 + j(0.2), 2.2, j(0.1), 'upper'); // exec corridor
    F('carpet_wear', -12.3, -6.35, 1.8, Math.PI / 2 + j(0.1)); // waiting arch
    F('carpet_wear', 11.8, 0.9, 1.5, Math.PI / 2 + j(0.1));    // conference door path
    F('carpet_wear', 13.1, 2.2, 1.5, 0.9);
    for (const x of [-9, -1, 7]) F('carpet_wear', x + j(0.2), 10 + j(0.2), 2.0, j(0.1)); // mid corridor vinyl

    // ---- wall scuffs at chair-back and trolley height ---------------------
    for (const x of [-6.5, -0.5, 2.5]) Wall('wall_scuff', x, 0.62, 9 + WIN, 0, 1, 0.9);      // midcorr N
    for (const x of [-5.5, 1, 6.9]) Wall('wall_scuff', x, 0.6, 11 - WIN, 0, -1, 0.9);        // midcorr S
    for (const x of [-11, -2, 7]) Wall('wall_scuff', x, 0.85, 15.5 + WIN, 0, 1, 1.0);        // servicecorr N (trolleys)
    for (const x of [-6, 3]) Wall('wall_scuff', x, 0.85, 18 - WEX, 0, -1, 1.0);              // servicecorr S
    Wall('wall_scuff', -11.5 + WIN, 0.65, 14.2, 1, 0, 0.8);                                  // copyroom W
    Wall('wall_scuff', 14 + WIN, 0.8, 8.6, 1, 0, 0.9);                                       // loading W
    Wall('wall_scuff', 16.4, 0.9, 18 - WEX, 0, -1, 1.0);                                     // loading dock face
    Wall('wall_scuff', 15.5, 0.55, 7 - WIN, 0, -1, 0.8);                                     // conference chair backs
    Wall('wall_scuff', -22 + WEX, 0.55, 0.4, 1, 0, 0.8);                                     // breakroom chairs

    // ---- contact grime where walls meet floors on the working routes -------
    // (band bottom sits on the floor: the quad is 0.6 m tall, centred at 0.3)
    const Grime = (x, z, nx, nz, w = 2.2) =>
      this.addStatic([x, FLOOR_Y.ground + 0.3, z], [nx, 0, nz], 'contact_grime', [w, 0.6], j(0.04));
    for (const x of [-8, 0, 6]) Grime(x + j(0.3), 15.5 + WIN, 0, 1);        // service corridor N
    Grime(-3 + j(0.3), 18 - WEX, 0, -1);                                    // service corridor S
    Grime(14 + WIN, 12.2, 1, 0, 2.6);                                       // loading W wall
    Grime(17.2, 7 + WIN, 0, 1, 2.0);                                        // loading S wall
    for (const x of [22.4, 25.2]) Grime(x, 7 + WIN, 0, 1, 2.4);             // garage S wall
    Grime(23.6, 18 - WEX, 0, -1, 2.6);                                      // garage N wall
    Grime(-4 + j(0.3), 9 + WIN, 0, 1);                                      // mid corridor N
    Grime(3 + j(0.3), 11 - WIN, 0, -1);                                     // mid corridor S
    Grime(0, -8.5 + WEX, 0, 1, 1.7);                                        // lobby entrance pier
    Grime(8 + j(0.2), -WIN, 0, -1, 2.0);                                    // lobby south wall

    // ---- hand grime around every door handle (both faces, latch side) ------
    let latchFlip = 0;
    for (const o of OPENINGS) {
      if (o.type !== 'door' && o.type !== 'doubledoor') continue;
      const y = FLOOR_Y[o.floor] + 1.05;
      // Single doors: grime at the latch edge. Double doors: at the meeting
      // stiles. Alternate the latch side so runs of doors do not match.
      const lx = o.type === 'doubledoor' ? 0.13 : o.width / 2 + 0.13;
      const side = (latchFlip++ % 2) * 2 - 1;
      const off = o.id === 'op-ext-entry' ? WEX : WIN;   // facade wall is thicker
      for (const s of [-1, 1]) {
        if (o.axis === 'x') {
          this.addStatic([o.at + side * lx, y, o.coord + s * off], [0, 0, s], 'handle_grime', 0.34, j(0.2));
        } else {
          this.addStatic([o.coord + s * off, y, o.at + side * lx], [s, 0, 0], 'handle_grime', 0.34, j(0.2));
        }
      }
    }

    // ---- the restroom leak: under the stained tile at grid [2,3] ----------
    // (build.js stains restroom ceiling cells [1,1] and [2,3]; cell [2,3] is
    // centred near (-20.46, 9.2) — the mop bucket in populate.js sits there.)
    // y: grid tiles hang ~51 mm below the 2.8 m soffit (rail + drop + tile
    // thickness + sag), so anchor the decal just under the tile face.
    this.addStatic([-20.45, 2.8 - 0.055, 9.2], [0, -1, 0], 'ceiling_leak', 1.1, rng.range(0, Math.PI * 2));
    F('water_stain', -20.4, 9.25, 0.95);
    F('water_stain', -19.9, 9.5, 0.5);
    F('water_stain', 9.3, 14.5, 1.2);       // mechanical: building water service drips
    F('floor_dirt', 23.2, 10.2, 1.7);       // garage: tyre grime under the vehicle bay
    F('floor_dirt', 24.5, 15, 1.4);

    // ---- dust on top of the archive racks and copy-room shelving ----------
    for (const rz of [-1.7, -1.05, 1.05, 1.7]) {
      this.addStatic([-14.6, FLOOR_Y.upper + 2.1, rz], [0, 1, 0], 'dust', [2.3, 0.55], j(0.04));
    }
    this.addStatic([-5.35, 1.8, 12.4], [0, 1, 0], 'dust', [0.7, 0.3], Math.PI / 2);
    this.addStatic([-5.35, 1.8, 13.3], [0, 1, 0], 'dust', [0.7, 0.3], Math.PI / 2);

    // ---- fingerprints on the public glazing --------------------------------
    // Panes sit on the wall centre-line; the decal's own 6 mm normal offset
    // lifts the smudge off the glass without floating in the opening.
    Wall('glass_smudge', -9.6, 1.15, -8.5, 0, 1, 0.5);    // lobby curtain wall, west pane
    Wall('glass_smudge', -8.9, 1.4, -8.5, 0, 1, 0.5);
    Wall('glass_smudge', 9.0, 1.3, -8.5, 0, 1, 0.5);      // east pane
    Wall('glass_smudge', 11, 1.25, 3.2, -1, 0, 0.55);     // conference glass wall, office side
    Wall('glass_smudge', 11, 1.05, 4.8, -1, 0, 0.55);
    Wall('glass_smudge', -7, 1.35, -10.2, 1, 0, 0.5);     // vestibule watch window

    // ---- copy room: torn tape and the ghost of a removed sign -------------
    Wall('tape_residue', -10.4, 1.5, 11 + WIN, 0, 1, 0.42);
    Wall('tape_residue', -6.4, 1.45, 11 + WIN, 0, 1, 0.4);
    Wall('tape_residue', -5.8, 1.6, 11 + WIN, 0, 1, 0.45);
    // taped-over card readers (vestibule security door / server room door)
    Wall('tape_residue', -1.5, 1.15, -8.5 - WIN, 0, -1, 0.28);
    Wall('tape_residue', 4.8, 1.15, 11 - WIN, 0, -1, 0.28);

    // ---- cable marks along the service corridor and server room -----------
    for (const x of [-10, -4, 2, 8]) {
      this.addStatic([x + j(0.2), FLOOR_Y.ground, 17.42 + j(0.05)], [0, 1, 0], 'cable_mark', [2.6, 0.5], j(0.05));
    }
    this.addStatic([4, FLOOR_Y.ground, 12.6], [0, 1, 0], 'cable_mark', [2.0, 0.4], Math.PI / 2 + j(0.05));
    this.addStatic([2.6, FLOOR_Y.ground, 13.8], [0, 1, 0], 'cable_mark', [1.8, 0.4], j(0.05));
    this.addStatic([9, FLOOR_Y.ground, 12.3], [0, 1, 0], 'cable_mark', [1.8, 0.4], Math.PI / 2 + j(0.05));

    // ---- cracked plaster in the stairwells ---------------------------------
    Wall('cracked_plaster', -23 + WEX, 1.7, -4.2, 1, 0, 0.95);
    Wall('cracked_plaster', -23 + WEX, 2.7, -6.2, 1, 0, 0.9);
    Wall('cracked_plaster', 18 - WEX, 2.1, -5.0, -1, 0, 0.95);
    Wall('cracked_plaster', -23 + WEX, FLOOR_Y.upper + 1.5, -4.5, 1, 0, 0.85);

    // ---- chipped paint on the dock and garage door frames ------------------
    Wall('chipped_paint', 20 - WIN, 0.9, 10.35, -1, 0, 0.5);
    Wall('chipped_paint', 20 - WIN, 1.15, 14.65, -1, 0, 0.5);
    Wall('chipped_paint', 20 + WIN, 0.75, 10.35, 1, 0, 0.45);
    Wall('chipped_paint', 27 - WEX, 1.0, 10.15, -1, 0, 0.5);
    Wall('chipped_paint', 14 + WIN, 1.2, 9.15, 1, 0, 0.4);

    // ---- the dropped coffee in the lobby, and the break-room machine -------
    F('coffee_stain', -2.3, -4.75, 0.55);
    F('coffee_stain', -2.02, -4.5, 0.3);
    F('coffee_stain', -21.25, 3.35, 0.35);

    // ---- drag marks where the hostage chair was hauled into position -------
    F('scuff', 15.9, 4.3, 0.5);
    F('scuff', 16.3, 4.8, 0.45);

    return this;
  }
}
