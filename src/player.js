import * as THREE from "three";
import { PLAYER } from "./layout.js";

export class Player {
  constructor(camera, collision, canvas) {
    this.camera = camera;
    this.collision = collision;
    this.canvas = canvas;
    this.enabled = true;
    this.position = new THREE.Vector3(0, 0, 2.4);
    this.yaw = Math.PI;
    this.pitch = -0.08;
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.bob = 0;
    this.locked = false;
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouse = (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.2, 1.2);
    };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
    };
    this._onClick = () => {
      if (!this.enabled) return;
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouse);
    document.addEventListener("pointerlockchange", this._onLockChange);
    this.canvas.addEventListener("click", this._onClick);
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v && document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  setPose(x, z, yaw = Math.PI, pitch = 0) {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0, 0);
    this.syncCamera(0);
  }

  facing() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt) {
    if (!this.enabled) {
      this.syncCamera(0);
      return;
    }
    const accel = 9.5;
    const max = PLAYER.walkSpeed;
    const damp = 8.5;
    const forward = this.facing();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const wish = new THREE.Vector3();
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) wish.add(forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) wish.sub(forward);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) wish.sub(right);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) wish.add(right);
    if (wish.lengthSq() > 0) {
      wish.normalize();
      this.vel.addScaledVector(wish, accel * dt);
    } else {
      this.vel.multiplyScalar(Math.max(0, 1 - damp * dt));
    }
    if (this.vel.length() > max) this.vel.setLength(max);

    const next = this.position.clone().addScaledVector(this.vel, dt);
    const before = this.position.clone();
    this.position.x = next.x;
    this.collision.resolve(this.position);
    if (Math.abs(this.position.x - next.x) > 0.0001) this.vel.x = 0;
    this.position.z = next.z;
    this.collision.resolve(this.position);
    if (Math.abs(this.position.z - next.z) > 0.0001) this.vel.z = 0;

    const moving = this.vel.length() > 0.12;
    this.bob += dt * (moving ? 9.5 : 2.0);
    this.syncCamera(moving ? 1 : 0.15);
    this._moved = this.position.distanceTo(before) > 0.0005;
  }

  syncCamera(bobAmt) {
    const bobY = Math.sin(this.bob) * 0.012 * bobAmt;
    const bobX = Math.cos(this.bob * 0.5) * 0.006 * bobAmt;
    this.camera.position.set(
      this.position.x + bobX,
      PLAYER.eyeHeight + bobY,
      this.position.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouse);
    document.removeEventListener("pointerlockchange", this._onLockChange);
    this.canvas.removeEventListener("click", this._onClick);
  }
}
