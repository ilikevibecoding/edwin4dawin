/**
 * Radar model and scope rendering.
 *
 * A stylised plan-position display: a sweep rotates at a fixed rate, tracks are
 * acquired as it passes over them, and track symbology carries range, altitude,
 * heading leader, classification and engagement state.
 *
 * The detection and classification behaviour is a readability device for the
 * player, not a model of any real sensor. There are no real frequencies,
 * waveforms, detection ranges or discrimination techniques here.
 */

import * as THREE from 'three';
import { RADAR, WORLD, BATTERIES } from './config.js';
import { clamp, clamp01, lerp, fmtRange, fmtAlt, DEG, RAD } from './util/mathx.js';
import { THREAT_PHASE } from './threats.js';

export const CLASSIFICATION = {
  UNKNOWN: 'UNCONFIRMED',
  BALLISTIC: 'BALLISTIC',
  DECOY: 'UNCONFIRMED',
};

/** Bearing in radians where 0 = -Z (site "north"), increasing clockwise. */
export function bearingOf(x, z) {
  return Math.atan2(x, -z);
}

class Track {
  constructor(threat) {
    this.threat = threat;
    this.id = threat.id;
    this.isDecoy = threat.isDecoy;
    this.acquired = false;
    this.acquiredAt = 0;
    this.classified = false;
    this.trackTime = 0;
    this.lastSeen = 0;
    this.quality = 0;
    this.lost = false;
    this.bearing = 0;
    this.range = 0;
    this.altitude = 0;
    this.speed = 0;
    this.tti = 0;
    this.engagedCount = 0;
    this.blip = 0;
  }

  get label() {
    if (!this.classified) return CLASSIFICATION.UNKNOWN;
    return this.isDecoy ? CLASSIFICATION.DECOY : CLASSIFICATION.BALLISTIC;
  }

  get symbolKind() {
    if (!this.classified) return 'unknown';
    return this.isDecoy ? 'decoy' : 'threat';
  }
}

export class Radar {
  constructor() {
    this.sweep = 0;
    this.tracks = new Map();
    this.time = 0;
    this.rotation = 0;
    this.selectedId = null;
  }

  reset() {
    this.tracks.clear();
    this.sweep = 0;
    this.time = 0;
    this.selectedId = null;
  }

  get trackList() {
    return [...this.tracks.values()].filter((t) => t.acquired && !t.lost);
  }

  get activeTrackCount() {
    return this.trackList.filter((t) => t.threat.alive).length;
  }

  select(id) {
    this.selectedId = id;
  }

  /** Cycle selection through acquired, still-live tracks. */
  cycle(dir = 1) {
    const list = this.trackList.filter((t) => t.threat.alive);
    if (!list.length) { this.selectedId = null; return null; }
    const i = list.findIndex((t) => t.id === this.selectedId);
    const next = list[(i + dir + list.length) % list.length];
    this.selectedId = next.id;
    return next;
  }

  get selected() {
    if (!this.selectedId) return null;
    const t = this.tracks.get(this.selectedId);
    return t && t.threat.alive && !t.lost ? t : null;
  }

  /**
   * @param {number} dt
   * @param {Array} threats live threat entities
   * @param {object} interceptorSystem
   */
  update(dt, threats, interceptorSystem) {
    this.time += dt;
    const prevSweep = this.sweep;
    this.sweep = (this.sweep + (Math.PI * 2 * dt) / RADAR.sweepPeriod) % (Math.PI * 2);
    this.rotation += dt * RADAR.rotationSpeed * Math.PI * 2;

    // Register new threats
    for (const th of threats) {
      if (!this.tracks.has(th.id)) this.tracks.set(th.id, new Track(th));
    }

    for (const track of this.tracks.values()) {
      const th = track.threat;
      if (!th.alive) {
        track.lastSeen = track.lastSeen || this.time;
        if (this.time - track.lastSeen > RADAR.trackLossTime) track.lost = true;
        continue;
      }
      track.bearing = bearingOf(th.pos.x, th.pos.z);
      track.range = Math.hypot(th.pos.x, th.pos.z);
      track.slant = th.pos.length();
      track.altitude = th.pos.y;
      track.speed = th.speed;
      track.tti = th.timeToImpact;
      track.engagedCount = interceptorSystem ? interceptorSystem.countOnTarget(th.id) : 0;
      th.engagedBy = track.engagedCount > 0 ? track.engagedCount : null;

      // Sweep crossing test (handles wrap-around).
      const b = (track.bearing + Math.PI * 2) % (Math.PI * 2);
      const crossed = prevSweep <= this.sweep
        ? (b > prevSweep && b <= this.sweep)
        : (b > prevSweep || b <= this.sweep);

      const inRange = track.slant < RADAR.displayRange;
      if (crossed && inRange) {
        track.blip = 1;
        track.lastSeen = this.time;
        if (!track.acquired) {
          track.acquired = true;
          track.acquiredAt = this.time;
          track.isNew = true;
        }
      }
      if (track.acquired) {
        track.trackTime += dt;
        track.quality = clamp01(track.quality + dt * (inRange ? 0.9 : -0.6));
        // Real bodies classify after a few sweeps; light returns never do,
        // which is the player's only cue that something is not a warhead.
        if (!track.classified && !track.isDecoy && track.trackTime > RADAR.sweepPeriod * 1.35) {
          track.classified = true;
          track.justClassified = true;
        }
      }
      track.blip = Math.max(0, track.blip - dt / RADAR.sweepPeriod);
      if (this.time - track.lastSeen > RADAR.trackLossTime * 2.5) track.lost = true;
    }

    // Drop stale entries
    for (const [id, t] of [...this.tracks.entries()]) {
      if (t.lost && !t.threat.alive) this.tracks.delete(id);
    }
    if (this.selectedId) {
      const s = this.tracks.get(this.selectedId);
      if (!s || s.lost || !s.threat.alive) this.selectedId = null;
    }
  }

  /** Screen-space hit test used by the scope click handler. */
  pickAt(nx, ny, displayRange = RADAR.displayRange) {
    // nx, ny are -1..1 scope coordinates with +y toward the top (north).
    let best = null, bestD = 0.09;
    for (const t of this.trackList) {
      if (!t.threat.alive) continue;
      const r = clamp01(t.range / displayRange);
      const tx = Math.sin(t.bearing) * r;
      const ty = Math.cos(t.bearing) * r;
      const d = Math.hypot(tx - nx, ty - ny);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }
}

// ===========================================================================
// Scope rendering (shared by the console display and the HUD mini-scope)
// ===========================================================================

const PHOS = '#66ff9e';
const PHOS_DIM = 'rgba(102,255,158,0.28)';
const AMBER = '#ffc247';
const RED = '#ff5b52';
const BLUE = '#6fd6ff';

export class ScopeRenderer {
  constructor(canvas, { compact = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.compact = compact;
    this.displayRange = RADAR.displayRange;
    // Persistent afterglow layer so the sweep leaves a decaying trail.
    this.glow = document.createElement('canvas');
    this.glow.width = canvas.width;
    this.glow.height = canvas.height;
    this.gctx = this.glow.getContext('2d');
  }

  draw(radar, ctx2 = null, opts = {}) {
    const { batteries = [], interceptors = [], selectedBatteryId = null, condition = 'day' } = opts;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.46;
    const compact = this.compact;

    // Fade the afterglow layer -------------------------------------------
    const g = this.gctx;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, W, H);

    // Scope face ---------------------------------------------------------
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, '#06170f');
    bg.addColorStop(0.75, '#04120c');
    bg.addColorStop(1, '#020a07');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Range rings
    ctx.lineWidth = 1;
    const rings = compact ? 3 : 5;
    for (let i = 1; i <= rings; i++) {
      const rr = (i / rings) * R;
      ctx.strokeStyle = i === rings ? 'rgba(102,255,158,0.45)' : PHOS_DIM;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      if (!compact) {
        ctx.fillStyle = 'rgba(102,255,158,0.45)';
        ctx.font = `${Math.round(R * 0.036)}px ui-monospace, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round((this.displayRange * i) / rings / 1000)}`, cx + 4, cy - rr + R * 0.045);
      }
    }
    // Bearing spokes and ticks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(102,255,158,0.34)' : 'rgba(102,255,158,0.14)';
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * R * 0.06, cy - Math.cos(a) * R * 0.06);
      ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
      ctx.stroke();
    }
    if (!compact) {
      ctx.font = `600 ${Math.round(R * 0.045)}px ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillStyle = 'rgba(102,255,158,0.5)';
        const lbl = String(Math.round((i / 12) * 360)).padStart(3, '0');
        ctx.fillText(lbl, cx + Math.sin(a) * R * 1.06, cy - Math.cos(a) * R * 1.06);
      }
    }

    // Battery envelope arcs ----------------------------------------------
    if (!compact) {
      for (const b of batteries) {
        const e = b.def.envelope;
        const rr = clamp01(e.maxRange / this.displayRange) * R;
        const sel = b.def.id === selectedBatteryId;
        ctx.strokeStyle = sel ? 'rgba(255,194,71,0.4)' : 'rgba(102,255,158,0.12)';
        ctx.setLineDash(sel ? [5, 5] : [2, 8]);
        ctx.lineWidth = sel ? 1.4 : 1;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        if (sel) {
          ctx.fillStyle = 'rgba(255,194,71,0.55)';
          ctx.font = `${Math.round(R * 0.033)}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(b.def.name + ' MAX', cx, cy - rr - R * 0.02);
        }
      }
    }

    // Sweep --------------------------------------------------------------
    const sw = radar.sweep;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, 'rgba(102,255,158,0.0)');
    grad.addColorStop(0.6, 'rgba(102,255,158,0.10)');
    grad.addColorStop(1, 'rgba(102,255,158,0.24)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R, -Math.PI / 2 + sw - 0.16, -Math.PI / 2 + sw);
    g.closePath();
    g.fill();
    ctx.drawImage(this.glow, 0, 0);
    // Leading edge
    ctx.strokeStyle = 'rgba(150,255,190,0.85)';
    ctx.lineWidth = compact ? 1.2 : 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(sw) * R, cy - Math.cos(sw) * R);
    ctx.stroke();

    // Site symbol --------------------------------------------------------
    ctx.strokeStyle = PHOS;
    ctx.lineWidth = 1.4;
    const s = R * 0.028;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.9, 0, Math.PI * 2); ctx.stroke();

    // Battery positions
    if (!compact) {
      for (const b of batteries) {
        const p = b.worldPosition;
        const px = cx + (p.x / this.displayRange) * R * 40;
        const py = cy - (-p.z / this.displayRange) * R * 40;
        ctx.fillStyle = b.def.id === selectedBatteryId ? AMBER : 'rgba(102,255,158,0.6)';
        ctx.beginPath();
        ctx.moveTo(px, py - 4); ctx.lineTo(px + 3.6, py + 3); ctx.lineTo(px - 3.6, py + 3);
        ctx.closePath(); ctx.fill();
      }
    }

    // Interceptors -------------------------------------------------------
    for (const m of interceptors) {
      const r = clamp01(Math.hypot(m.pos.x, m.pos.z) / this.displayRange);
      const b = bearingOf(m.pos.x, m.pos.z);
      const px = cx + Math.sin(b) * r * R;
      const py = cy - Math.cos(b) * r * R;
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.4;
      const sz = compact ? 2.4 : 4;
      ctx.beginPath();
      ctx.moveTo(px, py - sz); ctx.lineTo(px + sz, py); ctx.lineTo(px, py + sz);
      ctx.lineTo(px - sz, py); ctx.closePath(); ctx.stroke();
      // Velocity leader
      const vb = bearingOf(m.vel.x, m.vel.z);
      const lead = compact ? 7 : 13;
      ctx.strokeStyle = 'rgba(111,214,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.sin(vb) * lead, py - Math.cos(vb) * lead);
      ctx.stroke();
    }

    // Tracks -------------------------------------------------------------
    const tracks = radar.trackList;
    for (const t of tracks) {
      if (!t.threat.alive) continue;
      const r = clamp01(t.range / this.displayRange);
      const px = cx + Math.sin(t.bearing) * r * R;
      const py = cy - Math.cos(t.bearing) * r * R;
      const isSel = t.id === radar.selectedId;
      const kind = t.symbolKind;
      const col = kind === 'threat' ? RED : kind === 'decoy' ? AMBER : AMBER;
      const sz = (compact ? 3.2 : 6) * (1 + t.blip * 0.5);

      // Blip flare right after the sweep passes
      if (t.blip > 0.05) {
        ctx.fillStyle = `rgba(${kind === 'threat' ? '255,91,82' : '255,194,71'},${t.blip * 0.35})`;
        ctx.beginPath(); ctx.arc(px, py, sz * 3.2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = isSel ? 2 : 1.4;
      if (kind === 'threat') {
        // Hostile: filled inverted chevron
        ctx.beginPath();
        ctx.moveTo(px, py + sz); ctx.lineTo(px + sz, py - sz * 0.7);
        ctx.lineTo(px - sz, py - sz * 0.7); ctx.closePath();
        ctx.fill();
      } else {
        // Unconfirmed: hollow square
        ctx.beginPath();
        ctx.rect(px - sz * 0.8, py - sz * 0.8, sz * 1.6, sz * 1.6);
        ctx.stroke();
      }

      // Heading leader scaled by speed
      const vb = bearingOf(t.threat.vel.x, t.threat.vel.z);
      const lead = (compact ? 8 : 16) * clamp01(t.speed / 1400);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.sin(vb) * lead, py - Math.cos(vb) * lead);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (isSel) {
        // Acquisition brackets
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        const q = sz * 2.4;
        for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.beginPath();
          ctx.moveTo(px + ox * q, py + oy * q * 0.6);
          ctx.lineTo(px + ox * q, py + oy * q);
          ctx.lineTo(px + ox * q * 0.6, py + oy * q);
          ctx.stroke();
        }
      }
      if (t.engagedCount > 0) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(px, py, sz * 2.9, 0, Math.PI * 2); ctx.stroke();
      }

      if (!compact) {
        ctx.font = `${Math.round(R * 0.032)}px ui-monospace, monospace`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = isSel ? '#ffffff' : col;
        const lines = [
          `${t.id}  ${t.label}`,
          `${fmtAlt(t.altitude)}  ${fmtRange(t.range)}`,
          `TTI ${t.tti.toFixed(0)}s`,
        ];
        lines.forEach((l, i) => ctx.fillText(l, px + sz * 2.4, py - sz + i * R * 0.038));
      }
    }

    // Frame / bezel ------------------------------------------------------
    ctx.strokeStyle = 'rgba(102,255,158,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // Scanlines + phosphor bloom feel
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;

    if (!compact) {
      ctx.fillStyle = 'rgba(102,255,158,0.6)';
      ctx.font = `${Math.round(R * 0.036)}px ui-monospace, monospace`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`RANGE ${(this.displayRange / 1000).toFixed(0)} KM`, 8, 8);
      ctx.fillText(`TRACKS ${tracks.filter((t) => t.threat.alive).length}`, 8, 8 + R * 0.05);
      ctx.textAlign = 'right';
      ctx.fillText('PPI / SEARCH', W - 8, 8);
      ctx.fillText(condition.toUpperCase(), W - 8, 8 + R * 0.05);
    }
  }
}
