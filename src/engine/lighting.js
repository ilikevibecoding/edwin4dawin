import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { setEnvMap } from '../lego/materials.js';

let pmrem = null;
const envCache = new Map();

/**
 * Environment reflections. Shiny ABS plastic needs *something* in the world to
 * reflect or it reads as clay, so every rig ships with an env map.
 */
export function makeEnv(renderer, kind = 'studio', intensity = 0.8) {
  if (envCache.has(kind)) { setEnvMap(envCache.get(kind), intensity); return envCache.get(kind); }
  if (!pmrem) { pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader(); }

  let tex;
  if (kind === 'studio') {
    tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } else {
    const s = new THREE.Scene();
    const presets = {
      space: [0x05070d, 0x0b1424, 0x000000],
      desert: [0xffd9a0, 0xc98a4b, 0x6b4a2a],
      interior: [0xbfd4e8, 0x60708a, 0x141a22],
      hangar: [0x9fb4c9, 0x455063, 0x0c1017],
      ember: [0xff7a3c, 0x6a2410, 0x08060a],
    };
    const [top, mid, bot] = presets[kind] || presets.space;
    const geo = new THREE.SphereGeometry(50, 24, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(top).convertSRGBToLinear() },
        mid: { value: new THREE.Color(mid).convertSRGBToLinear() },
        bot: { value: new THREE.Color(bot).convertSRGBToLinear() },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top, mid, bot;
        void main(){ float h = normalize(vP).y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.7));
          gl_FragColor = vec4(c, 1.0); }`,
    });
    s.add(new THREE.Mesh(geo, m));
    tex = pmrem.fromScene(s, 0.0).texture;
  }
  envCache.set(kind, tex);
  setEnvMap(tex, intensity);
  return tex;
}

/**
 * Reusable three-point-ish lighting rigs.
 * Returns a Group you drop into the scene, plus named lights in userData.
 */
/**
 * Global scene radiance scale.
 *
 * Bloom runs on raw linear values before tone mapping, so the rigs are dialled
 * back until a fully-lit white brick lands just under 1.0 and only genuine
 * emitters (engines, bolts, sabers) cross the bloom threshold. Perceived
 * brightness is put back with renderer.toneMappingExposure.
 */
export const LIGHT_SCALE = 0.58;
export const EXPOSURE = 1.65;

export function lightingRig(kind = 'studio', opts = {}) {
  const g = new THREE.Group();
  g.name = `rig_${kind}`;
  const L = {};
  const add = (name, light) => {
    light.intensity *= (opts.scale ?? LIGHT_SCALE);
    L[name] = light;
    g.add(light);
    return light;
  };

  const shadowSize = opts.shadowSize ?? 60;
  const setupShadow = (l, size = shadowSize, res = opts.shadowRes ?? 1024) => {
    l.castShadow = true;
    l.shadow.mapSize.set(res, res);
    l.shadow.camera.near = 0.5;
    l.shadow.camera.far = size * 4;
    l.shadow.camera.left = -size; l.shadow.camera.right = size;
    l.shadow.camera.top = size; l.shadow.camera.bottom = -size;
    l.shadow.bias = -0.0009;
    l.shadow.normalBias = 0.035;
    return l;
  };

  switch (kind) {
    case 'space': {
      const key = add('key', new THREE.DirectionalLight(0xdce8ff, 2.4));
      key.position.set(-60, 40, 50);
      if (opts.shadows !== false) setupShadow(key);
      const rim = add('rim', new THREE.DirectionalLight(0x4f7ecb, 1.5));
      rim.position.set(70, -20, -60);
      add('fill', new THREE.HemisphereLight(0x2a3d63, 0x05070c, 0.55));
      break;
    }
    case 'desert': {
      const sun = add('key', new THREE.DirectionalLight(0xfff0cc, 3.1));
      sun.position.set(-70, 55, 40);
      if (opts.shadows !== false) setupShadow(sun, opts.shadowSize ?? 90);
      const sun2 = add('key2', new THREE.DirectionalLight(0xffd28a, 1.2));
      sun2.position.set(-40, 30, 70);
      add('fill', new THREE.HemisphereLight(0xffe6bb, 0xc98a4b, 1.05));
      break;
    }
    case 'sunset': {
      const sun = add('key', new THREE.DirectionalLight(0xff9b4a, 2.6));
      sun.position.set(0, 8, -80);
      if (opts.shadows !== false) setupShadow(sun, opts.shadowSize ?? 90);
      add('fill', new THREE.HemisphereLight(0xffc07a, 0x6b3a1c, 0.85));
      const rim = add('rim', new THREE.DirectionalLight(0xffd9a8, 1.0));
      rim.position.set(30, 20, 40);
      break;
    }
    case 'interior': {
      const key = add('key', new THREE.DirectionalLight(0xf2f6ff, 1.9));
      key.position.set(20, 45, 25);
      if (opts.shadows !== false) setupShadow(key, opts.shadowSize ?? 45);
      add('fill', new THREE.HemisphereLight(0xcfe0f5, 0x2a2f38, 0.9));
      const warm = add('bounce', new THREE.DirectionalLight(0xffd7b0, 0.5));
      warm.position.set(-30, 10, -25);
      break;
    }
    case 'dark': {
      add('fill', new THREE.HemisphereLight(0x3d4a5e, 0x0a0c10, 0.5));
      const key = add('key', new THREE.DirectionalLight(0xd6dcE6, 1.15));
      key.position.set(-25, 40, 20);
      if (opts.shadows !== false) setupShadow(key, opts.shadowSize ?? 45);
      // a warm bounce keeps yellow ABS skin from reading green under a cool key
      const warm = add('bounce', new THREE.DirectionalLight(0xffcf9e, 0.55));
      warm.position.set(22, 12, 26);
      break;
    }
    default: { // studio
      const key = add('key', new THREE.DirectionalLight(0xffffff, 1.85));
      key.position.set(-24, 34, 26);
      if (opts.shadows !== false) setupShadow(key, opts.shadowSize ?? 30);
      const fill = add('fill', new THREE.DirectionalLight(0xcfe0ff, 0.45));
      fill.position.set(26, 14, 18);
      const rim = add('rim', new THREE.DirectionalLight(0xffe9c8, 0.8));
      rim.position.set(6, 20, -34);
      add('amb', new THREE.HemisphereLight(0xdfe9ff, 0x30323a, 0.35));
    }
  }
  g.userData.lights = L;
  return g;
}
