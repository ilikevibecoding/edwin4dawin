/**
 * Tiny inline-SVG glyph set for the HUD/menus. All silhouettes are hand-built
 * polygons tuned to read at 12–24px. Usage: icons.rifle(width, cssClass).
 */

const svg = (vb, inner) => (w, cls = '', h = null) =>
  `<svg class="${cls}" width="${w}" height="${h ?? Math.round(w * vbRatio(vb))}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const vbRatio = (vb) => {
  const [, , w, h] = vb.split(' ').map(Number);
  return h / w;
};

export const icons = {
  /** M4-style carbine, side profile, pointing right. */
  rifle: svg('0 0 52 18', `
    <path d="M2 6.5 L11 6.5 L11 10.5 L8.5 12.5 L3.5 12.5 L2 10.5 Z"/>
    <rect x="11" y="5.5" width="17" height="5"/>
    <rect x="14" y="3.5" width="2.5" height="2"/>
    <rect x="21" y="3.5" width="2.5" height="2"/>
    <path d="M18 10.5 L23.5 10.5 L22.5 16 L18.5 16 Z"/>
    <path d="M13 10.5 L16.5 10.5 L15.5 14 L13 14 Z" opacity=".85"/>
    <rect x="28" y="6" width="12" height="3.4"/>
    <rect x="40" y="6.8" width="9" height="1.9"/>
    <rect x="40.5" y="4.2" width="1.6" height="2.6"/>
    <rect x="30" y="9.4" width="6" height="1.6" opacity=".85"/>
  `),

  /** 1911 pistol, side profile, pointing right. */
  pistol: svg('0 0 30 20', `
    <rect x="3" y="4.5" width="24" height="4.6"/>
    <rect x="24.4" y="2.8" width="1.6" height="1.7"/>
    <path d="M5.5 9.1 L13.5 9.1 L12 17.5 L5.5 17.5 Z"/>
    <path d="M13.5 9.1 L16.5 9.1 L16 12.5 L14.5 13.5 L13.2 11.2 Z" opacity=".85"/>
  `),

  /** M67 frag grenade: round body, fuze cap, spoon lever hugging the side, pin ring. */
  frag: svg('0 0 20 24', `
    <circle cx="5.9" cy="4.3" r="1.8" fill="none" stroke-width="1.3" stroke="currentColor"/>
    <rect x="7.9" y="2.9" width="3.9" height="2.6" rx="0.5"/>
    <rect x="8.7" y="5.3" width="2.3" height="1.9"/>
    <path d="M11.4 3.1 C14.3 4.6 16.1 7.9 16.1 11.9 C16.1 13.1 15.9 14.2 15.6 15.2 L14.2 14.5 C14.5 13.6 14.7 12.7 14.7 11.8 C14.7 8.5 13.3 5.8 11 4.5 Z"/>
    <path d="M9.8 7 C13.4 7 15.7 9.8 15.7 13.9 C15.7 18 13.4 21 9.8 21 C6.2 21 3.9 18 3.9 13.9 C3.9 9.8 6.2 7 9.8 7 Z"/>
  `),

  /** Fast jet, top-down, nose up. */
  jet: svg('0 0 24 24', `
    <path d="M12 1.6 L13.6 6.2 L13.9 10 L21.4 14.3 L21.4 16.2 L14 14.2 L13.8 17.6 L16.2 19.6 L16.2 21.2 L12 20 L7.8 21.2 L7.8 19.6 L10.2 17.6 L10 14.2 L2.6 16.2 L2.6 14.3 L10.1 10 L10.4 6.2 Z"/>
  `),

  /** UAV / recon drone, top-down. */
  uav: svg('0 0 24 24', `
    <path d="M11.1 3 L12.9 3 L13.3 9.2 L22 10.4 L22 12.2 L13.3 12.4 L13 17.4 L16.4 18.6 L16.4 20.2 L12 19.4 L7.6 20.2 L7.6 18.6 L11 17.4 L10.7 12.4 L2 12.2 L2 10.4 L10.7 9.2 Z"/>
  `),

  /** Attack helicopter, top-down (killstreak slot). */
  heli: svg('0 0 24 24', `
    <g transform="rotate(45 12 10.5)"><rect x="11.45" y="1.2" width="1.1" height="18.6"/></g>
    <g transform="rotate(-45 12 10.5)"><rect x="11.45" y="1.2" width="1.1" height="18.6"/></g>
    <ellipse cx="12" cy="10.5" rx="2.7" ry="4.6"/>
    <rect x="6.7" y="9.9" width="10.6" height="1.4"/>
    <rect x="11.3" y="14.6" width="1.4" height="5.8"/>
    <rect x="9.2" y="19.8" width="5.6" height="1.2"/>
  `),

  /** Skull (headshot marker). */
  skull: svg('0 0 20 20', `
    <path fill-rule="evenodd" d="M10 1.8 C5.9 1.8 3 4.9 3 8.8 C3 11.2 4.2 12.9 5.8 13.9 L5.8 17 L8 17 L8 15 L9.2 15 L9.2 17 L10.8 17 L10.8 15 L12 15 L12 17 L14.2 17 L14.2 13.9 C15.8 12.9 17 11.2 17 8.8 C17 4.9 14.1 1.8 10 1.8 Z M7.2 10.6 C6.2 10.6 5.4 9.8 5.4 8.8 C5.4 7.8 6.2 7 7.2 7 C8.2 7 9 7.8 9 8.8 C9 9.8 8.2 10.6 7.2 10.6 Z M12.8 10.6 C11.8 10.6 11 9.8 11 8.8 C11 7.8 11.8 7 12.8 7 C13.8 7 14.6 7.8 14.6 8.8 C14.6 9.8 13.8 10.6 12.8 10.6 Z"/>
  `),

  /** Padlock (locked killstreak slot). */
  lock: svg('0 0 12 14', `
    <path fill-rule="evenodd" d="M6 1 C4 1 2.7 2.5 2.7 4.4 L2.7 6 L1.6 6 L1.6 13 L10.4 13 L10.4 6 L9.3 6 L9.3 4.4 C9.3 2.5 8 1 6 1 Z M6 2.6 C7.1 2.6 7.8 3.4 7.8 4.5 L7.8 6 L4.2 6 L4.2 4.5 C4.2 3.4 4.9 2.6 6 2.6 Z"/>
  `),

  /** Stance: standing. */
  stand: svg('0 0 16 24', `
    <circle cx="8" cy="3.4" r="2.4"/>
    <path d="M5.9 6.8 L10.1 6.8 L11 14 L9.4 14 L10.4 21.5 L8.6 21.5 L8 16.4 L7.4 21.5 L5.6 21.5 L6.6 14 L5 14 Z"/>
  `),

  /** Stance: crouched. */
  crouch: svg('0 0 22 24', `
    <circle cx="14.4" cy="7.2" r="2.4"/>
    <path d="M12.2 10.4 L16.4 10.6 L16 15.4 L10 15.8 L13.6 18.4 L12.8 21.4 L7.4 18.8 L5.2 21.6 L3 20.4 L6.2 15.2 L11.4 13.6 Z"/>
  `),

  /** Stance: sliding. */
  slide: svg('0 0 26 24', `
    <circle cx="20.8" cy="10.4" r="2.4"/>
    <path d="M17.6 13.2 L21.6 14.6 L20.4 19.2 L14 19.4 L8.4 21.6 L2.4 21.6 L2.8 19.4 L7.6 18.6 L12.8 15.6 Z"/>
  `),
};
