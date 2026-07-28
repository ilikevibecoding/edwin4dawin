/**
 * The targeting interface's line work.
 *
 * Everything drawn on the tactical plan — brackets, rings, the run-in arrow,
 * threat marks and the seven-segment readouts — is one mesh of ribbons lying
 * on the ground, and this is the material that draws them.
 *
 * Three decisions matter. The ribbons have a real width in *metres* rather than
 * being GL lines, because a one-pixel line is the single clearest tell that
 * something is a debug overlay: it does not thicken as the camera drops, it
 * aliases into dashes of its own accord, and `linewidth` has been ignored by
 * every desktop driver for a decade. The whole mesh is drawn with depth
 * testing off, unlike the footprint underneath it, because symbology is
 * *instrument* and the instrument is not inside the world — the marker may
 * disappear under an arcade to tell you the bombs cannot reach, but the
 * bracket that tells you where your reticle is must never be hidden by a wall.
 *
 * And every stroke carries a dark halo, drawn with ordinary alpha rather than
 * additively. That is the difference between symbology and a smear of green
 * light. An additive line over sunlit render at golden hour is a pale wash
 * that vanishes into the highlight it sits on; the same line with a black
 * shoulder under it reads at full contrast over white plaster, over shadow and
 * over the sky, which is exactly what a sticker of ink on glass does and
 * exactly what the eye expects an instrument to do.
 */

export const SYMBOL_VERT = /* glsl */ `
attribute float aSide;    // -1..1 across the ribbon
attribute float aAlong;   // metres travelled along the run of ribbon
attribute vec2 aStyle;    // dash period in metres (0 = solid), intensity

varying float vSide;
varying float vAlong;
varying vec2 vStyle;

void main() {
  vSide = aSide;
  vAlong = aAlong;
  vStyle = aStyle;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SYMBOL_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uValid;

varying float vSide;
varying float vAlong;
varying vec2 vStyle;

void main() {
  // Across the ribbon: a hard bright core inside a dark shoulder. The shoulder
  // is what makes the stroke survive a sunlit roof, and the two together are
  // what a drawn line looks like at any distance.
  float a = abs(vSide);
  float core = 1.0 - smoothstep(0.30, 0.56, a);
  float halo = 1.0 - smoothstep(0.62, 1.0, a);

  // Dashes are measured in metres along the run, so a dashed ring and a dashed
  // axis have the same pitch however different their lengths.
  float dash = 1.0;
  if (vStyle.x > 0.001) {
    float p = fract(vAlong / vStyle.x);
    dash = smoothstep(0.0, 0.06, p) * (1.0 - smoothstep(0.52, 0.60, p));
  }

  // An invalid target strobes. Motion is the cue the eye picks up first, and
  // it has to be legible without reading the colour at all.
  float pulse = mix(0.5 + 0.5 * abs(sin(uTime * 5.5)), 1.0, uValid);

  float ink = clamp(core * vStyle.y, 0.0, 1.0);
  float alpha = max(ink, halo * dash * 0.9) * dash * uOpacity * pulse;
  if (alpha < 0.004) discard;

  // Just over unity in the core, and no further.
  //
  // This was at 2.6 and photographed as pale yellow-white line work. A stroke
  // is drawn into an HDR buffer and then tone mapped, and a tone mapper's whole
  // job is to bend everything above one back toward white — so pushing a green
  // to a radiance of two and a half does not make it a brighter green, it makes
  // it a desaturated one, and then the bloom spreads the desaturation. Held
  // just above the knee the stroke still blooms and still reads as lit glass,
  // and it survives the curve as the colour it was authored in.
  vec3 rgb = mix(vec3(0.002, 0.008, 0.006), uColor * 1.85, ink);
  gl_FragColor = vec4(rgb, alpha);
}
`;
