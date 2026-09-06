// Speech bubbles for the crowd: the town's name-tag technique (pixel font on a canvas -> sprite above the head) in a
// small pool, so ambient chatter never allocates per line. A bubble follows its speaker and fades after a few seconds.
import * as THREE from 'three';
import { drawText, measureText } from '../../font.js';
import { BLOCKS, SHAPE } from '../../blocks.js';

const POOL = 14, SCALE = 2, LINE_W = 46, SHOW_S = 4.5, NEAR = 6;

// Does the segment a -> b cross an opaque full block? (voxel DDA; the start and end cells are not tested). Bubbles
// are drawn over the world - a quad several blocks wide would otherwise be sliced by the wall the speaker faces -
// and this test hides the bubble of a speaker who is out of sight instead.
export function lineOfSight(world, ax, ay, az, bx, by, bz) {
  let dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-3) return true;
  dx /= len; dy /= len; dz /= len;
  let x = Math.floor(ax), y = Math.floor(ay), z = Math.floor(az);
  const ex = Math.floor(bx), ey = Math.floor(by), ez = Math.floor(bz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity, tdz = sz ? Math.abs(1 / dz) : Infinity;
  let tmx = sx > 0 ? (x + 1 - ax) * tdx : sx < 0 ? (ax - x) * tdx : Infinity;
  let tmy = sy > 0 ? (y + 1 - ay) * tdy : sy < 0 ? (ay - y) * tdy : Infinity;
  let tmz = sz > 0 ? (z + 1 - az) * tdz : sz < 0 ? (az - z) * tdz : Infinity;
  let t = 0;
  for (let i = 0; i < 200; i++) {
    if (x === ex && y === ey && z === ez) return true;
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; }
    else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; }
    else { z += sz; t = tmz; tmz += tdz; }
    if (t >= len) return true;
    const def = BLOCKS[world.getBlock(x, y, z)];
    // opaque cubes and full cutout cubes that eat light (leaves, hedges) block the view; glass does not
    if (def && (def.opaque || (def.lightOpacity > 0 && def.shape === SHAPE.CUBE))) return false;
  }
  return true;
}
// Every bubble canvas has this one size and the sprite shows the painted corner through the texture's repeat/offset:
// WebGL2 texture storage is allocated once at the first upload's size (three.js texStorage2D) and a canvas that grows
// afterwards silently fails to upload, one that shrinks overwrites only a corner - so the canvas never changes size.
// 768 x 64 holds three lines of 46 glyphs at scale 2 (the widest glyph is 7 px + 1 spacing).
const CANVAS_W = 768, CANVAS_H = 64;

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
  constructor(scene, world = null) {
    this.group = new THREE.Group();
    this.group.name = 'crowd-bubbles';
    scene.add(this.group);
    this.world = world;
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      const c = document.createElement('canvas'); c.width = CANVAS_W; c.height = CANVAS_H;
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace;
      // no depth test: the quad is not sliced by the wall behind the speaker; update() hides bubbles of speakers out of sight
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      sp.renderOrder = 11;
      this.group.add(sp);
      this.items.push({ sprite: sp, canvas: c, tex, npc: null, until: 0, mat });
    }
    this.now = 0;
    this.warmFrames = 0;
  }

  // The first sprite the session draws is a hitch: the GL backend builds the pipeline for that shader / blend state on
  // first use (a few ms on a GPU, most of a second under software GL), measured as an 800 ms frame at the first line of
  // chatter. Pay it while the world is still loading: upload every pool texture now and, for the first two frames,
  // draw one fully transparent bubble in front of the camera (see update).
  warm(renderer) {
    if (!renderer || !renderer.initTexture) return;
    for (const b of this.items) renderer.initTexture(b.tex);
    this.warmFrames = 3;   // two drawn frames, then hidden again
  }
  warmFrame(camera) {
    const it = this.items[0];
    if (it.npc) { this.warmFrames = 0; return; }
    if (this.warmFrames === 1) { it.sprite.visible = false; it.mat.opacity = 1; this.warmFrames = 0; return; }
    this.warmFrames--;
    camera.getWorldDirection(it.sprite.position).multiplyScalar(3).add(camera.position);
    it.sprite.scale.set(0.5, 0.25, 1);
    it.mat.opacity = 0;
    it.sprite.visible = true;
  }

  // Show `text` over `npc` (its bubble is replaced if it already has one); the oldest bubble is recycled when full.
  say(npc, text, now, seconds = SHOW_S) {
    let it = this.items.find((b) => b.npc === npc) || this.items.find((b) => !b.npc);
    if (!it) { it = this.items.reduce((a, b) => (a.until < b.until ? a : b)); }
    const lines = wrap(text, LINE_W);
    const w = Math.min(CANVAS_W, Math.max(...lines.map((l) => measureText(l, SCALE))) + 10), h = Math.min(CANVAS_H, lines.length * 9 * SCALE + 8);
    const c = it.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(12, 14, 22, 0.78)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(120, 160, 220, 0.9)'; ctx.fillRect(0, h - 2, w, 2);
    lines.forEach((l, i) => drawText(ctx, l, 5, 4 + i * 9 * SCALE, SCALE, '#f4f1e6', true));
    // the painted top-left corner is what the sprite shows (canvas row 0 is v = 1: flipY)
    it.tex.repeat.set(w / CANVAS_W, h / CANVAS_H); it.tex.offset.set(0, 1 - h / CANVAS_H);
    it.tex.needsUpdate = true;
    it.w = w; it.h = h;
    it.sprite.scale.set(w * 0.011, h * 0.011, 1);
    it.sprite.visible = true;
    it.npc = npc; it.until = now + seconds; it.start = now;
    npc.bubbleUntil = it.until;
  }

  update(now, camera) {
    this.now = now;
    if (this.warmFrames) this.warmFrame(camera);
    for (const it of this.items) {
      if (!it.npc) continue;
      const n = it.npc;
      if (now > it.until || n.dead || n.hidden) { it.npc = null; it.sprite.visible = false; continue; }
      const d2 = (n.pos.x - camera.position.x) ** 2 + (n.pos.z - camera.position.z) ** 2;
      if (d2 > 40 * 40 || d2 < 1.3 * 1.3) { it.sprite.visible = false; continue; }
      const h = (n.droid && n.archetype !== 'protocol droid' ? 1.5 : 2.3) * n.scale - (n.sitting ? 0.4 : 0);
      const x = n.rx ?? n.pos.x, y = (n.ry ?? n.pos.y) + h, z = n.rz ?? n.pos.z;
      // a speaker behind a wall keeps no bubble on screen (drawn without depth test, it would show through)
      if (this.world && !lineOfSight(this.world, camera.position.x, camera.position.y, camera.position.z, x, y - 0.6, z)) { it.sprite.visible = false; continue; }
      it.sprite.visible = true;
      // a world-sized sprite fills the screen when the speaker stands next to the camera: shrink it inside NEAR blocks
      // so its on-screen size stays about constant (the chat line carries the text anyway)
      const k = Math.min(1, Math.sqrt(d2) / NEAR);
      it.sprite.scale.set(it.w * 0.011 * k, it.h * 0.011 * k, 1);
      it.sprite.position.set(x, y, z);
      const left = it.until - now;
      it.mat.opacity = left < 0.6 ? Math.max(0, left / 0.6) : 1;
    }
  }

  dispose() { for (const it of this.items) { it.tex.dispose(); it.mat.dispose(); } this.group.parent && this.group.parent.remove(this.group); }
}
