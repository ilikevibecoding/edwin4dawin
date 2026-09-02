/**
 * Inline SVG glyphs for the HUD (no external assets). All icons use `currentColor` so they can be
 * tinted from CSS; sizes are controlled by the parent element (width/height 100%).
 */
const svg = (viewBox, body, extra = '') =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" fill="currentColor" ${extra} aria-hidden="true">${body}</svg>`;

/** M4A1-style carbine silhouette, muzzle pointing right (viewBox 128x44). */
export const RIFLE = svg(
  '0 0 128 44',
  // stock + buffer tube
  '<path d="M2 15h12l3 3v4l-3 3H2l-2-2v-6z"/>' +
    '<path d="M14 17h16v8H14z"/>' +
    '<path d="M6 25h7v8H9l-3-3z"/>' +
    // upper + lower receiver
    '<path d="M30 13h30l3 3v8l-3 4H30z"/>' +
    // rear sight / optic
    '<path d="M36 8h14l2 2v3H34v-3z"/>' +
    '<path d="M39 5h9v3h-9z"/>' +
    // pistol grip
    '<path d="M44 28h9l-2 12h-6l-3-7z"/>' +
    // magazine (slight curve)
    '<path d="M57 26h11l2 15h-9l-3-6z"/>' +
    // handguard with rail slots
    '<path d="M63 14h28v12H63z"/>' +
    '<path d="M66 10h22v3H66z"/>' +
    '<path fill-opacity=".35" d="M68 17h2v6h-2zM73 17h2v6h-2zM78 17h2v6h-2zM83 17h2v6h-2z"/>' +
    // front sight
    '<path d="M88 7h5v7h-5z"/>' +
    // barrel + muzzle device
    '<path d="M91 17h22v6H91z"/>' +
    '<path d="M112 15h12l2 2v6l-2 2h-12z"/>' +
    '<path fill-opacity=".45" d="M115 17h1v6h-1zM118 17h1v6h-1zM121 17h1v6h-1z"/>' +
    // trigger + trigger guard
    '<path d="M41 27h4l-1 4h-2z"/>' +
    '<path d="M40 27h12v1.5H40z" fill-opacity=".7"/>',
);

/** Combat knife, blade up-right (viewBox 40x40). */
export const KNIFE = svg(
  '0 0 40 40',
  '<path d="M30 3l7 7-15 15-6-2-2-6z"/>' +
    '<path d="M16 24l6 2 1 3-3 3-6-6 2-2z" fill-opacity=".85"/>' +
    '<path d="M15 27l-9 9-4-4 9-9z"/>' +
    '<path d="M10 22l8 8-2 2-8-8z" fill-opacity=".6"/>',
);

/** Skull glyph for headshot kills (viewBox 24x24). */
export const SKULL = svg(
  '0 0 24 24',
  '<path d="M12 2C6.8 2 3 5.7 3 10.3c0 2.5 1.2 4.6 3 6v3.2c0 .8.7 1.5 1.5 1.5h1V19h1.5v2h4V19H15.5v2h1c.8 0 1.5-.7 1.5-1.5v-3.2c1.8-1.4 3-3.5 3-6C21 5.7 17.2 2 12 2zm-3.3 11.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zm6.6 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM12 16.8l-1.4-2.6h2.8L12 16.8z"/>',
);

/** Soldier bust (team score icon), viewBox 24x24. */
export const SOLDIER = svg(
  '0 0 24 24',
  '<path d="M12 2.5c-2.6 0-4.4 1.9-4.4 4.4V8h8.8V6.9c0-2.5-1.8-4.4-4.4-4.4z"/>' +
    '<path d="M7.3 8.8h9.4v.9c0 2.6-2.1 4.7-4.7 4.7S7.3 12.3 7.3 9.7z"/>' +
    '<path d="M4 22c0-4.1 3-6.5 8-6.5s8 2.4 8 6.5z"/>',
);

/** Fighter jet, top-down, nose up (viewBox 40x40). */
export const JET = svg(
  '0 0 40 40',
  '<path d="M20 2l2.6 9.5 1 10.5 12.4 7v3.2L23.4 30l-.6 4.6 3.6 2.3V39l-6.4-1.4L13.6 39v-2.1l3.6-2.3-.6-4.6L4 32.2V29l12.4-7 1-10.5z"/>',
);

/** Bomb / explosion cause icon (viewBox 24x24). */
export const BOMB = svg(
  '0 0 24 24',
  '<path d="M14 3l1.6 1.6L14 6.2 12.8 5 11 6.8a7 7 0 1 1-1.8-1.8L11 3.2l1.2 1.2L14 3zM8 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>' +
    '<path d="M16 2l1.4 2.7L20 6l-2.6 1.3L16 10l-1.4-2.7L12 6l2.6-1.3z" fill-opacity=".75"/>',
);

/** Crossed pistols style "melee" fallback isn't needed; hexagon frame used by the objective marker (viewBox 40x40). */
export const HEXAGON = svg(
  '0 0 40 40',
  '<path d="M20 2l15.6 9v18L20 38 4.4 29V11z"/>',
  'preserveAspectRatio="xMidYMid meet"',
);

/** Player portrait: procedural helmeted silhouette over a gradient (viewBox 64x64). */
export const PORTRAIT = svg(
  '0 0 64 64',
  '<defs>' +
    '<linearGradient id="hudPortraitBg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#5b6d7a"/><stop offset=".55" stop-color="#2b3540"/><stop offset="1" stop-color="#151a20"/>' +
    '</linearGradient>' +
    '<linearGradient id="hudPortraitSkin" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#c79a74"/><stop offset="1" stop-color="#8a6448"/>' +
    '</linearGradient>' +
    '<linearGradient id="hudPortraitArmor" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#4a5546"/><stop offset="1" stop-color="#242a22"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="64" height="64" fill="url(#hudPortraitBg)"/>' +
    '<path d="M6 64c0-12 8-19 26-19s26 7 26 19z" fill="url(#hudPortraitArmor)"/>' +
    '<path d="M24 44h16l3 4H21z" fill="#1b1f1a"/>' +
    '<path d="M22 24c0-7 4.5-12 10-12s10 5 10 12v6c0 6-4.5 11-10 11s-10-5-10-11z" fill="url(#hudPortraitSkin)"/>' +
    '<path d="M17 25c0-10 6-17 15-17s15 7 15 17H17z" fill="#3a4234"/>' +
    '<path d="M17 25h30v3.5H17z" fill="#20261d"/>' +
    '<path d="M24 30h6v2.4h-6zM34 30h6v2.4h-6z" fill="#3b2a1e" fill-opacity=".8"/>' +
    '<rect width="64" height="64" fill="none" stroke="rgba(255,255,255,.08)"/>',
  'preserveAspectRatio="xMidYMid slice"',
);

/** Crosshair-style plus used by the [X] slot in the reference; we use it for the medic slot alt. */
export const PLUS = svg('0 0 24 24', '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>');
