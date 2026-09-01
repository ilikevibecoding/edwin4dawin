// 2D HUD drawn on an overlay canvas with Minecraft-like layout and proportions.
import { BLOCKS, PALETTE } from './blocks.js';
import { tilePixels } from './textures.js';
import { drawText, measureText } from './font.js';
import { TILE_PX } from './constants.js';
import { clamp } from './rng.js';

const HEART = [
  '.##...##.',
  '#..#.#..#',
  '#...#...#',
  '#.......#',
  '.#.....#.',
  '..#...#..',
  '...#.#...',
  '....#....',
  '.........',
];
const HEART_FILL = [
  '.........',
  '.##...##.',
  '.###.###.',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
  '.........',
  '.........',
];
const FOOD = [
  '.....##..',
  '....####.',
  '...#####.',
  '..#####..',
  '.####....',
  '####.....',
  '###......',
  '##.......',
  '.........',
];

const tileCanvasCache = new Map();
function tileCanvas(tile, shade = 1) {
  const key = tile + ':' + shade;
  let c = tileCanvasCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = TILE_PX; c.height = TILE_PX;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(TILE_PX, TILE_PX);
  const src = tilePixels(tile);
  for (let i = 0; i < src.length; i += 4) {
    img.data[i] = src[i] * shade; img.data[i + 1] = src[i + 1] * shade; img.data[i + 2] = src[i + 2] * shade; img.data[i + 3] = src[i + 3];
  }
  ctx.putImageData(img, 0, 0);
  tileCanvasCache.set(key, c);
  return c;
}

const iconCache = new Map();
// Renders a block icon (isometric cube / flat / slab) at pixel size s.
export function blockIcon(id, s) {
  const key = id + ':' + s;
  let c = iconCache.get(key);
  if (c) return c;
  const def = BLOCKS[id];
  c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (def.icon === 'flat') {
    ctx.drawImage(tileCanvas(def.tex[0]), 0, 0, s, s);
  } else {
    const half = def.icon === 'slab';
    const hgt = half ? 0.25 : 0.5;
    const topY = half ? 0.25 : 0;
    const D = [0, 0.25 + topY], A = [0.5, 0 + topY], C = [0.5, 0.5 + topY], Bp = [1, 0.25 + topY];
    const face = (tile, ox, oy, ax, ay, bx, by, shade) => {
      const img = tileCanvas(tile, shade);
      ctx.setTransform((ax * s) / TILE_PX, (ay * s) / TILE_PX, (bx * s) / TILE_PX, (by * s) / TILE_PX, ox * s, oy * s);
      ctx.drawImage(img, 0, 0);
    };
    // top: origin D, u->A, v->C
    face(def.tex[2], D[0], D[1], A[0] - D[0], A[1] - D[1], C[0] - D[0], C[1] - D[1], 1.0);
    // left (-x): origin D, u->C, v down
    face(def.tex[1], D[0], D[1], C[0] - D[0], C[1] - D[1], 0, hgt, 0.6);
    // right (+z): origin C, u->B, v down
    face(def.tex[4], C[0], C[1], Bp[0] - C[0], Bp[1] - C[1], 0, hgt, 0.8);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  iconCache.set(key, c);
  return c;
}

export class HUD {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.scale = 3;
    this.messages = []; // {text, time}
    this.itemNameTimer = 0;
    this.lastSelected = -1;
    this.selectorX = 0;
    this.selectorPop = 0;
    this.screen = null; // null | 'inventory' | 'pause' | 'death'
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.cursorItem = null;
    this.hover = null;
    this.buttons = [];
    this.debug = false;
    this.fps = 0;
    this.xp = 0.15;
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; } });
    canvas.addEventListener('mouseup', () => { this.mouse.down = false; });
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w; this.canvas.height = h;
    this.scale = clamp(Math.min(Math.floor(w / 320), Math.floor(h / 240)), 1, 4);
    if (w >= 1600) this.scale = Math.min(this.scale, 4);
  }

  addMessage(text) {
    this.messages.push({ text, time: performance.now() });
    if (this.messages.length > 8) this.messages.shift();
  }

  text(t, x, y, color = '#ffffff', shadow = true, scale = this.scale) {
    return drawText(this.ctx, t, Math.round(x), Math.round(y), scale, color, shadow);
  }
  textCentered(t, cx, y, color = '#ffffff', scale = this.scale) {
    const w = measureText(t, scale);
    return this.text(t, cx - w / 2, y, color, true, scale);
  }

  pixelArt(rows, x, y, color, s) {
    this.ctx.fillStyle = color;
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') this.ctx.fillRect(x + c * s, y + r * s, s, s);
  }

  drawCrosshair() {
    const ctx = this.ctx, s = this.scale;
    const cx = Math.floor(this.canvas.width / 2), cy = Math.floor(this.canvas.height / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    const len = 9 * s / 2, th = s;
    ctx.fillRect(cx - len, cy - th / 2, len * 2, th);
    ctx.fillRect(cx - th / 2, cy - len, th, len * 2);
    ctx.restore();
  }

  drawHotbar(inv) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    const bw = 182 * s, bh = 22 * s;
    const x0 = Math.floor(W / 2 - bw / 2), y0 = H - bh - 1 * s;
    // background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x0, y0, bw, bh);
    ctx.fillStyle = 'rgba(140,140,140,0.75)';
    ctx.fillRect(x0, y0, bw, s); ctx.fillRect(x0, y0 + bh - s, bw, s); ctx.fillRect(x0, y0, s, bh); ctx.fillRect(x0 + bw - s, y0, s, bh);
    for (let i = 0; i < 9; i++) {
      const sx = x0 + s + i * 20 * s;
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      ctx.fillRect(sx, y0 + s, 20 * s, 20 * s);
      ctx.fillStyle = 'rgba(160,160,160,0.35)';
      ctx.fillRect(sx + 19 * s, y0 + s, s, 20 * s);
      const slot = inv.slots[i];
      if (slot) this.drawItem(slot, sx + 2 * s, y0 + 3 * s);
    }
    // animated selector
    const targetX = x0 - s + inv.selected * 20 * s;
    if (this.lastSelected !== inv.selected) { this.lastSelected = inv.selected; this.itemNameTimer = performance.now(); this.selectorPop = 1; if (this.selectorX === 0) this.selectorX = targetX; }
    this.selectorX += (targetX - this.selectorX) * 0.5;
    if (Math.abs(this.selectorX - targetX) < 0.5) this.selectorX = targetX;
    this.selectorPop *= 0.8;
    const pop = Math.round(this.selectorPop * 2 * s);
    ctx.fillStyle = '#ffffff';
    const sx = Math.round(this.selectorX) - pop, sy = y0 - s - pop, sw = 24 * s + pop * 2, sh = 24 * s + pop * 2;
    ctx.fillRect(sx, sy, sw, s); ctx.fillRect(sx, sy + sh - s, sw, s); ctx.fillRect(sx, sy, s, sh); ctx.fillRect(sx + sw - s, sy, s, sh);
    // item name popup
    const held = inv.held;
    const age = performance.now() - this.itemNameTimer;
    if (held && age < 2500) {
      const alpha = age > 1800 ? 1 - (age - 1800) / 700 : 1;
      ctx.globalAlpha = alpha;
      this.textCentered(BLOCKS[held.id].displayName, W / 2, y0 - 30 * s);
      ctx.globalAlpha = 1;
    }
    return y0;
  }

  drawItem(slot, x, y) {
    const s = this.scale;
    const icon = blockIcon(slot.id, 16 * s);
    this.ctx.drawImage(icon, x, y);
    if (slot.count > 1) {
      const t = String(slot.count);
      const w = measureText(t, s);
      this.text(t, x + 17 * s - w, y + 9 * s);
    }
  }

  drawStatusBars(player, hotbarY) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width;
    const left = Math.floor(W / 2 - 91 * s);
    const y = hotbarY - 16 * s;
    const shake = player.hurtTime > 0;
    // hearts
    for (let i = 0; i < 10; i++) {
      const hx = left + i * 8 * s;
      const hy = y + (shake ? (Math.random() < 0.5 ? -s : s) : 0) - (player.health <= 4 && Math.floor(performance.now() / 150 + i) % 3 === 0 ? s : 0);
      this.pixelArt(HEART, hx, hy, '#000000', s);
      this.pixelArt(HEART_FILL, hx, hy, '#3a3a3a', s);
      const hp = player.health - i * 2;
      if (hp >= 2) { this.pixelArt(HEART_FILL, hx, hy, '#ff1313', s); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(hx + 2 * s, hy + 2 * s, s, s); ctx.fillRect(hx + 6 * s, hy + 2 * s, s, s); }
      else if (hp === 1) { ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, 4.5 * s, 9 * s); ctx.clip(); this.pixelArt(HEART_FILL, hx, hy, '#ff1313', s); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(hx + 2 * s, hy + 2 * s, s, s); ctx.restore(); }
    }
    // food (right aligned, mirrored order like MC)
    for (let i = 0; i < 10; i++) {
      const fx = Math.floor(W / 2 + 91 * s) - (i + 1) * 8 * s - s;
      this.pixelArt(FOOD, fx, y, '#000000', s);
      const f = player.food - i * 2;
      const col = f >= 2 ? '#c76d2a' : f === 1 ? '#c76d2a' : '#4a3a2a';
      const inner = ['.........', '.....##..', '....###..', '...###...', '..###....', '.###.....', '.##......', '.........', '.........'];
      if (f >= 1) { this.pixelArt(inner, fx, y, col, s); if (f >= 2) { ctx.fillStyle = '#e8a25f'; ctx.fillRect(fx + 6 * s, y + 2 * s, s, s); } }
      else this.pixelArt(inner, fx, y, '#3a2a1a', s);
    }
    // xp bar
    const bx = Math.floor(W / 2 - 91 * s), by = hotbarY - 7 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, 182 * s, 5 * s);
    ctx.fillStyle = '#2e3a2e'; ctx.fillRect(bx + s, by + s, 180 * s, 3 * s);
    ctx.fillStyle = '#80ff20'; ctx.fillRect(bx + s, by + s, Math.floor(180 * s * clamp(this.xp, 0, 1)), 3 * s);
  }

  drawChat() {
    const s = this.scale, now = performance.now();
    let y = this.canvas.height - 48 * s;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      const age = now - m.time;
      if (age > 10000) continue;
      const alpha = age > 8000 ? 1 - (age - 8000) / 2000 : 1;
      this.ctx.globalAlpha = alpha;
      const w = measureText(m.text, s);
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(2 * s, y - 1 * s, w + 4 * s, 11 * s);
      this.text(m.text, 4 * s, y);
      y -= 12 * s;
      this.ctx.globalAlpha = 1;
    }
  }

  drawDebug(lines) {
    const s = Math.max(1, this.scale - 1);
    let y = 2 * s;
    for (const l of lines) {
      const w = measureText(l, s);
      this.ctx.fillStyle = 'rgba(80,80,80,0.5)';
      this.ctx.fillRect(2 * s, y - s, w + 2 * s, 10 * s);
      this.text(l, 3 * s, y, '#e0e0e0', true, s);
      y += 10 * s;
    }
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------
  drawPanel(x, y, w, h) {
    const ctx = this.ctx, s = this.scale;
    ctx.fillStyle = '#c6c6c6'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, s); ctx.fillRect(x, y, s, h);
    ctx.fillStyle = '#555555'; ctx.fillRect(x, y + h - s, w, s); ctx.fillRect(x + w - s, y, s, h);
    ctx.fillStyle = '#000000'; ctx.fillRect(x - s, y - s, w + 2 * s, s); ctx.fillRect(x - s, y + h, w + 2 * s, s); ctx.fillRect(x - s, y - s, s, h + 2 * s); ctx.fillRect(x + w, y - s, s, h + 2 * s);
  }
  drawSlotBg(x, y) {
    const ctx = this.ctx, s = this.scale;
    ctx.fillStyle = '#373737'; ctx.fillRect(x, y, 18 * s, 18 * s);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + s, y + 17 * s, 17 * s, s); ctx.fillRect(x + 17 * s, y + s, s, 17 * s);
    ctx.fillStyle = '#8b8b8b'; ctx.fillRect(x + s, y + s, 16 * s, 16 * s);
  }
  button(id, label, x, y, w, h, onClick, enabled = true) {
    const ctx = this.ctx, s = this.scale;
    const hover = enabled && this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h;
    ctx.fillStyle = '#000000'; ctx.fillRect(x - s, y - s, w + 2 * s, h + 2 * s);
    ctx.fillStyle = !enabled ? '#4a4a4a' : hover ? '#7f8ce8' : '#6f6f6f';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = !enabled ? '#6a6a6a' : hover ? '#a4aefc' : '#a0a0a0'; ctx.fillRect(x, y, w, s); ctx.fillRect(x, y, s, h);
    ctx.fillStyle = !enabled ? '#2a2a2a' : hover ? '#3d4a9a' : '#3a3a3a'; ctx.fillRect(x, y + h - s, w, s); ctx.fillRect(x + w - s, y, s, h);
    this.textCentered(label, x + w / 2, y + (h - 8 * s) / 2 + s, !enabled ? '#a0a0a0' : hover ? '#ffffa0' : '#e0e0e0');
    if (hover && this.mouse.clicked) { this.mouse.clicked = false; onClick(); }
  }

  drawInventory(inv) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    const cols = 9, rows = Math.ceil(PALETTE.length / cols);
    const pw = 176 * s, ph = (18 * rows + 18 + 42) * s;
    const px = Math.floor(W / 2 - pw / 2), py = Math.floor(H / 2 - ph / 2);
    this.drawPanel(px, py, pw, ph);
    this.text('Blocks', px + 8 * s, py + 6 * s, '#404040', false);
    this.text('Click a block to add a stack, drag onto the hotbar', px + 8 * s, py + ph - 10 * s, '#606060', false, Math.max(1, s - 1));
    this.hover = null;
    const gx = px + 7 * s, gy = py + 17 * s;
    // palette grid
    for (let i = 0; i < PALETTE.length; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = gx + c * 18 * s, y = gy + r * 18 * s;
      this.drawSlotBg(x, y);
      this.ctx.drawImage(blockIcon(PALETTE[i], 16 * s), x + s, y + s);
      if (this.mouse.x >= x && this.mouse.x < x + 18 * s && this.mouse.y >= y && this.mouse.y < y + 18 * s) {
        this.hover = { type: 'palette', id: PALETTE[i], x, y };
      }
    }
    // hotbar row
    const hy = gy + rows * 18 * s + 14 * s;
    this.text('Hotbar', gx, hy - 9 * s, '#404040', false, Math.max(1, s - 1));
    for (let i = 0; i < 9; i++) {
      const x = gx + i * 18 * s;
      this.drawSlotBg(x, hy);
      const slot = inv.slots[i];
      if (slot) this.drawItem(slot, x + s, hy + s);
      if (this.mouse.x >= x && this.mouse.x < x + 18 * s && this.mouse.y >= hy && this.mouse.y < hy + 18 * s) this.hover = { type: 'hotbar', index: i, x, y: hy };
    }
    if (this.hover) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(this.hover.x + s, this.hover.y + s, 16 * s, 16 * s);
    }
    // interactions
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      if (this.hover && this.hover.type === 'palette') {
        if (this.cursorItem && this.cursorItem.id === this.hover.id) this.cursorItem = null;
        else this.cursorItem = { id: this.hover.id, count: 64 };
      } else if (this.hover && this.hover.type === 'hotbar') {
        const i = this.hover.index;
        if (this.cursorItem) { const prev = inv.slots[i]; inv.slots[i] = this.cursorItem; this.cursorItem = prev; }
        else if (inv.slots[i]) { this.cursorItem = inv.slots[i]; inv.slots[i] = null; }
      } else if (this.cursorItem && (this.mouse.x < px || this.mouse.x > px + pw || this.mouse.y < py || this.mouse.y > py + ph)) {
        this.cursorItem = null; // drop outside = discard
      }
    }
    // tooltip
    if (this.hover && !this.cursorItem) {
      const id = this.hover.type === 'palette' ? this.hover.id : inv.slots[this.hover.index]?.id;
      if (id) {
        const name = BLOCKS[id].displayName;
        const w = measureText(name, s);
        const tx = this.mouse.x + 8 * s, ty = this.mouse.y - 12 * s;
        ctx.fillStyle = 'rgba(16,0,16,0.94)'; ctx.fillRect(tx - 3 * s, ty - 3 * s, w + 6 * s, 14 * s);
        ctx.fillStyle = '#5000ff'; ctx.fillRect(tx - 3 * s, ty - 3 * s, w + 6 * s, s); ctx.fillRect(tx - 3 * s, ty + 10 * s, w + 6 * s, s); ctx.fillRect(tx - 3 * s, ty - 3 * s, s, 14 * s); ctx.fillRect(tx + w + 2 * s, ty - 3 * s, s, 14 * s);
        this.text(name, tx, ty);
      }
    }
    if (this.cursorItem) this.drawItem(this.cursorItem, this.mouse.x - 8 * s, this.mouse.y - 8 * s);
  }

  drawPause(game) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    this.textCentered('Game Menu', W / 2, H / 4);
    const bw = 200 * s, bh = 20 * s;
    const bx = Math.floor(W / 2 - bw / 2);
    let by = Math.floor(H / 4 + 24 * s);
    this.button('back', 'Back to Game', bx, by, bw, bh, () => game.closeScreen()); by += 24 * s;
    this.button('rd', `Render Distance: ${game.terrain.renderDistance} chunks`, bx, by, bw, bh, () => game.cycleRenderDistance()); by += 24 * s;
    this.button('snd', `Sound: ${game.audio.enabled ? 'ON' : 'OFF'}`, bx, by, bw, bh, () => game.audio.toggle()); by += 24 * s;
    this.button('time', `Time: ${game.sky.clockString()}  (skip 2h)`, bx, by, bw, bh, () => { game.sky.time = (game.sky.time + 2 / 24) % 1; }); by += 24 * s;
    this.button('bob', `View Bobbing: ${game.viewBobbing ? 'ON' : 'OFF'}`, bx, by, bw, bh, () => { game.viewBobbing = !game.viewBobbing; }); by += 24 * s;
    this.button('spawn', 'Return to Spawn', bx, by, bw, bh, () => { game.respawn(); game.closeScreen(); }); by += 30 * s;
    const lines = ['WASD move   Space jump   Double-tap W or R sprint   Shift sneak', 'Left click break   Right click place / talk   E inventory', '1-9 / wheel select   T skip time   F3 debug   Esc menu'];
    const ls = Math.max(1, s - 1);
    for (const l of lines) { this.textCentered(l, W / 2, by, '#c0c0c0', ls); by += 11 * ls; }
  }

  drawDeath(game) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(120,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    this.textCentered('You died!', W / 2, H / 3, '#ffffff', s * 2);
    this.button('respawn', 'Respawn', Math.floor(W / 2 - 100 * s), Math.floor(H / 2), 200 * s, 20 * s, () => { game.respawn(); game.closeScreen(); });
  }

  render(game) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    const player = game.player;
    const s = this.scale;
    // overlays
    if (player.eyeUnderwater) { ctx.fillStyle = 'rgba(10,30,140,0.35)'; ctx.fillRect(0, 0, W, H); }
    if (player.hurtTime > 0) { ctx.fillStyle = `rgba(255,0,0,${player.hurtTime / 10 * 0.35})`; ctx.fillRect(0, 0, W, H); }

    if (this.screen === 'inventory') { this.drawInventory(game.inventory); this.mouse.clicked = false; return; }
    if (this.screen === 'pause') { this.drawPause(game); this.mouse.clicked = false; return; }
    if (this.screen === 'death') { this.drawDeath(game); this.mouse.clicked = false; return; }

    this.drawCrosshair();
    const hotbarY = this.drawHotbar(game.inventory);
    this.drawStatusBars(player, hotbarY);
    this.drawChat();
    // NPC name under crosshair
    if (game.lookingAtName) {
      this.textCentered(game.lookingAtName, W / 2, H / 2 + 14 * s, '#ffffff');
    }
    if (this.debug) this.drawDebug(game.debugLines());
    if (!game.input.locked && !game.loading) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
      this.textCentered('Click to play', W / 2, H / 2 - 30 * s, '#ffffff', s);
      this.textCentered('WASD move - Space jump - Double-tap W to sprint - Left/Right click break/place', W / 2, H / 2 - 14 * s, '#c0c0c0', Math.max(1, s - 1));
    }
    this.mouse.clicked = false;
  }
}
