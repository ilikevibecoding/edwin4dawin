import * as THREE from "three";
import { Seeded, fbm2 } from "./rng.js";
import { PALETTE } from "./layout.js";

function rockGeometry(rng, scale = 1) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm2(x * 1.7 + rng.range(0, 10), y * 1.5 + z, 3);
    const s = 0.72 + n * 0.55;
    pos.setXYZ(i, x * s * scale, y * s * scale * 0.7, z * s * scale * 1.15);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildUnderwater(mats, renderer) {
  const g = new THREE.Group();
  g.name = "underwater";
  const rng = new Seeded(0x51f00d);

  const waterMat = new THREE.MeshBasicMaterial({
    color: PALETTE.waterDeep,
    side: THREE.BackSide,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), waterMat);
  dome.position.set(0, 1.2, -8);
  g.add(dome);

  const mid = new THREE.Mesh(
    new THREE.SphereGeometry(55, 20, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.waterMid,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.35,
      fog: false,
    })
  );
  mid.position.set(0, 0.8, -6);
  g.add(mid);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a30,
    roughness: 0.92,
    metalness: 0.05,
    fog: false,
  });
  const rocks = new THREE.Group();
  rocks.name = "rockField";
  const geos = [];
  for (let i = 0; i < 18; i++) {
    const mesh = new THREE.Mesh(rockGeometry(rng, rng.range(1.8, 5.5)), rockMat);
    mesh.position.set(rng.range(-18, 14), rng.range(-8, -1.2), rng.range(-28, 8));
    mesh.rotation.set(rng.range(0, 1), rng.range(0, 6), rng.range(0, 1));
    rocks.add(mesh);
    geos.push(mesh);
  }
  const ridge = new THREE.Mesh(rockGeometry(rng, 14), rockMat);
  ridge.position.set(-16, -6, -12);
  ridge.scale.set(1.8, 0.7, 2.4);
  rocks.add(ridge);
  rocks.userData.ridge = ridge;
  g.add(rocks);

  const siltGeo = new THREE.BufferGeometry();
  const N = 420;
  const positions = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = rng.range(-8, 8);
    positions[i * 3 + 1] = rng.range(-3, 4);
    positions[i * 3 + 2] = rng.range(-20, 6);
    seeds[i] = rng.next();
  }
  siltGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  siltGeo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const silt = new THREE.Points(
    siltGeo,
    new THREE.PointsMaterial({
      color: 0x8aa8b0,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      fog: false,
    })
  );
  silt.name = "siltNear";
  g.add(silt);

  const midGeo = siltGeo.clone();
  const midPos = midGeo.attributes.position;
  for (let i = 0; i < midPos.count; i++) {
    midPos.setXYZ(i, midPos.getX(i) * 1.8, midPos.getY(i) - 1, midPos.getZ(i) - 8);
  }
  const siltMid = new THREE.Points(
    midGeo,
    new THREE.PointsMaterial({
      color: 0x5a7a82,
      size: 0.06,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      fog: false,
    })
  );
  siltMid.name = "siltMid";
  g.add(siltMid);

  const farGeo = new THREE.BufferGeometry();
  const F = 200;
  const fp = new Float32Array(F * 3);
  for (let i = 0; i < F; i++) {
    fp[i * 3] = rng.range(-30, 30);
    fp[i * 3 + 1] = rng.range(-12, 6);
    fp[i * 3 + 2] = rng.range(-50, -10);
  }
  farGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const siltFar = new THREE.Points(
    farGeo,
    new THREE.PointsMaterial({
      color: 0x2a4450,
      size: 0.14,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: false,
    })
  );
  g.add(siltFar);

  const bioGeo = new THREE.BufferGeometry();
  const B = 40;
  const bp = new Float32Array(B * 3);
  for (let i = 0; i < B; i++) {
    bp[i * 3] = rng.range(-12, 12);
    bp[i * 3 + 1] = rng.range(-4, 3);
    bp[i * 3 + 2] = rng.range(-22, 2);
  }
  bioGeo.setAttribute("position", new THREE.BufferAttribute(bp, 3));
  const bio = new THREE.Points(
    bioGeo,
    new THREE.PointsMaterial({
      color: 0x66ffcc,
      size: 0.04,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      fog: false,
    })
  );
  g.add(bio);

  const coneGeo = new THREE.ConeGeometry(1.6, 7, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x7ec8d4,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  });
  const coneL = new THREE.Mesh(coneGeo, coneMat);
  coneL.position.set(-0.45, 1.55, -2.2);
  coneL.rotation.x = -Math.PI / 2.15;
  const coneR = coneL.clone();
  coneR.position.x = 0.45;
  g.add(coneL, coneR);

  const floodL = new THREE.SpotLight(0x8fd0dc, 18, 28, 0.42, 0.55, 1.1);
  floodL.position.set(-0.5, 1.55, 0.15);
  floodL.target.position.set(-1.2, 0.2, -8);
  const floodR = new THREE.SpotLight(0x8fd0dc, 18, 28, 0.42, 0.55, 1.1);
  floodR.position.set(0.5, 1.55, 0.15);
  floodR.target.position.set(1.2, 0.2, -8);
  g.add(floodL, floodL.target, floodR, floodR.target);

  const bubbles = new THREE.Group();
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0xb8d8e0,
    transparent: true,
    opacity: 0.25,
    fog: false,
  });
  for (let i = 0; i < 16; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.01, 0.03), 6, 6), bubbleMat);
    b.position.set(rng.range(-0.8, 0.8), rng.range(0.4, 1.8), rng.range(-1.2, 0.2));
    b.userData.phase = rng.next() * Math.PI * 2;
    bubbles.add(b);
  }
  g.add(bubbles);

  g.userData.update = (t, motion) => {
    const m = motion ? 1 : 0;
    const tt = motion ? t : 12.0;
    rocks.position.x = Math.sin(tt * 0.012) * 2.2 * m + (motion ? 0 : -1.1);
    rocks.position.z = (tt * 0.085) % 18;
    if (!motion) rocks.position.z = 6.4;
    const p = silt.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = seeds[i];
      p.setX(i, ((positions[i * 3] + tt * (0.12 + s * 0.15) * (motion ? 1 : 0)) % 16) - 8);
      p.setY(i, positions[i * 3 + 1] + Math.sin(tt * 0.3 + s * 8) * 0.05 * m);
    }
    p.needsUpdate = motion;
    siltMid.position.x = Math.sin(tt * 0.05) * 0.8 * m;
    siltMid.position.z = ((tt * 0.04) % 6) * m;
    siltFar.position.z = ((tt * 0.02) % 8) * m;
    bio.position.x = Math.sin(tt * 0.08) * 0.6 * m;
    bubbles.children.forEach((b, i) => {
      const ph = b.userData.phase;
      b.position.y = 0.5 + ((tt * 0.12 + ph) % 1.6);
      b.position.x = Math.sin(tt * 0.4 + ph) * 0.15;
    });
  };

  return g;
}
