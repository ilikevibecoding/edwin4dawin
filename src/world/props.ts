import * as THREE from 'three';
import { Rng } from '../core/seed';
import type { WorldMap } from './map';
import { mergeGeometries } from './bridges';
import type { RoadSegment } from './roads';

/** Static world dressing: marinas, port, airport, stadium, lighthouse, construction sites, lamps, seawalls. */
export class Props {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly lampPositions: THREE.Vector3[] = [];
  readonly mooredBoatPositions: { x: number; z: number; rot: number; len: number }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly boxes = new Map<string, THREE.Matrix4[]>();
  private readonly cyls = new Map<string, THREE.Matrix4[]>();
  private readonly mats: Record<string, THREE.MeshStandardMaterial>;

  constructor(private map: WorldMap, roads: RoadSegment[], bridgeLamps: THREE.Vector3[], private markOccupied: (x: number, z: number, r: number) => void) {
    this.mats = {
      concrete: new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.8 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.45, metalness: 0.7 }),
      red: new THREE.MeshStandardMaterial({ color: 0xc8402e, roughness: 0.6 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x2f5aa8, roughness: 0.6 }),
      green: new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.6 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xd9782a, roughness: 0.6 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8b6b48, roughness: 0.9 }),
      tank: new THREE.MeshStandardMaterial({ color: 0xdcdcd4, roughness: 0.5, metalness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.15, metalness: 0.8 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x3f8a2e, roughness: 0.95 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xe0b23a, roughness: 0.6 }),
    };
    for (const k in this.mats) this.materials.push(this.mats[k]);
    const rng = new Rng('props');
    this.buildMarinas(rng);
    this.buildPort(rng);
    this.buildAirport(rng);
    this.buildStadium();
    this.buildLighthouse();
    this.buildConstruction(rng);
    this.buildLamps(roads, bridgeLamps);
    this.buildSeawalls();
    this.flush();
  }

  private box(mat: string, x: number, y: number, z: number, w: number, h: number, d: number, rot = 0, tilt = 0): void {
    this.p.set(x, y + h / 2, z);
    this.q.setFromEuler(new THREE.Euler(tilt, rot, 0));
    this.s.set(w, h, d);
    let list = this.boxes.get(mat); if (!list) { list = []; this.boxes.set(mat, list); }
    list.push(this.m.compose(this.p, this.q, this.s).clone());
  }
  private cyl(mat: string, x: number, y: number, z: number, r: number, h: number, rot = 0, tilt = 0): void {
    this.p.set(x, y + h / 2, z);
    this.q.setFromEuler(new THREE.Euler(tilt, rot, 0));
    this.s.set(r * 2, h, r * 2);
    let list = this.cyls.get(mat); if (!list) { list = []; this.cyls.set(mat, list); }
    list.push(this.m.compose(this.p, this.q, this.s).clone());
  }
  private flush(): void {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1), cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    for (const [mat, list] of this.boxes) {
      const mesh = new THREE.InstancedMesh(boxGeo, this.mats[mat], list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    for (const [mat, list] of this.cyls) {
      const mesh = new THREE.InstancedMesh(cylGeo, this.mats[mat], list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  private buildMarinas(rng: Rng): void {
    for (const ma of this.map.marinas) {
      const dirX = Math.sin(ma.rot), dirZ = -Math.cos(ma.rot); // piers extend this way (into the water)
      const sideX = -dirZ, sideZ = dirX;
      const spacing = 24;
      // main walkway along the shore
      const walkLen = (ma.piers - 1) * spacing + 20;
      this.box('wood', ma.x, 0.6, ma.z, Math.abs(sideX) * walkLen + Math.abs(dirX) * 3 + 1, 0.4, Math.abs(sideZ) * walkLen + Math.abs(dirZ) * 3 + 1, 0);
      for (let i = 0; i < ma.piers; i++) {
        const off = (i - (ma.piers - 1) / 2) * spacing;
        const px = ma.x + sideX * off, pz = ma.z + sideZ * off;
        const len = ma.pierLen * rng.range(0.8, 1.1);
        const cx = px + dirX * len / 2, cz = pz + dirZ * len / 2;
        this.box('wood', cx, 0.6, cz, 2.2, 0.35, len, ma.rot);
        // pilings
        for (let t = 0; t < len; t += 12) {
          for (const sd of [-1, 1]) this.cyl('wood', px + dirX * t + sideX * sd * 1.3, -1.5, pz + dirZ * t + sideZ * sd * 1.3, 0.18, 3.2);
        }
        // finger slips + moored boats
        for (let t = 8; t < len - 6; t += 11) {
          for (const sd of [-1, 1]) {
            const fx = px + dirX * t + sideX * sd * 5, fz = pz + dirZ * t + sideZ * sd * 5;
            this.box('wood', fx, 0.55, fz, Math.abs(sideX) * 8 + Math.abs(dirX) * 1.0 + 0.3, 0.3, Math.abs(sideZ) * 8 + Math.abs(dirZ) * 1.0 + 0.3, 0);
            if (rng.chance(0.7)) {
              const bl = rng.range(7, 14);
              const bx = px + dirX * (t + 5.5) + sideX * sd * 6, bz = pz + dirZ * (t + 5.5) + sideZ * sd * 6;
              this.mooredBoatPositions.push({ x: bx, z: bz, rot: ma.rot + Math.PI / 2, len: bl });
            }
          }
        }
      }
      // harbour master / fuel dock building
      this.box('white', ma.x - dirX * 18, this.map.heightAt(ma.x - dirX * 18, ma.z - dirZ * 18), ma.z - dirZ * 18, 14, 5, 10, ma.rot);
      this.markOccupied(ma.x - dirX * 18, ma.z - dirZ * 18, 20);
    }
  }

  private buildPort(rng: Rng): void {
    const cranes = this.map.pois.find((p) => p.kind === 'cranes')!;
    // container gantry cranes along the south quay of the port island
    for (let i = 0; i < 7; i++) {
      const x = cranes.x - cranes.size / 2 + 120 + i * 210 + rng.range(-20, 20);
      const z = cranes.z;
      const g = this.map.heightAt(x, z);
      if (g < 1) continue;
      const legW = 18, h = 42;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box('steel', x + sx * legW / 2, g, z + sz * 6, 1.6, h, 1.6);
      this.box('steel', x, g + h, z - 4, legW + 4, 3, 3);
      this.box('steel', x, g + h, z + 4, legW + 4, 3, 3);
      // boom over the water
      this.box('orange', x, g + h + 3, z + 28, 3.2, 3, 62, 0, 0.0);
      this.box('steel', x, g + h + 5, z - 14, 3, 3, 20);
      this.box('white', x, g + h - 14, z + 14, 6, 4, 6); // operator cab
      // container stacks behind the crane
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
        if (rng.chance(0.35)) continue;
        const cx = x - 60 + c * 14, cz = z - 60 - r * 18;
        const stack = rng.int(1, 4);
        for (let k = 0; k < stack; k++) this.box(rng.pick(['red', 'blue', 'green', 'orange', 'steel', 'white']), cx, g + k * 2.6, cz, 12.2, 2.6, 2.44 * 2, 0);
      }
      this.markOccupied(x, z - 60, 90);
    }
    // cruise terminal + ship on the north quay
    const cruise = this.map.pois.find((p) => p.kind === 'cruise')!;
    const gz = this.map.heightAt(cruise.x, cruise.z);
    this.box('white', cruise.x, gz, cruise.z + 40, 260, 12, 40);
    this.box('glass', cruise.x, gz + 12, cruise.z + 40, 240, 4, 36);
    this.markOccupied(cruise.x, cruise.z + 40, 140);
    // ship hull along the quay (in the water)
    const shipZ = cruise.z - 40;
    this.box('dark', cruise.x, -1.5, shipZ, 290, 10, 36);
    this.box('white', cruise.x, 8.5, shipZ, 280, 28, 32);
    for (let d = 0; d < 6; d++) this.box('glass', cruise.x, 12 + d * 3.5, shipZ, 276, 1.2, 33);
    this.box('white', cruise.x - 30, 36, shipZ, 90, 8, 22);
    this.cyl('dark', cruise.x - 90, 36, shipZ, 4, 14);
    // fuel tank farm by the river
    const tanks = this.map.pois.find((p) => p.kind === 'tanks')!;
    for (let i = 0; i < 9; i++) {
      const tx = tanks.x + (i % 3) * 52 - 52, tz = tanks.z + Math.floor(i / 3) * 52 - 52;
      const g = this.map.heightAt(tx, tz);
      if (g < 1) continue;
      this.cyl('tank', tx, g, tz, rng.range(14, 22), rng.range(10, 16));
      this.markOccupied(tx, tz, 26);
    }
  }

  private buildAirport(rng: Rng): void {
    const term = this.map.pois.find((p) => p.kind === 'terminal')!;
    const g = this.map.heightAt(term.x, term.z);
    // terminal: long curved-ish roof approximated by three sections
    this.box('white', term.x, g, term.z, 260, 14, 60);
    this.box('glass', term.x, g + 3, term.z + 30.5, 250, 7, 1.2);
    this.box('steel', term.x, g + 14, term.z, 270, 2, 66);
    // piers with gates
    for (let i = -1; i <= 1; i++) {
      this.box('white', term.x + i * 90, g, term.z + 90, 30, 9, 120);
      this.box('steel', term.x + i * 90, g + 9, term.z + 90, 32, 1.2, 122);
    }
    // apron
    this.box('dark', term.x, g - 0.1, term.z + 130, 520, 0.4, 220);
    // control tower
    this.cyl('concrete', term.x + 220, g, term.z - 40, 4, 38);
    this.box('glass', term.x + 220, g + 38, term.z - 40, 14, 5, 14, 0.4);
    this.box('white', term.x + 220, g + 43, term.z - 40, 16, 1.5, 16, 0.4);
    // hangars (barrel vault approximated by stacked boxes)
    const hang = this.map.pois.find((p) => p.kind === 'hangars')!;
    for (let i = 0; i < 4; i++) {
      const hx = hang.x + i * 80, hz = hang.z;
      const hg = this.map.heightAt(hx, hz);
      this.box('concrete', hx, hg, hz, 64, 12, 50);
      this.box('steel', hx, hg + 12, hz, 60, 5, 40);
      this.box('steel', hx, hg + 17, hz, 40, 3, 30);
      this.markOccupied(hx, hz, 40);
    }
    // parked airliners at the gates
    for (let i = -1; i <= 1; i++) {
      for (const side of [-1, 1]) {
        const ax = term.x + i * 90 + side * 34, az = term.z + 110;
        this.cyl('white', ax, g + 2.2, az, 2.6, 38, 0, Math.PI / 2);
        this.box('white', ax, g + 2.5, az + 2, 34, 0.8, 5, 0.0);
        this.box('white', ax, g + 3, az + 17, 12, 0.6, 3);
        this.box('white', ax, g + 4, az + 18, 0.6, 9, 3);
        this.cyl('steel', ax - 9, g + 0.8, az + 4, 1.4, 4.5, 0, Math.PI / 2);
        this.cyl('steel', ax + 9, g + 0.8, az + 4, 1.4, 4.5, 0, Math.PI / 2);
      }
    }
    this.markOccupied(term.x, term.z + 60, 320);
    // small airstrip hangar & windsock hut
    const strip = this.map.runways.find((r) => r.id === 'strip-southkey')!;
    const mx = (strip.a[0] + strip.b[0]) / 2 + 40, mz = (strip.a[1] + strip.b[1]) / 2 - 60;
    const mg = this.map.heightAt(mx, mz);
    if (mg > 1) { this.box('concrete', mx, mg, mz, 26, 7, 20, 0.55); this.box('steel', mx, mg + 7, mz, 24, 2.5, 16, 0.55); this.markOccupied(mx, mz, 20); }
    void rng;
  }

  private buildStadium(): void {
    const st = this.map.pois.find((p) => p.kind === 'stadium')!;
    const g = this.map.heightAt(st.x, st.z);
    if (g < 1) return;
    const n = 40;
    const rx = st.size, rz = st.size * 0.8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + st.rot;
      const c = Math.cos(a), s = Math.sin(a);
      const ex = st.x + c * rx, ez = st.z + s * rz;
      const segLen = (2 * Math.PI * (rx + rz) / 2) / n + 2;
      const yaw = Math.atan2(c * rz, -s * rx);
      // tiered stands: three rings stepping up and out
      this.box('concrete', ex, g, ez, segLen, 14, 22, yaw);
      this.box('concrete', ex + c * 10, g + 14, ez + s * 10, segLen, 12, 16, yaw);
      this.box('white', ex + c * 12, g + 26, ez + s * 12, segLen, 1.5, 34, yaw); // roof ring
      this.box('steel', ex + c * 26, g, ez + s * 26, 1.4, 30, 1.4);
    }
    // field
    this.box('grass', st.x, g + 0.05, st.z, rx * 1.2, 0.3, rz * 1.15, st.rot);
    this.markOccupied(st.x, st.z, rx + 40);
  }

  private buildLighthouse(): void {
    const lh = this.map.pois.find((p) => p.kind === 'lighthouse')!;
    const g = this.map.heightAt(lh.x, lh.z);
    if (g < 0.5) return;
    this.cyl('white', lh.x, g, lh.z, 4.2, 28);
    this.cyl('red', lh.x, g + 10, lh.z, 4.25, 5);
    this.cyl('dark', lh.x, g + 28, lh.z, 2.4, 3.5);
    this.cyl('white', lh.x, g + 31.5, lh.z, 1.6, 1.4);
    this.box('white', lh.x + 12, g, lh.z + 6, 12, 5, 9, 0.3);
    this.markOccupied(lh.x, lh.z, 20);
  }

  private buildConstruction(rng: Rng): void {
    for (const d of this.map.districts) {
      if (d.id.startsWith('construction')) {
        const g = this.map.heightAt(d.cx, d.cz);
        if (g < 1) continue;
        const floors = rng.int(5, 12);
        const w = d.hw * 1.2, dd = d.hh * 1.2;
        // concrete frame: slabs + columns
        for (let f = 1; f <= floors; f++) this.box('concrete', d.cx, g + f * 3.6, d.cz, w, 0.4, dd, d.rot);
        for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0, 0], [0, -0.4], [0, 0.4], [-0.4, 0], [0.4, 0]]) {
          const c = Math.cos(d.rot), s = Math.sin(d.rot);
          const x = d.cx + lx * w * c - lz * dd * s, z = d.cz + lx * w * s + lz * dd * c;
          this.cyl('concrete', x, g, z, 0.45, floors * 3.6 + 0.4);
        }
        // core
        this.box('concrete', d.cx + w * 0.15, g, d.cz, 10, floors * 3.6 + 6, 8, d.rot);
        // tower crane
        const cx = d.cx - w * 0.6, cz = d.cz + dd * 0.6;
        this.box('yellow', cx, g, cz, 2.2, floors * 3.6 + 30, 2.2);
        this.box('yellow', cx + 20, g + floors * 3.6 + 30, cz, 60, 1.6, 1.6, 0.4);
        this.box('yellow', cx - 8, g + floors * 3.6 + 30, cz, 14, 1.6, 1.6, 0.4);
        // fences, containers, materials
        for (let i = 0; i < 5; i++) this.box(rng.pick(['blue', 'white', 'orange']), d.cx + rng.range(-w, w) * 0.7, g, d.cz + dd * 0.85, 6, 2.6, 2.4, d.rot);
        this.markOccupied(d.cx, d.cz, Math.max(w, dd));
      }
    }
  }

  private buildLamps(roads: RoadSegment[], bridgeLamps: THREE.Vector3[]): void {
    for (const seg of roads) {
      if (seg.cls !== 'highway' && seg.cls !== 'arterial' && seg.cls !== 'causeway') continue;
      const dx = seg.b[0] - seg.a[0], dz = seg.b[1] - seg.a[1];
      const len = Math.hypot(dx, dz);
      const ux = dx / len, uz = dz / len;
      let k = 0;
      for (let s = 20; s < len; s += 45, k++) {
        const side = k % 2 === 0 ? -1 : 1;
        const x = seg.a[0] + ux * s + -uz * (seg.width / 2 + 1) * side;
        const z = seg.a[1] + uz * s + ux * (seg.width / 2 + 1) * side;
        const g = this.map.heightAt(x, z);
        if (g < 0.8) continue;
        this.lampPositions.push(new THREE.Vector3(x, g, z));
      }
    }
    for (const l of bridgeLamps) this.lampPositions.push(l.clone());
    for (const l of this.lampPositions) {
      this.cyl('steel', l.x, l.y, l.z, 0.12, 9);
      this.box('steel', l.x, l.y + 9, l.z, 0.2, 0.2, 2.4);
    }
  }

  private buildSeawalls(): void {
    // riprap along the reference bridge abutments and the port edges
    const port = this.map.districts.find((d) => d.id === 'industrial-port')!;
    const c = Math.cos(port.rot), s = Math.sin(port.rot);
    for (let i = -port.hw; i <= port.hw; i += 6) {
      for (const sz of [-1, 1]) {
        const x = port.cx + i * c - sz * port.hh * s, z = port.cz + i * s + sz * port.hh * c;
        this.box('concrete', x, 1.4, z, 6.2, 2.2, 2.0, port.rot);
      }
    }
  }
}
