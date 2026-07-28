import { KS_NOISE } from './common.glsl';

/**
 * The targeting mode's two screen elements.
 *
 * `FOOTPRINT_*` draws the blast plan on the ground. It is a mesh whose vertices
 * sit on the terrain, so the marker climbs kerbs and drops into the storm drain
 * rather than floating as a flat decal, and it is depth-tested against the
 * world — which is deliberate: the part of the footprint that disappears under
 * the souk canopy is exactly the part the bombs will not reach, so the marker
 * being occluded *is* the feedback.
 *
 * `TACTICAL_*` is the full-screen treatment. A grab of the scene, desaturated
 * and pushed toward a cold instrument grey, with the map's own contrast
 * flattened so the overlaid symbology reads over anything. Two things sell it
 * as an interface rather than as a filter: a depth-derived edge pass, which
 * gives the buildings a drawn outline, and a scan that sweeps down the frame
 * once a second.
 */

export const FOOTPRINT_VERT = /* glsl */ `
attribute vec2 aPlan;   // -1..1 across the footprint, +u along the run-in

varying vec2 vPlan;
varying vec3 vWorld;

void main() {
  vPlan = aPlan;
  vWorld = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FOOTPRINT_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}

uniform vec3 uColor;
uniform float uValid;
uniform float uTime;
uniform float uShape;     // 0 rectangle, 1 ellipse
uniform float uAspect;    // length / width, for keeping hatch pitch square
uniform float uOpacity;

varying vec2 vPlan;
varying vec3 vWorld;

/** Signed distance to the footprint edge in plan units; negative inside. */
float planeSdf(vec2 p) {
  vec2 q = abs(p) - vec2(1.0);
  float box = min(max(q.x, q.y), 0.0) + length(max(q, 0.0));
  float ellipse = length(p) - 1.0;
  return mix(box, ellipse, uShape);
}

void main() {
  vec2 p = vPlan;
  float d = planeSdf(p);
  if (d > 0.06) discard;

  // The rim. Two lines: a bright inner one and a wide soft glow outside it, so
  // the marker holds an edge against sand and against shadow.
  float rim = smoothstep(0.052, 0.0, abs(d)) + 0.45 * smoothstep(0.16, 0.0, abs(d));

  // Interior hatch, at 45 degrees and pitched in metres rather than in plan
  // units so it does not stretch when the footprint is long and thin.
  //
  // Everything inside the rim is deliberately faint. The footprint is the one
  // element that covers real area, and an additively-blended fill at any
  // strength worth seeing turns the whole target box into a slab of pale green
  // with the town invisible underneath it — which is the opposite of what the
  // player is being asked to judge. The rim carries the shape; the interior
  // only has to say "this side of the line".
  vec2 metric = vec2(p.x * uAspect, p.y);
  float hatch = smoothstep(0.62, 0.98, abs(fract((metric.x + metric.y) * 5.0) * 2.0 - 1.0));
  hatch *= 0.11 * smoothstep(0.0, -0.05, d);

  // Range ticks along the run-in axis: the marks a bombardier would count.
  float ticks = smoothstep(0.9, 1.0, abs(fract(p.x * uAspect * 1.25) * 2.0 - 1.0));
  ticks *= smoothstep(0.55, 0.95, abs(p.y)) * 0.4;

  // The run-in arrow, drawn once down the centreline and pointing downrange.
  float axis = smoothstep(0.035, 0.0, abs(p.y)) * smoothstep(0.98, 0.6, abs(p.x)) * 0.3;
  float head = smoothstep(0.06, 0.0, abs(abs(p.y) + (p.x - 0.86) * 0.9)) *
               step(0.72, p.x) * step(p.x, 0.94) * 0.7;

  // A sweep running downrange, which is what stops the marker reading as a
  // static decal in a still frame.
  float sweep = exp(-pow((p.x - (fract(uTime * 0.45) * 2.4 - 1.2)) * 3.4, 2.0)) * 0.22;
  sweep *= smoothstep(0.0, -0.03, d);

  // A little grain so the fill is not a flat wash of colour.
  float grain = 0.86 + 0.14 * ksValue(vWorld.xz * 3.1);

  float body = (rim * 1.35 + hatch + ticks + axis + head + sweep) * grain;

  // Invalid targets pulse; valid ones sit still. Movement is the cue that
  // reads fastest in peripheral vision.
  float pulse = mix(0.62 + 0.38 * sin(uTime * 9.0), 1.0, uValid);
  float alpha = clamp(body * uOpacity * pulse, 0.0, 1.0);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(uColor * alpha * mix(2.2, 1.35, uValid), alpha);
}
`;

export const TACTICAL_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

export const TACTICAL_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}

uniform sampler2D uScene;
uniform sampler2D uHud;
uniform sampler2D uDepthTexture;
uniform vec4 uDepthParams;   // near, far, 1/width, 1/height
uniform float uHasDepth;
uniform float uHasHud;
uniform float uAmount;
uniform float uTime;

varying vec2 vUv;

float linearDepth(float d) {
  float n = uDepthParams.x;
  float f = uDepthParams.y;
  float z = d * 2.0 - 1.0;
  return (2.0 * n * f) / (f + n - z * (f - n));
}

void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  if (uAmount < 0.002) {
    gl_FragColor = vec4(scene, 1.0);
    return;
  }

  float luma = dot(scene, vec3(0.2126, 0.7152, 0.0722));

  // A cold instrument blue-grey. Kept in linear HDR and compressed rather than
  // clipped, so the sun on a roof stays a highlight instead of becoming a hole.
  //
  // The desaturation is nearly total on purpose. A half-hearted grade leaves
  // the map its own golden-hour palette, the overlay looks like a filter
  // someone forgot to turn off, and — the part that actually matters — a green
  // stroke over warm sand is two colours of the same brightness fighting each
  // other. Drain the world to slate and the symbology is the only chromatic
  // thing in the frame, which is what an instrument should be.
  vec3 tint = vec3(0.42, 0.60, 0.82);
  vec3 flat3 = mix(vec3(luma), scene, 0.07) * tint;
  flat3 = flat3 / (1.0 + flat3 * 0.85) * 1.44;
  // Lift the floor: the point of the view is to read the whole map, and a six
  // degree sun leaves half of it in shadow that no amount of contrast recovers.
  flat3 += vec3(0.014, 0.024, 0.040) * smoothstep(0.26, 0.0, luma);

  // Depth edges, drawn as an outline over the flattened image.
  float edge = 0.0;
  if (uHasDepth > 0.5) {
    vec2 t = uDepthParams.zw;
    float c = linearDepth(texture2D(uDepthTexture, vUv).x);
    float l = linearDepth(texture2D(uDepthTexture, vUv - vec2(t.x, 0.0)).x);
    float r = linearDepth(texture2D(uDepthTexture, vUv + vec2(t.x, 0.0)).x);
    float u = linearDepth(texture2D(uDepthTexture, vUv + vec2(0.0, t.y)).x);
    float dn = linearDepth(texture2D(uDepthTexture, vUv - vec2(0.0, t.y)).x);
    float g = (abs(l - c) + abs(r - c) + abs(u - c) + abs(dn - c)) / max(c, 1.0);
    edge = smoothstep(0.012, 0.09, g);
  }

  // Instrument furniture: a fine grid, a sweep, and scan lines.
  vec2 g = vUv * vec2(48.0, 27.0);
  float grid = max(
    smoothstep(0.955, 1.0, abs(fract(g.x) * 2.0 - 1.0)),
    smoothstep(0.955, 1.0, abs(fract(g.y) * 2.0 - 1.0))) * 0.06;
  // Every sixth line of the grid is heavier, which is what turns a mesh into
  // a graticule and gives the eye something to count.
  vec2 gm = vUv * vec2(8.0, 4.5);
  grid += max(
    smoothstep(0.975, 1.0, abs(fract(gm.x) * 2.0 - 1.0)),
    smoothstep(0.975, 1.0, abs(fract(gm.y) * 2.0 - 1.0))) * 0.10;
  float scan = exp(-pow((vUv.y - fract(uTime * 0.42)) * 9.0, 2.0)) * 0.12;
  float lines = (0.5 + 0.5 * sin(vUv.y * 900.0)) * 0.022;
  float noise = (ksValue(vUv * 700.0 + uTime * 30.0) - 0.5) * 0.014;

  // Cyan rather than green. The furniture covers the entire frame at a low
  // level, so its hue is effectively the hue of the whole plan: a green
  // graticule laid over a blue-grey grade averages to olive, and the map came
  // back the colour of an army surplus tent. Cyan sits on the same side of the
  // grade as the tint does and leaves the green symbology as the only warm-
  // adjacent thing in the frame, which is the point of desaturating at all.
  vec3 furniture = vec3(0.30, 0.86, 1.0) * (grid + scan + lines + noise);
  vec3 outline = vec3(0.55, 0.95, 1.0) * edge * 0.26;

  // Corner falloff so the eye is pulled to the middle of the plan.
  vec2 c2 = vUv - 0.5;
  float vig = 1.0 - dot(c2, c2) * 1.15;

  vec3 tactical = (flat3 + furniture + outline) * vig;

  // The panel, composited last and over everything.
  //
  // Two things make this work. It goes on *after* the vignette and the grade,
  // so the corner brackets do not darken with the corners they sit in; and the
  // stroke is pushed to a radiance of two and a half against a flattened world
  // that is compressed to below one and a half, so the interface survives the
  // tone mapper as the brightest thing in the frame no matter how the scene
  // underneath it is exposed. It is scaled by the blend amount too, so it
  // fades up with the camera lift rather than snapping on at the top.
  if (uHasHud > 0.5) {
    vec4 hud = texture2D(uHud, vUv);
    // A dark plate under every stroke, half a pixel wider, so the panel reads
    // against a sunlit roof as well as against shadow.
    float plate = 0.0;
    vec2 t = uDepthParams.zw * 1.5;
    plate = max(plate, texture2D(uHud, vUv + vec2( t.x, 0.0)).a);
    plate = max(plate, texture2D(uHud, vUv + vec2(-t.x, 0.0)).a);
    plate = max(plate, texture2D(uHud, vUv + vec2(0.0,  t.y)).a);
    plate = max(plate, texture2D(uHud, vUv + vec2(0.0, -t.y)).a);
    plate = max(plate, hud.a);
    tactical = mix(tactical, tactical * 0.28, plate * 0.85 * uAmount);
    // The canvas is sRGB and nothing upstream decoded it.
    vec3 ink = pow(max(hud.rgb, 0.0), vec3(2.2)) * 3.4;
    tactical = mix(tactical, ink, hud.a * uAmount);
  }

  gl_FragColor = vec4(mix(scene, tactical, uAmount), 1.0);
}
`;
