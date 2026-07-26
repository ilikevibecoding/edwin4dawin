import * as THREE from 'three';
import { rand, randRange, randSpread } from '../core/rand.js';

const _v = new THREE.Vector3();

/**
 * Airstrike killstreak. Press [4] when available -> tactical map -> click target.
 * Three jets sweep the map and lay a line of bombs across the target.
 * API: grant(), callAt(worldPos, {immediate}), available
 */
export class Airstrike {
  constructor(game) {
    this.game = game;
    this.available = 0;
    this.selecting = false;
    this.cursor = new THREE.Vector2(0, 0); // world xz on map
    this.strikes = [];
    this.jets = [];

    this._buildMapOverlay();
    this._buildJetProto();
  }

  grant() { this.available++; }

  _buildMapOverlay() {
    const el = document.createElement('div');
    el.id = 'strikemap';
    el.innerHTML = `
      <style>
        #strikemap { position: fixed; inset: 0; z-index: 40; display: none;
          background: rgba(4,8,6,.82); align-items: center; justify-content: center;
          font-family: 'Rajdhani', sans-serif; color: #cfe8d2; }
        #strikemap.on { display: flex; }
        #strikemap .wrap { position: relative; }
        #strikemap canvas { outline: 2px solid rgba(140,220,160,.5); box-shadow: 0 0 60px rgba(0,0,0,.8);
          background: #0a120c; }
        #strikemap .title { position: absolute; top: -44px; left: 0; font-size: 22px;
          letter-spacing: 6px; font-weight: 700; color: #a8e8b0; }
        #strikemap .hint { position: absolute; bottom: -34px; left: 0; font-size: 15px;
          letter-spacing: 3px; opacity: .75; }
      </style>
      <div class="wrap">
        <div class="title">SELECT AIRSTRIKE TARGET</div>
        <canvas width="560" height="560"></canvas>
        <div class="hint">CLICK TO CONFIRM · [4] CANCEL</div>
      </div>
    `;
    document.body.appendChild(el);
    this.mapEl = el;
    this.mapCanvas = el.querySelector('canvas');
    this.mapCtx = this.mapCanvas.getContext('2d');
  }

  _buildJetProto() {
    // simple jet silhouette (upgraded later)
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.4, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.28, 9, 10), mat);
    body.rotation.x = Math.PI / 2;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.12, 2.6), mat);
    wing.position.z = 0.6;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1.4), mat);
    tail.position.z = 3.9;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1.3), mat);
    fin.position.set(0, 0.7, 3.9);
    g.add(body, wing, tail, fin);
    this.jetProto = g;
  }

  toggleSelect() {
    if (this.selecting) { this._closeMap(); return; }
    if (this.available <= 0) return;
    this.selecting = true;
    this.cursor.set(this.game.player.position.x, this.game.player.position.z);
    this.mapEl.classList.add('on');
    this.game.hud.hide();
  }

  _closeMap() {
    this.selecting = false;
    this.mapEl.classList.remove('on');
    this.game.hud.show();
  }

  /** @param {THREE.Vector3} target */
  callAt(target, { immediate = false } = {}) {
    this.game.events.emit('airstrike:called', { target: target.clone() });
    this.game.events.emit('ui:message', { text: 'AIRSTRIKE INBOUND', sub: 'DANGER CLOSE' });
    const delay = immediate ? 0.3 : 2.2;
    // approach along a random cardinal-ish direction
    const angle = rand() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    this.strikes.push({ target: target.clone(), dir, t: -delay, bombs: [], jetsSpawned: false, announced: false });
  }

  update(dt) {
    const { input, events, player, world } = this.game;

    if (input.pressed('Digit4')) this.toggleSelect();

    if (this.selecting) {
      // move cursor with mouse deltas (pointer stays locked)
      this.cursor.x += input.mouseDX * 0.32;
      this.cursor.y += input.mouseDY * 0.32;
      const H = world.bounds.half;
      this.cursor.x = THREE.MathUtils.clamp(this.cursor.x, -H, H);
      this.cursor.y = THREE.MathUtils.clamp(this.cursor.y, -H, H);
      this._drawMap();
      if (input.mousePressed(0)) {
        this.available--;
        this.callAt(new THREE.Vector3(this.cursor.x, 0, this.cursor.y));
        this._closeMap();
      }
      // swallow fire input while map open
      input.mouseDown.delete(0);
    }

    // strikes
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;

      if (!s.announced && s.t > -1.6) {
        s.announced = true;
        events.emit('airstrike:incoming', {});
      }

      // jets appear 1.2s before impact, cross over target
      if (!s.jetsSpawned && s.t > -0.2) {
        s.jetsSpawned = true;
        const JET_SPEED = 110, ALT = 55, LEAD = 2.2;
        for (let j = 0; j < 3; j++) {
          const jet = this.jetProto.clone();
          const side = s.dir.clone().cross(new THREE.Vector3(0, 1, 0));
          const offset = side.multiplyScalar((j - 1) * 14);
          const start = s.target.clone()
            .addScaledVector(s.dir, -JET_SPEED * LEAD)
            .add(offset);
          start.y = ALT + j * 2;
          jet.position.copy(start);
          jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), s.dir);
          this.game.scene.add(jet);
          this.jets.push({ mesh: jet, vel: s.dir.clone().multiplyScalar(JET_SPEED), ttl: 8 });
        }
        // schedule bombs in a line through target along dir
        const N = 9;
        for (let b = 0; b < N; b++) {
          const along = (b - (N - 1) / 2) * 7.5;
          const p = s.target.clone().addScaledVector(s.dir, along);
          p.x += randSpread(3.5);
          p.z += randSpread(3.5);
          const hit = world.colliders.raycast(new THREE.Vector3(p.x, 60, p.z), new THREE.Vector3(0, -1, 0), 80);
          const ground = hit ? hit.point.y : 0;
          s.bombs.push({ pos: new THREE.Vector3(p.x, ground, p.z), t: 1.35 + b * 0.14 + rand() * 0.05, done: false });
        }
      }

      let allDone = s.jetsSpawned;
      for (const b of s.bombs) {
        if (!b.done && s.t >= b.t) {
          b.done = true;
          events.emit('explosion', { position: b.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), radius: 9, damage: 165 });
          events.emit('airstrike:impact', { position: b.pos.clone(), index: s.bombs.indexOf(b) });
          // tag airstrike kills
          for (const e of this.game.ai.enemies) {
            if (!e.alive && !e._counted && e.deathT > 5.9) { e._counted = true; }
          }
          this.game.vfx.smokeColumn(b.pos, { rate: 3, size: 1.4, life: 7 });
        }
        if (!b.done) allDone = false;
      }
      if (allDone && s.t > 6) this.strikes.splice(i, 1);
    }

    // jets fly
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.mesh.position.addScaledVector(j.vel, dt);
      j.ttl -= dt;
      if (j.ttl <= 0) {
        this.game.scene.remove(j.mesh);
        this.jets.splice(i, 1);
      }
    }
  }

  _drawMap() {
    const g = this.mapCtx;
    const W = 560;
    const H = this.game.world.bounds.half;
    const scale = W / (H * 2);
    g.clearRect(0, 0, W, W);

    // grid
    g.strokeStyle = 'rgba(120,200,140,.14)';
    g.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * W;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, W); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke();
    }

    const toPx = (x, z) => [(x + H) * scale, (z + H) * scale];

    // buildings from navgrid
    const grid = this.game.world.navgrid;
    g.fillStyle = 'rgba(150,230,170,.22)';
    const step = 2;
    for (let iz = 0; iz < grid.n; iz += step) {
      for (let ix = 0; ix < grid.n; ix += step) {
        if (!grid.blocked[grid.idx(ix, iz)]) continue;
        const w = grid.toWorld(ix, iz);
        const [px, pz] = toPx(w.x, w.z);
        g.fillRect(px, pz, step * grid.cell * scale, step * grid.cell * scale);
      }
    }

    // enemies
    g.fillStyle = '#ff5040';
    for (const e of this.game.ai.enemies) {
      if (!e.alive) continue;
      const [px, pz] = toPx(e.position.x, e.position.z);
      g.beginPath(); g.arc(px, pz, 4, 0, Math.PI * 2); g.fill();
    }

    // player
    const p = this.game.player.position;
    const [px, pz] = toPx(p.x, p.z);
    g.fillStyle = '#ffd166';
    g.save();
    g.translate(px, pz);
    g.rotate(-this.game.player.yaw);
    g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(-5.5, 6); g.closePath(); g.fill();
    g.restore();

    // cursor reticle
    const [cx, cz] = toPx(this.cursor.x, this.cursor.y);
    g.strokeStyle = '#ff4a3a';
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cz, 26, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cz, 3, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    g.moveTo(cx - 38, cz); g.lineTo(cx - 14, cz);
    g.moveTo(cx + 14, cz); g.lineTo(cx + 38, cz);
    g.moveTo(cx, cz - 38); g.lineTo(cx, cz - 14);
    g.moveTo(cx, cz + 14); g.lineTo(cx, cz + 38);
    g.stroke();
  }
}
