// weather.js — procedural sky, sun/moon lighting, fog, clouds, wind, day/sunset/night conditions,
// plus night searchlights for the NIGHT RAID scenario.
import * as THREE from 'three';
import { cloudTexture, lerp, damp, rngFx } from './utils.js';

export const CONDITIONS = {
  day: {
    sunDir: new THREE.Vector3(0.55, 0.72, 0.34).normalize(),
    sunColor: new THREE.Color(1.0, 0.98, 0.92), sunIntensity: 3.1,
    hemiSky: new THREE.Color(0.55, 0.68, 0.85), hemiGround: new THREE.Color(0.52, 0.44, 0.34), hemiIntensity: 0.85,
    zenith: new THREE.Color(0.14, 0.34, 0.72), horizon: new THREE.Color(0.72, 0.82, 0.94),
    glow: new THREE.Color(1.0, 0.97, 0.88), fogColor: new THREE.Color(0.71, 0.79, 0.89),
    fogDensity: 0.000048, night: 0.0, exposure: 1.0, floodlights: 0.0, starAmt: 0.0,
  },
  sunset: {
    sunDir: new THREE.Vector3(0.88, 0.13, 0.45).normalize(),
    sunColor: new THREE.Color(1.0, 0.62, 0.32), sunIntensity: 2.4,
    hemiSky: new THREE.Color(0.48, 0.36, 0.42), hemiGround: new THREE.Color(0.38, 0.28, 0.22), hemiIntensity: 0.62,
    zenith: new THREE.Color(0.10, 0.14, 0.34), horizon: new THREE.Color(0.98, 0.48, 0.22),
    glow: new THREE.Color(1.0, 0.55, 0.25), fogColor: new THREE.Color(0.62, 0.40, 0.32),
    fogDensity: 0.000060, night: 0.12, exposure: 1.02, floodlights: 0.45, starAmt: 0.12,
  },
  night: {
    sunDir: new THREE.Vector3(-0.4, 0.52, -0.65).normalize(), // moon
    sunColor: new THREE.Color(0.62, 0.72, 0.95), sunIntensity: 0.32,
    hemiSky: new THREE.Color(0.10, 0.14, 0.24), hemiGround: new THREE.Color(0.05, 0.05, 0.07), hemiIntensity: 0.34,
    zenith: new THREE.Color(0.012, 0.018, 0.045), horizon: new THREE.Color(0.05, 0.075, 0.13),
    glow: new THREE.Color(0.55, 0.65, 0.9), fogColor: new THREE.Color(0.024, 0.034, 0.055),
    fogDensity: 0.000075, night: 1.0, exposure: 1.1, floodlights: 1.0, starAmt: 1.0,
  },
};

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.99999; // pin to far plane
  }
`;

const SKY_FRAG = /* glsl */`
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform float uNight;
  uniform float uStarAmt;
  uniform float uTime;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.12, 1.0);
    float t = pow(max(h, 0.0), 0.42);
    vec3 col = mix(uHorizon, uZenith, t);
    // below-horizon ground haze
    if (dir.y < 0.0) col = mix(uHorizon, uHorizon * 0.55, clamp(-dir.y * 10.0, 0.0, 1.0));

    float sunD = max(dot(dir, uSunDir), 0.0);
    // wide scattering glow + tight disc
    col += uGlow * (pow(sunD, 5.0) * 0.22 + pow(sunD, 40.0) * 0.55);
    float disc = smoothstep(0.9994, 0.99975, sunD);
    vec3 discCol = mix(uGlow * 6.0, vec3(0.9, 0.95, 1.1) * (0.8 + uNight * 1.4), uNight);
    col += discCol * disc;

    // stars
    if (uStarAmt > 0.001 && dir.y > 0.02) {
      vec3 sp = dir * 700.0;
      vec3 cell = floor(sp);
      float star = hash13(cell);
      if (star > 0.997) {
        vec3 f = fract(sp) - 0.5;
        float d = length(f);
        float tw = 0.75 + 0.25 * sin(uTime * (1.0 + star * 6.0) + star * 40.0);
        float b = smoothstep(0.5, 0.05, d) * tw;
        col += vec3(b) * uStarAmt * (0.55 + star) * smoothstep(0.02, 0.2, dir.y);
      }
      // milky band
      float band = exp(-pow((dir.y - 0.35), 2.0) * 14.0) * exp(-pow(dir.x * 0.8 + dir.z * 0.4, 2.0) * 2.2);
      col += vec3(0.020, 0.026, 0.038) * band * uStarAmt;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Weather {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.condition = 'day';
    this.windDir = new THREE.Vector3(0.7, 0, 0.3).normalize();
    this.windSpeed = 2.2;
    this.time = 0;
    this._target = CONDITIONS.day;
    this._blend = 1;

    // --- sky dome
    this.skyUniforms = {
      uSunDir: { value: CONDITIONS.day.sunDir.clone() },
      uZenith: { value: CONDITIONS.day.zenith.clone() },
      uHorizon: { value: CONDITIONS.day.horizon.clone() },
      uGlow: { value: CONDITIONS.day.glow.clone() },
      uNight: { value: 0 },
      uStarAmt: { value: 0 },
      uTime: { value: 0 },
    };
    const skyGeo = new THREE.SphereGeometry(24000, 40, 24);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    // --- lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 900;
    const s = 190;
    this.sun.shadow.camera.left = -s; this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s; this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.5;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x88aaff, 0x554433, 0.8);
    scene.add(this.hemi);

    // --- fog
    scene.fog = new THREE.FogExp2(CONDITIONS.day.fogColor.clone(), CONDITIONS.day.fogDensity);

    // --- clouds
    this.clouds = new THREE.Group();
    const cloudMats = [];
    for (let i = 0; i < 3; i++) {
      cloudMats.push(new THREE.MeshBasicMaterial({
        map: cloudTexture(256, 5 + i * 13), transparent: true, depthWrite: false,
        opacity: 0.85, fog: false, side: THREE.DoubleSide,
      }));
    }
    this.cloudMats = cloudMats;
    for (let i = 0; i < 16; i++) {
      const w = rngFx.range(1400, 3400);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * rngFx.range(0.28, 0.42)), cloudMats[i % 3]);
      const ang = rngFx.range(0, Math.PI * 2);
      const rad = rngFx.range(2500, 10500);
      m.position.set(Math.cos(ang) * rad, rngFx.range(1500, 3100), Math.sin(ang) * rad);
      m.rotation.x = -Math.PI / 2 + rngFx.range(-0.25, 0.25);
      m.rotation.z = rngFx.range(0, Math.PI * 2);
      m.userData.drift = rngFx.range(1.5, 4.5);
      this.clouds.add(m);
    }
    scene.add(this.clouds);

    this.setCondition('day', true);
  }

  setCondition(name, instant = false) {
    this.condition = name;
    this._target = CONDITIONS[name];
    if (instant) this._blend = 1; else this._blend = 0;
    if (instant) this._apply(this._target, 1);
  }

  _apply(c, k) {
    const u = this.skyUniforms;
    u.uSunDir.value.lerp(c.sunDir, k).normalize();
    u.uZenith.value.lerp(c.zenith, k);
    u.uHorizon.value.lerp(c.horizon, k);
    u.uGlow.value.lerp(c.glow, k);
    u.uNight.value = lerp(u.uNight.value, c.night, k);
    u.uStarAmt.value = lerp(u.uStarAmt.value, c.starAmt, k);

    this.sun.color.lerp(c.sunColor, k);
    this.sun.intensity = lerp(this.sun.intensity, c.sunIntensity, k);
    this.sun.position.copy(u.uSunDir.value).multiplyScalar(700);
    this.sun.target.position.set(0, 0, 0);

    this.hemi.color.lerp(c.hemiSky, k);
    this.hemi.groundColor.lerp(c.hemiGround, k);
    this.hemi.intensity = lerp(this.hemi.intensity, c.hemiIntensity, k);

    this.scene.fog.color.lerp(c.fogColor, k);
    this.scene.fog.density = lerp(this.scene.fog.density, c.fogDensity, k);

    const cloudTint = 0.18 + (1 - c.night) * 0.82;
    for (const m of this.cloudMats) {
      m.color.setScalar(cloudTint);
      m.opacity = lerp(m.opacity, c.night > 0.5 ? 0.4 : 0.8, k);
    }
    this.floodAmount = c.floodlights;
  }

  get isNight() { return this._target.night > 0.5; }

  update(dt) {
    this.time += dt;
    this.skyUniforms.uTime.value = this.time;
    if (this._blend < 1) {
      this._blend = Math.min(1, this._blend + dt * 0.55);
      this._apply(this._target, 1 - Math.exp(-3.2 * dt));
    }
    // cloud drift
    for (const m of this.clouds.children) {
      m.position.addScaledVector(this.windDir, m.userData.drift * dt);
      if (m.position.length() > 12000) m.position.multiplyScalar(-0.9);
    }
    // wind gusts
    this.windSpeed = 2.2 + Math.sin(this.time * 0.13) * 0.9 + Math.sin(this.time * 0.041) * 0.6;
  }
}

// ---------------------------------------------------------------- searchlights (night raid)
const BEAM_FRAG = /* glsl */`
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uIntensity;
  void main() {
    float core = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.4);
    float fade = pow(1.0 - vUv.y, 1.6);
    float a = core * fade * uIntensity;
    gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * a, a * 0.55);
  }
`;
const BEAM_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv; vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export class Searchlights {
  constructor(scene, positions) {
    this.group = new THREE.Group();
    this.beams = [];
    this.enabled = false;
    for (const p of positions) {
      const pivot = new THREE.Group();
      pivot.position.copy(p);
      // beam: tall tapered plane pair (cross) for cheap volumetric look
      const h = 2600;
      const geo = new THREE.PlaneGeometry(46, h, 1, 8);
      geo.translate(0, h / 2, 0);
      // taper
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i) / h;
        posAttr.setX(i, posAttr.getX(i) * (0.06 + y * 1.6));
      }
      const mat = new THREE.ShaderMaterial({
        vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
        uniforms: { uIntensity: { value: 0 } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const b1 = new THREE.Mesh(geo, mat);
      const b2 = new THREE.Mesh(geo, mat);
      b2.rotation.y = Math.PI / 2;
      pivot.add(b1, b2);
      // source glow
      const src = new THREE.PointLight(0xbfd4ff, 0, 90, 2);
      pivot.add(src);
      pivot.userData = {
        mat, src,
        phase: rngFx.range(0, Math.PI * 2),
        rate: rngFx.range(0.14, 0.23),
        tiltBase: rngFx.range(0.28, 0.42),
      };
      this.group.add(pivot);
      this.beams.push(pivot);
    }
    scene.add(this.group);
  }

  setEnabled(on) { this.enabled = on; }

  update(dt, t) {
    for (const b of this.beams) {
      const u = b.userData;
      const target = this.enabled ? 1 : 0;
      u.mat.uniforms.uIntensity.value = damp(u.mat.uniforms.uIntensity.value, target * 0.75, 2.5, dt);
      u.src.intensity = u.mat.uniforms.uIntensity.value * 3;
      if (this.enabled) {
        b.rotation.y = Math.sin(t * u.rate + u.phase) * 1.4 + u.phase;
        b.rotation.x = u.tiltBase + Math.sin(t * u.rate * 1.7 + u.phase * 2.0) * 0.16;
      }
    }
  }
}
