// Fighter traffic: TIE-style craft parked in the hangar racks that release, drop through the well,
// fly a patrol loop around the ship and come back to be captured by the tractor field and re-racked.
// No NPC logic lives here: a `Pilot` decides *when* to launch / return; the default ScriptedPilot uses
// timers. Networked or AI pilots implement the same two methods. Fighter state is serialisable and the
// motion is a deterministic function of (phase, t), so a peer given the same state renders the same craft.
import * as THREE from "three";
import { HANGAR } from "../config/shipSpec.js";
import { buildTie } from "./tie.js";

export const FIGHTER_STATES = ["parked", "release", "launch", "patrol", "approach", "capture"];

/** Pilot interface. update(fighter, dt) may call fighter.requestLaunch() / fighter.requestReturn(). */
export class Pilot {
  update(_fighter, _dt) {}
}

export class ScriptedPilot extends Pilot {
  constructor(seed = 1) {
    super();
    this.t = seed * 7.3;
    this.parkTime = 14 + seed * 5;
    this.patrolTime = 40 + seed * 9;
  }
  update(f, dt) {
    this.t += dt;
    if (f.state === "parked" && this.t > this.parkTime) {
      f.requestLaunch();
      this.t = 0;
    } else if (f.state === "patrol" && this.t > this.patrolTime) {
      f.requestReturn();
      this.t = 0;
    }
  }
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

export class Fighter {
  constructor(id, rack, paths, mesh) {
    this.id = id;
    this.rack = rack; // Vector3 rack position (craft centre when parked)
    this.paths = paths; // { launch, patrol, approach } CatmullRomCurve3
    this.mesh = mesh;
    this.state = "parked";
    this.t = 0; // phase progress 0..1 within the current path
    this.pilot = null;
    this.speed = { release: 1 / 4, launch: 1 / 14, patrol: 1 / 70, approach: 1 / 16, capture: 1 / 5 };
    this.mesh.position.copy(rack);
    this.onEvent = null;
  }
  requestLaunch() {
    if (this.state === "parked") this._enter("release");
  }
  requestReturn() {
    if (this.state === "patrol") this._enter("approach");
  }
  _enter(state) {
    this.state = state;
    this.t = 0;
    if (this.onEvent) this.onEvent(this, state);
  }
  update(dt) {
    if (this.pilot) this.pilot.update(this, dt);
    if (this.state === "parked") return;
    this.t += dt * this.speed[this.state];
    if (this.t >= 1) {
      const next = { release: "launch", launch: "patrol", patrol: "patrol", approach: "capture", capture: "parked" }[this.state];
      if (this.state === "patrol") this.t -= 1;
      else if (next === "parked") {
        this.state = "parked";
        this.t = 0;
        this.mesh.position.copy(this.rack);
        this.mesh.quaternion.identity();
        if (this.onEvent) this.onEvent(this, "parked");
        return;
      } else this._enter(next);
    }
    this.pose();
  }
  // Deterministic pose for (state, t)
  pose() {
    const s = this.state;
    const k = THREE.MathUtils.clamp(this.t, 0, 1);
    if (s === "release") {
      // straight drop from the rack into the mouth of the well, nose down slightly
      this.mesh.position.copy(this.rack);
      this.mesh.position.y -= k * k * (this.rack.y - (HANGAR.deckY - 6));
      this.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -k * 0.25);
      return;
    }
    if (s === "capture") {
      // tractor beam pulls the craft up from the well mouth onto the rack
      const e = 1 - Math.pow(1 - k, 2);
      this.mesh.position.copy(this.rack);
      this.mesh.position.y -= (1 - e) * (this.rack.y - (HANGAR.deckY - 6));
      this.mesh.quaternion.identity();
      return;
    }
    const curve = this.paths[s];
    curve.getPointAt(k, this.mesh.position);
    curve.getTangentAt(k, _p);
    _m.lookAt(_p, new THREE.Vector3(0, 0, 0), UP);
    // TIE model faces -Z locally; lookAt orients +Z toward target, so flip
    _q.setFromRotationMatrix(_m);
    this.mesh.quaternion.copy(_q);
    // gentle bank on the patrol
    if (s === "patrol") this.mesh.rotateZ(Math.sin(k * Math.PI * 4) * 0.35);
  }
  serialize() {
    return { id: this.id, state: this.state, t: +this.t.toFixed(4) };
  }
  applyState(st) {
    this.state = st.state;
    this.t = st.t;
    if (this.state === "parked") this.mesh.position.copy(this.rack);
    else this.pose();
  }
}

export function createTraffic({ scene, count = 6, audio = null }) {
  const group = new THREE.Group();
  group.name = "traffic";
  scene.add(group);
  const template = buildTie();
  const well = HANGAR.well;
  const cx = (well.x0 + well.x1) / 2;
  const cz = (well.z0 + well.z1) / 2;
  const mouthY = HANGAR.deckY - 6;

  const fighters = [];
  const racks = [];
  for (const rz of HANGAR.rackZ) for (const rx of HANGAR.rackX) racks.push(new THREE.Vector3(rx, HANGAR.rackY, rz));

  for (let i = 0; i < Math.min(count, racks.length); i++) {
    const rack = racks[i];
    const side = rack.x < 0 ? -1 : 1;
    // launch: out of the well, dive away from the belly, level off and head out to the patrol ring
    const launch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rack.x, mouthY, rack.z),
      new THREE.Vector3(rack.x + side * 20, mouthY - 60, rack.z - 60),
      new THREE.Vector3(rack.x + side * 140, mouthY - 200, rack.z - 320),
      new THREE.Vector3(side * 520, -420, -300 + i * 60),
      new THREE.Vector3(side * 980, -360, -900 + i * 40),
    ], false, "centripetal");
    // patrol: a closed ring around the ship, offset per fighter so they do not stack
    const R = 1250 + i * 90;
    const pts = [];
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 + i * 0.3;
      pts.push(new THREE.Vector3(Math.cos(ang) * R * side, -360 + Math.sin(ang * 2) * 120 - i * 30, Math.sin(ang) * R - 100));
    }
    const patrol = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    const patrolStart = patrol.getPointAt(0);
    launch.points[launch.points.length - 1].copy(patrolStart);
    // approach: from the ring back under the belly, up into the well mouth
    const approach = new THREE.CatmullRomCurve3([
      patrolStart.clone(),
      new THREE.Vector3(side * 600, -380, 700),
      new THREE.Vector3(side * 120, -260, 640),
      new THREE.Vector3(rack.x + side * 10, mouthY - 70, rack.z + 90),
      new THREE.Vector3(rack.x, mouthY, rack.z),
    ], false, "centripetal");
    const mesh = template.clone();
    mesh.name = "fighter_" + i;
    group.add(mesh);
    const f = new Fighter(i, rack, { launch, patrol, approach }, mesh);
    f.pilot = new ScriptedPilot(i + 1);
    f.onEvent = (fighter, state) => {
      if (audio && state === "release") audio.play("hangar.launch", fighter.mesh);
      if (audio && state === "capture") audio.play("hangar.capture", fighter.mesh);
    };
    // stagger the initial phases so the sky is not empty at start
    if (i % 3 === 1) {
      f.state = "patrol";
      f.t = (i * 0.17) % 1;
      f.pose();
    }
    fighters.push(f);
  }

  return {
    group,
    fighters,
    template,
    update(dt) {
      for (const f of fighters) f.update(dt);
    },
    /** Replace a fighter's pilot (NPC / networked). */
    setPilot(id, pilot) {
      const f = fighters[id];
      if (f) f.pilot = pilot;
    },
    serialize() {
      return fighters.map((f) => f.serialize());
    },
    applyState(states) {
      for (const st of states) {
        const f = fighters[st.id];
        if (f) f.applyState(st);
      }
    },
    counts() {
      const c = {};
      for (const f of fighters) c[f.state] = (c[f.state] || 0) + 1;
      return c;
    },
  };
}
