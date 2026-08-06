// Sky dome shader (day / sunset / night), sun+moon lighting, fog, drifting
// clouds, wind model and night-raid searchlights. All procedural.
import * as THREE from 'three';
import { WORLD } from './constants.js';
import { cloudSprite } from './textures.js';

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.99999; // keep on far plane
  }
`;

const SKY_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uZenith;
  uniform vec3 uMid;           // mid-sky band (gives sunset its magenta layer)
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSunColor;
  uniform vec3 uWarmColor;     // directional scatter hue near the sun azimuth
  uniform float uWarmth;       // 0..1 strength of that scatter
  uniform float uSunDisc;      // disc sharpness
  uniform float uSunGlow;
  uniform float uStars;        // 0..1
  uniform float uMoon;         // 0..1
  uniform float uMoonGlow;     // halo strength
  uniform float uExposure;
  uniform float uTime;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  // cheap 2D value noise built on hash13 (smooth patchiness for the Milky Way)
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash13(vec3(i, 17.0));
    float b = hash13(vec3(i + vec2(1.0, 0.0), 17.0));
    float c = hash13(vec3(i + vec2(0.0, 1.0), 17.0));
    float d = hash13(vec3(i + vec2(1.0, 1.0), 17.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.08, 1.0);
    float hh = max(h, 0.0);

    // three-stop vertical gradient: zenith -> mid band -> horizon band
    float tMid = pow(1.0 - hh, 2.4);
    float tLow = pow(1.0 - hh, 7.5);
    vec3 col = mix(uZenith, uMid, tMid);
    col = mix(col, uHorizon, tLow);

    // low haze band hugging the horizon
    float hazeBand = smoothstep(0.16, 0.0, abs(d.y - 0.015));
    col = mix(col, uHaze, hazeBand * 0.5);

    // directional warm scatter on the sun's side of the horizon
    if (uWarmth > 0.001) {
      vec2 dxz = normalize(d.xz + 1e-5);
      vec2 sxz = normalize(uSunDir.xz + 1e-5);
      float az = clamp(dot(dxz, sxz) * 0.5 + 0.5, 0.0, 1.0);
      float lobe = pow(az, 3.0) * pow(1.0 - hh, 4.0);
      col = mix(col, uWarmColor, uWarmth * lobe);
      col += uWarmColor * lobe * uWarmth * 0.22;
    }

    // sun
    float sd = dot(d, uSunDir);
    float disc = smoothstep(uSunDisc, uSunDisc + 0.0006, sd);
    float glow = pow(clamp(sd, 0.0, 1.0), 6.0) * uSunGlow;
    col += uSunColor * (disc * 3.2 + glow);

    // moon: disc + layered halo (tight bright ring, faint wide atmosphere)
    if (uMoon > 0.001) {
      float md = dot(d, uMoonDir);
      float mdisc = smoothstep(0.99978, 0.99987, md);
      float mcl = clamp(md, 0.0, 1.0);
      float halo = pow(mcl, 90.0) * 0.14 + pow(mcl, 14.0) * 0.016;
      float mottling = 0.82 + 0.18 * hash13(floor(d * 900.0));
      col += vec3(0.86, 0.9, 1.0) * (mdisc * 1.35 * mottling + halo * uMoonGlow) * uMoon;
    }

    // stars — hash grid, fade near horizon, gentle twinkle
    if (uStars > 0.001 && d.y > 0.0) {
      float horizFade = smoothstep(0.0, 0.16, d.y);
      vec3 sp = d * 340.0;
      vec3 cell = floor(sp);
      float star = step(0.9975, hash13(cell));
      float tw = 0.72 + 0.28 * sin(uTime * (1.5 + hash13(cell + 7.0) * 3.0) + hash13(cell + 3.0) * 40.0);
      float mag = hash13(cell + 11.0);
      col += vec3(0.9, 0.93, 1.0) * star * uStars * tw * (0.35 + mag * 1.1) * horizFade;

      // Milky Way: great-circle band with patchy glow and denser faint stars
      // (plane chosen so the band stays well away from the moon)
      const vec3 MW = vec3(-0.2494, 0.1995, 0.9476);  // band plane normal
      const vec3 MT = vec3(-0.9669, 0.0, -0.2545);    // band tangent frame
      const vec3 MB = vec3(-0.0508, -0.9797, 0.1929);
      float bd = dot(d, MW);
      float band = exp(-bd * bd * 34.0);
      if (band > 0.02) {
        vec2 mp = vec2(dot(d, MT), dot(d, MB));
        float wisp = vnoise(mp * 4.0) * 0.65 + vnoise(mp * 9.0) * 0.35;
        wisp *= wisp; // more contrast so it reads as patchy star clouds
        float mw = band * (0.10 + 1.3 * wisp);
        col += vec3(0.5, 0.58, 0.76) * mw * 0.055 * uStars * horizFade;
        vec3 c2 = floor(d * 640.0);
        float s2 = step(0.998 - band * 0.005, hash13(c2 + 5.0));
        col += vec3(0.85, 0.88, 1.0) * s2 * 0.3 * band * uStars * horizFade;
      }
    }

    // dither to kill gradient banding
    col += (hash13(vec3(gl_FragCoord.xy, 1.7)) - 0.5) * 0.004;

    gl_FragColor = vec4(col * uExposure, 1.0);
  }
`;

const PRESETS = {
  day: {
    sunAzEl: [0.65, 0.62],           // azimuth, elevation (radians)
    zenith: new THREE.Color(0x265795), mid: new THREE.Color(0x6f9cc4),
    horizon: new THREE.Color(0xbdd2de),
    haze: new THREE.Color(0xcdd6d0),
    warmColor: new THREE.Color(0xffdcae), warmth: 0.16,
    sunColor: new THREE.Color(1.0, 0.96, 0.88), sunDisc: 0.99992, sunGlow: 0.22,
    stars: 0, moon: 0, moonGlow: 0,
    sunLight: { color: new THREE.Color(1.0, 0.95, 0.87), intensity: 2.6 },
    hemi: { sky: new THREE.Color(0x9db8d6), ground: new THREE.Color(0x94805f), intensity: 0.52 },
    fogColor: new THREE.Color(0xc1cfd9), fogDensity: 7.4e-5,
    exposure: 1.0, cloudOpacity: 0.55, skyExposure: 1.0,
    cloudColor: new THREE.Color(0xffffff), cirrusOpacity: 0.22,
  },
  sunset: {
    sunAzEl: [4.45, 0.075],
    zenith: new THREE.Color(0x2c2f63), mid: new THREE.Color(0xa4517d),
    horizon: new THREE.Color(0xf5854a),
    haze: new THREE.Color(0xe0925c),
    warmColor: new THREE.Color(0xffb066), warmth: 0.55,
    sunColor: new THREE.Color(1.0, 0.60, 0.30), sunDisc: 0.99973, sunGlow: 0.55,
    stars: 0.12, moon: 0, moonGlow: 0,
    sunLight: { color: new THREE.Color(1.0, 0.55, 0.30), intensity: 2.4 },
    hemi: { sky: new THREE.Color(0x7e6b9d), ground: new THREE.Color(0x6e5a48), intensity: 0.46 },
    fogColor: new THREE.Color(0xd08a5b), fogDensity: 7.6e-5,
    exposure: 1.02, cloudOpacity: 0.8, skyExposure: 1.05,
    cloudColor: new THREE.Color(0xffbd8f), cirrusOpacity: 0.32,
  },
  night: {
    sunAzEl: [1.2, -0.5],
    zenith: new THREE.Color(0x060b17), mid: new THREE.Color(0x0b1424),
    horizon: new THREE.Color(0x111c30),
    haze: new THREE.Color(0x0d1524),
    warmColor: new THREE.Color(0x000000), warmth: 0,
    sunColor: new THREE.Color(0, 0, 0), sunDisc: 1.1, sunGlow: 0,
    stars: 1.0, moon: 1.0, moonGlow: 1.0,
    sunLight: { color: new THREE.Color(0.50, 0.66, 1.0), intensity: 0.95 }, // moonlight
    hemi: { sky: new THREE.Color(0x2b3c6b), ground: new THREE.Color(0x1b2136), intensity: 0.55 },
    fogColor: new THREE.Color(0x0e1929), fogDensity: 4.4e-5,
    exposure: 1.0, cloudOpacity: 0.2, skyExposure: 1.0,
    cloudColor: new THREE.Color(0x93a2c2), cirrusOpacity: 0.12,
  },
};

function azElToDir(az, el, out) {
  out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  return out;
}

export class Weather {
  constructor({ scene, renderer, events, rng }) {
    this.scene = scene;
    this.renderer = renderer;
    this.events = events;
    this.rng = rng.fork(31);
    this.tod = 'day';
    this.time = 0;
    this._blend = 1;               // 1 = arrived at target preset
    this._from = null;

    // --- sky dome
    this.skyUniforms = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: azElToDir(2.4, 0.62, new THREE.Vector3()) },
      uZenith: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uWarmColor: { value: new THREE.Color() },
      uWarmth: { value: 0 },
      uSunDisc: { value: 0.9999 },
      uSunGlow: { value: 0.2 },
      uStars: { value: 0 },
      uMoon: { value: 0 },
      uMoonGlow: { value: 0 },
      uExposure: { value: 1 },
      uTime: { value: 0 },
    };
    const skyGeo = new THREE.SphereGeometry(16000, 48, 24);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    // image-based lighting straight from the procedural sky (huge win for
    // metals / dark materials). Regenerated when time-of-day changes.
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this._envScene = new THREE.Scene();
    this._envScene.add(new THREE.Mesh(skyGeo, skyMat));
    this._envRT = null;
    this._envTimer = 0;

    // --- lights
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260;
    sc.near = 50; sc.far = 1600;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xaebbd0, 0x8b7d64, 0.7);
    scene.add(this.hemi);

    // --- fog
    this.fog = new THREE.FogExp2(0xb9c8d2, 4.2e-5);
    scene.fog = this.fog;

    // --- clouds (billboards) — every sprite gets its own material so opacity
    // and tint can vary per puff
    this.cloudGroup = new THREE.Group();
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudSprite(5 + i), transparent: true, opacity: 0.55,
        depthWrite: false, fog: false, color: 0xffffff,
      });
      const s = new THREE.Sprite(mat);
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(1500, 9000);
      s.position.set(Math.cos(ang) * r, this.rng.range(1700, 3400), Math.sin(ang) * r);
      const w = this.rng.range(900, 2400);
      s.scale.set(w, w * 0.42, 1);
      s.userData.drift = this.rng.range(2, 7);
      s.userData.opMul = this.rng.range(0.55, 1.2);
      this.clouds.push(s);
      this.cloudGroup.add(s);
    }
    // high stretched cirrus streaks — very elongated, subtle
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this._cirrusTexture(), transparent: true, opacity: 0.2,
        depthWrite: false, fog: false, color: 0xffffff,
        rotation: this.rng.range(-0.06, 0.06),
      });
      const s = new THREE.Sprite(mat);
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(4200, 8800);
      s.position.set(Math.cos(ang) * r, this.rng.range(4300, 5600), Math.sin(ang) * r);
      const w = this.rng.range(4200, 7200);
      s.scale.set(w, w * this.rng.range(0.05, 0.08), 1);
      s.userData.drift = this.rng.range(1.2, 2.6);
      s.userData.opMul = this.rng.range(0.7, 1.1);
      s.userData.cirrus = true;
      this.clouds.push(s);
      this.cloudGroup.add(s);
    }
    scene.add(this.cloudGroup);

    // --- searchlights (night raid only): soft double-cone beams
    this.searchlights = new THREE.Group();
    this.searchlights.visible = false;
    const beamMat = (opacity) => new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        uniform float uOpacity;
        void main() {
          // tip of the cone (uv.y=1) is the ground source after PI flip
          float axial = pow(vUv.y, 1.5);
          vec3 V = normalize(cameraPosition - vPosW);
          float fres = pow(abs(dot(V, normalize(vNormalW))), 1.4); // soft silhouette
          gl_FragColor = vec4(vec3(0.75, 0.84, 1.0), axial * fres * uOpacity);
        }`,
      uniforms: { uOpacity: { value: opacity } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this._searchHeads = [];
    const positions = [[-170, -120], [150, -150], [30, 180]];
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(positions[i][0], 2, positions[i][1]);
      // cone geometry with uv.y = 0 at base; flip so beam starts at ground
      const outer = new THREE.Mesh(new THREE.ConeGeometry(42, 1600, 20, 6, true), beamMat(0.06));
      outer.rotation.x = Math.PI;
      outer.position.y = 800;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(15, 1600, 16, 6, true), beamMat(0.12));
      inner.rotation.x = Math.PI;
      inner.position.y = 800;
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xd9e6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      glow.position.y = 2;
      pivot.add(outer, inner, glow);
      // slow, stately sweep
      pivot.userData = { phase: i * 2.1, speed: 0.082 + i * 0.017 };
      this._searchHeads.push(pivot);
      this.searchlights.add(pivot);
    }
    scene.add(this.searchlights);

    this._cur = this._clonePreset(PRESETS.day);
    this._target = PRESETS.day;
    this._applyCurrent();
    this.updateEnvironment();

    events.on('scenario-start', ({ scenario }) => {
      this.searchlights.visible = (scenario === 'nightraid');
    });
    events.on('scenario-end', () => { this.searchlights.visible = false; });
  }

  /** long wispy streak texture for cirrus sprites (deterministic via this.rng) */
  _cirrusTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < 15; i++) {
      const y = 12 + this.rng.range(0, 70);
      const x0 = this.rng.range(0, 150);
      const x1 = x0 + this.rng.range(180, 360);
      const th = this.rng.range(1.5, 5.5);
      const a = this.rng.range(0.05, 0.15);
      const slope = this.rng.range(-7, 7);
      const grad = g.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.28, `rgba(255,255,255,${a.toFixed(3)})`);
      grad.addColorStop(0.62, `rgba(255,255,255,${(a * 0.8).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x0, y);
      g.quadraticCurveTo((x0 + x1) / 2, y + slope, x1, y + slope * 0.6);
      g.lineTo(x1, y + slope * 0.6 + th);
      g.quadraticCurveTo((x0 + x1) / 2, y + slope + th, x0, y + th);
      g.closePath();
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  _clonePreset(p) {
    return {
      sunAzEl: [...p.sunAzEl],
      zenith: p.zenith.clone(), mid: p.mid.clone(), horizon: p.horizon.clone(), haze: p.haze.clone(),
      warmColor: p.warmColor.clone(), warmth: p.warmth,
      sunColor: p.sunColor.clone(), sunDisc: p.sunDisc, sunGlow: p.sunGlow,
      stars: p.stars, moon: p.moon, moonGlow: p.moonGlow,
      sunLight: { color: p.sunLight.color.clone(), intensity: p.sunLight.intensity },
      hemi: { sky: p.hemi.sky.clone(), ground: p.hemi.ground.clone(), intensity: p.hemi.intensity },
      fogColor: p.fogColor.clone(), fogDensity: p.fogDensity,
      exposure: p.exposure, cloudOpacity: p.cloudOpacity, skyExposure: p.skyExposure,
      cloudColor: p.cloudColor.clone(), cirrusOpacity: p.cirrusOpacity,
    };
  }

  setTimeOfDay(tod, instant = false) {
    if (!PRESETS[tod] || tod === this.tod) { if (instant) this._blend = 1; }
    this.tod = tod;
    this._target = PRESETS[tod];
    if (instant) {
      this._cur = this._clonePreset(PRESETS[tod]);
      this._blend = 1;
      this._applyCurrent();
    } else {
      this._blend = 0;
    }
    this.events.emit('tod-changed', { tod, night: tod === 'night' });
  }

  isNight() { return this.tod === 'night'; }

  /** re-bake the PMREM environment map from the current sky */
  updateEnvironment() {
    const rt = this.pmrem.fromScene(this._envScene, 0.04, 10, 20000);
    if (this._envRT) this._envRT.dispose();
    this._envRT = rt;
    this.scene.environment = rt.texture;
  }

  /** wind vector at altitude (used by smoke) */
  getWind(alt, out) {
    const speed = WORLD.windBase * (1 + Math.min(2.2, alt / 2600)) *
      (1 + 0.25 * Math.sin(this.time * 0.23 + alt * 0.0004));
    const head = WORLD.windHeading + 0.14 * Math.sin(this.time * 0.11);
    out.set(Math.sin(head) * speed, 0, Math.cos(head) * speed);
    return out;
  }

  _applyCurrent() {
    const c = this._cur, u = this.skyUniforms;
    azElToDir(c.sunAzEl[0], c.sunAzEl[1], u.uSunDir.value).normalize();
    u.uZenith.value.copy(c.zenith);
    u.uMid.value.copy(c.mid);
    u.uHorizon.value.copy(c.horizon);
    u.uHaze.value.copy(c.haze);
    u.uWarmColor.value.copy(c.warmColor);
    u.uWarmth.value = c.warmth;
    u.uSunColor.value.copy(c.sunColor);
    u.uSunDisc.value = c.sunDisc;
    u.uSunGlow.value = c.sunGlow;
    u.uStars.value = c.stars;
    u.uMoon.value = c.moon;
    u.uMoonGlow.value = c.moonGlow;
    u.uExposure.value = c.skyExposure;

    // sun/moon light direction: at night use the moon direction
    const lightDir = c.moon > 0.5 ? this.skyUniforms.uMoonDir.value : u.uSunDir.value;
    this.sun.position.copy(lightDir).multiplyScalar(900);
    this.sun.target.position.set(0, 0, 0);
    this.sun.color.copy(c.sunLight.color);
    this.sun.intensity = c.sunLight.intensity;
    this.hemi.color.copy(c.hemi.sky);
    this.hemi.groundColor.copy(c.hemi.ground);
    this.hemi.intensity = c.hemi.intensity;
    this.fog.color.copy(c.fogColor);
    this.fog.density = c.fogDensity;
    this.renderer.toneMappingExposure = c.exposure;
    for (const cl of this.clouds) {
      const ud = cl.userData;
      cl.material.opacity = (ud.cirrus ? c.cirrusOpacity : c.cloudOpacity) * ud.opMul;
      cl.material.color.copy(c.cloudColor);
    }
  }

  update(dt) {
    this.time += dt;
    this.skyUniforms.uTime.value = this.time;

    // blend toward target preset
    if (this._blend < 1) {
      this._blend = Math.min(1, this._blend + dt / 2.2);
      const k = 1 - Math.pow(1 - this._blend, 3);
      // re-bake IBL a few times during the transition, and once at the end
      this._envTimer -= dt;
      if (this._envTimer <= 0 || this._blend >= 1) {
        this._envTimer = 0.7;
        this.updateEnvironment();
      }
      const t = this._target, c = this._cur;
      c.sunAzEl[0] += (t.sunAzEl[0] - c.sunAzEl[0]) * k;
      c.sunAzEl[1] += (t.sunAzEl[1] - c.sunAzEl[1]) * k;
      c.zenith.lerp(t.zenith, k); c.mid.lerp(t.mid, k);
      c.horizon.lerp(t.horizon, k); c.haze.lerp(t.haze, k);
      c.warmColor.lerp(t.warmColor, k);
      c.warmth += (t.warmth - c.warmth) * k;
      c.sunColor.lerp(t.sunColor, k);
      c.sunDisc += (t.sunDisc - c.sunDisc) * k;
      c.sunGlow += (t.sunGlow - c.sunGlow) * k;
      c.stars += (t.stars - c.stars) * k;
      c.moon += (t.moon - c.moon) * k;
      c.moonGlow += (t.moonGlow - c.moonGlow) * k;
      c.sunLight.color.lerp(t.sunLight.color, k);
      c.sunLight.intensity += (t.sunLight.intensity - c.sunLight.intensity) * k;
      c.hemi.sky.lerp(t.hemi.sky, k); c.hemi.ground.lerp(t.hemi.ground, k);
      c.hemi.intensity += (t.hemi.intensity - c.hemi.intensity) * k;
      c.fogColor.lerp(t.fogColor, k);
      c.fogDensity += (t.fogDensity - c.fogDensity) * k;
      c.exposure += (t.exposure - c.exposure) * k;
      c.cloudOpacity += (t.cloudOpacity - c.cloudOpacity) * k;
      c.skyExposure += (t.skyExposure - c.skyExposure) * k;
      c.cloudColor.lerp(t.cloudColor, k);
      c.cirrusOpacity += (t.cirrusOpacity - c.cirrusOpacity) * k;
      this._applyCurrent();
    }

    // drift clouds downwind
    const windHead = WORLD.windHeading;
    for (const cl of this.clouds) {
      cl.position.x += Math.sin(windHead) * cl.userData.drift * dt;
      cl.position.z += Math.cos(windHead) * cl.userData.drift * dt;
      const r = Math.hypot(cl.position.x, cl.position.z);
      if (r > 10500) {
        cl.position.x -= Math.sin(windHead) * 19000;
        cl.position.z -= Math.cos(windHead) * 19000;
      }
    }

    // searchlight sweep
    if (this.searchlights.visible) {
      for (const p of this._searchHeads) {
        const t = this.time * p.userData.speed + p.userData.phase;
        p.rotation.z = Math.sin(t) * 0.42;
        p.rotation.x = Math.cos(t * 0.77) * 0.36;
        p.rotation.y = t * 0.35;
      }
    }
  }
}
