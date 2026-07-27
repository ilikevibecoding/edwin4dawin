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
    const geo = new THREE.CylinderGeometry(235, 235, 130, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex.horizon,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const cyl = new THREE.Mesh(geo, mat);
    cyl.position.y = 130 / 2 - 4;
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
    // third band just in FRONT of the skyline ring (skyline sits at 125-205)
    // so silhouette bases melt into the horizon instead of cutting out hard
    const geo3 = new THREE.CylinderGeometry(124, 124, 24, 48, 1, true);
    const mat3 = new THREE.MeshBasicMaterial({
      map: this.tex.horizon,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const cyl3 = new THREE.Mesh(geo3, mat3);
    cyl3.position.y = 24 / 2 - 2;
    cyl3.renderOrder = 3;
    cyl3.frustumCulled = false;
    this.group.add(cyl3);
  }

  _buildDust() {
    // instanced micro-quads: THREE.Points render at unreliable sizes in the
    // software-GL screenshot environment, so quads it is.
    // Kept TINY (1-2.4cm) and faint so they read as drifting motes in light
    // shafts — never as floating debris. Instances near the camera are scaled
    // to zero in update() so nothing ever projects large on screen.
    const N = 360;
    this.dustBox = new THREE.Vector3(46, 13, 46);
    this.dustPos = [];
    this.dustQuat = [];
    this.dustScale = new Float32Array(N);
    this.dustSeed = new Float32Array(N * 2);
    const geo = new THREE.PlaneGeometry(0.02, 0.02);
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex.softCircle,
      transparent: true,
      opacity: 0.2,
      color: 0xffdfb0,
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
      const p = new THREE.Vector3(randRange(-23, 23), randRange(0.4, 11), randRange(-23, 23));
      this.dustPos.push(p);
      this.dustSeed[i * 2] = rand() * 10;
      this.dustSeed[i * 2 + 1] = 0.25 + rand() * 0.8;
      this.dustScale[i] = randRange(0.55, 1.2);
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
    // sprite center y is chosen so the DENSE BASE of the texture sits at a
    // real anchor (rubble pile / ground), never mid-air: base = y - sy/2.
    // mirrored copy of the column texture so the plumes don't share one
    // identical silhouette
    const smokeFlip = this.tex.smoke.clone();
    smokeFlip.wrapS = THREE.RepeatWrapping;
    smokeFlip.repeat.x = -1;
    smokeFlip.needsUpdate = true;
    const defs = [
      // near column rising out of the collapsed crossroads building's rubble
      { x: 12, y: 15.5, z: -11, sx: 15, sy: 30, op: 0.62, drift: 0.012, col: 0x8d8172 },
      // mid column: base tucked behind the midground-ring rooftops so it has a
      // visible source district instead of hanging sourceless in the haze
      { x: -84, y: 17, z: -61, sx: 20, sy: 42, op: 0.52, drift: 0.009, col: 0x998b79, flip: true },
      // distant war columns (bases below the horizon roofline). Barely darker
      // than the sky/haze value so they read as aerial smoke.
      { x: 118, y: 40, z: -145, sx: 62, sy: 84, op: 0.44, drift: 0.005, col: 0xa89a86, flip: true },
      { x: 95, y: 31, z: 160, sx: 42, sy: 66, op: 0.44, drift: 0.007, col: 0xa2937f },
    ];
    for (const d of defs) {
      const mat = new THREE.SpriteMaterial({
        map: d.flip ? smokeFlip : this.tex.smoke,
        transparent: true,
        opacity: d.op,
        color: d.col,
        depthWrite: false,
        fog: true,
        rotation: randRange(-0.09, 0.09),
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

  /** Tileable dusk-facade canvas (multiply map over the haze vertex colors).
   *  Values hover just under white so the pattern reads as through-haze
   *  contrast, never billboard-sharp. style: 0 punched grid, 1 curtain wall,
   *  2 ribbon windows. A small plain patch at the origin corner is reserved
   *  for roofs/untextured pieces to sample. */
  _facadeTex(style) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const bg = 244;
    ctx.fillStyle = `rgb(${bg},${bg - 2},${bg - 5})`;
    ctx.fillRect(0, 0, 256, 256);
    const win = (x, y, w, h) => {
      const lit = rand() < (style === 0 ? 0.06 : 0.045);
      if (lit) {
        ctx.fillStyle = 'rgb(252,224,180)';
      } else {
        const v = 218 + rand() * 16;
        ctx.fillStyle = `rgb(${v | 0},${(v + 2) | 0},${(v + 6) | 0})`;
      }
      ctx.fillRect(x, y, w, h);
      if (!lit && rand() < 0.25) { // odd darker pane
        ctx.fillStyle = 'rgba(110,116,128,0.24)';
        ctx.fillRect(x + w * rand() * 0.5, y, w * 0.4, h);
      }
    };
    if (style === 0) {
      // punched windows: 6 columns x 8 floors
      for (let r = 0; r < 8; r++) {
        ctx.fillStyle = 'rgba(130,120,110,0.2)';
        ctx.fillRect(0, r * 32 + 29, 256, 2);
        for (let q = 0; q < 6; q++) {
          if (rand() < 0.06) continue; // blank bay
          win(q * 42.7 + 9, r * 32 + 7, 24, 17);
        }
      }
    } else if (style === 1) {
      // curtain wall: continuous glass strips + mullions
      for (let q = 0; q < 6; q++) {
        const gx = q * 42.7 + 6;
        for (let r = 0; r < 8; r++) win(gx, r * 32 + 3, 27, 26);
      }
      ctx.fillStyle = 'rgba(158,148,136,0.3)';
      for (let r = 0; r < 8; r++) ctx.fillRect(0, r * 32, 256, 3);
    } else {
      // ribbon windows: horizontal dark bands with pale spandrels
      for (let r = 0; r < 8; r++) {
        const v = 219 + rand() * 12;
        ctx.fillStyle = `rgb(${v | 0},${(v + 2) | 0},${(v + 5) | 0})`;
        ctx.fillRect(0, r * 32 + 8, 256, 15);
        for (let q = 0; q < 10; q++) {
          if (rand() < 0.09) { ctx.fillStyle = 'rgb(252,226,182)'; ctx.fillRect(q * 25.6 + 4, r * 32 + 9, 12, 13); }
          ctx.fillStyle = 'rgba(140,134,126,0.38)';
          ctx.fillRect(q * 25.6, r * 32 + 8, 2, 15);
        }
      }
    }
    // plain corner patch for roof/blank sampling
    ctx.fillStyle = `rgb(${bg - 3},${bg - 5},${bg - 8})`;
    ctx.fillRect(0, 0, 12, 12);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  _buildSkyline() {
    // Silhouette blocks with BAKED atmospheric-haze colors (fog: false so the
    // scene fog can't wash them back to cream) and a baked facade texture so
    // faces read as distant window grids through the haze. Colors track the
    // sky they are seen against — warm haze at the horizon, blue-gray higher
    // up — staying a step darker than the sky at every altitude.
    const NV = 3;
    const geosByVar = [[], [], []];
    const dots = [];
    const hazeLow = new THREE.Color(0xc89d74);   // warm horizon air
    const hazeHigh = new THREE.Color(0xa2b0bc);  // upper-sky blue-gray (near sky value)
    const silLow = new THREE.Color(0x54483c);    // silhouette core near ground
    const silHigh = new THREE.Color(0x5a616c);   // silhouette core aloft
    const litCol = new THREE.Color(0xdba876);    // sun-kissed face
    const sunDir = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
    const cA = new THREE.Color(); const cS = new THREE.Color();
    // k = how far from haze toward silhouette (0 = invisible, 1 = dark cutout)
    // vi = facade variant (uv-mapped); vi < 0 = plain (samples the blank patch)
    const push = (geo, k, litAmt = 0.35, vi = -1, uvo = null) => {
      const g = geo.toNonIndexed();
      g.computeVertexNormals();
      const n = g.attributes.position.count;
      const nor = g.attributes.normal;
      const pos = g.attributes.position;
      const arr = new Float32Array(n * 3);
      const uvArr = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const hT = THREE.MathUtils.clamp((pos.getY(i) - 10) / 58, 0, 1);
        cA.copy(hazeLow).lerp(hazeHigh, hT);
        cS.copy(silLow).lerp(silHigh, hT);
        // crowns rising above the haze band darken toward silhouette so tall
        // towers never read as bright white monoliths against the blue sky
        const kEff = Math.min(0.66, k + Math.max(0, pos.getY(i) - 28) * 0.011);
        cA.lerp(cS, kEff);
        const d = nor.getX(i) * sunDir.x + nor.getY(i) * sunDir.y + nor.getZ(i) * sunDir.z;
        if (d > 0.55) cA.lerp(litCol, litAmt * Math.min(1, (d - 0.55) / 0.35) * (1 - hT * 0.45));
        else if (d < -0.5) cA.lerp(cS, 0.18); // shadow side a touch deeper
        arr[i * 3] = cA.r; arr[i * 3 + 1] = cA.g; arr[i * 3 + 2] = cA.b;
        // world-scale facade UVs: dominant-axis projection, roofs sample the
        // blank corner patch so no windows appear on horizontal faces
        if (vi < 0 || Math.abs(nor.getY(i)) > 0.6) {
          uvArr[i * 2] = 0.023; uvArr[i * 2 + 1] = 0.023;
        } else {
          const u = (Math.abs(nor.getX(i)) > Math.abs(nor.getZ(i)) ? pos.getZ(i) : pos.getX(i));
          uvArr[i * 2] = u / uvo.us + uvo.u;
          uvArr[i * 2 + 1] = pos.getY(i) / uvo.vs + uvo.v;
        }
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      geosByVar[vi < 0 ? 0 : vi].push(g);
    };
    // farther buildings melt harder into the haze
    const kFor = (r, boost = 0) =>
      THREE.MathUtils.clamp((0.5 - (r - 125) * 0.0014) * randRange(0.92, 1.08) + boost, 0.3, 0.54);
    // per-building uv frame: random phase + slight column-pitch variation
    const uvFrame = () => ({ u: rand(), v: rand(), us: 10.8 * randRange(0.85, 1.2), vs: 24 * randRange(0.9, 1.1) });
    // sparse warm interior lights catching in the haze (heavier on near ring).
    // Dots sit ON an origin-facing axis face so none ever floats off a wall.
    const dotAt = (x, z, w, d, h, r) => {
      const p = rand();
      const nD = r < 150 ? (p < 0.42 ? 1 + (rand() * 2 | 0) : 0) : (p < 0.16 ? 1 : 0);
      for (let i = 0; i < nD; i++) {
        const floorY = 2 + (rand() * Math.max(1, (h * 0.7 - 3) / 3) | 0) * 3;
        const onX = Math.abs(x) > Math.abs(z); // pick the face most toward the map
        dots.push(onX
          ? { x: x - Math.sign(x) * (w / 2 + 0.22), y: floorY, z: z + randRange(-0.4, 0.4) * d, yaw: Math.PI / 2, s: randRange(0.8, 1.3), warm: randRange(0.85, 1.2) }
          : { x: x + randRange(-0.4, 0.4) * w, y: floorY, z: z - Math.sign(z) * (d / 2 + 0.22), yaw: 0, s: randRange(0.8, 1.3), warm: randRange(0.85, 1.2) });
      }
    };
    for (let a = 0; a < Math.PI * 2; a += randRange(0.07, 0.18)) {
      const r = randRange(125, 205);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const w = randRange(9, 30), d = randRange(9, 26);
      // cap tower height: anything much above the haze band pops as a prism
      let h = Math.min(44, randRange(6, 34) * (rand() < 0.18 ? randRange(1.4, 1.8) : 1));
      const vi = (rand() * NV) | 0;
      const uvo = uvFrame();
      const k = kFor(r);
      push(new THREE.BoxGeometry(w, h, d).translate(x, h / 2 - 0.5, z), k, 0.35, vi, uvo);
      // stepped setback tiers on some taller blocks
      if (h > 14 && rand() < 0.3) {
        const h2 = Math.min(48 - h, h * randRange(0.22, 0.38));
        push(new THREE.BoxGeometry(w * randRange(0.55, 0.75), h2, d * randRange(0.55, 0.78))
          .translate(x + randRange(-2, 2), h + h2 / 2 - 0.5, z + randRange(-2, 2)), k, 0.35, vi, uvo);
        h += h2;
      }
      // rooftop bulkheads + antenna masts on the closest ring
      if (r < 152) {
        if (rand() < 0.55) {
          push(new THREE.BoxGeometry(randRange(2.5, 4.5), randRange(1.8, 3), randRange(2.5, 4))
            .translate(x + randRange(-w / 4, w / 4), h + 1 - 0.5, z + randRange(-d / 4, d / 4)), kFor(r, 0.05));
        }
        if (rand() < 0.4) {
          const ah = randRange(4, 8);
          push(new THREE.BoxGeometry(0.55, ah, 0.55)
            .translate(x + randRange(-w / 3, w / 3), h + ah / 2 - 0.5, z + randRange(-d / 3, d / 3)), kFor(r, 0.12), 0.05);
        }
      } else if (rand() < 0.35) {
        push(new THREE.BoxGeometry(w * 0.4, h * 0.35, d * 0.4)
          .translate(x + randRange(-6, 6), h + h * 0.16 - 0.5, z + randRange(-6, 6)), kFor(r, 0.03), 0.35, vi, uvo);
      }
      dotAt(x, z, w, d, h, r);
    }
    // two signature towers on the overview/crossroads sightline so the
    // roofline isn't only rectangles
    {
      // slab tower with a tapering spire
      const sx = Math.cos(3.75) * 145, sz = Math.sin(3.75) * 145;
      const uvo = uvFrame();
      const k = kFor(145, 0.04);
      push(new THREE.BoxGeometry(13, 44, 11).translate(sx, 21.5, sz), k, 0.35, 1, uvo);
      push(new THREE.BoxGeometry(9, 5, 8).translate(sx, 46, sz), k, 0.35, 1, uvo);
      push(new THREE.CylinderGeometry(0.35, 1.5, 11, 6).translate(sx, 53.5, sz), kFor(145, 0.1), 0.08);
      dots.push({ x: sx - Math.sign(sx) * 6.72, y: 30, z: sz + 2.5, yaw: Math.PI / 2, s: 1.1, warm: 1.1 });
      // wide slab with a roofline notch (two shoulders joined by a lower core)
      const nx = Math.cos(3.4) * 152, nz = Math.sin(3.4) * 152;
      const uvo2 = uvFrame();
      const k2 = kFor(152, 0.02);
      push(new THREE.BoxGeometry(10, 38, 12).translate(nx - 7.5, 18.5, nz), k2, 0.35, 0, uvo2);
      push(new THREE.BoxGeometry(10, 33, 12).translate(nx + 7.5, 16, nz), k2, 0.35, 0, uvo2);
      push(new THREE.BoxGeometry(26, 22, 12).translate(nx, 10.5, nz), k2, 0.35, 0, uvo2);
    }
    // minarets + cranes for a middle-eastern skyline
    const min = (x, z, h) => {
      const k = kFor(Math.hypot(x, z), 0.06);
      push(new THREE.CylinderGeometry(1.6, 2.2, h, 8).translate(x, h / 2, z), k);
      push(new THREE.CylinderGeometry(2.6, 2.6, 2.2, 8).translate(x, h * 0.82, z), k);
      push(new THREE.SphereGeometry(2.1, 8, 6).translate(x, h + 1, z), k);
    };
    min(-105, -142, 46);
    min(62, -180, 52);
    const crane = (x, z, ry) => {
      const mast = new THREE.BoxGeometry(2.2, 46, 2.2).translate(0, 23, 0);
      const jib = new THREE.BoxGeometry(34, 1.8, 1.8).translate(9, 44.5, 0);
      const cj = new THREE.BoxGeometry(12, 1.6, 1.6).translate(-9, 44.5, 0);
      for (const gg of [mast, jib, cj]) {
        gg.rotateY(ry);
        gg.translate(x, 0, z);
        push(gg, 0.82, 0.06); // cranes read as thin dark lattice
      }
    };
    crane(-135, 72, 0.6);
    crane(168, -68, -0.4);

    for (let vi = 0; vi < NV; vi++) {
      if (!geosByVar[vi].length) continue;
      const mesh = new THREE.Mesh(mergeAll(geosByVar[vi]), new THREE.MeshBasicMaterial({
        vertexColors: true, fog: false, map: this._facadeTex(vi),
      }));
      mesh.name = `skyline${vi}`;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    // merged emissive window dots — warm pinpricks that catch in the haze
    if (dots.length) {
      const dg = [];
      for (const d of dots) {
        const g = new THREE.PlaneGeometry(d.s, d.s * 1.3).rotateY(d.yaw).translate(d.x, d.y, d.z);
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col[i * 3] = 1.25 * d.warm; col[i * 3 + 1] = 0.82 * d.warm; col[i * 3 + 2] = 0.5 * d.warm;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        dg.push(g);
      }
      const dmesh = new THREE.Mesh(mergeAll(dg), new THREE.MeshBasicMaterial({
        vertexColors: true, fog: false, side: THREE.DoubleSide,
      }));
      dmesh.name = 'skylineDots';
      dmesh.matrixAutoUpdate = false;
      this.group.add(dmesh);
    }
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
        // shrink motes near the camera to zero so none ever projects as a
        // large floating blob on screen
        const fade = Math.min(1, Math.max(0, (p.distanceTo(cam) - 1.6) / 2.2));
        s.setScalar(this.dustScale[i] * fade);
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
