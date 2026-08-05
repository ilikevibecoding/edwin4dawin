// Sky, sun/moon, cloud layer, lighting rig and time-of-day control.
// The sky is a single analytic scattering shader with a procedural star dome and
// an FBM cloud deck; the PBR environment is baked from it whenever the light
// changes, so metal on the launchers always reflects the correct sky.

import * as THREE from 'three';
import { TOD, WORLD } from './config.js';
import { atmosphere, updateAtmosphere } from './util/materials.js';
import { starfieldTexture } from './util/textures.js';
import { GLSL_NOISE } from './util/noise.js';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize( position );
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z = gl_Position.w * 0.9999999;
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;

uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uTurbidity;
uniform float uRayleigh;
uniform float uMieCoefficient;
uniform float uMieG;
uniform float uNight;
uniform float uStarIntensity;
uniform float uCloudCoverage;
uniform float uCloudTime;
uniform float uCloudHeight;
uniform vec2 uWind;
uniform float uExposure;
uniform sampler2D uStars;
uniform float uGroundGlow;
uniform vec3 uGroundGlowColor;
uniform float uFlash;
uniform vec3 uFlashColor;

const float PI = 3.141592653589793;
const vec3 UP = vec3( 0.0, 1.0, 0.0 );

// Preetham-style analytic scattering constants.
const vec3 LAMBDA = vec3( 680E-9, 550E-9, 450E-9 );
const vec3 TOTAL_RAYLEIGH = vec3( 5.804542996E-6, 1.3562911E-5, 3.0265902E-5 );
const float V = 4.0;
const vec3 MIE_K = vec3( 0.686, 0.678, 0.666 );
const float RAYLEIGH_ZENITH = 8.4E3;
const float MIE_ZENITH = 1.25E3;
const float SUN_ANGULAR_DIAMETER = 0.0093;

${GLSL_NOISE}

vec3 totalMie( float T ) {
  float c = ( 0.2 * T ) * 10E-18;
  return 0.434 * c * PI * pow( ( 2.0 * PI ) / LAMBDA, vec3( V - 2.0 ) ) * MIE_K;
}

float rayleighPhase( float cosTheta ) {
  return ( 3.0 / ( 16.0 * PI ) ) * ( 1.0 + pow( cosTheta, 2.0 ) );
}

float hgPhase( float cosTheta, float g ) {
  float g2 = pow( g, 2.0 );
  float inv = 1.0 / max( 1e-4, pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 ) );
  return ( 1.0 / ( 4.0 * PI ) ) * ( ( 1.0 - g2 ) * inv );
}

float cloudDensity( vec2 uv, float t ) {
  vec2 p = uv + uWind * t;
  float base = fbm3g( vec3( p * 1.0, t * 0.02 ), 5 ) * 0.5 + 0.5;
  float detail = fbm3g( vec3( p * 3.7, t * 0.05 + 11.0 ), 4 ) * 0.5 + 0.5;
  float d = base * 0.72 + detail * 0.28;
  d = smoothstep( 1.0 - uCloudCoverage, 1.0 - uCloudCoverage * 0.35, d );
  return d;
}

void main() {
  vec3 dir = normalize( vDir );
  // Keep the scattering model stable when the sun sits below the horizon.
  vec3 sunPos = uSunDir;
  float sunE = sunPos.y;
  vec3 sunClamped = normalize( vec3( sunPos.x, max( sunPos.y, 0.02 ), sunPos.z ) );

  float sunfade = 1.0 - clamp( 1.0 - exp( ( sunE * 6.0 ) ), 0.0, 1.0 );
  float rayleighCoef = uRayleigh - ( 1.0 - sunfade );
  vec3 betaR = TOTAL_RAYLEIGH * max( 0.0, rayleighCoef );
  vec3 betaM = totalMie( uTurbidity ) * uMieCoefficient;

  float zenithAngle = acos( max( 0.0, dot( UP, dir ) ) );
  float inv = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / PI ), -1.253 ) );
  float sR = RAYLEIGH_ZENITH * inv;
  float sM = MIE_ZENITH * inv;
  vec3 Fex = exp( -( betaR * sR + betaM * sM ) );

  float cosTheta = dot( dir, sunClamped );
  vec3 betaRTheta = betaR * rayleighPhase( cosTheta * 0.5 + 0.5 );
  vec3 betaMTheta = betaM * hgPhase( cosTheta, uMieG );

  float sunIntensity = 1000.0 * max( 0.0, 1.0 - exp( -( ( PI * 0.5 - acos( sunE ) ) / 1.5 ) ) );
  vec3 Lin = pow( sunIntensity * ( ( betaRTheta + betaMTheta ) / ( betaR + betaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
  Lin *= mix( vec3( 1.0 ), pow( sunIntensity * ( ( betaRTheta + betaMTheta ) / ( betaR + betaM ) ) * Fex, vec3( 0.5 ) ),
              clamp( pow( 1.0 - dot( UP, sunClamped ), 5.0 ), 0.0, 1.0 ) );

  // Sun / moon discs
  float sunCos = dot( dir, normalize( sunPos ) );
  float sunDisc = smoothstep( SUN_ANGULAR_DIAMETER, SUN_ANGULAR_DIAMETER * 0.4, acos( clamp( sunCos, -1.0, 1.0 ) ) );
  vec3 L0 = vec3( 0.1 ) * Fex;
  L0 += sunIntensity * 19000.0 * Fex * sunDisc * clamp( sunE * 8.0 + 0.15, 0.0, 1.0 );
  // broad forward glow around the sun
  L0 += Fex * pow( max( 0.0, sunCos ), 220.0 ) * 260.0 * clamp( sunE * 6.0 + 0.1, 0.0, 1.0 );

  vec3 tex = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
  vec3 sky = pow( vec3( 1.0 ) - exp( -uExposure * tex ), vec3( 1.0 / 2.2 ) );

  // ---- night sky -------------------------------------------------------
  if ( uNight > 0.001 ) {
    vec2 suv = vec2( atan( dir.z, dir.x ) / ( 2.0 * PI ) + 0.5, acos( clamp( dir.y, -1.0, 1.0 ) ) / PI );
    vec3 stars = texture2D( uStars, suv ).rgb;
    float tw = 0.82 + 0.18 * sin( uCloudTime * 3.1 + hash12( floor( suv * 900.0 ) ) * 40.0 );
    stars *= tw * uStarIntensity * smoothstep( -0.04, 0.16, dir.y );
    vec3 nightSky = vec3( 0.006, 0.011, 0.024 ) * ( 0.5 + 0.5 * smoothstep( -0.1, 0.5, dir.y ) );
    // moon
    float moonCos = dot( dir, normalize( uMoonDir ) );
    float moonAng = acos( clamp( moonCos, -1.0, 1.0 ) );
    float moonDisc = smoothstep( 0.011, 0.0072, moonAng );
    vec3 moonSurf = vec3( 0.86, 0.88, 0.92 );
    // crude maria so the disc is not a flat circle
    vec3 mdir = dir - normalize( uMoonDir ) * moonCos;
    moonSurf *= 0.78 + 0.22 * ( fbm3g( mdir * 240.0, 4 ) * 0.5 + 0.5 );
    float moonGlow = pow( max( 0.0, moonCos ), 900.0 ) * 0.55 + exp( -moonAng * 22.0 ) * 0.14;
    vec3 night = nightSky + stars + moonSurf * moonDisc * 2.4 + vec3( 0.55, 0.62, 0.82 ) * moonGlow;
    sky = mix( sky, night, uNight );
  }

  // ---- cloud deck ------------------------------------------------------
  if ( uCloudCoverage > 0.001 && dir.y > 0.012 ) {
    vec2 cuv = ( dir.xz / dir.y ) * uCloudHeight * 0.00006;
    float d = cloudDensity( cuv, uCloudTime );
    if ( d > 0.001 ) {
      // one offset tap toward the sun approximates self-shadowing
      vec2 sdir = normalize( sunClamped.xz + 1e-4 ) * 0.09;
      float ds = cloudDensity( cuv + sdir, uCloudTime );
      float lit = clamp( 1.0 - ds * 0.85, 0.12, 1.0 );
      vec3 lightCol = mix( vec3( 0.30, 0.34, 0.42 ), vec3( 1.05, 0.95, 0.84 ), clamp( sunE * 3.0, 0.0, 1.0 ) );
      vec3 shadowCol = mix( vec3( 0.10, 0.12, 0.17 ), vec3( 0.42, 0.44, 0.52 ), clamp( sunE * 3.0, 0.0, 1.0 ) );
      vec3 cloudCol = mix( shadowCol, lightCol, lit );
      // silver lining when looking toward the sun through thin edges
      cloudCol += lightCol * pow( max( 0.0, cosTheta ), 12.0 ) * ( 1.0 - d ) * 0.8;
      cloudCol = mix( cloudCol * 0.25, cloudCol, 1.0 - uNight * 0.75 );
      float horizonFade = smoothstep( 0.012, 0.10, dir.y );
      float a = d * horizonFade * 0.95;
      sky = mix( sky, cloudCol, clamp( a, 0.0, 1.0 ) );
    }
  }

  // ---- ground haze + base light dome ----------------------------------
  float below = smoothstep( 0.06, -0.12, dir.y );
  vec3 hazeCol = mix( sky, uGroundGlowColor, 0.55 );
  sky = mix( sky, hazeCol, below * 0.85 );
  sky += uGroundGlowColor * uGroundGlow * pow( clamp( 1.0 - abs( dir.y ) * 3.2, 0.0, 1.0 ), 2.0 );
  sky += uFlashColor * uFlash * ( 0.35 + 0.65 * max( 0.0, dir.y ) );

  gl_FragColor = vec4( max( sky, vec3( 0.0 ) ), 1.0 );
}
`;

export class Weather {
  constructor(renderer, scene, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.quality = quality;
    this.time = 0;
    this.todId = 'day';
    this.tod = TOD.day;
    this.sunDir = new THREE.Vector3(0.4, 0.7, 0.55).normalize();
    this.moonDir = new THREE.Vector3(-0.4, 0.5, -0.6).normalize();
    this.wind = new THREE.Vector3(1.6, 0, 0.6);
    this.flash = 0;
    this.flashColor = new THREE.Color(1, 0.86, 0.7);

    this.uniforms = {
      uSunDir: { value: this.sunDir },
      uMoonDir: { value: this.moonDir },
      uTurbidity: { value: 2.6 },
      uRayleigh: { value: 1.6 },
      uMieCoefficient: { value: 0.0045 },
      uMieG: { value: 0.79 },
      uNight: { value: 0 },
      uStarIntensity: { value: 0 },
      uCloudCoverage: { value: quality.clouds > 0 ? 0.42 : 0 },
      uCloudTime: { value: 0 },
      uCloudHeight: { value: 2600 },
      uWind: { value: new THREE.Vector2(0.012, 0.006) },
      uExposure: { value: 0.5 },
      uStars: { value: starfieldTexture(2048) },
      uGroundGlow: { value: 0 },
      uGroundGlowColor: { value: new THREE.Color(0x6b7a8c) },
      uFlash: { value: 0 },
      uFlashColor: { value: this.flashColor },
    };

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    this.sky.scale.setScalar(WORLD.cameraFar * 0.42);
    scene.add(this.sky);

    // ---- lighting rig ------------------------------------------------
    this.sun = new THREE.DirectionalLight(0xfff3df, 3.4);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.setScalar(quality.shadowMapSize);
    s.camera.near = 1;
    s.camera.far = 900;
    const ext = 260;
    s.camera.left = -ext;
    s.camera.right = ext;
    s.camera.top = ext;
    s.camera.bottom = -ext;
    s.bias = -0.0006;
    s.normalBias = 0.35;
    s.blurSamples = 12;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x9fb6d6, 0x8a6e50, 0.55);
    scene.add(this.hemi);

    // Warm bounce from the sunlit pad keeps vehicle undersides from going flat.
    this.bounce = new THREE.DirectionalLight(0x8a6e50, 0.32);
    this.bounce.position.set(0, -1, 0.2);
    scene.add(this.bounce);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envRT = null;
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(this.sky.geometry, this.skyMat);
    this.envSky.scale.setScalar(100);
    this.envScene.add(this.envSky);

    this.setTimeOfDay('day');
  }

  setTimeOfDay(id) {
    const tod = TOD[id] || TOD.day;
    this.todId = id;
    this.tod = tod;
    const elev = tod.sunElev;
    const az = tod.sunAzim;
    this.sunDir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)).normalize();
    this.moonDir.set(-Math.cos(0.62) * Math.cos(az + 2.1), Math.sin(0.62), -Math.cos(0.62) * Math.sin(az + 2.1)).normalize();

    const u = this.uniforms;
    u.uTurbidity.value = tod.turbidity;
    u.uRayleigh.value = id === 'sunset' ? 2.6 : 1.7;
    u.uMieCoefficient.value = id === 'sunset' ? 0.0092 : 0.0045;
    u.uMieG.value = id === 'sunset' ? 0.84 : 0.79;
    u.uNight.value = THREE.MathUtils.clamp(-elev * 3.6 + 0.05, 0, 1);
    u.uStarIntensity.value = tod.starIntensity;
    u.uExposure.value = tod.skyExposure !== undefined ? tod.skyExposure : 0.34;
    u.uCloudCoverage.value = this.quality.clouds > 0 ? (id === 'sunset' ? 0.5 : id === 'night' ? 0.3 : 0.4) : 0;
    u.uGroundGlow.value = id === 'night' ? 0.055 : 0.0;
    u.uGroundGlowColor.value.setHex(id === 'night' ? 0x2a3a52 : tod.fogColor);

    this.sun.color.setHex(tod.sunColor);
    this.sun.intensity = tod.sunIntensity;
    this.hemi.color.setHex(tod.ambient);
    this.hemi.groundColor.setHex(tod.groundBounce);
    this.hemi.intensity = tod.ambientIntensity;
    this.bounce.color.setHex(tod.groundBounce);
    this.bounce.intensity = id === 'night' ? 0.06 : 0.3;

    const dir = elev < 0 ? this.moonDir : this.sunDir;
    this.sun.position.copy(dir).multiplyScalar(420);
    if (elev < 0) this.sun.color.setHex(0x8ea6dc);

    this.scene.fog = new THREE.FogExp2(tod.fogColor, tod.fogDensity);
    atmosphere.uAtmColor.value.setHex(tod.fogColor);
    updateAtmosphere(tod, elev < 0 ? this.moonDir : this.sunDir);
    this.bakeEnvironment();
  }

  bakeEnvironment() {
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0.04, 1, 1000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = this.tod.envIntensity !== undefined ? this.tod.envIntensity : 0.5;
  }

  /** Bright transient sky lift used by big explosions and launches. */
  addFlash(amount, color) {
    this.flash = Math.min(1.6, this.flash + amount);
    if (color) this.flashColor.copy(color);
  }

  update(dt, camera) {
    this.time += dt;
    this.uniforms.uCloudTime.value = this.time;
    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.uniforms.uFlash.value = this.flash * 0.22;
    this.sky.position.copy(camera.position);

    // Follow the camera so the shadow cascade always covers the play area.
    const t = this.sun.target;
    t.position.set(camera.position.x, 0, camera.position.z);
    const dir = this.tod.sunElev < 0 ? this.moonDir : this.sunDir;
    this.sun.position.copy(t.position).addScaledVector(dir, 420);
  }

  dispose() {
    if (this.envRT) this.envRT.dispose();
    this.pmrem.dispose();
    this.skyMat.dispose();
    this.sky.geometry.dispose();
  }
}
