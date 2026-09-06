// Entrance signs (rubric 07 #2): a lit sign board over every door the city has generated so far - the building's name
// on the first line, its category on the second - plus the HUD toast "Entering <name> - <category>" / "Leaving ..."
// when the player walks into or out of a building.
//
// One small plane per door (shared PlaneGeometry, 2.4 x 0.6 blocks: Minecraft sign proportions), textured with a
// 256x64 canvas (dark panel, glowing text) that is cached by its text and created lazily the first time a sign comes
// within view. Signs further than VIEW_DIST are hidden and only the MAX_VISIBLE nearest are drawn, so the cost is at
// most 40 small transparent quads. Doors come from `cityMeta()` (ground `doors[]` and the boulevard `midDoor`), which
// grows as chunks stream in, so the list is re-synced every second.
import * as THREE from 'three';
import { LEVELS } from './layout.js';
import { purposeFor } from './purposes.js';

export const SIGN_W = 2.4, SIGN_H = 0.6;      // 4:1 like the 256x64 texture
export const VIEW_DIST = 48;
export const MAX_VISIBLE = 40;
const LINTEL_CLEAR = 1.4;                       // sign centre above the door lintel (doors are 2 tall: lintel = y + 2)
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
  // line 1: the name, bold, shrunk until it fits the 236 px inner width
  let size = 26;
  ctx.font = `bold ${size}px "Segoe UI", "DejaVu Sans", Arial, sans-serif`;
  while (size > 13 && ctx.measureText(name).width > 236) { size -= 1; ctx.font = `bold ${size}px "Segoe UI", "DejaVu Sans", Arial, sans-serif`; }
  ctx.shadowColor = accent; ctx.shadowBlur = 10;
  ctx.fillStyle = '#f2fbff';
  ctx.fillText(name, 128, 25);
  ctx.shadowBlur = 0;
  // line 2: the category, small caps, letter-spaced
  ctx.font = 'bold 13px "Segoe UI", "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = yours ? '#ffe9a8' : '#8ad4ff';
  const label = (CATEGORY_LABEL[category] || category || '').toUpperCase().split('').join('\u200a');
  ctx.fillText(label, 128, 48);
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
      const k = `${d.x},${d.y},${d.z}`;
      if (seen.has(k)) continue; seen.add(k);
      const dir = this.dirOf(d, lot);
      if (!dir) continue;
      // ground doors are recorded as the wall cell, the boulevard midDoor as the cell just outside the wall: either
      // way the board hangs 0.08 in front of the outer wall face, above the lintel
      const off = d.mid ? -0.42 : 0.58;
      const s = { lotId: lot.id, x: d.x + 0.5 + dir.nx * off, y: d.y + 2 + LINTEL_CLEAR, z: d.z + 0.5 + dir.nz * off, yaw: Math.atan2(dir.nx, dir.nz), mesh: null, mid: d.mid, key: null };
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
    const fire = (lotId, text) => {
      const last = this.lastToast.get(lotId);
      if (last != null && t - last < TOAST_DEBOUNCE) return;
      this.lastToast.set(lotId, t);
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
  nearest(n = 10) { const p = this.game.player.pos; return this.signs.map((s) => ({ lotId: s.lotId, x: +s.x.toFixed(2), y: s.y, z: +s.z.toFixed(2), mid: s.mid, d: +Math.hypot(s.x - p.x, s.z - p.z).toFixed(1), key: s.key, visible: !!(s.mesh && s.mesh.visible) })).sort((a, b) => a.d - b.d).slice(0, n); }
}
