// Camera director: interior first-person (Player) ↔ exterior orbit / fly cameras, with fades and
// matched hand-offs (leaving the bridge puts the orbit camera in front of the tower; leaving the
// hangar puts it under the bay). Also owns the per-mode render settings (near / far, fog, AO radius).
import * as THREE from "three";

const ORBIT = { minR: 40, maxR: 6000, rotSpeed: 0.005, damp: 8, zoomSpeed: 0.0012 };

export class CameraDirector {
  constructor({ camera, canvas, player, interior, exterior, space, hud, post, scene, audio }) {
    this.camera = camera;
    this.canvas = canvas;
    this.player = player;
    this.interior = interior;
    this.exterior = exterior;
    this.space = space;
    this.hud = hud;
    this.post = post;
    this.scene = scene;
    this.audio = audio;
    this.mode = "interior";
    this.subMode = "orbit"; // exterior: orbit | fly
    this.busy = false;
    this.onModeChange = null;
    // orbit state
    this.target = new THREE.Vector3(0, 60, 0);
    this.sph = { theta: -2.2, phi: 1.15, r: 3200 }; // current
    this.goal = { theta: -2.2, phi: 1.15, r: 3200 }; // damped toward
    this.targetGoal = this.target.clone();
    this.drag = null;
    this.flyVel = new THREE.Vector3();
    this.flyYaw = 0;
    this.flyPitch = 0;
    this.keys = new Set();
    this.interiorFog = scene.fog;
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("mousedown", (e) => {
      if (this.mode !== "exterior" || this.subMode !== "orbit") return;
      this.drag = { x: e.clientX, y: e.clientY, button: e.button };
    });
    window.addEventListener("mouseup", () => (this.drag = null));
    window.addEventListener("mousemove", (e) => {
      if (this.mode !== "exterior") return;
      if (this.subMode === "orbit") {
        if (!this.drag) return;
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
        if (this.drag.button === 2 || e.shiftKey) {
          // pan the target in the camera plane
          const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
          const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
          const k = this.sph.r * 0.0012;
          this.targetGoal.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
        } else {
          this.goal.theta -= dx * ORBIT.rotSpeed;
          this.goal.phi = THREE.MathUtils.clamp(this.goal.phi - dy * ORBIT.rotSpeed, 0.05, Math.PI - 0.05);
        }
      } else if (document.pointerLockElement === c) {
        this.flyYaw -= e.movementX * 0.0022;
        this.flyPitch = THREE.MathUtils.clamp(this.flyPitch - e.movementY * 0.0022, -1.5, 1.5);
      }
    });
    c.addEventListener(
      "wheel",
      (e) => {
        if (this.mode !== "exterior" || this.subMode !== "orbit") return;
        e.preventDefault();
        this.goal.r = THREE.MathUtils.clamp(this.goal.r * Math.exp(e.deltaY * ORBIT.zoomSpeed), ORBIT.minR, ORBIT.maxR);
      },
      { passive: false },
    );
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyV") this.toggle();
      if (e.code === "KeyF" && this.mode === "exterior") this.setSubMode(this.subMode === "orbit" ? "fly" : "orbit");
      if (this.mode === "exterior" && /^Digit[1-9]$/.test(e.code) && this.subMode === "orbit") {
        const names = Object.keys(this.exterior.stations);
        const st = names[+e.code.slice(5) - 1];
        if (st) this.goToStation(st);
      }
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  setSubMode(m) {
    this.subMode = m;
    if (m === "fly") {
      // continue from the orbit camera pose
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.flyYaw = Math.atan2(-dir.x, -dir.z);
      this.flyPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      this.flyVel.set(0, 0, 0);
      this.canvas.requestPointerLock();
      this.hud.setHint("FLY: WASD move · mouse look · Shift boost · F orbit · V board ship");
    } else {
      if (document.pointerLockElement) document.exitPointerLock();
      // re-seat the orbit around the point ahead of the fly camera
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const r = THREE.MathUtils.clamp(this.camera.position.length() * 0.6, ORBIT.minR, ORBIT.maxR);
      this.targetGoal.copy(this.camera.position).addScaledVector(dir, r);
      this.target.copy(this.targetGoal);
      this.setSphericalFromCamera(r);
      this.hud.setHint("ORBIT: drag rotate · wheel zoom · right-drag pan · 1-9 camera stations · F fly · V board ship");
    }
  }

  setSphericalFromCamera(r) {
    const off = new THREE.Vector3().subVectors(this.camera.position, this.target);
    const s = new THREE.Spherical().setFromVector3(off);
    this.sph.theta = this.goal.theta = s.theta;
    this.sph.phi = this.goal.phi = s.phi;
    this.sph.r = this.goal.r = r || s.radius;
  }

  goToStation(name, instant = false) {
    const st = this.exterior.stations[name];
    if (!st) return false;
    this.targetGoal.set(...st.look);
    const pos = new THREE.Vector3(...st.pos);
    const off = pos.clone().sub(this.targetGoal);
    const s = new THREE.Spherical().setFromVector3(off);
    this.goal.theta = s.theta;
    this.goal.phi = s.phi;
    this.goal.r = s.radius;
    if (instant) {
      this.target.copy(this.targetGoal);
      Object.assign(this.sph, this.goal);
      this.applyOrbit();
    }
    return true;
  }

  applyOrbit() {
    const s = this.sph;
    const off = new THREE.Vector3().setFromSphericalCoords(s.r, s.phi, s.theta);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }

  /** Where the exterior camera should appear when leaving the current interior sector. */
  exitStationFor(sector) {
    if (!sector) return "exterior_medium";
    const id = sector.id;
    if (id.startsWith("d1_")) return "exterior_bridge";
    if (id.startsWith("d2_")) return "exterior_tower";
    if (id.startsWith("d5_")) return "exterior_hangar";
    if (id.startsWith("d4_")) return "exterior_engines";
    return "exterior_close";
  }

  async toggle() {
    if (this.busy) return;
    if (this.mode === "interior") await this.toExterior(this.exitStationFor(this.interior.currentSector));
    else await this.toInterior();
  }

  applyModeSettings() {
    const cam = this.camera;
    if (this.mode === "interior") {
      cam.near = 0.08;
      cam.far = 60000;
      this.scene.fog = this.interiorFog;
      if (this.post) this.post.setMode("interior");
    } else {
      cam.near = 2;
      cam.far = 60000;
      this.scene.fog = null;
      if (this.post) this.post.setMode("exterior");
    }
    cam.updateProjectionMatrix();
  }

  async toExterior(station = "exterior_medium", instant = false) {
    if (this.mode === "exterior" || this.busy) return;
    this.busy = true;
    if (!instant) await this.hud.fadeIn(450);
    this.savedInterior = { pos: this.player.position.clone(), yaw: this.player.yaw, pitch: this.player.pitch };
    this.player.releaseLock();
    this.player.enabled = false;
    this.mode = "exterior";
    this.subMode = "orbit";
    this.exterior.setVisible(true);
    this.goToStation(station, true);
    this.applyModeSettings();
    this.hud.setMode("exterior");
    this.hud.setLocation("Exterior", station.replace("exterior_", "").replace("__adhoc", "free camera"));
    this.hud.setHint("ORBIT: drag rotate · wheel zoom · right-drag pan · 1-9 camera stations · F fly · V board ship");
    if (this.onModeChange) this.onModeChange("exterior");
    this.audio.event("mode_exterior");
    if (!instant) await this.hud.fadeOut(600);
    this.busy = false;
  }

  async toInterior(sectorId = null, instant = false) {
    if (this.mode === "interior" || this.busy) return;
    this.busy = true;
    if (!instant) await this.hud.fadeIn(450);
    if (document.pointerLockElement) document.exitPointerLock();
    this.mode = "interior";
    this.player.enabled = true;
    if (sectorId) this.interior.teleport(sectorId);
    else if (this.savedInterior) {
      const s = this.savedInterior;
      this.player.position.copy(s.pos);
      this.player.yaw = s.yaw;
      this.player.pitch = s.pitch;
      this.player.updateCamera(0);
    }
    this.applyModeSettings();
    this.hud.setMode("interior");
    const cur = this.interior.currentSector;
    if (cur) this.hud.setLocation(cur.deck.name, cur.def.name);
    this.hud.setHint("WASD move · Shift sprint · mouse look · E interact · V exterior view · R red alert · F3 stats");
    if (this.onModeChange) this.onModeChange("interior");
    this.audio.event("mode_interior");
    if (!instant) await this.hud.fadeOut(600);
    this.busy = false;
  }

  update(dt) {
    if (this.mode !== "exterior") return;
    if (this.subMode === "orbit") {
      const k = 1 - Math.exp(-ORBIT.damp * dt);
      this.sph.theta += (this.goal.theta - this.sph.theta) * k;
      this.sph.phi += (this.goal.phi - this.sph.phi) * k;
      this.sph.r += (this.goal.r - this.sph.r) * k;
      this.target.lerp(this.targetGoal, k);
      // WASD nudges the target (inspecting details)
      const move = new THREE.Vector3();
      if (this.keys.has("KeyW")) move.z -= 1;
      if (this.keys.has("KeyS")) move.z += 1;
      if (this.keys.has("KeyA")) move.x -= 1;
      if (this.keys.has("KeyD")) move.x += 1;
      if (this.keys.has("KeyQ")) move.y -= 1;
      if (this.keys.has("KeyE")) move.y += 1;
      if (move.lengthSq() > 0) {
        move.normalize().applyQuaternion(this.camera.quaternion);
        this.targetGoal.addScaledVector(move, dt * this.sph.r * 0.5);
      }
      this.applyOrbit();
    } else {
      const speed = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 900 : 180) * dt;
      const wish = new THREE.Vector3();
      if (this.keys.has("KeyW")) wish.z -= 1;
      if (this.keys.has("KeyS")) wish.z += 1;
      if (this.keys.has("KeyA")) wish.x -= 1;
      if (this.keys.has("KeyD")) wish.x += 1;
      if (this.keys.has("KeyQ")) wish.y -= 1;
      if (this.keys.has("KeyE")) wish.y += 1;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.flyPitch, this.flyYaw, 0, "YXZ"));
      if (wish.lengthSq() > 0) wish.normalize().applyQuaternion(q).multiplyScalar(speed);
      this.flyVel.lerp(wish, 1 - Math.exp(-6 * dt));
      this.camera.position.add(this.flyVel);
      this.camera.quaternion.copy(q);
    }
  }
}
