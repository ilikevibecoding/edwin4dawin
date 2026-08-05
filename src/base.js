// base.js — procedural military base: terrain, mountains, roads, fence, command
// shelter, radar installation, pads, generators, trucks, masts, lights, clutter.
import * as THREE from 'three';
import { Rand, fbm2D, clamp, TAU } from './util.js';
import { makeColliderBox, makeColliderCyl } from './physics.js';

const BASE_FLAT_RADIUS = 300;

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  const flat = smooth01((r - BASE_FLAT_RADIUS) / 700);
  if (flat <= 0) return 0;
  const n = fbm2D(x * 0.00045 + 13.7, z * 0.00045 + 7.3, 4);
  const dunes = fbm2D(x * 0.0035, z * 0.0035, 2) * 2.2;
  return (Math.pow(n, 1.6) * 130 + dunes) * flat;
}
function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

export function createBase(ctx) {
  const { scene, textures } = ctx;
  const rng = new Rand(4242);
  const colliders = ctx.world.colliders;
  const group = new THREE.Group();
  group.name = 'base';
  scene.add(group);

  const dynamic = []; // objects updated per-frame: fn(dt, t)

  // ---------- shared materials ----------
  const padConcreteTex = textures.concrete().clone();
  padConcreteTex.repeat.set(2.2, 2.2);
  const M = {
    sand: new THREE.MeshStandardMaterial({ map: textures.sand(), roughness: 0.96, metalness: 0 }),
    concrete: new THREE.MeshStandardMaterial({ map: textures.concrete(), roughness: 0.92 }),
    concretePad: new THREE.MeshStandardMaterial({ map: padConcreteTex, roughness: 0.92 }),
    asphalt: new THREE.MeshStandardMaterial({ map: textures.asphalt(), roughness: 0.94 }),
    tan: new THREE.MeshStandardMaterial({ map: textures.desertTan(), roughness: 0.82 }),
    olive: new THREE.MeshStandardMaterial({ map: textures.oliveDrab(), roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ map: textures.metalPlate(), roughness: 0.55, metalness: 0.65 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x2e3134, roughness: 0.5, metalness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8b9299, roughness: 0.42, metalness: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.95 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.9 }),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x0c1116, roughness: 0.12, metalness: 0.9 }),
    hazard: new THREE.MeshStandardMaterial({ map: textures.hazardStripes(), roughness: 0.85 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.98, flatShading: true }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.7 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 2.2 }),
    greenLight: new THREE.MeshStandardMaterial({ color: 0x00330a, emissive: 0x2aff55, emissiveIntensity: 1.8 }),
    amberLight: new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffaa22, emissiveIntensity: 2.0 }),
  };
  ctx.baseMaterials = M;

  const addBox = (mat, w, h, d, x, y, z, { rot = 0, castShadow = true, parent = group, collide = false } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = rot;
    m.castShadow = castShadow;
    m.receiveShadow = true;
    parent.add(m);
    if (collide) colliders.push(makeColliderBox(worldX(m, parent), worldZ(m, parent), w / 2 + 0.12, d / 2 + 0.12, rot + parentYaw(parent), 0, y + h / 2 + 0.4));
    return m;
  };
  const worldX = (m, parent) => (parent === group ? m.position.x : m.getWorldPosition(_wv).x);
  const worldZ = (m, parent) => (parent === group ? m.position.z : _wv.z);
  const parentYaw = (parent) => (parent === group ? 0 : parent.rotation.y);
  const _wv = new THREE.Vector3();

  // ============================================================ TERRAIN
  {
    const size = 16000, segs = 220;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      // macro tint variation
      const tint = 0.82 + fbm2D(x * 0.0012 + 3, z * 0.0012 + 9, 3) * 0.36;
      col.setRGB(tint, tint * 0.985, tint * 0.94);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = M.sand.clone();
    mat.vertexColors = true;
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    group.add(terrain);
  }

  // ============================================================ MOUNTAINS
  {
    const N = 200, inner = 6800, outer = 10500;
    const positions = [];
    const addRidge = (radius, maxH, seed) => {
      const ring = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const r = radius + fbm2D(Math.cos(a) * 3 + seed, Math.sin(a) * 3 + seed, 3) * 1400;
        const h = Math.pow(fbm2D(Math.cos(a) * 5.2 + seed * 2, Math.sin(a) * 5.2, 4), 1.4) * maxH + 140;
        ring.push([Math.sin(a) * r, h, Math.cos(a) * r]);
      }
      for (let i = 0; i < N; i++) {
        const [x0, h0, z0] = ring[i];
        const [x1, h1, z1] = ring[i + 1];
        const b0 = [x0 * 1.28, 0, z0 * 1.28];
        const b1 = [x1 * 1.28, 0, z1 * 1.28];
        const f0 = [x0 * 0.86, 0, z0 * 0.86];
        const f1 = [x1 * 0.86, 0, z1 * 0.86];
        // front faces + back faces (peaks as triangles strip)
        positions.push(...f0, x0, h0, z0, ...f1);
        positions.push(x0, h0, z0, x1, h1, z1, ...f1);
        positions.push(...b0, x0, h0, z0, ...b1);
        positions.push(x0, h0, z0, x1, h1, z1, ...b1);
      }
    };
    addRidge(8200, 1500, 5);
    addRidge(10200, 2100, 11);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8d7f6c, roughness: 1, flatShading: true });
    const mountains = new THREE.Mesh(geo, mat);
    mountains.name = 'mountains';
    group.add(mountains);
  }

  // ============================================================ APRON + MARKINGS
  {
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 96), M.concrete);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = 0.02;
    apron.receiveShadow = true;
    group.add(apron);

    // pad extensions under batteries
    for (const [x, z] of [[-46, 32], [2, 50], [48, 30]]) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), M.concretePad);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.025, z);
      pad.receiveShadow = true;
      group.add(pad);
      // hazard ring
      const ring = new THREE.Mesh(new THREE.RingGeometry(10.6, 11.6, 48), M.hazard.clone());
      ring.material.polygonOffset = true;
      ring.material.polygonOffsetFactor = -2;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.035, z);
      ring.receiveShadow = true;
      group.add(ring);
    }

    const mkDecal = (tex, w, h, x, z, rot = 0, opacity = 0.85) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })
      );
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.045, z);
      m.renderOrder = 2;
      group.add(m);
      return m;
    };
    mkDecal(textures.label('KEEP CLEAR', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 64px Arial' }), 16, 3, -20, 16);
    mkDecal(textures.label('LAUNCH AREA A', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, -46, 20, 0);
    mkDecal(textures.label('LAUNCH AREA B', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, 2, 37, 0);
    mkDecal(textures.label('LAUNCH AREA C', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, 48, 18, 0);
    mkDecal(textures.roundel(), 10, 10, 22, -8, 0, 0.5);
  }

  // ============================================================ ROADS
  {
    const road = (x, z, len, wid, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), M.asphalt);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.012, z);
      m.receiveShadow = true;
      group.add(m);
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, len),
        new THREE.MeshBasicMaterial({ map: textures.roadLine(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
      );
      line.rotation.copy(m.rotation);
      line.position.set(x, 0.03, z);
      line.renderOrder = 1;
      group.add(line);
    };
    road(0, 96, 100, 8, 0);        // gate to apron
    road(-70, 60, 90, 6, Math.PI / 4);  // west loop
    road(80, 62, 84, 6, -Math.PI / 5);  // east loop
    road(-100, -20, 120, 6, Math.PI / 2 + 0.35);
  }

  // ============================================================ PERIMETER FENCE
  {
    const HX = 165, HZ = 145, gateHalf = 5;
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.9, 6);
    const posts = [];
    const walk = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 4);
      for (let i = 0; i <= n; i++) {
        posts.push([x0 + (x1 - x0) * (i / n), z0 + (z1 - z0) * (i / n)]);
      }
    };
    walk(-HX, -HZ, HX, -HZ);
    walk(HX, -HZ, HX, HZ);
    walk(HX, HZ, gateHalf, HZ);
    walk(-gateHalf, HZ, -HX, HZ);
    walk(-HX, HZ, -HX, -HZ);
    const postMesh = new THREE.InstancedMesh(postGeo, M.darkMetal, posts.length);
    const mtx = new THREE.Matrix4();
    posts.forEach(([x, z], i) => {
      mtx.makeTranslation(x, 1.45, z);
      postMesh.setMatrixAt(i, mtx);
    });
    postMesh.castShadow = false;
    group.add(postMesh);

    const linkMat = new THREE.MeshStandardMaterial({
      map: textures.chainlink(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
      color: 0xd0d4d8, roughness: 0.6, metalness: 0.55,
    });
    const fencePanel = (x, z, len, rot) => {
      const geo = new THREE.PlaneGeometry(len, 2.5);
      const m = new THREE.Mesh(geo, linkMat.clone());
      m.material.map = m.material.map.clone();
      m.material.map.repeat.set(len / 1.6, 1.6);
      m.material.map.needsUpdate = true;
      m.position.set(x, 1.3, z);
      m.rotation.y = rot;
      group.add(m);
      // top barbed rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), M.darkMetal);
      rail.position.set(x, 2.68, z);
      rail.rotation.y = rot;
      group.add(rail);
    };
    fencePanel(0, -HZ, HX * 2, 0);
    fencePanel(HX, 0, HZ * 2, Math.PI / 2);
    fencePanel(-HX, 0, HZ * 2, Math.PI / 2);
    fencePanel((HX + gateHalf) / 2, HZ, HX - gateHalf, 0);
    fencePanel(-(HX + gateHalf) / 2, HZ, HX - gateHalf, 0);
    colliders.push(makeColliderBox(0, -HZ, HX, 0.25, 0, 0, 3));
    colliders.push(makeColliderBox(HX, 0, 0.25, HZ, 0, 0, 3));
    colliders.push(makeColliderBox(-HX, 0, 0.25, HZ, 0, 0, 3));
    colliders.push(makeColliderBox((HX + gateHalf) / 2 + 1, HZ, (HX - gateHalf) / 2, 0.25, 0, 0, 3));
    colliders.push(makeColliderBox(-(HX + gateHalf) / 2 - 1, HZ, (HX - gateHalf) / 2, 0.25, 0, 0, 3));

    // gate: slid-open panel + guard hut
    const gatePanel = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), linkMat);
    gatePanel.position.set(gateHalf + 5.5, 1.25, HZ + 0.6);
    group.add(gatePanel);
    addBox(M.tan, 3, 2.7, 2.6, -gateHalf - 3, 1.35, HZ - 2, { collide: true });
    // warning signs on fence
    const signTex = textures.label('RESTRICTED AREA — USE OF FORCE AUTHORIZED', { fg: '#fff', bg: '#8c1c13', w: 512, h: 96, font: 'bold 30px Arial' });
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
      s.position.set(i * 60 + 10, 1.7, HZ - 0.08);
      group.add(s);
    }
  }

  // ============================================================ COMMAND SHELTER
  const shelter = new THREE.Group();
  shelter.position.set(-32, 0, -18);
  group.add(shelter);
  let consoleScreen, holoAnchor, consolePos;
  {
    const W = 9, H = 3.1, D = 6, t = 0.16;
    const sx = shelter.position.x, sz = shelter.position.z;
    // floor + roof
    addBox(M.concrete, W, 0.14, D, 0, 0.07, 0, { parent: shelter });
    addBox(M.tan, W + 0.3, 0.18, D + 0.3, 0, H + 0.09, 0, { parent: shelter });
    // walls: back(-z), left, right, front two segments around door at +z
    addBox(M.tan, W, H, t, 0, H / 2, -D / 2, { parent: shelter });
    addBox(M.tan, t, H, D, -W / 2, H / 2, 0, { parent: shelter });
    addBox(M.tan, t, H, D, W / 2, H / 2, 0, { parent: shelter });
    const doorW = 1.5, doorX = 1.6;
    const seg1W = W / 2 + (doorX - doorW / 2);
    const seg2W = W / 2 - (doorX + doorW / 2);
    addBox(M.tan, seg1W, H, t, -W / 2 + seg1W / 2, H / 2, D / 2, { parent: shelter });
    addBox(M.tan, seg2W, H, t, W / 2 - seg2W / 2, H / 2, D / 2, { parent: shelter });
    addBox(M.tan, doorW, H - 2.15, t, doorX, 2.15 + (H - 2.15) / 2, D / 2, { parent: shelter }); // lintel
    colliders.push(makeColliderBox(sx, sz - D / 2, W / 2, t, 0, 0, H));
    colliders.push(makeColliderBox(sx - W / 2, sz, t, D / 2, 0, 0, H));
    colliders.push(makeColliderBox(sx + W / 2, sz, t, D / 2, 0, 0, H));
    colliders.push(makeColliderBox(sx - W / 2 + seg1W / 2, sz + D / 2, seg1W / 2, t, 0, 0, H));
    colliders.push(makeColliderBox(sx + W / 2 - seg2W / 2, sz + D / 2, seg2W / 2, t, 0, 0, H));

    // door (open, swung outward)
    const door = addBox(M.olive, doorW - 0.1, 2.1, 0.06, doorX + doorW / 2 + 0.62, 1.06, D / 2 + 0.7, { parent: shelter, rot: -1.25 });
    door.castShadow = true;

    // console desk + screen (north wall interior)
    const desk = addBox(M.darkMetal, 3.4, 0.08, 0.95, -1.2, 0.86, -D / 2 + 0.75, { parent: shelter, collide: true });
    addBox(M.darkMetal, 3.2, 0.8, 0.7, -1.2, 0.42, -D / 2 + 0.72, { parent: shelter });
    // angled screen
    const scrGeo = new THREE.PlaneGeometry(1.9, 1.05);
    consoleScreen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ color: 0x0a1408 }));
    consoleScreen.position.set(-1.2, 1.62, -D / 2 + 0.45);
    consoleScreen.rotation.x = -0.3;
    shelter.add(consoleScreen);
    const scrFrame = addBox(M.darkMetal, 2.05, 1.2, 0.1, -1.2, 1.6, -D / 2 + 0.38, { parent: shelter });
    scrFrame.rotation.x = -0.3;
    // keyboard + panels
    addBox(M.rubber, 1.1, 0.03, 0.35, -1.4, 0.92, -D / 2 + 0.78, { parent: shelter });
    const btnPanel = addBox(M.metal, 0.9, 0.04, 0.5, -0.1, 0.91, -D / 2 + 0.78, { parent: shelter });
    // big red START button housing
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.07, 16), new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xcc2211, emissiveIntensity: 0.9, roughness: 0.4 }));
    btn.position.set(-0.1, 0.97, -D / 2 + 0.7);
    shelter.add(btn);
    dynamic.push((dt, t2) => { btn.material.emissiveIntensity = 0.9 + Math.sin(t2 * 3.1) * 0.5; });

    // holographic radar table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.92, 24), M.darkMetal);
    table.position.set(2.4, 0.46, -0.6);
    table.castShadow = true;
    shelter.add(table);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 8, 40), new THREE.MeshStandardMaterial({ color: 0x06222a, emissive: 0x27c4de, emissiveIntensity: 1.6 }));
    rim.position.set(2.4, 0.93, -0.6);
    rim.rotation.x = Math.PI / 2;
    shelter.add(rim);
    colliders.push(makeColliderCyl(sx + 2.4, sz - 0.6, 1.05, 0, 1.0));
    holoAnchor = new THREE.Object3D();
    holoAnchor.position.set(2.4, 0.98, -0.6);
    shelter.add(holoAnchor);

    // racks with blink lights
    const rack = addBox(M.darkMetal, 0.7, 2.1, 1.8, -W / 2 + 0.55, 1.05, 0.9, { parent: shelter, collide: true });
    const rack2 = addBox(M.darkMetal, 0.7, 2.1, 1.2, -W / 2 + 0.55, 1.05, -1.4, { parent: shelter, collide: true });
    const ledGeo = new THREE.PlaneGeometry(0.05, 0.05);
    const leds = [];
    for (let i = 0; i < 14; i++) {
      const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: rng.next() < 0.6 ? 0x33ff66 : 0xffaa22 }));
      led.position.set(-W / 2 + 0.92, 0.5 + rng.next() * 1.4, -2 + rng.next() * 3.6);
      led.rotation.y = Math.PI / 2;
      shelter.add(led);
      leds.push([led, rng.next() * 5, rng.range(2, 9)]);
    }
    dynamic.push((dt, t2) => {
      for (const [led, ph, fr] of leds) led.visible = Math.sin(t2 * fr + ph * 9) > -0.6;
    });

    // interior light
    const lamp = new THREE.PointLight(0xcfe0ff, 14, 14, 2);
    lamp.position.set(0, H - 0.3, 0);
    shelter.add(lamp);
    const lampFix = addBox(M.white, 0.7, 0.06, 0.18, 0, H - 0.12, 0, { parent: shelter, castShadow: false });
    lampFix.material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe8ff, emissiveIntensity: 1.6 });

    // roof antennas + AC
    addBox(M.metal, 1.1, 0.8, 0.9, W / 2 - 1, H + 0.55, -1.4, { parent: shelter });
    const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 3.4, 5), M.darkMetal);
    whip.position.set(-W / 2 + 0.7, H + 1.85, -2);
    shelter.add(whip);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), M.white);
    dome.position.set(-2, H + 0.3, 1.8);
    shelter.add(dome);
    // sandbags at the door
    for (let i = 0; i < 6; i++) {
      const bag = addBox(M.tan, 0.55, 0.22, 0.34, 3.4 + (i % 2) * 0.3 - 0.15, 0.12 + Math.floor(i / 2) * 0.21, D / 2 + 0.9, { parent: shelter, rot: rng.range(-0.2, 0.2) });
      bag.geometry = new THREE.BoxGeometry(0.55, 0.22, 0.34, 1, 1, 1);
    }
    // signage
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshBasicMaterial({ map: textures.label('BATTERY CONTROL — C2 SHELTER', { fg: '#e5e2d4', bg: '#3a3d33', w: 512, h: 80, font: 'bold 34px Arial' }) }));
    plate.position.set(0.4, 2.6, D / 2 + 0.09);
    shelter.add(plate);

    consolePos = new THREE.Vector3(sx - 1.2, 0, sz - D / 2 + 2.0);
  }

  // ============================================================ RADAR INSTALLATION
  const radarGroup = new THREE.Group();
  radarGroup.position.set(36, 0, -28);
  group.add(radarGroup);
  let radarHead;
  {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.24, 8), M.concrete);
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    radarGroup.add(pad);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 2.6, 12), M.olive);
    pedestal.position.y = 1.5;
    pedestal.castShadow = true;
    radarGroup.add(pedestal);
    colliders.push(makeColliderCyl(36, -28, 1.5, 0, 4));

    radarHead = new THREE.Group();
    radarHead.position.y = 3.0;
    radarGroup.add(radarHead);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.2), M.metal);
    radarHead.add(yoke);
    const panel = new THREE.Group();
    panel.position.set(0, 1.7, 0);
    panel.rotation.x = -0.35;
    radarHead.add(panel);
    const face = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.1, 0.34), M.olive);
    face.castShadow = true;
    panel.add(face);
    // array face detail: emissive element grid
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(4.1, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x2a2d24, roughness: 0.8, map: textures.metalPlate() })
    );
    grid.position.z = 0.18;
    panel.add(grid);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x77ffcc, emissiveIntensity: 1.4 }));
    eye.position.set(0, -0.4, 0.19);
    panel.add(eye);
    // struts
    for (const s of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), M.steel);
      strut.position.set(s * 1.6, 0.9, 0.5);
      strut.rotation.x = 0.5;
      radarHead.add(strut);
    }
    // obstruction light
    const obl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.redLight.clone());
    obl.position.set(0, 3.6, 0);
    radarHead.add(obl);
    dynamic.push((dt, t2) => {
      radarHead.rotation.y = (t2 * 0.85) % TAU;
      obl.material.emissiveIntensity = Math.sin(t2 * 2.4) > 0 ? 2.6 : 0.15;
    });
    // support trailer (radarGroup-local placement, world collider)
    const trailer = addBox(M.olive, 4.6, 1.5, 2.2, 7.5, 1.05, 2.5, { parent: radarGroup, rot: 0.4 });
    colliders.push(makeColliderBox(36 + 7.5, -28 + 2.5, 2.5, 1.3, 0.4, 0, 2));
    for (const [wx, wz] of [[-1.5, -1.05], [1.5, -1.05], [-1.5, 1.05], [1.5, 1.05]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), M.rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.rotation.y = 0.4;
      wheel.position.set(7.5 + wx * Math.cos(0.4) - wz * Math.sin(0.4), 0.42, 2.5 + wx * Math.sin(0.4) + wz * Math.cos(0.4));
      radarGroup.add(wheel);
    }
    void trailer;
  }

  // ============================================================ FLOODLIGHT TOWERS
  const floodlights = [];
  {
    const spots = [[-52, -40], [52, -40], [-52, 44], [56, 44]];
    for (const [x, z] of spots) {
      const tw = new THREE.Group();
      tw.position.set(x, 0, z);
      group.add(tw);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 11, 8), M.darkMetal);
      mast.position.y = 5.5;
      mast.castShadow = true;
      tw.add(mast);
      colliders.push(makeColliderCyl(x, z, 0.45, 0, 11));
      const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), M.darkMetal);
      cross.position.y = 10.6;
      tw.add(cross);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x606468, emissive: 0x000000, roughness: 0.5, metalness: 0.4 });
      const heads = [];
      for (const s of [-0.8, 0, 0.8]) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.3), headMat);
        head.position.set(s, 10.45, 0.15);
        head.rotation.x = 0.7;
        tw.add(head);
        heads.push(head);
      }
      const spot = new THREE.SpotLight(0xdfe8ff, 0, 90, 0.62, 0.5, 1.4);
      spot.position.set(0, 10.4, 0);
      spot.target.position.set(x * -0.35, 0, z * -0.35);
      tw.add(spot);
      group.add(spot.target);
      spot.target.position.set(x * 0.55, 0, z * 0.55);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.hardFlare(), color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }));
      glow.scale.setScalar(3.2);
      glow.position.y = 10.5;
      tw.add(glow);
      floodlights.push({ spot, glow, headMat });
    }
  }

  // ============================================================ GENERATORS + CABLES
  const generators = [];
  {
    const genAt = (x, z, rot, cableTo) => {
      const g2 = new THREE.Group();
      g2.position.set(x, 0, z);
      g2.rotation.y = rot;
      group.add(g2);
      addBox(M.olive, 2.3, 1.35, 1.3, 0, 0.75, 0, { parent: g2 });
      colliders.push(makeColliderBox(x, z, 1.3, 0.8, rot, 0, 1.6));
      addBox(M.darkMetal, 2.0, 0.12, 1.1, 0, 1.48, 0, { parent: g2, castShadow: false });
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), M.darkMetal);
      pipe.position.set(0.8, 1.75, -0.3);
      g2.add(pipe);
      const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), M.rubber);
      vent.position.set(1.16, 0.75, 0);
      vent.rotation.y = Math.PI / 2;
      g2.add(vent);
      const lightM = M.greenLight.clone();
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), lightM);
      led.position.set(-1.0, 1.2, 0.66);
      g2.add(led);
      // fuel can + blob shadow
      addBox(M.tan, 0.4, 0.5, 0.25, -1.6, 0.25, 0.3, { parent: g2 });
      // sagging cable to consumer
      if (cableTo) {
        const from = new THREE.Vector3(x, 1.0, z);
        const to = new THREE.Vector3(cableTo[0], cableTo[2] ?? 0.5, cableTo[1]);
        const mid = from.clone().lerp(to, 0.5);
        mid.y = Math.min(from.y, to.y) * 0.5 - 0.1;
        mid.y = Math.max(0.08, mid.y);
        const curve = new THREE.CatmullRomCurve3([from, mid, to]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.035, 6), M.cable);
        group.add(tube);
      }
      generators.push({ position: new THREE.Vector3(x, 0.8, z) });
      return g2;
    };
    genAt(-38, 24, 0.4, [-46, 30, 1.2]);
    genAt(10, 42, -0.5, [2, 48, 1.2]);
    genAt(40, 36, 0.9, [48, 30, 1.2]);
    genAt(-25, -13, 1.57, [-28, -16, 1.0]);
    genAt(30, -21, -0.7, [34, -26, 1.4]);
  }

  // ============================================================ SUPPORT TRUCKS
  {
    const truckAt = (x, z, rot) => {
      const t2 = new THREE.Group();
      t2.position.set(x, 0, z);
      t2.rotation.y = rot;
      group.add(t2);
      // chassis + cab + bed
      addBox(M.darkMetal, 2.3, 0.5, 7.2, 0, 0.75, 0, { parent: t2 });
      const cab = addBox(M.tan, 2.3, 1.5, 1.9, 0, 1.75, 2.55, { parent: t2 });
      const winShield = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.62), M.glassDark);
      winShield.position.set(0, 2.05, 3.51);
      winShield.rotation.x = -0.18;
      t2.add(winShield);
      const bed = addBox(M.olive, 2.4, 1.55, 4.6, 0, 1.85, -0.9, { parent: t2 });
      // canvas ribs hint
      for (let i = 0; i < 4; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.03, 6, 12, Math.PI), M.olive);
        rib.position.set(0, 1.9, -2.9 + i * 1.35);
        rib.rotation.y = Math.PI / 2;
        rib.rotation.z = Math.PI / 2;
        t2.add(rib);
      }
      const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
      for (const [wx, wz] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -0.2], [1.05, -0.2], [-1.05, -1.6], [1.05, -1.6], [-1.05, -2.9], [1.05, -2.9]]) {
        const w = new THREE.Mesh(wheelGeo, M.rubber);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.55, wz);
        w.castShadow = true;
        t2.add(w);
      }
      colliders.push(makeColliderBox(x, z, 1.4, 3.8, rot, 0, 3.2));
      // blob shadow
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 8.4), new THREE.MeshBasicMaterial({ map: textures.softPuff(), color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.05;
      t2.add(blob);
      return t2;
    };
    truckAt(-16, -36, 0.12);
    truckAt(-26, -36, -0.06);
    truckAt(78, 10, 1.2);
  }

  // ============================================================ ANTENNA MAST FARM
  {
    const masts = [[16, -44, 17], [24, -48, 12], [10, -50, 14]];
    for (const [x, z, h] of masts) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), M.steel);
      mast.position.set(x, h / 2, z);
      mast.castShadow = true;
      group.add(mast);
      colliders.push(makeColliderCyl(x, z, 0.35, 0, h));
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.redLight.clone());
      beacon.position.set(x, h + 0.15, z);
      group.add(beacon);
      const ph = rng.next() * 6;
      dynamic.push((dt, t2) => { beacon.material.emissiveIntensity = Math.sin(t2 * 1.8 + ph) > 0.2 ? 2.8 : 0.1; });
      // guy wires
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + 0.4;
        const gx = x + Math.cos(a) * h * 0.55;
        const gz = z + Math.sin(a) * h * 0.55;
        const wire = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, h * 0.85, z), new THREE.Vector3(gx, 0, gz)]),
          new THREE.LineBasicMaterial({ color: 0x333639, transparent: true, opacity: 0.7 })
        );
        group.add(wire);
      }
      // crossarms
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.05), M.steel);
      arm.position.set(x, h * 0.82, z);
      arm.rotation.y = rng.next() * 3;
      group.add(arm);
    }
  }

  // ============================================================ BARRIERS & CLUTTER
  {
    // HESCO-style bastions around pads
    const hescoGeo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    const hescoPositions = [];
    const ringAt = (cx, cz, r, a0, a1, step = 1.5) => {
      const arc = a1 - a0;
      const n = Math.max(2, Math.floor((arc * r) / step));
      for (let i = 0; i <= n; i++) {
        const a = a0 + (arc * i) / n;
        hescoPositions.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, a]);
      }
    };
    ringAt(-46, 32, 13.5, Math.PI * 0.7, Math.PI * 1.65);
    ringAt(2, 50, 13.5, Math.PI * 0.15, Math.PI * 0.95);
    ringAt(48, 30, 13.5, Math.PI * 1.3, Math.PI * 2.15);
    const hesco = new THREE.InstancedMesh(hescoGeo, M.tan, hescoPositions.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    hescoPositions.forEach(([x, z, a], i) => {
      eul.set(0, -a + rng.range(-0.06, 0.06), 0);
      q.setFromEuler(eul);
      m4.compose(new THREE.Vector3(x, 0.675, z), q, new THREE.Vector3(1, 1, 1));
      hesco.setMatrixAt(i, m4);
    });
    hesco.castShadow = true;
    hesco.receiveShadow = true;
    group.add(hesco);
    // collide as coarse arcs (a few boxes)
    colliders.push(makeColliderBox(-52, 40, 9, 1.4, -0.8, 0, 1.5));
    colliders.push(makeColliderBox(9, 57, 9, 1.4, 0.5, 0, 1.5));
    colliders.push(makeColliderBox(55, 24, 9, 1.4, 0.7, 0, 1.5));

    // jersey barriers along entry road
    const jerseyGeo = (() => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.4, 0); shape.lineTo(0.4, 0); shape.lineTo(0.16, 0.55);
      shape.lineTo(0.16, 0.9); shape.lineTo(-0.16, 0.9); shape.lineTo(-0.16, 0.55);
      shape.closePath();
      const g3 = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      g3.translate(0, 0, -1.5);
      return g3;
    })();
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -5 : 5;
      const jz = 58 + Math.floor(i / 2) * 16;
      const jb = new THREE.Mesh(jerseyGeo, M.concrete);
      jb.position.set(side, 0, jz);
      jb.castShadow = true;
      jb.receiveShadow = true;
      group.add(jb);
      colliders.push(makeColliderBox(side, jz, 0.45, 1.55, 0, 0, 1));
    }

    // equipment cases + pallets near shelter & pads
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x24301f, roughness: 0.85 });
    const caseSpots = [[-27, -12], [-26.2, -11.2], [-25.6, -12.4], [-44, 25], [5, 44], [44, 25], [-27, -12.7]];
    for (const [x, z] of caseSpots) {
      for (let s = 0; s < 3; s++) {
        const cw = rng.range(0.7, 1.1), cd = rng.range(0.45, 0.7), ch = rng.range(0.3, 0.42);
        const cs = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), caseMat);
        cs.position.set(x + rng.range(-0.6, 0.6), ch / 2 + s * 0.36 * (rng.next() < 0.5 ? 1 : 0), z + rng.range(-0.6, 0.6));
        cs.rotation.y = rng.next() * 1.2;
        cs.castShadow = true;
        group.add(cs);
      }
    }
    colliders.push(makeColliderCyl(-26.2, -12, 1.6, 0, 1.2));

    // cable protector humps crossing apron
    for (const [x, z, len, rot] of [[-10, 6, 18, 0.35], [18, 22, 14, -0.5]]) {
      const hump = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 8, 1, false, 0, Math.PI), M.rubber);
      hump.rotation.z = Math.PI / 2;
      hump.rotation.y = rot;
      hump.position.set(x, 0.045, z);
      group.add(hump);
    }
  }

  // ============================================================ SEARCHLIGHTS (night raid)
  const searchlights = [];
  {
    for (const [x, z, ph] of [[-62, -58, 0], [72, -52, 2.4]]) {
      const sl = new THREE.Group();
      sl.position.set(x, 0, z);
      group.add(sl);
      addBox(M.olive, 1.8, 0.9, 1.8, 0, 0.5, 0, { parent: sl, collide: true });
      const pivot = new THREE.Group();
      pivot.position.y = 1.3;
      sl.add(pivot);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 16), M.metal);
      drum.rotation.x = Math.PI / 2;
      pivot.add(drum);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xeaf2ff }));
      lens.position.z = 0.42;
      pivot.add(lens);
      const beamLen = 900;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 26, beamLen, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false })
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.z = beamLen / 2;
      pivot.add(beam);
      sl.visible = true;
      beam.visible = false;
      lens.visible = false;
      searchlights.push({ group: sl, pivot, beam, lens, phase: ph });
    }
  }

  // ============================================================ ROCKS + SCRUB
  {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(rockGeo, M.rock, 300);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    let placed = 0;
    let guard = 0;
    while (placed < 300 && guard++ < 4000) {
      const a = rng.next() * TAU;
      const r = rng.range(190, 2600);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rng.range(0.3, 2.6);
      const y = terrainHeight(x, z);
      e.set(rng.next() * 3, rng.next() * 3, rng.next() * 3);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, y + s * 0.2, z), q, new THREE.Vector3(s, s * rng.range(0.55, 0.9), s));
      rocks.setMatrixAt(placed, m4);
      col.setHSL(0.09, rng.range(0.12, 0.25), rng.range(0.38, 0.6));
      rocks.setColorAt(placed, col);
      placed++;
    }
    rocks.castShadow = false;
    rocks.receiveShadow = true;
    group.add(rocks);

    // scrub bushes: crossed planes
    const plane = new THREE.PlaneGeometry(1.6, 1.1);
    plane.translate(0, 0.5, 0);
    const crossGeo = plane.clone();
    const p2 = plane.clone();
    p2.rotateY(Math.PI / 2);
    const merged = mergeGeoms([crossGeo, p2]);
    const scrubMat = new THREE.MeshStandardMaterial({ map: textures.scrub(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const scrub = new THREE.InstancedMesh(merged, scrubMat, 420);
    placed = 0; guard = 0;
    while (placed < 420 && guard++ < 6000) {
      const a = rng.next() * TAU;
      const r = rng.range(175, 1900);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rng.range(0.5, 1.6);
      e.set(0, rng.next() * TAU, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, new THREE.Vector3(s, s, s));
      scrub.setMatrixAt(placed, m4);
      placed++;
    }
    scrub.castShadow = false;
    group.add(scrub);
  }

  function mergeGeoms(geoms) {
    // minimal merge: concatenates position/normal/uv of non-indexed clones
    const gs = geoms.map((g) => g.toNonIndexed ? g.toNonIndexed() : g);
    let total = 0;
    for (const g of gs) total += g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const item = gs[0].attributes[name].itemSize;
      const arr = new Float32Array(total * item);
      let off = 0;
      for (const g of gs) {
        arr.set(g.attributes[name].array, off);
        off += g.attributes[name].array.length;
      }
      out.setAttribute(name, new THREE.BufferAttribute(arr, item));
    }
    return out;
  }

  // ============================================================ time-of-day reactions
  ctx.events.on('time-of-day', () => {
    const on = ctx.weather.floodlightsOn;
    for (const f of floodlights) {
      f.spot.intensity = on ? 900 : 0;
      f.glow.material.opacity = on ? 0.5 : 0;
      f.headMat.emissive.setHex(on ? 0xcfe0ff : 0x000000);
      f.headMat.emissiveIntensity = on ? 2.4 : 0;
    }
  });

  // battery pads: positions + facing used by batteries.js
  const batteryPads = {
    patriot: { position: new THREE.Vector3(-46, 0, 32), heading: Math.PI * 0.85 },
    thaad: { position: new THREE.Vector3(2, 0, 50), heading: Math.PI },
    sentinel: { position: new THREE.Vector3(48, 0, 30), heading: -Math.PI * 0.8 },
  };

  let searchlightsActive = false;

  const api = {
    group,
    consoleScreen,
    holoAnchor,
    consolePos,
    batteryPads,
    generators,
    radarHead,
    get searchlightsActive() { return searchlightsActive; },
    setSearchlights(on) {
      searchlightsActive = on;
      for (const s of searchlights) {
        s.beam.visible = on;
        s.lens.visible = on;
      }
    },
    update(dt, t) {
      for (const fn of dynamic) fn(dt, t);
      if (searchlightsActive) {
        for (const s of searchlights) {
          const t2 = t * 0.35 + s.phase;
          s.pivot.rotation.y = Math.sin(t2) * 1.1 + Math.sin(t2 * 0.37) * 0.6;
          s.pivot.rotation.x = -0.65 - Math.sin(t2 * 0.7) * 0.3;
        }
      }
    },
  };
  return api;
}
