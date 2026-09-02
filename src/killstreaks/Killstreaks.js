import * as THREE from 'three';
import { AirStrike } from './AirStrike.js';
import { TargetingOverlay } from './TargetingOverlay.js';
import { registerKillstreakDebugViews } from './debugViews.js';

const COOLDOWN = 8; // s

/**
 * Killstreaks: the precision air strike (VFX/gameplay team).
 *
 *   async load(); update(dt)
 *   airstrike: { available, state: 'idle'|'targeting'|'inbound'|'cooldown', beginTargeting(), cancelTargeting(), callAt(x, z, [dx, dz]) }
 *   kills, killsRequired (5)      jets: live jets [{ position, velocity, direction }] for audio Doppler
 *
 * Availability: `killsRequired` player kills, or immediately with ?streaks=1 / shot mode (re-armed after the cooldown
 * there so tests can call repeatedly). Targeting: press 'killstreak' (X / 4) → fullscreen map overlay (TargetingOverlay),
 * player controls disabled, LMB confirms / RMB, X, Esc cancel. Sequence: AirStrike.
 *
 * Emits: 'killstreak:ready' {name}, 'killstreak:targeting' {name, active}, 'killstreak:called' {name, position, direction},
 *        'killstreak:jets' {position, direction}, 'killstreak:bomb' {position, duration}, 'killstreak:impact' {position}
 */
export class Killstreaks {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.kills = 0;
    this.killsRequired = 5;
    this.testMode = game.settings.params.get('streaks') === '1' || !!game.settings.shotMode;
    this.airstrike = {
      available: this.testMode,
      state: 'idle',
      beginTargeting: () => this._beginTargeting(),
      cancelTargeting: () => this._cancelTargeting(),
      callAt: (x, z, dx, dz) => this._callAt(x, z, dx, dz),
      jets: [],
    };
    this.jets = this.airstrike.jets;
    this.strike = null;
    this.overlay = null;
    this._cooldown = 0;
    this._prevControls = true;

    this.events.on('enemy:killed', (e) => {
      if (e.source !== 'player') return;
      this.kills++;
      if (!this.airstrike.available && this.kills >= this.killsRequired) {
        this.airstrike.available = true;
        this.events.emit('killstreak:ready', { name: 'airstrike' });
      }
    });
    this.events.on('game:state', ({ state }) => {
      if (state !== 'playing') this._cancelTargeting();
    });
    this.events.on('player:died', () => this._cancelTargeting());
    this.events.on('game:ready', () => registerKillstreakDebugViews(game));
  }

  async load() {
    this.strike = new AirStrike(this.game);
    this.airstrike.jets = this.jets = this.strike.jets;
    this.overlay = new TargetingOverlay(this.game);
  }

  _beginTargeting() {
    if (!this.airstrike.available || this.airstrike.state !== 'idle') return;
    this.airstrike.state = 'targeting';
    const P = this.game.player;
    this._prevControls = P.controlsEnabled;
    P.controlsEnabled = false;
    this.overlay?.open();
    this.events.emit('killstreak:targeting', { name: 'airstrike', active: true });
  }

  _restoreControls() {
    const P = this.game.player;
    if (P.alive) P.controlsEnabled = this._prevControls;
  }

  _cancelTargeting() {
    if (this.airstrike.state !== 'targeting') return;
    this.airstrike.state = 'idle';
    this.overlay?.close();
    this._restoreControls();
    this.events.emit('killstreak:targeting', { name: 'airstrike', active: false });
  }

  /** Call the strike on world (x, z). Optional run-in direction (dx, dz); default: from the player toward the target. */
  _callAt(x, z, dx, dz) {
    if (this.airstrike.state === 'inbound' || !this.strike) return;
    const wasTargeting = this.airstrike.state === 'targeting';
    this.airstrike.state = 'inbound';
    this.airstrike.available = false;
    this.kills = 0;
    if (wasTargeting) {
      this.overlay?.close();
      this._restoreControls();
      this.events.emit('killstreak:targeting', { name: 'airstrike', active: false });
    }
    const P = this.game.player;
    const dir = new THREE.Vector3(dx ?? 0, 0, dz ?? 0);
    if (dir.lengthSq() < 1e-6) {
      dir.set(x - P.position.x, 0, z - P.position.z);
      if (dir.lengthSq() < 9) dir.set(P.forward.x, 0, P.forward.z);
    }
    dir.normalize();
    const target = new THREE.Vector3(x, this.game.world.getGroundHeight?.(x, z) ?? 0, z);
    this.events.emit('killstreak:called', { name: 'airstrike', position: target.clone(), direction: dir.clone() });
    this.strike.call(target, dir);
  }

  update(dt) {
    if (!this.strike) return;
    this.strike.update(dt);
    const air = this.airstrike;
    if (air.state === 'inbound' && this.strike.done) {
      air.state = 'cooldown';
      this._cooldown = COOLDOWN;
    } else if (air.state === 'cooldown') {
      this._cooldown -= dt;
      if (this._cooldown <= 0) {
        air.state = 'idle';
        if (this.testMode && !air.available) {
          air.available = true;
          this.events.emit('killstreak:ready', { name: 'airstrike' });
        }
      }
    }

    if (!this.game.isPlaying) return;
    const input = this.game.input;
    if (air.state === 'targeting') {
      const r = this.overlay.update(dt);
      if (r?.cancel) this._cancelTargeting();
      else if (r?.confirm) this._callAt(r.confirm.x, r.confirm.z, r.confirm.dx, r.confirm.dz);
    } else if (input.justPressed('killstreak') && air.available && air.state === 'idle') {
      this._beginTargeting();
    }
  }
}
