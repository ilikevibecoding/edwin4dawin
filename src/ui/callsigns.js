/** Enemy callsigns for the kill feed / death screen. Deterministic per enemy id. */
export const CALLSIGNS = [
  'VIPER', 'GHOST', 'REAPER', 'KESTREL', 'HAVOC', 'SABLE', 'RAZOR', 'TALON', 'WRAITH', 'FALCON',
  'NOMAD', 'JACKAL', 'CIPHER', 'RONIN', 'ORCA', 'MANTIS', 'COBRA', 'DRIFTER', 'HAWK', 'BISHOP',
  'LYNX', 'VULCAN', 'RAVEN', 'TITAN', 'SPECTRE', 'MAVERICK', 'CASTLE', 'BRIGAND', 'HOUND', 'PIKE',
  'STRIKER', 'ONYX', 'LOCUST', 'SCORCH', 'ARGUS', 'DELTA', 'GARGOYLE', 'HAZARD', 'KODIAK', 'MIRAGE',
];

const cache = new Map();

/** Stable name for an enemy (by id). Ids are spread across the list so consecutive spawns differ. */
export function callsignFor(enemy) {
  const id = enemy?.id ?? 0;
  if (cache.has(id)) return cache.get(id);
  const n = CALLSIGNS.length;
  const idx = (id * 17 + 3) % n;
  const name = CALLSIGNS[idx];
  // Disambiguate once the list wraps (id > list length) with a numeric suffix, like squad tags.
  const label = id > n ? `${name}-${Math.floor(id / n)}` : name;
  cache.set(id, label);
  return label;
}
