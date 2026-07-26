import * as THREE from 'three';
import { ROOMS, FLOOR_Y, roomById } from './layout.js';
import { PALETTE, ZONES } from '../art/palette.js';
import * as KIT from './kit.js';
import { plainMaterial, emissivePanel } from '../art/materials.js';
import { settings } from '../core/settings.js';
import { assets } from '../core/assets.js';
import { Rng } from '../core/rng.js';

// ---------------------------------------------------------------------------
// Lighting plan.  (owner: fable1 art direction / fable2 placement)
//
// The scene is lit by one shadow-casting sun through the north glazing, a
// hemisphere fill tuned to snow bounce, and a pool of local fixtures. Only the
// N nearest local lights are enabled each frame (N from the quality preset) so
// the fixture count can be generous without the shader cost exploding. Every
// fixture also has emissive geometry, so a culled light still reads as lit.
// ---------------------------------------------------------------------------

/** @typedef {{id:string, type:string, pos:[number,number,number], color:number,
 *             intensity:number, distance:number, room:string, decay?:number,
 *             priority?:number, flicker?:number}} LightSpec */

export const LIGHT_SCENARIOS = {
  default: { name: 'Default (storm daylight)', sun: 1.0, ambient: 1.0, fixtures: 1.0 },
  neutral: { name: 'Neutral inspection', sun: 0.35, ambient: 3.2, fixtures: 0.4 },
  blackout: { name: 'Blackout (emergency only)', sun: 0.55, ambient: 0.35, fixtures: 0.0, emergency: 2.2 },
  night: { name: 'Night', sun: 0.06, ambient: 0.3, fixtures: 1.15 },
  overcast: { name: 'Heavy overcast', sun: 0.45, ambient: 0.8, fixtures: 1.25 },
};

export class LightingRig {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.rng = new Rng('northstar-lighting');
    /** @type {LightSpec[]} */
    this.specs = [];
    /** @type {Map<string, THREE.PointLight>} */
    this.pool = new Map();
    this.fixtureGroup = new THREE.Group();
    this.fixtureGroup.name = 'light-fixtures';
    scene.add(this.fixtureGroup);
    this.scenario = 'default';
    this._time = 0;
    this.emissiveMaterials = [];
    this.build();
  }

  build() {
    this.buildSky();
    this.buildFixtures();
    this.buildPool();
  }

  buildSky() {
    const scene = this.scene;
    // Storm sky: a gradient dome rather than a flat clear colour.
    const skyGeo = new THREE.SphereGeometry(180, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyZenith) },
        bottom: { value: new THREE.Color(PALETTE.skyHorizon) },
        offset: { value: 24 },
        exponent: { value: 0.9 },
      },
      vertexShader: `varying vec3 vWorld;
        void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float offset; uniform float exponent;
        varying vec3 vWorld;
        void main(){ float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
        float t = pow(max(h,0.0), exponent);
        gl_FragColor = vec4(mix(bottom, top, t), 1.0); }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // Blizzard fog: strong enough to hide the world edge, light enough to see.
    scene.fog = new THREE.FogExp2(PALETTE.fogSnow, 0.0125);

    this.hemi = new THREE.HemisphereLight(PALETTE.daylightKey, PALETTE.snowBounce, 0.55);
    this.hemi.position.set(0, 20, 0);
    scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0x8fa4b8, 0.42);
    scene.add(this.ambient);

    // Low winter sun raking in from the north-west through the lobby glazing.
    this.sun = new THREE.DirectionalLight(PALETTE.daylightCold, 2.1);
    this.sun.position.set(-26, 22, -34);
    this.sun.target.position.set(2, 0, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(settings.quality.shadowMapSize, settings.quality.shadowMapSize);
    this.sun.shadow.camera.left = -46;
    this.sun.shadow.camera.right = 46;
    this.sun.shadow.camera.top = 46;
    this.sun.shadow.camera.bottom = -46;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  addSpec(spec) {
    this.specs.push({ decay: 1.6, priority: 1, ...spec });
    return this.specs[this.specs.length - 1];
  }

  buildFixtures() {
    const troffer = (x, z, y, room, tint, intensity) => {
      const g = new THREE.Group();
      const housing = KIT.mesh(KIT.bevelBox(1.22, 0.07, 0.62, 0.006), plainMaterial(0xe6e6e0, { roughness: 0.5, metalness: 0.3 }, 'troffer'), { cast: false });
      g.add(housing);
      const diffMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, emissive: tint, emissiveIntensity: 2.4, roughness: 0.7, metalness: 0,
      });
      this.emissiveMaterials.push({ mat: diffMat, base: 2.4, kind: 'fluorescent' });
      const diffuser = KIT.mesh(KIT.box(1.14, 0.02, 0.54), diffMat, { cast: false, receive: false });
      diffuser.position.y = -0.045;
      g.add(diffuser);
      g.position.set(x, y, z);
      this.fixtureGroup.add(g);
      assets.tag(g, 'LIGHT-TROFFER');
      this.addSpec({
        id: `troffer-${room}-${x.toFixed(1)}-${z.toFixed(1)}`, type: 'fluorescent',
        pos: [x, y - 0.1, z], color: tint, intensity, distance: 8.5, room, priority: 2,
      });
      return g;
    };

    const downlight = (x, z, y, room, tint, intensity, dist = 6) => {
      const g = new THREE.Group();
      const can = KIT.mesh(KIT.cyl(0.11, 0.13, 0.05, 14), plainMaterial(0xdedcd6, { roughness: 0.4, metalness: 0.4 }, 'canlight'), { cast: false });
      g.add(can);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: tint, emissiveIntensity: 3.4, roughness: 0.5 });
      this.emissiveMaterials.push({ mat: lensMat, base: 3.4, kind: 'downlight' });
      const lens = KIT.mesh(KIT.cyl(0.095, 0.095, 0.012, 14), lensMat, { cast: false, receive: false });
      lens.position.y = -0.03;
      g.add(lens);
      g.position.set(x, y, z);
      this.fixtureGroup.add(g);
      assets.tag(g, 'LIGHT-DOWNLIGHT');
      this.addSpec({ id: `dl-${room}-${x.toFixed(1)}-${z.toFixed(1)}`, type: 'downlight', pos: [x, y - 0.06, z], color: tint, intensity, distance: dist, room, priority: 2 });
      return g;
    };

    const stripLight = (x, z, y, room, tint, intensity, len = 1.4) => {
      const g = new THREE.Group();
      const body = KIT.mesh(KIT.bevelBox(len, 0.07, 0.09, 0.005), plainMaterial(0xcfcfca, { roughness: 0.45, metalness: 0.5 }, 'strip'), { cast: false });
      g.add(body);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x161616, emissive: tint, emissiveIntensity: 3.0, roughness: 0.6 });
      this.emissiveMaterials.push({ mat: tubeMat, base: 3.0, kind: 'fluorescent' });
      const tube = KIT.mesh(KIT.cyl(0.026, 0.026, len - 0.12, 10), tubeMat, { cast: false, receive: false });
      tube.rotation.z = Math.PI / 2;
      tube.position.y = -0.05;
      g.add(tube);
      g.position.set(x, y, z);
      this.fixtureGroup.add(g);
      assets.tag(g, 'LIGHT-STRIP');
      this.addSpec({ id: `sl-${room}-${x.toFixed(1)}-${z.toFixed(1)}`, type: 'fluorescent', pos: [x, y - 0.1, z], color: tint, intensity, distance: 7, room, priority: 1 });
      return g;
    };

    const emergency = (x, z, y, room, rotY = 0) => {
      const g = new THREE.Group();
      const body = KIT.mesh(KIT.bevelBox(0.26, 0.11, 0.1, 0.006), plainMaterial(0xd8d5cc, { roughness: 0.55 }, 'emerg'), { cast: false });
      g.add(body);
      for (const sx of [-1, 1]) {
        const headMat = new THREE.MeshStandardMaterial({ color: 0x1a0705, emissive: PALETTE.emergency, emissiveIntensity: 3.2, roughness: 0.4 });
        this.emissiveMaterials.push({ mat: headMat, base: 3.2, kind: 'emergency' });
        const head = KIT.mesh(KIT.sphere(0.032, 10), headMat, { cast: false, receive: false });
        head.position.set(sx * 0.075, 0, 0.06);
        g.add(head);
      }
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      this.fixtureGroup.add(g);
      assets.tag(g, 'LIGHT-EMERGENCY');
      this.addSpec({ id: `em-${room}-${x.toFixed(1)}-${z.toFixed(1)}`, type: 'emergency', pos: [x, y - 0.05, z], color: PALETTE.emergency, intensity: 0.55, distance: 6, room, priority: 3 });
      return g;
    };

    const exitSign = (x, z, y, room, rotY = 0) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x081208, emissive: PALETTE.exitGreen, emissiveIntensity: 2.6, roughness: 0.5 });
      this.emissiveMaterials.push({ mat, base: 2.6, kind: 'exit' });
      const panel = KIT.mesh(KIT.bevelBox(0.34, 0.15, 0.03, 0.004), mat, { cast: false, receive: false });
      g.add(panel);
      const bracket = KIT.mesh(KIT.box(0.04, 0.1, 0.03), plainMaterial(0x9a9a94, { roughness: 0.5, metalness: 0.6 }, 'exitbracket'), { cast: false });
      bracket.position.y = 0.12;
      g.add(bracket);
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      this.fixtureGroup.add(g);
      assets.tag(g, 'SIGN-EXIT');
      this.addSpec({ id: `exit-${room}-${x.toFixed(1)}-${z.toFixed(1)}`, type: 'exit', pos: [x, y - 0.2, z], color: PALETTE.exitGreen, intensity: 0.3, distance: 3.5, room, priority: 0 });
      return g;
    };

    this.helpers = { troffer, downlight, stripLight, emergency, exitSign };

    // -- Fill each room with an appropriate fixture layout -------------------
    for (const room of ROOMS) {
      if (room.exterior) continue;
      const fy = FLOOR_Y[room.floor];
      const ceilY = fy + room.ceiling - 0.02;
      const zone = ZONES[room.zone] || ZONES.office;
      const w = room.x1 - room.x0;
      const d = room.z1 - room.z0;

      switch (room.zone) {
        case 'office': {
          const nx = Math.max(1, Math.round(w / 3.6));
          const nz = Math.max(1, Math.round(d / 3.2));
          for (let i = 0; i < nx; i++) {
            for (let j = 0; j < nz; j++) {
              const x = room.x0 + (w * (i + 0.5)) / nx;
              const z = room.z0 + (d * (j + 0.5)) / nz;
              const tired = this.rng.float() < 0.12;
              troffer(x, z, ceilY, room.id, tired ? PALETTE.fluorescentTired : PALETTE.fluorescent, 0.85);
            }
          }
          break;
        }
        case 'executive': {
          const nx = Math.max(1, Math.round(w / 3.0));
          const nz = Math.max(1, Math.round(d / 3.0));
          for (let i = 0; i < nx; i++) {
            for (let j = 0; j < nz; j++) {
              downlight(
                room.x0 + (w * (i + 0.5)) / nx,
                room.z0 + (d * (j + 0.5)) / nz,
                ceilY, room.id, PALETTE.tungsten, 0.7, 6.5
              );
            }
          }
          break;
        }
        case 'service': {
          const n = Math.max(1, Math.round(Math.max(w, d) / 4.2));
          const along = w >= d;
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            const x = along ? room.x0 + w * t : (room.x0 + room.x1) / 2;
            const z = along ? (room.z0 + room.z1) / 2 : room.z0 + d * t;
            stripLight(x, z, ceilY, room.id, PALETTE.fluorescentTired, 0.5, Math.min(1.5, Math.min(w, d) * 0.5));
          }
          break;
        }
        case 'server': {
          for (let i = 0; i < 2; i++) {
            stripLight(room.x0 + w * (0.3 + i * 0.4), (room.z0 + room.z1) / 2, ceilY, room.id, PALETTE.fluorescentCool, 0.42, 1.2);
          }
          break;
        }
        case 'exterior': {
          // Lobby / atrium: pendant downlights on a long drop.
          const nx = Math.max(1, Math.round(w / 5));
          const nz = Math.max(1, Math.round(d / 4));
          for (let i = 0; i < nx; i++) {
            for (let j = 0; j < nz; j++) {
              const x = room.x0 + (w * (i + 0.5)) / nx;
              const z = room.z0 + (d * (j + 0.5)) / nz;
              const y = Math.min(ceilY, fy + 3.6);
              // Pendant stem
              if (room.ceiling > 4) {
                const stem = KIT.mesh(KIT.cyl(0.008, 0.008, ceilY - y, 6), plainMaterial(0x2b2f33, { roughness: 0.5, metalness: 0.6 }, 'stem'), { cast: false });
                stem.position.set(x, (ceilY + y) / 2, z);
                this.fixtureGroup.add(stem);
              }
              downlight(x, z, y, room.id, PALETTE.fluorescentCool, 1.0, 9);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    // -- Hand-placed accent, emergency and exit lighting ---------------------
    exitSign(0, -8.35, 2.55, 'lobby', 0);
    exitSign(-13.6, 10, 2.5, 'midcorr', Math.PI / 2);
    exitSign(13.6, 10, 2.5, 'midcorr', -Math.PI / 2);
    exitSign(0, 15.6, 2.4, 'servicecorr', 0);
    exitSign(19.5, 12.5, 3.2, 'garage', -Math.PI / 2);
    exitSign(11.2, -8.3, 2.6, 'stairwell', 0);
    exitSign(-19.2, -1.2, 2.5, 'weststair', Math.PI / 2);
    exitSign(-19.2, -1.2 + 4.0 * 0 + 0, 6.5, 'upperweststair', Math.PI / 2);

    emergency(-7, 16.9, 2.45, 'servicecorr');
    emergency(7, 16.9, 2.45, 'servicecorr');
    emergency(-21, -4, 2.6, 'weststair', Math.PI / 2);
    emergency(-21, -4 + 4, 2.6 + 4, 'upperweststair', Math.PI / 2);
    emergency(9.5, 15.2, 3.2, 'mechanical');
    emergency(23.5, 17.6, 3.9, 'garage');
    emergency(-12.75, 13.7, 2.45, 'janitor');

    // Warm desk-lamp pools in occupied rooms.
    for (const [x, y, z, room] of [
      [-15.4, 4.85, -6.6, 'execoffice'],
      [-4.6, 0.78, 2.3, 'openoffice'],
      [6.4, 0.78, 6.2, 'openoffice'],
      [-6.8, 0.95, -3.4, 'lobby'],
    ]) {
      this.addSpec({ id: `lamp-${room}-${x}`, type: 'lamp', pos: [x, y, z], color: PALETTE.deskLamp, intensity: 0.55, distance: 3.4, room, priority: 3 });
    }

    // Server room rack glow.
    this.addSpec({ id: 'server-glow-a', type: 'accent', pos: [3.2, 1.6, 13], color: PALETTE.serverBlue, intensity: 0.5, distance: 4.5, room: 'serverroom', priority: 3 });
    this.addSpec({ id: 'server-glow-b', type: 'accent', pos: [5.4, 1.2, 13.6], color: PALETTE.serverAmber, intensity: 0.32, distance: 3.4, room: 'serverroom', priority: 3 });

    // Snow bounce just inside the big glazing.
    this.addSpec({ id: 'bounce-lobby', type: 'bounce', pos: [0, 2.4, -7.4], color: PALETTE.snowBounce, intensity: 1.5, distance: 14, room: 'lobby', priority: 4, decay: 1.2 });
    this.addSpec({ id: 'bounce-exec', type: 'bounce', pos: [-16.5, 5.6, -6.5], color: PALETTE.snowBounce, intensity: 0.9, distance: 8, room: 'execoffice', priority: 4, decay: 1.3 });
    this.addSpec({ id: 'bounce-break', type: 'bounce', pos: [-20.8, 1.9, 2.0], color: PALETTE.snowBounce, intensity: 0.8, distance: 7, room: 'breakroom', priority: 4, decay: 1.3 });
    this.addSpec({ id: 'bounce-conf', type: 'bounce', pos: [18.8, 1.9, 3.5], color: PALETTE.snowBounce, intensity: 0.7, distance: 8, room: 'conference', priority: 4, decay: 1.3 });
    this.addSpec({ id: 'bounce-garage', type: 'bounce', pos: [25.6, 2.2, 12.5], color: PALETTE.snowBounce, intensity: 0.85, distance: 9, room: 'garage', priority: 4, decay: 1.3 });
  }

  buildPool() {
    const max = 28;
    for (let i = 0; i < max; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 1.6);
      l.visible = false;
      l.castShadow = false;
      this.scene.add(l);
      this.pool.set(`p${i}`, l);
    }
    this.poolList = Array.from(this.pool.values());
  }

  setScenario(name) {
    if (!LIGHT_SCENARIOS[name]) return false;
    this.scenario = name;
    const s = LIGHT_SCENARIOS[name];
    this.sun.intensity = 2.1 * s.sun;
    this.hemi.intensity = 0.55 * s.ambient;
    this.ambient.intensity = 0.42 * s.ambient;
    for (const e of this.emissiveMaterials) {
      const isEmerg = e.kind === 'emergency' || e.kind === 'exit';
      const mul = isEmerg ? (s.emergency ?? 1) : s.fixtures;
      e.mat.emissiveIntensity = e.base * Math.max(0.02, mul);
    }
    return true;
  }

  /** Enable the N highest-value lights around the camera. */
  update(dt, cameraPos) {
    this._time += dt;
    const s = LIGHT_SCENARIOS[this.scenario];
    const budget = Math.min(this.poolList.length, settings.quality.maxDynamicLights);
    const scored = [];
    for (const spec of this.specs) {
      const dx = spec.pos[0] - cameraPos.x;
      const dy = spec.pos[1] - cameraPos.y;
      const dz = spec.pos[2] - cameraPos.z;
      const d2 = dx * dx + dy * dy * 2.2 + dz * dz;
      if (d2 > (spec.distance + 9) * (spec.distance + 9)) continue;
      scored.push({ spec, score: (spec.priority + 1) * 240 - d2 });
    }
    scored.sort((a, b) => b.score - a.score);

    for (let i = 0; i < this.poolList.length; i++) {
      const light = this.poolList[i];
      if (i < budget && i < scored.length) {
        const { spec } = scored[i];
        light.visible = true;
        light.color.setHex(spec.color);
        light.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
        light.distance = spec.distance;
        light.decay = spec.decay;
        const isEmerg = spec.type === 'emergency' || spec.type === 'exit';
        const mul = isEmerg ? (s.emergency ?? 1) : s.fixtures;
        let intensity = spec.intensity * mul * 3.2;
        if (spec.type === 'fluorescent' && spec.flicker) {
          intensity *= 0.75 + 0.25 * Math.sin(this._time * 42 + spec.flicker * 10);
        }
        light.intensity = intensity;
      } else {
        light.visible = false;
        light.intensity = 0;
      }
    }
  }

  dispose() {
    this.scene.remove(this.fixtureGroup);
  }
}
