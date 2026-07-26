import * as THREE from 'three';
import * as KIT from './kit.js';
import { MAT, plainMaterial, clearGlass, frostedGlass } from '../art/materials.js';
import { PALETTE, shade } from '../art/palette.js';
import { SURFACE } from '../physics/world.js';
import { bus, EVT } from '../core/events.js';
import { assets } from '../core/assets.js';
import { generateImageTexture } from '../art/texgen.js';

// ---------------------------------------------------------------------------
// Doors: geometry, hardware, swing animation, collision, navigation and audio.
// A door is authoritative for four things at once, so they all live here:
//   visual state, collider state, nav-link cost, and the text-state output.
// ---------------------------------------------------------------------------

export const DOOR_STATE = { CLOSED: 'closed', OPENING: 'opening', OPEN: 'open', CLOSING: 'closing', LOCKED: 'locked', DAMAGED: 'damaged' };

const SIGN_TEXT = {
  'DOOR-SERVER': ['SERVER ROOM', 'AUTHORISED ACCESS ONLY'],
  'DOOR-SERVER-S': ['SERVER ROOM', 'NO FOOD OR DRINK'],
  'DOOR-MECH': ['MECHANICAL', 'HIGH VOLTAGE'],
  'DOOR-MECH-S': ['MECHANICAL', 'PLANT ROOM'],
  'DOOR-IT': ['IT WORKSHOP', 'B-114'],
  'DOOR-JANITOR': ['JANITOR', 'B-110'],
  'DOOR-REST': ['RESTROOMS', ''],
  'DOOR-REST-2': ['RESTROOMS', ''],
  'DOOR-CONF-W': ['SUNFIELD ROOM', 'A-201'],
  'DOOR-CONF-N': ['SUNFIELD ROOM', 'A-201'],
  'DOOR-CONF-S': ['FIRE EXIT', 'KEEP CLEAR'],
  'DOOR-EXEC': ['REGIONAL DIRECTOR', 'M-301'],
  'DOOR-ARCHIVE-N': ['RECORDS ARCHIVE', 'M-305'],
  'DOOR-WSTAIR-G': ['STAIR W', 'FIRE DOOR — KEEP SHUT'],
  'DOOR-WSTAIR-U': ['STAIR W', 'FIRE DOOR — KEEP SHUT'],
  'DOOR-LOAD-W': ['LOADING DOCK', 'HI-VIS REQUIRED'],
  'DOOR-BREAK-N': ['BREAK ROOM', 'B-104'],
  'DOOR-COPY-S': ['COPY & MAIL', 'B-108'],
};

let doorSignMat = null;
function signMaterial(id) {
  const [line1, line2] = SIGN_TEXT[id] || ['', ''];
  if (!line1) return null;
  const tex = generateImageTexture(`doorsign:${id}`, 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1b2a33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a3d49';
    ctx.fillRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#dfeaf2';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line1, w / 2, line2 ? h * 0.36 : h * 0.5, w - 16);
    if (line2) {
      ctx.font = '17px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#9fb6c4';
      ctx.fillText(line2, w / 2, h * 0.7, w - 16);
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.1 });
}

export class Door {
  /**
   * @param {object} spec from LevelBuild.doorSpecs
   * @param {import('../physics/world.js').CollisionWorld} collision
   */
  constructor(spec, collision, scene) {
    this.spec = spec;
    this.id = spec.id;
    this.collision = collision;
    this.state = spec.security ? DOOR_STATE.LOCKED : DOOR_STATE.CLOSED;
    this.initialState = this.state;
    this.openAmount = 0; // 0 closed .. 1 fully open
    this.targetAmount = 0;
    this.swingSign = spec.axis === 'z' ? 1 : -1;
    this.health = spec.fire ? 260 : 140;
    this.damaged = false;
    this.locked = !!spec.security;
    this.lastUseTime = -99;
    this.group = new THREE.Group();
    this.group.name = `door:${spec.id}`;
    this.leaves = [];
    this.build();
    scene.add(this.group);
    this.colliders = [];
    this.makeColliders();
    this.apply(0, true);
  }

  build() {
    const s = this.spec;
    const leafCount = s.double ? 2 : 1;
    const leafW = (s.width - (s.double ? 0.01 : 0)) / leafCount;
    const th = 0.045;

    const faceMat = s.security
      ? MAT.metalPaintedDark
      : s.fire
        ? plainMaterial(shade(PALETTE.paintedMetal, 1.05), { roughness: 0.44, metalness: 0.5 }, 'firedoor')
        : MAT.woodDesk;
    const edgeMat = plainMaterial(shade(PALETTE.woodDark, 1.1), { roughness: 0.55 }, 'dooredge');

    for (let i = 0; i < leafCount; i++) {
      const pivot = new THREE.Group();
      const hingeSide = leafCount === 2 ? (i === 0 ? -1 : 1) : -1;
      pivot.position.set(hingeSide * (s.width / 2), 0, 0);
      pivot.userData.hingeSide = hingeSide;

      const leaf = new THREE.Group();
      leaf.position.set((-hingeSide * leafW) / 2, 0, 0);

      if (s.glass) {
        // Stile-and-rail glazed leaf.
        const railMat = plainMaterial(PALETTE.aluminum, { roughness: 0.35, metalness: 0.85 }, 'doorrail');
        const stileW = 0.09;
        const bottomH = 0.26;
        const topH = 0.1;
        const parts = [
          [leafW, bottomH, 0, bottomH / 2],
          [leafW, topH, 0, s.height - topH / 2],
          [stileW, s.height - bottomH - topH, -leafW / 2 + stileW / 2, (s.height + bottomH - topH) / 2],
          [stileW, s.height - bottomH - topH, leafW / 2 - stileW / 2, (s.height + bottomH - topH) / 2],
        ];
        for (const [w, h, x, y] of parts) {
          const m = KIT.mesh(KIT.bevelBox(w, h, th, 0.005), railMat);
          m.position.set(x, y, 0);
          leaf.add(m);
        }
        const gw = leafW - stileW * 2;
        const gh = s.height - bottomH - topH;
        const pane = KIT.mesh(KIT.plane(gw, gh), clearGlass(0xcfe0ea, 0.13), { cast: false, receive: false });
        pane.position.set(0, bottomH + gh / 2, 0);
        pane.renderOrder = 4;
        leaf.add(pane);
      } else {
        const face = KIT.mesh(KIT.bevelBox(leafW, s.height, th, 0.006), faceMat);
        face.position.y = s.height / 2;
        leaf.add(face);
        // Recessed panel detail on timber leaves.
        if (!s.security && !s.fire) {
          for (const [py, ph] of [[0.42, 0.66], [1.34, 0.62]]) {
            const p = KIT.mesh(KIT.bevelBox(leafW - 0.18, ph, th + 0.006, 0.006), edgeMat);
            p.position.set(0, py + ph / 2 - 0.1, 0);
            leaf.add(p);
          }
        }
        // Vision panel on fire doors.
        if (s.fire) {
          const vp = KIT.mesh(KIT.plane(0.16, 0.5), clearGlass(0xd6e6ee, 0.16), { cast: false, receive: false });
          vp.position.set(0, s.height * 0.68, th / 2 + 0.002);
          leaf.add(vp);
          const vpb = KIT.mesh(KIT.plane(0.16, 0.5), clearGlass(0xd6e6ee, 0.16), { cast: false, receive: false });
          vpb.position.set(0, s.height * 0.68, -th / 2 - 0.002);
          vpb.rotation.y = Math.PI;
          leaf.add(vpb);
          const surround = KIT.mesh(KIT.bevelBox(0.2, 0.54, th + 0.01, 0.004), plainMaterial(0x2a2e33, { roughness: 0.5 }, 'vpframe'));
          surround.position.set(0, s.height * 0.68, 0);
          leaf.add(surround);
        }
      }

      // Hardware: lever handle both sides, hinges, closer.
      const hwMat = plainMaterial(PALETTE.brushedMetal, { roughness: 0.26, metalness: 0.95 }, 'hardware');
      const handleX = -hingeSide * (leafW / 2 - 0.08);
      for (const zside of [-1, 1]) {
        if (s.security || s.fire) {
          // Push bar on egress side, lever on the other.
          if (zside === 1) {
            const bar = KIT.mesh(KIT.cyl(0.018, 0.018, leafW * 0.72, 10), hwMat);
            bar.rotation.z = Math.PI / 2;
            bar.position.set(0, 1.03, zside * (th / 2 + 0.045));
            leaf.add(bar);
            for (const bx of [-1, 1]) {
              const br = KIT.mesh(KIT.box(0.03, 0.05, 0.05), hwMat);
              br.position.set(bx * leafW * 0.3, 1.03, zside * (th / 2 + 0.022));
              leaf.add(br);
            }
            continue;
          }
        }
        const rose = KIT.mesh(KIT.cyl(0.032, 0.032, 0.012, 12), hwMat);
        rose.rotation.x = Math.PI / 2;
        rose.position.set(handleX, 1.05, zside * (th / 2 + 0.006));
        leaf.add(rose);
        const lever = KIT.mesh(KIT.bevelBox(0.105, 0.022, 0.026, 0.005), hwMat);
        lever.position.set(handleX + -hingeSide * -0.045, 1.05, zside * (th / 2 + 0.028));
        leaf.add(lever);
      }
      // Hinges
      for (const hy of [0.28, s.height * 0.5, s.height - 0.28]) {
        const h = KIT.mesh(KIT.cyl(0.014, 0.014, 0.09, 8), hwMat);
        h.position.set(hingeSide * (leafW / 2 - 0.004), hy, 0);
        leaf.add(h);
      }
      // Overhead closer on fire / security doors
      if (s.fire || s.security) {
        const body = KIT.mesh(KIT.bevelBox(0.2, 0.06, 0.05, 0.006), plainMaterial(0x33383d, { roughness: 0.45, metalness: 0.6 }, 'closer'));
        body.position.set(hingeSide * (leafW * 0.28), s.height - 0.1, th / 2 + 0.03);
        leaf.add(body);
        const arm = KIT.mesh(KIT.box(0.16, 0.012, 0.016), plainMaterial(0x40464c, { roughness: 0.4, metalness: 0.7 }, 'closerarm'));
        arm.position.set(hingeSide * (leafW * 0.05), s.height - 0.07, th / 2 + 0.05);
        leaf.add(arm);
      }
      // Kick plate
      if (!s.glass) {
        const kp = KIT.mesh(KIT.bevelBox(leafW - 0.05, 0.2, 0.004, 0.002), plainMaterial(PALETTE.aluminum, { roughness: 0.32, metalness: 0.9 }, 'kickplate'));
        kp.position.set(0, 0.14, th / 2 + 0.003);
        leaf.add(kp);
      }

      pivot.add(leaf);
      this.group.add(pivot);
      this.leaves.push(pivot);
    }

    // Door sign on the wall beside the leaf.
    const sm = signMaterial(this.id);
    if (sm) {
      const sign = KIT.mesh(KIT.bevelBox(0.24, 0.09, 0.006, 0.002), sm);
      sign.position.set(this.spec.width / 2 + 0.18, 1.62, 0.055);
      this.group.add(sign);
      assets.tag(sign, 'SIGN-DOOR-PLATE');
    }

    // Card reader / keypad on secured doors.
    if (this.spec.security) {
      const reader = new THREE.Group();
      const body = KIT.mesh(KIT.bevelBox(0.075, 0.12, 0.022, 0.004), plainMaterial(0x22262b, { roughness: 0.4 }, 'reader'));
      reader.add(body);
      const led = KIT.mesh(KIT.cyl(0.006, 0.006, 0.004, 8), new THREE.MeshStandardMaterial({
        color: 0x220000, emissive: 0xff3322, emissiveIntensity: 3, roughness: 0.4,
      }));
      led.rotation.x = Math.PI / 2;
      led.position.set(0, 0.04, 0.013);
      reader.add(led);
      this.readerLed = led.material;
      reader.position.set(this.spec.width / 2 + 0.17, 1.15, 0.07);
      this.group.add(reader);
      assets.tag(reader, 'DOOR-CARDREADER');
    }

    this.group.position.set(this.spec.x, this.spec.y, this.spec.z);
    this.group.rotation.y = this.spec.rotY;
    assets.tag(this.group, this.spec.security ? 'DOOR-SECURITY' : this.spec.fire ? 'DOOR-FIRE' : this.spec.glass ? 'DOOR-GLASS' : 'DOOR-STANDARD');
  }

  makeColliders() {
    const s = this.spec;
    const isZ = s.axis === 'z';
    const halfW = s.width / 2;
    const c = this.collision.add({
      min: [s.x - (isZ ? 0.05 : halfW), s.y, s.z - (isZ ? halfW : 0.05)],
      max: [s.x + (isZ ? 0.05 : halfW), s.y + s.height, s.z + (isZ ? halfW : 0.05)],
      surface: s.security ? SURFACE.METAL : SURFACE.WOOD,
      tag: `door:${this.id}`,
      dynamic: true,
      blocksSight: true,
      ref: this,
    });
    this.colliders = [c];
  }

  get isOpen() {
    return this.openAmount > 0.55;
  }

  get isPassable() {
    return this.openAmount > 0.5 || this.state === DOOR_STATE.DAMAGED;
  }

  /** Player / AI interaction. Returns a short result string for feedback. */
  use(byPlayer = true, atTime = 0, hasKeycard = false) {
    if (this.state === DOOR_STATE.DAMAGED) return 'damaged';
    if (this.locked && !hasKeycard) {
      bus.emit(EVT.DOOR_STATE, { id: this.id, state: 'locked', door: this });
      return 'locked';
    }
    if (this.locked && hasKeycard) {
      this.locked = false;
      if (this.readerLed) {
        this.readerLed.emissive.setHex(0x22ff66);
      }
      bus.emit(EVT.DOOR_STATE, { id: this.id, state: 'unlocked', door: this });
    }
    this.targetAmount = this.targetAmount > 0.5 ? 0 : 1;
    this.state = this.targetAmount > 0.5 ? DOOR_STATE.OPENING : DOOR_STATE.CLOSING;
    this.lastUseTime = atTime;
    bus.emit(EVT.DOOR_STATE, { id: this.id, state: this.state, door: this, byPlayer });
    return this.targetAmount > 0.5 ? 'opening' : 'closing';
  }

  forceOpen(amount = 1) {
    this.locked = false;
    this.targetAmount = amount;
    this.state = amount > 0.5 ? DOOR_STATE.OPENING : DOOR_STATE.CLOSING;
  }

  damage(amount, atTime = 0) {
    if (this.state === DOOR_STATE.DAMAGED) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.state = DOOR_STATE.DAMAGED;
      this.damaged = true;
      this.locked = false;
      this.targetAmount = 1;
      // A blown door hangs off its hinges rather than swinging cleanly.
      for (const leaf of this.leaves) leaf.rotation.z = -0.09;
      bus.emit(EVT.DOOR_STATE, { id: this.id, state: 'damaged', door: this });
    }
  }

  update(dt) {
    if (this.spec.shutter) return this.updateShutter(dt);
    const speed = this.state === DOOR_STATE.CLOSING ? 1.9 : 2.6;
    if (Math.abs(this.openAmount - this.targetAmount) > 0.001) {
      const dir = Math.sign(this.targetAmount - this.openAmount);
      this.openAmount = THREE.MathUtils.clamp(this.openAmount + dir * speed * dt, 0, 1);
      this.apply(dt);
      if (Math.abs(this.openAmount - this.targetAmount) <= 0.001) {
        this.openAmount = this.targetAmount;
        this.state = this.openAmount > 0.5 ? DOOR_STATE.OPEN : (this.locked ? DOOR_STATE.LOCKED : DOOR_STATE.CLOSED);
        bus.emit(EVT.DOOR_STATE, { id: this.id, state: this.state, door: this, settled: true });
      }
    }
  }

  updateShutter(dt) {
    if (Math.abs(this.openAmount - this.targetAmount) > 0.001) {
      const dir = Math.sign(this.targetAmount - this.openAmount);
      this.openAmount = THREE.MathUtils.clamp(this.openAmount + dir * 0.35 * dt, 0, 1);
      this.apply(dt);
      if (Math.abs(this.openAmount - this.targetAmount) <= 0.001) {
        this.state = this.openAmount > 0.5 ? DOOR_STATE.OPEN : DOOR_STATE.CLOSED;
        bus.emit(EVT.DOOR_STATE, { id: this.id, state: this.state, door: this, settled: true });
      }
    }
  }

  apply(dt, force = false) {
    const ease = this.openAmount * this.openAmount * (3 - 2 * this.openAmount);
    if (!this.spec.shutter) {
      for (const pivot of this.leaves) {
        const dirSign = pivot.userData.hingeSide;
        pivot.rotation.y = ease * (Math.PI * 0.52) * dirSign * this.swingSign;
      }
    }
    // Collider follows: shrink to nothing when the leaf has swung clear.
    const c = this.colliders[0];
    if (c) {
      c.enabled = this.openAmount < 0.5 && this.state !== DOOR_STATE.DAMAGED;
      c.blocksSight = this.openAmount < 0.35 && this.state !== DOOR_STATE.DAMAGED;
    }
  }

  reset() {
    this.openAmount = 0;
    this.targetAmount = 0;
    this.locked = !!this.spec.security;
    this.state = this.initialState;
    this.health = this.spec.fire ? 260 : 140;
    this.damaged = false;
    for (const leaf of this.leaves) leaf.rotation.z = 0;
    if (this.readerLed) this.readerLed.emissive.setHex(0xff3322);
    this.apply(0, true);
  }

  toJSON(playerPos) {
    const d = playerPos ? Math.hypot(this.spec.x - playerPos.x, this.spec.z - playerPos.z) : null;
    return {
      id: this.id,
      state: this.state,
      open: +this.openAmount.toFixed(2),
      locked: this.locked,
      damaged: this.damaged,
      position: [+this.spec.x.toFixed(2), +this.spec.y.toFixed(2), +this.spec.z.toFixed(2)],
      ...(d !== null ? { distance: +d.toFixed(2) } : {}),
    };
  }
}

export class DoorSystem {
  constructor(collision, scene) {
    this.collision = collision;
    this.scene = scene;
    /** @type {Map<string, Door>} */
    this.doors = new Map();
  }

  createFromSpecs(specs) {
    for (const spec of specs.values()) {
      if (spec.shutter) continue; // built by the garage prop
      const d = new Door(spec, this.collision, this.scene);
      this.doors.set(d.id, d);
    }
    return this;
  }

  get(id) {
    return this.doors.get(id);
  }

  update(dt) {
    for (const d of this.doors.values()) d.update(dt);
  }

  /** Nearest door whose leaf is within `range` of a point. */
  nearest(pos, range = 2.0) {
    let best = null;
    let bestD = range;
    for (const d of this.doors.values()) {
      const dist = Math.hypot(d.spec.x - pos.x, d.spec.z - pos.z) + Math.abs(d.spec.y - pos.y) * 2;
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  reset() {
    for (const d of this.doors.values()) d.reset();
  }

  toJSON(playerPos, maxDistance = 6) {
    const out = [];
    for (const d of this.doors.values()) {
      const dist = Math.hypot(d.spec.x - playerPos.x, d.spec.z - playerPos.z);
      if (dist <= maxDistance) out.push(d.toJSON(playerPos));
    }
    return out.sort((a, b) => a.distance - b.distance);
  }
}
