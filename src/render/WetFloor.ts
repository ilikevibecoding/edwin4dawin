import * as THREE from 'three';

/**
 * Rain-soaked horizontal surfaces.
 *
 * A wet street is the signature image of this genre, and it needs two things a
 * plain PBR material cannot give: real mirror-like reflections of the neon above
 * it, and a surface that is constantly agitated by falling water.
 *
 * This class provides both. Reflections come from an oblique-frustum mirror
 * camera rendering a curated layer into a low-resolution target (the classic
 * planar reflection technique used by three's Reflector, reimplemented here so
 * the result can be blended *into* a lit PBR material instead of replacing it).
 * The agitation comes from two scrolling normal layers injected into the
 * standard material's shader, which also distort the reflection lookup.
 */

export const REFLECTION_LAYER = 1;

export interface WetFloorOptions {
  /** World-space Y of the surface. */
  planeY?: number;
  resolutionScale?: number;
  /** 0 = dry, 1 = mirror-wet. */
  wetness?: number;
  reflectionStrength?: number;
  rippleScale?: number;
  rippleSpeed?: number;
  enabled?: boolean;
  maxResolution?: number;
}

export class WetFloor {
  readonly enabled: boolean;
  private target: THREE.WebGLRenderTarget | null = null;
  private mirrorCamera = new THREE.PerspectiveCamera();
  private textureMatrix = new THREE.Matrix4();
  private planeY: number;
  private resolutionScale: number;
  private maxResolution: number;
  private materials: THREE.MeshStandardMaterial[] = [];
  private uniforms = {
    uRefl: { value: null as THREE.Texture | null },
    uReflMatrix: { value: new THREE.Matrix4() },
    uReflStrength: { value: 0.85 },
    uWetness: { value: 1 },
    uRipple: { value: null as THREE.Texture | null },
    uRippleScale: { value: 1.5 },
    uRippleSpeed: { value: 1 },
    uTime: { value: 0 },
    uReflDistort: { value: 0.014 },
    uReflFade: { value: 0.55 },
  };
  private hidden: THREE.Object3D[] = [];

  constructor(rippleNormal: THREE.Texture, opts: WetFloorOptions = {}) {
    this.enabled = opts.enabled ?? true;
    this.planeY = opts.planeY ?? 0;
    this.resolutionScale = opts.resolutionScale ?? 0.3;
    this.maxResolution = opts.maxResolution ?? 640;
    this.uniforms.uWetness.value = opts.wetness ?? 1;
    this.uniforms.uReflStrength.value = opts.reflectionStrength ?? 0.85;
    this.uniforms.uRippleScale.value = opts.rippleScale ?? 1.5;
    this.uniforms.uRippleSpeed.value = opts.rippleSpeed ?? 1;
    this.uniforms.uRipple.value = rippleNormal;
    rippleNormal.wrapS = rippleNormal.wrapT = THREE.RepeatWrapping;
  }

  /** Objects rendered into the reflection. Keep this list small. */
  addReflectable(obj: THREE.Object3D): void {
    obj.traverse((o) => o.layers.enable(REFLECTION_LAYER));
  }

  removeReflectable(obj: THREE.Object3D): void {
    obj.traverse((o) => o.layers.disable(REFLECTION_LAYER));
  }

  /** Objects hidden while the mirror pass runs (the floor itself, rain, haze). */
  excludeFromReflection(obj: THREE.Object3D): void {
    this.hidden.push(obj);
  }

  setWetness(v: number): void {
    this.uniforms.uWetness.value = v;
  }

  setReflectionStrength(v: number): void {
    this.uniforms.uReflStrength.value = v;
  }

  /**
   * Wires a standard material into the wet-surface shader. The material keeps
   * all of its normal PBR behaviour (IBL, shadows, roughness maps); reflection
   * and ripples are added on top.
   */
  attach(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform mat4 uReflMatrix;
           varying vec4 vReflCoord;
           varying vec3 vWetWorldPos;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           vec4 wetWorld = modelMatrix * vec4( transformed, 1.0 );
           vWetWorldPos = wetWorld.xyz;
           vReflCoord = uReflMatrix * wetWorld;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform sampler2D uRefl;
           uniform sampler2D uRipple;
           uniform float uReflStrength;
           uniform float uWetness;
           uniform float uRippleScale;
           uniform float uRippleSpeed;
           uniform float uTime;
           uniform float uReflDistort;
           uniform float uReflFade;
           varying vec4 vReflCoord;
           varying vec3 vWetWorldPos;
           vec3 wetRippleNormal() {
             float t = uTime * uRippleSpeed;
             vec2 uv1 = vWetWorldPos.xz * uRippleScale + vec2( t * 0.035, t * 0.052 );
             vec2 uv2 = vWetWorldPos.xz * uRippleScale * 1.83 - vec2( t * 0.041, t * 0.023 );
             vec2 uv3 = vWetWorldPos.xz * uRippleScale * 4.1 + vec2( -t * 0.09, t * 0.11 );
             vec3 n1 = texture2D( uRipple, uv1 ).xyz * 2.0 - 1.0;
             vec3 n2 = texture2D( uRipple, uv2 ).xyz * 2.0 - 1.0;
             vec3 n3 = texture2D( uRipple, uv3 ).xyz * 2.0 - 1.0;
             vec2 xy = n1.xy + n2.xy * 0.6 + n3.xy * 0.25;
             return normalize( vec3( xy * uWetness * 0.45, 1.0 ) );
           }`
        )
        // Replace the stock normal mapping with the animated water surface.
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 wetN = wetRippleNormal();
           vec3 wetWorldN = normalize( vec3( wetN.x * 0.3, 1.0, wetN.y * 0.3 ) );
           normal = normalize( mix( normal, normalize( ( viewMatrix * vec4( wetWorldN, 0.0 ) ).xyz ), uWetness * 0.85 ) );`
        )
        .replace(
          '#include <opaque_fragment>',
          `{
             vec2 reflUv = vReflCoord.xy / max( vReflCoord.w, 1e-4 );
             vec3 wetN2 = wetRippleNormal();
             reflUv += wetN2.xy * uReflDistort * uWetness;
             vec3 reflCol = texture2D( uRefl, clamp( reflUv, 0.002, 0.998 ) ).rgb;
             float ndv = clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 );
             float fres = pow( 1.0 - ndv, 4.0 );
             // Grazing angles reflect most; roughness kills the mirror.
             float gloss = 1.0 - clamp( roughnessFactor, 0.0, 1.0 );
             float amount = uReflStrength * uWetness * ( 0.12 + fres * 1.35 ) * mix( 0.25, 1.0, gloss );
             float fade = mix( 1.0, uReflFade, clamp( length( vWetWorldPos.xz - cameraPosition.xz ) / 40.0, 0.0, 1.0 ) );
             outgoingLight += reflCol * amount * fade;
           }
           #include <opaque_fragment>`
        );
    };
    material.customProgramCacheKey = () => 'wetfloor';
    material.needsUpdate = true;
    this.materials.push(material);
    return material;
  }

  private ensureTarget(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const size = renderer.getSize(new THREE.Vector2());
    const w = Math.min(this.maxResolution, Math.max(64, Math.round(size.x * this.resolutionScale)));
    const h = Math.min(this.maxResolution, Math.max(64, Math.round(size.y * this.resolutionScale)));
    if (!this.target) {
      this.target = new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        depthBuffer: true,
        samples: 0,
      });
      this.target.texture.minFilter = THREE.LinearFilter;
      this.target.texture.magFilter = THREE.LinearFilter;
      this.target.texture.generateMipmaps = false;
      this.uniforms.uRefl.value = this.target.texture;
    } else if (this.target.width !== w || this.target.height !== h) {
      this.target.setSize(w, h);
    }
    return this.target;
  }

  /** Renders the mirror pass. Call before the main frame is composed. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, time: number): void {
    this.uniforms.uTime.value = time;
    if (!this.enabled) return;

    const target = this.ensureTarget(renderer);
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, this.planeY, 0);

    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    // Nothing to reflect if the camera is under the surface.
    if (camPos.y <= this.planeY + 0.02) return;

    const view = new THREE.Vector3().subVectors(planePoint, camPos);
    view.reflect(planeNormal).negate().add(planePoint);

    const rotation = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const lookAt = new THREE.Vector3(0, 0, -1).applyMatrix4(rotation).add(camPos);
    const target3 = new THREE.Vector3().subVectors(planePoint, lookAt);
    target3.reflect(planeNormal).negate().add(planePoint);

    const cam = this.mirrorCamera;
    cam.position.copy(view);
    cam.up.set(0, 1, 0).applyMatrix4(rotation).reflect(planeNormal);
    cam.lookAt(target3);
    cam.near = camera.near;
    cam.far = camera.far;
    cam.fov = camera.fov;
    cam.aspect = camera.aspect;
    cam.updateMatrixWorld();
    cam.projectionMatrix.copy(camera.projectionMatrix);

    // Oblique frustum clip so geometry below the surface never leaks in.
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    plane.applyMatrix4(cam.matrixWorldInverse);
    const clipPlane = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = cam.projectionMatrix;
    const q = new THREE.Vector4(
      (Math.sign(clipPlane.x) + pm.elements[8]) / pm.elements[0],
      (Math.sign(clipPlane.y) + pm.elements[9]) / pm.elements[5],
      -1,
      (1 + pm.elements[10]) / pm.elements[14]
    );
    clipPlane.multiplyScalar(2 / clipPlane.dot(q));
    pm.elements[2] = clipPlane.x;
    pm.elements[6] = clipPlane.y;
    pm.elements[10] = clipPlane.z + 1 - 0.003;
    pm.elements[14] = clipPlane.w;

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(cam.projectionMatrix);
    this.textureMatrix.multiply(cam.matrixWorldInverse);
    this.uniforms.uReflMatrix.value.copy(this.textureMatrix);

    cam.layers.set(REFLECTION_LAYER);

    const wasVisible = this.hidden.map((o) => o.visible);
    for (const o of this.hidden) o.visible = false;
    const prevTarget = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.enabled = prevShadow;
    this.hidden.forEach((o, i) => (o.visible = wasVisible[i]));
  }

  dispose(): void {
    this.target?.dispose();
  }
}
