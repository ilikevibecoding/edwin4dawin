import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib } from '../world/textures.js';
import { makeRNG, clamp, lerp, damp } from '../core/math.js';

const NAMES = ['ASWAD', 'JACKAL', 'VIPER', 'KHAT', 'RAMI', 'ZOLTAN', 'HYENA', 'SCARAB', 'FALAK', 'DERVISH', 'MIRAGE', 'SIROCCO'];
const rng = makeRNG(5150);

/* ------------------------- shared soldier assets --------------------------- */
/* Geometries and canvas textures are built once at module level and shared by
   every soldier instance; materials are cached per variant (3 sets) so a full
   squad shares GPU state. Per-enemy cost is meshes + transforms only. */

let SHARED = null;

/** Sine-product crinkle: fabric fold displacement baked into a geometry once
 *  (deterministic in position, so the UV seam column stays welded). */
function crinkle(geo, amt, freq = 150) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + 1.7) * Math.sin(v.y * freq * 0.8 + 4.2) * Math.sin(v.z * freq + 2.9);
    const k = 1 + n * amt;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Limb fabric striation: LENGTHWISE fold ridges (nAng creases running along
 *  a Y-axis capsule/cylinder, slightly spiralled) plus horizontal pull-fold
 *  rings, displacing radius only so segment seams stay welded. Round 7 used
 *  isotropic crinkle noise — too small and directionless to read; these
 *  ridges wobble the SILHOUETTE by ±6-8% of radius and give the sun real
 *  normals to model, so sleeves/trousers stop reading as smooth tubes.
 *  nAng must stay an integer so the wrap seam is continuous. */
function striate(geo, aAng = 0.07, nAng = 7, aPull = 0.05, fPull = 46, ph = 0) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ang = Math.atan2(v.z, v.x);
    const ridge = Math.sin(ang * nAng + v.y * 3.0 + ph);
    const pull = Math.sin(v.y * fPull + ph * 1.7) * Math.sin(ang * 2 + 1.3);
    const k = 1 + ridge * aAng + pull * aPull;
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Skull + jaw head sculpted from one sphere so the equirect UV survives for
 *  the painted face map (u=0.25 faces local +Z). Replaces the old bare sphere
 *  that read as a clay pot / lathe urn: the cranium narrows side-to-side, the
 *  crown flattens, the occiput tucks toward the neck, and the lower-front
 *  hemisphere is pulled down and tapered into a jaw with a chin and a subtle
 *  nose ridge + brow step in the profile silhouette. ~560 tris, shared. */
function buildHeadGeo() {
  const R = 0.108;
  const geo = new THREE.SphereGeometry(R, 20, 14);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    const t = clamp(-y / R, 0, 1);          // 0 at equator, 1 at bottom pole
    x *= 0.84;                              // narrow the skull
    if (y > 0.55 * R) y = y * 0.93 + 0.55 * R * 0.07;  // flatten the crown
    if (y < 0) {
      const front = clamp(z / R, 0, 1);
      // Jaw: width tapers with depth (hardest at the chin), the chin
      // converges and juts slightly forward, the mandible is pulled down.
      x *= 1 - 0.36 * t * (0.35 + 0.65 * front);
      if (z > 0) {
        z *= 1 - 0.20 * t;
        y *= 1 + 0.40 * t * front;
        z += 0.015 * t * front;
      } else {
        y *= 1 - 0.30 * t;                  // occiput tucks onto the neck
        z *= 1 - 0.08 * t;
      }
    }
    // Profile features: nose ridge and brow step on the forward face.
    const ang = Math.atan2(x, z);           // horizontal angle off face fwd
    const ny = y / R;
    if (Math.abs(ang) < 0.38 && ny > -0.34 && ny < 0.10) {
      const lat = Math.cos((ang / 0.38) * Math.PI * 0.5);
      const prof = Math.sin(((ny + 0.34) / 0.44) * Math.PI); // peaks mid-nose
      z += 0.011 * lat * prof;
    }
    if (Math.abs(ang) < 0.62 && ny >= 0.10 && ny < 0.34) {
      const lat = Math.cos((ang / 0.62) * Math.PI * 0.5);
      z += 0.005 * lat;                     // brow ridge
    }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** 256px painted face, baked PER SKIN TONE (the tone is the canvas base and
 *  the material stays white — round 8 fix: multiplying a shared canvas by a
 *  dark material colour crushed every painted highlight to 55% and the eyes
 *  never opened). Canvas top = crown, x=64 = face centre (u=0.25). Built to
 *  the critic's 3-tone prescription, contrast exaggerated ~2x for the
 *  12-20px on-screen head: a LIT forehead plate, one continuous DARK eye
 *  strip split by a lit nose bridge (so it reads as two eyes, not a visor),
 *  and inside each eye a dark almond + pupil topped by a fat NEAR-WHITE
 *  glint — the "8 pixels of eye highlight" that makes the head read as
 *  human at range. Lower half is a hard-boundary beard mass. A final pass
 *  clamps minimum channel values so no pixel can crush to a black void. */
function paintFaceCanvas(skinHex) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${(skinHex >> 16) & 255},${(skinHex >> 8) & 255},${skinHex & 255})`;
  g.fillRect(0, 0, 256, 256);
  const fr = makeRNG(7741);
  // Skin unevenness
  for (let i = 0; i < 150; i++) {
    g.fillStyle = i % 2 ? 'rgba(150,96,66,0.05)' : 'rgba(255,238,214,0.06)';
    g.fillRect(fr() * 256, fr() * 256, 3 + fr() * 9, 3 + fr() * 9);
  }
  // Scalp stubble with a jagged hairline; temples pulled back so the whole
  // face plate stays open and readable.
  g.fillStyle = 'rgba(26,19,13,0.5)';
  g.fillRect(0, 0, 256, 48);
  for (let x = 0; x < 256; x += 4) g.fillRect(x, 48, 4, 3 + fr() * 9);
  g.fillRect(0, 48, 18, 54);      // temple stubble left of face
  g.fillRect(110, 48, 146, 54);   // wraps around the back to other temple
  // TONE 1 — LIT FOREHEAD PLATE: a bright band above the socket band so the
  // dark band below punches against it even at a 12-14px on-screen head.
  g.fillStyle = 'rgba(255,245,224,0.34)';
  g.fillRect(20, 60, 88, 40);
  g.fillStyle = 'rgba(70,45,30,0.10)';
  g.fillRect(40, 80, 48, 2);      // faint forehead creases
  g.fillRect(42, 90, 44, 2);
  // Lit brow ridge: the top edge of the value cliff.
  g.fillStyle = 'rgba(255,246,222,0.5)';
  g.fillRect(26, 100, 76, 3.5);
  // TONE 2 — BROW-TO-SOCKET SHADOW BAND (round 9): round 8 kept the LIT
  // pieces (brow bars / lid lines / whites averaged into one pale smear at
  // 12-15 m) while the dark strip washed out, so faces read as eyeless
  // skin. Flip the hierarchy: ONE hard near-black band from the brow shadow
  // down through the sockets — 2.2x the old strip, a full value step off
  // both the lit forehead and the lit cheeks — with the eyes as BRIGHT
  // glints INSIDE it. The band survives mip-filtering at a 14px head; the
  // glints read as two lighter dots to ~15-20 m and open into eyes by 8 m.
  g.fillStyle = 'rgba(13,8,5,0.66)';
  g.fillRect(24, 103.5, 80, 38);
  g.fillStyle = 'rgba(8,5,3,0.4)';
  g.fillRect(26, 114, 76, 17);    // deeper socket core at eye level
  // Eyes: fat near-white catch-light blocks with the pupil biting in — the
  // "8 pixels of eye highlight". The surrounding band guarantees the
  // contrast that round 8's lit lids diluted away.
  const eye = (cx) => {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath();
    g.ellipse(cx, 125, 11.5, 6.4, 0, 0, Math.PI * 2);   // socket pit
    g.fill();
    g.fillStyle = 'rgba(255,253,240,1)';
    g.fillRect(cx - 6, 118, 12, 6.5);                   // eye white + glint
    g.fillStyle = 'rgba(5,3,2,0.95)';
    g.beginPath();
    g.ellipse(cx + 1.2, 127.5, 3.9, 3.3, 0, 0, Math.PI * 2); // pupil
    g.fill();
    g.fillStyle = 'rgba(255,240,214,0.32)';
    g.fillRect(cx - 6, 133.5, 12, 2);                   // soft lower-lid light
  };
  eye(47);
  eye(81);
  // Nose: bridge column kept DIM — a half-step over the band, far below the
  // glints — so it splits the band into two sockets up close without
  // reading as a light bar or breaking the band at range.
  g.fillStyle = 'rgba(255,246,226,0.24)';
  g.fillRect(61, 112, 6, 30);
  g.fillStyle = 'rgba(30,18,12,0.62)';
  g.fillRect(55, 145, 18, 3);     // nose core shadow below the band
  g.fillStyle = 'rgba(16,10,7,0.65)';
  g.fillRect(57.5, 146, 3.5, 2.5); // nostrils
  g.fillRect(67, 146, 3.5, 2.5);
  // Cheek plates: lit zone the full width under the band — its lower cliff
  // edge — kept bright so the step survives fog.
  g.fillStyle = 'rgba(255,244,222,0.30)';
  g.fillRect(28, 141.5, 72, 7);
  g.fillStyle = 'rgba(255,242,220,0.20)';
  g.fillRect(29, 148, 17, 8);
  g.fillRect(82, 148, 17, 8);
  g.fillStyle = 'rgba(60,38,26,0.14)';
  g.fillRect(30, 150, 14, 6);
  g.fillRect(84, 150, 14, 6);
  // Moustache joined to the beard, mouth shadow line, lower-lip catch light
  g.fillStyle = 'rgba(20,13,9,0.74)';
  g.fillRect(48, 152, 32, 9);
  g.fillStyle = 'rgba(30,18,12,0.55)';
  g.fillRect(52, 162, 24, 3);
  g.fillStyle = 'rgba(255,228,206,0.25)';
  g.fillRect(56, 166, 16, 2.5);
  // TONE 3 — BEARD MASS with a HARD cheek-line boundary: one flat fill per
  // cheek wedge (sideburn root -> cheek line -> mouth corner -> jaw band),
  // a chin patch closing under the lip, and the full under-jaw/nape band.
  g.fillStyle = 'rgba(20,13,9,0.66)';
  g.beginPath();                  // left cheek wedge
  g.moveTo(16, 104); g.lineTo(30, 104); g.lineTo(40, 142); g.lineTo(50, 160);
  g.lineTo(48, 176); g.lineTo(16, 176);
  g.closePath(); g.fill();
  g.beginPath();                  // right cheek wedge
  g.moveTo(112, 104); g.lineTo(98, 104); g.lineTo(88, 142); g.lineTo(78, 160);
  g.lineTo(80, 176); g.lineTo(112, 176);
  g.closePath(); g.fill();
  g.fillRect(48, 168, 32, 10);    // chin patch under the lip gap
  g.fillRect(0, 174, 256, 82);    // jaw underside + nape wrap
  g.fillRect(0, 104, 16, 72);     // sideburn wrap to the back
  g.fillRect(112, 104, 144, 72);
  // Speckle INSIDE the mass only (keeps the outer boundary hard)
  for (let i = 0; i < 420; i++) {
    const bx = fr() * 256;
    const by = 152 + fr() * 100;
    if (by < 176 && bx > 46 && bx < 82 && by < 168 && by > 160) continue; // lip gap
    if (by < 174 && bx > 40 && bx < 88 && by < 152) continue;
    g.fillStyle = fr() > 0.5 ? 'rgba(14,10,7,0.4)' : 'rgba(34,24,16,0.35)';
    g.fillRect(bx, by, 1 + fr() * 2.2, 1 + fr() * 2.2);
  }
  // Under-jaw AO
  g.fillStyle = 'rgba(20,14,10,0.2)';
  g.fillRect(0, 232, 256, 24);
  // LUMINANCE FLOOR: keeps the darkest paint above a readable minimum so a
  // shaded face can never crush to an unrendered-looking black void (the
  // head no longer receives cast shadows, but night/interior light still
  // multiplies down). Floor sits low enough to preserve glint contrast.
  const img = g.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < 48) d[i] = 48;
    if (d[i + 1] < 38) d[i + 1] = 38;
    if (d[i + 2] < 30) d[i + 2] = 30;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** BOLD fold bands shared by the plain-fabric and camo canvases. Round 7's
 *  1.5-2.5px streaks at 8-18% alpha averaged out to a flat tube at gameplay
 *  distance — these are 6-15px crease bands at ~20-28% alpha with a 2.5px
 *  lit ridge edge, ~8 per tile (=> a fold every 2-3 screen px on a limb at
 *  5-8 m). Bands run down canvas-y (the limb axis on capsule UVs) with a
 *  sine wander whose period divides the tile so every edge wraps clean. */
function paintFolds(g, fr, dark = 0.22, lit = 0.15) {
  for (let i = 0; i < 8; i++) {
    const x0 = i * 32 + fr() * 14;
    const w = 6 + fr() * 9;
    const aD = dark * (0.75 + fr() * 0.5);
    const aL = lit * (0.7 + fr() * 0.6);
    const ph = fr() * Math.PI * 2;
    const amp = 4 + fr() * 7;
    const fq = (Math.PI * 2 * (1 + Math.floor(fr() * 2))) / 256; // integer waves per tile
    for (let y = 0; y < 256; y += 4) {
      const x = x0 + Math.sin(y * fq + ph) * amp;
      for (const dx of [-256, 0, 256]) {
        g.fillStyle = `rgba(36,30,21,${aD.toFixed(3)})`;
        g.fillRect(x + dx, y, w, 4);
        g.fillStyle = `rgba(255,250,236,${aL.toFixed(3)})`;
        g.fillRect(x + dx + w, y, 2.5, 4);
      }
    }
  }
  // Horizontal pull-crease strokes (push-up folds across the limb axis)
  for (let i = 0; i < 12; i++) {
    const y0 = fr() * 256, x0 = fr() * 256, len = 26 + fr() * 52;
    const a = 0.10 + fr() * 0.09;
    for (const dy of [-256, 0, 256]) for (const dx of [-256, 0, 256]) {
      g.fillStyle = `rgba(40,34,24,${a.toFixed(3)})`;
      g.fillRect(x0 + dx, y0 + dy - 2, len, 3.5);
      g.fillStyle = `rgba(255,250,238,${(a * 0.7).toFixed(3)})`;
      g.fillRect(x0 + dx, y0 + dy + 1.5, len, 2);
    }
  }
}

/** 256px tileable uniform fabric: twill weave rows, two-tone sun-fade/grime
 *  mottle, BOLD lengthwise fold bands (paintFolds), and dust specks.
 *  Multiplies the per-variant cloth tint; fold contrast is tuned to survive
 *  distance + fog on a 15px-wide on-screen limb. */
function paintFabricCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f0ede4';
  g.fillRect(0, 0, 256, 256);
  const fr = makeRNG(3317);
  g.fillStyle = 'rgba(60,52,40,0.10)';
  for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 256, 1);
  g.fillStyle = 'rgba(255,252,240,0.07)';
  for (let x = 0; x < 256; x += 5) g.fillRect(x, 0, 1, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = i % 2 ? 'rgba(52,44,32,0.07)' : 'rgba(255,250,236,0.06)';
    const x = fr() * 256, y = fr() * 256, w = 8 + fr() * 26, h = 6 + fr() * 20;
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) g.fillRect(x + dx, y + dy, w, h);
  }
  paintFolds(g, fr, 0.24, 0.16);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = fr() > 0.5 ? 'rgba(120,104,80,0.10)' : 'rgba(30,26,18,0.08)';
    g.fillRect(fr() * 256, fr() * 256, 1 + fr() * 2, 1 + fr() * 2);
  }
  return c;
}

/** 256px tileable 4-tone blotch camo with the fabric noise baked in. The
 *  tones span ~70..150 luminance (a full stop+) so the print still reads as
 *  a multi-tone uniform through fog at 25 m instead of averaging to one
 *  flat khaki. Blobs are drawn with 3x3 wrap offsets so the tile seams. */
function paintCamoCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const P = ['#847a5e', '#9d937a', '#655e48', '#4a4536'];
  g.fillStyle = P[0];
  g.fillRect(0, 0, 256, 256);
  const fr = makeRNG(6083);
  const blob = (color, n, rMin, rMax) => {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = fr() * 256, y = fr() * 256;
      const rx = rMin + fr() * (rMax - rMin), ry = rMin + fr() * (rMax - rMin);
      const rot = fr() * Math.PI;
      for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  blob(P[1], 26, 12, 34);
  blob(P[2], 30, 10, 30);
  blob(P[3], 22, 6, 18);
  g.fillStyle = 'rgba(0,0,0,0.09)';
  for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 256, 1);
  const nr = makeRNG(6084);
  // Same bold fold bands as the plain fabric (slightly softer so the print
  // still dominates) — the variant-0 camo sleeves must striate too.
  paintFolds(g, nr, 0.18, 0.11);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,248,230,0.05)' : 'rgba(20,18,12,0.05)';
    g.fillRect(nr() * 256, nr() * 256, 2 + nr() * 6, 2 + nr() * 6);
  }
  return c;
}

/** Bake a per-vertex colour multiplier into a geometry (used with material
 *  vertexColors). fn(v) returns a scalar shade or an [r,g,b] tint — this is
 *  how AO bands at the armpits/crotch/belt/cuffs and dust darkening at the
 *  lower legs get onto SHARED geometry with zero per-frame cost. */
function bakeAO(geo, fn) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let c = fn(v);
    if (typeof c === 'number') c = [c, c, c];
    arr[i * 3] = c[0];
    arr[i * 3 + 1] = c[1];
    arr[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
const aoRamp = (y, y0, y1) => clamp((y - y0) / (y1 - y0), 0, 1);

function getShared() {
  if (SHARED) return SHARED;

  // Face maps cached per skin tone (3 variants); anisotropy keeps the 2px
  // eye band crisp on the oblique sphere.
  const faceCache = new Map();
  const faceTexFor = (skinHex) => {
    let t = faceCache.get(skinHex);
    if (t) return t;
    t = new THREE.CanvasTexture(paintFaceCanvas(skinHex));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    faceCache.set(skinHex, t);
    return t;
  };

  // Head-cover map: cloth over the whole head, skin visible only through the
  // eye slit (baked per skin tone + cloth colour, cached). Dark gear-green =
  // knit balaclava; khaki = full shemagh wrap. The slit gets LIGHTENED skin
  // (lit flesh, not the multiplicative base tone) plus two dark almond eyes
  // and brow shadows, so a covered head at 6 m still reads as a face — a
  // black void under a helmet reads as an unrendered texture.
  const balaCache = new Map();
  const balaclavaTex = (skinHex, cloth = '#3a3d34') => {
    const key = skinHex + cloth;
    let tex = balaCache.get(key);
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = cloth;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 256, 1);   // knit rows
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < 256; x += 9) g.fillRect(x, 0, 2, 256);   // rib columns
    // Fold shading + a catch-light ridge so the slit reads as an opening
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(30, 103, 68, 5);
    g.fillStyle = 'rgba(0,0,0,0.34)';
    g.fillRect(30, 108, 68, 2);
    g.fillRect(32, 140, 64, 4);
    // Eye slit, ENLARGED for round 8 (the old 29-row slit rendered ~2px at
    // 7 m): LIT skin band first — floor HIGH (min 150/115/88) because the
    // light shemagh cloth sits near unlit-skin value — then a DARK eye
    // strip inside it with fat almond eyes and BRIGHT glints. Both cloth
    // tones get the same double-contrast read: lit band against dark knit,
    // dark strip + glints against light wrap.
    const sr = (skinHex >> 16) & 255, sg = (skinHex >> 8) & 255, sb = skinHex & 255;
    const lit = (v, f, mn) => Math.max(mn, Math.min(255, Math.round(v * f)));
    g.fillStyle = `rgb(${lit(sr, 1.9, 134)},${lit(sg, 1.85, 110)},${lit(sb, 1.75, 88)})`;
    g.fillRect(33, 110, 62, 32);
    // Round 9: the slit goes DARK-band-dominant — round 8's lit brow/lid
    // gaps averaged the whole opening into one pale strip at 12-15 m. A
    // thin lit lip at the very top of the opening, then one hard socket
    // band filling the slit, with fat near-white glints inside it.
    g.fillStyle = 'rgba(255,244,220,0.4)';
    g.fillRect(34, 110, 60, 3);
    g.fillStyle = 'rgba(12,7,5,0.64)';
    g.fillRect(33, 113, 62, 26);
    // Dim nose-bridge column (half-step over the band, well under the glints)
    g.fillStyle = 'rgba(255,242,216,0.24)';
    g.fillRect(61, 115, 6, 22);
    // Eyes: socket pit, WIDE eye-white + catch-light block, pupil biting in,
    // faint lit lower lid
    for (const cx of [49, 79]) {
      g.fillStyle = 'rgba(4,3,2,0.6)';
      g.beginPath();
      g.ellipse(cx, 126, 10.5, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,253,238,1)';
      g.fillRect(cx - 5.5, 118.5, 11, 6);
      g.fillStyle = 'rgba(4,3,2,0.92)';
      g.beginPath();
      g.ellipse(cx + 1, 128.5, 3.5, 3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,234,206,0.42)';
      g.fillRect(cx - 5, 133.5, 10, 1.5);
    }
    // Cloth-edge seam at the slit bottom
    g.fillStyle = 'rgba(12,8,6,0.45)';
    g.fillRect(33, 139, 62, 3);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    balaCache.set(key, tex);
    return tex;
  };

  // Uniform fabric + camo print: one canvas each, shared by every soldier.
  // fabricMap multiplies the per-variant cloth tint (weave + wrinkle streaks
  // + mottle), fabricRough reuses the same canvas as roughness variation,
  // camoMap is the 4-tone print for the variant-0 shirt and helmet covers.
  const fabC = paintFabricCanvas();
  const camC = paintCamoCanvas();
  const mkTex = (canvas, srgb, rep = 2) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const fabricMap = mkTex(fabC, true);
  const fabricRough = mkTex(fabC, false);
  const camoMap = mkTex(camC, true, 1.6);

  // Blob contact shadow: radial gradient, drawn under each soldier.
  const blobC = document.createElement('canvas');
  blobC.width = blobC.height = 128;
  const bc = blobC.getContext('2d');
  const grd = bc.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.4)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  bc.fillStyle = grd;
  bc.fillRect(0, 0, 128, 128);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2);
  // Palm/weapon contact AO: same radial blob at ~20% peak opacity, stuck to
  // the grip and handguard flats so the hands read as seated, not floating.
  const contactMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.55, depthWrite: false });

  // Helmet: sphere-cap shell with crinkled cloth-cover wrinkles (only above
  // the rim so the edge stays clean) + rim band; shroud/rails/strap geos.
  const helmGeo = new THREE.SphereGeometry(0.132, 16, 10, 0, Math.PI * 2, 0, 1.92);
  {
    const p = helmGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y > -0.02) {
        const n = Math.sin(v.x * 155 + 1.2) * Math.sin(v.y * 120 + 3.9) * Math.sin(v.z * 150 + 2.2);
        const k = 1 + n * 0.022;
        p.setXYZ(i, v.x * k, v.y * k, v.z * k);
      }
    }
    helmGeo.scale(1.02, 0.88, 1.10);
    helmGeo.computeVertexNormals();
  }

  const geo = {
    torsoUp: new RoundedBoxGeometry(0.46, 0.30, 0.27, 1, 0.035),
    torsoLow: new RoundedBoxGeometry(0.43, 0.34, 0.25, 1, 0.03),
    pad: new RoundedBoxGeometry(0.15, 0.12, 0.24, 1, 0.035),
    vest: new RoundedBoxGeometry(0.42, 0.38, 0.35, 1, 0.02),
    pouch: new RoundedBoxGeometry(0.095, 0.135, 0.078, 1, 0.015),
    pouchLid: new RoundedBoxGeometry(0.108, 0.038, 0.088, 1, 0.012),
    // Carrier furniture: kangaroo panel behind the mag pouches, near-black
    // seam plates (baked contact shadow where each pouch meets the vest),
    // shoulder straps, a cross-body sling ribbon, shoulder radio + dump pouch.
    panel: new RoundedBoxGeometry(0.34, 0.235, 0.016, 1, 0.006),
    pouchSeam: new RoundedBoxGeometry(0.115, 0.155, 0.012, 1, 0.004),
    shoulderStrap: new RoundedBoxGeometry(0.075, 0.026, 0.19, 1, 0.008),
    bodySlingA: new THREE.BoxGeometry(0.035, 0.29, 0.009),
    bodySlingB: new THREE.BoxGeometry(0.035, 0.32, 0.009),
    radio: new RoundedBoxGeometry(0.055, 0.10, 0.05, 1, 0.008),
    dump: new RoundedBoxGeometry(0.125, 0.16, 0.105, 1, 0.015),
    buckle: new THREE.BoxGeometry(0.05, 0.042, 0.014),
    belt: new RoundedBoxGeometry(0.45, 0.09, 0.31, 1, 0.02),
    collar: new THREE.CylinderGeometry(0.075, 0.083, 0.07, 8),
    head: buildHeadGeo(),
    neck: new THREE.CylinderGeometry(0.052, 0.058, 0.09, 8),
    // Helmet furniture
    helmet: helmGeo,
    helmRim: new THREE.TorusGeometry(0.128, 0.009, 5, 14).rotateX(Math.PI / 2).scale(1.02, 1, 1.10),
    nvgShroud: new RoundedBoxGeometry(0.055, 0.05, 0.016, 1, 0.004),
    nvgPlate: new RoundedBoxGeometry(0.028, 0.03, 0.012, 1, 0.003),
    sideRail: new RoundedBoxGeometry(0.014, 0.026, 0.10, 1, 0.004),
    strapSide: new THREE.BoxGeometry(0.009, 0.1, 0.004),
    chinCup: new RoundedBoxGeometry(0.036, 0.014, 0.03, 1, 0.004),
    // Wrap sunglasses (round 9): two squashed lens bulges + bridge + temple
    // arms. A geometric dark band with a real specular glint is the eye
    // read that survives ANY distance — painted sockets mip away at 20 m,
    // a glossy black bulge pair never does.
    shadeLens: new THREE.SphereGeometry(0.027, 12, 8),
    shadeBridge: new THREE.BoxGeometry(0.026, 0.011, 0.014),
    shadeArm: new THREE.BoxGeometry(0.0075, 0.011, 0.105),
    // Head-wrap furniture. Round 8: the round-7 slit between dome rim and
    // scarf top was ~0.03 tall — 2px on screen at 7 m, so wrapped heads
    // still read as featureless pots. The dome is cut at polar 1.45 (rim
    // ~+0.013 local, tucked behind the band/cords) and the scarf drops to
    // polar 1.52, opening a ~0.07 eye zone that shows the painted slit
    // (dark strip + glints) at gameplay distance.
    wrapDome: crinkle(new THREE.SphereGeometry(0.122, 14, 9, 0, Math.PI * 2, 0, 1.45), 0.03).scale(0.97, 0.9, 1.03),
    // Band/cord rings must clear the dome SURFACE radius (~0.118/0.126 in
    // x/z) or they bury inside the cloth and vanish — sized to poke ~1.5cm.
    wrapBand: new THREE.TorusGeometry(0.118, 0.017, 5, 12).rotateX(Math.PI / 2).scale(1, 0.9, 1.05),
    faceScarf: crinkle(new THREE.SphereGeometry(0.115, 14, 7, 0, Math.PI * 2, 1.52, 1.05), 0.028),
    tail: new THREE.BoxGeometry(0.12, 0.23, 0.028),
    // Keffiyeh (variant 2): near-black agal cords + hanging side/back drapes
    agal: new THREE.TorusGeometry(0.114, 0.016, 6, 14).rotateX(Math.PI / 2).scale(1, 0.85, 1.08),
    drapeSide: new THREE.BoxGeometry(0.034, 0.20, 0.10),
    drapeBack: new THREE.BoxGeometry(0.17, 0.22, 0.03),
    shemagh: new THREE.TorusGeometry(0.085, 0.035, 6, 12).rotateX(Math.PI / 2).scale(1, 0.45, 1),
    // Limbs: STRIATED capsules — lengthwise fold ridges wobble the
    // silhouette ±6-8% and catch the sun (round 7's crinkle noise was
    // sub-pixel) — with vertex AO wedges added below; joint balls bridge
    // the elbow/knee segment seams so bent joints don't split apart.
    upperArm: striate(new THREE.CapsuleGeometry(0.062, 0.19, 4, 14), 0.07, 7, 0.05, 52, 1.0),
    foreArm: striate(new THREE.CapsuleGeometry(0.05, 0.18, 4, 14), 0.075, 6, 0.05, 60, 2.0),
    foreArmBare: new THREE.CapsuleGeometry(0.044, 0.17, 3, 10),
    elbowBall: new THREE.SphereGeometry(0.052, 8, 6),
    rollCuff: new THREE.TorusGeometry(0.05, 0.017, 6, 10).rotateX(Math.PI / 2),
    // Cuff breaks: sleeve-into-glove ring + glove wrist stub at the forearm
    // end, and a thin cuff ring for the bare rolled-sleeve wrist.
    cuffRing: new THREE.TorusGeometry(0.046, 0.012, 6, 12).rotateX(Math.PI / 2),
    gloveCuff: new THREE.TorusGeometry(0.04, 0.009, 6, 12).rotateX(Math.PI / 2),
    wristStub: new THREE.CylinderGeometry(0.041, 0.037, 0.06, 10),
    // Hand kit: palm blocks, fused finger tubes and thumbs assembled per
    // hand in buildSoldier so the mitts visibly CLOSE around the grip and
    // handguard instead of floating alongside them.
    palmR: new RoundedBoxGeometry(0.062, 0.078, 0.042, 1, 0.012),
    palmL: new RoundedBoxGeometry(0.066, 0.034, 0.086, 1, 0.01),
    wristPad: new RoundedBoxGeometry(0.052, 0.05, 0.054, 1, 0.012),
    finger: new THREE.CapsuleGeometry(0.0125, 0.034, 2, 6),
    thumb: new THREE.CapsuleGeometry(0.0115, 0.03, 2, 6),
    // Finger-block furniture (round 9): near-black seam slots wedged between
    // adjacent fingers (V = vertical support-hand fingers, H = stacked grip
    // fingers) and a knuckle plate riding the finger roots — the mitten
    // splits into a 4-finger block + thumb at 5-10 m.
    fingerSeamV: new THREE.BoxGeometry(0.02, 0.034, 0.0045),
    fingerSeamH: new THREE.BoxGeometry(0.034, 0.0045, 0.02),
    knuckle: new RoundedBoxGeometry(0.024, 0.016, 0.078, 1, 0.005),
    contactAO: new THREE.PlaneGeometry(0.075, 0.055),
    thigh: striate(new THREE.CapsuleGeometry(0.082, 0.27, 4, 16), 0.06, 8, 0.045, 38, 0.5),
    // Shin is a TAPERED tube (calf bulge -> ankle) — the calf-to-ankle taper
    // breaks the capsule-leg read; the boot shaft swallows its lower end so
    // no pale rounded cap can ever poke out as a "bare heel" again.
    shin: striate(new THREE.CylinderGeometry(0.067, 0.046, 0.30, 16, 10), 0.065, 7, 0.05, 44, 1.9),
    jointBall: new THREE.SphereGeometry(0.06, 8, 6),
    cargo: new RoundedBoxGeometry(0.035, 0.135, 0.115, 1, 0.01),
    pelvis: new RoundedBoxGeometry(0.4, 0.18, 0.26, 1, 0.05),
    kneepad: new RoundedBoxGeometry(0.115, 0.13, 0.05, 1, 0.018),
    strap: new THREE.BoxGeometry(0.36, 0.025, 0.02),
    // Trouser blousing: WIDER flared cone overhanging the boot shaft (the
    // old ring matched the shin radius and vanished), with a near-black
    // tuck ring under its lip so the trouser-to-boot break reads at 20 m.
    blouse: new THREE.CylinderGeometry(0.072, 0.094, 0.09, 12),
    bootCuff: new THREE.TorusGeometry(0.082, 0.012, 6, 12).rotateX(Math.PI / 2),
    // Boots: dark shaft flaring slightly outward toward the ankle + foot box
    // + a wider near-black sole slab (the sole step).
    bootShaft: new THREE.CylinderGeometry(0.054, 0.064, 0.15, 10),
    bootFoot: new RoundedBoxGeometry(0.10, 0.075, 0.235, 1, 0.02),
    bootSole: new RoundedBoxGeometry(0.112, 0.03, 0.272, 1, 0.008),
    thighRig: new RoundedBoxGeometry(0.09, 0.13, 0.11, 1, 0.015),
    canteen: new RoundedBoxGeometry(0.1, 0.14, 0.08, 1, 0.02),
    buttpack: new RoundedBoxGeometry(0.2, 0.14, 0.1, 1, 0.02),
    holster: new RoundedBoxGeometry(0.06, 0.16, 0.09, 1, 0.015),
    chestPouch: new RoundedBoxGeometry(0.14, 0.09, 0.05, 1, 0.012),
    hydration: new RoundedBoxGeometry(0.2, 0.3, 0.035, 1, 0.015),
    antenna: new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6),
    // Rifle parts (assembled per soldier in buildEnemyRifle, geo shared).
    // Sized for the 10-15m read: fat receiver, deep 3-segment banana mag,
    // boxy optic on the top cover, tall front-sight tower, distinct stock.
    rReceiver: new RoundedBoxGeometry(0.048, 0.075, 0.27, 1, 0.008),
    rDustCover: new RoundedBoxGeometry(0.042, 0.024, 0.20, 1, 0.006),
    rRearSight: new THREE.BoxGeometry(0.024, 0.018, 0.03),
    rSightLeaf: new THREE.BoxGeometry(0.012, 0.005, 0.055),
    rOpticMount: new THREE.BoxGeometry(0.03, 0.022, 0.08),
    rOptic: new RoundedBoxGeometry(0.038, 0.046, 0.095, 1, 0.007),
    rHandguard: new RoundedBoxGeometry(0.054, 0.054, 0.17, 1, 0.012),
    rGasTube: new RoundedBoxGeometry(0.034, 0.028, 0.16, 1, 0.009),
    rBarrel: new THREE.CylinderGeometry(0.010, 0.0115, 0.20, 10).rotateX(Math.PI / 2),
    rGasBlock: new THREE.BoxGeometry(0.026, 0.037, 0.028),
    rFsTower: new THREE.BoxGeometry(0.024, 0.06, 0.024),
    rFsEar: new THREE.BoxGeometry(0.006, 0.036, 0.016),
    rFsPost: new THREE.CylinderGeometry(0.0022, 0.0022, 0.026, 6),
    rBrake: new THREE.CylinderGeometry(0.0135, 0.0155, 0.05, 10).rotateX(Math.PI / 2),
    rStock: new RoundedBoxGeometry(0.042, 0.07, 0.24, 1, 0.008),
    rButtpad: new RoundedBoxGeometry(0.05, 0.10, 0.024, 1, 0.006),
    rGrip: new RoundedBoxGeometry(0.034, 0.09, 0.045, 1, 0.009),
    rTrigger: new THREE.BoxGeometry(0.004, 0.018, 0.006),
    rGuard: new THREE.BoxGeometry(0.024, 0.004, 0.052),
    rMag1: new RoundedBoxGeometry(0.038, 0.115, 0.062, 1, 0.006),
    rMag2: new RoundedBoxGeometry(0.036, 0.105, 0.058, 1, 0.006),
    rMag3: new RoundedBoxGeometry(0.034, 0.09, 0.052, 1, 0.006),
    // Sling straps (webbing run: stock heel -> sag under receiver -> guard)
    rSlingA: new THREE.BoxGeometry(0.026, 0.007, 0.212),
    rSlingB: new THREE.BoxGeometry(0.026, 0.007, 0.196),
    rSlingC: new THREE.BoxGeometry(0.026, 0.007, 0.25),
  };

  // ---- baked vertex AO / grime on every cloth-family geometry (these all
  // render with vertexColors materials): armpit + crotch occlusion, under-
  // vest and belt-line bands, elbow/knee creases, and cool dust darkening
  // down the forearms and lower legs. Zero runtime cost, survives fog.
  // Joint AO wedges pushed harder for round 8: armpit/elbow/knee-pit bands
  // must survive the warm sun + fog at 15 m, not just up close.
  bakeAO(geo.upperArm, (v) => 1 - 0.44 * aoRamp(v.y, 0.02, 0.15) - 0.16 * aoRamp(-v.y, 0.07, 0.15));
  bakeAO(geo.foreArm, (v) => {
    const d = aoRamp(-v.y, 0.03, 0.13);
    const a = 1 - 0.34 * aoRamp(v.y, 0.03, 0.13);
    return [a - 0.10 * d, a - 0.12 * d, a - 0.18 * d];
  });
  bakeAO(geo.thigh, (v) => 1 - 0.46 * aoRamp(v.y, 0.04, 0.20) - 0.22 * aoRamp(-v.y, 0.10, 0.21));
  bakeAO(geo.shin, (v) => {
    const d = aoRamp(-v.y, 0.0, 0.14);
    const a = 1 - 0.30 * aoRamp(v.y, 0.03, 0.14);
    return [a - 0.13 * d, a - 0.15 * d, a - 0.22 * d];
  });
  bakeAO(geo.torsoUp, (v) => 1 - 0.24 * aoRamp(-v.y, 0.04, 0.14) - 0.10 * aoRamp(v.y, 0.10, 0.15));
  bakeAO(geo.torsoLow, (v) => 1 - 0.20 * aoRamp(v.y, 0.05, 0.16) - 0.28 * aoRamp(-v.y, 0.07, 0.16));
  bakeAO(geo.pelvis, (v) => 1 - 0.30 * aoRamp(-v.y, 0.01, 0.08));
  bakeAO(geo.pad, () => 1);
  bakeAO(geo.collar, () => 0.8);
  bakeAO(geo.blouse, (v) => 0.82 - 0.16 * aoRamp(-v.y, 0, 0.045));
  bakeAO(geo.bootCuff, () => 0.5);
  bakeAO(geo.cuffRing, () => 0.72);
  bakeAO(geo.cargo, () => 0.96);
  // Joint balls sit in the crease shadow of the bend — darker than round 7
  // so knees/elbows read as folded joints, not smooth tube junctions.
  bakeAO(geo.jointBall, () => 0.78);
  bakeAO(geo.elbowBall, () => 0.8);
  bakeAO(geo.rollCuff, () => 0.88);

  // ---- shared (variant-independent) materials. All soft goods are matte:
  // metalness 0, roughness >= 0.85, envMapIntensity <= 0.4, so no strap or
  // vest panel can catch a blown-out specular streak in direct sun.
  const mats = {
    glove: new THREE.MeshStandardMaterial({ color: 0x3a322a, roughness: 0.9, metalness: 0, envMapIntensity: 0.35 }),
    // Boot leather two values above the sole rubber, both far darker than
    // the trousers — the feet must read as near-black blocks at 25 m.
    boot: new THREE.MeshStandardMaterial({ color: 0x251c12, roughness: 0.82, metalness: 0, envMapIntensity: 0.35 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x15110c, roughness: 0.95, metalness: 0, envMapIntensity: 0.25 }),
    knee: new THREE.MeshStandardMaterial({ color: 0x2e3126, roughness: 0.94, metalness: 0, envMapIntensity: 0.35 }),
    // Webbing tan is kept a step below blown white and fully matte — in sun
    // the old bright strap read as an emissive streak across the chest.
    strap: new THREE.MeshStandardMaterial({ color: 0x8a7856, roughness: 1, metalness: 0, envMapIntensity: 0.3 }),
    gearHard: new THREE.MeshStandardMaterial({ color: 0x2c2c26, roughness: 0.9, metalness: 0, envMapIntensity: 0.4 }),
    // Near-black webbing: body sling, pouch seam shadows, chinstraps.
    seam: new THREE.MeshStandardMaterial({ color: 0x16130e, roughness: 1, metalness: 0, envMapIntensity: 0.2 }),
    // Furniture tones sit a full value step above the near-black receiver so
    // the rifle reads two-tone (not a featureless black stick) even when the
    // camera side of the soldier is in shadow.
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5c33, roughness: 0.65, metalness: 0, envMapIntensity: 0.5 }),
    polymer: new THREE.MeshStandardMaterial({ color: 0x4a4f43, roughness: 0.85, metalness: 0, envMapIntensity: 0.4 }),
    // Head cloth: LIGHT wraps (they must contrast against the darker
    // uniform and read as headgear, not scalp), near-black agal cords.
    wrapCloth: new THREE.MeshStandardMaterial({ color: 0x9a8d6e, roughness: 1, metalness: 0, envMapIntensity: 0.35, map: fabricMap }),
    keffiyeh: new THREE.MeshStandardMaterial({ color: 0xa89e83, roughness: 1, metalness: 0, envMapIntensity: 0.35, map: fabricMap }),
    agal: new THREE.MeshStandardMaterial({ color: 0x17130e, roughness: 0.95, metalness: 0, envMapIntensity: 0.25 }),
    shemCloth: new THREE.MeshStandardMaterial({ color: 0x6b6350, roughness: 1, metalness: 0, envMapIntensity: 0.35 }),
    // Wrap-shade lens: the ONE deliberately glossy soft-goods exception —
    // near-black with a hot env/sun glint so the eye band sparkles at range.
    shade: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.16, metalness: 0.3, envMapIntensity: 1.5 }),
  };
  // Helmet cloth cover: the shared camo print pulled DOWN a step so the
  // helmet separates from both the face below and the lighter shirt.
  mats.helmCover = new THREE.MeshStandardMaterial({
    color: 0xaaa593, map: camoMap, roughnessMap: fabricRough,
    roughness: 0.92, metalness: 0, envMapIntensity: 0.35,
  });

  SHARED = { faceTexFor, balaclavaTex, fabricMap, fabricRough, camoMap, blobGeo, blobMat, contactMat, geo, mats, variantCache: new Map() };
  return SHARED;
}

/** Per-variant material set, cached so all soldiers of a variant share GPU
 *  state (de-cloning comes from headgear rolls, gear pool + scale jitter). */
function getVariantMats(variant) {
  const S = getShared();
  const key = variant % 3;
  let m = S.variantCache.get(key);
  if (m) return m;
  // Round 8: skin tones lifted ~18% (the old multipliers crushed the painted
  // face toward mud even in full sun) and roughness dropped so the sun
  // actually MODELS the head — brow plate lit, jaw turning away darkens.
  const skinTone = [0x82664f, 0x6b4f3a, 0x917057][key];
  // Tiny emissive floor on every head/skin material: shaded faces (helmet
  // shadow, balaclava) keep a readable minimum instead of crushing to a
  // pure-black void that reads as an unrendered texture.
  const FACE_FLOOR = 0x0d0b09;
  const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.82, emissive: FACE_FLOOR, envMapIntensity: 0.4 });
  // Face map carries the skin tone itself (white material) so painted
  // highlights — the eye glints above all — render at full brightness.
  const face = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, map: S.faceTexFor(skinTone), emissive: FACE_FLOOR, envMapIntensity: 0.4 });
  // Bare forearms/neck: a darker, desaturated sun-tan — the lifted face
  // tone rendered rolled-sleeve arms as smooth salmon tubes in full sun.
  const armSkin = new THREE.MeshStandardMaterial({
    color: [0x5c4938, 0x4d3a2b, 0x604b39][key],
    roughness: 0.9, emissive: FACE_FLOOR, envMapIntensity: 0.35,
  });
  // VALUE BLOCKING (the fix for "one flat khaki mannequin"): shirt is the
  // lightest block, trousers a full value step darker, vest/rig darker
  // still, boots near-black. Each step must survive 25 m + fog, so the
  // gaps are big: shirt ~0.45 lum, pants ~0.28, vest ~0.18, boots ~0.08.
  let cloth;
  if (key === 0) {
    cloth = new THREE.MeshStandardMaterial({
      color: 0xe0dac4, map: S.camoMap, roughnessMap: S.fabricRough,
      roughness: 0.96, vertexColors: true,
    });
  } else {
    cloth = new THREE.MeshStandardMaterial({
      color: key === 1 ? 0x8a8465 : 0x93866a,
      map: S.fabricMap, roughnessMap: S.fabricRough,
      roughness: 0.96, vertexColors: true,
    });
  }
  cloth.metalness = 0;
  cloth.envMapIntensity = 0.3;
  const clothLow = cloth.clone();
  clothLow.color.multiplyScalar(0.74);      // fake AO under the vest
  const pants = new THREE.MeshStandardMaterial({
    color: [0x504c3e, 0x463c2f, 0x4d4d43][key],
    roughness: 0.96, metalness: 0, envMapIntensity: 0.3,
    map: S.fabricMap, roughnessMap: S.fabricRough, vertexColors: true,
  });
  const vest = new THREE.MeshStandardMaterial({
    color: [0x33352a, 0x3d3527, 0x2f312a][key],
    roughness: 0.94, metalness: 0, envMapIntensity: 0.3, map: S.fabricMap,
  });
  const pouch = new THREE.MeshStandardMaterial({
    color: [0x484a38, 0x52452e, 0x43453a][key],
    roughness: 0.94, metalness: 0, envMapIntensity: 0.3, map: S.fabricMap,
  });
  const gear = vest.clone();
  gear.color.multiplyScalar(1.16);
  const gearDark = vest.clone();
  gearDark.color.multiplyScalar(0.72);
  // Covered heads get a slightly stronger floor: the knit/wrap cloth often
  // sits in helmet or building shade. Balaclava knit lifted a step from
  // near-black (round 7 rendered it as a void) — it still reads as a MASK
  // against the lit eye band; the full wrap is light khaki.
  const bala = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.5, map: S.balaclavaTex(skinTone, '#3b3f34'), emissive: 0x0e0c0a });
  const wrap = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.5, map: S.balaclavaTex(skinTone, '#8a7c5e'), emissive: 0x0e0c0a });
  m = { skinTone, skin, face, armSkin, cloth, clothLow, pants, vest, pouch, gear, gearDark, bala, wrap };
  S.variantCache.set(key, m);
  return m;
}

/* ----------------------------- enemy rifle --------------------------------- */
/* Local copy of the world-model rifle (owned here so concurrent edits to the
   viewmodel file can't break enemies). AKM-pattern: chamfered stamped
   receiver + dust cover, wood OR polymer furniture, curved 2-segment mag,
   gas tube over the handguard, gas block, front sight tower with post and
   protective ears, slanted brake. Forward = -Z, origin at the receiver rear
   above the grip so mount math stays simple. kind: 0 = wood, 1 = polymer. */
function buildEnemyRifle(kind = 0) {
  const lib = getMaterialLib();
  const S = getShared();
  const G = S.geo;
  const metal = lib.gunMetal;
  const furn = kind === 0 ? S.mats.wood : S.mats.polymer;
  const g = new THREE.Group();
  const add = (geoRef, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geoRef, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(G.rReceiver, metal, 0, 0, -0.01);
  add(G.rDustCover, metal, 0, 0.045, -0.03);
  add(G.rRearSight, metal, 0, 0.052, -0.10);
  add(G.rSightLeaf, metal, 0, 0.063, -0.085, -0.06);
  // Boxy red-dot silhouette on a riser over the rear cover
  add(G.rOpticMount, metal, 0, 0.055, 0.015);
  add(G.rOptic, S.mats.gearHard, 0, 0.085, 0.01);
  add(G.rHandguard, furn, 0, -0.002, -0.245);
  add(G.rGasTube, furn, 0, 0.044, -0.245);
  add(G.rBarrel, metal, 0, 0.021, -0.42);
  add(G.rGasBlock, metal, 0, 0.038, -0.345);
  add(G.rFsTower, metal, 0, 0.055, -0.465);
  add(G.rFsEar, metal, -0.012, 0.07, -0.465);
  add(G.rFsEar, metal, 0.012, 0.07, -0.465);
  add(G.rFsPost, metal, 0, 0.078, -0.465);
  add(G.rBrake, metal, 0, 0.021, -0.525);
  add(G.rStock, furn, 0, -0.02, 0.17, -0.06);
  add(G.rButtpad, S.mats.gearHard, 0, -0.035, 0.29, -0.06);
  add(G.rGrip, furn, 0, -0.068, 0.05, 0.30);
  add(G.rTrigger, metal, 0, -0.046, 0.008);
  add(G.rGuard, metal, 0, -0.06, 0.002);
  // Deep curved magazine: three segments canted progressively forward so
  // the banana profile reads even against the torso at range.
  add(G.rMag1, metal, 0, -0.072, -0.048, 0.24);
  add(G.rMag2, metal, 0, -0.16, -0.085, 0.58);
  add(G.rMag3, metal, 0, -0.228, -0.14, 0.92);
  // Sling: stock heel down under the receiver, flat sag, up to the guard.
  add(G.rSlingA, S.mats.seam, 0, -0.115, 0.193, -0.497);
  add(G.rSlingB, S.mats.seam, 0, -0.165, 0.005, 0);
  add(G.rSlingC, S.mats.seam, 0, -0.10, -0.195, 0.554);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.021, -0.555);
  g.add(muzzle);
  return { group: g, muzzle };
}

/* --------------------- weapon mount pose constants ------------------------- */
/* The aim group pivot sits at the RIGHT SHOULDER POCKET. Each enemy blends
   ONE carry pose (low-ready / high-ready / slung, assigned per variant) with
   the shared MOUNT pose by aimBlend each frame. The blend is a DIRECT
   quaternion slerp along the short arc: the bore sweeps monotonically from
   the carry attitude onto the target line, so no intermediate frame can
   ever show a vertical/port-arms rifle.

   MOUNT (engaging): stock butt socketed into the pocket, bore running +Z in
   group space ~4cm above the pivot (cheek-weld height). Because the mounted
   bore is exactly +Z, the per-frame aim solve is closed-form and roll-free.

   LOW-READY (default hold in combat and on patrol): the butt plate slides
   just out of the pocket onto the FRONT DELTOID, the bore drops 26 deg
   below horizon (the ~6 deg forward combat lean brings the world-space
   depression to ~32 deg, inside the 25-35 low-ready band) and sweeps 40 deg
   across the chest, so the muzzle clears the support-side hip and the rifle
   reads as one long diagonal line across the torso even when the soldier is
   squared up to the viewer (a smaller sweep foreshortens into a near-
   vertical sliver from the front — verified on captures). */
const RIFLE_P_MOUNT = new THREE.Vector3(0, 0.035, 0.27);
const RIFLE_Q_MOUNT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0.055));
// Low-ready sits a hand-width further OFF the chest than before: with the
// rig pouches projecting ~8cm the old hold pressed the receiver into the
// vest and the whole gun fused into the torso silhouette ("rifle fused flat
// against his chest"). Daylight between weapon and vest is what sells the
// two-handed carry at range.
const RIFLE_P_LOW = new THREE.Vector3(-0.115, -0.125, 0.30);
const RIFLE_Q_LOW = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, Math.PI - 0.66, 0.12));
/* Round 9 — CARRY TEMPLATES. Three at-rest carriages assigned per enemy
   (deterministic by variant) so a squad stops reading as one actor
   triplicated; each blends into the same MOUNT through aimBlend, so the
   raise/fire machinery is untouched.

   HIGH-READY: butt stays socketed in the shoulder pocket, bore pitched
   ~22 deg above horizon and swept ~26 deg across the body so the piece
   reads as an up-left DIAGONAL from the front (a smaller sweep foreshortens
   into a vertical port-arms sliver — iteration-1 failure) — both elbows
   tucked (see POLE_*_TUCK), muzzle at chin height off the support shoulder.

   SLUNG: the rifle hangs muzzle-down (~70 deg) across the chest on the
   cross-body sling ribbon, receiver at the sternum, stock climbing to the
   right shoulder. The SUPPORT hand rests on the forend (IK as usual); the
   strong arm hangs relaxed at the side, its hand hopping off the grip onto
   the wrist tip (see _setHandROnGun) until the piece mounts. */
const RIFLE_P_HIGH = new THREE.Vector3(-0.126, 0.10, 0.254);
const RIFLE_Q_HIGH = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.34, Math.PI - 0.45, 0.05));
const RIFLE_P_SLUNG = new THREE.Vector3(-0.15, -0.295, 0.19);
const RIFLE_Q_SLUNG = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.22, Math.PI - 0.30, 0.12));
const CARRY_POSE = {
  low: [RIFLE_P_LOW, RIFLE_Q_LOW],
  high: [RIFLE_P_HIGH, RIFLE_Q_HIGH],
  slung: [RIFLE_P_SLUNG, RIFLE_Q_SLUNG],
};
// Elbow poles for the tucked high-ready carry; strong-arm hang for slung.
const POLE_R_TUCK = new THREE.Vector3(0.15, -0.95, -0.02);
const POLE_L_TUCK = new THREE.Vector3(-0.12, -0.95, 0.10);
const RELAX_Q_R = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.14, 0, -0.09));
const AIM_POS = new THREE.Vector3(0.17, 0.505, 0.12);
// Hands are welded to the rifle; wrists (IK targets) sit just behind them.
const IK_R = new THREE.Vector3(0.012, -0.105, 0.125);  // rifle-local, behind grip
const IK_L = new THREE.Vector3(-0.008, -0.05, -0.135); // rifle-local, behind guard
const POLE_R = new THREE.Vector3(0.6, -0.85, 0.1);     // right elbow: down + out
const POLE_L = new THREE.Vector3(-0.45, -0.85, 0.18);  // left elbow: down + out

/* Scratch objects for the per-frame solver (no per-frame allocations). */
const _aV1 = new THREE.Vector3();
const _aV2 = new THREE.Vector3();
const _aV3 = new THREE.Vector3();
const _aQ1 = new THREE.Quaternion();
const _aQSway = new THREE.Quaternion();
const _aE = new THREE.Euler();
const _tTo = new THREE.Vector3();
const _tDir = new THREE.Vector3();
const _tEye = new THREE.Vector3();
const _tPEye = new THREE.Vector3();
const _tPush = new THREE.Vector3();
const _tAxis = new THREE.Vector3();

/* Two-bone IK: orient shoulder + elbow so the wrist lands on `target` (in the
   shoulder's parent space). Chain: elbow at shoulder-local (0,-L1,0), forearm
   along -Y, wrist at elbow-local (0,-L2,0); elbow bends about local +X with
   negative values folding the forearm forward. `pole` biases elbow direction.
   Fully scratch-based: called twice per enemy per frame. */
const _sD = new THREE.Vector3();
const _sM = new THREE.Vector3();
const _sU = new THREE.Vector3();
const _sE2 = new THREE.Vector3();
const _sF = new THREE.Vector3();
const _sX = new THREE.Vector3();
const _sZ = new THREE.Vector3();
const _sMat = new THREE.Matrix4();
function solveArm(arm, target, pole, L1 = 0.30, L2 = 0.29) {
  const s = arm.shoulder.position;
  _sD.copy(target).sub(s);
  const d = clamp(_sD.length(), Math.abs(L1 - L2) + 0.02, (L1 + L2) * 0.99);
  _sD.normalize();
  const cosE = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const elbowAng = Math.acos(cosE);
  const cosS = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const shAng = Math.acos(cosS);
  _sM.copy(pole).addScaledVector(_sD, -pole.dot(_sD));
  if (_sM.lengthSq() < 1e-6) _sM.set(0, 0, 1);
  _sM.normalize();
  _sU.copy(_sD).multiplyScalar(Math.cos(shAng)).addScaledVector(_sM, Math.sin(shAng));
  _sE2.copy(s).addScaledVector(_sU, L1);
  _sF.copy(target).sub(_sE2).normalize();
  _sZ.copy(_sF).addScaledVector(_sU, -_sF.dot(_sU));
  if (_sZ.lengthSq() < 1e-6) _sZ.copy(_sM);
  _sZ.normalize();
  _sU.negate();                       // upper-arm axis -> shoulder yAxis
  _sX.crossVectors(_sU, _sZ);
  _sMat.makeBasis(_sX, _sU, _sZ);
  arm.shoulder.quaternion.setFromRotationMatrix(_sMat);
  arm.elbow.rotation.set(-(Math.PI - elbowAng), 0, 0);
}

/* ------------------------------ soldier model ------------------------------ */

function buildSoldier(variant = 0) {
  const lib = getMaterialLib();
  const S = getShared();
  const G = S.geo;
  const M = getVariantMats(variant);
  const { face, armSkin, cloth, clothLow, pants, vest, pouch, gear, gearDark } = M;
  const glove = S.mats.glove;

  const root = new THREE.Group();
  const mk = (geoRef, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geoRef, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // -- torso assembly
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  root.add(torsoPivot);
  mk(G.torsoUp, cloth, torsoPivot, 0, 0.425, 0);
  mk(G.torsoLow, clothLow, torsoPivot, 0, 0.165, 0);
  for (const s of [-1, 1]) mk(G.pad, cloth, torsoPivot, s * 0.235, 0.5, 0);
  // Carrier: vest shell (a full stop darker than the shirt) + kangaroo
  // panel, then three mag pouches each sitting on its own near-black seam
  // plate (baked contact shadow against the rig) with an overhanging flap
  // lid in the vest tone — the front projects ~12cm off the shirt so the
  // webbing reads in silhouette, not just in value.
  mk(G.vest, vest, torsoPivot, 0, 0.3, 0);
  mk(G.panel, gearDark, torsoPivot, 0, 0.235, 0.18);
  for (let i = 0; i < 3; i++) {
    const px = -0.115 + i * 0.115;
    mk(G.pouchSeam, S.mats.seam, torsoPivot, px, 0.205, 0.19);
    mk(G.pouch, pouch, torsoPivot, px, 0.205, 0.218);
    mk(G.pouchLid, vest, torsoPivot, px, 0.284, 0.222);
  }
  // Carrier shoulder straps riding the traps, radio pouch on the left
  // shoulder with a whip antenna, dump pouch on the left hip.
  for (const s of [-1, 1]) mk(G.shoulderStrap, vest, torsoPivot, s * 0.145, 0.565, 0.01);
  mk(G.radio, S.mats.gearHard, torsoPivot, -0.165, 0.475, 0.13).rotation.x = -0.1;
  mk(G.antenna, lib.gunMetal, torsoPivot, -0.175, 0.6, 0.115).rotation.x = 0.1;
  mk(G.dump, gear, torsoPivot, -0.205, -0.055, 0.02).rotation.y = 0.18;
  // Cross-body sling: near-black ribbon from the right shoulder over the
  // rig to the left hip (two chained segments hugging the vest front).
  const sl1 = mk(G.bodySlingA, S.mats.seam, torsoPivot, 0.105, 0.41, 0.196);
  sl1.rotation.z = -0.66;
  const sl2 = mk(G.bodySlingB, S.mats.seam, torsoPivot, -0.085, 0.155, 0.198);
  sl2.rotation.z = -0.62;
  mk(G.belt, gear, torsoPivot, 0, 0, 0);
  mk(G.buckle, lib.gunMetal, torsoPivot, 0, 0, 0.158);
  // Tan webbing straps across the vest front: the carrier reads at 50 m.
  mk(G.strap, S.mats.strap, torsoPivot, 0, 0.385, 0.186);
  mk(G.strap, S.mats.strap, torsoPivot, 0, 0.13, 0.186);
  // Carrier back: hydration-bladder outline + three PALS webbing rows, so
  // the rear face isn't a featureless slab.
  mk(G.hydration, gearDark, torsoPivot, 0.03, 0.3, -0.195);
  for (const py of [0.2, 0.28, 0.36]) mk(G.strap, S.mats.strap, torsoPivot, 0.02, py, -0.215);

  // -- pelvis pivot: carries the pelvis block AND both legs so the walk cycle
  //    can counter-rotate hips against the shoulders (+-6 deg) and the kneel
  //    can open the hips toward the gun side.
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.y = 1.0;
  root.add(pelvisPivot);
  mk(G.pelvis, pants, pelvisPivot, 0, -0.08, 0);

  // Optional gear pool: two attachments are dropped per spawn (de-clone).
  const gearPool = [
    () => mk(G.canteen, gear, torsoPivot, -0.19, -0.04, -0.13),
    () => mk(G.buttpack, gear, torsoPivot, 0, 0.08, -0.19),
    () => { mk(G.holster, gear, torsoPivot, 0.215, -0.06, 0.05).rotation.z = -0.08; },
    () => { mk(G.chestPouch, gear, torsoPivot, 0, 0.415, 0.185).rotation.x = -0.15; },
  ];
  for (let i = 0; i < 2; i++) gearPool.splice(rng.int(0, gearPool.length - 1), 1);
  for (const fn of gearPool) fn();

  // -- head: shared skull-jaw sculpt (see buildHeadGeo) with the painted face
  //    map, or a cloth cover texture (balaclava / full shemagh wrap) with only
  //    the eye band of skin visible. Scaled ~1/7.5 of body height with gear.
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.66;
  torsoPivot.add(headPivot);
  const balaclava = variant % 3 === 0 && rng.chance(0.3);
  const fullWrap = variant % 3 === 1;
  const headMat = balaclava ? M.bala : fullWrap ? M.wrap : face;
  const headMesh = mk(G.head, headMat, headPivot, 0, 0.1, 0);
  mk(G.neck, balaclava || fullWrap ? S.mats.knee : armSkin, headPivot, 0, -0.005, 0.005);
  // Dark wrap sunglasses under the headgear (round 9): keffiyeh fighters
  // always wear them, open-faced helmet soldiers roll for them. Two glossy
  // lens bulges + bridge + temple arms — the socket band that can never
  // mip away, with a live sun glint off the lens.
  if (variant % 3 === 2 || (variant % 3 === 0 && !balaclava && rng.chance(0.5))) {
    for (const s of [-1, 1]) {
      const lens = mk(G.shadeLens, S.mats.shade, headPivot, s * 0.039, 0.104, 0.088);
      lens.scale.set(1.0, 0.72, 0.52);
      lens.rotation.y = s * 0.42;
      mk(G.shadeArm, S.mats.shade, headPivot, s * 0.077, 0.108, 0.028).rotation.y = -s * 0.10;
    }
    mk(G.shadeBridge, S.mats.shade, headPivot, 0, 0.108, 0.099);
  }
  if (variant % 3 === 0) {
    // Ballistic helmet: crinkled cloth-cover shell raked so the back drops
    // toward the nape, + rim band, front NVG shroud with mounting plate,
    // side rail blocks and a chinstrap running under the jaw. Raised so the
    // front rim + brim shadow land ABOVE the eye line (~0.101), keeping the
    // eye strip lit while the helmet still sits proud of the skull.
    const helm = new THREE.Group();
    helm.position.set(0, 0.142, -0.008);
    helm.rotation.x = -0.13;              // raked back so the brow/eyes stay lit
    headPivot.add(helm);
    mk(G.helmet, S.mats.helmCover, helm, 0, 0, 0);
    mk(G.helmRim, S.mats.gearHard, helm, 0, -0.034, 0);
    mk(G.nvgShroud, S.mats.gearHard, helm, 0, 0.012, 0.126).rotation.x = -0.16;
    mk(G.nvgPlate, S.mats.gearHard, helm, 0, 0.016, 0.138).rotation.x = -0.16;
    for (const s of [-1, 1]) {
      const rail = mk(G.sideRail, S.mats.gearHard, helm, s * 0.126, -0.012, 0.01);
      rail.rotation.y = -s * 0.08;
      rail.rotation.z = s * 0.10;
    }
    // Chinstrap: side straps angling forward-down from the rim, cup under jaw.
    for (const s of [-1, 1]) {
      const st = mk(G.strapSide, S.mats.seam, headPivot, s * 0.076, 0.008, 0.03);
      st.rotation.z = s * 0.30;
      st.rotation.x = 0.22;
    }
    mk(G.chinCup, S.mats.seam, headPivot, 0, -0.052, 0.062).rotation.x = 0.3;
    mk(G.collar, cloth, torsoPivot, 0, 0.585, 0.01);
  } else if (variant % 3 === 1) {
    // Full shemagh wrap: crinkled dome (rim above the eye slit) + brow band
    // + face scarf + tail over the cloth-textured head. The scarf sits LOW
    // (round 8) so the eye zone between its top edge and the band is ~0.07
    // tall — the painted dark strip + glints actually render at 7 m.
    mk(G.wrapDome, S.mats.wrapCloth, headPivot, 0, 0.118, 0);
    mk(G.wrapBand, S.mats.wrapCloth, headPivot, 0, 0.138, 0.012).rotation.x = 0.08;
    // Scarf hugs the jaw (0.94/0.9 squash) — at full radius it ballooned
    // into a beak-like muzzle blob under the eye band.
    const scarf = mk(G.faceScarf, S.mats.wrapCloth, headPivot, 0, 0.05, 0.014);
    scarf.scale.set(0.94, 0.9, 0.97);
    // Tail tucked tight against the nape (a flared tail pokes past the head
    // silhouette from behind and reads as a detached floating flap).
    const tail = mk(G.tail, S.mats.wrapCloth, headPivot, 0.038, -0.055, -0.105);
    tail.rotation.x = 0.12;
    tail.scale.set(0.85, 0.88, 1);
    mk(G.shemagh, S.mats.shemCloth, torsoPivot, 0, 0.6, 0.05);
  } else {
    // Keffiyeh: light crinkled dome held by two near-black agal cords, side
    // drapes over the ears and a back curtain — the face stays open (eye
    // strip, brows, beard all visible) but the silhouette is unmistakably
    // wrapped, never a bare capsule skull. Dome is pulled DOWN and squashed
    // so it hugs the crown (a tall pale dome reads as a chef's toque).
    const dome = mk(G.wrapDome, S.mats.keffiyeh, headPivot, 0, 0.122, 0);
    dome.scale.set(0.97, 0.86, 1.0);
    // Cords raised a step (round 8): the lower cord used to hang over the
    // brow bars and merged with the painted eye strip into one dark smear.
    mk(G.agal, S.mats.agal, headPivot, 0, 0.147, 0.006);
    const ag2 = mk(G.agal, S.mats.agal, headPivot, 0, 0.133, 0.01);
    ag2.scale.setScalar(1.04);
    for (const s of [-1, 1]) {
      const dr = mk(G.drapeSide, S.mats.keffiyeh, headPivot, s * 0.103, -0.015, -0.045);
      dr.rotation.z = s * 0.1;
      dr.rotation.y = -s * 0.12;
    }
    mk(G.drapeBack, S.mats.keffiyeh, headPivot, 0, -0.03, -0.112).rotation.x = 0.1;
    mk(G.shemagh, S.mats.shemCloth, torsoPivot, 0, 0.6, 0.05);
  }

  // -- aim group at the right shoulder pocket. The rifle (with BOTH hands
  //    welded to it) blends between the low-ready and mounted local poses;
  //    the group itself is rotated by the stateless aim solve in update().
  const aimGroup = new THREE.Group();
  aimGroup.position.copy(AIM_POS);
  torsoPivot.add(aimGroup);

  // Variant 2 fights in rolled sleeves: cloth roll cuff at the elbow, bare
  // forearm below (the gloves stay on the weapon). Others keep full sleeves.
  const rolled = variant % 3 === 2;
  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side > 0 ? 0.26 : -0.24, side > 0 ? 0.50 : 0.49, side > 0 ? 0.02 : 0.06);
    torsoPivot.add(shoulder);
    mk(G.upperArm, cloth, shoulder, 0, -0.15, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.30;
    shoulder.add(elbow);
    mk(G.elbowBall, rolled ? armSkin : cloth, elbow, 0, -0.005, 0);
    if (rolled) {
      mk(G.rollCuff, cloth, elbow, 0, -0.035, 0);
      mk(G.foreArmBare, armSkin, elbow, 0, -0.145, 0);
      // Bare wrist into dark glove: thin glove cuff + stub — a distinct
      // value break where the arm meets the hand on the weapon.
      mk(G.gloveCuff, glove, elbow, 0, -0.262, 0);
    } else {
      mk(G.foreArm, cloth, elbow, 0, -0.14, 0);
      // Sleeve-into-glove cuff band: darker cloth ring proud of the sleeve.
      mk(G.cuffRing, cloth, elbow, 0, -0.252, 0);
    }
    // Glove wrist stub bridges the forearm tip toward the hand on the rifle
    // so the sleeve never ends in a bare capsule cap.
    mk(G.wristStub, glove, elbow, 0, -0.283, 0);
    return { shoulder, elbow };
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);

  const rifleKind = rng.chance(0.55) ? 0 : 1;
  const { group: rifle, muzzle } = buildEnemyRifle(rifleKind);
  rifle.position.copy(RIFLE_P_LOW);
  rifle.quaternion.copy(RIFLE_Q_LOW);
  aimGroup.add(rifle);

  // Hands ride ON the weapon (children of the rifle group) and CLOSE around
  // it: the right mitten wraps the pistol grip (palm behind, three fused
  // finger tubes across the front flat, thumb along the inboard flat), the
  // left palm cups the handguard from underneath with the fingers curling up
  // the outboard flat and the thumb hooked over the top rail. They can never
  // leave the gun at any aim angle; the arms IK onto wrist anchors behind
  // them every frame.
  const handR = new THREE.Group();
  handR.position.set(0, -0.06, 0.052);
  handR.rotation.x = 0.30;                  // matches the grip rake
  rifle.add(handR);
  mk(G.palmR, glove, handR, 0.002, -0.006, 0.033);
  mk(G.wristPad, glove, handR, 0.01, -0.016, 0.062);
  // Finger-block split (round 9): FOUR separated finger tubes with a near-
  // black seam slot wedged in each gap, staggered lengths notching the
  // silhouette, and a knuckle plate proud of the roots — the mitten reads
  // as a wrapped hand at 5-10 m instead of a blob fused to the grip.
  for (let i = 0; i < 4; i++) {
    const f = mk(G.finger, glove, handR, -0.006, 0.021 - i * 0.021, -0.027 + i * 0.0035);
    f.rotation.z = Math.PI / 2;
    f.scale.set(0.86, [0.96, 1.05, 0.98, 0.78][i], 0.86);
    if (i) mk(G.fingerSeamH, S.mats.seam, handR, -0.007, 0.021 - (i - 0.5) * 0.021, -0.027 + (i - 0.5) * 0.0035);
  }
  const knR = mk(G.knuckle, glove, handR, -0.006, -0.010, -0.038);
  knR.rotation.x = Math.PI / 2;             // ridge spans the stacked fingers
  const thR = mk(G.thumb, glove, handR, -0.024, 0.018, 0.006);
  thR.rotation.x = Math.PI / 2 - 0.25;      // runs back along the inboard flat
  thR.scale.setScalar(1.12);                // thumb ridge reads against the grip
  const handL = new THREE.Group();
  handL.position.set(0, -0.033, -0.20);
  rifle.add(handL);
  mk(G.palmL, glove, handL, 0, -0.008, 0);  // palm plate under the handguard
  // Support hand: 4-finger block + thumb. Fingers curl up the outboard flat
  // with seam slots between them; the knuckle plate rides the finger roots.
  for (let i = 0; i < 4; i++) {
    const f = mk(G.finger, glove, handL, 0.031, 0.002, -0.033 + i * 0.021);
    f.rotation.z = -0.12;
    f.scale.set(0.86, [0.96, 1.05, 0.98, 0.78][i], 0.86);
    if (i) mk(G.fingerSeamV, S.mats.seam, handL, 0.0335, 0.002, -0.033 + (i - 0.5) * 0.021);
  }
  mk(G.knuckle, glove, handL, 0.0355, -0.020, -0.0015);
  const thLBase = mk(G.thumb, glove, handL, -0.030, 0.030, 0.010);
  thLBase.rotation.z = 0.32;                // thumb root up the inboard flat
  thLBase.scale.setScalar(1.12);
  const thL = mk(G.thumb, glove, handL, -0.012, 0.057, 0.010);
  thL.rotation.z = Math.PI / 2;             // thumb tip crossing the top rail
  thL.scale.setScalar(1.1);

  // Initial arm pose (build-time only; per-frame path is allocation-free).
  const wr = IK_R.clone().applyQuaternion(rifle.quaternion).add(rifle.position).add(aimGroup.position);
  const wl = IK_L.clone().applyQuaternion(rifle.quaternion).add(rifle.position).add(aimGroup.position);
  solveArm(armR, wr, POLE_R);
  solveArm(armL, wl, POLE_L);

  // -- legs: crinkled thigh capsule + TAPERED shin tube under the pelvis
  //    pivot, knee joint ball, cargo pocket, kneepads, bloused trouser cuff
  //    overhanging a dark flared boot shaft + foot + wider sole slab.
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0, 0);
    pelvisPivot.add(hip);
    mk(G.thigh, pants, hip, 0, -0.21, 0);
    const cp = mk(G.cargo, pants, hip, side * 0.077, -0.235, 0.012);
    cp.rotation.z = side * 0.05;
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    mk(G.jointBall, pants, knee, 0, -0.008, 0);
    mk(G.shin, pants, knee, 0, -0.175, 0);
    mk(G.kneepad, S.mats.knee, knee, 0, -0.03, 0.062);
    mk(G.blouse, pants, knee, 0, -0.342, 0.004);
    mk(G.bootCuff, pants, knee, 0, -0.39, 0.005);
    mk(G.bootShaft, S.mats.boot, knee, 0, -0.405, 0.008);
    mk(G.bootFoot, S.mats.boot, knee, 0, -0.505, 0.045);
    mk(G.bootSole, S.mats.sole, knee, 0, -0.549, 0.048);
    return { hip, knee };
  };
  const legR = mkLeg(1);
  const legL = mkLeg(-1);
  mk(G.thighRig, gear, legR.hip, 0.06, -0.26, 0.055).rotation.y = 0.15;

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // The head does NOT receive cast shadows (set after the traverse): helmet
  // brims / wrap rims / building shade kept stamping the painted face into
  // a black void at gameplay distance. The face still shades by its own
  // normals (sun models the brow/jaw), and the headgear above it still
  // receives and casts, so the head never looks pasted-on.
  headMesh.receiveShadow = false;

  // Palm/weapon contact AO blobs (~20% peak opacity), one per palm contact:
  // both flats of the grip under the right mitten and of the handguard under
  // the left palm. Added after the traverse — they must never cast shadows.
  for (const [x, y, z] of [[0.020, -0.062, 0.056], [-0.020, -0.062, 0.056], [0.0295, -0.012, -0.20], [-0.0295, -0.012, -0.20]]) {
    const ao = new THREE.Mesh(G.contactAO, S.contactMat);
    ao.position.set(x, y, z);
    ao.rotation.y = (x > 0 ? 1 : -1) * Math.PI / 2;
    rifle.add(ao);
  }

  // Blob contact shadow (added after the traverse: must not cast/receive).
  const blob = new THREE.Mesh(S.blobGeo, S.blobMat);
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  root.add(blob);

  return { root, torsoPivot, pelvisPivot, headPivot, aimGroup, armR, armL, legR, legL, rifle, muzzle, handR, handL, blob };
}

/* --------------------------------- enemy ---------------------------------- */

const STATE = { ADVANCE: 0, COMBAT: 1, RELOCATE: 2, DEAD: 3 };

class Enemy {
  constructor(mgr, pos, variant) {
    this.mgr = mgr;
    this.variant = variant;
    this.model = buildSoldier(variant);
    this.root = this.model.root;
    this.root.position.copy(pos);
    const scale = 0.97 + rng() * 0.08;
    this.root.scale.setScalar(scale);
    mgr.scene.add(this.root);

    this.name = rng.pick(NAMES) + '-' + rng.int(10, 99);
    this.health = 100;
    this.alive = true;
    this.state = STATE.ADVANCE;
    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.speed = 0;
    this.walkPhase = rng() * 10;
    this.breathePhase = rng() * Math.PI * 2;
    // Per-enemy pose asymmetry (round 8): no two soldiers hold the weapon
    // the same way. Head yaw ±7° (some scan further left), lead/weapon
    // shoulder dropped a touch, chest wound slightly toward the gun side,
    // elbow IK poles flared per-arm, and the low-ready rifle itself carried
    // at a jittered offset/cant. Everything fades out with aimBlend so the
    // mounted firing pose (which already reads well) stays exact.
    this.pose = {
      headYaw: rng.spread(0.13) + (rng.chance(0.28) ? 0.3 : 0),
      headRoll: rng.spread(0.06),
      shRoll: 0.04 + rng() * 0.06,
      twistBias: 0.04 + rng() * 0.1,
      poleR: POLE_R.clone(),
      poleL: POLE_L.clone(),
    };
    this.pose.poleR.x += rng() * 0.55;
    this.pose.poleL.x -= rng() * 0.45;
    // Round 9: weapon-carriage template, deterministic by variant, so no
    // squad shows three copies of the same hold — low-ready (v0), high-ready
    // stock-in-shoulder muzzle-up (v1), slung muzzle-down across the chest
    // with the strong arm hanging (v2). Each is the enemy's at-rest pose and
    // blends into the shared aim mount through the same aimBlend fade.
    this.carry = ['low', 'high', 'slung'][variant % 3];
    const [carryP, carryQ] = CARRY_POSE[this.carry];
    this.carryP = carryP.clone();
    this.carryP.x += rng.spread(0.018);
    this.carryP.y += rng.spread(0.02);
    this.carryQ = carryQ.clone()
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.spread(0.07), rng.spread(0.09), rng.spread(0.06))));
    this.handROnGun = true;
    if (this.carry === 'slung') this._setHandROnGun(false);
    this.blade = 0;       // hip yaw offset (radians) off the aim line; 0 while moving
    this.twist = 0;       // torso yaw on top of the hips (shouldering / idle counter)
    this.aimBlend = 0;    // 0 low-ready, 1 weapon mounted at the shoulder on-axis
    this.aimErr = Math.PI; // WORLD-space angle between muzzle bore and target line
    this.aimYaw = 0;       // damped aim-group yaw, re-solved from the mount each frame
    this.aimPitch = 0;     // damped aim-group pitch, clamped +-35 deg
    this.hasLOS = false;  // published for the HUD spot diamond (real ray, ~10 Hz)
    this.losT = rng() * 0.1; // staggers the LOS ray budget across the squad
    this.spottedT = -10;  // last time LOS was true (HUD occlusion memory)
    this.torsoPitch = 0;
    // Kneelers drop to a firing kneel when "crouching" (rear knee down, lead
    // foot planted) and keep shooting; squatters duck low behind cover.
    // Variant-1 soldiers always kneel so photo staging can rely on it.
    this.kneeler = variant % 3 === 1 || rng.chance(0.35);
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.burstLeft = 0;
    this.shotT = 0;
    this.aimT = 1 + rng() * 1.5;
    this.mountT = 0;      // >0 keeps the weapon mounted (raise/burst/hold window)
    this.duckT = 0;
    this.crouch = 0;      // 0 stand, 1 crouch/kneel
    this.crouchTarget = 0;
    this.flinchT = 0;
    this.deathT = 0;
    this.corpseVel = new THREE.Vector3();
    this.fallDir = new THREE.Vector3(1, 0, 0);
    this.relocateTarget = null;
    this.exposed = 1;
  }

  /* --------- damage --------- */
  damage(amount, point, dir, headshot) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flinchT = 0.18;
    this.killCause = headshot ? 'HEADSHOT' : (this.mgr.playerWeaponLabel ? this.mgr.playerWeaponLabel() : 'M4A1');
    if (this.health <= 0) {
      this.die(dir, amount > 60);
      return true;
    }
    // Getting shot pulls them into combat
    if (this.state === STATE.ADVANCE && rng.chance(0.6)) this.enterCombat();
    return false;
  }

  die(dir, fling = false) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.deathT = 0;
    const d = dir ? dir.clone().setY(0).normalize() : new THREE.Vector3(rng.spread(1), 0, rng.spread(1)).normalize();
    this.fallDir = d;
    this.corpseVel.copy(d).multiplyScalar(fling ? 5.5 + rng() * 3 : 1.1);
    if (fling) this.corpseVel.y = 4.5 + rng() * 2.5;
    // Relax limbs randomly
    const M = this.model;
    // Hands leave the weapon and hang at the wrists so relaxed arms read right.
    for (const [arm, hand] of [[M.armR, M.handR], [M.armL, M.handL]]) {
      arm.elbow.add(hand);
      hand.position.set(0, -0.3, 0);
      hand.rotation.set(0, 0, 0);
    }
    M.aimGroup.rotation.set(0, 0, 0);
    M.armR.shoulder.rotation.set(-0.4 + rng.spread(0.5), 0, -0.5 + rng.spread(0.4));
    M.armL.shoulder.rotation.set(-0.3 + rng.spread(0.5), 0, 0.5 + rng.spread(0.4));
    M.armR.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.armL.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.legR.hip.rotation.x = rng.spread(0.5);
    M.legL.hip.rotation.x = rng.spread(0.5);
    M.legR.knee.rotation.x = rng() * 0.6;
    M.legL.knee.rotation.x = rng() * 0.6;
    M.pelvisPivot.rotation.y = 0;
    // Rifle slips off the shoulder as the body drops
    M.rifle.rotation.z = rng.spread(0.8);
    M.rifle.rotation.x += 0.25 + rng() * 0.3;
    M.rifle.position.y -= 0.06;
    this.mgr.onEnemyKilled(this);
  }

  enterCombat() {
    this.state = STATE.COMBAT;
    this.aimT = 0.35 + rng() * 0.7;
    this.burstLeft = 0;
    this.crouchTarget = rng.chance(0.5) ? 1 : 0;
  }

  /* --------- think --------- */
  update(dt, playerPos, t) {
    const M = this.model;
    if (this.state === STATE.DEAD) {
      this.deathT += dt;
      // Contact blob shrinks away as the body drops (sun shadow takes over).
      if (M.blob.visible) {
        const k = 1 - this.deathT * 2.2;
        if (k <= 0.02) M.blob.visible = false;
        else M.blob.scale.setScalar(k);
      }
      // Ballistic corpse
      if (this.deathT < 2.2) {
        this.corpseVel.y -= 14 * dt;
        this.pos.addScaledVector(this.corpseVel, dt);
        if (this.pos.y <= 0) { this.pos.y = 0; this.corpseVel.set(0, 0, 0); }
        // Fall rotation: pivot to lying
        const k = clamp(this.deathT / 0.5, 0, 1);
        const ease = 1 - (1 - k) * (1 - k);
        _tAxis.set(-this.fallDir.z, 0, this.fallDir.x);
        this.root.quaternion.setFromAxisAngle(_tAxis, ease * Math.PI * 0.5 * 0.96);
        this.root.rotateY(this.yaw);
        this.root.position.y = Math.max(this.pos.y, 0) + ease * 0.12;
      }
      if (this.deathT > 22) {
        this.root.position.y -= dt * 0.25; // sink away
        if (this.deathT > 25) this.mgr.removeEnemy(this);
      }
      return;
    }

    _tTo.copy(playerPos).sub(this.pos);
    const distP = _tTo.length();
    _tDir.copy(_tTo).normalize();
    this.repathT -= dt;
    this.flinchT = Math.max(0, this.flinchT - dt);

    _tEye.set(this.pos.x, this.pos.y + 1.55 - this.crouch * 0.5, this.pos.z);
    _tPEye.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
    // REAL occlusion ray only (same collider raycast the fire logic trusts),
    // rechecked every ~100 ms per enemy with staggered phases. Frozen photo
    // staging uses the same truth, so the HUD spot diamond can never paint
    // through a solid prop.
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.1;
      this.hasLOS = this.mgr.colliders.hasLOS(_tEye, _tPEye);
      if (this.hasLOS) this.spottedT = performance.now() * 0.001;
    }
    const hasLOS = this.hasLOS;

    // Body facing: COMBAT always slews the root onto the player's bearing
    // (last-known heading once LOS drops) BEFORE the aim solver reads the
    // yaw — nobody fires across their own back. Pathing states keep steering
    // through _followPath instead.
    if (this.state === STATE.COMBAT) this.targetYaw = Math.atan2(_tDir.x, _tDir.z);

    // Frozen (photo staging) suspends locomotion, path-following, the duck
    // cycle, state transitions and self-directed fire — facing and the aim
    // solve below still run every frame so staged shots square up on target.
    if (this.mgr.frozen) {
      this.speed = damp(this.speed, 0, 8, dt);
    } else switch (this.state) {
      case STATE.ADVANCE: {
        // Path toward a cover point near the player
        if (!this.path || this.repathT <= 0) {
          const cover = this.mgr.pickCover(this.pos, playerPos);
          const goal = cover ?? playerPos;
          this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, goal.x, goal.z) ?? [[goal.x, goal.z]];
          this.pathIdx = 0;
          this.repathT = 3 + rng() * 2;
        }
        this._followPath(dt, 4.4);
        if (hasLOS && distP < 34 && rng.chance(0.03)) this.enterCombat();
        if (this.path && this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 12 && hasLOS) this.enterCombat();
        break;
      }
      case STATE.COMBAT: {
        this.speed = damp(this.speed, 0, 8, dt);
        // Peek / duck cycle when in cover
        this.duckT -= dt;
        if (this.duckT <= 0) {
          this.crouchTarget = this.crouchTarget > 0.5 ? 0 : (rng.chance(0.55) ? 1 : 0);
          this.duckT = 0.9 + rng() * 1.6;
        }
        // Kneelers keep the weapon mounted and fire from the knee; squatters
        // only fire while standing (their crouch is a duck behind cover).
        const canFire = this.crouch < 0.4 || this.kneeler;
        if (hasLOS && canFire) {
          this.aimT -= dt;
          // Arm the mount just before the burst: the raise takes ~0.4 s, so
          // by the time aimT hits zero the bore has settled on the line and
          // the aimErr gate below opens. Between bursts the weapon drops
          // back to low-ready once the post-shot hold (mountT) expires.
          if (this.aimT <= 0.55) this.mountT = Math.max(this.mountT, 0.7);
          // Gate every shot on the WORLD-space bore check: the muzzle's
          // actual forward must be < 8 deg off the target line (see aimErr).
          if (this.burstLeft > 0) {
            this.shotT -= dt;
            if (this.shotT <= 0) {
              if (this.aimErr < 0.14) {
                this.shotT = 0.105 + rng() * 0.03;
                this.burstLeft--;
                this._fireAt(_tPEye, distP);
              } else {
                this.shotT = 0.05; // hold fire until the muzzle settles
              }
            }
          } else if (this.aimT <= 0 && this.aimErr < 0.14) {
            this.burstLeft = rng.int(3, 6);
            this.aimT = 0.7 + rng() * 1.3;
          }
        }
        // Occasionally relocate to better cover
        if (rng.chance(0.0025) || (!hasLOS && rng.chance(0.01))) {
          this.state = STATE.RELOCATE;
          const cover = this.mgr.pickCover(this.pos, playerPos, true);
          if (cover) {
            this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, cover.x, cover.z) ?? null;
            this.pathIdx = 0;
          }
          if (!this.path) this.state = STATE.COMBAT;
        }
        break;
      }
      case STATE.RELOCATE: {
        this.crouchTarget = 0;
        this._followPath(dt, 4.6);
        if (!this.path || this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 9 && hasLOS) this.enterCombat();
        break;
      }
    }

    // Separation from other enemies
    for (const other of this.mgr.enemies) {
      if (other === this || !other.alive) continue;
      const d = this.pos.distanceTo(other.pos);
      if (d < 1.2 && d > 1e-4) {
        _tPush.copy(this.pos).sub(other.pos).setY(0).normalize().multiplyScalar((1.2 - d) * 2 * dt);
        this.pos.add(_tPush);
      }
    }

    // Capsule collision + yaw smoothing
    this.mgr.colliders.resolveCapsule(this.pos, 0.38, 1.7, this.vel);
    this.pos.y = Math.max(0, this.pos.y);
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    // COMBAT turns onto the bearing at a constant ~6 rad/s (a full about-face
    // in ~0.5 s, and the proportional walk damping can't overspeed it);
    // pathing keeps the softer proportional turn.
    if (this.state === STATE.COMBAT) this.yaw += clamp(dy, -6 * dt, 6 * dt);
    else this.yaw += dy * Math.min(1, dt * 8);
    // Bladed stance: `blade` is the hip yaw (radians) off the aim line.
    this.root.rotation.set(0, this.yaw + this.blade, 0);

    // Crouch blend
    this.crouch = damp(this.crouch, this.crouchTarget, 6, dt);

    /* --------- animate --------- */
    const moving = this.speed > 0.4;
    this.walkPhase += dt * (5.2 + this.speed * 1.6);
    const swing = moving ? Math.sin(this.walkPhase) : 0;
    const swing2 = moving ? Math.sin(this.walkPhase + Math.PI) : 0;
    const ampn = clamp(this.speed / 4.4, 0, 1);
    const amp = ampn * 0.62;
    // Standing = bladed: hips ~20 deg off the aim line in COMBAT (0.35 rad, a
    // touch more at ease), lead foot staggered. Squared up while moving or
    // crouching (blade fights the crouch/kneel pose).
    const bladeTarget = (moving || this.crouch > 0.35) ? 0 : (this.state === STATE.COMBAT ? 0.35 : 0.42);
    this.blade = damp(this.blade, bladeTarget, 5, dt);
    const blade = this.blade;
    const kneel = this.kneeler ? this.crouch : 0;
    const squat = this.kneeler ? 0 : this.crouch;
    // Standing fire brace (round 9): as the weapon mounts, the rear (right)
    // leg extends back and the lead knee softens — the weight shifts onto
    // the lead foot under the forward lean instead of firing bolt-upright.
    const brace = this.aimBlend * (1 - this.crouch) * (moving ? 0.3 : 1);

    // Legs. Kneel = firing kneel: rear (right) knee dropped to the deck with
    // the shin folded under, lead (left) thigh near horizontal with a planted
    // vertical shin. Squat = low duck behind cover. Both blend from the walk.
    if (kneel > 0.001) {
      M.legR.hip.rotation.x = lerp(swing * amp, 0.14, kneel);
      M.legR.knee.rotation.x = lerp(Math.max(0, -swing) * amp * 1.4, 1.5, kneel);
      M.legL.hip.rotation.x = lerp(swing2 * amp, -1.5, kneel);
      M.legL.knee.rotation.x = lerp(Math.max(0, -swing2) * amp * 1.4, 1.52, kneel);
    } else {
      M.legR.hip.rotation.x = swing * amp + squat * -0.7 - brace * 0.22;
      M.legL.hip.rotation.x = swing2 * amp + squat * -0.85 + brace * 0.06;
      M.legR.knee.rotation.x = Math.max(0, -swing) * amp * 1.4 + squat * 1.15 + brace * 0.06;
      M.legL.knee.rotation.x = Math.max(0, -swing2) * amp * 1.4 + squat * 1.3 + blade * 0.14 + brace * 0.12;
    }
    M.legR.hip.position.z = blade * -0.1 - brace * 0.05;
    M.legL.hip.position.z = blade * 0.29;
    const drop = kneel * 0.45 + squat * 0.42 + brace * 0.02;
    this.root.position.y = this.pos.y - drop + (moving ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * amp : 0);

    // Walk cycle counter-rotation: pelvis swings +-6 deg with the stride and
    // the shoulders swing -6 deg against it (set on the torso below). The
    // kneel opens the hips toward the gun side; idle blade shifts the weight
    // onto the trailing hip with a small pelvis roll.
    M.pelvisPivot.rotation.y = swing * 0.105 * ampn + kneel * 0.22;
    M.pelvisPivot.rotation.z = blade * 0.05 * (1 - this.crouch);

    // Torso: 8-12 deg forward combat lean + aim pitch compensation + flinch
    // + breathing. Round 9: the MOUNTED lean is doubled (~9 deg extra pitch
    // into the stock) — the firing pose read bolt-upright with the old 4.5.
    const pitchTo = clamp(Math.atan2(_tPEye.y - _tEye.y, Math.max(1, distP)), -0.5, 0.4);
    const lean = 0.10 + this.aimBlend * 0.16 + this.crouch * 0.05;
    this.torsoPitch = damp(this.torsoPitch, lean - pitchTo * 0.6 + (this.flinchT > 0 ? 0.22 : 0), 10, dt);
    const breathe = Math.sin(t * 1.4 + this.breathePhase) * 0.018;
    M.torsoPivot.rotation.x = this.torsoPitch + breathe;
    // Aim/idle torso twist over the bladed hips: shouldering the rifle winds
    // the chest toward the target side; at ease it counters the hips instead.
    // The weapon only presents inside a +-60 deg cone of the body's forward —
    // outside it the root is still slewing, so hold low-ready rather than
    // cranking the arms across the chest.
    let coneErr = Math.atan2(_tDir.x, _tDir.z) - (this.yaw + this.blade);
    coneErr -= Math.round(coneErr / (Math.PI * 2)) * Math.PI * 2;
    const canAim = this.state === STATE.COMBAT && Math.abs(coneErr) < 1.05
      && (this.mgr.frozen || ((this.crouch < 0.4 || this.kneeler) && hasLOS));
    // MOUNT only while actually engaging: a pending/active burst (mountT
    // spans the raise, the burst and a short hold after the last shot).
    // Every other combat/patrol/kneel/frozen moment is spent at LOW-READY,
    // so the silhouette always shows the diagonal chest line — never a
    // vertical carry, and never the dead-on mag/optic stack of a rifle held
    // permanently on the viewer's eyes (which reads as a slung vertical rod
    // at range). Scripted photo _fireAt calls snap the mount (see _fireAt)
    // so frozen soldiers can still present for staged shots.
    this.mountT = Math.max(0, this.mountT - dt);
    const engage = canAim && (this.burstLeft > 0 || this.mountT > 0);
    this.aimBlend = damp(this.aimBlend, engage ? 1 : 0, 6, dt);
    // Idle/carry asymmetry weight: per-enemy pose biases fade out as the
    // weapon mounts so the firing presentation stays exact.
    const idleW = 1 - this.aimBlend;
    this.twist = damp(this.twist, idleW * (-0.55 * blade + this.pose.twistBias) + this.aimBlend * 0.3, 6, dt);
    // Shoulders counter-rotate against the pelvis while walking (the torso
    // does the twisting when the weapon is mounted — the hands never leave
    // the gun, so there is no free arm-swing with a rifle in hand).
    const counter = -swing * 0.105 * ampn;
    M.torsoPivot.rotation.y = counter + this.twist + (this.flinchT > 0 ? rng.spread(0.12) : 0);
    // Lead (weapon-side) shoulder dropped: negative roll sinks the right
    // shoulder pocket a few cm — the carry stops being mirror-symmetric.
    M.torsoPivot.rotation.z = (moving ? Math.sin(this.walkPhase) * 0.045 * ampn : 0) - blade * 0.04
      - this.pose.shRoll * (1 - this.aimBlend * 0.75);
    // Head: tracks the target (yaw fraction of the aim solve), counters the
    // blade/twist at ease, and CHEEK-WELDS as the rifle mounts (round 9):
    // instead of levelling against the torso lean it nods WITH it, rolls
    // harder over the stock and slides down/right onto the comb — the head
    // visibly commits to the gun instead of floating upright above it.
    M.headPivot.rotation.x = -pitchTo * 0.4 - breathe * 0.6 - lean * 0.35 + (this.aimPitch * 0.35 + 0.10) * this.aimBlend;
    M.headPivot.rotation.y = -counter * 0.5 - clamp(blade + this.twist, -0.6, 0.6) * 0.8
      + this.aimYaw * 0.5 * this.aimBlend + this.pose.headYaw * (1 - this.aimBlend * 0.85);
    M.headPivot.rotation.z = -0.20 * this.aimBlend + this.pose.headRoll * idleW;
    M.headPivot.position.set(this.aimBlend * 0.02, 0.66 - this.aimBlend * 0.028, 0);

    // Rifle local pose: blend CARRY TEMPLATE <-> MOUNT (per-enemy jittered
    // carry, constant mount — no solver state involved). At patrol the gun
    // also pumps gently with the stride since at least one hand stays on it
    // (slung/high carries just sway — no fore-aft pump on a hanging piece).
    M.rifle.quaternion.slerpQuaternions(this.carryQ, RIFLE_Q_MOUNT, this.aimBlend);
    M.rifle.position.lerpVectors(this.carryP, RIFLE_P_MOUNT, this.aimBlend);
    if (moving) {
      // Patrol arm-swing: the gun pumps fore-aft at stride rate (counter-
      // phase to the lead leg) and bobs at double rate — the IK'd arms
      // visibly swing with it instead of hanging welded to the ribs.
      const pump = ampn * (1 - this.aimBlend) * (this.carry === 'low' ? 1 : 0.35);
      M.rifle.position.y += Math.cos(this.walkPhase * 2) * 0.02 * pump;
      M.rifle.position.z += Math.sin(this.walkPhase) * 0.05 * pump;
      M.rifle.position.x += Math.cos(this.walkPhase) * 0.012 * pump;
    }

    // Weapon figure-8 sway. In COMBAT a STATELESS aim solve is layered on
    // top: the mounted bore is exactly +Z in aim-group space, so the target
    // rotation is re-derived every frame in closed form (yaw about Y, then
    // pitch about local X — roll-free), never from the previous frame's
    // solve, so error cannot accumulate and capsize the weapon.
    _aE.set(
      Math.sin(t * 1.7 + this.breathePhase * 1.7) * 0.02 + (moving ? Math.cos(this.walkPhase * 2) * 0.03 * ampn * (1 - this.aimBlend) : 0),
      0,
      Math.sin(t * 0.9 + this.breathePhase) * 0.025 + (moving ? Math.sin(this.walkPhase) * 0.02 * ampn * (1 - this.aimBlend) : 0),
      'XYZ');
    _aQSway.setFromEuler(_aE);
    let engaged = false;
    if (engage) {
      // Player eyes into the aim pivot's local space (parent frame, so the
      // group's own rotation can't feed back into the solve).
      M.torsoPivot.updateWorldMatrix(true, false);
      _aV1.copy(_tPEye);
      M.torsoPivot.worldToLocal(_aV1).sub(M.aimGroup.position).normalize();
      // Targets needing more than +-35 deg of pitch can't be sold by the
      // arms — bail to low-ready instead of cranking against the clamp.
      const pitch = -Math.asin(clamp(_aV1.y, -1, 1));
      if (Math.abs(pitch) <= 0.61) {
        engaged = true;
        const yawA = Math.atan2(_aV1.x, _aV1.z);
        this.aimYaw = damp(this.aimYaw, clamp(yawA, -1.05, 1.05), 12, dt);
        this.aimPitch = damp(this.aimPitch, pitch, 12, dt);
      }
    }
    if (!engaged) {
      // No valid target (no LOS, outside the cone, or extreme pitch): both
      // solver angles damp back to the mount rest — nothing stale.
      this.aimYaw = damp(this.aimYaw, 0, 6, dt);
      this.aimPitch = damp(this.aimPitch, 0, 6, dt);
    }
    _aE.set(this.aimPitch, this.aimYaw, 0, 'YXZ');
    _aQ1.setFromEuler(_aE);
    M.aimGroup.quaternion.copy(_aQ1).multiply(_aQSway);

    if (engaged) {
      // Fire gate measured in WORLD space off the muzzle's matrixWorld (the
      // rendered bore line), not solver state. getWorldPosition refreshes
      // the matrix chain, so this sees the rotation set just above.
      M.muzzle.getWorldPosition(_aV1);
      _aV2.set(0, 0, -1).transformDirection(M.muzzle.matrixWorld);
      this.aimErr = _aV2.angleTo(_aV3.copy(_tPEye).sub(_aV1).normalize());
    } else {
      this.aimErr = Math.PI;
    }

    // Arm IK re-runs every frame AFTER the pose blend + aim rotation: hands
    // ride the rifle, wrist anchors ride with it, and the torso-mounted
    // shoulders protract toward the gun as it mounts so both elbows keep a
    // believable bend at any aim angle. Carry templates modulate the chain:
    // high-ready tucks both elbow poles inboard and pre-protracts the
    // support shoulder (the raised guard sits further away at rest); slung
    // relaxes the strong arm entirely until the piece mounts.
    const ab = this.aimBlend;
    const hi = this.carry === 'high' ? 1 - ab : 0;
    M.armR.shoulder.position.set(0.26 - 0.02 * ab, 0.50, 0.02 + 0.03 * ab);
    M.armL.shoulder.position.set(-0.24 + 0.04 * ab + 0.03 * hi, 0.49, 0.06 + 0.07 * ab + 0.05 * hi);
    const aq = M.aimGroup.quaternion;
    _aV1.copy(IK_R).applyQuaternion(M.rifle.quaternion).add(M.rifle.position).applyQuaternion(aq).add(M.aimGroup.position);
    _aV3.copy(this.pose.poleR);
    if (hi) _aV3.lerp(POLE_R_TUCK, hi);
    _aV2.copy(_aV3).applyQuaternion(aq);
    solveArm(M.armR, _aV1, _aV2);
    if (this.carry === 'slung') {
      // Strong hand hops grip<->wrist with hysteresis inside the aimBlend
      // fade, so the raise reads as "grab the grip, then shoulder it".
      if (!this.handROnGun && ab > 0.3) this._setHandROnGun(true);
      else if (this.handROnGun && ab < 0.2) this._setHandROnGun(false);
      const k = clamp((ab - 0.08) / 0.24, 0, 1);
      if (k < 1) {
        // Blend the IK solution back toward the at-side hang.
        M.armR.shoulder.quaternion.slerp(RELAX_Q_R, 1 - k);
        M.armR.elbow.rotation.x = lerp(-0.26, M.armR.elbow.rotation.x, k);
      }
    }
    _aV1.copy(IK_L).applyQuaternion(M.rifle.quaternion).add(M.rifle.position).applyQuaternion(aq).add(M.aimGroup.position);
    _aV3.copy(this.pose.poleL);
    if (hi) _aV3.lerp(POLE_L_TUCK, hi);
    _aV2.copy(_aV3).applyQuaternion(aq);
    solveArm(M.armL, _aV1, _aV2);
  }

  _followPath(dt, speed) {
    if (!this.path || this.pathIdx >= this.path.length) { this.speed = damp(this.speed, 0, 8, dt); return; }
    const [tx, tz] = this.path[this.pathIdx];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) { this.pathIdx++; return; }
    this.speed = damp(this.speed, speed, 5, dt);
    this.targetYaw = Math.atan2(dx / d, dz / d);
    this.pos.x += (dx / d) * this.speed * dt;
    this.pos.z += (dz / d) * this.speed * dt;
  }

  /** Slung carry only: moves the strong hand between the pistol grip
   *  (welded to the rifle) and the wrist tip of the hanging arm. */
  _setHandROnGun(on) {
    const M = this.model;
    this.handROnGun = on;
    if (on) {
      M.rifle.add(M.handR);
      M.handR.position.set(0, -0.06, 0.052);
      M.handR.rotation.set(0.30, 0, 0);
    } else {
      M.armR.elbow.add(M.handR);
      M.handR.position.set(0, -0.30, 0.012);
      M.handR.rotation.set(0.35, 0, 0);
    }
  }

  _fireAt(playerEye, dist) {
    const M = this.model;
    // Keep the weapon mounted through the burst + a short hold after it.
    this.mountT = Math.max(this.mountT, 1.2);
    if (this.mgr.frozen && this.aimBlend < 0.999) {
      // Scripted photo-mode shot on a soldier still at carry: snap the
      // mount and solve the aim closed-form NOW so the muzzle flash and
      // tracer leave a properly shouldered, level rifle this same frame
      // (the next update re-derives the identical pose and re-IKs arms).
      this.aimBlend = 1;
      if (!this.handROnGun) this._setHandROnGun(true);
      // The lean/wind-up damp at ~10/s — far slower than a capture-frame
      // shot — so snap them to their engaged targets too: the staged pose
      // must lean into the stock, not fire bolt-upright (round 8 failure).
      const pitchTo = clamp(Math.atan2(playerEye.y - (this.pos.y + 1.55 - this.crouch * 0.5), Math.max(1, dist)), -0.5, 0.4);
      this.torsoPitch = 0.26 + this.crouch * 0.05 - pitchTo * 0.6;
      this.twist = 0.3;
      M.torsoPivot.updateWorldMatrix(true, false);
      _aV1.copy(playerEye);
      M.torsoPivot.worldToLocal(_aV1).sub(M.aimGroup.position).normalize();
      this.aimPitch = clamp(-Math.asin(clamp(_aV1.y, -1, 1)), -0.61, 0.61);
      this.aimYaw = clamp(Math.atan2(_aV1.x, _aV1.z), -1.05, 1.05);
      _aE.set(this.aimPitch, this.aimYaw, 0, 'YXZ');
      M.aimGroup.quaternion.setFromEuler(_aE);
      M.rifle.quaternion.copy(RIFLE_Q_MOUNT);
      M.rifle.position.copy(RIFLE_P_MOUNT);
    }
    this.lastShotTime = performance.now() * 0.001;
    const muzzlePos = new THREE.Vector3();
    M.muzzle.getWorldPosition(muzzlePos);
    // Aim error
    const err = 0.35 + dist * 0.028;
    const target = playerEye.clone().add(new THREE.Vector3(rng.spread(err), rng.spread(err * 0.7), rng.spread(err)));
    this.mgr.fx.muzzle(muzzlePos, target.clone().sub(muzzlePos).normalize());
    this.mgr.tracers.fire(muzzlePos, target, 300, 0xffb46a);
    this.mgr.audio.gunshot({ vol: 0.85, dist, caliber: 1.15 });
    // Chance to hit the player
    const movePenalty = this.mgr.getPlayerSpeed() * 0.10;
    const p = clamp(0.24 - dist * 0.004 - movePenalty, 0.05, 0.24);
    if (rng() < p) {
      this.mgr.onPlayerHit(rng.int(6, 13), this.pos);
    } else if (rng.chance(0.4)) {
      // near miss crack: impact somewhere behind player
      const missDir = target.clone().sub(muzzlePos).normalize();
      const hit = this.mgr.colliders.raycast(muzzlePos, missDir, 120);
      if (hit) {
        this.mgr.fx.impactWall(hit.point, hit.normal);
        this.mgr.decals.bulletHole(hit.point, hit.normal);
      }
    }
  }

  /** Ray-sphere hit test. Returns { t, point, headshot } or null. */
  raycast(origin, dir, maxDist) {
    if (!this.alive) return null;
    const spheres = [
      // Head sits at ~1.78 m (headPivot 0.66 + skull offset above the 1.02 torso pivot)
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.73 - this.crouch * 0.45, 0)), r: 0.175, head: true },
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.15 - this.crouch * 0.35, 0)), r: 0.31, head: false },
      { c: this.pos.clone().add(new THREE.Vector3(0, 0.55 - this.crouch * 0.15, 0)), r: 0.3, head: false },
    ];
    let best = null;
    for (const s of spheres) {
      const oc = origin.clone().sub(s.c);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - s.r * s.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0.1 || t > maxDist) continue;
      if (!best || t < best.t) {
        best = { t, point: origin.clone().addScaledVector(dir, t), headshot: s.head };
      }
    }
    return best;
  }
}

/* -------------------------------- manager --------------------------------- */

export class EnemyManager {
  constructor({ scene, colliders, nav, fx, decals, tracers, audio, coverPoints, spawnPoints }) {
    this.scene = scene;
    this.colliders = colliders;
    this.nav = nav;
    this.fx = fx;
    this.decals = decals;
    this.tracers = tracers;
    this.audio = audio;
    this.coverPoints = coverPoints;
    this.spawnPoints = spawnPoints;
    this.enemies = [];
    this.wave = 0;
    this.pendingSpawns = 0;
    this.spawnT = 0;
    this.waveBreakT = 2.5;
    this.maxAlive = 6;
    this.onKill = null;        // (enemy, headshot?) => void
    this.onPlayerHit = null;   // set by game
    this.onWave = null;
    this.getPlayerSpeed = () => 0;
    this.playerPos = new THREE.Vector3();
    this.frozen = false;
  }

  get aliveCount() { return this.enemies.filter((e) => e.alive).length; }

  pickCover(fromPos, playerPos, exclude = false) {
    let best = null, bestScore = -Infinity;
    for (const c of this.coverPoints) {
      const dP = c.distanceTo(playerPos);
      if (dP < 7 || dP > 38) continue;
      const dMe = c.distanceTo(fromPos);
      if (exclude && dMe < 4) continue;
      let taken = false;
      for (const e of this.enemies) {
        if (e.alive && e.pos.distanceTo(c) < 2.2) { taken = true; break; }
      }
      if (taken) continue;
      const score = -dMe * 0.6 - Math.abs(dP - 17) + rng() * 4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  startWave(n) {
    this.wave = n;
    this.pendingSpawns = Math.min(4 + n * 2, 14);
    this.spawnT = 1.2;
    if (this.onWave) this.onWave(n, this.pendingSpawns);
  }

  spawnOne(posOverride = null, variant = null) {
    const spawn = posOverride ?? this._pickSpawn();
    const e = new Enemy(this, spawn.clone(), variant ?? rng.int(0, 2));
    e.targetYaw = e.yaw = Math.atan2(this.playerPos.x - spawn.x, this.playerPos.z - spawn.z);
    this.enemies.push(e);
    return e;
  }

  _pickSpawn() {
    // Prefer spawns 25m+ from player and out of sight
    const candidates = [...this.spawnPoints].sort(() => rng() - 0.5);
    for (const s of candidates) {
      if (s.distanceTo(this.playerPos) > 24) return s;
    }
    return candidates[0];
  }

  onEnemyKilled(enemy) {
    if (this.onKill) this.onKill(enemy);
  }

  removeEnemy(enemy) {
    this.scene.remove(enemy.root);
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  damageInRadius(pos, radius, maxDmg, fling = true, cause = 'FRAG') {
    let kills = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d < radius) {
        const dmg = maxDmg * (1 - (d / radius) * 0.7);
        const dir = e.pos.clone().sub(pos).normalize();
        const wasAlive = e.alive;
        e.health -= dmg;
        e.killCause = cause;
        if (e.health <= 0 && wasAlive) {
          e.die(dir, fling);
          kills++;
        } else {
          e.flinchT = 0.35;
        }
      }
    }
    return kills;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      const hit = e.raycast(origin, dir, maxDist);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, enemy: e };
      }
    }
    return best;
  }

  update(dt, playerPos, t) {
    this.playerPos.copy(playerPos);
    if (!this.frozen) {
      // Wave orchestration
      if (this.pendingSpawns > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.aliveCount < this.maxAlive) {
          this.spawnT = 0.7 + rng() * 0.9;
          this.pendingSpawns--;
          this.spawnOne();
        }
      } else if (this.aliveCount === 0 && this.wave > 0) {
        this.waveBreakT -= dt;
        if (this.waveBreakT <= 0) {
          this.waveBreakT = 6;
          this.startWave(this.wave + 1);
        }
      }
    }
    for (const e of this.enemies) e.update(dt, playerPos, t);
  }
}
