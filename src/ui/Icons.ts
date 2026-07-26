/**
 * Original interface iconography, drawn as inline SVG so it stays sharp at any resolution.
 * Owner: Fable 1.
 *
 * Shape language: 2px strokes on a 24-unit grid, flat caps, one diagonal accent per glyph. The
 * weapon marks are silhouettes rather than illustrations so they stay legible at HUD size.
 */

const S = (body: string, w = 64, h = 24): string =>
  `<svg viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const WeaponIcons: Record<string, string> = {
  pistol: S(`
    <path d="M12 8h20l3 3h4v4h-5l-2 3H22l-3 6h-5l3-6h-5V8z" fill="currentColor" opacity="0.9"/>
    <path d="M18 15h10" stroke="#0b1116" stroke-width="1.4"/>
  `),
  smg: S(`
    <path d="M8 9h34l4 2v3h-6l-2 3H24l-2 5h-5l2-5h-3v-2H8z" fill="currentColor" opacity="0.9"/>
    <rect x="26" y="14" width="5" height="8" rx="1" fill="currentColor" opacity="0.7"/>
    <path d="M12 7h9v2h-9z" fill="currentColor" opacity="0.6"/>
  `),
  carbine: S(`
    <path d="M4 10h46l6 1v3h-8l-2 3H26l-2 6h-5l2-6h-6l-1-3H4z" fill="currentColor" opacity="0.9"/>
    <rect x="28" y="14" width="6" height="9" rx="1" fill="currentColor" opacity="0.7"/>
    <path d="M14 7h12v3H14z" fill="currentColor" opacity="0.6"/>
    <path d="M50 12h10v2H50z" fill="currentColor" opacity="0.55"/>
  `),
  shotgun: S(`
    <path d="M4 11h48v4H4z" fill="currentColor" opacity="0.9"/>
    <path d="M6 15h16l-4 7h-6z" fill="currentColor" opacity="0.75"/>
    <rect x="24" y="15" width="12" height="4" rx="1" fill="currentColor" opacity="0.6"/>
    <path d="M52 10h8v6h-8z" fill="currentColor" opacity="0.7"/>
  `),
  dmr: S(`
    <path d="M2 11h54l6 1v3h-9l-2 3H24l-2 6h-5l2-6h-7l-2-3H2z" fill="currentColor" opacity="0.9"/>
    <rect x="26" y="15" width="6" height="9" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="20" y="5" width="20" height="4" rx="1" fill="currentColor" opacity="0.65"/>
    <circle cx="24" cy="7" r="2.4" fill="#0b1116"/>
  `),
  knife: S(`
    <path d="M8 15l24-9 6 2-24 11z" fill="currentColor" opacity="0.9"/>
    <rect x="34" y="12" width="16" height="5" rx="2" fill="currentColor" opacity="0.75"/>
    <path d="M50 12v5" stroke="currentColor" stroke-width="2"/>
  `),
  flash: S(`
    <rect x="24" y="6" width="14" height="14" rx="3" fill="currentColor" opacity="0.85"/>
    <path d="M31 2v3M38 6l3-2M24 6l-3-2" stroke="currentColor" stroke-width="2"/>
    <path d="M31 9l-3 5h3l-1 4 4-6h-3z" fill="#0b1116"/>
  `),
  smoke: S(`
    <rect x="25" y="5" width="12" height="15" rx="2" fill="currentColor" opacity="0.85"/>
    <path d="M27 3h8v2h-8z" fill="currentColor" opacity="0.7"/>
    <path d="M42 8c3 0 3 4 0 4M44 14c3 0 3 4 0 4" stroke="currentColor" stroke-width="2" opacity="0.7"/>
  `),
};

export const UiIcons = {
  health: S(`<path d="M12 21s-8-5.2-8-11a5 5 0 0 1 8-3.6A5 5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="currentColor"/>`, 24, 24),
  armor: S(`<path d="M12 2l8 3v7c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V5z" fill="currentColor"/><path d="M12 6v11" stroke="#0b1116" stroke-width="1.6"/>`, 24, 24),
  hostage: S(`<circle cx="12" cy="6.5" r="3.5" fill="currentColor"/><path d="M5 22c0-4.4 3.1-7.5 7-7.5s7 3.1 7 7.5z" fill="currentColor"/>`, 24, 24),
  target: S(`<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2"/>`, 24, 24),
  exit: S(`<path d="M13 3H5v18h8" stroke="currentColor" stroke-width="2"/><path d="M17 8l4 4-4 4M21 12H10" stroke="currentColor" stroke-width="2"/>`, 24, 24),
  clock: S(`<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5.5l3.5 2" stroke="currentColor" stroke-width="2"/>`, 24, 24),
  star: S(`<path d="M12 2l2.7 7.1L22 11l-7.3 1.9L12 20l-2.7-7.1L2 11l7.3-1.9z" fill="currentColor"/>`, 24, 24),
};

/** The Northstar Administrative Center corporate mark; entirely original. */
export function brandMark(size = 64, color = '#49c7ff', star = '#eef3f7'): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M32 3l4.4 11.8L48 8.6l-3.8 12.2 12.6-1.4-9.6 8.4 11.4 5.6-11.4 5.6 9.6 8.4-12.6-1.4L48 58l-11.6-6.2L32 63l-4.4-11.2L16 58l3.8-12.6L7.2 46.8l9.6-8.4L5.4 32.8l11.4-5.6-9.6-8.4 12.6 1.4L16 8.6l11.6 6.2z"
      fill="${color}" opacity="0.16"/>
    <path d="M32 8l3.6 12.6L48 17l-4.6 12.4L56 32l-12.6 2.6L48 47l-12.4-3.6L32 56l-3.6-12.6L16 47l4.6-12.4L8 32l12.6-2.6L16 17l12.4 3.6z"
      fill="${star}"/>
    <circle cx="32" cy="32" r="6.4" fill="${color}"/>
    <circle cx="32" cy="32" r="2.6" fill="#0b1116"/>
  </svg>`;
}

/** Crosshair rendered as SVG so it stays pixel-crisp at any resolution scale. */
export function crosshairSvg(spreadPx: number, color = '#eef3f7', dot = true): string {
  const g = Math.max(2.5, spreadPx);
  const len = 6;
  const c = 21;
  return `<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${color}" stroke-width="1.6" shape-rendering="crispEdges" opacity="0.95">
      <line x1="${c}" y1="${c - g}" x2="${c}" y2="${c - g - len}"/>
      <line x1="${c}" y1="${c + g}" x2="${c}" y2="${c + g + len}"/>
      <line x1="${c - g}" y1="${c}" x2="${c - g - len}" y2="${c}"/>
      <line x1="${c + g}" y1="${c}" x2="${c + g + len}" y2="${c}"/>
    </g>
    <g stroke="#05080b" stroke-width="3.2" opacity="0.5" shape-rendering="crispEdges">
      <line x1="${c}" y1="${c - g}" x2="${c}" y2="${c - g - len}"/>
      <line x1="${c}" y1="${c + g}" x2="${c}" y2="${c + g + len}"/>
      <line x1="${c - g}" y1="${c}" x2="${c - g - len}" y2="${c}"/>
      <line x1="${c + g}" y1="${c}" x2="${c + g + len}" y2="${c}"/>
    </g>
    <g stroke="${color}" stroke-width="1.6" shape-rendering="crispEdges">
      <line x1="${c}" y1="${c - g}" x2="${c}" y2="${c - g - len}"/>
      <line x1="${c}" y1="${c + g}" x2="${c}" y2="${c + g + len}"/>
      <line x1="${c - g}" y1="${c}" x2="${c - g - len}" y2="${c}"/>
      <line x1="${c + g}" y1="${c}" x2="${c + g + len}" y2="${c}"/>
    </g>
    ${dot ? `<circle cx="${c}" cy="${c}" r="0.9" fill="${color}"/>` : ''}
  </svg>`;
}

export function hitMarkerSvg(lethal: boolean): string {
  const col = lethal ? '#ff4d4d' : '#eef3f7';
  return `<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${col}" stroke-width="2" stroke-linecap="round">
      <line x1="7" y1="7" x2="12" y2="12"/>
      <line x1="23" y1="7" x2="18" y2="12"/>
      <line x1="7" y1="23" x2="12" y2="18"/>
      <line x1="23" y1="23" x2="18" y2="18"/>
    </g>
  </svg>`;
}

export function damageArcSvg(): string {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M62 44a70 70 0 0 1 76 0l-9 13a54 54 0 0 0-58 0z" fill="#ff4d4d"/>
  </svg>`;
}
