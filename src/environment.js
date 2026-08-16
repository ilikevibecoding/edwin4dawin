// Lighting rig, lighting states, PMREM reflection environment, fog, exposure.
// Owner: lighting agent. Rooms register practical fixtures here.

import * as THREE from 'three';
import * as K from './greebles.js';

// global exposure grade: main.js seeds the renderer with this, and state
// exposure factors multiply it (never replace it)
export const BASE_EXPOSURE = 0.86;

// role -> intensity factor per state
const STATES = {
  cruising:          { warm: 1.0, work: 1.0, red: 0.0, instrument: 1.0, reading: 0.75, cool: 1.0, env: 1.0, exposure: 1.0, machinery: 1.0 },
  restCycle:         { warm: 0.10, work: 0.16, red: 0.85, instrument: 0.75, reading: 0.22, cool: 1.0, env: 0.35, exposure: 1.06, machinery: 0.7 },
  silentRunning:     { warm: 0.22, work: 0.14, red: 1.0, instrument: 0.9, reading: 0.3, cool: 1.0, env: 0.42, exposure: 1.04, machinery: 0.35 },
  maintenanceLights: { warm: 0.45, work: 1.25, red: 0.0, instrument: 0.7, reading: 0.5, cool: 1.0, env: 1.0, exposure: 1.0, machinery: 0.85 },
};

export function createEnvironment(scene, renderer) {
  const fixtures = []; // {light?, lampMats?, role, base, baseEmissive}
  let current = 'cruising';
  let factors = { ...STATES.cruising };
  let target = { ...STATES.cruising };
  let lerpSpeed = 1.6;

  scene.fog = new THREE.FogExp2(0x10161a, 0.032);

  // rooms author semantic intensities; one global scale sets overall key level
  const LIGHT_SCALE = 0.34;

  function register(f) {
    if (f.light) f.light.intensity *= LIGHT_SCALE;
    const fix = {
      role: f.role || 'warm',
      light: f.light || null,
      lampMats: f.lampMats || [],
      base: f.light ? f.light.intensity : 0,
      baseEmissive: (f.lampMats || []).map((m) => m.emissiveIntensity),
    };
    fixtures.push(fix);
    return fix;
  }

  // -- PMREM from a schematic emissive scene ---------------------------------
  let pmrem = null;
  const envMaps = {};
  function buildEnvScene(dim) {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x0b0e10);
    const mk = (color, intensity, w, h, pos, rotX = 0, rotY = 0) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
      );
      m.position.set(...pos);
      m.rotation.x = rotX; m.rotation.y = rotY;
      s.add(m);
    };
    // hull walls (light panels)
    mk(0x6a685e, 0.42, 30, 3, [0, 1.2, -3.2], 0, 0);
    mk(0x62605a, 0.38, 30, 3, [0, 1.2, 3.2], 0, Math.PI);
    // dark floor
    mk(0x141517, 0.7, 30, 7, [0, -0.2, 0], -Math.PI / 2, 0);
    // warm ceiling strip lights
    for (let i = -3; i <= 3; i++) {
      mk(0xffd9a3, dim ? 0.8 : 3.8, 0.9, 0.5, [i * 3.4, 2.5, 0], Math.PI / 2, 0);
    }
    if (dim) for (let i = -2; i <= 2; i++) mk(0xb03a28, 1.7, 0.7, 0.4, [i * 4.5 + 1.4, 2.5, 0.4], Math.PI / 2, 0);
    // cool window glow at bow
    mk(0x2a5a66, dim ? 1.6 : 2.2, 3.4, 2.4, [-14.5, 1.3, 0], 0, Math.PI / 2);
    // dark machinery mass aft
    mk(0x101214, 1, 4, 2.6, [14.5, 0.9, 0], 0, -Math.PI / 2);
    return s;
  }
  function buildPMREM() {
    if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
    if (!envMaps.normal) {
      envMaps.normal = pmrem.fromScene(buildEnvScene(false), 0.035).texture;
      envMaps.dim = pmrem.fromScene(buildEnvScene(true), 0.035).texture;
    }
    scene.environment = envMaps.normal;
    scene.environmentIntensity = 0.3;
  }

  function setState(name, { duration = 2.2 } = {}) {
    if (!STATES[name]) return false;
    current = name;
    target = { ...STATES[name] };
    lerpSpeed = 1 / Math.max(0.1, duration);
    return true;
  }

  function update(dt, renderer2) {
    const k = Math.min(1, dt * lerpSpeed * 3);
    let changed = 0;
    for (const key of Object.keys(target)) {
      const d = (target[key] - factors[key]) * k;
      factors[key] += d;
      changed = Math.max(changed, Math.abs(d));
    }
    for (const f of fixtures) {
      const fac = factors[f.role] !== undefined ? factors[f.role] : 1;
      if (f.light) f.light.intensity = f.base * fac;
      for (let i = 0; i < f.lampMats.length; i++) {
        f.lampMats[i].emissiveIntensity = f.baseEmissive[i] * Math.max(fac, 0.02);
      }
    }
    K.setMachineryFactor(factors.machinery);
    // state exposure is a MULTIPLIER on the scene base — writing it absolutely
    // silently undoes any global exposure grade set in main.js
    if (renderer2) renderer2.toneMappingExposure = BASE_EXPOSURE * factors.exposure;
    // swap env map toward dim states
    if (envMaps.normal) {
      const wantDim = factors.red > 0.4;
      const cur = scene.environment;
      const want = wantDim ? envMaps.dim : envMaps.normal;
      if (cur !== want) scene.environment = want;
      scene.environmentIntensity = 0.3 * (0.55 + 0.45 * factors.env);
    }
    return changed;
  }

  return {
    register,
    setState,
    update,
    buildPMREM,
    getState: () => current,
    getFactors: () => factors,
  };
}
