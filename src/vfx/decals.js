import * as THREE from 'three';
import { settings } from '../core/settings.js';
import { makeRng, hashString } from '../core/rng.js';
import { decalTexture } from '../art/textures.js';

/**
 * Runtime decal pool — bullet impacts, scorch, blood, scuffs, door damage.
 * Owner: Fable 4 (VFX).
 *
 * Distinct from src/props/decals.js (Fable 3's baked storytelling decals):
 * these are DYNAMIC combat marks placed at runtime on arbitrary surfaces.
 *
 * Each decal is a camera-independent quad on the hit surface:
 *   - offset 0.008 m along the surface normal
 *   - polygonOffset(-4, -4) + depthWrite:false so it can never z-fight
 *   - oriented to the surface with a random roll
 *   - fades in over 80 ms (no pop), fades out at end of life
 *   - hard cap of settings.preset.decalBudget, oldest recycled first
 */

const NORMAL_OFFSET = 0.008;

export const DECAL_KINDS = [
  'bullet.concrete', 'bullet.drywall', 'bullet.wood', 'bullet.metal', 'bullet.glass',
  'bullet.carpet', 'bullet.ceramic', 'bullet.vinyl', 'bullet.plastic', 'bullet.snow',
  'scorch', 'blood', 'scuff', 'door',
];

/** Surfaces the game reports → decal kind (tile/rubber/flesh alias into families). */
export function decalKindForSurface(surface) {
  switch (surface) {
    case 'concrete': return 'bullet.concrete';
    case 'drywall': return 'bullet.drywall';
    case 'wood': return 'bullet.wood';
    case 'metal': return 'bullet.metal';
    case 'glass': return 'bullet.glass';
    case 'carpet': return 'bullet.carpet';
    case 'ceramic': return 'bullet.ceramic';
    case 'tile': return 'bullet.ceramic';
    case 'vinyl': return 'bullet.vinyl';
    case 'plastic': return 'bullet.plastic';
    case 'rubber': return 'bullet.plastic';
    case 'snow': return 'bullet.snow';
    case 'flesh': return null; // flesh gets blood, never a bullet hole
    default: return 'bullet.concrete';
  }
}

/* ------------------------------------------------------------------ */
/* Painted decal textures (3 variants per bullet family, 2 elsewhere)   */
/* ------------------------------------------------------------------ */

function ragged(ctx, cx, cy, rBase, rnd, lobes = 9) {
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = rBase * (0.72 + rnd() * 0.55);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function radialFade(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Dark punched hole with a bright fractured rim — the shared bullet core. */
function bulletCore(ctx, s, rnd, { hole = 0.09, rim = 0.16, rimColor = 'rgba(255,255,255,0.5)', holeColor = 'rgba(12,11,10,0.96)' }) {
  const c = s / 2;
  radialFade(ctx, c, c, s * rim, [
    [0, rimColor],
    [0.65, rimColor.replace(/[\d.]+\)$/, '0.16)')],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ragged(ctx, c, c, s * hole, rnd, 8);
  ctx.fillStyle = holeColor;
  ctx.fill();
  // Inner shadow ring
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = s * 0.012;
  ragged(ctx, c, c, s * hole * 1.15, rnd, 8);
  ctx.stroke();
}

function cracks(ctx, s, rnd, count, len, color, width = 1.4) {
  const c = s / 2;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    let x = c + Math.cos(a) * s * 0.06;
    let y = c + Math.sin(a) * s * 0.06;
    ctx.lineWidth = width * (0.6 + rnd() * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + (rnd() * 3 | 0);
    let ang = a;
    for (let j = 0; j < segs; j++) {
      ang += (rnd() - 0.5) * 0.9;
      const l = s * len * (0.3 + rnd() * 0.7);
      x += Math.cos(ang) * l;
      y += Math.sin(ang) * l;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

const PAINTERS = {
  'bullet.concrete': (ctx, s, rnd) => {
    radialFade(ctx, s / 2, s / 2, s * 0.34, [[0, 'rgba(96,94,90,0.55)'], [0.6, 'rgba(120,118,112,0.22)'], [1, 'rgba(0,0,0,0)']]);
    cracks(ctx, s, rnd, 4, 0.1, 'rgba(50,49,47,0.6)');
    bulletCore(ctx, s, rnd, { hole: 0.085, rim: 0.17, rimColor: 'rgba(178,175,168,0.5)' });
  },
  'bullet.drywall': (ctx, s, rnd) => {
    // Bigger, softer, powdery white halo
    radialFade(ctx, s / 2, s / 2, s * 0.46, [[0, 'rgba(238,234,226,0.75)'], [0.5, 'rgba(230,226,218,0.32)'], [1, 'rgba(0,0,0,0)']]);
    ragged(ctx, s / 2, s / 2, s * 0.2, rnd, 11);
    ctx.fillStyle = 'rgba(214,208,196,0.55)';
    ctx.fill();
    bulletCore(ctx, s, rnd, { hole: 0.11, rim: 0.2, rimColor: 'rgba(246,242,234,0.85)', holeColor: 'rgba(28,25,22,0.94)' });
  },
  'bullet.wood': (ctx, s, rnd) => {
    // Splintered elongated tear along the grain
    const c = s / 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.scale(1, 1.55);
    radialFade(ctx, 0, 0, s * 0.24, [[0, 'rgba(112,78,44,0.6)'], [1, 'rgba(0,0,0,0)']]);
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const a = (rnd() < 0.5 ? -1 : 1) * (Math.PI / 2 + (rnd() - 0.5) * 0.7);
      const l = s * (0.1 + rnd() * 0.16);
      ctx.strokeStyle = `rgba(70,46,24,${0.4 + rnd() * 0.4})`;
      ctx.lineWidth = 1 + rnd() * 2.4;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(a) * l, c + Math.sin(a) * l);
      ctx.stroke();
    }
    bulletCore(ctx, s, rnd, { hole: 0.08, rim: 0.13, rimColor: 'rgba(178,132,84,0.55)', holeColor: 'rgba(24,15,8,0.95)' });
  },
  'bullet.metal': (ctx, s, rnd) => {
    // Bright dented crater with radial burnish streaks
    const c = s / 2;
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2;
      ctx.strokeStyle = `rgba(220,224,228,${0.2 + rnd() * 0.3})`;
      ctx.lineWidth = 0.8 + rnd() * 1.4;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * s * 0.06, c + Math.sin(a) * s * 0.06);
      ctx.lineTo(c + Math.cos(a) * s * (0.13 + rnd() * 0.12), c + Math.sin(a) * s * (0.13 + rnd() * 0.12));
      ctx.stroke();
    }
    radialFade(ctx, c, c, s * 0.15, [[0, 'rgba(235,238,240,0.8)'], [0.6, 'rgba(180,186,190,0.3)'], [1, 'rgba(0,0,0,0)']]);
    ragged(ctx, c, c, s * 0.06, rnd, 7);
    ctx.fillStyle = 'rgba(30,32,34,0.92)';
    ctx.fill();
  },
  'bullet.glass': (ctx, s, rnd) => {
    const c = s / 2;
    cracks(ctx, s, rnd, 9, 0.16, 'rgba(232,244,252,0.75)', 1.1);
    // Conchoidal frosted ring
    radialFade(ctx, c, c, s * 0.2, [[0, 'rgba(226,240,250,0.7)'], [0.7, 'rgba(226,240,250,0.2)'], [1, 'rgba(0,0,0,0)']]);
    ragged(ctx, c, c, s * 0.055, rnd, 8);
    ctx.fillStyle = 'rgba(18,22,26,0.85)';
    ctx.fill();
  },
  'bullet.carpet': (ctx, s, rnd) => {
    // Frayed dark pucker, almost no crater
    const c = s / 2;
    radialFade(ctx, c, c, s * 0.2, [[0, 'rgba(28,28,30,0.55)'], [0.7, 'rgba(38,38,40,0.2)'], [1, 'rgba(0,0,0,0)']]);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2;
      const l = s * (0.05 + rnd() * 0.07);
      ctx.strokeStyle = `rgba(20,20,22,${0.3 + rnd() * 0.3})`;
      ctx.lineWidth = 0.8 + rnd();
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * s * 0.04, c + Math.sin(a) * s * 0.04);
      ctx.lineTo(c + Math.cos(a) * (s * 0.04 + l), c + Math.sin(a) * (s * 0.04 + l));
      ctx.stroke();
    }
    ragged(ctx, c, c, s * 0.05, rnd, 9);
    ctx.fillStyle = 'rgba(12,12,13,0.85)';
    ctx.fill();
  },
  'bullet.ceramic': (ctx, s, rnd) => {
    // Sharp white spall with clean radial fractures
    const c = s / 2;
    ragged(ctx, c, c, s * 0.17, rnd, 6);
    ctx.fillStyle = 'rgba(240,240,236,0.7)';
    ctx.fill();
    cracks(ctx, s, rnd, 6, 0.13, 'rgba(120,118,112,0.65)', 1.2);
    bulletCore(ctx, s, rnd, { hole: 0.07, rim: 0.11, rimColor: 'rgba(250,250,246,0.9)', holeColor: 'rgba(40,38,36,0.92)' });
  },
  'bullet.vinyl': (ctx, s, rnd) => {
    const c = s / 2;
    radialFade(ctx, c, c, s * 0.2, [[0, 'rgba(60,60,58,0.45)'], [1, 'rgba(0,0,0,0)']]);
    // Curled lip
    ctx.strokeStyle = 'rgba(210,210,205,0.5)';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.arc(c, c, s * 0.085, rnd() * 6.3, rnd() * 6.3 + 2.6);
    ctx.stroke();
    bulletCore(ctx, s, rnd, { hole: 0.075, rim: 0.1, rimColor: 'rgba(150,150,146,0.4)' });
  },
  'bullet.plastic': (ctx, s, rnd) => {
    const c = s / 2;
    cracks(ctx, s, rnd, 5, 0.12, 'rgba(228,228,224,0.5)', 1.0);
    radialFade(ctx, c, c, s * 0.14, [[0, 'rgba(200,200,196,0.4)'], [1, 'rgba(0,0,0,0)']]);
    ragged(ctx, c, c, s * 0.07, rnd, 7);
    ctx.fillStyle = 'rgba(20,20,20,0.9)';
    ctx.fill();
  },
  'bullet.snow': (ctx, s, rnd) => {
    // Soft blue-shadowed pocket
    const c = s / 2;
    radialFade(ctx, c, c, s * 0.3, [[0, 'rgba(168,194,220,0.65)'], [0.55, 'rgba(190,212,232,0.3)'], [1, 'rgba(0,0,0,0)']]);
    ragged(ctx, c, c, s * 0.11, rnd, 10);
    ctx.fillStyle = 'rgba(126,152,182,0.7)';
    ctx.fill();
  },
  scorch: (ctx, s, rnd) => {
    const c = s / 2;
    radialFade(ctx, c, c, s * 0.46, [[0, 'rgba(14,12,10,0.9)'], [0.45, 'rgba(24,20,16,0.6)'], [0.8, 'rgba(38,32,26,0.22)'], [1, 'rgba(0,0,0,0)']]);
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2;
      const r0 = s * (0.2 + rnd() * 0.14);
      const r1 = r0 + s * (0.08 + rnd() * 0.14);
      ctx.strokeStyle = `rgba(10,9,8,${0.3 + rnd() * 0.4})`;
      ctx.lineWidth = 2 + rnd() * 5;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      ctx.stroke();
    }
  },
  blood: (ctx, s, rnd) => {
    const c = s / 2;
    ragged(ctx, c, c, s * 0.17, rnd, 12);
    ctx.fillStyle = 'rgba(96,10,10,0.82)';
    ctx.fill();
    ragged(ctx, c + (rnd() - 0.5) * s * 0.05, c + (rnd() - 0.5) * s * 0.05, s * 0.1, rnd, 9);
    ctx.fillStyle = 'rgba(70,6,7,0.85)';
    ctx.fill();
    // Satellite droplets flung outward
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2;
      const d = s * (0.18 + rnd() * 0.3);
      const r = s * (0.006 + rnd() * 0.02);
      ctx.fillStyle = `rgba(${86 + (rnd() * 30 | 0)},8,9,${0.5 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, r * (1 + rnd()), r, a, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  scuff: (ctx, s, rnd) => {
    const c = s / 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate((rnd() - 0.5) * 0.8);
    for (let i = 0; i < 9; i++) {
      const y = (rnd() - 0.5) * s * 0.3;
      ctx.strokeStyle = `rgba(30,29,28,${0.14 + rnd() * 0.22})`;
      ctx.lineWidth = 1 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(-s * (0.2 + rnd() * 0.2), y);
      ctx.bezierCurveTo(-s * 0.1, y + (rnd() - 0.5) * 8, s * 0.1, y + (rnd() - 0.5) * 8, s * (0.2 + rnd() * 0.2), y + (rnd() - 0.5) * s * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  },
  door: (ctx, s, rnd) => {
    // Cluster of splintered dents around a crushed centre
    const c = s / 2;
    radialFade(ctx, c, c, s * 0.34, [[0, 'rgba(58,40,22,0.6)'], [0.7, 'rgba(80,58,34,0.2)'], [1, 'rgba(0,0,0,0)']]);
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * s * 0.16;
      ragged(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, s * (0.035 + rnd() * 0.05), rnd, 7);
      ctx.fillStyle = `rgba(26,17,9,${0.6 + rnd() * 0.3})`;
      ctx.fill();
    }
    cracks(ctx, s, rnd, 6, 0.14, 'rgba(42,28,14,0.65)', 1.6);
  },
};

const VARIANTS = { default: 3, scorch: 2, blood: 4, scuff: 2, door: 3 };

function variantCount(kind) {
  return VARIANTS[kind] ?? VARIANTS.default;
}

function texFor(kind, variant) {
  const key = `vfx.decal.${kind}.${variant}`;
  return decalTexture(key, 128, (ctx, s) => {
    const rnd = makeRng(hashString(key));
    PAINTERS[kind](ctx, s, rnd);
  });
}

/** Base world size (metres) per kind; bullets stay small, marks are larger. */
const KIND_SIZE = {
  'bullet.drywall': 0.16,
  'bullet.snow': 0.22,
  scorch: 0.9,
  blood: 0.55,
  scuff: 0.45,
  door: 0.34,
};

const KIND_TTL = {
  blood: 150,
  scorch: 240,
  scuff: 240,
  door: 240,
};

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

const _q = new THREE.Quaternion();
const _roll = new THREE.Quaternion();
const _n = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);

export class DecalPool {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vfx.decals';
    scene.add(this.group);
    this.slots = [];
    this.stamp = 0;
    this.count = 0;
    this._geo = new THREE.PlaneGeometry(1, 1);
    this.setBudget(settings.preset.decalBudget ?? 96);
  }

  setBudget(budget) {
    this.budget = Math.max(4, budget | 0);
    // Shrink: drop the oldest extra slots. Grow: slots are created on demand.
    while (this.slots.length > this.budget) {
      const s = this._oldest();
      this._free(s);
      this.slots.splice(this.slots.indexOf(s), 1);
      s.mesh.geometry = null;
      s.material.dispose();
      this.group.remove(s.mesh);
    }
  }

  _oldest() {
    let best = this.slots[0];
    for (const s of this.slots) if (s.stamp < best.stamp) best = s;
    return best;
  }

  _free(slot) {
    if (slot.active) this.count--;
    slot.active = false;
    slot.mesh.visible = false;
  }

  _acquire() {
    for (const s of this.slots) if (!s.active) return s;
    if (this.slots.length < this.budget) {
      const material = new THREE.MeshLambertMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(this._geo, material);
      mesh.renderOrder = 6;
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      mesh.userData.noHit = true;
      mesh.userData.transparentToSight = true;
      this.group.add(mesh);
      const slot = { mesh, material, active: false, age: 0, ttl: 60, stamp: 0, alpha: 1 };
      this.slots.push(slot);
      return slot;
    }
    const s = this._oldest(); // hard cap: recycle oldest first
    this._free(s);
    return s;
  }

  /**
   * Place a decal.
   * kind    one of DECAL_KINDS
   * point   THREE.Vector3 (or {x,y,z}) on the surface
   * normal  THREE.Vector3 (or {x,y,z}) surface normal (unit)
   * opts    { size, roll, ttl, alpha }
   */
  add(kind, point, normal, opts = {}) {
    if (!PAINTERS[kind]) return null;
    if (kind === 'blood' && settings.get('reducedBlood')) return null;
    let slot;
    try {
      slot = this._acquire();
    } catch {
      return null;
    }
    const variant = (Math.random() * variantCount(kind)) | 0;
    let tex = null;
    try {
      tex = texFor(kind, variant); // needs a DOM canvas; headless-safe fallback below
    } catch {
      tex = null;
    }
    slot.material.map = tex;
    slot.material.color.setScalar(1);
    slot.material.opacity = 0;
    slot.material.needsUpdate = true;

    const base = KIND_SIZE[kind] ?? 0.12;
    const size = (opts.size ?? base) * (0.85 + Math.random() * 0.4);
    _n.set(normal.x, normal.y, normal.z).normalize();
    _q.setFromUnitVectors(_zAxis, _n);
    _roll.setFromAxisAngle(_n, opts.roll ?? Math.random() * Math.PI * 2);
    slot.mesh.quaternion.copy(_roll.multiply(_q));
    slot.mesh.position.set(
      point.x + _n.x * NORMAL_OFFSET,
      point.y + _n.y * NORMAL_OFFSET,
      point.z + _n.z * NORMAL_OFFSET,
    );
    slot.mesh.scale.setScalar(size);
    slot.mesh.updateMatrix();
    slot.mesh.visible = true;

    slot.active = true;
    slot.age = 0;
    slot.ttl = opts.ttl ?? KIND_TTL[kind] ?? 90;
    slot.alpha = opts.alpha ?? 1;
    slot.stamp = ++this.stamp;
    this.count++;
    return slot;
  }

  update(dt) {
    for (const s of this.slots) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.ttl) {
        this._free(s);
        continue;
      }
      let a = s.alpha;
      if (s.age < 0.08) a *= s.age / 0.08; // fade in — never pops
      const left = s.ttl - s.age;
      if (left < 3) a *= left / 3; // fade out
      s.material.opacity = a;
    }
  }

  reset() {
    for (const s of this.slots) this._free(s);
  }

  dispose() {
    this.reset();
    for (const s of this.slots) s.material.dispose();
    this.slots.length = 0;
    this._geo.dispose();
    this.scene.remove(this.group);
  }
}
