// Fighter traffic: procedural TIE fighters (instanced, 4 draw calls for the whole wing), rack
// parking in the hangar, scripted launch / patrol / return flight paths through the ventral bay, a
// scheduler that keeps a patrol aloft, bay-door state for the hangar to animate, audio events, and
// the pilot / network hooks (PilotHook, snapshot / applySnapshot) for future NPC and multiplayer work.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HANGAR } from "../exterior/dims.js";

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _look = new THREE.Matrix4();

/** TIE/ln geometry split by material: hull (ball, pylons, frames), panels, glass, engine glow. */
export function tieGeometries() {
  const hull = [];
  const panel = [];
  const glass = [];
  const glow = [];
  const add = (arr, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    arr.push(g.index ? g.toNonIndexed() : g);
  };
  const R = 1.9;
  // cockpit ball + rear hatch bulge
  add(hull, new THREE.SphereGeometry(R, 20, 14));
  add(hull, new THREE.CylinderGeometry(R * 0.55, R * 0.7, 0.9, 16), 0, 0, R * 0.75, Math.PI / 2);
  // forward viewport: dark disc + rim + 8 spokes
  add(glass, new THREE.CircleGeometry(R * 0.62, 24), 0, 0, -R * 0.82);
  add(hull, new THREE.TorusGeometry(R * 0.62, 0.09, 8, 28), 0, 0, -R * 0.82);
  for (let k = 0; k < 8; k++) {
    add(hull, new THREE.BoxGeometry(0.07, R * 1.24, 0.08), 0, 0, -R * 0.84, 0, 0, (k / 8) * Math.PI);
  }
  // pylons to the wings
  for (const s of [-1, 1]) {
    add(hull, new THREE.CylinderGeometry(0.62, 0.72, 1.7, 12), s * (R + 0.75), 0, 0, 0, 0, Math.PI / 2);
    add(hull, new THREE.CylinderGeometry(0.9, 0.9, 0.35, 12), s * (R + 1.55), 0, 0, 0, 0, Math.PI / 2);
    // wing: hexagonal panel (tall), frame + centre spar + panel cells
    const H = 7.2;
    const W = 3.9;
    const hex = new THREE.Shape([
      new THREE.Vector2(-W / 2, -H * 0.3),
      new THREE.Vector2(0, -H / 2),
      new THREE.Vector2(W / 2, -H * 0.3),
      new THREE.Vector2(W / 2, H * 0.3),
      new THREE.Vector2(0, H / 2),
      new THREE.Vector2(-W / 2, H * 0.3),
    ]);
    const pg = new THREE.ExtrudeGeometry(hex, { depth: 0.08, bevelEnabled: false });
    add(panel, pg, s * (R + 1.75), 0, 0, 0, s * (Math.PI / 2));
    // frame: thin boxes along the hex edges
    const pts = hex.getPoints();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = a.distanceTo(b);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const g = new THREE.BoxGeometry(len, 0.22, 0.22);
      g.rotateZ(ang);
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
      // panel local (x = fwd/back, y = up) → world: rotate about y so x → z
      g.rotateY(s * (Math.PI / 2));
      g.translate(s * (R + 1.78), 0, 0);
      hull.push(g.index ? g.toNonIndexed() : g);
    }
    // centre spar (vertical) and horizontal spar
    add(hull, new THREE.BoxGeometry(0.2, H * 0.98, 0.3), s * (R + 1.78), 0, 0);
    add(hull, new THREE.BoxGeometry(0.2, 0.3, W * 0.98), s * (R + 1.78), 0, 0);
  }
  // twin engine glows at the rear
  for (const s of [-1, 1]) add(glow, new THREE.CircleGeometry(0.28, 12), s * 0.55, -0.2, R * 0.98 + 0.42);
  const merge = (arr) => {
    const g = mergeGeometries(arr, false);
    g.computeVertexNormals();
    return g;
  };
  return { hull: merge(hull), panel: merge(panel), glass: merge(glass), glow: merge(glow) };
}

/** Default rack positions (world): two rows along the hangar's side walls, hanging from the ceiling. */
export function defaultRacks() {
  const racks = [];
  const o = HANGAR.opening;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = o.z0 + 8 + i * ((o.z1 - o.z0 - 16) / 3);
      racks.push({ pos: new THREE.Vector3(s * 30, HANGAR.interiorCeilingY - 7.5, z), yaw: 0 });
    }
  }
  return racks;
}

export class PilotHook {
  /** Override in future NPC / multiplayer work. Return "launch" | "land" | null each tick. */
  decide(fighter, dt, traffic) {
    void fighter;
    void dt;
    void traffic;
    return null;
  }
  onState(fighter, state) {
    void fighter;
    void state;
  }
}

class Fighter {
  constructor(id, rack) {
    this.id = id;
    this.rack = rack;
    this.state = "parked"; // parked | launching | patrol | returning | landing
    this.position = rack.pos.clone();
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3();
    this.t = 0;
    this.path = null;
    this.pathTime = 0;
    this.phase = 0; // patrol loop parameter
    this.pilot = null;
    this.stateTime = 0;
  }
}

export function createTraffic({ scene, materials, audio, count = 8, racks = null }) {
  const group = new THREE.Group();
  group.name = "traffic";
  scene.add(group);
  const geos = tieGeometries();
  const meshes = {
    hull: new THREE.InstancedMesh(geos.hull, materials.tieHull, count),
    panel: new THREE.InstancedMesh(geos.panel, materials.tiePanel, count),
    glass: new THREE.InstancedMesh(geos.glass, materials.tieGlass, count),
    glow: new THREE.InstancedMesh(geos.glow, materials.emitRed, count),
  };
  for (const m of Object.values(meshes)) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    group.add(m);
  }
  const rackList = racks || defaultRacks();
  const fighters = [];
  for (let i = 0; i < count; i++) fighters.push(new Fighter(i, rackList[i % rackList.length]));

  // --- patrol loop: a large closed curve around the ship
  const loopPts = [
    [-900, -180, 400],
    [-1400, -60, -300],
    [-700, 220, -1300],
    [500, 320, -1500],
    [1300, 60, -600],
    [1100, -160, 500],
    [300, -320, 900],
    [-400, -300, 900],
  ].map((p) => new THREE.Vector3(...p));
  const loop = new THREE.CatmullRomCurve3(loopPts, true, "centripetal");
  const LOOP_SPEED = 260; // m/s along the loop
  const loopLength = loop.getLength();

  // bay door: requested open while any launch / landing is pending or recent
  const bay = { openness: 0, requested: false, idleTimer: 0, speed: 0.25 };
  const events = [];
  const listeners = [];
  const emit = (name, f) => {
    if (audio) audio.event(name, f.position);
    for (const fn of listeners) fn(name, f);
  };

  const below = () => new THREE.Vector3(0, HANGAR.module.bottomY - 30, (HANGAR.opening.z0 + HANGAR.opening.z1) / 2);
  const throat = (x, z) => new THREE.Vector3(THREE.MathUtils.clamp(x, -HANGAR.opening.x + 6, HANGAR.opening.x - 6), HANGAR.module.bottomY - 4, THREE.MathUtils.clamp(z, HANGAR.opening.z0 + 6, HANGAR.opening.z1 - 6));

  function launchPath(f) {
    const r = f.rack.pos;
    const t1 = throat(r.x * 0.35, r.z);
    const pts = [r.clone(), new THREE.Vector3(r.x * 0.5, HANGAR.deckY + 6, r.z), new THREE.Vector3(t1.x, HANGAR.deckY - 4, t1.z), t1, new THREE.Vector3(t1.x, HANGAR.module.bottomY - 40, t1.z + 20), new THREE.Vector3(t1.x * 3, HANGAR.module.bottomY - 120, t1.z + 140), new THREE.Vector3(t1.x * 6 - 200, -220, 450), loop.getPoint(0)];
    return { curve: new THREE.CatmullRomCurve3(pts, false, "centripetal"), duration: 26 };
  }
  function returnPath(f) {
    const r = f.rack.pos;
    const t1 = throat(r.x * 0.35, r.z);
    const pts = [f.position.clone(), new THREE.Vector3(f.position.x * 0.5, -260, 700), new THREE.Vector3(t1.x * 3, -140, 260), new THREE.Vector3(t1.x, HANGAR.module.bottomY - 50, t1.z + 30), t1, new THREE.Vector3(t1.x, HANGAR.deckY - 4, t1.z), new THREE.Vector3(r.x * 0.5, HANGAR.deckY + 6, r.z), r.clone()];
    return { curve: new THREE.CatmullRomCurve3(pts, false, "centripetal"), duration: 30 };
  }

  function setState(f, s) {
    f.state = s;
    f.stateTime = 0;
    if (f.pilot) f.pilot.onState(f, s);
  }

  const api = {
    group,
    fighters,
    bay,
    loop,
    events,
    onEvent(fn) {
      listeners.push(fn);
    },
    setPilot(id, pilot) {
      fighters[id].pilot = pilot;
    },
    setRacks(list) {
      list.forEach((r, i) => {
        if (fighters[i]) {
          fighters[i].rack = r;
          if (fighters[i].state === "parked") fighters[i].position.copy(r.pos);
        }
      });
    },
    requestLaunch(n = 1) {
      let k = 0;
      for (const f of fighters) {
        if (k >= n) break;
        if (f.state === "parked") {
          f.pendingLaunch = true;
          k++;
        }
      }
      bay.requested = k > 0 || bay.requested;
      return k;
    },
    requestRecall(n = 1) {
      let k = 0;
      for (const f of fighters) {
        if (k >= n) break;
        if (f.state === "patrol") {
          f.pendingReturn = true;
          k++;
        }
      }
      bay.requested = k > 0 || bay.requested;
      return k;
    },
    /** Network-friendly state (positions / quaternions / states). */
    snapshot() {
      return { bay: +bay.openness.toFixed(3), fighters: fighters.map((f) => ({ id: f.id, s: f.state, p: f.position.toArray().map((v) => +v.toFixed(2)), q: f.quaternion.toArray().map((v) => +v.toFixed(4)) })) };
    },
    applySnapshot(snap) {
      bay.openness = snap.bay;
      for (const s of snap.fighters) {
        const f = fighters[s.id];
        if (!f) continue;
        f.state = s.s;
        f.position.fromArray(s.p);
        f.quaternion.fromArray(s.q);
      }
      api.remote = true;
    },
    counts() {
      const c = {};
      for (const f of fighters) c[f.state] = (c[f.state] || 0) + 1;
      return c;
    },
    schedulerEnabled: true,
    update(dt, t) {
      // --- scheduler: keep 3 aloft, cycle one every ~18 s
      if (api.schedulerEnabled && !api.remote) {
        api.sched = (api.sched || 0) + dt;
        const c = api.counts();
        if (api.sched > 18) {
          api.sched = 0;
          if ((c.patrol || 0) + (c.launching || 0) < 3) api.requestLaunch(1);
          else if ((c.patrol || 0) > 2) api.requestRecall(1);
        }
        // pilots may override
        for (const f of fighters) {
          if (!f.pilot) continue;
          const cmd = f.pilot.decide(f, dt, api);
          if (cmd === "launch" && f.state === "parked") f.pendingLaunch = true;
          if (cmd === "land" && f.state === "patrol") f.pendingReturn = true;
        }
      }
      // --- bay door
      const pending = fighters.some((f) => f.pendingLaunch || f.pendingReturn || f.state === "launching" || f.state === "returning");
      if (pending) {
        bay.requested = true;
        bay.idleTimer = 0;
      } else {
        bay.idleTimer += dt;
        if (bay.idleTimer > 12) bay.requested = false;
      }
      const prevOpen = bay.openness;
      bay.openness = THREE.MathUtils.clamp(bay.openness + (bay.requested ? 1 : -1) * dt * bay.speed, 0, 1);
      if ((prevOpen < 0.02 && bay.openness >= 0.02) || (prevOpen > 0.98 && bay.openness <= 0.98)) emit("blast_door", { position: new THREE.Vector3(0, HANGAR.deckY, 0) });

      // --- fighters
      if (!api.remote) {
        for (const f of fighters) {
          f.stateTime += dt;
          if (f.state === "parked") {
            if (f.pendingLaunch && bay.openness > 0.9) {
              f.pendingLaunch = false;
              f.path = launchPath(f);
              f.pathTime = 0;
              setState(f, "launching");
              emit("tie_launch", f);
            }
            f.position.copy(f.rack.pos);
            f.quaternion.setFromAxisAngle(_up, f.rack.yaw || 0);
          } else if (f.state === "launching" || f.state === "returning") {
            f.pathTime += dt;
            const u = THREE.MathUtils.clamp(f.pathTime / f.path.duration, 0, 1);
            // ease in/out so the craft creeps through the bay and accelerates outside
            const e = f.state === "launching" ? u * u * (3 - 2 * u) : 1 - Math.pow(1 - u, 2);
            const uu = f.state === "launching" ? Math.pow(e, 0.85) : e;
            const p = f.path.curve.getPointAt(uu);
            const tan = f.path.curve.getTangentAt(uu);
            f.velocity.copy(p).sub(f.position).divideScalar(Math.max(dt, 1e-3));
            f.position.copy(p);
            // face along the tangent (nose = -z), banked slightly
            _look.lookAt(new THREE.Vector3(), tan.clone().negate(), _up);
            _q.setFromRotationMatrix(_look);
            f.quaternion.slerp(_q, Math.min(1, dt * 3));
            if (u >= 1) {
              if (f.state === "launching") {
                f.phase = 0;
                setState(f, "patrol");
              } else {
                setState(f, "parked");
                emit("tie_land", f);
              }
            }
          } else if (f.state === "patrol") {
            f.phase = (f.phase + (dt * LOOP_SPEED) / loopLength) % 1;
            const p = loop.getPointAt(f.phase);
            const tan = loop.getTangentAt(f.phase);
            // wingman offset so the patrol spreads out
            const off = new THREE.Vector3().crossVectors(tan, _up).normalize().multiplyScalar((f.id % 3) * 26 - 26);
            off.y += (f.id % 2) * 14;
            p.add(off);
            f.velocity.copy(p).sub(f.position).divideScalar(Math.max(dt, 1e-3));
            f.position.copy(p);
            _look.lookAt(new THREE.Vector3(), tan.clone().negate(), _up);
            _q.setFromRotationMatrix(_look);
            // bank into turns
            _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * 0.3 + f.id) * 0.2));
            f.quaternion.slerp(_q, Math.min(1, dt * 2));
            if (f.pendingReturn && bay.openness > 0.9) {
              f.pendingReturn = false;
              f.path = returnPath(f);
              f.pathTime = 0;
              setState(f, "returning");
              emit("tie_flyby", f);
            }
          }
        }
      }
      // --- instance matrices
      for (const f of fighters) {
        _m.compose(f.position, f.quaternion, _s);
        for (const m of Object.values(meshes)) m.setMatrixAt(f.id, _m);
      }
      for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
    },
  };
  // initial pose
  api.update(0, 0);
  return api;
}
