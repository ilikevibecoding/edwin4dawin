// Sky dome, sun/moon, stars, clouds, fog, wind and time-of-day presets.
// The dome is a single shader; presets are lerped for smooth transitions.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cirrusTexture, cloudPuffTexture } from './texgen.js';

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
  uniform vec3 uZenith, uHorizon, uSunColor, uSunDir, uMoonDir;
  uniform float uStars, uTime, uSunDisk;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.58));

    // --- sun ---
    float sd = clamp(dot(dir, uSunDir), 0.0, 1.0);
    col += uSunColor * smoothstep(0.99988, 0.99997, sd) * 5.0 * uSunDisk; // disk
    col += uSunColor * pow(sd, 260.0) * 0.85 * uSunDisk;    // inner glow
    col += uSunColor * pow(sd, 24.0) * 0.22 * uSunDisk;     // mid glow
    col += uSunColor * pow(sd, 5.0) * 0.10 * uSunDisk;      // wide haze

    // --- moon ---
    float md = clamp(dot(dir, uMoonDir), 0.0, 1.0);
    float moonDisk = smoothstep(0.99988, 0.99994, md);
    // simple crater shading
    vec2 mUv = vec2(dot(dir, normalize(cross(uMoonDir, vec3(0.0,1.0,0.0)))),
                    dot(dir, normalize(cross(uMoonDir, cross(uMoonDir, vec3(0.0,1.0,0.0))))));
    float craters = 0.82 + 0.18 * sin(mUv.x * 900.0) * sin(mUv.y * 700.0);
    col += vec3(0.86, 0.9, 1.0) * moonDisk * 2.6 * craters * uStars;
    col += vec3(0.5, 0.62, 0.9) * pow(md, 180.0) * 0.5 * uStars;

    // --- stars ---
    if (uStars > 0.01 && dir.y > 0.02) {
      vec2 sp = dir.xz / (dir.y + 0.42);
      vec2 cell = floor(sp * 160.0);
      float hs = hash21(cell);
      if (hs > 0.978) {
        vec2 fp = fract(sp * 160.0) - 0.5;
        float star = smoothstep(0.16, 0.0, length(fp));
        float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 4.0) + hs * 40.0);
        float mag = (hs - 0.978) / 0.022;
        col += vec3(0.8, 0.86, 1.0) * star * tw * mag * 2.6 * uStars * smoothstep(0.02, 0.16, dir.y);
      }
    }

    // horizon haze
    col = mix(col, uHorizon, pow(1.0 - h, 3.2) * 0.5);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PRESETS = {
  day: {
    sunAz: 52, sunEl: 46,
    sunColor: new THREE.Color(1.0, 0.95, 0.86), sunIntensity: 3.1,
    hemiSky: new THREE.Color(0.68, 0.78, 0.92), hemiGround: new THREE.Color(0.62, 0.52, 0.4), hemiIntensity: 0.85,
    zenith: new THREE.Color(0.14, 0.32, 0.68), horizon: new THREE.Color(0.72, 0.8, 0.88),
    fog: new THREE.Color(0.74, 0.8, 0.87), fogDensity: 0.000075,
    exposure: 1.02, bloom: 0.32, stars: 0, sunDisk: 1,
    cloudOpacity: 0.75, cloudTint: new THREE.Color(1, 1, 1),
    wind: 2.6, envIntensity: 0.5,
    trailTint: new THREE.Color(0.93, 0.91, 0.87),
  },
  sunset: {
    sunAz: 258, sunEl: 6.5,
    sunColor: new THREE.Color(1.0, 0.52, 0.22), sunIntensity: 2.3,
    hemiSky: new THREE.Color(0.55, 0.42, 0.5), hemiGround: new THREE.Color(0.42, 0.3, 0.24), hemiIntensity: 0.55,
    zenith: new THREE.Color(0.12, 0.15, 0.34), horizon: new THREE.Color(0.98, 0.5, 0.24),
    fog: new THREE.Color(0.85, 0.55, 0.35), fogDensity: 0.00009,
    exposure: 1.06, bloom: 0.48, stars: 0.1, sunDisk: 1,
    cloudOpacity: 0.8, cloudTint: new THREE.Color(1.0, 0.6, 0.42),
    wind: 1.9, envIntensity: 0.34,
    trailTint: new THREE.Color(0.98, 0.7, 0.5),
  },
  night: {
    sunAz: 128, sunEl: 54, // this is the MOON position at night
    sunColor: new THREE.Color(0.62, 0.72, 0.95), sunIntensity: 0.42,
    hemiSky: new THREE.Color(0.1, 0.14, 0.24), hemiGround: new THREE.Color(0.07, 0.06, 0.06), hemiIntensity: 0.3,
    zenith: new THREE.Color(0.008, 0.014, 0.035), horizon: new THREE.Color(0.035, 0.05, 0.09),
    fog: new THREE.Color(0.028, 0.04, 0.065), fogDensity: 0.0001,
    exposure: 1.1, bloom: 0.6, stars: 1, sunDisk: 0,
    cloudOpacity: 0.16, cloudTint: new THREE.Color(0.5, 0.58, 0.75),
    wind: 1.3, envIntensity: 0.06,
    trailTint: new THREE.Color(0.3, 0.36, 0.5),
  },
};

function azElToDir(azDeg, elDeg, out) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  return out;
}

export class Weather {
  constructor(ctx) {
    this.ctx = ctx;
    const { scene } = ctx;
    this.presetName = 'day';
    this.cur = this._clonePreset(PRESETS.day);
    this.target = this._clonePreset(PRESETS.day);
    this.blend = 1;
    this.blendSpeed = 1 / 2.4;
    this.time = 0;
    this.nightFactor = 0;
    this.wind = new THREE.Vector3(1, 0, 0.35).normalize().multiplyScalar(2.6);

    // ---- lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sh = this.sun.shadow;
    sh.mapSize.set(2048, 2048);
    sh.camera.left = -190; sh.camera.right = 190;
    sh.camera.top = 190; sh.camera.bottom = -190;
    sh.camera.near = 50; sh.camera.far = 1800;
    sh.bias = -0.0006; sh.normalBias = 0.35;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbdd7f2, 0xb0987a, 0.85);
    scene.add(this.hemi);

    // neutral environment map so metals/roughness read correctly
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    // ---- sky dome
    this.skyUniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uSunDisk: { value: 1 },
    };
    const skyGeo = new THREE.SphereGeometry(9000, 40, 24);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: this.skyUniforms, side: THREE.BackSide,
      depthWrite: false, fog: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.renderOrder = -100;
    this.skyMesh.frustumCulled = false;
    scene.add(this.skyMesh);

    scene.fog = new THREE.FogExp2(0xc7d3e0, 0.000075);

    this._buildClouds(scene);
    this._applyLerp(); // initialize
  }

  _clonePreset(p) {
    const c = {};
    for (const k in p) c[k] = p[k] instanceof THREE.Color ? p[k].clone() : p[k];
    return c;
  }

  _buildClouds(scene) {
    // cirrus band
    const cirGeo = new THREE.SphereGeometry(8200, 32, 10, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.26);
    const cirTex = cirrusTexture();
    cirTex.repeat.set(4, 1);
    this.cirrusMat = new THREE.MeshBasicMaterial({
      map: cirTex, transparent: true, opacity: 0.4, depthWrite: false, fog: false,
      side: THREE.BackSide, color: 0xffffff,
    });
    this.cirrus = new THREE.Mesh(cirGeo, this.cirrusMat);
    this.cirrus.renderOrder = -90;
    scene.add(this.cirrus);

    // puffy cumulus billboards (instanced quad shader)
    const COUNT = 34;
    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index; geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    const offsets = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT * 2);
    const alphas = new Float32Array(COUNT);
    let i3 = 0, i2 = 0;
    // clusters of puffs
    const rng = () => Math.random();
    let n = 0;
    while (n < COUNT) {
      const cx = (rng() - 0.5) * 9000, cz = (rng() - 0.5) * 9000;
      if (Math.hypot(cx, cz) < 1500) continue;
      const cy = 1500 + rng() * 1400;
      const puffs = 1 + Math.floor(rng() * 3);
      for (let p = 0; p < puffs && n < COUNT; p++, n++) {
        offsets[i3++] = cx + (rng() - 0.5) * 700;
        offsets[i3++] = cy + (rng() - 0.5) * 160;
        offsets[i3++] = cz + (rng() - 0.5) * 700;
        const s = 420 + rng() * 620;
        scales[i2++] = s; scales[i2++] = s * (0.32 + rng() * 0.18);
        alphas[n] = 0.45 + rng() * 0.4;
      }
    }
    geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(scales, 2));
    geo.setAttribute('iAlpha', new THREE.InstancedBufferAttribute(alphas, 1));
    geo.instanceCount = COUNT;
    this.cloudUniforms = {
      uMap: { value: cloudPuffTexture() },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: 0.75 },
      uDrift: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms,
      transparent: true, depthWrite: false, fog: false,
      vertexShader: /* glsl */`
        attribute vec3 iOffset; attribute vec2 iScale; attribute float iAlpha;
        varying vec2 vUv; varying float vAlpha;
        uniform float uDrift;
        void main() {
          vUv = uv; vAlpha = iAlpha;
          vec3 wp = iOffset; wp.x += uDrift;
          vec4 mv = modelViewMatrix * vec4(wp, 1.0);
          mv.xy += (uv - 0.5) * iScale;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv; varying float vAlpha;
        uniform sampler2D uMap; uniform vec3 uTint; uniform float uOpacity;
        void main() {
          float a = texture2D(uMap, vUv).a;
          gl_FragColor = vec4(uTint, a * vAlpha * uOpacity);
          if (gl_FragColor.a < 0.004) discard;
        }
      `,
    });
    this.clouds = new THREE.Mesh(geo, mat);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -80;
    scene.add(this.clouds);
  }

  setPreset(name, instant = false) {
    if (!PRESETS[name]) return;
    this.presetName = name;
    // snapshot current interpolated state as the new blend source
    this.cur = this._snapshot();
    this.target = this._clonePreset(PRESETS[name]);
    this.blend = instant ? 1 : 0;
    if (instant) this._applyLerp();
    this.ctx.bus.emit('weather:preset', name);
  }

  _snapshot() {
    const s = {};
    const a = this.cur, b = this.target, t = this.blend;
    for (const k in a) {
      if (a[k] instanceof THREE.Color) s[k] = a[k].clone().lerp(b[k], t);
      else s[k] = a[k] + (b[k] - a[k]) * t;
    }
    return s;
  }

  _applyLerp() {
    const a = this.cur, b = this.target, t = THREE.MathUtils.smoothstep(this.blend, 0, 1);
    const lerpC = (ka) => a[ka].clone().lerp(b[ka], t);
    const lerpN = (ka) => a[ka] + (b[ka] - a[ka]) * t;

    const sunDir = azElToDir(lerpN('sunAz'), lerpN('sunEl'), new THREE.Vector3());
    const sunColor = lerpC('sunColor');
    this.sun.color.copy(sunColor);
    this.sun.intensity = lerpN('sunIntensity');
    this.sun.position.copy(sunDir).multiplyScalar(700);
    this.sun.target.position.set(0, 0, 0);
    this.hemi.color.copy(lerpC('hemiSky'));
    this.hemi.groundColor.copy(lerpC('hemiGround'));
    this.hemi.intensity = lerpN('hemiIntensity');

    const u = this.skyUniforms;
    u.uZenith.value.copy(lerpC('zenith'));
    u.uHorizon.value.copy(lerpC('horizon'));
    u.uSunColor.value.copy(sunColor);
    u.uSunDisk.value = lerpN('sunDisk');
    u.uStars.value = lerpN('stars');
    // at night the "sun" light is the moon; sky shows moon disk at same spot
    u.uSunDir.value.copy(sunDir);
    u.uMoonDir.value.copy(sunDir);

    const fog = this.ctx.scene.fog;
    fog.color.copy(lerpC('fog'));
    fog.density = lerpN('fogDensity');

    this.exposure = lerpN('exposure');
    this.bloom = lerpN('bloom');
    this.nightFactor = lerpN('stars');
    this.sunDir = sunDir;
    this.ctx.scene.environmentIntensity = lerpN('envIntensity');
    this.trailTint = lerpC('trailTint');

    this.cloudUniforms.uOpacity.value = lerpN('cloudOpacity');
    this.cloudUniforms.uTint.value.copy(lerpC('cloudTint'));
    this.cirrusMat.opacity = lerpN('cloudOpacity') * 0.35;
    this.cirrusMat.color.copy(lerpC('cloudTint'));

    const windSpd = lerpN('wind');
    this.wind.set(1, 0, 0.35).normalize().multiplyScalar(windSpd);
  }

  update(dt) {
    this.time += dt;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * this.blendSpeed);
      this._applyLerp();
    }
    this.skyUniforms.uTime.value = this.time;
    this.cloudUniforms.uDrift.value = (this.time * this.wind.length() * 4) % 18000;
    this.cirrus.rotation.y = this.time * 0.0016;
  }
}
