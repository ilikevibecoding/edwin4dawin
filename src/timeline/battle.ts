import * as THREE from 'three';
import { Rng } from '../core/Rng';
import { PALETTE } from '../assets/materials';
import type { BoltEvent } from '../effects/BoltField';
import type { FlashEvent } from '../effects/FlashField';
import type { Emission } from '../effects/ParticleField';
import type { DebrisEvent } from '../effects/DebrisField';
import type { DamageEvent } from '../assets/ships/BlockadeRunner';
import { destroyerTransform, runnerTransform } from './stage';

/**
 * The pursuit, written down.
 *
 * Rather than spawning effects live, the whole engagement is solved once at
 * load time into event tables: who fired, from where, when it lands, and what
 * it does when it gets there. Bolts are aimed with an iterative lead solution
 * against the analytic ship motion, so a shot fired at t0 genuinely arrives at
 * the hull point it was aimed at.
 */

export interface BattleScript {
  imperialBolts: BoltEvent[];
  rebelBolts: BoltEvent[];
  flashes: FlashEvent[];
  sparks: Emission[];
  smoke: Emission[];
  debris: DebrisEvent[];
  damage: DamageEvent[];
  /** Sorted list of (time, intensity) used by the audio and camera systems. */
  impactCues: Array<{ time: number; strength: number; shielded: boolean; position: THREE.Vector3 }>;
  fireCues: Array<{ time: number; kind: 'turbolaser' | 'rebel'; position: THREE.Vector3 }>;
}

const TURBOLASER_SPEED = 2600;
const REBEL_BOLT_SPEED = 2200;

interface Salvo {
  /** Fire window. */
  from: number;
  to: number;
  /** Shots in the window. */
  shots: number;
  /** 0 = all near misses, 1 = all hits. */
  accuracy: number;
  /** Whether hits are absorbed by shields. */
  shielded: boolean;
  strength: [number, number];
}

const IMPERIAL_SALVOS: Salvo[] = [
  { from: 111, to: 118, shots: 8, accuracy: 0.15, shielded: true, strength: [0.25, 0.4] },
  { from: 119, to: 128, shots: 12, accuracy: 0.55, shielded: true, strength: [0.35, 0.6] },
  { from: 128.5, to: 137, shots: 14, accuracy: 0.7, shielded: true, strength: [0.45, 0.75] },
  { from: 137.5, to: 148, shots: 16, accuracy: 0.8, shielded: false, strength: [0.5, 0.9] },
  { from: 148.5, to: 157, shots: 14, accuracy: 0.85, shielded: false, strength: [0.6, 1.0] },
];

export function buildBattleScript(
  turretLocals: THREE.Vector3[],
  hullPoints: THREE.Vector3[],
  seed = 'battle',
): BattleScript {
  const rng = new Rng(seed);
  const script: BattleScript = {
    imperialBolts: [], rebelBolts: [], flashes: [], sparks: [],
    smoke: [], debris: [], damage: [], impactCues: [], fireCues: [],
  };

  const destroyerObj = new THREE.Object3D();
  const runnerObj = new THREE.Object3D();
  const tmp = new THREE.Vector3();

  const destroyerPointAt = (t: number, local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 => {
    destroyerTransform(t, destroyerObj);
    return out.copy(local).applyMatrix4(destroyerObj.matrixWorld);
  };
  const runnerPointAt = (t: number, local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 => {
    runnerTransform(t, runnerObj);
    return out.copy(local).applyMatrix4(runnerObj.matrixWorld);
  };

  /** Iteratively solve the intercept time for a shot leaving `from` at `t0`. */
  const solveArrival = (t0: number, from: THREE.Vector3, targetAt: (t: number, out: THREE.Vector3) => THREE.Vector3, speed: number): { t1: number; to: THREE.Vector3 } => {
    const to = new THREE.Vector3();
    let t1 = t0 + 0.4;
    for (let i = 0; i < 4; i++) {
      targetAt(t1, to);
      const d = to.distanceTo(from);
      t1 = t0 + d / speed;
    }
    targetAt(t1, to);
    return { t1, to };
  };

  // --- Imperial turbolaser fire ------------------------------------------
  for (const salvo of IMPERIAL_SALVOS) {
    for (let i = 0; i < salvo.shots; i++) {
      const t0 = salvo.from + ((i + rng.range(-0.25, 0.25)) / salvo.shots) * (salvo.to - salvo.from);
      const turretLocal = turretLocals[rng.int(0, turretLocals.length - 1)];
      const from = destroyerPointAt(t0, turretLocal, new THREE.Vector3());
      // Nudge the origin toward the target so the bolt clears the barrel.
      const hullLocal = hullPoints[rng.int(0, hullPoints.length - 1)];
      const hits = rng.bool(salvo.accuracy);
      const missOffset = hits
        ? new THREE.Vector3()
        : new THREE.Vector3(rng.signed(1), rng.signed(1), rng.signed(1)).normalize().multiplyScalar(rng.range(60, 190));

      const targetAt = (t: number, out: THREE.Vector3): THREE.Vector3 => {
        runnerPointAt(t, hullLocal, out);
        return out.add(missOffset);
      };

      const { t1, to } = solveArrival(t0, from, targetAt, TURBOLASER_SPEED);
      tmp.copy(to).sub(from).normalize();
      from.addScaledVector(tmp, 55);

      script.imperialBolts.push({
        t0, t1, from: from.clone(), to: to.clone(),
        color: PALETTE.turbolaserGreen, length: 21, radius: 1.5, muzzle: 14,
      });
      script.fireCues.push({ time: t0, kind: 'turbolaser', position: from.clone() });

      // Muzzle flash at the turret.
      script.flashes.push({
        t0, position: from.clone(), color: PALETTE.turbolaserGreen,
        size: 46, light: 3.2, lightRange: 900, duration: 0.22,
      });

      const strength = rng.range(salvo.strength[0], salvo.strength[1]);
      if (hits) {
        const impact = to.clone();
        script.flashes.push({
          t0: t1, position: impact, color: salvo.shielded ? 0x8fd8ff : 0xffca7a,
          size: 40 + strength * 90, light: 5 + strength * 6, lightRange: 1400, duration: 0.5 + strength * 0.35,
        });
        script.sparks.push({
          t0: t1, position: impact, count: Math.round(24 + strength * 40),
          speed: 90 + strength * 130, spread: Math.PI * 0.55,
          direction: tmp.clone().negate(),
          color: salvo.shielded ? 0x9fe6ff : 0xffd08a,
          colorB: salvo.shielded ? 0x4c9dff : 0xff6a2a,
          size: 4.5, life: 0.9, radius: 3,
        });
        if (!salvo.shielded) {
          script.smoke.push({
            t0: t1, position: impact, count: Math.round(10 + strength * 16),
            speed: 26, spread: Math.PI * 0.7, direction: tmp.clone().negate(),
            color: 0x6d6a66, colorB: 0x2b2926, size: 16, life: 3.0, radius: 4, stagger: 0.25,
          });
          script.debris.push({
            t0: t1, position: impact, direction: tmp.clone().negate(),
            count: Math.round(3 + strength * 7), speed: 70 + strength * 90,
            size: 2.4 + strength * 3, life: 4.5,
          });
        }
        script.damage.push({
          time: t1,
          position: hullLocal.clone(),
          strength,
          shielded: salvo.shielded,
        });
        script.impactCues.push({ time: t1, strength, shielded: salvo.shielded, position: impact.clone() });
      } else {
        // Near miss: a smaller flare as the bolt streaks past.
        script.flashes.push({
          t0: t1, position: to.clone(), color: PALETTE.turbolaserGreen,
          size: 30, light: 1.4, lightRange: 700, duration: 0.18,
        });
      }
    }
  }

  // --- The shot that kills the drives ------------------------------------
  {
    const t0 = 150.6;
    const turretLocal = turretLocals[0];
    const from = destroyerPointAt(t0, turretLocal, new THREE.Vector3());
    const engineLocal = new THREE.Vector3(0, 0, -74);
    const { t1, to } = solveArrival(t0, from, (t, out) => runnerPointAt(t, engineLocal, out), TURBOLASER_SPEED);
    tmp.copy(to).sub(from).normalize();
    from.addScaledVector(tmp, 55);
    script.imperialBolts.push({ t0, t1, from: from.clone(), to: to.clone(), color: PALETTE.turbolaserGreen, length: 30, radius: 2.4 });
    script.fireCues.push({ time: t0, kind: 'turbolaser', position: from.clone() });
    script.flashes.push({ t0: t1, position: to.clone(), color: 0xffdca0, size: 260, light: 16, lightRange: 2600, duration: 1.5 });
    script.sparks.push({
      t0: t1, position: to.clone(), count: 150, speed: 230, spread: Math.PI,
      color: 0xfff0c8, colorB: 0xff5a1e, size: 7, life: 1.6, radius: 6,
    });
    script.smoke.push({
      t0: t1, position: to.clone(), count: 46, speed: 55, spread: Math.PI,
      color: 0x88837c, colorB: 0x201e1c, size: 30, life: 6.0, radius: 8, stagger: 0.7,
    });
    script.debris.push({ t0: t1, position: to.clone(), direction: new THREE.Vector3(0, 0.2, -1), count: 26, speed: 150, size: 5, life: 8 });
    script.damage.push({ time: t1, position: engineLocal.clone(), strength: 1, shielded: false });
    script.impactCues.push({ time: t1, strength: 1.35, shielded: false, position: to.clone() });
  }

  // --- Rebel return fire --------------------------------------------------
  const rebelTurrets = [new THREE.Vector3(0, 9.2, -6), new THREE.Vector3(0, -8.4, -6)];
  for (let i = 0; i < 18; i++) {
    const t0 = 116 + (i / 18) * 30 + rng.range(-0.3, 0.3);
    const turretLocal = rebelTurrets[i % 2];
    const from = runnerPointAt(t0, turretLocal, new THREE.Vector3());
    // Aim at the destroyer's ventral hull with scatter; the corvette's guns
    // cannot realistically hurt it, which is the point.
    const aimLocal = new THREE.Vector3(rng.range(-260, 260), -95, rng.range(-500, 500));
    const { t1, to } = solveArrival(t0, from, (t, out) => destroyerPointAt(t, aimLocal, out), REBEL_BOLT_SPEED);
    tmp.copy(to).sub(from).normalize();
    from.addScaledVector(tmp, 12);
    script.rebelBolts.push({
      t0, t1, from: from.clone(), to: to.clone(),
      color: PALETTE.rebelBoltRed, length: 15, radius: 1.0,
    });
    script.fireCues.push({ time: t0, kind: 'rebel', position: from.clone() });
    script.flashes.push({ t0, position: from.clone(), color: PALETTE.rebelBoltRed, size: 16, light: 1.2, lightRange: 260, duration: 0.16 });
    script.flashes.push({ t0: t1, position: to.clone(), color: 0xffb060, size: 34, light: 2.4, lightRange: 700, duration: 0.4 });
    script.sparks.push({
      t0: t1, position: to.clone(), count: 16, speed: 90, spread: Math.PI * 0.6,
      direction: tmp.clone().negate(), color: 0xffd8a0, colorB: 0xff5a20, size: 3.4, life: 0.7, radius: 2,
    });
  }

  // --- Lingering damage smoke from the dead engine block ------------------
  for (let i = 0; i < 26; i++) {
    const t0 = 153 + i * 1.35;
    const runnerLocal = new THREE.Vector3(rng.range(-6, 6), rng.range(-4, 4), rng.range(-78, -60));
    const p = runnerPointAt(t0, runnerLocal, new THREE.Vector3());
    script.smoke.push({
      t0, position: p, count: 6, speed: 16, spread: Math.PI * 0.5,
      direction: new THREE.Vector3(0, 0.4, -1), color: 0x5d5a55, colorB: 0x1a1918,
      size: 20, life: 7, radius: 4, stagger: 0.6,
    });
    if (i % 3 === 0) {
      script.sparks.push({
        t0, position: p, count: 8, speed: 55, spread: Math.PI,
        color: 0xffc978, colorB: 0xff4a12, size: 3, life: 1.1, radius: 2,
      });
    }
  }

  script.imperialBolts.sort((a, b) => a.t0 - b.t0);
  script.rebelBolts.sort((a, b) => a.t0 - b.t0);
  script.impactCues.sort((a, b) => a.time - b.time);
  script.fireCues.sort((a, b) => a.time - b.time);
  script.damage.sort((a, b) => a.time - b.time);
  return script;
}

/** Aggregate camera shake from the battle at time `t`. */
export function battleShake(script: BattleScript, t: number): number {
  let s = 0;
  for (const cue of script.impactCues) {
    const dt = t - cue.time;
    if (dt < 0 || dt > 1.2) continue;
    const env = Math.pow(1 - dt / 1.2, 2.4);
    s += env * cue.strength * (cue.shielded ? 0.5 : 1);
  }
  return Math.min(1.8, s);
}
