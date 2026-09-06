import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { hash2 } from '../core/seed';
import { clamp } from '../core/noise';
import { PORT_ISLAND, Zone, type Vec2, type WorldMap } from './map';
import { GLSL_LIGHT_POOLS, chainCross, chainFrame, frameAt, roadEdgeY, rowPositions, type Block, type RoadChain, type RoadCorner, type RoadGraph, type RoadLightUniforms, type RoadNode, type RoadRay } from './roads';
import { balanceGroundIbl } from './terrain';
import { THIN_VERTEX_MAIN, THIN_VERTEX_PARS, cellKey } from './batching';
import { LAYER_CAMERA, layerMask, maskCasts, type ViewCull } from './culling';

/**
 * Street-level detail over the road graph: raised sidewalks with curb and gutter along every developed block
 * face (mesh strips following the pavement edge, curb returns and dished ramps at the corners), a promenade with
 * a parapet along the downtown bayfront, the street furniture (traffic signals with timed aspects, stop signs,
 * benches, bins, hydrants, bus shelters, bollards) baked into one static mesh per CELL-metre cell, the street lamp
 * plan the props system instances (kind, footing and arm direction of every lamp) and the ground irradiance map
 * of those lamps the road and sidewalk materials read at night.
 */

/** `mast`: a 30 m high-mast tower with a crown of luminaires (port yards, interchanges) */
export type LampKind = 'arterial' | 'street' | 'ped' | 'highway' | 'mast';
/** one planned lamp: footing (on the curb line), arm yaw (the +x of the unit lamp points along (cos yaw, 0, -sin yaw)) */
export interface LampPlan { x: number; y: number; z: number; yaw: number; kind: LampKind }

const CELL = 500;
/** sidewalks, signals and shelters are drawn within this range (from 200 m up a 3.6 m walk is two pixels at 1.2 km) */
const FAR = 1200;
/** signals and shelters switch to their far shapes (no base, cap, bracket, seat or end glass; square lenses) beyond
 *  this, per cell, and only the near shapes cast */
const LARGE_NEAR = 300;
/** benches, bins, hydrants, bollards, cabinets, stop signs, visors, pedestrian heads: under a pixel beyond this —
 *  measured in three dimensions, so from the air the small kit goes as soon as it would from the street */
const SMALL_FAR = 300;
/** sidewalks switch to their four-triangle-a-row far index beyond this (a curb face is a quarter pixel there) */
const WALK_NEAR = 400;
/** the large furniture (poles, mast arms, shelters, benches) casts shadows, into the fine cascades only, within this
 *  range: a shelter roof is a pixel or two of shadow at 300 m and a mast arm nothing at all */
const SHADOW_FAR = 300;
const CURB_H = 0.15;
const CURB_TOP = 0.3;
/** clearance of the slab over the terrain (the terrain is bilinear on a ~10 m grid: it can bulge between rows) */
const SLAB_CLEAR = 0.1;
/** lamp irradiance map texel (m) */
const LAMP_TEXEL = 2.5;
const LAMP_MAP_MAX = 4096;
/** signal cycle (s): green, amber, all-red per direction */
const SIGNAL_GREEN = 24, SIGNAL_AMBER = 4, SIGNAL_RED = 2;
const SIGNAL_HALF = SIGNAL_GREEN + SIGNAL_AMBER + SIGNAL_RED;

/** sidewalk kinds carried in `aSw.z` */
const K_WALK = 0, K_PROMENADE = 1, K_APRON = 3, K_PARAPET = 4, K_LOT = 5, K_PLAZA = 6, K_YARD = 7;
/** parked cars, planters and benches of the plazas, lots and parking lanes are drawn within this range; beyond
 *  YARD_NEAR (measured in three dimensions, so from 200 m up nothing is near) a car is its one-box far shape and a
 *  planter its shrub, at half the triangles: a car is 10 x 4 px at 280 m from the air, 19 px long at 160 m from eye
 *  level, and the cabin box tells nothing at that size */
const YARD_FAR = 650;
const YARD_NEAR = 160;
/** paving sits this far over the ground (the terrain mesh is coarser than heightAt at distance) */
const PAVE_CLEAR = 0.08;

// ------------------------------------------------------------------ materials

const SW_PARS = /* glsl */ `
varying vec4 vSw;      // across from the curb face (m), along (m), kind, ramp + 10 * slab width
varying vec3 vSwNrm;
varying vec3 vWorldPosS;
${GLSL_NOISE}
${GLSL_LIGHT_POOLS}
float swLine(float d, float h, float fw) { return clamp((min(h, d + 0.5 * fw) - max(-h, d - 0.5 * fw)) / fw, 0.0, 1.0); }
`;
const SW_MAIN = /* glsl */ `
{
  float across = vSw.x, along = vSw.y, kind = vSw.z;
  // w = 10 * slab width (integer) + ramp (0..0.98): decoded tolerant of interpolation rounding (35.99999 is 36 + 0)
  float wInt = floor(vSw.w + 0.005);
  float ramp = max(vSw.w - wInt, 0.0), slabW = wInt * 0.1;
  vec2 wp = vWorldPosS.xz;
  float fp = max(length(fwidth(wp)), 1e-4);
  float fwA = max(fwidth(across), 1e-4), fwL = max(fwidth(along), 1e-4);
  float n = fbm3(wp * 0.21);
  float grain = mix(vnoise(wp * 3.1), 0.5, smoothstep(0.1, 0.4, fp));
  vec3 conc = mix(vec3(0.32, 0.31, 0.29), vec3(0.42, 0.41, 0.38), n) * (0.94 + 0.12 * grain);
  bool face = vSwNrm.y < 0.5;
  float fade = 1.0 - smoothstep(0.15, 0.5, fp); // fine detail vanishes from altitude
  float slabFade = 1.0 - smoothstep(0.3, 1.0, fp); // per-slab tones (1.5 m) average out before they can sparkle
  float slabId = floor(along / 1.5);
  float tone = 1.0 + (0.14 * hash12(vec2(slabId, floor(across / 1.5) + kind * 7.0)) - 0.07) * slabFade;
  vec3 col = conc * tone;
  float joint = max(swLine((fract(along / 1.5) - 0.5) * 1.5, 0.012, fwL), swLine(across - ${CURB_TOP.toFixed(2)}, 0.012, fwA)) * fade;
  if (kind > 0.5 && kind < 1.5) {
    // promenade: warm sand-coloured pavers on a 0.6 m grid, a darker band every fifth course
    vec3 pav = mix(vec3(0.58, 0.53, 0.45), vec3(0.68, 0.63, 0.54), n) * (0.94 + 0.12 * grain);
    float pid = hash12(floor(vec2(along, across) / 0.6));
    pav *= 1.0 + (0.16 * pid - 0.08) * slabFade;
    float band = step(fract(across / 3.0), 0.2);
    pav = mix(pav, vec3(0.42, 0.40, 0.38), band * 0.6);
    joint = max(swLine((fract(along / 0.6) - 0.5) * 0.6, 0.01, fwL), swLine((fract(across / 0.6) - 0.5) * 0.6, 0.01, fwA)) * fade;
    col = pav;
  } else if (kind > 2.5 && kind < 3.5) {
    // apron: packed earth and worn grass between the slab and the lots
    col = mix(vec3(0.30, 0.29, 0.22), vec3(0.34, 0.40, 0.20), smoothstep(0.35, 0.65, fbm3(wp * 0.6 + 3.0))) * (0.9 + 0.2 * grain);
    joint = 0.0;
  } else if (kind > 4.5 && kind < 5.5) {
    // surface parking lot (across = bay direction u, along = row direction v from the lot corner): aged asphalt with
    // 2.6 m bay lines in double rows of 5 m bays either side of a 6.5 m aisle (16.5 m period), the bays a shade
    // darker than the driven aisles, oil drips at the bay heads; the lines are box-filtered so from the air the lot
    // keeps a faint even stripe instead of sparkling
    vec3 asph = mix(vec3(0.11, 0.11, 0.115), vec3(0.17, 0.168, 0.165), n) * (0.92 + 0.16 * grain);
    asph *= 0.88 + 0.24 * fbm3(wp * 0.02 + 4.0);
    float vv = mod(along, 16.5);
    float inBay = step(vv, 5.0) + step(11.5, vv);
    float bayLine = swLine((fract(across / 2.6) - 0.5) * 2.6, 0.06, fwA) * inBay;
    float rowLine = max(swLine(vv - 5.0, 0.06, fwL), swLine(vv - 11.5, 0.06, fwL));
    float paint = max(bayLine, rowLine) * (0.55 + 0.45 * smoothstep(0.3, 0.7, fbm3(wp * 0.4 + 6.0)));
    float drip = smoothstep(0.5, 0.8, vnoise(wp * 0.9)) * inBay * (step(vv, 1.6) + step(14.9, vv)) * (1.0 - smoothstep(0.3, 1.0, fp));
    col = mix(asph * (1.0 - 0.07 * inBay - 0.35 * drip), vec3(0.8, 0.8, 0.78), paint * 0.85);
    joint = 0.0;
  } else if (kind > 6.5) {
    // container terminal hardstand (across, along = the port island's u + HW, v + HH): aged asphalt-concrete 0.17-0.25
    // (0.36-0.46 rendered near-white under the sun exposure, lighter than the ground it covers) in 7.5 m slabs a tone
    // apart with 30 m staining blotches and darker wear fields, the yard slot grid of the north yard blocks (yellow lines at the
    // stacks' 12.6 x 5.25 m pitch, in 9 columns of 175 m from u = -HW + 90 and 4 rows of 58 m from v = -HH + 70),
    // oil stains under the bays, and on the truck lanes (two 7 m lanes about v = 92, an aisle 16 m before every block
    // row) polished wheel tracks, drips and a lane-wide darkening; the lines are box-filtered so from the air the
    // slots read as a faint tone over the block instead of sparkling
    float u = across - ${PORT_ISLAND.hw.toFixed(1)}, v = along - ${PORT_ISLAND.hh.toFixed(1)};
    vec3 slab = mix(vec3(0.17, 0.17, 0.165), vec3(0.25, 0.245, 0.235), n) * (0.94 + 0.12 * grain);
    slab *= 0.85 + 0.3 * fbm3(wp * 0.03 + 5.0);
    slab *= 1.0 - 0.2 * smoothstep(0.5, 0.75, fbm3(wp * 0.08 + 12.0));
    slab *= 1.0 + (0.12 * hash12(floor(vec2(u, v) / 7.5) + 11.0) - 0.06);
    float slabJ = max(swLine((fract(u / 7.5) - 0.5) * 7.5, 0.02, fwA), swLine((fract(v / 7.5) - 0.5) * 7.5, 0.02, fwL)) * (1.0 - smoothstep(0.15, 0.5, fp));
    float bu = u + ${(PORT_ISLAND.hw - 90).toFixed(1)}, bv = v + ${(PORT_ISLAND.hh - 70).toFixed(1)};
    float cu = floor(bu / 175.0), cv = floor(bv / 58.0);
    float lu = bu - cu * 175.0 + 6.3, lv = bv - cv * 58.0 + 2.625; // from the block's first slot line
    float inBlock = step(0.0, lu) * step(lu, 126.0) * step(0.0, lv) * step(lv, 31.5) * step(-0.5, cu) * step(cu, 8.5) * step(-0.5, cv) * step(cv, 3.5);
    float slot = max(swLine((fract(lu / 12.6) - 0.5) * 12.6, 0.06, fwA), swLine((fract(lv / 5.25) - 0.5) * 5.25, 0.06, fwL)) * inBlock;
    vec2 bayC = (fract(vec2(lu / 12.6, lv / 5.25)) - 0.5) * vec2(12.6, 5.25) / vec2(5.0, 1.9);
    float stain = (1.0 - smoothstep(0.5, 1.0, length(bayC))) * step(0.4, hash12(floor(vec2(lu / 12.6, lv / 5.25)) + cu * 7.0 + cv * 3.0)) * inBlock * (0.5 + 0.7 * fbm3(wp * 0.3 + 9.0));
    // lanes: distance to the nearest lane centre (main lane 88.5 / 95.5; aisle lanes at the aisle centre +- 3.5)
    float aisle = step(-262.0, v) * step(v, -50.0);
    float dA = abs(mod(v + 275.0, 58.0) - 29.0); // to the nearest aisle centre v = -246 + 58 k
    float dLane = min(abs(abs(v - 92.0) - 3.5), abs(dA - 3.5) + 1e3 * (1.0 - aisle));
    float laneBand = max(1.0 - smoothstep(6.0, 8.5, abs(v - 92.0)), aisle * (1.0 - smoothstep(6.0, 8.5, dA)));
    float track = exp(-pow(abs(dLane - 0.9) * 3.0, 2.0)) * (0.5 + 0.5 * fbm3(wp * 0.15 + 2.0)) * (1.0 - smoothstep(0.5, 1.5, fp)) * laneBand;
    float drip = exp(-pow(dLane * 2.0, 2.0)) * smoothstep(0.5, 0.8, vnoise(wp * 0.7)) * (1.0 - smoothstep(0.4, 1.2, fp)) * laneBand;
    slab *= (1.0 - 0.25 * slabJ - 0.08 * laneBand - 0.3 * drip - 0.28 * stain) * (1.0 + 0.14 * track); // tracks are polished paler
    col = mix(slab, vec3(0.78, 0.64, 0.12), slot * 0.75 * (0.6 + 0.4 * smoothstep(0.3, 0.7, fbm3(wp * 0.4 + 6.0))));
    joint = 0.0;
  } else if (kind > 5.5) {
    // plaza: 0.9 m concrete pavers in two greys with a darker band every fourth course, albedo 0.28-0.38 (darker than
    // the walks, so the plazas stop reading as white from the air); paver tones and joints band-limited by footprint
    vec2 pv = floor(vec2(across, along) / 0.9);
    float pid = hash12(pv + kind);
    float bandP = step(mod(pv.y, 4.0), 0.5);
    vec3 pav = mix(vec3(0.26, 0.255, 0.24), vec3(0.36, 0.35, 0.33), n) * (0.94 + 0.12 * grain);
    pav *= 1.0 + (0.16 * pid - 0.08) * slabFade;
    pav = mix(pav, vec3(0.21, 0.21, 0.20), bandP * 0.55);
    // the coarse design that survives to 500 m: 10.8 m paving fields a tone apart (a third of them warm), and a
    // 0.6 m dark granite strip on the field lines
    vec2 fv = floor(vec2(across, along) / 10.8);
    float fh = hash12(fv + 3.0 + kind);
    pav *= 0.9 + 0.2 * fh;
    pav = mix(pav, pav * vec3(1.08, 1.0, 0.9), step(0.66, fh));
    vec2 fd = abs(fract(vec2(across, along) / 10.8 + 0.5) - 0.5) * 10.8; // distance to the nearest field line
    float strip = max(swLine(fd.x, 0.3, fwA), swLine(fd.y, 0.3, fwL));
    pav = mix(pav, vec3(0.19, 0.19, 0.185), strip * 0.7);
    // planting beds: about a third of the fields, in clusters of two to four (a smooth per-field noise, so the beds
    // form lawns with 2.7 m paved paths between them rather than confetti), each a lawn-and-groundcover bed with a
    // mulch margin inside a 0.45 m concrete kerb — the green patches that make a plaza read as designed ground from
    // 200-500 m, drawn in the field's own paving (no geometry); the edges are box-filtered like the lines. The lawn
    // is the parks' turf (terrain.ts parkGround 0.056-0.078 / 0.108-0.13 / 0.036-0.052) a shade richer for a kept,
    // watered lawn — at 0.15-0.25 / 0.24-0.34 it rendered lime against the parks in the h10 city_north — and the
    // mulch is dark bark, well under the terrain's sandy soil (0.21, 0.16, 0.105)
    float fdm = min(fd.x, fd.y), fwF = max(fwA, fwL);
    float isBed = step(0.57, vnoise(fv * 0.55 + 5.0 + kind));
    float kerbIn = clamp((fdm - 1.35) / fwF + 0.5, 0.0, 1.0), bedIn = clamp((fdm - 1.8) / fwF + 0.5, 0.0, 1.0);
    vec3 mulch = mix(vec3(0.105, 0.075, 0.048), vec3(0.15, 0.11, 0.07), mix(vnoise(wp * 1.7), 0.5, 1.0 - slabFade)) * (0.85 + 0.3 * grain);
    vec3 lawn = mix(vec3(0.060, 0.104, 0.038), vec3(0.084, 0.136, 0.052), mix(fbm3(wp * 0.9 + 4.0), 0.5, 1.0 - slabFade)) * (0.9 + 0.2 * grain);
    vec3 bed = mix(mulch, lawn, smoothstep(2.3, 2.9, fdm) * smoothstep(0.25, 0.5, fbm3(wp * 0.3 + 1.0)));
    pav = mix(pav, conc * 1.05, isBed * (kerbIn - bedIn));
    pav = mix(pav, bed, isBed * bedIn);
    joint = max(swLine((fract(along / 0.9) - 0.5) * 0.9, 0.01, fwL), swLine((fract(across / 0.9) - 0.5) * 0.9, 0.01, fwA)) * fade * (1.0 - strip) * (1.0 - isBed * kerbIn);
    col = pav;
  } else if (kind > 3.5) {
    // parapet: cast stone
    col = mix(vec3(0.62, 0.60, 0.56), vec3(0.70, 0.68, 0.63), n) * (0.95 + 0.1 * grain);
    joint = swLine((fract(along / 2.0) - 0.5) * 2.0, 0.012, fwL) * fade;
  } else {
    // curb top: paler cast concrete, a worn (darker) nose along its front edge
    float curbTop = (1.0 - step(${CURB_TOP.toFixed(2)}, across)) * (face ? 0.0 : 1.0);
    col = mix(col, conc * 1.08, curbTop * 0.7);
    col *= 1.0 - 0.12 * curbTop * (1.0 - smoothstep(0.0, 0.08, across)) * fade;
    // the curb is laid in 1 m kerb stones: their joints (top and face) are out of step with the 1.5 m slab joints
    float kerbJ = swLine((fract(along + 0.3) - 0.5), 0.014, fwL) * fade;
    joint = mix(joint, max(kerbJ, swLine(across - ${CURB_TOP.toFixed(2)}, 0.012, fwA) * fade), curbTop);
    // tree wells (1.5 m squares of soil) on the wide walks, every 12 m; utility covers every ~23 m
    if (slabW >= 2.3) {
      float wc = floor((along + 4.0) / 12.0);
      float wa = along + 4.0 - wc * 12.0 - 6.0;
      float wx = across - (${CURB_TOP.toFixed(2)} + slabW - 1.1);
      float well = step(abs(wa), 0.75) * step(abs(wx), 0.75) * step(0.35, hash12(vec2(wc, 3.0))) * slabFade;
      float rim = well * (1.0 - step(abs(wa), 0.62) * step(abs(wx), 0.62));
      vec3 soil = mix(vec3(0.22, 0.17, 0.12), vec3(0.30, 0.25, 0.16), vnoise(wp * 2.0)) * (0.85 + 0.3 * grain);
      col = mix(col, soil, well * (1.0 - rim));
      col = mix(col, conc * 0.8, rim);
      joint *= 1.0 - well;
    }
    float uc = floor(along / 23.0);
    float ua = along - uc * 23.0 - 11.5 + (hash12(vec2(uc, 9.0)) - 0.5) * 8.0;
    float cover = step(abs(ua), 0.3) * step(abs(across - 0.95), 0.3) * step(0.5, hash12(vec2(uc, 1.0))) * fade;
    col = mix(col, vec3(0.16, 0.16, 0.17), cover);
    if (face) {
      // curb face: shaded, with the gutter grime along its foot (across runs -0.05 at the foot to 0 at the nose)
      col = conc * 0.82 * (0.78 + 0.22 * smoothstep(-0.05, 0.0, across));
      joint = kerbJ;
    }
  }
  col *= 1.0 - 0.4 * joint;
  // tactile pad (0.6 m deep) on the fully dished part of the corner ramp
  if (ramp > 0.4) {
    float dots = mix(smoothstep(0.55, 0.75, vnoise(wp * 7.0)), 0.4, smoothstep(0.05, 0.2, fp));
    vec3 pad = vec3(0.72, 0.52, 0.18) * (0.85 + 0.25 * dots);
    col = mix(col, pad, smoothstep(0.45, 0.8, ramp) * (1.0 - step(${CURB_TOP.toFixed(2)} + 0.65, across)) * (face ? 0.0 : 1.0));
  }
  // damp stain and grime toward the curb, weathering blotches
  col *= 1.0 - 0.1 * smoothstep(0.6, 0.75, fbm3(wp * 0.05 + 8.0));
  diffuseColor.rgb = col;
  roughnessFactor = 0.9 - 0.08 * grain;
  // DEBUG-SW (temporary): kind / across / ramp to emissive
  if (uSwDebug > 0.5) { diffuseColor.rgb = vec3(0.0); totalEmissiveRadiance = vec3(kind / 4.0, clamp(across / 4.0, 0.0, 1.0), ramp); }
}
`;

/** temporary diagnostic toggle (`?dbg=swdebug`) */
export const SW_DEBUG: THREE.IUniform<number> = { value: 0 };

function createSidewalkMaterial(lights: RoadLightUniforms): THREE.MeshStandardMaterial {
  // biased toward the camera against the terrain (nearly coplanar where the slab rides just over the ground)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLampMap = lights.uLampMap;
    shader.uniforms.uLampRect = lights.uLampRect;
    shader.uniforms.uLampColor = lights.uLampColor;
    shader.uniforms.uSwDebug = SW_DEBUG;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSw; varying vec4 vSw; varying vec3 vSwNrm; varying vec3 vWorldPosS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSw = aSw; vSwNrm = normal; vWorldPosS = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SW_PARS}\nuniform float uSwDebug;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${SW_MAIN}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * lampPools(vWorldPosS);');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'sidewalk-v1';
  return mat;
}

/** emissive codes carried per vertex of the furniture soup (`aEmissive`) */
const EM_NONE = 0, EM_RED = 2, EM_AMBER = 3, EM_GREEN = 4, EM_HAND = 5, EM_WALK = 6;

/** Vertex-coloured PBR material for the furniture soups: `aMatParams` roughness / metalness, `aEmissive` codes the
 *  signal aspect a vertex belongs to and `aPhase` its node's cycle offset (+100 for the cross direction); the
 *  fragment shader lights the aspect that is on at `uSignalTime`. */
function createKitMaterial(uniforms: { uSignalTime: THREE.IUniform<number>; uNight: THREE.IUniform<number>; uFocalPx: THREE.IUniform<number> }): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSignalTime = uniforms.uSignalTime;
    shader.uniforms.uNight = uniforms.uNight;
    shader.uniforms.uFocalPx = uniforms.uFocalPx;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec2 aMatParams; attribute float aEmissive; attribute float aPhase; varying vec2 vMatParams; varying vec2 vSig;\n${THIN_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvMatParams = aMatParams; vSig = vec2(aEmissive, aPhase);${THIN_VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMatParams; varying vec2 vSig; uniform float uSignalTime; uniform float uNight;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMatParams.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMatParams.y;')
      .replace('#include <emissivemap_fragment>', /* glsl */ `
        {
          float code = vSig.x;
          vec3 em = vec3(0.0);
          if (code > 1.5) {
            float parity = step(99.5, vSig.y);
            float t = mod(uSignalTime + vSig.y - parity * 100.0 + parity * ${SIGNAL_HALF.toFixed(1)}, ${(SIGNAL_HALF * 2).toFixed(1)});
            float green = step(t, ${SIGNAL_GREEN.toFixed(1)});
            float amber = step(${SIGNAL_GREEN.toFixed(1)}, t) * step(t, ${(SIGNAL_GREEN + SIGNAL_AMBER).toFixed(1)});
            float red = 1.0 - green - amber;
            float lit = 0.0;
            if (code < 2.5) { em = vec3(1.0, 0.06, 0.02); lit = red; }
            else if (code < 3.5) { em = vec3(1.0, 0.55, 0.05); lit = amber; }
            else if (code < 4.5) { em = vec3(0.15, 1.0, 0.35); lit = green; }
            else if (code < 5.5) { em = vec3(1.0, 0.25, 0.05); lit = 1.0 - green; }
            else { em = vec3(0.95, 0.95, 0.9); lit = green; }
            em *= lit * (3.0 + 4.0 * uNight);
          }
          totalEmissiveRadiance = em;
        }`);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'street-kit-v2';
  return mat;
}

// ------------------------------------------------------------------ geometry accumulators

interface SwVert { x: number; y: number; z: number; nx: number; ny: number; nz: number; across: number; along: number; kind: number; w: number }

/** Sidewalk triangle accumulator (indexed strips). */
class WalkSoup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly sw: number[] = [];
  readonly idx: number[] = [];
  /** coarse index over the same vertices: the far LOD (curb foot to curb top to slab back, four triangles a row) */
  readonly idxFar: number[] = [];
  readonly box = new THREE.Box3();
  private count = 0;

  vert(v: SwVert): number {
    this.pos.push(v.x, v.y, v.z);
    this.nrm.push(v.nx, v.ny, v.nz);
    this.sw.push(v.across, v.along, v.kind, v.w);
    this.box.expandByPoint(_v.set(v.x, v.y, v.z));
    return this.count++;
  }

  /** quad a-b-c-d (a, b on the previous row; d, c above them on the next row), wound to face along `n`; `lod` picks
   *  the fine index (0), the far index (1) or both (2) */
  quad(a: number, b: number, c: number, d: number, nx: number, ny: number, nz: number, lod = 0): void {
    const p = this.pos;
    const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    const bx = p[b * 3] - ax, by = p[b * 3 + 1] - ay, bz = p[b * 3 + 2] - az;
    const cx = p[c * 3] - ax, cy = p[c * 3 + 1] - ay, cz = p[c * 3 + 2] - az;
    const kx = by * cz - bz * cy, ky = bz * cx - bx * cz, kz = bx * cy - by * cx;
    const flip = kx * nx + ky * ny + kz * nz < 0;
    if (lod !== 1) { if (flip) this.idx.push(a, c, b, a, d, c); else this.idx.push(a, b, c, a, c, d); }
    if (lod !== 0) { if (flip) this.idxFar.push(a, c, b, a, d, c); else this.idxFar.push(a, b, c, a, c, d); }
  }

  get triangles(): number { return this.idx.length / 3; }

  build(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aSw', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.boundingBox = this.box.clone();
    g.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    return g;
  }

  /** the far LOD over the fine geometry's vertex buffers */
  buildFar(fine: THREE.BufferGeometry): THREE.BufferGeometry | null {
    if (!this.idxFar.length) return null;
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'aSw']) g.setAttribute(name, fine.getAttribute(name));
    g.setIndex(this.idxFar);
    g.boundingBox = fine.boundingBox;
    g.boundingSphere = fine.boundingSphere;
    return g;
  }
}

/** Furniture triangle soup: unit shapes placed by matrix with colour, roughness / metalness, emissive code and phase. */
class KitSoup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly col: number[] = [];
  readonly par: number[] = [];
  readonly em: number[] = [];
  readonly ph: number[] = [];
  readonly thin: number[] = [];
  readonly box = new THREE.Box3();

  /** `thin`: the part is a thin member held to a pixel across in the vertex shader — 1: its axis is the unit's local
   *  y (poles, heads), 2: local z (arms laid along z), 3: local x (the lens plates, which face +x); aThin is then
   *  the world-space offset of each vertex from that axis */
  /** `shade`: faces of the unit lying wholly below y = -0.15 take `low`, faces wholly above y = 0.35 take `high`
   *  (a car body's dark sill band, a cabin's roof in the paint over its glass sides) */
  add(unit: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.Color, rough: number, metal: number, em = EM_NONE, phase = 0, thin = 0, shade?: { low?: THREE.Color; high?: THREE.Color }): void {
    const p = unit.getAttribute('position'), n = unit.getAttribute('normal');
    _nm.getNormalMatrix(m);
    _t.setFromMatrixPosition(m);
    let c = color;
    for (let i = 0; i < p.count; i++) {
      if (shade && i % 3 === 0) {
        const yMin = Math.min(p.getY(i), p.getY(i + 1), p.getY(i + 2)), yMax = Math.max(p.getY(i), p.getY(i + 1), p.getY(i + 2));
        c = shade.low && yMax < -0.15 ? shade.low : shade.high && yMin > 0.35 ? shade.high : color;
      }
      _v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m);
      this.pos.push(_v.x, _v.y, _v.z);
      this.box.expandByPoint(_v);
      if (thin) {
        if (thin === 1) _v.set(p.getX(i), 0, p.getZ(i)); else if (thin === 2) _v.set(p.getX(i), p.getY(i), 0); else _v.set(0, p.getY(i), p.getZ(i));
        _v.applyMatrix4(m).sub(_t);
        this.thin.push(_v.x, _v.y, _v.z);
      } else this.thin.push(0, 0, 0);
      _v.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(_nm).normalize();
      this.nrm.push(_v.x, _v.y, _v.z);
      this.col.push(c.r, c.g, c.b);
      this.par.push(rough, metal);
      this.em.push(em);
      this.ph.push(phase);
    }
  }

  get triangles(): number { return this.pos.length / 9; }

  build(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMatParams', new THREE.Float32BufferAttribute(this.par, 2));
    g.setAttribute('aEmissive', new THREE.Float32BufferAttribute(this.em, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.ph, 1));
    g.setAttribute('aThin', new THREE.Float32BufferAttribute(this.thin, 3));
    g.boundingBox = this.box.clone();
    g.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    return g;
  }
}

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _nm = new THREE.Matrix3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Every carriageway of the network in a 100 m grid: footings are checked against it so that nothing planned from one
 *  road's frame (a corner lamp, a signal pole behind a skewed crossing, a highway lamp beside a frontage street) ends
 *  up standing in another road. */
class RoadIndex {
  private static readonly G = 100;
  private readonly cells = new Map<number, { ax: number; az: number; bx: number; bz: number; hw: number }[]>();

  constructor(chains: RoadChain[]) {
    const G = RoadIndex.G;
    for (const c of chains) {
      for (let i = 0; i < c.pts.length - 1; i++) {
        const seg = { ax: c.pts[i][0], az: c.pts[i][1], bx: c.pts[i + 1][0], bz: c.pts[i + 1][1], hw: c.hw };
        const pad = c.hw + 2;
        const x0 = Math.floor((Math.min(seg.ax, seg.bx) - pad) / G), x1 = Math.floor((Math.max(seg.ax, seg.bx) + pad) / G);
        const z0 = Math.floor((Math.min(seg.az, seg.bz) - pad) / G), z1 = Math.floor((Math.max(seg.az, seg.bz) + pad) / G);
        for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
          const k = gx * 65536 + gz;
          let l = this.cells.get(k);
          if (!l) { l = []; this.cells.set(k, l); }
          l.push(seg);
        }
      }
    }
  }

  /** Signed distance to the nearest carriageway edge: negative inside a road, positive on the verge. */
  distance(x: number, z: number): number {
    const G = RoadIndex.G;
    const k = Math.floor(x / G) * 65536 + Math.floor(z / G);
    const l = this.cells.get(k);
    let best = Infinity;
    if (!l) return best;
    for (const s of l) {
      const abx = s.bx - s.ax, abz = s.bz - s.az, apx = x - s.ax, apz = z - s.az;
      const t = clamp((apx * abx + apz * abz) / (abx * abx + abz * abz || 1), 0, 1);
      const d = Math.hypot(apx - abx * t, apz - abz * t) - s.hw;
      if (d < best) best = d;
    }
    return best;
  }

  /** true when (x, z) stands on the verge, at least `clear` metres outside every carriageway */
  clear(x: number, z: number, clear = 0.2): boolean { return this.distance(x, z) >= clear; }
}

/** unit shapes of the furniture (non-indexed, centred; cylinders and plates along +y, the x-plate faces +x) */
/** a unit box without its -y face (10 triangles): anything that stands on the ground never shows its underside */
function openBox(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const pos: number[] = [], nrm: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    if (n.getY(i) < -0.5) continue;
    for (let k = i; k < i + 3; k++) { pos.push(p.getX(k), p.getY(k), p.getZ(k)); nrm.push(n.getX(k), n.getY(k), n.getZ(k)); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
/** an open box whose side faces are split at y = -0.186 (the sill line of a car body, 0.22 m up a 0.7 m side): the
 *  band below takes the soup's `low` shade (18 triangles) */
function beltedBox(belt = -0.186): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  // a quad from its four corners, wound to face `n` (checked, not assumed)
  const quad = (q: number[][], n: number[]) => {
    a.fromArray(q[0]); b.fromArray(q[1]).sub(a); c.fromArray(q[2]).sub(a);
    const flip = b.cross(c).dot(a.fromArray(n)) < 0;
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of order) { pos.push(q[k][0], q[k][1], q[k][2]); nrm.push(n[0], n[1], n[2]); }
  };
  // side faces: normal and the two horizontal corner positions (x, z); each side is a lower and an upper band
  const sides: [number[], number[], number[]][] = [[[1, 0, 0], [0.5, 0.5], [0.5, -0.5]], [[-1, 0, 0], [-0.5, -0.5], [-0.5, 0.5]], [[0, 0, 1], [-0.5, 0.5], [0.5, 0.5]], [[0, 0, -1], [0.5, -0.5], [-0.5, -0.5]]];
  for (const [n, l, r] of sides) {
    for (const [y0, y1] of [[-0.5, belt], [belt, 0.5]]) quad([[l[0], y0, l[1]], [r[0], y0, r[1]], [r[0], y1, r[1]], [l[0], y1, l[1]]], n);
  }
  quad([[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]], [0, 1, 0]);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
/** an open box whose top face is drawn in to 55 % of the length and 94 % of the width: a car cabin with a raked
 *  windscreen and rear window (10 triangles) */
function cabinBox(): THREE.BufferGeometry {
  const g = openBox();
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.55, p.getY(i), p.getZ(i) * 0.94);
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  boxOpen: openBox(),
  carBody: beltedBox(),
  cabin: cabinBox(),
  /** square plate of diameter 1 in the y-z plane facing +x: a lens seen from 300 m on */
  plate4: new THREE.CircleGeometry(0.5, 4).rotateY(Math.PI / 2).toNonIndexed(),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).toNonIndexed(),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6).toNonIndexed(),
  /** open-ended 8-gon tube: poles, whose ends are capped by something else or out of sight */
  tube: new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true).toNonIndexed(),
  /** octagonal plate of diameter 1 in the y-z plane facing +x */
  plate: new THREE.CircleGeometry(0.5, 8).rotateY(Math.PI / 2).toNonIndexed(),
  sphere: new THREE.SphereGeometry(0.5, 8, 6).toNonIndexed(),
};

/** A frame at (x, y, z) whose +x points along `yaw` (atan2 convention on the xz plane: (cos yaw, 0, -sin yaw)). */
function frame(x: number, y: number, z: number, yaw: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
}

/** Place `unit` scaled to (w, h, d) with its centre at local (cx, cy, cz) of `f`. */
function part(soup: KitSoup, unit: THREE.BufferGeometry, f: THREE.Matrix4, cx: number, cy: number, cz: number, w: number, h: number, d: number, color: THREE.Color, rough: number, metal: number, em = EM_NONE, phase = 0, rotZ = 0, thin = 0, shade?: { low?: THREE.Color; high?: THREE.Color }): void {
  _p.set(cx, cy, cz);
  _q.setFromEuler(_e.set(0, 0, rotZ));
  _s.set(w, h, d);
  _m2.compose(_p, _q, _s);
  _m.multiplyMatrices(f, _m2);
  soup.add(unit, _m, color, rough, metal, em, phase, thin, shade);
}
const _e = new THREE.Euler();

const C = {
  galv: new THREE.Color(0x8d949a),
  dark: new THREE.Color(0x2a2c2e),
  signal: new THREE.Color(0x1f2a1f),
  black: new THREE.Color(0x141416),
  lensOff: new THREE.Color(0x202020),
  green: new THREE.Color(0x1f6b3a),
  signGreen: new THREE.Color(0x1d6b3c),
  red: new THREE.Color(0xb8261c),
  white: new THREE.Color(0xeeeeea),
  wood: new THREE.Color(0x6e4f33),
  glass: new THREE.Color(0x9fc4d6),
  concrete: new THREE.Color(0xb3b0a8),
  hydrant: new THREE.Color(0xd23a2a),
  cabinet: new THREE.Color(0x8f9a92),
  stone: new THREE.Color(0xa9a49a),
  shrub: new THREE.Color(0x2f5a22),
  glassDark: new THREE.Color(0x1c2026),
  /** a car's sill band: tyres, wheel arches and the shadowed underside in one dark tone */
  sill: new THREE.Color(0x1e1f21),
};
/** parked-car paints, weighted toward the whites, silvers and greys of a real lot */
const CAR_PAINT = [0xe8e8e4, 0xdcdcd8, 0xb9bcc0, 0x9a9da2, 0x5a5d62, 0x2b2d31, 0x1a1a1d, 0xa8241c, 0x27406e, 0x2f5b3a, 0xc9b58a, 0x7a3b2a].map((c) => new THREE.Color(c));
const SILL = { low: C.sill };

/** A parked car — a belted body (the 0.22 m sill band dark: tyres and underside) and a raked cabin whose sides are
 *  glass and whose roof is the paint (28 triangles), or a van as one belted box with a dark glass band (28) — in
 *  `soup`, with its far shape (one open box in the paint, 10) in `far`; the frame's +x is the length, `cabinX` sets the
 *  cabin toward the nose (< 0) or the tail. At eye level (round 7) the two plain boxes read as freight containers
 *  at the kerb: no wheels, no glass line, a dark slab for a cabin. */
function parkedCar(soup: KitSoup, far: KitSoup, f: THREE.Matrix4, paint: THREE.Color, van: boolean, cabinX: number): void {
  if (van) {
    part(soup, UNIT.carBody, f, 0, 1.0, 0, 5.0, 1.6, 1.95, paint, 0.4, 0.5, EM_NONE, 0, 0, 0, SILL);
    part(soup, UNIT.boxOpen, f, cabinX * 5, 1.2, 0, 1.2, 0.55, 1.97, C.glassDark, 0.3, 0.5);
    part(far, UNIT.boxOpen, f, 0, 1.0, 0, 5.0, 1.6, 1.95, paint, 0.4, 0.5);
  } else {
    part(soup, UNIT.carBody, f, 0, 0.55, 0, 4.4, 0.7, 1.8, paint, 0.35, 0.6, EM_NONE, 0, 0, 0, SILL);
    part(soup, UNIT.cabin, f, cabinX, 1.22, 0, 2.5, 0.62, 1.62, C.glassDark, 0.3, 0.5, EM_NONE, 0, 0, 0, { high: paint });
    part(far, UNIT.boxOpen, f, 0, 0.7, 0, 4.4, 1.3, 1.8, paint, 0.4, 0.5);
  }
}

// ------------------------------------------------------------------ the streets system

interface StreetCell {
  key: number;
  box: THREE.Box3;
  center: THREE.Vector3;
  r: number;
  /** coarse sidewalk index over the same vertices, drawn beyond WALK_NEAR */
  walkFar: THREE.Mesh | null;
  walk: THREE.Mesh | null;
  large: THREE.Mesh | null;
  largeFar: THREE.Mesh | null;
  small: THREE.Mesh | null;
  /** parked cars, planters, benches of the plazas and lots (drawn within YARD_FAR, never cast) */
  yard: THREE.Mesh | null;
  yardFar: THREE.Mesh | null;
  height: number;
}

interface Run { chain: RoadChain; side: 1 | -1; sa: number; sb: number; zone: Zone | null; w: number; light: boolean }

function unitDir(a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

/** slab width (m) behind the curb top by zone; -1 = no sidewalk at all */
function walkWidth(zone: Zone | null): number {
  switch (zone) {
    case Zone.DOWNTOWN: return 2.7;
    case Zone.RES_MID: case Zone.HOTEL: return 2.4;
    case Zone.INDUSTRIAL: return 1.7;
    case Zone.RES_LOW: return 1.2;
    case Zone.PARK: case Zone.LOT: case Zone.CONSTRUCTION: case Zone.STADIUM: case Zone.MARINA: return 1.5;
    default: return -1;
  }
}
const URBAN = new Set<Zone>([Zone.DOWNTOWN, Zone.RES_MID, Zone.HOTEL, Zone.INDUSTRIAL]);
const DENSE = new Set<Zone>([Zone.DOWNTOWN, Zone.RES_MID, Zone.HOTEL]);

export class Streets {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly lamps: LampPlan[] = [];
  readonly walkMaterial: THREE.MeshStandardMaterial;
  readonly kitMaterial: THREE.MeshStandardMaterial;
  readonly uniforms = { uSignalTime: { value: 0 } as THREE.IUniform<number>, uNight: { value: 0 } as THREE.IUniform<number>, uFocalPx: { value: 1000 } as THREE.IUniform<number> };
  private readonly cells: StreetCell[] = [];
  private readonly builds = new Map<number, { walk: WalkSoup; large: KitSoup; largeFar: KitSoup; small: KitSoup; yard: KitSoup; yardFar: KitSoup }>();
  counts = { runs: 0, corners: 0, signals: 0, stops: 0, lamps: 0, walkTriangles: 0, kitTriangles: 0, cells: 0, rejected: 0, lots: 0, plazas: 0, cars: 0, curbCars: 0, planters: 0, paveTriangles: 0, yardTriangles: 0, yardFarTriangles: 0, kitFarTriangles: 0 };
  private readonly roads: RoadIndex;
  /** debug: `?dbg=nopools` turns the lamp pools off */
  poolsEnabled = true;
  /** signal pole footings per signalised node (the corner lamps keep clear of them) */
  readonly signalPoles = new Map<RoadNode, Vec2[]>();
  /** the lamp irradiance map's texture (owned here, sampled through `lights`) */
  private lampMap: THREE.DataTexture | null = null;

  /** `blocks`: the district grid blocks (centreline to centreline, district frame) and `occupied`: the city's footprint
   *  grid, for the plazas and surface lots dressed over the free ground of the dense blocks */
  constructor(private readonly map: WorldMap, private readonly graph: RoadGraph, private readonly lights: RoadLightUniforms, private readonly markOccupied: (x: number, z: number, r: number) => void, blocks: Map<string, Block[]> = new Map(), occupied: (x: number, z: number) => boolean = () => false) {
    this.walkMaterial = createSidewalkMaterial(lights);
    this.kitMaterial = createKitMaterial(this.uniforms);
    this.materials.push(this.walkMaterial, this.kitMaterial);
    this.roads = new RoadIndex(graph.chains);
    const signalPoles = this.signalPoles;
    for (const chain of graph.chains) {
      // highway and causeway lighting is built with the highway furniture (world/highway.ts): median twin-arm poles;
      // the streets keep the high masts where a highway lands (its ends are the interchanges with the surface grid)
      if (chain.cls === 'highway' || chain.cls === 'causeway') { this.planHighwayEndMasts(chain); continue; }
      if (chain.cls !== 'arterial' && chain.cls !== 'street') continue;
      if (chain.s1 - chain.s0 < 2) continue;
      const covered: [[number, number][], [number, number][]] = [[], []];
      for (const side of [-1, 1] as const) for (const run of this.sideRuns(chain, side)) { this.buildRun(run); covered[side > 0 ? 1 : 0].push([run.sa, run.sb]); }
      if (chain.cls === 'arterial') this.planVergeLamps(chain, covered);
    }
    for (const node of graph.nodes) {
      if (node.signal) this.buildSignals(node, signalPoles);
      else this.buildStopSigns(node);
      for (const k of node.corners) this.buildCorner(k, signalPoles.get(node) ?? []);
      this.planInterchangeMasts(node);
    }
    this.buildPromenade();
    this.buildPlazas(blocks, occupied);
    this.buildPortYard();
    this.flush();
    this.buildLampMap();
    this.counts.lamps = this.lamps.length;
  }

  /** Marks the city's 10 m occupancy cells a footprint of half-size `r` touches (its centre and four corners). The
   *  city's `markOccupied(r)` rounds the radius up to whole cells, so any r > 0 blanks a 30 m square: the plaza
   *  planters marked that way took every street tree out of the plazas (round 6). */
  private occupy(x: number, z: number, r: number): void {
    this.markOccupied(x, z, 0);
    if (r <= 0) return;
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) this.markOccupied(x + dx, z + dz, 0);
  }

  // ---------------------------------------------------------------- runs (block faces)

  /** The sidewalk runs of one side of a chain: the paved range minus the gaps where crossing roads pass (between the
   *  two curb-return tangent points of a node on this side) and minus the end beyond the last tangent point of a stub. */
  private sideRuns(chain: RoadChain, side: 1 | -1): Run[] {
    const byNode = new Map<RoadNode, number[]>();
    const put = (node: RoadNode, s: number) => { let l = byNode.get(node); if (!l) { l = []; byNode.set(node, l); } l.push(s); };
    for (const cn of chain.nodes) for (const k of cn.node.corners) {
      if (k.a.chain === chain && k.sideA === side) put(cn.node, k.sA);
      if (k.b.chain === chain && k.sideB === side) put(cn.node, k.sB);
    }
    const gaps: [number, number][] = [];
    for (const cn of chain.nodes) {
      const list = byNode.get(cn.node);
      const atStart = cn.s < 1.5, atEnd = cn.s > chain.length - 1.5;
      if (!list) {
        // no curb return on this side: a T seen from the through road (continuous walk) or a stub end
        if (atStart) gaps.push([-Infinity, cn.s + cn.hPlus]);
        else if (atEnd) gaps.push([cn.s - cn.hMinus, Infinity]);
        continue;
      }
      if (list.length >= 2) gaps.push([Math.min(...list), Math.max(...list)]);
      else if (atStart) gaps.push([-Infinity, list[0]]);
      else if (atEnd) gaps.push([list[0], Infinity]);
      else gaps.push([cn.s - cn.hMinus - 1, cn.s + cn.hPlus + 1]);
    }
    gaps.sort((a, b) => a[0] - b[0]);
    const runs: Run[] = [];
    let s = chain.s0;
    const end = chain.s1;
    const push = (sa: number, sb: number) => {
      if (sb - sa < 2) return;
      const mid = frameAt(chain, this.crossOf(chain), (sa + sb) / 2);
      const zone = this.map.districtAt(mid.x + mid.cx * (chain.hw + 2) * side, mid.z + mid.cz * (chain.hw + 2) * side)?.zone ?? null;
      const w = walkWidth(zone);
      if (w < 0) return;
      runs.push({ chain, side, sa, sb, zone, w, light: zone === Zone.RES_LOW });
    };
    for (const g of gaps) {
      if (g[1] < s) continue;
      if (g[0] > s) push(s, Math.min(g[0], end));
      s = Math.max(s, g[1]);
      if (s >= end) break;
    }
    if (s < end) push(s, end);
    return runs;
  }

  private readonly crossCache = new Map<RoadChain, Vec2[]>();
  private crossOf(chain: RoadChain): Vec2[] {
    let c = this.crossCache.get(chain);
    if (!c) { c = chainCross(chain); this.crossCache.set(chain, c); }
    return c;
  }

  private soupsAt(x: number, z: number): { walk: WalkSoup; large: KitSoup; largeFar: KitSoup; small: KitSoup; yard: KitSoup; yardFar: KitSoup } {
    const key = cellKey(x, z, CELL);
    let b = this.builds.get(key);
    if (!b) { b = { walk: new WalkSoup(), large: new KitSoup(), largeFar: new KitSoup(), small: new KitSoup(), yard: new KitSoup(), yardFar: new KitSoup() }; this.builds.set(key, b); }
    return b;
  }

  /** The sidewalk profile at one point of the curb line: `n` is the unit across vector pointing away from the road
   *  (mitred at bends, so |n| may exceed 1 there), `yRoad` the pavement edge height. Returns the row's vertex indices. */
  private profileRow(soup: WalkSoup, x: number, z: number, nx: number, nz: number, yRoad: number, along: number, run: { w: number; light: boolean; kind: number }, ramp: number, radiusCap = Infinity): number[] {
    const nl = Math.hypot(nx, nz) || 1;
    const ux = nx / nl, uz = nz / nl;
    const h = CURB_H * (1 - 0.87 * ramp);
    const yTop = yRoad + h, yFull = yRoad + CURB_H;
    const W = run.w, wCode = Math.round(W * 10);
    const at = (across: number) => { const a = Math.min(across, radiusCap); return { x: x + nx * a, z: z + nz * a }; };
    const out: number[] = [];
    const face = (across: number, y: number) => { const p = at(across); out.push(soup.vert({ x: p.x, y, z: p.z, nx: -ux, ny: 0, nz: -uz, across, along, kind: run.kind, w: wCode + ramp })); };
    const top = (across: number, y: number, kind = run.kind) => { const p = at(across); out.push(soup.vert({ x: p.x, y, z: p.z, nx: 0, ny: 1, nz: 0, across, along, kind, w: wCode + ramp })); return p; };
    // the curb is tied to the pavement edge; the slab behind it rides over the ground where the ground rises above
    // the curb level (the terrain is not flat across a block face), so it never z-fights with the terrain
    const slabY = (across: number) => { const p = at(across); return Math.max(yFull, this.map.heightAt(p.x, p.z) + SLAB_CLEAR); };
    face(-0.05, yRoad - 0.04);
    face(0, yTop);
    top(0, yTop);
    top(CURB_TOP, yTop);
    if (run.light) {
      top(CURB_TOP + W, slabY(CURB_TOP + W));
    } else {
      top(Math.min(1.5, CURB_TOP + W), slabY(Math.min(1.5, CURB_TOP + W)));
      const yBack = slabY(CURB_TOP + W);
      top(CURB_TOP + W, yBack);
      top(CURB_TOP + W, yBack, K_APRON); // the apron quad is apron on both edges (kinds do not interpolate)
      const ap = at(CURB_TOP + W + 0.6);
      const g = this.map.heightAt(ap.x, ap.z) + 0.03;
      top(CURB_TOP + W + 0.6, Math.min(g, yBack - 0.02), K_APRON);
    }
    return out;
  }

  /** connect two profile rows: face quad, curb top, slab(s), apron */
  private link(soup: WalkSoup, a: number[], b: number[]): void {
    soup.quad(a[0], a[1], b[1], b[0], soup.nrm[a[0] * 3], 0, soup.nrm[a[0] * 3 + 2]);
    for (let i = 2; i < a.length - 1; i++) {
      if (soup.sw[a[i] * 4] === soup.sw[a[i + 1] * 4]) continue; // duplicate vertex (kind change), zero width
      soup.quad(a[i], a[i + 1], b[i + 1], b[i], 0, 1, 0);
    }
    // far LOD: curb foot to curb top (a slanted face) and one slab quad to the back of the walk (no apron)
    const back = a.length >= 8 ? 5 : a.length - 1;
    soup.quad(a[0], a[3], b[3], b[0], soup.nrm[a[0] * 3], 1, soup.nrm[a[0] * 3 + 2], 1);
    soup.quad(a[3], a[back], b[back], b[3], 0, 1, 0, 1);
  }

  private buildRun(run: Run): void {
    const { chain, side, sa, sb } = run;
    const cross = this.crossOf(chain);
    const mid = frameAt(chain, cross, (sa + sb) / 2);
    const cellSoups = this.soupsAt(mid.x + mid.cx * (chain.hw + 1) * side, mid.z + mid.cz * (chain.hw + 1) * side);
    const soup = cellSoups.walk;
    // rows: the run ends plus every pavement row inside it (so the curb foot follows the pavement edge exactly)
    const rows = [sa];
    for (const s of chain.rows) if (s > sa + 0.05 && s < sb - 0.05) rows.push(s);
    rows.push(sb);
    rows.sort((u, v) => u - v);
    const kind = K_WALK;
    let prev: number[] | null = null;
    for (const s of rows) {
      const f = frameAt(chain, cross, s);
      const nx = f.cx * side, nz = f.cz * side;
      const ex = f.x + nx * chain.hw, ez = f.z + nz * chain.hw;
      const yRoad = roadEdgeY(chain, s, side);
      const row = this.profileRow(soup, ex, ez, nx, nz, yRoad, s, { w: run.w, light: run.light, kind }, 0);
      if (prev) this.link(soup, prev, row);
      prev = row;
    }
    this.counts.runs++;
    // lamps and furniture along the run
    this.dressRun(run, cellSoups);
  }

  /** Curb return: the profile extruded along the arc from ta to tb (normals toward the arc centre), dished into a
   *  ramp over its middle. */
  private buildCorner(k: RoadCorner, poles: Vec2[]): void {
    const chain = k.a.chain;
    const zone = this.map.districtAt(k.o[0], k.o[1])?.zone ?? null;
    const w = walkWidth(zone);
    if (w < 0) return;
    const light = zone === Zone.RES_LOW;
    const soups = this.soupsAt(k.o[0], k.o[1]);
    const soup = soups.walk;
    const n = k.arc.length;
    // along-position: continue chain a's along over the arc
    let along = k.sA;
    let prev: number[] | null = null;
    const cap = k.r - 0.3;
    for (let i = 0; i < n; i++) {
      const p = k.arc[i];
      const u = i / (n - 1);
      const nx = (k.o[0] - p[0]) / k.r, nz = (k.o[1] - p[1]) / k.r;
      // the pavement height under the arc: blend the two edges' heights by arc parameter
      const ya = roadEdgeY(k.a.chain, k.sA, k.sideA), yb = roadEdgeY(k.b.chain, k.sB, k.sideB);
      const yRoad = ya + (yb - ya) * u;
      // one diagonal ramp at the apex of the return: ~1.2 m of full dish with 1.3 m flares (the whole middle 60 %
      // of the arc dished read as a yellow band around every corner from 60 m)
      const ramp = 0.98 * smooth(0.3, 0.44, u) * smooth(0.7, 0.56, u);
      const row = this.profileRow(soup, p[0], p[1], nx, nz, yRoad, along, { w, light, kind: K_WALK }, ramp, cap);
      if (prev) this.link(soup, prev, row);
      prev = row;
      if (i < n - 1) along += Math.hypot(k.arc[i + 1][0] - p[0], k.arc[i + 1][1] - p[1]);
    }
    this.counts.corners++;
    // a lamp at the corner (on the curb line, 0.75 m behind the curb face), kept clear of the signal poles;
    // low-density suburbs light two diagonal corners of a crossing, not four
    if (zone === Zone.RES_LOW && k.a.chain.cls !== 'arterial' && k.b.chain.cls !== 'arterial' && (k.sideA > 0) !== (k.a.chain.id % 2 === 0)) return;
    const midIdx = n >> 1;
    const mid = k.arc[midIdx];
    const cands: { x: number; z: number; tx: number; tz: number }[] = [];
    const back = (p: Vec2, ox: number, oz: number, d: number) => ({ x: p[0] + ox * d, z: p[1] + oz * d });
    const nmid = unitDir(mid, k.o);
    cands.push({ ...back(mid, nmid[0], nmid[1], 0.75), tx: k.node.x, tz: k.node.z });
    const na = unitDir(k.ta, [k.ta[0] + (k.o[0] - k.ta[0]), k.ta[1] + (k.o[1] - k.ta[1])]);
    const pa = back([k.ta[0] + k.a.dir[0] * 1.5, k.ta[1] + k.a.dir[1] * 1.5], na[0], na[1], 0.75);
    cands.push({ ...pa, tx: pa.x - na[0], tz: pa.z - na[1] });
    const nb = unitDir(k.tb, k.o);
    const pb = back([k.tb[0] + k.b.dir[0] * 1.5, k.tb[1] + k.b.dir[1] * 1.5], nb[0], nb[1], 0.75);
    cands.push({ ...pb, tx: pb.x - nb[0], tz: pb.z - nb[1] });
    let best: typeof cands[0] | null = null, bestD = -1;
    for (const c of cands) {
      if (!this.roads.clear(c.x, c.z, 0.3)) continue;
      let d = Infinity;
      for (const p of poles) d = Math.min(d, Math.hypot(p[0] - c.x, p[1] - c.z));
      if (d > bestD) { bestD = d; best = c; }
      if (d > 2.5) break;
    }
    if (!best) { this.counts.rejected++; return; }
    const kind: LampKind = chain.cls === 'arterial' || k.b.chain.cls === 'arterial' ? 'arterial' : 'street';
    const y = Math.max(roadEdgeY(k.a.chain, k.sA, k.sideA), roadEdgeY(k.b.chain, k.sB, k.sideB)) + CURB_H;
    this.lamps.push({ x: best.x, y, z: best.z, yaw: Math.atan2(-(best.tz - best.z), best.tx - best.x), kind });
  }

  /** Plan a lamp unless its footing would stand in a carriageway (a crossing road the planning frame knows nothing of). */
  private lamp(x: number, y: number, z: number, yaw: number, kind: LampKind): void {
    if (!this.roads.clear(x, z, 0.3)) { this.counts.rejected++; return; }
    this.lamps.push({ x, y, z, yaw, kind });
  }

  /** Lamps (both sides on arterials, staggered on streets) and the furniture kits along a run. */
  private dressRun(run: Run, soups: { walk: WalkSoup; large: KitSoup; largeFar: KitSoup; small: KitSoup }): void {
    const { chain, side, sa, sb, zone } = run;
    const cross = this.crossOf(chain);
    const L = sb - sa;
    const arterial = chain.cls === 'arterial';
    const pitch = arterial ? 40 : zone === Zone.RES_LOW ? 55 : 45;
    const h = hash2(Math.round(chain.id * 7 + sa), side, 3);
    const yAt = (s: number) => roadEdgeY(chain, s, side) + CURB_H;
    const at = (s: number, across: number) => {
      const f = frameAt(chain, cross, s);
      return { x: f.x + f.cx * side * (chain.hw + across), z: f.z + f.cz * side * (chain.hw + across), nx: f.cx * side, nz: f.cz * side, dx: 0, dz: 0 };
    };
    const yawToRoad = (nx: number, nz: number) => Math.atan2(nz, -nx); // +x of the unit toward -n (the roadway)
    // low-density suburbs light one side of the street only (the side alternates per chain)
    const lit = zone !== Zone.RES_LOW || side === (chain.id % 2 === 0 ? 1 : -1);
    if (lit && L >= 30) {
      const n = Math.floor((L - 12) / pitch);
      if (n === 0) {
        const s = (sa + sb) / 2, q = at(s, 0.65);
        this.lamp(q.x, yAt(s), q.z, yawToRoad(q.nx, q.nz), arterial ? 'arterial' : 'street');
      } else {
        const p = (L - 12) / n;
        const stagger = arterial ? 0 : side > 0 ? 0 : p / 2;
        for (let i = 0; i <= n; i++) {
          const s = sa + 6 + i * p + stagger;
          if (s > sb - 6) continue;
          const q = at(s, 0.65);
          this.lamp(q.x, yAt(s), q.z, yawToRoad(q.nx, q.nz), arterial ? 'arterial' : 'street');
        }
      }
    }
    if (!DENSE.has(zone as Zone) && zone !== Zone.INDUSTRIAL && zone !== Zone.PARK) return;
    const dense = DENSE.has(zone as Zone);
    const W = run.w;
    const dir = chainFrame(chain, (sa + sb) / 2);
    const runYaw = Math.atan2(-dir.dz, dir.dx);
    /** curb lengths (s, half-length) kept free of parked cars: the bus stop at a shelter, a hydrant */
    const keepClear: [number, number][] = [];
    const put = (kind: 'bench' | 'bin' | 'hydrant' | 'shelter' | 'cabinet', s: number, across: number) => {
      const q = at(s, across);
      if (!this.roads.clear(q.x, q.z, kind === 'shelter' ? 1.2 : 0.4)) { this.counts.rejected++; return; }
      const y = yAt(s);
      const faceYaw = yawToRoad(q.nx, q.nz);
      const soup = kind === 'shelter' ? soups.large : soups.small;
      if (kind === 'shelter') keepClear.push([s, 10]);
      if (kind === 'hydrant') keepClear.push([s, 2.8]);
      switch (kind) {
        case 'bench': {
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.box, f, 0, 0.45, 0, 0.45, 0.05, 1.7, C.wood, 0.85, 0);
          part(soup, UNIT.box, f, -0.2, 0.72, 0, 0.05, 0.4, 1.7, C.wood, 0.85, 0);
          part(soup, UNIT.box, f, 0, 0.22, 0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
          part(soup, UNIT.box, f, 0, 0.22, -0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
          break;
        }
        case 'bin':
          part(soup, UNIT.cyl, frame(q.x, y, q.z, 0), 0, 0.48, 0, 0.6, 0.96, 0.6, C.green, 0.7, 0.3);
          part(soup, UNIT.cyl, frame(q.x, y, q.z, 0), 0, 0.99, 0, 0.64, 0.06, 0.64, C.black, 0.6, 0.4);
          break;
        case 'hydrant': {
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.cyl6, f, 0, 0.4, 0, 0.26, 0.8, 0.26, C.hydrant, 0.5, 0.2);
          part(soup, UNIT.cyl6, f, 0, 0.86, 0, 0.3, 0.12, 0.3, C.hydrant, 0.5, 0.2);
          part(soup, UNIT.box, f, 0, 0.55, 0, 0.46, 0.14, 0.14, C.hydrant, 0.5, 0.2);
          break;
        }
        case 'cabinet':
          part(soup, UNIT.box, frame(q.x, y, q.z, runYaw), 0, 0.7, 0, 1.2, 1.4, 0.55, C.cabinet, 0.55, 0.4);
          break;
        case 'shelter': {
          // roof over the back of the walk, glazed back and one end, two posts; open toward the curb
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.box, f, 0.6, 2.45, 0, 1.6, 0.08, 3.6, C.dark, 0.5, 0.5);
          part(soup, UNIT.box, f, 0.05, 1.25, -1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 0.05, 1.25, 1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 1.3, 1.25, -1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 1.3, 1.25, 1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 0.05, 1.3, 0, 0.03, 2.1, 3.3, C.glass, 0.15, 0.8);
          // far shape: roof, the two curb-side posts and the glazed back
          part(soups.largeFar, UNIT.box, f, 0.6, 2.45, 0, 1.6, 0.08, 3.6, C.dark, 0.5, 0.5);
          part(soups.largeFar, UNIT.box, f, 1.3, 1.25, -1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soups.largeFar, UNIT.box, f, 1.3, 1.25, 1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soups.largeFar, UNIT.box, f, 0.05, 1.3, 0, 0.03, 2.1, 3.3, C.glass, 0.15, 0.8);
          part(soup, UNIT.box, f, 0.65, 1.3, -1.72, 1.1, 2.1, 0.03, C.glass, 0.15, 0.8);
          part(soup, UNIT.box, f, 0.7, 0.5, 0.3, 0.4, 0.06, 1.6, C.dark, 0.7, 0.4);
          part(soup, UNIT.box, f, 0.7, 0.25, 0.3, 0.08, 0.44, 1.5, C.dark, 0.7, 0.4);
          this.occupy(q.x, q.z, 1.8);
          break;
        }
      }
    };
    if (L < 24) return;
    const back = CURB_TOP + W - 0.55;
    if (dense) {
      if (h < 0.6) put('bench', sa + L * (0.3 + 0.2 * h), back);
      if (h > 0.45 && L > 70) put('bench', sa + L * 0.72, back);
      if (hash2(Math.round(sa), chain.id, side + 11) < 0.7) put('bin', sa + 4.5, 0.75);
      if (hash2(Math.round(sb), chain.id, side + 12) < 0.45) put('bin', sb - 4.5, 0.75);
      if (hash2(Math.round(sa), chain.id, side + 13) < 0.45) put('hydrant', sa + L * (0.55 + 0.3 * h), 0.7);
      if (L > 60 && W >= 2.3 && hash2(Math.round(sa), chain.id, side + 14) < (arterial ? 0.3 : 0.16)) put('shelter', sa + L * 0.5, back + 0.35);
      if (W >= 2.3 && hash2(Math.round(sa), chain.id, side + 15) < 0.14) put('cabinet', sa + L * 0.85, back);
      if (!arterial && chain.hw >= 5.5) this.parkCurb(run, keepClear, at);
    } else {
      if (hash2(Math.round(sa), chain.id, side + 13) < 0.3) put('hydrant', sa + L * (0.55 + 0.3 * h), 0.7);
      if (zone === Zone.PARK && h < 0.5) put('bench', sa + L * 0.5, back);
      if (zone === Zone.INDUSTRIAL && hash2(Math.round(sa), chain.id, side + 15) < 0.2) put('cabinet', sa + L * 0.8, back);
    }
  }

  /** Curbside parking along a dense-district street. The arterials' outer traffic lane runs 4.7 m out on an 8 m
   *  half-width and leaves no room; a street's traffic drives 1.8 m from the centreline (world/traffic.ts), so a car
   *  1.2 m in from the curb keeps 1.2-2.2 m clear of it. 6.2 m bays from 8 m past each corner, clear of the bus stops
   *  and hydrants, three in five taken downtown and nine in twenty in the mid-rise rings, one car in six a van, the
   *  nose with the traffic of its side. The cars go to the yard soup (drawn to YARD_FAR, one box past YARD_NEAR,
   *  never a caster): from the air they are what tells a street from a lot's aisle, and at eye level they
   *  fill the parking lane the ghost line marks. */
  private parkCurb(run: Run, keepClear: [number, number][], at: (s: number, across: number) => { x: number; z: number; nx: number; nz: number }): void {
    const { chain, side, sa, sb, zone } = run;
    const L = sb - sa;
    const occupancy = zone === Zone.DOWNTOWN ? 0.6 : 0.45;
    const bays = Math.floor((L - 16) / 6.2);
    if (bays < 1) return;
    const s0 = sa + 8 + (L - 16 - bays * 6.2) / 2;
    let n = 0;
    for (let i = 0; i < bays; i++) {
      const s = s0 + (i + 0.5) * 6.2;
      const k = hash2(Math.round(chain.id * 13 + s * 2), side + 20, 21);
      if (k > occupancy) continue;
      if (keepClear.some(([cs, r]) => Math.abs(s - cs) < r + 2.6)) continue;
      const q = at(s + (k / occupancy - 0.5) * 0.5, -1.2);
      // 1.2 m inside its own carriageway edge; deeper means another road's carriageway overlaps this one here
      if (this.roads.distance(q.x, q.z) < -2.2) { this.counts.rejected++; continue; }
      const { yard, yardFar } = this.soupsAt(q.x, q.z);
      const y = roadEdgeY(chain, s, side) + 0.02;
      // the cross vector is the right-hand normal of +s, so with right-hand traffic the nose points +s on side +1
      const yaw = Math.atan2(q.nx * side, q.nz * side) + (hash2(i, Math.round(sa), side + 23) - 0.5) * 0.04;
      const paint = CAR_PAINT[Math.floor(hash2(Math.round(s * 3), chain.id, side + 24) * CAR_PAINT.length) % CAR_PAINT.length];
      parkedCar(yard, yardFar, frame(q.x, y, q.z, yaw), paint, hash2(Math.round(s * 5), chain.id, side + 25) < 0.16, -0.15);
      n++;
    }
    this.counts.curbCars += n;
  }

  // ---------------------------------------------------------------- intersections

  /** Mast-arm signals for every approach of a signalised node: pole at the far-right corner (as the approaching
   *  driver sees it), arm over the approach lanes with a three-aspect head per lane facing the approach, a pedestrian
   *  head on the pole facing along the crosswalk and a street-name blade. Aspects are timed by node phase. */
  private buildSignals(node: RoadNode, poles: Map<RoadNode, Vec2[]>): void {
    const chains = [...new Set(node.rays.map((r) => r.chain))];
    const rank = (c: RoadChain) => (c.cls === 'arterial' ? 2 : c.cls === 'street' ? 1 : 0);
    chains.sort((a, b) => rank(b) - rank(a) || a.id - b.id);
    const primary = chains[0];
    const offset = hash2(Math.round(node.x), Math.round(node.z), 5) * SIGNAL_HALF * 2;
    const list: Vec2[] = [];
    poles.set(node, list);
    for (const R of node.rays) this.mastArm(node, R, R.chain === primary ? 0 : 1, offset, list);
    this.counts.signals++;
  }

  private mastArm(node: RoadNode, R: RoadRay, parity: number, offset: number, poles: Vec2[]): void {
    const c = R.chain;
    const cn = c.nodes.find((n) => n.node === node);
    if (!cn) return;
    // the approach arrives travelling -R.dir; its lanes are on the driver's right
    const rx = R.dir[1], rz = -R.dir[0];
    const reachFar = R.sign > 0 ? cn.hMinus : cn.hPlus;
    const hw = c.hw;
    let px = node.x - R.dir[0] * (reachFar + 1.6) + rx * (hw + 0.9);
    let pz = node.z - R.dir[1] * (reachFar + 1.6) + rz * (hw + 0.9);
    // a skewed crossing road reaches further along the approach than the box says: back off until on the verge
    let backed = 0;
    while (!this.roads.clear(px, pz, 0.4) && backed < 8) { px -= R.dir[0] * 0.5; pz -= R.dir[1] * 0.5; backed += 0.5; }
    if (backed >= 8 || this.map.heightAt(px, pz) < 0.8) { this.counts.rejected++; return; }
    poles.push([px, pz]);
    // the pole, arm, heads and lenses read to FAR (past LARGE_NEAR as the far shape: pole, arm, heads, square lenses);
    // visors, pedestrian heads, buttons and blades are small-kit
    const soups = this.soupsAt(px, pz);
    const soup = soups.large, far = soups.largeFar, fine = soups.small;
    const y = roadEdgeY(c, R.s, R.sign > 0 ? -1 : 1) + CURB_H;
    // frame: +x toward the approaching traffic (R.dir); +z is then -right, i.e. from the pole toward the roadway
    const f = frame(px, y, pz, Math.atan2(-R.dir[1], R.dir[0]));
    const phase = offset + parity * 100;
    const pedPhase = offset + (1 - parity) * 100;
    const armH = 6.0;
    // pole, arm, heads and lenses are thin members: held to a pixel across, so the signals stand out of the aerial
    // views to 1.5 km and the lit lenses stay coloured points at night
    part(soup, UNIT.tube, f, 0, armH / 2 + 0.15, 0, 0.3, armH + 0.3, 0.3, C.galv, 0.45, 0.7, EM_NONE, 0, 0, 1);
    part(far, UNIT.tube, f, 0, armH / 2 + 0.15, 0, 0.3, armH + 0.3, 0.3, C.galv, 0.45, 0.7, EM_NONE, 0, 0, 1);
    part(soup, UNIT.box, f, 0, armH + 0.32, 0, 0.34, 0.06, 0.34, C.galv, 0.45, 0.7); // pole cap
    part(soup, UNIT.cyl6, f, 0, 0.12, 0, 0.5, 0.24, 0.5, C.concrete, 0.9, 0);
    const lanes = c.lanes >= 4 ? [1.5, 4.7] : [1.8];
    // arm over the roadway, long enough to reach the innermost approach lane
    const armLen = hw + 0.9 - lanes[0] + 0.6;
    part(soup, UNIT.box, f, 0, armH, armLen / 2, 0.16, 0.16, armLen, C.galv, 0.45, 0.7, EM_NONE, 0, 0, 2);
    part(far, UNIT.box, f, 0, armH, armLen / 2, 0.16, 0.16, armLen, C.galv, 0.45, 0.7, EM_NONE, 0, 0, 2);
    part(soup, UNIT.box, f, 0, armH - 0.3, 0.35, 0.14, 0.7, 0.7, C.galv, 0.45, 0.7); // arm bracket
    const head = (hz: number, hy: number) => {
      part(soup, UNIT.box, f, 0, hy, hz, 0.3, 1.05, 0.36, C.signal, 0.6, 0.3, EM_NONE, 0, 0, 1);
      part(far, UNIT.box, f, 0, hy, hz, 0.3, 1.05, 0.36, C.signal, 0.6, 0.3, EM_NONE, 0, 0, 1);
      const lens = (dy: number, em: number) => {
        part(soup, UNIT.plate, f, 0.16, hy + dy, hz, 1, 0.26, 0.26, C.lensOff, 0.3, 0.1, em, phase, 0, 3);
        part(far, UNIT.plate4, f, 0.16, hy + dy, hz, 1, 0.26, 0.26, C.lensOff, 0.3, 0.1, em, phase, 0, 3);
        part(fine, UNIT.box, f, 0.2, hy + dy + 0.15, hz, 0.24, 0.03, 0.3, C.signal, 0.6, 0.3); // visor
      };
      lens(0.34, EM_RED); lens(0, EM_AMBER); lens(-0.34, EM_GREEN);
    };
    for (const l of lanes) head(hw + 0.9 - l, armH - 0.62);
    if (lanes.length === 1) head(0.5, 4.3); // pole-side head on two-lane approaches
    // pedestrian head facing along the crosswalk (toward the far curb), hand / walk lenses
    part(fine, UNIT.box, f, 0, 2.7, 0.28, 0.3, 0.4, 0.26, C.signal, 0.6, 0.3);
    part(fine, UNIT.box, f, 0, 2.7, 0.42, 0.2, 0.2, 0.02, C.lensOff, 0.3, 0.1, EM_HAND, pedPhase);
    part(fine, UNIT.box, f, 0, 2.7, 0.42, 0.2, 0.2, 0.02, C.lensOff, 0.3, 0.1, EM_WALK, pedPhase);
    // push-button plate and street-name blade
    part(fine, UNIT.box, f, 0.17, 1.1, 0, 0.04, 0.12, 0.08, C.dark, 0.5, 0.5);
    part(fine, UNIT.box, f, 0, 3.6, 0.7, 0.03, 0.22, 0.9, C.signGreen, 0.5, 0.2);
    part(fine, UNIT.box, f, 0.02, 3.6, 0.7, 0.01, 0.06, 0.6, C.white, 0.5, 0.1);
  }

  /** Stop signs on the near-right corner of each stop-controlled approach (plus a street-name blade). */
  private buildStopSigns(node: RoadNode): void {
    for (const R of node.rays) {
      if (!node.stops.has(R.chain)) continue;
      const c = R.chain;
      const cn = c.nodes.find((n) => n.node === node);
      if (!cn) continue;
      const rx = R.dir[1], rz = -R.dir[0];
      const reachNear = R.sign > 0 ? cn.hPlus : cn.hMinus;
      const px = node.x + R.dir[0] * (reachNear + 1.2) + rx * (c.hw + 0.8);
      const pz = node.z + R.dir[1] * (reachNear + 1.2) + rz * (c.hw + 0.8);
      if (this.map.heightAt(px, pz) < 0.8 || !this.roads.clear(px, pz, 0.3)) { this.counts.rejected++; continue; }
      const zone = this.map.districtAt(px, pz)?.zone ?? null;
      if (walkWidth(zone) < 0) continue;
      // a 0.76 m plate is under a pixel long before the small-kit distance: the sign lives in the small soup
      const soup = this.soupsAt(px, pz).small;
      const y = roadEdgeY(c, R.s, R.sign > 0 ? -1 : 1) + CURB_H;
      const f = frame(px, y, pz, Math.atan2(-R.dir[1], R.dir[0]));
      part(soup, UNIT.box, f, 0, 1.2, 0, 0.06, 2.4, 0.06, C.galv, 0.5, 0.6);
      part(soup, UNIT.plate, f, 0.04, 2.1, 0, 1, 0.76, 0.76, C.red, 0.5, 0.1);
      part(soup, UNIT.box, f, 0.05, 2.1, 0, 0.005, 0.11, 0.52, C.white, 0.5, 0.1);
      part(soup, UNIT.box, f, 0, 2.62, 0.3, 0.02, 0.2, 0.7, C.signGreen, 0.5, 0.2);
      this.counts.stops++;
    }
  }

  // ---------------------------------------------------------------- promenade

  /** Bayfront promenade: where the downtown / bayfront arterial runs within 150 m of the water, a paved 4 m walk
   *  with a parapet 5 m inland of the seawall, bollards, benches and pedestrian lamps. */
  private buildPromenade(): void {
    for (const chain of this.graph.chains) {
      if (chain.cls !== 'arterial' || chain.s1 - chain.s0 < 100) continue;
      const cross = this.crossOf(chain);
      for (const side of [-1, 1] as const) {
        // sample the shore distance along the run; promenade segments where it is 14..160 m and the zone is urban
        const step = 6;
        let seg: { x: number; z: number; s: number; nx: number; nz: number }[] = [];
        const flush = () => { if (seg.length >= 6) this.promenadeStrip(seg); seg = []; };
        for (let s = chain.s0 + 10; s < chain.s1 - 10; s += step) {
          const f = frameAt(chain, cross, s);
          const nl = Math.hypot(f.cx, f.cz) || 1;
          const nx = (f.cx / nl) * side, nz = (f.cz / nl) * side;
          const ex = f.x + nx * chain.hw, ez = f.z + nz * chain.hw;
          const zone = this.map.districtAt(ex + nx * 6, ez + nz * 6)?.zone ?? null;
          const d = zone === Zone.DOWNTOWN || zone === Zone.PARK || zone === Zone.RES_MID ? this.shoreDistance(ex, ez, nx, nz, 170) : -1;
          if (d < 14 || d > 160) { flush(); continue; }
          const inland = 5.5;
          const px = ex + nx * (d - inland), pz = ez + nz * (d - inland);
          if (this.map.heightAt(px, pz) < 1.0 || this.map.heightAt(px - nx * 4.5, pz - nz * 4.5) < 1.0) { flush(); continue; }
          seg.push({ x: px, z: pz, s, nx, nz });
        }
        flush();
      }
    }
  }

  private shoreDistance(x: number, z: number, dx: number, dz: number, maxDist: number): number {
    for (let d = 2; d <= maxDist; d += 2) if (this.map.heightAt(x + dx * d, z + dz * d) < 0.3) return d - 1;
    return maxDist + 1;
  }

  /** One promenade segment along the sampled shore-parallel path (the path's `n` points seaward). */
  private promenadeStrip(path: { x: number; z: number; s: number; nx: number; nz: number }[]): void {
    const mid = path[path.length >> 1];
    const soups = this.soupsAt(mid.x, mid.z);
    const soup = soups.walk;
    let prev: number[] | null = null;
    let along = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (i > 0) along += Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z);
      // smooth the path normal over neighbours (the sampled shore is ragged)
      const q0 = path[Math.max(0, i - 1)], q1 = path[Math.min(path.length - 1, i + 1)];
      const nx = (q0.nx + p.nx + q1.nx) / 3, nz = (q0.nz + p.nz + q1.nz) / 3;
      const nl = Math.hypot(nx, nz) || 1;
      const ux = nx / nl, uz = nz / nl;
      const g = this.map.heightAt(p.x, p.z);
      // the deck is level across its width, so it sits on the highest ground under it (the shore rises inland:
      // at the seaward height the inland half and its lamps were up to 1.4 m under the terrain)
      const y = Math.max(g, this.map.heightAt(p.x - ux * 2.25, p.z - uz * 2.25), this.map.heightAt(p.x - ux * 4.5, p.z - uz * 4.5)) + 0.12;
      const row: number[] = [];
      const v = (a: number, yy: number, kind: number, up: boolean) => row.push(soup.vert({ x: p.x + ux * a, y: yy, z: p.z + uz * a, nx: up ? 0 : -ux, ny: up ? 1 : 0, nz: up ? 0 : -uz, across: a + 4.5, along, kind, w: 40 }));
      // parapet on the seaward edge (a = 0 .. -0.45), pavers inland to a = -4.5, apron beyond
      v(0.0, y + 0.55, K_PARAPET, true);
      v(-0.45, y + 0.55, K_PARAPET, true);
      v(-0.45, y + 0.55, K_PARAPET, false);
      v(-0.45, y, K_PARAPET, false);
      v(-0.45, y, K_PROMENADE, true);
      v(-4.5, y, K_PROMENADE, true);
      const gb = this.map.heightAt(p.x - ux * 5.2, p.z - uz * 5.2) + 0.03;
      v(-5.2, Math.min(gb, y - 0.02), K_APRON, true);
      // seaward face of the parapet down to the ground
      v(0.0, y + 0.55, K_PARAPET, false);
      v(0.0, g - 0.3, K_PARAPET, false);
      if (prev) {
        soup.quad(prev[0], prev[1], row[1], row[0], 0, 1, 0, 2);
        soup.quad(prev[2], prev[3], row[3], row[2], -ux, 0, -uz);
        soup.quad(prev[4], prev[5], row[5], row[4], 0, 1, 0, 2);
        soup.quad(prev[5], prev[6], row[6], row[5], 0, 1, 0);
        soup.quad(prev[7], prev[8], row[8], row[7], ux, 0, uz, 2);
      }
      prev = row;
      this.occupy(p.x - ux * 2.5, p.z - uz * 2.5, 4);
      // bollards every second sample on the seaward edge, benches and lamps at longer pitches
      const f = frame(p.x - ux * 0.9, y, p.z - uz * 0.9, Math.atan2(uz, -ux));
      if (i % 2 === 0) part(soups.small, UNIT.cyl6, f, 0, 0.45, 0, 0.18, 0.9, 0.18, C.dark, 0.5, 0.6);
      if (i % 5 === 2) {
        const fb = frame(p.x - ux * 3.6, y, p.z - uz * 3.6, Math.atan2(-uz, ux));
        part(soups.small, UNIT.box, fb, 0, 0.45, 0, 0.45, 0.05, 1.7, C.wood, 0.85, 0);
        part(soups.small, UNIT.box, fb, -0.2, 0.72, 0, 0.05, 0.4, 1.7, C.wood, 0.85, 0);
        part(soups.small, UNIT.box, fb, 0, 0.22, 0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
        part(soups.small, UNIT.box, fb, 0, 0.22, -0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
      }
      if (i % 4 === 1) this.lamp(p.x - ux * 4.0, y, p.z - uz * 4.0, Math.atan2(-uz, ux), 'ped');
    }
  }

  // ---------------------------------------------------------------- highway lamps (kept from the props plan)

  /** Arterial stretches outside the districts (the causeway approaches over the keys, the roads through the parks
   *  and mangroves) have no sidewalk run and so no run lamps: they get a pole on the verge every 40 m, both sides,
   *  wherever the ground is land — the lamp line that leads to every causeway. */
  private planVergeLamps(chain: RoadChain, covered: [[number, number][], [number, number][]]): void {
    const cross = this.crossOf(chain);
    for (const side of [-1, 1] as const) {
      const runs = covered[side > 0 ? 1 : 0];
      for (let s = chain.s0 + 20; s < chain.s1 - 12; s += 40) {
        if (runs.some(([a, b]) => s > a - 8 && s < b + 8)) continue;
        const f = frameAt(chain, cross, s);
        const x = f.x + f.cx * side * (chain.hw + 1.0), z = f.z + f.cz * side * (chain.hw + 1.0);
        const g = this.map.heightAt(x, z);
        if (g < 0.8) continue;
        this.lamp(x, g, z, Math.atan2(f.cz * side, -f.cx * side), 'arterial');
      }
    }
  }

  /** The highways are grade-separated from the graph (no shared nodes): their ends on land, where the ramps meet
   *  the surface network, get a pair of 30 m masts on the verges. */
  private planHighwayEndMasts(chain: RoadChain): void {
    const cross = this.crossOf(chain);
    for (const s of [chain.s0 + 12, chain.s1 - 12]) {
      const f = frameAt(chain, cross, s);
      for (const side of [-1, 1] as const) {
        const x = f.x + f.cx * side * (chain.hw + 5), z = f.z + f.cz * side * (chain.hw + 5);
        const g = this.map.heightAt(x, z);
        if (g < 0.8 || !this.roads.clear(x, z, 2.5)) continue;
        this.lamp(x, g, z, 0, 'mast');
        this.occupy(x, z, 1);
      }
    }
  }

  /** High masts at the interchanges: where a highway or causeway meets roads of another class, a 30 m mast stands in
   *  up to two of the corner quadrants (the curb-return centres, pushed 6 m further into the corner). */
  private planInterchangeMasts(node: RoadNode): void {
    const fast = node.rays.some((r) => r.chain.cls === 'highway' || r.chain.cls === 'causeway');
    const other = node.rays.some((r) => r.chain.cls !== 'highway' && r.chain.cls !== 'causeway' && r.chain.cls !== 'runway');
    if (!fast || !other || node.corners.length < 2) return;
    let placed = 0;
    for (let i = 0; i < node.corners.length && placed < 2; i += 2) {
      const k = node.corners[i];
      const dx = k.o[0] - node.x, dz = k.o[1] - node.z, d = Math.hypot(dx, dz) || 1;
      const x = k.o[0] + (dx / d) * 6, z = k.o[1] + (dz / d) * 6;
      const g = this.map.heightAt(x, z);
      if (g < 0.8 || !this.roads.clear(x, z, 2.5)) continue;
      this.lamp(x, g, z, 0, 'mast');
      this.occupy(x, z, 1);
      placed++;
    }
  }

  // ---------------------------------------------------------------- plazas and surface lots

  /** The free ground of the dense districts' blocks: downtown blocks with buildings get paved plazas with planters and
   *  benches around the free cells, empty blocks (all of them downtown, half of them in the mid-rise rings) become
   *  striped surface lots with parked cars and their own lamps, and the downtown district's margin beyond its last
   *  block row (the blank apron the aerial views look across) is ringed with lots. Paving is a 10 m grid of quads
   *  riding PAVE_CLEAR over the ground, refined to 2.5 m along the roads and stopped at the back of every sidewalk. */
  private buildPlazas(blocks: Map<string, Block[]>, occupied: (x: number, z: number) => boolean): void {
    for (const d of this.map.districts) {
      if (!DENSE.has(d.zone)) continue;
      const list = blocks.get(d.id);
      if (!list?.length) continue;
      const c = Math.cos(d.rot), s = Math.sin(d.rot);
      const toWorld = (lx: number, lz: number): Vec2 => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
      // a rect's four insets, x0 x1 z0 z1: a block is bounded by street centrelines on every side, a margin strip only
      // on the side it shares with the last block row; its other sides are open ground, with a 6 m planted gap
      // between neighbouring lots and 3 m to the district edge
      type Rect = { x0: number; x1: number; z0: number; z1: number; streetWidth: number; margin: boolean; ins: [number, number, number, number] };
      const walkBack = CURB_TOP + walkWidth(d.zone) + 0.6; // the sidewalk profile ends 0.6 m of apron behind the slab
      const street = (sw: number) => sw / 2 + walkBack + 0.1;
      const rects: Rect[] = list.map((b) => { const i = street(b.streetWidth); return { ...b, margin: false, ins: [i, i, i, i] }; });
      if (d.zone === Zone.DOWNTOWN) {
        const zMax = Math.max(...list.map((b) => b.z1)), zMin = Math.min(...list.map((b) => b.z0));
        const xMax = Math.max(...list.map((b) => b.x1)), xMin = Math.min(...list.map((b) => b.x0));
        const cols = [...new Map(list.map((b) => [b.x0, b] as const)).values()], rows = [...new Map(list.map((b) => [b.z0, b] as const)).values()];
        const sw = list[0].streetWidth, si = street(sw);
        if (d.hh - zMax > 45) for (const b of cols) rects.push({ x0: b.x0, x1: b.x1, z0: zMax, z1: d.hh - 6, streetWidth: sw, margin: true, ins: [6, 6, si, 3] });
        if (zMin + d.hh > 45) for (const b of cols) rects.push({ x0: b.x0, x1: b.x1, z0: -d.hh + 6, z1: zMin, streetWidth: sw, margin: true, ins: [6, 6, 3, si] });
        if (d.hw - xMax > 45) for (const b of rows) rects.push({ x0: xMax, x1: d.hw - 6, z0: b.z0, z1: b.z1, streetWidth: sw, margin: true, ins: [si, 3, 6, 6] });
        if (xMin + d.hw > 45) for (const b of rows) rects.push({ x0: -d.hw + 6, x1: xMin, z0: b.z0, z1: b.z1, streetWidth: sw, margin: true, ins: [3, si, 6, 6] });
      }
      for (const r of rects) {
        const u0 = r.x0 + r.ins[0], u1 = r.x1 - r.ins[1], v0 = r.z0 + r.ins[2], v1 = r.z1 - r.ins[3];
        if (u1 - u0 < 14 || v1 - v0 < 14) continue;
        const h = hash2(Math.round(r.x0 + d.cx), Math.round(r.z0 + d.cz), 17);
        // free-ground sampling on a 5 m grid (land only): the ratio decides what the block is
        const nu = Math.ceil((u1 - u0) / 5), nv = Math.ceil((v1 - v0) / 5);
        const free = new Uint8Array(nu * nv);
        let land = 0, nFree = 0;
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
          const [wx, wz] = toWorld(u0 + (i + 0.5) * 5, v0 + (j + 0.5) * 5);
          if (this.map.heightAt(wx, wz) < 1) continue;
          const isFree = !occupied(wx, wz);
          if (isFree) free[j * nu + i] = 1;
          // the ratio ignores the band along the streets: the game marks every road occupied 3 m past its edge in
          // 10 m cells, which would count a quarter of an empty block as built
          if (this.roads.distance(wx, wz) < 9) continue;
          land++;
          if (isFree) nFree++;
        }
        if (land < 0.5 * nu * nv) continue;
        const ratio = nFree / land;
        let kind: 'lot' | 'plaza' | null = null;
        if (r.margin) kind = h < 0.75 ? 'lot' : null;
        else if (ratio > 0.85) kind = d.zone === Zone.DOWNTOWN || h < 0.5 ? 'lot' : null;
        else if (d.zone === Zone.DOWNTOWN && ratio > 0.12) kind = 'plaza';
        if (!kind) continue;
        this.pave(toWorld, u0, v0, u1, v1, kind === 'lot' ? K_LOT : K_PLAZA, walkBack);
        if (kind === 'lot') {
          this.counts.lots++;
          this.parkCars(toWorld, u0, v0, u1, v1, occupied, h);
          // a lot is bays and aisles end to end: no street tree stands in it (the 6 m gaps between lots stay planted)
          for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const [wx, wz] = toWorld(u0 + (i + 0.5) * 5, v0 + (j + 0.5) * 5); this.markOccupied(wx, wz, 0); }
        } else { this.counts.plazas++; this.dressPlaza(toWorld, u0, v0, nu, nv, free, h); }
      }
    }
  }

  /** The container terminal's hardstand: the port island paved edge to edge (short of the roads and the quay walls) in
   *  the yard kind, 250 m tiles so each lands in its own cell for culling, all sharing the island frame's origin so the
   *  shader's slot grid and truck lanes line up with the props' stacks and painted lanes (world/props.ts buildPort). */
  private buildPortYard(): void {
    const P = PORT_ISLAND;
    const c = Math.cos(P.rot), s = Math.sin(P.rot);
    const toWorld = (u: number, v: number): Vec2 => [P.cx + u * c - v * s, P.cz + u * s + v * c];
    const clear = CURB_TOP + walkWidth(Zone.INDUSTRIAL) + 0.6;
    const T = 250;
    for (let v = -P.hh; v < P.hh; v += T) for (let u = -P.hw; u < P.hw; u += T) this.pave(toWorld, u, v, Math.min(u + T, P.hw), Math.min(v + T, P.hh), K_YARD, clear, -P.hw, -P.hh);
  }

  /** Paving quads over [u0,u1] x [v0,v1] of the district frame: 10 m cells, split to 2.5 m where a road crosses, no
   *  quad within `clear` of a carriageway edge (that band is the sidewalk's). aSw carries (u - ou, v - ov, kind, 0):
   *  the origin defaults to the rect's corner, a tile of a larger field passes the field's. */
  private pave(toWorld: (u: number, v: number) => Vec2, u0: number, v0: number, u1: number, v1: number, kind: number, clear: number, ou = u0, ov = v0): void {
    const [cx, cz] = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
    const soup = this.soupsAt(cx, cz).walk;
    const lift = PAVE_CLEAR + (kind === K_PLAZA ? 0.01 : 0);
    const ok = (u: number, v: number) => { const [x, z] = toWorld(u, v); return this.roads.distance(x, z) >= clear + 0.1 && this.map.heightAt(x, z) >= 0.9; };
    const vert = (u: number, v: number) => {
      const [x, z] = toWorld(u, v);
      return soup.vert({ x, y: this.map.heightAt(x, z) + lift, z, nx: 0, ny: 1, nz: 0, across: u - ou, along: v - ov, kind, w: 0 });
    };
    let tris = 0;
    const cell = (ua: number, va: number, size: number): void => {
      const ub = Math.min(ua + size, u1), vb = Math.min(va + size, v1);
      if (ub - ua < 0.5 || vb - va < 0.5) return;
      const um = (ua + ub) / 2, vm = (va + vb) / 2;
      if (ok(ua, va) && ok(ub, va) && ok(ua, vb) && ok(ub, vb) && ok(um, vm)) {
        soup.quad(vert(ua, va), vert(ub, va), vert(ub, vb), vert(ua, vb), 0, 1, 0, 2);
        tris += 2;
      } else if (size > 2.6) {
        const half = size / 2;
        cell(ua, va, half); cell(ua + half, va, half); cell(ua, va + half, half); cell(ua + half, va + half, half);
      }
    };
    for (let v = v0; v < v1; v += 10) for (let u = u0; u < u1; u += 10) cell(u, v, 10);
    this.counts.paveTriangles += tris;
  }

  /** Parked cars in the bays of a lot (rows of 5 m bays along u either side of 6.5 m aisles, 16.5 m period along v,
   *  42 % of the bays taken), with a street lamp on the line between the bay rows every 14 bays. */
  private parkCars(toWorld: (u: number, v: number) => Vec2, u0: number, v0: number, u1: number, v1: number, occupied: (x: number, z: number) => boolean, h: number): void {
    const [cx, cz] = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
    const { yard: soup, yardFar: far } = this.soupsAt(cx, cz);
    const rot = Math.atan2(toWorld(1, 0)[1] - toWorld(0, 0)[1], toWorld(1, 0)[0] - toWorld(0, 0)[0]); // world yaw of +u
    const uYaw = -rot; // frame(): +x along (cos yaw, 0, -sin yaw)
    let n = 0;
    for (let vs = v0 + 1; vs + 16.5 <= v1 - 1; vs += 16.5) {
      for (let i = 0; ; i++) {
        const u = u0 + 1.4 + i * 2.6;
        if (u + 1.3 > u1 - 1) break;
        for (const half of [0, 1]) {
          const k = hash2(Math.round(u * 10), Math.round((vs + half) * 10), 5);
          if (k < 0.67) continue;
          const vc = vs + (half ? 14.0 : 2.5);
          const [x, z] = toWorld(u + (k - 0.7) * 0.3, vc);
          if (occupied(x, z) || !this.roads.clear(x, z, 1)) continue;
          const y = this.map.heightAt(x, z) + PAVE_CLEAR;
          // nose away from the aisle; the body along v, so the frame's +x is turned to v (+u yaw - 90 deg)
          const f = frame(x, y, z, uYaw - Math.PI / 2 + (hash2(i, half, 9) - 0.5) * 0.06);
          const paint = CAR_PAINT[Math.floor(hash2(Math.round(u * 3), Math.round(vc * 3), 11) * CAR_PAINT.length) % CAR_PAINT.length];
          parkedCar(soup, far, f, paint, hash2(Math.round(u * 5), Math.round(vc * 5), 13) < 0.12, half ? 0.2 : -0.2);
          n++;
        }
      }
      // lamps on the line between the back-to-back bay rows, on a bay boundary every 14 bays
      for (let m = 4 + Math.floor(h * 6); u0 + 0.1 + m * 2.6 < u1 - 4; m += 14) {
        const [x, z] = toWorld(u0 + 0.1 + m * 2.6, vs);
        this.lamp(x, this.map.heightAt(x, z) + PAVE_CLEAR, z, uYaw + Math.PI / 2, 'street');
      }
    }
    this.counts.cars += n;
  }

  /** Planters (concrete boxes with a clipped shrub) and benches over the free 5 m cells of a plaza: along the building
   *  frontages in one cell of three, in the open in one of twelve. The planters reserve no ground: the downtown street
   *  trees are planted at 2 % of the 10 m cells, and a trunk through a 1.6 m planter reads as a planted tree, while
   *  marking the planters' cells took the trees out of the plazas (round 6). */
  private dressPlaza(toWorld: (u: number, v: number) => Vec2, u0: number, v0: number, nu: number, nv: number, free: Uint8Array, h: number): void {
    const [cx, cz] = toWorld(u0 + nu * 2.5, v0 + nv * 2.5);
    const { yard: soup, yardFar: far } = this.soupsAt(cx, cz);
    const rot = Math.atan2(toWorld(1, 0)[1] - toWorld(0, 0)[1], toWorld(1, 0)[0] - toWorld(0, 0)[0]);
    const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nu || j >= nv ? 1 : free[j * nu + i]);
    let n = 0;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (!free[j * nu + i]) continue;
      const frontage = !at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1);
      const k = hash2(i, j, Math.round(h * 1000));
      if (k > (frontage ? 0.33 : 0.18)) continue;
      const [x, z] = toWorld(u0 + (i + 0.5) * 5, v0 + (j + 0.5) * 5);
      if (!this.roads.clear(x, z, 2.2)) continue;
      const y = this.map.heightAt(x, z) + PAVE_CLEAR + 0.01;
      if (!frontage && k > 0.08) {
        // pedestrian lanterns over the open cells (one in ten): at night a plaza is a lit space with its own dots
        // and 5 m pools instead of a dark hole between the street lamps
        this.lamp(x, y, z, 0, 'ped');
        continue;
      }
      const f = frame(x, y, z, -rot + (k > 0.15 ? Math.PI / 2 : 0));
      part(soup, UNIT.boxOpen, f, 0, 0.28, 0, 1.6, 0.56, 1.6, C.concrete, 0.9, 0);
      part(soup, UNIT.boxOpen, f, 0, 0.78, 0, 1.4, 0.46, 1.4, C.shrub, 0.95, 0);
      part(far, UNIT.boxOpen, f, 0, 0.5, 0, 1.6, 1.0, 1.6, C.shrub, 0.95, 0);
      if (hash2(j, i, 4) < 0.5) {
        // bench beside the planter, facing the same way
        part(soup, UNIT.box, f, 1.7, 0.45, 0, 0.45, 0.05, 1.7, C.wood, 0.85, 0);
        part(soup, UNIT.box, f, 1.7, 0.22, 0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
        part(soup, UNIT.box, f, 1.7, 0.22, -0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
      }
      n++;
    }
    this.counts.planters += n;
  }

  // ---------------------------------------------------------------- lamp irradiance map

  /** Splat every planned lamp's pool into the ground irradiance map the road / sidewalk shaders sample at night. */
  private buildLampMap(): void {
    if (!this.lamps.length) return;
    // the map covers the dense districts (downtown, mid-rise, hotel row) at full resolution: the residential grids
    // and arterials reach across the whole 20 km world, where lamps keep their lit heads and dots but throw no pool
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const d of this.map.districts) {
      if (!DENSE.has(d.zone)) continue;
      const r = Math.hypot(d.hw, d.hh);
      x0 = Math.min(x0, d.cx - r); z0 = Math.min(z0, d.cz - r); x1 = Math.max(x1, d.cx + r); z1 = Math.max(z1, d.cz + r);
    }
    if (!Number.isFinite(x0)) return;
    x0 -= 24; z0 -= 24; x1 += 24; z1 += 24;
    const texel = Math.max(LAMP_TEXEL, (x1 - x0) / LAMP_MAP_MAX, (z1 - z0) / LAMP_MAP_MAX);
    const w = Math.min(LAMP_MAP_MAX, Math.ceil((x1 - x0) / texel)), h = Math.min(LAMP_MAP_MAX, Math.ceil((z1 - z0) / texel));
    const acc = new Float32Array(w * h);
    const POOL: Record<LampKind, [number, number, number]> = { arterial: [13, 1.0, 3.3], street: [10.5, 0.85, 2.0], ped: [5, 0.45, 0], highway: [12, 1.0, 0], mast: [40, 1.2, 0] };
    for (const l of this.lamps) {
      const [radius, peak, arm] = POOL[l.kind];
      // the luminaire hangs at the arm's end: the pool centres there
      const cx = l.x + Math.cos(l.yaw) * arm, cz = l.z - Math.sin(l.yaw) * arm;
      const i0 = Math.max(0, Math.floor((cx - radius - x0) / texel)), i1 = Math.min(w - 1, Math.ceil((cx + radius - x0) / texel));
      const j0 = Math.max(0, Math.floor((cz - radius - z0) / texel)), j1 = Math.min(h - 1, Math.ceil((cz + radius - z0) / texel));
      for (let j = j0; j <= j1; j++) {
        const pz = z0 + (j + 0.5) * texel;
        for (let i = i0; i <= i1; i++) {
          const px = x0 + (i + 0.5) * texel;
          const d = Math.hypot(px - cx, pz - cz) / radius;
          if (d >= 1) continue;
          // a broad foot (the luminaire hangs 8-11 m up) with a soft cut at the pool radius
          const v = peak * Math.pow(1 - d * d, 1.5) * (1 - smooth(0.6, 1.0, d));
          acc[j * w + i] += v;
        }
      }
    }
    const data = new Uint8Array(w * h);
    for (let i = 0; i < acc.length; i++) data[i] = Math.round(255 * Math.sqrt(Math.min(1, acc[i])));
    // the border ring stays dark: the sampler clamps to the edge, so a lit border texel (a lamp within a pool radius
    // of the rectangle) would streak along every road beyond it
    for (let i = 0; i < w; i++) data[i] = data[(h - 1) * w + i] = 0;
    for (let j = 0; j < h; j++) data[j * w] = data[j * w + w - 1] = 0;
    const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.unpackAlignment = 1;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.lampMap = tex;
    this.lights.uLampMap.value = tex;
    this.lights.uLampRect.value.set(x0, z0, 1 / (w * texel), 1 / (h * texel));
  }

  // ---------------------------------------------------------------- meshes

  private flush(): void {
    for (const [key, b] of this.builds) {
      const cell: StreetCell = { key, box: new THREE.Box3(), center: new THREE.Vector3(), r: 0, walk: null, walkFar: null, large: null, largeFar: null, small: null, yard: null, yardFar: null, height: 0 };
      const mk = (g: THREE.BufferGeometry | null, mat: THREE.Material, name: string, casts: boolean): THREE.Mesh | null => {
        if (!g) return null;
        const m = new THREE.Mesh(g, mat);
        m.name = name;
        m.frustumCulled = false;
        m.matrixAutoUpdate = false;
        m.receiveShadow = true;
        m.castShadow = casts;
        m.visible = false;
        m.layers.set(LAYER_CAMERA);
        cell.box.union(g.boundingBox!);
        this.group.add(m);
        return m;
      };
      cell.walk = mk(b.walk.build(), this.walkMaterial, 'sidewalks', false);
      cell.walkFar = cell.walk ? mk(b.walk.buildFar(cell.walk.geometry), this.walkMaterial, 'sidewalks-far', false) : null;
      cell.large = mk(b.large.build(), this.kitMaterial, 'street-kits', true);
      cell.largeFar = mk(b.largeFar.build(), this.kitMaterial, 'street-kits-far', false);
      // the small soup (visors, pedestrian heads, buttons, name blades, stop signs) never casts: nothing in it is
      // worth a 0.4 m shadow texel, and drawn into two cascades it cost as much again as the whole street pass
      cell.small = mk(b.small.build(), this.kitMaterial, 'street-kits-small', false);
      cell.yard = mk(b.yard.build(), this.kitMaterial, 'street-yards', false);
      cell.yardFar = mk(b.yardFar.build(), this.kitMaterial, 'street-yards-far', false);
      this.counts.walkTriangles += b.walk.triangles;
      this.counts.kitTriangles += b.large.triangles + b.small.triangles;
      this.counts.kitFarTriangles += b.largeFar.triangles;
      this.counts.yardTriangles += b.yard.triangles;
      this.counts.yardFarTriangles += b.yardFar.triangles;
      if (!cell.walk && !cell.large && !cell.small && !cell.yard) continue;
      const sphere = cell.box.getBoundingSphere(new THREE.Sphere());
      cell.center.copy(sphere.center); cell.r = sphere.radius; cell.height = cell.box.max.y - cell.box.min.y;
      this.cells.push(cell);
    }
    this.builds.clear();
    this.crossCache.clear();
    this.counts.cells = this.cells.length;
  }

  /** Signal timing and the lamp pools' colour follow the clock and the night factor. */
  update(time: number, night: number): void {
    this.uniforms.uSignalTime.value = time;
    this.uniforms.uNight.value = night;
    // warm high-pressure sodium / warm-white LED mix; the pools scale with the night factor like the lamp heads.
    // 0.35: under the x3.5 night exposure a 0.7 gain clipped the pool centres to one flat tan on asphalt and
    // concrete alike (sRGB ~185 on both); at 0.35 the centre of a pool on asphalt sits near sRGB 120 and grades out
    this.lights.uLampColor.value.set(1.0, 0.78, 0.5).multiplyScalar(0.35 * night * (this.poolsEnabled ? 1 : 0));
  }

  /** Per-frame culling: cells in view within FAR (small kits within SMALL_FAR); the large kits cast into the fine
   *  cascades within SHADOW_FAR, the small kits and the sidewalks never cast. */
  /** `pxPerMetre`: focal length of the main frame in pixels (the thin members of the kits are held to a pixel across) */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos: THREE.Vector3, pxPerMetre = 1000): void {
    this.uniforms.uFocalPx.value = pxPerMetre;
    for (const c of this.cells) {
      const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
      const inView = d < FAR && cull.boxInView(c.box);
      if (c.walk) c.walk.visible = inView && (d < WALK_NEAR || !c.walkFar);
      if (c.walkFar) c.walkFar.visible = inView && d >= WALK_NEAR;
      const castBits = d < SHADOW_FAR ? cull.boxCasterCascades(c.box, c.height) : 0;
      const set = (m: THREE.Mesh | null, visible: boolean) => {
        if (!m) return;
        const mask = layerMask('near', visible, visible || d < SHADOW_FAR ? castBits : 0);
        const cast = maskCasts(mask);
        m.castShadow = cast;
        m.visible = visible || cast;
        m.layers.mask = mask;
      };
      const largeNear = d < LARGE_NEAR || !c.largeFar;
      set(c.large, inView && largeNear);
      if (c.largeFar) c.largeFar.visible = inView && !largeNear;
      // the small kit's range is measured in three dimensions: from 200 m up it is gone 220 m out
      const d3 = Math.hypot(d, Math.max(0, camPos.y - c.box.max.y));
      if (c.small) c.small.visible = inView && d3 < SMALL_FAR; // camera layer only (see flush)
      // the yard's near shapes are for eye level: measured in three dimensions, from 200 m up every car is its far box
      const yardNear = d3 < YARD_NEAR || !c.yardFar;
      if (c.yard) c.yard.visible = inView && yardNear && d < YARD_FAR;
      if (c.yardFar) c.yardFar.visible = inView && !yardNear && d < YARD_FAR;
    }
  }

  dispose(): void {
    this.lampMap?.dispose();
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
