/**
 * The HUD's icon set, authored as inline SVG.
 *
 * Every glyph here is geometry rather than a glyph from a font or a bitmap: the
 * game ships no binary art and fetches nothing over the network, and an icon
 * drawn as paths is exactly as sharp on a 4K display as a 720p one. They are
 * strings rather than DOM builders because an icon is written once when its row
 * is created and never touched again, so the parse cost is paid at authoring
 * time and the per-frame cost is zero.
 *
 * The drawing conventions are shared so a row of mixed icons reads as one set:
 * weapons are side profiles pointing right on a 40x14 field with the bore line
 * at y = 7, and everything else is centred on a 24x24 field. `currentColor`
 * throughout, so a killfeed row tints its own icons by inheritance.
 */

/** Weapon silhouettes, keyed by `WeaponStats.id`. */
const WEAPON_ART: Record<string, string> = {
  rifle: `
    <path d="M0 4.2h4.6v5.4H0zM4.6 4.6h11v4.4h-11zM6.2 3.1h9v1.4h-9zM15.6 5h9v3.3h-9z
             M24.6 6h10.6v1.7H24.6zM35.4 5.1h2.6v3.4h-2.6zM9.4 9h3.7l.9 4.6H8.6z
             M14.1 9h2.7l-.6 3.9h-2.7zM27 4.1h1.5v2H27z"/>`,
  smg: `
    <path d="M1 4.9h4.2v4.3H1zM5.2 4.6h11.6v4.8H5.2zM7 3.2h8.2v1.3H7zM16.8 5.9h6.8v1.9h-6.8z
             M23.6 5.1h2.6v3.5h-2.6zM9 9.4h3.5v5.1H9zM14 9.4h2.7l-.5 3.7h-2.7z
             M18.4 4.1h1.4v1.9h-1.4z"/>`,
  // The scope, the turret and the bipod are all deliberately oversized: at the
  // 32 px these are seen in a killfeed row, a marksman rifle and an assault rifle
  // are the same grey bar unless the differences are exaggerated.
  sniper: `
    <path d="M0 5.4h6.2v4.4H0zM2.2 4.2h5.2v1.4H2.2zM6.2 5.1h9v4.3h-9zM6.6 0.6h12.4v3.6H6.6z
             M11.4 0h2.4v0.8h-2.4zM8.6 4.2h1.8v1.3H8.6zM15.4 4.2h1.8v1.3h-1.8z
             M15.2 6.1h19.6v1.7H15.2zM34.6 5.2h3.6v3.4h-3.6z
             M10.2 9.2h3v3.6h-3zM13.8 9.2h2.5l-.5 3.5h-2.5z
             M22.6 8h1.3l-2.6 5.6h-1.5zM24.5 8h1.3l2.6 5.6h-1.5z"/>`,
  shotgun: `
    <path d="M0 4.9h6.4v4.6H0zM6.4 4.6h8v4.9h-8zM14.4 4.9h21.4v2.3H14.4zM14.4 7.7h17.6v2.1H14.4z
             M19.8 7.3h6.4v3.1h-6.4zM12.2 9.4h2.7l-.5 3.6h-2.7zM33 4.1h1.4v1.6H33z"/>`,
  pistol: `
    <path d="M10 4h20v3.5H10zM10 7.5h10.4v2.2H10zM10 9.7h5.6l-2.2 4.3H7.6zM20.4 9.7h6.2v1.5h-6.2z
             M28.4 3h1.6v1.2h-1.6z"/>`,
  knife: `
    <path d="M13.4 3.2 34 6.6 13.4 10.4zM1.4 5.2h12.2v3.2H1.4z"/>`,
  // A nine-point burst centred on the weapons' 40x14 field. The first version was
  // drawn on the 24x24 glyph field and rendered through the weapon viewBox, so it
  // arrived in the killfeed squashed and clipped in half.
  explosive: `
    <path d="M20 0.4 20.99 4.28 24.24 1.94 22.51 5.55 26.5 5.85 22.86 7.5 25.72 10.3
             21.86 9.22 22.26 13.2 20 9.9 17.74 13.2 18.14 9.22 14.28 10.3 17.14 7.5
             13.5 5.85 17.49 5.55 15.76 1.94 19.01 4.28z"/>`,
};

/**
 * Equipment, streaks and HUD furniture on a 24x24 field.
 *
 * Kept flat and diagrammatic rather than illustrative. At the 16–20 px these
 * are actually seen, an outline of a helicopter is four grey smudges; a rotor
 * disc with a boom under it reads instantly.
 */
const GLYPH_ART: Record<string, string> = {
  frag: `
    <path d="M10 2h4v2h-4z"/><path d="M11.2 4h1.6v2.4h-1.6z"/>
    <path d="M14 2.6h3.2v1.5h-1.7v1.7H14z"/>
    <path d="M12 5.6c3.9 0 7 3.2 7 7.2S15.9 20 12 20s-7-3.2-7-7.2 3.1-7.2 7-7.2z"/>
    <path d="M5.4 10.2h13.2v1H5.4zM5.4 14.4h13.2v1H5.4zM9 6.4h1v13.2H9zM14 6.4h1v13.2h-1z"
          fill="rgba(0,0,0,0.45)"/>`,
  flash: `
    <path d="M9 7h6v13H9zM10 4.2h4V7h-4zM10.6 2.4h2.8v1.8h-2.8z"/>
    <path d="M17.4 8.2h4.4v1.5h-4.4zM2.2 8.2h4.4v1.5H2.2zM17 12.4l4 1.8-.6 1.4-4-1.8z
             M7 12.4l-4 1.8.6 1.4 4-1.8zM17.4 5.1 21 3.2l.8 1.3-3.6 1.9zM6.6 5.1 3 3.2 2.2 4.5l3.6 1.9z"/>`,
  smoke: `
    <path d="M9 8h6v12H9zM10 5h4v3h-4z"/>
    <path d="M15.8 3.4c1.7 0 3 1.2 3 2.7 0 .4-.1.8-.3 1.1 1.2.3 2 1.3 2 2.4 0 1.4-1.3 2.6-2.9 2.6h-1.8V3.4z"
          opacity="0.62"/>
    <path d="M8.2 3.4c-1.7 0-3 1.2-3 2.7 0 .4.1.8.3 1.1-1.2.3-2 1.3-2 2.4 0 1.4 1.3 2.6 2.9 2.6h1.8V3.4z"
          opacity="0.62"/>`,
  uav: `
    <path d="M12 2.2 20.6 19l-8.6-4.4L3.4 19z"/>
    <path d="M11.2 14.6h1.6v6.8h-1.6z" opacity="0.7"/>`,
  crate: `
    <path d="M4.6 11h14.8v9.4H4.6z"/>
    <path d="M9.4 11h1.8v9.4H9.4zM12.8 11h1.8v9.4h-1.8z" fill="rgba(0,0,0,0.45)"/>
    <path d="M12 2.2c3.6 0 6.6 2.4 6.6 5.4H5.4c0-3 3-5.4 6.6-5.4z" opacity="0.75"/>
    <path d="M7 7.6 9.6 11H8L5.6 7.6zM17 7.6 14.4 11H16l2.4-3.4z" opacity="0.75"/>`,
  bomb: `
    <path d="M12 2.4c2.4 2.6 3.6 6 3.6 9.6 0 3.4-1.2 6.6-3.6 9.2-2.4-2.6-3.6-5.8-3.6-9.2 0-3.6 1.2-7 3.6-9.6z"/>
    <path d="M12 15.6 16.8 21h-2.6L12 18.6 9.8 21H7.2z"/>`,
  mortar: `
    <path d="m6.6 19.4 9.8-13.2 2.6 1.9-9.8 13.2z"/>
    <path d="M3.4 20h9.2v1.8H3.4zM6.4 14.6l3.6 2.6-1.2 1.6-3.6-2.6z"/>
    <path d="M18.2 2.2c1.4 1 1.8 2.6 1 3.8l-2.8-2c.4-1.2 1.4-1.8 1.8-1.8z"/>`,
  carpet: `
    <path d="M4.2 2.4c1.3 1.4 2 3.2 2 5.1 0 1.8-.7 3.5-2 4.9-1.3-1.4-2-3.1-2-4.9 0-1.9.7-3.7 2-5.1z"/>
    <path d="M12 5.4c1.3 1.4 2 3.2 2 5.1 0 1.8-.7 3.5-2 4.9-1.3-1.4-2-3.1-2-4.9 0-1.9.7-3.7 2-5.1z"/>
    <path d="M19.8 8.4c1.3 1.4 2 3.2 2 5.1 0 1.8-.7 3.5-2 4.9-1.3-1.4-2-3.1-2-4.9 0-1.9.7-3.7 2-5.1z"/>
    <path d="M1.6 20.4h20.8v1.6H1.6z" opacity="0.55"/>`,
  cluster: `
    <path d="M12 1.6c1.5 1.7 2.3 3.7 2.3 5.9 0 1-.2 2-.5 2.9h-3.6c-.3-.9-.5-1.9-.5-2.9 0-2.2.8-4.2 2.3-5.9z"/>
    <circle cx="5" cy="15.4" r="2.1"/><circle cx="12" cy="17.8" r="2.1"/>
    <circle cx="19" cy="15.4" r="2.1"/><circle cx="8.4" cy="12" r="1.6"/>
    <circle cx="15.6" cy="12" r="1.6"/>`,
  heli: `
    <path d="M2 4.6h20v1.7H2zM11.2 6.3h1.6v2.2h-1.6z"/>
    <path d="M7.4 8.5h7.4c2.2 0 4 1.7 4 3.9s-1.8 3.9-4 3.9H7.4c-1.5 0-2.7-1.2-2.7-2.7v-2.4c0-1.5 1.2-2.7 2.7-2.7z"/>
    <path d="M18.4 11.4h4.2v1.6h-4.2zM20.4 8.6h1.6v4.4h-1.6z"/>
    <path d="M6 16.3h1.5v3.4H6zM13.4 16.3h1.5v3.4h-1.5zM3.6 19.4h13.6v1.5H3.6z" opacity="0.7"/>`,
  napalm: `
    <path d="M12 1.8c.7 3.2 3 4.2 4.4 6.6 1.9 3.2.8 7.6-2.4 9.4.9-2.2.3-4.4-1.2-5.8.2 2.4-.9 4.2-2.8 5.4-2.6 1.6-5.6-.2-5.8-3.2-.2-2.6 1.6-4.2 2.6-6.2C8 5.4 11 4.6 12 1.8z"/>
    <path d="M2.6 20h18.8v1.7H2.6z" opacity="0.55"/>`,
  gunship: `
    <path d="M11 1.8h2v20.4h-2z"/>
    <path d="M1.4 9.4h21.2v2.6H1.4zM6.4 18h11.2v1.8H6.4z"/>
    <path d="M4.6 7.4h1.8v6.6H4.6zM17.6 7.4h1.8v6.6h-1.8z" opacity="0.75"/>`,
  reload: `
    <path d="M12 3.6a8.4 8.4 0 1 1-8.2 10.2h2.9A5.6 5.6 0 1 0 12 6.4z"/>
    <path d="M12 1.2 16.4 5 12 8.8z"/>`,
  skull: `
    <path d="M12 2.2c4.6 0 8 3.1 8 7.4 0 2.6-1 4.4-2.5 5.6v2.6h-2.6v2.4h-1.7v-2.4h-2.4v2.4H9.1v-2.4H6.5v-2.6C5 14 4 12.2 4 9.6c0-4.3 3.4-7.4 8-7.4z"/>
    <circle cx="9" cy="9.8" r="2.2" fill="rgba(0,0,0,0.6)"/>
    <circle cx="15" cy="9.8" r="2.2" fill="rgba(0,0,0,0.6)"/>
    <path d="M11.2 13h1.6v2h-1.6z" fill="rgba(0,0,0,0.6)"/>`,
  objective: `
    <path d="M12 2.4 21.6 12 12 21.6 2.4 12z"/>
    <path d="M12 7.2 16.8 12 12 16.8 7.2 12z" fill="rgba(0,0,0,0.55)"/>`,
  hostile: `<path d="M12 2.6 21.4 20H2.6z"/><path d="M12 8.4 17.4 18H6.6z" fill="rgba(0,0,0,0.5)"/>`,
  chevron: `<path d="M12 4.6 20 16h-5.4v3.4H9.4V16H4z"/>`,
  wave: `
    <path d="M2 12.6c2-4 4-6 6-6s3.4 1.6 4 4c1-3.6 3-6 5-6s3.6 2 5 6v3c-1.6-3.4-3-5-4.4-5-1.6 0-2.8 2-3.6 6h-2c-.6-3.6-1.8-5.4-3.4-5.4S4.2 11 2 15.6z"/>`,
  medal: `
    <path d="M7.4 2.2h9.2l-2.6 7H10z"/>
    <path d="M12 8.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8z"/>
    <path d="M12 11.4 13.4 14l2.8.4-2 2 .5 2.8-2.7-1.4-2.7 1.4.5-2.8-2-2 2.8-.4z" fill="rgba(0,0,0,0.5)"/>`,
};

const WEAPON_ALIAS: Record<string, string> = {
  m4a1: 'rifle',
  carbine: 'rifle',
  ar: 'rifle',
  mp5: 'smg',
  smg: 'smg',
  dmr: 'sniper',
  bolt: 'sniper',
  frag: 'explosive',
  grenade: 'explosive',
  airstrike: 'explosive',
  explosion: 'explosive',
  melee: 'knife',
  fall: 'chevron',
};

/** Inline SVG for a weapon, sized to sit on a text baseline. */
export function weaponIcon(id: string, cls = 'ic-weapon'): string {
  const key = id.toLowerCase();
  const art = WEAPON_ART[key] ?? WEAPON_ART[WEAPON_ALIAS[key] ?? ''] ?? WEAPON_ART.rifle;
  return `<svg class="${cls}" viewBox="0 0 40 14" aria-hidden="true">${art}</svg>`;
}

/** Inline SVG for anything on the 24x24 field. */
export function glyph(name: string, cls = 'ic'): string {
  const art = GLYPH_ART[name] ?? GLYPH_ART.chevron;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${art}</svg>`;
}

export function hasGlyph(name: string): boolean {
  return name in GLYPH_ART;
}

/** Which of the streak glyphs a killstreak's `icon` field maps onto. */
export function streakGlyph(icon: string): string {
  return hasGlyph(icon) ? icon : 'chevron';
}

/**
 * A progress ring as SVG, returned with its circumference so the caller can
 * drive it by writing one `stroke-dashoffset`.
 *
 * Two circles rather than one: the track has to be visible for the fill to read
 * as a fraction of something, and an arc with no track just looks like a broken
 * circle.
 */
export function ring(radius: number, stroke: number, cls = 'ring'): { html: string; circumference: number } {
  const size = (radius + stroke) * 2;
  const c = 2 * Math.PI * radius;
  const html =
    `<svg class="${cls}" viewBox="0 0 ${size} ${size}">` +
    `<circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${radius}" ` +
    `fill="none" stroke-width="${stroke}"/>` +
    `<circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${radius}" ` +
    `fill="none" stroke-width="${stroke}" stroke-linecap="butt" ` +
    `stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" ` +
    `transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  return { html, circumference: c };
}
