import * as THREE from 'three';
import { TextureForge, type MaterialMaps } from './TextureForge';
import { QUALITY } from '../core/Config';
import type { SurfaceKind } from '../core/Signals';

/**
 * The surface library.
 *
 * Each entry is a GLSL `surface()` implementation that authors a height field
 * first and then derives everything else from it. The recurring pattern —
 * `cavity = 1 - height` driving darker albedo, higher roughness, and lower AO
 * — is what makes these read as real materials instead of noise: dirt and
 * moisture collect in recesses, wear exposes raised edges, and light behaves
 * accordingly.
 */

const CONCRETE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Cast concrete: fine aggregate over a slow undulation from the formwork.
  float base = fbm(uv * 3.0, 3.0, 5, 0.5, 2.0);
  float aggregate = worley(uv * 26.0, 26.0, 1.0).x;
  float fine = fbm(uv * 48.0, 48.0, 3, 0.55, 2.0);

  float h = 0.55 + base * 0.16 - (1.0 - aggregate) * 0.06 + fine * 0.045;

  // Horizontal form-board seams every ~0.6 of the tile.
  float seam = abs(fract(uv.y * 1.6) - 0.5);
  float seamMask = 1.0 - smoothstep(0.0, 0.022, seam);
  h -= seamMask * 0.055;

  // Shrinkage cracking follows the Worley cell boundaries.
  vec3 w = worley(uv * 5.5, 5.5, 0.95);
  float crack = 1.0 - smoothstep(0.0, 0.045, w.y - w.x);
  crack *= smoothstep(0.35, 0.65, fbm(uv * 2.2, 2.2, 3, 0.5, 2.0));
  h -= crack * 0.09;

  // Spalling: shallow bowl-shaped chips exposing lighter aggregate.
  vec3 chipCells = worley(uv * 9.0, 9.0, 1.0);
  float chipMask = step(chipCells.z, 0.09) * (1.0 - smoothstep(0.0, 0.32, chipCells.x));
  h -= chipMask * 0.13;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, base * 0.5 + 0.5);
  col = mix(col, uColorC, crack * 0.75);
  col = mix(col, uColorB * 1.22, chipMask * 0.8);
  // Aggregate specks read as slightly cooler and lighter than the paste.
  col = mix(col, col * vec3(1.12, 1.12, 1.16), smoothstep(0.55, 0.9, 1.0 - aggregate) * 0.5);

  // Water staining bleeds downward from the seams.
  float streak = fbm(vec2(uv.x * 22.0, uv.y * 1.6), 22.0, 4, 0.5, 2.0);
  float stain = smoothstep(0.52, 0.85, streak) * smoothstep(0.0, 0.18, seam) * uParams0.x;
  col *= mix(1.0, 0.72, stain);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.78 + cavity * 0.18 - chipMask * 0.05 + stain * 0.06, 0.35, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - crack * 0.55 - seamMask * 0.28 - chipMask * 0.2, 0.0, 1.0);
  return s;
}
`;

const PLASTER = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  float trowel = fbm(uv * vec2(4.0, 3.2), 4.0, 4, 0.55, 2.1);
  float grit = fbm(uv * 60.0, 60.0, 3, 0.5, 2.0);
  float h = 0.6 + trowel * 0.2 + grit * 0.035;

  // Blown render: patches where the top coat has fallen away, exposing the
  // rougher, warmer scratch coat and the block behind it.
  float patchField = fbm(uv * 2.4, 2.4, 4, 0.5, 2.0);
  float blown = smoothstep(0.58, 0.66, patchField) * uParams0.x;
  h -= blown * 0.1;

  // Block coursing revealed inside the blown patches.
  vec2 bu = uv * vec2(6.0, 12.0);
  float row = floor(bu.y);
  bu.x += mod(row, 2.0) * 0.5;
  vec2 bf = fract(bu);
  float joint = min(min(bf.x, 1.0 - bf.x), min(bf.y, 1.0 - bf.y));
  float jointMask = (1.0 - smoothstep(0.0, 0.05, joint)) * blown;
  h -= jointMask * 0.06;

  float cracks = 1.0 - smoothstep(0.0, 0.03, worley(uv * 7.0, 7.0, 0.9).y - worley(uv * 7.0, 7.0, 0.9).x);
  cracks *= smoothstep(0.4, 0.7, fbm(uv * 3.0, 3.0, 3, 0.5, 2.0));
  h -= cracks * 0.05;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, trowel * 0.5 + 0.5);
  col = mix(col, uColorC, blown);
  col = mix(col, uColorC * 0.6, jointMask);
  col *= 1.0 - cracks * 0.3;

  // Sun bleaching on the upper half, dirt splash on the lower.
  col *= mix(0.86, 1.05, smoothstep(0.0, 1.0, uv.y));
  float splash = (1.0 - smoothstep(0.0, 0.22, uv.y)) * smoothstep(0.4, 0.8, fbm(uv * 12.0, 12.0, 3, 0.5, 2.0));
  col = mix(col, uColorC * 0.7, splash * 0.5);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.82 + cavity * 0.12 + blown * 0.08, 0.4, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - cracks * 0.4 - jointMask * 0.5 - blown * 0.15, 0.0, 1.0);
  return s;
}
`;

const BRICK = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Running bond. uParams0.xy = bricks across, courses down.
  vec2 grid = vec2(uParams0.x, uParams0.y);
  vec2 bu = uv * grid;
  float course = floor(bu.y);
  bu.x += mod(course, 2.0) * 0.5;
  vec2 cell = floor(bu);
  vec2 f = fract(bu);

  float mortarW = uParams0.z;
  float dx = min(f.x, 1.0 - f.x);
  float dy = min(f.y, 1.0 - f.y);
  float edge = min(dx / mortarW, dy / (mortarW * grid.x / grid.y));
  float brickMask = smoothstep(0.0, 1.0, edge);

  float id = hash21(cell + uSeed);
  float id2 = hash21(cell + uSeed + 31.7);

  // Per-brick face: slight bow, pitting, and a random sink into the wall.
  float face = fbm((uv + id * 4.0) * 40.0, 40.0, 3, 0.5, 2.0);
  float sink = (id2 - 0.5) * 0.045;
  float h = 0.34 + brickMask * (0.5 + face * 0.06 + sink);

  // Mortar is coarse and irregular.
  float mortarNoise = fbm(uv * 70.0, 70.0, 3, 0.5, 2.0);
  h += (1.0 - brickMask) * (0.06 + mortarNoise * 0.05);

  // Damage: a fraction of bricks are chipped or missing entirely.
  float broken = step(0.94, id);
  float chipped = step(0.8, id2) * (1.0 - smoothstep(0.0, 0.5, length(f - vec2(id, id2))));
  h -= broken * brickMask * 0.42;
  h -= chipped * brickMask * 0.12;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  // Bricks vary widely in fired colour; three-way mix keyed on the cell id.
  vec3 brickCol = mix(uColorA, uColorB, id);
  brickCol = mix(brickCol, uColorA * vec3(0.78, 0.62, 0.55), step(0.72, id2) * 0.7);
  brickCol *= 0.82 + face * 0.3;

  vec3 mortarCol = uColorC * (0.86 + mortarNoise * 0.3);
  vec3 col = mix(mortarCol, brickCol, brickMask);
  col = mix(col, mortarCol * 0.55, broken * brickMask);

  // Efflorescence: pale salt bloom near the mortar.
  float bloom = (1.0 - brickMask) * smoothstep(0.5, 0.8, fbm(uv * 9.0, 9.0, 3, 0.5, 2.0));
  col = mix(col, vec3(0.86, 0.85, 0.82), bloom * 0.35);

  // Soot and grime accumulate above every course line.
  float grime = smoothstep(0.55, 0.95, fbm(uv * vec2(6.0, 22.0), 6.0, 4, 0.5, 2.0)) * uParams1.x;
  col *= mix(1.0, 0.6, grime);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(mix(0.95, 0.72, brickMask) + cavity * 0.1 + grime * 0.05, 0.4, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(mix(0.55, 1.0, brickMask) - broken * 0.3, 0.0, 1.0);
  return s;
}
`;

const SAND = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Wind ripples: stretched, slightly sheared, with a sharper crest than trough.
  vec2 ru = uv * vec2(1.0, 6.0);
  ru.x += fbm(uv * 2.0, 2.0, 3, 0.5, 2.0) * 0.8;
  float ripple = gnoise(ru * 6.0, 36.0);
  ripple = pow(ripple, 1.6);

  float dunes = fbm(uv * 1.6, 1.6, 4, 0.55, 2.0);
  float grain = fbm(uv * 130.0, 130.0, 2, 0.5, 2.0);

  float h = 0.5 + dunes * 0.22 + ripple * 0.1 * uParams0.x + grain * 0.03;

  // Scattered pebbles and dry vegetation debris.
  vec3 peb = worley(uv * 34.0, 34.0, 1.0);
  float pebbleMask = step(peb.z, 0.14) * (1.0 - smoothstep(0.06, 0.2, peb.x));
  h += pebbleMask * 0.05;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, dunes * 0.5 + 0.5);
  col *= 0.94 + grain * 0.14;
  // Damp sand in the troughs reads darker and less rough.
  float damp = smoothstep(0.55, 0.15, h) * uParams0.y;
  col = mix(col, col * 0.66, damp);
  col = mix(col, uColorC, pebbleMask * 0.85);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.92 - damp * 0.25 - pebbleMask * 0.2, 0.3, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - cavity * 0.25, 0.0, 1.0);
  return s;
}
`;

const RUBBLE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Two overlapping Worley layers give a believable size distribution:
  // large chunks of broken masonry sitting in a bed of finer debris.
  vec3 big = worley(uv * 7.0, 7.0, 1.0);
  vec3 small = worley(uv * 20.0, 20.0, 1.0);
  vec3 dust = worley(uv * 52.0, 52.0, 1.0);

  float bigH = (1.0 - smoothstep(0.0, 0.45, big.x)) * 0.34;
  float smallH = (1.0 - smoothstep(0.0, 0.42, small.x)) * 0.18;
  float dustH = (1.0 - smoothstep(0.0, 0.4, dust.x)) * 0.07;

  float h = 0.28 + bigH + smallH * 0.8 + dustH + fbm(uv * 3.0, 3.0, 4, 0.5, 2.0) * 0.1;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  // Each chunk gets its own tint so the field does not read as a single
  // noise texture — this is what sells scattered debris.
  vec3 col = mix(uColorA, uColorB, big.z);
  col = mix(col, mix(uColorB, uColorC, small.z), smoothstep(0.35, 0.05, small.x) * 0.7);
  col = mix(col, uColorC, smoothstep(0.4, 0.9, cavity) * 0.6);

  float rebar = step(0.965, hash21(floor(uv * 7.0) + uSeed + 3.3));
  col = mix(col, vec3(0.19, 0.11, 0.07), rebar * (1.0 - smoothstep(0.0, 0.2, big.x)) * 0.8);

  float dustFilm = smoothstep(0.3, 0.8, fbm(uv * 6.0, 6.0, 3, 0.5, 2.0));
  col = mix(col, uColorA * 1.1, dustFilm * 0.35);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.86 + cavity * 0.12, 0.5, 1.0);
  s.metalness = rebar * 0.6;
  s.ao = clamp(1.0 - cavity * 0.85, 0.05, 1.0);
  return s;
}
`;

const ASPHALT = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  float aggregate = worley(uv * 44.0, 44.0, 1.0).x;
  float macro = fbm(uv * 4.0, 4.0, 4, 0.5, 2.0);
  float h = 0.6 - (1.0 - aggregate) * 0.1 + macro * 0.07;

  // Alligator cracking, concentrated where the base has failed.
  vec3 w = worley(uv * 6.0, 6.0, 0.95);
  float crack = 1.0 - smoothstep(0.0, 0.05, w.y - w.x);
  crack *= smoothstep(0.42, 0.72, fbm(uv * 2.5, 2.5, 3, 0.5, 2.0));
  h -= crack * 0.11;

  // Potholes.
  vec3 pot = worley(uv * 3.2, 3.2, 1.0);
  float pothole = step(pot.z, 0.08) * (1.0 - smoothstep(0.0, 0.3, pot.x));
  h -= pothole * 0.2;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, macro * 0.5 + 0.5);
  col = mix(col, uColorB * 1.4, smoothstep(0.5, 0.95, 1.0 - aggregate) * 0.45);
  col = mix(col, uColorC, crack * 0.8);
  col = mix(col, uColorC * 0.7, pothole * 0.9);

  // Tyre polish: a smoother, darker, glossier band along the wheel paths.
  float wheelPath = exp(-pow((fract(uv.x * uParams0.x) - 0.5) * 5.0, 2.0)) * uParams0.y;
  col *= mix(1.0, 0.78, wheelPath);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.88 + cavity * 0.1 - wheelPath * 0.3, 0.25, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - crack * 0.5 - pothole * 0.45, 0.0, 1.0);
  return s;
}
`;

const PAINTED_METAL = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Rolled sheet: faint mill lines plus panel stamping.
  float mill = gnoise(uv * vec2(180.0, 6.0), 180.0) * 0.02;
  float panel = fbm(uv * 5.0, 5.0, 3, 0.5, 2.0) * 0.02;
  float h = 0.68 + mill + panel;

  // Dents: shallow, smooth, random.
  vec3 dentCells = worley(uv * 8.0, 8.0, 1.0);
  float dent = step(dentCells.z, 0.2) * (1.0 - smoothstep(0.0, 0.34, dentCells.x));
  h -= dent * 0.07;

  // Paint failure. Wear concentrates on raised areas and along edges, which is
  // why the mask is driven by height plus a coarse mask, not pure noise.
  float wearField = fbm(uv * 7.0, 7.0, 5, 0.55, 2.1);
  float edgeWear = smoothstep(0.5, 0.85, wearField) * uParams0.x;
  float scratchField = ridged(uv * vec2(30.0, 3.0), 30.0, 3);
  float scratches = smoothstep(0.72, 0.95, scratchField) * uParams0.y;
  float chipped = clamp(edgeWear + scratches, 0.0, 1.0);

  // Rust blooms out from wherever paint has failed and runs downward.
  float rustField = fbm(uv * 9.0 + vec2(0.0, uv.y * 3.0), 9.0, 5, 0.5, 2.0);
  float rust = smoothstep(0.45, 0.8, rustField) * chipped * uParams0.z;
  float rustRun = smoothstep(0.6, 0.95, fbm(uv * vec2(26.0, 2.0), 26.0, 4, 0.5, 2.0))
                  * smoothstep(0.2, 0.7, rustField) * uParams0.z * 0.6;
  rust = clamp(rust + rustRun, 0.0, 1.0);

  h += rust * 0.03 - chipped * 0.008;

  vec3 paint = uColorA;
  vec3 primer = uColorB;
  vec3 bare = vec3(0.42, 0.44, 0.47);
  vec3 rustCol = uColorC;

  vec3 col = paint;
  col = mix(col, primer, smoothstep(0.0, 0.6, chipped));
  col = mix(col, bare, smoothstep(0.55, 1.0, chipped) * 0.85);
  col = mix(col, rustCol * (0.7 + rustField * 0.6), rust);

  // Grime settles in the dents and low areas.
  float grime = smoothstep(0.4, 0.8, fbm(uv * 14.0, 14.0, 3, 0.5, 2.0));
  col *= mix(1.0, 0.78, grime * 0.5 + dent * 0.3);

  float metalness = mix(1.0, 0.0, clamp(rust * 1.2, 0.0, 1.0));
  metalness = mix(mix(0.05, 1.0, chipped), metalness, 1.0);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Fresh paint is semi-gloss; primer, bare metal, and rust are progressively
  // rougher, which is what makes the wear read as three distinct materials.
  s.roughness = clamp(mix(uParams1.x, 0.62, chipped) + rust * 0.34 + grime * 0.05, 0.08, 1.0);
  s.metalness = clamp(metalness, 0.0, 1.0);
  s.ao = clamp(1.0 - dent * 0.25 - rust * 0.15, 0.0, 1.0);
  return s;
}
`;

const CORRUGATED = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  float freq = uParams0.x;
  float corr = sin(uv.x * freq * 6.2831853) * 0.5 + 0.5;
  // Trapezoidal profile, not sinusoidal — matches real roofing sheet.
  corr = smoothstep(0.18, 0.82, corr);

  float dent = fbm(uv * 6.0, 6.0, 4, 0.5, 2.0);
  float h = 0.32 + corr * 0.42 + dent * 0.05;

  // Fixing screws along the ridges at regular vertical spacing.
  vec2 sc = vec2(fract(uv.x * freq) - 0.5, fract(uv.y * uParams0.y) - 0.5);
  float screw = 1.0 - smoothstep(0.04, 0.075, length(sc * vec2(1.0, freq / uParams0.y)));
  h -= screw * 0.05;

  float rustField = fbm(uv * vec2(7.0, 3.0), 7.0, 5, 0.5, 2.0);
  // Rust starts at screws and sheet edges and streaks down with the rain.
  float streak = smoothstep(0.55, 0.95, fbm(uv * vec2(34.0, 1.4), 34.0, 4, 0.5, 2.0));
  float rust = clamp(smoothstep(0.42, 0.78, rustField) * uParams1.x + streak * 0.45 * uParams1.x + screw * 0.6, 0.0, 1.0);

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, corr * 0.35);
  col = mix(col, uColorC * (0.65 + rustField * 0.7), rust);
  col *= 0.9 + dent * 0.2;
  // Valleys collect dirt.
  col *= mix(0.72, 1.0, corr);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.42 + rust * 0.45 + cavity * 0.12, 0.15, 1.0);
  s.metalness = clamp(1.0 - rust * 0.85, 0.0, 1.0);
  s.ao = clamp(1.0 - (1.0 - corr) * 0.4 - screw * 0.4, 0.0, 1.0);
  return s;
}
`;

const WOOD = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Plank layout with per-plank length offsets.
  float planks = uParams0.x;
  float pv = uv.y * planks;
  float plankId = floor(pv);
  float along = uv.x + hash21(vec2(plankId, 3.0) + uSeed) * 0.7;
  vec2 pf = vec2(fract(along * uParams0.y), fract(pv));

  float gap = min(min(pf.y, 1.0 - pf.y) * planks * 0.06, min(pf.x, 1.0 - pf.x) * 0.4);
  float gapMask = 1.0 - smoothstep(0.0, 0.03, gap);

  // Grain: concentric rings distorted along the length of the board.
  float warp = fbm(vec2(along * 3.0, pv * 1.2), 3.0, 4, 0.5, 2.0);
  float rings = fract((pf.y * 3.4 + warp * 2.2 + hash21(vec2(plankId, 9.0) + uSeed) * 4.0) * 5.0);
  rings = smoothstep(0.0, 0.4, rings) * smoothstep(1.0, 0.6, rings);

  float fibre = gnoise(vec2(along * 320.0, pv * 8.0), 320.0);

  float h = 0.62 + rings * 0.05 + fibre * 0.03 - gapMask * 0.22;

  // Knots.
  float knotSeed = hash21(vec2(plankId, 17.0) + uSeed);
  vec2 knotPos = vec2(knotSeed, hash21(vec2(plankId, 23.0) + uSeed));
  float knotD = length((pf - knotPos) * vec2(1.0, 1.6));
  float knot = 1.0 - smoothstep(0.02, 0.09, knotD);
  h -= knot * 0.05;

  // Splintering along the edges.
  float splinter = smoothstep(0.6, 0.95, ridged(vec2(along * 60.0, pv * 4.0), 60.0, 3)) * gapMask;
  h -= splinter * 0.04;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 light = uColorA;
  vec3 dark = uColorB;
  vec3 col = mix(light, dark, rings * 0.75 + 0.12);
  col *= 0.9 + fibre * 0.2;
  // Boards vary in tone.
  col *= 0.82 + hash21(vec2(plankId, 41.0) + uSeed) * 0.36;
  col = mix(col, uColorC, knot * 0.8);
  col = mix(col, uColorC * 0.35, gapMask * 0.9);

  // Weathering greys the exposed face.
  float weather = smoothstep(0.35, 0.8, fbm(uv * 5.0, 5.0, 4, 0.5, 2.0)) * uParams1.x;
  col = mix(col, vec3(0.34, 0.32, 0.3), weather * 0.55);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.7 + weather * 0.22 + cavity * 0.1 - rings * 0.05, 0.3, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - gapMask * 0.7 - knot * 0.3, 0.0, 1.0);
  return s;
}
`;

const FABRIC = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Plain weave: two interleaved sine sets phase-shifted by half a period.
  float scale = uParams0.x;
  vec2 t = uv * scale;
  float warpY = sin(t.y * 6.2831853) * 0.5 + 0.5;
  float weftX = sin(t.x * 6.2831853) * 0.5 + 0.5;
  float overUnder = step(0.5, fract(floor(t.x) * 0.5 + floor(t.y) * 0.5));
  float weave = mix(warpY, weftX, overUnder);
  weave = pow(weave, 1.4);

  float slub = fbm(uv * 30.0, 30.0, 3, 0.5, 2.0);
  float sag = fbm(uv * 3.0, 3.0, 4, 0.55, 2.0);

  float h = 0.45 + weave * 0.22 + sag * 0.18 + slub * 0.04;

  // Fraying and tears.
  float tear = smoothstep(0.78, 0.95, fbm(uv * 4.0, 4.0, 4, 0.5, 2.0)) * uParams1.x;
  h -= tear * 0.2;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, sag * 0.5 + 0.5);
  col *= 0.86 + weave * 0.24;
  col = mix(col, uColorC, tear * 0.7);

  // Dust and sun bleaching on the upper surfaces.
  float dust = smoothstep(0.3, 0.75, fbm(uv * 8.0, 8.0, 3, 0.5, 2.0));
  col = mix(col, col * vec3(1.16, 1.12, 1.02), dust * uParams1.y);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Fabric is uniformly rough with a slight sheen along the fibre crowns.
  s.roughness = clamp(0.94 - weave * 0.12 + cavity * 0.05, 0.55, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(0.78 + weave * 0.22 - tear * 0.3, 0.0, 1.0);
  return s;
}
`;

const GUNMETAL = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Bead-blasted and phosphated receiver finish: very fine isotropic texture
  // with directional machining marks from the broach.
  float blast = fbm(uv * 220.0, 220.0, 3, 0.5, 2.0);
  float machining = gnoise(uv * vec2(600.0, 8.0), 600.0);
  float h = 0.66 + blast * 0.035 + machining * 0.012;

  // Handling wear: the finish polishes off high points and edges first.
  float wearField = fbm(uv * 12.0, 12.0, 5, 0.55, 2.0);
  float wear = smoothstep(0.6, 0.86, wearField) * uParams0.x;
  float scratches = smoothstep(0.8, 0.97, ridged(uv * vec2(90.0, 14.0), 90.0, 3)) * uParams0.y;

  vec3 finish = uColorA;
  vec3 polished = uColorB;
  vec3 col = mix(finish, polished, clamp(wear + scratches * 0.8, 0.0, 1.0));
  col *= 0.94 + blast * 0.12;

  // Carbon fouling near the muzzle/chamber end of the tile.
  float fouling = smoothstep(0.55, 1.0, uv.x) * smoothstep(0.4, 0.8, fbm(uv * 18.0, 18.0, 3, 0.5, 2.0));
  col = mix(col, uColorC, fouling * uParams0.z);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Parkerised finish is quite rough; wear polishes it toward a mirror.
  s.roughness = clamp(uParams1.x - wear * 0.3 - scratches * 0.22 + fouling * 0.1, 0.05, 1.0);
  s.metalness = clamp(0.92 - fouling * 0.35, 0.0, 1.0);
  s.ao = 1.0;
  return s;
}
`;

const POLYMER = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Injection-moulded polymer furniture: fine stipple texture plus a moulded
  // grip pattern.
  float stipple = worley(uv * 190.0, 190.0, 1.0).x;
  float h = 0.6 + (1.0 - stipple) * 0.05;

  float grip = 0.0;
  if (uParams0.x > 0.5) {
    vec2 gu = uv * vec2(26.0, 26.0);
    vec2 gf = abs(fract(gu) - 0.5);
    grip = 1.0 - smoothstep(0.16, 0.34, max(gf.x, gf.y));
    h += grip * 0.05;
  }

  float scuff = smoothstep(0.72, 0.95, ridged(uv * vec2(60.0, 20.0), 60.0, 3)) * uParams0.y;
  float wear = smoothstep(0.62, 0.9, fbm(uv * 10.0, 10.0, 4, 0.5, 2.0)) * uParams0.y;

  vec3 col = uColorA;
  col *= 0.93 + (1.0 - stipple) * 0.1;
  col = mix(col, uColorB, clamp(scuff * 0.8 + wear * 0.5, 0.0, 1.0));

  // Dust in the recesses of the grip texture.
  col = mix(col, uColorC, (1.0 - grip) * 0.12 * uParams0.x);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(uParams1.x + (1.0 - stipple) * 0.12 - scuff * 0.18, 0.15, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - (1.0 - stipple) * 0.15, 0.0, 1.0);
  return s;
}
`;

const TILE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  vec2 grid = vec2(uParams0.x, uParams0.y);
  vec2 tu = uv * grid;
  vec2 cell = floor(tu);
  vec2 f = fract(tu);

  float groutW = uParams0.z;
  float d = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float tileMask = smoothstep(0.0, groutW, d);

  float id = hash21(cell + uSeed);
  float bow = fbm((uv + id) * 30.0, 30.0, 3, 0.5, 2.0);
  float h = 0.36 + tileMask * (0.5 + bow * 0.02);

  // Cracked and missing tiles.
  float broken = step(0.9, id);
  float crack = smoothstep(0.75, 0.9, ridged((uv + id * 3.0) * 18.0, 18.0, 3)) * step(0.7, id);
  h -= broken * tileMask * 0.4 + crack * 0.06;

  float groutNoise = fbm(uv * 90.0, 90.0, 3, 0.5, 2.0);

  vec3 tileCol = mix(uColorA, uColorB, id * 0.6);
  vec3 groutCol = uColorC * (0.85 + groutNoise * 0.3);
  vec3 col = mix(groutCol, tileCol, tileMask);
  col = mix(col, groutCol * 0.5, broken * tileMask);
  col *= 1.0 - crack * 0.35;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);
  float dirt = smoothstep(0.45, 0.85, fbm(uv * 7.0, 7.0, 4, 0.5, 2.0));
  col *= mix(1.0, 0.7, dirt * 0.6 + (1.0 - tileMask) * 0.4);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(mix(0.9, uParams1.x, tileMask) + dirt * 0.12 + broken * 0.2, 0.08, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(mix(0.5, 1.0, tileMask) - broken * 0.3 - crack * 0.15, 0.0, 1.0);
  return s;
}
`;

const DIRT_GROUND = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  float macro = fbm(uv * 2.2, 2.2, 5, 0.55, 2.0);
  float meso = fbm(uv * 11.0, 11.0, 4, 0.5, 2.0);
  vec3 clod = worley(uv * 26.0, 26.0, 1.0);
  vec3 stone = worley(uv * 13.0, 13.0, 1.0);

  float stoneMask = step(stone.z, 0.16) * (1.0 - smoothstep(0.08, 0.26, stone.x));
  float clodMask = (1.0 - smoothstep(0.05, 0.36, clod.x)) * 0.5;

  float h = 0.46 + macro * 0.2 + meso * 0.08 + clodMask * 0.08 + stoneMask * 0.07;

  // Dried mud cracking where the ground is flattest.
  vec3 w = worley(uv * 8.0, 8.0, 0.9);
  float crack = 1.0 - smoothstep(0.0, 0.05, w.y - w.x);
  crack *= smoothstep(0.45, 0.75, 1.0 - abs(macro));
  h -= crack * 0.06;

  // Tyre and boot compaction ruts.
  float rut = exp(-pow((fract(uv.y * uParams0.x) - 0.5) * 4.0, 2.0)) * uParams0.y;
  h -= rut * 0.09;

  float cavity = 1.0 - clamp(h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, macro * 0.5 + 0.5);
  col *= 0.88 + meso * 0.24;
  col = mix(col, uColorC, stoneMask * 0.9);
  col = mix(col, col * 0.62, crack * 0.7);
  col = mix(col, col * 0.78, rut * 0.6);

  // Sparse dry vegetation.
  float grass = step(0.86, hash21(floor(uv * 40.0) + uSeed)) * smoothstep(0.4, 0.7, meso) * uParams1.x;
  col = mix(col, vec3(0.28, 0.26, 0.14), grass * 0.55);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.93 - stoneMask * 0.18 + cavity * 0.06, 0.45, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - crack * 0.4 - cavity * 0.3, 0.0, 1.0);
  return s;
}
`;

export type MaterialKey =
  | 'concrete'
  | 'concreteFloor'
  | 'plaster'
  | 'plasterInterior'
  | 'brick'
  | 'sand'
  | 'rubble'
  | 'asphalt'
  | 'paintedMetalGreen'
  | 'paintedMetalTan'
  | 'paintedMetalRed'
  | 'corrugated'
  | 'wood'
  | 'woodCrate'
  | 'fabricSandbag'
  | 'fabricTarp'
  | 'gunmetal'
  | 'polymerBlack'
  | 'polymerTan'
  | 'tile'
  | 'dirt';

interface MaterialSpec {
  glsl: string;
  surface: SurfaceKind;
  opts: Parameters<TextureForge['bake']>[2];
  /** World-space metres covered by one texture tile. */
  tileMetres: number;
  material: Partial<THREE.MeshStandardMaterialParameters>;
}

const SPECS: Record<MaterialKey, MaterialSpec> = {
  concrete: {
    glsl: CONCRETE,
    surface: 'concrete',
    tileMetres: 4,
    opts: {
      seed: 11, params0: [0.7, 0, 0, 0], normalStrength: 1.1, aoStrength: 1.0,
      colorA: 0x6f6f6b, colorB: 0x8a8a84, colorC: 0x3c3c39,
    },
    material: { roughness: 1, metalness: 0 },
  },
  concreteFloor: {
    glsl: CONCRETE,
    surface: 'concrete',
    tileMetres: 5,
    opts: {
      seed: 23, params0: [0.35, 0, 0, 0], normalStrength: 0.8, aoStrength: 0.9,
      colorA: 0x63635f, colorB: 0x7b7b76, colorC: 0x34342f,
    },
    material: { roughness: 1, metalness: 0 },
  },
  plaster: {
    glsl: PLASTER,
    surface: 'concrete',
    tileMetres: 4.5,
    opts: {
      seed: 37, params0: [0.85, 0, 0, 0], normalStrength: 1.0, aoStrength: 1.0,
      colorA: 0xc4b295, colorB: 0xd8c9ae, colorC: 0x8a7b64,
    },
    material: { roughness: 1, metalness: 0 },
  },
  plasterInterior: {
    glsl: PLASTER,
    surface: 'concrete',
    tileMetres: 4,
    opts: {
      seed: 53, params0: [0.35, 0, 0, 0], normalStrength: 0.7, aoStrength: 0.8,
      colorA: 0xb9b3a6, colorB: 0xcdc7ba, colorC: 0x7d7568,
    },
    material: { roughness: 1, metalness: 0 },
  },
  brick: {
    glsl: BRICK,
    surface: 'concrete',
    tileMetres: 2.4,
    opts: {
      seed: 71, params0: [4, 12, 0.055, 0], params1: [0.55, 0, 0, 0],
      normalStrength: 1.4, aoStrength: 1.1,
      colorA: 0x8d5039, colorB: 0xa9694a, colorC: 0x9c968a,
    },
    material: { roughness: 1, metalness: 0 },
  },
  sand: {
    glsl: SAND,
    surface: 'sand',
    tileMetres: 6,
    opts: {
      seed: 97, params0: [0.9, 0.25, 0, 0], normalStrength: 0.75, aoStrength: 0.55,
      colorA: 0xbfa47a, colorB: 0xd8c297, colorC: 0x8c7c62,
    },
    material: { roughness: 1, metalness: 0 },
  },
  rubble: {
    glsl: RUBBLE,
    surface: 'dirt',
    tileMetres: 3,
    opts: {
      seed: 113, normalStrength: 1.6, aoStrength: 1.4,
      colorA: 0x8b8479, colorB: 0x6d675e, colorC: 0x4a453f,
    },
    material: { roughness: 1, metalness: 0 },
  },
  asphalt: {
    glsl: ASPHALT,
    surface: 'concrete',
    tileMetres: 5,
    opts: {
      seed: 131, params0: [1, 0.35, 0, 0], normalStrength: 1.0, aoStrength: 1.0,
      colorA: 0x35353a, colorB: 0x46464b, colorC: 0x1d1d20,
    },
    material: { roughness: 1, metalness: 0 },
  },
  paintedMetalGreen: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 2,
    opts: {
      seed: 149, params0: [0.55, 0.4, 0.7, 0], params1: [0.42, 0, 0, 0],
      normalStrength: 0.8, aoStrength: 0.7,
      colorA: 0x3f4a35, colorB: 0x55503f, colorC: 0x6b3a1d,
    },
    material: { roughness: 0.5, metalness: 1 },
  },
  paintedMetalTan: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 2,
    opts: {
      seed: 167, params0: [0.45, 0.35, 0.5, 0], params1: [0.46, 0, 0, 0],
      normalStrength: 0.8, aoStrength: 0.7,
      colorA: 0x9a8a6a, colorB: 0x6d6350, colorC: 0x6b3a1d,
    },
    material: { roughness: 0.5, metalness: 1 },
  },
  paintedMetalRed: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 1.6,
    opts: {
      seed: 181, params0: [0.7, 0.5, 0.85, 0], params1: [0.38, 0, 0, 0],
      normalStrength: 0.9, aoStrength: 0.8,
      colorA: 0x8c2f22, colorB: 0x5a4438, colorC: 0x74391b,
    },
    material: { roughness: 0.5, metalness: 1 },
  },
  corrugated: {
    glsl: CORRUGATED,
    surface: 'metal',
    tileMetres: 2.4,
    opts: {
      seed: 199, params0: [8, 4, 0, 0], params1: [0.8, 0, 0, 0],
      normalStrength: 1.5, aoStrength: 0.9,
      colorA: 0x8d9095, colorB: 0x6a6d72, colorC: 0x7a4522,
    },
    material: { roughness: 0.6, metalness: 1 },
  },
  wood: {
    glsl: WOOD,
    surface: 'wood',
    tileMetres: 2.2,
    opts: {
      seed: 211, params0: [6, 1.0, 0, 0], params1: [0.6, 0, 0, 0],
      normalStrength: 1.0, aoStrength: 1.0,
      colorA: 0x8a6a44, colorB: 0x5d4227, colorC: 0x33241a,
    },
    material: { roughness: 1, metalness: 0 },
  },
  woodCrate: {
    glsl: WOOD,
    surface: 'wood',
    tileMetres: 1.1,
    opts: {
      seed: 227, params0: [5, 1.0, 0, 0], params1: [0.3, 0, 0, 0],
      normalStrength: 1.1, aoStrength: 1.1,
      colorA: 0xa8834f, colorB: 0x77552f, colorC: 0x3d2c1d,
    },
    material: { roughness: 1, metalness: 0 },
  },
  fabricSandbag: {
    glsl: FABRIC,
    surface: 'fabric',
    tileMetres: 0.9,
    opts: {
      seed: 239, params0: [42, 0, 0, 0], params1: [0.25, 0.7, 0, 0],
      normalStrength: 1.2, aoStrength: 1.0,
      colorA: 0x8d7f5e, colorB: 0xa2946f, colorC: 0x5d5340,
    },
    material: { roughness: 1, metalness: 0 },
  },
  fabricTarp: {
    glsl: FABRIC,
    surface: 'fabric',
    tileMetres: 2.5,
    opts: {
      seed: 251, params0: [70, 0, 0, 0], params1: [0.4, 0.5, 0, 0],
      normalStrength: 0.9, aoStrength: 0.8,
      colorA: 0x4a5240, colorB: 0x5c6450, colorC: 0x2e3327,
    },
    material: { roughness: 1, metalness: 0 },
  },
  gunmetal: {
    glsl: GUNMETAL,
    surface: 'metal',
    tileMetres: 0.35,
    opts: {
      seed: 269, params0: [0.35, 0.4, 0.5, 0], params1: [0.44, 0, 0, 0],
      normalStrength: 0.5, aoStrength: 0.4,
      colorA: 0x24262a, colorB: 0x5a5e64, colorC: 0x151517,
    },
    material: { roughness: 0.45, metalness: 1 },
  },
  polymerBlack: {
    glsl: POLYMER,
    surface: 'rubber',
    tileMetres: 0.3,
    opts: {
      seed: 281, params0: [1, 0.35, 0, 0], params1: [0.58, 0, 0, 0],
      normalStrength: 0.6, aoStrength: 0.5,
      colorA: 0x1c1d20, colorB: 0x35383d, colorC: 0x4a453c,
    },
    material: { roughness: 0.6, metalness: 0 },
  },
  polymerTan: {
    glsl: POLYMER,
    surface: 'rubber',
    tileMetres: 0.3,
    opts: {
      seed: 293, params0: [1, 0.4, 0, 0], params1: [0.62, 0, 0, 0],
      normalStrength: 0.6, aoStrength: 0.5,
      colorA: 0x7d6c50, colorB: 0x998a6c, colorC: 0x4a453c,
    },
    material: { roughness: 0.65, metalness: 0 },
  },
  tile: {
    glsl: TILE,
    surface: 'concrete',
    tileMetres: 2,
    opts: {
      seed: 307, params0: [8, 8, 0.045, 0], params1: [0.22, 0, 0, 0],
      normalStrength: 1.2, aoStrength: 1.0,
      colorA: 0xa39a86, colorB: 0x8b8271, colorC: 0x6a6459,
    },
    material: { roughness: 0.5, metalness: 0 },
  },
  dirt: {
    glsl: DIRT_GROUND,
    surface: 'dirt',
    tileMetres: 5,
    opts: {
      seed: 317, params0: [3, 0.4, 0, 0], params1: [0.6, 0, 0, 0],
      normalStrength: 1.1, aoStrength: 1.0,
      colorA: 0x6d5a41, colorB: 0x877353, colorC: 0x59544c,
    },
    material: { roughness: 1, metalness: 0 },
  },
};

/**
 * Detail normal map applied on top of every surface.
 *
 * A single high-frequency map, tiled ~30x tighter than the base, keeps
 * surfaces from turning into flat mush when the player presses right up
 * against a wall — the base map's texel density runs out long before the
 * camera does.
 */
const DETAIL_NORMAL = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;
  float fine = fbm(uv * 90.0, 90.0, 4, 0.5, 2.2);
  float grain = worley(uv * 150.0, 150.0, 1.0).x;
  s.height = 0.5 + fine * 0.3 + (1.0 - grain) * 0.2;
  s.albedo = vec3(0.5);
  s.roughness = 0.5;
  s.metalness = 0.0;
  s.ao = 1.0;
  return s;
}
`;

export class MaterialLibrary {
  private readonly forge: TextureForge;
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly mapsCache = new Map<MaterialKey, MaterialMaps>();
  private detailNormal: THREE.Texture | null = null;
  readonly surfaceOf = new Map<THREE.Material, SurfaceKind>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.forge = new TextureForge(renderer);
  }

  /** Bakes the shared detail normal. Call once during load. */
  init(): void {
    const maps = this.forge.bake('detail', DETAIL_NORMAL, {
      size: 512,
      seed: 991,
      normalStrength: 0.55,
    });
    this.detailNormal = maps.normalMap;
  }

  maps(key: MaterialKey): MaterialMaps {
    let m = this.mapsCache.get(key);
    if (!m) {
      const spec = SPECS[key];
      m = this.forge.bake(key, spec.glsl, { size: QUALITY.textureSize, ...spec.opts });
      this.mapsCache.set(key, m);
    }
    return m;
  }

  /**
   * Returns a shared material for a surface at a given world scale.
   * `scale` multiplies the physical tile size — larger values stretch the
   * texture, smaller values tighten it.
   */
  get(
    key: MaterialKey,
    opts: {
      scale?: number;
      /** Overrides the world-metres-per-tile from the spec. */
      tileMetres?: number;
      color?: THREE.ColorRepresentation;
      roughness?: number;
      metalness?: number;
      normalScale?: number;
      emissive?: THREE.ColorRepresentation;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
      /** Uniform UV repeat override; when set, tileMetres is ignored. */
      repeat?: [number, number];
    } = {},
  ): THREE.MeshStandardMaterial {
    const spec = SPECS[key];
    const cacheKey = `${key}|${JSON.stringify(opts)}`;
    const hit = this.materials.get(cacheKey);
    if (hit) return hit;

    const maps = this.maps(key);
    const mat = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      metalnessMap: maps.metalnessMap,
      aoMap: maps.aoMap,
      ...spec.material,
      color: opts.color ?? 0xffffff,
      side: opts.side ?? THREE.FrontSide,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      envMapIntensity: 1,
      dithering: true,
    });

    if (opts.roughness !== undefined) mat.roughness = opts.roughness;
    if (opts.metalness !== undefined) mat.metalness = opts.metalness;
    mat.normalScale.setScalar(opts.normalScale ?? 1);
    mat.aoMapIntensity = 1;

    // Repeat is baked into the material rather than the texture so the same
    // texture object can be shared at many world scales.
    const tile = opts.tileMetres ?? spec.tileMetres;
    const s = (opts.scale ?? 1) / Math.max(tile, 0.01);
    if (opts.repeat) {
      mat.map!.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    mat.userData.uvScale = s;
    mat.userData.materialKey = key;
    mat.userData.tileMetres = tile;

    if (this.detailNormal) this.attachDetailNormal(mat, key);

    this.surfaceOf.set(mat, spec.surface);
    this.materials.set(cacheKey, mat);
    return mat;
  }

  /**
   * Injects a second, tightly-tiled normal map that is blended with the base
   * using reoriented normal mapping (Barré-Brisebois & Hill). Naive additive
   * blending flattens the base normal; RNM preserves it.
   */
  private attachDetailNormal(mat: THREE.MeshStandardMaterial, key: MaterialKey): void {
    const detail = this.detailNormal!;
    const spec = SPECS[key];

    // Patch the stock chunk rather than appending after it. The tangent frame
    // (`tbn`) only exists inside the tangent-space branch of the chunk, so
    // blending has to happen where `mapN` is still in scope.
    const patchedChunk = THREE.ShaderChunk.normal_fragment_maps.replace(
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
       {
         // Detail fades out with distance: at range it only produces
         // aliasing, and it costs a texture fetch on every pixel.
         float ob_dist = length( vViewPosition );
         float ob_fade = 1.0 - smoothstep( uDetailFadeStart, uDetailFadeEnd, ob_dist );
         if ( ob_fade > 0.002 ) {
           vec3 ob_detail = texture2D( tDetailNormal, vNormalMapUv * uDetailScale ).xyz * 2.0 - 1.0;
           ob_detail.xy *= uDetailStrength * ob_fade;
           mapN = obBlendRNM( mapN, normalize( ob_detail ) );
         }
       }`,
    );

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tDetailNormal = { value: detail };
      shader.uniforms.uDetailScale = { value: 22 / Math.max(spec.tileMetres, 0.1) };
      shader.uniforms.uDetailStrength = { value: 0.6 };
      shader.uniforms.uDetailFadeStart = { value: 3.0 };
      shader.uniforms.uDetailFadeEnd = { value: 16.0 };

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <normalmap_pars_fragment>',
          `#include <normalmap_pars_fragment>
           uniform sampler2D tDetailNormal;
           uniform float uDetailScale;
           uniform float uDetailStrength;
           uniform float uDetailFadeStart;
           uniform float uDetailFadeEnd;

           // Reoriented normal mapping (Barré-Brisebois & Hill). Naive
           // additive blending flattens the base normal; RNM rotates the
           // detail into the base's frame and preserves both.
           vec3 obBlendRNM( vec3 base, vec3 detail ) {
             vec3 t = base + vec3( 0.0, 0.0, 1.0 );
             vec3 u = detail * vec3( -1.0, -1.0, 1.0 );
             return normalize( t * dot( t, u ) - u * t.z );
           }`,
        )
        .replace('#include <normal_fragment_maps>', patchedChunk);
      mat.userData.shader = shader;
    };
    mat.customProgramCacheKey = () => `obdetail-${key}`;
  }

  surfaceKind(mat: THREE.Material | THREE.Material[] | null | undefined): SurfaceKind {
    if (!mat) return 'concrete';
    const m = Array.isArray(mat) ? mat[0] : mat;
    return this.surfaceOf.get(m) ?? 'concrete';
  }

  dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    this.forge.dispose();
  }
}
