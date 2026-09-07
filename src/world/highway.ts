import * as THREE from 'three';
import type { BridgeSpec, RoadClass, Vec2, WorldMap } from './map';
import { chainCross, chainFrame, frameAt as roadFrameAt, type RoadChain, type RoadGraph, type RoadSegment } from './roads';
import { clamp, lerp } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { F_BARRIER_H, F_BARRIER_PROFILE, GLSL_AA_LINE, MIN_WIDTH_VERT, STEEL_ALPHA_FRAG, Soup, lampGlowFor, landingSurface, terrainAt, type Frame, type Rgb } from './bridges';
import { ALL_CASCADES, MAX_CASCADES, ViewCull, cascadeIsFine, layerMask, maskCasts, type CasterClass } from './culling';

/**
 * Furniture of the ground highways (`highway` / `causeway` road classes): the concrete median barrier, W-beam
 * guardrail where the shoulder drops to water or low ground and on the approaches to every causeway, delineator
 * posts and barrier reflectors, median-mounted twin-arm lighting, sign gantries and guide signs before the
 * causeways and the arterial junctions, chevrons on the sharp bend, speed signs and drainage inlets.
 *
 * Everything sits on the road surface exactly as roads.ts builds it (same rows, same mitred edges), is baked into
 * three vertex-coloured meshes per ~1 km chunk (concrete, thin steel, signs) and culled / cascade-routed per
 * frame like the bridge chunks. Thin members carry their axis so they keep a screen-space minimum width instead
 * of dissolving from altitude (see bridges.ts MIN_WIDTH_VERT); the steel mesh drops its posts at POST_DISTANCE,
 * its rails and poles at THIN_DISTANCE and keeps only the lit lamp heads to HEAD_DISTANCE.
 */

export interface HighwayBuild {
  group: THREE.Group;
  counts: { chains: number; chunks: number; meshes: number; poles: number; gantries: number; guardrailM: number; barrierM: number; vergeM: number; paveM: number; frontageM: number; signs: number; triangles: number };
}

// ------------------------------------------------------------------ constants

/** roads.ts: row spacing along a segment and the pavement's height over the terrain */
const ROAD_STEP = 15;
const ROAD_LIFT = 0.15;
const CHUNK_LEN = 1000;
/** LOD cut-offs (horizontal distance from the nearest camera to the chunk) */
const POST_DISTANCE = 1500;
const THIN_DISTANCE = 2500;
const SIGN_DISTANCE = 4000;
const HEAD_DISTANCE = 5000;
/** peak radiance of the lamp heads at night (matches the bridge lamps) */
const LAMP_GLOW = 6.0;
/** F-shape concrete median barrier (bridges.ts profile: 81 cm tall, 61 cm base) */
const BARRIER_H = F_BARRIER_H;
const BARRIER_PROFILE = F_BARRIER_PROFILE;
/** W-beam guardrail: rail 55-86 cm over the pavement, posts every 1.905 m */
const RAIL_PROFILE: readonly [number, number][] = [[0.0, 0.55], [0.085, 0.625], [0.0, 0.705], [0.085, 0.785], [0.0, 0.86], [-0.03, 0.86], [-0.03, 0.55], [0.0, 0.55]];
const POST_SPACING = 1.905;
/** median lighting: twin-arm cobra heads 12 m over the pavement every 60 m (barrier-mounted poles) */
const POLE_SPACING = 60;
const POLE_SPACING_JUNCTION = 40;
const POLE_H = 11.4;
const ARM_REACH = 2.9;
/** verge beside the pavement edge: a gravel band along the pavement, mown grass (sand on the beaches) beyond */
/** verge rows (metres out from the pavement edge): the mown right-of-way strip is 12 m wide, draped on the
 *  terrain row by row so it follows the ground; the swale lies between the 5 and 8 m rows */
const VERGE_ROWS: readonly number[] = [0, 1.8, 5.0, 8.0, 12.0];
const VERGE_GRAVEL_W = 0.7;
/** wearing course over the pavement: from the barrier foot (tucked 1.5 cm under the F-profile's 61 cm base) to
 *  15 cm short of the pavement edge, 2 cm up; the lane asphalt ends at the shoulder joint (the decks' carriageway
 *  edge, bridges.ts) and the shoulder is an older, paler mix; lane paint at the lanes the traffic drives (traffic.ts:
 *  1.5 and 4.7 m from the centre line) */
const PAVE_IN = 0.29;
const PAVE_JOINT = 6.95;
const PAVE_EDGE_INSET = 0.15;
const PAVE_UP = 0.02;
const PAVE_LANE_LINE = 3.1;
const PAVE_EDGE_LINE = 6.35;
/** frontage streets (a district street running beside the shoulder): the planted buffer laid over the street's
 *  edge nearest the highway - a kerbed strip with a hedge - and the least a street must run beside the highway to
 *  count. The traffic drives a street's lanes 1.8 m off its centre (traffic.ts), a 2.5 m truck's flank 3.05 m off:
 *  the kerb face of a 1.05 m strip on a 9 m street stands 3.3 m off the centre, clear of it */
const FRONTAGE_BUFFER_W = 1.05;
const FRONTAGE_MIN_LEN = 60;
const HEDGE_PROFILE: readonly [number, number][] = [[-0.525, 0], [-0.525, 0.15], [-0.30, 0.15], [-0.30, 0.95], [0.30, 0.95], [0.30, 0.15], [0.525, 0.15], [0.525, 0]];
const _n = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// ------------------------------------------------------------------ colours (multiply the material colour)

const C_BARRIER: Rgb = [0.86, 0.86, 0.84];
const C_BARRIER_TOP: Rgb = [0.93, 0.93, 0.91];
const C_ISLAND_TOP: Rgb = [0.30, 0.34, 0.20];   // planted top of the cross-road median islands
const C_HEDGE: Rgb = [0.11, 0.20, 0.07];        // clipped hedge on the frontage buffer (darker than the verge grass)
const C_PEDESTAL: Rgb = [0.72, 0.72, 0.70];
const C_APRON: Rgb = [0.62, 0.62, 0.60];
const C_GRATE: Rgb = [0.16, 0.16, 0.17];
const C_VERGE_GRASS: Rgb = [0.19, 0.32, 0.12];   // mown, irrigated verge: a shade fresher than the terrain's lawn (0.064, 0.105, 0.038 before the
                                                 // material's 0xb8b4aa base), not the bright band it was: from 200-1500 m it must read as a strip of
                                                 // the same grass as the lots, kept, not as a neon ribbon
const C_VERGE_SAND: Rgb = [0.74, 0.66, 0.52];    // packed sand and shell where the highway crosses the beaches
const S_GALV: Rgb = [0.56, 0.58, 0.60];       // galvanised guardrail, posts, gantry steel (satin, blotchy in the shader)
const S_POLE: Rgb = [0.46, 0.47, 0.49];       // weathered galvanised lighting columns (read against the pale pavement from the air)
const S_DARK: Rgb = [0.30, 0.31, 0.33];       // sign backs, brackets
const S_HEAD: Rgb = [0.90, 0.88, 0.82];       // cobra-head luminaire
const S_WHITE: Rgb = [0.92, 0.92, 0.90];      // delineator posts
const S_AMBER: Rgb = [1.0, 0.72, 0.18];       // reflectors facing traffic
const S_DRUM: Rgb = [0.95, 0.72, 0.12];
const S_FACE: Rgb = [1, 1, 1];                // sign faces (the atlas carries the colour)
const S_YELLOW: Rgb = [0.95, 0.78, 0.10];     // chevron panel backs
const S_WOOD: Rgb = [0.42, 0.34, 0.25];       // guardrail posts on the sandy approaches

// ------------------------------------------------------------------ materials

/** Concrete of the barriers, pedestals and inlets: `aInfo` = (kind, metres along, height above the base) drives
 *  the barrier's section joints, tyre scuffs and spray grime; `aAxis` gives the barrier its minimum screen width. */
const CONCRETE_FRAG = /* glsl */ `
{
  float kind = vInfoH.x;
  float n = fbm3(vWorldPosH.xz * 0.45);
  if (kind > 0.5 && kind < 1.5) {
    float along = vInfoH.y;
    float h = vInfoH.z;
    float fwA = max(fwidth(along), 1e-4);
    // precast sections of 6.1 m: a dark joint line, chamfered, that fades to its mean once a pixel spans metres
    float jf = fract(along / 6.1);
    float joint = mix(aaLine((jf - 0.5) * 6.1, 0.018, fwA), 0.006, smoothstep(0.8, 2.5, fwA));
    diffuseColor.rgb *= 1.0 - 0.45 * joint;
    // each section was poured from a slightly different batch
    diffuseColor.rgb *= 0.96 + 0.08 * hash11(floor(along / 6.1) + 3.0);
    // tyre scuffs: black rubber smears 20-60 cm up the faces, in runs where traffic has brushed the barrier
    float scuffRun = smoothstep(0.42, 0.62, fbm3(vec2(along * 0.045, 7.0)));
    float scuff = smoothstep(0.12, 0.28, h) * (1.0 - smoothstep(0.48, 0.7, h)) * scuffRun * (0.45 + 0.55 * fbm3(vec2(along * 0.6, h * 3.0)));
    diffuseColor.rgb *= 1.0 - 0.4 * scuff;
    // road spray grime along the base, a paler cap, and weathering blotches
    diffuseColor.rgb *= 1.0 - 0.28 * (1.0 - smoothstep(0.02, 0.22, h)) * (0.6 + 0.4 * n);
    diffuseColor.rgb *= 1.0 + 0.06 * smoothstep(0.72, 0.81, h);
    diffuseColor.rgb *= 0.92 + 0.16 * n;
    roughnessFactor = 0.86 - 0.1 * scuff;
    // under the lighting poles (vInfoH.w: the station of the nearest, 0 where the run has none) the pale concrete
    // glows in the lamp pool at night, brightest along the cap, the spray-grimed base in its own shadow
    float dPoleB = along - vInfoH.w;
    hwPool = step(0.5, vInfoH.w) * exp(-pow(dPoleB / 12.0, 2.0)) * (0.3 + 0.35 * smoothstep(0.0, 0.7, h));
    hwPoolTint = diffuseColor.rgb;
  } else if (kind > 1.5 && kind < 2.5) {
    // cast-iron inlet grate: bars across the flow (0.9 m grate, 8 slots)
    float u = vInfoH.y;
    float fwU = max(fwidth(u), 1e-4);
    float bar = mix(aaLine((fract(u * 8.0) - 0.5) / 8.0, 0.035, fwU), 0.55, smoothstep(0.02, 0.06, fwU));
    diffuseColor.rgb *= 0.55 + 0.9 * bar;
    roughnessFactor = 0.7;
  } else if (kind > 2.5 && kind < 3.5) {
    // verge: a dark gravel band along the pavement edge (ragged where the cover takes over), then the cover the
    // vertex colour names (mown grass, or sand on the beaches); the grain fades to its mean as a pixel grows past it.
    // across: metres from the pavement edge
    float across = vInfoH.z;
    float fp = length(fwidth(vWorldPosH.xz));
    float fwAcross = max(fwidth(across), 1e-4);
    float grain = mix(vnoise(vWorldPosH.xz * 2.6), 0.5, smoothstep(0.2, 0.7, fp));
    float bandW = ${VERGE_GRAVEL_W.toFixed(2)};
    float band = 1.0 - smoothstep(bandW - 0.2, bandW + 0.35 + 0.6 * fbm3(vWorldPosH.xz * 0.9), across);
    vec3 gravel = vec3(0.36, 0.345, 0.31) * (0.84 + 0.32 * grain);
    vec3 cover = diffuseColor.rgb * (0.86 + 0.28 * n) * (0.92 + 0.16 * grain);
    float isGrass = step(diffuseColor.r, diffuseColor.g);
    // mower passes 2.4 m wide, the nap alternating pass to pass (fades to its mean once a pass is a pixel)
    float tri = abs(fract(across / 2.4 + 0.3) - 0.5) * 2.0;
    float stripe = mix(smoothstep(0.3, 0.7, tri), 0.5, smoothstep(0.5, 2.4, fwAcross));
    cover *= 1.0 + isGrass * (0.05 - 0.1 * stripe);
    // the drainage swale 5-8 m out: damper ground, the grass darker and rank
    float swale = smoothstep(4.6, 6.0, across) * (1.0 - smoothstep(7.0, 8.4, across));
    cover *= 1.0 - isGrass * swale * (0.14 + 0.08 * n);
    // where the irrigation misses, 40-80 m patches have dried to the khaki of the yards around (the terrain's dry
    // grass, 0.19, 0.155, 0.064, before the material base), and past the mowing limit the outer 4 m go over to it,
    // so the strip is neither one tone along nor a hard-edged band across
    vec3 dry = vec3(0.40, 0.34, 0.16) * (0.86 + 0.28 * n) * (0.92 + 0.16 * grain);
    float dryPatch = smoothstep(0.5, 0.64, fbm3(vWorldPosH.xz * 0.017 + 4.0));
    float outer = smoothstep(7.5, 12.0, across);
    cover = mix(cover, dry, isGrass * max(0.8 * dryPatch, 0.55 * outer));
    diffuseColor.rgb = mix(cover, gravel, band);
    roughnessFactor = 0.97;
  } else if (kind > 3.5 && kind < 4.5) {
    // wearing course: dark lane asphalt with its own paint (yellow beside the barrier, dashed lane line, edge line
    // with a rumble band outside it), each lane resurfaced in its own 300 m contracts, wheel paths rubbed darker,
    // patch repairs, reflective cracks; over the sealed joint the shoulder is an older, paler mix, dusty toward the
    // verge. The vertex colour carries the slow wear (braking rubber on the approaches to the junctions). flag: 0
    // paint, 1 a street mouth (no edge line), 2 a junction box or the toll plaza (no paint), 3 the median gap between
    // barrier terminals (double yellow). Fine detail fades to its mean as a pixel grows past it: nothing shimmers.
    float flag = floor((kind - 4.0) * 10.0 + 0.5);
    float along = vInfoH.y;
    float xm = abs(vInfoH.z);
    float fwA = max(fwidth(along), 1e-4);
    float fwX = max(fwidth(xm), 1e-4);
    float nC = fbm3(vWorldPosH.xz * 0.15);
    float n2 = vnoise(vWorldPosH.xz * 1.7);
    float onShoulder = step(${PAVE_JOINT.toFixed(2)}, xm);
    vec3 asphalt = mix(vec3(0.07, 0.07, 0.067), vec3(0.11, 0.107, 0.104), nC) * (0.94 + 0.12 * n2);
    float lane = step(${PAVE_LANE_LINE.toFixed(2)}, xm);
    float secTone = 0.84 + 0.32 * hash11(floor((along + lane * 137.0) / 310.0) * 7.0 + lane + 11.0);
    asphalt *= mix(secTone, 1.0, 0.3);
    float wheel = exp(-pow((abs(xm - mix(1.5, 4.7, lane)) - 0.8) * 2.5, 2.0)) * (1.0 - onShoulder);
    asphalt *= 1.0 - 0.16 * wheel;
    vec3 shoulderMix = mix(vec3(0.20, 0.20, 0.19), vec3(0.27, 0.265, 0.25), nC) * (0.95 + 0.10 * n2);
    shoulderMix *= 1.0 + 0.12 * smoothstep(${(PAVE_JOINT + 1.5).toFixed(2)}, 10.6, xm) * (0.5 + 0.5 * fbm3(vWorldPosH.xz * 0.5 + 3.0));
    asphalt = mix(asphalt, shoulderMix, onShoulder);
    asphalt *= 1.0 - 0.14 * smoothstep(0.62, 0.72, fbm3(vWorldPosH.xz * 0.04 + 8.0));
    float crack = aaLine((fract(along / 13.7) - 0.5) * 13.7, 0.02, fwA) * step(0.45, hash11(floor(along / 13.7) + 5.0)) * (1.0 - smoothstep(0.3, 1.0, fwA));
    asphalt *= 1.0 - 0.3 * crack;
    asphalt *= 1.0 - 0.35 * aaLine(xm - ${PAVE_JOINT.toFixed(2)}, 0.035, fwX);
    float noPaint = step(1.5, flag) * (1.0 - step(2.5, flag));
    float gap = step(2.5, flag);
    float edgeOn = 1.0 - step(0.5, flag);
    // the toll plaza (vColor.g: its station, 0 elsewhere): over the 110 m before the island noses the shoulder opens
    // as the third gate lane - the solid edge line becomes a dashed lane line (the diverge; the same on the way out,
    // where the lane ends and the traffic merges back) - and a hatched nose is painted on the pavement in front of
    // every island's attenuator, 12 m long, tapering to a point
    float dPlaza = abs(along - vColor.g);
    float fan = step(0.5, vColor.g) * step(dPlaza, 110.0);
    edgeOn *= 1.0 - fan;
    float dashPulse = mix(aaLine((fract(along / 9.0) - 0.17) * 9.0, 1.53, fwA), 0.34, smoothstep(2.0, 6.0, fwA));
    float white = (aaLine(xm - ${PAVE_LANE_LINE.toFixed(2)}, 0.06, fwX) * dashPulse + aaLine(xm - ${PAVE_EDGE_LINE.toFixed(2)}, 0.075, fwX) * (edgeOn + fan * dashPulse)) * (1.0 - gap);
    float yellow = aaLine(xm - mix(0.62, 0.15, gap), 0.06, fwX);
    float wearN = 0.7 + 0.3 * smoothstep(0.3, 0.7, fbm3(vec2(along * 0.7, xm * 3.0)));
    float paintWear = wearN * (1.0 - noPaint);
    white *= paintWear;
    yellow *= paintWear;
    vec3 col = mix(asphalt, vec3(0.80, 0.80, 0.78), white);
    col = mix(col, vec3(0.85, 0.66, 0.16), yellow);
    float rumble = step(6.5, xm) * (1.0 - step(6.85, xm)) * edgeOn * mix(aaLine((fract(along / 0.3) - 0.5) * 0.3, 0.05, fwA), 0.33, smoothstep(0.1, 0.3, fwA));
    col *= 1.0 - 0.28 * rumble;
    // the signalised junction this carriageway stops at (vColor.b: the station of its 24 m box, 0 elsewhere): a stop
    // bar across the lanes 60 cm before the box, zebra crossings 3 m wide inside both edges of the box. Traffic on
    // the +a carriageway runs toward +s (traffic.ts), so its approach is the side where the box lies ahead.
    float jS = vColor.b;
    float hasJ = step(0.5, jS);
    float toBox = sign(vInfoH.z) * (jS - along) - 12.0;
    float dBox = abs(along - jS);
    float stopBar = hasJ * aaLine(toBox - 0.85, 0.25, fwA) * step(0.62, xm) * (1.0 - step(6.35, xm));
    float zebraBand = hasJ * step(8.5, dBox) * (1.0 - step(11.5, dBox));
    float zebra = zebraBand * mix(aaLine((fract(xm + 0.5) - 0.5), 0.25, fwX), 0.5, smoothstep(0.3, 1.0, fwX));
    col = mix(col, vec3(0.80, 0.80, 0.78), max(stopBar, zebra) * wearN);
    float dNose = dPlaza - 17.5;
    float noseT = step(0.5, vColor.g) * step(0.0, dNose) * clamp(1.0 - dNose / 12.0, 0.0, 1.0);
    float nose = step(0.001, noseT) * min(1.0, step(xm, 1.05 * noseT) + step(abs(xm - 3.1), 0.7 * noseT) + step(abs(xm - 6.35), 0.7 * noseT));
    float fwD = max(fwA, fwX);
    float stripes = mix(aaLine((fract((along + xm) / 0.9) - 0.5) * 0.9, 0.18, fwD), 0.42, smoothstep(0.3, 1.2, fwD));
    col = mix(col, vec3(0.80, 0.80, 0.78), nose * stripes * (0.75 + 0.25 * smoothstep(0.3, 0.7, fbm3(vec2(along * 0.9, xm * 2.0)))));
    diffuseColor.rgb = col * vColor.r;
    roughnessFactor = 0.84 - 0.05 * wheel;
    // the lamp pool of the nearest lighting pole (vInfoH.w: its station): twin cobra heads 2.9 m either side of the
    // median, 11.4 m up, so the pool is a broad lozenge across both carriageways that fades over ~25 m along
    float dPole = along - vInfoH.w;
    hwPool = 1.4 * step(0.5, vInfoH.w) * exp(-pow(dPole / 12.0, 2.0)) * exp(-pow(max(abs(xm) - 2.9, 0.0) / 7.5, 2.0));
    hwPoolTint = col;
  } else if (kind > 4.5 && kind < 5.5) {
    // frontage street course: the two-lane district street that runs beside the highway's shoulder, resurfaced in
    // the lane asphalt of the highway with a local street's paint - a dashed yellow centre only - the wheel paths of
    // its two lanes 1.8 m off the centre (traffic.ts), a damp gutter along both kerbs. vColor: (half width, start
    // and end station of the nearest junction box; 0 0 where there is none): plain asphalt through the box, the dash
    // stopped 5 m short of it, as roads.ts stops its own
    float along = vInfoH.y;
    float xs = vInfoH.z;
    float xm = abs(xs);
    float fwA = max(fwidth(along), 1e-4);
    float fwX = max(fwidth(xm), 1e-4);
    float nC = fbm3(vWorldPosH.xz * 0.15);
    float n2 = vnoise(vWorldPosH.xz * 1.7);
    float a = max(vColor.g - along, along - vColor.b);
    float hasBox = step(0.5, vColor.b);
    float inBox = hasBox * (1.0 - clamp(a / fwA + 0.5, 0.0, 1.0));
    float lineOK = mix(1.0, clamp((a - 5.0) / fwA + 0.5, 0.0, 1.0), hasBox);
    vec3 asphalt = mix(vec3(0.075, 0.075, 0.072), vec3(0.12, 0.117, 0.113), nC) * (0.94 + 0.12 * n2);
    float secTone = 0.86 + 0.28 * hash11(floor(along / 240.0) * 5.0 + 17.0);
    asphalt *= mix(secTone, 1.0, 0.3 + 0.7 * inBox);
    float wheel = exp(-pow((abs(xm - 1.8) - 0.8) * 2.5, 2.0)) * (1.0 - inBox);
    asphalt *= 1.0 - 0.14 * wheel;
    asphalt *= 1.0 - 0.14 * smoothstep(0.62, 0.72, fbm3(vWorldPosH.xz * 0.04 + 8.0)) * (1.0 - inBox);
    float crack = aaLine((fract(along / 11.3) - 0.5) * 11.3, 0.02, fwA) * step(0.5, hash11(floor(along / 11.3) + 9.0)) * (1.0 - smoothstep(0.3, 1.0, fwA));
    asphalt *= 1.0 - 0.3 * crack * (1.0 - inBox);
    asphalt *= 1.0 - 0.2 * smoothstep(vColor.r - 0.9, vColor.r - 0.2, xm) * (1.0 - inBox);
    float dashPulse = mix(aaLine((fract(along / 12.0) - 0.125) * 12.0, 1.5, fwA), 0.25, smoothstep(2.0, 6.0, fwA));
    float yellow = aaLine(xs, 0.07, fwX) * dashPulse * lineOK * (0.7 + 0.3 * smoothstep(0.3, 0.7, fbm3(vec2(along * 0.7, xs * 3.0))));
    diffuseColor.rgb = mix(asphalt, vec3(0.85, 0.66, 0.16), yellow * 0.92);
    roughnessFactor = 0.84 - 0.05 * wheel;
  } else {
    diffuseColor.rgb *= 0.9 + 0.2 * n;
    // run-off streaks down the pedestals
    diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.55, 0.8, fbm3(vec2(vWorldPosH.x + vWorldPosH.z, vWorldPosH.y * 0.3) * 0.9));
  }
}
`;

/** `lampGlow`: the night factor of the lamps (bridges.ts lampGlowFor), which lights the wearing course's lamp pools */
function createConcreteMaterial(pixelScale: THREE.IUniform<number>, lampGlow: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.9, metalness: 0.0, vertexColors: true, transparent: true, depthWrite: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPixelScale = pixelScale;
    shader.uniforms.uLampGlow = lampGlow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aAxis; attribute vec4 aInfo; varying vec4 vInfoH; varying float vCover; varying vec3 vWorldPosH; uniform float uPixelScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvInfoH = aInfo;\n${MIN_WIDTH_VERT}\nvWorldPosH = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec4 vInfoH; varying float vCover; varying vec3 vWorldPosH; uniform float uLampGlow;\n${GLSL_NOISE}\n${GLSL_AA_LINE}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vCover;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nfloat hwPool = 0.0; vec3 hwPoolTint = vec3(0.0);\n${CONCRETE_FRAG}`)
      // the lamp pools: warm sodium-white light reflected by the course and the barrier (their own tint, so the paint
      // and the pale concrete shine brighter than the asphalt)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vec3(1.0, 0.82, 0.55) * hwPoolTint * (hwPool * uLampGlow);');
  };
  mat.customProgramCacheKey = () => 'highway-concrete-v4';
  return mat;
}

/** Galvanised steel + sign faces: vertex-coloured satin metal whose albedo and roughness are blotched by the
 *  zinc spangle; `aGlow` marks the lamp heads (full) and the lit sign faces (faint); `uv` addresses the sign
 *  atlas (0,0 is a white texel, so plain steel is unaffected by the map). */
function createSteelMaterial(pixelScale: THREE.IUniform<number>, atlas: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.55, vertexColors: true, map: atlas, emissive: new THREE.Color(1.0, 0.8, 0.52), emissiveIntensity: 0, transparent: true, depthWrite: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPixelScale = pixelScale;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow; attribute vec4 aAxis; varying float vGlow; varying float vCover; varying vec3 vWorldPosH; uniform float uPixelScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGlow = aGlow;\n${MIN_WIDTH_VERT}\nvWorldPosH = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vGlow; varying float vCover; varying vec3 vWorldPosH;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${STEEL_ALPHA_FRAG}\nfloat spangle = fbm3(vWorldPosH.xz * 1.9 + vWorldPosH.y * 1.3);\nfloat plainSteel = 1.0 - step(0.001, vMapUv.x + vMapUv.y);\ndiffuseColor.rgb *= 1.0 + plainSteel * (0.24 * spangle - 0.12);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + plainSteel * 0.3 * (spangle - 0.5), 0.25, 1.0);\nroughnessFactor = mix(roughnessFactor, 0.45, 1.0 - plainSteel);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= plainSteel;')
      // the emitters glow in their own (normalised) vertex colour: warm white lamp heads, red / green signal lenses
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow * vColor.rgb / max(max(vColor.r, vColor.g), max(vColor.b, 1e-3));');
  };
  mat.customProgramCacheKey = () => 'highway-steel-v2';
  return mat;
}

// ------------------------------------------------------------------ sign atlas

interface SignFace { u0: number; v0: number; u1: number; v1: number; }
type Arrow = 'up' | 'left' | 'right' | 'both' | null;

/** Canvas atlas of the sign faces (guide signs, exit tabs, chevrons, speed limits), packed on demand; the
 *  bottom-left corner stays white for the plain steel. Destinations are the districts and islands of Bahía Vista. */
class SignAtlas {
  readonly width = 2048;
  readonly height = 1024;
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cache = new Map<string, SignFace>();
  private x = 0; private y = 0; private rowH = 0;
  /** fraction of the atlas rows in use (for the build counts) */
  get used(): number { return (this.y + this.rowH) / this.height; }

  constructor() {
    const c = document.createElement('canvas');
    c.width = this.width; c.height = this.height;
    this.canvas = c;
    this.ctx = c.getContext('2d')!;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  private alloc(w: number, h: number): [number, number] {
    const gutter = 6;
    if (this.x + w + gutter > this.width) { this.x = 0; this.y += this.rowH + gutter; this.rowH = 0; }
    // the last 48 rows stay white (uv 0,0 of the plain steel)
    if (this.y + h > this.height - 48) throw new Error('sign atlas full');
    const at: [number, number] = [this.x, this.y];
    this.x += w + gutter;
    this.rowH = Math.max(this.rowH, h);
    return at;
  }

  private face(x: number, y: number, w: number, h: number): SignFace {
    // inset a texel so the bilinear lookup never bleeds the neighbour
    return { u0: (x + 1) / this.width, v0: 1 - (y + h - 1) / this.height, u1: (x + w - 1) / this.width, v1: 1 - (y + 1) / this.height };
  }

  private arrow(cx: number, cy: number, size: number, dir: 'up' | 'left' | 'right', color: string): void {
    const c = this.ctx;
    c.save();
    c.translate(cx, cy);
    if (dir === 'left') c.rotate(-Math.PI / 2); else if (dir === 'right') c.rotate(Math.PI / 2);
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = size * 0.16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, size * 0.5); c.lineTo(0, -size * 0.2); c.stroke();
    c.beginPath(); c.moveTo(-size * 0.36, -size * 0.05); c.lineTo(0, -size * 0.5); c.lineTo(size * 0.36, -size * 0.05); c.closePath(); c.fill();
    c.restore();
  }

  private text(s: string, x: number, y: number, px: number, color: string, align: CanvasTextAlign = 'left', weight = 'bold'): void {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `${weight} ${px}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }

  /** Guide sign: green panel with a white border, up to two destination lines and an arrow. `w`/`h` in px. */
  guide(lines: string[], arrow: Arrow, w = 320, h = 176, color = '#0b6b3f'): SignFace {
    const key = `g|${lines.join('|')}|${arrow}|${w}x${h}|${color}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = color; c.fillRect(x, y, w, h);
    c.strokeStyle = '#f4f4f0'; c.lineWidth = Math.max(2, h * 0.02);
    c.strokeRect(x + h * 0.035, y + h * 0.035, w - h * 0.07, h - h * 0.07);
    const textW = arrow ? w - h * 0.62 : w;
    const px0 = lines.length > 1 ? h * 0.34 : h * 0.42;
    for (let i = 0; i < lines.length; i++) {
      const px = i === 0 ? px0 : px0 * 0.8;
      const ly = lines.length > 1 ? y + h * (0.32 + 0.38 * i) : y + h * 0.5;
      // shrink to fit
      c.font = `bold ${px}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
      const fit = Math.min(px, (px * (textW - h * 0.25)) / Math.max(1, c.measureText(lines[i]).width));
      this.text(lines[i], x + h * 0.12, ly, fit, '#f6f6f2');
    }
    if (arrow === 'both') { this.arrow(x + w - h * 0.5, y + h * 0.5, h * 0.4, 'left', '#f6f6f2'); this.arrow(x + w - h * 0.2, y + h * 0.5, h * 0.4, 'right', '#f6f6f2'); }
    else if (arrow) this.arrow(x + w - h * 0.33, y + h * 0.5, h * 0.5, arrow, '#f6f6f2');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  /** Small white tab over a guide sign ("CAUSEWAY 1 KM"), green text. */
  tab(label: string, w = 176, h = 56): SignFace {
    const key = `t|${label}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#0b6b3f'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#f4f4f0'; c.lineWidth = 2; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
    this.text(label, x + w / 2, y + h / 2, h * 0.5, '#f6f6f2', 'center');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  chevron(): SignFace {
    const key = 'chevron';
    const hit = this.cache.get(key);
    if (hit) return hit;
    const w = 96, h = 120;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#f2c11a'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
    c.fillStyle = '#111';
    c.beginPath();
    c.moveTo(x + w * 0.2, y + h * 0.18); c.lineTo(x + w * 0.5, y + h * 0.18); c.lineTo(x + w * 0.82, y + h * 0.5); c.lineTo(x + w * 0.5, y + h * 0.82); c.lineTo(x + w * 0.2, y + h * 0.82); c.lineTo(x + w * 0.52, y + h * 0.5); c.closePath();
    c.fill();
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  /** Round speed limit (km/h): white disc, red ring, black figure; the corners of the square face take the tone of
   *  the panel back so the sign reads as a disc. */
  speed(limit: string): SignFace {
    const key = `speed|${limit}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const w = 112, h = 112;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#4a4c50'; c.fillRect(x, y, w, h);
    c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.47, 0, Math.PI * 2); c.fillStyle = '#d0281e'; c.fill();
    c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.36, 0, Math.PI * 2); c.fillStyle = '#f6f6f2'; c.fill();
    this.text(limit, x + w / 2, y + h * 0.52, 46, '#111', 'center');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }
}

// ------------------------------------------------------------------ chains (the road surface as roads.ts builds it)

/** one roads.ts row: the pavement heights at the two edges, and the course lift over the pavement at the five knots
 *  across (LIFT_KNOTS, in units of hw) - zero wherever the pavement clears the rendered terrain */
interface Row { hL: number; hR: number; up: number[]; }
const LIFT_KNOTS: readonly number[] = [-1, -0.5, 0, 0.5, 1];
interface Chain {
  id: string;
  cls: RoadClass;
  pts: Vec2[];
  hw: number;
  lanes: number;
  dirs: Vec2[];
  /** mitred cross vector per vertex (roads.ts): the pavement edge is at `p + cross * hw` */
  cross: Vec2[];
  segLen: number[];
  cum: number[];
  total: number;
  /** road rows per segment (heights of the left / right pavement edge at each row) */
  rows: { steps: number; row: Row[] }[];
  bridgeStart: BridgeSpec | null;
  bridgeEnd: BridgeSpec | null;
}

/** one leg of a road leaving a junction: the point on the highway axis it leaves from, its unit direction away
 *  from the highway, its length to the far end and the segment (width, lift) it belongs to */
interface Arm { x: number; z: number; dx: number; dz: number; len: number; seg: RoadSegment; }
/** a road meeting the chain: station, whether it is an arterial / highway, the side (+1 = toward +cross, i.e.
 *  the right of the chain's forward direction) it leaves toward (0 when it crosses), and its arms */
interface Junction { s: number; major: boolean; side: -1 | 0 | 1; arms: Arm[]; }

function buildChains(map: WorldMap, segments: RoadSegment[]): Chain[] {
  const chains: RoadSegment[][] = [];
  for (const s of segments) {
    if (s.cls !== 'highway' && s.cls !== 'causeway') continue;
    if (Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) < 1) continue;
    const last = chains[chains.length - 1];
    const prev = last && last[last.length - 1];
    if (prev && prev.cls === s.cls && prev.width === s.width && prev.lift === s.lift && prev.b[0] === s.a[0] && prev.b[1] === s.a[1]) last.push(s);
    else chains.push([s]);
  }
  const out: Chain[] = [];
  for (const chain of chains) {
    const pts: Vec2[] = [chain[0].a, ...chain.map((s) => s.b)];
    const m = pts.length;
    const dirs: Vec2[] = [], segLen: number[] = [], cum: number[] = [0];
    for (let i = 0; i < m - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dz);
      dirs.push([dx / len, dz / len]); segLen.push(len); cum.push(cum[i] + len);
    }
    const cross: Vec2[] = [];
    for (let i = 0; i < m; i++) {
      const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(m - 2, i)];
      let nx = -(d0[1] + d1[1]), nz = d0[0] + d1[0];
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl; nz /= nl;
      const cosHalf = Math.max(0.5, nx * -d1[1] + nz * d1[0]);
      cross.push([nx / cosHalf, nz / cosHalf]);
    }
    const hw = chain[0].width * 0.5;
    const rows: Chain['rows'] = [];
    for (let i = 0; i < m - 1; i++) {
      const steps = Math.max(1, Math.ceil(segLen[i] / ROAD_STEP));
      const row: Row[] = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        const cx = cross[i][0] + (cross[i + 1][0] - cross[i][0]) * t, cz = cross[i][1] + (cross[i + 1][1] - cross[i][1]) * t;
        row.push({ hL: map.heightAt(x - cx * hw, z - cz * hw) + ROAD_LIFT, hR: map.heightAt(x + cx * hw, z + cz * hw) + ROAD_LIFT, up: [0, 0, 0, 0, 0] });
      }
      rows.push({ steps, row });
    }
    const near = (p: Vec2, q: Vec2) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 6;
    const bridgeAt = (p: Vec2) => map.bridges.find((b) => near(b.pts[0], p) || near(b.pts[b.pts.length - 1], p)) ?? null;
    const first = chain[0];
    const id = map.roads.find((r) => r.pts[0][0] === first.a[0] && r.pts[0][1] === first.a[1] && r.cls === first.cls)?.id ?? `hwy-${out.length}`;
    const c: Chain = { id, cls: first.cls, pts, hw, lanes: first.lanes, dirs, cross, segLen, cum, total: cum[m - 1], rows, bridgeStart: bridgeAt(pts[0]), bridgeEnd: bridgeAt(pts[m - 1]) };
    computeLifts(map, c);
    out.push(c);
  }
  return out;
}

/** The roads.ts pavement follows the height field at its two edges only, every 15 m, so where the ground crowns under
 *  the carriageway - the dune crest the spit highway runs along, a bump under the middle of the road - the rendered
 *  terrain stands through the pavement in sand-coloured blotches; the clipmap also samples the height texture half a
 *  texel off `heightAt` (terrain.ts: no half-texel offset in the uv), so on any slope it sits up to a few decimetres
 *  from the CPU height field. The course and everything standing on the pavement ride over both: per row, at the
 *  five knots across, the lift is the largest excess of the terrain (heightAt at the point and half a texel back,
 *  as the clipmap renders it) over the pavement anywhere within a full row along and a full knot across (so the
 *  bilinear field between the knots is never under a sampled point), plus 6 cm; zero over nearly all the network.
 *  Where the chain runs onto a deck its end row is pinned to the landing surface the deck alignment uses
 *  (bridges.ts landingSurface, which covers the same last 30 m), so the course arrives flush with the approach slab. */
function computeLifts(map: WorldMap, c: Chain): void {
  const terrain = (x: number, z: number) => terrainAt(map, x, z);
  const N_ALONG = 7, N_ACROSS = 7;
  const frames: Frame[] = [];
  for (let i = 0; i < c.rows.length; i++) {
    const r = c.rows[i];
    for (let k = 0; k <= r.steps; k++) {
      if (i > 0 && k === 0) { r.row[0].up = c.rows[i - 1].row[c.rows[i - 1].steps].up; continue; }
      const s = c.cum[i] + c.segLen[i] * (k / r.steps);
      frames.length = 0;
      for (let q = 0; q < N_ALONG; q++) frames.push(frameAt(c, clamp(s + ((q / (N_ALONG - 1)) * 2 - 1) * ROAD_STEP, 0, c.total)));
      const up = r.row[k].up;
      for (let j = 0; j < LIFT_KNOTS.length; j++) {
        let need = 0;
        for (const f of frames) {
          for (let q = 0; q < N_ACROSS; q++) {
            const a = clamp((LIFT_KNOTS[j] + ((q / (N_ACROSS - 1)) * 2 - 1) * 0.5) * c.hw, -c.hw, c.hw);
            need = Math.max(need, terrain(f.x + f.rx * a, f.z + f.rz * a) + 0.06 - pavementAt(c, f.s, a));
          }
        }
        up[j] = need;
      }
    }
  }
  // the landing surface is evaluated exactly as the deck alignment evaluates it (the deck's own end point and the
  // direction the road arrives along), so the two heights agree to the centimetre
  const pin = (s: number, row: Row, spec: BridgeSpec) => {
    const p = s === 0 ? c.pts[0] : c.pts[c.pts.length - 1];
    const n = spec.pts.length;
    const atStart = Math.hypot(spec.pts[0][0] - p[0], spec.pts[0][1] - p[1]) <= Math.hypot(spec.pts[n - 1][0] - p[0], spec.pts[n - 1][1] - p[1]);
    const [ex, ez] = atStart ? spec.pts[0] : spec.pts[n - 1], [ox, oz] = atStart ? spec.pts[1] : spec.pts[n - 2];
    const l = Math.hypot(ox - ex, oz - ez) || 1;
    const h = landingSurface(map, ex, ez, (ox - ex) / l, (oz - ez) / l, 11);
    for (let j = 0; j < LIFT_KNOTS.length; j++) row.up[j] = Math.max(0, h - pavementAt(c, s, LIFT_KNOTS[j] * c.hw));
  };
  if (c.bridgeStart) pin(0, c.rows[0].row[0], c.bridgeStart);
  if (c.bridgeEnd) { const last = c.rows[c.rows.length - 1]; pin(c.total, last.row[last.steps], c.bridgeEnd); }
}

function locate(c: Chain, s: number): { i: number; t: number } {
  s = clamp(s, 0, c.total);
  let i = 0;
  while (i < c.segLen.length - 1 && s > c.cum[i + 1]) i++;
  return { i, t: clamp((s - c.cum[i]) / Math.max(c.segLen[i], 1e-6), 0, 1) };
}

/** Height of the roads.ts pavement at `s` along and `a` across (in units of the mitred cross vector; `a = ±hw` is
 *  the pavement edge), interpolated over the same rows roads.ts triangulates. */
function pavementAt(c: Chain, s: number, a: number): number {
  const { i, t } = locate(c, s);
  const r = c.rows[i];
  const u = t * r.steps;
  const k = Math.min(r.steps - 1, Math.floor(u)), f = u - k;
  const hL = lerp(r.row[k].hL, r.row[k + 1].hL, f), hR = lerp(r.row[k].hR, r.row[k + 1].hR, f);
  return lerp(hL, hR, clamp((a / c.hw + 1) * 0.5, 0, 1));
}

/** The course lift over the pavement (computeLifts), bilinear over the rows and the knots across. */
function liftAt(c: Chain, s: number, a: number): number {
  const { i, t } = locate(c, s);
  const r = c.rows[i];
  const u = t * r.steps;
  const k = Math.min(r.steps - 1, Math.floor(u)), f = u - k;
  const w = clamp((a / c.hw + 1) * 2, 0, LIFT_KNOTS.length - 1.001);
  const j = Math.floor(w), g = w - j;
  const u0 = r.row[k].up, u1 = r.row[k + 1].up;
  return lerp(lerp(u0[j], u0[j + 1], g), lerp(u1[j], u1[j + 1], g), f);
}

/** Height of the surface the furniture stands on and the course lies on: the pavement, lifted where the terrain
 *  would stand through it. */
function surfaceAt(c: Chain, s: number, a: number): number {
  return pavementAt(c, s, a) + liftAt(c, s, a);
}

function frameAt(c: Chain, s: number): Frame {
  const { i, t } = locate(c, s);
  const a = c.pts[i], b = c.pts[i + 1];
  const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
  const rx = c.cross[i][0] + (c.cross[i + 1][0] - c.cross[i][0]) * t, rz = c.cross[i][1] + (c.cross[i + 1][1] - c.cross[i][1]) * t;
  return { x, y: surfaceAt(c, s, 0), z, rx, rz, dx: c.dirs[i][0], dz: c.dirs[i][1], s };
}

/** World position `a` across the pavement at `s`, on the surface plus `up`. */
function at(c: Chain, s: number, a: number, up = 0): THREE.Vector3 {
  const f = frameAt(c, s);
  return new THREE.Vector3(f.x + f.rx * a, surfaceAt(c, s, a) + up, f.z + f.rz * a);
}

/** Every road row between s0 and s1 plus the two ends (so lofts follow the pavement exactly). */
function stations(c: Chain, s0: number, s1: number): number[] {
  const out = [s0];
  for (let i = 0; i < c.segLen.length; i++) {
    const r = c.rows[i];
    for (let k = 1; k < r.steps; k++) {
      const s = c.cum[i] + (c.segLen[i] * k) / r.steps;
      if (s > s0 + 0.05 && s < s1 - 0.05) out.push(s);
    }
    // the polyline vertices themselves (the mitre changes direction there)
    const sv = c.cum[i + 1];
    if (sv > s0 + 0.05 && sv < s1 - 0.05) out.push(sv);
  }
  out.push(s1);
  return out.sort((p, q) => p - q);
}

/** True when (x, z) lies on the pavement of a road other than the chain's own class (within `margin` of it): the
 *  grid's frontage streets run right beside the coastal highway, and nothing may stand in them. */
function makeRoadTest(c: Chain, segments: RoadSegment[]): (x: number, z: number, margin: number) => boolean {
  const others = segments.filter((s) => s.cls !== c.cls && s.cls !== 'runway' && s.cls !== 'taxiway');
  return (x, z, margin) => {
    for (const s of others) {
      const ax = s.a[0], az = s.a[1], dx = s.b[0] - ax, dz = s.b[1] - az;
      const l2 = dx * dx + dz * dz;
      if (l2 < 1e-6) continue;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      const ex = ax + dx * t - x, ez = az + dz * t - z;
      const r = s.width * 0.5 + margin;
      if (ex * ex + ez * ez < r * r) return true;
    }
    return false;
  };
}

/** Distance from a point to a road segment's centreline. */
function distToSegment(x: number, z: number, s: RoadSegment): number {
  const ax = s.a[0], az = s.a[1], dx = s.b[0] - ax, dz = s.b[1] - az;
  const l2 = dx * dx + dz * dz;
  if (l2 < 1e-6) return Math.hypot(x - ax, z - az);
  const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}

/** Nearest point of the chain's centre line to (x, z): its station, the unsigned lateral distance and the chain's
 *  direction and foot point there. */
function nearestOnChain(c: Chain, x: number, z: number): { s: number; d: number; dx: number; dz: number; x: number; z: number } {
  let best = { s: 0, d: Infinity, dx: 1, dz: 0, x: 0, z: 0 };
  for (let i = 0; i < c.pts.length - 1; i++) {
    const [ax, az] = c.pts[i];
    const len = c.segLen[i];
    if (len < 1e-6) continue;
    const [dx, dz] = c.dirs[i];
    const t = clamp(((x - ax) * dx + (z - az) * dz) / len, 0, 1);
    const fx = ax + dx * t * len, fz = az + dz * t * len;
    const d = Math.hypot(x - fx, z - fz);
    if (d < best.d) best = { s: c.cum[i] + t * len, d, dx, dz, x: fx, z: fz };
  }
  return best;
}

/** A frontage stretch: a district street (graph chain `g`) running beside the highway over the street's stations
 *  s0..s1, the highway on `side` of the street (in the street's mitred cross frame `cross`). */
interface FrontageRun { g: RoadChain; cross: Vec2[]; s0: number; s1: number; side: -1 | 1 }

/** The district streets that run beside the highway: sampled every 10 m, a street is frontage where it lies within
 *  10 degrees of the highway's direction with its near pavement edge from 1.5 m over the highway's edge to 6 m off
 *  it (the coastal grid's street 15 m off the south-hwy-mainland centre line touches the shoulder for 1.2 km, and
 *  read as 22 m of pale pavement with yellow dashes from the air). */
function findFrontage(c: Chain, graph: RoadGraph): FrontageRun[] {
  const runs: FrontageRun[] = [];
  let cx0 = Infinity, cx1 = -Infinity, cz0 = Infinity, cz1 = -Infinity;
  for (const [x, z] of c.pts) { cx0 = Math.min(cx0, x); cx1 = Math.max(cx1, x); cz0 = Math.min(cz0, z); cz1 = Math.max(cz1, z); }
  for (const g of graph.chains) {
    if ((g.cls !== 'street' && g.cls !== 'lane') || g.s1 - g.s0 < FRONTAGE_MIN_LEN || g.rows.length < 2) continue;
    // a quick reject on the street's bounding box against the highway's
    let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
    for (const [x, z] of g.pts) { gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x); gz0 = Math.min(gz0, z); gz1 = Math.max(gz1, z); }
    if (gx1 < cx0 - 40 || gx0 > cx1 + 40 || gz1 < cz0 - 40 || gz0 > cz1 + 40) continue;
    const cross = chainCross(g);
    const step = 10;
    const n = Math.max(1, Math.ceil((g.s1 - g.s0) / step));
    let runStart = -1, lastOk = 0, side: -1 | 1 = 1;
    const flush = () => { if (runStart >= 0 && lastOk - runStart >= FRONTAGE_MIN_LEN) runs.push({ g, cross, s0: runStart, s1: lastOk, side }); runStart = -1; };
    for (let k = 0; k <= n; k++) {
      const s = g.s0 + ((g.s1 - g.s0) * k) / n;
      const f = chainFrame(g, s);
      const p = nearestOnChain(c, f.x, f.z);
      const gap = p.d - c.hw - g.hw;
      const ok = Math.abs(f.dx * p.dx + f.dz * p.dz) > 0.985 && gap > -1.5 && gap < 6;
      // which side of the street the highway lies on (the street's cross vector is its direction turned left)
      const sd: -1 | 1 = (p.x - f.x) * -f.dz + (p.z - f.z) * f.dx >= 0 ? 1 : -1;
      if (ok && (runStart < 0 || sd === side)) { if (runStart < 0) { runStart = s; side = sd; } lastOk = s; }
      else { flush(); if (ok) { runStart = s; side = sd; lastOk = s; } }
    }
    flush();
  }
  return runs;
}

/** The roads.ts pavement surface of a graph chain at station s, `a` across (its rows' edge heights, bilinear). */
function streetSurface(g: RoadChain, s: number, a: number): number {
  const rows = g.rows;
  let lo = 0, hi = rows.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (rows[mid] <= s) lo = mid; else hi = mid - 1; }
  const t = rows[lo + 1] > rows[lo] ? clamp((s - rows[lo]) / (rows[lo + 1] - rows[lo]), 0, 1) : 0;
  const hL = lerp(g.rowY[0][lo], g.rowY[0][lo + 1], t), hR = lerp(g.rowY[1][lo], g.rowY[1][lo + 1], t);
  return lerp(hL, hR, clamp((a / g.hw + 1) * 0.5, 0, 1));
}

/** Stations of other roads meeting the chain: segment crossings and end points on the pavement. */
function findJunctions(c: Chain, segments: RoadSegment[]): Junction[] {
  const js: Junction[] = [];
  const own = new Set<RoadSegment>();
  for (const s of segments) if (s.cls === c.cls && c.pts.some((p) => p[0] === s.a[0] && p[1] === s.a[1]) && c.pts.some((p) => p[0] === s.b[0] && p[1] === s.b[1])) own.add(s);
  for (const s of segments) {
    if (own.has(s) || s.cls === 'runway' || s.cls === 'taxiway') continue;
    const major = s.cls === 'arterial' || s.cls === 'highway' || s.cls === 'causeway';
    for (let i = 0; i < c.segLen.length; i++) {
      const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1];
      // crossing
      const r = [bx - ax, bz - az], q = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
      const den = r[0] * q[1] - r[1] * q[0];
      if (Math.abs(den) > 1e-9) {
        const dx = s.a[0] - ax, dz = s.a[1] - az;
        const t = (dx * q[1] - dz * q[0]) / den, u = (dx * r[1] - dz * r[0]) / den;
        if (t > -0.001 && t < 1.001 && u > -0.001 && u < 1.001) {
          // a crossing, unless the other road only starts / ends here (then it leaves toward its far end)
          const ends = u < 0.02 ? s.b : u > 0.98 ? s.a : null;
          const side: -1 | 0 | 1 = ends ? (Math.sign(c.cross[i][0] * (ends[0] - ax) + c.cross[i][1] * (ends[1] - az)) as -1 | 0 | 1) : 0;
          const px = s.a[0] + q[0] * u, pz = s.a[1] + q[1] * u;
          const arms: Arm[] = [];
          for (const far of ends ? [ends] : [s.a, s.b]) {
            const len = Math.hypot(far[0] - px, far[1] - pz);
            if (len > 1) arms.push({ x: px, z: pz, dx: (far[0] - px) / len, dz: (far[1] - pz) / len, len, seg: s });
          }
          js.push({ s: c.cum[i] + t * c.segLen[i], major, side, arms });
          continue;
        }
      }
      // an end point on (or just off) the pavement
      for (const p of [s.a, s.b]) {
        const px = p[0] - ax, pz = p[1] - az;
        const t = clamp((px * r[0] + pz * r[1]) / (c.segLen[i] * c.segLen[i]), 0, 1);
        const d = Math.hypot(px - r[0] * t, pz - r[1] * t);
        if (d < c.hw + 2.5) {
          const far = p === s.a ? s.b : s.a;
          const side = Math.sign(c.cross[i][0] * (far[0] - ax) + c.cross[i][1] * (far[1] - az)) as -1 | 0 | 1;
          const len = Math.hypot(far[0] - p[0], far[1] - p[1]);
          js.push({ s: c.cum[i] + t * c.segLen[i], major, side, arms: len > 1 ? [{ x: p[0], z: p[1], dx: (far[0] - p[0]) / len, dz: (far[1] - p[1]) / len, len, seg: s }] : [] });
        }
      }
    }
  }
  js.sort((p, q) => p.s - q.s);
  const out: Junction[] = [];
  for (const j of js) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.s - j.s) < 20) { last.major ||= j.major; if (last.side !== j.side) last.side = 0; last.arms.push(...j.arms); continue; }
    out.push({ ...j, arms: [...j.arms] });
  }
  return out;
}

interface Run { s0: number; s1: number; }

function mergeRuns(runs: Run[], gap: number): Run[] {
  runs.sort((p, q) => p.s0 - q.s0);
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && r.s0 <= last.s1 + gap) last.s1 = Math.max(last.s1, r.s1);
    else out.push({ ...r });
  }
  return out;
}

function subtractRuns(base: Run, holes: Run[]): Run[] {
  const out: Run[] = [];
  let s = base.s0;
  for (const h of holes.slice().sort((p, q) => p.s0 - q.s0)) {
    if (h.s1 <= s || h.s0 >= base.s1) continue;
    if (h.s0 > s) out.push({ s0: s, s1: Math.min(h.s0, base.s1) });
    s = Math.max(s, h.s1);
  }
  if (s < base.s1) out.push({ s0: s, s1: base.s1 });
  return out.filter((r) => r.s1 - r.s0 > 2);
}

// ------------------------------------------------------------------ geometry helpers

/** Loft of an open profile along the frames with a per-frame scale and per-vertex extras: `extra` is
 *  [kind, along, height] for the concrete (along and height filled in here), `axisY` the height of the member's
 *  axis over the frame for the minimum width. Profile convention as Soup.loft (counter-clockwise). */
function loftH(soup: Soup, frames: Frame[], profile: readonly (readonly [number, number])[], scale: number[] | null, colors: readonly Rgb[] | Rgb, extraKind: number, axisY: number | null, extraFor?: (f: Frame, k: number, height: number) => readonly number[]): void {
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3(), _ax = new THREE.Vector3();
  for (let i = 0; i < profile.length - 1; i++) {
    const [a0, y0] = profile[i], [a1, y1] = profile[i + 1];
    const ex = a1 - a0, ey = y1 - y0;
    const el = Math.hypot(ex, ey) || 1;
    const n2x = ey / el, n2y = -ex / el;
    const c: Rgb = Array.isArray(colors[0]) ? (colors as readonly Rgb[])[Math.min(i, colors.length - 1)] : (colors as Rgb);
    const base = soup.vertexCount;
    frames.forEach((f, k) => {
      const sc = scale ? scale[k] : 1;
      const nx = f.rx * n2x, ny = n2y, nz = f.rz * n2x;
      const axis = axisY !== null ? _ax.set(f.x, f.y + axisY * sc, f.z) : null;
      const e0 = extraFor ? extraFor(f, k, y0 * sc) : [extraKind, f.s, y0 * sc];
      const e1 = extraFor ? extraFor(f, k, y1 * sc) : [extraKind, f.s, y1 * sc];
      soup.vertex(f.x + f.rx * a0 * sc, f.y + y0 * sc, f.z + f.rz * a0 * sc, nx, ny, nz, c, e0, axis);
      soup.vertex(f.x + f.rx * a1 * sc, f.y + y1 * sc, f.z + f.rz * a1 * sc, nx, ny, nz, c, e1, axis);
    });
    let flip = false;
    if (frames.length > 1) {
      _a.fromArray(soup.pos, base * 3); _b.fromArray(soup.pos, (base + 1) * 3); _c.fromArray(soup.pos, (base + 3) * 3);
      _n.subVectors(_b, _a).cross(_c.sub(_a));
      _p.fromArray(soup.nrm, base * 3);
      flip = _n.dot(_p) < 0;
    }
    for (let k = 1; k < frames.length; k++) {
      const v0 = base + (k - 1) * 2, v1 = v0 + 1, v3 = base + k * 2, v2 = v3 + 1;
      if (flip) soup.idx.push(v0, v2, v1, v0, v3, v2);
      else soup.idx.push(v0, v1, v2, v0, v2, v3);
    }
  }
}

/** A textured quad (sign face): corners counter-clockwise seen from the front, uv from the atlas face. */
function faceQuad(soup: Soup, p: THREE.Vector3[], n: THREE.Vector3, face: SignFace, glow: number): void {
  const base = soup.vertexCount;
  const uv = [[face.u0, face.v0], [face.u1, face.v0], [face.u1, face.v1], [face.u0, face.v1]];
  for (let i = 0; i < 4; i++) soup.vertex(p[i].x, p[i].y, p[i].z, n.x, n.y, n.z, S_FACE, [glow, uv[i][0], uv[i][1]]);
  soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** Rectangular panel standing at `centre` facing `normal` (unit, horizontal): a steel back plate plus the face
 *  quad 4 cm in front of it. `w` x `h` metres, centre at the panel's middle. */
function panel(soup: Soup, centre: THREE.Vector3, normal: THREE.Vector3, w: number, h: number, face: SignFace, back: Rgb, glow: number, twoSided = false): void {
  const right = new THREE.Vector3(-normal.z, 0, normal.x);
  const yaw = Math.atan2(right.x, right.z);
  soup.box(centre.x, centre.y - h / 2, centre.z, w, h, 0.06, yaw - Math.PI / 2, 0, back, false);
  const put = (nrm: THREE.Vector3, sign: number) => {
    const c = centre.clone().addScaledVector(nrm, 0.04);
    const r = right.clone().multiplyScalar(sign);
    const p = [
      c.clone().addScaledVector(r, -w / 2).add(new THREE.Vector3(0, -h / 2, 0)),
      c.clone().addScaledVector(r, w / 2).add(new THREE.Vector3(0, -h / 2, 0)),
      c.clone().addScaledVector(r, w / 2).add(new THREE.Vector3(0, h / 2, 0)),
      c.clone().addScaledVector(r, -w / 2).add(new THREE.Vector3(0, h / 2, 0)),
    ];
    faceQuad(soup, p, nrm, face, glow);
  };
  put(normal, 1);
  if (twoSided) put(normal.clone().negate(), -1);
}

// ------------------------------------------------------------------ per-frame culling

/** `shadowOnly`: a proxy drawn by the coarse shadow cascades only; `receiveOnly`: a surface the cameras draw and
 *  no cascade does (the wearing course) */
interface ChunkMesh { mesh: THREE.Mesh; cls: CasterClass; box: THREE.Box3; height: number; inView: boolean; cast: number; shadowOnly?: boolean; receiveOnly?: boolean; }
interface Chunk {
  meshes: ChunkMesh[];
  steel: THREE.Mesh | null;
  /** index counts of the steel prefixes: lamp heads | + poles and rails | + posts */
  headsEnd: number; thinEnd: number;
  signs: THREE.Mesh | null;
  concrete: THREE.Mesh | null;
  center: THREE.Vector3; r: number; dist: number;
}

/** Visibility and caster routing per chunk (see bridges.ts BridgeCuller), plus the LOD draw ranges and the
 *  lamp glow. Runs from the group's `updateMatrixWorld` with the cameras that drew a chunk last frame. */
class HighwayCuller {
  readonly chunks: Chunk[] = [];
  private sun: THREE.DirectionalLight | null = null;
  private readonly cull = new ViewCull();
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly seen = new Set<THREE.PerspectiveCamera>();
  private cameras: THREE.PerspectiveCamera[] = [];

  constructor(private readonly steel: THREE.MeshStandardMaterial, private readonly lampGlow: THREE.IUniform<number>) {}

  observe(camera: THREE.Camera): void {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) this.seen.add(camera as THREE.PerspectiveCamera);
  }

  update(scene: THREE.Object3D | null): void {
    if (!this.sun && scene) this.sun = (scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) as THREE.DirectionalLight | undefined) ?? null;
    let keyIntensity = 10;
    if (this.sun) {
      this.sunDir.subVectors(this.sun.position, this.sun.target.position);
      if (this.sunDir.lengthSq() > 1e-6) this.sunDir.normalize(); else this.sunDir.set(0, 1, 0);
      keyIntensity = this.sun.intensity;
    }
    const glow = lampGlowFor(this.sunDir, keyIntensity);
    this.steel.emissiveIntensity = LAMP_GLOW * glow;
    this.lampGlow.value = glow;
    if (this.seen.size) { this.cameras = [...this.seen]; this.seen.clear(); }
    if (!this.cameras.length) return;
    for (const c of this.chunks) { c.dist = Infinity; for (const m of c.meshes) { m.inView = false; m.cast = 0; } }
    for (const cam of this.cameras) {
      const camX = cam.position.x, camZ = cam.position.z;
      const range = clamp(cam.position.y * 9, 5000, 12000);
      this.cull.update(cam, range, this.sunDir);
      for (const c of this.chunks) {
        const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
        c.dist = Math.min(c.dist, d);
        for (const m of c.meshes) {
          if (!m.inView && this.cull.boxInView(m.box)) m.inView = true;
          if (d < range) m.cast |= this.cull.boxCasterCascades(m.box, m.height);
        }
      }
    }
    // the coarse cascades (texel >= NEAR_TEXEL) never draw the thin steel: the fat shadow proxies stand in there
    let coarse = 0;
    for (let i = 0; i < MAX_CASCADES; i++) if (!cascadeIsFine(i)) coarse |= 1 << i;
    for (const c of this.chunks) {
      for (const m of c.meshes) {
        const mask = m.shadowOnly ? layerMask('mid', false, m.cast & coarse) : m.receiveOnly ? layerMask('mid', m.inView, 0) : layerMask(m.cls, m.inView, m.cast);
        const cast = maskCasts(mask);
        m.mesh.castShadow = cast;
        m.mesh.visible = m.shadowOnly ? cast : m.inView || cast;
        m.mesh.layers.mask = mask;
      }
      if (c.steel) {
        const end = c.dist > THIN_DISTANCE ? c.headsEnd : c.dist > POST_DISTANCE ? c.thinEnd : Infinity;
        c.steel.geometry.setDrawRange(0, end);
        if (c.dist > HEAD_DISTANCE || end === 0) c.steel.visible = false;
      }
      if (c.signs && c.dist > SIGN_DISTANCE) c.signs.visible = false;
      if (c.concrete && c.dist > SIGN_DISTANCE) c.concrete.visible = false;
    }
  }
}

class HighwayGroup extends THREE.Group {
  constructor(readonly culler: HighwayCuller) { super(); }
  override updateMatrixWorld(force?: boolean): void {
    this.culler.update(this.parent);
    super.updateMatrixWorld(force);
  }
}

// ------------------------------------------------------------------ destinations

/** Fictional destinations of Bahía Vista (the map's districts and islands), by causeway and direction of travel:
 *  what the gantry before that causeway announces. */
const DEST: Record<string, { toEnd: string[]; toStart: string[]; tab: string }> = {
  'garza-west': { toEnd: ['Isla Garza', 'Isla Tortuga'], toStart: ['Isla Brisa', 'Bahía Vista'], tab: 'CAUSEWAY 1 KM' },
  'islab-west': { toEnd: ['Isla Brisa', 'Isla Garza'], toStart: ['Bahía Vista', 'Aeropuerto'], tab: 'CAUSEWAY 1 KM' },
  'garza-bridge': { toEnd: ['Isla Tortuga', 'Costa Barrera'], toStart: ['Isla Garza', 'Bahía Vista'], tab: 'PUENTE GARZA' },
  'tortuga-bridge': { toEnd: ['Costa Barrera', 'Zona Hotelera'], toStart: ['Isla Garza', 'Bahía Vista'], tab: 'PUENTE TORTUGA' },
};
/** Ground guide signs and gantry panels at the arterial junctions, by chain id (the avenue to downtown, Garza's park road). */
const JUNCTION_DEST: Record<string, string[]> = {
  'south-hwy-mainland': ['Centro', 'Av. Central'],
  'garza-hwy-2': ['Marina', 'Parque Garza'],
  'tortuga-rd': ['Isla Tortuga', 'Pueblo'],
};
const FAR_DEST: Record<string, { toEnd: string[]; toStart: string[] }> = {
  'south-hwy-mainland': { toEnd: ['Isla Garza', 'Costa Barrera'], toStart: ['Aeropuerto', 'Bahía Vista'] },
};
/** Toll plazas (station along the chain, name): the mainland approach to the island causeways is tolled, as the
 *  causeways of the reference coast are; the plaza sits between two district streets, 400 m short of the causeway. */
const TOLL: Record<string, { s: number; name: string }> = {
  'south-hwy-mainland': { s: 3706, name: 'PEAJE ISLAS' },
};
/** Pedestrian overpasses (stations): mid-block between two district streets, where the median barrier has cut the
 *  grid's at-grade crossings for people on foot. */
const FOOTBRIDGES: Record<string, number[]> = {
  'south-hwy-mainland': [1688, 2108],
};

// ------------------------------------------------------------------ build

/** `graph`: the road graph after buildRoadMeshes has filled its chains' rows (the frontage streets are resurfaced on
 *  that pavement exactly); without it no frontage overlay is built. */
export function buildHighway(map: WorldMap, segments: RoadSegment[], registerLit: (m: THREE.Material) => void, graph?: RoadGraph): HighwayBuild {
  const pixelScale: THREE.IUniform<number> = { value: 1000 };
  const lampGlow: THREE.IUniform<number> = { value: 0 };
  const atlas = new SignAtlas();
  const concreteMat = createConcreteMaterial(pixelScale, lampGlow);
  const steelMat = createSteelMaterial(pixelScale, atlas.texture);
  registerLit(concreteMat); registerLit(steelMat);
  // shadow proxies are only ever drawn by the shadow cameras (depth material): the cheapest material will do
  const proxyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const culler = new HighwayCuller(steelMat, lampGlow);
  const group = new HighwayGroup(culler);
  const _size = new THREE.Vector2();
  const observe = (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => {
    culler.observe(camera);
    const rt = renderer.getRenderTarget();
    const h = rt ? rt.height : renderer.getDrawingBufferSize(_size).y;
    pixelScale.value = 0.5 * h * camera.projectionMatrix.elements[5];
  };
  const counts: HighwayBuild['counts'] = { chains: 0, chunks: 0, meshes: 0, poles: 0, gantries: 0, guardrailM: 0, barrierM: 0, vergeM: 0, paveM: 0, frontageM: 0, signs: 0, triangles: 0 };
  const chains = buildChains(map, segments);
  counts.chains = chains.length;

  for (const c of chains) {
    const hw = c.hw;
    const junctions = findJunctions(c, segments);
    const inRoad = makeRoadTest(c, segments);
    const majors = junctions.filter((j) => j.major);
    const nearJunction = (s: number, r: number) => junctions.some((j) => Math.abs(j.s - s) < r);
    const yawAt = (f: Frame) => Math.atan2(f.dx, f.dz);
    const nChunks = Math.max(1, Math.round(c.total / CHUNK_LEN));
    const chunkLen = c.total / nChunks;
    const chunkOf = (s: number) => Math.min(nChunks - 1, Math.max(0, Math.floor(s / chunkLen)));
    // steel is accumulated in three soups per chunk so the LOD prefixes can be laid out: heads | thin | posts
    // `proxy`: fat stand-ins (poles, gantry trusses, guardrail walls) drawn into the coarse shadow cascades only,
    // so the furniture keeps its shadow strokes from the air where the thin steel is not worth a shadow pass
    // the concrete soups carry aInfo = (kind, along, across or height, station of the nearest lighting pole or 0)
    const parts = Array.from({ length: nChunks }, () => ({ conc: new Soup(4, true), pave: new Soup(4, true), heads: new Soup(3, true), thin: new Soup(3, true), posts: new Soup(3, true), signs: new Soup(3, true), proxy: new Soup(3, false) }));
    const P = (s: number) => parts[chunkOf(s)];

    // -------------------------------------------------------- median barrier: continuous, opened at the arterial junctions and through the toll plaza
    const toll = TOLL[c.id] && TOLL[c.id].s > 80 && TOLL[c.id].s < c.total - 80 ? TOLL[c.id] : null;
    const nearPlaza = (s: number, r: number) => toll !== null && Math.abs(s - toll.s) < r;
    const footbridges = (FOOTBRIDGES[c.id] ?? []).filter((s) => s > 60 && s < c.total - 60 && [-1, 1].every((side) => [0, side * 8, side * 14].every((ds) => { const f = frameAt(c, s + ds); const a = side * (hw + 2.4); return !inRoad(f.x + f.rx * a, f.z + f.rz * a, 1.2); })));
    const nearFoot = (s: number, r: number) => footbridges.some((b) => Math.abs(b - s) < r);
    const openings: Run[] = majors.map((j) => ({ s0: j.s - 19, s1: j.s + 19 }));
    if (toll) openings.push({ s0: toll.s - 48, s1: toll.s + 48 });
    // no terminal may stand in the mouth of a road meeting the highway (the plaza's west terminal, drums and all,
    // stood in the path of a street crossing there): an opening whose end falls within a mouth grows past it
    for (const o of openings) {
      for (const j of junctions) {
        if (Math.abs(j.s - o.s0) < 13) o.s0 = Math.min(o.s0, j.s - 13);
        if (Math.abs(j.s - o.s1) < 13) o.s1 = Math.max(o.s1, j.s + 13);
      }
    }
    const endPad = 1.2;
    const barrierRuns = subtractRuns({ s0: endPad, s1: c.total - endPad }, openings);
    const TAPER = 7;
    /** the barrier lofts wait for the lighting: each vertex names the pole whose lamp pool lights it at night */
    const barrierLofts: { part: (typeof parts)[number]; frames: Frame[]; scale: number[] }[] = [];
    for (const run of barrierRuns) {
      // a sloped end terminal wherever the barrier does not continue onto a causeway deck
      const taperStart = !(run.s0 <= endPad + 0.01 && c.bridgeStart), taperEnd = !(run.s1 >= c.total - endPad - 0.01 && c.bridgeEnd);
      const st = stations(c, run.s0, run.s1);
      // split at chunk boundaries and at the taper ends so every station list belongs to one soup
      const cuts = new Set<number>([run.s0, run.s1]);
      for (let k = 1; k < nChunks; k++) { const s = k * chunkLen; if (s > run.s0 && s < run.s1) cuts.add(s); }
      if (taperStart) cuts.add(Math.min(run.s0 + TAPER, run.s1));
      if (taperEnd) cuts.add(Math.max(run.s1 - TAPER, run.s0));
      const all = [...new Set([...st, ...cuts])].sort((p, q) => p - q);
      const cutList = [...cuts].sort((p, q) => p - q);
      for (let ci = 0; ci < cutList.length - 1; ci++) {
        const a = cutList[ci], b = cutList[ci + 1];
        if (b - a < 0.05) continue;
        const ss = all.filter((s) => s >= a - 1e-6 && s <= b + 1e-6);
        const frames = ss.map((s) => frameAt(c, s));
        const scale = ss.map((s) => {
          let k = 1;
          if (taperStart) k = Math.min(k, clamp(0.12 + 0.88 * ((s - run.s0) / TAPER), 0.12, 1));
          if (taperEnd) k = Math.min(k, clamp(0.12 + 0.88 * ((run.s1 - s) / TAPER), 0.12, 1));
          return k;
        });
        barrierLofts.push({ part: P((a + b) / 2), frames, scale });
      }
      counts.barrierM += run.s1 - run.s0;
      // crash cushions: three yellow sand drums in single file nosing each open terminal (the traffic drives the
      // inner lane 1.5 m off the centre line, a 1.9 m car's flank 0.55 m off it: the drums stay within ±0.4 m)
      for (const [end, dir] of [[run.s0, 1], [run.s1, -1]] as const) {
        if (!(dir > 0 ? taperStart : taperEnd)) continue;
        for (const ds of [1.0, 1.95, 2.9]) {
          const f = frameAt(c, end + dir * ds);
          P(end + dir * ds).signs.cylinder(f.x, f.y + 0.02, f.z, 0.8, 0.95, 8, S_DRUM, true, [0, 0, 0]);
        }
      }
      // barrier-mounted reflectors every 12 m (amber toward the traffic that sees them, both faces)
      for (let s = Math.ceil((run.s0 + TAPER + 2) / 12) * 12; s < run.s1 - TAPER - 2; s += 12) {
        const f = frameAt(c, s);
        P(s).posts.box(f.x, f.y + BARRIER_H, f.z, 0.1, 0.09, 0.05, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
      }
    }

    // -------------------------------------------------------- cross-road medians: a kerbed island down the centre of every arterial arm of a
    // signalised junction, from the kerb returns of the box out to 60 m (the approach a mast arm implies), stopped
    // short of any other road mouth on the arm. The traffic drives the innermost arterial lane 1.5 m off the centre
    // line (1.8 m on two-lane arterials, traffic.ts), so the island is a raised divider 0.6 m wide there (1.0 m
    // with a planted top on two-lane arms) - what fits between the wheel tracks. The arm's pavement is the roads.ts
    // strip - the height field at its two edges, ROAD_LIFT up - so the island is built on that surface row by row,
    // its kerb footing 8 cm into the pavement to ride out the strip's own rows
    for (const j of majors) {
      for (const arm of j.arms) {
        if (arm.seg.cls !== 'arterial') continue;
        const d0 = hw + 4.0;
        let d1 = Math.min(d0 + 60, arm.len - 8);
        for (let d = d0; d <= d1; d += 2) {
          const x = arm.x + arm.dx * d, z = arm.z + arm.dz * d;
          if (segments.some((o) => o !== arm.seg && o.cls !== c.cls && o.cls !== 'runway' && o.cls !== 'taxiway' && distToSegment(x, z, o) < o.width * 0.5 + 1.0)) { d1 = d - 7; break; }
        }
        if (d1 < d0 + 14) continue;
        const yaw = Math.atan2(arm.dx, arm.dz);
        const nx = -arm.dz, nz = arm.dx, ew = arm.seg.width * 0.5;
        const pav = (d: number) => {
          const x = arm.x + arm.dx * d, z = arm.z + arm.dz * d;
          return 0.5 * (map.heightAt(x + nx * ew, z + nz * ew) + map.heightAt(x - nx * ew, z - nz * ew)) + ROAD_LIFT + arm.seg.lift;
        };
        const soup = P(j.s).conc;
        const n = Math.ceil((d1 - d0) / 7.5);
        for (let k = 0; k < n; k++) {
          const a = d0 + ((d1 - d0) * k) / n, b = d0 + ((d1 - d0) * (k + 1)) / n, m = (a + b) / 2;
          const y = Math.max(pav(a), pav(b), pav(m));
          const x = arm.x + arm.dx * m, z = arm.z + arm.dz * m;
          // the nose piece tapers: half width, so the island points at the box
          const wFull = arm.seg.lanes >= 4 ? 0.6 : 1.0;
          const w = k === 0 ? wFull * 0.55 : wFull;
          soup.box(x, y - 0.08, z, w, 0.23, b - a + 0.02, yaw, 0, C_BARRIER, false, [0, 0, 0, 0]);
          if (k > 0 && wFull >= 1.0) soup.box(x, y + 0.15, z, w - 0.4, 0.03, b - a - 0.3, yaw, 0, C_ISLAND_TOP, false, [0, 0, 0, 0]);
        }
        counts.barrierM += d1 - d0;
      }
    }

    // -------------------------------------------------------- verges: the mown right-of-way strip beside each pavement edge (a gravel band, then
    // grass - or sand on the beaches - out to 12 m), draped on the terrain row by row and stopped at the water's edge; it
    // gives the corridor its edges from the air and the posts stand on it
    for (const side of [-1, 1] as const) {
      const cuts = new Set<number>(stations(c, 0, c.total));
      for (let k = 1; k < nChunks; k++) cuts.add(k * chunkLen);
      const ss = [...cuts].sort((p, q) => p - q);
      /** the rows of one station: positions from the pavement edge outward (fewer where the ground goes under water) */
      const rowsAt = (s: number): { p: THREE.Vector3; tone: Rgb }[] => {
        const f = frameAt(c, s);
        const out: { p: THREE.Vector3; tone: Rgb }[] = [];
        let yPrev = 0;
        for (let k = 0; k < VERGE_ROWS.length; k++) {
          const a = side * (hw + VERGE_ROWS[k]);
          const x = f.x + f.rx * a, z = f.z + f.rz * a;
          const g = terrainAt(map, x, z);
          if (k > 0 && g < 0.15) break;
          // 5 cm under the pavement edge, then on the rendered terrain at the lift the roads use (the clipmap sits
          // under it), never dropping or climbing faster than a real graded verge would between two rows; under
          // another road's pavement (a frontage street beside the shoulder, a street mouth) the row is sunk well
          // below it - that pavement is flat between its 15 m rows while the terrain the verge follows is not, and
          // the verge showed through it in green blotches from 180 m
          const under = k > 0 && inRoad(x, z, 0.4) ? 0.45 : 0.05;
          const y = k === 0 ? surfaceAt(c, s, a) - 0.05 : clamp(g + ROAD_LIFT - under, yPrev - 0.35 * (VERGE_ROWS[k] - VERGE_ROWS[k - 1]), yPrev + 0.12 * (VERGE_ROWS[k] - VERGE_ROWS[k - 1]));
          yPrev = y;
          out.push({ p: new THREE.Vector3(x, y, z), tone: map.zoneAt(x, z) === 2 || g < 1.2 ? C_VERGE_SAND : C_VERGE_GRASS });
        }
        return out;
      };
      let prev = rowsAt(ss[0]);
      for (let i = 1; i < ss.length; i++) {
        const cur = rowsAt(ss[i]);
        const soup = P((ss[i - 1] + ss[i]) / 2).conc;
        const n = Math.min(prev.length, cur.length);
        for (let k = 0; k + 1 < n; k++) {
          const p0 = prev[k], p1 = cur[k], p2 = cur[k + 1], p3 = prev[k + 1];
          const base = soup.vertexCount;
          _n.subVectors(p1.p, p0.p).cross(_d.subVectors(p3.p, p0.p)).normalize();
          if (_n.y < 0) _n.negate();
          const a0 = VERGE_ROWS[k], a1 = VERGE_ROWS[k + 1];
          soup.vertex(p0.p.x, p0.p.y, p0.p.z, _n.x, _n.y, _n.z, p0.tone, [3, ss[i - 1], a0]);
          soup.vertex(p1.p.x, p1.p.y, p1.p.z, _n.x, _n.y, _n.z, p1.tone, [3, ss[i], a0]);
          soup.vertex(p2.p.x, p2.p.y, p2.p.z, _n.x, _n.y, _n.z, p2.tone, [3, ss[i], a1]);
          soup.vertex(p3.p.x, p3.p.y, p3.p.z, _n.x, _n.y, _n.z, p3.tone, [3, ss[i - 1], a1]);
          _a.subVectors(p1.p, p0.p).cross(_b.subVectors(p2.p, p0.p));
          if (_a.y >= 0) soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else soup.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
        prev = cur;
      }
      counts.vergeM += c.total;
    }

    // -------------------------------------------------------- guardrail: where the ground beside the shoulder is water or drops away, and on the causeway approaches
    const railRuns: { side: 1 | -1; runs: Run[] }[] = [];
    for (const side of [-1, 1] as const) {
      const rows: Run[] = [];
      for (let s = 0; s <= c.total; s += ROAD_STEP) {
        const roadY = surfaceAt(c, s, side * hw);
        const f = frameAt(c, s);
        const g1 = map.heightAt(f.x + f.rx * side * (hw + 5), f.z + f.rz * side * (hw + 5));
        const g2 = map.heightAt(f.x + f.rx * side * (hw + 18), f.z + f.rz * side * (hw + 18));
        const low = Math.min(g1, g2);
        if (low < 0.75 || roadY - low > 1.7) rows.push({ s0: s - 22, s1: s + 22 });
      }
      if (c.bridgeStart) rows.push({ s0: 0, s1: 62 });
      if (c.bridgeEnd) rows.push({ s0: c.total - 62, s1: c.total });
      // open at the mouths of the roads that meet the highway on this side (crossings open both sides)
      const mouths: Run[] = junctions.filter((j) => j.side === 0 || j.side === side).map((j) => ({ s0: j.s - (j.major ? 16 : 9), s1: j.s + (j.major ? 16 : 9) }));
      const runs = mergeRuns(rows, 45)
        .map((r) => ({ s0: Math.max(1.0, r.s0), s1: Math.min(c.total - 1.0, r.s1) }))
        .flatMap((r) => subtractRuns(r, mouths))
        .filter((r) => r.s1 - r.s0 > 20);
      railRuns.push({ side, runs });
      for (const run of runs) {
        counts.guardrailM += run.s1 - run.s0;
        // the rail: one loft per chunk piece, facing the pavement; sandy islands get timber posts
        const timber = map.zoneAt(at(c, (run.s0 + run.s1) / 2, 0).x, at(c, (run.s0 + run.s1) / 2, 0).z) === 2;
        const cuts = [run.s0];
        for (let k = 1; k < nChunks; k++) { const s = k * chunkLen; if (s > run.s0 && s < run.s1) cuts.push(s); }
        cuts.push(run.s1);
        const aRail = side * (hw + 0.45);
        // profile mirrored (and reversed, to stay counter-clockwise) for the right side, whose traffic face looks toward -a
        const prof: [number, number][] = side < 0 ? RAIL_PROFILE.map(([a, y]) => [a, y] as [number, number]) : RAIL_PROFILE.slice().reverse().map(([a, y]) => [-a, y] as [number, number]);
        for (let ci = 0; ci < cuts.length - 1; ci++) {
          const ss = stations(c, cuts[ci], cuts[ci + 1]);
          const frames = ss.map((s) => { const f = frameAt(c, s); return { ...f, x: f.x + f.rx * aRail, z: f.z + f.rz * aRail, y: surfaceAt(c, s, side * hw) }; });
          // end terminals: the rail turns down to the ground over the last 8 m unless it ties into a parapet
          const tiesStart = ci === 0 && run.s0 <= 1.01 && c.bridgeStart, tiesEnd = ci === cuts.length - 2 && run.s1 >= c.total - 1.01 && c.bridgeEnd;
          for (const f of frames) {
            let drop = 0;
            if (!tiesStart && ci === 0) drop = Math.max(drop, 1 - clamp((f.s - run.s0) / 8, 0, 1));
            if (!tiesEnd && ci === cuts.length - 2) drop = Math.max(drop, 1 - clamp((run.s1 - f.s) / 8, 0, 1));
            f.y -= 0.62 * drop * drop;
          }
          loftH(P((cuts[ci] + cuts[ci + 1]) / 2).thin, frames, prof, null, S_GALV, 0, 0.7, () => [0, 0, 0]);
          loftH(P((cuts[ci] + cuts[ci + 1]) / 2).proxy, frames, [[0.14, 0.12], [0.14, 0.86], [-0.14, 0.86], [-0.14, 0.12]], null, S_GALV, 0, null, () => []);
        }
        // posts every 1.905 m just behind the rail, buried into the verge; a reflector on every sixth
        let n = 0;
        for (let s = run.s0 + 1.0; s < run.s1 - 0.5; s += POST_SPACING, n++) {
          const f = frameAt(c, s);
          const aPost = side * (hw + 0.45 + 0.03 + 0.1);
          const px = f.x + f.rx * aPost, pz = f.z + f.rz * aPost;
          const roadY = surfaceAt(c, s, side * hw);
          const ground = Math.min(roadY - ROAD_LIFT, map.heightAt(px, pz));
          const top = roadY + 0.84;
          const drop = Math.max(0, 1 - clamp((s - run.s0) / 8, 0, 1), 1 - clamp((run.s1 - s) / 8, 0, 1));
          const railTop = top - 0.62 * drop * drop;
          if (railTop - (ground - 0.3) < 0.3) continue;
          P(s).posts.box(px, ground - 0.3, pz, 0.15, railTop - (ground - 0.3), 0.2, yawAt(f), 0, timber ? S_WOOD : S_GALV, true, [0, 0, 0], true);
          if (n % 6 === 3 && drop === 0) P(s).posts.box(px - f.rx * side * 0.12, railTop - 0.02, pz - f.rz * side * 0.12, 0.08, 0.1, 0.04, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
        }
      }
    }
    const railedAt = (s: number, side: number) => railRuns.find((r) => r.side === side)!.runs.some((r) => s > r.s0 - 2 && s < r.s1 + 2);

    // -------------------------------------------------------- delineator posts every 50 m on both shoulders (not where the rail carries the reflectors)
    for (const side of [-1, 1] as const) {
      for (let s = 25; s < c.total - 8; s += 50) {
        if (railedAt(s, side) || nearJunction(s, 14) || nearPlaza(s, 60) || nearFoot(s, 16)) continue;
        const f = frameAt(c, s);
        const aP = side * (hw + 0.7);
        const px = f.x + f.rx * aP, pz = f.z + f.rz * aP;
        if (inRoad(px, pz, 0.6)) continue;
        const ground = Math.min(surfaceAt(c, s, side * hw) - ROAD_LIFT, map.heightAt(px, pz));
        P(s).posts.box(px, ground - 0.2, pz, 0.1, 1.45, 0.035, yawAt(f), 0, S_WHITE, true, [0, 0, 0], true);
        P(s).posts.box(px, ground + 1.05, pz, 0.08, 0.16, 0.05, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
      }
    }

    // -------------------------------------------------------- gantries and their sign panels
    interface Gantry { s: number; dir: 1 | -1; panels: { lines: string[]; arrow: Arrow; tab?: string }[]; cols?: [number, number]; }
    const gantries: Gantry[] = [];
    /** column offset from the centre line on `side` at `s`: just off the verge, or pushed out past a frontage street
     *  (the truss then spans it, as sign bridges over frontage roads do); null when nothing within 16 m is clear */
    const columnAt = (s: number, side: -1 | 1): number | null => {
      const f = frameAt(c, s);
      for (let a = hw + 1.6; a <= hw + 16; a += 1.0) if (!inRoad(f.x + f.rx * side * a, f.z + f.rz * side * a, 1.2)) return a;
      return null;
    };
    const addGantry = (g: Gantry) => {
      // slide along the road (up to 60 m either way) if the columns cannot be placed
      for (const ds of [0, 20, -20, 40, -40, 60, -60]) {
        const s = g.s + ds;
        if (s <= 40 || s >= c.total - 40) continue;
        const cl = columnAt(s, -1), cr = columnAt(s, 1);
        if (cl === null || cr === null) continue;
        if (nearPlaza(s, 110) || nearFoot(s, 100) || gantries.some((o) => Math.abs(o.s - s) < 320)) return;
        gantries.push({ ...g, s, cols: [cl, cr] });
        return;
      }
    };
    const dest = (b: BridgeSpec | null, atEnd: boolean): { lines: string[]; tab: string } | null => {
      if (!b) return null;
      const d = DEST[b.id];
      if (!d) return { lines: ['Causeway'], tab: 'CAUSEWAY' };
      // the chain touches the bridge at its start or its end: traffic leaving the chain runs the bridge toward its far end
      const bStart = b.pts[0], p = atEnd ? c.pts[c.pts.length - 1] : c.pts[0];
      const towardBridgeEnd = Math.hypot(bStart[0] - p[0], bStart[1] - p[1]) < 6;
      return { lines: towardBridgeEnd ? d.toEnd : d.toStart, tab: d.tab };
    };
    const dEnd = dest(c.bridgeEnd, true), dStart = dest(c.bridgeStart, false);
    if (dEnd) addGantry({ s: c.total - 260, dir: 1, panels: [{ lines: dEnd.lines, arrow: 'up', tab: dEnd.tab }] });
    if (dStart) addGantry({ s: 260, dir: -1, panels: [{ lines: dStart.lines, arrow: 'up', tab: dStart.tab }] });
    const jd = JUNCTION_DEST[c.id];
    for (const j of majors) {
      if (j.s < 60 || j.s > c.total - 60 || !jd) continue;
      // which side the arterial leaves toward: the junction's cross road end point
      const far = FAR_DEST[c.id];
      const ahead = (dir: 1 | -1) => (dir > 0 ? (far?.toEnd ?? dEnd?.lines) : (far?.toStart ?? dStart?.lines)) ?? ['Bahía Vista'];
      // the cross road's arrow: the side it leaves toward, seen by traffic running in `dir` (a crossing: both ways)
      const arrowFor = (dir: 1 | -1): Arrow => (j.side === 0 ? 'both' : j.side * dir > 0 ? 'right' : 'left');
      addGantry({ s: j.s - 150, dir: 1, panels: [{ lines: ahead(1), arrow: 'up' }, { lines: jd, arrow: arrowFor(1) }] });
      addGantry({ s: j.s + 150, dir: -1, panels: [{ lines: ahead(-1), arrow: 'up' }, { lines: jd, arrow: arrowFor(-1) }] });
    }
    if (c.total > 2500) {
      const far = FAR_DEST[c.id];
      if (far) { addGantry({ s: c.total * 0.32, dir: 1, panels: [{ lines: far.toEnd, arrow: 'up' }] }); addGantry({ s: c.total * 0.68, dir: -1, panels: [{ lines: far.toStart, arrow: 'up' }] }); }
    }
    for (const g of gantries) {
      const f = frameAt(c, g.s);
      const yaw = yawAt(f);
      const fwd = new THREE.Vector3(f.dx, 0, f.dz).multiplyScalar(g.dir);   // direction of the traffic served
      const faceN = fwd.clone().negate();                                       // the faces look back at it
      const roadY = f.y;
      const part = P(g.s);
      const [colL, colR] = g.cols ?? [hw + 1.6, hw + 1.6];
      const colA = (colL + colR) / 2, colMid = (colR - colL) / 2;   // truss half-span and the offset of its middle
      const topY = roadY + 8.1;
      // columns on concrete pedestals either side, a two-chord truss between them
      for (const side of [-1, 1]) {
        const off = side < 0 ? -colL : colR;
        const px = f.x + f.rx * off, pz = f.z + f.rz * off;
        const ground = Math.min(surfaceAt(c, g.s, side * hw) - ROAD_LIFT, map.heightAt(px, pz));
        part.conc.box(px, ground - 0.4, pz, 1.5, 1.2, 1.5, yaw, 0, C_PEDESTAL, false, [0, 0, 0]);
        part.signs.cylinder(px, ground + 0.8, pz, 0.6, topY - (ground + 0.8), 10, S_GALV, true, [0, 0, 0], true);
        part.proxy.box(px, ground + 0.8, pz, 0.9, topY - 1.5 - (ground + 0.8), 0.9, yaw, 0, S_GALV, true, []);
      }
      const chordY = [topY - 1.5, topY - 0.1];
      part.proxy.box(f.x + f.rx * colMid, chordY[0] - 0.1, f.z + f.rz * colMid, colA * 2, 1.6, 1.2, yaw, 0, S_GALV, false, []);
      const left = new THREE.Vector3(f.x - f.rx * colL, 0, f.z - f.rz * colL), right = new THREE.Vector3(f.x + f.rx * colR, 0, f.z + f.rz * colR);
      for (const y of chordY) part.signs.strut(left.clone().setY(y), right.clone().setY(y), 0.19, S_GALV, [0, 0, 0]);
      const span = colA * 2;
      const nBay = Math.round(span / 2.6);
      for (let k = 0; k <= nBay; k++) {
        const a = -colL + (span * k) / nBay;
        const x = f.x + f.rx * a, z = f.z + f.rz * a;
        part.signs.strut(new THREE.Vector3(x, chordY[0], z), new THREE.Vector3(x, chordY[1], z), 0.07, S_GALV, [0, 0, 0]);
        if (k < nBay) {
          const a2 = -colL + (span * (k + 1)) / nBay;
          const x2 = f.x + f.rx * a2, z2 = f.z + f.rz * a2;
          if (k % 2 === 0) part.signs.strut(new THREE.Vector3(x, chordY[0], z), new THREE.Vector3(x2, chordY[1], z2), 0.06, S_GALV, [0, 0, 0]);
          else part.signs.strut(new THREE.Vector3(x, chordY[1], z), new THREE.Vector3(x2, chordY[0], z2), 0.06, S_GALV, [0, 0, 0]);
        }
      }
      // panels over the served carriageway: the main guide sign over the lanes, a second one beside it
      const laneCentre = g.dir * (hw * 0.5 - 2.3);
      const panelsW = g.panels.map((_, i) => (i === 0 ? 4.4 : 3.2));
      const totalW = panelsW.reduce((p, q) => p + q, 0) + 0.6 * (g.panels.length - 1);
      let a = laneCentre - (g.dir * totalW) / 2;
      g.panels.forEach((pn, i) => {
        const w = panelsW[i], h = i === 0 ? 2.4 : 1.9;
        const ac = a + (g.dir * w) / 2;
        const centre = new THREE.Vector3(f.x + f.rx * ac, chordY[1] - 0.25 - h / 2, f.z + f.rz * ac);
        panel(part.signs, centre, faceN, w, h, atlas.guide(pn.lines, pn.arrow, i === 0 ? 320 : 256, i === 0 ? 176 : 152), S_DARK, 0.08);
        if (pn.tab) panel(part.signs, centre.clone().setY(chordY[1] - 0.25 + 0.34), faceN, 2.2, 0.62, atlas.tab(pn.tab), S_DARK, 0.08);
        // hangers to the chords
        for (const sgn of [-1, 1]) {
          const hx = centre.x + f.rx * sgn * (w / 2 - 0.3), hz = centre.z + f.rz * sgn * (w / 2 - 0.3);
          part.signs.box(hx, centre.y + h / 2, hz, 0.08, chordY[1] - (centre.y + h / 2) + 0.1, 0.08, yaw, 0, S_DARK, true, [0, 0, 0], true);
        }
        counts.signs++;
        a += g.dir * (w + 0.6);
      });
      counts.gantries++;
    }
    const nearGantry = (s: number, r: number) => gantries.some((g) => Math.abs(g.s - s) < r);

    // -------------------------------------------------------- lighting: barrier-mounted twin-arm poles every 60 m
    /** stations of the poles that stand (the wearing course lays a lamp pool under each at night) */
    const poleStations: number[] = [];
    // 60 m spacing along the open road, 40 m through the 160 m either side of a signalised junction (the denser
    // lighting a junction gets, and the pole rhythm the 180 m junction views read)
    for (let s = 32; s < c.total - 12; s += majors.some((j) => Math.abs(j.s - s) < 160) ? POLE_SPACING_JUNCTION : POLE_SPACING) {
      if (nearGantry(s, 24) || nearFoot(s, 9) || openings.some((o) => s > o.s0 - 4 && s < o.s1 + 4)) continue;
      poleStations.push(s);
      const f = frameAt(c, s);
      const yaw = yawAt(f);
      const base = f.y + BARRIER_H;
      const part = P(s);
      part.thin.box(f.x, base, f.z, 0.5, 0.06, 0.5, yaw, 0, S_POLE, false, [0, 0, 0]);
      part.thin.cylinder(f.x, base + 0.06, f.z, 0.27, POLE_H - 0.06, 8, S_POLE, true, [0, 0, 0], true);
      const top = base + POLE_H;
      part.proxy.box(f.x, base, f.z, 0.55, POLE_H - 0.6, 0.55, yaw, 0, S_POLE, true, []);
      part.proxy.box(f.x, top - 0.6, f.z, ARM_REACH * 2 + 0.8, 0.6, 0.9, yaw, 0, S_POLE, false, []);
      for (const side of [-1, 1]) {
        const hx = f.x + f.rx * side * ARM_REACH, hz = f.z + f.rz * side * ARM_REACH;
        part.thin.strut(new THREE.Vector3(f.x + f.rx * side * 0.1, top - 0.55, f.z + f.rz * side * 0.1), new THREE.Vector3(hx, top - 0.15, hz), 0.065, S_POLE, [0, 0, 0]);
        part.heads.box(hx, top - 0.38, hz, 0.78, 0.22, 0.34, yaw, 0, S_HEAD, false, [1, 0, 0], 'point');
      }
      counts.poles++;
    }
    /** the pole whose lamp pool lights station `s` (course strips are cut halfway between poles so every strip has
     *  one; a barrier vertex takes the nearest, whose pool has faded to nothing 30 m out anyway) */
    const poleFor = (s: number): number => {
      let best = -1e4;
      for (const p of poleStations) if (Math.abs(p - s) < Math.abs(best - s)) best = p;
      return best;
    };
    for (const { part, frames, scale } of barrierLofts) loftH(part.conc, frames, BARRIER_PROFILE, scale, [C_BARRIER, C_BARRIER, C_BARRIER, C_BARRIER_TOP, C_BARRIER, C_BARRIER, C_BARRIER], 1, BARRIER_H * 0.45, (f, _k, h) => [1, f.s, h, poleFor(f.s)]);

    // -------------------------------------------------------- wearing course: dark asphalt over both carriageways, 2 cm up on the pavement.
    // roads.ts shades the whole highway as pale sun-bleached concrete-asphalt - the tone of the barrier, the dry ground
    // and the district streets - so from 300 m up the corridor is a pale ribbon whatever stands on it. The course runs
    // from the barrier foot to the pavement edge and carries the lane paint: dark lanes, a paler shoulder over the
    // joint (the decks' carriageway edge), the pale barrier between - a dark ribbon twice a street's width with a
    // bright spine, which is what a highway is from 600 m. Drop this block when roads.ts darkens its highway lanes.
    {
      interface PaintBox { s0: number; s1: number; side: -1 | 0 | 1; flag: number; }
      // where the paint stops: the mouths of the side streets (1: no edge line), the junction boxes and the plaza (2)
      const boxes: PaintBox[] = junctions.map((j) => ({ s0: j.s - (j.major ? 12 : 8), s1: j.s + (j.major ? 12 : 8), side: j.side, flag: j.major ? 2 : 1 }));
      // the plaza: no paint along the islands and their attenuators; the shader paints the diverge / merge and the
      // island noses over the 110 m either side from the station carried in the vertex colour
      if (toll) boxes.push({ s0: toll.s - 17.5, s1: toll.s + 17.5, side: 0, flag: 2 });
      // braking rubber darkens a carriageway over the last 90 m before its junction boxes and the plaza
      const brakes: { s: number; r: number }[] = majors.map((j) => ({ s: j.s, r: 14 }));
      if (toll) brakes.push({ s: toll.s, r: 42 });
      const tone = (s: number, side: -1 | 1): number => {
        let t = 1;
        for (const b of brakes) {
          const ahead = side * (b.s - s);
          if (ahead > -b.r) t = Math.min(t, 1 - 0.13 * (1 - clamp((ahead - b.r) / 90, 0, 1)));
        }
        return t;
      };
      // through a junction box the crossing road's pavement (its own rows over the same terrain) can stand a few cm
      // over the highway's: the course ramps up 6 cm over the 15 m before a box and rides over both there
      const lift = (s: number, sideBoxes: PaintBox[]): number => {
        let k = 0;
        for (const b of sideBoxes) k = Math.max(k, 1 - Math.max(0, Math.max(b.s0 - s, s - b.s1)) / 15);
        return 0.06 * k;
      };
      // strips are cut halfway between poles so every strip lies in one pool
      const midpoints = poleStations.slice(1).map((s, i) => (s + poleStations[i]) / 2);
      /** one strip of the course between stations sa and sb, a0..a1 across; the vertex colour carries the wear tone
       *  (r) and the toll plaza's station where the strip lies within its approach paint (g), aInfo the station of
       *  the nearest lighting pole for the shader */
      /** the station of the nearest signalised junction box among `list` within 60 m of s (0 if none): the strips carry
       *  it so the shader can paint the stop bar and the zebra crossings of that box */
      const stopAt = (s: number, list: PaintBox[]): number => {
        let best = 0, bd = 60;
        for (const b of list) {
          if (b.flag !== 2 || (toll && Math.abs((b.s0 + b.s1) / 2 - toll.s) < 1)) continue;
          const d = Math.abs(s - (b.s0 + b.s1) / 2);
          if (d < bd) { bd = d; best = (b.s0 + b.s1) / 2; }
        }
        return best;
      };
      const quad = (sa: number, sb: number, a0: number, a1: number, kind: number, tA: number, tB: number, up: (s: number) => number, stop: number) => {
        const soup = P((sa + sb) / 2).pave;
        const fa = frameAt(c, sa), fb = frameAt(c, sb);
        const base = soup.vertexCount;
        const pole = poleFor((sa + sb) / 2);
        const plaza = toll && Math.abs((sa + sb) / 2 - toll.s) < 130 ? toll.s : 0;
        const v = (f: Frame, s: number, a: number, t: number) => soup.vertex(f.x + f.rx * a, surfaceAt(c, s, a) + PAVE_UP + up(s), f.z + f.rz * a, 0, 1, 0, [t, plaza, stop], [kind, s, a, pole]);
        v(fa, sa, a0, tA); v(fb, sb, a0, tB); v(fb, sb, a1, tB); v(fa, sa, a1, tA);
        _a.set(fb.x - fa.x, 0, fb.z - fa.z).cross(_b.set(fb.x + fb.rx * a1 - fa.x - fa.rx * a0, 0, fb.z + fb.rz * a1 - fa.z - fa.rz * a0));
        if (_a.y >= 0) soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else soup.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      };
      const cutsBetween = (s0: number, s1: number, extra: number[]): number[] => {
        const cuts = new Set<number>(stations(c, s0, s1));
        for (let k = 1; k < nChunks; k++) { const s = k * chunkLen; if (s > s0 + 0.05 && s < s1 - 0.05) cuts.add(s); }
        for (const s of [...extra, ...midpoints]) if (s > s0 + 0.05 && s < s1 - 0.05) cuts.add(s);
        return [...cuts].sort((p, q) => p - q);
      };
      for (const side of [-1, 1] as const) {
        const mine = boxes.filter((b) => b.side === 0 || b.side === side);
        const ss = cutsBetween(0, c.total, mine.flatMap((b) => [b.s0, b.s1, b.s0 - 15, b.s1 + 15]));
        const up = (s: number) => lift(s, mine);
        for (let i = 0; i + 1 < ss.length; i++) {
          const sa = ss[i], sb = ss[i + 1];
          if (sb - sa < 0.05) continue;
          const sm = (sa + sb) / 2;
          let flag = 0;
          for (const b of mine) if (sm > b.s0 && sm < b.s1) flag = Math.max(flag, b.flag);
          // two quads across, split at the mid-carriageway lift knot (the lift field is bilinear between the knots,
          // so a single quad from the barrier foot to the edge could dip under a crown in the middle of the road)
          const stop = stopAt(sm, mine);
          quad(sa, sb, side * PAVE_IN, side * hw * 0.5, 4 + flag * 0.1, tone(sa, side), tone(sb, side), up, stop);
          quad(sa, sb, side * hw * 0.5, side * (hw - PAVE_EDGE_INSET), 4 + flag * 0.1, tone(sa, side), tone(sb, side), up, stop);
        }
        counts.paveM += c.total;
      }
      // the median gap between the barrier terminals: a double yellow up to the junction box, plain through it
      const plain = boxes.filter((b) => b.flag === 2);
      const upMid = (s: number) => lift(s, plain);
      for (const o of openings) {
        const s0 = Math.max(0, o.s0), s1 = Math.min(c.total, o.s1);
        if (s1 - s0 < 1) continue;
        const ss = cutsBetween(s0, s1, plain.flatMap((b) => [b.s0, b.s1, b.s0 - 15, b.s1 + 15]));
        for (let i = 0; i + 1 < ss.length; i++) {
          const sa = ss[i], sb = ss[i + 1];
          if (sb - sa < 0.05) continue;
          const sm = (sa + sb) / 2;
          const inBox = plain.some((b) => sm > b.s0 && sm < b.s1);
          quad(sa, sb, -PAVE_IN, PAVE_IN, inBox ? 4.2 : 4.3, 1, 1, upMid, stopAt(sm, plain));
        }
      }
    }

    // -------------------------------------------------------- frontage streets: the district street that runs along the shoulder (the coastal
    // grid's street 15 m off the centre line, its kerb on the highway's pavement edge for 1.2 km) read from the air as
    // 22 m of pale pavement with yellow dashes beside the dark lanes. Over each frontage stretch the street is
    // resurfaced in the lane asphalt (kind 5: a local street's dashed yellow centre, plain through the junction
    // boxes) on the roads.ts rows of its own chain, and its edge nearest the highway becomes a planted buffer: a
    // kerbed 1.05 m strip with a clipped hedge, broken at the mouths of the roads meeting the street on the highway's
    // side. The traffic keeps its lanes (1.8 m off the centre): the kerb face stands 3.3 m off it.
    if (graph) {
      for (const run of findFrontage(c, graph)) {
        const { g, cross, side: sd } = run;
        const ghw = g.hw;
        const aFar = -sd * (ghw - PAVE_EDGE_INSET);
        const aKerb = sd * (ghw - PAVE_EDGE_INSET - FRONTAGE_BUFFER_W);
        const aBuf = sd * (ghw - PAVE_EDGE_INSET - FRONTAGE_BUFFER_W * 0.5);
        const gAt = (s: number, a: number): [number, number] => { const f = roadFrameAt(g, cross, s); return [f.x + f.cx * a, f.z + f.cz * a]; };
        const partAt = (s: number) => { const [x, z] = gAt(s, 0); return P(nearestOnChain(c, x, z).s); };
        // the junction boxes on the stretch (the nodes' reach along the street), for the paint
        const boxes = g.nodes.filter((nd) => nd.s > run.s0 - 40 && nd.s < run.s1 + 40).map((nd) => ({ s0: nd.s - nd.hMinus, s1: nd.s + nd.hPlus }));
        const boxOf = (s: number): { s0: number; s1: number } | null => {
          let best: { s0: number; s1: number } | null = null, bd = 60;
          for (const b of boxes) { const d = Math.max(b.s0 - s, s - b.s1); if (d < bd) { bd = d; best = b; } }
          return best;
        };
        const cuts = new Set<number>([run.s0, run.s1]);
        for (const s of g.rows) if (s > run.s0 + 0.05 && s < run.s1 - 0.05) cuts.add(s);
        for (const b of boxes) for (const s of [b.s0, b.s1, b.s0 - 5, b.s1 + 5]) if (s > run.s0 + 0.05 && s < run.s1 - 0.05) cuts.add(s);
        const ss = [...cuts].sort((p, q) => p - q);
        for (let i = 0; i + 1 < ss.length; i++) {
          const sa = ss[i], sb = ss[i + 1];
          if (sb - sa < 0.05) continue;
          const sm = (sa + sb) / 2;
          const b = boxOf(sm);
          const inBox = b !== null && sm > b.s0 && sm < b.s1;
          const soup = partAt(sm).pave;
          const col: Rgb = [ghw, b ? b.s0 : 0, b ? b.s1 : 0];
          const kind = inBox ? 5.2 : 5;
          const base = soup.vertexCount;
          const v = (s: number, a: number) => { const [x, z] = gAt(s, a); soup.vertex(x, streetSurface(g, s, a) + PAVE_UP, z, 0, 1, 0, col, [kind, s, a, 0]); };
          v(sa, aFar); v(sb, aFar); v(sb, aKerb); v(sa, aKerb);
          const [x0, z0] = gAt(sa, aFar), [x1, z1] = gAt(sb, aFar), [x2, z2] = gAt(sb, aKerb);
          _a.set(x1 - x0, 0, z1 - z0).cross(_b.set(x2 - x0, 0, z2 - z0));
          if (_a.y >= 0) soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else soup.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
        // the buffer: sampled every 2 m along its centre, blocked where another road's pavement (not this street, not
        // the highway) comes within 0.5 m of it; each clear interval of 4 m or more is lofted on the street surface
        // at the rows and midway between them, its kerb footing 6 cm into the pavement
        const others = segments.filter((o) => o.cls !== c.cls && o.cls !== 'runway' && o.cls !== 'taxiway' && !g.segs.includes(o));
        // a road's pavement is the rectangle about its centre line (no end caps: a side street ending on the far
        // side of the frontage street does not reach the buffer)
        const blocked = (s: number) => {
          const [x, z] = gAt(s, aBuf);
          return others.some((o) => {
            const dx = o.b[0] - o.a[0], dz = o.b[1] - o.a[1], len = Math.hypot(dx, dz);
            if (len < 1e-6) return false;
            const u = ((x - o.a[0]) * dx + (z - o.a[1]) * dz) / len, w = Math.abs((x - o.a[0]) * -dz + (z - o.a[1]) * dx) / len;
            return u > -0.5 && u < len + 0.5 && w < o.width * 0.5 + 0.5;
          });
        };
        const stationsIn = (s0: number, s1: number): number[] => {
          const st = new Set<number>([s0, s1]);
          for (let k = 0; k + 1 < g.rows.length; k++) {
            const r0 = g.rows[k], r1 = g.rows[k + 1];
            for (const s of [r0, (r0 + r1) / 2]) if (s > s0 + 0.05 && s < s1 - 0.05) st.add(s);
          }
          return [...st].sort((p, q) => p - q);
        };
        const loftBuffer = (s0: number, s1: number) => {
          const frames: Frame[] = stationsIn(s0, s1).map((s) => {
            const f = roadFrameAt(g, cross, s), d = chainFrame(g, s);
            return { x: f.x + f.cx * aBuf, y: streetSurface(g, s, aBuf) - 0.06, z: f.z + f.cz * aBuf, rx: f.cx, rz: f.cz, dx: d.dx, dz: d.dz, s };
          });
          loftH(partAt((s0 + s1) / 2).conc, frames, HEDGE_PROFILE, null, [C_BARRIER, C_BARRIER_TOP, C_HEDGE, C_HEDGE, C_HEDGE, C_BARRIER_TOP, C_BARRIER], 0, 0.5);
        };
        let open = -1;
        for (let s = run.s0; ; s += 2) {
          const sc = Math.min(s, run.s1);
          if (!blocked(sc)) { if (open < 0) open = sc; }
          else if (open >= 0) { if (sc - 2 - open >= 4) loftBuffer(open, sc - 2); open = -1; }
          if (sc >= run.s1) break;
        }
        if (open >= 0 && run.s1 - open >= 4) loftBuffer(open, run.s1);
        counts.frontageM += run.s1 - run.s0;
      }
    }

    // -------------------------------------------------------- guide signs on the shoulder before the arterial junctions, speed limits, chevrons
    const groundSign = (s: number, dir: 1 | -1, w: number, h: number, face: SignFace, back: Rgb, twoSided = false, posts = 2, clearance = 2.1) => {
      const f = frameAt(c, s);
      const side = dir;
      // on the verge 3.2 m off the shoulder, or the first clear spot past a frontage street (up to 14 m out)
      let aS = side * (hw + 3.2);
      let cx = f.x + f.rx * aS, cz = f.z + f.rz * aS;
      for (let k = 0; k < 11 && inRoad(cx, cz, w * 0.5 + 0.5); k++) { aS += side * 1.0; cx = f.x + f.rx * aS; cz = f.z + f.rz * aS; }
      if (inRoad(cx, cz, w * 0.5 + 0.5)) return;
      const ground = Math.min(surfaceAt(c, s, side * hw) - ROAD_LIFT, map.heightAt(cx, cz));
      const faceN = new THREE.Vector3(-f.dx * dir, 0, -f.dz * dir);
      const part = P(s);
      const yaw = yawAt(f);
      const dxs = posts === 2 ? [-w * 0.32, w * 0.32] : [0];
      for (const d of dxs) part.posts.box(cx + f.rx * d, ground - 0.4, cz + f.rz * d, 0.1, clearance + h * 0.5 + 0.4, 0.1, yaw, 0, S_GALV, true, [0, 0, 0], true);
      panel(part.signs, new THREE.Vector3(cx, ground + clearance + h / 2, cz), faceN, w, h, face, back, 0.05, twoSided);
      counts.signs++;
    };
    if (jd) for (const j of majors) {
      const arrowFor = (dir: 1 | -1): Arrow => (j.side === 0 ? 'both' : j.side * dir > 0 ? 'right' : 'left');
      // advance direction signs 1 km and 300 m ahead of the junction on both approaches
      for (const [ahead, label] of [[1000, '1 km'], [330, '300 m']] as const) {
        if (j.s > ahead + 30 && !nearGantry(j.s - ahead, 60) && !nearJunction(j.s - ahead, 14) && !nearPlaza(j.s - ahead, 80)) groundSign(j.s - ahead, 1, 3.0, 1.5, atlas.guide([jd[0], label], arrowFor(1), 256, 128), S_DARK);
        if (j.s < c.total - ahead - 30 && !nearGantry(j.s + ahead, 60) && !nearJunction(j.s + ahead, 14) && !nearPlaza(j.s + ahead, 80)) groundSign(j.s + ahead, -1, 3.0, 1.5, atlas.guide([jd[0], label], arrowFor(-1), 256, 128), S_DARK);
      }
    }

    // -------------------------------------------------------- traffic signals at the arterial junctions: mast arms on the far corners
    /** a signal head (three lenses) hanging from `y` at (x, z), its lenses looking along `faceN`; lens `lit`
     *  (0 red, 2 green) is the one showing: it glows through the steel material's night emissive in its own colour */
    const signalHead = (part: (typeof parts)[number], x: number, y: number, z: number, faceN: THREE.Vector3, yaw: number, lit: 0 | 2) => {
      part.signs.box(x, y - 1.05, z, 0.36, 1.05, 0.32, yaw, 0, S_DARK, false, [0, 0, 0]);
      const lenses: Rgb[] = [[0.85, 0.08, 0.06], [0.95, 0.55, 0.05], [0.05, 0.62, 0.22]];
      lenses.forEach((cl, i) => {
        const ly = y - 0.2 - i * 0.33;
        const on = i === lit;
        part.signs.box(x + faceN.x * 0.17, ly - 0.11, z + faceN.z * 0.17, 0.22, 0.22, 0.04, yaw, 0, on ? cl : [cl[0] * 0.35, cl[1] * 0.35, cl[2] * 0.35], false, [on ? 0.7 : 0, 0, 0]);
        // hood over each lens
        part.signs.box(x + faceN.x * 0.2, ly + 0.11, z + faceN.z * 0.2, 0.28, 0.03, 0.12, yaw, 0, S_DARK, false, [0, 0, 0]);
      });
    };
    /** mast arm: pole at (px, pz) on the ground `ground`, arm of `armLen` toward `armDir` (unit, horizontal), heads at the `along` distances from the pole */
    const mastArm = (part: (typeof parts)[number], px: number, pz: number, ground: number, armDir: THREE.Vector3, armLen: number, heads: number[], faceN: THREE.Vector3, lit: 0 | 2) => {
      const yaw = Math.atan2(armDir.x, armDir.z) + Math.PI / 2;   // box x along the arm
      part.conc.box(px, ground - 0.3, pz, 0.9, 0.5, 0.9, yaw, 0, C_PEDESTAL, false, [0, 0, 0]);
      part.signs.cylinder(px, ground + 0.2, pz, 0.36, 6.6, 8, S_GALV, true, [0, 0, 0], true);
      const base = new THREE.Vector3(px, ground + 6.55, pz);
      const tip = base.clone().addScaledVector(armDir, armLen).setY(ground + 6.9);
      part.signs.strut(base, tip, 0.17, S_GALV, [0, 0, 0]);
      part.proxy.box(px + armDir.x * armLen / 2, ground + 6.2, pz + armDir.z * armLen / 2, armLen, 0.7, 0.5, yaw, 0, S_GALV, false, []);
      part.proxy.box(px, ground, pz, 0.5, 6.6, 0.5, yaw, 0, S_GALV, true, []);
      const headYaw = Math.atan2(faceN.x, faceN.z);
      for (const d of heads) {
        const hx = px + armDir.x * d, hz = pz + armDir.z * d;
        const ay = ground + 6.55 + 0.35 * (d / armLen);
        part.signs.box(hx, ay - 0.35, hz, 0.06, 0.35, 0.06, yaw, 0, S_DARK, true, [0, 0, 0], true);
        signalHead(part, hx, ay - 0.35, hz, faceN, headYaw, lit);
      }
      // a small head on the pole for the near lane and the pedestrians
      signalHead(part, px + armDir.x * 0.4, ground + 4.6, pz + armDir.z * 0.4, faceN, headYaw, lit);
    };
    for (const j of majors) {
      for (const dir of [1, -1] as const) {
        // highway approach in `dir`: pole on its right verge just past the junction, arm back over its carriageway
        const s = j.s + dir * 24;
        if (s < 5 || s > c.total - 5) continue;
        const f = frameAt(c, s);
        const side = dir;
        const aP = side * (hw + 1.6);
        const px = f.x + f.rx * aP, pz = f.z + f.rz * aP;
        const ground = Math.min(surfaceAt(c, s, side * hw) - ROAD_LIFT, map.heightAt(px, pz));
        if (inRoad(px, pz, 0.6)) continue;
        const armDir = new THREE.Vector3(-f.rx * side, 0, -f.rz * side);
        const faceN = new THREE.Vector3(-f.dx * dir, 0, -f.dz * dir);
        // the highway has the green (the frozen bench frame shows the through movement running)
        mastArm(P(s), px, pz, ground, armDir, hw + 1.0, [hw + 1.6 - 8.25, hw + 1.6 - 5.5, hw + 1.6 - 2.75], faceN, 2);
      }
      // the cross road's approach(es): a mast arm across the highway from it, arm over the cross road's lanes
      for (const from of j.side === 0 ? [-1, 1] : [j.side]) {
        const f = frameAt(c, j.s);
        const aP = -from * (hw + 1.6);
        const sP = j.s + 9.5;
        const fp = frameAt(c, sP);
        const px = fp.x + fp.rx * aP, pz = fp.z + fp.rz * aP;
        if (inRoad(px, pz, 0.6)) continue;
        const ground = Math.min(surfaceAt(c, sP, -from * hw) - ROAD_LIFT, map.heightAt(px, pz));
        const armDir = new THREE.Vector3(-f.dx, 0, -f.dz);
        const faceN = new THREE.Vector3(f.rx * from, 0, f.rz * from);
        mastArm(P(sP), px, pz, ground, armDir, 13, [6, 9.5, 13], faceN, 0);
      }
    }
    // -------------------------------------------------------- toll plaza: kerbed islands with booths under a lit canopy, a gate over every lane
    if (toll) {
      const sP = toll.s;
      const f = frameAt(c, sP);
      const yaw = yawAt(f);
      const part = P(sP);
      const roadY = f.y;
      const L = 30, canopyL = 24, canopyW = 2 * hw + 3;
      const clear = 6.0;
      const at2 = (a: number, ds: number) => { const g = frameAt(c, sP + ds); return new THREE.Vector3(g.x + g.rx * a, 0, g.z + g.rz * a); };
      // islands: the median island where the barrier is opened and one between every pair of lanes (lanes 3.2 m
      // apart from the centre, as the traffic drives them), each with a booth and yellow impact attenuators. The
      // inner lanes' vans (2.1 m) pass 0.45 m off the centre line, so the median island is a bare 0.8 m divider
      // carrying the canopy columns and no booth (the lane islands' booths serve the lanes either side of them)
      const islands: { a: number; w: number }[] = [{ a: 0, w: 0.8 }, { a: -3.1, w: 0.9 }, { a: 3.1, w: 0.9 }, { a: -6.35, w: 0.9 }, { a: 6.35, w: 0.9 }];
      const C_ISLAND: Rgb = [0.9, 0.9, 0.88];
      const S_GLASS: Rgb = [0.5, 0.58, 0.66];
      for (const isl of islands) {
        const p = at2(isl.a, 0);
        part.conc.box(p.x, roadY - 0.02, p.z, isl.w, 0.24, L, yaw, 0, C_ISLAND, false, [0, 0, 0]);
        for (const e of [-1, 1]) {
          const q = at2(isl.a, e * (L / 2 + 0.7));
          part.signs.box(q.x, roadY + 0.02, q.z, Math.min(isl.w, 0.9), 0.85, 1.4, yaw, 0, S_DRUM, false, [0, 0, 0]);
        }
        // booth: dark base, glazed cabin (lit at night), galvanised roof with an overhang
        if (isl.a !== 0) {
          const bw = isl.w - 0.1, bd = 2.6;
          part.signs.box(p.x, roadY + 0.22, p.z, bw, 1.1, bd, yaw, 0, S_DARK, false, [0, 0, 0]);
          part.signs.box(p.x, roadY + 1.32, p.z, bw, 1.2, bd, yaw, 0, S_GLASS, false, [0.35, 0, 0]);
          part.signs.box(p.x, roadY + 2.52, p.z, bw + 0.4, 0.12, bd + 0.5, yaw, 0, S_GALV, false, [0, 0, 0]);
        }
        // canopy columns at the island ends
        for (const e of [-1, 1]) {
          const q = at2(isl.a, e * (L / 2 - 2.5));
          part.signs.cylinder(q.x, roadY + 0.22, q.z, Math.min(isl.w - 0.2, 0.6), clear - 0.22, 10, S_GALV, true, [0, 0, 0], true);
          part.proxy.box(q.x, roadY + 0.22, q.z, 0.6, clear - 0.4, 0.6, yaw, 0, S_GALV, true, []);
        }
      }
      // canopy: a pale slab with a white fascia all round, downlights under it (lit at night like the lamps)
      part.conc.box(f.x, roadY + clear, f.z, canopyW, 0.45, canopyL, yaw, 0, C_BARRIER_TOP, false, [0, 0, 0]);
      const C_FASCIA: Rgb = [1.02, 1.02, 1.0];
      for (const e of [-1, 1]) {
        const q = at2(0, e * (canopyL / 2 - 0.1));
        part.conc.box(q.x, roadY + clear - 0.6, q.z, canopyW, 1.25, 0.2, yaw, 0, C_FASCIA, false, [0, 0, 0]);
        const r = at2(e * (canopyW / 2 - 0.1), 0);
        part.conc.box(r.x, roadY + clear - 0.6, r.z, 0.2, 1.25, canopyL, yaw, 0, C_FASCIA, false, [0, 0, 0]);
      }
      for (let a = -hw + 1.6; a <= hw - 1.6 + 0.01; a += 3.2) for (const ds of [-7, 0, 7]) {
        const q = at2(a, ds);
        part.heads.box(q.x, roadY + clear - 0.3, q.z, 0.5, 0.12, 0.5, yaw, 0, S_HEAD, false, [1, 0, 0], 'point');
      }
      // the plaza's name on both fascias, a lane plate over every gate (TAG for the inner lane, cash for the rest)
      for (const dir of [1, -1] as const) {
        const faceN = new THREE.Vector3(-f.dx * dir, 0, -f.dz * dir);
        // traffic running in `dir` arrives from the -dir side: its gates and the name face that edge
        const front = at2(0, -dir * (canopyL / 2 + 0.05));
        panel(part.signs, front.clone().setY(roadY + clear + 0.05), faceN, 6.0, 0.95, atlas.guide([toll.name], null, 384, 64, '#1c3f8a'), S_DARK, 0.12);
        counts.signs++;
        for (const [a, label, color] of [[1.55, 'TAG', '#4b2a8a'], [4.7, 'EFECTIVO', '#0b6b3f'], [8.7, 'EFECTIVO', '#0b6b3f']] as const) {
          const q = at2(dir * a, -dir * (canopyL / 2 - 0.5));
          panel(part.signs, q.clone().setY(roadY + clear - 0.9 - 0.3), faceN, 1.5, 0.6, atlas.guide([label], null, 160, 64, color), S_DARK, 0.2);
          counts.signs++;
        }
        // advance sign 500 m before the plaza
        const sA = sP - dir * 500;
        if (sA > 40 && sA < c.total - 40 && !nearGantry(sA, 60) && !nearJunction(sA, 14)) groundSign(sA, dir, 3.0, 1.5, atlas.guide([toll.name, '500 m'], null, 256, 128, '#1c3f8a'), S_DARK);
      }
    }

    // -------------------------------------------------------- pedestrian overpasses: a concrete span on two columns at the verges, solid parapets,
    // a straight stair down each verge (mirrored, so the pair reads as a Z from the air), lit at night
    for (const sB of footbridges) {
      const f = frameAt(c, sB);
      const yaw = yawAt(f);
      const part = P(sB);
      const roadY = f.y;
      const CLEAR = 5.8, DECK_T = 0.35, DECK_W = 2.4;
      const aCol = hw + 2.4;
      const spanL = 2 * aCol + 2.0;
      const at2 = (a: number, ds: number) => { const g = frameAt(c, sB + ds); return new THREE.Vector3(g.x + g.rx * a, 0, g.z + g.rz * a); };
      part.conc.box(f.x, roadY + CLEAR, f.z, spanL, DECK_T, DECK_W, yaw, 0, C_PEDESTAL, false, [0, 0, 0]);
      for (const e of [-1, 1]) {
        const q = at2(0, e * (DECK_W / 2 - 0.05));
        part.thin.box(q.x, roadY + CLEAR + DECK_T, q.z, spanL, 1.15, 0.08, yaw, 0, S_DARK, false, [0, 0, 0], true);
      }
      for (const side of [-1, 1] as const) {
        const q = at2(side * aCol, 0);
        const ground = Math.min(surfaceAt(c, sB, side * hw) - ROAD_LIFT, map.heightAt(q.x, q.z));
        part.conc.cylinder(q.x, ground - 0.3, q.z, 0.7, roadY + CLEAR - (ground - 0.3), 12, C_PEDESTAL, true, [0, 0, 0], true);
        // the stair leaves the landing along the verge, descending toward -s on the left verge and +s on the right
        const dir = side;
        const run = 12.0, rise = roadY + CLEAR - ground;
        const slope = Math.hypot(run, rise);
        const pitch = dir * Math.atan2(rise, run);   // a positive pitch lowers the +s end (box pitches about its local x)
        const mid = at2(side * aCol, dir * (DECK_W / 2 + run / 2));
        const midY = ground + rise / 2;
        part.conc.box(mid.x, midY - DECK_T / 2, mid.z, 2.0, DECK_T, slope, yaw, pitch, C_PEDESTAL, false, [0, 0, 0]);
        for (const e of [-1, 1]) {
          const r = at2(side * aCol + e * 0.98, dir * (DECK_W / 2 + run / 2));
          part.thin.box(r.x, midY + DECK_T / 2, r.z, 0.08, 1.1, slope, yaw, pitch, S_DARK, false, [0, 0, 0], true);
        }
        // a column under the middle of the stair
        const cm = at2(side * aCol, dir * (DECK_W / 2 + run / 2));
        part.conc.cylinder(cm.x, ground - 0.3, cm.z, 0.45, rise / 2 + 0.3 - DECK_T / 2, 10, C_PEDESTAL, true, [0, 0, 0], true);
        // a lamp on each landing
        const lp = at2(side * (aCol + 0.9), 0);
        part.thin.cylinder(lp.x, roadY + CLEAR + DECK_T, lp.z, 0.1, 3.6, 6, S_POLE, true, [0, 0, 0], true);
        part.heads.box(lp.x, roadY + CLEAR + DECK_T + 3.55, lp.z, 0.4, 0.15, 0.25, yaw, 0, S_HEAD, false, [1, 0, 0], 'point');
      }
      part.proxy.box(f.x, roadY + CLEAR, f.z, spanL, DECK_T + 1.1, DECK_W, yaw, 0, C_PEDESTAL, false, []);
    }

    for (const dir of [1, -1] as const) {
      for (let s = dir > 0 ? 140 : c.total - 140; dir > 0 ? s < c.total - 60 : s > 60; s += dir * 900) {
        if (nearGantry(s, 60) || nearJunction(s, 30) || nearPlaza(s, 120) || nearFoot(s, 30)) continue;
        groundSign(s, dir, 0.75, 0.75, atlas.speed('90'), S_DARK, false, 1, 2.0);
      }
    }
    // chevrons on the outside of any bend sharper than 8 degrees
    for (let i = 1; i < c.pts.length - 1; i++) {
      const d0 = c.dirs[i - 1], d1 = c.dirs[i];
      const turn = Math.atan2(d0[0] * d1[1] - d0[1] * d1[0], d0[0] * d1[0] + d0[1] * d1[1]);
      if (Math.abs(turn) < THREE.MathUtils.DEG2RAD * 8) continue;
      // a left turn (negative, in this x-east / z-south frame) has its outside on the right (+cross)
      const outside: 1 | -1 = turn < 0 ? 1 : -1;
      for (let k = -1; k <= 2; k++) {
        const s = c.cum[i] + k * 18 - 9;
        if (s < 5 || s > c.total - 5) continue;
        const f = frameAt(c, s);
        const aS = outside * (hw + 1.4);
        const cx = f.x + f.rx * aS, cz = f.z + f.rz * aS;
        if (inRoad(cx, cz, 0.6)) continue;
        const ground = Math.min(surfaceAt(c, s, outside * hw) - ROAD_LIFT, map.heightAt(cx, cz));
        const part = P(s);
        part.posts.box(cx, ground - 0.3, cz, 0.08, 1.75, 0.08, yawAt(f), 0, S_GALV, true, [0, 0, 0], true);
        panel(part.signs, new THREE.Vector3(cx, ground + 1.45 + 0.375, cz), new THREE.Vector3(-f.dx, 0, -f.dz), 0.6, 0.75, atlas.chevron(), S_YELLOW, 0.0, true);
        counts.signs++;
      }
    }

    // -------------------------------------------------------- drainage inlets at the shoulder edge every 60 m, staggered by side
    for (const side of [-1, 1] as const) {
      for (let s = side > 0 ? 18 : 48; s < c.total - 10; s += 60) {
        if (nearJunction(s, 12) || nearPlaza(s, 30)) continue;
        const f = frameAt(c, s);
        const aI = side * (hw - 0.75);
        const ix = f.x + f.rx * aI, iz = f.z + f.rz * aI;
        const y = surfaceAt(c, s, aI);
        const part = P(s);
        part.conc.box(ix, y + 0.004, iz, 1.4, 0.012, 1.1, yawAt(f), 0, C_APRON, false, [0, 0, 0]);
        // the grate's `along` runs across the flow so the bars read across the shoulder
        const g = part.conc;
        const base = g.vertexCount;
        const yaw = yawAt(f);
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const corner = (ax: number, az: number) => [ix + ax * cy + az * sy, iz - ax * sy + az * cy];
        const cs = [corner(-0.45, -0.3), corner(0.45, -0.3), corner(0.45, 0.3), corner(-0.45, 0.3)];
        const us = [0, 1, 1, 0];
        for (let k = 0; k < 4; k++) g.vertex(cs[k][0], y + 0.02, cs[k][1], 0, 1, 0, C_GRATE, [2, us[k], 0]);
        g.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }

    // -------------------------------------------------------- chunk meshes
    for (let k = 0; k < nChunks; k++) {
      const p = parts[k];
      const chunk: Chunk = { meshes: [], steel: null, headsEnd: 0, thinEnd: 0, signs: null, concrete: null, center: new THREE.Vector3(), r: 0, dist: Infinity };
      const chunkBox = new THREE.Box3();
      const attach = (mesh: THREE.Mesh, cls: CasterClass, noMirror: boolean) => {
        mesh.name = `${c.id}#${k}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.userData.noMirror = noMirror;
        mesh.onBeforeRender = (r, _s, camera) => { observe(r, camera); };
        const box = mesh.geometry.boundingBox!;
        chunk.meshes.push({ mesh, cls, box, height: box.max.y - box.min.y, inView: true, cast: ALL_CASCADES });
        chunkBox.union(box);
        group.add(mesh);
        counts.meshes++;
        counts.triangles += mesh.geometry.index!.count / 3;
      };
      const steelGeometry = (soup: Soup) => {
        const g = soup.build([['aGlow', 1], ['aUv', 2]]);
        g.setAttribute('uv', g.getAttribute('aUv'));
        g.deleteAttribute('aUv');
        return g;
      };
      if (p.pave.idx.length) {
        // drawn first of the transparent meshes (before the thin steel it lies under, whose coverage alpha must
        // blend against it, not against the pale pavement below), never a caster, never cut by distance
        const m = new THREE.Mesh(p.pave.build([['aInfo', 4]]), concreteMat);
        attach(m, 'mid', false);
        chunk.meshes[chunk.meshes.length - 1].receiveOnly = true;
        m.castShadow = false;
        m.renderOrder = -1;
      }
      if (p.conc.idx.length) {
        const g = p.conc.build([['aInfo', 4]]);
        const m = new THREE.Mesh(g, concreteMat);
        chunk.concrete = m;
        attach(m, 'mid', false);
      }
      if (p.heads.idx.length || p.thin.idx.length || p.posts.idx.length) {
        const headsEnd = p.heads.idx.length;
        p.heads.append(p.thin);
        const thinEnd = p.heads.idx.length;
        p.heads.append(p.posts);
        const m = new THREE.Mesh(steelGeometry(p.heads), steelMat);
        chunk.steel = m; chunk.headsEnd = headsEnd; chunk.thinEnd = thinEnd;
        attach(m, 'near', true);
      }
      if (p.signs.idx.length) {
        const m = new THREE.Mesh(steelGeometry(p.signs), steelMat);
        chunk.signs = m;
        attach(m, 'mid', false);
      }
      if (p.proxy.idx.length) {
        const m = new THREE.Mesh(p.proxy.build([]), proxyMat);
        m.receiveShadow = false;
        attach(m, 'mid', true);
        chunk.meshes[chunk.meshes.length - 1].shadowOnly = true;
        m.visible = false;
      }
      if (!chunk.meshes.length) continue;
      const sphere = chunkBox.getBoundingSphere(new THREE.Sphere());
      chunk.center.copy(sphere.center); chunk.r = sphere.radius;
      culler.chunks.push(chunk);
      counts.chunks++;
    }
  }
  atlas.texture.needsUpdate = true;
  return { group, counts };
}
