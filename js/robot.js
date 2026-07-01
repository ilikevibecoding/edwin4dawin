import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, noiseTexture } from './util.js';

// SRV-BOT 01. Soft-shell service robot seen from its own head cam.
// Forward is local -Z. The camera parents into the head so mouse look IS the
// head; looking down shows the chest panel, mast, base, and both arms.

const L1 = 0.38;              // upper arm
const L2 = 0.38;              // forearm
const MAX_REACH = (L1 + L2) * 0.985;
const PALM_UP = 0.20;         // wrist sits this far above the fingertip point
const SHOULDER_MAX = 1.02;    // mast fully extended
const SHOULDER_MIN = 0.52;    // mast fully compressed
const JAW_HALF_LIMIT = 0.15;  // biggest half-width the claw can close around
const FINGER_LEN = 0.13;
const FINGER_PIVOT_X = 0.065;
const OPEN_ANGLE = 0.72;

export const ARM_LIMITS = {
  theta: [-1.35, 1.35],
  reach: [0.28, 0.72],
  height: [0.005, 1.08],
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

function makeMats() {
  const bump = noiseTexture('#8a6f68', 26, 64);
  bump.repeat.set(3, 3);
  const shell = new THREE.MeshStandardMaterial({
    color: 0x8d6f66, roughness: 0.96, bumpMap: bump, bumpScale: 0.6,
  });
  const shellDark = new THREE.MeshStandardMaterial({
    color: 0x745952, roughness: 0.97, bumpMap: bump, bumpScale: 0.6,
  });
  return {
    shell,
    shellDark,
    joint: new THREE.MeshStandardMaterial({ color: 0x4a3e3a, roughness: 0.7 }),
    mech: new THREE.MeshStandardMaterial({ color: 0x3b3634, roughness: 0.5, metalness: 0.35 }),
    screen: new THREE.MeshStandardMaterial({
      color: 0xdcdedb, roughness: 0.35, emissive: 0xb9beb9, emissiveIntensity: 0.35,
    }),
    eye: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.25 }),
    pad: new THREE.MeshStandardMaterial({
      color: 0xff7a2e, roughness: 0.55, emissive: 0xd4581a, emissiveIntensity: 0.22,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2e2a29, roughness: 0.8 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x55504d, roughness: 0.55 }),
    led: new THREE.MeshStandardMaterial({ color: 0x71e0a0, emissive: 0x4be08a, emissiveIntensity: 2.5 }),
    led2: new THREE.MeshStandardMaterial({ color: 0xffc370, emissive: 0xffab3d, emissiveIntensity: 2.0 }),
  };
}

function shadowed(m) {
  m.traverse ? m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } })
    : (m.castShadow = true);
  return m;
}
const rbox = (w, h, d, r, mat, seg = 3) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat);
const caps = (r, len, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
const sph = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
const cylUnit = (r, mat) => {
  const g = new THREE.CylinderGeometry(r, r, 1, 14);
  g.translate(0, 0.5, 0);
  return new THREE.Mesh(g, mat);
};

// ============================================================ Arm
class Arm {
  constructor(root, mats, side) {
    this.side = side; // +1 right, -1 left
    this.mats = mats;
    this.theta = side * 0.55;
    this.reach = 0.40;
    this.height = 0.30;
    this.gripOpen = true;
    this.gripT = 1;           // 1 = fully open, 0 = fully closed
    this.gripTarget = 1;
    this.closedAngle = 0.06;  // where "closed" lands (wider when holding)
    this.holding = null;
    this.grabChecked = false;
    this.palmWorld = new THREE.Vector3();
    this.palmVel = new THREE.Vector3();
    this.moving = false;

    const g = new THREE.Group();
    root.add(g);
    this.group = g;

    // shoulder pod (position follows torso each frame)
    this.pod = shadowed(caps(0.085, 0.07, mats.shellDark));
    this.pod.rotation.z = side * 0.25;
    g.add(this.pod);

    this.upper = shadowed(cylUnit(0.047, mats.shell));
    this.fore = shadowed(cylUnit(0.038, mats.shell));
    this.elbow = shadowed(sph(0.056, mats.shellDark));
    this.wrist = shadowed(sph(0.040, mats.joint));
    g.add(this.upper, this.fore, this.elbow, this.wrist);

    // gripper — vertical claw hanging from the wrist
    const grip = new THREE.Group();
    this.grip = grip;
    g.add(grip);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.06, 10), mats.mech);
    stem.position.y = 0.225;
    const palm = rbox(0.115, 0.05, 0.095, 0.02, mats.joint);
    palm.position.y = 0.175;
    const palmGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.05), mats.led2);
    palmGlow.position.y = 0.152;
    grip.add(shadowed(stem), shadowed(palm), palmGlow);

    this.fingers = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * FINGER_PIVOT_X, 0.175, 0);
      const seg1 = rbox(0.024, 0.105, 0.034, 0.008, mats.mech);
      seg1.position.y = -0.05;
      const tip = new THREE.Group();
      tip.position.y = -0.1;
      tip.rotation.z = -s * 0.45; // hook inward
      const seg2 = rbox(0.022, 0.075, 0.032, 0.008, mats.mech);
      seg2.position.y = -0.028;
      const pad = rbox(0.026, 0.034, 0.038, 0.008, mats.pad);
      pad.position.y = -0.062;
      tip.add(shadowed(seg2), shadowed(pad));
      pivot.add(shadowed(seg1), tip);
      grip.add(pivot);
      this.fingers.push({ pivot, s });
    }
  }

  // Fingertip target in robot-local space (robot only yaws, so local Y == world up).
  localTarget() {
    return new THREE.Vector3(
      Math.sin(this.theta) * this.reach,
      this.height,
      -Math.cos(this.theta) * this.reach - 0.04,
    );
  }

  shoulderLocal(shoulderY) {
    return new THREE.Vector3(this.side * 0.275, shoulderY + 0.05, -0.01);
  }

  pose(shoulderY, dt) {
    const S = this.shoulderLocal(shoulderY);
    // Commanded fingertip target; if the wrist would leave the arm's reach
    // envelope it gets pulled back toward the shoulder for this frame only —
    // the commanded reach/height stay intact, so the claw recovers as the
    // mast eases into range.
    const T = this.localTarget();
    const W = T.clone();
    W.y += PALM_UP;

    _v.copy(W).sub(S);
    let d = _v.length();
    d = clamp(d, 0.12, MAX_REACH);
    _v.normalize();
    W.copy(S).addScaledVector(_v, d);
    T.copy(W);
    T.y -= PALM_UP;

    // two-bone IK, elbow biased outward with a touch of lift
    const a = d / 2;
    const lift = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
    _v2.set(this.side * 0.95, 0.28, 0.16).normalize();
    _v3.copy(_v2).addScaledVector(_v, -_v2.dot(_v));
    if (_v3.lengthSq() < 1e-6) _v3.set(this.side, 0, 0);
    _v3.normalize();
    const E = S.clone().addScaledVector(_v, a).addScaledVector(_v3, lift);

    // meshes
    this.pod.position.copy(S);
    this.elbow.position.copy(E);
    this.wrist.position.copy(W);
    this.setLimb(this.upper, S, E);
    this.setLimb(this.fore, E, W);
    this.grip.position.copy(T);
    this.grip.rotation.y = -this.theta;

    // grip animation
    const speed = dt / 0.16;
    this.gripT = clamp(this.gripT + (this.gripTarget > 0.5 ? speed : -speed), 0, 1);
    const angle = this.closedAngle + (OPEN_ANGLE - this.closedAngle) * easeGrip(this.gripT);
    for (const f of this.fingers) f.pivot.rotation.z = f.s * angle;

    // palm world velocity (for throw/release)
    this.grip.getWorldPosition(_v);
    if (dt > 0) {
      _v2.copy(_v).sub(this.palmWorld).divideScalar(dt);
      this.palmVel.lerp(_v2, 0.35);
    }
    this.palmWorld.copy(_v);
  }

  setLimb(mesh, A, B) {
    mesh.position.copy(A);
    _v2.copy(B).sub(A);
    const len = _v2.length();
    mesh.scale.set(1, Math.max(len, 0.01), 1);
    _q.setFromUnitVectors(UP, _v2.divideScalar(Math.max(len, 1e-6)));
    mesh.quaternion.copy(_q);
  }
}

function easeGrip(t) {
  return t * t * (3 - 2 * t);
}

// ============================================================ Robot
export class Robot {
  constructor(scene, world, colliders, hooks = {}) {
    this.world = world;
    this.hooks = hooks;
    this.lowStatics = colliders.filter((c) => c.min.y < 1.35);

    this.root = new THREE.Group();
    scene.add(this.root);
    this.root.position.set(-2.4, 0, -1.5);
    this.yaw = 0.38;

    this.speed = 0;
    this.yawVel = 0;
    this.headYaw = 0;
    this.headPitch = -0.12;
    this.shoulderY = SHOULDER_MAX;
    this.bobPhase = 0;
    this.radius = 0.36;
    this.prevPos = new THREE.Vector3().copy(this.root.position);
    this.baseVel = new THREE.Vector3();

    const mats = makeMats();
    this.mats = mats;
    this.buildBody(mats);

    this.arms = {
      R: new Arm(this.root, mats, 1),
      L: new Arm(this.root, mats, -1),
    };
    this.arms.L.theta = -0.5;
  }

  buildBody(mats) {
    const r = this.root;

    // ---- wheeled base (nose extended so it peeks into frame on look-down) ----
    const base = shadowed(rbox(0.62, 0.16, 0.56, 0.06, mats.shellDark));
    base.position.set(0, 0.12, -0.02);
    const skirt = shadowed(rbox(0.56, 0.07, 0.50, 0.03, mats.dark));
    skirt.position.set(0, 0.055, -0.02);
    r.add(base, skirt);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.028, 0.02), mats.led2);
    bumper.position.set(0, 0.13, -0.292);
    r.add(bumper);
    for (const [cx, cz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.17], [0.21, 0.17]]) {
      const caster = shadowed(sph(0.038, mats.dark));
      caster.position.set(cx, 0.038, cz);
      r.add(caster);
    }
    for (const s of [-1, 1]) {
      const wheel = shadowed(new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.035, 16), mats.dark));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(s * 0.295, 0.07, 0.05);
      r.add(wheel);
    }

    // ---- telescoping mast (3 sleeves, resized every frame) ----
    this.mast = [
      cylUnit(0.075, mats.joint),
      cylUnit(0.06, mats.mech),
      cylUnit(0.047, mats.joint),
    ].map((m) => { r.add(shadowed(m)); return m; });

    // ---- torso (position follows mast) ----
    const torso = new THREE.Group();
    r.add(torso);
    this.torso = torso;
    const chest = shadowed(rbox(0.46, 0.48, 0.30, 0.10, mats.shell, 4));
    torso.add(chest);
    const belly = shadowed(rbox(0.34, 0.20, 0.26, 0.08, mats.shellDark));
    belly.position.set(0, -0.28, 0);
    torso.add(belly);
    // chest panel, tilted up so the head cam reads it when looking down
    const panelG = new THREE.Group();
    panelG.position.set(0, 0.06, -0.158);
    panelG.rotation.x = -0.55;
    torso.add(panelG);
    const panel = shadowed(rbox(0.14, 0.085, 0.024, 0.012, mats.panel));
    panelG.add(panel);
    const panelScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.042),
      new THREE.MeshStandardMaterial({ color: 0x14201c, emissive: 0x2e6b52, emissiveIntensity: 0.55, roughness: 0.4 }));
    panelScreen.position.set(0, -0.008, -0.0125);
    panelScreen.rotation.y = Math.PI;
    panelG.add(panelScreen);
    const ledGeo = new THREE.BoxGeometry(0.012, 0.006, 0.004);
    const led1 = new THREE.Mesh(ledGeo, this.mats.led);
    led1.position.set(-0.022, 0.030, -0.0135);
    const led2 = new THREE.Mesh(ledGeo, mats.led2);
    led2.position.set(0, 0.030, -0.0135);
    const led3 = new THREE.Mesh(ledGeo, this.mats.led);
    led3.position.set(0.022, 0.030, -0.0135);
    panelG.add(led1, led2, led3);

    // ---- neck + head (nudged forward so the mast/base peek out on look-down) ----
    const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.16, 12), mats.joint));
    neck.position.set(0, 0.30, -0.04);
    neck.rotation.x = 0.15;
    torso.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.455, -0.06);
    torso.add(head);
    this.head = head;

    const skull = shadowed(caps(0.098, 0.19, mats.shell));
    skull.rotation.x = Math.PI / 2 - 0.10; // slight nose-up tilt per reference
    skull.position.z = 0.01;
    head.add(skull);
    const earL = shadowed(sph(0.032, mats.shellDark));
    earL.position.set(-0.095, 0.02, 0.03);
    const earR = earL.clone();
    earR.position.x = 0.095;
    head.add(earL, earR);
    const antenna = shadowed(caps(0.012, 0.03, mats.shellDark));
    antenna.position.set(0.04, 0.115, 0.04);
    head.add(antenna);

    const face = rbox(0.155, 0.115, 0.024, 0.03, mats.screen);
    face.position.set(0, -0.005, -0.155);
    head.add(shadowed(face));
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 12, 10), mats.eye);
      eye.scale.set(0.72, 1.35, 0.35);
      eye.position.set(s * 0.034, 0.002, -0.169);
      head.add(eye);
      this.eyes.push(eye);
    }
    this.blinkTimer = 2.5;

    // camera mount just proud of the face so the shell never clips the view
    this.camMount = new THREE.Group();
    this.camMount.position.set(0, 0.005, -0.215);
    head.add(this.camMount);
  }

  attachCamera(camera) {
    this.camera = camera;
    this.camMount.add(camera);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
  }

  addLook(dx, dy) {
    this.headYaw = clamp(this.headYaw - dx * 0.0023, -2.35, 2.35);
    this.headPitch = clamp(this.headPitch - dy * 0.0021, -1.45, 0.85);
  }

  activeArm(shift) {
    return shift ? this.arms.L : this.arms.R;
  }

  update(dt, cmd) {
    // ---------- drive (skid steer) ----------
    const targetYawVel = cmd.turn * 1.95;
    this.yawVel += (targetYawVel - this.yawVel) * Math.min(1, dt * 9);
    this.yaw += this.yawVel * dt;

    const targetSpeed = cmd.fwd > 0 ? cmd.fwd * 1.75 : cmd.fwd * 1.05;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 6.5);

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const p = this.root.position;
    p.x += fx * this.speed * dt;
    p.z += fz * this.speed * dt;
    this.collideBase();
    this.root.rotation.y = this.yaw;

    if (dt > 0) {
      this.baseVel.set((p.x - this.prevPos.x) / dt, 0, (p.z - this.prevPos.z) / dt);
    }
    this.prevPos.copy(p);

    // shove floor props with the base
    if (this.baseVel.lengthSq() > 0.01 || Math.abs(this.yawVel) > 0.2) {
      this.world.pushSphere(_v.set(p.x, 0.1, p.z), 0.42, this.baseVel, { horizontal: true });
    }

    // ---------- arms ----------
    for (const key of ['R', 'L']) {
      const arm = this.arms[key];
      const c = cmd.arms[key];
      arm.moving = false;
      if (c) {
        if (c.dTheta) { arm.theta = clamp(arm.theta + c.dTheta * dt, ...ARM_LIMITS.theta); arm.moving = true; }
        if (c.dReach) { arm.reach = clamp(arm.reach + c.dReach * dt, ...ARM_LIMITS.reach); arm.moving = true; }
        if (c.dHeight) { arm.height = clamp(arm.height + c.dHeight * dt, ...ARM_LIMITS.height); arm.moving = true; }
        if (c.toggle) this.toggleGrip(key);
      }
    }

    // ---------- mast follows the lowest gripper ----------
    const lowest = Math.min(this.arms.R.height, this.arms.L.height);
    const desired = clamp(lowest + 0.50, SHOULDER_MIN, SHOULDER_MAX);
    this.shoulderY += (desired - this.shoulderY) * Math.min(1, dt * 5);

    for (const key of ['R', 'L']) {
      const arm = this.arms[key];
      arm.pose(this.shoulderY, dt);
      this.updateGrab(arm, dt);
    }

    // gripper nudges loose props (small sphere in the claw mouth region)
    for (const key of ['R', 'L']) {
      const arm = this.arms[key];
      if (arm.holding) continue;
      arm.grip.getWorldPosition(_v);
      _v.y += 0.07;
      const mouth = this.mouthInfo(arm);
      this.world.pushSphere(_v, 0.06, arm.palmVel, {
        exclude: (prop) => arm.gripT > 0.35 && this.inMouth(prop, mouth, 1.9),
      });
    }

    // ---------- torso / mast / head visuals ----------
    const sy = this.shoulderY;
    const torsoY = sy - 0.10;
    this.torso.position.y = torsoY;
    const bottom = torsoY - 0.22;
    this.setMast(this.mast[0], 0.17, Math.min(0.38, bottom));
    this.setMast(this.mast[1], 0.30, Math.max(0.34, 0.30 + (bottom - 0.30) * 0.62));
    this.setMast(this.mast[2], Math.max(0.32, 0.30 + (bottom - 0.30) * 0.55), bottom + 0.03);

    // head look + procedural sway
    this.head.rotation.y = this.headYaw;
    this.head.rotation.x = this.headPitch;
    const accel = (this.speed - (this.lastSpeed ?? 0)) / Math.max(dt, 1e-4);
    this.lastSpeed = this.speed;
    this.bobPhase += Math.abs(this.speed) * dt * 3.4;
    const sway = -this.yawVel * 0.022;
    const nod = clamp(accel * 0.006, -0.03, 0.03);
    this.camMount.rotation.z += (sway - this.camMount.rotation.z) * Math.min(1, dt * 5);
    this.camMount.rotation.x += (nod - this.camMount.rotation.x) * Math.min(1, dt * 4);
    this.camMount.position.y = 0.005 + Math.sin(this.bobPhase) * 0.0045 * clamp(Math.abs(this.speed), 0, 1);

    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer < 0) this.blinkTimer = 2 + Math.random() * 3.5;
    const blink = this.blinkTimer < 0.12 ? 0.15 : 1;
    for (const e of this.eyes) e.scale.y += (1.35 * blink - e.scale.y) * Math.min(1, dt * 20);

    if (this.hooks.onServo) {
      this.hooks.onServo(this.arms.R.moving || this.arms.L.moving);
    }
  }

  setMast(mesh, y0, y1) {
    mesh.position.y = y0;
    mesh.scale.y = Math.max(y1 - y0, 0.02);
  }

  collideBase() {
    const p = this.root.position;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.lowStatics) {
        const nx = clamp(p.x, c.min.x, c.max.x);
        const nz = clamp(p.z, c.min.z, c.max.z);
        const dx = p.x - nx;
        const dz = p.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= this.radius * this.radius) continue;
        const d = Math.sqrt(d2);
        if (d > 1e-5) {
          const push = (this.radius - d) / d;
          p.x += dx * push;
          p.z += dz * push;
        } else {
          // center inside the box: push out along smallest penetration
          const left = p.x - c.min.x; const right = c.max.x - p.x;
          const near = p.z - c.min.z; const far = c.max.z - p.z;
          const m = Math.min(left, right, near, far);
          if (m === left) p.x = c.min.x - this.radius;
          else if (m === right) p.x = c.max.x + this.radius;
          else if (m === near) p.z = c.min.z - this.radius;
          else p.z = c.max.z + this.radius;
        }
      }
    }
    p.x = clamp(p.x, -5.55, 5.55);
    p.z = clamp(p.z, -5.55, 5.55);
  }

  // -------------------------------------------------- gripping
  mouthInfo(arm) {
    arm.grip.getWorldPosition(_v3);
    const yaw = this.yaw - arm.theta;
    return {
      cx: _v3.x, cy: _v3.y + 0.065, cz: _v3.z,
      jx: Math.cos(yaw), jz: -Math.sin(yaw),   // jaw axis (local +X)
      dxz: Math.sin(yaw), dzz: Math.cos(yaw),  // depth axis (local +Z)
    };
  }

  inMouth(prop, m, loose = 1) {
    const px = prop.obj.position.x - m.cx;
    const py = prop.obj.position.y - m.cy;
    const pz = prop.obj.position.z - m.cz;
    const alongJaw = px * m.jx + pz * m.jz;
    const alongDepth = px * m.dxz + pz * m.dzz;
    return (
      Math.abs(py) <= (0.065 + prop.we.y * 0.35) * loose &&
      Math.abs(alongJaw) <= 0.05 * loose &&
      Math.abs(alongDepth) <= 0.06 * loose
    );
  }

  toggleGrip(key) {
    const arm = this.arms[key];
    if (arm.holding) {
      this.release(arm);
      return;
    }
    if (arm.gripTarget > 0.5) {
      arm.gripTarget = 0; // start closing; grab check fires mid-close
      arm.grabChecked = false;
      arm.closedAngle = 0.06;
      if (this.hooks.onGripClose) this.hooks.onGripClose();
    } else {
      arm.gripTarget = 1;
      if (this.hooks.onGripOpen) this.hooks.onGripOpen();
    }
  }

  updateGrab(arm, dt) {
    if (arm.holding || arm.gripTarget > 0.5 || arm.grabChecked) return;
    if (arm.gripT > 0.55) return; // pincers not at contact point yet
    arm.grabChecked = true;

    const m = this.mouthInfo(arm);
    const jawAxis = _v.set(m.jx, 0, m.jz);
    let best = null;
    let bestD = Infinity;
    for (const prop of this.world.props) {
      if (prop.held) continue;
      if (!this.inMouth(prop, m)) continue;
      const halfJaw = prop.extentAlong(jawAxis);
      if (halfJaw > JAW_HALF_LIMIT) continue;       // too wide for the claw
      if (prop.we.y > 0.13) continue;               // too tall to fit the mouth
      const d = (prop.obj.position.x - m.cx) ** 2 + (prop.obj.position.z - m.cz) ** 2;
      if (d < bestD) { bestD = d; best = prop; }
    }

    if (!best) {
      if (this.hooks.onGrabFail) this.hooks.onGrabFail();
      return; // pincers close on air
    }

    best.held = true;
    best.wake();
    best.vel.set(0, 0, 0);
    best.angVel.set(0, 0, 0);
    arm.holding = best;
    arm.grip.attach(best.obj);
    const halfJaw = best.extentAlong(jawAxis);
    arm.closedAngle = clamp(Math.asin(clamp((halfJaw + 0.033 - FINGER_PIVOT_X) / FINGER_LEN, -0.9, 0.9)), 0.05, OPEN_ANGLE * 0.9);
    if (this.hooks.onGrab) this.hooks.onGrab(best);
  }

  release(arm) {
    const prop = arm.holding;
    if (!prop) return;
    arm.holding = null;
    arm.gripTarget = 1;
    arm.closedAngle = 0.06;
    const scene = this.root.parent;
    scene.attach(prop.obj);
    prop.held = false;
    prop.wake();
    prop.noPushTimer = 0.45;
    prop.vel.copy(arm.palmVel).multiplyScalar(0.85);
    prop.vel.y = Math.min(prop.vel.y, 0.4);
    prop.angVel.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
    prop.updateBounds();
    if (this.hooks.onRelease) this.hooks.onRelease(prop);
  }

  headCamHeight() {
    return this.torso.position.y + 0.455;
  }
}
