import * as THREE from 'three';
import { Rng } from '../core/seed';
import { PORT_ISLAND, type WorldMap } from './map';
import { mergeGeometries } from './bridges';
import type { RoadSegment } from './roads';
import { balanceGroundIbl } from './terrain';

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
    for (const k in this.mats) {
      const mat = this.mats[k];
      mat.onBeforeCompile = (shader) => balanceGroundIbl(shader);
      mat.customProgramCacheKey = () => 'props-v2';
      this.materials.push(mat);
    }
    const rng = new Rng('props');
    this.buildMarinas(rng.fork('marinas'));
    this.buildPrivateDocks(rng.fork('docks'));
    this.buildFishingPiers(rng.fork('piers'));
    this.buildChannelMarkers(rng.fork('markers'));
    this.buildLifeguardTowers(rng.fork('lifeguards'));
    this.buildClubhouse(rng.fork('clubhouse'));
    this.buildPort(rng);
    this.buildAirport(rng);
    this.buildStadium();
    this.buildLighthouse();
    this.buildConstruction(rng);
    this.buildLamps(roads, bridgeLamps);
    this.buildSeawalls();
    this.flush();
  }

  // ---------------------------------------------------------------- shoreline helpers

  /** Distance along (dx,dz) from (x,z) to where the ground drops below the waterline. Negative when
   *  the start is already over water (then it is the distance back to land). */
  private shoreDistance(x: number, z: number, dx: number, dz: number, maxDist = 400): number {
    const wet = (d: number) => this.map.heightAt(x + dx * d, z + dz * d) < 0.15;
    if (!wet(0)) {
      for (let d = 1; d <= maxDist; d += 1) if (wet(d)) return d - 0.5;
      return maxDist;
    }
    for (let d = 1; d <= maxDist; d += 1) if (!wet(-d)) return -(d - 0.5);
    return -maxDist;
  }

  /** Vertical piling standing on the seabed (or the ground) and rising to `top`. */
  private piling(x: number, z: number, top: number, r = 0.18, mat = 'wood'): void {
    const bed = Math.min(this.map.heightAt(x, z), 0.2);
    this.cyl(mat, x, bed - 0.3, z, r, top - bed + 0.3);
  }

  /** Register a moored boat if the water there is deep enough to float it. */
  private moor(x: number, z: number, rot: number, len: number): void {
    if (this.map.heightAt(x, z) < -0.6) this.mooredBoatPositions.push({ x, z, rot, len });
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

  /** Marinas: a bulkhead and boardwalk at the water's edge, piers of uneven length and spacing with
   *  irregular finger slips, T-heads for the bigger yachts, a fuel dock and dry-stack yard on land. */
  private buildMarinas(rng: Rng): void {
    for (const ma of this.map.marinas) {
      const r = rng.fork(ma.id);
      const dirX = Math.sin(ma.rot), dirZ = -Math.cos(ma.rot); // piers extend this way (into the water)
      const sideX = -dirZ, sideZ = dirX;
      // snap the base to the actual shoreline so the boardwalk sits at the water's edge
      const shore = this.shoreDistance(ma.x, ma.z, dirX, dirZ);
      const sx = ma.x + dirX * shore, sz = ma.z + dirZ * shore;
      const walkLen = ma.piers * r.range(24, 30) + 24;
      const deck = 0.95;
      // boxes rotated by -rot have their local x along `side` and local z along `dir`
      const yaw = -ma.rot;
      const slab = (mat: string, cx: number, y: number, cz: number, alongSide: number, h: number, alongDir: number) => this.box(mat, cx, y, cz, alongSide, h, alongDir, yaw);
      // concrete bulkhead cap + boardwalk on the land side, pilings under the outer edge
      slab('concrete', sx - dirX * 0.4, 0.3, sz - dirZ * 0.4, walkLen, 0.9, 1.2);
      slab('wood', sx - dirX * 3.2, deck - 0.3, sz - dirZ * 3.2, walkLen, 0.3, 5.5);
      for (let o = -walkLen / 2 + 2; o < walkLen / 2; o += r.range(5, 8)) this.piling(sx + sideX * o + dirX * 0.4, sz + sideZ * o + dirZ * 0.4, deck + 0.55, 0.2);
      // piers
      let off = -walkLen / 2 + r.range(8, 16);
      while (off < walkLen / 2 - 8) {
        const px = sx + sideX * off, pz = sz + sideZ * off;
        let len = ma.pierLen * r.range(0.6, 1.2);
        // shorten piers whose far end would run aground
        while (len > 30 && this.map.heightAt(px + dirX * len, pz + dirZ * len) > -1.2) len -= 6;
        if (len <= 30) { off += r.range(22, 34); continue; }
        const cx = px + dirX * len / 2, cz = pz + dirZ * len / 2;
        const wide = r.chance(0.3);
        slab('wood', cx, deck - 0.3, cz, wide ? 3.2 : 2.2, 0.3, len);
        for (let t = r.range(2, 6); t < len; t += r.range(8, 12)) {
          for (const sd of [-1, 1]) this.piling(px + dirX * t + sideX * sd * (wide ? 1.7 : 1.3), pz + dirZ * t + sideZ * sd * (wide ? 1.7 : 1.3), deck + r.range(0.4, 0.9), r.range(0.15, 0.2));
        }
        // finger slips: alternating lengths, random gaps, boats of mixed size
        const slipGap = r.range(10, 14);
        for (let t = r.range(6, 12); t < len - 8; t += slipGap) {
          for (const sd of [-1, 1]) {
            if (r.chance(0.18)) continue;
            const fl = r.range(6, 9.5);
            const fx = px + dirX * t + sideX * sd * (fl / 2 + 1), fz = pz + dirZ * t + sideZ * sd * (fl / 2 + 1);
            slab('wood', fx, deck - 0.4, fz, fl, 0.25, 0.9);
            this.piling(px + dirX * t + sideX * sd * (fl + 0.6), pz + dirZ * t + sideZ * sd * (fl + 0.6), deck + 0.4, 0.14);
            if (r.chance(0.62)) {
              const bl = r.range(6.5, 12.5);
              const bx = px + dirX * (t + slipGap * 0.5) + sideX * sd * (bl * 0.45 + 1.2), bz = pz + dirZ * (t + slipGap * 0.5) + sideZ * sd * (bl * 0.45 + 1.2);
              this.moor(bx, bz, ma.rot + Math.PI / 2, bl);
            }
          }
        }
        // T-head with a couple of larger yachts alongside
        if (r.chance(0.55)) {
          const tw = r.range(16, 26);
          const ex = px + dirX * (len - 1.2), ez = pz + dirZ * (len - 1.2);
          slab('wood', ex, deck - 0.3, ez, tw, 0.3, 2.4);
          for (const sd of [-1, 1]) this.piling(ex + sideX * sd * tw * 0.5, ez + sideZ * sd * tw * 0.5, deck + 0.7, 0.2);
          for (const sd of [-1, 1]) if (r.chance(0.7)) this.moor(ex + dirX * 4.5 + sideX * sd * tw * 0.25, ez + dirZ * 4.5 + sideZ * sd * tw * 0.25, ma.rot + Math.PI / 2, r.range(13, 19));
        }
        off += r.range(22, 36);
      }
      // fuel dock at one end of the boardwalk: pumps and a canopy over the water
      const fo = (r.chance(0.5) ? -1 : 1) * (walkLen / 2 - 6);
      const fx = sx + sideX * fo + dirX * 7, fz = sz + sideZ * fo + dirZ * 7;
      slab('wood', fx, deck - 0.3, fz, 9, 0.3, 14);
      for (const sd of [-1, 1]) this.piling(fx + sideX * sd * 4 + dirX * 6, fz + sideZ * sd * 4 + dirZ * 6, deck + 0.6, 0.2);
      for (const sd of [-1, 1]) this.cyl('steel', fx + sideX * sd * 3, deck, fz + sideZ * sd * 3, 0.16, 4.4);
      slab('white', fx, deck + 4.4, fz, 10, 0.5, 8);
      slab('red', fx, deck, fz, 0.9, 1.3, 0.9);
      this.moor(fx + dirX * 12, fz + dirZ * 12, ma.rot + Math.PI / 2, r.range(8, 12));
      // harbour master and ships' store on land behind the boardwalk, dry-stack racks with boats
      const bx = sx - dirX * 22 + sideX * r.range(-8, 8), bz = sz - dirZ * 22 + sideZ * r.range(-8, 8);
      const g = this.map.heightAt(bx, bz);
      slab('white', bx, g, bz, 18, 5.5, 11);
      slab('dark', bx, g + 5.5, bz, 19.5, 0.5, 12.5);
      this.cyl('white', bx + sideX * 6, g + 6, bz + sideZ * 6, 0.9, 5.5); // observation mast
      this.markOccupied(bx, bz, 22);
      if (r.chance(0.7)) {
        const rx = sx - dirX * 26 + sideX * (walkLen / 2 - 30) * (fo > 0 ? -1 : 1), rz = sz - dirZ * 26 + sideZ * (walkLen / 2 - 30) * (fo > 0 ? -1 : 1);
        const rg = this.map.heightAt(rx, rz);
        if (rg > 0.9) {
          // open dry-stack rack: frame plus hulls on the shelves
          slab('steel', rx, rg + 8.6, rz, 30, 0.4, 10);
          for (const sd of [-1, 1]) for (const dd of [-1, 1]) this.cyl('steel', rx + sideX * sd * 14 + dirX * dd * 4.5, rg, rz + sideZ * sd * 14 + dirZ * dd * 4.5, 0.2, 8.6);
          const nb = r.int(4, 8);
          for (let i = 0; i < nb; i++) slab(r.pick(['white', 'white', 'blue', 'red']), rx + sideX * r.range(-12, 12) + dirX * r.range(-2, 2), rg + r.int(0, 2) * 2.8 + 0.4, rz + sideZ * r.range(-12, 12) + dirZ * r.range(-2, 2), 2.4, 1.4, 7);
          this.markOccupied(rx, rz, 20);
        }
      }
      // riprap groyne sheltering the mouth on the exposed side
      if (r.chance(0.6)) {
        const gs = r.chance(0.5) ? -1 : 1;
        const gx0 = sx + sideX * gs * (walkLen / 2 + 6), gz0 = sz + sideZ * gs * (walkLen / 2 + 6);
        const gl = r.range(40, 90);
        for (let t = 0; t < gl; t += r.range(3, 4.5)) {
          const x = gx0 + dirX * t + sideX * r.range(-1.5, 1.5), z = gz0 + dirZ * t + sideZ * r.range(-1.5, 1.5);
          if (this.map.heightAt(x, z) < -3) break;
          this.box('dark', x, -0.8 + r.range(0, 0.5), z, r.range(2.2, 3.6), r.range(1.8, 2.6), r.range(2.2, 3.4), r.range(0, Math.PI), r.range(-0.15, 0.15));
        }
      }
    }
  }

  /** Private docks of the canal estates: short wooden docks off the back yards, boats alongside. */
  private buildPrivateDocks(rng: Rng): void {
    const dock = (x: number, z: number, dx: number, dz: number, r: Rng) => {
      const shore = this.shoreDistance(x, z, dx, dz, 120);
      if (shore < 0 || shore >= 120) return;
      const sx = x + dx * shore, sz = z + dz * shore;
      const len = r.range(5, 9);
      if (this.map.heightAt(sx + dx * (len + 2), sz + dz * (len + 2)) > -0.7) return;
      const rot = Math.atan2(dx, -dz);
      const yaw = -rot;
      const deck = 0.75;
      this.box('wood', sx + dx * (len / 2 - 1.5), deck - 0.25, sz + dz * (len / 2 - 1.5), 1.8, 0.25, len + 3, yaw);
      const px = -dz, pz = dx;
      for (const t of [len - 0.6, len * 0.4]) for (const sd of [-1, 1]) this.piling(sx + dx * t + px * sd * 0.8, sz + dz * t + pz * sd * 0.8, deck + r.range(0.3, 0.7), 0.13);
      if (r.chance(0.55)) {
        const side = r.chance(0.5) ? -1 : 1;
        const bl = r.range(5.5, 10);
        this.moor(sx + dx * (len * 0.6) + px * side * 2.4, sz + dz * (len * 0.6) + pz * side * 2.4, yaw, bl);
      } else if (r.chance(0.35)) {
        // boat lift frame
        const side = r.chance(0.5) ? -1 : 1;
        for (const t of [len * 0.25, len * 0.8]) for (const s2 of [1.4, 4.2]) this.piling(sx + dx * t + px * side * s2, sz + dz * t + pz * side * s2, deck + 2.6, 0.12, 'steel');
        this.box('steel', sx + dx * (len * 0.52) + px * side * 2.8, deck + 2.6, sz + dz * (len * 0.52) + pz * side * 2.8, 3.4, 0.2, len * 0.6, yaw);
      }
    };
    // finger islands: docks off both long sides
    for (let i = 0; i < 5; i++) {
      const cx = 1870 - i * 25, cz = -3000 + i * 330;
      const r = rng.fork(`finger-${i}`);
      for (const sz of [-1, 1]) {
        for (let lx = -280 + r.range(0, 30); lx < 280; lx += r.range(26, 44)) {
          if (r.chance(0.25)) continue;
          dock(cx + lx, cz + sz * 60, 0, sz, r);
        }
      }
    }
    // residential canals: docks along both banks between the street culverts
    for (const c of this.map.canals) {
      const r = rng.fork(c.id);
      const x0 = Math.min(c.a[0], c.b[0]), x1 = Math.max(c.a[0], c.b[0]);
      for (let x = x0 + r.range(15, 40); x < x1 - 15; x += r.range(30, 55)) {
        if (c.culverts.some((cx) => Math.abs(cx - x) < c.culvertHalf + 12)) continue;
        if (r.chance(0.35)) continue;
        const side = r.chance(0.5) ? -1 : 1;
        dock(x, c.a[1] - side * (c.width * 0.5 + 14), 0, side, r);
      }
    }
  }

  /** Ocean fishing piers on the barrier island and the Southern Key. */
  private buildFishingPiers(rng: Rng): void {
    const piers: [number, number, number, number, number][] = [
      // start (on land), direction, length
      [2700, -4650, 1, 0, 170],
      [2600, -2350, 1, 0.05, 150],
      [1800, 6700, -0.2, 1, 130],
    ];
    for (const [x0, z0, dx0, dz0, len] of piers) {
      const r = rng.fork(`${x0}-${z0}`);
      const dl = Math.hypot(dx0, dz0), dx = dx0 / dl, dz = dz0 / dl;
      const shore = this.shoreDistance(x0, z0, dx, dz, 600);
      if (shore < 0 || shore >= 600) continue;
      // deck begins on the upper beach so the ramp is on land
      const sx = x0 + dx * (shore - 22), sz = z0 + dz * (shore - 22);
      const yaw = -Math.atan2(dx, -dz);
      const deck = 2.6;
      const total = len + 22;
      this.box('wood', sx + dx * total / 2, deck - 0.3, sz + dz * total / 2, 3.4, 0.3, total, yaw);
      const px = -dz, pz = dx;
      for (let t = 0; t < total; t += r.range(7, 10)) for (const sd of [-1, 1]) this.piling(sx + dx * t + px * sd * 1.5, sz + dz * t + pz * sd * 1.5, deck + 1.1, 0.2);
      // railings as thin boxes
      for (const sd of [-1, 1]) this.box('wood', sx + dx * total / 2 + px * sd * 1.6, deck + 0.9, sz + dz * total / 2 + pz * sd * 1.6, 0.1, 0.1, total, yaw);
      // T-head with a bait shack and shade canopy
      const ex = sx + dx * (total - 2.5), ez = sz + dz * (total - 2.5);
      const tw = r.range(14, 20);
      this.box('wood', ex, deck - 0.3, ez, tw, 0.3, 5, yaw);
      for (const sd of [-1, 1]) this.piling(ex + px * sd * tw * 0.5, ez + pz * sd * tw * 0.5, deck + 1.2, 0.22);
      this.box(r.pick(['white', 'blue', 'orange']), ex + px * tw * 0.22, deck, ez + pz * tw * 0.22, 4.5, 3, 4, yaw);
      this.box('dark', ex + px * tw * 0.22, deck + 3, ez + pz * tw * 0.22, 5.2, 0.3, 4.8, yaw);
      for (const sd of [-1, 1]) this.cyl('steel', ex - px * tw * 0.3 + dx * sd * 1.6, deck, ez - pz * tw * 0.3 + dz * sd * 1.6, 0.08, 3.2);
      this.box('white', ex - px * tw * 0.3, deck + 3.2, ez - pz * tw * 0.3, 5, 0.15, 4, yaw);
      // ticket hut at the landward end
      this.box('white', sx - dx * 2 + px * 3.5, this.map.heightAt(sx - dx * 2 + px * 3.5, sz - dz * 2 + pz * 3.5), sz - dz * 2 + pz * 3.5, 4, 3.2, 4, yaw);
      this.markOccupied(sx, sz, 12);
    }
  }

  /** Lateral channel markers (red / green pile beacons) along the dredged channels. */
  private buildChannelMarkers(rng: Rng): void {
    for (const ch of this.map.channels) {
      if (ch.width >= 250 || ch.depth < 3.5) continue;
      const r = rng.fork(ch.id);
      let carry = r.range(60, 200);
      for (let i = 0; i < ch.pts.length - 1; i++) {
        const [ax, az] = ch.pts[i], [bx, bz] = ch.pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        let t = carry;
        for (; t < len; t += r.range(260, 420)) {
          const x = ax + ux * t, z = az + uz * t;
          const off = ch.width * 0.5 + r.range(6, 14);
          for (const sd of [-1, 1]) {
            if (r.chance(0.3)) continue;
            const mx = x - uz * off * sd + r.range(-3, 3), mz = z + ux * off * sd + r.range(-3, 3);
            if (this.map.heightAt(mx, mz) > -1.2) continue;
            const top = r.range(3.2, 4.2);
            this.piling(mx, mz, top, 0.24, 'wood');
            // day board: red triangle-ish (box) to starboard, green square to port
            this.box(sd > 0 ? 'red' : 'green', mx, top - 1.1, mz, 1.1, 1.1, 0.25, Math.atan2(ux, -uz));
            if (r.chance(0.3)) this.box('white', mx, top + 0.1, mz, 0.5, 0.5, 0.5); // light
          }
        }
        carry = t - len;
      }
    }
  }

  /** Lifeguard towers spaced unevenly along the exposed beaches. */
  private buildLifeguardTowers(rng: Rng): void {
    const runs: [number, number, number, number, number, number][] = [
      // from (x,z) marching along (dx,dz) toward the sea, over a span of `span` metres of shoreline with (sx,sz) as the along-shore direction
      [2600, -7600, 1, 0, 0, 1],
      [3000, 4900, 1, 0.2, -0.2, 1],
    ];
    const colours = ['white', 'yellow', 'orange', 'blue', 'red'];
    for (const [x0, z0, dx, dz, sx, sz] of runs) {
      const r = rng.fork(`${x0}`);
      const span = x0 > 2900 ? 1600 : 6000;
      for (let s = r.range(120, 300); s < span; s += r.range(380, 620)) {
        const bx = x0 + sx * s, bz = z0 + sz * s;
        const shore = this.shoreDistance(bx, bz, dx, dz, 900);
        if (shore <= 0 || shore >= 900) continue;
        // upper beach: a few metres above the swash zone
        let d = shore - 14;
        while (d > 0 && this.map.heightAt(bx + dx * d, bz + dz * d) < 1.0) d -= 3;
        const tx = bx + dx * d, tz = bz + dz * d;
        const g = this.map.heightAt(tx, tz);
        if (g < 0.9 || g > 3.2 || this.map.zoneAt(tx, tz) !== 2) continue;
        const yaw = -Math.atan2(dx, -dz) + r.range(-0.2, 0.2);
        const c = Math.cos(yaw), sn = Math.sin(yaw);
        const col = r.pick(colours);
        for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) this.cyl('wood', tx + lx * c - lz * sn, g, tz + lx * sn + lz * c, 0.12, 3.0);
        this.box(col, tx, g + 3.0, tz, 3.2, 2.4, 3.0, yaw);
        this.box('white', tx, g + 5.4, tz, 3.9, 0.25, 3.7, yaw);
        this.box('wood', tx, g + 2.9, tz, 3.6, 0.15, 3.4, yaw);
        // stepped access ramp on the land side
        for (let k = 0; k < 4; k++) this.box('wood', tx - dx * (2.2 + k * 1.1), g + 2.9 - (k + 1) * 0.7, tz - dz * (2.2 + k * 1.1), 1.0, 0.12, 1.2, yaw);
        this.markOccupied(tx, tz, 6);
      }
    }
  }

  /** Golf clubhouse: low pavilion with a veranda, pro shop wing, putting green and cart barn. */
  private buildClubhouse(rng: Rng): void {
    const cl = this.map.pois.find((p) => p.kind === 'clubhouse');
    if (!cl) return;
    const g = this.map.heightAt(cl.x, cl.z);
    if (g < 1) return;
    const c = Math.cos(cl.rot), s = Math.sin(cl.rot);
    const at = (lx: number, lz: number): [number, number] => [cl.x + lx * c - lz * s, cl.z + lx * s + lz * c];
    const [hx, hz] = at(0, 0);
    this.box('white', hx, g, hz, 34, 5.5, 18, cl.rot);
    this.box('dark', hx, g + 5.5, hz, 37, 0.6, 21, cl.rot);
    this.box('white', hx, g + 6.1, hz, 12, 2.4, 8, cl.rot); // cupola
    this.box('dark', hx, g + 8.5, hz, 13.5, 0.4, 9.5, cl.rot);
    // veranda along the green side with columns
    const [vx, vz] = at(0, 13);
    this.box('wood', vx, g + 0.4, vz, 34, 0.3, 8, cl.rot);
    this.box('white', vx, g + 4.6, vz, 35, 0.35, 9, cl.rot);
    for (let i = -3; i <= 3; i++) { const [px, pz] = at(i * 5.5, 16.5); this.cyl('white', px, g + 0.7, pz, 0.22, 3.9); }
    // pro shop wing and cart barn
    const [wx, wz] = at(24, -4);
    this.box('white', wx, g, wz, 14, 4, 12, cl.rot);
    this.box('dark', wx, g + 4, wz, 15.5, 0.5, 13.5, cl.rot);
    const [bx, bz] = at(-26, -8);
    this.box('concrete', bx, g, bz, 16, 3.4, 14, cl.rot);
    this.box('dark', bx, g + 3.4, bz, 17, 0.4, 15, cl.rot);
    for (let i = 0; i < 5; i++) { const [cx, cz] = at(-30 + i * 3.2, 3 + rng.range(-1, 1)); this.box('white', cx, g, cz, 1.3, 1.1, 2.4, cl.rot); this.box('dark', cx, g + 1.6, cz, 1.4, 0.1, 2.2, cl.rot); }
    // putting green with a flag
    const [gx, gz] = at(4, 32);
    this.box('grass', gx, g + 0.05, gz, 30, 0.2, 20, cl.rot);
    this.cyl('white', gx + 4, g + 0.25, gz - 3, 0.04, 2.2);
    this.box('red', gx + 4.3, g + 2.0, gz - 3, 0.6, 0.4, 0.05, cl.rot);
    // parking apron
    const [px, pz] = at(-6, -22);
    this.box('dark', px, g - 0.05, pz, 48, 0.2, 18, cl.rot);
    this.markOccupied(cl.x, cl.z, 60);
  }

  /** Port island: everything is laid out in the island's own frame (u along the quays, v across,
   *  +v toward the south quay) so cranes, stacks and berths follow the slightly rotated seawalls. */
  private buildPort(rng: Rng): void {
    const P = PORT_ISLAND;
    const ca = Math.cos(P.rot), sa = Math.sin(P.rot);
    const world = (u: number, v: number): [number, number] => [P.cx + u * ca - v * sa, P.cz + u * sa + v * ca];
    const yaw = -P.rot;
    const pbox = (mat: string, u: number, y: number, v: number, alongU: number, h: number, alongV: number) => { const [x, z] = world(u, v); this.box(mat, x, y, z, alongU, h, alongV, yaw); };
    const pcyl = (mat: string, u: number, y: number, v: number, r: number, h: number) => { const [x, z] = world(u, v); this.cyl(mat, x, y, z, r, h, yaw); };
    const ground = (u: number, v: number) => { const [x, z] = world(u, v); return this.map.heightAt(x, z); };
    const occupy = (u: number, v: number, r: number) => { const [x, z] = world(u, v); this.markOccupied(x, z, r); };
    const boxColours = ['red', 'blue', 'green', 'orange', 'steel', 'white', 'blue', 'red'];
    // container gantry cranes along the north quay, booms out over the ship channel
    const quayN = -P.hh;
    const craneU: number[] = [];
    for (let u = -P.hw + 170; u < P.hw - 150; u += rng.range(185, 240)) craneU.push(u);
    for (const u of craneU) {
      const v = quayN + 16;
      const g = ground(u, v);
      if (g < 1) continue;
      const legW = 18, h = 40 + rng.range(-3, 5);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) pbox('steel', u + su * legW / 2, g, v + sv * 6, 1.6, h, 1.6);
      pbox('steel', u, g + h, v - 4, legW + 4, 3, 3);
      pbox('steel', u, g + h, v + 4, legW + 4, 3, 3);
      pbox('orange', u, g + h + 3, v - 26, 3.2, 3, 58); // boom over the water
      pbox('steel', u, g + h + 5, v + 12, 3, 3, 18); // counterweight arm over the apron
      pbox('white', u, g + h - 14, v - 12, 6, 4, 6); // operator cab
    }
    // a bulk carrier and a feeder ship alongside the north quay (hulls in the water)
    for (const [u, len, beam, hullH] of [[-420, 190, 30, 9], [330, 130, 22, 7]] as const) {
      const v = quayN - beam / 2 - 3;
      pbox('dark', u, -2.5, v, len, hullH + 2.5, beam);
      pbox(rng.pick(['red', 'blue']), u, hullH, v, len - 6, 1.6, beam - 2);
      pbox('white', u + len * 0.36, hullH + 1.6, v, len * 0.14, 12, beam - 6); // bridge aft
      for (let k = 0; k < 4; k++) pbox('steel', u - len * 0.32 + k * len * 0.18, hullH + 1.6, v, 3, 6 + (k % 2) * 3, 2); // hatch cranes
    }
    // container yard: blocks of stacks with truck lanes between, filling the apron behind the cranes
    const yardV0 = quayN + 70, yardV1 = 40;
    for (let bu = -P.hw + 90; bu < P.hw - 260; bu += 175) {
      for (let bv = yardV0; bv < yardV1 - 40; bv += 58) {
        if (rng.chance(0.12)) continue; // empty block
        const g = ground(bu + 60, bv + 20);
        if (g < 1) continue;
        const rows = 6, bays = 10;
        const tall = rng.range(1, 4);
        for (let r = 0; r < rows; r++) for (let c = 0; c < bays; c++) {
          if (rng.chance(0.28)) continue;
          const stack = Math.min(4, Math.max(1, Math.round(tall + rng.range(-1.5, 1.5))));
          const u = bu + c * 13.4, v = bv + r * 6.1;
          for (let k = 0; k < stack; k++) pbox(rng.pick(boxColours), u, g + k * 2.6, v, 12.2, 2.6, 4.9);
        }
        occupy(bu + 60, bv + 15, 80);
        if (rng.chance(0.5)) pcyl('steel', bu - 8, g, bv - 6, 0.3, 30); // yard light mast
      }
    }
    // transit sheds and a reefer plaza along the south side of the apron
    let u = -P.hw + 140;
    while (u < P.hw - 520) {
      const len = rng.range(120, 170), depth = rng.range(40, 55), v = 150 + rng.range(-10, 10);
      const g = ground(u + len / 2, v);
      if (g >= 1) {
        pbox(rng.pick(['concrete', 'white', 'tank']), u + len / 2, g, v, len, 11 + rng.range(0, 3), depth);
        pbox('dark', u + len / 2, g + 11 + 3, v, len + 2, 0.6, depth + 2); // parapet roof
        for (let d = 0; d < 6; d++) pbox('steel', u + 12 + d * (len - 24) / 5, g, v + depth / 2 + 3, 4, 4.2, 6); // loading docks
        occupy(u + len / 2, v, Math.max(len, depth) * 0.6);
      }
      u += len + rng.range(30, 60);
    }
    // cruise terminal on the south quay, ship berthed in the water alongside
    const quayS = P.hh;
    const cu = 260;
    const gz = ground(cu, quayS - 60);
    pbox('white', cu, gz, quayS - 60, 260, 12, 40);
    pbox('glass', cu, gz + 12, quayS - 60, 240, 4, 36);
    pbox('white', cu, gz, quayS - 20, 120, 7, 30); // gangway hall reaching the quay
    occupy(cu, quayS - 55, 150);
    const sv = quayS + 19;
    pbox('dark', cu, -2.5, sv, 290, 12.5, 36);
    pbox('white', cu, 10, sv, 280, 28, 32);
    for (let d = 0; d < 6; d++) pbox('glass', cu, 13.5 + d * 3.5, sv, 276, 1.2, 33);
    pbox('white', cu - 30, 38, sv, 90, 8, 22);
    pcyl('dark', cu - 90, 38, sv, 4, 14);
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
