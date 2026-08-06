// Radar: track formation, the PPI scope canvas (also used as the console table
// texture), the stylised 3D track hologram above the table, and mouse picking.
//
// The detection/classification behaviour is a gameplay abstraction.
import * as THREE from 'three';
import * as T from './core/textures.js';

const SCOPE_SIZE = 640;
const GLOW_SIZE = 320;   // phosphor persistence layer, upscaled when composited
const SIDE_W = 512;
const SIDE_H = 288;

export const SCOPE_RANGE = 62000; // metres shown from the centre to the outer ring

const HOLO_R = 1.32;      // hologram plot radius in world units
const HOLO_ALT = 1.15;    // hologram height at the altitude ceiling
const ALT_CEIL = 40000;   // metres mapped to HOLO_ALT
const TRAIL_POINTS = 30;  // history samples kept per track
const TRAIL_STEP = 0.4;   // seconds between history samples
const MAX_MARKERS = 12;
const MAX_FRIENDS = 8;

const HOSTILE = 0xff4030;
const HOSTILE_ENG = 0xff9a44;
const DECOY = 0xffc23a;
const FRIEND = 0x6fe8ff;
const GRID = 0x3ce0a0;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _col = new THREE.Color();

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

    // phosphor persistence layer: blips and the sweep smear here and decay,
    // everything crisp is drawn fresh on top of it every repaint
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = this.glowCanvas.height = GLOW_SIZE;
    this.glowCtx = this.glowCanvas.getContext('2d');

    // static ground clutter speckle, generated once so it does not crawl
    this.clutter = [];
    for (let i = 0; i < 150; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const r = Math.pow(this.rng.float(), 0.7);
      this.clutter.push({
        a, r,
        size: 0.6 + this.rng.float() * 2.2,
        alpha: 0.03 + this.rng.float() * 0.09 * (1 - r * 0.7),
        phase: this.rng.float() * Math.PI * 2,
      });
    }

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
    // The console table sits about 1.1 m into the shelter from the anchor and
    // the building is yawed, so the plot is nudged to float over its bezel.
    this.holo.position.set(
      anchor.position.x + 0.2,
      anchor.position.y + 1.19,
      anchor.position.z - 1.08,
    );
    scene.add(this.holo);
    this._buildHolo();

    this.scopeScale = HOLO_R / this.range;   // metres -> holo/table units
    this.altScale = HOLO_ALT / ALT_CEIL;

    // wall-clock stamps of the last repaint of each throttled display
    this._lastPaint = {};
  }

  // -------------------------------------------------------------------------
  // Hologram construction
  // -------------------------------------------------------------------------

  _buildHolo() {
    this._buildHoloGrid();
    this._buildHoloLabels();

    // faint additive floor wash so the plot reads as a lit volume, not a wire
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(HOLO_R, 48),
      new THREE.MeshBasicMaterial({
        map: T.glow(0.02), color: 0x1d8f68, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    floor.renderOrder = 2;
    this.holo.add(floor);

    // rotating search fan on the deck plus a faint full-height curtain, which
    // together sell the plot as a volume being swept rather than a flat map
    const fanMat = new THREE.MeshBasicMaterial({
      color: GRID, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.fan = new THREE.Mesh(new THREE.CircleGeometry(HOLO_R, 28, 0, 0.5), fanMat);
    this.fan.rotation.x = -Math.PI / 2;
    this.fan.position.y = 0.004;
    this.fan.renderOrder = 3;
    this.holo.add(this.fan);

    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(HOLO_R, HOLO_ALT),
      new THREE.MeshBasicMaterial({
        color: GRID, transparent: true, opacity: 0.055, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    curtain.position.set(HOLO_R / 2, HOLO_ALT / 2, 0);
    this.curtainPivot = new THREE.Group();
    this.curtainPivot.add(curtain);
    this.curtainPivot.renderOrder = 3;
    this.holo.add(this.curtainPivot);

    // site symbol at the plot origin
    const site = new THREE.Mesh(
      new THREE.RingGeometry(0.014, 0.026, 14),
      new THREE.MeshBasicMaterial({ color: 0xbfffe4, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    site.rotation.x = -Math.PI / 2;
    site.position.y = 0.006;
    this.holo.add(site);

    this._buildTrackMarkers();
    this._buildFriendMarkers();

    // selected-track callout, parked until something is selected
    this.callout = makeLabelSprite(416, 176, { pad: 10, font: 21 });
    this.callout.center.set(0.5, 0.5);
    this.callout.visible = false;
    this.callout.renderOrder = 40;
    this.holo.add(this.callout);
  }

  _buildHoloGrid() {
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    const push = (x1, y1, z1, x2, y2, z2, hex, mul) => {
      c.setHex(hex).multiplyScalar(mul);
      pos.push(x1, y1, z1, x2, y2, z2);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };
    const ring = (r, y, hex, mul, segs = 72, dash = 1) => {
      for (let i = 0; i < segs; i++) {
        if (dash < 1 && i % 2) continue;
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + dash) / segs) * Math.PI * 2;
        push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r, hex, mul);
      }
    };

    // deck: range rings and bearing spokes
    for (let i = 1; i <= 4; i++) ring((i / 4) * HOLO_R, 0.002, GRID, i === 4 ? 0.5 : 0.22);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const card = i % 3 === 0;
      push(0, 0.002, 0, Math.cos(a) * HOLO_R, 0.002, Math.sin(a) * HOLO_R, GRID, card ? 0.3 : 0.12);
    }

    // altitude reference planes, drawn dashed so tracks stay legible through them
    for (let k = 1; k <= 4; k++) {
      const y = (k / 4) * HOLO_ALT;
      ring(HOLO_R * 0.995, y, GRID, k === 4 ? 0.17 : 0.11, 72, 0.5);
    }

    // volume cage
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      push(Math.cos(a) * HOLO_R, 0.002, Math.sin(a) * HOLO_R,
        Math.cos(a) * HOLO_R, HOLO_ALT, Math.sin(a) * HOLO_R, GRID, 0.07);
    }

    // centre altitude mast with a tick at every reference plane
    push(0, 0, 0, 0, HOLO_ALT, 0, GRID, 0.22);
    for (let k = 1; k <= 4; k++) {
      const y = (k / 4) * HOLO_ALT;
      push(-0.035, y, 0, 0.035, y, 0, GRID, 0.4);
      push(0, y, -0.035, 0, y, 0.035, GRID, 0.4);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    grid.renderOrder = 4;
    this.holo.add(grid);
    this.grid = grid;
  }

  _buildHoloLabels() {
    const add = (text, x, y, z, scale, color) => {
      const s = makeLabelSprite(128, 40, { font: 26, align: 'center' });
      s.center.set(0.5, 0.5);
      s.material.map.__draw([text], color);
      s.position.set(x, y, z);
      s.scale.set(scale, scale * (40 / 128), 1);
      s.renderOrder = 30;
      this.holo.add(s);
      return s;
    };
    const edge = HOLO_R + 0.085;
    add('N', 0, 0.012, -edge, 0.13, '#9dffd2');
    add('E', edge, 0.012, 0, 0.11, '#63c9a3');
    add('S', 0, 0.012, edge, 0.11, '#63c9a3');
    add('W', -edge, 0.012, 0, 0.11, '#63c9a3');
    add(`${(SCOPE_RANGE / 1000).toFixed(0)}KM`, HOLO_R * 0.76, 0.012, -HOLO_R * 0.76, 0.15, '#4fb98e');
    for (let k = 1; k <= 4; k++) {
      const km = (ALT_CEIL / 1000) * (k / 4);
      add(`${km.toFixed(0)}`, 0.075, (k / 4) * HOLO_ALT, 0, 0.075, '#4fb98e');
    }
    add('KM', 0.085, HOLO_ALT + 0.07, 0, 0.075, '#3f9d78');
  }

  _buildTrackMarkers() {
    this.markers = [];
    for (let i = 0; i < MAX_MARKERS; i++) {
      const g = new THREE.Group();
      g.visible = false;

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glow(0.42),
        color: HOSTILE,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }));
      sprite.scale.setScalar(0.1);
      sprite.renderOrder = 20;
      g.add(sprite);

      // hostile diamond around the blip so symbology matches the flat scope
      const dia = new THREE.Sprite(new THREE.SpriteMaterial({
        map: symbolTexture('diamond'),
        color: HOSTILE,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }));
      dia.scale.setScalar(0.11);
      dia.renderOrder = 21;
      g.add(dia);

      const stalk = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)]),
        new THREE.LineBasicMaterial({ color: HOSTILE, transparent: true, opacity: 0.4, depthWrite: false }),
      );
      g.add(stalk);

      const base = new THREE.Mesh(
        new THREE.RingGeometry(0.022, 0.034, 16),
        new THREE.MeshBasicMaterial({ color: HOSTILE, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
      );
      base.rotation.x = -Math.PI / 2;
      g.add(base);

      const label = makeLabelSprite(256, 64, { font: 30 });
      label.position.set(0.055, 0.06, 0);
      label.scale.set(0.36, 0.09, 1);
      label.renderOrder = 31;
      g.add(label);

      this.holo.add(g);

      // history trail lives outside the marker group so it stays in plot space
      const trail = makeTrailLine(HOSTILE);
      this.holo.add(trail);

      // predicted ground impact: cross plus ring, one draw call
      const impact = new THREE.LineSegments(impactGeometry(), new THREE.LineBasicMaterial({
        color: HOSTILE, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      impact.visible = false;
      this.holo.add(impact);

      this.markers.push({ group: g, sprite, dia, stalk, base, label, trail, impact, track: null, key: '' });
    }
  }

  _buildFriendMarkers() {
    this.friendMarkers = [];
    for (let i = 0; i < MAX_FRIENDS; i++) {
      const g = new THREE.Group();
      g.visible = false;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glow(0.5), color: FRIEND, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false,
      }));
      sprite.scale.setScalar(0.07);
      g.add(sprite);
      // friendly symbol: an upward chevron, mirroring the flat-scope symbology
      const chev = new THREE.Sprite(new THREE.SpriteMaterial({
        map: symbolTexture('chevron'),
        color: FRIEND,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }));
      chev.scale.setScalar(0.085);
      chev.renderOrder = 21;
      g.add(chev);
      const stalk = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)]),
        new THREE.LineBasicMaterial({ color: FRIEND, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      g.add(stalk);
      this.holo.add(g);

      const trail = makeTrailLine(FRIEND);
      this.holo.add(trail);

      this.friendMarkers.push({ group: g, sprite, chev, stalk, trail, history: [] });
    }
  }

  // -------------------------------------------------------------------------
  // Coordinate helpers
  // -------------------------------------------------------------------------

  /** World XZ -> holo local coordinates (north is -Z, matching the world). */
  worldToHolo(pos, out = new THREE.Vector3()) {
    out.set(pos.x * this.scopeScale, Math.min(HOLO_ALT, Math.max(0, pos.y) * this.altScale), pos.z * this.scopeScale);
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

  // -------------------------------------------------------------------------
  // Track formation (simulation half)
  // -------------------------------------------------------------------------

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
          history: [],
          sampleTimer: 0,
          impact: new THREE.Vector3(),
        };
        this.tracks.push(tr);
      }
      tr.quality = Math.min(1, tr.quality + dt * 0.9);
      const speed = t.vel.length();
      tr.speed = speed;
      tr.altitude = t.pos.y;
      tr.range = Math.hypot(t.pos.x, t.pos.z);
      tr.slant = Math.hypot(tr.range, t.pos.y);
      tr.bearing = (Math.atan2(t.pos.x, -t.pos.z) * 180 / Math.PI + 360) % 360;
      // simple free-fall estimate of time to ground
      const vy = -t.vel.y;
      const g = 9.81;
      const disc = vy * vy + 2 * g * Math.max(0, t.pos.y);
      tr.timeToImpact = disc > 0 ? (-vy + Math.sqrt(disc)) / g : 0;
      if (tr.timeToImpact < 0) tr.timeToImpact = Math.max(0, t.pos.y / Math.max(1, vy));
      // kinematic estimate of where it would strike, used as a cue only
      tr.impact.set(
        t.pos.x + t.vel.x * tr.timeToImpact,
        0,
        t.pos.z + t.vel.z * tr.timeToImpact,
      );
      tr.closing = true;
      if (t.isDecoy && tr.quality > 0.55 && t.classified > 0.45) tr.classification = 'DECOY';
      else if (tr.quality > 0.35) tr.classification = t.isDecoy && t.classified > 0.2 ? 'UNCERTAIN' : 'BALLISTIC';
      tr.assigned = t.assignedTo || null;
      tr.engaged = !!t.engagedBy;

      tr.sampleTimer -= dt;
      if (tr.sampleTimer <= 0) {
        tr.sampleTimer = TRAIL_STEP;
        tr.history.push(t.pos.x, t.pos.y, t.pos.z);
        if (tr.history.length > TRAIL_POINTS * 3) tr.history.splice(0, 3);
      }
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

  /** Simulation half: track formation only. Cheap. */
  update(dt, { threats }) {
    this.time += dt;
    this.sweep += dt * 0.85;
    this.updateTracks(threats, dt);
  }

  /**
   * Presentation half: the hologram and the two canvas displays. Canvas 2D
   * redraws are the single most expensive thing in the frame, so the scope is
   * repainted at a fixed 20 Hz and the status panel at 5 Hz - both still look
   * like live instruments.
   */
  present(dt, { interceptors, batteries, selectedBattery, gameState }) {
    // Throttles run off the wall clock rather than accumulated frame dt so a
    // headless harness that renders a handful of frames still gets a live
    // instrument, while an interactive frame loop keeps the same 20/5 Hz caps.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const last = this._lastPaint;
    const due = (key, period) => {
      if (now - (last[key] || -1e9) < period) return false;
      last[key] = now;
      return true;
    };

    this._updateHolo(interceptors, selectedBattery, due('trail', 0.1), due('label', 0.2));

    if (due('scope', 0.05)) {
      this._drawScope(interceptors, batteries, selectedBattery, gameState);
      this.texture.needsUpdate = true;
    }
    if (due('side', 0.2)) {
      this._drawSide(batteries, selectedBattery, gameState);
      this.sideTexture.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------------------
  // Hologram update
  // -------------------------------------------------------------------------

  _updateHolo(interceptors, selectedBattery, doTrails, doLabels) {
    this.fan.rotation.z = -this.sweep;
    this.curtainPivot.rotation.y = -this.sweep + Math.PI / 2;

    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i];
      const tr = this.tracks[i];
      m.track = tr || null;
      if (!tr) {
        if (m.group.visible) {
          m.group.visible = false;
          m.trail.visible = false;
          m.impact.visible = false;
        }
        continue;
      }
      m.group.visible = true;
      this.worldToHolo(tr.threat.pos, _v);
      m.group.position.copy(_v);

      const isSel = this.selected === tr;
      const decoy = tr.classification === 'DECOY';
      const col = decoy ? DECOY : tr.engaged ? HOSTILE_ENG : HOSTILE;
      m.sprite.material.color.setHex(col);
      m.base.material.color.setHex(col);
      m.stalk.material.color.setHex(col);
      m.dia.material.color.setHex(isSel ? 0xffffff : col);
      m.dia.material.opacity = isSel ? 1 : 0.75;
      m.impact.material.color.setHex(col);

      const pulse = isSel ? 1.35 + Math.sin(this.time * 9) * 0.28 : 1;
      m.sprite.scale.setScalar(0.085 * pulse * (0.7 + tr.quality * 0.5));
      m.dia.scale.setScalar(isSel ? 0.16 : 0.11);
      m.base.position.y = -_v.y;
      m.base.material.opacity = isSel ? 0.9 : 0.5;
      m.stalk.scale.y = Math.max(0.0001, _v.y);

      // predicted ground impact
      const ix = tr.impact.x * this.scopeScale;
      const iz = tr.impact.z * this.scopeScale;
      const inPlot = Math.hypot(ix, iz) < HOLO_R;
      m.impact.visible = inPlot && tr.timeToImpact < 200;
      if (m.impact.visible) {
        m.impact.position.set(ix, 0.004, iz);
        m.impact.material.opacity = isSel ? 0.95 : 0.45;
        m.impact.scale.setScalar(isSel ? 1.25 : 1);
      }

      if (doTrails) this._updateTrailLine(m.trail, tr.history, col);
      if (doLabels) {
        const key = `${tr.id}|${(tr.altitude / 1000).toFixed(0)}|${isSel}|${decoy}|${tr.engaged}`;
        if (m.key !== key) {
          m.key = key;
          m.label.material.map.__draw(
            [`${tr.id} ${(tr.altitude / 1000).toFixed(0)}KM`],
            isSel ? '#ffffff' : decoy ? '#ffd98a' : tr.engaged ? '#ffc39a' : '#ff9c86',
          );
        }
      }
    }

    for (let i = 0; i < this.friendMarkers.length; i++) {
      const f = this.friendMarkers[i];
      const it = interceptors[i];
      if (!it) {
        if (f.group.visible) {
          f.group.visible = false;
          f.trail.visible = false;
          f.history.length = 0;
        }
        continue;
      }
      f.group.visible = true;
      this.worldToHolo(it.pos, _v);
      f.group.position.copy(_v);
      f.stalk.scale.y = Math.max(0.0001, _v.y);
      const boost = it.phase === 'BOOST';
      f.sprite.scale.setScalar(boost ? 0.095 : 0.065);
      f.chev.material.opacity = boost ? 1 : 0.7;
      if (doTrails) {
        f.history.push(it.pos.x, it.pos.y, it.pos.z);
        if (f.history.length > TRAIL_POINTS * 3) f.history.splice(0, 3);
        this._updateTrailLine(f.trail, f.history, FRIEND);
      }
    }

    if (doLabels) this._updateCallout(selectedBattery);
  }

  /** Rewrite a pooled polyline from a world-space history buffer, oldest faintest. */
  _updateTrailLine(line, history, hex) {
    const n = history.length / 3;
    if (n < 2) {
      line.visible = false;
      return;
    }
    const attr = line.geometry.getAttribute('position');
    const cattr = line.geometry.getAttribute('color');
    const arr = attr.array;
    const carr = cattr.array;
    _col.setHex(hex);
    for (let i = 0; i < n; i++) {
      _v2.set(history[i * 3], history[i * 3 + 1], history[i * 3 + 2]);
      this.worldToHolo(_v2, _v);
      arr[i * 3] = _v.x;
      arr[i * 3 + 1] = _v.y;
      arr[i * 3 + 2] = _v.z;
      // additive blending turns a darkened colour into a fade-out
      const k = 0.06 + 0.94 * (i / (n - 1)) ** 1.6;
      carr[i * 3] = _col.r * k;
      carr[i * 3 + 1] = _col.g * k;
      carr[i * 3 + 2] = _col.b * k;
    }
    attr.needsUpdate = true;
    cattr.needsUpdate = true;
    line.geometry.setDrawRange(0, n);
    line.visible = true;
  }

  _updateCallout(selectedBattery) {
    const tr = this.selected;
    if (!tr) {
      this.callout.visible = false;
      this._calloutKey = '';
      return;
    }
    this.worldToHolo(tr.threat.pos, _v);
    this.callout.visible = true;
    // keep the card inside the plot so it never floats off over the shelter
    const side = _v.x > 0 ? -1 : 1;
    this.callout.position.set(
      _v.x + side * 0.46,
      Math.min(HOLO_ALT + 0.16, _v.y + 0.3),
      _v.z,
    );
    this.callout.scale.set(0.86, 0.86 * (176 / 416), 1);

    const decoy = tr.classification === 'DECOY';
    const state = tr.engaged ? 'ROUND IN FLIGHT'
      : tr.assigned ? `ASSIGNED ${tr.assigned.spec.name}`
        : 'UNASSIGNED';
    const key = `${tr.id}|${(tr.altitude / 500) | 0}|${(tr.timeToImpact) | 0}|${state}|${tr.classification}`;
    if (key === this._calloutKey) return;
    this._calloutKey = key;
    this.callout.material.map.__draw([
      `${tr.id}  ${decoy ? 'DECOY' : tr.classification}`,
      `ALT ${(tr.altitude / 1000).toFixed(1)} KM   SPD ${tr.speed.toFixed(0)} M/S`,
      `RNG ${(tr.range / 1000).toFixed(0)} KM   BRG ${tr.bearing.toFixed(0).padStart(3, '0')}`,
      `IMPACT IN ${tr.timeToImpact.toFixed(0)} S`,
      state,
    ], decoy ? '#ffd98a' : '#ffffff', {
      box: true,
      accent: tr.engaged ? '#8fe4ff' : decoy ? '#ffc23a' : '#ff6a52',
    });
  }

  // -------------------------------------------------------------------------
  // PPI rendering
  // -------------------------------------------------------------------------

  /** Phosphor layer: the sweep smear and the returns it paints, all decaying. */
  _paintGlow(interceptors) {
    const g = this.glowCtx;
    const S = GLOW_SIZE;
    const c = S / 2;
    const R = S / 2 - 15;
    const k = R / this.range;

    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';

    // sweep wedge
    const sweepA = this.sweep % (Math.PI * 2) - Math.PI / 2;
    g.save();
    g.translate(c, c);
    for (let i = 0; i < 14; i++) {
      const a = sweepA - i * 0.026;
      g.strokeStyle = `rgba(80,240,165,${0.1 * (1 - i / 14)})`;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      g.stroke();
    }
    g.restore();

    // returns: brightest just after the sweep has passed over them
    for (const tr of this.tracks) {
      const p = tr.threat.pos;
      const x = c + p.x * k;
      const y = c + p.z * k;
      let rel = (Math.atan2(p.z, p.x) - sweepA) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const paint = rel > Math.PI * 1.55 ? 1 : 0.25;
      const decoy = tr.classification === 'DECOY';
      const rad = decoy ? 3 : 4.4;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const rgb = decoy ? '255,205,90' : '255,120,90';
      grd.addColorStop(0, `rgba(${rgb},${0.75 * paint})`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    for (const it of interceptors) {
      const x = c + it.pos.x * k;
      const y = c + it.pos.z * k;
      const grd = g.createRadialGradient(x, y, 0, x, y, 3.4);
      grd.addColorStop(0, 'rgba(130,235,255,0.7)');
      grd.addColorStop(1, 'rgba(130,235,255,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, 3.4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  _drawScope(interceptors, batteries, selectedBattery, gameState) {
    const ctx = this.ctx;
    const S = SCOPE_SIZE;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 30;

    this._paintGlow(interceptors);

    // ---- background -------------------------------------------------------
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#03100b';
    ctx.fillRect(0, 0, S, S);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
    ctx.clip();
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 14);
    grd.addColorStop(0, '#0a2c1f');
    grd.addColorStop(0.72, '#061a13');
    grd.addColorStop(1, '#04120d');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, S, S);
    // ground clutter and receiver noise
    for (const s of this.clutter) {
      const tw = 0.6 + 0.4 * Math.sin(this.time * 3 + s.phase);
      ctx.fillStyle = `rgba(90,225,155,${(s.alpha * tw).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(s.a) * s.r * R, cy + Math.sin(s.a) * s.r * R, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ---- range rings, bearing scale --------------------------------------
    ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let i = 1; i <= 4; i++) {
      const r = (i / 4) * R;
      ctx.strokeStyle = i === 4 ? 'rgba(90,240,175,0.55)' : 'rgba(70,228,158,0.3)';
      ctx.lineWidth = i === 4 ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(96,232,170,0.55)';
      ctx.fillText(`${((this.range * i) / 4000).toFixed(0)}`, cx + 5, cy - r + 13);
    }
    // radial spokes every 30 degrees
    ctx.strokeStyle = 'rgba(64,224,150,0.11)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    // bearing ticks every 5 degrees, numbered every 30
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 - Math.PI / 2;
      const major = i % 6 === 0;
      ctx.strokeStyle = major ? 'rgba(80,235,165,0.45)' : 'rgba(64,224,150,0.2)';
      ctx.lineWidth = major ? 1.6 : 1;
      const inner = major ? R - 12 : R - 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(96,232,170,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const a = (deg * Math.PI) / 180 - Math.PI / 2;
      ctx.fillText(String(deg).padStart(3, '0'), cx + Math.cos(a) * (R + 15), cy + Math.sin(a) * (R + 15));
    }
    ctx.fillStyle = 'rgba(150,255,205,0.9)';
    ctx.font = 'bold 14px "Roboto Mono", ui-monospace, monospace';
    ctx.fillText('N', cx, cy - R + 22);

    // ---- phosphor layer ---------------------------------------------------
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.glowCanvas, 0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';

    // crisp leading edge of the sweep, drawn fresh so it never smears
    const sweepA = this.sweep % (Math.PI * 2) - Math.PI / 2;
    const lg = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweepA) * R, cy + Math.sin(sweepA) * R);
    lg.addColorStop(0, 'rgba(200,255,230,0.15)');
    lg.addColorStop(1, 'rgba(200,255,230,0.85)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepA) * R, cy + Math.sin(sweepA) * R);
    ctx.stroke();

    // ---- own site and batteries ------------------------------------------
    ctx.fillStyle = 'rgba(170,255,215,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,255,205,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();
    for (const b of batteries) {
      const p = this.worldToScope(b.group.position);
      const sel = b === selectedBattery;
      const ready = b.status === 'READY';
      ctx.strokeStyle = sel ? 'rgba(200,255,230,0.95)' : ready ? 'rgba(110,220,175,0.6)' : 'rgba(255,194,58,0.6)';
      ctx.lineWidth = sel ? 2 : 1.2;
      ctx.beginPath();
      ctx.rect(p.x - 5, p.y - 5, 10, 10);
      ctx.stroke();
      if (sel) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ---- interceptors -----------------------------------------------------
    for (const it of interceptors) {
      const p = this.worldToScope(it.pos);
      ctx.strokeStyle = 'rgba(140,232,255,0.95)';
      ctx.lineWidth = 1.7;
      // friendly symbol: half circle opening downwards
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, Math.PI, 0);
      ctx.lineTo(p.x - 5.5, p.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,232,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + it.vel.x * 0.004, p.y + it.vel.z * 0.004);
      ctx.stroke();
      if (it.target && it.target.alive) {
        // thin line of sight to the assigned body
        const q = this.worldToScope(it.target.pos);
        ctx.strokeStyle = 'rgba(140,232,255,0.16)';
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ---- hostile tracks ---------------------------------------------------
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const tr of this.tracks) {
      const p = this.worldToScope(tr.threat.pos);
      const sel = this.selected === tr;
      const decoy = tr.classification === 'DECOY';
      const unsure = tr.classification === 'UNKNOWN' || tr.classification === 'UNCERTAIN';
      const col = decoy ? '255,200,60' : tr.engaged ? '255,154,68' : '255,72,54';

      // history breadcrumbs
      const hn = tr.history.length / 3;
      for (let i = 0; i < hn; i++) {
        const hp = this.worldToScope({ x: tr.history[i * 3], z: tr.history[i * 3 + 2] });
        ctx.fillStyle = `rgba(${col},${(0.05 + 0.22 * (i / Math.max(1, hn - 1))).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // predicted impact point and the dotted run-in to it
      const ip = this.worldToScope(tr.impact);
      if (tr.timeToImpact < 200) {
        ctx.strokeStyle = `rgba(${col},${sel ? 0.5 : 0.22})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ip.x, ip.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(${col},${sel ? 0.9 : 0.5})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ip.x - 4, ip.y - 4);
        ctx.lineTo(ip.x + 4, ip.y + 4);
        ctx.moveTo(ip.x + 4, ip.y - 4);
        ctx.lineTo(ip.x - 4, ip.y + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ip.x, ip.y, 6.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // velocity leader
      ctx.strokeStyle = `rgba(${col},0.6)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + tr.threat.vel.x * 0.006, p.y + tr.threat.vel.z * 0.006);
      ctx.stroke();

      // symbol: hostile diamond, hollow while the classification is soft
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.fillStyle = `rgba(${col},${decoy ? 0.12 : unsure ? 0.2 : 0.5})`;
      ctx.lineWidth = 1.8;
      if (unsure) ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 7.5);
      ctx.lineTo(p.x + 6.5, p.y);
      ctx.lineTo(p.x, p.y + 7.5);
      ctx.lineTo(p.x - 6.5, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (decoy) {
        // decoys carry a slash so they read instantly as do-not-engage
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y - 5);
        ctx.lineTo(p.x + 5, p.y + 5);
        ctx.stroke();
      }
      if (tr.engaged) {
        ctx.strokeStyle = 'rgba(140,232,255,0.9)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tr.assigned) {
        ctx.strokeStyle = 'rgba(255,220,120,0.8)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (sel) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.6;
        const b = 15;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.beginPath();
          ctx.moveTo(p.x + sx * b, p.y + sy * b - sy * 6);
          ctx.lineTo(p.x + sx * b, p.y + sy * b);
          ctx.lineTo(p.x + sx * b - sx * 6, p.y + sy * b);
          ctx.stroke();
        }
      }
      ctx.font = 'bold 11px "Roboto Mono", ui-monospace, monospace';
      ctx.fillStyle = sel ? 'rgba(255,255,255,0.95)' : `rgba(${col},0.95)`;
      ctx.fillText(tr.id, p.x + 11, p.y - 5);
      ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
      ctx.fillStyle = `rgba(${col},0.72)`;
      ctx.fillText(`${(tr.altitude / 1000).toFixed(0)}km ${tr.timeToImpact.toFixed(0)}s`, p.x + 11, p.y + 6);
    }

    // ---- selected-track callout ------------------------------------------
    this._drawScopeCallout(ctx, S);

    // ---- frame furniture --------------------------------------------------
    ctx.strokeStyle = 'rgba(70,235,160,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 13px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(130,245,195,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`RANGE ${(this.range / 1000).toFixed(0)} KM`, 14, 22);
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(96,232,170,0.6)';
    ctx.fillText('RING SPACING 15.5 KM', 14, 36);
    ctx.font = 'bold 13px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(130,245,195,0.9)';
    ctx.textAlign = 'right';
    ctx.fillText(`TRACKS ${this.tracks.length}`, S - 14, 22);
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(96,232,170,0.6)';
    ctx.fillText(`ROUNDS UP ${interceptors.length}`, S - 14, 36);

    // range scale bar
    ctx.strokeStyle = 'rgba(96,232,170,0.5)';
    ctx.lineWidth = 1.4;
    const barY = S - 20;
    const barW = R / 4;
    ctx.beginPath();
    ctx.moveTo(14, barY);
    ctx.lineTo(14 + barW, barY);
    ctx.moveTo(14, barY - 4);
    ctx.lineTo(14, barY + 4);
    ctx.moveTo(14 + barW, barY - 4);
    ctx.lineTo(14 + barW, barY + 4);
    ctx.stroke();
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(96,232,170,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`${(this.range / 4000).toFixed(0)} KM`, 18 + barW, barY + 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(130,245,195,0.8)';
    ctx.font = 'bold 11px "Roboto Mono", ui-monospace, monospace';
    ctx.fillText('SECTOR SEARCH / FICTIONAL', S - 14, S - 30);
    ctx.fillStyle = gameState === 'running' ? 'rgba(255,154,68,0.95)' : 'rgba(96,232,170,0.7)';
    ctx.fillText(gameState ? gameState.toUpperCase() : '', S - 14, S - 16);

    // ---- scanlines --------------------------------------------------------
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#000';
    for (let y = 0; y < S; y += 3) ctx.fillRect(0, y, S, 1);
    ctx.globalAlpha = 1;
  }

  _drawScopeCallout(ctx, S) {
    const tr = this.selected;
    const x = 14;
    const y = S - 132;
    const w = 216;
    const h = 96;
    ctx.fillStyle = 'rgba(3,20,14,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = tr ? 'rgba(255,255,255,0.55)' : 'rgba(70,235,160,0.3)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(96,232,170,0.75)';
    ctx.fillText('SELECTED TRACK', x + 8, y + 15);
    ctx.strokeStyle = 'rgba(70,235,160,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 20);
    ctx.lineTo(x + w - 8, y + 20);
    ctx.stroke();

    if (!tr) {
      ctx.fillStyle = 'rgba(120,180,160,0.6)';
      ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
      ctx.fillText('-- NONE --', x + 8, y + 40);
      ctx.fillStyle = 'rgba(96,232,170,0.45)';
      ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
      ctx.fillText('CLICK A TRACK OR PRESS T', x + 8, y + 56);
      return;
    }
    const decoy = tr.classification === 'DECOY';
    ctx.font = 'bold 15px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = decoy ? '#ffc23a' : '#ffffff';
    ctx.fillText(tr.id, x + 8, y + 38);
    ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = decoy ? 'rgba(255,215,130,0.9)' : 'rgba(255,150,130,0.95)';
    ctx.fillText(decoy ? 'DECOY - DO NOT ENGAGE' : tr.classification, x + 66, y + 38);
    ctx.fillStyle = 'rgba(200,235,222,0.9)';
    ctx.font = '11px "Roboto Mono", ui-monospace, monospace';
    ctx.fillText(`ALT ${(tr.altitude / 1000).toFixed(1)} KM`, x + 8, y + 55);
    ctx.fillText(`SPD ${tr.speed.toFixed(0)} M/S`, x + 112, y + 55);
    ctx.fillText(`RNG ${(tr.range / 1000).toFixed(0)} KM`, x + 8, y + 70);
    ctx.fillText(`BRG ${tr.bearing.toFixed(0).padStart(3, '0')}`, x + 112, y + 70);
    ctx.fillStyle = tr.engaged ? '#8fe4ff' : tr.assigned ? '#ffc23a' : 'rgba(150,190,178,0.85)';
    ctx.font = 'bold 11px "Roboto Mono", ui-monospace, monospace';
    const state = tr.engaged ? 'ROUND IN FLIGHT'
      : tr.assigned ? `ASSIGNED ${tr.assigned.spec.name}` : 'UNASSIGNED';
    ctx.fillText(state.slice(0, 26), x + 8, y + 87);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffc23a';
    ctx.fillText(`T-${tr.timeToImpact.toFixed(0)}S`, x + w - 8, y + 38);
    ctx.textAlign = 'left';
  }

  // -------------------------------------------------------------------------
  // Wall status panel
  // -------------------------------------------------------------------------

  _drawSide(batteries, selectedBattery, gameState) {
    const ctx = this.sideCtx;
    ctx.fillStyle = '#061410';
    ctx.fillRect(0, 0, SIDE_W, SIDE_H);
    ctx.fillStyle = 'rgba(60,224,160,0.1)';
    for (let y = 0; y < SIDE_H; y += 4) ctx.fillRect(0, y, SIDE_W, 1);

    // header
    ctx.fillStyle = 'rgba(20,60,46,0.9)';
    ctx.fillRect(0, 0, SIDE_W, 32);
    ctx.font = 'bold 16px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#8dffcc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('BATTERY STATUS', 14, 22);
    ctx.font = 'bold 13px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = gameState === 'running' ? '#ffc23a' : '#57c99b';
    ctx.textAlign = 'right';
    ctx.fillText((gameState || 'IDLE').toUpperCase(), SIDE_W - 14, 22);
    ctx.textAlign = 'left';

    let y = 56;
    ctx.font = '10px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#3f8f70';
    ctx.fillText('SYSTEM', 26, y - 12);
    ctx.fillText('STATE', 232, y - 12);
    ctx.fillText('ROUNDS', 350, y - 12);
    for (const b of batteries) {
      const sel = b === selectedBattery;
      if (sel) {
        ctx.fillStyle = 'rgba(109,255,176,0.1)';
        ctx.fillRect(8, y - 15, SIDE_W - 16, 26);
        ctx.fillStyle = '#6dffb0';
        ctx.fillRect(8, y - 15, 3, 26);
      }
      ctx.font = `${sel ? 'bold ' : ''}14px "Roboto Mono", ui-monospace, monospace`;
      ctx.fillStyle = sel ? '#d8fff0' : '#57c99b';
      ctx.fillText(b.spec.name, 26, y);
      const statusColor = b.status === 'READY' ? '#6dff9e' : b.status === 'EMPTY' ? '#ff5a48' : '#ffc23a';
      ctx.fillStyle = statusColor;
      ctx.fillText(b.status, 232, y);
      ctx.fillStyle = '#8fe8c4';
      ctx.textAlign = 'right';
      ctx.fillText(`${b.loaded}/${b.ammo}`, SIDE_W - 20, y);
      ctx.textAlign = 'left';
      // loaded-tube pips
      const pips = Math.min(8, b.spec.tubes);
      for (let i = 0; i < pips; i++) {
        ctx.fillStyle = i < b.loaded ? statusColor : 'rgba(255,255,255,0.12)';
        ctx.fillRect(350 + i * 9, y - 9, 6, 9);
      }
      y += 30;
    }

    y += 6;
    ctx.font = 'bold 14px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#8dffcc';
    ctx.fillText('AIR PICTURE', 14, y);
    ctx.textAlign = 'right';
    ctx.font = '12px "Roboto Mono", ui-monospace, monospace';
    ctx.fillStyle = '#3f8f70';
    ctx.fillText(`${this.tracks.length} TRACKED`, SIDE_W - 14, y);
    ctx.textAlign = 'left';
    y += 8;
    ctx.strokeStyle = 'rgba(120,255,200,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(SIDE_W - 14, y);
    ctx.stroke();
    y += 18;
    ctx.font = '12px "Roboto Mono", ui-monospace, monospace';
    if (!this.tracks.length) {
      ctx.fillStyle = '#3f8f70';
      ctx.fillText('-- NO CONTACTS --', 14, y);
    }
    for (const tr of this.tracks.slice(0, 5)) {
      const sel = this.selected === tr;
      const decoy = tr.classification === 'DECOY';
      if (sel) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(8, y - 12, SIDE_W - 16, 20);
      }
      ctx.fillStyle = sel ? '#ffffff' : decoy ? '#ffc23a' : '#ff8a72';
      ctx.fillText(tr.id, 14, y);
      ctx.fillStyle = decoy ? '#ffc23a' : '#9ad8c2';
      ctx.fillText(decoy ? 'DECOY' : tr.classification.slice(0, 9), 84, y);
      ctx.fillStyle = '#cfe8dd';
      ctx.textAlign = 'right';
      ctx.fillText(`${(tr.altitude / 1000).toFixed(0)}km`, 268, y);
      ctx.fillText(`${tr.speed.toFixed(0)}m/s`, 360, y);
      ctx.fillStyle = '#ffc23a';
      ctx.fillText(`T-${tr.timeToImpact.toFixed(0)}s`, 428, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = tr.engaged ? '#8fe4ff' : tr.assigned ? '#ffc23a' : '#3f8f70';
      ctx.fillText(tr.engaged ? 'ENG' : tr.assigned ? 'ASG' : '---', SIDE_W - 48, y);
      y += 20;
    }
  }
}

// ---------------------------------------------------------------------------
// Canvas label sprites for the hologram
// ---------------------------------------------------------------------------

function makeLabelSprite(w = 256, h = 64, { font = 30, align = 'left', pad = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.__draw = (lines, color, opts = {}) => {
    const rows = Array.isArray(lines) ? lines : [lines];
    ctx.clearRect(0, 0, w, h);
    if (opts.box) {
      ctx.fillStyle = 'rgba(2,16,12,0.72)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = opts.accent || 'rgba(140,255,210,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      ctx.fillStyle = opts.accent || '#8cffd2';
      ctx.fillRect(0, 0, 8, h);
    }
    const step = (h - pad * 2) / rows.length;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < rows.length; i++) {
      const first = i === 0 && rows.length > 1;
      ctx.font = `${first ? 'bold ' : ''}${first ? font + 4 : font}px "Roboto Mono", ui-monospace, monospace`;
      ctx.fillStyle = i === 0 ? color : (opts.body || 'rgba(200,235,222,0.92)');
      const x = align === 'center' ? w / 2 : pad + (opts.box ? 12 : 0);
      ctx.fillText(rows[i], x, pad + step * (i + 0.5));
    }
    tex.needsUpdate = true;
  };
  tex.__draw([''], '#fff');
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.center.set(0, 0.5);
  return s;
}

/** Pooled fading polyline used for track and interceptor history. */
function makeTrailLine(hex) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
  geo.setDrawRange(0, 0);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  line.material.color.setHex(hex);
  line.visible = false;
  line.frustumCulled = false;
  return line;
}

const _symbolCache = new Map();

/** Billboarded outline symbols (hollow diamond / chevron) for the hologram. */
function symbolTexture(kind) {
  if (_symbolCache.has(kind)) return _symbolCache.get(kind);
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'diamond') {
    ctx.moveTo(S / 2, 6);
    ctx.lineTo(S - 6, S / 2);
    ctx.lineTo(S / 2, S - 6);
    ctx.lineTo(6, S / 2);
    ctx.closePath();
  } else {
    ctx.moveTo(8, S - 14);
    ctx.lineTo(S / 2, 10);
    ctx.lineTo(S - 8, S - 14);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _symbolCache.set(kind, tex);
  return tex;
}

/** Ring plus cross used to mark a predicted ground impact in the hologram. */
function impactGeometry() {
  const pts = [];
  const r = 0.035;
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a0) * r, 0, Math.sin(a0) * r));
    pts.push(new THREE.Vector3(Math.cos(a1) * r, 0, Math.sin(a1) * r));
  }
  const c = r * 0.72;
  pts.push(new THREE.Vector3(-c, 0, -c), new THREE.Vector3(c, 0, c));
  pts.push(new THREE.Vector3(c, 0, -c), new THREE.Vector3(-c, 0, c));
  return new THREE.BufferGeometry().setFromPoints(pts);
}
