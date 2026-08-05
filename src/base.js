// The fictional Castellan Ridge base: terrain + mountains, concrete aprons,
// roads, perimeter fence, command shelter (with interior), radar tower,
// floodlights, trucks, generators, antennas, barriers, crates, cables and
// markings. Everything kit-bashed from primitives + canvas textures.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from './constants.js';
import {
  concreteTexture, asphaltTexture, sandTexture, panelTexture, metalTexture,
  hazardStripesTexture, chainlinkTexture, stencilTexture, padMarkingTexture,
  fbm2, ridged2, camoNetTexture,
} from './textures.js';

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  if (r < WORLD.baseFlatRadius) return 0;
  const t = smoothstep(WORLD.baseFlatRadius, 620, r);
  let h = fbm2(x * 0.00085, z * 0.00085, 4) * 30 * t + fbm2(x * 0.004, z * 0.004, 3) * 5 * t;
  const m = smoothstep(5200, 8600, r) * (1 - smoothstep(12800, 15200, r));
  if (m > 0) {
    const ridge = Math.pow(ridged2(x * 0.00017 + 3.1, z * 0.00017 - 2.4, 5), 1.9);
    h += m * ridge * 1750;
  }
  return h;
}

export class Base {
  constructor({ scene, events, rng }) {
    this.scene = scene;
    this.events = events;
    this.rng = rng.fork(11);
    this.colliders = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this._animated = [];      // {obj, fn(dt, t)}
    this._nightItems = [];    // toggled on tod change
    this._raidItems = [];     // beacons during scenarios
    this.time = 0;

    this._buildTerrain();
    this._buildPadsAndRoads();
    this._buildFence();
    this._buildShelter();
    this._buildRadarTower();
    this._buildFloodlights();
    this._buildProps();
    this._buildSigns();

    events.on('tod-changed', ({ night }) => this._setNight(night));
    events.on('scenario-start', () => this._setRaid(true));
    events.on('scenario-end', () => this._setRaid(false));
  }

  groundHeight(x, z) { return terrainHeight(x, z); }

  addCollider(c) { this.colliders.push(c); }
  boxCollider(cx, cz, w, d, h = 3, cy = 0) {
    this.addCollider({ type: 'aabb', min: new THREE.Vector3(cx - w / 2, cy, cz - d / 2), max: new THREE.Vector3(cx + w / 2, cy + h, cz + d / 2) });
  }
  cylCollider(x, z, r, h = 3) { this.addCollider({ type: 'cylinder', x, z, r, h, y: 0 }); }

  // ------------------------------------------------------------ terrain --
  _buildTerrain() {
    const rings = 96, segs = 180;
    const radii = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      radii.push(Math.pow(t, 1.75) * WORLD.terrainRadius);
    }
    const verts = [], uvs = [], cols = [], idx = [];
    const c = new THREE.Color();
    const sand = new THREE.Color(0x93805f);
    const sandLight = new THREE.Color(0xa89673);
    const rock = new THREE.Color(0x7c6e5c);
    const rockHigh = new THREE.Color(0x9c9181);
    for (let i = 0; i <= rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const r = radii[i];
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = terrainHeight(x, z);
        verts.push(x, h, z);
        uvs.push(x / 26, z / 26);
        // color by height + noise patchiness
        const patch = fbm2(x * 0.0012 + 9, z * 0.0012, 3) * 0.5 + 0.5;
        c.copy(sand).lerp(sandLight, patch * 0.7);
        if (h > 40) c.lerp(rock, smoothstep(40, 320, h));
        if (h > 600) c.lerp(rockHigh, smoothstep(600, 1500, h));
        cols.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const j2 = (j + 1) % segs;
        const a = i * segs + j, b = i * segs + j2, d = (i + 1) * segs + j, e = (i + 1) * segs + j2;
        idx.push(a, b, d, b, e, d); // CCW seen from above (+Y)
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: sandTexture([1, 1]), vertexColors: true, roughness: 0.97, metalness: 0,
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.group.add(terrain);

    // scattered rocks + scrub outside the base
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d6055, roughness: 1 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 240);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const e = new THREE.Euler();
    for (let i = 0; i < 240; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(255, 4200);
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.y = terrainHeight(p.x, p.z) - 0.2;
      e.set(this.rng.range(0, 3), this.rng.range(0, 3), this.rng.range(0, 3));
      q.setFromEuler(e);
      const sc = this.rng.range(0.4, 3.2);
      s.set(sc * this.rng.range(0.7, 1.4), sc * this.rng.range(0.5, 1), sc * this.rng.range(0.7, 1.4));
      m.compose(p, q, s);
      rocks.setMatrixAt(i, m);
    }
    rocks.castShadow = true;
    this.group.add(rocks);

    // dry scrub — crossed planes
    const scrubGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.PlaneGeometry(1.6, 1.1),
      new THREE.PlaneGeometry(1.6, 1.1).rotateY(Math.PI / 2),
    ]);
    scrubGeo.translate(0, 0.5, 0);
    const scrubMat = new THREE.MeshStandardMaterial({
      color: 0x76705a, roughness: 1, alphaTest: 0.5, side: THREE.DoubleSide,
      map: scrubTexture(),
    });
    const scrub = new THREE.InstancedMesh(scrubGeo, scrubMat, 420);
    for (let i = 0; i < 420; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(250, 2600);
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.y = terrainHeight(p.x, p.z);
      e.set(0, this.rng.range(0, Math.PI * 2), 0);
      q.setFromEuler(e);
      s.setScalar(this.rng.range(0.5, 1.7));
      m.compose(p, q, s);
      scrub.setMatrixAt(i, m);
    }
    this.group.add(scrub);
  }

  // ------------------------------------------------------- pads + roads --
  _buildPadsAndRoads() {
    const conc = concreteTexture([5, 5]);
    const padMat = new THREE.MeshStandardMaterial({ map: conc, roughness: 0.92 });
    const mkPad = (x, z, w, d, rot = 0) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), padMat);
      pad.position.set(x, 0.12, z);
      pad.rotation.y = rot;
      pad.receiveShadow = true;
      this.group.add(pad);
      return pad;
    };
    // main apron
    mkPad(0, 0, 84, 74);
    // battery pads
    this.pads = {
      rampart: { pos: new THREE.Vector3(52, 0.25, -34), yaw: -0.5 },
      zenith: { pos: new THREE.Vector3(60, 0.25, 38), yaw: -1.1 },
      sentinel: { pos: new THREE.Vector3(-16, 0.25, 84), yaw: Math.PI * 0.97 },
    };
    mkPad(52, -34, 26, 26, -0.5);
    mkPad(60, 38, 28, 28, -1.1);
    mkPad(-16, 84, 34, 34, 0.15);

    // helipad-style marking corner (visual variety)
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({ map: padMarkingTexture(), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(-26, 0.26, -22);
    this.group.add(mark);

    // roads
    const asph = asphaltTexture([1, 8]);
    const roadMat = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.96 });
    const mkRoad = (x1, z1, x2, z2, w = 7) => {
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const geo = new THREE.PlaneGeometry(w, len, 1, Math.max(1, Math.round(len / 18)));
      const road = new THREE.Mesh(geo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = Math.atan2(dx, dz);
      road.position.set((x1 + x2) / 2, 0.08, (z1 + z2) / 2);
      road.receiveShadow = true;
      this.group.add(road);
    };
    mkRoad(0, 37, 0, 232, 8);           // gate road
    mkRoad(0, 60, -14, 68, 6);          // to sentinel
    mkRoad(-14, 68, -16, 84, 6);
    mkRoad(42, 0, 52, -22, 6);          // to rampart
    mkRoad(42, 8, 58, 30, 6);           // to zenith
    mkRoad(-42, 0, -70, 0, 6);          // west service
    // center line on gate road
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 180),
      new THREE.MeshBasicMaterial({ color: 0xcfc8a8, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.1, 140);
    this.group.add(line);
  }

  // --------------------------------------------------------------- fence --
  _buildFence() {
    const R = WORLD.fenceRadius;
    const segs = 44;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 3.1, 6);
    const postMat = new THREE.MeshStandardMaterial({ map: metalTexture('#5a615c'), roughness: 0.6, metalness: 0.7 });
    const posts = new THREE.InstancedMesh(postGeo, postMat, segs);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    const linkTex = chainlinkTexture();
    linkTex.repeat.set(10, 2);
    const meshParts = [];
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      const x2 = Math.cos(a2) * R, z2 = Math.sin(a2) * R;
      p.set(x1, 1.55, z1);
      m.compose(p, q, s);
      posts.setMatrixAt(i, m);
      // skip panel at the gate (south, a≈π/2 → z+)
      const mid = (a1 + a2) / 2;
      if (Math.abs(mid - Math.PI / 2) < 0.045) continue;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const g = new THREE.PlaneGeometry(len, 2.9);
      g.rotateY(-Math.atan2(z2 - z1, x2 - x1));
      g.translate((x1 + x2) / 2, 1.5, (z1 + z2) / 2);
      meshParts.push(g);
    }
    posts.castShadow = true;
    this.group.add(posts);
    const fenceGeo = BufferGeometryUtils.mergeGeometries(meshParts);
    const fenceMat = new THREE.MeshStandardMaterial({
      map: linkTex, transparent: true, alphaTest: 0.22, side: THREE.DoubleSide,
      color: 0xd6dde0, roughness: 0.6, metalness: 0.25, depthWrite: false,
    });
    const fence = new THREE.Mesh(fenceGeo, fenceMat);
    this.group.add(fence);
    // collide with an approximate ring of segments
    for (let i = 0; i < segs; i++) {
      const a = ((i + 0.5) / segs) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.08) continue; // gate opening
      this.cylCollider(Math.cos(a) * R, Math.sin(a) * R, 16.4, 3);
    }

    // gate
    const gateMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#5b6353', seed: 12 }), roughness: 0.7 });
    for (const sx of [-6.4, 6.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), gateMat);
      post.position.set(sx, 2.2, R);
      post.castShadow = true;
      this.group.add(post);
      this.boxCollider(sx, R, 1, 1, 4);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.7, 0.6), gateMat);
    beam.position.set(0, 4.4, R);
    this.group.add(beam);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10.4, 1.15),
      new THREE.MeshBasicMaterial({ map: stencilTexture('CASTELLAN RIDGE TEST RANGE', { w: 1024, h: 112, size: 62, color: '#e8e4d8', bg: '#3a4136' }) }),
    );
    sign.position.set(0, 3.6, R - 0.4);
    sign.rotation.y = Math.PI;
    this.group.add(sign);
  }

  // ------------------------------------------------------------- shelter --
  _buildShelter() {
    const g = new THREE.Group();
    g.position.set(-38, 0, -10);
    g.rotation.y = Math.PI / 2 + 0.15; // door faces east toward apron
    this.group.add(g);
    this.shelterGroup = g;

    const W = 9.4, H = 3.15, D = 6.2, T = 0.22;
    const wallMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#6a7260', seed: 5 }), roughness: 0.82 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x2e3336, roughness: 0.9, metalness: 0.1 });
    const mkWall = (w, h, d, x, y, z) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      wall.castShadow = true; wall.receiveShadow = true;
      g.add(wall);
      return wall;
    };
    // floor + roof
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, D), new THREE.MeshStandardMaterial({ map: concreteTexture([3, 2]), roughness: 0.9 }));
    floor.position.y = 0.09;
    floor.receiveShadow = true;
    g.add(floor);
    const roof = mkWall(W, T, D, 0, H + T / 2, 0);
    roof.material = wallMat;
    // walls: door gap on +X side (local)
    mkWall(W, H, T, 0, H / 2, -D / 2 + T / 2);           // back
    mkWall(T, H, D, -W / 2 + T / 2, H / 2, 0);           // left
    mkWall(T, H, D, W / 2 - T / 2, H / 2, 0);            // right
    // front wall with doorway (two segments + lintel)
    const doorW = 1.5, doorX = 1.6;
    const seg1w = (doorX - doorW / 2) - (-W / 2);
    mkWall(seg1w, H, T, -W / 2 + seg1w / 2, H / 2, D / 2 - T / 2);
    const seg2w = (W / 2) - (doorX + doorW / 2);
    mkWall(seg2w, H, T, W / 2 - seg2w / 2, H / 2, D / 2 - T / 2);
    mkWall(doorW, H - 2.2, T, doorX, 2.2 + (H - 2.2) / 2, D / 2 - T / 2); // lintel

    // colliders (world-space approx: rotated box → use several segments)
    const yaw = g.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const toWorld = (lx, lz) => [g.position.x + lx * cos + lz * sin, g.position.z - lx * sin + lz * cos];
    const wallSegs = [
      [-W / 2 + T / 2, 0, T, D], [W / 2 - T / 2, 0, T, D], [0, -D / 2 + T / 2, W, T],
      [-W / 2 + seg1w / 2, D / 2 - T / 2, seg1w, T], [W / 2 - seg2w / 2, D / 2 - T / 2, seg2w, T],
    ];
    for (const [lx, lz, w, d] of wallSegs) {
      const [wx, wz] = toWorld(lx, lz);
      const rad = Math.max(w, d) / 2;
      // approximate rotated wall with a few circle colliders along its length
      const n = Math.max(1, Math.round(Math.max(w, d) / 1.2));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1) - 0.5);
        const ox = w > d ? t * (w - 0.4) : 0;
        const oz = d > w ? t * (d - 0.4) : 0;
        const [cx, cz] = toWorld(lx + ox, lz + oz);
        this.cylCollider(cx, cz, 0.42, H);
      }
      void wx; void wz; void rad;
    }

    // ------ interior fittings
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.6, metalness: 0.4 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.09, 1.05), deskMat);
    desk.position.set(-1.2, 0.92, -D / 2 + 0.78);
    g.add(desk);
    for (const dx of [-3.2, -1.2, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), innerMat);
      leg.position.set(dx, 0.45, -D / 2 + 0.78);
      g.add(leg);
    }
    // console screens (canvas-driven, updated by ui/radar)
    this.consoleScreens = [];
    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 160;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(1.18, 0.72),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      scr.position.set(-2.6 + i * 1.42, 1.55, -D / 2 + 0.42);
      scr.rotation.x = -0.14;
      g.add(scr);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.84, 0.07), innerMat);
      frame.position.copy(scr.position).add(new THREE.Vector3(0, 0, -0.045));
      frame.rotation.copy(scr.rotation);
      g.add(frame);
      this.consoleScreens.push({ canvas, tex, mode: i });
    }
    // keyboard + misc
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.24), new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.8 }));
    kb.position.set(-1.2, 0.98, -D / 2 + 1.0);
    g.add(kb);

    // equipment racks with blinking LEDs
    const rackMat = new THREE.MeshStandardMaterial({ map: metalTexture('#31373b', 9), roughness: 0.55, metalness: 0.6 });
    for (const [lx, lz] of [[-W / 2 + 0.62, 1.3], [-W / 2 + 0.62, 2.5]]) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.85), rackMat);
      rack.position.set(lx, 1.03, lz - 1.2);
      g.add(rack);
      const [cx, cz] = toWorld(lx, lz - 1.2);
      this.cylCollider(cx, cz, 0.75, 2);
      for (let i = 0; i < 6; i++) {
        const led = new THREE.Mesh(
          new THREE.PlaneGeometry(0.05, 0.02),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0x35ff70 : 0xffb020, toneMapped: false }),
        );
        led.position.set(lx + 0.46, 0.5 + i * 0.28, lz - 1.2 - 0.25 + (i % 3) * 0.2);
        led.rotation.y = Math.PI / 2;
        g.add(led);
        this._animated.push({
          obj: led,
          fn: (dt, t) => { led.visible = Math.sin(t * (2 + i * 1.7) + i * 9) > -0.6; },
        });
      }
    }

    // holo table (radar.js parents the display to holoAnchor)
    const tableMat = new THREE.MeshStandardMaterial({ map: metalTexture('#3a4145', 5), roughness: 0.42, metalness: 0.72 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.42, 0.86, 24), tableMat);
    table.position.set(1.55, 0.43, -0.5);
    g.add(table);
    const tableTrim = new THREE.Mesh(
      new THREE.TorusGeometry(1.31, 0.026, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x1a6f96, toneMapped: false }),
    );
    tableTrim.rotation.x = Math.PI / 2;
    tableTrim.position.set(1.55, 0.87, -0.5);
    g.add(tableTrim);
    this._animated.push({ obj: tableTrim, fn: (dt, t) => { tableTrim.material.color.setHSL(0.55, 0.85, 0.24 + Math.sin(t * 2.4) * 0.06); } });
    {
      const [cx, cz] = toWorld(1.55, -0.5);
      this.cylCollider(cx, cz, 1.5, 1.2);
    }

    this.holoAnchor = new THREE.Group();
    this.holoAnchor.position.set(1.55, 0.9, -0.5);
    g.add(this.holoAnchor);

    // interior light
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.06, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xd8e6ee, toneMapped: false }),
    );
    ceil.position.set(0, H - 0.06, 0);
    g.add(ceil);
    const inLight = new THREE.PointLight(0xcfe0ea, 26, 14, 1.7);
    inLight.position.set(0.4, H - 0.5, 0);
    g.add(inLight);
    this.shelterLight = inLight;

    // cables along the floor
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.7 });
    const cablePts = [
      new THREE.Vector3(-1.2, 0.05, -D / 2 + 1.2),
      new THREE.Vector3(0.2, 0.05, -0.8),
      new THREE.Vector3(1.4, 0.05, -0.5),
    ];
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 16, 0.035, 6), cableMat);
    g.add(cable);

    // exterior: sandbags at the door, roof antennas, AC box
    this._sandbagWall(g, 2.4, D / 2 + 1.3, 3, 3, 0.35);
    const acc = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.7), rackMat);
    acc.position.set(-W / 2 - 0.6, 0.45, 1.4);
    g.add(acc);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 3.4, 6), rackMat);
    mast.position.set(-2.8, H + 1.7, -1.6);
    g.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: 0xd7d7cf, roughness: 0.5, side: THREE.DoubleSide }));
    dish.position.set(-2.8, H + 3.1, -1.6);
    dish.rotation.x = Math.PI / 3.1;
    g.add(dish);

    // world-space interaction + view anchors
    const cp = new THREE.Vector3(1.0, 0, 1.0);
    const cpw = cp.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)).add(g.position);
    this.console = {
      interactPos: new THREE.Vector3(cpw.x, 1, cpw.z),
      viewPos: new THREE.Vector3(),
      viewLook: new THREE.Vector3(),
    };
    // console camera: standing over holo table looking down/level
    const vp = new THREE.Vector3(3.3, 1.78, 1.35).applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)).add(g.position);
    const vl = new THREE.Vector3(0.6, 0.75, -1.3).applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)).add(g.position);
    this.console.viewPos.copy(vp);
    this.console.viewLook.copy(vl);

    // door light
    const doorLamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
    const dlPos = new THREE.Vector3(doorX, 2.5, D / 2 + 0.12);
    doorLamp.position.copy(dlPos);
    g.add(doorLamp);
    this._nightItems.push({ mat: doorLamp.material, on: 0xffd9a0, off: 0x6b5a40 });
  }

  _sandbagWall(parent, cx, cz, cols, rows, bagH) {
    const bagGeo = new THREE.SphereGeometry(0.34, 8, 6);
    bagGeo.scale(1.25, 0.62, 0.85);
    const bagMat = new THREE.MeshStandardMaterial({ map: sandTexture([1, 1]), color: 0xb9a682, roughness: 1 });
    const count = cols * rows;
    const inst = new THREE.InstancedMesh(bagGeo, bagMat, count);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        p.set(cx + (c - cols / 2) * 0.62 + (r % 2) * 0.3, bagH * 0.5 + r * bagH, cz + this.rng.range(-0.05, 0.05));
        q.setFromEuler(new THREE.Euler(0, this.rng.range(-0.2, 0.2), 0));
        m.compose(p, q, s);
        inst.setMatrixAt(i++, m);
      }
    }
    inst.castShadow = true;
    parent.add(inst);
  }

  // --------------------------------------------------------- radar tower --
  _buildRadarTower() {
    const g = new THREE.Group();
    g.position.set(-74, 0, 46);
    this.group.add(g);
    const metal = new THREE.MeshStandardMaterial({ map: metalTexture('#737b74', 13), roughness: 0.5, metalness: 0.75 });
    // lattice legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.13, 13, 6);
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
      const leg = new THREE.Mesh(legGeo, metal);
      leg.position.set(dx * 0.82, 6.5, dz * 0.82);
      leg.rotation.z = -dx * 0.075;
      leg.rotation.x = dz * 0.075;
      leg.castShadow = true;
      g.add(leg);
    }
    // cross braces
    const braceGeo = new THREE.CylinderGeometry(0.045, 0.045, 3.6, 5);
    for (let lvl = 0; lvl < 4; lvl++) {
      for (let sdx = 0; sdx < 4; sdx++) {
        const brace = new THREE.Mesh(braceGeo, metal);
        const a = (sdx / 4) * Math.PI * 2 + Math.PI / 4;
        const r = 1.24 - lvl * 0.17;
        brace.position.set(Math.cos(a) * r, 2 + lvl * 3, Math.sin(a) * r);
        brace.rotation.z = Math.PI / 2;
        brace.rotation.y = -a;
        brace.rotation.x = 0.5;
        g.add(brace);
      }
    }
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.24, 12), metal);
    platform.position.y = 13.1;
    platform.castShadow = true;
    g.add(platform);
    // rotating array
    this.radarHead = new THREE.Group();
    this.radarHead.position.y = 13.9;
    g.add(this.radarHead);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.3, 10), metal);
    pedestal.position.y = 0.2;
    this.radarHead.add(pedestal);
    const arrayPanel = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.3, 0.28),
      new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#79826c', seed: 23, label: 'AN/CR-9' }), roughness: 0.6 }),
    );
    arrayPanel.position.y = 1.7;
    arrayPanel.rotation.x = -0.16;
    arrayPanel.castShadow = true;
    this.radarHead.add(arrayPanel);
    const feedArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.9), metal);
    feedArm.position.set(0, 1.7, 0.9);
    this.radarHead.add(feedArm);
    // status beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }));
    beacon.position.y = 3.2;
    this.radarHead.add(beacon);
    this._animated.push({ obj: beacon, fn: (dt, t) => { beacon.visible = Math.sin(t * 3.2) > 0; } });

    this.cylCollider(g.position.x, g.position.z, 2.1, 13);

    // small equipment hut at tower base
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 2.2), new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#666e59', seed: 31 }), roughness: 0.8 }));
    hut.position.set(g.position.x + 3.4, 1.05, g.position.z + 1.2);
    hut.castShadow = true;
    this.group.add(hut);
    this.boxCollider(hut.position.x, hut.position.z, 2.8, 2.4, 2.2);
    this._radarAz = 0;
  }

  setRadarAzimuth(a) { this._radarAz = a; }

  // -------------------------------------------------------- floodlights --
  _buildFloodlights() {
    const positions = [[-34, 30], [34, -8], [-6, -30], [24, 62]];
    const poleMat = new THREE.MeshStandardMaterial({ map: metalTexture('#666e67', 17), roughness: 0.55, metalness: 0.7 });
    this.floodHeads = [];
    positions.forEach(([x, z], i) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 9.4, 8), poleMat);
      pole.position.set(x, 4.7, z);
      pole.castShadow = true;
      this.group.add(pole);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.14), poleMat);
      bar.position.set(x, 9.1, z);
      bar.lookAt(0, 9.1, 0);
      this.group.add(bar);
      const headMat = new THREE.MeshBasicMaterial({ color: 0x2a2d2a, toneMapped: false });
      for (let hIdx = -1; hIdx <= 1; hIdx += 2) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.34), headMat.clone());
        head.position.copy(bar.position).addScaledVector(new THREE.Vector3().subVectors(new THREE.Vector3(0, 9.1, 0), bar.position).normalize().cross(new THREE.Vector3(0, 1, 0)), hIdx * 0.55);
        head.lookAt(x * 0.2, 0, z * 0.2);
        this.group.add(head);
        this.floodHeads.push(head.material);
      }
      this.cylCollider(x, z, 0.4, 9);
      // two real spotlights near apron only
      if (i < 2) {
        const spot = new THREE.SpotLight(0xd9e6ff, 0, 90, 0.62, 0.5, 1.2);
        spot.position.set(x, 9.2, z);
        spot.target.position.set(x * 0.15, 0, z * 0.15);
        this.group.add(spot, spot.target);
        this._nightItems.push({ spot, intensity: 3200 });
      }
    });

    // red raid beacons on two poles
    this.beacons = [];
    for (const [x, z] of [[-34, 30], [34, -8]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a20, toneMapped: false }));
      b.position.set(x, 9.7, z);
      b.visible = false;
      this.group.add(b);
      const lamp = new THREE.PointLight(0xff3020, 0, 42, 1.6);
      lamp.position.copy(b.position);
      this.group.add(lamp);
      this.beacons.push({ mesh: b, lamp });
    }
  }

  // --------------------------------------------------------------- props --
  _buildProps() {
    const rng = this.rng;
    // ---- trucks
    const truckBody = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#646d57', seed: 41 }), roughness: 0.8 });
    const truckDark = new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const mkTruck = (x, z, yaw, covered) => {
      const t = new THREE.Group();
      t.position.set(x, 0, z);
      t.rotation.y = yaw;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 2.2), truckBody);
      cab.position.set(0, 1.45, 2.6);
      cab.castShadow = true;
      t.add(cab);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.3), truckBody);
      hood.position.set(0, 1.07, 4.3);
      hood.castShadow = true;
      t.add(hood);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.25, metalness: 0.6 });
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.06), winMat);
      win.position.set(0, 1.75, 3.72);
      t.add(win);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 4.6), truckBody);
      bed.position.set(0, 1.1, -0.6);
      bed.castShadow = true;
      t.add(bed);
      if (covered) {
        const cover = new THREE.Mesh(
          new THREE.CylinderGeometry(1.16, 1.16, 4.4, 10, 1, false, 0, Math.PI),
          new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#59614c', seed: 43, rivets: false }), roughness: 1, side: THREE.DoubleSide }),
        );
        cover.rotation.z = Math.PI / 2;
        cover.rotation.y = Math.PI / 2;
        cover.position.set(0, 1.35, -0.6);
        cover.castShadow = true;
        t.add(cover);
      }
      const axles = [[-0.98, 3.9], [0.98, 3.9], [-0.98, 0.6], [0.98, 0.6], [-0.98, -1.6], [0.98, -1.6]];
      for (const [wx, wz] of axles) {
        const w = new THREE.Mesh(wheelGeo, truckDark);
        w.position.set(wx, 0.55, wz);
        t.add(w);
      }
      this.group.add(t);
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      void cosY; void sinY;
      this.boxCollider(x, z, 3.4, 7.4, 2.6);
      return t;
    };
    mkTruck(-14, 42, 0.35, true);
    mkTruck(-22, 48, 0.32, false);
    mkTruck(26, -52, -1.9, true);

    // ---- generators with cables to pads
    const genMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#5b6251', seed: 51, label: 'GEN-30' }), roughness: 0.75 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.65 });
    const mkGenerator = (x, z, padPos) => {
      const gen = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 1.25), genMat);
      gen.position.set(x, 0.75, z);
      gen.castShadow = true;
      this.group.add(gen);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), cableMat);
      pipe.position.set(x + 0.8, 1.85, z);
      this.group.add(pipe);
      this.boxCollider(x, z, 2.5, 1.5, 1.6);
      const mid = new THREE.Vector3((x + padPos.x) / 2, 0.06, (z + padPos.z) / 2);
      mid.x += rng.range(-2, 2); mid.z += rng.range(-2, 2);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.3, z),
        mid,
        new THREE.Vector3(padPos.x, 0.15, padPos.z),
      ]);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.05, 6), cableMat);
      this.group.add(cable);
    };
    mkGenerator(40, -20, this.pads.rampart.pos);
    mkGenerator(47, 26, this.pads.zenith.pos);
    mkGenerator(-28, 74, this.pads.sentinel.pos);
    mkGenerator(-30, -18, new THREE.Vector3(-38, 0, -10)); // shelter power

    // ---- jersey barriers around pads
    const jbShape = new THREE.Shape();
    jbShape.moveTo(-0.32, 0); jbShape.lineTo(0.32, 0); jbShape.lineTo(0.19, 0.42);
    jbShape.lineTo(0.12, 0.86); jbShape.lineTo(-0.12, 0.86); jbShape.lineTo(-0.19, 0.42);
    jbShape.closePath();
    const jbGeo = new THREE.ExtrudeGeometry(jbShape, { depth: 2.0, bevelEnabled: false });
    jbGeo.translate(0, 0, -1.0);
    const jbMat = new THREE.MeshStandardMaterial({ map: concreteTexture([1, 1]), roughness: 0.95 });
    const barrierSpots = [];
    const ringBarriers = (cx, cz, radius, count, a0 = 0, arc = Math.PI * 2) => {
      for (let i = 0; i < count; i++) {
        const a = a0 + (i / count) * arc;
        barrierSpots.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius, -a]);
      }
    };
    ringBarriers(52, -34, 16.5, 10, 0.4, Math.PI * 1.55);
    ringBarriers(60, 38, 17.5, 10, 2.1, Math.PI * 1.55);
    ringBarriers(-16, 84, 21, 12, 1.4, Math.PI * 1.6);
    // gate chicane
    barrierSpots.push([-4, 205, 0.3], [4.5, 193, -0.3], [-4, 181, 0.25]);
    const jbInst = new THREE.InstancedMesh(jbGeo, jbMat, barrierSpots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    barrierSpots.forEach(([x, z, rot], i) => {
      p.set(x, 0.24, z);
      q.setFromEuler(new THREE.Euler(0, rot + Math.PI / 2, 0));
      m.compose(p, q, s);
      jbInst.setMatrixAt(i, m);
      this.boxCollider(x, z, 1.4, 1.4, 1.1);
    });
    jbInst.castShadow = true;
    jbInst.receiveShadow = true;
    this.group.add(jbInst);

    // ---- crates & cases
    const crateMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#5b5648', seed: 61, rivets: false, label: 'ORD-7' }), roughness: 0.9 });
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x2e3b2f, roughness: 0.7, metalness: 0.2 });
    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    const crates = [];
    const stackAt = (cx, cz, n) => {
      for (let i = 0; i < n; i++) {
        crates.push([cx + rng.range(-1.4, 1.4), 0.5 + (i > n * 0.6 ? 1 : 0) * 0.98, cz + rng.range(-1.4, 1.4), rng.range(0, Math.PI), rng.range(0.75, 1.35)]);
      }
      this.cylCollider(cx, cz, 2.0, 1.8);
    };
    stackAt(44, -44, 5);
    stackAt(70, 30, 4);
    stackAt(-26, 92, 6);
    stackAt(-30, -2, 4);
    const crateInst = new THREE.InstancedMesh(crateGeo, crateMat, crates.length);
    crates.forEach(([x, y, z, rot, sc], i) => {
      p.set(x, y * sc, z);
      q.setFromEuler(new THREE.Euler(0, rot, 0));
      s.set(sc, sc, sc * rng.range(0.8, 1.6));
      m.compose(p, q, s);
      crateInst.setMatrixAt(i, m);
    });
    crateInst.castShadow = true;
    this.group.add(crateInst);
    // long equipment cases
    for (const [x, z, yaw] of [[36, -42, 0.4], [-22, 88, 1.2]]) {
      const cs = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.8), caseMat);
      cs.position.set(x, 0.28, z);
      cs.rotation.y = yaw;
      cs.castShadow = true;
      this.group.add(cs);
    }

    // ---- antenna farm
    const antMat = new THREE.MeshStandardMaterial({ map: metalTexture('#7a827b', 19), roughness: 0.5, metalness: 0.8 });
    const antGroup = new THREE.Group();
    antGroup.position.set(-70, 0, -34);
    this.group.add(antGroup);
    for (let i = 0; i < 3; i++) {
      const h = 7 + i * 2.6;
      const mastX = (i - 1) * 6.5, mastZ = (i % 2) * 4;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, h, 6), antMat);
      mast.position.set(mastX, h / 2, mastZ);
      mast.castShadow = true;
      antGroup.add(mast);
      const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 2.4, 4), antMat);
      whip.position.set(mastX, h + 1.2, mastZ);
      antGroup.add(whip);
      // guy wires
      const wireMat = new THREE.LineBasicMaterial({ color: 0x30343a, transparent: true, opacity: 0.8 });
      for (let w = 0; w < 3; w++) {
        const a = (w / 3) * Math.PI * 2 + i;
        const pts = [
          new THREE.Vector3(mastX, h * 0.85, mastZ),
          new THREE.Vector3(mastX + Math.cos(a) * h * 0.55, 0, mastZ + Math.sin(a) * h * 0.55),
        ];
        antGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      }
      this.cylCollider(antGroup.position.x + mastX, antGroup.position.z + mastZ, 0.35, h);
    }

    // ---- HESCO-style bastion wall near sentinel pad
    const hescoMat = new THREE.MeshStandardMaterial({ map: sandTexture([1, 1]), color: 0xa9997a, roughness: 1 });
    const hescoGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    // protective arc north of the sentinel pad
    const hescos = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.5;
      hescos.push([-16 + Math.cos(a) * 25, 84 + Math.sin(a) * 25]);
    }
    const hescoInst = new THREE.InstancedMesh(hescoGeo, hescoMat, hescos.length * 2);
    hescos.forEach(([x, z], i) => {
      p.set(x, 0.7, z);
      q.setFromEuler(new THREE.Euler(0, rng.range(0, 0.3), 0));
      m.compose(p, q, s.set(1, 1, 1));
      hescoInst.setMatrixAt(i * 2, m);
      p.set(x + rng.range(-0.1, 0.1), 2.06, z);
      m.compose(p, q, s.set(0.94, 0.94, 0.94));
      hescoInst.setMatrixAt(i * 2 + 1, m);
      this.boxCollider(x, z, 1.6, 1.6, 2.8);
    });
    hescoInst.castShadow = true;
    hescoInst.receiveShadow = true;
    this.group.add(hescoInst);

    // camo net over crates near rampart
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7, 6, 6),
      new THREE.MeshStandardMaterial({ map: camoNetTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }),
    );
    const netPos = net.geometry.attributes.position;
    for (let i = 0; i < netPos.count; i++) {
      netPos.setZ(i, fbm2(netPos.getX(i) * 0.5, netPos.getY(i) * 0.5, 2) * 1.1);
    }
    net.geometry.computeVertexNormals();
    net.rotation.x = -Math.PI / 2;
    net.position.set(44, 2.2, -44);
    net.castShadow = true;
    this.group.add(net);

    // ---- windsock
    const wsPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 6.4, 6), antMat);
    wsPole.position.set(-38, 3.2, 34);
    this.group.add(wsPole);
    const sockTex = stencilTexture('', { w: 64, h: 16, bg: '#e06a28' });
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 1.9, 8, 1, true),
      new THREE.MeshStandardMaterial({ map: sockTex, color: 0xe06a28, side: THREE.DoubleSide, roughness: 1 }),
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(-38 + 0.95, 6.1, 34);
    this.group.add(sock);
    this.windsock = sock;
    this.cylCollider(-38, 34, 0.3, 6);
  }

  // --------------------------------------------------------------- signs --
  _buildSigns() {
    const mkSign = (text, x, z, yaw, w = 2.6, h = 0.8, bg = '#8a2e26') => {
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: stencilTexture(text, { w: 512, h: 128, size: 44, color: '#f0ead8', bg }) }),
      );
      board.position.set(x, 1.35, z);
      board.rotation.y = yaw;
      this.group.add(board);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x4c524b, roughness: 0.7 }),
      );
      post.position.set(x, 0.65, z);
      this.group.add(post);
    };
    mkSign('DANGER — LAUNCH AREA', 38, -22, 2.4);
    mkSign('DANGER — LAUNCH AREA', 46, 24, 2.9);
    mkSign('SENTINEL TEST PAD — KEEP OUT', -2, 70, -2.9, 3.2);
    mkSign('TOC — AUTHORIZED ONLY', -32, -3, 1.72, 2.6, 0.8, '#31402f');
    mkSign('EAR PROTECTION REQUIRED', 6, 44, 3.14, 2.8, 0.7, '#7a6a24');

    // hazard stripe aprons around battery pads
    const stripes = hazardStripesTexture([14, 1]);
    for (const key of Object.keys(this.pads)) {
      const pd = this.pads[key];
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(11.4, 12.4, 48),
        new THREE.MeshBasicMaterial({ map: stripes, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pd.pos.x, 0.27, pd.pos.z);
      this.group.add(ring);
    }
  }

  _setNight(night) {
    for (const item of this._nightItems) {
      if (item.spot) item.spot.intensity = night ? item.intensity : 0;
      if (item.mat) item.mat.color.set(night ? item.on : item.off);
    }
    for (const mat of this.floodHeads) mat.color.set(night ? 0xfff2d0 : 0x2a2d2a);
  }

  _setRaid(on) {
    for (const b of this.beacons) {
      b.mesh.visible = on;
      b.lamp.intensity = on ? 60 : 0;
    }
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    this.radarHead.rotation.y = this._radarAz;
    for (const a of this._animated) a.fn(dt, t);
    for (let i = 0; i < this.beacons.length; i++) {
      const b = this.beacons[i];
      if (b.mesh.visible) {
        const v = 0.5 + 0.5 * Math.sin(t * 6 + i * 2.4);
        b.lamp.intensity = 25 + 70 * v;
        b.mesh.material.color.setRGB(1, 0.12 + 0.1 * v, 0.08);
      }
    }
    if (this.windsock) {
      const w = 0.6 + 0.25 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 2.3);
      this.windsock.rotation.z = Math.PI / 2 - w * 0.5;
      this.windsock.rotation.y = WORLD.windHeading + Math.PI / 2 + Math.sin(t * 0.5) * 0.12;
    }
  }
}

function scrubTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#6d6852';
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = 0.5 + Math.random() * 0.5;
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    g.moveTo(32, 64);
    const x = 8 + Math.random() * 48;
    g.quadraticCurveTo(32 + (x - 32) * 0.3, 40, x, Math.random() * 30);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
