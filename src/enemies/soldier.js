import * as THREE from 'three';
import { makeRNG, clamp, lerp, smoothstep } from '../core/utils.js';

// ===========================================================================
// Procedural enemy soldier — modern military hostile built from primitives.
// Articulated rig: pelvis / spine / head / two-bone-IK arms / legs, with the
// rifle mounted at the right shoulder. Hands are hard-mounted to rifle-space
// anchors (wrist IK target + forced hand orientation) so palms/fingers always
// wrap the pistol grip and handguard with slight intersection — no air gaps.
// Code-driven animation: weighted walk gait with counter-rotating shoulders
// vs hips, contrapposto idle weight shift, combat crouch, scanning idle, hit
// flinch and a two-stage buckling death fall. Surfacing is fully baked at
// startup: multi-scale camo cloth with wrinkle/AO/seam shading + matching
// roughness/normal maps, MOLLE plate carrier, camo helmet cover. Heads are
// fully covered: knit balaclava (or shemagh wrap) under worn dark ballistic
// goggles — no baked skin/eyes anywhere.
// ===========================================================================

const rng = makeRNG(5555);

// Rig constants (meters, world space at identity)
const HIP_Y = 0.98;          // hips group rest height
const THIGH_LEN = 0.44;
const CALF_LEN = 0.40;
const UPPER_ARM = 0.29;
const FOREARM = 0.28;

// ---------------------------------------------------------------------------
// Material kits — three squad uniform variants, shared across instances.
// Everything is baked into small (<=256px) canvases at startup: multi-scale
// camo with cloth shading (wrinkle striations, joint AO, stitched seams,
// sun-bleached shoulders, dusty lower legs), MOLLE webbing on the carrier,
// knit balaclava with a skin eye slit, camo helmet cover with scuffs. Each
// albedo ships a matching roughness map (sheen rides the wrinkle crests) and
// a normal map derived from the SAME height field so light and paint agree.
// ---------------------------------------------------------------------------
function m(color, rough = 0.92, metal = 0, envInt = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: envInt });
}

// Deterministic value-noise for the local camo maps (independent of the
// shared materials.js cache so we control blob scale + value directly).
function makeValueNoise(seed) {
  const r = makeRNG(seed);
  const N = 64;
  const g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = r();
  const sm = (t) => t * t * (3 - 2 * t);
  const at = (ix, iy) => g[(iy & (N - 1)) * N + (ix & (N - 1))];
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = sm(x - ix), fy = sm(y - iy);
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => noise(x, y) * 0.62 + noise(x * 2.13, y * 2.13) * 0.38;
}

// --- canvas plumbing --------------------------------------------------------
function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function canvasTex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Tangent-space normal map from a height field (bumpMap blacks out under
// SwiftShader, so wrinkles/webbing must go through real normal maps).
function heightToNormalTex(H, S, strength) {
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const at = (x, y) => H[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (y * S + x) * 4;
      img.data[o] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTex(canvas, false);
}

// Roughness canvas — MeshStandardMaterial reads the GREEN channel.
function roughnessTex(S, fn) {
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const r = clamp(fn(x / S, y / S, y * S + x), 0.25, 1);
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = r * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTex(canvas, false);
}

// Per-pixel noise overlay pass on top of ctx-drawn art (weave + grime).
function overlayWeave(ctx, S, seed, amp, grimeBottom = 0) {
  const img = ctx.getImageData(0, 0, S, S);
  const n = makeValueNoise(seed);
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    const grime = 1 - grimeBottom * smoothstep(0.7, 1.0, vt);
    for (let x = 0; x < S; x++) {
      const w = (1 - amp * 0.5 + n(x * 0.47, y * 0.47) * amp) * grime;
      const o = (y * S + x) * 4;
      img.data[o] *= w;
      img.data[o + 1] *= w;
      img.data[o + 2] *= w;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// --- uniform cloth ----------------------------------------------------------
// Shared height field per body part: drives baked albedo shading AND the
// normal/roughness maps so all three stay in register. Canvas row 0 = top of
// the part (shoulders / armpit / crotch+knee-back); cylinders wrap in u with
// the pattern mirrored at u=0.5 so the wrap seam is continuous (the visible
// discontinuity lines are covered by baked stitched seams).
const CLOTH_FIELDS = new Map();
function clothField(part) {
  if (CLOTH_FIELDS.has(part)) return CLOTH_FIELDS.get(part);
  const S = 256;
  const spec = {
    torso: { seed: 811, k: 5, amp: 0.55, horiz: 0, lean: 0.4, mirror: false },
    arm: { seed: 823, k: 8, amp: 0.85, horiz: 7, lean: 0.9, mirror: true },
    leg: { seed: 829, k: 7, amp: 0.75, horiz: 5, lean: 0.65, mirror: true },
  }[part];
  const n1 = makeValueNoise(spec.seed), n2 = makeValueNoise(spec.seed + 5), n3 = makeValueNoise(spec.seed + 11);
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const um = spec.mirror ? Math.abs(u - 0.5) * 2 : u;
      // vertical wrinkle striations — warped and amplitude-clustered so folds
      // hang like cloth instead of ruling the surface like corduroy
      const warp = (n1(um * 2.2, vt * 1.6) - 0.5) * 2.4 + vt * spec.lean;
      const amp = Math.max(0, n2(um * 2.7, vt * 2.7) * 1.6 - 0.42);
      let h = Math.sin((u * spec.k + warp) * Math.PI * 2) * 0.5 * amp * spec.amp;
      // horizontal bunching where sleeves/trousers gather at the joints
      if (spec.horiz) {
        const bunch = Math.pow(Math.max(0, 1 - vt * 2.6), 1.5) * 0.6
          + Math.pow(Math.max(0, vt - 0.72) * 3.5, 1.6) * 0.35;
        h += Math.sin((vt * spec.horiz + (n2(um * 3.1, vt * 3.1) - 0.5) * 1.8) * Math.PI * 2) * 0.5 * bunch;
      }
      // macro billow + micro weave
      h += (n3(um * 3.3, vt * 3.3) - 0.5) * 0.55 + (n1(um * 47, vt * 47) - 0.5) * 0.2;
      H[y * S + x] = h;
    }
  }
  const out = { H, S, mirror: spec.mirror };
  CLOTH_FIELDS.set(part, out);
  return out;
}

const CLOTH_MAPS = new Map();
function clothMaps(part) {
  if (CLOTH_MAPS.has(part)) return CLOTH_MAPS.get(part);
  const { H, S } = clothField(part);
  const maps = {
    normal: heightToNormalTex(H, S, 5.5),
    // fabric = high roughness; wrinkle crests pick up a touch of sheen,
    // dust-zones at the bottom go fully matte
    rough: roughnessTex(S, (u, vt, i) =>
      0.93 - Math.max(0, H[i]) * 0.11 + Math.max(0, -H[i]) * 0.035 + smoothstep(0.72, 1.0, vt) * 0.03),
  };
  CLOTH_MAPS.set(part, maps);
  return maps;
}

// Dashed stitch seam helper: darkened dashed line + catch-light fold ridge.
function seamFactor(d, vt, S) {
  const px = 1 / S;
  if (d < 1.4 * px) return (Math.floor(vt * S / 5) % 2 === 0) ? 0.58 : 0.74;
  if (d < 3.6 * px) return 1.08;
  return 1;
}
function wrapDist(u, pos) {
  const d = Math.abs(u - pos);
  return Math.min(d, 1 - d);
}

function clothAlbedoTex(seed, palette, part) {
  const { H, S, mirror } = clothField(part);
  const n1 = makeValueNoise(seed), n2 = makeValueNoise(seed + 3), n3 = makeValueNoise(seed + 9);
  const cols = palette.map((h) => new THREE.Color(h));
  const dust = new THREE.Color(0xb9a582);
  const bleach = new THREE.Color(0xe9dcbd);
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const C = new THREE.Color();
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const um = mirror ? Math.abs(u - 0.5) * 2 : u;
      // multi-scale camo: large organic blobs + mid patches + fine speckle
      const b1 = n1(um * 2.7, vt * 2.7);
      const b2 = n2(um * 6.1 + 7.3, vt * 6.1 + 2.9);
      let ci = b1 > 0.585 ? 2 : (b1 < 0.42 ? 3 : 0);
      if (b2 > 0.63) ci = 1;
      C.copy(cols[ci]);
      const sp = n3(um * 21, vt * 21);
      if (sp > 0.745) C.lerp(cols[2], 0.6);           // dark speckle clusters
      else if (sp < 0.185) C.lerp(cols[3], 0.55);     // pale flecks
      if (n1(um * 52 + 9.1, vt * 52 + 4.7) > 0.84) C.multiplyScalar(0.88); // pin dots
      // baked cloth shading from the shared height field
      let shade = 1 + H[y * S + x] * 0.15;
      if (part === 'torso') {
        shade *= 1 - smoothstep(0.86, 1.0, vt) * 0.16;              // hem shadow
        C.lerp(bleach, smoothstep(0.30, 0.0, vt) * 0.17);           // sun-bleached shoulders
        shade *= seamFactor(Math.min(u, 1 - u), vt, S);             // side seams at face edges
        shade *= seamFactor(Math.abs(vt - 0.16), u, S);             // chest yoke seam
      } else {
        shade *= 1 - smoothstep(0.16, 0.0, vt) * 0.26;              // armpit / crotch / knee-back AO
        const dustW = smoothstep(0.60, 1.0, vt) * (0.20 + n2(um * 9, vt * 9) * 0.22);
        if (dustW > 0) C.lerp(dust, Math.min(dustW, 0.5));          // dustier toward boots/wrists
        shade *= seamFactor(wrapDist(u, 0), vt, S);                 // outseam (hides wrap)
        shade *= seamFactor(wrapDist(u, 0.5), vt, S);               // inseam
      }
      const o = (y * S + x) * 4;
      img.data[o] = clamp(C.r * shade * 255, 0, 255);
      img.data[o + 1] = clamp(C.g * shade * 255, 0, 255);
      img.data[o + 2] = clamp(C.b * shade * 255, 0, 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTex(canvas);
}

function clothMat(seed, palette, part) {
  const maps = clothMaps(part);
  return new THREE.MeshStandardMaterial({
    map: clothAlbedoTex(seed, palette, part),
    normalMap: maps.normal, normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: maps.rough, roughness: 1.0,
    metalness: 0, envMapIntensity: 0.62,
  });
}

// --- plate carrier ----------------------------------------------------------
// MOLLE row layout shared by the vest albedo / normal / roughness bakes.
const MOLLE = { y0: 0.38, h: 15 / 256, gap: 8 / 256, yEnd: 0.94 };
function molleRow(vt) {
  if (vt < MOLLE.y0 || vt > MOLLE.yEnd) return -1;
  const p = (vt - MOLLE.y0) % (MOLLE.h + MOLLE.gap);
  return p < MOLLE.h ? p / MOLLE.h : -1; // 0..1 across the strap, -1 in gaps
}

function vestMat(seed, base, accent, strapCol) {
  const S = 256;
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const r = makeRNG(seed);
  const bC = new THREE.Color(base), aC = new THREE.Color(accent), sC = new THREE.Color(strapCol);
  const css = (c, k = 1) => `rgb(${Math.min(255, c.r * k * 255) | 0},${Math.min(255, c.g * k * 255) | 0},${Math.min(255, c.b * k * 255) | 0})`;
  ctx.fillStyle = css(bC);
  ctx.fillRect(0, 0, S, S);
  // mixed-kit color panels: coyote vs ranger-green patches of nylon
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = css(bC.clone().lerp(aC, 0.3 + r() * 0.5), 0.95 + r() * 0.12);
    ctx.fillRect(r() * S, r() * S * 0.85, 34 + r() * 92, 26 + r() * 72);
  }
  ctx.globalAlpha = 1;
  // velcro admin strip + ID patch high on the plate
  ctx.fillStyle = css(bC, 1.16);
  ctx.fillRect(S * 0.20, S * 0.10, S * 0.60, S * 0.11);
  ctx.fillStyle = css(aC, 0.88);
  ctx.fillRect(S * 0.40, S * 0.12, S * 0.20, S * 0.07);
  // MOLLE webbing rows with per-channel stitch bars
  for (let y = 0; y < S; y++) {
    const t = molleRow(y / S);
    if (t < 0) continue;
    if (t < 2 / 15) { ctx.fillStyle = 'rgba(255,240,215,0.24)'; ctx.fillRect(0, y, S, 1); }
    else if (t > 13 / 15) { ctx.fillStyle = 'rgba(0,0,0,0.46)'; ctx.fillRect(0, y, S, 1); }
    else { ctx.fillStyle = css(sC, 0.98); ctx.fillRect(0, y, S, 1); }
  }
  for (let x = 6; x < S; x += 25) {
    for (let y = 0; y < S; y++) {
      const t = molleRow(y / S);
      if (t < 0.1 || t > 0.9) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, 3, 1);
      ctx.fillStyle = 'rgba(255,240,215,0.16)';
      ctx.fillRect(x + 3, y, 1, 1);
    }
  }
  // wear: pale scuff streaks + dark rubs
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.05 + r() * 0.10;
    ctx.fillStyle = r.chance(0.6) ? '#d8cdb4' : '#221d15';
    ctx.fillRect(r() * S, r() * S, 3 + r() * 16, 1 + r() * 2.5);
  }
  ctx.globalAlpha = 1;
  // top-light gradient: shoulders of the carrier catch sky light
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, 'rgba(255,238,210,0.14)');
  grad.addColorStop(0.45, 'rgba(255,238,210,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  // edge binding
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  ctx.strokeStyle = 'rgba(255,240,215,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4.5, 4.5, S - 9, S - 9);
  overlayWeave(ctx, S, seed + 1, 0.10, 0.06);

  // matching relief + sheen: raised webbing rows, matte velcro
  const H = new Float32Array(S * S);
  const n = makeValueNoise(seed + 2);
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    const t = molleRow(vt);
    for (let x = 0; x < S; x++) {
      const strap = t < 0 ? 0 : Math.sin(t * Math.PI) * 0.9;
      H[y * S + x] = strap + (n(x * 0.5, y * 0.5) - 0.5) * 0.35;
    }
  }
  return new THREE.MeshStandardMaterial({
    map: canvasTex(canvas),
    normalMap: heightToNormalTex(H, S, 3.2), normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: roughnessTex(S, (u, vt) => {
      if (molleRow(vt) >= 0) return 0.58;                          // nylon webbing sheen
      if (vt > 0.10 && vt < 0.21 && u > 0.2 && u < 0.8) return 0.88; // velcro = matte
      return 0.76;
    }),
    roughness: 1.0, metalness: 0.02, envMapIntensity: 0.95,
  });
}

// Pouch face: top flap with under-shadow, snap dot, side MOLLE shadows,
// drainage grommet, dusty bottom. Mesh flaps ride above the baked flap line.
function pouchMat(seed, base, strapCol) {
  const S = 128;
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const r = makeRNG(seed);
  const bC = new THREE.Color(base), sC = new THREE.Color(strapCol);
  const css = (c, k = 1) => `rgb(${Math.min(255, c.r * k * 255) | 0},${Math.min(255, c.g * k * 255) | 0},${Math.min(255, c.b * k * 255) | 0})`;
  ctx.fillStyle = css(bC);
  ctx.fillRect(0, 0, S, S);
  // flap panel (slightly lighter) + hard shadow under its edge
  ctx.fillStyle = css(bC, 1.07);
  ctx.fillRect(0, 0, S, S * 0.30);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(0, S * 0.30, S, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, S * 0.30 - 2, S, 2);
  // snap + bartack stitches
  ctx.fillStyle = 'rgba(20,16,10,0.85)';
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.40, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(S * 0.5 - 1, S * 0.40 - 1, 1.6, 1.6);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(S * 0.08, S * 0.26, 6, 2);
  ctx.fillRect(S * 0.87, S * 0.26, 6, 2);
  // vertical retention straps at the sides
  ctx.fillStyle = css(sC, 0.92);
  ctx.fillRect(S * 0.06, S * 0.30, 5, S * 0.62);
  ctx.fillRect(S * 0.90, S * 0.30, 5, S * 0.62);
  // elastic shock-cord X across the body
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S * 0.16, S * 0.42);
  ctx.lineTo(S * 0.84, S * 0.78);
  ctx.moveTo(S * 0.84, S * 0.42);
  ctx.lineTo(S * 0.16, S * 0.78);
  ctx.stroke();
  // drainage grommet
  ctx.fillStyle = 'rgba(15,12,8,0.8)';
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.93, 2.4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    ctx.globalAlpha = 0.05 + r() * 0.09;
    ctx.fillStyle = r.chance(0.6) ? '#d8cdb4' : '#221d15';
    ctx.fillRect(r() * S, r() * S, 2 + r() * 10, 1 + r() * 2);
  }
  ctx.globalAlpha = 1;
  overlayWeave(ctx, S, seed + 1, 0.11, 0.08);
  return new THREE.MeshStandardMaterial({
    map: canvasTex(canvas), roughness: 0.88, metalness: 0, envMapIntensity: 0.65,
    normalMap: clothMaps('torso').normal, normalScale: new THREE.Vector2(0.5, 0.5),
  });
}

// --- helmet cover -----------------------------------------------------------
function helmetMat(seed, palette) {
  const S = 256;
  const n1 = makeValueNoise(seed), n2 = makeValueNoise(seed + 3), n3 = makeValueNoise(seed + 8);
  const cols = palette.map((h) => new THREE.Color(h));
  const bleach = new THREE.Color(0xeadfc2);
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const C = new THREE.Color();
  for (let y = 0; y < S; y++) {
    const vt = y / S; // 0 = crown, 1 = rim (sphere cap UV)
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const um = Math.abs(u - 0.5) * 2;
      const b1 = n1(um * 3.4, vt * 2.6);
      const b2 = n2(um * 7.2 + 3.1, vt * 5.4 + 8.8);
      let ci = b1 > 0.57 ? 2 : (b1 < 0.41 ? 3 : 0);
      if (b2 > 0.64) ci = 1;
      C.copy(cols[ci]);
      if (n3(um * 24, vt * 24) > 0.76) C.lerp(cols[2], 0.6);
      C.lerp(bleach, smoothstep(0.35, 0.0, vt) * 0.14);           // crown catches sun
      let shade = 1 + (n3(um * 5, vt * 5) - 0.5) * 0.16;          // cover billow
      // cover seams: four vertical panel seams + one horizontal
      shade *= seamFactor(Math.min(wrapDist(u, 0), wrapDist(u, 0.25), wrapDist(u, 0.5), wrapDist(u, 0.75)), vt, S);
      shade *= seamFactor(Math.abs(vt - 0.52), u, S);
      // bungee band with pale cat-eye patch at the rear (u=0.25 faces +z)
      if (vt > 0.72 && vt < 0.795) {
        shade *= 0.62;
        if (wrapDist(u, 0.25) < 0.05) { C.set(0xcfd6c4); shade = 1.05; }
      }
      // fabric gathers pulled under the rim + rim grime + scuff chips
      if (vt > 0.80) shade *= 1 + Math.sin(u * 26 * Math.PI * 2) * 0.10 * smoothstep(0.80, 1.0, vt);
      if (vt > 0.90) shade *= 0.88;
      if (vt > 0.45 && n1(um * 33 + 5.5, vt * 33 + 2.2) > 0.865) shade *= 1.28; // chipped/rubbed spots
      const o = (y * S + x) * 4;
      img.data[o] = clamp(C.r * shade * 255, 0, 255);
      img.data[o + 1] = clamp(C.g * shade * 255, 0, 255);
      img.data[o + 2] = clamp(C.b * shade * 255, 0, 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // relief: billow + rim gathers
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const um = Math.abs(u - 0.5) * 2;
      H[y * S + x] = (n3(um * 5, vt * 5) - 0.5) * 0.8
        + Math.sin(u * 26 * Math.PI * 2) * 0.45 * smoothstep(0.78, 1.0, vt)
        + (n1(um * 40, vt * 40) - 0.5) * 0.3;
    }
  }
  return new THREE.MeshStandardMaterial({
    map: canvasTex(canvas),
    normalMap: heightToNormalTex(H, S, 4.0), normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: roughnessTex(S, (u, vt) => {
      const um = Math.abs(u - 0.5) * 2;
      if (vt > 0.45 && n1(um * 33 + 5.5, vt * 33 + 2.2) > 0.865) return 0.55; // shiny rubs
      if (vt > 0.72 && vt < 0.795) return 0.85;
      return 0.80;                                                 // fabric cover w/ slight sheen
    }),
    roughness: 1.0, metalness: 0, envMapIntensity: 0.7,
  });
}

// --- balaclava knit / face / gloves (shared across kits) ---------------------
let KNIT_MAT = null;
function knitMat() {
  if (KNIT_MAT) return KNIT_MAT;
  const S = 128;
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const n = makeValueNoise(4111);
  const base = new THREE.Color(0x574f42);
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const rib = (y % 4 === 0) ? 0.78 : 1.0;                       // horizontal knit ribbing
      const wv = 0.9 + n(x * 0.6, y * 0.6) * 0.22;
      const worn = n(x * 0.12, y * 0.12) > 0.68 ? 1.14 : 1.0;       // sun-faded patches
      const k = rib * wv * worn;
      H[y * S + x] = (rib - 0.9) * 2 + (wv - 1) * 1.4;
      const o = (y * S + x) * 4;
      img.data[o] = clamp(base.r * k * 255, 0, 255);
      img.data[o + 1] = clamp(base.g * k * 255, 0, 255);
      img.data[o + 2] = clamp(base.b * k * 255, 0, 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  KNIT_MAT = new THREE.MeshStandardMaterial({
    map: canvasTex(canvas),
    normalMap: heightToNormalTex(H, S, 3.0), normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.96, metalness: 0, envMapIntensity: 0.55,
  });
  return KNIT_MAT;
}

let GLOVE_MAT = null;
function gloveMat() {
  if (GLOVE_MAT) return GLOVE_MAT;
  const S = 128;
  const canvas = makeCanvas(S);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const n = makeValueNoise(6033);
  const base = new THREE.Color(0x494335);
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const vt = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      let k = 0.92 + n(x * 0.5, y * 0.5) * 0.18;
      let h = (n(x * 0.5, y * 0.5) - 0.5) * 0.4;
      // knuckle pad band: four raised lighter bumps in a row
      const kn = Math.max(0, Math.sin(u * Math.PI * 4)) * Math.exp(-Math.pow((vt - 0.30) / 0.10, 2));
      k += kn * 0.30;
      h += kn * 1.2;
      // finger seams on the lower half + wrist strap
      if (vt > 0.5) {
        const d = Math.min(wrapDist(u, 0.25), wrapDist(u, 0.5), wrapDist(u, 0.75));
        if (d < 1.5 / S) k *= 0.62;
      }
      if (vt > 0.82 && vt < 0.90) { k *= 0.78; h -= 0.5; }
      const o = (y * S + x) * 4;
      img.data[o] = clamp(base.r * k * 255, 0, 255);
      img.data[o + 1] = clamp(base.g * k * 255, 0, 255);
      img.data[o + 2] = clamp(base.b * k * 255, 0, 255);
      img.data[o + 3] = 255;
      H[y * S + x] = h;
    }
  }
  ctx.putImageData(img, 0, 0);
  GLOVE_MAT = new THREE.MeshStandardMaterial({
    map: canvasTex(canvas),
    normalMap: heightToNormalTex(H, S, 3.0), normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.85, metalness: 0, envMapIntensity: 0.55,
  });
  return GLOVE_MAT;
}

// Scarf/shemagh: plain tone + cloth relief borrowed from the arm field.
function scarfMat(color) {
  const maps = clothMaps('arm');
  return new THREE.MeshStandardMaterial({
    color, normalMap: maps.normal, normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: maps.rough, roughness: 1.0, metalness: 0, envMapIntensity: 0.5,
  });
}

// Contact shadow decals (shared): tight dark core that fades fast for the
// body blob, plus an even harder small pool that rides under each boot.
let BLOB_TEX = null;
function blobShadowTexture() {
  if (BLOB_TEX) return BLOB_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.95)');
  g.addColorStop(0.34, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.62, 'rgba(0,0,0,0.2)');
  g.addColorStop(0.85, 'rgba(0,0,0,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  BLOB_TEX = new THREE.CanvasTexture(c);
  return BLOB_TEX;
}

let FOOT_TEX = null;
function footPoolTexture() {
  if (FOOT_TEX) return FOOT_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.92)');
  g.addColorStop(0.42, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.72, 'rgba(0,0,0,0.14)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  FOOT_TEX = new THREE.CanvasTexture(c);
  return FOOT_TEX;
}

let BLOB_GEO = null;
function blobShadowGeometry() {
  if (BLOB_GEO) return BLOB_GEO;
  BLOB_GEO = new THREE.PlaneGeometry(1, 1);
  BLOB_GEO.rotateX(-Math.PI / 2);
  return BLOB_GEO;
}

let KITS = null;
function getKits() {
  if (KITS) return KITS;
  // Material families are deliberately separated: rifle metal semi-gloss,
  // polymer/pads a plastic mid-sheen, webbing darker + lower roughness than
  // uniform fabric (which stays matte via its cloth maps), sole flat rubber.
  const shared = {
    gunmetal: m(0x33363e, 0.36, 0.85, 0.95),
    polymer: m(0x38352f, 0.6, 0.1, 0.6),
    lens: m(0x141d24, 0.10, 0.9, 1.8),      // glossy ballistic lens — env glint
    sole: m(0x17130f, 0.95, 0, 0.2),        // flat dark rubber sole
    glove: gloveMat(),
    mask: knitMat(),
  };
  // Uniform palettes [base, mid, dark, light]: light base values with ~30%
  // tone spread so the pattern reads at 4m instead of averaging flat.
  const oliveP = [0x83885f, 0x6d7553, 0x555c40, 0xa2a178];
  const tanP = [0xc4ae8c, 0x9f8d6c, 0x87765c, 0xd8c8a4];
  const greyP = [0x94978a, 0x7a7f71, 0x5d6256, 0xb1b1a3];
  // Every variant mixes its carrier tone against the uniform AND against its
  // own pouches (coyote vs ranger green vs charcoal) so the kit never reads
  // as one flat slab: olive+coyote/green, tan+dark-earth/OD, grey+black/tan.
  const build = (uniSeed, palette, vestBase, vestAccent, strapCol, pouchCol, o) => ({
    uniform: clothMat(uniSeed, palette, 'torso'),
    uniArm: clothMat(uniSeed + 1, palette, 'arm'),
    uniLeg: clothMat(uniSeed + 2, palette, 'leg'),
    vest: vestMat(uniSeed + 3, vestBase, vestAccent, strapCol),
    // plain nylon for cummerbund/collar — the MOLLE tile turns to noise on
    // their small faces
    vestSide: new THREE.MeshStandardMaterial({
      color: vestBase, roughness: 1.0, metalness: 0, envMapIntensity: 0.85,
      roughnessMap: clothMaps('torso').rough,
      normalMap: clothMaps('torso').normal, normalScale: new THREE.Vector2(0.5, 0.5),
    }),
    pouch: pouchMat(uniSeed + 4, pouchCol, strapCol),
    pouch2: pouchMat(uniSeed + 5, vestAccent, strapCol),
    strap: m(new THREE.Color(strapCol).multiplyScalar(0.82), 0.56, 0, 0.8),
    helmet: helmetMat(uniSeed + 6, palette),
    scarf: scarfMat(o.scarf),
    helmetRim: m(new THREE.Color(o.rim).multiplyScalar(0.92), 0.42, 0.05, 0.9),
    pads: m(o.pads, 0.55, 0, 0.75),
    boot: m(o.boot, 0.7, 0, 0.5),
    furniture: m(o.furniture, 0.66, 0.05, 0.5),
    ...shared,
  });
  KITS = [
    // 0: olive woodland fatigues + coyote carrier w/ ranger-green accents
    build(193, oliveP, 0x8b7854, 0x616852, 0x5b4c34, 0x8d7955,
      { scarf: 0x6f634a, rim: 0x5d6347, pads: 0x3d3931, boot: 0x2e2820, furniture: 0x44423c }),
    // 1: desert tan fatigues + dark-earth carrier w/ OD accents
    build(291, tanP, 0x7d6b50, 0x6b6850, 0x64553a, 0x87755a,
      { scarf: 0x8b7955, rim: 0x8a795a, pads: 0x453f34, boot: 0x3a2f22, furniture: 0x7a6d58 }),
    // 2: grey urban fatigues + charcoal carrier w/ tan pouches
    build(392, greyP, 0x525354, 0x8a7a5c, 0x574936, 0x8a7a5c,
      { scarf: 0x696459, rim: 0x5f6257, pads: 0x393936, boot: 0x2a2520, furniture: 0x4c4c48 }),
  ];
  return KITS;
}

// ---------------------------------------------------------------------------
// Small mesh builders
// ---------------------------------------------------------------------------
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function ball(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

// Tapered limb segment: pivot at top, extends down local -Y.
function limb(rTop, rBot, len, mat) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 10);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function cyl(r1, r2, len, mat, x = 0, y = 0, z = 0, rotX = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, 0, rotZ);
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Two-bone IK (torso space). Limb meshes extend down local -Y; lower group is
// a child of the upper group at (0, -upperLen, 0). Guarantees the hand lands
// exactly on the target, with the elbow pushed toward `pole`.
// ---------------------------------------------------------------------------
const _ikDir = new THREE.Vector3(), _ikPole = new THREE.Vector3(), _ikN = new THREE.Vector3();
const _ikE = new THREE.Vector3(), _ikX = new THREE.Vector3(), _ikY = new THREE.Vector3(), _ikZ = new THREE.Vector3();
const _ikM = new THREE.Matrix4(), _ikQ = new THREE.Quaternion();
const _bq = new THREE.Quaternion(), _bqi = new THREE.Quaternion(), _bv = new THREE.Vector3();

function solveTwoBone(upper, lower, target, a, b, pole) {
  const S = upper.position;
  _ikDir.subVectors(target, S);
  let d = _ikDir.length();
  d = clamp(d, Math.abs(a - b) + 0.02, a + b - 0.008);
  _ikDir.normalize();
  const p = (a * a - b * b + d * d) / (2 * d);
  const r = Math.sqrt(Math.max(a * a - p * p, 1e-8));
  _ikPole.copy(pole).addScaledVector(_ikDir, -pole.dot(_ikDir));
  if (_ikPole.lengthSq() < 1e-8) _ikPole.set(0, -1, 0);
  _ikPole.normalize();
  _ikE.copy(S).addScaledVector(_ikDir, p).addScaledVector(_ikPole, r);
  _ikN.crossVectors(_ikDir, _ikPole).normalize();

  // Upper bone: local -Y points shoulder -> elbow
  _ikY.subVectors(S, _ikE).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  upper.quaternion.setFromRotationMatrix(_ikM);

  // Lower bone: local -Y points elbow -> hand, expressed in upper's space
  _ikY.subVectors(_ikE, target).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  lower.quaternion.setFromRotationMatrix(_ikM).premultiply(_ikQ.copy(upper.quaternion).invert());
}

// ---------------------------------------------------------------------------
// Hand mounts — hard rifle-space anchors for both hands. GRIP_Q_* is the hand
// orientation in rifle space (x = axis the fingers wrap, y = toward the
// forearm); WRIST_* is where the wrist lands so the palm/finger block wraps
// the pistol grip / handguard with a few mm of intersection. The IK solves
// the arm to the wrist, then the hand is snapped to the mount orientation.
// ---------------------------------------------------------------------------
function gripQuat(xv, yv) {
  const x = new THREE.Vector3(...xv).normalize();
  const z = new THREE.Vector3().crossVectors(x, new THREE.Vector3(...yv)).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
// Right hand: wraps the raked pistol grip — thumb up the left flat, fingers
// crossing the front face, wrist behind/below with the elbow dropped back.
const GRIP_Q_R = gripQuat([0, 0.939, 0.343], [-0.917, -0.137, 0.375]);
const WRIST_R = new THREE.Vector3(-0.031, -0.071, 0.072);
// Left hand: clamps the handguard from below — thumb along the left rail
// toward the muzzle, fingers wrapping up the far side, elbow tucked under.
const GRIP_Q_L = gripQuat([0, 0, 1], [-0.751, -0.66, 0]);
const WRIST_L = new THREE.Vector3(-0.0125, -0.0715, -0.28);
const HAND_REST_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0));
const _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion();
const _fv = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Rifle — M4-style carbine built once, aimed down local -Z. Origin sits at
// the rear of the receiver so the stock reaches back to the shoulder.
// ---------------------------------------------------------------------------
function buildRifle(kit) {
  const g = new THREE.Group();
  const gm = kit.gunmetal, poly = kit.polymer, fur = kit.furniture;

  g.add(box(0.036, 0.068, 0.24, gm, 0, 0, -0.04));                 // receiver
  const hg = box(0.036, 0.05, 0.22, fur, 0, 0.002, -0.27);         // handguard
  g.add(hg);
  g.add(box(0.04, 0.012, 0.16, gm, 0, 0.033, -0.26));              // top rail
  g.add(box(0.012, 0.028, 0.018, gm, 0, 0.052, -0.355));           // front sight
  g.add(cyl(0.010, 0.010, 0.15, gm, 0, 0.004, -0.45, Math.PI / 2));// barrel
  g.add(cyl(0.0145, 0.0145, 0.05, gm, 0, 0.004, -0.545, Math.PI / 2)); // muzzle device
  // Optic: body + objective lens
  g.add(box(0.032, 0.042, 0.09, gm, 0, 0.064, -0.055));
  const lens = cyl(0.013, 0.013, 0.006, kit.lens, 0, 0.064, -0.102, Math.PI / 2);
  g.add(lens);
  // Curved magazine (two angled segments)
  const mag1 = box(0.03, 0.10, 0.05, poly, 0, -0.078, -0.095);
  mag1.rotation.x = 0.3;
  g.add(mag1);
  const mag2 = box(0.028, 0.06, 0.046, poly, 0, -0.148, -0.117);
  mag2.rotation.x = 0.62;
  g.add(mag2);
  // Pistol grip
  const grip = box(0.026, 0.075, 0.04, fur, 0, -0.058, 0.018);
  grip.rotation.x = 0.35;
  g.add(grip);
  // Buffer tube + stock + butt pad
  g.add(box(0.028, 0.042, 0.10, gm, 0, 0.004, 0.10));
  g.add(box(0.034, 0.072, 0.11, fur, 0, -0.006, 0.175));
  g.add(box(0.038, 0.088, 0.02, poly, 0, -0.006, 0.235));
  // Foregrip stub under handguard (left hand anchor)
  const fg = box(0.022, 0.05, 0.03, fur, 0, -0.043, -0.26);
  fg.rotation.x = -0.2;
  g.add(fg);
  // Two-point sling drooping toward the chest — reads "carried", not "prop"
  const sl1 = box(0.012, 0.19, 0.03, kit.strap, 0.035, -0.10, 0.10);
  sl1.rotation.set(0.5, 0, 0.35);
  g.add(sl1);
  const sl2 = box(0.012, 0.17, 0.026, kit.strap, 0.045, -0.09, -0.09);
  sl2.rotation.set(-0.45, 0, 0.4);
  g.add(sl2);
  return g;
}

// ===========================================================================
// Soldier
// ===========================================================================
export class Soldier {
  constructor() {
    this.root = new THREE.Group();
    // Yaw-first order so the death pitch/roll happens in the body's own frame
    // (corpse falls along its facing, not along world Z).
    this.root.rotation.order = 'YXZ';
    const kits = getKits();
    const kit = kits[rng.int(0, kits.length - 1)];
    this.kit = kit;

    // Per-instance character (deterministic)
    const scale = rng.range(0.975, 1.035);
    this.root.scale.setScalar(scale);
    this.phase = rng() * 20;                 // desync idle motion
    this.scanP1 = rng() * 7;
    this.scanP2 = rng() * 7;
    this.deathTwist = rng.range(0.45, 1) * (rng.chance(0.5) ? 1 : -1);
    this.deathLegA = rng.range(0.5, 1.1);
    this.deathLegB = rng.range(0.2, 0.8);
    const hasPack = rng.chance(0.6);
    const hasNVG = rng.chance(0.75);
    const hasAntenna = rng.chance(0.6);
    const hasWrap = rng.chance(0.5);         // shemagh over the balaclava jaw
    this.stanceW = rng.range(0.85, 1.15);    // per-soldier weight-shift depth

    const uni = kit.uniform;
    const uniA = kit.uniArm;
    const uniL = kit.uniLeg;

    // ------------------------------------------------------------- hips
    this.hips = new THREE.Group();
    this.hips.position.y = HIP_Y;
    this.root.add(this.hips);

    this.hips.add(box(0.30, 0.20, 0.20, uni, 0, -0.05, 0));               // pelvis
    this.hips.add(box(0.325, 0.055, 0.225, kit.strap, 0, 0.04, 0));       // belt
    // slung dump pouch hanging off the left hip — big silhouette break
    const dump = box(0.115, 0.16, 0.095, kit.pouch, 0.155, -0.105, 0.055);
    dump.rotation.y = 0.35;
    dump.rotation.x = 0.08;
    this.hips.add(dump);
    this.hips.add(box(0.02, 0.06, 0.06, kit.strap, 0.15, -0.005, 0.05));  // its hanger strap
    // utility pouch + canteen at the belt rear
    this.hips.add(box(0.10, 0.12, 0.05, kit.pouch, -0.13, -0.06, 0.095));
    const canteen = cyl(0.042, 0.046, 0.13, kit.pouch, -0.02, -0.075, 0.135);
    canteen.rotation.z = 0.06;
    this.hips.add(canteen);
    this.hips.add(cyl(0.02, 0.02, 0.025, kit.pads, -0.017, -0.005, 0.135)); // canteen cap

    // blob contact shadow — tight dark core so the figure sits into the
    // asphalt instead of hovering over a grey haze
    this.blob = new THREE.Mesh(blobShadowGeometry(), new THREE.MeshBasicMaterial({
      map: blobShadowTexture(), transparent: true, opacity: 0.66,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.blob.scale.setScalar(0.92);
    this.blob.position.y = 0.02;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);

    // per-boot dirt pools: small hard-edged darkening tracked to each boot
    // every frame — fades as the foot lifts so plants read grounded
    this.pools = [];
    for (let i = 0; i < 2; i++) {
      const pool = new THREE.Mesh(blobShadowGeometry(), new THREE.MeshBasicMaterial({
        map: footPoolTexture(), transparent: true, opacity: 0.5,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      }));
      pool.scale.set(0.20, 1, 0.34);
      pool.position.y = 0.015;
      pool.renderOrder = 2;
      this.root.add(pool);
      this.pools.push(pool);
    }

    // ------------------------------------------------------------- legs
    const buildLeg = (side) => { // side: +1 left, -1 right
      const thigh = new THREE.Group();
      thigh.position.set(0.10 * side, -0.06, 0);
      this.hips.add(thigh);
      thigh.add(limb(0.086, 0.056, THIGH_LEN, uniL));   // taper knee-ward
      // cargo pocket on outer thigh
      thigh.add(box(0.024, 0.11, 0.085, uniL, 0.072 * side, -0.24, 0.01));

      const calf = new THREE.Group();
      calf.position.y = -THIGH_LEN;
      thigh.add(calf);
      calf.add(limb(0.062, 0.040, CALF_LEN, uniL));     // calf tapers to ankle
      // knee pad — sits proud of the shin so it breaks the leg profile
      const pad = box(0.094, 0.11, 0.055, kit.pads, 0, -0.035, -0.062);
      pad.rotation.x = -0.18;
      calf.add(pad);
      calf.add(box(0.1, 0.022, 0.03, kit.strap, 0, -0.09, -0.045));  // pad strap
      // boot: tapered shaft, heel block + stepped toe box + rubber sole lip
      calf.add(cyl(0.048, 0.058, 0.11, kit.boot, 0, -0.35, 0));
      calf.add(box(0.09, 0.078, 0.135, kit.boot, 0, -0.428, 0.008)); // heel/mid
      const toe = box(0.082, 0.048, 0.11, kit.boot, 0, -0.4435, -0.105);
      toe.rotation.x = 0.06;                                         // toe rake
      calf.add(toe);
      calf.add(box(0.102, 0.026, 0.245, kit.sole, 0, -0.468, -0.048));
      return { thigh, calf };
    };
    const L = buildLeg(1), R = buildLeg(-1);
    this.legL = L.thigh; this.calfL = L.calf;
    this.legR = R.thigh; this.calfR = R.calf;

    // drop holster on right thigh (rides with the leg)
    const holster = box(0.05, 0.15, 0.08, kit.pads, -0.082, -0.16, -0.01);
    this.legR.add(holster);
    this.legR.add(box(0.055, 0.03, 0.09, kit.strap, -0.08, -0.085, -0.01)); // holster strap
    this.legR.add(box(0.03, 0.05, 0.035, kit.polymer, -0.085, -0.075, 0.025)); // pistol grip stub

    // ------------------------------------------------------------- torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.hips.add(this.torso);

    this.torso.add(box(0.32, 0.24, 0.20, uni, 0, 0.08, 0));           // lower torso
    this.torso.add(box(0.34, 0.28, 0.22, uni, 0, 0.30, 0));           // chest
    // sloped clavicle line: mirrored trap wedges descending to the deltoids
    // so the shoulders read rounded instead of a flat T-square step
    const clavL = box(0.16, 0.065, 0.17, uni, 0.083, 0.437, 0.005);
    clavL.rotation.z = -0.30;
    this.torso.add(clavL);
    const clavR = box(0.16, 0.065, 0.17, uni, -0.083, 0.437, 0.005);
    clavR.rotation.z = 0.30;
    this.torso.add(clavR);

    // Plate carrier — MOLLE webbing + velcro + mixed nylon panels are baked
    // into the vest canvas; pouches below break the silhouette in geometry.
    this.torso.add(box(0.32, 0.30, 0.055, kit.vest, 0, 0.295, -0.135));  // front plate
    this.torso.add(box(0.32, 0.32, 0.06, kit.vest, 0, 0.30, 0.125));     // back plate
    this.torso.add(box(0.06, 0.20, 0.20, kit.vestSide, 0.175, 0.21, 0));  // cummerbund L
    this.torso.add(box(0.06, 0.20, 0.20, kit.vestSide, -0.175, 0.21, 0)); // cummerbund R
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, 0.105, 0.462, -0.01)); // shoulder strap L
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, -0.105, 0.462, -0.01)); // shoulder strap R
    // quick-release buckles on the shoulder straps
    this.torso.add(box(0.05, 0.024, 0.034, kit.polymer, 0.105, 0.455, -0.075));
    this.torso.add(box(0.05, 0.024, 0.034, kit.polymer, -0.105, 0.455, -0.075));
    // 3 mag pouches + flaps (flap+snap+shock-cord baked into the pouch map)
    for (let i = -1; i <= 1; i++) {
      this.torso.add(box(0.078, 0.115, 0.05, kit.pouch, i * 0.088, 0.185, -0.175));
      this.torso.add(box(0.08, 0.045, 0.056, kit.strap, i * 0.088, 0.235, -0.174));
    }
    // Admin pouch high on chest (accent color mixes up the kit read)
    this.torso.add(box(0.15, 0.075, 0.035, kit.pouch2, 0, 0.375, -0.16));
    // frag grenade pouch tucked beside the mag row
    this.torso.add(box(0.062, 0.08, 0.055, kit.pouch2, -0.152, 0.30, -0.155));
    // IFAK + strap on the left cummerbund, radio pouch on the right — pushes
    // gear past the torso profile so the outline isn't a rectangle
    this.torso.add(box(0.055, 0.105, 0.09, kit.pouch2, 0.20, 0.20, -0.015));
    this.torso.add(box(0.058, 0.026, 0.093, kit.strap, 0.20, 0.245, -0.015));
    this.torso.add(box(0.05, 0.115, 0.075, kit.pouch, -0.20, 0.205, 0.02));
    // Plate-carrier collar riding up around the neck
    const collarB = box(0.17, 0.065, 0.05, kit.vestSide, 0, 0.475, 0.095);
    collarB.rotation.x = 0.2;
    this.torso.add(collarB);
    this.torso.add(box(0.05, 0.06, 0.10, kit.vestSide, 0.115, 0.468, 0.035));
    this.torso.add(box(0.05, 0.06, 0.10, kit.vestSide, -0.115, 0.468, 0.035));
    // Radio on left shoulder strap + whip antenna (strong silhouette cue)
    this.torso.add(box(0.048, 0.10, 0.038, kit.pouch2, 0.12, 0.40, -0.115));
    const antenna = cyl(0.006, 0.0035, 0.24, kit.polymer, 0.138, 0.545, -0.105);
    antenna.rotation.z = -0.12;
    this.torso.add(antenna);
    if (hasAntenna) {
      // some carry a second stub antenna on the back plate
      this.torso.add(cyl(0.005, 0.004, 0.12, kit.polymer, -0.10, 0.48, 0.14));
    }
    // Hydration pack on the back
    if (hasPack) {
      this.torso.add(box(0.22, 0.28, 0.09, kit.pouch, 0, 0.28, 0.195));
      this.torso.add(box(0.20, 0.05, 0.10, kit.strap, 0, 0.415, 0.185));
    }

    // ------------------------------------------------------------- head
    this.head = new THREE.Group();
    this.head.position.set(-0.015, 0.52, 0);
    this.torso.add(this.head);
    this.torso.add(cyl(0.052, 0.056, 0.08, kit.mask, -0.01, 0.49, 0));   // neck
    // shemagh / neck wrap (pushed forward so the carrier collar reads behind)
    const scarf = ball(0.082, kit.scarf, -0.01, 0.49, -0.03, 1.15, 0.56, 1.05);
    this.torso.add(scarf);

    this.head.add(ball(0.106, kit.mask, 0, 0.025, 0, 0.9, 1.02, 0.96));   // balaclava skull (knit)
    this.head.add(box(0.10, 0.07, 0.10, kit.mask, 0, -0.028, -0.025));    // jaw
    // face fully covered: dark ballistic goggles worn over the balaclava —
    // glossy env-reflective lens strip in a plastic frame, band to the temples
    this.head.add(box(0.118, 0.046, 0.026, kit.pads, 0, 0.047, -0.088));  // goggle frame
    this.head.add(box(0.104, 0.03, 0.007, kit.lens, 0, 0.047, -0.1035));  // lens strip
    this.head.add(box(0.198, 0.024, 0.14, kit.strap, 0, 0.05, -0.005));   // goggle band
    if (hasWrap) {
      // shemagh wrapped over the lower face, tucked under the goggles
      this.head.add(ball(0.064, kit.scarf, 0, -0.032, -0.045, 1.3, 0.85, 0.95));
    }
    // comms headset earcups + band (sit in the high-cut helmet ear gap)
    this.head.add(cyl(0.041, 0.041, 0.028, kit.pads, 0.096, 0.01, 0, 0, Math.PI / 2));
    this.head.add(cyl(0.041, 0.041, 0.028, kit.pads, -0.096, 0.01, 0, 0, Math.PI / 2));
    this.head.add(box(0.02, 0.04, 0.05, kit.pads, 0.104, 0.01, -0.045));  // mic boom stub

    // helmet: high-cut dome under a camo fabric cover (seams, bungee band,
    // scuffs baked) — sides stop above the earcups, front brim over the eyes.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.55), kit.helmet);
    dome.position.y = 0.098;
    dome.scale.set(0.97, 0.88, 1.05);
    dome.castShadow = true;
    this.head.add(dome);
    const brim = box(0.155, 0.02, 0.045, kit.helmetRim, 0, 0.079, -0.106);
    brim.rotation.x = 0.14;
    this.head.add(brim);
    const skirt = box(0.165, 0.05, 0.035, kit.helmetRim, 0, 0.055, 0.098);
    skirt.rotation.x = -0.3;
    this.head.add(skirt);
    // chinstrap V from the rim down along the jaw
    const strapL = box(0.013, 0.095, 0.013, kit.strap, 0.082, -0.005, -0.028);
    strapL.rotation.set(-0.12, 0, 0.38);
    this.head.add(strapL);
    const strapR = box(0.013, 0.095, 0.013, kit.strap, -0.082, -0.005, -0.028);
    strapR.rotation.set(-0.12, 0, -0.38);
    this.head.add(strapR);
    // side rails (kept clear of the front face so the dome doesn't grow a
    // second pair of "eyes")
    this.head.add(box(0.014, 0.03, 0.095, kit.polymer, 0.118, 0.10, 0.01));
    this.head.add(box(0.014, 0.03, 0.095, kit.polymer, -0.118, 0.10, 0.01));
    this.head.add(box(0.24, 0.024, 0.012, kit.strap, 0, 0.135, 0.0));    // helmet bungee band
    if (hasNVG) {
      // single centered NVG shroud + stowed arm; counterweight at the rear
      this.head.add(box(0.03, 0.052, 0.018, kit.polymer, 0, 0.132, -0.116));
      this.head.add(box(0.024, 0.022, 0.05, kit.polymer, 0, 0.158, -0.115));
      this.head.add(box(0.10, 0.04, 0.03, kit.pads, 0, 0.13, 0.102));
    }

    // ------------------------------------------------------------- arms
    const buildArm = (side) => { // +1 left, -1 right
      const upper = new THREE.Group();
      // clavicle offset: pivots ride lower so the deltoids hang off the
      // sloped trap line instead of squaring the silhouette
      upper.position.set(0.168 * side, 0.358, side > 0 ? -0.02 : 0.02);
      this.torso.add(upper);
      // deltoid in sleeve camo — the roughness map's sheen crest is what pops
      // the shoulder line, not a fake light tone
      upper.add(ball(0.076, uniA, 0, -0.024, 0, 1, 1.12, 1));
      upper.add(limb(0.059, 0.043, UPPER_ARM, uniA));
      const fore = new THREE.Group();
      fore.position.y = -UPPER_ARM;
      upper.add(fore);
      fore.add(ball(0.05, kit.pads, 0, 0.005, 0));            // elbow pad
      fore.add(cyl(0.05, 0.046, 0.06, uniA, 0, -0.04, 0));    // rolled sleeve
      fore.add(limb(0.044, 0.031, FOREARM, kit.glove));       // forearm narrows to wrist
      // hand: palm + clamped finger block + opposed thumb (knuckle pad and
      // finger seams baked into the glove map). Orientation is overridden
      // every frame by the rifle-space hand mounts while gripping.
      const hand = new THREE.Group();
      hand.position.set(0, -FOREARM - 0.005, -0.005);
      hand.rotation.x = -0.35;
      fore.add(hand);
      hand.add(box(0.05, 0.06, 0.068, kit.glove, 0, -0.018, -0.002));
      const fingers = box(0.048, 0.044, 0.05, kit.glove, 0, -0.054, -0.030);
      fingers.rotation.x = -1.05;
      hand.add(fingers);
      const thumb = box(0.017, 0.021, 0.046, kit.glove, -side * 0.031, -0.028, -0.018);
      thumb.rotation.set(-0.3, 0, side * 0.5);
      hand.add(thumb);
      return { upper, fore, hand };
    };
    const AL = buildArm(1), AR = buildArm(-1);
    this.armL = AL.upper; this.forearmL = AL.fore; this.handL = AL.hand;
    this.armR = AR.upper; this.forearmR = AR.fore; this.handR = AR.hand;

    // ------------------------------------------------------------- rifle
    this.rifle = buildRifle(kit);
    this.torso.add(this.rifle);
    // Rest pose seats the stock in the shoulder pocket (slightly inboard of
    // the deltoid, buried ~2cm so there is never an air gap).
    this.rifleRest = new THREE.Vector3(-0.12, 0.395, -0.22);
    this.rifle.position.copy(this.rifleRest);
    this.rifle.rotation.set(0, -0.035, 0);

    // Muzzle world-space anchor (tracer origin)
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.004, -0.575);
    this.rifle.add(this.muzzle);

    // Enemy muzzle flash sprite
    const flashMat = new THREE.SpriteMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.4, 0.4, 1);
    this.flash.position.set(0, 0.004, -0.63);
    this.rifle.add(this.flash);

    // IK poles (torso space) — poles pulled down/out so elbows hang natural.
    // Wrist targets come from the rifle-space hand mounts (WRIST_R/WRIST_L).
    this.poleR = new THREE.Vector3(-0.45, -0.9, 0.3).normalize();
    this.poleL = new THREE.Vector3(0.55, -1, -0.2).normalize();
    this.splayR = new THREE.Vector3(-0.33, 0.06, -0.16); // death splay targets
    this.splayL = new THREE.Vector3(0.36, 0.03, -0.12);
    this._tR = new THREE.Vector3();
    this._tL = new THREE.Vector3();

    // Animation state
    this.t = rng() * 100;
    this.walkPhase = rng() * 10;
    this.flinchT = 99;
    this.flinchSide = 1;
    this.deathT = -1;
    this.deathDir = 1;
    this.deathYaw = 0;
    this.flashT = 99;
    this.alertW = 1;

    this._pose(0, 0, 0, 0, 0, 0, 1);
  }

  triggerFlash() {
    this.flashT = 0;
    this.flash.material.rotation = rng() * Math.PI * 2;
    const s = 0.32 + rng() * 0.2;
    this.flash.scale.set(s, s, 1);
  }

  startDeath(dir) {
    this.deathT = 0;
    this.deathDir = dir >= 0 ? 1 : -1;
    this.deathYaw = this.root.rotation.y;   // preserve facing through the fall
  }

  flinch() {
    this.flinchT = 0;
    this.flinchSide = rng.chance(0.5) ? 1 : -1;
  }

  // Solve both arms to the rifle-space wrist mounts, then snap each hand's
  // orientation to its grip mount so palm/fingers wrap the weapon surfaces.
  // blendSplay releases the grip toward the relaxed pose during death.
  _solveArms(blendSplay = 0) {
    this._tR.copy(WRIST_R).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    this._tL.copy(WRIST_L).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    if (blendSplay > 0) {
      this._tR.lerp(this.splayR, blendSplay);
      this._tL.lerp(this.splayL, blendSplay);
    }
    solveTwoBone(this.armR, this.forearmR, this._tR, UPPER_ARM, FOREARM, this.poleR);
    solveTwoBone(this.armL, this.forearmL, this._tL, UPPER_ARM, FOREARM, this.poleL);
    this._alignHand(this.handR, this.armR, this.forearmR, GRIP_Q_R, blendSplay);
    this._alignHand(this.handL, this.armL, this.forearmL, GRIP_Q_L, blendSplay);
  }

  // Force the hand's torso-space orientation to rifleQ * mountQ, expressed in
  // the forearm's local frame (parent chain torso -> upper -> fore -> hand).
  _alignHand(hand, upper, fore, mountQ, blend) {
    _hq.copy(this.rifle.quaternion).multiply(mountQ);
    _hq2.copy(upper.quaternion).multiply(fore.quaternion).invert();
    hand.quaternion.copy(_hq2.multiply(_hq));
    if (blend > 0) hand.quaternion.slerp(HAND_REST_Q, blend);
  }

  // Track the boot dirt pools to each boot sole in root space; pools fade as
  // the boot lifts mid-stride (and fade out entirely with `fade`).
  _updateFootPools(fade) {
    for (let i = 0; i < 2; i++) {
      const thigh = i ? this.legR : this.legL;
      const calf = i ? this.calfR : this.calfL;
      const pool = this.pools[i];
      _fv.set(0, -0.44, -0.05);
      _fv.applyQuaternion(calf.quaternion).add(calf.position);
      _fv.applyQuaternion(thigh.quaternion).add(thigh.position);
      _fv.applyQuaternion(this.hips.quaternion).add(this.hips.position);
      pool.position.set(_fv.x, 0.015, _fv.z);
      pool.rotation.y = this.hips.rotation.y + thigh.rotation.y;
      pool.material.opacity = 0.5 * fade * clamp(1 - (_fv.y - 0.045) * 8, 0, 1);
    }
  }

  /**
   * Animate. moveSpeed in m/s, crouch 0..1, aimPitch aims torso/rifle.
   * opts (optional): { fwd, side } local-space velocity for lean,
   * alert 0..1 (aimed vs patrol carry).
   */
  update(dt, moveSpeed, crouch, aimPitch, opts = null) {
    this.t += dt;

    // Muzzle flash fade (runs even while dying)
    this.flashT += dt;
    this.flash.material.opacity = Math.max(0, 1 - this.flashT / 0.05) * 0.95;

    if (this.deathT >= 0) { this._updateDeath(dt); return; }

    this.flinchT += dt;
    const fwdN = opts ? clamp(opts.fwd / 4, -1, 1) : clamp(moveSpeed / 4, 0, 1);
    const sideN = opts ? clamp(opts.side / 4, -1, 1) : 0;
    const alertTarget = opts && opts.alert !== undefined ? opts.alert : 1;
    this.alertW = lerp(this.alertW, alertTarget, 1 - Math.exp(-dt * 5));

    this.walkPhase += dt * (3.4 + moveSpeed * 1.9);
    const w = clamp(moveSpeed / 2.9, 0, 1.15);
    const idle = clamp(1 - w * 2.2, 0, 1);
    const ph = this.walkPhase;
    const s = Math.sin(ph);
    const c = crouch;
    const tt = this.t + this.phase;

    this._pose(w, s, ph, c, fwdN, sideN, idle, aimPitch, tt);
  }

  _pose(w, s, ph, c, fwdN, sideN, idle, aimPitch = 0, tt = 0) {
    const alert = this.alertW ?? 1;
    // Flinch impulse — computed up front so the rifle kick lands BEFORE the
    // arm solve and the hands stay welded to the weapon through the hit.
    const fl = this.flinchT < 0.24 ? (1 - this.flinchT / 0.24) ** 2 : 0;
    // Contrapposto weight while standing: pelvis settles over the rear-right
    // leg, front knee unlocks, shoulders counter-tilt off T-square. Fades out
    // with movement and crouch so gait/cover posing is untouched.
    const wsh = idle * (1 - c) * (this.stanceW ?? 1);

    // ---- legs: swing + knee fold, blended with asymmetric combat crouch ----
    const swing = 0.52 * Math.min(w, 1);
    const kneeL = Math.max(0, -Math.sin(ph - 0.45)) * 1.05 * w;
    const kneeR = Math.max(0, Math.sin(ph - 0.45)) * 1.05 * w;
    this.legL.rotation.x = s * swing + c * 0.95 + 0.11 * wsh;   // front knee eases
    this.legR.rotation.x = -s * swing + c * 0.42;
    this.legL.rotation.y = 0.10 * wsh;
    this.legR.rotation.y = -c * 0.3 - 0.13 * wsh;               // planted toe out
    this.legL.rotation.z = 0.03 * wsh;
    this.legR.rotation.z = 0.05 * wsh;                          // planted leg under pelvis
    this.calfL.rotation.x = -0.06 - kneeL - c * 1.68 - 0.17 * wsh;
    this.calfR.rotation.x = -0.06 - kneeR - c * 1.62;
    // idle stance stagger (left foot slightly forward)
    this.legL.position.z = -0.055 * idle - c * 0.05;
    this.legR.position.z = 0.045 * idle + c * 0.04;

    // ---- hips: bob at 2x step frequency + sway + bladed stance ----
    // Drop the pelvis exactly enough that the planted (straight) leg keeps
    // its boot on the ground through the stride — kills the floaty look.
    const dip = 0.014 * w - (THIGH_LEN + CALF_LEN) * (1 - Math.cos(swing * s)) * 0.9;
    const breath = Math.sin(tt * 1.35) * 0.004;
    this.hips.position.x = -0.03 * wsh;                         // weight over rear leg
    this.hips.position.y = HIP_Y - c * 0.31 + dip + breath - 0.012 * wsh;
    this.hips.position.z = c * 0.045 + 0.03 * fl;
    const blade = 0.21 * (1 - w * 0.7) * (0.35 + alert * 0.65);
    this.hips.rotation.y = s * 0.10 * w + blade * 0.4;
    this.hips.rotation.z = s * 0.05 * w - 0.05 * wsh;           // loaded hip rides high
    this.hips.rotation.x = -c * 0.05;

    // ---- torso: counter-rotate shoulders vs hips, lean into movement ----
    this.torso.rotation.y = -s * 0.17 * w + blade * 0.6 + Math.sin(tt * 0.7) * 0.015 * idle + 0.05 * wsh;
    const leanX = -0.055 - alert * 0.05 - Math.max(0, fwdN) * 0.13 + Math.min(0, fwdN) * 0.06 - c * 0.24;
    this.torso.rotation.x = leanX + aimPitch * 0.55 + Math.sin(tt * 1.35) * 0.006 + 0.20 * fl;
    this.torso.rotation.z = -sideN * 0.07 - s * 0.03 * w + Math.sin(tt * 0.9 + 1.3) * 0.008 * idle
      + 0.042 * wsh + 0.10 * fl * this.flinchSide;              // shoulders relax off level

    // ---- rifle: shouldered when aiming (alert 1); low-ready with the muzzle
    // dropped ~35 deg, swung across the chest and slightly canted when
    // holding (alert < 1) so the carry reads deliberate, not propped ----
    const lowReady = 1 - alert;
    this.rifle.position.set(
      this.rifleRest.x + s * 0.006 * w,
      this.rifleRest.y - dip * 0.5 + Math.sin(tt * 1.35 + 0.6) * 0.003 - lowReady * 0.06,
      this.rifleRest.z + lowReady * 0.05
    );
    this.rifle.rotation.set(
      aimPitch * 0.45 * alert + c * 0.20 - lowReady * 0.80 + Math.sin(tt * 1.1) * 0.006 - 0.30 * fl,
      -0.035 - blade - s * 0.05 * w + Math.sin(tt * 0.83) * 0.005 - lowReady * 0.17,
      lowReady * 0.10
    );
    this._solveArms(0);

    // ---- head: cheek drops toward the stock when aiming, scans when idle ----
    const scan = (Math.sin(tt * 0.5 + this.scanP1) * 0.45 + Math.sin(tt * 0.21 + this.scanP2) * 0.3)
      * (1 - alert * 0.85) + Math.sin(tt * 0.62 + this.scanP1) * 0.05 * idle;
    const weld = alert * alert;   // cheek weld only when truly aimed
    this.head.position.x = -0.015 - weld * 0.022;
    this.head.rotation.y = -0.12 * weld - blade + scan + 0.04 * wsh * (1 - weld);
    this.head.rotation.x = aimPitch * 0.4 * alert - 0.06 * weld - leanX * 0.55 + Math.abs(s) * 0.015 * w
      + 0.28 * fl;
    this.head.rotation.z = -0.14 * weld + 0.065 * wsh * (1 - weld) + 0.12 * fl * this.flinchSide;

    this._updateFootPools(1);
  }

  // Two-stage death: knees buckle, then the torso twists and drops with
  // gravity ease-in, lands with a small bounce and settles.
  _updateDeath(dt) {
    this.deathT += dt;
    const t = this.deathT;
    const dir = -this.deathDir; // +1 falls backward (shot from the front)

    const buckle = smoothstep(0, 0.16, t);
    const fallT = clamp((t - 0.11) / 0.62, 0, 1);
    const f = Math.pow(fallT, 1.85);           // gravity: slow start, fast end
    const bt = t - 0.73;
    const bounce = bt > 0 ? Math.sin(bt * 24) * Math.exp(-bt * 9) * 0.05 : 0;
    const tw = this.deathTwist;

    this.root.rotation.x = dir * (1.50 * f + bounce);
    this.root.rotation.y = this.deathYaw + tw * f * 0.8;
    this.root.rotation.z = tw * f * -0.22;

    this.hips.position.y = HIP_Y - 0.36 * buckle - 0.38 * f;
    this.hips.position.z = 0.04 * buckle;
    this.hips.rotation.x = -0.1 * buckle + dir * 0.1 * f;
    this.hips.rotation.y = 0;
    this.hips.rotation.z = 0;

    // legs: buckle under, then sprawl asymmetrically
    this.legL.rotation.x = 0.55 * buckle * this.deathLegA - f * 0.5 * this.deathLegB;
    this.legR.rotation.x = 0.40 * buckle * this.deathLegB + f * 0.45 * this.deathLegA;
    this.legL.rotation.y = tw * 0.2 * f;
    this.legR.rotation.y = -tw * 0.15 * f;
    this.calfL.rotation.x = -1.5 * buckle + f * (1.5 * buckle - 0.3);
    this.calfR.rotation.x = -1.3 * buckle + f * (1.3 * buckle - 0.55 * this.deathLegA);

    // torso slumps then twists with the fall
    this.torso.rotation.x = -0.30 * buckle + dir * 0.28 * f;
    this.torso.rotation.y = tw * 0.45 * f;
    this.torso.rotation.z = tw * 0.18 * f;

    // head snaps forward on the hit, then lolls with the fall
    this.head.rotation.x = -0.35 * buckle + dir * 0.55 * f;
    this.head.rotation.y = tw * 0.3 * f;
    this.head.rotation.z = tw * 0.35 * f;

    // weapon pitches forward out of control; arms loosen toward a sprawl
    this.rifle.position.set(
      this.rifleRest.x - 0.03 * f,
      this.rifleRest.y - 0.14 * f,
      this.rifleRest.z - 0.02 * f
    );
    this.rifle.rotation.set(-1.15 * f - 0.25 * buckle, -0.06 + tw * 0.5 * f, tw * 0.3 * f);
    this._solveArms(f * 0.85);

    // Boot pools release quickly as the body leaves its stance
    this._updateFootPools(Math.max(0, 1 - t * 4));

    // Contact shadow: counter-rotate so it stays flat on the ground and
    // slides under the settling body; shrinks + fades as the body lands.
    _bq.setFromEuler(this.root.rotation);
    _bv.set(0, 0.72, 0).applyQuaternion(_bq);
    _bv.y = 0.02;
    _bqi.copy(_bq).invert();
    this.blob.quaternion.copy(_bqi);
    this.blob.position.copy(_bv.applyQuaternion(_bqi));
    this.blob.scale.setScalar(0.92 - 0.2 * f);
    this.blob.material.opacity = 0.66 - 0.3 * f;

    // Sink into the ground before removal
    if (t > 6) this.root.position.y -= dt * 0.25;
  }
}
