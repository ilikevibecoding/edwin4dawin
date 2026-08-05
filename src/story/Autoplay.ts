import * as THREE from 'three';
import type { Director } from './Director';

/**
 * Scripted player.
 *
 * The demo video has to be a recording of the game being played, not a cutscene
 * with the interface bolted on, so autoplay drives the same input layer a person
 * would: it moves the cursor onto a choice and presses the confirm key, it reacts
 * to a quick-time prompt after a plausible delay, and it pans the investigation
 * camera around until a clue is under the reticle before analysing it.
 *
 * Every delay is measured in game time, so the performance is identical whether
 * the frame took 8 ms or eight seconds to render.
 */

export interface AutoplayPlan {
  attach(director: Director): void;
}

/**
 * Preferred branch at each decision, in priority order. Anything not listed
 * falls back to the first option, so adding a choice to a chapter cannot break
 * the recording.
 */
const PREFERENCES = [
  // Chapter 1: work the evidence, treat him as a person, keep both alive.
  'ch1.name',
  'ch1.evidenceUse',
  'ch1.promise',
  'ch1.trade',
  // Chapter 2: push back, then protect the child and run.
  'ch2.stall',
  'ch2.shield',
  'ch2.run',
  // Chapter 3: non-violence to the end.
  'ch3.peace',
  'ch3.kneel',
];

interface Timers {
  /** Game time at which the pending choice became visible. */
  choiceSeenAt: number;
  choiceTarget: number;
  qteSeenAt: number;
  qteIndex: number;
  clueSettle: number;
}

class ScriptedPlayer implements AutoplayPlan {
  attach(director: Director): void {
    const t: Timers = {
      choiceSeenAt: -1,
      choiceTarget: -1,
      qteSeenAt: -1,
      qteIndex: -1,
      clueSettle: 0,
    };

    director.engine.onFrame(() => {
      const now = director.clock.time;
      const choice = director.pendingChoice;
      const qte = director.pendingQte;

      if (choice) {
        if (t.choiceSeenAt < 0) {
          t.choiceSeenAt = now;
          // Pick the highest-priority option that is actually on offer.
          let target = 0;
          let best = Infinity;
          choice.options.forEach((o, i) => {
            const rank = PREFERENCES.indexOf(o.id);
            if (rank >= 0 && rank < best) {
              best = rank;
              target = i;
            }
          });
          t.choiceTarget = target;
        }
        const elapsed = now - t.choiceSeenAt;
        // Drift the cursor onto the option, then commit. The pause is long
        // enough that the timer bar visibly drains, which is the whole point of
        // showing it.
        const centre = director.choiceCentre(t.choiceTarget);
        if (centre && elapsed > 0.55) {
          const [cx, cy] = centre;
          const k = Math.min(1, (elapsed - 0.55) / 0.7);
          const startX = window.innerWidth * 0.5;
          const startY = window.innerHeight * 0.62;
          director.input.setVirtualCursor(startX + (cx - startX) * k, startY + (cy - startY) * k);
        }
        if (elapsed > 2.1) director.input.inject('Enter', 0.25);
        return;
      }
      t.choiceSeenAt = -1;

      if (qte) {
        if (t.qteIndex !== qte.index) {
          t.qteIndex = qte.index;
          t.qteSeenAt = now;
        }
        // React after a beat so the ring visibly closes, but always in time.
        const react = Math.min(0.34, Math.max(0.12, qte.remaining * 0.4));
        if (now - t.qteSeenAt > react) director.input.inject(qteCode(qte.key), 0.25);
        return;
      }
      t.qteIndex = -1;

      if (director.scanActive) {
        this.playScan(director, t);
      }
    });
  }

  /**
   * Pans until the nearest unexamined clue sits under the reticle, holds for a
   * moment so the marker's pulse reads, then analyses it.
   */
  private playScan(director: Director, t: Timers): void {
    const camera = director.set.camera;
    const width = director.engine.width;
    const height = director.engine.height;
    const pending = director.hud.clueList.filter((c) => !c.found);
    if (!pending.length) return;

    // Always work on the left-most remaining clue so the pan reads as a sweep
    // rather than jumping back and forth across the frame.
    let target = pending[0];
    let bestX = Infinity;
    const p = new THREE.Vector3();
    for (const clue of pending) {
      p.copy(clue.world).project(camera);
      const sx = (p.x * 0.5 + 0.5) * width;
      if (sx < bestX) {
        bestX = sx;
        target = clue;
      }
    }

    p.copy(target.world).project(camera);
    const behind = p.z > 1;
    const sx = (p.x * 0.5 + 0.5) * width;
    const sy = (-p.y * 0.5 + 0.5) * height;
    const dx = behind ? -width : sx - width / 2;
    const dy = sy - height / 2;
    // Comfortably inside the reticle's own capture radius, so a clue that the
    // HUD is offering can always be taken.
    const tolerance = Math.min(width, height) * 0.1;
    // Hold each key for a little over one step: any longer and the camera keeps
    // turning after the target is centred and oscillates around it.
    const hold = Math.max(0.05, director.clock.dt * 1.4);

    let steering = false;
    if (Math.abs(dx) > tolerance) {
      director.input.inject(dx > 0 ? 'KeyD' : 'KeyA', hold);
      steering = true;
    }
    if (Math.abs(dy) > tolerance) {
      // Screen Y grows downward; W tilts the camera up.
      director.input.inject(dy > 0 ? 'KeyS' : 'KeyW', hold);
      steering = true;
    }
    if (steering) {
      t.clueSettle = 0;
      return;
    }
    t.clueSettle += director.clock.dt;
    if (t.clueSettle > 0.4) {
      director.input.inject('KeyE', hold);
      t.clueSettle = -0.7;
    }
  }
}

function qteCode(key: string): string {
  switch (key) {
    case 'SPACE':
      return 'Space';
    case 'W':
    case 'A':
    case 'S':
    case 'D':
    case 'E':
    case 'Q':
      return `Key${key}`;
    default:
      return 'Enter';
  }
}

export const AUTOPLAY: AutoplayPlan = new ScriptedPlayer();
