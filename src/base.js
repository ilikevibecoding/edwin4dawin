// Fictional air-defense base "COBALT MESA" — terrain, perimeter, command
// shelter, radar site, support equipment. Everything procedural.
import * as THREE from 'three';
import { Kit, instanced, cableCurve } from './kit.js';
import { BoxCollider, groundHeight } from './physics.js';
import { fbm2, mulberry32 } from './rng.js';
import {
  groundTexture, asphaltTexture, concreteTexture, hazardStripesTexture,
  chainlinkTexture, metalPanelTexture, corrugatedTexture, stencilTexture,
  warnSignTexture, scorchTexture, glowTexture, hescoTexture,
} from './texgen.js';

export class Base {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'base';
    this.colliders = [];
    this.interactables = [];
    this.strobes = [];       // { mat, phase, period }
    this.nightMats = [];     // { mat, day, night } emissiveIntensity lerp
    this.nightLights = [];   // { light, day, night }
    this.nightSprites = [];  // { spr, day, night } opacity
    this.searchlights = [];  // { yoke, drum, cone, basePos, phase }
    this.radarHeads = [];    // { obj, speed }
    this.consoleScreens = {};// filled with mesh refs for radar module to bind
    this.time = 0;

    this._materials();
    this._terrain();
    this._roadsAndPads();
    this._fence();
    this._shelter();
    this._radarSite();
    this._support();
    this._searchlightTowers();

    ctx.scene.add(this.group);
  }

  // ------------------------------------------------------------ materials
  _materials() {
    const olive = metalPanelTexture('#5b6553', 7);
    const oliveDark = metalPanelTexture('#454e3e', 21);
    const tan = metalPanelTexture('#8a7f62', 33);
    const corru = corrugatedTexture('#5f6857', 12);
    this.mats = {
      olive: new THREE.MeshStandardMaterial({ map: olive, roughness: 0.82, metalness: 0.25 }),
      oliveDark: new THREE.MeshStandardMaterial({ map: oliveDark, roughness: 0.85, metalness: 0.3 }),
      tan: new THREE.MeshStandardMaterial({ map: tan, roughness: 0.9, metalness: 0.15 }),
      corru: new THREE.MeshStandardMaterial({ map: corru, roughness: 0.85, metalness: 0.35 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.5, metalness: 0.75 }),
      galv: new THREE.MeshStandardMaterial({ color: 0xb9bec2, roughness: 0.55, metalness: 0.6 }),
      // weathered fence steel: darker + rougher so posts/rails don't read as
      // bright floating lines at distance
      steel: new THREE.MeshStandardMaterial({ color: 0x63686b, roughness: 0.78, metalness: 0.45 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.9, metalness: 0.2 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x161719, roughness: 0.95 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0e161e, roughness: 0.12, metalness: 0.9 }),
      concrete: new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.95 }),
      asphalt: new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.97 }),
      hazard: new THREE.MeshStandardMaterial({ map: hazardStripesTexture('#8f7a2a', '#232323'), roughness: 0.9 }),
      white: new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.9 }),
      // dull dome/dish shell that won't blow out in direct sun
      dome: new THREE.MeshStandardMaterial({
        color: 0x999e95, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.45, flatShading: true,
      }),
      sand: new THREE.MeshStandardMaterial({ color: 0xa4906c, roughness: 1 }),
      hesco: new THREE.MeshStandardMaterial({ map: hescoTexture(), roughness: 0.95 }),
      redPlastic: new THREE.MeshStandardMaterial({ color: 0x8c2420, roughness: 0.6 }),
      cone: new THREE.MeshStandardMaterial({ map: trafficConeTexture(), roughness: 0.72 }),
      fabric: new THREE.MeshStandardMaterial({ map: tentFabricTexture(), roughness: 0.96, side: THREE.DoubleSide }),
      container: new THREE.MeshStandardMaterial({ map: corrugatedTexture('#84867e', 41), roughness: 0.8, metalness: 0.3 }),
    };
    this.glowTex = glowTexture();
    this.scorchTex = scorchTexture();
  }

  _lampMat(color, day = 0.0, night = 3.4) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x11130f, emissive: new THREE.Color(color), emissiveIntensity: day, roughness: 0.4,
    });
    this.nightMats.push({ mat: m, day, night });
    return m;
  }

  // Blinking indicator/beacon material. Deliberately NOT registered in
  // nightMats — the night dimmer used to overwrite the blink every frame.
  _strobeMat(color, hi = 3.2, lo = 0.12, period = 1.5, phase = 0) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x11130f, emissive: new THREE.Color(color), emissiveIntensity: lo, roughness: 0.4,
    });
    this.strobes.push({ mat: m, phase, period, hi, lo });
    return m;
  }

  _glowSprite(color, size, day = 0, night = 0.55) {
    const m = new THREE.SpriteMaterial({
      map: this.glowTex, color, transparent: true, opacity: day,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(size);
    this.nightSprites.push({ spr: s, day, night });
    return s;
  }

  // ------------------------------------------------------------ terrain
  _terrain() {
    const SIZE = 11000, SEG = 150;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(1, 1, 1);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z));
      // subtle tonal variation with distance & noise so tiling reads less
      const n = fbm2(x * 0.0008 + 40, z * 0.0008 + 9, 3);
      const r = Math.hypot(x, z);
      const dry = Math.min(1, Math.max(0, (r - 400) / 3000));
      base.setRGB(
        0.92 + n * 0.18 - dry * 0.05,
        0.92 + n * 0.16 - dry * 0.02,
        0.92 + n * 0.13 + dry * 0.03,
      );
      colors[i * 3] = base.r; colors[i * 3 + 1] = base.g; colors[i * 3 + 2] = base.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const gt = groundTexture();
    gt.repeat.set(150, 150);
    const mat = new THREE.MeshStandardMaterial({ map: gt, roughness: 1, vertexColors: true });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.ground.name = 'terrain';
    this.group.add(this.ground);

    // --- mountain rings
    this._mountains(3600, 900, 420, 0x6d5c48, 17);
    this._mountains(5600, 1500, 760, 0x5d5348, 55);
    // a few closer mesas
    const kit = new Kit();
    const mesaMat = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 1, flatShading: true });
    const rnd = mulberry32(88);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd() * 0.8;
      const r = 1300 + rnd() * 900;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 60 + rnd() * 110, rad = 120 + rnd() * 220;
      const g = new THREE.CylinderGeometry(rad * (0.5 + rnd() * 0.3), rad, h, 9, 3);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const vx = p.getX(v), vz = p.getZ(v);
        const nn = fbm2(vx * 0.02 + i * 9, vz * 0.02, 3);
        p.setX(v, vx * (0.85 + nn * 0.35));
        p.setZ(v, vz * (0.85 + nn * 0.35));
      }
      g.computeVertexNormals();
      kit.addGeo(g, mesaMat, x, groundHeight(x, z) + h / 2 - 6, z);
    }
    this.group.add(kit.build({ castShadow: false, name: 'mesas' }));
  }

  _mountains(radius, maxH, minH, color, seed) {
    const SEGS = 220, RINGS = 6;
    const geo = new THREE.CylinderGeometry(radius, radius * 1.2, maxH, SEGS, RINGS, true);
    const pos = geo.attributes.position;
    const rnd = mulberry32(seed);
    const peaks = [];
    for (let i = 0; i < 34; i++) peaks.push({ a: rnd() * Math.PI * 2, w: 0.05 + rnd() * 0.22, h: 0.3 + rnd() * 0.7 });
    const base = new THREE.Color(color);
    const rock = new THREE.Color(color).multiplyScalar(0.82).lerp(new THREE.Color(0x777d80), 0.35);
    const high = new THREE.Color(color).lerp(new THREE.Color(0xb8ac96), 0.5);
    const colors = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      // ridged noise profile along the ring
      const rn = fbm2(Math.cos(ang) * 6 + seed, Math.sin(ang) * 6, 5);
      const ridged = 1 - Math.abs(2 * rn - 1);
      let ridge = 0.1 + ridged * ridged * 0.42;
      for (const p of peaks) {
        let d = Math.abs(ang - p.a);
        d = Math.min(d, Math.PI * 2 - d);
        ridge = Math.max(ridge, p.h * Math.exp(-(d * d) / (p.w * p.w)) * (0.75 + ridged * 0.4));
      }
      const yn = (y / maxH) + 0.5; // 0 bottom, 1 top
      // sharpen silhouettes: nonlinear vertical profile + fine detail
      const detail = (fbm2(ang * 22 + seed * 7, yn * 5 + seed, 3) - 0.5) * 0.16 * yn;
      const prof = Math.pow(yn, 1.25);
      const newY = (prof * ridge + detail * ridge) * maxH - 12;
      pos.setY(i, Math.max(-12, newY) + minH * 0.001);
      const rj = 1 + (fbm2(ang * 9 + seed * 3, yn * 4, 4) - 0.5) * 0.2;
      pos.setX(i, x * rj); pos.setZ(i, z * rj);
      // color: valley base -> rocky mid -> pale top
      const hFrac = THREE.MathUtils.clamp(newY / (maxH * 0.7), 0, 1);
      tmp.copy(base).lerp(rock, THREE.MathUtils.smoothstep(hFrac, 0.15, 0.6));
      tmp.lerp(high, THREE.MathUtils.smoothstep(hFrac, 0.55, 1) * 0.7);
      const shade = 0.9 + (fbm2(ang * 30, yn * 8 + seed, 2) - 0.5) * 0.3;
      colors[i * 3] = tmp.r * shade;
      colors[i * 3 + 1] = tmp.g * shade;
      colors[i * 3 + 2] = tmp.b * shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, side: THREE.DoubleSide, vertexColors: true });
    const m = new THREE.Mesh(geo, mat);
    m.name = 'mountains';
    this.group.add(m);
  }

  // ------------------------------------------------------------ roads & pads
  _roadsAndPads() {
    const kit = new Kit();
    const markKit = new Kit();
    const roadY = 0.045;
    const roads = [
      [[0, 150], [0, 18], 7.5],
      [[0, 18], [-40, -12], 6],
      [[-40, -12], [-58, -30], 6],
      [[0, 18], [30, 32], 6],
      [[30, 32], [52, 40], 6],
      [[0, 18], [-30, 32], 6],
      [[-30, 32], [-52, 50], 6],
      [[0, 18], [24, -6], 5],
      [[24, -6], [36, -12], 5],
      [[-40, -12], [-80, -56], 5],
    ];
    let lift = 0;
    for (const [a, b, w] of roads) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz) + w * 0.9;
      const ang = Math.atan2(dx, dz);
      kit.plane(this.mats.asphalt, w, len,
        (a[0] + b[0]) / 2, roadY + lift, (a[1] + b[1]) / 2,
        -Math.PI / 2, 0, -ang);
      lift += 0.004;
    }
    // center dashes on main road
    for (let z = 140; z > 22; z -= 6) {
      markKit.plane(this.mats.white, 0.25, 2.4, 0, roadY + 0.05, z, -Math.PI / 2, 0, 0);
    }

    // battery + facility pads
    const pads = [
      { x: -58, z: -38, w: 30, d: 24, label: 'PAD A — PAC-X' },
      { x: 52, z: 44, w: 32, d: 26, label: 'PAD B — HALO' },
      { x: -52, z: 58, w: 32, d: 30, label: 'PAD C — SENTINEL' },
      { x: 36, z: -12, w: 20, d: 20, label: 'RADAR' },
      { x: -18, z: 8, w: 16, d: 12, label: null },
    ];
    // hazard strip with UVs repeated along its length so stripes stay diagonal
    const hazardStrip = (len, bw, x, z, rz) => {
      const g = new THREE.PlaneGeometry(len, bw);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 2.2));
      markKit.addGeo(g, this.mats.hazard, x, 0.17, z, -Math.PI / 2, 0, rz);
    };
    for (const p of pads) {
      kit.box(this.mats.concrete, p.w, 0.16, p.d, p.x, 0.08, p.z);
      // hazard border
      const bw = 0.55;
      hazardStrip(p.w, bw, p.x, p.z - p.d / 2 + bw / 2, 0);
      hazardStrip(p.w, bw, p.x, p.z + p.d / 2 - bw / 2, 0);
      hazardStrip(p.d - bw * 2, bw, p.x - p.w / 2 + bw / 2, p.z, Math.PI / 2);
      hazardStrip(p.d - bw * 2, bw, p.x + p.w / 2 - bw / 2, p.z, Math.PI / 2);
      if (p.label) {
        const st = stencilTexture(p.label, { size: 26, w: 512, h: 64 });
        const m = new THREE.MeshBasicMaterial({ map: st, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
        const q = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.25), m);
        q.rotation.x = -Math.PI / 2;
        q.position.set(p.x, 0.18, p.z + p.d / 2 - 2.2);
        this.group.add(q);
      }
    }

    // helipad
    kit.cyl(this.mats.concrete, 9, 9, 0.14, 28, -84, 0.07, -58);
    markKit.torus(this.mats.white, 7.2, 0.22, 6, 40, -84, 0.16, -58, -Math.PI / 2, 0, 0);
    markKit.box(this.mats.white, 0.5, 0.02, 5, -84, 0.16, -58);
    markKit.box(this.mats.white, 0.5, 0.02, 5, -81.8, 0.16, -58);
    markKit.box(this.mats.white, 4, 0.02, 0.5, -82.9, 0.16, -58);
    // helipad corner lights
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const lx = -84 + Math.cos(a) * 8, lz = -58 + Math.sin(a) * 8;
      const lm = this._lampMat(0x27e57a, 0.35, 2.6);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.16, 8), lm);
      lamp.position.set(lx, 0.22, lz);
      this.group.add(lamp);
    }

    const built = kit.build({ castShadow: false, name: 'roads' });
    built.children.forEach(c => { c.receiveShadow = true; });
    this.group.add(built);
    const marks = markKit.build({ castShadow: false, name: 'markings' });
    this.group.add(marks);

    // pre-existing launch scorch under each battery position
    const scMat = new THREE.MeshBasicMaterial({
      map: this.scorchTex, transparent: true, opacity: 0.85,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
    });
    for (const [x, z, s] of [[-58, -40, 9], [52, 42, 11], [-52, 58, 13]]) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(s, s), scMat);
      q.rotation.x = -Math.PI / 2;
      q.rotation.z = Math.random() * 6;
      q.position.set(x, 0.19, z);
      this.group.add(q);
    }
  }

  // ------------------------------------------------------------ perimeter
  _fence() {
    const X = 128, Z = 108, H = 2.5;
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, H + 0.35, 6);
    const posts = [];
    const addLine = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.round(len / 4);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        posts.push({ x: x0 + (x1 - x0) * t, y: (H + 0.35) / 2, z: z0 + (z1 - z0) * t });
      }
    };
    // gate gap on south side x in [-5, 5]
    addLine(-X, -Z, X, -Z);
    addLine(-X, Z, -5, Z);
    addLine(5, Z, X, Z);
    addLine(-X, -Z, -X, Z);
    addLine(X, -Z, X, Z);
    this.group.add(instanced(postGeo, this.mats.steel, posts, { castShadow: false }));

    // chainlink + top rail + barbed wire
    const linkTex = chainlinkTexture();
    const mkWire = (cx, cz, len, rotY) => {
      const t = linkTex.clone();
      t.needsUpdate = true;
      t.repeat.set(len / 1.6, 1.6);
      const m = new THREE.MeshStandardMaterial({
        map: t, transparent: true, alphaTest: 0.28, side: THREE.DoubleSide,
        roughness: 0.6, metalness: 0.7, color: 0xcfd4d6,
      });
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.15), m);
      w.position.set(cx, (H - 0.15) / 2 + 0.05, cz);
      w.rotation.y = rotY;
      w.castShadow = false;
      this.group.add(w);
    };
    mkWire(0, -Z, 2 * X, 0);
    mkWire((-X - 5) / 2, Z, X - 5, 0);
    mkWire((X + 5) / 2, Z, X - 5, 0);
    mkWire(-X, 0, 2 * Z, Math.PI / 2);
    mkWire(X, 0, 2 * Z, Math.PI / 2);

    const railKit = new Kit();
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      railKit.cyl(this.mats.steel, 0.026, 0.026, len, 5,
        (x0 + x1) / 2, H, (z0 + z1) / 2, Math.PI / 2, ang, 0);
      // 3 strands of barbed wire above (thin + near-black so they don't
      // sparkle at distance)
      for (let b = 0; b < 3; b++) {
        railKit.cyl(this.mats.rubber, 0.005, 0.005, len, 3,
          (x0 + x1) / 2, H + 0.12 + b * 0.11, (z0 + z1) / 2, Math.PI / 2, ang, 0);
      }
    };
    rail(-X, -Z, X, -Z); rail(-X, Z, -5, Z); rail(5, Z, X, Z);
    rail(-X, -Z, -X, Z); rail(X, -Z, X, Z);
    this.group.add(railKit.build({ castShadow: false, name: 'fencerails' }));

    // colliders (thin walls; gate gap open)
    this.colliders.push(
      new BoxCollider(0, -Z, X, 0.25, 0, H, 'fenceN'),
      new BoxCollider((-X - 5) / 2, Z, (X - 5) / 2, 0.25, 0, H, 'fenceS1'),
      new BoxCollider((X + 5) / 2, Z, (X - 5) / 2, 0.25, 0, H, 'fenceS2'),
      new BoxCollider(-X, 0, 0.25, Z, 0, H, 'fenceW'),
      new BoxCollider(X, 0, 0.25, Z, 0, H, 'fenceE'),
    );

    // warning signs (plate tinted down so the white doesn't blow out in sun)
    const signTex = warnSignTexture();
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex, color: 0xb5b2a6, roughness: 0.85, side: THREE.DoubleSide,
    });
    const signGeo = new THREE.PlaneGeometry(0.9, 0.62);
    const signs = [];
    for (let x = -X + 16; x < X; x += 32) {
      signs.push({ x, y: 1.5, z: -Z + 0.06 });
      signs.push({ x, y: 1.5, z: Z - 0.06, ry: Math.PI });
    }
    for (let z = -Z + 16; z < Z; z += 32) {
      signs.push({ x: -X + 0.06, y: 1.5, z, ry: Math.PI / 2 });
      signs.push({ x: X - 0.06, y: 1.5, z, ry: -Math.PI / 2 });
    }
    this.group.add(instanced(signGeo, signMat, signs, { castShadow: false }));

    // corner red beacons
    for (const [bx, bz] of [[-X, -Z], [X, -Z], [-X, Z], [X, Z]]) {
      const bm = this._strobeMat(0xff2a20, 2.6, 0.1, 1.6, Math.random() * 4);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bm);
      b.position.set(bx, H + 0.5, bz);
      this.group.add(b);
    }

    this._gate();
  }

  _gate() {
    const kit = new Kit();
    // guard hut
    const hx = 8.5, hz = 112;
    kit.box(this.mats.corru, 3, 2.6, 2.6, hx, 1.3, hz);
    kit.box(this.mats.dark, 3.1, 0.12, 2.7, hx, 2.66, hz);
    kit.box(this.mats.glass, 2.2, 0.7, 0.06, hx, 1.75, hz - 1.31);
    kit.box(this.mats.glass, 0.06, 0.7, 1.8, hx - 1.51, 1.75, hz);
    kit.box(this.mats.dark, 0.9, 1.9, 0.08, hx + 1.51, 1.15, hz + 0.4);
    this.colliders.push(new BoxCollider(hx, hz, 1.6, 1.4, 0, 2.7, 'hut'));

    // barrier arm
    kit.cyl(this.mats.dark, 0.16, 0.16, 1.1, 8, 4.6, 0.55, 110);
    const armMat = new THREE.MeshStandardMaterial({ map: hazardStripesTexture('#d8d8d2', '#b03028'), roughness: 0.6 });
    kit.cyl(armMat, 0.07, 0.07, 8.2, 8, 0.6, 1.05, 110, 0, 0, Math.PI / 2 - 0.5);

    // chicane jersey barriers
    const jGeo = this._jerseyGeo();
    const jerseys = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? -1 : 1;
      jerseys.push({ x: side * 3.4, y: 0, z: 118 + i * 7, ry: 0.35 * side });
      this.colliders.push(new BoxCollider(side * 3.4, 118 + i * 7, 1.9, 0.5, 0.35 * side, 1.1, 'jersey'));
    }
    // guarding shelter + pads
    const more = [
      { x: -10, z: 2, ry: 0.2 }, { x: -12, z: 15, ry: 1.7 },
      { x: 14, z: 4, ry: -0.4 }, { x: -70, z: -26, ry: 0.9 }, { x: 42, z: 32, ry: -0.7 },
    ];
    for (const j of more) {
      jerseys.push({ x: j.x, y: 0, z: j.z, ry: j.ry });
      this.colliders.push(new BoxCollider(j.x, j.z, 1.9, 0.5, j.ry, 1.1, 'jersey'));
    }
    this.group.add(instanced(jGeo, this.mats.concrete, jerseys));
    this.group.add(kit.build({ name: 'gate' }));
  }

  _jerseyGeo() {
    // classic jersey barrier profile, extruded
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0.42, 0.24);
    shape.lineTo(0.14, 0.58); shape.lineTo(0.12, 1.06); shape.lineTo(-0.12, 1.06);
    shape.lineTo(-0.14, 0.58); shape.lineTo(-0.42, 0.24); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.8, bevelEnabled: false });
    geo.translate(0, 0, -1.9);
    return geo;
  }

  // ------------------------------------------------------------ shelter
  _shelter() {
    const S = { x: -18, z: 8 };
    const kit = new Kit();
    const W = 7.4, D = 3.6, H = 2.9, t = 0.12;
    // darker corrugated tone for the shelter so the interior doesn't wash out
    const corruSh = new THREE.MeshStandardMaterial({
      map: corrugatedTexture('#4d5646', 12), roughness: 0.88, metalness: 0.3,
    });
    // floor & walls (door on +X end) — floor top sits above the concrete pad
    // (pad top is 0.16) so the interior isn't bare bright concrete
    kit.box(this.mats.dark, W, 0.1, D, S.x, 0.13, S.z);
    kit.box(corruSh, W, H, t, S.x, H / 2, S.z - D / 2);         // north wall
    kit.box(corruSh, W, H, t, S.x, H / 2, S.z + D / 2);         // south wall
    kit.box(corruSh, t, H, D, S.x - W / 2, H / 2, S.z);         // west wall
    // east wall with door gap
    kit.box(corruSh, t, H, (D - 1.1) / 2, S.x + W / 2, H / 2, S.z - D / 2 + (D - 1.1) / 4);
    kit.box(corruSh, t, H, (D - 1.1) / 2, S.x + W / 2, H / 2, S.z + D / 2 - (D - 1.1) / 4);
    kit.box(corruSh, t, H - 2.15, 1.1, S.x + W / 2, 2.15 + (H - 2.15) / 2, S.z); // lintel
    // roof + trim + gear
    kit.box(this.mats.olive, W + 0.3, 0.14, D + 0.3, S.x, H + 0.07, S.z);
    kit.box(this.mats.oliveDark, 1.1, 0.5, 0.8, S.x - 2.2, H + 0.39, S.z - 0.6); // AC
    kit.cyl(this.mats.metal, 0.03, 0.03, 2.6, 6, S.x - 3.2, H + 1.4, S.z + 1.2); // whip antenna
    kit.cyl(this.mats.dark, 0.16, 0.2, 0.5, 8, S.x + 1.8, H + 0.35, S.z + 0.9);  // vent
    // door steps + frame light
    kit.box(this.mats.concrete, 1.4, 0.18, 1.2, S.x + W / 2 + 0.7, 0.09, S.z);
    const domeMat = this._lampMat(0xff3524, 0.25, 2.6);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(S.x + W / 2 + 0.08, 2.42, S.z);
    dome.rotation.z = -Math.PI / 2;
    this.group.add(dome);

    // interior: console desk along west wall
    const deskX = S.x - W / 2 + 0.75;
    kit.box(this.mats.dark, 0.9, 0.08, 2.6, deskX, 0.86, S.z);
    kit.box(this.mats.oliveDark, 0.86, 0.78, 2.5, deskX, 0.42, S.z);
    // 3 tilted screens (materials assigned by radar module)
    const mkScreen = (dz, w, h, key) => {
      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: 0x061109 }),
      );
      scr.position.set(deskX - 0.18, 1.42, S.z + dz);
      scr.rotation.y = Math.PI / 2 - 0.0;
      scr.rotation.x = -0.16;
      this.group.add(scr);
      // bezel
      kit.box(this.mats.dark, 0.06, h + 0.1, w + 0.1, deskX - 0.22, 1.42, S.z + dz, 0, 0, 0);
      this.consoleScreens[key] = scr;
    };
    mkScreen(0, 1.05, 1.05, 'radar');
    mkScreen(-1.05, 0.8, 0.62, 'status');
    mkScreen(1.05, 0.8, 0.62, 'map');
    // keyboard, chair, rack
    kit.box(this.mats.dark, 0.34, 0.03, 0.62, deskX + 0.32, 0.91, S.z);
    kit.cyl(this.mats.dark, 0.28, 0.28, 0.06, 10, deskX + 1.1, 0.5, S.z);
    kit.cyl(this.mats.dark, 0.04, 0.04, 0.44, 6, deskX + 1.1, 0.26, S.z);
    kit.box(this.mats.dark, 0.5, 0.5, 0.06, deskX + 1.1, 0.86, S.z - 0.26);
    kit.box(this.mats.oliveDark, 0.7, 1.9, 0.7, S.x + 2.6, 0.95, S.z - D / 2 + 0.55); // server rack
    // rack LEDs
    for (let i = 0; i < 6; i++) {
      const lm = this._strobeMat(i % 3 === 0 ? 0xffaa22 : 0x2ae56a, 1.6, 0.3, 0.9 + i * 0.23, i * 0.7);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.012), lm);
      led.position.set(S.x + 2.38 + (i % 2) * 0.14, 1.55 - Math.floor(i / 2) * 0.3, S.z - D / 2 + 0.19);
      this.group.add(led);
    }
    // cable trays
    kit.box(this.mats.dark, 0.2, 0.06, 2.8, deskX - 0.4, 2.5, S.z);

    // interior lighting: ceiling strip fixture + two point lights (kept dim so
    // the corrugated walls read instead of washing out)
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x202020, emissive: 0xfff4e0, emissiveIntensity: 1.5, roughness: 0.4,
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.16), stripMat);
    strip.position.set(S.x, H - 0.1, S.z);
    this.group.add(strip);
    const inLight = new THREE.PointLight(0xfff2d8, 4.5, 10, 1.55);
    inLight.position.set(S.x + 0.6, H - 0.7, S.z);
    this.group.add(inLight);
    this.nightLights.push({ light: inLight, day: 4.5, night: 5.9 });
    const inLight2 = new THREE.PointLight(0xfff2d8, 2.1, 7, 1.6);
    inLight2.position.set(S.x - 2.2, H - 0.8, S.z);
    this.group.add(inLight2);
    this.nightLights.push({ light: inLight2, day: 2.1, night: 2.9 });

    // sandbags around entrance
    this._sandbagArc(S.x + W / 2 + 2.6, S.z, 2.4, -Math.PI * 0.4, Math.PI * 0.4);

    // colliders
    this.colliders.push(
      new BoxCollider(S.x, S.z - D / 2, W / 2, t, 0, H, 'sh-n'),
      new BoxCollider(S.x, S.z + D / 2, W / 2, t, 0, H, 'sh-s'),
      new BoxCollider(S.x - W / 2, S.z, t, D / 2, 0, H, 'sh-w'),
      new BoxCollider(S.x + W / 2, S.z - D / 2 + (D - 1.1) / 4, t, (D - 1.1) / 4, 0, H, 'sh-e1'),
      new BoxCollider(S.x + W / 2, S.z + D / 2 - (D - 1.1) / 4, t, (D - 1.1) / 4, 0, H, 'sh-e2'),
      new BoxCollider(deskX + 0.1, S.z, 0.55, 1.3, 0, 1.0, 'desk'),
      new BoxCollider(S.x + 2.6, S.z - D / 2 + 0.55, 0.36, 0.36, 0, 1.9, 'rack'),
    );

    // console interactable
    this.interactables.push({
      id: 'console', label: 'USE CONSOLE',
      pos: new THREE.Vector3(deskX + 0.6, 1.2, S.z), radius: 1.9,
    });
    this.consoleCam = {
      pos: new THREE.Vector3(deskX + 1.35, 1.5, S.z),
      look: new THREE.Vector3(deskX - 0.2, 1.35, S.z),
    };

    this.group.add(kit.build({ name: 'shelter' }));

    // flag pole
    const fk = new Kit();
    fk.cyl(this.mats.white, 0.05, 0.07, 8, 8, S.x + 6, 4, S.z + 7);
    fk.sphere(this.mats.white, 0.09, 8, 6, S.x + 6, 8.05, S.z + 7);
    this.group.add(fk.build({ name: 'flagpole' }));
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 128; flagCanvas.height = 80;
    const fg = flagCanvas.getContext('2d');
    fg.fillStyle = '#233a63'; fg.fillRect(0, 0, 128, 80);
    fg.fillStyle = '#d8d8d2';
    fg.beginPath(); fg.moveTo(14, 16); fg.lineTo(48, 40); fg.lineTo(14, 64); fg.lineTo(24, 40); fg.closePath(); fg.fill();
    fg.font = 'bold 20px monospace'; fg.fillText('CM-1', 58, 47);
    const flagTex = new THREE.CanvasTexture(flagCanvas);
    flagTex.colorSpace = THREE.SRGBColorSpace;
    this.flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.05, 8, 4),
      new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }),
    );
    this.flag.position.set(S.x + 6.9, 7.3, S.z + 7);
    this.flag.castShadow = true;
    this.group.add(this.flag);
    this.flagBaseX = S.x + 6.9;
    this.colliders.push(new BoxCollider(S.x + 6, S.z + 7, 0.12, 0.12, 0, 8, 'flag'));
  }

  _sandbagArc(cx, cz, r, a0, a1) {
    const geo = new THREE.SphereGeometry(0.34, 7, 5);
    geo.scale(1.35, 0.55, 0.85);
    const bags = [];
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      const n = Math.round((a1 - a0) * r / 0.52);
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n) + (row % 2 ? 0.045 : 0);
        bags.push({
          x: cx + Math.cos(a) * r, y: 0.16 + row * 0.3, z: cz + Math.sin(a) * r,
          ry: a + Math.PI / 2 + (Math.random() - 0.5) * 0.2,
          rz: (Math.random() - 0.5) * 0.12,
        });
      }
    }
    this.group.add(instanced(geo, this.mats.sand, bags));
    this.colliders.push(new BoxCollider(cx, cz, r * 0.9, r * 0.9, 0, 0.9, 'sandbags'));
  }

  // ------------------------------------------------------------ radar site
  _radarSite() {
    const R = { x: 36, z: -12 };
    const kit = new Kit();
    // pedestal
    kit.cyl(this.mats.concrete, 2.4, 2.7, 1.15, 8, R.x, 0.58, R.z);
    kit.cyl(this.mats.oliveDark, 0.95, 1.1, 0.95, 12, R.x, 1.6, R.z);
    // railing
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      kit.cyl(this.mats.galv, 0.025, 0.025, 1.0, 5, R.x + Math.cos(a) * 2.25, 1.65, R.z + Math.sin(a) * 2.25);
    }
    kit.torus(this.mats.galv, 2.25, 0.025, 5, 24, R.x, 2.15, R.z, Math.PI / 2, 0, 0);

    // rotating head
    const head = new THREE.Group();
    head.position.set(R.x, 2.25, R.z);
    const hk = new Kit();
    hk.box(this.mats.olive, 1.5, 0.7, 1.1, 0, 0.35, 0);
    // slanted phased-array face
    hk.box(this.mats.oliveDark, 3.7, 2.7, 0.34, 0, 1.95, 0.14, -0.36, 0, 0);
    // array face detail: element matrix canvas
    const faceC = document.createElement('canvas');
    faceC.width = 256; faceC.height = 192;
    const fg2 = faceC.getContext('2d');
    fg2.fillStyle = '#31382c'; fg2.fillRect(0, 0, 256, 192);
    fg2.fillStyle = '#232921';
    for (let y = 10; y < 182; y += 9) for (let x = 10; x < 246; x += 9) fg2.fillRect(x, y, 5, 5);
    fg2.strokeStyle = '#1b201a'; fg2.lineWidth = 3; fg2.strokeRect(3, 3, 250, 186);
    const faceTex = new THREE.CanvasTexture(faceC);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 2.5),
      new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.7 }),
    );
    face.position.set(0, 1.95, 0.33);
    face.rotation.x = -0.36;
    head.add(face);
    // IFF bar + junction boxes + cable loop
    hk.box(this.mats.metal, 2.4, 0.1, 0.16, 0, 3.45, 0.0, -0.36, 0, 0);
    hk.box(this.mats.dark, 0.4, 0.5, 0.4, 1.35, 0.55, -0.3);
    hk.torus(this.mats.rubber, 0.35, 0.03, 5, 16, -1.2, 0.5, -0.4, 0.4, 0, 0, Math.PI * 1.4);
    const headMesh = hk.build({ name: 'radarhead' });
    head.add(headMesh);
    this.group.add(head);
    this.radarHeads.push({ obj: head, speed: 0.85 });
    // status light on head
    const rl = this._lampMat(0x2ae56a, 1.4, 2.4);
    const rlm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), rl);
    rlm.position.set(0.6, 0.75, -0.4);
    head.add(rlm);

    this.colliders.push(new BoxCollider(R.x, R.z, 2.6, 2.6, 0, 2.3, 'radar'));

    // radome
    const D = { x: 56, z: -28 };
    kit.cyl(this.mats.concrete, 3.4, 3.6, 2.2, 12, D.x, 1.1, D.z);
    kit.box(this.mats.dark, 1.0, 1.9, 0.12, D.x, 1.0, D.z + 3.42);
    const domeGeo = new THREE.IcosahedronGeometry(3.9, 1);
    const dome = new THREE.Mesh(domeGeo, this.mats.dome);
    dome.position.set(D.x, 4.6, D.z);
    dome.castShadow = true;
    this.group.add(dome);
    this.colliders.push(new BoxCollider(D.x, D.z, 3.7, 3.7, 0, 6, 'radome'));

    // lattice mast with small dish
    this._mast(18, -34, 16, true);

    this.group.add(kit.build({ name: 'radarsite' }));
  }

  _mast(x, z, h, withDish) {
    const kit = new Kit();
    const w0 = 0.9, w1 = 0.34;
    const SEGS = Math.round(h / 2);
    for (let s = 0; s < SEGS; s++) {
      const t0 = s / SEGS, t1 = (s + 1) / SEGS;
      const wA = w0 + (w1 - w0) * t0, wB = w0 + (w1 - w0) * t1;
      const y0 = t0 * h, y1 = t1 * h;
      // 4 legs
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ax = x + sx * wA / 2, az = z + sz * wA / 2;
        const bx = x + sx * wB / 2, bz = z + sz * wB / 2;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2, my = (y0 + y1) / 2;
        const len = Math.hypot(bx - ax, y1 - y0, bz - az);
        const tilt = Math.atan2(Math.hypot(bx - ax, bz - az), y1 - y0);
        const ang = Math.atan2(bx - ax, bz - az);
        kit.cyl(this.mats.galv, 0.035, 0.035, len, 4, mx, my, mz, tilt, ang, 0);
      }
      // X braces (approximation: horizontal ring)
      kit.box(this.mats.galv, wA, 0.03, 0.03, x, y0 + 0.02, z - wA / 2);
      kit.box(this.mats.galv, wA, 0.03, 0.03, x, y0 + 0.02, z + wA / 2);
      kit.box(this.mats.galv, 0.03, 0.03, wA, x - wA / 2, y0 + 0.02, z);
      kit.box(this.mats.galv, 0.03, 0.03, wA, x + wA / 2, y0 + 0.02, z);
    }
    // platform + dish
    kit.box(this.mats.metal, 1.3, 0.08, 1.3, x, h, z);
    if (withDish) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(new THREE.Vector2(t * 0.8, t * t * 0.34));
      }
      kit.lathe(this.mats.dome, pts, 14, x, h + 0.55, z, Math.PI / 2 + 0.5, 0.8, 0);
      kit.cyl(this.mats.metal, 0.04, 0.04, 0.7, 5, x, h + 0.35, z, 0.4, 0, 0);
    }
    // guy wires
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const gx = x + Math.cos(a) * h * 0.55, gz = z + Math.sin(a) * h * 0.55;
      const len = Math.hypot(h * 0.55, h * 0.92);
      const mx = (x + gx) / 2, mz = (z + gz) / 2;
      const tilt = Math.atan2(h * 0.55, h * 0.92);
      const ang = Math.atan2(gx - x, gz - z);
      kit.cyl(this.mats.dark, 0.008, 0.008, len, 3, mx, h * 0.46, mz, tilt, ang, 0);
      kit.cyl(this.mats.concrete, 0.18, 0.22, 0.3, 6, gx, 0.15, gz);
    }
    // red strobe on top
    const sm = this._strobeMat(0xff2a20, 3.2, 0.12, 1.35, Math.random() * 3);
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), sm);
    strobe.position.set(x, h + (withDish ? 1.1 : 0.35), z);
    this.group.add(strobe);
    const glow = this._glowSprite(0xff4030, 2.2, 0, 0.0); // pulses with strobe
    glow.position.copy(strobe.position);
    this.group.add(glow);
    this.strobeGlows = this.strobeGlows || [];
    this.strobeGlows.push({ spr: glow, mat: sm });

    kit.cyl(this.mats.galv, 0.05, 0.05, withDish ? 1.1 : 0.5, 5, x, h + (withDish ? 0.55 : 0.18), z);
    this.colliders.push(new BoxCollider(x, z, 0.7, 0.7, 0, h, 'mast'));
    this.group.add(kit.build({ castShadow: false, name: 'mast' }));
  }

  // ------------------------------------------------------------ support kit
  _support() {
    // one shared kit + shared wheel instancing for every parked vehicle and
    // genset keeps the whole motor pool at a handful of draw calls
    const vk = new Kit();
    this._wheelBuckets = new Map();

    // gensets — each parked a few metres OFF the pad -> base-centre sightline
    // so they never mask the batteries
    const gensets = [
      [-69, -29, 0.55, new THREE.Vector3(-58, 0, -36)],
      [40, 40.5, -0.85, new THREE.Vector3(52, 0, 42)],
      [-37, 52.5, 0.9, new THREE.Vector3(-52, 0, 56)],
      [-24, 16, 0.35, new THREE.Vector3(-18, 0, 9.8)],
      [29, -19.5, 0.3, new THREE.Vector3(36, 0, -12)],
    ];
    for (const [x, z, ry, feed] of gensets) this._genset(vk, x, z, ry, feed);

    // trucks + small vehicle depot in the SE quadrant
    this._flatbedTruck(vk, 64, 28, 2.6);
    this._boxTruck(vk, -4, 30, 0.12);
    this._tankerTruck(vk, 86, -44, Math.PI / 2 + 0.12);
    this._boxTruck(vk, -34, 22, 1.9, 0.8);
    this._boxTruck(vk, 56, 92, -1.72);
    this._flatbedTruck(vk, 47, 97.5, 1.42);

    this.group.add(vk.build({ name: 'vehicles' }));
    this._buildWheels();

    // floodlight towers
    for (const [x, z] of [[-96, -78], [96, -78], [-96, 88], [96, 88]]) this._floodTower(x, z);

    // antenna masts NE
    this._mast(85, -70, 12, false);
    this._mast(96, -56, 15, false);
    this._mast(76, -88, 10, false);

    // HESCO walls around pads
    this._hescoU(-58, -38, 30, 24, 0);
    this._hescoU(52, 44, 32, 26, 0);
    this._hescoU(-52, 58, 32, 30, 0);

    // crates, drums, pallets, cases
    this._clutter();

    // density pass: container yard, tents, comms, ramps, cones, ground decals
    this._containerYard();
    this._quonset(-34, 86, 0.15, 7.6, 2.7);
    this._quonset(68, 70, -0.45, 6.2, 2.3);
    this._commsCluster();
    this._cableRamps();
    this._trafficCones();
    this._groundDecals();

    // light poles along main road
    for (const z of [40, 75, 110]) {
      this._lightPole(5.2, z, Math.PI);
      this._lightPole(-5.2, 22 + z * 0.4, 0);
    }
  }

  _genset(kit, x, z, ry, feedTo) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];
    const at = (p, y) => [p[0], y, p[1]];
    // body + skid (~15% smaller than the old fridge-sized unit)
    kit.box(this.mats.oliveDark, 2.46, 1.28, 1.28, x, 0.81, z, 0, ry, 0);
    kit.box(this.mats.dark, 2.64, 0.15, 1.38, x, 0.24, z, 0, ry, 0);
    // intake vents on both ends + louver strips along both long sides
    kit.box(this.mats.dark, 0.06, 0.66, 1.0, ...at(L(1.24, 0), 0.85), 0, ry, 0);
    kit.box(this.mats.dark, 0.05, 0.5, 0.8, ...at(L(-1.24, 0), 0.8), 0, ry, 0);
    for (let i = 0; i < 4; i++) {
      const ly = 0.55 + i * 0.17;
      kit.box(this.mats.dark, 0.86, 0.045, 0.03, ...at(L(-0.55, 0.655), ly), 0, ry, 0);
      kit.box(this.mats.dark, 0.86, 0.045, 0.03, ...at(L(-0.55, -0.655), ly), 0, ry, 0);
    }
    // control panel on the right long side
    kit.box(this.mats.dark, 0.5, 0.42, 0.04, ...at(L(0.55, 0.655), 0.95), 0, ry, 0);
    // exhaust stack sits on the body top, with rain cap
    const ex = L(-0.78, -0.34);
    kit.cyl(this.mats.metal, 0.075, 0.075, 0.52, 8, ex[0], 1.68, ex[1]);
    kit.cyl(this.mats.dark, 0.11, 0.11, 0.09, 8, ex[0], 1.97, ex[1], 0.5, ry, 0);
    // stencil decal (shared material -> merged into one mesh for all gensets)
    kit.addGeo(new THREE.PlaneGeometry(0.78, 0.2), this._gensetDecalMat(),
      ...at(L(0.35, 0.662), 1.24), 0, ry, 0);
    // wheels
    const wheels = [];
    for (const [lx, lz] of [[0.9, 0.62], [0.9, -0.62], [-0.9, 0.62], [-0.9, -0.62]]) {
      wheels.push(L(lx, lz));
    }
    this._queueWheels(wheels, 0.29, 0.22, ry);
    // status LED
    const lm = this._lampMat(0x2ae56a, 1.6, 2.2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), lm);
    const lp = L(1.0, 0.66);
    led.position.set(lp[0], 1.08, lp[1]);
    led.rotation.y = ry;
    this.group.add(led);
    // power cable to consumer
    const start = new THREE.Vector3(...at(L(-1.25, 0.28), 0.45));
    const end = feedTo.clone().setY(0.35);
    const mid1 = start.clone().lerp(end, 0.4); mid1.y = 0.06;
    const mid2 = start.clone().lerp(end, 0.75); mid2.y = 0.06;
    const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
    kit.tube(this.mats.rubber, curve, 14, 0.035, 5);
    this.colliders.push(new BoxCollider(x, z, 1.4, 0.8, ry, 1.7, 'genset'));
  }

  _gensetDecalMat() {
    if (!this._gensetDecal) {
      this._gensetDecal = new THREE.MeshBasicMaterial({
        map: stencilTexture('CM PWR-6', { size: 26, w: 256, h: 64, fg: '#b9bfab' }),
        transparent: true, polygonOffset: true, polygonOffsetFactor: -1,
      });
    }
    return this._gensetDecal;
  }

  _queueWheels(positions, r = 0.52, w = 0.36, ry = 0) {
    const key = `${r}:${w}`;
    let b = this._wheelBuckets.get(key);
    if (!b) { b = { r, w, list: [] }; this._wheelBuckets.set(key, b); }
    for (const p of positions) b.list.push({ x: p[0], y: r, z: p[1], rx: Math.PI / 2, ry, rz: 0 });
  }

  _buildWheels() {
    for (const b of this._wheelBuckets.values()) {
      const geo = new THREE.CylinderGeometry(b.r, b.r, b.w, 14);
      const hubGeo = new THREE.CylinderGeometry(b.r * 0.45, b.r * 0.45, b.w + 0.04, 10);
      this.group.add(instanced(geo, this.mats.rubber, b.list));
      this.group.add(instanced(hubGeo, this.mats.dark, b.list, { castShadow: false }));
    }
  }

  _truckCab(kit, x, z, ry, w = 2.3) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cos - lz * sin, z + lx * sin + lz * cos];
    // cab body + hood
    kit.box(this.mats.tan, 1.6, 1.5, w, ...((p) => [p[0], 1.75, p[1]])(L(0.2, 0)), 0, ry, 0);
    kit.box(this.mats.tan, 1.3, 0.85, w - 0.15, ...((p) => [p[0], 1.28, p[1]])(L(1.55, 0)), 0, ry, 0);
    // windshield + side windows
    kit.box(this.mats.glass, 0.06, 0.62, w - 0.5, ...((p) => [p[0], 2.05, p[1]])(L(1.02, 0)), 0, ry, -0.12);
    kit.box(this.mats.glass, 1.0, 0.5, 0.05, ...((p) => [p[0], 2.0, p[1]])(L(0.2, w / 2)), 0, ry, 0);
    kit.box(this.mats.glass, 1.0, 0.5, 0.05, ...((p) => [p[0], 2.0, p[1]])(L(0.2, -w / 2)), 0, ry, 0);
    // grille + bumper + mirrors
    kit.box(this.mats.dark, 0.08, 0.5, w - 0.6, ...((p) => [p[0], 1.15, p[1]])(L(2.22, 0)), 0, ry, 0);
    kit.box(this.mats.metal, 0.25, 0.22, w + 0.2, ...((p) => [p[0], 0.72, p[1]])(L(2.3, 0)), 0, ry, 0);
    kit.box(this.mats.dark, 0.04, 0.3, 0.2, ...((p) => [p[0], 2.15, p[1]])(L(1.15, w / 2 + 0.15)), 0, ry, 0);
    kit.box(this.mats.dark, 0.04, 0.3, 0.2, ...((p) => [p[0], 2.15, p[1]])(L(1.15, -w / 2 - 0.15)), 0, ry, 0);
  }

  _flatbedTruck(kit, x, z, ry) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cos - lz * sin, z + lx * sin + lz * cos];
    // chassis + bed
    kit.box(this.mats.dark, 7.6, 0.3, 1.1, x, 0.85, z, 0, ry, 0);
    kit.box(this.mats.oliveDark, 5.4, 0.16, 2.4, ...((p) => [p[0], 1.05, p[1]])(L(-1.6, 0)), 0, ry, 0);
    this._truckCab(kit, ...L(2.6, 0), ry);
    // crated cargo
    kit.box(this.mats.olive, 1.6, 1.1, 1.8, ...((p) => [p[0], 1.7, p[1]])(L(-0.8, 0)), 0, ry + 0.05, 0);
    kit.box(this.mats.tan, 1.2, 0.8, 1.2, ...((p) => [p[0], 1.55, p[1]])(L(-2.6, 0.3)), 0, ry - 0.1, 0);
    this._queueWheels([L(2.4, 1.05), L(2.4, -1.05), L(-0.6, 1.05), L(-0.6, -1.05), L(-2.4, 1.05), L(-2.4, -1.05)], 0.52, 0.4, ry);
    this.colliders.push(new BoxCollider(x, z, 4.0, 1.4, ry, 2.6, 'truck'));
  }

  _boxTruck(kit, x, z, ry, scale = 1) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cos * scale - lz * sin * scale, z + lx * sin * scale + lz * cos * scale];
    kit.box(this.mats.dark, 6.4 * scale, 0.3, 1.1 * scale, x, 0.85, z, 0, ry, 0);
    this._truckCab(kit, ...L(2.2, 0), ry, 2.3 * scale);
    kit.box(this.mats.olive, 4.2 * scale, 2.2 * scale, 2.4 * scale, ...((p) => [p[0], 1.05 + 1.1 * scale, p[1]])(L(-1.2, 0)), 0, ry, 0);
    kit.box(this.mats.dark, 4.25 * scale, 0.08, 2.45 * scale, ...((p) => [p[0], 1.0 + 2.24 * scale, p[1]])(L(-1.2, 0)), 0, ry, 0);
    this._queueWheels([L(2.1, 1.05), L(2.1, -1.05), L(-1.6, 1.05), L(-1.6, -1.05), L(-2.7, 1.05), L(-2.7, -1.05)], 0.5 * scale, 0.38, ry);
    this.colliders.push(new BoxCollider(x, z, 3.4 * scale, 1.4 * scale, ry, 3, 'truck'));
  }

  _tankerTruck(kit, x, z, ry) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cos - lz * sin, z + lx * sin + lz * cos];
    kit.box(this.mats.dark, 7.2, 0.3, 1.1, x, 0.85, z, 0, ry, 0);
    this._truckCab(kit, ...L(2.5, 0), ry);
    kit.cyl(this.mats.metal, 1.05, 1.05, 4.6, 16, ...((p) => [p[0], 1.95, p[1]])(L(-1.3, 0)), 0, ry + Math.PI / 2, Math.PI / 2);
    kit.box(this.mats.dark, 0.5, 0.4, 0.5, ...((p) => [p[0], 1.15, p[1]])(L(-3.2, 0.8)), 0, ry, 0);
    kit.torus(this.mats.dark, 0.35, 0.05, 6, 14, ...((p) => [p[0], 1.0, p[1]])(L(-3.4, -0.8)), Math.PI / 2, 0, 0);
    this._queueWheels([L(2.3, 1.05), L(2.3, -1.05), L(-0.8, 1.05), L(-0.8, -1.05), L(-2.6, 1.05), L(-2.6, -1.05)], 0.52, 0.4, ry);
    this.colliders.push(new BoxCollider(x, z, 3.8, 1.4, ry, 3, 'truck'));
  }

  _floodTower(x, z) {
    this._mastPlain(x, z, 11);
    // lamp head: crossbar + 4 lamps
    const kit = new Kit();
    kit.box(this.mats.metal, 2.6, 0.12, 0.12, x, 11.2, z);
    const aim = new THREE.Vector3(-x * 0.55, 0, -z * 0.55);
    for (let i = 0; i < 4; i++) {
      const lx = x - 0.97 + (i % 4) * 0.65;
      const lm = this._lampMat(0xfff4d8, 0, 4.2);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.24), lm);
      lamp.position.set(lx, 11.05, z);
      lamp.lookAt(aim.x, 0, aim.z);
      this.group.add(lamp);
    }
    const glow = this._glowSprite(0xfff0c8, 7, 0, 0.5);
    glow.position.set(x, 11.1, z);
    this.group.add(glow);
    const spot = new THREE.SpotLight(0xffedc4, 0, 260, 0.62, 0.55, 1.4);
    spot.position.set(x, 11.2, z);
    spot.target.position.copy(aim);
    this.group.add(spot, spot.target);
    this.nightLights.push({ light: spot, day: 0, night: 2600 });
    this.group.add(kit.build({ castShadow: false, name: 'floodhead' }));
  }

  _mastPlain(x, z, h) {
    const kit = new Kit();
    const w0 = 1.0, w1 = 0.4;
    const SEGS = Math.round(h / 2.2);
    for (let s = 0; s < SEGS; s++) {
      const t0 = s / SEGS, t1 = (s + 1) / SEGS;
      const wA = w0 + (w1 - w0) * t0, wB = w0 + (w1 - w0) * t1;
      const y0 = t0 * h, y1 = t1 * h;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ax = x + sx * wA / 2, az = z + sz * wA / 2;
        const bx = x + sx * wB / 2, bz = z + sz * wB / 2;
        const len = Math.hypot(bx - ax, y1 - y0, bz - az);
        const tilt = Math.atan2(Math.hypot(bx - ax, bz - az), y1 - y0);
        const ang = Math.atan2(bx - ax, bz - az);
        kit.cyl(this.mats.galv, 0.045, 0.045, len, 4, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2, tilt, ang, 0);
      }
      kit.box(this.mats.galv, wA, 0.035, 0.035, x, y0 + 0.02, z - wA / 2);
      kit.box(this.mats.galv, wA, 0.035, 0.035, x, y0 + 0.02, z + wA / 2);
      kit.box(this.mats.galv, 0.035, 0.035, wA, x - wA / 2, y0 + 0.02, z);
      kit.box(this.mats.galv, 0.035, 0.035, wA, x + wA / 2, y0 + 0.02, z);
    }
    kit.box(this.mats.concrete, 1.6, 0.3, 1.6, x, 0.15, z);
    this.group.add(kit.build({ castShadow: false, name: 'tower' }));
    this.colliders.push(new BoxCollider(x, z, 0.7, 0.7, 0, h, 'tower'));
  }

  _lightPole(x, z, face) {
    const kit = new Kit();
    kit.cyl(this.mats.galv, 0.07, 0.09, 5.4, 7, x, 2.7, z);
    // curved arm out to the lamp head
    kit.bar(this.mats.galv, x, 5.38, z, x + Math.sin(face) * 0.95, 5.62, z + Math.cos(face) * 0.95, 0.045);
    const lm = this._lampMat(0xffe9b8, 0, 3.4);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.2), lm);
    lamp.rotation.y = face;
    lamp.position.set(x + Math.sin(face) * 0.95, 5.6, z + Math.cos(face) * 0.95);
    this.group.add(lamp);
    const glow = this._glowSprite(0xffe0a0, 2.6, 0, 0.4);
    glow.position.copy(lamp.position);
    this.group.add(glow);
    const pt = new THREE.PointLight(0xffdf9e, 0, 26, 1.7);
    pt.position.set(lamp.position.x, 5.2, lamp.position.z);
    this.group.add(pt);
    this.nightLights.push({ light: pt, day: 0, night: 60 });
    this.group.add(kit.build({ castShadow: false, name: 'pole' }));
    this.colliders.push(new BoxCollider(x, z, 0.15, 0.15, 0, 5.4, 'pole'));
  }

  _hescoU(cx, cz, w, d, ry) {
    const geo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    const items = [];
    const half = w / 2 + 1.6, halfD = d / 2 + 1.6;
    // three sides (open toward base center)
    const runs = [
      { x0: cx - half, z0: cz - halfD, x1: cx + half, z1: cz - halfD },
      { x0: cx - half, z0: cz - halfD, x1: cx - half, z1: cz + halfD * 0.4 },
      { x0: cx + half, z0: cz - halfD, x1: cx + half, z1: cz + halfD * 0.4 },
    ];
    for (const r of runs) {
      const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
      const n = Math.floor(len / 1.4);
      for (let i = 0; i <= n; i++) {
        const t = i / Math.max(1, n);
        items.push({
          x: r.x0 + (r.x1 - r.x0) * t, y: 0.66 + Math.random() * 0.05, z: r.z0 + (r.z1 - r.z0) * t,
          ry: (Math.random() - 0.5) * 0.07, s: 0.97 + Math.random() * 0.07,
        });
      }
      const mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
      const yaw = Math.atan2(r.x1 - r.x0, r.z1 - r.z0);
      this.colliders.push(new BoxCollider(mx, mz, len / 2 * Math.abs(Math.sin(yaw)) + 0.7, len / 2 * Math.abs(Math.cos(yaw)) + 0.7, 0, 1.4, 'hesco'));
    }
    this.group.add(instanced(geo, this.mats.hesco, items));
  }

  _clutter() {
    const rnd = mulberry32(2024);
    // crates near pads
    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    const crates = [];
    const spots = [
      [-48, -46, 6], [42, 52, 6], [-42, 66, 7], [-24, 2, 4], [26, -20, 4], [10, 24, 3],
    ];
    for (const [sx, sz, n] of spots) {
      for (let i = 0; i < n; i++) {
        const x = sx + (rnd() - 0.5) * 6, z = sz + (rnd() - 0.5) * 6;
        const s = 0.55 + rnd() * 0.75;
        crates.push({ x, y: s / 2, z, ry: rnd() * 3, s });
        if (s > 0.8) this.colliders.push(new BoxCollider(x, z, s * 0.55, s * 0.55, 0, s, 'crate'));
      }
    }
    // a few stacked
    crates.push({ x: -46, y: 1.5, z: -47, ry: 0.4, s: 0.9 });
    crates.push({ x: 43, y: 1.45, z: 53, ry: 1.2, s: 0.85 });
    this.group.add(instanced(crateGeo, this.mats.olive, crates));

    // drums
    const drumGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.92, 12);
    const drums = [];
    for (let i = 0; i < 16; i++) {
      const spot = spots[i % spots.length];
      const x = spot[0] + 3 + (rnd() - 0.5) * 7, z = spot[1] - 3 + (rnd() - 0.5) * 7;
      drums.push({ x, y: 0.46, z, ry: rnd() * 3 });
    }
    this.group.add(instanced(drumGeo, this.mats.oliveDark, drums));

    // equipment cases (small, dark)
    const caseGeo = new THREE.BoxGeometry(0.75, 0.32, 0.5);
    const cases = [];
    for (let i = 0; i < 18; i++) {
      const spot = spots[i % spots.length];
      cases.push({
        x: spot[0] + (rnd() - 0.5) * 9, y: 0.16 + (i % 3 === 0 ? 0.33 : 0),
        z: spot[1] + (rnd() - 0.5) * 9, ry: rnd() * 3,
      });
    }
    this.group.add(instanced(caseGeo, this.mats.dark, cases));

    // pallets
    const palGeo = new THREE.BoxGeometry(1.2, 0.14, 1.0);
    const pals = [];
    for (let i = 0; i < 8; i++) {
      const spot = spots[i % spots.length];
      pals.push({ x: spot[0] - 4 + (rnd() - 0.5) * 5, y: 0.07, z: spot[1] + 4 + (rnd() - 0.5) * 5, ry: rnd() * 3 });
    }
    this.group.add(instanced(palGeo, this.mats.tan, pals));
  }

  // ------------------------------------------------------------ density pass
  _containerYard() {
    // small ISO-style container yard east of the main road, one unit stacked
    const geo = new THREE.BoxGeometry(6.06, 2.59, 2.44);
    const list = [
      { x: 28.0, z: 74.0, y: 1.3, ry: 1.58, c: [0.42, 0.5, 0.36] },
      { x: 31.1, z: 74.3, y: 1.3, ry: 1.55, c: [0.85, 0.7, 0.46] },
      { x: 34.2, z: 73.8, y: 1.3, ry: 1.6, c: [0.6, 0.4, 0.28] },
      { x: 28.2, z: 74.5, y: 3.89, ry: 1.62, c: [0.68, 0.45, 0.3] }, // stacked, askew
      { x: 29.5, z: 82.5, y: 1.3, ry: 0.06, c: [0.36, 0.44, 0.32] },
      { x: 29.9, z: 85.6, y: 1.3, ry: 0.02, c: [0.8, 0.72, 0.5] },
      { x: 37.0, z: 83.2, y: 1.3, ry: 1.22, c: [0.5, 0.55, 0.46] },
    ];
    const im = new THREE.InstancedMesh(geo, this.mats.container, list.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    list.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.ry, 0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, col.setRGB(t.c[0], t.c[1], t.c[2]));
      if (t.y < 2) this.colliders.push(new BoxCollider(t.x, t.z, 3.05, 1.24, t.ry, 2.6, 'container'));
    });
    im.castShadow = true;
    im.receiveShadow = true;
    this.group.add(im);
    // fictional operator stencil on two of the boxes
    const labMat = new THREE.MeshBasicMaterial({
      map: stencilTexture('COBALT MESA SUPPLY', { size: 30, w: 512, h: 64, fg: '#dde2cc' }),
      transparent: true, polygonOffset: true, polygonOffsetFactor: -1,
    });
    const lk = new Kit();
    // west long side of the tan unit (faces the main road) + stacked unit
    lk.addGeo(new THREE.PlaneGeometry(5.2, 0.65), labMat,
      31.1 - Math.sin(1.55) * 1.24, 1.7, 74.3 - Math.cos(1.55) * 1.24, 0, 1.55 + Math.PI, 0);
    lk.addGeo(new THREE.PlaneGeometry(5.2, 0.65), labMat,
      28.2 - Math.sin(1.62) * 1.24, 4.25, 74.5 - Math.cos(1.62) * 1.24, 0, 1.62 + Math.PI, 0);
    this.group.add(lk.build({ castShadow: false, receiveShadow: false, name: 'yardlabels' }));
  }

  _quonset(x, z, ry, len = 7.5, r = 2.7) {
    const kit = new Kit();
    // fabric half-cylinder shell, axis along local z
    const shell = new THREE.CylinderGeometry(r, r, len, 16, 1, true, -Math.PI / 2, Math.PI);
    shell.rotateX(-Math.PI / 2);
    kit.addGeo(shell, this.mats.fabric, x, 0, z, 0, ry, 0);
    // end caps + door on the front cap
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const cap = (lz, flip) => {
      const g = new THREE.CircleGeometry(r, 12, 0, Math.PI);
      kit.addGeo(g, this.mats.fabric, x + lz * sin, 0, z + lz * cos, 0, ry + (flip ? Math.PI : 0), 0);
    };
    cap(len / 2 + 0.01, false);
    cap(-len / 2 - 0.01, true);
    kit.addGeo(new THREE.PlaneGeometry(1.05, 1.85), this.mats.dark,
      x + (len / 2 + 0.03) * sin, 0.93, z + (len / 2 + 0.03) * cos, 0, ry, 0);
    // guy ropes + stakes on both sides
    for (let i = -1; i <= 1; i++) {
      const lz = i * len * 0.36;
      for (const s of [-1, 1]) {
        const ax = x + lz * sin + s * r * 0.72 * cos, az = z + lz * cos - s * r * 0.72 * sin;
        const gx = x + lz * sin + s * (r + 1.1) * cos, gz = z + lz * cos - s * (r + 1.1) * sin;
        kit.bar(this.mats.dark, ax, r * 0.68, az, gx, 0.04, gz, 0.008, 3);
        kit.cyl(this.mats.dark, 0.025, 0.025, 0.16, 5, gx, 0.07, gz);
      }
    }
    this.group.add(kit.build({ name: 'quonset' }));
    this.colliders.push(new BoxCollider(x, z, r * 0.92, len / 2, ry, 2.2, 'tent'));
  }

  _commsCluster() {
    // two small dishes on tripods + a whip-antenna rack beside the shelter
    const kit = new Kit();
    const dishes = [[-24.6, 3.8, 0.7, 0.55], [-23.2, 2.0, 2.4, 0.42]];
    for (const [x, z, az, r] of dishes) {
      for (let i = 0; i < 3; i++) {
        const a = az + (i / 3) * Math.PI * 2;
        kit.bar(this.mats.steel, x, 1.02, z, x + Math.cos(a) * 0.55, 0, z + Math.sin(a) * 0.55, 0.02, 5);
      }
      const pts = [];
      for (let i = 0; i <= 7; i++) { const t = i / 7; pts.push(new THREE.Vector2(t * r, t * t * r * 0.45)); }
      kit.lathe(this.mats.dome, pts, 12, x, 1.18, z, Math.PI / 2 + 0.55, az, 0);
      kit.cyl(this.mats.metal, 0.02, 0.02, r * 0.8, 5, x, 1.12, z, 0.5, az, 0);
    }
    this.colliders.push(new BoxCollider(-23.9, 2.9, 1.5, 1.7, 0, 1.3, 'comms'));
    // whip antennas on a low equipment box
    kit.box(this.mats.oliveDark, 0.7, 0.3, 0.5, -13.4, 0.15, 2.9, 0, 0.2, 0);
    for (let i = 0; i < 4; i++) {
      const wx = -13.62 + i * 0.15, wz = 2.72 + (i % 2) * 0.34;
      kit.cyl(this.mats.dark, 0.008, 0.012, 2.3 + i * 0.35, 4, wx, 0.3 + (2.3 + i * 0.35) / 2, wz, 0.04 * (i - 1.5), 0, 0.03 * (i % 2 ? 1 : -1));
    }
    this.group.add(kit.build({ castShadow: false, name: 'comms' }));
  }

  _cableRamps() {
    // half-round cable protectors where pad feeds cross the roads
    const geo = new THREE.CylinderGeometry(0.13, 0.13, 4.6, 10, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    // ry = road direction angle (atan2(dx,dz)) lays the ramp across that road;
    // all spots sit on asphalt short of the pad aprons
    const ramps = [
      { x: 0, z: 132, y: 0.05, ry: Math.PI, sx: 1.96 },
      { x: 0, z: 58, y: 0.05, ry: Math.PI, sx: 1.96 },
      { x: -51, z: -23, y: 0.058, ry: -2.356, sx: 1.63 },
      { x: 33, z: 33.1, y: 0.066, ry: 1.222, sx: 1.63 },
      { x: -34, z: 35.3, y: 0.074, ry: -0.885, sx: 1.63 },
      { x: 25.2, z: -6.6, y: 0.082, ry: 2.034, sx: 1.41 },
    ];
    this.group.add(instanced(geo, this.mats.rubber,
      ramps.map(rr => ({ x: rr.x, y: rr.y, z: rr.z, ry: rr.ry, sx: rr.sx, sy: 1, sz: 1 })),
      { castShadow: false }));
    // short cable tails poking out of each ramp end
    const ck = new Kit();
    for (const rr of ramps) {
      const half = 2.3 * rr.sx;
      const dx = Math.cos(rr.ry), dz = -Math.sin(rr.ry);
      for (const s of [-1, 1]) {
        const ex = rr.x + dx * s * half, ez = rr.z + dz * s * half;
        ck.cyl(this.mats.rubber, 0.032, 0.032, 1.7, 5,
          ex + dx * s * 0.85, 0.035, ez + dz * s * 0.85, Math.PI / 2, rr.ry + Math.PI / 2, 0);
      }
    }
    this.group.add(ck.build({ castShadow: false, name: 'rampcables' }));
  }

  _trafficCones() {
    const rnd = mulberry32(717);
    const coneGeo = new THREE.ConeGeometry(0.17, 0.52, 9);
    const baseGeo = new THREE.BoxGeometry(0.42, 0.045, 0.42);
    // [x, z, onRoad]
    const spots = [
      [1.8, 126, 1], [-2.3, 133, 1], [2.4, 141, 1], [3.3, 111.5, 1],
      [-49, -20.5, 0], [-45.5, -24, 0],
      [44, 34.6, 0], [47.5, 39.8, 0],
      [-43.5, 41.5, 0], [-47, 46.5, 0],
      [30, -7.2, 0],
      [51.5, 89, 0], [59.5, 94.5, 0],
    ];
    const cones = [], bases = [];
    for (const [x, z, onRoad] of spots) {
      const y0 = onRoad ? 0.05 : 0;
      cones.push({ x, y: y0 + 0.305, z, ry: rnd() * 3 });
      bases.push({ x, y: y0 + 0.023, z, ry: rnd() * 3 });
    }
    this.group.add(instanced(coneGeo, this.mats.cone, cones, { castShadow: false }));
    this.group.add(instanced(baseGeo, this.mats.dark, bases, { castShadow: false }));
  }

  _groundDecals() {
    const rnd = mulberry32(515);
    // oil drips under every parked vehicle / genset
    const oil = new THREE.MeshBasicMaterial({
      map: this.scorchTex, transparent: true, opacity: 0.42, color: 0x17130e,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const ok = new Kit();
    const stains = [
      [64, 28, 2.4], [-4, 30, 2.1], [86, -44, 2.8], [-34, 22, 1.8], [56, 92, 2.2], [47, 97.5, 2.4],
      [-69, -29, 1.5], [40, 40.5, 1.4], [-37, 52.5, 1.4], [-24, 16, 1.3], [29, -19.5, 1.4],
      [-84, -58, 2.4],
    ];
    for (const [x, z, s] of stains) {
      ok.addGeo(new THREE.PlaneGeometry(s, s), oil, x, 0.028, z, -Math.PI / 2, 0, rnd() * 6);
    }
    this.group.add(ok.build({ castShadow: false, receiveShadow: false, name: 'oilstains' }));

    // tire-track darkening where vehicles turn off the roads
    const trk = new THREE.MeshBasicMaterial({
      map: tireTrackTexture(), transparent: true, opacity: 0.42,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const tk = new Kit();
    // [x, z, length, rz]  (rz = atan2(-dx,-dz) of travel direction)
    const tracks = [
      [-53, -26, 9, 0.785], [47, 38.4, 9, -1.92], [-47, 45.8, 9, 2.256],
      [32, -10, 8, -1.107], [52, 94, 10, -1.75], [-72, -47, 10, 0.738],
      [0, 145, 11, Math.PI],
    ];
    for (const [x, z, len, rz] of tracks) {
      tk.addGeo(new THREE.PlaneGeometry(2.7, len), trk, x, 0.1, z, -Math.PI / 2, 0, rz);
    }
    this.group.add(tk.build({ castShadow: false, receiveShadow: false, name: 'tiretracks' }));

    // large, very subtle compacted-dirt patches so the sand isn't uniform
    const dirt = new THREE.MeshBasicMaterial({
      map: dirtPatchTexture(), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const dk = new Kit();
    const patches = [
      [0, 64, 42], [-44, -16, 30], [38, 18, 34], [-22, 38, 30],
      [64, -28, 36], [-66, 16, 30], [48, 88, 34], [-78, -48, 30],
    ];
    let lift = 0;
    for (const [x, z, s] of patches) {
      dk.addGeo(new THREE.PlaneGeometry(s, s), dirt, x, 0.02 + lift, z, -Math.PI / 2, 0, rnd() * 6);
      lift += 0.0022;
    }
    this.group.add(dk.build({ castShadow: false, receiveShadow: false, name: 'dirtpatches' }));
  }

  // ------------------------------------------------------------ searchlights
  _searchlightTowers() {
    // short + low-poly beam: with the lower idle sweep the cone crosses many
    // sightlines, so keep its fill cost tiny (it fades out along vY anyway)
    const coneGeo = new THREE.CylinderGeometry(16, 0.9, 520, 8, 1, true);
    coneGeo.translate(0, 260, 0);
    const beamShader = (opacityUniform) => new THREE.ShaderMaterial({
      uniforms: { uOpacity: opacityUniform },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, fog: false,
      vertexShader: /* glsl */`
        varying float vY;
        void main() {
          vY = uv.y; // cylinder uv: 0 at drum (narrow end), 1 at far end
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uOpacity;
        varying float vY;
        void main() {
          float a = pow(1.0 - vY, 2.2) * uOpacity;
          gl_FragColor = vec4(1.0, 0.96, 0.84, a);
        }
      `,
    });
    for (const [x, z, phase] of [[-88, 84, 0], [92, -88, 2.4]]) {
      this._mastPlain(x, z, 6);
      const yoke = new THREE.Group();
      yoke.position.set(x, 6.6, z);
      const kit = new Kit();
      kit.box(this.mats.oliveDark, 0.5, 0.5, 0.5, 0, 0, 0);
      const drum = new THREE.Group();
      const dk = new Kit();
      dk.cyl(this.mats.metal, 0.55, 0.55, 0.8, 14, 0, 0, 0, Math.PI / 2, 0, 0);
      const lensMat = this._lampMat(0xfff6dc, 0, 6);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), lensMat);
      lens.position.set(0, 0, 0.42);
      drum.add(dk.build({ name: 'drum' }), lens);
      const opacityUniform = { value: 0 };
      const cone = new THREE.Mesh(coneGeo, beamShader(opacityUniform));
      cone.rotation.x = Math.PI / 2;
      cone.position.z = 0.4;
      cone.renderOrder = 8;
      cone.frustumCulled = false;
      cone.visible = false; // switched on by update() when the beam is lit
      drum.add(cone);
      const glow = this._glowSprite(0xfff2cc, 5, 0, 0.8);
      drum.add(glow);
      yoke.add(drum);
      this.group.add(yoke);
      this.searchlights.push({ yoke, drum, cone, opacityUniform, phase, x, z });
    }
  }

  // ------------------------------------------------------------ update
  update(dt, nightFactor, threats) {
    this.time += dt;
    const t = this.time;

    for (const rh of this.radarHeads) rh.obj.rotation.y = t * rh.speed;

    // strobes (aviation beacons + rack LEDs); these materials are NOT in
    // nightMats, so the blink survives the night dimmer below
    for (const s of this.strobes) {
      const on = Math.sin((t + s.phase) * (Math.PI * 2 / s.period)) > 0.82;
      s.mat.emissiveIntensity = on ? (s.hi || 3.2) : (s.lo || 0.12);
    }
    if (this.strobeGlows) {
      for (const g of this.strobeGlows) {
        g.spr.material.opacity = g.mat.emissiveIntensity > 1 ? 0.5 : 0.0;
      }
    }

    // night dimmers
    for (const nm of this.nightMats) {
      nm.mat.emissiveIntensity = nm.day + (nm.night - nm.day) * nightFactor;
    }
    for (const nl of this.nightLights) {
      nl.light.intensity = nl.day + (nl.night - nl.day) * nightFactor;
    }
    for (const ns of this.nightSprites) {
      ns.spr.material.opacity = ns.day + (ns.night - ns.day) * nightFactor;
    }

    // searchlights sweep, occasionally tracking a live threat
    for (let i = 0; i < this.searchlights.length; i++) {
      const sl = this.searchlights[i];
      sl.opacityUniform.value = nightFactor * 0.16;
      sl.cone.visible = sl.opacityUniform.value > 0.004; // free during the day
      let az, el;
      const target = threats && threats[i % Math.max(1, threats.length)];
      if (nightFactor > 0.5 && target && target.alive && target.pos.y > 400) {
        const dx = target.pos.x - sl.x, dz = target.pos.z - sl.z;
        az = Math.atan2(dx, dz);
        el = Math.atan2(target.pos.y, Math.hypot(dx, dz));
      } else {
        // idle sweep kept at 35-60 deg elevation so the cones rake across the
        // sky instead of pointing near-vertical (where they read as lines)
        az = Math.sin(t * 0.13 + sl.phase) * 1.4 + sl.phase;
        el = 0.83 + Math.sin(t * 0.09 + sl.phase * 2) * 0.215;
      }
      // smooth
      sl.yoke.rotation.y += (az - sl.yoke.rotation.y) * Math.min(1, dt * 2.2);
      // beam local axis is +Z (horizontal); negative X rotation elevates it
      const targetX = -el;
      sl.drum.rotation.x += (targetX - sl.drum.rotation.x) * Math.min(1, dt * 2.2);
    }

    // flag wave
    if (this.flag) {
      const g = this.flag.geometry;
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const k = (x + 0.85) / 1.7;
        p.setZ(i, Math.sin(t * 2.4 + k * 4.5) * 0.09 * k + Math.sin(t * 5.1 + k * 9) * 0.03 * k);
      }
      p.needsUpdate = true;
      g.computeVertexNormals();
    }
  }
}

// ---------------------------------------------------------------- local canvas
// textures (kept here so texgen.js stays untouched)
function localCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function localTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// dusty desaturated traffic cone: orange body, one pale reflective band
function trafficConeTexture() {
  const [c, g] = localCanvas(64, 64);
  g.fillStyle = '#a34d28'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#c6bfae'; g.fillRect(0, 22, 64, 13);
  const rnd = mulberry32(272);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(60,42,28,${0.06 + rnd() * 0.16})`;
    g.fillRect(rnd() * 64, rnd() * 64, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  return localTex(c);
}

// olive tent fabric with ribs running over the arch + skirt grime at the hems
function tentFabricTexture() {
  const S = 256, [c, g] = localCanvas(S, S), rnd = mulberry32(636);
  g.fillStyle = '#5a614a'; g.fillRect(0, 0, S, S);
  // fabric tonal blotches
  for (let i = 0; i < 42; i++) {
    const x = rnd() * S, y = rnd() * S, w = 18 + rnd() * 50, h = 8 + rnd() * 22;
    g.fillStyle = `rgba(${rnd() < 0.5 ? '34,38,26' : '150,152,120'},${0.04 + rnd() * 0.07})`;
    g.beginPath(); g.ellipse(x, y, w, h, rnd() * 3, 0, 7); g.fill();
  }
  // ribs (constant v = axial position -> horizontal lines here)
  for (let y = 10; y < S; y += 30) {
    g.fillStyle = 'rgba(24,27,18,0.45)'; g.fillRect(0, y, S, 3);
    g.fillStyle = 'rgba(210,214,180,0.12)'; g.fillRect(0, y + 3, S, 1);
  }
  // seam stitching lines along the tunnel
  for (let x = 36; x < S; x += 64) {
    g.fillStyle = 'rgba(30,33,22,0.3)'; g.fillRect(x, 0, 2, S);
  }
  // skirt dirt at both hems (u edges)
  for (const x0 of [0, S - 26]) {
    const grad = g.createLinearGradient(x0 === 0 ? 26 : x0, 0, x0 === 0 ? 0 : S, 0);
    grad.addColorStop(0, 'rgba(58,48,32,0)');
    grad.addColorStop(1, 'rgba(58,48,32,0.4)');
    g.fillStyle = grad; g.fillRect(x0, 0, 26, S);
  }
  return localTex(c);
}

// pair of soft dark wheel ruts, fading at both ends (v runs along the track)
function tireTrackTexture() {
  const W = 128, H = 256, [c, g] = localCanvas(W, H), rnd = mulberry32(848);
  g.clearRect(0, 0, W, H);
  for (const cx of [40, 88]) {
    for (let y = 0; y < H; y += 3) {
      const fade = Math.sin((y / H) * Math.PI);
      const wob = Math.sin(y * 0.06 + cx) * 3;
      g.fillStyle = `rgba(38,30,20,${0.34 * fade * (0.7 + rnd() * 0.5)})`;
      const w = 10 + rnd() * 5;
      g.fillRect(cx + wob - w / 2, y, w, 3);
    }
  }
  const t = localTex(c, false);
  return t;
}

// big soft blotch of compacted/darkened earth; alpha kept subtle
function dirtPatchTexture() {
  const S = 256, [c, g] = localCanvas(S, S), rnd = mulberry32(929);
  g.clearRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.3;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r * 0.8;
    const rad = S * (0.08 + rnd() * 0.16);
    const maxRad = Math.min(x, y, S - x, S - y) - 2;
    const rr = Math.max(4, Math.min(rad, maxRad));
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, `rgba(52,42,28,${0.05 + rnd() * 0.06})`);
    grad.addColorStop(1, 'rgba(52,42,28,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  return localTex(c, false);
}
