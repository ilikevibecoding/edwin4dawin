/**
 * Design tokens.
 *
 * The stylesheet reads these through CSS custom properties; the canvas layers
 * read the same numbers from here, so a re-theme cannot leave the DOM and the
 * canvas disagreeing about what "accent" means.
 */

export const COLOR = {
  accent: '#d8ff4a',
  accentSoft: 'rgba(216, 255, 74, 0.55)',
  accentFaint: 'rgba(216, 255, 74, 0.16)',
  danger: '#ff3b30',
  dangerSoft: 'rgba(255, 59, 48, 0.62)',
  warn: '#ffb020',
  friendly: '#5ec8ff',
  text: '#e8edf2',
  dim: 'rgba(226, 232, 240, 0.55)',
  faint: 'rgba(226, 232, 240, 0.22)',
  ink: 'rgba(6, 8, 10, 0.86)',
  white: '#ffffff',
} as const;

/**
 * The three faces are linked from the document head, which means they come off
 * a font host. If that host is blocked — an offline machine, a locked-down
 * network — the browser falls straight through to the generic family, and every
 * numeral in the HUD is suddenly set in a full-width face. The narrow families
 * in between are the ones that actually ship with the common platforms, so the
 * degraded case is still condensed rather than a third wider.
 */
export const FONT = {
  condensed:
    "'Barlow Condensed', 'Roboto Condensed', 'Liberation Sans Narrow', 'Arial Narrow'," +
    " 'Noto Sans Condensed', 'DejaVu Sans Condensed', 'Barlow', system-ui, sans-serif",
  body: "'Barlow', 'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Mono', ui-monospace, 'DejaVu Sans Mono', monospace",
} as const;

/** Timings in seconds. Hitmarkers are deliberately outside the shared scale. */
export const TIMING = {
  hitmarkerIn: 0.06,
  hitmarkerOut: 0.18,
  damageIndicator: 1.2,
  killfeedLife: 6,
  toastLife: 4.2,
  announceDefault: 2.6,
} as const;
