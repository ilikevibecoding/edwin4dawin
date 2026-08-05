// Fictional radar: sweep-gated detection, track confirmation, decoy
// discrimination, impact prediction — plus the in-shelter 3D holographic
// display (clickable blips) and the small PPI screens on the console desk.
import * as THREE from 'three';
import { RADAR, COLORS } from './constants.js';
import { predictImpact } from './physics.js';

const _v = new THREE.Vector3();

const HOLO_SCALE = 1.05 / RADAR.range;      // world m → table m
const ALT_SCALE = HOLO_SCALE * 1.15;        // slight vertical exaggeration

class HoloBlip {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.visible = false;
    parent.add(this.group);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xff5f4e, toneMapped: false, transparent: true, opacity: 0.95 });
    this.marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.02), this.mat);
    this.group.add(this.marker);
    // stem to the deck
    this.stemMat = new THREE.LineBasicMaterial({ color: 0xff5f4e, transparent: true, opacity: 0.4 });
    const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)]);
    this.stem = new THREE.Line(stemGeo, this.stemMat);
    this.group.add(this.stem);
    // predicted impact marker on deck
    this.impactMat = new THREE.MeshBasicMaterial({ color: 0xff5f4e, toneMapped: false, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    this.impact = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.02, 12), this.impactMat);
    this.impact.rotation.x = -Math.PI / 2;
    parent.add(this.impact);
    this.impact.visible = false;
    // selection ring
    this.selRing = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.037, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    this.selRing.visible = false;
    this.group.add(this.selRing);
    // id label
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 96; this.labelCanvas.height = 28;
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas);
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthWrite: false }));
    this.label.scale.set(0.11, 0.032, 1);
    this.label.position.y = 0.035;
    this.group.add(this.label);
    // pick proxy
    this.pick = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(this.pick);
    this.track = null;
  }

  setLabel(text, color) {
    const g = this.labelCanvas.getContext('2d');
    g.clearRect(0, 0, 96, 28);
    g.font = 'bold 17px monospace';
    g.fillStyle = color;
    g.textAlign = 'center';
    g.fillText(text, 48, 20);
    this.labelTex.needsUpdate = true;
  }
}

export class Radar {
  constructor({ scene, events, rng, base, threats }) {
    this.events = events;
    this.rng = rng.fork(23);
    this.base = base;
    this.threats = threats;
    this.sweep = 0;
    this.tracks = [];          // live track objects
    this.nextTrackNum = 1;
    this.selection = null;     // selected track or null
    this.time = 0;
    this._screenTimer = 0;

    this._buildHolo(base.holoAnchor);

    events.on('threat-impact', ({ threat }) => this._closeTrack(threat, 'IMPACT'));
    events.on('threat-burnout', ({ threat }) => this._closeTrack(threat, 'BURNOUT'));
    events.on('intercept-hit', ({ threat }) => this._closeTrack(threat, 'KILLED'));
  }

  reset() {
    for (const t of this.tracks) this._freeBlip(t);
    this.tracks = [];
    this.nextTrackNum = 1;
    this.selection = null;
  }

  // ------------------------------------------------------------- tracks --
  _trackFor(threat) { return this.tracks.find(t => t.threat === threat && !t.closed); }

  getTrackById(id) { return this.tracks.find(t => t.id === id && !t.closed); }

  get liveTracks() { return this.tracks.filter(t => !t.closed); }

  _closeTrack(threat, why) {
    const t = this._trackFor(threat);
    if (!t) return;
    t.closed = true;
    t.closeReason = why;
    t.closeTime = this.time;
    if (this.selection === t) this.selection = null;
    this._freeBlip(t);
    this.events.emit('track-dropped', { track: t, why });
  }

  _freeBlip(t) {
    if (t.blip) {
      t.blip.group.visible = false;
      t.blip.impact.visible = false;
      t.blip.track = null;
      t.blip = null;
    }
  }

  update(dt) {
    this.time += dt;
    const prevSweep = this.sweep;
    this.sweep = (this.sweep + (Math.PI * 2 / RADAR.sweepPeriod) * dt) % (Math.PI * 2);
    this.base.setRadarAzimuth(this.sweep + 0.6);

    // detection: sweep must cross the threat azimuth while inside range
    for (const threat of this.threats.active) {
      if (this._trackFor(threat)) continue;
      const range = threat.pos.length();
      if (range > RADAR.range) continue;
      const az = (Math.atan2(threat.pos.z, threat.pos.x) + Math.PI * 2) % (Math.PI * 2);
      const crossed = prevSweep <= this.sweep
        ? (az > prevSweep && az <= this.sweep)
        : (az > prevSweep || az <= this.sweep);
      if (!crossed) continue;
      const track = {
        id: `TRK-${String(this.nextTrackNum++).padStart(2, '0')}`,
        threat,
        state: 'DETECT',
        classification: 'AMBIG',
        firstSeen: this.time,
        estPos: threat.pos.clone(),
        estVel: threat.vel.clone(),
        impactPred: new THREE.Vector3(),
        hasImpactPred: false,
        closed: false,
        assignedBattery: null,
        engaged: false,
        blip: null,
      };
      this.tracks.push(track);
      this.events.emit('track-new', { track });
    }

    // update live tracks
    for (const t of this.tracks) {
      if (t.closed) continue;
      const th = t.threat;
      if (!th.active) { this._closeTrack(th, 'LOST'); continue; }
      // smoothed estimate (slight sensor lag)
      t.estPos.lerp(th.pos, Math.min(1, dt * 3.2));
      t.estVel.lerp(th.vel, Math.min(1, dt * 2.2));
      if (t.state === 'DETECT' && this.time - t.firstSeen > RADAR.trackConfirmTime) {
        t.state = 'TRACK';
        this.events.emit('track-confirmed', { track: t });
      }
      // fictional discrimination rule
      if (t.classification === 'AMBIG' && t.state === 'TRACK') {
        if (th.pos.y < RADAR.discriminateAltitude || this.time - t.firstSeen > RADAR.discriminateTime) {
          t.classification = th.isDecoy ? 'DECOY' : 'HOSTILE';
          this.events.emit('track-classified', { track: t });
        }
      }
      t.hasImpactPred = t.state === 'TRACK' && !!predictImpact(t.estPos, t.estVel, t.impactPred);
    }
    // purge long-closed tracks
    this.tracks = this.tracks.filter(t => !t.closed || this.time - t.closeTime < 6);

    this._updateHolo(dt);
    this._screenTimer -= dt;
    if (this._screenTimer <= 0) {
      this._screenTimer = 0.15;
      this._drawScreens();
    }
  }

  trackColor(t) {
    if (t.classification === 'HOSTILE') return COLORS.trackHostile;
    if (t.classification === 'DECOY') return COLORS.trackDecoy;
    return COLORS.trackAmbiguous;
  }

  // ------------------------------------------------------- holo display --
  _buildHolo(anchor) {
    this.holo = new THREE.Group();
    anchor.add(this.holo);

    // deck disc with rings
    const deckCanvas = document.createElement('canvas');
    deckCanvas.width = deckCanvas.height = 512;
    const g = deckCanvas.getContext('2d');
    g.fillStyle = 'rgba(4,14,10,0.92)';
    g.beginPath(); g.arc(256, 256, 254, 0, 7); g.fill();
    g.strokeStyle = 'rgba(46,196,130,0.5)';
    for (let r = 1; r <= 4; r++) {
      g.lineWidth = r === 4 ? 2.5 : 1.2;
      g.beginPath(); g.arc(256, 256, r * 62, 0, 7); g.stroke();
    }
    g.beginPath(); g.moveTo(256, 8); g.lineTo(256, 504); g.stroke();
    g.beginPath(); g.moveTo(8, 256); g.lineTo(504, 256); g.stroke();
    g.fillStyle = 'rgba(46,196,130,0.85)';
    g.font = '18px monospace';
    g.fillText('N', 250, 30);
    const deckTex = new THREE.CanvasTexture(deckCanvas);
    const deck = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 48),
      new THREE.MeshBasicMaterial({ map: deckTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0.02;
    this.holo.add(deck);

    // rotating sweep wedge
    const wedgeCanvas = document.createElement('canvas');
    wedgeCanvas.width = wedgeCanvas.height = 256;
    const wg = wedgeCanvas.getContext('2d');
    const grad = wg.createConicGradient ? null : null;
    // draw manual conic-ish gradient wedge
    wg.translate(128, 128);
    for (let i = 0; i < 40; i++) {
      const a0 = -i * 0.02, a1 = a0 - 0.025;
      wg.fillStyle = `rgba(64,235,160,${0.30 * (1 - i / 40)})`;
      wg.beginPath(); wg.moveTo(0, 0); wg.arc(0, 0, 126, a0, a1, true); wg.closePath(); wg.fill();
    }
    void grad;
    const wedgeTex = new THREE.CanvasTexture(wedgeCanvas);
    this.sweepMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({ map: wedgeTex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, opacity: 0.9 }),
    );
    this.sweepMesh.rotation.x = -Math.PI / 2;
    this.sweepMesh.position.y = 0.028;
    this.holo.add(this.sweepMesh);

    // base + battery markers
    const mkMarker = (x, z, color, size = 0.018) => {
      const mk = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      mk.position.set(x * HOLO_SCALE, 0.033, z * HOLO_SCALE);
      this.holo.add(mk);
      return mk;
    };
    mkMarker(0, 0, 0x9be8c8, 0.024);
    for (const [id, pad] of Object.entries(this.base.pads)) {
      const c = { rampart: 0x59d669, zenith: 0x4fb7e8, sentinel: 0xd6a24f }[id];
      mkMarker(pad.pos.x, pad.pos.z, c, 0.02);
    }

    // interceptor dots (updated from interceptors list each frame by main)
    this.interceptorDots = [];
    for (let i = 0; i < 12; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, toneMapped: false }));
      d.visible = false;
      this.holo.add(d);
      this.interceptorDots.push(d);
    }

    // blip pool
    this.blips = [];
    for (let i = 0; i < 10; i++) this.blips.push(new HoloBlip(this.holo));
  }

  _updateHolo(dt) {
    this.sweepMesh.rotation.z = this.sweep + Math.PI / 2;
    // assign blips to live tracks
    const live = this.liveTracks;
    for (const t of live) {
      if (!t.blip) {
        const b = this.blips.find(b => !b.track);
        if (b) {
          b.track = t;
          t.blip = b;
          b.group.visible = true;
          b.setLabel(t.id, '#dff6ea');
        }
      }
      if (!t.blip) continue;
      const b = t.blip;
      const x = t.estPos.x * HOLO_SCALE;
      const z = t.estPos.z * HOLO_SCALE;
      const y = Math.max(0.035, t.estPos.y * ALT_SCALE + 0.03);
      b.group.position.set(x, y, z);
      b.stem.scale.y = (y - 0.02);
      const col = this.trackColor(t);
      b.mat.color.set(col);
      b.stemMat.color.set(col);
      b.marker.rotation.y += dt * 2.5;
      const flash = t.state === 'DETECT' ? (Math.sin(this.time * 10) > 0 ? 1 : 0.25) : 1;
      b.mat.opacity = 0.55 * flash + 0.4;
      b.selRing.visible = this.selection === t;
      if (b.selRing.visible) b.selRing.rotation.z += dt * 1.4;
      b.selRing.lookAt(_v.set(0, 10, 4).add(b.group.position));
      if (t.hasImpactPred) {
        b.impact.visible = true;
        b.impact.position.set(t.impactPred.x * HOLO_SCALE, 0.026, t.impactPred.z * HOLO_SCALE);
        b.impact.material.color.set(col);
        const s = 1 + 0.3 * Math.sin(this.time * 4);
        b.impact.scale.setScalar(s);
      } else {
        b.impact.visible = false;
      }
      if (t.assignedBattery) b.setLabel(`${t.id}•${t.assignedBattery[0].toUpperCase()}`, '#ffffff');
    }
  }

  /** update cyan interceptor dots from live missiles */
  updateInterceptorDots(missiles) {
    for (let i = 0; i < this.interceptorDots.length; i++) {
      const d = this.interceptorDots[i];
      const m = missiles[i];
      if (m && m.active) {
        d.visible = true;
        d.position.set(m.pos.x * HOLO_SCALE, Math.max(0.03, m.pos.y * ALT_SCALE + 0.03), m.pos.z * HOLO_SCALE);
      } else d.visible = false;
    }
  }

  /** raycast pick a track blip (console mode) */
  pick(raycaster) {
    const meshes = this.blips.filter(b => b.track).map(b => b.pick);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const blip = this.blips.find(b => b.pick === hits[0].object);
      return blip?.track ?? null;
    }
    return null;
  }

  // ------------------------------------------------------- desk screens --
  _drawScreens() {
    const screens = this.base.consoleScreens;
    if (!screens) return;
    // screen 0: mini PPI
    {
      const { canvas, tex } = screens[0];
      const g = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      g.fillStyle = '#03130c'; g.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(cx, cy) - 6;
      g.strokeStyle = 'rgba(52,220,140,0.5)';
      for (let r = 1; r <= 3; r++) { g.beginPath(); g.arc(cx, cy, R * r / 3, 0, 7); g.stroke(); }
      // sweep
      g.save();
      g.translate(cx, cy);
      g.rotate(this.sweep);
      const gr = g.createLinearGradient(0, 0, R, 0);
      gr.addColorStop(0, 'rgba(70,240,160,0.5)');
      gr.addColorStop(1, 'rgba(70,240,160,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, 0, -0.5, true); g.closePath(); g.fill();
      g.restore();
      for (const t of this.liveTracks) {
        const x = cx + (t.estPos.x / RADAR.range) * R;
        const y = cy + (t.estPos.z / RADAR.range) * R;
        g.fillStyle = this.trackColor(t);
        g.fillRect(x - 2, y - 2, 4, 4);
      }
      g.fillStyle = '#9be8c8';
      g.font = '11px monospace';
      g.fillText('SRV-PPI', 6, 12);
      tex.needsUpdate = true;
    }
    // screen 1: track table
    {
      const { canvas, tex } = screens[1];
      const g = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      g.fillStyle = '#0a0f03'; g.fillRect(0, 0, w, h);
      g.font = '12px monospace';
      g.fillStyle = '#d8e6a0';
      g.fillText('TRACK  CLASS   ALT(m)  SPD', 8, 16);
      let y = 32;
      for (const t of this.liveTracks.slice(0, 8)) {
        g.fillStyle = this.trackColor(t);
        g.fillText(
          `${t.id}  ${t.classification.padEnd(7)} ${String(Math.round(t.estPos.y)).padStart(5)}  ${Math.round(t.estVel.length())}`,
          8, y,
        );
        y += 16;
      }
      if (!this.liveTracks.length) {
        g.fillStyle = '#5a7050';
        g.fillText('NO ACTIVE TRACKS', 8, 40);
      }
      tex.needsUpdate = true;
    }
    // screen 2: system status
    {
      const { canvas, tex } = screens[2];
      const g = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      g.fillStyle = '#02090f'; g.fillRect(0, 0, w, h);
      g.font = '11px monospace';
      g.fillStyle = '#9ac8e8';
      g.fillText('CASTELLAN RIDGE C2 — SIM', 8, 14);
      g.fillText(`SWEEP ${Math.round(this.sweep * 57.3).toString().padStart(3, '0')}°`, 8, 30);
      const bars = ['PWR', 'CMS', 'DLK', 'IFF'];
      bars.forEach((b, i) => {
        g.fillStyle = '#9ac8e8';
        g.fillText(b, 8, 50 + i * 18);
        g.fillStyle = 'rgba(60,200,255,0.25)';
        g.fillRect(42, 42 + i * 18, w - 60, 10);
        g.fillStyle = 'rgba(60,200,255,0.8)';
        const lv = 0.55 + 0.4 * Math.abs(Math.sin(this.time * (0.4 + i * 0.17) + i));
        g.fillRect(42, 42 + i * 18, (w - 60) * lv, 10);
      });
      tex.needsUpdate = true;
    }
  }
}
