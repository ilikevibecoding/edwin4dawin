// Radar model + displays. One canvas is drawn for the PPI scope; it is used
// both as the fullscreen console overlay AND as a texture on the in-world
// shelter screen. Detection, track quality and classification are game
// abstractions, not radar simulation.
import * as THREE from 'three';

const RANGE = 8000; // display range, meters (fictional)

export class Radar {
  constructor(ctx) {
    this.ctx = ctx;
    this.canvas = document.getElementById('radar-canvas');
    this.g = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.statusCanvas = document.createElement('canvas');
    this.statusCanvas.width = 256; this.statusCanvas.height = 192;
    this.statusTexture = new THREE.CanvasTexture(this.statusCanvas);
    this.statusTexture.colorSpace = THREE.SRGBColorSpace;

    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 256; this.mapCanvas.height = 192;
    this.mapTexture = new THREE.CanvasTexture(this.mapCanvas);
    this.mapTexture.colorSpace = THREE.SRGBColorSpace;
    this._drawBaseMap();

    this.sweep = 0;         // radians
    this.sweepRate = (Math.PI * 2) / 2.4;
    this.tracks = [];       // live tracks
    this.tombstones = [];   // recently dead: { x, z, label, age, kind }
    this.selectedId = null;
    this.drawTimer = 0;
    this.statusTimer = 0;
    this.blip = 0;
  }

  reset() {
    this.tracks.length = 0;
    this.tombstones.length = 0;
    this.selectedId = null;
  }

  get selected() { return this.tracks.find(t => t.id === this.selectedId) || null; }

  select(id) {
    this.selectedId = id;
    this.ctx.audio?.uiBeep();
  }

  // pick nearest track to canvas coords (console mode click)
  pick(cx, cy) {
    const S = this.canvas.width;
    let best = null, bestD = 32 * 32;
    for (const t of this.tracks) {
      const px = S / 2 + (t.est.x / RANGE) * (S / 2 - 20);
      const py = S / 2 + (t.est.z / RANGE) * (S / 2 - 20);
      const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  update(dt) {
    this.sweep = (this.sweep + this.sweepRate * dt) % (Math.PI * 2);
    const threats = this.ctx.threats.list;

    // acquire new tracks when sweep passes their azimuth
    for (const th of threats) {
      if (!th.alive) continue;
      if (this.tracks.some(t => t.threat === th)) continue;
      const range = Math.hypot(th.pos.x, th.pos.z);
      if (range > RANGE * 0.97) continue;
      const az = Math.atan2(th.pos.x, th.pos.z);
      let sweepAz = ((this.sweep % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      let d = Math.abs(sweepAz - az);
      d = Math.min(d, Math.PI * 2 - d);
      if (d < this.sweepRate * dt * 1.5 + 0.06) {
        this.tracks.push({
          id: th.id, threat: th,
          est: th.pos.clone(), vel: th.vel.clone(),
          prev: th.pos.clone(),
          age: 0, quality: 0.2,
          classification: 'UNKNOWN',
          classifyAt: 5 + this.ctx.rng.range(0, 5),
          assignedBy: null,
          blipT: 1,
        });
        this.ctx.bus.emit('radar:newtrack', th.id);
        this.ctx.audio?.radarPing();
      }
    }

    // update tracks
    for (const t of this.tracks) {
      t.age += dt;
      t.quality = Math.min(1, t.quality + dt * 0.12);
      const k = 2 + t.quality * 9;
      const lerp = 1 - Math.exp(-dt * k);
      t.prev.copy(t.est);
      t.est.lerp(t.threat.pos, lerp);
      // derived velocity estimate
      t.vel.copy(t.est).sub(t.prev).divideScalar(Math.max(dt, 1e-4));
      // classification
      if (t.classification === 'UNKNOWN' && t.age > t.classifyAt) {
        t.classification = t.threat.isDecoy
          ? (this.ctx.rng.chance(0.8) ? 'DECOY PROBABLE' : 'BALLISTIC')
          : 'BALLISTIC';
      }
      // blip pulse when sweep passes
      const az = Math.atan2(t.est.x, t.est.z);
      let sweepAz = ((this.sweep % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      let d = Math.abs(sweepAz - az);
      d = Math.min(d, Math.PI * 2 - d);
      if (d < 0.05) t.blipT = 1;
      t.blipT = Math.max(0.35, t.blipT - dt * 0.5);
    }

    // remove dead threats -> tombstones
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const t = this.tracks[i];
      if (!t.threat.alive) {
        const kind = t.threat.result === 'intercepted' ? 'SPLASH'
          : t.threat.result === 'impact' ? 'IMPACT' : 'FADED';
        this.tombstones.push({ x: t.est.x, z: t.est.z, label: `${t.id} ${kind}`, age: 0, kind });
        if (this.selectedId === t.id) this.selectedId = null;
        this.tracks.splice(i, 1);
      }
    }
    for (let i = this.tombstones.length - 1; i >= 0; i--) {
      this.tombstones[i].age += dt;
      if (this.tombstones[i].age > 4) this.tombstones.splice(i, 1);
    }

    // redraw scope ~15 Hz
    this.drawTimer -= dt;
    if (this.drawTimer <= 0) {
      this.drawTimer = 1 / 15;
      this.draw();
      this.texture.needsUpdate = true;
    }
    this.statusTimer -= dt;
    if (this.statusTimer <= 0) {
      this.statusTimer = 0.4;
      this.drawStatus();
      this.statusTexture.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------ drawing
  draw() {
    const g = this.g, S = this.canvas.width, C = S / 2;
    const R = C - 20;
    g.clearRect(0, 0, S, S);

    // background
    let grad = g.createRadialGradient(C, C, 10, C, C, C);
    grad.addColorStop(0, '#07160d');
    grad.addColorStop(0.85, '#04110a');
    grad.addColorStop(1, '#020a06');
    g.fillStyle = grad;
    g.beginPath(); g.arc(C, C, C, 0, 7); g.fill();

    // range rings
    g.strokeStyle = 'rgba(90,200,130,0.22)';
    g.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      g.beginPath(); g.arc(C, C, (r / 4) * R, 0, 7); g.stroke();
    }
    g.fillStyle = 'rgba(90,200,130,0.45)';
    g.font = '11px monospace';
    for (let r = 1; r <= 4; r++) {
      g.fillText(`${r * 2}km`, C + (r / 4) * R * 0.707 + 4, C - (r / 4) * R * 0.707 + 12);
    }
    // cross lines
    g.strokeStyle = 'rgba(90,200,130,0.14)';
    g.beginPath();
    g.moveTo(C - R, C); g.lineTo(C + R, C);
    g.moveTo(C, C - R); g.lineTo(C, C + R);
    for (let a = Math.PI / 4; a < Math.PI * 2; a += Math.PI / 2) {
      g.moveTo(C, C); g.lineTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
    }
    g.stroke();
    // compass (world: -Z is north on screen-up)
    g.fillStyle = 'rgba(90,200,130,0.55)';
    g.font = '12px monospace';
    g.fillText('N', C - 4, C - R + 14);
    g.fillText('S', C - 4, C + R - 6);
    g.fillText('E', C + R - 14, C + 4);
    g.fillText('W', C - R + 7, C + 4);

    // receiver noise speckle
    g.fillStyle = 'rgba(110,255,160,0.10)';
    for (let i = 0; i < 42; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      g.fillRect(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 1.6, 1.6);
    }

    // sweep wedge with afterglow
    for (let i = 0; i < 24; i++) {
      const a = this.sweepScreenAngle(this.sweep) - i * 0.035;
      g.strokeStyle = `rgba(110,255,160,${0.30 * (1 - i / 24)})`;
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(C, C);
      g.lineTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
      g.stroke();
    }

    // base + batteries
    g.fillStyle = 'rgba(125,255,168,0.9)';
    g.fillRect(C - 3, C - 3, 6, 6);
    g.font = '10px monospace';
    const batIcons = [
      { x: -58, z: -40, l: 'P' }, { x: 52, z: 42, l: 'H' }, { x: -52, z: 58, l: 'S' },
    ];
    for (const b of batIcons) {
      const px = C + (b.x / RANGE) * R, py = C + (b.z / RANGE) * R;
      g.strokeStyle = 'rgba(125,255,168,0.7)';
      g.strokeRect(px - 3, py - 3 + 8, 6, 6); // offset so they don't overlap base square
    }

    // interceptors in flight
    for (const m of this.ctx.interceptors.list) {
      const px = C + (m.pos.x / RANGE) * R, py = C + (m.pos.z / RANGE) * R;
      g.fillStyle = 'rgba(125,255,168,0.95)';
      g.beginPath(); g.arc(px, py, 2.4, 0, 7); g.fill();
      if (m.target && m.target.alive) {
        const tx = C + (m.target.pos.x / RANGE) * R, ty = C + (m.target.pos.z / RANGE) * R;
        g.strokeStyle = 'rgba(125,255,168,0.3)';
        g.setLineDash([3, 4]);
        g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke();
        g.setLineDash([]);
      }
    }

    // tombstones
    for (const ts of this.tombstones) {
      const px = C + (ts.x / RANGE) * R, py = C + (ts.z / RANGE) * R;
      const a = 1 - ts.age / 4;
      g.strokeStyle = ts.kind === 'SPLASH' ? `rgba(125,255,168,${a})` : `rgba(255,90,82,${a})`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(px - 5, py - 5); g.lineTo(px + 5, py + 5);
      g.moveTo(px + 5, py - 5); g.lineTo(px - 5, py + 5);
      g.stroke();
      g.fillStyle = g.strokeStyle;
      g.font = '10px monospace';
      g.fillText(ts.label, px + 8, py + 3);
    }

    // tracks
    g.font = '11px monospace';
    for (const t of this.tracks) {
      const px = C + (t.est.x / RANGE) * R, py = C + (t.est.z / RANGE) * R;
      const isDecoyClass = t.classification === 'DECOY PROBABLE';
      const col = t.id === this.selectedId ? '255,255,255'
        : isDecoyClass ? '125,228,255' : '255,196,107';
      const alpha = 0.5 + 0.5 * t.blipT;

      // predicted impact point (game abstraction)
      if (!isDecoyClass && t.vel.lengthSq() > 1) {
        const g0 = 3.4;
        const a = 0.5 * g0, b = -t.vel.y, c = -t.est.y;
        const disc = b * b + 4 * a * c;
        if (disc > 0) {
          const tt = (b + Math.sqrt(disc)) / (2 * a);
          const ix = t.est.x + t.vel.x * tt, iz = t.est.z + t.vel.z * tt;
          const ipx = C + (ix / RANGE) * R, ipy = C + (iz / RANGE) * R;
          if (Math.hypot(ipx - C, ipy - C) < R) {
            g.strokeStyle = 'rgba(255,90,82,0.55)';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(ipx - 4, ipy - 4); g.lineTo(ipx + 4, ipy + 4);
            g.moveTo(ipx + 4, ipy - 4); g.lineTo(ipx - 4, ipy + 4);
            g.stroke();
            g.strokeStyle = 'rgba(255,90,82,0.2)';
            g.setLineDash([2, 5]);
            g.beginPath(); g.moveTo(px, py); g.lineTo(ipx, ipy); g.stroke();
            g.setLineDash([]);
          }
        }
      }

      // velocity vector (projects ~25 s ahead)
      g.strokeStyle = `rgba(${col},${alpha * 0.7})`;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + (t.vel.x * 25 / RANGE) * R, py + (t.vel.z * 25 / RANGE) * R);
      g.stroke();

      // blip triangle
      g.fillStyle = `rgba(${col},${alpha})`;
      g.beginPath();
      g.moveTo(px, py - 6); g.lineTo(px + 5.5, py + 4.5); g.lineTo(px - 5.5, py + 4.5);
      g.closePath(); g.fill();

      // decoy dash ring
      if (isDecoyClass) {
        g.strokeStyle = `rgba(125,228,255,${alpha})`;
        g.setLineDash([3, 3]);
        g.beginPath(); g.arc(px, py, 9, 0, 7); g.stroke();
        g.setLineDash([]);
      }
      // selection ring
      if (t.id === this.selectedId) {
        const pul = 10 + Math.sin(performance.now() * 0.008) * 2;
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(px, py, pul, 0, 7); g.stroke();
      }
      // assignment marker
      if (t.assignedBy) {
        g.strokeStyle = 'rgba(255,90,82,0.9)';
        g.lineWidth = 1.6;
        g.strokeRect(px - 9, py - 9, 18, 18);
      }
      // label
      g.fillStyle = `rgba(${col},${Math.min(1, alpha + 0.2)})`;
      g.fillText(`${t.id}`, px + 9, py - 4);
      g.fillStyle = `rgba(${col},${alpha * 0.75})`;
      g.font = '9px monospace';
      g.fillText(`${(t.est.y / 1000).toFixed(1)}km`, px + 9, py + 6);
      g.font = '11px monospace';
    }

    // bezel
    g.strokeStyle = 'rgba(125,255,168,0.5)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(C, C, R + 6, 0, 7); g.stroke();
    // header text
    g.fillStyle = 'rgba(125,255,168,0.8)';
    g.font = '12px monospace';
    g.fillText('LONGWATCH TACTICAL', 16, 20);
    g.fillText(`TRK ${this.tracks.length}`, S - 70, 20);
    const scen = this.ctx.threats.scenario;
    g.fillStyle = 'rgba(125,228,255,0.8)';
    g.fillText(scen ? scen.name : 'STANDBY', 16, S - 12);
  }

  sweepScreenAngle(a) {
    // world az (x east, z south) -> canvas angle
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  drawStatus() {
    const g = this.statusCanvas.getContext('2d');
    const W = 256, H = 192;
    g.fillStyle = '#051009'; g.fillRect(0, 0, W, H);
    g.font = '11px monospace';
    g.fillStyle = 'rgba(125,228,255,0.9)';
    g.fillText('BATTERY STATUS', 10, 18);
    let y = 40;
    for (const b of this.ctx.batteries.list) {
      const st = b.status();
      g.fillStyle = 'rgba(125,255,168,0.9)';
      g.fillText(st.short.padEnd(6), 10, y);
      const col = st.state === 'READY' ? 'rgba(125,255,168,0.9)'
        : st.state === 'EMPTY' ? 'rgba(255,90,82,0.9)' : 'rgba(255,196,107,0.9)';
      g.fillStyle = col;
      g.fillText(st.state.padEnd(10), 70, y);
      // ammo pips
      for (let i = 0; i < st.ammoMax; i++) {
        g.fillStyle = i < st.ammo ? 'rgba(125,255,168,0.9)' : 'rgba(125,255,168,0.15)';
        g.fillRect(160 + i * 10, y - 8, 7, 9);
      }
      y += 26;
    }
    g.fillStyle = 'rgba(90,200,130,0.5)';
    g.fillText(`TRACKS ${this.tracks.length}`, 10, y + 8);
    const blinkOn = Math.floor(performance.now() / 600) % 2 === 0;
    if (blinkOn) { g.fillStyle = 'rgba(125,255,168,0.9)'; g.fillText('_', 100, y + 8); }
  }

  _drawBaseMap() {
    const g = this.mapCanvas.getContext('2d');
    const W = 256, H = 192;
    g.fillStyle = '#051009'; g.fillRect(0, 0, W, H);
    const sx = (x) => W / 2 + x * 0.8;
    const sy = (z) => H / 2 + z * 0.62;
    g.strokeStyle = 'rgba(90,200,130,0.5)';
    g.strokeRect(sx(-128), sy(-108), 256 * 0.8, 216 * 0.62);
    g.strokeStyle = 'rgba(90,200,130,0.35)';
    g.beginPath(); g.moveTo(sx(0), sy(108)); g.lineTo(sx(0), sy(18)); g.stroke();
    const spots = [
      [-58, -40, 'A'], [52, 42, 'B'], [-52, 58, 'C'], [36, -12, 'R'], [-18, 8, 'CP'],
    ];
    g.font = '9px monospace';
    for (const [x, z, l] of spots) {
      g.strokeStyle = 'rgba(125,255,168,0.7)';
      g.strokeRect(sx(x) - 5, sy(z) - 5, 10, 10);
      g.fillStyle = 'rgba(125,255,168,0.8)';
      g.fillText(l, sx(x) + 8, sy(z) + 3);
    }
    g.fillStyle = 'rgba(125,228,255,0.8)';
    g.font = '10px monospace';
    g.fillText('SITE PLAN — COBALT MESA', 10, 14);
  }
}
