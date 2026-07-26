import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(70707);

// ===========================================================================
// Air strike killstreak: three-jet formation flies over the target point and
// carpet-bombs a line along the flight path. Flow: call -> 2.2s -> jets spawn
// ~500m out at 165 m/s -> red marker smoke on target -> sticks of bombs
// release on the run-in -> detonations ripple down the line ~t=5.4-6.2.
// Jets are procedural strike fighters: swept wings, twin canted tails,
// intakes, twin flickering afterburners, wingtip vapor + engine contrails.
// ===========================================================================

const JET_SPEED = 165;
const JET_ALT = 54;
const START_DIST = 500;
const BOMB_G = 42;

function jetMaterials() {
  return {
    hull: new THREE.MeshStandardMaterial({ color: 0x69707a, roughness: 0.38, metalness: 0.68, envMapIntensity: 1.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.5, metalness: 0.6 }),
    wing: new THREE.MeshStandardMaterial({ color: 0x4b525a, roughness: 0.42, metalness: 0.68, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x0e1c2a, roughness: 0.08, metalness: 0.8, envMapIntensity: 2.4 }),
    pale: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.45, metalness: 0.5 }),
  };
}

// Nose points along LOCAL +z so mesh.lookAt(pos + dir) flies nose-first.
function buildJet() {
  const g = new THREE.Group();
  const M = jetMaterials();

  // Fuselage: tapered tube, nose-ward radius smaller
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 7.6, 12), M.hull);
  fus.rotation.x = Math.PI / 2;
  fus.position.z = 0.6;
  g.add(fus);
  // Nose cone + dark radome tip
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.2, 12), M.hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 5.5;
  g.add(nose);
  const radome = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 10), M.dark);
  radome.rotation.x = Math.PI / 2;
  radome.position.z = 6.3;
  g.add(radome);
  // Canopy + dorsal spine
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), M.canopy);
  canopy.scale.set(0.6, 0.52, 1.9);
  canopy.position.set(0, 0.5, 2.8);
  g.add(canopy);
  const spine = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), M.hull);
  spine.scale.set(0.74, 0.42, 3.3);
  spine.position.set(0, 0.3, 0.1);
  g.add(spine);

  // Swept main wings (planform: x = span, y = forward; rotX(+90) -> y=>+z)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.45, 1.5);
  wingShape.lineTo(4.7, -1.3);
  wingShape.lineTo(4.7, -2.2);
  wingShape.lineTo(0.45, -2.7);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: false });
  const wingR = new THREE.Mesh(wingGeo, M.wing);
  wingR.rotation.x = Math.PI / 2;
  wingR.position.set(0, 0.03, 0.4);
  g.add(wingR);
  const wingL = new THREE.Mesh(wingGeo, M.wing);
  wingL.rotation.x = Math.PI / 2;
  wingL.scale.x = -1;
  wingL.position.set(0, 0.03, 0.4);
  g.add(wingL);

  // Wingtip missile rails
  for (const sx of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), M.pale);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 4.6, -0.02, -1.2);
    g.add(rail);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), M.pale);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(sx * 4.6, -0.02, -0.2);
    g.add(tip);
  }

  // Horizontal stabilizers (swept)
  const stabShape = new THREE.Shape();
  stabShape.moveTo(0.3, 0.4);
  stabShape.lineTo(2.05, -0.75);
  stabShape.lineTo(2.05, -1.35);
  stabShape.lineTo(0.3, -1.5);
  stabShape.closePath();
  const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.07, bevelEnabled: false });
  for (const sx of [1, -1]) {
    const st = new THREE.Mesh(stabGeo, M.wing);
    st.rotation.x = Math.PI / 2;
    st.scale.x = sx;
    st.position.set(0, 0.06, -2.5);
    g.add(st);
  }

  // Twin canted vertical tails (profile: x = forward, y = up; rotY(-90))
  const finShape = new THREE.Shape();
  finShape.moveTo(1.0, 0);
  finShape.lineTo(-0.7, 0);
  finShape.lineTo(-1.55, 1.5);
  finShape.lineTo(-0.62, 1.5);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
  for (const sx of [1, -1]) {
    const wrap = new THREE.Group();
    wrap.position.set(sx * 0.58, 0.26, -2.6);
    wrap.rotation.z = -sx * 0.28;
    const fin = new THREE.Mesh(finGeo, M.wing);
    fin.rotation.y = -Math.PI / 2;
    wrap.add(fin);
    g.add(wrap);
  }

  // Intakes flanking the fuselage
  for (const sx of [1, -1]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 2.6), M.hull);
    box.position.set(sx * 0.72, -0.14, 1.3);
    g.add(box);
    const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.54, 0.12), M.dark);
    inlet.position.set(sx * 0.72, -0.14, 2.62);
    g.add(inlet);
  }

  // Twin engine nozzles + afterburner double cones + hot cores
  const burners = [];
  for (const sx of [1, -1]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 10), M.dark);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(sx * 0.36, 0, -3.55);
    g.add(noz);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 3.1, 4.0), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.position.set(sx * 0.36, 0, -3.95);
    g.add(core);
    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 3.4, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 3.1, 4.4), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(sx * 0.36, 0, -5.65);
    g.add(inner);
    // faint wide cone: reads as heat haze behind the nozzles
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 6.2, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.95, 2.3), transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(sx * 0.36, 0, -7.05);
    g.add(outer);
    burners.push({ mesh: inner, phase: sx * 1.7 }, { mesh: outer, phase: sx * 0.6 + 2.4 });
  }

  g.traverse((m) => { if (m.isMesh && m.material.blending !== THREE.AdditiveBlending) m.castShadow = true; });
  g.userData.burners = burners;
  g.userData.engines = [new THREE.Vector3(0.36, 0, -4.6), new THREE.Vector3(-0.36, 0, -4.6)];
  g.userData.tips = [new THREE.Vector3(4.62, 0, -2.1), new THREE.Vector3(-4.62, 0, -2.1)];
  return g;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const CONTRAIL0 = new THREE.Color(0.82, 0.82, 0.86);
const CONTRAIL1 = new THREE.Color(0.68, 0.68, 0.72);
const VAPOR = new THREE.Color(0.95, 0.97, 1.0);
const BOMBTRAIL0 = new THREE.Color(0.56, 0.53, 0.48);
const BOMBTRAIL1 = new THREE.Color(0.4, 0.385, 0.365);
const BURNER_GLOW = new THREE.Color(1.7, 2.1, 3.2);
const MARKER_FLARE = new THREE.Color(1, 0.14, 0.09).multiplyScalar(5);
const MARKER_SMOKE0 = new THREE.Color(0.72, 0.11, 0.09);
const MARKER_SMOKE1 = new THREE.Color(0.42, 0.08, 0.07);

export class AirstrikeSystem {
  constructor(scene, physics, explosions, particles, player, audio) {
    this.scene = scene;
    this.physics = physics;
    this.explosions = explosions;
    this.particles = particles;
    this.player = player;
    this.audio = audio;

    this.jets = [];
    this.pendingBombs = [];   // {jetIndex, dropAt (s after spawn), target, T}
    this.fallingBombs = [];
    this.active = false;
    this.callTimer = -1;
    this.struck = false;      // first detonation happened (kills the marker)
    this.markerAcc = 0;
    this.strikeCenter = new THREE.Vector3();
    this.strikeDir = new THREE.Vector3(0, 0, -1);

    this.onStateChange = null; // HUD callback: 'called' | 'inbound' | 'done'

    // Shared bomb assets
    this.bombGeo = new THREE.CapsuleGeometry(0.17, 0.85, 4, 8);
    this.finGeo = new THREE.BoxGeometry(0.5, 0.3, 0.025);
    this.bombMat = new THREE.MeshStandardMaterial({ color: 0x2a2e26, roughness: 0.6, metalness: 0.5 });
  }

  buildBomb() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.bombGeo, this.bombMat);
    g.add(body);
    for (let i = 0; i < 2; i++) {
      const fin = new THREE.Mesh(this.finGeo, this.bombMat);
      fin.position.y = -0.5;
      fin.rotation.y = i * Math.PI / 2;
      fin.rotation.x = Math.PI / 2;
      g.add(fin);
    }
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  /** Call in a strike centered where the player is aiming. */
  call(camera) {
    if (this.active) return false;
    // Aim from the player state (authoritative even before the camera
    // matrix has been synced, e.g. in screenshot fast-forward mode).
    const p = this.player;
    const cy = Math.cos(p.pitch);
    const dir = new THREE.Vector3(-Math.sin(p.yaw) * cy, Math.sin(p.pitch), -Math.cos(p.yaw) * cy);
    const origin = new THREE.Vector3(p.position.x, p.position.y + 1.62, p.position.z);
    const hit = this.physics.raycast(origin, dir, 260);
    // Effective tactical range: pull distant aim points back to ~62m so the
    // carpet reads big in frame instead of hiding down the street.
    const dist = hit ? Math.min(hit.dist, 62) : 62;
    const target = origin.clone().addScaledVector(dir, dist);
    target.y = 0;
    target.x = THREE.MathUtils.clamp(target.x, -80, 80);
    target.z = THREE.MathUtils.clamp(target.z, -80, 80);

    this.strikeCenter.copy(target);
    this.strikeDir.set(dir.x, 0, dir.z).normalize();
    if (this.strikeDir.lengthSq() < 0.01) this.strikeDir.set(0, 0, -1);
    // Stage the carpet slightly left of the aim line so the nearest
    // detonations aren't masked by street-center props (parked cars).
    this.strikeCenter.addScaledVector(
      _v.set(-this.strikeDir.z, 0, this.strikeDir.x), -7);
    this.strikeCenter.x = THREE.MathUtils.clamp(this.strikeCenter.x, -80, 80);
    this.strikeCenter.z = THREE.MathUtils.clamp(this.strikeCenter.z, -80, 80);

    this.active = true;
    this.callTimer = 0;
    this.struck = false;
    this.markerAcc = 0;
    this.onStateChange?.('called');
    this.audio?.play('airstrikeCall');
    return true;
  }

  spawnJets() {
    const dir = this.strikeDir;
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    // Bomb fall time from release altitude (kinematic, exact)
    const T = Math.sqrt(2 * (JET_ALT - 1.6) / BOMB_G);

    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      const lateral = (i - 1) * 26;
      const behind = i === 1 ? 0 : 34; // echelon: leader ahead
      const start = this.strikeCenter.clone()
        .addScaledVector(dir, -START_DIST - behind)
        .addScaledVector(perp, lateral)
        .setY(JET_ALT + (i === 1 ? 0 : 4));
      jet.position.copy(start);
      jet.lookAt(start.clone().add(dir));
      jet.scale.setScalar(1.42);
      for (const off of jet.userData.engines) off.multiplyScalar(1.42);
      for (const off of jet.userData.tips) off.multiplyScalar(1.42);
      this.scene.add(jet);
      this.jets.push({
        mesh: jet, vel: dir.clone().multiplyScalar(JET_SPEED),
        age: 0, trailAcc: 0, tipAcc: 0, isLeader: i === 1, lateral,
        baseQuat: jet.quaternion.clone(), phase: i * 2.1,
      });

      // Stick of bombs along the carpet line; detonations ripple away
      // from the caller (~t=5.45 -> 6.4 absolute), spread wide enough that
      // fireballs overlap in time without stacking all at once.
      const bombCount = 3;
      for (let b = 0; b < bombCount; b++) {
        const along = (b - (bombCount - 1) / 2) * 11 + rng.range(-1.5, 1.5);
        const targetPos = this.strikeCenter.clone()
          .addScaledVector(dir, along)
          .addScaledVector(perp, lateral * 0.32 + rng.range(-2, 2));
        targetPos.y = 0;
        const landTime = 5.42 + ((along + 13) / 26) * 1.0 + (i === 1 ? 0 : 0.08) + rng.range(-0.02, 0.02);
        this.pendingBombs.push({
          jetIndex: this.jets.length - 1,
          dropAt: landTime - 2.2 - T,
          target: targetPos,
          T,
        });
      }
    }
    this.audio?.play('jetFlyby');
    this.onStateChange?.('inbound');
  }

  update(dt, time) {
    if (this.active) {
      const prev = this.callTimer;
      this.callTimer += dt;
      // 2.2s delay between call and jets appearing
      if (prev < 2.2 && this.callTimer >= 2.2) this.spawnJets();

      // ---- Red targeting marker at strike center until first impact ----
      if (!this.struck && this.callTimer > 0.4) {
        _v.copy(this.strikeCenter); _v.y += 0.7;
        this.particles.emit({
          pos: _v, count: 1, vel: _v2.set(0, 1.6, 0), spread: 0.15,
          life: [0.08, 0.12], size: [0.8, 1.3],
          color0: MARKER_FLARE, alpha: 1, additive: true,
          fadeIn: 0.01, fadeOutStart: 0.3, tex: 0,
        });
        this.markerAcc += dt;
        while (this.markerAcc >= 0.11) {
          this.markerAcc -= 0.11;
          _v.copy(this.strikeCenter); _v.y += 0.9;
          this.particles.emit({
            pos: _v, count: 1, vel: _v2.set(0, 3.1, 0), spread: 0.35,
            life: [1.8, 2.6], size: [0.8, 2.4], sizeEase: 0.6,
            color0: MARKER_SMOKE0, color1: MARKER_SMOKE1,
            alpha: 0.6, drag: 0.55, turb: 0.4,
            fadeIn: 0.1, fadeOutStart: 0.4, spinVel: 0.9, posJitter: 0.3, tex: 2,
          });
        }
      }
    }

    // ---- Jets ----
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.age += dt;
      j.mesh.position.addScaledVector(j.vel, dt);

      // Bank into the pass (hardest just before overhead) + a lazy wobble
      const over = (START_DIST - 80) / JET_SPEED;
      const lean = 0.34 * Math.exp(-Math.pow((j.age - over) / 1.15, 2));
      const roll = lean * (j.lateral === 0 ? 0.7 : (j.lateral > 0 ? 1.2 : -1.2))
        + 0.09 * Math.sin(j.age * 0.9 + j.phase);
      j.mesh.quaternion.copy(j.baseQuat);
      j.mesh.rotateZ(roll);

      // Afterburner flicker (deterministic)
      const burners = j.mesh.userData.burners;
      for (let k = 0; k < burners.length; k++) {
        const b = burners[k];
        b.mesh.scale.y = 1 + 0.24 * Math.sin(time * 57 + b.phase) + 0.09 * Math.sin(time * 131 + b.phase * 2.3);
        const w = 1 + 0.1 * Math.sin(time * 83 + b.phase * 1.9);
        b.mesh.scale.x = w; b.mesh.scale.z = w;
      }

      const nearPlayer = j.mesh.position.distanceTo(this.player.position) < 480;
      if (nearPlayer && j.age < 6.5) {
        // Camera-facing burner glow dots (the cones read edge-on from below)
        for (const off of j.mesh.userData.engines) {
          _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position);
          this.particles.emit({
            pos: _v, count: 1, vel: _v2.set(0, 0, 0), spread: 0,
            life: [0.05, 0.08], size: [1.9, 1.1],
            color0: BURNER_GLOW, alpha: 0.9, additive: true,
            fadeIn: 0.01, fadeOutStart: 0.3, tex: 0,
          });
        }
      }
      if (j.age < 6.5 && nearPlayer) {
        // Contrail: a thin stretched ribbon down the center line keeps the
        // trail continuous right behind the nozzles (segments ride along the
        // straight flight path, so their motion is invisible), while soft
        // expanding puffs grow into the fluffy aged body of the trail.
        j.trailAcc += dt;
        while (j.trailAcc >= 0.016) {
          j.trailAcc -= 0.016;
          j.trailTick = (j.trailTick ?? 0) + 1;
          const E = j.mesh.userData.engines;
          _v.copy(E[0]).add(E[1]).multiplyScalar(0.5)
            .applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
            .addScaledVector(j.vel, -j.trailAcc);
          if (j.trailTick % 2 === 0) {
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0,
              life: [1.1, 1.5], size: [0.55, 1.3],
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.34, drag: 0.55,
              fadeIn: 0.02, fadeOutStart: 0.55,
              stretch: 0.045, lenMax: 8,
            });
          } else {
            // Aged body of the trail: softening, expanding puffs
            this.particles.emit({
              pos: _v, count: 1, vel: _v2.set(0, 0.35, 0), spread: 0.18,
              life: [2.2, 3.4], size: [3.2, 5.2], sizeEase: 0.55,
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.22, drag: 0.35, spinVel: 0.45,
              fadeIn: 0.05, fadeOutStart: 0.42, tex: 3,
            });
          }
          if (j.trailTick % 2 === 1) {
            for (const off of E) {
              _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
                .addScaledVector(j.vel, -j.trailAcc);
              this.particles.emit({
                pos: _v, count: 1, vel: _v2.set(0, 0.2, 0), spread: 0.08,
                life: [0.3, 0.45], size: [0.7, 1.5], sizeEase: 0.6,
                color0: CONTRAIL0, color1: CONTRAIL1,
                alpha: 0.3, drag: 0.5,
                fadeIn: 0.03, fadeOutStart: 0.4, tex: 3,
              });
            }
          }
        }
        // Thin white wingtip vapor threads (stretched quads bridge the gaps)
        j.tipAcc += dt;
        while (j.tipAcc >= 0.03) {
          j.tipAcc -= 0.03;
          for (const off of j.mesh.userData.tips) {
            _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
              .addScaledVector(j.vel, -j.tipAcc);
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0.02,
              life: [0.26, 0.4], size: [0.18, 0.07],
              color0: VAPOR, alpha: 0.6, drag: 26,
              fadeIn: 0.02, fadeOutStart: 0.5,
              stretch: 0.034, lenMax: 8,
            });
          }
        }
      }

      if (j.age > 9) {
        this.scene.remove(j.mesh);
        this.jets.splice(i, 1);
      }
    }

    // ---- Bomb releases ----
    if (this.pendingBombs.length > 0) {
      for (let i = this.pendingBombs.length - 1; i >= 0; i--) {
        const b = this.pendingBombs[i];
        const jet = this.jets[b.jetIndex];
        if (!jet) { this.pendingBombs.splice(i, 1); continue; }
        b.dropAt -= dt;
        if (b.dropAt <= 0) {
          const mesh = this.buildBomb();
          mesh.position.copy(jet.mesh.position).add(_v.set(0, -1.6, 0));
          this.scene.add(mesh);
          this.fallingBombs.push({
            mesh,
            dropPos: mesh.position.clone(),
            y0: mesh.position.y,
            target: b.target,
            T: b.T,
            age: 0, trailAcc: 0, whistled: false,
          });
          this.pendingBombs.splice(i, 1);
        }
      }
    }

    // ---- Falling bombs: kinematic arc, lands exactly on target at T ----
    for (let i = this.fallingBombs.length - 1; i >= 0; i--) {
      const b = this.fallingBombs[i];
      b.age += dt;
      const sN = Math.min(b.age / b.T, 1);
      const pos = b.mesh.position;
      pos.x = b.dropPos.x + (b.target.x - b.dropPos.x) * sN;
      pos.z = b.dropPos.z + (b.target.z - b.dropPos.z) * sN;
      pos.y = b.y0 * (1 - sN * sN);
      // Orient nose-down along the instantaneous velocity
      _v.set(
        (b.target.x - b.dropPos.x) / b.T,
        -2 * b.y0 * sN / b.T,
        (b.target.z - b.dropPos.z) / b.T
      );
      _v2.copy(pos).add(_v);
      b.mesh.lookAt(_v2);
      b.mesh.rotateX(Math.PI / 2);

      // Thin grey smoke trail: stretched ribbon segments bridging the
      // spacing (continuous line) + soft puffs that dissolve behind.
      _v3.copy(_v); // instantaneous velocity, preserved across the loop
      b.trailAcc += dt;
      b.puffAcc = (b.puffAcc ?? 0) + dt;
      while (b.trailAcc >= 0.036) {
        b.trailAcc -= 0.036;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.trailAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v3, spread: 0,
          life: [0.85, 1.3], size: [0.42, 0.26],
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.38, drag: 0.45,
          fadeIn: 0.02, fadeOutStart: 0.4,
          stretch: 0.062, lenMax: 10,
        });
      }
      // Soft puffs linger and expand: trail dissolves over ~3s, not a wire
      while (b.puffAcc >= 0.11) {
        b.puffAcc -= 0.11;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.puffAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v.set(0, 0.45, 0), spread: 0.14,
          life: [1.4, 2.4], size: [1.4, 3.4], sizeEase: 0.55,
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.22, drag: 0.6, spinVel: 0.5,
          fadeIn: 0.05, fadeOutStart: 0.42, tex: 3,
        });
      }

      // Whistle as it commits to the dive
      if (sN > 0.35 && !b.whistled) {
        b.whistled = true;
        this.audio?.play('bombWhistle', this.player.position.distanceTo(b.target));
      }

      if (sN >= 1) {
        this.scene.remove(b.mesh);
        this.fallingBombs.splice(i, 1);
        this.struck = true;
        this.explosions.explode(b.target.clone(), { size: 1.7, damage: 190, radius: 12 });
      }
    }

    // ---- Wrap up ----
    if (this.active && this.callTimer > 12 && this.jets.length === 0 && this.fallingBombs.length === 0 && this.pendingBombs.length === 0) {
      this.active = false;
      this.onStateChange?.('done');
    }
  }
}
