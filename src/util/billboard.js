// Camera-facing glow quads that hold a constant angular size, so a missile
// 20 km away is still a readable point of light without cheating its position.

import * as THREE from 'three';
import { atmosphere } from './materials.js';

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec4 t = texture2D( uMap, vUv );
  float a = t.a * uOpacity;
  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( t.rgb * uColor, a );
}
`;

export class GlowSprite {
  /**
   * @param {number} angular apparent size in radians at any distance
   * @param {number} minSize world-space floor so close-up sprites are not tiny
   */
  constructor(texture, color, angular = 0.0022, minSize = 1.5) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    this.angular = angular;
    this.minSize = minSize;
    this.maxSize = 1e6;
  }

  setColor(c) {
    this.mat.uniforms.uColor.value.set(c);
  }

  set opacity(v) {
    this.mat.uniforms.uOpacity.value = v;
  }

  get opacity() {
    return this.mat.uniforms.uOpacity.value;
  }

  update(camera, scale = 1) {
    const d = this.mesh.position.distanceTo(camera.position);
    const s = THREE.MathUtils.clamp(d * this.angular * scale, this.minSize * scale, this.maxSize);
    this.mesh.scale.setScalar(s);
    this.mesh.quaternion.copy(camera.quaternion);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

export { atmosphere };
