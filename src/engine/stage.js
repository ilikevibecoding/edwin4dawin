/**
 * Shared lighting presets and camera choreography.
 *
 * Eight scenes get built independently; these keep them looking like one film.
 * Use `standardLights(scene, 'space')` rather than hand-rolling a light rig,
 * and drive cameras with `cameraRig()` so moves ease consistently.
 */
import * as THREE from 'three';
import * as ease from './ease.js';

/**
 * Light presets. Each returns `{ key, fill, rim, hemi, ambient }` so a scene
 * can nudge individual lights afterwards.
 *
 * @param {THREE.Scene} scene
 * @param {'space'|'interior'|'desert'|'hangar'|'trench'|'hall'} preset
 * @param {object} opts  { shadowRadius, shadows, intensity }
 */
export function standardLights(scene, preset = 'space', opts = {}) {
  const P = PRESETS[preset] || PRESETS.space;
  const mul = opts.intensity ?? 1;
  const shadows = opts.shadows !== false;
  const R = opts.shadowRadius ?? 40;

  const hemi = new THREE.HemisphereLight(P.skyColor, P.groundColor, P.hemi * mul);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(P.keyColor, P.key * mul);
  key.position.set(...P.keyDir).multiplyScalar(R * 0.9);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(opts.shadowMap ?? 2048, opts.shadowMap ?? 2048);
    const c = key.shadow.camera;
    c.left = -R;
    c.right = R;
    c.top = R;
    c.bottom = -R;
    c.near = 0.5;
    c.far = R * 6;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.03;
    c.updateProjectionMatrix();
  }
  scene.add(key);

  const fill = new THREE.DirectionalLight(P.fillColor, P.fill * mul);
  fill.position.set(...P.fillDir).multiplyScalar(R);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(P.rimColor, P.rim * mul);
  rim.position.set(...P.rimDir).multiplyScalar(R);
  scene.add(rim);

  let ambient = null;
  if (P.ambient > 0) {
    ambient = new THREE.AmbientLight(P.ambientColor, P.ambient * mul);
    scene.add(ambient);
  }

  if (P.background !== undefined && !scene.background) scene.background = new THREE.Color(P.background);
  if (P.fog) scene.fog = new THREE.Fog(P.fog.color, P.fog.near, P.fog.far);

  return { hemi, key, fill, rim, ambient };
}

const PRESETS = {
  // Hard sun, deep black shadow, cold bounce. For anything in vacuum.
  space: {
    skyColor: 0x2a3a55, groundColor: 0x090c12, hemi: 0.45,
    keyColor: 0xfff2dd, key: 3.1, keyDir: [0.55, 0.55, 0.35],
    fillColor: 0x3c6ea8, fill: 0.42, fillDir: [-0.7, -0.15, -0.4],
    rimColor: 0x7fb4ff, rim: 1.0, rimDir: [-0.35, 0.25, -0.85],
    ambientColor: 0x22314a, ambient: 0.16,
    background: 0x03050a,
  },
  // Practical panel lighting, cool and even, with a warm bounce off the deck.
  interior: {
    skyColor: 0x93a8c4, groundColor: 0x2a2620, hemi: 0.75,
    keyColor: 0xfff4e6, key: 2.0, keyDir: [0.4, 0.85, 0.3],
    fillColor: 0x8fb0d8, fill: 0.6, fillDir: [-0.6, 0.2, 0.55],
    rimColor: 0xcfe3ff, rim: 0.85, rimDir: [0.1, 0.35, -0.9],
    ambientColor: 0x35404f, ambient: 0.3,
    background: 0x0a0d12,
  },
  // Two suns: a big warm key and a smaller hot second sun from the other side.
  desert: {
    skyColor: 0xffd9a0, groundColor: 0xb98b52, hemi: 1.05,
    keyColor: 0xffe0b0, key: 2.9, keyDir: [0.5, 0.42, -0.62],
    fillColor: 0xffb27a, fill: 0.85, fillDir: [0.85, 0.22, -0.3],
    rimColor: 0xffd0a0, rim: 0.7, rimDir: [-0.6, 0.3, 0.5],
    ambientColor: 0x6b5638, ambient: 0.24,
    background: 0xe8b273,
  },
  // Big soft overheads plus coloured deck strips.
  hangar: {
    skyColor: 0xa9c2e0, groundColor: 0x333a44, hemi: 0.85,
    keyColor: 0xffffff, key: 2.3, keyDir: [0.2, 0.95, 0.15],
    fillColor: 0x7fa8d8, fill: 0.55, fillDir: [-0.8, 0.25, 0.4],
    rimColor: 0xffd08a, rim: 0.8, rimDir: [0.4, 0.2, -0.85],
    ambientColor: 0x39414d, ambient: 0.28,
    background: 0x0d1117,
  },
  // Sun raking down one wall, the other wall in deep shadow.
  trench: {
    skyColor: 0x3d5372, groundColor: 0x0b0e14, hemi: 0.5,
    keyColor: 0xfff0d8, key: 2.6, keyDir: [0.75, 0.62, 0.1],
    fillColor: 0x4a6f9e, fill: 0.35, fillDir: [-0.85, 0.1, 0.2],
    rimColor: 0x9ec9ff, rim: 0.9, rimDir: [-0.2, 0.4, -0.9],
    ambientColor: 0x1d2635, ambient: 0.2,
    background: 0x05070c,
  },
  // Warm ceremonial hall: bright, high key, gentle shadows.
  hall: {
    skyColor: 0xffffff, groundColor: 0x9aa2ae, hemi: 1.15,
    keyColor: 0xfff6e8, key: 2.1, keyDir: [0.3, 0.9, 0.45],
    fillColor: 0xdfeaff, fill: 0.7, fillDir: [-0.7, 0.35, 0.3],
    rimColor: 0xffe6b8, rim: 0.75, rimDir: [0.05, 0.3, -0.95],
    ambientColor: 0x6d7686, ambient: 0.4,
    background: 0xd8dee8,
  },
};

/**
 * Drive a camera from keyframe tracks. Every field is optional.
 *
 *   cameraRig(camera, t, {
 *     pos:  [[0,[0,6,40]], [4,[0,9,18]]],
 *     look: [[0,[0,4,0]],  [4,[2,2,0]]],
 *     fov:  [[0,52], [4,34]],
 *     roll: [[0,0], [4,0.06]],
 *     shake: [[0,0], [3,0], [3.2,0.4], [4,0]],
 *     ease: ease.inOutCubic,
 *   });
 */
export function cameraRig(camera, t, tracks = {}) {
  const e = tracks.ease || ease.inOutCubic;
  if (tracks.pos) camera.position.set(...ease.track(tracks.pos, t, e));
  if (tracks.look) {
    const l = ease.track(tracks.look, t, tracks.lookEase || e);
    camera.up.set(0, 1, 0);
    camera.lookAt(l[0], l[1], l[2]);
  }
  if (tracks.fov) {
    const f = ease.track(tracks.fov, t, e);
    if (Math.abs(camera.fov - f) > 1e-4) {
      camera.fov = f;
      camera.updateProjectionMatrix();
    }
  }
  if (tracks.roll) camera.rotation.z += ease.track(tracks.roll, t, e);
  if (tracks.shake) {
    const a = ease.track(tracks.shake, t, ease.smooth);
    if (a > 0.0001) {
      const n = (s) => Math.sin(t * 21 * (1 + s * 0.17) + s * 7.7) * Math.sin(t * 13.4 + s * 3.1);
      camera.position.x += n(1) * a;
      camera.position.y += n(2) * a;
      camera.position.z += n(5) * a * 0.4;
      camera.rotation.z += n(3) * a * 0.022;
    }
  }
  return camera;
}

/**
 * Handheld float: a slow, continuous, deterministic drift for locked-off shots
 * so nothing ever looks like a still image. Call after positioning.
 */
export function handheld(camera, t, amount = 0.05, rate = 0.35, seed = 0) {
  const n = (k, f) => Math.sin(t * rate * f + seed * 3.3 + k * 2.1) * Math.sin(t * rate * f * 0.61 + k);
  camera.position.x += n(1, 1.0) * amount;
  camera.position.y += n(2, 0.83) * amount * 0.7;
  camera.rotation.z += n(3, 0.67) * amount * 0.012;
}

/** Deep-space backdrop: a subtle nebula gradient behind the starfield. */
export function nebulaBackdrop({ radius = 950, colorA = 0x1a2a4a, colorB = 0x2a1436, density = 0.35 } = {}) {
  const geo = new THREE.SphereGeometry(radius, 24, 16);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: new THREE.Color(colorA) },
      uB: { value: new THREE.Color(colorB) },
      uDensity: { value: density },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uA; uniform vec3 uB; uniform float uDensity; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.99,78.23,45.16)))*43758.5453); }
      float n(vec3 p){
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        float a = mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x), f.y),
                      mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x), f.y), f.z);
        return a;
      }
      void main(){
        float v = n(vP*3.0)*0.6 + n(vP*7.0)*0.28 + n(vP*15.0)*0.12;
        v = smoothstep(0.35, 0.95, v);
        vec3 c = mix(uA, uB, n(vP*2.0+13.0));
        gl_FragColor = vec4(c*v*uDensity, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -20;
  return mesh;
}
