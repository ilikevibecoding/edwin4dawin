import * as THREE from 'three';
import { getMaterialLib } from '../world/textures.js';

/**
 * CAS-9 air strike: targeting tablet → marker smoke → 3-jet flyby →
 * bomb release → walking stick of heavy detonations across the target line.
 */

function buildJet() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x5a636b, roughness: 0.38, metalness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.4, metalness: 0.6 });

  // Fuselage
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 9.5, 12), body);
  fus.rotation.x = Math.PI / 2;
  g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 12), body);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -6;
  g.add(nose);
  // Canopy
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshStandardMaterial({ color: 0x161c22, roughness: 0.06, metalness: 0.9 }));
  can.scale.set(0.72, 0.55, 1.7);
  can.position.set(0, 0.5, -3.4);
  g.add(can);
  // Wings (swept)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(4.6, -2.6); wingShape.lineTo(4.6, -3.6); wingShape.lineTo(0, -2.4); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(wingGeo, body);
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = s;
    wing.position.set(s * 0.4, 0, 1.2);
    g.add(wing);
  }
  // Tail fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(1.4, -0.5); finShape.lineTo(1.4, -1.1); finShape.lineTo(0, -1.6); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: false });
  for (const s of [1, -1]) {
    const vfin = new THREE.Mesh(finGeo, dark);
    vfin.rotation.z = Math.PI / 2 - s * 0.35;
    vfin.rotation.x = 0;
    vfin.position.set(s * 0.5, 0.35, 3.6);
    vfin.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0);
    vfin.rotation.y = Math.PI / 2;
    g.add(vfin);
    const hfin = new THREE.Mesh(finGeo, body);
    hfin.rotation.x = Math.PI / 2;
    hfin.scale.x = s;
    hfin.position.set(s * 0.4, -0.05, 3.4);
    g.add(hfin);
  }
  // Engine nozzles + glow
  for (const s of [0.32, -0.32]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 10), dark);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(s, 0, 4.9);
    g.add(noz);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10), new THREE.MeshBasicMaterial({ color: 0xff8830, toneMapped: false }));
    glow.position.set(s, 0, 5.32);
    g.add(glow);
  }
  // Underwing ordnance
  for (const s of [1.6, -1.6, 2.8, -2.8]) {
    const bomb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8), dark);
    bomb.rotation.x = Math.PI / 2;
    bomb.position.set(s, -0.5, 1.1);
    g.add(bomb);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class AirstrikeSystem {
  constructor({ scene, fx, explosions, decals, audio, enemies, hud, getPlayerPos, onPlayerDamage, minimapShapes, halfSize }) {
    this.scene = scene;
    this.fx = fx;
    this.explosions = explosions;
    this.decals = decals;
    this.audio = audio;
    this.enemies = enemies;
    this.hud = hud;
    this.getPlayerPos = getPlayerPos;
    this.onPlayerDamage = onPlayerDamage;
    this.minimapShapes = minimapShapes;
    this.halfSize = halfSize;
    this.onKillsScored = null;

    this.state = 'idle';   // idle | targeting | inbound
    this.charges = 1;
    this.timeline = 0;
    this.target = new THREE.Vector3();
    this.jets = [];
    this.bombs = [];
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.trailAcc = 0;

    this.tablet = document.getElementById('tablet');
    this.tabletMap = document.getElementById('tablet-map');
    this.reticle = document.getElementById('tablet-reticle');
    this.coordEl = document.getElementById('tablet-coord');
    this.coordEl.textContent = this._gridRef(0, 0); // map center until the cursor moves
    this.onClose = null;

    this.tabletMap.parentElement.addEventListener('mousemove', (e) => {
      if (this.state !== 'targeting') return;
      const rect = this.tabletMap.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.halfSize * 2;
      this.coordEl.textContent = this._gridRef(wx, wz);
      this.reticle.classList.remove('hidden');
      this.reticle.style.left = `${e.clientX - rect.left}px`;
      this.reticle.style.top = `${e.clientY - rect.top}px`;
    });
    this.tabletMap.parentElement.addEventListener('mousedown', (e) => {
      if (this.state !== 'targeting' || e.button !== 0) return;
      const rect = this.tabletMap.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.halfSize * 2;
      this.confirmTarget(new THREE.Vector3(wx, 0, wz));
    });
  }

  get ready() { return this.charges > 0 && this.state === 'idle'; }

  /** Format world coords as a 4+4 grid reference, e.g. "GRID 0421 0863". */
  _gridRef(wx, wz) {
    const S = this.halfSize;
    const g = (v) => String(Math.max(0, Math.min(9999, Math.round(((v + S) / (2 * S)) * 9999)))).padStart(4, '0');
    return `GRID ${g(wx)} ${g(wz)}`;
  }

  openTargeting() {
    if (!this.ready) return false;
    this.state = 'targeting';
    this.tablet.classList.remove('hidden');
    this.drawTabletMap();
    this.audio.uiClick();
    this.audio.radio();
    return true;
  }

  cancelTargeting() {
    if (this.state !== 'targeting') return;
    this.state = 'idle';
    this.tablet.classList.add('hidden');
    if (this.onClose) this.onClose(false);
  }

  confirmTarget(worldPos) {
    this.charges--;
    this.state = 'inbound';
    this.timeline = 0;
    this.target.copy(worldPos);
    this.tablet.classList.add('hidden');
    this.audio.uiClick(true);
    this.audio.radio();
    this.hud.centerMessage('AIR STRIKE INBOUND — DANGER CLOSE', 2.6);
    this.hud.killfeed('OVERLORD', 'CAS-9 STRIKE PACKAGE EN ROUTE', true);
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.bombs = [];
    if (this.onClose) this.onClose(true);

    // Red marker smoke at target
    this.markerT = 0;
  }

  drawTabletMap() {
    const c = this.tabletMap.getContext('2d');
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const S = this.halfSize;
    const toX = (x) => ((x + S) / (S * 2)) * W;
    const toY = (z) => ((z + S) / (S * 2)) * H;

    c.fillStyle = '#0a1410';
    c.fillRect(0, 0, W, H);
    // Grid
    c.strokeStyle = 'rgba(110, 220, 160, 0.12)';
    c.lineWidth = 1;
    for (let i = 0; i <= 14; i++) {
      c.beginPath(); c.moveTo((i / 14) * W, 0); c.lineTo((i / 14) * W, H); c.stroke();
      c.beginPath(); c.moveTo(0, (i / 14) * H); c.lineTo(W, (i / 14) * H); c.stroke();
    }
    // Roads
    for (const s of this.minimapShapes) {
      if (s.type !== 'road') continue;
      c.fillStyle = 'rgba(140, 235, 180, 0.10)';
      c.fillRect(toX(s.x - s.w / 2), toY(s.z - s.d / 2), (s.w / (S * 2)) * W, (s.d / (S * 2)) * H);
    }
    // Buildings: faint fill + phosphor outline (plan-view instrument look)
    c.strokeStyle = 'rgba(140, 255, 190, 0.55)';
    c.lineWidth = 1;
    for (const s of this.minimapShapes) {
      if (s.type === 'road') continue;
      const x = Math.round(toX(s.x - s.w / 2));
      const y = Math.round(toY(s.z - s.d / 2));
      const w = Math.max(2, Math.round((s.w / (S * 2)) * W));
      const h = Math.max(2, Math.round((s.d / (S * 2)) * H));
      c.fillStyle = s.type === 'b' ? 'rgba(120, 230, 170, 0.12)' : 'rgba(120, 230, 170, 0.07)';
      c.fillRect(x, y, w, h);
      c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    // Hostile blips
    for (const e of this.enemies.enemies) {
      if (!e.alive) continue;
      c.fillStyle = '#ff5040';
      c.beginPath();
      c.arc(toX(e.pos.x), toY(e.pos.z), 4, 0, 7);
      c.fill();
    }
    // Player
    const p = this.getPlayerPos();
    c.fillStyle = '#8af0b8';
    c.beginPath();
    c.arc(toX(p.x), toY(p.z), 5, 0, 7);
    c.fill();
    c.strokeStyle = '#8af0b8';
    c.beginPath();
    c.arc(toX(p.x), toY(p.z), 9, 0, 7);
    c.stroke();
    // Labels
    c.fillStyle = 'rgba(150, 240, 190, 0.6)';
    c.font = "700 11px Consolas, Menlo, 'DejaVu Sans Mono', 'Liberation Mono', monospace";
    c.fillText('MAIN ST', toX(-40), toY(0) - 10);
    c.fillText('N', 12, 18);
  }

  _spawnJets() {
    const dir = new THREE.Vector3(1, 0, 0); // strike run west→east
    this.strikeDir = dir;
    const startX = this.target.x - 420;
    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      jet.scale.setScalar(1.45);
      const off = i === 0 ? 0 : i === 1 ? -19 : 19;
      const lag = i === 0 ? 0 : 30;
      jet.position.set(startX - lag, 46 + i * 2.5, this.target.z + off);
      jet.rotation.y = -Math.PI / 2; // nose toward +X
      this.scene.add(jet);
      this.jets.push({ mesh: jet, speed: 170, dropped: i !== 0 });
      // Only lead jet drops in a strafe line; wingmen escort
    }
    this.audio.jetFlyby(4.2);
  }

  _dropBombs(jet) {
    for (let i = 0; i < 7; i++) {
      this.bombs.push({
        mesh: null,
        jet,
        delay: i * 0.085,
        pos: null,
        vel: null,
        exploded: false,
        idx: i,
      });
    }
    this.audio.bombWhistle(1.9);
  }

  _activateBomb(b) {
    b.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x30363b, roughness: 0.4, metalness: 0.6 })
    );
    b.mesh.rotation.z = Math.PI / 2;
    this.scene.add(b.mesh);
    b.pos = b.jet.mesh.position.clone();
    b.pos.y -= 1.4;
    b.vel = new THREE.Vector3(b.jet.speed * 0.5, -10, 0);
  }

  update(dt) {
    if (this.state === 'targeting') {
      this.drawTabletMap();
      return;
    }
    if (this.state !== 'inbound') return;

    const prevT = this.timeline;
    this.timeline += dt;
    const t = this.timeline;

    // Marker smoke (red) rising at target
    if (t < 4.2) {
      this.markerT -= dt;
      if (this.markerT <= 0) {
        this.markerT = 0.08;
        this.fx.smoke.spawn({
          pos: this.target.clone().add(new THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5)),
          vel: new THREE.Vector3(0.5, 3.2 + Math.random() * 1.5, 0.2),
          life: 2.6, size0: 0.5, size1: 2.6,
          color0: new THREE.Color(0.75, 0.1, 0.08), color1: new THREE.Color(0.5, 0.12, 0.1),
          alpha0: 0.6, alpha1: 0, fadeIn: 0.1,
        });
      }
      if (prevT === 0) {
        this.fx.lights.flash(this.target.clone().add(new THREE.Vector3(0, 1, 0)), { color: 0xff3020, intensity: 30, life: 3.5, distance: 14 });
      }
    }

    // Jets in at t=2
    if (prevT < 2 && t >= 2) this._spawnJets();

    // Move jets + contrails
    for (const j of this.jets) {
      j.mesh.position.x += j.speed * dt;
      // Bomb release ~184m short of target (ballistic lead for the stick)
      if (!j.dropped && j.mesh.position.x > this.target.x - 184) {
        j.dropped = true;
        this._dropBombs(j);
      }
      // Wingtip contrails
      this.trailAcc += dt;
      if (this.trailAcc > 0.03) {
        for (const s of [-4.7, 4.7]) {
          this.fx.smoke.spawn({
            pos: j.mesh.position.clone().add(new THREE.Vector3(-1.5, 0, s)),
            vel: new THREE.Vector3(0, 0.1, 0),
            life: 1.6, size0: 0.5, size1: 1.8,
            color0: new THREE.Color(0.95, 0.95, 0.97), color1: new THREE.Color(0.9, 0.9, 0.92),
            alpha0: 0.4, alpha1: 0, fadeIn: 0,
          });
        }
      }
    }
    if (this.trailAcc > 0.03) this.trailAcc = 0;

    // Bombs fall
    for (const b of this.bombs) {
      if (b.exploded) continue;
      if (!b.mesh) {
        b.delay -= dt;
        if (b.delay <= 0) this._activateBomb(b);
        continue;
      }
      b.vel.y -= 22 * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.z = Math.atan2(-b.vel.y, b.vel.x);
      if (b.pos.y <= 0.4) {
        b.exploded = true;
        this.scene.remove(b.mesh);
        const ep = new THREE.Vector3(b.pos.x, 0, this.target.z + (Math.random() - 0.5) * 9);
        this.explosions.spawn(ep, { radius: 9, big: true });
        const playerPos = this.getPlayerPos();
        const distToPlayer = ep.distanceTo(playerPos);
        this.audio.explosion({ dist: distToPlayer, big: true });
        const kills = this.enemies.damageInRadius(ep, 11, 320, true, 'CAS-9');
        if (kills > 0 && this.onKillsScored) this.onKillsScored(kills);
        if (distToPlayer < 12 && this.onPlayerDamage) {
          this.onPlayerDamage(Math.max(10, 90 - distToPlayer * 7), ep);
        }
        this.explosionsFired++;
      }
    }

    // Cleanup
    if (t > 6) {
      for (const j of this.jets) {
        if (j.mesh.position.x > this.target.x + 480) {
          this.scene.remove(j.mesh);
        }
      }
    }
    if (t > 11) {
      for (const j of this.jets) this.scene.remove(j.mesh);
      this.jets = [];
      for (const b of this.bombs) if (!b.exploded) this.scene.remove(b.mesh);
      this.bombs = [];
      this.state = 'idle';
    }
  }
}
