import * as THREE from 'three';
import { settings } from './settings.js';
import { clamp, saturate, lerp, bearingDeg, formatRange, wrapAngle } from './util/mathx.js';
import * as T from './util/textures.js';
import { timeToAltitude } from './physics.js';

/**
 * Search radar model and the stylised holographic display that sits on the
 * command console.
 *
 * Detection is a readable gameplay abstraction: the array sweeps a sector,
 * paints a threat, builds confidence over a short dwell, and promotes it to a
 * firm track. Classification of decoys takes longer, which is the whole tension
 * of the night scenario.
 */

export const TRACK_STATE = {
  SEARCH: 'SEARCH',
  ACQUIRING: 'ACQUIRING',
  TRACKED: 'TRACKED',
  LOST: 'LOST'
};

export const CLASSIFICATION = {
  UNKNOWN: 'UNKNOWN',
  BALLISTIC: 'BALLISTIC',
  DECOY: 'PROBABLE DECOY'
};

const _v = new THREE.Vector3();

let trackCounter = 1;

export class Track {
  constructor(threat) {
    this.threat = threat;
    this.id = threat.id;
    this.label = `TRK-${String(trackCounter++).padStart(3, '0')}`;
    this.state = TRACK_STATE.SEARCH;
    this.classification = CLASSIFICATION.UNKNOWN;
    this.confidence = 0;
    this.dwell = 0;
    this.age = 0;
    this.paintedAt = -1;
    this.assignedBattery = null;
    this.assignedShots = [];
    this.engaged = false;
    this.history = [];
    this.historyTimer = 0;
    this.resolved = null;
  }

  get alive() {
    return this.threat.alive;
  }

  get pos() {
    return this.threat.pos;
  }

  get vel() {
    return this.threat.vel;
  }

  get isFirm() {
    return this.state === TRACK_STATE.TRACKED;
  }
}

export class RadarSystem {
  constructor(base) {
    this.base = base;
    this.tracks = [];
    this.byThreat = new Map();
    this.time = 0;
    this.detectionRange = 78000;
    this.sectorHalfWidth = THREE.MathUtils.degToRad(58);
    this.selected = null;
    this.listeners = { detect: [], classify: [], lost: [] };
  }

  on(event, fn) {
    this.listeners[event]?.push(fn);
  }

  _emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload);
  }

  reset() {
    this.tracks.length = 0;
    this.byThreat.clear();
    this.selected = null;
  }

  /** Site position the radar measures from. */
  get origin() {
    return this.base.anchors.radar.pos;
  }

  update(dt, threats) {
    this.time += dt;
    const sweepAz = this.base.sweepAzimuth || 0;

    // Retire tracks whose threat has gone.
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      if (!tr.threat.alive) {
        if (tr.state !== TRACK_STATE.LOST) {
          tr.state = TRACK_STATE.LOST;
          this._emit('lost', tr);
        }
        tr.age += dt;
        // Keep the ghost on the display briefly so the player sees the result.
        if (tr.age > 4 && tr.lostAt === undefined) tr.lostAt = this.time;
        if (tr.lostAt !== undefined && this.time - tr.lostAt > 2) {
          this.byThreat.delete(tr.threat);
          if (this.selected === tr) this.selected = null;
          this.tracks.splice(i, 1);
        }
        continue;
      }
    }

    for (const threat of threats) {
      if (!threat.alive) continue;
      let tr = this.byThreat.get(threat);
      if (!tr) {
        tr = new Track(threat);
        this.byThreat.set(threat, tr);
        this.tracks.push(tr);
      }
      tr.age += dt;

      _v.copy(threat.pos).sub(this.origin);
      const range = _v.length();
      const az = Math.atan2(_v.x, -_v.z);
      const inRange = range < this.detectionRange;
      const beamDelta = Math.abs(wrapAngle(az - sweepAz));
      const painted = inRange && beamDelta < THREE.MathUtils.degToRad(11);

      if (painted) tr.paintedAt = this.time;
      const recentlyPainted = this.time - tr.paintedAt < 3.2;

      if (inRange && recentlyPainted) {
        tr.dwell += dt;
        tr.confidence = saturate(tr.confidence + dt * 0.85);
      } else {
        tr.confidence = saturate(tr.confidence - dt * 0.25);
      }

      const prevState = tr.state;
      if (tr.confidence > 0.62) tr.state = TRACK_STATE.TRACKED;
      else if (tr.confidence > 0.08) tr.state = TRACK_STATE.ACQUIRING;
      else tr.state = TRACK_STATE.SEARCH;

      if (prevState !== TRACK_STATE.TRACKED && tr.state === TRACK_STATE.TRACKED) {
        this._emit('detect', tr);
      }

      // Classification. Ballistic bodies are called quickly; discriminating a
      // decoy takes a longer look, which is the point of the night scenario.
      if (tr.state === TRACK_STATE.TRACKED) {
        if (tr.classification === CLASSIFICATION.UNKNOWN && tr.dwell > 2.4) {
          tr.classification = CLASSIFICATION.BALLISTIC;
          this._emit('classify', tr);
        }
        if (
          threat.isDecoy &&
          tr.classification !== CLASSIFICATION.DECOY &&
          tr.dwell > 8.5
        ) {
          tr.classification = CLASSIFICATION.DECOY;
          this._emit('classify', tr);
        }
      }

      // Position history for the display trail.
      tr.historyTimer -= dt;
      if (tr.historyTimer <= 0) {
        tr.historyTimer = 0.35;
        tr.history.push(threat.pos.clone());
        if (tr.history.length > 26) tr.history.shift();
      }
    }

    // Auto-select the highest priority firm track if nothing is selected.
    if (!this.selected || !this.selected.alive) {
      this.selected = this.priorityTrack();
    }
  }

  /** Firm tracks sorted by urgency (soonest impact first). */
  firmTracks() {
    return this.tracks.filter((t) => t.alive && t.state === TRACK_STATE.TRACKED);
  }

  priorityTrack() {
    const firm = this.firmTracks().filter((t) => !t.threat.isDecoy || t.classification !== CLASSIFICATION.DECOY);
    if (firm.length === 0) return null;
    firm.sort((a, b) => {
      const ea = a.engaged ? 1 : 0;
      const eb = b.engaged ? 1 : 0;
      if (ea !== eb) return ea - eb;
      return (a.threat.timeToImpact || 1e9) - (b.threat.timeToImpact || 1e9);
    });
    return firm[0];
  }

  select(track) {
    this.selected = track || null;
    return this.selected;
  }

  cycleSelection(dir = 1) {
    const firm = this.firmTracks();
    if (firm.length === 0) {
      this.selected = null;
      return null;
    }
    const i = firm.indexOf(this.selected);
    const n = (i + dir + firm.length) % firm.length;
    this.selected = firm[i < 0 ? 0 : n];
    return this.selected;
  }

  trackFor(threat) {
    return this.byThreat.get(threat) || null;
  }
}

/* ------------------------------------------------------------------ *
 * Holographic display
 * ------------------------------------------------------------------ */

const HOLO_RADIUS = 0.52;
const HOLO_HEIGHT = 0.42;
const HOLO_WORLD_RANGE = 62000;
const HOLO_WORLD_ALT = 26000;

function holoMaterial(color, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false
  });
}

function gridTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = 'rgba(120,240,215,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i <= 5; i++) {
    ctx.globalAlpha = i === 5 ? 0.95 : 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, (i / 5) * (size / 2 - 4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (size / 2 - 4), cy + Math.sin(a) * (size / 2 - 4));
    ctx.stroke();
  }
  // Range labels around the outer ring.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(150,255,225,0.9)';
  ctx.font = `bold ${Math.round(size * 0.032)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  for (let i = 1; i <= 5; i++) {
    const r = (i / 5) * (size / 2 - 4);
    ctx.fillText(`${Math.round((HOLO_WORLD_RANGE / 1000 / 5) * i)}`, cx + 4, cy - r + 14);
  }
  // Cardinal marks.
  ctx.font = `bold ${Math.round(size * 0.05)}px "Courier New", monospace`;
  ctx.fillText('N', cx, cy - (size / 2 - 16));
  ctx.fillText('S', cx, cy + (size / 2 - 6));
  ctx.fillText('E', cx + (size / 2 - 16), cy + 6);
  ctx.fillText('W', cx - (size / 2 - 16), cy + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture(text, color = '#8ff5d8') {
  const w = 256;
  const h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 6, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class HoloRadar {
  constructor(scene, anchor) {
    this.group = new THREE.Group();
    this.group.name = 'holo-radar';
    this.group.position.copy(anchor);
    scene.add(this.group);
    this.time = 0;
    this.visuals = new Map();
    this.labelCache = new Map();
    this.selectionRing = null;
    this._build();
  }

  _build() {
    // Base plate grid.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(HOLO_RADIUS, 64),
      new THREE.MeshBasicMaterial({
        map: gridTexture(512),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9,
        toneMapped: false,
        fog: false
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.002;
    this.group.add(disc);
    this.disc = disc;

    // Volume cage: rim torus plus vertical struts.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HOLO_RADIUS, 0.004, 6, 72), holoMaterial('#7ff2d0', 0.7));
    rim.rotation.x = Math.PI / 2;
    this.group.add(rim);
    const rimTop = rim.clone();
    rimTop.position.y = HOLO_HEIGHT;
    rimTop.material = holoMaterial('#4fd6b6', 0.28);
    this.group.add(rimTop);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, HOLO_HEIGHT, 4),
        holoMaterial('#4fd6b6', 0.18)
      );
      strut.position.set(Math.cos(a) * HOLO_RADIUS, HOLO_HEIGHT / 2, Math.sin(a) * HOLO_RADIUS);
      this.group.add(strut);
    }

    // Sweep wedge.
    const wedgeGeo = new THREE.CircleGeometry(HOLO_RADIUS * 0.99, 24, 0, Math.PI / 7);
    const wedgeMat = holoMaterial('#7ff2d0', 0.20);
    this.wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
    this.wedge.rotation.x = -Math.PI / 2;
    this.wedge.position.y = 0.004;
    this.group.add(this.wedge);

    // Site marker at the centre.
    const site = new THREE.Mesh(new THREE.OctahedronGeometry(0.016), holoMaterial('#d8fff2', 0.95));
    site.position.y = 0.016;
    this.group.add(site);
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.023, 32), holoMaterial('#7ff2d0', 0.6));
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.005;
    this.group.add(pulse);
    this.pulseRing = pulse;

    // Battery envelope dome (only the selected battery's is shown).
    this.envelope = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#5ad6ff',
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
        fog: false
      })
    );
    this.group.add(this.envelope);
    this.envelopeWire = new THREE.Mesh(
      new THREE.SphereGeometry(1, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#5ad6ff',
        transparent: true,
        opacity: 0.12,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
      })
    );
    this.group.add(this.envelopeWire);

    // Selection reticle.
    this.selectionRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0022, 6, 28), holoMaterial('#ffe066', 1));
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);

    // Pre-allocated interceptor markers.
    this.shotVisuals = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.009), holoMaterial('#9fe8ff', 0.95));
      m.visible = false;
      this.group.add(m);
      this.shotVisuals.push(m);
    }
  }

  /** Map a world position into holo space. */
  _toHolo(worldPos, out = new THREE.Vector3()) {
    const x = clamp(worldPos.x / HOLO_WORLD_RANGE, -1, 1) * HOLO_RADIUS;
    const z = clamp(worldPos.z / HOLO_WORLD_RANGE, -1, 1) * HOLO_RADIUS;
    const y = clamp(worldPos.y / HOLO_WORLD_ALT, 0, 1.2) * HOLO_HEIGHT;
    return out.set(x, y, z);
  }

  _visualFor(track) {
    let v = this.visuals.get(track);
    if (v) return v;
    const color = track.threat.isDecoy && track.classification === CLASSIFICATION.DECOY ? '#9fd0ff' : '#ff6a5a';
    const blip = new THREE.Mesh(new THREE.OctahedronGeometry(0.011), holoMaterial(color, 1));
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0012, 0.0012, 1, 4),
      holoMaterial(color, 0.35)
    );
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.008, 14), holoMaterial(color, 0.5));
    pad.rotation.x = -Math.PI / 2;

    // Track history polyline.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(26 * 3), 3));
    geo.setDrawRange(0, 0);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false
      })
    );

    let labelTex = this.labelCache.get(track.id);
    if (!labelTex) {
      labelTex = labelTexture(track.id);
      this.labelCache.set(track.id, labelTex);
    }
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
      })
    );
    label.scale.set(0.075, 0.019, 1);
    label.center.set(-0.1, 0.5);

    this.group.add(blip, stem, pad, line, label);
    v = { blip, stem, pad, line, label, color };
    this.visuals.set(track, v);
    return v;
  }

  _dispose(track) {
    const v = this.visuals.get(track);
    if (!v) return;
    for (const o of [v.blip, v.stem, v.pad, v.line, v.label]) {
      this.group.remove(o);
      o.material.dispose();
      o.geometry?.dispose?.();
    }
    this.visuals.delete(track);
  }

  update(dt, ctx) {
    this.time += dt;
    const { radar, base, batteries, interceptors } = ctx;

    // Sweep wedge follows the real array.
    if (this.wedge) {
      this.wedge.rotation.z = -(base.sweepAzimuth || 0) + Math.PI / 2 - Math.PI / 14;
      this.wedge.material.opacity = 0.14 + 0.09 * (0.5 + 0.5 * Math.sin(this.time * 6));
    }
    if (this.pulseRing) {
      const p = (this.time % 2.2) / 2.2;
      this.pulseRing.scale.setScalar(1 + p * 22);
      this.pulseRing.material.opacity = 0.55 * (1 - p);
    }

    // Envelope dome for the selected battery.
    const bat = batteries?.selected;
    if (bat) {
      const r = (bat.spec.envelope.maxRange / HOLO_WORLD_RANGE) * HOLO_RADIUS;
      const h = (bat.spec.envelope.maxAlt / HOLO_WORLD_ALT) * HOLO_HEIGHT;
      this.envelope.scale.set(r, Math.min(h, HOLO_HEIGHT * 1.15), r);
      this.envelopeWire.scale.copy(this.envelope.scale);
      this.envelope.material.color.set(bat.spec.accent);
      this.envelopeWire.material.color.set(bat.spec.accent);
    }

    // Track blips.
    const seen = new Set();
    for (const track of radar.tracks) {
      const v = this._visualFor(track);
      seen.add(track);
      const p = this._toHolo(track.pos, _v);
      const firm = track.state === TRACK_STATE.TRACKED;
      const dead = !track.alive;

      v.blip.position.copy(p);
      v.blip.rotation.y = this.time * 1.6;
      v.pad.position.set(p.x, 0.004, p.z);
      v.stem.position.set(p.x, p.y / 2, p.z);
      v.stem.scale.set(1, Math.max(0.001, p.y), 1);
      v.label.position.set(p.x, p.y + 0.012, p.z);

      const isDecoyKnown = track.classification === CLASSIFICATION.DECOY;
      const col = dead ? '#6a6f74' : isDecoyKnown ? '#9fd0ff' : track.engaged ? '#ffd24a' : '#ff6a5a';
      v.blip.material.color.set(col);
      v.pad.material.color.set(col);
      v.stem.material.color.set(col);
      v.line.material.color.set(col);

      const flicker = firm ? 1 : 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(this.time * 11 + track.age * 3));
      const vis = dead ? 0.25 : flicker;
      v.blip.material.opacity = vis;
      v.pad.material.opacity = vis * 0.55;
      v.stem.material.opacity = vis * 0.35;
      v.label.material.opacity = firm && !dead ? 0.95 : 0.3;
      v.blip.scale.setScalar(firm ? 1.25 : 0.85);

      // History trail.
      const arr = v.line.geometry.attributes.position.array;
      const n = Math.min(track.history.length, 26);
      for (let i = 0; i < n; i++) {
        const hp = this._toHolo(track.history[i], _v);
        arr[i * 3] = hp.x;
        arr[i * 3 + 1] = hp.y;
        arr[i * 3 + 2] = hp.z;
      }
      v.line.geometry.attributes.position.needsUpdate = true;
      v.line.geometry.setDrawRange(0, n);
      v.line.material.opacity = dead ? 0.12 : 0.42;
    }
    for (const track of Array.from(this.visuals.keys())) {
      if (!seen.has(track)) this._dispose(track);
    }

    // Selection reticle.
    if (radar.selected && radar.selected.alive) {
      const p = this._toHolo(radar.selected.pos, _v);
      this.selectionRing.visible = true;
      this.selectionRing.position.copy(p);
      this.selectionRing.rotation.set(Math.PI / 2, 0, this.time * 1.1);
      const s = 1 + 0.12 * Math.sin(this.time * 5);
      this.selectionRing.scale.setScalar(s);
    } else {
      this.selectionRing.visible = false;
    }

    // Interceptors in flight.
    const shots = interceptors?.active || [];
    for (let i = 0; i < this.shotVisuals.length; i++) {
      const m = this.shotVisuals[i];
      const shot = shots[i];
      if (!shot) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.copy(this._toHolo(shot.pos, _v));
      m.rotation.set(this.time * 3, this.time * 2, 0);
      m.material.color.set(shot.spec.accent);
    }
  }

  /** Raycast helper: returns the track under a ray, if any. */
  pick(raycaster, radar) {
    let best = null;
    let bestDist = Infinity;
    for (const [track, v] of this.visuals) {
      if (!track.alive) continue;
      const worldPos = v.blip.getWorldPosition(_v);
      const d = raycaster.ray.distanceToPoint(worldPos);
      const along = raycaster.ray.origin.distanceTo(worldPos);
      // Generous pick radius that grows with distance, so blips stay clickable.
      if (d < 0.016 + along * 0.012 && along < bestDist) {
        best = track;
        bestDist = along;
      }
    }
    void radar;
    return best;
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
