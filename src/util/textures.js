/**
 * Procedural texture factory.
 *
 * Everything the renderer samples is generated here at boot from canvas draw
 * calls plus noise - there are no image downloads anywhere in the project.
 * Results are cached by key so repeated material builds share GPU uploads.
 */

import * as THREE from 'three';
import { Noise } from './noise.js';
import { makeRng } from './rng.js';
import { clamp01, lerp, smoothstep } from './mathx.js';

const cache = new Map();
const tn = new Noise(7771);
const tn2 = new Noise(31337);

function canvas(size, h = size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = h;
  return c;
}

function finish(c, { repeat = 1, srgb = true, aniso = 4, mag = THREE.LinearFilter } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  tex.magFilter = mag;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/**
 * Seamlessly tiling value-noise fbm.
 *
 * The general-purpose `Noise` here is not periodic, so tiling a texture built
 * from it leaves a visible seam. This walks a hash grid whose indices wrap at
 * the octave frequency, which makes every octave periodic over the unit square
 * and the assembled texture tileable at any repeat.
 */
function tileableFbm(u, v, octaves, base, seed) {
  let amp = 0.5, sum = 0, norm = 0, f = base;
  for (let o = 0; o < octaves; o++) {
    const fx = Math.floor(u * f), fy = Math.floor(v * f);
    const tx = u * f - fx, ty = v * f - fy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const h = (i, j) => {
      const a = ((i % f) + f) % f, b = ((j % f) + f) % f;
      let n = a * 374761393 + b * 668265263 + seed * 1274126177 + o * 2246822519;
      n = (n ^ (n >>> 13)) * 1274126177;
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    const n = lerp(
      lerp(h(fx, fy), h(fx + 1, fy), sx),
      lerp(h(fx, fy + 1), h(fx + 1, fy + 1), sx),
      sy,
    );
    sum += n * amp; norm += amp;
    amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

/**
 * Macro ground variation, three independent bands in RGB.
 *
 * Tiled detail alone leaves a desert reading as one flat tone with an obvious
 * repeat. This is sampled at a much larger scale than the detail map to break
 * the surface into drifts, gravel patches and washes.
 *
 *   R - broad tonal drift
 *   G - patchiness for the gravel / rock blend
 *   B - fine mottle, still well above detail-map frequency
 */
export function macroGround(size = 256, seed = 4) {
  return cached(`macro:${size}:${seed}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const i = (y * size + x) * 4;
        img.data[i] = tileableFbm(u, v, 4, 2, seed) * 255;
        img.data[i + 1] = tileableFbm(u, v, 5, 3, seed + 91) * 255;
        img.data[i + 2] = tileableFbm(u, v, 4, 6, seed + 217) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { repeat: 1, srgb: false, aniso: 2 });
  });
}

/** Derive a tangent-space normal map from a grayscale height canvas. */
export function heightToNormal(heightCanvas, strength = 2.2) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Grayscale canvas -> single channel texture (roughness / ao / metalness). */
export function grayTexture(c, repeat = 1) {
  return finish(c, { repeat, srgb: false });
}

// ---------------------------------------------------------------------------
// Ground surfaces
// ---------------------------------------------------------------------------

function concreteCanvas(size, seed, opts = {}) {
  const { base = 138, spread = 22, slabs = 4, stains = true } = opts;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = makeRng(seed);

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 8, v = y / size * 8;
      let n = tn.fbm2(u, v, 5) * 0.5 + 0.5;
      // Aggregate speckle
      const spec = tn2.noise2(x * 0.55, y * 0.55) * 0.5 + 0.5;
      n = n * 0.72 + Math.pow(spec, 3) * 0.28;
      let g = base + (n - 0.5) * spread * 2;
      // Fine pitting
      if (rng() > 0.988) g -= 26 + rng() * 30;
      const i = (y * size + x) * 4;
      img.data[i] = g * 1.02;
      img.data[i + 1] = g;
      img.data[i + 2] = g * 0.94;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Slab expansion joints
  ctx.lineWidth = Math.max(1, size / 220);
  const step = size / slabs;
  for (let i = 0; i <= slabs; i++) {
    const p = Math.round(i * step);
    ctx.strokeStyle = 'rgba(56,54,50,0.72)';
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    ctx.strokeStyle = 'rgba(210,206,196,0.16)';
    ctx.beginPath(); ctx.moveTo(p + 1.5, 0); ctx.lineTo(p + 1.5, size); ctx.moveTo(0, p + 1.5); ctx.lineTo(size, p + 1.5); ctx.stroke();
  }

  // Cracks
  for (let k = 0; k < 5; k++) {
    let x = rng() * size, y = rng() * size, a = rng() * Math.PI * 2;
    ctx.strokeStyle = `rgba(64,60,56,${0.3 + rng() * 0.3})`;
    ctx.lineWidth = 0.7 + rng();
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 30; s++) {
      a += (rng() - 0.5) * 0.8;
      x += Math.cos(a) * size * 0.012; y += Math.sin(a) * size * 0.012;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (stains) {
    for (let k = 0; k < 26; k++) {
      const x = rng() * size, y = rng() * size, r = size * (0.02 + rng() * 0.09);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = rng() > 0.4;
      g.addColorStop(0, dark ? 'rgba(52,48,44,0.3)' : 'rgba(196,188,172,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Tyre / track scuffs
    for (let k = 0; k < 7; k++) {
      ctx.save();
      ctx.translate(rng() * size, rng() * size);
      ctx.rotate(rng() * Math.PI);
      ctx.fillStyle = `rgba(40,38,36,${0.06 + rng() * 0.1})`;
      ctx.fillRect(-size * 0.3, -size * 0.012, size * 0.6, size * 0.024);
      ctx.restore();
    }
  }
  return c;
}

export function concreteMaps(size = 512, seed = 11) {
  return cached(`concrete:${size}:${seed}`, () => {
    const albedo = concreteCanvas(size, seed);
    // Height from a lower-frequency version of the same noise field
    const hc = canvas(size);
    const hx = hc.getContext('2d');
    const img = hx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = tn.fbm2(x / size * 10, y / size * 10, 4) * 0.5 + 0.5;
        const i = (y * size + x) * 4;
        const g = n * 190 + 30;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
      }
    }
    hx.putImageData(img, 0, 0);
    // Joint grooves push into the height field
    hx.strokeStyle = 'rgba(0,0,0,0.85)';
    hx.lineWidth = Math.max(1, size / 200);
    const step = size / 4;
    for (let i = 0; i <= 4; i++) {
      const p = Math.round(i * step);
      hx.beginPath(); hx.moveTo(p, 0); hx.lineTo(p, size); hx.moveTo(0, p); hx.lineTo(size, p); hx.stroke();
    }
    const rough = canvas(size);
    const rx = rough.getContext('2d');
    rx.drawImage(albedo, 0, 0);
    rx.globalCompositeOperation = 'source-over';
    rx.fillStyle = 'rgba(150,150,150,0.55)';
    rx.fillRect(0, 0, size, size);
    return {
      map: finish(albedo, { repeat: 1 }),
      normalMap: finish(heightToNormal(hc, 1.5), { repeat: 1, srgb: false }),
      roughnessMap: grayTexture(rough),
    };
  });
}

export function sandMaps(size = 512) {
  return cached(`sand:${size}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const dune = tn.fbm2(u * 6, v * 6, 4) * 0.5 + 0.5;
        const grain = tn2.noise2(x * 0.9, y * 0.9) * 0.5 + 0.5;
        const rip = Math.sin((u * 40 + dune * 8) * Math.PI) * 0.5 + 0.5;
        const t = dune * 0.6 + grain * 0.22 + rip * 0.18;
        const i = (y * size + x) * 4;
        // Desert tan, deliberately desaturated: the lighting pass adds the warmth.
        img.data[i] = lerp(152, 202, t);
        img.data[i + 1] = lerp(138, 186, t);
        img.data[i + 2] = lerp(114, 156, t);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Scattered pebbles / scrub shadows
    const rng = makeRng(5);
    for (let k = 0; k < 700; k++) {
      const x = rng() * size, y = rng() * size, r = rng() * 1.9 + 0.4;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(96,84,66,0.45)' : 'rgba(214,196,164,0.4)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const hc = canvas(256);
    const hx = hc.getContext('2d');
    const him = hx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const n = tn.fbm2(x / 256 * 14, y / 256 * 14, 4) * 0.5 + 0.5;
        const i = (y * 256 + x) * 4;
        him.data[i] = him.data[i + 1] = him.data[i + 2] = n * 255; him.data[i + 3] = 255;
      }
    }
    hx.putImageData(him, 0, 0);
    return {
      map: finish(c, { repeat: 1 }),
      normalMap: finish(heightToNormal(hc, 1.1), { repeat: 1, srgb: false }),
    };
  });
}

export function gravelMap(size = 256) {
  return cached(`gravel:${size}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#6d6558'; ctx.fillRect(0, 0, size, size);
    const rng = makeRng(88);
    for (let k = 0; k < 5200; k++) {
      const x = rng() * size, y = rng() * size, r = rng() * 2.6 + 0.6;
      const g = 70 + rng() * 90;
      ctx.fillStyle = `rgb(${g * 1.05},${g},${g * 0.88})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.5), rng() * 3, 0, Math.PI * 2); ctx.fill();
    }
    return finish(c, { repeat: 1 });
  });
}

// ---------------------------------------------------------------------------
// Painted / military metal
// ---------------------------------------------------------------------------

/**
 * Painted metal panel with panel lines, rivets, scratches, grime and optional
 * camo blotches. Used for shelters, launchers, vehicles and equipment.
 */
export function paintedMetal(opts = {}) {
  const {
    size = 512, color = '#4c5347', seed = 3, panel = 6, rivets = true,
    camo = null, wear = 0.5, grime = 0.5, stencil = null, key = '',
  } = opts;
  return cached(`metal:${key || JSON.stringify(opts)}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rng = makeRng(seed);

    ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);

    // Subtle paint mottling
    const img = ctx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = tn.fbm2(x / size * 7 + seed, y / size * 7, 4);
        const i = (y * size + x) * 4;
        const d = n * 13;
        img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d;
      }
    }
    ctx.putImageData(img, 0, 0);

    if (camo) {
      for (const spec of camo) {
        ctx.fillStyle = spec.color;
        const blobs = spec.blobs ?? 12;
        for (let b = 0; b < blobs; b++) {
          const cx = rng() * size, cy = rng() * size;
          const r = size * (spec.scale ?? 0.12) * (0.6 + rng() * 0.8);
          ctx.beginPath();
          const pts = 9;
          for (let p = 0; p <= pts; p++) {
            const a = (p / pts) * Math.PI * 2;
            const rr = r * (0.62 + (tn2.noise2(Math.cos(a) * 2 + b, Math.sin(a) * 2 + spec.scale * 10) * 0.5 + 0.5) * 0.8);
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
            p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill();
        }
      }
    }

    // Panel lines
    if (panel > 0) {
      const step = size / panel;
      for (let i = 1; i < panel; i++) {
        const p = Math.round(i * step) + (rng() - 0.5) * 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.34)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p + 1.6, 0); ctx.lineTo(p + 1.6, size); ctx.stroke();
      }
      for (let i = 1; i < panel; i++) {
        const p = Math.round(i * step) + (rng() - 0.5) * 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.26)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
      }
    }

    // Rivets along panel seams
    if (rivets) {
      const step = size / panel;
      for (let i = 0; i <= panel; i++) {
        for (let j = 0; j < size; j += Math.max(8, size / 32)) {
          const x = i * step, y = j + (rng() - 0.5) * 2;
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.arc(x + 0.6, y + 0.9, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Scratches and chips
    const scratches = Math.round(60 * wear);
    for (let k = 0; k < scratches; k++) {
      const x = rng() * size, y = rng() * size, a = rng() * Math.PI * 2;
      const len = size * (0.01 + rng() * 0.08);
      ctx.strokeStyle = rng() > 0.5 ? `rgba(226,224,214,${0.1 + rng() * 0.2})` : `rgba(28,26,24,${0.1 + rng() * 0.2})`;
      ctx.lineWidth = 0.6 + rng() * 0.9;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
    for (let k = 0; k < Math.round(36 * wear); k++) {
      const x = rng() * size, y = rng() * size, r = 1 + rng() * 3.4;
      ctx.fillStyle = `rgba(112,96,72,${0.24 + rng() * 0.36})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Grime streaks running down the panel
    for (let k = 0; k < Math.round(26 * grime); k++) {
      const x = rng() * size, y = rng() * size * 0.7;
      const h = size * (0.1 + rng() * 0.35), w = 1.6 + rng() * 7;
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, `rgba(30,26,20,${0.06 + rng() * 0.16})`);
      g.addColorStop(1, 'rgba(30,26,20,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }

    // Ambient occlusion at panel corners
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);

    if (stencil) {
      ctx.save();
      ctx.translate(size * (stencil.x ?? 0.5), size * (stencil.y ?? 0.5));
      if (stencil.rot) ctx.rotate(stencil.rot);
      ctx.font = `700 ${Math.round(size * (stencil.size ?? 0.06))}px ${'ui-monospace, monospace'}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = stencil.color ?? 'rgba(224,220,208,0.62)';
      ctx.fillText(stencil.text, 0, 0);
      ctx.restore();
    }

    // Roughness: paint is fairly matte, scratches and wear are shinier
    const rc = canvas(size);
    const rx = rc.getContext('2d');
    rx.fillStyle = '#b8b8b8'; rx.fillRect(0, 0, size, size);
    rx.globalAlpha = 0.5; rx.drawImage(c, 0, 0); rx.globalAlpha = 1;

    const hc = canvas(size);
    const hx = hc.getContext('2d');
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, size, size);
    if (panel > 0) {
      const step = size / panel;
      hx.strokeStyle = 'rgba(0,0,0,0.9)'; hx.lineWidth = 1.6;
      for (let i = 1; i < panel; i++) {
        const p = Math.round(i * step);
        hx.beginPath(); hx.moveTo(p, 0); hx.lineTo(p, size); hx.stroke();
        hx.beginPath(); hx.moveTo(0, p); hx.lineTo(size, p); hx.stroke();
      }
    }
    if (rivets) {
      const step = size / panel;
      hx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i <= panel; i++) {
        for (let j = 0; j < size; j += Math.max(8, size / 32)) {
          hx.beginPath(); hx.arc(i * step, j, 1.6, 0, Math.PI * 2); hx.fill();
        }
      }
    }
    return {
      map: finish(c, { repeat: 1 }),
      roughnessMap: grayTexture(rc),
      normalMap: finish(heightToNormal(hc, 1.0), { repeat: 1, srgb: false }),
    };
  });
}

/** Diagonal hazard stripes - barriers, launcher rails, warning kerbs. */
export function hazardStripes(a = '#e0b23a', b = '#20201e', stripes = 8, size = 256) {
  return cached(`hazard:${a}:${b}:${stripes}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = b; ctx.fillRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(-Math.PI / 4); ctx.translate(-size, -size);
    const w = (size * 2) / stripes;
    ctx.fillStyle = a;
    for (let i = 0; i < stripes * 2; i += 2) ctx.fillRect(i * w, 0, w, size * 2);
    ctx.restore();
    // Weathering
    const rng = makeRng(21);
    for (let k = 0; k < 120; k++) {
      ctx.fillStyle = `rgba(60,56,50,${0.05 + rng() * 0.2})`;
      const x = rng() * size, y = rng() * size, r = rng() * 8 + 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return finish(c, { repeat: 1 });
  });
}

/** Ground markings decal: pad numbers, keep-clear boxes, blast arrows. */
export function padMarking(text, opts = {}) {
  const { size = 512, color = 'rgba(232,226,206,0.85)', frame = true, sub = '' } = opts;
  return cached(`mark:${text}:${sub}:${frame}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    if (frame) {
      ctx.strokeStyle = color; ctx.lineWidth = size * 0.028;
      ctx.setLineDash([size * 0.09, size * 0.05]);
      ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(size * 0.26)}px ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size * (sub ? 0.44 : 0.5));
    if (sub) {
      ctx.font = `700 ${Math.round(size * 0.085)}px ui-monospace, monospace`;
      ctx.fillText(sub, size / 2, size * 0.63);
    }
    // Scuff the paint so it does not look freshly printed
    const rng = makeRng(text.length * 17 + 3);
    ctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 260; k++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rng() * 0.5})`;
      const x = rng() * size, y = rng() * size, r = rng() * 9 + 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const t = finish(c, { repeat: 1 });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Heat-discoloured metal for nozzles and blast deflectors. */
export function heatMetal(size = 256, seed = 9) {
  return cached(`heat:${seed}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0.0, '#8e8b86');
    g.addColorStop(0.28, '#6d6a66');
    g.addColorStop(0.5, '#4b423c');
    g.addColorStop(0.66, '#5c3f33');
    g.addColorStop(0.8, '#3f3230');
    g.addColorStop(1.0, '#211d1c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = tn.fbm2(x / size * 9 + seed, y / size * 5, 4);
        const i = (y * size + x) * 4;
        // Iridescent temper colours bias toward blue/violet in patches
        img.data[i] += n * 26;
        img.data[i + 1] += n * 14;
        img.data[i + 2] += n * 34;
      }
    }
    ctx.putImageData(img, 0, 0);
    const rng = makeRng(seed);
    for (let k = 0; k < 90; k++) {
      const x = rng() * size, y = rng() * size, r = rng() * 12 + 2;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(${120 + rng() * 60},${60 + rng() * 40},${40 + rng() * 30},0.22)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return { map: finish(c, { repeat: 1 }) };
  });
}

/** Rubber / tyre tread. */
export function tyreTread(size = 128) {
  return cached('tyre', () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c1c1e'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2a2a2c';
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.translate(0, (i / 10) * size);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(size, size * 0.03); ctx.lineTo(size, size * 0.055); ctx.lineTo(0, size * 0.028);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const rng = makeRng(4);
    for (let k = 0; k < 200; k++) {
      ctx.fillStyle = `rgba(${90 + rng() * 40},${84 + rng() * 30},${70 + rng() * 20},${rng() * 0.22})`;
      ctx.fillRect(rng() * size, rng() * size, rng() * 3, rng() * 3);
    }
    return finish(c, { repeat: 1 });
  });
}

/** Chain-link fence: alpha-cut diamond mesh. */
export function chainLink(size = 256) {
  return cached('chainlink', () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(178,180,176,0.95)';
    ctx.lineWidth = size * 0.022;
    const cells = 8, step = size / cells;
    for (let i = -cells; i <= cells * 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step + size, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * step, size); ctx.lineTo(i * step + size, 0); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(60,60,58,0.5)';
    ctx.lineWidth = size * 0.012;
    for (let i = -cells; i <= cells * 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * step + 2, 2); ctx.lineTo(i * step + size + 2, size + 2); ctx.stroke();
    }
    return finish(c, { repeat: 1 });
  });
}

// ---------------------------------------------------------------------------
// Sprites (particles, flares, decals)
// ---------------------------------------------------------------------------

/** Soft turbulent puff used for smoke, dust and exhaust. */
export function smokePuff(size = 128, seed = 3) {
  return cached(`puff:${seed}:${size}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const n = new Noise(seed);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - half) / half, dy = (y - half) / half;
        const r = Math.hypot(dx, dy);
        let a = clamp01(1 - r);
        a = Math.pow(a, 1.5);
        const turb = n.fbm2(x / size * 4.5, y / size * 4.5, 5) * 0.5 + 0.5;
        a *= 0.35 + turb * 0.95;
        a = clamp01(a * smoothstep((1 - r) * 1.6));
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

/**
 * Dense, lobed cloud used for a whole detonation cloud in one billboard.
 *
 * `smokePuff` is built to be stacked hundreds deep, so its alpha falls away
 * almost immediately from the centre. A single billboard standing in for a
 * whole cloud needs a wide opaque plateau and an irregular edge instead.
 */
export function cloudBlob(size = 256, seed = 5) {
  return cached(`blob:${seed}:${size}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const n = new Noise(seed);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - half) / half, dy = (y - half) / half;
        const r = Math.hypot(dx, dy);
        // Lobed silhouette: the outer radius wanders with the bearing.
        const ang = Math.atan2(dy, dx);
        const lobe = n.fbm2(Math.cos(ang) * 1.7 + seed, Math.sin(ang) * 1.7, 4) * 0.5 + 0.5;
        const edge = 0.55 + lobe * 0.42;
        let a = 1 - smoothstep(clamp01((r - edge * 0.42) / Math.max(0.05, edge * 0.58)));
        // Internal billows so the disc does not read as flat.
        const turb = n.fbm2(x / size * 3.4 + 17, y / size * 3.4, 5) * 0.5 + 0.5;
        a *= 0.62 + turb * 0.62;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = clamp01(a) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

/** Hot core sprite: bright center falling off fast - flames, flares, sparks. */
export function glowSprite(size = 128, power = 3.2, key = 'glow') {
  return cached(`${key}:${size}:${power}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - half) / half, dy = (y - half) / half;
        const r = Math.min(1, Math.hypot(dx, dy));
        const a = Math.pow(1 - r, power);
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

/** Anamorphic-ish streak used for lens flare and launch glare. */
export function streakSprite(w = 256, h = 32) {
  return cached(`streak:${w}x${h}`, () => {
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const vg = ctx.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(0,0,0,1)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Scorch decal for ground blast marks. */
export function scorchDecal(size = 256, seed = 12) {
  return cached(`scorch:${seed}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const n = new Noise(seed);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - half) / half, dy = (y - half) / half;
        const ang = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy);
        const edge = 0.62 + (n.fbm2(Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, 4) * 0.5 + 0.5) * 0.36;
        let a = clamp01((edge - r) / 0.4);
        a = Math.pow(a, 1.3);
        const grain = n.fbm2(x / size * 8, y / size * 8, 4) * 0.5 + 0.5;
        a *= 0.5 + grain * 0.7;
        const i = (y * size + x) * 4;
        const v = 20 + grain * 26;
        img.data[i] = v; img.data[i + 1] = v * 0.92; img.data[i + 2] = v * 0.86;
        img.data[i + 3] = clamp01(a) * 235;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Tileable 3D-ish noise packed into a 2D atlas, for shader turbulence. */
export function noiseTexture(size = 128, seed = 5) {
  return cached(`noisetex:${size}:${seed}`, () => {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const n = new Noise(seed);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        img.data[i] = (n.fbm2(x / size * 5, y / size * 5, 4) * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.fbm2(x / size * 11 + 30, y / size * 11, 3) * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.noise2(x / size * 23 + 90, y / size * 23) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    return t;
  });
}

/** Draw CRT-style text onto an existing 2D context. */
export function drawScreen(ctx, size, lines, opts = {}) {
  const { bg = '#04120c', color = '#7ef7bd', title = '' } = opts;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(126,247,189,0.13)';
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  ctx.fillStyle = color;
  if (title) {
    ctx.font = `700 ${Math.round(size * 0.07)}px ui-monospace, monospace`;
    ctx.fillText(title, size * 0.06, size * 0.12);
    ctx.fillRect(size * 0.06, size * 0.15, size * 0.88, 1.5);
  }
  ctx.font = `${Math.round(size * 0.055)}px ui-monospace, monospace`;
  lines.forEach((l, i) => ctx.fillText(l, size * 0.06, size * (0.24 + i * 0.075)));
}

/** One-shot emissive text texture (used for static labels). */
export function screenTexture(lines, opts = {}) {
  const { size = 256 } = opts;
  const c = canvas(size);
  drawScreen(c.getContext('2d'), size, lines, opts);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A persistent CRT surface: one canvas and one GPU texture that get redrawn in
 * place. Console screens update several times a second, so allocating a fresh
 * texture each time would leak GPU memory steadily through a scenario.
 */
export class ScreenSurface {
  constructor(size = 256, opts = {}) {
    this.size = size;
    this.opts = opts;
    this.canvas = canvas(size);
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.draw([]);
  }

  draw(lines, opts = {}) {
    drawScreen(this.ctx, this.size, lines, { ...this.opts, ...opts });
    this.texture.needsUpdate = true;
    return this.texture;
  }

  dispose() { this.texture.dispose(); }
}

export function clearTextureCache() { cache.clear(); }
export { canvas as makeCanvas, finish as finishTexture };
