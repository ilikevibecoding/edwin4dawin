import * as THREE from 'three';
import { MAP_N, WORLD_SIZE, type BridgeSpec, type Vec2, type WorldMap } from './map';
import { clamp, lerp, smoothstep } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { ALL_CASCADES, ViewCull, layerMask, maskCasts, type CasterClass } from './culling';

export interface BridgeRoute {
  id: string;
  /** 3D centreline points at ~20 m spacing (x, y deck top, z) */
  pts: THREE.Vector3[];
  width: number;
  lanes: number;
  traffic: number;
}

function polylineLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

function pointAt(pts: Vec2[], s: number): { x: number; z: number; dx: number; dz: number } {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      const dx = (pts[i + 1][0] - pts[i][0]) / l, dz = (pts[i + 1][1] - pts[i][1]) / l;
      return { x: pts[i][0] + dx * l * t, z: pts[i][1] + dz * l * t, dx, dz };
    }
    acc += l;
  }
  return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
}

/** Vertical alignment of a deck, the way a highway profile is laid out: grade lines meeting at points of vertical
 *  intersection (PVIs), each PVI rounded by a parabolic vertical curve of length `L` (a crest over the main span,
 *  sags where the approach grades meet the low deck). Adjacent curves never overlap, so the profile is C1 everywhere
 *  and has no local bumps at the pylons. */
interface Alignment { s: number[]; h: number[]; L: number[]; }

/** Grade of the raised approaches (4 %: the steepest most highway bridges use) and the limit before a side drops its
 *  flat low section and climbs straight from the abutment. */
const APPROACH_GRADE = 0.04;
const MAX_GRADE = 0.055;

/** The ground as the clipmap renders it: terrain.ts samples the height texture without the half-texel offset, so its
 *  surface is `heightAt` shifted half a cell toward +x, +z; anything that must clear the ground clears both readings. */
export function terrainAt(map: WorldMap, x: number, z: number): number {
  const half = (WORLD_SIZE / MAP_N) * 0.5;
  return Math.max(map.heightAt(x, z), map.heightAt(x - half, z - half));
}

/** Height of the road surface where the approach road meets a deck end at (x, z), the road arriving along (dx, dz):
 *  the roads.ts pavement there (heightAt + 0.15), or 8 cm over the highest point of the rendered terrain under the
 *  last 30 m of the approach across the road's width where that stands higher - the highway's course rides over
 *  such a crown (highway.ts lift field) and must arrive flush with the approach slab. Shared by the deck alignment
 *  (deck end = this + 4 cm) and the highway's end rows. */
export function landingSurface(map: WorldMap, x: number, z: number, dx: number, dz: number, hw: number): number {
  let h = Math.max(map.heightAt(x, z), 0.5) + 0.15;
  const nx = -dz, nz = dx;
  for (let s = 0; s <= 30; s += 2.5) {
    for (let a = -hw; a <= hw + 1e-6; a += hw / 4) {
      const px = x - dx * s + nx * a, pz = z - dz * s + nz * a;
      h = Math.max(h, terrainAt(map, px, pz) + 0.08);
    }
  }
  return h;
}

function buildAlignment(spec: BridgeSpec, map: WorldMap, total: number): Alignment {
  const rampLen = Math.min(160, total * 0.35);
  // the deck top meets the road surface (roads.ts lifts its pavement 0.15 m off the terrain, the highway's course
  // rides over the terrain where it crowns under the approach) with a 4 cm approach-slab step
  const n = spec.pts.length;
  const [ax, az] = spec.pts[0], [bx, bz] = spec.pts[1], [yx, yz] = spec.pts[n - 2], [zx, zz] = spec.pts[n - 1];
  const lA = Math.hypot(bx - ax, bz - az) || 1, lB = Math.hypot(zx - yx, zz - yz) || 1;
  // the road arrives at each end travelling onto the deck: its last 30 m lie behind the end, away from the deck
  const hA = landingSurface(map, ax, az, (bx - ax) / lA, (bz - az) / lA, 11) + 0.04;
  const hB = landingSurface(map, zx, zz, (yx - zx) / lB, (yz - zz) / lB, 11) + 0.04;
  const D = spec.deck;
  const pvi: { s: number; h: number; L: number }[] = [{ s: 0, h: hA, L: 0 }];
  if (spec.archHeight > 0 && spec.archLength > 0) {
    const centre = spec.archT * total;
    const R = spec.archHeight - D;
    const cableStayed = spec.archHeight >= 20 && spec.archLength >= 350;
    const mainSpan = cableStayed ? Math.min(spec.archLength * 0.5, 300) : spec.archLength * 0.8;
    const Ls = 160;                                   // sag curve where the grade meets the low deck
    let Lc = Math.max(200, mainSpan * 1.5);           // crest curve: covers the main span and its pylons
    // one side at a time: a flat low section, then the approach grade (tangent length Lh from the crest PVI), if
    // there is room for it at <= MAX_GRADE; otherwise the deck climbs straight from the abutment
    const side = (room: number): { L: number; direct: boolean } => {
      const Lh = R / APPROACH_GRADE + Lc / 4;
      if (Lh <= room) return { L: Lh, direct: false };
      if (R / (room - Lc / 4) <= MAX_GRADE) return { L: room, direct: false };
      return { L: 0, direct: true };
    };
    const left = side(centre - rampLen - Ls * 0.5 - 20);
    const right = side(total - centre - rampLen - Ls * 0.5 - 20);
    if (!left.direct) { pvi.push({ s: rampLen, h: D, L: 120 }); pvi.push({ s: centre - left.L, h: D, L: Ls }); }
    // the crest PVI sits above the clearance by the parabola's midpoint offset so the deck's high point lands on
    // `archHeight`: Hp = archHeight + Lc/8 (gL + gR) with the grades themselves depending on Hp (linear solve)
    const baseL = left.direct ? hA : D, lenL = left.direct ? centre : left.L;
    const baseR = right.direct ? hB : D, lenR = right.direct ? total - centre : right.L;
    Lc = Math.min(Lc, lenL, lenR);
    const k = (Lc / 8) * (1 / lenL + 1 / lenR);
    const Hp = (spec.archHeight - (Lc / 8) * (baseL / lenL + baseR / lenR)) / (1 - k);
    pvi.push({ s: centre, h: Hp, L: Lc });
    if (!right.direct) { pvi.push({ s: centre + right.L, h: D, L: Ls }); pvi.push({ s: total - rampLen, h: D, L: 120 }); }
  } else {
    pvi.push({ s: rampLen, h: D, L: 120 });
    pvi.push({ s: total - rampLen, h: D, L: 120 });
  }
  pvi.push({ s: total, h: hB, L: 0 });
  // curves may not overlap: each takes at most the gap to its neighbours
  const a: Alignment = { s: [], h: [], L: [] };
  for (let i = 0; i < pvi.length; i++) {
    let L = pvi[i].L;
    if (i > 0) L = Math.min(L, pvi[i].s - pvi[i - 1].s);
    if (i < pvi.length - 1) L = Math.min(L, pvi[i + 1].s - pvi[i].s);
    a.s.push(pvi[i].s); a.h.push(pvi[i].h); a.L.push(Math.max(0, L));
  }
  return a;
}

function evalAlignment(a: Alignment, s: number): number {
  const n = a.s.length;
  s = clamp(s, a.s[0], a.s[n - 1]);
  let i = 0;
  while (i < n - 2 && s > a.s[i + 1]) i++;
  const grade = (k: number) => (a.h[k + 1] - a.h[k]) / Math.max(a.s[k + 1] - a.s[k], 1e-6);
  // inside the curve of PVI k: h = h_k + g_in u + (g_out - g_in) (u + L/2)^2 / (2 L), u = s - s_k in [-L/2, L/2]
  const curve = (k: number): number | null => {
    const L = a.L[k];
    if (L <= 0) return null;
    const u = s - a.s[k];
    if (Math.abs(u) > L * 0.5) return null;
    const gIn = k > 0 ? grade(k - 1) : grade(k), gOut = k < n - 1 ? grade(k) : grade(k - 1);
    const w = u + L * 0.5;
    return a.h[k] + gIn * u + ((gOut - gIn) * w * w) / (2 * L);
  };
  const c0 = curve(i), c1 = curve(i + 1);
  if (c0 !== null) return c0;
  if (c1 !== null) return c1;
  return a.h[i] + grade(i) * (s - a.s[i]);
}

const _alignments = new WeakMap<BridgeSpec, Alignment>();

export function deckHeightProfile(spec: BridgeSpec, map: WorldMap, s: number, total: number): number {
  let a = _alignments.get(spec);
  if (!a) { a = buildAlignment(spec, map, total); _alignments.set(spec, a); }
  return evalAlignment(a, s);
}

export interface BridgeBuild {
  group: THREE.Group;
  routes: BridgeRoute[];
  /** carriageway ribbons: `aRoadUv` (across -1..1, metres along) and `aRoadInfo` (lanes, width, median half-width) */
  deckGeometry: THREE.BufferGeometry;
  lampPositions: THREE.Vector3[];
  /** per bridge: where the deck stands on fill and where the abutments face the water (debug / bench) */
  approaches: { id: string; total: number; fill: [number, number][]; abutments: { s: number; dir: 1 | -1 }[] }[];
}

// ------------------------------------------------------------------ constants

/** target chunk length along a bridge (m); every chunk gets its own meshes and bounds so the view and the
 *  shadow cascades only draw the stretches they can see */
const CHUNK_LEN = 1000;
/** beyond this the railings / posts are under a pixel wide and only the lamp heads stay drawn; beyond HEAD_DISTANCE
 *  the heads go too (they are 45 m apart and merge into the deck line) */
const THIN_DISTANCE = 2500;
const HEAD_DISTANCE = 5000;
/** beyond this the pier columns are a pixel or two wide and vanish against the water: the chunk's concrete mesh
 *  then also draws its pier proxies (fattened, shaded columns and a dark soffit slab per span) so the causeway
 *  keeps its rhythm of piers and its underside shadow line at the distances of the aerial views */
const PIER_PROXY_DISTANCE = 450;
/** beyond this the per-column proxies give way to one solid slab per pier, the only thing a 2-6 km eye resolves */
const PIER_PROXY_FAR_DISTANCE = 1600;
/** peak radiance of the lamp heads (props' street lamps glow at 8 x night) */
const LAMP_GLOW = 6.0;
/** girder depth below the deck top (m), parapet height above it, kerb step of the shoulders */
const GIRDER_DEPTH = 2.4;
const PARAPET_H = 1.05;
const KERB = 0.15;
const STEP = 10;
/** F-shape concrete median barrier (81 cm tall, 61 cm base), counter-clockwise from the right foot; shared with
 *  the highway module so the barrier runs unchanged from the pavement onto the decks */
export const F_BARRIER_H = 0.81;
export const F_BARRIER_PROFILE: readonly (readonly [number, number])[] = [[0.305, 0], [0.305, 0.075], [0.24, 0.33], [0.10, F_BARRIER_H], [-0.10, F_BARRIER_H], [-0.24, 0.33], [-0.305, 0.075], [-0.305, 0]];
/** deck drainage: scupper openings in the kerb every SCUPPER_STEP metres, each with a downpipe under the fascia */
const SCUPPER_STEP = 15;

// ------------------------------------------------------------------ materials

/** Pavement shading for the carriageway (vertices with `aRoadInfo.x` = lanes > 0); everything else in the same mesh
 *  is plain concrete tinted by its vertex colour with a little run-off weathering.
 *  Every line, joint and dash is box-filtered over the pixel footprint (`aaLine`) and every periodic pattern
 *  fades to its mean once its period drops to a few pixels, so the deck reads the same from 45 m and 2 km and
 *  does not shimmer when the camera moves (the old hard steps aliased into crawling dots at grazing angles). */
const CONCRETE_FRAG = /* glsl */ `
{
  if (vRoadInfo.x > 0.5) {
    float lanes = vRoadInfo.x;
    float width = vRoadInfo.y;
    float median = vRoadInfo.z;
    float xm = vRoadUv.x * width * 0.5;
    float along = vRoadUv.y;
    // pixel footprint across / along the deck (metres per pixel) and on the ground plane
    float fwX = max(fwidth(xm), 1e-4);
    float fwA = max(fwidth(along), 1e-4);
    float fp = length(fwidth(vWorldPosR.xz));
    float n = fbm3(vWorldPosR.xz * 0.11);
    // 43 cm grain: band-limited (fades to its mean once a pixel spans a good part of its wavelength)
    float n2 = mix(vnoise(vWorldPosR.xz * 2.3), 0.5, smoothstep(0.12, 0.4, fp));
    // asphalt wearing course over the concrete deck (the tones of the highway's wearing course, highway.ts, so the
    // carriageway runs unbroken over the abutment joint): dark lanes, an older paler mix on the shoulders, pale
    // concrete kerbs and parapets outside - from the air the deck reads as a dark ribbon with bright edges and a
    // bright median spine over the water, not as one pale slab
    float onShoulder = clamp((abs(xm) - width * 0.5 - 0.005) / fwX + 0.5, 0.0, 1.0);
    vec3 conc = mix(vec3(0.07, 0.07, 0.067), vec3(0.11, 0.107, 0.104), n) * (0.94 + 0.12 * n2);
    vec3 shoulder = mix(vec3(0.20, 0.20, 0.19), vec3(0.27, 0.265, 0.25), n) * (0.95 + 0.10 * n2);
    // the deck's 6 m joints reflect through the asphalt as faint transverse cracks; paving-lane seams at the lane edges
    float laneW = width / max(lanes, 1.0);
    float u = xm + width * 0.5;
    float k = floor(u / laneW);
    float lp = u - k * laneW;
    float edgeDist = min(lp, laneW - lp);
    float jf = fract(along / 6.0);
    float joint = mix(aaLine((jf - 0.5) * 6.0, 0.065, fwA), 0.022, smoothstep(1.5, 4.0, fwA));
    float laneJoint = mix(aaLine(edgeDist, 0.05, fwX), 0.1 / laneW, smoothstep(0.8, 2.5, fwX));
    conc *= 1.0 - 0.14 * joint - 0.08 * laneJoint;
    // tyre paths, joint staining (the dark smear tyres drag off every transverse joint) and weathering patches
    float wheel = mix(exp(-pow((abs(lp - laneW * 0.5) - laneW * 0.28) * 3.0, 2.0)), 0.18, smoothstep(0.5, 2.0, fwX));
    conc *= 1.0 - 0.17 * wheel;
    float stain = mix((1.0 - smoothstep(0.5, 0.9, jf)) * smoothstep(0.5, 0.56, jf) * (0.4 + 0.6 * n2), 0.12, smoothstep(1.5, 4.0, fwA));
    conc *= 1.0 - 0.10 * stain * wheel - 0.04 * stain;
    conc *= 1.0 - 0.12 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    shoulder *= 1.0 - 0.15 * joint - 0.1 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    conc = mix(conc, shoulder, onShoulder);
    // markings sized to read from a 45 m chase camera: 30 cm white edge lines, 30 cm lane dashes (3 m on / 6 m off),
    // yellow centre: dashed on two-lane decks, a double line on four lanes, lines beside the barrier on six
    float laneEdge = aaLine(edgeDist, 0.15, fwX) * step(0.5, k) * step(k, lanes - 1.5) * step(0.6, abs(xm));
    float dashPulse = mix(aaLine((fract(along / 9.0) - 0.17) * 9.0, 1.53, fwA), 0.34, smoothstep(2.0, 6.0, fwA));
    float dashes = laneEdge * dashPulse;
    float edgeLine = aaLine(abs(xm) - (width * 0.5 - 0.45), 0.15, fwX);
    float centre = 0.0;
    if (lanes < 3.5) centre = aaLine(xm, 0.075, fwX) * mix(aaLine((fract(along / 9.0) - 0.225) * 9.0, 2.025, fwA), 0.45, smoothstep(2.0, 6.0, fwA));
    else if (median > 0.0) centre = aaLine(abs(xm) - (median + 0.45), 0.075, fwX);
    else centre = aaLine(abs(xm) - 0.26, 0.075, fwX);
    diffuseColor.rgb = mix(conc, vec3(0.92), max(edgeLine, dashes) * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.66, 0.14), centre * 0.94);
    roughnessFactor = 0.82;
  } else if (vRoadInfo.y > 2.5) {
    // riprap: quarried rock 0.5-1 m, every stone its own tone (fading to the mean once a stone is a pixel),
    // wet and dark below the splash line
    float fp = length(fwidth(vWorldPosR.xz)) + abs(fwidth(vWorldPosR.y));
    vec3 pr = vWorldPosR * vec3(1.5, 1.3, 1.5);
    float stone = hash11(floor(pr.x) * 17.0 + floor(pr.z) * 31.0 + floor(pr.y) * 7.0);
    float grain = vnoise(pr.xz * 2.7 + pr.y);
    float far = smoothstep(0.35, 1.4, fp);
    diffuseColor.rgb *= mix(0.55 + 0.9 * stone, 1.0, far) * mix(0.82 + 0.36 * grain, 1.0, far);
    diffuseColor.rgb *= 1.0 - 0.4 * (1.0 - smoothstep(-0.2, 1.1, vWorldPosR.y));
    roughnessFactor = 0.96;
  } else if (vRoadInfo.y > 1.5) {
    // embankment fill: mottled earth or sand, a little darker where the slope meets the ground
    float m = fbm3(vWorldPosR.xz * 0.35);
    float m2 = mix(vnoise(vWorldPosR.xz * 1.9), 0.5, smoothstep(0.15, 0.6, length(fwidth(vWorldPosR.xz))));
    diffuseColor.rgb *= (0.84 + 0.3 * m) * (0.92 + 0.16 * m2);
    roughnessFactor = 0.97;
  } else {
    // run-off streaks down the faces and a little grime
    float streak = fbm3(vec2(vWorldPosR.x + vWorldPosR.z, vWorldPosR.y * 0.25) * 0.7);
    diffuseColor.rgb *= mix(0.90 + 0.14 * streak, 0.80 + 0.22 * streak, vRoadInfo.y);
    // formwork: lift joints every 3.2 m up every face; on the piers and pylons (aRoadInfo.y = 1) panel joints
    // every 2.4 m along the face too (only the world axis that varies across the face draws them)
    float fwY = max(fwidth(vWorldPosR.y), 1e-4);
    float lift = aaLine((fract(vWorldPosR.y / 3.2) - 0.5) * 3.2, 0.03, fwY) * (1.0 - smoothstep(0.4, 1.2, fwY));
    float fwPx = fwidth(vWorldPosR.x), fwPz = fwidth(vWorldPosR.z);
    float panel = aaLine((fract(vWorldPosR.x / 2.4) - 0.5) * 2.4, 0.03, max(fwPx, 1e-4)) * step(1e-5, fwPx) * (1.0 - smoothstep(0.4, 1.2, fwPx))
                + aaLine((fract(vWorldPosR.z / 2.4) - 0.5) * 2.4, 0.03, max(fwPz, 1e-4)) * step(1e-5, fwPz) * (1.0 - smoothstep(0.4, 1.2, fwPz));
    diffuseColor.rgb *= 1.0 - 0.14 * lift - 0.10 * clamp(panel, 0.0, 1.0) * vRoadInfo.y;
    // each 4 m construction lift of a pier or pylon was poured on a different day: alternating tones (+-6 %)
    // that are the one formwork feature still legible from 300 m (fades to the mean once a lift is ~2 px tall)
    float liftTone = (hash11(floor(vWorldPosR.y / 4.0 + 0.5) + floor(vWorldPosR.x * 0.02) * 7.0) - 0.5) * (1.0 - smoothstep(1.0, 2.5, fwY));
    diffuseColor.rgb *= 1.0 + 0.12 * liftTone * vRoadInfo.y;
    // tide and spray darken the concrete near the water
    diffuseColor.rgb *= 1.0 - 0.22 * (1.0 - smoothstep(0.3, 5.0, vWorldPosR.y)) * vRoadInfo.y;
  }
}
`;

/** The bridge concrete: pavement + structure in one material so a chunk of causeway is a single draw call. The
 *  material is derived from the shared bridge concrete game.ts registered with the CSM (defines + compile hook)
 *  and it is that material's only consumer, so the CSM keeps its uniforms current. */
function createConcreteMaterial(concrete: THREE.Material): THREE.MeshStandardMaterial {
  const src = concrete as THREE.MeshStandardMaterial;
  const mat = new THREE.MeshStandardMaterial({ color: src.color.clone(), roughness: src.roughness, metalness: 0.0, vertexColors: true });
  if (src.defines) mat.defines = { ...src.defines };
  mat.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile.call(src, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;\n${GLSL_NOISE}\n${GLSL_AA_LINE}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${CONCRETE_FRAG}`);
  };
  mat.customProgramCacheKey = () => 'bridge-concrete-v5';
  return mat;
}

/** Box-filtered coverage of a line of half-width `h` at signed distance `d`, for a pixel footprint `fw` (same
 *  units): exact area of the pixel's interval inside the line, so a line thinner than a pixel dims instead of
 *  breaking into dots. */
export const GLSL_AA_LINE = /* glsl */ `
float aaLine(float d, float h, float fw) { return clamp((min(h, d + 0.5 * fw) - max(-h, d - 0.5 * fw)) / fw, 0.0, 1.0); }
`;

/** Screen-space minimum thickness of the thin steel. Members carry the point of their own axis nearest to every
 *  vertex (`aAxis.xyz`, w = 1 for thin members); when the member's projected width would fall under this many
 *  pixels its cross-section is inflated around the axis to that width, and the missing coverage is written to
 *  the alpha instead: a 22 cm cable at 2 km is a continuous faint line, not a chain of dots (with or without
 *  MSAA — the clips are captured without). The width the geometry projects to is ~1.7 x the vertex radius
 *  (six-sided prisms, boxes seen across their diagonal). */
export const STEEL_MIN_PX = 1.75;
/** The inflation alone (needs `attribute vec4 aAxis`, `uniform float uPixelScale`, `varying float vCover`); shared
 *  with the highway furniture, whose barriers and posts use it under their own materials. */
export const MIN_WIDTH_VERT = /* glsl */ `
vCover = 1.0;
if (aAxis.w > 0.5) {
  vec3 offR = transformed - aAxis.xyz;
  float rr = length(offR);
  float depth = max(-(modelViewMatrix * vec4(aAxis.xyz, 1.0)).z, 1.0);
  float widthPx = rr * 1.7 * uPixelScale / depth;
  if (rr > 1e-5 && widthPx < ${STEEL_MIN_PX.toFixed(2)}) {
    transformed = aAxis.xyz + offR * (${STEEL_MIN_PX.toFixed(2)} / widthPx);
    vCover = widthPx / ${STEEL_MIN_PX.toFixed(2)};
  }
}
`;
const STEEL_VERT = /* glsl */ `
vGlow = aGlow;
${MIN_WIDTH_VERT}
`;
/** A lit lamp head keeps at least this much opacity however far it is (its inflated 2 px dot stays a lit dot to
 *  the head cut-off distance instead of fading with its sub-pixel coverage: a street light at 4 km is far brighter
 *  than anything its pixel averages with). Applied through `emissive`, so only while the lamps are on. */
export const LIT_DOT_ALPHA = 0.55;
export const STEEL_ALPHA_FRAG = /* glsl */ `
diffuseColor.a *= max(vCover, vGlow * ${LIT_DOT_ALPHA.toFixed(2)} * smoothstep(0.3, 1.5, length(emissive)));
`;

/** Bridge steel (railings, cables, lamp posts, arches): vertex-coloured, with a per-vertex `aGlow` mask that turns the
 *  lamp heads into emitters; `emissiveIntensity` follows the key light (dusk and night) in BridgeCuller.update.
 *  `pixelScale` (pixels per metre at 1 m of view depth = P[1][1] * viewport height / 2) must be set by the
 *  meshes' onBeforeRender so the minimum-width inflation knows the size of a pixel in every pass. */
function createSteelMaterial(steel: THREE.Material): { mat: THREE.MeshStandardMaterial; pixelScale: THREE.IUniform<number> } {
  const src = steel as THREE.MeshStandardMaterial;
  const pixelScale: THREE.IUniform<number> = { value: 1000 };
  // alpha carries the sub-pixel coverage of the thin members; everything else stays at 1. Depth is still
  // written so the members occlude each other and the deck like opaque steel.
  const mat = new THREE.MeshStandardMaterial({ color: src.color.clone(), roughness: src.roughness, metalness: src.metalness, vertexColors: true, emissive: new THREE.Color(1.0, 0.8, 0.52), emissiveIntensity: 0, transparent: true, depthWrite: true });
  if (src.defines) mat.defines = { ...src.defines };
  mat.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile.call(src, shader, renderer);
    shader.uniforms.uPixelScale = pixelScale;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow; attribute vec4 aAxis; varying float vGlow; varying float vCover; uniform float uPixelScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${STEEL_VERT}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow; varying float vCover;')
      .replace('#include <color_fragment>', `#include <color_fragment>\n${STEEL_ALPHA_FRAG}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow;');
  };
  mat.customProgramCacheKey = () => 'bridge-steel-v3';
  return { mat, pixelScale };
}

/** Lamp glow 0..1 for the key light: on through dusk (sun under ~10 deg) and whenever the key light is the moon. */
export function lampGlowFor(sunDir: THREE.Vector3, keyIntensity: number): number {
  const elevation = (Math.asin(clamp(sunDir.y, -1, 1)) * 180) / Math.PI;
  return Math.max(1 - smoothstep(2, 10, elevation), 1 - smoothstep(0.15, 0.6, keyIntensity));
}

// ------------------------------------------------------------------ geometry accumulation

/** A centreline sample: position of the deck top, unit `right` (across) and forward direction. */
export interface Frame { x: number; y: number; z: number; rx: number; rz: number; dx: number; dz: number; s: number; }

export type Rgb = readonly [number, number, number];
const WHITE: Rgb = [1, 1, 1];

/** World-space indexed triangle soup with flat normals, a vertex colour and `extraSize` extra floats per vertex
 *  (aRoadUv + aRoadInfo for the concrete, aGlow for the steel). Steel soups (`hasAxis`) also carry `aAxis`: the
 *  point of the member's axis nearest to the vertex and a flag marking members thin enough for the screen-space
 *  minimum width (see STEEL_VERT). Baked once; one mesh per chunk. */
export class Soup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly col: number[] = [];
  readonly extra: number[] = [];
  readonly idx: number[] = [];
  readonly bounds = new THREE.Box3();
  constructor(readonly extraSize: number, readonly hasAxis = false) {}

  get vertexCount(): number { return this.pos.length / 3; }
  get triangleCount(): number { return this.idx.length / 3; }
  /** floats per vertex in `extra` */
  get stride(): number { return this.extraSize + (this.hasAxis ? 4 : 0); }

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: Rgb, extra?: readonly number[], axis?: THREE.Vector3 | null): number {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.col.push(c[0], c[1], c[2]);
    // extras shorter than the layout are padded with zeros (a soup may carry an optional trailing component)
    if (this.extraSize) { if (extra) for (let i = 0; i < this.extraSize; i++) this.extra.push(extra[i] ?? 0); else for (let i = 0; i < this.extraSize; i++) this.extra.push(0); }
    if (this.hasAxis) { if (axis) this.extra.push(axis.x, axis.y, axis.z, 1); else this.extra.push(x, y, z, 0); }
    const bb = this.bounds;
    if (x < bb.min.x) bb.min.x = x; if (x > bb.max.x) bb.max.x = x;
    if (y < bb.min.y) bb.min.y = y; if (y > bb.max.y) bb.max.y = y;
    if (z < bb.min.z) bb.min.z = z; if (z > bb.max.z) bb.max.z = z;
    return this.vertexCount - 1;
  }

  /** Appends another soup (same extra layout). */
  append(o: Soup): void {
    const base = this.vertexCount;
    for (const v of o.pos) this.pos.push(v);
    for (const v of o.nrm) this.nrm.push(v);
    for (const v of o.col) this.col.push(v);
    for (const v of o.extra) this.extra.push(v);
    for (const i of o.idx) this.idx.push(i + base);
    this.bounds.union(o.bounds);
  }

  /** Bakes an indexed or plain geometry (positions + normals) with one colour. */
  addGeometry(g: THREE.BufferGeometry, c: Rgb, extra?: readonly number[]): void {
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const base = this.vertexCount;
    for (let i = 0; i < p.count; i++) this.vertex(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), c, extra);
    const ind = g.getIndex();
    if (ind) for (let i = 0; i < ind.count; i++) this.idx.push(base + ind.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
  }

  /** Box: x across, z along, y from `yBottom` up `h`, yawed about Y (then pitched about its own X). `sidesOnly`
   *  drops the top and bottom faces (posts, rails and cables never show them). `thin` members (rails, posts, lamp
   *  arms) record the box's long axis for the screen-space minimum width; `'point'` members (lamp heads,
   *  reflectors) record their centre, so they inflate to a dot in every direction. */
  box(x: number, yBottom: number, z: number, w: number, h: number, d: number, yaw: number, pitch: number, c: Rgb, sidesOnly = false, extra?: readonly number[], thin: boolean | 'point' = false): void {
    if (h <= 0.005) return;
    _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ'));
    _m.compose(_p.set(x, yBottom + h / 2, z), _q, _s.set(w, h, d));
    const longAxis = thin === 'point' ? -1 : w >= h && w >= d ? 0 : h >= d ? 1 : 2;
    for (const f of BOX_FACES) {
      if (sidesOnly && f.n[1] !== 0) continue;
      _n.set(f.n[0], f.n[1], f.n[2]).applyQuaternion(_q);
      const base = this.vertexCount;
      for (const v of f.v) {
        let axis: THREE.Vector3 | null = null;
        if (thin && this.hasAxis) {
          _ax.set(longAxis === 0 ? v[0] : 0, longAxis === 1 ? v[1] : 0, longAxis === 2 ? v[2] : 0).applyMatrix4(_m);
          axis = _ax;
        }
        _p.set(v[0], v[1], v[2]).applyMatrix4(_m);
        this.vertex(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, c, extra, axis);
      }
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  /** Tapered prism (side faces only): a rectangle `wb` x `db` centred on (xb, zb) at `yb` lofted to `wt` x `dt`
   *  centred on (xt, zt) at `yt`, yawed about Y: flared pier stems, leaning pylon legs. */
  prism(xb: number, yb: number, zb: number, wb: number, db: number, xt: number, yt: number, zt: number, wt: number, dt: number, yaw: number, c: Rgb, extra?: readonly number[], caps = false): void {
    if (yt - yb <= 0.005) return;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    // local (across, along) -> world: box() yaws its local x to (cos, 0, -sin) and local z to (sin, 0, cos)
    const corner = (cx: number, cz: number, ax: number, az: number, y: number) => _p.set(cx + ax * cy + az * sy, y, cz - ax * sy + az * cy);
    const ring = (y: number, cx: number, cz: number, w: number, d: number) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([ax, az]) => corner(cx, cz, ax, az, y).clone());
    const B = ring(yb, xb, zb, wb, db), T = ring(yt, xt, zt, wt, dt);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      _n.subVectors(T[i], B[i]).cross(_d.subVectors(B[j], B[i])).normalize();
      const base = this.vertexCount;
      for (const v of [B[i], T[i], T[j], B[j]]) this.vertex(v.x, v.y, v.z, _n.x, _n.y, _n.z, c, extra);
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    if (caps) {
      const base = this.vertexCount;
      for (const v of T) this.vertex(v.x, v.y, v.z, 0, 1, 0, c, extra);
      this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }

  /** Vertical cylinder (smooth sides, optional top cap); `thin` poles record their axis for the minimum width. */
  cylinder(x: number, yBottom: number, z: number, dia: number, h: number, segments: number, c: Rgb, cap = true, extra?: readonly number[], thin = false): void {
    if (h <= 0.005) return;
    const r = dia / 2;
    const base = this.vertexCount;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      const axis = thin && this.hasAxis ? _ax : null;
      if (axis) axis.set(x, yBottom, z);
      this.vertex(x + nx * r, yBottom, z + nz * r, nx, 0, nz, c, extra, axis);
      if (axis) axis.set(x, yBottom + h, z);
      this.vertex(x + nx * r, yBottom + h, z + nz * r, nx, 0, nz, c, extra, axis);
    }
    for (let i = 0; i < segments; i++) {
      const v0 = base + i * 2, v1 = v0 + 1, v2 = v0 + 2, v3 = v0 + 3;
      this.idx.push(v0, v1, v2, v1, v3, v2);
    }
    if (cap) {
      const centre = this.vertex(x, yBottom + h, z, 0, 1, 0, c, extra);
      const ring = this.vertexCount;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        this.vertex(x + Math.cos(a) * r, yBottom + h, z + Math.sin(a) * r, 0, 1, 0, c, extra);
      }
      for (let i = 0; i < segments; i++) this.idx.push(centre, ring + i + 1, ring + i);
    }
  }

  /** Flat horizontal polygon (n-gon) at height y facing up: the foam wash around a footing. */
  disc(x: number, y: number, z: number, rx: number, rz: number, segments: number, c: Rgb, extra?: readonly number[]): void {
    const centre = this.vertex(x, y, z, 0, 1, 0, c, extra);
    const ring = this.vertexCount;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      this.vertex(x + Math.cos(a) * rx, y, z + Math.sin(a) * rz, 0, 1, 0, c, extra);
    }
    for (let i = 0; i < segments; i++) this.idx.push(centre, ring + i + 1, ring + i);
  }

  /** Sweeps an open 2D profile (across, up) along the frames. The profile must run counter-clockwise around the
   *  section (left top -> down the left face -> along the bottom -> up the right face) so outward normals are
   *  the right-hand perpendicular of each edge. Every edge becomes its own strip so creases stay sharp;
   *  `colors[i]` tints edge i. */
  loft(frames: Frame[], profile: readonly (readonly [number, number])[], colors: readonly Rgb[] | Rgb, extra?: readonly number[]): void {
    for (let i = 0; i < profile.length - 1; i++) {
      const [a0, y0] = profile[i], [a1, y1] = profile[i + 1];
      const ex = a1 - a0, ey = y1 - y0;
      const el = Math.hypot(ex, ey) || 1;
      const n2x = ey / el, n2y = -ex / el; // outward normal for a CCW profile
      const c: Rgb = Array.isArray(colors[0]) ? (colors as readonly Rgb[])[Math.min(i, colors.length - 1)] : (colors as Rgb);
      const base = this.vertexCount;
      for (const f of frames) {
        const nx = f.rx * n2x, ny = n2y, nz = f.rz * n2x;
        this.vertex(f.x + f.rx * a0, f.y + y0, f.z + f.rz * a0, nx, ny, nz, c, extra);
        this.vertex(f.x + f.rx * a1, f.y + y1, f.z + f.rz * a1, nx, ny, nz, c, extra);
      }
      // winding: test the first quad against the desired normal and keep the orientation for the whole strip
      let flip = false;
      if (frames.length > 1) {
        _a.fromArray(this.pos, base * 3); _b.fromArray(this.pos, (base + 1) * 3); _c.fromArray(this.pos, (base + 3) * 3);
        _n.subVectors(_b, _a).cross(_c.sub(_a));
        _p.fromArray(this.nrm, base * 3);
        flip = _n.dot(_p) < 0;
      }
      for (let k = 1; k < frames.length; k++) {
        const v0 = base + (k - 1) * 2, v1 = v0 + 1, v3 = base + k * 2, v2 = v3 + 1;
        if (flip) this.idx.push(v0, v2, v1, v0, v3, v2);
        else this.idx.push(v0, v1, v2, v0, v2, v3);
      }
    }
  }

  /** Cable / hanger between two points: a 6-sided prism without caps, always a thin member. */
  strut(a: THREE.Vector3, b: THREE.Vector3, r: number, c: Rgb, extra?: readonly number[]): void {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 0.1) return;
    _d.divideScalar(len);
    _q.setFromUnitVectors(_up, _d);
    const base = this.vertexCount;
    for (let i = 0; i <= 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      _n.set(Math.cos(ang), 0, Math.sin(ang)).applyQuaternion(_q);
      this.vertex(a.x + _n.x * r, a.y + _n.y * r, a.z + _n.z * r, _n.x, _n.y, _n.z, c, extra, a);
      this.vertex(b.x + _n.x * r, b.y + _n.y * r, b.z + _n.z * r, _n.x, _n.y, _n.z, c, extra, b);
    }
    for (let i = 0; i < 6; i++) {
      const v0 = base + i * 2, v1 = v0 + 1, v2 = v0 + 2, v3 = v0 + 3;
      this.idx.push(v0, v1, v2, v1, v3, v2);
    }
  }

  build(extraNames: readonly (readonly [string, number])[]): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.vertexCount * 2), 2));
    let off = 0;
    const stride = this.stride;
    const names = this.hasAxis ? [...extraNames, ['aAxis', 4] as const] : extraNames;
    for (const [name, size] of names) {
      const arr = new Float32Array(this.vertexCount * size);
      for (let v = 0; v < this.vertexCount; v++) for (let k = 0; k < size; k++) arr[v * size + k] = this.extra[v * stride + off + k];
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
      off += size;
    }
    g.setIndex(this.vertexCount > 65535 ? new THREE.BufferAttribute(new Uint32Array(this.idx), 1) : new THREE.BufferAttribute(new Uint16Array(this.idx), 1));
    g.boundingBox = this.bounds.clone();
    g.boundingSphere = this.bounds.getBoundingSphere(new THREE.Sphere());
    return g;
  }
}

const BOX_FACES: { n: [number, number, number]; v: [number, number, number][] }[] = [
  { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3(), _d = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _ax = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ per-frame culling

/** One mesh of a chunk with its own world bounds: the deck box stops at the parapets, the railing box at the lamp
 *  heads and the pylons / cables have their own, so looking up from the deck draws none of them. */
interface ChunkMesh { mesh: THREE.Mesh; cls: CasterClass; box: THREE.Box3; height: number; inView: boolean; /** cascade-index bitmask this frame */ cast: number; }
interface Chunk {
  meshes: ChunkMesh[];
  /** the thin steel mesh and the index count of its lamp-head prefix (drawn alone beyond THIN_DISTANCE) */
  steel: THREE.Mesh | null;
  headIndices: number;
  /** the concrete mesh and the index counts of its structure + deck prefix and of that plus the per-column pier
   *  proxies (the solid far slabs follow); `drawEnd` is the range chosen for this frame's distance */
  concrete: THREE.Mesh | null;
  proxyStart: number;
  farStart: number;
  drawEnd: number;
  center: THREE.Vector3; r: number;
  /** horizontal distance from the nearest camera to the chunk's sphere (this frame) */
  dist: number;
}

/**
 * Per-frame visibility of the bridge chunks, following the city tiles: a mesh is drawn when its box is in
 * view and casts when its chunk is within the shadow distance and its footprint, swept along the sun's shadow,
 * can reach anything in view; meshes that only cast leave the camera layer, thin steel casts into the nearest
 * cascade only. The group is not driven by game.ts, so it runs from the group's `updateMatrixWorld` (called
 * by the renderer before its shadow and main passes) with the camera the chunk meshes saw last frame and
 * the sun taken from the scene's shadow-casting directional light, which also dims / lights the lamps.
 */
class BridgeCuller {
  readonly chunks: Chunk[] = [];
  private sun: THREE.DirectionalLight | null = null;
  private readonly cull = new ViewCull();
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  /** cameras that drew a chunk since the last update (more than one when a reflection pass renders the scene
   *  too); visibility is the union over them so no pass ever misses a chunk */
  private readonly seen = new Set<THREE.PerspectiveCamera>();
  private cameras: THREE.PerspectiveCamera[] = [];

  constructor(private readonly steel: THREE.MeshStandardMaterial) {}

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
    this.steel.emissiveIntensity = LAMP_GLOW * lampGlowFor(this.sunDir, keyIntensity);

    if (this.seen.size) { this.cameras = [...this.seen]; this.seen.clear(); }
    if (!this.cameras.length) return; // until a chunk has been drawn the renderer's frustum test alone applies
    for (const c of this.chunks) { c.dist = Infinity; for (const m of c.meshes) { m.inView = false; m.cast = 0; } }
    for (const cam of this.cameras) {
      const camX = cam.position.x, camZ = cam.position.z;
      // shadow range: the game grows the CSM far plane with altitude (see game.ts); a superset is safe here
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
    for (const c of this.chunks) {
      for (const m of c.meshes) {
        const mask = layerMask(m.cls, m.inView, m.cast);
        const cast = maskCasts(mask);
        m.mesh.castShadow = cast;
        m.mesh.visible = m.inView || cast;
        m.mesh.layers.mask = mask;
      }
      if (c.steel) {
        c.steel.geometry.setDrawRange(0, c.dist > THIN_DISTANCE ? c.headIndices : Infinity);
        if (c.dist > HEAD_DISTANCE) c.steel.visible = false;
      }
      if (c.concrete) {
        c.drawEnd = c.dist > PIER_PROXY_FAR_DISTANCE ? Infinity : c.dist > PIER_PROXY_DISTANCE ? c.farStart : c.proxyStart;
        c.concrete.geometry.setDrawRange(0, c.drawEnd);
      }
    }
  }
}

class BridgeGroup extends THREE.Group {
  constructor(readonly culler: BridgeCuller) { super(); }
  override updateMatrixWorld(force?: boolean): void {
    this.culler.update(this.parent);
    super.updateMatrixWorld(force);
  }
}

// ------------------------------------------------------------------ build

/** Concrete tints (multiply the shared concrete colour). */
const C_PLAIN: Rgb = [1, 1, 1];
const C_CAP: Rgb = [1.08, 1.08, 1.07];       // parapet cap: pale, catches the low sun
const C_SOFFIT: Rgb = [0.86, 0.86, 0.86];
const C_UNDER: Rgb = [0.78, 0.78, 0.79];
const C_WET: Rgb = [0.5, 0.5, 0.52];         // tidal band on the columns
const C_PYLON: Rgb = [0.66, 0.645, 0.61];    // pylon legs and piers: warm weathered concrete (albedo ~0.3, like the pavement) so the sunlit faces
                                             // do not bleach to white and the lift bands / streaks survive tonemapping
const C_ANCHOR: Rgb = [0.50, 0.49, 0.47];    // anchorage zone of the legs: darker steel-faced concrete where the stays enter
const C_PROXY: Rgb = [0.34, 0.34, 0.38];       // distance pier proxies: the shaded side of a pier as seen from afar
const C_PROXY_SOFFIT: Rgb = [0.22, 0.22, 0.26]; // the deck's underside shadow line between the piers
const C_FOOTING: Rgb = [0.74, 0.75, 0.76];
const C_FOAM: Rgb = [1.85, 1.9, 1.92];       // wash around the footings (albedo ~0.9)
const C_DECK: Rgb = [1, 1, 1];
/** Steel tints. */
const S_PLAIN: Rgb = [1, 1, 1];
const S_DARK: Rgb = [0.3, 0.3, 0.32];        // expansion joints
const S_HEAD: Rgb = [0.92, 0.9, 0.84];       // lamp luminaires

/** `_roadMaterial` is kept in the signature for game.ts; the carriageway uses its own pavement shading (asphalt
 *  lanes between pale concrete shoulders, kerbs and parapets) so the causeways read as structured decks against the
 *  water at every altitude. */
export function buildBridges(map: WorldMap, _roadMaterial: THREE.Material, concrete: THREE.Material, steel: THREE.Material): BridgeBuild {
  const concreteMat = createConcreteMaterial(concrete);
  const { mat: steelMat, pixelScale } = createSteelMaterial(steel);
  const culler = new BridgeCuller(steelMat);
  const _size = new THREE.Vector2();
  /** pixels per metre at 1 m of view depth for the pass about to draw (main frame, mirror or any other target) */
  const observeSteel = (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => {
    culler.observe(camera);
    const rt = renderer.getRenderTarget();
    const h = rt ? rt.height : renderer.getDrawingBufferSize(_size).y;
    pixelScale.value = 0.5 * h * camera.projectionMatrix.elements[5];
  };
  const group = new BridgeGroup(culler);
  const routes: BridgeRoute[] = [];
  const approaches: BridgeBuild['approaches'] = [];
  const allDecks = new Soup(5);
  /** aRoadUv + aRoadInfo of the structure: lanes = 0 marks plain concrete; aRoadInfo.y = 1 adds the formwork panel
   *  joints of the piers and pylons (see CONCRETE_FRAG) */
  const NO_ROAD = [0, 0, 0, 0, 0];
  const PIER_INFO = [0, 0, 0, 1, 0];

  const g = GIRDER_DEPTH, ph = PARAPET_H;

  for (const spec of map.bridges) {
    const total = polylineLength(spec.pts);
    const W = spec.width, hw = W * 0.5;
    // the carriageway is narrower than the deck: pale concrete shoulders flank it
    // decks wide enough for it carry the F-shape median barrier of the highway (the carriageway grows by its base)
    const hasMedian = spec.lanes >= 6 || (spec.lanes >= 4 && W >= 20);
    const cw = clamp(spec.lanes * 3.3 + (hasMedian ? 0.7 : 0), 8, W - 4), chw = cw * 0.5;
    const frameAt = (s: number): Frame => {
      const p = pointAt(spec.pts, s);
      return { x: p.x, y: deckHeightProfile(spec, map, s, total), z: p.z, rx: -p.dz, rz: p.dx, dx: p.dx, dz: p.dz, s };
    };
    const yawAt = (f: Frame) => Math.atan2(f.dx, f.dz);

    // main span type: cable-stayed for the tall channel spans, a tied steel arch for the lower ones
    const cableStayed = spec.archHeight >= 20 && spec.archLength >= 350;
    const tiedArch = !cableStayed && spec.archHeight > 0 && spec.archLength >= 300;
    const centre = spec.archT * total;
    const mainSpan = cableStayed ? Math.min(spec.archLength * 0.5, 300) : tiedArch ? spec.archLength * 0.8 : 0;
    const spanA = centre - mainSpan / 2, spanB = centre + mainSpan / 2;

    // ------------------------------------------------------------ chunks along the bridge
    const nChunks = Math.max(1, Math.round(total / CHUNK_LEN));
    const chunkLen = total / nChunks;
    const chunkOf = (s: number) => Math.min(nChunks - 1, Math.max(0, Math.floor(s / chunkLen)));
    // struct + deck: concrete; steel + heads: thin steel (railings, lamps); tall: pylons (concrete); arch: arch ribs
    // or stay cables (steel). Tall structure gets its own meshes so the low chunks keep low bounding boxes.
    const parts = Array.from({ length: nChunks }, () => ({ struct: new Soup(5), deck: new Soup(5), steel: new Soup(1, true), heads: new Soup(1, true), tall: new Soup(5), arch: new Soup(1, true), proxy: new Soup(5), proxyFar: new Soup(5) }));

    // traffic centreline (deck top) at 20 m spacing
    const n = Math.ceil(total / STEP);
    const pts3: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += 2) { const f = frameAt(Math.min(total, i * STEP)); pts3.push(new THREE.Vector3(f.x, f.y, f.z)); }
    if ((n & 1) === 1) { const f = frameAt(total); pts3.push(new THREE.Vector3(f.x, f.y, f.z)); }
    routes.push({ id: spec.id, pts: pts3, width: spec.width, lanes: spec.lanes, traffic: spec.traffic });

    const medianHalf = hasMedian ? 0.305 : 0;
    const roadInfo = [0, 0, spec.lanes, cw, medianHalf];

    // ------------------------------------------------------------ approaches: where the deck stands on fill
    // The deck rides an embankment wherever the ground under it is land and within 16 m of the deck (the ramps
    // at both ends, the banks of a river crossing); the last U_LEN metres before the water are a U-abutment
    // (walls flush with the fascia, a front wall in the water with a riprap berm around it, splayed wing walls
    // at its back corners) and the fill behind it slopes 2:1 to the ground, riprap-armoured wherever its toe
    // reaches the water.
    const groundAt = (f: Frame) => map.heightAt(f.x, f.z);
    const fillAt = (f: Frame): boolean => { const gd = groundAt(f); return gd >= 0.3 && f.y - gd <= 16 && f.y - gd > -0.5; };
    const U_LEN = 24;
    const flags: boolean[] = [];
    for (let i = 0; i <= n; i++) flags.push(fillAt(frameAt(Math.min(total, i * STEP))));
    /** abutment planes: station and the direction (along s) in which the water lies */
    const abutments: { s: number; dir: 1 | -1 }[] = [];
    for (let i = 0; i < n; i++) {
      if (flags[i] && !flags[i + 1]) abutments.push({ s: Math.min(total, (i + 0.5) * STEP), dir: 1 });
      else if (!flags[i] && flags[i + 1]) abutments.push({ s: Math.min(total, (i + 0.5) * STEP), dir: -1 });
    }
    const inU = (s: number) => abutments.some((a) => (a.dir > 0 ? s > a.s - U_LEN && s <= a.s : s >= a.s && s < a.s + U_LEN));
    {
      const fill: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        if (!flags[i]) continue;
        const s0 = Math.min(total, i * STEP);
        while (i < n && flags[i + 1]) i++;
        fill.push([s0, Math.min(total, i * STEP)]);
      }
      approaches.push({ id: spec.id, total, fill, abutments: abutments.map((a) => ({ ...a })) });
    }
    const FILL_INFO = [0, 0, 0, 2, 0];
    const RIPRAP_INFO = [0, 0, 0, 3, 0];
    const sandy = (x: number, z: number) => map.zoneAt(x, z) === 2;
    const C_FILL_SAND: Rgb = [0.92, 0.84, 0.66];
    const C_FILL_GRASS: Rgb = [0.60, 0.68, 0.40];
    const C_RIPRAP: Rgb = [0.60, 0.585, 0.55];
    const SLOPE_TOP = -0.45;      // the fill meets the fascia's lower edge
    const RIPRAP_TOP = 1.7;       // rock armour from the toe up to the splash zone
    /** slope section at a frame: the fascia edge, the riprap top and the toe (in the water when the ground falls under it) */
    const slopeAt = (f: Frame, side: number): { yTop: number; aTop: number; aMid: number; yMid: number; aToe: number; yToe: number; wet: boolean } | null => {
      const yTop = f.y + SLOPE_TOP, aTop = hw + 0.56;
      let aToe = aTop + 2 * (yTop - groundAt(f));
      for (let it = 0; it < 2; it++) {
        const gt = map.heightAt(f.x + f.rx * side * aToe, f.z + f.rz * side * aToe);
        aToe = aTop + 2 * (yTop - gt);
      }
      let yToe = yTop - (aToe - aTop) * 0.5;
      if (yToe - 0.35 < 0.2) yToe = -1.2; else yToe -= 0.35;   // the toe is buried a little, or runs on under the water
      if (aToe - aTop < 0.6) return null;
      const wet = yToe < 0.3;
      const yMid = wet ? Math.min(yTop, RIPRAP_TOP) : yToe;
      const aMid = aTop + 2 * (yTop - yMid);
      return { yTop, aTop, aMid, yMid, aToe: aTop + 2 * (yTop - yToe), yToe, wet };
    };

    for (let k = 0; k < nChunks; k++) {
      const s0 = k * chunkLen, s1 = Math.min(total, (k + 1) * chunkLen);
      const frames: Frame[] = [frameAt(s0)];
      for (let s = (Math.floor(s0 / STEP) + 1) * STEP; s < s1 - 0.01; s += STEP) frames.push(frameAt(s));
      frames.push(frameAt(s1));
      const P = parts[k];

      // -------------------------------------------------------- deck top: shoulders, kerbs and carriageway
      // one ribbon of 5 strips per segment (shoulder / kerb face / carriageway / kerb face / shoulder); six-lane
      // causeways get a concrete median barrier, narrower decks a painted centre line
      const section: [number, number, number][] = [
        [-hw, KERB, 0], [-chw, KERB, 0],
        [-chw, KERB, 1], [-chw, 0.02, 1],
        [-chw, 0.02, 0], [chw, 0.02, 0],
        [chw, 0.02, -1], [chw, KERB, -1],
        [chw, KERB, 0], [hw, KERB, 0],
      ];
      const SV = section.length;
      const deckBase = P.deck.vertexCount;
      frames.forEach((f, i) => {
        for (const [a, yv, nk] of section) {
          roadInfo[0] = a / chw; roadInfo[1] = f.s;
          if (nk === 0) P.deck.vertex(f.x + f.rx * a, f.y + yv, f.z + f.rz * a, 0, 1, 0, C_DECK, roadInfo);
          else P.deck.vertex(f.x + f.rx * a, f.y + yv, f.z + f.rz * a, f.rx * nk, 0, f.rz * nk, C_DECK, roadInfo);
        }
        if (i > 0) {
          const p = deckBase + (i - 1) * SV, c = deckBase + i * SV;
          for (let j = 0; j < SV; j += 2) P.deck.idx.push(p + j, p + j + 1, c + j, c + j, p + j + 1, c + j + 1);
        }
      });

      // -------------------------------------------------------- girder + parapets (one loft, chamfered caps)
      const profile: [number, number][] = [
        [-hw, KERB],                                        // shoulder edge
        [-hw - 0.10, ph - 0.24], [-hw - 0.24, ph],          // inner face, inner chamfer
        [-hw - 0.42, ph], [-hw - 0.56, ph - 0.24],          // cap top, outer chamfer
        [-hw - 0.56, -0.4], [-hw - 0.24, -1.05],            // fascia and drip edge
        [-W * 0.31, -g], [W * 0.31, -g],                    // web and bottom flange
        [hw + 0.24, -1.05], [hw + 0.56, -0.4],
        [hw + 0.56, ph - 0.24], [hw + 0.42, ph],
        [hw + 0.24, ph], [hw + 0.10, ph - 0.24], [hw, KERB],
      ];
      const profileColors: Rgb[] = [C_PLAIN, C_CAP, C_CAP, C_CAP, C_PLAIN, C_SOFFIT, C_UNDER, C_UNDER, C_UNDER, C_SOFFIT, C_PLAIN, C_CAP, C_CAP, C_CAP, C_PLAIN];
      P.struct.loft(frames, profile, profileColors, NO_ROAD);
      if (medianHalf > 0) {
        // the same F-shape barrier the highway carries onto the deck (its base sits on the pavement)
        const lifted = frames.map((f) => ({ ...f, y: f.y + 0.02 }));
        P.struct.loft(lifted, F_BARRIER_PROFILE, [C_PLAIN, C_PLAIN, C_PLAIN, C_CAP, C_PLAIN, C_PLAIN, C_PLAIN], NO_ROAD);
      }

      // -------------------------------------------------------- approach embankments, U-abutments, wing walls, riprap
      for (let i = 0; i < frames.length - 1; i++) {
        const f = frames[i], f1 = frames[i + 1];
        if (!fillAt(f) || !fillAt(f1)) continue;
        const yaw = yawAt(f);
        const ground = groundAt(f);
        if (inU(f.s) || inU(f1.s)) {
          // U-abutment: MSE walls flush with the fascia down to a footing under the water line
          const bottom = Math.min(ground, 0) - 1.2, top = f.y + SLOPE_TOP;
          if (top - bottom > 0.3) P.struct.box((f.x + f1.x) / 2, bottom, (f.z + f1.z) / 2, W + 1.12, top - bottom, f1.s - f.s + 0.05, yaw, 0, C_PYLON, false, PIER_INFO);
          continue;
        }
        // sloped fill: fascia edge -> (riprap top) -> toe, one strip per face so the tones stay flat-shaded
        for (const side of [-1, 1]) {
          const sa = slopeAt(f, side), sb = slopeAt(f1, side);
          if (!sa || !sb) continue;
          const tone = sandy(f.x, f.z) ? C_FILL_SAND : C_FILL_GRASS;
          const pt = (fr: Frame, a: number, y: number) => new THREE.Vector3(fr.x + fr.rx * side * a, y, fr.z + fr.rz * side * a);
          const strip = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, c: Rgb, info: number[]) => {
            // p0 -> p1 along the top edge (frame f -> f1), p2 -> p3 along the bottom edge
            _n.subVectors(p1, p0).cross(_d.subVectors(p2, p0)).normalize();
            if (_n.dot(_a.set(f.rx * side, 0.5, f.rz * side)) < 0) _n.negate();
            const base = P.struct.vertexCount;
            for (const v of [p0, p1, p3, p2]) P.struct.vertex(v.x, v.y, v.z, _n.x, _n.y, _n.z, c, info);
            _b.subVectors(p1, p0).cross(_c.subVectors(p3, p0));
            if (_b.dot(_n) >= 0) P.struct.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
            else P.struct.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
          };
          strip(pt(f, sa.aTop, sa.yTop), pt(f1, sb.aTop, sb.yTop), pt(f, sa.aMid, sa.yMid), pt(f1, sb.aMid, sb.yMid), tone, FILL_INFO);
          if (sa.wet || sb.wet) strip(pt(f, sa.aMid, sa.yMid), pt(f1, sb.aMid, sb.yMid), pt(f, sa.aToe, sa.yToe), pt(f1, sb.aToe, sb.yToe), C_RIPRAP, RIPRAP_INFO);
        }
      }
      for (const ab of abutments) {
        if (chunkOf(ab.s) !== k) continue;
        const f = frameAt(ab.s);
        const yaw = yawAt(f);
        const ground = groundAt(f);
        const waterY = Math.min(ground, 0);
        const uMid = frameAt(ab.s - ab.dir * U_LEN * 0.5);
        // riprap berm around the abutment: a 2:1 rock apron from under the water line to the splash zone
        P.struct.prism(uMid.x, waterY - 1.2, uMid.z, W + 1.12 + 9.0, U_LEN + 9.0, uMid.x, waterY + 1.1, uMid.z, W + 1.12 + 1.6, U_LEN + 1.6, yaw, C_RIPRAP, RIPRAP_INFO, true);
        // wing walls splayed 35 degrees back from the U's rear corners, retaining the end of the slopes
        const back = frameAt(ab.s - ab.dir * U_LEN);
        const top = back.y + SLOPE_TOP;
        const wl = 9.0, cs = Math.cos(0.61), sn = Math.sin(0.61);
        for (const side of [-1, 1]) {
          // wall direction: away from the water and outward
          const dwx = -back.dx * ab.dir * cs + back.rx * side * sn, dwz = -back.dz * ab.dir * cs + back.rz * side * sn;
          const cx = back.x + back.rx * side * (hw + 0.56) + dwx * (wl / 2);
          const cz = back.z + back.rz * side * (hw + 0.56) + dwz * (wl / 2);
          const bottom = Math.min(map.heightAt(cx, cz), 0.6) - 0.8;
          if (top - bottom > 0.5) P.struct.box(cx, bottom, cz, 0.45, top - bottom, wl, Math.atan2(dwx, dwz), 0, C_PYLON, false, PIER_INFO);
          // cap the slope's open end against the wing wall
          const sc = slopeAt(back, side);
          if (sc) {
            const p = (a: number, y: number) => new THREE.Vector3(back.x + back.rx * side * a, y, back.z + back.rz * side * a);
            const base = P.struct.vertexCount;
            const nx = -back.dx * ab.dir, nz = -back.dz * ab.dir;
            const tri = [p(sc.aTop, sc.yTop), p(sc.aToe, sc.yToe), p(sc.aTop, sc.yToe)];
            for (const v of tri) P.struct.vertex(v.x, v.y, v.z, nx, 0, nz, sandy(back.x, back.z) ? C_FILL_SAND : C_FILL_GRASS, FILL_INFO);
            _n.subVectors(tri[1], tri[0]).cross(_d.subVectors(tri[2], tri[0]));
            if (_n.x * nx + _n.z * nz >= 0) P.struct.idx.push(base, base + 1, base + 2); else P.struct.idx.push(base, base + 2, base + 1);
          }
        }
      }

      // -------------------------------------------------------- railing on the parapets: posts every 4 m, two rails
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const yaw = Math.atan2(b.x - a.x, b.z - a.z);
        const pitch = -Math.asin(clamp((b.y - a.y) / len, -1, 1));
        for (const side of [-1, 1]) {
          const mx = (a.x + b.x) / 2 + ((a.rx + b.rx) / 2) * (hw + 0.33) * side;
          const mz = (a.z + b.z) / 2 + ((a.rz + b.rz) / 2) * (hw + 0.33) * side;
          P.steel.box(mx, (a.y + b.y) / 2 + ph + 0.86, mz, 0.08, 0.08, len + 0.1, yaw, pitch, S_PLAIN, true, undefined, true);
          P.steel.box(mx, (a.y + b.y) / 2 + ph + 0.44, mz, 0.06, 0.06, len + 0.1, yaw, pitch, S_PLAIN, true, undefined, true);
        }
      }
      for (let s = Math.ceil(s0 / 4) * 4; s < s1; s += 4) {
        const f = frameAt(s);
        const yaw = yawAt(f);
        for (const side of [-1, 1]) P.steel.box(f.x + f.rx * (hw + 0.33) * side, f.y + ph, f.z + f.rz * (hw + 0.33) * side, 0.12, 0.9, 0.12, yaw, 0, S_PLAIN, true, undefined, true);
      }
      // deck drainage: a scupper opening in each kerb face every SCUPPER_STEP m (offset from the piers) and its
      // downpipe hanging from the drip edge outside the fascia
      for (let s = Math.ceil((s0 - 7.5) / SCUPPER_STEP) * SCUPPER_STEP + 7.5; s < s1; s += SCUPPER_STEP) {
        if (s < 4 || s > total - 4) continue;
        const f = frameAt(s);
        const yaw = yawAt(f);
        for (const side of [-1, 1]) {
          P.steel.box(f.x + f.rx * (chw + 0.01) * side, f.y + 0.03, f.z + f.rz * (chw + 0.01) * side, 0.08, 0.1, 0.5, yaw, 0, S_DARK, false);
          P.steel.box(f.x + f.rx * (hw + 0.33) * side, f.y - 2.2, f.z + f.rz * (hw + 0.33) * side, 0.13, 1.2, 0.13, yaw, 0, S_DARK, true, undefined, true);
        }
      }
      // lamp posts on the parapet caps, alternating sides every 45 m: pole, arm over the shoulder, glowing luminaire
      for (let ls = 22, j = 0; ls < total - 20; ls += 45, j++) {
        if (chunkOf(ls) !== k) continue;
        const f = frameAt(ls);
        const side = j % 2 === 0 ? -1 : 1;
        const yaw = yawAt(f);
        const bx = f.x + f.rx * (hw + 0.33) * side, bz = f.z + f.rz * (hw + 0.33) * side;
        P.steel.cylinder(bx, f.y + ph, bz, 0.2, 9.0, 6, S_PLAIN, false, undefined, true);
        const ax = f.x + f.rx * (hw + 0.33 - 1.25) * side, az = f.z + f.rz * (hw + 0.33 - 1.25) * side;
        P.steel.box(ax, f.y + ph + 8.85, az, 2.5, 0.16, 0.16, yaw, 0, S_PLAIN, true, undefined, true);
        const hx = f.x + f.rx * (hw + 0.33 - 2.35) * side, hz = f.z + f.rz * (hw + 0.33 - 2.35) * side;
        P.heads.box(hx, f.y + ph + 8.62, hz, 0.8, 0.26, 0.5, yaw, 0, S_HEAD, false, [1], 'point');
      }
    }

    // ------------------------------------------------------------ piers (hammerhead wall piers on the wide causeways, twin columns elsewhere)
    const spacing = W >= 20 ? 50 : 42;
    const pierS: number[] = [];
    for (let s = spacing * 0.5; s < total - spacing * 0.3; s += spacing) {
      if (mainSpan > 0 && s > spanA - 12 && s < spanB + 12) continue;
      pierS.push(s);
    }
    if (tiedArch) pierS.push(spanA, spanB);
    for (const s of pierS) {
      const f = frameAt(s);
      const ground = map.heightAt(f.x, f.z);
      if (f.y - ground < 2.8 || fillAt(f)) continue;
      const P = parts[chunkOf(s)];
      const yaw = yawAt(f);
      const capTop = f.y - g;
      const heavy = tiedArch && (s === spanA || s === spanB);
      const capH = heavy ? 2.4 : 2.0;
      const capBottom = capTop - capH;
      const colBottom = Math.min(ground, -0.5) - 2.5;
      const inWater = ground < 0.2;
      // hammerhead caps overhang the fascia by ~3 m so the pier line stays visible from above the deck
      const capW = W + 6.4;
      const proxyBottom = inWater ? -0.3 : colBottom;
      /** footing and foam wash of a member standing in the water */
      const footing = (x: number, z: number, w: number, d: number) => {
        P.struct.box(x, -1.0, z, w + 2.4, 1.6, d + 2.4, yaw, 0, C_FOOTING, false, NO_ROAD);
        P.struct.disc(x, 0.05, z, (w + 2.4) * 0.5 + 0.9, (d + 2.4) * 0.5 + 0.9, 12, C_FOAM, NO_ROAD);
      };
      if (heavy) {
        // arch springing: a wall pier whose stem flares out to the cap
        const ww = W * 0.7, wt = 3.2;
        const topW = capW - 3.0, topT = wt + 0.6;
        const bottom = inWater ? 0.55 : colBottom;
        const widthAt = (y: number) => lerp(ww, topW, clamp((y - bottom) / (capBottom - bottom), 0, 1));
        const thickAt = (y: number) => lerp(wt, topT, clamp((y - bottom) / (capBottom - bottom), 0, 1));
        if (inWater) {
          footing(f.x, f.z, ww, wt);
          const wetTop = Math.min(capBottom, 1.9);
          P.struct.prism(f.x, 0.55, f.z, ww, wt, f.x, wetTop, f.z, widthAt(wetTop), thickAt(wetTop), yaw, C_WET, PIER_INFO);
          P.struct.prism(f.x, wetTop, f.z, widthAt(wetTop), thickAt(wetTop), f.x, capBottom, f.z, topW, topT, yaw, C_PYLON, PIER_INFO);
        } else P.struct.prism(f.x, colBottom, f.z, ww, wt, f.x, capBottom, f.z, topW, topT, yaw, C_PYLON, PIER_INFO);
        P.struct.box(f.x, capBottom, f.z, capW, capH, wt + 1.0, yaw, 0, C_PYLON, false, PIER_INFO);
        P.proxy.prism(f.x, proxyBottom, f.z, ww + 2.4, wt + 4.0, f.x, capTop + 0.1, f.z, capW, wt + 4.0, yaw, C_PROXY, NO_ROAD);
      } else {
        // column bent: round columns under a cap beam, the outer pair standing outboard of the fascia (the
        // classic causeway bent), so from above the deck the columns are seen going down to the water beside
        // the deck edge instead of the cap reading as a block hanging under it; wide decks get a third column
        const dia = W >= 20 ? 3.0 : 2.4;
        const outer = hw + (W >= 20 ? 1.2 : 0.9);
        const offs = W >= 20 ? [-outer, 0, outer] : [-outer, outer];
        const cw2 = W >= 20 ? capW : W + 5.6;
        for (const off of offs) {
          const x = f.x + f.rx * off, z = f.z + f.rz * off;
          if (inWater) {
            footing(x, z, dia, dia);
            const wetTop = Math.min(capBottom, 1.9);
            P.struct.cylinder(x, 0.55, z, dia, wetTop - 0.55, 12, C_WET, false, PIER_INFO);
            P.struct.cylinder(x, wetTop, z, dia, capBottom - wetTop, 12, C_PYLON, false, PIER_INFO);
          } else P.struct.cylinder(x, colBottom, z, dia, capBottom - colBottom, 12, C_PYLON, false, PIER_INFO);
        }
        P.struct.box(f.x, capBottom, f.z, cw2, capH, dia + 0.4, yaw, 0, C_PYLON, false, PIER_INFO);
        // 450 m - 1.6 km: a dark slab per column (the bent keeps its gaps); beyond: one slab the width of the cap
        for (const off of offs) P.proxy.box(f.x + f.rx * off, proxyBottom, f.z + f.rz * off, dia + 1.6, capBottom - proxyBottom + 0.1, dia + 1.6, yaw, 0, C_PROXY, true, NO_ROAD);
        P.proxy.box(f.x, capBottom - 0.1, f.z, cw2, capH + 0.2, dia + 3.0, yaw, 0, C_PROXY, true, NO_ROAD);
        P.proxyFar.box(f.x, proxyBottom, f.z, cw2, capTop - proxyBottom + 0.1, dia + 3.0, yaw, 0, C_PROXY, true, NO_ROAD);
      }
      // soffit slab of the span ahead: the dark underside line of the deck between this pier and the next
      {
        const s1 = Math.min(total, s + spacing);
        const fm = frameAt((s + s1) / 2);
        P.proxy.box(fm.x, fm.y - g - 1.7, fm.z, W * 0.94, 1.5, s1 - s - 1.5, yawAt(fm), 0, C_PROXY_SOFFIT, false, NO_ROAD);
      }
      // expansion joint across the carriageway over every pier
      P.steel.box(f.x, f.y + 0.03, f.z, cw, 0.04, 0.3, yaw, 0, S_DARK, false);
    }
    // abutment joints: the approach-slab finger joint where the road runs onto each end of the deck
    for (const s of [0.45, total - 0.45]) {
      const P = parts[chunkOf(s)];
      const f = frameAt(s);
      P.steel.box(f.x, f.y + 0.03, f.z, cw, 0.04, 0.5, yawAt(f), 0, S_DARK, false);
    }

    // ------------------------------------------------------------ main span structure
    if (cableStayed) {
      // H pylons: two concrete legs tapering (and leaning in a little) from a wide base in the water to the
      // anchorage zone, a cross beam under the deck and a portal beam at the top; the stays fan from the upper
      // third of the legs to anchor blocks on the deck edges
      const pylonH = 0.24 * mainSpan + 10; // above the deck
      const legWb = 4.6, legDb = 6.4, legWt = 2.8, legDt = 4.2;
      const legAb = hw + 3.0, legAt = hw + 1.9; // leg centre offset from the axis at the base / the top (clear of the parapet)
      const nC = mainSpan >= 240 ? 9 : 7;
      const spacingC = (mainSpan / 2 - 16) / nC;
      for (const ps of [spanA, spanB]) {
        const P = parts[chunkOf(ps)];
        const f = frameAt(ps);
        const ground = map.heightAt(f.x, f.z);
        const yaw = yawAt(f);
        const inWater = ground < 0.2;
        const colBottom = inWater ? 0.55 : Math.min(ground, -0.5) - 3;
        const topY = f.y + pylonH;
        const tl = (y: number) => clamp((y - colBottom) / (topY - colBottom), 0, 1);
        const legA = (y: number) => lerp(legAb, legAt, tl(y));
        const legW = (y: number) => lerp(legWb, legWt, tl(y));
        const legD = (y: number) => lerp(legDb, legDt, tl(y));
        const wetTop = 2.4;
        // stay heads sit in the upper 42 % of the leg above the deck; that stretch is the anchorage zone
        const headY = (k: number) => topY - 3 - (nC - k) * ((0.42 * pylonH) / nC);
        const anchorZ0 = headY(1) - 2.5;
        for (const side of [-1, 1]) {
          const at = (y: number) => ({ x: f.x + f.rx * legA(y) * side, z: f.z + f.rz * legA(y) * side });
          const seg = (y0: number, y1: number, soup: Soup, c: Rgb) => {
            const a = at(y0), b = at(y1);
            soup.prism(a.x, y0, a.z, legW(y0), legD(y0), b.x, y1, b.z, legW(y1), legD(y1), yaw, c, PIER_INFO, y1 === topY);
          };
          if (inWater) {
            const b = at(colBottom);
            P.struct.box(b.x, -1.2, b.z, legWb + 3, 1.9, legDb + 3, yaw, 0, C_FOOTING, false, NO_ROAD);
            P.struct.disc(b.x, 0.05, b.z, (legWb + 3) * 0.5 + 1.0, (legDb + 3) * 0.5 + 1.0, 12, C_FOAM, NO_ROAD);
            seg(colBottom, wetTop, P.struct, C_WET);
            seg(wetTop, f.y + 1.0, P.struct, C_PYLON);
          } else seg(colBottom, f.y + 1.0, P.struct, C_PYLON);
          seg(f.y + 1.0, anchorZ0, P.tall, C_PYLON);
          seg(anchorZ0, topY, P.tall, C_ANCHOR);
          // steel anchor boxes on the inner face at every stay head
          for (let k = 1; k <= nC; k++) {
            const hy = headY(k), a = at(hy);
            const off = legW(hy) * 0.5 + 0.35;
            P.arch.box(a.x - f.rx * off * side, hy - 0.7, a.z - f.rz * off * side, 0.9, 1.4, 1.6, yaw, 0, S_DARK, false, undefined, true);
          }
          // maintenance: platforms with railings at the deck and under the anchorages, a ladder up the inner face
          for (const py of [f.y + 1.0, topY - 6.5]) {
            const a = at(py);
            P.tall.box(a.x, py, a.z, legW(py) + 2.4, 0.3, legD(py) + 2.4, yaw, 0, C_UNDER, false, NO_ROAD);
            const rw = legW(py) + 2.4, rd = legD(py) + 2.4;
            for (const [ox, oz, w, d] of [[0, -rd / 2, rw, 0.08], [0, rd / 2, rw, 0.08], [-rw / 2, 0, 0.08, rd], [rw / 2, 0, 0.08, rd]] as const) {
              const cy = Math.cos(yaw), sy = Math.sin(yaw);
              P.arch.box(a.x + ox * cy + oz * sy, py + 1.3, a.z - ox * sy + oz * cy, w, 0.08, d, yaw, 0, S_DARK, true, undefined, true);
            }
          }
          const l0 = at(f.y + 1.3), l1 = at(topY - 6.5);
          const inner = (p: { x: number; z: number }, y: number) => new THREE.Vector3(p.x - f.rx * (legW(y) * 0.5 + 0.25) * side, y, p.z - f.rz * (legW(y) * 0.5 + 0.25) * side);
          P.arch.strut(inner(l0, f.y + 1.3), inner(l1, topY - 6.5), 0.22, S_DARK);
        }
        P.struct.box(f.x, f.y - g - 2.2, f.z, 2 * legA(f.y) + legW(f.y), 2.2, legD(f.y), yaw, 0, C_PYLON, false, PIER_INFO);            // cross beam under the deck
        // slim portal beam flush with the leg tops (a deep one read as a suspension tower saddle)
        P.tall.box(f.x, topY - 2.0, f.z, 2 * legA(topY - 1) + legW(topY - 1) * 0.6, 2.0, legD(topY) * 0.6, yaw, 0, C_ANCHOR, false, PIER_INFO);
        for (let k = 1; k <= nC; k++) {
          for (const dirS of [-1, 1]) {
            const sa = ps + dirS * (k * spacingC + 10);
            if (sa < 4 || sa > total - 4) continue;
            const fa = frameAt(sa);
            const hy = headY(k);
            for (const side of [-1, 1]) {
              // anchor block on the deck edge, the stay leaving its top
              const ax = fa.x + fa.rx * (hw + 0.1) * side, az = fa.z + fa.rz * (hw + 0.1) * side;
              parts[chunkOf(sa)].struct.box(ax, fa.y + KERB, az, 1.0, 1.3, 1.9, yawAt(fa), 0, C_UNDER, false, NO_ROAD);
              const anchor = new THREE.Vector3(ax, fa.y + KERB + 1.3, az);
              const head = new THREE.Vector3(f.x + f.rx * (legA(hy) - legW(hy) * 0.5 + 0.1) * side, hy, f.z + f.rz * (legA(hy) - legW(hy) * 0.5 + 0.1) * side);
              P.arch.strut(anchor, head, 0.14, S_PLAIN);
            }
          }
        }
      }
    } else if (tiedArch) {
      const P = parts[chunkOf(centre)];
      const rise = spec.archHeight * 0.95 + 4;
      const ribA = hw + 1.0;
      const ribs: THREE.Vector3[][] = [[], []];
      const segs = 28;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const f = frameAt(spanA + mainSpan * t);
        const y = f.y + rise * Math.sin(t * Math.PI) + 0.8;
        for (const side of [-1, 1]) {
          const p = new THREE.Vector3(f.x + f.rx * ribA * side, y, f.z + f.rz * ribA * side);
          ribs[side < 0 ? 0 : 1].push(p);
          // hangers from the rib down to the parapet
          if (i % 2 === 1 && i > 1 && i < segs - 1) P.arch.strut(new THREE.Vector3(p.x, f.y + ph + 0.2, p.z), p, 0.11, S_PLAIN);
        }
        // cross bracing between the ribs near the crown
        if (i === 8 || i === 14 || i === 20) P.arch.box(f.x, y - 0.7, f.z, 2 * ribA, 1.2, 1.2, yawAt(f), 0, S_PLAIN, false);
      }
      for (const rib of ribs) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 56, 1.15, 8, false);
        P.arch.addGeometry(tube, S_PLAIN);
        tube.dispose();
      }
    }

    // ------------------------------------------------------------ chunk meshes
    for (let k = 0; k < nChunks; k++) {
      const P = parts[k];
      allDecks.append(P.deck);
      const chunk: Chunk = { meshes: [], steel: null, headIndices: 0, concrete: null, proxyStart: 0, farStart: 0, drawEnd: 0, center: new THREE.Vector3(), r: 0, dist: Infinity };
      const chunkBox = new THREE.Box3();
      const attach = (mesh: THREE.Mesh, cls: CasterClass) => {
        mesh.name = `${spec.id}#${k}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material === steelMat) mesh.onBeforeRender = (r, _s, camera) => { observeSteel(r, camera); };
        else mesh.onBeforeRender = (_r, _s, camera) => { culler.observe(camera); };
        const box = mesh.geometry.boundingBox!;
        chunk.meshes.push({ mesh, cls, box, height: box.max.y - box.min.y, inView: true, cast: ALL_CASCADES });
        chunkBox.union(box);
        group.add(mesh);
      };
      // concrete: structure first, then the deck ribbon; the shadow passes draw the structure only (the girder
      // outline already casts the deck's shadow)
      const structTris = P.struct.idx.length;
      P.struct.append(P.deck);
      // the pier proxies come last so the near draw range stops short of them (see PIER_PROXY_DISTANCE)
      const proxyStart = P.struct.idx.length;
      P.struct.append(P.proxy);
      const farStart = P.struct.idx.length;
      P.struct.append(P.proxyFar);
      const cMesh = new THREE.Mesh(P.struct.build([['aRoadUv', 2], ['aRoadInfo', 3]]), concreteMat);
      cMesh.onBeforeShadow = (_r, _o, camera) => { culler.observe(camera); cMesh.geometry.setDrawRange(0, structTris); };
      cMesh.onAfterShadow = () => { cMesh.geometry.setDrawRange(0, chunk.drawEnd); };
      cMesh.geometry.setDrawRange(0, proxyStart);
      chunk.concrete = cMesh;
      chunk.proxyStart = proxyStart;
      chunk.farStart = farStart;
      chunk.drawEnd = proxyStart;
      attach(cMesh, 'all');
      // thin steel: lamp heads first so the far LOD can draw them alone
      if (P.heads.idx.length || P.steel.idx.length) {
        const headIndices = P.heads.idx.length;
        P.heads.append(P.steel);
        const sMesh = new THREE.Mesh(P.heads.build([['aGlow', 1]]), steelMat);
        attach(sMesh, 'near');
        chunk.steel = sMesh;
        chunk.headIndices = headIndices;
      }
      if (P.tall.idx.length) attach(new THREE.Mesh(P.tall.build([['aRoadUv', 2], ['aRoadInfo', 3]]), concreteMat), 'all');
      if (P.arch.idx.length) attach(new THREE.Mesh(P.arch.build([['aGlow', 1]]), steelMat), cableStayed ? 'near' : 'all');
      const sphere = chunkBox.getBoundingSphere(new THREE.Sphere());
      chunk.center.copy(sphere.center); chunk.r = sphere.radius;
      culler.chunks.push(chunk);
    }
  }

  const deckGeometry = allDecks.build([['aRoadUv', 2], ['aRoadInfo', 3]]);
  // the lamps are part of the bridge steel (they need the dusk glow), so props gets none to place
  return { group, routes, deckGeometry, lampPositions: [], approaches };
}

/** Minimal geometry merge (positions, normals, indices) for same-material static geometry. */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vtx = 0, idx = 0;
  const infos = geos.map((g) => {
    const p = g.getAttribute('position');
    const ind = g.getIndex();
    const nIdx = ind ? ind.count : p.count;
    vtx += p.count; idx += nIdx;
    return { g, p, ind, nIdx };
  });
  const pos = new Float32Array(vtx * 3), nrm = new Float32Array(vtx * 3), uv = new Float32Array(vtx * 2);
  const index = vtx > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  let vo = 0, io = 0;
  for (const { g, p, ind, nIdx } of infos) {
    pos.set(p.array as Float32Array, vo * 3);
    const n = g.getAttribute('normal');
    if (n) nrm.set(n.array as Float32Array, vo * 3);
    const u = g.getAttribute('uv');
    if (u) uv.set(u.array as Float32Array, vo * 2);
    if (ind) for (let i = 0; i < nIdx; i++) index[io + i] = ind.getX(i) + vo;
    else for (let i = 0; i < nIdx; i++) index[io + i] = i + vo;
    vo += p.count; io += nIdx;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  for (const g of geos) g.dispose();
  return out;
}
