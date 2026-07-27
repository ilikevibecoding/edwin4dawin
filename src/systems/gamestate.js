import { randPick } from '../core/rand.js';
import { UAV } from './uav.js';

/**
 * Score, killstreaks, respawn flow, match flow.
 *
 * Killstreak ladder: 3 kills -> UAV [3], 5 kills -> AIRSTRIKE [4].
 * Streak resets on death. Rewards are granted once when the streak crosses
 * the threshold and announced via 'killstreak:ready' + 'ui:message'.
 *
 * Match: first to `killTarget` (30) kills or `matchLength` (10 min) ->
 * 'game:over' { victory } and enemy spawning stops (ai.enabled = false).
 *
 * UAV contract for the HUD: `state.uavActive` is true while a UAV sweep is
 * running (state.uavT counts down) — the minimap should show all enemies.
 */
export class GameState {
  constructor(game) {
    this.game = game;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.streak = 0;
    this.airstrikeKills = 0;
    this.timeAlive = 0;
    this.respawnT = 0;

    // killstreak costs (harness contract: airstrike granted at streak >= airstrikeCost)
    this.uavCost = 3;
    this.airstrikeCost = 5;

    // UAV flag + timer (visuals/input live in systems/uav.js)
    this.uavActive = false;
    this.uavT = 0;
    this.uavDuration = 30;
    this.uav = new UAV(game);
    game.uav = this.uav;

    // match flow
    this.killTarget = 30;
    this.matchLength = 600;
    this.matchT = 0;
    this.matchOver = false;

    game.events.on('enemy:death', ({ headshot, cause }) => {
      this.kills++;
      this.streak++;
      this.score += headshot ? 150 : 100;
      if (cause === 'airstrike') {
        this.airstrikeKills++;
        this.score += 25;
      }
      game.events.emit('kill', { headshot, cause, streak: this.streak });
      this._checkStreakRewards();
      if (!this.matchOver && this.kills >= this.killTarget) this._endMatch(true);
    });

    game.events.on('player:death', () => {
      this.deaths++;
      this.streak = 0;
      this.respawnT = 3.2;
    });
  }

  _checkStreakRewards() {
    const ev = this.game.events;
    if (this.streak === this.uavCost) {
      this.uav.grant();
      ev.emit('killstreak:ready', { name: 'UAV', kills: this.streak });
      ev.emit('ui:message', { text: 'UAV READY', sub: 'PRESS [3] TO DEPLOY' });
    }
    if (this.streak === this.airstrikeCost) {
      this.game.airstrike.grant();
      ev.emit('killstreak:ready', { name: 'AIRSTRIKE', kills: this.streak });
      ev.emit('ui:message', { text: 'AIRSTRIKE READY', sub: 'PRESS [4] TO CALL IT IN' });
    }
  }

  _endMatch(victory) {
    if (this.matchOver) return;
    this.matchOver = true;
    this.game.ai.enabled = false; // stop spawns + AI activity
    this.game.events.emit('game:over', { victory });
    this.game.events.emit('ui:message', {
      text: victory ? 'VICTORY' : 'TIME EXPIRED',
      sub: `${this.kills} KILLS · SCORE ${this.score}`,
    });
  }

  update(dt) {
    if (dt === 0) return;

    this.uav.update(dt);

    if (this.uavActive) {
      this.uavT -= dt;
      if (this.uavT <= 0) {
        this.uavActive = false;
        this.uavT = 0;
        this.game.events.emit('ui:message', { text: 'UAV OFFLINE', sub: '' });
      }
    }

    if (this.game.started && !this.matchOver) {
      this.matchT += dt;
      if (this.game.player.alive) this.timeAlive += dt;
      if (this.matchT >= this.matchLength) this._endMatch(this.kills >= this.killTarget);
    }

    if (!this.game.player.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        const spawns = this.game.world.playerSpawns;
        this.game.player.respawn(randPick(spawns));
      }
    }
  }
}
