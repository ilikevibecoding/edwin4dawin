import * as THREE from 'three';
import { buildTatooineTextures } from './planetTexture';

const atmosphereVert = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vCenter;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Atmospheric shell shaded by actual optical depth rather than a Fresnel rim.
 *
 * A `pow(1 - N·V)` rim peaks exactly at the shell's own silhouette, which draws
 * a hard-edged ring of blown-out colour around the planet. Integrating the
 * chord each view ray cuts through the shell instead puts the maximum just
 * outside the surface and falls to nothing at the top of the atmosphere, which
 * is what a limb actually looks like.
 */
const atmosphereFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  uniform float uIntensity;
  uniform float uInner;
  uniform float uOuter;
  uniform float uNightFill;
  varying vec3 vWorldPos;
  varying vec3 vCenter;

  /** Entry/exit parameters of a ray against a sphere; x > y means no hit. */
  vec2 sphereSpan(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float h = b * b - (dot(oc, oc) - r * r);
    if (h < 0.0) return vec2(1.0, -1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - ro);

    vec2 outer = sphereSpan(ro, rd, vCenter, uOuter);
    if (outer.y < outer.x) discard;
    float t0 = max(outer.x, 0.0);
    float t1 = outer.y;

    // Rays that reach the ground stop there; nothing behind the planet counts.
    vec2 inner = sphereSpan(ro, rd, vCenter, uInner);
    if (inner.y >= inner.x && inner.x > t0) t1 = min(t1, inner.x);

    float path = max(t1 - t0, 0.0);
    float grazing = 2.0 * sqrt(max(uOuter * uOuter - uInner * uInner, 1.0));
    float depth = path / grazing;

    // Beer-Lambert style saturation: the limb gets bright without clipping.
    float a = 1.0 - exp(-depth * uIntensity * 4.2);

    // Only the daylit hemisphere scatters. Sample the midpoint of the chord.
    vec3 midPoint = ro + rd * mix(t0, t1, 0.5);
    float lit = smoothstep(-0.32, 0.28, dot(normalize(midPoint - vCenter), normalize(uSunDir)));
    a *= uNightFill + lit * (1.0 - uNightFill);

    // Forward scattering when looking back toward the sun through the limb.
    float halo = pow(clamp(dot(rd, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0), 4.0);
    a *= 1.0 + halo * 0.7;

    if (a < 0.002) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.95, 0.86), halo * 0.55);
    gl_FragColor = vec4(col * a, a);
  }
`;

export interface TatooineOptions {
  radius?: number;
  segments?: number;
}

/**
 * The desert world.
 *
 * Three shells: the baked surface, a slowly counter-rotating dust layer, and a
 * back-faced atmosphere shell that produces the bright limb. The sun direction
 * is shared with the scene's key light so the terminator always agrees with the
 * lighting on the ships.
 */
export class Tatooine {
  readonly root = new THREE.Group();
  readonly radius: number;
  readonly surface: THREE.Mesh;
  readonly clouds: THREE.Mesh;
  readonly atmosphere: THREE.Mesh;
  private readonly innerHaze: THREE.Mesh;
  private readonly sunDir = new THREE.Vector3(0.55, 0.32, -0.77).normalize();

  constructor(opts: TatooineOptions = {}) {
    const R = (this.radius = opts.radius ?? 12000);
    const seg = opts.segments ?? 128;
    this.root.name = 'Tatooine';

    const tex = buildTatooineTextures(seg >= 128 ? 1024 : 768);

    const surfaceMat = new THREE.MeshStandardMaterial({
      map: tex.albedo,
      roughnessMap: tex.rough,
      bumpMap: tex.bump,
      bumpScale: 8,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
    });
    this.surface = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg / 2), surfaceMat);
    this.surface.name = 'Tatooine_Surface';
    this.surface.receiveShadow = false;
    this.root.add(this.surface);

    const cloudMat = new THREE.MeshStandardMaterial({
      map: tex.clouds,
      transparent: true,
      opacity: 0.42,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
    });
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.006, Math.max(48, seg / 2), Math.max(24, seg / 4)),
      cloudMat,
    );
    this.clouds.name = 'Tatooine_Dust';
    this.root.add(this.clouds);

    const OUTER = R * 1.035;
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffbe86) },
        uSunDir: { value: this.sunDir.clone() },
        uIntensity: { value: 0.55 },
        uInner: { value: R },
        uOuter: { value: OUTER },
        uNightFill: { value: 0.05 },
      },
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    // The back-faced shell paints the ring outside the disc; it is depth-tested
    // away everywhere the planet itself is in front of it.
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(OUTER, 96, 48), atmoMat);
    this.atmosphere.name = 'Tatooine_Atmosphere';
    this.atmosphere.renderOrder = 2;
    this.root.add(this.atmosphere);

    // A front-faced shell just above the ground carries the same integral over
    // the disc itself, so the haze thickens smoothly toward the edge.
    const hazeMat = atmoMat.clone();
    hazeMat.side = THREE.FrontSide;
    hazeMat.uniforms.uIntensity.value = 0.2;
    this.innerHaze = new THREE.Mesh(new THREE.SphereGeometry(R * 1.0015, 96, 48), hazeMat);
    this.innerHaze.name = 'Tatooine_Haze';
    this.innerHaze.renderOrder = 1;
    this.root.add(this.innerHaze);
  }

  /** Keep the atmosphere consistent with the scene key light. */
  setSunDirection(dir: THREE.Vector3): void {
    this.sunDir.copy(dir).normalize();
    (this.atmosphere.material as THREE.ShaderMaterial).uniforms.uSunDir.value.copy(this.sunDir);
    (this.innerHaze.material as THREE.ShaderMaterial).uniforms.uSunDir.value.copy(this.sunDir);
  }

  update(_dt: number, elapsed: number): void {
    this.surface.rotation.y = elapsed * 0.0009;
    this.clouds.rotation.y = elapsed * 0.0016 + 0.4;
  }

  dispose(): void {
    this.surface.geometry.dispose();
    this.clouds.geometry.dispose();
    this.atmosphere.geometry.dispose();
    this.innerHaze.geometry.dispose();
  }
}
