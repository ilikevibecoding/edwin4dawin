import * as THREE from 'three';
import { Batch, wingLowerY, wingUpperY, wingXLE, type WingSpec } from '../geometry';
import { SURF } from '../textures';
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
      .replace('#include <common>', '#include <common>\nattribute float aLight;\nattribute float aPatch;\nvarying float vLight;\nvarying float vPatch;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = aLight;\nvPatch = aPatch;');
    // the lit skin patches exist only while their channel is powered: by day they would otherwise show as dark
    // tinted decals on the tips (a brown-red blotch on each yellow wingtip from below)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uLightPower[${N_LIGHTS}];\nvarying float vLight;\nvarying float vPatch;`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vPatch > 0.5 && uLightPower[int(vLight + 0.5)] < 0.02) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];');
  };
  lightsMat.customProgramCacheKey = () => 'plane-lights-v3';
  materials.push(lightsMat);
  /**
   * tag a geometry with the channel and its (linear) tint scaled by `gain`: lenses at 1, the lit skin patches dimmer
   * and flagged as patches (drawn only while their channel is powered)
   */
  const lit = (g: THREE.BufferGeometry, tint: number, channel: number, gain = 1, patch = false): THREE.BufferGeometry => {
    const n = g.getAttribute('position').count, c = new THREE.Color(tint).multiplyScalar(gain);
    const col = new Float32Array(n * 3), ch = new Float32Array(n), pa = new Float32Array(n).fill(patch ? 1 : 0);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; ch[i] = channel; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(ch, 1));
    g.setAttribute('aPatch', new THREE.BufferAttribute(pa, 1));
    return g;
  };
  const lens = (r: number, tint: number, channel: number) => lit(new THREE.SphereGeometry(r, 8, 6), tint, channel);
  // wingtip lenses sit just outboard of the rounded tip (span ends at z 7.52) so they are not buried in the wing;
  // a thin tinted patch on the tip's upper and lower skin around each lens picks up its light after dusk
  const lightKit = new Batch();
  const glows: { p: THREE.Vector3; tint: number; channel: number; size: number }[] = [];
  for (const [tip, tint, channel] of [[wingTipL, 0xd81c1c, LIGHT.red], [wingTipR, 0x18c848, LIGHT.green]] as const) {
    const sgn = Math.sign(tip.z);
    // nav-light fairing: a polished teardrop housing straddling the tip's outer edge, the position lens at its
    // nose and the strobe lens at its tail (the lenses used to be bare spheres floating off the tip)
    const housing = new THREE.SphereGeometry(1, 12, 8);
    housing.scale(0.13, 0.042, 0.048);
    ctx.fittings.add(housing, at([tip.x + 0.02, tip.y, sgn * 7.49]), SURF.spinner);
    const zOut = sgn * 7.515;
    lightKit.add(lens(0.045, tint, channel), at([tip.x + 0.125, tip.y, zOut]));
    lightKit.add(lens(0.03, 0xf2f4ff, LIGHT.strobe), at([tip.x - 0.09, tip.y, zOut]));
    // the lit patches lie on the tip's upper and lower skin (the airfoil is thick: a fixed offset from the chord
    // line buried them inside the wing)
    const xw = tip.x - 0.05 - WING_POS.x, zw = 7.28;
    const yUpper = WING_POS.y + wingUpperY(wingSpec, xw, zw) + 0.004, yLower = WING_POS.y + wingLowerY(wingSpec, xw, zw) - 0.004;
    for (const [y, flipY] of [[yUpper, 0], [yLower, Math.PI]] as const) {
      const patch = new THREE.CircleGeometry(0.22, 12);
      patch.scale(1.6, 1, 1);
      lightKit.add(lit(patch, tint, channel, 0.22, true), at([tip.x - 0.05, y, sgn * 7.28], [-Math.PI / 2 + flipY, 0, 0]));
    }
    glows.push({ p: V3(tip.x + 0.125, tip.y, zOut), tint, channel, size: 0.7 }, { p: V3(tip.x - 0.09, tip.y, zOut), tint: 0xf2f4ff, channel: LIGHT.strobe, size: 0.6 });
  }
  // tail position light: a small teardrop housing on the stern post with the white lens at its point (the bare
  // 8 cm sphere read as a ball stuck on the tail from the rear quarter)
  const tailHousing = new THREE.SphereGeometry(1, 12, 8);
  tailHousing.scale(0.075, 0.032, 0.032);
  ctx.fittings.add(tailHousing, at([-5.49, 0.33, 0]), SURF.spinner);
  lightKit.add(lens(0.026, 0xf2f4ff, LIGHT.tail), at([-5.55, 0.33, 0]));
  glows.push({ p: V3(-5.55, 0.33, 0), tint: 0xf2f4ff, channel: LIGHT.tail, size: 0.55 });
  // rotating beacon on the fin tip, and the landing light in the port wing's leading edge inboard of the strut
  lightKit.add(lens(0.05, 0xd81c1c, LIGHT.beacon), at([-4.80, 2.07, 0]));
  ctx.fittings.add(new THREE.CylinderGeometry(0.048, 0.058, 0.045, 10), at([-4.80, 2.015, 0]), SURF.darkMetal);
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
        varying vec2 vCorner; varying vec3 vCol; varying float vPow; varying float vDim;
        void main() {
          vCorner = aCorner; vCol = color; vPow = uLightPower[int(aLight + 0.5)];
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // no halo without power (day): collapse the quad so it costs no fill
          float s = vPow > 0.01 ? aSize : 0.0;
          // Glare is the eye's / lens's point-spread, so it does not shrink below a few pixels with distance: the
          // quad holds at least ~10 px across and dims by the area it gained, which keeps the lamp's energy
          // (an inverse-square falloff past the crossover) where a bare world-sized quad vanished at 500 m.
          float minS = -mv.z * 0.0036;
          float s2 = s > 0.0 ? max(s, minS) : 0.0;
          vDim = s2 > 0.0 ? (s * s) / (s2 * s2) : 0.0;
          mv.xy += aCorner * s2; mv.z += 0.12;
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        varying vec2 vCorner; varying vec3 vCol; varying float vPow; varying float vDim;
        void main() {
          #include <logdepthbuf_fragment>
          float r = length(vCorner);
          if (r > 1.0) discard;
          // Glare profile: a small bright core and a long, dim, inverse-square-like tail (the point-spread of a
          // lamp in a slightly hazy night), rimmed to zero at the quad's edge. The former (1 - r)^3.5 skirt fell
          // by 20:1 across the radius in linear light, which the night gain and the display gamma turned into a
          // near-linear cone (beacon R 227 -> 129 -> 46 from 4 to 36 px): a flat 40 px disc with a soft edge.
          // Now half the peak is gone by r = 0.1 and 97 % by r = 0.3; the bloom pass adds the soft outer skirt.
          float rim = (1.0 - r) * (1.0 - r);
          float t = 1.0 + r * r * 25.0;
          float halo = rim * (0.55 * exp(-r * r * 36.0) + 0.45 / (t * t));
          // soft knee on the lamp power: the strobe's 40 must not bleach its whole sprite to a white disc
          float pw = vPow * 20.0 / (vPow + 20.0);
          gl_FragColor = vec4(vCol * halo * pw * vDim * 0.08, 1.0);
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
