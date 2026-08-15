// Late-afternoon trail lighting (do not use three/Sky — NaN sun poisons bloom).
// Sun: elev 46° / az 42°, I=3.55 — high enough to clear the canopy, still raked.
// Bounce: unshadowed warm card, elev 14° / az 228°, I=0.58.
// Hemi: 0.24 (cool sky / terracotta ground) so it does not flatten the key.
// Fog: warm FogExp2 0.007 — depth down the road, not soup.
// Env: finite matching equirect PMREM, scene.environmentIntensity 0.68.
// Sky: analytic, clamped pow — horizon band, aureole, disc, faint cirrus.

import * as THREE from 'three';
import { PALETTE, SUN } from './palette.js';

function dirFromAngles(elevDeg, azDeg) {
  const e = THREE.MathUtils.degToRad(elevDeg);
  const a = THREE.MathUtils.degToRad(azDeg);
  return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize();
}

function pinLightPosition(light, pos) {
  // main.js tick() writes a noon-ish scaffold vector onto the key light.
  // Re-assert the late-afternoon key so disc, shadows, and IBL stay aligned.
  const update = light.updateMatrix.bind(light);
  light.updateMatrix = function updateMatrixPinned() {
    light.position.copy(pos);
    return update();
  };
}

function makeLateAfternoonEnv(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const sunDir = dirFromAngles(SUN.elevation, SUN.azimuth);
  const zenith = new THREE.Color(PALETTE.skyZenith).convertSRGBToLinear();
  const horizon = new THREE.Color(PALETTE.skyHorizon).convertSRGBToLinear();
  const ground = new THREE.Color(PALETTE.dirt).convertSRGBToLinear();
  const pine = new THREE.Color(PALETTE.pine).convertSRGBToLinear();
  const sunCol = new THREE.Color(PALETTE.sun).convertSRGBToLinear();
  const pixel = new THREE.Color();
  const dirtMix = ground.clone().lerp(pine, 0.35);

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    const lat = (v - 0.5) * Math.PI;
    const cy = Math.sin(lat);
    const cz = Math.cos(lat);
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const lon = (u - 0.5) * Math.PI * 2;
      const dx = cz * Math.cos(lon);
      const dy = cy;
      const dz = cz * Math.sin(lon);

      const h = THREE.MathUtils.clamp(dy, -1, 1);
      const hz = h * 0.5 + 0.5;
      pixel.copy(dirtMix).lerp(horizon, THREE.MathUtils.smoothstep(0.38, 0.54, hz));
      const up = Math.max(h, 0);
      pixel.lerp(zenith, THREE.MathUtils.smoothstep(0.12, 0.88, up));

      const band = Math.exp(-Math.pow((h - 0.03) * 5.5, 2));
      pixel.r += horizon.r * band * 0.16;
      pixel.g += horizon.g * band * 0.16;
      pixel.b += horizon.b * band * 0.16;

      const mu = THREE.MathUtils.clamp(dx * sunDir.x + dy * sunDir.y + dz * sunDir.z, 0, 1);
      // Soft aureole only — a hard HDR disc turns bronze paint mint/white.
      const aureole = mu * mu * mu * mu;
      const haze = aureole * aureole;
      const disc = mu > 0.985 ? 0.55 : 0;
      pixel.r += sunCol.r * (aureole * 0.28 + haze * 0.12 + disc);
      pixel.g += sunCol.g * (aureole * 0.28 + haze * 0.12 + disc);
      pixel.b += sunCol.b * (aureole * 0.28 + haze * 0.12 + disc);

      pixel.r = THREE.MathUtils.clamp(pixel.r, 0, 1.6);
      pixel.g = THREE.MathUtils.clamp(pixel.g, 0, 1.6);
      pixel.b = THREE.MathUtils.clamp(pixel.b, 0, 1.6);
      pixel.convertLinearToSRGB();

      const i = (y * size + x) * 4;
      data[i] = Math.round(THREE.MathUtils.clamp(pixel.r, 0, 1) * 255);
      data[i + 1] = Math.round(THREE.MathUtils.clamp(pixel.g, 0, 1) * 255);
      data[i + 2] = Math.round(THREE.MathUtils.clamp(pixel.b, 0, 1) * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSky(scene, renderer, { shadowMapSize = 2048 } = {}) {
  const sunDir = dirFromAngles(SUN.elevation, SUN.azimuth);
  const keyPos = sunDir.clone().multiplyScalar(60);

  const skyGeo = new THREE.SphereGeometry(400, 48, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(PALETTE.skyZenith) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      uGround: { value: new THREE.Color(PALETTE.dirt).lerp(new THREE.Color(PALETTE.pine), 0.35) },
      uSunDir: { value: sunDir.clone() },
      uSunColor: { value: new THREE.Color(PALETTE.sun) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec3 vDir;

      void main() {
        vec3 d = normalize(vDir);
        vec3 s = normalize(uSunDir);
        float h = clamp(d.y, -1.0, 1.0);
        float hz = h * 0.5 + 0.5;

        vec3 col = mix(uGround, uHorizon, smoothstep(0.38, 0.54, hz));
        float band = exp(-pow((h - 0.04) * 6.0, 2.0));
        col += uHorizon * band * 0.22;
        col = mix(col, uZenith, smoothstep(0.10, 0.86, max(h, 0.0)));

        float mu = clamp(dot(d, s), 0.0, 1.0);
        // Clamp exponents — high pow() around a non-unit dir is how the old Sky went NaN.
        float disc = pow(mu, 180.0);
        float aureole = pow(mu, 12.0);
        float haze = pow(mu, 4.0);
        col += uSunColor * disc * 2.2;
        col += uSunColor * aureole * 0.28;
        col += uSunColor * haze * 0.07;

        float t = d.x * 2.35 + d.z * 0.72;
        float cir = sin(t * 3.05) * sin(t * 1.28 + d.y * 3.8);
        cir = smoothstep(0.58, 0.94, cir);
        cir *= smoothstep(0.10, 0.42, h) * smoothstep(0.82, 0.38, h);
        col += vec3(1.0, 0.93, 0.86) * cir * 0.065;

        col = clamp(col, vec3(0.0), vec3(6.0));
        if (!(col.r == col.r)) col = uHorizon;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  const sun = new THREE.DirectionalLight(PALETTE.sun, SUN.intensity);
  sun.name = 'sunKey';
  sun.position.copy(keyPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);
  const keyLive = keyPos.clone();
  pinLightPosition(sun, keyLive);

  const bouncePos = dirFromAngles(SUN.bounceElevation, SUN.bounceAzimuth).multiplyScalar(40);
  const bounceOffset = bouncePos.clone();
  const bounce = new THREE.DirectionalLight(SUN.bounce, SUN.bounceIntensity);
  bounce.name = 'bounceCard';
  bounce.position.copy(bouncePos);
  bounce.castShadow = false;
  scene.add(bounce);

  const hemi = new THREE.HemisphereLight(SUN.hemiSky, SUN.hemiGround, SUN.hemiIntensity);
  hemi.name = 'hemi';
  scene.add(hemi);

  const src = makeLateAfternoonEnv();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(src).texture;
  src.dispose();
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = SUN.envIntensity;

  scene.fog = new THREE.FogExp2(SUN.fog, SUN.fogDensity);

  function follow(origin) {
    if (!origin) return;
    keyLive.set(origin.x + keyPos.x, origin.y + keyPos.y, origin.z + keyPos.z);
    sun.position.copy(keyLive);
    sun.target.position.set(origin.x, origin.y, origin.z);
    sun.target.updateMatrixWorld();
    bounce.position.set(origin.x + bounceOffset.x, origin.y + bounceOffset.y, origin.z + bounceOffset.z);
  }

  return { sky, sun, bounce, hemi, env, follow };
}
