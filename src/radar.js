// Fictional radar: sweep-gated detection, track confirmation, decoy
// discrimination, impact prediction — plus the in-shelter 3D holographic
// display (clickable blips) and the small PPI screens on the console desk.
import * as THREE from 'three';
import { RADAR, COLORS } from './constants.js';
import { predictImpact, predictBallistic, timeToGround } from './physics.js';

const _v = new THREE.Vector3();

const HOLO_SCALE = 1.05 / RADAR.range;      // world m → table m
const ALT_SCALE = HOLO_SCALE * 1.15;        // slight vertical exaggeration
const HOLO_R = RADAR.range * HOLO_SCALE;    // table radius of detection range
const SWEEP_ARC = THREE.MathUtils.degToRad(36);
const PATH_DASHES = 8;                      // dashed predicted-path segments
const PING_DUR = 0.9;                       // s — new-detection pulse
const TRAIL_LEN = 10;                       // PPI history points per track
const PPI_GLOW_N = 16;                      // afterglow arcs behind PPI beam

// shared blip geometries — one per classification, reused by the whole pool
const GEO_HOSTILE = new THREE.OctahedronGeometry(0.021);
const GEO_AMBIG = new THREE.ConeGeometry(0.018, 0.038, 3);   // 3-sided pyramid
const GEO_DECOY = new THREE.SphereGeometry(0.011, 8, 6);
const GEO_PING = new THREE.RingGeometry(0.82, 1, 28);
const GEO_SELRING = new THREE.RingGeometry(0.042, 0.052, 24);

// explicit renderOrder layers: the holo's transparent meshes share (almost)
// the same world position, so three.js depth sorting between them is
// effectively arbitrary — order them by hand instead.
const RO = { deck: 1, fan: 2, beam: 3, ping: 4, path: 5, impact: 6, stem: 7, marker: 8, sel: 9, label: 10 };

class HoloBlip {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.visible = false;
    parent.add(this.group);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xff5f4e, toneMapped: false, transparent: true, opacity: 0.95 });
    // classification-shaped markers (share one material; one visible at a time)
    this.markers = {
      HOSTILE: new THREE.Mesh(GEO_HOSTILE, this.mat),
      AMBIG: new THREE.Mesh(GEO_AMBIG, this.mat),
      DECOY: new THREE.Mesh(GEO_DECOY, this.mat),
    };
    this.markers.AMBIG.rotation.x = Math.PI;    // apex down = inbound
    for (const m of Object.values(this.markers)) { m.visible = false; m.renderOrder = RO.marker; this.group.add(m); }
    this.activeMarker = null;
    this.shownCls = null;
    // stem to the deck
    this.stemMat = new THREE.LineBasicMaterial({ color: 0xff5f4e, transparent: true, opacity: 0.4 });
    const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)]);
    this.stem = new THREE.Line(stemGeo, this.stemMat);
    this.stem.renderOrder = RO.stem;
    this.group.add(this.stem);
    // predicted impact marker on deck
    this.impactMat = new THREE.MeshBasicMaterial({ color: 0xff5f4e, toneMapped: false, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    this.impact = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.02, 12), this.impactMat);
    this.impact.rotation.x = -Math.PI / 2;
    this.impact.renderOrder = RO.impact;
    parent.add(this.impact);
    this.impact.visible = false;
    // expanding detection ping on the deck
    this.pingMat = new THREE.MeshBasicMaterial({ color: 0xff5f4e, toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this.ping = new THREE.Mesh(GEO_PING, this.pingMat);
    this.ping.rotation.x = -Math.PI / 2;
    this.ping.renderOrder = RO.ping;
    this.ping.visible = false;
    parent.add(this.ping);
    // dashed predicted-path hint (LineSegments = dash pairs, buffer reused)
    this.pathPos = new Float32Array(PATH_DASHES * 2 * 3);
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.BufferAttribute(this.pathPos, 3));
    this.pathMat = new THREE.LineBasicMaterial({ color: 0xff5f4e, transparent: true, opacity: 0.45, toneMapped: false, depthWrite: false });
    this.path = new THREE.LineSegments(pathGeo, this.pathMat);
    this.path.frustumCulled = false;
    this.path.renderOrder = RO.path;
    this.path.visible = false;
    parent.add(this.path);
    // selection ring — flat around the marker, pulses so it can't be missed
    this.selRing = new THREE.Mesh(
      GEO_SELRING,
      new THREE.MeshBasicMaterial({ color: 0xffc94e, toneMapped: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.renderOrder = RO.sel;
    this.selRing.visible = false;
    this.group.add(this.selRing);
    // id label
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 112; this.labelCanvas.height = 30;
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas);
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthWrite: false }));
    this.label.scale.set(0.12, 0.032, 1);
    this.label.position.y = 0.04;
    this.label.renderOrder = RO.label;
    this.group.add(this.label);
    this.lblId = null; this.lblCls = null; this.lblAsg = null;
    // pick proxy
    this.pick = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(this.pick);
    this.track = null;
  }

  setShape(cls) {
    if (cls === this.shownCls) return;
    this.shownCls = cls;
    for (const [k, m] of Object.entries(this.markers)) m.visible = k === cls;
    this.activeMarker = this.markers[cls] ?? this.markers.AMBIG;
  }

  setLabel(text, color) {
    const g = this.labelCanvas.getContext('2d');
    g.clearRect(0, 0, 112, 30);
    g.font = 'bold 17px monospace';
    const w = g.measureText(text).width + 10;
    g.fillStyle = 'rgba(2,8,5,0.72)';
    g.fillRect(56 - w / 2, 3, w, 24);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.fillText(text, 56, 21);
    this.labelTex.needsUpdate = true;
  }

  hide() {
    this.group.visible = false;
    this.impact.visible = false;
    this.ping.visible = false;
    this.path.visible = false;
    this.track = null;
    this.shownCls = null;
    this.lblId = null; this.lblCls = null; this.lblAsg = null;
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
    this._buildPpiAssets();

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
      t.blip.hide();
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
        // PPI history ring buffer (reused; no per-frame allocation)
        trail: new Float32Array(TRAIL_LEN * 2),
        trailIdx: 0,
        trailN: 0,
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

    // Conventions (must all agree — verified against detection math):
    //   world/table azimuth az = atan2(z, x); bearing labels use the same
    //   convention as main.js contact logs. On the deck canvas, angle az is
    //   drawn at (cx + r·cos az, cy + r·sin az).
    this._buildDeck();
    this._buildSweep();

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

  /** deck disc: range rings + labels, bearing ticks every 30°, cardinals */
  _buildDeck() {
    const S = 1024, C = S / 2;
    const deckR = 1.15;                       // mesh radius (m)
    const pxPerM = (C - 8) / deckR;           // canvas px per table metre
    const kmPx = 1000 * HOLO_SCALE * pxPerM;  // canvas px per world km
    const rangePx = HOLO_R * pxPerM;          // detection-range ring
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const g = canvas.getContext('2d');

    // dark phosphor deck
    const bg = g.createRadialGradient(C, C, 0, C, C, C);
    bg.addColorStop(0, 'rgba(8,24,16,0.94)');
    bg.addColorStop(0.8, 'rgba(4,14,10,0.94)');
    bg.addColorStop(1, 'rgba(2,9,6,0.96)');
    g.fillStyle = bg;
    g.beginPath(); g.arc(C, C, C - 4, 0, 7); g.fill();

    // faint radial spokes every 30°, stronger at cardinals
    for (let b = 0; b < 360; b += 30) {
      const a = b * Math.PI / 180;
      const cardinal = b % 90 === 0;
      g.strokeStyle = cardinal ? 'rgba(46,196,130,0.30)' : 'rgba(46,196,130,0.10)';
      g.lineWidth = cardinal ? 1.6 : 1;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * 26, C + Math.sin(a) * 26);
      g.lineTo(C + Math.cos(a) * (C - 20), C + Math.sin(a) * (C - 20));
      g.stroke();
    }

    // range rings every 3 km + detection-range ring
    g.strokeStyle = 'rgba(46,196,130,0.42)';
    for (let km = 3; km * kmPx < rangePx - 10; km += 3) {
      g.lineWidth = 1.3;
      g.beginPath(); g.arc(C, C, km * kmPx, 0, 7); g.stroke();
    }
    g.lineWidth = 2.4;
    g.setLineDash([10, 7]);
    g.strokeStyle = 'rgba(64,235,160,0.55)';
    g.beginPath(); g.arc(C, C, rangePx, 0, 7); g.stroke();
    g.setLineDash([]);
    // deck rim
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(46,196,130,0.6)';
    g.beginPath(); g.arc(C, C, C - 7, 0, 7); g.stroke();

    // deck text is tilted so it reads upright from the console camera view
    const TEXT_TILT = -0.8;
    const label = (txt, x, y) => {
      g.save(); g.translate(x, y); g.rotate(TEXT_TILT); g.fillText(txt, 0, 0); g.restore();
    };

    // range-ring labels along the 305° radial (clear of cardinal labels)
    g.font = `600 ${Math.round(S * 0.021)}px monospace`;
    g.fillStyle = 'rgba(140,230,180,0.62)';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const la = -55 * Math.PI / 180;
    for (let km = 3; km * kmPx < rangePx - 10; km += 3) {
      label(`${km}`, C + Math.cos(la) * km * kmPx, C + Math.sin(la) * km * kmPx - 12);
    }
    label(`${(RADAR.range / 1000).toFixed(1)}KM`, C + Math.cos(la) * (rangePx - 34), C + Math.sin(la) * (rangePx - 34) - 12);

    // bearing ticks every 30° on the detection ring, cardinals longer
    for (let b = 0; b < 360; b += 30) {
      const a = b * Math.PI / 180;
      const cardinal = b % 90 === 0;
      const t0 = rangePx - (cardinal ? 2 : 0);
      const t1 = rangePx + (cardinal ? 22 : 13);
      g.strokeStyle = cardinal ? 'rgba(140,235,180,0.8)' : 'rgba(140,235,180,0.45)';
      g.lineWidth = cardinal ? 3 : 1.6;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * t0, C + Math.sin(a) * t0);
      g.lineTo(C + Math.cos(a) * t1, C + Math.sin(a) * t1);
      g.stroke();
    }
    // cardinal bearing labels (bearing convention = atan2(z,x), like the logs)
    g.font = `700 ${Math.round(S * 0.03)}px monospace`;
    g.fillStyle = 'rgba(170,240,200,0.75)';
    for (let b = 0; b < 360; b += 90) {
      const a = b * Math.PI / 180;
      const r = rangePx - 46;
      label(String(b).padStart(3, '0'), C + Math.cos(a) * r, C + Math.sin(a) * r);
    }
    // center cross
    g.strokeStyle = 'rgba(155,232,200,0.8)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(C - 12, C); g.lineTo(C + 12, C); g.stroke();
    g.beginPath(); g.moveTo(C, C - 12); g.lineTo(C, C + 12); g.stroke();

    const deckTex = new THREE.CanvasTexture(canvas);
    deckTex.anisotropy = 4;
    const deck = new THREE.Mesh(
      new THREE.CircleGeometry(deckR, 64),
      new THREE.MeshBasicMaterial({ map: deckTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0.02;
    deck.renderOrder = RO.deck;
    this.holo.add(deck);
  }

  /** crisp rotating sweep sector: vertex-alpha gradient fan + bright leading edge */
  _buildSweep() {
    const SEG = 30;
    const pos = new Float32Array((SEG + 2) * 3);
    const col = new Float32Array((SEG + 2) * 4);
    // vertex 0: center (dim)
    col[0] = 0.14; col[1] = 0.6; col[2] = 0.32; col[3] = 0.1;
    for (let i = 0; i <= SEG; i++) {
      // leading edge at geometry azimuth 0; tail sweeps back to -SWEEP_ARC
      const a = -SWEEP_ARC * (i / SEG);
      const j = (i + 1) * 3;
      pos[j] = Math.cos(a) * HOLO_R;
      pos[j + 1] = 0;
      pos[j + 2] = Math.sin(a) * HOLO_R;
      const k = 1 - i / SEG;                  // 1 at leading edge → 0 at tail
      const c = (i + 1) * 4;
      col[c] = 0.16 + 0.4 * k;
      col[c + 1] = 0.9;
      col[c + 2] = 0.38 + 0.28 * k;
      col[c + 3] = Math.pow(k, 2.2) * 0.36;
    }
    const idx = [];
    for (let i = 0; i < SEG; i++) idx.push(0, i + 1, i + 2);
    const fanGeo = new THREE.BufferGeometry();
    fanGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fanGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    fanGeo.setIndex(idx);
    const fan = new THREE.Mesh(fanGeo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, toneMapped: false, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    fan.renderOrder = RO.fan;
    // bright beam line on the leading edge
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.02, 0.001, 0), new THREE.Vector3(HOLO_R, 0.001, 0),
    ]);
    const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({
      color: 0xbfffd9, transparent: true, opacity: 0.85, toneMapped: false,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    edge.renderOrder = RO.beam;
    this.sweepGroup = new THREE.Group();
    this.sweepGroup.add(fan, edge);
    this.sweepGroup.position.y = 0.024;
    this.holo.add(this.sweepGroup);
    this.sweepMesh = fan;   // kept for compatibility/debug
  }

  _updateHolo(dt) {
    // geometry azimuth a maps to table azimuth a + sweep under rotation.y = -sweep,
    // so the bright edge (a = 0) rides exactly on this.sweep.
    this.sweepGroup.rotation.y = -this.sweep;
    // assign blips to live tracks
    const live = this.liveTracks;
    for (const t of live) {
      if (!t.blip) {
        const b = this.blips.find(b => !b.track);
        if (b) {
          b.track = t;
          t.blip = b;
          b.group.visible = true;
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
      b.setShape(t.classification);
      const age = this.time - t.firstSeen;
      // new-detection pulse: marker swells briefly, then settles
      const swell = 1 + 0.7 * Math.max(0, 1 - age / PING_DUR);
      if (b.activeMarker) {
        b.activeMarker.scale.setScalar(swell);
        b.activeMarker.rotation.y += dt * 2.5;
      }
      const flash = t.state === 'DETECT' ? (Math.sin(this.time * 10) > 0 ? 1 : 0.25) : 1;
      b.mat.opacity = 0.55 * flash + 0.4;
      // expanding deck ping on first detection
      if (age < PING_DUR) {
        const k = age / PING_DUR;
        b.ping.visible = true;
        b.ping.position.set(x, 0.025, z);
        b.ping.scale.setScalar(0.035 + k * 0.17);
        b.pingMat.color.set(col);
        b.pingMat.opacity = (1 - k) * 0.85;
      } else {
        b.ping.visible = false;
      }
      b.selRing.visible = this.selection === t;
      if (b.selRing.visible) b.selRing.scale.setScalar(1 + 0.14 * Math.sin(this.time * 6));
      if (t.hasImpactPred) {
        b.impact.visible = true;
        b.impact.position.set(t.impactPred.x * HOLO_SCALE, 0.026, t.impactPred.z * HOLO_SCALE);
        b.impact.material.color.set(col);
        const s = 1 + 0.3 * Math.sin(this.time * 4);
        b.impact.scale.setScalar(s);
      } else {
        b.impact.visible = false;
      }
      this._updatePath(t, b, col);
      // label: id (+ assigned battery initial), redrawn only when content changes
      const asg = t.assignedBattery ? t.assignedBattery[0].toUpperCase() : null;
      if (b.lblId !== t.id || b.lblCls !== t.classification || b.lblAsg !== asg) {
        b.lblId = t.id; b.lblCls = t.classification; b.lblAsg = asg;
        b.setLabel(asg ? `${t.id}▸${asg}` : t.id, asg ? '#ffffff' : col);
      }
    }
  }

  /** dashed ballistic-path hint from the blip toward its impact marker */
  _updatePath(t, b, col) {
    if (!t.hasImpactPred) { b.path.visible = false; return; }
    const T = timeToGround(t.estPos, t.estVel);
    if (T <= 0) { b.path.visible = false; return; }
    const p = b.pathPos;
    for (let d = 0; d < PATH_DASHES; d++) {
      const t0 = T * (d + 0.2) / PATH_DASHES;
      const t1 = T * (d + 0.66) / PATH_DASHES;
      predictBallistic(t.estPos, t.estVel, t0, _v);
      let j = d * 6;
      p[j] = _v.x * HOLO_SCALE;
      p[j + 1] = Math.max(0.028, _v.y * ALT_SCALE + 0.03);
      p[j + 2] = _v.z * HOLO_SCALE;
      predictBallistic(t.estPos, t.estVel, t1, _v);
      j += 3;
      p[j] = _v.x * HOLO_SCALE;
      p[j + 1] = Math.max(0.028, _v.y * ALT_SCALE + 0.03);
      p[j + 2] = _v.z * HOLO_SCALE;
    }
    b.path.geometry.attributes.position.needsUpdate = true;
    b.pathMat.color.set(col);
    b.path.visible = true;
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
  /** prerendered PPI backdrop + cached afterglow styles (no per-draw string churn) */
  _buildPpiAssets() {
    const screens = this.base.consoleScreens;
    if (!screens) return;
    const w = screens[0].canvas.width, h = screens[0].canvas.height;
    const cx = w / 2, cy = h / 2, R = Math.min(cx, cy) - 6;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#03130c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(52,220,140,0.35)';
    g.lineWidth = 1;
    for (let r = 1; r <= 3; r++) { g.beginPath(); g.arc(cx, cy, R * r / 3, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(52,220,140,0.55)';
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    // bearing ticks every 30°
    g.strokeStyle = 'rgba(52,220,140,0.5)';
    for (let b = 0; b < 360; b += 30) {
      const a = b * Math.PI / 180;
      const len = b % 90 === 0 ? 6 : 3;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len));
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
    g.fillStyle = '#9be8c8';
    g.font = '11px monospace';
    g.fillText('SRV-PPI', 6, 12);
    g.fillStyle = 'rgba(155,232,200,0.55)';
    g.fillText(`R${(RADAR.range / 1000).toFixed(0)}`, w - 30, 12);
    this._ppiBase = c;
    this._ppiC = { cx, cy, R };
    // afterglow fill styles, precomputed (brightest right behind the beam)
    this._glowStyles = [];
    for (let i = 0; i < PPI_GLOW_N; i++) {
      const a = 0.34 * Math.pow(1 - i / PPI_GLOW_N, 1.7);
      this._glowStyles.push(`rgba(64,235,160,${a.toFixed(3)})`);
    }
  }

  _drawScreens() {
    const screens = this.base.consoleScreens;
    if (!screens) return;
    if (!this._ppiBase) this._buildPpiAssets();
    const live = this.liveTracks;
    // screen 0: mini PPI with afterglow sweep + blip trails
    {
      const { canvas, tex } = screens[0];
      const g = canvas.getContext('2d');
      const { cx, cy, R } = this._ppiC;
      g.drawImage(this._ppiBase, 0, 0);
      // afterglow: trailing arcs with fading alpha
      const step = 0.085;
      g.save();
      g.translate(cx, cy);
      for (let i = 0; i < PPI_GLOW_N; i++) {
        const a1 = this.sweep - i * step;
        g.fillStyle = this._glowStyles[i];
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, R, a1 - step * 1.12, a1, false);
        g.closePath();
        g.fill();
      }
      // bright beam on the leading edge
      g.strokeStyle = 'rgba(190,255,215,0.95)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(this.sweep) * R, Math.sin(this.sweep) * R);
      g.stroke();
      g.restore();
      // blips: history trail (ring buffer on the track) + bright head + velocity leader
      const s = R / RADAR.range;
      for (const t of live) {
        // push current estimate into the trail (this draw runs on a fixed 0.15 s cadence)
        t.trail[t.trailIdx * 2] = t.estPos.x;
        t.trail[t.trailIdx * 2 + 1] = t.estPos.z;
        t.trailIdx = (t.trailIdx + 1) % TRAIL_LEN;
        if (t.trailN < TRAIL_LEN) t.trailN++;
        const col = this.trackColor(t);
        g.fillStyle = col;
        for (let k = 0; k < t.trailN; k++) {
          const idx = (t.trailIdx - t.trailN + k + TRAIL_LEN * 2) % TRAIL_LEN;
          g.globalAlpha = 0.06 + 0.38 * ((k + 1) / t.trailN);
          const px = cx + t.trail[idx * 2] * s;
          const py = cy + t.trail[idx * 2 + 1] * s;
          g.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
        g.globalAlpha = 1;
        const hx = cx + t.estPos.x * s;
        const hy = cy + t.estPos.z * s;
        g.fillRect(hx - 2, hy - 2, 4, 4);
        // velocity leader
        const vl = Math.hypot(t.estVel.x, t.estVel.z);
        if (vl > 1) {
          g.strokeStyle = col;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(hx, hy);
          g.lineTo(hx + (t.estVel.x / vl) * 8, hy + (t.estVel.z / vl) * 8);
          g.stroke();
        }
      }
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
      g.strokeStyle = 'rgba(216,230,160,0.4)';
      g.beginPath(); g.moveTo(6, 21); g.lineTo(w - 6, 21); g.stroke();
      let y = 36;
      for (const t of live.slice(0, 7)) {
        g.fillStyle = this.trackColor(t);
        g.fillText(
          `${t.id}  ${t.classification.padEnd(7)} ${String(Math.round(t.estPos.y)).padStart(5)}  ${Math.round(t.estVel.length())}`,
          8, y,
        );
        y += 16;
      }
      if (!live.length) {
        g.fillStyle = '#5a7050';
        g.fillText('NO ACTIVE TRACKS', 8, 40);
        g.fillText('RADAR SWEEPING', 8, 56);
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
      g.fillText(`SWEEP ${Math.round(this.sweep * 57.3).toString().padStart(3, '0')}°  TRK ${live.length}`, 8, 30);
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
