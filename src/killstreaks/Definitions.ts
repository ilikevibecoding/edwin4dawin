/**
 * The killstreak table.
 *
 * Costs follow the shape every player already has in their hands: a cheap
 * information reward, then an area denial, then the two that end a round. The
 * care package sits between the UAV and the air strike so there is a reason to
 * stop at four rather than pushing for five.
 *
 * `icon` is a short glyph string rather than an asset path — this project bakes
 * everything in code, and the HUD draws these as text.
 */
import type { KillstreakDefinition, KillstreakId } from '../core/Contracts';

export const KILLSTREAK_LIST: readonly KillstreakDefinition[] = [
  {
    id: 'uav',
    name: 'UAV RECON',
    cost: 3,
    description: 'Orbiting drone sweeps the area of operations and paints hostiles on the map.',
    requiresTargeting: false,
    icon: 'UAV',
    duration: 32,
  },
  {
    id: 'care_package',
    name: 'CARE PACKAGE',
    cost: 4,
    description: 'Airdropped crate. Contents unknown until opened, and anyone can take it.',
    requiresTargeting: false,
    icon: 'PKG',
    duration: 75,
  },
  {
    id: 'airstrike',
    name: 'AIR STRIKE',
    cost: 5,
    description: 'Three-ship carpet run. Paint the target and set the run-in heading.',
    requiresTargeting: true,
    icon: 'AIR',
    duration: 12,
  },
  {
    id: 'cluster_strike',
    name: 'CLUSTER STRIKE',
    cost: 7,
    description: 'High-altitude canister airburst. Wide bomblet pattern, nowhere to hide.',
    requiresTargeting: true,
    icon: 'CLU',
    duration: 11,
  },
  {
    id: 'chopper_gunner',
    name: 'CHOPPER GUNNER',
    cost: 9,
    description: 'Take the door gun of an orbiting gunship. Thermal optics, belt-fed.',
    requiresTargeting: false,
    icon: 'CHP',
    duration: 30,
  },
];

const BY_ID = new Map<KillstreakId, KillstreakDefinition>(
  KILLSTREAK_LIST.map((d) => [d.id, d] as const),
);

export function killstreakDef(id: KillstreakId): KillstreakDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`[killstreaks] unknown killstreak "${id}"`);
  return def;
}

export function hasKillstreak(id: string): id is KillstreakId {
  return BY_ID.has(id as KillstreakId);
}

/** Ordered by cost, which is the order the HUD should list them in. */
export const KILLSTREAK_IDS: readonly KillstreakId[] = KILLSTREAK_LIST.map((d) => d.id);

/**
 * What a care package can contain, with weights. Deliberately excludes the
 * chopper gunner: a nine-streak reward should not fall out of a four-streak box.
 */
export const CARE_PACKAGE_TABLE: ReadonlyArray<{ id: KillstreakId | 'ammo'; weight: number }> = [
  { id: 'ammo', weight: 30 },
  { id: 'uav', weight: 26 },
  { id: 'care_package', weight: 8 },
  { id: 'airstrike', weight: 22 },
  { id: 'cluster_strike', weight: 14 },
];
