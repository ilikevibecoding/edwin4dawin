import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { WorldPhysics } from './core/physics.js';
import { GameMap } from './world/map.js';
import { Sky } from './world/sky.js';
import { applyEnvironment } from './world/materials.js';
import { PlayerController } from './player/controller.js';
import { Viewmodel } from './weapons/viewmodel.js';
import { WeaponSystem } from './weapons/weapons.js';
import { EnemyManager } from './enemies/enemies.js';
import { ParticleSystem } from './fx/particles.js';
import { ImpactFX } from './fx/impacts.js';
import { ExplosionFX } from './fx/explosions.js';
import { AirstrikeSystem } from './fx/airstrike.js';
import { HUD } from './ui/hud.js';
import { AudioSystem } from './audio/audio.js';
import { SHOT_MODE, getParamFloat, getParamStr, clamp } from './core/utils.js';

// ===========================================================================
// ASHFALL PROTOCOL — bootstrap + game loop.
// ===========================================================================

const container = document.getElementById('app');
const engine = new Engine(container);
const input = new Input(engine.renderer.domElement);
const audio = new AudioSystem();
const hud = new HUD();

const map = new GameMap(engine.scene);
const sky = new Sky(engine.scene, engine.renderer);
applyEnvironment(sky.envMap);
const physics = new WorldPhysics(map.colliders);

const player = new PlayerController(engine.camera, input, physics);
const viewmodel = new Viewmodel(engine);
viewmodel.setEnvironment(sky.envMap);

const particles = new ParticleSystem(engine.scene);
const impacts = new ImpactFX(engine.scene, particles);
const weapons = new WeaponSystem(engine, player, physics, viewmodel, impacts, audio);
const enemies = new EnemyManager(engine.scene, physics, map, player, particles, impacts, weapons.tracers, audio);
const explosions = new ExplosionFX(engine.scene, particles, impacts, player, audio);
const airstrike = new AirstrikeSystem(engine.scene, physics, explosions, particles, player, audio);

weapons.enemyManager = enemies;
explosions.enemyManager = enemies;

// ---------------------------------------------------------------------------
// Game state + HUD wiring
// ---------------------------------------------------------------------------
const STREAK_KILLS = 4;
const state = {
  started: SHOT_MODE,
  killsSinceStreak: 0,
  streakReady: false,
  footstepDist: 0,
};

const ENEMY_NAMES = ['V. Sokolov', 'K. Petrov', 'A. Volkov', 'D. Morozov', 'Y. Lebedev', 'M. Kuznetsov', 'S. Fedorov', 'I. Popov'];
let nameIdx = 0;

enemies.onKill = (e, headshot) => {
  const name = ENEMY_NAMES[nameIdx++ % ENEMY_NAMES.length];
  hud.killfeed(`<span class="you">YOU</span> <span class="skull">${headshot ? '☠ HEADSHOT' : '✕'}</span> ${name}`);
  if (!state.streakReady) {
    state.killsSinceStreak++;
    if (state.killsSinceStreak >= STREAK_KILLS) {
      state.streakReady = true;
      hud.banner('AIRSTRIKE READY', 'PRESS [4] TO CALL IT IN');
      audio.play('streakReady');
    }
  }
};

enemies.onPlayerHit = (shotDir) => {
  // Source direction relative to facing
  const srcAngle = Math.atan2(-shotDir.x, -shotDir.z);
  const rel = srcAngle - player.yaw;
  hud.damageFrom(-rel + Math.PI);
};

weapons.onHit = (kind) => {
  hud.hitmarker(kind === 'kill' || kind === 'headshot');
};

airstrike.onStateChange = (s) => {
  if (s === 'called') hud.banner('AIRSTRIKE INBOUND', 'DANGER CLOSE — CHECK YOUR MAP');
};

// ---------------------------------------------------------------------------
// Start / respawn flow
// ---------------------------------------------------------------------------
engine.renderer.domElement.addEventListener('mousedown', () => {
  if (!state.started) {
    state.started = true;
    hud.hideStart();
  }
  audio.init();
});

function respawn() {
  player.health = player.maxHealth;
  player.dead = false;
  player.position.set(0, 0, 58);
  player.velocity.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = 0;
  weapons.ammo = weapons.magSize;
  weapons.reserve = 210;
  state.killsSinceStreak = 0;
  state.streakReady = false;
}

// ---------------------------------------------------------------------------
// Shot mode — deterministic scene states for the screenshot pipeline
// ---------------------------------------------------------------------------
function setupShotMode() {
  const px = getParamFloat('px', 0);
  const py = getParamFloat('py', 0);
  const pz = getParamFloat('pz', 58);
  const yaw = getParamFloat('yaw', 0);
  const pitch = getParamFloat('pitch', 0);
  const scenario = getParamStr('scene', 'street');
  const ff = getParamFloat('t', 1.0);      // seconds to fast-forward
  const hudOn = getParamFloat('hud', 1);

  player.position.set(px, py, pz);
  player.yaw = yaw;
  player.pitch = pitch;

  if (hudOn < 0.5) hud.root.style.display = 'none';
  hud.el.startScreen.classList.add('hidden');

  // Scenario staging
  if (scenario === 'street' || scenario === 'combat') {
    const spots = [
      new THREE.Vector3(px - 6, 0, pz - 22),
      new THREE.Vector3(px + 7, 0, pz - 30),
      new THREE.Vector3(px - 2, 0, pz - 42),
    ];
    for (const s of spots) {
      s.x = clamp(s.x, -78, 78); s.z = clamp(s.z, -78, 78);
      const e = enemies.spawn(s);
      e.yaw = yaw + Math.PI; // face the camera
      e.soldier.root.rotation.y = e.yaw;
      if (scenario === 'street') e.pauseTimer = 999; // hold fire for clean stills
    }
    enemies.spawnCooldown = 999; // freeze extra spawning for determinism
  }
  if (scenario === 'combat') {
    // Mid-firefight: force a burst + player muzzle flash
    for (const e of enemies.enemies) { e.burstLeft = 4; e.pauseTimer = 0; }
  }
  if (scenario === 'closeup') {
    // Character presentation: lead soldier at 3.1m so kit detail fills the
    // frame, 3/4 front, aiming off-frame; wingman holding depth at 9m.
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const a = enemies.spawn(
      new THREE.Vector3().copy(fwd).multiplyScalar(3.1).addScaledVector(right, -1.15).add(new THREE.Vector3(px, 0, pz))
    );
    // 3/4 front toward camera, weapon across body, clear of the viewmodel
    a.yaw = yaw + Math.PI + 0.5;
    a.soldier.root.rotation.y = a.yaw;
    a.pauseTimer = 999;
    a.burstLeft = 0;
    const b = enemies.spawn(
      new THREE.Vector3().copy(fwd).multiplyScalar(9).addScaledVector(right, 2.2).add(new THREE.Vector3(px, 0, pz))
    );
    b.yaw = yaw + Math.PI - 0.35;
    b.soldier.root.rotation.y = b.yaw;
    b.pauseTimer = 999;
    enemies.spawnCooldown = 999;
  }
  if (scenario === 'airstrike') {
    enemies.spawnCooldown = 999;
    // Call strike immediately; ff time controls which phase we capture
    airstrike.call(engine.camera);
  }
  if (scenario === 'empty') enemies.spawnCooldown = 999;

  // Fast-forward simulation with fixed steps
  const steps = Math.floor(ff * 60);
  for (let i = 0; i < steps; i++) tick(1 / 60, i / 60);

  if (getParamFloat('fire', 0) > 0.5) {
    weapons.cooldown = 0;
    weapons.fire(engine.camera);
    tick(1 / 60, ff);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let elapsed = 0;

function tick(dt, time) {
  if (state.started && !player.dead) {
    player.aimingFraction = viewmodel.aimFrac;
    player.update(dt, time);

    // Footsteps
    if (player.onGround) {
      const sp = Math.hypot(player.velocity.x, player.velocity.z);
      state.footstepDist += sp * dt;
      const stride = player.sprinting ? 2.9 : 2.1;
      if (state.footstepDist > stride && sp > 0.8) {
        state.footstepDist = 0;
        audio.play('footstep');
      }
    }

    // Reload
    if (input.wasPressed('KeyR')) weapons.tryReload();

    // Airstrike call
    if (input.wasPressed('Digit4') && state.streakReady && !airstrike.active) {
      if (airstrike.call(engine.camera)) {
        state.streakReady = false;
        state.killsSinceStreak = 0;
      }
    }

    // ADS + FOV
    const aiming = input.rightDown;
    engine.setFov(THREE.MathUtils.lerp(74, 52, viewmodel.aimFrac));

    viewmodel.update(dt, {
      aiming,
      sprinting: player.sprinting,
      moveNorm: player.bobAmp,
      mouseDX: input.mouseDX,
      mouseDY: input.mouseDY,
      bobPhase: player.bobPhase,
      onGround: player.onGround,
    });

    weapons.update(dt, engine.camera, input.mouseDown && input.locked || (SHOT_MODE && false));
  } else if (player.dead) {
    player.update(dt, time);
    viewmodel.update(dt, { aiming: false, sprinting: false, moveNorm: 0, mouseDX: 0, mouseDY: 0, bobPhase: 0, onGround: true });
    if (input.wasPressed('Space')) respawn();
  }

  enemies.update(dt, time);
  airstrike.update(dt, time);
  explosions.update(dt);
  particles.update(dt);
  sky.update(player.position);

  hud.update(dt, {
    yaw: player.yaw,
    health: player.health,
    maxHealth: player.maxHealth,
    ammo: weapons.ammo,
    reserve: weapons.reserve,
    kills: enemies.kills,
    streakProgress: state.streakReady ? 1 : state.killsSinceStreak / STREAK_KILLS,
    streakKillsLeft: STREAK_KILLS - state.killsSinceStreak,
    streakReady: state.streakReady,
    aiming: viewmodel.aimFrac,
    spread: weapons.bloom * 0.02 + (1 - viewmodel.aimFrac) * 0.012 + player.moveSpeedNormalized * 0.02,
    dead: player.dead,
  });

  input.endFrame();
}

let last = performance.now();
let framesRendered = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  elapsed += dt;

  if (SHOT_MODE && framesRendered >= 3) {
    // Freeze after the shot frame so headless capture isn't starved by
    // continuous (slow) software renders.
    window.__SHOT_READY = true;
    return;
  }

  if (!SHOT_MODE) tick(dt, elapsed);
  engine.render();
  framesRendered++;
}

if (SHOT_MODE) {
  setupShotMode();
}

animate();
