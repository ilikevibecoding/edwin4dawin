// Radar model + the physical command console: a rotating-beam detection model
// that builds tracks, a canvas PPI scope, a stylised holographic 3D track
// volume, and clickable console controls.
//
// Everything drawn here is invented for a fictional entertainment demo — the
// symbology, designations and legends are not based on any real standard.

import * as THREE from 'three';
import { RADAR, BATTERIES } from './config.js';
import { bus, state, BATTERY_STATE, PHASE } from './state.js';
import { materials, std, applyAtmosphere } from './util/materials.js';
import { chamferBox, mergeParts, transform, cylinder, greebleField, pathTube, boltRow } from './util/geom.js';
import { CanvasSurface } from './util/textures.js';
import { leadSolution } from './physics.js';

let trackSeq = 0;

/* ------------------------------------------------------------ radar logic */

export class RadarSystem {
  constructor(rng) {
    this.rng = rng;
    this.angle = 0;
    this.tracks = [];
    this.byThreat = new Map();
    this.time = 0;
  }

  reset() {
    this.tracks.length = 0;
    this.byThreat.clear();
    trackSeq = 0;
  }

  /** Fictional detection: illumination when the beam sweeps past the target. */
  update(dt, threats) {
    this.time += dt;
    const prevAngle = this.angle;
    this.angle = (this.angle + (RADAR.rpm / 60) * Math.PI * 2 * dt) % (Math.PI * 2);
    const swept = (a) => {
      const rel = THREE.MathUtils.euclideanModulo(a - prevAngle, Math.PI * 2);
      const step = THREE.MathUtils.euclideanModulo(this.angle - prevAngle, Math.PI * 2);
      return rel <= step + RADAR.beamWidth;
    };

    for (const t of threats) {
      const range = Math.hypot(t.pos.x, t.pos.z);
      if (range > RADAR.range || t.pos.y < RADAR.minAlt) continue;
      const bearing = THREE.MathUtils.euclideanModulo(Math.atan2(t.pos.x, -t.pos.z), Math.PI * 2);
      const existing = this.byThreat.get(t);
      // Firm tracks are carried by the dedicated tracking channel every frame;
      // new contacts still have to wait for the search beam to sweep past.
      if (!swept(bearing) && !(existing && existing.firm)) continue;
      let tr = existing;
      if (!tr) {
        tr = {
          id: `TK${String(++trackSeq).padStart(3, '0')}`,
          threat: t,
          quality: 0,
          firm: false,
          lastSeen: this.time,
          pos: t.pos.clone(),
          vel: t.vel.clone(),
          bearing,
          range,
          alt: t.pos.y,
          speed: t.vel.length(),
          classified: 'UNKNOWN',
          firstSeen: this.time,
          ambiguous: true,
          engaged: false,
          engagedBy: null,
          result: null,
        };
        this.tracks.push(tr);
        this.byThreat.set(t, tr);
        bus.emit('track:new', tr);
      }
      // Larger returns build a firm track faster; decoys stay ambiguous longer.
      tr.quality = Math.min(1, tr.quality + (dt + 0.16) * (0.7 + t.rcs));
      tr.lastSeen = this.time;
      // Position report with a little measurement jitter.
      const j = RADAR.jitter * (1 - tr.quality * 0.8);
      tr.pos.set(
        t.pos.x + this.rng.gauss(0, j),
        t.pos.y + this.rng.gauss(0, j),
        t.pos.z + this.rng.gauss(0, j)
      );
      tr.vel.copy(t.vel);
      tr.range = range;
      tr.bearing = bearing;
      tr.alt = t.pos.y;
      tr.speed = t.vel.length();
      if (!tr.firm && tr.quality > 0.72) {
        tr.firm = true;
        bus.emit('track:firm', tr);
      }
      if (tr.firm) {
        // Discrimination is deliberately late: a light decoy only separates out
        // once it has bled speed in denser air or been watched long enough.
        const observed = this.time - tr.firstSeen;
        const revealed = t.kind === 'DECOY' && (t.pos.y < 9000 || observed > 15);
        tr.classified = revealed ? 'LIGHT / DECOY' : 'BALLISTIC RV';
        tr.ambiguous = !revealed && observed < 15;
      }
    }

    // Drop stale tracks.
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      const gone = !tr.threat.alive;
      const limit = tr.firm ? RADAR.firmDropTime : RADAR.dropTime;
      if (gone || this.time - tr.lastSeen > limit) {
        tr.lost = true;
        bus.emit('track:lost', tr);
        this.byThreat.delete(tr.threat);
        this.tracks.splice(i, 1);
      }
    }
  }

  firmTracks() {
    return this.tracks.filter((t) => t.firm && t.threat.alive);
  }

  find(id) {
    return this.tracks.find((t) => t.id === id) || null;
  }

  /** Simplified engagement cue: where the round would meet the track. */
  predictIntercept(track, batteryCfg, batteryPos, out = new THREE.Vector3()) {
    const speed = batteryCfg.maxSpeed * 0.62;
    const tti = leadSolution(batteryPos, speed, track.threat.pos, track.threat.vel, out, 0.55, 5);
    return { point: out, tti };
  }

  /** Is the cued intercept inside this battery's advertised basket? */
  evaluateWindow(track, batteryCfg, batteryPos) {
    const { point, tti } = this.predictIntercept(track, batteryCfg, batteryPos, new THREE.Vector3());
    const alt = point.y;
    const rng = Math.hypot(point.x - batteryPos.x, point.z - batteryPos.z);
    const okAlt = alt >= batteryCfg.windowAlt[0] && alt <= batteryCfg.windowAlt[1];
    const okRange = rng >= batteryCfg.windowRange[0] && rng <= batteryCfg.windowRange[1];
    let quality = 1;
    if (!okAlt) quality *= 0.25;
    if (!okRange) quality *= 0.3;
    // Best solution sits in the middle of the basket.
    const altMid = (batteryCfg.windowAlt[0] + batteryCfg.windowAlt[1]) / 2;
    const span = (batteryCfg.windowAlt[1] - batteryCfg.windowAlt[0]) / 2;
    quality *= 1 - Math.min(1, Math.abs(alt - altMid) / span) * 0.35;
    return { point: point.clone(), tti, alt, range: rng, okAlt, okRange, quality };
  }
}

/* -------------------------------------------------------- drawing helpers */

const MONO = '"DejaVu Sans Mono", "Liberation Mono", "Roboto Mono", ui-monospace, monospace';
const COND = '"Liberation Sans Narrow", "Arial Narrow", "DejaVu Sans", Impact, sans-serif';

/** Phosphor palette shared by both console screens. */
const PH = {
  bg: '#03100e',
  rule: 'rgba(96, 226, 196, 0.34)',
  ruleHot: 'rgba(150, 250, 220, 0.75)',
  text: '#bdffec',
  textDim: 'rgba(156, 228, 212, 0.66)',
  white: '#f2fffc',
  amber: '#ffc846',
  red: '#ff705c',
  green: '#5cffa8',
  blue: '#82caff',
  ink: 'rgba(0, 14, 12, 0.92)',
};

function setFont(ctx, size, weight = '400', family = MONO, spacing = 0) {
  ctx.font = `${weight} ${Math.round(size)}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
}

/**
 * Set a font, shrinking it until the string fits. The condensed stack is not
 * guaranteed to resolve on every machine and the fallback face is far wider,
 * so every stencilled legend goes through here rather than a fixed size.
 */
function fitFont(ctx, text, maxWidth, size, weight = '700', family = COND, spacing = 0) {
  let s = size;
  for (let i = 0; i < 26; i++) {
    setFont(ctx, s, weight, family, spacing);
    if (ctx.measureText(text).width <= maxWidth || s < 8) break;
    s *= 0.94;
  }
  return s;
}

/** Text with a dark halo so it survives being drawn over phosphor glow. */
function inkText(ctx, text, x, y, fill, halo = PH.ink, width = 5) {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = halo;
  ctx.lineWidth = width;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Corner brackets — the console's house style for "this is the selection". */
function corners(ctx, x, y, s, len, color, lw = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.moveTo(x + sx * s, y + sy * s - sy * len);
    ctx.lineTo(x + sx * s, y + sy * s);
    ctx.lineTo(x + sx * s - sx * len, y + sy * s);
  }
  ctx.stroke();
}

function scanlines(ctx, w, h, alpha = 0.045, step = 4) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0affd0';
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
}

/** Shared chrome for both screens: bezel, vignette and a titled header band. */
function screenFrame(ctx, w, h, title, right) {
  ctx.fillStyle = PH.bg;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.8);
  g.addColorStop(0, 'rgba(18, 78, 66, 0.55)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PH.rule;
  ctx.lineWidth = Math.max(2, w * 0.004);
  roundRect(ctx, 7, 7, w - 14, h - 14, 10);
  ctx.stroke();
  const band = Math.round(h * 0.092);
  ctx.fillStyle = 'rgba(20, 82, 70, 0.72)';
  ctx.fillRect(9, 9, w - 18, band);
  ctx.textBaseline = 'middle';
  setFont(ctx, band * 0.6, '700', MONO, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = PH.text;
  ctx.fillText(title, 22, 9 + band * 0.54);
  if (right) {
    ctx.textAlign = 'right';
    ctx.fillStyle = PH.white;
    ctx.fillText(right, w - 22, 9 + band * 0.54);
  }
  ctx.strokeStyle = PH.ruleHot;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 9 + band);
  ctx.lineTo(w - 9, 9 + band);
  ctx.stroke();
  return band + 9;
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const out = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = word;
      if (out.length === maxLines) return out;
    } else {
      line = test;
    }
  }
  if (line && out.length < maxLines) out.push(line);
  return out;
}

/* --------------------------------------------------------------- PPI scope */

export class ScopeRenderer {
  constructor(size = 640) {
    this.surface = new CanvasSurface(size, size, { srgb: true });
    this.size = size;
    this.hitTargets = [];
    this._sig = '';
  }

  get texture() {
    return this.surface.texture;
  }

  /** Cheap change detector so a stale scope never survives a fast-forward. */
  signature(radar, opts) {
    let s = `${opts.selectedTrackId}|${opts.assignedTrackId}|${opts.selectedBatteryId}|${(opts.interceptors || []).length}|${opts.mode}`;
    for (const t of radar.tracks) s += `;${t.id}${t.firm ? 'F' : 't'}${t.classified[0]}${Math.round(t.alt / 500)}`;
    return s;
  }

  draw(radar, opts = {}) {
    const ctx = this.surface.ctx;
    const w = this.surface.w;
    const h = this.surface.h;
    const S = w / 640;
    const selected = opts.selectedTrackId;
    const assigned = opts.assignedTrackId;

    const top = screenFrame(ctx, w, h, 'PPI · SURVEILLANCE', `${radar.tracks.length} TRK`);
    const foot = Math.round(h * 0.085);
    const cx = w / 2;
    const cy = top + (h - top - foot) / 2;
    const R = Math.min(w * 0.42, (h - top - foot) / 2 - 34 * S);
    const scale = R / RADAR.range;

    ctx.save();
    ctx.translate(cx, cy);

    // ---- graticule ------------------------------------------------------
    ctx.strokeStyle = 'rgba(74, 190, 162, 0.32)';
    ctx.lineWidth = 1.6 * S;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (R * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(74, 190, 162, 0.20)';
    ctx.lineWidth = 1.3 * S;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(Math.sin(a) * R * 0.1, -Math.cos(a) * R * 0.1);
      ctx.lineTo(Math.sin(a) * R, -Math.cos(a) * R);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(126, 232, 206, 0.6)';
    ctx.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const len = i % 6 === 0 ? 15 * S : i % 2 === 0 ? 8 * S : 4 * S;
      ctx.lineWidth = i % 6 === 0 ? 2.6 * S : 1.4 * S;
      ctx.moveTo(Math.sin(a) * R, -Math.cos(a) * R);
      ctx.lineTo(Math.sin(a) * (R - len), -Math.cos(a) * (R - len));
    }
    ctx.stroke();

    // Only the cardinals are labelled — the numeric bearings fought with the
    // range annotations at this size and added nothing readable.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont(ctx, 25 * S, '700', MONO, 1);
    ['N', 'E', 'S', 'W'].forEach((label, i) => {
      const a = (i / 4) * Math.PI * 2;
      const rr = R + 22 * S;
      inkText(ctx, label, Math.sin(a) * rr, -Math.cos(a) * rr, PH.white, PH.ink, 7 * S);
    });

    // Range annotations ride on the rings themselves, up the NW diagonal.
    setFont(ctx, 20 * S, '700', MONO, 0);
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
      const rr = (R * i) / 4;
      inkText(ctx, `${Math.round((RADAR.range * i) / 4000)}`, -rr * 0.707, -rr * 0.707, 'rgba(170,240,222,0.9)', PH.ink, 7 * S);
    }

    // ---- battery baskets --------------------------------------------------
    for (const b of BATTERIES) {
      const sel = b.id === opts.selectedBatteryId;
      const outer = Math.min(R, b.windowRange[1] * scale);
      ctx.setLineDash(sel ? [13 * S, 8 * S] : [4 * S, 13 * S]);
      ctx.lineWidth = sel ? 3.2 * S : 1.5 * S;
      ctx.strokeStyle = sel ? b.accent : `${b.accent}44`;
      ctx.beginPath();
      ctx.arc(0, 0, outer, 0, Math.PI * 2);
      ctx.stroke();
      if (sel) {
        ctx.lineWidth = 1.8 * S;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(R, b.windowRange[0] * scale), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        setFont(ctx, 20 * S, '700', MONO, 1);
        ctx.textAlign = 'center';
        inkText(ctx, `${b.short} BASKET`, 0, outer - 16 * S, b.accent, PH.ink, 7 * S);
      }
      ctx.setLineDash([]);
    }

    // ---- sweep -------------------------------------------------------------
    const ang = radar.angle;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    if (ctx.createConicGradient) {
      const cg = ctx.createConicGradient(ang - Math.PI / 2, 0, 0);
      cg.addColorStop(0.0, 'rgba(96, 255, 208, 0)');
      cg.addColorStop(0.70, 'rgba(96, 255, 208, 0)');
      cg.addColorStop(0.90, 'rgba(96, 255, 208, 0.08)');
      cg.addColorStop(0.99, 'rgba(126, 255, 216, 0.30)');
      cg.addColorStop(1.0, 'rgba(196, 255, 238, 0.40)');
      ctx.fillStyle = cg;
      ctx.fillRect(-R, -R, R * 2, R * 2);
    } else {
      for (let i = 0; i < 24; i++) {
        const a = ang - i * 0.05;
        ctx.strokeStyle = `rgba(120,255,214,${(1 - i / 24) * 0.14})`;
        ctx.lineWidth = w * 0.022;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(a) * R, -Math.cos(a) * R);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(216, 255, 246, 0.95)';
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(ang) * R, -Math.cos(ang) * R);
    ctx.stroke();

    // ---- own site -----------------------------------------------------------
    ctx.strokeStyle = PH.white;
    ctx.lineWidth = 2.6 * S;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * S, 0, Math.PI * 2);
    ctx.moveTo(-14 * S, 0);
    ctx.lineTo(14 * S, 0);
    ctx.moveTo(0, -14 * S);
    ctx.lineTo(0, 14 * S);
    ctx.stroke();

    // ---- tracks --------------------------------------------------------------
    this.hitTargets = [];
    const drawn = [];
    for (const tr of radar.tracks) {
      const x = tr.pos.x * scale;
      const y = tr.pos.z * scale;
      if (Math.hypot(x, y) > R * 1.02) continue;
      const isSel = tr.id === selected;
      const isAssigned = tr.id === assigned;
      const decoy = tr.classified.includes('DECOY');
      const col = !tr.firm ? '#ecdc74' : decoy ? PH.blue : '#ff8a6a';
      drawn.push({ tr, x, y, col, decoy, isSel, isAssigned });

      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4 * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tr.vel.x * 14 * scale, y + tr.vel.z * 14 * scale);
      ctx.stroke();

      const r = 9.5 * S;
      ctx.lineWidth = 2.8 * S;
      ctx.fillStyle = col;
      if (!tr.firm) {
        ctx.setLineDash([4 * S, 3 * S]);
        ctx.strokeRect(x - r, y - r, r * 2, r * 2);
        ctx.setLineDash([]);
      } else if (decoy) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r * 0.68, y - r * 0.68);
        ctx.lineTo(x + r * 0.68, y + r * 0.68);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.3);
        ctx.lineTo(x + r * 1.1, y);
        ctx.lineTo(x, y + r * 1.3);
        ctx.lineTo(x - r * 1.1, y);
        ctx.closePath();
        ctx.fill();
      }

      if (isAssigned) {
        ctx.strokeStyle = PH.amber;
        ctx.lineWidth = 2.8 * S;
        ctx.beginPath();
        ctx.arc(x, y, 22 * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.moveTo(x + Math.cos(a) * 22 * S, y + Math.sin(a) * 22 * S);
          ctx.lineTo(x + Math.cos(a) * 31 * S, y + Math.sin(a) * 31 * S);
        }
        ctx.stroke();
      }
      if (isSel) corners(ctx, x, y, 28 * S, 11 * S, PH.white, 3.2 * S);
      this.hitTargets.push({ id: tr.id, x: (cx + x) / w, y: (cy + y) / h, r: 0.05 });
    }

    // Captions are pushed apart vertically so two close contacts stay readable.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const lineH = 46 * S;
    const placed = [];
    drawn.sort((a, b) => a.y - b.y);
    for (const d of drawn) {
      const off = d.isSel || d.isAssigned ? 36 * S : 18 * S;
      let ly = d.y - 2 * S;
      for (const p of placed) {
        if (Math.abs(p.x - (d.x + off)) < 130 * S && ly - p.y < lineH) ly = p.y + lineH;
      }
      placed.push({ x: d.x + off, y: ly });
      if (ly !== d.y - 2 * S) {
        ctx.strokeStyle = 'rgba(190, 232, 220, 0.45)';
        ctx.lineWidth = 1.6 * S;
        ctx.beginPath();
        ctx.moveTo(d.x + off - 6 * S, d.y);
        ctx.lineTo(d.x + off - 2 * S, ly - 8 * S);
        ctx.stroke();
      }
      setFont(ctx, 25 * S, '700', MONO, 1);
      inkText(ctx, d.tr.id, d.x + off, ly, d.tr.firm ? PH.white : '#f4ecb4', PH.ink, 7 * S);
      setFont(ctx, 20 * S, '400', MONO, 0);
      const sub = d.tr.firm ? `${(d.tr.alt / 1000).toFixed(1)}K ${Math.round(d.tr.speed)}` : 'ACQUIRE';
      inkText(ctx, sub, d.x + off, ly + 21 * S, d.col, PH.ink, 7 * S);
    }

    // ---- interceptors ----------------------------------------------------------
    for (const m of opts.interceptors || []) {
      const x = m.pos.x * scale;
      const y = m.pos.z * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(m.vel.x, -m.vel.z));
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.moveTo(0, -14 * S);
      ctx.lineTo(9 * S, 10 * S);
      ctx.lineTo(0, 5 * S);
      ctx.lineTo(-9 * S, 10 * S);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (!radar.tracks.length) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, 26 * S, '700', MONO, 5);
      inkText(ctx, 'NO CONTACTS', 0, R * 0.55, 'rgba(158,232,214,0.6)', PH.ink, 6 * S);
    }
    ctx.restore();

    // ---- footer -------------------------------------------------------------
    ctx.fillStyle = 'rgba(20, 82, 70, 0.72)';
    ctx.fillRect(9, h - 9 - foot, w - 18, foot);
    ctx.strokeStyle = PH.ruleHot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, h - 9 - foot);
    ctx.lineTo(w - 9, h - 9 - foot);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    setFont(ctx, foot * 0.5, '700', MONO, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = PH.text;
    ctx.fillText(opts.mode || 'AUTO SEARCH', 22, h - 9 - foot / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = PH.textDim;
    ctx.fillText(`${RADAR.rpm.toFixed(0)} RPM · ${Math.round(RADAR.range / 1000)} KM`, w - 22, h - 9 - foot / 2);

    scanlines(ctx, w, h, 0.04, 4);
    this.surface.commit();
  }
}

/* -------------------------------------------------------- status text panel */

const STATE_STYLE = {
  [BATTERY_STATE.READY]: { col: PH.green, tag: 'READY' },
  [BATTERY_STATE.PREP]: { col: PH.amber, tag: 'PREP' },
  [BATTERY_STATE.RELOAD]: { col: PH.amber, tag: 'RELOAD' },
  [BATTERY_STATE.EXPENDED]: { col: PH.red, tag: 'EXPENDED' },
  [BATTERY_STATE.OFFLINE]: { col: 'rgba(170,190,186,0.75)', tag: 'OFFLINE' },
};

export class StatusPanelRenderer {
  constructor(w = 640, h = 480) {
    this.surface = new CanvasSurface(w, h);
    this._sig = '';
  }

  get texture() {
    return this.surface.texture;
  }

  signature(opts) {
    let s = `${opts.selectedTrackId}|${opts.assignedTrackId}|${opts.selectedBatteryId}|${state.stats.inFlight}|${state.stats.active}`;
    for (const b of BATTERIES) {
      const st = state.batteries[b.id];
      if (st) s += `;${st.state}${st.ammo}${st.timer.toFixed(1)}${st.assignedTrackId || ''}`;
    }
    const res = this.result();
    s += `|${res ? res.text + res.detail : ''}`;
    return s;
  }

  /** main.js clears its own last result on restart but leaves state alone. */
  result() {
    const any = state.stats.launched || state.stats.leakers || state.stats.intercepted;
    return any ? state.lastResult : null;
  }

  draw(opts) {
    const ctx = this.surface.ctx;
    const w = this.surface.w;
    const h = this.surface.h;
    const S = w / 640;
    const top = screenFrame(ctx, w, h, 'WEAPON STATUS', 'C2-01');

    const pad = 26 * S;
    const inner = w - pad * 2;
    let y = top + 12 * S;
    const rowH = 74 * S;

    ctx.textBaseline = 'middle';
    for (const b of BATTERIES) {
      const st = state.batteries[b.id] || { state: BATTERY_STATE.OFFLINE, ammo: 0, timer: 0, assignedTrackId: null };
      const sel = b.id === opts.selectedBatteryId;
      const style = STATE_STYLE[st.state] || STATE_STYLE[BATTERY_STATE.OFFLINE];

      if (sel) {
        ctx.fillStyle = 'rgba(126, 244, 214, 0.16)';
        ctx.fillRect(pad, y, inner, rowH - 8 * S);
      }
      // Accent spine: white while this battery has the controller's attention.
      ctx.fillStyle = sel ? PH.white : b.accent;
      ctx.fillRect(pad, y, 7 * S, rowH - 8 * S);

      ctx.textAlign = 'left';
      setFont(ctx, 32 * S, '700', MONO, 1);
      ctx.fillStyle = sel ? PH.white : b.accent;
      ctx.fillText(b.short, pad + 18 * S, y + 22 * S);
      setFont(ctx, 18 * S, '400', MONO, 0);
      ctx.fillStyle = PH.textDim;
      ctx.fillText(b.codeName, pad + 18 * S, y + 49 * S);

      // state chip
      const chipX = pad + inner * 0.40;
      const chipW = inner * 0.30;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, chipX, y + 4 * S, chipW, 30 * S, 6 * S);
      ctx.fill();
      ctx.strokeStyle = style.col;
      ctx.lineWidth = 2.6 * S;
      roundRect(ctx, chipX, y + 4 * S, chipW, 30 * S, 6 * S);
      ctx.stroke();
      setFont(ctx, 21 * S, '700', MONO, 1);
      ctx.fillStyle = style.col;
      ctx.textAlign = 'center';
      const timed = st.state === BATTERY_STATE.RELOAD || (st.state === BATTERY_STATE.PREP && st.timer > 0);
      ctx.fillText(timed ? `${style.tag} ${st.timer.toFixed(1)}` : style.tag, chipX + chipW / 2, y + 19 * S);

      setFont(ctx, 18 * S, '700', MONO, 0);
      ctx.fillStyle = st.assignedTrackId ? PH.amber : 'rgba(156,228,212,0.40)';
      ctx.fillText(st.assignedTrackId ? `\u25B6 ${st.assignedTrackId}` : 'NO TARGET', chipX + chipW / 2, y + 50 * S);

      // rounds remaining
      const ax = w - pad;
      const pip = 10 * S;
      const gap = 5 * S;
      for (let i = 0; i < b.ammo; i++) {
        const px = ax - (b.ammo - i) * (pip + gap);
        ctx.fillStyle = i < st.ammo ? b.accent : 'rgba(140,190,180,0.18)';
        ctx.fillRect(px, y + 6 * S, pip, 22 * S);
      }
      ctx.textAlign = 'right';
      setFont(ctx, 20 * S, '700', MONO, 0);
      ctx.fillStyle = st.ammo ? PH.text : PH.red;
      ctx.fillText(`${st.ammo}/${b.ammo} RDS`, ax, y + 50 * S);

      y += rowH;
    }

    ctx.strokeStyle = PH.rule;
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(pad, y - 2 * S);
    ctx.lineTo(w - pad, y - 2 * S);
    ctx.stroke();
    y += 8 * S;

    const cells = [
      ['SEL TRACK', opts.selectedTrackId || '\u2014\u2014', opts.selectedTrackId ? PH.white : PH.textDim],
      ['ASSIGNED', opts.assignedTrackId || '\u2014\u2014', opts.assignedTrackId ? PH.amber : PH.textDim],
      ['IN FLIGHT', String(state.stats.inFlight), state.stats.inFlight ? PH.amber : PH.textDim],
      ['INBOUND', String(state.stats.active), state.stats.active ? PH.red : PH.textDim],
    ];
    const cw = inner / 4;
    cells.forEach(([label, value, col], i) => {
      const x = pad + cw * i;
      if (i) {
        ctx.strokeStyle = 'rgba(96, 226, 196, 0.18)';
        ctx.lineWidth = 1.6 * S;
        ctx.beginPath();
        ctx.moveTo(x - 6 * S, y + 4 * S);
        ctx.lineTo(x - 6 * S, y + 52 * S);
        ctx.stroke();
      }
      ctx.textAlign = 'left';
      setFont(ctx, 16 * S, '400', MONO, 1);
      ctx.fillStyle = PH.textDim;
      ctx.fillText(label, x, y + 14 * S);
      setFont(ctx, 34 * S, '700', MONO, 0);
      ctx.fillStyle = col;
      ctx.fillText(value, x, y + 42 * S);
    });
    y += 62 * S;

    const res = this.result();
    const col = !res ? PH.textDim : res.cls === 'green' ? PH.green : res.cls === 'red' ? PH.red : PH.amber;
    const boxH = h - y - 16 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, pad, y, inner, boxH, 7 * S);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.6 * S;
    roundRect(ctx, pad, y, inner, boxH, 7 * S);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillRect(pad, y, 7 * S, boxH);
    ctx.textAlign = 'left';
    setFont(ctx, 16 * S, '400', MONO, 1);
    ctx.fillStyle = PH.textDim;
    ctx.fillText('LAST ENGAGEMENT', pad + 18 * S, y + 17 * S);
    setFont(ctx, 26 * S, '700', MONO, 1);
    ctx.fillStyle = col;
    ctx.fillText(res ? res.text : 'NONE THIS RUN', pad + 18 * S, y + 46 * S);
    if (res && res.detail) {
      setFont(ctx, 17 * S, '400', MONO, 0);
      ctx.fillStyle = 'rgba(198, 238, 228, 0.9)';
      wrapLines(ctx, res.detail, inner - 34 * S, 2).forEach((ln, i) => {
        ctx.fillText(ln, pad + 18 * S, y + 72 * S + i * 21 * S);
      });
    }

    scanlines(ctx, w, h, 0.03, 4);
    this.surface.commit();
  }
}

/* ------------------------------------------------------------ 3D holo track */

// The volume between the two screens is the console's centrepiece, so it is
// built as a real tank rather than a lit disc: an engraved plan grid on the
// floor, a live sweep over it, an altitude cage and ruler above it, and stems
// that carry each blip up to its height. Every emissive part is additive with
// its gain held below 1 so bloom lifts the volume without blowing it out.

const HOLO_SWEEP_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uAngle;
uniform vec3 uColor;
uniform float uGain;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length( p );
  if ( r > 1.0 ) discard;
  float ang = atan( p.y, p.x );
  // Trailing wedge behind the antenna, decaying over about a third of a turn.
  float d = mod( ang - uAngle, 6.2831853 );
  float sweep = exp( -d * 3.2 ) * smoothstep( 0.0, 0.08, r ) * ( 1.0 - smoothstep( 0.94, 1.0, r ) );
  float haze = 0.055 * ( 1.0 - r * 0.6 );
  gl_FragColor = vec4( uColor, clamp( sweep * 0.60 + haze, 0.0, 1.0 ) * uGain );
}
`;

const HOLO_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

const HOLO_COL = { tentative: 0xd8ca60, rv: 0xff6a4a, decoy: 0x74bcff, inter: 0xffd06a };
const HOLO_CEILING = 30000;
/** Altitude reference planes, as fractions of the 30 km ceiling. */
const HOLO_BANDS = [1 / 3, 2 / 3, 1];
const UP = new THREE.Vector3(0, 1, 0);
const TMP_DIR = new THREE.Vector3();

/**
 * Engraved polar plan for the tank floor. Drawn once into a canvas rather than
 * a shader because the range figures and compass letters have to stay crisp at
 * the roughly 450 px the disc covers in a docked frame.
 *
 * Canvas up maps to the volume's -Z after the floor plane is laid flat, which
 * is the same north-up convention the PPI uses.
 */
function holoFloorTexture(surface) {
  const ctx = surface.ctx;
  const n = surface.w;
  const c = n / 2;
  const R = c - 8;
  ctx.clearRect(0, 0, n, n);

  // The disc covers roughly 450 px in a docked frame, so every stroke here is
  // drawn several texels wide or it disappears on the way to the screen.
  const fill = ctx.createRadialGradient(c, c, 0, c, c, R);
  fill.addColorStop(0, 'rgba(86, 226, 200, 0.16)');
  fill.addColorStop(0.55, 'rgba(56, 184, 164, 0.08)');
  fill.addColorStop(1, 'rgba(44, 158, 142, 0.03)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();

  // radial spokes every 30 degrees, cardinals full length
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const cardinal = i % 3 === 0;
    ctx.strokeStyle = cardinal ? 'rgba(160, 252, 230, 0.85)' : 'rgba(120, 232, 208, 0.42)';
    ctx.lineWidth = cardinal ? 9 : 6;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * R * 0.1, c - Math.cos(a) * R * 0.1);
    ctx.lineTo(c + Math.sin(a) * R * (cardinal ? 0.99 : 0.9), c - Math.cos(a) * R * (cardinal ? 0.99 : 0.9));
    ctx.stroke();
  }

  // range rings, quartered across the radar's advertised reach
  const km = RADAR.range / 1000;
  for (let i = 1; i <= 4; i++) {
    const rr = (R * i) / 4;
    const outer = i === 4;
    ctx.strokeStyle = outer ? 'rgba(200, 255, 244, 0.98)' : 'rgba(140, 246, 224, 0.7)';
    ctx.lineWidth = outer ? 14 : 8;
    ctx.setLineDash(outer ? [] : [34, 24]);
    ctx.beginPath();
    ctx.arc(c, c, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Range figures sit on the north-east diagonal, away from the ruler.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 58, '700', MONO, 2);
  for (let i = 1; i <= 4; i++) {
    const rr = (R * i) / 4;
    const a = Math.PI * 0.25;
    inkText(ctx, String(Math.round((km * i) / 4)), c + Math.sin(a) * rr, c - Math.cos(a) * rr, 'rgba(214, 255, 246, 0.95)', 'rgba(0, 18, 16, 0.85)', 10);
  }

  setFont(ctx, 86, '700', MONO, 4);
  ['N', 'E', 'S', 'W'].forEach((letter, i) => {
    const a = (i / 4) * Math.PI * 2;
    inkText(
      ctx,
      letter,
      c + Math.sin(a) * R * 0.86,
      c - Math.cos(a) * R * 0.86,
      i === 0 ? 'rgba(236, 255, 250, 1)' : 'rgba(178, 246, 228, 0.85)',
      'rgba(0, 18, 16, 0.85)',
      12
    );
  });

  // own site
  ctx.strokeStyle = 'rgba(240, 255, 252, 0.98)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(c, c, 22, 0, Math.PI * 2);
  ctx.moveTo(c - 42, c);
  ctx.lineTo(c + 42, c);
  ctx.moveTo(c, c - 42);
  ctx.lineTo(c, c + 42);
  ctx.stroke();

  setFont(ctx, 42, '700', MONO, 4);
  inkText(ctx, `SURVEILLANCE VOLUME \u00B7 ${Math.round(km)} KM`, c, c + R * 0.60, 'rgba(190, 250, 234, 0.9)', 'rgba(0, 18, 16, 0.85)', 10);
  surface.commit();
}

/** Smoked canopy: the dark backdrop the additive symbology is read against. */
function holoCanopyTexture(h = 128) {
  const s = new CanvasSurface(4, h);
  const ctx = s.ctx;
  // Cylinder v runs 0 at the base to 1 at the rim, and canvas row 0 is v = 1.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(6, 24, 26, 0.06)');
  g.addColorStop(0.4, 'rgba(5, 21, 23, 0.46)');
  g.addColorStop(1, 'rgba(2, 13, 15, 0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, h);
  s.commit();
  return s;
}

/** Soft round falloff: the halo that makes a blip pop out of the grid. */
function holoGlowTexture(size = 128) {
  const s = new CanvasSurface(size, size);
  const ctx = s.ctx;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.25, 'rgba(255, 255, 255, 0.42)');
  g.addColorStop(0.6, 'rgba(255, 255, 255, 0.10)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  s.commit();
  return s;
}

export class HoloDisplay {
  /**
   * @param radius half-width of the plan disc, in metres
   * @param height how far the 30 km ceiling stands above the floor, in metres
   * @param yaw    the console's heading, cancelled out so the plan view is
   *               north-up and agrees with the PPI and with the sky outside
   */
  constructor(radius = 0.36, height = 0.54, yaw = 0) {
    this.group = new THREE.Group();
    this.volume = new THREE.Group();
    this.volume.rotation.y = -yaw;
    this.group.add(this.volume);

    this.radius = radius;
    this.height = height;
    this.rangeScale = radius / RADAR.range;
    this.altScale = height / HOLO_CEILING;
    this._q = new THREE.Quaternion();
    this._pq = new THREE.Quaternion();
    this.surfaces = [];

    // ---- smoked canopy ---------------------------------------------------
    // Additive symbology needs something dark to sit on, and in daylight the
    // shelter opening behind the console is anything but. Only the far wall is
    // drawn, so the volume gets a backdrop without a second veil in front of
    // the blips.
    const canopy = holoCanopyTexture();
    this.surfaces.push(canopy);
    const canopyMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.01, radius * 1.01, height, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: canopy.texture, transparent: true, side: THREE.BackSide, depthWrite: false })
    );
    canopyMesh.position.y = height / 2;
    canopyMesh.renderOrder = 1;
    this.volume.add(canopyMesh);

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 1.01, 48),
      new THREE.MeshBasicMaterial({ color: 0x03181a, transparent: true, opacity: 0.94, depthWrite: false, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    base.renderOrder = 1;
    this.volume.add(base);

    // ---- floor: engraved plan grid with a live sweep over it -------------
    const floor = new CanvasSurface(1024, 1024);
    holoFloorTexture(floor);
    this.surfaces.push(floor);
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: floor.texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.renderOrder = 2;
    this.volume.add(floorMesh);

    this.sweepMat = new THREE.ShaderMaterial({
      uniforms: { uAngle: { value: 0 }, uColor: { value: new THREE.Color(0x5ce8cc) }, uGain: { value: 0.62 } },
      vertexShader: HOLO_VERT,
      fragmentShader: HOLO_SWEEP_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const sweepMesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), this.sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    sweepMesh.position.y = 0.0018;
    sweepMesh.renderOrder = 3;
    this.volume.add(sweepMesh);

    // ---- altitude cage ---------------------------------------------------
    // Reference planes at 10 / 20 / 30 km, corner posts and a centre mast.
    // Built from thin tubes rather than lines: WebGL will not widen a line, and
    // a one-pixel wireframe vanishes the moment there is daylight behind it.
    const cageParts = [];
    HOLO_BANDS.forEach((f, bi) => {
      const yy = height * f;
      const ceiling = bi === HOLO_BANDS.length - 1;
      cageParts.push({
        geometry: new THREE.TorusGeometry(radius, ceiling ? 0.0026 : 0.0016, 4, 72),
        matrix: transform({ pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0] }),
      });
      // spurs from the mast out to the ring, so the plane reads as a plane
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        cageParts.push({
          geometry: pathTube([new THREE.Vector3(0, yy, 0), new THREE.Vector3(Math.cos(a) * radius, yy, Math.sin(a) * radius)], 0.0013, 4),
        });
      }
    });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      cageParts.push({ geometry: pathTube([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height, z)], 0.0015, 4) });
    }
    // Centre mast: the altitude datum every stem is read against.
    cageParts.push({ geometry: pathTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height, 0)], 0.0022, 5) });
    const cage = new THREE.Mesh(
      mergeParts(cageParts),
      new THREE.MeshBasicMaterial({ color: 0x6fe4cc, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    cage.renderOrder = 3;
    this.volume.add(cage);
    cageParts.forEach((p) => p.geometry.dispose());

    // ---- altitude ruler --------------------------------------------------
    // Fixed to the console frame, not the plan view, so it always faces the
    // operator however the site is oriented.
    const ruler = new CanvasSurface(256, 640);
    drawHoloRuler(ruler, HOLO_BANDS);
    this.surfaces.push(ruler);
    const rulerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(height * 0.40, height * 1.10),
      new THREE.MeshBasicMaterial({ map: ruler.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    );
    rulerMesh.position.set(-radius * 0.94, height * 0.50, radius * 0.60);
    rulerMesh.renderOrder = 5;
    this.group.add(rulerMesh);

    // ---- track blips -----------------------------------------------------
    this.maxTracks = 10;
    this.blips = [];
    const glow = holoGlowTexture();
    this.surfaces.push(glow);
    const blipGeo = new THREE.OctahedronGeometry(0.027, 0);
    const stemGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6, 1, true);
    stemGeo.translate(0, 0.5, 0);
    const ringGeo = new THREE.RingGeometry(0.024, 0.032, 28);
    const glowGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const labelGeo = new THREE.PlaneGeometry(0.208, 0.0736);
    for (let i = 0; i < this.maxTracks; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: HOLO_COL.rv, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const blip = new THREE.Mesh(blipGeo, mat);
      const halo = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({ map: glow.texture, color: HOLO_COL.rv, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      );
      const stem = new THREE.Mesh(stemGeo, mat.clone());
      stem.material.opacity = 0.32;
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
      );
      ring.rotation.x = -Math.PI / 2;
      const label = new CanvasSurface(384, 136);
      this.surfaces.push(label);
      const labelMesh = new THREE.Mesh(
        labelGeo,
        new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
      );
      halo.renderOrder = 4;
      stem.renderOrder = 4;
      ring.renderOrder = 4;
      blip.renderOrder = 5;
      labelMesh.renderOrder = 6;
      for (const o of [halo, stem, ring, blip, labelMesh]) {
        o.visible = false;
        this.volume.add(o);
      }
      this.blips.push({ blip, halo, stem, ring, label, labelMesh, trackId: null, labelKey: '' });
    }

    // ---- interceptor marks -----------------------------------------------
    this.interMarks = [];
    const iGeo = new THREE.ConeGeometry(0.013, 0.044, 6);
    const iStemGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4, 1, true);
    iStemGeo.translate(0, 0.5, 0);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: HOLO_COL.inter, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const mark = new THREE.Mesh(iGeo, mat);
      const stem = new THREE.Mesh(iStemGeo, mat.clone());
      stem.material.opacity = 0.28;
      mark.visible = false;
      stem.visible = false;
      mark.renderOrder = 5;
      stem.renderOrder = 4;
      this.volume.add(mark, stem);
      this.interMarks.push({ mark, stem });
    }
  }

  update(dt, radar, camera, opts) {
    // Matching the PPI antenna keeps the two displays telling the same story.
    this.sweepMat.uniforms.uAngle.value = radar.angle;
    const tracks = radar.tracks.slice(0, this.maxTracks);
    this.volume.getWorldQuaternion(this._pq);
    this._pq.invert();

    for (let i = 0; i < this.blips.length; i++) {
      const item = this.blips[i];
      const tr = tracks[i];
      if (!tr) {
        item.blip.visible = false;
        item.halo.visible = false;
        item.stem.visible = false;
        item.ring.visible = false;
        item.labelMesh.visible = false;
        item.trackId = null;
        continue;
      }
      const rr = Math.hypot(tr.pos.x, tr.pos.z) * this.rangeScale;
      const k = rr > this.radius ? this.radius / rr : 1;
      const x = tr.pos.x * this.rangeScale * k;
      const z = tr.pos.z * this.rangeScale * k;
      const y = Math.max(0.006, Math.min(this.height, tr.alt * this.altScale));
      const decoy = tr.classified.includes('DECOY');
      const col = !tr.firm ? HOLO_COL.tentative : decoy ? HOLO_COL.decoy : HOLO_COL.rv;
      const sel = tr.id === opts.selectedTrackId;
      const assigned = tr.id === opts.assignedTrackId;

      item.trackId = tr.id;
      item.blip.position.set(x, y, z);
      item.blip.visible = true;
      item.blip.material.color.setHex(col);
      item.blip.material.opacity = tr.firm ? 0.9 : 0.55;
      item.blip.rotation.y += dt * (sel ? 3.2 : 1.5);
      item.blip.scale.setScalar(sel ? 1.55 : assigned ? 1.28 : 1);

      item.halo.position.copy(item.blip.position);
      item.halo.visible = true;
      item.halo.material.color.setHex(sel ? 0xffffff : col);
      item.halo.material.opacity = sel ? 0.62 : tr.firm ? 0.46 : 0.3;
      item.halo.scale.setScalar(sel ? 1.35 : assigned ? 1.15 : 1);
      item.halo.quaternion.copy(camera.quaternion).premultiply(this._pq);

      item.stem.position.set(x, 0, z);
      item.stem.scale.set(1, y, 1);
      item.stem.visible = true;
      item.stem.material.color.setHex(col);
      item.stem.material.opacity = sel || assigned ? 0.55 : 0.3;

      // Every track keeps a ground mark so its plan position is unambiguous
      // even when the stem is nearly edge-on.
      item.ring.position.set(x, 0.004, z);
      item.ring.visible = true;
      item.ring.material.color.setHex(assigned ? 0xffc846 : sel ? 0xffffff : col);
      item.ring.material.opacity = assigned ? 0.75 : sel ? 0.6 : 0.3;
      item.ring.scale.setScalar(assigned ? 1.3 : sel ? 1.15 : 0.9);

      const key = `${tr.id}|${tr.firm ? 1 : 0}|${decoy ? 1 : 0}|${Math.round(tr.alt / 200)}|${Math.round(tr.speed / 20)}|${sel ? 1 : 0}${assigned ? 1 : 0}`;
      if (item.labelKey !== key) {
        item.labelKey = key;
        drawHoloLabel(item.label, tr, { decoy, sel, assigned });
      }
      item.labelMesh.visible = true;
      item.labelMesh.position.set(x, y + 0.066, z);
      item.labelMesh.quaternion.copy(camera.quaternion).premultiply(this._pq);
    }

    const inters = opts.interceptors || [];
    for (let i = 0; i < this.interMarks.length; i++) {
      const { mark, stem } = this.interMarks[i];
      const it = inters[i];
      if (!it) {
        mark.visible = false;
        stem.visible = false;
        continue;
      }
      const rr = Math.hypot(it.pos.x, it.pos.z) * this.rangeScale;
      const k = rr > this.radius ? this.radius / rr : 1;
      const x = it.pos.x * this.rangeScale * k;
      const z = it.pos.z * this.rangeScale * k;
      const y = Math.max(0.006, Math.min(this.height, it.pos.y * this.altScale));
      mark.visible = true;
      mark.position.set(x, y, z);
      this._q.setFromUnitVectors(UP, TMP_DIR.copy(it.vel).normalize());
      mark.quaternion.copy(this._q);
      stem.visible = true;
      stem.position.set(x, 0, z);
      stem.scale.set(1, y, 1);
    }
  }
}

/** Operator-facing altitude ruler standing at the near-left of the tank. */
function drawHoloRuler(surface, bands) {
  const ctx = surface.ctx;
  const w = surface.w;
  const h = surface.h;
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'middle';

  const axis = w * 0.78;
  const y0 = h * 0.955;
  const span = h * 0.86;
  ctx.strokeStyle = 'rgba(132, 240, 220, 0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(axis, y0);
  ctx.lineTo(axis, y0 - span);
  ctx.stroke();

  // minor ticks every 2 km so the scale reads as continuous
  const steps = HOLO_CEILING / 2000;
  ctx.strokeStyle = 'rgba(132, 240, 220, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 1; i <= steps; i++) {
    const y = y0 - (span * i) / steps;
    ctx.beginPath();
    ctx.moveTo(axis - w * 0.06, y);
    ctx.lineTo(axis, y);
    ctx.stroke();
  }

  for (const f of bands) {
    const y = y0 - span * f;
    ctx.strokeStyle = 'rgba(186, 255, 240, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(axis - w * 0.20, y);
    ctx.lineTo(axis + w * 0.10, y);
    ctx.stroke();
    setFont(ctx, 46, '700', MONO, 1);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d6fff2';
    ctx.fillText(String(Math.round((f * HOLO_CEILING) / 1000)), axis - w * 0.25, y);
  }

  setFont(ctx, 30, '700', MONO, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(178, 244, 228, 0.9)';
  ctx.fillText('KM', axis - w * 0.16, y0 - span - 34);
  ctx.fillText('ALT', axis - w * 0.16, y0 - span - 2);
  surface.commit();
}

function drawHoloLabel(surface, tr, { decoy, sel, assigned }) {
  const ctx = surface.ctx;
  const w = surface.w;
  const h = surface.h;
  ctx.clearRect(0, 0, w, h);
  const col = !tr.firm ? '#f2e8ac' : decoy ? '#9fd6ff' : '#ffb59c';
  const body = h - 24;
  // A leader line ties the floating caption back to its blip.
  ctx.strokeStyle = 'rgba(150, 226, 212, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h - 2);
  ctx.lineTo(w * 0.5, body);
  ctx.stroke();

  ctx.fillStyle = assigned ? 'rgba(78, 52, 4, 0.72)' : sel ? 'rgba(20, 66, 60, 0.72)' : 'rgba(6, 28, 26, 0.62)';
  roundRect(ctx, 4, 4, w - 8, body - 6, 11);
  ctx.fill();
  ctx.strokeStyle = assigned ? '#ffc846' : sel ? '#ffffff' : 'rgba(126, 218, 202, 0.55)';
  ctx.lineWidth = assigned || sel ? 5 : 3;
  roundRect(ctx, 4, 4, w - 8, body - 6, 11);
  ctx.stroke();
  // Colour spine, matching the blip, so the caption is attributable at a glance.
  ctx.fillStyle = col;
  ctx.fillRect(8, 10, 8, body - 18);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  setFont(ctx, 54, '700', MONO, 1);
  ctx.fillStyle = sel ? '#ffffff' : col;
  ctx.fillText(tr.id, 28, 60);
  setFont(ctx, 34, '400', MONO, 0);
  ctx.fillStyle = 'rgba(196, 250, 236, 0.95)';
  ctx.fillText(`${(tr.alt / 1000).toFixed(1)}KM ${Math.round(tr.speed)}M/S`, 28, 100);

  ctx.textAlign = 'right';
  setFont(ctx, 36, '700', MONO, 0);
  if (assigned) {
    ctx.fillStyle = '#ffc846';
    ctx.fillText('ASG', w - 20, 60);
  } else if (!tr.firm) {
    ctx.fillStyle = '#f2e8ac';
    ctx.fillText('ACQ', w - 20, 60);
  } else if (decoy) {
    ctx.fillStyle = '#9fd6ff';
    ctx.fillText('DCY', w - 20, 60);
  } else if (sel) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SEL', w - 20, 60);
  }
  surface.commit();
}

/* ------------------------------------------------------------- console rig */

// Console geometry is laid out in metres in the rig's local frame: +X right,
// +Y up, +Z toward the operator. The docked camera sits at DOCK_EYE looking
// down the -Z axis, and every dimension below was chosen so the scope, the
// status board, the holo tank and both button rows land inside a 16:9 frame
// with the shelter opening still visible above the hardware.

const PANEL_W = 2.60;
const PANEL_H = 0.54;
const PANEL_TILT = -1.089; // 62.4 deg from vertical, i.e. a 27.6 deg desk slope
const PANEL_ORIGIN = [0, 0.905, -0.10];

const DESK_W = 2.86;
const BRIDGE_Y = 1.00;
const BRIDGE_Z = -0.55;

const SCREEN_PITCH = -0.18;
const SCREEN_TOE = 0.28;
const HOUSE_D = 0.11;
const HOUSE_CH = 0.014;
/** ExtrudeGeometry bevels outward, so a chamferBox face sits past d/2. */
const FACE_Z = HOUSE_D / 2 + HOUSE_CH * 0.8 + 0.008;

const SCOPE = { x: -0.80, y: 1.42, z: -0.64, w: 0.70, h: 0.70, toe: SCREEN_TOE };
const STATUS = { x: 0.82, y: 1.38, z: -0.64, w: 0.72, h: 0.54, toe: -SCREEN_TOE };

// The tank fills the whole gap between the two screen housings — the scope's
// inner edge sits at x = -0.45 and the status board's at 0.46 — and stands tall
// enough to read as a volume without climbing past the top of either screen.
const HOLO_POS = [0, 1.14, -0.46];
const HOLO_R = 0.34;
const HOLO_H = 0.54;

const DOCK_EYE = [0, 1.45, 1.05];
const DOCK_PITCH = -0.20;

const BUTTON_SPECS = {
  BAT_PATRIOT: { label: 'TERMINAL', sub: 'HAWKEYE 1', color: 0x5fd0ff, w: 0.235, h: 0.112 },
  BAT_THAAD: { label: 'HI-ALT', sub: 'LONGVIEW 2', color: 0xffc46b, w: 0.235, h: 0.112 },
  BAT_SENTINEL: { label: 'SENTINEL', sub: 'IRONWOOD 3', color: 0xff7de3, w: 0.235, h: 0.112 },
  NEXT_TRACK: { label: 'NEXT', sub: 'TRACK', color: 0x6fe0ff, w: 0.255, h: 0.112 },
  ASSIGN: { label: 'ASSIGN', sub: 'TARGET', color: 0xffd23f, w: 0.255, h: 0.112 },
  AUTHORIZE: { label: 'AUTHORIZE', sub: 'RELEASE', color: 0xff4436, w: 0.300, h: 0.126, danger: true },
  START: { label: 'START', sub: 'THREAT WAVE', color: 0xff8a2b, w: 0.330, h: 0.126, danger: true },
  SCN_SINGLE: { label: 'SINGLE', color: 0xc4d2da, w: 0.235, h: 0.092 },
  SCN_SATURATION: { label: 'SATURATION', color: 0xc4d2da, w: 0.235, h: 0.092 },
  SCN_NIGHT_RAID: { label: 'NIGHT RAID', color: 0xc4d2da, w: 0.235, h: 0.092 },
  TOD_day: { label: 'DAY', color: 0xffe9b0, w: 0.235, h: 0.092 },
  TOD_sunset: { label: 'SUNSET', color: 0xffa060, w: 0.235, h: 0.092 },
  TOD_night: { label: 'NIGHT', color: 0x9db4ff, w: 0.235, h: 0.092 },
};

const ROW1 = 0.0620;
const ROW2 = -0.1180;

/** [id, panel-local x, panel-local y] */
const BUTTON_LAYOUT = [
  ['BAT_PATRIOT', -1.125, ROW1],
  ['BAT_THAAD', -0.865, ROW1],
  ['BAT_SENTINEL', -0.605, ROW1],
  ['NEXT_TRACK', -0.275, ROW1],
  ['ASSIGN', 0.015, ROW1],
  ['AUTHORIZE', 0.475, ROW1],
  ['START', 1.030, ROW1],
  ['SCN_SINGLE', -1.125, ROW2],
  ['SCN_SATURATION', -0.865, ROW2],
  ['SCN_NIGHT_RAID', -0.605, ROW2],
  ['TOD_day', -0.275, ROW2],
  ['TOD_sunset', -0.015, ROW2],
  ['TOD_night', 0.245, ROW2],
];

const PANEL_GROUPS = [
  { title: 'WEAPON SELECT', x0: -1.255, x1: -0.475, y0: 0.156, y1: -0.020 },
  { title: 'TRACK CONTROL', x0: -0.415, x1: 0.160, y0: 0.156, y1: -0.020 },
  { title: 'FIRE CONTROL', x0: 0.290, x1: 1.255, y0: 0.156, y1: -0.020, hazard: true },
  { title: 'EXERCISE PROFILE', x0: -1.255, x1: -0.475, y0: -0.050, y1: -0.188 },
  { title: 'SITE CONDITIONS', x0: -0.415, x1: 0.378, y0: -0.050, y1: -0.188 },
  { title: 'MASTER ARM', x0: 0.470, x1: 1.255, y0: -0.050, y1: -0.188 },
];

/** Backlit legend lamps along the top rail of the sloped panel. */
const LAMPS = [
  { id: 'RADIATE', text: 'RADIATE', color: 0x6cffb0 },
  { id: 'TWS', text: 'TRK/SCAN', color: 0x7fe6ff },
  { id: 'DESIG', text: 'DESIG', color: 0xf2fbff },
  { id: 'ASSIGNED', text: 'ASSIGNED', color: 0xffc846 },
  { id: 'AWAY', text: 'AWAY', color: 0xffa040 },
  { id: 'READY', text: 'ARMED', color: 0x6cffb0 },
  { id: 'RELOAD', text: 'RELOAD', color: 0xffc846 },
  { id: 'CAUTION', text: 'CAUTION', color: 0xff6b58 },
];
const LAMP_Y = 0.2320;
const LAMP_X0 = -1.16;
const LAMP_DX = 0.3314;
const lampX = (i) => LAMP_X0 + i * LAMP_DX;

const SWITCH_X = [0.600, 0.860, 1.120];

/* ---------------------------------------------------------- panel graphics */

/** Engraved graphic for the whole sloped control panel. */
function panelLegendTexture() {
  const W = 2048;
  const H = Math.round((W * PANEL_H) / PANEL_W);
  const s = new CanvasSurface(W, H);
  const ctx = s.ctx;
  const ux = (px) => ((px + PANEL_W / 2) / PANEL_W) * W;
  const uy = (py) => ((PANEL_H / 2 - py) / PANEL_H) * H;
  const um = (m) => (m / PANEL_W) * W;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#394145');
  g.addColorStop(0.45, '#2b3235');
  g.addColorStop(1, '#1b2124');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // brushed-metal grain
  ctx.globalAlpha = 0.05;
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 48271) + 11) & 0x7fffffff), (seed >>> 9) / 4194304);
  for (let i = 0; i < 1600; i++) {
    const y = rnd() * H;
    ctx.strokeStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.lineWidth = 0.6 + rnd();
    ctx.beginPath();
    ctx.moveTo(rnd() * W, y);
    ctx.lineTo(rnd() * W, y + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';

  // ---- lamp rail ---------------------------------------------------------
  const railTop = uy(0.266);
  const railBot = uy(0.198);
  ctx.fillStyle = 'rgba(8, 11, 13, 0.72)';
  roundRect(ctx, ux(-1.275), railTop, um(2.55), railBot - railTop, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 172, 178, 0.45)';
  ctx.lineWidth = 3;
  roundRect(ctx, ux(-1.275), railTop, um(2.55), railBot - railTop, 9);
  ctx.stroke();
  ctx.textAlign = 'left';
  LAMPS.forEach((l, i) => {
    fitFont(ctx, l.text, um(0.205), 34, '700', COND, 2);
    ctx.fillStyle = `#${new THREE.Color(l.color).getHexString()}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(l.text, ux(lampX(i) - 0.086), uy(LAMP_Y));
    ctx.globalAlpha = 1;
  });

  // ---- group frames ------------------------------------------------------
  for (const grp of PANEL_GROUPS) {
    const yTop = uy(grp.y0);
    const yBot = uy(grp.y1);
    const x0 = ux(grp.x0);
    const x1 = ux(grp.x1);
    ctx.fillStyle = 'rgba(9, 13, 15, 0.55)';
    roundRect(ctx, x0, yTop, x1 - x0, yBot - yTop, 12);
    ctx.fill();
    if (grp.hazard) {
      ctx.save();
      roundRect(ctx, x0, yTop, x1 - x0, yBot - yTop, 12);
      ctx.clip();
      ctx.globalAlpha = 0.2;
      const dh = yBot - yTop;
      for (let x = x0 - dh; x < x1 + dh; x += 56) {
        ctx.fillStyle = '#d8b028';
        ctx.beginPath();
        ctx.moveTo(x, yBot);
        ctx.lineTo(x + 28, yBot);
        ctx.lineTo(x + 28 + dh, yTop);
        ctx.lineTo(x + dh, yTop);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(164, 186, 192, 0.66)';
    ctx.lineWidth = 3.5;
    roundRect(ctx, x0, yTop, x1 - x0, yBot - yTop, 12);
    ctx.stroke();
    fitFont(ctx, grp.title, (x1 - x0) * 0.66, 30, '700', COND, 5);
    const tw = ctx.measureText(grp.title).width + 30;
    ctx.fillStyle = '#2a3134';
    ctx.fillRect(x0 + 24, yTop - 5, tw, 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dcecf0';
    ctx.fillText(grp.title, x0 + 38, yTop + 1);
  }

  // ---- master-arm block detail --------------------------------------------
  ctx.textAlign = 'center';
  const swLabels = [['ARM', 'SAFE'], ['BATT', 'EXT'], ['LINK', 'LOCAL']];
  SWITCH_X.forEach((sx, i) => {
    fitFont(ctx, swLabels[i][0], um(0.18), 24, '700', COND, 3);
    ctx.fillStyle = 'rgba(216, 230, 234, 0.82)';
    ctx.fillText(swLabels[i][0], ux(sx), uy(-0.078));
    fitFont(ctx, swLabels[i][1], um(0.18), 24, '700', COND, 3);
    ctx.fillStyle = 'rgba(180, 198, 204, 0.6)';
    ctx.fillText(swLabels[i][1], ux(sx), uy(-0.174));
  });

  // ---- screws and bottom stencil -------------------------------------------
  ctx.fillStyle = 'rgba(190, 202, 206, 0.4)';
  for (const px of [-1.272, -0.64, 0, 0.64, 1.272]) {
    for (const py of [0.254, -0.228]) {
      const cyv = uy(py);
      ctx.beginPath();
      ctx.arc(ux(px), cyv, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,24,26,0.85)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ux(px) - 5, cyv);
      ctx.lineTo(ux(px) + 5, cyv);
      ctx.stroke();
    }
  }
  const stencilL = 'AEGIS RIDGE \u00B7 C2 CONSOLE 01 \u00B7 FIRE DIRECTION';
  const stencilR = 'EXERCISE ONLY \u2014 FICTIONAL SYSTEM';
  ctx.textAlign = 'left';
  fitFont(ctx, stencilL, um(1.06), 21, '700', COND, 4);
  ctx.fillStyle = 'rgba(200, 216, 220, 0.66)';
  ctx.fillText(stencilL, ux(-1.22), uy(-0.228));
  ctx.textAlign = 'right';
  fitFont(ctx, stencilR, um(0.94), 21, '700', COND, 4);
  ctx.fillStyle = 'rgba(224, 176, 96, 0.7)';
  ctx.fillText(stencilR, ux(1.22), uy(-0.228));

  s.commit();
  return s;
}

/** A single illuminated button cap face. */
function buttonCapTexture(spec) {
  const W = 384;
  const H = Math.max(120, Math.round((W * spec.h) / spec.w));
  const s = new CanvasSurface(W, H);
  const ctx = s.ctx;
  const hex = `#${new THREE.Color(spec.color).getHexString()}`;
  ctx.fillStyle = spec.danger ? '#2e1411' : '#151b1e';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,0.2)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = hex;
  ctx.lineWidth = 10;
  roundRect(ctx, 7, 7, W - 14, H - 14, 14);
  ctx.stroke();
  ctx.fillStyle = hex;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(30, H - 24, W - 60, 8);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hasSub = !!spec.sub;
  fitFont(ctx, spec.label, W - 46, Math.round(H * (hasSub ? 0.36 : 0.44)), '700', COND, 3);
  ctx.fillStyle = '#f8fdff';
  ctx.fillText(spec.label, W / 2, hasSub ? H * 0.39 : H * 0.47);
  if (hasSub) {
    fitFont(ctx, spec.sub, W - 60, Math.round(H * 0.21), '400', MONO, 1);
    ctx.fillStyle = hex;
    ctx.fillText(spec.sub, W / 2, H * 0.72);
  }
  s.commit();
  return s;
}

function keyboardTexture() {
  const W = 512;
  const H = 176;
  const s = new CanvasSurface(W, H);
  const ctx = s.ctx;
  ctx.fillStyle = '#1a1f22';
  ctx.fillRect(0, 0, W, H);
  const cols = 16;
  const rows = 5;
  const pad = 10;
  const kw = (W - pad * 2) / cols;
  const kh = (H - pad * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wide = r === rows - 1 && c > 3 && c < 11;
      if (wide && c !== 4) continue;
      const x = pad + c * kw + 2;
      const y = pad + r * kh + 2;
      const ww = wide ? kw * 7 - 4 : kw - 4;
      ctx.fillStyle = r === 0 ? '#2b3236' : '#343c41';
      roundRect(ctx, x, y, ww, kh - 4, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, ww, kh - 4, 3);
      ctx.stroke();
      ctx.fillStyle = 'rgba(190,206,212,0.4)';
      ctx.fillRect(x + 3, y + 3, ww - 6, 2);
    }
  }
  s.commit();
  return s;
}

/** Small stencilled equipment plate used on the desk fascia and worksurface. */
function equipmentPlateTexture(lines, accent = '#c9d6da') {
  const W = 512;
  const H = 128;
  const s = new CanvasSurface(W, H);
  const ctx = s.ctx;
  ctx.fillStyle = '#171c1f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(162,180,186,0.6)';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, W - 10, H - 10);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fitFont(ctx, lines[0], W - 44, 42, '700', COND, 5);
  ctx.fillStyle = accent;
  ctx.fillText(lines[0], 22, lines[1] ? 46 : H / 2);
  if (lines[1]) {
    fitFont(ctx, lines[1], W - 44, 26, '400', MONO, 2);
    ctx.fillStyle = 'rgba(184,202,208,0.72)';
    ctx.fillText(lines[1], 22, 90);
  }
  s.commit();
  return s;
}

/** Screen bezel graphic: a dark surround with a stencilled caption strip. */
function bezelTexture(title, right) {
  const W = 512;
  const H = 512;
  const s = new CanvasSurface(W, H);
  const ctx = s.ctx;
  ctx.fillStyle = '#22282b';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#12171a';
  ctx.fillRect(0, 0, W, H * 0.86);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  fitFont(ctx, title, W * 0.5, 20, '700', COND, 3);
  ctx.fillStyle = 'rgba(206, 224, 228, 0.72)';
  ctx.fillText(title, 24, H * 0.945);
  ctx.textAlign = 'right';
  setFont(ctx, 16, '400', MONO, 1);
  ctx.fillStyle = 'rgba(150, 200, 196, 0.6)';
  ctx.fillText(right, W - 24, H * 0.945);
  // corner fixings so the bezel does not read as a flat card
  ctx.fillStyle = 'rgba(170, 186, 190, 0.34)';
  for (const [fx, fy] of [[16, 16], [W - 16, 16], [16, H * 0.86 - 14], [W - 16, H * 0.86 - 14]]) {
    ctx.beginPath();
    ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  s.commit();
  return s;
}

/** Unlit screen surface: crisp text that ignores scene lighting and tone map. */
function basicScreen(map, opacity = 1) {
  return new THREE.MeshBasicMaterial({ map, toneMapped: false, transparent: opacity < 1, opacity });
}

/** Physically lit panel graphic that also self-illuminates its legend. */
function litPanel(map, emissive = 0.35) {
  return std({
    map,
    emissiveMap: map,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: emissive,
    roughness: 0.58,
    metalness: 0.08,
    envMapIntensity: 0.5,
  });
}

const ORIGIN2 = new THREE.Vector2(0, 0);
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const faceNormal = (pitch, yaw) => new THREE.Vector3(0, 0, 1).applyEuler(_euler.set(pitch, yaw, 0));

export class ConsoleRig {
  constructor(scene, anchor, yaw) {
    this.group = new THREE.Group();
    this.group.position.copy(anchor);
    this.group.rotation.y = yaw;
    scene.add(this.group);
    const mats = materials();
    this.surfaces = [];

    const fascia = std({ color: 0x333a3e, roughness: 0.62, metalness: 0.2, envMapIntensity: 0.6 });
    const trim = std({ color: 0x1c2225, roughness: 0.5, metalness: 0.34, envMapIntensity: 0.8 });
    const chrome = std({ color: 0x8d979c, roughness: 0.34, metalness: 0.86, envMapIntensity: 1.0 });

    /* ---- desk carcass ---------------------------------------------------- */
    const body = [];
    // plinth, pedestals and the recessed knee well
    body.push({ geometry: chamferBox(DESK_W, 0.11, 1.02, 0.02), matrix: transform({ pos: [0, 0.055, 0.0] }) });
    for (const sx of [-1, 1]) {
      body.push({ geometry: chamferBox(0.62, 0.62, 0.94, 0.025), matrix: transform({ pos: [sx * 1.08, 0.42, 0.0] }) });
    }
    body.push({ geometry: chamferBox(1.58, 0.56, 0.34, 0.02), matrix: transform({ pos: [0, 0.43, -0.28] }) });
    body.push({ geometry: chamferBox(DESK_W - 0.06, 0.62, 0.05, 0.015), matrix: transform({ pos: [0, 0.42, -0.47] }) });
    // worksurface and its rolled front nosing
    body.push({ geometry: chamferBox(DESK_W - 0.04, 0.05, 0.98, 0.014), matrix: transform({ pos: [0, 0.755, 0.02] }) });
    body.push({ geometry: cylinder(0.026, 0.026, DESK_W - 0.04, 10), matrix: transform({ pos: [0, 0.751, 0.508], rot: [0, 0, Math.PI / 2] }) });
    // bridge shelf carrying the screen housings and the holo tank
    body.push({ geometry: chamferBox(DESK_W - 0.04, 0.08, 0.30, 0.02), matrix: transform({ pos: [0, BRIDGE_Y, BRIDGE_Z] }) });
    const desk = new THREE.Mesh(mergeParts(body), fascia);
    desk.castShadow = true;
    desk.receiveShadow = true;
    this.group.add(desk);
    body.forEach((p) => p.geometry.dispose());

    /* ---- ventilation, bolt rows, corner posts ---------------------------- */
    const detail = [];
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        detail.push({
          geometry: chamferBox(0.44, 0.016, 0.022, 0.004),
          matrix: transform({ pos: [sx * 1.08, 0.24 + i * 0.044, 0.478], rot: [0.34, 0, 0] }),
        });
      }
      detail.push({ geometry: boltRow(4, 0.13, 0.012, 0.009), matrix: transform({ pos: [sx * 1.08, 0.62, 0.482] }) });
      detail.push({ geometry: chamferBox(0.055, 0.30, 0.055, 0.012), matrix: transform({ pos: [sx * 1.40, 0.42, 0.28] }) });
      // rear louvre stack, seen when walking up to the console from the pad
      for (let i = 0; i < 5; i++) {
        detail.push({
          geometry: chamferBox(0.52, 0.018, 0.02, 0.004),
          matrix: transform({ pos: [sx * 0.98, 0.30 + i * 0.058, -0.502], rot: [-0.34, 0, 0] }),
        });
      }
    }
    const detailMesh = new THREE.Mesh(mergeParts(detail), trim);
    detailMesh.castShadow = true;
    this.group.add(detailMesh);
    detail.forEach((p) => p.geometry.dispose());

    const plate = this.track(equipmentPlateTexture(['FIRE DIRECTION', 'CONSOLE 01 \u00B7 AEGIS RIDGE']));
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.105), basicScreen(plate.texture));
    plateMesh.position.set(-0.42, 0.60, 0.494);
    this.group.add(plateMesh);

    /* ---- sloped control panel -------------------------------------------- */
    this.panelNode = new THREE.Group();
    this.panelNode.position.set(PANEL_ORIGIN[0], PANEL_ORIGIN[1], PANEL_ORIGIN[2]);
    this.panelNode.rotation.x = PANEL_TILT;
    this.group.add(this.panelNode);

    const panelBase = new THREE.Mesh(chamferBox(PANEL_W + 0.14, PANEL_H + 0.07, 0.075, 0.018), trim);
    panelBase.position.z = -0.02;
    panelBase.castShadow = true;
    panelBase.receiveShadow = true;
    this.panelNode.add(panelBase);

    const legend = this.track(panelLegendTexture());
    const legendMesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), litPanel(legend.texture, 0.34));
    legendMesh.position.z = 0.033;
    this.panelNode.add(legendMesh);

    /* ---- buttons --------------------------------------------------------- */
    this.buttons = [];
    for (const [id, px, py] of BUTTON_LAYOUT) {
      const spec = BUTTON_SPECS[id];
      const surf = this.track(buttonCapTexture(spec));
      const cap = new THREE.Mesh(chamferBox(spec.w, spec.h, 0.032, 0.007), mats.plastic);
      // chamferBox bevels outward, so the cap's front face sits past d / 2.
      const face = new THREE.Mesh(new THREE.PlaneGeometry(spec.w * 0.93, spec.h * 0.88), litPanel(surf.texture, 0.45));
      face.position.z = 0.032 / 2 + 0.007 * 0.8 + 0.004;
      face.userData.buttonId = id;
      cap.add(face);
      cap.position.set(px, py, 0.048);
      cap.userData = { buttonId: id, baseZ: 0.048, spec, face, press: 0 };
      this.panelNode.add(cap);
      this.buttons.push(cap);
    }

    /* ---- indicator lamps on the top rail --------------------------------- */
    const domeGeo = new THREE.SphereGeometry(0.0135, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeo.rotateX(Math.PI / 2);
    this.lampMesh = new THREE.InstancedMesh(
      domeGeo,
      new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95 }),
      LAMPS.length
    );
    this.lampMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const m4 = new THREE.Matrix4();
    const bezels = [];
    LAMPS.forEach((l, i) => {
      const x = lampX(i) - 0.108;
      m4.makeTranslation(x, LAMP_Y, 0.036);
      this.lampMesh.setMatrixAt(i, m4);
      this.lampMesh.setColorAt(i, new THREE.Color(l.color).multiplyScalar(0.14));
      bezels.push({ geometry: new THREE.TorusGeometry(0.0155, 0.0032, 5, 14), matrix: transform({ pos: [x, LAMP_Y, 0.036] }) });
    });
    this.lampMesh.instanceMatrix.needsUpdate = true;
    this.lampColor = new THREE.Color();
    this.panelNode.add(this.lampMesh);
    const bezelMesh = new THREE.Mesh(mergeParts(bezels), chrome);
    this.panelNode.add(bezelMesh);
    bezels.forEach((p) => p.geometry.dispose());

    /* ---- guarded launch-authorize cover ---------------------------------- */
    const guardParts = [];
    guardParts.push({ geometry: chamferBox(0.34, 0.014, 0.014, 0.004), matrix: transform({ pos: [0, -0.150, 0] }) });
    for (const sx of [-1, 1]) {
      guardParts.push({ geometry: chamferBox(0.014, 0.150, 0.014, 0.004), matrix: transform({ pos: [sx * 0.163, -0.075, 0] }) });
    }
    guardParts.push({ geometry: cylinder(0.010, 0.010, 0.37, 8), matrix: transform({ rot: [0, 0, Math.PI / 2] }) });
    this.guard = new THREE.Group();
    const guardFrame = new THREE.Mesh(mergeParts(guardParts), std({ color: 0xb03026, roughness: 0.46, metalness: 0.5 }));
    this.guard.add(guardFrame);
    guardParts.forEach((p) => p.geometry.dispose());
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.142),
      applyAtmosphere(
        new THREE.MeshPhysicalMaterial({ color: 0xffc0ac, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
      )
    );
    pane.position.set(0, -0.075, 0);
    this.guard.add(pane);
    this.guard.position.set(0.475, ROW1 + 0.080, 0.078);
    this.panelNode.add(this.guard);

    /* ---- master-arm switch bank ------------------------------------------ */
    const switches = [];
    for (const sx of SWITCH_X) {
      switches.push({ geometry: cylinder(0.017, 0.020, 0.014, 10), matrix: transform({ pos: [sx, ROW2, 0.038], rot: [Math.PI / 2, 0, 0] }) });
      switches.push({ geometry: cylinder(0.005, 0.007, 0.052, 6), matrix: transform({ pos: [sx, ROW2 + 0.018, 0.058], rot: [-0.6, 0, 0] }) });
      switches.push({ geometry: new THREE.SphereGeometry(0.008, 8, 6), matrix: transform({ pos: [sx, ROW2 + 0.038, 0.070] }) });
    }
    const swMesh = new THREE.Mesh(mergeParts(switches), chrome);
    this.panelNode.add(swMesh);
    switches.forEach((p) => p.geometry.dispose());

    /* ---- screen housings ------------------------------------------------- */
    const housings = [];
    const bezelSurf = [];
    for (const [cfg, title, right] of [[SCOPE, 'SURVEILLANCE PPI', 'DSP-1'], [STATUS, 'WEAPON STATUS', 'DSP-2']]) {
      const rot = [SCREEN_PITCH, cfg.toe, 0];
      const n = faceNormal(SCREEN_PITCH, cfg.toe);
      const up = new THREE.Vector3(0, 1, 0).applyEuler(_euler.set(SCREEN_PITCH, cfg.toe, 0));
      const c = new THREE.Vector3(cfg.x, cfg.y, cfg.z);
      housings.push({ geometry: chamferBox(cfg.w + 0.11, cfg.h + 0.14, HOUSE_D, HOUSE_CH), matrix: transform({ pos: c.toArray(), rot }) });
      // sun hood over the top of the housing
      const hood = c.clone().addScaledVector(up, cfg.h / 2 + 0.075).addScaledVector(n, 0.045);
      housings.push({ geometry: chamferBox(cfg.w + 0.13, 0.045, 0.15, 0.012), matrix: transform({ pos: hood.toArray(), rot: [SCREEN_PITCH + 0.62, cfg.toe, 0] }) });
      // stand column, tucked behind the housing so it never crops the screen
      const foot = c.clone().addScaledVector(up, -(cfg.h / 2 + 0.06)).addScaledVector(n, -0.06);
      housings.push({ geometry: chamferBox(0.24, 0.16, 0.14, 0.014), matrix: transform({ pos: [foot.x, BRIDGE_Y + 0.11, foot.z], rot: [0, cfg.toe, 0] }) });
      const bs = this.track(bezelTexture(title, right));
      const bezelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(cfg.w + 0.105, cfg.h + 0.135),
        litPanel(bs.texture, 0.22)
      );
      bezelPlane.position.copy(c).addScaledVector(n, FACE_Z - 0.004);
      bezelPlane.rotation.order = 'YXZ';
      bezelPlane.rotation.set(SCREEN_PITCH, cfg.toe, 0);
      bezelSurf.push(bezelPlane);
    }
    const housingMesh = new THREE.Mesh(mergeParts(housings), fascia);
    housingMesh.castShadow = true;
    housingMesh.receiveShadow = true;
    this.group.add(housingMesh);
    housings.forEach((p) => p.geometry.dispose());
    for (const b of bezelSurf) this.group.add(b);

    const mountScreen = (mesh, cfg) => {
      const n = faceNormal(SCREEN_PITCH, cfg.toe);
      mesh.position.set(cfg.x, cfg.y, cfg.z).addScaledVector(n, FACE_Z);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.set(SCREEN_PITCH, cfg.toe, 0);
      mesh.renderOrder = 1;
      this.group.add(mesh);
    };

    this.scope = new ScopeRenderer(640);
    this.scopeMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCOPE.w, SCOPE.h), basicScreen(this.scope.texture));
    mountScreen(this.scopeMesh, SCOPE);

    this.status = new StatusPanelRenderer(640, 480);
    this.statusMesh = new THREE.Mesh(new THREE.PlaneGeometry(STATUS.w, STATUS.h), basicScreen(this.status.texture));
    mountScreen(this.statusMesh, STATUS);

    /* ---- holographic track volume ---------------------------------------- */
    this.holo = new HoloDisplay(HOLO_R, HOLO_H, yaw);
    this.holo.group.position.set(HOLO_POS[0], HOLO_POS[1], HOLO_POS[2]);
    this.group.add(this.holo.group);

    const tank = [];
    const [hx, hy, hz] = HOLO_POS;
    tank.push({ geometry: cylinder(0.22, 0.30, 0.10, 22), matrix: transform({ pos: [hx, hy - 0.056, hz] }) });
    tank.push({ geometry: new THREE.TorusGeometry(HOLO_R, 0.011, 6, 40), matrix: transform({ pos: [hx, hy - 0.006, hz], rot: [Math.PI / 2, 0, 0] }) });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      tank.push({
        geometry: cylinder(0.0085, 0.0085, 0.09, 6),
        matrix: transform({ pos: [hx + Math.cos(a) * (HOLO_R - 0.02), hy - 0.05, hz + Math.sin(a) * (HOLO_R - 0.02)] }),
      });
    }
    tank.push({ geometry: new THREE.TorusGeometry(HOLO_R - 0.02, 0.008, 5, 34), matrix: transform({ pos: [hx, hy - 0.094, hz], rot: [Math.PI / 2, 0, 0] }) });
    // pedestal down to the bridge shelf, kept inside the cowl so it cannot
    // show through the tank floor
    tank.push({ geometry: chamferBox(0.30, 0.09, 0.24, 0.02), matrix: transform({ pos: [hx, BRIDGE_Y + 0.048, hz] }) });
    const tankMesh = new THREE.Mesh(mergeParts(tank), chrome);
    tankMesh.castShadow = true;
    this.group.add(tankMesh);
    tank.forEach((p) => p.geometry.dispose());

    // Soft fill so the tank rim and nearby panel pick up the holo's colour
    // without the point light itself becoming a bloom source.
    this.holoGlow = new THREE.PointLight(0x46d8c0, 0.75, 2.4, 2);
    this.holoGlow.position.set(hx, hy + 0.20, hz);
    this.group.add(this.holoGlow);

    /* ---- keyboard, trackball and desk clutter ---------------------------- */
    const kbSurf = this.track(keyboardTexture());
    const kbBody = new THREE.Mesh(chamferBox(0.68, 0.026, 0.23, 0.006), trim);
    kbBody.position.set(-0.24, 0.795, 0.30);
    kbBody.rotation.x = -0.06;
    kbBody.castShadow = true;
    this.group.add(kbBody);
    const kbFace = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.216), litPanel(kbSurf.texture, 0.14));
    kbFace.rotation.x = -Math.PI / 2;
    kbFace.position.y = 0.015;
    kbBody.add(kbFace);

    const deck = [];
    // trackball pod
    deck.push({ geometry: chamferBox(0.26, 0.05, 0.22, 0.01), matrix: transform({ pos: [0.30, 0.805, 0.30] }) });
    deck.push({ geometry: new THREE.SphereGeometry(0.05, 14, 10), matrix: transform({ pos: [0.30, 0.834, 0.30] }) });
    for (const dx of [-0.095, 0.095]) {
      deck.push({ geometry: chamferBox(0.05, 0.02, 0.09, 0.008), matrix: transform({ pos: [0.30 + dx, 0.832, 0.30] }) });
    }
    // comms handset in its cradle
    deck.push({ geometry: chamferBox(0.11, 0.045, 0.23, 0.01), matrix: transform({ pos: [-0.94, 0.80, 0.26] }) });
    deck.push({ geometry: cylinder(0.021, 0.021, 0.20, 8), matrix: transform({ pos: [-0.94, 0.846, 0.26], rot: [Math.PI / 2, 0, 0] }) });
    for (const dz of [-0.095, 0.095]) {
      deck.push({ geometry: chamferBox(0.05, 0.05, 0.048, 0.012), matrix: transform({ pos: [-0.94, 0.85, 0.26 + dz] }) });
    }
    deck.push({ geometry: pathTube([new THREE.Vector3(-0.94, 0.79, 0.37), new THREE.Vector3(-1.05, 0.74, 0.44), new THREE.Vector3(-1.14, 0.79, 0.36)], 0.012, 5) });
    // checklist card holder
    deck.push({ geometry: chamferBox(0.24, 0.008, 0.30, 0.004), matrix: transform({ pos: [0.86, 0.784, 0.30], rot: [0, -0.28, 0] }) });
    const deckMesh = new THREE.Mesh(mergeParts(deck), trim);
    deckMesh.castShadow = true;
    this.group.add(deckMesh);
    deck.forEach((p) => p.geometry.dispose());

    const card = this.track(equipmentPlateTexture(['DESIGNATE \u00B7 ASSIGN', 'AUTHORIZE \u00B7 OBSERVE'], '#9fd4c8'));
    const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.0525), basicScreen(card.texture, 0.8));
    cardMesh.rotation.set(-Math.PI / 2, 0, -0.28);
    cardMesh.position.set(0.86, 0.79, 0.30);
    this.group.add(cardMesh);

    /* ---- cable management ------------------------------------------------ */
    const loom = new THREE.Mesh(
      mergeParts([
        {
          geometry: pathTube(
            [
              new THREE.Vector3(-1.14, 0.99, -0.60),
              new THREE.Vector3(-0.55, 1.02, -0.66),
              new THREE.Vector3(0.55, 1.02, -0.66),
              new THREE.Vector3(1.14, 0.99, -0.60),
            ],
            0.024,
            6
          ),
        },
        { geometry: pathTube([new THREE.Vector3(-1.32, 0.12, -0.42), new THREE.Vector3(-1.64, 0.06, -0.14), new THREE.Vector3(-2.10, 0.06, 0.44)], 0.03, 6) },
        { geometry: pathTube([new THREE.Vector3(1.32, 0.12, -0.42), new THREE.Vector3(1.66, 0.06, -0.06), new THREE.Vector3(2.04, 0.06, 0.56)], 0.026, 6) },
      ]),
      std({ color: 0x14181a, roughness: 0.92, metalness: 0.02 })
    );
    loom.castShadow = true;
    this.group.add(loom);

    const gRng = seededRng(9371);
    const rack = new THREE.Mesh(
      mergeParts([
        { geometry: chamferBox(2.36, 0.05, 0.16, 0.012), matrix: transform({ pos: [0, 0.125, -0.54] }) },
        { geometry: greebleField(1.26, 0.32, gRng, { count: 12, maxSize: 0.13, depth: 0.035 }), matrix: transform({ pos: [0, 0.43, -0.50], rot: [0, Math.PI, 0] }) },
      ]),
      trim
    );
    this.group.add(rack);

    /* ---- operator chair, pushed clear of the docked pose ------------------ */
    const chair = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      chair.push({ geometry: chamferBox(0.30, 0.035, 0.06, 0.01), matrix: transform({ pos: [Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15], rot: [0, -a, 0] }) });
      chair.push({ geometry: cylinder(0.03, 0.03, 0.05, 8), matrix: transform({ pos: [Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29], rot: [Math.PI / 2, 0, -a] }) });
    }
    chair.push({ geometry: cylinder(0.045, 0.05, 0.34, 10), matrix: transform({ pos: [0, 0.22, 0] }) });
    chair.push({ geometry: chamferBox(0.46, 0.09, 0.44, 0.05), matrix: transform({ pos: [0, 0.44, 0] }) });
    chair.push({ geometry: chamferBox(0.42, 0.50, 0.09, 0.05), matrix: transform({ pos: [0, 0.72, 0.20], rot: [0.16, 0, 0] }) });
    for (const sx of [-1, 1]) {
      chair.push({ geometry: chamferBox(0.05, 0.16, 0.05, 0.012), matrix: transform({ pos: [sx * 0.24, 0.55, 0.10] }) });
      chair.push({ geometry: chamferBox(0.06, 0.03, 0.26, 0.012), matrix: transform({ pos: [sx * 0.24, 0.64, 0.02] }) });
    }
    const chairMesh = new THREE.Mesh(mergeParts(chair), std({ color: 0x24282b, roughness: 0.82, metalness: 0.12 }));
    chairMesh.position.set(0.78, 0, 1.42);
    chairMesh.rotation.y = -0.5;
    chairMesh.castShadow = true;
    this.group.add(chairMesh);
    chair.forEach((p) => p.geometry.dispose());

    this.group.userData.colliders = [{ type: 'box', pos: [0, 0.5, 0.0], half: [1.45, 0.5, 0.55], walkable: false }];

    // Docked camera: the operator stands square to the console with the two
    // screens, the holo tank and both button rows in frame and the shelter
    // opening just above the sun hoods.
    this.dockPose = {
      pos: new THREE.Vector3(DOCK_EYE[0], DOCK_EYE[1], DOCK_EYE[2]).applyEuler(this.group.rotation).add(this.group.position),
      yaw,
      pitch: DOCK_PITCH,
    };

    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.activeMap = {};
    this.scopeTick = 0;
    this.pulse = 0;
    this.applyButtonState();
    if (typeof window !== 'undefined') window.__RIG = this;
  }

  /** Keep canvas surfaces referenced so their textures stay alive. */
  track(surface) {
    this.surfaces.push(surface);
    return surface;
  }

  /** Ray from screen centre; returns { buttonId } or { trackId } or { scope }. */
  pick(camera, radar) {
    this.raycaster.setFromCamera(ORIGIN2, camera);
    const hitsB = this.raycaster.intersectObjects(this.buttons, true);
    if (hitsB.length) {
      let o = hitsB[0].object;
      while (o && !o.userData.buttonId) o = o.parent;
      if (o) return { buttonId: o.userData.buttonId, point: hitsB[0].point };
    }
    const blips = [];
    for (const b of this.holo.blips) if (b.blip.visible) blips.push(b.blip);
    const hitsT = this.raycaster.intersectObjects(blips, false);
    if (hitsT.length) {
      const item = this.holo.blips.find((b) => b.blip === hitsT[0].object);
      if (item && item.trackId && radar.find(item.trackId)) return { trackId: item.trackId, point: hitsT[0].point };
    }
    const hitsS = this.raycaster.intersectObject(this.scopeMesh, false);
    if (hitsS.length && this.scope.hitTargets) {
      const uv = hitsS[0].uv;
      let best = null;
      let bestD = 0.06;
      for (const t of this.scope.hitTargets) {
        const d = Math.hypot(t.x - uv.x, t.y - (1 - uv.y));
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) return { trackId: best.id, point: hitsS[0].point };
      return { scope: true, point: hitsS[0].point };
    }
    return null;
  }

  setHover(buttonId) {
    this.hovered = buttonId;
    this.applyButtonState();
  }

  press(buttonId) {
    const b = this.buttons.find((x) => x.userData.buttonId === buttonId);
    if (b) b.userData.press = 1;
  }

  setActive(map) {
    this.activeMap = map || {};
    this.applyButtonState();
  }

  applyButtonState() {
    for (const b of this.buttons) {
      const id = b.userData.buttonId;
      const active = !!this.activeMap[id];
      const hover = this.hovered === id;
      const mat = b.userData.face.material;
      mat.emissiveIntensity = active ? 1.35 : hover ? 1.0 : 0.45;
      mat.color.setScalar(active ? 1.35 : hover ? 1.15 : 1);
      b.scale.setScalar(active ? 1.04 : 1);
    }
  }

  setLamp(i, on) {
    this.lampColor.setHex(LAMPS[i].color).multiplyScalar(on ? 1 : 0.14);
    this.lampMesh.setColorAt(i, this.lampColor);
  }

  update(dt, radar, camera, opts) {
    if (typeof window !== 'undefined') window.__CAM = camera;
    // Screens redraw on a slow cadence, but any change to what they show forces
    // an immediate repaint so a fast-forwarded frame is never stale.
    this.scopeTick += dt;
    const sig = this.scope.signature(radar, opts);
    if (this.scopeTick > 1 / 18 || sig !== this.scope._sig) {
      this.scopeTick = 0;
      this.scope._sig = sig;
      this.scope.draw(radar, opts);
    }
    const ssig = this.status.signature(opts);
    if (ssig !== this.status._sig) {
      this.status._sig = ssig;
      this.status.draw(opts);
    }

    this.holo.update(dt, radar, camera, opts);

    for (const b of this.buttons) {
      if (b.userData.press > 0) b.userData.press = Math.max(0, b.userData.press - dt * 5);
      b.position.z = b.userData.baseZ - b.userData.press * 0.013 + (this.hovered === b.userData.buttonId ? 0.006 : 0);
    }

    // The guard lifts once a target is assigned and a round can be committed.
    const want = opts.assignedTrackId ? -1.15 : 0;
    this.guard.rotation.x += (want - this.guard.rotation.x) * Math.min(1, dt * 5);

    this.pulse += dt;
    const flash = Math.sin(this.pulse * 6) > 0;
    const bats = BATTERIES.map((b) => state.batteries[b.id]).filter(Boolean);
    const on = [
      state.phase === PHASE.ACTIVE || state.phase === PHASE.DEBRIEF,
      radar.tracks.length > 0,
      !!opts.selectedTrackId,
      !!opts.assignedTrackId,
      state.stats.inFlight > 0 && flash,
      bats.some((b) => b.state === BATTERY_STATE.READY && b.ammo > 0),
      bats.some((b) => b.state === BATTERY_STATE.RELOAD),
      (state.stats.leakers > 0 || (bats.length > 0 && bats.every((b) => b.ammo === 0))) && flash,
    ];
    for (let i = 0; i < LAMPS.length; i++) this.setLamp(i, on[i]);
    if (this.lampMesh.instanceColor) this.lampMesh.instanceColor.needsUpdate = true;

    this.holoGlow.intensity = 0.55 + Math.min(6, radar.tracks.length) * 0.06;
  }
}

/** Tiny deterministic stream for the console's cosmetic greebles. */
function seededRng(seed) {
  let s = seed | 0 || 1;
  const next = () => ((s = (Math.imul(s, 48271) + 11) & 0x7fffffff), (s >>> 9) / 4194304);
  return { next, range: (a, b) => a + (b - a) * next() };
}
