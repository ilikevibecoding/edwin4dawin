import * as THREE from 'three';
import { CHECKPOINTS, ROOMS, ROOM_BY_ID, roomCenter, FLOOR_Y } from '../map/layout.js';
import { collision } from '../map/collision.js';
import { assets } from './assets.js';
import { WEAPONS } from '../weapons/defs.js';
import { buildWeaponModel } from '../weapons/models.js';
import { buildHostile, buildHostage, HOSTILE_VARIANTS, HOSTAGE_VARIANTS } from '../characters/models.js';
import { prop, PROPS } from '../props/library.js';
import { batchParts } from '../map/merge.js';
import { mat } from '../art/materials.js';

/**
 * DEVELOPMENT QA MODE
 * Owner: Opus 4, implemented by Opus 1.
 *
 * Reachable from `window.__northstar.qa`, from `?qa=1` and from the in-game
 * asset gallery. Nothing here draws intrusive UI in a normal player session:
 * every overlay starts disabled and the only way to enable one is an explicit
 * call or the `?qa=1` query parameter.
 */

export class QaTools {
  constructor(game) {
    this.game = game;
    this.enabled = new URLSearchParams(location.search).has('qa');
    this.overlays = {};
    this.galleryGroup = null;
    this.assetIdSprites = null;
    this.log = [];
  }

  _need() {
    if (!this.game.levelReady) {
      console.warn('[qa] level is not built yet');
      return false;
    }
    return true;
  }

  /* ---------------- Navigation ---------------- */

  checkpoints() {
    return Object.entries(CHECKPOINTS).map(([id, c]) => ({ id, ...c }));
  }

  teleport(name, opts = {}) {
    if (!this._need()) return false;
    let target = CHECKPOINTS[name];
    if (!target && ROOM_BY_ID[name]) {
      const c = roomCenter(name);
      target = { pos: c, yaw: 0, floor: ROOM_BY_ID[name].floor, label: ROOM_BY_ID[name].name };
    }
    if (!target && Array.isArray(name)) target = { pos: name, yaw: opts.yaw ?? 0 };
    if (!target) {
      console.warn(`[qa] unknown checkpoint "${name}"`);
      return false;
    }
    const p = target.pos.slice();
    const g = collision.groundAt(p[0], p[2], p[1] + 2.2);
    if (g) p[1] = g.y;
    this.game.player.teleport(p, opts.yaw ?? target.yaw ?? 0);
    this.log.push({ t: 'teleport', name, pos: p });
    return true;
  }

  /* ---------------- Loadout ---------------- */

  giveWeapon(id, opts = {}) {
    if (!this._need()) return false;
    const def = WEAPONS[id];
    if (!def) { console.warn(`[qa] unknown weapon "${id}"`); return false; }
    const c = this.game.combat;
    if (def.category === 'utility') {
      c.utilityStock.set(id, (c.utilityStock.get(id) ?? 0) + (opts.count ?? 2));
      if (!c.utilityOrder.includes(id)) c.utilityOrder.push(id);
      return true;
    }
    const slot = def.slot;
    const inst = new (c.weapons.get(id)?.constructor ?? Object)();
    void inst;
    const WeaponInstance = Object.getPrototypeOf(c.slots[1] ?? {}).constructor;
    const w = new WeaponInstance(def);
    c.weapons.set(id, w);
    c.slots[slot] = w;
    c.currentSlot = slot;
    c.current = w;
    c.switching = false;
    c._applyViewModel(true);
    return true;
  }

  giveAmmo(count = 999) {
    if (!this._need()) return false;
    for (const w of this.game.combat.weapons.values()) {
      w.reserve = count;
      w.magazine = w.def.magazine ?? 0;
    }
    return true;
  }

  godMode(on = true) {
    this.game.player.godMode = !!on;
    const orig = this.game.player.damage.bind(this.game.player);
    if (on && !this._origDamage) {
      this._origDamage = orig;
      this.game.player.damage = () => 0;
    } else if (!on && this._origDamage) {
      this.game.player.damage = this._origDamage;
      this._origDamage = null;
    }
    return this.game.player.godMode;
  }

  /* ---------------- Actors ---------------- */

  spawnEnemy(roomOrPos, variant = 'kestrel.assault') {
    if (!this._need()) return null;
    const e = this.game.mission.spawnEnemy(roomOrPos, variant);
    this.log.push({ t: 'spawnEnemy', room: roomOrPos, variant, id: e?.id });
    return e?.id ?? null;
  }

  killAll() {
    if (!this._need()) return 0;
    let n = 0;
    for (const e of this.game.mission.enemies) {
      if (e.alive) { e.damage(9999, { byPlayer: false }); n++; }
    }
    return n;
  }

  freezeAI(v = true) {
    if (!this._need()) return false;
    this.game.mission.freezeAI(v);
    return v;
  }

  /* ---------------- World ---------------- */

  setLighting(scenario) {
    if (!this._need()) return false;
    this.game.level.lights.setScenario(scenario);
    this.log.push({ t: 'lighting', scenario });
    return true;
  }

  lightingScenarios() {
    return ['day', 'overcast', 'dusk', 'blackout', 'neutral'];
  }

  openDoor(id, open = true) {
    if (!this._need()) return false;
    const d = this.game.level.doors.byId.get(id);
    if (!d) return false;
    if (d.locked) d.unlock();
    d.toggle(false, open ? 'open' : 'close');
    return true;
  }

  unlockAllDoors() {
    if (!this._need()) return 0;
    let n = 0;
    for (const d of this.game.level.doors.doors) { if (d.locked) { d.unlock(); n++; } }
    return n;
  }

  breakGlass(index = 0) {
    if (!this._need()) return false;
    const pane = this.game.level.glass.panes[index];
    if (!pane) return false;
    pane.shatter(pane.center.clone(), new THREE.Vector3(0, 0, 1));
    return true;
  }

  /* ---------------- Mission ---------------- */

  resetMission() {
    if (!this._need()) return false;
    this.game.restart();
    return true;
  }

  setObjective(idOrIndex) {
    if (!this._need()) return false;
    return this.game.mission.setObjective(idOrIndex);
  }

  secureHostages() {
    if (!this._need()) return 0;
    let n = 0;
    for (const h of this.game.mission.hostages) {
      if (h.alive && h.state === 'held') { h.interact(this.game.player); n++; }
    }
    return n;
  }

  forceVictory() {
    if (!this._need()) return false;
    this.game.mission.end(true, 'QA forced victory');
    return true;
  }

  forceDefeat() {
    if (!this._need()) return false;
    this.game.mission.end(false, 'QA forced defeat');
    return true;
  }

  /* ---------------- Debug overlays ---------------- */

  showCollision(on = true) {
    if (!this._need()) return false;
    if (on && !this.overlays.collision) {
      const geo = new THREE.BufferGeometry();
      const pts = [];
      for (const b of collision.boxes) {
        pushBoxLines(pts, b);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x35e07f, transparent: true, opacity: 0.35 }));
      line.name = 'qa:collision';
      line.userData.noHit = true;
      this.game.engine.scene.add(line);
      this.overlays.collision = line;
    }
    if (this.overlays.collision) this.overlays.collision.visible = !!on;
    return !!on;
  }

  showNav(on = true) {
    if (!this._need()) return false;
    if (on && !this.overlays.nav) {
      const geo = this.game.level.nav.debugGeometry();
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7fd4ff, size: 0.07, sizeAttenuation: true }));
      pts.name = 'qa:nav';
      pts.userData.noHit = true;
      this.game.engine.scene.add(pts);
      this.overlays.nav = pts;
    }
    if (this.overlays.nav) this.overlays.nav.visible = !!on;
    return !!on;
  }

  showAssetIds(on = true) {
    if (!this._need()) return false;
    if (on && !this.assetIdSprites) {
      const group = new THREE.Group();
      group.name = 'qa:assetIds';
      for (const r of ROOMS) {
        if (r.kind === 'exterior') continue;
        const c = [(r.x0 + r.x1) / 2, FLOOR_Y[r.floor] + 2.3, (r.z0 + r.z1) / 2];
        group.add(makeLabel(`${r.id} — ${r.name}`, c));
      }
      group.userData.noHit = true;
      this.game.engine.scene.add(group);
      this.assetIdSprites = group;
    }
    if (this.assetIdSprites) this.assetIdSprites.visible = !!on;
    return !!on;
  }

  /* ---------------- Asset gallery ---------------- */

  /**
   * Builds a neutral studio scene containing a requested asset so it can be
   * inspected in isolation with turntable-style camera positions.
   */
  openGallery(assetId = null, opts = {}) {
    if (!this._need()) return false;
    this.closeGallery();
    const group = new THREE.Group();
    group.name = 'qa:gallery';
    const base = new THREE.Vector3(0, 400, 0);
    group.position.copy(base);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), mat('concrete.polished'));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    group.add(key);
    group.add(new THREE.HemisphereLight(0xc8dcf0, 0x3a4046, 1.4));

    const placed = [];
    const spec = assets.get(assetId);
    const kind = opts.kind ?? inferKind(assetId, spec);

    try {
      if (kind === 'weapon') {
        const id = assetId?.replace(/^wpn\.(model|def|anim)\./, '') ?? 'rifle.northwind';
        const wm = buildWeaponModel(id, { firstPerson: false });
        wm.group.position.set(0, 1.35, 0);
        wm.group.scale.setScalar(2.2);
        group.add(wm.group);
        placed.push(id);
      } else if (kind === 'character') {
        const id = assetId?.replace(/^char\.(hostile|hostage)\./, '') ?? 'assault';
        const isHostage = assetId?.includes('hostage');
        const built = isHostage
          ? buildHostage(HOSTAGE_VARIANTS.find((v) => v.id.includes(id))?.id ?? 'analyst', {})
          : buildHostile(HOSTILE_VARIANTS.find((v) => v.id.includes(id))?.id ?? 'kestrel.assault', {});
        group.add(built.group);
        placed.push(id);
      } else if (kind === 'prop' && PROPS[assetId]) {
        const built = prop(assetId, { pos: [0, 0, 0], rot: 0 });
        const batch = batchParts(built.parts, { name: 'gallery', bvh: false });
        group.add(batch);
        placed.push(assetId);
      } else {
        // Contact sheet: a grid of every prop, useful for the material pass
        let i = 0;
        const ids = Object.keys(PROPS).slice(opts.page ? opts.page * 36 : 0, (opts.page ? opts.page * 36 : 0) + 36);
        const allParts = [];
        for (const id of ids) {
          const col = i % 6;
          const row = Math.floor(i / 6);
          try {
            const built = prop(id, { pos: [(col - 2.5) * 2.4, 0, (row - 2.5) * 2.4], rot: 0 });
            allParts.push(...built.parts);
            placed.push(id);
          } catch { /* skip props that need a host surface */ }
          i++;
        }
        if (allParts.length) group.add(batchParts(allParts, { name: 'galleryGrid', bvh: false }));
      }
    } catch (err) {
      console.error('[qa] gallery build failed', err);
    }

    this.game.engine.scene.add(group);
    this.galleryGroup = group;
    this.galleryReturn = {
      pos: this.game.player.position.clone(),
      yaw: this.game.player.yaw, pitch: this.game.player.pitch,
      noclip: this.game.player.noclip,
    };
    this.game.player.noclip = true;
    this.game.player.teleport([base.x, base.y + 1.5, base.z + 3.6], 0);
    this.game.player.pitch = -0.12;
    return { placed, at: [base.x, base.y, base.z] };
  }

  closeGallery() {
    if (!this.galleryGroup) return false;
    this.game.engine.scene.remove(this.galleryGroup);
    this.galleryGroup.traverse((o) => {
      if (o.isMesh) { o.geometry?.dispose?.(); }
    });
    this.galleryGroup = null;
    if (this.galleryReturn) {
      this.game.player.noclip = this.galleryReturn.noclip;
      this.game.player.teleport([this.galleryReturn.pos.x, this.galleryReturn.pos.y, this.galleryReturn.pos.z]);
      this.game.player.yaw = this.galleryReturn.yaw;
      this.game.player.pitch = this.galleryReturn.pitch;
      this.galleryReturn = null;
    }
    return true;
  }

  galleryList() {
    return assets.all().map((a) => ({ id: a.id, name: a.name, category: a.category, owner: a.owner, status: a.status }));
  }

  /* ---------------- Reporting ---------------- */

  screenshotState() {
    return this.game.renderToText();
  }

  report() {
    return {
      level: this.game.levelStats,
      manifest: assets.stats(),
      render: this.game.engine.stats(),
      collision: collision.stats(),
      nav: this.game.level?.nav?.report(),
      lights: this.game.level?.lights?.report(),
      vfx: this.game.vfx?.stats,
      audio: this.game.audio?.stats,
      consoleErrors: this.game.consoleErrors,
    };
  }

  setNoclip(v = true) {
    this.game.player.noclip = !!v;
    return this.game.player.noclip;
  }

  setTimeScale() {
    console.warn('[qa] time scale is fixed; use advanceTime(ms) for deterministic stepping');
    return 1;
  }
}

function pushBoxLines(out, b) {
  const { x0, y0, z0, x1, y1, z1 } = b;
  const v = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [a, c] of e) {
    out.push(v[a][0], v[a][1], v[a][2], v[c][0], v[c][1], v[c][2]);
  }
}

function makeLabel(text, pos) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(8,14,22,0.82)';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#7fd4ff';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 34);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.position.set(pos[0], pos[1], pos[2]);
  spr.scale.set(3.2, 0.4, 1);
  spr.userData.noHit = true;
  return spr;
}

function inferKind(assetId, spec) {
  if (!assetId) return 'contact';
  if (spec?.category === 'weapon' || assetId.startsWith('wpn.')) return 'weapon';
  if (spec?.category === 'character' || assetId.startsWith('char.')) return 'character';
  if (assetId.startsWith('prop.')) return 'prop';
  return 'contact';
}
