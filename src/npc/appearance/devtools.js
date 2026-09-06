// Dev-only hook: with ?skinsheet=1 (or =faces|species|outfits) in the game URL, mount the contact-sheet renderer
// over the page once window.game exists (polled with requestAnimationFrame like installShipTraffic in
// src/ships/traffic.js). Nothing runs unless the query parameter is present, so importing this module in the game
// costs nothing in normal play. The integrator only needs one import of src/npc/appearance/index.js somewhere.
export function installAppearanceDevTools(opts = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const which = params.get('skinsheet');
  if (!which || which === '0') return false;
  const kind = which === '1' || which === 'true' ? 'faces' : which;
  const tryMount = () => {
    if (!window.game && !opts.immediate) { requestAnimationFrame(tryMount); return; }
    if (window.__appearanceSheet) return;
    window.__appearanceSheet = 'mounting';
    import('./sheet.js').then((m) => m.mountSheetOverlay(kind, opts)).then((el) => { window.__appearanceSheet = el || 'mounted'; }).catch((e) => { console.error('[appearance] sheet mount failed', e); window.__appearanceSheet = null; });
  };
  if (typeof requestAnimationFrame === 'function') tryMount(); else setTimeout(tryMount, 0);
  return true;
}
if (typeof window !== 'undefined') installAppearanceDevTools();
