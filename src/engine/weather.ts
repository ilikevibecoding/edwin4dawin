/**
 * Rain system: instanced streaks that follow the camera, ground splash rings,
 * drifting mist sheets and lightning. Everything is GPU-animated from a single
 * time uniform so it costs almost nothing on the CPU.
 */
import * as THREE from 'three';
import { radialSprite } from './textures';
import { clamp, Rng } from './math';

export type RainOpts = {
  count?: number;
  splashes?: number;
  radius?: number;
  height?: number;
  speed?: number;
  wind?: THREE.Vector2;
  color?: THREE.ColorRepresentation;
  intensity?: number;
  mist?: boolean;
};

export class Rain {
  group = new THREE.Group();
  private streaks?: THREE.Mesh;
  private splashes?: THREE.Mesh;
  private mist?: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform> = {};
  private splashUniforms: Record<string, THREE.IUniform> = {};
  private mistUniforms: Record<string, THREE.IUniform> = {};
  private groundY = 0;
  amount = 1;

  constructor(o: RainOpts = {}) {
    const count = o.count ?? 12000;
    const radius = o.radius ?? 26;
    const height = o.height ?? 26;
    const rng = new Rng(20380815);
    this.group.name = 'rain';
    this.group.frustumCulled = false;

    /* ---------------------------------------------------------- streaks */
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    const offsets = new Float32Array(count * 3);
    const params = new Float32Array(count * 3); // speed, length, brightness
    for (let i = 0; i < count; i++) {
      // Bias density toward the camera so the near field reads dense without
      // wasting instances at the edge of the volume.
      const a = rng.next() * Math.PI * 2;
      const r = radius * Math.pow(rng.next(), 0.62);
      offsets[i * 3] = Math.cos(a) * r;
      offsets[i * 3 + 1] = rng.next() * height;
      offsets[i * 3 + 2] = Math.sin(a) * r;
      params[i * 3] = rng.range(11, 19);
      params[i * 3 + 1] = rng.range(0.5, 1.5);
      params[i * 3 + 2] = rng.chance(0.14) ? rng.range(1.6, 3.4) : rng.range(0.28, 0.85);
    }
    geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('iParam', new THREE.InstancedBufferAttribute(params, 3));
    geo.instanceCount = count;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 3);

    const wind = o.wind ?? new THREE.Vector2(1.4, 0.5);
    this.uniforms = {
      uTime: { value: 0 },
      uHeight: { value: height },
      uWind: { value: wind.clone() },
      uColor: { value: new THREE.Color(o.color ?? 0xbfe4ff) },
      uIntensity: { value: o.intensity ?? 1 },
      uAmount: { value: 1 },
      uWidth: { value: 0.014 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute vec3 iOffset;
        attribute vec3 iParam;
        uniform float uTime, uHeight, uAmount, uWidth;
        uniform vec2 uWind;
        varying float vBright;
        varying vec2 vUv;
        void main() {
          float speed = iParam.x;
          float len = iParam.y;
          vBright = iParam.z;
          // Cull a fraction of drops when the rain eases off.
          if ( fract( iOffset.x * 12.9898 + iOffset.z * 78.233 ) > uAmount ) {
            gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
            return;
          }
          float t = uTime * speed;
          float y = uHeight - mod( iOffset.y + t, uHeight );
          vec3 local = vec3( iOffset.x + uWind.x * ( uHeight - y ) * 0.06, y, iOffset.z + uWind.y * ( uHeight - y ) * 0.06 );
          vec3 world = ( modelMatrix * vec4( local, 1.0 ) ).xyz;

          vec3 fall = normalize( vec3( uWind.x, -7.0, uWind.y ) );
          vec3 toCam = normalize( cameraPosition - world );
          vec3 side = normalize( cross( fall, toCam ) );

          float dist = length( cameraPosition - world );
          // Keep near drops from becoming giant smears.
          float streak = len * ( 0.5 + 0.55 * clamp( dist * 0.08, 0.0, 1.6 ) );
          vec3 p = world + side * position.x * uWidth * ( 1.0 + dist * 0.02 ) + fall * position.y * streak;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vBright;
        varying vec2 vUv;
        void main() {
          float across = 1.0 - abs( vUv.x - 0.5 ) * 2.0;
          float along = smoothstep( 0.0, 0.25, vUv.y ) * smoothstep( 1.0, 0.72, vUv.y );
          float a = pow( across, 1.6 ) * along;
          gl_FragColor = vec4( uColor * vBright * uIntensity, a * 0.5 );
        }
      `,
    });
    this.streaks = new THREE.Mesh(geo, mat);
    this.streaks.frustumCulled = false;
    this.streaks.renderOrder = 5;
    this.group.add(this.streaks);

    /* --------------------------------------------------------- splashes */
    const sCount = o.splashes ?? 600;
    if (sCount > 0) {
      const sBase = new THREE.PlaneGeometry(1, 1);
      const sGeo = new THREE.InstancedBufferGeometry();
      sGeo.index = sBase.index;
      sGeo.attributes.position = sBase.attributes.position;
      sGeo.attributes.uv = sBase.attributes.uv;
      const sOff = new Float32Array(sCount * 3);
      for (let i = 0; i < sCount; i++) {
        const a = rng.next() * Math.PI * 2;
        const r = (radius * 0.75) * Math.sqrt(rng.next());
        sOff[i * 3] = Math.cos(a) * r;
        sOff[i * 3 + 1] = rng.next(); // phase
        sOff[i * 3 + 2] = Math.sin(a) * r;
      }
      sGeo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(sOff, 3));
      sGeo.instanceCount = sCount;
      sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 3);

      this.splashUniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(o.color ?? 0xbfe4ff) },
        tSprite: { value: radialSprite(128, 3, 0.78) },
        uAmount: { value: 1 },
        uScale: { value: 0.13 },
      };
      const sMat = new THREE.ShaderMaterial({
        uniforms: this.splashUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 iOffset;
          uniform float uTime, uAmount, uScale;
          varying float vLife;
          varying vec2 vUv;
          void main() {
            float phase = iOffset.y;
            float cycle = 0.42;
            float life = fract( uTime / cycle + phase );
            vLife = life;
            if ( phase > uAmount ) { gl_Position = vec4( 2.0 ); return; }
            float s = ( 0.25 + life * 1.5 ) * uScale;
            vec3 local = vec3( iOffset.x + position.x * s, 0.008, iOffset.z + position.y * s );
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( local, 1.0 );
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tSprite;
          uniform vec3 uColor;
          varying float vLife;
          varying vec2 vUv;
          void main() {
            float a = texture2D( tSprite, vUv ).a;
            a *= ( 1.0 - vLife ) * smoothstep( 0.0, 0.12, vLife );
            gl_FragColor = vec4( uColor * 0.9, a * 0.5 );
          }
        `,
      });
      this.splashes = new THREE.Mesh(sGeo, sMat);
      this.splashes.rotation.x = -Math.PI / 2;
      this.splashes.frustumCulled = false;
      this.splashes.renderOrder = 4;
      this.group.add(this.splashes);
    }

    /* ------------------------------------------------------------- mist */
    if (o.mist !== false) {
      this.mistUniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x9dc4de) },
        uOpacity: { value: 0.055 },
      };
      const mistMat = new THREE.ShaderMaterial({
        uniforms: this.mistUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            vUv = uv;
            vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uOpacity;
          uniform vec3 uColor;
          varying vec2 vUv;
          varying vec3 vWorld;
          float hash( vec2 p ) { return fract( sin( dot( p, vec2( 27.16, 57.3 ) ) ) * 43758.5453 ); }
          float vnoise( vec2 p ) {
            vec2 i = floor( p ), f = fract( p );
            f = f * f * ( 3.0 - 2.0 * f );
            return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ),
                        mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0 ) ), f.x ), f.y );
          }
          void main() {
            vec2 p = vWorld.xz * 0.08 + vec2( uTime * 0.035, uTime * 0.017 );
            float n = vnoise( p ) * 0.6 + vnoise( p * 2.7 ) * 0.4;
            float edge = smoothstep( 0.0, 0.35, vUv.y ) * smoothstep( 1.0, 0.55, vUv.y );
            float fade = smoothstep( 0.0, 0.2, vUv.x ) * smoothstep( 1.0, 0.8, vUv.x );
            gl_FragColor = vec4( uColor, n * edge * fade * uOpacity );
          }
        `,
      });
      const mistGeo = new THREE.PlaneGeometry(radius * 2.4, 5, 1, 1);
      this.mist = new THREE.Mesh(mistGeo, mistMat);
      this.mist.position.y = 1.4;
      this.mist.rotation.x = -Math.PI / 2;
      this.mist.frustumCulled = false;
      this.mist.renderOrder = 3;
      this.group.add(this.mist);
    }
  }

  setGroundY(y: number): void {
    this.groundY = y;
    if (this.splashes) this.splashes.position.y = y;
    if (this.mist) this.mist.position.y = y + 1.2;
  }

  /** Rain volume trails the camera, snapped to avoid visible drift. */
  update(dt: number, time: number, camera: THREE.Camera): void {
    void dt;
    const p = camera.position;
    this.group.position.set(Math.round(p.x * 0.5) * 2, this.groundY, Math.round(p.z * 0.5) * 2);
    this.uniforms.uTime.value = time;
    this.uniforms.uAmount.value = this.amount;
    if (this.splashes) {
      this.splashUniforms.uTime.value = time;
      this.splashUniforms.uAmount.value = this.amount;
    }
    if (this.mist) this.mistUniforms.uTime.value = time;
  }

  setIntensity(v: number): void {
    this.amount = clamp(v, 0, 1);
    this.uniforms.uIntensity.value = 0.55 + this.amount * 0.75;
  }
  setColor(c: THREE.ColorRepresentation): void {
    (this.uniforms.uColor.value as THREE.Color).set(c);
    if (this.splashes) (this.splashUniforms.uColor.value as THREE.Color).set(c);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
  }
}

/** Lightning: drives a light + exposure flash with a believable double strike. */
export class Lightning {
  light: THREE.DirectionalLight;
  private t = -1;
  private seq: number[] = [];
  private strength = 0;
  onFlash?: (v: number) => void;

  constructor(color: THREE.ColorRepresentation = 0xd8ecff, private peak = 6) {
    this.light = new THREE.DirectionalLight(color, 0);
    this.light.position.set(-14, 22, -18);
  }

  strike(delay = 0): void {
    this.t = -delay;
    this.seq = [0.06, 0.05, 0.09, 0.04, 0.26, 0.16];
  }

  update(dt: number): void {
    if (this.t < -1e3) return;
    this.t += dt;
    if (this.t < 0) return;
    let acc = 0;
    let on = false;
    for (let i = 0; i < this.seq.length; i++) {
      const next = acc + this.seq[i];
      if (this.t >= acc && this.t < next) {
        on = i % 2 === 0;
        break;
      }
      acc = next;
    }
    if (this.t > acc + 0.4) {
      this.t = -1e9;
      this.strength = 0;
    } else {
      this.strength = on ? 1 : 0;
    }
    this.light.intensity = this.strength * this.peak;
    this.onFlash?.(this.strength * 0.42);
  }
}
