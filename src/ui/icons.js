// Original inline-SVG icon set (Fable 1 domain): title logotype, star/compass emblem,
// weapon side-profiles, difficulty insignia and small UI glyphs. Everything is original
// vector art authored for Northstar Rescue; resolution independent per the visual bible.
const NS = 'http://www.w3.org/2000/svg';

function svgEl(viewBox, cls) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  if (cls) svg.setAttribute('class', cls);
  return svg;
}

/* ------------------------------------------------------------------ weapons
 * 140x48 viewBox, muzzle pointing right, centreline ~y22.
 * Layers per weapon: body (light silhouette), dark (internal cuts/detail),
 * line (hairline accents). Authored as convincing side profiles of the eight
 * original weapons.
 */
const WEAPON_ART = {
  // Karst P9 — compact striker-fired service pistol
  pistol: {
    body: [
      // slide with muzzle chamfer + sights
      'M34 12.5 h70 l5 2.6 v6.4 h-75 z',
      'M36.5 9.8 h5 v2.7 h-5 z', 'M99 9.8 h3.6 v2.7 h-3.6 z',
      // frame, accessory rail, trigger guard, grip with beavertail
      'M36 21.5 h73 v3.4 h-27 l-1.6 1.4 h-6 l-1.4 -1.4 h-6.6 l-2.2 8.2 q-0.6 2 1 2 h5.4 l-1.8 3 h-8 q-4 0 -3.2 -3.8 l1.9 -9.4 h-8.5 l-4.6 17.4 q-0.5 2.2 -2.7 2.2 h-11.5 q-2.3 0 -1.8 -2.3 l4.6 -19.2 q-1.6 -0.6 -1 -2.5 z',
    ],
    dark: [
      // slide serrations (rear), ejection port, muzzle
      'M40 13.8 h1.6 v6 h-1.6 z', 'M43.6 13.8 h1.6 v6 h-1.6 z', 'M47.2 13.8 h1.6 v6 h-1.6 z', 'M50.8 13.8 h1.6 v6 h-1.6 z',
      'M74 13.6 h12 v4.2 h-12 z',
      'M105.5 16 h3 v3 h-3 z',
      // grip texture
      'M33 30 l8 0 -0.7 2.6 -8 0 z', 'M31.7 35 l8 0 -0.7 2.6 -8 0 z',
    ],
    line: ['M36 24.9 h27'],
  },

  // Boreal K5 — compact SMG, folding stock, suppressed-profile barrel shroud
  smg: {
    body: [
      // folded-out wire stock
      'M8 14.5 h4 v15 h-4 z M12 16 h18 v2.6 h-18 z M12 25 h18 v2.6 h-18 z',
      // receiver
      'M30 13.5 h66 q2.5 0 2.5 2.5 v8.5 q0 2 -2 2 h-66.5 z',
      // barrel shroud + muzzle
      'M96 15.5 h20 v6.5 h-20 z', 'M116 16.5 h6 v4.5 h-6 z',
      // front sight + rear sight
      'M104 10.5 h3 v5 h-3 z', 'M36 10.5 h4 v3 h-4 z',
      // pistol grip (rear of trigger), sloped back
      'M56 26.5 h11 l-3.4 13.5 q-0.4 1.8 -2.3 1.8 h-8 q-1.9 0 -1.5 -1.9 l3 -11.6 q0.4 -1.8 1.2 -1.8 z',
      // magazine, slight forward curve
      'M74 26.5 h11 l-1.6 14 q-0.2 1.9 -2.1 1.9 h-7.6 q-1.9 0 -1.8 -1.9 z',
      // squared trigger guard
      'M66.5 26.5 v6.8 h10 v-2.4 h-7.2 v-4.4 z',
    ],
    dark: [
      // shroud vents
      'M99 17.5 h2.6 v2.6 h-2.6 z', 'M104 17.5 h2.6 v2.6 h-2.6 z', 'M109 17.5 h2.6 v2.6 h-2.6 z',
      // ejection port + charging slot
      'M62 15.5 h10 v3.4 h-10 z', 'M38 15.2 h16 v1.8 h-16 z',
      // mag ribs
      'M76.4 31 h7 v1.6 h-7 z', 'M75.9 35.5 h7 v1.6 h-7 z',
    ],
    line: ['M30 24.6 h66'],
  },

  // Halcyon HC-4 — modern modular carbine
  carbine: {
    body: [
      // buttpad + telescoping stock with cheek riser
      'M4 13.5 h4.5 v16 h-4.5 z', 'M8.5 15 h14 l3 -1.5 v13 l-3 -1.5 h-14 z',
      // buffer tube
      'M25.5 17 h11 v6 h-11 z',
      // receiver (upper+lower)
      'M36.5 13 h42 v11.5 h-42 z',
      // top rail with notches drawn dark
      'M36.5 11 h72 v2.6 h-72 z',
      // rear iron sight + front gas block sight
      'M40 7.6 h5.5 v3.4 h-5.5 z', 'M100 7.6 h3.4 v3.4 h-3.4 z',
      // pistol grip
      'M54 24.5 h10 l-3.6 13.2 q-0.5 1.8 -2.4 1.8 h-6.2 q-2 0 -1.5 -1.9 l2.6 -10.3 q0.7 -2.8 1.1 -2.8 z',
      // trigger guard
      'M64 24.5 h10 v2 h-2 l-1.6 5.4 h-2.8 l1.4 -5.4 h-5 z',
      // curved magazine
      'M66 24.5 l12 0 -1 6 q-0.4 2.4 -1.2 4.8 l-1 3 q-0.6 1.9 -2.5 1.9 l-6.6 -1.4 q-1.9 -0.5 -1.5 -2.3 l1.4 -6 q0.6 -2.8 0.8 -6 z',
      // handguard
      'M78.5 13.6 h30 v10 h-30 z',
      // barrel + muzzle device
      'M108.5 17.5 h14 v4.4 h-14 z', 'M122.5 16 h9 q1.5 0 1.5 1.5 v4.8 q0 1.5 -1.5 1.5 h-9 z',
    ],
    dark: [
      // rail notches
      'M40 11.5 h2 v1.6 h-2 z', 'M46 11.5 h2 v1.6 h-2 z', 'M52 11.5 h2 v1.6 h-2 z', 'M58 11.5 h2 v1.6 h-2 z', 'M64 11.5 h2 v1.6 h-2 z', 'M70 11.5 h2 v1.6 h-2 z',
      // handguard m-lok slots
      'M82 17.5 h6.4 v3 h-6.4 z', 'M91.4 17.5 h6.4 v3 h-6.4 z', 'M100.8 17.5 h5 v3 h-5 z',
      // ejection port + forward assist
      'M60 15.4 h11 v4.6 h-11 z',
      // muzzle slots
      'M124.5 17.4 h1.8 v5 h-1.8 z', 'M128 17.4 h1.8 v5 h-1.8 z',
      // stock slider slots
      'M11 19 h3 v5 h-3 z',
      // mag ribs
      'M68.2 28.5 l8.6 0 -0.5 2 -8.5 0 z',
    ],
    line: ['M36.5 22.4 h42'],
  },

  // Vanta S-12 — pump-action shotgun, tube magazine
  shotgun: {
    body: [
      // recoil pad + classic stock with dropped comb and pistol-grip curve
      'M4 14.6 q-1.6 7.4 0 15 l4.5 1.2 v-17.4 z',
      'M8 14.2 L30 15.6 q3 0.3 4 2.4 l1 2 v3.4 q-2 3.6 -7 4 l-9.5 0.8 q-6 0.6 -10.5 2.2 z',
      // receiver
      'M34 13.5 h32 q2 0 2 2 v9 q0 2 -2 2 h-32 z',
      // trigger guard
      'M46 26.5 h11 v2 h-2 l-2 5 h-3 l1.6 -5 h-5.6 z',
      // barrel
      'M68 14 h60 v4 h-60 z',
      // mag tube
      'M68 20.5 h48 v4.4 h-48 z',
      // pump forend with finger grooves
      'M74 18.6 h22 q2 0 2 2 v6.4 q0 2 -2 2 h-22 q-2 0 -2 -2 v-6.4 q0 -2 2 -2 z',
      // front bead + barrel clamp
      'M125 11.4 h2.6 v2.6 h-2.6 z', 'M114 18 h3.4 v7 h-3.4 z',
    ],
    dark: [
      // forend ribs
      'M77 20.2 h2 v7 h-2 z', 'M81.5 20.2 h2 v7 h-2 z', 'M86 20.2 h2 v7 h-2 z', 'M90.5 20.2 h2 v7 h-2 z',
      // ejection port
      'M40 16 h16 v4.6 h-16 z',
      // stock comb shadow line
      'M12 17.6 l16 1 -0.3 1.8 -16 -1 z',
      // muzzle
      'M126 14.9 h2 v2.2 h-2 z',
    ],
    line: ['M68 19.4 h58'],
  },

  // Meridian LR-8 — precision bolt-action rifle with scope
  sniper: {
    body: [
      // buttpad + skeletal precision chassis (cheek rail, lower bar, riser post)
      'M2 13.5 h4.5 v17.5 h-4.5 z',
      'M6.5 14.8 h20 v4.6 h-20 z',
      'M6.5 25.2 h21 v4.6 h-21 z',
      'M21 17 h5.5 v10 h-5.5 z',
      // action/receiver
      'M26 14.5 h57 v9.5 h-57 z',
      // bolt handle (down-swept with knob)
      'M60 23.5 l3 0 q0.6 4 4.2 5.6 a2.6 2.6 0 1 1 -3.4 2.6 q-3.6 -2.4 -3.8 -8.2 z',
      // pistol grip
      'M40 24 h10 l-3.8 12.6 q-0.6 1.9 -2.5 1.9 h-5.4 q-2 0 -1.4 -1.9 l3.4 -10.4 q0.7 -2.2 -0.3 -2.2 z',
      // trigger guard + box mag
      'M50 24 h8 v2 h-1.4 l-1.4 4.4 h-2.6 l1 -4.4 h-3.6 z',
      'M66 24 h12 l-1.4 8.6 h-11 z',
      // scope: ocular, tube, turret, objective bell
      'M34 6.2 h7 q1.4 0 1.4 1.4 v4.4 q0 1.4 -1.4 1.4 h-7 z',
      'M42.4 7.5 h34 v4.6 h-34 z',
      'M56 3.4 h5 v4.1 h-5 z',
      'M76.4 5.8 q10.6 -1.6 13.2 1.2 v5.2 q-2.6 2.6 -13.2 1.1 z',
      // scope mounts
      'M47 12 h4.4 v3 h-4.4 z', 'M70 12 h4.4 v3 h-4.4 z',
      // heavy barrel + muzzle brake
      'M83 16.4 h42 v5 h-42 z',
      'M125 15.2 h9 q1.4 0 1.4 1.4 v4.6 q0 1.4 -1.4 1.4 h-9 z',
      // forend
      'M83 14.5 h20 v10.5 l-20 -0.5 z',
    ],
    dark: [
      // mag ribs + ejection
      'M67.6 26 h8.6 v1.8 h-8.6 z',
      'M52 16 h9 v4 h-9 z',
      // brake slots
      'M127 16.6 h2 v4.6 h-2 z', 'M130.6 16.6 h2 v4.6 h-2 z',
      // forend rail slot
      'M86 19.5 h13 v2.6 h-13 z',
    ],
    line: ['M27 22.3 h56'],
  },

  // Fieldman CQ — utility combat blade
  knife: {
    body: [
      // blade: drop point, tip right
      'M56 14.6 q34 -1.8 62 3.4 q6 1.2 12 3.6 q-7 4.2 -15.4 5.2 q-28 3.4 -58.6 1.4 z',
      // guard
      'M52 11.5 h5 v25 h-5 z',
      // handle with pommel taper
      'M22 15.5 h30 v17 h-30 q-4.5 0 -4.5 -4 v-9 q0 -4 4.5 -4 z',
    ],
    dark: [
      // fuller groove
      'M60 18.2 q26 -1.4 48 1.8 l0 2 q-22 -2.4 -48 -1.4 z',
      // grip scallops
      'M26 15.5 q2.4 8.5 0 17 l-3 0 q2.6 -8.5 0 -17 z',
      'M34 15.5 q2.4 8.5 0 17 l-3 0 q2.6 -8.5 0 -17 z',
      'M42 15.5 q2.4 8.5 0 17 l-3 0 q2.6 -8.5 0 -17 z',
      // lanyard hole
      'M22.6 22.2 a1.9 1.9 0 1 0 0.1 0 z',
    ],
    line: [],
  },

  // FB-3 Dazzler — flashbang canister, perforated body
  flash: {
    body: [
      // body cylinder
      'M56 15 h24 q2 0 2 2 v21 q0 4 -4 4 h-20 q-4 0 -4 -4 v-21 q0 -2 2 -2 z',
      // neck + fuze head
      'M62 10 h12 v5 h-12 z', 'M59.5 5.5 h17 q1.5 0 1.5 1.5 v3 h-20 v-3 q0 -1.5 1.5 -1.5 z',
      // safety lever hugging right side
      'M78.5 6.5 l6.5 1.6 q1.8 0.5 1.4 2.2 l-4.6 20.2 -3.4 -0.8 4 -18.6 -4.6 -1.2 z',
      // pull ring
      'M52.5 7.5 a4.6 4.6 0 1 0 0.1 0 z M52.5 9.7 a2.4 2.4 0 1 1 -0.1 0 z',
    ],
    dark: [
      // emission ports, two columns
      'M61 19 a1.8 1.8 0 1 0 0.1 0 z', 'M61 26 a1.8 1.8 0 1 0 0.1 0 z', 'M61 33 a1.8 1.8 0 1 0 0.1 0 z',
      'M70 19 a1.8 1.8 0 1 0 0.1 0 z', 'M70 26 a1.8 1.8 0 1 0 0.1 0 z', 'M70 33 a1.8 1.8 0 1 0 0.1 0 z',
      // band
      'M54 37.4 h28 v1.8 h-28 z',
    ],
    line: [],
  },

  // SG-2 Veil — smoke canister, banded body
  smoke: {
    body: [
      // tall smooth canister
      'M55 13 h26 q2 0 2 2 v24 q0 4 -4 4 h-22 q-4 0 -4 -4 v-24 q0 -2 2 -2 z',
      // top cap + valve
      'M58 8.5 h20 v4.5 h-20 z', 'M64 5 h8 v3.5 h-8 z',
      // lever + ring
      'M78.5 9 l7 1.8 q1.8 0.5 1.3 2.2 l-3.6 15 -3.2 -0.8 3 -13.6 -5.2 -1.4 z',
      'M50.5 9 a4.2 4.2 0 1 0 0.1 0 z M50.5 11.1 a2.1 2.1 0 1 1 -0.1 0 z',
    ],
    dark: [
      // ID bands
      'M53 17.5 h30 v3 h-30 z', 'M53 34.5 h30 v2.4 h-30 z',
      // stencil label block
      'M58 24 h20 v6 h-20 z',
      // base emission port
      'M64 40.5 a2 2 0 1 0 0.1 0 z',
    ],
    line: [],
  },
};

export function weaponIcon(hudKey) {
  const art = WEAPON_ART[hudKey] || WEAPON_ART.carbine;
  const svg = svgEl('0 0 140 48', 'wpn-icon wpn-' + hudKey);
  const layer = (paths, cls) => {
    if (!paths || !paths.length) return;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', paths.join(' '));
    p.setAttribute('class', cls);
    if (cls === 'wl-line') {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-width', '0.8');
    }
    svg.appendChild(p);
  };
  layer(art.body, 'wl-body');
  layer(art.dark, 'wl-dark');
  layer(art.line, 'wl-line');
  return svg;
}

/* ---------------------------------------------------------------- emblems */

// Star/compass emblem. Ring group is separately classed so CSS can spin it
// (loading screen). Elongated north point = the "northstar" motif.
export function starLogo(size = 54) {
  const svg = svgEl('0 0 64 64', 'star');
  svg.style.width = size + 'px';
  svg.style.height = size + 'px';
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const major = i % 6 === 0;
    const r0 = major ? 25.4 : 27.2;
    const x0 = 32 + Math.sin(a) * r0, y0 = 32 - Math.cos(a) * r0;
    const x1 = 32 + Math.sin(a) * 29.2, y1 = 32 - Math.cos(a) * 29.2;
    ticks += `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#6fc3e8" stroke-opacity="${major ? 0.85 : 0.4}" stroke-width="${major ? 1.6 : 1}"/>`;
  }
  svg.innerHTML = `
    <g class="lg-ring">
      <circle cx="32" cy="32" r="30.4" fill="none" stroke="#6fc3e8" stroke-opacity="0.45" stroke-width="1.2"/>
      ${ticks}
    </g>
    <g class="lg-star">
      <circle cx="32" cy="32" r="22" fill="none" stroke="#6fc3e8" stroke-opacity="0.22" stroke-width="1"/>
      <path d="M32 2.5 L35.6 26 L54 32 L35.6 38 L32 56 L28.4 38 L10 32 L28.4 26 Z" fill="#eaf4fb"/>
      <path d="M32 2.5 L35.6 26 L32 32 L28.4 26 Z" fill="#6fc3e8"/>
      <path d="M32 11 L34.4 28.6 L48 32 L34.4 35.4 L32 48 L29.6 35.4 L16 32 L29.6 28.6 Z" fill="#2f5d7c"/>
      <path d="M32 11 L34.4 28.6 L48 32 L34.4 35.4 Z" fill="#6fc3e8" fill-opacity="0.55"/>
      <circle cx="32" cy="32" r="2.1" fill="#eaf4fb"/>
    </g>`;
  return svg;
}

// Full title lockup: compass emblem + layered wordmark + RESCUE strip.
export function titleLogotype() {
  const svg = svgEl('0 0 960 268', 'logotype');
  svg.innerHTML = `
    <defs>
      <linearGradient id="lt-ink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6fbff"/>
        <stop offset="0.55" stop-color="#c9e2f2"/>
        <stop offset="1" stop-color="#7fa9c6"/>
      </linearGradient>
      <linearGradient id="lt-cold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6fc3e8"/>
        <stop offset="1" stop-color="#2f5d7c"/>
      </linearGradient>
      <filter id="lt-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
    </defs>
    <g class="lt-emblem" transform="translate(480 62)">
      <circle r="46" fill="none" stroke="#6fc3e8" stroke-opacity="0.4" stroke-width="1.2"/>
      <g class="lt-ring" stroke="#6fc3e8">
        ${ringTicks(40, 44, 24, 0.75)}
      </g>
      <path d="M0 -45 L5.5 -8.5 L34 0 L5.5 8.5 L0 45 L-5.5 8.5 L-34 0 L-5.5 -8.5 Z" fill="#eaf4fb" filter="url(#lt-glow)" opacity="0.55"/>
      <path d="M0 -45 L5.5 -8.5 L34 0 L5.5 8.5 L0 45 L-5.5 8.5 L-34 0 L-5.5 -8.5 Z" fill="#eaf4fb"/>
      <path d="M0 -45 L5.5 -8.5 L0 0 L-5.5 -8.5 Z" fill="#6fc3e8"/>
      <path d="M0 -30 L3.6 -5 L26 0 L3.6 5 L0 30 L-3.6 5 L-26 0 L-3.6 -5 Z" fill="#2f5d7c"/>
      <path d="M0 -30 L3.6 -5 L26 0 L3.6 5 Z" fill="#6fc3e8" fill-opacity="0.5"/>
      <circle r="2.6" fill="#f6fbff"/>
      <text y="-52" class="lt-cardinal" text-anchor="middle">N</text>
    </g>
    <g class="lt-wing" stroke="#6fc3e8" stroke-opacity="0.55" stroke-width="1">
      <line x1="120" y1="62" x2="408" y2="62"/>
      <line x1="552" y1="62" x2="840" y2="62"/>
      <path d="M120 62 l10 -5 v10 z" fill="#6fc3e8" fill-opacity="0.55" stroke="none"/>
      <path d="M840 62 l-10 -5 v10 z" fill="#6fc3e8" fill-opacity="0.55" stroke="none"/>
    </g>
    <text x="480" y="172" text-anchor="middle" class="lt-word lt-word-glow" textLength="760" lengthAdjust="spacing">NORTHSTAR</text>
    <text x="480" y="172" text-anchor="middle" class="lt-word lt-word-stroke" textLength="760" lengthAdjust="spacing">NORTHSTAR</text>
    <text x="480" y="172" text-anchor="middle" class="lt-word lt-word-fill" textLength="760" lengthAdjust="spacing">NORTHSTAR</text>
    <g class="lt-sub">
      <line x1="252" y1="212" x2="386" y2="212" stroke="#6fc3e8" stroke-opacity="0.5" stroke-width="1"/>
      <line x1="574" y1="212" x2="708" y2="212" stroke="#6fc3e8" stroke-opacity="0.5" stroke-width="1"/>
      <rect x="400" y="208" width="8" height="8" transform="rotate(45 404 212)" fill="#e8b45f"/>
      <rect x="552" y="208" width="8" height="8" transform="rotate(45 556 212)" fill="#e8b45f"/>
      <text x="480" y="219" text-anchor="middle" class="lt-rescue" textLength="118" lengthAdjust="spacing">RESCUE</text>
    </g>
    <text x="480" y="248" text-anchor="middle" class="lt-tag">TACTICAL HOSTAGE RECOVERY</text>`;
  return svg;
}

function ringTicks(r0, r1, n, majorEvery) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const major = i % 6 === 0;
    const ri = major ? r0 - 2 : r0;
    const x0 = Math.sin(a) * ri, y0 = -Math.cos(a) * ri;
    const x1 = Math.sin(a) * r1, y1 = -Math.cos(a) * r1;
    out += `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke-opacity="${major ? 0.9 : 0.4}" stroke-width="${major ? 1.6 : 1}"/>`;
  }
  return out;
}

/* --------------------------------------------------------------- insignia */

// Difficulty insignia — distinct silhouettes (shape-coded, never colour-only):
// recruit = single chevron shield · operator = northstar shield · veteran = triple chevron + bars.
export function difficultyInsignia(id) {
  const svg = svgEl('0 0 48 48', 'insignia ins-' + id);
  const shield = '<path class="ins-shield" d="M24 3 L42 9 V26 Q42 38 24 45 Q6 38 6 26 V9 Z"/>';
  if (id === 'recruit') {
    svg.innerHTML = shield + `
      <path class="ins-mark" d="M24 17 L34 27 L34 33 L24 23 L14 33 L14 27 Z"/>`;
  } else if (id === 'veteran') {
    svg.innerHTML = shield + `
      <path class="ins-mark" d="M24 11 L32 19 L32 24 L24 16 L16 24 L16 19 Z"/>
      <path class="ins-mark" d="M24 19 L32 27 L32 32 L24 24 L16 32 L16 27 Z"/>
      <path class="ins-mark" d="M24 27 L32 35 L32 40 L24 32 L16 40 L16 35 Z"/>`;
  } else {
    svg.innerHTML = shield + `
      <path class="ins-mark" d="M24 9 L26.7 21.3 L39 24 L26.7 26.7 L24 39 L21.3 26.7 L9 24 L21.3 21.3 Z"/>
      <circle class="ins-core" cx="24" cy="24" r="2.2"/>`;
  }
  return svg;
}

/* ------------------------------------------------------------ small glyphs */

// Hostage-status glyphs, shape-coded per state (colourblind-safe pairing).
export function chipGlyph(state) {
  const svg = svgEl('0 0 14 14', 'chip-glyph');
  const G = {
    unknown: '<circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.4 2.1"/>',
    located: '<rect x="3.2" y="3.2" width="7.6" height="7.6" transform="rotate(45 7 7)" fill="currentColor"/>',
    secured: '<path d="M7 1.6 L12.4 12 H1.6 Z" fill="currentColor"/>',
    holding: '<rect x="3" y="3" width="3.2" height="8" fill="currentColor"/><rect x="7.8" y="3" width="3.2" height="8" fill="currentColor"/>',
    extracted: '<path d="M2.4 7.4 L5.8 10.8 L11.8 3.4" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    dead: '<path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" stroke-width="2.2"/>',
  };
  svg.innerHTML = G[state] || G.unknown;
  return svg;
}
