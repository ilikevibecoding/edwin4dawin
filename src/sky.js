import * as THREE from 'three';
import { PALETTE, SUN } from './palette.js';
import { envCanvas } from './textures.js';

function dirFromAngles(elevDeg, azDeg) {
  const e = THREE.MathUtils.degToRad(elevDeg);
  const a = THREE.MathUtils.degToRad(azDeg);
  return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize();
}

export function createSky(scene, renderer, { shadowMapSize = 2048 } = {}) {
  const skyGeo = new THREE.SphereGeometry(400, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new THREE.Color(PALETTE.skyZenith) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      uGround: { value: new THREE.Color(0x2a2418) },
      uSunDir: { value: dirFromAngles(SUN.elevation, SUN.azimuth) },
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
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uGround, uHorizon, smoothstep(0.42, 0.52, h));
        col = mix(col, uZenith, smoothstep(0.55, 0.95, h));
        float sun = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 280.0);
        float aureole = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 16.0);
        col += uSunColor * sun * 3.5 + uSunColor * aureole * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  scene.add(sky);

  const sun = new THREE.DirectionalLight(PALETTE.sun, SUN.intensity);
  sun.position.copy(dirFromAngles(SUN.elevation, SUN.azimuth).multiplyScalar(60));
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const bounce = new THREE.DirectionalLight(SUN.bounce, SUN.bounceIntensity);
  bounce.position.copy(dirFromAngles(18, SUN.bounceAzimuth).multiplyScalar(40));
  bounce.castShadow = false;
  scene.add(bounce);

  const hemi = new THREE.HemisphereLight(SUN.hemiSky, SUN.hemiGround, SUN.hemiIntensity);
  scene.add(hemi);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(envCanvas()).texture;
  scene.environment = env;
  pmrem.dispose();

  scene.fog = new THREE.FogExp2(SUN.fog, SUN.fogDensity);

  return { sky, sun, bounce, hemi, env };
}
