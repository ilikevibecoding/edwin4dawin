import * as THREE from 'three';
import { rand, randRange } from '../core/rand.js';

/**
 * Weapon material library. Every material gets subtle procedural canvas maps
 * (roughness variation + normal noise) so big flat surfaces don't read as CG plastic.
 * Deterministic: uses the seeded RNG.
 */

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function tex(c, { srgb = false, repeat = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Blotchy grayscale noise around `base` (0..1), used as a roughness map. */
function noiseCanvas(size, base, amp, blotches = 220) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const v = Math.round(base * 255);
  g.fillStyle = `rgb(${v},${v},${v})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < blotches; i++) {
    const x = rand() * size, y = rand() * size, r = randRange(size * 0.02, size * 0.14);
    const lighter = rand() > 0.5;
    const a = randRange(0.04, 0.14) * (amp / 0.15);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, lighter ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fine grain
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amp * 90;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Subtle tangent-space normal noise (RGB ~ 128,128,255). */
function normalNoiseCanvas(size, amp = 9) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128 + (rand() - 0.5) * amp * 2;
    d[i + 1] = 128 + (rand() - 0.5) * amp * 2;
    d[i + 2] = 255;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Albedo w/ mottling + faint light scratches (worn anodizing / handled polymer). */
function albedoCanvas(size, hex, { mottle = 0.06, scratches = 26, scratchAlpha = 0.10 } = {}) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  g.fillStyle = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 140; i++) {
    const x = rand() * size, y = rand() * size, r = randRange(size * 0.03, size * 0.16);
    const lighter = rand() > 0.45;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, lighter ? `rgba(210,215,220,${mottle * rand()})` : `rgba(0,0,0,${mottle * rand()})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < scratches; i++) {
    const x = rand() * size, y = rand() * size;
    const a = rand() * Math.PI * 2, l = randRange(size * 0.02, size * 0.1);
    g.strokeStyle = `rgba(190,195,200,${scratchAlpha * randRange(0.4, 1)})`;
    g.lineWidth = randRange(0.5, 1.2);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

/** Stipple-dot bump for grip panels / textured polymer. */
function stippleCanvas(size, pitch = 9, r = 3) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < size / pitch; y++) {
    for (let x = 0; x < size / pitch; x++) {
      const px = x * pitch + (y % 2 ? pitch / 2 : 0), py = y * pitch;
      const gr = g.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#808080');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(px, py, r, 0, 7);
      g.fill();
    }
  }
  return c;
}

/** Diamond-checker bump for 1911 grip panels. */
function checkerCanvas(size, cells = 14) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = '#707070';
  g.fillRect(0, 0, size, size);
  const s = size / cells;
  g.translate(size / 2, size / 2);
  g.rotate(Math.PI / 4);
  g.translate(-size, -size);
  for (let y = 0; y < cells * 3; y++) {
    for (let x = 0; x < cells * 3; x++) {
      const gr = g.createRadialGradient(x * s + s / 2, y * s + s / 2, 0, x * s + s / 2, y * s + s / 2, s * 0.55);
      gr.addColorStop(0, '#e8e8e8');
      gr.addColorStop(1, '#606060');
      g.fillStyle = gr;
      g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
    }
  }
  return c;
}

/** Woven fabric bump for gloves/sleeves. */
function fabricCanvas(size) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = '#7d7d7d';
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 3) {
    g.fillStyle = y % 6 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)';
    g.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 3) {
    g.fillStyle = x % 6 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.11)';
    g.fillRect(x, 0, 1, size);
  }
  return c;
}

export function makeWeaponMaterials() {
  const roughMid = tex(noiseCanvas(192, 0.44, 0.16), { repeat: 3 });
  const roughHi = tex(noiseCanvas(192, 0.80, 0.11), { repeat: 3 });
  const roughLow = tex(noiseCanvas(128, 0.30, 0.10), { repeat: 3 });
  const nrm = tex(normalNoiseCanvas(128, 7), { repeat: 3 });
  const recvMap = tex(albedoCanvas(256, 0x44464b, { mottle: 0.05, scratches: 30, scratchAlpha: 0.13 }), { srgb: true, repeat: 2 });
  const polyMap = tex(albedoCanvas(256, 0x2e2d2c, { mottle: 0.05, scratches: 12, scratchAlpha: 0.05 }), { srgb: true, repeat: 2 });
  const stipple = tex(stippleCanvas(128, 8, 2.6), { repeat: 3 });
  const checker = tex(checkerCanvas(128, 12), { repeat: 1 });
  const fabric = tex(fabricCanvas(128), { repeat: 4 });

  const M = (opts) => new THREE.MeshStandardMaterial(opts);

  const mats = {
    // anodized aluminum receiver — slightly blue-gray, worn
    receiver: M({
      map: recvMap, color: 0xb6bac2, metalness: 0.86, roughness: 1.0, roughnessMap: roughMid,
      normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.0,
    }),
    // darker hard-anodized handguard/rail
    receiverDark: M({
      map: recvMap, color: 0x84878d, metalness: 0.85, roughness: 1.0, roughnessMap: roughMid,
      normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.0,
    }),
    // polymer furniture: stock, grips, mags — dark warm gray, not pure black
    polymer: M({
      map: polyMap, color: 0xe8e2da, metalness: 0.0, roughness: 1.0, roughnessMap: roughHi,
      normalMap: nrm, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.65,
    }),
    // textured polymer (grips) w/ stipple bump
    gripPoly: M({
      color: 0x2c2b29, metalness: 0.0, roughness: 0.88,
      bumpMap: stipple, bumpScale: 0.7, envMapIntensity: 0.6,
    }),
    // blued steel barrel/small parts
    steel: M({
      color: 0x50555e, metalness: 0.92, roughness: 1.0, roughnessMap: roughLow,
      normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.15,
    }),
    // bright machined steel (bolt carrier, pistol barrel)
    steelBright: M({
      color: 0xc7ccd2, metalness: 1.0, roughness: 0.3, roughnessMap: roughLow, envMapIntensity: 1.3,
    }),
    // pistol slide — darker blued steel, distinct from the frame
    slideSteel: M({
      color: 0x33363c, metalness: 0.88, roughness: 1.0, roughnessMap: roughMid,
      normalMap: nrm, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 0.9,
    }),
    brass: M({ color: 0xd9a84e, metalness: 1.0, roughness: 0.24, envMapIntensity: 1.4 }),
    rubber: M({ color: 0x222223, metalness: 0.0, roughness: 0.94, envMapIntensity: 0.4 }),
    // near-black cavity filler (ejection ports, slots, vents)
    cavity: M({ color: 0x060606, metalness: 0.2, roughness: 0.9, envMapIntensity: 0.15 }),
    // worn edges — brighter bare aluminum for scratch accents
    wearEdge: M({ color: 0x9aa0a6, metalness: 0.95, roughness: 0.34, envMapIntensity: 1.2 }),
    // 1911 wood grip panels
    wood: M({
      color: 0x6b4423, metalness: 0.0, roughness: 0.52,
      bumpMap: checker, bumpScale: 0.9, envMapIntensity: 0.8,
    }),
    // optic glass
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9db8c4, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.13,
      envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    }),
    glassBlue: new THREE.MeshPhysicalMaterial({
      color: 0x5f8fb8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22,
      envMapIntensity: 2.0, side: THREE.DoubleSide, depthWrite: false,
    }),
    // emissive red dot reticle (blooms)
    redDot: M({ color: 0x000000, emissive: 0xff1a10, emissiveIntensity: 13, toneMapped: true }),
    sightDot: M({ color: 0xf5fff0, emissive: 0xcfff9a, emissiveIntensity: 2.2 }),
    // tritium-style white sight paint
    // gloves + sleeve
    glove: M({
      color: 0x322f24, metalness: 0.0, roughness: 0.96,
      bumpMap: fabric, bumpScale: 0.4, envMapIntensity: 0.45,
    }),
    gloveTan: M({
      color: 0x4e4130, metalness: 0.0, roughness: 0.92,
      bumpMap: fabric, bumpScale: 0.35, envMapIntensity: 0.4,
    }),
    knuckle: M({ color: 0x26251f, metalness: 0.05, roughness: 0.6, envMapIntensity: 0.7 }),
    sleeve: M({
      color: 0x35352a, metalness: 0.0, roughness: 0.97,
      bumpMap: fabric, bumpScale: 0.55, envMapIntensity: 0.4,
    }),
    // optic housing interior/exterior (open tube — needs both faces)
    opticBody: M({
      color: 0x232427, metalness: 0.55, roughness: 0.55, envMapIntensity: 0.9,
      side: THREE.DoubleSide,
    }),
    // grenade
    olive: M({
      color: 0x424a2c, metalness: 0.12, roughness: 0.62, roughnessMap: roughHi,
      normalMap: nrm, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 0.8,
    }),
    grenadeSteel: M({ color: 0x6a6d66, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.0 }),
  };
  return mats;
}
