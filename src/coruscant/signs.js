// Entrance signs (rubric 07 #2): a lit sign board over every door the city has generated so far - the building's name
// on the first line, its category on the second - plus the HUD toast "Entering <name> - <category>" / "Leaving ..."
// when the player walks into or out of a building.
//
// One small plane per door (shared PlaneGeometry, 2.6 x 0.65 blocks: Minecraft sign proportions), textured with a
// 256x64 canvas (dark panel, glowing text) that is cached by its text and created lazily the first time a sign comes
// within view. Signs further than VIEW_DIST are hidden and only the MAX_VISIBLE nearest are drawn, so the cost is at
// most 40 small transparent quads. Doors come from `cityMeta()` (ground `doors[]` and the boulevard `midDoor`), which
// grows as chunks stream in, so the list is re-synced every second. A board hangs just above the door's lintel on the
// outside of the wall; it settles against the real blocks (3-tall openings, rails hung a block out) when first drawn.
import * as THREE from 'three';
import { LEVELS } from './layout.js';
import { purposeFor } from './purposes.js';
import { B, BLOCKS } from '../blocks.js';

export const SIGN_W = 2.6, SIGN_H = 0.65;     // 4:1 like the 256x64 texture; a shade over two blocks, like a Minecraft sign
export const VIEW_DIST = 48;
export const MAX_VISIBLE = 40;
const LINTEL_CLEAR = 1.4;                       // sign centre above the lintel block (the first wall block over the opening)
const FACE_GAP = 0.08;                          // how far the board hangs in front of the surface it is mounted on
const CS = 16;                                  // chunk size, for the "is this door's chunk built yet" check
const TOAST_DEBOUNCE = 5;                       // seconds between toasts for the same lot
const TEXTURE_TTL = 90;                         // seconds a texture survives unseen before it is freed
export const CATEGORY_LABEL = { housing: 'Housing', office: 'Offices', government: 'Government', hospitality: 'Hospitality', retail: 'Retail', food: 'Food & drink', industry: 'Industry', transport: 'Transport', security: 'Security', culture: 'Culture', medical: 'Medical', media: 'Media', religion: 'Religion' };

const isBuilding = (lot) => lot && (lot.kind === 'tower' || lot.kind === 'landmark');
const hudText = (s) => String(s).replace(/\u2014|\u2013/g, '-').replace(/\u2019|\u2018/g, "'").replace(/\u00d7/g, 'x');

// 256x64 sign face: dark panel with a glowing cyan frame, the name in bold (shrunk to fit), the category small.
export function drawSignCanvas(name, category, { yours = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const accent = yours ? '#ffd866' : '#4fd8ff';
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(6, 10, 22, 0.94)';
  ctx.fillRect(2, 2, 252, 60);
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(60, 120, 200, 0.18)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad; ctx.fillRect(2, 2, 252, 60);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(3.5, 3.5, 249, 57);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(6.5, 6.5, 243, 51);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const font = (px) => `bold ${px}px "Segoe UI", "DejaVu Sans", Arial, sans-serif`;
  // line 1: the name, bold, shrunk until it fits the 238 px inner width; a soft glow plus a hard dark outline keeps
  // it readable when the board is a few dozen pixels wide
  let size = 30;
  ctx.font = font(size);
  while (size > 14 && ctx.measureText(name).width > 238) { size -= 1; ctx.font = font(size); }
  ctx.shadowColor = accent; ctx.shadowBlur = 12;
  ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0, 8, 20, 0.95)';
  ctx.strokeText(name, 128, 24);
  ctx.fillStyle = '#f6fcff';
  ctx.fillText(name, 128, 24);
  ctx.shadowBlur = 0;
  // line 2: the category, small caps, letter-spaced
  ctx.font = font(14);
  ctx.fillStyle = yours ? '#ffe9a8' : '#8ad4ff';
  const label = (CATEGORY_LABEL[category] || category || '').toUpperCase().split('').join('\u200a');
  ctx.lineWidth = 3; ctx.strokeText(label, 128, 49);
  ctx.fillText(label, 128, 49);
  return c;
}

export class Signs {
  constructor(game) {
    this.game = game;
    this.layout = game.coruscant ? game.coruscant.layout : null;
    this.group = new THREE.Group();
    this.group.name = 'entrance-signs';
    game.scene.add(this.group);
    this.geo = new THREE.PlaneGeometry(SIGN_W, SIGN_H);
    this.signs = [];             // { lotId, x, y, z, yaw, key, mesh|null, mid }
    this.byLot = new Map();      // lotId -> signs[]
    this.textures = new Map();   // key -> { tex, mat, lastSeen }
    this.seenLots = new Set();
    this.inside = null;          // lot the player is currently inside (id) for the enter/leave toasts
    this.lastToast = new Map();  // lotId -> game time of the last toast
    this.syncTimer = 0;
    this.stats = { signs: 0, visible: 0, textures: 0, toasts: 0, lots: 0 };
    this.log = [];               // last toasts (tests)
    this.sync();
  }

  // Pull the building records the city has generated since the last call.
  sync() {
    const cm = this.game.coruscant && this.game.coruscant.cityMeta ? this.game.coruscant.cityMeta() : [];
    for (const m of cm) { if (this.seenLots.has(m.id)) continue; this.seenLots.add(m.id); this.addLot(m); }
    this.stats.signs = this.signs.length; this.stats.lots = this.seenLots.size;
  }
  addLot(meta) {
    const lot = this.layout ? this.layout.lots[meta.id] : null;
    if (!isBuilding(lot)) return;
    const doors = [...(meta.doors || []).map((d) => ({ ...d, mid: false }))];
    if (meta.midDoor) doors.push({ x: meta.midDoor.x, y: meta.midDoor.y, z: meta.midDoor.z, side: lot.door ? lot.door.side : null, mid: true });
    const seen = new Set();
    for (const d of doors) {
      const dir = this.dirOf(d, lot);
      if (!dir) continue;
      // ground doors are recorded as the wall cell, the boulevard midDoor as the cell just outside the wall: the board
      // starts from an estimate (2-tall opening, flush facade) and settles against the real blocks once its chunk exists
      const wall = d.mid ? { x: d.x - dir.nx, y: d.y, z: d.z - dir.nz } : { x: d.x, y: d.y, z: d.z };
      const s = { lotId: lot.id, wall, nx: dir.nx, nz: dir.nz, yaw: Math.atan2(dir.nx, dir.nz), mesh: null, mid: d.mid, key: null, settled: false, settleTries: 0 };
      this.place(s, wall.y + 2, 0);
      // a landmark can list the same boulevard entrance both in doors[] and as midDoor: one board per spot
      const k = `${wall.x},${wall.y},${wall.z}`;
      if (seen.has(k)) continue; seen.add(k);
      this.signs.push(s);
      let arr = this.byLot.get(lot.id); if (!arr) { arr = []; this.byLot.set(lot.id, arr); } arr.push(s);
    }
  }
  // Outward normal of a door: its recorded side when cardinal, else the nearest lot edge (interior/arcade doors).
  dirOf(d, lot) {
    const side = d.side;
    if (side === 'W') return { nx: -1, nz: 0 };
    if (side === 'E') return { nx: 1, nz: 0 };
    if (side === 'N') return { nx: 0, nz: -1 };
    if (side === 'S') return { nx: 0, nz: 1 };
    // midDoor / arcade doors carry the lot's front when it is set on the lot
    const dists = [[d.x - lot.x0, { nx: -1, nz: 0 }], [lot.x1 - 1 - d.x, { nx: 1, nz: 0 }], [d.z - lot.z0, { nx: 0, nz: -1 }], [lot.z1 - 1 - d.z, { nx: 0, nz: 1 }]];
    dists.sort((a, b) => a[0] - b[0]);
    return dists[0][1];
  }
  // Board centre for a lintel at `lintelY`, hung `stepOut` whole blocks in front of the wall face.
  place(s, lintelY, stepOut) {
    const off = stepOut + 0.5 + FACE_GAP;
    s.x = s.wall.x + 0.5 + s.nx * off; s.z = s.wall.z + 0.5 + s.nz * off; s.y = lintelY + LINTEL_CLEAR;
    if (s.mesh) s.mesh.position.set(s.x, s.y, s.z);
  }
  // Fit the board to the built facade: openings are 2 or 3 blocks tall, so the lintel is the first solid wall block
  // above the door; "setback" and arcade facades hang rails, bars or canopies a block out from the wall at that height,
  // so the board steps out in front of whatever occupies its cell. Runs once the door's chunk has been generated.
  settle(s) {
    const w = this.game.world;
    if (!w) { s.settled = true; return; }
    const c = w.getChunk(Math.floor(s.wall.x / CS), Math.floor(s.wall.z / CS));
    if (!c || !c.generated) { if (++s.settleTries > 200) s.settled = true; return; }
    let lintel = s.wall.y + 2;
    for (let y = s.wall.y + 2; y <= s.wall.y + 5; y++) {
      const id = w.getBlock(s.wall.x, y, s.wall.z);
      if (id !== B.AIR && BLOCKS[id] && BLOCKS[id].solid !== false) { lintel = y; break; }
    }
    const yc = Math.floor(lintel + LINTEL_CLEAR);
    let stepOut = 0;
    while (stepOut < 3 && w.getBlock(s.wall.x + s.nx * (stepOut + 1), yc, s.wall.z + s.nz * (stepOut + 1)) !== B.AIR) stepOut++;
    this.place(s, lintel, stepOut);
    s.settled = true;
  }

  textFor(lotId) {
    const lot = this.layout.lots[lotId];
    const p = purposeFor(lot, this.layout);
    const eco = this.game.economy;
    if (eco && eco.apartment && eco.apartment.lotId === lotId) return { name: 'Your apartment', category: p.category, yours: true, key: `apt|${p.category}` };
    return { name: p.name, category: p.category, yours: false, key: `${p.name}|${p.category}` };
  }
  material(text) {
    let t = this.textures.get(text.key);
    if (!t) {
      const tex = new THREE.CanvasTexture(drawSignCanvas(text.name, text.category, { yours: text.yours }));
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.FrontSide });
      t = { tex, mat, lastSeen: 0 };
      this.textures.set(text.key, t);
    }
    t.lastSeen = this.game.time;
    return t;
  }
  ensureMesh(s) {
    if (!s.settled) this.settle(s);
    const text = this.textFor(s.lotId);
    if (s.mesh && s.key === text.key) { this.material(text); return s.mesh; }
    if (s.mesh) { this.group.remove(s.mesh); s.mesh = null; }
    const t = this.material(text);
    const mesh = new THREE.Mesh(this.geo, t.mat);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.yaw;
    mesh.renderOrder = 2;
    mesh.frustumCulled = true;
    this.group.add(mesh);
    s.mesh = mesh; s.key = text.key;
    return mesh;
  }
  // A lot's text changed (rented / released apartment): rebuild its boards.
  refreshLot(lotId) { for (const s of this.byLot.get(lotId) || []) { if (s.mesh) { this.group.remove(s.mesh); s.mesh = null; s.key = null; } } }

  // 20 tps: visibility ring, toasts, texture GC.
  update(player) {
    const t = this.game.time;
    this.syncTimer += 1;
    if (this.syncTimer >= 20) { this.syncTimer = 0; this.sync(); }
    const p = player.pos;
    const near = [];
    for (const s of this.signs) {
      const dx = s.x - p.x, dz = s.z - p.z, dy = s.y - (p.y + 1.6);
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= VIEW_DIST * VIEW_DIST) { s._d2 = d2; near.push(s); }
      else if (s.mesh) s.mesh.visible = false;
    }
    near.sort((a, b) => a._d2 - b._d2);
    let visible = 0;
    for (let i = 0; i < near.length; i++) {
      const s = near[i];
      if (i < MAX_VISIBLE) { this.ensureMesh(s).visible = true; visible++; }
      else if (s.mesh) s.mesh.visible = false;
    }
    this.stats.visible = visible;
    this.toasts(player);
    if ((this.game.tickCount & 63) === 0) this.gc(t);
  }
  gc(t) {
    for (const [key, tx] of this.textures) {
      if (t - tx.lastSeen < TEXTURE_TTL) continue;
      let used = false;
      for (const s of this.signs) if (s.mesh && s.mesh.visible && s.key === key) { used = true; break; }
      if (used) continue;
      for (const s of this.signs) if (s.key === key && s.mesh) { this.group.remove(s.mesh); s.mesh = null; s.key = null; }
      tx.mat.dispose(); tx.tex.dispose();
      this.textures.delete(key);
    }
    this.stats.textures = this.textures.size;
  }

  // "Entering <name> - <category>" / "Leaving <name>" as the player crosses into / out of a building footprint at a
  // height inside the building; debounced per lot so hovering in a doorway does not spam.
  toasts(player) {
    if (!this.layout) return;
    const p = player.pos;
    const lot = this.lotAt(p.x, p.z, p.y);
    const id = lot ? lot.id : null;
    if (id === this.inside) return;
    const t = this.game.time;
    // debounced per lot and direction: walking in and straight out shows both notices, dithering in a doorway
    // repeats neither within 5 s
    const fire = (lotId, text) => {
      const k = `${lotId}:${text.charAt(0)}`;
      const last = this.lastToast.get(k);
      if (last != null && t - last < TOAST_DEBOUNCE) return;
      this.lastToast.set(k, t);
      this.stats.toasts++;
      this.log.push({ t, text }); if (this.log.length > 40) this.log.shift();
      if (this.game.hud && this.game.hud.toast) this.game.hud.toast(hudText(text), '#9ad8ff'); else if (this.game.hud) this.game.hud.addMessage(hudText(text));
    };
    if (this.inside != null) { const prev = this.layout.lots[this.inside]; if (prev) fire(this.inside, `Leaving ${this.textFor(this.inside).name}`); }
    if (id != null) { const tx = this.textFor(id); fire(id, `Entering ${tx.name} - ${CATEGORY_LABEL[tx.category] || tx.category}`); }
    this.inside = id;
  }
  lotAt(x, z, y) {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (const l of this.layout.lotsIn(bx, bz, bx + 1, bz + 1)) {
      if (!isBuilding(l)) continue;
      if (y < LEVELS.ground - 1 || y > LEVELS.ground + (l.height || 60) + 2) continue;
      return l;
    }
    return null;
  }

  // Helpers for tests / tooling
  count() { return this.signs.length; }
  visibleCount() { return this.stats.visible; }
  // the n nearest signs by the same eye distance the visibility ring uses (3D: a mid-level board 35 blocks up counts)
  nearest(n = 10) { const p = this.game.player.pos; return this.signs.map((s) => ({ lotId: s.lotId, x: +s.x.toFixed(2), y: s.y, z: +s.z.toFixed(2), mid: s.mid, d: +Math.hypot(s.x - p.x, s.y - (p.y + 1.6), s.z - p.z).toFixed(1), key: s.key, visible: !!(s.mesh && s.mesh.visible) })).sort((a, b) => a.d - b.d).slice(0, n); }
}
