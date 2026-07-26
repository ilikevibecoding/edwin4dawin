// Deterministic browser-testing interface (Opus 4 ownership).
// window.render_game_to_text() -> concise JSON state snapshot
// window.advanceTime(ms)       -> advance fixed-step simulation, then render
import { CHECKPOINTS } from '../world/layout.js';

export function installTestHooks(game) {
  window.render_game_to_text = () => {
    const g = game;
    const base = {
      coords: {
        units: 'meters',
        axes: '+X east, +Y up, +Z south (right-handed). yaw=0 faces -Z (north); positive yaw turns left/CCW from above; positive pitch looks up.',
        origin: 'building center, ground floor at y=0',
      },
      mode: g.state,
      tick: g.loop.tick,
      simTimeSec: round2(g.loop.simTime),
    };
    if (g.state !== 'playing' && g.state !== 'paused' && g.state !== 'victory' && g.state !== 'defeat') {
      return { ...base, note: 'gameplay state unavailable in this mode' };
    }
    const p = g.player;
    const w = g.weapons;
    const room = g.world.roomAt(p.pos.x, p.pos.z, p.pos.y);
    const hostileList = g.ai.visibleEnemies().map((e) => e.stateInfo());
    const nearby = g.ai.aliveEnemies()
      .filter((e) => dist2(e.pos, p.pos) < 20 * 20 && !hostileList.some((v) => v.id === e.id))
      .map((e) => ({ id: e.id, state: e.state, pos: e.stateInfo().pos, dist: round2(Math.sqrt(dist2(e.pos, p.pos))) }));
    return {
      ...base,
      paused: g.state === 'paused',
      pointerLocked: g.input.pointerLocked,
      player: {
        pos: [round2(p.pos.x), round2(p.pos.y), round2(p.pos.z)],
        yawDeg: round2((p.yaw * 180) / Math.PI % 360),
        pitchDeg: round2((p.pitch * 180) / Math.PI),
        vel: [round2(p.vel.x), round2(p.vel.y), round2(p.vel.z)],
        health: p.health, armor: p.armor, alive: p.alive,
        move: p.moveState, onGround: p.onGround, crouched: p.crouched,
        room: room ? room.id : 'outside',
        flash: round2(p.flashAmount),
      },
      weapon: w.summary(),
      mission: g.mission?.stateInfo() || null,
      hostages: g.ai.hostages.map((h) => h.stateInfo()),
      enemies: {
        alive: g.ai.aliveEnemies().length,
        total: g.ai.enemies.length,
        visible: hostileList,
        nearby,
      },
      doors: g.world.nearbyDoors(p.pos, 7).map((d) => d.stateInfo()),
      interactables: [
        ...(p.interactTarget ? [{ focus: true, type: p.interactTarget.type, prompt: p.interactTarget.prompt }] : []),
        ...g.pickups.filter((k) => dist2(k.pos, p.pos) < 36).map((k) => ({ type: 'pickup', id: k.id, kind: k.kind, pos: [round2(k.pos.x), round2(k.pos.y), round2(k.pos.z)] })),
      ],
      result: g.mission?.result || null,
      resultReason: g.mission?.resultReason || null,
    };
  };

  window.advanceTime = (ms) => {
    const ticks = game.loop.advance(ms);
    return { ticks, simTimeSec: round2(game.loop.simTime), tick: game.loop.tick };
  };

  // convenience for tests that need real-time restored
  window.__resumeRealtime = () => game.loop.resumeRealtime();
}

function round2(v) { return Math.round(v * 100) / 100; }
function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2; }

export { CHECKPOINTS };
