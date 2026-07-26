import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { SURFACE, SURFACE_PROPS } from '../physics/world.js';
import {
  weaponDef, damageAtRange, regionMultiplier,
  MIN_SURFACE_PENETRATION, PENETRATION_REFERENCE,
} from '../weapons/defs.js';

// ---------------------------------------------------------------------------
// CombatSystem.  (owner: opus2)
//
// Everything that happens between "the trigger broke" and "the world changed":
// spread cones, hit traces, wall penetration, region damage, armour, glass,
// doors, blood, hitmarkers, the melee attack and the mission statistics.
//
// DETERMINISM
// -----------
// The only randomness is `this.rng`, a mulberry32 stream reseeded to a fixed
// value in `reset()`. Every shot draws a FIXED number of values from it
// (2 for the aim error, plus 2 per extra pellet), so a given sequence of
// trigger pulls always produces the same bullets. Nothing here reads
// Math.random and nothing here reads wall-clock time.
//
// WALL PENETRATION (shipped)
// --------------------------
// A bullet may only continue through a slab when all four gates pass:
//   1. the surface is soft enough      (SURFACE_PROPS.penetration >= 0.45, which
//                                       excludes concrete, metal, tile, carpet)
//   2. the measured slab is thin enough (<= the weapon's maxThickness, <= 0.16 m;
//                                       interior partitions are 0.1 m, exterior
//                                       walls 0.24 m and floor slabs 0.3-0.5 m,
//                                       so only partitions and doors qualify)
//   3. the cost budget has room         (thickness x 0.55 / surfacePenetration,
//                                       i.e. metres of drywall-equivalent)
//   4. the penetration count is under the weapon's cap (1 or 2)
// The slab thickness is measured analytically against the collider's own box,
// so a grazing shot along a wall measures metres of material and is stopped.
// The net effect: the KD-4 and HL-700 can shoot through one or two office
// partitions or a door, nothing can cross concrete, and no bullet ever leaves
// the building.
//
// EVENTS EMITTED
//   EVT.IMPACT           every world hit (point, normal, surface, sound id)
//   EVT.GLASS_BREAK      a pane was shattered
//   'combat:hitmarker'   { headshot, damage, killed, region, kind }  UI feedback
//   'combat:hit'         a character was hit (AI / audio)
//   'world:noise'        AI-audible noise. NOTE FOR OPUS 3: every gunshot
//                        broadcasts { position:[x,y,z], loudness, radius, kind:
//                        'gunshot', source:'player', suppressed } on the bus
//                        under the name 'world:noise'. Suppressed weapons carry
//                        a much lower loudness/radius. Melee, gadget throws and
//                        gadget detonations use the same event.
// ---------------------------------------------------------------------------

const MAX_RANGE = 220;
const PENETRATION_GUARD = 6;   // hard loop cap, independent of the budget
const NOISE_EVENT = 'world:noise';
const HITMARKER_EVENT = 'combat:hitmarker';

/** Colliders bullets care about. Characters are handled separately. */
function bulletFilter(c) {
  if (!c.enabled) return false;
  const tag = c.tag || '';
  if (tag.startsWith('character')) return false;
  return true;
}

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.rng = new Rng(hashString('northstar:combat'));
    this.time = 0;
    this._hasKeycard = false;

    /** Recent hitmarkers, newest last. HUD may poll this instead of the bus. */
    this.hitmarkers = [];
    /** Recent damage directions for the player's damage indicator. */
    this.damageIndicators = [];
    /** Debug: the last shot's hit records (QA overlay reads this). */
    this.lastShot = [];

    this.stats = this._blankStats();
    this._countedDeaths = new Set();
    this._paneByCollider = null;
    this._tracerCounter = 0;

    this._offs = [
      bus.on(EVT.PLAYER_DAMAGE, (p) => this._onPlayerDamage(p)),
      bus.on(EVT.ENEMY_DEATH, (p) => this._onEnemyDeath(p)),
      bus.on(EVT.HOSTAGE_STATE, (p) => this._onHostageState(p)),
      bus.on('gadget:throw', () => { this.stats.gadgetsUsed += 1; }),
    ];
  }

  _blankStats() {
    return {
      shotsFired: 0,
      pelletsFired: 0,
      hits: 0,
      pelletHits: 0,
      headshots: 0,
      misses: 0,
      wallbangs: 0,
      penetrations: 0,
      damageDealt: 0,
      damageTaken: 0,
      enemiesNeutralised: 0,
      enemiesWounded: 0,
      hostagesSecured: 0,
      hostagesLost: 0,
      hostagesHit: 0,
      glassBroken: 0,
      doorsDestroyed: 0,
      meleeHits: 0,
      meleeKills: 0,
      gadgetsUsed: 0,
      shotsByWeapon: {},
    };
  }

  reset() {
    this.rng.reseed(hashString('northstar:combat'));
    this.time = 0;
    this._hasKeycard = false;
    this.hitmarkers.length = 0;
    this.damageIndicators.length = 0;
    this.lastShot = [];
    this.stats = this._blankStats();
    this._countedDeaths = new Set();
    this._paneByCollider = null;
    this._tracerCounter = 0;
    return this;
  }

  // ------------------------------------------------------------- keycard --

  get hasKeycard() {
    return this._hasKeycard;
  }

  set hasKeycard(v) {
    const next = !!v;
    if (next === this._hasKeycard) return;
    this._hasKeycard = next;
    if (next) {
      bus.emit(EVT.INTERACT, { kind: 'keycard', id: 'PROP-KEYCARD', acquired: true, audioId: 'pickup_keycard' });
    }
  }

  // -------------------------------------------------------------- update --

  update(dt, playing) {
    this.time += dt;
    if (!playing) return;
    // Age the feedback rings so the HUD can fade them out.
    const cutoff = this.time - 2.5;
    while (this.hitmarkers.length && this.hitmarkers[0].time < cutoff) this.hitmarkers.shift();
    while (this.damageIndicators.length && this.damageIndicators[0].time < this.time - 4) {
      this.damageIndicators.shift();
    }
  }

  // ----------------------------------------------------------- the trace --

  /**
   * Fire one shot. Returns an array of hit records, one per surface or body
   * actually struck (a shotgun blast or a penetrating rifle round produces
   * several).
   *
   * @param {THREE.Vector3} origin  eye position
   * @param {THREE.Vector3} dir     true aim direction (recoil already applied)
   * @param {object} weapon         live weapon state, a def, or a weapon key
   */
  traceShot(origin, dir, weapon) {
    const def = this._defOf(weapon);
    const from = toVec3(origin);
    const aim = toVec3(dir).normalize();
    const pellets = Math.max(1, def.pellets || 1);
    const coneDeg = this._spreadOf(weapon, def);

    this.stats.shotsFired += 1;
    this.stats.pelletsFired += pellets;
    this.stats.shotsByWeapon[def.key] = (this.stats.shotsByWeapon[def.key] || 0) + 1;

    // One aim error for the whole trigger pull, then the pellet pattern on top.
    const aimed = this._perturb(aim, coneDeg * Math.PI / 180, 'gauss');

    const records = [];
    let anyCharacter = false;
    let anyHeadshot = false;
    let bestDamage = 0;
    let killed = false;
    let hitKind = null;
    let farthest = from.clone().addScaledVector(aimed, MAX_RANGE);

    for (let i = 0; i < pellets; i++) {
      let pelletDir = aimed;
      if (pellets > 1) {
        const ring = def.patternRings?.[i % def.patternRings.length] ?? 1;
        const spread = (def.patternSpread || 2) * Math.PI / 180;
        pelletDir = this._perturb(aimed, spread * ring, 'ring');
      }
      const hits = this._traceOne(from, pelletDir, def, i, pellets);
      for (const h of hits) {
        records.push(h);
        if (h.type === 'enemy' || h.type === 'hostage') {
          anyCharacter = true;
          if (h.headshot) anyHeadshot = true;
          if (h.damage > bestDamage) bestDamage = h.damage;
          if (h.killed) killed = true;
          hitKind = hitKind === 'enemy' ? 'enemy' : h.type;
        }
      }
      if (i === 0 && hits.length) {
        const last = hits[hits.length - 1];
        farthest = toVec3(last.point);
      }
    }

    // Shot-level accuracy: one trigger pull is one shot, hit or miss.
    if (anyCharacter) {
      this.stats.hits += 1;
      if (anyHeadshot) this.stats.headshots += 1;
      this._hitmarker({
        headshot: anyHeadshot, damage: bestDamage, killed,
        kind: hitKind || 'enemy', region: records.find((r) => r.region)?.region || null,
      });
    } else {
      this.stats.misses += 1;
    }

    this._tracer(from, farthest, def);
    this._noise(from, def);
    this.lastShot = records;
    return records;
  }

  /** One projectile, including its penetration chain. */
  _traceOne(origin, direction, def, pelletIndex, pelletCount) {
    const collision = this.game.collision;
    const out = [];
    const pos = origin.clone();
    const dir = direction.clone().normalize();
    const pen = def.penetration || { power: 0, maxThickness: 0, maxCount: 0 };
    let budget = pen.power || 0;
    let penetrations = 0;
    let damageScale = 1;
    let travelled = 0;
    let guard = 0;

    while (guard++ < PENETRATION_GUARD) {
      const remaining = MAX_RANGE - travelled;
      if (remaining <= 0.01) break;

      const character = this._nearestCharacter(pos, dir, remaining);
      const world = collision?.raycast ? collision.raycast(pos, dir, remaining, bulletFilter) : null;
      const worldDist = world?.hit ? world.distance : Infinity;

      // --- a body is nearer than the wall behind it ------------------------
      if (character && character.distance <= worldDist) {
        const totalDist = travelled + character.distance;
        const record = this._applyCharacterHit(
          character, def, totalDist, damageScale, dir, origin, pelletIndex, pelletCount
        );
        if (penetrations > 0) {
          record.throughWall = true;
          this.stats.wallbangs += 1;
        }
        out.push(record);
        break;
      }

      if (!world?.hit) break;

      const point = world.point.clone();
      const normal = world.normal.clone();
      const surface = world.surface || SURFACE.CONCRETE;
      const props = SURFACE_PROPS[surface] || SURFACE_PROPS.concrete;
      const totalDist = travelled + world.distance;

      // --- glass: shatter and keep going, the pane is simply gone ----------
      if (props.breakable || surface === SURFACE.GLASS) {
        const pane = this._paneFor(world.collider);
        this._impact(point, normal, surface, def, { pane: !!pane });
        if (pane) this.breakGlass(pane, point);
        out.push({
          type: 'world', subtype: 'glass', surface,
          point: point.toArray(), normal: normal.toArray(),
          distance: +totalDist.toFixed(3), damage: 0, pelletIndex,
          penetrated: true, broke: !!pane,
        });
        // Step out the far face of the pane and carry on with a token loss.
        const exit = exitThrough(world.collider, point, dir);
        const step = exit ? exit.thickness + 0.01 : 0.08;
        travelled = totalDist + step;
        pos.copy(point).addScaledVector(dir, step);
        damageScale *= 0.97;
        continue;
      }

      this._impact(point, normal, surface, def, {});
      const record = {
        type: 'world', surface,
        point: point.toArray(), normal: normal.toArray(),
        distance: +totalDist.toFixed(3),
        collider: world.collider?.tag || null,
        damage: 0, pelletIndex, penetrated: false,
      };

      // --- shootable things that live behind a collider -------------------
      const ref = world.collider?.ref;
      if (ref && typeof ref.damage === 'function') {
        const amount = damageAtRange(def, totalDist) * damageScale;
        const wasDamaged = !!ref.damaged;
        ref.damage(amount, this.game.engine?.simTime || this.time);
        record.damage = +amount.toFixed(2);
        if ((world.collider.tag || '').startsWith('door:')) {
          record.subtype = 'door';
          record.doorId = ref.id;
          this.game.effects?.doorImpact?.(ref, point);
          if (!wasDamaged && ref.damaged) this.stats.doorsDestroyed += 1;
        }
      }

      // --- wall penetration ------------------------------------------------
      const canPenetrate = budget > 0
        && penetrations < (pen.maxCount || 0)
        && (props.penetration ?? 0) >= MIN_SURFACE_PENETRATION;
      if (canPenetrate) {
        const exit = exitThrough(world.collider, point, dir);
        if (exit && exit.thickness <= (pen.maxThickness || 0)) {
          const cost = exit.thickness * (PENETRATION_REFERENCE / props.penetration);
          if (cost <= budget) {
            budget -= cost;
            penetrations += 1;
            damageScale *= props.damageFalloff ?? 0.7;
            record.penetrated = true;
            record.thickness = +exit.thickness.toFixed(4);
            this.stats.penetrations += 1;
            // Exit spall on the far face.
            this._impact(exit.point, exit.normal, surface, def, { exit: true });
            out.push(record);
            travelled = totalDist + exit.thickness + 0.01;
            pos.copy(exit.point).addScaledVector(dir, 0.01);
            continue;
          }
        }
      }

      out.push(record);
      break;
    }

    return out;
  }

  // ------------------------------------------------------- character hits --

  _applyCharacterHit(hit, def, distance, damageScale, dir, shooterPos, pelletIndex, pelletCount) {
    const entity = hit.entity;
    const region = hit.region;
    const regionName = region?.name || 'chest';
    const headshot = regionMultiplier(regionName) >= regionMultiplier('head');
    const mult = region?.damageMultiplier ?? regionMultiplier(regionName);

    let damage = damageAtRange(def, distance) * damageScale * mult;

    // Armour: soaks a share of body damage, scaled by the round's penetration.
    const armor = numberOr(entity.armor, numberOr(entity.armour, 0));
    if (armor > 0 && !headshot) {
      const coverage = Math.min(1, armor / 100) * 0.45;
      damage *= 1 - coverage * Math.max(0, 1 - (def.armorPenetration ?? 0));
    }
    damage = Math.max(1, damage);

    const point = hit.point.clone();
    const backNormal = dir.clone().negate();
    const wasAlive = entity.alive !== false && !entity.dead;

    // Tell the entity, whatever shape its API is.
    const info = {
      amount: damage, damage, region: regionName, headshot,
      from: shooterPos.clone(), sourcePos: shooterPos.clone(),
      direction: dir.clone(), point: point.clone(),
      weapon: def.key, weaponName: def.name, distance,
      kind: headshot ? 'headshot' : 'bullet', byPlayer: true,
      pelletIndex, pelletCount,
    };
    let applied = damage;
    if (typeof entity.applyDamage === 'function') applied = entity.applyDamage(damage, info) ?? damage;
    else if (typeof entity.takeDamage === 'function') applied = entity.takeDamage(damage, info) ?? damage;
    else if (typeof entity.hit === 'function') applied = entity.hit(damage, info) ?? damage;
    else if (typeof entity.damage === 'function') applied = entity.damage(damage, info) ?? damage;
    else if (typeof entity.health === 'number') {
      entity.health = Math.max(0, entity.health - damage);
      if (entity.health <= 0 && entity.alive !== undefined) entity.alive = false;
    }
    if (typeof applied !== 'number' || !Number.isFinite(applied)) applied = damage;

    // "You were shot, and it came from over there."
    if (typeof entity.notifyHit === 'function') entity.notifyHit(shooterPos.clone(), info);
    else if (typeof entity.onHit === 'function') entity.onHit(shooterPos.clone(), info);
    else if (typeof entity.alert === 'function') entity.alert(shooterPos.clone(), 1);
    entity.lastHitFrom = shooterPos.clone();
    entity.lastHitTime = this.game.engine?.simTime || this.time;

    const dead = entity.alive === false || entity.dead === true || entity.health <= 0;
    const killed = wasAlive && dead;

    this.stats.damageDealt += applied;
    this.stats.pelletHits += 1;
    if (hit.kind === 'hostage') {
      this.stats.hostagesHit += 1;
      if (killed) this._countHostageLost(entity);
    } else if (killed) {
      this._countEnemyDown(entity);
    } else if (wasAlive) {
      this.stats.enemiesWounded += 1;
    }

    // Blood + a flesh impact so audio has something to play.
    this.game.effects?.bloodSpray?.(point, backNormal, { headshot, damage: applied });
    this.game.decals?.add?.(point, backNormal, 'blood', headshot ? 0.34 : 0.24);
    bus.emit(EVT.IMPACT, {
      point: point.toArray(), normal: backNormal.toArray(), surface: SURFACE.FLESH,
      audioId: SURFACE_PROPS.flesh.sound, headshot, character: true,
      weapon: def.key,
    });
    bus.emit('combat:hit', {
      kind: hit.kind, region: regionName, headshot, killed,
      damage: +applied.toFixed(2), position: point.toArray(),
      from: shooterPos.toArray(), weapon: def.key,
    });

    return {
      type: hit.kind, entity, region: regionName, headshot, killed,
      point: point.toArray(), normal: backNormal.toArray(),
      distance: +distance.toFixed(3), damage: +applied.toFixed(2),
      pelletIndex, penetrated: false,
    };
  }

  /** Nearest character hit region along a ray, or null. */
  _nearestCharacter(origin, dir, maxDist) {
    let best = null;
    for (const target of this._characterTargets()) {
      // Cheap reject: how far the body's centre is from the ray.
      const centre = target.centre;
      const toC = _v1.subVectors(centre, origin);
      const along = toC.dot(dir);
      if (along < -1.2 || along > maxDist + 1.2) continue;
      const perp = Math.sqrt(Math.max(0, toC.lengthSq() - along * along));
      if (perp > 1.6) continue;

      for (const region of target.regions) {
        const t = rayRegion(origin, dir, region, maxDist);
        if (t === null) continue;
        if (!best || t.distance < best.distance) {
          best = {
            entity: target.entity, kind: target.kind, region,
            distance: t.distance, point: t.point,
          };
        }
      }
    }
    return best;
  }

  /**
   * Live shootable characters. Coded defensively: `EnemyManager` /
   * `HostageManager` may expose regions on the record, on a nested model, or
   * not at all — in which case a torso box is synthesised so bullets still
   * connect.
   */
  _characterTargets() {
    const out = [];
    const add = (list, kind) => {
      if (!Array.isArray(list)) return;
      for (const c of list) {
        if (!c || typeof c !== 'object') continue;
        if (c.alive === false || c.dead === true || c.isDead === true) continue;
        if (c.neutralised === true || c.removed === true) continue;
        if (c.rescued === true || c.extracted === true) continue;
        const base = c.position || c.group?.position || c.model?.group?.position || c.root?.position;
        if (!base) continue;
        const origin = toVec3(base);
        const regions = c.hitRegions || c.model?.hitRegions || c.visual?.hitRegions || c.body?.hitRegions;
        const centre = origin.clone();
        centre.y += (c.eyeHeight ?? 1.0);
        if (Array.isArray(regions) && regions.length) {
          out.push({ entity: c, kind, regions, centre });
        } else {
          // Fallback proxy: a single torso box at the record's own position.
          out.push({
            entity: c, kind, centre,
            regions: [{
              name: 'chest', damageMultiplier: 1,
              center: new THREE.Vector3(origin.x, origin.y + 1.05, origin.z),
              size: new THREE.Vector3(0.5, 1.3, 0.4),
            }],
          });
        }
      }
    };
    add(this.game.enemies?.list, 'enemy');
    add(this.game.hostages?.list, 'hostage');
    return out;
  }

  // ------------------------------------------------------------- feedback --

  _impact(point, normal, surface, def, extra = {}) {
    const p = toVec3(point);
    const n = toVec3(normal);
    // Call the effects system first: it stamps the position, so the EVT.IMPACT
    // listener inside EffectsSystem will skip and we never double-spawn.
    this.game.effects?.spawnImpact?.(p, n, surface, { weapon: def.key, ...extra });
    const decal = SURFACE_PROPS[surface]?.decal || 'concrete';
    this.game.decals?.add?.(p, n, decal, surface === SURFACE.DRYWALL ? 0.13 : 0.1);
    bus.emit(EVT.IMPACT, {
      point: p.toArray(), normal: n.toArray(), surface,
      audioId: SURFACE_PROPS[surface]?.sound || 'impact_concrete',
      weapon: def.key, ...extra,
    });
  }

  /**
   * Break a level glass pane: shatter VFX, hide the mesh, and stop the
   * collider blocking either sight or bullets.
   */
  breakGlass(pane, point = null) {
    if (!pane || pane.broken) return false;
    pane.broken = true;
    if (pane.collider) {
      pane.collider.blocksSight = false;
      pane.collider.enabled = false;     // bullets and AI sight now pass
      pane.collider.blocksNav = false;
    }
    if (pane.mesh) pane.mesh.visible = false;
    this.stats.glassBroken += 1;
    this.game.effects?.glassShatter?.(pane);
    bus.emit(EVT.GLASS_BREAK, {
      pane, id: pane.id, audioId: 'glass_shatter',
      position: (point ? toVec3(point) : toVec3(pane.center)).toArray(),
    });
    return true;
  }

  _paneFor(collider) {
    if (!collider) return null;
    const panes = this.game.level?.glassPanes;
    if (!Array.isArray(panes) || !panes.length) return null;
    if (!this._paneByCollider || this._paneByCollider.size !== panes.length) {
      this._paneByCollider = new Map();
      for (const p of panes) {
        if (p.collider) this._paneByCollider.set(p.collider.id, p);
      }
    }
    const byId = this._paneByCollider.get(collider.id);
    if (byId) return byId;
    const tag = collider.tag || '';
    if (tag.startsWith('glass:')) {
      const id = tag.slice(6);
      return panes.find((p) => String(p.id) === id) || null;
    }
    return null;
  }

  _tracer(from, to, def) {
    const every = def.tracerEvery || 0;
    if (!every) return;
    this._tracerCounter += 1;
    if (this._tracerCounter % every !== 0) return;
    // Start the streak a little ahead of the eye so it reads as coming from
    // the muzzle rather than out of the camera.
    const start = toVec3(from).addScaledVector(toVec3(to).sub(toVec3(from)).normalize(), 0.55);
    this.game.effects?.tracer?.(start, toVec3(to), def.family);
  }

  _hitmarker(info) {
    const marker = { ...info, time: this.time };
    this.hitmarkers.push(marker);
    if (this.hitmarkers.length > 24) this.hitmarkers.shift();
    bus.emit(HITMARKER_EVENT, {
      ...info,
      damage: +Number(info.damage || 0).toFixed(2),
      audioId: info.headshot ? 'hitmarker_headshot' : info.killed ? 'hitmarker_kill' : 'hitmarker',
    });
  }

  /** Every gunshot is audible to the AI. See the file header for the contract. */
  _noise(position, def, kind = 'gunshot') {
    const suppressed = !!def.suppressed;
    bus.emit(NOISE_EVENT, {
      position: toVec3(position).toArray(),
      loudness: def.loudness ?? 1,
      radius: def.noiseRadius ?? 30,
      kind, source: 'player', weapon: def.key, suppressed,
      time: this.game.engine?.simTime || this.time,
    });
  }

  // ---------------------------------------------------------------- melee --

  /**
   * Knife attack. `type` is 'light' (fast slash) or 'heavy' (slow stab).
   * Returns the hit record, or null when the swing found nothing.
   */
  meleeAttack(origin, dir, weapon, type = 'light') {
    const def = this._defOf(weapon);
    const spec = def.attacks?.[type] || def.attacks?.light;
    if (!spec) return null;
    const from = toVec3(origin);
    const aim = toVec3(dir).normalize();

    const character = this._nearestCharacter(from, aim, spec.range);
    const collision = this.game.collision;
    const world = collision?.raycast ? collision.raycast(from, aim, spec.range, bulletFilter) : null;

    if (character && (!world?.hit || character.distance <= world.distance)) {
      // A strike from behind is lethal.
      const facing = entityForward(character.entity);
      const behind = facing ? facing.dot(aim) > 0.45 : false;
      const meleeDef = {
        ...def,
        damage: spec.damage * (behind ? spec.backstab : 1),
        falloff: [[0, 1], [spec.range + 1, 1]],
        pellets: 1,
      };
      const record = this._applyCharacterHit(
        character, meleeDef, character.distance, 1, aim, from, 0, 1
      );
      record.melee = true;
      record.backstab = behind;
      this.stats.meleeHits += 1;
      if (record.killed) this.stats.meleeKills += 1;
      this._hitmarker({
        headshot: record.headshot, damage: record.damage, killed: record.killed,
        kind: character.kind, region: record.region, melee: true,
      });
      this._noise(from, { ...def, loudness: 0.12, noiseRadius: 4, key: def.key }, 'melee');
      this.lastShot = [record];
      return record;
    }

    if (world?.hit) {
      this._impact(world.point, world.normal, world.surface || SURFACE.CONCRETE, def, { melee: true });
      const ref = world.collider?.ref;
      if (ref && typeof ref.damage === 'function') ref.damage(spec.damage * 0.4, this.game.engine?.simTime || this.time);
      const record = {
        type: 'world', surface: world.surface, melee: true,
        point: world.point.toArray(), normal: world.normal.toArray(),
        distance: +world.distance.toFixed(3), damage: 0,
      };
      this.lastShot = [record];
      return record;
    }
    this.lastShot = [];
    return null;
  }

  // --------------------------------------------------------- bookkeeping --

  _onPlayerDamage(p) {
    if (!p) return;
    const amount = Number(p.amount) || 0;
    this.stats.damageTaken += amount;
    const player = this.game.player;
    if (p.sourcePos && player) {
      const src = toVec3(p.sourcePos);
      const angle = Math.atan2(src.x - player.position.x, -(src.z - player.position.z)) - player.yaw;
      this.damageIndicators.push({ angle: wrapAngle(angle), amount, time: this.time, kind: p.kind });
      if (this.damageIndicators.length > 8) this.damageIndicators.shift();
    }
    if (amount >= 18) this.game.postfx?.pulse?.(0xff3b30, Math.min(0.7, amount / 60), 0.5);
  }

  _onEnemyDeath(p) {
    this._countEnemyDown(p?.enemy || p?.entity || p?.id);
  }

  /**
   * Count a kill once. A kill can arrive twice — detected here when the health
   * hits zero, and again on EVT.ENEMY_DEATH from the AI — so both the entity
   * reference and its id are remembered.
   */
  _countEnemyDown(entity) {
    if (this._alreadyCounted('enemy', entity)) return;
    this.stats.enemiesNeutralised += 1;
  }

  _countHostageLost(entity) {
    if (this._alreadyCounted('hostage', entity)) return;
    this.stats.hostagesLost += 1;
  }

  _alreadyCounted(prefix, entity) {
    const idKey = `${prefix}:${idOf(entity)}`;
    const seen = this._countedDeaths.has(idKey)
      || (entity && typeof entity === 'object' && this._countedDeaths.has(entity));
    if (seen) return true;
    this._countedDeaths.add(idKey);
    if (entity && typeof entity === 'object') this._countedDeaths.add(entity);
    return false;
  }

  _onHostageState(p) {
    const state = String(p?.state || p?.status || '').toLowerCase();
    const entity = p?.hostage || p?.entity || p?.id;
    if (state.includes('secure') || state.includes('rescue') || state.includes('extract')) {
      if (this._alreadyCounted('secured', entity)) return;
      this.stats.hostagesSecured += 1;
    } else if (state.includes('lost') || state.includes('dead') || state.includes('killed') || state.includes('down')) {
      this._countHostageLost(entity);
    }
  }

  // ---------------------------------------------------------------- utils --

  _defOf(weapon) {
    if (!weapon) return weaponDef('carbine');
    if (weapon.def && weapon.def.spread) return weapon.def;
    if (weapon.spread && weapon.key) return weapon;
    return weaponDef(weapon);
  }

  _spreadOf(weapon, def) {
    if (weapon && typeof weapon.shotSpreadDegrees === 'number') return weapon.shotSpreadDegrees;
    const live = this.game.weapons;
    if (live && live.current === weapon && typeof live.spreadDegrees === 'number') return live.spreadDegrees;
    if (typeof weapon?.spreadDegrees === 'number') return weapon.spreadDegrees;
    return def.spread?.standing ?? 0;
  }

  /**
   * Rotate `dir` off-axis by a seeded amount inside a cone. Always consumes
   * exactly two values from the RNG so the stream stays aligned.
   * @param {'gauss'|'ring'} mode gaussian fill for aim error, ring for pellets
   */
  _perturb(dir, coneRadians, mode) {
    const u = this.rng.float();
    const v = this.rng.float();
    if (coneRadians <= 1e-6) return dir.clone();
    const angle = u * Math.PI * 2;
    const radius = mode === 'ring'
      ? coneRadians * (0.55 + v * 0.45)
      : coneRadians * Math.sqrt(v);
    const d = dir.clone().normalize();
    // Orthonormal basis around the aim.
    const helper = Math.abs(d.y) > 0.94 ? _vx : _vy;
    const right = new THREE.Vector3().crossVectors(d, helper).normalize();
    const up = new THREE.Vector3().crossVectors(right, d).normalize();
    const out = d.multiplyScalar(Math.cos(radius));
    const s = Math.sin(radius);
    out.addScaledVector(right, Math.cos(angle) * s);
    out.addScaledVector(up, Math.sin(angle) * s);
    return out.normalize();
  }

  /** End-of-mission card payload. */
  summary() {
    const s = this.stats;
    const accuracy = s.shotsFired > 0 ? s.hits / s.shotsFired : 0;
    const pelletAccuracy = s.pelletsFired > 0 ? s.pelletHits / s.pelletsFired : 0;
    return {
      shotsFired: s.shotsFired,
      hits: s.hits,
      headshots: s.headshots,
      accuracy: +(accuracy * 100).toFixed(1),
      projectileAccuracy: +(pelletAccuracy * 100).toFixed(1),
      damageDealt: Math.round(s.damageDealt),
      damageTaken: Math.round(s.damageTaken),
      enemiesNeutralised: s.enemiesNeutralised,
      hostagesSecured: s.hostagesSecured,
      hostagesLost: s.hostagesLost,
      hostagesHit: s.hostagesHit,
      penetrations: s.penetrations,
      glassBroken: s.glassBroken,
      doorsDestroyed: s.doorsDestroyed,
      meleeHits: s.meleeHits,
      meleeKills: s.meleeKills,
      shotsByWeapon: { ...s.shotsByWeapon },
      hasKeycard: this._hasKeycard,
    };
  }

  toJSON() {
    return {
      hasKeycard: this._hasKeycard,
      stats: this.summary(),
      hitmarkers: this.hitmarkers.length,
      lastShot: this.lastShot.map((r) => ({
        type: r.type, surface: r.surface || null, region: r.region || null,
        distance: r.distance, damage: r.damage, penetrated: !!r.penetrated,
      })),
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
  }
}

// ------------------------------------------------------------------ helpers --

const _v1 = new THREE.Vector3();
const _vy = new THREE.Vector3(0, 1, 0);
const _vx = new THREE.Vector3(1, 0, 0);
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _lo = new THREE.Vector3();
const _ld = new THREE.Vector3();

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0], v[1], v[2]);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

function numberOr(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function idOf(entity) {
  if (entity === null || entity === undefined) return 'unknown';
  if (typeof entity === 'string' || typeof entity === 'number') return String(entity);
  return String(entity.id ?? entity.name ?? entity.variant ?? 'entity');
}

function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function entityForward(entity) {
  if (!entity) return null;
  if (entity.forward) return toVec3(entity.forward).normalize();
  const yaw = entity.yaw ?? entity.group?.rotation?.y ?? entity.model?.group?.rotation?.y;
  if (typeof yaw === 'number') return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  return null;
}

/**
 * Ray vs. an oriented hit region. Regions are authored as a box in BONE space
 * (`offset` + `size`), so we pull the bone's world transform, push the ray into
 * that frame and run an ordinary slab test.
 */
function rayRegion(origin, dir, region, maxDist) {
  const bone = region.bone;
  let centre;
  let quat = null;
  let sx = 1;
  let sy = 1;
  let sz = 1;
  if (bone) {
    bone.updateWorldMatrix(true, false);
    const m = bone.matrixWorld;
    m.decompose(_pos, _q, _scale);
    quat = _q;
    sx = _scale.x || 1;
    sy = _scale.y || 1;
    sz = _scale.z || 1;
    centre = region.offset ? region.offset.clone().applyMatrix4(m) : _pos.clone();
  } else {
    centre = toVec3(region.center || region.centre || region.position);
  }
  const size = region.size;
  if (!size) return null;
  const hx = (size.x * sx) / 2;
  const hy = (size.y * sy) / 2;
  const hz = (size.z * sz) / 2;

  _lo.subVectors(origin, centre);
  _ld.copy(dir);
  if (quat) {
    const inv = _q.clone().invert();
    _lo.applyQuaternion(inv);
    _ld.applyQuaternion(inv);
  }

  let tmin = 0;
  let tmax = maxDist;
  const half = [hx, hy, hz];
  const o = [_lo.x, _lo.y, _lo.z];
  const d = [_ld.x, _ld.y, _ld.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < -half[a] || o[a] > half[a]) return null;
      continue;
    }
    const inv = 1 / d[a];
    let t1 = (-half[a] - o[a]) * inv;
    let t2 = (half[a] - o[a]) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || tmin > maxDist) return null;
  return { distance: tmin, point: origin.clone().addScaledVector(dir, tmin) };
}

/**
 * Where a ray leaves the collider it just entered, and how much material it
 * had to cross. Measured analytically against the collider's own box so a
 * grazing shot along a wall reports metres of material (and is refused).
 */
function exitThrough(collider, entryPoint, dir) {
  if (!collider) return null;
  const start = entryPoint.clone().addScaledVector(dir, 1e-4);
  const min = collider.min;
  const max = collider.max;
  let t = Infinity;
  let axis = -1;
  let sign = 1;
  const o = [start.x, start.y, start.z];
  const d = [dir.x, dir.y, dir.z];
  const lo = [min.x, min.y, min.z];
  const hi = [max.x, max.y, max.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) continue;
    const far = d[a] > 0 ? hi[a] : lo[a];
    const ta = (far - o[a]) / d[a];
    if (ta >= 0 && ta < t) { t = ta; axis = a; sign = d[a] > 0 ? 1 : -1; }
  }
  if (!Number.isFinite(t) || axis < 0) return null;
  const point = start.clone().addScaledVector(dir, t);
  const normal = new THREE.Vector3();
  normal.setComponent(axis, sign);
  return { point, normal, thickness: t + 1e-4 };
}

export { NOISE_EVENT, HITMARKER_EVENT };
