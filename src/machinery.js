import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { beveledBox, beveledPanel, cylinderZ, lathe, setShadow } from "./geom.js";
import { createGaugeFace, createLabelTexture } from "./materials.js";
import { Seeded } from "./rng.js";

const _boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6);
const _boltHead = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 6);

export function createBoltMesh(material, count = 64) {
  const geo = mergeGeometries([
    _boltGeo.clone().translate(0, 0.005, 0),
    _boltHead.clone().translate(0, 0.012, 0),
  ]);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.castShadow = true;
  return mesh;
}

export function pushInstance(mesh, position, quaternion = new THREE.Quaternion(), scale = 1) {
  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.quaternion.copy(quaternion);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(mesh.count, dummy.matrix);
  mesh.count += 1;
  mesh.instanceMatrix.needsUpdate = true;
}

export function addBoltRing(parent, material, radius, count, normal = new THREE.Vector3(0, 0, 1)) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    if (Math.abs(normal.z) < 0.99) {
      const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(), normal, new THREE.Vector3(0, 1, 0));
      p.applyMatrix4(basis);
    }
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.012, 6),
      material
    );
    bolt.position.copy(p);
    bolt.quaternion.copy(q);
    parent.add(bolt);
  }
}

export function createPipeRun(points, radius, radial = 8, tubular = 0) {
  const vecs = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecs, false, "catmullrom", 0.15);
  const segs = tubular || Math.max(8, vecs.length * 6);
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  geo.computeVertexNormals();
  return geo;
}

export function createFlange(radius, material) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.55, radius * 1.55, 0.018, 16), material);
  const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.55, radius * 1.55, 0.018, 16), material);
  disc.rotation.x = Math.PI / 2;
  disc2.rotation.x = Math.PI / 2;
  disc.position.z = -0.016;
  disc2.position.z = 0.016;
  g.add(disc, disc2);
  addBoltRing(g, material, radius * 1.28, 6, new THREE.Vector3(0, 0, 1));
  return g;
}

export function createElbow(radius, bendRadius, material) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, bendRadius),
    new THREE.Vector3(bendRadius, 0, bendRadius)
  );
  const geo = new THREE.TubeGeometry(curve, 8, radius, 8, false);
  return new THREE.Mesh(geo, material);
}

export function createValveAssembly(mats, scale = 1, colorKey = "pipeBlue") {
  const g = new THREE.Group();
  const bodyMat = mats[colorKey] || mats.oilyMachinery;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 12, 10), bodyMat);
  const stem = new THREE.Mesh(cylinderZ(0.012 * scale, 0.09 * scale, 8), mats.brushedMetal);
  stem.rotation.x = -Math.PI / 2;
  stem.position.y = 0.08 * scale;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.02 * scale, 8), mats.brushedMetal);
  hub.position.y = 0.13 * scale;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.055 * scale, 0.007 * scale, 8, 16), mats.chippedPaint);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.14 * scale;
  const spokeGeo = new THREE.BoxGeometry(0.1 * scale, 0.006 * scale, 0.006 * scale);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(spokeGeo, mats.brushedMetal);
    s.position.y = 0.14 * scale;
    s.rotation.y = (i / 3) * Math.PI;
    g.add(s);
  }
  const inlet = new THREE.Mesh(cylinderZ(0.028 * scale, 0.08 * scale, 10), bodyMat);
  inlet.position.z = -0.055 * scale;
  const outlet = inlet.clone();
  outlet.position.z = 0.055 * scale;
  g.add(body, stem, hub, wheel, inlet, outlet);
  setShadow(body);
  return g;
}

export function createGauge(mats, label = "P", value = 0.4) {
  const g = new THREE.Group();
  const face = createGaugeFace(label, value);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.058, 0.03, 16), mats.brushedMetal);
  housing.rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), mats.glass);
  glass.position.z = 0.016;
  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(0.046, 20),
    new THREE.MeshStandardMaterial({ map: face.texture, roughness: 0.45, metalness: 0.05 })
  );
  dial.position.z = 0.012;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.038, 0.002), mats.emissiveAmber);
  needle.position.set(0, 0.01, 0.014);
  const a = -Math.PI * 0.75 + value * Math.PI * 1.5;
  needle.rotation.z = a + Math.PI / 2;
  needle.userData.baseValue = value;
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.02), mats.oilyMachinery);
  mount.position.z = -0.02;
  g.add(housing, dial, glass, needle, mount);
  g.userData.needle = needle;
  g.userData.kind = "gauge";
  return g;
}

export function createCableTray(length, mats, width = 0.16) {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(beveledBox(width, 0.018, length, 0.004), mats.chippedPaint);
  g.add(tray);
  const sideA = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, length), mats.chippedPaint);
  const sideB = sideA.clone();
  sideA.position.set(-width * 0.5, 0.02, 0);
  sideB.position.set(width * 0.5, 0.02, 0);
  g.add(sideA, sideB);
  const nCables = 5;
  for (let i = 0; i < nCables; i++) {
    const r = 0.008 + (i % 3) * 0.003;
    const cable = new THREE.Mesh(
      cylinderZ(r, length * 0.96, 6),
      i % 2 === 0 ? mats.plastic : mats.bakelite
    );
    cable.position.set(-width * 0.32 + i * (width * 0.16), 0.02, 0);
    g.add(cable);
  }
  return g;
}

export function createJunctionBox(mats, w = 0.22, h = 0.18, d = 0.08) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(beveledBox(w, h, d, 0.008), mats.hullGreen);
  const door = new THREE.Mesh(beveledPanel(w * 0.86, h * 0.78, 0.01, 0.01, 0.003), mats.chippedPaint);
  door.position.z = d * 0.5 + 0.006;
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, 0.012), mats.brushedMetal);
  latch.position.set(w * 0.28, 0, d * 0.5 + 0.016);
  const gland = new THREE.Mesh(cylinderZ(0.016, 0.04, 8), mats.plastic);
  gland.position.set(0, -h * 0.5, 0);
  gland.rotation.x = Math.PI / 2;
  g.add(box, door, latch, gland);
  return g;
}

export function createVent(mats, w = 0.28, h = 0.16) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(beveledPanel(w, h, 0.02, 0.01, 0.004), mats.chippedPaint);
  g.add(frame);
  const slatGeo = new THREE.BoxGeometry(w * 0.82, 0.008, 0.02);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(slatGeo, mats.brushedMetal);
    s.position.set(0, -h * 0.32 + i * 0.026, 0.01);
    s.rotation.x = 0.4;
    g.add(s);
  }
  return g;
}

export function createFan(mats, radius = 0.09) {
  const g = new THREE.Group();
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 16), mats.chippedPaint);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), mats.brushedMetal);
  hub.rotation.x = Math.PI / 2;
  g.add(shroud, hub);
  const bladeGeo = new THREE.BoxGeometry(radius * 1.5, 0.012, 0.035);
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(bladeGeo, mats.plastic);
    b.position.x = radius * 0.42;
    const wrap = new THREE.Group();
    wrap.rotation.z = (i / 5) * Math.PI * 2;
    wrap.add(b);
    blades.add(wrap);
  }
  g.add(blades);
  g.userData.spin = blades;
  g.userData.kind = "fan";
  g.userData.speed = 4.5;
  return g;
}

export function createWarningPlate(text, mats) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    beveledPanel(0.22, 0.08, 0.006, 0.006, 0.002),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture(text, { bg: "#c9a24a", w: 256, h: 96, size: 22 }),
      roughness: 0.55,
      metalness: 0.1,
    })
  );
  g.add(plate);
  return g;
}

export function createHandrail(length, mats, radius = 0.016) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(cylinderZ(radius, length, 8), mats.brushedMetal);
  g.add(bar);
  const n = Math.max(2, Math.round(length / 0.7));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), mats.chippedPaint);
    post.position.set(0, -0.06, -length * 0.5 + t * length);
    g.add(post);
  }
  return g;
}

export function createAccessPanel(mats, w = 0.32, h = 0.22) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(beveledPanel(w, h, 0.016, 0.012, 0.004), mats.hullPaint);
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.018, h * 0.7, 0.018), mats.brushedMetal);
  hinge.position.set(-w * 0.48, 0, 0.01);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.02, 0.014), mats.brushedMetal);
  latch.position.set(w * 0.38, 0, 0.014);
  g.add(panel, hinge, latch);
  return g;
}

export function createMotorHousing(mats, length = 1.35, radius = 0.42) {
  const g = new THREE.Group();
  const profile = [
    [0.01, -length * 0.5],
    [radius * 0.72, -length * 0.48],
    [radius * 0.92, -length * 0.38],
    [radius, -length * 0.15],
    [radius, length * 0.2],
    [radius * 0.9, length * 0.32],
    [radius * 0.7, length * 0.4],
    [radius * 0.42, length * 0.46],
    [0.08, length * 0.5],
  ];
  const body = new THREE.Mesh(lathe(profile, 28), mats.oilyMachinery);
  body.rotation.z = Math.PI / 2;
  body.rotation.y = Math.PI / 2;
  setShadow(body);
  g.add(body);

  const finGeo = new THREE.BoxGeometry(0.018, radius * 0.55, length * 0.55);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.sin(a) < -0.55) continue;
    const fin = new THREE.Mesh(finGeo, mats.brushedMetal);
    fin.position.set(Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98, 0.05);
    fin.lookAt(0, 0, 0.05);
    g.add(fin);
  }

  const plate = new THREE.Mesh(beveledPanel(0.28, 0.18, 0.02, 0.01, 0.004), mats.chippedPaint);
  plate.position.set(0, radius * 0.15, 0.12);
  plate.lookAt(0, 0, 2);
  g.add(plate);

  const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, 0.022, 8, 24), mats.brushedMetal);
  band.rotation.y = Math.PI / 2;
  band.position.z = -0.1;
  g.add(band);

  const shaft = new THREE.Mesh(cylinderZ(0.07, 0.55, 12), mats.brushedMetal);
  shaft.position.z = length * 0.5 + 0.1;
  g.add(shaft);
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12), mats.oilyMachinery);
  coupling.rotation.x = Math.PI / 2;
  coupling.position.z = length * 0.5 + 0.28;
  g.add(coupling);

  g.userData.kind = "motor";
  return g;
}

export function createPump(mats, scale = 1) {
  const g = new THREE.Group();
  const volute = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 16, 12), mats.oilyMachinery);
  volute.scale.set(1, 0.78, 1);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.22 * scale, 14), mats.hullGreen);
  motor.position.y = 0.2 * scale;
  const inlet = new THREE.Mesh(cylinderZ(0.04 * scale, 0.16 * scale, 10), mats.pipeBlue);
  inlet.position.set(0.16 * scale, 0, 0);
  inlet.rotation.y = Math.PI / 2;
  const outlet = new THREE.Mesh(cylinderZ(0.035 * scale, 0.14 * scale, 10), mats.pipeBlue);
  outlet.position.set(0, 0.08 * scale, 0.14 * scale);
  const base = new THREE.Mesh(beveledBox(0.22 * scale, 0.04 * scale, 0.22 * scale, 0.008), mats.chippedPaint);
  base.position.y = -0.14 * scale;
  const fan = createFan(mats, 0.05 * scale);
  fan.position.y = 0.32 * scale;
  fan.rotation.x = Math.PI / 2;
  g.add(volute, motor, inlet, outlet, base, fan);
  setShadow(volute);
  g.userData.kind = "pump";
  return g;
}

export function createCompressor(mats) {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(cylinderZ(0.13, 0.55, 16), mats.hullGreen);
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 0.16;
  const head = new THREE.Mesh(beveledBox(0.22, 0.18, 0.2, 0.01), mats.oilyMachinery);
  head.position.set(0.28, 0.22, 0);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16), mats.rubber);
  belt.position.set(0.28, 0.08, 0.12);
  const base = new THREE.Mesh(beveledBox(0.62, 0.05, 0.28, 0.01), mats.chippedPaint);
  base.position.y = 0.025;
  g.add(tank, head, belt, base);
  const gauge = createGauge(mats, "AIR", 0.62);
  gauge.position.set(-0.18, 0.3, 0.14);
  g.add(gauge);
  setShadow(tank);
  return g;
}

export function createCabinet(mats, w = 0.55, h = 1.15, d = 0.28) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(w, h, d, 0.012), mats.hullGreen);
  body.position.y = h * 0.5;
  g.add(body);
  const door = new THREE.Mesh(beveledPanel(w * 0.9, h * 0.88, 0.018, 0.012, 0.004), mats.chippedPaint);
  door.position.set(0, h * 0.5, d * 0.5 + 0.01);
  g.add(door);
  for (let i = 0; i < 3; i++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.02), mats.brushedMetal);
    handle.position.set(w * 0.32, h * 0.28 + i * 0.22, d * 0.5 + 0.024);
    g.add(handle);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.02, 0.02), mats.emissiveGreen);
  lamp.position.set(0, h - 0.06, d * 0.5 + 0.02);
  g.add(lamp);
  setShadow(body);
  return g;
}

export function createFloorGrate(w, d, mats) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), mats.brushedMetal);
  g.add(frame);
  const barW = 0.018;
  const gap = 0.028;
  const n = Math.floor(w / (barW + gap));
  const barGeo = new THREE.BoxGeometry(barW, 0.02, d * 0.94);
  for (let i = 0; i < n; i++) {
    const bar = new THREE.Mesh(barGeo, mats.oilyMachinery);
    bar.position.set(-w * 0.5 + 0.03 + i * (barW + gap), 0.002, 0);
    g.add(bar);
  }
  const crossN = Math.floor(d / 0.18);
  for (let i = 0; i < crossN; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.016, 0.014), mats.brushedMetal);
    c.position.set(0, -0.004, -d * 0.5 + 0.08 + i * 0.18);
    g.add(c);
  }
  return g;
}

export function createUnderfloorPipes(w, d, mats, seed = 1) {
  const g = new THREE.Group();
  const rng = new Seeded(seed);
  for (let i = 0; i < 3; i++) {
    const r = 0.025 + rng.range(0, 0.02);
    const pipe = new THREE.Mesh(cylinderZ(r, d * 0.9, 8), i === 2 ? mats.pipeOrange : mats.pipeBlue);
    pipe.position.set(-w * 0.25 + i * 0.12, -0.12, 0);
    g.add(pipe);
  }
  return g;
}

export function scatterGreebles(parent, mats, boxes, rng) {
  for (const b of boxes) {
    if (rng.next() > 0.55) {
      const box = createJunctionBox(mats, 0.16 + rng.range(0, 0.08), 0.12 + rng.range(0, 0.06), 0.06);
      box.position.set(b[0], b[1], b[2]);
      if (b[3]) box.rotation.y = b[3];
      parent.add(box);
    }
  }
}

export function createSwitchBank(mats, n = 8) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(beveledPanel(0.28, 0.08, 0.012, 0.008, 0.003), mats.plastic);
  g.add(plate);
  for (let i = 0; i < n; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.018), mats.bakelite);
    sw.position.set(-0.11 + i * 0.032, 0.01, 0.012);
    sw.rotation.x = i % 3 === 0 ? -0.4 : 0.35;
    g.add(sw);
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.004, 8),
      i % 4 === 0 ? mats.emissiveAmber : mats.emissiveGreen
    );
    led.position.set(-0.11 + i * 0.032, -0.022, 0.014);
    g.add(led);
  }
  return g;
}

export function createLightFixture(mats, kind = "warm") {
  const g = new THREE.Group();
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 10, 1, true), mats.brushedMetal);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 10, 8),
    kind === "red" ? mats.emissiveRed : mats.emissiveWarm
  );
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 6, 10), mats.chippedPaint);
  guard.rotation.x = Math.PI / 2;
  g.add(cage, bulb, guard);
  g.userData.kind = "fixture";
  g.userData.bulb = bulb;
  return g;
}
