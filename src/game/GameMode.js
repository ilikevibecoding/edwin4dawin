/**
 * Match flow: a Domination-style hold of objective B against waves of enemies with a score + timer.
 * Also handles player death → respawn.
 *
 * Emits: 'score' { points, reason, total }, 'objective:progress' { progress (-1..1), owner: 'blue'|'red'|null, contested },
 *        'match:time' { remaining }, 'match:end' { winner }, 'wave' { index, count }
 */
export class GameMode {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.score = 0;
    this.teamScore = { blue: 0, red: 0 };
    this.timeRemaining = 10 * 60;
    this.wave = 0;
    this.waveTimer = 4;
    this.respawnTimer = 0;
    this.objective = game.world.getObjective();
    this.captureProgress = 0; // -1 red .. 1 blue
    this.owner = null;
    this.started = false;

    this.events.on('enemy:killed', (e) => {
      if (e.source !== 'player') return;
      const pts = e.headshot ? 150 : 100;
      this.score += pts;
      this.events.emit('score', { points: pts, reason: e.headshot ? 'HEADSHOT' : 'KILL', total: this.score });
    });
    this.events.on('player:died', () => {
      this.respawnTimer = 4;
      this.game.setState('dead');
    });
    this.events.on('game:state', ({ state, prev }) => {
      if (state === 'playing' && prev === 'menu') this.started = true;
    });
    if (game.settings.shotMode) this.started = true;
  }

  update(dt) {
    if (dt <= 0 || !this.started) return;
    const { player, enemies, world } = this.game;

    if (this.game.state === 'dead') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        player.spawn(world.getPlayerSpawn());
        this.game.setState('playing');
      }
    }

    // Waves
    if (!this.game.settings.noEnemies) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && enemies.aliveCount < 6) {
        this.wave++;
        const count = Math.min(3 + this.wave, 8);
        enemies.spawnWave(count);
        this.waveTimer = 18;
        this.events.emit('wave', { index: this.wave, count });
      }
    }

    // Capture logic
    const d = player.position.distanceTo(this.objective.position);
    const playerIn = d < this.objective.radius && player.alive;
    let enemiesIn = 0;
    for (const e of enemies.list) if (e.alive && e.position.distanceTo(this.objective.position) < this.objective.radius) enemiesIn++;
    const contested = playerIn && enemiesIn > 0;
    if (!contested) {
      if (playerIn) this.captureProgress = Math.min(1, this.captureProgress + dt / 8);
      else if (enemiesIn > 0) this.captureProgress = Math.max(-1, this.captureProgress - dt / 10);
    }
    const newOwner = this.captureProgress >= 1 ? 'blue' : this.captureProgress <= -1 ? 'red' : this.owner;
    if (newOwner !== this.owner) {
      this.owner = newOwner;
      if (newOwner === 'blue') {
        this.score += 200;
        this.events.emit('score', { points: 200, reason: 'CAPTURED B', total: this.score });
      }
    }
    this.events.emit('objective:progress', { progress: this.captureProgress, owner: this.owner, contested, playerIn });

    // Team scoring tick
    this._tick = (this._tick || 0) + dt;
    if (this._tick >= 1) {
      this._tick -= 1;
      if (this.owner === 'blue') this.teamScore.blue++;
      if (this.owner === 'red') this.teamScore.red++;
      this.timeRemaining = Math.max(0, this.timeRemaining - 1);
      this.events.emit('match:time', { remaining: this.timeRemaining, teamScore: this.teamScore });
      if (this.timeRemaining === 0 && this.game.state !== 'ended') {
        this.game.setState('ended');
        this.events.emit('match:end', { winner: this.teamScore.blue >= this.teamScore.red ? 'blue' : 'red', teamScore: this.teamScore, score: this.score });
      }
    }
  }
}
