import type { MaterialSpec } from './types';

/**
 * Cementitious surfaces. All of them share the same three-band structure:
 * large tonal drift (damp patches, sun bleaching, repairs), mid-scale structure
 * (aggregate, form-board seams, trowel marks) and fine grain (sand matrix,
 * blowholes). What sells them as concrete rather than grey noise is that the
 * roughness map is driven by the *weathering*, not by the base material.
 */

const CONCRETE_WALL = /* glsl */ `
const vec3 CONCRETE_A = vec3(0.470, 0.462, 0.442);
const vec3 CONCRETE_B = vec3(0.405, 0.398, 0.392);
const vec3 CONCRETE_WARM = vec3(0.520, 0.482, 0.428);

void surface(vec2 uv, inout Surface s) {
  // Macro: cool/warm drift plus damp patches wicking up from the base.
  float macro = fbm2(uv * 3.0, vec2(3.0), 4) * 0.5 + 0.5;
  float rise = sat(1.0 - uv.y * 1.6);
  float damp = smoothstep(0.42, 0.88, fbm2(uv * 2.0 + 11.3, vec2(2.0), 3) * 0.5 + 0.5 + rise * 0.35);
  float bleach = patchiness(uv + 5.1, 4.0, 3);

  // Meso: sand matrix with occasional exposed aggregate where the skin spalled.
  vec3 aggregate = worley2(uv * 46.0, vec2(46.0), 0.95);
  float stone = 1.0 - smoothstep(0.04, 0.30, aggregate.x);
  float exposed = smoothstep(0.55, 0.80, fbm2(uv * 7.0 - 3.4, vec2(7.0), 3) * 0.5 + 0.5);
  float stoneFace = stone * exposed;

  // Lift lines left by the shuttering, with a slight sag between boards.
  float boardV = abs(fract(uv.y * 4.0 + 0.13) - 0.5) * 2.0;
  float seam = 1.0 - smoothstep(0.0, 0.10, boardV);
  float boardBow = cos(fract(uv.y * 4.0 + 0.13) * TAU) * 0.5 + 0.5;

  // Trapped air voids and pinholes.
  vec3 voids = worley2(uv * 96.0 + 3.7, vec2(96.0), 1.0);
  float blowhole = (1.0 - smoothstep(0.0, 0.20, voids.x)) * step(0.845, voids.z);

  // Fine grain across two more octaves so the surface never looks like plastic.
  float grain = fbmValue2(uv * 220.0, vec2(220.0), 3);
  float micro = fbmValue2(uv * 640.0, vec2(640.0), 2);

  // Hairline cracks following a warped ridged field.
  vec2 crackUv = warp2(uv * 5.0, vec2(5.0), 0.45, 3);
  float crack = smoothstep(0.885, 0.985, ridged2(crackUv, vec2(5.0), 5, 0.55, 3.0));
  float crackWide = smoothstep(0.80, 0.94, ridged2(crackUv, vec2(5.0), 4, 0.5, 2.0));

  float streak = dripStreaks(uv, 22.0, 0.55, 3.0) * 0.7;

  float height = 0.60
    + (macro - 0.5) * 0.10
    + (grain - 0.5) * 0.13
    + (micro - 0.5) * 0.05
    + stoneFace * 0.10
    + boardBow * 0.020
    - exposed * 0.05
    - seam * 0.10
    - blowhole * 0.50
    - crack * 0.40
    - crackWide * 0.06;

  vec3 albedo = mix(CONCRETE_B, CONCRETE_A, macro);
  albedo = mix(albedo, CONCRETE_WARM, bleach * 0.45);
  albedo = tintShift(albedo, (macro - 0.5) * 0.035, 0.85 + bleach * 0.5, 1.0);
  albedo *= 0.92 + 0.16 * grain;
  albedo = mix(albedo, albedo * 0.72 * vec3(0.94, 0.96, 1.02), damp * 0.65);
  albedo = mix(albedo, vec3(0.560, 0.540, 0.505), stoneFace * 0.55);
  albedo = mix(albedo, vec3(0.300, 0.288, 0.272), crack * 0.85);
  albedo = mix(albedo, vec3(0.255, 0.238, 0.214), streak * 0.55);
  albedo *= 1.0 - blowhole * 0.35;
  albedo *= 0.97 + 0.06 * micro;

  // Roughness carries the story: damp is smoother, chalky bleach is rougher,
  // exposed aggregate is polished stone, cracks trap dust.
  float rough = 0.90;
  rough -= damp * 0.26;
  rough += bleach * 0.05;
  rough -= stoneFace * 0.22;
  rough += crack * 0.06;
  rough += streak * 0.04;
  rough += (grain - 0.5) * 0.10;
  rough -= seam * 0.04;

  float ao = 1.0
    - blowhole * 0.65
    - crack * 0.45
    - seam * 0.22
    - (1.0 - exposed) * 0.05
    - streak * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const CONCRETE_FLOOR = /* glsl */ `
const vec3 SLAB_A = vec3(0.430, 0.428, 0.420);
const vec3 SLAB_B = vec3(0.352, 0.350, 0.348);

void surface(vec2 uv, inout Surface s) {
  // Poured slab: control joints on a coarse grid, power-float swirl marks,
  // scuffed traffic lanes and ground-in dirt.
  Cell joint = gridCell(uv, vec2(2.0, 2.0), 0.012);
  float jointMask = 1.0 - joint.face;

  float macro = fbm2(uv * 3.0, vec2(3.0), 4) * 0.5 + 0.5;
  float trowel = ridged2(slant(uv, vec2(9.0), 2.0), vec2(9.0), 3, 0.5, 1.6);
  float swirl = fbm2(slant(uv, vec2(14.0), -1.0) + trowel * 1.4, vec2(14.0), 3) * 0.5 + 0.5;

  vec3 aggregate = worley2(uv * 52.0, vec2(52.0), 0.95);
  float stone = 1.0 - smoothstep(0.05, 0.28, aggregate.x);
  float polish = smoothstep(0.35, 0.75, fbm2(uv * 4.0 - 7.2, vec2(4.0), 3) * 0.5 + 0.5);

  float grain = fbmValue2(uv * 200.0, vec2(200.0), 3);
  float micro = fbmValue2(uv * 620.0, vec2(620.0), 2);

  vec3 pits = worley2(uv * 110.0 + 9.1, vec2(110.0), 1.0);
  float pit = (1.0 - smoothstep(0.0, 0.19, pits.x)) * step(0.87, pits.z);

  vec2 crackUv = warp2(uv * 4.0, vec2(4.0), 0.5, 3);
  float crack = smoothstep(0.90, 0.99, ridged2(crackUv, vec2(4.0), 5, 0.55, 3.0));

  // Traffic grime settles in a broad band and darkens the joints.
  float grime = sat(fbm2(uv * 2.0 + 21.0, vec2(2.0), 3) * 0.5 + 0.5) * 0.8 + jointMask * 0.5;

  float height = 0.66
    + (macro - 0.5) * 0.06
    + (grain - 0.5) * 0.08
    + (micro - 0.5) * 0.04
    + stone * polish * 0.05
    + (swirl - 0.5) * 0.03
    - pit * 0.45
    - crack * 0.35
    - jointMask * 0.55;

  vec3 albedo = mix(SLAB_B, SLAB_A, macro);
  albedo = tintShift(albedo, (swirl - 0.5) * 0.02, 0.9, 1.0);
  albedo *= 0.93 + 0.14 * grain;
  albedo = mix(albedo, vec3(0.470, 0.462, 0.450), stone * polish * 0.4);
  albedo = mix(albedo, vec3(0.212, 0.205, 0.196), grime * 0.42);
  albedo = mix(albedo, vec3(0.245, 0.240, 0.235), crack * 0.8);
  albedo = mix(albedo, vec3(0.268, 0.264, 0.258), jointMask * 0.75);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.86;
  rough -= polish * 0.30;
  rough -= stone * polish * 0.10;
  rough += grime * 0.10;
  rough += jointMask * 0.06;
  rough += (grain - 0.5) * 0.09;
  rough -= pit * 0.05;

  float ao = 1.0 - jointMask * 0.55 - pit * 0.6 - crack * 0.4 - grime * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const CONCRETE_DAMAGED = /* glsl */ `
const vec3 SHELL = vec3(0.452, 0.444, 0.428);
const vec3 CORE = vec3(0.512, 0.478, 0.430);

void surface(vec2 uv, inout Surface s) {
  // Battle-damaged concrete: spalled craters exposing the aggregate core, bent
  // rebar shadows, soot and dust. The spall mask drives everything else.
  vec2 spallUv = warp2(uv * 3.0, vec2(3.0), 0.6, 4);
  float spallField = fbm2(spallUv, vec2(3.0), 4) * 0.5 + 0.5;
  float spall = smoothstep(0.50, 0.72, spallField);
  float spallDeep = smoothstep(0.62, 0.86, spallField);

  vec3 shatter = worley2(uv * 18.0, vec2(18.0), 1.0);
  float shard = 1.0 - smoothstep(0.02, 0.24, shatter.y - shatter.x);

  vec3 aggregate = worley2(uv * 40.0, vec2(40.0), 0.95);
  float stone = 1.0 - smoothstep(0.05, 0.32, aggregate.x);
  float stoneBig = 1.0 - smoothstep(0.08, 0.40, worley2(uv * 20.0 + 4.4, vec2(20.0), 0.9).x);

  // Exposed reinforcement: thin rusted bars on a wide grid inside deep spalls.
  float barU = 1.0 - smoothstep(0.02, 0.045, abs(fract(uv.x * 6.0) - 0.5));
  float barV = 1.0 - smoothstep(0.02, 0.045, abs(fract(uv.y * 6.0 + 0.5) - 0.5));
  float rebar = max(barU, barV) * spallDeep;

  float grain = fbmValue2(uv * 190.0, vec2(190.0), 3);
  float micro = fbmValue2(uv * 560.0, vec2(560.0), 2);

  vec2 crackUv = warp2(uv * 6.0, vec2(6.0), 0.5, 3);
  float crack = smoothstep(0.82, 0.97, ridged2(crackUv, vec2(6.0), 5, 0.55, 2.6));
  crack = max(crack, smoothstep(0.30, 0.02, shatter.y - shatter.x) * spall * 0.7);

  float soot = smoothstep(0.42, 0.86, turbulence2(uv * 4.0 + 17.0, vec2(4.0), 4)) * 0.9;
  float dust = cavityDirt(1.0 - spall, grain, 0.8);
  float streak = dripStreaks(uv, 18.0, 0.6, 8.0);

  float height = 0.70
    + (grain - 0.5) * 0.10
    + (micro - 0.5) * 0.04
    - spall * 0.30
    - spallDeep * 0.22
    + stone * spall * 0.16
    + stoneBig * spall * 0.10
    + rebar * 0.30
    - crack * 0.40
    - shard * spall * 0.08;

  vec3 albedo = mix(SHELL, CORE, spall * 0.8);
  albedo = tintShift(albedo, (grain - 0.5) * 0.03, 0.9, 1.0);
  albedo *= 0.92 + 0.15 * grain;
  albedo = mix(albedo, vec3(0.585, 0.560, 0.520), stone * spall * 0.55);
  albedo = mix(albedo, vec3(0.400, 0.196, 0.098), rebar * 0.85);
  albedo = mix(albedo, vec3(0.252, 0.240, 0.226), crack * 0.85);
  albedo = mix(albedo, vec3(0.128, 0.120, 0.114), soot * 0.55);
  albedo = mix(albedo, vec3(0.560, 0.540, 0.500), dust * 0.30);
  albedo = mix(albedo, vec3(0.240, 0.218, 0.196), streak * 0.45);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.92;
  rough += spall * 0.04;
  rough -= stone * spall * 0.20;
  rough += soot * 0.03;
  rough -= streak * 0.10;
  rough += (grain - 0.5) * 0.10;

  float ao = 1.0
    - spall * 0.30
    - spallDeep * 0.25
    - crack * 0.45
    - soot * 0.10
    + rebar * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = rebar * 0.12;
  s.ao = ao;
  s.height = height;
}
`;

const PLASTER_WHITE = /* glsl */ `
const vec3 LIME = vec3(0.798, 0.786, 0.752);
const vec3 SHADE = vec3(0.618, 0.610, 0.592);
const vec3 REPAIR = vec3(0.700, 0.702, 0.706);

void surface(vec2 uv, inout Surface s) {
  // Hand-floated lime plaster: broad trowel sweeps, a fine sand skim, hairline
  // crazing and the grey wash that collects under every ledge. A patch repair in
  // a colder batch keeps the wall from reading as one flat coat of paint.
  float sweepA = fbm2(slant(uv, vec2(5.0, 2.0), 1.0) + 3.1, vec2(5.0, 2.0), 4) * 0.5 + 0.5;
  float sweepB = fbm2(slant(uv, vec2(3.0, 6.0), -1.0) - 8.2, vec2(3.0, 6.0), 3) * 0.5 + 0.5;
  float trowel = mix(sweepA, sweepB, 0.45);

  float ridgeUv = ridged2(slant(uv, vec2(24.0, 4.0), 1.0), vec2(24.0, 4.0), 3, 0.5, 1.8);
  float skim = grainNoise(uv, 140.0, 3);
  float micro = grainNoise(uv, 320.0, 2);

  vec2 crazeUv = warp2(uv * 9.0, vec2(9.0), 0.35, 3);
  float crazeField = ridged2(crazeUv, vec2(9.0), 5, 0.6, 3.4);
  float craze = smoothstep(0.80, 0.97, crazeField);
  float crazeWide = smoothstep(0.62, 0.92, crazeField) * 0.4;

  vec3 pinholes = grainWorley(uv + 5.5, 100.0, 1.0);
  float pin = (1.0 - smoothstep(0.0, 0.22, pinholes.x)) * step(0.84, pinholes.z);

  // Float-and-fill repair: a soft blob of newer, slightly greyer render.
  float repair = smoothstep(0.54, 0.70, fbm2(warp2(uv * 2.0 - 6.4, vec2(2.0), 0.5, 3), vec2(2.0), 4) * 0.5 + 0.5);

  float wash = sat(1.0 - uv.y * 2.1) * (fbm2(uv * 3.0 + 13.0, vec2(3.0), 3) * 0.5 + 0.5);
  float streak = dripStreaks(uv, 26.0, 0.48, 5.0) * 0.55;
  float bleach = patchiness(uv - 2.2, 3.0, 3);

  float height = 0.66
    + (trowel - 0.5) * 0.24
    + (ridgeUv - 0.5) * 0.06
    + (skim - 0.5) * 0.09
    + (micro - 0.5) * 0.04
    + repair * 0.05
    - craze * 0.30
    - crazeWide * 0.06
    - pin * 0.45;

  vec3 albedo = mix(SHADE, LIME, trowel);
  albedo = tintShift(albedo, (trowel - 0.5) * 0.03 + 0.005, 0.7 + bleach * 0.6, 1.0);
  albedo = mix(albedo, REPAIR, repair * 0.55);
  albedo *= 0.93 + 0.14 * skim;
  albedo = mix(albedo, vec3(0.470, 0.468, 0.462), wash * 0.55);
  albedo = mix(albedo, vec3(0.412, 0.400, 0.382), streak * 0.55);
  albedo = mix(albedo, vec3(0.532, 0.524, 0.512), craze * 0.7);
  albedo *= 1.0 - pin * 0.30;
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.84;
  rough += bleach * 0.06;
  rough -= trowel * 0.10;
  rough += wash * 0.05;
  rough += streak * 0.03;
  rough += repair * 0.07;
  rough += (skim - 0.5) * 0.10;

  float ao = 1.0 - craze * 0.35 - crazeWide * 0.10 - pin * 0.55 - wash * 0.10
    - (1.0 - trowel) * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const PLASTER_PEELING = /* glsl */ `
const vec3 PAINT = vec3(0.735, 0.715, 0.660);
const vec3 SUBSTRATE = vec3(0.455, 0.418, 0.372);
const vec3 BRICKISH = vec3(0.402, 0.246, 0.196);

void surface(vec2 uv, inout Surface s) {
  // Blown render: sheets of paint and plaster have let go, leaving a stepped
  // edge with a lip that catches light and a dark line of shadow beneath it.
  vec2 flakeUv = warp2(uv * 4.0, vec2(4.0), 0.7, 4);
  float flakeField = fbm2(flakeUv, vec2(4.0), 5) * 0.5 + 0.5;
  float intact = smoothstep(0.42, 0.52, flakeField);
  float lip = band(flakeField, 0.47, 0.045) * intact;
  float deep = 1.0 - smoothstep(0.24, 0.40, flakeField);

  vec3 cells = worley2(uv * 12.0, vec2(12.0), 1.0);
  float flakeEdge = 1.0 - smoothstep(0.0, 0.10, cells.y - cells.x);

  float skim = fbmValue2(uv * 170.0, vec2(170.0), 3);
  float micro = fbmValue2(uv * 540.0, vec2(540.0), 2);
  float trowel = fbm2(uv * vec2(6.0, 3.0), vec2(6.0, 3.0), 3) * 0.5 + 0.5;

  float sand = fbmValue2(uv * 90.0 + 4.0, vec2(90.0), 3);
  float wash = sat(1.0 - uv.y * 1.9) * (fbm2(uv * 3.0 + 13.0, vec2(3.0), 3) * 0.5 + 0.5);
  float streak = dripStreaks(uv, 20.0, 0.62, 12.0);
  float mould = smoothstep(0.58, 0.9, turbulence2(uv * 7.0 - 5.0, vec2(7.0), 4)) * (0.35 + wash);

  float height = 0.42
    + intact * 0.34
    + lip * 0.10
    + (trowel - 0.5) * 0.06 * intact
    + (skim - 0.5) * 0.05
    + (sand - 0.5) * 0.09 * (1.0 - intact)
    + (micro - 0.5) * 0.03
    - deep * 0.14
    - flakeEdge * 0.05 * intact;

  vec3 albedo = mix(SUBSTRATE, PAINT, intact);
  albedo = mix(albedo, BRICKISH, deep * 0.55);
  albedo = tintShift(albedo, (flakeField - 0.5) * 0.02, 0.85, 1.0);
  albedo *= 0.93 + 0.14 * mix(sand, skim, intact);
  albedo = mix(albedo, vec3(0.500, 0.492, 0.478), wash * 0.4 * intact);
  albedo = mix(albedo, vec3(0.212, 0.202, 0.176), streak * 0.55);
  albedo = mix(albedo, vec3(0.150, 0.168, 0.128), mould * 0.35);
  albedo = mix(albedo, PAINT * 1.06, lip * 0.5);
  albedo *= 0.98 + 0.04 * micro;

  float rough = mix(0.94, 0.72, intact);
  rough += mould * 0.05;
  rough += wash * 0.04;
  rough -= streak * 0.08;
  rough += (sand - 0.5) * 0.10 * (1.0 - intact);

  float ao = 1.0
    - (1.0 - intact) * 0.22
    - deep * 0.28
    - flakeEdge * 0.18
    - mould * 0.12
    - streak * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const STUCCO_SAND = /* glsl */ `
const vec3 SAND_LIGHT = vec3(0.660, 0.588, 0.472);
const vec3 SAND_DARK = vec3(0.548, 0.482, 0.386);

void surface(vec2 uv, inout Surface s) {
  // Sand-float render: a dense field of graded grit thrown onto the wall, with
  // dust caught in every hollow and a warm sun-bleached upper band.
  vec3 gritA = worley2(uv * 70.0, vec2(70.0), 1.0);
  vec3 gritB = worley2(uv * 140.0 + 3.0, vec2(140.0), 1.0);
  vec3 gritC = worley2(uv * 280.0 + 8.0, vec2(280.0), 1.0);
  float coarse = 1.0 - smoothstep(0.05, 0.42, gritA.x);
  float mid = 1.0 - smoothstep(0.05, 0.40, gritB.x);
  float fine = 1.0 - smoothstep(0.05, 0.44, gritC.x);

  float macro = fbm2(uv * 3.0, vec2(3.0), 4) * 0.5 + 0.5;
  float float_ = fbm2(uv * vec2(8.0, 4.0) + 7.0, vec2(8.0, 4.0), 3) * 0.5 + 0.5;
  float micro = fbmValue2(uv * 480.0, vec2(480.0), 2);

  float bleach = smoothstep(0.25, 0.95, uv.y) * patchiness(uv + 9.0, 3.0, 3);
  float dust = cavityDirt(coarse * 0.6 + mid * 0.4, micro, 0.9);
  float streak = dripStreaks(uv, 24.0, 0.5, 21.0) * 0.5;

  vec2 crackUv = warp2(uv * 7.0, vec2(7.0), 0.4, 3);
  float crack = smoothstep(0.90, 0.995, ridged2(crackUv, vec2(7.0), 4, 0.55, 3.0));

  float height = 0.46
    + coarse * 0.26
    + mid * 0.16
    + fine * 0.09
    + (macro - 0.5) * 0.08
    + (float_ - 0.5) * 0.05
    + (micro - 0.5) * 0.04
    - crack * 0.30;

  vec3 albedo = mix(SAND_DARK, SAND_LIGHT, macro * 0.6 + coarse * 0.4);
  albedo = tintShift(albedo, (macro - 0.5) * 0.03, 0.9 - bleach * 0.25, 1.0 + bleach * 0.06);
  albedo *= 0.90 + 0.18 * (coarse * 0.5 + mid * 0.3 + fine * 0.2);
  albedo = mix(albedo, vec3(0.700, 0.652, 0.560), dust * 0.35);
  albedo = mix(albedo, vec3(0.322, 0.286, 0.238), streak * 0.5);
  albedo = mix(albedo, vec3(0.400, 0.360, 0.310), crack * 0.7);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.93;
  rough -= coarse * 0.08;
  rough += dust * 0.04;
  rough -= streak * 0.06;
  rough += (micro - 0.5) * 0.06;

  float ao = 1.0 - (1.0 - coarse) * 0.16 - dust * 0.16 - crack * 0.4;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

export const CONCRETE_SPECS: MaterialSpec[] = [
  {
    id: 'concrete_wall',
    surface: 'concrete',
    body: CONCRETE_WALL,
    res: 'hero',
    relief: 0.010,
    reliefWide: 0.30,
    tileMeters: 2.2,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.0, envMapIntensity: 1.0, aoMapIntensity: 0.9 },
  },
  {
    id: 'concrete_floor',
    surface: 'concrete',
    body: CONCRETE_FLOOR,
    res: 'high',
    relief: 0.009,
    reliefWide: 0.35,
    tileMeters: 2.4,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 0.9, envMapIntensity: 1.0, aoMapIntensity: 0.9 },
  },
  {
    id: 'concrete_damaged',
    surface: 'concrete',
    body: CONCRETE_DAMAGED,
    res: 'high',
    relief: 0.020,
    reliefWide: 0.30,
    tileMeters: 2.2,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.15, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'plaster_white',
    surface: 'plaster',
    body: PLASTER_WHITE,
    res: 'high',
    relief: 0.007,
    reliefWide: 0.45,
    tileMeters: 2.4,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 0.8, envMapIntensity: 1.0, aoMapIntensity: 0.8 },
  },
  {
    id: 'plaster_peeling',
    surface: 'plaster',
    body: PLASTER_PEELING,
    res: 'medium',
    relief: 0.016,
    reliefWide: 0.30,
    tileMeters: 2.0,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.1, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'stucco_sand',
    surface: 'plaster',
    body: STUCCO_SAND,
    res: 'high',
    relief: 0.013,
    reliefWide: 0.22,
    tileMeters: 2.0,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.05, envMapIntensity: 1.0, aoMapIntensity: 0.95 },
  },
];
