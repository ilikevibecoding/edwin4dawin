/**
 * Killstreak display data.
 *
 * The killstreak module owns the ladder and publishes it on `definitions` /
 * `getDefinition`, past the contract, which carries only ids. Everything here
 * reads through to that — there is deliberately no local table of names and
 * costs, because a second copy of the ladder is a copy that goes stale the
 * first time someone retunes a cost.
 *
 * The artwork is the exception. The module's `icon` is a three-letter string
 * ('UAV', 'AIR'), which is a text label rather than a glyph; the HUD draws its
 * own silhouettes from `Icons.ts` and keys them by id.
 */
import type { KillstreakExtras, StreakSource } from './HudState';

export interface StreakDisplay {
  id: string;
  name: string;
  cost: number;
  description: string;
}

const EMPTY: ReadonlyArray<StreakDisplay> = [];

const adapt = (def: StreakSource): StreakDisplay => ({
  id: def.id,
  name: def.name,
  cost: def.cost,
  description: def.description ?? '',
});

/** The ladder, cheapest first — the order the tray and the briefing list in. */
export function streakList(system: KillstreakExtras | undefined): ReadonlyArray<StreakDisplay> {
  const published = system?.definitions;
  if (!published || published.length === 0) return EMPTY;
  return published.map(adapt).sort((a, b) => a.cost - b.cost);
}

/**
 * One entry. Falls back to a readable version of the id, which is what a care
 * package dropping something this build has never heard of would produce.
 */
export function streakDisplay(id: string, system: KillstreakExtras | undefined): StreakDisplay {
  const direct = system?.getDefinition?.(id);
  if (direct) return adapt(direct);
  for (const def of streakList(system)) {
    if (def.id === id) return def;
  }
  return { id, name: prettify(id), cost: 0, description: '' };
}

/** Next streak the player has not yet earned, or null once everything is up. */
export function nextStreak(
  streak: number,
  system: KillstreakExtras | undefined,
): StreakDisplay | null {
  for (const def of streakList(system)) {
    if (streak < def.cost) return def;
  }
  return null;
}

/** Tray order. The label shown against each is whatever the action is bound to. */
export const STREAK_ACTIONS = ['killstreak1', 'killstreak2', 'killstreak3'] as const;

function prettify(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
