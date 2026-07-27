/**
 * Fonts.ts — the HUD's typographic foundation.
 *
 * The game ships no font files and may run fully offline, so we deliberately
 * do NOT depend on Google Fonts or any network face. Instead we build a robust
 * stack of *locally installed* faces:
 *
 *   • DISPLAY — a condensed/narrow technical grotesque for labels and headings.
 *     Real target machines usually carry one of the leading condensed faces
 *     (Roboto Condensed / Oswald / DIN / Arial Narrow); when none is present
 *     (e.g. headless Chrome, which only has Inter / Liberation / DejaVu) the
 *     stack lands on Inter — a clean technical grotesque — and we synthesise
 *     the *condensed* proportions with a horizontal `scaleX()` plus tight
 *     tracking (see `.hud-cond` in hud.css.ts). This guarantees the HUD reads
 *     as narrow, spaced and military regardless of which face actually wins.
 *
 *   • MONO — a tabular monospace for counters, ammo, coordinates and stats so
 *     digits never jitter as values change. Cascadia / JetBrains / DejaVu Mono
 *     are all tabular by construction.
 *
 * Nothing here touches index.html; the stacks are consumed by hud.css.ts.
 */

/** Narrow/condensed technical grotesque, widest-possible fallback chain. */
export const FONT_DISPLAY = [
  '"Roboto Condensed"',
  '"Saira Condensed"',
  '"Barlow Condensed"',
  '"Oswald"',
  '"DIN Alternate"',
  '"DIN Condensed"',
  '"Arial Narrow"',
  '"Inter"',
  '"Liberation Sans"',
  '"Arimo"',
  '"Segoe UI"',
  'system-ui',
  'sans-serif',
].join(',');

/** Tabular monospace for numerals, ammo counts and coordinates. */
export const FONT_MONO = [
  '"Cascadia Mono"',
  '"JetBrains Mono"',
  '"Roboto Mono"',
  '"DejaVu Sans Mono"',
  '"Liberation Mono"',
  '"Cousine"',
  '"Consolas"',
  'ui-monospace',
  'monospace',
].join(',');

/**
 * Horizontal squeeze applied to display text to synthesise a condensed face
 * when only a normal-width fallback resolves. Chosen so Inter/Liberation read
 * convincingly narrow without looking crushed.
 */
export const CONDENSE_X = 0.82;

/** CSS custom-property names the rest of the HUD references. */
export const FONT_VARS = {
  display: '--hud-font-display',
  mono: '--hud-font-mono',
  condense: '--hud-condense',
} as const;

/** The `:root`-level declarations that publish the stacks as CSS variables. */
export function fontRootVars(): string {
  return `
    ${FONT_VARS.display}: ${FONT_DISPLAY};
    ${FONT_VARS.mono}: ${FONT_MONO};
    ${FONT_VARS.condense}: ${CONDENSE_X};
  `;
}
