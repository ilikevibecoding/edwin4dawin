import { FX_BLACKBODY, FX_DEPTH, FX_MATH, FX_SCATTER } from './common.glsl';

/**
 * GPU particle simulation.
 *
 * Nothing about a particle's motion is touched by the CPU after it is spawned.
 * Each particle is one instance carrying a spawn record — position, velocity,
 * drag, gravity, two colours, two sizes, rotation, spin and a sprite index —
 * and the vertex shader evaluates the closed-form solution of
 *
 *     dv/dt = g - k (v - w)
 *
 * at the current time. Linear drag has an exact solution, so a particle's whole
 * trajectory, including the asymptotic drift into the wind, is four lines of
 * arithmetic rather than a ping-pong of position/velocity render targets. That
 * matters beyond elegance: with no simulation state there is nothing to
 * re-simulate after a frame drop, nothing to resize, and spawning is a write
 * into a ring buffer that never allocates.
 *
 * The one thing a closed form cannot express is a collision, so batches that
 * need one (sparks, chips, gore) bisect for the ground crossing and continue
 * the same closed form from the reflected state. Ten iterations resolve the
 * impact to within a millisecond and only run for particles that have actually
 * gone below the ground height sampled at spawn.
 *
 * Feature switches are defines rather than uniforms so a batch of smoke does
 * not pay for the spark path:
 *
 *   FX_SOFT      depth-buffer fade so a puff does not slice into geometry
 *   FX_LIT       single-scatter lighting from the sky's sun and ambient
 *   FX_FIRE      blackbody radiance from a temperature curve
 *   FX_STRETCH   velocity-aligned streak, for sparks and tracer debris
 *   FX_COLLIDE   ground bounce
 */

const TRAJECTORY = /* glsl */ `
vec3 fxPos(vec3 p0, vec3 v0, vec3 g, vec3 w, float k, float t) {
  if (k > 1e-3) {
    vec3 vt = g / k + w;
    return p0 + vt * t + (v0 - vt) * ((1.0 - exp(-k * t)) / k);
  }
  return p0 + v0 * t + 0.5 * g * t * t;
}

vec3 fxVel(vec3 v0, vec3 g, vec3 w, float k, float t) {
  if (k > 1e-3) {
    vec3 vt = g / k + w;
    return vt + (v0 - vt) * exp(-k * t);
  }
  return v0 + g * t;
}
`;

export const PARTICLE_VERT = /* glsl */ `
${FX_MATH}
${TRAJECTORY}

attribute vec4 aSpawn;   // xyz spawn position, w spawn time
attribute vec4 aVel;     // xyz spawn velocity, w lifetime
attribute vec4 aDyn;     // x drag, y gravity scale, z size at birth, w size at death
attribute vec4 aCol0;    // rgb albedo (or T0,T1,intensity when FX_FIRE), a alpha at birth
attribute vec4 aCol1;    // rgb albedo at death (or r = soot when FX_FIRE), a alpha at death
attribute vec4 aMisc;    // x seed, y sprite index, z turbulence, w ground height
attribute vec4 aMisc2;   // x rotation, y spin, z stretch, w size curve

uniform float uTime;
uniform vec3 uWind;
uniform float uWindInfluence;
uniform float uSizeScale;
uniform vec2 uAtlasDim;
uniform vec2 uFade;
uniform float uOpacity;
uniform vec2 uCollide;   // x restitution, y tangential friction

varying vec2 vUv;
varying vec2 vAtlasBase;
varying vec4 vColor;
varying vec4 vParams;    // x temperature, y intensity, z normalised age, w grounded
varying float vDepth;

#if defined(FX_LIT) || defined(FX_FIRE)
varying vec3 vRight;
varying vec3 vUp;
varying vec3 vViewDir;
#endif

void main() {
  float life = aVel.w;
  float t = uTime - aSpawn.w;
  if (t < 0.0 || t >= life || life <= 0.0) {
    // Behind the far plane: clipped before it costs a single fragment.
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }

  float k = aDyn.x;
  vec3 g = vec3(0.0, -9.81 * aDyn.y, 0.0);
  vec3 wind = uWind * uWindInfluence;

  vec3 pos = fxPos(aSpawn.xyz, aVel.xyz, g, wind, k, t);
  vec3 vel = fxVel(aVel.xyz, g, wind, k, t);
  float grounded = 0.0;

#ifdef FX_COLLIDE
  if (pos.y < aMisc.w) {
    float lo = 0.0;
    float hi = t;
    for (int i = 0; i < 10; i++) {
      float mid = 0.5 * (lo + hi);
      if (fxPos(aSpawn.xyz, aVel.xyz, g, wind, k, mid).y < aMisc.w) hi = mid; else lo = mid;
    }
    vec3 hitVel = fxVel(aVel.xyz, g, wind, k, hi);
    vec3 hitPos = fxPos(aSpawn.xyz, aVel.xyz, g, wind, k, hi);
    hitPos.y = aMisc.w;
    hitVel.y = abs(hitVel.y) * uCollide.x;
    hitVel.xz *= uCollide.y;
    float t2 = t - hi;
    pos = fxPos(hitPos, hitVel, g, wind, k, t2);
    vel = fxVel(hitVel, g, wind, k, t2);
    if (pos.y <= aMisc.w) {
      pos.y = aMisc.w;
      vel = vec3(vel.x * 0.25, 0.0, vel.z * 0.25);
      grounded = 1.0;
    }
  }
#endif

  // Turbulence, growing with age: a rising column has to shear and curl or it
  // reads as a cone of billboards. Three incommensurate frequencies per axis is
  // enough to break up any visible period over a fifteen-second plume.
  float turbulence = aMisc.z;
  if (turbulence > 0.0) {
    float ph = aMisc.x * 61.7;
    vec3 curl = vec3(
      sin(t * 0.83 + ph) + 0.55 * sin(t * 2.17 + ph * 1.7),
      0.45 * sin(t * 0.61 + ph * 2.3) + 0.3 * sin(t * 1.93 + ph),
      cos(t * 0.97 + ph * 0.7) + 0.55 * cos(t * 1.79 + ph * 2.9)
    );
    pos += curl * turbulence * t;
  }

  float u = t / life;
  float size = mix(aDyn.z, aDyn.w, pow(u, aMisc2.w)) * uSizeScale;
  size *= mix(1.0, 0.5, grounded);

  float alpha = mix(aCol0.a, aCol1.a, u);
  alpha *= smoothstep(0.0, max(uFade.x, 1e-4), u);
  alpha *= 1.0 - smoothstep(1.0 - uFade.y, 1.0, u);
  alpha *= uOpacity;

  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

#ifdef FX_STRETCH
  float speed = length(vel);
  vec3 dir = speed > 1e-3 ? vel / speed : camUp;
  vec2 screenDir = vec2(dot(dir, camRight), dot(dir, camUp));
  float foreshorten = length(screenDir);
  vec2 axis = foreshorten > 1e-4 ? screenDir / foreshorten : vec2(0.0, 1.0);
  vec2 perp = vec2(-axis.y, axis.x);
  // Streak length is the distance actually covered in a shutter interval, so a
  // slow ember stays a dot, a hot fragment draws a line, and a round at nine
  // hundred metres a second draws several metres of one.
  float streak = min(max(size, speed * aMisc2.z), 60.0) * foreshorten;
  // Head-on the streak collapses; widening it a little keeps an incoming round
  // legible. Only a little: pushed further the round stops reading as a point
  // of light coming at you and starts reading as a lamp hanging in the street.
  float width = size * (1.0 + 0.5 * (1.0 - foreshorten));
  vec2 offset = axis * (uv.y - 1.0) * streak + perp * position.x * width;
#else
  vec2 offset = fxRotate(position.xy, aMisc2.x + aMisc2.y * t) * size;
#endif

  vec3 world = pos + camRight * offset.x + camUp * offset.y;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;

  vUv = uv;
  vAtlasBase = vec2(mod(aMisc.y, uAtlasDim.x), floor(aMisc.y / uAtlasDim.x)) / uAtlasDim;

#ifdef FX_FIRE
  // Temperature holds while the fuel is still burning and then collapses, so
  // the curve is convex rather than concave. It matters more than it sounds:
  // radiated power goes as the fourth power, so a curve that starts cooling
  // immediately has thrown away four fifths of the fireball's brightness by
  // the time the first frame is drawn and the blast reads as a bonfire.
  float temperature = mix(aCol0.r, aCol0.g, pow(u, 1.7));
  vColor = vec4(aCol1.rgb, alpha);
  vParams = vec4(temperature, aCol0.b, u, grounded);
#else
  // Burial thins as the cloud does: the smoke that was shading this puff has
  // spread and gone transparent by the time the screen is dying, so a wisp at
  // the end of its life is lit almost as if it were alone.
  vColor = vec4(mix(aCol0.rgb, aCol1.rgb, u), alpha);
  vParams = vec4(aMisc2.z * (1.0 - 0.55 * u), 0.0, u, grounded);
#endif

#if defined(FX_LIT) || defined(FX_FIRE)
  vRight = camRight;
  vUp = camUp;
  vViewDir = normalize(pos - cameraPosition);
#endif
}
`;

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;

${FX_MATH}
${FX_DEPTH}
${FX_BLACKBODY}
${FX_SCATTER}

uniform sampler2D uAtlas;
uniform vec2 uAtlasDim;
uniform float uAtlasInset;
uniform float uSoftness;
uniform float uExposure;

varying vec2 vUv;
varying vec2 vAtlasBase;
varying vec4 vColor;
varying vec4 vParams;
varying float vDepth;

#if defined(FX_LIT) || defined(FX_FIRE)
varying vec3 vRight;
varying vec3 vUp;
varying vec3 vViewDir;
#endif

void main() {
  vec2 tile = clamp(vUv, 0.0, 1.0) * (1.0 - 2.0 * uAtlasInset) + uAtlasInset;
  vec4 tex = texture2D(uAtlas, vAtlasBase + tile / uAtlasDim);

  float alpha = tex.a * vColor.a;
  if (alpha < 0.0025) discard;

  // Never let a particle clip on the near plane; a puff the camera walks into
  // has to dissolve rather than reveal its billboard.
  alpha *= clamp((vDepth - uDepthParams.x * 2.0) / 0.7, 0.0, 1.0);

#ifdef FX_SOFT
  if (uHasDepth > 0.5) {
    vec2 screenUv = gl_FragCoord.xy * uDepthParams.zw;
    float sceneDepth = fxLinearDepth(texture2D(uDepthTexture, screenUv).r);
    alpha *= clamp((sceneDepth - vDepth) / uSoftness, 0.0, 1.0);
  }
#endif

  if (alpha < 0.0025) discard;

  vec3 color;

#ifdef FX_FIRE
  // Hue varies across the puff, not just brightness: the dense core burns
  // hotter than the wisps peeling off it, which is what stops a fireball from
  // reading as one flat orange disc.
  float temperature = vParams.x * mix(0.84, 1.09, tex.g);
  color = fxBlackbody(temperature) * vParams.y * mix(0.65, 1.25, tex.r);
  // Soot. vColor.r is how much of it this particle is carrying — a muzzle
  // flash almost none, the burning-out shell of a fireball all of it — and the
  // sprite only modulates where within the puff it forms. Getting that from
  // the texture alone was wrong in exactly the place it mattered: the sprite's
  // soot mask lives in the thin torn edges, so the dense middle of a dying
  // fireball never darkened and the whole thing stayed a bright orange mass a
  // full second after it should have turned to smoke. Under premultiplied
  // blending this term is a real absorber, not a dimmer emitter, so the ball
  // goes black against the sky the way it does in gun-camera footage.
  float soot = vColor.r * mix(0.45, 1.0, tex.b) * smoothstep(0.02, 0.55, vParams.z);
  color *= mix(1.0, 0.02, soot);
#else
  #ifdef FX_LIT
    vec2 d = vUv * 2.0 - 1.0;
    float r2 = min(dot(d, d), 1.0);
    vec3 normalWS = normalize(vRight * d.x + vUp * d.y - vViewDir * sqrt(1.0 - r2));
    color = fxScatterLighting(vColor.rgb, normalWS, vViewDir, tex.g, vParams.x);
    color *= mix(0.74, 1.24, tex.r);
  #else
    color = vColor.rgb * mix(0.7, 1.3, tex.r);
    #ifdef FX_STRETCH
      // Tracer only: sparks are FX_FIRE and blood is FX_LIT, so neither reaches
      // here. The sprite's aux channel is the incandescent trace element, added
      // as white rather than tinted so the core saturates the tone curve while
      // the surrounding glow keeps its colour. Scaled by the particle's own
      // peak channel, so a heavier round burns a proportionally hotter core and
      // the amber and the green stay distinguishable at the same exposure.
      color += vec3(max(max(vColor.r, vColor.g), vColor.b) * tex.b * 1.2);
    #endif
  #endif
#endif

#ifdef FX_PREMULT
  // Premultiplied: the medium both emits and absorbs. Thin wisps add to what is
  // behind them exactly as additive blending would, while the dense middle of a
  // puff covers it — so a hundred overlapping fire sprites converge on the
  // colour of the front one instead of summing to white, and a sooty fold in
  // the shell darkens the fireball behind it. That absorption is the whole
  // difference between a turbulent volume and an orange disc, and it is
  // something a purely additive fireball can never do.
  gl_FragColor = vec4(color * uExposure * alpha, alpha);
#else
  gl_FragColor = vec4(color * uExposure, alpha);
#endif
}
`;
