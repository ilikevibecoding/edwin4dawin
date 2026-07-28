/**
 * Scoreboard bookkeeping.
 *
 * There is no roster in the contract, so it is reconstructed from what crosses
 * the wire. `combat:kill` carries the entities and fires immediately before
 * `pushKillfeed` carries their display names, both synchronously inside the same
 * damage call, which is what lets an entity id be paired with the name the
 * killfeed is about to show — the scoreboard and the killfeed then agree, which
 * they would not if this invented its own callsigns.
 */
import type { Damageable, Team } from '../core/GameTypes';

export interface RosterEntry {
  id: number;
  /** Canonical name, always free of the disambiguating suffix. */
  name: string;
  /** What the scoreboard shows: `name`, plus a suffix when it is not unique. */
  label: string;
  team: Team;
  kills: number;
  deaths: number;
  headshots: number;
  score: number;
  streak: number;
  bestStreak: number;
  alive: boolean;
  isLocal: boolean;
}

const SCORE_KILL = 100;
const SCORE_HEADSHOT = 25;

/** The suffix `dedupeNames` appends, stripped before anything is matched on. */
const SUFFIX = /\s·\s\d+$/;
const baseName = (name: string): string => name.replace(SUFFIX, '');

/** Digit-aware so HOSTILE 9 sorts above HOSTILE 10 rather than below it. */
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export class Roster {
  private readonly byId = new Map<number, RosterEntry>();
  private readonly sorted: RosterEntry[] = [];
  private dirty = true;

  /** Entities captured from the last `combat:kill`, awaiting their names. */
  private pendingKiller: Damageable | null = null;
  private pendingVictim: Damageable | null = null;
  private pendingHeadshot = false;

  private localId = -1;

  setLocal(entity: Damageable | null, name = 'PLAYER'): void {
    if (!entity) return;
    this.localId = entity.id;
    const entry = this.ensure(entity.id, name, entity.team);
    entry.isLocal = true;
    entry.alive = entity.isAlive;
    this.dirty = true;
  }

  /** Seen at spawn, before the bot has appeared in anybody's killfeed. */
  noteSpawn(id: number, team: Team = 'enemy'): void {
    const entry = this.ensure(id, `HOSTILE ${id}`, team);
    entry.alive = true;
    this.dirty = true;
  }

  /** Called from the `combat:kill` handler. The payload is pooled: copy, never keep. */
  noteKill(killer: Damageable | null, victim: Damageable, headshot: boolean): void {
    this.pendingKiller = killer;
    this.pendingVictim = victim;
    this.pendingHeadshot = headshot;
  }

  /**
   * Called from `pushKillfeed`, which the combat module raises straight after
   * `combat:kill`. When the two do not pair up — a scripted killfeed entry, or a
   * future caller that skips the event — the names are still recorded so the
   * board is never emptier than the feed.
   */
  noteFeed(killerName: string, victimName: string, headshot: boolean, localInvolved: boolean): void {
    const killerEntity = this.pendingKiller;
    const victimEntity = this.pendingVictim;
    this.pendingKiller = null;
    this.pendingVictim = null;
    const hs = headshot || this.pendingHeadshot;
    this.pendingHeadshot = false;

    const victim = victimEntity
      ? this.ensure(victimEntity.id, victimName, victimEntity.team)
      : this.findByName(victimName, 'enemy');
    victim.name = baseName(victimName);
    victim.deaths++;
    victim.streak = 0;
    victim.alive = false;

    if (killerName && killerName !== 'WORLD' && killerName !== victimName) {
      const killer = killerEntity
        ? this.ensure(killerEntity.id, killerName, killerEntity.team)
        : this.findByName(killerName, localInvolved ? 'player' : 'enemy');
      killer.name = baseName(killerName);
      killer.kills++;
      if (hs) killer.headshots++;
      killer.streak++;
      killer.bestStreak = Math.max(killer.bestStreak, killer.streak);
      killer.score += SCORE_KILL + (hs ? SCORE_HEADSHOT : 0);
      killer.alive = true;
    }
    this.dedupeNames();
    this.dirty = true;
  }

  /** Authoritative figures for the local player, straight from the combat module. */
  setLocalScore(score: number, kills: number, deaths: number, streak: number): void {
    const entry = this.byId.get(this.localId);
    if (!entry) return;
    entry.score = score;
    entry.kills = kills;
    entry.deaths = deaths;
    entry.streak = streak;
    entry.bestStreak = Math.max(entry.bestStreak, streak);
    this.dirty = true;
  }

  setLocalAlive(alive: boolean): void {
    const entry = this.byId.get(this.localId);
    if (!entry || entry.alive === alive) return;
    entry.alive = alive;
    this.dirty = true;
  }

  get entries(): readonly RosterEntry[] {
    if (this.dirty) {
      this.sorted.length = 0;
      for (const entry of this.byId.values()) this.sorted.push(entry);
      this.sorted.sort(
        (a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths ||
          collator.compare(a.label, b.label),
      );
      this.dirty = false;
    }
    return this.sorted;
  }

  private ensure(id: number, rawName: string, team: Team): RosterEntry {
    let entry = this.byId.get(id);
    if (!entry) {
      const name = baseName(rawName);
      entry = {
        id,
        name,
        label: name,
        team,
        kills: 0,
        deaths: 0,
        headshots: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        alive: true,
        isLocal: id === this.localId,
      };
      this.byId.set(id, entry);
    }
    entry.team = team;
    return entry;
  }

  /** Fallback path for a feed entry with no matching entity. */
  private findByName(rawName: string, team: Team): RosterEntry {
    const name = baseName(rawName);
    for (const entry of this.byId.values()) {
      if (entry.name === name) return entry;
    }
    // Synthetic ids are negative so they can never collide with an entity id.
    return this.ensure(-(this.byId.size + 1), name, team);
  }

  /**
   * Archetype labels are shared by every bot of that type, so two rows called
   * RIFLEMAN are the normal case. A short id suffix keeps them distinguishable
   * without inventing a name the killfeed does not use. The suffix only ever
   * lands on `label`, so the next feed entry still matches on `name`.
   */
  private dedupeNames(): void {
    const seen = new Map<string, RosterEntry>();
    for (const entry of this.byId.values()) {
      entry.label = entry.name;
      const first = seen.get(entry.name);
      if (!first) {
        seen.set(entry.name, entry);
        continue;
      }
      if (first.id >= 0 && !first.isLocal) first.label = `${first.name} · ${first.id % 100}`;
      if (entry.id >= 0 && !entry.isLocal) entry.label = `${entry.name} · ${entry.id % 100}`;
    }
  }

  reset(): void {
    this.byId.clear();
    this.sorted.length = 0;
    this.pendingKiller = null;
    this.pendingVictim = null;
    this.dirty = true;
  }

  /**
   * Overwrites the board with fixed figures. Ids are derived from the row index
   * so repeated calls settle on the same rows rather than stacking up, which is
   * what lets the demo re-assert its numbers after driving the killfeed.
   */
  seedDemo(rows: ReadonlyArray<Omit<RosterEntry, 'id' | 'label' | 'isLocal'> & { isLocal?: boolean }>): void {
    rows.forEach((row, index) => {
      // A real local player is already on the board under its entity id; taking
      // it over rather than adding a row avoids two rows called PLAYER.
      const existing = row.isLocal === true ? this.byId.get(this.localId) : undefined;
      const id = existing ? existing.id : -1000 - index;
      const entry: RosterEntry = {
        ...row,
        id,
        name: baseName(row.name),
        label: row.name,
        isLocal: row.isLocal === true,
      };
      if (entry.isLocal) this.localId = id;
      this.byId.set(id, entry);
    });
    this.dedupeNames();
    this.dirty = true;
  }
}
