import { KS_NOISE } from './common.glsl';

/**
 * Contrails and wingtip vortices.
 *
 * A ribbon laid behind the aircraft, one quad per emitted segment, with the
 * segment's age carried as a vertex attribute. Everything about how a trail
 * looks is a function of that age and nothing else, which is what lets the
 * whole thing be a single strip written once per frame from a ring buffer:
 *
 *   0 – 0.3 s   the core. Thin, dense, still inside the vortex, and barely
 *               wider than the nozzle or the wingtip that made it.
 *   0.3 – 3 s   expansion. The pair of counter-rotating vortices entrains air
 *               and the trail roughly triples in width while thinning out.
 *   3 s onward  break-up. Shear tears it into the mackerel pattern that makes
 *               a contrail read as old, then it fades.
 *
 * The width therefore has to grow while the opacity falls, and the two curves
 * cannot be the same curve: a trail that widens and dims together vanishes into
 * a grey wash, and one that holds its width reads as a painted line. The
 * break-up is a noise field sampled in the ribbon's own space so it travels
 * with the trail instead of swimming through it.
 */

export const CONTRAIL_VERT = /* glsl */ `
attribute float aSide;
attribute float aAge;
attribute float aWidth;
attribute float aFade;

uniform float uMaxAge;
uniform float uSpread;

varying float vAge;
varying float vSide;
varying float vFade;
varying float vRun;

void main() {
  vAge = aAge / max(uMaxAge, 1e-3);
  vSide = aSide;
  vFade = aFade;
  vRun = aAge;

  // Growth is fast at first — the vortex pair does most of its entrainment in
  // the first second — then close to linear as the trail simply diffuses.
  float grow = 1.0 + uSpread * (1.0 - exp(-aAge * 1.7)) + uSpread * 0.35 * aAge;
  vec3 offset = normal * (aSide * aWidth * grow);
  vec4 mv = modelViewMatrix * vec4(position + offset, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const CONTRAIL_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}

uniform vec3 uColor;
uniform float uOpacity;
uniform float uBreakup;

varying float vAge;
varying float vSide;
varying float vFade;
varying float vRun;

void main() {
  // Across the ribbon: a soft core with a hard-ish centre while it is young,
  // flattening to a plain gaussian once it has spread.
  float r = abs(vSide);
  float core = exp(-r * r * mix(7.0, 2.0, clamp(vAge * 1.6, 0.0, 1.0)));

  // Along the ribbon: the mackerel break-up. Sampled against age rather than
  // arc length so the pattern is fixed to the air, not to the aircraft.
  float n = ksFbm(vec2(vRun * 2.6, vSide * 1.4 + vRun * 0.35));
  float tear = mix(1.0, smoothstep(0.18, 0.72, n), clamp((vAge - 0.16) * 1.9, 0.0, 1.0) * uBreakup);

  // Opacity: full while the trail is young, then a long tail. Squared so the
  // old end of a long trail goes properly transparent instead of grey.
  float life = 1.0 - vAge;
  float alpha = uOpacity * core * tear * life * life * vFade;
  if (alpha < 0.004) discard;

  // Ice crystals forward-scatter hard, so a fresh trail is brighter than the
  // sky it sits against; an old one has thinned out to a haze.
  vec3 color = uColor * mix(1.35, 0.72, clamp(vAge * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(color * alpha, alpha);
}
`;
