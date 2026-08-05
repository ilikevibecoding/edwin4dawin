/**
 * Sky dome + image-based lighting. A gradient dome with drifting cloud noise is
 * rendered once into a PMREM cubemap, so every PBR surface in the scene gets
 * plausible ambient bounce and specular horizon without a captured HDRI.
 */
import * as THREE from 'three';

export type SkyOpts = {
  /** Zenith colour. */
  top?: THREE.ColorRepresentation;
  /** Horizon colour — this is what tints the ambient. */
  horizon?: THREE.ColorRepresentation;
  /** Below-horizon bounce. */
  ground?: THREE.ColorRepresentation;
  clouds?: number;
  cloudColor?: THREE.ColorRepresentation;
  /** Direction of the moon/sun glow on the dome. */
  sun?: THREE.Vector3;
  sunColor?: THREE.ColorRepresentation;
  sunSize?: number;
  intensity?: number;
  cityGlow?: number;
  cityGlowColor?: THREE.ColorRepresentation;
};

export class Sky {
  mesh: THREE.Mesh;
  private u: Record<string, THREE.IUniform>;

  constructor(o: SkyOpts = {}) {
    this.u = {
      uTop: { value: new THREE.Color(o.top ?? 0x05080f) },
      uHorizon: { value: new THREE.Color(o.horizon ?? 0x16273a) },
      uGround: { value: new THREE.Color(o.ground ?? 0x070b10) },
      uClouds: { value: o.clouds ?? 0.6 },
      uCloudColor: { value: new THREE.Color(o.cloudColor ?? 0x2a3c50) },
      uSun: { value: (o.sun ?? new THREE.Vector3(-0.4, 0.35, -1)).clone().normalize() },
      uSunColor: { value: new THREE.Color(o.sunColor ?? 0x9fc4e8) },
      uSunSize: { value: o.sunSize ?? 0.02 },
      uIntensity: { value: o.intensity ?? 1 },
      uTime: { value: 0 },
      uCityGlow: { value: o.cityGlow ?? 0.5 },
      uCityGlowColor: { value: new THREE.Color(o.cityGlowColor ?? 0x36536e) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize( position );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uGround, uCloudColor, uSun, uSunColor, uCityGlowColor;
        uniform float uClouds, uSunSize, uIntensity, uTime, uCityGlow;
        varying vec3 vDir;

        float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float vnoise( vec2 p ) {
          vec2 i = floor( p ), f = fract( p );
          f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y );
        }
        float fbm( vec2 p ) {
          float a = 0.5, s = 0.0, n = 0.0;
          for ( int i = 0; i < 5; i++ ) { s += a * vnoise( p ); n += a; a *= 0.5; p *= 2.03; }
          return s / n;
        }

        void main() {
          vec3 d = normalize( vDir );
          float h = d.y;
          vec3 col = mix( uHorizon, uTop, pow( clamp( h, 0.0, 1.0 ), 0.55 ) );
          col = mix( col, uGround, smoothstep( 0.0, -0.25, h ) );

          // Light pollution glow hugging the horizon.
          col += uCityGlowColor * uCityGlow * pow( clamp( 1.0 - abs( h ) * 3.2, 0.0, 1.0 ), 2.2 );

          // Overcast deck: project onto a plane above the camera.
          if ( h > 0.005 ) {
            vec2 p = d.xz / ( h + 0.18 ) * 0.55;
            float c = fbm( p * 1.1 + vec2( uTime * 0.004, uTime * 0.002 ) );
            float c2 = fbm( p * 2.6 - vec2( uTime * 0.007, 0.0 ) );
            float cover = smoothstep( 0.35, 0.85, c * 0.65 + c2 * 0.35 );
            float fade = smoothstep( 0.0, 0.35, h );
            col = mix( col, uCloudColor, cover * uClouds * fade );
            // Thin breaks where the moon shows through.
            float breaks = smoothstep( 0.72, 0.95, c2 ) * ( 1.0 - cover );
            col += uSunColor * breaks * 0.18 * fade;
          }

          float sd = max( dot( d, uSun ), 0.0 );
          col += uSunColor * pow( sd, 1.0 / max( uSunSize, 0.0005 ) ) * 1.6;
          col += uSunColor * pow( sd, 5.0 ) * 0.12;

          gl_FragColor = vec4( col * uIntensity, 1.0 );
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat);
    this.mesh.scale.setScalar(900);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.name = 'sky';
  }

  update(time: number): void {
    this.u.uTime.value = time;
  }
  set intensity(v: number) {
    this.u.uIntensity.value = v;
  }

  /**
   * Bake this dome (plus optional extra emitters) into an environment map.
   * `extras` should be cheap emissive proxies for big local sources — neon
   * walls, billboards, windows — so metals pick them up.
   */
  buildEnvironment(renderer: THREE.WebGLRenderer, extras?: THREE.Object3D[]): THREE.Texture {
    const scene = new THREE.Scene();
    const dome = this.mesh.clone();
    dome.scale.setScalar(80);
    scene.add(dome);
    if (extras) for (const e of extras) scene.add(e.clone());
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromScene(scene, 0.04, 0.1, 200);
    pmrem.dispose();
    return rt.texture;
  }
}

/** Quick emissive proxy panel for environment baking. */
export function envPanel(
  color: THREE.ColorRepresentation,
  intensity: number,
  w: number,
  h: number,
  pos: THREE.Vector3,
  lookAtOrigin = true,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
  );
  m.position.copy(pos);
  if (lookAtOrigin) m.lookAt(0, pos.y * 0.5, 0);
  return m;
}
