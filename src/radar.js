// Radar model + the physical command console: a rotating-beam detection model
// that builds tracks, a canvas PPI scope, a stylised holographic 3D track
// volume, and clickable console controls.

import * as THREE from 'three';
import { RADAR, BATTERIES, BATTERY_BY_ID, SCENARIOS, TOD, WORLD } from './config.js';
import { bus, state, BATTERY_STATE } from './state.js';
import { materials, std, lamp, applyAtmosphere } from './util/materials.js';
import { chamferBox, mergeParts, transform, cylinder, greebleField, pathTube } from './util/geom.js';
import { CanvasSurface, softSprite, stencilDecal } from './util/textures.js';
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

/* --------------------------------------------------------------- PPI scope */

export class ScopeRenderer {
  constructor(size = 512) {
    this.surface = new CanvasSurface(size, size, { srgb: true });
    this.size = size;
    this.accum = 0;
    this.trailAngles = [];
  }

  get texture() {
    return this.surface.texture;
  }

  draw(radar, opts = {}) {
    const { ctx, w, h } = { ctx: this.surface.ctx, w: this.surface.w, h: this.surface.h };
    const cx = w / 2;
    const cy = h / 2;
    const R = w * 0.46;
    const scale = R / RADAR.range;
    const accent = opts.accent || '#5fd0ff';
    const selected = opts.selectedTrackId;
    const assigned = opts.assignedTrackId;

    ctx.fillStyle = 'rgba(2, 10, 12, 1)';
    ctx.fillRect(0, 0, w, h);

    // phosphor grid
    ctx.strokeStyle = 'rgba(70,170,150,0.24)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
    }
    ctx.stroke();

    ctx.font = `${Math.round(w * 0.026)}px "Roboto Mono", ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(120,220,200,0.7)';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
      ctx.fillText(`${Math.round((RADAR.range * i) / 4 / 1000)}km`, cx, cy - (R * i) / 4 + w * 0.03);
    }
    for (const [label, a] of [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]]) {
      ctx.fillStyle = 'rgba(150,240,220,0.85)';
      ctx.fillText(label, cx + Math.sin(a) * (R + w * 0.028), cy - Math.cos(a) * (R + w * 0.028) + w * 0.01);
    }

    // sweep with a decaying tail
    const ang = radar.angle;
    const grad = ctx.createConicGradient ? null : null;
    for (let i = 0; i < 26; i++) {
      const a = ang - i * 0.045;
      const alpha = (1 - i / 26) * 0.16;
      ctx.strokeStyle = `rgba(120,255,210,${alpha})`;
      ctx.lineWidth = w * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(190,255,235,0.95)';
    ctx.lineWidth = w * 0.006;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(ang) * R, cy - Math.cos(ang) * R);
    ctx.stroke();

    // own site
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.012, 0, Math.PI * 2);
    ctx.fill();

    // battery baskets
    for (const b of BATTERIES) {
      const rr = b.windowRange[1] * scale;
      ctx.strokeStyle = b.id === opts.selectedBatteryId ? `${b.accent}88` : `${b.accent}33`;
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = b.id === opts.selectedBatteryId ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(R, rr), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // tracks
    this.hitTargets = [];
    for (const tr of radar.tracks) {
      const x = cx + tr.pos.x * scale;
      const y = cy + tr.pos.z * scale;
      const isSel = tr.id === selected;
      const isAssigned = tr.id === assigned;
      const decoy = tr.classified.includes('DECOY');
      const col = !tr.firm ? 'rgba(190,190,120,0.8)' : decoy ? 'rgba(150,210,255,0.95)' : 'rgba(255,120,90,0.98)';
      // velocity leader
      const lx = x + tr.vel.x * 12 * scale;
      const ly = y + tr.vel.z * 12 * scale;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      ctx.fillStyle = col;
      if (tr.firm) {
        ctx.beginPath();
        ctx.arc(x, y, w * 0.011, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, w * 0.008, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (isSel) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        const s = w * 0.026;
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);
      }
      if (isAssigned) {
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, w * 0.032, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = `${Math.round(w * 0.024)}px "Roboto Mono", ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = tr.firm ? '#d8fff0' : 'rgba(216,255,240,0.6)';
      ctx.fillText(`${tr.id}`, x + w * 0.018, y - w * 0.008);
      ctx.fillStyle = 'rgba(160,230,210,0.8)';
      ctx.fillText(`${Math.round(tr.alt / 100) / 10}km`, x + w * 0.018, y + w * 0.02);
      this.hitTargets.push({ id: tr.id, x: x / w, y: y / h, r: 0.05 });
    }

    // interceptors
    for (const m of opts.interceptors || []) {
      const x = cx + m.pos.x * scale;
      const y = cy + m.pos.z * scale;
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.012);
      ctx.lineTo(x + w * 0.009, y + w * 0.008);
      ctx.lineTo(x - w * 0.009, y + w * 0.008);
      ctx.closePath();
      ctx.fill();
    }

    // header / footer readouts
    ctx.textAlign = 'left';
    ctx.font = `${Math.round(w * 0.028)}px "Roboto Mono", ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(150,250,220,0.9)';
    ctx.fillText(`PPI · SURV`, w * 0.03, h * 0.055);
    ctx.textAlign = 'right';
    ctx.fillText(`TRK ${radar.tracks.length}`, w * 0.97, h * 0.055);
    ctx.textAlign = 'left';
    ctx.fillText(`${opts.mode || 'AUTO SEARCH'}`, w * 0.03, h * 0.975);
    ctx.textAlign = 'right';
    ctx.fillText(`${(RADAR.rpm).toFixed(1)} RPM`, w * 0.97, h * 0.975);

    // scanline sheen
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#a8ffe6';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;

    this.surface.commit();
  }
}

/* -------------------------------------------------------- status text panel */

export class StatusPanelRenderer {
  constructor(w = 512, h = 320) {
    this.surface = new CanvasSurface(w, h);
  }

  get texture() {
    return this.surface.texture;
  }

  draw(opts) {
    const ctx = this.surface.ctx;
    const w = this.surface.w;
    const h = this.surface.h;
    ctx.fillStyle = '#04100e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(90,220,190,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.font = `bold ${Math.round(h * 0.075)}px "Roboto Mono", ui-monospace, monospace`;
    ctx.fillStyle = '#8effd8';
    ctx.fillText('BATTERY STATUS', 18, h * 0.13);
    ctx.font = `${Math.round(h * 0.062)}px "Roboto Mono", ui-monospace, monospace`;
    let y = h * 0.26;
    for (const b of BATTERIES) {
      const st = state.batteries[b.id];
      const sel = b.id === opts.selectedBatteryId;
      ctx.fillStyle = sel ? '#ffffff' : b.accent;
      ctx.fillText(`${sel ? '>' : ' '}${b.short.padEnd(9)}`, 18, y);
      const label =
        st.state === BATTERY_STATE.RELOAD ? `RELOAD ${st.timer.toFixed(1)}s` :
        st.state === BATTERY_STATE.PREP ? `PREP ${st.timer.toFixed(1)}s` :
        st.state;
      ctx.fillStyle =
        st.state === BATTERY_STATE.READY ? '#6dffa8' :
        st.state === BATTERY_STATE.EXPENDED ? '#ff6b5a' : '#ffd23f';
      ctx.fillText(label, w * 0.44, y);
      ctx.fillStyle = '#cfeee6';
      ctx.fillText(`${st.ammo}/${b.ammo}`, w * 0.84, y);
      y += h * 0.1;
    }
    y += h * 0.02;
    ctx.fillStyle = 'rgba(90,220,190,0.35)';
    ctx.fillRect(18, y - h * 0.05, w - 36, 2);
    ctx.font = `${Math.round(h * 0.058)}px "Roboto Mono", ui-monospace, monospace`;
    ctx.fillStyle = '#8effd8';
    ctx.fillText(`SEL TRACK  ${opts.selectedTrackId || '----'}`, 18, y + h * 0.05);
    ctx.fillText(`ASSIGNED   ${opts.assignedTrackId || '----'}`, 18, y + h * 0.14);
    ctx.fillText(`IN FLIGHT  ${state.stats.inFlight}`, 18, y + h * 0.23);
    ctx.fillText(`ACTIVE     ${state.stats.active}`, 18, y + h * 0.32);
    this.surface.commit();
  }
}

/* ------------------------------------------------------------ 3D holo track */

const HOLO_GRID_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length( p );
  if ( r > 1.0 ) discard;
  float rings = smoothstep( 0.02, 0.0, abs( fract( r * 5.0 ) - 0.5 ) - 0.44 );
  float ang = atan( p.y, p.x );
  float spokes = smoothstep( 0.03, 0.0, abs( fract( ang / 3.14159 * 6.0 ) - 0.5 ) - 0.47 );
  float sweep = pow( max( 0.0, cos( ang - uTime * 0.9 ) ), 26.0 ) * 0.7;
  float edge = smoothstep( 1.0, 0.94, r ) * 0.25;
  float a = ( rings * 0.5 + spokes * 0.35 + sweep + edge ) * ( 1.0 - r * 0.35 );
  gl_FragColor = vec4( uColor * ( 0.7 + a ), a * 0.95 );
}
`;

const HOLO_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

export class HoloDisplay {
  constructor(radius = 0.62, height = 0.42) {
    this.group = new THREE.Group();
    this.radius = radius;
    this.height = height;
    this.rangeScale = radius / RADAR.range;
    this.altScale = height / 26000;

    this.gridMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x53e0c8) } },
      vertexShader: HOLO_VERT,
      fragmentShader: HOLO_GRID_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), this.gridMat);
    plane.rotation.x = -Math.PI / 2;
    this.group.add(plane);

    // stem lines + blips, pooled
    this.maxTracks = 10;
    this.blips = [];
    const blipGeo = new THREE.OctahedronGeometry(0.018, 0);
    const stemGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 5, 1, true);
    stemGeo.translate(0, 0.5, 0);
    for (let i = 0; i < this.maxTracks; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const blip = new THREE.Mesh(blipGeo, mat);
      const stem = new THREE.Mesh(stemGeo, mat.clone());
      stem.material.opacity = 0.35;
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.038, 20), ringMat);
      ring.rotation.x = -Math.PI / 2;
      const label = new CanvasSurface(256, 64);
      const labelMat = new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), labelMat);
      const item = { blip, stem, ring, label, labelMesh, trackId: null };
      blip.visible = false;
      stem.visible = false;
      ring.visible = false;
      labelMesh.visible = false;
      this.group.add(blip, stem, ring, labelMesh);
      this.blips.push(item);
    }
    // interceptor markers
    this.interMarks = [];
    const iGeo = new THREE.ConeGeometry(0.012, 0.034, 6);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(iGeo, new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.visible = false;
      this.group.add(m);
      this.interMarks.push(m);
    }
  }

  update(dt, radar, camera, opts) {
    this.gridMat.uniforms.uTime.value += dt;
    const tracks = radar.tracks.slice(0, this.maxTracks);
    for (let i = 0; i < this.blips.length; i++) {
      const item = this.blips[i];
      const tr = tracks[i];
      if (!tr) {
        item.blip.visible = false;
        item.stem.visible = false;
        item.ring.visible = false;
        item.labelMesh.visible = false;
        item.trackId = null;
        continue;
      }
      const x = tr.pos.x * this.rangeScale;
      const z = tr.pos.z * this.rangeScale;
      const y = Math.max(0.004, Math.min(this.height, tr.alt * this.altScale));
      item.blip.position.set(x, y, z);
      item.blip.visible = true;
      item.stem.position.set(x, 0, z);
      item.stem.scale.set(1, y, 1);
      item.stem.visible = true;
      item.ring.position.set(x, 0.003, z);
      const decoy = tr.classified.includes('DECOY');
      const col = !tr.firm ? 0xd8d060 : decoy ? 0x8ecbff : 0xff6a4a;
      item.blip.material.color.setHex(col);
      item.stem.material.color.setHex(col);
      const sel = tr.id === opts.selectedTrackId;
      const assigned = tr.id === opts.assignedTrackId;
      item.ring.visible = sel || assigned;
      item.ring.material.color.setHex(assigned ? 0xffd23f : 0xffffff);
      item.ring.material.opacity = sel || assigned ? 0.9 : 0;
      item.blip.rotation.y += dt * 2.4;
      item.blip.scale.setScalar(sel ? 1.55 : 1);
      if (item.trackId !== tr.id || (opts.frame || 0) % 12 === 0) {
        item.trackId = tr.id;
        const c = item.label.ctx;
        c.clearRect(0, 0, 256, 64);
        c.font = 'bold 30px "Roboto Mono", ui-monospace, monospace';
        c.fillStyle = tr.firm ? '#d8fff0' : '#e8e2a0';
        c.fillText(tr.id, 6, 28);
        c.font = '22px "Roboto Mono", ui-monospace, monospace';
        c.fillStyle = '#9fe8d8';
        c.fillText(`${(tr.alt / 1000).toFixed(1)}km ${Math.round(tr.speed)}m/s`, 6, 56);
        item.label.commit();
      }
      item.labelMesh.visible = true;
      item.labelMesh.position.set(x, y + 0.04, z);
      item.labelMesh.quaternion.copy(camera.quaternion);
      const parentQ = new THREE.Quaternion();
      this.group.getWorldQuaternion(parentQ);
      item.labelMesh.quaternion.premultiply(parentQ.invert());
    }
    const inters = opts.interceptors || [];
    for (let i = 0; i < this.interMarks.length; i++) {
      const m = this.interMarks[i];
      const it = inters[i];
      if (!it) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(it.pos.x * this.rangeScale, Math.max(0.004, it.pos.y * this.altScale), it.pos.z * this.rangeScale);
      const dir = it.vel.clone().normalize();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
  }
}

/* ------------------------------------------------------------- console rig */

const BUTTON_SPECS = [
  { id: 'START', label: 'START\nBALLISTIC\nMISSILES', color: 0xff3b2f, w: 0.34, h: 0.2, big: true },
  { id: 'ASSIGN', label: 'ASSIGN', color: 0xffc832, w: 0.26, h: 0.14 },
  { id: 'AUTHORIZE', label: 'AUTHORIZE\nLAUNCH', color: 0x35ff8a, w: 0.3, h: 0.16 },
  { id: 'NEXT_TRACK', label: 'NEXT\nTRACK', color: 0x5fd0ff, w: 0.2, h: 0.12 },
  { id: 'BAT_PATRIOT', label: 'TERMINAL', color: 0x5fd0ff, w: 0.22, h: 0.1 },
  { id: 'BAT_THAAD', label: 'HI-ALT', color: 0xffc46b, w: 0.22, h: 0.1 },
  { id: 'BAT_SENTINEL', label: 'SENTINEL', color: 0xff7de3, w: 0.22, h: 0.1 },
  { id: 'SCN_SINGLE', label: 'SINGLE', color: 0xb9c4cc, w: 0.2, h: 0.09 },
  { id: 'SCN_SATURATION', label: 'SATURATION', color: 0xb9c4cc, w: 0.2, h: 0.09 },
  { id: 'SCN_NIGHT_RAID', label: 'NIGHT RAID', color: 0xb9c4cc, w: 0.2, h: 0.09 },
  { id: 'TOD_day', label: 'DAY', color: 0xffe9b0, w: 0.16, h: 0.08 },
  { id: 'TOD_sunset', label: 'SUNSET', color: 0xffa060, w: 0.16, h: 0.08 },
  { id: 'TOD_night', label: 'NIGHT', color: 0x88a0ff, w: 0.16, h: 0.08 },
];

function buttonTexture(label, color) {
  const s = new CanvasSurface(256, 128);
  const ctx = s.ctx;
  ctx.fillStyle = '#0d1114';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`;
  const lines = label.split('\n');
  const fs = lines.length > 2 ? 30 : lines.length > 1 ? 36 : 44;
  ctx.font = `bold ${fs}px "Roboto Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, 128, 64 + (i - (lines.length - 1) / 2) * (fs + 4)));
  s.commit();
  return s;
}

export class ConsoleRig {
  constructor(scene, anchor, yaw) {
    this.group = new THREE.Group();
    this.group.position.copy(anchor);
    this.group.rotation.y = yaw;
    scene.add(this.group);
    const mats = materials();

    // ---- desk ---------------------------------------------------------
    const dparts = [];
    dparts.push({ geometry: chamferBox(2.6, 0.1, 1.0, 0.03), matrix: transform({ pos: [0, 0.86, 0] }) });
    dparts.push({ geometry: chamferBox(2.6, 0.86, 0.12, 0.03), matrix: transform({ pos: [0, 0.43, 0.44] }) });
    dparts.push({ geometry: chamferBox(0.14, 0.86, 0.9, 0.03), matrix: transform({ pos: [-1.23, 0.43, 0] }) });
    dparts.push({ geometry: chamferBox(0.14, 0.86, 0.9, 0.03), matrix: transform({ pos: [1.23, 0.43, 0] }) });
    dparts.push({ geometry: chamferBox(2.3, 0.5, 0.1, 0.02), matrix: transform({ pos: [0, 0.4, -0.36] }) });
    const desk = new THREE.Mesh(mergeParts(dparts), mats.darkMetal);
    desk.castShadow = true;
    desk.receiveShadow = true;
    this.group.add(desk);
    dparts.forEach((p) => p.geometry.dispose());

    // sloped control surface
    this.panelNode = new THREE.Group();
    this.panelNode.position.set(0, 0.9, 0.06);
    this.panelNode.rotation.x = -0.34;
    this.group.add(this.panelNode);
    const panelBase = new THREE.Mesh(chamferBox(2.5, 0.72, 0.06, 0.02), mats.darkMetal);
    panelBase.receiveShadow = true;
    this.panelNode.add(panelBase);

    // ---- screens ------------------------------------------------------
    this.scope = new ScopeRenderer(512);
    const scopeMat = new THREE.MeshBasicMaterial({ map: this.scope.texture, toneMapped: false });
    this.scopeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), scopeMat);
    this.scopeMesh.position.set(-0.72, 0.52, -0.16);
    this.scopeMesh.rotation.x = -0.22;
    this.group.add(this.scopeMesh);
    // bezel
    const bezel = new THREE.Mesh(chamferBox(0.72, 0.72, 0.06, 0.02), mats.darkMetal);
    bezel.position.copy(this.scopeMesh.position).add(new THREE.Vector3(0, 0, -0.035));
    bezel.rotation.copy(this.scopeMesh.rotation);
    bezel.castShadow = true;
    this.group.add(bezel);
    this.scopeMesh.position.y = 0.52;

    this.status = new StatusPanelRenderer(512, 320);
    const statusMat = new THREE.MeshBasicMaterial({ map: this.status.texture, toneMapped: false });
    this.statusMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.35), statusMat);
    this.statusMesh.position.set(0.76, 0.56, -0.16);
    this.statusMesh.rotation.x = -0.22;
    this.group.add(this.statusMesh);
    const bezel2 = new THREE.Mesh(chamferBox(0.64, 0.43, 0.06, 0.02), mats.darkMetal);
    bezel2.position.copy(this.statusMesh.position).add(new THREE.Vector3(0, 0, -0.035));
    bezel2.rotation.copy(this.statusMesh.rotation);
    bezel2.castShadow = true;
    this.group.add(bezel2);

    // ---- holo volume --------------------------------------------------
    this.holo = new HoloDisplay(0.5, 0.36);
    this.holo.group.position.set(0, 1.0, -0.05);
    this.group.add(this.holo.group);
    const holoRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 40), mats.steel);
    holoRim.rotation.x = Math.PI / 2;
    holoRim.position.set(0, 0.965, -0.05);
    this.group.add(holoRim);
    const holoGlow = new THREE.PointLight(0x4fe0c8, 1.6, 4, 2);
    holoGlow.position.set(0, 1.1, -0.05);
    this.group.add(holoGlow);

    // ---- buttons ------------------------------------------------------
    this.buttons = [];
    const layout = [
      ['START', -0.9, 0.2],
      ['ASSIGN', -0.28, 0.2],
      ['AUTHORIZE', 0.14, 0.2],
      ['NEXT_TRACK', 0.6, 0.2],
      ['BAT_PATRIOT', -0.86, -0.02],
      ['BAT_THAAD', -0.6, -0.02],
      ['BAT_SENTINEL', -0.34, -0.02],
      ['SCN_SINGLE', 0.0, -0.02],
      ['SCN_SATURATION', 0.24, -0.02],
      ['SCN_NIGHT_RAID', 0.48, -0.02],
      ['TOD_day', 0.72, -0.02],
      ['TOD_sunset', 0.72, -0.16],
      ['TOD_night', 0.9, -0.16],
    ];
    const specById = Object.fromEntries(BUTTON_SPECS.map((s) => [s.id, s]));
    for (const [id, x, y] of layout) {
      const spec = specById[id];
      const surf = buttonTexture(spec.label, spec.color);
      const mat = new THREE.MeshBasicMaterial({ map: surf.texture, toneMapped: false });
      const mesh = new THREE.Mesh(chamferBox(spec.w, spec.h, 0.035, 0.008), mats.plastic);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(spec.w * 0.94, spec.h * 0.9), mat);
      face.position.z = 0.019;
      mesh.add(face);
      mesh.position.set(x, y, 0.05);
      mesh.userData.buttonId = id;
      mesh.userData.baseZ = 0.05;
      mesh.userData.surface = surf;
      mesh.userData.spec = spec;
      this.panelNode.add(mesh);
      this.buttons.push(mesh);
    }

    // guard cover over the launch authorise button
    const guard = new THREE.Mesh(chamferBox(0.34, 0.03, 0.12, 0.01), mats.steel);
    guard.position.set(0.14, 0.32, 0.1);
    guard.rotation.x = -1.1;
    this.panelNode.add(guard);

    // small greeble strip + labels
    const greeble = new THREE.Mesh(greebleField(2.3, 0.12, { range: (a, b) => a + (b - a) * Math.random(), next: Math.random }, { count: 16, maxSize: 0.07, depth: 0.02 }), mats.steel);
    greeble.position.set(0, -0.3, 0.04);
    this.panelNode.add(greeble);

    // operator chair hint + cable
    const cable = new THREE.Mesh(pathTube([new THREE.Vector3(-1.2, 0.1, 0.3), new THREE.Vector3(-1.6, 0.06, 0.9), new THREE.Vector3(-2.2, 0.06, 1.4)], 0.03, 5), std({ color: 0x141414, roughness: 0.9 }));
    this.group.add(cable);

    this.group.userData.colliders = [{ type: 'box', pos: [0, 0.5, 0.1], half: [1.35, 0.5, 0.6], walkable: false }];

    // Camera dock pose: standing behind the console looking down at the scope
    // and holo volume, with the shelter opening beyond.
    this.dockPose = {
      pos: new THREE.Vector3(0, 1.62, 1.15).applyEuler(this.group.rotation).add(this.group.position),
      yaw,
      pitch: -0.5,
    };
    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
  }

  /** Ray from screen centre; returns { buttonId } or { trackId }. */
  pick(camera, radar) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hitsB = this.raycaster.intersectObjects(this.buttons, true);
    if (hitsB.length) {
      let o = hitsB[0].object;
      while (o && !o.userData.buttonId) o = o.parent;
      if (o) return { buttonId: o.userData.buttonId, point: hitsB[0].point };
    }
    const blips = this.holo.blips.filter((b) => b.blip.visible).map((b) => b.blip);
    const hitsT = this.raycaster.intersectObjects(blips, false);
    if (hitsT.length) {
      const idx = this.holo.blips.findIndex((b) => b.blip === hitsT[0].object);
      const tr = radar.tracks[idx];
      if (tr) return { trackId: tr.id, point: hitsT[0].point };
    }
    // Scope surface: map the UV hit back to a track.
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
    for (const b of this.buttons) {
      const on = b.userData.buttonId === buttonId;
      b.position.z = b.userData.baseZ + (on ? 0.012 : 0);
      b.children[0].material.color.setScalar(on ? 1.6 : 1);
    }
    this.hovered = buttonId;
  }

  press(buttonId) {
    const b = this.buttons.find((x) => x.userData.buttonId === buttonId);
    if (b) b.position.z = b.userData.baseZ - 0.012;
  }

  setActive(map) {
    for (const b of this.buttons) {
      const id = b.userData.buttonId;
      const active = !!map[id];
      const spec = b.userData.spec;
      b.children[0].material.color.setScalar(active ? 2.0 : this.hovered === id ? 1.6 : 1);
      b.scale.setScalar(active ? 1.04 : 1);
    }
  }

  update(dt, radar, camera, opts) {
    this.scopeTick = (this.scopeTick || 0) + dt;
    if (this.scopeTick > 1 / 24) {
      this.scopeTick = 0;
      this.scope.draw(radar, opts);
      this.status.draw(opts);
    }
    this.holo.update(dt, radar, camera, opts);
  }
}
