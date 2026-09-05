// Battle choreography: fleet layout, drift and slow turns, targeting and turbolaser exchanges, hull
// impacts that scorch and eventually set ships burning, flak between the lines, dying ships that become
// drifting hulks. Deterministic given the seed and the fixed-step time it is driven with.
import * as THREE from "three";
import { buildVenator } from "./ships/venator.js";
import { buildProvidence } from "./ships/providence.js";
import { buildMunificent } from "./ships/munificent.js";
import { buildRecusant } from "./ships/recusant.js";
import { BOLT_COLORS } from "./weapons.js";

const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _to = new THREE.Vector3();
const _local = new THREE.Vector3();
const _inv = new THREE.Matrix4();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FLEET_PLAN = {
  republic: { venator: 14 },
  separatist: { providence: 6, munificent: 10, recusant: 8 },
};

export function createBattle({
  fleet,
  bolts,
  explosions,
  fighters,
  mats,
  seed = 11,
  scale = 1,
}) {
  const rand = rng(seed);
  const models = {
    venator: buildVenator(mats),
    providence: buildProvidence(mats),
    munificent: buildMunificent(mats),
    recusant: buildRecusant(mats),
  };
  for (const m of Object.values(models)) fleet.registerModel(m, 40);
  fleet.enableInstanceColor();

  // ---- layout: Republic line to the south (-z) facing north, Separatists to the north facing south,
  // with a few ships already tangled in the middle
  let id = 0;
  const place = (model, x, y, z, yaw, extraRoll = 0) => {
    const pitch = (rand() - 0.5) * 0.18;
    const roll = (rand() - 0.5) * 0.3 + extraRoll;
    const s = fleet.add(model, {
      id: id++,
      position: [x, y, z],
      euler: [pitch, yaw, roll],
      velocity: [0, 0, 0],
    });
    // forward drift along the ship's nose (-z local) plus a slow turn
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(s.quaternion);
    s.velocity.copy(fwd).multiplyScalar(12 + rand() * 26);
    s.angular.set(
      (rand() - 0.5) * 0.004,
      (rand() - 0.5) * 0.008,
      (rand() - 0.5) * 0.004,
    );
    return s;
  };
  const nV = Math.round(FLEET_PLAN.republic.venator * scale);
  for (let i = 0; i < nV; i++) {
    const row = i % 2;
    const col = Math.floor(i / 2) - (nV / 4 - 0.5);
    place(
      models.venator,
      col * 1700 + (rand() - 0.5) * 500,
      (rand() - 0.5) * 1100 - row * 400,
      -3400 + row * 1500 + (rand() - 0.5) * 600,
      Math.PI + (rand() - 0.5) * 0.5,
    );
  }
  // two Venators pushed deep into the Separatist line
  place(models.venator, -1400, 300, 2200, Math.PI - 0.6, 0.35);
  place(models.venator, 2000, -500, 3300, Math.PI + 0.9, -0.5);
  const nP = Math.round(FLEET_PLAN.separatist.providence * scale);
  for (let i = 0; i < nP; i++)
    place(
      models.providence,
      (i - (nP - 1) / 2) * 2300 + (rand() - 0.5) * 700,
      (rand() - 0.5) * 1300,
      5600 + (rand() - 0.5) * 1200,
      (rand() - 0.5) * 0.5,
    );
  const nM = Math.round(FLEET_PLAN.separatist.munificent * scale);
  for (let i = 0; i < nM; i++)
    place(
      models.munificent,
      (i - (nM - 1) / 2) * 1500 + (rand() - 0.5) * 800,
      (rand() - 0.5) * 1500,
      3600 + (rand() - 0.5) * 1600,
      (rand() - 0.5) * 0.9,
    );
  const nR = Math.round(FLEET_PLAN.separatist.recusant * scale);
  for (let i = 0; i < nR; i++)
    place(
      models.recusant,
      (i - (nR - 1) / 2) * 1900 + (rand() - 0.5) * 800,
      (rand() - 0.5) * 1800,
      7400 + (rand() - 0.5) * 1500,
      (rand() - 0.5) * 0.7,
    );
  // one Separatist frigate already burning among the Republic line
  const straggler = place(models.munificent, 600, -200, -1800, 0.4, 0.8);
  straggler.damage = 30;

  fighters.deploy(fleet.ships);

  // pre-existing battle damage: fires on a few ships
  const fires = [];
  const igniteAt = (ship, local, size) => {
    ship.fires.push({ local: local.clone(), size });
    explosions.fire(ship, local, size);
    fires.push({ ship, local: local.clone(), size });
  };
  for (const s of fleet.ships) {
    if (rand() < 0.3) {
      const w = s.randomSurfacePoint(new THREE.Vector3(), rand);
      _inv.copy(s.matrix).invert();
      igniteAt(s, w.applyMatrix4(_inv), 40 + rand() * 60);
      s.damage += 6;
    }
  }
  for (let i = 0; i < 3; i++) {
    const w = straggler.randomSurfacePoint(new THREE.Vector3(), rand);
    _inv.copy(straggler.matrix).invert();
    igniteAt(straggler, w.applyMatrix4(_inv), 60 + rand() * 60);
  }

  // ---- weapons
  const heavyBolt = {
    republic: {
      color: BOLT_COLORS.republic,
      speed: 3000,
      length: 90,
      radius: 3.2,
      damage: 1,
    },
    separatist: {
      color: BOLT_COLORS.separatist,
      speed: 3000,
      length: 80,
      radius: 2.8,
      damage: 1,
    },
  };
  const lightBolt = {
    republic: {
      color: BOLT_COLORS.republic,
      speed: 3400,
      length: 40,
      radius: 1.4,
      damage: 0.3,
    },
    separatist: {
      color: BOLT_COLORS.separatist,
      speed: 3400,
      length: 36,
      radius: 1.3,
      damage: 0.3,
    },
  };

  bolts.onHit = (b) => {
    const s = b.target;
    if (!s || !s.alive) {
      explosions.flak(b.to, b.kind === "fighter" ? 12 : 45);
      return;
    }
    if (b.miss) {
      // shot went wide: burst of flak past the hull
      explosions.flak(b.to, 40 + Math.random() * 30);
      return;
    }
    _inv.copy(s.matrix).invert();
    _local.copy(b.to).applyMatrix4(_inv);
    const size = b.kind === "fighter" ? 14 : b.kind === "light" ? 28 : 55;
    explosions.hit(b.to, size, s, _local);
    if (s.health <= 0) return;
    s.damage += b.damage;
    // every so much damage a new persistent fire starts at the last impact
    if (
      Math.floor(s.damage / 10) > Math.floor((s.damage - b.damage) / 10) &&
      s.fires.length < 6
    )
      igniteAt(s, _local, 45 + Math.random() * 50);
    if (s.damage > 70 && s.health > 0) {
      // the ship dies: big detonation, becomes a dark drifting hulk still burning
      s.health = 0;
      explosions.blast(s.position, s.model.length * 0.5);
      for (let i = 0; i < 4; i++) {
        const w = s.randomSurfacePoint(new THREE.Vector3());
        igniteAt(s, w.applyMatrix4(_inv), 80 + Math.random() * 80);
      }
      s.angular.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
      );
    }
  };

  function retarget() {
    for (const s of fleet.ships) {
      if (s.health <= 0) {
        s.target = null;
        continue;
      }
      let best = null;
      let bestD = Infinity;
      for (const o of fleet.ships) {
        if (o.side === s.side || o.health <= 0) continue;
        const d = o.position.distanceTo(s.position);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      s.target = best && bestD < 15000 ? best : null;
    }
  }

  function fireFrom(s, hpIndex) {
    const hp = s.model.hardpoints[hpIndex];
    const t = s.target;
    s.hardpointWorld(hpIndex, _from, _dir);
    // aim at a random point on the target hull; a fraction miss and fly past
    t.randomSurfacePoint(_to);
    const miss = Math.random() < 0.28;
    if (miss)
      _to.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 900,
          (Math.random() - 0.5) * 500,
          (Math.random() - 0.5) * 900,
        ),
      );
    // only fire when the target is roughly on the hardpoint's side (turrets cannot shoot through the hull)
    const toTarget = _to.clone().sub(_from).normalize();
    if (toTarget.dot(_dir) < -0.25) return false;
    const spec = (hp.kind === "heavy" ? heavyBolt : lightBolt)[s.side];
    const b = bolts.fire(_from, _to, {
      ...spec,
      target: t,
      side: s.side,
      kind: hp.kind === "heavy" ? "turbo" : "light",
    });
    if (b) b.miss = miss;
    return !!b;
  }

  const fighterBolt = {
    republic: {
      color: BOLT_COLORS.fighterRepublic,
      speed: 2400,
      length: 22,
      radius: 0.7,
      damage: 0.05,
    },
    separatist: {
      color: BOLT_COLORS.fighterSeparatist,
      speed: 2400,
      length: 22,
      radius: 0.7,
      damage: 0.05,
    },
  };
  const fighterFire = (f) => {
    const t = f.anchor;
    t.randomSurfacePoint(_to);
    const spec = fighterBolt[f.side];
    const b = bolts.fire(f.pos, _to, {
      ...spec,
      target: t,
      side: f.side,
      kind: "fighter",
    });
    if (b) b.miss = Math.random() < 0.4;
  };

  let retargetTimer = 0;
  let flakTimer = 0;
  let time = 0;
  const stats = { shotsHeavy: 0, shotsLight: 0, kills: 0 };

  return {
    fleet,
    models,
    fires,
    get time() {
      return time;
    },
    update(dt, camPos) {
      time += dt;
      retargetTimer -= dt;
      if (retargetTimer <= 0) {
        retargetTimer = 0.6;
        retarget();
      }
      for (const s of fleet.ships) {
        if (s.health <= 0 || !s.target) continue;
        const n = s.model.hardpoints.length;
        for (let i = 0; i < n; i++) {
          s.cooldowns[i] -= dt;
          if (s.cooldowns[i] > 0) continue;
          const hp = s.model.hardpoints[i];
          const d = s.target.position.distanceTo(s.position);
          if (d > hp.range) {
            s.cooldowns[i] = 0.5;
            continue;
          }
          if (fireFrom(s, i)) {
            if (hp.kind === "heavy") stats.shotsHeavy++;
            else stats.shotsLight++;
          }
          s.cooldowns[i] =
            hp.kind === "heavy"
              ? 2.4 + Math.random() * 3.5
              : 0.9 + Math.random() * 2.2;
        }
      }
      // flak: bursts scattered between the lines
      flakTimer -= dt;
      if (flakTimer <= 0) {
        flakTimer = 0.12;
        const p = new THREE.Vector3(
          (Math.random() - 0.5) * 12000,
          (Math.random() - 0.5) * 3000,
          -3000 + Math.random() * 10000,
        );
        explosions.flak(p, 30 + Math.random() * 60);
      }
      fleet.update(dt, camPos);
      fighters.update(dt, time, fighterFire);
      bolts.update(dt);
      explosions.update(dt);
      stats.kills = fleet.ships.filter((s) => s.health <= 0).length;
    },
    stats,
    serialize() {
      return {
        time: +time.toFixed(2),
        ships: fleet.serialize(),
        bolts: bolts.alive,
        particles: explosions.alive,
        fighters: fighters.count,
      };
    },
  };
}
