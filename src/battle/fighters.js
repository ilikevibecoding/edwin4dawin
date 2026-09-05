// Starfighter swarms: five original low-poly types (Republic: heavy fighter with split wings, small
// wing-fighter, Jedi interceptor; Separatist: droid fighter with bent wings, tri-arm droid), each an
// InstancedMesh. Fighters chase a moving orbit point around an enemy capital ship (Lissajous weave), face
// their velocity, bank from the turn rate and fire short lasers at their current quarry.
import * as THREE from "three";
import { battlePatch } from "./battleShader.js";
import { mergeParts, tintGeometry } from "./fleet.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mLook = new THREE.Matrix4();
const _s = new THREE.Vector3(1, 1, 1);

function bx(cx, cy, cz, sx, sy, sz, color) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return tintGeometry(g.toNonIndexed(), color);
}
function cyl(cx, cy, cz, r, len, axis, color, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === "z") g.rotateX(Math.PI / 2);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  g.translate(cx, cy, cz);
  return tintGeometry(g.toNonIndexed(), color);
}
function sph(cx, cy, cz, r, color, seg = 10) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2));
  g.translate(cx, cy, cz);
  return tintGeometry(g.toNonIndexed(), color);
}
function wedge(w, h, l, color) {
  // triangular prism nose
  const g = new THREE.ConeGeometry(w / 2, l, 4);
  g.rotateX(-Math.PI / 2);
  g.scale(1, h / w, 1);
  return tintGeometry(g.toNonIndexed(), color);
}

// Republic heavy fighter (ARC-style): long fuselage, four wing panels in an X when deployed, twin engines
function heavyFighter() {
  const grey = 0xb8b4ab;
  const red = 0x8c2a24;
  const dark = 0x2c2e33;
  const parts = [
    bx(0, 0, 0, 2.6, 2.2, 12, grey),
    wedge(2.6, 2.2, 3.5, grey).translate(0, 0, -7.6),
    bx(0, 0.6, 3.5, 1.8, 1.2, 4, dark),
  ];
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const g = new THREE.BoxGeometry(6.5, 0.3, 4.5);
      g.rotateZ(t * 0.42);
      g.translate(s * 4.4, t * 1.6, 1.2);
      tintGeometry(g, grey);
      parts.push(g.toNonIndexed());
      parts.push(bx(s * 7.2, t * 2.9, 1.2, 1.2, 0.35, 4.6, red));
    }
    parts.push(cyl(s * 2.2, 0, 5.2, 0.7, 3.2, "z", dark));
  }
  return mergeParts(parts);
}
// Republic wing fighter (V-style): tiny pod with two tall angled fins
function wingFighter() {
  const grey = 0xa9a8a2;
  const red = 0x8c2a24;
  const parts = [
    bx(0, 0, 0, 1.6, 1.6, 5.5, grey),
    sph(0, 0.8, -0.5, 0.7, 0x1a2230),
    cyl(0, -0.2, 3.2, 0.6, 1.6, "z", 0x2c2e33),
  ];
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.25, 4.6, 2.4);
    g.rotateZ(s * 0.5);
    g.translate(s * 1.9, 1.2, 0.6);
    parts.push(tintGeometry(g.toNonIndexed(), grey));
    parts.push(bx(s * 2.6, 3.2, 0.6, 0.3, 0.8, 2.5, red));
  }
  return mergeParts(parts);
}
// Jedi interceptor (Eta-style): small cockpit between two flat wing panels, astromech dome
function interceptor(color) {
  const dark = 0x2c2e33;
  const parts = [
    bx(0, 0, 0.4, 1.4, 1.2, 4.6, color),
    sph(0, 0.7, -0.4, 0.55, 0x1a2230),
    sph(1.0, 0.5, 0.6, 0.35, 0xdddddd, 8),
  ];
  for (const s of [-1, 1]) {
    parts.push(bx(s * 2.4, 0, 0.6, 3.6, 0.18, 3.2, color));
    parts.push(bx(s * 4.2, 0.6, 0.6, 0.2, 1.4, 3.0, dark));
  }
  return mergeParts(parts);
}
// Separatist droid fighter (vulture-style): compact body, two long bent wings
function droidFighter() {
  const bronze = 0x6a5e52;
  const dark = 0x2a2723;
  const parts = [
    bx(0, 0, 0, 1.4, 1.6, 3.6, bronze),
    sph(0, 0.2, -1.9, 0.6, 0xff4030, 8),
  ];
  for (const s of [-1, 1]) {
    const g1 = new THREE.BoxGeometry(3.2, 0.3, 1.8);
    g1.rotateZ(s * -0.55);
    g1.translate(s * 1.9, 0.9, 0.3);
    parts.push(tintGeometry(g1.toNonIndexed(), bronze));
    const g2 = new THREE.BoxGeometry(3.4, 0.3, 1.6);
    g2.rotateZ(s * 0.35);
    g2.translate(s * 4.6, 1.6, 0.3);
    parts.push(tintGeometry(g2.toNonIndexed(), dark));
  }
  return mergeParts(parts);
}
// Separatist tri-arm droid: sphere core with three curved arms holding a ring
function triFighter() {
  const dark = 0x3a3c40;
  const parts = [
    sph(0, 0, 0, 1.1, 0x555960, 12),
    sph(0, 0, -1.0, 0.45, 0xff4030, 8),
  ];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const g = new THREE.BoxGeometry(0.5, 0.5, 4.2);
    g.translate(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.2);
    parts.push(tintGeometry(g.toNonIndexed(), dark));
    parts.push(
      bx(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 2.2, 0.8, 0.8, 0.8, 0x1f2124),
    );
  }
  const ring = new THREE.TorusGeometry(2.2, 0.18, 6, 18);
  ring.translate(0, 0, -1.4);
  parts.push(tintGeometry(ring.toNonIndexed(), dark));
  return mergeParts(parts);
}

export const FIGHTER_TYPES = {
  heavy: {
    side: "republic",
    build: heavyFighter,
    speed: 240,
    count: 90,
    turn: 1.4,
  },
  wing: {
    side: "republic",
    build: wingFighter,
    speed: 300,
    count: 45,
    turn: 1.9,
  },
  interceptorY: {
    side: "republic",
    build: () => interceptor(0xd9b23a),
    speed: 340,
    count: 10,
    turn: 2.4,
  },
  interceptorR: {
    side: "republic",
    build: () => interceptor(0xa8332a),
    speed: 340,
    count: 10,
    turn: 2.4,
  },
  droid: {
    side: "separatist",
    build: droidFighter,
    speed: 280,
    count: 140,
    turn: 2.0,
  },
  tri: {
    side: "separatist",
    build: triFighter,
    speed: 320,
    count: 70,
    turn: 2.2,
  },
};

export class Fighters {
  constructor(scene, sun, opts = {}) {
    this.group = new THREE.Group();
    this.group.name = "fighters";
    scene.add(this.group);
    this.mat = battlePatch(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        metalness: 0.35,
        envMapIntensity: 0.1,
      }),
      sun,
    );
    this.types = {};
    this.all = [];
    const scale = opts.scale ?? 1;
    for (const [id, t] of Object.entries(FIGHTER_TYPES)) {
      const count = Math.max(1, Math.round(t.count * scale));
      const im = new THREE.InstancedMesh(t.build(), this.mat, count);
      im.name = "fighters_" + id;
      im.frustumCulled = false;
      im.count = count;
      this.group.add(im);
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({
          type: id,
          side: t.side,
          speed: t.speed * (0.85 + Math.random() * 0.3),
          turn: t.turn,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(0, 0, -1),
          quat: new THREE.Quaternion(),
          roll: 0,
          anchor: null, // capital ship being orbited (enemy)
          phase: Math.random() * Math.PI * 2,
          f1: 0.25 + Math.random() * 0.5,
          f2: 0.18 + Math.random() * 0.4,
          f3: 0.3 + Math.random() * 0.5,
          radius: 350 + Math.random() * 700,
          fireTimer: Math.random() * 2,
          quarry: null,
          alive: true,
        });
      }
      this.types[id] = { im, list, def: t };
      this.all.push(...list);
    }
    this.target = new THREE.Vector3();
  }

  // Give every fighter an enemy capital ship to weave around and an initial position near it.
  deploy(ships) {
    for (const f of this.all) {
      const enemies = ships.filter((s) => s.side !== f.side && s.alive);
      const friends = ships.filter((s) => s.side === f.side && s.alive);
      f.anchor = enemies.length
        ? enemies[Math.floor(Math.random() * enemies.length)]
        : null;
      f.home = friends.length
        ? friends[Math.floor(Math.random() * friends.length)]
        : null;
      const base = f.home ? f.home.position : new THREE.Vector3();
      f.pos
        .copy(base)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1600,
            (Math.random() - 0.5) * 600,
            (Math.random() - 0.5) * 1600,
          ),
        );
    }
  }

  _goal(f, t, out) {
    const a =
      f.anchor && f.anchor.alive
        ? f.anchor.position
        : f.home
          ? f.home.position
          : _v2.set(0, 0, 0);
    const p = f.phase;
    out.set(
      Math.sin(t * f.f1 + p) * f.radius,
      Math.sin(t * f.f2 + p * 1.7) * f.radius * 0.45,
      Math.cos(t * f.f3 + p) * f.radius,
    );
    return out.add(a);
  }

  update(dt, t, fire) {
    for (const [id, T] of Object.entries(this.types)) {
      const im = T.im;
      let n = 0;
      for (const f of T.list) {
        if (!f.alive) continue;
        // steer toward the moving goal point with a turn-rate limit
        this._goal(f, t, this.target);
        _v.copy(this.target).sub(f.pos);
        const dist = _v.length();
        if (dist > 1) _v.divideScalar(dist);
        const k = Math.min(1, f.turn * dt);
        const prev = _v2.copy(f.vel);
        f.vel.lerp(_v, k).normalize();
        f.pos.addScaledVector(f.vel, f.speed * dt);
        // orientation: face velocity, bank with the lateral turn
        _mLook.lookAt(f.vel, _v2.set(0, 0, 0), _up);
        _q.setFromRotationMatrix(_mLook);
        const lateral = prev.cross(f.vel).y; // sign of the yaw change
        f.roll +=
          (THREE.MathUtils.clamp(-lateral * 40, -1.1, 1.1) - f.roll) *
          Math.min(1, dt * 3);
        _q.multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            f.roll,
          ),
        );
        f.quat.copy(_q);
        _m.compose(f.pos, f.quat, _s);
        im.setMatrixAt(n++, _m);
        // fire short lasers at the anchor ship's hull now and then
        f.fireTimer -= dt;
        if (f.fireTimer <= 0 && fire && f.anchor && f.anchor.alive) {
          f.fireTimer = 1.5 + Math.random() * 3;
          if (f.anchor.position.distanceTo(f.pos) < 2500) fire(f);
        }
      }
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
    }
  }

  get count() {
    return this.all.length;
  }
}
