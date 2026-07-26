// Mission runtime (Opus 1 integration; Opus 3 owns objective/round logic):
// builds the world once, then supports clean resets: all entities and dynamic state are
// reconstructed from layout data on every deploy/restart.
import * as THREE from 'three';
import { CollisionWorld } from '../core/collide.js';
import { makeRng } from '../core/rng.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { buildMap } from '../map/builder.js';
import { placeProps } from '../props/index.js';
import { PLAYER_SPAWN, HOSTAGES, ENEMIES, EXTRACTION, roomAt, floorIndexForY, MAP_NAME } from '../map/layout.js';
import { NavGrid } from '../ai/navgrid.js';
import { Enemy } from '../ai/enemy.js';
import { Hostage } from '../ai/hostage.js';
import { Player } from '../player/player.js';
import { ViewModel } from '../weapons/viewmodel.js';
import { VfxSystem } from '../vfx/particles.js';
import { fireHitscan } from '../weapons/ballistics.js';
import { DIFFICULTIES } from './difficulty.js';
import { settings } from '../core/settings.js';

export class Mission {
  constructor(game, progress = () => {}) {
    this.game = game;
    this.progress = progress;
    this.scene = new THREE.Scene();
    this.world = new CollisionWorld();
    this.rng = makeRng(1);
    this.active = false;
    this.result = null;
    this.enemies = [];
    this.hostages = [];
    this.projectiles = [];
    this.timer = 0;
    this.objectives = [];
    this.stats = { kills: 0, shots: 0, hits: 0 };
    this.aiFrozen = false;
    this.entGroup = new THREE.Group();
    this.entGroup.name = 'entities';
    this.scene.add(this.entGroup);
    this.interactTarget = null;
    this.extractCountdown = null;
    this.currentAmbience = new Set();
    this.difficulty = DIFFICULTIES.operator;
    this._fovCurrent = settings.get('fov');
  }

  async build() {
    const step = async (pct, label) => { this.progress(pct, label); await new Promise((r) => setTimeout(r, 10)); };
    await step(5, 'Preparing renderer');
    this.scene.background = new THREE.Color(0xaec4d8);
    this.scene.fog = new THREE.FogExp2(0xaec4d8, 0.011);
    // Neutral environment reflections so metals/glass read (kept subtle).
    try {
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      const pmrem = new THREE.PMREMGenerator(this.game.renderer.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.42;
      pmrem.dispose();
    } catch (e) { console.warn('env map unavailable:', e.message); }

    await step(15, 'Constructing Northstar Administrative Center');
    this.map = buildMap(this.scene, this.world);

    await step(40, 'Furnishing offices');
    placeProps(this.scene, this.world, this.map);

    await step(55, 'Baking navigation mesh');
    this.nav = new NavGrid(this.world, { minX: -10, maxX: 50, minZ: -8, maxZ: 46 }).bake();

    await step(70, 'Priming effects');
    this.vfx = new VfxSystem(this.scene);

    await step(80, 'Equipping operator');
    this.player = new Player(this);
    this.viewModel = new ViewModel(this.game.renderer.camera, this.player);
    this.scene.add(this.game.renderer.camera); // camera holds the viewmodel

    await step(90, 'Wiring mission systems');
    this._wireEvents();
    this.game.renderer.onQualityChange((q) => this.map.lights.applyQuality(q));
    this.map.lights.applyQuality(this.game.renderer.profile);
    await step(100, 'Ready');
  }

  _wireEvents() {
    bus.on('player-fired', ({ def }) => this._onPlayerFired(def));
    bus.on('player-melee', () => this._onPlayerMelee());
    bus.on('player-throw', ({ def }) => this._onPlayerThrow(def));
    bus.on('impact', (e) => {
      this.vfx.impact(e.point, e.normal, e.material);
      if (e.material !== 'flesh') audio.impact(e.material === 'drywall' ? 'drywall' : e.material, e.point, 0.7);
    });
    bus.on('noise', (n) => {
      if (!this.active) return;
      for (const e of this.enemies) e.hearNoise(n);
      for (const h of this.hostages) h.hearNoise(n);
    });
    bus.on('enemy-killed', ({ pos }) => {
      if (!this.active) return;
      this.stats.kills++;
      audio.ui('kill');
      // nearby enemies react to a comrade dropping
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.pos.distanceTo(pos);
        if (d < 13 && e.state !== 'combat') {
          e.suspicion = Math.min(1, e.suspicion + 0.7);
          e.investigatePos = pos.clone();
          e.state = 'investigate';
          e.path = null;
        }
      }
    });
    bus.on('enemy-hit', () => { this.stats.hits++; audio.ui('hit'); });
    bus.on('player-died', () => this._endMission('defeat', 'Operator down. The assault team will regroup.'));
    bus.on('hostage-died', () => this._endMission('defeat', 'A hostage was lost. Mission failed.'));
    bus.on('hostage-secured', () => audio.ui('objective'));
    bus.on('hostage-extracted', () => audio.ui('objective'));
    bus.on('glass-broken', ({ pos, w, h }) => this.vfx.glassBurst(pos, w, h));
  }

  // -------------------------------------------------------------------------
  reset({ difficulty = 'operator', loadout, seed = 1337 }) {
    this.difficulty = DIFFICULTIES[difficulty] || DIFFICULTIES.operator;
    this.rng = makeRng(seed >>> 0 || 1);
    this.result = null;
    this.timer = 0;
    this.stats = { kills: 0, shots: 0, hits: 0 };
    this.extractCountdown = null;
    this.aiFrozen = false;
    this.interactTarget = null;

    for (const e of this.enemies) e.dispose();
    for (const h of this.hostages) h.dispose();
    this.enemies = [];
    this.hostages = [];
    this.projectiles = [];
    this.vfx.clear();
    this.map.resetDynamic();

    this.player.spawn(PLAYER_SPAWN.pos, PLAYER_SPAWN.yawDeg, loadout, this.difficulty.playerArmor);

    for (const spec of ENEMIES) {
      if ((spec.minDifficulty ?? 0) > this.difficulty.enemyCount) continue;
      this.enemies.push(new Enemy(this, spec, this.difficulty));
    }
    for (const spec of HOSTAGES) {
      this.hostages.push(new Hostage(this, spec));
    }

    this.objectives = [
      { id: 'infiltrate', label: 'Enter the administrative center', state: 'active' },
      { id: 'locate', label: 'Locate both hostages', state: 'pending', found: 0 },
      { id: 'secure', label: 'Secure the hostages', state: 'pending' },
      { id: 'escort', label: 'Escort hostages to the extraction garage', state: 'pending' },
      { id: 'exfil', label: 'Hold the extraction zone', state: 'pending' },
    ];
    this.active = true;
    bus.emit('objective-changed', { objectives: this.objectives });
    bus.emit('mission-reset', {});
  }

  deactivate() { this.active = false; }

  // -------------------------------------------------------------------------
  update(dt, input) {
    if (!this.active) return;
    this.timer += dt;
    this._pathBudget = 3; // max A* requests per fixed step (NS-8)

    // player
    this.player.update(dt, input, this.world);
    this.viewModel.update(dt, input);

    // interaction
    this._updateInteraction(input);

    // AI
    if (!this.aiFrozen) {
      for (const e of this.enemies) e.update(dt);
    } else {
      for (const e of this.enemies) e.rig.update(dt, 0);
    }
    for (const h of this.hostages) h.update(dt);

    // world dynamics
    this.map.update(dt);
    this._updateProjectiles(dt);
    this.vfx.update(dt, this.game.renderer.camera);

    // audio listener + zone ambience
    const fwd = this.player.forwardVec();
    audio.setListener(this.player.pos.x, this.player.eyeY, this.player.pos.z, fwd.x, fwd.z);
    this._updateAmbience();

    // objective logic
    this._updateObjectives(dt);
  }

  updateIdle(dt) {
    // background simulation for title/menu scenes
    this.map.update(dt);
    this.vfx.update(dt, this.game.renderer.camera);
  }

  // Shared AI pathfinding: grid path with waypoints near doorways snapped to the door centerline
  // so agents cross doors centered instead of grazing the jamb corners.
  // NS-8: a per-step budget keeps worst-case A* cost bounded; denied callers simply retry
  // after their own repath backoff.
  findPath(from, to) {
    if (this._pathBudget !== undefined && this._pathBudget <= 0) return null;
    if (this._pathBudget !== undefined) this._pathBudget--;
    const path = this.nav.pathBetween(from, to);
    if (!path) return null;
    for (const wp of path) {
      for (const door of this.map.doors) {
        if (Math.abs(wp.y - door.center.y) > 1.4) continue;
        const dx = wp.x - door.center.x, dz = wp.z - door.center.z;
        if (dx * dx + dz * dz > 0.85) continue;
        if (door.axis === 'z') wp.z = door.center.z; // wall runs along z: crossing moves in x
        else wp.x = door.center.x;
      }
    }
    return path;
  }

  // -------------------------------------------------------------------------
  _updateInteraction(input) {
    const p = this.player;
    const eye = new THREE.Vector3(p.pos.x, p.eyeY, p.pos.z);
    const fwd = p.forwardVec();
    let best = null;

    // hostages
    for (const h of this.hostages) {
      if (!h.alive || h.state === 'extracting' || h.state === 'extracted') continue;
      const d = h.pos.distanceTo(p.pos);
      if (d < 2.3) {
        const label = h.state === 'captive' ? `Secure ${h.name}` : h.state === 'waiting' ? `${h.name}: follow me` : `${h.name}: hold position`;
        best = { kind: 'hostage', ref: h, label, priority: 2, dist: d };
      }
    }
    // dropped weapons (pickup = swap primary, inheriting the fallen weapon's ammo)
    for (const e of this.enemies) {
      if (e.alive || e.weaponTaken || !e.rig.droppedWeapon) continue;
      const obj = e.rig.droppedWeapon.obj;
      if (!obj.visible) continue;
      obj.getWorldPosition(this._tmpV || (this._tmpV = new THREE.Vector3()));
      const d = this._tmpV.distanceTo(p.pos);
      if (d < 1.9) {
        const defId = e.conf.weapon;
        const cur = p.arsenal.current;
        if (cur.def.id !== defId || cur.mag + cur.reserve < 5) {
          const label = `Take ${defId === 'boreal-k5' ? 'Boreal K5' : defId === 'halcyon-hc4' ? 'Halcyon HC-4' : defId === 'vanta-s12' ? 'Vanta S-12' : defId}`;
          const cand = { kind: 'pickup', ref: { interact: () => this._pickupWeapon(e) }, label, priority: 1.5, dist: d };
          if (!best || cand.priority > best.priority || (cand.priority === best.priority && cand.dist < best.dist)) best = cand;
        }
      }
    }
    // doors
    for (const door of this.map.doors) {
      if (door.kind === 'shutter') continue;
      const d = door.center.distanceTo(p.pos);
      const dy = Math.abs((door.center.y + 1) - p.eyeY);
      if (d < 2.1 && dy < 2.2) {
        const toDoor = new THREE.Vector3().subVectors(door.center, eye).setY(0).normalize();
        const facing = fwd.clone().setY(0).normalize().dot(toDoor);
        if (facing > 0.15 || d < 1.2) {
          const label = door.state === 'locked' ? 'Locked'
            : door.state === 'open' || door.state === 'opening' ? 'Close door' : 'Open door';
          const cand = { kind: 'door', ref: door, label, priority: 1, dist: d };
          if (!best || cand.priority > best.priority || (cand.priority === best.priority && cand.dist < best.dist)) best = cand;
        }
      }
    }
    this.interactTarget = best;
    if (input && input.usePressed && best) {
      best.ref.interact();
      if (best.kind === 'hostage') bus.emit('objective-changed', { objectives: this.objectives });
    }
  }

  _pickupWeapon(enemy) {
    const defId = enemy.conf.weapon;
    enemy.weaponTaken = true;
    if (enemy.rig.droppedWeapon) enemy.rig.droppedWeapon.obj.visible = false;
    this.player.arsenal.giveWeapon(defId, { mag: Math.max(0, enemy.mag), reserve: 30 });
    audio.mech('pickup', this.player.pos);
    bus.emit('subtitle', { text: `Recovered ${defId === 'boreal-k5' ? 'a Boreal K5' : defId === 'halcyon-hc4' ? 'a Halcyon HC-4' : defId === 'vanta-s12' ? 'a Vanta S-12' : defId}.`, ms: 1800 });
    return true;
  }

  _updateObjectives(dt) {
    const p = this.player;
    const obj = (id) => this.objectives.find((o) => o.id === id);

    // 1. infiltrate
    const o1 = obj('infiltrate');
    if (o1.state === 'active') {
      const floorIdx = floorIndexForY(p.pos.y);
      const room = roomAt(p.pos.x, p.pos.z, floorIdx);
      if (room && !room.exterior) {
        o1.state = 'done';
        obj('locate').state = 'active';
        audio.ui('objective');
        bus.emit('subtitle', { text: 'COMMAND: You are inside. Locate the two hostages.', ms: 3200 });
        bus.emit('objective-changed', { objectives: this.objectives });
      }
    }
    // 2. locate (discovery by proximity + LOS)
    const o2 = obj('locate');
    if (o2.state === 'active') {
      let found = 0;
      for (const h of this.hostages) {
        if (!h.discovered && h.alive) {
          const d = h.pos.distanceTo(p.pos);
          if (d < 10) {
            const eye = new THREE.Vector3(p.pos.x, p.eyeY, p.pos.z);
            const hPos = new THREE.Vector3(h.pos.x, h.pos.y + 1.0, h.pos.z);
            const dir = new THREE.Vector3().subVectors(hPos, eye);
            const dist = dir.length();
            dir.normalize();
            const hit = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, dist, (c) => c.blockSight);
            if (!hit) {
              h.discovered = true;
              audio.ui('objective');
              bus.emit('subtitle', { text: `Hostage located: ${h.name}.`, ms: 2600 });
            }
          }
        }
        if (h.discovered) found++;
      }
      o2.found = found;
      o2.label = `Locate both hostages (${found}/2)`;
      if (found >= 2) {
        o2.state = 'done';
        obj('secure').state = 'active';
        bus.emit('objective-changed', { objectives: this.objectives });
      }
    }
    // 3. secure
    const o3 = obj('secure');
    if (o3.state !== 'done') {
      const securedCount = this.hostages.filter((h) => h.secured).length;
      if (o3.state === 'active' || securedCount > 0) {
        if (o3.state === 'pending') { o3.state = 'active'; }
        o3.label = `Secure the hostages (${securedCount}/2)`;
        if (securedCount >= 2) {
          o3.state = 'done';
          if (obj('locate').state !== 'done') { obj('locate').state = 'done'; }
          obj('escort').state = 'active';
          bus.emit('subtitle', { text: 'COMMAND: Bring them to the garage. Van is standing by.', ms: 3200 });
          bus.emit('objective-changed', { objectives: this.objectives });
        }
      }
    }
    // hostage extraction trigger: following hostages entering the garage zone
    const exCenter = new THREE.Vector3(EXTRACTION.center[0], EXTRACTION.center[1], EXTRACTION.center[2]);
    let slot = 0;
    for (const h of this.hostages) {
      if (h.state === 'following' || h.state === 'waiting') {
        const d = Math.hypot(h.pos.x - exCenter.x, h.pos.z - exCenter.z);
        if (d < EXTRACTION.radius + 1.2 && Math.abs(h.pos.y - exCenter.y) < 1.5) {
          const target = exCenter.clone().add(new THREE.Vector3(slot === 0 ? -0.9 : 0.9, 0, 1.4));
          h.beginExtraction(target);
        }
      }
      slot++;
    }
    // 4. escort
    const o4 = obj('escort');
    if (o4.state === 'active') {
      const ex = this.hostages.filter((h) => h.state === 'extracted').length;
      o4.label = `Escort hostages to the extraction garage (${ex}/2)`;
      if (ex >= 2) {
        o4.state = 'done';
        obj('exfil').state = 'active';
        const shutter = this.map.doorById('garage-shutter');
        if (shutter) shutter.open();
        bus.emit('subtitle', { text: 'COMMAND: Hold the zone. Opening the garage now.', ms: 3000 });
        bus.emit('objective-changed', { objectives: this.objectives });
      }
    }
    // 5. exfil countdown
    const o5 = obj('exfil');
    if (o5.state === 'active') {
      const dp = Math.hypot(p.pos.x - exCenter.x, p.pos.z - exCenter.z);
      const playerIn = dp < EXTRACTION.radius + 1.6 && Math.abs(p.pos.y - exCenter.y) < 1.6;
      if (playerIn) {
        if (this.extractCountdown == null) this.extractCountdown = 4;
        this.extractCountdown -= dt;
        o5.label = `Hold the extraction zone (${Math.max(0, this.extractCountdown).toFixed(0)}s)`;
        if (this.extractCountdown <= 0) {
          o5.state = 'done';
          this._endMission('victory', 'Both hostages recovered. Outstanding work, operator.');
        }
      } else {
        this.extractCountdown = null;
        o5.label = 'Hold the extraction zone';
      }
      bus.emit('objective-tick', {});
    }
  }

  _endMission(result, message) {
    if (!this.active || this.result) return;
    this.result = { result, message, time: this.timer, stats: { ...this.stats } };
    this.active = false;
    bus.emit('mission-ended', { result, message, time: this.timer, stats: { ...this.stats } });
  }

  // -------------------------------------------------------------------------
  _onPlayerFired(def) {
    const cam = this.game.renderer.camera;
    const p = this.player;
    this.stats.shots++;
    const origin = new THREE.Vector3(p.pos.x, p.eyeY, p.pos.z);
    const baseDir = p.forwardVec();
    const spreadDeg = p.arsenal.spreadDeg(Math.hypot(p.vel.x, p.vel.z), p.crouched);
    const spread = THREE.MathUtils.degToRad(spreadDeg) * 0.5;
    const pellets = def.pellets ?? 1;
    const entities = this._shootableEntities();
    let tracerTo = null;
    for (let i = 0; i < pellets; i++) {
      const dir = baseDir.clone();
      const a = this.rng.next() * Math.PI * 2;
      const r = Math.sqrt(this.rng.next()) * spread;
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      const events = fireHitscan({ world: this.world, entities, origin, dir, def, shooter: p, rng: this.rng });
      for (const ev of events) {
        if (ev.type === 'entity') {
          bus.emit('player-hit-entity', { kind: ev.kind, region: ev.region });
          this.vfx.bloodPuff(ev.point);
        }
        if (!tracerTo && ev.point) tracerTo = new THREE.Vector3(ev.point.x, ev.point.y, ev.point.z);
      }
    }
    // vfx from muzzle
    const muzzle = this.viewModel.getMuzzleWorld();
    if (muzzle.lengthSq() > 0.01) {
      this.vfx.muzzleFlash(muzzle, baseDir, def.class === 'shotgun' ? 1.4 : 1);
      if (def.tracer && tracerTo) this.vfx.tracer(muzzle, tracerTo);
      else if (def.tracer) this.vfx.tracer(muzzle, origin.clone().addScaledVector(baseDir, 40));
      const right = new THREE.Vector3().crossVectors(baseDir, new THREE.Vector3(0, 1, 0)).normalize();
      this.vfx.casing(muzzle.clone().addScaledVector(baseDir, -0.18).addScaledVector(right, 0.06), right);
    }
    bus.emit('noise', { pos: p.pos.clone(), radius: def.noise, type: 'gunshot', source: 'player' });
  }

  _onPlayerMelee() {
    const p = this.player;
    const origin = new THREE.Vector3(p.pos.x, p.eyeY, p.pos.z);
    const dir = p.forwardVec();
    const entities = this._shootableEntities();
    // short-range stab
    setTimeoutSim(this, 0.12, () => {
      const events = fireHitscan({
        world: this.world, entities, origin, dir,
        def: { damage: 48, range: 1.8, falloffStart: 1.8, penetration: 0, noise: 3, class: 'melee' },
        shooter: p, rng: this.rng,
      });
      for (const ev of events) {
        if (ev.type === 'entity') { bus.emit('player-hit-entity', { kind: ev.kind, region: ev.region }); this.vfx.bloodPuff(ev.point); }
      }
    });
    bus.emit('noise', { pos: p.pos.clone(), radius: 3, type: 'melee', source: 'player' });
  }

  _onPlayerThrow(def) {
    const p = this.player;
    setTimeoutSim(this, 0.26, () => {
      const origin = new THREE.Vector3(p.pos.x, p.eyeY - 0.06, p.pos.z);
      const dir = p.forwardVec();
      this.projectiles.push({
        def,
        pos: origin.clone().addScaledVector(dir, 0.4),
        vel: dir.clone().multiplyScalar(10.5).add(new THREE.Vector3(0, 2.6, 0)),
        fuse: def.fuseMs / 1000,
        mesh: this._makeDeviceMesh(def),
      });
    });
  }

  _makeDeviceMesh(def) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: def.effect === 'flash' ? 0x5a6167 : 0x4a545c, roughness: 0.5, metalness: 0.6 }),
    );
    m.castShadow = true;
    this.entGroup.add(m);
    return m;
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.fuse -= dt;
      pr.vel.y -= 12 * dt;
      const step = pr.vel.clone().multiplyScalar(dt);
      const len = step.length();
      if (len > 0.0001) {
        const dir = step.clone().normalize();
        const hit = this.world.raycast(pr.pos.x, pr.pos.y, pr.pos.z, dir.x, dir.y, dir.z, len + 0.04, (c) => c.blockMove && c.tag !== 'enemy');
        if (hit) {
          const n = hit.normal;
          const d = pr.vel.dot(new THREE.Vector3(n.x, n.y, n.z));
          pr.vel.addScaledVector(new THREE.Vector3(n.x, n.y, n.z), -1.62 * d);
          pr.vel.multiplyScalar(0.42);
          pr.pos.set(hit.point.x + n.x * 0.05, hit.point.y + n.y * 0.05, hit.point.z + n.z * 0.05);
          if (Math.abs(d) > 1.4) audio.explosionish('bounce', pr.pos);
        } else {
          pr.pos.add(step);
        }
      }
      pr.mesh.position.copy(pr.pos);
      pr.mesh.rotation.x += dt * 8;
      if (pr.fuse <= 0) {
        this._detonate(pr);
        this.entGroup.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
    // timed callbacks
    if (this._timers) {
      for (let i = this._timers.length - 1; i >= 0; i--) {
        this._timers[i].t -= dt;
        if (this._timers[i].t <= 0) {
          const fn = this._timers[i].fn;
          this._timers.splice(i, 1);
          fn();
        }
      }
    }
  }

  _detonate(pr) {
    const def = pr.def;
    if (def.effect === 'flash') {
      this.vfx.flashBurst(pr.pos);
      bus.emit('noise', { pos: pr.pos.clone(), radius: def.noise, type: 'flash', source: 'player' });
      const affect = (pos, applyFn, eyeY) => {
        const d = pr.pos.distanceTo(pos);
        if (d > def.effectRadius) return;
        const eye = new THREE.Vector3(pos.x, eyeY, pos.z);
        const dir = new THREE.Vector3().subVectors(pr.pos, eye);
        const dist = dir.length();
        dir.normalize();
        const blocked = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, dist, (c) => c.blockSight);
        if (!blocked) applyFn(1 - (d / def.effectRadius) * 0.55);
      };
      for (const e of this.enemies) if (e.alive) affect(e.pos, (s) => e.applyFlash(s), e.pos.y + 1.6);
      // player can flash themselves (angle matters)
      const p = this.player;
      affect(p.pos, (s) => {
        const fwd = p.forwardVec();
        const toG = new THREE.Vector3().subVectors(pr.pos, new THREE.Vector3(p.pos.x, p.eyeY, p.pos.z)).normalize();
        const facing = fwd.dot(toG);
        p.applyFlash(s * THREE.MathUtils.clamp(0.35 + facing, 0.15, 1));
      }, p.eyeY);
    } else if (def.effect === 'smoke') {
      this.vfx.smokeVolume(pr.pos, def.effectRadius, def.durationMs / 1000);
      bus.emit('noise', { pos: pr.pos.clone(), radius: def.noise, type: 'smoke', source: 'player' });
    }
  }

  _shootableEntities() {
    const list = [];
    for (const e of this.enemies) {
      list.push({ kind: 'enemy', ref: e, alive: e.alive, capsule: () => e.capsule() });
    }
    for (const h of this.hostages) {
      list.push({ kind: 'hostage', ref: h, alive: h.alive, capsule: () => h.capsule() });
    }
    return list;
  }

  // -------------------------------------------------------------------------
  _updateAmbience() {
    const p = this.player;
    const room = roomAt(p.pos.x, p.pos.z, floorIndexForY(p.pos.y));
    const want = new Set(['storm']);
    if (room) {
      if (room.exterior) want.add('wind');
      if (room.ambience) want.add(room.ambience);
    } else {
      want.add('wind');
    }
    for (const name of want) if (!this.currentAmbience.has(name)) { audio.startAmbience(name); this.currentAmbience.add(name); }
    for (const name of [...this.currentAmbience]) if (!want.has(name)) { audio.stopAmbience(name); this.currentAmbience.delete(name); }
  }

  applyPlayerCamera(camera) {
    this.player.applyCamera(camera);
    // FOV: settings base modified by ADS
    const base = settings.get('fov');
    const w = this.player.arsenal.current;
    const target = this.player.arsenal.isAiming && w ? base * (w.def.adsFovScale ?? 0.85) : base;
    this._fovCurrent += (target - this._fovCurrent) * 0.2;
    if (Math.abs(camera.fov - this._fovCurrent) > 0.05) {
      camera.fov = this._fovCurrent;
      camera.updateProjectionMatrix();
    }
    this.viewModel.root.visible = true;
  }

  applyCinematicCamera(camera, t) {
    this.viewModel.root.visible = false;
    const a = t * 0.05;
    const r = 33;
    const cx = 24 + Math.cos(a) * r;
    const cz = 22 + Math.sin(a) * r * 1.05;
    camera.position.set(cx, 10.5 + Math.sin(t * 0.11) * 2.2, cz);
    camera.lookAt(24, 2.2, 20);
    if (camera.fov !== 58) { camera.fov = 58; camera.updateProjectionMatrix(); }
  }

  preRender(camera) {
    if (this.map?.lights) this.map.lights.update(camera.position, this.game.renderer.profile, this.game.engine.simTime);
  }

  // -------------------------------------------------------------------------
  textState() {
    const p = this.player;
    const playerPos = p ? p.pos : null;
    const nearDoors = this.map.doors
      .map((d) => ({ d, dist: d.center.distanceTo(p.pos) }))
      .filter((x) => x.dist < 8)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
      .map((x) => ({ ...x.d.textState(), dist: +x.dist.toFixed(1) }));
    const relevantEnemies = this.enemies
      .filter((e) => e.alive)
      .map((e) => ({ e, dist: e.pos.distanceTo(p.pos) }))
      .filter((x) => x.dist < 30 || x.e.state === 'combat')
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8)
      .map((x) => x.e.textState(playerPos));
    return {
      mode: this.game.state,
      map: MAP_NAME,
      difficulty: this.difficulty.id,
      missionTimerSec: +this.timer.toFixed(2),
      objectives: this.objectives.map((o) => ({ id: o.id, label: o.label, state: o.state })),
      player: p.textState(),
      hostages: this.hostages.map((h) => h.textState(playerPos)),
      enemies: relevantEnemies,
      enemiesRemaining: this.enemies.filter((e) => e.alive).length,
      nearbyDoors: nearDoors,
      interactable: this.interactTarget ? { kind: this.interactTarget.kind, label: this.interactTarget.label } : null,
      extraction: { center: EXTRACTION.center, radius: EXTRACTION.radius, countdown: this.extractCountdown != null ? +this.extractCountdown.toFixed(1) : null },
      result: this.result ? { outcome: this.result.result, message: this.result.message } : null,
    };
  }
}

function setTimeoutSim(mission, seconds, fn) {
  if (!mission._timers) mission._timers = [];
  mission._timers.push({ t: seconds, fn });
}
