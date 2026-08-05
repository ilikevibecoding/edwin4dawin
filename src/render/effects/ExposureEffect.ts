import * as THREE from 'three';
import { Effect } from 'postprocessing';

/**
 * Scene-referred exposure and white balance, applied before tone mapping so
 * highlights roll off through the filmic curve instead of clipping.
 * Also carries the whole-frame flash used for gunshots and lightning.
 */
const FRAG = /* glsl */ `
uniform float uExposure;
uniform vec3 uTint;
uniform vec3 uFlashColor;
uniform float uFlash;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb * uExposure * uTint;
  col += uFlashColor * uFlash;
  outputColor = vec4(col, inputColor.a);
}
`;

export class ExposureEffect extends Effect {
  constructor(exposure = 1, tint: [number, number, number] = [1, 1, 1]) {
    super('ExposureEffect', FRAG, {
      uniforms: new Map<string, THREE.Uniform<unknown>>([
        ['uExposure', new THREE.Uniform(exposure)],
        ['uTint', new THREE.Uniform(new THREE.Vector3(...tint))],
        ['uFlashColor', new THREE.Uniform(new THREE.Color(1, 1, 1))],
        ['uFlash', new THREE.Uniform(0)],
      ]),
    });
  }

  set exposure(v: number) {
    (this.uniforms.get('uExposure') as THREE.Uniform<number>).value = v;
  }

  get exposure(): number {
    return (this.uniforms.get('uExposure') as THREE.Uniform<number>).value;
  }

  setTint(t: [number, number, number]): void {
    (this.uniforms.get('uTint') as THREE.Uniform<THREE.Vector3>).value.set(...t);
  }

  setFlash(strength: number, color: THREE.ColorRepresentation = 0xffffff): void {
    (this.uniforms.get('uFlash') as THREE.Uniform<number>).value = strength;
    (this.uniforms.get('uFlashColor') as THREE.Uniform<THREE.Color>).value.set(color);
  }

  get flash(): number {
    return (this.uniforms.get('uFlash') as THREE.Uniform<number>).value;
  }
}
