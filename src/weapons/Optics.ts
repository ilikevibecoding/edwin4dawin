import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import { Assembly, type AssemblyMaterials, type PartCtx } from './parts/Assembly';
import { TINT } from './parts/Components';

/**
 * Sights that behave like sights.
 *
 * A red dot is *collimated*: the reticle is projected to infinity along the
 * sight's optical axis, so it stays on the target no matter where the eye sits
 * behind the glass. Drawing it as a sprite on the lens, or worse as a
 * screen-space overlay, gets this exactly backwards — it would swim across the
 * target as the weapon sways. So the reticle here is computed from the eye ray:
 * every fragment of the glass knows which direction the eye is looking through
 * it, and the dot is painted where that direction is parallel to the sight
 * axis. Parallax-free by construction, and the sight shadow at the edge of the
 * eyebox comes out for free.
 *
 * The sniper scope uses the same eye-ray parameterisation to sample a texture
 * rendered by a second camera along the scope axis, which gives real
 * magnification, a real image shift when the eye is off-axis, and somewhere to
 * put chromatic fringing and the eyebox crescent. The image stays linear: the
 * viewmodel is composited before the tone map, so the scope picture is exposed
 * and graded with everything else instead of looking like a photograph glued
 * into the ocular.
 *
 * Every optic is authored around its own optical axis at y = 0 and mounts
 * downward to `baseY`, which is the whole reason swapping optics never moves
 * the sight picture off the screen centre.
 */

export type OpticKind = 'none' | 'irons' | 'reflex' | 'holo' | 'acog' | 'sniper';

export interface OpticRig {
  kind: OpticKind;
  /** Housing, glass and reticle, parented under the model's optic node. */
  group: THREE.Group;
  /** Optical magnification; 1 for a non-magnified sight. */
  magnification: number;
  /** Camera the system should render the world with, when it wants an image. */
  scopeCamera: THREE.PerspectiveCamera | null;
  /** True when a rendered scope image is wanted this frame. */
  wantsRender: boolean;
  /** Vertical field of view the scope camera must cover, in degrees. */
  scopeFov: number;
  triangles: number;
  /** Solves the scope camera's field of view for a true magnification. */
  frame(vmFovAdsDeg: number, baseFovDeg: number): void;
  /** Reticle angular radius and emissive level. */
  setReticle(dot: number, intensity: number): void;
  /**
   * Ambient level the emitter should hold its own against, in the engine's
   * kilonits. Roughly the luminance of the sun colour; see `Viewmodel`.
   */
  setEnvLevel(level: number): void;
  setScopeTexture(texture: THREE.Texture | null): void;
  /** `eyeLocal` is the viewmodel camera in the optic's own space; `ads` is 0..1. */
  update(eyeWorld: THREE.Vector3, ads: number, time: number): void;
  dispose(): void;
}

/* ------------------------------ shaders --------------------------------- */

const RETICLE_VERT = /* glsl */ `
out vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * `uEye` is the eye in this mesh's local space, so `ang` is the tangent of the
 * angle of the eye ray off the sight axis (-Z). Everything the reticle draws is
 * a function of that angle alone, which is what makes it collimated.
 */
const RETICLE_FRAG = /* glsl */ `
precision highp float;
in vec3 vLocal;
uniform vec3 uEye;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uDot;
uniform float uRing;
uniform float uAngMax;
uniform float uAds;
uniform float uGlass;
uniform vec3 uTint;
out vec4 fragColor;

float ringMask(float d, float r, float w) {
  return 1.0 - smoothstep(w * 0.5, w * 1.5, abs(d - r));
}

void main() {
  vec3 d = vLocal - uEye;
  float dz = max(1.0e-5, -d.z);
  vec2 ang = d.xy / dz;
  float r = length(ang);

  // Glass: a faint coated tint plus a grazing-angle sheen, so the lens reads as
  // glass rather than as a hole in the housing.
  float sheen = pow(clamp(r / max(uAngMax, 1e-4), 0.0, 1.0), 2.0);
  vec3 glass = uTint * (uGlass * (0.6 + 1.1 * sheen));
  float glassA = clamp(uGlass * (0.42 + 0.9 * sheen), 0.0, 1.0);

  float lit = 0.0;
#if RETICLE == 0
  lit += 1.0 - smoothstep(uDot * 0.62, uDot, r);
  lit += 0.22 * (1.0 - smoothstep(uDot, uDot * 3.2, r));
#elif RETICLE == 1
  // Holographic circle-dot: a 65 MOA ring around a 1 MOA dot, with the ring
  // broken at the cardinal points the way an EOTech's is.
  lit += 1.0 - smoothstep(uDot * 0.55, uDot * 0.95, r);
  float a = atan(ang.y, ang.x);
  float breaks = smoothstep(0.10, 0.24, abs(sin(a * 2.0)));
  lit += ringMask(r, uRing, uDot * 1.15) * (0.3 + 0.7 * breaks);
#elif RETICLE == 2
  // ACOG chevron with a bullet-drop ladder below it.
  vec2 p = ang / max(uDot, 1e-5);
  float chev = max(abs(p.x) - (p.y + 2.6) * 0.8, -(p.y + 2.6));
  lit += 1.0 - smoothstep(0.0, 0.9, chev);
  for (int i = 1; i < 4; i++) {
    float y = -3.2 - float(i) * 1.9;
    float w = 1.4 - float(i) * 0.24;
    lit += (1.0 - smoothstep(w, w + 0.5, abs(p.x))) *
           (1.0 - smoothstep(0.14, 0.34, abs(p.y - y))) * 0.75;
  }
#endif

  // Outside the glass the housing takes over, so nothing is drawn there.
  float aperture = 1.0 - smoothstep(uAngMax * 0.97, uAngMax * 1.02, r);
  vec3 col = glass + uColor * (lit * uIntensity);
  float alpha = clamp(glassA + min(1.0, lit * 1.8), 0.0, 1.0) * aperture;
  // The emitter is only turned up once the sight is being used, otherwise it
  // blooms in the corner of the screen the whole time the player is hip firing.
  fragColor = vec4(col * mix(0.35, 1.0, uAds), alpha * mix(0.5, 1.0, uAds));
}
`;

const SCOPE_FRAG = /* glsl */ `
precision highp float;
in vec3 vLocal;
uniform vec3 uEye;
uniform sampler2D uImage;
uniform float uAngMax;
uniform float uHasImage;
uniform float uAberration;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uDot;
uniform float uAds;
uniform float uAspect;
out vec4 fragColor;

void main() {
  vec3 d = vLocal - uEye;
  float dz = max(1.0e-5, -d.z);
  vec2 ang = d.xy / dz;
  float r = length(ang);

  // The exit pupil: the image only exists where the eye ray still lands inside
  // the objective. Off axis this crescent becomes the scope shadow, and it
  // moves because uEye moves, which is the entire point of doing it here.
  vec2 uv = 0.5 + 0.5 * vec2(ang.x / uAspect, ang.y) / uAngMax;
  // The field is full brightness almost to the edge and then falls off fast.
  // Pulling this in was making the ocular look like a pinhole: the eye reads
  // the *lit* disc as the sight picture, not the glass behind it.
  float vign = 1.0 - smoothstep(0.86, 1.0, r / uAngMax);

  vec3 image = vec3(0.0);
  if (uHasImage > 0.5) {
    // Lateral chromatic aberration: the channels focus at slightly different
    // scales, which only shows at the edge of the field. It is the cheapest
    // cue that you are looking through glass and not at a hole.
    vec2 c = uv - 0.5;
    float k = uAberration * smoothstep(0.2, 1.0, r / uAngMax);
    image.r = texture(uImage, 0.5 + c * (1.0 + k)).r;
    image.g = texture(uImage, uv).g;
    image.b = texture(uImage, 0.5 + c * (1.0 - k)).b;
    image = max(image, vec3(0.0)) * vign;
  }

  // Reticle, in angular space so it tracks the target exactly.
  vec2 p = ang / max(uDot, 1e-5);
  float mark = 0.0;
#if RETICLE == 2
  // ACOG chevron over a bullet-drop ladder.
  float chev = max(abs(p.x) - (p.y + 3.0) * 0.85, -(p.y + 3.0));
  mark += 1.0 - smoothstep(0.0, 0.9, chev);
  for (int i = 1; i < 5; i++) {
    float y = -4.0 - float(i) * 2.4;
    float w = 1.7 - float(i) * 0.26;
    mark += (1.0 - smoothstep(w, w + 0.5, abs(p.x))) *
            (1.0 - smoothstep(0.16, 0.4, abs(p.y - y))) * 0.85;
  }
#else
  // Mil-dot duplex: thin in the centre, heavy posts outside.
  mark += (1.0 - smoothstep(0.5, 1.1, abs(p.x))) *
          (1.0 - smoothstep(46.0, 54.0, abs(p.y)));
  mark += (1.0 - smoothstep(0.5, 1.1, abs(p.y))) *
          (1.0 - smoothstep(46.0, 54.0, abs(p.x)));
  mark += (1.0 - smoothstep(2.2, 3.0, abs(p.x))) * smoothstep(46.0, 52.0, abs(p.y)) *
          (1.0 - smoothstep(90.0, 100.0, abs(p.y)));
  mark += (1.0 - smoothstep(2.2, 3.0, abs(p.y))) * smoothstep(46.0, 52.0, abs(p.x)) *
          (1.0 - smoothstep(90.0, 100.0, abs(p.x)));
  for (int i = 1; i <= 4; i++) {
    float o = float(i) * 10.0;
    mark += 1.0 - smoothstep(1.0, 1.9, length(vec2(abs(p.x) - o, p.y)));
    mark += 1.0 - smoothstep(1.0, 1.9, length(vec2(p.x, abs(p.y) - o)));
  }
#endif
  float lit = clamp(mark, 0.0, 1.0) * step(r, uAngMax);

  // Before the scope is up, the ocular is a dark lens rather than a window.
  vec3 dark = vec3(0.004, 0.005, 0.007);
  vec3 col = mix(dark, image, uHasImage * smoothstep(0.15, 0.75, uAds));
  col = mix(col, uColor * uIntensity, lit);
  fragColor = vec4(col, 1.0);
}
`;

/* ------------------------------ specs ----------------------------------- */

/**
 * The eye sits this far behind every optic's glass at full ADS, whatever the
 * optic is.
 *
 * It is not the real eye relief of any of them, and it cannot be: the viewmodel
 * pass focuses at 0.34 m when aimed and blurs hard either side, so a sight put
 * at a physical 70 mm would be a smear no matter how well it is modelled. So
 * the *distance* is fixed at the focus plane and the apparent size is bought
 * back with the viewmodel field of view, which is a free parameter — the
 * viewmodel camera shares nothing with the world's but its position. The sight
 * picture is identical either way; only the depth of field can tell.
 */
const EYE_DISTANCE = 0.34;

/**
 * Ambient level, in the engine's kilonits, at which an emitter runs at its
 * quoted intensity.
 *
 * A red dot is not a fixed number of nits. Every one of them has a brightness
 * dial and the shooter turns it until the dot sits a stop or two over whatever
 * is behind it — which is also the only setting that survives an auto exposure,
 * because a dot pinned to an absolute radiance is a dim smudge at noon and a
 * blinding smear at midnight. So the emitter tracks the key light, saturating
 * once the scene is bright enough that no more would show.
 */
const ENV_REFERENCE = 25;

interface OpticSpec {
  /** Radius of the visible glass, metres. */
  glassRadius: number;
  /** Radius of the housing around it, for framing the shot. */
  outerRadius: number;
  /**
   * Fraction of the screen's height the housing should fill at full ADS. This
   * is what sets the weapon's aimed viewmodel field of view; a red dot that
   * fills a third of the screen is what aiming looks like.
   */
  screenFraction: number;
  /** Angular radius of the dot / crosshair stroke, radians. */
  dot: number;
  /** Angular radius of the surrounding ring, radians. */
  ring: number;
  colour: number;
  intensity: number;
  magnification: number;
  /** Z of the glass in the optic node's local frame. */
  glassZ: number;
  reticle: number;
  scoped: boolean;
  /**
   * How far in front of the glass a magnified optic's blackout hood sits, in
   * metres — far enough to be clear of the ocular bell.
   *
   * A real scope's ocular is 90 mm from your eye and so far out of focus that
   * it is simply the dark edge of the world; modelled honestly and lit, it is
   * instead a large grey ring that reads as *looking at* a scope. So the bell
   * is hidden behind a black annulus whose hole is cut to the exact cone from
   * the eye to the rim of the glass, and what is left is a sight picture in a
   * black surround. The hole being cut for one eye position is a feature: move
   * off axis and it crescents across the field, which is the scope shadow.
   */
  hoodZ?: number;
}

const SPECS: Record<string, OpticSpec> = {
  reflex: {
    glassRadius: 0.0125,
    outerRadius: 0.0175,
    screenFraction: 0.34,
    dot: 0.0024,
    ring: 0.012,
    colour: 0xff2a12,
    intensity: 130,
    magnification: 1,
    glassZ: -0.03,
    reticle: 0,
    scoped: false,
  },
  holo: {
    glassRadius: 0.0155,
    outerRadius: 0.0205,
    screenFraction: 0.38,
    dot: 0.0021,
    ring: 0.017,
    colour: 0xff3418,
    intensity: 115,
    magnification: 1,
    glassZ: -0.026,
    reticle: 1,
    scoped: false,
  },
  acog: {
    glassRadius: 0.0135,
    outerRadius: 0.0185,
    screenFraction: 0.75,
    dot: 0.0019,
    ring: 0.012,
    colour: 0xff6a1e,
    intensity: 85,
    magnification: 4,
    glassZ: 0.038,
    reticle: 2,
    scoped: true,
    hoodZ: 0.04,
  },
  sniper: {
    glassRadius: 0.0208,
    outerRadius: 0.0258,
    // A scope is the whole frame when you are behind it. At 0.62 the sight
    // picture came out 200 px across in a 450 px frame, which reads as looking
    // at a scope rather than through one; this puts the field at about four
    // fifths of the frame height and lets the bell run off the edges, where the
    // hood blacks it out anyway. The magnification is unaffected — `frame()`
    // re-solves the scope camera for whatever the housing ends up subtending.
    screenFraction: 1,
    dot: 0.0009,
    ring: 0.01,
    colour: 0x121110,
    intensity: 1,
    magnification: 8,
    glassZ: 0.1,
    reticle: 3,
    scoped: true,
    hoodZ: 0.05,
  },
};

export interface OpticFraming {
  glassRadius: number;
  eyeDistance: number;
  glassZ: number;
  magnification: number;
  /** Viewmodel field of view, in degrees, that frames this optic when aimed. */
  vmFovAds: number;
}

/** Where a model has to put its eye, and how tight to zoom when it gets there. */
export function opticSpec(kind: OpticKind): OpticFraming | null {
  const spec = SPECS[kind];
  if (!spec) return null;
  const subtend = 2 * Math.atan(spec.outerRadius / EYE_DISTANCE);
  return {
    glassRadius: spec.glassRadius,
    eyeDistance: EYE_DISTANCE,
    glassZ: spec.glassZ,
    magnification: spec.magnification,
    vmFovAds: ((subtend / spec.screenFraction) * 180) / Math.PI,
  };
}

/* ------------------------------ housings -------------------------------- */

/** Rail clamp reaching from the optic body down to the mounting surface. */
function mount(g: PartCtx, topY: number, baseY: number, width: number, z: number, len: number): void {
  if (baseY >= topY - 0.001) return;
  g.use('metal', 0x232528);
  g.boxAt(0, (topY + baseY) * 0.5, z, width, topY - baseY, len * 0.62, 0.0012);
  // Clamp jaw and its thumb nut, hanging off the right of the rail.
  g.boxAt(0, baseY + 0.005, z, width + 0.008, 0.01, len * 0.5, 0.0012);
  g.use('metal', 0x3a3d42);
  g.push().at(width * 0.5 + 0.004, baseY + 0.005, z).ry(Math.PI / 2);
  g.hexHead(0.008, 0.005);
  g.pop();
}

/**
 * Nothing on the eye side of the glass may be solid.
 *
 * Every housing below is built to that rule, and it is the rule the first
 * version of this file broke: an ocular bell modelled as a capped cylinder is
 * geometrically correct and renders as a metal plug over the sight picture,
 * because the cap nearest the eye is the surface that wins the depth test. So
 * an optic is a *tube* from its glass rearward, always, and the eyepiece rings
 * are annuli with an inner radius at least the glass radius.
 */
function reflexHousing(g: PartCtx, spec: OpticSpec, baseY: number, detail: number): void {
  const seg = detail ? 32 : 12;
  const r = spec.outerRadius;
  const gr = spec.glassRadius;
  g.use('metal', TINT.optic);
  // Main tube: open from the glass all the way back to the eyepiece.
  g.push().at(0, 0, spec.glassZ + 0.019);
  g.tube(r, gr, 0.038, seg, 0.0008);
  g.pop();
  // Eyepiece and objective rings, both annular.
  g.push().at(0, 0, spec.glassZ + 0.0405);
  g.tube(r + 0.0018, gr, 0.005, seg, 0.001);
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.0025);
  g.tube(r + 0.0018, gr, 0.005, seg, 0.001);
  g.pop();
  if (detail) {
    // Knurl on the eyepiece, so the rear ring is not a plain band.
    g.use('metal', 0x1b1c1f);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rr = r + 0.0018;
      g.push().at(Math.cos(a) * rr, Math.sin(a) * rr, spec.glassZ + 0.0405).rz(a);
      g.box(0.0011, 0.0016, 0.0044, 0.0003);
      g.pop();
    }
  }
  // Emitter blister low on the left, brightness dial on the right.
  g.use('metal', 0x2b2d31);
  g.push().at(-r * 0.78, -r * 0.58, spec.glassZ + 0.014).rz(0.62);
  g.box(0.0085, 0.0075, 0.016, 0.001);
  g.pop();
  g.push().at(r + 0.0005, 0.002, spec.glassZ + 0.02).ry(Math.PI / 2);
  g.cyl(0.0072, 0.006, { segments: 10, chamfer: 0.0009 });
  // Knurl around the rim rather than a run of ribs through the axis.
  g.use('metal', 0x1d1e21);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.push().at(Math.cos(a) * 0.0072, Math.sin(a) * 0.0072, 0).rz(a);
    g.box(0.001, 0.0014, 0.0052, 0.0003);
    g.pop();
  }
  g.pop();
  // Battery cap on top of the tube.
  g.use('metal', 0x2b2d31);
  g.push().at(0, r + 0.0005, spec.glassZ + 0.03).rx(-Math.PI / 2);
  g.cyl(0.0062, 0.005, { segments: 10, chamfer: 0.0008 });
  g.pop();
  mount(g, -r + 0.001, baseY, 0.024, spec.glassZ + 0.018, 0.036);
}

function holoHousing(g: PartCtx, spec: OpticSpec, baseY: number, detail: number): void {
  const gr = spec.glassRadius;
  const r = spec.outerRadius;
  const seg = detail ? 32 : 12;
  const w = r * 2 + 0.004;
  const h = r * 2 + 0.002;
  g.use('metal', TINT.optic);
  // The optical channel is a tube, so the window can never be occluded; the
  // squared hood that makes a holographic sight recognisable is hung on it.
  g.push().at(0, 0, spec.glassZ + 0.016);
  g.tube(r, gr, 0.032, seg, 0.0008);
  g.pop();
  const zc = spec.glassZ + 0.016;
  g.boxAt(0, h * 0.5 - 0.0022, zc, w, 0.0044, 0.032, 0.0012);
  g.boxAt(0, -h * 0.5 + 0.0022, zc, w, 0.0044, 0.032, 0.0012);
  for (const sx of [-1, 1]) g.boxAt(sx * (w * 0.5 - 0.0022), 0, zc, 0.0044, h, 0.032, 0.0012);
  // Body: battery tray and buttons, carried *below* the sight line and behind
  // the window, which is where a holographic sight actually puts them.
  g.boxAt(0, baseY * 0.5 - r * 0.5, spec.glassZ + 0.052, w, r * 2 + baseY, 0.04, 0.0016);
  g.use('metal', 0x2b2d31);
  g.boxAt(0, baseY + 0.006, spec.glassZ + 0.07, w - 0.004, 0.009, 0.026, 0.0012);
  if (detail) {
    for (const sx of [-1, 1]) {
      g.push().at(sx * 0.0065, baseY + 0.012, spec.glassZ + 0.072).rx(-Math.PI / 2);
      g.cyl(0.003, 0.0022, { segments: 8, chamfer: 0.0005 });
      g.pop();
    }
  }
  mount(g, baseY + 0.004, baseY, 0.026, spec.glassZ + 0.036, 0.05);
}

function acogHousing(g: PartCtx, spec: OpticSpec, baseY: number, detail: number): void {
  const seg = detail ? 30 : 12;
  const gr = spec.glassRadius;
  const r = spec.outerRadius;
  g.use('metal', TINT.optic);
  // Ocular bell and eyecup, both annular: the eye looks straight down them.
  g.push().at(0, 0, spec.glassZ + 0.012);
  g.tube(r + 0.0016, gr, 0.024, seg, 0.0012);
  g.pop();
  g.use('polymer', TINT.rubber);
  g.push().at(0, 0, spec.glassZ + 0.03);
  g.tube(r + 0.003, gr + 0.0006, 0.014, seg, 0.0014);
  g.pop();
  // Cast body forward of the glass: waist, then the objective bell.
  g.use('metal', TINT.optic);
  g.push().at(0, 0, spec.glassZ - 0.042);
  g.cyl(r, 0.084, { r2: 0.0126, segments: seg, chamfer: 0.001 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.098);
  g.cyl(0.0126, 0.03, { r2: 0.0178, segments: seg, chamfer: 0.0014 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.1165);
  g.tube(0.0178, 0.0142, 0.009, seg, 0.0008);
  g.pop();
  g.use('metal', 0x0a0b0c);
  g.push().at(0, 0, spec.glassZ - 0.1135);
  g.cyl(0.0142, 0.001, { segments: seg });
  g.pop();
  // Fibre-optic ridge along the top, with the tritium strip in it.
  g.use('metal', 0x2b2d31);
  g.push().at(0, 0.0132, spec.glassZ - 0.046);
  g.box(0.0082, 0.006, 0.064, 0.0009);
  g.pop();
  g.use('metal', 0xc8a03a);
  g.push().at(0, 0.0162, spec.glassZ - 0.046);
  g.box(0.0034, 0.0022, 0.058, 0.0004);
  g.pop();
  g.use('metal', 0x2b2d31);
  for (const [ax, ay] of [[0, 1] as const, [1, 0] as const]) {
    g.push().at(ax * 0.0132, ay * 0.0132, spec.glassZ - 0.03);
    if (ax) g.ry(Math.PI / 2);
    else g.rx(-Math.PI / 2);
    g.cyl(0.0062, 0.007, { segments: 10, chamfer: 0.0009 });
    g.pop();
  }
  mount(g, -0.0126, baseY, 0.026, spec.glassZ - 0.05, 0.07);
}

function sniperHousing(g: PartCtx, spec: OpticSpec, baseY: number, detail: number): void {
  const seg = detail ? 32 : 12;
  const tube = 0.0175;
  const gr = spec.glassRadius;
  const bell = spec.outerRadius;
  g.use('metal', TINT.optic);
  // Ocular bell: annular, and the taper down to the main tube is annular too.
  g.push().at(0, 0, spec.glassZ + 0.017);
  g.tube(bell, gr, 0.034, seg, 0.0016);
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.011);
  g.cyl(bell, 0.022, { r2: tube, segments: seg, chamfer: 0.0012 });
  g.pop();
  // Eyepiece focus ring at the very back.
  g.use('metal', 0x1a1b1e);
  g.push().at(0, 0, spec.glassZ + 0.038);
  g.tube(bell + 0.0022, gr, 0.013, seg, 0.0012);
  g.pop();
  if (detail) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rr = bell + 0.0022;
      g.push().at(Math.cos(a) * rr, Math.sin(a) * rr, spec.glassZ + 0.038).rz(a);
      g.box(0.0012, 0.0016, 0.012, 0.0003);
      g.pop();
    }
  }
  // Main tube, magnification ring, turret saddle, objective bell.
  g.use('metal', TINT.optic);
  g.push().at(0, 0, spec.glassZ - 0.094);
  g.cyl(tube, 0.144, { segments: seg, chamfer: 0.001 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.038);
  g.cyl(tube + 0.003, 0.016, { segments: seg, chamfer: 0.0014 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.098);
  g.cyl(tube + 0.0055, 0.03, { segments: seg, chamfer: 0.0016 });
  g.pop();
  g.use('metal', 0x1f2124);
  for (const [ax, ay, len] of [
    [0, 1, 0.019] as const,
    [1, 0, 0.014] as const,
    [-1, 0, 0.012] as const,
  ]) {
    g.push().at(ax * (tube + 0.006), ay * (tube + 0.006), spec.glassZ - 0.098);
    if (ax) g.ry((ax * Math.PI) / 2);
    else g.rx(-Math.PI / 2);
    g.cyl(0.0105, len, { segments: detail ? 12 : 8, chamfer: 0.0012 });
    g.at(0, 0, len * 0.5);
    g.use('metal', 0x34373c);
    g.cyl(0.0112, 0.004, { segments: detail ? 12 : 8, chamfer: 0.0008 });
    g.use('metal', 0x1f2124);
    g.pop();
  }
  g.push().at(0, 0, spec.glassZ - 0.172);
  g.cyl(tube + 0.0016, 0.03, { segments: seg, chamfer: 0.0012 });
  g.pop();
  g.use('metal', TINT.optic);
  g.push().at(0, 0, spec.glassZ - 0.204);
  g.cyl(tube, 0.036, { r2: 0.0268, segments: seg, chamfer: 0.0014 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.234);
  g.cyl(0.0268, 0.026, { segments: seg, chamfer: 0.0016 });
  g.pop();
  g.push().at(0, 0, spec.glassZ - 0.2485);
  g.tube(0.0268, 0.0228, 0.006, seg, 0.001);
  g.pop();
  // Objective glass: a dark blue-coated disc.
  g.use('metal', 0x0a0e14);
  g.push().at(0, 0, spec.glassZ - 0.246);
  g.cyl(0.0228, 0.0012, { segments: seg });
  g.pop();

  // Rings clamping the tube down to the rail.
  g.use('metal', 0x25272b);
  for (const z of [spec.glassZ - 0.05, spec.glassZ - 0.15]) {
    g.push().at(0, 0, z);
    g.tube(tube + 0.005, tube, 0.018, detail ? 14 : 8, 0.001);
    g.pop();
    g.boxAt(0, -tube * 0.5, z, 0.03, tube, 0.018, 0.0012);
    if (baseY < -tube) {
      g.boxAt(0, (-tube + baseY) * 0.5, z, 0.026, Math.abs(baseY + tube), 0.02, 0.0014);
      g.boxAt(0, baseY + 0.004, z, 0.034, 0.008, 0.02, 0.0012);
    }
    if (detail) {
      for (const sx of [-1, 1]) {
        g.screwX(sx * 0.0152, -tube * 0.5 - 0.002, z, 0.003, 0.001);
        g.screwX(sx * 0.0172, baseY + 0.004, z, 0.0032, 0.0011);
      }
    }
  }
}

/* ------------------------------ the rig --------------------------------- */

const _inv = new THREE.Matrix4();
const _eye = new THREE.Vector3();

class Optic implements OpticRig {
  readonly group = new THREE.Group();
  readonly magnification: number;
  scopeCamera: THREE.PerspectiveCamera | null = null;
  wantsRender = false;
  scopeFov = 10;
  triangles = 0;

  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.CircleGeometry;
  private readonly shroud: THREE.Mesh | null = null;
  private readonly spec: { dot: number; intensity: number };
  private readonly housing: THREE.BufferGeometry[];
  private envScale = 1;

  constructor(
    readonly kind: OpticKind,
    spec: OpticSpec,
    quality: QualitySettings,
    materials: AssemblyMaterials,
    baseY: number,
  ) {
    this.spec = spec;
    this.magnification = spec.magnification;
    this.group.name = `optic:${kind}`;
    const detail = quality.preset === 'low' ? 0 : 1;

    const assembly = new Assembly(materials);
    const g = assembly.node('housing');
    if (kind === 'reflex') reflexHousing(g, spec, baseY, detail);
    else if (kind === 'holo') holoHousing(g, spec, baseY, detail);
    else if (kind === 'acog') acogHousing(g, spec, baseY, detail);
    else sniperHousing(g, spec, baseY, detail);
    const built = assembly.build(`optic:${kind}`, 0.4, 96);
    this.housing = built.geometries;
    this.triangles = built.triangles;
    this.group.add(built.root);

    const segments = quality.preset === 'low' ? 24 : 64;
    this.geometry = new THREE.CircleGeometry(spec.glassRadius, segments);
    const angMax = spec.glassRadius / EYE_DISTANCE;

    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: RETICLE_VERT,
      fragmentShader: spec.scoped ? SCOPE_FRAG : RETICLE_FRAG,
      defines: { RETICLE: spec.reticle },
      uniforms: {
        uEye: { value: new THREE.Vector3(0, 0, EYE_DISTANCE) },
        uColor: { value: new THREE.Color(spec.colour) },
        uIntensity: { value: spec.intensity },
        uDot: { value: spec.dot },
        uRing: { value: spec.ring },
        uAngMax: { value: angMax },
        uAds: { value: 0 },
        uGlass: { value: 0.05 },
        uTint: { value: new THREE.Color(0x1d3d5c) },
        uImage: { value: null },
        uHasImage: { value: 0 },
        uAberration: { value: 0.006 },
        uAspect: { value: 1 },
      },
      transparent: !spec.scoped,
      depthWrite: spec.scoped,
      depthTest: true,
      side: THREE.FrontSide,
      blending: spec.scoped ? THREE.NormalBlending : THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = `optic:${kind}:glass`;
    this.mesh.position.z = spec.glassZ;
    this.mesh.renderOrder = 12;
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(Layers.VIEWMODEL);
    this.group.add(this.mesh);

    if (spec.scoped) {
      /* Everything outside the ocular is the inside of a scope tube, which is
         to say black — and so is the ocular itself, which the hood sits in
         front of. The hole is the cone from the design eye position to the rim
         of the glass, so at full ADS it takes away the bell and nothing else. */
      const hoodZ = spec.hoodZ ?? 0;
      const inner = spec.glassRadius * ((EYE_DISTANCE - hoodZ) / EYE_DISTANCE);
      const shroudGeo = new THREE.RingGeometry(inner * 0.998, EYE_DISTANCE * 2.6, segments, 1);
      this.shroud = new THREE.Mesh(
        shroudGeo,
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide }),
      );
      this.shroud.name = `optic:${kind}:shroud`;
      // Nearly a metre across, and therefore poison to anything that measures
      // the weapon: it is a light-tight curtain, not part of the model.
      this.shroud.userData.noBounds = true;
      this.shroud.position.z = spec.glassZ + hoodZ;
      this.shroud.renderOrder = 13;
      this.shroud.frustumCulled = false;
      this.shroud.visible = false;
      this.shroud.layers.set(Layers.VIEWMODEL);
      this.group.add(this.shroud);

      this.scopeFov = (2 * Math.atan(angMax) * 180) / Math.PI / spec.magnification;
      this.scopeCamera = new THREE.PerspectiveCamera(this.scopeFov, 1, 0.2, 4000);
      this.scopeCamera.name = 'ScopeCamera';
      this.scopeCamera.layers.set(Layers.DEFAULT);
      this.scopeCamera.layers.enable(Layers.GLOW);
      this.scopeCamera.layers.enable(Layers.TRANSPARENT_LATE);
      this.scopeCamera.layers.enable(Layers.NO_SSR);
    }
  }

  setScopeTexture(texture: THREE.Texture | null): void {
    this.material.uniforms.uImage.value = texture;
    this.material.uniforms.uHasImage.value = texture ? 1 : 0;
  }

  /** Reticle size and brightness, for the tuning harness. */
  setReticle(dot: number, intensity: number): void {
    this.spec.dot = dot;
    this.spec.intensity = intensity;
    this.material.uniforms.uDot.value = dot;
    this.material.uniforms.uIntensity.value = intensity;
  }

  setEnvLevel(level: number): void {
    this.envScale = Math.min(1, Math.max(0.05, level / ENV_REFERENCE));
  }

  /**
   * Solves the scope camera's field of view for a true `magnification`.
   *
   * The image is sampled in eye-ray angle, then that angle is projected by the
   * viewmodel camera — which does *not* share the world camera's field of view.
   * So the magnification the player actually sees is the product of three
   * things, and getting an 8x scope to be 8x means solving for the one that is
   * free. Measured against the world at its unaimed field of view, which is the
   * only definition of "eight times" a player can check.
   */
  frame(vmFovAdsDeg: number, baseFovDeg: number): void {
    if (!this.scopeCamera) return;
    const angMax = this.material.uniforms.uAngMax.value as number;
    const vmHalf = Math.tan((vmFovAdsDeg * Math.PI) / 360);
    const baseHalf = Math.tan((baseFovDeg * Math.PI) / 360);
    const tanHalf = (angMax * baseHalf) / (this.magnification * vmHalf);
    this.scopeFov = (2 * Math.atan(tanHalf) * 180) / Math.PI;
    this.scopeCamera.fov = this.scopeFov;
    this.scopeCamera.updateProjectionMatrix();
  }

  update(eyeWorld: THREE.Vector3, ads: number, time: number): void {
    this.mesh.updateWorldMatrix(true, false);
    _inv.copy(this.mesh.matrixWorld).invert();
    _eye.copy(eyeWorld).applyMatrix4(_inv);
    (this.material.uniforms.uEye.value as THREE.Vector3).copy(_eye);
    this.material.uniforms.uAds.value = ads;
    // Emitters flicker very slightly; a perfectly steady dot looks synthetic.
    const flicker = 1 + 0.03 * Math.sin(time * 37.1) * Math.sin(time * 11.3);
    this.material.uniforms.uIntensity.value = this.spec.intensity * flicker * this.envScale;
    // Late, because the hood's hole is cut for the aimed eye position: bring it
    // in while the weapon is still travelling and it swings across the field.
    if (this.shroud) this.shroud.visible = ads > 0.9;
    this.wantsRender = this.scopeCamera !== null && ads > 0.25;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const geo of this.housing) geo.dispose();
    if (this.shroud) {
      this.shroud.geometry.dispose();
      (this.shroud.material as THREE.Material).dispose();
    }
  }
}

export function makeOptic(
  kind: OpticKind,
  quality: QualitySettings,
  materials: AssemblyMaterials,
  baseY = -0.028,
): OpticRig | null {
  const spec = SPECS[kind];
  if (!spec) return null;
  return new Optic(kind, spec, quality, materials, baseY);
}
