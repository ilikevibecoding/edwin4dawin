import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Tracer strip texture. U runs along the round (u=1 head, tail tapers to
 * nothing); V is the cross-section: a white-hot core line filling the
 * central third of the strip melting into an orange glow sheath that rolls
 * off to zero at the edges — core + sheath baked into one quad so the
 * whole round is a single crossed-plane mesh.
 */
function tracerCanvas(w = 128, h = 32) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  for (let y = 0; y < h; y++) {
    const vy = Math.abs((y + 0.5) / h - 0.5) * 2; // 0 centre -> 1 edge
    const core = Math.pow(cl(1 - vy / 0.34), 1.2);
    const sheath = Math.pow(cl(1 - vy), 2.2) * 0.5;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const along = u > 0.86 ? 1 : 0.06 + 0.94 * Math.pow(u / 0.86, 1.7);
      const a = cl(core + sheath) * along;
      const i = (y * w + x) * 4;
      d[i] = 255;
      d[i + 1] = 140 + 115 * cl(core * 1.35);
      d[i + 2] = 40 + 215 * cl(core * 1.15 - 0.12);
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Two crossed 0.05m planes spanning z in [-1, 0]; head at z=0 (u=1).
 *  The baked V-profile puts a ~0.017m white-hot core inside the 0.05m
 *  additive glow sheath. Width matters most when the round flies nearly
 *  end-on from the shooter's eye (ADS): a fat ribbon foreshortens into a
 *  round blob, a slim one still reads as a velocity streak. */
function tracerGeometry() {
  const p1 = new THREE.PlaneGeometry(1, 0.05);
  p1.rotateY(-Math.PI / 2);   // length along +Z, u=0 at the -Z end
  p1.translate(0, 0, -0.5);   // span [-1, 0]; scale.z stretches the tail back
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);
  return mergeGeometries([p1, p2]);
}

/** Tracer rounds: 1.8-2.6m velocity-stretched segments — white-hot core in
 *  an orange sheath, HDR-bright so bloom carries them at 1080p, with slight
 *  per-round jitter. AI rounds (color != null) are thinned to every
 *  2nd-3rd shot; player rounds always draw. */
export class TracerSystem {
  constructor(scene, capacity = 48) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this._aiN = 0;
    // World camera for the near-camera alpha guard — the engine parents it
    // straight to the scene, so it's found lazily on the first update.
    this.camera = null;
    const geo = tracerGeometry();
    const map = new THREE.CanvasTexture(tracerCanvas());
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false, // HDR color >1 feeds bloom directly
      });
      mat.color.setRGB(4.4, 3.6, 2.4);
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 13;
      scene.add(m);
      // Preallocated flight record — fire() copies into it, zero allocs.
      this.pool.push({ m, pos: new THREE.Vector3(), dir: new THREE.Vector3(), dist: 0, traveled: 0, speed: 900, len: 1.5, fresh: 0 });
    }
  }

  fire(from, to, speed = 900, color = null) {
    // AI rounds pass a tint; draw only every 2nd-3rd of those so enemy fire
    // reads as intermittent tracer, not a laser hose.
    if (color != null) {
      this._aiN = (this._aiN + 1) % 5;
      if (this._aiN !== 0 && this._aiN !== 2) return;
    }
    const t = this.pool.pop();
    if (!t) return;
    const m = t.m;
    // Slight per-round jitter so bursts don't stack into one beam (kept
    // small — at ADS the spawn sits inside the sight picture, and big
    // jitter made the streak wander off the bore line).
    t.pos.copy(from);
    t.pos.x += (Math.random() - 0.5) * 0.03;
    t.pos.y += (Math.random() - 0.5) * 0.03;
    t.pos.z += (Math.random() - 0.5) * 0.03;
    t.dir.copy(to).sub(t.pos);
    t.dist = t.dir.length();
    if (t.dist < 1e-4) { this.pool.push(t); return; }
    t.dir.multiplyScalar(1 / t.dist);
    t.speed = speed;
    t.len = Math.min(1.8 + Math.random() * 0.8, t.dist * 0.6); // 1.8-2.6m
    // Born with the full segment already grown, head at muzzle + len, and
    // `fresh` holds off the flight advance. At 900 m/s a 60Hz step is 15m —
    // without this the round is never RENDERED inside the first 10m, so
    // fired stills showed no tracer at all. Player rounds hold the born
    // muzzle streak for TWO frames (MW-style muzzle streak read: photo
    // captures land one frame after the trigger, and a 1-frame streak was
    // already 15m downrange — a foreshortened speck — by capture); distant
    // AI rounds advance after one.
    t.traveled = t.len;
    t.fresh = color == null ? 2 : 1;
    m.visible = true;
    // Well above 1.0 so bloom picks the core up at any range
    if (color != null) m.material.color.set(color).multiplyScalar(3.4);
    else m.material.color.setRGB(4.4, 3.6, 2.4);
    m.material.color.multiplyScalar(0.85 + Math.random() * 0.3);
    m.material.opacity = 1;
    m.scale.set(1, 1, Math.max(0.05, t.len));
    m.position.copy(t.pos).addScaledVector(t.dir, t.traveled);
    m.lookAt(to);
    this.items.push(t);
  }

  /** Optional explicit hookup; otherwise the scene's camera is found lazily. */
  setCamera(cam) { this.camera = cam; }

  update(dt) {
    if (!this.camera) {
      const ch = this.scene.children;
      for (let i = 0; i < ch.length; i++) {
        if (ch[i].isPerspectiveCamera) { this.camera = ch[i]; break; }
      }
    }
    const cam = this.camera;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const t = this.items[i];
      // Born frames keep their spawn state (full segment at the muzzle)
      // so the streak actually renders before the 15m/frame flight steps.
      if (t.fresh > 0) t.fresh--;
      else t.traveled += t.speed * dt;
      if (t.traveled >= t.dist) {
        t.m.visible = false;
        this.pool.push(t);
        this.items.splice(i, 1);
        continue;
      }
      // Head rides the bullet; tail stretches up to len behind it.
      t.m.position.copy(t.pos).addScaledVector(t.dir, t.traveled);
      t.m.scale.z = Math.max(0.05, Math.min(t.len, t.traveled));
      // Fade out over the last 25% of travel
      const k = t.traveled / t.dist;
      let a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      // Near-camera guard keyed off the CURRENT head position each frame
      // (never the spawn point): only a round whose head is basically at
      // the lens fades, and alpha recovers as it flies downrange. Window
      // ends by 0.6m — the player muzzle sits ~0.5m out with the head a
      // further 1.2-1.8m along, so hip-fire tracers draw at full alpha.
      // (The old segment-distance test zeroed anything within 0.55m; the
      // tail was pinned at the muzzle at spawn, so player tracers were
      // born at alpha 0 and were 15m+ gone one frame later.)
      if (cam) {
        const dx = t.m.position.x - cam.position.x;
        const dy = t.m.position.y - cam.position.y;
        const dz = t.m.position.z - cam.position.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 0.36) { // 0.6m^2
          const f = (Math.sqrt(d2) - 0.22) / 0.38;
          a *= f < 0 ? 0 : f;
        }
      }
      t.m.material.opacity = a;
    }
  }
}

/* ------------------------------ brass ---------------------------------- */

/** Merged tapered rifle case with a real extractor-groove read: main body,
 *  neck cone, recessed groove band and protruding rim above the case head. */
function casingGeometry() {
  const body = new THREE.CylinderGeometry(0.0036, 0.0039, 0.0246, 12);
  body.translate(0, 0.0027, 0);                       // y in [-0.0096, 0.0150]
  const neck = new THREE.CylinderGeometry(0.0023, 0.0036, 0.0065, 12);
  neck.translate(0, 0.015 + 0.0032, 0);
  const groove = new THREE.CylinderGeometry(0.0029, 0.0029, 0.0026, 12);
  groove.translate(0, -0.0109, 0);                    // recessed extractor groove
  const base = new THREE.CylinderGeometry(0.0039, 0.0039, 0.0028, 12);
  base.translate(0, -0.0136, 0);
  const rim = new THREE.CylinderGeometry(0.0042, 0.0042, 0.0012, 12);
  rim.translate(0, -0.0156, 0);
  const geo = mergeGeometries([body, neck, groove, base, rim]);
  // The case spawns ~0.35m from the world camera, where true scale reads
  // ~3x oversized on screen — cheat the whole geometry down to 0.75x.
  geo.scale(0.75, 0.75, 0.75);
  // Remap V to run 0..1 along the FULL case length (each merged cylinder
  // otherwise keeps its own private 0..1 strip) so the brass gradient map
  // lands where it should: soot at the mouth, shadow ring in the groove.
  const p = geo.attributes.position, uv = geo.attributes.uv;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const inv = 1 / (maxY - minY);
  for (let i = 0; i < uv.count; i++) uv.setY(i, (p.getY(i) - minY) * inv);
  return geo;
}

/** Length gradient baked along the case (v=0 case head -> v=1 mouth):
 *  polished body, a cool desaturated soot smudge rolling in at the case
 *  mouth, a faint annealing shade at the shoulder and a shadow ring in the
 *  recessed extractor groove. Multiplies the deep-gold base color, so it
 *  only ever darkens — the metal read comes from roughness/env. */
function brassMapCanvas(w = 16, h = 64) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  for (let y = 0; y < h; y++) {
    const v = 1 - y / (h - 1); // flipY: canvas top row = case mouth (v=1)
    const soot = cl((v - 0.88) / 0.12);                          // case-mouth soot
    const anneal = Math.exp(-Math.pow((v - 0.8) / 0.07, 2)) * 0.10; // shoulder shade
    const groove = Math.exp(-Math.pow((v - 0.14) / 0.045, 2)) * 0.5; // extractor ring
    const rim = cl((0.05 - v) / 0.05) * 0.14;                    // head-edge dimming
    // Soot darkens red hardest so the smudge cools toward neutral grey.
    const r = 250 * (1 - 0.6 * soot) * (1 - anneal) * (1 - groove) * (1 - rim);
    const g = 247 * (1 - 0.55 * soot) * (1 - anneal * 0.9) * (1 - groove) * (1 - rim);
    const b = 240 * (1 - 0.4 * soot) * (1 - anneal * 0.7) * (1 - groove * 0.92) * (1 - rim);
    for (let x = 0; x < w; x++) {
      const j = (Math.random() - 0.5) * 8; // breaks vertical banding
      const i = (y * w + x) * 4;
      d[i] = cl((r + j) / 255) * 255;
      d[i + 1] = cl((g + j) / 255) * 255;
      d[i + 2] = cl((b + j) / 255) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Small noise canvas so the brass roughness breaks up sun highlights. */
function brassRoughCanvas(size = 64) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = 195 + Math.random() * 60;
    d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Ejected brass casings: ~4-5 m/s right-rear arcs with hard tumble that
 *  cross the frame, ground bounce, then sink into the dirt instead of
 *  shrink-despawning. Geometry is cheated to 0.75x and instanced at 0.62x
 *  (true scale reads huge at ~0.4m from the lens) with only a gentle
 *  velocity smear near the camera. (The 1-2 frame eject glint is spawned
 *  by the shooter into the FX flash pool at the eject port.) */
export class CasingSystem {
  constructor(scene, capacity = 50) {
    this.scene = scene;
    this.camera = null; // world camera, found lazily among scene children
    const geo = casingGeometry();
    const roughMap = new THREE.CanvasTexture(brassRoughCanvas());
    roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
    const map = new THREE.CanvasTexture(brassMapCanvas());
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    // Reads METAL, not matte tan: tight roughness + full metalness + env
    // sheen over a deeper gold, with soot mouth / groove shadow baked in
    // the length-gradient map. Transparent so the per-instance aFade can
    // thin airborne brass for the near-camera motion-blur cheat.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb8923f, map, roughness: 0.22, metalness: 1.0,
      roughnessMap: roughMap, envMapIntensity: 1.3, transparent: true,
    });
    // Per-instance alpha driving the fake motion blur (0.65 while smeared).
    this.aFade = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', this.aFade);
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFade;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.a *= vFade;');
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.capacity = capacity;
    this.items = new Array(capacity).fill(null);
    this.recs = new Array(capacity);
    this.free = [];
    for (let i = 0; i < capacity; i++) {
      this.free.push(i);
      this.recs[i] = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), rotVel: new THREE.Vector3(),
        age: 0, bounced: false, groundT: 0, sinkT: -1, restY: 0.004,
      };
    }
    this._m = new THREE.Matrix4();
    this._sm = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._dir = new THREE.Vector3();
    // 0.5x instance scale on top of the 0.75x geometry cheat: the port is
    // only ~0.4m from the eye, where anything near true scale reads as a
    // giant gold slab (a REAL case subtends ~74px there). This lands the
    // airborne case around 20-28px at 1080p — small, glinting, tumbling.
    this._one = new THREE.Vector3(0.5, 0.5, 0.5);
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._zero);
    this.onBounce = null;
  }

  eject(pos, rightDir, backDir = null) {
    if (!this.free.length) return;
    const i = this.free.pop();
    // 3.8-4.8 m/s along (right + 0.55 up + 0.4 back): a brisk right-rear
    // eject arc that clears the shooter's shoulder and crosses the frame —
    // fast enough that even the first rendered frame has the case well
    // clear of the lens.
    const dir = this._dir.copy(rightDir);
    dir.y += 0.55;
    if (backDir) dir.addScaledVector(backDir, 0.4);
    dir.normalize();
    const c = this.recs[i];
    c.pos.copy(pos);
    c.vel.copy(dir).multiplyScalar(3.8 + Math.random() * 1.0);
    c.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    // Hard tumble: 45-75 rad/s about a random axis
    c.rotVel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize().multiplyScalar(45 + Math.random() * 30);
    c.age = 0;
    c.bounced = false;
    c.groundT = 0;
    c.sinkT = -1;
    c.restY = 0.004;
    this.items[i] = c;
  }

  /** Optional explicit hookup; otherwise the scene's camera is found lazily. */
  setCamera(cam) { this.camera = cam; }

  update(dt) {
    if (!this.camera) {
      const ch = this.scene.children;
      for (let j = 0; j < ch.length; j++) {
        if (ch[j].isPerspectiveCamera) { this.camera = ch[j]; break; }
      }
    }
    const cam = this.camera;
    for (let i = 0; i < this.capacity; i++) {
      const c = this.items[i];
      if (!c) continue;
      c.age += dt;
      if (c.age > 9) { // safety net only; normal exit is the sink below
        this.items[i] = null; this.free.push(i);
        this.mesh.setMatrixAt(i, this._zero);
        continue;
      }
      if (c.sinkT >= 0) {
        // After 3s on the ground: sink 0.02m over 0.3s, then free the slot.
        c.sinkT += dt;
        c.pos.y = c.restY - 0.02 * Math.min(1, c.sinkT / 0.3);
        if (c.sinkT >= 0.3) {
          this.items[i] = null; this.free.push(i);
          this.mesh.setMatrixAt(i, this._zero);
          continue;
        }
      } else {
        c.vel.y -= 12 * dt;
        c.pos.addScaledVector(c.vel, dt);
        if (c.pos.y < c.restY) {
          c.pos.y = c.restY;
          c.vel.y = Math.abs(c.vel.y) * 0.32;
          c.vel.x *= 0.55; c.vel.z *= 0.55;
          c.rotVel.multiplyScalar(0.45);
          if (!c.bounced) {
            c.bounced = true;
            if (this.onBounce) this.onBounce();
          }
          if (Math.abs(c.vel.y) < 0.4) { c.vel.set(0, 0, 0); c.rotVel.set(0, 0, 0); }
        }
        if (c.vel.lengthSq() < 1e-6 && c.pos.y <= c.restY + 1e-4) {
          c.groundT += dt;
          if (c.groundT > 3) c.sinkT = 0;
        }
        c.rot.x += c.rotVel.x * dt; c.rot.y += c.rotVel.y * dt; c.rot.z += c.rotVel.z * dt;
      }
      this._q.setFromEuler(c.rot);
      this._m.compose(c.pos, this._q, this._one); // never shrink-despawn
      // Fake motion blur: an airborne case within ~1.2m of the lens smears
      // gently along its velocity (max ~1.35x) and thins slightly. The old
      // 2.5x smear flattened the tumbling cylinder into a giant flat gold
      // card whenever a capture froze it mid-air — a hint of drag is all
      // the effect can afford this close to the camera.
      let fade = 1;
      if (cam && c.sinkT < 0) {
        const sp2 = c.vel.lengthSq();
        if (sp2 > 4) {
          const dx = c.pos.x - cam.position.x;
          const dy = c.pos.y - cam.position.y;
          const dz = c.pos.z - cam.position.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1.44) {
            const k = Math.min(1, (1.2 - Math.sqrt(d2)) / 0.3);
            const sp = Math.sqrt(sp2);
            const km = 0.25 * k; // 1x -> ~1.25x along the velocity direction
            const vx = c.vel.x / sp, vy = c.vel.y / sp, vz = c.vel.z / sp;
            const e = this._sm.elements;
            e[0] = 1 + km * vx * vx; e[4] = km * vx * vy; e[8] = km * vx * vz; e[12] = 0;
            e[1] = km * vy * vx; e[5] = 1 + km * vy * vy; e[9] = km * vy * vz; e[13] = 0;
            e[2] = km * vz * vx; e[6] = km * vz * vy; e[10] = 1 + km * vz * vz; e[14] = 0;
            e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
            // M = T * S(v) * R * s — world-space stretch about the case
            this._m.setPosition(0, 0, 0);
            this._sm.multiply(this._m);
            this._sm.setPosition(c.pos);
            this._m.copy(this._sm);
            fade = 1 - 0.15 * k;
          }
        }
      }
      this.aFade.setX(i, fade);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aFade.needsUpdate = true;
  }
}
