// Sliding doors. Every doorway in the spec gets a black frame (merged into the owning room's kit) and a
// pair of leaves that part sideways into the wall. Leaves for the whole ship are one InstancedMesh, so
// animating them costs nothing extra; each door also owns a collider that switches off while open.
// Doors open automatically when the player is near (Imperial doors are not pushed), unless they belong
// to a lift, in which case the lift drives them. State is serialisable for future network sync.
import * as THREE from "three";
import { PALETTE } from "../materials.js";

const OPEN_RANGE = 2.6; // m, distance at which a door starts opening
const CLOSE_DELAY = 1.4; // s, after the player leaves the trigger
const SPEED = 2.2; // 1/s, open fraction per second

export class DoorSystem {
  constructor(materials) {
    this.materials = materials;
    this.doors = [];
    this.mesh = null;
    this.audio = null; // optional hook: { play(name, position) }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }

  /**
   * @param kit the kit of the room that owns the wall (frame geometry is merged into it)
   * @param d { id, x, z, y, width, height, axis: 'x'|'z' (wall direction), depth, zone, lift, blast }
   */
  add(kit, d) {
    const door = {
      id: d.id,
      x: d.x,
      z: d.z,
      y: d.y,
      width: d.width,
      height: d.height,
      axis: d.axis,
      depth: d.depth ?? 0.5,
      zone: d.zone,
      lift: d.lift || null,
      blast: !!d.blast,
      locked: !!d.locked,
      open: 0, // 0 closed .. 1 open
      target: 0,
      timer: 0,
      collider: null,
      leaves: [0, 0],
    };
    const along = door.axis; // leaves travel along this axis
    const half = door.width / 2;
    const t = door.blast ? 0.22 : 0.12; // leaf thickness
    const fw = door.blast ? 0.45 : 0.16; // frame width
    const hd = door.depth / 2;
    const frameMat = door.blast ? "paintedMetal" : "satinBlack";
    const frameCol = door.blast ? PALETTE.darkMetal : PALETTE.impBlack;
    // frame: two jambs, a header, a sill plate
    const jamb = (c) => {
      if (along === "x") kit.boxMM(frameMat, [c - fw / 2, door.y, door.z - hd - 0.02], [c + fw / 2, door.y + door.height + fw, door.z + hd + 0.02], { color: frameCol, texel: 2 });
      else kit.boxMM(frameMat, [door.x - hd - 0.02, door.y, c - fw / 2], [door.x + hd + 0.02, door.y + door.height + fw, c + fw / 2], { color: frameCol, texel: 2 });
    };
    if (along === "x") {
      jamb(door.x - half - fw / 2);
      jamb(door.x + half + fw / 2);
      kit.boxMM(frameMat, [door.x - half - fw, door.y + door.height, door.z - hd - 0.02], [door.x + half + fw, door.y + door.height + fw, door.z + hd + 0.02], { color: frameCol, texel: 2 });
      kit.boxMM("metal", [door.x - half, door.y - 0.005, door.z - hd - 0.05], [door.x + half, door.y + 0.015, door.z + hd + 0.05], { color: PALETTE.steel, texel: 2 });
      // tunnel lining through the wall thickness
      kit.boxMM(frameMat, [door.x - half - 0.02, door.y + door.height - 0.02, door.z - hd], [door.x + half + 0.02, door.y + door.height, door.z + hd], { color: frameCol });
      if (!door.blast) {
        kit.box("emitBlue", door.x - half - fw / 2, door.y + 1.15, door.z - hd - 0.03, 0.03, 0.5, 0.012);
        kit.box("emitBlue", door.x + half + fw / 2, door.y + 1.15, door.z + hd + 0.03, 0.03, 0.5, 0.012);
      }
      door.collider = kit.collider([door.x - half, door.y, door.z - hd], [door.x + half, door.y + door.height, door.z + hd], "door:" + door.id);
    } else {
      jamb(door.z - half - fw / 2);
      jamb(door.z + half + fw / 2);
      kit.boxMM(frameMat, [door.x - hd - 0.02, door.y + door.height, door.z - half - fw], [door.x + hd + 0.02, door.y + door.height + fw, door.z + half + fw], { color: frameCol, texel: 2 });
      kit.boxMM("metal", [door.x - hd - 0.05, door.y - 0.005, door.z - half], [door.x + hd + 0.05, door.y + 0.015, door.z + half], { color: PALETTE.steel, texel: 2 });
      kit.boxMM(frameMat, [door.x - hd, door.y + door.height - 0.02, door.z - half - 0.02], [door.x + hd, door.y + door.height, door.z + half + 0.02], { color: frameCol });
      if (!door.blast) {
        kit.box("emitBlue", door.x - hd - 0.03, door.y + 1.15, door.z - half - fw / 2, 0.012, 0.5, 0.03);
        kit.box("emitBlue", door.x + hd + 0.03, door.y + 1.15, door.z + half + fw / 2, 0.012, 0.5, 0.03);
      }
      door.collider = kit.collider([door.x - hd, door.y, door.z - half], [door.x + hd, door.y + door.height, door.z + half], "door:" + door.id);
    }
    door.leafT = t;
    this.doors.push(door);
    return door;
  }

  // Create the instanced leaf mesh (and the per-door status lamps) once every door has been added.
  build(parent) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const metal = this.materials.metal;
    // worn painted-steel leaves: the shared metal maps give seams and wear at door scale
    const mat = new THREE.MeshStandardMaterial({
      color: 0x646972,
      map: metal.map,
      roughnessMap: metal.roughnessMap,
      normalMap: metal.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.6,
      metalness: 0.45,
      envMapIntensity: 0.6,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, this.doors.length * 2));
    this.mesh.name = "doorLeaves";
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = this.doors.length * 2;
    parent.add(this.mesh);
    // status lamp above each door: red while sealed, blue-white while open
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false });
    this.lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lampMat, Math.max(1, this.doors.length));
    this.lamps.name = "doorLamps";
    this.lamps.frustumCulled = false;
    this.lamps.count = this.doors.length;
    parent.add(this.lamps);
    for (let i = 0; i < this.doors.length; i++) this._place(i);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.lamps.instanceMatrix.needsUpdate = true;
    if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;
  }

  _lampColor(d, out) {
    return d.open > 0.5 ? out.setRGB(0.55, 0.8, 1.6) : out.setRGB(1.6, 0.25, 0.2);
  }

  _place(i) {
    const d = this.doors[i];
    const half = d.width / 2;
    const travel = half * d.open; // each leaf slides its own half width into the wall
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? -1 : 1;
      const cAlong = (d.axis === "x" ? d.x : d.z) + sgn * (half / 2 + travel);
      if (d.axis === "x") {
        this._p.set(cAlong, d.y + d.height / 2, d.z);
        this._s.set(half, d.height, d.leafT);
      } else {
        this._p.set(d.x, d.y + d.height / 2, cAlong);
        this._s.set(d.leafT, d.height, half);
      }
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i * 2 + k, this._m);
    }
    if (this.lamps) {
      const y = d.y + d.height + (d.blast ? 0.45 : 0.16) + 0.06;
      if (d.axis === "x") this._s.set(0.36, 0.06, d.depth + 0.1);
      else this._s.set(d.depth + 0.1, 0.06, 0.36);
      this._p.set(d.x, y, d.z);
      this._m.compose(this._p, this._q, this._s);
      this.lamps.setMatrixAt(i, this._m);
      this.lamps.setColorAt(i, this._lampColor(d, this._c || (this._c = new THREE.Color())));
    }
  }

  setOpen(door, open) {
    door.target = open ? 1 : 0;
    if (open) door.timer = CLOSE_DELAY;
  }

  update(dt, playerPos, activeZone) {
    if (!this.mesh) return;
    let dirty = false;
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      if (!d.lift && !d.locked) {
        const inZone = !d.zone || d.zone === activeZone;
        const dx = playerPos.x - d.x;
        const dz = playerPos.z - d.z;
        const dy = playerPos.y - d.y;
        const near = inZone && dx * dx + dz * dz < OPEN_RANGE * OPEN_RANGE && dy > -1.5 && dy < 2.5;
        if (near) {
          if (d.target === 0 && this.audio) this.audio.play("door.open", d);
          d.target = 1;
          d.timer = CLOSE_DELAY;
        } else if (d.target === 1) {
          d.timer -= dt;
          if (d.timer <= 0) {
            d.target = 0;
            if (this.audio) this.audio.play("door.close", d);
          }
        }
      }
      if (d.open !== d.target) {
        const speed = d.blast ? SPEED * 0.35 : SPEED;
        d.open = d.target > d.open ? Math.min(d.target, d.open + speed * dt) : Math.max(d.target, d.open - speed * dt);
        this._place(i);
        dirty = true;
      }
      d.collider.disabled = d.open > 0.55;
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.lamps.instanceMatrix.needsUpdate = true;
      if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;
    }
  }

  byId(id) {
    return this.doors.find((d) => d.id === id);
  }

  serialize() {
    return this.doors.map((d) => ({ id: d.id, open: +d.open.toFixed(3), target: d.target, locked: d.locked }));
  }

  applyState(states) {
    for (const s of states) {
      const d = this.byId(s.id);
      if (!d) continue;
      d.open = s.open;
      d.target = s.target;
      d.locked = s.locked;
      this._place(this.doors.indexOf(d));
    }
    if (this.mesh) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.lamps.instanceMatrix.needsUpdate = true;
      if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;
    }
  }
}
