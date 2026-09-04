// Camera mode manager: exterior orbit <-> interior first person, with fades and cinematic fly-ins so
// the two views never cut confusingly. Also owns the per-mode camera near/far and the boarding logic
// (which cluster you board depends on where the exterior camera is looking).
import * as THREE from "three";
import { CLUSTERS, SPAWNS, TOWER, HANGAR_WELL, roomFloorY } from "../config/layout.js";

const INTERIOR_NEAR = 0.06;
const EXTERIOR_NEAR = 2.0;
const FAR = 260000;
const EXTERIOR_FOV = 55;
const INTERIOR_FOV = 72;

export class CameraModes {
  constructor({ camera, player, exterior, hud, zone, audio }) {
    this.camera = camera;
    this.player = player;
    this.exterior = exterior;
    this.hud = hud;
    this.zone = zone;
    this.audio = audio;
    this.mode = "exterior";
    this.busy = false;
    this.listeners = [];
    this._onKey = (e) => {
      if (e.code === "KeyF" && !e.repeat && !this.busy && !(this.hud.menuVisible && this.hud.menuVisible())) this.toggle();
    };
    document.addEventListener("keydown", this._onKey);
  }

  onChange(cb) {
    this.listeners.push(cb);
  }
  emit(mode) {
    for (const cb of this.listeners) cb(mode);
  }

  setExteriorImmediate(preset = "reveal") {
    this.mode = "exterior";
    this.player.enabled = false;
    this.player.frozen = true;
    this.exterior.enabled = true;
    this.exterior.setPreset(preset, true);
    this.camera.near = EXTERIOR_NEAR;
    this.camera.far = FAR;
    this.camera.fov = EXTERIOR_FOV;
    this.camera.updateProjectionMatrix();
    this.hud.setMode("EXTERIOR VIEW  ·  F TO BOARD");
    this.hud.setCrosshairVisible(false);
    this.hud.setLocation("");
    this.emit(this.mode);
  }

  setInteriorImmediate(spawnId = "tower") {
    const sp = SPAWNS[spawnId] || SPAWNS.tower;
    const y = roomFloorY(sp.room);
    this.mode = "interior";
    this.exterior.enabled = false;
    this.player.enabled = true;
    this.player.frozen = false;
    this.player.teleport(sp.x, y, sp.z, THREE.MathUtils.degToRad(sp.yaw));
    this.player.pitch = 0;
    this.player.updateCamera(0);
    this.camera.near = INTERIOR_NEAR;
    this.camera.far = FAR;
    this.camera.fov = INTERIOR_FOV;
    this.camera.updateProjectionMatrix();
    this.hud.setMode("");
    this.hud.setCrosshairVisible(true);
    this.emit(this.mode);
  }

  // Which cluster is the exterior camera nearest / looking at?
  boardingTarget() {
    const p = this.camera.position;
    let best = "tower";
    let bestD = Infinity;
    for (const c of Object.values(CLUSTERS)) {
      const d = Math.hypot(p.x - c.center[0], p.y - c.center[1], p.z - c.center[2]);
      if (d < bestD) {
        bestD = d;
        best = c.id;
      }
    }
    // the bridge is the natural place to arrive unless you're clearly under the ship
    if (best !== "hangar" && this.camera.position.y > -20) best = "tower";
    return best;
  }

  async toggle() {
    if (this.mode === "exterior") return this.board();
    return this.leave();
  }

  async board(clusterId = null) {
    if (this.busy || this.mode !== "exterior") return false;
    this.busy = true;
    this.exterior.locked = true;
    const target = clusterId || this.boardingTarget();
    // cinematic approach: fly to the bridge windows / the hangar well, then fade
    if (target === "hangar") {
      const wz = (HANGAR_WELL.z0 + HANGAR_WELL.z1) / 2;
      await this.exterior.flyTo([12, HANGAR_WELL.yKeel - 90, wz + 40], [0, HANGAR_WELL.yDeck, wz], 2.4);
    } else {
      const bm = TOWER.bridgeModule;
      await this.exterior.flyTo([18, 197, bm.z0 - 60], [0, 194, bm.z0 + 10], 2.6);
    }
    if (this.audio) this.audio.play("board");
    await this.hud.fadeIn(500);
    this.setInteriorImmediate(target === "hangar" ? "hangar" : "bridge");
    // let the zone manager stream the destination in before the fade lifts
    await new Promise((r) => setTimeout(r, 120));
    await this.hud.fadeOut(700);
    this.hud.setStatus("Welcome aboard. F returns to the exterior view.");
    this.player.requestLock();
    this.exterior.locked = false;
    this.busy = false;
    return true;
  }

  async leave() {
    if (this.busy || this.mode !== "interior") return false;
    this.busy = true;
    if (document.exitPointerLock) document.exitPointerLock();
    await this.hud.fadeIn(400);
    const cl = this.zone.currentCluster || "tower";
    const p = this.player.position;
    this.mode = "exterior";
    this.player.enabled = false;
    this.player.frozen = true;
    this.exterior.enabled = true;
    this.camera.near = EXTERIOR_NEAR;
    this.camera.far = FAR;
    this.camera.fov = EXTERIOR_FOV;
    this.camera.updateProjectionMatrix();
    // stand off outside the cluster you were in, looking back at it
    if (cl === "tower") this.exterior.setPose([p.x + 40, 200, TOWER.bridgeModule.z0 - 120], [p.x, 194, TOWER.bridgeModule.z0 + 20]);
    else if (cl === "hangar") this.exterior.setPose([60, HANGAR_WELL.yKeel - 160, p.z + 60], [0, HANGAR_WELL.yDeck, p.z]);
    else if (cl === "crew") this.exterior.setPose([-260, 140, p.z - 120], [0, 60, p.z]);
    else this.exterior.setPose([320, 120, p.z + 160], [0, 20, p.z]);
    this.hud.setMode("EXTERIOR VIEW  ·  F TO BOARD");
    this.hud.setCrosshairVisible(false);
    this.hud.hidePrompt();
    this.hud.setLocation("");
    this.emit(this.mode);
    await new Promise((r) => setTimeout(r, 120));
    await this.hud.fadeOut(600);
    this.hud.setStatus("Exterior view. Drag to orbit, wheel to zoom, 1–8 presets, F to board.");
    this.busy = false;
    return true;
  }
}
