// View modes and the transitions between them: exterior orbit/fly ⇄ interior first-person. Boarding flies
// the camera to the bridge glazing and fades into the bridge; leaving fades to an exterior view placed
// outside the hull feature the player was inside, so spatial continuity is never lost.
import * as THREE from "three";
import { BOARDING, CLUSTER_EXIT_VIEW, ROOM_BY_ID } from "../core/layout.js";

export class Modes {
  constructor({ camera, player, rig, rooms, hud, scene, sun, space, onMode = null, exterior = null }) {
    this.camera = camera;
    this.player = player;
    this.rig = rig;
    this.rooms = rooms;
    this.hud = hud;
    this.scene = scene;
    this.sun = sun;
    this.space = space;
    this.exterior = exterior;
    this.onMode = onMode;
    this.mode = "exterior";
    this.busy = false;
    this.fogInterior = new THREE.FogExp2(0x0a0c12, 0.012);
  }

  get isInterior() {
    return this.mode === "interior";
  }

  applyMode(mode) {
    this.mode = mode;
    if (mode === "interior") {
      this.player.enabled = true;
      this.rig.enabled = false;
      this.rig.mode = "off";
      this.camera.near = 0.05;
      this.camera.far = 6000;
      this.scene.fog = this.fogInterior;
      this.rooms.group.visible = true;
      this.rooms.setExteriorPeek(false);
      this.hud.setModeHint("V exterior view · E interact · Shift sprint · Esc release");
    } else {
      this.player.enabled = false;
      this.player.releaseLock();
      this.rig.enabled = true;
      this.camera.near = 1;
      this.camera.far = 40000;
      this.scene.fog = null;
      // keep the glazed tower rooms rendering so the bridge glows behind its windows from outside
      this.rooms.group.visible = true;
      this.rooms.prefetch("tower");
      this.rooms.setExteriorPeek(true);
      this.hud.setModeHint("drag orbit · wheel zoom · F free-fly · Enter board");
    }
    this.camera.updateProjectionMatrix();
    if (this.onMode) this.onMode(mode);
  }

  /** Start outside, orbiting the ship. */
  startExterior(pos = [1300, 420, 900], target = [0, 60, -120]) {
    this.applyMode("exterior");
    this.rig.setOrbit(pos, target);
  }

  /** Put the player inside at a pose (feet position + yaw), building the cluster synchronously. */
  enterInterior(pos, yawDeg = 0, pitchDeg = 0) {
    this.rooms.teleport(new THREE.Vector3(pos[0], pos[1], pos[2]));
    this.player.setPose(pos[0], pos[1], pos[2], yawDeg, pitchDeg);
    this.applyMode("interior");
  }

  /** Cinematic boarding: exterior camera flies to the bridge glazing, fade, first-person on the bridge. */
  async board() {
    if (this.busy || this.mode === "interior") return;
    this.busy = true;
    this.hud.setStatus("Boarding — approach vector locked on the bridge.");
    this.rooms.prefetch("tower");
    const rig = this.rig;
    const dist = this.camera.position.distanceTo(new THREE.Vector3(...BOARDING.approach));
    const dur = THREE.MathUtils.clamp(dist / 700, 2.5, 6);
    await new Promise((resolve) => rig.flyTo(BOARDING.approach, BOARDING.lookAt, dur, resolve));
    await this.hud.fadeIn(500);
    const s = BOARDING.spawn;
    this.enterInterior(s.pos, s.yaw, 0);
    await this.hud.fadeOut(700);
    this.hud.setStatus(`${ROOM_BY_ID.bridge.title} — Imperial I-class Star Destroyer Redoubt`);
    this.busy = false;
  }

  /** Leave the interior: fade, exterior camera outside the current cluster looking back at it. */
  async exit() {
    if (this.busy || this.mode !== "interior") return;
    this.busy = true;
    await this.hud.fadeIn(450);
    const cluster = this.rooms.current ? this.rooms.current.cluster : "tower";
    const v = CLUSTER_EXIT_VIEW[cluster] || CLUSTER_EXIT_VIEW.tower;
    this.applyMode("exterior");
    this.rig.setOrbit(v.pos, v.target);
    await this.hud.fadeOut(600);
    this.hud.setStatus(`Exterior view — you were in the ${clusterName(cluster)}. Enter to board again.`);
    this.busy = false;
  }

  handleKey(code) {
    if (this.busy) return false;
    if (this.mode === "exterior") {
      if (code === "Enter" || code === "KeyB") {
        this.board();
        return true;
      }
      if (code === "KeyF") {
        this.rig.toggleFly();
        return true;
      }
    } else if (this.mode === "interior") {
      if (code === "KeyV") {
        this.exit();
        return true;
      }
    }
    return false;
  }
}

function clusterName(c) {
  return { tower: "command tower", hangar: "ventral hangar deck", engineering: "aft engineering section", crew: "mid-hull crew deck" }[c] || c;
}
