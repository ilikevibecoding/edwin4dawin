import * as THREE from 'three';

/**
 * Review views + exec recipes for the AI soldiers (registered on 'game:ready').
 *
 *   node tools/shot.mjs --out /tmp/shots/ai/lineup.png --view enemy_lineup --w 1280 --h 720 --quality medium --wait 0.3
 *   node tools/shot.mjs --out /tmp/shots/ai/death.png  --view enemy_death  --wait 1.2
 *   node tools/shot.mjs --out /tmp/shots/ai/cover.png  --view enemy_cover  --wait 0.6
 *   node tools/shot.mjs --out /tmp/shots/ai/combat.png --view enemy_combat --wait 4 --enemies
 *
 * The views' `exec` strings call helpers on `game.enemies.debug`:
 *   lineup()   three scripted soldiers 6/10/14 m ahead: idle (low ready), aiming at the player, walking across
 *   death()    one soldier 7 m ahead killed by a headshot from the player's direction (falls away from the camera)
 *   cover()    one soldier crouched behind cover 8 m ahead, aiming at the player
 *   combat()   a real wave of 4 that advances / takes cover / fires
 *   snapshot() compact JSON of every soldier (state, position, speed, shots) for --exec functional tests
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
}
