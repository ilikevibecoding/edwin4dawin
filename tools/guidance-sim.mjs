/**
 * Offline guidance harness.
 *
 * Runs the exact flight code from src/physics.js (threat arc construction and
 * interceptor guidance) outside the browser, so intercept geometry can be tuned
 * in seconds instead of minutes of Playwright runs.
 *
 *   node tools/guidance-sim.mjs            # summary table
 *   node tools/guidance-sim.mjs --trace    # per-second trace of one shot
 */

import * as THREE from 'three';
import {
  stepBallistic, timeToGround, interceptorFlightStep, closestApproach,
  estimateInterceptPoint, computeLaunchAttitude,
} from '../src/physics.js';
import { BATTERIES, THREAT, SCENARIOS } from '../src/config.js';
import { Random } from '../src/util/rng.js';

const DEG = Math.PI / 180;
/** Residual guidance bias multiplier; sweepable while tuning hit rates. */
const BIAS = Number(process.env.BIAS ?? 34);

/** Mirror of threats.js buildThreatArc (kept in sync deliberately). */
function buildArc({ impactPoint, altitude, range, speed, bearing, isDecoy = false }) {
  const gamma = Math.atan2(altitude, Math.max(1000, range));
  const toBase = new THREE.Vector3(-Math.sin(bearing), 0, Math.cos(bearing));
  const vel = new THREE.Vector3()
    .copy(toBase).multiplyScalar(Math.cos(gamma))
    .add(new THREE.Vector3(0, -Math.sin(gamma), 0))
    .multiplyScalar(speed);
  const drag = isDecoy ? THREAT.dragCoeff * 12 : THREAT.dragCoeff;
  const p = new THREE.Vector3(0, altitude, 0);
  const v = vel.clone();
  let t = 0;
  while (p.y > 0 && t < 400) { stepBallistic(p, v, 0.05, drag); t += 0.05; }
  return {
    spawn: new THREE.Vector3(impactPoint.x - p.x, altitude, impactPoint.z - p.z),
    vel, flightTime: t, impactSpeed: v.length(),
  };
}

/**
 * Fly one engagement.
 * @returns {{outcome, minRange, tof, killAlt, launchAt, threatAltAtLaunch}}
 */
function runEngagement({
  battery, arc, launchDelay, rng, dt = 1 / 60, trace = false,
}) {
  const def = BATTERIES.find((b) => b.id === battery);
  const bpos = new THREE.Vector3(def.position.x, 0, def.position.z);

  const threat = { pos: arc.spawn.clone(), vel: arc.vel.clone(), alive: true };
  let t = 0;
  // Coast the threat to the launch moment.
  while (t < launchDelay && threat.pos.y > 0) {
    stepBallistic(threat.pos, threat.vel, dt, THREAT.dragCoeff);
    t += dt;
  }
  if (threat.pos.y <= 0) return { outcome: 'IMPACT_BEFORE_LAUNCH', minRange: Infinity };

  const threatAltAtLaunch = threat.pos.y;
  const threatRangeAtLaunch = Math.hypot(threat.pos.x - bpos.x, threat.pos.z - bpos.z);

  // Launcher trains and elevates onto the solution, exactly as the game does.
  const avg = def.flight.designSpeed ?? def.flight.maxSpeed * 0.58;
  const sol = estimateInterceptPoint(bpos, threat.pos, threat.vel, avg, {
    maxTime: def.flight.fuelTime,
  });
  const att = computeLaunchAttitude(bpos, sol.point, def.flight);
  const pitch = att.pitchDeg * DEG;
  const dir = new THREE.Vector3(
    Math.sin(att.bearing) * Math.cos(pitch), Math.sin(pitch),
    -Math.cos(att.bearing) * Math.cos(pitch),
  ).normalize();

  const m = {
    pos: bpos.clone().setY(3.5),
    vel: dir.clone().multiplyScalar(38),
    accelCmd: new THREE.Vector3(),
    aimPoint: new THREE.Vector3(),
    launchDir: dir.clone(),
    age: 0,
    fuelLeft: def.flight.fuelTime,
    flight: def.flight,
    guidanceBias: 1 + rng.gauss(0, 0.035),
    aimError: new THREE.Vector3(
      rng.gauss(0, def.guidanceNoise * 40),
      rng.gauss(0, def.guidanceNoise * 40),
      rng.gauss(0, def.guidanceNoise * 40),
    ),
    errorDecay: 0.42 + rng.float(0, 0.2),
    terminalBias: new THREE.Vector3(
      rng.gauss(0, def.guidanceNoise * BIAS),
      rng.gauss(0, def.guidanceNoise * BIAS),
      rng.gauss(0, def.guidanceNoise * BIAS),
    ),
  };

  let minRange = Infinity;
  let prevRange = Infinity;
  let tof = 0;
  let nextTrace = 0;
  while (tof < def.flight.fuelTime + 26) {
    const prevPos = m.pos.clone();
    const prevVel = m.vel.clone();
    const tPos = threat.pos.clone();
    const tVel = threat.vel.clone();

    interceptorFlightStep(m, dt, threat.alive ? threat : null);
    stepBallistic(threat.pos, threat.vel, dt, THREAT.dragCoeff);
    tof += dt;

    const ca = closestApproach(prevPos, prevVel, tPos, tVel, dt);
    minRange = Math.min(minRange, ca.dist);
    if (ca.dist <= def.fuseRadius) {
      return {
        outcome: 'KILL', minRange: ca.dist, tof, killAlt: m.pos.y,
        threatAltAtLaunch, threatRangeAtLaunch, peakAlt: m.peakAlt ?? m.pos.y,
      };
    }
    const range = m.pos.distanceTo(threat.pos);
    m.peakAlt = Math.max(m.peakAlt ?? 0, m.pos.y);
    if (trace && tof >= nextTrace) {
      nextTrace += 1;
      console.log(`  t+${tof.toFixed(1)}s alt=${(m.pos.y / 1000).toFixed(2)}km`
        + ` spd=${m.vel.length().toFixed(0)} rng=${(range / 1000).toFixed(2)}km`
        + ` aimAlt=${(m.aimPoint.y / 1000).toFixed(2)}km`
        + ` tgtAlt=${(threat.pos.y / 1000).toFixed(2)}km`);
    }
    if (range > prevRange && minRange < def.fuseRadius * 20) {
      return {
        outcome: 'MISS_PASS', minRange, tof, threatAltAtLaunch, threatRangeAtLaunch,
        peakAlt: m.peakAlt,
      };
    }
    prevRange = range;
    if (m.pos.y <= 0) {
      return {
        outcome: 'MISS_GROUND', minRange, tof, threatAltAtLaunch, threatRangeAtLaunch,
        peakAlt: m.peakAlt,
      };
    }
    if (threat.pos.y <= 0) {
      return {
        outcome: 'THREAT_IMPACT', minRange, tof, threatAltAtLaunch, threatRangeAtLaunch,
        peakAlt: m.peakAlt,
      };
    }
  }
  return {
    outcome: 'MISS_FUEL', minRange, tof, threatAltAtLaunch, threatRangeAtLaunch,
    peakAlt: m.peakAlt,
  };
}

// ---------------------------------------------------------------------------

const trace = process.argv.includes('--trace');

function scenarioArc(scenId, rng, index = 0) {
  const scen = SCENARIOS.find((s) => s.id === scenId);
  const bearing = rng.float(scen.bearing[0], scen.bearing[1]) * DEG;
  return buildArc({
    impactPoint: new THREE.Vector3(rng.gauss(0, 46), 0, rng.gauss(-20, 52)),
    altitude: rng.float(scen.altitude[0], scen.altitude[1]),
    range: rng.float(scen.range[0], scen.range[1]),
    speed: rng.float(scen.speed[0], scen.speed[1]),
    bearing,
  });
}

if (trace) {
  const rng = new Random(11);
  const arc = scenarioArc('single', rng);
  console.log(`arc: spawn alt ${(arc.spawn.y / 1000).toFixed(1)}km`
    + ` range ${(Math.hypot(arc.spawn.x, arc.spawn.z) / 1000).toFixed(1)}km`
    + ` flight ${arc.flightTime.toFixed(1)}s impact speed ${arc.impactSpeed.toFixed(0)}`);
  for (const bat of ['vanguard', 'highlance', 'sentinel']) {
    const delay = bat === 'vanguard' ? arc.flightTime * 0.62 : 8;
    console.log(`\n${bat} (launch at t+${delay.toFixed(1)}s):`);
    const r = runEngagement({ battery: bat, arc, launchDelay: delay, rng: new Random(7), trace: true });
    console.log(' ->', JSON.stringify(r, (k, v) => (typeof v === 'number' ? +v.toFixed(1) : v)));
  }
} else {
  console.log(`BIAS=${BIAS}`);
  console.log('battery    scenario     launch   n  hit%   p50   p80   p95  killAlt   TOF');
  for (const bat of ['vanguard', 'highlance', 'sentinel']) {
    for (const scen of ['single', 'saturation', 'night']) {
      // Terminal battery engages late; the long-range ones engage early.
      const delays = bat === 'vanguard' ? [0.55, 0.68, 0.78] : [0.06, 0.14, 0.26];
      for (const frac of delays) {
        const results = [];
        for (let i = 0; i < 24; i++) {
          const rng = new Random(1000 + i * 37);
          const arc = scenarioArc(scen, rng);
          const r = runEngagement({
            battery: bat, arc, launchDelay: arc.flightTime * frac, rng: new Random(500 + i),
          });
          results.push(r);
        }
        const kills = results.filter((r) => r.outcome === 'KILL');
        const pct = (a, p) => {
          const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
          return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN;
        };
        const miss = results.map((r) => r.minRange);
        console.log(
          `${bat.padEnd(10)} ${scen.padEnd(12)} ${(frac * 100).toFixed(0).padStart(3)}%  `
          + `${String(results.length).padStart(2)} `
          + `${((kills.length / results.length) * 100).toFixed(0).padStart(4)}%  `
          + `${pct(miss, 0.5).toFixed(0).padStart(4)}  `
          + `${pct(miss, 0.8).toFixed(0).padStart(4)}  `
          + `${pct(miss, 0.95).toFixed(0).padStart(4)}  `
          + `${(pct(kills.map((r) => r.killAlt), 0.5) / 1000).toFixed(1).padStart(7)}  `
          + `${pct(kills.map((r) => r.tof), 0.5).toFixed(1).padStart(5)}`,
        );
      }
    }
  }
}
