import * as THREE from 'three';

/**
 * Killstreaks. STUB — real air strike (targeting map, jets, bombs) lives in src/killstreaks/* (VFX/gameplay team).
 *
 * Required interface:
 *   async load(); update(dt)
 *   airstrike: { available: bool, state: 'idle'|'targeting'|'inbound'|'cooldown', beginTargeting(), cancelTargeting(), callAt(x, z) }
 *   kills (int) — kill counter toward next streak; killsRequired
 *
 * Emits: 'killstreak:ready' {name}, 'killstreak:targeting' {name, active}, 'killstreak:called' {name, position},
 *        'killstreak:jets' {position, direction}, 'killstreak:impact' {position}
 * Bombs must call game.combat.explode({ position, radius, damage, kind: 'bomb', source: 'player' }) for damage + 'explosion' event.
 */
export class Killstreaks {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.kills = 0;
    this.killsRequired = 5;
    this.airstrike = {
      available: game.settings.params.get('streaks') === '1' || game.settings.shotMode,
      state: 'idle',
      beginTargeting: () => this._beginTargeting(),
      cancelTargeting: () => this._cancelTargeting(),
      callAt: (x, z) => this._callAt(x, z),
    };
    this._queue = [];
    this.events.on('enemy:killed', (e) => {
      if (e.source !== 'player') return;
      this.kills++;
      if (!this.airstrike.available && this.kills >= this.killsRequired) {
        this.airstrike.available = true;
        this.events.emit('killstreak:ready', { name: 'airstrike' });
      }
    });
  }

  async load() {}

  _beginTargeting() {
    if (!this.airstrike.available || this.airstrike.state !== 'idle') return;
    this.airstrike.state = 'targeting';
    this.events.emit('killstreak:targeting', { name: 'airstrike', active: true });
  }

  _cancelTargeting() {
    if (this.airstrike.state !== 'targeting') return;
    this.airstrike.state = 'idle';
    this.events.emit('killstreak:targeting', { name: 'airstrike', active: false });
  }

  _callAt(x, z) {
    if (this.airstrike.state === 'inbound') return;
    this.airstrike.state = 'inbound';
    this.airstrike.available = false;
    this.kills = 0;
    const target = new THREE.Vector3(x, this.game.world.getGroundHeight(x, z), z);
    this.events.emit('killstreak:targeting', { name: 'airstrike', active: false });
    this.events.emit('killstreak:called', { name: 'airstrike', position: target.clone() });
    const dir = new THREE.Vector3(1, 0, 0.3).normalize();
    for (let i = 0; i < 3; i++) {
      const p = target.clone().addScaledVector(dir, (i - 1) * 9);
      this._queue.push({ at: this.game.time + 3.0 + i * 0.22, position: p });
    }
    this._queue.push({ at: this.game.time + 6, done: true });
  }

  update() {
    if (!this._queue.length) return;
    const t = this.game.time;
    while (this._queue.length && this._queue[0].at <= t) {
      const item = this._queue.shift();
      if (item.done) {
        this.airstrike.state = 'idle';
      } else {
        this.events.emit('killstreak:impact', { position: item.position.clone() });
        this.game.combat.explode({ position: item.position, radius: 9, damage: 220, kind: 'bomb', source: 'player' });
      }
    }
    const input = this.game.input;
    if (this.game.isPlaying && input.justPressed('killstreak')) {
      if (this.airstrike.state === 'targeting') this._cancelTargeting();
      else if (this.airstrike.available) {
        // Stub: no map UI yet — call directly ahead of the player.
        const p = this.game.player.position.clone().addScaledVector(this.game.player.forward.clone().setY(0).normalize(), 18);
        this._callAt(p.x, p.z);
      }
    }
  }
}
