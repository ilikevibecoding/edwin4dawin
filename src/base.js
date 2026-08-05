// The fictional air-defence site: terrain, distant ranges, command shelter,
// radar installation, roads, perimeter and support clutter. All geometry is
// procedural and shares the material library.
import * as THREE from 'three';
import { Noise2D } from './core/rng.js';
import { mats } from './core/materials.js';
import * as T from './core/textures.js';
import * as K from './core/kit.js';
import { mergeStatic, markDynamic } from './core/merge.js';

export const BASE_FLAT_RADIUS = 170;
export const PAD_POSITIONS = {
  patriot: new THREE.Vector3(-52, 0, -30),
  thaad: new THREE.Vector3(4, 0, -70),
  sentinel: new THREE.Vector3(58, 0, -38),
};
export const SHELTER_ORIGIN = new THREE.Vector3(-20, 0, 22);
export const RADAR_ORIGIN = new THREE.Vector3(32, 0, -6);
export const PLAYER_SPAWN = new THREE.Vector3(-6, 0, 34);

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export class Base {
  constructor(scene, rng, collision) {
    this.scene = scene;
    this.rng = rng;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'base';
    scene.add(this.group);

    this.noise = new Noise2D(rng.seed ^ 0x5eed);
    this.detailNoise = new Noise2D((rng.seed ^ 0xbeef) >>> 0);

    this.floodlights = [];
    this.beacons = [];
    this.rotators = [];
    this.nightMaterials = [];
    this.lampLights = [];
    this.screens = [];
    this.consoleAnchor = new THREE.Object3D();
    this.time = 0;
  }

  // -------------------------------------------------------------------------
  // Terrain
  // -------------------------------------------------------------------------

  terrainHeight(x, z) {
    const d = Math.hypot(x, z);
    const n = this.noise;
    // gentle desert swells
    let h = n.fbm(x * 0.0022, z * 0.0022, 4) * 7.5;
    h += n.fbm(x * 0.011, z * 0.011, 3) * 1.1;
    h += this.detailNoise.fbm(x * 0.06, z * 0.06, 2) * 0.16;

    // low foothills ring the site before the ranges proper begin
    const mid = smoothstep(600, 2800, d);
    if (mid > 0.001) {
      h += (n.fbm(x * 0.00042, z * 0.00042, 3) * 0.5 + 0.5) * 110 * mid;
    }

    // distant ranges: ridged noise whose amplitude ramps in with distance.
    // Two scales - a broad massif and a finer spur pattern riding on it.
    const far = smoothstep(2600, 12000, d);
    if (far > 0.001) {
      const massif = n.ridged(x * 0.00007, z * 0.00007, 4);
      const spurs = n.ridged(x * 0.00028 + 40, z * 0.00028 - 20, 4);
      const range = Math.pow(massif, 1.55) * 2250 + Math.pow(spurs, 2.2) * 460 * massif;
      h += range * far;
    }

    // the operating area is a graded, level pad
    const flat = 1 - smoothstep(BASE_FLAT_RADIUS - 45, BASE_FLAT_RADIUS + 90, d);
    h *= 1 - flat;
    return h;
  }

  /**
   * Radial terrain patch. Both terrain meshes use the same topology so the
   * seam between them shares vertices exactly - no z-fighting, no gaps - and
   * the radial layout gives dense triangles near the player with cheap
   * triangles out at the ranges.
   */
  _radialTerrain(rInner, rOuter, rings, thetaSegs, exponent) {
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const r = exponent === 'exp'
        ? rInner * Math.pow(rOuter / rInner, t)
        : rInner + (rOuter - rInner) * Math.pow(t, exponent);
      for (let j = 0; j <= thetaSegs; j++) {
        const a = (j / thetaSegs) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = this.terrainHeight(x, z);
        positions.push(x, y, z);
        uvs.push(x / 14, z / 14);
        const c = this._terrainColor(y, x, z);
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < thetaSegs; j++) {
        const a = i * (thetaSegs + 1) + j;
        const b = a + thetaSegs + 1;
        // wound so the surface normal points up (+Y)
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  buildTerrain() {
    const M = mats();
    const SEAM = 1400;
    // --- near field: dense radial grid over the site and its surroundings --
    const nearGeo = this._radialTerrain(0.6, SEAM, 150, 256, 1.7);
    const groundMat = new THREE.MeshStandardMaterial({
      map: T.sand(0),
      normalMap: T.sandNormal(),
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughness: 1.0,
      metalness: 0.0,
      vertexColors: true,
    });
    groundMat.map = groundMat.map.clone();
    groundMat.map.wrapS = groundMat.map.wrapT = THREE.RepeatWrapping;
    groundMat.map.repeat.set(0.5, 0.5);
    groundMat.normalMap = groundMat.normalMap.clone();
    groundMat.normalMap.wrapS = groundMat.normalMap.wrapT = THREE.RepeatWrapping;
    groundMat.normalMap.repeat.set(2, 2);
    this.groundMaterial = groundMat;
    const near = new THREE.Mesh(nearGeo, groundMat);
    near.receiveShadow = true;
    near.name = 'terrain-near';
    this.group.add(near);

    // --- far field: exponential rings out to the ranges (cheap LOD) --------
    const farGeo = this._radialTerrain(SEAM, 46000, 110, 256, 'exp');
    const farMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      map: groundMat.map, color: 0xffffff,
    });
    this.farMaterial = farMat;
    const far = new THREE.Mesh(farGeo, farMat);
    far.name = 'terrain-far';
    far.receiveShadow = false;
    this.group.add(far);

    this._scatterGroundDetail();
  }

  /**
   * Vertex tint applied on top of the sand map. Kept close to 1.0 near the
   * site so the albedo map carries the colour, drifting to cooler rock and
   * then snow on the high ridges.
   */
  _terrainColor(y, x, z) {
    const n = this.detailNoise.fbm(x * 0.004, z * 0.004, 3) * 0.5 + 0.5;
    const rock = smoothstep(120, 620, y);
    const sandC = new THREE.Color(0.92 + n * 0.16, 0.88 + n * 0.14, 0.78 + n * 0.14);
    const rockC = new THREE.Color(0.6 + n * 0.16, 0.56 + n * 0.14, 0.55 + n * 0.14);
    const snowC = new THREE.Color(1.05, 1.06, 1.12);
    const c = sandC.lerp(rockC, rock);
    const snow = smoothstep(880, 1180, y) * smoothstep(0.42, 0.66, n);
    return c.lerp(snowC, snow);
  }

  /** Instanced rocks and scrub outside the graded pad. */
  _scatterGroundDetail() {
    const rng = this.rng;
    const M = mats();

    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    {
      const p = rockGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const s = 0.72 + ((i * 37) % 11) / 18;
        p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.7, p.getZ(i) * s);
      }
      rockGeo.computeVertexNormals();
    }
    const ROCKS = 1400;
    const rockMat = new THREE.MeshStandardMaterial({
      map: T.sand(1), normalMap: T.sandNormal(), color: 0x7d7263, roughness: 0.98, metalness: 0,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let k = 0;
    for (let i = 0; i < ROCKS; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 130 + Math.pow(rng.float(), 0.6) * 1250;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = this.terrainHeight(x, z);
      const s = 0.25 + Math.pow(rng.float(), 2) * 2.6;
      e.set(rng.float() * 3, rng.float() * 6, rng.float() * 3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y + s * 0.25, z), q, new THREE.Vector3(s, s * (0.6 + rng.float() * 0.5), s));
      rocks.setMatrixAt(k++, m);
    }
    rocks.count = k;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.group.add(rocks);

    // desert scrub: two crossed alpha quads, instanced
    const bushGeo = new THREE.BufferGeometry();
    {
      const verts = [];
      const uv = [];
      const idx = [];
      const addQuad = (rot) => {
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const base = verts.length / 3;
        const pts = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
        for (const [px, py] of pts) {
          verts.push(px * c, py, px * s);
        }
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };
      addQuad(0);
      addQuad(Math.PI / 2);
      bushGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      bushGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      bushGeo.setIndex(idx);
      bushGeo.computeVertexNormals();
    }
    const bushTex = this._bushTexture();
    const bushMat = new THREE.MeshStandardMaterial({
      map: bushTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide,
      roughness: 0.95, metalness: 0, color: 0x8d8a63,
    });
    const BUSHES = 2200;
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, BUSHES);
    k = 0;
    for (let i = 0; i < BUSHES; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 120 + Math.pow(rng.float(), 0.55) * 1180;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = this.terrainHeight(x, z);
      if (y > 120) continue;
      const s = 0.5 + rng.float() * 1.5;
      e.set(0, rng.float() * 6, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.7 + rng.float() * 0.7), s));
      bushes.setMatrixAt(k++, m);
    }
    bushes.count = k;
    bushes.castShadow = false;
    this.group.add(bushes);
  }

  _bushTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    const rng = this.rng;
    for (let i = 0; i < 130; i++) {
      const a = -Math.PI / 2 + (rng.float() - 0.5) * 2.2;
      const len = 30 + rng.float() * 62;
      ctx.strokeStyle = `rgba(${96 + rng.float() * 60},${92 + rng.float() * 54},${44 + rng.float() * 40},${0.5 + rng.float() * 0.5})`;
      ctx.lineWidth = 0.8 + rng.float() * 2.2;
      ctx.beginPath();
      ctx.moveTo(64 + (rng.float() - 0.5) * 26, 128);
      ctx.quadraticCurveTo(
        64 + Math.cos(a) * len * 0.5 + (rng.float() - 0.5) * 30,
        128 + Math.sin(a) * len * 0.6,
        64 + Math.cos(a) * len,
        128 + Math.sin(a) * len,
      );
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // -------------------------------------------------------------------------
  // Hard standing, roads and markings
  // -------------------------------------------------------------------------

  buildGroundworks() {
    const M = mats();
    const g = new THREE.Group();
    g.name = 'groundworks';

    // main apron
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(126, 108), M.concrete);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(-6, 0.02, -6);
    apron.receiveShadow = true;
    g.add(apron);
    const apronEdge = new THREE.Mesh(new THREE.RingGeometry(0, 1, 4), M.concreteDark);
    apronEdge.visible = false;
    g.add(apronEdge);

    // gravel skirt around the apron
    const skirt = new THREE.Mesh(new THREE.RingGeometry(60, 132, 48, 1), M.gravel);
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.set(-6, 0.005, -6);
    skirt.receiveShadow = true;
    g.add(skirt);

    // battery pads
    for (const [name, p] of Object.entries(PAD_POSITIONS)) {
      const size = name === 'sentinel' ? 34 : name === 'thaad' ? 30 : 28;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.concrete);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(p.x, 0.03, p.z);
      pad.receiveShadow = true;
      g.add(pad);

      const marks = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.94, size * 0.94), M.padMarkings.clone());
      marks.rotation.x = -Math.PI / 2;
      marks.position.set(p.x, 0.045, p.z);
      g.add(marks);

      // pad kerb
      for (const [dx, dz, w, d] of [[0, -size / 2, size, 0.6], [0, size / 2, size, 0.6], [-size / 2, 0, 0.6, size], [size / 2, 0, 0.6, size]]) {
        const kerb = K.box(w, 0.22, d, M.concreteDark, p.x + dx, 0.11, p.z + dz);
        kerb.receiveShadow = true;
        g.add(kerb);
      }
    }

    // service roads: apron -> each pad
    const roadPaths = [
      [new THREE.Vector3(-6, 0, 30), new THREE.Vector3(-6, 0, -6)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.patriot.x, 0, PAD_POSITIONS.patriot.z)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.thaad.x, 0, PAD_POSITIONS.thaad.z)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.sentinel.x, 0, PAD_POSITIONS.sentinel.z)],
      [new THREE.Vector3(-6, 0, 30), new THREE.Vector3(RADAR_ORIGIN.x, 0, RADAR_ORIGIN.z)],
    ];
    for (const [a, b] of roadPaths) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      const road = new THREE.Mesh(new THREE.PlaneGeometry(7, len), M.asphalt);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = -Math.atan2(dir.x, dir.z);
      road.position.copy(a).add(b).multiplyScalar(0.5);
      road.position.y = 0.04;
      road.receiveShadow = true;
      g.add(road);
      // centre dashes
      const dashes = Math.floor(len / 6);
      const dashGeo = new THREE.PlaneGeometry(0.28, 2.4);
      const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8d0ae, roughness: 0.9, transparent: true, opacity: 0.55 });
      const inst = new THREE.InstancedMesh(dashGeo, dashMat, dashes);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      for (let i = 0; i < dashes; i++) {
        const t = (i + 0.5) / dashes;
        const p = a.clone().lerp(b, t);
        const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.atan2(dir.x, dir.z), 'XYZ'));
        m.compose(new THREE.Vector3(p.x, 0.055, p.z), qq, new THREE.Vector3(1, 1, 1));
        inst.setMatrixAt(i, m);
      }
      g.add(inst);
    }

    // painted apron labels
    const labels = [
      ['SECTOR 1', -46, 6, 0],
      ['NO SMOKING', 18, 20, Math.PI / 2],
      ['CAUTION - BLAST HAZARD', -6, -46, 0],
    ];
    for (const [text, x, z, rot] of labels) {
      const w = text.length * 0.85;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 2.4),
        new THREE.MeshStandardMaterial({
          map: T.stencil(text, { w: 1024, h: 128, color: '#ddd2a8', font: 'bold 78px "Arial Narrow", Impact, sans-serif' }),
          transparent: true, roughness: 0.95, depthWrite: false,
          polygonOffset: true, polygonOffsetFactor: -2,
        }),
      );
      mesh.rotation.set(-Math.PI / 2, 0, rot);
      mesh.position.set(x, 0.06, z);
      g.add(mesh);
    }

    this.group.add(g);
  }

  // -------------------------------------------------------------------------
  // Command shelter
  // -------------------------------------------------------------------------

  buildShelter() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'shelter';
    g.position.copy(SHELTER_ORIGIN);
    g.rotation.y = -0.18;

    const W = 17;
    const D = 10;
    const H = 3.9;
    const wallT = 0.3;

    // foundation slab
    const slab = K.box(W + 1.6, 0.34, D + 1.6, M.concreteDark, 0, 0.17, 0);
    slab.receiveShadow = true;
    g.add(slab);

    const wallMat = M.corrugated;
    const addWall = (w, h, d, x, y, z, tag = 'shelter') => {
      const m = K.box(w, h, d, wallMat, x, y, z);
      g.add(m);
      return m;
    };

    // back + sides
    addWall(W, H, wallT, 0, 0.34 + H / 2, -D / 2);
    addWall(wallT, H, D, -W / 2, 0.34 + H / 2, 0);
    addWall(wallT, H, D, W / 2, 0.34 + H / 2, 0);
    // front with a doorway gap
    const doorW = 1.5;
    const frontZ = D / 2;
    const segW = (W - doorW) / 2;
    addWall(segW, H, wallT, -(doorW / 2 + segW / 2) + 2.6, 0.34 + H / 2, frontZ);
    addWall(segW, H, wallT, (doorW / 2 + segW / 2) + 2.6 - W + segW + doorW - segW, 0.34 + H / 2, frontZ);
    // lintel over the door
    addWall(doorW + 0.4, H - 2.25, wallT, 2.6, 0.34 + 2.25 + (H - 2.25) / 2, frontZ);

    // door frame + open door
    const frame = new THREE.Group();
    frame.position.set(2.6, 0.34, frontZ);
    for (const s of [-1, 1]) {
      frame.add(K.box(0.12, 2.3, 0.42, M.darkMetal, s * (doorW / 2 + 0.06), 1.15, 0));
    }
    frame.add(K.box(doorW + 0.24, 0.12, 0.42, M.darkMetal, 0, 2.32, 0));
    const door = K.box(doorW - 0.06, 2.2, 0.07, M.panelOlive, 0, 1.12, 0);
    door.position.x = -doorW * 0.5;
    door.rotation.y = -1.9;
    door.geometry.translate(doorW * 0.5 - 0.03, 0, 0);
    frame.add(door);
    frame.add(K.labelPlate('C2 SHELTER', 0.9, 0.24).translateY(2.55).translateZ(0.24));
    g.add(frame);

    // roof with a slight fall + parapet + HVAC + antennas
    const roof = K.box(W + 0.8, 0.28, D + 0.8, M.panelOlive, 0, 0.34 + H + 0.14, 0);
    g.add(roof);
    for (const [x, z, w, d] of [[0, -(D / 2 + 0.3), W + 0.8, 0.2], [0, D / 2 + 0.3, W + 0.8, 0.2], [-(W / 2 + 0.3), 0, 0.2, D + 0.8], [W / 2 + 0.3, 0, 0.2, D + 0.8]]) {
      g.add(K.box(w, 0.42, d, M.galvanised, x, 0.34 + H + 0.42, z));
    }
    const hvac = K.box(2.1, 1.0, 1.5, M.panelGrey, -4.4, 0.34 + H + 0.78, -1.6);
    g.add(hvac);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.52, 16), M.blackMetal);
    fan.rotation.x = -Math.PI / 2;
    fan.position.set(-4.4, 0.34 + H + 1.29, -1.6);
    g.add(fan);
    const blades = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = K.box(0.9, 0.02, 0.16, M.steel, 0, 0, 0);
      b.rotation.y = (i / 5) * Math.PI * 2;
      b.rotation.z = 0.3;
      blades.add(b);
    }
    blades.position.copy(fan.position);
    blades.position.y += 0.02;
    g.add(markDynamic(blades));
    this.rotators.push({ obj: blades, axis: 'y', speed: 6.5 });

    const mast = K.antennaMast(11, { dish: true, rng });
    mast.position.set(W / 2 - 1.2, 0.34 + H + 0.28, -D / 2 + 1.2);
    g.add(mast);
    markDynamic(mast.userData.beacon, mast.userData.dish);
    this.beacons.push(mast.userData.beacon);
    if (mast.userData.dish) this.rotators.push({ obj: mast.userData.dish, axis: 'y', speed: 0.22 });

    // wall clutter: conduit runs, junction boxes, cable trays
    for (let i = 0; i < 3; i++) {
      const y = 0.9 + i * 0.55;
      g.add(K.conduit([
        new THREE.Vector3(-W / 2 + 0.2, y, D / 2 - 0.1),
        new THREE.Vector3(-W / 2 + 0.2, y, -D / 2 + 0.4),
        new THREE.Vector3(-W / 2 + 1.4, y, -D / 2 + 0.2),
      ], 0.045));
    }
    for (let i = 0; i < 4; i++) {
      const jb = K.box(0.34, 0.42, 0.2, M.panelGrey, -W / 2 + 0.3 + i * 1.4, 1.5, D / 2 + 0.1);
      g.add(jb);
    }
    // exterior lamp over the door
    const lamp = new THREE.Group();
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 12, 1, true), M.darkMetal);
    shade.rotation.x = Math.PI;
    lamp.add(shade);
    const bulb = K.sphere(0.09, M.lampGlassOff, 0, -0.1, 0, 10);
    lamp.add(bulb);
    lamp.position.set(2.6, 0.34 + 2.7, frontZ + 0.35);
    g.add(lamp);
    markDynamic(bulb);
    this.lampLights.push({ bulbMesh: bulb, group: lamp, kind: 'door' });

    // sandbag revetment + gabions along the exposed side
    const bags = K.sandbagRing(rng, W / 2 + 1.9, D / 2 + 1.9, 3);
    bags.position.y = 0;
    g.add(bags);

    // -------------------- interior --------------------
    const inner = new THREE.Group();
    inner.name = 'shelter-interior';
    g.add(inner);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, D - 0.6), M.concrete);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.35;
    floor.receiveShadow = true;
    inner.add(floor);

    // ceiling with light fixtures
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, D - 0.6), M.panelGrey);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 0.34 + H - 0.02;
    inner.add(ceil);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 5.0;
      const fixture = K.box(2.6, 0.1, 0.36, M.darkMetal, x, 0.34 + H - 0.14, 0);
      inner.add(fixture);
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.05, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xdfe6dd, emissive: 0xbfe0d8, emissiveIntensity: 2.2, roughness: 0.4 }),
      );
      tube.position.set(x, 0.34 + H - 0.2, 0);
      inner.add(tube);
      const pt = new THREE.PointLight(0xcfe6df, 6, 12, 2);
      pt.position.set(x, 0.34 + H - 0.4, 0);
      inner.add(pt);
      this.lampLights.push({ light: pt, tube, kind: 'interior' });
    }
    // cable tray under the ceiling
    inner.add(K.grating(W - 1.6, 0.5).translateY(0.34 + H - 0.5));

    // ---- radar console table (the primary control station) ----
    const console3d = new THREE.Group();
    console3d.position.set(0, 0.35, -1.1);
    inner.add(console3d);

    const pedestal = K.cyl(1.35, 1.55, 0.86, 24, M.panelGrey, 0, 0.43, 0);
    console3d.add(pedestal);
    console3d.add(K.boltRing(1.42, 24, M.steel).translateY(0.05).rotateX(-Math.PI / 2));
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), M.darkMetal);
    tableTop.position.y = 0.9;
    console3d.add(tableTop);
    const scopeMat = new THREE.MeshBasicMaterial({ color: 0x0a1d16, toneMapped: false });
    const scope = new THREE.Mesh(new THREE.CircleGeometry(1.36, 48), scopeMat);
    scope.rotation.x = -Math.PI / 2;
    scope.position.y = 0.955;
    console3d.add(scope);
    this.scopeMaterial = scopeMat;
    this.scopeMesh = scope;
    const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.07, 8, 44), M.blackMetal);
    bezelRing.rotation.x = Math.PI / 2;
    bezelRing.position.y = 0.95;
    console3d.add(bezelRing);

    // twin upright monitors behind the table
    const monitorRig = new THREE.Group();
    monitorRig.position.set(0, 0.35, -3.4);
    inner.add(monitorRig);
    monitorRig.add(K.box(4.6, 0.14, 0.9, M.panelGrey, 0, 0.9, 0));
    for (const s of [-1, 1]) {
      const stand = K.cyl(0.06, 0.08, 0.7, 8, M.darkMetal, s * 1.35, 1.28, 0);
      monitorRig.add(stand);
      const body = K.box(1.9, 1.15, 0.12, M.blackMetal, s * 1.35, 2.05, 0);
      monitorRig.add(body);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x0c2018, toneMapped: false });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 0.98), screenMat);
      screen.position.set(s * 1.35, 2.05, 0.07);
      monitorRig.add(screen);
      this.screens.push({ mesh: screen, material: screenMat, side: s });
    }
    // keyboard shelf, chairs, mugs of clutter
    monitorRig.add(K.box(4.2, 0.08, 0.7, M.darkMetal, 0, 1.02, 0.6));
    for (const s of [-1, 1]) {
      const kb = K.box(0.9, 0.05, 0.32, M.blackMetal, s * 1.2, 1.08, 0.62);
      kb.rotation.x = -0.09;
      monitorRig.add(kb);
    }
    for (const s of [-1, 1]) {
      const chair = new THREE.Group();
      chair.position.set(s * 1.35, 0.35, 1.5);
      chair.add(K.cyl(0.28, 0.32, 0.06, 12, M.darkMetal, 0, 0.06, 0));
      chair.add(K.cyl(0.05, 0.05, 0.42, 8, M.steel, 0, 0.28, 0));
      chair.add(K.box(0.5, 0.09, 0.5, M.rubber, 0, 0.52, 0));
      const back = K.box(0.5, 0.6, 0.08, M.rubber, 0, 0.86, -0.22);
      back.rotation.x = -0.14;
      chair.add(back);
      chair.rotation.y = s * 0.25;
      inner.add(chair);
    }

    // the big physical arm / launch panel on a side desk
    const panelDesk = new THREE.Group();
    panelDesk.position.set(4.6, 0.35, 0.4);
    panelDesk.rotation.y = -0.9;
    inner.add(panelDesk);
    panelDesk.add(K.box(2.2, 0.9, 0.8, M.panelGrey, 0, 0.45, 0));
    const slope = K.box(2.2, 0.06, 0.75, M.panelGrey, 0, 0.93, 0.05);
    slope.rotation.x = -0.32;
    panelDesk.add(slope);
    const bigButtonBase = K.cyl(0.15, 0.17, 0.06, 16, M.blackMetal, 0.6, 1.0, 0.1);
    bigButtonBase.rotation.x = -0.32;
    panelDesk.add(bigButtonBase);
    const bigButton = K.cyl(0.12, 0.12, 0.07, 16, M.ledRed, 0.6, 1.04, 0.11);
    bigButton.rotation.x = -0.32;
    panelDesk.add(bigButton);
    this.launchButton = bigButton;
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 16), M.hazard);
    guard.rotation.x = Math.PI / 2 - 0.32;
    guard.position.set(0.6, 1.03, 0.1);
    panelDesk.add(guard);
    panelDesk.add(K.labelPlate('AUTHORIZE', 0.42, 0.11, '#ffd9d0').rotateX(-Math.PI / 2 - 0.32 + Math.PI).translateX(0.6).translateY(0.0).translateZ(0.0).translateY(0.99).translateZ(0.38));
    // toggle switches and dials
    for (let i = 0; i < 6; i++) {
      const sw = K.box(0.05, 0.12, 0.05, M.steel, -0.85 + i * 0.16, 1.0, 0.16);
      sw.rotation.x = -0.32 + (i % 2 ? 0.4 : -0.4);
      panelDesk.add(sw);
      const led = K.cyl(0.018, 0.018, 0.014, 8, i % 2 ? M.ledGreen : M.ledAmber, -0.85 + i * 0.16, 1.0, 0.28);
      led.rotation.x = Math.PI / 2 - 0.32;
      panelDesk.add(led);
    }
    for (let i = 0; i < 3; i++) {
      const dial = K.cyl(0.07, 0.07, 0.03, 12, M.darkMetal, -0.2 + i * 0.2, 1.0, 0.02);
      dial.rotation.x = -0.32;
      panelDesk.add(dial);
    }

    // rack of equipment along the back wall
    for (let r = 0; r < 3; r++) {
      const rack = new THREE.Group();
      rack.position.set(-6.6 + r * 1.15, 0.35, -D / 2 + 0.85);
      rack.add(K.box(1.0, 2.0, 0.75, M.blackMetal, 0, 1.0, 0));
      for (let u = 0; u < 8; u++) {
        const unit = K.box(0.92, 0.19, 0.06, r === 1 ? M.panelGrey : M.darkMetal, 0, 0.3 + u * 0.22, 0.39);
        rack.add(unit);
        for (let l = 0; l < 3; l++) {
          const led = K.box(0.03, 0.03, 0.02, l === 0 ? M.ledGreen : l === 1 ? M.ledAmber : M.ledOff, -0.36 + l * 0.09, 0.3 + u * 0.22, 0.43);
          rack.add(led);
        }
      }
      inner.add(rack);
    }
    // loose cabling on the floor
    for (let i = 0; i < 7; i++) {
      const a = rng.range(-Math.PI, Math.PI);
      inner.add(K.cable(
        new THREE.Vector3(rng.range(-6, 6), 0.4, rng.range(-3.6, 3.6)),
        new THREE.Vector3(rng.range(-6, 6), 0.4, rng.range(-3.6, 3.6)),
        { sag: 0.03, radius: 0.028 },
      ));
    }
    inner.add(K.equipmentCase(0.9, 0.5, 0.6).translateX(-7.4).translateY(0.35).translateZ(2.6));
    inner.add(K.equipmentCase(0.7, 0.4, 0.5, M.panelGrey).translateX(-6.4).translateY(0.35).translateZ(3.2));

    this.shelter = g;
    this.shelterInterior = inner;
    this.consoleAnchor.position.copy(SHELTER_ORIGIN);
    this.consoleAnchor.position.y = 0.35;
    this.group.add(g);

    // collision: walls as individual boxes so the doorway stays walkable
    g.updateWorldMatrix(true, true);
    const c = this.collision;
    const wp = SHELTER_ORIGIN;
    const yaw = g.rotation.y;
    const local = (x, z) => new THREE.Vector3(
      wp.x + x * Math.cos(yaw) + z * Math.sin(yaw),
      0,
      wp.z - x * Math.sin(yaw) + z * Math.cos(yaw),
    );
    const addLocalBox = (cx, cz, w, d, h, y) => {
      const p = local(cx, cz);
      p.y = y;
      // AABB of the rotated slab (yaw is small, so a padded AABB is fine)
      const cosA = Math.abs(Math.cos(yaw));
      const sinA = Math.abs(Math.sin(yaw));
      c.addBox(p, new THREE.Vector3(w * cosA + d * sinA, h, w * sinA + d * cosA), 'shelter');
    };
    addLocalBox(0, -D / 2, W, wallT + 0.2, H, 0.34 + H / 2);
    addLocalBox(-W / 2, 0, wallT + 0.2, D, H, 0.34 + H / 2);
    addLocalBox(W / 2, 0, wallT + 0.2, D, H, 0.34 + H / 2);
    addLocalBox(-4.6, D / 2, 7.4, wallT + 0.2, H, 0.34 + H / 2);
    addLocalBox(6.1, D / 2, 5.8, wallT + 0.2, H, 0.34 + H / 2);
    // console furniture
    c.addCylinder(new THREE.Vector3(local(0, -1.1).x, 0.35 + 0.5, local(0, -1.1).z), 1.6, 1.1, 'console');
    addLocalBox(0, -3.4, 4.8, 1.1, 2.6, 0.35 + 1.3);
    addLocalBox(4.6, 0.4, 2.4, 1.4, 1.0, 0.35 + 0.5);
  }

  // -------------------------------------------------------------------------
  // Radar installation
  // -------------------------------------------------------------------------

  buildRadarStation() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'radar-station';
    g.position.copy(RADAR_ORIGIN);
    g.rotation.y = 0.35;

    // levelling pad + outriggers
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), M.concrete);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    g.add(pad);

    // trailer chassis
    const trailer = new THREE.Group();
    trailer.position.y = 0.62;
    g.add(trailer);
    trailer.add(K.box(4.0, 0.42, 9.2, M.darkMetal, 0, 0, 0));
    for (const s of [-1, 1]) {
      trailer.add(K.box(0.26, 0.5, 9.0, M.galvanised, s * 1.8, 0.1, 0));
    }
    const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.4, 16);
    for (const [x, z] of [[-2.0, 2.6], [2.0, 2.6], [-2.0, 1.5], [2.0, 1.5], [-2.0, -2.4], [2.0, -2.4]]) {
      const w = new THREE.Mesh(wheelGeo, M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -0.04, z);
      w.castShadow = true;
      trailer.add(w);
    }
    for (const [x, z] of [[-2.2, 4.0], [2.2, 4.0], [-2.2, -4.0], [2.2, -4.0]]) {
      trailer.add(K.cyl(0.09, 0.09, 0.8, 8, M.hydraulic, x, -0.4, z));
      trailer.add(K.box(0.6, 0.12, 0.6, M.darkMetal, x, -0.78, z));
    }
    // equipment housings on the deck
    trailer.add(K.box(3.6, 1.5, 3.0, M.corrugated, 0, 0.96, -2.6));
    trailer.add(K.box(1.6, 0.9, 1.2, M.panelGrey, -0.9, 0.66, 2.9));
    trailer.add(K.ladder(1.6).translateX(1.9).translateZ(3.2).rotateY(Math.PI / 2));

    // rotating pedestal with a tilted planar array
    const pedestal = new THREE.Group();
    pedestal.position.set(0, 1.05, 0.4);
    trailer.add(pedestal);
    pedestal.add(K.cyl(1.05, 1.25, 0.7, 20, M.panelGrey, 0, 0.35, 0));
    pedestal.add(K.boltRing(1.1, 20, M.steel).translateY(0.03).rotateX(-Math.PI / 2));

    const turret = new THREE.Group();
    turret.position.y = 0.72;
    pedestal.add(turret);
    turret.add(K.cyl(0.85, 0.95, 0.5, 18, M.panelSand, 0, 0.25, 0));

    const arrayGroup = new THREE.Group();
    arrayGroup.position.y = 0.5;
    arrayGroup.rotation.x = -0.42; // tilted back for search
    turret.add(arrayGroup);

    const faceW = 4.4;
    const faceH = 3.4;
    const frame = K.box(faceW, faceH, 0.34, M.panelSand, 0, faceH / 2, 0);
    arrayGroup.add(frame);
    // radiating face: instanced element grid
    const elemGeo = new THREE.BoxGeometry(0.14, 0.14, 0.05);
    const cols = 22;
    const rows = 17;
    const elems = new THREE.InstancedMesh(elemGeo, M.darkMetal, cols * rows);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        m4.setPosition(
          (cIdx / (cols - 1) - 0.5) * (faceW - 0.5),
          faceH / 2 + (r / (rows - 1) - 0.5) * (faceH - 0.5),
          0.19,
        );
        elems.setMatrixAt(k++, m4);
      }
    }
    elems.castShadow = false;
    arrayGroup.add(elems);
    const faceGlassMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038, roughness: 0.35, metalness: 0.55, emissive: 0x0a2030, emissiveIntensity: 0.4,
    });
    const faceGlass = new THREE.Mesh(new THREE.PlaneGeometry(faceW - 0.34, faceH - 0.34), faceGlassMat);
    faceGlass.position.set(0, faceH / 2, 0.215);
    arrayGroup.add(faceGlass);
    this.radarFaceMaterial = faceGlassMat;
    // stiffener ribs on the back
    for (let i = 0; i < 5; i++) {
      arrayGroup.add(K.box(0.1, faceH - 0.2, 0.28, M.galvanised, (i / 4 - 0.5) * (faceW - 0.6), faceH / 2, -0.28));
    }
    arrayGroup.add(K.box(faceW + 0.2, 0.16, 0.5, M.galvanised, 0, faceH + 0.1, -0.1));
    // hydraulic tilt rams
    for (const s of [-1, 1]) {
      const ram = K.hydraulicRam(1.5);
      ram.position.set(s * 1.5, 0.05, -0.9);
      ram.rotation.x = 0.62;
      arrayGroup.add(ram);
    }
    // IFF whip antennas + warning strobes on the array frame
    for (const s of [-1, 1]) {
      arrayGroup.add(K.cyl(0.012, 0.02, 1.4, 5, M.steel, s * (faceW / 2 - 0.15), faceH + 0.8, 0));
      const strobe = K.warningBeacon(0xff3a2a);
      strobe.position.set(s * (faceW / 2 - 0.05), faceH + 0.16, 0);
      arrayGroup.add(markDynamic(strobe));
      this.beacons.push(strobe.userData.rotor);
    }
    markDynamic(turret);
    this.radarTurret = turret;
    this.radarArray = arrayGroup;
    this.rotators.push({ obj: turret, axis: 'y', speed: 0.62 });

    // secondary rotating dish on its own mast
    const dishMast = new THREE.Group();
    dishMast.position.set(-6.2, 0, -3.2);
    g.add(dishMast);
    dishMast.add(K.box(1.6, 0.3, 1.6, M.concreteDark, 0, 0.15, 0));
    dishMast.add(K.cyl(0.16, 0.2, 5.4, 12, M.galvanised, 0, 2.85, 0));
    const dishHead = new THREE.Group();
    dishHead.position.y = 5.6;
    dishMast.add(dishHead);
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.36),
      new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide }),
    );
    bowl.rotation.x = -Math.PI / 2 + 0.28;
    bowl.castShadow = true;
    dishHead.add(bowl);
    // dish support struts + feed horn
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const strut = K.cyl(0.022, 0.022, 1.5, 5, M.steel, Math.cos(a) * 0.6, 0.45, Math.sin(a) * 0.6 + 0.5);
      strut.rotation.x = -0.9;
      dishHead.add(strut);
    }
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), M.brass);
    horn.rotation.x = -Math.PI / 2 + 0.28 + Math.PI;
    horn.position.set(0, 0.55, 1.15);
    dishHead.add(horn);
    dishHead.add(K.cyl(0.3, 0.34, 0.5, 12, M.panelGrey, 0, -0.3, 0));
    this.rotators.push({ obj: dishHead, axis: 'y', speed: -0.9 });
    markDynamic(dishHead);
    this.radarDish = dishHead;

    // generator + cable runs feeding the radar
    const gen = K.generator(rng, { scale: 1.15 });
    gen.position.set(6.4, 0, -2.4);
    gen.rotation.y = -0.5;
    g.add(gen);
    g.add(K.cable(new THREE.Vector3(5.2, 0.7, -2.0), new THREE.Vector3(1.9, 0.7, -1.2), { sag: 0.4, radius: 0.05 }));
    g.add(K.cable(new THREE.Vector3(5.3, 0.55, -2.6), new THREE.Vector3(2.0, 0.55, -2.0), { sag: 0.45, radius: 0.04 }));
    g.add(K.cableCoil(0.6, 4).translateX(4.0).translateZ(1.4));

    // barriers + signage around the radar
    for (let i = 0; i < 6; i++) {
      const b = K.jerseyBarrier(3);
      const a = (i / 6) * Math.PI * 2;
      b.position.set(Math.cos(a) * 10.5, 0, Math.sin(a) * 8.6);
      b.rotation.y = -a + Math.PI / 2;
      g.add(b);
      this.collision.addObjectAABB(b, 'barrier');
    }
    const sign = new THREE.Group();
    sign.position.set(0, 0, 8.2);
    sign.add(K.cyl(0.05, 0.05, 2.0, 6, M.galvanised, -0.6, 1.0, 0));
    sign.add(K.cyl(0.05, 0.05, 2.0, 6, M.galvanised, 0.6, 1.0, 0));
    const board = K.box(1.7, 1.0, 0.06, M.panelWhite, 0, 1.7, 0);
    sign.add(board);
    const warn = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.85),
      new THREE.MeshStandardMaterial({
        map: T.stencil('RF HAZARD', { w: 512, h: 256, color: '#d21f16', font: 'bold 84px "Arial Narrow", Impact, sans-serif' }),
        transparent: true, roughness: 0.8,
      }),
    );
    warn.position.set(0, 1.7, 0.04);
    sign.add(warn);
    g.add(sign);

    this.radarStation = g;
    this.group.add(g);

    g.updateWorldMatrix(true, true);
    this.collision.addBox(new THREE.Vector3(RADAR_ORIGIN.x, 1.4, RADAR_ORIGIN.z), new THREE.Vector3(5.2, 2.8, 9.6), 'radar');
    this.collision.addObjectAABB(gen, 'generator');
    this.collision.addBox(new THREE.Vector3(RADAR_ORIGIN.x - 6.0, 2.7, RADAR_ORIGIN.z - 3.0), new THREE.Vector3(1.8, 5.4, 1.8), 'mast');
  }

  // -------------------------------------------------------------------------
  // Perimeter, lighting and clutter
  // -------------------------------------------------------------------------

  buildPerimeter() {
    const M = mats();
    const g = new THREE.Group();
    g.name = 'perimeter';
    const x0 = -130;
    const x1 = 126;
    const z0 = -122;
    const z1 = 96;

    const runs = [
      { a: new THREE.Vector3(x0, 0, z0), b: new THREE.Vector3(x1, 0, z0) },
      { a: new THREE.Vector3(x1, 0, z0), b: new THREE.Vector3(x1, 0, z1) },
      { a: new THREE.Vector3(x1, 0, z1), b: new THREE.Vector3(x0, 0, z1) },
      { a: new THREE.Vector3(x0, 0, z1), b: new THREE.Vector3(x0, 0, z0) },
    ];
    for (const { a, b } of runs) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      // leave a vehicle gate in the middle of the south run
      const segments = (a.z === z1 && b.z === z1) ? [[0, 0.42], [0.58, 1]] : [[0, 1]];
      for (const [t0, t1] of segments) {
        const p0 = a.clone().lerp(b, t0);
        const p1 = a.clone().lerp(b, t1);
        const segLen = p0.distanceTo(p1);
        const f = K.fenceRun(segLen, { height: 2.7 });
        f.position.copy(p0).add(p1).multiplyScalar(0.5);
        f.position.y = this.terrainHeight(f.position.x, f.position.z);
        f.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2;
        g.add(f);
        this.collision.addBox(
          new THREE.Vector3(f.position.x, 1.35, f.position.z),
          new THREE.Vector3(
            Math.abs(Math.cos(f.rotation.y)) * segLen + 0.4,
            2.7,
            Math.abs(Math.sin(f.rotation.y)) * segLen + 0.4,
          ),
          'fence',
        );
      }
    }
    // gatehouse at the south entrance
    const gate = new THREE.Group();
    gate.position.set(-6, 0, z1);
    const hut = K.box(3.0, 2.7, 3.0, M.corrugated, -7.0, 1.35, 1.8);
    gate.add(hut);
    gate.add(K.box(3.4, 0.2, 3.4, M.panelOlive, -7.0, 2.8, 1.8));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), M.darkGlass);
    win.position.set(-7.0, 1.7, 3.32);
    gate.add(win);
    // boom barrier
    const boomPivot = new THREE.Group();
    boomPivot.position.set(-4.6, 1.1, 0);
    const boom = K.box(9.0, 0.16, 0.16, M.hazard, 4.5, 0, 0);
    boomPivot.add(boom);
    boomPivot.rotation.z = 0.02;
    gate.add(markDynamic(boomPivot));
    gate.add(K.cyl(0.14, 0.16, 1.1, 10, M.panelGrey, -4.6, 0.55, 0));
    this.gateBoom = boomPivot;
    g.add(gate);
    this.collision.addObjectAABB(hut, 'gatehouse');

    // watch towers at two corners
    for (const [cx, cz] of [[x0 + 6, z0 + 6], [x1 - 6, z1 - 6]]) {
      const tower = new THREE.Group();
      tower.position.set(cx, this.terrainHeight(cx, cz), cz);
      for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
        tower.add(K.cyl(0.09, 0.11, 6.4, 7, M.galvanised, dx, 3.2, dz));
      }
      for (let r = 1; r <= 4; r++) {
        const y = r * 1.4;
        tower.add(K.box(2.4, 0.06, 0.06, M.galvanised, 0, y, -1.1));
        tower.add(K.box(2.4, 0.06, 0.06, M.galvanised, 0, y, 1.1));
        tower.add(K.box(0.06, 0.06, 2.4, M.galvanised, -1.1, y, 0));
        tower.add(K.box(0.06, 0.06, 2.4, M.galvanised, 1.1, y, 0));
      }
      tower.add(K.box(3.0, 0.16, 3.0, M.darkMetal, 0, 6.5, 0));
      tower.add(K.box(3.0, 1.5, 0.1, M.corrugated, 0, 7.3, -1.45));
      tower.add(K.box(0.1, 1.5, 3.0, M.corrugated, -1.45, 7.3, 0));
      tower.add(K.box(3.4, 0.14, 3.4, M.panelOlive, 0, 8.7, 0));
      for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
        tower.add(K.cyl(0.05, 0.05, 2.1, 6, M.galvanised, dx, 7.6, dz));
      }
      tower.add(K.ladder(6.4).translateZ(1.35).translateY(0));
      const searchlight = this._buildSearchlight();
      searchlight.position.set(0.9, 6.9, 0.9);
      tower.add(markDynamic(searchlight));
      this.searchlights = this.searchlights || [];
      this.searchlights.push(searchlight);
      g.add(tower);
      this.collision.addBox(new THREE.Vector3(cx, 3.2, cz), new THREE.Vector3(2.6, 6.4, 2.6), 'tower');
    }

    this.group.add(g);
  }

  _buildSearchlight() {
    const M = mats();
    const g = new THREE.Group();
    g.add(K.cyl(0.14, 0.18, 0.5, 10, M.darkMetal, 0, 0.25, 0));
    const yoke = new THREE.Group();
    yoke.position.y = 0.55;
    g.add(yoke);
    const head = new THREE.Group();
    yoke.add(head);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.6, 16), M.panelGrey);
    drum.rotation.x = Math.PI / 2;
    drum.castShadow = true;
    head.add(drum);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.36, 18), M.lampGlassOff);
    lens.position.z = 0.31;
    head.add(lens);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xdfeaff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 130, 20, 1, true), beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.z = 65;
    beam.visible = false;
    head.add(beam);
    const spot = new THREE.SpotLight(0xdfeaff, 0, 220, 0.09, 0.45, 1.2);
    spot.position.set(0, 0, 0.3);
    spot.target.position.set(0, 0, 40);
    head.add(spot);
    head.add(spot.target);
    g.userData = { yoke, head, beam, beamMat, lens, spot };
    return g;
  }

  buildFloodlights() {
    const positions = [
      [-64, 12], [26, 24], [-30, -58], [40, -62], [-72, -12], [70, -6], [4, -96], [-100, -80],
    ];
    for (const [x, z] of positions) {
      const mast = K.floodlightMast(8.2);
      mast.position.set(x, this.terrainHeight(x, z), z);
      mast.rotation.y = Math.atan2(-x, -z) + Math.PI;
      markDynamic(mast.userData.head);
      this.group.add(mast);
      // one shared spot per mast, aimed inwards and downwards
      const spot = new THREE.SpotLight(0xffe8c4, 0, 90, 0.62, 0.55, 1.4);
      spot.position.set(x, 8.4, z);
      const tx = x * 0.35;
      const tz = z * 0.35;
      spot.target.position.set(tx, 0, tz);
      this.group.add(spot);
      this.group.add(spot.target);
      this.floodlights.push({ mast, spot, lamps: mast.userData.lamps });
      this.collision.addCylinder(new THREE.Vector3(x, 4, z), 0.6, 8, 'mast');
    }
  }

  buildProps() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'props';

    // support vehicles parked along the apron
    const vehicles = [
      { kind: 'truck', x: -34, z: 26, ry: 0.4 },
      { kind: 'truck', x: -26, z: 26, ry: 0.4 },
      { kind: 'utility', x: 14, z: 30, ry: -1.2 },
      { kind: 'utility', x: 20, z: 34, ry: -1.1 },
      { kind: 'truck', x: 46, z: 12, ry: 1.6 },
    ];
    for (const v of vehicles) {
      const mesh = v.kind === 'truck' ? K.supportTruck(rng, { tarp: rng.bool(0.7) }) : K.utilityTruck(rng);
      mesh.position.set(v.x, 0, v.z);
      mesh.rotation.y = v.ry;
      g.add(mesh);
      const fp = mesh.userData.footprint;
      const cosA = Math.abs(Math.cos(v.ry));
      const sinA = Math.abs(Math.sin(v.ry));
      this.collision.addBox(
        new THREE.Vector3(v.x, fp.h / 2, v.z),
        new THREE.Vector3(fp.w * cosA + fp.d * sinA, fp.h, fp.w * sinA + fp.d * cosA),
        'vehicle',
      );
    }

    // generators and power distribution near the apron
    for (const [x, z, ry] of [[-40, 8, 0.3], [28, -26, -0.8]]) {
      const gen = K.generator(rng);
      gen.position.set(x, 0, z);
      gen.rotation.y = ry;
      g.add(gen);
      this.collision.addObjectAABB(gen, 'generator');
      g.add(K.cableCoil(0.55, 3).translateX(x + 2.4).translateZ(z + 1.2));
    }

    // antenna farm
    for (const [x, z, h] of [[-88, 30, 12], [-80, 34, 9], [60, 30, 14]]) {
      const mast = K.antennaMast(h, { dish: h > 11, rng });
      mast.position.set(x, this.terrainHeight(x, z), z);
      g.add(mast);
      markDynamic(mast.userData.beacon, mast.userData.dish);
      this.beacons.push(mast.userData.beacon);
      if (mast.userData.dish) this.rotators.push({ obj: mast.userData.dish, axis: 'y', speed: 0.15 });
      this.collision.addCylinder(new THREE.Vector3(x, 3, z), 0.7, 6, 'mast');
    }

    // barrier lines along the roads
    const barrierRuns = [
      { x: -20, z: -6, n: 8, ry: 0, step: 3.1, dir: [0, 1] },
      { x: 12, z: 4, n: 6, ry: Math.PI / 2, step: 3.1, dir: [1, 0] },
      { x: -6, z: -34, n: 7, ry: Math.PI / 2, step: 3.1, dir: [1, 0] },
    ];
    for (const run of barrierRuns) {
      for (let i = 0; i < run.n; i++) {
        const b = K.jerseyBarrier(3);
        const x = run.x + run.dir[0] * (i - run.n / 2) * run.step;
        const z = run.z + run.dir[1] * (i - run.n / 2) * run.step;
        b.position.set(x, 0, z);
        b.rotation.y = run.ry;
        g.add(b);
        this.collision.addBox(new THREE.Vector3(x, 0.5, z), new THREE.Vector3(run.dir[1] ? 3.1 : 0.7, 1.0, run.dir[1] ? 0.7 : 3.1), 'barrier');
      }
    }
    // gabion revetments
    for (const [x, z, ry, len] of [[-74, 4, 0, 10], [50, 22, Math.PI / 2, 8]]) {
      const w = K.gabionWall(len, 1.5);
      w.position.set(x, 0, z);
      w.rotation.y = ry;
      g.add(w);
      this.collision.addObjectAABB(w, 'gabion');
    }

    // equipment clutter around the apron
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(16, 52);
      const x = -6 + Math.cos(a) * r;
      const z = -6 + Math.sin(a) * r * 0.8;
      if (Math.hypot(x - SHELTER_ORIGIN.x, z - SHELTER_ORIGIN.z) < 14) continue;
      let prop;
      const roll = rng.float();
      if (roll < 0.35) prop = K.crateStack(rng);
      else if (roll < 0.6) prop = K.equipmentCase(0.9, 0.5, 0.65, rng.bool() ? M.olivePlain : M.panelGrey);
      else if (roll < 0.8) prop = K.cableCoil(0.5 + rng.float() * 0.3, 3);
      else {
        prop = new THREE.Group();
        const drum = K.cyl(0.3, 0.3, 0.85, 14, M.rusted, 0, 0.43, 0);
        prop.add(drum);
        for (let rr = 0; rr < 3; rr++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.02, 5, 14), M.darkMetal);
          rib.rotation.x = Math.PI / 2;
          rib.position.y = 0.15 + rr * 0.28;
          prop.add(rib);
        }
      }
      prop.position.set(x, 0, z);
      prop.rotation.y = rng.range(0, Math.PI * 2);
      g.add(prop);
      if (roll < 0.6) this.collision.addObjectAABB(prop, 'clutter');
    }

    // windsock: a nice readable motion cue for the sky
    const sock = new THREE.Group();
    sock.position.set(24, 0, 16);
    sock.add(K.cyl(0.09, 0.12, 6.0, 10, M.galvanised, 0, 3.0, 0));
    const sockMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.16, 1.9, 12, 3, true),
      new THREE.MeshStandardMaterial({ color: 0xe1622a, roughness: 0.9, side: THREE.DoubleSide }),
    );
    sockMesh.rotation.z = Math.PI / 2;
    sockMesh.position.set(1.0, 5.9, 0);
    sock.add(sockMesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 14), M.steel);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.06, 5.9, 0);
    sock.add(ring);
    this.windsock = markDynamic(sockMesh);
    g.add(sock);
    this.collision.addCylinder(new THREE.Vector3(24, 3, 16), 0.4, 6, 'mast');

    // fuel bladder + water tank
    const bladder = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 12), M.canvasTarp);
    bladder.scale.set(1.5, 0.42, 1.0);
    bladder.position.set(-58, 1.0, 22);
    bladder.castShadow = true;
    g.add(bladder);
    this.collision.addBox(new THREE.Vector3(-58, 0.5, 22), new THREE.Vector3(7.2, 1.6, 4.8), 'bladder');
    const tank = K.cyl(1.5, 1.5, 4.4, 18, M.panelWhite, -50, 2.2, 24);
    tank.rotation.z = Math.PI / 2;
    g.add(tank);
    for (const s of [-1, 1]) g.add(K.box(0.5, 2.0, 1.6, M.galvanised, -50 + s * 1.6, 1.0, 24));
    this.collision.addBox(new THREE.Vector3(-50, 1.6, 24), new THREE.Vector3(4.8, 3.2, 3.2), 'tank');

    // camouflage netting canopy over a parking area
    const net = new THREE.Mesh(new THREE.PlaneGeometry(18, 12, 8, 6), M.camoNet);
    {
      const p = net.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, Math.cos((x / 18) * Math.PI) * 0.9 + Math.cos((y / 12) * Math.PI) * 0.6 + rng.range(-0.15, 0.15));
      }
      net.geometry.computeVertexNormals();
    }
    net.rotation.x = -Math.PI / 2;
    net.position.set(-30, 4.6, 26);
    g.add(net);
    for (const [dx, dz] of [[-8.6, -5.6], [8.6, -5.6], [-8.6, 5.6], [8.6, 5.6], [0, -5.6], [0, 5.6]]) {
      const pole = K.cyl(0.06, 0.07, 4.6, 7, M.galvanised, -30 + dx, 2.3, 26 + dz);
      g.add(pole);
    }

    this.group.add(g);
  }

  build() {
    this.buildTerrain();
    this.buildGroundworks();
    this.buildShelter();
    this.buildRadarStation();
    this.buildPerimeter();
    this.buildFloodlights();
    this.buildProps();
    // collapse the kit-bashed static geometry into a handful of draw calls
    this.mergeStats = mergeStatic(this.group, { tag: 'site' });
    return this;
  }

  // -------------------------------------------------------------------------
  // Runtime
  // -------------------------------------------------------------------------

  /** Turn base lighting on/off for night conditions. */
  setNight(isNight, intensityScale = 1) {
    for (const f of this.floodlights) {
      f.spot.intensity = isNight ? 620 * intensityScale : 0;
      for (const lamp of f.lamps) lamp.material = isNight ? mats().lampGlassOn : mats().lampGlassOff;
    }
    for (const l of this.lampLights) {
      if (l.light) l.light.intensity = isNight ? 9 : 3.4;
      if (l.bulbMesh) l.bulbMesh.material = isNight ? mats().lampGlassOn : mats().lampGlassOff;
    }
    this.nightMode = isNight;
    for (const s of this.searchlights || []) {
      s.userData.beam.visible = isNight;
      s.userData.spot.intensity = isNight ? 900 : 0;
      s.userData.lens.material = isNight ? mats().lampGlassOn : mats().lampGlassOff;
    }
  }

  /** Searchlights sweep only during the night raid scenario. */
  setSearchlightsActive(active) {
    this.searchActive = active;
    for (const s of this.searchlights || []) {
      s.userData.beamMat.opacity = active ? 0.06 : 0.0;
      s.userData.beam.visible = active;
    }
  }

  update(dt, elapsed) {
    this.time += dt;
    for (const r of this.rotators) {
      r.obj.rotation[r.axis] += r.speed * dt;
    }
    // radar array performs a sector sweep rather than a constant spin
    if (this.radarTurret) {
      this.radarTurret.rotation.y = Math.sin(this.time * 0.34) * 1.5 - 0.4;
    }
    // beacon flashes
    const flash = (Math.sin(this.time * 3.1) * 0.5 + 0.5) ** 3;
    for (const b of this.beacons) {
      if (!b) continue;
      if (b.material) {
        if (b.material.emissiveIntensity !== undefined) b.material.emissiveIntensity = 0.6 + flash * 7;
        else if (b.material.opacity !== undefined) b.material.opacity = 0.2 + flash * 0.8;
      }
      if (b.rotation) b.rotation.y += dt * 5.2;
    }
    // windsock drifts
    if (this.windsock) {
      this.windsock.rotation.x = Math.sin(this.time * 0.9) * 0.14;
      this.windsock.rotation.y = Math.PI / 2 + Math.sin(this.time * 0.5) * 0.2;
    }
    // searchlight sweep
    if (this.searchlights && this.searchActive) {
      for (let i = 0; i < this.searchlights.length; i++) {
        const s = this.searchlights[i];
        const t = this.time * 0.32 + i * 2.1;
        s.userData.yoke.rotation.y = Math.sin(t) * 1.5;
        s.userData.head.rotation.x = -0.55 + Math.sin(t * 1.7) * 0.3;
      }
    }
    // radar face emissive pulse conveys "radiating"
    if (this.radarFaceMaterial) {
      this.radarFaceMaterial.emissiveIntensity = 0.25 + (Math.sin(this.time * 5) * 0.5 + 0.5) * 0.35;
    }
    if (this.gateBoom) this.gateBoom.rotation.z = 0.02 + Math.sin(this.time * 0.2) * 0.01;
  }
}
