/**
 * GPU particle shader (instanced billboard quads).
 *
 * The CPU writes a handful of spawn parameters per particle into instanced
 * attributes and never touches them again; the vertex shader integrates
 * position, size, rotation, colour and atlas frame purely from `uTime`.
 *
 * Feature flags (packed into `aAtlas.w`, summed):
 *   1  LIT      — tint by sun/ambient using a fake outward normal
 *   2  STRETCH  — orient & stretch the quad along screen-space velocity
 *   4  SOFT     — depth-buffer soft-particle fade
 *   8  TURB     — sinusoidal curl-ish turbulence displacement
 *  16  ALIGN    — orient quad long axis (local +Y) along screen projection of
 *                 aVel with a fixed aspect ratio (aExtra.x). Used for the
 *                 barrel-aligned muzzle flash so the flash points down the bore
 *                 regardless of camera angle, independent of travel speed.
 *
 * Fade modes (`aAtlas.z`):
 *   0 smoke   1 spark   2 flash   3 dust   4 solid   5 fire   6 fireball
 *   7 muzzle  — snap on, hold full, fast drop (survives coarse capture dt)
 */

export const PARTICLE_VERT = /* glsl */ `
precision highp float;

attribute vec3 aSpawn;
attribute vec3 aVel;
attribute vec3 aColor0;
attribute vec3 aColor1;
attribute vec4 aParams; // spawnTime, lifetime, sizeStart, sizeEnd
attribute vec4 aDyn;    // gAccel, drag, rot0, rotSpeed
attribute vec4 aAtlas;  // cell, frames, fadeMode, flags
attribute vec4 aExtra;  // stretch, opacity, turb, seed

uniform float uTime;
uniform float uAtlasCols;

varying vec2  vUv;
varying vec3  vColor;
varying float vAlpha;
varying float vFade;   // envelope alpha
varying float vViewZ;  // positive eye-space depth of the particle centre
varying vec3  vNormal; // fake world normal for lighting
varying float vFlags;

float fadeEnvelope(float mode, float t) {
  if (mode < 0.5) {            // smoke
    return smoothstep(0.0, 0.16, t) * (1.0 - smoothstep(0.5, 1.0, t));
  } else if (mode < 1.5) {     // spark
    return pow(1.0 - t, 1.6);
  } else if (mode < 2.5) {     // flash
    return t < 0.18 ? t / 0.18 : max(0.0, exp(-(t - 0.18) / 0.16));
  } else if (mode < 3.5) {     // dust
    return smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.35, 1.0, t));
  } else if (mode < 4.5) {     // solid (debris/casing)
    return 1.0 - smoothstep(0.82, 1.0, t);
  } else if (mode < 5.5) {     // fire
    return pow(1.0 - t, 1.1);
  } else if (mode < 6.5) {     // fireball body: snap opaque, hold, dissolve
    return smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.5, 1.0, t));
  }
  // muzzle flash: instant on, brief hold at full, then a fast drop. Holding
  // full for the first ~half of the (short) life means the flash still reads
  // at a coarse capture dt instead of being aliased to near-zero.
  return 1.0 - smoothstep(0.4, 1.0, t);
}

void main() {
  float age = uTime - aParams.x;
  float life = max(aParams.y, 1e-4);
  float t = age / life;

  // Dead / not yet born: collapse to a degenerate point so it draws nothing.
  if (age < 0.0 || t >= 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0; vFade = 0.0; vUv = vec2(0.0); vColor = vec3(0.0);
    vViewZ = 0.0; vNormal = vec3(0.0, 1.0, 0.0); vFlags = 0.0;
    return;
  }

  float flags = aAtlas.w;
  vFlags = flags;
  bool STRETCH = mod(floor(flags / 2.0), 2.0) > 0.5;
  bool TURB    = mod(floor(flags / 8.0), 2.0) > 0.5;
  bool ALIGN   = mod(floor(flags / 16.0), 2.0) > 0.5;

  // --- integrate motion (linear drag + constant vertical accel) ------------
  float k = aDyn.y;
  float decay = k > 1e-4 ? (1.0 - exp(-k * age)) / k : age;
  vec3 pos = aSpawn + aVel * decay;
  pos.y += 0.5 * aDyn.x * age * age;

  if (TURB) {
    float s = aExtra.w * 6.2831;
    float amt = aExtra.z * (0.3 + t);
    pos.x += sin(uTime * 0.7 + s + pos.y * 0.6) * amt;
    pos.z += cos(uTime * 0.6 + s * 1.3 + pos.y * 0.5) * amt;
    pos.y += sin(uTime * 0.5 + s * 0.7) * amt * 0.3;
  }

  // fake outward normal for lighting: velocity direction (bursts spray out,
  // plumes rise), falling back to up.
  vNormal = length(aVel) > 1e-3 ? normalize(aVel) : vec3(0.0, 1.0, 0.0);

  // --- size + rotation ------------------------------------------------------
  float size = mix(aParams.z, aParams.w, t);
  float rot = aDyn.z + aDyn.w * age;

  vec4 mvCenter = viewMatrix * vec4(pos, 1.0);
  vViewZ = -mvCenter.z;

  vec2 corner = position.xy; // base quad spans [-0.5, 0.5]
  vec2 baseUv = corner + 0.5;
  vec2 offset;
  if (STRETCH) {
    vec3 velT = aVel * exp(-k * age);
    vec3 velView = (viewMatrix * vec4(velT, 0.0)).xyz;
    float sp = length(velView.xy);
    vec2 dir = sp > 1e-4 ? velView.xy / sp : vec2(0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);
    float len = size * (1.0 + sp * aExtra.x);
    offset = perp * (corner.x * size) + dir * (corner.y * len);
  } else if (ALIGN) {
    // Long axis (local +Y) follows the screen projection of aVel (the bore
    // direction); fixed aspect via aExtra.x so speed doesn't change the shape.
    vec3 dv = (viewMatrix * vec4(aVel, 0.0)).xyz;
    vec2 ax = length(dv.xy) > 1e-4 ? normalize(dv.xy) : vec2(0.0, 1.0);
    vec2 perp = vec2(-ax.y, ax.x);
    float aspect = max(aExtra.x, 0.01);
    offset = perp * (corner.x * size) + ax * (corner.y * size * aspect);
  } else {
    float c = cos(rot), s = sin(rot);
    vec2 rc = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
    offset = rc * size;
  }
  mvCenter.xy += offset;
  gl_Position = projectionMatrix * mvCenter;

  // --- atlas frame ----------------------------------------------------------
  float frames = max(aAtlas.y, 1.0);
  float fi = min(frames - 1.0, floor(t * frames));
  float cell = aAtlas.x + fi;
  float col = mod(cell, uAtlasCols);
  float row = floor(cell / uAtlasCols);
  vUv = (vec2(col, row) + baseUv) / uAtlasCols;

  vColor = mix(aColor0, aColor1, t);
  vFade = fadeEnvelope(aAtlas.z, t);
  vAlpha = aExtra.y;
}
`;

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uAtlas;
uniform int  uAdditive;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogHeight;      // camera height, for a mild height falloff
uniform sampler2D uDepthTex;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform int  uSoftEnabled;
uniform float uSoftDist;

varying vec2  vUv;
varying vec3  vColor;
varying float vAlpha;
varying float vFade;
varying float vViewZ;
varying vec3  vNormal;
varying float vFlags;

float linearizeDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}

void main() {
  vec4 texel = texture2D(uAtlas, vUv);
  float shape = texel.a;
  if (shape <= 0.003) discard;

  float flags = vFlags;
  bool LIT  = mod(flags, 2.0) > 0.5;
  bool SOFT = mod(floor(flags / 4.0), 2.0) > 0.5;

  // --- soft-particle depth fade --------------------------------------------
  float soft = 1.0;
  if (SOFT && uSoftEnabled == 1) {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float sceneD = linearizeDepth(texture2D(uDepthTex, uv).x);
    soft = clamp((sceneD - vViewZ) / uSoftDist, 0.0, 1.0);
    // also fade as the particle approaches the camera near plane
    soft *= clamp((vViewZ - uNear) / 0.4, 0.0, 1.0);
  }

  // --- fog ------------------------------------------------------------------
  float fog = 1.0 - exp(-vViewZ * uFogDensity);
  fog = clamp(fog, 0.0, 1.0);

  vec3 color = vColor * texel.rgb;

  if (uAdditive == 1) {
    float a = shape * vFade * vAlpha * soft;
    // fog attenuates emissive contribution rather than tinting toward grey
    a *= (1.0 - fog * 0.85);
    gl_FragColor = vec4(color * a, a);
  } else {
    if (LIT) {
      float ndl = clamp(dot(vNormal, uSunDir), 0.0, 1.0);
      // wrap lighting so back faces of the puff aren't black
      float wrap = dot(vNormal, uSunDir) * 0.5 + 0.5;
      vec3 light = uAmbient + uSunColor * (ndl * 0.7 + wrap * 0.3);
      color *= light;
    }
    color = mix(color, uFogColor, fog);
    float a = shape * vFade * vAlpha * soft;
    gl_FragColor = vec4(color, a);
  }
}
`;
