// Development-only QA mode (enabled with ?qa=1). Exposes window.__qa for
// Playwright and an on-screen panel for manual inspection. The normal player
// build installs the API (harmless, no UI) but shows no debug interface.
import * as THREE from 'three';
import { CHECKPOINTS } from '../world/layout.js';
import { WEAPON_DEFS } from '../player/weapons.js';
import { listAssets, buildAsset } from '../assets/registry.js';

export function installQA(game, showPanel) {
  const qa = {
    listCheckpoints: () => Object.keys(CHECKPOINTS),

    teleport: (name) => {
      const cp = typeof name === 'string' ? CHECKPOINTS[name] : name;
      if (!cp) return { ok: false, error: 'unknown checkpoint', available: Object.keys(CHECKPOINTS) };
      game.player.pos = { x: cp.x, y: cp.y ?? 0, z: cp.z };
      game.player.vel = { x: 0, y: 0, z: 0 };
      if (cp.yaw != null) game.player.yaw = cp.yaw;
      game.player.pitch = 0;
      return { ok: true, pos: game.player.pos };
    },

    place: (x, y, z, yaw) => {
      game.player.pos = { x, y, z };
      game.player.vel = { x: 0, y: 0, z: 0 };
      if (yaw != null) game.player.yaw = yaw;
      return { ok: true };
    },

    look: (yawDeg, pitchDeg) => {
      if (yawDeg != null) game.player.yaw = (yawDeg * Math.PI) / 180;
      if (pitchDeg != null) game.player.pitch = (pitchDeg * Math.PI) / 180;
      return { ok: true };
    },

    giveWeapon: (id) => {
      if (!WEAPON_DEFS[id]) return { ok: false, error: 'unknown weapon', available: Object.keys(WEAPON_DEFS) };
      return { ok: game.weapons.giveWeapon(id) };
    },

    selectSlot: (slot) => { game.weapons.selectSlot(slot); return { ok: true, current: game.weapons.currentId }; },
    giveAmmo: () => {
      for (const s of Object.values(game.weapons.slots)) {
        if (s.def.kind === 'gun') { s.mag = s.def.mag; s.reserve = s.def.reserve; }
        if (s.def.kind === 'throwable') s.count = s.def.count;
      }
      return { ok: true };
    },

    spawnEnemy: (at, opts = {}) => {
      let pos = at;
      if (typeof at === 'string') {
        const cp = CHECKPOINTS[at];
        if (!cp) return { ok: false, error: 'unknown checkpoint' };
        pos = { x: cp.x, y: cp.y ?? 0, z: cp.z };
      }
      const e = game.ai.spawnEnemyAt(pos, opts);
      return { ok: true, id: e.id };
    },

    killEnemies: () => {
      let n = 0;
      for (const e of game.ai.aliveEnemies()) { e.takeDamage(9999, { part: 'body' }); n++; }
      return { ok: true, killed: n };
    },

    freezeAI: (v = true) => { game.ai.frozen = !!v; return { ok: true, frozen: game.ai.frozen }; },
    god: (v = true) => { game.player.god = !!v; return { ok: true }; },
    noclip: (v = true) => { game.player.noclip = !!v; return { ok: true }; },

    setLighting: (scenario) => { game.lighting.setScenario(scenario); return { ok: true, scenario }; },

    resetMission: () => { game.restartMission(); return { ok: true }; },
    start: (difficulty = 'operative', primary = 'bdr15') => {
      game.ui.selectedDifficulty = difficulty;
      game.ui.selectedPrimary = primary;
      game.beginMission();
      return { ok: true };
    },

    // jump the mission to a specific state for scenario testing
    setObjective: (phase) => {
      const m = game.mission;
      if (!m) return { ok: false, error: 'no mission' };
      const hostages = game.ai.hostages;
      if (phase === 'locate') { m.phase = 'locate'; }
      else if (phase === 'secure') {
        m.phase = 'secure';
        for (const h of hostages) h.found = true;
      } else if (phase === 'escort') {
        for (const h of hostages) { h.found = true; if (h.state === 'captive') h.secure(); }
        m.phase = 'escort';
      } else if (phase === 'hold') {
        for (const h of hostages) {
          h.found = true;
          if (h.state === 'captive') h.secure();
          h.pos = { x: 30, y: 0, z: 3 };
        }
        game.player.pos = { x: 31, y: 0, z: 3.5 };
        m.usePanel();
      } else return { ok: false, error: 'unknown phase' };
      m._objectiveDirty = true;
      return { ok: true, phase: m.phase };
    },

    doorState: (id, action) => {
      const d = game.world.doorById(id);
      if (!d) return { ok: false, error: 'unknown door' };
      if (action === 'open') { d.locked = false; d.open(); }
      else if (action === 'close') d.close();
      else if (action === 'unlock') d.unlock();
      return { ok: true, state: d.stateInfo() };
    },

    // asset gallery -----------------------------------------------------
    listAssets: () => listAssets(),
    openGallery: (assetId) => openGallery(game, assetId),
    closeGallery: () => closeGallery(game),
    galleryNext: (dir = 1) => stepGallery(game, dir),

    showCollision: (v = true) => toggleCollisionView(game, v),
    showNav: (v = true) => toggleNavView(game, v),

    screenshotMode: (hideHud = true) => {
      document.getElementById('hud').style.visibility = hideHud ? 'hidden' : 'visible';
      return { ok: true };
    },

    state: () => window.render_game_to_text(),
  };

  window.__qa = qa;
  if (showPanel) buildPanel(game, qa);
  return qa;
}

// ---------------------------------------------------------------- gallery
let galleryState = null;

function openGallery(game, assetId) {
  const assets = listAssets();
  if (!assets.length) return { ok: false, error: 'no registered assets with builders yet' };
  const idx = Math.max(0, assets.findIndex((a) => a.id === assetId));
  closeGallery(game);
  const group = new THREE.Group();
  group.name = 'gallery';
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.1, 40),
    new THREE.MeshStandardMaterial({ color: 0x2c3540, roughness: 0.85 }));
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  group.add(floor);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 2);
  key.castShadow = true;
  const fill = new THREE.HemisphereLight(0xbcccdd, 0x333a41, 1.0);
  group.add(key, fill);
  group.position.set(0, -60, 0); // gallery basement, away from the map
  game.scene.add(group);
  galleryState = { group, assets, idx: -1, mesh: null };
  const res = stepGallery(game, 0, idx);
  game.galleryActive = true;
  return res;
}

function stepGallery(game, dir, absolute) {
  if (!galleryState) return { ok: false, error: 'gallery closed' };
  const g = galleryState;
  g.idx = absolute != null ? absolute : (g.idx + dir + g.assets.length) % g.assets.length;
  if (g.mesh) g.group.remove(g.mesh);
  const asset = g.assets[g.idx];
  const built = buildAsset(asset.id, game);
  if (!built) return { ok: false, error: 'asset has no builder: ' + asset.id };
  g.mesh = built;
  g.group.add(built);
  // on-screen asset ID label (QA requirement: displaying asset IDs)
  let label = document.getElementById('qa-asset-label');
  if (!label) {
    label = document.createElement('div');
    label.id = 'qa-asset-label';
    label.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(5,10,16,0.9);color:#8fd8ff;font-family:monospace;font-size:14px;padding:6px 16px;border:1px solid #2b4258;z-index:70;pointer-events:none';
    document.body.appendChild(label);
  }
  label.hidden = false;
  label.textContent = `${g.idx + 1}/${g.assets.length}  ${asset.id} — ${asset.name} [${asset.category}]`;
  // aim player camera at the pedestal
  game.player.pos = { x: 3.4, y: -60 + 0.2, z: 3.4 };
  game.player.yaw = Math.PI * 0.25;
  game.player.pitch = -0.18;
  game.player.noclip = true;
  return { ok: true, asset: { id: asset.id, name: asset.name, category: asset.category } };
}

function closeGallery(game) {
  if (galleryState) {
    game.scene.remove(galleryState.group);
    galleryState = null;
    game.galleryActive = false;
    game.player.noclip = false;
    const label = document.getElementById('qa-asset-label');
    if (label) label.hidden = true;
  }
  return { ok: true };
}

// ------------------------------------------------------- collision/nav view
let collisionView = null;
let navView = null;

function toggleCollisionView(game, v) {
  if (collisionView) { game.scene.remove(collisionView); collisionView = null; }
  if (v) {
    collisionView = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x3fd08c, wireframe: true, transparent: true, opacity: 0.25 });
    for (const box of game.world.collision.boxes.values()) {
      const size = { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z };
      const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
      m.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
      collisionView.add(m);
    }
    game.scene.add(collisionView);
  }
  return { ok: true, shown: !!v };
}

function toggleNavView(game, v) {
  if (navView) { game.scene.remove(navView); navView = null; }
  if (v) {
    const cells = [];
    for (const list of game.ai.nav.cells.values()) for (const c of list) cells.push(c);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cells.length * 3);
    cells.forEach((c, i) => { pos[i * 3] = c.x; pos[i * 3 + 1] = c.y + 0.06; pos[i * 3 + 2] = c.z; });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    navView = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x46b8ff, size: 0.09 }));
    game.scene.add(navView);
  }
  return { ok: true, shown: !!v, cells: game.ai.nav.count };
}

// ---------------------------------------------------------------- panel UI
function buildPanel(game, qa) {
  const root = document.getElementById('qa-root');
  root.hidden = false;
  const panel = document.createElement('div');
  panel.className = 'qa-panel';
  panel.innerHTML = `<h5>QA MODE</h5>
    <div id="qa-info" style="margin-bottom:6px;color:#7d97ab">-</div>
    <h5>Teleport</h5><div id="qa-tp"></div>
    <h5>Actions</h5><div id="qa-actions"></div>`;
  root.appendChild(panel);
  const tp = panel.querySelector('#qa-tp');
  for (const name of Object.keys(CHECKPOINTS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => qa.teleport(name);
    tp.appendChild(b);
  }
  const actions = panel.querySelector('#qa-actions');
  const acts = [
    ['start', () => qa.start()],
    ['god', () => qa.god(!game.player.god)],
    ['noclip', () => qa.noclip(!game.player.noclip)],
    ['freeze AI', () => qa.freezeAI(!game.ai.frozen)],
    ['kill enemies', () => qa.killEnemies()],
    ['ammo', () => qa.giveAmmo()],
    ['escort phase', () => qa.setObjective('escort')],
    ['hold phase', () => qa.setObjective('hold')],
    ['reset', () => qa.resetMission()],
    ['collision', () => qa.showCollision(!collisionView)],
    ['nav', () => qa.showNav(!navView)],
    ['gallery', () => (galleryState ? qa.closeGallery() : qa.openGallery())],
    ['gallery >', () => qa.galleryNext(1)],
    ['light: night', () => qa.setLighting('night')],
    ['light: default', () => qa.setLighting('default')],
  ];
  for (const [label, fn] of acts) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    actions.appendChild(b);
  }
  setInterval(() => {
    const info = panel.querySelector('#qa-info');
    if (info && game.player) {
      const p = game.player.pos;
      const room = game.world.roomAt?.(p.x, p.z, p.y);
      info.textContent = `${game.state} | ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} | ${room?.id || 'outside'} | enemies ${game.ai?.aliveEnemies().length ?? 0}`;
    }
  }, 500);
}
