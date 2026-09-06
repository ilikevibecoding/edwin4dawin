import * as THREE from 'three';
import { Batch, wingXLE, type WingSpec } from '../geometry';
import { at, LIGHT, N_LIGHTS, V3, WING_POS, type BuildContext } from './context';

export interface LightsBuild {
  /**
   * All navigation lights in one mesh: lens caps by day, emissive points at night. Per-channel power
   * (red/green wingtips, white tail, red beacon, white strobes) is driven through `lightPower`.
   */
  lights: THREE.Mesh;
  /** glow sprites behind the lenses (one mesh, additive), driven by the same channel powers */
  lightGlow: THREE.Mesh;
}

/** Navigation lights, beacon, strobes and landing light (lenses + lit skin patches) and their glow sprites; `wingTipL/R` are the model's hardpoints. */
export function buildLights(ctx: BuildContext, wingSpec: WingSpec, lightPower: { value: Float32Array }, wingTipL: THREE.Vector3, wingTipR: THREE.Vector3): LightsBuild {
  const { mesh, materials } = ctx;
  // ------------------------------------------------------------ navigation lights (one mesh)
  // Lens caps: tinted glossy plastic lit like any other part by day (no emission, so nothing glows in daylight);
  // at night each channel's emissive power comes from `lightPower` and the bloom pass turns them into soft points.
  const lightsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.0, vertexColors: true });
  lightsMat.onBeforeCompile = (shader) => {
    shader.uniforms.uLightPower = lightPower;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLight;\nvarying float vLight;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = aLight;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uLightPower[${N_LIGHTS}];\nvarying float vLight;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];');
  };
  lightsMat.customProgramCacheKey = () => 'plane-lights-v2';
  materials.push(lightsMat);
  /** tag a geometry with the channel and its (linear) tint scaled by `gain`: lenses at 1, the lit skin patches dimmer */
  const lit = (g: THREE.BufferGeometry, tint: number, channel: number, gain = 1): THREE.BufferGeometry => {
    const n = g.getAttribute('position').count, c = new THREE.Color(tint).multiplyScalar(gain);
    const col = new Float32Array(n * 3), ch = new Float32Array(n);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; ch[i] = channel; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(ch, 1));
    return g;
  };
  const lens = (r: number, tint: number, channel: number) => lit(new THREE.SphereGeometry(r, 8, 6), tint, channel);
  // wingtip lenses sit just outboard of the rounded tip (span ends at z 7.52) so they are not buried in the wing;
  // a thin tinted patch on the tip's upper and lower skin around each lens picks up its light after dusk
  const lightKit = new Batch();
  const glows: { p: THREE.Vector3; tint: number; channel: number; size: number }[] = [];
  for (const [tip, tint, channel] of [[wingTipL, 0xd81c1c, LIGHT.red], [wingTipR, 0x18c848, LIGHT.green]] as const) {
    const sgn = Math.sign(tip.z), zOut = sgn * 7.55;
    lightKit.add(lens(0.06, tint, channel), at([tip.x, tip.y, zOut]));
    lightKit.add(lens(0.035, 0xf2f4ff, LIGHT.strobe), at([tip.x - 0.12, tip.y, zOut - sgn * 0.02]));
    for (const [dy, flipY] of [[0.045, 0], [-0.04, Math.PI]] as const) {
      const patch = new THREE.CircleGeometry(0.22, 12);
      patch.scale(1.6, 1, 1);
      lightKit.add(lit(patch, tint, channel, 0.22), at([tip.x - 0.05, tip.y + dy, sgn * 7.28], [-Math.PI / 2 + flipY, 0, 0]));
    }
    glows.push({ p: V3(tip.x, tip.y, zOut), tint, channel, size: 0.7 }, { p: V3(tip.x - 0.12, tip.y, zOut), tint: 0xf2f4ff, channel: LIGHT.strobe, size: 0.6 });
  }
  lightKit.add(lens(0.04, 0xf2f4ff, LIGHT.tail), at([-5.51, 0.33, 0]));
  glows.push({ p: V3(-5.51, 0.33, 0), tint: 0xf2f4ff, channel: LIGHT.tail, size: 0.55 });
  // rotating beacon on the fin tip, and the landing light in the port wing's leading edge inboard of the strut
  lightKit.add(lens(0.05, 0xd81c1c, LIGHT.beacon), at([-4.80, 2.07, 0]));
  glows.push({ p: V3(-4.80, 2.07, 0), tint: 0xd81c1c, channel: LIGHT.beacon, size: 0.95 });
  const landing = V3(WING_POS.x + wingXLE(wingSpec, 2.3) - 0.01, WING_POS.y + 0.02, -2.3);
  lightKit.add(lit(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), 0xfff2d8, LIGHT.landing), at(landing, [0, 0, Math.PI / 2]));
  glows.push({ p: landing, tint: 0xfff0d0, channel: LIGHT.landing, size: 1.3 });
  const lights = mesh(lightKit.build(), lightsMat, { cast: false, receive: false });
  // glow sprites: one camera-facing quad per lamp, expanded in the vertex shader, additive, fading with the
  // channel power (bloom alone left the lamps as hard 8 px stars); pushed toward the camera so the lens does not cut them
  let lightGlow: THREE.Mesh;
  {
    const n = glows.length;
    const pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), col = new Float32Array(n * 12), ch = new Float32Array(n * 4), size = new Float32Array(n * 4), idx: number[] = [];
    const c = new THREE.Color();
    glows.forEach((g, k) => {
      c.set(g.tint);
      for (let v = 0; v < 4; v++) {
        const i = k * 4 + v;
        pos[i * 3] = g.p.x; pos[i * 3 + 1] = g.p.y; pos[i * 3 + 2] = g.p.z;
        corner[i * 2] = v & 1 ? 1 : -1; corner[i * 2 + 1] = v & 2 ? 1 : -1;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        ch[i] = g.channel; size[i] = g.size;
      }
      idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4 + 1, k * 4 + 3, k * 4 + 2);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aLight', new THREE.BufferAttribute(ch, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 9.5);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uLightPower: lightPower },
      // the renderer uses a logarithmic depth buffer: a raw ShaderMaterial must write the same log depth or its
      // fragments fail the depth test against every built-in material (the chunks are no-ops otherwise)
      vertexShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        attribute vec2 aCorner; attribute vec3 color; attribute float aLight; attribute float aSize;
        uniform float uLightPower[${N_LIGHTS}];
        varying vec2 vCorner; varying vec3 vCol; varying float vPow;
        void main() {
          vCorner = aCorner; vCol = color; vPow = uLightPower[int(aLight + 0.5)];
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // no halo without power (day): collapse the quad so it costs no fill
          float s = vPow > 0.01 ? aSize : 0.0;
          mv.xy += aCorner * s; mv.z += 0.12;
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        varying vec2 vCorner; varying vec3 vCol; varying float vPow;
        void main() {
          #include <logdepthbuf_fragment>
          float r = length(vCorner);
          if (r > 1.0) discard;
          // a bright core with a long soft skirt: the scatter of a point source in a slightly hazy night
          float halo = pow(1.0 - r, 3.5) * 0.30 + pow(max(1.0 - r * 3.0, 0.0), 2.0) * 0.6;
          // soft knee on the lamp power: the strobe's 40 must not bleach its whole sprite to a white disc
          float pw = vPow * 20.0 / (vPow + 20.0);
          gl_FragColor = vec4(vCol * halo * pw * 0.09, 1.0);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true,
    });
    materials.push(glowMat);
    lightGlow = mesh(geo, glowMat, { cast: false, receive: false });
    lightGlow.renderOrder = 16;
    lightGlow.frustumCulled = false;
  }
  return { lights, lightGlow };
}
