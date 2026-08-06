// threats.js — pooled ballistic threats + scenario spawner. Arcs, speeds and
// behaviors are fictional and tuned for readable, cinematic gameplay.
import * as THREE from 'three';
import { Pool, TAU, clamp, pad2 } from './util.js';
import { GRAVITY, ballisticVelocityFor } from './physics.js';
import { terrainHeight } from './base.js';

const BASE_DAMAGE_RADIUS = 170;

export const SCENARIOS = {
  single: {
    id: 'single',
    name: 'SINGLE TRACK',
    desc: 'One high-visibility ballistic target.',
    build(rng) {
      return [{ delay: 2.5, T: rng.range(52, 62), decoy: false }];
    },
  },
  saturation: {
    id: 'saturation',
    name: 'SATURATION',
    desc: '3–5 targets on separate arcs.',
    build(rng) {
      const n = rng.int(3, 5);
      const list = [];
      let t = 2;
      for (let i = 0; i < n; i++) {
        list.push({ delay: t, T: rng.range(50, 72), decoy: false });
        t += rng.range(4, 9);
      }
      return list;
    },
  },
  nightraid: {
    id: 'nightraid',
    name: 'NIGHT RAID',
    desc: 'Multiple targets with decoys, at night.',
    forceTime: 'night',
    build(rng) {
      const warheads = 3;
      const decoys = rng.int(2, 3);
      const list = [];
      let t = 2.5;
      const kinds = [];
      for (let i = 0; i < warheads; i++) kinds.push(false);
      for (let i = 0; i < decoys; i++) kinds.push(true);
      // deterministic shuffle
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      for (const decoy of kinds) {
        list.push({ delay: t, T: rng.range(48, 66), decoy });
        t += rng.range(3.5, 7.5);
      }
      return list;
    },
  },
};

export function createThreats(ctx) {
  const { scene, textures } = ctx;
  const active = [];
  let queue = [];
  let elapsed = 0;
  let spawnCounter = 0;
  let running = false;

  const bodyGeo = (() => {
    const g = new THREE.ConeGeometry(0.55, 4.6, 10);
    g.rotateX(Math.PI / 2); // nose toward +z, aligned to velocity via lookAt
    return g;
  })();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3d3f42, roughness: 0.55, metalness: 0.35,
    emissive: 0xff5a1e, emissiveIntensity: 0.0,
  });

  const glowTex = textures.hardFlare();

  const pool = new Pool(() => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat.clone());
    body.castShadow = false;
    group.add(body);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffc080, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    group.add(glow);
    group.visible = false;
    scene.add(group);
    return {
      group, body, glow,
      id: '', pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      alive: false, isDecoy: false, dragK: 0, weave: 0, weavePhase: 0,
      trail: null, glowTrail: null, emitAcc: 0, age: 0, engagedBy: 0,
      plasmaTrail: null, plasmaAcc: 0, flickerPhase: 0,
    };
  }, 10);

  const _v = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _pv = new THREE.Vector3();

  function spawnThreat(spec, rng) {
    const t = pool.acquire();
    if (!t) return null;
    spawnCounter++;
    t.id = 'T-' + pad2(spawnCounter);
    t.isDecoy = spec.decoy;
    t.alive = true;
    t.age = 0;
    t.engagedBy = 0;
    t.emitAcc = 0;

    const az = rng.next() * TAU;
    const range = rng.range(5200, 7600);
    const alt = rng.range(5200, 6800);
    const impactR = rng.range(15, spec.decoy ? 600 : 130);
    const impactA = rng.next() * TAU;
    const start = new THREE.Vector3(Math.sin(az) * range, alt, Math.cos(az) * range);
    const impact = new THREE.Vector3(Math.sin(impactA) * impactR, 0, Math.cos(impactA) * impactR);
    t.pos.copy(start);
    ballisticVelocityFor(start, impact, spec.T, t.vel);
    t.dragK = spec.decoy ? 0.00030 : 0.00006;
    t.weave = !spec.decoy && rng.next() < 0.45 ? rng.range(8, 18) : 0;
    t.weavePhase = rng.next() * TAU;

    t.group.visible = true;
    t.group.position.copy(t.pos);
    t.body.material.emissiveIntensity = 0.4;
    t.glow.material.opacity = 0.85;

    t.trail = ctx.effects.acquireTrail({
      color: spec.decoy ? 0xcfd4da : 0xe8e2d8,
      life: 11,
      opacity: spec.decoy ? 0.4 : 0.62,
      emissive: 0.45, // reentry-heated: partially self-lit at night
    });
    // short additive plasma sheath hugging the body; intensity follows reentry heat
    t.plasmaTrail = ctx.effects.acquireTrail({
      color: spec.decoy ? 0xffd9a0 : 0xffb066,
      life: 1.2,
      opacity: spec.decoy ? 0.45 : 0.9,
      emissive: 1.0,
    });
    t.plasmaAcc = 0;
    t.flickerPhase = ctx.vrng.next() * TAU;
    active.push(t);
    ctx.events.emit('threat-spawned', { threat: t });
    return t;
  }

  function removeThreat(t) {
    t.alive = false;
    t.group.visible = false;
    if (t.trail) { ctx.effects.releaseTrail(t.trail); t.trail = null; }
    if (t.plasmaTrail) { ctx.effects.releaseTrail(t.plasmaTrail); t.plasmaTrail = null; }
    const i = active.indexOf(t);
    if (i >= 0) active.splice(i, 1);
    pool.release(t);
  }

  const api = {
    active,
    get running() { return running; },
    get pendingCount() { return queue.length; },
    get allSpawned() { return queue.length === 0; },
    startScenario(name, rng) {
      api.clear();
      const scen = SCENARIOS[name];
      if (!scen) return false;
      queue = scen.build(rng).map((s) => ({ ...s }));
      elapsed = 0;
      spawnCounter = 0;
      running = true;
      api._rng = rng;
      return true;
    },
    stop() { running = false; queue = []; },
    clear() {
      for (const t of [...active]) removeThreat(t);
      queue = [];
      running = false;
    },
    /** interceptors call this on a successful kill */
    destroy(t, point) {
      if (!t.alive) return;
      ctx.effects.explosionAir(point ?? t.pos, t.isDecoy ? 0.7 : 1.25);
      ctx.events.emit('threat-destroyed', { threat: t, point: point ?? t.pos.clone() });
      removeThreat(t);
    },
    update(dt) {
      if (running) {
        elapsed += dt;
        while (queue.length && queue[0].delay <= elapsed) {
          const spec = queue.shift();
          spawnThreat(spec, api._rng);
        }
      }
      for (const t of [...active]) {
        t.age += dt;
        // gravity + drag
        t.vel.y -= GRAVITY * dt;
        const sp = t.vel.length();
        const drag = t.dragK * sp * sp * dt;
        if (sp > 1) t.vel.multiplyScalar(Math.max(0, 1 - drag / sp));
        // gentle terminal weave for some warheads (visual maneuvering)
        if (t.weave > 0 && t.pos.y < 2400 && t.pos.y > 300) {
          _v.set(-t.vel.z, 0, t.vel.x).normalize();
          t.vel.addScaledVector(_v, Math.sin(t.age * 1.9 + t.weavePhase) * t.weave * dt);
        }
        t.pos.addScaledVector(t.vel, dt);
        t.group.position.copy(t.pos);
        _look.copy(t.pos).add(t.vel);
        t.group.lookAt(_look);

        // reentry heating glow: stronger when fast & low, with subtle plasma flicker
        const heat = clamp((sp - 220) / 600, 0, 1) * clamp(1.5 - t.pos.y / 5200, 0.2, 1);
        const flick = 0.9 + 0.1 * Math.sin(t.age * 27 + t.flickerPhase) * Math.sin(t.age * 9.3 + t.flickerPhase * 1.7);
        t.body.material.emissiveIntensity = heat * 3.2 * (0.75 + 0.35 * flick);
        const dCam = t.pos.distanceTo(ctx.camera.position);
        t.glow.scale.setScalar(clamp(3.5 + dCam * 0.012, 4, 90) * (t.isDecoy ? 0.7 : 1) * (0.55 + heat) * (0.92 + 0.08 * flick));
        t.glow.material.opacity = (0.5 + heat * 0.5) * (t.isDecoy ? 0.72 : 1) * flick;

        // trail emission (air-density based width/fade)
        t.emitAcc += dt;
        if (t.emitAcc > 0.035 && t.trail) {
          t.emitAcc = 0;
          const airK = clamp(t.pos.y / 6500, 0, 1); // thin air => wide persistent trail
          t.trail.emit(t.pos, (t.isDecoy ? 3.5 : 6) * (0.5 + airK * 1.2), 0.5 + airK * 0.6);
        }
        // plasma sheath: short bright ribbon just behind the body, grows with
        // heat. Width is stylized (wider than the body) so the sheath still
        // reads as a burning streak from typical viewing ranges of 0.5-2 km.
        t.plasmaAcc += dt;
        if (t.plasmaAcc > 0.024 && t.plasmaTrail) {
          t.plasmaAcc = 0;
          if (heat > 0.04) {
            _pv.copy(t.vel).normalize().multiplyScalar(-2.6).add(t.pos);
            t.plasmaTrail.emit(
              _pv,
              (t.isDecoy ? 1.3 : 2.8) * (0.45 + heat * 1.3),
              clamp(0.3 + heat * 0.95, 0, 1) * (0.9 + 0.1 * flick)
            );
          }
        }

        // ground impact
        const gh = Math.max(0, terrainHeight(t.pos.x, t.pos.z));
        if (t.pos.y <= gh + 2) {
          const onBase = Math.hypot(t.pos.x, t.pos.z) < BASE_DAMAGE_RADIUS;
          if (t.isDecoy) {
            ctx.effects.explosionGround(t.pos, 0.5);
          } else {
            ctx.effects.explosionGround(t.pos, onBase ? 1.6 : 1.15);
          }
          ctx.events.emit('threat-impact', { threat: t, onBase, point: t.pos.clone() });
          removeThreat(t);
        }
      }
    },
  };
  return api;
}
