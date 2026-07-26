import * as THREE from 'three';

/**
 * Atmosphere: custom sky dome shader (hazy desert afternoon), sun + shadow
 * rig, exponential haze fog, PMREM environment, drifting dust motes.
 */

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w; // push to far plane
  }
`;

const SKY_FRAG = /* glsl */`
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform float uTime;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += noise(p) * a; p = p * 2.02 + vec2(17.3); a *= 0.5; }
    return s;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.08, 1.0);

    // Base gradient: warm dusty horizon -> desaturated blue zenith
    vec3 zenith  = vec3(0.30, 0.46, 0.66);
    vec3 mid     = vec3(0.62, 0.71, 0.80);
    vec3 horizon = vec3(0.93, 0.83, 0.66);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
    col = mix(col, zenith, smoothstep(0.12, 0.65, h));

    // Sun disc + halo
    float sunD = dot(dir, uSunDir);
    float disc = smoothstep(0.9996, 0.99985, sunD);
    float halo = pow(clamp(sunD, 0.0, 1.0), 80.0);
    float broad = pow(clamp(sunD, 0.0, 1.0), 7.0);
    col += vec3(1.0, 0.86, 0.62) * halo * 0.35;
    col += vec3(1.0, 0.78, 0.5) * broad * 0.05;
    col += vec3(1.0, 0.96, 0.88) * disc * 6.0;

    // Clouds: two layers of drifting fbm mapped on a plane at altitude
    if (dir.y > 0.02) {
      vec2 cuv = dir.xz / (dir.y + 0.12);
      float c1 = fbm(cuv * 1.1 + vec2(uTime * 0.006, uTime * 0.0015));
      float c2 = fbm(cuv * 3.0 + vec2(uTime * 0.012, -uTime * 0.004) + 40.0);
      float cover = smoothstep(0.52, 0.78, c1) * 0.7 + smoothstep(0.6, 0.85, c2) * 0.3;
      cover *= smoothstep(0.02, 0.12, dir.y);           // fade at horizon
      cover *= 1.0 - smoothstep(0.5, 0.95, dir.y) * 0.5; // thin overhead
      vec3 cloudCol = mix(vec3(1.02, 0.99, 0.94), vec3(0.72, 0.72, 0.74), cover * 0.7);
      // Sun-lit edges
      cloudCol += vec3(1.0, 0.85, 0.6) * halo * 0.4;
      col = mix(col, cloudCol, clamp(cover, 0.0, 1.0) * 0.85);
    }

    // Dust haze near horizon
    float haze = 1.0 - smoothstep(-0.05, 0.22, dir.y);
    col = mix(col, vec3(0.89, 0.80, 0.64), haze * 0.55);

    // Below-horizon ground tone (never really visible, keeps env map sane)
    if (dir.y < 0.0) col = mix(col, vec3(0.55, 0.48, 0.38), smoothstep(0.0, -0.06, dir.y));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createAtmosphere(scene, renderer, quality = 'high') {
  // Sun direction: afternoon sun raking from ESE, elevation ~32 deg
  const sunDir = new THREE.Vector3(0.55, 0.62, 0.30).normalize();

  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uSunDir: { value: sunDir.clone() },
      uTime: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // Fog: warm dust haze
  scene.fog = new THREE.FogExp2(0xc9b490, 0.0062);

  // Sun light
  const sun = new THREE.DirectionalLight(0xffe7c4, 3.4);
  sun.position.copy(sunDir).multiplyScalar(180);
  sun.castShadow = true;
  const shadowRes = quality === 'cinematic' ? 4096 : quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 420;
  const ext = 95;
  sun.shadow.camera.left = -ext; sun.shadow.camera.right = ext;
  sun.shadow.camera.top = ext; sun.shadow.camera.bottom = -ext;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.55;
  scene.add(sun);
  scene.add(sun.target);

  // Sky/ground ambient
  const hemi = new THREE.HemisphereLight(0x9fb4cc, 0x8a7458, 0.85);
  scene.add(hemi);

  // Bounce fill from sunward side (fakes GI off the bright walls)
  const bounce = new THREE.DirectionalLight(0xd9b98c, 0.5);
  bounce.position.set(-sunDir.x * 120, 40, -sunDir.z * 120);
  scene.add(bounce);

  // Environment (PMREM of the sky itself) for PBR reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), skyMat.clone());
  envScene.add(envSky);
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // Floating dust motes around the camera
  const dustCount = quality === 'medium' ? 200 : 420;
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(dustCount * 3);
  const seeds = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 60;
    pos[i * 3 + 1] = Math.random() * 9 + 0.3;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    seeds[i] = Math.random() * 100;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime;
      uniform vec3 uCam;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.35 + aSeed) * 1.6 + uTime * 0.55;
        p.z += cos(uTime * 0.28 + aSeed * 1.7) * 1.4;
        p.y += sin(uTime * 0.22 + aSeed * 2.3) * 0.8;
        // wrap around camera
        vec3 rel = mod(p - uCam + 30.0, 60.0) - 30.0;
        vec3 wp = uCam + rel;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        float dist = -mv.z;
        vA = smoothstep(30.0, 8.0, dist) * 0.5;
        gl_PointSize = clamp(90.0 / dist, 0.5, 3.4);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(1.0, 0.93, 0.8, a * 0.35);
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  return {
    sunDir,
    sun,
    hemi,
    update(t, camPos) {
      skyMat.uniforms.uTime.value = t;
      dustMat.uniforms.uTime.value = t;
      if (camPos) {
        dustMat.uniforms.uCam.value.copy(camPos);
        // Keep the shadow frustum centered near the player for crisp shadows
        sun.position.set(camPos.x + sunDir.x * 180, sunDir.y * 180, camPos.z + sunDir.z * 180);
        sun.target.position.set(camPos.x, 0, camPos.z);
      }
    },
  };
}
