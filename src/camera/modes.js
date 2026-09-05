// Camera / control modes: first-person interior, exterior orbit, and the scripted transitions between
// them (board through the bridge windows, exit through the nearest window or the hangar well). One
// PerspectiveCamera is shared; the near plane is switched per mode so both the 1.6 km hull and a 3 cm
// console bezel keep depth precision.
import * as THREE from "three";
import { TOWER, HANGAR, ROOMS, DECKS, roomFloorY } from "../config/shipSpec.js";

const NEAR = { interior: 0.05, exterior: 1.5, transition: 0.2 };
const FOV = { interior: 72, exterior: 50, transition: 60 };
const BOARD_POSE = { x: 0, z: 490.5, y: 265, yaw: 0, pitch: -3, zone: "tower" }; // bridge, on the command walkway
const EXTERIOR_HOME = { target: [0, 80, 120], distance: 2600, yaw: 0.75, pitch: 0.3 };

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class ModeManager {
  constructor({ camera, player, orbit, interior, exterior, hud, space, traffic }) {
    this.camera = camera;
    this.player = player;
    this.orbit = orbit;
    this.interior = interior;
    this.exterior = exterior;
    this.hud = hud;
    this.space = space;
    this.traffic = traffic;
    this.mode = null;
    this.transition = null;
    this.onModeChange = null;
    this._onKey = (e) => {
      if (e.repeat) return;
      if (e.code === "KeyV" || e.code === "Tab") {
        e.preventDefault();
        if (this.mode === "interior") this.exitToExterior();
        else if (this.mode === "exterior") this.boardShip();
      }
      if (this.mode === "exterior" && e.code === "KeyB") this.boardShip();
    };
    document.addEventListener("keydown", this._onKey);
  }

  setInterior(pose = BOARD_POSE, { instant = true } = {}) {
    this.mode = "interior";
    this.transition = null;
    this.orbit.enabled = false;
    this.camera.near = NEAR.interior;
    this.camera.fov = FOV.interior;
    this.camera.updateProjectionMatrix();
    this.interior.root.visible = true;
    if (this.exterior.setMode) this.exterior.setMode("interior");
    if (pose) {
      if (pose.zone) this.interior.setActiveZone(pose.zone);
      this.player.colliders = this.interior.colliders();
      this.player.floors = this.interior.floors();
      this.player.setPose(pose.x, pose.z, pose.yaw, pose.pitch, pose.y ?? null);
    }
    this.player.frozen = false;
    this.player.enabled = true;
    this.interior.update(0, this.player);
    this.exterior.setInteriorView(this.interior.exteriorWindows());
    this.hud.setMode("interior");
    if (this.onModeChange) this.onModeChange(this.mode);
  }

  setExterior(pose = EXTERIOR_HOME) {
    this.mode = "exterior";
    this.transition = null;
    this.player.frozen = true;
    this.player.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.interior.root.visible = false;
    this.exterior.group.visible = true;
    if (this.exterior.setMode) this.exterior.setMode("exterior");
    this.camera.near = NEAR.exterior;
    this.camera.fov = FOV.exterior;
    this.camera.updateProjectionMatrix();
    this.orbit.enabled = true;
    if (pose) this.orbit.setPose(pose, true);
    this.hud.setMode("exterior");
    if (this.onModeChange) this.onModeChange(this.mode);
  }

  // Path out of the current room: through the forward window bay if the room has one, down through the
  // hangar well from the hangar deck, otherwise a short fade (no window to fly through).
  _exitWaypoints() {
    const sp = this.interior.currentSpace();
    const cam = this.camera.position.clone();
    const slabFace = TOWER.slab.z0;
    if (sp && sp.windows.includes("forward")) {
      const y = cam.y + 2;
      return { pts: [cam, new THREE.Vector3(cam.x, y, slabFace - 30), new THREE.Vector3(cam.x * 2 - 60, y + 40, slabFace - 260), new THREE.Vector3(-420, 360, -260)], crossZ: slabFace, fade: false };
    }
    if (sp && sp.windows.includes("belly")) {
      const w = HANGAR.well;
      const cx = (w.x0 + w.x1) / 2;
      const cz = (w.z0 + w.z1) / 2;
      // first out over the well at eye height, then straight down through it (never through the deck)
      return { pts: [cam, new THREE.Vector3(cx, cam.y, cz), new THREE.Vector3(cx, HANGAR.deckY - 30, cz), new THREE.Vector3(cx - 80, HANGAR.deckY - 220, cz - 120), new THREE.Vector3(-380, -460, 120)], crossY: HANGAR.deckY - 2, fade: false };
    }
    return { pts: [cam, cam.clone()], fade: true };
  }

  exitToExterior() {
    if (this.mode !== "interior" || this.transition) return;
    const wp = this._exitWaypoints();
    const finalTarget = new THREE.Vector3(0, 120, 200);
    const last = wp.pts[wp.pts.length - 1];
    this.player.frozen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this.mode = "transition";
    this.camera.near = NEAR.transition;
    this.camera.updateProjectionMatrix();
    this.exterior.group.visible = true;
    const fov0 = FOV.interior;
    const fov1 = FOV.exterior;
    const startQuat = this.camera.quaternion.clone();
    const endQuat = new THREE.Quaternion();
    {
      const m = new THREE.Matrix4().lookAt(last, finalTarget, new THREE.Vector3(0, 1, 0));
      endQuat.setFromRotationMatrix(m);
    }
    const curve = wp.pts.length > 2 ? new THREE.CatmullRomCurve3(wp.pts, false, "centripetal") : null;
    const duration = wp.fade ? 1.2 : 4.5;
    this.transition = {
      kind: "exit",
      t: 0,
      duration,
      curve,
      startQuat,
      endQuat,
      wp,
      finalTarget,
      last,
      crossed: false,
      update: (dt) => {
        const tr = this.transition;
        tr.t = Math.min(1, tr.t + dt / tr.duration);
        const k = ease(tr.t);
        if (tr.wp.fade) {
          // fade out, cut to exterior, fade in
          if (tr.t < 0.45) this.hud.setFade(tr.t / 0.45);
          else if (!tr.crossed) {
            tr.crossed = true;
            this.interior.root.visible = false;
            const pos = this.orbit.positionFor(finalTarget, 2600, 0.75, 0.3);
            this.camera.position.copy(pos);
            this.camera.lookAt(finalTarget);
            this.camera.near = NEAR.exterior;
            this.camera.fov = FOV.exterior;
            this.camera.updateProjectionMatrix();
          } else this.hud.setFade(1 - (tr.t - 0.45) / 0.55);
        } else {
          tr.curve.getPoint(k, this.camera.position);
          this.camera.fov = fov0 + (fov1 - fov0) * k;
          this.camera.updateProjectionMatrix();
          this.camera.quaternion.slerpQuaternions(tr.startQuat, tr.endQuat, THREE.MathUtils.smoothstep(k, 0.15, 0.85));
          const p = this.camera.position;
          const outside = (tr.wp.crossZ !== undefined && p.z < tr.wp.crossZ) || (tr.wp.crossY !== undefined && p.y < tr.wp.crossY);
          if (outside && !tr.crossed) {
            tr.crossed = true;
            // leaving through the well: keep the lit hangar visible up the shaft (exterior peek)
            if (tr.wp.crossY !== undefined && this.interior.peek) this.interior.peek("hangar", ["hangar"]);
            else this.interior.root.visible = false;
            if (this.exterior.setMode) this.exterior.setMode("exterior");
            this.camera.near = NEAR.exterior;
            this.camera.updateProjectionMatrix();
          }
        }
        if (tr.t >= 1) {
          this.hud.setFade(0);
          const pos = tr.wp.fade ? this.orbit.positionFor(finalTarget, 2600, 0.75, 0.3) : tr.last;
          const d = pos.distanceTo(finalTarget);
          const dir = pos.clone().sub(finalTarget).normalize();
          const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
          const yaw = Math.atan2(dir.x, dir.z);
          this.setExterior({ target: finalTarget.toArray(), distance: d, yaw, pitch });
        }
      },
    };
    this.hud.setMode("transition");
  }

  boardShip(target = "bridge") {
    if (this.mode !== "exterior" || this.transition) return;
    const room = ROOMS.find((r) => r.id === target) || ROOMS[0];
    const y0 = roomFloorY(room);
    const pose = target === "bridge" ? BOARD_POSE : { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2, y: y0, yaw: 0, pitch: -3, zone: DECKS[room.deck].zone };
    // resident zone + player pose ready before the camera arrives
    if (this.interior.unpeek) this.interior.unpeek(false);
    this.interior.setActiveZone(pose.zone || "tower");
    this.player.colliders = this.interior.colliders();
    this.player.floors = this.interior.floors();
    this.player.setPose(pose.x, pose.z, pose.yaw, pose.pitch, pose.y);
    this.player.frozen = true;
    const eye = this.camera.position.clone();
    const endPos = this.player.camera.position.clone();
    const endQuat = this.player.camera.quaternion.clone();
    const slabFace = TOWER.slab.z0;
    const pts = [eye, new THREE.Vector3(endPos.x - 40, endPos.y + 30, slabFace - 420), new THREE.Vector3(endPos.x, endPos.y + 1, slabFace - 40), endPos];
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const startQuat = this.camera.quaternion.clone();
    this.orbit.enabled = false;
    this.mode = "transition";
    this.camera.near = NEAR.transition;
    this.camera.updateProjectionMatrix();
    this.interior.root.visible = false;
    this.transition = {
      kind: "board",
      t: 0,
      duration: 5.0,
      crossed: false,
      update: (dt) => {
        const tr = this.transition;
        tr.t = Math.min(1, tr.t + dt / tr.duration);
        const k = ease(tr.t);
        curve.getPoint(k, this.camera.position);
        this.camera.fov = FOV.exterior + (FOV.interior - FOV.exterior) * k;
        this.camera.updateProjectionMatrix();
        this.camera.quaternion.slerpQuaternions(startQuat, endQuat, THREE.MathUtils.smoothstep(k, 0.1, 0.9));
        if (!tr.crossed && this.camera.position.z > slabFace - 60) {
          tr.crossed = true;
          this.interior.root.visible = true;
          if (this.exterior.setMode) this.exterior.setMode("interior");
          this.interior.update(0, this.player);
          this.camera.near = NEAR.interior;
          this.camera.updateProjectionMatrix();
        }
        if (tr.t >= 1) this.setInterior(null);
      },
    };
    this.hud.setMode("transition");
  }

  update(dt) {
    if (this.transition) this.transition.update(dt);
    else if (this.mode === "exterior") this.orbit.update(dt);
  }
}

export { BOARD_POSE, EXTERIOR_HOME };
