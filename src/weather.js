// Sky, sun, atmosphere, night lighting and environment reflections.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export const CONDITIONS = {
  day: {
    id: 'day',
    name: 'DAY',
    sunElevation: 52,
    sunAzimuth: 336,
    turbidity: 3.0,
    rayleigh: 1.25,
    mieCoefficient: 0.0035,
    mieDirectionalG: 0.72,
    sunIntensity: 3.6,
    sunColor: 0xfff2df,
    ambientIntensity: 0.5,
    ambientSky: 0x9dbee8,
    ambientGround: 0x8a7048,
    fogColor: 0xb9beb4,
    fogDensity: 0.000030,
    exposure: 0.5,
    envIntensity: 0.17,
    stars: 0,
    bloomStrength: 0.42,
    bloomThreshold: 0.80,
    grain: 0.035,
    vignette: 0.32,
    smokeLight: [0.94, 0.93, 0.92],
    smokeShadow: [0.46, 0.5, 0.58],
    floodlights: false,
  },
  sunset: {
    id: 'sunset',
    name: 'SUNSET',
    sunElevation: 3.6,
    sunAzimuth: 272,
    turbidity: 7.5,
    rayleigh: 2.3,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.86,
    sunIntensity: 3.4,
    sunColor: 0xff9a48,
    ambientIntensity: 0.4,
    ambientSky: 0xe6905c,
    ambientGround: 0x3d3020,
    fogColor: 0xa8794f,
    fogDensity: 0.000042,
    exposure: 0.58,
    envIntensity: 0.18,
    stars: 0.18,
    bloomStrength: 0.6,
    bloomThreshold: 0.7,
    grain: 0.045,
    vignette: 0.4,
    smokeLight: [1.0, 0.78, 0.6],
    smokeShadow: [0.36, 0.3, 0.34],
    floodlights: true,
  },
  night: {
    id: 'night',
    name: 'NIGHT',
    sunElevation: -11.0,
    sunAzimuth: 300,
    turbidity: 5.0,
    rayleigh: 0.55,
    mieCoefficient: 0.0035,
    mieDirectionalG: 0.8,
    sunIntensity: 0.45,
    sunColor: 0x9db4d8,
    ambientIntensity: 0.17,
    ambientSky: 0x18243c,
    ambientGround: 0x0d1016,
    fogColor: 0x0a1018,
    fogDensity: 0.000034,
    exposure: 0.95,
    envIntensity: 0.03,
    stars: 1,
    bloomStrength: 0.85,
    bloomThreshold: 0.5,
    grain: 0.075,
    vignette: 0.5,
    smokeLight: [0.5, 0.56, 0.68],
    smokeShadow: [0.16, 0.19, 0.26],
    floodlights: true,
  },
};

export class Weather {
  constructor(scene, renderer, rng) {
    this.scene = scene;
    this.renderer = renderer;
    this.rng = rng;
    this.current = CONDITIONS.day;

    this.sky = new Sky();
    this.sky.scale.setScalar(200000);
    this.sky.material.uniforms.up.value.set(0, 1, 0);
    scene.add(this.sky);

    this.sunPosition = new THREE.Vector3();
    this.sun = new THREE.DirectionalLight(0xfff3df, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.near = 1;
    cam.far = 620;
    cam.left = -95;
    cam.right = 95;
    cam.top = 95;
    cam.bottom = -95;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd6f2, 0xa08a63, 0.6);
    scene.add(this.hemi);

    // a soft fill from the opposite side keeps launcher detail readable
    this.fill = new THREE.DirectionalLight(0x9fb6d0, 0.35);
    this.fill.position.set(-60, 40, 60);
    scene.add(this.fill);

    this.scene.fog = new THREE.FogExp2(0xb9c8d6, 0.000072);

    this._buildStars();
    this._buildMoon();

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(20000);
    this.envScene.add(this.envSky);
    this.envRT = null;

    this.transition = null;
  }

  _buildStars() {
    const COUNT = 3500;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const size = new Float32Array(COUNT);
    const R = 120000;
    for (let i = 0; i < COUNT; i++) {
      // upper hemisphere, denser near the horizon band for a milky-way feel
      const u = this.rng.float();
      const v = Math.pow(this.rng.float(), 0.65);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      pos[i * 3] = x * R;
      pos[i * 3 + 1] = Math.abs(y) * R * 0.9 + 400;
      pos[i * 3 + 2] = z * R;
      const warm = this.rng.float();
      const b = 0.55 + Math.pow(this.rng.float(), 3) * 0.45;
      col[i * 3] = b * (0.85 + warm * 0.15);
      col[i * 3 + 1] = b * (0.88 + warm * 0.08);
      col[i * 3 + 2] = b * (1.0 - warm * 0.12);
      size[i] = 380 + Math.pow(this.rng.float(), 4) * 1900;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */`
        attribute float aSize;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * 0.006;
          vTwinkle = 0.75 + 0.25 * sin(uTime * 2.3 + position.x * 0.0007 + position.z * 0.0011);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uOpacity;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          float a = smoothstep(0.5, 0.06, r);
          gl_FragColor = vec4(vColor * vTwinkle, a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      fog: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -1;
    this.scene.add(this.stars);
  }

  _buildMoon() {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: 0xdfe6f2, transparent: true, opacity: 0, fog: false, toneMapped: false }),
    );
    // subtle maria so it is not a flat white dot
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.82, '#e8ecf4');
    grd.addColorStop(1, '#c9d2e0');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const x = 20 + Math.random() * 88;
      const y = 20 + Math.random() * 88;
      if (Math.hypot(x - 64, y - 64) > 56) continue;
      ctx.fillStyle = `rgba(180,190,206,${0.1 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    disc.material.map = tex;
    disc.scale.setScalar(1300);
    g.add(disc);
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({
        color: 0x9fb4d8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false, toneMapped: false,
      }),
    );
    halo.scale.setScalar(5200);
    halo.position.z = -10;
    g.add(halo);
    this.moon = g;
    this.moonDisc = disc;
    this.moonHalo = halo;
    this.scene.add(g);
  }

  /** Apply a condition preset. `blend` seconds > 0 cross-fades the lighting. */
  setCondition(id, blend = 0) {
    const target = CONDITIONS[id] || CONDITIONS.day;
    if (blend > 0 && this.current !== target) {
      this.transition = { from: { ...this.current }, to: target, t: 0, dur: blend };
    } else {
      this.transition = null;
      this._apply(target);
    }
    this.current = target;
    this._updateEnvironment(target);
    return target;
  }

  _apply(c) {
    const u = this.sky.material.uniforms;
    u.turbidity.value = c.turbidity;
    u.rayleigh.value = c.rayleigh;
    u.mieCoefficient.value = c.mieCoefficient;
    u.mieDirectionalG.value = c.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - c.sunElevation);
    const theta = THREE.MathUtils.degToRad(c.sunAzimuth);
    this.sunPosition.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(this.sunPosition);

    this.sun.position.copy(this.sunPosition).multiplyScalar(400);
    this.sun.color.set(c.sunColor);
    this.sun.intensity = c.sunIntensity;
    this.hemi.color.set(c.ambientSky);
    this.hemi.groundColor.set(c.ambientGround);
    this.hemi.intensity = c.ambientIntensity;
    this.fill.intensity = c.id === 'night' ? 0.12 : 0.5;
    this.fill.color.set(c.id === 'night' ? 0x5a6f92 : 0x9fb6d0);

    this.scene.fog.color.set(c.fogColor);
    this.scene.fog.density = c.fogDensity;
    this.renderer.toneMappingExposure = c.exposure;

    this.stars.material.uniforms.uOpacity.value = c.stars;
    const moonVisible = c.stars > 0.4;
    this.moonDisc.material.opacity = moonVisible ? 1 : c.stars * 0.4;
    this.moonHalo.material.opacity = moonVisible ? 0.28 : 0.0;
    // park the moon opposite the sun so night scenes have a directional key
    const mphi = THREE.MathUtils.degToRad(90 - 34);
    const mtheta = THREE.MathUtils.degToRad(c.sunAzimuth + 168);
    const mp = new THREE.Vector3().setFromSphericalCoords(90000, mphi, mtheta);
    this.moon.position.copy(mp);
    this.moon.lookAt(0, 0, 0);
    if (c.id === 'night') {
      // moonlight becomes the key light at night
      this.sun.position.copy(mp).normalize().multiplyScalar(400);
      this.sun.color.set(0xa8c0e8);
      this.moonDirection = mp.clone().normalize();
    } else {
      this.moonDirection = null;
    }
    this.applied = c;
  }

  _updateEnvironment(c) {
    const u = this.envSky.material.uniforms;
    u.turbidity.value = c.turbidity;
    u.rayleigh.value = c.rayleigh;
    u.mieCoefficient.value = c.mieCoefficient;
    u.mieDirectionalG.value = c.mieDirectionalG;
    u.sunPosition.value.copy(this.sunPosition);
    if (u.showSunDisc) u.showSunDisc.value = false;
    if (this.envRT) this.envRT.dispose();
    try {
      this.envRT = this.pmrem.fromScene(this.envScene, 0.04);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = c.envIntensity ?? 0.34;
    } catch (e) {
      // environment reflections are a nicety; never let them break the frame
      this.scene.environment = null;
    }
  }

  /** Keep the shadow frustum tight around the player for crisp contact shadows. */
  followPlayer(pos) {
    const dir = this.moonDirection || this.sunPosition;
    const d = dir.clone().multiplyScalar(300);
    this.sun.position.set(pos.x + d.x, d.y, pos.z + d.z);
    this.sun.target.position.set(pos.x, 0, pos.z);
    this.sun.target.updateMatrixWorld();
    this.moon.position.set(
      pos.x + this.moon.position.x - (this._lastMoonAnchor?.x ?? 0),
      this.moon.position.y,
      pos.z + this.moon.position.z - (this._lastMoonAnchor?.z ?? 0),
    );
    this._lastMoonAnchor = { x: pos.x, z: pos.z };
  }

  update(dt, elapsed, playerPos) {
    this.stars.material.uniforms.uTime.value = elapsed;
    if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      const e = k * k * (3 - 2 * k);
      const lerpC = {};
      for (const key of Object.keys(tr.to)) {
        const a = tr.from[key];
        const b = tr.to[key];
        lerpC[key] = typeof a === 'number' && typeof b === 'number' ? a + (b - a) * e : b;
      }
      lerpC.id = tr.to.id;
      this._apply(lerpC);
      if (k >= 1) this.transition = null;
    }
    if (playerPos) {
      this.sky.position.set(playerPos.x, 0, playerPos.z);
      this.stars.position.set(playerPos.x, 0, playerPos.z);
      this.followPlayer(playerPos);
    }
  }

  get sunDirection() {
    return this.sunPosition;
  }
}
