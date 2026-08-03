import type { CharKey } from '../characters/Character';
import type { Stage } from './Stage';
import { rng } from '../core/Rng';

/**
 * Character blocking for the interior chapters.
 *
 * Every figure has an explicit, readable objective: hold a position, advance
 * down the passage, reach a console, get to the pod. Nothing wanders.
 *
 * Interior geography (see CorridorSet):
 *   z -15 breach door · -12..8 corridor · 8..22 vestibule · pod bay at x 6.65
 */

export interface FireOrder {
  time: number;
  shooter: string;
  /** Local interior-space aim point. */
  target: [number, number, number];
  color: 'red' | 'blue';
  /** Character id that takes the hit, if any. */
  victim?: string;
}

export const BREACH_TIME = 234;
export const VADER_ENTRY = 270;

/** Defensive stations, ordered front (nearest the door) to back. */
const REBEL_STATIONS: Array<[number, number]> = [
  [-1.26, -7.4],
  [1.26, -5.2],
  [-1.26, -2.4],
  [1.26, 0.6],
  [-1.2, 5.4],
];

/**
 * Where each trooper ends up after pushing into the corridor.
 *
 * They hug the walls: the centre line has to stay clear so the doorway reads
 * as a doorway and the dark lord's entrance is not blocked by a white helmet.
 */
const TROOPER_STATIONS: Array<[number, number]> = [
  [-1.34, -12.4],
  [1.34, -11.5],
  [-1.34, -9.7],
  [1.34, -8.6],
  [-1.34, -6.6],
  [1.34, -5.2],
  [1.34, -13.4],
];

export function applyBlocking(stage: Stage): FireOrder[] {
  const orders: FireOrder[] = [];
  const r = rng('blocking');

  /* ------------------------------------------------------------- rebels */
  stage.rebels.forEach((rebel, i) => {
    const [x, z] = REBEL_STATIONS[i];
    // Where they stand before the alarm. Held well forward of the vestibule
    // mouth: parked at the aft end they stood inside the establishing shot's
    // lens and one shoulder filled a third of the frame.
    const restZ = i === 4 ? 12.5 : z + 4.2 + i * 0.3;
    const keys: CharKey[] = [
      { t: 0, pos: [x * 0.5, 0, restZ], state: 'idle', face: [0, 0, -20] },
      { t: 209, pos: [x * 0.5, 0, restZ], state: 'idle', face: [0, 0, -20] },
      { t: 211 + i * 0.4, pos: [x * 0.5, 0, restZ], state: 'run', face: 'motion' },
      { t: 215 + i * 0.7, pos: [x, 0, z], state: 'run', face: 'motion', ease: 'decel' },
      { t: 216.5 + i * 0.7, pos: [x, 0, z], state: 'aim', face: [x * 0.4, 1.2, -18] },
    ];

    // Each defender falls at a scripted moment; the officer withdraws instead.
    const fallAt = [243.5, 240.0, 252.0, 247.5, -1][i];
    if (fallAt > 0) {
      keys.push({ t: fallAt - 0.3, pos: [x, 0, z], state: 'react', face: [x * 0.4, 1.2, -18] });
      keys.push({ t: fallAt, pos: [x, 0, z], state: 'fall', face: 'hold' });
      keys.push({ t: fallAt + 1.1, pos: [x, 0, z], state: 'down', face: 'hold' });
      rebel.hitTimes = [fallAt];
    } else {
      // Officer: covers, then pulls back to the vestibule to warn the princess.
      keys.push({ t: 249, pos: [x, 0, z], state: 'run', face: 'motion' });
      keys.push({ t: 253, pos: [-1.6, 0, 10.5], state: 'run', face: 'motion' });
      keys.push({ t: 256, pos: [-3.1, 0, 15.6], state: 'aim', face: [0, 1.2, -6], ease: 'decel' });
      keys.push({ t: 292, pos: [-3.1, 0, 15.6], state: 'aim', face: [0, 1.2, -6] });
      keys.push({ t: 296, pos: [-2.0, 0, 12.0], state: 'run', face: 'motion' });
      keys.push({ t: 300, pos: [-1.2, 0, 9.0], state: 'aim', face: [0, 1.2, -6], ease: 'decel' });
      keys.push({ t: 316, pos: [-1.2, 0, 9.0], state: 'react', face: [0, 1.2, -6] });
      keys.push({ t: 317, pos: [-1.2, 0, 9.0], state: 'fall', face: 'hold' });
      keys.push({ t: 318.4, pos: [-1.2, 0, 9.0], state: 'down', face: 'hold' });
      rebel.hitTimes = [317];
    }
    rebel.setKeys(keys);

    // Return fire: steady bursts until the defender goes down.
    const stop = fallAt > 0 ? fallAt - 0.4 : 316;
    const fireTimes: number[] = [];
    for (let t = 236 + i * 0.55; t < stop; t += r.range(0.65, 1.35)) {
      fireTimes.push(t);
      orders.push({
        time: t,
        shooter: rebel.id,
        target: [r.spread(1.1), 1.0 + r.spread(0.55), -13.4 + r.spread(1.4)],
        color: 'red',
      });
    }
    rebel.fireTimes = fireTimes;
  });

  /* ----------------------------------------------------------- troopers */
  stage.troopers.forEach((trooper, i) => {
    const [x, z] = TROOPER_STATIONS[i];
    const entry = BREACH_TIME + 0.9 + i * 0.55;
    const keys: CharKey[] = [
      { t: 0, pos: [x * 0.4, 0, -17.5], state: 'idle', face: [0, 0, 0] },
      { t: entry - 0.01, pos: [x * 0.4, 0, -17.5], state: 'run', face: 'motion' },
      { t: entry + 1.6, pos: [x, 0, z - 2.4], state: 'run', face: 'motion' },
      { t: entry + 2.6, pos: [x, 0, z], state: 'aim', face: [x * 0.5, 1.2, 6], ease: 'decel' },
    ];
    // After the corridor falls quiet they hold, then clear the way for Vader.
    if (i < 2 || i === 6) {
      keys.push({ t: VADER_ENTRY - 4, pos: [x, 0, z], state: 'walk', face: 'motion' });
      keys.push({ t: VADER_ENTRY - 1, pos: [x * 1.12, 0, z + 1.4], state: 'idle', face: [0, 1.4, -15] });
      keys.push({ t: 296, pos: [x * 1.12, 0, z + 1.4], state: 'idle', face: [0, 1.4, -15] });
    } else if (i < 5) {
      // Three push aft toward the vestibule during the princess sequence.
      keys.push({ t: 296 + i, pos: [x, 0, z], state: 'walk', face: 'motion' });
      keys.push({ t: 306 + i, pos: [x * 0.7, 0, 2.5 + i * 0.6], state: 'walk', face: 'motion' });
      keys.push({ t: 314 + i * 0.6, pos: [x * 0.8, 0, 7.0 + i * 0.5], state: 'aim', face: [0, 1.2, 18], ease: 'decel' });
      // Out to the vestibule walls as they come aft. Down the middle of an
      // eight-metre room they walked straight through every droid shot.
      keys.push({ t: 330 + i * 0.7, pos: [x * 1.7, 0, 11.5 + i * 0.4], state: 'walk', face: 'motion' });
      keys.push({ t: 344 + i * 0.7, pos: [x * 2.4, 0, 15.5 + i * 0.5], state: 'aim', face: [0, 1.2, 20], ease: 'decel' });
    }
    trooper.setKeys(keys);

    const fireTimes: number[] = [];
    for (let t = entry + 2.4; t < 256; t += r.range(0.5, 1.15)) {
      fireTimes.push(t);
      const station = REBEL_STATIONS[Math.min(4, Math.floor(r.next() * 4))];
      orders.push({
        time: t,
        shooter: trooper.id,
        target: [station[0] + r.spread(0.5), 1.0 + r.spread(0.5), station[1] + r.spread(0.8)],
        color: 'blue',
      });
    }
    // The shot that drops the officer during the princess sequence.
    if (i === 2) {
      fireTimes.push(316.6);
      orders.push({ time: 316.6, shooter: trooper.id, target: [-1.2, 1.1, 9.0], color: 'blue', victim: 'rebel4' });
    }
    trooper.fireTimes = fireTimes.sort((a, b) => a - b);
  });

  /* -------------------------------------------------------------- Vader */
  // He arrives, and then he simply stands in the doorway. The stillness is
  // the point: the shot holds on him for eight seconds before he moves.
  stage.vader.setKeys([
    { t: 0, pos: [0, 0, -21], state: 'idle', face: [0, 0, 0] },
    { t: VADER_ENTRY - 0.01, pos: [0, 0, -21], state: 'walk', face: 'motion' },
    { t: VADER_ENTRY + 4.0, pos: [0, 0, -15.4], state: 'menace', face: [0, 1.6, 6], ease: 'decel' },
    { t: VADER_ENTRY + 12.0, pos: [0, 0, -15.2], state: 'menace', face: [0, 1.6, 6] },
    { t: VADER_ENTRY + 14.0, pos: [0, 0, -14.6], state: 'walk', face: 'motion' },
    { t: VADER_ENTRY + 26, pos: [0, 0, -8.6], state: 'walk', face: 'motion' },
    { t: VADER_ENTRY + 34, pos: [0, 0, -5.4], state: 'menace', face: [0, 1.6, 8], ease: 'decel' },
    { t: 316, pos: [0, 0, -5.4], state: 'menace', face: [0, 1.6, 8] },
    { t: 328, pos: [0, 0, -1.6], state: 'walk', face: 'motion' },
    { t: 352, pos: [0, 0, 5.5], state: 'walk', face: 'motion' },
    { t: 360, pos: [0, 0, 8.5], state: 'menace', face: [0, 1.6, 20], ease: 'decel' },
  ]);

  /* ------------------------------------------------------------ princess */
  // She works the console standing aft of it rather than square to the wall:
  // face-on to a bulkhead the camera only ever gets the back of her head, and
  // the one plot point of the chapter is her handing the file over.
  stage.leia.setKeys([
    { t: 0, pos: [-2.4, 0, 20.8], state: 'idle', face: [0, 1.2, 16] },
    { t: 286, pos: [-2.4, 0, 20.8], state: 'idle', face: [0, 1.2, 16] },
    { t: 288, pos: [-2.4, 0, 20.8], state: 'walk', face: 'motion' },
    { t: 293.5, pos: [-3.0, 0, 19.9], state: 'interact', face: [-3.8, 1.4, 18.4], ease: 'decel' },
    { t: 309.5, pos: [-3.0, 0, 19.9], state: 'interact', face: [-3.8, 1.4, 18.4] },
    { t: 310.5, pos: [-3.0, 0, 19.9], state: 'walk', face: 'motion' },
    { t: 313, pos: [-2.85, 0, 17.35], state: 'kneel', face: [-1.8, 0.9, 17.95], ease: 'decel' },
    { t: 324, pos: [-2.85, 0, 17.35], state: 'kneel', face: [-1.8, 0.9, 17.95] },
    { t: 325.5, pos: [-2.85, 0, 17.35], state: 'idle', face: [0, 1.4, 8] },
    { t: 327, pos: [-2.85, 0, 17.35], state: 'walk', face: 'motion' },
    // Back against the console to watch them go: standing in the middle of
    // the room she blocked the lens for the whole run to the pod bay.
    { t: 331, pos: [-2.95, 0, 20.5], state: 'idle', face: [3.5, 1.2, 17.4], ease: 'decel' },
    { t: 344, pos: [-2.95, 0, 20.5], state: 'idle', face: [3.5, 1.2, 17.4] },
    { t: 346, pos: [-2.95, 0, 20.5], state: 'walk', face: 'motion' },
    { t: 352, pos: [-0.9, 0, 13.6], state: 'idle', face: [0, 1.5, 0], ease: 'decel' },
    { t: 362, pos: [-0.9, 0, 13.6], state: 'surrender', face: [0, 1.6, 0] },
  ]);

  /* --------------------------------------------------------------- R2-D2 */
  stage.r2.setKeys([
    { t: 0, pos: [-1.1, 0, 16.4], state: 'idle', face: [-4, 0.6, 18] },
    { t: 292, pos: [-1.1, 0, 16.4], state: 'idle', face: [-4, 0.6, 18] },
    { t: 294, pos: [-1.1, 0, 16.4], state: 'walk', face: 'motion' },
    { t: 298.5, pos: [-1.8, 0, 17.95], state: 'idle', face: [-4.1, 1.0, 18.6], ease: 'decel' },
    { t: 311, pos: [-1.8, 0, 17.95], state: 'idle', face: [-4.1, 1.0, 18.6] },
    // Turns to face the princess for the handover.
    { t: 313, pos: [-1.8, 0, 17.95], state: 'idle', face: [-3.6, 0.9, 17.2] },
    { t: 332, pos: [-1.8, 0, 17.95], state: 'idle', face: [-3.6, 0.9, 17.2] },
    { t: 334, pos: [-1.8, 0, 17.95], state: 'walk', face: 'motion' },
    { t: 339, pos: [1.9, 0, 17.2], state: 'walk', face: 'motion' },
    { t: 343, pos: [4.4, 0, 17.1], state: 'walk', face: 'motion' },
    // Stops short of the cradle rail — the pod's tail begins at x = 6.2.
    { t: 346.5, pos: [5.6, 0, 16.9], state: 'idle', face: [9, 0.6, 17.0], ease: 'decel' },
  ]);

  /* --------------------------------------------------------------- C-3PO */
  stage.threepio.setKeys([
    { t: 0, pos: [1.9, 0, 20.2], state: 'idle', face: [0, 1.4, 12] },
    { t: 296, pos: [1.9, 0, 20.2], state: 'idle', face: [0, 1.4, 12] },
    { t: 298, pos: [1.9, 0, 20.2], state: 'walk', face: 'motion' },
    { t: 302, pos: [0.9, 0, 19.0], state: 'cower', face: [-2.6, 1.2, 18.6], ease: 'decel' },
    { t: 312, pos: [0.9, 0, 19.0], state: 'cower', face: [-2.6, 1.2, 18.6] },
    { t: 314, pos: [0.9, 0, 19.0], state: 'walk', face: 'motion' },
    { t: 317, pos: [1.7, 0, 20.0], state: 'cower', face: [0, 1.4, 8], ease: 'decel' },
    { t: 334, pos: [1.7, 0, 20.0], state: 'cower', face: [0, 1.4, 8] },
    { t: 336, pos: [1.7, 0, 20.0], state: 'walk', face: 'motion' },
    { t: 339.5, pos: [2.6, 0, 18.6], state: 'idle', face: [-2, 1.2, 17], ease: 'decel' },
    { t: 341.5, pos: [2.6, 0, 18.6], state: 'walk', face: 'motion' },
    { t: 346, pos: [4.5, 0, 18.3], state: 'walk', face: 'motion' },
    { t: 349, pos: [5.3, 0, 18.0], state: 'idle', face: [9, 1.2, 17.6], ease: 'decel' },
  ]);

  orders.sort((a, b) => a.time - b.time);
  return orders;
}
