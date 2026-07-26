// Original stylized side-profile silhouettes for loadout cards and HUD.
// Hand-authored SVG paths — no real-world weapon branding reproduced.

const BODY = '#a9c3d6';
const DARK = '#5d7284';
const ACCENT = '#7fd2ff';

function svg(inner, w = 240, h = 80) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" fill="none">${inner}</svg>`;
}

const ICONS = {
  vireo: () => svg(`
    <rect x="52" y="26" width="112" height="16" fill="${BODY}"/>
    <rect x="160" y="29" width="18" height="10" fill="${DARK}"/>
    <rect x="56" y="23" width="10" height="4" fill="${DARK}"/>
    <rect x="146" y="23" width="8" height="4" fill="${DARK}"/>
    <path d="M64 42 L104 42 L98 74 L70 74 Z" fill="${BODY}"/>
    <rect x="74" y="46" width="20" height="22" fill="${DARK}" opacity="0.5"/>
    <path d="M104 42 L118 42 L114 54 L106 56 Z" fill="${DARK}"/>
    <rect x="52" y="38" width="112" height="4" fill="${DARK}" opacity="0.6"/>
  `),
  kestrel: () => svg(`
    <rect x="20" y="32" width="34" height="8" fill="${DARK}"/>
    <rect x="14" y="26" width="8" height="20" fill="${DARK}"/>
    <rect x="52" y="24" width="98" height="22" fill="${BODY}"/>
    <rect x="150" y="29" width="34" height="12" fill="${BODY}"/>
    <rect x="184" y="31" width="22" height="8" fill="${DARK}"/>
    <rect x="60" y="19" width="12" height="5" fill="${DARK}"/>
    <rect x="128" y="19" width="8" height="5" fill="${DARK}"/>
    <path d="M96 46 L116 46 L106 76 L88 76 Z" fill="${DARK}"/>
    <path d="M64 46 L82 46 L76 68 L60 68 Z" fill="${BODY}"/>
    <rect x="140" y="46" width="12" height="14" fill="${DARK}" opacity="0.7"/>
    <rect x="52" y="41" width="98" height="5" fill="${DARK}" opacity="0.5"/>
    <circle cx="146" cy="35" r="2.5" fill="${ACCENT}"/>
  `),
  ridgeline: () => svg(`
    <path d="M8 30 L34 28 L36 46 L14 48 Z" fill="${DARK}"/>
    <rect x="34" y="26" width="86" height="20" fill="${BODY}"/>
    <rect x="120" y="28" width="48" height="14" fill="${BODY}"/>
    <rect x="168" y="31" width="40" height="8" fill="${DARK}"/>
    <rect x="208" y="29" width="12" height="12" fill="${DARK}"/>
    <rect x="40" y="21" width="70" height="5" fill="${DARK}"/>
    <rect x="52" y="16" width="8" height="5" fill="${DARK}"/>
    <rect x="96" y="16" width="8" height="5" fill="${DARK}"/>
    <path d="M84 46 L104 46 L96 74 L78 74 Z" fill="${DARK}"/>
    <path d="M108 46 L124 46 L120 70 Q110 74 108 62 Z" fill="${BODY}"/>
    <path d="M56 46 L74 46 L70 60 L58 60 Z" fill="${BODY}" opacity="0.85"/>
    <rect x="128" y="42" width="30" height="6" fill="${DARK}" opacity="0.7"/>
    <circle cx="66" cy="35" r="2.5" fill="${ACCENT}"/>
  `),
  boreas: () => svg(`
    <path d="M10 28 L44 26 L46 50 L22 54 Z" fill="${BODY}"/>
    <rect x="44" y="28" width="72" height="18" fill="${BODY}"/>
    <rect x="116" y="30" width="96" height="9" fill="${DARK}"/>
    <rect x="116" y="41" width="70" height="8" fill="${BODY}"/>
    <rect x="128" y="49" width="34" height="10" fill="${DARK}"/>
    <path d="M76 46 L94 46 L86 70 L70 70 Z" fill="${DARK}"/>
    <rect x="48" y="23" width="10" height="5" fill="${DARK}"/>
    <rect x="196" y="26" width="6" height="6" fill="${DARK}"/>
    <rect x="44" y="42" width="72" height="4" fill="${DARK}" opacity="0.5"/>
  `),
  longwatch: () => svg(`
    <path d="M6 30 L40 27 L42 52 L26 56 L12 48 Z" fill="${BODY}"/>
    <rect x="40" y="28" width="92" height="17" fill="${BODY}"/>
    <rect x="132" y="31" width="86" height="7" fill="${DARK}"/>
    <rect x="218" y="29" width="12" height="11" fill="${DARK}"/>
    <rect x="66" y="14" width="52" height="11" rx="5" fill="${DARK}"/>
    <rect x="60" y="20" width="8" height="8" fill="${DARK}"/>
    <rect x="110" y="20" width="8" height="8" fill="${DARK}"/>
    <path d="M94 45 L100 58 L106 58 L102 45 Z" fill="${DARK}"/>
    <path d="M74 45 L92 45 L86 70 L68 70 Z" fill="${DARK}"/>
    <rect x="40" y="40" width="92" height="5" fill="${DARK}" opacity="0.5"/>
    <circle cx="92" cy="19" r="3" fill="${ACCENT}" opacity="0.8"/>
  `),
  talon: () => svg(`
    <path d="M30 44 Q90 18 150 34 L150 44 Z" fill="${BODY}"/>
    <path d="M150 32 L196 38 Q170 52 150 46 Z" fill="${DARK}"/>
    <rect x="146" y="30" width="8" height="20" fill="${DARK}"/>
    <path d="M30 44 L150 44 L150 48 Q80 56 30 48 Z" fill="${DARK}" opacity="0.6"/>
  `),
  flash: () => svg(`
    <rect x="96" y="22" width="44" height="46" rx="6" fill="${BODY}"/>
    <rect x="102" y="14" width="32" height="10" fill="${DARK}"/>
    <path d="M134 16 L166 8 L168 14 L138 22 Z" fill="${DARK}"/>
    <circle cx="90" cy="14" r="7" stroke="${DARK}" stroke-width="3"/>
    <rect x="104" y="32" width="28" height="4" fill="${DARK}" opacity="0.6"/>
    <rect x="104" y="42" width="28" height="4" fill="${DARK}" opacity="0.6"/>
    <text x="118" y="62" font-family="monospace" font-size="9" fill="${DARK}" text-anchor="middle">FL-2</text>
  `),
  smoke: () => svg(`
    <rect x="92" y="18" width="52" height="52" rx="4" fill="${BODY}"/>
    <rect x="98" y="10" width="40" height="9" fill="${DARK}"/>
    <circle cx="104" cy="26" r="2.5" fill="${DARK}"/>
    <circle cx="118" cy="26" r="2.5" fill="${DARK}"/>
    <circle cx="132" cy="26" r="2.5" fill="${DARK}"/>
    <rect x="98" y="36" width="40" height="12" fill="${ACCENT}" opacity="0.35"/>
    <text x="118" y="62" font-family="monospace" font-size="9" fill="${DARK}" text-anchor="middle">SG-3</text>
  `),
};

export function weaponSvg(id) {
  const f = ICONS[id];
  return f ? f() : svg(`<rect x="60" y="30" width="120" height="20" fill="${DARK}"/>`);
}
