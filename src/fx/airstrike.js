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
  // Painted airframe grey, NOT bare metal: high metalness zeroed the diffuse
  // term, which is exactly what made the jets float as unlit cutouts from
  // below. Dielectric-ish materials pick up the sun, the warm hemisphere
  // bounce on their undersides and the sky env — they read as lit aircraft.
  return {
    hull: new THREE.MeshStandardMaterial({ color: 0xa2a8b0, roughness: 0.46, metalness: 0.32, envMapIntensity: 2.0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.55, metalness: 0.45 }),
    wing: new THREE.MeshStandardMaterial({ color: 0x9098a2, roughness: 0.5, metalness: 0.32, envMapIntensity: 1.9, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x16283a, roughness: 0.07, metalness: 0.75, envMapIntensity: 2.6 }),
    pale: new THREE.MeshStandardMaterial({ color: 0xb3b9bf, roughness: 0.48, metalness: 0.3 }),
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
    // tight blinding core
    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 3.0, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 4.2, 5.6), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(sx * 0.36, 0, -5.45);
    g.add(inner);
    // wide soft plume / heat haze behind the nozzles
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 6.8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.95, 2.3), transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(sx * 0.36, 0, -7.35);
    g.add(outer);
    burners.push({ mesh: inner, phase: sx * 1.7 }, { mesh: outer, phase: sx * 0.6 + 2.4 });
  }

  // Engine glow spills onto the aft fuselage so the jet isn't a flat dark
  // mass ignoring its own light source. Backed up by a small-radius pooled
  // PointLight per jet (see AirstrikeSystem) that lights the tail for real.
  const aftGlow = new THREE.MeshStandardMaterial({
    color: 0x343a42,
    emissive: new THREE.Color(0.45, 0.58, 0.9),
    emissiveIntensity: 1.25,
    roughness: 0.5, metalness: 0.4,
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 1.5, 12), aftGlow);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0, -3.0);
  g.add(collar);

  g.traverse((m) => { if (m.isMesh && m.material.blending !== THREE.AdditiveBlending) m.castShadow = true; });
  g.userData.burners = burners;
  g.userData.engines = [new THREE.Vector3(0.36, 0, -4.6), new THREE.Vector3(-0.36, 0, -4.6)];
  g.userData.tips = [new THREE.Vector3(4.62, 0, -2.1), new THREE.Vector3(-4.62, 0, -2.1)];
  return g;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const CONTRAIL0 = new THREE.Color(0.72, 0.72, 0.76);
const CONTRAIL1 = new THREE.Color(0.58, 0.58, 0.62);
const VAPOR = new THREE.Color(0.95, 0.97, 1.0);
const BOMBTRAIL0 = new THREE.Color(0.78, 0.76, 0.72);
const BOMBTRAIL1 = new THREE.Color(0.52, 0.5, 0.48);
// Prevailing wind as an acceleration: aged trail sections shear downwind,
// wander and fatten instead of hanging as ruler-drawn lines.
const WIND = new THREE.Vector3(1.8, 0.45, -0.85);
const WIND_SOFT = new THREE.Vector3(0.8, 0.3, -0.4);
const BURNER_GLOW = new THREE.Color(1.7, 2.1, 3.2);
const BURNER_HOT = new THREE.Color(2.8, 2.3, 1.7);
const BURNER_TAIL = new THREE.Color(1.1, 0.85, 0.7);
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

    // Small-radius afterburner light per formation slot so the tails glow
    // for real. Created up-front at intensity 0: the forward renderer's
    // light count stays fixed (adding lights mid-run recompiles shaders).
    this.jetLights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0x7fa4ff, 0, 17, 2);
      scene.add(l);
      this.jetLights.push(l);
    }
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
    // Effective tactical range: pull distant aim points back to ~50m so the
    // carpet reads big in frame instead of hiding down the street.
    const dist = hit ? Math.min(hit.dist, 50) : 50;
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
        light: this.jetLights[i],
      });

      // Stick of bombs along the carpet line; detonations ripple away
      // from the caller (~t=5.35 -> 6.5 absolute), spread wide enough that
      // fireballs overlap in time without stacking all at once — and so a
      // t=5.6 still catches a DEVELOPED fireball (hot core + soot rim)
      // alongside a fresh flash, not just point-blank white pops.
      const bombCount = 3;
      for (let b = 0; b < bombCount; b++) {
        const along = (b - (bombCount - 1) / 2) * 11 + rng.range(-1.5, 1.5);
        const targetPos = this.strikeCenter.clone()
          .addScaledVector(dir, along)
          .addScaledVector(perp, lateral * 0.32 + rng.range(-2, 2));
        targetPos.y = 0;
        const landTime = 5.18 + ((along + 13) / 26) * 1.1 + (i === 1 ? 0 : 0.09) + rng.range(-0.02, 0.02);
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
      // Burner point light rides between the nozzles, flickering with the
      // cones, so the whole tail group actually glows.
      const E0 = j.mesh.userData.engines;
      j.light.position.copy(E0[0]).add(E0[1]).multiplyScalar(0.5)
        .applyQuaternion(j.mesh.quaternion).add(j.mesh.position);
      j.light.intensity = 70 + 24 * Math.sin(time * 47 + j.phase * 3.1);

      const nearPlayer = j.mesh.position.distanceTo(this.player.position) < 480;
      if (nearPlayer && j.age < 6.5) {
        // Camera-facing burner glow dots (the cones read edge-on from below)
        // Tight burner glow riding WITH the jet (vel = jet vel so the dots
        // pile on the nozzle instead of smearing into a luminous rope)
        for (const off of j.mesh.userData.engines) {
          _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position);
          this.particles.emit({
            pos: _v, count: 1, vel: j.vel, spread: 0,
            life: [0.05, 0.08], size: [1.7, 1.0],
            color0: BURNER_GLOW, alpha: 0.9, additive: true,
            fadeIn: 0.01, fadeOutStart: 0.3, tex: 0,
          });
        }
      }
      if (j.age < 6.5 && nearPlayer) {
        // Contrail, split in two stages: a HOT bright segment right at the
        // nozzles, then the grey smoke ribbon + soft puff body behind it.
        j.trailAcc += dt;
        while (j.trailAcc >= 0.016) {
          j.trailAcc -= 0.016;
          j.trailTick = (j.trailTick ?? 0) + 1;
          j.trailSeed = (j.trailSeed ?? 0) + 0.21;
          const E = j.mesh.userData.engines;
          // hot exhaust streaks at both nozzles (short additive ribbons)
          for (const off of E) {
            _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
              .addScaledVector(j.vel, -j.trailAcc);
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0,
              life: [0.1, 0.16], size: [0.3, 0.18],
              color0: BURNER_HOT, color1: BURNER_TAIL,
              alpha: 0.7, additive: true, drag: 0.1,
              fadeIn: 0.01, fadeOutStart: 0.35,
              stretch: 0.05, lenMax: 3.5,
            });
          }
          _v.copy(E[0]).add(E[1]).multiplyScalar(0.5)
            .applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
            .addScaledVector(j.vel, -j.trailAcc - 0.028);
          if (j.trailTick % 2 === 0) {
            // grey smoke ribbon starting behind the hot segment; tapers
            // (thin at the nozzle, fattening with age), decelerates and
            // picks up turbulence + wind so old sections stop tracking the
            // jet's vector and start to smear
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0.1,
              life: [1.1, 1.5], size: [0.6, 2.0], sizeEase: 0.6,
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.4, drag: 1.1, seed: j.trailSeed, turb: 0.4, wind: WIND_SOFT,
              fadeIn: 0.02, fadeOutStart: 0.5,
              stretch: 0.045, lenMax: 8,
            });
          } else {
            // Aged body of the trail: softening, expanding puffs drifting
            // downwind — the dissipated tail of the contrail
            this.particles.emit({
              pos: _v, count: 1, vel: _v2.set(0, 0.35, 0), spread: 0.2,
              life: [2.6, 4.2], size: [3.0, 6.6], sizeEase: 0.55,
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.22, drag: 0.4, spinVel: 0.45, turb: 0.5, wind: WIND_SOFT,
              fadeIn: 0.05, fadeOutStart: 0.42, tex: 3,
            });
          }
        }
        // Wingtip vortex ribbons — surge while the jet is banked (lean)
        j.tipAcc += dt;
        while (j.tipAcc >= 0.03) {
          j.tipAcc -= 0.03;
          for (const off of j.mesh.userData.tips) {
            _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
              .addScaledVector(j.vel, -j.tipAcc);
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0.02,
              life: [0.3 + lean * 0.9, 0.5 + lean * 1.1], size: [0.2, 0.09],
              color0: VAPOR, alpha: 0.3 + lean * 1.5, drag: 22,
              fadeIn: 0.02, fadeOutStart: 0.5,
              stretch: 0.04, lenMax: 9,
            });
          }
        }
      }

      if (j.age > 9) {
        this.scene.remove(j.mesh);
        j.light.intensity = 0;
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

      // Ribbon trail with an AGE GRADIENT, never a ruler line:
      //  - fresh segments at the bomb are thin, fast and tight;
      //  - high drag freezes them in air, so the stretch length collapses
      //    while the width GROWS (taper: tight tip -> fat old root);
      //  - turbulence + wind shear make aged sections wander downwind;
      //  - alpha dissipates from ~45% of life (erosion noise threads
      //    smoothly segment-to-segment via cfg.seed so nothing beads).
      _v3.copy(_v); // instantaneous velocity, preserved across the loop
      b.trailAcc += dt;
      b.puffAcc = (b.puffAcc ?? 0) + dt;
      while (b.trailAcc >= 0.024) {
        b.trailAcc -= 0.024;
        b.trailSeed = (b.trailSeed ?? 0) + 0.27;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.trailAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v3, spread: 0.06,
          life: [1.5, 1.9], size: [0.35, 1.5], sizeEase: 0.6,
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.55, drag: 2.2, seed: b.trailSeed, turb: 0.5, wind: WIND,
          fadeIn: 0.02, fadeOutStart: 0.5,
          stretch: 0.09, lenMax: 9,
        });
      }
      // Dissipation body: old sections hand off to fat soft puffs that
      // blow downwind and thin out (the smoke the line dissolves into).
      while (b.puffAcc >= 0.09) {
        b.puffAcc -= 0.09;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.puffAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v.set(0, 0.35, 0), spread: 0.25,
          life: [2.0, 3.2], size: [1.8, 5.2], sizeEase: 0.5,
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.22, drag: 0.55, spinVel: 0.6, turb: 0.55, wind: WIND,
          fadeIn: 0.25, fadeOutStart: 0.4, tex: 3,
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
