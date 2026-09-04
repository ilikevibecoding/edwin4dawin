// Module-local materials for d4-hangar (COORDINATION.md §10: manifest.materials(shared) -> {key: Material},
// <= 2 canvas textures <= 1024^2). Exactly two canvases: a label/stencil atlas (signage, deck stencils,
// the contact-shadow blob) and the 8 m deck-plate sheet (plates, seams, tie-down rings, wear) that is
// both the albedo and the roughness map of the plating. The containment field is a ShaderMaterial (no
// texture). Everything original; procedural text only.
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Label atlas: text stencils packed into one 1024^2 canvas. LABELS[name] = [u0, v0, u1, v1] + aspect.
// Rows are grouped by cell height (the packer starts a new row when the height changes).
// ---------------------------------------------------------------------------
const ATLAS = 1024;
const LABEL_SPEC = [
  // [name, text, cellW, cellH, options]
  ["HANGAR CONTROL", "HANGAR CONTROL", 1024, 96, { weight: 900, spacing: 0.22, bridges: false }],
  ["01", "01", 160, 80, {}],
  ["02", "02", 160, 80, {}],
  ["03", "03", 160, 80, {}],
  ["04", "04", 160, 80, {}],
  ["05", "05", 160, 80, {}],
  ["06", "06", 160, 80, {}],
  ["MAINT ACCESS", "MAINT ACCESS", 384, 64, {}],
  ["AUTHORISED ONLY", "AUTHORISED ONLY", 384, 64, {}],
  ["FLIGHT DECK 4", "FLIGHT DECK 4", 512, 64, {}],
  ["KEEP CLEAR", "KEEP CLEAR", 512, 64, {}],
  ["TRACTOR EMITTER", "TRACTOR EMITTER", 512, 64, {}],
  ["FORWARD SECTIONS", "FORWARD SECTIONS", 512, 64, {}],
  ["HIGH VOLTAGE", "HIGH VOLTAGE", 512, 64, {}],
  ["LIFT LOBBY", "LIFT LOBBY", 512, 64, {}],
  ["BAY 1", "BAY 1", 256, 64, {}],
  ["BAY 2", "BAY 2", 256, 64, {}],
  ["BAY 3", "BAY 3", 256, 64, {}],
  ["BAY 4", "BAY 4", 256, 64, {}],
  ["SEALED", "SEALED", 256, 64, {}],
  ["FIRE", "FIRE", 256, 64, {}],
  ["FUEL", "FUEL", 256, 64, {}],
  ["CAUTION", "CAUTION", 256, 64, {}],
  ["DECK 4", "DECK 4", 256, 64, {}],
  ["ARROW", null, 256, 64, { arrow: true }],
  ["HOLD SHORT", "HOLD SHORT", 384, 64, {}],
  ["CREW ACCESS", "CREW ACCESS", 384, 64, {}],
];
for (const side of ["P", "S"]) for (const tier of [1, 2]) for (let i = 1; i <= 7; i++) {
  const s = `${side}${tier}-${String(i).padStart(2, "0")}`;
  LABEL_SPEC.push([s, s, 96, 40, {}]);
}
// giant wall stencils (one glyph each) and the soft contact-shadow blob (drawn dark under the props)
LABEL_SPEC.push(["4", "4", 192, 192, { weight: 900 }], ["P", "P", 192, 192, { weight: 900 }], ["S", "S", 192, 192, { weight: 900 }], ["SHADOW", null, 320, 192, { shadow: true }]);

export const LABELS = {};

function buildAtlas() {
  const c = document.createElement("canvas");
  c.width = c.height = ATLAS;
  const g = c.getContext("2d");
  g.clearRect(0, 0, ATLAS, ATLAS);
  let x = 0, y = 0, rowH = 0;
  for (const [name, text, w, h, opt] of LABEL_SPEC) {
    if (x + w > ATLAS || (rowH && h !== rowH)) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    if (y + h > ATLAS) throw new Error("hangar label atlas overflow at " + name);
    rowH = Math.max(rowH, h);
    // cell (1 px transparent margin so bilinear filtering never bleeds a neighbour in)
    const pad = 2;
    g.save();
    g.beginPath();
    g.rect(x + pad, y + pad, w - 2 * pad, h - 2 * pad);
    g.clip();
    g.fillStyle = "#ffffff";
    if (opt.arrow) {
      // chevron arrow pointing +u
      const cx = x + w / 2, cy = y + h / 2, L = w * 0.36, H = h * 0.36;
      g.beginPath();
      g.moveTo(cx - L, cy - H * 0.45);
      g.lineTo(cx + L * 0.25, cy - H * 0.45);
      g.lineTo(cx + L * 0.25, cy - H);
      g.lineTo(cx + L, cy);
      g.lineTo(cx + L * 0.25, cy + H);
      g.lineTo(cx + L * 0.25, cy + H * 0.45);
      g.lineTo(cx - L, cy + H * 0.45);
      g.closePath();
      g.fill();
    } else if (opt.shadow) {
      // soft elliptical blob: opaque core fading to nothing at the cell edge
      const cx = x + w / 2, cy = y + h / 2;
      g.translate(cx, cy);
      g.scale(w / 2 - pad, h / 2 - pad);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.85)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.35)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
    } else {
      let px = Math.floor(h * 0.72);
      g.textAlign = "center";
      g.textBaseline = "middle";
      const font = (p) => `${opt.weight || 700} ${p}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
      const setFont = (p) => {
        g.font = font(p);
        // wide tracking for signage (canvas letterSpacing; ignored where unsupported)
        if (opt.spacing) g.letterSpacing = `${Math.round(p * opt.spacing)}px`;
      };
      setFont(px);
      // shrink to fit the cell width with a margin (text width scales linearly with the font size)
      const avail = w - 2 * pad - h * 0.25;
      const wid = g.measureText(text).width;
      if (wid > avail) {
        px = Math.max(8, Math.floor((px * avail) / wid));
        setFont(px);
      }
      g.fillText(text, x + w / 2, y + h / 2 + px * 0.04);
      if (opt.spacing) g.letterSpacing = "0px";
      if (opt.bridges !== false) {
        // stencil look: letters cut by two thin horizontal bridges
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = "#000";
        const bh = Math.max(1, Math.round(px * 0.045));
        g.fillRect(x, y + h / 2 - px * 0.16, w, bh);
        g.fillRect(x, y + h / 2 + px * 0.22, w, bh);
        g.globalCompositeOperation = "source-over";
      }
    }
    g.restore();
    LABELS[name] = { rect: [x / ATLAS, 1 - (y + h) / ATLAS, (x + w) / ATLAS, 1 - y / ATLAS], aspect: w / h };
    x += w;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Deck-plate sheet: one 8 m tile (1024 px, 128 px/m) of four 4 m plates. Near-white base so the vertex
// tone sets the plate colour; 10 cm seams at 0.2 with a bevel highlight on one edge, a rivet row inside
// every plate edge, recessed tie-down rings on the two diagonal plate centres, per-plate tone steps,
// low-frequency variation, faint scuffs and skid streaks (low contrast: at 1.7 m eye height the wear
// must read as use, not as a smudge). The G channel also drives the roughness (see hgDeck).
// ---------------------------------------------------------------------------
export const DECK_TILE = 8; // metres per repeat
function buildDeckSheet(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const ppm = size / DECK_TILE; // px per metre
  let s = 91;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grey = (v, a = 1) => `rgba(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)},${a})`;
  g.fillStyle = grey(0.9);
  g.fillRect(0, 0, size, size);
  // low-frequency variation: a 16 px noise image scaled up with bilinear smoothing, multiplied in
  const n = document.createElement("canvas");
  n.width = n.height = 16;
  const ng = n.getContext("2d");
  const img = ng.createImageData(16, 16);
  for (let i = 0; i < 256; i++) {
    const v = Math.round((0.9 + rnd() * 0.1) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "multiply";
  g.drawImage(n, 0, 0, size, size);
  // per-plate tone steps (two of the four plates a touch darker: the field never reads as one sheet)
  const half = size / 2;
  for (const [px, py, k] of [[0, 0, 0.985], [half, 0, 0.955], [0, half, 0.965], [half, half, 1.0]]) {
    g.fillStyle = grey(k);
    g.fillRect(px, py, half, half);
  }
  g.globalCompositeOperation = "source-over";
  // scuffs: soft dark ellipses, and skid streaks along v (the hall's z axis)
  for (let i = 0; i < 70; i++) {
    const cx = rnd() * size, cy = rnd() * size, rx = (0.15 + rnd() * 0.6) * ppm, ry = (0.1 + rnd() * 0.4) * ppm;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, grey(0.3, 0.05 + rnd() * 0.07));
    grad.addColorStop(1, grey(0.3, 0));
    g.fillStyle = grad;
    g.save();
    g.translate(cx, cy);
    g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    g.beginPath();
    g.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * size, y0 = rnd() * size, len = (0.6 + rnd() * 2.4) * ppm, w = 2 + rnd() * 6;
    const grad = g.createLinearGradient(0, y0, 0, y0 + len);
    grad.addColorStop(0, grey(0.25, 0));
    grad.addColorStop(0.3, grey(0.25, 0.05 + rnd() * 0.06));
    grad.addColorStop(1, grey(0.25, 0));
    g.fillStyle = grad;
    g.fillRect(x - w / 2, y0, w, len);
  }
  // tie-down rings on two diagonal plate centres (recess disc, shadow crescent, ring, steel bar)
  for (const [cx, cy] of [[size / 4, size / 4], [(3 * size) / 4, (3 * size) / 4]]) {
    const r = 0.15 * ppm;
    g.fillStyle = grey(0.62);
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = grey(0.42);
    g.beginPath();
    g.arc(cx, cy, r * 0.82, Math.PI * 0.9, Math.PI * 2.1);
    g.fill();
    g.lineWidth = 0.035 * ppm;
    g.strokeStyle = grey(0.22);
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = grey(0.8);
    g.fillRect(cx - r * 0.75, cy - 0.02 * ppm, r * 1.5, 0.04 * ppm);
  }
  // rivet rows 12 cm inside every plate edge, one every 0.5 m
  g.fillStyle = grey(0.62);
  const inset = 0.12 * ppm, step = 0.5 * ppm, dot = 0.02 * ppm;
  for (const px0 of [0, half]) {
    for (const py0 of [0, half]) {
      for (let k = 0.25 * ppm; k < half; k += step) {
        g.fillRect(px0 + k - dot, py0 + inset - dot, 2 * dot, 2 * dot);
        g.fillRect(px0 + k - dot, py0 + half - inset - dot, 2 * dot, 2 * dot);
        g.fillRect(px0 + inset - dot, py0 + k - dot, 2 * dot, 2 * dot);
        g.fillRect(px0 + half - inset - dot, py0 + k - dot, 2 * dot, 2 * dot);
      }
    }
  }
  // seams: 10 cm dark at every 4 m line (wrapping at the tile edge), bevel highlight on the +side
  const sw = 0.1 * ppm, hl = 0.025 * ppm;
  const seam = (p) => {
    g.fillStyle = grey(0.2);
    g.fillRect(p - sw / 2, 0, sw, size);
    g.fillRect(0, p - sw / 2, size, sw);
    g.fillStyle = grey(0.97);
    g.fillRect(p + sw / 2, 0, hl, size);
    g.fillRect(0, p + sw / 2, size, hl);
  };
  seam(half);
  seam(0);
  seam(size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Containment field: additive blue shimmer over the aperture, animated by uTime (set from update(dt, t)).
// UVs are metres from the hole corner; uSize is the hole size for the rim fade.
// ---------------------------------------------------------------------------
function buildField() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(72, 124) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uSize;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv;
        float t = uTime;
        // slow interference of two large waves + a fine cell pattern that drifts
        float a = sin(p.x * 0.55 + t * 0.7) * sin(p.y * 0.42 - t * 0.5);
        float b = sin((p.x + p.y) * 0.21 + t * 0.35);
        float cell = 0.5 + 0.5 * sin(p.x * 1.9 + t * 0.9) * sin(p.y * 1.9 - t * 1.3);
        // a scan band sweeping along z every ~9 s
        float scan = exp(-pow(mod(p.y - t * 14.0, uSize.y) - uSize.y * 0.5, 2.0) / 40.0);
        // rim: a visible blue glow that fades over ~6 m from the hole edge (the field "grips" the lip)
        float d = min(min(p.x, uSize.x - p.x), min(p.y, uSize.y - p.y));
        float rim = exp(-d * 0.6); // soft glow over ~3 m
        float core = exp(-d * 2.2); // bright line where the field meets the lip
        float rimFlicker = 0.85 + 0.15 * sin(t * 5.0 + d * 2.0);
        // linear-light levels: the open field stays around 0.01-0.03 (≈ 12 % opacity on screen) so the
        // stars read through it; the rim and the scan band are the bright parts
        float k = 0.007 + 0.004 * a + 0.003 * b + 0.004 * cell + 0.012 * scan + 0.1 * rim * rimFlicker;
        vec3 col = vec3(0.28, 0.55, 1.0) * k + vec3(0.55, 0.82, 1.0) * (rim * 0.06 + core * 0.3) * rimFlicker;
        gl_FragColor = vec4(col, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
}

/**
 * Deck plating: the sheet is the albedo and, through its G channel, the roughness: dark seams, rings and
 * scuffs are rough (they eat the sheen), the clean plate is semi-gloss so the flood pools sit on it.
 * three.js multiplies `roughness` by the sampled G; the patch remaps that sample (linear light 0.83 for
 * the plate, ~0.03 for a seam) to 0.5 .. 0.95 instead. The second patch scales the image-based
 * (indirect) light on the plating only: the harness environment is a bright studio box that a 160 x
 * 240 m deck seen at grazing angles mirrors as an even light-grey wash (three.js applies
 * scene.environmentIntensity to every material, so envMapIntensity cannot do this); with the indirect
 * held down the deck stays dark between the flood pools, and the pools are the direct light.
 */
function makeDeck(sheet) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: sheet, roughnessMap: sheet, roughness: 1, metalness: 0.35, envMapIntensity: 0.4 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("roughnessFactor *= texelRoughness.g;", "roughnessFactor *= clamp(0.97 - 0.565 * texelRoughness.g, 0.3, 1.0);")
      .replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n\tradiance *= 0.3;\n\tiblIrradiance *= 0.45;");
  };
  m.customProgramCacheKey = () => "hgDeck-roughness-remap-ibl";
  return m;
}

/**
 * Called by the registry as manifest.materials(shared). Returns the local material map; the same
 * material objects are kept in `live` so build()/update() can animate them.
 */
export const live = { field: null, pulse: null };

export function makeMaterials(shared) {
  const atlas = buildAtlas();
  const sheet = buildDeckSheet(1024);
  live.field = buildField();
  live.pulse = new THREE.MeshStandardMaterial({ color: 0x1a0606, emissive: new THREE.Color("#ff2018"), emissiveIntensity: 1.3, roughness: 0.45, metalness: 0 });
  const decalOpts = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  return {
    hgDeck: makeDeck(sheet),
    // ceiling cells: the panel tint plus a faint self-lit term (about 0.05 of the panel colour), so the
    // roof reads as structure from the deck instead of a void behind the light channels
    hgCeil: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: new THREE.Color("#8d9198"), emissiveIntensity: 0.18, roughness: 0.9, metalness: 0 }),
    // painted stencils and the contact-shadow blob (vertex colour = paint colour); on deck plating and panels
    hgDecal: new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.8, metalness: 0, vertexColors: true, envMapIntensity: 0.3, ...decalOpts }),
    // lit signage: white letters
    hgSign: new THREE.MeshStandardMaterial({ map: atlas, color: 0xffffff, emissive: new THREE.Color("#dfe8ff"), emissiveMap: atlas, emissiveIntensity: 1.5, roughness: 0.6, metalness: 0, ...decalOpts }),
    // lit signage: red letters
    hgSignRed: new THREE.MeshStandardMaterial({ map: atlas, color: 0xff6a5a, emissive: new THREE.Color("#ff3a2a"), emissiveMap: atlas, emissiveIntensity: 1.6, roughness: 0.6, metalness: 0, ...decalOpts }),
    emitField: live.field,
    hgPulse: live.pulse,
  };
}

/** per-frame animation of the local materials (t = module clock seconds) */
export function animateMaterials(t) {
  if (live.field) live.field.uniforms.uTime.value = t;
  // 0.8 .. 1.5: the peak sits just over the bloom threshold (1.15) so the lens glows red, never clips to orange
  if (live.pulse) live.pulse.emissiveIntensity = 0.8 + 0.7 * (0.5 + 0.5 * Math.sin(t * 3.6));
}
