// First-person viewmodel: arms + weapon models — owner: Fable 4.
// Contract with game.js (unchanged):
//   const vm = createViewmodel(camera);
//   vm.update(dt, weaponsSystem, player);   // every sim step while playing
//   vm.dispose();
//
// The camera is not part of a scene-graph parent chain we control, so the rig
// root lives in Engine.scene and copies the camera transform every update.
// Anti-clip: every viewmodel material renders with depthTest:false at
// renderOrder >= 990 (drawn over the world), no shadow casting, no culling.
// group.userData.muzzleWorld() -> THREE.Vector3 for the VFX pass.

import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { on } from '../core/events.js';
import { buildWeaponModel, buildShell } from '../characters/weaponMeshes.js';

// ------------------------------------------------------------- pose table
// pos/rot: hip carry in camera space. ads: aim-down-sights position (x=0 and
// y=-sightHeight*scale puts the sight line on screen center). scale keeps the
// muzzle inside ~0.9m of the camera.
const VM_POSES = {
  vireo:     { pos: [0.17, -0.185, -0.33], rot: [0.02, 0.05, 0.02], scale: 1.0, ads: [0, -0.0755, -0.36], left: 'support' },
  kestrel:   { pos: [0.16, -0.2, -0.36], rot: [0.02, 0.05, 0.02], scale: 0.92, ads: [0, -0.104, -0.4], left: 'forend' },
  ridgeline: { pos: [0.17, -0.21, -0.38], rot: [0.02, 0.05, 0.02], scale: 0.8, ads: [0, -0.0865, -0.42], left: 'forend' },
  boreas:    { pos: [0.17, -0.205, -0.34], rot: [0.02, 0.06, 0.02], scale: 0.8, ads: [0, -0.0745, -0.42], left: 'pump' },
  longwatch: { pos: [0.18, -0.225, -0.3], rot: [0.02, 0.06, 0.02], scale: 0.72, ads: [0, -0.0973, -0.3], left: 'forend' },
  talon:     { pos: [0.21, -0.19, -0.33], rot: [0.15, -0.5, 0.2], scale: 1.0, ads: null, left: 'none' },
  flash:     { pos: [0.21, -0.21, -0.37], rot: [0.14, 0.0, -0.12], scale: 0.85, ads: null, left: 'none' },
  smoke:     { pos: [0.21, -0.21, -0.37], rot: [0.14, 0.0, -0.12], scale: 0.85, ads: null, left: 'none' },
};

// ------------------------------------------------------------- materials
let ARM_MATS = null;
function armMats() {
  if (ARM_MATS) return ARM_MATS;
  const std = (c, r, m = 0) => {
    const mt = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    mt.depthTest = false;
    mt.depthWrite = false;
    mt.transparent = true; // transparent pass: draws after world glass
    mt.emissive = new THREE.Color(c).multiplyScalar(0.26);
    return mt;
  };
  ARM_MATS = {
    sleeve: std(0x494f55, 0.92),   // operator charcoal softshell
    cuff: std(0x3e4347, 0.95),
    glove: std(0x393d40, 0.82),    // dark tactical glove
    strap: std(0x2c2f31, 0.7),
    watch: std(0x20303a, 0.35, 0.3),
  };
  return ARM_MATS;
}

// ------------------------------------------------------------- helpers
function tl(p, pts) { // piecewise-linear timeline
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (p <= pts[i][0]) {
      const t0 = pts[i - 1][0], v0 = pts[i - 1][1];
      return v0 + (pts[i][1] - v0) * ((p - t0) / Math.max(1e-6, pts[i][0] - t0));
    }
  }
  return pts[pts.length - 1][1];
}
const smooth = (t) => t * t * (3 - 2 * t);

function orientAlong(mesh, dir) {
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}

function buildArm(side) { // side: 1 right, -1 left
  const M = armMats();
  const g = new THREE.Group();
  g.name = side === 1 ? 'armR' : 'armL';
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.052, 0.11), M.glove);
  glove.position.set(0, -0.012, 0.012);
  glove.rotation.x = 0.2;
  g.add(glove);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.05, 0.032), M.glove);
  thumb.position.set(-side * 0.036, 0.008, 0.02);
  g.add(thumb);
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.026, 0.035), M.glove);
  knuckle.position.set(0, -0.03, -0.035);
  g.add(knuckle);
  // forearm from wrist toward the lower screen corner
  const dir = new THREE.Vector3(side * 0.42, -0.62, 0.66).normalize();
  const start = new THREE.Vector3(0, -0.02, 0.045);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 4, 10), M.sleeve);
  sleeve.position.copy(start).addScaledVector(dir, 0.16);
  orientAlong(sleeve, dir);
  g.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.045, 10), M.cuff);
  cuff.position.copy(start).addScaledVector(dir, 0.055);
  orientAlong(cuff, dir);
  g.add(cuff);
  if (side === -1) { // watch strap detail on the left wrist
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.022, 10), M.strap);
    strap.position.copy(start).addScaledVector(dir, 0.09);
    orientAlong(strap, dir);
    g.add(strap);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.032), M.watch);
    face.position.copy(start).addScaledVector(dir, 0.09).add(new THREE.Vector3(-0.028, 0.028, 0));
    g.add(face);
  }
  return g;
}

// render order: with depthTest off, meshes paint back-to-front by renderOrder.
// Weapon parts sort by local z (stock closest to camera > receiver > barrel);
// arms use the same metric with a small bias so gloves paint over the grips
// they wrap while the stock still paints over the arm behind it.
function applyVmRenderState(obj, root, bias = 0) {
  obj.traverse((c) => {
    if (!c.isMesh) return;
    c.castShadow = false;
    c.receiveShadow = false;
    c.frustumCulled = false;
    let z = 0, n = c;
    while (n && n !== root) { z += n.position.z; n = n.parent; }
    c.renderOrder = 990 + bias + THREE.MathUtils.clamp(Math.round((z + 1) * 12), 0, 24);
  });
}

// ------------------------------------------------------------- viewmodel
export function createViewmodel(camera) {
  const group = new THREE.Group();
  group.name = 'viewmodel';
  Engine.scene.add(group);
  const sway = new THREE.Group();
  group.add(sway);

  const rigs = new Map(); // id -> rig
  let active = null;
  let lastState = null;
  let stateTotal = 0.4;
  let reloadEmpty = false;
  let kick = 0;
  let swingT = -1;
  let time = 0;
  const unsubs = [];

  function getRig(id) {
    if (rigs.has(id)) return rigs.get(id);
    const pose = VM_POSES[id] || VM_POSES.ridgeline;
    const root = new THREE.Group();
    root.name = `vmrig_${id}`;
    const weapon = buildWeaponModel(id, { firstPerson: true });
    weapon.scale.setScalar(pose.scale);
    root.add(weapon);
    applyVmRenderState(weapon, root, 0);

    const armR = buildArm(1);
    const gripR = weapon.userData.gripR ? weapon.userData.gripR.position : new THREE.Vector3();
    armR.position.copy(gripR).multiplyScalar(pose.scale);
    root.add(armR);
    applyVmRenderState(armR, root, 2);

    let armL = null, gripL0 = null;
    if (pose.left !== 'none') {
      armL = buildArm(-1);
      gripL0 = (weapon.userData.gripL ? weapon.userData.gripL.position.clone() : new THREE.Vector3())
        .multiplyScalar(pose.scale);
      armL.position.copy(gripL0);
      root.add(armL);
      applyVmRenderState(armL, root, 2);
    }

    // shotgun shell held during shell reloads
    let shell = null;
    if (id === 'boreas') {
      shell = buildShell(true);
      shell.visible = false;
      root.add(shell);
      applyVmRenderState(shell, root, 6);
    }

    const rig = {
      id, pose, root, weapon, armR, armL, gripL0, shell,
      mag: weapon.userData.magazine,
      magPos0: weapon.userData.magazine ? weapon.userData.magazine.position.clone() : null,
      bolt: weapon.userData.boltOrPump,
      boltPos0: weapon.userData.boltOrPump ? weapon.userData.boltOrPump.position.clone() : null,
      boltRot0: weapon.userData.boltOrPump ? weapon.userData.boltOrPump.rotation.clone() : null,
      muzzle: weapon.userData.muzzle,
      port: weapon.userData.shellEject,
    };
    root.visible = false;
    sway.add(root);
    rigs.set(id, rig);
    return rig;
  }

  function activate(id) {
    if (active && active.id === id) return;
    if (active) active.root.visible = false;
    active = getRig(id);
    active.root.visible = true;
  }

  unsubs.push(on('weapon-fire', (e) => {
    if (!e || e.byPlayer === false) return;
    kick = 1;
    if (e.melee) swingT = 0.42;
  }));
  unsubs.push(on('weapon-reload-start', (e) => { reloadEmpty = !!(e && e.empty); }));

  group.userData.muzzleWorld = () => {
    const v = new THREE.Vector3();
    if (active && active.muzzle) {
      group.updateMatrixWorld(true);
      active.muzzle.getWorldPosition(v);
    } else {
      v.copy(camera.position);
    }
    return v;
  };

  return {
    group,

    update(dt, weapons, player) {
      time += dt;
      kick = Math.max(0, kick - dt * 7);
      if (swingT >= 0) swingT -= dt;

      // follow the camera exactly (camera euler/quaternion stay in sync)
      group.position.copy(camera.position);
      group.quaternion.copy(camera.quaternion);
      group.visible = player.alive;
      if (!player.alive) return;

      const id = weapons.weaponId;
      if (!id) return;
      activate(id);
      const rig = active;
      const pose = rig.pose;
      const w = weapons.weapon;

      // ---- state change bookkeeping
      if (weapons.state !== lastState) {
        lastState = weapons.state;
        stateTotal = Math.max(weapons.timer, 0.016);
      }
      const sp = 1 - THREE.MathUtils.clamp(weapons.timer / stateTotal, 0, 1); // state progress 0..1

      const ads = THREE.MathUtils.clamp(player.adsFrac, 0, 1);
      const adsW = pose.ads ? smooth(ads) : 0;

      // ---- base position: hip carry -> ads
      const px = pose.ads ? THREE.MathUtils.lerp(pose.pos[0], pose.ads[0], adsW) : pose.pos[0];
      const py = pose.ads ? THREE.MathUtils.lerp(pose.pos[1], pose.ads[1], adsW) : pose.pos[1];
      const pz = pose.ads ? THREE.MathUtils.lerp(pose.pos[2], pose.ads[2], adsW) : pose.pos[2];
      let rx = pose.rot[0] * (1 - adsW);
      let ry = pose.rot[1] * (1 - adsW);
      let rz = pose.rot[2] * (1 - adsW);
      let ox = 0, oy = 0, oz = 0;

      // ---- reset per-frame animated parts
      if (rig.mag) { rig.mag.position.copy(rig.magPos0); rig.mag.visible = true; }
      if (rig.bolt) { rig.bolt.position.copy(rig.boltPos0); rig.bolt.rotation.copy(rig.boltRot0); }
      if (rig.armL) rig.armL.position.copy(rig.gripL0);
      if (rig.shell) rig.shell.visible = false;
      rig.weapon.visible = true;

      // ---- weapon states
      if (weapons.state === 'draw' || weapons.state === 'holster') {
        const dp = weapons.state === 'draw' ? smooth(sp) : 1 - smooth(sp);
        oy -= 0.3 * (1 - dp);
        oz += 0.06 * (1 - dp);
        rx -= 0.55 * (1 - dp);
        rz += 0.45 * (1 - dp);
      } else if (weapons.state === 'reload') {
        if (w.reloadPerShell) this._shellReload(rig, sp, (v) => { rx += v[0]; rz += v[1]; oy += v[2]; ry += v[3] || 0; });
        else this._magReload(rig, sp, reloadEmpty, (v) => { rx += v[0]; rz += v[1]; oy += v[2]; ry += v[3] || 0; });
      } else if (weapons.state === 'pump') {
        if (w.bolt) {
          // bolt lift - pull - push - close
          if (rig.bolt) {
            rig.bolt.rotation.z = (rig.boltRot0.z || 0) - tl(sp, [[0, 0], [0.22, 1.15], [0.72, 1.15], [0.95, 0]]);
            rig.bolt.position.z = rig.boltPos0.z + tl(sp, [[0.22, 0], [0.45, 0.075], [0.72, 0]]);
          }
          rx += tl(sp, [[0, 0], [0.3, 0.05], [0.7, 0.04], [1, 0]]);
          rz += tl(sp, [[0, 0], [0.3, 0.1], [1, 0]]);
        } else {
          // pump slide back/forward, left hand rides the forend
          const slide = tl(sp, [[0, 0], [0.38, 0.105], [0.8, 0], [1, 0]]);
          if (rig.bolt) rig.bolt.position.z = rig.boltPos0.z + slide;
          if (rig.armL && pose.left === 'pump') rig.armL.position.z = rig.gripL0.z + slide * pose.scale;
          rx += tl(sp, [[0, 0], [0.38, 0.045], [1, 0]]);
        }
      } else if (weapons.state === 'throw') {
        rig.weapon.visible = false; // grenade left the hand at state start
        oz += tl(sp, [[0, 0.08], [0.4, -0.2], [1, -0.04]]);
        oy += tl(sp, [[0, 0.05], [0.4, -0.04], [1, 0]]);
        rx += tl(sp, [[0, 0.55], [0.4, -0.55], [1, 0]]);
      }

      // ---- knife swing (fire event, not a weapons.state)
      if (swingT >= 0 && w.class === 'melee') {
        const kp = 1 - swingT / 0.42;
        ox += tl(kp, [[0, 0], [0.2, 0.07], [0.45, -0.16], [0.75, -0.05], [1, 0]]);
        oy += tl(kp, [[0, 0], [0.2, 0.04], [0.45, -0.07], [1, 0]]);
        rz += tl(kp, [[0, 0], [0.2, 0.3], [0.45, -0.75], [1, 0]]);
        ry += tl(kp, [[0, 0], [0.45, 0.65], [1, 0]]);
      }

      // ---- fire kick
      if (kick > 0 && w.class !== 'melee') {
        const kScale = THREE.MathUtils.clamp((w.recoilPitch || 1) / 1.4, 0.5, 2.6);
        oz += kick * 0.038 * kScale;
        oy += kick * 0.006 * kScale;
        rx += kick * 0.05 * kScale * (1 - adsW * 0.4);
        // pistol slide blowback
        if (id === 'vireo' && rig.bolt) rig.bolt.position.z = rig.boltPos0.z + kick * kick * 0.045;
      }

      // ---- idle sway (Lissajous) + movement bob + locomotion tilt
      const swayMul = (1 - adsW * 0.85);
      let sx = Math.sin(time * 0.9) * 0.0035 * swayMul + Math.sin(time * 1.7 + 1.2) * 0.0012 * swayMul;
      let sy = Math.sin(time * 1.5 + 0.7) * 0.0028 * swayMul;
      const bobA = player.bobAmp * swayMul;
      sx += Math.cos(player.bobPhase) * 0.013 * bobA;
      sy += Math.sin(player.bobPhase * 2) * 0.011 * bobA;
      // lateral tilt from strafe velocity
      const cosY = Math.cos(player.yaw), sinY = Math.sin(player.yaw);
      const latVel = player.vel.x * cosY - player.vel.z * sinY;   // camera-right component
      const fwdVel = -player.vel.x * sinY - player.vel.z * cosY;  // camera-forward component
      sway.rotation.set(
        player.landDip * 0.9 + Math.cos(player.bobPhase) * 0.004 * bobA - fwdVel * 0.002 * swayMul,
        0,
        THREE.MathUtils.clamp(-latVel * 0.009, -0.05, 0.05) * swayMul,
      );
      sway.position.set(sx, sy - player.landDip * 0.5 - player.crouchFrac * 0.012, 0);

      rig.root.position.set(px + ox, py + oy, pz + oz);
      rig.root.rotation.set(rx, ry, rz);
    },

    // magazine reload: tilt in, mag out + hand drops off-screen, new mag in,
    // seat jolt, charge on empty
    _magReload(rig, p, empty, addRot) {
      // cant the weapon so the magwell faces the camera, drop it slightly
      const inW = tl(p, [[0, 0], [0.14, 1], [0.72, 0.85], [0.9, 0]]);
      const jolt = tl(p, [[0.58, 0], [0.66, -0.016], [0.75, 0]]);
      addRot([0.16 * inW, 0.5 * inW, jolt - 0.045 * inW, 0.3 * inW]);
      const magY = tl(p, [[0, 0], [0.2, 0], [0.36, -0.3], [0.52, -0.3], [0.66, 0], [1, 0]]);
      if (rig.mag) {
        rig.mag.position.y = rig.magPos0.y + magY * 0.6;
        rig.mag.visible = magY > -0.29;
      }
      if (rig.armL && rig.mag) {
        const follow = tl(p, [[0, 0], [0.12, 1], [0.72, 1], [0.9, 0]]);
        const target = rig.mag.position.clone().multiplyScalar(rig.pose.scale);
        target.y += magY * 0.5;
        rig.armL.position.lerpVectors(rig.gripL0, target, follow);
      }
      if (empty && rig.bolt && rig.id !== 'longwatch') {
        rig.bolt.position.z = rig.boltPos0.z + tl(p, [[0.78, 0], [0.86, 0.055], [0.93, 0]]);
      }
    },

    // shell-by-shell: weapon tilts to the loading port, left hand feeds a
    // shell from below each cycle (weapons.timer cycles reloadPerShell)
    _shellReload(rig, pc, addRot) {
      addRot([0.14, 0.42, -0.03, 0.22]);
      const lift = tl(pc, [[0, 0], [0.42, 1], [0.6, 1], [1, 0]]);
      if (rig.armL && rig.port) {
        const target = rig.port.position.clone().multiplyScalar(rig.pose.scale);
        target.y -= 0.02;
        const down = rig.gripL0.clone().add(new THREE.Vector3(0.02, -0.24, 0.1));
        rig.armL.position.lerpVectors(down, target, smooth(lift));
        if (rig.shell) {
          rig.shell.visible = pc < 0.58;
          rig.shell.position.copy(rig.armL.position).add(new THREE.Vector3(0, -0.02, -0.055));
          rig.shell.rotation.set(Math.PI / 2, 0, 0);
        }
      }
    },

    dispose() {
      for (const u of unsubs) u();
      unsubs.length = 0;
      Engine.scene.remove(group);
    },
  };
}
