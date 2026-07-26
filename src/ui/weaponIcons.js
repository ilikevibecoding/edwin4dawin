// Original stylized side-profile silhouettes for loadout cards and the HUD
// ammo block. Hand-authored SVG — flat two-tone shapes plus a single ice
// focal dot (optic/LED), per the visual bible icon grammar (§6). Muzzle
// always points right. No real-world weapon branding reproduced.

const BODY = '#a9c3d6';
const DARK = '#5d7284';
const ACCENT = '#7fd2ff';

function svg(inner, w = 240, h = 80) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${inner}</svg>`;
}

// picatinny-style rail teeth
function teeth(x, y, count, step = 6, w = 3.4, h = 3, fill = DARK) {
  let out = '';
  for (let i = 0; i < count; i++) out += `<rect x="${x + i * step}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  return out;
}
// grip stippling dots
function stipple(x, y, cols, rows, step = 4.6, fill = DARK) {
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    out += `<circle cx="${x + c * step + (r % 2) * step * 0.5}" cy="${y + r * step}" r="1" fill="${fill}" opacity="0.55"/>`;
  }
  return out;
}

const ICONS = {
  // P-11 Vireo — compact service pistol
  vireo: () => svg(`
    <!-- slide -->
    <path d="M52 26 h116 l6 4 v8 h-122 Z" fill="${BODY}"/>
    ${teeth(140, 27.5, 5, 4.6, 2.2, 10)}
    <!-- sights -->
    <rect x="57" y="21.5" width="4" height="5" fill="${DARK}"/>
    <rect x="160" y="22" width="3.4" height="4.5" fill="${DARK}"/>
    <!-- muzzle + recessed crown -->
    <rect x="168" y="29" width="8" height="7" fill="${DARK}"/>
    <!-- frame + dust-cover rail -->
    <rect x="52" y="38" width="98" height="6" fill="${DARK}" opacity="0.85"/>
    ${teeth(112, 44, 5, 5.4, 3, 2.6)}
    <!-- trigger guard -->
    <path d="M96 44 h22 v4 h-12 q-10 8 -14 2 Z" fill="${DARK}"/>
    <path d="M104 46 q2 6 8 5" stroke="${DARK}" stroke-width="2.6"/>
    <!-- grip -->
    <path d="M62 44 L96 44 L92 72 Q76 76 68 72 Z" fill="${BODY}"/>
    ${stipple(70, 51, 4, 4)}
    <!-- mag base -->
    <rect x="68" y="71" width="22" height="4.5" fill="${DARK}"/>
    <!-- slide detail line + ejection port -->
    <rect x="52" y="34" width="116" height="1.6" fill="${DARK}" opacity="0.5"/>
    <rect x="118" y="28" width="14" height="5.5" fill="${DARK}" opacity="0.6"/>
  `),

  // VX-7 Kestrel — high-cyclic SMG, folded stock, red dot
  kestrel: () => svg(`
    <!-- folded wire stock -->
    <rect x="14" y="27" width="7" height="19" fill="${DARK}"/>
    <rect x="20" y="29" width="34" height="4.5" fill="${DARK}"/>
    <rect x="20" y="40" width="30" height="4" fill="${DARK}" opacity="0.8"/>
    <!-- receiver -->
    <path d="M52 24 h100 l4 4 v18 h-104 Z" fill="${BODY}"/>
    <!-- top rail -->
    <rect x="54" y="20.5" width="88" height="3.5" fill="${DARK}"/>
    ${teeth(57, 17.6, 13, 6.4, 3.6, 3)}
    <!-- compact optic with ice dot -->
    <path d="M96 8 h22 v9 h-22 Z" fill="${DARK}"/>
    <rect x="99" y="10" width="6" height="5" fill="${ACCENT}" opacity="0.9"/>
    <rect x="100" y="17" width="13" height="3.4" fill="${DARK}"/>
    <!-- charging handle -->
    <rect x="60" y="26.5" width="12" height="3.4" fill="${DARK}"/>
    <!-- handguard + short barrel + can -->
    <rect x="152" y="28" width="30" height="12" fill="${BODY}"/>
    <rect x="158" y="31" width="4" height="6" fill="${DARK}" opacity="0.5"/>
    <rect x="167" y="31" width="4" height="6" fill="${DARK}" opacity="0.5"/>
    <rect x="182" y="30" width="24" height="8.5" fill="${DARK}"/>
    <rect x="203" y="31.5" width="5" height="6" fill="${BODY}" opacity="0.5"/>
    <!-- ejection port + serial plate -->
    <rect x="120" y="28" width="16" height="7" fill="${DARK}" opacity="0.6"/>
    <rect x="58" y="41" width="90" height="2" fill="${DARK}" opacity="0.5"/>
    <!-- pistol grip -->
    <path d="M96 46 L116 46 L108 74 L90 74 Z" fill="${DARK}"/>
    ${stipple(97, 53, 3, 4, 4.4, BODY)}
    <!-- curved magazine -->
    <path d="M124 46 L146 46 Q146 62 136 70 L124 66 Q120 56 124 46 Z" fill="${BODY}"/>
    <path d="M126 50 Q124 58 128 64" stroke="${DARK}" stroke-width="1.6"/>
    <!-- trigger + guard -->
    <path d="M116 46 q4 8 10 6" stroke="${DARK}" stroke-width="2.6"/>
  `),

  // HC-4 Ridgeline — 5.56 carbine, the balanced workhorse
  ridgeline: () => svg(`
    <!-- stock with cheek riser -->
    <path d="M8 28 L34 27 L36 47 L20 49 L12 44 Z" fill="${DARK}"/>
    <rect x="10" y="33" width="20" height="3" fill="${BODY}" opacity="0.4"/>
    <path d="M34 30 h8 v14 h-8 Z" fill="${DARK}" opacity="0.7"/>
    <!-- upper/lower receiver -->
    <path d="M42 26 h80 l2 2 v18 h-82 Z" fill="${BODY}"/>
    <!-- full-length top rail -->
    <rect x="44" y="21.8" width="122" height="3.6" fill="${DARK}"/>
    ${teeth(47, 18.8, 18, 6.6, 3.6, 3)}
    <!-- rear + front sight posts -->
    <path d="M56 12 h7 v10 h-7 Z" fill="${DARK}"/>
    <rect x="58" y="8.5" width="3" height="5" fill="${DARK}"/>
    <path d="M156 13 h6 v9 h-6 Z" fill="${DARK}"/>
    <rect x="158" y="9.5" width="2.4" height="5" fill="${DARK}"/>
    <!-- optic (ice lens) -->
    <path d="M92 9 h26 v11 h-26 Z" fill="${DARK}"/>
    <rect x="95" y="11.5" width="7" height="6" fill="${ACCENT}" opacity="0.9"/>
    <!-- handguard with slots -->
    <rect x="122" y="27" width="46" height="15" fill="${BODY}"/>
    <rect x="127" y="32" width="8" height="4.5" rx="2" fill="${DARK}" opacity="0.6"/>
    <rect x="139" y="32" width="8" height="4.5" rx="2" fill="${DARK}" opacity="0.6"/>
    <rect x="151" y="32" width="8" height="4.5" rx="2" fill="${DARK}" opacity="0.6"/>
    <!-- barrel + flash hider -->
    <rect x="168" y="31" width="34" height="6.5" fill="${DARK}"/>
    <path d="M202 28.5 h13 v11 h-13 Z" fill="${DARK}"/>
    <rect x="205" y="26.5" width="2.6" height="15" fill="${DARK}"/>
    <rect x="210" y="26.5" width="2.6" height="15" fill="${DARK}"/>
    <!-- ejection port + controls -->
    <rect x="98" y="29" width="16" height="8" fill="${DARK}" opacity="0.6"/>
    <circle cx="90" cy="33" r="2.4" fill="${DARK}"/>
    <rect x="44" y="42" width="78" height="2" fill="${DARK}" opacity="0.5"/>
    <!-- grip -->
    <path d="M82 46 L102 46 L94 73 L76 73 Z" fill="${DARK}"/>
    ${stipple(83, 53, 3, 4, 4.4, BODY)}
    <!-- magazine, slight curve -->
    <path d="M106 46 L128 46 Q128 60 120 68 L106 64 Q103 54 106 46 Z" fill="${BODY}"/>
    <path d="M109 50 Q107 57 111 62" stroke="${DARK}" stroke-width="1.6"/>
    <!-- trigger -->
    <path d="M102 46 q4 8 10 6" stroke="${DARK}" stroke-width="2.6"/>
  `),

  // B-12 Boreas — pump 12-gauge
  boreas: () => svg(`
    <!-- shoulder stock -->
    <path d="M8 27 L44 25 L46 49 L24 53 L12 45 Z" fill="${BODY}"/>
    <path d="M12 31 L40 29" stroke="${DARK}" stroke-width="1.6" opacity="0.6"/>
    <path d="M13 38 L41 36" stroke="${DARK}" stroke-width="1.6" opacity="0.6"/>
    <!-- receiver -->
    <path d="M44 26 h74 v20 h-74 Z" fill="${BODY}"/>
    <rect x="44" y="41" width="74" height="2" fill="${DARK}" opacity="0.5"/>
    <!-- bead + rear notch -->
    <rect x="48" y="21.5" width="8" height="4.5" fill="${DARK}"/>
    <circle cx="206" cy="26" r="2.4" fill="${DARK}"/>
    <!-- ejection port -->
    <rect x="86" y="29" width="20" height="9" fill="${DARK}" opacity="0.6"/>
    <!-- barrel over mag tube -->
    <rect x="118" y="28" width="94" height="7" fill="${DARK}"/>
    <rect x="118" y="37" width="72" height="6.5" fill="${BODY}"/>
    <rect x="188" y="38" width="6" height="5" fill="${DARK}"/>
    <!-- pump handle with serrations -->
    <path d="M128 45 h36 v11 h-36 Z" fill="${DARK}"/>
    <rect x="132" y="47.5" width="2.6" height="6" fill="${BODY}" opacity="0.5"/>
    <rect x="139" y="47.5" width="2.6" height="6" fill="${BODY}" opacity="0.5"/>
    <rect x="146" y="47.5" width="2.6" height="6" fill="${BODY}" opacity="0.5"/>
    <rect x="153" y="47.5" width="2.6" height="6" fill="${BODY}" opacity="0.5"/>
    <!-- grip + trigger -->
    <path d="M74 46 L94 46 L86 70 L68 70 Z" fill="${DARK}"/>
    <path d="M94 46 q4 7 9 5" stroke="${DARK}" stroke-width="2.6"/>
    <!-- shell carrier on receiver -->
    <rect x="52" y="30" width="26" height="8" fill="${DARK}" opacity="0.35"/>
    <rect x="54" y="31.5" width="5" height="5" fill="${DARK}"/>
    <rect x="61" y="31.5" width="5" height="5" fill="${DARK}"/>
    <rect x="68" y="31.5" width="5" height="5" fill="${DARK}"/>
  `),

  // LR-8 Longwatch — bolt-action precision rifle
  longwatch: () => svg(`
    <!-- precision stock with thumbhole + cheek riser -->
    <path d="M6 29 L40 26 L42 52 L28 57 L10 48 Z" fill="${BODY}"/>
    <path d="M14 39 q7 -6 16 -3 l-2 8 q-8 3 -14 -1 Z" fill="${DARK}" opacity="0.55"/>
    <rect x="12" y="30.5" width="24" height="3.4" fill="${DARK}" opacity="0.6"/>
    <!-- receiver -->
    <path d="M40 27 h94 v18 h-94 Z" fill="${BODY}"/>
    <rect x="40" y="40" width="94" height="2" fill="${DARK}" opacity="0.5"/>
    <!-- bolt handle, lifted -->
    <path d="M96 44 L102 57 L108 57 L103 44 Z" fill="${DARK}"/>
    <circle cx="106" cy="58" r="3.4" fill="${DARK}"/>
    <!-- scope on rings, sunshade + ice objective -->
    ${teeth(52, 23.4, 12, 6.4, 3.6, 3)}
    <rect x="66" y="19" width="5" height="7" fill="${DARK}"/>
    <rect x="106" y="19" width="5" height="7" fill="${DARK}"/>
    <rect x="60" y="9" width="58" height="11.5" rx="5.5" fill="${DARK}"/>
    <rect x="116" y="11" width="10" height="7.5" fill="${DARK}"/>
    <rect x="54" y="10.5" width="7" height="8.5" fill="${DARK}"/>
    <circle cx="122" cy="14.8" r="2.6" fill="${ACCENT}" opacity="0.9"/>
    <rect x="84" y="6" width="4" height="4" fill="${DARK}"/>
    <!-- magazine -->
    <path d="M74 45 h18 l-3 12 h-13 Z" fill="${DARK}"/>
    <!-- grip + trigger -->
    <path d="M52 45 L70 45 L64 68 L48 66 Z" fill="${DARK}"/>
    <path d="M70 45 q3 7 8 5" stroke="${DARK}" stroke-width="2.4"/>
    <!-- free-float barrel + brake -->
    <rect x="134" y="30" width="76" height="6.5" fill="${DARK}"/>
    <path d="M210 27.5 h14 v11.5 h-14 Z" fill="${DARK}"/>
    <rect x="213" y="25.5" width="2.6" height="15.5" fill="${DARK}"/>
    <rect x="218" y="25.5" width="2.6" height="15.5" fill="${DARK}"/>
    <!-- bipod stub, folded -->
    <path d="M146 36 l16 7 h-5 l-14 -5 Z" fill="${DARK}" opacity="0.8"/>
  `),

  // Talon field knife
  talon: () => svg(`
    <!-- blade with clip point + edge highlight -->
    <path d="M34 42 Q92 20 148 32 L148 43 Z" fill="${BODY}"/>
    <path d="M34 42 L148 43 L148 47 Q84 54 34 46 Z" fill="#dcebf5" opacity="0.85"/>
    <!-- fuller groove -->
    <path d="M52 39 Q96 28 138 35" stroke="${DARK}" stroke-width="2" opacity="0.6"/>
    <!-- crossguard -->
    <rect x="146" y="27" width="7" height="24" fill="${DARK}"/>
    <!-- handle with wrap + lanyard hole -->
    <path d="M153 31 L196 36 Q198 42 194 47 L153 48 Z" fill="${DARK}"/>
    <path d="M160 31.8 l-3 15.8 M170 33 l-3 14.6 M180 34 l-3 13.6" stroke="${BODY}" stroke-width="1.6" opacity="0.5"/>
    <circle cx="191" cy="41.5" r="2.2" fill="none" stroke="${BODY}" stroke-width="1.4"/>
  `),

  // FL-2 Dazzle — photonic charge
  flash: () => svg(`
    <!-- body -->
    <rect x="96" y="24" width="44" height="44" rx="5" fill="${BODY}"/>
    <!-- fuze head + safety lever -->
    <rect x="102" y="15" width="32" height="10" fill="${DARK}"/>
    <rect x="112" y="10" width="12" height="6" fill="${DARK}"/>
    <path d="M134 17 L168 9 L170 15 L138 23 Z" fill="${DARK}"/>
    <!-- pull ring -->
    <circle cx="90" cy="14" r="7" stroke="${DARK}" stroke-width="3"/>
    <circle cx="97" cy="19" r="1.8" fill="${DARK}"/>
    <!-- emitter ports -->
    <circle cx="107" cy="35" r="2.6" fill="${DARK}"/>
    <circle cx="118" cy="35" r="2.6" fill="${DARK}"/>
    <circle cx="129" cy="35" r="2.6" fill="${DARK}"/>
    <!-- hazard band + label -->
    <rect x="100" y="42" width="36" height="7" fill="${ACCENT}" opacity="0.4"/>
    <rect x="100" y="52" width="36" height="1.6" fill="${DARK}" opacity="0.6"/>
    <text x="118" y="63" font-family="monospace" font-size="9" fill="${DARK}" text-anchor="middle">FL-2</text>
  `),

  // SG-3 Veil — cold-burn smoke
  smoke: () => svg(`
    <!-- canister -->
    <rect x="92" y="20" width="52" height="50" rx="4" fill="${BODY}"/>
    <!-- top cap + emission holes -->
    <rect x="98" y="12" width="40" height="9" fill="${DARK}"/>
    <circle cx="104" cy="28" r="2.5" fill="${DARK}"/>
    <circle cx="118" cy="28" r="2.5" fill="${DARK}"/>
    <circle cx="132" cy="28" r="2.5" fill="${DARK}"/>
    <!-- lever + ring -->
    <path d="M138 14 L164 7 L166 13 L142 20 Z" fill="${DARK}"/>
    <circle cx="86" cy="12" r="6" stroke="${DARK}" stroke-width="3"/>
    <!-- ID band -->
    <rect x="96" y="38" width="44" height="11" fill="${ACCENT}" opacity="0.35"/>
    <rect x="96" y="52" width="44" height="1.6" fill="${DARK}" opacity="0.6"/>
    <!-- crimp lines -->
    <rect x="92" y="64" width="52" height="2" fill="${DARK}" opacity="0.5"/>
    <text x="118" y="62" font-family="monospace" font-size="9" fill="${DARK}" text-anchor="middle">SG-3</text>
  `),
};

export function weaponSvg(id) {
  const f = ICONS[id];
  return f ? f() : svg(`<rect x="60" y="30" width="120" height="20" fill="${DARK}"/>`);
}
