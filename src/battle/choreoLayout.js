// Fleet layout for the Battle of Coruscant: a Republic main line in staggered pairs and wedges to the
// south (-Z, facing north) with Dreadnoughts in its gaps as artillery and Acclamator transports behind
// it, Arquitens and Carrack escorts weaving under the Venators and Consular couriers darting along their
// flanks; the Separatist line to the north with the Providences behind a screen of Munificent frigates
// and Recusant destroyers and the Lucrehulk battleships hanging far behind, above and below the layer;
// a melee zone in the middle where ships of both sides pass close at odd angles, and a few ships far
// below near the planet or high above, so every camera angle has ships in the foreground, middle and
// background. Placement is deterministic from the seeded rng and ends with a pairwise separation pass on
// the ships' oriented hull boxes (the lighter hull of a pair gives way).
import * as THREE from "three";
import { boxesOverlap, dirFromYawPitch } from "./choreoRng.js";
import {
  makeEscortPath,
  escortOffset,
  makeCourierRun,
  runPoint,
  yawOf,
} from "./choreoMotion.js";

// counts at scale 1 (67 capital ships); `scale` multiplies every class count (never below one ship of a
// class that is present). Classes whose builder is missing are simply left out.
export const FLEET_PLAN = {
  republic: {
    venator: 14,
    acclamator: 6,
    arquitens: 8,
    carrack: 5,
    dreadnought: 3,
    consular: 6,
  },
  separatist: { providence: 5, munificent: 10, recusant: 8, lucrehulk: 2 },
};

// per-class tuning: hit points (heavy turbolaser hit = 0.6), how likely the director picks the class to
// die (0 = never: the class only burns), cruise speed range, slot spacing in a line, `turn` scales the
// turn rate and acceleration of the class (escorts and couriers are nimble, the Lucrehulk ponderous),
// `agile` marks the small ships that fly their own paths through the formation, `drawFire` multiplies
// the targeting score (below 1 attracts fire) and `priority` is the share of retargeting heavy-gun
// ships that swing onto the class whenever one is in range.
export const CLASS_INFO = {
  venator: { hp: 130, deathWeight: 1.0, cruise: [10, 18], spacing: 2400 },
  venatorOpen: { hp: 130, deathWeight: 1.0, cruise: [10, 18], spacing: 2400 },
  acclamator: { hp: 85, deathWeight: 1.5, cruise: [9, 16], spacing: 1750 },
  dreadnought: { hp: 72, deathWeight: 1.6, cruise: [10, 17], spacing: 1500 },
  arquitens: {
    hp: 38,
    deathWeight: 2.8,
    cruise: [30, 46],
    spacing: 900,
    turn: 3.4,
    accel: 4,
    agile: true,
  },
  carrack: {
    hp: 42,
    deathWeight: 2.6,
    cruise: [28, 42],
    spacing: 900,
    turn: 3.0,
    accel: 3.5,
    agile: true,
  },
  consular: {
    hp: 20,
    deathWeight: 3.4,
    cruise: [55, 80],
    spacing: 500,
    turn: 10,
    accel: 7,
    agile: true,
  },
  providence: { hp: 120, deathWeight: 1.0, cruise: [8, 16], spacing: 2500 },
  munificent: { hp: 70, deathWeight: 3.2, cruise: [12, 22], spacing: 1500 },
  recusant: { hp: 85, deathWeight: 2.6, cruise: [12, 22], spacing: 1900 },
  lucrehulk: {
    hp: 900,
    deathWeight: 0,
    cruise: [3, 6],
    spacing: 4500,
    turn: 0.35,
    drawFire: 0.5,
    priority: 0.32,
  },
};
export const classInfo = (id) => CLASS_INFO[id] || CLASS_INFO.venator;
export const isAgileRole = (role) => role === "escort" || role === "courier";
// line ships that escorts and couriers attach themselves to
export const WARD_CLASSES = new Set([
  "venator",
  "venatorOpen",
  "dreadnought",
  "acclamator",
]);

const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _w = new THREE.Vector3();

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
 * state record for the new ship; spec = { x, y, z, yaw, pitch, roll, role, group, cruise, ward, path }.
 * Returns { groups, melee: Vector3 centre of the melee zone }.
 */
export function layoutFleet({ models, rand, scale, addShip, boxes }) {
  const count = (side, id) =>
    models[id] ? Math.max(1, Math.round(FLEET_PLAN[side][id] * scale)) : 0;
  const nV = count("republic", "venator");
  const nA = count("republic", "acclamator");
  const nAr = count("republic", "arquitens");
  const nC = count("republic", "carrack");
  const nD = count("republic", "dreadnought");
  const nCo = count("republic", "consular");
  const nP = count("separatist", "providence");
  const nM = count("separatist", "munificent");
  const nR = count("separatist", "recusant");
  const nL = count("separatist", "lucrehulk");

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
    // the battleships barely move: a third of the carriers' drift, almost no turn
    sepBattleships: makeGroup(
      "separatist battleships",
      "separatist",
      [0, 0, 9300],
      [0.4, 0, -1.1],
      0,
      -0.00006,
    ),
  };

  const placed = [];
  // positions of line ships are relative to their group's frame origin; free ships are in world space.
  // Escorts and couriers keep the group as their frame of reference but hold no slot in it.
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
    if (group && !isAgileRole(role)) group.ships.push(st);
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
  // headings vary unit to unit (+-17 deg) and ship to ship on top (+-8 deg), pitch +-10 deg, roll
  // to +-20 deg, so the line reads three-dimensional instead of a rank of parallel wedges
  const UNIT_DX = 2600;
  const lineSpan = (units.length - 1) * UNIT_DX;
  const YAW_UNIT = 0.3;
  const PITCH = 0.17;
  const ROLL = 0.35;
  units.forEach((size, u) => {
    const ux = -lineSpan / 2 + u * UNIT_DX + rand.range(-250, 250);
    const uz = (u % 2 ? 650 : -650) + rand.range(-300, 300);
    const uy = rand.range(-650, 650);
    const uyaw = Math.PI + rand.range(-YAW_UNIT, YAW_UNIT);
    if (size === 3) {
      // wedge: leader ahead, two wingmen back and out, toed outward
      put(
        venatorModel(),
        ux,
        uy + rand.range(-100, 100),
        uz + 750,
        uyaw + rand.range(-0.14, 0.14),
        rand.range(-PITCH, PITCH),
        rand.range(-ROLL, ROLL),
        "line",
        groups.repLine,
      );
      for (const s of [-1, 1])
        put(
          venatorModel(),
          ux + s * 900,
          uy + rand.range(-260, 260),
          uz - 250 + rand.range(-150, 150),
          uyaw + s * rand.range(0.06, 0.24),
          rand.range(-PITCH, PITCH),
          s * rand.range(0.05, ROLL),
          "line",
          groups.repLine,
        );
    } else if (size === 2) {
      put(
        venatorModel(),
        ux - 480,
        uy + rand.range(-200, 200),
        uz + 380,
        uyaw + rand.range(-0.15, 0.15),
        rand.range(-PITCH, PITCH),
        rand.range(-ROLL, ROLL),
        "line",
        groups.repLine,
      );
      put(
        venatorModel(),
        ux + 480,
        uy + rand.range(-200, 200) - 300,
        uz - 380,
        uyaw + rand.range(-0.15, 0.15),
        rand.range(-PITCH, PITCH),
        rand.range(-ROLL, ROLL),
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
        rand.range(-PITCH, PITCH),
        rand.range(-ROLL, ROLL),
        "line",
        groups.repLine,
      );
    }
  });

  // ---- Dreadnought artillery in the gaps of the line, a little behind it; extras off the ends, then
  // a second rank
  {
    const gapSlots = [];
    for (let u = 0; u + 1 < units.length; u++)
      gapSlots.push([-lineSpan / 2 + (u + 0.5) * UNIT_DX, -1500]);
    gapSlots.push([-lineSpan / 2 - 1600, -1200], [lineSpan / 2 + 1600, -1200]);
    for (let u = 0; u < units.length; u++)
      gapSlots.push([-lineSpan / 2 + u * UNIT_DX, -2700]);
    for (let i = 0; i < nD; i++) {
      const [gx, gz] = gapSlots[i % gapSlots.length];
      put(
        models.dreadnought,
        gx + rand.range(-200, 200),
        rand.range(-450, 450),
        gz + rand.range(-250, 250),
        Math.PI + rand.range(-0.25, 0.25),
        rand.range(-0.12, 0.12),
        rand.range(-0.3, 0.3),
        "line",
        groups.repLine,
      );
    }
  }
  // ---- Acclamator transports in a loose rank behind the line
  for (let i = 0; i < nA; i++) {
    const x = (i - (nA - 1) / 2) * CLASS_INFO.acclamator.spacing;
    put(
      models.acclamator,
      x + rand.range(-250, 250),
      rand.range(-420, 420),
      -3100 + (i % 2 ? 380 : -380) + rand.range(-200, 200),
      Math.PI + rand.range(-0.2, 0.2),
      rand.range(-0.1, 0.1),
      rand.range(-0.25, 0.25),
      "line",
      groups.repLine,
    );
  }

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
      rand.range(-0.18, 0.18),
      rand.range(-0.4, 0.4),
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
      rand.range(-0.4, 0.4),
      rand.range(-0.17, 0.17),
      rand.range(-0.35, 0.35),
      "line",
      groups.sepCarriers,
    );
  }
  // ---- Lucrehulk battleships: 4-6 km behind the destroyer line, one above and one below the layer,
  // rings level but for a small roll, the bow gap toward the Republic, at least 3.5 km apart
  {
    const slots =
      nL === 1
        ? [[300, 1400, 0]]
        : [
            [-2300, 1500, -500],
            [2500, -1700, 500],
          ];
    for (let i = 0; i < nL; i++) {
      const [x, y, z] =
        i < slots.length
          ? slots[i]
          : [(i - 1) * 4600 - 2300, i % 2 ? -1600 : 1500, (i % 2) * 800];
      put(
        models.lucrehulk,
        x + rand.range(-150, 150),
        y + rand.range(-100, 100),
        z,
        rand.range(-0.08, 0.08),
        rand.range(-0.03, 0.03),
        rand.sign() * rand.range(0.05, 0.12),
        "line",
        groups.sepBattleships,
      );
    }
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

  // ---- escorts: Arquitens and Carracks weaving under the line Venators (each attached to a ward),
  // both classes interleaved along the line; couriers: Consulars running along the flanks of the
  // line ships, ward to ward. Both start on their paths; the separation pass moves them if needed.
  const lineVenators = placed.filter(
    (st) =>
      st.role === "line" &&
      st.group === groups.repLine &&
      (st.cls === "venator" || st.cls === "venatorOpen"),
  );
  const lineShips = placed.filter(
    (st) =>
      st.role === "line" &&
      st.group === groups.repLine &&
      WARD_CLASSES.has(st.cls),
  );
  {
    const escortModels = [];
    for (let i = 0; i < Math.max(nAr, nC); i++) {
      if (i < nAr) escortModels.push(models.arquitens);
      if (i < nC) escortModels.push(models.carrack);
    }
    const wards = lineVenators.length ? lineVenators : lineShips;
    const g = groups.repLine;
    escortModels.forEach((model, i) => {
      if (!wards.length) return;
      // wards spread over the line: walk it in steps that visit every ship before repeating
      const ward = wards[(i * 7) % wards.length];
      const path = makeEscortPath(rand, i);
      escortOffset(path, 0, _p);
      const c = Math.cos(g.yaw);
      const sn = Math.sin(g.yaw);
      _w.set(
        ward.ship.position.x + _p.x * c + _p.z * sn,
        ward.ship.position.y + _p.y,
        ward.ship.position.z - _p.x * sn + _p.z * c,
      );
      // nose along the path: where the slot will be a few seconds on
      escortOffset(path, 6, _dir);
      _dir.sub(_p);
      const yaw = Math.atan2(
        -(_dir.x * c + _dir.z * sn),
        -(-_dir.x * sn + _dir.z * c),
      );
      const info = classInfo(model.id);
      put(
        model,
        _w.x - g.pos.x,
        _w.y - g.pos.y,
        _w.z - g.pos.z,
        yaw,
        0,
        rand.range(-0.15, 0.15),
        "escort",
        g,
        { ward, path, cruise: rand.range(info.cruise[0], info.cruise[1]) },
      );
    });
  }
  {
    const wards = lineShips.length ? lineShips : lineVenators;
    const g = groups.repLine;
    for (let i = 0; i < nCo && wards.length; i++) {
      const ward = wards[(i * 5 + 2) % wards.length];
      const path = makeCourierRun(ward, rand, boxes);
      // start a little way into the run so the couriers are already moving along the flanks
      path.u = rand.range(0.05, 0.45);
      path.hold = false;
      runPoint(path, _w);
      const info = classInfo(models.consular.id);
      const yaw = yawOf(ward.ship) + (path.z1 < path.z0 ? 0 : Math.PI);
      put(
        models.consular,
        _w.x - g.pos.x,
        _w.y - g.pos.y,
        _w.z - g.pos.z,
        yaw,
        0,
        rand.range(-0.1, 0.1),
        "courier",
        g,
        { ward, path, cruise: rand.range(info.cruise[0], info.cruise[1]) },
      );
    }
  }

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
// along the line between their centres until no pair overlaps; the push is shared in inverse proportion
// to the hulls' size, so a courier gives way to a Venator and everything gives way to a Lucrehulk.
export function separate(states, boxes, rand, margin = 140, maxIter = 80) {
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
        _p.normalize().multiplyScalar(90);
        const wa = rb / (ra + rb);
        a.ship.position.addScaledVector(_p, -wa);
        b.ship.position.addScaledVector(_p, 1 - wa);
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
