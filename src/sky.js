import * as THREE from 'three';
import { FOG, PALETTE, SUN } from './palette.js';
import { motePattern } from './textures/nature.js';

// ---------------------------------------------------------------------------
// Hand-written sky.
//
// three's physical Sky shader emits NaN and near-infinite pixels around the
// sun disc at some parameter combinations. Those survive into the PMREM
// environment map, and from there into every PBR material in the scene, which
// renders the whole frame black. This one is analytic, always finite, cheaper,
// and far easier to art-direct: the horizon band, the aureole and the cirrus
// are all separate dials.
// ---------------------------------------------------------------------------

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = ( modelMatrix * vec4( position, 1.0 ) ).xyz - cameraPosition;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to the far plane
}`;

const skyFragment = /* glsl */ `
uniform vec3 uZenith, uHorizon, uHaze, uGround, uSunColor;
uniform vec3 uSunDir;
uniform float uSunDisc, uGlow, uAureole, uHazeFalloff, uCloud, uExposure;
varying vec3 vDir;

float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
float noise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ),
              mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
}
float fbm( vec2 p ) {
  float v = 0.0, a = 0.5;
  for ( int i = 0; i < 5; i ++ ) { v += a * noise( p ); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  float up = clamp( h, 0.0, 1.0 );

  vec3 col = mix( uHorizon, uZenith, pow( up, 0.42 ) );

  // thick band of scattered light sitting on the horizon
  float haze = exp( -max( h, 0.0 ) * uHazeFalloff );
  col = mix( col, uHaze, haze * 0.6 );

  float c = clamp( dot( d, uSunDir ), -1.0, 1.0 );
  float cp = max( c, 0.0 );

  // aureole: wide warm bloom of forward-scattered light around the sun
  col += uSunColor * pow( cp, 6.0 ) * uAureole * ( 0.35 + haze * 0.9 );
  col += uSunColor * pow( cp, 90.0 ) * uGlow;

  // cirrus, mostly for something interesting in the metal reflections
  if ( h > 0.0 ) {
    vec2 cuv = d.xz / ( h + 0.22 );
    float cl = fbm( cuv * 1.35 + 4.0 );
    cl = smoothstep( 0.52, 0.86, cl ) * smoothstep( 0.0, 0.22, h );
    vec3 lit = mix( vec3( 0.85, 0.86, 0.9 ), uSunColor * 1.35, pow( cp, 2.0 ) * 0.8 );
    col = mix( col, lit * ( 0.7 + uGlow * 0.02 ), cl * uCloud );
  }

  // the disc itself, kept to a sane magnitude on purpose
  float disc = smoothstep( 0.99955, 0.99988, c );
  col += uSunColor * disc * uSunDisc;

  // below the horizon the environment should read as dark forest floor
  col = mix( col, uGround, smoothstep( 0.0, -0.10, h ) );

  col = clamp( col * uExposure, vec3( 0.0 ), vec3( 80.0 ) );
  gl_FragColor = vec4( col, 1.0 );
}`;

function makeSkyMaterial(sunDir) {
  return new THREE.ShaderMaterial({
    name: 'ProceduralSky',
    uniforms: {
      uZenith: { value: new THREE.Color(0x2c5f96).convertSRGBToLinear().multiplyScalar(1.35) },
      uHorizon: { value: new THREE.Color(0xbfd0d6).convertSRGBToLinear().multiplyScalar(1.5) },
      uHaze: { value: new THREE.Color(0xe8cfa8).convertSRGBToLinear().multiplyScalar(1.7) },
      uGround: { value: new THREE.Color(0x1c231b).convertSRGBToLinear().multiplyScalar(0.6) },
      uSunColor: { value: new THREE.Color(PALETTE.sunColorLow).convertSRGBToLinear() },
      uSunDir: { value: sunDir.clone() },
      uSunDisc: { value: 46.0 },
      uGlow: { value: 5.5 },
      uAureole: { value: 0.55 },
      uHazeFalloff: { value: 7.0 },
      uCloud: { value: 0.55 },
      uExposure: { value: 1.0 },
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
}

/** Sample the sky shader on the CPU for a rough horizon colour. */
export function horizonColor() {
  return new THREE.Color(0xbfd0d6);
}

// ---------------------------------------------------------------------------
// Atmosphere: physical sky dome, the golden-hour key light, canopy fill,
// exponential fog, and the volumetric shafts + dust that sell "forest".
// The sky is also the PMREM source, so every metal on the truck reflects the
// actual environment rather than a grey box.
// ---------------------------------------------------------------------------

export function sunDirection() {
  const phi = THREE.MathUtils.degToRad(90 - SUN.elevation);
  const theta = THREE.MathUtils.degToRad(SUN.azimuth);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

export function createSky(scene, renderer, { shadowMapSize = 2048, envSamples = 0.04 } = {}) {
  const sunDir = sunDirection();

  const skyMaterial = makeSkyMaterial(sunDir);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMaterial);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.scale.setScalar(500);
  scene.add(sky);

  // --- image based lighting ------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envSkyMaterial = makeSkyMaterial(sunDir);
  // the environment does not need a hard sun disc; the directional light is
  // already carrying that energy and a hot disc just fireflies the PMREM mips
  envSkyMaterial.uniforms.uSunDisc.value = 8.0;
  envSkyMaterial.uniforms.uGlow.value = 3.2;
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), envSkyMaterial);
  envScene.add(envSky);
  // a dark green ground disc so the underside of the truck reflects forest,
  // not blue sky — this is what keeps the chrome from looking like a studio
  const groundDisc = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    new THREE.MeshBasicMaterial({ color: 0x2b3323, side: THREE.BackSide }),
  );
  envScene.add(groundDisc);
  // a few dark trunks around the horizon give metals something to break up on
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x18211a, side: THREE.DoubleSide });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.sin(i) * 0.1;
    const r = 120 + Math.sin(i * 3.1) * 30;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18 + (i % 3) * 8, 130), trunkMat);
    m.position.set(Math.cos(a) * r, 40, Math.sin(a) * r);
    m.lookAt(0, 40, 0);
    envScene.add(m);
  }
  const envRT = pmrem.fromScene(envScene, envSamples);
  const env = envRT.texture;
  scene.environment = env;
  scene.environmentIntensity = 0.85;

  // --- fog -----------------------------------------------------------------
  scene.fog = new THREE.FogExp2(PALETTE.fogColor, FOG.density);

  // --- lights --------------------------------------------------------------
  const sun = new THREE.DirectionalLight(PALETTE.sunColor, SUN.intensity);
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  const s = 26;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.035;
  sun.shadow.blurSamples = 12;
  sun.shadow.radius = 2.4;
  scene.add(sun);
  scene.add(sun.target);

  // sky fill from above, warm bounce from the litter below
  const hemi = new THREE.HemisphereLight(PALETTE.skyTop, PALETTE.bounce, 0.52);
  scene.add(hemi);

  // a cool rim from the opposite side keeps the shadow side from going dead
  const rim = new THREE.DirectionalLight(PALETTE.shadowTint, 0.45);
  rim.position.set(-sunDir.x * 60, 30, -sunDir.z * 60);
  scene.add(rim);

  return {
    sky,
    skyMaterial,
    sun,
    hemi,
    rim,
    env,
    sunDir,
    pmrem,
    /** The dome is pinned to the far plane, so it just has to stay centred. */
    updateSky(camera) {
      sky.position.copy(camera.position);
    },
    /** Keep the shadow frustum tight around whatever we are looking at. */
    follow(target) {
      sun.target.position.copy(target);
      sun.position.copy(target).addScaledVector(sunDir, 110);
      sun.shadow.camera.updateProjectionMatrix();
    },
  };
}

// ---------------------------------------------------------------------------
// Volumetric-looking sun shafts. Additive quads aligned to the sun direction,
// faded by view angle so they never read as flat cards.
// ---------------------------------------------------------------------------

const shaftVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const shaftFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vWorld;

float hash( vec2 p ){ return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float noise( vec2 p ){
  vec2 i = floor( p ); vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), u.x ),
              mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}

void main() {
  // soft along the width, fading out along the length
  float edge = smoothstep( 0.0, 0.34, vUv.x ) * smoothstep( 1.0, 0.66, vUv.x );
  float along = smoothstep( 0.0, 0.22, vUv.y ) * smoothstep( 1.0, 0.35, vUv.y );
  float n = noise( vec2( vUv.x * 5.0 + uSeed, vUv.y * 2.2 - uTime * 0.05 ) );
  float n2 = noise( vec2( vUv.x * 13.0 - uSeed, vUv.y * 5.0 - uTime * 0.09 ) );
  float density = edge * along * ( 0.55 + n * 0.5 ) * ( 0.7 + n2 * 0.45 );
  // distance falloff so shafts do not pile up in the far fog
  float d = length( vWorld - cameraPosition );
  density *= smoothstep( 90.0, 26.0, d ) * smoothstep( 1.5, 6.0, d );
  gl_FragColor = vec4( uColor * density * uIntensity, density * uIntensity );
}`;

export function createLightShafts(sunDir, { count = 14, area = 60, origin = new THREE.Vector3() } = {}) {
  const group = new THREE.Group();
  group.name = 'shafts';
  const dir = sunDir.clone().normalize();
  const uniformsList = [];

  for (let i = 0; i < count; i++) {
    const len = 26 + Math.random() * 22;
    const wide = 1.4 + Math.random() * 3.4;
    const geo = new THREE.PlaneGeometry(wide, len, 1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: shaftVert,
      fragmentShader: shaftFrag,
      uniforms: {
        uColor: { value: new THREE.Color(PALETTE.sunColorLow) },
        uIntensity: { value: 0.16 + Math.random() * 0.16 },
        uTime: { value: 0 },
        uSeed: { value: Math.random() * 20 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    uniformsList.push(mat.uniforms);
    const m = new THREE.Mesh(geo, mat);
    const ox = origin.x + (Math.random() - 0.5) * area;
    const oz = origin.z + (Math.random() - 0.5) * area;
    const top = origin.y + 16 + Math.random() * 6;
    m.position.set(ox, top - len * 0.5 * Math.abs(dir.y) - 2, oz);
    // align the quad's +Y with the incoming sun direction
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.quaternion.copy(q);
    m.renderOrder = 5;
    group.add(m);
  }

  return {
    group,
    update(t, camera) {
      for (const u of uniformsList) u.uTime.value = t;
      // billboard each shaft about the sun axis so it always faces the camera
      for (const child of group.children) {
        const toCam = camera.position.clone().sub(child.position);
        const proj = toCam.clone().addScaledVector(dir, -toCam.dot(dir));
        if (proj.lengthSq() < 1e-4) continue;
        proj.normalize();
        const normal = proj;
        const up = dir.clone();
        const right = new THREE.Vector3().crossVectors(up, normal).normalize();
        const m = new THREE.Matrix4().makeBasis(right, up, normal);
        child.quaternion.setFromRotationMatrix(m);
      }
    },
  };
}

/** Floating dust / pollen caught in the light. */
export function createDustMotes({ count = 900, area = 46, height = 9, origin = new THREE.Vector3() } = {}) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x + (Math.random() - 0.5) * area;
    positions[i * 3 + 1] = origin.y + Math.random() * height;
    positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * area;
    scales[i] = 0.02 + Math.random() * 0.055;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: motePattern() },
      uColor: { value: new THREE.Color(PALETTE.sunColorLow) },
      uOpacity: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.x += sin( uTime * 0.22 + aPhase ) * 0.6;
        p.y += sin( uTime * 0.16 + aPhase * 1.7 ) * 0.35;
        p.z += cos( uTime * 0.19 + aPhase * 0.8 ) * 0.6;
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        float d = -mv.z;
        vFade = smoothstep( 46.0, 12.0, d ) * smoothstep( 0.4, 2.0, d );
        gl_PointSize = aScale * 900.0 / max( d, 0.1 );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        vec4 t = texture2D( uMap, gl_PointCoord );
        float a = t.a * vFade * uOpacity;
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( uColor * t.rgb * 1.4, a );
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  return {
    points,
    update(t) {
      mat.uniforms.uTime.value = t;
    },
  };
}
