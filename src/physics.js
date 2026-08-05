// physics.js — deliberately simplified, fictional flight physics shared by threats and interceptors.
// This is a gameplay abstraction, not an operational model.
import * as THREE from 'three';
import { clamp } from './utils.js';

export const GRAVITY = 9.81;
export const SCALE_HEIGHT = 7200;        // fictional atmosphere scale height, metres
export const SPEED_OF_SOUND = 340;       // used only for audio delay flavor

export function airDensity(alt) {
  return Math.exp(-Math.max(alt, 0) / SCALE_HEIGHT); // 1.0 at sea level -> 0 at altitude
}

const _tmp = new THREE.Vector3();

// Semi-implicit Euler with quadratic drag. body: {pos, vel, dragK}
export function integrateBallistic(body, dt) {
  const rho = airDensity(body.pos.y);
  const v = body.vel.length();
  if (v > 0.001 && body.dragK > 0) {
    const dragAcc = body.dragK * rho * v * v;
    _tmp.copy(body.vel).multiplyScalar(-dragAcc * dt / v);
    body.vel.add(_tmp);
  }
  body.vel.y -= GRAVITY * dt;
  body.pos.addScaledVector(body.vel, dt);
}

// Predict a ballistic future position (coarse steps). Returns target vector (reused).
export function predictBallistic(pos, vel, dragK, t, out, steps = 8) {
  out.copy(pos);
  const v = _pv.copy(vel);
  const dt = t / steps;
  for (let i = 0; i < steps; i++) {
    const rho = airDensity(out.y);
    const sp = v.length();
    if (sp > 0.001 && dragK > 0) {
      const dragAcc = dragK * rho * sp * sp;
      v.addScaledVector(_pd.copy(v).multiplyScalar(1 / sp), -dragAcc * dt);
    }
    v.y -= GRAVITY * dt;
    out.addScaledVector(v, dt);
  }
  return out;
}
const _pv = new THREE.Vector3();
const _pd = new THREE.Vector3();

// Time until a ballistic body reaches given altitude (coarse search), capped.
export function timeToAltitude(pos, vel, dragK, altitude, maxT = 120) {
  const p = _ta.copy(pos), v = _tb.copy(vel);
  const dt = 0.25;
  for (let t = 0; t < maxT; t += dt) {
    const rho = airDensity(p.y);
    const sp = v.length();
    if (sp > 0.001 && dragK > 0) v.addScaledVector(_tc.copy(v).normalize(), -dragK * rho * sp * sp * dt);
    v.y -= GRAVITY * dt;
    p.addScaledVector(v, dt);
    if (p.y <= altitude) return t;
  }
  return maxT;
}
const _ta = new THREE.Vector3(); const _tb = new THREE.Vector3(); const _tc = new THREE.Vector3();

// Predicted ground impact point for radar display.
export function predictImpact(pos, vel, dragK, out) {
  const p = _ta.copy(pos), v = _tb.copy(vel);
  const dt = 0.3;
  for (let t = 0; t < 160; t += dt) {
    const rho = airDensity(p.y);
    const sp = v.length();
    if (sp > 0.001 && dragK > 0) v.addScaledVector(_tc.copy(v).normalize(), -dragK * rho * sp * sp * dt);
    v.y -= GRAVITY * dt;
    p.addScaledVector(v, dt);
    if (p.y <= 0) { out.copy(p); out.y = 0; return t; }
  }
  out.copy(p); out.y = 0; return 160;
}

// Fictional predicted-intercept-point solver: iterate time-of-flight vs threat future position.
// interceptor speed model: effective average speed ramps toward vMax.
export function solveInterceptPoint(threatPos, threatVel, threatDragK, fromPos, effSpeed, out) {
  let t = fromPos.distanceTo(threatPos) / effSpeed;
  for (let i = 0; i < 6; i++) {
    predictBallistic(threatPos, threatVel, threatDragK, t, out, 6);
    const d = fromPos.distanceTo(out);
    const tNew = d / effSpeed;
    t = t * 0.4 + tNew * 0.6;
    t = clamp(t, 0.1, 90);
  }
  predictBallistic(threatPos, threatVel, threatDragK, t, out, 8);
  return t;
}

// Closest approach between two points moving linearly over dt. Returns min distance.
export function closestApproach(p1, v1, p2, v2, dt) {
  _ca1.subVectors(p2, p1);                 // relative position
  _ca2.subVectors(v2, v1);                 // relative velocity
  const a = _ca2.lengthSq();
  let t = 0;
  if (a > 1e-6) t = clamp(-_ca1.dot(_ca2) / a, 0, dt);
  _ca3.copy(_ca1).addScaledVector(_ca2, t);
  return { dist: _ca3.length(), t };
}
const _ca1 = new THREE.Vector3(); const _ca2 = new THREE.Vector3(); const _ca3 = new THREE.Vector3();

// ---------------------------------------------------------------- player capsule vs world
// Colliders: {type:'box', min:Vector3, max:Vector3} or {type:'cylinder', x, z, r, y0, y1}
export function makeBoxCollider(center, size, rotY = 0) {
  // store as OBB-lite: axis aligned if rotY ~ 0, else expand to AABB of rotated box
  if (Math.abs(rotY % (Math.PI * 2)) < 0.01) {
    return {
      type: 'box',
      min: new THREE.Vector3(center.x - size.x / 2, center.y - size.y / 2, center.z - size.z / 2),
      max: new THREE.Vector3(center.x + size.x / 2, center.y + size.y / 2, center.z + size.z / 2),
    };
  }
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
  const ex = (size.x * c + size.z * s) / 2, ez = (size.x * s + size.z * c) / 2;
  return {
    type: 'box',
    min: new THREE.Vector3(center.x - ex, center.y - size.y / 2, center.z - ez),
    max: new THREE.Vector3(center.x + ex, center.y + size.y / 2, center.z + ez),
  };
}

// Resolve player circle (XZ) against colliders; player height range [y, y+1.8]
export function resolveCapsule(pos, radius, colliders) {
  for (let iter = 0; iter < 3; iter++) {
    let pushed = false;
    for (const c of colliders) {
      if (c.type === 'box') {
        if (c.max.y < 0.25 || c.min.y > 1.85) continue; // steppable / overhead
        const cx = clamp(pos.x, c.min.x, c.max.x);
        const cz = clamp(pos.z, c.min.z, c.max.z);
        const dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            pos.x += (dx / d) * (radius - d);
            pos.z += (dz / d) * (radius - d);
          } else {
            // inside the box: push out along smallest penetration axis
            const px1 = pos.x - c.min.x + radius, px2 = c.max.x - pos.x + radius;
            const pz1 = pos.z - c.min.z + radius, pz2 = c.max.z - pos.z + radius;
            const m = Math.min(px1, px2, pz1, pz2);
            if (m === px1) pos.x = c.min.x - radius;
            else if (m === px2) pos.x = c.max.x + radius;
            else if (m === pz1) pos.z = c.min.z - radius;
            else pos.z = c.max.z + radius;
          }
          pushed = true;
        }
      } else if (c.type === 'cylinder') {
        if (c.y1 < 0.25 || c.y0 > 1.85) continue;
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const rr = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (rr - d);
          pos.z += (dz / d) * (rr - d);
          pushed = true;
        }
      }
    }
    if (!pushed) break;
  }
  return pos;
}
