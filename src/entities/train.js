// A steam train that periodically rolls along the railway, stops at the depot and leaves again.
import * as THREE from 'three';
import { makeEntityMaterial, canvasTexture } from '../entityMaterial.js';
import { RAIL_Z } from '../worldgen.js';
import { TOWN_GROUND } from '../constants.js';

function tex(painter, w = 16, h = 16) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  painter(c.getContext('2d'), w, h);
  return canvasTexture(c);
}

export class Train {
  constructor(scene, world, audio, particles) {
    this.world = world;
    this.audio = audio;
    this.particles = particles;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.y = TOWN_GROUND + 1;
    this.z = RAIL_Z + 0.5;
    this.x = -420;
    this.dir = 1;              // +1 travelling east
    this.speed = 0;
    this.maxSpeed = 9;
    this.state = 'approach';   // approach | stopped | depart | away
    this.timer = 0;
    this.stopX = 4;            // locomotive front stops near the depot centre
    this.whistled = false;
    this.chuffTimer = 0;
    this.smokeTimer = 0;
    this.prevX = this.x;
    this.build();
  }

  build() {
    const g = this.group;
    const dark = makeEntityMaterial(tex((ctx) => { ctx.fillStyle = '#2e2e34'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#3c3c44'; for (let i = 0; i < 30; i++) ctx.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 8, 16, 1); }));
    const red = makeEntityMaterial(tex((ctx) => { ctx.fillStyle = '#7a1e1a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#5a1410'; ctx.fillRect(0, 12, 16, 1); ctx.fillRect(0, 3, 16, 1); }));
    const brass = makeEntityMaterial(tex((ctx) => { ctx.fillStyle = '#b08a3a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#d4aa50'; ctx.fillRect(2, 2, 12, 2); }));
    const green = makeEntityMaterial(tex((ctx) => { ctx.fillStyle = '#2f4a3a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#c9a15a'; ctx.fillRect(0, 2, 16, 1); ctx.fillRect(0, 13, 16, 1); }));
    const winTex = makeEntityMaterial(tex((ctx) => { ctx.fillStyle = '#2f4a3a'; ctx.fillRect(0, 0, 32, 16); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#f5d98a'; ctx.fillRect(2 + i * 8, 4, 5, 7); ctx.fillStyle = '#c9a15a'; ctx.fillRect(1 + i * 8, 3, 7, 1); ctx.fillRect(1 + i * 8, 11, 7, 1); } }, 32, 16));
    winTex.uniforms.uLight.value.set(1, 1); // lit windows glow at night
    this.windowMat = winTex;
    this.materials = [dark, red, brass, green, winTex];
    const box = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
    // Locomotive (front at +x)
    box(dark, 7.5, 2.4, 2.4, 3.5, 2.2, 0);          // boiler
    box(dark, 1.2, 1.2, 2.6, 7.4, 1.6, 0);          // smokebox front
    box(brass, 0.6, 0.6, 2.8, 7.4, 2.2, 0);
    box(dark, 0.8, 1.6, 0.8, 6.2, 4.0, 0);          // chimney
    box(dark, 1.2, 0.4, 1.2, 6.2, 4.9, 0);
    box(brass, 0.9, 0.7, 0.9, 3.2, 3.6, 0);         // steam dome
    box(red, 3.0, 3.2, 2.8, -1.2, 2.6, 0);          // cab
    box(dark, 3.4, 0.3, 3.2, -1.2, 4.35, 0);        // cab roof
    box(dark, 8.5, 0.5, 3.0, 2.2, 0.85, 0);         // frame
    box(red, 1.6, 1.0, 2.6, 7.6, 0.9, 0);           // cowcatcher block
    for (const wx of [0.5, 2.5, 4.5]) { box(dark, 1.4, 1.4, 0.3, wx, 0.9, 1.35); box(dark, 1.4, 1.4, 0.3, wx, 0.9, -1.35); }
    box(brass, 0.6, 0.6, 0.6, 5.2, 1.2, 1.4); box(brass, 0.6, 0.6, 0.6, 5.2, 1.2, -1.4); // lamps
    // Tender
    box(red, 5.0, 2.4, 2.6, -6.5, 1.9, 0);
    box(dark, 4.4, 0.6, 2.0, -6.5, 3.3, 0);         // coal
    box(dark, 5.2, 0.4, 3.0, -6.5, 0.85, 0);
    for (const wx of [-5.2, -7.8]) { box(dark, 1.2, 1.2, 0.3, wx, 0.8, 1.35); box(dark, 1.2, 1.2, 0.3, wx, 0.8, -1.35); }
    // Passenger cars
    for (let c = 0; c < 2; c++) {
      const cx = -15.5 - c * 10.5;
      box(green, 9.5, 2.9, 2.7, cx, 2.15, 0);
      const wl = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.4, 2.8), winTex); wl.position.set(cx, 2.4, 0); g.add(wl);
      box(dark, 9.9, 0.3, 3.0, cx, 3.75, 0);
      box(dark, 9.8, 0.4, 3.0, cx, 0.85, 0);
      for (const wx of [cx - 3.5, cx + 3.5]) { box(dark, 1.2, 1.2, 0.3, wx, 0.8, 1.35); box(dark, 1.2, 1.2, 0.3, wx, 0.8, -1.35); }
      box(dark, 0.8, 1.4, 2.6, cx + 5.1, 2.0, 0); // coupling area
    }
    g.position.set(this.x, this.y, this.z);
  }

  tick(player) {
    const dt = 0.05;
    this.prevX = this.x;
    this.timer += dt;
    switch (this.state) {
      case 'approach': {
        const target = this.stopX;
        const dist = (target - this.x) * this.dir;
        const stopDist = (this.speed * this.speed) / (2 * 2.2);
        if (dist > stopDist + 0.5) this.speed = Math.min(this.maxSpeed, this.speed + 2.5 * dt);
        else this.speed = Math.max(0, this.speed - 2.2 * dt);
        if (Math.abs(this.x - target) > 200) this.whistled = false;
        if (!this.whistled && Math.abs(this.x - target) < 150) { this.whistled = true; this.audio.trainWhistle(this.pos()); }
        if (dist <= 0.3 || (this.speed <= 0.02 && dist < 3)) { this.speed = 0; this.state = 'stopped'; this.timer = 0; this.audio.trainChuff(this.pos(), 0); }
        break;
      }
      case 'stopped':
        if (this.timer > 28) { this.state = 'depart'; this.timer = 0; this.audio.trainWhistle(this.pos()); }
        break;
      case 'depart':
        this.speed = Math.min(this.maxSpeed, this.speed + 1.4 * dt);
        if (Math.abs(this.x) > 460) { this.state = 'away'; this.timer = 0; this.speed = 0; }
        break;
      case 'away':
        if (this.timer > 45) { this.dir = -this.dir; this.x = -this.dir * 430; this.state = 'approach'; this.timer = 0; this.whistled = false; this.prevX = this.x; }
        break;
      default: break;
    }
    this.x += this.speed * this.dir * dt;
    // chuffing
    if (this.speed > 0.1) {
      this.chuffTimer -= dt * (0.6 + this.speed / 4);
      if (this.chuffTimer <= 0) { this.chuffTimer = 0.5; this.audio.trainChuff(this.pos(), this.speed); }
    }
    // push the player off the track if the locomotive runs through them
    const p = player.pos;
    if (Math.abs(p.z - this.z) < 2.2 && Math.abs(p.x - this.x + 2 * this.dir) < 26 && p.y < this.y + 4 && p.y > this.y - 1) {
      const push = p.z < this.z ? -1 : 1;
      player.vel.z += push * 0.6; player.vel.x += this.dir * this.speed * 0.02; player.vel.y = Math.max(player.vel.y, 0.3);
      if (this.speed > 3 && !player.dead) player.damage(2);
    }
  }

  pos() { return new THREE.Vector3(this.x, this.y + 2, this.z); }

  render(alpha, dt) {
    const x = this.prevX + (this.x - this.prevX) * alpha;
    this.group.position.set(x, this.y, this.z);
    this.group.rotation.y = this.dir > 0 ? 0 : Math.PI;
    this.group.visible = Math.abs(x) < 520;
    // world light for the train body
    const l = this.world.sampleLight(x, this.y + 2, this.z);
    for (const m of this.materials) if (m !== this.windowMat) m.uniforms.uLight.value.set(l[0], l[1]);
    // smoke
    this.smokeTimer += dt;
    const gap = this.speed > 0.5 ? 0.09 : 0.4;
    if (this.smokeTimer > gap && this.group.visible) {
      this.smokeTimer = 0;
      const cx = x + 6.2 * this.dir;
      this.particles.smoke(cx, this.y + 5.2, this.z, true);
    }
  }
}
