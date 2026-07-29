import * as THREE from 'three';
import { Groups } from '../../core/GameContext';
import type { IPhysics, LightPortal, RaycastHit } from '../../core/Interfaces';
import { disposeSurfaceAlbedo, surfaceAlbedo } from './SurfaceAlbedo';

/**
 * Sky visibility and indirect bounce, baked on the CPU against the physics BVH.
 *
 * One set of rays answers both questions, which is the whole reason to do it
 * this way. A ray that escapes tells you the point can see sky; a ray that hits
 * tells you what colour the light coming back from that direction is. Firing
 * them twice would double the cost of the only expensive part.
 *
 * Two volumes come out:
 *
 *  - **Sky visibility** — how open the sky is above a point and which way the
 *    opening lies, as an RGBA8 3D texture. This is what stops a room being lit
 *    as though its roof were not there.
 *  - **Irradiance probes** — the bounce arriving at a point, projected onto L2
 *    spherical harmonics and packed into the 3D atlas three's own probe-grid
 *    path samples. Sky is deliberately excluded: the prefiltered probe already
 *    carries it, and counting it twice is how ambient light gets away from you.
 *    What is left is exactly the interesting part — the warm light a sunlit
 *    wall throws into the shade beside it.
 *
 * Everything is amortised against a per-frame time budget, and the geometric
 * half of it is cached, so a moving sun re-lights from the cache instead of
 * re-tracing the level.
 */

/** Coefficients per probe, matching three's `getLightProbeGridIrradiance`. */
const SH_COEFFS = 9;
/**
 * Floats cached per ray: albedo rgb, hit normal xyz, sun visibility, the
 * ambient irradiance scale at the hit point, the solid angle the ray stands
 * for, and how far along it the surface was. Everything the relight needs and
 * nothing that would make it touch the BVH again.
 *
 * The distance is what makes the interreflection a transport rather than a
 * blur: it says *which* patch of the room a ray is looking at, so the bounce
 * can ask the grid how lit that patch is and keep the direction it came from.
 * See `runBounce`.
 */
const RAY_STRIDE = 10;
/** Offsets into a ray record. */
const RAY_ALBEDO = 0;
const RAY_NORMAL = 3;
const RAY_SUN = 6;
const RAY_AMBIENT = 7;
const RAY_SOLID_ANGLE = 8;
const RAY_DISTANCE = 9;
/**
 * Portal rays carry their own direction, since unlike the uniform ones they do
 * not share a fixed set. They are held in their own array indexed only for the
 * enclosed cells, which are a fifth of the grid; widening every ray record to
 * suit them would cost four times the memory to serve a fifth of the probes.
 */
const PORTAL_RAY_STRIDE = RAY_STRIDE + 3;
const RAY_DIRECTION = RAY_STRIDE;

/**
 * Below this a probe is treated as enclosed and its links to its neighbours are
 * measured, which is how light finds its way in through an opening the sphere
 * trace cannot see.
 */
const ENCLOSED = 0.16;

/**
 * Rays per face in the link pass.
 *
 * Sampling the *face* between two adjacent cells rather than the sphere is the
 * whole trick. Measured in the café this level ships, a window subtends 0.1% of
 * the sphere from the middle of the room, so a sphere trace needs thousands of
 * rays to find it at all and tens of thousands to measure it — and a
 * measurement that noisy puts a hard edge down the middle of a room where one
 * probe found the window and its neighbour did not. The same window covers
 * something like a quarter of the two-by-one-and-a-half metre face between the
 * cell inside it and the cell outside, so a dozen rays across that face
 * measures it to within a few per cent.
 */
const LINK_RAYS = 12;

/**
 * Rays aimed through the level's real openings.
 *
 * This is the answer to the inverted interior the review reported, and it is
 * worth setting out what it replaces, because two cheaper answers were tried
 * and both failed in the same direction.
 *
 * The first was to *propagate* — to treat sky visibility as a quantity that
 * flows from cell to cell along the open faces, decaying as it goes. Nothing in
 * a propagation is measured. Checked against a dense trace from the café floor,
 * cells at ceiling height came back reading 0.05 and 0.12 of the sphere open
 * against a true 0.0015, and pointing at the zenith, so the cosine term handed
 * the ceiling ten times the floor. There was no ray anywhere in that field that
 * had been near the sky.
 *
 * The second was to aim rays at the *face between two probe cells* where the
 * link pass found one side enclosed and the other open. That at least measures
 * something, but it inherits the grid: at two metres between columns a cell
 * face straddles the pier as often as the glass, and the café came back with
 * openness zero on every cell of its window wall and an interior that rendered
 * black.
 *
 * `LightPortal` closes it. The wall builder knows the rectangle of every hole
 * it cuts, so the bake is handed the openings instead of hunting for them, and
 * firing rays at a known rectangle is importance sampling with an analytic pdf.
 * Each ray carries the solid angle it stands for, so what comes back is the
 * true openness through the opening, the true direction it lies in, and the
 * true radiance of whatever is on the other side — the sunlit facade opposite,
 * the road below, the sky above the roofline — each with the solid angle it
 * actually covers.
 *
 * That is what puts the floor above the ceiling without a scrap of direct sun
 * in the room, and it is worth being precise about why, because it is the whole
 * defect. A floor looks up and out through the window and sees sky and the
 * sunlit tops of the buildings opposite. A ceiling looks down and out through
 * the same window and sees the road, which is several times dimmer. The
 * asymmetry is in the scene, not in the model; it only needed a bake that
 * resolves the opening well enough to find it.
 */
/**
 * Openings a single cell aims at, in order of how large they look from it, and
 * the rays split between them.
 *
 * Forty rays per opening is a lot, and the reason is that an opening in this
 * level is not a clean hole. It is a tunnel through four hundred millimetres of
 * masonry with a fifty-five millimetre lining, and whatever is hung in it —
 * three planks, a pair of slatted shutters, a mullion and a pane — is modelled.
 * Seen obliquely from across the room that chops the aperture into a fine
 * pattern of clear and blocked, and the part of it that carries the light is
 * finer still: at this hour only the upper storeys of the building opposite are
 * sunlit, so the band of the window that matters is a few degrees tall.
 *
 * Measured against a dense trace from the café floor, sixteen rays per opening
 * put the room *average* within a sixth but got individual cells wrong by eight
 * times in both directions, one reading warm where the truth was blue and its
 * neighbour the reverse. An average that is right over a field that is noise
 * renders as a blotchy room with no pool under any window, which is the defect
 * this was supposed to fix.
 */
const PORTAL_MAX = 4;
const PORTAL_RAYS = 160;
/** Beyond this an opening is too far to be worth the rays. */
const PORTAL_REACH = 26;
/**
 * Points a candidate opening is probed at before it is ranked, and the share of
 * them that has to come back clear for it to score in full.
 *
 * One ray at the centre is the cheap version and it fails on the openings that
 * matter most. A boarded window in this town carries three planks, and the
 * middle one sits across the centre of the hole by construction — so the centre
 * ray hits a plank on every one of them and the opening is written off at a
 * twenty-fifth of its weight, despite two-thirds of it being gaps. The four
 * points here sit at the quarters of the rectangle, where neither a central
 * mullion nor a middle plank reaches.
 */
const PORTAL_PROBES = 4;
/**
 * Floats per portal: centre, outward normal, the unit vector along the wall,
 * half-width, half-height. The third axis of the rectangle is world up, since
 * every wall in the level is vertical.
 */
const PORTAL_STRIDE = 11;
const PORTAL_CENTRE = 0;
const PORTAL_NORMAL = 3;
const PORTAL_TANGENT = 6;
const PORTAL_HALF_W = 9;
const PORTAL_HALF_H = 10;
/**
 * How far behind an opening's plane a cell may sit and still aim at it.
 *
 * Rooms are a few metres deep and the plane of a window extends across the
 * whole level, so without a bound every cell in the town is nominally behind
 * every south-facing window on it. The rays would still be traced honestly and
 * would stop on the intervening walls, but the cost is quadratic and the
 * picking would spend its six slots on openings forty metres away.
 */
const PORTAL_DEPTH = 14;

/**
 * How far a ray looks for something to stop on before it counts as sky.
 *
 * This is a property of the level rather than a quality dial, and getting it
 * wrong is the second half of the inverted interior. A ray that runs out of
 * reach is recorded as having escaped, which means two things at once: its
 * solid angle is added to the cell's openness, so the shader lets the blue
 * prefiltered probe in through it; and it contributes nothing to the harmonics,
 * because the radiance of sky is the probe's job. Both are wrong for a ray that
 * would have hit something.
 *
 * Measured from the café floor, the surfaces that light that room are the
 * west-facing upper storeys across the street at 23 to 31 metres and the town
 * skyline behind them at 92 to 96 — every one of them in full sun at this hour,
 * and together nine tenths of what an up-facing surface in the room receives.
 * At the thirty-metre reach the quality settings asked for, the nearest of those
 * was on the edge of being found and the skyline was invisible, so the rays that
 * left through a window were being turned into blue sky arriving from the
 * direction of a sunlit wall. That is the blue interior the review measured, and
 * the ceiling was the surface it flattered most: rays leaving a cell under the
 * slab tilt down through the opening and can see nothing but the road, yet a
 * third of them came back marked sky.
 *
 * Two hundred and fifty metres clears the whole town with room to spare. It is
 * nearly free: a ray that hits something at three metres costs what it always
 * did, because the traversal stops at the first hit, and only the small
 * fraction that genuinely leave the level pay for the longer march.
 */
const TRACE_REACH = 250;

/**
 * Bounces of the interreflection solve. See `runBounce`.
 *
 * Each sweep is a whole bounce and reaches the length of the room, because it
 * gathers along the rays the trace already cast rather than from the six
 * neighbouring cells. At the third of a room's reflectance this level measures,
 * the sixth bounce carries a thousandth of the first.
 */
const BOUNCE_SWEEPS = 6;
/** Bounds on the room reflectance reported by `roomAlbedo`. */
const BOUNCE_MIN = 0.12;
const BOUNCE_MAX = 0.55;

/**
 * Irradiance from a set of harmonics: the convolution of the radiance they hold
 * with a clamped cosine, band by band. The standard A-hat values.
 */
const SH_CONVOLVE = [
  Math.PI,
  (2 * Math.PI) / 3, (2 * Math.PI) / 3, (2 * Math.PI) / 3,
  Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4,
];

/**
 * Openness two cells have to be within to pool their light freely. See
 * `pooling`.
 *
 * Set by what the level measures rather than by taste: cells well inside a room
 * come back between 0.0001 and 0.0012 of the sphere open, and cells sitting in a
 * window aperture between 0.04 and 0.2. Anything at or under this floor counts
 * as the same kind of place, which keeps a room pooling with itself across the
 * factor of ten its own cells vary by down at those magnitudes.
 */
const POOL_FLOOR = 0.006;

/**
 * The same idea applied to the visibility read, where it guards a trilinear
 * fetch rather than a diffusion and so has to hold a room apart from the street
 * across a single wall. Kept in step with `LGT_POOL_FLOOR` in `ambient.glsl`,
 * which is the copy of this read the shader makes.
 */
const POOL_FLOOR_VIS = 0.05;

/** Irradiance an isotropic field of this DC coefficient delivers: pi * Y0. */
const ISO_IRRADIANCE = Math.PI * 0.282095;

/**
 * What survives one pane of the town's glazing.
 *
 * This number is the difference between a level with interiors and a level
 * with sealed boxes, and it is worth being precise about why. A window in this
 * town is a hole in the wall mesh with a pane of glass hung in it. The pane is
 * deliberately kept out of the shadow cascades — see the note in
 * `Architecture.ts`, which found that a pane in the shadow map lays an opaque
 * rectangle across the floor exactly where the shaft through that window
 * belongs — but it is an ordinary collider, so every ray this bake fires stops
 * dead on it. The renderer's model of a building therefore has windows and the
 * bake's model does not, and every conclusion the bake draws about an interior
 * follows from a room with no openings at all: no aperture to find, no
 * direction for one to lie in, and no sun anywhere in the bounce.
 *
 * Marching through the pane instead puts the two models back in agreement.
 * Clear float glass passes about 0.88 of visible light and the grubby single
 * glazing of a half-abandoned town rather less, so 0.72 a pane is both a
 * reasonable number and on the conservative side of one.
 *
 * A *pane*, and the distinction is worth the constant being named for a face
 * rather than for a window. Glazing in this level is a box twenty millimetres
 * thick with its front and back faces both in the collision set, so a ray
 * crossing one window meets glass twice; charging it a pane each time made every
 * clear window in the town pass 0.52 instead of 0.72, and it did it invisibly,
 * because the number in the comment was right and only the number the code
 * applied was wrong.
 */
const GLAZING_FACE = Math.sqrt(0.72);
/**
 * Glass faces to cross before a ray gives up: three panes at two faces each. A
 * stack deeper than that is a shopfront seen end-on, which is a wall.
 */
const GLAZING_LAYERS = 6;

/**
 * A hit closer than this means the probe is *in* the surface, not looking at
 * it, and the fraction of the sphere that has to be that close before the
 * probe counts as solid.
 *
 * Half a metre and seventy per cent separate the two cases cleanly. A probe
 * centred in a 20 cm wall has 80% of the sphere blocked inside half a metre —
 * only rays within twelve degrees of the wall plane get further. A probe
 * standing where relocation puts them, half a metre clear of a floor, has 2%.
 * Nothing legitimate lands between.
 */
const BURIED_NEAR = 0.5;
const BURIED_FRACTION = 0.72;

/** Axis directions the escape tries, in pairs so `-y` can be preferred. */
const ESCAPE_DIRS = [
  [0, -1, 0],
  [0, 1, 0],
  [-1, 0, 0],
  [1, 0, 0],
  [0, 0, -1],
  [0, 0, 1],
];

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _bent = new THREE.Vector3();
const _size = new THREE.Vector3();
const _sample = new THREE.Vector4();
const _color = new THREE.Color();
const _march = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _target = new THREE.Vector3();
const _walk = new THREE.Vector3();
const _irradiance = new THREE.Color();
const _basis = new Float32Array(SH_COEFFS);
const _centre = new THREE.Vector3();
/** Portal index and solid angle for the openings one cell aims at. */
const _pick = new Int32Array(PORTAL_MAX);
const _pickOmega = new Float64Array(PORTAL_MAX);

function scratchHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
  };
}

/* Two, because the sun-visibility ray is fired while the primary hit is still
   being read. Sharing one would silently overwrite the normal mid-use. */
const _hit = scratchHit();
const _shadowHit = scratchHit();

const BAKE_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;

/** Directions on a Fibonacci sphere: even coverage with no seams or poles. */
function fibonacciSphere(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(theta) * r;
  }
  return out;
}

/**
 * Cosine-weighted sky visibility for a surface normal, given a probe's cone.
 *
 * The GLSL twin of this lives in `lgtSkyAperture` and the two have to agree:
 * the bounce a probe reports is the light arriving at surfaces that the shader
 * will independently light, and a mismatch shows up as interiors whose bounce
 * disagrees with their ambient.
 *
 * The stored openness is the fraction of the whole sphere that escapes, so a
 * cone of half-angle t covering it satisfies (1 - cos t) / 2 = openness and
 * sin^2 t = 4 * openness * (1 - openness). A uniform cone at angle a to the
 * normal delivers irradiance pi * sin^2(t) * cos(a) while it stays clear of the
 * horizon, and (1 + cos a) / 2 once it spans the hemisphere; blending on the
 * openness itself carries a point in the open to exactly 1 for an up-facing
 * surface, which is what keeps exteriors unchanged by any of this.
 */
export function apertureOf(vis: THREE.Vector4, nx: number, ny: number, nz: number): number {
  const openness = THREE.MathUtils.clamp(vis.w, 0, 1);
  const length = Math.sqrt(vis.x * vis.x + vis.y * vis.y + vis.z * vis.z);
  const cosAlpha =
    length > 1e-4 ? (nx * vis.x + ny * vis.y + nz * vis.z) / length : ny;
  const cone = Math.min(openness, 0.5);
  const sinSq = 4 * cone * (1 - cone);
  const sinT = Math.sqrt(sinSq);
  const narrow =
    cosAlpha >= sinT
      ? cosAlpha
      : cosAlpha <= -sinT
        ? 0
        : ((cosAlpha + sinT) * (cosAlpha + sinT)) / (4 * Math.max(sinT, 1e-4));
  const wide = 0.5 + 0.5 * cosAlpha;
  return sinSq * (narrow + (wide - narrow) * Math.min(openness * 2, 1));
}

/** Real SH basis through L2, evaluated once per fixed ray direction. */
function shBasis(x: number, y: number, z: number, out: Float32Array, offset: number): void {
  out[offset] = 0.282095;
  out[offset + 1] = 0.488603 * y;
  out[offset + 2] = 0.488603 * z;
  out[offset + 3] = 0.488603 * x;
  out[offset + 4] = 1.092548 * x * y;
  out[offset + 5] = 1.092548 * y * z;
  out[offset + 6] = 0.315392 * (3 * z * z - 1);
  out[offset + 7] = 1.092548 * x * z;
  out[offset + 8] = 0.546274 * (x * x - y * y);
}

export interface VolumeConfig {
  /** Target metres between probes. */
  spacing: number;
  rays: number;
  maxProbes: number;
}

type Phase = 'idle' | 'trace' | 'link' | 'portal' | 'gather' | 'project' | 'bounce';

export class IrradianceVolume {
  readonly bounds = new THREE.Box3();
  readonly resolution = new THREE.Vector3(1, 1, 1);

  /** RGBA8: bent normal in rgb, upward openness in a. */
  visibilityTexture: THREE.Data3DTexture | null = null;
  /** Half-float atlas of seven sub-volumes, in three's probe-grid layout. */
  shTexture: THREE.Data3DTexture | null = null;

  /** True once the geometric bake has finished and the volume can be trusted. */
  ready = false;
  /** 0..1 across whichever phase is running. */
  progress = 0;

  /**
   * What the bake found, for the debug overlay. Cheap to keep and the only way
   * to tell a level with no interiors from one whose openings were missed.
   */
  readonly stats = {
    probes: 0,
    enclosed: 0,
    buried: 0,
    openings: 0,
    /** Mean sphere fraction the enclosed cells measured through them. */
    interiorOpenness: 0,
    /** Room reflectance driving the interreflection solve. */
    reflectance: '',
  };

  /**
   * Needed only to read each material's average albedo off the GPU, once. The
   * bake is otherwise pure CPU.
   */
  renderer: THREE.WebGLRenderer | null = null;

  private config: VolumeConfig = { spacing: 4, rays: 32, maxProbes: 2400 };
  private directions: Float32Array = new Float32Array(0);
  /**
   * Clear fraction of the face to the next probe along +x, +y and +z. Held on
   * the lower probe of each pair, since transmission is symmetric.
   */
  private links: Float32Array = new Float32Array(0);
  private basis = new Float32Array(0);
  private rayCache = new Float32Array(0);
  private visibility = new Float32Array(0);
  private visibilityBytes = new Uint8Array(0);
  private shData = new Uint16Array(0);
  private sh = new Float32Array(0);
  /**
   * The interreflected field: light that has bounced off the room's own
   * surfaces and forgotten which way it came in. Held apart from `sh` so each
   * sweep reads the previous one rather than accumulating into its own input,
   * and because only its DC term is ever non-zero.
   */
  private shSpread = new Float32Array(0);
  private shSpreadNext = new Float32Array(0);
  /** The level's openings, flattened; see `PORTAL_STRIDE`. */
  private portals = new Float32Array(0);
  private portalCount = 0;
  /** As published by the world, kept so a rebake does not need them again. */
  private openings: readonly LightPortal[] = [];
  /** Rays aimed through the openings, for enclosed cells only. */
  private portalRays = new Float32Array(0);
  /** Where a probe's portal rays start, or -1 when it has none. */
  private portalSlot = new Int32Array(0);
  /**
   * Cells whose grid slot is inside solid, whether or not relocation rescued
   * them. See `dilateHarmonics` for what that is for.
   */
  private interred = new Uint8Array(0);
  /** Mean reflectance of the room surfaces, measured by `roomAlbedo`. */
  private transfer = new THREE.Color(BOUNCE_MIN, BOUNCE_MIN, BOUNCE_MIN);
  private probeCount = 0;
  private origin = new THREE.Vector3();
  private cell = new THREE.Vector3();
  /** Where each probe was actually traced from, after relocation. */
  private positions: Float32Array = new Float32Array(0);

  private phase: Phase = 'idle';
  private cursor = 0;
  private relightSun = new THREE.Color();
  private relightSky = new THREE.Color();
  private relightDirection = new THREE.Vector3(0, 1, 0);
  /**
   * Sun direction the shadow rays were fired along. Frozen for the whole bake,
   * because half the cache would otherwise be shadowed against one sun and half
   * against another. A later relight re-projects but cannot re-shadow, so a
   * full day sweep keeps the bounce pattern of whenever the level loaded — a
   * deliberate trade, since re-tracing is two orders of magnitude dearer.
   */
  private bakeSun = new THREE.Vector3(0, 1, 0);
  private pendingRelight = false;

  /**
   * Hands the bake the level's window and door openings. Call before
   * `configure`, which sizes its buffers off them.
   *
   * Kept rather than copied straight into the flat array because `configure`
   * needs the volume bounds to reject the ones outside it, and a rebake for
   * moved bounds must be able to re-filter the same list.
   */
  setPortals(openings: readonly LightPortal[] | undefined): void {
    this.openings = openings ?? [];
  }

  /**
   * Set up the grid for a level. Returns false when there is nothing to bake.
   *
   * With `trace` false the volume is built neutral — open sky, no bounce — and
   * no rays are fired. That is the bootstrap case: the textures have to exist
   * from the first compile so that adding them later does not rebuild every
   * program in the scene, but a grid placed before the level is known must not
   * pretend to have measured it.
   */
  configure(bounds: THREE.Box3, config: Partial<VolumeConfig> = {}, trace = true): boolean {
    Object.assign(this.config, config);
    if (bounds.isEmpty()) return false;

    this.bounds.copy(bounds);
    /* A little headroom so surfaces exactly on the boundary interpolate against
       a real probe rather than clamping to the edge one. */
    this.bounds.expandByScalar(2);
    this.bounds.getSize(_size);

    const spacing = Math.max(1, this.config.spacing);
    /*
     * Vertical resolution is worth more per probe than horizontal and costs the
     * same. Rooms are separated vertically by slabs a fifth of a metre thick,
     * so a slice every 2.7 metres — which is what a 12-deep grid over a level's
     * playable band came to — cannot put a single probe inside a storey. The
     * ceiling then samples the slice above the roof and the floor the slice
     * below the screed, and the room is lit by its neighbours.
     *
     * Nor is one slice inside a storey enough, which is what the next attempt
     * bought. The defect this volume exists to fix is a *vertical* one — a
     * floor that should outshine the ceiling over it — and at 1.2 m slices a
     * three-metre room is two and a half cells tall, so the floor and the
     * ceiling read very nearly the same pair of probes and no arrangement of
     * the light between them survives the interpolation. At 0.8 m it is four,
     * with the bottom one clear of the screed, and a gradient down the room can
     * actually be stored. The horizontal axes give up 2.0 m against 2.3 m to
     * pay for it, which still fits five columns across a café.
     */
    let nx = THREE.MathUtils.clamp(Math.round(_size.x / spacing) + 1, 3, 40);
    let ny = THREE.MathUtils.clamp(Math.round(_size.y / (spacing * 0.4)) + 1, 3, 34);
    let nz = THREE.MathUtils.clamp(Math.round(_size.z / spacing) + 1, 3, 40);

    /* Trim the horizontal resolution until the probe count fits the budget; the
       vertical axis is already the cheapest one and losing it costs the most. */
    while (nx * ny * nz > this.config.maxProbes && (nx > 4 || nz > 4)) {
      if (nx >= nz && nx > 4) nx--;
      else if (nz > 4) nz--;
      else break;
    }
    while (nx * ny * nz > this.config.maxProbes && ny > 3) ny--;

    this.resolution.set(nx, ny, nz);
    this.probeCount = nx * ny * nz;
    this.origin.copy(this.bounds.min);
    this.cell.set(
      _size.x / Math.max(nx - 1, 1),
      _size.y / Math.max(ny - 1, 1),
      _size.z / Math.max(nz - 1, 1),
    );

    const rays = Math.max(8, this.config.rays);
    this.directions = fibonacciSphere(rays);
    this.basis = new Float32Array(rays * SH_COEFFS);
    for (let i = 0; i < rays; i++) {
      shBasis(
        this.directions[i * 3],
        this.directions[i * 3 + 1],
        this.directions[i * 3 + 2],
        this.basis,
        i * SH_COEFFS,
      );
    }

    this.buildPortals();

    this.rayCache = new Float32Array(this.probeCount * rays * RAY_STRIDE);
    this.portalRays = new Float32Array(0);
    this.portalSlot = new Int32Array(this.probeCount).fill(-1);
    this.interred = new Uint8Array(this.probeCount);
    this.positions = new Float32Array(this.probeCount * 3);
    this.links = new Float32Array(this.probeCount * 3);
    this.visibility = new Float32Array(this.probeCount * 4);
    this.visibilityBytes = new Uint8Array(this.probeCount * 4);
    this.sh = new Float32Array(this.probeCount * SH_COEFFS * 3);
    this.shSpread = new Float32Array(this.probeCount * SH_COEFFS * 3);
    this.shSpreadNext = new Float32Array(this.probeCount * SH_COEFFS * 3);
    this.shData = new Uint16Array(nx * ny * 7 * (nz + 2) * 4);

    this.cursor = 0;
    this.ready = false;
    this.progress = 0;
    this.phase = trace ? 'trace' : 'idle';
    this.pendingRelight = false;
    this.bakeSun.copy(this.relightDirection);
    this.buildTextures();
    return true;
  }

  get baking(): boolean {
    return this.phase !== 'idle';
  }

  /**
   * Advances whichever phase is running, for up to `budgetMs`. One call per
   * frame; the whole bake is a few hundred milliseconds of work spread thin
   * enough that nothing drops below the frame budget.
   */
  step(physics: IPhysics | undefined, budgetMs: number): void {
    if (this.phase === 'idle') {
      if (!this.pendingRelight || this.probeCount === 0) return;
      this.pendingRelight = false;
      this.cursor = 0;
      this.sh.fill(0);
      this.phase = 'project';
    }

    const deadline = performance.now() + Math.max(0.5, budgetMs);
    switch (this.phase) {
      case 'trace':
        if (!physics) return;
        this.runTrace(physics, deadline);
        break;
      case 'link':
        if (!physics) return;
        this.runLink(physics, deadline);
        break;
      case 'portal':
        if (!physics) return;
        this.runPortal(physics, deadline);
        break;
      case 'gather':
        this.runGather(deadline);
        break;
      case 'project':
        this.runProject(deadline);
        break;
      case 'bounce':
        this.runBounce(deadline);
        break;
    }
  }

  /**
   * Queues a re-projection of the cached bounce for a new sun and sky.
   *
   * No raycasts are involved: the geometry never moved, only the light on it
   * did. The work is still tens of thousands of ray records times nine
   * coefficients, so it runs in slices — a time-of-day sweep lags the probes by
   * a couple of frames instead of dropping one.
   */
  requestRelight(sunColor: THREE.Color, sunDirection: THREE.Vector3, skyColor: THREE.Color): void {
    this.relightSun.copy(sunColor);
    this.relightSky.copy(skyColor);
    this.relightDirection.copy(sunDirection).normalize();
    this.pendingRelight = true;
  }

  /* ------------------------------- tracing ------------------------------- */

  /**
   * Nearest *opaque* hit along a ray, seeing through glazing on the way.
   *
   * Returns the fraction of light that reaches `maxDistance`: zero when
   * something opaque stops the ray, in which case `out` describes it and
   * `out.distance` is the whole distance travelled to get there; otherwise how
   * much survives the panes crossed, which is 1 for a clear line.
   *
   * Every raycast in the bake goes through here, so the geometry the bake
   * reasons about is the geometry the cascades rasterise rather than the
   * collision world, which is a different building wherever there is a window.
   */
  private traceOpaque(
    physics: IPhysics,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    out: RaycastHit,
  ): number {
    let travelled = 0;
    let through = 1;
    _walk.copy(origin);

    for (let pane = 0; ; pane++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(_walk, direction, remaining, out, BAKE_MASK)) return through;
      travelled += out.distance;
      if (out.surface !== 'glass' || pane >= GLAZING_LAYERS) {
        out.distance = travelled;
        return 0;
      }
      through *= GLAZING_FACE;
      /* Step past the pane rather than off its surface: a pane is two faces a
         couple of centimetres apart and the far one would otherwise be found
         again at zero distance. */
      _walk.copy(out.point).addScaledVector(direction, 0.05);
      travelled += 0.05;
    }
  }

  private runTrace(physics: IPhysics, deadline: number): void {
    const rays = this.directions.length / 3;
    const nx = this.resolution.x;
    const ny = this.resolution.y;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const ix = p % nx;
      const iy = Math.floor(p / nx) % ny;
      const iz = Math.floor(p / (nx * ny));
      _origin.set(
        this.origin.x + ix * this.cell.x,
        this.origin.y + iy * this.cell.y,
        this.origin.z + iz * this.cell.z,
      );
      /* Trace first, judge after. Whether a probe is inside something is
         measured from the rays it fires rather than guessed at beforehand, and
         those are the same rays the bounce needs. */
      let solid = this.traceProbe(physics, p, _origin, rays);
      /* Noted whether or not the escape works, because what makes this cell
         dangerous is where its grid slot is and not where its rays were fired
         from. See `dilateHarmonics`. */
      this.interred[p] = solid ? 1 : 0;
      if (solid && this.escape(physics, _origin)) {
        solid = this.traceProbe(physics, p, _origin, rays);
      }
      this.positions[p * 3] = _origin.x;
      this.positions[p * 3 + 1] = _origin.y;
      this.positions[p * 3 + 2] = _origin.z;
      if (solid) {
        /* Still inside after the escape: leave it for the dilation pass rather
           than let a black cell into the interpolation. */
        this.visibility[p * 4] = 0;
        this.visibility[p * 4 + 1] = 1;
        this.visibility[p * 4 + 2] = 0;
        this.visibility[p * 4 + 3] = -1;
        this.rayCache.fill(0, p * rays * RAY_STRIDE, (p + 1) * rays * RAY_STRIDE);
      }
      this.cursor++;
      /* Checking the clock every eighth probe rather than every ray: a probe is
         a few dozen BVH queries and `performance.now` is not free either. */
      if ((this.cursor & 7) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.links.fill(-1);
    this.cursor = 0;
    this.phase = 'link';
  }

  /* -------------------------------- linking ------------------------------ */

  /**
   * Measures how open each enclosed cell is to its six neighbours.
   *
   * This is not how light gets into a room — the portals do that — but it is
   * how light already in one gets around it. The interreflection solve carries
   * irradiance between adjacent cells, and it has to know which pairs of cells
   * are actually the same room: two cells either side of a party wall must not
   * exchange anything, and two either side of a doorway must. The face between
   * two cells is a couple of square metres, so a dozen rays across it measure
   * that to within a few per cent, which is all the solve needs.
   */
  private runLink(physics: IPhysics, deadline: number): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const openness = this.visibility[p * 4 + 3];
      /* Only around the enclosed cells: solid probes hold nothing to carry and
         the interreflection never runs through open air. */
      if (openness >= 0 && openness < ENCLOSED) {
        const ix = p % nx;
        const iy = Math.floor(p / nx) % ny;
        const iz = Math.floor(p / (nx * ny));
        if (ix > 0) this.linkPair(physics, p - 1, 0);
        if (ix < nx - 1) this.linkPair(physics, p, 0);
        if (iy > 0) this.linkPair(physics, p - nx, 1);
        if (iy < ny - 1) this.linkPair(physics, p, 1);
        if (iz > 0) this.linkPair(physics, p - nx * ny, 2);
        if (iz < nz - 1) this.linkPair(physics, p, 2);
      }
      this.cursor++;
      if ((this.cursor & 7) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.assignPortalSlots();
    this.cursor = 0;
    this.phase = 'portal';
  }

  /**
   * Clear fraction of the face between a probe and its next neighbour along
   * one axis, cached so a shared face is only ever measured once.
   *
   * The rays cross the face square on, from a lattice of points half a cell
   * behind it to the matching points half a cell in front, so what is measured
   * is the projected open area of the face and nothing else.
   *
   * The obvious alternative is to fan rays from one probe to the other, and it
   * fails silently at exactly the faces this exists to find. A probe that
   * landed inside a wall is relocated, and relocation puts it a few
   * centimetres to one side of the surface it was in — which for a probe in an
   * external wall means *in the masonry beside the window*. Fanning rays at it
   * measures the pier and reports the face shut, so the café that ships in
   * this level came back with no openings on its window wall at all and an
   * interior lit entirely by whatever the interpolation leaked in. Rays that
   * cross the face cannot be misled that way: neither endpoint is a probe.
   */
  private linkPair(physics: IPhysics, probe: number, axis: number): void {
    const slot = probe * 3 + axis;
    if (this.links[slot] >= 0) return;

    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const ix = probe % nx;
    const iy = Math.floor(probe / nx) % ny;
    const iz = Math.floor(probe / (nx * ny));

    /* The face lies half a cell past the lower probe's *grid* position. */
    _centre.set(
      this.origin.x + (ix + (axis === 0 ? 0.5 : 0)) * this.cell.x,
      this.origin.y + (iy + (axis === 1 ? 0.5 : 0)) * this.cell.y,
      this.origin.z + (iz + (axis === 2 ? 0.5 : 0)) * this.cell.z,
    );
    const span = axis === 0 ? this.cell.x : axis === 1 ? this.cell.y : this.cell.z;
    const ua = axis === 0 ? 1 : 0;
    const va = axis === 2 ? 1 : 2;
    const su = ua === 1 ? this.cell.y : this.cell.x;
    const sv = va === 1 ? this.cell.y : this.cell.z;
    _direction.set(0, 0, 0).setComponent(axis, 1);

    let clear = 0;
    for (let i = 0; i < LINK_RAYS; i++) {
      /* A 3 x 4 lattice across the face, offset by the golden ratio along one
         axis so it never lines up with a rectangular opening — an aligned
         lattice counts a window in steps of a whole row as the grid shifts. */
      const u = ((i % 3) + ((i * 0.6180339887) % 1)) / 3 - 0.5;
      const v = (Math.floor(i / 3) + 0.5) / 4 - 0.5;

      _origin.copy(_centre);
      _origin.setComponent(axis, _origin.getComponent(axis) - span * 0.5);
      _origin.setComponent(ua, _origin.getComponent(ua) + u * su);
      _origin.setComponent(va, _origin.getComponent(va) + v * sv);
      clear += this.traceOpaque(physics, _origin, _direction, span, _hit);
    }

    this.links[slot] = clear / LINK_RAYS;
  }

  /* -------------------------------- portals ------------------------------ */

  /**
   * Flattens the world's openings into the sampling array, dropping the ones
   * outside the volume.
   *
   * Openings are stored as a rectangle in the plane of the wall rather than at
   * the back of the reveal. The aperture is what sets the solid angle, and a
   * ray fired at it resolves the jamb it passes for itself — the reveal is
   * ordinary geometry and stops the rays that graze it.
   */
  private buildPortals(): void {
    const out: number[] = [];
    for (const o of this.openings) {
      if (o.width <= 0.05 || o.height <= 0.05) continue;
      if (!this.bounds.containsPoint(_centre.set(o.x, o.y, o.z))) continue;
      out.push(
        o.x, o.y, o.z,
        o.nx, 0, o.nz,
        o.ux, 0, o.uz,
        o.width * 0.5, o.height * 0.5,
      );
    }
    this.portals = new Float32Array(out);
    this.portalCount = out.length / PORTAL_STRIDE;
    this.stats.openings = this.portalCount;
  }

  /**
   * Numbers the cells that get portal rays and sizes the buffer for them.
   *
   * The test is the openness the uniform trace measured, which separates the
   * two cases with a wide margin and no tuning: a cell in the street comes back
   * with a fifth to a half of the sphere open, and a cell in a room with a few
   * thousandths, because the room's only openings are far below what the trace
   * can resolve. That is the same fact that makes the portals necessary, used as
   * the test for who needs them.
   */
  private assignPortalSlots(): void {
    let enclosed = 0;
    for (let p = 0; p < this.probeCount; p++) {
      const openness = this.visibility[p * 4 + 3];
      this.portalSlot[p] = openness >= 0 && openness < ENCLOSED ? enclosed++ : -1;
    }
    this.portalRays = new Float32Array(enclosed * PORTAL_RAYS * PORTAL_RAY_STRIDE);
    this.stats.probes = this.probeCount;
    this.stats.enclosed = enclosed;
  }

  /**
   * Fires each enclosed cell's rays at the openings it can see.
   *
   * The estimator is the whole of this. Sampling a rectangle uniformly and
   * weighting each sample by `area * cos / distance^2` is an unbiased estimate
   * of the solid angle it covers, so a ray carries the slice of the sphere it
   * stands for rather than an equal share of a sphere it was never spread over.
   * Three dozen rays through a window measure it about as well as ten thousand
   * uniform ones, and — the part that matters — they measure it the same way
   * from the next cell along, so the falloff into the room is smooth instead of
   * being the difference between two lottery results.
   *
   * Nothing is assumed about whether the opening is really visible. The rays
   * are traced against the level like any others, so a cell in the back room
   * aims at the front room's window, has its rays stopped by the wall between
   * them, and correctly records a bounce off that wall instead of a view of the
   * street. The estimate stays unbiased either way; picking the openings well
   * only decides how many rays land somewhere useful.
   */
  private runPortal(physics: IPhysics, deadline: number): void {
    const rays = this.directions.length / 3;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const home = this.portalSlot[p];
      if (home >= 0 && this.portalCount > 0) {
        _origin.set(
          this.positions[p * 3],
          this.positions[p * 3 + 1],
          this.positions[p * 3 + 2],
        );

        const picked = this.pickPortals(physics, _origin);
        if (picked > 0) {
          this.strikeEscapes(p, rays, picked);
          let total = 0;
          for (let i = 0; i < picked; i++) total += _pickOmega[i];

          const base = home * PORTAL_RAYS * PORTAL_RAY_STRIDE;
          let used = 0;
          let open = 0;
          _bent.set(0, 0, 0);
          for (let i = 0; i < picked && used < PORTAL_RAYS; i++) {
            /* Half the budget split evenly and half by how large the opening
               looks. Each opening's estimate divides by its own ray count, so
               this is a variance choice and not a bias one — but it decides
               which measurement is noise. Solid angle alone starves the
               openings that carry the light: mid-café the nearest one is an
               interior doorway a metre and a half away, three times the two
               windows put together by solid angle and looking at the dark floor
               of the room next door, and it took half the rays while each
               window onto the sunlit facade opposite — which is nine tenths of
               what the room actually receives — got under a fifth. An even
               floor costs the doorway precision it does not need. */
            const even = PORTAL_RAYS / (2 * picked);
            const share = Math.max(
              3,
              Math.round(even + (PORTAL_RAYS * _pickOmega[i]) / (2 * total)),
            );
            const count = Math.min(share, PORTAL_RAYS - used);
            open += this.samplePortal(
              physics, _pick[i], _origin, count, base + used * PORTAL_RAY_STRIDE, _bent,
            );
            used += count;
          }

          const v = p * 4;
          const measured = open / (4 * Math.PI);
          if (measured > this.visibility[v + 3]) {
            this.visibility[v + 3] = measured;
            if (_bent.lengthSq() > 1e-12) {
              _bent.normalize();
              this.visibility[v] = _bent.x;
              this.visibility[v + 1] = _bent.y;
              this.visibility[v + 2] = _bent.z;
            }
          }
        }
      }
      this.cursor++;
      if ((this.cursor & 7) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    let sum = 0;
    let buried = 0;
    for (let p = 0; p < this.probeCount; p++) {
      if (this.visibility[p * 4 + 3] < 0) buried++;
      else if (this.portalSlot[p] >= 0) sum += this.visibility[p * 4 + 3];
    }
    this.stats.buried = buried;
    this.stats.interiorOpenness = this.stats.enclosed > 0 ? sum / this.stats.enclosed : 0;

    this.dilate();
    this.uploadVisibility();
    this.cursor = 0;
    this.phase = 'gather';
  }

  /**
   * The openings a point can actually see, largest first, into `_pick`. Returns
   * how many were found.
   *
   * Ranking on geometry alone does not work, and it is worth setting out why,
   * because it is the difference between a lit room and a black one. Solid angle
   * says a three-metre shopfront eight metres away is four times the window in
   * the room you are standing in — and the café this level ships sits on the
   * storey *above* a row of shopfronts, so every one of its cells spent every
   * ray it had on openings below its own floor slab. Every ray stopped on the
   * screed at 4.36 m, the room measured zero openness, and it rendered black.
   * The plane of a window extends across the whole level; being behind it says
   * almost nothing about being in the room it lights.
   *
   * So each candidate is probed at the quarters of its rectangle and ranked on
   * the share that comes back clear. That is a few dozen extra traces per
   * interior cell against the four hundred thousand the uniform pass already
   * fires, and it replaces the one guess in this pass that could not be made to
   * hold: which openings belong to the room. A blocked candidate is kept at a
   * heavy discount rather than dropped, so a cell whose only window is behind a
   * mullion still aims there and the full rectangle sampling sorts out the
   * detail.
   */
  private pickPortals(physics: IPhysics, origin: THREE.Vector3): number {
    let count = 0;
    for (let i = 0; i < this.portalCount; i++) {
      const b = i * PORTAL_STRIDE;
      const dx = this.portals[b + PORTAL_CENTRE] - origin.x;
      const dy = this.portals[b + PORTAL_CENTRE + 1] - origin.y;
      const dz = this.portals[b + PORTAL_CENTRE + 2] - origin.z;
      /* The normal points out of the building, so a point inside is behind the
         opening's plane and a point in the street is in front of it. */
      const depth = dx * this.portals[b + PORTAL_NORMAL] + dz * this.portals[b + PORTAL_NORMAL + 2];
      if (depth <= 0.05 || depth > PORTAL_DEPTH) continue;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > PORTAL_REACH * PORTAL_REACH) continue;
      /* Half a cell is the closest a probe can usefully be; nearer than that the
         inverse square runs away and the rectangle is not a small source. */
      const distance = Math.sqrt(distSq);
      const halfW = this.portals[b + PORTAL_HALF_W];
      const halfH = this.portals[b + PORTAL_HALF_H];
      const area = 4 * halfW * halfH;
      let score = (area * (depth / distance)) / Math.max(distSq, 0.36);
      if (score < 2e-4) continue;

      /* Stopping just short of the aperture, so what is measured is the line of
         sight to the hole and not what is hung in it. */
      let clear = 0;
      for (let k = 0; k < PORTAL_PROBES; k++) {
        const u = (k & 1 ? 0.5 : -0.5) * halfW;
        const v = (k & 2 ? 0.5 : -0.5) * halfH;
        _target.set(
          this.portals[b + PORTAL_CENTRE] + this.portals[b + PORTAL_TANGENT] * u,
          this.portals[b + PORTAL_CENTRE + 1] + v,
          this.portals[b + PORTAL_CENTRE + 2] + this.portals[b + PORTAL_TANGENT + 2] * u,
        );
        _direction.subVectors(_target, origin);
        const len = _direction.length();
        if (len <= 0.1) { clear++; continue; }
        _direction.multiplyScalar(1 / len);
        if (this.traceOpaque(physics, origin, _direction, len - 0.08, _hit) > 0) clear++;
      }
      /* Never zero: an opening every probe missed is still worth a few rays,
         because the probes are four points and the sampling is sixteen. */
      score *= 0.04 + (0.96 * clear) / PORTAL_PROBES;

      let at = count < PORTAL_MAX ? count : -1;
      if (at < 0) {
        let worst = 0;
        for (let k = 1; k < PORTAL_MAX; k++) if (_pickOmega[k] < _pickOmega[worst]) worst = k;
        if (_pickOmega[worst] >= score) continue;
        at = worst;
      } else {
        count++;
      }
      _pick[at] = i;
      _pickOmega[at] = score;
    }
    return count;
  }

  /**
   * Fires `count` rays at one opening, recording each with the solid angle it
   * stands for. Returns the solid angle that reached open sky, and accumulates
   * the escaping directions into `bent`.
   */
  private samplePortal(
    physics: IPhysics,
    portal: number,
    origin: THREE.Vector3,
    count: number,
    firstSlot: number,
    bent: THREE.Vector3,
  ): number {
    const b = portal * PORTAL_STRIDE;
    const cx = this.portals[b + PORTAL_CENTRE];
    const cy = this.portals[b + PORTAL_CENTRE + 1];
    const cz = this.portals[b + PORTAL_CENTRE + 2];
    const tx = this.portals[b + PORTAL_TANGENT];
    const tz = this.portals[b + PORTAL_TANGENT + 2];
    const halfW = this.portals[b + PORTAL_HALF_W];
    const halfH = this.portals[b + PORTAL_HALF_H];
    const area = 4 * halfW * halfH;
    /* The samples cover the whole rectangle, and the weight above is its whole
       area. Sampling an inset of it while weighting by the full area is a bias,
       and at the 10% inset that looked prudent it is a 23% one — the rays that
       graze the jamb are supposed to come back with the jamb on them, which is
       what makes a deep reveal read as deep. */
    const cols = Math.max(1, Math.round(Math.sqrt(count * (halfW / Math.max(halfH, 0.05)))));
    const rows = Math.max(1, Math.ceil(count / cols));
    let open = 0;

    for (let i = 0; i < count; i++) {
      /* Stratified over the rectangle, offset by the golden ratio along one
         axis so the lattice never lines up with the glazing bars. */
      const u = ((i % cols) + ((i * 0.6180339887) % 1)) / cols - 0.5;
      const v = (Math.floor(i / cols) + 0.5) / rows - 0.5;
      _target.set(
        cx + tx * u * 2 * halfW,
        cy + v * 2 * halfH,
        cz + tz * u * 2 * halfW,
      );

      _direction.subVectors(_target, origin);
      const distSq = Math.max(_direction.lengthSq(), 0.36);
      const distance = Math.sqrt(distSq);
      _direction.multiplyScalar(1 / distance);
      /* The rectangle's normal is horizontal, so the foreshortening is the
         horizontal part of the ray against it. */
      const cosFace = Math.abs(
        _direction.x * this.portals[b + PORTAL_NORMAL] +
          _direction.z * this.portals[b + PORTAL_NORMAL + 2],
      );
      const solidAngle = (area * cosFace) / (distSq * count);
      if (solidAngle <= 0) continue;

      const slot = firstSlot + i * PORTAL_RAY_STRIDE;
      const cache = this.portalRays;
      cache[slot + RAY_SOLID_ANGLE] = solidAngle;
      cache[slot + RAY_DIRECTION] = _direction.x;
      cache[slot + RAY_DIRECTION + 1] = _direction.y;
      cache[slot + RAY_DIRECTION + 2] = _direction.z;

      /* Reaching *through* the opening is not the same as reaching the sky, so
         the trace runs on past the aperture, and far enough past it to find the
         town, and reports what is really out there — the facade opposite, the
         road, the skyline, or nothing at all. See `TRACE_REACH`. */
      const through = this.traceOpaque(physics, origin, _direction, TRACE_REACH, _hit);
      if (through > 0) {
        /* `through` is what the panes this ray crossed passed, and it is the
           only place glazing belongs. The pane, the planks and the shutter
           slats are all real geometry in the collision set, so the trace has
           already met whatever is hung in this hole; a second factor off the
           opening's glazing kind would count it twice. Doing that is what made
           the interiors read as caves — a boarded window is planks 190 mm deep
           across a 1.9 m hole, two-thirds gaps, and it was being multiplied by
           0.06. */
        const escaped = solidAngle * through;
        open += escaped;
        bent.addScaledVector(_direction, escaped);
        /* An escaped ray's radiance is the sky, which the prefiltered probe
           carries and the aperture above scales. Counting it in the harmonics
           as well is how ambient light gets away from you. */
        cache[slot + RAY_SOLID_ANGLE] = 0;
        continue;
      }
      const albedo = this.albedoOf(_hit.object);
      cache[slot + RAY_SOLID_ANGLE] = solidAngle;
      cache[slot + RAY_ALBEDO] = albedo.r;
      cache[slot + RAY_ALBEDO + 1] = albedo.g;
      cache[slot + RAY_ALBEDO + 2] = albedo.b;
      cache[slot + RAY_NORMAL] = _hit.normal.x;
      cache[slot + RAY_NORMAL + 1] = _hit.normal.y;
      cache[slot + RAY_NORMAL + 2] = _hit.normal.z;
      cache[slot + RAY_SUN] = this.sunVisibility(physics);
      cache[slot + RAY_DISTANCE] = _hit.distance;
    }
    return open;
  }

  /**
   * Strikes out the uniform rays aimed through an opening this cell is about to
   * sample properly, so the two estimates do not both count it.
   *
   * One uniform ray carries a twentieth of the sphere, most of a steradian and
   * several times a whole window, so leaving them in would drown the measurement
   * that replaces them — which is the twelve-fold overshoot the old propagation
   * had, arriving by a different road. The test is the exact one: intersect the
   * ray with the rectangle. That catches precisely the rays the portal rays take
   * over, so a cell that also happens to see the sky through a hole in its roof,
   * or out of an opening too small to make the shortlist, keeps both estimates.
   *
   * The solid angle a struck ray was carrying then goes to the survivors rather
   * than out of the budget. At twenty rays to the sphere it is much larger than
   * the openings that displaced it — 0.63 sr against a window's 0.06 — and the
   * rest of it is the room's own walls, which are most of what an interior cell
   * sees. Dropping it wholesale would shave a twentieth off every interior
   * bounce and would do it at random, depending on whether one of twenty fixed
   * directions happened to line up with a window.
   */
  private strikeEscapes(probe: number, rays: number, picked: number): void {
    const base = probe * rays * RAY_STRIDE;
    const px = this.positions[probe * 3];
    const py = this.positions[probe * 3 + 1];
    const pz = this.positions[probe * 3 + 2];
    let struck = 0;
    let taken = 0;
    for (let i = 0; i < picked; i++) {
      const b = _pick[i] * PORTAL_STRIDE;
      const dx = this.portals[b + PORTAL_CENTRE] - px;
      const dy = this.portals[b + PORTAL_CENTRE + 1] - py;
      const dz = this.portals[b + PORTAL_CENTRE + 2] - pz;
      const distSq = Math.max(dx * dx + dy * dy + dz * dz, 0.36);
      const facing = Math.abs(
        (dx * this.portals[b + PORTAL_NORMAL] + dz * this.portals[b + PORTAL_NORMAL + 2]) /
          Math.sqrt(distSq),
      );
      taken +=
        (4 * this.portals[b + PORTAL_HALF_W] * this.portals[b + PORTAL_HALF_H] * facing) / distSq;
    }

    for (let r = 0; r < rays; r++) {
      const slot = base + r * RAY_STRIDE;
      if (this.rayCache[slot + RAY_SOLID_ANGLE] <= 0) continue;
      const dx = this.directions[r * 3];
      const dy = this.directions[r * 3 + 1];
      const dz = this.directions[r * 3 + 2];

      for (let i = 0; i < picked; i++) {
        const b = _pick[i] * PORTAL_STRIDE;
        const nx = this.portals[b + PORTAL_NORMAL];
        const nz = this.portals[b + PORTAL_NORMAL + 2];
        const facing = dx * nx + dz * nz;
        if (Math.abs(facing) < 1e-4) continue;
        const cx = this.portals[b + PORTAL_CENTRE];
        const cy = this.portals[b + PORTAL_CENTRE + 1];
        const cz = this.portals[b + PORTAL_CENTRE + 2];
        const t = ((cx - px) * nx + (cz - pz) * nz) / facing;
        if (t <= 0) continue;
        const hy = py + dy * t - cy;
        if (Math.abs(hy) > this.portals[b + PORTAL_HALF_H]) continue;
        const hu =
          (px + dx * t - cx) * this.portals[b + PORTAL_TANGENT] +
          (pz + dz * t - cz) * this.portals[b + PORTAL_TANGENT + 2];
        if (Math.abs(hu) > this.portals[b + PORTAL_HALF_W]) continue;
        this.rayCache[slot + RAY_SOLID_ANGLE] = 0;
        struck++;
        break;
      }
    }

    if (struck === 0 || struck >= rays) return;
    const share = Math.max(4 * Math.PI - taken, 0) / (rays - struck);
    for (let r = 0; r < rays; r++) {
      const slot = base + r * RAY_STRIDE;
      if (this.rayCache[slot + RAY_SOLID_ANGLE] > 0) this.rayCache[slot + RAY_SOLID_ANGLE] = share;
    }
  }

  /**
   * Moves a probe out of whatever solid it landed in, in place. Returns whether
   * it moved.
   *
   * A regular grid over a level puts a large fraction of its probes inside the
   * ground, inside walls and under floors. Left alone each one reports no sky
   * and no bounce, and trilinear interpolation then drags that darkness up into
   * the open air above it — which is how a lit desert ends up shaded as though
   * it were under a roof. Relocation is the standard answer and it is what makes
   * a coarse grid usable at all.
   *
   * **Deciding a probe is buried is where this goes wrong, not deciding where
   * to put it.** The textbook test is parity — march one way counting surface
   * crossings, and an odd count means the march started inside — and it assumes
   * every solid is closed. The slabs in this level are not: marching up out of
   * a room crosses its ceiling once and meets nothing above, so *every probe in
   * every room* came back odd, and each one was then lifted through the roof
   * into open sky. It kept the grid slot inside the room, so the ceiling under
   * it interpolated against the sky over the building, and the room ended up
   * brighter at the top than at the bottom. That is the inverted interior, and
   * no amount of care about which exit to take fixes it, because the probes
   * being moved were never buried in the first place.
   *
   * What the burial test actually needs is not a crossing count but a distance:
   * a point inside solid has *everything* within arm's reach in nearly every
   * direction, and a point in a room does not. `traceProbe` measures exactly
   * that while it is firing the rays the bounce needs anyway, so this is only
   * ever called on a probe already known to be in trouble. Nothing here depends
   * on the geometry being closed, or watertight, or consistently wound.
   *
   * The exit is then the nearest surface on any axis, with one thumb on the
   * scale: an upward exit has to be clearly nearer than the downward one to be
   * taken, because dropping a slab probe into the room below is harmless and
   * putting it on the roof is the failure this whole note is about.
   */
  private escape(physics: IPhysics, origin: THREE.Vector3): boolean {
    /* Far enough off the surface that the probe is not re-flagged by the face
       it just cleared, but well inside its own cell. */
    const clearance = Math.min(0.55, this.cell.y * 0.4);
    const limit = Math.max(this.cell.x, this.cell.y, this.cell.z) * 1.5;

    let bestAxis = -1;
    let best = Infinity;
    for (let i = 0; i < ESCAPE_DIRS.length; i++) {
      const d = ESCAPE_DIRS[i];
      _direction.set(d[0], d[1], d[2]);
      if (this.traceOpaque(physics, origin, _direction, limit, _hit) > 0) continue;
      /* +y is index 1. Only worth taking if it is a good deal nearer than
         whatever has been found already, which in practice means the probe is
         under a floor rather than over a ceiling. */
      const reach = _hit.distance * (i === 1 ? 1.4 : 1);
      if (reach < best) {
        best = reach;
        bestAxis = i;
      }
    }

    if (bestAxis < 0) return false;
    const d = ESCAPE_DIRS[bestAxis];
    _march.set(d[0], d[1], d[2]);
    _direction.copy(_march);
    if (this.traceOpaque(physics, origin, _direction, limit, _hit) > 0) return false;
    const step = _hit.distance + clearance;
    if (step > limit) return false;
    origin.addScaledVector(_march, step);
    return true;
  }

  /**
   * Fires one probe's rays and records what they found.
   *
   * Openness is the fraction of the **whole sphere** that escapes, not of the
   * upper hemisphere. Restricting it upward was wrong in the one case the
   * volume exists for: a room lit through a window in a wall escapes along
   * near-horizontal rays, and measuring only upward ones reports a sealed box.
   * A point in the open now reads 0.5 rather than 1, and the shader's cone
   * model turns that back into full irradiance for an up-facing surface — see
   * `lgtSkyAperture`, which is where the normalisation belongs.
   *
   * The bent normal likewise averages every escape rather than the upward ones,
   * which is what makes it a portal direction indoors instead of a formality.
   *
   * Returns whether the probe is inside solid, which falls out of the same rays
   * — see `BURIED_NEAR`. Measuring it here rather than testing for it up front
   * is what lets the test be a distance rather than a parity count.
   */
  private traceProbe(
    physics: IPhysics,
    probe: number,
    origin: THREE.Vector3,
    rays: number,
  ): boolean {
    const base = probe * rays * RAY_STRIDE;
    /* Every direction on the sphere is equally likely, so each ray stands for
       the same slice of it. Portal rays carry their own. */
    const solidAngle = (4 * Math.PI) / rays;
    let open = 0;
    let blocked = 0;
    _bent.set(0, 0, 0);

    /* Anything left over from a previous attempt at this probe. */
    this.rayCache.fill(0, base, base + rays * RAY_STRIDE);

    for (let r = 0; r < rays; r++) {
      const dx = this.directions[r * 3];
      const dy = this.directions[r * 3 + 1];
      const dz = this.directions[r * 3 + 2];
      _direction.set(dx, dy, dz);
      const slot = base + r * RAY_STRIDE;
      this.rayCache[slot + RAY_SOLID_ANGLE] = solidAngle;

      const through = this.traceOpaque(physics, origin, _direction, TRACE_REACH, _hit);
      if (through > 0) {
        /* A miss is stored as a black albedo, which is also the relight's skip
           test — an escaped ray contributes sky, and the sky is the prefiltered
           probe's job, not this one's. */
        /* A ray out through a window counts for what the window passes, so a
           glazed room is dimmer than an open arch and both are open. */
        open += through;
        _bent.x += dx * through;
        _bent.y += dy * through;
        _bent.z += dz * through;
        continue;
      }

      if (_hit.distance < BURIED_NEAR) blocked++;

      const albedo = this.albedoOf(_hit.object);
      this.rayCache[slot + RAY_ALBEDO] = albedo.r;
      this.rayCache[slot + RAY_ALBEDO + 1] = albedo.g;
      this.rayCache[slot + RAY_ALBEDO + 2] = albedo.b;
      this.rayCache[slot + RAY_NORMAL] = _hit.normal.x;
      this.rayCache[slot + RAY_NORMAL + 1] = _hit.normal.y;
      this.rayCache[slot + RAY_NORMAL + 2] = _hit.normal.z;
      this.rayCache[slot + RAY_SUN] = this.sunVisibility(physics);
      /* The ambient reaching the bounce surface needs the finished visibility
         volume, so it is filled in by the gather phase, off this distance. */
      this.rayCache[slot + RAY_DISTANCE] = _hit.distance;
    }

    const v = probe * 4;
    if (_bent.lengthSq() < 1e-8) _bent.set(0, 1, 0);
    else _bent.normalize();
    this.visibility[v] = _bent.x;
    this.visibility[v + 1] = _bent.y;
    this.visibility[v + 2] = _bent.z;
    this.visibility[v + 3] = open / rays;

    return blocked > rays * BURIED_FRACTION;
  }

  /**
   * One shadow ray from the bounce point, using the *baking* sun. Cached, so a
   * later relight only pays for the projection.
   */
  private sunVisibility(physics: IPhysics): number {
    const sun = this.bakeSun;
    if (sun.y <= 0.02) return 0;
    if (_hit.normal.dot(sun) <= 0) return 0;
    _hitPoint.copy(_hit.point).addScaledVector(_hit.normal, 0.05);
    /* Through the glazing, for the same reason the cascades are: a sunlit patch
       of floor inside a window is the brightest thing in the room and the only
       source the ceiling above it has. */
    return this.traceOpaque(physics, _hitPoint, sun, 80, _shadowHit);
  }

  private albedoOf(object: THREE.Object3D): THREE.Color {
    return surfaceAlbedo(this.renderer, object, _color);
  }

  /**
   * Fills probes that landed inside geometry from their neighbours — from the
   * *darkest* of them, and keeping its direction.
   *
   * This is where the reported inversion actually came from, and it is worth
   * setting out, because the fix that caused it was a good one. Probes buried
   * in solid report no sky, and left at zero they drag the interpolation dark
   * for every surface near a wall, so they are filled from their neighbourhood
   * instead. Averaging the neighbourhood is the obvious way to do it and it is
   * wrong at exactly the place it matters: a probe inside an external wall has
   * the room on one side and the street on the other, so the average is half
   * the street. Measured in the café that ships in this level, probes inside
   * the wall at ceiling height came back at 0.07 and 0.12 of the sphere open,
   * against 0.0015 for the room they border, and with the bent normal left at
   * the zenith from the trace that failed. The ceiling under them interpolated
   * against that, its downward normal sat squarely in a cone aimed at the sky,
   * and it came out ten times the floor. Every metre of ceiling in the level
   * within a cell of an external wall had a hole in the roof over it.
   *
   * Taking the minimum instead is the conservative reading of an ambiguous
   * cell, and it is the correct one here: a probe inside a wall genuinely
   * cannot see what the street can, and the room it borders is the brightest
   * thing it has any business reporting. Carrying that neighbour's bent normal
   * across with it matters just as much — a magnitude with the zenith attached
   * to it is what turned a small leak into an inverted room.
   */
  private dilate(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const p = ix + nx * (iy + ny * iz);
          if (this.visibility[p * 4 + 3] >= 0) continue;
          let best = Infinity;
          let from = -1;
          for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
              for (let c = -1; c <= 1; c++) {
                const jx = ix + a;
                const jy = iy + b;
                const jz = iz + c;
                if (jx < 0 || jy < 0 || jz < 0 || jx >= nx || jy >= ny || jz >= nz) continue;
                const q = jx + nx * (jy + ny * jz);
                const value = this.visibility[q * 4 + 3];
                if (value < 0 || value >= best) continue;
                best = value;
                from = q;
              }
            }
          }
          if (from < 0) {
            this.visibility[p * 4 + 3] = 0;
            continue;
          }
          this.visibility[p * 4] = this.visibility[from * 4];
          this.visibility[p * 4 + 1] = this.visibility[from * 4 + 1];
          this.visibility[p * 4 + 2] = this.visibility[from * 4 + 2];
          this.visibility[p * 4 + 3] = best;
        }
      }
    }
  }

  /* ------------------------------ gathering ------------------------------ */

  /**
   * Second pass over the cached rays: resolves how much sky each bounce surface
   * receives, now that the visibility volume it needs is complete.
   */
  private runGather(deadline: number): void {
    const rays = this.directions.length / 3;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      /* The relocated origin, not the grid corner: the rays were fired from
         there, so the bounce points are measured from there. */
      const px = this.positions[p * 3];
      const py = this.positions[p * 3 + 1];
      const pz = this.positions[p * 3 + 2];

      const resolve = (
        cache: Float32Array,
        slot: number,
        dx: number,
        dy: number,
        dz: number,
      ): void => {
        if (cache[slot + RAY_ALBEDO] + cache[slot + RAY_ALBEDO + 1] + cache[slot + RAY_ALBEDO + 2] <= 0) return;
        const distance = cache[slot + RAY_DISTANCE];
        const nrx = cache[slot + RAY_NORMAL];
        const nry = cache[slot + RAY_NORMAL + 1];
        const nrz = cache[slot + RAY_NORMAL + 2];
        /* Lift the sample off the surface so the reading is the room the wall
           faces into, not the solid it belongs to. */
        _normal.set(nrx, nry, nrz);
        this.sampleVisibility(
          px + dx * distance + nrx * 0.35,
          py + dy * distance + nry * 0.35,
          pz + dz * distance + nrz * 0.35,
          _sample,
          _normal,
        );
        cache[slot + RAY_AMBIENT] = apertureOf(_sample, nrx, nry, nrz) * Math.PI;
      };

      const base = p * rays * RAY_STRIDE;
      for (let r = 0; r < rays; r++) {
        resolve(
          this.rayCache, base + r * RAY_STRIDE,
          this.directions[r * 3], this.directions[r * 3 + 1], this.directions[r * 3 + 2],
        );
      }
      const home = this.portalSlot[p];
      if (home >= 0) {
        const pbase = home * PORTAL_RAYS * PORTAL_RAY_STRIDE;
        for (let r = 0; r < PORTAL_RAYS; r++) {
          const slot = pbase + r * PORTAL_RAY_STRIDE;
          resolve(
            this.portalRays, slot,
            this.portalRays[slot + RAY_DIRECTION],
            this.portalRays[slot + RAY_DIRECTION + 1],
            this.portalRays[slot + RAY_DIRECTION + 2],
          );
        }
      }

      this.cursor++;
      if ((this.cursor & 15) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.ready = true;
    this.phase = 'idle';
    this.pendingRelight = true;
  }

  /* ------------------------------ projecting ----------------------------- */

  private runProject(deadline: number): void {
    const rays = this.directions.length / 3;
    const invPi = 1 / Math.PI;
    const sun = this.relightSun;
    const sky = this.relightSky;
    const dir = this.relightDirection;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const shBase = p * SH_COEFFS * 3;

      /**
       * Projects one cached ray. The weight is the solid angle the ray stands
       * for, which for a uniform ray is its equal share of the sphere and for
       * a portal ray is the slice of the opening it sampled — the whole point
       * of aiming them, and the only place the two kinds differ.
       */
      const project = (
        cache: Float32Array,
        slot: number,
        basis: Float32Array,
        basisBase: number,
      ): void => {
        const ar = cache[slot + RAY_ALBEDO];
        const ag = cache[slot + RAY_ALBEDO + 1];
        const ab = cache[slot + RAY_ALBEDO + 2];
        if (ar + ag + ab <= 0) return;
        const weight = cache[slot + RAY_SOLID_ANGLE];
        if (weight <= 0) return;

        /* Sun visibility is a fraction, not a flag: a bounce surface seen
           through a window is lit by what the glazing passes. */
        const sunVis = cache[slot + RAY_SUN];
        const NdotL =
          sunVis > 0
            ? sunVis *
              Math.max(
                cache[slot + RAY_NORMAL] * dir.x +
                  cache[slot + RAY_NORMAL + 1] * dir.y +
                  cache[slot + RAY_NORMAL + 2] * dir.z,
                0,
              )
            : 0;
        const ambient = cache[slot + RAY_AMBIENT];

        /* Radiance leaving the bounce surface toward this probe: the irradiance
           it receives, times its albedo, over pi for a Lambertian. */
        const lr = ar * (sun.r * NdotL + sky.r * ambient) * invPi * weight;
        const lg = ag * (sun.g * NdotL + sky.g * ambient) * invPi * weight;
        const lb = ab * (sun.b * NdotL + sky.b * ambient) * invPi * weight;
        if (lr + lg + lb <= 0) return;

        for (let c = 0; c < SH_COEFFS; c++) {
          const b = basis[basisBase + c];
          const out = shBase + c * 3;
          this.sh[out] += lr * b;
          this.sh[out + 1] += lg * b;
          this.sh[out + 2] += lb * b;
        }
      };

      const base = p * rays * RAY_STRIDE;
      for (let r = 0; r < rays; r++) {
        project(this.rayCache, base + r * RAY_STRIDE, this.basis, r * SH_COEFFS);
      }
      const home = this.portalSlot[p];
      if (home >= 0) {
        const pbase = home * PORTAL_RAYS * PORTAL_RAY_STRIDE;
        for (let r = 0; r < PORTAL_RAYS; r++) {
          const slot = pbase + r * PORTAL_RAY_STRIDE;
          if (this.portalRays[slot + RAY_SOLID_ANGLE] <= 0) continue;
          shBasis(
            this.portalRays[slot + RAY_DIRECTION],
            this.portalRays[slot + RAY_DIRECTION + 1],
            this.portalRays[slot + RAY_DIRECTION + 2],
            _basis,
            0,
          );
          project(this.portalRays, slot, _basis, 0);
        }
      }

      this.cursor++;
      if ((this.cursor & 15) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.shSpread.fill(0);
    /* Denoise first, then dilate. The other way round undoes itself: the
       dilation gives a cell inside a wall its room's value, and the blur then
       averages it straight back up against the cells either side of it in the
       same wall. Measured in the café, wall cells the dilation had brought down
       to 0.007 came out of the blur at 0.052. Dilating last also means the
       value a wall cell ends up with is the *smoothed* room value, which is the
       better one. */
    this.denoiseInterior();
    this.dilateHarmonics();
    this.roomAlbedo(this.transfer);
    this.stats.reflectance =
      `${this.transfer.r.toFixed(2)}, ${this.transfer.g.toFixed(2)}, ${this.transfer.b.toFixed(2)}`;
    this.cursor = 0;
    this.phase = 'bounce';
  }

  /**
   * Shares each interior cell's harmonics with the cells it shares a room with.
   *
   * This is variance reduction, not transport, and it is worth being clear which
   * because the two want different justifications. What the portal rays are
   * estimating is dominated by a very small, very bright target: traced densely,
   * the warm patch that lights the café — the sunlit upper storeys across the
   * street, seen through a window — subtends about a thousandth of the sphere,
   * and a single ray landing on it accounts for the whole measurement. Sixteen
   * rays through an opening therefore either find it or do not, and the result
   * was a floor with one cell reading 0.035 and its neighbour 0.0006. Averaged
   * over the room the estimate was three times under the dense trace; the mean
   * was being carried by the few cells that got lucky.
   *
   * The field being estimated does not have that structure. Two cells two metres
   * apart in the same room receive very nearly the same light through the same
   * openings, so the difference between them is the estimator's noise and not the
   * scene's. Averaging across the link — never through a wall, since the link is
   * the measured clear fraction of the face between them — trades resolution the
   * grid does not have for variance it cannot otherwise afford. The one thing
   * this would blur that is real is the hard edge of a sun shaft, and that edge
   * is drawn by the shadow cascades at pixel resolution rather than by anything
   * here.
   */
  /**
   * Refills the harmonics of cells whose grid slot is inside solid from their
   * dimmest neighbour, the way `dilate` does for sky visibility.
   *
   * This is the blue wall the review reported, and it is the same mistake as the
   * inverted ceiling one level down. A cell inside an external wall is
   * relocated, relocation moves it a few centimetres, and it is still inside the
   * wall — so its rays hit the masonry around it at point-blank range, and one
   * side of that masonry is the sunlit or sky-lit outer face. Measured in the
   * café, cells inside its right-hand wall came back with DC coefficients twenty
   * to eighty times the room's, tinted by whatever the street throws at that
   * face. Nothing then keeps them out of the room: the trilinear read at a point
   * 0.5 m off the inside of that wall gives the cell in the wall more than half
   * the weight, so the plaster was shaded almost entirely by a probe buried in
   * it. Sky-lit, so blue — and only on the wall with the street behind it, which
   * is why one wall was blue and the wall opposite was not.
   *
   * Taking the dimmest neighbour is the conservative reading of a cell that has
   * no honest value of its own, and it is the right one for the same reason it
   * was right for visibility: a point inside a wall cannot see what the street
   * sees, and the room it borders is the brightest thing it has any business
   * reporting. Whole records rather than the DC term alone, so the direction
   * comes across with the magnitude.
   *
   * Only *enclosed* neighbours are eligible, which is the part that has to be
   * got right. Restricting the search to cells that are themselves clear of
   * solid sounds like the careful choice and is the opposite: at ceiling height
   * almost every cell in a building has been relocated out of a slab, so the
   * only candidates left are the ones in the street outside, and the pass then
   * spends its time importing the street into the walls — measured in the café,
   * one cell in its right-hand wall went from nothing to eighty times the room.
   * A cell that has been relocated into a room is a perfectly good source; what
   * disqualifies a neighbour is being outdoors. Reading from a snapshot keeps
   * that order-independent, so a run of cells through a wall cannot pass a value
   * along from one side to the other.
   */
  private dilateHarmonics(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const width = SH_COEFFS * 3;
    const traced = this.sh.slice();

    for (let p = 0; p < this.probeCount; p++) {
      if (!this.interred[p]) continue;
      const ix = p % nx;
      const iy = Math.floor(p / nx) % ny;
      const iz = Math.floor(p / (nx * ny));

      let best = Infinity;
      let from = -1;
      for (let axis = 0; axis < 3; axis++) {
        const limit = axis === 0 ? nx : axis === 1 ? ny : nz;
        const index = axis === 0 ? ix : axis === 1 ? iy : iz;
        const stride = axis === 0 ? 1 : axis === 1 ? nx : nx * ny;
        for (let side = -1; side <= 1; side += 2) {
          if (index + side < 0 || index + side >= limit) continue;
          const q = p + side * stride;
          if (this.portalSlot[q] < 0) continue;
          /* Ranked on the DC term, which is the isotropic part and so the one
             quantity of a harmonic that is unambiguously a brightness. */
          const dc = traced[q * width] + traced[q * width + 1] + traced[q * width + 2];
          if (dc >= best) continue;
          best = dc;
          from = q;
        }
      }
      if (from < 0) continue;
      const base = p * width;
      const source = from * width;
      for (let c = 0; c < width; c++) this.sh[base + c] = traced[source + c];
    }
  }

  /**
   * How much of a neighbour's light belongs to this cell, on the evidence of
   * how differently the two of them see the sky.
   *
   * Both the blur and the interreflection rest on the same claim: two cells two
   * metres apart in one room receive very nearly the same light, so the
   * difference between them is the estimator's noise rather than the scene's.
   * There is one place in a room where that claim is flatly false, and it is the
   * place that decides how the room reads — a cell standing *in* a window.
   *
   * Such a cell is not buried and it is not outdoors, so nothing else here
   * disqualifies it: its openness is a few hundredths, under the threshold that
   * makes a cell interior, and it holds the radiance of the sunlit street at
   * point-blank range. Measured in the café, cells in its window apertures came
   * back at 0.17 and 0.72 DC against the room's 0.007 — a hundredfold — and both
   * passes were dutifully averaging them into the room as though they were more
   * samples of the same quantity. What arrives through an opening is the portal
   * rays' measurement to make, from cells that are actually in the room.
   *
   * Openness separates the two cleanly and by two orders of magnitude, so the
   * ratio of them is the weight, with a floor low enough that the room's own
   * cells — hundredths of a percent open, and differing among themselves by
   * factors of ten at those magnitudes — still pool freely with each other.
   */
  private pooling(mine: number, other: number): number {
    const theirs = Math.max(this.visibility[other * 4 + 3], 0) + POOL_FLOOR;
    return theirs <= mine ? 1 : mine / theirs;
  }

  private denoiseInterior(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const width = SH_COEFFS * 3;
    const smoothed = new Float32Array(this.sh.length);
    const openness = this.visibility;

    /* Two sweeps rather than one. A single six-neighbour average pools seven
       cells, which at forty rays an opening is still not enough to hold a room
       together; two reaches a cell either side and pools about nineteen, and the
       radius is still under the four metres across which a room's incident field
       genuinely is flat. A third would start averaging the front of a room with
       the back of it, which is the one gradient here that is real. */
    for (let sweep = 0; sweep < 2; sweep++) {
      for (let p = 0; p < this.probeCount; p++) {
        const base = p * width;
        if (this.portalSlot[p] < 0 || this.interred[p]) {
          /* Exterior and solid cells keep what they traced. An open cell fired
             every one of its rays at what lights it and needs no help; letting
             the street average with the room is how a wall stops being a wall.
             A cell inside a wall is left alone because the dilation is about to
             replace it outright, and averaging it first only spreads it. */
          for (let c = 0; c < width; c++) smoothed[base + c] = this.sh[base + c];
          continue;
        }

        const ix = p % nx;
        const iy = Math.floor(p / nx) % ny;
        const iz = Math.floor(p / (nx * ny));
        /* Its own estimate at unit weight and each neighbour's at the clear
           fraction of the face between them, so a cell in the middle of a room
           averages six ways and one in a corner barely moves. */
        let weight = 1;
        const mine = Math.max(openness[p * 4 + 3], 0) + POOL_FLOOR;
        for (let c = 0; c < width; c++) smoothed[base + c] = this.sh[base + c];

        for (let axis = 0; axis < 3; axis++) {
          const limit = axis === 0 ? nx : axis === 1 ? ny : nz;
          const index = axis === 0 ? ix : axis === 1 ? iy : iz;
          const stride = axis === 0 ? 1 : axis === 1 ? nx : nx * ny;
          for (let side = -1; side <= 1; side += 2) {
            if (index + side < 0 || index + side >= limit) continue;
            const q = p + side * stride;
            if (this.portalSlot[q] < 0 || this.interred[q]) continue;
            const link = this.links[(side > 0 ? p : q) * 3 + axis] * this.pooling(mine, q);
            if (link <= 0) continue;
            const qBase = q * width;
            for (let c = 0; c < width; c++) smoothed[base + c] += this.sh[qBase + c] * link;
            weight += link;
          }
        }

        const scale = 1 / weight;
        for (let c = 0; c < width; c++) smoothed[base + c] *= scale;
      }
      this.sh.set(smoothed);
    }
  }

  /* ------------------------------ spreading ------------------------------ */

  /**
   * Mean reflectance of the surfaces enclosed cells can see, per channel.
   *
   * This is the transfer the carry runs at, and it is measured rather than
   * chosen. With the incoming light averaged over a cell's open faces, the
   * steady state of a run of cells fed from one boundary is `T / (1 - T)`
   * times what crosses that boundary — so `T` *is* the interreflection
   * multiplier, and the interreflection multiplier of a room is its own
   * reflectance. Setting it to anything else is asserting that the plaster is
   * brighter or darker than the bake just measured it to be.
   *
   * It is worth being exact about the size of that. The value here came out at
   * a shade under a third; the constant it replaces was 0.88, which is a room
   * lined in fresh snow, and it multiplied the light entering the cafe by
   * fifteen times more than the surfaces in it can return. That is most of why
   * interiors read milky.
   *
   * Per channel and not a scalar, because a room's colour comes from exactly
   * this: light that has bounced three times off ochre plaster is ochre, and
   * the difference between a warm interior and a neutral one is whether the
   * bounces are allowed to tint each other. Only rays cast from enclosed cells
   * count, so it is the room's own surfaces and not the street's.
   */
  private roomAlbedo(out: THREE.Color): THREE.Color {
    const rays = this.directions.length / 3;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let p = 0; p < this.probeCount; p++) {
      if (this.portalSlot[p] < 0) continue;
      const base = p * rays * RAY_STRIDE;
      for (let i = 0; i < rays; i++) {
        const slot = base + i * RAY_STRIDE;
        const sum =
          this.rayCache[slot + RAY_ALBEDO] +
          this.rayCache[slot + RAY_ALBEDO + 1] +
          this.rayCache[slot + RAY_ALBEDO + 2];
        if (sum <= 0) continue;
        r += this.rayCache[slot + RAY_ALBEDO];
        g += this.rayCache[slot + RAY_ALBEDO + 1];
        b += this.rayCache[slot + RAY_ALBEDO + 2];
        n++;
      }
    }
    /* No enclosed cell in the level, or none that hit anything: the solve has
       nothing to do, and the bound keeps it from being a divide by zero. */
    if (n === 0) return out.setRGB(BOUNCE_MIN, BOUNCE_MIN, BOUNCE_MIN);
    const clamp = (v: number): number => THREE.MathUtils.clamp(v / n, BOUNCE_MIN, BOUNCE_MAX);
    return out.setRGB(clamp(r), clamp(g), clamp(b));
  }

  /**
   * Sphere-averaged irradiance a cell holds: the direct field it traced plus
   * whatever the interreflection has put into it so far.
   *
   * Averaged over the sphere rather than read for a normal, because that is
   * what the interreflected term is. Light that has bounced twice off the
   * plaster has no memory of the window, and the mean of a harmonic over every
   * direction is just its DC coefficient.
   */
  private meanIrradiance(probe: number, out: THREE.Color): THREE.Color {
    const base = probe * SH_COEFFS * 3;
    return out.setRGB(
      Math.max((this.sh[base] + this.shSpread[base]) * ISO_IRRADIANCE, 0),
      Math.max((this.sh[base + 1] + this.shSpread[base + 1]) * ISO_IRRADIANCE, 0),
      Math.max((this.sh[base + 2] + this.shSpread[base + 2]) * ISO_IRRADIANCE, 0),
    );
  }

  /**
   * Irradiance the grid says a surface at `x,y,z` facing `n` is receiving.
   *
   * The same quantity the shader will read there, computed the same way, which
   * is what makes the bounce a solve of the field the frame will actually show
   * rather than of a private one. Two differences, both deliberate:
   *
   * Nearest cell rather than trilinear. The read happens twenty times per cell
   * per sweep and the answer is about to be smeared over a whole patch of wall
   * anyway; interpolating it would cost eight times as much to move the result
   * by less than the ray count's own noise.
   *
   * Half a cell along the normal first, as the shader does. Without it a wall
   * reads the cell buried in the masonry it is the skin of, which after the
   * dilation holds the room's value and after that holds nothing much — either
   * way it is the one place the grid has no measurement.
   */
  private gridIrradiance(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    out: THREE.Color,
  ): THREE.Color {
    const ix = THREE.MathUtils.clamp(
      Math.round((x + nx * this.cell.x * 0.5 - this.origin.x) / this.cell.x),
      0, this.resolution.x - 1,
    );
    const iy = THREE.MathUtils.clamp(
      Math.round((y + ny * this.cell.y * 0.5 - this.origin.y) / this.cell.y),
      0, this.resolution.y - 1,
    );
    const iz = THREE.MathUtils.clamp(
      Math.round((z + nz * this.cell.z * 0.5 - this.origin.z) / this.cell.z),
      0, this.resolution.z - 1,
    );
    const base = (ix + this.resolution.x * (iy + this.resolution.y * iz)) * SH_COEFFS * 3;

    shBasis(nx, ny, nz, _basis, 0);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let c = 0; c < SH_COEFFS; c++) {
      const w = _basis[c] * SH_CONVOLVE[c];
      const at = base + c * 3;
      r += (this.sh[at] + this.shSpread[at]) * w;
      g += (this.sh[at + 1] + this.shSpread[at + 1]) * w;
      b += (this.sh[at + 2] + this.shSpread[at + 2]) * w;
    }
    /* The L2 fit of a field dominated by one bright opening rings, and a ring
       that goes negative is not a surface that emits darkness. */
    return out.setRGB(Math.max(r, 0), Math.max(g, 0), Math.max(b, 0));
  }

  /* --------------------------- interreflection --------------------------- */

  /**
   * The light a room throws around inside itself, gathered along the rays the
   * trace already cast.
   *
   * What the portal rays measure is the light arriving *straight through the
   * opening*. In a room with a reflectance of a third, that is only two thirds
   * of what a surface actually receives: the rest has bounced off the walls
   * one or more times on the way. Leaving it out is not a small error — it is
   * the difference between a room with a lit patch under the window and black
   * everywhere else, and a room.
   *
   * ## Why this is a gather and not a diffusion
   *
   * The obvious cheap solve is to average each cell's irradiance with its six
   * neighbours' and scale by the reflectance, which has the right fixed point:
   * a cell whose neighbours hold what it holds settles at
   * `E = rho * (D + E)`, the interreflection multiplier of a room. It shipped
   * that way and it is wrong for a reason worth writing down, because the
   * error is invisible in the fixed point and enormous in the level.
   *
   * A six-neighbour average is a *diffusion*, and a diffusion has a length.
   * Expanding it gives a screened Poisson equation whose screening length is
   * `h * sqrt(rho / (7 * (1 - rho)))` — at this level's 2 m cells and measured
   * third of a reflectance, **half a metre**. So the solve moved interreflected
   * light half a metre from wherever it landed and no further, and a café
   * thirteen metres deep got a faint smear inside each window and black
   * everywhere else. Measured against a six-thousand-ray reference at the
   * room's centre, the whole estimate came back at a seventh of the truth.
   * Light in a room does not diffuse: it crosses the room in one bounce. The
   * mean chord of this café is 3.7 m, so *most* of a bounce lands somewhere a
   * six-neighbour stencil cannot reach at any number of sweeps.
   *
   * Gathering along the cached rays has no length at all. Each cell already
   * knows what it can see in twenty directions and how far away it is, because
   * the trace measured exactly that, so a sweep asks the grid how lit each of
   * those patches is, multiplies by the patch's own albedo, and projects the
   * result back into harmonics from the direction it came from. That is one
   * Neumann term of the transport operator per sweep, with the visibility
   * carried exactly — a ray stops at a wall, so nothing crosses one.
   *
   * ## Why it is safe to keep the direction this time
   *
   * Earlier attempts at a directional bounce all inverted the floor and the
   * ceiling, and it is the same cause every time: they carried a direction
   * *along* with the magnitude as it was blended from cell to cell, and a
   * direction that has been averaged a dozen times is not a measurement of
   * anything — it lands wherever the arithmetic drifts. Nothing is blended
   * here. Every sweep re-measures the direction from the geometry, and the
   * only thing that persists between sweeps is a scalar per patch. Direction
   * cannot drift because it is never propagated.
   *
   * And keeping it is the whole point, because it is what puts the room the
   * right way up. Light through an opening at this sun angle arrives from
   * above the horizon — the strongest portal rays in the café point up at the
   * sunlit storeys opposite — so it travels *downward* and lands on the floor
   * and the lower half of the wall facing the window. The ceiling sees none of
   * it directly and gets only what the floor sends back, which is the floor's
   * irradiance times the floor's albedo. The ratio between them settles near
   * `1 / rho` instead of at 1, which is the ratio a real room has and the one
   * the isotropic solve destroyed by construction.
   */
  private runBounce(deadline: number): void {
    const rays = this.directions.length / 3;
    const total = this.probeCount * BOUNCE_SWEEPS;
    const invPi = 1 / Math.PI;
    const width = SH_COEFFS * 3;

    while (this.cursor < total) {
      const p = this.cursor % this.probeCount;
      const base = p * width;
      for (let c = 0; c < width; c++) this.shSpreadNext[base + c] = 0;

      /* Open air and solid alike are left at zero: an exterior cell already
         traced everything that reaches it, and a cell that is still inside a
         wall after the escape has no rays to gather along. */
      if (this.portalSlot[p] >= 0) {
        const px = this.positions[p * 3];
        const py = this.positions[p * 3 + 1];
        const pz = this.positions[p * 3 + 2];
        const rayBase = p * rays * RAY_STRIDE;

        for (let r = 0; r < rays; r++) {
          const slot = rayBase + r * RAY_STRIDE;
          const omega = this.rayCache[slot + RAY_SOLID_ANGLE];
          if (omega <= 0) continue;
          const ar = this.rayCache[slot + RAY_ALBEDO];
          const ag = this.rayCache[slot + RAY_ALBEDO + 1];
          const ab = this.rayCache[slot + RAY_ALBEDO + 2];
          /* No albedo means the ray left the level, and sky is the direct
             term's business. Zero solid angle above means it went out through
             an opening, which is the portal rays'. */
          if (ar + ag + ab <= 0) continue;

          const distance = this.rayCache[slot + RAY_DISTANCE];
          const nrx = this.rayCache[slot + RAY_NORMAL];
          const nry = this.rayCache[slot + RAY_NORMAL + 1];
          const nrz = this.rayCache[slot + RAY_NORMAL + 2];
          this.gridIrradiance(
            px + this.directions[r * 3] * distance,
            py + this.directions[r * 3 + 1] * distance,
            pz + this.directions[r * 3 + 2] * distance,
            nrx, nry, nrz, _irradiance,
          );

          /* Radiance leaving that patch: what it receives, times its own
             albedo, over pi. The direct pass has already counted the sun and
             the sky reaching it, so this is strictly the light it got from the
             rest of the room. */
          const lr = ar * _irradiance.r * invPi * omega;
          const lg = ag * _irradiance.g * invPi * omega;
          const lb = ab * _irradiance.b * invPi * omega;
          if (lr + lg + lb <= 0) continue;

          const basisBase = r * SH_COEFFS;
          for (let c = 0; c < SH_COEFFS; c++) {
            const w = this.basis[basisBase + c];
            const out = base + c * 3;
            this.shSpreadNext[out] += lr * w;
            this.shSpreadNext[out + 1] += lg * w;
            this.shSpreadNext[out + 2] += lb * w;
          }
        }
      }

      this.cursor++;
      /* Jacobi rather than in place, so a sweep is exactly one bounce however
         the loop happens to run. */
      if (this.cursor % this.probeCount === 0) this.shSpread.set(this.shSpreadNext);
      if ((this.cursor & 31) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / total;
    if (this.cursor < total) return;

    this.uploadSH();
    this.phase = 'idle';
  }

  /**
   * Reads the baked visibility exactly as `lgtSkyVisibility` does.
   *
   * Passing a surface normal weights the eight corners by whether the surface
   * can see them, which is what keeps a ceiling from reading the sky above its
   * slab. The bake needs the same read the shader will make: the bounce it
   * records is the light arriving at surfaces the shader lights independently,
   * and a probe that thinks a ceiling is open while the shader thinks it is
   * shut hands the room a bounce that does not belong to it.
   */
  sampleVisibility(
    x: number,
    y: number,
    z: number,
    out: THREE.Vector4,
    normal?: { x: number; y: number; z: number },
  ): THREE.Vector4 {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const fx = THREE.MathUtils.clamp((x - this.origin.x) / this.cell.x, 0, nx - 1);
    const fy = THREE.MathUtils.clamp((y - this.origin.y) / this.cell.y, 0, ny - 1);
    const fz = THREE.MathUtils.clamp((z - this.origin.z) / this.cell.z, 0, nz - 1);
    const ix = Math.min(Math.floor(fx), nx - 1);
    const iy = Math.min(Math.floor(fy), ny - 1);
    const iz = Math.min(Math.floor(fz), nz - 1);
    const jx = Math.min(ix + 1, nx - 1);
    const jy = Math.min(iy + 1, ny - 1);
    const jz = Math.min(iz + 1, nz - 1);
    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;

    const alongX = normal ? Math.abs(normal.x) : 1;
    const alongY = normal ? Math.abs(normal.y) : 1;
    const alongZ = normal ? Math.abs(normal.z) : 1;
    /* Cubed across the surface, linear along it; see `lgtSkyVisibility`. */
    const sharpen = (t: number, along: number): number => t * t * t + (t - t * t * t) * along;

    /* Openness of the cell the point stands in, which corners far brighter
       than are suppressed against; see `lgtSkyVisibility`. */
    const home =
      (Math.min(Math.round(fx), nx - 1) +
        nx * (Math.min(Math.round(fy), ny - 1) + ny * Math.min(Math.round(fz), nz - 1))) * 4;
    const mine = Math.max(this.visibility[home + 3], POOL_FLOOR_VIS);

    out.set(0, 0, 0, 0);
    let total = 0;
    for (let c = 0; c < 8; c++) {
      let w =
        sharpen(c & 1 ? tx : 1 - tx, alongX) *
        sharpen(c & 2 ? ty : 1 - ty, alongY) *
        sharpen(c & 4 ? tz : 1 - tz, alongZ);
      if (w <= 0) continue;
      const cx = c & 1 ? jx : ix;
      const cy = c & 2 ? jy : iy;
      const cz = c & 4 ? jz : iz;
      if (normal) {
        const dx = this.origin.x + cx * this.cell.x - x;
        const dy = this.origin.y + cy * this.cell.y - y;
        const dz = this.origin.z + cz * this.cell.z - z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const facing = (dx * normal.x + dy * normal.y + dz * normal.z) / len;
        const half = 0.5 + 0.5 * facing;
        w *= Math.max(half * half, 1e-4);
      }
      const p = (cx + nx * (cy + ny * cz)) * 4;
      w *= Math.min(mine / Math.max(this.visibility[p + 3], POOL_FLOOR_VIS), 1);
      if (w <= 0) continue;
      out.x += this.visibility[p] * w;
      out.y += this.visibility[p + 1] * w;
      out.z += this.visibility[p + 2] * w;
      out.w += this.visibility[p + 3] * w;
      total += w;
    }
    if (total > 0) out.multiplyScalar(1 / total);
    else out.set(0, 1, 0, 0.5);
    return out;
  }

  /* ------------------------------ textures ------------------------------- */

  private buildTextures(): void {
    this.visibilityTexture?.dispose();
    this.shTexture?.dispose();

    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;

    /* Neutral until the first trace lands: fully open sky, no bounce. Openness
       is a fraction of the whole sphere, so open ground is 0.5, not 1 — the
       shader's cone model turns that back into full irradiance for an
       upward-facing surface. Materials compile against the volume from the
       first frame, so it must never be missing: a texture appearing later would
       recompile every shader in the scene. */
    for (let p = 0; p < this.probeCount; p++) {
      this.visibility[p * 4] = 0;
      this.visibility[p * 4 + 1] = 1;
      this.visibility[p * 4 + 2] = 0;
      this.visibility[p * 4 + 3] = 0.5;
    }

    const visibility = new THREE.Data3DTexture(this.visibilityBytes, nx, ny, nz);
    visibility.format = THREE.RGBAFormat;
    visibility.type = THREE.UnsignedByteType;
    visibility.minFilter = THREE.LinearFilter;
    visibility.magFilter = THREE.LinearFilter;
    visibility.wrapS = THREE.ClampToEdgeWrapping;
    visibility.wrapT = THREE.ClampToEdgeWrapping;
    visibility.wrapR = THREE.ClampToEdgeWrapping;
    visibility.needsUpdate = true;
    this.visibilityTexture = visibility;

    const sh = new THREE.Data3DTexture(this.shData, nx, ny, 7 * (nz + 2));
    sh.format = THREE.RGBAFormat;
    sh.type = THREE.HalfFloatType;
    sh.minFilter = THREE.LinearFilter;
    sh.magFilter = THREE.LinearFilter;
    sh.wrapS = THREE.ClampToEdgeWrapping;
    sh.wrapT = THREE.ClampToEdgeWrapping;
    sh.wrapR = THREE.ClampToEdgeWrapping;
    sh.needsUpdate = true;
    this.shTexture = sh;

    this.uploadVisibility();
  }

  private uploadVisibility(): void {
    for (let p = 0; p < this.probeCount; p++) {
      const s = p * 4;
      this.visibilityBytes[s] = Math.round((this.visibility[s] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 1] = Math.round((this.visibility[s + 1] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 2] = Math.round((this.visibility[s + 2] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 3] = Math.round(
        THREE.MathUtils.clamp(this.visibility[s + 3], 0, 1) * 255,
      );
    }
    if (this.visibilityTexture) this.visibilityTexture.needsUpdate = true;
  }

  /**
   * Packs 9 RGB coefficients into three's atlas: seven RGBA sub-volumes stacked
   * along Z, each padded by a duplicate slice at both ends so the hardware
   * filter cannot read across a boundary into the next coefficient.
   */
  private uploadSH(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const padded = nz + 2;
    const slice = nx * ny * 4;
    const half = THREE.DataUtils.toHalfFloat;

    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const src = (ix + nx * (iy + ny * iz)) * SH_COEFFS * 3;
          for (let t = 0; t < 7; t++) {
            const dst = (((t * padded + 1 + iz) * ny + iy) * nx + ix) * 4;
            for (let c = 0; c < 4; c++) {
              const index = t * 4 + c;
              this.shData[dst + c] =
                index < SH_COEFFS * 3
                  ? half(this.sh[src + index] + this.shSpread[src + index])
                  : 0;
            }
          }
        }
      }
    }

    for (let t = 0; t < 7; t++) {
      const first = (t * padded + 1) * slice;
      const last = (t * padded + nz) * slice;
      this.shData.copyWithin(t * padded * slice, first, first + slice);
      this.shData.copyWithin((t * padded + nz + 1) * slice, last, last + slice);
    }

    if (this.shTexture) this.shTexture.needsUpdate = true;
  }

  dispose(): void {
    this.visibilityTexture?.dispose();
    this.shTexture?.dispose();
    this.visibilityTexture = null;
    this.shTexture = null;
    this.rayCache = new Float32Array(0);
    this.portalRays = new Float32Array(0);
    this.portals = new Float32Array(0);
    this.portalSlot = new Int32Array(0);
    this.interred = new Uint8Array(0);
    this.portalCount = 0;
    this.visibility = new Float32Array(0);
    this.sh = new Float32Array(0);
    this.shSpread = new Float32Array(0);
    this.shSpreadNext = new Float32Array(0);
    this.phase = 'idle';
    disposeSurfaceAlbedo();
  }
}
