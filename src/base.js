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
    this._buildGroundDetail();
    this._buildFence();
    this._buildShelter();
    this._buildRadarTower();
    this._buildFloodlights();
    this._buildProps();
    this._buildBerms();
    this._buildPropClusters();
    this._buildVehiclesExtra();
    this._buildLightTowers();
    this._buildPerimeterExtras();
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
    const rimHaze = new THREE.Color(0x6e675c);
    for (let i = 0; i <= rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const r = radii[i];
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = terrainHeight(x, z);
        verts.push(x, h, z);
        uvs.push(x / 26, z / 26);
        // color by height + noise patchiness. Three octaves of vertex mottle:
        // texture mips flatten past a few hundred metres, so geometry-based
        // variation is what keeps mid/far dirt from reading as flat paint.
        const patch = fbm2(x * 0.0012 + 9, z * 0.0012, 3) * 0.5 + 0.5;
        c.copy(sand).lerp(sandLight, patch * 0.85);
        const mid = fbm2(x * 0.003 + 31, z * 0.003, 2);
        const mottle = fbm2(x * 0.017 + 3.7, z * 0.017, 2);
        c.multiplyScalar(1 + mid * 0.16 + mottle * 0.12);
        if (h > 40) c.lerp(rock, smoothstep(40, 320, h));
        if (h > 600) c.lerp(rockHigh, smoothstep(600, 1500, h));
        // mute the far rim (beyond the mountain ring) so low sunlit sand does
        // not read as a pale halo strip above the mountain silhouettes
        const rim = smoothstep(10800, 14200, r);
        if (rim > 0) c.lerp(rimHaze, rim * 0.9);
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
    // Multi-scale albedo: macro luminance mottle (breaks up mid/far flatness)
    // plus a near-field detail octave that fades out past ~90 m.
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTerrWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTerrWorld;')
        .replace('#include <map_fragment>', /* glsl */`
          vec4 sandA = texture2D( map, vMapUv );
          // zero-centered luminance deltas (linear-space mean of the sand map ~0.26)
          float macro = dot(texture2D( map, vMapUv * 0.061 + vec2(0.37, 0.19) ).rgb, vec3(0.3333)) - 0.26;
          float dCam = distance(vTerrWorld, cameraPosition);
          float nearK = 1.0 - smoothstep(18.0, 95.0, dCam);
          float det = dot(texture2D( map, vMapUv * 4.7 + vec2(0.13, 0.53) ).rgb, vec3(0.3333)) - 0.26;
          vec3 sandMix = sandA.rgb * clamp(1.0 + macro * 2.1 + det * nearK * 1.5, 0.55, 1.55);
          diffuseColor *= vec4(sandMix, sandA.a);
        `);
    };
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.group.add(terrain);

    // natural grouping helpers: vegetation/rock patches + dry washes
    const rng = this.rng;
    const clusters = [];
    for (let i = 0; i < 14; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = 300 + 2600 * Math.pow(rng.next(), 1.5);
      clusters.push([Math.cos(a) * r, Math.sin(a) * r, rng.range(24, 85)]);
    }
    const washes = [];
    for (let w = 0; w < 5; w++) {
      let a = rng.range(0, Math.PI * 2), r = rng.range(280, 470);
      const pts = [];
      for (let sIdx = 0; sIdx < 9; sIdx++) {
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        r += rng.range(130, 240);
        a += rng.range(-0.16, 0.16);
      }
      washes.push(pts);
    }
    const pickSpot = (out, washLateral) => {
      const roll = rng.next();
      if (roll < 0.42) {          // clustered patch
        const cl = rng.pick(clusters);
        const rr = Math.abs(rng.gauss(0, cl[2] * 0.55));
        const aa = rng.range(0, Math.PI * 2);
        out[0] = cl[0] + Math.cos(aa) * rr;
        out[1] = cl[1] + Math.sin(aa) * rr;
      } else if (roll < 0.76) {   // along a dry wash
        const wash = rng.pick(washes);
        const f = rng.range(0, wash.length - 1.001);
        const i0 = Math.floor(f), t = f - i0;
        const x = wash[i0][0] + (wash[i0 + 1][0] - wash[i0][0]) * t;
        const z = wash[i0][1] + (wash[i0 + 1][1] - wash[i0][1]) * t;
        const lat = rng.sign() * (washLateral[0] + Math.abs(rng.gauss(0, washLateral[1])));
        const la = Math.atan2(wash[i0 + 1][1] - wash[i0][1], wash[i0 + 1][0] - wash[i0][0]) + Math.PI / 2;
        out[0] = x + Math.cos(la) * lat;
        out[1] = z + Math.sin(la) * lat;
      } else {                    // sparse loners
        const aa = rng.range(0, Math.PI * 2);
        const rr = rng.range(255, 4200);
        out[0] = Math.cos(aa) * rr;
        out[1] = Math.sin(aa) * rr;
      }
      const rOut = Math.hypot(out[0], out[1]);
      if (rOut < 250) {           // never inside the base perimeter
        const k = rng.range(260, 340) / Math.max(rOut, 1);
        out[0] *= k; out[1] *= k;
      }
    };

    // scattered rocks + scrub outside the base
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d6055, roughness: 1 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 240);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const e = new THREE.Euler();
    const spot = [0, 0];
    for (let i = 0; i < 240; i++) {
      pickSpot(spot, [8, 14]);
      p.set(spot[0], 0, spot[1]);
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

    // larger rock outcrops mid-distance — partially buried slabs in groups
    const outcropGeo = new THREE.DodecahedronGeometry(1, 0);
    const outcropMat = new THREE.MeshStandardMaterial({ color: 0x655849, roughness: 0.98 });
    const outcrops = new THREE.InstancedMesh(outcropGeo, outcropMat, 30);
    let oi = 0;
    for (let g = 0; g < 9 && oi < 30; g++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(380, 1900);
      const gx = Math.cos(a) * r, gz = Math.sin(a) * r;
      const n = rng.int(2, 4);
      for (let k = 0; k < n && oi < 30; k++) {
        p.set(gx + rng.range(-16, 16), 0, gz + rng.range(-16, 16));
        const sc = rng.range(4.5, 13);
        p.y = terrainHeight(p.x, p.z) - sc * rng.range(0.25, 0.45);
        e.set(rng.range(-0.25, 0.25), rng.range(0, Math.PI * 2), rng.range(-0.25, 0.25));
        q.setFromEuler(e);
        s.set(sc * rng.range(0.8, 1.5), sc * rng.range(0.55, 0.95), sc * rng.range(0.8, 1.5));
        m.compose(p, q, s);
        outcrops.setMatrixAt(oi++, m);
      }
    }
    outcrops.count = oi;
    outcrops.castShadow = true;
    this.group.add(outcrops);

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
      pickSpot(spot, [4, 9]);
      p.set(spot[0], 0, spot[1]);
      p.y = terrainHeight(p.x, p.z);
      e.set(0, this.rng.range(0, Math.PI * 2), 0);
      q.setFromEuler(e);
      s.setScalar(this.rng.range(0.5, 1.7));
      m.compose(p, q, s);
      scrub.setMatrixAt(i, m);
    }
    this.group.add(scrub);

    // disturbed-ground patches on the dirt inside the perimeter (graded but
    // not uniform: darker compacted areas, blade marks, dust splays)
    const patchGeo = new THREE.PlaneGeometry(1, 1);
    patchGeo.rotateX(-Math.PI / 2);
    const patchMat = new THREE.MeshBasicMaterial({
      map: stainTexture(), transparent: true, opacity: 0.42, depthWrite: false,
      color: 0x5d5140, polygonOffset: true, polygonOffsetFactor: -1,
    });
    const patches = new THREE.InstancedMesh(patchGeo, patchMat, 54);
    for (let i = 0; i < 54; i++) {
      const aa = rng.range(0, Math.PI * 2);
      const rr = 55 + 175 * Math.pow(rng.next(), 0.8);
      p.set(Math.cos(aa) * rr, 0.045, Math.sin(aa) * rr);
      q.setFromEuler(e.set(0, rng.range(0, Math.PI * 2), 0));
      const sc = rng.range(7, 24);
      s.set(sc, 1, sc * rng.range(0.5, 1));
      m.compose(p, q, s);
      patches.setMatrixAt(i, m);
    }
    this.group.add(patches);
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

    // ring + service loop connecting the pads, the north motor-pool area and
    // the west gate — merged into a single mesh (one draw call)
    const loopSegs = [
      [54, -23, 66, 2],     // rampart pad → east
      [66, 2, 60, 30],      // east → zenith junction
      [56, 50, 34, 70],     // zenith south exit
      [34, 70, 4, 80],      // → sentinel pad east edge
      [12, -37, 12, -58],   // apron north exit
      [12, -58, -26, -52],  // → motor pool frontage
      [-26, -52, -52, -30], // → west camp
      [-52, -30, -54, -6],  // camp edge
      [-54, -6, -48, 0],    // join west service road
      [12, -58, 36, -52],   // spur to storage / camo net yard
      [-70, 0, -226, 0],    // long west spur to gate 2
    ];
    const loopParts = [];
    for (const [x1, z1, x2, z2] of loopSegs) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const g = new THREE.PlaneGeometry(6, len, 1, Math.max(1, Math.round(len / 18)));
      g.rotateX(-Math.PI / 2);
      g.rotateY(Math.atan2(x2 - x1, z2 - z1));
      g.translate((x1 + x2) / 2, 0.07, (z1 + z2) / 2);
      loopParts.push(g);
    }
    const loop = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(loopParts), roadMat);
    loop.receiveShadow = true;
    this.group.add(loop);

    // center line on gate road
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 180),
      new THREE.MeshBasicMaterial({ color: 0xcfc8a8, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.1, 140);
    this.group.add(line);
  }

  // -------------------------------------------------- ground detail pass --
  // motor pool / fuel point hardstands, tire wear decals, weathering stains,
  // painted lane markings and pad identification stencils
  _buildGroundDetail() {
    const rng = this.rng;

    // motor pool hardstand (north-west of the apron, along the service loop)
    const motorPad = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 16),
      new THREE.MeshStandardMaterial({ map: asphaltTexture([3, 2]), roughness: 0.96 }),
    );
    motorPad.rotation.x = -Math.PI / 2;
    motorPad.position.set(-8, 0.055, -63);
    motorPad.receiveShadow = true;
    this.group.add(motorPad);

    // fuel point hardstand (south-east, off the ring road)
    const fuelPad = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 11),
      new THREE.MeshStandardMaterial({ map: concreteTexture([2, 2]), roughness: 0.94 }),
    );
    fuelPad.rotation.x = -Math.PI / 2;
    fuelPad.position.set(30, 0.055, 52);
    fuelPad.receiveShadow = true;
    this.group.add(fuelPad);

    // ---- tire track decals on roads, junctions and the apron
    const trackMat = new THREE.MeshBasicMaterial({
      map: tireTracksTexture(), transparent: true, opacity: 0.58, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    const trackGeo = new THREE.PlaneGeometry(3.4, 15);
    trackGeo.rotateX(-Math.PI / 2);
    const trackSpots = [
      [0, 118, 0.03, 0.11], [0, 164, -0.02, 0.11], [0, 74, 0.09, 0.11], [0, 46, -0.3, 0.11],
      [18, 12, 0.42, 0.27], [-8, 24, -1.24, 0.27], [30, -8, 1.6, 0.27], [-20, -14, 1.1, 0.27],
      [46, -10, -0.42, 0.11], [50, 16, -0.6, 0.11], [12, -46, 0.02, 0.11], [-8, -54, 1.62, 0.11],
      [-2, 66, -1.05, 0.11], [42, 62, 0.85, 0.11], [-56, 0, 1.55, 0.11], [-120, 0, 1.58, 0.11],
    ];
    const tracks = new THREE.InstancedMesh(trackGeo, trackMat, trackSpots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    trackSpots.forEach(([x, z, rot, y], i) => {
      p.set(x, y, z);
      q.setFromEuler(new THREE.Euler(0, rot, 0));
      s.set(rng.range(0.8, 1.1), 1, rng.range(0.85, 1.25));
      m.compose(p, q, s);
      tracks.setMatrixAt(i, m);
    });
    this.group.add(tracks);

    // ---- weathering patches on the apron + pads (dark oil/rubber stains)
    const stainMat = new THREE.MeshBasicMaterial({
      map: stainTexture(), transparent: true, opacity: 0.62, depthWrite: false,
      color: 0x3f3a31, polygonOffset: true, polygonOffsetFactor: -1.5,
    });
    const stainGeo = new THREE.PlaneGeometry(1, 1);
    stainGeo.rotateX(-Math.PI / 2);
    const stainSpots = [];
    for (let i = 0; i < 22; i++) stainSpots.push([rng.range(-38, 38), rng.range(-33, 33), 0.262]);
    for (let i = 0; i < 3; i++) stainSpots.push([52 + rng.range(-8, 8), -34 + rng.range(-8, 8), 0.272]);
    for (let i = 0; i < 3; i++) stainSpots.push([60 + rng.range(-8, 8), 38 + rng.range(-8, 8), 0.272]);
    for (let i = 0; i < 3; i++) stainSpots.push([-16 + rng.range(-10, 10), 84 + rng.range(-10, 10), 0.272]);
    for (let i = 0; i < 5; i++) stainSpots.push([-8 + rng.range(-11, 11), -63 + rng.range(-6, 6), 0.075]);
    for (let i = 0; i < 4; i++) stainSpots.push([30 + rng.range(-5, 5), 52 + rng.range(-4, 4), 0.075]);
    const stains = new THREE.InstancedMesh(stainGeo, stainMat, stainSpots.length);
    stainSpots.forEach(([x, z, y], i) => {
      p.set(x, y, z);
      q.setFromEuler(new THREE.Euler(0, rng.range(0, Math.PI * 2), 0));
      const sc = rng.range(2.2, 7.5);
      s.set(sc, 1, sc * rng.range(0.6, 1));
      m.compose(p, q, s);
      stains.setMatrixAt(i, m);
    });
    this.group.add(stains);

    // ---- painted lane markings (merged strips, one draw call)
    const paint = [];
    const strip = (x, z, w, l, y = 0.262, rot = 0) => {
      const g = new THREE.PlaneGeometry(w, l);
      g.rotateX(-Math.PI / 2);
      if (rot) g.rotateY(rot);
      g.translate(x, y, z);
      paint.push(g);
    };
    // apron perimeter line
    strip(0, -34.5, 79, 0.35); strip(0, 34.5, 79, 0.35);
    strip(-39.5, 0, 0.35, 69); strip(39.5, 0, 0.35, 69);
    // apron lead-in dashes from the gate road
    for (let i = 0; i < 5; i++) strip(0, 30 - i * 5.4, 0.35, 3.0);
    // motor pool parking bays
    for (let i = 0; i < 7; i++) strip(-20 + i * 4, -64, 0.28, 11, 0.075);
    strip(-8, -58.6, 24.28, 0.28, 0.075);
    // fuel point border
    strip(30, 47.4, 12, 0.3, 0.075); strip(30, 56.6, 12, 0.3, 0.075);
    strip(24.2, 52, 0.3, 9.5, 0.075); strip(35.8, 52, 0.3, 9.5, 0.075);
    const paintMesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(paint),
      new THREE.MeshBasicMaterial({ color: 0xcdc6a6, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    this.group.add(paintMesh);

    // ---- pad identification stencils near each pad road entry (one atlas)
    const labels = ['PAD R', 'PAD Z', 'PAD S'];
    const atlas = padLabelAtlas(labels);
    const labelParts = [];
    const labelSpots = [
      // rotated so the text reads upright for a driver arriving on the road
      [52, -22.5, 0.28, -0.43],  // rampart entry
      [59, 28.5, 0.28, -2.51],   // zenith entry
      [-12.5, 70, 0.28, 2.09],   // sentinel entry
    ];
    labelSpots.forEach(([x, z, y, rot], i) => {
      const g = new THREE.PlaneGeometry(5.4, 1.7);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, (uv.getY(k) + (labels.length - 1 - i)) / labels.length);
      g.rotateX(-Math.PI / 2);
      g.rotateY(rot);
      g.translate(x, y, z);
      labelParts.push(g);
    });
    const labelMesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(labelParts),
      new THREE.MeshBasicMaterial({ map: atlas, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    this.group.add(labelMesh);

    // big apron stencil, readable when walking in from the gate
    const apronStencil = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 2.7),
      new THREE.MeshBasicMaterial({
        map: stencilTexture('CASTELLAN RIDGE', { w: 1024, h: 144, size: 92, color: 'rgba(215,209,186,0.78)' }),
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
      }),
    );
    apronStencil.rotation.x = -Math.PI / 2;
    apronStencil.position.set(6, 0.265, 27);
    this.group.add(apronStencil);
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
        this._nightItems.push({ spot, intensity: 1050 });
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
    mkGenerator(43, -22, this.pads.rampart.pos);
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
    // occasional barriers along road edges (gate road, service loop, west spur)
    barrierSpots.push(
      [5, 120, 0.06], [-5, 152, -0.08], [5, 96, 0.12], [4, 140, -0.05],
      [8, -44, 0.05], [16, -52, -1.5], [-20, -56.5, 1.62], [-40, -46, 0.8],
      [30, 66, 2.15], [50, 58, -1.05], [69, 14, 1.5], [65, -16, 1.35],
      [-100, -4, 1.55], [-146, 4, 1.62], [-192, -4, 1.58],
      [-222, -3, 1.6], [-223, 3.4, 1.52],
    );
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

    // camo net canopies — smooth tent-like drape on corner poles (replaces the
    // old crumpled-looking noise plane). One over the rampart crate yard, one
    // over the fuel point drums.
    const NET_HALF = 4.75;
    const drape = (x, y) => {
      const rr = Math.hypot(x, y);
      // dome over the stored goods, sagging toward the pole line
      let h = 1.34 + 1.02 * (1 - smoothstep(1.5, NET_HALF, rr));
      h += fbm2(x * 0.5 + 7, y * 0.5 + 3, 2) * 0.14;
      // scalloped droop along the free edges between poles
      const edge = smoothstep(NET_HALF - 0.9, NET_HALF, Math.max(Math.abs(x), Math.abs(y)));
      h -= edge * 0.3 * (0.35 + 0.65 * Math.abs(Math.sin(x * 1.35 + y * 1.7)));
      return h;
    };
    const netGeo = new THREE.PlaneGeometry(NET_HALF * 2, NET_HALF * 2, 16, 16);
    const netPos = netGeo.attributes.position;
    for (let i = 0; i < netPos.count; i++) {
      netPos.setZ(i, drape(netPos.getX(i), netPos.getY(i)));
    }
    netGeo.computeVertexNormals();
    const netTex = camoNetTexture();
    const netMat = new THREE.MeshStandardMaterial({
      map: netTex, transparent: true, alphaTest: 0.34, side: THREE.DoubleSide, roughness: 1,
    });
    const netSites = [[44, -44, 0.35], [30, 52, -0.85]];
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 6);
    poleGeo.translate(0, 0.5, 0);
    const poleMatN = new THREE.MeshStandardMaterial({ map: metalTexture('#4c5148', 27), roughness: 0.6, metalness: 0.5 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMatN, netSites.length * 4);
    let pi = 0;
    for (const [nx, nz, nyaw] of netSites) {
      const net = new THREE.Mesh(netGeo, netMat);
      net.rotation.order = 'YXZ';
      net.rotation.y = nyaw;
      net.rotation.x = -Math.PI / 2;
      net.position.set(nx, 0, nz);
      net.castShadow = true;
      this.group.add(net);
      const cs = Math.cos(nyaw), sn = Math.sin(nyaw);
      const corners = [[-NET_HALF, -NET_HALF], [NET_HALF, -NET_HALF], [-NET_HALF, NET_HALF], [NET_HALF, NET_HALF]];
      for (const [cx, cy] of corners) {
        // plane local (x, y) maps to offset (x, -y) in XZ, then yaw rotates it
        const lx = cx, lz = -cy;
        p.set(nx + lx * cs + lz * sn, 0, nz - lx * sn + lz * cs);
        q.identity();
        s.set(1, Math.max(0.7, drape(cx, cy) - 0.05), 1);
        m.compose(p, q, s);
        poles.setMatrixAt(pi++, m);
      }
    }
    this.group.add(poles);

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

  // ---------------------------------------------------- revetment berms --
  // low dirt embankments wrapped around the battery pads (outside the hazard
  // rings and jersey barriers), plus a small berm around the fuel point.
  _buildBerms() {
    const parts = [];
    const bermDefs = [
      // [cx, cz, R, a0, arc, tube]
      [52, -34, 21, 2.2, Math.PI * 2 - 1.55, 2.6],   // rampart — opening SSE toward roads
      [60, 38, 22, 2.4, 1.8, 2.6],                    // zenith west arc
      [60, 38, 22, 5.1, 2.38, 2.6],                   // zenith east arc (gaps N + S for roads)
      [-16, 84, 26.5, 0.35, 2.8, 2.8],                // sentinel — north stays with the HESCOs
      [30, 52, 8, 1.7, Math.PI * 2 - 1.4, 1.5],       // fuel point bund
    ];
    for (const [cx, cz, R, a0, arc, tube] of bermDefs) {
      const g = new THREE.TorusGeometry(R, tube, 7, Math.max(14, Math.round((arc * R) / 5)), arc);
      // tile the sand texture along the arc instead of stretching it once
      const uv = g.attributes.uv;
      const uRep = Math.max(2, Math.round((arc * R) / 7));
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * uRep, uv.getY(k) * 2);
      g.rotateX(-Math.PI / 2);
      g.scale(1, 0.5, 1);
      g.rotateY(-(a0 + arc));
      g.translate(cx, 0, cz);
      parts.push(g);
      // colliders along the crest
      const n = Math.max(4, Math.round((arc * R) / 4));
      for (let k = 0; k < n; k++) {
        const az = a0 + ((k + 0.5) / n) * arc;
        this.cylCollider(cx + Math.cos(az) * R, cz + Math.sin(az) * R, tube * 0.9, 1.6);
      }
    }
    const berm = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(parts),
      new THREE.MeshStandardMaterial({ map: sandTexture([1, 1]), color: 0x8d7c5f, roughness: 1 }),
    );
    berm.castShadow = true;
    berm.receiveShadow = true;
    this.group.add(berm);
  }

  // ------------------------------------------------------ prop clusters --
  // fuel drums, pallet stacks, cable reels, quonset tents and T-wall blast
  // panels — all instanced/merged.
  _buildPropClusters() {
    const rng = this.rng;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const e = new THREE.Euler();

    // ---- fuel drums
    const drumGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.92, 10);
    const drumMat = new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: 0.72, metalness: 0.28 });
    const drums = [];
    const drumRow = (cx, cz, n, dx, dz) => {
      for (let i = 0; i < n; i++) drums.push([cx + dx * i + rng.range(-0.05, 0.05), 0.46, cz + dz * i + rng.range(-0.05, 0.05), 0]);
    };
    drumRow(28.9, 50.9, 4, 0.72, 0.06);       // fuel point rows
    drumRow(29.1, 51.75, 4, 0.72, -0.04);
    drums.push([29.6, 1.38, 51.3, 0], [30.4, 1.38, 51.35, 0]);   // second layer
    for (let i = 0; i < 3; i++) drums.push([32.6 + i * 0.75, 0.32, 54.3 + rng.range(-0.2, 0.2), 1]); // tipped
    drumRow(-19.2, -67.2, 4, 0.72, 0.08);      // motor pool corner
    drumRow(45.2, -18.6, 3, 0.7, 0.2);         // rampart generator
    drumRow(-63.3, -11.2, 4, 0.7, -0.12);      // camp
    drumRow(49.6, 26.6, 4, 0.68, 0.3);         // zenith pad edge
    const drumInst = new THREE.InstancedMesh(drumGeo, drumMat, drums.length);
    drums.forEach(([x, y, z, tipped], i) => {
      p.set(x, y, z);
      if (tipped) e.set(Math.PI / 2, 0, rng.range(0, Math.PI * 2));
      else e.set(0, rng.range(0, Math.PI * 2), 0);
      q.setFromEuler(e);
      m.compose(p, q, s.set(1, 1, 1));
      drumInst.setMatrixAt(i, m);
    });
    drumInst.castShadow = true;
    this.group.add(drumInst);
    this.cylCollider(30, 51.3, 2.4, 1.9);
    this.cylCollider(33.3, 54.3, 1.3, 0.7);
    this.cylCollider(-18.2, -67.2, 1.7, 1.1);
    this.cylCollider(45.9, -18.4, 1.4, 1.1);
    this.cylCollider(-62.3, -11.3, 1.6, 1.1);
    this.cylCollider(50.6, 27.1, 1.5, 1.1);

    // ---- pallet stacks
    const palletGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(1.25, 0.1, 1.05).translate(0, 0.21, 0),
      new THREE.BoxGeometry(1.25, 0.1, 0.17).translate(0, 0.08, -0.42),
      new THREE.BoxGeometry(1.25, 0.1, 0.17).translate(0, 0.08, 0),
      new THREE.BoxGeometry(1.25, 0.1, 0.17).translate(0, 0.08, 0.42),
    ]);
    const palletMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#7a6b4e', seed: 83, rivets: false }), roughness: 1 });
    const pallets = [
      [46.2, -39.6, 1], [44.9, -38.4, 2], [3.2, -67.4, 3], [1.6, -66.8, 1],
      [26.6, 55.4, 2], [-31.2, 8.4, 1], [-30.1, 9.6, 3], [-23.4, 88.6, 2], [67.8, 25.6, 1],
    ];
    const palletInst = new THREE.InstancedMesh(palletGeo, palletMat, pallets.length);
    pallets.forEach(([x, z, stack], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, rng.range(0, Math.PI), 0));
      m.compose(p, q, s.set(1, stack, 1));
      palletInst.setMatrixAt(i, m);
    });
    this.group.add(palletInst);
    this.cylCollider(2.6, -67.1, 1.6, 0.9);
    this.cylCollider(-30.6, 9, 1.6, 0.9);

    // ---- cable reels
    const reelDisc = new THREE.CylinderGeometry(0.82, 0.82, 0.09, 14);
    const reelGeo = BufferGeometryUtils.mergeGeometries([
      reelDisc.clone().rotateZ(Math.PI / 2).translate(-0.36, 0, 0),
      reelDisc.clone().rotateZ(Math.PI / 2).translate(0.36, 0, 0),
      new THREE.CylinderGeometry(0.44, 0.44, 0.64, 10).rotateZ(Math.PI / 2),
    ]);
    const reelMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#6b5f45', seed: 87, rivets: false }), roughness: 0.9 });
    const reels = [
      [-64.2, -27.6, 0.4, 0],   // antenna farm, upright
      [-66.1, -23.8, 1.1, 1],   // flat on the ground
      [-27.2, -15.2, 2.2, 0],
      [44.6, 28.4, 0.9, 0],
      [25.8, 48.6, -0.6, 0],
      [-30.8, 76.8, 0.2, 1],
    ];
    const reelInst = new THREE.InstancedMesh(reelGeo, reelMat, reels.length);
    reels.forEach(([x, z, yaw, flat], i) => {
      if (flat) {
        p.set(x, 0.45, z);
        q.setFromEuler(e.set(0, yaw, Math.PI / 2));
      } else {
        p.set(x, 0.82, z);
        q.setFromEuler(e.set(0, yaw, 0));
      }
      m.compose(p, q, s.set(1, 1, 1));
      reelInst.setMatrixAt(i, m);
      this.cylCollider(x, z, 0.9, 1.4);
    });
    reelInst.castShadow = true;
    this.group.add(reelInst);

    // ---- quonset tents (west camp)
    const tentShell = new THREE.CylinderGeometry(2.35, 2.35, 5.6, 12, 1, true, 0, Math.PI);
    tentShell.rotateZ(Math.PI / 2);
    const tentGeo = BufferGeometryUtils.mergeGeometries([
      tentShell,
      new THREE.CircleGeometry(2.35, 12, 0, Math.PI).rotateY(Math.PI / 2).translate(2.8, 0, 0),
      new THREE.CircleGeometry(2.35, 12, 0, Math.PI).rotateY(-Math.PI / 2).translate(-2.8, 0, 0),
    ]);
    const tentMat = new THREE.MeshStandardMaterial({
      map: panelTexture({ base: '#5f6350', seed: 71, rivets: false }), roughness: 1, side: THREE.DoubleSide,
    });
    const tents = [[-62, -13, 0.08], [-64, -21, -0.1], [-59, -27, 1.48]];
    const tentInst = new THREE.InstancedMesh(tentGeo, tentMat, tents.length);
    tents.forEach(([x, z, yaw], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, yaw, 0));
      m.compose(p, q, s.set(1, 1, 1));
      tentInst.setMatrixAt(i, m);
      const along = Math.abs(Math.sin(yaw)) > 0.7;
      this.boxCollider(x, z, along ? 5 : 6.2, along ? 6.2 : 5, 2.4);
    });
    tentInst.castShadow = true;
    tentInst.receiveShadow = true;
    this.group.add(tentInst);
    // sandbag positions guarding the camp + motor pool
    this._sandbagWall(this.group, -58, -8, 4, 2, 0.35);
    this.boxCollider(-58, -8, 3, 1, 1);
    this._sandbagWall(this.group, 7, -51, 5, 3, 0.35);
    this.boxCollider(7, -51, 3.6, 1, 1.2);

    // ---- T-wall blast panels shielding the command shelter + motor pool
    const twShape = new THREE.Shape();
    twShape.moveTo(-0.52, 0); twShape.lineTo(0.52, 0); twShape.lineTo(0.52, 0.22);
    twShape.lineTo(0.15, 0.5); twShape.lineTo(0.13, 2.55); twShape.lineTo(0.3, 2.7);
    twShape.lineTo(0.3, 2.92); twShape.lineTo(-0.3, 2.92); twShape.lineTo(-0.3, 2.7);
    twShape.lineTo(-0.13, 2.55); twShape.lineTo(-0.15, 0.5); twShape.lineTo(-0.52, 0.22);
    twShape.closePath();
    const twGeo = new THREE.ExtrudeGeometry(twShape, { depth: 1.75, bevelEnabled: false });
    twGeo.translate(0, 0, -0.875);
    const twMat = new THREE.MeshStandardMaterial({ map: concreteTexture([1, 1]), roughness: 0.95 });
    const twSpots = [];
    for (let i = 0; i < 6; i++) twSpots.push([-43.5, -14.6 + i * 1.72, 0]);           // west of shelter
    for (let i = 0; i < 7; i++) twSpots.push([-43.6 + i * 1.72, -17.5, Math.PI / 2]); // north of shelter
    for (let i = 0; i < 3; i++) twSpots.push([-22.6, -60.4 - i * 1.72, 0]);           // motor pool west edge
    const twInst = new THREE.InstancedMesh(twGeo, twMat, twSpots.length);
    twSpots.forEach(([x, z, yaw], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, yaw + rng.range(-0.02, 0.02), 0));
      m.compose(p, q, s.set(1, 1, 1));
      twInst.setMatrixAt(i, m);
      const along = Math.abs(Math.sin(yaw)) > 0.7;
      this.boxCollider(x, z, along ? 1.9 : 1.15, along ? 1.15 : 1.9, 2.9);
    });
    twInst.castShadow = true;
    twInst.receiveShadow = true;
    this.group.add(twInst);
  }

  // -------------------------------------------------- additional vehicles --
  _buildVehiclesExtra() {
    const rng = this.rng;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const e = new THREE.Euler();
    const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

    // ---- three more parked trucks (instanced merged geometry, 3 draw calls)
    const bodyMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#61694f', seed: 42 }), roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.25, metalness: 0.6 });
    const truckBodyGeo = BufferGeometryUtils.mergeGeometries([
      box(2.1, 1.5, 2.2, 0, 1.45, 2.6), box(2.1, 0.75, 1.3, 0, 1.07, 4.3), box(2.3, 0.5, 4.6, 0, 1.1, -0.6),
      box(0.09, 0.42, 4.6, -1.14, 1.56, -0.6), box(0.09, 0.42, 4.6, 1.14, 1.56, -0.6), box(2.28, 0.42, 0.09, 0, 1.56, -2.85),
    ]);
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelParts = [];
    for (const [wx, wz] of [[-0.98, 3.9], [0.98, 3.9], [-0.98, 0.6], [0.98, 0.6], [-0.98, -1.6], [0.98, -1.6]]) {
      wheelParts.push(wheelGeo.clone().translate(wx, 0.55, wz));
    }
    const truckWheelsGeo = BufferGeometryUtils.mergeGeometries(wheelParts);
    const truckGlassGeo = box(1.9, 0.55, 0.06, 0, 1.75, 3.72);
    const truckSpots = [
      [-14, -63.5, Math.PI + 0.06], [-6, -63.5, Math.PI - 0.03], [19, 61, 0.55],
    ];
    const tBody = new THREE.InstancedMesh(truckBodyGeo, bodyMat, truckSpots.length);
    const tWheels = new THREE.InstancedMesh(truckWheelsGeo, darkMat, truckSpots.length);
    const tGlass = new THREE.InstancedMesh(truckGlassGeo, glassMat, truckSpots.length);
    truckSpots.forEach(([x, z, yaw], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, yaw, 0));
      m.compose(p, q, s.set(1, 1, 1));
      tBody.setMatrixAt(i, m);
      tWheels.setMatrixAt(i, m);
      tGlass.setMatrixAt(i, m);
      const diag = Math.abs(Math.sin(yaw)) > 0.3 && Math.abs(Math.sin(yaw)) < 0.95;
      this.boxCollider(x, z, diag ? 5.5 : 3.4, diag ? 5.5 : 7.4, 2.6);
    });
    tBody.castShadow = true;
    this.group.add(tBody, tWheels, tGlass);

    // ---- fuel tanker at the fuel point
    const tk = new THREE.Group();
    tk.position.set(38, 0, 62);
    tk.rotation.y = -0.83;
    this.group.add(tk);
    const tkBody = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([
      box(2.1, 1.5, 2.2, 0, 1.45, 2.8), box(2.1, 0.75, 1.3, 0, 1.07, 4.5),
      box(1.1, 0.35, 7.4, 0, 0.72, -0.5), box(2.0, 0.12, 0.5, 0, 2.62, 0.9),
    ]), bodyMat);
    tkBody.castShadow = true;
    tk.add(tkBody);
    const tkTank = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([
      new THREE.CylinderGeometry(1.02, 1.02, 4.6, 14).rotateX(Math.PI / 2).translate(0, 1.82, -1.2),
      new THREE.SphereGeometry(1.02, 12, 8).scale(1, 1, 0.42).translate(0, 1.82, 1.1),
      new THREE.SphereGeometry(1.02, 12, 8).scale(1, 1, 0.42).translate(0, 1.82, -3.5),
    ]), new THREE.MeshStandardMaterial({ map: metalTexture('#8f948b', 33), roughness: 0.42, metalness: 0.62 }));
    tkTank.castShadow = true;
    tk.add(tkTank);
    const tkWheels = new THREE.Mesh(truckWheelsGeo, darkMat);
    tk.add(tkWheels);
    // one merged decal mesh: FLAMMABLE placards on both sides + rear plate
    const tkDecals = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([
      new THREE.PlaneGeometry(2.1, 0.44).rotateY(Math.PI / 2).translate(1.04, 1.82, -1.2),
      new THREE.PlaneGeometry(2.1, 0.44).rotateY(-Math.PI / 2).translate(-1.04, 1.82, -1.2),
      new THREE.PlaneGeometry(1.9, 0.42).rotateY(Math.PI).translate(0, 0.95, -4.25),
    ]), new THREE.MeshBasicMaterial({ map: stencilTexture('FLAMMABLE', { w: 512, h: 96, size: 58, color: '#f0ead8', bg: '#8a2e26' }) }));
    tk.add(tkDecals);
    this.boxCollider(38, 62, 5.6, 5.6, 2.9);

    // ---- small equipment carts on the apron
    const cartMat = new THREE.MeshStandardMaterial({ map: metalTexture('#4a4f42', 29), roughness: 0.7, metalness: 0.4 });
    const cartGeo = BufferGeometryUtils.mergeGeometries([
      box(1.7, 0.09, 0.95, 0, 0.52, 0),
      box(0.06, 0.5, 0.06, -0.78, 0.27, -0.4), box(0.06, 0.5, 0.06, 0.78, 0.27, -0.4),
      box(0.06, 0.5, 0.06, -0.78, 0.27, 0.4), box(0.06, 0.5, 0.06, 0.78, 0.27, 0.4),
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10).rotateZ(Math.PI / 2).translate(-0.7, 0.17, -0.36),
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10).rotateZ(Math.PI / 2).translate(0.7, 0.17, -0.36),
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10).rotateZ(Math.PI / 2).translate(-0.7, 0.17, 0.36),
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10).rotateZ(Math.PI / 2).translate(0.7, 0.17, 0.36),
      new THREE.BoxGeometry(0.05, 0.62, 0.05).rotateZ(0.55).translate(-1.0, 0.8, -0.15),
      new THREE.BoxGeometry(0.05, 0.62, 0.05).rotateZ(0.55).translate(-1.0, 0.8, 0.15),
      new THREE.BoxGeometry(0.05, 0.05, 0.4).translate(-1.16, 1.05, 0),
    ]);
    const carts = [[-24, 10, 0.5], [-12, -26, -1.1], [2, -64, 1.65]];
    const cartInst = new THREE.InstancedMesh(cartGeo, cartMat, carts.length);
    carts.forEach(([x, z, yaw], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, yaw, 0));
      m.compose(p, q, s.set(1, 1, 1));
      cartInst.setMatrixAt(i, m);
      this.boxCollider(x, z, 2.0, 1.3, 1.1);
    });
    this.group.add(cartInst);
  }

  // ------------------------------------------------ portable light towers --
  _buildLightTowers() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const e = new THREE.Euler();
    const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    const frameMat = new THREE.MeshStandardMaterial({ map: metalTexture('#6a7164', 23), roughness: 0.55, metalness: 0.6 });
    const frameGeo = BufferGeometryUtils.mergeGeometries([
      box(1.65, 0.22, 1.05, 0, 0.55, 0),
      box(0.08, 0.06, 0.85, 0, 0.5, 0.92),
      new THREE.CylinderGeometry(0.05, 0.07, 5.0, 7).translate(0, 3.16, 0),
      box(1.0, 0.09, 0.11, 0, 5.72, 0),
      new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10).rotateZ(Math.PI / 2).translate(-0.86, 0.28, 0),
      new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10).rotateZ(Math.PI / 2).translate(0.86, 0.28, 0),
      box(0.05, 0.04, 0.75, -0.72, 0.32, -0.62), box(0.05, 0.04, 0.75, 0.72, 0.32, -0.62),
      box(0.05, 0.04, 0.75, -0.72, 0.32, 0.62), box(0.05, 0.04, 0.75, 0.72, 0.32, 0.62),
    ]);
    const headParts = [];
    for (let i = 0; i < 4; i++) headParts.push(box(0.26, 0.2, 0.22, -0.39 + i * 0.26, 5.92, 0.04));
    const headsGeo = BufferGeometryUtils.mergeGeometries(headParts);
    const headsMat = new THREE.MeshBasicMaterial({ color: 0x2a2d2a, toneMapped: false });
    const sites = [[-52, 16, 0.7], [16, -50, 2.4], [-34, 58, -0.5], [40, 58, 2.9]];
    const frames = new THREE.InstancedMesh(frameGeo, frameMat, sites.length);
    const heads = new THREE.InstancedMesh(headsGeo, headsMat, sites.length);
    sites.forEach(([x, z, yaw], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, yaw, 0));
      m.compose(p, q, s.set(1, 1, 1));
      frames.setMatrixAt(i, m);
      heads.setMatrixAt(i, m);
      this.cylCollider(x, z, 0.8, 5);
    });
    frames.castShadow = true;
    this.group.add(frames, heads);
    this.floodHeads.push(headsMat); // glows warm at night with the mast lights
  }

  // ------------------------------------- perimeter towers, gate 2, signs --
  _buildPerimeterExtras() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const e = new THREE.Euler();
    const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

    // ---- guard towers (main gate + NW perimeter) — 2 instanced draw calls
    const frameMat = new THREE.MeshStandardMaterial({ map: metalTexture('#5f665f', 15), roughness: 0.55, metalness: 0.65 });
    const cabinMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#5d6552', seed: 57 }), roughness: 0.8 });
    const legGeo = new THREE.CylinderGeometry(0.07, 0.095, 6.7, 6);
    const frameParts = [];
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      frameParts.push(legGeo.clone().rotateZ(-dx * 0.055).rotateX(dz * 0.055).translate(dx * 1.16, 3.32, dz * 1.16));
    }
    for (const y of [1.9, 4.1]) {
      frameParts.push(
        box(2.3, 0.07, 0.07, 0, y, 1.04), box(2.3, 0.07, 0.07, 0, y, -1.04),
        box(0.07, 0.07, 2.3, 1.04, y, 0), box(0.07, 0.07, 2.3, -1.04, y, 0),
      );
    }
    frameParts.push(box(0.035, 6.4, 0.035, -0.26, 3.2, 1.38), box(0.035, 6.4, 0.035, 0.26, 3.2, 1.38));
    for (let i = 0; i < 9; i++) frameParts.push(box(0.55, 0.045, 0.045, 0, 0.7 + i * 0.65, 1.38));
    const towerFrameGeo = BufferGeometryUtils.mergeGeometries(frameParts);
    const towerCabinGeo = BufferGeometryUtils.mergeGeometries([
      box(3.0, 0.14, 3.0, 0, 6.62, 0),
      box(3.0, 0.8, 0.1, 0, 7.1, 1.45), box(3.0, 0.8, 0.1, 0, 7.1, -1.45),
      box(0.1, 0.8, 3.0, 1.45, 7.1, 0), box(0.1, 0.8, 3.0, -1.45, 7.1, 0),
      box(3.35, 0.1, 3.35, 0, 8.75, 0),
      box(0.09, 1.6, 0.09, 1.38, 7.9, 1.38), box(0.09, 1.6, 0.09, -1.38, 7.9, 1.38),
      box(0.09, 1.6, 0.09, 1.38, 7.9, -1.38), box(0.09, 1.6, 0.09, -1.38, 7.9, -1.38),
      box(0.42, 0.3, 0.36, 0.7, 7.62, 1.5),
    ]);
    const towerSites = [[14, 214], [-152, -156]];
    const towerFrames = new THREE.InstancedMesh(towerFrameGeo, frameMat, towerSites.length);
    const towerCabins = new THREE.InstancedMesh(towerCabinGeo, cabinMat, towerSites.length);
    towerSites.forEach(([x, z], i) => {
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, Math.atan2(-x, -z), 0));
      m.compose(p, q, s.set(1, 1, 1));
      towerFrames.setMatrixAt(i, m);
      towerCabins.setMatrixAt(i, m);
      this.boxCollider(x, z, 2.9, 2.9, 9);
    });
    towerFrames.castShadow = true;
    towerCabins.castShadow = true;
    this.group.add(towerFrames, towerCabins);

    // ---- gate 2 (west, closed) at the end of the west spur road
    const g2Mat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#5b6353', seed: 12 }), roughness: 0.7 });
    const g2Posts = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([
      box(0.75, 4.2, 0.75, -231.6, 2.1, -5.5), box(0.75, 4.2, 0.75, -231.6, 2.1, 5.5),
      box(0.6, 0.5, 12.0, -231.6, 4.5, 0),
    ]), g2Mat);
    g2Posts.castShadow = true;
    this.group.add(g2Posts);
    const g2FrameMat = new THREE.MeshStandardMaterial({ map: metalTexture('#606862', 25), roughness: 0.5, metalness: 0.7 });
    const g2Frame = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([
      box(0.1, 0.1, 10.5, -230.9, 0.4, 0), box(0.1, 0.1, 10.5, -230.9, 3.0, 0),
      box(0.1, 2.7, 0.1, -230.9, 1.7, -5.2), box(0.1, 2.7, 0.1, -230.9, 1.7, 0), box(0.1, 2.7, 0.1, -230.9, 1.7, 5.2),
    ]), g2FrameMat);
    this.group.add(g2Frame);
    const g2LinkTex = chainlinkTexture().clone();
    g2LinkTex.repeat.set(3.4, 1.3);
    g2LinkTex.needsUpdate = true;
    const g2Link = new THREE.Mesh(
      new THREE.PlaneGeometry(10.4, 2.6),
      new THREE.MeshStandardMaterial({
        map: g2LinkTex, transparent: true, alphaTest: 0.22, side: THREE.DoubleSide,
        color: 0xd6dde0, roughness: 0.6, metalness: 0.25, depthWrite: false,
      }),
    );
    g2Link.rotation.y = Math.PI / 2;
    g2Link.position.set(-230.9, 1.65, 0);
    this.group.add(g2Link);
    const g2Sign = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 0.8),
      new THREE.MeshBasicMaterial({ map: stencilTexture('GATE 2 — AUTHORIZED VEHICLES ONLY', { w: 1024, h: 128, size: 52, color: '#e8e4d8', bg: '#3a4136' }) }),
    );
    g2Sign.rotation.y = Math.PI / 2;
    g2Sign.position.set(-230.4, 3.1, 0);
    this.group.add(g2Sign);

    // ---- warning signs hung on the fence (instanced, face inward)
    const signGeo = new THREE.PlaneGeometry(0.95, 0.68);
    const signMat = new THREE.MeshBasicMaterial({ map: warnSignTexture() });
    const signSpots = [];
    const segs = 44;
    for (let i = 0; i < segs; i += 4) {
      const a = (i / segs) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.22 || Math.abs(a - Math.PI) < 0.22) continue;
      signSpots.push(a);
    }
    const signs = new THREE.InstancedMesh(signGeo, signMat, signSpots.length);
    signSpots.forEach((a, i) => {
      const R = WORLD.fenceRadius - 0.55;
      p.set(Math.cos(a) * R, 1.85, Math.sin(a) * R);
      q.setFromEuler(e.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0));
      m.compose(p, q, s.set(1, 1, 1));
      signs.setMatrixAt(i, m);
    });
    this.group.add(signs);
  }

  // --------------------------------------------------------------- signs --
  _buildSigns() {
    const postParts = [];
    const mkSign = (text, x, z, yaw, w = 2.6, h = 0.8, bg = '#8a2e26') => {
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        // lit material: painted sign, not a glowing panel
        new THREE.MeshStandardMaterial({ map: stencilTexture(text, { w: 512, h: 128, size: 44, color: '#e7e0cc', bg }), roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
      );
      board.position.set(x, 1.35, z);
      board.rotation.y = yaw;
      this.group.add(board);
      postParts.push(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6).translate(x, 0.65, z));
    };
    mkSign('DANGER — LAUNCH AREA', 38, -22, 2.4);
    mkSign('DANGER — LAUNCH AREA', 46, 24, 2.9);
    mkSign('SENTINEL TEST PAD — KEEP OUT', -2, 70, -2.9, 3.2);
    mkSign('TOC — AUTHORIZED ONLY', -32, -3, 1.72, 2.6, 0.8, '#31402f');
    mkSign('EAR PROTECTION REQUIRED', 6, 44, 3.14, 2.8, 0.7, '#7a6a24');
    mkSign('MOTOR POOL', -8, -56, 0, 2.4, 0.7, '#31402f');
    mkSign('FUEL POINT — NO SMOKING', 27.5, 55.5, 0.7, 3.0, 0.7, '#7a3020');
    mkSign('SPEED LIMIT 15', 7, 198, 0, 2.2, 0.7, '#31402f');
    // all sign posts share one merged mesh (single draw call)
    const posts = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(postParts),
      new THREE.MeshStandardMaterial({ color: 0x4c524b, roughness: 0.7 }),
    );
    this.group.add(posts);

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

// ---------------------------------------------- local decal/prop textures --
let _tireTracksTex = null;
function tireTracksTexture() {
  if (_tireTracksTex) return _tireTracksTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 512);
  for (const cx of [38, 90]) {
    for (let y = 0; y < 512; y += 3) {
      const fade = Math.min(1, y / 90, (512 - y) / 90);
      const wobble = fbm2(y * 0.014, cx * 0.3, 2) * 7;
      const a = fade * (0.35 + 0.4 * (0.5 + 0.5 * fbm2(y * 0.05, cx, 2)));
      g.fillStyle = `rgba(28,26,22,${a.toFixed(3)})`;
      g.fillRect(cx + wobble - 9, y, 18, 3);
      // tread gaps
      if ((y >> 2) % 3 === 0) {
        g.clearRect(cx + wobble - 6, y, 4, 2);
        g.clearRect(cx + wobble + 2, y, 4, 2);
      }
    }
  }
  _tireTracksTex = new THREE.CanvasTexture(c);
  _tireTracksTex.colorSpace = THREE.SRGBColorSpace;
  return _tireTracksTex;
}

let _stainTex = null;
function stainTexture() {
  if (_stainTex) return _stainTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(30,28,24,0.85)');
  gr.addColorStop(0.55, 'rgba(34,32,28,0.4)');
  gr.addColorStop(1, 'rgba(36,34,30,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  const img = g.getImageData(0, 0, 128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const x = (i / 4) % 128, y = (i / 4 / 128) | 0;
    const n = 0.5 + 0.65 * fbm2(x * 0.055 + 11, y * 0.055 + 4, 3);
    img.data[i + 3] = Math.max(0, Math.min(255, img.data[i + 3] * n));
  }
  g.putImageData(img, 0, 0);
  _stainTex = new THREE.CanvasTexture(c);
  return _stainTex;
}

let _drumTex = null;
function drumTexture() {
  if (_drumTex) return _drumTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#57604c';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      const n = fbm2(x * 0.06 + 5, y * 0.06, 3) * 9;
      g.fillStyle = `rgba(${n > 0 ? 255 : 0},${n > 0 ? 255 : 10},${n > 0 ? 220 : 0},${Math.abs(n) * 0.012})`;
      g.fillRect(x, y, 2, 2);
    }
  }
  // rolling ribs + rims
  g.fillStyle = 'rgba(24,28,22,0.65)';
  g.fillRect(0, 40, 128, 5);
  g.fillRect(0, 83, 128, 5);
  g.fillRect(0, 0, 128, 4);
  g.fillRect(0, 124, 128, 4);
  // rust streaks
  for (let i = 0; i < 12; i++) {
    const x = (i * 41) % 128, h = 12 + ((i * 29) % 40);
    g.fillStyle = `rgba(112,70,36,${0.1 + (i % 4) * 0.05})`;
    g.fillRect(x, 6 + ((i * 17) % 30), 2 + (i % 3), h);
  }
  g.fillStyle = 'rgba(220,214,190,0.6)';
  g.font = 'bold 15px "Courier New", monospace';
  g.fillText('CR-FL', 46, 68);
  _drumTex = new THREE.CanvasTexture(c);
  _drumTex.colorSpace = THREE.SRGBColorSpace;
  return _drumTex;
}

let _warnSignTex = null;
function warnSignTexture() {
  if (_warnSignTex) return _warnSignTex;
  const c = document.createElement('canvas');
  c.width = 190; c.height = 136;
  const g = c.getContext('2d');
  g.fillStyle = '#ded8c4';
  g.fillRect(0, 0, 190, 136);
  g.strokeStyle = '#8a2e26';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 182, 128);
  g.fillStyle = '#8a2e26';
  g.fillRect(8, 8, 174, 38);
  g.fillStyle = '#efe9d6';
  g.font = 'bold 24px "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('RESTRICTED AREA', 95, 35);
  g.fillStyle = '#2c2a26';
  g.font = 'bold 17px "Arial Narrow", Arial, sans-serif';
  g.fillText('AUTHORIZED', 95, 74);
  g.fillText('PERSONNEL ONLY', 95, 96);
  g.font = '12px "Arial Narrow", Arial, sans-serif';
  g.fillText('CASTELLAN RIDGE TEST RANGE', 95, 120);
  _warnSignTex = new THREE.CanvasTexture(c);
  _warnSignTex.colorSpace = THREE.SRGBColorSpace;
  return _warnSignTex;
}

/** vertical atlas of ground stencil labels (row 0 at the bottom of the UVs) */
function padLabelAtlas(labels) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128 * labels.length;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = 'bold 62px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(214,208,184,0.85)';
  labels.forEach((t, i) => g.fillText(t, 128, i * 128 + 66));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
