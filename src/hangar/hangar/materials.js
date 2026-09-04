// Module-local materials for d4-hangar (COORDINATION.md §10: manifest.materials(shared) -> {key: Material},
// <= 2 canvas textures <= 1024^2). Two canvases: a label/stencil atlas and a black/yellow hazard tile.
// The containment field is a ShaderMaterial (no texture). Everything original; procedural text only.
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Label atlas: text stencils packed into one 1024^2 canvas. LABELS[name] = [u0, v0, u1, v1] + aspect.
// ---------------------------------------------------------------------------
const ATLAS = 1024;
const LABEL_SPEC = [
  // [name, text, cellW, cellH, options]
  ["HANGAR CONTROL", "HANGAR CONTROL", 1024, 112, { weight: 900, spacing: 0.22, bridges: false }],
  ["MAINT ACCESS", "MAINT ACCESS", 512, 80, {}],
  ["AUTHORISED ONLY", "AUTHORISED ONLY", 512, 80, {}],
  ["CATWALK 3", "CATWALK 3", 512, 80, {}],
  ["01", "01", 256, 128, {}],
  ["02", "02", 256, 128, {}],
  ["03", "03", 256, 128, {}],
  ["04", "04", 256, 128, {}],
  ["05", "05", 256, 128, {}],
  ["06", "06", 256, 128, {}],
  ["FLIGHT DECK 4", "FLIGHT DECK 4", 512, 80, {}],
  ["KEEP CLEAR", "KEEP CLEAR", 512, 80, {}],
  ["TRACTOR EMITTER", "TRACTOR EMITTER", 512, 80, {}],
  ["FORWARD SECTIONS", "FORWARD SECTIONS", 512, 80, {}],
  ["HIGH VOLTAGE", "HIGH VOLTAGE", 512, 80, {}],
  ["LIFT LOBBY", "LIFT LOBBY", 512, 80, {}],
  ["BAY 1", "BAY 1", 256, 80, {}],
  ["BAY 2", "BAY 2", 256, 80, {}],
  ["BAY 3", "BAY 3", 256, 80, {}],
  ["BAY 4", "BAY 4", 256, 80, {}],
  ["SEALED", "SEALED", 256, 80, {}],
  ["FIRE", "FIRE", 256, 80, {}],
  ["FUEL", "FUEL", 256, 80, {}],
  ["NO ENTRY", "NO ENTRY", 256, 80, {}],
  ["CAUTION", "CAUTION", 256, 80, {}],
  ["DECK 4", "DECK 4", 256, 80, {}],
  ["ARROW", null, 256, 80, { arrow: true }],
  ["CRANE", "CRANE 1", 256, 80, {}],
];
for (const side of ["P", "S"]) for (const tier of [1, 2]) for (let i = 1; i <= 7; i++) {
  const s = `${side}${tier}-${String(i).padStart(2, "0")}`;
  LABEL_SPEC.push([s, s, 128, 40, {}]);
}

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
// Black / yellow hazard tile (the shared `hazard` is orange). 45 deg stripes, 4 pairs per tile.
// ---------------------------------------------------------------------------
function buildHazard(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grain = new Float32Array(size * size);
  for (let i = 0; i < grain.length; i++) grain[i] = rnd();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const st = ((u + v) * 4) % 1;
      const yellow = st < 0.5;
      // soft edge between stripes + fine wear speckle
      const e = Math.min(Math.abs(st - 0.5), Math.abs(st), Math.abs(st - 1)) * size * 0.5;
      const k = Math.min(1, e / 1.2);
      const i = (y * size + x) * 4;
      const n = grain[y * size + x];
      const wear = n > 0.965 ? 0.55 : 1;
      let r, gg, b;
      if (yellow) {
        r = 0.90 * wear; gg = 0.76 * wear; b = 0.20 * wear;
      } else {
        r = 0.085; gg = 0.085; b = 0.095;
        if (n > 0.975) { r = gg = b = 0.28; }
      }
      // blend toward the other colour at the stripe edge
      const mix = 1 - k;
      const or = yellow ? 0.085 : 0.9, og = yellow ? 0.085 : 0.76, ob = yellow ? 0.095 : 0.2;
      img.data[i] = Math.round((r * (1 - mix * 0.5) + or * mix * 0.5) * 255);
      img.data[i + 1] = Math.round((gg * (1 - mix * 0.5) + og * mix * 0.5) * 255);
      img.data[i + 2] = Math.round((b * (1 - mix * 0.5) + ob * mix * 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
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
        float rim = exp(-d * 0.45);
        float rimFlicker = 0.85 + 0.15 * sin(t * 5.0 + d * 2.0);
        // linear-light levels: the open field stays around 0.01-0.03 (≈ 12 % opacity on screen) so the
        // stars read through it; the rim and the scan band are the bright parts
        float k = 0.007 + 0.004 * a + 0.003 * b + 0.004 * cell + 0.012 * scan + 0.06 * rim * rimFlicker;
        vec3 col = vec3(0.28, 0.55, 1.0) * k + vec3(0.5, 0.8, 1.0) * rim * rimFlicker * 0.035;
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
 * Called by the registry as manifest.materials(shared). Returns the local material map; the same
 * material objects are kept in `live` so build()/update() can animate them.
 */
export const live = { field: null, pulse: null };

export function makeMaterials(shared) {
  const atlas = buildAtlas();
  const hazard = buildHazard(256);
  live.field = buildField();
  live.pulse = new THREE.MeshStandardMaterial({ color: 0x1a0606, emissive: new THREE.Color("#ff2018"), emissiveIntensity: 1.3, roughness: 0.45, metalness: 0 });
  const decalOpts = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  return {
    hgHazard: new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.6, metalness: 0.08, envMapIntensity: 0.5 }),
    // painted stencils (vertex colour = paint colour); on deck plating and panels
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
