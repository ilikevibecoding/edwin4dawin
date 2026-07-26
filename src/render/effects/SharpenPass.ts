import * as THREE from 'three';
import { ShaderPass } from 'postprocessing';

/**
 * AMD FidelityFX-style contrast-adaptive sharpening.
 *
 * Runs after anti-aliasing to restore the micro-contrast that SMAA and any
 * upscaling wash out. It is contrast-adaptive so flat regions (sky, fog) stay
 * clean while edges and texture detail get crisped, avoiding the halos that a
 * plain unsharp mask produces.
 */
const fragment = /* glsl */ `
uniform sampler2D inputBuffer;
uniform vec2 texelSize;
uniform float sharpness;
varying vec2 vUv;

void main() {
  vec2 t = texelSize;

  vec3 a = texture2D(inputBuffer, vUv + vec2(-t.x, -t.y)).rgb;
  vec3 b = texture2D(inputBuffer, vUv + vec2( 0.0, -t.y)).rgb;
  vec3 c = texture2D(inputBuffer, vUv + vec2( t.x, -t.y)).rgb;
  vec3 d = texture2D(inputBuffer, vUv + vec2(-t.x,  0.0)).rgb;
  vec3 e = texture2D(inputBuffer, vUv).rgb;
  vec3 f = texture2D(inputBuffer, vUv + vec2( t.x,  0.0)).rgb;
  vec3 g = texture2D(inputBuffer, vUv + vec2(-t.x,  t.y)).rgb;
  vec3 h = texture2D(inputBuffer, vUv + vec2( 0.0,  t.y)).rgb;
  vec3 i = texture2D(inputBuffer, vUv + vec2( t.x,  t.y)).rgb;

  vec3 mnRGB = min(min(min(d, e), min(f, b)), h);
  vec3 mnRGB2 = min(mnRGB, min(min(a, c), min(g, i)));
  mnRGB += mnRGB2;

  vec3 mxRGB = max(max(max(d, e), max(f, b)), h);
  vec3 mxRGB2 = max(mxRGB, max(max(a, c), max(g, i)));
  mxRGB += mxRGB2;

  // Local contrast drives how much sharpening is safe here.
  vec3 rcpMRGB = 1.0 / max(mxRGB, vec3(1e-4));
  vec3 amp = clamp(min(mnRGB, 2.0 - mxRGB) * rcpMRGB, 0.0, 1.0);
  amp = sqrt(amp);

  float peak = -1.0 / mix(8.0, 5.0, clamp(sharpness, 0.0, 1.0));
  vec3 w = amp * peak;
  vec3 rcpWeight = 1.0 / max(1.0 + 4.0 * w, vec3(1e-4));

  vec3 result = ((b + d + f + h) * w + e) * rcpWeight;
  gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

export class SharpenPass extends ShaderPass {
  constructor(sharpness = 0.4) {
    const material = new THREE.ShaderMaterial({
      name: 'SharpenMaterial',
      uniforms: {
        inputBuffer: { value: null },
        texelSize: { value: new THREE.Vector2() },
        sharpness: { value: sharpness },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 1.0, 1.0);
        }
      `,
      fragmentShader: fragment,
      depthWrite: false,
      depthTest: false,
    });
    super(material, 'inputBuffer');
    this.name = 'SharpenPass';
  }

  get sharpness(): number {
    return (this.fullscreenMaterial as THREE.ShaderMaterial).uniforms.sharpness.value as number;
  }

  set sharpness(v: number) {
    (this.fullscreenMaterial as THREE.ShaderMaterial).uniforms.sharpness.value = v;
  }

  override setSize(width: number, height: number) {
    const mat = this.fullscreenMaterial as THREE.ShaderMaterial;
    (mat.uniforms.texelSize.value as THREE.Vector2).set(1 / width, 1 / height);
  }
}
