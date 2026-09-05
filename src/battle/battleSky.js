// Star field and faint galactic glow for the battle scene. Stars sit on a far sphere (inside the far
// plane), sized in pixels; a few large soft sprites make a dim milky band. No planets besides Coruscant.
import * as THREE from "three";
import { mulberry32 } from "../textures.js";

export function buildBattleSky(scene, radius = 3.2e6) {
  const group = new THREE.Group();
  group.name = "battleSky";
  const rand = mulberry32(77);
  const layers = [
    { n: 9000, size: 1.0, tint: 0.5 },
    { n: 3000, size: 1.5, tint: 0.8 },
    { n: 500, size: 2.2, tint: 1.05 },
    { n: 40, size: 3.2, tint: 1.3 },
  ];
  const bandN = new THREE.Vector3(0.3, 0.75, -0.6).normalize();
  for (const cfg of layers) {
    const pos = new Float32Array(cfg.n * 3);
    const col = new Float32Array(cfg.n * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < cfg.n; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      p.set(s * Math.cos(th), u, s * Math.sin(th));
      // cluster a share of the stars toward the band
      if (rand() < 0.45) {
        const along = p.dot(bandN);
        p.addScaledVector(bandN, -along * 0.8).normalize();
      }
      pos[i * 3] = p.x * radius;
      pos[i * 3 + 1] = p.y * radius;
      pos[i * 3 + 2] = p.z * radius;
      const temp = rand();
      const r = temp < 0.3 ? 0.75 : temp < 0.85 ? 1 : 1;
      const b = temp < 0.3 ? 1 : temp < 0.85 ? 1 : 0.7;
      const k = (0.35 + rand() * 0.65) * cfg.tint;
      col[i * 3] = r * k;
      col[i * 3 + 1] = k * (temp < 0.3 ? 0.85 : 1);
      col[i * 3 + 2] = b * k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: cfg.size,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      fog: false,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    group.add(pts);
  }
  // galactic band: soft additive sprites along the band's great circle
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,240,230,0.5)");
  grd.addColorStop(0.5, "rgba(200,190,210,0.18)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const e1 = new THREE.Vector3(1, 0, 0).cross(bandN).normalize();
  const e2 = new THREE.Vector3().crossVectors(bandN, e1);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    color: 0xd8c8c0,
  });
  for (let i = 0; i < 36; i++) {
    const phi = (i / 36) * Math.PI * 2;
    const lat = (rand() - 0.5) * 0.18;
    const p = e1
      .clone()
      .multiplyScalar(Math.cos(phi) * Math.cos(lat))
      .addScaledVector(e2, Math.sin(phi) * Math.cos(lat))
      .addScaledVector(bandN, Math.sin(lat));
    const sp = new THREE.Sprite(mat);
    sp.position.copy(p).multiplyScalar(radius * 0.95);
    sp.scale.setScalar(radius * (0.22 + rand() * 0.2));
    group.add(sp);
  }
  scene.add(group);
  return group;
}
