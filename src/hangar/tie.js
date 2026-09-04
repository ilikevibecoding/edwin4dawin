// Original TIE-style fighter: spherical cockpit pod, twin pylons, two hexagonal solar-panel wings.
// ~6.5 m across, faces -Z (forward). One shared set of geometries/materials, cloned per fighter.
import * as THREE from "three";

let cache = null;

export function buildTie() {
  if (!cache) {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.55, metalness: 0.6, fog: false });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.85, metalness: 0.35, fog: false });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5b6169, roughness: 0.6, metalness: 0.7, fog: false });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.2, metalness: 0.3, fog: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6a4a, fog: false });

    const root = new THREE.Group();
    const pod = new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16), hullMat);
    root.add(pod);
    // forward viewport: octagonal window plate
    const win = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 8), glassMat);
    win.rotation.x = Math.PI / 2;
    win.position.z = -1.95;
    root.add(win);
    const winFrame = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 6, 8), frameMat);
    winFrame.position.z = -2.0;
    root.add(winFrame);
    // rear hatch ring + twin ion engine glow
    const hatch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 6, 12), frameMat);
    hatch.position.z = 1.95;
    root.add(hatch);
    for (const x of [-0.45, 0.45]) {
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), glowMat);
      e.position.set(x, -0.3, 2.05);
      root.add(e);
    }
    // pylons and wings
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.2, 10), frameMat);
      pylon.rotation.z = Math.PI / 2;
      pylon.position.x = side * 2.9;
      root.add(pylon);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 10), hullMat);
      collar.rotation.z = Math.PI / 2;
      collar.position.x = side * 3.9;
      root.add(collar);
      // hexagonal wing: 7.6 m tall, 5.6 m deep, elongated hexagon in the YZ plane
      const shape = new THREE.Shape();
      const H = 3.8;
      const D = 2.8;
      shape.moveTo(0, -H);
      shape.lineTo(D, -H * 0.5);
      shape.lineTo(D, H * 0.5);
      shape.lineTo(0, H);
      shape.lineTo(-D, H * 0.5);
      shape.lineTo(-D, -H * 0.5);
      shape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
      wingGeo.rotateY(Math.PI / 2);
      const wing = new THREE.Mesh(wingGeo, panelMat);
      wing.position.x = side * 4.1 - 0.07;
      root.add(wing);
      // wing frame: outer rim + spokes
      const rimPts = [];
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
        rimPts.push(new THREE.Vector3(0, Math.sin(a) * H * 1.0, Math.cos(a) * D * 1.02));
      }
      const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true, "catmullrom", 0), 24, 0.16, 6, true), frameMat);
      rim.position.x = side * 4.12;
      root.add(rim);
      for (const [dy, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.5, 0.5], [0.5, -0.5], [-0.5, 0.5], [-0.5, -0.5]]) {
        const len = Math.hypot(dy * H, dz * D);
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.18, len, 0.18), frameMat);
        spoke.position.set(side * 4.12, (dy * H) / 2, (dz * D) / 2);
        spoke.rotation.x = Math.atan2(dz * D, dy * H);
        root.add(spoke);
      }
    }
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    cache = root;
  }
  return cache.clone();
}
