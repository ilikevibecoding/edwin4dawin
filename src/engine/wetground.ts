/**
 * Wet ground: a physical material with a real planar reflection layered on top.
 *
 * The reflection camera / oblique clip-plane math follows three's `Reflector`,
 * but the result is composited into a full PBR surface (asphalt albedo, ripple
 * normals, wetness mask) instead of replacing it — which is what makes rain-lit
 * streets read as *wet* rather than as a mirror.
 */
import * as THREE from 'three';
import * as Tex from './textures';
import { clamp } from './math';

export type WetGroundOpts = {
  size?: number;
  y?: number;
  texRepeat?: number;
  resolution?: number;
  wetness?: number;
  reflectStrength?: number;
  color?: THREE.ColorRepresentation;
  rippleScale?: number;
  /** Reflection texture blur, in reflection-texture pixels. */
  blur?: number;
  segments?: number;
};

export class WetGround {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  private rt: THREE.WebGLRenderTarget;
  private reflCam = new THREE.PerspectiveCamera();
  private textureMatrix = new THREE.Matrix4();
  private plane = new THREE.Plane();
  private uniforms: Record<string, THREE.IUniform> = {};
  private enabled: boolean;
  private y: number;

  constructor(opts: WetGroundOpts = {}) {
    const size = opts.size ?? 120;
    const res = opts.resolution ?? 0.5;
    this.y = opts.y ?? 0;
    this.enabled = res > 0;

    const w = Math.max(64, Math.floor(1024 * res));
    const h = Math.max(64, Math.floor(576 * res));
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });

    const set = Tex.asphalt(512);
    const rep = opts.texRepeat ?? size / 4;
    for (const t of [set.map, set.normalMap, set.roughnessMap]) t?.repeat.set(rep, rep);
    const ripple = Tex.rippleNormal(256);
    ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;

    this.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(opts.color ?? 0x8a9096).convertSRGBToLinear(),
      map: set.map,
      normalMap: set.normalMap,
      roughnessMap: set.roughnessMap,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.5, 0.5),
      // A near-mirror surface would otherwise reflect the whole sky dome and
      // turn the road into a lightbox.
      envMapIntensity: 0.22,
    });

    this.uniforms = {
      tRefl: { value: this.rt.texture },
      textureMatrix: { value: this.textureMatrix },
      tRipple: { value: ripple },
      uWetness: { value: opts.wetness ?? 0.85 },
      uReflStrength: { value: opts.reflectStrength ?? 1.0 },
      uTime: { value: 0 },
      uRippleScale: { value: opts.rippleScale ?? 3.2 },
      uBlur: { value: opts.blur ?? 2.2 },
      uReflRes: { value: new THREE.Vector2(w, h) },
      uRainAmount: { value: 1 },
    };

    const enabled = this.enabled;
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform mat4 textureMatrix;
           varying vec4 vReflCoord;
           varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <fog_vertex>',
          `#include <fog_vertex>
           vReflCoord = textureMatrix * vec4( position, 1.0 );
           vWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform sampler2D tRefl;
           uniform sampler2D tRipple;
           uniform float uWetness, uReflStrength, uTime, uRippleScale, uBlur, uRainAmount;
           uniform vec2 uReflRes;
           varying vec4 vReflCoord;
           varying vec3 vWorldPos;

           vec3 sampleRefl( vec2 uv, float blurPx ) {
             vec2 px = blurPx / uReflRes;
             vec3 c = texture2D( tRefl, uv ).rgb * 0.4;
             c += texture2D( tRefl, uv + vec2( px.x, 0.0 ) ).rgb * 0.15;
             c += texture2D( tRefl, uv - vec2( px.x, 0.0 ) ).rgb * 0.15;
             c += texture2D( tRefl, uv + vec2( 0.0, px.y ) ).rgb * 0.15;
             c += texture2D( tRefl, uv - vec2( 0.0, px.y ) ).rgb * 0.15;
             return c;
           }`,
        )
        // Ripples perturb the surface normal before lighting, so specular
        // highlights from streetlights break up the same way reflections do.
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
           vec2 rUv = vWorldPos.xz * ( 1.0 / uRippleScale );
           vec3 rp = texture2D( tRipple, rUv + vec2( 0.0, uTime * 0.06 ) ).xyz * 2.0 - 1.0;
           vec3 rp2 = texture2D( tRipple, rUv * 1.7 - vec2( uTime * 0.09, uTime * 0.04 ) ).xyz * 2.0 - 1.0;
           vec3 ripple = normalize( mix( vec3( 0.0, 0.0, 1.0 ), normalize( rp + rp2 ), 0.55 * uWetness * uRainAmount ) );
           normal = normalize( normal + vec3( ripple.x, ripple.y, 0.0 ) * 0.55 * uWetness );`,
        )
        // Wet surfaces are darker and much smoother than dry ones.
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           float wetMask = uWetness;
           roughnessFactor = mix( roughnessFactor, 0.11 + roughnessFactor * 0.12, wetMask );
           diffuseColor.rgb *= mix( 1.0, 0.34, wetMask );`,
        )
        .replace(
          '#include <colorspace_fragment>',
          `${
            enabled
              ? `{
             vec2 ruv = vReflCoord.xy / max( vReflCoord.w, 0.0001 );
             vec2 distort = vec2( ripple.x, ripple.y ) * 0.035 * uWetness;
             vec3 refl = sampleRefl( clamp( ruv + distort, vec2( 0.002 ), vec2( 0.998 ) ), uBlur + roughnessFactor * 22.0 );
             vec3 V = normalize( vViewPosition );
             float fres = pow( 1.0 - clamp( dot( normalize( normal ), V ), 0.0, 1.0 ), 4.0 );
             float amt = uWetness * uReflStrength * mix( 0.05, 0.85, fres );
             gl_FragColor.rgb += refl * amt;
           }`
              : ''
          }
           #include <colorspace_fragment>`,
        );
    };
    this.material.customProgramCacheKey = () => `wetground_${enabled}`;

    const seg = opts.segments ?? 1;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = this.y;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'wet-ground';
    this.mesh.matrixAutoUpdate = true;
    this.mesh.updateMatrixWorld();
  }

  set wetness(v: number) {
    this.uniforms.uWetness.value = clamp(v, 0, 1);
  }
  get wetness(): number {
    return this.uniforms.uWetness.value as number;
  }
  set rainAmount(v: number) {
    this.uniforms.uRainAmount.value = v;
  }
  set reflectStrength(v: number) {
    this.uniforms.uReflStrength.value = v;
  }

  update(time: number): void {
    this.uniforms.uTime.value = time;
  }

  /** Render the mirrored view. Call once per frame before the main render. */
  renderReflection(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!this.enabled) return;
    const normal = new THREE.Vector3(0, 1, 0);
    const reflectorPos = new THREE.Vector3(0, this.y, 0);
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);

    // Camera below the plane sees nothing useful.
    if (camPos.y < this.y + 0.02) return;

    const view = new THREE.Vector3().subVectors(reflectorPos, camPos);
    view.reflect(normal).negate().add(reflectorPos);

    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const lookAt = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = new THREE.Vector3().subVectors(reflectorPos, lookAt);
    target.reflect(normal).negate().add(reflectorPos);

    this.reflCam.copy(camera);
    this.reflCam.position.copy(view);
    this.reflCam.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
    this.reflCam.lookAt(target);
    this.reflCam.far = camera.far;
    this.reflCam.updateMatrixWorld();
    this.reflCam.projectionMatrix.copy(camera.projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(this.reflCam.projectionMatrix);
    this.textureMatrix.multiply(this.reflCam.matrixWorldInverse);
    this.textureMatrix.multiply(this.mesh.matrixWorld);

    // Oblique near plane so geometry below the ground never leaks in.
    this.plane.setFromNormalAndCoplanarPoint(normal, reflectorPos);
    this.plane.applyMatrix4(this.reflCam.matrixWorldInverse);
    const clip = new THREE.Vector4(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const pm = this.reflCam.projectionMatrix;
    const q = new THREE.Vector4(
      (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0],
      (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5],
      -1,
      (1 + pm.elements[10]) / pm.elements[14],
    );
    clip.multiplyScalar(2 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1 - 0.004;
    pm.elements[14] = clip.w;

    const prevTarget = renderer.getRenderTarget();
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    this.mesh.visible = false;
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, this.reflCam);
    this.mesh.visible = true;
    renderer.shadowMap.autoUpdate = prevShadowAuto;
    renderer.setRenderTarget(prevTarget);
  }

  dispose(): void {
    this.rt.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
