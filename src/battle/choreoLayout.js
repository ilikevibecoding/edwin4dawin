// Fleet layout for the Battle of Coruscant: a Republic main line in staggered pairs and wedges to the
// south (-Z, facing north), the Separatist line to the north with the Providences behind a screen of
// Munificent frigates and Recusant destroyers, a melee zone in the middle where ships of both sides pass
// close at odd angles, and a few ships far below near the planet or high above, so every camera angle
// has ships in the foreground, middle and background. Placement is deterministic from the seeded rng and
// ends with a pairwise separation pass on the ships' oriented hull boxes.
import * as THREE from "three";
import { boxesOverlap, dirFromYawPitch } from "./choreoRng.js";

// counts at scale 1 (46 capital ships); `scale` multiplies every class count
export const FLEET_PLAN = {
  republic: { venator: 18 },
  separatist: { providence: 7, munificent: 12, recusant: 9 },
};

// per-class tuning: hit points (heavy turbolaser hit = 0.6), how likely the director picks the class to
// die, cruise speed range, and slot spacing in a line
export const CLASS_INFO = {
  venator: { hp: 130, deathWeight: 1.0, cruise: [10, 18], spacing: 2400 },
  venatorOpen: { hp: 130, deathWeight: 1.0, cruise: [10, 18], spacing: 2400 },
  providence: { hp: 120, deathWeight: 1.0, cruise: [8, 16], spacing: 2500 },
  munificent: { hp: 70, deathWeight: 3.2, cruise: [12, 22], spacing: 1500 },
  recusant: { hp: 85, deathWeight: 2.6, cruise: [12, 22], spacing: 1900 },
};
export const classInfo = (id) => CLASS_INFO[id] || CLASS_INFO.venator;

const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();

// A formation group: ships hold slots relative to this frame, which drifts and turns very slowly.
export function makeGroup(name, side, pos, vel, yaw, yawRate) {
  return {
    name,
    side,
    pos: new THREE.Vector3(...pos),
    vel: new THREE.Vector3(...vel),
    vel0: new THREE.Vector3(...vel),
    yaw,
    yawRate,
    slots: [], // Vector3 offsets in the group frame (for reinforcements to claim)
    ships: [],
  };
}

/**
 * Lay out the fleets. `addShip(model, spec)` is supplied by the choreography and returns the runtime
 * state record for the new ship; spec = { x, y, z, yaw, pitch, roll, role, group, cruise }.
 * Returns { groups, melee: Vector3 centre of the melee zone }.
 */
export function layoutFleet({ models, rand, scale, addShip, boxes }) {
  const count = (n) => Math.max(1, Math.round(n * scale));
  const nV = count(FLEET_PLAN.republic.venator);
  const nP = count(FLEET_PLAN.separatist.providence);
  const nM = count(FLEET_PLAN.separatist.munificent);
  const nR = count(FLEET_PLAN.separatist.recusant);

  const groups = {
    repLine: makeGroup(
      "republic line",
      "republic",
      [0, 0, -3700],
      [-4, 0, 7],
      Math.PI,
      0.00035,
    ),
    sepScreen: makeGroup(
      "separatist screen",
      "separatist",
      [0, 100, 3100],
      [3, 0, -5],
      0,
      -0.0003,
    ),
    sepDestroyers: makeGroup(
      "separatist destroyers",
      "separatist",
      [0, -150, 4900],
      [2, 0, -4],
      0.08,
      -0.0002,
    ),
    sepCarriers: makeGroup(
      "separatist carriers",
      "separatist",
      [0, 200, 6600],
      [1, 0, -3],
      -0.05,
      0.0002,
    ),
  };

  const placed = [];
  // positions of line ships are relative to their group's frame origin; free ships are in world space
  const put = (model, x, y, z, yaw, pitch, roll, role, group, extra = {}) => {
    const st = addShip(model, {
      x: x + (group ? group.pos.x : 0),
      y: y + (group ? group.pos.y : 0),
      z: z + (group ? group.pos.z : 0),
      yaw,
      pitch,
      roll,
      role,
      group,
      ...extra,
    });
    placed.push(st);
    if (group) group.ships.push(st);
    return st;
  };
  const venatorModel = () =>
    models.venatorOpen && rand() < 0.3 ? models.venatorOpen : models.venator;

  // ---- Republic main line: units of 2 (staggered pair) and 3 (wedge) across x
  let vLeft = nV;
  const vMelee = nV >= 6 ? Math.min(3, Math.max(1, Math.round(3 * scale))) : 1;
  const vHigh = nV >= 8 ? 1 : 0;
  const vLow = nV >= 10 ? 1 : 0;
  vLeft -= vMelee + vHigh + vLow;
  const units = [];
  {
    let left = vLeft;
    let k = 0;
    while (left > 0) {
      const size = left >= 3 && k % 2 === 0 ? 3 : Math.min(2, left);
      units.push(size);
      left -= size;
      k++;
    }
  }
  const lineSpan = (units.length - 1) * 2600;
  units.forEach((size, u) => {
    const ux = -lineSpan / 2 + u * 2600 + rand.range(-250, 250);
    const uz = (u % 2 ? 650 : -650) + rand.range(-300, 300);
    const uy = rand.range(-650, 650);
    const uyaw = Math.PI + rand.range(-0.22, 0.22);
    if (size === 3) {
      // wedge: leader ahead, two wingmen back and out
      put(
        venatorModel(),
        ux,
        uy + rand.range(-100, 100),
        uz + 750,
        uyaw + rand.range(-0.08, 0.08),
        rand.range(-0.06, 0.06),
        rand.range(-0.12, 0.12),
        "line",
        groups.repLine,
      );
      for (const s of [-1, 1])
        put(
          venatorModel(),
          ux + s * 900,
          uy + rand.range(-260, 260),
          uz - 250 + rand.range(-150, 150),
          uyaw + s * rand.range(0.05, 0.16),
          rand.range(-0.1, 0.1),
          s * rand.range(0.05, 0.28),
          "line",
          groups.repLine,
        );
    } else if (size === 2) {
      put(
        venatorModel(),
        ux - 480,
        uy + rand.range(-200, 200),
        uz + 380,
        uyaw + rand.range(-0.1, 0.1),
        rand.range(-0.08, 0.08),
        rand.range(-0.2, 0.2),
        "line",
        groups.repLine,
      );
      put(
        venatorModel(),
        ux + 480,
        uy + rand.range(-200, 200) - 300,
        uz - 380,
        uyaw + rand.range(-0.1, 0.1),
        rand.range(-0.08, 0.08),
        rand.range(-0.2, 0.2),
        "line",
        groups.repLine,
      );
    } else {
      put(
        venatorModel(),
        ux,
        uy,
        uz,
        uyaw,
        rand.range(-0.08, 0.08),
        rand.range(-0.2, 0.2),
        "line",
        groups.repLine,
      );
    }
  });

  // ---- Separatist screen: Munificents angled across the front, a few in the melee, one low
  const mMelee = nM >= 6 ? Math.min(3, Math.max(1, Math.round(3 * scale))) : 1;
  const mLow = nM >= 8 ? 1 : 0;
  const mLine = nM - mMelee - mLow;
  for (let i = 0; i < mLine; i++) {
    const x = (i - (mLine - 1) / 2) * 1500 + rand.range(-300, 300);
    put(
      models.munificent,
      x,
      rand.range(-800, 800),
      (i % 2 ? 450 : -450) + rand.range(-250, 250),
      rand.range(-0.55, 0.55),
      rand.range(-0.15, 0.15),
      rand.range(-0.35, 0.35),
      "line",
      groups.sepScreen,
    );
  }
  // ---- Recusant destroyers behind the screen, wider spacing, more pitch variety
  const rMelee = nR >= 5 ? 1 : 0;
  const rHigh = nR >= 7 ? 1 : 0;
  const rLine = nR - rMelee - rHigh;
  for (let i = 0; i < rLine; i++) {
    const x = (i - (rLine - 1) / 2) * 1900 + rand.range(-350, 350);
    put(
      models.recusant,
      x,
      rand.range(-900, 900),
      (i % 2 ? 500 : -500) + rand.range(-300, 300),
      rand.range(-0.4, 0.4),
      rand.range(-0.22, 0.22),
      rand.range(-0.4, 0.4),
      "line",
      groups.sepDestroyers,
    );
  }
  // ---- Providences at the back in a shallow chevron; one pushed forward into the melee
  const pMelee = nP >= 4 ? 1 : 0;
  const pLine = nP - pMelee;
  for (let i = 0; i < pLine; i++) {
    const c = i - (pLine - 1) / 2;
    put(
      models.providence,
      c * 2400 + rand.range(-300, 300),
      rand.range(-700, 700),
      Math.abs(c) * 260 + rand.range(-300, 300),
      rand.range(-0.3, 0.3),
      rand.range(-0.1, 0.1),
      rand.range(-0.25, 0.25),
      "line",
      groups.sepCarriers,
    );
  }

  // ---- melee zone: authored close passes at odd angles (positions around the battle centre)
  const melee = new THREE.Vector3(0, 0, 200);
  const meleeSpecs = [
    // Venator crossing a Munificent's bow, banked, 400 m above it
    {
      m: "venator",
      x: -2300,
      y: 480,
      z: 300,
      yaw: Math.PI - 0.75,
      pitch: -0.08,
      roll: 0.42,
      cruise: 26,
    },
    {
      m: "munificent",
      x: -1700,
      y: -30,
      z: 650,
      yaw: 0.9,
      pitch: 0.12,
      roll: -0.5,
      cruise: 30,
    },
    // Venator and Providence broadside to broadside, 900 m apart, slightly offset in height
    {
      m: "venator",
      x: 1500,
      y: -120,
      z: 900,
      yaw: Math.PI + 0.55,
      pitch: 0.05,
      roll: -0.3,
      cruise: 14,
    },
    {
      m: "providence",
      x: 2350,
      y: 260,
      z: 1150,
      yaw: 0.35,
      pitch: -0.06,
      roll: 0.22,
      cruise: 12,
    },
    // Recusant diving through the middle, nose down
    {
      m: "recusant",
      x: 300,
      y: 900,
      z: -200,
      yaw: -0.5,
      pitch: -0.5,
      roll: 0.6,
      cruise: 34,
    },
    // third Venator rolled almost on its side under the Recusant's dive
    {
      m: "venator",
      x: -300,
      y: -650,
      z: -400,
      yaw: Math.PI - 1.9,
      pitch: 0.18,
      roll: 1.1,
      cruise: 20,
    },
    // Munificents pushing through the Republic side of the melee
    {
      m: "munificent",
      x: 3600,
      y: 500,
      z: -600,
      yaw: 0.5,
      pitch: -0.2,
      roll: 0.9,
      cruise: 28,
    },
    {
      m: "munificent",
      x: -4200,
      y: -300,
      z: -900,
      yaw: -0.6,
      pitch: 0.25,
      roll: -0.7,
      cruise: 24,
    },
  ];
  const meleeBudget = {
    venator: vMelee,
    munificent: mMelee,
    recusant: rMelee,
    providence: pMelee,
  };
  for (const sp of meleeSpecs) {
    if (!meleeBudget[sp.m]) continue;
    meleeBudget[sp.m]--;
    const model = sp.m === "venator" ? venatorModel() : models[sp.m];
    put(
      model,
      sp.x + rand.range(-120, 120),
      sp.y + rand.range(-80, 80),
      sp.z + rand.range(-120, 120),
      sp.yaw + rand.range(-0.1, 0.1),
      sp.pitch,
      sp.roll,
      "melee",
      null,
      {
        cruise: sp.cruise,
        turn: rand.sign() * rand.range(0.0025, 0.0055),
      },
    );
  }
  // leftover melee budget (odd scales): free ships near the centre
  for (const [cls, n] of Object.entries(meleeBudget))
    for (let i = 0; i < n; i++)
      put(
        cls === "venator" ? venatorModel() : models[cls],
        rand.range(-3500, 3500),
        rand.range(-700, 700),
        rand.range(-800, 1200),
        rand.range(0, Math.PI * 2),
        rand.range(-0.3, 0.3),
        rand.range(-0.8, 0.8),
        "melee",
        null,
        {
          cruise: rand.range(15, 35),
          turn: rand.sign() * rand.range(0.0025, 0.0055),
        },
      );

  // ---- far below near the planet and high above (foreground / background for the wide shots)
  if (vLow)
    put(
      venatorModel(),
      -1800,
      -2600,
      -1500,
      Math.PI - 0.4,
      0.22,
      -0.35,
      "free",
      null,
      { cruise: 22, turn: 0.0015 },
    );
  if (mLow)
    put(models.munificent, 2600, -2300, 1900, 0.7, -0.15, 0.55, "free", null, {
      cruise: 26,
      turn: -0.002,
    });
  if (vHigh)
    put(
      venatorModel(),
      2200,
      2700,
      -2600,
      Math.PI + 0.3,
      -0.38,
      0.25,
      "free",
      null,
      { cruise: 32, turn: -0.0015 },
    );
  if (rHigh)
    put(models.recusant, -2600, 2400, 3800, -0.35, -0.3, -0.5, "free", null, {
      cruise: 30,
      turn: 0.002,
    });

  separate(placed, boxes, rand);

  // slots: where each line ship sits in its group frame after the separation pass
  for (const g of Object.values(groups)) {
    // inverse of the rotation about +Y by the group yaw used in choreoMotion
    const c = Math.cos(g.yaw);
    const s = Math.sin(g.yaw);
    for (const st of g.ships) {
      _p.copy(st.ship.position).sub(g.pos);
      st.slot.set(_p.x * c - _p.z * s, _p.y, _p.x * s + _p.z * c);
      // each ship keeps its own heading offset relative to the group heading
      _dir.set(0, 0, -1).applyQuaternion(st.ship.quaternion);
      st.yawOff = Math.atan2(-_dir.x, -_dir.z) - g.yaw;
      st.pitchOff = Math.asin(THREE.MathUtils.clamp(_dir.y, -1, 1));
    }
  }
  return { groups, melee };
}

// Pairwise separation on the oriented hull boxes: any two hulls closer than `margin` are nudged apart
// along the line between their centres (both move, half each) until no pair overlaps.
export function separate(states, boxes, rand, margin = 140, maxIter = 60) {
  const n = states.length;
  for (let it = 0; it < maxIter; it++) {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const a = states[i];
      for (let j = i + 1; j < n; j++) {
        const b = states[j];
        const ra = a.ship.model.bounds.radius;
        const rb = b.ship.model.bounds.radius;
        _p.subVectors(b.ship.position, a.ship.position);
        const d = _p.length();
        if (d > ra + rb + margin) continue; // spheres apart: boxes certainly apart
        if (
          !boxesOverlap(
            a.ship.matrix,
            boxes.get(a.ship.model.id),
            b.ship.matrix,
            boxes.get(b.ship.model.id),
            margin * 0.5,
          )
        )
          continue;
        if (d < 1) _p.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
        _p.normalize().multiplyScalar(45);
        a.ship.position.sub(_p);
        b.ship.position.add(_p);
        a.ship.updateMatrix();
        b.ship.updateMatrix();
        moved++;
      }
    }
    if (!moved) return it;
  }
  return maxIter;
}

// Nose direction of a ship state's spec (for velocities at spawn)
export function noseDir(yaw, pitch, out) {
  return dirFromYawPitch(yaw, pitch, out);
}
