/**
 * Every glyph in the HUD, generated as inline SVG.
 *
 * A killfeed row that reads `KILLER — MK4 CARBINE — VICTIM` is text soup; a
 * silhouette is read at a glance and survives being 14 px tall. The shapes are
 * deliberately blocky — at killfeed size, detail turns to mud — and all of them
 * are authored in one 48x16 box so a row of mixed weapon classes lines up.
 */

/** Weapon silhouettes, muzzle pointing at the victim on the right. */
const WEAPON_PATHS: Record<string, string> = {
  ar: 'M3 6h11v4H3z M14 5h18v5H14z M32 6h14v2H32z M34 4h2v2h-2z M20 10h6l-1 5h-4z M16 10h3l-1 4h-2z M22 2h7v3h-7z',
  smg: 'M7 6h7v4H7z M14 5h14v5H14z M28 6h9v2H28z M18 10h5l1 6h-5z M15 10h2l-1 3h-2z M20 3h6v2h-6z',
  lmg: 'M2 6h12v4H2z M14 4h20v7H14z M34 6h12v2H34z M18 11h11v4H18z M20 2h9v2h-9z M37 8h2v6h-2z',
  sniper:
    'M1 6h13v5H1z M14 5h16v5H14z M30 6h16v2H30z M16 1h15v3H16z M19 4h2v1h-2z M27 4h2v1h-2z M20 10h5v3h-5z M40 8h2v6h-2z',
  shotgun: 'M2 6h12v4H2z M14 5h12v5H14z M26 6h20v2H26z M28 9h15v2H28z M32 11h6v3h-6z',
  pistol: 'M15 4h16v5H15z M31 5h4v3h-4z M17 9h6l-2 7h-6z M22 9h6v2h-6z',
  launcher: 'M6 6h34v4H6z M1 4l5 2v4l-5 2z M40 3h7v10h-7z M18 10h4l-1 5h-4z M23 2h7v3h-7z',
  melee: 'M4 6h10v4H4z M14 7l22-4v6z',
  // Every subpath winds clockwise so the default nonzero fill unions them; an
  // arc drawn the other way would punch the body out where the neck overlaps.
  grenade:
    'M22.4 1.4h3.2v2h-3.2z M25.4 1.6h5.2v1.4h-5.2z M29.3 2.4h1.4v5h-1.4z' +
    ' M21.6 3.2h4.8v2.8h-4.8z M24 5.4a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 1 1 0-10.4z',
  explosion:
    'M24 0l3 6 6-4-2 6 7 1-6 3 5 5-7-2 1 7-5-5-4 5-1-7-7 2 5-5-7-3 7-1-2-6 6 4z',
  fall: 'M22 0h4v9h5l-7 7-7-7h5z',
  fire: 'M24 0c4 5 7 6 7 10a7 7 0 0 1-14 0c0-3 3-3 4-6 1 2 2 3 3 3 1-2 0-4 0-7z',
  collision: 'M8 6h32v4H8z M4 4l4 4-4 4z M44 4l-4 4 4 4z',
  bullet: 'M14 6h22v4H14z M36 5l6 3-6 3z M10 6h4v4h-4z',
};

const HEADSHOT_PATH =
  'M8 1c3.3 0 6 2.5 6 5.6 0 2.1-1 3.4-2 4.3V13H4v-2.1C3 10 2 8.7 2 6.6 2 3.5 4.7 1 8 1z' +
  ' M3.9 6.9a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0z' +
  ' M8.7 6.9a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0z';

/** Prefix of a weapon id to the silhouette it should use. */
const ID_PREFIX: ReadonlyArray<[string, string]> = [
  ['ar_', 'ar'],
  ['smg_', 'smg'],
  ['lmg_', 'lmg'],
  ['sniper_', 'sniper'],
  ['shotgun_', 'shotgun'],
  ['pistol_', 'pistol'],
  ['launcher_', 'launcher'],
  ['melee_', 'melee'],
];

/** Non-weapon kill causes, as emitted by the combat module. */
const CAUSE_ICON: Record<string, string> = {
  frag: 'grenade',
  flash: 'grenade',
  smoke: 'grenade',
  explosion: 'explosion',
  shrapnel: 'explosion',
  airstrike: 'explosion',
  cluster_strike: 'explosion',
  melee: 'melee',
  fall: 'fall',
  fire: 'fire',
  collision: 'collision',
  bullet: 'bullet',
};

export function weaponIconKey(weaponId: string): string {
  const cause = CAUSE_ICON[weaponId];
  if (cause) return cause;
  for (const [prefix, key] of ID_PREFIX) {
    if (weaponId.startsWith(prefix)) return key;
  }
  return 'bullet';
}

const cache = new Map<string, string>();

/** Markup for a weapon-class silhouette, cached because the killfeed reuses it. */
export function weaponIcon(weaponId: string): string {
  const key = weaponIconKey(weaponId);
  const hit = cache.get(key);
  if (hit) return hit;
  const path = WEAPON_PATHS[key] ?? WEAPON_PATHS.bullet;
  const svg = `<svg viewBox="0 0 48 16" aria-hidden="true"><path d="${path}"/></svg>`;
  cache.set(key, svg);
  return svg;
}

export function headshotIcon(): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="${HEADSHOT_PATH}"/></svg>`;
}

/**
 * Cropped to the grenade's own bounds rather than sharing the 48-wide killfeed
 * box. Fitted into the ammo block's narrow slot the full box scales the body
 * down to a couple of pixels, which reads as a bullet point rather than as a
 * frag. The killfeed still gets the wide version, where the shared box is what
 * keeps a column of mixed icons aligned.
 */
export function grenadeIcon(): string {
  return `<svg viewBox="18.4 0.8 12.8 15.6" aria-hidden="true"><path d="${WEAPON_PATHS.grenade}"/></svg>`;
}

/** Off-screen marker chevron, pointing right at 0 rotation. */
export function arrowIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4l10 8-10 8 3-8z"/></svg>';
}

// ---------------------------------------------------------------------------
// Killstreaks — stroked line art at 24x24, which stays legible at tray size.
// ---------------------------------------------------------------------------

const STREAK_ICONS: Record<string, string> = {
  uav:
    '<path d="M12 5l7 9H5z"/><path d="M12 14v4"/>' +
    '<path d="M4 20a11 11 0 0 1 16 0" stroke-dasharray="2 2.4"/>',
  airstrike:
    '<path d="M2 9l9-3 5 3 6 1-6 2-5 3-9-3z"/><path d="M9 13v5"/><path d="M14 15v4"/>' +
    '<path d="M8 20l1-2 1 2"/><path d="M13 21l1-2 1 2"/>',
  cluster_strike:
    '<path d="M12 2v5"/><path d="M6 7l2 4"/><path d="M18 7l-2 4"/>' +
    '<path d="M12 9v6"/><path d="M7 13l1.6 4"/><path d="M17 13l-1.6 4"/>' +
    '<path d="M4 21h16"/>',
  chopper_gunner:
    '<path d="M3 7h18"/><path d="M12 7v3"/><path d="M7 10h9l3 3-3 3H7l-2-3z"/>' +
    '<path d="M16 13h6"/><path d="M20 11v4"/><path d="M8 16v3"/><path d="M14 16v3"/>',
  care_package:
    '<path d="M4 8a8 6 0 0 1 16 0"/><path d="M4 8l5 4"/><path d="M20 8l-5 4"/>' +
    '<path d="M12 8v4"/><path d="M8 12h8v8H8z"/><path d="M12 12v8"/>',
  default: '<path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M12 9v6"/>',
};

export function streakIcon(id: string): string {
  const body = STREAK_ICONS[id] ?? STREAK_ICONS.default;
  return (
    `<svg viewBox="0 0 24 24" aria-hidden="true">` +
    `<g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">${body}</g>` +
    '</svg>'
  );
}
