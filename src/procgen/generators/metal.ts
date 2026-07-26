import * as THREE from 'three';
import type { MaterialSpec } from './types';

/**
 * Metals.
 *
 * The one rule that decides whether these read as metal at all: bare metal is
 * `metalness = 1` with a bright, near-neutral albedo, and everything that grows
 * on top of it — rust, paint, primer, grease, dust — is a *dielectric*, so it
 * has to drop metalness towards 0 and push roughness up. Albedo is authored in
 * sRGB here, so iron's 0.56 linear reflectance is written as 0.78.
 */

const STEEL_CONSTANTS = /* glsl */ `
const vec3 STEEL = vec3(0.782, 0.790, 0.800);
const vec3 STEEL_DARK = vec3(0.628, 0.638, 0.652);
const vec3 ZINC = vec3(0.826, 0.830, 0.822);
const vec3 RUST_ORANGE = vec3(0.556, 0.268, 0.108);
const vec3 RUST_MID = vec3(0.412, 0.190, 0.092);
const vec3 RUST_DARK = vec3(0.238, 0.126, 0.086);
const vec3 GRIME = vec3(0.148, 0.144, 0.138);
`;

const METAL_PANEL = /* glsl */ `
${STEEL_CONSTANTS}
const vec3 PRIMER = vec3(0.372, 0.396, 0.420);

void surface(vec2 uv, inout Surface s) {
  // Galvanised sheet on a 2x3 panel layout: rolled seams with a rivet line down
  // each joint, spangle from the zinc bath, scuffs that cut back to bright
  // steel, and rust bleeding out of the fixings.
  Cell p = gridCell(uv, vec2(2.0, 3.0), 0.022);
  float seam = 1.0 - p.face;

  // Rivet domes tracked a fixed distance in from every vertical seam.
  float seamU = p.dist.x * 0.5;
  float rowV = (fract(uv.y * 20.0) - 0.5) / 20.0;
  float rd = length(vec2(seamU - 0.015, rowV)) / 0.0095;
  float rivetHead = sqrt(max(0.0, 1.0 - rd * rd)) * (1.0 - smoothstep(0.88, 1.0, rd));

  // Sheet is never dead flat: it oil-cans slightly between the fixings.
  float oilCan = fbm2(uv * vec2(3.0, 4.0) + 2.7, vec2(3.0, 4.0), 3);
  float mill = grainAniso(uv, vec2(14.0, 240.0), 3);
  float spangle = 1.0 - smoothstep(0.10, 0.52, grainWorley(uv, 40.0, 0.95).x);
  float micro = grainNoise(uv, 220.0, 2);

  // Wear: scuffs on the raised sheet, deeper gouges where things get dragged.
  float scuff = scratches(uv, vec2(detailCells(150.0), detailCells(38.0)), 6.0, 0.5);
  float gouge = scratches(uv, vec2(detailCells(22.0), detailCells(9.0)), 3.0, 0.22);

  // Coating breakdown, weighted towards seams and rivets where water sits.
  float wetTrap = sat(seam * 0.8 + rivetHead * 0.6 + sat(1.0 - uv.y * 1.7) * 0.35);
  float rustField = fbm2(warp2(uv * 6.0, vec2(6.0), 0.5, 3), vec2(6.0), 5) * 0.5 + 0.5;
  float rust = smoothstep(0.56, 0.78, rustField + wetTrap * 0.30);
  float rustEdge = band(rustField + wetTrap * 0.30, 0.60, 0.09);
  float bloom = smoothstep(0.40, 0.72, rustField + wetTrap * 0.45) * 0.6;

  float streak = dripStreaks(uv, 20.0, 0.62, 5.0);
  float dust = cavityDirt(1.0 - seam * 0.9, micro, 0.55) + streak * 0.5;
  float grease = smoothstep(0.55, 0.92, turbulence2(uv * 4.0 + 31.0, vec2(4.0), 4));

  float height = 0.60
    + p.face * 0.10
    + rivetHead * 0.30
    + (oilCan) * 0.05
    + (mill - 0.5) * 0.03
    + (micro - 0.5) * 0.02
    + spangle * 0.015
    - seam * 0.30
    - gouge * 0.14
    - scuff * 0.03
    + rust * 0.05
    - rust * spangle * 0.04;

  vec3 albedo = mix(ZINC, STEEL, sat(oilCan * 0.5 + 0.5));
  albedo = mix(albedo, ZINC * 1.04, spangle * 0.5);
  albedo *= 0.94 + 0.10 * mill;
  albedo = mix(albedo, PRIMER, bloom * 0.20);
  albedo = mix(albedo, RUST_ORANGE, rust * 0.55);
  albedo = mix(albedo, RUST_DARK, rust * rust * 0.55);
  albedo = mix(albedo, RUST_ORANGE * 1.12, rustEdge * 0.35);
  albedo = mix(albedo, STEEL * 1.05, sat(scuff + gouge) * 0.55);
  albedo = mix(albedo, GRIME, grease * 0.30 + dust * 0.22);
  albedo = mix(albedo, vec3(0.196, 0.152, 0.126), streak * 0.45);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.36;
  rough += (mill - 0.5) * 0.16;
  rough -= spangle * 0.06;
  rough += rust * 0.50;
  rough += bloom * 0.12;
  rough += dust * 0.20;
  rough += grease * 0.14;
  rough += seam * 0.06;
  rough -= sat(scuff + gouge) * 0.10;
  rough += (micro - 0.5) * 0.06;

  // Rust and grime are dielectric films over the sheet.
  float metal = 1.0 - rust * 0.94 - bloom * 0.20 - dust * 0.30 - grease * 0.25;

  float ao = 1.0 - seam * 0.45 - gouge * 0.25 - dust * 0.14 - rust * 0.08 + rivetHead * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = sat(metal);
  s.ao = ao;
  s.height = height;
}
`;

const METAL_RUSTED = /* glsl */ `
${STEEL_CONSTANTS}

void surface(vec2 uv, inout Surface s) {
  // Heavily corroded plate. Rust is layered: a soft ferric bloom, hard laminar
  // scale that has lifted at its edges, and craters where the scale has already
  // fallen off and taken the parent metal with it.
  vec2 warped = warp2(uv * 4.0, vec2(4.0), 0.8, 4);
  float macro = fbm2(warped, vec2(4.0), 5) * 0.5 + 0.5;
  float rise = sat(1.0 - uv.y * 1.35);

  vec3 scaleCells = worley2(uv * 13.0, vec2(13.0), 1.0);
  float scale = smoothstep(0.30, 0.10, scaleCells.y - scaleCells.x);
  float plate = step(0.34, scaleCells.z);
  float lift = scale * plate;

  float rustField = sat(macro * 0.75 + rise * 0.35);
  float bloom = smoothstep(0.28, 0.58, rustField);
  float heavy = smoothstep(0.52, 0.80, rustField);
  float bare = 1.0 - smoothstep(0.16, 0.34, rustField);

  vec3 craterCells = worley2(uv * 26.0 + 4.3, vec2(26.0), 1.0);
  float crater = (1.0 - smoothstep(0.05, 0.34, craterCells.x)) *
    step(0.55, craterCells.z) * heavy;
  float pit = (1.0 - smoothstep(0.02, 0.16, grainWorley(uv, 120.0, 1.0).x)) * bloom;

  float grit = grainNoise(uv, 190.0, 3);
  float micro = grainNoise(uv, 256.0, 2);
  float flakeGrain = grainFbm(uv, 90.0, 4) * 0.5 + 0.5;

  float streak = dripStreaks(uv, 15.0, 0.75, 7.0);
  float mill = grainAniso(uv, vec2(10.0, 200.0), 3);

  float height = 0.58
    + bloom * 0.10
    + heavy * 0.10
    + lift * 0.14
    + (flakeGrain - 0.5) * 0.12 * bloom
    + (grit - 0.5) * 0.10
    + (micro - 0.5) * 0.04
    + (mill - 0.5) * 0.02 * bare
    - crater * 0.42
    - pit * 0.20
    - scale * 0.06;

  vec3 albedo = mix(STEEL_DARK, RUST_MID, bloom);
  albedo = mix(albedo, RUST_ORANGE, heavy * (0.35 + 0.55 * flakeGrain));
  albedo = mix(albedo, RUST_DARK, sat(heavy - 0.3) * 1.2 * (1.0 - flakeGrain) * 0.8);
  albedo = mix(albedo, RUST_DARK * 0.82, crater * 0.8);
  albedo = mix(albedo, STEEL, bare * 0.75);
  albedo = tintShift(albedo, (macro - 0.5) * 0.03, 0.9 + heavy * 0.35, 1.0);
  albedo *= 0.88 + 0.22 * grit;
  albedo = mix(albedo, RUST_DARK * 0.9, streak * 0.55);
  albedo = mix(albedo, RUST_ORANGE * 1.10, lift * 0.25);
  albedo *= 0.96 + 0.08 * micro;

  float rough = mix(0.42, 0.94, bloom);
  rough += heavy * 0.05;
  rough -= bare * 0.10;
  rough += crater * 0.03;
  rough += (grit - 0.5) * 0.10;
  rough -= streak * 0.04;
  rough += (mill - 0.5) * 0.06 * bare;

  float metal = (1.0 - bloom * 0.90) * (1.0 - heavy * 0.55);
  metal = max(metal, bare * 0.98);

  float ao = 1.0
    - crater * 0.55
    - pit * 0.30
    - scale * 0.18
    - heavy * 0.10
    - streak * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = sat(metal);
  s.ao = ao;
  s.height = height;
}
`;

const METAL_CORRUGATED = /* glsl */ `
${STEEL_CONSTANTS}

void surface(vec2 uv, inout Surface s) {
  // Corrugated roofing sheet. The rib profile is the whole silhouette, so the
  // relief is deliberately deep; rust collects in the valleys where water runs
  // and the crowns stay bright where the rain scrubs them.
  const float RIBS = 9.0;
  float profile = corrugation(uv, RIBS, 1.45);
  float ribPhase = fract(uv.x * RIBS);
  float crown = smoothstep(0.35, 0.90, profile);
  float valley = 1.0 - smoothstep(0.10, 0.55, profile);

  // Overlap seam every third rib, plus fixings through the crowns.
  float lapIndex = mod(floor(uv.x * RIBS), 3.0);
  float lap = (1.0 - smoothstep(0.03, 0.10, abs(ribPhase - 0.5))) * step(2.5, lapIndex + 0.5);
  float sheetV = fract(uv.y * 2.0);
  float endLap = 1.0 - smoothstep(0.008, 0.030, min(sheetV, 1.0 - sheetV));

  float fixRow = (fract(uv.y * 6.0 + 0.5) - 0.5) / 6.0;
  float fixU = (ribPhase - 0.5) / RIBS;
  float fd = length(vec2(fixU, fixRow) * vec2(1.0, 1.0)) / 0.010;
  float fixing = crown * sqrt(max(0.0, 1.0 - fd * fd)) * (1.0 - smoothstep(0.85, 1.0, fd));

  float mill = grainAniso(uv, vec2(8.0, 200.0), 3);
  float spangle = 1.0 - smoothstep(0.12, 0.52, grainWorley(uv, 44.0, 0.95).x);
  float micro = grainNoise(uv, 230.0, 2);
  float dent = fbm2(uv * vec2(5.0, 7.0) + 8.4, vec2(5.0, 7.0), 3);

  float rustField = fbm2(warp2(uv * 5.0, vec2(5.0), 0.55, 3), vec2(5.0), 5) * 0.5 + 0.5;
  float wetTrap = valley * 0.55 + fixing * 0.5 + endLap * 0.4 + sat(1.0 - uv.y * 1.6) * 0.3;
  float rust = smoothstep(0.52, 0.76, rustField + wetTrap * 0.34);
  float bloom = smoothstep(0.36, 0.66, rustField + wetTrap * 0.44) * 0.75;
  float perforation = smoothstep(0.90, 0.99, rustField + wetTrap * 0.4) * valley;

  float streak = dripStreaks(uv, RIBS * 2.0, 0.85, 13.0) * (0.4 + valley * 0.8);
  float dust = cavityDirt(profile, micro, 0.7);
  float moss = smoothstep(0.62, 0.94, turbulence2(uv * 8.0 + 5.0, vec2(8.0), 4)) * valley;

  float height = 0.24
    + profile * 0.60
    + lap * 0.10
    + fixing * 0.16
    - endLap * 0.10
    + dent * 0.03
    + (mill - 0.5) * 0.02
    + (micro - 0.5) * 0.015
    + spangle * 0.010
    - perforation * 0.35
    + rust * 0.03;

  vec3 albedo = mix(ZINC * 0.94, ZINC, crown * 0.6 + 0.4);
  albedo = mix(albedo, ZINC * 1.05, spangle * 0.45);
  albedo *= 0.94 + 0.10 * mill;
  albedo = mix(albedo, STEEL_DARK, dust * 0.25);
  albedo = mix(albedo, RUST_ORANGE, rust * 0.60);
  albedo = mix(albedo, RUST_DARK, rust * rust * 0.60);
  albedo = mix(albedo, RUST_MID * 1.05, bloom * 0.30);
  albedo = mix(albedo, vec3(0.164, 0.132, 0.106), streak * 0.50);
  albedo = mix(albedo, vec3(0.132, 0.152, 0.098), moss * 0.40);
  albedo = mix(albedo, vec3(0.052, 0.044, 0.038), perforation * 0.8);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.34;
  rough += (mill - 0.5) * 0.14;
  rough -= spangle * 0.05;
  rough += rust * 0.52;
  rough += bloom * 0.16;
  rough += dust * 0.22;
  rough += moss * 0.20;
  rough += (micro - 0.5) * 0.06;

  float metal = 1.0 - rust * 0.93 - bloom * 0.28 - moss * 0.6 - dust * 0.25;

  float ao = 1.0
    - valley * 0.24
    - endLap * 0.30
    - perforation * 0.55
    - moss * 0.18
    - dust * 0.12
    + crown * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = sat(metal);
  s.ao = ao;
  s.height = height;
}
`;

const METAL_GRATE = /* glsl */ `
${STEEL_CONSTANTS}

void surface(vec2 uv, inout Surface s) {
  // Welded bar grating. Alpha carries the aperture so the mesh reads as an
  // actual grating; the bearing bars stand proud of the cross rods, which is
  // what the normal map needs to show for it to look fabricated.
  vec3 g = barGrate(uv, vec2(10.0, 10.0), 0.30, 0.20);
  float coverage = g.x;
  float bars = g.y;
  float edge = g.z;

  // Which of the two members owns this texel, for direction-dependent wear.
  vec2 cellUv = fract(uv * 10.0);
  vec2 d = abs(cellUv - 0.5) * 2.0;
  float bearing = 1.0 - smoothstep(0.25, 0.30, d.x);
  float cross_ = (1.0 - smoothstep(0.16, 0.20, d.y)) * (1.0 - bearing);

  // Weld beads where the members meet.
  float weld = bearing * (1.0 - smoothstep(0.18, 0.30, d.y)) *
    (0.6 + 0.4 * grainNoise(uv, 180.0, 2));

  float mill = grainAniso(uv, vec2(6.0, 180.0), 3);
  float micro = grainNoise(uv, 240.0, 2);
  float tread = scratches(uv, vec2(detailCells(120.0), detailCells(26.0)), 5.0, 0.65);

  // Tops of the bearing bars get polished by boots; the undersides rust.
  float polish = sat(bearing * 0.9 + tread * 0.5) * smoothstep(0.35, 0.95, bars);
  float rustField = fbm2(warp2(uv * 7.0, vec2(7.0), 0.5, 3), vec2(7.0), 4) * 0.5 + 0.5;
  float shelter = sat(1.0 - bars) * 0.7 + cross_ * 0.4 + edge * 0.2;
  float rust = smoothstep(0.50, 0.76, rustField + shelter * 0.35) * (1.0 - polish * 0.85);
  float grime = smoothstep(0.42, 0.88, turbulence2(uv * 9.0 + 21.0, vec2(9.0), 4)) * (1.0 - polish);

  float height = 0.18
    + bars * 0.62
    + weld * 0.09
    + (mill - 0.5) * 0.03
    + (micro - 0.5) * 0.02
    - tread * 0.05
    + rust * 0.04;

  vec3 albedo = mix(STEEL_DARK, STEEL, bars * 0.7 + 0.3);
  albedo *= 0.93 + 0.12 * mill;
  albedo = mix(albedo, STEEL * 1.08, polish * 0.6);
  albedo = mix(albedo, RUST_MID, rust * 0.62);
  albedo = mix(albedo, RUST_DARK, rust * rust * 0.5);
  albedo = mix(albedo, GRIME, grime * 0.42);
  albedo = mix(albedo, STEEL_DARK * 0.9, weld * 0.35);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.44;
  rough -= polish * 0.24;
  rough += rust * 0.46;
  rough += grime * 0.20;
  rough += weld * 0.16;
  rough += (mill - 0.5) * 0.12;
  rough += (micro - 0.5) * 0.06;

  float metal = 1.0 - rust * 0.90 - grime * 0.30;

  float ao = 1.0 - (1.0 - bars) * 0.5 - cross_ * 0.12 - grime * 0.14 - rust * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = sat(metal);
  s.ao = ao;
  s.height = height;
  s.alpha = coverage;
}
`;

const STEEL_BRUSHED = /* glsl */ `
${STEEL_CONSTANTS}

void surface(vec2 uv, inout Surface s) {
  // Brushed stainless. Everything here is anisotropy: the abrasive leaves a
  // dense band of parallel scratches, so the roughness map has to be far
  // stretched along the brushing direction or the surface reads as plastic.
  float fine = grainAniso(uv, vec2(4.0, 256.0), 4);
  float mid = grainAniso(uv, vec2(3.0, 96.0), 3);
  float coarse = grainAniso(uv, vec2(2.0, 26.0), 3);
  float brushBands = fbmValue2(vec2(uv.x * 7.0, uv.y * 2.0), vec2(7.0, 2.0), 3);

  // A few deeper drag lines from grit caught under the belt.
  float drag = scratches(uv, vec2(detailCells(200.0), detailCells(4.0)), 8.0, 0.35);
  float nick = scratches(uv, vec2(detailCells(30.0), detailCells(30.0)), 4.0, 0.10);

  float micro = grainNoise(uv, 256.0, 2);
  float haze = fbm2(uv * 3.0 + 6.1, vec2(3.0), 3) * 0.5 + 0.5;

  // Handling: finger grease and a dust film that both kill the highlight.
  float smudge = smoothstep(0.48, 0.86, turbulence2(uv * 5.0 + 12.0, vec2(5.0), 4));
  float dust = smoothstep(0.55, 0.95, fbm2(uv * 8.0 - 3.0, vec2(8.0), 4) * 0.5 + 0.5) * 0.6;

  float height = 0.62
    + (fine - 0.5) * 0.30
    + (mid - 0.5) * 0.22
    + (coarse - 0.5) * 0.12
    + (brushBands - 0.5) * 0.06
    + (micro - 0.5) * 0.04
    - drag * 0.30
    - nick * 0.22;

  vec3 albedo = mix(STEEL_DARK, STEEL, 0.55 + 0.45 * brushBands);
  albedo *= 0.95 + 0.10 * mix(fine, mid, 0.5);
  albedo = tintShift(albedo, 0.005 + (haze - 0.5) * 0.01, 0.35, 1.0);
  albedo = mix(albedo, STEEL * 1.06, sat(drag + nick) * 0.4);
  albedo = mix(albedo, GRIME * 1.6, smudge * 0.14 + dust * 0.10);
  albedo *= 0.98 + 0.04 * micro;

  // Brushed, not polished: the floor has to stay well clear of a mirror or the
  // abrasive lines stop reading and the surface turns to chrome.
  float rough = 0.42;
  rough += (fine - 0.5) * 0.26;
  rough += (mid - 0.5) * 0.16;
  rough += (brushBands - 0.5) * 0.07;
  rough += smudge * 0.18;
  rough += dust * 0.22;
  rough += sat(drag + nick) * 0.16;
  rough += (micro - 0.5) * 0.05;

  float ao = 1.0 - drag * 0.20 - nick * 0.18 - dust * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 1.0 - smudge * 0.12 - dust * 0.18;
  s.ao = ao;
  s.height = height;
}
`;

const BARREL_RUSTY = /* glsl */ `
${STEEL_CONSTANTS}
const vec3 DRUM_BLUE = vec3(0.136, 0.180, 0.234);
const vec3 STENCIL = vec3(0.640, 0.596, 0.276);

void surface(vec2 uv, inout Surface s) {
  // 205 litre drum wrapped so u runs around the circumference: two rolling
  // hoops, a paint coat that has failed from the hoops outwards, and rust
  // running down between them. The lattice is 1x1 in u so the wrap is seamless.
  float hoopA = band(uv.y, 0.30, 0.055);
  float hoopB = band(uv.y, 0.70, 0.055);
  float hoop = sat(pow(max(hoopA, hoopB), 0.6));
  float hoopTop = smoothstep(0.45, 1.0, hoop);

  // Shallow swage rings between the hoops, plus a chime at each end.
  float swage = pow(abs(sin((uv.y - 0.5) * PI * 8.0)), 6.0) * 0.35;
  float chime = smoothstep(0.055, 0.015, min(uv.y, 1.0 - uv.y));

  float mill = grainAniso(uv, vec2(200.0, 6.0), 3);
  float micro = grainNoise(uv, 220.0, 2);
  float dent = fbm2(uv * vec2(6.0, 5.0) + 9.2, vec2(6.0, 5.0), 3);
  float bigDent = smoothstep(0.55, 0.95, fbm2(uv * 3.0 - 2.0, vec2(3.0), 3) * 0.5 + 0.5);

  // Paint failure: worst on the hoops and around the base. The hoop influence is
  // broken up by noise, otherwise the coat fails in perfect horizontal stripes.
  float hoopRagged = hoop * mix(0.45, 1.0, fbm2(uv * vec2(9.0, 4.0) + 31.0, vec2(9.0, 4.0), 3) * 0.5 + 0.5);
  float wear = sat(hoopRagged * 0.85 + chime * 0.6 + sat(1.0 - uv.y * 2.4) * 0.45 + bigDent * 0.3);
  float coatField = fbm2(warp2(uv * 5.5, vec2(5.5), 0.7, 4), vec2(5.5), 5) * 0.5 + 0.5;
  float coat = 1.0 - smoothstep(0.40, 0.60, coatField * 0.7 + wear * 0.55);
  float chipLip = band(coatField * 0.7 + wear * 0.55, 0.50, 0.05) * coat;

  vec3 scaleCells = worley2(uv * 16.0, vec2(16.0), 1.0);
  float flake = smoothstep(0.26, 0.06, scaleCells.y - scaleCells.x) * step(0.4, scaleCells.z);

  float rustField = fbm2(warp2(uv * 7.0, vec2(7.0), 0.6, 3), vec2(7.0), 5) * 0.5 + 0.5;
  float rust = smoothstep(0.34, 0.62, rustField * 0.6 + (1.0 - coat) * 0.7);
  float heavy = smoothstep(0.58, 0.86, rustField * 0.6 + (1.0 - coat) * 0.8);
  // Pitting must be sparse and unequal in size. Taking every Worley cell gives a
  // uniform dot grid that reads as a sponge, not as corrosion.
  vec3 pitA = worley2(uv * 34.0 + 7.7, vec2(34.0), 1.0);
  vec3 pitB = worley2(uv * 72.0 - 3.1, vec2(72.0), 1.0);
  float pitGateA = step(0.52, hash11(pitA.z + 0.17));
  float pitGateB = step(0.68, hash11(pitB.z + 0.53));
  float craterA = (1.0 - smoothstep(0.04, 0.10 + 0.22 * hash11(pitA.z + 4.3), pitA.x)) * pitGateA;
  float craterB = (1.0 - smoothstep(0.03, 0.24, pitB.x)) * pitGateB;
  float crater = sat(craterA + craterB * 0.55) * heavy;
  float streak = dripStreaks(uv, 26.0, 0.9, 17.0);

  // Faded hazard stencil across the belly, with gaps where words end.
  float bandMask = smoothBand(uv.y, 0.465, 0.545, 0.008);
  vec2 gp = vec2(uv.x * 22.0, (uv.y - 0.505) * 22.0);
  float gid = mod(floor(gp.x), 22.0);
  float glyph = stencilGlyph(vec2(fract(gp.x), gp.y + 0.5), gid, 0.26) *
    step(0.24, hash12(vec2(gid, 3.7)));
  float stencil = bandMask * glyph * coat * (0.30 + 0.55 * smoothstep(0.3, 0.7, coatField));

  float grit = grainNoise(uv, 170.0, 3);

  float height = 0.52
    + hoop * 0.26
    + swage * 0.08
    - chime * 0.14
    + coat * 0.05
    + chipLip * 0.05
    + rust * 0.05
    + flake * heavy * 0.10
    + (grit - 0.5) * 0.08 * rust
    + (mill - 0.5) * 0.02
    + (micro - 0.5) * 0.02
    + dent * 0.04
    - bigDent * 0.10
    - crater * 0.40;

  vec3 paint = mix(DRUM_BLUE, DRUM_BLUE * 1.34 + vec3(0.026), fbm2(uv * 4.0, vec2(4.0), 3) * 0.5 + 0.5);
  // Chalked by UV: the binder goes first, so the pigment lightens and desaturates.
  float chalk = smoothstep(0.35, 0.85, fbm2(uv * 2.5 + 17.0, vec2(2.5), 3) * 0.5 + 0.5);
  paint = mix(paint, mix(paint, vec3(luma(paint) * 1.5 + 0.05), 0.5), chalk * 0.55);
  vec3 albedo = mix(STEEL_DARK, paint, coat);
  albedo = mix(albedo, STENCIL, stencil * 0.8);
  albedo = mix(albedo, paint * 1.15, chipLip * 0.5);
  // Rust is a range of browns, not one orange. Only the freshest scale is bright,
  // and which patches are fresh drifts on a scale larger than the scale itself.
  float freshness = smoothstep(0.42, 0.78, fbm2(uv * 2.2 + 61.0, vec2(2.2), 4) * 0.5 + 0.5);
  vec3 rustTone = mix(RUST_DARK, RUST_MID, smoothstep(0.2, 0.8, rustField));
  albedo = mix(albedo, rustTone, rust * 0.78);
  albedo = mix(albedo, RUST_ORANGE, heavy * freshness * (0.22 + 0.34 * grit));
  albedo = mix(albedo, RUST_DARK * 0.82, crater * 0.8);
  albedo = mix(albedo, STEEL, sat(hoopTop * (1.0 - coat) - rust) * 0.5);
  albedo = mix(albedo, RUST_DARK * 0.85, streak * 0.55);
  albedo *= 0.92 + 0.14 * grit;
  albedo *= 0.97 + 0.06 * micro;

  float rough = mix(0.88, 0.56, coat);
  rough += rust * 0.30;
  rough += heavy * 0.10;
  rough += chalk * coat * 0.18;
  rough -= hoopTop * (1.0 - coat) * 0.16;
  rough += (grit - 0.5) * 0.10;
  rough -= streak * 0.05;

  float metal = (1.0 - coat * 0.96) * (1.0 - rust * 0.88) * (1.0 - heavy * 0.6);

  float ao = 1.0
    - crater * 0.5
    - chime * 0.25
    - (1.0 - coat) * 0.10
    - heavy * 0.12
    - streak * 0.08
    + hoop * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = sat(metal);
  s.ao = ao;
  s.height = height;
}
`;

const GUN_METAL = /* glsl */ `
// For a metal the albedo *is* F0, so a dark coating still has to keep a metallic
// reflectance or the receiver reads as black plastic. Phosphate darkens steel's
// 0.56 towards 0.22 linear; anything below that stops behaving like metal.
const vec3 PARKER = vec3(0.516, 0.520, 0.532);
const vec3 PARKER_WARM = vec3(0.548, 0.530, 0.512);
const vec3 BRIGHT = vec3(0.782, 0.790, 0.800);
const vec3 NITRIDE = vec3(0.428, 0.432, 0.444);

void surface(vec2 uv, inout Surface s) {
  // Phosphated receiver steel. This sits 30 cm from the camera for the whole
  // game, so the read comes from the *fine* bands: bead-blast texture under the
  // coating, machining witness marks, and the polished wear that appears
  // wherever a hand or a sling touches it.
  float blast = grainWorley(uv, 200.0, 1.0).x;
  float bead = 1.0 - smoothstep(0.05, 0.45, blast);
  float grain = grainNoise(uv, 256.0, 2);
  float cast_ = fbm2(uv * 12.0, vec2(12.0), 4) * 0.5 + 0.5;

  // Broaching/turning marks left from machining, still visible through phosphate.
  float turn = grainAniso(uv, vec2(2.0, 220.0), 3);
  float endMill = pow(abs(sin(uv.x * detailCells(60.0) * PI)), 3.0) * 0.5;

  // Handling wear: high spots come up bright, and the coating thins first.
  float wearField = fbm2(warp2(uv * 6.0, vec2(6.0), 0.4, 3), vec2(6.0), 5) * 0.5 + 0.5;
  float wear = smoothstep(0.50, 0.78, wearField + bead * 0.10);
  float polish = smoothstep(0.66, 0.90, wearField);
  float scuff = scratches(uv, vec2(detailCells(180.0), detailCells(40.0)), 7.0, 0.45);
  float nick = scratches(uv, vec2(detailCells(26.0), detailCells(26.0)), 3.5, 0.12);

  // Carbon fouling and a light oil film; oil is the only thing here that
  // genuinely lowers roughness across the board.
  float carbon = smoothstep(0.52, 0.92, turbulence2(uv * 7.0 + 19.0, vec2(7.0), 4));
  float oil = smoothstep(0.40, 0.80, fbm2(uv * 4.0 - 11.0, vec2(4.0), 4) * 0.5 + 0.5);

  float height = 0.66
    + bead * 0.10
    + (grain - 0.5) * 0.10
    + (turn - 0.5) * 0.08
    + (cast_ - 0.5) * 0.05
    + endMill * 0.03
    - scuff * 0.10
    - nick * 0.30
    - carbon * 0.02;

  vec3 albedo = mix(PARKER, PARKER_WARM, cast_);
  albedo = mix(albedo, NITRIDE, oil * 0.35);
  albedo *= 0.90 + 0.18 * mix(grain, bead, 0.5);
  albedo = mix(albedo, BRIGHT * 0.86, wear * 0.55);
  albedo = mix(albedo, BRIGHT, polish * 0.7);
  albedo = mix(albedo, BRIGHT * 1.02, sat(scuff * 0.8 + nick) * 0.55);
  albedo = mix(albedo, vec3(0.300, 0.290, 0.284), carbon * 0.45);
  albedo = tintShift(albedo, (cast_ - 0.5) * 0.02, 0.8, 1.0);

  float rough = 0.58;
  rough -= bead * 0.06;
  rough += (grain - 0.5) * 0.10;
  rough += (turn - 0.5) * 0.08;
  rough -= wear * 0.20;
  rough -= polish * 0.26;
  rough -= sat(scuff + nick) * 0.20;
  rough -= oil * 0.14;
  rough += carbon * 0.14;

  float ao = 1.0 - (1.0 - bead) * 0.05 - nick * 0.30 - carbon * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 1.0 - carbon * 0.20;
  s.ao = ao;
  s.height = height;
}
`;

export const METAL_SPECS: MaterialSpec[] = [
  {
    id: 'metal_panel',
    surface: 'metal',
    body: METAL_PANEL,
    res: 'high',
    relief: 0.012,
    reliefWide: 0.28,
    tileMeters: 2.4,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.0, envMapIntensity: 1.1, aoMapIntensity: 0.9 },
  },
  {
    id: 'metal_rusted',
    surface: 'metal',
    body: METAL_RUSTED,
    res: 'high',
    relief: 0.018,
    reliefWide: 0.26,
    tileMeters: 2.0,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.15, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'metal_corrugated',
    surface: 'metal',
    body: METAL_CORRUGATED,
    res: 'medium',
    relief: 0.075,
    reliefWide: 0.15,
    tileMeters: 2.4,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.0, envMapIntensity: 1.1, aoMapIntensity: 0.95 },
  },
  {
    id: 'metal_grate',
    surface: 'metal',
    body: METAL_GRATE,
    res: 'medium',
    relief: 0.030,
    reliefWide: 0.18,
    tileMeters: 1.2,
    material: {
      roughness: 1.0,
      metalness: 1.0,
      normalScale: 1.1,
      envMapIntensity: 1.1,
      aoMapIntensity: 1.0,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    },
  },
  {
    id: 'steel_brushed',
    surface: 'metal',
    body: STEEL_BRUSHED,
    res: 'medium',
    relief: 0.0025,
    reliefWide: 0.10,
    tileMeters: 1.0,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 0.6, envMapIntensity: 1.1, aoMapIntensity: 0.6 },
  },
  {
    id: 'barrel_rusty',
    surface: 'metal',
    body: BARREL_RUSTY,
    res: 'medium',
    relief: 0.020,
    reliefWide: 0.24,
    tileMeters: 1.8,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.1, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'gun_metal',
    surface: 'metal',
    body: GUN_METAL,
    res: 'hero',
    relief: 0.0035,
    reliefWide: 0.15,
    tileMeters: 0.35,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 0.85, envMapIntensity: 1.25, aoMapIntensity: 0.85 },
  },
];
