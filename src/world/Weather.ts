import * as THREE from 'three';
import { Rng } from '../engine/math';

/**
 * GPU-animated rain: instanced streaks that wrap around the camera, so a few
 * thousand drops cover the whole playable volume with no CPU work per frame.
 */
export class Rain {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private center = new THREE.Vector3();

  constructor(count = 2600, box = 34, opts: { color?: THREE.ColorRepresentation; length?: number; wind?: number } = {}) {
    const rng = new Rng(0x5eed11);
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      data[i * 4] = rng.next() * box;
      data[i * 4 + 1] = rng.next();
      data[i * 4 + 2] = rng.next() * box;
      data[i * 4 + 3] = rng.range(0.6, 1.5);
    }
    geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 4));
    geo.instanceCount = count;
    base.dispose();

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: box },
        uColor: { value: new THREE.Color(opts.color ?? 0x9fc8e8) },
        uLength: { value: opts.length ?? 0.55 },
        uWind: { value: opts.wind ?? 0.12 },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 iData;
        uniform float uTime;
        uniform vec3 uCenter;
        uniform float uBox;
        uniform float uLength;
        uniform float uWind;
        varying float vFade;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          float speed = 13.0 * iData.w;
          vec2 base = iData.xz;
          // Wrap the drop field around the camera.
          vec2 wrapped = base + floor((uCenter.xz - base) / uBox + 0.5) * uBox;
          float top = uCenter.y + uBox * 0.42;
          float fall = mod(iData.y * uBox + uTime * speed, uBox);
          vec3 world = vec3(wrapped.x, top - fall, wrapped.y);
          world.x += fall * uWind;
          vec4 view = viewMatrix * vec4(world, 1.0);
          float len = uLength * iData.w;
          view.xy += vec2(position.x * 0.0055, position.y * len);
          float dist = -view.z;
          vFade = smoothstep(0.9, 3.5, dist) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, dist));
          gl_Position = projectionMatrix * view;
        }`,
      fragmentShader: /* glsl */ `
        varying float vFade;
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          float body = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
          float a = body * across * vFade * 0.32 * uOpacity;
          gl_FragColor = vec4(uColor * a * 1.5, a);
        }`,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  set opacity(v: number) {
    this.material.uniforms.uOpacity.value = v;
  }

  update(time: number, cameraPos: THREE.Vector3) {
    this.center.copy(cameraPos);
    this.material.uniforms.uTime.value = time;
    (this.material.uniforms.uCenter.value as THREE.Vector3).copy(this.center);
  }
}

/**
 * Layered soft fog cards that catch light and give the frame depth.
 * Cheap stand-in for real volumetrics.
 */
export class MistLayers {
  readonly group = new THREE.Group();
  private material: THREE.ShaderMaterial;

  constructor(count = 7, size = 26, color: THREE.ColorRepresentation = 0x2a4658, opacity = 0.1) {
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(27.1, 61.7))) * 43758.5); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
        }
        void main() {
          vec2 p = vWorld.xz * 0.12 + vec2(uTime * 0.012, uTime * 0.008);
          float n = noise(p) * 0.72 + noise(p * 2.3 + 4.0) * 0.28;
          float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x) *
                       smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float a = smoothstep(0.35, 0.9, n) * edge * uOpacity;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    const rng = new Rng(0xfa11);
    for (let i = 0; i < count; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.55), this.material);
      plane.rotation.x = -Math.PI / 2 + rng.range(-0.1, 0.1);
      plane.position.set(rng.range(-4, 4), 0.35 + i * 0.55, rng.range(-6, 6));
      plane.renderOrder = 4;
      this.group.add(plane);
    }
  }

  set opacity(v: number) {
    this.material.uniforms.uOpacity.value = v;
  }

  update(time: number) {
    this.material.uniforms.uTime.value = time;
  }
}
