import * as THREE from 'three';
import { rand, randRange } from '../core/rand.js';

const _m4 = new THREE.Matrix4();
const _v3 = new THREE.Vector3();

/**
 * Ambient atmosphere: drifting dust motes near the camera, distant war-smoke
 * columns, and a low-detail skyline silhouette ring beyond the playable area.
 */
export class Atmosphere {
  constructor(game, tex) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.tex = tex;
    this._buildDust();
    this._buildSmoke();
    this._buildSkyline();
    this._buildHorizonHaze();
    this.time = 0;
  }

  _buildHorizonHaze() {
    // Warm gradient band behind the skyline so silhouettes melt into haze
    // instead of cutting out hard against the HDRI. Not fogged — it IS the fog.
    const geo = new THREE.CylinderGeometry(235, 235, 95, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex.horizon,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const cyl = new THREE.Mesh(geo, mat);
    cyl.position.y = 95 / 2 - 4;
    cyl.renderOrder = -1;
    cyl.frustumCulled = false;
    this.group.add(cyl);
    // second, closer + shorter band between the playable bounds and the
    // midground ring so everything beyond the map edge sits in one haze layer
    const geo2 = new THREE.CylinderGeometry(90, 90, 30, 48, 1, true);
    const mat2 = new THREE.MeshBasicMaterial({
      map: this.tex.horizon,
      transparent: true,
      opacity: 0.42,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const cyl2 = new THREE.Mesh(geo2, mat2);
    cyl2.position.y = 30 / 2 - 2;
    cyl2.renderOrder = 4;
    cyl2.frustumCulled = false;
    this.group.add(cyl2);
  }

  _buildDust() {
    // instanced micro-quads: THREE.Points render at unreliable sizes in the
    // software-GL screenshot environment, so quads it is
    const N = 420;
    this.dustBox = new THREE.Vector3(46, 13, 46);
    this.dustPos = [];
    this.dustQuat = [];
    this.dustScale = new Float32Array(N);
    this.dustSeed = new Float32Array(N * 2);
    const geo = new THREE.PlaneGeometry(0.024, 0.024);
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex.softCircle,
      transparent: true,
      opacity: 0.5,
      color: 0xffe2b8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.dust = new THREE.InstancedMesh(geo, mat, N);
    this.dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const p = new THREE.Vector3(randRange(-23, 23), randRange(0.1, 12), randRange(-23, 23));
      this.dustPos.push(p);
      this.dustSeed[i * 2] = rand() * 10;
      this.dustSeed[i * 2 + 1] = 0.25 + rand() * 0.8;
      this.dustScale[i] = randRange(0.7, 1.6);
      e.set(rand() * 3, rand() * 3, rand() * 3);
      q.setFromEuler(e);
      this.dustQuat.push(q.clone());
      s.setScalar(this.dustScale[i]);
      m.compose(p, q, s);
      this.dust.setMatrixAt(i, m);
    }
    this.dust.castShadow = false;
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 5;
    this.group.add(this.dust);
  }

  _buildSmoke() {
    this.smokes = [];
    const defs = [
      // near column above the collapsed crossroads building
      { x: 12, y: 26, z: -11, sx: 17, sy: 34, op: 0.72, drift: 0.012 },
      // distant war columns on the horizon
      { x: -140, y: 46, z: -100, sx: 48, sy: 95, op: 0.85, drift: 0.006 },
      { x: 130, y: 42, z: -160, sx: 55, sy: 90, op: 0.8, drift: 0.005 },
      { x: 95, y: 34, z: 160, sx: 40, sy: 70, op: 0.7, drift: 0.007 },
    ];
    for (const d of defs) {
      const mat = new THREE.SpriteMaterial({
        map: this.tex.smoke,
        transparent: true,
        opacity: d.op,
        color: 0x8a7d6d,
        depthWrite: false,
        fog: true,
        rotation: randRange(-0.06, 0.06),
      });
      const spr = new THREE.Sprite(mat);
      spr.position.set(d.x, d.y, d.z);
      spr.scale.set(d.sx, d.sy, 1);
      spr.userData.drift = d.drift;
      spr.userData.baseRot = mat.rotation;
      this.group.add(spr);
      this.smokes.push(spr);
    }
  }

  _buildSkyline() {
    // silhouette blocks in warm haze — MeshBasicMaterial so fog does the work
    const geos = [];
    const col = new THREE.Color();
    const push = (geo, tint) => {
      const g = geo.toNonIndexed();
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = tint.r; arr[i * 3 + 1] = tint.g; arr[i * 3 + 2] = tint.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      geos.push(g);
    };
    const base = new THREE.Color(0x554639);
    for (let a = 0; a < Math.PI * 2; a += randRange(0.08, 0.17)) {
      const r = randRange(125, 200);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const w = randRange(10, 30), d = randRange(10, 26), h = randRange(8, 36) * (rand() < 0.12 ? 1.7 : 1);
      col.copy(base).offsetHSL(randRange(-0.012, 0.012), randRange(-0.04, 0.04), randRange(-0.05, 0.04));
      push(new THREE.BoxGeometry(w, h, d).translate(x, h / 2 - 0.5, z), col);
      if (rand() < 0.3) {
        push(new THREE.BoxGeometry(w * 0.4, h * 0.4, d * 0.4).translate(x + randRange(-6, 6), h + h * 0.2 - 0.5, z + randRange(-6, 6)), col);
      }
    }
    // minarets + water tower + cranes for a middle-eastern skyline
    const min = (x, z, h) => {
      col.copy(base).offsetHSL(0, 0, -0.03);
      push(new THREE.CylinderGeometry(1.6, 2.2, h, 8).translate(x, h / 2, z), col);
      push(new THREE.CylinderGeometry(2.6, 2.6, 2.2, 8).translate(x, h * 0.82, z), col);
      push(new THREE.SphereGeometry(2.1, 8, 6).translate(x, h + 1, z), col);
    };
    min(-105, -142, 46);
    min(62, -180, 52);
    const dome = (x, z, r) => {
      col.copy(base).offsetHSL(0, 0.02, -0.02);
      push(new THREE.SphereGeometry(r, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 12, z), col);
      push(new THREE.BoxGeometry(r * 2.6, 12, r * 2.6).translate(x, 6, z), col);
    };
    dome(-155, -48, 10);
    const crane = (x, z, ry) => {
      col.set(0x453a2f);
      const g = new THREE.Group();
      const mast = new THREE.BoxGeometry(2.2, 46, 2.2).translate(0, 23, 0);
      const jib = new THREE.BoxGeometry(34, 1.8, 1.8).translate(9, 44.5, 0);
      const cj = new THREE.BoxGeometry(12, 1.6, 1.6).translate(-9, 44.5, 0);
      for (const gg of [mast, jib, cj]) {
        gg.rotateY(ry);
        gg.translate(x, 0, z);
        push(gg, col);
      }
      void g;
    };
    crane(-135, 72, 0.6);
    crane(168, -68, -0.4);

    const merged = mergeAll(geos);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
  }

  update(dt) {
    this.time += dt;
    const cam = this.game.camera.position;
    // dust drifts and wraps in a box around the camera
    const B = this.dustBox;
    if (dt > 0) {
      const m = _m4;
      const s = _v3;
      for (let i = 0; i < this.dustPos.length; i++) {
        const s0 = this.dustSeed[i * 2], sp = this.dustSeed[i * 2 + 1];
        const p = this.dustPos[i];
        p.x += Math.sin(this.time * 0.4 + s0) * 0.32 * dt + 0.22 * sp * dt;
        p.y += Math.cos(this.time * 0.3 + s0 * 1.7) * 0.1 * dt - 0.05 * sp * dt;
        p.z += Math.cos(this.time * 0.33 + s0) * 0.3 * dt + 0.14 * sp * dt;
        // wrap relative to camera
        if (p.x - cam.x > B.x / 2) p.x -= B.x; else if (p.x - cam.x < -B.x / 2) p.x += B.x;
        if (p.z - cam.z > B.z / 2) p.z -= B.z; else if (p.z - cam.z < -B.z / 2) p.z += B.z;
        if (p.y < 0.05) p.y += B.y; else if (p.y > B.y) p.y -= B.y;
        s.setScalar(this.dustScale[i]);
        m.compose(p, this.dustQuat[i], s);
        this.dust.setMatrixAt(i, m);
      }
      this.dust.instanceMatrix.needsUpdate = true;
      for (const sm of this.smokes) {
        sm.material.rotation = sm.userData.baseRot + Math.sin(this.time * sm.userData.drift * 12) * 0.05;
      }
    }
  }
}

function mergeAll(geos) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}
