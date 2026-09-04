import * as THREE from 'three';
import { sunDirection } from '../sky.js';

// ---------------------------------------------------------------------------
// Camp lighting. Hundreds of string-light bulbs and a dozen lantern glasses
// are emissive surfaces — one instanced mesh and one shared material — and a
// handful of real point lights stand in for the pools they throw. Everything
// here is off in daylight and comes up through dusk to full at night.
//
// The hour is read from the sky module: `sunDirection()` with no argument is
// the key direction for the *current* mode, so matching it against the three
// modes' own directions is a read-only way of learning which one is live. The
// campground update also accepts `ctx.timeOfDay` if the caller passes it.
// ---------------------------------------------------------------------------

const MODE_LEVEL = { day: 0, dusk: 0.65, night: 1 };
const _d = new THREE.Vector3();

export function detectTimeOfDay() {
  const d = sunDirection();
  for (const m of ['night', 'dusk', 'day']) {
    if (_d.copy(sunDirection(m)).distanceToSquared(d) < 1e-6) return m;
  }
  return 'day';
}

/**
 * @param lamps  [{x, y, z, kind}] in camp-local space (already placed)
 * @param anchors  named positions for the real lights: [{x, y, z, color, distance, intensity, flicker}]
 */
export function createCampLights(mats, lamps, anchors, { quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'campLights';
  const lights = [];

  // --- bulbs -----------------------------------------------------------------
  const bulbs = lamps.filter((l) => l.kind === 'bulb');
  let bulbMesh = null;
  if (bulbs.length) {
    const geo = new THREE.SphereGeometry(0.028, 8, 6);
    geo.translate(0, -0.03, 0);
    // a small cap above each bulb, merged into the same instance
    bulbMesh = new THREE.InstancedMesh(geo, mats.bulb, bulbs.length);
    bulbMesh.name = 'campBulbs';
    const m = new THREE.Matrix4();
    bulbs.forEach((b, i) => {
      m.makeTranslation(b.x, b.y, b.z);
      bulbMesh.setMatrixAt(i, m);
    });
    bulbMesh.instanceMatrix.needsUpdate = true;
    bulbMesh.castShadow = false;
    bulbMesh.receiveShadow = false;
    group.add(bulbMesh);
  }

  // --- real lights -------------------------------------------------------------
  const cap = quality === 'fast' ? 4 : 6;
  const chosen = anchors.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, cap);
  for (const a of chosen) {
    const l = new THREE.PointLight(a.color ?? 0xffb35c, 0, a.distance ?? 12, a.decay ?? 1.9);
    l.position.set(a.x, a.y, a.z);
    l.name = a.name || 'campLamp';
    l.userData.base = a.intensity ?? 18;
    l.userData.flicker = a.flicker ?? 0.08;
    l.userData.phase = Math.random() * 100;
    group.add(l);
    lights.push(l);
  }

  let mode = 'day';
  let level = 0;
  let target = 0;
  let checkT = 0;

  function apply(lvl) {
    mats.lampGlass.emissiveIntensity = 5.0 * lvl;
    mats.lampGlass.opacity = 0.85 + 0.15 * lvl;
    mats.bulb.emissiveIntensity = 3.6 * lvl;
    for (const l of lights) l.intensity = l.userData.base * lvl;
    // the grass's fake translucency is a daylight effect
    if (mats.grass) mats.grass.emissiveIntensity = 0.4 * (1 - lvl);
  }

  return {
    group,
    lights,
    bulbCount: bulbs.length,
    lanternCount: lamps.length - bulbs.length,
    get mode() {
      return mode;
    },
    get level() {
      return level;
    },
    setMode(name) {
      if (MODE_LEVEL[name] === undefined) return;
      mode = name;
      target = MODE_LEVEL[name];
    },
    update(dt, t, ctx = {}) {
      checkT -= dt;
      if (ctx.timeOfDay && MODE_LEVEL[ctx.timeOfDay] !== undefined) {
        if (ctx.timeOfDay !== mode) this.setMode(ctx.timeOfDay);
      } else if (checkT <= 0) {
        checkT = 0.4;
        const m = detectTimeOfDay();
        if (m !== mode) this.setMode(m);
      }
      // fade rather than snap: a lamp warms up, and a mode change mid-frame is a
      // hard cut the eye catches
      level += (target - level) * Math.min(1, dt * 3);
      if (Math.abs(target - level) < 0.002) level = target;
      apply(level);
      // the mast beacon: a slow red blink, on for a third of each second and a half
      mats.beacon.emissiveIntensity = level * (t % 1.5 < 0.5 ? 6 : 0.15);
      if (level > 0) {
        for (const l of lights) {
          const p = l.userData.phase + t;
          const f = 1 + l.userData.flicker * (Math.sin(p * 9.1) * 0.5 + Math.sin(p * 23.7) * 0.3 + Math.sin(p * 3.3) * 0.2);
          l.intensity = l.userData.base * level * f;
        }
      }
    },
  };
}
