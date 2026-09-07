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
  // Two more than round 2 at every tier for the pole lanterns over the parking
  // row (the fleet measured no camp light on the vehicles at night). Every
  // camp light is a shadowless point light in the one forward loop, so the
  // cost is per fragment across the scene, not per object: six at fast is the
  // same program count, one more loop iteration.
  // Round 5: one more at every tier for the third pole over the supply end of
  // the row (seven at fast, nine above), so the kitchen and the third tent's
  // lamp keep their slots.
  const cap = quality === 'fast' ? 7 : 9;
  const chosen = anchors.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, cap);
  for (const a of chosen) {
    const l = new THREE.PointLight(a.color ?? 0xffb35c, 0, a.distance ?? 12, a.decay ?? 1.9);
    l.position.set(a.x, a.y, a.z);
    l.name = a.name || 'campLamp';
    l.userData.base = a.intensity ?? 18;
    l.userData.flicker = a.flicker ?? 0.08;
    l.userData.phase = Math.random() * 100;
    // An anchor with a `day` block is also a daytime fill: the same light,
    // re-aimed by the hour — a short, weak, warm term where the sky cannot
    // reach (under the mess fly, in the pockets beneath the tables), fading
    // out as the lamp itself comes up. Costs nothing: the light is in the
    // loop already.
    if (a.day) {
      l.userData.day = a.day;
      l.userData.nightColor = new THREE.Color(a.color ?? 0xffb35c);
      l.userData.dayColor = new THREE.Color(a.day.color ?? 0xd9a070);
      l.userData.nightDistance = a.distance ?? 12;
      l.userData.nightDecay = a.decay ?? 1.9;
      l.userData.nightY = a.y;
    }
    group.add(l);
    lights.push(l);
  }

  let mode = 'day';
  let level = 0;
  let target = 0;
  let checkT = 0;

  function apply(lvl) {
    // The night bloom threshold is 2.0 (post.js): a glass at 5.0 was 2.5×
    // over it and bloomed to a 28-px ball around every lantern head (round 5,
    // fleet night frames); at 2.4 only its core passes the threshold.
    mats.lampGlass.emissiveIntensity = 2.4 * lvl;
    mats.lampGlass.opacity = 0.85 + 0.15 * lvl;
    mats.bulb.emissiveIntensity = 3.6 * lvl;
    for (const l of lights) {
      l.intensity = l.userData.base * lvl;
      const d = l.userData.day;
      if (d) {
        l.intensity += d.intensity * (1 - lvl);
        l.color.copy(l.userData.dayColor).lerp(l.userData.nightColor, lvl);
        l.distance = THREE.MathUtils.lerp(d.distance ?? 6, l.userData.nightDistance, lvl);
        l.decay = THREE.MathUtils.lerp(d.decay ?? 2, l.userData.nightDecay, lvl);
        l.position.y = l.userData.nightY + (d.dy ?? 0) * (1 - lvl);
      }
    }
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
    setMode(name, { snap = false } = {}) {
      if (MODE_LEVEL[name] === undefined) return;
      mode = name;
      target = MODE_LEVEL[name];
      if (snap) {
        level = target;
        apply(level);
      }
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
          // the flame flickers; a daylight fill does not
          l.intensity = l.userData.base * level * f + (l.userData.day ? l.userData.day.intensity * (1 - level) : 0);
        }
      }
    },
  };
}
