// GameSession: owns one complete mission — world, player, enemies, hostages,
// pickups, grenades, objectives, timer, extraction and results. A restart
// disposes the session and builds a fresh one (no stale state can survive).

import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { keyPressed } from '../core/input.js';
import { on, emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { rng } from '../core/rng.js';
import { DIFFICULTIES, MISSION, WEAPONS, PLAYER } from './constants.js';
import * as MAP from '../world/map.js';
import { buildWorld } from '../world/builder.js';
import { setupLighting } from '../world/lighting.js';
import { getMaterial } from '../world/materials.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { NavMesh } from './navigation.js';
import { Enemy, tickBarkCooldown } from './enemy.js';
import { Hostage } from './hostage.js';
import { Vfx } from '../fx/vfx.js';
import { createViewmodel } from './viewmodel.js';
import { updateClutterCulling } from '../world/props/index.js';
import { createExtractionVan } from '../world/vehicles.js';
import { createWeather } from '../fx/weather.js';
import { setAmbienceZone } from '../core/audio.js';
import { buildPickupModel } from '../characters/pickupModels.js';

export class GameSession {
  constructor(config) {
    this.config = config;
    this.difficulty = DIFFICULTIES[config.difficulty] || DIFFICULTIES.operator;
    this.world = null;
    this.player = null;
    this.weapons = null;
    this.nav = null;
    this.vfx = null;
    this.lighting = null;
    this.enemies = [];
    this.hostages = [];
    this.pickups = [];
    this.grenades = [];
    this.entityGroup = new THREE.Group();
    this.missionTimeLeft = this.difficulty.missionMinutes * 60;
    this.elapsed = 0;
    this.phase = 'infiltrate'; // infiltrate | locate | rescue | extract | done
    this.result = null;         // {outcome:'victory'|'defeat', reason}
    this.resultDelay = 0;
    this.extraction = MAP.EXTRACTION;
    this.extractHold = 0;
    this.currentInteractable = null;
    this.playerFlash = 0;
    this.aiFrozen = false;
    this.qaRevealAll = false;
    this.kills = 0;
    this.unsubs = [];
    this.shutterOpened = false;
    this.built = false;
  }

  async build(onProgress = () => {}) {
    const yield_ = () => new Promise((r) => setTimeout(r, 0));
    onProgress(0.05, 'compiling structure');
    this.world = buildWorld();
    Engine.scene.add(this.world.group);
    await yield_();

    onProgress(0.35, 'routing navigation');
    this.nav = new NavMesh(this.world);
    await yield_();

    onProgress(0.55, 'placing lighting');
    this.lighting = setupLighting(Engine.scene);
    this.vfx = new Vfx(Engine.scene);
    await yield_();

    onProgress(0.7, 'deploying personnel');
    Engine.scene.add(this.entityGroup);
    this.player = new Player(this.world, Engine.camera);
    const sp = MAP.PLAYER_SPAWN;
    this.player.setSpawn(sp.x, sp.y, sp.z, sp.yawDeg);
    this.player.regenTo = this.difficulty.healthRegenTo;
    this.weapons = new WeaponSystem(this.player, this.world, this);
    this.weapons.equipLoadout(this.config.loadout);
    this.viewmodel = createViewmodel(Engine.camera);
    this.weather = createWeather(Engine.scene, this.world);

    const roster = MAP.ENEMY_ROSTER.slice(0, this.difficulty.enemyCount);
    for (const spec of roster) {
      const e = new Enemy(this, spec);
      this.enemies.push(e);
      this.entityGroup.add(e.body.group);
    }
    MAP.HOSTAGE_SPOTS.forEach((spot, i) => {
      const meta = MISSION.hostages.find((h) => h.id === spot.id);
      const h = new Hostage(this, { ...spot, ...meta }, i);
      this.hostages.push(h);
      this.entityGroup.add(h.body.group);
    });
    this.spawnPickups();
    this.spawnExtractionVan();
    await yield_();

    onProgress(0.9, 'final checks');
    // doors need to know about entities before swapping colliders
    this.world.entityBlockCheck = (box) => this.entityOverlaps(box);
    this.registerEvents();
    this.built = true;
    onProgress(1, 'ready');
  }

  registerEvents() {
    this.unsubs.push(on('noise', (n) => {
      for (const e of this.enemies) e.hearNoise(n);
      if (n.type === 'gunshot') {
        for (const h of this.hostages) {
          if (dist2(h.pos, n.pos) < 16) h.onCombatNearby();
        }
      }
    }));
    this.unsubs.push(on('kill', ({ entity }) => {
      if (entity !== 'player' && entity) this.kills++;
      if (entity === 'player') this.failMission('killed');
    }));
    this.unsubs.push(on('weapon-fire', ({ id, origin, byPlayer }) => {
      if (byPlayer && origin && WEAPONS[id] && !['melee', 'gadget'].includes(WEAPONS[id].class)) {
        const dir = this.player.forwardDir();
        const muzzle = this.viewmodel?.group?.userData?.muzzleWorld?.() || origin;
        this.vfx.muzzleFlash(muzzle, dir, id);
      }
    }));
  }

  spawnPickups() {
    for (const def of MAP.PICKUPS) {
      const room = MAP.roomById(def.room);
      const y = MAP.LEVELS[room.level].y;
      const mesh = buildPickupModel(def.type);
      // rest on the highest support beneath (desk/cabinet/floor)
      const g = this.world.groundAt(def.x, def.z, y + 1.4, 2.0);
      const restY = g.y > -100 ? g.y : y;
      mesh.position.set(def.x, restY, def.z);
      this.entityGroup.add(mesh);
      this.pickups.push({ ...def, y: restY, mesh, taken: false, bobT: rng.random() * 6 });
    }
  }

  spawnExtractionVan() {
    this.van = createExtractionVan(this.world, this.entityGroup);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (!this.built) return;
    const inputEnabled = !this.result;

    this.elapsed += dt;
    if (!this.result) {
      this.missionTimeLeft -= dt;
      if (this.missionTimeLeft <= 0) {
        this.missionTimeLeft = 0;
        this.failMission('timeout');
      }
    }

    this.player.update(dt, { inputEnabled });
    this.weapons.update(dt, inputEnabled);
    this.viewmodel.update(dt, this.weapons, this.player);
    this.weather.update(dt, this.player.pos);
    updateClutterCulling(this.world, this.player.pos);
    tickBarkCooldown(dt);
    // room-zone ambience
    const room = MAP.roomAt(this.player.pos.x, this.player.pos.z, this.player.pos.y);
    const zone = room ? room.zone : 'exterior';
    if (zone !== this._ambZone) { this._ambZone = zone; setAmbienceZone(zone); }

    for (const d of this.world.doors) d.update(dt);
    for (const s of this.world.shutters || []) s.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const h of this.hostages) h.update(dt);
    this.updateGrenades(dt);
    this.updatePickups(dt);
    this.vfx.update(dt);
    this.resolveEntityCollisions();
    this.updateObjectives(dt);
    this.updateInteractables(inputEnabled);
    this.playerFlash = Math.max(0, this.playerFlash - dt * (this.playerFlash > 0.75 ? 0.25 : 0.65));

    if (this.result && this.resultDelay > 0) {
      this.resultDelay -= dt;
      if (this.resultDelay <= 0) this.onResultReady?.(this.result);
    }
  }

  updateObjectives(dt) {
    if (this.result) return;
    // infiltrate -> locate: player inside the building
    if (this.phase === 'infiltrate') {
      const room = MAP.roomAt(this.player.pos.x, this.player.pos.z, this.player.pos.y);
      if (room && !room.outdoor && room.id !== 'vestibule') {
        this.phase = 'locate';
        emit('announce', { main: 'Infiltration', sub: 'Locate the hostages', ttl: 3 });
        sfx('objective_ping', { vol: 0.6 });
      }
    }
    // hostage discovery: proximity + line of sight
    for (const h of this.hostages) {
      if (!h.found && h.state === 'bound') {
        const d = dist2(h.pos, this.player.pos);
        if (d < 11 && this.world.lineOfSight(
          this.player.pos.x, this.player.pos.y + 1.5, this.player.pos.z,
          h.pos.x, h.pos.y + 1.2, h.pos.z)) {
          h.found = true;
          emit('announce', { main: `${h.name} located`, sub: 'Free and escort them to extraction', ttl: 3.4 });
          emit('subtitle', { speaker: 'Overwatch', text: `POI confirmed: ${h.name}. Get them out, Warden.`, ttl: 3.5 });
          sfx('objective_ping', { vol: 0.7 });
          if (this.phase === 'locate') this.phase = 'rescue';
        }
      }
    }
    // extraction handling
    const freed = this.hostages.filter((h) => h.state !== 'bound');
    if (freed.length && this.phase === 'locate') this.phase = 'rescue';
    for (const h of this.hostages) {
      if (h.state === 'following' || h.state === 'holding') {
        if (distTo(this.extraction, h.pos) < this.extraction.radius + 1.5 && Math.abs(h.pos.y - this.extraction.y) < 1.5) {
          h.state = 'extracting';
        }
      }
    }
    const extracted = this.hostages.filter((h) => h.state === 'extracted');
    if (extracted.length === this.hostages.length && this.hostages.length > 0) {
      if (!this.shutterOpened) {
        this.shutterOpened = true;
        const shutter = (this.world.shutters || []).find((s) => s.id === 'garage_shutter');
        shutter?.open();
        if (shutter) sfx('shutter_roll', { pos: shutter.mesh.position, vol: 0.9 });
        emit('announce', { main: 'All hostages aboard', sub: 'Get to the van', ttl: 3 });
        sfx('objective_ping', { vol: 0.8 });
        emit('noise', { pos: { x: this.extraction.x, y: this.extraction.y, z: this.extraction.z }, radius: 25, type: 'door', source: 'shutter' });
      }
      // player must reach the zone to leave
      if (distTo(this.extraction, this.player.pos) < this.extraction.radius && Math.abs(this.player.pos.y - this.extraction.y) < 1.5) {
        this.extractHold += dt;
        if (this.extractHold > 1.6) this.winMission();
      } else {
        this.extractHold = 0;
      }
      this.phase = 'extract';
    } else if (freed.length) {
      this.phase = 'rescue';
    }
  }

  currentObjectiveText() {
    if (this.result) return this.result.outcome === 'victory' ? 'MISSION COMPLETE' : 'MISSION FAILED';
    switch (this.phase) {
      case 'infiltrate': return 'Enter the administrative center';
      case 'locate': {
        const found = this.hostages.filter((h) => h.found).length;
        return found === 0 ? 'Locate the hostages' : 'Locate the second hostage';
      }
      case 'rescue': {
        const carrying = this.hostages.filter((h) => h.state === 'following' || h.state === 'holding').length;
        const waiting = this.hostages.filter((h) => h.state === 'bound').length;
        if (waiting > 0) return carrying > 0 ? 'Rescue the remaining hostage' : 'Free the hostages';
        return 'Escort hostages to the extraction garage (B1)';
      }
      case 'extract': return 'Board the extraction van';
      default: return '';
    }
  }

  extractionVisible() {
    return this.phase === 'rescue' || this.phase === 'extract' || this.qaRevealAll;
  }

  // ------------------------------------------------------------- interaction
  updateInteractables(inputEnabled) {
    this.currentInteractable = null;
    if (!inputEnabled || !this.player.alive) return;
    const eye = this.player.eyePos;
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ'));
    let best = null;

    const consider = (pos, radius, prompt, action, extra = {}) => {
      const dx = pos.x - eye.x, dy = (pos.y ?? eye.y) - eye.y, dz = pos.z - eye.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) return;
      const dot = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / (d || 1);
      if (d > 0.9 && dot < 0.45) return;
      const score = d - dot;
      if (!best || score < best.score) best = { score, prompt, action, ...extra };
    };

    for (const door of this.world.doors) {
      if (Math.abs(door.center.y - eye.y) > 2.6) continue;
      const label = door.locked ? `${door.label} — LOCKED` : (door.state === 'open' || door.state === 'opening') ? `Close: ${door.label}` : `Open: ${door.label}`;
      consider({ x: door.center.x, y: door.center.y, z: door.center.z }, 2.1, label, () => {
        const res = door.interact('player');
        if (!res.ok && res.reason === 'locked') {
          emit('subtitle', { speaker: null, text: door.keyId ? 'Locked — requires a keycard.' : 'Locked.', ttl: 2 });
        }
      });
    }
    for (const h of this.hostages) {
      const prompt = h.interactPrompt();
      if (prompt) consider({ x: h.pos.x, y: h.pos.y + 1.1, z: h.pos.z }, 2.3, prompt, () => h.interact());
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      const labels = { medkit: 'Take field dressing', ammo: 'Take ammunition', armor: 'Take armor plates', keycard: `Take ${p.label || 'keycard'}` };
      consider({ x: p.x, y: p.y + 0.25, z: p.z }, 1.9, labels[p.type], () => this.takePickup(p));
    }

    this.currentInteractable = best;
    if (best && keyPressed('KeyE')) best.action();
  }

  takePickup(p) {
    if (p.taken) return;
    if (p.type === 'medkit' && this.player.health >= PLAYER.maxHealth) {
      emit('subtitle', { text: 'Integrity already full.', ttl: 1.6 });
      return;
    }
    p.taken = true;
    p.mesh.visible = false;
    sfx(p.type === 'keycard' ? 'keycard_read' : 'pickup', { vol: 0.7 });
    if (p.type === 'medkit') this.player.heal(p.heal || 50);
    if (p.type === 'armor') this.player.addArmor(p.amount || 50);
    if (p.type === 'ammo') this.weapons.addReserveAmmo(p.amount || 0.5);
    if (p.type === 'keycard') {
      const door = this.world.doors.find((d) => d.keyId === p.id);
      if (door) {
        door.unlock();
        emit('subtitle', { speaker: 'Overwatch', text: 'Keycard cloned — server room is open to you.', ttl: 3 });
      }
    }
  }

  spawnAmmoDrop(pos) {
    const mesh = buildPickupModel('ammo');
    mesh.position.set(pos.x, pos.y, pos.z);
    this.entityGroup.add(mesh);
    this.pickups.push({ id: `drop_${this.pickups.length}`, type: 'ammo', x: pos.x, y: pos.y, z: pos.z, amount: 0.25, mesh, taken: false, bobT: 0 });
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.bobT += dt;
      // rest on surface with a soft attention pulse instead of floating spin
      p.mesh.position.y = p.y + Math.max(0, Math.sin(p.bobT * 2.0)) * 0.015;
    }
  }

  // -------------------------------------------------------------- grenades
  spawnGrenade(type, origin, dir, speed) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.11, 10),
      new THREE.MeshStandardMaterial({ color: type === 'flash' ? 0x8a9096 : 0x3d5240, roughness: 0.5, metalness: 0.5 }),
    );
    mesh.position.copy(origin);
    mesh.castShadow = true;
    this.entityGroup.add(mesh);
    this.grenades.push({
      type, mesh,
      pos: origin.clone(), vel: dir.clone().multiplyScalar(speed).add(new THREE.Vector3(0, 2.2, 0)),
      fuse: WEAPONS[type].fuse, bounces: 0,
    });
  }

  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this.detonate(g);
        this.entityGroup.remove(g.mesh);
        this.grenades.splice(i, 1);
        continue;
      }
      g.vel.y -= 14 * dt;
      const step = g.vel.clone().multiplyScalar(dt);
      const len = step.length();
      if (len > 1e-6) {
        const dir = step.clone().normalize();
        const hit = this.world.raycast(g.pos.x, g.pos.y, g.pos.z, dir.x, dir.y, dir.z, len + 0.06, { blocking: 'move' });
        if (hit && hit.collider) {
          const n = hit.normal;
          const d = g.vel.dot(new THREE.Vector3(n.x, n.y, n.z));
          g.vel.addScaledVector(new THREE.Vector3(n.x, n.y, n.z), -1.7 * d).multiplyScalar(0.45);
          g.pos.set(hit.point.x + n.x * 0.07, hit.point.y + n.y * 0.07, hit.point.z + n.z * 0.07);
          g.bounces++;
          if (g.bounces <= 3) sfx('grenade_bounce', { pos: g.pos, vol: 0.5, rateJitter: 0.15 });
        } else {
          g.pos.add(step);
        }
      }
      g.mesh.position.copy(g.pos);
      g.mesh.rotation.x += dt * 9;
    }
  }

  detonate(g) {
    const def = WEAPONS[g.type];
    if (g.type === 'flash') {
      sfx('flash_pop', { pos: g.pos, vol: 1 });
      emit('noise', { pos: g.pos, radius: def.noise, type: 'flash', source: 'player' });
      // blind enemies with LOS
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = dist2(e.pos, g.pos);
        if (d > def.radius) continue;
        if (this.world.lineOfSight(g.pos.x, g.pos.y + 0.2, g.pos.z, e.pos.x, e.pos.y + 1.5, e.pos.z)) {
          e.blindTimer = Math.max(e.blindTimer, 4.2 * (1 - d / (def.radius + 4)));
          e.investigate(g.pos, true);
        }
      }
      // player too, if looking roughly toward it with LOS
      const pe = this.player.eyePos;
      const d = dist2(this.player.pos, g.pos);
      if (d < def.radius && this.world.lineOfSight(g.pos.x, g.pos.y + 0.2, g.pos.z, pe.x, pe.y, pe.z)) {
        const toG = new THREE.Vector3(g.pos.x - pe.x, 0, g.pos.z - pe.z).normalize();
        const facing = this.player.forwardDir().dot(toG);
        this.playerFlash = Math.min(1, Math.max(0.25, facing + 0.55) * (1.25 - d / (def.radius + 4)));
      }
      this.vfx.muzzleFlash(new THREE.Vector3(g.pos.x, g.pos.y + 0.3, g.pos.z), new THREE.Vector3(0, 1, 0));
    } else {
      sfx('smoke_pop', { pos: g.pos, vol: 0.9 });
      emit('noise', { pos: g.pos, radius: def.noise, type: 'impact', source: 'player' });
      this.vfx.spawnSmoke({ x: g.pos.x, y: g.pos.y, z: g.pos.z }, def.radius, def.duration);
    }
  }

  smokeBlocks(a, b) { return this.vfx.smokeBlocks(a, b); }

  // ------------------------------------------------------------- combat glue
  raycastEntities(ox, oy, oz, dir, maxT) {
    let best = null;
    const check = (entity, boxes, isHostage) => {
      for (const b of boxes) {
        const t = rayBox(ox, oy, oz, dir.x, dir.y, dir.z, b, maxT);
        if (t !== null && (!best || t < best.t)) {
          best = {
            t, part: b.part, entity: isHostage ? hostageProxy(entity, this) : entity,
            point: { x: ox + dir.x * t, y: oy + dir.y * t, z: oz + dir.z * t },
          };
        }
      }
    };
    for (const e of this.enemies) if (e.alive) check(e, e.hitBoxes(), false);
    for (const h of this.hostages) if (h.state !== 'extracted') check(h, h.hitBoxes(), true);
    return best;
  }

  damageGlass(pane, point, dir) {
    if (pane.broken) return;
    pane.hits++;
    emit('impact', { kind: 'glass', point, normal: { x: -dir.x, y: -dir.y, z: -dir.z } });
    if (pane.hits >= 2 || (pane.b - pane.a) < 1.0) {
      pane.broken = true;
      pane.mesh.visible = false;
      pane.collider.blocksMove = pane.exteriorRoom ? pane.collider.blocksMove : false;
      pane.collider.blocksSight = false;
      if (!pane.exteriorRoom) pane.collider.glass = false;
      sfx('glass_break', { pos: point, vol: 1 });
      emit('noise', { pos: point, radius: 22, type: 'glass', source: 'impact' });
      emit('glassbreak', { pane, point });
      // refresh nav so entities can move through broken interior glass
      const lvl = pane.y0 < -1 ? 'b' : 'g';
      this.nav.refreshRegion(lvl, Math.min(pane.a, pane.line) - 1, Math.min(pane.a, pane.line) - 1, Math.max(pane.b, pane.line) + 1, Math.max(pane.b, pane.line) + 1);
    } else {
      // cracked state
      pane.mesh.material = crackMaterial();
      sfx('glass_crack', { pos: point, vol: 0.8 });
      emit('noise', { pos: point, radius: 10, type: 'glass', source: 'impact' });
    }
  }

  alertAlliesNear(pos, radius, lastKnown) {
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'combat') continue;
      if (dist2(e.pos, pos) < radius) e.alertTo(lastKnown);
    }
  }

  tryAiOpenDoors(entity) {
    for (const door of this.world.doors) {
      if (door.state !== 'closed' || door.locked) continue;
      if (Math.abs(door.center.y - (entity.pos.y + 1)) > 2.2) continue;
      if (dist2(door.center, entity.pos) < 1.35) door.setOpen(true, 'ai');
    }
  }

  playerCanSee(point) {
    const pe = this.player.eyePos;
    const fwd = this.player.forwardDir();
    const to = new THREE.Vector3(point.x - pe.x, 0, point.z - pe.z);
    const d = to.length();
    if (d < 1) return true;
    to.normalize();
    if (fwd.dot(to) < 0.1) return false;
    return this.world.lineOfSight(pe.x, pe.y, pe.z, point.x, (point.y ?? 0) + 1.2, point.z);
  }

  entityOverlaps(box) {
    const test = (px, pz, py, r, h) =>
      px + r > box.x0 && px - r < box.x1 && pz + r > box.z0 && pz - r < box.z1 && py + h > box.y0 && py < box.y1;
    if (test(this.player.pos.x, this.player.pos.z, this.player.pos.y, 0.4, this.player.height)) return true;
    for (const e of this.enemies) if (e.alive && test(e.pos.x, e.pos.z, e.pos.y, 0.4, 1.7)) return true;
    for (const h of this.hostages) if (h.state !== 'extracted' && test(h.pos.x, h.pos.z, h.pos.y, 0.4, 1.7)) return true;
    return false;
  }

  resolveEntityCollisions() {
    const bodies = [
      { pos: this.player.pos, r: 0.36, player: true },
      ...this.enemies.filter((e) => e.alive).map((e) => ({ pos: e.pos, r: 0.36 })),
      ...this.hostages.filter((h) => h.state !== 'extracted' && h.state !== 'bound').map((h) => ({ pos: h.pos, r: 0.34 })),
    ];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        if (Math.abs(a.pos.y - b.pos.y) > 1.6) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = a.r + b.r;
        if (d < min && d > 1e-5) {
          const push = (min - d) / 2;
          const nx = dx / d, nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push;
          b.pos.x += nx * push; b.pos.z += nz * push;
        }
      }
    }
  }

  // ---------------------------------------------------------------- results
  failMission(reason) {
    if (this.result) return;
    const reasons = {
      killed: 'Warden 2-1 is down. The storm keeps the rest of the story.',
      timeout: 'Storm cover expired. Meridian reinforcements sealed the building.',
      civilian: 'A hostage was killed by friendly fire. Command aborts the operation.',
    };
    this.result = { outcome: 'defeat', reason: reasons[reason] || reason };
    this.resultDelay = 2.2;
    sfx('mission_fail', { vol: 0.9 });
    emit('announce', { main: 'Operation failed', sub: reason === 'timeout' ? 'Time expired' : '', ttl: 3 });
  }

  winMission() {
    if (this.result) return;
    this.result = { outcome: 'victory', reason: 'Both hostages recovered. Extraction complete.' };
    this.resultDelay = 2.4;
    sfx('mission_win', { vol: 0.9 });
    emit('announce', { main: 'Hostages secured', sub: 'Well done, Warden', ttl: 3 });
  }

  getStats() {
    const acc = this.weapons.stats.shots > 0 ? Math.round((this.weapons.stats.hits / this.weapons.stats.shots) * 100) : 0;
    const mm = Math.floor(this.elapsed / 60), ss = Math.floor(this.elapsed % 60);
    return {
      time: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
      kills: this.kills,
      shots: this.weapons.stats.shots,
      accuracy: acc,
      hostages: `${this.hostages.filter((h) => h.state === 'extracted').length} / ${this.hostages.length}`,
    };
  }

  dispose() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.viewmodel?.dispose();
    this.weather?.dispose();
    setAmbienceZone(null);
    this.vfx?.dispose();
    this.lighting?.dispose();
    if (this.world?.group) Engine.scene.remove(this.world.group);
    Engine.scene.remove(this.entityGroup);
    this.built = false;
  }
}

// hostages route damage to instant mission failure
function hostageProxy(h, game) {
  return {
    isHostage: true, ref: h, pos: h.pos,
    takeDamage: () => { h.hitByPlayer(); },
    facingDir: () => null,
  };
}

function crackMaterialFactory() {
  let mat = null;
  return () => {
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({ color: 0xe8f2f6, roughness: 0.42, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    }
    return mat;
  };
}
const crackMaterial = crackMaterialFactory();

function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
function distTo(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }

function rayBox(ox, oy, oz, dx, dy, dz, b, tMax) {
  let tmin = 0, tmaxv = tMax;
  for (const [o, d, lo, hi] of [[ox, dx, b.x0, b.x1], [oy, dy, b.y0, b.y1], [oz, dz, b.z0, b.z1]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue; }
    const inv = 1 / d;
    let t1 = (lo - o) * inv, t2 = (hi - o) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmaxv = Math.min(tmaxv, t2);
    if (tmin > tmaxv) return null;
  }
  return tmin >= 0 && tmin < tMax ? tmin : null;
}
