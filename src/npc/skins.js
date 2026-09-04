// Procedural 64x32 character skins (classic Minecraft skin layout) with 1880s western outfits.
import { RNG } from '../rng.js';

const SKIN_TONES = ['#c69b74', '#b98a63', '#d9a985', '#8d5a3b', '#e0b48f', '#a06e4a', '#6b432b'];
const HAIR = ['#2b1d12', '#4a3020', '#7a5230', '#1a1a1a', '#a8773f', '#c9a15a', '#8c8c8c', '#3d2a1a'];
const SHIRTS = ['#4a6ea8', '#a83a3a', '#e8e2d2', '#5d8a4e', '#8a6a3d', '#3d3d3d', '#c2a15c', '#6f4f8a', '#b8643a'];
const PANTS = ['#3b4a6b', '#4d3b2a', '#2b2b2b', '#5a4a3a', '#6b6b6b', '#2f3f5f'];
const DRESSES = ['#7a3a5a', '#3a5a7a', '#5a7a3a', '#8a4a2a', '#4a4a7a', '#a86a8a', '#6a8a9a', '#8a2a2a'];
const HATS = ['#4a3520', '#1e1a16', '#8a6a40', '#5a4a3a', '#2d2620', '#a08860'];
// iris palette (brown listed twice so it is the most common); medium/dark skin tones always get dark brown eyes.
// Irises are kept lighter than any brow/hair shade so brow and iris never fuse into one dark block.
export const IRIS_COLORS = ['#3a5a8a', '#6b4a2f', '#2a6a3a', '#6b4a2f', '#75552d'];
export const IRIS_DARK = '#3b2415';
export const DARK_SKIN_LUMINANCE = 0.5;
export const EYE_WHITE = '#ffffff';
const LIP_TINT = '#a8484a';

function hex(c) { return c; }
function rgb(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function shade(c, f) {
  const [r, g, b] = rgb(c);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function luminance(c) { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }

// Region helpers for the classic layout: (x, y, w, h)
const R = {
  headTop: [8, 0, 8, 8], headBottom: [16, 0, 8, 8], headRight: [0, 8, 8, 8], headFront: [8, 8, 8, 8], headLeft: [16, 8, 8, 8], headBack: [24, 8, 8, 8],
  bodyTop: [20, 16, 8, 4], bodyBottom: [28, 16, 8, 4], bodyRight: [16, 20, 4, 12], bodyFront: [20, 20, 8, 12], bodyLeft: [28, 20, 4, 12], bodyBack: [32, 20, 8, 12],
  armTop: [44, 16, 4, 4], armBottom: [48, 16, 4, 4], armRight: [40, 20, 4, 12], armFront: [44, 20, 4, 12], armLeft: [48, 20, 4, 12], armBack: [52, 20, 4, 12],
  legTop: [4, 16, 4, 4], legBottom: [8, 16, 4, 4], legRight: [0, 20, 4, 12], legFront: [4, 20, 4, 12], legLeft: [8, 20, 4, 12], legBack: [12, 20, 4, 12],
};

// outfit: {role, female, seed}
export function paintSkin(outfit) {
  const rng = new RNG((outfit.seed || 1) * 7919 + 13);
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const ctx = c.getContext('2d');
  const rect = (r, col, dx = 0, dy = 0, w = r[2], h = r[3]) => { ctx.fillStyle = col; ctx.fillRect(r[0] + dx, r[1] + dy, w, h); };
  const px = (r, x, y, col) => { ctx.fillStyle = col; ctx.fillRect(r[0] + x, r[1] + y, 1, 1); };
  const noise = (r, base, amt) => { for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) if (rng.next() < 0.35) px(r, x, y, shade(base, 1 + (rng.next() - 0.5) * amt)); };

  const skin = rng.pick(SKIN_TONES);
  const hair = rng.pick(HAIR);
  const female = !!outfit.female;
  const role = outfit.role || 'townsman';
  let shirt = rng.pick(SHIRTS), pants = rng.pick(PANTS), vest = null, apron = null, hatColor = rng.pick(HATS), dress = rng.pick(DRESSES);
  let plaid = rng.chance(0.3), suspenders = false, star = false, bowtie = false, collar = false, stripes = false, beard = !female && rng.chance(0.5), mustache = !female && rng.chance(0.5);
  switch (role) {
    case 'sheriff': shirt = '#e8e2d2'; vest = '#1e1a16'; pants = '#2b2b2b'; hatColor = '#1e1a16'; star = true; plaid = false; break;
    case 'deputy': shirt = rng.pick(['#4a6ea8', '#8a6a3d']); vest = '#4d3b2a'; star = true; plaid = false; break;
    case 'bartender': shirt = '#f0ece0'; vest = '#1a1a1a'; pants = '#1a1a1a'; apron = '#f0ece0'; bowtie = true; plaid = false; beard = false; break;
    case 'shopkeeper': shirt = '#f0ece0'; apron = '#c2a15c'; plaid = false; suspenders = true; break;
    case 'doctor': shirt = '#f0ece0'; vest = '#2b2b2b'; pants = '#2b2b2b'; hatColor = '#1a1a1a'; plaid = false; collar = true; break;
    case 'banker': shirt = '#f0ece0'; vest = '#3a3a4a'; pants = '#2b2b3a'; hatColor = '#1a1a1a'; plaid = false; collar = true; break;
    case 'preacher': shirt = '#1a1a1a'; vest = '#1a1a1a'; pants = '#1a1a1a'; hatColor = '#1a1a1a'; plaid = false; collar = true; beard = false; break;
    case 'undertaker': shirt = '#f0ece0'; vest = '#1a1a1a'; pants = '#1a1a1a'; hatColor = '#1a1a1a'; plaid = false; break;
    case 'blacksmith': shirt = '#6b6b6b'; apron = '#4d3b2a'; pants = '#3b3b3b'; plaid = false; break;
    case 'railworker': shirt = '#4a6ea8'; stripes = true; pants = '#3b4a6b'; suspenders = true; hatColor = '#2f3f5f'; plaid = false; break;
    case 'rancher': case 'farmer': case 'stablehand': plaid = rng.chance(0.7); suspenders = rng.chance(0.6); hatColor = rng.pick(['#c2a15c', '#a08860', '#8a6a40']); break;
    case 'traveler': vest = rng.pick(['#4d3b2a', '#2b2b2b']); pants = '#2b2b2b'; break;
    default: break;
  }

  // ---- head
  for (const r of [R.headTop, R.headRight, R.headFront, R.headLeft, R.headBack, R.headBottom]) rect(r, skin);
  noise(R.headFront, skin, 0.08);
  // hair: top and back + sides upper part
  rect(R.headTop, hair);
  rect(R.headBack, hair, 0, 0, 8, female ? 8 : 5);
  rect(R.headRight, hair, 0, 0, 8, female ? 4 : 3); rect(R.headLeft, hair, 0, 0, 8, female ? 4 : 3);
  rect(R.headFront, hair, 0, 0, 8, 1);
  if (female) { rect(R.headFront, hair, 0, 0, 1, 3); rect(R.headFront, hair, 7, 0, 1, 3); }
  // eyes: classic proportions on the 8-wide face, row 4 -> [skin, skin, white, iris, skin(nose bridge), iris, white, skin]
  // (white on the outside, iris toward the nose, one skin pixel between the eyes). Both irises share one colour.
  const F = R.headFront;
  const irisPick = rng.pick(IRIS_COLORS);
  const browTone = rng.pick([0.76, 0.78, 0.8]);
  const iris = luminance(skin) < DARK_SKIN_LUMINANCE ? IRIS_DARK : irisPick;
  const eyePixels = [
    { x: F[0] + 2, y: F[1] + 4, color: EYE_WHITE }, { x: F[0] + 3, y: F[1] + 4, color: iris },
    { x: F[0] + 5, y: F[1] + 4, color: iris }, { x: F[0] + 6, y: F[1] + 4, color: EYE_WHITE },
  ];
  for (const p of eyePixels) { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 1, 1); }
  // eyebrows: one 2px brow ridge above each eye painted as a skin shadow (not hair colour), so it reads for
  // every hair colour and never merges with the iris below into one dark block
  const brow = shade(skin, browTone);
  rect(F, brow, 2, 3, 2, 1); rect(F, brow, 5, 3, 2, 1);
  // nose: soft shadow under the bridge with the tip a touch darker
  px(F, 3, 5, shade(skin, 0.93)); px(F, 4, 5, shade(skin, 0.84));
  // mouth: a subtle darker lip line for men, a muted rose blended with the skin tone for women;
  // facial hair is painted afterwards so a mustache/beard stays continuous over the mouth
  rect(F, female ? mix(skin, LIP_TINT, 0.55) : shade(skin, 0.76), 3, 6, 2, 1);
  if (mustache) rect(F, hair, 2, 6, 4, 1);
  if (beard) { rect(F, hair, 1, 6, 6, 2); rect(R.headRight, hair, 6, 6, 2, 2); rect(R.headLeft, hair, 0, 6, 2, 2); }

  // ---- body
  const bodyCol = female ? dress : shirt;
  for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft, R.bodyTop, R.bodyBottom]) rect(r, bodyCol);
  if (plaid && !female) {
    const dark = shade(shirt, 0.7);
    for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) {
      for (let y = 0; y < r[3]; y += 3) rect(r, dark, 0, y, r[2], 1);
      for (let x = 0; x < r[2]; x += 3) rect(r, dark, x, 0, 1, r[3]);
    }
  }
  if (stripes) for (const r of [R.bodyFront, R.bodyBack]) for (let y = 0; y < 12; y += 2) rect(r, '#e8e2d2', 0, y, 8, 1);
  if (vest && !female) {
    rect(R.bodyFront, vest, 0, 0, 2, 12); rect(R.bodyFront, vest, 6, 0, 2, 12); rect(R.bodyFront, vest, 0, 8, 8, 4);
    rect(R.bodyBack, vest); rect(R.bodyRight, vest); rect(R.bodyLeft, vest);
    rect(R.bodyFront, shirt, 2, 0, 4, 8); // shirt showing
    px(R.bodyFront, 3, 3, shade(vest, 1.6)); px(R.bodyFront, 4, 5, shade(vest, 1.6));
  }
  if (suspenders && !female) { rect(R.bodyFront, '#3a2a1a', 1, 0, 1, 12); rect(R.bodyFront, '#3a2a1a', 6, 0, 1, 12); rect(R.bodyBack, '#3a2a1a', 1, 0, 1, 12); rect(R.bodyBack, '#3a2a1a', 6, 0, 1, 12); }
  if (apron) { rect(R.bodyFront, apron, 1, 4, 6, 8); }
  if (female) {
    // bodice details, collar, apron
    rect(R.bodyFront, shade(dress, 0.8), 3, 0, 2, 12);
    if (rng.chance(0.6)) rect(R.bodyFront, '#f0ece0', 2, 5, 4, 7);
    rect(R.bodyFront, '#f0ece0', 3, 0, 2, 1);
  }
  if (bowtie) { rect(R.bodyFront, '#1a1a1a', 3, 0, 2, 1); }
  if (collar) { rect(R.bodyFront, '#f0ece0', 3, 0, 2, 2); }
  if (star) { px(R.bodyFront, 1, 3, '#f0c040'); px(R.bodyFront, 1, 2, '#f0c040'); px(R.bodyFront, 0, 3, '#f0c040'); px(R.bodyFront, 2, 3, '#f0c040'); px(R.bodyFront, 1, 4, '#f0c040'); }
  // bandana
  if (!female && rng.chance(0.35) && role !== 'bartender' && role !== 'doctor' && role !== 'banker' && role !== 'preacher') {
    const bc = rng.pick(['#a83a3a', '#3a5aa8', '#f0c040']);
    rect(R.bodyFront, bc, 0, 0, 8, 1); rect(R.bodyBack, bc, 0, 0, 8, 1); rect(R.bodyRight, bc, 0, 0, 4, 1); rect(R.bodyLeft, bc, 0, 0, 4, 1);
    rect(R.bodyFront, bc, 3, 1, 2, 2);
  }
  // belt
  const beltY = female ? 11 : 11;
  if (!female) { for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, '#3a2a1a', 0, beltY, r[2], 1); px(R.bodyFront, 3, beltY, '#c9a15a'); px(R.bodyFront, 4, beltY, '#c9a15a'); }

  // ---- arms: sleeves + hands
  for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) {
    rect(r, bodyCol);
    if (plaid && !female) { const dark = shade(shirt, 0.7); for (let y = 0; y < 12; y += 3) rect(r, dark, 0, y, 4, 1); rect(r, dark, 1, 0, 1, 12); }
    if (stripes) for (let y = 0; y < 12; y += 2) rect(r, '#e8e2d2', 0, y, 4, 1);
    rect(r, skin, 0, 9, 4, 3); // hands
    if (role === 'shopkeeper' || role === 'bartender') rect(r, skin, 0, 6, 4, 6); // rolled sleeves
  }
  rect(R.armTop, bodyCol); rect(R.armBottom, skin);

  // ---- legs: pants/boots or dress skirt
  const legCol = female ? dress : pants;
  for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) {
    rect(r, legCol);
    if (female) { rect(r, shade(dress, 0.85), 0, 4, 4, 1); rect(r, shade(dress, 0.85), 0, 9, 4, 1); rect(r, '#1a1a1a', 0, 11, 4, 1); }
    else { rect(r, '#2a1a0e', 0, 9, 4, 3); /* boots */ if (rng.chance(0.4)) rect(r, shade(pants, 0.85), 0, 5, 4, 1); }
    if (role === 'rancher' || role === 'farmer' || role === 'railworker') { if (suspenders) rect(r, legCol); }
  }
  rect(R.legTop, legCol); rect(R.legBottom, '#2a1a0e');

  const hat = pickHat(role, female, rng);
  // eye info for blink.js: pixel coordinates/colours, the eyelid colour and an exact snapshot of the eye strip
  // (face columns 2..6 of row 4) taken after everything else has been painted, so a blink can restore it verbatim.
  const ex = F[0] + 2, ey = F[1] + 4, ew = 5, eh = 1;
  const eyes = { x: ex, y: ey, w: ew, h: eh, pixels: eyePixels, iris, lid: shade(skin, 0.85), image: ctx.getImageData(ex, ey, ew, eh) };
  return { canvas: c, hat, hatColor, hair, skin, seed: outfit.seed || 1, eyes };
}

function pickHat(role, female, rng) {
  if (female) return rng.chance(0.55) ? 'bonnet' : 'none';
  switch (role) {
    case 'bartender': case 'blacksmith': return rng.chance(0.2) ? 'flatcap' : 'none';
    case 'shopkeeper': return rng.chance(0.5) ? 'flatcap' : 'none';
    case 'doctor': case 'banker': case 'undertaker': return 'bowler';
    case 'preacher': return 'flat';
    case 'railworker': return 'flatcap';
    case 'rancher': case 'farmer': case 'stablehand': return rng.chance(0.6) ? 'straw' : 'cowboy';
    default: return rng.chance(0.85) ? 'cowboy' : 'none';
  }
}

export const REGIONS = R;
