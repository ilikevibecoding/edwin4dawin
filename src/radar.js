// Radar: track formation, the PPI scope canvas (also used as the console table
// texture), the stylised 3D track hologram above the table, and mouse picking.
//
// The detection/classification behaviour is a gameplay abstraction.
import * as THREE from 'three';
import * as T from './core/textures.js';

const SCOPE_SIZE = 640;
const SIDE_W = 512;
const SIDE_H = 288;

export const SCOPE_RANGE = 62000; // metres shown from the centre to the outer ring

export class Radar {
  constructor(scene, anchor, { rng }) {
    this.scene = scene;
    this.rng = rng;
    this.tracks = [];
    this.selected = null;
    this.sweep = 0;
    this.time = 0;
    this.range = SCOPE_RANGE;

    // --- PPI canvas -------------------------------------------------------
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SCOPE_SIZE;
    this.canvas.className = 'scope-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // --- side status canvas ----------------------------------------------
    this.sideCanvas = document.createElement('canvas');
    this.sideCanvas.width = SIDE_W;
    this.sideCanvas.height = SIDE_H;
    this.sideCtx = this.sideCanvas.getContext('2d');
    this.sideTexture = new THREE.CanvasTexture(this.sideCanvas);
    this.sideTexture.colorSpace = THREE.SRGBColorSpace;

    // --- 3D hologram ------------------------------------------------------
    this.holo = new THREE.Group();
    this.holo.name = 'radar-holo';
    this.holo.position.copy(anchor.position);
    this.holo.position.y += 1.0;
    scene.add(this.holo);
    this._buildHolo();

    this.scopeScale = 1.32 / this.range;   // metres -> holo/table units
    this.altScale = 1.15 / 40000;
  }

  _buildHolo() {
    const grid = new THREE.Group();
    this.holo.add(grid);
    // faint volume cage: rings plus vertical altitude gradations
    const ringMat = new THREE.LineBasicMaterial({ color: 0x3ce0a0, transparent: true, opacity: 0.16 });
    for (let i = 1; i <= 4; i++) {
      const r = (i / 4) * 1.32;
      const pts = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * r, 0.002, Math.sin(t) * r));
      }
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pts = [new THREE.Vector3(0, 0.002, 0), new THREE.Vector3(Math.cos(a) * 1.32, 0.002, Math.sin(a) * 1.32)];
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }

    // pooled track markers: glowing sprite + altitude stalk + label
    this.markers = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      g.visible = false;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glow(0.42),
        color: 0xff5a3c,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }));
      sprite.scale.setScalar(0.1);
      g.add(sprite);
      const stalkGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0),
      ]);
      const stalk = new THREE.Line(stalkGeo, new THREE.LineBasicMaterial({
        color: 0xff5a3c, transparent: true, opacity: 0.5,
      }));
      g.add(stalk);
      const base = new THREE.Mesh(
        new THREE.RingGeometry(0.028, 0.042, 16),
        new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      base.rotation.x = -Math.PI / 2;
      g.add(base);
      const label = makeLabelSprite();
      label.position.set(0.09, 0.07, 0);
      g.add(label);
      this.holo.add(g);
      this.markers.push({ group: g, sprite, stalk, base, label, track: null });
    }

    // sweep fan above the table
    const fanGeo = new THREE.CircleGeometry(1.32, 28, 0, 0.42);
    const fanMat = new THREE.MeshBasicMaterial({
      color: 0x3ce0a0, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.fan = new THREE.Mesh(fanGeo, fanMat);
    this.fan.rotation.x = -Math.PI / 2;
    this.fan.position.y = 0.004;
    this.holo.add(this.fan);

    // interceptor markers
    this.friendMarkers = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glow(0.5), color: 0x6fe8ff, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, depthTest: false,
      }));
      s.scale.setScalar(0.075);
      s.visible = false;
      this.holo.add(s);
      this.friendMarkers.push(s);
    }
  }

  /** World XZ -> holo local coordinates (north is -Z, matching the world). */
  worldToHolo(pos, out = new THREE.Vector3()) {
    out.set(pos.x * this.scopeScale, Math.min(1.15, pos.y * this.altScale), pos.z * this.scopeScale);
    return out;
  }

  /** World XZ -> scope canvas pixels. */
  worldToScope(pos) {
    const s = (SCOPE_SIZE / 2) / this.range;
    return {
      x: SCOPE_SIZE / 2 + pos.x * s,
      y: SCOPE_SIZE / 2 + pos.z * s,
    };
  }

  updateTracks(threats, dt) {
    const seen = new Set();
    for (const t of threats) {
      if (!t.detected) continue;
      seen.add(t);
      let tr = this.tracks.find((x) => x.threat === t);
      if (!tr) {
        tr = {
          id: t.trackId,
          threat: t,
          quality: 0,
          firstSeen: this.time,
          classification: 'UNKNOWN',
        };
        this.tracks.push(tr);
      }
      tr.quality = Math.min(1, tr.quality + dt * 0.9);
      const speed = t.vel.length();
      tr.speed = speed;
      tr.altitude = t.pos.y;
      tr.range = Math.hypot(t.pos.x, t.pos.z);
      tr.slant = Math.hypot(tr.range, t.pos.y);
      // simple free-fall estimate of time to ground
      const vy = -t.vel.y;
      const g = 9.81;
      const disc = vy * vy + 2 * g * Math.max(0, t.pos.y);
      tr.timeToImpact = disc > 0 ? (-vy + Math.sqrt(disc)) / g : 0;
      if (tr.timeToImpact < 0) tr.timeToImpact = Math.max(0, t.pos.y / Math.max(1, vy));
      tr.closing = true;
      if (t.isDecoy && tr.quality > 0.55 && t.classified > 0.45) tr.classification = 'DECOY';
      else if (tr.quality > 0.35) tr.classification = t.isDecoy && t.classified > 0.2 ? 'UNCERTAIN' : 'BALLISTIC';
      tr.assigned = t.assignedTo || null;
      tr.engaged = !!t.engagedBy;
    }
    // drop tracks whose threat has gone
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      if (!seen.has(this.tracks[i].threat)) {
        if (this.selected === this.tracks[i]) this.selected = null;
        this.tracks.splice(i, 1);
      }
    }
    // nearest-first so the list reads as a priority queue
    this.tracks.sort((a, b) => a.timeToImpact - b.timeToImpact);
  }

  selectTrack(track) {
    this.selected = track || null;
  }

  selectNext() {
    if (!this.tracks.length) {
      this.selected = null;
      return null;
    }
    const idx = this.tracks.indexOf(this.selected);
    this.selected = this.tracks[(idx + 1) % this.tracks.length];
    return this.selected;
  }

  /** Pick a hologram marker under the pointer (NDC coords). */
  pick(ndc, camera) {
    const ray = new THREE.Raycaster();
    ray.params.Sprite = { threshold: 0 };
    ray.setFromCamera(ndc, camera);
    let best = null;
    let bestDist = Infinity;
    for (const m of this.markers) {
      if (!m.group.visible || !m.track) continue;
      const wp = new THREE.Vector3();
      m.sprite.getWorldPosition(wp);
      // distance from the ray to the marker centre, scaled by depth
      const toPoint = wp.clone().sub(ray.ray.origin);
      const along = toPoint.dot(ray.ray.direction);
      if (along <= 0) continue;
      const closest = ray.ray.origin.clone().addScaledVector(ray.ray.direction, along);
      const d = closest.distanceTo(wp);
      const pickRadius = 0.075 + along * 0.02;
      if (d < pickRadius && along < bestDist) {
        bestDist = along;
        best = m.track;
      }
    }
    return best;
  }

  update(dt, { threats, interceptors, batteries, selectedBattery, gameState }) {
    this.time += dt;
    this.sweep += dt * 0.85;
    this.updateTracks(threats, dt);
    this._updateHolo(interceptors, selectedBattery);
    this._drawScope(interceptors, batteries, selectedBattery, gameState);
    this._drawSide(batteries, selectedBattery, gameState);
    this.texture.needsUpdate = true;
    this.sideTexture.needsUpdate = true;
  }

  _updateHolo(interceptors, selectedBattery) {
    this.fan.rotation.z = -this.sweep;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i];
      const tr = this.tracks[i];
      m.track = tr || null;
      if (!tr) {
        m.group.visible = false;
        continue;
      }
      m.group.visible = true;
      this.worldToHolo(tr.threat.pos, v);
      m.group.position.copy(v);
      const isSel = this.selected === tr;
      const decoy = tr.classification === 'DECOY';
      const col = decoy ? 0xffc23a : tr.engaged ? 0xff8a3c : 0xff4030;
      m.sprite.material.color.setHex(col);
      m.base.material.color.setHex(col);
      m.stalk.material.color.setHex(col);
      const pulse = isSel ? 1.35 + Math.sin(this.time * 9) * 0.28 : 1;
      m.sprite.scale.setScalar(0.085 * pulse * (0.7 + tr.quality * 0.5));
      m.base.position.y = -v.y;
      m.stalk.scale.y = v.y;
      m.label.material.map.__draw(
        `${tr.id}  ${(tr.altitude / 1000).toFixed(0)}km`,
        isSel ? '#ffffff' : decoy ? '#ffd98a' : '#ff9c86',
      );
      m.label.material.map.needsUpdate = true;
      m.label.scale.set(0.34, 0.085, 1);
    }
    for (let i = 0; i < this.friendMarkers.length; i++) {
      const s = this.friendMarkers[i];
      const it = interceptors[i];
      if (!it) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      this.worldToHolo(it.pos, v);
      s.position.copy(v);
      s.scale.setScalar(0.06 + (it.phase === 'BOOST' ? 0.03 : 0));
    }
  }

  // -------------------------------------------------------------------------
  // PPI rendering
  // -------------------------------------------------------------------------

  _drawScope(interceptors, batteries, selectedBattery, gameState) {
    const ctx = this.ctx;
    const S = SCOPE_SIZE;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 18;

    // phosphor persistence: fade rather than clear
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(3,12,9,0.30)';
    ctx.fillRect(0, 0, S, S);

    // background wash + noise speckle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    ctx.clip();
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grd.addColorStop(0, 'rgba(10,40,28,0.20)');
    grd.addColorStop(1, 'rgba(3,14,10,0.24)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const r = Math.sqrt(this.rng.float()) * R;
      ctx.fillStyle = `rgba(80,220,150,${0.02 + this.rng.float() * 0.05})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.7 + this.rng.float() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // range rings and bearing ticks
    ctx.strokeStyle = 'rgba(64,224,150,0.34)';
    ctx.lineWidth = 1.2;
    ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(96,232,170,0.6)';
    ctx.textAlign = 'left';
    for (let i = 1; i <= 4; i++) {
      const r = (i / 4) * R;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${((this.range * i) / 4000).toFixed(0)}`, cx + 4, cy - r + 13);
    }
    ctx.strokeStyle = 'rgba(64,224,150,0.22)';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 3 === 0 ? R - 16 : R - 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,240,190,0.75)';
    ctx.font = 'bold 13px "Roboto Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const [label, a] of [['N', -Math.PI / 2], ['E', 0], ['S', Math.PI / 2], ['W', Math.PI]]) {
      ctx.fillText(label, cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26) + 5);
    }

    // rotating sweep with a fading wedge
    const sweepA = this.sweep % (Math.PI * 2) - Math.PI / 2;
    const wedge = ctx.createConicGradient
      ? null
      : null;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 22; i++) {
      const a = sweepA - i * 0.035;
      const alpha = 0.19 * (1 - i / 22);
      ctx.strokeStyle = `rgba(120,255,190,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(180,255,220,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweepA) * R, Math.sin(sweepA) * R);
    ctx.stroke();
    ctx.restore();

    // own site + batteries
    ctx.fillStyle = 'rgba(150,255,205,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,255,205,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();
    for (const b of batteries) {
      const p = this.worldToScope(b.group.position);
      const sel = b === selectedBattery;
      ctx.strokeStyle = sel ? 'rgba(190,255,225,0.95)' : 'rgba(110,220,175,0.5)';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.beginPath();
      ctx.rect(p.x - 4, p.y - 4, 8, 8);
      ctx.stroke();
    }

    // interceptor symbols with short history tails
    for (const it of interceptors) {
      const p = this.worldToScope(it.pos);
      ctx.strokeStyle = 'rgba(120,225,255,0.95)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8);
      ctx.lineTo(p.x, p.y - 4);
      ctx.stroke();
      const vel = it.vel;
      ctx.strokeStyle = 'rgba(120,225,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + vel.x * 0.0035, p.y + vel.z * 0.0035);
      ctx.stroke();
    }

    // hostile tracks
    ctx.textAlign = 'left';
    for (const tr of this.tracks) {
      const p = this.worldToScope(tr.threat.pos);
      const sel = this.selected === tr;
      const decoy = tr.classification === 'DECOY';
      const col = decoy ? '255,200,60' : tr.engaged ? '255,150,70' : '255,72,54';
      // velocity leader
      ctx.strokeStyle = `rgba(${col},0.55)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + tr.threat.vel.x * 0.006, p.y + tr.threat.vel.z * 0.006);
      ctx.stroke();
      // symbol: hostile diamond (open for uncertain)
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.fillStyle = `rgba(${col},${decoy ? 0.15 : 0.55})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 7);
      ctx.lineTo(p.x + 6, p.y);
      ctx.lineTo(p.x, p.y + 7);
      ctx.lineTo(p.x - 6, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (sel) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.6;
        const b = 13;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.beginPath();
          ctx.moveTo(p.x + sx * b, p.y + sy * b - sy * 5);
          ctx.lineTo(p.x + sx * b, p.y + sy * b);
          ctx.lineTo(p.x + sx * b - sx * 5, p.y + sy * b);
          ctx.stroke();
        }
      }
      ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
      ctx.fillStyle = `rgba(${col},0.95)`;
      ctx.fillText(tr.id, p.x + 10, p.y - 6);
      ctx.fillStyle = `rgba(${col},0.7)`;
      ctx.fillText(`${(tr.altitude / 1000).toFixed(0)}km ${tr.timeToImpact.toFixed(0)}s`, p.x + 10, p.y + 6);
    }

    // frame overlay
    ctx.strokeStyle = 'rgba(70,235,160,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 13px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(120,240,190,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(`RANGE ${(this.range / 1000).toFixed(0)} KM`, 16, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`TRACKS ${this.tracks.length}`, S - 16, 24);
    ctx.textAlign = 'left';
    ctx.fillText(gameState ? gameState.toUpperCase() : '', 16, S - 16);
    ctx.textAlign = 'right';
    ctx.fillText('SECTOR SEARCH', S - 16, S - 16);

    // scanlines
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    for (let y = 0; y < S; y += 3) ctx.fillRect(0, y, S, 1);
    ctx.globalAlpha = 1;
  }

  _drawSide(batteries, selectedBattery, gameState) {
    const ctx = this.sideCtx;
    ctx.fillStyle = '#061410';
    ctx.fillRect(0, 0, SIDE_W, SIDE_H);
    ctx.fillStyle = 'rgba(60,224,160,0.12)';
    for (let y = 0; y < SIDE_H; y += 4) ctx.fillRect(0, y, SIDE_W, 1);

    ctx.font = 'bold 17px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#7dffc4';
    ctx.fillText('BATTERY STATUS', 14, 26);
    ctx.strokeStyle = 'rgba(120,255,200,0.4)';
    ctx.beginPath();
    ctx.moveTo(14, 34);
    ctx.lineTo(SIDE_W - 14, 34);
    ctx.stroke();

    ctx.font = '14px "Roboto Mono", ui-monospace, monospace';
    let y = 58;
    for (const b of batteries) {
      const sel = b === selectedBattery;
      ctx.fillStyle = sel ? '#d8fff0' : '#57c99b';
      ctx.fillText(`${sel ? '>' : ' '} ${b.spec.name.padEnd(15)}`, 14, y);
      const statusColor = b.status === 'READY' ? '#6dff9e' : b.status === 'EMPTY' ? '#ff5a48' : '#ffc23a';
      ctx.fillStyle = statusColor;
      ctx.fillText(b.status.padEnd(10), 250, y);
      ctx.fillStyle = '#8fe8c4';
      ctx.fillText(`${b.loaded}/${b.ammo}`, 400, y);
      y += 24;
    }

    y += 12;
    ctx.font = 'bold 15px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#7dffc4';
    ctx.fillText('TRACK LIST', 14, y);
    y += 10;
    ctx.strokeStyle = 'rgba(120,255,200,0.4)';
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(SIDE_W - 14, y);
    ctx.stroke();
    y += 20;
    ctx.font = '13px "Roboto Mono", ui-monospace, monospace';
    if (!this.tracks.length) {
      ctx.fillStyle = '#3f8f70';
      ctx.fillText('-- NO CONTACTS --', 14, y);
    }
    for (const tr of this.tracks.slice(0, 6)) {
      const sel = this.selected === tr;
      ctx.fillStyle = sel ? '#ffffff' : tr.classification === 'DECOY' ? '#ffc23a' : '#ff8a72';
      ctx.fillText(
        `${sel ? '>' : ' '}${tr.id} ${(tr.altitude / 1000).toFixed(0).padStart(3)}km ` +
        `${(tr.speed).toFixed(0).padStart(4)}m/s ${tr.timeToImpact.toFixed(0).padStart(3)}s ` +
        `${tr.engaged ? 'ENG' : tr.assigned ? 'ASG' : '---'}`,
        14, y,
      );
      y += 20;
    }
  }
}

// ---------------------------------------------------------------------------
// Tiny canvas label sprites for the hologram
// ---------------------------------------------------------------------------

function makeLabelSprite() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.__draw = (text, color) => {
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 30px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 4, 34);
  };
  tex.__draw('', '#fff');
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false,
  });
  const s = new THREE.Sprite(mat);
  s.center.set(0, 0.5);
  return s;
}
