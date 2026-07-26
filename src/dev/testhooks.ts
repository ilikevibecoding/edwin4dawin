import * as THREE from 'three';
import { clock } from '../core/clock';
import { input } from '../core/input';
import type { Game } from '../game/game';
import { COORDS } from '../game/types';
import { CHECKPOINTS, roomAt } from '../world/layout';
import { allAssets, assetCount } from '../assets/registry';
import type { Action } from '../core/input';
import { DIFFICULTIES as DIFF_LOOKUP } from '../game/difficulty';

/**
 * Deterministic browser testing interface (Opus 4).
 * window.render_game_to_text() — canonical JSON state snapshot.
 * window.advanceTime(ms)      — deterministic simulation stepping.
 * window.__qa                 — QA/dev API (teleport, spawn, freeze, gallery...).
 */
export function installTestHooks(game: Game): void {
  const w = window as unknown as Record<string, unknown>;
  w.__game = game;

  w.render_game_to_text = (): string => {
    const p = game.player;
    const rigSnap = game.mode === 'playing' || game.mode === 'paused' ? game.rig.snapshot() : null;
    const eye = p ? p.eyePos() : new THREE.Vector3();
    const fwd = p ? p.forward() : new THREE.Vector3();
    const nearestInteract = p ? game.interact.nearest(eye, fwd, 2.4) : null;
    const nearbyDoors = game.world
      ? game.world.doors
          .filter((d) => p && d.center.distanceTo(p.pos) < 6)
          .map((d) => ({ id: d.id, state: d.state, open: Math.round((d.angle / (Math.PI * 0.58)) * 100) / 100 }))
      : [];
    const visibleEnemies = game.ai
      ? game.ai.enemies
          .filter((e) => e.alive && p && e.pos.distanceTo(p.pos) < 40
            && game.world.collision.hasLineOfSight(eye, e.eye()))
          .map((e) => e.id)
      : [];
    const state = {
      coords: COORDS,
      mode: game.mode,
      seed: true,
      tick: clock.tick,
      time: Math.round(game.time * 1000) / 1000,
      player: p
        ? {
            pos: [r2(p.pos.x), r2(p.pos.y), r2(p.pos.z)],
            yaw: r2(p.yaw),
            pitch: r2(p.pitch),
            vel: [r2(p.vel.x), r2(p.vel.y), r2(p.vel.z)],
            health: Math.round(p.health),
            armor: Math.round(p.armor),
            alive: p.alive,
            moveState: p.moveState,
            crouched: p.crouchT > 0.5,
            onGround: p.onGround,
            room: roomAt(p.pos.x, p.pos.y, p.pos.z),
          }
        : null,
      weapon: rigSnap,
      mission: game.mission ? game.mission.snapshot() : null,
      hostages: game.hostages.map((h) => h.snapshot()),
      enemies: game.ai ? game.ai.enemies.map((e) => e.snapshot()) : [],
      visibleEnemies,
      nearbyDoors,
      nearestInteractable: nearestInteract ? { id: nearestInteract.id, prompt: nearestInteract.prompt() } : null,
      outcome: game.mode === 'victory' ? 'victory' : game.mode === 'defeat' ? 'defeat' : null,
      perf: { fps: Math.round(game.fpsAvg), ...game.engine.stats() },
      assets: assetCount(),
    };
    return JSON.stringify(state);
  };

  w.advanceTime = (ms: number): void => {
    clock.advance(ms);
    game.frame(Math.min(0.1, ms / 1000));
  };

  const qa = {
    /** teleport to a named checkpoint or coordinates */
    teleport(name: string | [number, number, number], yaw?: number): boolean {
      const p = game.player;
      if (!p) return false;
      if (Array.isArray(name)) {
        p.pos.set(name[0], name[1], name[2]);
        if (yaw !== undefined) p.yaw = yaw;
        return true;
      }
      const cp = CHECKPOINTS[name];
      if (!cp) return false;
      p.pos.set(cp.pos[0], cp.pos[1], cp.pos[2]);
      p.yaw = cp.yaw;
      p.pitch = cp.pitch ?? 0;
      p.vel.set(0, 0, 0);
      return true;
    },
    checkpoints(): string[] {
      return Object.keys(CHECKPOINTS);
    },
    giveWeapon(id: string): void {
      game.rig.setLoadout(id as never);
    },
    setAmmo(mag: number, reserve: number): void {
      const st = game.rig.active;
      st.mag = mag;
      st.reserve = reserve;
    },
    freezeAI(on: boolean): void {
      game.ai.frozen = on;
    },
    killEnemy(id?: string): void {
      const e = id ? game.ai.byId(id) : game.ai.enemies.find((en) => en.alive);
      e?.damage(9999, 'body', game.player.pos, new THREE.Vector3(0, 0, 1));
    },
    teleportEnemy(id: string, pos: [number, number, number]): void {
      const e = game.ai.byId(id);
      if (e) {
        e.pos.set(pos[0], pos[1], pos[2]);
      }
    },
    listEnemies(): string[] {
      return game.ai.enemies.map((e) => `${e.id}:${e.state}`);
    },
    setLighting(scenario: 'day' | 'emergency' | 'service' | 'neutral'): void {
      game.lighting.applyScenario(scenario);
    },
    resetMission(): void {
      game.restartMission();
    },
    setMode(mode: string): void {
      game.setMode(mode as never);
    },
    startMission(primary = 'vc7', difficulty = 'operator'): void {
      game.menus.selectedPrimary = primary as never;
      game.difficulty = DIFF_LOOKUP[difficulty as keyof typeof DIFF_LOOKUP] ?? DIFF_LOOKUP.operator;
      game.startMission(primary as never);
    },
    /** objective state shortcuts for test matrix */
    secureHostage(id: 'A' | 'B'): void {
      const h = game.hostages.find((hh) => hh.id === id);
      h?.setState('following');
    },
    hostagesToExtraction(): void {
      for (const h of game.hostages) {
        if (h.alive) {
          h.pos.set(41 + (h.id === 'B' ? 2 : 0), 0, 35);
          h.setState('following');
        }
      }
    },
    winMission(): void {
      qa.secureHostage('A');
      qa.secureHostage('B');
      qa.hostagesToExtraction();
      qa.teleport([42, 0, 35], 0);
    },
    failMission(reason = 'debug'): void {
      game.mission?.fail(reason);
    },
    damagePlayer(amount: number): void {
      game.player.damage(amount);
    },
    input: {
      down(action: string): void {
        input.syntheticDown(action as Action);
      },
      up(action: string): void {
        input.syntheticUp(action as Action);
      },
      look(dx: number, dy: number): void {
        input.syntheticLook(dx, dy);
      },
      tap(action: string): void {
        input.syntheticDown(action as Action);
        setTimeout(() => input.syntheticUp(action as Action), 0);
        // in test mode the queue drains per step; down+up in same step yields a press
        input.syntheticUp(action as Action);
      },
    },
    assets(): unknown[] {
      return allAssets() as unknown[];
    },
    stats(): unknown {
      return { fps: game.fpsAvg, ...game.engine.stats(), nav: game.nav?.size };
    },
    doorById(id: string): unknown {
      const d = game.world.doorById.get(id);
      return d ? { id: d.id, state: d.state, angle: d.angle } : null;
    },
    toggleDoor(id: string): void {
      game.world.doorById.get(id)?.toggle();
    },
    setTimeLeft(seconds: number): void {
      if (game.mission) game.mission.timeLeft = seconds;
    },
    showLabels(on: boolean): void {
      game.world.labels.visible = on;
    },
    // gallery & collision viz installed by qa.ts
    gallery: null as unknown,
    collisionViz: null as unknown,
  };
  w.__qa = qa;
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
