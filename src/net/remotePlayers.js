// Remote player avatars: a humanoid per connected player, name tag, snapshot interpolation (~100 ms
// buffer), walking animation derived from movement speed, sneaking pose, held block in hand, world light.
import * as THREE from 'three';
import { buildHumanoid, PX } from '../npc/model.js';
import { paintSkin } from '../npc/skins.js';
import { measureText, drawText } from '../font.js';
import { BLOCKS } from '../blocks.js';
import { tileUV } from '../textures.js';

const INTERP_DELAY_MS = 100;   // render this far in the past so there is always a snapshot to interpolate toward
const MAX_EXTRAPOLATE_MS = 120;
const SNAPSHOT_TTL_MS = 1000;
const HIDE_DISTANCE = 120;
const TAG_DISTANCE = 32;
const STALE_MS = 2500;          // no snapshot for this long -> out of interest range, hide

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Small cube with the block's atlas tiles, used for the held item (DIRS face order: +x -x +y -y +z -z)
const HELD_GEO = new Map();
function heldGeometry(id) {
  if (HELD_GEO.has(id)) return HELD_GEO.get(id);
  const def = BLOCKS[id];
  const s = 0.3;
  const pos = [], uv = [], idx = [];
  const faces = [
    { v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: (x, y, z) => [1 - z, 1 - y] },
    { v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: (x, y, z) => [z, 1 - y] },
    { v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: (x, y, z) => [x, z] },
    { v: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], uv: (x, y, z) => [1 - x, z] },
    { v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: (x, y, z) => [x, 1 - y] },
    { v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: (x, y, z) => [1 - x, 1 - y] },
  ];
  const h = def.icon === 'slab' ? 0.5 : 1;
  for (let d = 0; d < 6; d++) {
    const f = faces[d];
    const [tu, tv, ts] = tileUV(def.tex[d]);
    const base = pos.length / 3;
    for (const v of f.v) {
      pos.push((v[0] - 0.5) * s, (v[1] * h - 0.5) * s, (v[2] - 0.5) * s);
      const [u, w] = f.uv(v[0], v[1], v[2]);
      uv.push(tu + u * ts, tv + w * ts);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  HELD_GEO.set(id, g);
  return g;
}

function makeTag(name) {
  const s = 2;
  const w = measureText(name, s) + 8, h = 8 * s + 6;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
  drawText(ctx, name, 4, 3, s, '#ffffff', true);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(w * 0.0125, h * 0.0125, 1);
  sp.position.set(0, 2.25, 0);
  sp.visible = false;
  return sp;
}

class RemotePlayer {
  constructor(mgr, id, name) {
    this.mgr = mgr;
    this.id = id;
    this.name = name || `Player${id}`;
    const skin = paintSkin({ role: 'cowboy', seed: id });
    this.model = buildHumanoid(skin.canvas, skin.hat, skin.hatColor);
    this.root = this.model.root;
    this.root.visible = false;
    this.tag = makeTag(this.name);
    this.root.add(this.tag);
    this.snapshots = [];          // [{t, x, y, z, yaw, pitch}] in local receive time (ms)
    this.pos = new THREE.Vector3();
    this.lastPos = null;
    this.yaw = 0; this.pitch = 0;
    this.speed = 0;
    this.walkTime = 0;
    this.sneak = false; this.sprint = false;
    this.held = 0;
    this.heldMesh = null;
    this.lightTimer = id % 6;
    this.lastSeen = 0;
    this.everSeen = false;
    this.armSwing = 0;
  }

  push(s, now) {
    const q = this.snapshots;
    const last = q[q.length - 1];
    // teleport: drop the history so we do not glide across the map
    if (last && (Math.abs(last.x - s.x) > 12 || Math.abs(last.z - s.z) > 12 || Math.abs(last.y - s.y) > 12)) q.length = 0;
    q.push({ t: now, x: s.x, y: s.y, z: s.z, yaw: s.yaw || 0, pitch: s.pitch || 0 });
    while (q.length > 2 && now - q[0].t > SNAPSHOT_TTL_MS) q.shift();
    if (q.length > 20) q.shift();
    this.sneak = !!s.sneak; this.sprint = !!s.sprint;
    this.setHeld(Number.isInteger(s.held) ? s.held : 0);
    this.lastSeen = now;
    this.everSeen = true;
  }

  setHeld(id) {
    if (id === this.held) return;
    this.held = id;
    if (this.heldMesh) { this.model.rightArm.remove(this.heldMesh); this.heldMesh.material.dispose(); this.heldMesh = null; }
    const def = BLOCKS[id];
    if (!id || !def || !this.mgr.game.entityMaterial) return;
    const mesh = new THREE.Mesh(heldGeometry(id), this.mgr.game.entityMaterial.clone());
    // right arm pivot is the shoulder; the hand is 10 px below it
    mesh.position.set(-1 * PX, -10 * PX, -4 * PX);
    mesh.rotation.set(0.15, 0.35, 0);
    this.model.rightArm.add(mesh);
    this.heldMesh = mesh;
  }

  // interpolated state at render time; returns false when there is nothing to show yet
  sample(now) {
    const q = this.snapshots;
    if (q.length === 0) return false;
    const t = now - INTERP_DELAY_MS;
    let i = 0;
    while (i < q.length && q[i].t < t) i++;
    let x, y, z, yaw, pitch;
    if (i === 0) {
      const b = q[0];
      x = b.x; y = b.y; z = b.z; yaw = b.yaw; pitch = b.pitch;
    } else if (i >= q.length) {
      // beyond the newest snapshot: hold, with a short extrapolation from the last two samples
      const n = q.length, b = q[n - 1];
      x = b.x; y = b.y; z = b.z; yaw = b.yaw; pitch = b.pitch;
      if (n >= 2) {
        const p = q[n - 2];
        const k = Math.min(MAX_EXTRAPOLATE_MS, t - b.t) / ((b.t - p.t) || 1);
        x += (b.x - p.x) * k; z += (b.z - p.z) * k; y += (b.y - p.y) * k;
      }
    } else {
      const a = q[i - 1], b = q[i];
      const f = (t - a.t) / ((b.t - a.t) || 1);
      x = a.x + (b.x - a.x) * f; y = a.y + (b.y - a.y) * f; z = a.z + (b.z - a.z) * f;
      yaw = lerpAngle(a.yaw, b.yaw, f); pitch = a.pitch + (b.pitch - a.pitch) * f;
    }
    this.pos.set(x, y, z);
    this.yaw = yaw; this.pitch = pitch;
    return true;
  }

  dispose() {
    this.setHeld(0);
    this.root.traverse((o) => { if (o.geometry && o !== this.tag) o.geometry.dispose(); });
    this.model.material.dispose();
    for (const child of this.model.head.children) if (child.material) child.material.dispose();
    this.tag.material.map.dispose();
    this.tag.material.dispose();
  }
}

export class RemotePlayers {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'remote-players';
    game.scene.add(this.group);
    this.players = new Map();
    this.visibleCount = 0;
  }

  get count() { return this.players.size; }

  // remote players with a recent snapshot (i.e. inside the server's interest range)
  activeCount(now = performance.now()) {
    let n = 0;
    for (const p of this.players.values()) if (p.everSeen && now - p.lastSeen < STALE_MS) n++;
    return n;
  }

  ensure(id, name) {
    let p = this.players.get(id);
    if (!p) { p = new RemotePlayer(this, id, name); this.players.set(id, p); this.group.add(p.root); }
    else if (name && p.name !== name) { p.name = name; p.root.remove(p.tag); p.tag.material.map.dispose(); p.tag.material.dispose(); p.tag = makeTag(name); p.root.add(p.tag); }
    return p;
  }

  onJoin(id, name) { this.ensure(id, name); }
  onLeave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.group.remove(p.root);
    p.dispose();
    this.players.delete(id);
  }

  // welcome.players / players.list: a full list of the players in interest range
  onList(list) {
    const now = performance.now();
    for (const s of list) {
      if (!Number.isInteger(s.id)) continue;
      this.ensure(s.id, s.name).push(s, now);
    }
  }

  clear() {
    for (const id of [...this.players.keys()]) this.onLeave(id);
  }

  update(dt) {
    const now = performance.now();
    const cam = this.game.camera.position;
    let visible = 0;
    for (const p of this.players.values()) {
      const r = p.root;
      if (!p.everSeen || now - p.lastSeen > STALE_MS || !p.sample(now)) { r.visible = false; p.lastPos = null; continue; }
      const dx = p.pos.x - cam.x, dz = p.pos.z - cam.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > HIDE_DISTANCE * HIDE_DISTANCE) { r.visible = false; p.lastPos = null; continue; }
      r.visible = true;
      visible++;
      // speed from rendered motion (smoothed) drives the walk cycle
      if (p.lastPos && dt > 0) {
        const v = Math.hypot(p.pos.x - p.lastPos.x, p.pos.z - p.lastPos.z) / dt;
        p.speed += (Math.min(v, 12) - p.speed) * Math.min(1, dt * 10);
      } else p.lastPos = new THREE.Vector3();
      p.lastPos.copy(p.pos);
      if (p.speed < 0.15) p.speed = 0;
      p.walkTime += p.speed * dt * 2.2;

      r.position.set(p.pos.x, p.pos.y - (p.sneak ? 0.22 : 0), p.pos.z);
      r.rotation.y = p.yaw + Math.PI; // model faces +z at rotation 0, the player looks along (-sin yaw, -cos yaw)
      const m = p.model;
      const amp = Math.min(1, p.speed / 4.3) * 0.75;
      const s = Math.sin(p.walkTime) * amp;
      m.rightLeg.rotation.x = s; m.leftLeg.rotation.x = -s;
      m.rightArm.rotation.x = -s * 0.9 - (p.held ? 0.35 : 0) - p.armSwing; m.leftArm.rotation.x = s * 0.9;
      m.rightArm.rotation.z = 0.05; m.leftArm.rotation.z = -0.05;
      if (p.sneak) {
        m.body.rotation.x = 0.45; m.body.position.z = -0.08; m.head.position.y = 22 * PX; m.head.position.z = -0.12;
        m.rightArm.position.y = m.leftArm.position.y = 20.5 * PX; m.rightArm.position.z = m.leftArm.position.z = -0.1;
      } else {
        m.body.rotation.x = 0; m.body.position.z = 0; m.head.position.y = 24 * PX; m.head.position.z = 0;
        m.rightArm.position.y = m.leftArm.position.y = 22 * PX; m.rightArm.position.z = m.leftArm.position.z = 0;
      }
      m.head.rotation.x = -p.pitch;
      if (p.armSwing > 0) p.armSwing = Math.max(0, p.armSwing - dt * 6);
      // world light (sampled at chest height, refreshed every few frames)
      if (++p.lightTimer >= 6) {
        p.lightTimer = 0;
        const l = this.game.world.sampleLight(p.pos.x, p.pos.y + 1, p.pos.z);
        m.material.uniforms.uLight.value.set(l[0], l[1]);
        for (const child of m.head.children) if (child.material && child.material.uniforms) child.material.uniforms.uLight.value.set(l[0], l[1]);
        if (p.heldMesh) p.heldMesh.material.uniforms.uLight.value.set(l[0], l[1]);
      }
      p.tag.visible = d2 < TAG_DISTANCE * TAG_DISTANCE;
      p.tag.position.y = p.sneak ? 2.0 : 2.25;
    }
    this.visibleCount = visible;
  }

  // a remote player placed/broke a block near their hand: swing the arm
  swing(id) { const p = this.players.get(id); if (p) p.armSwing = 1.2; }

  dispose() {
    this.clear();
    this.game.scene.remove(this.group);
  }
}
