// Module-local materials for d4-hangar (COORDINATION.md §10: manifest.materials(shared) -> {key: Material},
// <= 2 canvas textures <= 1024^2). Exactly two canvases: a label/stencil atlas (signage, deck stencils,
// the contact-shadow blob, the wear and baked-shadow gradients) and the 8 m deck-plate sheet (plates,
// seams with grime, tie-down rings, wear) that is both the albedo and the roughness map of the plating.
// The containment field is a ShaderMaterial (no texture). Everything original; procedural text only.
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Label atlas: text stencils and soft alpha shapes packed into one 1024^2 canvas. LABELS[name] =
// {rect: [u0, v0, u1, v1], aspect}. Rows are grouped by cell height (the packer starts a new row when the
// height changes or the row is full), so the spec is ordered to fill every row exactly: 72 + 9 x 64 + 3 x
// 32 + 160 + 120 = 1024 px.
// ---------------------------------------------------------------------------
const ATLAS = 1024;
const LABEL_SPEC = [
  // [name, text, cellW, cellH, options]
  ["HANGAR CONTROL", "HANGAR CONTROL", 768, 72, { weight: 900, spacing: 0.22, bridges: false }],
  ["DECK", "DECK", 256, 72, { weight: 900, worn: true }],
  ["FLIGHT DECK 4", "FLIGHT DECK 4", 512, 64, {}],
  ["KEEP CLEAR", "KEEP CLEAR", 512, 64, {}],
  ["TRACTOR EMITTER", "TRACTOR EMITTER", 512, 64, {}],
  ["FORWARD SECTIONS", "FORWARD SECTIONS", 512, 64, {}],
  ["HIGH VOLTAGE", "HIGH VOLTAGE", 512, 64, {}],
  ["LIFT LOBBY", "LIFT LOBBY", 512, 64, {}],
  ["APERTURE - KEEP CLEAR", "APERTURE \u2014 KEEP CLEAR", 512, 64, {}],
  ["STREAK", null, 512, 64, { streak: true }],
  ["MAINT ACCESS", "MAINT ACCESS", 384, 64, {}],
  ["AUTHORISED ONLY", "AUTHORISED ONLY", 384, 64, {}],
  ["DECK 4", "DECK 4", 256, 64, { worn: true }],
  ["HOLD SHORT", "HOLD SHORT", 384, 64, {}],
  ["CREW ACCESS", "CREW ACCESS", 384, 64, {}],
  ["ARROW", null, 256, 64, { arrow: true }],
  ["BAY 1", "BAY 1", 256, 64, {}],
  ["BAY 2", "BAY 2", 256, 64, {}],
  ["BAY 3", "BAY 3", 256, 64, {}],
  ["BAY 4", "BAY 4", 256, 64, {}],
  ["SEALED", "SEALED", 256, 64, {}],
  ["FIRE", "FIRE", 256, 64, {}],
  ["FUEL", "FUEL", 256, 64, {}],
  ["CAUTION", "CAUTION", 256, 64, {}],
  ["01", "01", 160, 64, {}],
  ["02", "02", 160, 64, {}],
  ["03", "03", 160, 64, {}],
  ["04", "04", 160, 64, {}],
  ["05", "05", 160, 64, {}],
  ["06", "06", 160, 64, {}],
  ["GRAD", null, 64, 64, { grad: true }],
];
for (const side of ["P", "S"]) for (const tier of [1, 2]) for (let i = 1; i <= 7; i++) {
  const s = `${side}${tier}-${String(i).padStart(2, "0")}`;
  LABEL_SPEC.push([s, s, 80, 32, {}]);
}
// giant wall stencils (one worn glyph each), the soft contact-shadow blob (drawn dark under the props)
// and the landing-pad scuff arc; last row: the soft square that tiles the occlusion pools under the
// rectangular footprints (72 + 9 x 64 + 3 x 32 + 160 + 120 = 1024 px)
LABEL_SPEC.push(["4", "4", 160, 160, { weight: 900, worn: true }], ["P", "P", 160, 160, { weight: 900, worn: true }], ["S", "S", 160, 160, { weight: 900, worn: true }], ["SHADOW", null, 272, 160, { shadow: true }], ["ARC", null, 160, 160, { arc: true }]);
LABEL_SPEC.push(["SQSHADOW", null, 120, 120, { square: true }]);

export const LABELS = {};

/**
 * Shared shadow falloff: alpha over s = 0 (the contact line / occluder edge) .. 1 (the end of the
 * penumbra). A smoothstep held near 1 over the first fifth, so the pool stays near-black for a while
 * before it falls away; GRAD (one-sided, the edge strips and the wall AO) and SQSHADOW (the corners
 * of the deck pools) both sample it, so a pool composed from the two cells has no seams.
 */
export const FALLOFF = (s) => {
  const t = Math.min(1, Math.max(0, s));
  return 1 - t * t * (3 - 2 * t);
};

/**
 * Sub-rectangle of an atlas cell in fractions of its padded interior (0 = the first drawn texel, 1 =
 * the last), for quads that map only part of a cell: the opaque centre / a corner of SQSHADOW, or a
 * GRAD strip without the transparent 2 px margin that would otherwise draw a hairline gap at its ends.
 */
export function cellRect(name, fu0, fv0, fu1, fv1) {
  const L = LABELS[name];
  const [u0, v0, u1, v1] = L.rect;
  const [pu, pv] = L.pad;
  const du = (u1 - u0) * (1 - 2 * pu), dv = (v1 - v0) * (1 - 2 * pv);
  const a = u0 + (u1 - u0) * pu, b = v0 + (v1 - v0) * pv;
  return [a + du * fu0, b + dv * fv0, a + du * fu1, b + dv * fv1];
}

function buildAtlas() {
  const c = document.createElement("canvas");
  c.width = c.height = ATLAS;
  const g = c.getContext("2d");
  g.clearRect(0, 0, ATLAS, ATLAS);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let x = 0, y = 0, rowH = 0;
  for (const [name, text, w, h, opt] of LABEL_SPEC) {
    if (x + w > ATLAS || (rowH && h !== rowH)) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    if (y + h > ATLAS) throw new Error("hangar label atlas overflow at " + name);
    rowH = Math.max(rowH, h);
    // cell (2 px transparent margin so bilinear filtering never bleeds a neighbour in)
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
      // elliptical occlusion pool: opaque over the inner 70 % (the footprint plus the contact line), then
      // a short penumbra to nothing at the cell edge
      const cx = x + w / 2, cy = y + h / 2;
      g.translate(cx, cy);
      g.scale(w / 2 - pad, h / 2 - pad);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.7, "rgba(255,255,255,1)");
      grad.addColorStop(0.86, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
    } else if (opt.square) {
      // soft square occlusion tile: opaque over the inner 70 % of the cell, falling to nothing at the edge
      // along both axes on the shared FALLOFF (a product of the two ramps, so the corners fade too);
      // util.occlusionPool maps its centre and its corners under the rectangular footprints
      const ramp = (t) => FALLOFF((Math.abs(t) - 0.7) / 0.3);
      const img = g.createImageData(w - 2 * pad, h - 2 * pad);
      for (let j = 0; j < h - 2 * pad; j++) {
        const tv = ((j + 0.5) / (h - 2 * pad)) * 2 - 1;
        for (let i = 0; i < w - 2 * pad; i++) {
          const tu = ((i + 0.5) / (w - 2 * pad)) * 2 - 1;
          const k = (j * (w - 2 * pad) + i) * 4;
          img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
          img.data[k + 3] = Math.round(255 * ramp(tu) * ramp(tv));
        }
      }
      g.putImageData(img, x + pad, y + pad);
    } else if (opt.grad) {
      // one-sided baked-shadow gradient on the shared FALLOFF: opaque at u = 0, gone at u = 1 (placed
      // with u pointing away from the pilaster / ledge / wall base / prop that casts it), constant along
      // v; near-black over the first fifth so a 2 m flank still reads as shadow at 70 m on a half-size
      // frame
      const grad = g.createLinearGradient(x + pad, 0, x + w - pad, 0);
      for (let k = 0; k <= 10; k++) grad.addColorStop(k / 10, `rgba(255,255,255,${FALLOFF(k / 10).toFixed(3)})`);
      g.fillStyle = grad;
      g.fillRect(x, y, w, h);
    } else if (opt.streak) {
      // tyre / drag streak: a bell profile across v, strongest at u = 0 fading to 20 % at u = 1, broken
      // up by tread gaps
      const yc = y + h / 2;
      for (let r = pad; r < h - pad; r++) {
        const a = Math.exp(-Math.pow((y + r + 0.5 - yc) / (h * 0.26), 2));
        const grad = g.createLinearGradient(x + pad, 0, x + w - pad, 0);
        grad.addColorStop(0, `rgba(255,255,255,${(1.0 * a).toFixed(3)})`);
        grad.addColorStop(0.45, `rgba(255,255,255,${(0.72 * a).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255,255,255,${(0.25 * a).toFixed(3)})`);
        g.fillStyle = grad;
        g.fillRect(x + pad, y + r, w - 2 * pad, 1);
      }
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 46; i++) {
        const gw = 6 + rnd() * 30, gh = 3 + rnd() * 7;
        g.fillStyle = `rgba(0,0,0,${(0.35 + rnd() * 0.45).toFixed(2)})`;
        g.fillRect(x + rnd() * w, y + h * 0.2 + rnd() * h * 0.6 - gh / 2, gw, gh);
      }
      g.globalCompositeOperation = "source-over";
    } else if (opt.arc) {
      // landing-pad scuff: a 160 degree arc of the cell circle, soft edged (three strokes), fading along
      // its length, broken by a few gaps
      const cx = x + w / 2, cy = y + h / 2, R = w * 0.36, n = 26, a0 = -0.35, a1 = 2.45;
      for (const [lw, k] of [[w * 0.17, 0.45], [w * 0.11, 0.6], [w * 0.05, 0.8]]) {
        g.lineWidth = lw;
        g.lineCap = "round";
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          g.strokeStyle = `rgba(255,255,255,${(k * (1 - 0.8 * t0)).toFixed(3)})`;
          g.beginPath();
          g.arc(cx, cy, R, a0 + (a1 - a0) * t0, a0 + (a1 - a0) * t1 + 0.01);
          g.stroke();
        }
      }
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 10; i++) {
        const a = a0 + rnd() * (a1 - a0), r = R + (rnd() - 0.5) * w * 0.12;
        g.fillStyle = `rgba(0,0,0,${(0.3 + rnd() * 0.5).toFixed(2)})`;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + rnd() * 7, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
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
      if (opt.worn) {
        // worn paint: flaked speckles and a few scratches eat into the glyphs
        g.globalCompositeOperation = "destination-out";
        const n = Math.round((w * h) / 380);
        for (let i = 0; i < n; i++) {
          g.fillStyle = `rgba(0,0,0,${(0.35 + rnd() * 0.6).toFixed(2)})`;
          g.beginPath();
          g.ellipse(x + rnd() * w, y + rnd() * h, 1 + rnd() * h * 0.03, 1 + rnd() * h * 0.02, rnd() * Math.PI, 0, Math.PI * 2);
          g.fill();
        }
        g.strokeStyle = "rgba(0,0,0,0.7)";
        for (let i = 0; i < 6; i++) {
          g.lineWidth = 1 + rnd() * h * 0.012;
          const sx = x + rnd() * w, sy = y + rnd() * h;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + (rnd() - 0.3) * w * 0.5, sy + (rnd() - 0.5) * h * 0.6);
          g.stroke();
        }
        g.globalCompositeOperation = "source-over";
      }
    }
    g.restore();
    LABELS[name] = { rect: [x / ATLAS, 1 - (y + h) / ATLAS, (x + w) / ATLAS, 1 - y / ATLAS], aspect: w / h, pad: [pad / w, pad / h] };
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
// tone sets the plate colour (deck.js steps it per plate); 10 cm seams at 0.2 with a bevel highlight on
// one edge and a 35 cm grime gradient either side, grime pockets along the seams, a rivet row inside
// every plate edge, recessed tie-down rings on the two diagonal plate centres, low-frequency variation,
// scuffs and skid streaks. Dark = rough: the G channel also drives the roughness (see hgDeck), so the
// grime, rings and scuffs are duller than the clean plate.
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
    const v = Math.round((0.86 + rnd() * 0.14) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "multiply";
  g.drawImage(n, 0, 0, size, size);
  // per-plate tone steps inside the sheet (small: the per-plate vertex tone carries the big steps)
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
    grad.addColorStop(0, grey(0.3, 0.08 + rnd() * 0.1));
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
    grad.addColorStop(0.3, grey(0.25, 0.08 + rnd() * 0.08));
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
  // rivet rows 12 cm inside every plate edge, one every 0.5 m (a dark shadow dot under each head)
  const inset = 0.12 * ppm, step = 0.5 * ppm, dot = 0.02 * ppm;
  for (const px0 of [0, half]) {
    for (const py0 of [0, half]) {
      for (let k = 0.25 * ppm; k < half; k += step) {
        for (const [rx, ry] of [[px0 + k, py0 + inset], [px0 + k, py0 + half - inset], [px0 + inset, py0 + k], [px0 + half - inset, py0 + k]]) {
          g.fillStyle = grey(0.3);
          g.fillRect(rx - dot, ry - dot + 1.5, 2 * dot, 2 * dot);
          g.fillStyle = grey(0.66);
          g.fillRect(rx - dot, ry - dot, 2 * dot, 2 * dot);
        }
      }
    }
  }
  // seam grime: a 35 cm gradient either side of every 4 m line (drawn before the seam so the seam edge
  // stays crisp), plus soft grime pockets sitting on the seams
  const sw = 0.1 * ppm, hl = 0.025 * ppm, gw = 0.35 * ppm;
  const grime = (p) => {
    for (const dir of [-1, 1]) {
      const a = p + dir * sw / 2, b = p + dir * (sw / 2 + gw);
      const gx = g.createLinearGradient(a, 0, b, 0);
      gx.addColorStop(0, grey(0.1, 0.34));
      gx.addColorStop(0.4, grey(0.1, 0.14));
      gx.addColorStop(1, grey(0.1, 0));
      g.fillStyle = gx;
      g.fillRect(Math.min(a, b), 0, gw, size);
      const gy = g.createLinearGradient(0, a, 0, b);
      gy.addColorStop(0, grey(0.1, 0.34));
      gy.addColorStop(0.4, grey(0.1, 0.14));
      gy.addColorStop(1, grey(0.1, 0));
      g.fillStyle = gy;
      g.fillRect(0, Math.min(a, b), size, gw);
    }
  };
  grime(half);
  grime(0);
  grime(size);
  for (let i = 0; i < 22; i++) {
    const along = rnd() * size, off = (rnd() - 0.5) * 0.3 * ppm, line = [0, half, size][Math.floor(rnd() * 3)];
    const [cx, cy] = rnd() < 0.5 ? [line + off, along] : [along, line + off];
    const r = (0.25 + rnd() * 0.45) * ppm;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, grey(0.12, 0.28 + rnd() * 0.16));
    grad.addColorStop(1, grey(0.12, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  // seams: 10 cm dark at every 4 m line (wrapping at the tile edge), bevel highlight on the +side
  const seam = (p) => {
    g.fillStyle = grey(0.16);
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
        // rim: a blue glow that fades over ~2 m from the hole edge (the field "grips" the lip)
        float d = min(min(p.x, uSize.x - p.x), min(p.y, uSize.y - p.y));
        float rim = exp(-d * 0.9); // soft glow over ~2 m
        float core = exp(-d * 2.6); // line where the field meets the lip
        float rimFlicker = 0.85 + 0.15 * sin(t * 5.0 + d * 2.0);
        // linear-light levels: the open field body stays around 0.002 (2-3 % on screen after the tone
        // curve) so space reads near-black through it; the rim glow and the grip line at the lip are kept
        // low too (from the aperture camera the near rim fills the strip under the sign plate at a
        // grazing angle: it must stay a dark band with a faint blue edge, not a pale one)
        float k = 0.002 + 0.0012 * a + 0.0008 * b + 0.001 * cell + 0.005 * scan + 0.035 * rim * rimFlicker;
        vec3 col = vec3(0.28, 0.55, 1.0) * k + vec3(0.55, 0.82, 1.0) * (rim * 0.02 + core * 0.16) * rimFlicker;
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
 * Deck plating: the sheet is the albedo and, through its G channel, the roughness: dark seams, grime,
 * rings and scuffs are rough (they eat the sheen), the clean plate is semi-gloss so the flood pools sit
 * on it. three.js multiplies `roughness` by the sampled G; the patch remaps that sample (linear light
 * 0.83 for the plate, ~0.03 for a seam) to 0.45 .. 0.95, then steps it per plate from the vertex tone
 * (deck.js gives every plate one of four tones): the darkest and the lightest plates are the glossiest
 * (polished by traffic / fresh plate), the two mid tones are duller, so a flood pool's specular smear
 * breaks up plate by plate instead of running across the deck as one sheet. The second patch scales the
 * image-based (indirect) light on the plating only: the harness environment is a bright studio box that
 * a 160 x 240 m deck seen at grazing angles mirrors as an even light-grey wash (three.js applies
 * scene.environmentIntensity to every material, so envMapIntensity cannot do this); with the indirect
 * held down the deck stays dark between the flood pools, and the pools are the direct light.
 */
function makeDeck(sheet) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: sheet, roughnessMap: sheet, roughness: 1, metalness: 0.35, envMapIntensity: 0.4 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "roughnessFactor *= texelRoughness.g;",
        [
          "roughnessFactor *= clamp(0.93 - 0.53 * texelRoughness.g, 0.3, 1.0);",
          "{",
          "\t// tone steps (deck.js): lane / aperture set 0.030 0.040 0.055 0.074, field set 0.094 0.128 0.174 0.236",
          "\tfloat plateTone = vColor.g;",
          "\tfloat plateGloss = plateTone < 0.035 ? 0.8 : plateTone < 0.047 ? 1.3 : plateTone < 0.064 ? 1.0 : plateTone < 0.084 ? 0.72",
          "\t\t: plateTone < 0.11 ? 0.8 : plateTone < 0.15 ? 1.3 : plateTone < 0.2 ? 1.0 : 0.72;",
          "\troughnessFactor = clamp(roughnessFactor * plateGloss, 0.25, 1.0);",
          "}",
        ].join("\n"),
      )
      .replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n\tradiance *= 0.3;\n\tiblIrradiance *= 0.55;");
  };
  m.customProgramCacheKey = () => "hgDeck-roughness-remap-ibl-plates";
  return m;
}

/**
 * Deck / wall decals (stencils, wear, occlusion pools): dielectric with the indirect specular held down
 * like the plating, but duller than the average plate (0.75 against the plates' 0.45 .. 0.95): rubber
 * deposits and scuffed paint have no polish, and at the grazing angle of the deck view a 0.5-rough
 * black track mirrored the far rail strips more sharply than the plates around it and read as a
 * light streak - a tyre track must be the dark band at every angle.
 */
function makeDecal(atlas, decalOpts) {
  const m = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.75, metalness: 0, vertexColors: true, envMapIntensity: 0.4, ...decalOpts });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n\tradiance *= 0.3;");
  };
  m.customProgramCacheKey = () => "hgDecal-ibl";
  return m;
}

/**
 * Emitter whose level is the vertex colour (linear light): one material key for every fixture that must
 * glow without clipping - the housed ceiling and wall flood lenses just under the bloom threshold, the
 * caged jamb bars, the balcony strip, the amber glow behind the vent louvres, the tower window bands
 * (layout.EM lists the levels). three.js only scales the diffuse by the vertex colour; the patch scales
 * the emissive radiance by it as well.
 */
function makeEmit() {
  const m = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, emissive: new THREE.Color(0xffffff), emissiveIntensity: 1, vertexColors: true, roughness: 0.5, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;");
  };
  m.customProgramCacheKey = () => "hgEmit-vertex-level";
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
    // ceiling cells: the panel tint plus a very faint self-lit term, so the roof reads as dark structure
    // (beams, trusses, purlins in the environment fill) with the housed floods as the only bright parts
    hgCeil: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: new THREE.Color("#8d9198"), emissiveIntensity: 0.07, roughness: 0.9, metalness: 0 }),
    // vertex-level emitter (see makeEmit)
    hgEmit: makeEmit(),
    // painted stencils, the occlusion pools, the wear streaks and the baked-shadow gradients (vertex
    // colour = paint colour; black for shadow and wear); on deck plating and panels (see makeDecal)
    hgDecal: makeDecal(atlas, decalOpts),
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
