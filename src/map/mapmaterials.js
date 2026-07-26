// Map-domain material extensions (Fable 2). The materials registry is Fable 3's domain; per the
// working agreement this file only ADDS new names through the stable registerMaterialOverrides()
// interface so the parallel PBR upgrade can adopt/replace them later. Every name here is flagged
// in docs/reports/wp-011.md for merge into src/materials/index.js.
//
// All colors follow docs/visual-bible.md tokens; no pure black/white anywhere.
import * as THREE from 'three';
import { registerMaterialOverrides } from '../materials/index.js';
import {
  woodSet, ceramicSet, brushedSet, paintedMetalSet, concreteSet, asphaltSet, rubberSet, panelSet,
  raisedTileSet,
} from '../materials/textures.js';

const std = (color, roughness, metalness = 0) => () =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const glow = (color, emissive, intensity, roughness = 0.35) => () =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, emissive, emissiveIntensity: intensity });

// Textured standard material — mirrors src/materials/index.js#tex so map-domain names follow the
// same conventions (near-white luminance sets tint via `color`; userData.tileM marks world-scale
// tiling for the placeProps() worldUV retrofit; `tiled: false` keeps native/manual UVs).
const NOTEX = typeof location !== 'undefined' && /[?&]notex=1/.test(location.search);
const tex = (setFn, { tint = 0xffffff, rough = 1.0, metal = 0.0, ns = 1.0, tiled = true } = {}) => () => {
  if (NOTEX) return new THREE.MeshStandardMaterial({ color: tint, roughness: rough, metalness: metal });
  const s = setFn();
  const m = new THREE.MeshStandardMaterial({
    map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap,
    color: tint, roughness: rough, metalness: metal,
  });
  m.normalScale.set(ns, ns);
  if (tiled) m.userData.tileM = s.tileM;
  return m;
};

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
  // wood grain (shared 'laminateGrain' set — groove-free veneer, tinted per use)
  woodTrim:       tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0x6b4e34, rough: 0.9 }),
  woodSlat:       tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0x81603f }),
  tileWainscot:   tex(() => ceramicSet('mapWainscot', { cells: 6, tileM: 1.2, base: [181, 192, 194], groutL: 146, varAmt: 7, roTile: 0.3 })),
  gridTee:        std(0x9a978e, 0.55, 0.35),     // acoustic ceiling T-bars
  tileStained:    std(0x9d9482, 0.95),           // stained acoustic tile variant
  tileMissing:    std(0x30343a, 0.95),           // dark void where a tile is missing
  columnPaint:    tex(() => concreteSet('concretePaint', { painted: true }), { tint: 0xb3afa6, ns: 0.6 }),
  fixtureHousing: std(0xc6cacd, 0.45, 0.3),      // troffer/strip fixture bodies
  fixtureLens:    glow(0xeef2ee, 0xf1f5e8, 1.35, 0.3),   // neutral office lens
  fixtureLensWarm: glow(0xf2e7cb, 0xefd9a8, 1.3, 0.3),   // break/exec warm lens
  fixtureLensCold: glow(0xdfeaf2, 0xcfe4f2, 1.25, 0.3),  // garage/service cool lens
  pendantShade:   std(0x3a4148, 0.5, 0.4),
  exitLens:       exitLens(),
  exitHousing:    std(0x3c4247, 0.5, 0.3),
  // server room runs moody — dimmer, cooler strip lenses than the shared cold lens
  fixtureLensServer: glow(0xbcd8e6, 0x8fd0ec, 0.85, 0.3),
  // dark tech-panel liner on the server shell walls (finish.js#serverLiner) — tinted deep so the
  // room holds its low-key value even where the dimmed fills graze it
  serverLiner:    tex(panelSet, { tint: 0x2a333d, metal: 0.25, ns: 0.5 }),
  // dark access-floor variant for the server room (layout floorMat 'raisedTileDark'); the stock
  // 'raisedTile' base gray blows to white under fills and kills the data-center mood
  raisedTileDark: tex(raisedTileSet, { tint: 0x6d7880, metal: 0.3 }),

  // --- door leaves (doors.js DOOR_STYLES; worldUV'd in leaf-local space so the sets tile true)
  // ns very low: doors are inspected at arm's length and lit hard by corridor fills — at ns 0.3
  // the paint peel still read as stucco in the shots, so relief is dialed to a hint (0.12).
  // Tints run one step darker than the target value because the office/service fills overexpose
  // wall-plane surfaces (~1.5-2x): fire must stay RED, security must stay dark steel.
  doorPaintTex:    tex(() => paintedMetalSet('paintedClean', { wear: false }), { tint: 0x79828b, metal: 0.18, rough: 1.2, ns: 0.12 }),
  doorFireTex:     tex(() => paintedMetalSet('paintedClean', { wear: false }), { tint: 0x6b332c, metal: 0.18, rough: 1.2, ns: 0.12 }),
  // painted steel, not brushed: the brushed streaks read as a roll-up shutter on a hinged leaf.
  // Neutral dark grays wash to wall-white here (magenta probe: the IT-corner troffer fill +
  // colorless specular dominate the diffuse term at arm's length) — only HUE survives the
  // blowout, so the leaf runs a saturated steel-blue with specular cut to a minimum.
  doorSecurityTex: tex(() => paintedMetalSet('paintedClean', { wear: false }), { tint: 0x31435a, metal: 0.06, rough: 1.2, ns: 0.12 }),

  // --- service structure ---
  // Metalness note (wp-011) resolved: the integrator added scene.environment (RoomEnvironment,
  // intensity 0.42), so metals no longer go black away from the point fills. Values below are
  // tuned against that env — bare/brushed metals up to 0.85, painted steel stays 0.3–0.45.
  // Painted-steel adoptions: ns <= 0.4 AND metalness <= 0.25. At true world tiling the peel
  // normal map reads as hammered iron with default scale, and any higher metalness turns the
  // normal noise into sparkling env-map reflections (paint is a dielectric anyway).
  beamPaint:      tex(() => paintedMetalSet(), { tint: 0x707a84, metal: 0.2, ns: 0.35 }),
  ductMetal:      tex(brushedSet, { tint: 0x9ba3a9, metal: 0.55, ns: 0.6 }),   // galvanized runs
  conduitMetal:   tex(() => paintedMetalSet(), { tint: 0x7c8288, metal: 0.2, ns: 0.4 }),
  stringerMetal:  tex(() => paintedMetalSet(), { tint: 0x5a6167, metal: 0.2, ns: 0.4 }),
  nosingPaint:    std(0xd2b64f, 0.7),            // safety-yellow step nosing
  cageMetal:      std(0x6f7478, 0.55, 0.45),

  // --- branding / atrium ---
  // deep corporate blue; the winter sun rakes this wall through the skylight, so it needs
  // saturation headroom to still read as blue under a 3.2-intensity directional wash
  logoField:      std(0x1f4763, 0.62),
  logoStar:       (() => { const f = glow(0xcfeaf7, 0x6fc3e8, 1.9, 0.3); return () => { const m = f(); m.side = THREE.DoubleSide; return m; }; })(),
  // plate sits on the logoField wall in the same sun wash — self-illuminated so it always reads
  signBrand: textPanel({ w: 1024, h: 168, bg: '#16334a', ink: '#f2f8fb', lines: ['NORTHSTAR DYNAMICS'], emissiveIntensity: 1.8 }),
  ringLight:      glow(0xf4efe2, 0xf0e2b8, 1.7, 0.3),   // suspended atrium ring
  // skylight shaft imposter: additive, vertex-color faded, unlit (fog would gray it out)
  lightShaft:     () => new THREE.MeshBasicMaterial({
    color: 0xcfe0ee, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, vertexColors: true, fog: false,
  }),
  inlayTile:      std(0x41566a, 0.3),            // lobby floor banding
  inlayLight:     std(0xcac6bd, 0.32),
  planterShell:   tex(() => paintedMetalSet(), { tint: 0x3e4449, metal: 0.2, ns: 0.4 }),
  planterSoil:    std(0x352b20, 1.0),

  // --- exterior / snowscape ---
  // (snow drifts/caps and deck ceilings consume the shared 'snow'/'deck' textured sets directly;
  // the wp-011 placeholder names snowDrift/snowCap/deckDark were never referenced and are gone)
  facadeReveal:   std(0x596068, 0.6, 0.3),       // panel reveal lines / floor band
  facadeBase:     std(0x4a5057, 0.72, 0.2),      // ground-line AO band at the facade base
  mullionCap:     std(0x454c53, 0.5, 0.5),
  plowedAsphalt:  tex(asphaltSet, { tint: 0x55585c, ns: 0.8 }),
  apronConcrete:  tex(() => concreteSet('concrete'), { tint: 0x8a8c8e }),
  markingYellow:  std(0xc0a94e, 0.85),
  markingWhite:   std(0xc9cdd0, 0.85),
  // clean paint + minimal relief: at plaza-portal distance the default wear pass read as
  // hammered rock (map-fix--canopy-soffit before), so these mirror the door-leaf treatment
  // flat paint: even the 'paintedClean' set kept reading as hammered mottle on the portal
  // under grazing exterior sun (ns 0.12 + rough 1.15 made no visible difference), and dark
  // smooth steel has zero texture payoff at these sizes anyway
  canopySteel:    std(0x39414b, 0.6, 0.2),
  soffitShadow:   std(0x353b42, 0.9),            // fake-AO soffit panel under canopies
  bollardMetal:   tex(() => paintedMetalSet('paintedClean', { wear: false }), { tint: 0x46525c, metal: 0.2, rough: 1.15, ns: 0.12 }),
  flagpoleMetal:  tex(brushedSet, { tint: 0xb2b7bc, metal: 0.85, ns: 0.5 }),
  dockRubber:     tex(rubberSet, { tint: 0x35383a }),
  monolithShell:  tex(brushedSet, { tint: 0x2c353f, metal: 0.35, ns: 0.4 }),
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
