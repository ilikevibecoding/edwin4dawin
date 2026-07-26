// Map-domain material extensions (Fable 2). The materials registry is Fable 3's domain; per the
// working agreement this file only ADDS new names through the stable registerMaterialOverrides()
// interface so the parallel PBR upgrade can adopt/replace them later. Every name here is flagged
// in docs/reports/wp-011.md for merge into src/materials/index.js.
//
// All colors follow docs/visual-bible.md tokens; no pure black/white anywhere.
import * as THREE from 'three';
import { registerMaterialOverrides } from '../materials/index.js';

const std = (color, roughness, metalness = 0) => () =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const glow = (color, emissive, intensity, roughness = 0.35) => () =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, emissive, emissiveIntensity: intensity });

// Canvas-texture material factory for signage (procedural, original-by-construction).
// Runs under the nav-lab DOM stub too (draw calls become no-ops there).
function textPanel({ w = 512, h = 256, bg = '#20303c', ink = '#e8f1f6', lines = [], sub = null,
  border = null, emissiveIntensity = 0.55, roughness = 0.55 }) {
  return () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = Math.max(3, h * 0.02);
      g.strokeRect(g.lineWidth, g.lineWidth, w - 2 * g.lineWidth, h - 2 * g.lineWidth);
    }
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const n = lines.length + (sub ? 1 : 0);
    // shrink-to-fit: height-derived size capped so the text never overflows the panel width
    const fitFont = (text, weight, sizePx) => {
      g.font = `${weight} ${sizePx}px 'Segoe UI', system-ui, sans-serif`;
      const tw = g.measureText(text).width;
      const maxW = w * 0.88;
      if (tw > maxW) {
        sizePx = Math.floor((sizePx * maxW) / tw);
        g.font = `${weight} ${sizePx}px 'Segoe UI', system-ui, sans-serif`;
      }
    };
    lines.forEach((line, i) => {
      fitFont(line, 600, Math.floor(h / (n + 0.8)));
      g.fillText(line, w / 2, (h * (i + 0.75)) / (n + 0.5));
    });
    if (sub) {
      g.fillStyle = '#9fc0d2';
      fitFont(sub, 500, Math.floor(h / (n + 2.4)));
      g.fillText(sub, w / 2, (h * (lines.length + 0.75)) / (n + 0.5));
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity, roughness, metalness: 0.1,
    });
    return m;
  };
}

// EXIT sign lens: green field, white letters, strong emissive (reads at distance, night-safe).
function exitLens() {
  return () => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#134f32';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#d9f7e2';
    g.font = '700 84px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('EXIT', 128, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.4,
    });
  };
}

// Distant-city silhouette with a sparse lit-window emissive grid (tiles 1 window per UV unit;
// meshes use worldUVs(geo, ~2.6) so windows land at believable storey scale through the fog).
function cityShell(litChance, seedShift) {
  return () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#2b333d';
    g.fillRect(0, 0, 256, 256);
    // deterministic hash-based lit windows (no Math.random in shared code paths)
    const cell = 32;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const hsh = Math.sin((x * 37.7 + y * 91.3 + seedShift) * 12.9898) * 43758.5453;
        const v = hsh - Math.floor(hsh);
        const lit = v < litChance;
        g.fillStyle = lit ? (v < litChance * 0.35 ? '#e8c47e' : '#9fc4d8') : '#242b33';
        g.fillRect(x * cell + 7, y * cell + 9, cell - 14, cell - 16);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xbfd4e2, emissiveIntensity: 0.5, roughness: 0.95,
    });
  };
}

registerMaterialOverrides({
  // --- interior finish kit ---
  trimPaint:      std(0xd8d5cd, 0.55),           // baseboards, casings, sills (semi-gloss enamel)
  trimDark:       std(0x565c62, 0.5, 0.3),       // reveal lines, shadow gaps, grid edging
  woodTrim:       std(0x6b4e34, 0.5),            // exec wainscot rails/caps, crown
  woodSlat:       std(0x81603f, 0.55),           // atrium feature-wall slats
  tileWainscot:   std(0xb7c2c4, 0.32),           // restroom wall tile band
  gridTee:        std(0x9a978e, 0.55, 0.35),     // acoustic ceiling T-bars
  tileStained:    std(0x9d9482, 0.95),           // stained acoustic tile variant
  tileMissing:    std(0x30343a, 0.95),           // dark void where a tile is missing
  columnPaint:    std(0xb3afa6, 0.72),           // structural columns
  fixtureHousing: std(0xc6cacd, 0.45, 0.3),      // troffer/strip fixture bodies
  fixtureLens:    glow(0xeef2ee, 0xf1f5e8, 1.35, 0.3),   // neutral office lens
  fixtureLensWarm: glow(0xf2e7cb, 0xefd9a8, 1.3, 0.3),   // break/exec warm lens
  fixtureLensCold: glow(0xdfeaf2, 0xcfe4f2, 1.25, 0.3),  // garage/service cool lens
  pendantShade:   std(0x3a4148, 0.5, 0.4),
  exitLens:       exitLens(),
  exitHousing:    std(0x3c4247, 0.5, 0.3),

  // --- service structure ---
  // NOTE: metalness kept <= 0.35 everywhere — there is no scene environment map, so higher
  // values kill the hemisphere contribution and faces away from point fills go pure black
  // (was visible on duct undersides). Revisit when the PBR pass adds an env map.
  beamPaint:      std(0x707a84, 0.6, 0.3),       // painted structural beams
  deckDark:       std(0x565e66, 0.7, 0.3),       // deck flutes shadow band
  ductMetal:      std(0x9ba3a9, 0.5, 0.3),       // galvanized duct runs
  conduitMetal:   std(0x7c8288, 0.55, 0.3),
  stringerMetal:  std(0x5a6167, 0.55, 0.35),     // stair stringers
  nosingPaint:    std(0xd2b64f, 0.7),            // safety-yellow step nosing
  cageMetal:      std(0x6f7478, 0.55, 0.35),

  // --- branding / atrium ---
  // deep corporate blue; the winter sun rakes this wall through the skylight, so it needs
  // saturation headroom to still read as blue under a 3.2-intensity directional wash
  logoField:      std(0x1f4763, 0.62),
  logoStar:       (() => { const f = glow(0xcfeaf7, 0x6fc3e8, 1.9, 0.3); return () => { const m = f(); m.side = THREE.DoubleSide; return m; }; })(),
  // plate sits on the logoField wall in the same sun wash — self-illuminated so it always reads
  signBrand: textPanel({ w: 1024, h: 168, bg: '#16334a', ink: '#f2f8fb', lines: ['NORTHSTAR DYNAMICS'], emissiveIntensity: 1.8 }),
  ringLight:      glow(0xf4efe2, 0xf0e2b8, 1.7, 0.3),   // suspended atrium ring
  inlayTile:      std(0x41566a, 0.3),            // lobby floor banding
  inlayLight:     std(0xcac6bd, 0.32),
  planterShell:   std(0x3e4449, 0.55, 0.35),
  planterSoil:    std(0x352b20, 1.0),

  // --- exterior / snowscape ---
  facadeReveal:   std(0x596068, 0.6, 0.3),       // panel reveal lines / floor band
  mullionCap:     std(0x454c53, 0.5, 0.35),
  snowDrift:      std(0xe4eaef, 0.88),
  snowCap:        std(0xeaeff3, 0.85),
  plowedAsphalt:  std(0x43464a, 0.95),
  apronConcrete:  std(0x77797b, 0.92),
  markingYellow:  std(0xc0a94e, 0.85),
  markingWhite:   std(0xc9cdd0, 0.85),
  canopySteel:    std(0x39414b, 0.55, 0.35),
  bollardMetal:   std(0x46525c, 0.55, 0.35),
  flagpoleMetal:  std(0xb2b7bc, 0.4, 0.35),
  dockRubber:     std(0x26282a, 0.95),
  monolithShell:  std(0x27303a, 0.6, 0.2),
  treeSnowy:      std(0x39473f, 0.95),
  treeTrunk:      std(0x4a3c30, 0.95),
  cityLit:        cityShell(0.34, 1.7),
  cityDark:       cityShell(0.14, 9.2),

  // --- signage (canvas panels) ---
  signMonolith: textPanel({
    w: 1024, h: 512, bg: '#22303b', ink: '#dfeaf2', border: '#4e7d99',
    lines: ['NORTHSTAR DYNAMICS'], sub: 'ADMINISTRATIVE CENTER', emissiveIntensity: 0.7,
  }),
  signStair1: textPanel({ w: 256, h: 256, bg: '#2c3a44', ink: '#e4eef4', lines: ['1'], border: '#5d90ad', emissiveIntensity: 0.5 }),
  signStair2: textPanel({ w: 256, h: 256, bg: '#2c3a44', ink: '#e4eef4', lines: ['2'], border: '#5d90ad', emissiveIntensity: 0.5 }),
  signGarage: textPanel({ w: 1024, h: 256, bg: '#2a333c', ink: '#d8e4ec', lines: ['EXTRACTION GARAGE'], emissiveIntensity: 0.4 }),
  signLoading: textPanel({ w: 1024, h: 256, bg: '#2a333c', ink: '#d8e4ec', lines: ['GOODS RECEIVING'], emissiveIntensity: 0.4 }),
});
