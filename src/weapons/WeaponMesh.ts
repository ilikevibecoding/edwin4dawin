import * as THREE from 'three';
import type { WeaponDef } from './WeaponDefs';
import type { MaterialLibrary } from '../render/Materials';
import {
  GeoBatch,
  extrude,
  picatinnyRail,
  revolve,
  roundRectSection,
  roundedBox,
  screwHead,
  gripTexture,
  slottedPanel,
  taperedBox,
} from './GeoKit';
import type { Contour } from './GeoKit';
import { buildHand, solveCylinderGrip } from './Hands';

/**
 * Procedural weapon geometry.
 *
 * Model space: the bore axis is Y = 0, -Z is downrange, +X is the shooter's
 * right, and Z = 0 is the rear face of the upper receiver. Everything is at
 * true scale, which matters more than it sounds — the hands are built from
 * anthropometric measurements, so if the grip is not 32 mm across the fingers
 * do not close on it, and the eye reads the mismatch instantly even though it
 * cannot name it.
 *
 * Detail is spent where the player looks: the top plane of the receiver, the
 * optic, the near end of the handguard and the ejection port carry real
 * geometry; the stock and the underside of the barrel carry almost none
 * because they sit off the bottom of the frame in every pose the weapon is
 * ever in.
 */

export interface WeaponFrame {
  dt: number;
  ads: number;
  elapsed: number;
  /** Camera position, world space, for the collimated reticle. */
  eye: THREE.Vector3;
}

/**
 * Render layer the whole view model lives on, and nothing else does.
 *
 * The point is not culling, it is lighting. `Lighting` puts three lights in the
 * view scene — a key at intensity 9, a fill at 1.1 and an ambient — and they are
 * positioned in *world* space while the weapon hangs off a camera that rotates
 * with the player. So the key rakes across the receiver's top plane when the
 * player faces one way and misses it entirely when they face the other, and the
 * weapon's brightness swings by more than a stop as they turn on the spot. It is
 * also why it read as chrome in the interior capture and as a silhouette at
 * golden hour: those two scenarios face different directions.
 *
 * A light only reaches an object whose layer mask it shares, so putting the
 * weapon on a layer of its own takes it out of all three of them and lets
 * `ViewModel` light it with a camera-relative rig it can scale against a probe of
 * the player's actual surroundings. That is how a view model is lit in a shipped
 * game, and it is the only version of this that can respond to the world at all
 * without editing files this pass does not own.
 *
 * Nothing else in the project uses layers, so 1 is free.
 */
export const VIEW_MODEL_LAYER = 1;

export interface WeaponModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  opticCentre: THREE.Object3D;
  /** Eye-to-optic distance that frames the sight picture when aiming. */
  eyeRelief: number;
  sprintPose: { position: THREE.Vector3; rotation: THREE.Euler };
  sprintBlend: number;
  /**
   * Scales how much of the scene's environment probe the weapon takes.
   *
   * The probe is a single baked sky and knows nothing about where the player is
   * standing, so indoors it is the wrong light entirely — and it is not a light
   * object, so unlike the view rig it cannot be excluded by layer. The only knob
   * is how much of it each material accepts. Driven by the same surroundings
   * probe as the view rig's intensities; see `ViewModel.probeLight`.
   */
  setTone(k: number): void;
  onFire(): void;
  setMagazineVisible(v: boolean): void;
  setBoltBack(t: number): void;
  update(f: WeaponFrame): void;
  dispose(): void;
}

// The optical axis height above the bore. 70 mm is a shade over the 2.6 inches
// an AR actually runs, chosen deliberately: the extra height drops the whole
// weapon further down the frame when aiming, which leaves the receiver and the
// support hand visible under the sight picture instead of the optic filling
// the screen on its own.
const OPTIC_HEIGHT = 0.0705;
const RECEIVER_TOP = 0.0285;
// Top of the rail's teeth, and so the plane every optic mount and folding
// sight sits on. Tied to the rail's own geometry rather than repeated as a
// literal: the teeth were shortened to stop them aliasing (see picatinnyRail)
// and the first attempt left this at the old 37.5 mm, which floated the optic
// and the front sight two millimetres clear of the rail they clamp to.
const RAIL_TOP = RECEIVER_TOP + 0.0042 + 0.0024;

// ------------------------------------------------------------- proportions --

interface Proportions {
  receiverFront: number;
  receiverBack: number;
  handguardFront: number;
  brakeFront: number;
  handguardWidth: number;
  mlokSlots: number;
  magRounds: number;
  supportHandZ: number;
  stockBack: number;
}

function proportionsFor(def: WeaponDef): Proportions {
  switch (def.class) {
    case 'SMG':
      return {
        receiverFront: -0.160,
        receiverBack: 0.012,
        handguardFront: -0.300,
        brakeFront: -0.356,
        handguardWidth: 0.042,
        mlokSlots: 3,
        magRounds: 32,
        supportHandZ: -0.238,
        stockBack: 0.142,
      };
    case 'DMR':
    case 'SNIPER':
      return {
        receiverFront: -0.200,
        receiverBack: 0.014,
        handguardFront: -0.428,
        brakeFront: -0.526,
        handguardWidth: 0.048,
        mlokSlots: 6,
        magRounds: 20,
        supportHandZ: -0.330,
        stockBack: 0.182,
      };
    default:
      return {
        receiverFront: -0.185,
        receiverBack: 0.012,
        handguardFront: -0.383,
        brakeFront: -0.466,
        handguardWidth: 0.046,
        mlokSlots: 5,
        magRounds: 30,
        supportHandZ: -0.296,
        stockBack: 0.168,
      };
  }
}

// ------------------------------------------------------------------ shaders --

/**
 * Reticle.
 *
 * Drawn as if collimated: the aiming point is where a ray from the eye
 * *parallel to the optic's axis* crosses the reticle plane, not the centre of
 * the plane. That one line is the difference between a sticker on a piece of
 * glass and a sight. It means the dot holds on the target while the weapon
 * sways under it, it means the dot leaves the tube when the eye leaves the
 * eyebox, and it means the dot is dead centre on screen whenever the optic is
 * parallel to the view — so the sight picture cannot be a millimetre out
 * however the ADS pose happens to be authored.
 */
/**
 * Emitter radiance, aimed and from the hip.
 *
 * 11 could not clip, and the 24 that replaced it never shipped: it was written
 * into the uniform at construction and then overwritten on the first frame by
 * an `update` that still carried the old scale, so what reached the screen was
 * 5.2. An emitter is the one thing in the frame that is meant to blow out — a
 * 2 MOA dot is five pixels across at this eye relief, and unless its core is
 * several times full scale the tone mapper and the capture's own filtering
 * land it at about 60% grey with a pink cast. Measured off the last build:
 * rgb 216,129,102, which is a salmon smudge and not a sight.
 *
 * Both ends live here now so the two cannot drift apart again.
 *
 * 24 overshot in the other direction, and by more than it looks: the blend is
 * additive with a source-alpha factor, so what lands on the frame goes as
 * alpha *squared* times this, and the glow terms carry alpha of their own. The
 * whole inner region went over full scale rather than just the emitter, and the
 * profile measured off the last capture was a seven-pixel disc of clipped white
 * with no hue in it at all, a salmon annulus out to eleven pixels, and red still
 * a tenth of full scale thirty pixels out — a sixty-pixel ball where a red dot
 * should be a hard bead you could cover with a grain of rice. 9 puts the core
 * three or four pixels across and leaves everything past it under full scale,
 * which is where the colour is.
 */
const DOT_AIMED = 9.0;
/** Off the aim the dot is a glow inside the tube, not a light in the room. */
const DOT_HIP = 0.9;

const RETICLE_VERT = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RETICLE_FRAG = /* glsl */ `
  varying vec2 vLocal;
  uniform vec3 uColor;
  uniform float uBrightness;
  uniform float uDotAngle;
  uniform float uRingAngle;
  uniform int uType;
  uniform vec3 uEyeLocal;
  uniform float uAperture;

  // Flat-topped rather than Gaussian-ish. At 0.45 the falloff started barely a
  // pixel from the middle of a five-pixel dot, so nothing in it ever reached full
  // brightness once the frame was filtered and the emitter read as a soft smudge
  // with no core. Holding full value out to 0.72 of the radius gives the dot
  // something to clip with.
  float blob(float d, float r) {
    return 1.0 - smoothstep(r * 0.72, r, d);
  }

  void main() {
    // Angular offset of this fragment from the optic axis as seen from the eye.
    vec2 ang = (vLocal - uEyeLocal.xy) / max(abs(uEyeLocal.z), 1e-4);
    float d = length(ang);

    float a = 0.0;
    if (uType == 1) {
      // Chevron: on a magnified optic the aiming point is the apex.
      vec2 p = ang / uRingAngle;
      float arm = abs(p.x) * 1.55 + p.y + 0.05;
      a = (1.0 - smoothstep(0.0, 0.085, abs(arm)))
        * step(p.y, 0.03) * step(-0.62, p.y);
      a += blob(length(p - vec2(0.0, -0.95)), 0.09) * 0.75;
      a = clamp(a, 0.0, 1.0);
    } else if (uType == 2) {
      // Holographic: a 65 MOA ring around a 1 MOA dot.
      float ring = 1.0 - smoothstep(uRingAngle * 0.055, uRingAngle * 0.11,
                                    abs(d - uRingAngle));
      a = ring * 0.9 + blob(d, uDotAngle);
      float th = atan(ang.y, ang.x);
      a *= 1.0 - 0.85 * step(0.985, abs(cos(th * 2.0))) * ring;
      a = clamp(a, 0.0, 1.0);
    } else {
      a = blob(d, uDotAngle);
    }

    // Emitter bloom on the glass, which is what makes a bright dot read as a
    // light source rather than a painted mark. It has to be strong enough to
    // survive a sunlit wall behind it: measured against one, a dot that looked
    // convincing over shade came back as a pale peach smudge, because adding
    // red to an already-bright background buys almost nothing after tone
    // mapping. A real emitter answers that by being brighter than the sky.
    //
    // Two terms, and the near one is tight on purpose. Everything the eye reads
    // as *red* rather than as white lives in the ring just outside the clipped
    // core, and that ring only exists if the alpha falls off fast enough to be
    // under full scale a pixel past the core. At the previous three dot-radii
    // it did not: the glow alone was over full scale in every channel out to
    // eight pixels, so the ring was white too and the dot had no colour until
    // it was already too dim to read as one.
    a += exp(-d / (uDotAngle * 1.2)) * 0.45;
    // The wide skirt was nine dot-radii at 5% and it was not bloom, it was a
    // veil: an exponential that slow is still worth a per cent of alpha at the
    // rim of the aperture, and with the emitter colour at eleven times full scale
    // one per cent of alpha is a tenth of full scale of *red* added to every
    // pixel of the sight picture. That is the "fat halo" — the dot was tinting
    // the whole view through the optic.
    a += exp(-d / (uDotAngle * 3.2)) * 0.14;

    // Clip to the aperture; off-axis the reticle simply is not there.
    a *= 1.0 - smoothstep(uAperture * 0.86, uAperture, length(vLocal));
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * uBrightness * a, a);
  }
`;

/**
 * Objective and ocular glass.
 *
 * The temptation with a lens is to make it *look* like a lens — a coloured
 * disc, a bright rim, a coating that reads unmistakably as glass. That is
 * exactly backwards. A sight is a thing you look through, and the measure of
 * one is how little it costs you to do so: the working aperture of a 1x optic
 * is honest daylight with a hint of blue in it, and every percent of tint
 * added there is a percent of the target the player cannot see.
 *
 * So the tint is pushed out to a narrow annulus and the rim goes *dark*, not
 * bright. The tube wall shadows the last few millimetres of any real optic,
 * and that dark ring is what actually makes the glass read as recessed inside
 * a tube rather than painted across the front of it. The only bright thing is
 * a short arc of sky at the top of the ocular, which is the one specular a
 * shooter genuinely sees.
 */
const GLASS_VERT = /* glsl */ `
  varying vec2 vLocal;
  varying vec3 vView;
  varying vec3 vAxis;
  varying vec3 vRadial;
  varying vec2 vOffAxis;
  void main() {
    vLocal = position.xy;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // All three in eye space, so the fragment can work out how obliquely the
    // element is being seen. CircleGeometry faces +z in its own space, and
    // vRadial carries the outward direction across the disc — a flat circle has
    // no curvature of its own to hand over.
    vView = -mv.xyz;
    vAxis = normalMatrix * vec3(0.0, 0.0, 1.0);
    vRadial = normalMatrix * vec3(position.xy, 0.0);

    // Where the eye sits relative to the optical axis, in the lens's own plane
    // and in metres. Taken from the disc's centre rather than from the fragment:
    // vView swings by a quarter of its own length across a 15 mm element seen
    // from 60 mm away, and using that would draw a radial gradient that has
    // nothing to do with where the shooter's head is.
    vec3 centre = -(modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 axis = normalize(vAxis);
    vec3 perp = centre - axis * dot(centre, axis);
    vOffAxis = vec2(dot(perp, normalize(normalMatrix * vec3(1.0, 0.0, 0.0))),
                    dot(perp, normalize(normalMatrix * vec3(0.0, 1.0, 0.0))));
    gl_Position = projectionMatrix * mv;
  }
`;

const GLASS_FRAG = /* glsl */ `
  varying vec2 vLocal;
  varying vec3 vView;
  varying vec3 vAxis;
  varying vec3 vRadial;
  varying vec2 vOffAxis;
  uniform vec3 uTint;
  uniform float uRadius;
  uniform float uSky;
  uniform float uEdge;
  uniform float uEnv;

  void main() {
    // A flat lens a hand's width from the eye subtends seven degrees, so a
    // Fresnel term off the surface normal is zero everywhere across it and
    // does nothing at all. What varies is the *radius*: the coating is seen
    // through more glass and at a steeper internal angle towards the rim, and
    // the tube shades it there too.
    float r = clamp(length(vLocal) / uRadius, 0.0, 1.0);
    vec2 n = vLocal / max(uRadius, 1e-5);

    // Coating. Weak and blue across the aperture, swinging cooler and slightly
    // violet only in the last fifth where the light is raking through the
    // coating stack. Both of these were a stop more saturated, which was
    // survivable when the optic covered 15% of frame height and read as an oil
    // slick once the shorter eye relief took it to 19.
    // Transmission loss, not a coloured veil. This is the whole fix for the
    // sight picture.
    //
    // Alpha blending computes scene * (1 - a) + col * a, and scene * (1 - a) is
    // exactly what transmission through glass does. So the honest thing to spend
    // the base alpha on is a *dark* col: the world arrives a few per cent down
    // and otherwise untouched. Spending it on a bright blue col instead *adds*
    // light, and that is what this was doing. Measured through the aperture, the
    // world came out 6% brighter than the same world beside the tube with half
    // its warmth gone — B-R fell from -16 to -5 on the same building — which is
    // the "the interior is brighter, hazier and at a different exposure" that
    // got this reported as a broken render-to-texture.
    //
    // It is not one. The elements are alpha-blended discs and the image behind
    // them is never resampled, so the interior cannot be misaligned with the
    // exterior — there is no second camera and no buffer to go stale. It was
    // being washed out, not moved.
    //
    // The coating's own cast now rides on what little the glass holds back,
    // which is where it belongs: a third of a dark blue at four per cent takes a
    // little red out of the transmitted image and leaves its hue otherwise
    // alone.
    // The outer term is the lens vignette. Every optic is dimmer at the edge of
    // its field than in the middle, because the rim of the field is seen through
    // more glass and because the tube crops the cone of light reaching it, and
    // an aperture of exactly uniform brightness out to a hard edge is the look
    // of a hole cut in a card. Roughly a tenth of a stop down at the rim, which
    // is enough for the eye to place the centre without ever being noticed.
    float loss = 0.030 + 0.082 * smoothstep(0.26, 1.0, r);
    vec3 held = mix(uTint, vec3(0.15, 0.14, 0.21), smoothstep(0.78, 1.0, r)) * 0.34;

    // Tube shadow: the last 4.5% of the aperture is the lens seat, in shade.
    //
    // 7% was measured at eight pixels on a sixty-four pixel disc once the rig
    // dimmed for the aiming pose and the seat stopped being lifted by the same
    // overshoot as everything else. The brief for this is a *thin* dark ring —
    // a real 1x optic shows the tube wall as a line, not a band — and the seat
    // and the bore geometry behind it were each contributing half of that eight.
    float wall = smoothstep(0.955, 1.0, r);

    // Scope shadow: the crescent that appears when the eye is not perfectly
    // centred behind the tube.
    //
    // Nobody's cheek weld is exact, and the crescent drifting around the rim as
    // the weapon settles is one of the two or three things that reads as
    // *aiming* rather than as a magnified picture. It is the same geometry the
    // last pass spent its time removing, and the difference is entirely one of
    // degree: at 12 mm off-axis it ate 40% of the field, and at a fraction of a
    // millimetre it is the signature.
    //
    // Which side: displace the eye and the far end of the tube appears to swing
    // the other way, so the wall the eye sees is on the side it moved toward.
    // 60 keeps a sway the ADS clamp holds under a fifth of a millimetre visible
    // without letting it reach the working aperture.
    float offMag = clamp(length(vOffAxis) * 60.0, 0.0, 1.0);
    vec2 offDir = vOffAxis / max(length(vOffAxis), 1e-6);
    float crescent = smoothstep(0.80, 1.0, r)
                   * max(0.0, dot(n, offDir)) * offMag * 0.55;

    // Sky glint — a short arc across the top of the ocular, not a full ring.
    // Pushed out of the working aperture: at 0.66 it reached a third of the way
    // in, and together with the coating's violet swing at the same radius it
    // read as concentric purple banding rather than as one specular.
    float top = smoothstep(0.20, 0.95, n.y) * smoothstep(0.80, 0.95, r)
              * (1.0 - smoothstep(0.95, 1.0, r));

    // The one thing above that is only true while aiming.
    //
    // On-axis a lens is a window, and everything above is written for that
    // case. Off-axis it is a mirror, and the paragraph about Fresnel being
    // useless quietly assumed the aiming case and then applied to both
    // elements in every pose. From the hip the eye sees the front element at
    // sixty to eighty degrees off its axis, where glass reflects a third to a
    // half of what falls on it — so the objective was drawn at four per cent
    // opacity and the tube behind it read as an open length of pipe with the
    // street visible through the bore. Which is exactly what it was.
    //
    // Schlick against the element's own axis. R0 is 0.02 rather than glass's
    // 0.04 because a multi-coated optic is deliberately less reflective head
    // on; the coating gives that back an order of magnitude at grazing angles,
    // and the blue-violet flash off the front of a red dot is the single most
    // recognisable thing about one seen from outside.
    //
    // This is zero when aiming, to five decimal places, so the sight picture is
    // untouched.
    //
    // The element is modelled as a shallow spherical cap rather than as the flat
    // disc the geometry is. That is not decoration: Schlick's fifth power means a
    // flat surface returns almost nothing until seventy degrees, and the eye sees
    // the ocular at fifty-five to sixty from the hip, which measured five per
    // cent — invisible. A real ocular is curved, so at any given moment part of
    // it is at grazing incidence and part is square on, and what the eye picks up
    // is a bright crescent rather than an even sheen. Tilting the normal outward
    // at the rim reproduces that, and it costs one normalize.
    //
    // 0.55 rather than 0.86, and quadratic in the radius rather than linear,
    // which is the actual shape of a spherical cap. At 0.86 the tilt reached 40
    // degrees and the flash covered two thirds of the disc: a blue-white sheen
    // over most of the aperture, which is a plastic cap and not a lens. Now it
    // stays in the outer third, where it belongs.
    vec3 nrm = normalize(normalize(vAxis)
                         + normalize(vRadial + vec3(1e-6)) * (r * r * 0.55));
    float cosI = clamp(abs(dot(normalize(vView), nrm)), 0.0, 1.0);
    // R0 of 0.004, not 0.02. A multi-coated optic is built to reflect a few
    // tenths of a per cent head on, and the difference matters at both ends: 2%
    // of a bright sky is a visible blue veil over the sight picture, and using
    // the too-high figure here forced the grazing-angle gain down to compensate,
    // which is what left the ocular reading as an open pipe from the hip.
    float fres = 0.004 + 0.996 * pow(1.0 - cosI, 5.0);
    // The flash swings from blue toward violet as the angle steepens, which is
    // the coating stack going through its orders. Both ends are much paler than
    // they were: a coating flash is a reflection of the sky, so most of it is
    // whatever the sky's brightness is, and only a fraction of it is hue.
    vec3 flash = mix(vec3(0.52, 0.60, 0.82), vec3(0.66, 0.56, 0.76),
                     smoothstep(0.55, 0.02, cosI));

    // uEdge separates the two lenses. Both surfaces used one material, so the
    // objective drew its own seat shadow and its own glint arc 70 mm in front
    // of the ocular's — two concentric rings inside one tube, which is the
    // signature of a cheap scope model and not of a lens. The far element keeps
    // its tint and gives up almost all of its rim.
    // uEnv is the light probe's own answer for where the player is standing, and
    // it scales everything that is a reflection rather than a surface. Without it
    // the front element flashed as brightly two floors inside a stone building as
    // it did in open sun — the one object in the frame that had not noticed it
    // was indoors, and at 48% saturation against a weapon at 8% it was the
    // brightest thing on the gun.
    float refl = fres * (0.30 + uEnv * 0.85);

    // Reflected sky radiance. The flash above is the hue; this is how much of it
    // there is.
    vec3 sky = flash * (0.55 + uSky * 1.35) * uEnv;

    // Reflectance was being applied twice.
    //
    // col is the radiance leaving this surface, and the blend multiplies it by
    // alpha — so writing the reflection into col as sky * refl while also counting
    // refl in alpha put the frame's share of it at refl squared.
    // At the sixty degrees the eye sees the ocular from off the hip that is 0.3%
    // instead of 6%, which against a flocked bore at 1% is nothing: the glass
    // vanished and the tube read as a length of scaffold pole. Dividing the
    // weighted radiance by the coverage it is spread over is the arithmetic that
    // makes the blend return each term exactly once.
    float shade = (wall * 0.80 + crescent + top * 0.26 * uSky * uEnv) * uEdge;
    float alpha = clamp(loss + shade + refl, 0.0, 0.985);
    vec3 lit = held * (0.42 + uSky * 0.55) * uEnv * (1.0 - wall * 0.88 * uEdge)
             + vec3(0.62, 0.68, 0.80) * top * uSky * uEnv * uEdge;

    // Lateral colour. The last millimetre of a real ocular's field splits into a
    // warm line with a cool one just outside it, because the elements bring the
    // long and short wavelengths to focus at slightly different heights off
    // axis. It is a two-pixel detail and it is one of the few cues that says the
    // image is arriving through a lens rather than through a hole.
    //
    // Added to the numerator rather than to the held colour: the blend
    // multiplies col by alpha, so a term divided by alpha and then multiplied by
    // it again lands on the frame at exactly its own value, whatever the
    // transmission happens to be at that radius.
    // At 0.55 and a tenth of the radius wide this was a blue ring rather than a
    // fringe — a moulded plastic collar inside the tube. Lateral colour is a
    // thing you notice you saw afterwards, so: half the amplitude, half the
    // width, and both ends pulled well back toward grey.
    float fringeBand = smoothstep(0.915, 0.968, r) * (1.0 - smoothstep(0.968, 1.0, r));
    vec3 fringe = mix(vec3(0.26, 0.17, 0.09), vec3(0.12, 0.15, 0.26),
                      smoothstep(0.940, 0.975, r));

    vec3 col = (sky * refl + lit * (loss + shade)
                + fringe * fringeBand * uEdge * uSky * uEnv * 0.26) / max(alpha, 1e-4);
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Compresses a material's albedo and roughness maps toward their own local mean.
 *
 * The library's base maps are authored for the level: a wall five metres away
 * wants strong tonal patches, because that is the only thing keeping a large
 * flat plane alive. The same map on a 45 mm receiver held 400 mm from the eye
 * puts three or four of those patches across the whole object, and patches that
 * size at that contrast do not read as a finish — they read as paint.
 *
 * There is no way to ask for a lower-contrast bake. `MaterialLibrary.get`
 * exposes a tint, and a tint is a multiply: it moves the mean and leaves the
 * ratio between the light and dark patches exactly where it was. The maps
 * themselves are cached per key and shared with the walls, the props and the
 * soldiers, so they cannot be re-baked either.
 *
 * What can be done from here is to sample each map twice — once sharp, once at a
 * mip coarse enough to be the average over the whole part — and lerp between
 * them. The `keep` values are the fraction of the variation that survives, so 1
 * leaves a channel alone and 0 gives a flat one.
 *
 * Roughness needs this at least as much as albedo does, which took a round of
 * captures to find. `gunmetal` burnishes its wear mask down past 0.13 roughness,
 * and at 0.13 a surface is very nearly a mirror: on a receiver held at arm's
 * length those patches picked up whatever was brightest nearby and came back as
 * warm blotches over cold grey — rust, or a camouflage pattern, depending on the
 * scene. Flattening the albedo alone does not touch it, because the mottle is
 * not in the colour, it is in the gloss.
 *
 * Compressing toward `roughness * mean(map)` rather than toward a constant is
 * what keeps each material's authored roughness meaning what it says: the
 * multiplier still sets where the finish sits, and this only decides how far the
 * wear is allowed to swing around it.
 *
 * Two details. The albedo mip has to be squared like the sharp sample because
 * the library stores albedo gamma-2.0 encoded; the mean of the encoded values
 * squared is a few per cent under the true linear mean, which is inside what the
 * tints are calibrated to. And the chained `onBeforeCompile` needs its own
 * program cache key, because the library hands every one of its materials the
 * same one and this shader is no longer that shader.
 */
function softenWear(mat: THREE.MeshStandardMaterial, keep: number, keepRough: number): void {
  if (keep >= 0.999 && keepRough >= 0.999) return;
  // `MaterialLibrary.get` is a cache and the tints below do not vary between
  // weapons, so every weapon after the first is handed the same material
  // objects. Wrapping twice would square `keep` and grow the callback chain by
  // one link per weapon in the loadout.
  if (mat.userData.wpnFlatKeep !== undefined) return;
  mat.userData.wpnFlatKeep = keep;
  const inner = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    inner.call(mat, shader, renderer);
    shader.uniforms.uFlatKeep = { value: keep };
    shader.uniforms.uRghKeep = { value: keepRough };
    // Level 7 of a 1024 map is 8x8, and a part unwrapped at 300 mm per tile
    // spans a fraction of one of those texels, so this is the map's mean with
    // none of its structure. Coarser would be the 1x1 and no cheaper.
    shader.uniforms.uFlatLod = { value: 7 };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uFlatKeep;
         uniform float uRghKeep;
         uniform float uFlatLod;`,
      )
      // <color_fragment> is the first hook after the albedo map has been
      // applied, and the library does not touch it.
      .replace(
        '#include <color_fragment>',
        `#ifdef USE_MAP
           {
             vec3 obFlatMean = texture2DLodEXT( map, vMapUv, uFlatLod ).rgb;
             obFlatMean *= obFlatMean;
             diffuseColor.rgb = mix( diffuse * obFlatMean, diffuseColor.rgb, uFlatKeep );
           }
         #endif
         #include <color_fragment>`,
      )
      // Straight after the map has been folded into roughnessFactor and before
      // the BRDF reads it.
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         #ifdef USE_ROUGHNESSMAP
           roughnessFactor = mix(
             roughness * texture2DLodEXT( roughnessMap, vRoughnessMapUv, uFlatLod ).g,
             roughnessFactor, uRghKeep );
         #endif`,
      );
  };
  mat.customProgramCacheKey = () => 'wpn-soften-wear-v1';
  mat.needsUpdate = true;
}

/**
 * Removes the specular lobe from a surface that must not have one.
 *
 * The inside of the optic tube is authored as flocking: 0x0d0d0e albedo,
 * roughness saturated, environment intensity 0.02 — and it still came back at
 * 30% grey with a blue-grey gradient across it, which is what got the sight
 * picture described as the inside of a plastic bottle cap. Albedo was never the
 * problem. Every dielectric in three.js reflects 4% regardless of how black it
 * is, and saturating the roughness does not remove that lobe, it only spreads
 * it; the view rig casts no shadows, so the far wall of the bore takes the key
 * at full strength and 4% of an unshadowed key is 0.1 linear. Measured, that is
 * the entire annulus: 78-94 out of 255 against a 13/255 base colour.
 *
 * Flocking is a light trap, so the honest description of it is a surface with
 * no specular at all. Killing the term outright is also the only lever that
 * reaches it — metalness would do it, but the library's polymer maps carry a
 * zeroed metalness map that the material's scalar multiplies into nothing.
 *
 * The occlusion term is the other half. A point halfway down an 82 mm tube of
 * 12 mm bore can see the sky through two openings that between them cover a few
 * per cent of its hemisphere; the view rig casts no shadows, so without a
 * standing figure for that the wall takes the key as squarely as the outside of
 * the tube does. 0.3 is generous for the geometry and lands the ring at about a
 * third of the sight picture's brightness, which is what a dark ring is.
 */
function flockInterior(mat: THREE.MeshStandardMaterial, occlusion: number): void {
  if (mat.userData.wpnFlock) return;
  mat.userData.wpnFlock = true;
  const inner = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    inner.call(mat, shader, renderer);
    shader.uniforms.uFlockOcc = { value: occlusion };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlockOcc;')
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
         material.diffuseColor *= uFlockOcc;
         material.diffuseContribution *= uFlockOcc;
         material.specularColor = vec3( 0.0 );
         material.specularColorBlended = vec3( 0.0 );
         material.specularF90 = 0.0;`,
      );
  };
  mat.customProgramCacheKey = () => 'wpn-flock-v1';
  mat.needsUpdate = true;
}

// ------------------------------------------------------------- occlusion --

/** Voxel size for the occupancy grid the occlusion bake marches. */
const OCC_CELL = 0.0025;
/** How far a surface looks for something blocking it. */
const OCC_REACH = 0.055;
/** Rays per vertex, cosine-distributed over the hemisphere about its normal. */
const OCC_RAYS = 14;

/**
 * Bakes ambient occlusion into a per-vertex attribute over the whole assembled
 * weapon, hands included.
 *
 * The view rig casts no shadows. That is the correct trade for four lights on a
 * model that is always on screen, but it means nothing on the weapon is ever
 * shadowed by anything else on the weapon, and the consequences are exactly the
 * three complaints this pass is left with. The receiver deck under the optic
 * takes the key as squarely as the top of the optic does, so aiming fills the
 * bottom of the frame with an unbroken pale plane — measured at 95/255 against a
 * frame whose sunlit stucco is 89 and whose sand is 73, which is a black rifle
 * reading brighter than everything around it. Every joint on the weapon — the
 * mount over the rail, the magazine in its well, the trigger inside its guard —
 * meets with no darkening at all, which is most of why a shape with real
 * geometry in it still reads as a greybox. And the support hand, which does grip
 * the handguard and does have four articulated fingers, has no contact shadow
 * where it touches, so it reads as floating beside the weapon rather than
 * holding it.
 *
 * All three are the same missing term, and a bake is the cheap way to get it: a
 * view model is rigid apart from a bolt and a magazine, so the occlusion between
 * its parts is fixed and can be computed once at load instead of every frame.
 *
 * The method is a voxel occupancy grid rather than ray-triangle intersection.
 * At 2.5 mm the grid resolves the features that matter here — rail slots, the
 * gap under a finger, the recess of the ejection port — and marching one is a
 * few array reads per step rather than a BVH descent. The whole bake is about a
 * fifth of a second per weapon on the two the player carries.
 *
 * Stored as *occlusion* rather than as its complement so that a mesh which
 * somehow reaches this shader without the attribute gets zero, which is the
 * unoccluded case and the behaviour before this existed. The inverse would
 * render it black.
 */
function bakeVertexOcclusion(root: THREE.Object3D, meshes: THREE.Mesh[]): void {
  if (!meshes.length) return;
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const local: THREE.Matrix4[] = [];
  const bounds = new THREE.Box3();
  for (const mesh of meshes) {
    const m = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    local.push(m);
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    bounds.union(geo.boundingBox!.clone().applyMatrix4(m));
  }
  // A margin of one cell, so a surface exactly on the bounding box does not
  // index outside the grid.
  bounds.expandByScalar(OCC_CELL);
  const span = bounds.getSize(new THREE.Vector3());
  const nx = Math.max(1, Math.ceil(span.x / OCC_CELL));
  const ny = Math.max(1, Math.ceil(span.y / OCC_CELL));
  const nz = Math.max(1, Math.ceil(span.z / OCC_CELL));
  const grid = new Uint8Array(nx * ny * nz);
  const ox = bounds.min.x;
  const oy = bounds.min.y;
  const oz = bounds.min.z;

  const solid = (x: number, y: number, z: number): boolean => {
    const i = ((x - ox) / OCC_CELL) | 0;
    if (i < 0 || i >= nx) return false;
    const j = ((y - oy) / OCC_CELL) | 0;
    if (j < 0 || j >= ny) return false;
    const k = ((z - oz) / OCC_CELL) | 0;
    if (k < 0 || k >= nz) return false;
    return grid[(k * ny + j) * nx + i] !== 0;
  };

  // ---- fill ----------------------------------------------------------------
  // Barycentric supersampling at half a cell. Cruder than a conservative
  // rasteriser and enough: a triangle that misses a cell it grazes costs a
  // fraction of one ray out of fourteen.
  const a = new THREE.Vector3();
  const bb = new THREE.Vector3();
  const cc = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  for (let mi = 0; mi < meshes.length; mi++) {
    const geo = meshes[mi].geometry;
    const pos = geo.getAttribute('position');
    const idx = geo.getIndex();
    const count = idx ? idx.count : pos.count;
    const xf = local[mi];
    for (let t = 0; t < count; t += 3) {
      const i0 = idx ? idx.getX(t) : t;
      const i1 = idx ? idx.getX(t + 1) : t + 1;
      const i2 = idx ? idx.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(xf);
      bb.fromBufferAttribute(pos, i1).applyMatrix4(xf);
      cc.fromBufferAttribute(pos, i2).applyMatrix4(xf);
      e1.subVectors(bb, a);
      e2.subVectors(cc, a);
      const reach = Math.max(e1.length(), e2.length(), bb.distanceTo(cc));
      const steps = Math.min(64, Math.max(1, Math.ceil(reach / (OCC_CELL * 0.5))));
      for (let u = 0; u <= steps; u++) {
        for (let v = 0; u + v <= steps; v++) {
          const fu = u / steps;
          const fv = v / steps;
          const px = a.x + e1.x * fu + e2.x * fv;
          const py = a.y + e1.y * fu + e2.y * fv;
          const pz = a.z + e1.z * fu + e2.z * fv;
          const i = ((px - ox) / OCC_CELL) | 0;
          const j = ((py - oy) / OCC_CELL) | 0;
          const k = ((pz - oz) / OCC_CELL) | 0;
          if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) continue;
          grid[(k * ny + j) * nx + i] = 1;
        }
      }
    }
  }

  // ---- sample --------------------------------------------------------------
  // Cosine-weighted golden-spiral kernel in a canonical +Z hemisphere, rotated
  // per vertex. Fixed rather than jittered: a view model is looked at for hours
  // and stochastic AO baked once is a permanent stipple.
  const kernel = new Float32Array(OCC_RAYS * 3);
  for (let i = 0; i < OCC_RAYS; i++) {
    const u = (i + 0.5) / OCC_RAYS;
    const sinT = Math.sqrt(u);
    const phi = i * 2.399963229728653;
    kernel[i * 3] = Math.cos(phi) * sinT;
    kernel[i * 3 + 1] = Math.sin(phi) * sinT;
    kernel[i * 3 + 2] = Math.sqrt(1 - u);
  }

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const bit = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const nrmMat = new THREE.Matrix3();
  const stepLen = OCC_CELL * 0.85;
  const marchSteps = Math.ceil(OCC_REACH / stepLen);
  // Rays leave from a point lifted clear of the surface along its normal, not
  // from the surface itself. Half of a cosine-distributed kernel points within
  // thirty degrees of the tangent plane, and a ray that shallow leaving a
  // vertex embedded in its own voxel re-enters that voxel on its first step:
  // the first bake came back with a fifth of the weapon at the kernel's
  // theoretical maximum, which is the whole model shadowing itself.
  //
  // The lift is backed off where it would start the ray inside something else,
  // which is what happens in a two-millimetre gap between two fingers. Those
  // points genuinely are almost fully occluded, but they have to find that out
  // by marching rather than by beginning underground.
  const LIFT = [OCC_CELL * 1.6, OCC_CELL * 0.8, OCC_CELL * 0.3];
  for (let mi = 0; mi < meshes.length; mi++) {
    const geo = meshes[mi].geometry;
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    if (!nor) continue;
    const xf = local[mi];
    nrmMat.getNormalMatrix(xf);
    const occ = new Float32Array(pos.count);
    for (let vi = 0; vi < pos.count; vi++) {
      p.fromBufferAttribute(pos, vi).applyMatrix4(xf);
      n.fromBufferAttribute(nor, vi).applyMatrix3(nrmMat).normalize();
      axis.set(0, 0, 1);
      if (Math.abs(n.z) > 0.9) axis.set(1, 0, 0);
      tan.crossVectors(axis, n).normalize();
      bit.crossVectors(n, tan);
      let lift = LIFT[LIFT.length - 1];
      for (const candidate of LIFT) {
        if (!solid(p.x + n.x * candidate, p.y + n.y * candidate, p.z + n.z * candidate)) {
          lift = candidate;
          break;
        }
      }
      const sx = p.x + n.x * lift;
      const sy = p.y + n.y * lift;
      const sz = p.z + n.z * lift;
      let hits = 0;
      for (let r = 0; r < OCC_RAYS; r++) {
        const kx = kernel[r * 3];
        const ky = kernel[r * 3 + 1];
        const kz = kernel[r * 3 + 2];
        const dx = tan.x * kx + bit.x * ky + n.x * kz;
        const dy = tan.y * kx + bit.y * ky + n.y * kz;
        const dz = tan.z * kx + bit.z * ky + n.z * kz;
        let s = stepLen;
        for (let m = 0; m < marchSteps; m++, s += stepLen) {
          if (s > OCC_REACH) break;
          if (solid(sx + dx * s, sy + dy * s, sz + dz * s)) {
            // Linear in distance: a finger 2 mm off the handguard darkens it,
            // the same finger 40 mm away barely does.
            hits += 1 - s / OCC_REACH;
            break;
          }
        }
      }
      occ[vi] = hits / OCC_RAYS;
    }
    geo.setAttribute('aWpnOcc', new THREE.BufferAttribute(occ, 1));
  }
}

/** How far the convexity term is allowed to move one material's finish. */
interface Wear {
  /** Fraction of the way to bare metal hard against the arris. */
  amount: number;
  /** Albedo the worn corners tend toward, sRGB. */
  colour: number;
  /** Roughness they tend toward. Burnished, so well under the base finish. */
  roughness: number;
  /** How far the band reaches back from the arris, metres. */
  width: number;
}

/** Positions closer than this are the same point for curvature purposes. */
const EDGE_WELD = 1e-4;
/**
 * Convexity a seed has to reach. The measure below is the mean of
 * `dot(edgeDirection, vertexNormal)` over a point's incident edges, negated: a
 * 90 degree box corner reads 0.577, a 16-sided cylinder's flank 0.098. At 0.18
 * a crease of about twenty degrees starts to count, which keeps the barrel and
 * the optic tube out of it and admits every machined arris.
 */
const EDGE_SEED = 0.18;
/**
 * How far a soft crease is pushed away from the surface before the band is
 * measured, in metres. A 90 degree corner starts at zero and gets the full
 * width; a 25 degree one starts most of a band-width out and gets a trace.
 */
const EDGE_SOFT = 0.014;
/** Distance is only needed out to a band width or two, so the search stops here. */
const EDGE_MAX = 0.02;

/**
 * Bakes the distance from each vertex to the nearest exposed convex edge into
 * `aWpnEdge`, in metres.
 *
 * A rifle does not wear evenly. It wears where it is handled and where it is
 * set down, which on a carried weapon means the corners: the magazine's floor
 * plate, the sharp arris down each side of the receiver, the lips of the
 * ejection port, the crests of the rail teeth, the muzzle crown. Between those
 * the finish is untouched. That distribution is most of what separates a rifle
 * somebody has carried for a year from a render of one, and it is the one thing
 * the material library cannot supply, because a tiling map has no idea where
 * the geometry's edges are.
 *
 * The occlusion bake above already knows where the *concave* features are —
 * that is what occlusion is — but says nothing useful about convex ones, since
 * a corner and the middle of a flat face both see an unobstructed hemisphere
 * and both bake to zero. What separates them is where a point's neighbours sit
 * relative to its own tangent plane: in it on a flat face, below it on a convex
 * edge, and further below the sharper the edge. Averaged over the incident
 * edges that is a signed curvature, and it is one pass over the index buffer.
 *
 * The welding is not optional. Hard-edged geometry splits a box corner into one
 * vertex per face, each carrying its own face normal and connected only to
 * neighbours in its own plane, so every one of them measures dead flat. Welding
 * by position gives the corner a single averaged normal pointing out along the
 * diagonal and all three edges running away beneath it, which is the answer
 * wanted.
 *
 * Curvature alone is not enough to shade with, and the first attempt at this
 * shipped it straight to the fragment shader and painted whole panels silver.
 * The reason is tessellation. `roundedBox` builds a 2x2x2 box and pushes its
 * outer ring onto the fillet, so a face has eight vertices on the round and one
 * in the middle: interpolating a corner term across that ramps it over half the
 * panel, and the panel might be 40 mm wide while the fillet is 1.5 mm. Every
 * revolve and every extrusion here has the same shape of problem.
 *
 * Baking *distance* instead moves the decision into the fragment shader, where
 * a width in millimetres means what it says. The distance field is interpolated
 * rather than the wear, so thresholding it at 2.5 mm gives a 2.5 mm band whether
 * the face it sits on is 4 mm across or 90 — and on a part small enough that
 * every point is within the width, the whole part polishes, which is what
 * happens to a screw head.
 *
 * Distance is geodesic over the welded mesh graph, seeded at the convex edges
 * and relaxed outward. Sharpness enters as a head start: a soft crease is
 * seeded already part of a band-width away, so it fades out on its own rather
 * than needing a second attribute.
 */
function bakeVertexConvexity(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    if (!nor) continue;
    const idx = geo.getIndex();
    const triCount = idx ? idx.count : pos.count;

    const bucketOf = new Int32Array(pos.count);
    const seen = new Map<string, number>();
    let nBuckets = 0;
    for (let i = 0; i < pos.count; i++) {
      const key = `${Math.round(pos.getX(i) / EDGE_WELD)},${Math.round(pos.getY(i) / EDGE_WELD)},${Math.round(pos.getZ(i) / EDGE_WELD)}`;
      let b = seen.get(key);
      if (b === undefined) {
        b = nBuckets++;
        seen.set(key, b);
      }
      bucketOf[i] = b;
    }

    // Unnormalised sum, so a corner shared by three faces ends up with the
    // diagonal and a point shared by two coplanar faces ends up with the plane.
    const bNorm = new Float32Array(nBuckets * 3);
    for (let i = 0; i < pos.count; i++) {
      const b = bucketOf[i] * 3;
      bNorm[b] += nor.getX(i);
      bNorm[b + 1] += nor.getY(i);
      bNorm[b + 2] += nor.getZ(i);
    }
    for (let b = 0; b < nBuckets; b++) {
      const o = b * 3;
      const len = Math.hypot(bNorm[o], bNorm[o + 1], bNorm[o + 2]) || 1;
      bNorm[o] /= len;
      bNorm[o + 1] /= len;
      bNorm[o + 2] /= len;
    }

    const curveSum = new Float32Array(nBuckets);
    const curveN = new Uint32Array(nBuckets);
    const adj: number[][] = Array.from({ length: nBuckets }, () => []);
    const adjLen: number[][] = Array.from({ length: nBuckets }, () => []);
    const tri = [0, 0, 0];
    for (let t = 0; t < triCount; t += 3) {
      tri[0] = idx ? idx.getX(t) : t;
      tri[1] = idx ? idx.getX(t + 1) : t + 1;
      tri[2] = idx ? idx.getX(t + 2) : t + 2;
      for (let e = 0; e < 3; e++) {
        const i = tri[e];
        const j = tri[(e + 1) % 3];
        const bi = bucketOf[i];
        const bj = bucketOf[j];
        if (bi === bj) continue;
        const dx = pos.getX(j) - pos.getX(i);
        const dy = pos.getY(j) - pos.getY(i);
        const dz = pos.getZ(j) - pos.getZ(i);
        const len = Math.hypot(dx, dy, dz);
        if (len < EDGE_WELD) continue;
        const o = bi * 3;
        curveSum[bi] += (dx * bNorm[o] + dy * bNorm[o + 1] + dz * bNorm[o + 2]) / len;
        curveN[bi]++;
        adj[bi].push(bj);
        adjLen[bi].push(len);
      }
    }

    // Bounded multi-source Dijkstra. Nothing beyond EDGE_MAX is shaded, so the
    // frontier stays small and the array scan below is cheaper than a heap.
    const dist = new Float32Array(nBuckets).fill(EDGE_MAX);
    const queue: number[] = [];
    for (let b = 0; b < nBuckets; b++) {
      if (!curveN[b]) continue;
      const convex = -curveSum[b] / curveN[b];
      if (convex < EDGE_SEED) continue;
      // A right-angle arris starts at zero; anything softer starts out in the
      // fade, so the band it gets is proportional to how sharp it actually is.
      const seed = Math.max(0, 0.55 - convex) * EDGE_SOFT;
      if (seed < dist[b]) {
        dist[b] = seed;
        queue.push(b);
      }
    }
    while (queue.length) {
      let at = 0;
      for (let q = 1; q < queue.length; q++) if (dist[queue[q]] < dist[queue[at]]) at = q;
      const b = queue[at];
      queue[at] = queue[queue.length - 1];
      queue.pop();
      const d0 = dist[b];
      const nb = adj[b];
      const nl = adjLen[b];
      for (let k = 0; k < nb.length; k++) {
        const d = d0 + nl[k];
        if (d < dist[nb[k]]) {
          dist[nb[k]] = d;
          queue.push(nb[k]);
        }
      }
    }

    const edge = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) edge[i] = dist[bucketOf[i]];
    geo.setAttribute('aWpnEdge', new THREE.BufferAttribute(edge, 1));
  }
}

/**
 * Applies the baked occlusion.
 *
 * `strength` scales it against the ambient and the environment, where occlusion
 * belongs and where it is free to be full strength. `direct` scales it against
 * the four rig lights, where it is a cheat — but the necessary one, because the
 * defect it exists to fix is a *key* light reaching a surface the optic is
 * sitting on top of. Held well under the ambient term so that a lit face keeps
 * its highlight and only the crevices close up.
 *
 * `wear` is the other half of the same bake: how far the convexity term is
 * allowed to move the finish toward bare burnished metal. See `bakeVertexConvexity`.
 */
function applyVertexOcclusion(
  mat: THREE.MeshStandardMaterial,
  strength: number,
  direct: number,
  wear: Wear,
): void {
  if (mat.userData.wpnOcc) return;
  mat.userData.wpnOcc = true;
  const inner = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (shader, renderer) => {
    inner.call(mat, shader, renderer);
    shader.uniforms.uOccAmb = { value: strength };
    shader.uniforms.uOccDir = { value: direct };
    shader.uniforms.uWearAmt = { value: wear.amount };
    shader.uniforms.uWearCol = { value: new THREE.Color(wear.colour).convertSRGBToLinear() };
    shader.uniforms.uWearRgh = { value: wear.roughness };
    shader.uniforms.uWearWidth = { value: wear.width };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aWpnOcc;
         attribute float aWpnEdge;
         varying float vWpnOcc;
         varying float vWpnEdge;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vWpnOcc = aWpnOcc;
         vWpnEdge = aWpnEdge;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vWpnOcc;
         varying float vWpnEdge;
         uniform float uOccAmb;
         uniform float uOccDir;
         uniform float uWearAmt;
         uniform vec3 uWearCol;
         uniform float uWearRgh;
         uniform float uWearWidth;`,
      )
      // Last hook before the normal and the BRDF, and the only one that has
      // both the finished albedo and the finished roughness in scope at once.
      // Not <color_fragment> or <roughnessmap_fragment>: `softenWear` owns both
      // of those, and this has to land after its flattening rather than before.
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
         if ( uWearAmt > 0.0 ) {
           // vWpnEdge is metres to the nearest arris. Squared so the band is
           // hard against the edge and gone a millimetre later, which is the
           // profile a rubbed corner actually has — a linear ramp reads as a
           // soft airbrushed stripe.
           float t = clamp( vWpnEdge / uWearWidth, 0.0, 1.0 );
           float w = ( 1.0 - t ) * ( 1.0 - t ) * uWearAmt;
           // Corners are where a rifle polishes, but not evenly along their
           // length, and an unbroken bright line down every arris is a wireframe
           // rather than a finish. The library's own wear mask decides which
           // stretches took it: the same map whose broad blotches \`softenWear\`
           // suppresses, readmitted only where there is an edge for it to sit on.
           #ifdef USE_ROUGHNESSMAP
             w *= 0.30 + 1.05 * ( 1.0 - texture2D( roughnessMap, vRoughnessMapUv ).g );
           #endif
           w = clamp( w, 0.0, 1.0 );
           diffuseColor.rgb = mix( diffuseColor.rgb, uWearCol, w );
           roughnessFactor = mix( roughnessFactor, uWearRgh, w * 0.85 );
         }`,
      );
  };
  mat.customProgramCacheKey = (): string =>
    `${prevKey ? prevKey.call(mat) : ''}|wpn-occ-v2`;
  mat.needsUpdate = true;
}

// -------------------------------------------------------------------- build --

interface Batches {
  steel: GeoBatch;
  barrel: GeoBatch;
  alloy: GeoBatch;
  optic: GeoBatch;
  /** Inside of the optic tube, which is flat black on real hardware. */
  bore: GeoBatch;
  polymer: GeoBatch;
  rubber: GeoBatch;
  mag: GeoBatch;
  bolt: GeoBatch;
  glove: GeoBatch;
  sleeve: GeoBatch;
}

export function buildWeaponModel(def: WeaponDef, materials: MaterialLibrary): WeaponModel {
  const group = new THREE.Group();
  group.name = `weapon:${def.id}`;

  // Five genuinely different surfaces. Parkerised steel is dark and slightly
  // glossy; hard-anodised aluminium is paler, flatter and slightly warm;
  // moulded polymer has no metallic response at all; rubber overmould is the
  // roughest thing on the weapon; the glove is cloth. Reading them apart is
  // most of what makes a gun look like an assembly rather than one casting.
  //
  // ---------------------------------------------------------------------------
  // Why almost nothing here is metallic any more
  //
  // The previous pass set the receiver, the handguard and the barrel to
  // metalness 0.9 to 1.0 and then spent its effort calibrating their tints as
  // if they were diffuse albedo. Those are contradictory. Above about 0.8
  // metalness a MeshStandardMaterial has essentially no diffuse term at all:
  // `color` stops being reflectance and becomes the Fresnel F0 of a mirror,
  // and the surface's entire appearance is the environment map convolved by
  // its roughness. The view scene's environment is the sky probe, and it does
  // not know whether the player is standing in the street or inside a
  // building.
  //
  // Measured off the review captures, on the same receiver, under the same
  // `desertMorning` preset:
  //
  //     street    receiver luma  52   (wall 86)
  //     interior  receiver luma 118   (wall 71)
  //
  // Indoors the weapon was 1.7 times brighter than the wall behind it and the
  // optic body measured 162 — brighter than anything else in the frame. That
  // is not a lighting bug being revealed, it is a mirror doing what a mirror
  // does. Outdoors at golden hour the same surface came back at luma 31 with
  // its blue channel above its red, because what a rough mirror pointed at the
  // upper hemisphere mostly sees is sky.
  //
  // The answer is a *middling* metalness on a genuinely rough surface, which is
  // what a phosphate or hard-anodised finish physically is: microns of porous
  // oxide over steel, so some of what you see is the coating's own dielectric
  // reflection and some is the metal underneath. Around 0.3 on the receiver,
  // rather more on a nitrided barrel, most on the fasteners and the bolt.
  //
  // The pass that produced the captures above went to the other extreme and set
  // metalness to zero on the receiver and the optic — the two largest surfaces
  // on the weapon — with roughness saturated. That is a fully rough dielectric,
  // which is a Lambertian surface with no specular lobe at all, and it is the
  // definition of unfired clay. It fixed the chrome and it cost the gun its
  // material identity: a flat grey mass in a bright street, and in the two
  // brightest captures of the set an unreadable black cut-out, because the only
  // thing that distinguishes a dark object from a hole in the image is the
  // highlight running along its edges.
  //
  // ---------------------------------------------------------------------------
  // Why the roughness values are still above 1
  //
  // `roughness` on a MeshStandardMaterial multiplies the roughness map, and the
  // product is clamped to 1. `gunmetal` bakes a wear mask that drops roughness
  // from a matte 0.5 to about 0.13 wherever handling has burnished the phosphate
  // through, so at 1.15 the receiver runs 0.15 to 0.71 — a matte finish with
  // burnished high points, which is what a used weapon looks like and what gives
  // the key something to catch.
  //
  // The previous pass took these to 2.4 and 2.8, far enough to saturate the map
  // and erase the variation entirely. The stated reason was a measured specular
  // floor of 0.123 in display terms on a receiver whose whole albedo was
  // contributing 0.063 — but that floor was the *rig* being some ten times too
  // bright, which the probe in ViewModel has since fixed. Flattening the
  // roughness was treating the symptom on the wrong surface.
  //
  // Reflectance targets, all measured as linear albedo against the library's
  // own base maps: anodised aluminium 5%, glass-filled nylon 3.5%, nitrided
  // steel 3%, Nomex glove 5%. Every tint is a few per cent under what it was, to
  // pay back the energy the restored specular lobe adds.
  // ---------------------------------------------------------------------------
  // Why every tint below is very slightly warm
  //
  // The tints used to lean cool, on the reasoning that a phosphate finish reads
  // cool. It does — but the base map already is. `gunmetal` bakes colorA
  // 0x5e6165 and colorB 0xa9adb2, both about 7% blue over red in sRGB, and a
  // tint multiplies, so a cool tint on a cool map compounds.
  //
  // Measured on the receiver in a street capture: 68,71,81, which is 19% blue
  // over red in display terms and 45% in linear. Worked back through the tint
  // and the map it accounts for the reading exactly — there is nothing else in
  // it, no lighting, no environment. Against warm stone indoors the weapon
  // looked composited in from another scene.
  //
  // Every gunmetal tint is therefore built on the ratio (1, 0.980, 0.971),
  // which is the inverse of the map's own bias less a few per cent so a trace of
  // cool survives. Luma is held where it was; only the hue moves.
  const mats = {
    // Fasteners, pins and the bolt: the only parts still allowed to look like
    // bare metal, and small enough that a hot pixel on one is a highlight
    // rather than a chrome panel.
    steel: materials.get('gunmetal', { color: 0x76736f, roughness: 0.85, metalness: 0.62 }),
    // Nitrided barrel steel. Split out from the fasteners because a muzzle
    // device is the furthest thing from the eye and was the brightest object
    // in the frame, which put a silver full stop on the end of every shot; a
    // treated barrel is near-black and only glances light off its curve, which
    // is what actually reads as steel at that distance.
    barrel: materials.get('gunmetal', { color: 0x424140, roughness: 1.1, metalness: 0.45 }),
    // Hard-anodised aluminium: receiver, handguard, rail, charging handle. The
    // single largest surface on the weapon and therefore the one that decides
    // whether the gun looks like a tool or like jewellery.
    alloy: materials.get('gunmetal', { color: 0x5b5958, roughness: 1.15, metalness: 0.3 }),
    // The optic body is the darkest thing on the weapon and has to stay that
    // way: it rings the sight picture, so anything bright on it competes
    // directly with the thing the player is trying to look at.
    optic: materials.get('gunmetal', { color: 0x444342, roughness: 1.3, metalness: 0.24 }),
    // The inside of the tube, and the only surface here authored as a light trap
    // rather than as a finish.
    //
    // 0x272625 was not nearly dark enough. The view rig casts no shadows, so the
    // far wall of the bore is lit by the key at full strength exactly as the
    // outside of the tube is — and from the hip the eye looks into the objective
    // at sixty degrees off the axis, so that lit wall is most of what shows
    // through the mouth. It came out a pale grey crescent wrapped around the front
    // element, which reads as a piece of scaffold pole with a lens dropped in it.
    //
    // Flocking is a 1%-reflectance surface and this is now authored as one, with
    // the roughness multiplier saturated so there is no specular lobe to catch the
    // key either. Nothing about a bore should respond to light.
    bore: materials.get('polymerBlack', { color: 0x0d0d0e, roughness: 3.0 }),
    // Moulded polymer: stock, pistol grip, handguard shell.
    //
    // This was 0xd0d4da, which is a linear 0.64 — nine tenths of white. On a
    // base map that already sits near 0.05 that put the stock at luma 115 in
    // the aiming capture against a receiver at 26 and a sky at 120, so the one
    // part of the weapon nearest the camera was also the brightest thing on
    // screen: a pale grey wedge across the bottom of the sight picture with
    // nothing on it but polygon facets.
    polymer: materials.get('polymerBlack', { color: 0x4a4848, roughness: 1.25 }),
    rubber: materials.get('polymerBlack', { color: 0x3b3a39, roughness: 1.45 }),
    // A moulded magazine reads a shade lighter than the anodised lower it
    // hangs out of, never darker, and never the same coyote as the glove —
    // two objects the same colour in the same corner of the frame merge into
    // one and the magwell stops reading as a separate mass entirely. A shade
    // lighter, not the near-white 0xf2f5fa this was.
    mag: materials.get('polymerBlack', { color: 0x555352, roughness: 1.2 }),
    // ---- the hands --------------------------------------------------------
    //
    // Off `fabricTarp`, which is why the tints look strange. Both of these were
    // that material, tinted darker and darker across three passes, and the
    // support arm kept coming back as a smooth mustard-khaki tube with no
    // fabric in it and no visible join between the glove and the sleeve —
    // "a cartoon mitten", and the brightest, most saturated object in a golden
    // hour frame at 52% saturation against a sunlit wall's 29%.
    //
    // No tint was ever going to fix it. `fabricTarp` sets the fourth component
    // of its macro amount to 0.4, which switches on the library's settled-dust
    // layer, and that layer is a *mix* toward a fixed warm tan at linear 0.50 —
    // not a multiply. It is keyed on world-up, and the back of a hand and the
    // top of a forearm face up. Worked through: the glove's own albedo was
    // 0.007, the dust reaches 0.29 of 0.50, so the lit top of the hand was
    // ninety-five per cent dust colour and five per cent glove. Correct for a
    // tarpaulin left out in a desert, which is what the material is for.
    //
    // `polymerTan` was the next attempt and it was the same mistake one step
    // smaller. Its dust layer is off, but its three base colours are 0x7d6c50,
    // 0x998a6c and 0x4e4940 and its macro tint is 0xa89f8e — every one of them
    // warm, with red about 1.5 times blue. A tint multiplies, so it can move the
    // *mean* anywhere but it cannot change that ratio, and it cannot make the
    // warm-to-cool variation inside the map agree with a neutral mean. The glove
    // still measured 51% saturation against a sunlit wall's 29% at golden hour.
    //
    // `polymerBlack` is the same POLYMER shader and the same fine matte grain,
    // but its base colours are 0x33343a, 0x4a4d53 and 0x544f45 and its macro
    // tint 0x8f8b86: neutral to a couple of per cent, and dark enough that the
    // tint is doing hue rather than rescuing brightness. Tinted to a desaturated
    // olive it stays olive under a golden sun, because there is no warmth in the
    // map for the sun to find. The seed differs from the handguard's, so the
    // hands do not share a pattern with the thing they are wrapped around.
    //
    // Correcting an overshoot. Chasing the saturation down took the value with
    // it: measured against the weapon beside it, the glove came back at
    // luminance 59 and 2.4% saturation where the receiver was 75 and 3.3% — a
    // hand darker and flatter than the rifle it is holding. Four fingertips, a
    // knuckle row and a thumb are all present in the geometry and none of them
    // could read, because every one of them was a shading difference inside a
    // shape with no tonal separation from its background. That is the whole of
    // "the hand is still a mitten"; it was never missing parts.
    //
    // The way a glove reads in a shipped shooter is by being a *lighter* mass on
    // a dark rifle — coyote or wolf grey on parkerised steel. This lands at
    // about 1.15x the weapon with 5% saturation, which is a tenth of the 51%
    // that got it called a bright yellow-tan blob, and it is warm enough not to
    // be plastic without being tan.
    //
    // The roughness comes down with it. At 1.32 the surface was pure Lambert and
    // the only thing separating one knuckle from the next was the cosine; a
    // little sheen along the tops of the fingers is what says fabric stretched
    // over bone rather than a moulded shell.
    glove: materials.get('polymerBlack', { color: 0xc0baa4, roughness: 1.05 }),
    // The sleeve stays dark. It is the largest object on screen after the
    // weapon and it has nothing to say; its job is to frame the gun, so it
    // sits well under the glove and under the receiver — and the break at the
    // cuff is now a real garment boundary rather than two greys a few per cent
    // apart.
    sleeve: materials.get('polymerBlack', { color: 0x74796a, roughness: 1.5 }),
  };

  // The environment is the world's sky probe, and it is the only light on the
  // weapon that comes from the scene rather than from a rig of our own — the one
  // term that makes a rifle look like it is standing in this level and not in a
  // turntable. It is worth having.
  //
  // It was at 0.075, which is nothing, on the argument that the probe is a sky
  // that does not know whether the player is indoors. True, and answered
  // properly since: `setTone` scales all of these by the light probe every frame,
  // so indoors it goes away on its own. A blanket cut was the wrong instrument.
  //
  // Metal takes more than the coatings, because an image-based reflection *is*
  // most of what a metal looks like, and the bore takes almost none — a flocked
  // tube that reflects the sky is not a bore.
  //
  // This is the one setting that has to be applied after the fact:
  // MaterialLibrary.get does not expose envMapIntensity. It is safe because
  // every tint above is unique to this weapon, so no other caller shares the
  // cache key.
  const ENV: Record<string, number> = { steel: 0.5, barrel: 0.45, bore: 0.02 };
  for (const [name, m] of Object.entries(mats)) {
    m.envMapIntensity = ENV[name] ?? 0.28;
  }

  // How much of each base map's variation survives, as [albedo, roughness]. See
  // `softenWear`.
  //
  // `gunmetal` needs the most help: its wear mask is a straight mix from a
  // 0.113 linear base to a 0.395 linear burnished steel, so a receiver arrives
  // patterned in two tones two and a half stops apart. On a 45 mm receiver the
  // patches are 20 mm across — three or four of them along the visible length —
  // which is the size and contrast of a camouflage scheme, and that is what it
  // read as: pale grey blotches over dark grey, on the optic body too.
  //
  // The same mask drives roughness from 0.5 down past 0.13, and that half needs
  // holding back harder than the albedo does. 0.42 leaves the receiver running
  // 0.40 to 0.63 rough — a matte finish with burnished high points, which is what
  // a carried weapon looks like — where the raw map ran 0.15 to 0.71 and the low
  // end was glossy enough to mirror whatever was warmest in the room.
  //
  // The polymers keep more of both because POLYMER's own mix amounts are already
  // small and its variation is grain rather than patches, and the hands keep the
  // most — fabric that does not vary in tone stops being fabric.
  //
  // The bore keeps nothing. A flocked tube interior is the one surface on the
  // weapon that is meant to be featureless.
  const flatten: Record<keyof typeof mats, [number, number]> = {
    steel: [0.55, 0.6],
    barrel: [0.5, 0.45],
    alloy: [0.4, 0.42],
    optic: [0.4, 0.4],
    bore: [0, 0],
    polymer: [0.7, 0.65],
    rubber: [0.7, 0.65],
    mag: [0.7, 0.65],
    glove: [0.8, 0.75],
    sleeve: [0.8, 0.75],
  };
  for (const [name, m] of Object.entries(mats)) {
    const [albedo, rough] = flatten[name as keyof typeof mats];
    softenWear(m, albedo, rough);
  }
  flockInterior(mats.bore, 0.3);

  // ---- scene-relative environment ------------------------------------------
  //
  // Everything above is calibrated for one lighting condition, and until this
  // pass a view model only ever got one: the environment is a single baked sky
  // probe, so the weapon was handed a bright desert sky two floors inside a
  // building. Auto-exposure then opened up for the dark room and multiplied that
  // fixed light along with everything else.
  //
  //     street    receiver luma  81   (wall 86)   ratio 0.94
  //     interior  receiver luma 144  (wall 71)   ratio 2.03
  //
  // The analytic half of that is solved by taking the weapon off the view
  // scene's lights entirely — see VIEW_MODEL_LAYER. The environment cannot be
  // solved that way, because it is not a light object and no layer mask touches
  // it. What is left is how much of it each material accepts, which is this.
  const envBase = Object.values(mats).map((m) => ({ mat: m, env: m.envMapIntensity }));

  const b: Batches = {
    steel: new GeoBatch(),
    barrel: new GeoBatch(),
    alloy: new GeoBatch(),
    optic: new GeoBatch(),
    bore: new GeoBatch(),
    polymer: new GeoBatch(),
    rubber: new GeoBatch(),
    mag: new GeoBatch(),
    bolt: new GeoBatch(),
    glove: new GeoBatch(),
    sleeve: new GeoBatch(),
  };

  const isPistol = def.class === 'PISTOL';
  const P = proportionsFor(def);
  const muzzle = new THREE.Object3D();
  const ejectionPort = new THREE.Object3D();

  if (isPistol) buildPistol(b, muzzle, ejectionPort);
  else buildRifle(P, b, muzzle, ejectionPort);

  const optics = buildOptic(def, b, isPistol);

  let tone = 1;
  const setTone = (k: number): void => {
    const q = THREE.MathUtils.clamp(k, 0.05, 1.6);
    if (Math.abs(q - tone) < 0.004) return;
    tone = q;
    for (const t of envBase) t.mat.envMapIntensity = t.env * q;
    // The lens coating is a reflection of the sky and has to dim with it too.
    optics.setTone(q);
  };

  // ---- meshes -------------------------------------------------------------
  const magGroup = new THREE.Group();
  const boltGroup = new THREE.Group();
  const owned: THREE.Mesh[] = [];

  const addMesh = (
    name: keyof Batches,
    mat: THREE.Material,
    tile: number,
    parent: THREE.Object3D,
  ): THREE.Mesh | null => {
    const batch = b[name];
    if (batch.empty) return null;
    const mesh = new THREE.Mesh(batch.build(tile), mat);
    // Named because the arms and the weapon share materials now that the gloves
    // are off `polymerBlack`, and separating their frame coverage is the only
    // way to answer "how much of the screen is the gun" with a number.
    mesh.name = `${def.id}:${name}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.layers.set(VIEW_MODEL_LAYER);
    // Everything here is a few centimetres from the near plane and always on
    // screen; a per-mesh frustum test is pure cost.
    mesh.frustumCulled = false;
    parent.add(mesh);
    owned.push(mesh);
    return mesh;
  };

  // The third argument is the world-metres-per-texture-tile that `applyBoxUV`
  // unwraps each batch at, and it is the only thing that decides the grain size
  // on the finished weapon. Note that `tileMetres` on MaterialLibrary.get does
  // *not* do this job — it writes `userData.tileMetres`, which nothing reads,
  // and callers are expected to unwrap their own geometry to match. An hour
  // went into a set of tile overrides passed to `get` that changed nothing at
  // all before that turned up.
  //
  // Swept, because the diagonal ribbing this was meant to explain turned out
  // not to be a tiling problem at all.
  //
  // The brief's reading was that `gunmetal`'s 350 mm tile was stretching across
  // a 45 mm receiver. It is not: `countOf` is evaluated at bake time against the
  // spec's own tile, so unwrapping at 350 mm reproduces the map's authored sizes
  // exactly — 2.5 mm blast, 20 mm wear patches, 30 mm fouling — and those are
  // gun-scale features. Rendered at a quarter of that the wear mask came back as
  // leopard spotting, and at a fifteenth as a fine repeating diamond, because
  // the whole pattern was then cycling four times along the receiver.
  //
  // What actually drew the ribbing was metalness. At 0.9 the wear mask stops
  // varying albedo and starts varying which parts of the weapon are mirrors, so
  // the worn 20 mm patches reflected open sky at full strength and the
  // phosphated ones went black: vivid pale-blue streaks on near-black, exactly
  // the corduroy in the alley capture. With metalness at zero the same mask is a
  // soft two-tone mottle and the library's own tile is the right one.
  //
  // The small parts are the exception: a 5 mm screw head unwrapped at 300 mm is
  // showing a sixtieth of a tile, which is a flat colour.
  const steelMesh = addMesh('barrel', mats.barrel, 0.14, group);
  addMesh('steel', mats.steel, 0.07, group);
  addMesh('alloy', mats.alloy, 0.3, group);
  addMesh('optic', mats.optic, 0.16, group);
  addMesh('bore', mats.bore, 0.09, group);
  addMesh('polymer', mats.polymer, 0.28, group);
  addMesh('rubber', mats.rubber, 0.12, group);
  addMesh('glove', mats.glove, 0.16, group);
  addMesh('sleeve', mats.sleeve, 0.26, group);
  addMesh('mag', mats.mag, 0.28, magGroup);
  addMesh('bolt', mats.steel, 0.07, boltGroup);
  group.add(magGroup, boltGroup);

  optics.attach(group);

  // Everything solid is in place, so the parts can finally be asked what they
  // block for each other. The lens and reticle discs are deliberately not in
  // `owned`: they are transparent, and a sight that occludes the inside of its
  // own tube is the defect this pass started with.
  bakeVertexOcclusion(group, owned);
  bakeVertexConvexity(owned);

  // Where each finish goes when it is rubbed off, and how far.
  //
  // Phosphate over steel wears to the steel, which is a light neutral grey and
  // nearly smooth, so those get the largest swing — the arris down the receiver
  // and the crests of the rail teeth are the two places on a service rifle that
  // are always bright. Polymer has no second material under it: it burnishes,
  // which lightens it a little and takes most of the texture out, so the colour
  // moves barely at all and the roughness does the work. Rubber scuffs matte
  // rather than shiny and hardly moves.
  //
  // The glove gets a small share of the same term, for a different reason. It
  // has four articulated fingers and it has been read as a mitten twice, and
  // the reason is that a matte fabric with no specular and no edge cue gives
  // the eye nothing to separate one finger from the next with. A trace of sheen
  // along the ridge of each one does, and it is what a worn glove looks like.
  // Held to a fifth of the metal's amount and to a roughness that is still
  // fabric, because the two passes before this one were spent getting
  // brightness *out* of the support hand. The sleeve is left alone: it is a
  // smooth tube with nothing to pick out.
  // The widths are the setting that matters and they are all around a
  // millimetre and a half, which is two or three pixels at the distance a view
  // model is held. Tuned down from two and a half: the first pass at this put a
  // 2.6 mm band on the receiver — by area much the largest surface here — and
  // lifted the whole weapon 37% in luminance, to 1.27 times the sunlit ground at
  // golden hour. Auto-exposure then stopped the frame down to compensate and
  // took the world with it, which is the same failure as the chrome bug arriving
  // by a different road. The band has to be narrow enough that it reads as an
  // edge and changes the weapon's tone hardly at all.
  const WEAR: Record<keyof typeof mats, Wear> = {
    steel: { amount: 0.36, colour: 0x8f959d, roughness: 0.26, width: 0.0018 },
    barrel: { amount: 0.24, colour: 0x82878f, roughness: 0.32, width: 0.0013 },
    alloy: { amount: 0.24, colour: 0x888d94, roughness: 0.3, width: 0.0014 },
    optic: { amount: 0.28, colour: 0x81868d, roughness: 0.3, width: 0.0016 },
    bore: { amount: 0, colour: 0, roughness: 1, width: 1 },
    polymer: { amount: 0.17, colour: 0x74757a, roughness: 0.46, width: 0.002 },
    rubber: { amount: 0.07, colour: 0x525459, roughness: 0.68, width: 0.0014 },
    mag: { amount: 0.2, colour: 0x827862, roughness: 0.44, width: 0.002 },
    // 0xc3bdac against an albedo of 0xc0baa4 is three parts in 255: the glove
    // was in this table but the term was arithmetically a no-op, so none of its
    // seams, knuckles or finger ridges were being picked out by it.
    //
    // It is a small term on purpose, and the reason is worth recording because
    // the obvious fix is wrong. Run at 0.3 with the colour 20 parts off the
    // albedo, the seams do gain definition — and the glove goes from 38.2% mean
    // luminance to 41.4% and from 24.4 saturation to 30.3, which is the pale
    // yellow-tan support hand that two earlier passes were spent removing. The
    // albedo is the only lever in this term with real reach on fabric (a crest
    // roughness of 1.05 barely moves however hard it is pushed, because there is
    // no specular under it to expose), so buying edge cue here always costs
    // tone. The cuff's crease lines came from geometry instead: recessing its
    // body 3 mm put the strap step above the occlusion bake's 2.5 mm cell, which
    // buys the same read for nothing.
    glove: { amount: 0.18, colour: 0xcbc5b2, roughness: 0.62, width: 0.0018 },
    sleeve: { amount: 0, colour: 0, roughness: 1, width: 1 },
  };
  for (const [name, m] of Object.entries(mats)) {
    // The bore is already a light trap by hand — see `flockInterior` — and it
    // is the one surface where the two terms stack on the same geometry.
    const k = name === 'bore' ? 0.45 : 1;
    applyVertexOcclusion(m, 0.92 * k, 0.42 * k, WEAR[name as keyof typeof mats]);
  }

  const opticCentre = new THREE.Object3D();
  opticCentre.position.set(0, optics.centreY, optics.centreZ);
  group.add(opticCentre, muzzle, ejectionPort);

  // The weapon lighting itself on every shot is one of the loudest cues that
  // a gun is a real object rather than a decal on the camera. It lives in the
  // view scene so it rakes across the receiver and the hands without leaking
  // into the world.
  const flashLight = new THREE.PointLight(0xffcf8c, 0, 1.6, 2);
  flashLight.position.set(0, 0.006, (isPistol ? -0.16 : P.brakeFront) - 0.035);
  // Onto the view model's own layer with everything else, or the one light whose
  // whole job is to light the weapon is the one that cannot see it.
  flashLight.layers.set(VIEW_MODEL_LAYER);
  group.add(flashLight);

  // ------------------------------------------------------------- behaviour --
  let boltOffset = 0;
  let boltTarget = 0;
  let heat = 0;
  let flash = 0;
  let flashSeed = 0;
  const eyeLocal = new THREE.Vector3();

  const model: WeaponModel = {
    group,
    muzzle,
    ejectionPort,
    opticCentre,
    eyeRelief: optics.eyeRelief,
    sprintPose: {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(-0.16, -0.55, 0.44, 'YXZ'),
    },
    sprintBlend: 0,
    setTone,
    onFire(): void {
      boltOffset = 1;
      heat = Math.min(1, heat + 0.11);
      flash = 1;
      flashSeed = Math.random();
    },
    setMagazineVisible(v: boolean): void {
      magGroup.visible = v;
    },
    setBoltBack(t: number): void {
      boltTarget = t;
    },
    update(f: WeaponFrame): void {
      // The bolt is the only part of the weapon that moves relative to the
      // rest, which makes it the only thing proving the weapon is a mechanism.
      boltOffset = Math.max(boltTarget, boltOffset - f.dt * 26);
      boltGroup.position.z = boltOffset * (isPistol ? 0.026 : 0.021);

      heat = Math.max(0, heat - f.dt * 0.34);
      if (steelMesh) {
        const mat = steelMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setRGB(heat * heat * 0.30, heat * heat * 0.05, 0);
        mat.emissiveIntensity = heat * heat * 1.3;
      }

      flash = Math.max(0, flash - f.dt * 30);
      flashLight.intensity = flash * flash * 30 * (0.7 + flashSeed * 0.6);

      optics.update(f, eyeLocal);
    },
    dispose(): void {
      for (const m of owned) m.geometry.dispose();
      optics.dispose();
    },
  };

  return model;
}

// -------------------------------------------------------------------- rifle --

/** Upper receiver cross-section: flat sides, a shouldered top under the rail. */
function upperSection(): Array<[number, number]> {
  return [
    [0.0180, -0.0142],
    [0.0190, -0.0112],
    [0.0190, 0.0140],
    [0.0172, 0.0218],
    [0.0128, 0.0268],
    [0.0106, RECEIVER_TOP],
    [-0.0106, RECEIVER_TOP],
    [-0.0128, 0.0268],
    [-0.0172, 0.0218],
    [-0.0190, 0.0140],
    [-0.0190, -0.0112],
    [-0.0180, -0.0142],
  ];
}

/** As above with the right wall stepped in five millimetres: the port. */
function upperPortedSection(): Array<[number, number]> {
  return upperSection().map(
    (p): [number, number] => (p[0] > 0.0185 ? [0.0140, p[1]] : [p[0], p[1]]),
  );
}

function handguardSection(w: number): Array<[number, number]> {
  const hw = w / 2;
  const hh = w * 0.43;
  return [
    [hw, -0.0082],
    [hw, 0.0082],
    [hw * 0.62, hh],
    [-hw * 0.62, hh],
    [-hw, 0.0082],
    [-hw, -0.0082],
    [-hw * 0.62, -hh],
    [hw * 0.62, -hh],
  ];
}

function buildRifle(
  P: Proportions,
  b: Batches,
  muzzle: THREE.Object3D,
  ejectionPort: THREE.Object3D,
): void {
  const portFront = -0.080;
  const portBack = -0.020;

  // ------------------------------------------------------- upper receiver ---
  const full = upperSection();
  const ported = upperPortedSection();
  b.alloy.add(extrude(full, P.receiverFront, portFront));
  b.alloy.add(extrude(ported, portFront, portBack));
  b.alloy.add(extrude(full, portBack, P.receiverBack));

  // Barrel nut shroud, where the handguard indexes onto the receiver.
  b.alloy.add(
    revolve(
      [
        { r: 0, z: P.receiverFront - 0.013 },
        { r: 0.0208, z: P.receiverFront - 0.013 },
        { r: 0.0228, z: P.receiverFront - 0.009 },
        { r: 0.0228, z: P.receiverFront + 0.002 },
        { r: 0, z: P.receiverFront + 0.002 },
      ],
      18,
    ),
  );

  // Top rail, in two pieces.
  //
  // The rear 55 mm is a plain bar. When aiming, the line of sight runs almost
  // straight down the rail, so the teeth nearest the eye are seen end-on from
  // 100 mm away: each 45-degree rear ramp turns into a wide bright band, and
  // four or five of them stacked across the bottom of the sight picture read as
  // a radiator rather than as a rail. Cutting slots only where they will be
  // seen from the side is the same reasoning that took the pitch out to 20 mm.
  const railSplit = P.receiverBack - 0.055;
  b.alloy.add(picatinnyRail(railSplit - P.receiverFront - 0.004), {
    y: RECEIVER_TOP,
    z: (P.receiverFront + railSplit) / 2,
  });
  b.alloy.add(picatinnyRail(P.receiverBack - railSplit, 0.0212, { slots: false }), {
    y: RECEIVER_TOP,
    z: (railSplit + P.receiverBack) / 2,
  });

  // Charging handle: a T-bar under the rail with the latch on the left.
  //
  // Anodised aluminium, not steel of any finish. This is the closest part of
  // the weapon to the eye when aiming and it lies across the bottom of the
  // sight picture, so its roughness matters more than that of anything else
  // on the gun: at 0.42 with full metalness it came back as a wet black bar
  // with a specular streak running the length of it, which is a chromed
  // aftermarket part and not what anyone is issued.
  b.alloy.add(roundedBox(0.0195, 0.0060, 0.062, 0.0018, 2), {
    y: 0.0225,
    z: P.receiverBack - 0.020,
  });
  b.alloy.add(roundedBox(0.0520, 0.0072, 0.0150, 0.0022, 2), {
    y: 0.0225,
    z: P.receiverBack + 0.0125,
  });
  b.alloy.add(taperedBox(0.0200, 0.0068, 0.0130, 0.0056, 0.0165, 0.0020, 2), {
    x: -0.0215,
    y: 0.0225,
    z: P.receiverBack + 0.0180,
    ry: -0.22,
  });
  // Serrations on the latch paddle, running fore and aft.
  //
  // This was four ribs 46 mm wide lying *across* the handle, on the argument
  // quoted above — that something has to catch light on the closest part of the
  // weapon to the eye. It does, and that was the problem. In the aiming pose the
  // handle sits 110 mm from the eye, where 2.6 mm of rib is twelve pixels and
  // 46 mm of width is two hundred: four of them stacked in depth directly under
  // the sight picture, each one lit along its top face and shadowed behind, read
  // as a radiator grille or a row of pipes across the bottom third of the frame.
  //
  // Ridges that run fore and aft cannot do that. Looking down the bore they lie
  // along the line of sight instead of across it, so they converge rather than
  // stack, and 1.4 mm of relief on a 20 mm paddle reads as a milled grip at any
  // distance. It is also where the serrations are on the real part: the latch is
  // a thumb paddle, and it is gripped front-to-back.
  const latchRidge = roundedBox(0.0022, 0.0034, 0.0150, 0.0007, 1);
  for (let i = 0; i < 4; i++) {
    b.alloy.add(latchRidge, {
      x: -0.0215 + (i - 1.5) * 0.0044,
      y: 0.0252,
      z: P.receiverBack + 0.0180,
      ry: -0.22,
    });
  }

  // Brass deflector and forward assist: the two lumps that make the right
  // side of this receiver pattern unmistakable at a glance.
  b.alloy.add(taperedBox(0.0195, 0.0215, 0.0125, 0.0135, 0.0072, 0.0030, 2), {
    x: 0.0218,
    y: 0.0045,
    z: portBack + 0.0125,
    ry: Math.PI / 2,
  });
  b.alloy.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0085, z: 0 },
        { r: 0.0085, z: 0.0075 },
        { r: 0.0062, z: 0.0098 },
        { r: 0, z: 0.0098 },
      ],
      12,
    ),
    { x: 0.0182, y: 0.0175, z: portBack + 0.0075, ry: Math.PI / 2 },
  );

  // Port lip, and the bolt carrier riding just inside it.
  b.alloy.add(roundedBox(0.0050, 0.0032, 0.0625, 0.0012, 1), {
    x: 0.0172,
    y: 0.0152,
    z: (portFront + portBack) / 2,
  });
  b.bolt.add(taperedBox(0.0038, 0.0232, 0.0038, 0.0232, 0.0900, 0.0030, 2), {
    x: 0.0143,
    y: 0.0022,
    z: portFront + 0.0400,
  });
  // Bolt face and extractor, visible in the port when the action is open.
  b.bolt.add(roundedBox(0.0060, 0.0190, 0.0075, 0.0020, 2), {
    x: 0.0132,
    y: 0.0022,
    z: portFront - 0.0035,
  });
  b.bolt.add(roundedBox(0.0055, 0.0058, 0.0140, 0.0016, 1), {
    x: 0.0152,
    y: 0.0092,
    z: portFront + 0.0140,
  });
  ejectionPort.position.set(0.022, 0.006, portFront + 0.020);

  // Bolt catch and selector, on the left flank.
  //
  // Everything above — the port, the deflector, the forward assist, the bolt face
  // — is on the right, and in the hip pose the eye never sees any of it. Raycast
  // through the receiver at four points and every hit comes back at x = -19 to
  // -21 mm with its normal at -1.00: the camera sits behind and inboard of the
  // weapon, so the flank presented to it is the left one, and that flank carried
  // nothing but takedown pins over its whole length.
  //
  // These are the two controls that belong there, and they are the two a viewer
  // checks on the side they can see. The catch is a paddle with a shelf under it
  // and the selector a boss with a lever, both at the sizes they are on the
  // hardware: 4 mm of relief at 300 mm from the eye is seven pixels.
  b.alloy.add(roundedBox(0.0042, 0.0092, 0.0245, 0.0014, 1), {
    x: -0.0202,
    y: 0.0016,
    z: -0.0575,
  });
  b.alloy.add(roundedBox(0.0050, 0.0060, 0.0088, 0.0016, 1), {
    x: -0.0206,
    y: -0.0026,
    z: -0.0468,
  });
  b.alloy.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0068, z: 0 },
        { r: 0.0068, z: 0.0034 },
        { r: 0.005, z: 0.0046 },
        { r: 0, z: 0.0046 },
      ],
      14,
    ),
    { x: -0.0186, y: -0.0092, z: -0.0068, ry: -Math.PI / 2 },
  );
  b.alloy.add(taperedBox(0.0044, 0.0086, 0.0038, 0.0062, 0.0210, 0.0014, 1), {
    x: -0.0224,
    y: -0.0104,
    z: 0.0034,
    rx: 0.30,
  });

  // Takedown pins.
  const pin = revolve(
    [
      { r: 0, z: 0 },
      { r: 0.0044, z: 0 },
      { r: 0.0044, z: 0.0022 },
      { r: 0.0030, z: 0.0026 },
      { r: 0, z: 0.0026 },
    ],
    10,
  );
  b.steel.addMirrored(pin, { x: 0.0164, y: -0.0215, z: -0.1205, ry: Math.PI / 2 });
  b.steel.addMirrored(pin, { x: 0.0164, y: -0.0215, z: 0.0020, ry: Math.PI / 2 });

  // ------------------------------------------------------- lower receiver ---
  b.alloy.add(
    extrude(roundRectSection(0.0330, 0.0335, 0.0060, 2), -0.1280, P.receiverBack),
    { y: -0.0298 },
  );

  // Magazine well: flared, raked forward, and a genuinely separate mass from
  // the receiver body rather than the same box made taller.
  const rake = Math.PI / 2 + 0.10;
  b.alloy.add(
    extrude(
      [
        [0.0185, -0.0300],
        [0.0185, 0.0300],
        [0.0150, 0.0340],
        [-0.0150, 0.0340],
        [-0.0185, 0.0300],
        [-0.0185, -0.0300],
        [-0.0150, -0.0340],
        [0.0150, -0.0340],
      ],
      -0.0640,
      0,
      { capBack: false },
    ),
    { y: -0.0880, z: -0.0855, rx: rake },
  );
  b.alloy.add(
    extrude(
      [
        [0.0208, -0.0330],
        [0.0208, 0.0330],
        [-0.0208, 0.0330],
        [-0.0208, -0.0330],
      ],
      -0.0095,
      0,
      { capFront: false },
    ),
    { y: -0.0880, z: -0.0855, rx: rake },
  );

  // Trigger guard: a real loop, and a trigger inside it the finger can reach.
  const guard = new THREE.TorusGeometry(0.0192, 0.0029, 6, 20, Math.PI);
  guard.rotateY(Math.PI / 2);
  guard.rotateX(Math.PI);
  b.alloy.add(guard, { y: -0.0472, z: -0.0300 });
  b.alloy.add(roundedBox(0.0058, 0.0110, 0.0058, 0.0016, 1), { y: -0.0430, z: -0.0492 });
  b.alloy.add(roundedBox(0.0058, 0.0110, 0.0058, 0.0016, 1), { y: -0.0430, z: -0.0108 });
  b.steel.add(taperedBox(0.0062, 0.0170, 0.0058, 0.0125, 0.0075, 0.0022, 2), {
    y: -0.0400,
    z: -0.0305,
    rx: 0.20,
  });

  // Controls. Small, but their absence is exactly what makes a procedural gun
  // look unfinished: a receiver with no visible way to operate it.
  b.alloy.add(roundedBox(0.0070, 0.0140, 0.0140, 0.0035, 2), {
    x: 0.0178,
    y: -0.0225,
    z: -0.0460,
  });
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0045, z: 0 },
        { r: 0.0045, z: 0.0032 },
        { r: 0, z: 0.0032 },
      ],
      10,
    ),
    { x: 0.0202, y: -0.0225, z: -0.0460, ry: Math.PI / 2 },
  );
  b.steel.add(taperedBox(0.0052, 0.0125, 0.0046, 0.0092, 0.0300, 0.0018, 2), {
    x: -0.0192,
    y: -0.0208,
    z: -0.0475,
  });
  b.steel.add(roundedBox(0.0058, 0.0135, 0.0100, 0.0022, 2), {
    x: -0.0194,
    y: -0.0232,
    z: -0.0610,
  });
  // Selector lever, both sides, set to fire.
  const selector = taperedBox(0.0046, 0.0092, 0.0038, 0.0064, 0.0215, 0.0016, 2);
  b.steel.addMirrored(selector, { x: 0.0196, y: -0.0312, z: 0.0055, rx: 0.62 });
  b.steel.addMirrored(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0070, z: 0 },
        { r: 0.0070, z: 0.0026 },
        { r: 0, z: 0.0026 },
      ],
      12,
    ),
    { x: 0.0166, y: -0.0250, z: -0.0030, ry: Math.PI / 2 },
  );

  // ----------------------------------------------------------------- grip ---
  const gripAngle = 1.0645; // 61 degrees from horizontal
  const gripDir = new THREE.Vector3(0, -Math.sin(gripAngle), Math.cos(gripAngle));
  const gripTop = new THREE.Vector3(0, -0.0300, -0.0040);
  b.polymer.add(
    extrude(roundRectSection(0.0325, 0.0435, 0.0105, 3), 0.0, 0.1000, {
      capFront: false,
      capBack: true,
    }),
    { x: gripTop.x, y: gripTop.y, z: gripTop.z, rx: gripAngle },
  );
  // Flared base, and the beavertail the web of the hand sits under.
  b.polymer.add(taperedBox(0.0340, 0.0300, 0.0250, 0.0200, 0.0170, 0.0075, 2), {
    y: gripTop.y + gripDir.y * 0.1035,
    z: gripTop.z + gripDir.z * 0.1035,
    rx: gripAngle,
  });
  b.polymer.add(taperedBox(0.0300, 0.0230, 0.0330, 0.0300, 0.0170, 0.0080, 2), {
    y: gripTop.y + gripDir.y * 0.001 + 0.0055,
    z: gripTop.z + gripDir.z * 0.001 + 0.0100,
    rx: gripAngle - 0.35,
  });
  // Moulded grip panels.
  b.rubber.addMirrored(gripTexture(0.0290, 0.0620, 5, 11, 0.0009), {
    x: 0.0164,
    y: gripTop.y + gripDir.y * 0.0520,
    z: gripTop.z + gripDir.z * 0.0520,
    ry: Math.PI / 2,
    rx: gripAngle,
  });
  b.rubber.add(gripTexture(0.0230, 0.0560, 4, 10, 0.0009), {
    y: gripTop.y + gripDir.y * 0.0500 - Math.cos(gripAngle) * 0.0220,
    z: gripTop.z + gripDir.z * 0.0500 - Math.sin(gripAngle) * 0.0220,
    rx: gripAngle + Math.PI / 2,
  });

  // ------------------------------------------------------------ handguard ---
  const hw = P.handguardWidth;
  b.alloy.add(
    extrude(handguardSection(hw), P.handguardFront, P.receiverFront + 0.001, {
      capFront: false,
      capBack: false,
      skipEdges: [0, 4, 6],
    }),
  );
  const panelLen = P.receiverFront - P.handguardFront - 0.022;
  const panelMid = (P.receiverFront + P.handguardFront) / 2 - 0.004;
  const sidePanel = slottedPanel(0.0164, panelLen, P.mlokSlots, 0.0098, 0.0330, 0.0055);
  b.alloy.add(sidePanel, { x: hw / 2, z: panelMid, ry: Math.PI / 2, rz: Math.PI / 2 });
  b.alloy.add(sidePanel, { x: -hw / 2, z: panelMid, ry: -Math.PI / 2, rz: -Math.PI / 2 });
  b.alloy.add(slottedPanel(hw * 0.62, panelLen, P.mlokSlots, 0.0098, 0.0330, 0.0055), {
    y: -hw * 0.43,
    z: panelMid,
    rx: Math.PI / 2,
    rz: Math.PI,
  });

  // The raised spine that carries the rail up to receiver height.
  b.alloy.add(
    extrude(
      [
        [0.0124, -0.0060],
        [0.0106, 0.0072],
        [-0.0106, 0.0072],
        [-0.0124, -0.0060],
      ],
      P.handguardFront,
      P.receiverFront + 0.001,
      { capBack: false },
    ),
    { y: RECEIVER_TOP - 0.0072 },
  );
  // Top rail, slotted only where nothing is standing on it.
  //
  // A continuously slotted handguard rail was wrong twice over. The support
  // hand's fingers cross the rail at the grip station and the solver closes
  // them on a circle 26.6 mm off the bore, which is under the 32.3 mm the teeth
  // stand at — so the teeth were coming up *through* the fingers. And a run of
  // 10 mm slots under the knuckles is the busiest 90 mm of the whole frame, at
  // the one place where the eye is already trying to resolve four fingers.
  //
  // Splitting it is also simply what the part looks like: an M-LOK handguard
  // carries rail at the receiver end for a light or a laser and a short piece at
  // the muzzle end for a folding sight, and the middle — where the hand goes —
  // is left plain, because that is where the hand goes.
  const railGapBack = P.supportHandZ + 0.044;
  const railGapFront = P.supportHandZ - 0.048;
  const railRuns: Array<[number, number, boolean]> = [
    [railGapBack, P.receiverFront + 0.001, true],
    [railGapFront, railGapBack, false],
    [P.handguardFront + 0.001, railGapFront, true],
  ];
  for (const [z0, z1, slots] of railRuns) {
    const len = z1 - z0;
    if (len < 0.012) continue;
    // Under a slot and a half there is nothing to slot: a two-tooth stub reads
    // as a pair of lumps, which is the artefact this is here to avoid.
    b.alloy.add(picatinnyRail(len, 0.0212, { slots: slots && len > 0.030 }), {
      y: RECEIVER_TOP,
      z: (z0 + z1) / 2,
    });
  }
  b.alloy.add(
    extrude(handguardSection(hw + 0.0022), P.handguardFront - 0.0055, P.handguardFront + 0.0005),
  );
  const screw = screwHead(0.0027, 0.0016);
  b.steel.addMirrored(screw, { x: hw / 2, y: -0.0128, z: P.receiverFront - 0.0140, ry: Math.PI / 2 });
  b.steel.addMirrored(screw, { x: hw / 2, y: -0.0128, z: P.handguardFront + 0.0170, ry: Math.PI / 2 });

  // QD sling socket on the left of the handguard.
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0060, z: 0 },
        { r: 0.0060, z: 0.0034 },
        { r: 0.0031, z: 0.0034 },
        { r: 0.0031, z: -0.0006 },
      ],
      12,
    ),
    { x: -hw / 2 + 0.0006, y: -0.0125, z: P.handguardFront + 0.0500, ry: -Math.PI / 2 },
  );

  // --------------------------------------------------------------- barrel ---
  b.barrel.add(
    revolve(
      [
        { r: 0, z: P.brakeFront + 0.0025 },
        { r: 0.0094, z: P.brakeFront + 0.0025 },
        { r: 0.0094, z: P.handguardFront - 0.0300 },
        { r: 0.0114, z: P.handguardFront - 0.0260 },
        { r: 0.0114, z: P.receiverFront - 0.0300 },
        { r: 0.0142, z: P.receiverFront - 0.0260 },
        { r: 0.0142, z: P.receiverFront },
        { r: 0, z: P.receiverFront },
      ],
      14,
    ),
  );
  // Low-profile gas block, glimpsed through the forward M-LOK cuts.
  b.barrel.add(roundedBox(0.0200, 0.0215, 0.0300, 0.0030, 2), {
    y: 0.0018,
    z: P.handguardFront + 0.0300,
  });

  // -------------------------------------------------------- muzzle device ---
  const bz = P.brakeFront;
  const boreR = 0.0040;
  b.barrel.add(
    revolve(
      [
        { r: 0, z: bz + 0.0300 },
        { r: boreR, z: bz + 0.0300 },
        { r: boreR, z: bz + 0.0016 },
        { r: boreR + 0.0018, z: bz },
        { r: 0.0142, z: bz },
        { r: 0.0142, z: bz + 0.0075 },
        { r: 0.0094, z: bz + 0.0085 },
        { r: 0.0094, z: bz + 0.0165 },
        { r: 0.0142, z: bz + 0.0175 },
        { r: 0.0142, z: bz + 0.0245 },
        { r: 0.0094, z: bz + 0.0255 },
        { r: 0.0094, z: bz + 0.0335 },
        { r: 0.0142, z: bz + 0.0345 },
        { r: 0.0142, z: bz + 0.0430 },
        { r: 0.0124, z: bz + 0.0468 },
        { r: 0.0124, z: bz + 0.0560 },
        { r: 0, z: bz + 0.0560 },
      ],
      18,
    ),
  );
  // Closed underside: the ports vent up and out, never down, or the blast
  // throws dust straight back into the shooter's face.
  b.barrel.add(roundedBox(0.0120, 0.0130, 0.0330, 0.0018, 2), {
    y: -0.0085,
    z: bz + 0.0210,
  });
  // Ports. The stepped body already reads as a brake in profile, but from
  // above — which is the only angle the player ever sees it from — it was a
  // smooth tube. Three pairs of blast baffles put slots on the skyline.
  const baffle = roundedBox(0.0290, 0.0130, 0.0034, 0.0012, 1);
  for (let i = 0; i < 3; i++) {
    b.barrel.add(baffle, { y: 0.0062, z: bz + 0.0085 + i * 0.0170 });
  }
  muzzle.position.set(0, 0, bz - 0.004);

  // Front sight, folded. Standing it up put the post a third of the way into
  // the sight picture, which is a co-witness nobody asked for; folded it
  // still breaks the skyline of the handguard and stays under the glass.
  b.barrel.add(taperedBox(0.0174, 0.0092, 0.0152, 0.0072, 0.0230, 0.0022, 2), {
    y: RAIL_TOP + 0.0044,
    z: P.handguardFront + 0.0230,
  });
  b.barrel.add(taperedBox(0.0128, 0.0180, 0.0106, 0.0150, 0.0058, 0.0016, 1), {
    y: RAIL_TOP + 0.0062,
    z: P.handguardFront + 0.0332,
    rx: Math.PI / 2 - 0.14,
  });
  // Hinge boss, so it reads as a part that folds rather than a lump.
  b.steel.addMirrored(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0038, z: 0 },
        { r: 0.0038, z: 0.0016 },
        { r: 0, z: 0.0016 },
      ],
      10,
    ),
    { x: 0.0080, y: RAIL_TOP + 0.0050, z: P.handguardFront + 0.0270, ry: Math.PI / 2 },
  );

  buildStock(P, b);
  buildMagazine(P, b);
  buildRifleHands(P, gripTop, gripDir, b);
}

function buildStock(P: Proportions, b: Batches): void {
  const back = P.stockBack;
  b.alloy.add(
    revolve(
      [
        { r: 0, z: P.receiverBack },
        { r: 0.0188, z: P.receiverBack },
        { r: 0.0188, z: P.receiverBack + 0.0100 },
        { r: 0.0152, z: P.receiverBack + 0.0125 },
        { r: 0.0152, z: back - 0.0040 },
        { r: 0, z: back - 0.0040 },
      ],
      14,
    ),
  );
  // Castle nut and receiver end plate. Two rings 10 mm long, and they earn
  // their place: the receiver extension behind them is the closest object to
  // the eye when aiming and it is a smooth cylinder, so it came back as one
  // blank pale wedge across the bottom of the sight picture. Anything with an
  // edge on it there gives the eye a scale and a horizon.
  b.steel.add(
    revolve(
      [
        { r: 0.0155, z: P.receiverBack + 0.0010 },
        { r: 0.0196, z: P.receiverBack + 0.0016 },
        { r: 0.0196, z: P.receiverBack + 0.0056 },
        { r: 0.0158, z: P.receiverBack + 0.0064 },
      ],
      16,
    ),
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    b.steel.add(roundedBox(0.0042, 0.0070, 0.0040, 0.0012, 1), {
      x: Math.sin(a) * 0.0180,
      y: Math.cos(a) * 0.0180,
      z: P.receiverBack + 0.0036,
      rz: -a,
    });
  }

  // Stock body. Run forward far enough to sheathe most of the extension: on a
  // real carbine the stock slides over the tube and only a castle nut's width
  // of it is ever bare.
  //
  // Sunk 5 mm and shaved 5 mm off the section. The eye-relief note in
  // buildOptic explains why this matters: the top plane of this box is what
  // formed the wedge across the bottom of the aiming picture, and every
  // millimetre off its top edge is roughly two per cent of frame height.
  // A shallower stock is also the more accurate shape — the previous section
  // stood 29 mm over the bore, which is a shotgun's comb, where a carbine's
  // tube-over-buffer stock is nearer 21.
  b.polymer.add(
    extrude(roundRectSection(0.0410, 0.0510, 0.0110, 3), back - 0.1180, back - 0.0180),
    { y: -0.0040 },
  );
  // Comb.
  //
  // This is the single largest object in the aiming picture — the eye sits
  // five centimetres from it, so it is magnified past anything else on the
  // weapon and a plain box here reads as a grey wall across the bottom sixth
  // of the screen. It gets a lower, narrower core than the first version so
  // less of it is in frame at all, then a rubber cheek pad and a pair of
  // moulded flutes so that what remains has a horizon line and a material
  // change rather than one unbroken plane of sky-lit polymer.
  const combY = 0.0187;
  b.polymer.add(taperedBox(0.0292, 0.0125, 0.0243, 0.0102, 0.0850, 0.0048, 2), {
    y: combY,
    z: back - 0.0580,
    rx: -0.05,
  });
  b.rubber.add(taperedBox(0.0214, 0.0050, 0.0186, 0.0044, 0.0668, 0.0022, 2), {
    y: combY + 0.0058,
    z: back - 0.0596,
    rx: -0.05,
  });
  for (const sx of [-1, 1]) {
    b.polymer.add(taperedBox(0.0044, 0.0072, 0.0038, 0.0062, 0.0700, 0.0018, 1), {
      x: sx * 0.0128,
      y: combY + 0.0022,
      z: back - 0.0590,
      rx: -0.05,
    });
  }
  // Length-of-pull detents down the underside of the comb: six shadow lines
  // that give the stock a scale reference from any angle.
  for (let i = 0; i < 6; i++) {
    b.polymer.add(roundedBox(0.0300, 0.0034, 0.0038, 0.0014, 1), {
      y: combY - 0.0058,
      z: back - 0.0930 + i * 0.0140,
    });
  }
  b.polymer.add(taperedBox(0.0340, 0.0280, 0.0300, 0.0230, 0.0500, 0.0070, 2), {
    y: -0.0270,
    z: back - 0.0360,
    rx: 0.12,
  });
  b.polymer.add(taperedBox(0.0420, 0.0740, 0.0400, 0.0700, 0.0130, 0.0060, 2), {
    y: -0.0060,
    z: back - 0.0140,
    rx: -0.13,
  });
  b.rubber.add(taperedBox(0.0400, 0.0715, 0.0330, 0.0640, 0.0120, 0.0055, 2), {
    y: -0.0055,
    z: back - 0.0020,
    rx: -0.13,
  });
  b.polymer.add(taperedBox(0.0130, 0.0135, 0.0110, 0.0100, 0.0420, 0.0035, 2), {
    y: -0.0320,
    z: back - 0.0700,
    rx: 0.22,
  });
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0062, z: 0 },
        { r: 0.0062, z: 0.0040 },
        { r: 0.0032, z: 0.0040 },
        { r: 0.0032, z: -0.0004 },
      ],
      12,
    ),
    { x: -0.0200, y: -0.0080, z: back - 0.0840, ry: -Math.PI / 2 },
  );
}

function buildMagazine(P: Proportions, b: Batches): void {
  // A curved box magazine built as raked segments, so the curve is in the
  // silhouette rather than implied by a texture.
  const rake = Math.PI / 2 + 0.10;
  const segs = P.magRounds >= 30 ? 4 : 3;
  const segLen = P.magRounds >= 30 ? 0.0345 : 0.0300;
  const curve = 0.052;

  const cursor = new THREE.Vector3(0, -0.0870, -0.0855);
  const dir = new THREE.Vector3();
  let angle = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(segs - 1, 1);
    const w = 0.0248 - t * 0.0010;
    const d = 0.0300 - t * 0.0022;
    b.mag.add(
      extrude(roundRectSection(w, d, 0.0045, 2), 0, segLen + 0.0015, {
        capFront: i === 0,
        capBack: false,
      }),
      { x: cursor.x, y: cursor.y, z: cursor.z, rx: rake + angle },
    );
    if (i > 0) {
      b.mag.addMirrored(roundedBox(0.0022, 0.0058, 0.0175, 0.0008, 1), {
        x: 0.0126,
        y: cursor.y - Math.cos(0.10 + angle) * segLen * 0.5,
        z: cursor.z - Math.sin(0.10 + angle) * segLen * 0.5,
        rx: rake + angle,
      });
    }
    dir.set(0, -Math.cos(0.10 + angle), -Math.sin(0.10 + angle));
    cursor.addScaledVector(dir, segLen);
    angle += curve;
  }
  // Floor plate with a finger ledge.
  b.mag.add(
    extrude(roundRectSection(0.0274, 0.0330, 0.0042, 2), -0.0010, 0.0130, { capFront: false }),
    { x: cursor.x, y: cursor.y, z: cursor.z, rx: rake + angle },
  );
}

/**
 * Poses the two hands onto the weapon.
 *
 * Neither grip is authored as angles. Each names the part being held — its
 * axis, its radius, and where around it the knuckles sit — and the solver in
 * `Hands` returns the transform and the joint angles that close the fingers on
 * that surface. The support hand takes the modern thumb-forward hold on the
 * handguard, the trigger hand wraps the grip with the index reaching the
 * trigger face, and both forearms are aimed at an elbow far enough back that
 * the sleeve leaves the frame rather than stopping inside it.
 */
function buildRifleHands(
  P: Proportions,
  gripTop: THREE.Vector3,
  gripDir: THREE.Vector3,
  b: Batches,
): void {
  // ---- trigger hand ------------------------------------------------------
  // Axis up the grip, so the right thumb comes off the top end by the
  // selector. The wrist sits just off the backstrap and the palm sweeps round
  // the right side, which puts the fingers on the front of the grip and the
  // fingertips back against the heel of the hand on the left — the shape a
  // closed fist on a pistol grip actually makes.
  const right = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0455),
    axis: gripDir.clone().negate(),
    radius: 0.0198,
    up: new THREE.Vector3(0, gripDir.z, -gripDir.y).normalize(),
    wrist: 0.30,
  });
  buildHand(
    {
      side: 'right',
      fingers: [
        // The index leaves the wrap: it is on the trigger, which is forward of
        // the grip and a good deal straighter than a closed finger. It still
        // has to *stop* on the trigger, though — the flatter first version
        // reached clean through the guard and put a fingertip out in the air
        // on the far side, which is the sort of thing nobody consciously
        // notices and everybody registers as wrong.
        { curl: [0.60, 1.18, 0.86], spread: -0.09, lift: -0.40 },
        { curl: right.curls[1], spread: 0.02 },
        { curl: right.curls[2], spread: 0.07 },
        { curl: right.curls[3], spread: 0.15 },
      ],
      // Lying along the frame just under the selector, pointing downrange
      // rather than standing off it: a thumb that leaves the receiver reads
      // from above as a stray finger with nothing to do.
      thumb: { dir: new THREE.Vector3(-0.13, 0.26, -0.957), curl: [0.60, 0.54] },
      forearm: { dir: new THREE.Vector3(0.34, -0.50, 0.80), length: 0.34 },
      cup: right.cup,
    },
    right.place,
    b.glove,
    b.sleeve,
  );

  // ---- support hand ------------------------------------------------------
  // Axis toward the shooter, so the left thumb comes off the downrange end of
  // the palm and lies along the handguard. The wrist enters low on the left,
  // the palm crosses the underside, and the fingers close up the far side and
  // over the top towards the eye — which is the half of the grip the player
  // can actually see, and the reason to take the trouble at all.
  const left = solveCylinderGrip({
    centre: new THREE.Vector3(0, 0, P.supportHandZ),
    axis: new THREE.Vector3(0, 0, 1),
    // The handguard is not a cylinder, so one radius cannot touch all of it: the
    // section is 42 mm across the flats and 36 mm deep, and the palm crosses the
    // *bottom* while the fingers close on the *flank*. Solving on 0.56 — chosen
    // to clear the top rail back when the wrap still went over the top — put the
    // circle at 23.5 mm, which is 2 mm off the flank and 5.5 mm off the
    // underside. At 300 mm from the eye 5.5 mm is eight pixels of daylight
    // between the glove and the gun, and a hand that does not touch the thing it
    // is holding is the single loudest tell a view model has.
    //
    // 0.465 is the compromise the section allows: 19.5 mm, so the fingers bed
    // 1.5 mm into the flank and the palm sits 1.4 mm — two pixels — off the
    // underside. Interpenetration on the side the player cannot see is free;
    // a gap on the side they can is not. The rail is no longer a constraint,
    // because `close` below now finishes the wrap on the near flank rather than
    // over the top.
    radius: P.handguardWidth * 0.465,
    up: new THREE.Vector3(0, 1, 0),
    // 2.42 rad put the wrist at 139° round from the top — low on the near side,
    // which is where a support wrist goes. 2.20 is 13° higher and is the whole
    // of what buys the clean top line below: it starts the wrap earlier, so the
    // same hand finishes earlier too.
    wrist: 2.20,
    // Past a full wrap, deliberately, and this number is measured rather than
    // taste.
    //
    // The brief reports "a row of discrete alternating light/dark blobs that
    // looks like a bicycle chain or a belt of ammunition sitting on the
    // receiver". That is not the rail — it is these four fingertips. They were
    // cresting the top of the handguard by 5 px across a 44 px band, so the
    // weapon's top edge was scalloped with sky showing through the gaps, and
    // four 20 px lumps in silhouette bead no matter how well they are shaded.
    //
    // A fingertip against the *receiver* is a shaded form and reads as a finger;
    // the same fingertip against the *sky* is an outline and reads as a bead. So
    // the target is not to hide the hand, it is to keep all of it below the top
    // line. Closing tucks the tips down the near flank: 1.26 is where the crest
    // reaches zero and 1.28 leaves a little for breathing and sway to spend.
    //
    // 1.28 also over-solved the other way. Curling that hard folds all four tips
    // down behind the handguard, so from the shooter's eye the hand is one
    // rounded mass with nothing on it — the geometry is articulated and none of
    // the articulation is in view. The target is not the top line, it is the
    // near *flank*: a fingertip there is shaded against the handguard and reads
    // as a finger, and only a fingertip above the top line reads as a bead.
    // 1.14 brings the row up onto the flank with the crest still measuring zero:
    // the highest glove vertex over the handguard sits at 30.9 mm against the
    // hard top's 34.9 mm, which is 4 mm for sway and breathing to spend.
    close: 1.14,
  });
  buildHand(
    {
      side: 'left',
      fingers: [
        { curl: left.curls[0], spread: -0.10 },
        { curl: left.curls[1], spread: -0.03 },
        { curl: left.curls[2], spread: 0.05 },
        { curl: left.curls[3], spread: 0.15 },
      ],
      // Thumb-forward, and much straighter than it was. Curled to 0.62/0.52 it
      // folded into the same mass as the palm and the whole hand came back as
      // one rounded blob with a bulge on it — "a mitten", and fairly. The
      // thumb-forward hold is named for the one thing about it that reads: a
      // straight thumb lying up the handguard alongside the rail. It is also
      // the only part of a support hand the shooter's own eye can see, because
      // the fingers are round the far side, so it is the only line available to
      // say the hand has parts.
      thumb: { dir: new THREE.Vector3(0.34, 0.40, -0.85), curl: [0.20, 0.14] },
      // Out to the left as hard as down. A support arm that drops vertically
      // out of frame is a column standing in the middle of the shot; angling it
      // across to the bottom-left corner turns the same geometry into a frame
      // edge, and it is also where the elbow of anyone actually holding a rifle
      // at this angle would be.
      forearm: { dir: new THREE.Vector3(-0.56, -0.62, 0.55), length: 0.34 },
      cup: left.cup,
      scale: 0.97,
    },
    left.place,
    b.glove,
    b.sleeve,
  );
}

// ------------------------------------------------------------------ pistol --

function buildPistol(b: Batches, muzzle: THREE.Object3D, ejectionPort: THREE.Object3D): void {
  const slide: Array<[number, number]> = [
    [0.0140, -0.0110],
    [0.0140, 0.0090],
    [0.0116, 0.0136],
    [-0.0116, 0.0136],
    [-0.0140, 0.0090],
    [-0.0140, -0.0110],
  ];
  b.barrel.add(extrude(slide, -0.1480, 0.0220), { y: 0.0125 });
  const serration = roundedBox(0.0028, 0.0175, 0.0026, 0.0008, 1);
  for (let i = 0; i < 7; i++) {
    b.steel.addMirrored(serration, { x: 0.0142, y: 0.0140, z: 0.0130 - i * 0.0052, rz: 0.16 });
  }
  b.barrel.add(
    revolve(
      [
        { r: 0, z: -0.1580 },
        { r: 0.0076, z: -0.1580 },
        { r: 0.0076, z: -0.1500 },
        { r: 0.0058, z: -0.1500 },
        { r: 0.0058, z: -0.1200 },
      ],
      12,
    ),
    { y: 0.0100 },
  );
  muzzle.position.set(0, 0.010, -0.162);
  ejectionPort.position.set(0.015, 0.020, -0.020);

  b.polymer.add(extrude(roundRectSection(0.0270, 0.0230, 0.0055, 2), -0.1300, 0.0100), {
    y: -0.0075,
  });
  b.polymer.add(picatinnyRail(0.0440, 0.0182), { y: -0.0208, z: -0.0960, rz: Math.PI });

  const gripAngle = 1.2000;
  const gripDir = new THREE.Vector3(0, -Math.sin(gripAngle), Math.cos(gripAngle));
  const gripTop = new THREE.Vector3(0, -0.0180, 0.0035);
  b.polymer.add(
    extrude(roundRectSection(0.0320, 0.0400, 0.0090, 3), 0.0, 0.0980, { capFront: false }),
    { y: gripTop.y, z: gripTop.z, rx: gripAngle },
  );
  b.rubber.addMirrored(gripTexture(0.0280, 0.0560, 5, 10, 0.0008), {
    x: 0.0160,
    y: gripTop.y + gripDir.y * 0.0520,
    z: gripTop.z + gripDir.z * 0.0520,
    ry: Math.PI / 2,
    rx: gripAngle,
  });
  const guard = new THREE.TorusGeometry(0.0182, 0.0032, 6, 18, Math.PI);
  guard.rotateY(Math.PI / 2);
  guard.rotateX(Math.PI);
  b.polymer.add(guard, { y: -0.0390, z: -0.0330 });
  b.steel.add(taperedBox(0.0058, 0.0155, 0.0054, 0.0120, 0.0070, 0.0020, 2), {
    y: -0.0330,
    z: -0.0330,
    rx: 0.18,
  });
  // Slide stop and takedown lever on the left, magazine release on the right.
  b.steel.add(taperedBox(0.0044, 0.0080, 0.0038, 0.0060, 0.0280, 0.0016, 2), {
    x: -0.0148,
    y: -0.0030,
    z: -0.0340,
  });
  b.steel.add(roundedBox(0.0060, 0.0110, 0.0110, 0.0026, 2), {
    x: 0.0148,
    y: -0.0090,
    z: -0.0090,
  });

  b.mag.add(
    extrude(roundRectSection(0.0250, 0.0330, 0.0050, 2), 0.0, 0.0960, { capFront: false }),
    { y: -0.0185, z: 0.0035, rx: gripAngle },
  );
  b.mag.add(
    extrude(roundRectSection(0.0330, 0.0380, 0.0055, 2), 0.0960, 0.1065),
    { y: -0.0185, z: 0.0035, rx: gripAngle },
  );

  // Both hands on the grip: the strong hand wraps the frame, the support hand
  // closes over its fingers in a thumbs-forward two-handed hold.
  const backstrap = new THREE.Vector3(0, gripDir.z, -gripDir.y).normalize();
  const right = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0420),
    axis: gripDir.clone().negate(),
    radius: 0.0192,
    up: backstrap,
    wrist: 0.32,
  });
  buildHand(
    {
      side: 'right',
      fingers: [
        { curl: [0.74, 0.90, 0.44], spread: -0.09, lift: -0.42 },
        { curl: right.curls[1], spread: 0.02 },
        { curl: right.curls[2], spread: 0.07 },
        { curl: right.curls[3], spread: 0.14 },
      ],
      thumb: { dir: new THREE.Vector3(-0.26, 0.30, -0.92), curl: [0.34, 0.22] },
      forearm: { dir: new THREE.Vector3(0.30, -0.54, 0.79), length: 0.34 },
      cup: right.cup,
    },
    right.place,
    b.glove,
    b.sleeve,
  );

  // The support hand closes over the strong hand's fingers, so it wraps the
  // same way round but a full finger-thickness further out, and its wrist
  // comes in from the left where the strong hand's is not.
  const left = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0500),
    axis: gripDir.clone().negate(),
    radius: 0.0330,
    up: backstrap,
    wrist: -0.62,
    close: 0.92,
  });
  buildHand(
    {
      side: 'left',
      fingers: [
        { curl: left.curls[0], spread: -0.06 },
        { curl: left.curls[1], spread: -0.01 },
        { curl: left.curls[2], spread: 0.05 },
        { curl: left.curls[3], spread: 0.12 },
      ],
      thumb: { dir: new THREE.Vector3(-0.14, 0.26, -0.96), curl: [0.20, 0.14] },
      forearm: { dir: new THREE.Vector3(-0.46, -0.52, 0.72), length: 0.34 },
      cup: left.cup,
      scale: 0.97,
    },
    left.place,
    b.glove,
    b.sleeve,
  );
}

// ------------------------------------------------------------------- optic --

interface OpticRig {
  centreY: number;
  centreZ: number;
  eyeRelief: number;
  attach(group: THREE.Group): void;
  update(f: WeaponFrame, tmp: THREE.Vector3): void;
  /** Scene light level from the view model's probe; scales the lens coating. */
  setTone(k: number): void;
  dispose(): void;
}

function buildOptic(def: WeaponDef, batches: Batches, isPistol: boolean): OpticRig {
  const body = batches.optic;
  const isScope = def.optic === 'acog' || def.optic === 'sniper';
  const y = OPTIC_HEIGHT;
  const noop = (): void => {};

  if (def.optic === 'iron') {
    // A sidearm's sight picture *is* the irons, so the notch and the blade are
    // built to a single sight line: the top of the front blade lands exactly
    // on the bottom of the rear notch, which is the whole point of the parts
    // and the thing that is invariably wrong when they are eyeballed.
    const deckY = isPistol ? 0.0261 : RAIL_TOP;
    const sightLine = deckY + 0.0059;
    const rearZ = isPistol ? 0.0140 : -0.0060;
    const frontZ = isPistol ? -0.1400 : -0.2000;
    body.add(taperedBox(0.0170, 0.0060, 0.0160, 0.0052, 0.0072, 0.0014, 2), {
      y: deckY + 0.0029,
      z: rearZ,
    });
    body.addMirrored(roundedBox(0.0052, 0.0060, 0.0072, 0.0012, 1), {
      x: 0.0058,
      y: sightLine + 0.0030,
      z: rearZ,
    });
    body.add(taperedBox(0.0042, 0.0059, 0.0038, 0.0059, 0.0044, 0.0009, 1), {
      y: deckY + 0.0030,
      z: frontZ,
    });
    return {
      centreY: sightLine,
      centreZ: rearZ,
      eyeRelief: 0.235,
      attach: noop,
      update: noop,
      setTone: noop,
      dispose: noop,
    };
  }

  // A red dot is a long thin tube. The first pass made it 37 mm across and
  // 61 mm long — a ratio of 1.6, where every optic anyone has actually
  // shouldered is north of 2.2 — and a stubby fat one reads as a toy scope
  // rather than a sight. Narrowing and lengthening it also buys back three
  // percent of screen height in the aiming picture and drops the aperture's
  // lower edge below the folded front sight, which was showing up as a black
  // notch in the bottom of the glass.
  // Lengthened again, forward only. 74 mm of tube on a 34 mm body is a ratio of
  // 2.18, and seen from the hip — where the tube is foreshortened to a third of
  // its length while its diameter is not — that still read as a stubby drum
  // sitting on the receiver. 82 mm brings it to 2.4, close to the compact sights
  // this is modelled on.
  //
  // Forward only because the aperture, the eye relief and the reticle
  // collimation are all solved against `zBack`, and the aiming picture is the
  // one thing here that is already right.
  const tubeR = isScope ? 0.0215 : 0.0170;
  const zFront = isScope ? -0.1080 : -0.0760;
  const zBack = isScope ? 0.0300 : 0.0060;
  /**
   * The two stops, sized against each other rather than against the tube.
   *
   * A hollow tube vignettes, and the annulus of lit bore wall that vignetting
   * exposes was 43% of the aperture — measured, on the aiming capture: world out
   * to 49 px and a smooth blue-grey wall from there to 65 px. That is where "the
   * inside of a plastic bottle cap" and "an opaque crescent eating 40% of the
   * view" both come from.
   *
   * The arithmetic that governs it is short. The eye sits 135 mm behind the
   * ocular element and 211 mm behind the front mouth, so whichever of the two
   * openings subtends the *larger* angle, the difference between them is wall:
   * the mouth has to be 1.56x the ocular before the wall disappears entirely.
   * The previous numbers were 14.0 and 16.2 mm, a ratio of 1.16, so two thirds
   * of the shortfall showed as annulus.
   *
   * Both ends move, because moving either one alone is ugly. The mouth flares to
   * 19 mm and the ocular closes to 12.5 mm, taking the rear rim from 3.0 to
   * 4.5 mm. The bezel that puts on the front is 43 mm across a 34 mm tube, a
   * ratio of 1.28 — an Aimpoint CompM4 runs 1.27, so this is the proportion real
   * compact sights already have, and it reads as an objective housing rather
   * than as a trumpet.
   *
   * 1.52 against the 1.56 needed leaves 3.6 px of wall: the thin dark ring an
   * optic is supposed to have, and where the internal flocking is meant to show.
   *
   * The sight picture *grows* doing this, from 49 px of radius to 56 — the world
   * the player can see is set by the mouth, and the mouth got bigger. The eye
   * relief and the reticle collimation are untouched; both are solved against
   * `zBack`.
   */
  const aperture = tubeR - (isScope ? 0.0030 : 0.0045);
  const frontR = aperture + (isScope ? 0.0022 : 0.0065);
  /** Objective radius on a scope: the bell's mouth less a 4 mm retaining rim. */
  const BELL_LENS = 0.0272;
  // Ocular geometry. On a scope the element sits at the back of the eyepiece
  // housing, which is where it is on real hardware and 34 mm behind where this had
  // it — the previous position left the glass sunk at the bottom of a hollow
  // recess. On a red dot there is no housing, so it stays just inside the rear rim
  // with bore wall behind it.
  const OCULAR_R = isScope ? 0.0206 : aperture;
  const ocularZ = isScope ? zBack + 0.0284 : zBack - 0.0060;

  // Tube: the outer wall, crowned at both rims and closing inward onto the lens
  // seats, plus a bore that runs the whole length.
  //
  // The bore is the fix for the defect that made the sight read as a section of
  // scaffold pole. There used to be a 3 mm seat lip at each end and nothing at
  // all across the 76 mm between them — invisible from outside, but from the hip
  // the eye looks into the ocular at sixty degrees off the axis, so the line of
  // sight leaves through the far *side* of the tube rather than through the
  // front element, and with no wall there to stop it that meant looking straight
  // through the geometry at the street. No amount of work on the glass was going
  // to help while the thing behind the glass was a hole.
  //
  // `revolve` takes each band's orientation from the direction it travels, so a
  // bore is just a run at constant radius going forward: -z gives inward-facing
  // normals. The two profiles share their end points exactly, so there is no
  // seam and nothing coincident to z-fight. The aperture the eye sees when
  // aiming is unchanged — it was always set by the front seat, which has not
  // moved.
  //
  // 32 segments rather than 24: at 24 the widest part of the tube was two and a
  // half pixels per facet in a hip capture, which put a visible polygon on the
  // one silhouette the eye follows. The whole optic is under a thousand
  // triangles either way.
  //
  // 48 segments rather than 32. The tube's rim is the largest circle on screen
  // when aiming and its facets were countable at 32: a 53 px radius over 32
  // segments is a 10 px chord, and a 10 px chord on a circle that size is a
  // visible flat. At 48 it is 7 px with a third of the sagitta. The whole optic
  // is still under two thousand triangles.
  const front: Contour[] = isScope
    ? [
        { r: frontR, z: zFront + 0.0014 },
        { r: tubeR - 0.0007, z: zFront },
        { r: tubeR, z: zFront + 0.0024 },
        { r: tubeR, z: zFront + 0.0100 },
        { r: tubeR - 0.0016, z: zFront + 0.0130, smooth: true },
      ]
    : [
        // Objective bezel: the mouth, the front face, a short crowned barrel
        // 2.6 mm proud of the tube, then a shoulder back down onto it.
        { r: frontR, z: zFront + 0.0018 },
        { r: frontR + 0.0020, z: zFront },
        { r: frontR + 0.0027, z: zFront + 0.0026 },
        { r: frontR + 0.0027, z: zFront + 0.0080 },
        { r: frontR + 0.0014, z: zFront + 0.0104 },
        { r: tubeR, z: zFront + 0.0150 },
        { r: tubeR, z: zFront + 0.0196 },
        { r: tubeR - 0.0016, z: zFront + 0.0226, smooth: true },
      ];
  body.add(
    revolve(
      [
        ...front,
        { r: tubeR - 0.0016, z: zBack - 0.0130, smooth: true },
        { r: tubeR, z: zBack - 0.0100 },
        { r: tubeR, z: zBack - 0.0024 },
        { r: tubeR - 0.0007, z: zBack },
        { r: aperture, z: zBack - 0.0014 },
      ],
      48,
    ),
    { y },
  );
  // Separate batch, because the inside of an optic is not the same surface as
  // the outside of one: it is flat black, to stop exactly the internal
  // reflection this geometry would otherwise have. Left on the body material it
  // came out the same grey as the tube exterior and the bore read as a pipe.
  batches.bore.add(
    revolve(
      [
        { r: aperture, z: zBack - 0.0014 },
        { r: frontR, z: zFront + (isScope ? 0.0014 : 0.0018) },
      ],
      48,
    ),
    { y },
  );

  if (isScope) {
    // The bell, front rim first and then back along the outside to the tube.
    //
    // The rim used to start at `aperture` — the 18.5 mm the main tube runs — which
    // put a 10 mm-wide ring of metal across the mouth of a 62 mm bell and left a
    // lens a third of the frontal area. A scope's bell exists precisely so the
    // objective can be larger than the tube; on real hardware the rim is two or
    // three millimetres and the rest is glass. From the hip the old proportion
    // read as a blanking plate with a porthole in it.
    body.add(
      revolve(
        [
          { r: BELL_LENS, z: zFront - 0.0300 },
          { r: 0.0312, z: zFront - 0.0284 },
          { r: 0.0312, z: zFront - 0.0080, smooth: true },
          { r: tubeR + 0.0010, z: zFront + 0.0040 },
        ],
        22,
      ),
      { y },
    );
    // The bell's inner wall, tapering from behind the objective down to the main
    // bore. Without it the bell is hollow, and from the hip the eye looks in
    // through the objective at a steep angle, leaves through the far side of the
    // bell — a culled backface — and lands on the *outside* of the main tube. That
    // was the pale grey wedge sitting across the bottom of the front element,
    // which no amount of work on the glass or on the bore's tint could reach,
    // because the surface it was showing belonged to neither.
    batches.bore.add(
      revolve(
        [
          { r: frontR, z: zFront + 0.0012 },
          { r: BELL_LENS, z: zFront - 0.0286 },
        ],
        22,
      ),
      { y },
    );
    // Eyepiece housing, and then a rim rolling back inward to the ocular seat.
    //
    // The rim is the point. Without it the housing was an open cone 32 mm deep
    // with its far wall culled, so from the hip the line of sight went in through
    // the eyepiece, out through the back of it and onto the outside of the tube —
    // a lit grey wedge lying across the bottom of the eyepiece, which is the exact
    // twin of the hole the bore was added to close at the other end.
    body.add(
      revolve(
        [
          { r: tubeR, z: zBack - 0.0040 },
          { r: 0.0250, z: zBack + 0.0060, smooth: true },
          { r: 0.0250, z: zBack + 0.0240 },
          { r: 0.0230, z: zBack + 0.0280 },
          { r: OCULAR_R, z: zBack + 0.0292 },
        ],
        22,
      ),
      { y },
    );
    batches.bore.add(
      revolve(
        [
          { r: OCULAR_R, z: zBack + 0.0290 },
          { r: aperture, z: zBack - 0.0012 },
        ],
        22,
      ),
      { y },
    );
    const turret = revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0122, z: 0 },
        { r: 0.0122, z: 0.0165 },
        { r: 0.0100, z: 0.0185 },
        { r: 0, z: 0.0185 },
      ],
      14,
    );
    body.add(turret, { y: y + tubeR - 0.0020, z: zFront + 0.0520, rx: -Math.PI / 2 });
    body.add(turret, { x: tubeR - 0.0020, y, z: zFront + 0.0520, ry: Math.PI / 2 });
  } else {
    // Adjuster caps. These were plain flat-topped cylinders, and a flat-topped
    // cylinder on top of a tube is the shape of a bollard — at hip range the
    // elevation cap was the second-largest silhouette on the weapon and had
    // nothing on it at all. A real cap has a collar at its base, a knurled
    // barrel and a recessed top with a coin slot; the collar and the recess are
    // what make it read as a fitting that unscrews, and both survive being two
    // pixels tall.
    const cap = (r: number, h: number): THREE.BufferGeometry =>
      revolve(
        [
          { r: 0, z: 0 },
          { r: r + 0.0012, z: 0 },
          { r: r + 0.0012, z: 0.0016 },
          { r, z: 0.0026 },
          { r, z: h - 0.0014 },
          { r: r - 0.0011, z: h },
          { r: r - 0.0026, z: h },
          { r: r - 0.0030, z: h - 0.0011 },
          { r: 0, z: h - 0.0011 },
        ],
        16,
      );
    // Shorter than before as well as detailed: 10.6 mm of stand-off on a 17 mm
    // tube is a turret for a rifle scope, not the low cap of a compact sight.
    const adjust = cap(0.0078, 0.0082);
    body.add(adjust, { y: y + tubeR - 0.0012, z: zFront + 0.0300, rx: -Math.PI / 2 });
    body.add(adjust, { x: tubeR - 0.0012, y, z: zFront + 0.0300, ry: Math.PI / 2 });
    // The battery compartment, at nine o'clock. Wider than the adjusters and
    // proud of the tube, which is what it looks like on the hardware.
    body.add(cap(0.0102, 0.0126), {
      x: -(tubeR - 0.0012),
      y,
      z: zFront + 0.0390,
      ry: -Math.PI / 2,
    });
    // Knurling on the two adjusters and the battery cap.
    //
    // A turret is identified by the fact that it is meant to be gripped and
    // turned, and the only thing on it that says so is the knurl. Sixteen
    // splines on an 8 mm cap is 1.5 mm of pitch, which at the hip is under a
    // pixel and reads correctly as a texture rather than as teeth — the same
    // trap the top rail fell into. Rather than model teeth, each spline is a
    // shallow rounded rib standing 0.25 mm proud, so what survives filtering is
    // a band of broken highlight around the cap and nothing that can alias into
    // beading.
    const knurl = (
      cx: number,
      cy: number,
      cz: number,
      axis: 'x' | 'y',
      r: number,
      h: number,
      n: number,
    ): void => {
      const rib = revolve(
        [
          { r: 0, z: 0 },
          { r: 0.00042, z: 0 },
          { r: 0.00042, z: h },
          { r: 0, z: h },
        ],
        5,
      );
      // Away from the tube, which for the cap at nine o'clock is -x. Extruded
      // the other way it runs the full length of the rib straight through the
      // bore, and twenty-two of them arrive inside the sight picture as a comb
      // of dark bars across the left third of the aperture.
      const out = Math.sign(axis === 'y' ? cy : cx) || 1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ox = Math.cos(a) * r;
        const oy = Math.sin(a) * r;
        body.add(
          rib,
          axis === 'y'
            ? { x: cx + ox, y: cy, z: cz + oy, rx: (-Math.PI / 2) * out }
            : { x: cx, y: cy + oy, z: cz + ox, ry: (Math.PI / 2) * out },
        );
      }
    };
    knurl(0, y + tubeR - 0.0006, zFront + 0.0300, 'y', 0.0078, 0.0068, 18);
    knurl(tubeR - 0.0006, y, zFront + 0.0300, 'x', 0.0078, 0.0068, 18);
    knurl(-(tubeR - 0.0006), y, zFront + 0.0390, 'x', 0.0102, 0.0104, 22);

    // Rubber bumper around the objective bezel: the moulded ring a compact sight
    // carries to take the knock the front of an optic always takes first. It is
    // also the one place on the tube where a soft material meets a hard one, and
    // the tonal break that makes is most of what tells the eye the bezel is a
    // separate part rather than more tube.
    batches.rubber.add(
      revolve(
        [
          { r: frontR + 0.0018, z: zFront + 0.0028 },
          { r: frontR + 0.0033, z: zFront + 0.0042 },
          { r: frontR + 0.0033, z: zFront + 0.0068, smooth: true },
          { r: frontR + 0.0018, z: zFront + 0.0082 },
        ],
        40,
      ),
      { y },
    );
  }

  // Mount: a rail clamp, a riser and two cross-bolts. This matters because the
  // mount is the only thing tying the optic to the weapon, and an optic that
  // floats above the rail is the tell of a procedural gun.
  const mountFront = zFront + (isScope ? 0.0300 : 0.0060);
  const mountBack = zBack - (isScope ? 0.0300 : 0.0060);
  const riserH = y - tubeR + 0.0016 - RAIL_TOP;
  body.add(
    extrude(
      [
        [0.0132, 0],
        [0.0104, riserH],
        [-0.0104, riserH],
        [-0.0132, 0],
      ],
      mountFront,
      mountBack,
    ),
    { y: RAIL_TOP },
  );
  const clamp = extrude(roundRectSection(0.0330, 0.0135, 0.0026, 2), -0.0075, 0.0075);
  body.add(clamp, { y: RAIL_TOP - 0.0042, z: mountFront + 0.0090 });
  body.add(clamp, { y: RAIL_TOP - 0.0042, z: mountBack - 0.0090 });

  // Rings around the tube itself.
  //
  // Everything above clamps the mount to the *rail*. Nothing held the tube to the
  // mount: it rested on the top of the riser and the two were a single continuous
  // surface, which is why the optic reads as resting on a plate rather than being
  // held by anything. Rings are also the most recognisable thing on a mounted
  // optic — they are what the eye checks first — and at 4 mm proud of a 17 mm tube
  // they are eight pixels of relief in the hip pose, which resolves easily.
  const ringZ = [mountFront + 0.009, mountBack - 0.009];
  const ringBolt = screwHead(0.0026, 0.0015);
  for (const rz of ringZ) {
    body.add(
      revolve(
        [
          { r: tubeR + 0.0006, z: rz - 0.0068 },
          { r: tubeR + 0.0038, z: rz - 0.0056 },
          { r: tubeR + 0.0042, z: rz - 0.0044, smooth: true },
          { r: tubeR + 0.0042, z: rz + 0.0044, smooth: true },
          { r: tubeR + 0.0038, z: rz + 0.0056 },
          { r: tubeR + 0.0006, z: rz + 0.0068 },
        ],
        26,
      ),
      { y },
    );
    // The split line and its pinch bolt, on the right flank — the side the eye
    // sees from the hip. A ring with no gap in it could not have been fitted.
    for (const sx of [1, -1]) {
      body.add(roundedBox(0.0062, 0.0132, 0.0106, 0.0016, 1), {
        x: sx * (tubeR + 0.0044),
        y: y - tubeR * 0.30,
        z: rz,
      });
      body.add(ringBolt, {
        x: sx * (tubeR + 0.0076),
        y: y - tubeR * 0.3,
        z: rz,
        ry: sx * Math.PI * 0.5,
      });
    }
  }
  // Throw lever on the rear clamp, folded back along the receiver the way it is
  // carried. This is the one part of a mount that is unmistakably a mount.
  body.add(roundedBox(0.0044, 0.0092, 0.0270, 0.0016, 1), {
    x: 0.0150,
    y: RAIL_TOP - 0.0044,
    z: mountBack - 0.0208,
    ry: 0.13,
  });
  body.add(roundedBox(0.0052, 0.0104, 0.0072, 0.002, 1), {
    x: 0.0146,
    y: RAIL_TOP - 0.0044,
    z: mountBack - 0.0082,
  });
  const bolt = revolve(
    [
      { r: 0, z: 0 },
      { r: 0.0042, z: 0 },
      { r: 0.0042, z: 0.0034 },
      { r: 0, z: 0.0034 },
    ],
    10,
  );
  body.add(bolt, { x: 0.0168, y: RAIL_TOP - 0.0042, z: mountFront + 0.0090, ry: Math.PI / 2 });
  body.add(bolt, { x: 0.0168, y: RAIL_TOP - 0.0042, z: mountBack - 0.0090, ry: Math.PI / 2 });
  // Saddle: the machined pad the tube is bonded to, between the riser and the
  // tube's underside.
  //
  // `roundRectSection` is centred on its origin, and this was placed as though it
  // were based on it — one millimetre under the tube's lowest point, which put the
  // top of a 12 mm section five millimetres *inside* the bore. The view rig casts
  // no shadows, so that intruding face was lit like any other upward-facing
  // surface, and from the hip the eye looks in through the ocular at a steep angle
  // and lands on it: a hard-edged pale grey wedge lying across the bottom of the
  // front element, which read as a crack in the sight and survived three passes of
  // work on the glass, the bore and the lens seats because it belonged to none of
  // them. In the aiming pose it is the bottom of the sight picture.
  //
  // Half the section lower, so the top face lands inside the tube wall — hidden,
  // with no gap between the two parts and nothing protruding into the bore.
  body.add(
    extrude(roundRectSection(0.0250, 0.0120, 0.0024, 2), mountFront + 0.0040, mountBack - 0.0040),
    { y: y - tubeR - 0.0054 },
  );

  // ---- glass and reticle -------------------------------------------------
  const glassMat = new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTint: { value: new THREE.Color(0.10, 0.20, 0.34) },
      uRadius: { value: OCULAR_R },
      uSky: { value: 0.5 },
      uEdge: { value: 1 },
      uEnv: { value: 1 },
    },
  });
  const ocular = new THREE.Mesh(new THREE.CircleGeometry(OCULAR_R, 72), glassMat);
  ocular.position.set(0, y, ocularZ);
  ocular.renderOrder = 10;
  ocular.frustumCulled = false;
  ocular.layers.set(VIEW_MODEL_LAYER);
  const farGlassMat = glassMat.clone();
  farGlassMat.uniforms.uEdge = { value: 0.22 };
  // Share the animated uniform objects rather than the clone's copies, so the
  // per-frame `uSky` write reaches both elements. Without this the far lens
  // sits at whatever sky value it was constructed with and drifts out of step
  // with the near one as the player raises the weapon.
  farGlassMat.uniforms.uSky = glassMat.uniforms.uSky;
  farGlassMat.uniforms.uTint = glassMat.uniforms.uTint;
  farGlassMat.uniforms.uEnv = glassMat.uniforms.uEnv;
  // On a scope the objective fills the bell rather than matching the tube; the
  // shader reads its own radius, so the falloffs stay in proportion.
  const objR = isScope ? BELL_LENS : frontR - 0.0005;
  farGlassMat.uniforms.uRadius = { value: objR };
  const objective = new THREE.Mesh(new THREE.CircleGeometry(objR, 72), farGlassMat);
  // Sat 4.6 mm behind the front seat, which was harmless while the bore was a
  // hole and is not now: the bore wall would clip the element's rim before the
  // seat did. A millimetre of clearance is enough to keep it out of the wall.
  objective.position.set(0, y, isScope ? zFront - 0.0289 : zFront + 0.0026);
  objective.renderOrder = 9;
  objective.frustumCulled = false;
  objective.layers.set(VIEW_MODEL_LAYER);

  const reticleMat = new THREE.ShaderMaterial({
    vertexShader: RETICLE_VERT,
    fragmentShader: RETICLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(1.0, 0.10, 0.03) },
      // Overwritten every frame by `update`; see DOT_AIMED for the value that
      // actually ships.
      uBrightness: { value: DOT_AIMED },
      // A hair larger, for the same reason: five pixels cannot hold both a core
      // and an edge. 5.6 mrad is 19 MOA and a red dot is two, but the honest
      // number is a third of a pixel at this resolution and there is no reading
      // that; what matters is that the whole emitter, core and glow together,
      // stays inside the twenty pixels a shooter would call a dot.
      uDotAngle: { value: isScope ? 0.0032 : 0.0050 },
      uRingAngle: { value: isScope ? 0.0135 : 0.0175 },
      uType: { value: def.optic === 'acog' ? 1 : def.optic === 'holo' ? 2 : 0 },
      uEyeLocal: { value: new THREE.Vector3(0, 0, 0.18) },
      uAperture: { value: aperture },
    },
  });
  const reticle = new THREE.Mesh(new THREE.CircleGeometry(aperture, 72), reticleMat);
  reticle.position.set(0, y, (zFront + zBack) * 0.5);
  reticle.renderOrder = 12;
  reticle.frustumCulled = false;
  reticle.layers.set(VIEW_MODEL_LAYER);

  return {
    centreY: y,
    centreZ: (zFront + zBack) * 0.5,
    // Eye relief here is the framing distance, not the optic's spec sheet: it
    // is what decides how much of the screen the tube eats when aiming. At
    // 160 mm a 37 mm red dot covered a third of the frame height and buried
    // the receiver, which is how a sight picture ends up reading as a
    // porthole.
    //
    // It went to 215 mm to fix that, and 215 mm turned out to be the direct
    // cause of the pale wedge across the bottom of the aiming picture. Eye
    // relief is the distance the whole weapon is pushed out in front of the
    // eye, so at 215 mm the buttstock — which on a real rifle is behind the
    // shooter's cheek — sat 40 mm *in front* of the camera. Worked through:
    // the sight axis is 70.5 mm over the bore, the stock body's forward end is
    // 142 mm behind the optic centre and so 42 mm from the eye, and at that
    // range half the frame height is only 74 mm. The bore centreline itself
    // lands at 98% of frame height there. Nothing that can be called a stock
    // fits under that. No amount of tinting or detailing was ever going to fix
    // it, because the geometry made it unavoidable.
    //
    // 170 mm is the compromise. The tube grows from 15% of frame height to
    // 19%, which is still a sight picture and not a porthole, while the stock's
    // visible band drops from 22% of frame height to 9% — and the geometry
    // change in buildStock takes that last 9% down to a sliver along the
    // bottom edge. Scopes get the same treatment, less aggressively: a
    // magnified optic is genuinely held further out.
    eyeRelief: isScope ? 0.196 : 0.170,
    attach(g: THREE.Group): void {
      g.add(objective, ocular, reticle);
    },
    update(f: WeaponFrame, tmp: THREE.Vector3): void {
      // Collimation needs the eye in the reticle's own space. The parent chain
      // is one frame stale here, which at these angles is far below a pixel.
      reticle.updateWorldMatrix(true, false);
      tmp.copy(f.eye);
      reticle.worldToLocal(tmp);
      (reticleMat.uniforms.uEyeLocal.value as THREE.Vector3).copy(tmp);
      // A real emitter is not steady, and the brightness has to fall away out
      // of the aim or the dot blooms across the screen from the hip.
      reticleMat.uniforms.uBrightness.value =
        (DOT_HIP + (DOT_AIMED - DOT_HIP) * f.ads) *
        (0.96 + Math.sin(f.elapsed * 47.3) * 0.04);
      glassMat.uniforms.uSky.value = 0.32 + f.ads * 0.34;
    },
    setTone(k: number): void {
      glassMat.uniforms.uEnv.value = k;
    },
    dispose(): void {
      glassMat.dispose();
      farGlassMat.dispose();
      reticleMat.dispose();
      ocular.geometry.dispose();
      objective.geometry.dispose();
      reticle.geometry.dispose();
    },
  };
}

export type { WeaponDef };
