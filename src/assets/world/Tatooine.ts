import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import type { MaterialLibrary } from '../materials';
import {
  makeDesertDetailTexture, makeDesertPlanetTexture, makeDustCloudTexture, makeNormalFromHeight,
} from '../textures';

/**
 * Tatooine.
 *
 * Three nested shells: the lit surface, a thin dust/cloud veil that rotates
 * slightly faster than the ground, and an outward-facing atmosphere shell whose
 * Fresnel term produces the bright limb. Radius is 200 km of scene units - large
 * enough that the horizon curves gently behind 1.6 km of Imperial hull without
 * pushing the depth buffer past its useful range.
 */

export const PLANET_RADIUS = 200_000;

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    // Sphere normals always point outward, whichever face is being rasterised.
    vec3 n = normalize(vNormalW);
    float rim = 1.0 - abs(dot(n, normalize(vViewDir)));
    rim = pow(clamp(rim, 0.0, 1.0), uPower);

    // Only glow where the atmosphere is actually lit, with a soft terminator.
    float sun = dot(n, normalize(uSunDir));
    float lit = smoothstep(-0.35, 0.4, sun);

    float a = rim * uIntensity * (0.06 + 0.94 * lit);
    gl_FragColor = vec4(uColor * (0.55 + 1.1 * lit), a);
  }
`;

export class Tatooine {
  readonly group = new THREE.Group();
  readonly surface: THREE.Mesh;
  readonly clouds: THREE.Mesh;
  readonly atmosphere: THREE.Mesh;
  readonly radius = PLANET_RADIUS;
  private atmoMat: THREE.ShaderMaterial;
  private cloudMat: THREE.MeshLambertMaterial;

  constructor(lib: MaterialLibrary, seed = 'tatooine') {
    const rng = new Rng(seed);
    const q = lib.qualitySettings;
    const seg = q.planetSegments;
    this.group.name = 'Tatooine';

    const surfaceTex = lib.registry.track(
      makeDesertPlanetTexture(rng.fork('surface'), q.level === 'low' ? 2048 : 4096),
    );

    // The colour map carries continent-scale variation; a seamless tiled detail
    // normal supplies everything finer, which is what stops the surface from
    // smearing when the camera is only 52 km up.
    const detailHeight = lib.registry.track(makeDesertDetailTexture(rng.fork('detail'), 512));
    const detailNormal = lib.registry.track(makeNormalFromHeight(detailHeight, 4.2));
    detailNormal.wrapS = detailNormal.wrapT = THREE.RepeatWrapping;
    detailNormal.repeat.set(72, 36);
    detailNormal.anisotropy = 8;
    detailHeight.wrapS = detailHeight.wrapT = THREE.RepeatWrapping;
    detailHeight.repeat.set(72, 36);

    const surfaceGeo = new THREE.SphereGeometry(PLANET_RADIUS, seg, Math.max(24, seg / 2));
    const surfaceMat = new THREE.MeshStandardMaterial({
      map: surfaceTex,
      normalMap: detailNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughnessMap: detailHeight,
      roughness: 0.98,
      metalness: 0.0,
    });

    // Modulate the (necessarily low-frequency) colour map with the same tiled
    // detail so albedo gains high-frequency structure without a huge texture.
    surfaceMat.onBeforeCompile = (shader) => {
      shader.uniforms.uDetail = { value: detailHeight };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uDetail;')
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D( map, vMapUv );
            float dA = texture2D( uDetail, vMapUv * vec2(72.0, 36.0) ).r;
            float dB = texture2D( uDetail, vMapUv * vec2(311.0, 157.0) + 0.37 ).r;
            float detail = mix( dA, dB, 0.4 );
            sampledDiffuseColor.rgb *= 0.80 + 0.42 * detail;
            diffuseColor *= sampledDiffuseColor;
          #endif
        `,
        );
    };
    lib.registry.track(surfaceGeo);
    lib.registry.track(surfaceMat);
    this.surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    this.surface.name = 'tatooine-surface';
    this.group.add(this.surface);

    // Dust veil.
    const cloudTex = lib.registry.track(makeDustCloudTexture(rng.fork('dust'), q.level === 'low' ? 1024 : 2048));
    const cloudGeo = new THREE.SphereGeometry(PLANET_RADIUS * 1.004, Math.max(48, seg / 2), Math.max(24, seg / 4));
    this.cloudMat = new THREE.MeshLambertMaterial({
      map: cloudTex, transparent: true, opacity: 0.7, depthWrite: false,
    });
    lib.registry.track(cloudGeo);
    lib.registry.track(this.cloudMat);
    this.clouds = new THREE.Mesh(cloudGeo, this.cloudMat);
    this.clouds.name = 'tatooine-dust';
    this.group.add(this.clouds);

    // Atmosphere limb.
    const atmoGeo = new THREE.SphereGeometry(PLANET_RADIUS * 1.035, Math.max(48, seg / 2), Math.max(24, seg / 4));
    this.atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb877) },
        uSunDir: { value: new THREE.Vector3(1, 0.25, 0.6).normalize() },
        uIntensity: { value: 1.35 },
        uPower: { value: 6.0 },
      },
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    lib.registry.track(atmoGeo);
    lib.registry.track(this.atmoMat);
    this.atmosphere = new THREE.Mesh(atmoGeo, this.atmoMat);
    this.atmosphere.name = 'tatooine-atmosphere';
    this.atmosphere.renderOrder = 2;
    this.group.add(this.atmosphere);
  }

  setSunDirection(dir: THREE.Vector3): void {
    (this.atmoMat.uniforms.uSunDir.value as THREE.Vector3).copy(dir).normalize();
  }

  /** Deterministic slow rotation - the planet must never look like a still. */
  update(t: number): void {
    this.surface.rotation.y = t * 0.0016;
    this.clouds.rotation.y = t * 0.0026;
    this.cloudMat.opacity = 0.5 + Math.sin(t * 0.07) * 0.05;
  }
}
