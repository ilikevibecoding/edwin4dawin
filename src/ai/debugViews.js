import * as THREE from 'three';

/**
 * Review views + exec recipes for the AI soldiers (registered on 'game:ready').
 *
 *   node tools/shot.mjs --out /tmp/shots/ai/lineup.png --view enemy_lineup --w 1280 --h 720 --quality medium --wait 0.3
 *   node tools/shot.mjs --out /tmp/shots/ai/death.png  --view enemy_death  --wait 1.2
 *   node tools/shot.mjs --out /tmp/shots/ai/cover.png  --view enemy_cover  --wait 0.6
 *   node tools/shot.mjs --out /tmp/shots/ai/combat.png --view enemy_combat --wait 4 --enemies
 *   node tools/shot.mjs --out /tmp/shots/ai/fire.png   --view enemy_fire   --wait 0 --frames 3   (freezes the sim, see fire())
 *   node tools/shot.mjs --out /tmp/shots/ai/far.png    --view enemy_far    --wait 0.3
 *
 * The views' `exec` strings call helpers on `game.enemies.debug`:
 *   lineup()   three scripted soldiers 6/10/14 m ahead: idle (low ready), aiming at the player, walking across
 *   death()    one soldier 7 m ahead killed by a headshot from the player's direction (falls away from the camera)
 *   cover()    one soldier crouched behind cover 8 m ahead, aiming at the player
 *   combat()   a real wave of 4 that advances / takes cover / fires
 *   snapshot() compact JSON of every soldier (state, position, speed, shots) for --exec functional tests
 *   closeup(dist, turn, { aim, crouch, walk })   one soldier close to the camera for material / gear review
 *   far(dist)  three soldiers ~40 m out (readability against the plaza)
 *   deathClose(dist)  a body-shot kill 4.5 m ahead falling sideways (ground contact check)
 *   fire(dist, side, { freezeAfter })  one soldier fires across the view (muzzle flash + tracer visibility)
 *
 * Extra views: enemy_closeup, enemy_closeup_aim, enemy_closeup_side, enemy_closeup_back, enemy_closeup_walk,
 * enemy_closeup_run, enemy_closeup_crouch, enemy_death_close, enemy_far, enemy_fire.
 */
export function registerEnemyDebugViews(game) {
  const d = game.debug;
  if (!d || typeof d.registerView !== 'function') return;
  const enemies = game.enemies;
  if (!enemies || enemies.debug) return;

  const playerPos = () => game.player.position.clone();
  const ahead = (dist, side = 0) => {
    const p = game.player;
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const pos = p.position.clone().addScaledVector(fwd, dist).addScaledVector(right, side);
    pos.y = enemies.groundHeight(pos.x, pos.z, p.position.y);
    return pos;
  };
  const aimPoint = () => game.player.eyePosition.clone().setY(game.player.eyePosition.y - 0.3);

  const helpers = {
    clear: () => enemies.clear(),

    lineup() {
      enemies.clear();
      const face = playerPos();
      const idle = enemies.spawn({ position: ahead(6, -2.2) }, { scripted: { face } });
      const aim = enemies.spawn({ position: ahead(10, 0.3) }, { scripted: { face, aim: aimPoint() } });
      const walker = enemies.spawn({ position: ahead(14, -1.5) }, { scripted: {} });
      const right = new THREE.Vector3(Math.cos(game.player.yaw), 0, -Math.sin(game.player.yaw));
      walker.scripted.move = walker.position.clone().addScaledVector(right, 40);
      walker.scripted.speed = 1.6;
      walker.yaw = Math.atan2(-right.x, -right.z);
      // Settle the walker's blend so the still frame shows a mid-stride walk.
      walker.model.animSpeed = 1.6;
      walker.speed = 1.6;
      return [idle, aim, walker];
    },

    death() {
      enemies.clear();
      const e = enemies.spawn({ position: ahead(7, 0.2) }, { scripted: { face: playerPos(), aim: aimPoint() } });
      e.model.aimBlend = 1;
      e.model.update(0, 0, e.yaw);
      const dir = e.position.clone().sub(game.player.position).setY(0).normalize();
      const head = e.model.bones.head ? e.model.bones.head.getWorldPosition(new THREE.Vector3()) : e.position.clone().setY(e.position.y + 1.65);
      enemies.damage(e, 500, { point: head, headshot: true, source: 'player', direction: dir, cause: 'bullet' });
      return e;
    },

    cover() {
      enemies.clear();
      const e = enemies.spawn({ position: ahead(8, 0) }, { scripted: { face: playerPos(), aim: aimPoint(), crouch: true } });
      e.model.crouch = 1;
      e.model.aimBlend = 1;
      return e;
    },

    combat(count = 4) {
      enemies.clear();
      return enemies.spawnWave(count);
    },

    snapshot: () => enemies.snapshot(),

    /** One soldier `dist` m ahead, turned by `turn` rad relative to facing the player (0 = facing). */
    closeup(dist = 3.6, turn = 0, { aim = false, crouch = false, walk = 0 } = {}) {
      enemies.clear();
      const p = game.player;
      const faceYaw = p.yaw + Math.PI; // facing the player
      const yaw = faceYaw + turn;
      // Aim at the player when facing them, otherwise straight ahead along the body (so a side view
      // shows the rifle in profile instead of foreshortened at the camera).
      let aimAt = null;
      if (aim) aimAt = Math.abs(turn) < 0.01 ? aimPoint() : ahead(dist, 0.25).add(new THREE.Vector3(-Math.sin(yaw) * 15, 1.45, -Math.cos(yaw) * 15));
      const e = enemies.spawn({ position: ahead(dist, 0.25), yaw }, { scripted: { aim: aimAt, crouch } });
      if (walk > 0) {
        const fwd = new THREE.Vector3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw));
        e.scripted.move = e.position.clone().addScaledVector(fwd, 40);
        e.scripted.speed = walk;
        e.model.animSpeed = walk;
        e.speed = walk;
      }
      if (aim) e.model.aimBlend = 1;
      if (crouch) e.model.crouch = 1;
      e.model.update(0, e.speed, e.yaw);
      return e;
    },

    /** Three soldiers ~40 m out against the far side of the plaza (readability check). */
    far(dist = 40) {
      enemies.clear();
      const face = playerPos();
      const a = enemies.spawn({ position: ahead(dist, -3) }, { scripted: { face } });
      const b = enemies.spawn({ position: ahead(dist + 2, 1.5) }, { scripted: { face, aim: aimPoint() } });
      const c = enemies.spawn({ position: ahead(dist - 3, 5) }, { scripted: { face, crouch: true } });
      b.model.aimBlend = 1;
      c.model.crouch = 1;
      for (const e of [a, b, c]) e.model.update(0, 0, e.yaw);
      return [a, b, c];
    },

    /**
     * Muzzle flash + tracer visibility check: one soldier `dist` m ahead and `side` m to the left fires
     * across the view (left to right) so the streak is seen in profile. The flash is held a few frames so
     * the still frame catches it. Tracers fly at 300 m/s and a plaza-range one lives only ~4 frames, while
     * the loop keeps stepping between the shot tool's frame wait and its canvas grab — so `freezeAfter`
     * (frames) stops the sim (game.timeScale = 0) right after the shot. Capture with --wait 0 --frames 3
     * (--wait uses game time and would never return); set game.timeScale = 1 before further --seq steps.
     */
    fire(dist = 12, side = -7, { freezeAfter = 0 } = {}) {
      enemies.clear();
      const p = game.player;
      const target = ahead(dist, side + 30).add(new THREE.Vector3(0, 1.45, 0));
      const e = enemies.spawn({ position: ahead(dist, side), yaw: p.yaw - Math.PI / 2 }, { scripted: { aim: target } });
      e.model.aimBlend = 1;
      e.model.update(0, 0, e.yaw);
      if (enemies.fx) enemies.fx.hold = 10;
      e.fireRound(target, 0);
      if (enemies.fx) enemies.fx.hold = 2;
      if (freezeAfter > 0 && d.waitFrames) {
        d.waitFrames(freezeAfter).then(() => {
          game.timeScale = 0;
        });
      }
      return e;
    },

    /** Death close to the camera, falling sideways so the ground contact is visible. */
    deathClose(dist = 4.5) {
      enemies.clear();
      const e = enemies.spawn({ position: ahead(dist, 0.3) }, { scripted: { face: playerPos(), aim: aimPoint() } });
      e.model.aimBlend = 1;
      e.model.update(0, 0, e.yaw);
      const right = new THREE.Vector3(Math.cos(game.player.yaw), 0, -Math.sin(game.player.yaw));
      const chest = e.model.getChest(new THREE.Vector3());
      enemies.damage(e, 500, { point: chest, headshot: false, source: 'player', direction: right.negate(), cause: 'bullet' });
      return e;
    },

    /** Aim the player's view at an enemy's head (for headless kill tests). */
    aimAt(enemy, part = 'head') {
      const b = enemy.model.bones;
      const bone = part === 'head' ? b.head : b.spine1;
      const target = bone ? bone.getWorldPosition(new THREE.Vector3()) : enemy.position.clone().setY(enemy.position.y + 1.3);
      if (part === 'head' && b.headTop) target.lerp(b.headTop.getWorldPosition(new THREE.Vector3()), 0.5);
      const eye = game.player.eyePosition;
      const dir = target.clone().sub(eye).normalize();
      const yaw = Math.atan2(-dir.x, -dir.z);
      const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      game.player.setView(null, THREE.MathUtils.radToDeg(yaw), THREE.MathUtils.radToDeg(pitch));
      return target;
    },
  };
  enemies.debug = helpers;

  d.registerView('enemy_lineup', { pos: [0, 0, 18], yaw: 0, pitch: 0, hud: false, exec: 'game.enemies.debug.lineup()' });
  d.registerView('enemy_death', { pos: [0, 0, 18], yaw: 0, pitch: -4, hud: false, exec: 'game.enemies.debug.death()' });
  d.registerView('enemy_cover', { pos: [0, 0, 18], yaw: 0, pitch: -2, hud: false, exec: 'game.enemies.debug.cover()' });
  d.registerView('enemy_combat', { pos: [0, 0, 18], yaw: 0, pitch: 2, hud: true, exec: 'game.enemies.debug.combat(4)' });
  // Material / gear inspection (weapon hidden, narrow FOV so the soldier fills the frame).
  const insp = { pos: [0, 0, 18], yaw: 0, pitch: -10, fov: 40, hud: false, weapon: false };
  d.registerView('enemy_closeup', { ...insp, exec: 'game.enemies.debug.closeup(3.6, 0)' });
  d.registerView('enemy_closeup_aim', { ...insp, exec: 'game.enemies.debug.closeup(3.6, 0, { aim: true })' });
  d.registerView('enemy_closeup_side', { ...insp, exec: 'game.enemies.debug.closeup(3.6, Math.PI / 2, { aim: true })' });
  d.registerView('enemy_closeup_back', { ...insp, exec: 'game.enemies.debug.closeup(3.6, Math.PI)' });
  d.registerView('enemy_closeup_walk', { ...insp, exec: 'game.enemies.debug.closeup(4.2, Math.PI / 2, { walk: 1.6 })' });
  d.registerView('enemy_closeup_run', { ...insp, exec: 'game.enemies.debug.closeup(4.2, Math.PI / 2, { walk: 4.5 })' });
  d.registerView('enemy_closeup_crouch', { ...insp, pitch: -14, exec: 'game.enemies.debug.closeup(3.6, 0, { aim: true, crouch: true })' });
  d.registerView('enemy_death_close', { ...insp, pitch: -18, fov: 50, exec: 'game.enemies.debug.deathClose(4.5)' });
  // fov pinned: a view without one inherits the previous view's (narrow) FOV inside a --seq session.
  d.registerView('enemy_far', { pos: [0, 0, 24], yaw: 0, pitch: 0, fov: 62, hud: false, exec: 'game.enemies.debug.far(36)' });
  d.registerView('enemy_fire', { pos: [0, 0, 18], yaw: 0, pitch: 0, fov: 62, hud: false, weapon: false, exec: 'game.enemies.debug.fire(12, -7, { freezeAfter: 2 })' });
}
