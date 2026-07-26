import * as THREE from 'three';
import { rand, randRange, randSpread } from '../core/rand.js';
import { SoldierFactory } from './soldier-model.js';
import { Enemy } from './enemy.js';
import { HEAR_RANGE } from './behavior.js';

const _v = new THREE.Vector3();
const _sphere = new THREE.Sphere(new THREE.Vector3(), 1.3);
const _ray = new THREE.Raycaster();

const VALID_LOCKS = ['combat', 'patrol', 'cover', 'flank', 'suppressed', 'idle'];

/**
 * AI system — squad of soldier NPCs. Contract:
 *   ai.raycast(origin, dir, far) -> { enemy, point, distance, headshot, normal } | null
 *   ai.enemies — enemy list (alive + corpses; check .alive)
 *   ai.enabled — harness can disable (?nobots=1)
 *
 * Dev/test URL params (screenshot harness):
 *   ?enemyat=x,z       spawn a single enemy there facing the player (disables auto-spawns)
 *   ?enemystate=...    combat|patrol|cover|flank|suppressed|dead|deadhs|dying (with enemyat)
 *   ?enemyvar=0|1|2    force tint variant (with enemyat)
 *   ?enemyyaw=deg      force initial facing in degrees (with enemyat)
 *   ?hitboxdebug=1     render hitbox proxies as wireframes
 */
export class AISystem {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.enabled = true;
    this.maxAlive = 7;
    this.spawnT = 0.6;
    // soldier.glb faces -Z (verified via screenshots) — flip to match yaw math
    this.modelYawOffset = Math.PI;
    this.factory = new SoldierFactory(game);

    // squad-level tokens
    this.flankCd = randRange(4, 8);
    this.grenadeCd = 12;
    this.combatCount = 0;
    this.grenades = [];
    this._campPos = null;
    this._campT = 0;

    this._frustum = new THREE.Frustum();
    this._projScreen = new THREE.Matrix4();
    this._rayTargets = [];
    this._booms = [];

    // --- dev/test hooks ------------------------------------------------------
    const q = new URLSearchParams(location.search);
    const triple = (s) => (s ? s.split(',').map(Number) : null);
    this.dev = {
      enemyAt: null,
      state: q.get('enemystate'),
      variant: q.has('enemyvar') ? parseInt(q.get('enemyvar')) : null,
      yawDeg: q.has('enemyyaw') ? parseFloat(q.get('enemyyaw')) : null,
      hitboxDebug: q.get('hitboxdebug') === '1',
      simT: parseFloat(q.get('t') ?? '1.5'),
      armTest: triple(q.get('armtest')),
      foreArmTest: triple(q.get('farmtest')),
      lArmTest: triple(q.get('larmtest')),
      lForeArmTest: triple(q.get('lfarmtest')),
    };
    const at = q.get('enemyat');
    if (at) {
      const [x, z] = at.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(z)) this.dev.enemyAt = new THREE.Vector3(x, 0, z);
    }
    this._devEnemy = null;

    // --- events ----------------------------------------------------------------
    // Explosions are queued so 'airstrike:impact' (emitted right after) can tag
    // the cause before damage/kills are attributed next tick.
    game.events.on('explosion', ({ position, radius, damage, source }) => {
      this._booms.push({
        position: position.clone(),
        radius: radius ?? 6,
        damage: damage ?? 0,
        source: source ?? null,
      });
    });
    game.events.on('airstrike:impact', ({ position }) => {
      for (const b of this._booms) {
        if (!b.source && b.position.distanceToSquared(position) < 9) b.source = 'airstrike';
      }
    });

    // player gunfire is audible
    game.events.on('weapon:fire', ({ origin }) => {
      if (!origin) return;
      for (const e of this.enemies) {
        if (!e.alive || e.devLock) continue;
        if (e.position.distanceToSquared(origin) < HEAR_RANGE * HEAR_RANGE) e.alert(origin);
      }
    });

    // squadmates investigate a nearby death
    const _deathEye = new THREE.Vector3();
    game.events.on('enemy:death', ({ enemy, position }) => {
      for (const e of this.enemies) {
        if (!e.alive || e === enemy || e.devLock) continue;
        if (e.position.distanceToSquared(position) < 400 &&
            this.game.world.colliders.clearLine(e.eyePos(_v), _deathEye.set(position.x, position.y + 1.2, position.z))) {
          e.alert(position);
        }
      }
    });
  }

  async load() {
    await this.factory.load();
  }

  /** Hitscan against per-enemy hitbox proxies (head sphere + body boxes on bones). */
  raycast(origin, dir, far = 300) {
    const targets = this._rayTargets;
    targets.length = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const hb of e.inst.hitboxes) targets.push(hb);
    }
    if (!targets.length) return null;
    _ray.set(origin, dir);
    _ray.far = far;
    _ray.near = 0;
    const hits = _ray.intersectObjects(targets, false);
    if (!hits.length) return null;
    const h = hits[0];
    return {
      enemy: h.object.userData.enemy,
      point: h.point,
      distance: h.distance,
      headshot: h.object.userData.part === 'head',
      normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null,
    };
  }

  /** Squad radio: combat contact shares the player position with nearby mates. */
  alertSquadAround(e) {
    const p = this.game.player;
    if (!p.alive) return;
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.devLock) continue;
      if (o.position.distanceToSquared(e.position) < 28 * 28) o.alert(p.position);
    }
  }

  /** Perf: skip skeletal animation for far offscreen enemies. */
  shouldSkipMixer(e) {
    if (e.playerDist < 80) return false;
    _sphere.center.set(e.position.x, e.position.y + 1, e.position.z);
    _sphere.radius = 1.4;
    return !this._frustum.intersectsSphere(_sphere);
  }

  throwGrenadeFrom(e) {
    const p = this.game.player;
    const from = new THREE.Vector3(e.position.x, e.position.y + 1.4, e.position.z);
    _v.set(p.position.x - from.x, 0, p.position.z - from.z);
    const dist = _v.length();
    _v.normalize();
    const speed = THREE.MathUtils.clamp(dist * 0.55, 7, 15);
    const vel = new THREE.Vector3(
      _v.x * speed + randSpread(0.8),
      5.6 + dist * 0.06,
      _v.z * speed + randSpread(0.8));
    const mesh = new THREE.Mesh(this.factory.grenadeGeo, this.factory.grenadeMat);
    mesh.castShadow = true;
    mesh.position.copy(from);
    this.game.scene.add(mesh);
    this.grenades.push({ mesh, vel, fuse: 2.5 });
  }

  _applyBooms() {
    if (!this._booms.length) return;
    for (const b of this._booms) {
      const cause = b.source === 'airstrike' ? 'airstrike' : b.source === 'gun' ? 'gun' : 'grenade';
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.position.distanceTo(b.position);
        if (b.damage > 0 && d < b.radius) {
          const falloff = 1 - d / b.radius;
          e._explCause = cause;
          e._lastHitDir = _v.set(e.position.x - b.position.x, 0.2, e.position.z - b.position.z).normalize().clone();
          e.damage(b.damage * falloff * (0.5 + falloff * 0.5), false, null, null);
        }
        // near miss → scatter
        if (e.alive && d < b.radius + 7 && (!e.devLock || e.devLock === 'suppressed')) {
          e.suppress(b.position);
        }
      }
    }
    this._booms.length = 0;
  }

  _pickSpawn() {
    const { world, player } = this.game;
    const spawns = world.enemySpawns;
    if (!spawns || !spawns.length) return null;
    const pEye = player.eyePos();
    let best = null, bestScore = -Infinity;
    for (const s of spawns) {
      const d = s.distanceTo(player.position);
      if (d < 20) continue;
      const hidden = !world.colliders.clearLine(_v.set(s.x, 1.6, s.z), pEye);
      const score = (hidden ? 20 : 0) - Math.abs(d - 38) * 0.2 + rand() * 4;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best) {
      for (const s of spawns) {
        const d = s.distanceTo(player.position);
        if (d > bestScore) { bestScore = d; best = s; }
      }
    }
    return best;
  }

  _updateDevEnemy() {
    const { player } = this.game;
    if (!this._devEnemy) {
      const at = this.dev.enemyAt;
      const yaw = this.dev.yawDeg != null
        ? THREE.MathUtils.degToRad(this.dev.yawDeg)
        : Math.atan2(player.position.x - at.x, player.position.z - at.z);
      const opts = { yaw, devLock: VALID_LOCKS.includes(this.dev.state) ? this.dev.state : 'idle' };
      if (this.dev.variant != null) opts.variant = this.dev.variant;
      this._devEnemy = new Enemy(this, at, opts);
      if (this.dev.yawDeg != null) {
        this._devEnemy.devYawLock = true;
        this._devEnemy.devYaw = yaw;
      }
      this._devEnemy.spawnTime = this.game.time;
      this.enemies.push(this._devEnemy);
    }
    const e = this._devEnemy;
    if (e.alive) {
      const s = this.dev.state;
      const killAt = (s === 'dying') ? Math.max(e.spawnTime + 0.3, this.dev.simT - 0.38) : e.spawnTime + 0.5;
      if ((s === 'dead' || s === 'deadhs' || s === 'dying') && this.game.time > killAt) {
        e._lastHitDir = _v.set(e.position.x - player.position.x, 0, e.position.z - player.position.z).normalize().clone();
        e.die(s === 'deadhs', 'gun');
      }
    }
  }

  update(dt) {
    if (!this.enabled || dt === 0) return;
    const { player, camera } = this.game;

    this._applyBooms();

    // frustum for mixer culling
    camera.updateMatrixWorld();
    this._projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreen);

    // --- spawning -------------------------------------------------------------
    if (this.dev.enemyAt) {
      this._updateDevEnemy();
    } else {
      const aliveCount = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
      this.spawnT -= dt;
      if (aliveCount < this.maxAlive && this.spawnT <= 0 && player.alive) {
        const pos = this._pickSpawn();
        if (pos) this.enemies.push(new Enemy(this, pos));
        // ramp up fast at the start, then trickle
        this.spawnT = aliveCount < 3 ? randRange(0.3, 0.8) : randRange(1.4, 2.6);
      }
    }

    // --- squad tokens ---------------------------------------------------------
    this.flankCd -= dt;
    this.grenadeCd -= dt;
    this.combatCount = 0;
    for (const e of this.enemies) {
      if (e.alive && (e.state === 'combat' || e.state === 'flank' || e.state === 'cover')) this.combatCount++;
    }

    // camping player → someone lobs a grenade back
    if (player.alive) {
      if (!this._campPos) this._campPos = player.position.clone();
      if (player.position.distanceToSquared(this._campPos) > 4.5 * 4.5) {
        this._campPos.copy(player.position);
        this._campT = 0;
      } else {
        this._campT += dt;
      }
      if (this._campT > 8 && this.grenadeCd <= 0 && !this.dev.enemyAt) {
        const thrower = this.enemies.find((e) =>
          e.alive && !e.devLock && e.awareT < 3 && e.playerDist > 12 && e.playerDist < 38 &&
          (e.state === 'combat' || e.state === 'cover' || e.state === 'flank'));
        if (thrower && rand() < 0.7) {
          this.throwGrenadeFrom(thrower);
          this.grenadeCd = randRange(14, 22);
          this._campT = 3;
        } else {
          this.grenadeCd = 3;
        }
      }
    }

    // --- enemies ---------------------------------------------------------------
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.update(dt) === 'remove') {
        e.dispose();
        this.enemies.splice(i, 1);
        if (this._devEnemy === e) this._devEnemy = null;
      }
    }

    // --- AI grenades -------------------------------------------------------------
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.vel.y -= 12 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      if (g.mesh.position.y < 0.05 && g.vel.y < 0) {
        g.mesh.position.y = 0.05;
        g.vel.y *= -0.32;
        g.vel.x *= 0.6;
        g.vel.z *= 0.6;
      }
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this.game.events.emit('explosion', {
          position: g.mesh.position.clone().add(_v.set(0, 0.3, 0)),
          radius: 6.5,
          damage: 85,
          source: 'grenade',
        });
        this.game.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }
}
