/**
 * The damage funnel.
 *
 * Every point of damage in the game — bullets, shrapnel, blast, melee, falls,
 * fire, airstrikes — arrives here. Centralising it is what makes the killfeed,
 * the score, the assists, the hitmarkers and the killstreak counter consistent
 * without every system that can hurt something having to remember all six.
 *
 * The registry keeps three views of the same entity set: a dense array for hot
 * iteration, an id map for cross-system references, and a coarse spatial grid so
 * an explosion touches the dozen entities near it instead of all of them.
 */
import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type { Damageable, DamageInfo, DamageType, Team } from '../core/GameTypes';
import {
  calibrateProfile,
  createHitboxProfile,
  hitboxRadius,
  hitboxTop,
  type HitboxProfile,
} from './Hitboxes';
import type { CombatDeps } from './Deps';

/** Metres per spatial bucket. Roughly one grenade radius. */
const CELL_SIZE = 8;
/** Seconds a damage contribution stays eligible for an assist. */
const ASSIST_WINDOW = 10;
/** Contributions tracked per victim before the oldest is overwritten. */
const CONTRIBUTORS = 4;
/** Minimum gap between suppression calls for one entity, in seconds. */
const SUPPRESS_INTERVAL = 0.3;

const SCORE_KILL = 100;
const SCORE_HEADSHOT_BONUS = 25;
const SCORE_ASSIST = 50;

export interface EntityRecord {
  entity: Damageable;
  profile: HitboxProfile;
  name: string;
  /** Cached position, refreshed once per frame by `refresh()`. */
  readonly position: THREE.Vector3;
  /** Grid cell the entity was filed under during the last rebuild. */
  cell: number;
  /** Ring of `{ id, amount, time }` triples for assist attribution. */
  readonly contribIds: Int32Array;
  readonly contribAmount: Float32Array;
  readonly contribTime: Float32Array;
  contribCursor: number;
  lastSuppressAt: number;
  /** Scratch used by the explosion solver so it needs no per-target allocation. */
  pendingDamage: number;
  pendingShrapnel: number;
  pendingTag: number;
}

export interface ScoreState {
  score: number;
  kills: number;
  deaths: number;
  streak: number;
  assists: number;
  headshots: number;
}

/** Mutable mirror of the `combat:kill` payload, reused to keep kills allocation-free. */
interface KillPayload {
  victim: Damageable | null;
  killer: Damageable | null;
  weaponId: string;
  isHeadshot: boolean;
  distance: number;
}

const EMPTY: readonly Damageable[] = [];

export class DamageRegistry {
  readonly score: ScoreState = {
    score: 0,
    kills: 0,
    deaths: 0,
    streak: 0,
    assists: 0,
    headshots: 0,
  };

  /** Dense list of every registered entity; iterate this, never a Set. */
  readonly records: EntityRecord[] = [];

  private readonly byEntity = new Map<Damageable, EntityRecord>();
  private readonly byId = new Map<number, Damageable>();
  private readonly teamLists: Record<Team, Damageable[]> = {
    player: [],
    enemy: [],
    neutral: [],
  };
  private readonly cells = new Map<number, EntityRecord[]>();
  private readonly cellPool: EntityRecord[][] = [];
  private teamsDirty = true;
  private gridFrame = -1;
  private explosionTag = 0;

  private readonly scratch = new THREE.Vector3();
  private readonly dirScratch = new THREE.Vector3();
  private readonly killPayload: KillPayload = {
    victim: null,
    killer: null,
    weaponId: '',
    isHeadshot: false,
    distance: 0,
  };
  private readonly scorePayload = { score: 0, kills: 0, deaths: 0, streak: 0 };

  constructor(private readonly deps: CombatDeps) {}

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  register(entity: Damageable): EntityRecord {
    const existing = this.byEntity.get(entity);
    if (existing) return existing;
    const record: EntityRecord = {
      entity,
      profile: createHitboxProfile(),
      name: defaultName(entity),
      position: new THREE.Vector3(),
      cell: 0,
      contribIds: new Int32Array(CONTRIBUTORS),
      contribAmount: new Float32Array(CONTRIBUTORS),
      contribTime: new Float32Array(CONTRIBUTORS),
      contribCursor: 0,
      lastSuppressAt: -1e9,
      pendingDamage: 0,
      pendingShrapnel: 0,
      pendingTag: -1,
    };
    entity.getPosition(record.position);
    this.records.push(record);
    this.byEntity.set(entity, record);
    this.byId.set(entity.id, entity);
    this.teamsDirty = true;
    this.gridFrame = -1;
    return record;
  }

  unregister(entity: Damageable): void {
    const record = this.byEntity.get(entity);
    if (!record) return;
    this.byEntity.delete(entity);
    if (this.byId.get(entity.id) === entity) this.byId.delete(entity.id);
    const index = this.records.indexOf(record);
    if (index !== -1) {
      this.records[index] = this.records[this.records.length - 1];
      this.records.pop();
    }
    this.teamsDirty = true;
    this.gridFrame = -1;
  }

  /**
   * Registers an entity discovered through a hit rather than announced.
   * Cheap insurance: a module that forgets to register still takes damage, shows
   * in the killfeed and can be found by radius queries.
   */
  ensure(entity: Damageable): EntityRecord {
    return this.byEntity.get(entity) ?? this.register(entity);
  }

  byEntityId(id: number): Damageable | undefined {
    return this.byId.get(id);
  }

  setDisplayName(entity: Damageable, name: string): void {
    const record = this.byEntity.get(entity);
    if (record) record.name = name;
  }

  setHitboxHeight(entity: Damageable, height: number): void {
    const record = this.byEntity.get(entity);
    if (record) record.profile.height = Math.max(0.5, height);
  }

  entitiesOf(team: Team): readonly Damageable[] {
    if (this.teamsDirty) this.rebuildTeams();
    return this.teamLists[team] ?? EMPTY;
  }

  get localEntity(): Damageable | null {
    return this.deps.player?.entity ?? null;
  }

  // -------------------------------------------------------------------------
  // Per-frame maintenance
  // -------------------------------------------------------------------------

  /**
   * Refreshes cached positions and the team lists. Linear in the entity count,
   * which is a few dozen, and it keeps every query in the frame consistent.
   */
  refresh(now: number): void {
    const records = this.records;
    let deadFound = false;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      record.entity.getPosition(record.position);
      if (!record.entity.isAlive) deadFound = true;
      if (!record.profile.calibrated) {
        calibrateProfile(record.profile, record.entity, this.deps.physics, now, this.scratch);
      }
    }
    if (deadFound || this.teamsDirty) this.rebuildTeams();
    this.gridFrame = -1;
  }

  private rebuildTeams(): void {
    this.teamsDirty = false;
    this.teamLists.player.length = 0;
    this.teamLists.enemy.length = 0;
    this.teamLists.neutral.length = 0;
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      if (!record.entity.isAlive) continue;
      const list = this.teamLists[record.entity.team];
      if (list) list.push(record.entity);
    }
  }

  // -------------------------------------------------------------------------
  // Spatial queries
  // -------------------------------------------------------------------------

  private rebuildGrid(frame: number): void {
    if (this.gridFrame === frame) return;
    this.gridFrame = frame;
    for (const list of this.cells.values()) {
      list.length = 0;
      this.cellPool.push(list);
    }
    this.cells.clear();
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      if (!record.entity.isAlive) continue;
      const key = cellKey(record.position.x, record.position.z);
      record.cell = key;
      let list = this.cells.get(key);
      if (!list) {
        list = this.cellPool.pop() ?? [];
        this.cells.set(key, list);
      }
      list.push(record);
    }
  }

  /**
   * Live entities whose body volume reaches inside `radius` of `centre`.
   * Walks only the buckets the sphere overlaps.
   */
  queryRadius(
    centre: THREE.Vector3,
    radius: number,
    frame: number,
    out: EntityRecord[],
  ): EntityRecord[] {
    out.length = 0;
    this.rebuildGrid(frame);
    if (this.cells.size === 0) return out;
    const minX = Math.floor((centre.x - radius) / CELL_SIZE);
    const maxX = Math.floor((centre.x + radius) / CELL_SIZE);
    const minZ = Math.floor((centre.z - radius) / CELL_SIZE);
    const maxZ = Math.floor((centre.z + radius) / CELL_SIZE);
    for (let cz = minZ; cz <= maxZ; cz++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const list = this.cells.get(cx * 73856093 + cz * 19349663);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const record = list[i];
          if (withinRadius(record, centre, radius)) out.push(record);
        }
      }
    }
    return out;
  }

  /** Monotonic tag used to mark records touched by one explosion. */
  nextTag(): number {
    return ++this.explosionTag;
  }

  // -------------------------------------------------------------------------
  // Suppression throttling
  // -------------------------------------------------------------------------

  /** True when this entity has not been suppressed too recently. */
  claimSuppression(record: EntityRecord, now: number): boolean {
    if (now - record.lastSuppressAt < SUPPRESS_INTERVAL) return false;
    record.lastSuppressAt = now;
    return true;
  }

  // -------------------------------------------------------------------------
  // Damage
  // -------------------------------------------------------------------------

  /**
   * The one place damage is applied.
   *
   * `info.amount` is final: multipliers for body part and range are the caller's
   * business, because only the caller knows whether they apply. This function
   * owns the team check, the bookkeeping and every piece of feedback.
   */
  applyDamage(target: Damageable, info: DamageInfo): void {
    if (!target || info.amount <= 0) return;
    if (!target.isAlive) return;
    const source = info.source;
    if (source && source !== target && !friendlyFireAllowed(source, target)) return;

    const record = this.ensure(target);
    const before = target.health;
    target.applyDamage(info);
    const dealt = Math.max(0, before - target.health);
    const died = before > 0 && !target.isAlive;

    if (source && source !== target && dealt > 0) {
      this.credit(record, source.id, dealt);
    }

    const local = this.localEntity;
    if (source === local && local !== null && source !== target) {
      const ui = this.deps.ui;
      if (ui && (dealt > 0 || died)) {
        ui.showHitmarker(died ? 'kill' : info.isHeadshot ? 'headshot' : 'normal');
      }
    }
    if (target === local && local !== null && source !== target && dealt > 0) {
      // Combat knows the true direction of the shot, which is more useful than
      // anything reconstructed from a health delta.
      this.deps.ui?.showDamageDirection(this.dirScratch.copy(info.direction));
    }

    if (died) this.onDeath(record, info);
  }

  private credit(record: EntityRecord, sourceId: number, amount: number): void {
    const now = this.deps.now();
    for (let i = 0; i < CONTRIBUTORS; i++) {
      if (record.contribIds[i] === sourceId) {
        record.contribAmount[i] += amount;
        record.contribTime[i] = now;
        return;
      }
    }
    const slot = record.contribCursor % CONTRIBUTORS;
    record.contribCursor++;
    record.contribIds[slot] = sourceId;
    record.contribAmount[slot] = amount;
    record.contribTime[slot] = now;
  }

  private onDeath(record: EntityRecord, info: DamageInfo): void {
    const victim = record.entity;
    const killer = info.source;
    this.teamsDirty = true;

    const distance = info.distance ?? this.distanceBetween(killer, victim);
    const weaponId = info.weaponId ?? weaponIdFor(info.type);
    const headshot = info.isHeadshot === true;

    const payload = this.killPayload;
    payload.victim = victim;
    payload.killer = killer ?? null;
    payload.weaponId = weaponId;
    payload.isHeadshot = headshot;
    payload.distance = distance;
    this.deps.emit('combat:kill', payload);

    const local = this.localEntity;
    const killerName = killer ? this.nameOf(killer) : 'WORLD';
    const localInvolved = killer === local || victim === local;
    this.deps.ui?.pushKillfeed(killerName, record.name, weaponId, headshot, localInvolved);

    if (killer && killer !== victim && killer === local) {
      this.score.kills++;
      this.score.streak++;
      if (headshot) this.score.headshots++;
      this.score.score += SCORE_KILL + (headshot ? SCORE_HEADSHOT_BONUS : 0);
      this.deps.killstreaks?.addKill();
      this.awardAssist(record, killer.id);
      this.publishScore();
    } else if (victim === local) {
      this.score.deaths++;
      this.score.streak = 0;
      this.deps.killstreaks?.resetStreak();
      this.publishScore();
    } else if (killer === local && killer === victim) {
      // Killed by your own ordnance: no kill credit, but the streak is gone.
      this.score.deaths++;
      this.score.streak = 0;
      this.deps.killstreaks?.resetStreak();
      this.publishScore();
    }

    this.resetContributions(record);
  }

  /** The biggest recent contributor other than the killer gets the assist. */
  private awardAssist(record: EntityRecord, killerId: number): void {
    const local = this.localEntity;
    if (!local) return;
    const now = this.deps.now();
    let bestId = -1;
    let bestAmount = 0;
    for (let i = 0; i < CONTRIBUTORS; i++) {
      const id = record.contribIds[i];
      if (id === 0 || id === killerId) continue;
      if (now - record.contribTime[i] > ASSIST_WINDOW) continue;
      if (record.contribAmount[i] > bestAmount) {
        bestAmount = record.contribAmount[i];
        bestId = id;
      }
    }
    if (bestId === local.id && bestAmount > 0) {
      this.score.assists++;
      this.score.score += SCORE_ASSIST;
    }
  }

  private resetContributions(record: EntityRecord): void {
    record.contribIds.fill(0);
    record.contribAmount.fill(0);
    record.contribTime.fill(0);
    record.contribCursor = 0;
  }

  publishScore(): void {
    const payload = this.scorePayload;
    payload.score = this.score.score;
    payload.kills = this.score.kills;
    payload.deaths = this.score.deaths;
    payload.streak = this.score.streak;
    this.deps.emit('score:changed', payload);
  }

  nameOf(entity: Damageable): string {
    const record = this.byEntity.get(entity);
    if (record) return record.name;
    return defaultName(entity);
  }

  private distanceBetween(a: Damageable | null, b: Damageable): number {
    if (!a) return 0;
    a.getPosition(this.scratch);
    const ax = this.scratch.x;
    const ay = this.scratch.y;
    const az = this.scratch.z;
    b.getPosition(this.scratch);
    return Math.hypot(ax - this.scratch.x, ay - this.scratch.y, az - this.scratch.z);
  }

  clear(): void {
    this.records.length = 0;
    this.byEntity.clear();
    this.byId.clear();
    this.cells.clear();
    this.cellPool.length = 0;
    this.teamLists.player.length = 0;
    this.teamLists.enemy.length = 0;
    this.teamLists.neutral.length = 0;
    this.teamsDirty = true;
  }
}

/**
 * `GAMEPLAY.combat.friendlyFire` governs teammates only. Self damage always
 * lands — riding your own rocket into a wall has to be able to kill you — and
 * neutral entities such as barrels are fair game for everyone.
 */
function friendlyFireAllowed(source: Damageable, target: Damageable): boolean {
  if (GAMEPLAY.combat.friendlyFire) return true;
  if (source.team !== target.team) return true;
  return source.team === 'neutral';
}

function withinRadius(record: EntityRecord, centre: THREE.Vector3, radius: number): boolean {
  const p = record.position;
  const dx = p.x - centre.x;
  const dz = p.z - centre.z;
  const horizontal = Math.sqrt(dx * dx + dz * dz) - hitboxRadius(record.profile);
  const base = p.y - record.profile.feetOffset;
  const top = base + hitboxTop(record.profile);
  const dy = centre.y < base ? base - centre.y : centre.y > top ? centre.y - top : 0;
  const reach = Math.max(0, horizontal);
  return reach * reach + dy * dy <= radius * radius;
}

const cellKey = (x: number, z: number): number =>
  Math.floor(x / CELL_SIZE) * 73856093 + Math.floor(z / CELL_SIZE) * 19349663;

function defaultName(entity: Damageable): string {
  const named = entity as unknown as { displayName?: unknown; name?: unknown };
  if (typeof named.displayName === 'string' && named.displayName.length > 0) {
    return named.displayName;
  }
  if (typeof named.name === 'string' && named.name.length > 0) return named.name;
  return entity.team === 'player' ? 'PLAYER' : `HOSTILE ${entity.id}`;
}

function weaponIdFor(type: DamageType): string {
  switch (type) {
    case 'explosive':
      return 'explosion';
    case 'shrapnel':
      return 'shrapnel';
    case 'melee':
      return 'melee';
    case 'fall':
      return 'fall';
    case 'fire':
      return 'fire';
    case 'collision':
      return 'collision';
    default:
      return 'bullet';
  }
}
