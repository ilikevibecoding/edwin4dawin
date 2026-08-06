// Three fictionalized interceptor batteries: PAC-X (Patriot-inspired),
// HALO-9 (THAAD-inspired), SENTINEL (invented long-range test system).
// All stats are invented and tuned for gameplay, not realism.
import * as THREE from 'three';
import { Kit, instanced, cableCurve } from './kit.js';
import { BoxCollider, solveIntercept, THREAT_GRAVITY } from './physics.js';
import { blowoutCoverTexture, heatTexture, stencilTexture, hazardStripesTexture, metalPanelTexture } from './texgen.js';

export const BATTERY_DEFS = {
  patriot: {
    id: 'patriot', name: 'PAC-X VANGUARD', short: 'PAC-X',
    desc: 'Terminal-phase interceptor. Fast cycle, agile, short reach.',
    ammo: 8, cycleTime: 2.6, reloadTime: 24, launchDelay: 0.35,
    avgSpeed: 300, boostTime: 1.0, boostAccel: 320, maxTurnAccel: 300,
    killRadius: 15, pk: 0.88,
    minAlt: 220, maxAlt: 3400, maxRange: 5600,
    trailColor: 0xd8d2c4, plume: 'compact',
  },
  thaad: {
    id: 'thaad', name: 'HALO-9', short: 'HALO',
    desc: 'High-altitude interceptor. Slower cycle, broad window.',
    ammo: 6, cycleTime: 4.2, reloadTime: 32, launchDelay: 0.6,
    avgSpeed: 380, boostTime: 1.6, boostAccel: 300, maxTurnAccel: 210,
    killRadius: 18, pk: 0.86,
    minAlt: 1400, maxAlt: 8200, maxRange: 9000,
    trailColor: 0xe8e4da, plume: 'tall',
  },
  sentinel: {
    id: 'sentinel', name: 'SENTINEL LR-1', short: 'SNTL',
    desc: 'Experimental long-range test article. Two rounds. Maximum spectacle.',
    ammo: 2, cycleTime: 7, reloadTime: 0, launchDelay: 1.6,
    avgSpeed: 460, boostTime: 2.4, boostAccel: 260, maxTurnAccel: 170,
    killRadius: 24, pk: 0.82,
    minAlt: 2200, maxAlt: 14000, maxRange: 16000,
    trailColor: 0xf2ede2, plume: 'huge',
  },
};

const STATE = { TRAVEL: 'TRAVEL', DEPLOYING: 'DEPLOYING', READY: 'READY', CYCLING: 'CYCLING', RELOADING: 'RELOADING', EMPTY: 'EMPTY' };

class Battery {
  constructor(ctx, def, pos, yaw) {
    this.ctx = ctx;
    this.def = def;
    this.id = def.id;
    this.pos = pos.clone();
    this.yaw = yaw;
    this.state = STATE.TRAVEL;
    this.ammo = def.ammo;
    this.timer = 0;
    this.deployT = 0;      // 0 travel, 1 deployed
    this.assigned = null;  // track id
    this.tubes = [];       // { covered, coverMesh, openMat, closedMat, muzzleLocal(Vector3), dirLocal }
    this.nextTube = 0;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.group.rotation.y = yaw;
    ctx.scene.add(this.group);
    this.elevGroup = null;
    this.travelAngle = 0;
    this.deployAngle = 0;
    this.lampMats = {};
    this.perTubeAnim = null; // sentinel lids
  }

  _statusLampStack(kit, x, z, h = 1.9) {
    const mk = (color) => new THREE.MeshStandardMaterial({
      color: 0x101210, emissive: new THREE.Color(color), emissiveIntensity: 0.15, roughness: 0.5,
    });
    this.lampMats.green = mk(0x2ae56a);
    this.lampMats.amber = mk(0xffaa22);
    this.lampMats.red = mk(0xff2a20);
    kit.cyl(this.mats.dark, 0.04, 0.05, h, 6, x, h / 2, z);
    // lamp housing: back channel, rain hood, mounting bracket
    kit.box(this.mats.dark, 0.07, 0.68, 0.2, x - 0.11, h + 0.09, z);
    kit.box(this.mats.dark, 0.24, 0.05, 0.24, x - 0.03, h + 0.39, z);
    kit.box(this.mats.dark, 0.14, 0.1, 0.16, x, h - 0.16, z);
    const lamps = [this.lampMats.green, this.lampMats.amber, this.lampMats.red];
    lamps.forEach((m, i) => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8), m);
      lamp.position.set(x, h + 0.24 - i * 0.15, z);
      this.group.add(lamp);
    });
  }

  deploy() {
    if (this.state === STATE.TRAVEL) { this.state = STATE.DEPLOYING; }
  }

  resetScenario() {
    this.ammo = this.def.ammo;
    this.assigned = null;
    this.timer = 0;
    if (this.state !== STATE.TRAVEL && this.state !== STATE.DEPLOYING) this.state = STATE.READY;
    // reseal tubes
    for (const t of this.tubes) {
      t.covered = true;
      if (t.coverMesh) { t.coverMesh.material = t.closedMat; t.coverMesh.visible = true; }
      if (t.lid) t.lid.userData.targetOpen = 0;
    }
    this.nextTube = 0;
  }

  get ready() { return this.state === STATE.READY && this.ammo > 0; }

  // Can this battery plausibly engage the given track? (simplified game rule)
  // Assignment is allowed while DEPLOYING — only authorization requires READY.
  engagementCheck(track) {
    if (this.state === STATE.TRAVEL) return { ok: false, reason: 'BATTERY NOT DEPLOYED' };
    if (this.ammo <= 0) return { ok: false, reason: 'NO ROUNDS REMAINING' };
    if (this.state === STATE.RELOADING) return { ok: false, reason: 'RELOAD IN PROGRESS' };
    const tPos = track.est || track.pos;
    const tVel = track.vel;
    const sol = solveIntercept(this.pos, tPos, tVel, THREAT_GRAVITY, this.def.avgSpeed, this.def.launchDelay + 0.8);
    if (!sol) return { ok: false, reason: 'ENGAGEMENT WINDOW EXPIRED' };
    const alt = sol.point.y;
    const rng = Math.hypot(sol.point.x - this.pos.x, sol.point.z - this.pos.z);
    if (alt < this.def.minAlt) return { ok: false, reason: 'PREDICTED INTERCEPT TOO LOW', sol };
    if (alt > this.def.maxAlt) return { ok: false, reason: 'PREDICTED INTERCEPT TOO HIGH', sol };
    if (rng > this.def.maxRange) return { ok: false, reason: 'BEYOND MAX RANGE', sol };
    return { ok: true, sol };
  }

  // Fire one round. Returns launch spec or null.
  launch() {
    if (!this.ready) return null;
    const tube = this.tubes[this.nextTube % this.tubes.length];
    this.nextTube++;
    this.ammo--;
    this.state = this.ammo === 0
      ? (this.def.reloadTime > 0 ? STATE.RELOADING : STATE.EMPTY)
      : STATE.CYCLING;
    this.timer = this.ammo === 0 ? this.def.reloadTime : this.def.cycleTime;

    // world-space muzzle + direction
    const pos = tube.muzzleLocal.clone();
    (tube.parent || this.elevGroup || this.group).localToWorld(pos);
    const dir = tube.dirLocal.clone();
    const parent = tube.parent || this.elevGroup || this.group;
    parent.updateWorldMatrix(true, false);
    dir.transformDirection(parent.matrixWorld);

    // uncover
    tube.covered = false;
    if (tube.coverMesh) {
      if (this.def.id === 'patriot') tube.coverMesh.material = tube.openMat;
      else tube.coverMesh.visible = false;
    }
    if (tube.lid) tube.lid.userData.targetOpen = 1;

    return { pos, dir, def: this.def, tube, battery: this, delay: this.def.launchDelay };
  }

  update(dt) {
    // deploy animation
    if (this.state === STATE.DEPLOYING) {
      this.deployT = Math.min(1, this.deployT + dt / 3.2);
      if (this.deployT >= 1) this.state = STATE.READY;
    }
    const e = THREE.MathUtils.smoothstep(this.deployT, 0, 1);
    if (this.elevGroup) {
      this.elevGroup.rotation.x = this.travelAngle + (this.deployAngle - this.travelAngle) * e;
    }
    if (this.hydraulics) {
      for (const h of this.hydraulics) {
        // stretch piston with elevation
        h.piston.scale.y = 1 + e * h.stretch;
      }
    }
    // timers
    if (this.state === STATE.CYCLING || this.state === STATE.RELOADING) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === STATE.RELOADING) {
          this.ammo = this.def.ammo;
          for (const t of this.tubes) {
            t.covered = true;
            if (t.coverMesh) { t.coverMesh.material = t.closedMat; t.coverMesh.visible = true; }
          }
          this.nextTube = 0;
        }
        this.state = STATE.READY;
      }
    }
    // sentinel lids
    if (this.perTubeAnim) {
      for (const t of this.tubes) {
        if (!t.lid) continue;
        const target = t.lid.userData.targetOpen || 0;
        const cur = t.lid.userData.open || 0;
        const next = cur + Math.sign(target - cur) * dt / 1.3;
        t.lid.userData.open = THREE.MathUtils.clamp(next, 0, 1);
        t.lid.rotation.x = -THREE.MathUtils.smoothstep(t.lid.userData.open, 0, 1) * 2.0;
        if (t.umbilical) {
          t.umbilical.rotation.z = THREE.MathUtils.smoothstep(t.lid.userData.open, 0, 1) * -1.1;
        }
      }
    }
    // status lamps
    const blink = (Math.sin(performance.now() * 0.006) > 0) ? 1 : 0.1;
    const set = (g, a, r) => {
      this.lampMats.green.emissiveIntensity = g;
      this.lampMats.amber.emissiveIntensity = a;
      this.lampMats.red.emissiveIntensity = r;
    };
    switch (this.state) {
      case STATE.READY: set(2.6, 0.1, 0.1); break;
      case STATE.CYCLING: set(0.5, 2.6 * blink, 0.1); break;
      case STATE.RELOADING: set(0.1, 2.6 * blink, 0.6); break;
      case STATE.DEPLOYING: set(0.1, 2.6, 0.1); break;
      case STATE.EMPTY: set(0.1, 0.1, 2.8); break;
      default: set(0.4, 0.4, 0.4);
    }
  }

  status() {
    return {
      id: this.id, name: this.def.name, short: this.def.short,
      state: this.state, ammo: this.ammo, ammoMax: this.def.ammo,
      assigned: this.assigned, timer: Math.max(0, this.timer),
    };
  }
}

// =====================================================================
// visual builders
// =====================================================================

function commonMats() {
  return {
    olive: new THREE.MeshStandardMaterial({ map: metalPanelTexture('#5b6553', 7), roughness: 0.8, metalness: 0.3 }),
    oliveDark: new THREE.MeshStandardMaterial({ map: metalPanelTexture('#454e3e', 21), roughness: 0.82, metalness: 0.32 }),
    tanPanel: new THREE.MeshStandardMaterial({ map: metalPanelTexture('#847a5e', 43), roughness: 0.85, metalness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.9, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.96 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.45, metalness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6f7478, roughness: 0.55, metalness: 0.7 }),
    piston: new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.25, metalness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8d8d88, roughness: 0.95 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0e161e, roughness: 0.12, metalness: 0.9 }),
    galv: new THREE.MeshStandardMaterial({ color: 0xb9bec2, roughness: 0.55, metalness: 0.6 }),
  };
}

function addDecal(group, tex, w, h, x, y, z, ry = 0, rx = 0) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.position.set(x, y, z);
  m.rotation.y = ry; m.rotation.x = rx;
  group.add(m);
  return m;
}

// ---- local canvas textures (this file only) -------------------------------
let _hazMutedTex = null;
function mutedHazardTex() {
  if (!_hazMutedTex) _hazMutedTex = hazardStripesTexture('#8a7c42', '#33342d');
  return _hazMutedTex;
}

let _scorchStreakTex = null;
function scorchStreakTexture() {
  if (_scorchStreakTex) return _scorchStreakTex;
  const S = 256;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g2 = c.getContext('2d');
  g2.clearRect(0, 0, S, S);
  let seed = 77;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  // blast bloom hugging the wall base
  const bloom = g2.createRadialGradient(S / 2, S * 0.92, 10, S / 2, S * 0.92, S * 0.62);
  bloom.addColorStop(0, 'rgba(12,10,8,0.62)');
  bloom.addColorStop(1, 'rgba(12,10,8,0)');
  g2.fillStyle = bloom; g2.beginPath(); g2.arc(S / 2, S * 0.92, S * 0.62, 0, 7); g2.fill();
  // soot streaks licking upward
  for (let i = 0; i < 42; i++) {
    const x = S * 0.06 + rnd() * S * 0.88, w = 3 + rnd() * 12;
    const len = S * (0.3 + rnd() * 0.6), yb = S * (0.86 + rnd() * 0.14);
    const grad = g2.createLinearGradient(0, yb, 0, yb - len);
    grad.addColorStop(0, `rgba(14,12,9,${0.3 + rnd() * 0.4})`);
    grad.addColorStop(1, 'rgba(14,12,9,0)');
    g2.fillStyle = grad;
    g2.fillRect(x - w / 2, yb - len, w, len);
  }
  _scorchStreakTex = new THREE.CanvasTexture(c);
  _scorchStreakTex.colorSpace = THREE.SRGBColorSpace;
  return _scorchStreakTex;
}

// ---------------------------------------------------------------- PAC-X
function buildPatriot(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  const kit = new Kit();
  const g = bat.group;

  // trailer chassis
  kit.box(M.oliveDark, 8.4, 0.5, 2.5, 0, 1.0, 0);
  kit.box(M.dark, 8.0, 0.22, 1.0, 0, 0.72, 0);
  // rear twin axles
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 14);
  const wheels = [];
  for (const lx of [-2.9, -1.9]) for (const lz of [1.25, -1.25]) {
    wheels.push({ x: lx, y: 0.52, z: lz, rx: Math.PI / 2 });
  }
  const wheelMesh = instanced(wheelGeo, M.rubber, wheels);
  g.add(wheelMesh);
  // fenders
  kit.box(M.olive, 2.6, 0.1, 0.5, -2.4, 1.14, 1.25);
  kit.box(M.olive, 2.6, 0.1, 0.5, -2.4, 1.14, -1.25);
  // front landing legs + hitch
  kit.box(M.steel, 0.16, 0.9, 0.16, 3.4, 0.45, 0.8);
  kit.box(M.steel, 0.16, 0.9, 0.16, 3.4, 0.45, -0.8);
  kit.box(M.dark, 0.3, 0.12, 0.3, 3.4, 0.03, 0.8);
  kit.box(M.dark, 0.3, 0.12, 0.3, 3.4, 0.03, -0.8);
  kit.box(M.oliveDark, 1.2, 0.4, 1.2, 3.9, 1.0, 0);
  // outriggers (deployed) — chunky articulated feet
  for (const [lx, lz] of [[-3.6, 1.5], [-3.6, -1.5], [2.6, 1.5], [2.6, -1.5]]) {
    kit.box(M.steel, 0.9, 0.14, 0.2, lx + 0.45, 0.7, lz * 1.15, 0, 0, lz > 0 ? -0.5 : 0.5);
    kit.cyl(M.piston, 0.06, 0.06, 0.5, 6, lx + 0.85, 0.42, lz * 1.35);
    kit.cyl(M.steel, 0.09, 0.09, 0.28, 8, lx + 0.85, 0.24, lz * 1.35);
    kit.cyl(M.dark, 0.26, 0.3, 0.16, 8, lx + 0.85, 0.1, lz * 1.35);
    kit.box(M.dark, 0.56, 0.05, 0.56, lx + 0.85, 0.025, lz * 1.35);
  }
  // equipment boxes on trailer front
  kit.box(M.olive, 1.4, 0.9, 2.2, 2.6, 1.7, 0);
  kit.box(M.dark, 0.5, 0.5, 0.6, 1.7, 1.5, 0.8);
  // cable loops
  kit.torus(M.rubber, 0.3, 0.035, 5, 12, 2.0, 1.35, -1.2, 0, 0.4, 0, Math.PI * 1.3);
  // cable conduits: equipment bay -> launcher pivot, with junction boxes
  kit.cyl(M.rubber, 0.045, 0.045, 3.8, 6, 0.0, 1.31, 0.95, 0, 0, Math.PI / 2);
  kit.cyl(M.rubber, 0.045, 0.045, 3.8, 6, 0.15, 1.31, -0.95, 0, 0, Math.PI / 2);
  kit.box(M.dark, 0.34, 0.16, 0.28, 1.95, 1.31, 0.95);
  kit.box(M.dark, 0.34, 0.16, 0.28, -1.9, 1.31, 0.95);
  kit.box(M.dark, 0.34, 0.16, 0.28, -1.9, 1.31, -0.95);
  kit.cyl(M.rubber, 0.04, 0.04, 0.5, 6, -2.05, 1.5, 0.85, 0.5, 0, 0);
  kit.cyl(M.rubber, 0.04, 0.04, 0.5, 6, -2.05, 1.5, -0.85, -0.5, 0, 0);
  // rear blast deflector plate on the trailer edge behind the pack
  kit.box(M.steel, 2.5, 0.09, 1.2, -2.2, 1.7, -1.7, 0.8, 0, 0);
  kit.box(M.steel, 0.09, 0.55, 0.09, -3.3, 1.35, -1.4);
  kit.box(M.steel, 0.09, 0.55, 0.09, -1.1, 1.35, -1.4);

  // ---- elevating launcher frame (2x4 canisters)
  const elev = new THREE.Group();
  elev.position.set(-2.2, 1.45, 0);
  g.add(elev);
  bat.elevGroup = elev;
  bat.travelAngle = 0.04;
  bat.deployAngle = -0.94; // ~54 deg up

  const ek = new Kit();
  ek.box(M.oliveDark, 0.5, 0.6, 2.4, 1.9, 0.0, 0); // pivot beam
  const canW = 1.02, canH = 1.02, canL = 5.6;
  const faceZ = canL / 2 - 0.4;
  const closedTex = blowoutCoverTexture(false);
  const openTex = blowoutCoverTexture(true);
  const heatTex = heatTexture();
  const canisterGeo = new THREE.BoxGeometry(canW - 0.06, canH - 0.06, canL);
  const canisters = [];
  const bolts = [];
  const heat = new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1.5 });
  for (let cx = 0; cx < 2; cx++) {
    for (let cy = 0; cy < 2; cy++) {
      // each visual canister has 2 cells side by side -> 8 rounds total (2x2 packs of 2)
      const px = (cx - 0.5) * (canW + 0.1);
      const py = (cy) * (canH + 0.1) + 0.75;
      canisters.push({ x: px, y: py, z: -0.4 });
      // ribs
      for (const rz of [-2.6, -1.2, 0.4, 1.6]) {
        ek.box(M.olive, canW + 0.04, canH + 0.04, 0.1, px, py, rz + 0.8);
      }
      // muted hazard band wrapping the canister near the muzzle
      ek.box(M.hazMuted, canW + 0.02, canH + 0.02, 0.16, px, py, faceZ - 0.9);
      // framed square front face: perimeter frame + centre mullion
      const fz = faceZ + 0.035;
      ek.box(M.oliveDark, canW + 0.06, 0.08, 0.09, px, py + canH / 2 - 0.01, fz);
      ek.box(M.oliveDark, canW + 0.06, 0.08, 0.09, px, py - canH / 2 + 0.01, fz);
      ek.box(M.oliveDark, 0.08, canH + 0.06, 0.09, px - canW / 2 + 0.01, py, fz);
      ek.box(M.oliveDark, 0.08, canH + 0.06, 0.09, px + canW / 2 - 0.01, py, fz);
      ek.box(M.oliveDark, 0.07, canH + 0.06, 0.09, px, py, fz);
      // two square X-seam blowout covers per canister face
      for (let c = 0; c < 2; c++) {
        const cellX = px + (c - 0.5) * 0.49;
        const coverMat = new THREE.MeshStandardMaterial({ map: closedTex, roughness: 0.75 });
        const openMat = new THREE.MeshStandardMaterial({ map: openTex, roughness: 0.9 });
        const cover = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), coverMat);
        cover.position.set(cellX, py, faceZ + 0.012);
        elev.add(cover);
        bat.tubes.push({
          covered: true, coverMesh: cover, closedMat: coverMat, openMat,
          muzzleLocal: new THREE.Vector3(cellX, py, faceZ + 0.1),
          dirLocal: new THREE.Vector3(0, 0, 1),
          parent: elev,
        });
        // corner bolts around each cover frame
        for (const bxs of [-1, 1]) for (const bys of [-1, 1]) {
          bolts.push({ x: cellX + bxs * 0.185, y: py + bys * 0.185, z: faceZ + 0.03, rx: Math.PI / 2 });
        }
        // heat discoloration on the top surface behind each muzzle (enlarged)
        ek.plane(heat, 0.85, 0.4, cellX, py + canH / 2 + 0.005, faceZ - 0.42, -Math.PI / 2, 0, Math.PI / 2);
      }
      // heat wash down the outer flank of each pack
      if (cx === 0) ek.plane(heat, 0.85, 0.72, px - canW / 2 - 0.005, py, faceZ - 0.42, 0, -Math.PI / 2, Math.PI);
      else ek.plane(heat, 0.85, 0.72, px + canW / 2 + 0.005, py, faceZ - 0.42, 0, Math.PI / 2, 0);
    }
  }
  const canisterMesh = instanced(canisterGeo, M.olive, canisters.map(c => ({ ...c })));
  elev.add(canisterMesh);
  // cover corner bolts (single instanced mesh)
  elev.add(instanced(new THREE.CylinderGeometry(0.024, 0.024, 0.045, 6), M.steel, bolts));
  // rear blast frame
  ek.box(M.oliveDark, 2.4, 2.3, 0.14, 0, 1.3, -3.3);
  ek.box(M.steel, 0.14, 2.2, 0.4, -1.1, 1.3, -3.1);
  ek.box(M.steel, 0.14, 2.2, 0.4, 1.1, 1.3, -3.1);
  elev.add(ek.build({ name: 'pac-frame' }));

  // stencils + serials on canister flanks
  addDecal(elev, stencilTexture('PAC-X', { size: 36 }), 1.5, 0.42, -1.1, 1.87, 0.6, -Math.PI / 2);
  addDecal(elev, stencilTexture('SN 0114-A8', { size: 20 }), 1.1, 0.28, -1.1, 0.9, 0.4, -Math.PI / 2);
  addDecal(elev, stencilTexture('NO STEP', { size: 24 }), 1.0, 0.25, 1.1, 0.7, 0.2, Math.PI / 2);
  addDecal(elev, stencilTexture('LOT 7 INERT TRNG', { size: 18 }), 1.2, 0.26, 1.1, 1.87, 0.4, Math.PI / 2);

  // hydraulics trailer->frame
  bat.hydraulics = [];
  const hydro = new THREE.Group();
  const cylOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8), M.steel);
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), M.piston);
  piston.position.y = 0.9;
  hydro.add(cylOuter, piston);
  hydro.position.set(-0.6, 1.6, 0.9);
  hydro.rotation.z = 0.5; hydro.rotation.x = -0.5;
  g.add(hydro);
  const hydro2 = hydro.clone();
  hydro2.position.z = -0.9;
  g.add(hydro2);
  bat.hydraulics.push({ piston, stretch: 0.42 }, { piston: hydro2.children[1], stretch: 0.42 });

  // status lamp mast + AZ antenna
  bat._statusLampStack(kit, 4.6, 1.4);
  kit.box(M.dark, 0.5, 0.4, 0.14, 4.0, 2.1, 0);

  g.add(kit.build({ name: 'pac-body' }));

  // small engagement-radar trailer parked beside
  const rk = new Kit();
  rk.box(M.oliveDark, 2.6, 1.1, 1.9, 8.4, 1.15, 2.4, 0, 0.5, 0);
  rk.box(M.olive, 2.3, 1.8, 0.3, 8.4, 2.4, 2.4, -0.42, 0.5, 0);
  rk.cyl(M.rubber, 0.4, 0.4, 0.3, 12, 7.4, 0.4, 3.1, Math.PI / 2, 0.5, 0);
  rk.cyl(M.rubber, 0.4, 0.4, 0.3, 12, 9.3, 0.4, 1.9, Math.PI / 2, 0.5, 0);
  g.add(rk.build({ name: 'pac-radar' }));

  bat.collider = new BoxCollider(bat.pos.x, bat.pos.z, 4.6, 2.2, bat.yaw, 2.6, 'patriot');
  bat.extraColliders = [new BoxCollider(
    bat.pos.x + Math.cos(-bat.yaw) * 8.4 - Math.sin(-bat.yaw) * 2.4,
    bat.pos.z + Math.sin(-bat.yaw) * 8.4 + Math.cos(-bat.yaw) * 2.4,
    1.6, 1.2, bat.yaw + 0.5, 3, 'pac-radar')];
}

// ---------------------------------------------------------------- HALO (THAAD-like)
function buildThaad(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  const kit = new Kit();
  const g = bat.group;

  // long 8x8 truck
  kit.box(M.tanPanel, 9.6, 0.55, 2.6, 0, 1.15, 0);      // chassis deck
  kit.box(M.dark, 9.2, 0.3, 1.2, 0, 0.8, 0);
  // cab
  kit.box(M.tanPanel, 1.9, 1.7, 2.5, 4.6, 2.0, 0);
  kit.box(M.glass, 0.08, 0.62, 2.0, 5.42, 2.35, 0, 0, 0, -0.12);
  kit.box(M.glass, 0.72, 0.5, 0.05, 4.95, 2.42, 1.26);   // side door windows
  kit.box(M.glass, 0.72, 0.5, 0.05, 4.95, 2.42, -1.26);
  kit.box(M.dark, 0.06, 0.5, 0.06, 4.55, 2.42, 1.27);    // door pillars
  kit.box(M.dark, 0.06, 0.5, 0.06, 4.55, 2.42, -1.27);
  // wing mirrors
  for (const mz of [1, -1]) {
    kit.box(M.steel, 0.05, 0.05, 0.5, 5.4, 2.78, mz * 1.42);
    kit.box(M.dark, 0.08, 0.42, 0.24, 5.4, 2.52, mz * 1.66);
    kit.box(M.glass, 0.02, 0.34, 0.18, 5.45, 2.52, mz * 1.66);
  }
  // grille slats + headlights
  kit.box(M.dark, 0.1, 0.5, 1.7, 5.57, 1.62, 0);
  kit.box(M.metal, 0.05, 0.06, 1.6, 5.63, 1.5, 0);
  kit.box(M.metal, 0.05, 0.06, 1.6, 5.63, 1.65, 0);
  kit.box(M.metal, 0.05, 0.06, 1.6, 5.63, 1.8, 0);
  kit.box(M.white, 0.06, 0.15, 0.28, 5.63, 1.42, 0.95);
  kit.box(M.white, 0.06, 0.15, 0.28, 5.63, 1.42, -0.95);
  kit.box(M.dark, 0.3, 0.3, 2.6, 5.6, 1.0, 0);
  kit.box(M.metal, 0.3, 0.2, 2.7, 5.62, 0.75, 0);
  // wheels 4 axles
  const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.45, 14);
  const wheels = [];
  for (const lx of [3.9, 2.5, -1.9, -3.3]) for (const lz of [1.35, -1.35]) {
    wheels.push({ x: lx, y: 0.58, z: lz, rx: Math.PI / 2 });
  }
  g.add(instanced(wheelGeo, M.rubber, wheels));
  // fenders
  for (const lx of [3.2, -2.6]) {
    kit.box(M.tanPanel, 2.6, 0.1, 0.5, lx, 1.28, 1.4);
    kit.box(M.tanPanel, 2.6, 0.1, 0.5, lx, 1.28, -1.4);
  }
  // rear stabilizers
  for (const lz of [1.4, -1.4]) {
    kit.box(M.steel, 0.2, 0.2, 1.0, -4.4, 0.9, lz, 0, 0, 0);
    kit.cyl(M.piston, 0.07, 0.07, 0.8, 6, -4.7, 0.45, lz * 1.3);
    kit.cyl(M.dark, 0.24, 0.28, 0.1, 8, -4.7, 0.06, lz * 1.3);
  }
  // deck equipment
  kit.box(M.olive, 1.2, 0.8, 2.2, 3.0, 1.85, 0);
  kit.cyl(M.dark, 0.5, 0.5, 0.4, 10, 2.0, 1.6, -1.0, Math.PI / 2, 0, 0); // cable drum
  kit.torus(M.rubber, 0.42, 0.05, 5, 12, 2.0, 1.6, -1.0, Math.PI / 2, 0, 0);
  // saddle fuel tank between axles, strapped
  kit.cyl(M.metal, 0.3, 0.3, 1.5, 12, 0.5, 0.85, 1.42, 0, 0, Math.PI / 2);
  kit.torus(M.steel, 0.31, 0.025, 6, 14, 0.15, 0.85, 1.42, 0, Math.PI / 2, 0);
  kit.torus(M.steel, 0.31, 0.025, 6, 14, 0.85, 0.85, 1.42, 0, Math.PI / 2, 0);
  kit.box(M.steel, 1.3, 0.06, 0.24, 0.5, 1.18, 1.42);
  // exhaust stack behind cab with rain cap + heat shield
  kit.cyl(M.dark, 0.075, 0.075, 1.8, 8, 3.5, 2.15, -1.16);
  kit.cyl(M.dark, 0.05, 0.075, 0.2, 8, 3.5, 3.13, -1.16, 0, 0, 0.45);
  kit.box(M.galv, 0.26, 1.2, 0.05, 3.5, 2.0, -1.3);
  // dark hydraulic hoses: chassis manifold -> rack pivot
  kit.box(M.dark, 0.55, 0.28, 0.9, -1.6, 1.56, 0.35);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(-1.85, 1.6, 0.7), new THREE.Vector3(-3.15, 1.75, 0.45), 0.22), 10, 0.035, 6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(-1.85, 1.6, 0.35), new THREE.Vector3(-3.2, 1.7, 0.1), 0.26), 10, 0.035, 6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(-1.85, 1.55, 0.0), new THREE.Vector3(-3.1, 1.65, -0.3), 0.3), 10, 0.03, 6);

  // ---- elevating tube rack (2x4 round tubes)
  const elev = new THREE.Group();
  elev.position.set(-3.4, 1.6, 0);
  g.add(elev);
  bat.elevGroup = elev;
  bat.travelAngle = 0.03;
  bat.deployAngle = -1.22; // ~70 deg

  const ek = new Kit();
  ek.box(M.oliveDark, 1.2, 0.5, 2.5, 0.8, 0, 0); // cradle
  const tubeGeo = new THREE.CylinderGeometry(0.3, 0.3, 6.4, 14);
  tubeGeo.rotateX(Math.PI / 2);
  const tubes = [];
  const capGeo = new THREE.CircleGeometry(0.28, 16);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x3c4436, roughness: 0.8 });
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 4; cy++) {
    const px = (cx - 0.5) * 0.75;
    const py = cy * 0.72 + 0.7;
    tubes.push({ x: px, y: py, z: 0.6 });
    const cap = new THREE.Mesh(capGeo, capMat.clone());
    cap.position.set(px, py, 0.6 + 3.2 + 0.012);
    elev.add(cap);
    if (bat.tubes.length < 6) {
      bat.tubes.push({
        covered: true, coverMesh: cap, closedMat: cap.material, openMat: cap.material,
        muzzleLocal: new THREE.Vector3(px, py, 3.7),
        dirLocal: new THREE.Vector3(0, 0, 1),
        parent: elev,
      });
    }
    // collar rings + muzzle lip + muted hazard band near muzzle
    ek.torus(M.oliveDark, 0.32, 0.03, 6, 14, px, py, 2.9, 0, 0, 0);
    ek.torus(M.oliveDark, 0.32, 0.03, 6, 14, px, py, 0.7, 0, 0, 0);
    ek.torus(M.oliveDark, 0.32, 0.03, 6, 14, px, py, -1.6, 0, 0, 0);
    ek.torus(M.oliveDark, 0.33, 0.035, 6, 14, px, py, 3.62, 0, 0, 0);
    ek.cyl(M.hazMuted, 0.315, 0.315, 0.2, 14, px, py, 3.35, Math.PI / 2, 0, 0);
  }
  elev.add(instanced(tubeGeo, M.olive, tubes));
  // frame around tubes
  ek.box(M.steel, 1.9, 0.14, 0.14, 0, 0.32, 2.9);
  ek.box(M.steel, 1.9, 0.14, 0.14, 0, 3.24, 2.9);
  ek.box(M.steel, 0.14, 3.1, 0.14, -0.9, 1.75, 2.9);
  ek.box(M.steel, 0.14, 3.1, 0.14, 0.9, 1.75, 2.9);
  ek.box(M.steel, 1.9, 0.14, 0.14, 0, 0.32, -1.9);
  ek.box(M.steel, 1.9, 0.14, 0.14, 0, 3.24, -1.9);
  ek.box(M.steel, 0.14, 3.1, 0.14, -0.9, 1.75, -1.9);
  ek.box(M.steel, 0.14, 3.1, 0.14, 0.9, 1.75, -1.9);
  elev.add(ek.build({ name: 'halo-rack' }));

  addDecal(elev, stencilTexture('HALO-9', { size: 30 }), 1.6, 0.4, -1.0, 1.75, 0.5, -Math.PI / 2);
  addDecal(elev, stencilTexture('HL-9 BAT 2', { size: 24 }), 1.5, 0.36, 1.0, 1.75, 0.5, Math.PI / 2);
  addDecal(elev, stencilTexture('NO LIFT', { size: 26, fg: '#e8ecdf' }), 0.44, 0.15, -0.69, 2.86, 2.3, -Math.PI / 2);
  addDecal(elev, stencilTexture('NO LIFT', { size: 26, fg: '#e8ecdf' }), 0.44, 0.15, 0.69, 2.86, 2.3, Math.PI / 2);

  // big hydraulic
  bat.hydraulics = [];
  const hydro = new THREE.Group();
  hydro.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 8), M.steel));
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.0, 8), M.piston);
  piston.position.y = 1.3;
  hydro.add(piston);
  hydro.position.set(-1.4, 1.8, 0);
  hydro.rotation.z = 0.9;
  g.add(hydro);
  bat.hydraulics.push({ piston, stretch: 0.5 });

  bat._statusLampStack(kit, 5.4, 1.3);
  g.add(kit.build({ name: 'halo-body' }));

  bat.collider = new BoxCollider(bat.pos.x, bat.pos.z, 5.2, 2.0, bat.yaw, 3, 'thaad');
  bat.extraColliders = [];
}

// ---------------------------------------------------------------- SENTINEL
function buildSentinel(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  const kit = new Kit();
  const g = bat.group;
  bat.perTubeAnim = true;

  // blast pen walls
  const hzTex = hazardStripesTexture();
  const hzMat = new THREE.MeshStandardMaterial({ map: hzTex, roughness: 0.8 });
  kit.box(M.concrete, 14, 2.6, 1.2, 0, 1.3, -6.5);
  kit.box(M.concrete, 1.2, 2.6, 8, -6.5, 1.3, -2.2);
  kit.box(M.concrete, 1.2, 2.6, 8, 6.5, 1.3, -2.2);
  kit.box(hzMat, 14, 0.35, 1.24, 0, 2.75, -6.5);

  // two vertical silo boxes
  const heatTex = heatTexture();
  for (const sx of [-2.2, 2.2]) {
    const side = sx < 0 ? -1 : 1;
    kit.box(M.oliveDark, 2.5, 9.0, 2.5, sx, 4.5, 0);
    kit.box(M.steel, 2.7, 0.3, 2.7, sx, 0.35, 0);
    kit.box(M.steel, 2.7, 0.25, 2.7, sx, 8.9, 0);
    // muted hazard rim band around the silo mouth
    kit.box(M.hazMuted, 2.76, 0.26, 0.1, sx, 8.62, 1.28);
    kit.box(M.hazMuted, 2.76, 0.26, 0.1, sx, 8.62, -1.28);
    kit.box(M.hazMuted, 0.1, 0.26, 2.76, sx + 1.28, 8.62, 0);
    kit.box(M.hazMuted, 0.1, 0.26, 2.76, sx - 1.28, 8.62, 0);
    // vents with galvanised grille slats
    for (let vy = 1.5; vy < 8; vy += 1.6) {
      kit.box(M.dark, 0.5, 0.8, 0.06, sx - 0.7, vy, 1.28);
      kit.box(M.dark, 0.5, 0.8, 0.06, sx + 0.7, vy, 1.28);
      for (let s = -1; s <= 1; s++) {
        kit.box(M.galv, 0.54, 0.05, 0.03, sx - 0.7, vy + s * 0.26, 1.3);
        kit.box(M.galv, 0.54, 0.05, 0.03, sx + 0.7, vy + s * 0.26, 1.3);
      }
    }
    // external service pipes with flanges (rear face) + elbows into the head
    for (const pxo of [-0.55, 0.55]) {
      kit.cyl(M.galv, 0.07, 0.07, 8.2, 8, sx + pxo, 4.2, -1.38);
      for (const fy of [1.3, 3.9, 6.5]) kit.cyl(M.galv, 0.125, 0.125, 0.06, 8, sx + pxo, fy, -1.38);
      kit.cyl(M.galv, 0.07, 0.07, 0.4, 6, sx + pxo, 8.35, -1.1, Math.PI / 2, 0, 0);
    }
    // conduit boxes + drops on the outer face
    kit.box(M.dark, 0.16, 0.6, 0.45, sx + side * 1.3, 2.4, 0.2);
    kit.box(M.dark, 0.14, 0.4, 0.35, sx + side * 1.3, 5.2, 0.2);
    kit.cyl(M.galv, 0.04, 0.04, 2.2, 6, sx + side * 1.3, 3.8, 0.2);
    kit.cyl(M.galv, 0.04, 0.04, 2.1, 6, sx + side * 1.3, 1.05, 0.2);
    // tube inside (visible when lid open)
    kit.cyl(M.dark, 0.72, 0.72, 8.6, 16, sx, 4.4, 0);
    // heat streaks near mouth
    const hq = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.2),
      new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1.5 }),
    );
    hq.position.set(sx, 8.4, 1.26);
    g.add(hq);

    // hinged lid — thick slab, with hinge blocks flanking the pivot
    const lid = new THREE.Group();
    lid.position.set(sx, 9.06, -1.25);
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 2.4), M.olive);
    lidMesh.position.set(0, 0.16, 1.2);
    lidMesh.castShadow = true;
    lid.add(lidMesh);
    lid.userData = { open: 0, targetOpen: 0 };
    g.add(lid);
    kit.box(M.steel, 0.32, 0.26, 0.4, sx - 0.85, 8.9, -1.34);
    kit.box(M.steel, 0.32, 0.26, 0.4, sx + 0.85, 8.9, -1.34);

    // umbilical arm
    const umb = new THREE.Group();
    umb.position.set(sx + 1.35, 7.6, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.3), M.steel);
    arm.position.y = 0.8;
    const armHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), M.dark);
    armHead.position.y = 1.6;
    umb.add(arm, armHead);
    umb.rotation.z = 0; // rotates away on launch
    g.add(umb);

    bat.tubes.push({
      covered: true, coverMesh: null, lid, umbilical: umb,
      muzzleLocal: new THREE.Vector3(sx, 9.0, 0),
      dirLocal: new THREE.Vector3(0, 1, 0),
      parent: g,
    });
  }

  // gantry frame + platforms + ladder
  const gk = new Kit();
  for (const gx of [-4.2, 0, 4.2]) {
    gk.box(M.steel, 0.22, 10.4, 0.22, gx, 5.2, -1.8);
    gk.box(M.steel, 0.22, 10.4, 0.22, gx, 5.2, 1.8);
  }
  gk.box(M.steel, 8.8, 0.22, 0.22, 0, 10.3, -1.8);
  gk.box(M.steel, 8.8, 0.22, 0.22, 0, 10.3, 1.8);
  gk.box(M.steel, 0.22, 0.22, 3.8, -4.2, 10.3, 0);
  gk.box(M.steel, 0.22, 0.22, 3.8, 4.2, 10.3, 0);
  // service platform + rails
  gk.box(M.metal, 8.6, 0.1, 1.1, 0, 7.55, -2.4);
  for (let px = -4; px <= 4; px += 1) gk.cyl(M.galv, 0.025, 0.025, 0.9, 4, px, 8.05, -2.9);
  gk.box(M.steel, 8.6, 0.04, 0.04, 0, 8.5, -2.9);
  // ladder
  for (let ly = 0.4; ly < 7.4; ly += 0.38) gk.box(M.steel, 0.36, 0.035, 0.035, -4.6, ly, -2.4);
  gk.box(M.steel, 0.04, 7.4, 0.04, -4.8, 3.7, -2.4);
  gk.box(M.steel, 0.04, 7.4, 0.04, -4.4, 3.7, -2.4);
  // floods on gantry
  for (const gx of [-4.2, 4.2]) {
    const lm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff0cc, emissiveIntensity: 0 });
    bat.gantryLamps = bat.gantryLamps || [];
    bat.gantryLamps.push(lm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.18), lm);
    lamp.position.set(gx, 10.1, 0);
    lamp.rotation.x = 0.7;
    g.add(lamp);
  }
  // red obstruction beacon on the gantry corner
  gk.cyl(M.dark, 0.07, 0.09, 0.14, 8, -4.2, 10.47, 1.8);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x2a0605, emissive: 0xff2216, emissiveIntensity: 1.8, roughness: 0.4 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.24, 10), beaconMat);
  beacon.position.set(-4.2, 10.66, 1.8);
  g.add(beacon);
  g.add(gk.build({ name: 'sentinel-gantry' }));

  // cable trunks
  kit.box(M.dark, 0.5, 0.25, 6, -5.4, 0.13, 1.5);
  kit.box(M.dark, 0.5, 0.25, 6, 5.4, 0.13, 1.5);
  kit.cyl(M.rubber, 0.09, 0.09, 4.4, 6, -3.6, 0.2, 2.5, 0, 0, Math.PI / 2);
  kit.cyl(M.rubber, 0.09, 0.09, 4.4, 6, 3.6, 0.24, 2.5, 0, 0, Math.PI / 2);

  bat._statusLampStack(kit, 5.8, 4.2, 2.4);
  g.add(kit.build({ name: 'sentinel-body' }));

  addDecal(g, stencilTexture('SENTINEL LR-1', { size: 24, w: 320 }), 2.6, 0.5, -2.2, 5.2, 1.29);
  addDecal(g, stencilTexture('TEST ARTICLE', { size: 22, w: 320 }), 2.2, 0.42, 2.2, 4.4, 1.29);

  // scorch streaks up the blast-pen back wall
  const scorch = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.4),
    new THREE.MeshBasicMaterial({ map: scorchStreakTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  scorch.position.set(0.4, 1.35, -5.88);
  g.add(scorch);

  bat.travelAngle = 0; bat.deployAngle = 0; // vertical launch — nothing to elevate
  bat.deployT = 1;
  bat.collider = new BoxCollider(bat.pos.x, bat.pos.z, 5.2, 3.2, bat.yaw, 9, 'sentinel');
  bat.extraColliders = [
    new BoxCollider(bat.pos.x, bat.pos.z - 6.5 * Math.cos(bat.yaw), 7, 0.9, bat.yaw, 2.8, 'sent-wall'),
  ];
}

// =====================================================================
export class Batteries {
  constructor(ctx) {
    this.ctx = ctx;
    this.list = [];
    const defs = [
      { def: BATTERY_DEFS.patriot, pos: new THREE.Vector3(-58, 0.16, -40), yaw: 0.6, build: buildPatriot },
      { def: BATTERY_DEFS.thaad, pos: new THREE.Vector3(52, 0.16, 42), yaw: -2.2, build: buildThaad },
      { def: BATTERY_DEFS.sentinel, pos: new THREE.Vector3(-52, 0.16, 58), yaw: 0.45, build: buildSentinel },
    ];
    for (const d of defs) {
      const bat = new Battery(ctx, d.def, d.pos, d.yaw);
      d.build(bat);
      bat.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.list.push(bat);
      ctx.colliders.push(bat.collider, ...bat.extraColliders);
    }
  }

  get(id) { return this.list.find(b => b.id === id); }

  deployAll() { for (const b of this.list) b.deploy(); }

  resetAll() { for (const b of this.list) b.resetScenario(); }

  update(dt, nightFactor = 0) {
    for (const b of this.list) {
      b.update(dt);
      if (b.gantryLamps) for (const lm of b.gantryLamps) lm.emissiveIntensity = nightFactor * 3;
    }
  }
}
