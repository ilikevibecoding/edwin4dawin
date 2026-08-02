import * as THREE from 'three';
import { buildTatooineTextures } from './planetTexture';

const atmosphereVert = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const atmosphereFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uNightFill;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float facing = clamp(dot(N, V), 0.0, 1.0);
    float rim = pow(1.0 - facing, uPower);

    // Forward scattering: the limb glows hardest where the sun grazes it.
    float sun = dot(N, normalize(uSunDir));
    float lit = smoothstep(-0.45, 0.35, sun);
    float halo = pow(clamp(dot(normalize(-V), normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0), 3.0);

    float a = rim * (uNightFill + lit * (1.0 - uNightFill)) * uIntensity;
    a += rim * halo * 0.55 * uIntensity;
    vec3 col = mix(uColor, vec3(1.0, 0.93, 0.82), halo * 0.5);
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
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

    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb877) },
        uSunDir: { value: this.sunDir.clone() },
        uIntensity: { value: 1.55 },
        uPower: { value: 3.1 },
        uNightFill: { value: 0.06 },
      },
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R * 1.055, 64, 32), atmoMat);
    this.atmosphere.name = 'Tatooine_Atmosphere';
    this.atmosphere.renderOrder = 2;
    this.root.add(this.atmosphere);

    // A faint front-facing haze softens the disc near the edge.
    const hazeMat = atmoMat.clone();
    hazeMat.side = THREE.FrontSide;
    hazeMat.uniforms.uIntensity.value = 0.42;
    hazeMat.uniforms.uPower.value = 2.1;
    this.innerHaze = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 32), hazeMat);
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
