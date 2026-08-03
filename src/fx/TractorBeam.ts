import * as THREE from 'three';
import { clamp01 } from '../core/math';

/**
 * Tractor beam between two hulls.
 *
 * Drawn as a tapered open shell whose opacity follows how much of the beam
 * volume the eye is looking through — brightest down the middle, falling off at
 * the silhouette — plus travelling rings that run from the projector toward the
 * captured ship. A plain additive cone reads as a solid blue funnel stuck to
 * the hull; this reads as light.
 */
export class TractorBeam {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private strength = 0;

  constructor(
    private readonly nearRadius = 16,
    private readonly farRadius = 62,
    color = 0x86d2ff,
  ) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 30, 28, true);
    geo.translate(0, -0.5, 0);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uNear: { value: nearRadius },
        uFar: { value: farRadius },
      },
      vertexShader: /* glsl */ `
        uniform float uNear;
        uniform float uFar;
        varying float vT;
        varying vec3 vViewPos;
        varying vec3 vViewNormal;
        void main() {
          // position.y runs 0 at the projector to -1 at the captured ship.
          vT = -position.y;
          float r = mix(uNear, uFar, vT);
          vec3 p = vec3(position.x * r, position.y, position.z * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vViewPos = mv.xyz;
          vViewNormal = normalMatrix * vec3(normal.x, 0.0, normal.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying float vT;
        varying vec3 vViewPos;
        varying vec3 vViewNormal;
        void main() {
          // Thickness of beam volume along the view ray, approximated by how
          // squarely this bit of shell faces the camera.
          float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPos)));
          float body = pow(facing, 1.25);
          // Fade in off the projector and out into the captured hull.
          float taper = smoothstep(0.0, 0.07, vT) * (1.0 - smoothstep(0.82, 1.0, vT));
          float rings = 0.82 + 0.18 * sin(vT * 30.0 - uTime * 3.4);
          // A small floor under the body term keeps the silhouette from going
          // black, which is what makes a cone read as light rather than as
          // plastic. Too large a floor and the whole volume turns into a slab.
          float a = uOpacity * taper * rings * (0.09 + 0.91 * body);
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor * (0.5 + 0.6 * body), a);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'TractorBeam';
    this.mesh.renderOrder = 4;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** 0 = off, 1 = full grip. */
  setStrength(v: number): void {
    this.strength = clamp01(v);
    this.material.uniforms.uOpacity.value = this.strength * 0.26;
    this.mesh.visible = this.strength > 0.01;
  }

  /** Aim the beam from a projector to a captured hull (world space). */
  aim(from: THREE.Vector3, to: THREE.Vector3): void {
    this.from.copy(from);
    this.to.copy(to);
    this.mesh.position.copy(from);
    const dir = this.to.clone().sub(from);
    const len = Math.max(1, dir.length());
    this.mesh.scale.set(1, len, 1);
    // Keep the cone's flare proportional to its throw. A fixed far radius turns
    // into a squat mushroom once the corvette has been pulled in close.
    this.material.uniforms.uNear.value = this.nearRadius;
    this.material.uniforms.uFar.value = Math.min(
      this.farRadius,
      Math.max(this.nearRadius * 1.25, len * 0.17),
    );
    // The shell is built along local -Y (0 at the projector, -1 at the captured
    // hull), so it is -Y, not +Y, that has to end up pointing at the target.
    this.mesh.quaternion.setFromUnitVectors(DOWN, dir.normalize());
  }

  update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

const DOWN = new THREE.Vector3(0, -1, 0);
