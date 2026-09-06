// Speech bubbles for the crowd: the town's name-tag technique (pixel font on a canvas -> sprite above the head) in a
// small pool, so ambient chatter never allocates per line. A bubble follows its speaker and fades after a few seconds.
import * as THREE from 'three';
import { drawText, measureText } from '../../font.js';

const POOL = 14, SCALE = 2, LINE_W = 46, SHOW_S = 4.5, NEAR = 6;

function wrap(text, max) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export class Bubbles {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'crowd-bubbles';
    scene.add(this.group);
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      const c = document.createElement('canvas'); c.width = 8; c.height = 8;
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      sp.renderOrder = 11;
      this.group.add(sp);
      this.items.push({ sprite: sp, canvas: c, tex, npc: null, until: 0, mat });
    }
    this.now = 0;
  }

  // Show `text` over `npc` (its bubble is replaced if it already has one); the oldest bubble is recycled when full.
  say(npc, text, now, seconds = SHOW_S) {
    let it = this.items.find((b) => b.npc === npc) || this.items.find((b) => !b.npc);
    if (!it) { it = this.items.reduce((a, b) => (a.until < b.until ? a : b)); }
    const lines = wrap(text, LINE_W);
    const w = Math.max(...lines.map((l) => measureText(l, SCALE))) + 10, h = lines.length * 9 * SCALE + 8;
    const c = it.canvas; c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(12, 14, 22, 0.78)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(120, 160, 220, 0.9)'; ctx.fillRect(0, h - 2, w, 2);
    lines.forEach((l, i) => drawText(ctx, l, 5, 4 + i * 9 * SCALE, SCALE, '#f4f1e6', true));
    it.tex.image = c; it.tex.needsUpdate = true;
    it.w = w; it.h = h;
    it.sprite.scale.set(w * 0.011, h * 0.011, 1);
    it.sprite.visible = true;
    it.npc = npc; it.until = now + seconds; it.start = now;
    npc.bubbleUntil = it.until;
  }

  update(now, camera) {
    this.now = now;
    for (const it of this.items) {
      if (!it.npc) continue;
      const n = it.npc;
      if (now > it.until || n.dead || n.hidden) { it.npc = null; it.sprite.visible = false; continue; }
      const d2 = (n.pos.x - camera.position.x) ** 2 + (n.pos.z - camera.position.z) ** 2;
      if (d2 > 40 * 40 || d2 < 1.3 * 1.3) { it.sprite.visible = false; continue; }
      it.sprite.visible = true;
      // a world-sized sprite fills the screen when the speaker stands next to the camera: shrink it inside NEAR blocks
      // so its on-screen size stays about constant (the chat line carries the text anyway)
      const k = Math.min(1, Math.sqrt(d2) / NEAR);
      it.sprite.scale.set(it.w * 0.011 * k, it.h * 0.011 * k, 1);
      const h = (n.droid && n.archetype !== 'protocol droid' ? 1.5 : 2.3) * n.scale - (n.sitting ? 0.4 : 0);
      it.sprite.position.set(n.rx ?? n.pos.x, (n.ry ?? n.pos.y) + h, n.rz ?? n.pos.z);
      const left = it.until - now;
      it.mat.opacity = left < 0.6 ? Math.max(0, left / 0.6) : 1;
    }
  }

  dispose() { for (const it of this.items) { it.tex.dispose(); it.mat.dispose(); } this.group.parent && this.group.parent.remove(this.group); }
}
