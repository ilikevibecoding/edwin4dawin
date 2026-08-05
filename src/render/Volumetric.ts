import * as THREE from 'three';

/**
 * Visible light in the air.
 *
 * True volumetric marching is far too expensive for the budget, so shafts are
 * cone meshes whose opacity approximates the length of the view ray inside the
 * cone (brightest through the middle, vanishing at the silhouette) modulated by
 * scrolling noise for drifting rain and dust. Under a downpour this reads as
 * genuinely volumetric.
 */

const SHAFT_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying float vAxial;
void main() {
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vPosW = wp.xyz;
  // Cone is built along -Y with the apex at the origin.
  vAxial = clamp( -position.y / max( 0.0001, uConeLength ), 0.0, 1.0 );
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uNoise;
uniform float uFalloff;
uniform float uNearFade;
uniform vec3 uCamPos;
varying vec3 vNormalW;
varying vec3 vPosW;
varying float vAxial;

float hash( vec3 p ) {
  p = fract( p * 0.3183099 + vec3( 0.1, 0.2, 0.3 ) );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float noise3( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float n000 = hash( i );
  float n100 = hash( i + vec3( 1.0, 0.0, 0.0 ) );
  float n010 = hash( i + vec3( 0.0, 1.0, 0.0 ) );
  float n110 = hash( i + vec3( 1.0, 1.0, 0.0 ) );
  float n001 = hash( i + vec3( 0.0, 0.0, 1.0 ) );
  float n101 = hash( i + vec3( 1.0, 0.0, 1.0 ) );
  float n011 = hash( i + vec3( 0.0, 1.0, 1.0 ) );
  float n111 = hash( i + vec3( 1.0, 1.0, 1.0 ) );
  return mix(
    mix( mix( n000, n100, f.x ), mix( n010, n110, f.x ), f.y ),
    mix( mix( n001, n101, f.x ), mix( n011, n111, f.x ), f.y ),
    f.z
  );
}

void main() {
  vec3 viewDir = normalize( uCamPos - vPosW );
  // Approximate the chord length through the cone.
  float facing = abs( dot( normalize( vNormalW ), viewDir ) );
  float body = pow( smoothstep( 0.15, 0.95, facing ), 2.4 );
  // Fade along the beam and soften the mouth of the cone.
  float axial = pow( 1.0 - vAxial, uFalloff ) * smoothstep( 0.0, 0.08, vAxial );
  // Drifting particulate.
  float n = 1.0;
  if ( uNoise > 0.001 ) {
    vec3 np = vPosW * 0.55;
    np.y -= uTime * 0.55;
    n = mix( 1.0, noise3( np ) * 0.75 + noise3( np * 2.7 + 5.0 ) * 0.45, uNoise );
  }
  // Don't let the shaft blow out when the camera is inside it.
  float dist = length( uCamPos - vPosW );
  float nearFade = smoothstep( 0.0, uNearFade, dist );
  // Fade with distance so a wide cone never becomes a flat wall of light.
  float distFade = 1.0 / ( 1.0 + dist * dist * 0.02 );
  float a = body * axial * n * uIntensity * nearFade * distFade;
  gl_FragColor = vec4( uColor * a, a );
}
`;

export interface ShaftOptions {
  length?: number;
  radius?: number;
  color?: THREE.ColorRepresentation;
  intensity?: number;
  noise?: number;
  falloff?: number;
  segments?: number;
  nearFade?: number;
}

export class LightShaft {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private baseIntensity: number;
  private coneLength = 8;
  private flickerAmount = 0;
  private flickerSpeed = 8;

  constructor(opts: ShaftOptions = {}) {
    const length = opts.length ?? 8;
    this.coneLength = length;
    const radius = opts.radius ?? 2.2;
    const segments = opts.segments ?? 20;
    this.baseIntensity = opts.intensity ?? 0.55;

    const geo = new THREE.CylinderGeometry(0.06, radius, length, segments, 1, true);
    // Move the apex to the origin so the shaft can be pointed like a light.
    geo.translate(0, -length / 2, 0);

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(opts.color ?? 0xbcd8ff) },
        uIntensity: { value: this.baseIntensity },
        uTime: { value: 0 },
        uNoise: { value: opts.noise ?? 0.55 },
        uFalloff: { value: opts.falloff ?? 1.5 },
        uNearFade: { value: opts.nearFade ?? 0.9 },
        uCamPos: { value: new THREE.Vector3() },
        uConeLength: { value: length },
      },
      vertexShader: `uniform float uConeLength;\n${SHAFT_VERT}`,
      fragmentShader: SHAFT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 6;
    this.mesh.frustumCulled = true;
  }

  /**
   * Points the shaft from `from` toward `to`, scaled so the cone stops just
   * short of the target. A cone that continues through the floor accumulates
   * additive brightness where it intersects and leaves a hard bright ellipse on
   * the ground.
   */
  aim(from: THREE.Vector3, to: THREE.Vector3, opts: { clampToTarget?: boolean } = {}): void {
    this.mesh.position.copy(from);
    const delta = new THREE.Vector3().subVectors(to, from);
    const distance = delta.length() || 1;
    const dir = delta.divideScalar(distance);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.mesh.quaternion.copy(q);
    if (opts.clampToTarget !== false) {
      const fit = Math.min(1, Math.max(0.05, (distance - 0.35) / this.length));
      this.mesh.scale.set(1, fit, 1);
    }
  }

  get length(): number {
    return this.coneLength;
  }

  setColor(c: THREE.ColorRepresentation): void {
    (this.mat.uniforms.uColor.value as THREE.Color).set(c);
  }

  setIntensity(v: number): void {
    this.baseIntensity = v;
  }

  setFlicker(amount: number, speed = 8): void {
    this.flickerAmount = amount;
    this.flickerSpeed = speed;
  }

  update(time: number, camPos: THREE.Vector3): void {
    this.mat.uniforms.uTime.value = time;
    (this.mat.uniforms.uCamPos.value as THREE.Vector3).copy(camPos);
    if (this.flickerAmount > 0) {
      const f =
        Math.sin(time * this.flickerSpeed) * 0.5 +
        Math.sin(time * this.flickerSpeed * 2.7 + 1.3) * 0.3 +
        Math.sin(time * this.flickerSpeed * 6.1) * 0.2;
      this.mat.uniforms.uIntensity.value = this.baseIntensity * (1 + f * this.flickerAmount);
    } else {
      this.mat.uniforms.uIntensity.value = this.baseIntensity;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

/**
 * Rotating emergency lights. Two counter-rotating shafts plus point lights;
 * the classic red/blue wash that says "the police have arrived" before any
 * dialogue does.
 */
export class EmergencyLights {
  readonly group = new THREE.Group();
  private shafts: { shaft: LightShaft; phase: number; speed: number; light: THREE.PointLight }[] = [];

  constructor(
    count = 2,
    opts: { colors?: number[]; length?: number; radius?: number; intensity?: number; lightIntensity?: number } = {}
  ) {
    const colors = opts.colors ?? [0x2a6bff, 0xff2a2a];
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const shaft = new LightShaft({
        length: opts.length ?? 16,
        radius: opts.radius ?? 1.6,
        color,
        intensity: opts.intensity ?? 0.5,
        noise: 0.4,
        falloff: 1.1,
      });
      const light = new THREE.PointLight(color, opts.lightIntensity ?? 8, 18, 2);
      this.group.add(shaft.mesh, light);
      this.shafts.push({
        shaft,
        phase: (i / count) * Math.PI * 2,
        speed: 2.1 + i * 0.35,
        light,
      });
    }
  }

  /** Overall brightness of the bar, so a story beat can escalate it. */
  private level = 1;

  setIntensity(v: number): void {
    this.level = Math.max(0, v) / 0.34;
    for (const s of this.shafts) s.shaft.setIntensity(Math.max(0, v));
  }

  update(time: number, camPos: THREE.Vector3): void {
    for (const s of this.shafts) {
      const a = time * s.speed + s.phase;
      const origin = new THREE.Vector3(0, 0, 0);
      const dir = new THREE.Vector3(Math.cos(a) * 8, -1.5, Math.sin(a) * 8);
      s.shaft.aim(origin, dir);
      s.shaft.update(time, camPos);
      s.light.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
      s.light.intensity = (6 + Math.sin(a * 2) * 3) * this.level;
    }
  }

  dispose(): void {
    for (const s of this.shafts) s.shaft.dispose();
  }
}
