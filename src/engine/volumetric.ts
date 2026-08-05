/**
 * Fake volumetrics: additive cones, window shafts and dust motes. Cheaper and
 * more art-directable than a screen-space march, and they read beautifully in
 * rain because the medium is already hazy.
 */
import * as THREE from 'three';
import { radialSprite } from './textures';
import { Rng } from './math';

const CONE_VS = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vLocal = position;
    vUv = uv;
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const CONE_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity, uHeight, uRadius, uTime, uNoise, uSoft;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec2 vUv;

  float hash( vec3 p ) {
    p = fract( p * 0.3183099 + 0.1 );
    p *= 17.0;
    return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
  }
  float vnoise( vec3 x ) {
    vec3 i = floor( x ), f = fract( x );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( mix( hash( i ), hash( i + vec3( 1, 0, 0 ) ), f.x ),
                     mix( hash( i + vec3( 0, 1, 0 ) ), hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                mix( mix( hash( i + vec3( 0, 0, 1 ) ), hash( i + vec3( 1, 0, 1 ) ), f.x ),
                     mix( hash( i + vec3( 0, 1, 1 ) ), hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
  }

  void main() {
    // Cone is built pointing down -Y with apex at y = 0.
    float t = clamp( -vLocal.y / uHeight, 0.0, 1.0 );
    float rEdge = mix( 0.02, uRadius, t );
    float r = length( vLocal.xz ) / max( rEdge, 0.0001 );
    float radial = pow( 1.0 - clamp( r, 0.0, 1.0 ), uSoft );
    float along = ( 1.0 - t * 0.82 ) * smoothstep( 0.0, 0.08, t );
    float n = mix( 1.0, vnoise( vWorld * 1.6 + vec3( 0.0, uTime * 0.35, uTime * 0.12 ) ) * 1.5, uNoise );
    float a = radial * along * uOpacity * n;
    gl_FragColor = vec4( uColor, a );
  }
`;

export type ConeOpts = {
  height?: number;
  radius?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
  noise?: number;
  soft?: number;
  segments?: number;
};

/** Downward light cone. Parent it to a lamp and it just works. */
export class VolumeCone {
  mesh: THREE.Mesh;
  private u: Record<string, THREE.IUniform>;

  constructor(o: ConeOpts = {}) {
    const height = o.height ?? 6;
    const radius = o.radius ?? 2.2;
    const geo = new THREE.CylinderGeometry(0.03, radius, height, o.segments ?? 24, 1, true);
    geo.translate(0, -height / 2, 0);
    this.u = {
      uColor: { value: new THREE.Color(o.color ?? 0xbfe0ff) },
      uOpacity: { value: o.opacity ?? 0.14 },
      uHeight: { value: height },
      uRadius: { value: radius },
      uTime: { value: 0 },
      uNoise: { value: o.noise ?? 0.35 },
      uSoft: { value: o.soft ?? 1.6 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: CONE_VS,
      fragmentShader: CONE_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 6;
  }
  set opacity(v: number) {
    this.u.uOpacity.value = v;
  }
  get opacity(): number {
    return this.u.uOpacity.value as number;
  }
  update(time: number): void {
    this.u.uTime.value = time;
  }
}

/** Rectangular shaft for windows and blinds. */
export class LightShaft {
  mesh: THREE.Mesh;
  private u: Record<string, THREE.IUniform>;

  constructor(w = 2, h = 3, len = 8, color: THREE.ColorRepresentation = 0xdce9ff, opacity = 0.1, slats = 0) {
    const geo = new THREE.BoxGeometry(w, h, len, 1, 1, 1);
    geo.translate(0, 0, -len / 2);
    this.u = {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uLen: { value: len },
      uTime: { value: 0 },
      uSlats: { value: slats },
      uSize: { value: new THREE.Vector2(w, h) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vLocal; varying vec3 vWorld;
        void main() {
          vLocal = position;
          vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity, uLen, uTime, uSlats; uniform vec2 uSize;
        varying vec3 vLocal; varying vec3 vWorld;
        float hash( vec3 p ) { p = fract( p * 0.3183 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
        float vnoise( vec3 x ) {
          vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( mix( hash( i ), hash( i + vec3( 1, 0, 0 ) ), f.x ), mix( hash( i + vec3( 0, 1, 0 ) ), hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                      mix( mix( hash( i + vec3( 0, 0, 1 ) ), hash( i + vec3( 1, 0, 1 ) ), f.x ), mix( hash( i + vec3( 0, 1, 1 ) ), hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
        }
        void main() {
          float t = clamp( -vLocal.z / uLen, 0.0, 1.0 );
          vec2 q = abs( vLocal.xy ) / ( uSize * 0.5 );
          float edge = ( 1.0 - smoothstep( 0.55, 1.0, q.x ) ) * ( 1.0 - smoothstep( 0.55, 1.0, q.y ) );
          float slat = uSlats > 0.5 ? ( 0.35 + 0.65 * step( 0.42, fract( vLocal.y * uSlats ) ) ) : 1.0;
          float dust = mix( 0.75, 1.5, vnoise( vWorld * 1.9 + vec3( uTime * 0.12, uTime * 0.2, 0.0 ) ) );
          gl_FragColor = vec4( uColor, edge * ( 1.0 - t * 0.75 ) * uOpacity * slat * dust );
        }
      `,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 6;
  }
  set opacity(v: number) {
    this.u.uOpacity.value = v;
  }
  update(time: number): void {
    this.u.uTime.value = time;
  }
}

/** Slow-drifting dust / thirium motes that catch the key light. */
export class DustMotes {
  points: THREE.Points;
  private u: Record<string, THREE.IUniform>;

  constructor(count = 700, box = new THREE.Vector3(14, 5, 14), color: THREE.ColorRepresentation = 0xcfe6ff, size = 0.03) {
    const rng = new Rng(31337);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng.range(-box.x / 2, box.x / 2);
      pos[i * 3 + 1] = rng.range(0, box.y);
      pos[i * 3 + 2] = rng.range(-box.z / 2, box.z / 2);
      seed[i] = rng.next();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('iSeed', new THREE.BufferAttribute(seed, 1));
    this.u = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      tSprite: { value: radialSprite(64, 2.4) },
      uOpacity: { value: 0.55 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float iSeed;
        uniform float uTime, uSize;
        varying float vFade;
        void main() {
          vec3 p = position;
          float s = iSeed * 6.2831;
          p.x += sin( uTime * 0.22 + s ) * 0.4;
          p.y += sin( uTime * 0.14 + s * 2.1 ) * 0.25;
          p.z += cos( uTime * 0.19 + s * 1.7 ) * 0.4;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          vFade = 0.4 + 0.6 * ( sin( uTime * 0.9 + s * 3.0 ) * 0.5 + 0.5 );
          gl_PointSize = uSize * 320.0 / max( -mv.z, 0.1 );
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSprite; uniform vec3 uColor; uniform float uOpacity;
        varying float vFade;
        void main() {
          float a = texture2D( tSprite, gl_PointCoord ).a;
          gl_FragColor = vec4( uColor, a * vFade * uOpacity );
        }
      `,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }
  set opacity(v: number) {
    this.u.uOpacity.value = v;
  }
  update(time: number): void {
    this.u.uTime.value = time;
  }
}

/** Camera-facing glow billboard for lamps, signs and practical lights. */
export function glowSprite(color: THREE.ColorRepresentation, size = 1.4, opacity = 0.75): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: radialSprite(128, 2.6),
    color: new THREE.Color(color),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  s.renderOrder = 7;
  return s;
}
