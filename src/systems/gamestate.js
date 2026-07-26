import * as THREE from 'three';
import { randPick } from '../core/rand.js';

/** Score, killstreaks, respawn flow. */
export class GameState {
  constructor(game) {
    this.game = game;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.streak = 0;
    this.airstrikeCost = 5;
    this.respawnT = 0;

    game.events.on('enemy:death', ({ headshot, cause }) => {
      this.kills++;
      this.streak++;
      this.score += headshot ? 150 : 100;
      if (cause === 'airstrike') this.score += 25;
      game.events.emit('kill', { headshot, cause, streak: this.streak });
      if (this.streak === this.airstrikeCost) {
        game.airstrike.grant();
        game.events.emit('killstreak:ready', { name: 'AIRSTRIKE', kills: this.streak });
        game.events.emit('ui:message', { text: 'AIRSTRIKE READY', sub: 'PRESS [4] TO CALL IT IN' });
      }
    });
    game.events.on('player:death', () => {
      this.deaths++;
      this.streak = 0;
      this.respawnT = 3.2;
    });
  }

  update(dt) {
    if (dt === 0) return;
    if (!this.game.player.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        const spawns = this.game.world.playerSpawns;
        this.game.player.respawn(randPick(spawns));
      }
    }
  }
}
