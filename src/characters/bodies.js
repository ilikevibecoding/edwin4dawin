// Character body construction + animation interface — owner: Fable 4.
// Full rigged characters (replaces the phase-2 graybox capsules) built from
// humanoid.js + animation.js + weaponMeshes.js. The exported API is unchanged:
//   createEnemyBody(type) / createHostageBody(variant) -> {
//     group, parts, setMoveAnim(speed, dt), setAimPitch(p), setCrouch(frac),
//     playDeath(), update(dt), headHeight()
//   }
// Enemy hit boxes derive from headHeight(); heads sit at ~1.65-1.70 standing.
// All cosmetic variety is seeded deterministically (never Math.random).

import * as THREE from 'three';
import { on } from '../core/events.js';
import { createHumanoid } from './humanoid.js';
import { CharacterAnimator } from './animation.js';
import { buildWeaponModel } from './weaponMeshes.js';

const ENEMY_WEAPON = { scout: 'kestrel', trooper: 'ridgeline', heavy: 'boreas', marksman: 'longwatch' };
const TYPE_SALT = { scout: 101, trooper: 211, heavy: 307, marksman: 401 };

// Deterministic per-session cosmetic sequence: bodies are created in a fixed
// order per mission (roster order), so seq+type gives stable head variants.
let seq = 0;
const live = new Set();
let hooked = false;

function ensureHooks() {
  if (hooked) return;
  hooked = true;
  // reset cosmetic sequence + live registry when a session ends/begins
  on('modechange', ({ to }) => {
    if (to === 'loading' || to === 'title' || to === 'briefing') { seq = 0; live.clear(); }
  });
  // fire twitch: enemy.js emits 'enemy-shot' with from = shooter eye position
  on('enemy-shot', (e) => {
    if (!e || !e.from) return;
    for (const b of live) {
      if (b._dead) continue;
      const p = b.group.position;
      const dx = e.from.x - p.x, dz = e.from.z - p.z;
      if (dx * dx + dz * dz < 0.4) b._anim.triggerFire();
    }
  });
  // flinch: flesh impacts near a body
  on('impact', (e) => {
    if (!e || e.kind !== 'flesh' || !e.point) return;
    for (const b of live) {
      if (b._dead) continue;
      const p = b.group.position;
      const dx = e.point.x - p.x, dz = e.point.z - p.z;
      if (dx * dx + dz * dz < 0.5) b._anim.triggerFlinch(dx > 0 ? 1 : -1);
    }
  });
}

export function createEnemyBody(type = 'trooper') {
  ensureHooks();
  const seed = (TYPE_SALT[type] || 211) + seq++ * 17;
  const rig = createHumanoid({ variant: type, seed });
  const anim = new CharacterAnimator(rig, { kind: 'enemy', seed });
  const weapon = buildWeaponModel(ENEMY_WEAPON[type] || 'ridgeline', { firstPerson: false });
  anim.attachWeapon(weapon);
  return makeBodyApi(rig, anim, { gun: weapon });
}

export function createHostageBody(variant = 0) {
  ensureHooks();
  const id = variant % 2 === 0 ? 'voss' : 'reid';
  const rig = createHumanoid({ variant: id, seed: 900 + variant });
  const anim = new CharacterAnimator(rig, { kind: 'hostage', seed: 900 + variant });
  return makeBodyApi(rig, anim, {});
}

function makeBodyApi(rig, anim, extraParts) {
  const headY = rig.dims.headY;
  const api = {
    group: rig.group,
    parts: { torso: rig.meshes.torso, head: rig.meshes.head, ...extraParts },
    crouchFrac: 0,
    _anim: anim,
    _dead: false,

    setMoveAnim(speed, dt) { anim.setMove(speed, dt); },
    setAimPitch(p) { anim.setAimPitch(p); },
    setCrouch(frac) {
      this.crouchFrac = frac;
      anim.setCrouch(frac);
      // hostage freed: hide the zip-tie once they stand
      if (rig.meshes.tie && frac < 0.5 && rig.meshes.tie.visible) rig.meshes.tie.visible = false;
    },
    playDeath() {
      this._dead = true;
      anim.playDeath();
    },
    update(dt) { anim.update(dt); },
    headHeight() { return headY - this.crouchFrac * 0.42; },
    // World position of the held weapon's muzzle marker — lets VFX (enemy
    // tracers / muzzle flashes) originate at the barrel instead of the eyes.
    // Falls back to an eye-line point for bodies without a weapon (hostages).
    muzzleWorld(out = new THREE.Vector3()) {
      const gun = extraParts.gun;
      if (gun && gun.userData.muzzle) {
        rig.group.updateMatrixWorld(true);
        return gun.userData.muzzle.getWorldPosition(out);
      }
      rig.group.getWorldPosition(out);
      out.y += this.headHeight() - 0.25;
      return out;
    },
  };
  rig.group.userData.baseY = 0;
  live.add(api);
  return api;
}
