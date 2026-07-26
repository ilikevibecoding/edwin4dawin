// Original inline-SVG icon set (Fable 1 domain): weapon silhouettes + UI glyphs.
const NS = 'http://www.w3.org/2000/svg';

const WEAPON_PATHS = {
  // 100x36 viewBox silhouettes, original simplified profiles
  pistol: 'M18 12 h44 v7 h-6 l-2 5 h-12 l3 -5 h-13 l-5 12 h-11 l6 -14 h-4 z',
  smg: 'M8 14 h56 v6 h-8 l-2 5 h-10 l2 -5 h-14 l-3 10 h-8 l3 -10 h-6 z M64 15 h18 v4 h-18 z M20 20 l-2 9 h-6 l2 -9 z',
  carbine: 'M4 16 h12 l2 -3 h8 v3 h44 v5 h-10 l-2 4 h-9 l2 -4 h-13 l-4 11 h-8 l4 -11 h-8 l-2 3 h-8 v-4 l4 -2 z M70 17 h24 v3 h-24 z',
  shotgun: 'M6 15 l10 -4 h10 v4 h68 v5 h-40 l-4 4 h-12 l4 -4 h-16 l-6 6 h-10 l6 -8 z M56 20 h20 v4 h-20 z',
  sniper: 'M2 18 h16 l3 -3 h10 v3 h58 v4 h-12 l-2 4 h-8 l2 -4 h-20 l-3 9 h-8 l3 -9 h-14 l-4 5 h-9 l6 -7 z M40 10 h16 v4 h-16 z M44 8 h8 v2 h-8 z M89 19 h9 v2 h-9 z',
  knife: 'M10 22 l40 -10 q8 -2 14 2 l-2 3 q-6 -2 -12 0 l-38 9 z M64 12 h20 v6 h-18 z',
  flash: 'M40 6 h14 v4 h-3 v18 a4 4 0 0 1 -8 0 v-18 h-3 z M54 8 l8 -3 v4 l-6 2 z',
  smoke: 'M38 8 h16 v22 a5 5 0 0 1 -16 0 z M40 4 h12 v4 h-12 z M38 16 h16 v4 h-16 z',
};

export function weaponIcon(hudKey, color = '#cfe4f2') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 36');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', WEAPON_PATHS[hudKey] || WEAPON_PATHS.carbine);
  path.setAttribute('fill', color);
  path.setAttribute('fill-opacity', '0.9');
  svg.appendChild(path);
  return svg;
}

export function starLogo(size = 54) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'star');
  svg.style.width = size + 'px';
  svg.style.height = size + 'px';
  svg.innerHTML = `
    <circle cx="32" cy="32" r="29" fill="none" stroke="#6fc3e8" stroke-opacity="0.5" stroke-width="1.4"/>
    <circle cx="32" cy="32" r="23.5" fill="none" stroke="#6fc3e8" stroke-opacity="0.24" stroke-width="1"/>
    <path d="M32 6 L36.5 27.5 L58 32 L36.5 36.5 L32 58 L27.5 36.5 L6 32 L27.5 27.5 Z" fill="#e8f4fb"/>
    <path d="M32 14 L34.8 29.2 L50 32 L34.8 34.8 L32 50 L29.2 34.8 L14 32 L29.2 29.2 Z" fill="#6fc3e8"/>
  `;
  return svg;
}
