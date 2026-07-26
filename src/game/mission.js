// Mission logic: objective chain, mission clock, extraction sequence,
// victory/defeat with reasons, and end-of-mission stats.
import { bus } from '../core/events.js';
import { EXTRACTION } from '../world/layout.js';

const HOLD_TIME = 24; // seconds to hold the garage once the shutter opens

export class Mission {
  constructor(game) {
    this.game = game;
    this.unsubs = [];
  }

  start(difficulty) {
    this.phase = 'infiltrate'; // infiltrate -> locate -> secure -> escort -> extract -> hold -> done
    this.timer = difficulty.missionTime;
    this.holdT = 0;
    this.result = null;
    this.resultReason = null;
    this.stats = { kills: 0, shots: 0, hits: 0, damageTaken: 0, secured: 0, startTime: this.game.loop.simTime };
    this.panelUsed = false;
    this.waveSpawned = false;
    this._objectiveDirty = true;
    this._unwire();
    this._wire();
    bus.emit('mission-started');
  }

  _wire() {
    this.unsubs.push(
      bus.on('player-died', () => this.fail('You were killed in action.')),
      bus.on('hostage-died', (e) => this.fail(`Hostage ${e.name} was killed.`)),
      bus.on('enemy-died', () => { this.stats.kills++; }),
      bus.on('weapon-fired', () => { this.stats.shots++; }),
      bus.on('enemy-damaged', () => { this.stats.hits++; }),
      bus.on('player-damaged', (e) => { this.stats.damageTaken += e.amount; }),
      bus.on('hostage-secured', () => {
        this.stats.secured++;
        this._objectiveDirty = true;
        bus.emit('objective-updated');
      }),
      bus.on('hostage-found', () => { this._objectiveDirty = true; bus.emit('objective-updated'); }),
    );
  }

  _unwire() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  usePanel() {
    if (this.panelUsed) return false;
    const hostages = this.game.ai.hostages;
    const securedAll = hostages.every((h) => h.state !== 'captive' && h.alive);
    if (!securedAll) {
      bus.emit('subtitle', 'Dock panel offline until all hostages are secured.');
      return false;
    }
    this.panelUsed = true;
    this.phase = 'hold';
    this.holdT = HOLD_TIME;
    const exitDoor = this.game.world.doorById('shutter_exit');
    if (exitDoor) { exitDoor.locked = false; exitDoor.open(); }
    if (!this.waveSpawned) {
      this.waveSpawned = true;
      this.game.ai.spawnWave(this.game.difficultyName);
    }
    bus.emit('objective-updated');
    bus.emit('subtitle', 'Evac inbound. Hold the garage!');
    this._objectiveDirty = true;
    return true;
  }

  inZone(pos) {
    const z = EXTRACTION.zone;
    return pos.x >= z.x0 && pos.x <= z.x1 && pos.z >= z.z0 && pos.z <= z.z1 && pos.y < 2;
  }

  update(dt) {
    if (this.result) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.fail('The response window closed. Mission timed out.');
      return;
    }

    const game = this.game;
    const player = game.player;
    const hostages = game.ai.hostages;

    // phase progression
    if (this.phase === 'infiltrate') {
      const room = game.world.roomAt(player.pos.x, player.pos.z, player.pos.y);
      if (room && room.id !== 'courtyard' && room.id !== 'vestibule') {
        this.phase = 'locate';
        this._objectiveDirty = true;
        bus.emit('objective-updated');
        bus.emit('subtitle', 'Infiltration complete. Locate the hostages.');
      }
    } else if (this.phase === 'locate') {
      if (hostages.every((h) => h.found)) {
        this.phase = 'secure';
        this._objectiveDirty = true;
        bus.emit('objective-updated');
      }
      if (hostages.every((h) => h.state !== 'captive')) { this.phase = 'escort'; this._objectiveDirty = true; }
    } else if (this.phase === 'secure') {
      if (hostages.every((h) => h.state !== 'captive')) {
        this.phase = 'escort';
        this._objectiveDirty = true;
        bus.emit('objective-updated');
        bus.emit('subtitle', 'All hostages secured. Move to the extraction garage.');
      }
    } else if (this.phase === 'escort') {
      // nothing to do; panel interaction advances the phase
    } else if (this.phase === 'hold') {
      this.holdT -= dt;
      // hostages in the zone are marked extracted (kneel by the vehicle)
      for (const h of hostages) {
        if (h.state !== 'extracted' && h.alive && this.inZone(h.pos)) h.markExtracted();
      }
      if (this.holdT <= 0) {
        const playerIn = this.inZone(player.pos);
        const hostagesIn = hostages.every((h) => h.alive && (h.state === 'extracted' || this.inZone(h.pos)));
        if (playerIn && hostagesIn) {
          this.win();
        } else {
          this.holdT = 2.5; // evac waits a little longer
          bus.emit('subtitle', playerIn ? 'Get the hostages onto the truck!' : 'Get to the extraction vehicle!');
        }
      }
    }
  }

  win() {
    if (this.result) return;
    this.result = 'victory';
    this.phase = 'done';
    this.stats.time = this.game.loop.simTime - this.stats.startTime;
    bus.emit('mission-victory', this.stats);
  }

  fail(reason) {
    if (this.result) return;
    this.result = 'defeat';
    this.resultReason = reason;
    this.phase = 'done';
    this.stats.time = this.game.loop.simTime - this.stats.startTime;
    bus.emit('mission-defeat', { reason, ...this.stats });
  }

  objectives() {
    const hostages = this.game.ai.hostages || [];
    const found = hostages.filter((h) => h.found).length;
    const secured = hostages.filter((h) => h.state !== 'captive' && h.alive).length;
    const list = [
      { id: 'enter', text: 'Infiltrate the Northstar Administrative Center', state: this.phase === 'infiltrate' ? 'active' : 'done' },
      { id: 'locate', text: `Locate the hostages (${found}/${hostages.length})`, state: this.phase === 'infiltrate' ? 'pending' : (found >= hostages.length ? 'done' : 'active') },
      { id: 'secure', text: `Secure the hostages (${secured}/${hostages.length})`, state: secured >= hostages.length && hostages.length > 0 ? 'done' : (found > 0 ? 'active' : 'pending') },
      { id: 'escort', text: 'Escort the hostages to the extraction garage', state: this.phase === 'hold' || this.phase === 'done' ? 'done' : (this.phase === 'escort' ? 'active' : 'pending') },
      { id: 'extract', text: this.phase === 'hold' ? `Hold the garage (${Math.ceil(this.holdT)}s)` : 'Activate the dock panel and hold for evac', state: this.phase === 'done' && this.result === 'victory' ? 'done' : (this.phase === 'hold' ? 'active' : (this.phase === 'escort' ? 'active' : 'pending')) },
    ];
    return list;
  }

  stateInfo() {
    return {
      phase: this.phase,
      timerSec: Math.round(this.timer),
      holdSec: this.phase === 'hold' ? Math.round(this.holdT) : null,
      objectives: this.objectives().map((o) => ({ id: o.id, text: o.text, state: o.state })),
      result: this.result,
      resultReason: this.resultReason,
      extractionZone: EXTRACTION.zone,
      panelUsed: this.panelUsed,
    };
  }
}
