// Shaders for the battle station. The body shader textures every voxel face per block (plates, seams, window
// specks, trench running lights, bowl spokes/rings, emitter glow) from the model-space position alone, shades
// with a 4-step quantised lambert from the sphere normal plus Minecraft-style face tones, and applies at most
// ~28% of the terrain fog so the station is never washed out at 300+ blocks. Materials (aFace.w):
//   1 hull, 2 trench lip, 3 trench floor, 4 trench wall, 5 dish rim, 6 dish bowl, 7 seam, 8 emitter node.
// Night readability (all gated by 1 - daylight so the daytime look is untouched): the charging focus ball throws
// banded green light back onto the dish side of the sphere, twice as many window specks with light spilling onto
// their neighbours, and taller, denser trench lamps whose warm light washes the trench floor and walls.

export const BODY_VERT = /* glsl */ `
attribute vec4 aFace;
varying vec3 vPos;
varying vec4 vFace;
varying float vDist;
void main() {
  vPos = position;
  vFace = aFace;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const BODY_FRAG = /* glsl */ `
uniform mat3 uRot;
uniform vec3 uLightDir;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogFar; uniform float uFlash;
uniform float uPower; uniform float uHeat; uniform float uCharge; uniform float uFiring; uniform float uAlpha; uniform float uTime;
uniform float uRadius; uniform float uTrenchR;
uniform vec3 uDish; uniform vec3 uDishU; uniform vec3 uDishV; uniform vec3 uDishC; uniform vec3 uFocus;
varying vec3 vPos;
varying vec4 vFace;
varying float vDist;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }

// Is the block at (tc, depth) on a face of direction dirId a lit window? Plates are brick-staggered rows of 9x6
// blocks whose first row/column is a groove (never a window); a coarser 14x11 grid decides the window density.
// Night raises the density 1.7x (the threshold moves continuously, so dusk fades the extra windows in).
float windowAt(vec2 tc, float depth, float dirId, float night) {
  float row = floor(tc.y / 6.0);
  float stag = floor(hash12(vec2(row, dirId + 3.0)) * 9.0);
  if (fract((tc.x + stag) / 9.0) < 0.06 || fract(tc.y / 6.0) < 0.06) return 0.0;
  vec2 g2 = floor((tc + dirId * 5.0 + 4.0) / vec2(14.0, 11.0));
  float pw = hash12(g2 * 1.7 + 3.1);
  float dens = (pw < 0.28 ? 0.11 : (pw < 0.6 ? 0.025 : 0.0)) * (1.0 + 0.7 * night);
  return step(1.0 - dens, hash13(vec3(tc, depth + dirId * 37.0) + 7.7));
}

void main() {
  vec3 n = vFace.xyz - 1.0;                       // axis-aligned face normal (model space)
  float mat = vFace.w;
  vec3 an = abs(n);
  // the voxel this face belongs to; every pattern below is evaluated per block so the texels stay crisp
  vec3 cell = floor(vPos - 0.5 * n) + 0.5;
  vec2 tc = an.x > 0.5 ? cell.zy : (an.y > 0.5 ? cell.xz : cell.xy);
  float depth = an.x > 0.5 ? cell.x : (an.y > 0.5 ? cell.y : cell.z);
  float dirId = an.x > 0.5 ? (n.x > 0.0 ? 0.0 : 1.0) : (an.y > 0.5 ? (n.y > 0.0 ? 2.0 : 3.0) : (n.z > 0.0 ? 4.0 : 5.0));
  vec3 key = vec3(tc, depth + dirId * 37.0);
  float h = hash13(key);
  float day = clamp((uSkyLight - 0.27) / 0.73, 0.0, 1.0);
  float night = 1.0 - day;

  // panel plates (see windowAt): the plate and the coarse grid shift the tone so the plating reads as irregular
  // rectangles; windows live on the hull, the trench lip and the trench walls
  float row = floor(tc.y / 6.0);
  float stag = floor(hash12(vec2(row, dirId + 3.0)) * 9.0);
  vec2 g1 = vec2(floor((tc.x + stag) / 9.0), row);
  vec2 g2 = floor((tc + dirId * 5.0 + 4.0) / vec2(14.0, 11.0));
  float p1 = hash12(g1 + dirId * 7.0), p2 = hash12(g2 + dirId * 2.0 + 0.5);
  float tone = 1.0 + (p1 - 0.5) * 0.16 + (p2 - 0.5) * 0.12 + (h - 0.5) * 0.05;
  bool groove = fract((tc.x + stag) / 9.0) < 0.06 || fract(tc.y / 6.0) < 0.06;
  bool lit = mat < 2.5 || (mat > 3.5 && mat < 4.5);
  bool window = lit && windowAt(tc, depth, dirId, night) > 0.5;
  // at night a lit window spills light onto the four blocks around it, so the specks read from the street
  float spill = 0.0;
  if (lit && !window && night > 0.001) {
    spill = max(max(windowAt(tc + vec2(1.0, 0.0), depth, dirId, night), windowAt(tc - vec2(1.0, 0.0), depth, dirId, night)),
                max(windowAt(tc + vec2(0.0, 1.0), depth, dirId, night), windowAt(tc - vec2(0.0, 1.0), depth, dirId, night)));
  }

  vec3 base;
  if (mat < 1.5) base = vec3(0.56, 0.57, 0.61);             // hull
  else if (mat < 2.5) base = vec3(0.70, 0.71, 0.75);        // trench lip
  else if (mat < 3.5) base = vec3(0.14, 0.15, 0.18);        // trench floor
  else if (mat < 4.5) base = vec3(0.27, 0.28, 0.32);        // trench wall
  else if (mat < 5.5) base = vec3(0.66, 0.67, 0.71);        // dish rim
  else if (mat < 6.5) base = vec3(0.27, 0.28, 0.32);        // dish bowl
  else if (mat < 7.5) base = vec3(0.42, 0.43, 0.47);        // seam
  else base = vec3(0.04, 0.07, 0.05);                         // emitter node
  if (groove && mat < 2.5) tone *= 0.86;

  // smooth normal used for the sun term: the sphere normal, the bowl's concave normal or the wall's own face
  vec3 sn = normalize(cell);
  if (mat > 5.5 && mat < 6.5) sn = normalize(uDishC - cell);
  if (mat > 3.5 && mat < 4.5) sn = n;
  vec3 snW = uRot * sn;
  vec3 nW = uRot * n;
  float lam = dot(snW, uLightDir);
  float qs = floor(clamp(lam, 0.0, 0.999) * 4.0) / 3.0;     // sun: four shading bands
  float qb = floor(clamp(-snW.y, 0.0, 0.999) * 3.0) / 2.0;  // ground bounce lights the underside (three bands)
  float dark = (lam < 0.0 && lam > -0.35) ? 0.9 : 1.0;     // darker terminator strip
  float faceTone = 0.92 + 0.08 * nW.y;                      // blocky top/side/bottom tones
  // the station is mostly seen from below: ambient + ground bounce keep the shadow side readable and round
  float shade = min(1.0, 0.40 + 0.22 * qb + 0.45 * qs) * dark * faceTone;
  float light = mix(0.3, 1.0, day);
  vec3 col = base * tone * shade * light * uSkyTint;

  // charge glow bounced back from the focus ball: a wrapped lambert toward the focus with a distance falloff
  // (the dish, its rim and the hull around it) plus a soft wash over the whole aim-facing hemisphere, quantised
  // into bands like the sun term. The far side stays dark. Night only: by day the sun wins.
  if (mat < 7.5 && night > 0.001) {
    vec3 toF = uFocus - cell;
    float fd2 = dot(toF, toF);
    float wrap = max(0.0, (dot(sn, toF * inversesqrt(fd2)) + 0.6) / 1.6);
    float hemi = max(0.0, dot(sn, uDish));
    float bounce = wrap * wrap / (1.0 + fd2 / (uRadius * uRadius)) + 0.3 * hemi * hemi;
    bounce = floor(bounce * 8.0 + 0.5) / 8.0;
    vec3 bounceCol = mix(vec3(0.2, 0.9, 0.35), vec3(0.8, 1.0, 0.85), uFiring);   // whitens with the dish while firing
    col += bounceCol * (uCharge * bounce * 0.45 * night);
  }

  float pulse = 0.85 + 0.15 * sin(uTime * 1.7 + h * 6.2832);
  float on = (0.15 + 0.85 * uPower) * pulse;
  vec3 warm = vec3(1.0, 0.93, 0.72);
  if (window) {
    // by day a window is a faint tinted speck; at night it is lit (and there are ~1.7x as many, see windowAt)
    col = mix(col, warm, on * mix(1.0, 0.15, day));
  } else if (spill > 0.5) {
    col = mix(col, warm * 0.5, 0.35 * night * on);
  }
  if (mat > 2.5 && mat < 4.5) {
    // the trench: one running light every 6 blocks on the two equator rows of the floor; at night the lamps grow
    // to four rows, an offset second set comes on and their warm light washes the floor and walls
    float trenchOn = (0.3 + 0.7 * uPower) * pulse;
    col = mix(col, vec3(0.55, 0.40, 0.22), (mat < 3.5 ? 0.28 : 0.18) * night * trenchOn);
    if (mat < 3.5 && an.y < 0.5) {
      float run = floor(atan(cell.x, cell.z) * uTrenchR - uTime * 3.0);
      float ay = abs(cell.y);
      float lamp = 0.0;
      if (mod(run, 6.0) < 1.0) lamp = ay < 1.0 ? 1.0 : (ay < 2.0 ? night : 0.0);
      else if (mod(run + 3.0, 6.0) < 1.0 && ay < 1.0) lamp = 0.85 * night;
      col = mix(col, vec3(1.0, 0.85, 0.55), lamp * trenchOn);
    }
  }
  if (mat > 5.5 && mat < 6.5) {
    float along = dot(cell, uDish);
    vec3 perp = cell - along * uDish;
    float ad = length(perp);
    float ang = atan(dot(perp, uDishV), dot(perp, uDishU));
    float spoke = abs(fract(ang / 6.2832 * 8.0 + 0.5) - 0.5) * (6.2832 / 8.0) * ad;
    bool isRing = mod(floor(ad), 5.0) < 1.0 && ad > 3.0;
    if ((spoke < 0.7 && ad > 3.0) || isRing) col *= 0.72;
    float centre = 1.0 - smoothstep(2.0, uRadius * 0.28, ad);
    vec3 glow = vec3(0.35, 0.9, 0.5);
    col += glow * (uHeat * (0.12 + 0.25 * (isRing ? 1.0 : 0.0)) + uCharge * 0.6 * centre);
    col = mix(col, vec3(1.0, 1.0, 0.96), uFiring * 0.85);
  }
  if (mat > 7.5) {
    vec3 g = mix(vec3(0.35, 0.95, 0.45), vec3(1.0), uFiring);
    col = base + g * (0.22 + 1.1 * uCharge + 1.0 * uFiring) * (0.8 + 0.2 * step(0.5, h));
  }

  float fog = 0.28 * smoothstep(uFogFar * 0.8, uFogFar * 3.0, vDist);
  col = mix(col, uFogColor, fog);
  col += uFlash * 0.35;
  gl_FragColor = vec4(col, uAlpha);
}`;

export const HALO_VERT = /* glsl */ `
attribute vec2 aCorner;
attribute float aKind;
uniform float uCharge; uniform float uFiring;
varying vec2 vCorner;
varying float vKind;
varying float vDist;
void main() {
  vec4 c = modelMatrix * vec4(position, 1.0);
  float size = aKind < 0.5 ? (4.0 + 8.0 * uCharge + 12.0 * uFiring) : (1.2 + 1.8 * uCharge + 2.5 * uFiring);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 toCam = normalize(cameraPosition - c.xyz);
  vec3 w = c.xyz + (right * aCorner.x + up * aCorner.y) * size + toCam * 1.5;
  vCorner = aCorner; vKind = aKind;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const HALO_FRAG = /* glsl */ `
uniform float uCharge; uniform float uFiring; uniform float uAlpha; uniform float uTime; uniform float uFogFar;
varying vec2 vCorner;
varying float vKind;
varying float vDist;
void main() {
  // pixel-art glow: the falloff is sampled on a 12x12 cell grid and quantised into four bands
  vec2 qc = (floor(vCorner * 6.0) + 0.5) / 6.0;
  float fall = max(0.0, 1.0 - dot(qc, qc));
  fall = floor(fall * fall * 4.0 + 0.5) / 4.0;
  vec3 g = mix(vec3(0.3, 1.0, 0.45), vec3(1.0, 1.0, 0.95), uFiring);
  float k = (0.06 + 0.55 * uCharge + 1.0 * uFiring) * fall * (vKind < 0.5 ? 1.0 : 0.7);
  float fog = 1.0 - 0.28 * smoothstep(uFogFar * 0.8, uFogFar * 3.0, vDist);
  gl_FragColor = vec4(g * k * fog * uAlpha, 1.0);
}`;
