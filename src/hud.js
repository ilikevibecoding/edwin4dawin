// 2D HUD drawn on an overlay canvas with Minecraft-like layout and proportions.
import { BLOCKS, PALETTE } from './blocks.js';
import { ITEM_PALETTE, MAX_STACK, mergeInto } from './items.js';
import { tilePixels } from './textures.js';
import { drawText, measureText } from './font.js';
import { TILE_PX } from './constants.js';
import { clamp } from './rng.js';

const PALETTE_ROWS = 5; // visible palette rows per page in the inventory screen
// Minecraft quick-move orders (shift-click): into the player inventory the hotbar fills first, from the far end.
const ORDER_PLAYER = [...Array.from({ length: 9 }, (_, i) => 8 - i), ...Array.from({ length: 27 }, (_, i) => 35 - i)];
const ORDER_MAIN = Array.from({ length: 27 }, (_, i) => 9 + i);
const ORDER_HOTBAR = Array.from({ length: 9 }, (_, i) => i);
const ORDER_CHEST = Array.from({ length: 27 }, (_, i) => i);

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
    this.screen = null; // null | 'inventory' | 'chest' | 'pause' | 'death' | 'admin'
    this.mouse = { x: 0, y: 0, down: false, clicked: false, rdown: false, rclicked: false, wheel: 0 };
    this.cursorItem = null; // {id, count} carried between slots in the inventory / chest screens
    this.hover = null;
    this.chest = null;      // {x, y, z, entity} while the chest screen is open
    this.invTab = 'blocks'; // palette tab of the inventory screen: 'blocks' | 'items'
    this.invPage = 0;
    this.buttons = [];
    this.debug = false;
    this.fps = 0;
    this.xp = 0.15;
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
      else if (e.button === 2) { this.mouse.rdown = true; this.mouse.rclicked = true; }
    });
    canvas.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; else if (e.button === 2) this.mouse.rdown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    this.resize();
  }

  get shiftDown() { const inp = this.game && this.game.input; return !!(inp && (inp.isDown('ShiftLeft') || inp.isDown('ShiftRight'))); }

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
      if (age > 12000) continue;
      const alpha = age > 10000 ? 1 - (age - 10000) / 2000 : 1;
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

  // --- slot grids shared by the inventory and chest screens ---------------------------------------------------
  // Draws n slots of `arr` starting at `lo` in a grid of `cols`; registers the hovered one as this.hover.
  drawSlotGrid(arr, lo, n, cols, x0, y0, kind) {
    const s = this.scale;
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % cols) * 18 * s, y = y0 + Math.floor(i / cols) * 18 * s;
      this.drawSlotBg(x, y);
      const slot = arr[lo + i];
      if (slot) this.drawItem(slot, x + s, y + s);
      if (this.mouse.x >= x && this.mouse.x < x + 18 * s && this.mouse.y >= y && this.mouse.y < y + 18 * s) this.hover = { type: 'slot', kind, arr, index: lo + i, x, y };
    }
  }
  drawPlayerSlots(inv, gx, mainY, hotbarY) {
    this.drawSlotGrid(inv.slots, 9, 27, 9, gx, mainY, 'main');
    this.drawSlotGrid(inv.slots, 0, 9, 9, gx, hotbarY, 'hotbar');
  }
  drawHoverHighlight() {
    if (!this.hover) return;
    const s = this.scale;
    this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
    this.ctx.fillRect(this.hover.x + s, this.hover.y + s, 16 * s, 16 * s);
  }
  drawTooltip(name) {
    const ctx = this.ctx, s = this.scale;
    const w = measureText(name, s);
    const tx = this.mouse.x + 8 * s, ty = this.mouse.y - 12 * s;
    ctx.fillStyle = 'rgba(16,0,16,0.94)'; ctx.fillRect(tx - 3 * s, ty - 3 * s, w + 6 * s, 14 * s);
    ctx.fillStyle = '#5000ff'; ctx.fillRect(tx - 3 * s, ty - 3 * s, w + 6 * s, s); ctx.fillRect(tx - 3 * s, ty + 10 * s, w + 6 * s, s); ctx.fillRect(tx - 3 * s, ty - 3 * s, s, 14 * s); ctx.fillRect(tx + w + 2 * s, ty - 3 * s, s, 14 * s);
    this.text(name, tx, ty);
  }
  hoveredName(inv) {
    const h = this.hover;
    if (!h || this.cursorItem) return null;
    const id = h.type === 'palette' ? h.id : h.arr[h.index] && h.arr[h.index].id;
    return id ? BLOCKS[id].displayName : null;
  }

  // Minecraft slot rules. button 0: pick up / place / merge / swap (shift: quick move); button 2: split half / place one.
  // `quickDest(h)` returns {arr, order} for shift-clicks. Returns true when something changed.
  slotClick(h, button, shift, quickDest) {
    const arr = h.arr, i = h.index, cur = this.cursorItem, st = arr[i];
    if (button === 0 && shift) {
      if (!st) return false;
      const dest = quickDest(h);
      if (!dest) return false;
      mergeInto(dest.arr, st, dest.order);
      if (st.count <= 0) arr[i] = null;
      return true;
    }
    if (button === 0) {
      if (!cur) { if (!st) return false; this.cursorItem = st; arr[i] = null; return true; }
      if (!st) { arr[i] = cur; this.cursorItem = null; return true; }
      if (st.id === cur.id) {
        const n = Math.min(MAX_STACK - st.count, cur.count);
        if (n <= 0) return false;
        st.count += n; cur.count -= n; if (cur.count <= 0) this.cursorItem = null;
        return true;
      }
      arr[i] = cur; this.cursorItem = st; return true;
    }
    // right button
    if (!cur) {
      if (!st) return false;
      const take = Math.ceil(st.count / 2);
      this.cursorItem = { id: st.id, count: take }; st.count -= take; if (st.count <= 0) arr[i] = null;
      return true;
    }
    if (!st) { arr[i] = { id: cur.id, count: 1 }; cur.count--; if (cur.count <= 0) this.cursorItem = null; return true; }
    if (st.id === cur.id) { if (st.count >= MAX_STACK) return false; st.count++; cur.count--; if (cur.count <= 0) this.cursorItem = null; return true; }
    arr[i] = cur; this.cursorItem = st; return true;
  }

  // Click outside a panel with a stack on the cursor: the stack is thrown in front of the player (Minecraft).
  dropCursorOutside(px, py, pw, ph) {
    if (!this.cursorItem) return;
    if (this.mouse.x < px || this.mouse.x > px + pw || this.mouse.y < py || this.mouse.y > py + ph) {
      if (this.game && this.game.dropInFront) this.game.dropInFront(this.cursorItem.id, this.cursorItem.count);
      this.cursorItem = null;
    }
  }

  // Inventory screen: creative palette (Blocks / Items tabs, paged) above the player's inventory and hotbar.
  drawInventory(inv) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    const palette = this.invTab === 'items' ? ITEM_PALETTE : PALETTE;
    const perPage = PALETTE_ROWS * 9, pages = Math.max(1, Math.ceil(palette.length / perPage));
    if (this.mouse.wheel) { this.invPage = clamp(this.invPage + Math.sign(this.mouse.wheel), 0, pages - 1); this.mouse.wheel = 0; }
    this.invPage = clamp(this.invPage, 0, pages - 1);
    const pw = 176 * s, ph = 214 * s;
    const px = Math.floor(W / 2 - pw / 2), py = Math.floor(H / 2 - ph / 2);
    this.drawPanel(px, py, pw, ph);
    this.hover = null;
    const gx = px + 7 * s;
    // tabs
    const tab = (label, key, x) => {
      const active = this.invTab === key;
      const w = 40 * s, h = 12 * s, y = py + 4 * s;
      const hov = this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h;
      ctx.fillStyle = active ? '#ffffff' : hov ? '#9a9a9a' : '#8b8b8b'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#373737'; ctx.fillRect(x, y + h - s, w, s);
      if (active) { ctx.fillStyle = '#c6c6c6'; ctx.fillRect(x, y + h - s, w, s); }
      this.textCentered(label, x + w / 2, y + 2 * s, active ? '#404040' : '#2a2a2a', s);
      if (hov && this.mouse.clicked) { this.mouse.clicked = false; this.invTab = key; this.invPage = 0; }
    };
    tab('Blocks', 'blocks', gx);
    tab('Items', 'items', gx + 42 * s);
    // page controls
    if (pages > 1) {
      const by = py + 4 * s, bw = 12 * s;
      this.button('pgPrev', '<', px + pw - 47 * s, by, bw, 12 * s, () => { this.invPage = Math.max(0, this.invPage - 1); }, this.invPage > 0);
      this.button('pgNext', '>', px + pw - 19 * s, by, bw, 12 * s, () => { this.invPage = Math.min(pages - 1, this.invPage + 1); }, this.invPage < pages - 1);
      this.textCentered(`${this.invPage + 1}/${pages}`, px + pw - 27 * s, by + 2 * s, '#404040', s);
    }
    // palette page
    const gy = py + 18 * s;
    const start = this.invPage * perPage;
    for (let i = 0; i < perPage; i++) {
      const x = gx + (i % 9) * 18 * s, y = gy + Math.floor(i / 9) * 18 * s;
      this.drawSlotBg(x, y);
      const id = palette[start + i];
      if (id === undefined) continue;
      ctx.drawImage(blockIcon(id, 16 * s), x + s, y + s);
      if (this.mouse.x >= x && this.mouse.x < x + 18 * s && this.mouse.y >= y && this.mouse.y < y + 18 * s) this.hover = { type: 'palette', id, x, y };
    }
    // player inventory + hotbar
    const mainY = gy + PALETTE_ROWS * 18 * s + 12 * s, hotbarY = mainY + 3 * 18 * s + 4 * s;
    this.text('Inventory', gx, mainY - 9 * s, '#404040', false, Math.max(1, s - 1));
    this.drawPlayerSlots(inv, gx, mainY, hotbarY);
    this.drawHoverHighlight();
    this.text('LMB move   RMB split   Shift quick-move', gx, py + ph - 9 * s, '#606060', false, Math.max(1, s - 1));
    // interactions
    const button = this.mouse.clicked ? 0 : this.mouse.rclicked ? 2 : -1;
    if (button >= 0) {
      this.mouse.clicked = false; this.mouse.rclicked = false;
      const h = this.hover;
      if (h && h.type === 'palette') {
        if (this.shiftDown) inv.addStack(h.id, MAX_STACK);                 // creative: shift-click gives a stack directly
        else if (this.cursorItem) this.cursorItem = null;                    // creative: clicking the palette destroys the carried stack
        else this.cursorItem = { id: h.id, count: button === 2 ? 1 : MAX_STACK };
      } else if (h && h.type === 'slot') {
        this.slotClick(h, button, this.shiftDown, (hh) => ({ arr: inv.slots, order: hh.kind === 'hotbar' ? ORDER_MAIN : ORDER_HOTBAR }));
      } else this.dropCursorOutside(px, py, pw, ph);
    }
    const name = this.hoveredName(inv);
    if (name) this.drawTooltip(name);
    if (this.cursorItem) this.drawItem(this.cursorItem, this.mouse.x - 8 * s, this.mouse.y - 8 * s);
  }

  // Chest screen (Minecraft single-chest layout): 27 chest slots above the player inventory and hotbar.
  drawChest(game) {
    const ctx = this.ctx, s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    const inv = game.inventory, chest = this.chest;
    if (!chest) { game.closeScreen(); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    const pw = 176 * s, ph = 168 * s;
    const px = Math.floor(W / 2 - pw / 2), py = Math.floor(H / 2 - ph / 2);
    this.drawPanel(px, py, pw, ph);
    this.hover = null;
    const gx = px + 7 * s;
    this.text('Chest', px + 8 * s, py + 6 * s, '#404040', false);
    this.drawSlotGrid(chest.entity.slots, 0, 27, 9, gx, py + 17 * s, 'chest');
    this.text('Inventory', px + 8 * s, py + 73 * s, '#404040', false);
    this.drawPlayerSlots(inv, gx, py + 83 * s, py + 141 * s);
    this.drawHoverHighlight();
    const button = this.mouse.clicked ? 0 : this.mouse.rclicked ? 2 : -1;
    if (button >= 0) {
      this.mouse.clicked = false; this.mouse.rclicked = false;
      const h = this.hover;
      if (h && h.type === 'slot') {
        const changed = this.slotClick(h, button, this.shiftDown, (hh) => (hh.kind === 'chest' ? { arr: inv.slots, order: ORDER_PLAYER } : { arr: chest.entity.slots, order: ORDER_CHEST }));
        if (changed && game.onChestChanged) game.onChestChanged();
      } else this.dropCursorOutside(px, py, pw, ph);
    }
    const name = this.hoveredName(inv);
    if (name) this.drawTooltip(name);
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

    if (this.screen === 'inventory') { this.drawInventory(game.inventory); this.mouse.clicked = false; this.mouse.rclicked = false; return; }
    if (this.screen === 'chest') { this.drawChest(game); this.mouse.clicked = false; this.mouse.rclicked = false; return; }
    if (this.screen === 'pause') { this.drawPause(game); this.mouse.clicked = false; this.mouse.rclicked = false; return; }
    if (this.screen === 'death') { this.drawDeath(game); this.mouse.clicked = false; this.mouse.rclicked = false; return; }
    if (this.screen === 'admin') { // DOM panel is on top; keep the world visible and show a hint
      this.drawChat();
      this.text('Disaster controls open  (F4 / Esc to close)', 6 * s, 6 * s, '#ffd080');
      if (this.debug) this.drawDebug(game.debugLines());
      this.mouse.clicked = false; return;
    }

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
      this.textCentered('WASD move - Space jump - Double-tap W sprint - Double-tap Space fly - Left/Right click break/place', W / 2, H / 2 - 14 * s, '#c0c0c0', Math.max(1, s - 1));
    }
    this.mouse.clicked = false; this.mouse.rclicked = false; this.mouse.wheel = 0;
  }
}
