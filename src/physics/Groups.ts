/**
 * Rapier interaction groups.
 *
 * Rapier packs two 16-bit masks into one 32-bit integer: the upper half is what
 * the collider *is*, the lower half is what it is willing to interact *with*.
 * A pair interacts only when both directions agree:
 *
 *   ((a >> 16) & b) != 0 && ((b >> 16) & a) != 0
 *
 * Scene queries use the same encoding, so a query that should be able to hit
 * anything in `mask` declares itself a member of every group and filters on
 * `mask` — see `queryGroups`.
 */
import { COLLISION_GROUP } from '../core/GameTypes';

export const ALL_GROUPS = 0xffff;

export const interactionGroups = (membership: number, filter: number): number =>
  ((((membership & 0xffff) << 16) >>> 0) | (filter & 0xffff)) >>> 0;

/** Filter for a scene query that may hit any collider belonging to `mask`. */
export const queryGroups = (mask: number): number => interactionGroups(ALL_GROUPS, mask);

const G = COLLISION_GROUP;

/** World geometry: collides with everything that moves, never with itself. */
export const STATIC_GROUPS = interactionGroups(G.STATIC, ALL_GROUPS & ~G.STATIC);

/** Props, barrels, crates. */
export const DYNAMIC_GROUPS = interactionGroups(G.DYNAMIC, ALL_GROUPS & ~G.TRIGGER);

/** Explosion debris and gibs; identical rules to dynamic props. */
export const DEBRIS_GROUPS = interactionGroups(G.DEBRIS, ALL_GROUPS & ~G.TRIGGER);

/**
 * Character capsules. Corpses are deliberately excluded: a ragdoll wedged in a
 * doorway must never be able to trap a player, and pushing one around with the
 * capsule looks worse than walking through it.
 */
export const CHARACTER_FILTER = G.STATIC | G.DYNAMIC | G.DEBRIS | G.TRIGGER;
export const PLAYER_GROUPS = interactionGroups(G.PLAYER, CHARACTER_FILTER);
export const ENEMY_GROUPS = interactionGroups(G.ENEMY, CHARACTER_FILTER);

/** Rockets and grenades: everything solid, including bodies. */
export const PROJECTILE_GROUPS = interactionGroups(
  G.PROJECTILE,
  G.STATIC | G.DYNAMIC | G.DEBRIS | G.PLAYER | G.ENEMY | G.RAGDOLL,
);

/** Ragdoll limbs pile on each other and on the world, but not on live characters. */
export const RAGDOLL_GROUPS = interactionGroups(
  G.RAGDOLL,
  G.STATIC | G.DYNAMIC | G.DEBRIS | G.RAGDOLL | G.PROJECTILE,
);

export const TRIGGER_GROUPS = interactionGroups(G.TRIGGER, G.PLAYER | G.ENEMY);

/** Groups a raycast hits when the caller does not narrow it down. */
export const DEFAULT_QUERY_MASK = ALL_GROUPS;

/** Groups that block sight by default: solid world plus solid props. */
export const DEFAULT_SIGHT_MASK = G.STATIC | G.DYNAMIC;

/** Maps a caller-supplied group bitmask onto the collider groups it should get. */
export function groupsForBody(mask: number | undefined): number {
  if (mask === undefined) return DYNAMIC_GROUPS;
  if (mask & G.RAGDOLL) return RAGDOLL_GROUPS;
  if (mask & G.PROJECTILE) return PROJECTILE_GROUPS;
  if (mask & G.DEBRIS) return DEBRIS_GROUPS;
  if (mask & G.TRIGGER) return TRIGGER_GROUPS;
  if (mask & G.PLAYER) return PLAYER_GROUPS;
  if (mask & G.ENEMY) return ENEMY_GROUPS;
  if (mask & G.STATIC) return STATIC_GROUPS;
  return DYNAMIC_GROUPS;
}
