// Signage, screen interfaces & printed matter (Fable 3 domain). All text is original fiction
// for "Northstar Dynamics". Everything draws into two shared canvas atlases so hundreds of
// signs/screens across the map merge into two draw calls:
//   signs   — lit print material (roughness 0.6, no emissive)
//   screens — emissive display material (monitor UIs, TVs, vending front, LED banks)
import * as THREE from 'three';

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FONT = "'Segoe UI', system-ui, sans-serif";
const MONO = "'Cascadia Code', 'Consolas', monospace";

export class CanvasAtlas {
  constructor({ size = 1024, name = 'atlas', emissiveIntensity = 0, roughness = 0.55, metalness = 0.0 }) {
    this.size = size;
    this.name = name;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    // neutral mid-gray background so accidental UV bleed is invisible
    this.ctx.fillStyle = '#3a3f44';
    this.ctx.fillRect(0, 0, size, size);
    this.emissiveIntensity = emissiveIntensity;
    this.roughness = roughness;
    this.metalness = metalness;
    this._x = 2; this._y = 2; this._rowH = 0;
    this._mat = null;
  }

  alloc(w, h, draw) {
    if (this._x + w + 2 > this.size) { this._x = 2; this._y += this._rowH + 2; this._rowH = 0; }
    if (this._y + h + 2 > this.size) throw new Error(`atlas ${this.name} full`);
    const x = this._x, y = this._y;
    this._x += w + 2;
    this._rowH = Math.max(this._rowH, h);
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    draw(g, w, h);
    g.restore();
    // v flipped: canvas y-down -> uv y-up
    return { u0: x / this.size, v0: 1 - (y + h) / this.size, u1: (x + w) / this.size, v1: 1 - y / this.size };
  }

  material() {
    if (this._mat) return this._mat;
    const tex = new THREE.CanvasTexture(this.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 2;
    tex.minFilter = THREE.LinearMipmapNearestFilter;
    const opts = {
      map: tex, roughness: this.roughness, metalness: this.metalness,
    };
    if (this.emissiveIntensity > 0) {
      opts.emissiveMap = tex;
      opts.emissive = new THREE.Color(0xffffff);
      opts.emissiveIntensity = this.emissiveIntensity;
    }
    this._mat = new THREE.MeshStandardMaterial(opts);
    this._mat.name = 'atlas:' + this.name;
    return this._mat;
  }
}

// ---------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------
function panel(g, w, h, bg, borderCol = null) {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (borderCol) {
    g.strokeStyle = borderCol;
    g.lineWidth = Math.max(2, h * 0.03);
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  }
}
function label(g, text, x, y, px, color, { align = 'center', weight = 600, mono = false, ls = 0 } = {}) {
  g.fillStyle = color;
  g.font = `${weight} ${px}px ${mono ? MONO : FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  if (ls) g.letterSpacing = ls + 'px';
  g.fillText(text, x, y);
  if (ls) g.letterSpacing = '0px';
}
// Northstar logo: 4-point star in a ring.
export function drawLogo(g, cx, cy, r, { star = '#6fc3e8', ring = '#dfeaf2' } = {}) {
  g.strokeStyle = ring;
  g.lineWidth = Math.max(1.5, r * 0.12);
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = star;
  g.beginPath();
  const s = r * 0.78, w = r * 0.22;
  g.moveTo(cx, cy - s); g.lineTo(cx + w, cy - w); g.lineTo(cx + s, cy);
  g.lineTo(cx + w, cy + w); g.lineTo(cx, cy + s); g.lineTo(cx - w, cy + w);
  g.lineTo(cx - s, cy); g.lineTo(cx - w, cy - w);
  g.closePath();
  g.fill();
}

// ---------------------------------------------------------------------------
// Atlas content: returns { signs, screens, signMat, screenMat, uv:{...} }
// ---------------------------------------------------------------------------
let built = null;
export function getArt() {
  if (built) return built;
  const signs = new CanvasAtlas({ size: 1024, name: 'signs', roughness: 0.62 });
  const screens = new CanvasAtlas({ size: 1024, name: 'screens', emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.05 });
  const uv = {};

  // ----- screens: monitor UI variants -----
  uv.monitors = [];
  const mon = [
    (g, w, h) => { // ops dashboard
      panel(g, w, h, '#101820');
      g.fillStyle = '#16222e'; g.fillRect(0, 0, w, 14);
      label(g, 'NSD OPS CONSOLE', 6, 7, 8, '#6fc3e8', { align: 'left', mono: true });
      const rng = mulberry(11);
      g.strokeStyle = '#3f89ad'; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i <= 20; i++) { const x = 8 + (i / 20) * (w - 46); const y = h - 16 - rng() * (h - 44); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.fillStyle = '#1d2a36'; g.fillRect(w - 34, 18, 28, h - 26);
      for (let i = 0; i < 5; i++) { g.fillStyle = i === 3 ? '#c8873f' : '#3fae76'; g.fillRect(w - 31, 22 + i * 12, 22, 7); }
    },
    (g, w, h) => { // mail client
      panel(g, w, h, '#1a2026');
      g.fillStyle = '#232b33'; g.fillRect(0, 0, w, 13);
      label(g, 'NORTHMAIL — INBOX', 5, 7, 7.5, '#cfdde8', { align: 'left' });
      const rows = ['Facilities: snow removal window', 'Payroll cut-off reminder', 'Aurora program — standup notes', 'Cafeteria menu week 04', 'IT: badge reader maintenance'];
      rows.forEach((r, i) => {
        g.fillStyle = i % 2 ? '#1e252c' : '#212932';
        g.fillRect(0, 14 + i * 15, w, 14);
        label(g, r, 6, 21 + i * 15, 7, i < 2 ? '#e6eef4' : '#93a4b2', { align: 'left', weight: i < 2 ? 700 : 400 });
      });
    },
    (g, w, h) => { // spreadsheet
      panel(g, w, h, '#e8ebe6');
      g.strokeStyle = '#b7c0c6'; g.lineWidth = 1;
      for (let x = 24; x < w; x += 30) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, h); g.stroke(); }
      for (let y = 10; y < h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#2f5d7c'; g.fillRect(0, 0, w, 10);
      label(g, 'Q4-BUDGET.NSX', 4, 5, 7, '#e8f1f6', { align: 'left', mono: true });
      const rng = mulberry(23);
      g.fillStyle = '#40515c';
      g.font = `400 7px ${MONO}`; g.textAlign = 'right';
      for (let r = 0; r < 7; r++) for (let cI = 0; cI < 4; cI++) {
        g.fillText((rng() * 900 + 20).toFixed(0), 50 + cI * 30, 18 + r * 12);
      }
    },
    (g, w, h) => { // terminal
      panel(g, w, h, '#0d1216');
      const lines = ['$ navd --status', 'link  UP   47ms', 'racks 12/12 ok', 'temp  21.4 C', '$ tail sys.log', 'auth ok badge:2214', 'auth ok badge:1187', '$ _'];
      lines.forEach((l, i) => label(g, l, 5, 8 + i * 11, 7.5, i % 3 === 0 ? '#7fd6a2' : '#5f9b78', { align: 'left', mono: true, weight: 400 }));
    },
    (g, w, h) => { // code editor (WP-012b)
      panel(g, w, h, '#12161c');
      g.fillStyle = '#0d1116'; g.fillRect(0, 0, 22, h); // gutter
      const code = [
        ['#5b6672', '1  '], ['#c586b0', 'fn '], ['#dcd9a8', 'thaw_queue'], ['#c8ccd2', '(t) {'],
      ];
      let cy = 10;
      g.font = `400 7.5px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      const line = (parts) => { let x = 4; for (const [col, txt] of parts) { g.fillStyle = col; g.fillText(txt, x, cy); x += g.measureText(txt).width; } cy += 11; };
      line(code);
      line([['#5b6672', '2    '], ['#7fb5e0', 'if'], ['#c8ccd2', ' (t.frozen) '], ['#7fd6a2', 'retry'], ['#c8ccd2', '(t);']]);
      line([['#5b6672', '3    '], ['#c8ccd2', 'route(t, '], ['#d8a86f', "'garage'"], ['#c8ccd2', ');']]);
      line([['#5b6672', '4  }']]);
      line([['#5b6672', '5  '], ['#4f7a5c', '// TODO: winterize']]);
      g.fillStyle = '#1c2833'; g.fillRect(0, h - 12, w, 12);
      label(g, 'dispatch.ns — northstar-core', 4, h - 6, 7, '#8fa5b5', { align: 'left', mono: true, weight: 400 });
    },
    (g, w, h) => { // wall camera quad (small op view, distinct from sec office grid)
      panel(g, w, h, '#0a0e12');
      const rng = mulberry(47);
      ['DOCK-2', 'HALL-B', 'ATRIUM', 'PLAZA'].forEach((cam, i) => {
        const cx = (i % 2) * (w / 2), cyy = Math.floor(i / 2) * (h / 2);
        g.fillStyle = `rgb(${26 + rng() * 14 | 0},${32 + rng() * 14 | 0},${38 + rng() * 12 | 0})`;
        g.fillRect(cx + 2, cyy + 2, w / 2 - 4, h / 2 - 4);
        g.strokeStyle = '#22303a'; g.strokeRect(cx + 2, cyy + 2, w / 2 - 4, h / 2 - 4);
        for (let b = 0; b < 6; b++) { g.fillStyle = 'rgba(90,110,125,0.25)'; g.fillRect(cx + 6 + rng() * (w / 2 - 30), cyy + 8 + rng() * (h / 2 - 22), 8 + rng() * 16, 3 + rng() * 8); }
        label(g, cam, cx + 6, cyy + 9, 6.5, '#7fd6a2', { align: 'left', mono: true, weight: 400 });
      });
    },
    (g, w, h) => { // Northstar OS lock screen
      panel(g, w, h, '#0e1620');
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#12233a'); grd.addColorStop(1, '#0b1220');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      drawLogo(g, w / 2, h * 0.34, 17);
      label(g, 'NORTHSTAR OS', w / 2, h * 0.6, 10, '#dfeaf2', { ls: 2 });
      label(g, 'Badge in or press any key', w / 2, h * 0.74, 7, '#7f93a4', { weight: 400 });
      g.fillStyle = '#16222e'; g.fillRect(w / 2 - 40, h * 0.82, 80, 11);
      label(g, '••••••', w / 2, h * 0.82 + 6, 7, '#4f6a80', { mono: true });
    },
    (g, w, h) => { // error dialog over dimmed desktop
      panel(g, w, h, '#101820');
      g.fillStyle = '#0c141b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#233240'; g.fillRect(w / 2 - 74, h / 2 - 36, 148, 72);
      g.fillStyle = '#2d4052'; g.fillRect(w / 2 - 74, h / 2 - 36, 148, 14);
      label(g, 'NORTHSTAR OS — FAULT', w / 2, h / 2 - 29, 7.5, '#e8ccb0');
      g.fillStyle = '#c8873f';
      g.beginPath(); g.moveTo(w / 2 - 58, h / 2 + 8); g.lineTo(w / 2 - 44, h / 2 - 14); g.lineTo(w / 2 - 30, h / 2 + 8); g.closePath(); g.fill();
      label(g, '!', w / 2 - 44, h / 2 + 1, 11, '#1a2026', { weight: 800 });
      label(g, 'Heating loop 3 not responding.', w / 2 + 10, h / 2 - 6, 7, '#cfdde8', { weight: 400 });
      label(g, 'Contact facilities (x4471).', w / 2 + 10, h / 2 + 5, 7, '#93a4b2', { weight: 400 });
      g.fillStyle = '#3f89ad'; g.fillRect(w / 2 + 24, h / 2 + 18, 42, 12);
      label(g, 'RETRY', w / 2 + 45, h / 2 + 24, 7, '#0e1620');
    },
  ];
  for (const draw of mon) uv.monitors.push(screens.alloc(200, 118, draw));

  // security camera grid (3×2)
  uv.secgrid = screens.alloc(320, 196, (g, w, h) => {
    panel(g, w, h, '#0a0e12');
    const cams = ['LOBBY', 'DOCK', 'SRV-A', 'GATE', 'MEZZ', 'YARD'];
    const rng = mulberry(31);
    for (let i = 0; i < 6; i++) {
      const cx = (i % 3) * (w / 3), cy = Math.floor(i / 3) * (h / 2);
      const cw = w / 3 - 3, ch = h / 2 - 3;
      const shade = 30 + rng() * 26;
      g.fillStyle = `rgb(${shade * 0.75},${shade},${shade * 1.15})`;
      g.fillRect(cx + 1.5, cy + 1.5, cw, ch);
      // fake room geometry lines
      g.strokeStyle = 'rgba(160,190,210,0.35)'; g.lineWidth = 1.5;
      g.strokeRect(cx + 8 + rng() * 10, cy + 12 + rng() * 8, cw * 0.5, ch * 0.5);
      g.beginPath(); g.moveTo(cx + 2, cy + ch - 6 - rng() * 10); g.lineTo(cx + cw, cy + ch - 2 - rng() * 14); g.stroke();
      label(g, cams[i], cx + 6, cy + 9, 8, '#9fe0b7', { align: 'left', mono: true, weight: 400 });
      g.fillStyle = '#d84a3a'; g.beginPath(); g.arc(cx + cw - 8, cy + 9, 2.5, 0, 7); g.fill();
    }
  });

  // conference slide
  uv.slide = screens.alloc(320, 196, (g, w, h) => {
    panel(g, w, h, '#f2f4f1');
    g.fillStyle = '#2f5d7c'; g.fillRect(0, 0, w, 40);
    label(g, 'WINTER LOGISTICS REVIEW', w / 2, 20, 17, '#eef4f8', { weight: 700, ls: 1 });
    drawLogo(g, 26, 20, 12, { star: '#9fd3ec', ring: '#cfe4f0' });
    const bullets = ['Fleet readiness at northern depots', 'Cold-chain handoff windows', 'Q1 staffing forecast'];
    bullets.forEach((b, i) => {
      g.fillStyle = '#2f5d7c'; g.fillRect(24, 62 + i * 30, 8, 8);
      label(g, b, 40, 66 + i * 30, 13, '#38424a', { align: 'left', weight: 500 });
    });
    label(g, 'NORTHSTAR DYNAMICS — INTERNAL', w / 2, h - 12, 8, '#8b98a1', { weight: 400 });
  });

  // vending machine front ("Polar Bites")
  uv.vending = screens.alloc(150, 300, (g, w, h) => {
    panel(g, w, h, '#173042');
    g.fillStyle = '#1d4258'; g.fillRect(0, 0, w, 54);
    drawLogo(g, 26, 27, 16, { star: '#bfe6f7', ring: '#7fb6cf' });
    label(g, 'POLAR', 92, 18, 20, '#e8f4fb', { weight: 800, ls: 2 });
    label(g, 'BITES', 92, 38, 20, '#6fc3e8', { weight: 800, ls: 2 });
    const rng = mulberry(47);
    const cols = ['#c8683f', '#3fae76', '#c8a23f', '#7f6fd8', '#d84a6a', '#4a90d8'];
    for (let r = 0; r < 5; r++) {
      g.fillStyle = '#10222e';
      g.fillRect(8, 62 + r * 42, w - 16, 36);
      for (let cI = 0; cI < 4; cI++) {
        g.fillStyle = cols[Math.floor(rng() * cols.length)];
        g.fillRect(12 + cI * 32, 66 + r * 42, 26, 24);
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(12 + cI * 32, 66 + r * 42, 26, 7);
      }
      g.fillStyle = '#5f7885';
      for (let cI = 0; cI < 4; cI++) g.fillRect(13 + cI * 32, 92 + r * 42, 24, 3);
    }
    g.fillStyle = '#0d1a22'; g.fillRect(8, h - 24, w - 16, 18);
    label(g, 'B4  —  1.50', w / 2, h - 15, 10, '#9fe0b7', { mono: true, weight: 400 });
  });

  // server rack LED banks (3 variants, thin strips)
  uv.rackled = [];
  for (let vI = 0; vI < 3; vI++) {
    uv.rackled.push(screens.alloc(128, 14, (g, w, h) => {
      panel(g, w, h, '#0c1013');
      const rng = mulberry(61 + vI * 17);
      for (let x = 4; x < w - 4; x += 7) {
        const r = rng();
        g.fillStyle = r > 0.82 ? '#d8a23f' : (r > 0.72 ? '#3f77d8' : '#39c86e');
        if (r > 0.94) g.fillStyle = '#22303a';
        g.fillRect(x, h / 2 - 1.5, 3.5, 3);
      }
    }));
  }

  // copier control panel
  uv.copierPanel = screens.alloc(96, 44, (g, w, h) => {
    panel(g, w, h, '#101820');
    g.fillStyle = '#1c2d3a'; g.fillRect(4, 4, 52, 22);
    label(g, 'READY', 30, 15, 9, '#7fd6a2', { mono: true, weight: 400 });
    label(g, 'TRAY 2: A4', 30, 23, 6, '#5f8a70', { mono: true, weight: 400 });
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i === 0 ? '#3fae76' : '#33414c';
      g.fillRect(62 + (i % 3) * 11, 6 + Math.floor(i / 3) * 12, 8, 8);
    }
    g.fillStyle = '#2a3742'; g.fillRect(4, 30, w - 8, 9);
  });

  // small TV news frame for break room
  uv.breakTv = screens.alloc(160, 96, (g, w, h) => {
    panel(g, w, h, '#0e141a');
    g.fillStyle = '#22303c'; g.fillRect(0, 0, w, h - 18);
    const rng = mulberry(97);
    g.fillStyle = '#31465a';
    for (let i = 0; i < 7; i++) g.fillRect(rng() * w * 0.8, rng() * (h - 40), 18 + rng() * 40, 8 + rng() * 18);
    label(g, 'NORTH 7 WEATHER — LAKE-EFFECT BAND TONIGHT', 6, h - 9, 7, '#e8d99f', { align: 'left', weight: 600 });
    g.fillStyle = '#8e3b34'; g.fillRect(0, h - 18, 34, 10);
    label(g, 'LIVE', 17, h - 13, 7, '#f4e4e0', { weight: 700 });
  });

  // ----- signs (non-emissive) -----
  uv.dept = {};
  const depts = {
    reception: 'RECEPTION', security: 'SECURITY OFFICE', copy: 'COPY & MAIL', it: 'IT SUPPORT',
    server: 'DATA CENTER', mech: 'MECHANICAL', loading: 'GOODS RECEIVING', records: 'RECORDS ARCHIVE',
    conference: 'BOREAL BOARDROOM', hr: 'PERSONNEL', exec: 'EXECUTIVE SUITE', breakroom: 'STAFF LOUNGE',
    janitor: 'CUSTODIAL', storage: 'STORAGE', wellness: 'QUIET ROOM', print: 'PRINT & SUPPLY',
    rrm: 'RESTROOM — M', rrw: 'RESTROOM — W', garage: 'VEHICLE BAY',
  };
  for (const [k, text] of Object.entries(depts)) {
    uv.dept[k] = signs.alloc(200, 44, (g, w, h) => {
      panel(g, w, h, '#2f5d7c');
      g.fillStyle = '#24485f'; g.fillRect(0, 0, 8, h);
      label(g, text, w / 2 + 4, h / 2, 15, '#e8f1f6', { weight: 700, ls: 2 });
    });
  }
  uv.roomPlate = [];
  const plates = ['0-114', '0-117', '0-121', '1-204', '1-208', '1-212', '1-216', '0-102'];
  for (const p of plates) {
    uv.roomPlate.push(signs.alloc(72, 30, (g, w, h) => {
      panel(g, w, h, '#cfd4d6', '#9aa2a6');
      label(g, p, w / 2, h / 2, 13, '#3a4348', { weight: 700, mono: true });
    }));
  }
  uv.directional = signs.alloc(224, 96, (g, w, h) => {
    panel(g, w, h, '#22303b');
    const rows = [['→', 'RECEPTION · VISITOR LOUNGE'], ['←', 'STAFF LOUNGE · RESTROOMS'], ['↑', 'OPEN OFFICE (LEVEL 2)']];
    rows.forEach(([a, t], i) => {
      label(g, a, 18, 17 + i * 30, 18, '#6fc3e8', { weight: 700 });
      label(g, t, 36, 17 + i * 30, 11, '#dfeaf2', { align: 'left', weight: 600, ls: 1 });
    });
  });
  uv.directional2 = signs.alloc(224, 96, (g, w, h) => {
    panel(g, w, h, '#22303b');
    const rows = [['→', 'DATA CENTER · IT SUPPORT'], ['←', 'GOODS RECEIVING · VEHICLE BAY'], ['↑', 'CONFERENCE (LEVEL 2)']];
    rows.forEach(([a, t], i) => {
      label(g, a, 18, 17 + i * 30, 18, '#6fc3e8', { weight: 700 });
      label(g, t, 36, 17 + i * 30, 11, '#dfeaf2', { align: 'left', weight: 600, ls: 1 });
    });
  });
  uv.safety = signs.alloc(128, 176, (g, w, h) => {
    panel(g, w, h, '#e8e6df', '#c8873f');
    g.fillStyle = '#c8873f'; g.fillRect(0, 0, w, 34);
    label(g, 'SAFETY FIRST', w / 2, 17, 13, '#fdf8ee', { weight: 800, ls: 1 });
    g.strokeStyle = '#5a5648'; g.lineWidth = 2.5;
    // hard-hat figure
    g.beginPath(); g.arc(w / 2, 74, 14, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(w / 2, 88); g.lineTo(w / 2, 118); g.moveTo(w / 2 - 16, 100); g.lineTo(w / 2 + 16, 100); g.stroke();
    g.fillStyle = '#c8a23f'; g.beginPath(); g.arc(w / 2, 66, 14, Math.PI, 0); g.fill();
    label(g, 'LIFT WITH YOUR LEGS', w / 2, 138, 9, '#5a5648', { weight: 700 });
    label(g, 'REPORT SPILLS TO x2200', w / 2, 154, 8, '#7a7668', { weight: 500 });
  });
  uv.evac = signs.alloc(128, 176, (g, w, h) => {
    panel(g, w, h, '#eef0ec', '#8e3b34');
    label(g, 'EVACUATION PLAN', w / 2, 14, 11, '#8e3b34', { weight: 800 });
    // mini floorplan
    g.strokeStyle = '#5a636a'; g.lineWidth = 2;
    g.strokeRect(14, 28, 100, 96);
    g.beginPath(); g.moveTo(14, 62); g.lineTo(74, 62); g.moveTo(74, 28); g.lineTo(74, 90); g.moveTo(44, 62); g.lineTo(44, 124); g.stroke();
    g.fillStyle = '#3fae76';
    g.fillRect(70, 118, 12, 6); g.fillRect(14, 56, 6, 12);
    g.fillStyle = '#d84a3a'; g.beginPath(); g.arc(58, 100, 4, 0, 7); g.fill();
    label(g, 'YOU ARE HERE', 64, 136, 7, '#8e3b34', { weight: 700 });
    label(g, 'MUSTER: FLAG COURT', w / 2, 158, 8, '#5a636a', { weight: 600 });
  });
  uv.notice = signs.alloc(176, 128, (g, w, h) => {
    panel(g, w, h, '#7a5b3e', '#5d452f');
    const rng = mulberry(71);
    const notes = ['SHIFT SWAP', 'FOR SALE: SKIS', 'HOLIDAY ROTA', 'CANTEEN MENU', 'CARPOOL', 'GYM CLUB'];
    for (let i = 0; i < 6; i++) {
      const x = 8 + (i % 3) * 55 + rng() * 6, y = 10 + Math.floor(i / 3) * 56 + rng() * 6;
      g.save();
      g.translate(x + 24, y + 22);
      g.rotate((rng() - 0.5) * 0.2);
      g.fillStyle = ['#f2efe4', '#e4ecf2', '#f2e4e4', '#e8f2e4'][Math.floor(rng() * 4)];
      g.fillRect(-24, -22, 48, 44);
      g.fillStyle = '#4a4d50';
      g.font = `600 6.5px ${FONT}`; g.textAlign = 'center';
      g.fillText(notes[i], 0, -10);
      g.strokeStyle = '#9aa2a6'; g.lineWidth = 1;
      for (let l = 0; l < 4; l++) { g.beginPath(); g.moveTo(-18, -2 + l * 7); g.lineTo(18, -2 + l * 7); g.stroke(); }
      g.fillStyle = '#c84a3a'; g.beginPath(); g.arc(0, -18, 2, 0, 7); g.fill();
      g.restore();
    }
  });
  uv.whiteboards = [];
  const wbDraw = [
    (g, w, h) => {
      panel(g, w, h, '#eef1ee');
      g.strokeStyle = '#3f77d8'; g.lineWidth = 2;
      label(g, 'SPRINT 41', 44, 16, 13, '#3f77d8', { weight: 700 });
      const rng = mulberry(83);
      g.font = `500 9px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#4a5560';
      ['badge sync fix', 'depot API v2', 'snow routing', 'QA pass'].forEach((t, i) => {
        g.fillText('• ' + t, 14, 36 + i * 16);
        if (i < 2) { g.strokeStyle = '#c84a3a'; g.beginPath(); g.moveTo(12, 33 + i * 16); g.lineTo(14 + g.measureText('• ' + t).width, 33 + i * 16); g.stroke(); }
      });
      // arrow diagram
      g.strokeStyle = '#3fae76'; g.lineWidth = 2;
      g.strokeRect(150, 30, 44, 24); g.strokeRect(150, 84, 44, 24);
      g.beginPath(); g.moveTo(172, 54); g.lineTo(172, 84); g.lineTo(168, 78); g.moveTo(172, 84); g.lineTo(176, 78); g.stroke();
      label(g, 'INTAKE', 172, 42, 8, '#3fae76', { weight: 600 });
      label(g, 'DISPATCH', 172, 96, 8, '#3fae76', { weight: 600 });
    },
    (g, w, h) => {
      panel(g, w, h, '#eef1ee');
      label(g, 'DO NOT ERASE', w - 52, 12, 9, '#c84a3a', { weight: 800 });
      const rng = mulberry(89);
      g.strokeStyle = '#5a636a'; g.lineWidth = 1.8;
      g.beginPath();
      for (let i = 0; i <= 12; i++) { const x = 16 + i * 14; const y = 90 - Math.sin(i * 0.8) * 24 - rng() * 8; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      label(g, 'depot load curve — week 3', 90, 112, 9, '#5a636a', { weight: 500 });
      g.strokeStyle = '#3f77d8';
      g.beginPath(); g.arc(120, 58, 12, 0, 7); g.stroke();
      label(g, '!', 120, 58, 12, '#3f77d8', { weight: 800 });
    },
  ];
  for (const d of wbDraw) uv.whiteboards.push(signs.alloc(208, 128, d));

  // book rows for shelves/bookcases (3 variants)
  uv.books = [];
  for (let vI = 0; vI < 3; vI++) {
    uv.books.push(signs.alloc(256, 64, (g, w, h) => {
      panel(g, w, h, '#241f1a');
      const rng = mulberry(101 + vI * 13);
      const cols = ['#5d4a6e', '#3e5d74', '#6e3e3e', '#4a6e50', '#6e6440', '#3a3f44', '#7c5b3a'];
      let x = 2;
      while (x < w - 8) {
        const bw = 7 + rng() * 12;
        const bh = h - 6 - rng() * 14;
        g.fillStyle = cols[Math.floor(rng() * cols.length)];
        if (rng() > 0.88) { x += bw * 0.7; continue; } // gap
        g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(x + 1.5, h - bh + 5, bw - 3, 2.5);
        g.fillRect(x + 1.5, h - 12, bw - 3, 2);
        x += bw + 1.5;
      }
    }));
  }
  // archive box label face
  uv.boxLabels = [];
  for (let vI = 0; vI < 2; vI++) {
    uv.boxLabels.push(signs.alloc(96, 64, (g, w, h) => {
      panel(g, w, h, vI ? '#a8875e' : '#9c7c55');
      g.fillStyle = '#ede8dc'; g.fillRect(12, 14, w - 24, 30);
      label(g, vI ? 'FY-19 AP' : 'CONTRACTS', w / 2, 26, 9, '#4a4438', { weight: 700, mono: true });
      label(g, vI ? 'BOX 12 OF 30' : 'LEGAL HOLD', w / 2, 37, 6.5, '#7a7264', { weight: 500, mono: true });
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, w, 6);
    }));
  }
  // printed page + document pile
  uv.page = signs.alloc(64, 88, (g, w, h) => {
    panel(g, w, h, '#eceadf');
    g.fillStyle = '#8a949c';
    for (let i = 0; i < 12; i++) g.fillRect(8, 12 + i * 6, (i % 4 === 3 ? 0.5 : 0.85) * (w - 16), 2);
    g.fillStyle = '#2f5d7c'; g.fillRect(8, 4, 22, 4);
  });
  uv.docPile = signs.alloc(96, 64, (g, w, h) => {
    panel(g, w, h, '#e4e1d4');
    const rng = mulberry(113);
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate((rng() - 0.5) * 0.5);
      g.fillStyle = ['#eceadf', '#e2e6ea', '#efe9da'][i % 3];
      g.fillRect(-w * 0.32, -h * 0.32, w * 0.64, h * 0.64);
      g.fillStyle = '#9aa2a6';
      for (let l = 0; l < 5; l++) g.fillRect(-w * 0.24, -h * 0.18 + l * 6, w * 0.42, 1.5);
      g.restore();
    }
  });
  // ID badge, calendar, photos, brochure
  uv.badge = signs.alloc(40, 56, (g, w, h) => {
    panel(g, w, h, '#e8ecef', '#9aa2a6');
    g.fillStyle = '#2f5d7c'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#c8cdd2'; g.fillRect(10, 16, 20, 20);
    g.fillStyle = '#8a949c'; g.beginPath(); g.arc(20, 24, 6, 0, 7); g.fill();
    g.fillRect(12, 32, 16, 6);
    label(g, 'NSD', w / 2, 6, 7, '#e8f1f6', { weight: 800 });
    g.fillStyle = '#4a5560'; g.fillRect(8, 42, 24, 2.5); g.fillRect(8, 47, 16, 2.5);
  });
  uv.calendar = signs.alloc(96, 112, (g, w, h) => {
    panel(g, w, h, '#f0efe8', '#b8bcb2');
    g.fillStyle = '#8e3b34'; g.fillRect(0, 0, w, 22);
    label(g, 'JANUARY', w / 2, 11, 11, '#f4ece8', { weight: 800, ls: 2 });
    g.fillStyle = '#5a636a'; g.font = `500 7px ${MONO}`; g.textAlign = 'center';
    let d = 1;
    for (let r = 0; r < 5 && d <= 31; r++) for (let cI = 0; cI < 7 && d <= 31; cI++) {
      if (d === 17) { g.fillStyle = '#c84a3a'; g.beginPath(); g.arc(10 + cI * 13, 36 + r * 15, 5.5, 0, 7); g.stroke(); g.fillStyle = '#5a636a'; }
      g.fillText(String(d), 10 + cI * 13, 38 + r * 15);
      d++;
    }
  });
  uv.photo = signs.alloc(80, 60, (g, w, h) => {
    panel(g, w, h, '#c8d4dc');
    g.fillStyle = '#7c94a4'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = '#e8eef2'; g.beginPath();
    g.moveTo(0, h * 0.55); g.lineTo(w * 0.3, h * 0.2); g.lineTo(w * 0.52, h * 0.55); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * 0.4, h * 0.55); g.lineTo(w * 0.7, h * 0.12); g.lineTo(w, h * 0.55); g.closePath(); g.fill();
    g.fillStyle = '#dfe6ec'; g.fillRect(0, h * 0.72, w, h * 0.28);
  });
  uv.brochure = signs.alloc(56, 80, (g, w, h) => {
    panel(g, w, h, '#2f5d7c');
    drawLogo(g, w / 2, 24, 12);
    label(g, 'NORTHSTAR', w / 2, 46, 8, '#e8f1f6', { weight: 800 });
    label(g, 'DYNAMICS', w / 2, 56, 8, '#9fc9e2', { weight: 800 });
    label(g, 'visitor guide', w / 2, 70, 6, '#7ea9c2', { weight: 400 });
  });
  // keyboard + phone tops
  uv.keyboard = signs.alloc(128, 44, (g, w, h) => {
    panel(g, w, h, '#22262a');
    g.fillStyle = '#33393f';
    for (let r = 0; r < 4; r++) for (let cI = 0; cI < 13; cI++) {
      g.fillRect(3 + cI * 9.4, 3 + r * 8.6, 7.6, 6.8);
    }
    g.fillRect(32, 37, 56, 5);
  });
  uv.phone = signs.alloc(64, 96, (g, w, h) => {
    panel(g, w, h, '#2b3036');
    g.fillStyle = '#15202a'; g.fillRect(8, 8, w - 16, 24);
    label(g, '12:47', w / 2, 20, 10, '#7fd6a2', { mono: true, weight: 400 });
    g.fillStyle = '#3a4148';
    for (let r = 0; r < 4; r++) for (let cI = 0; cI < 3; cI++) g.fillRect(11 + cI * 15.5, 38 + r * 13.5, 12, 10);
  });
  // snack bags strip (vending / break shelf)
  uv.snacks = signs.alloc(128, 48, (g, w, h) => {
    const cols = ['#c8683f', '#3fae76', '#c8a23f', '#7f6fd8'];
    const rng = mulberry(127);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = cols[i];
      g.fillRect(i * 32 + 2, 4, 28, h - 8);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(i * 32 + 2, 4, 28, 10);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(i * 32 + 6, 22, 20, 12);
    }
  });
  // shipping label + hazard placard for crates
  uv.shipLabel = signs.alloc(96, 64, (g, w, h) => {
    panel(g, w, h, '#ece8dc', '#b8b2a2');
    label(g, 'NORTHSTAR DYNAMICS', w / 2, 10, 7, '#2f5d7c', { weight: 800 });
    g.fillStyle = '#3a4348';
    for (let i = 0; i < 3; i++) g.fillRect(8, 20 + i * 8, w - 40, 3);
    // barcode
    const rng = mulberry(131);
    let x = 8;
    while (x < w - 12) { const bw = 1 + rng() * 3; g.fillRect(x, 46, bw, 12); x += bw + 1 + rng() * 2; }
    label(g, 'DEPOT 7', w - 22, 26, 8, '#8e3b34', { weight: 800 });
  });
  // van livery: side panel + rear
  uv.vanSide = signs.alloc(440, 150, (g, w, h) => {
    panel(g, w, h, '#e4e8ea');
    g.fillStyle = '#2f5d7c';
    g.beginPath();
    g.moveTo(0, h * 0.58); g.lineTo(w, h * 0.42); g.lineTo(w, h * 0.6); g.lineTo(0, h * 0.76); g.closePath();
    g.fill();
    g.fillStyle = '#6fc3e8';
    g.beginPath();
    g.moveTo(0, h * 0.78); g.lineTo(w, h * 0.62); g.lineTo(w, h * 0.66); g.lineTo(0, h * 0.82); g.closePath();
    g.fill();
    drawLogo(g, 52, 44, 26, { star: '#2f5d7c', ring: '#2f5d7c' });
    label(g, 'NORTHSTAR RESPONSE', w * 0.55, 40, 30, '#243c4c', { weight: 800, ls: 3 });
    label(g, 'PRIORITY LOGISTICS UNIT 07', w * 0.55, 66, 13, '#5a7484', { weight: 600, ls: 2 });
    g.fillStyle = '#c8cdd2'; g.fillRect(0, h - 10, w, 10);
  });
  uv.vanBack = signs.alloc(150, 150, (g, w, h) => {
    panel(g, w, h, '#dfe3e5');
    g.fillStyle = '#2f5d7c'; g.fillRect(0, h * 0.5, w, h * 0.14);
    label(g, 'UNIT 07', w / 2, h * 0.57, 14, '#e8f1f6', { weight: 800, ls: 2 });
    label(g, 'KEEP BACK 50 M', w / 2, h * 0.78, 10, '#8e3b34', { weight: 800 });
    drawLogo(g, w / 2, 28, 18, { star: '#2f5d7c', ring: '#2f5d7c' });
  });
  // wall clock face
  uv.clock = signs.alloc(88, 88, (g, w, h) => {
    g.fillStyle = '#e8ebed'; g.beginPath(); g.arc(w / 2, h / 2, 42, 0, 7); g.fill();
    g.strokeStyle = '#3a4148'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 42, 0, 7); g.stroke();
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * 34, h / 2 + Math.sin(a) * 34);
      g.lineTo(w / 2 + Math.cos(a) * 39, h / 2 + Math.sin(a) * 39);
      g.stroke();
    }
    g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + 14, h / 2 - 20); g.stroke(); // ~10:25
    g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 - 26, h / 2 - 6); g.stroke();
    g.fillStyle = '#8e3b34'; g.beginPath(); g.arc(w / 2, h / 2, 3, 0, 7); g.fill();
  });
  // reception counter logo plate (backlit look but on sign atlas w/ light colors)
  uv.receptionLogo = signs.alloc(360, 100, (g, w, h) => {
    panel(g, w, h, '#26343e');
    drawLogo(g, 54, h / 2, 34);
    label(g, 'NORTHSTAR DYNAMICS', w * 0.58, h / 2 - 12, 25, '#e8f1f6', { weight: 800, ls: 3 });
    label(g, 'ADMINISTRATIVE CENTER', w * 0.58, h / 2 + 18, 12, '#6fc3e8', { weight: 600, ls: 4 });
  });
  // mirror "reflection" haze for restrooms — cheap gradient
  uv.mirror = signs.alloc(96, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#b8c6ce');
    gr.addColorStop(0.45, '#d4dee4');
    gr.addColorStop(0.55, '#c2ced6');
    gr.addColorStop(1, '#a8b6c0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.moveTo(w * 0.15, 0); g.lineTo(w * 0.35, 0); g.lineTo(w * 0.1, h); g.lineTo(w * 0.0, h * 0.8); g.closePath(); g.fill();
  });

  // WP-012b: caution wet-floor A-frame face (original design, "slipping star" mark)
  uv.wetFloor = signs.alloc(88, 128, (g, w, h) => {
    panel(g, w, h, '#e8c33f');
    g.strokeStyle = '#2a2a26'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    label(g, 'CAUTION', w / 2, 16, 15, '#2a2a26', { weight: 800 });
    // slipping figure: lean-back stick figure over a splash arc
    g.strokeStyle = '#2a2a26'; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.arc(w / 2 + 8, 42, 6, 0, Math.PI * 2); g.stroke(); // head
    g.beginPath();
    g.moveTo(w / 2 + 4, 48); g.lineTo(w / 2 - 6, 64); // torso leaning back
    g.moveTo(w / 2 - 6, 64); g.lineTo(w / 2 - 18, 58); // arm back
    g.moveTo(w / 2 + 2, 54); g.lineTo(w / 2 + 16, 50); // arm up
    g.moveTo(w / 2 - 6, 64); g.lineTo(w / 2 + 10, 74); // leg forward (slipping)
    g.moveTo(w / 2 - 6, 64); g.lineTo(w / 2 - 14, 78); // leg down
    g.stroke();
    g.beginPath(); g.arc(w / 2, 84, 22, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    label(g, 'WET FLOOR', w / 2, 102, 12, '#2a2a26', { weight: 800 });
    label(g, 'NSD FACILITIES', w / 2, 118, 6.5, '#5a5442', { weight: 600, ls: 1 });
  });
  // magazine cover for the guard stool (original fiction)
  uv.magazine = signs.alloc(56, 76, (g, w, h) => {
    panel(g, w, h, '#25404f');
    g.fillStyle = '#5f8ba3'; g.fillRect(0, 0, w, 18);
    label(g, 'COLD ROUTE', w / 2, 9, 8.5, '#eef4f8', { weight: 800, ls: 1 });
    g.fillStyle = '#8fb3c6'; g.beginPath(); g.moveTo(6, h - 14); g.lineTo(22, 30); g.lineTo(38, h - 14); g.closePath(); g.fill(); // mountain
    g.fillStyle = '#d8e4ea'; g.beginPath(); g.moveTo(16, 45); g.lineTo(22, 30); g.lineTo(28, 45); g.closePath(); g.fill();
    label(g, 'WINTER RIGS', w / 2, h - 22, 6, '#e8c33f', { weight: 700 });
    label(g, 'ISSUE 118', w / 2, h - 8, 5.5, '#b8c6ce', { weight: 400 });
  });

  built = { signs, screens, uv, signMat: signs.material(), screenMat: screens.material() };
  return built;
}
