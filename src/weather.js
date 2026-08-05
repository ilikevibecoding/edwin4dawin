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
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSunColor;
  uniform float uSunDisc;      // disc sharpness
  uniform float uSunGlow;
  uniform float uStars;        // 0..1
  uniform float uMoon;         // 0..1
  uniform float uExposure;
  uniform float uTime;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.08, 1.0);
    float t = pow(1.0 - max(h, 0.0), 2.6);
    vec3 col = mix(uZenith, uHorizon, t);
    // low haze band hugging the horizon
    float hazeBand = smoothstep(0.16, 0.0, abs(d.y - 0.015));
    col = mix(col, uHaze, hazeBand * 0.55);

    // sun
    float sd = dot(d, uSunDir);
    float disc = smoothstep(uSunDisc, uSunDisc + 0.0006, sd);
    float glow = pow(clamp(sd, 0.0, 1.0), 6.0) * uSunGlow;
    col += uSunColor * (disc * 3.2 + glow);

    // moon
    if (uMoon > 0.001) {
      float md = dot(d, uMoonDir);
      float mdisc = smoothstep(0.99978, 0.99987, md);
      float mglow = pow(clamp(md, 0.0, 1.0), 24.0) * 0.10;
      float mottling = 0.82 + 0.18 * hash13(floor(d * 900.0));
      col += vec3(0.86, 0.9, 1.0) * (mdisc * 1.5 * mottling + mglow) * uMoon;
    }

    // stars — hash grid, fade near horizon, gentle twinkle
    if (uStars > 0.001 && d.y > 0.0) {
      vec3 sp = d * 340.0;
      vec3 cell = floor(sp);
      float star = step(0.9975, hash13(cell));
      float tw = 0.72 + 0.28 * sin(uTime * (1.5 + hash13(cell + 7.0) * 3.0) + hash13(cell + 3.0) * 40.0);
      float mag = hash13(cell + 11.0);
      col += vec3(0.9, 0.93, 1.0) * star * uStars * tw * (0.35 + mag * 1.1) * smoothstep(0.0, 0.16, d.y);
    }

    // dither to kill gradient banding
    col += (hash13(vec3(gl_FragCoord.xy, 1.7)) - 0.5) * 0.004;

    gl_FragColor = vec4(col * uExposure, 1.0);
  }
`;

const PRESETS = {
  day: {
    sunAzEl: [0.65, 0.78],           // azimuth, elevation (radians)
    zenith: new THREE.Color(0x2c5f9e), horizon: new THREE.Color(0xb8cfdd),
    haze: new THREE.Color(0xcfd7cf),
    sunColor: new THREE.Color(1.0, 0.96, 0.88), sunDisc: 0.99992, sunGlow: 0.20,
    stars: 0, moon: 0,
    sunLight: { color: new THREE.Color(1.0, 0.96, 0.9), intensity: 2.4 },
    hemi: { sky: new THREE.Color(0x9db8d6), ground: new THREE.Color(0x8b7d64), intensity: 0.62 },
    fogColor: new THREE.Color(0xb9c8d2), fogDensity: 4.2e-5,
    exposure: 1.0, cloudOpacity: 0.55, skyExposure: 1.0,
  },
  sunset: {
    sunAzEl: [4.45, 0.085],
    zenith: new THREE.Color(0x35386e), horizon: new THREE.Color(0xf2814d),
    haze: new THREE.Color(0xd98a56),
    sunColor: new THREE.Color(1.0, 0.62, 0.34), sunDisc: 0.99973, sunGlow: 0.52,
    stars: 0.12, moon: 0,
    sunLight: { color: new THREE.Color(1.0, 0.62, 0.4), intensity: 2.0 },
    hemi: { sky: new THREE.Color(0x8a6f96), ground: new THREE.Color(0x6e5a48), intensity: 0.5 },
    fogColor: new THREE.Color(0xc98a63), fogDensity: 5.4e-5,
    exposure: 1.02, cloudOpacity: 0.75, skyExposure: 1.05,
  },
  night: {
    sunAzEl: [1.2, -0.5],
    zenith: new THREE.Color(0x050912), horizon: new THREE.Color(0x0d1626),
    haze: new THREE.Color(0x0b1220),
    sunColor: new THREE.Color(0, 0, 0), sunDisc: 1.1, sunGlow: 0,
    stars: 1.0, moon: 1.0,
    sunLight: { color: new THREE.Color(0.62, 0.72, 1.0), intensity: 0.34 }, // moonlight
    hemi: { sky: new THREE.Color(0x1b2436), ground: new THREE.Color(0x11131a), intensity: 0.32 },
    fogColor: new THREE.Color(0x070c16), fogDensity: 3.6e-5,
    exposure: 1.0, cloudOpacity: 0.16, skyExposure: 1.0,
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
      uHorizon: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDisc: { value: 0.9999 },
      uSunGlow: { value: 0.2 },
      uStars: { value: 0 },
      uMoon: { value: 0 },
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

    // --- clouds (billboards)
    this.cloudGroup = new THREE.Group();
    const cmat = new THREE.SpriteMaterial({
      map: cloudSprite(5), transparent: true, opacity: 0.55,
      depthWrite: false, fog: false, color: 0xffffff,
    });
    this.cloudMat = cmat;
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(i % 2 ? cmat : cmat.clone());
      if (s.material !== cmat) s.material.map = cloudSprite(9 + i);
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(1500, 9000);
      s.position.set(Math.cos(ang) * r, this.rng.range(1700, 3400), Math.sin(ang) * r);
      const w = this.rng.range(900, 2400);
      s.scale.set(w, w * 0.42, 1);
      s.userData.drift = this.rng.range(2, 7);
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
      const outer = new THREE.Mesh(new THREE.ConeGeometry(42, 1600, 20, 6, true), beamMat(0.05));
      outer.rotation.x = Math.PI;
      outer.position.y = 800;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(15, 1600, 16, 6, true), beamMat(0.1));
      inner.rotation.x = Math.PI;
      inner.position.y = 800;
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xd9e6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      glow.position.y = 2;
      pivot.add(outer, inner, glow);
      pivot.userData = { phase: i * 2.1, speed: 0.11 + i * 0.023 };
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

  _clonePreset(p) {
    return {
      sunAzEl: [...p.sunAzEl],
      zenith: p.zenith.clone(), horizon: p.horizon.clone(), haze: p.haze.clone(),
      sunColor: p.sunColor.clone(), sunDisc: p.sunDisc, sunGlow: p.sunGlow,
      stars: p.stars, moon: p.moon,
      sunLight: { color: p.sunLight.color.clone(), intensity: p.sunLight.intensity },
      hemi: { sky: p.hemi.sky.clone(), ground: p.hemi.ground.clone(), intensity: p.hemi.intensity },
      fogColor: p.fogColor.clone(), fogDensity: p.fogDensity,
      exposure: p.exposure, cloudOpacity: p.cloudOpacity, skyExposure: p.skyExposure,
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
    u.uHorizon.value.copy(c.horizon);
    u.uHaze.value.copy(c.haze);
    u.uSunColor.value.copy(c.sunColor);
    u.uSunDisc.value = c.sunDisc;
    u.uSunGlow.value = c.sunGlow;
    u.uStars.value = c.stars;
    u.uMoon.value = c.moon;
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
    this.cloudMat.opacity = c.cloudOpacity;
    for (const cl of this.clouds) if (cl.material !== this.cloudMat) cl.material.opacity = c.cloudOpacity;
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
      c.zenith.lerp(t.zenith, k); c.horizon.lerp(t.horizon, k); c.haze.lerp(t.haze, k);
      c.sunColor.lerp(t.sunColor, k);
      c.sunDisc += (t.sunDisc - c.sunDisc) * k;
      c.sunGlow += (t.sunGlow - c.sunGlow) * k;
      c.stars += (t.stars - c.stars) * k;
      c.moon += (t.moon - c.moon) * k;
      c.sunLight.color.lerp(t.sunLight.color, k);
      c.sunLight.intensity += (t.sunLight.intensity - c.sunLight.intensity) * k;
      c.hemi.sky.lerp(t.hemi.sky, k); c.hemi.ground.lerp(t.hemi.ground, k);
      c.hemi.intensity += (t.hemi.intensity - c.hemi.intensity) * k;
      c.fogColor.lerp(t.fogColor, k);
      c.fogDensity += (t.fogDensity - c.fogDensity) * k;
      c.exposure += (t.exposure - c.exposure) * k;
      c.cloudOpacity += (t.cloudOpacity - c.cloudOpacity) * k;
      c.skyExposure += (t.skyExposure - c.skyExposure) * k;
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
