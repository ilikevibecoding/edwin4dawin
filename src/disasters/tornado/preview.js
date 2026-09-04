// Preview overlay for the tornado: the predicted track drawn as a translucent ribbon on the ground (brighter
// bands every 5 s), a translucent disc + ring showing the core radius at the start and an arrowhead at
// the end. Rendered without depth testing so an admin can see the whole track through buildings.
import * as THREE from 'three';

const TRACK_COLOR = new THREE.Color(1.0, 0.62, 0.15);
const START_COLOR = new THREE.Color(1.0, 0.35, 0.2);

export class PathPreview {
  constructor(scene, waypoints, radius, groundY) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.renderOrder = 20;
    const mat = (color, opacity, vertexColors = false) => new THREE.MeshBasicMaterial({ color, opacity, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, vertexColors });
    this.materials = [];
    this.geometries = [];
    const add = (geo, m, order) => { const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = order; mesh.frustumCulled = false; this.group.add(mesh); this.materials.push(m); this.geometries.push(geo); return mesh; };

    // ribbon along the waypoints
    if (waypoints.length >= 2) {
      const pos = [], col = [], idx = [];
      const w = 0.6;
      for (let i = 0; i < waypoints.length; i++) {
        const p = waypoints[i];
        const a = waypoints[Math.max(0, i - 1)], b = waypoints[Math.min(waypoints.length - 1, i + 1)];
        let dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const nx = -dz, nz = dx;
        const y = groundY(p.x, p.z) + 0.15;
        pos.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
        const bright = Math.floor(p.tick / 20) % 5 === 0 ? 1.0 : 0.55;
        for (let k = 0; k < 2; k++) col.push(TRACK_COLOR.r * bright, TRACK_COLOR.g * bright, TRACK_COLOR.b * bright);
        if (i > 0) { const v = i * 2; idx.push(v - 2, v - 1, v, v - 1, v + 1, v); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      add(g, mat(0xffffff, 0.75, true), 21);
      // arrowhead at the end
      const e = waypoints[waypoints.length - 1], pe = waypoints[waypoints.length - 2];
      let dx = e.x - pe.x, dz = e.z - pe.z; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const nx = -dz, nz = dx, y = groundY(e.x, e.z) + 0.16;
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([e.x + dx * 3, y, e.z + dz * 3, e.x + nx * 1.8, y, e.z + nz * 1.8, e.x - nx * 1.8, y, e.z - nz * 1.8], 3));
      add(tri, mat(TRACK_COLOR, 0.85), 22);
    }
    // start marker: translucent disc + ring at the core radius
    const s = waypoints[0];
    const sy = groundY(s.x, s.z) + 0.12;
    const disc = new THREE.CircleGeometry(radius, 48); disc.rotateX(-Math.PI / 2); disc.translate(s.x, sy, s.z);
    add(disc, mat(START_COLOR, 0.22), 21);
    const ring = new THREE.RingGeometry(radius - 0.35, radius, 64); ring.rotateX(-Math.PI / 2); ring.translate(s.x, sy + 0.02, s.z);
    add(ring, mat(START_COLOR, 0.9), 22);
    // outer influence ring (3x radius, faint)
    const outer = new THREE.RingGeometry(radius * 3 - 0.2, radius * 3, 96); outer.rotateX(-Math.PI / 2); outer.translate(s.x, sy + 0.02, s.z);
    add(outer, mat(TRACK_COLOR, 0.35), 22);
    scene.add(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
  }
}
