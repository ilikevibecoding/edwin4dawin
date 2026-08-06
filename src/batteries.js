// Three fictionalized interceptor batteries: PAC-X (Patriot-inspired),
// HALO-9 (THAAD-inspired), SENTINEL (invented long-range test system).
// All stats are invented and tuned for gameplay, not realism.
import * as THREE from 'three';
import { Kit, instanced, cableCurve } from './kit.js';
import { BoxCollider, solveIntercept, THREAT_GRAVITY } from './physics.js';
import { blowoutCoverTexture, heatTexture, stencilTexture, hazardStripesTexture, metalPanelTexture, scorchTexture } from './texgen.js';

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
    // lamp housing: back channel, per-lamp housing boxes, rain hood, bracket
    kit.box(this.mats.dark, 0.07, 0.68, 0.2, x - 0.11, h + 0.09, z);
    for (let i = 0; i < 3; i++) {
      kit.box(this.mats.dark, 0.17, 0.135, 0.2, x - 0.035, h + 0.24 - i * 0.15, z);
    }
    kit.box(this.mats.dark, 0.24, 0.05, 0.24, x - 0.03, h + 0.39, z);
    kit.box(this.mats.dark, 0.14, 0.1, 0.16, x, h - 0.16, z);
    // conduit drop + junction stub at the mast base
    kit.cyl(this.mats.rubber, 0.022, 0.022, h - 0.3, 5, x + 0.06, (h - 0.3) / 2 + 0.1, z + 0.03);
    kit.box(this.mats.dark, 0.16, 0.2, 0.12, x + 0.02, 0.24, z + 0.05);
    const lamps = [this.lampMats.green, this.lampMats.amber, this.lampMats.red];
    lamps.forEach((m, i) => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8), m);
      lamp.position.set(x + 0.04, h + 0.24 - i * 0.15, z);
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
    // aviation obstruction beacon (sentinel gantry): slow red pulse
    if (this.beaconMat) {
      this.beaconMat.emissiveIntensity = Math.sin(performance.now() * 0.0028) > 0.25 ? 2.6 : 0.2;
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

// muted hazard chevron band (repeating v-stripes) for canister front caps
let _chevTex = null;
function chevronBandTexture() {
  if (_chevTex) return _chevTex;
  const W = 256, H = 64;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#33342d'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#8a7c42'; g.lineWidth = 13; g.lineJoin = 'miter';
  const s = 42;
  for (let x = -s; x < W + s; x += s) {
    g.beginPath();
    g.moveTo(x - s / 2, 6); g.lineTo(x, H - 10); g.lineTo(x + s / 2, 6);
    g.stroke();
  }
  // grime
  let seed = 31;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(24,22,16,${0.08 + rnd() * 0.2})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 2);
  }
  _chevTex = new THREE.CanvasTexture(c);
  _chevTex.colorSpace = THREE.SRGBColorSpace;
  return _chevTex;
}

// square blowout cover with cell number, for PAC-X canister faces
const _pacCoverTexs = new Map();
function pacCoverTexture(n) {
  if (_pacCoverTexs.has(n)) return _pacCoverTexs.get(n);
  const S = 128;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#57614f'; g.fillRect(0, 0, S, S);
  // pressed rim
  g.strokeStyle = 'rgba(22,26,18,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, S - 6, S - 6);
  g.strokeStyle = 'rgba(190,196,178,0.16)'; g.lineWidth = 2; g.strokeRect(8, 8, S - 16, S - 16);
  // circular blowout seam + X seams
  g.strokeStyle = '#39412f'; g.lineWidth = 3.4;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.4, 0, 7); g.stroke();
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(S * 0.17, S * 0.17); g.lineTo(S * 0.83, S * 0.83);
  g.moveTo(S * 0.83, S * 0.17); g.lineTo(S * 0.17, S * 0.83);
  g.stroke();
  g.fillStyle = '#39412f';
  g.beginPath(); g.arc(S / 2, S / 2, 5, 0, 7); g.fill();
  // corner bolt dots
  g.fillStyle = 'rgba(25,28,22,0.9)';
  for (const bx of [14, S - 14]) for (const by of [14, S - 14]) {
    g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill();
  }
  // stencilled cell number
  g.fillStyle = '#cfd4c0';
  g.font = 'bold 24px "Courier New", monospace';
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText(String(n), 12, 20);
  // wear
  let seed = 7 + n * 13;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(20,20,14,${0.06 + rnd() * 0.16})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _pacCoverTexs.set(n, t);
  return t;
}

// round tube end cap with big stencilled number, for HALO-9 launch tubes
const _haloCapTexs = new Map();
function haloCapTexture(n) {
  if (_haloCapTexs.has(n)) return _haloCapTexs.get(n);
  const S = 128;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#454e3c'; g.fillRect(0, 0, S, S);
  // outer clamp ring + inner seam ring
  g.strokeStyle = '#2c332a'; g.lineWidth = 8;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(210,214,196,0.14)'; g.lineWidth = 2;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, 7); g.stroke();
  // ring bolts
  g.fillStyle = 'rgba(24,27,21,0.95)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    g.beginPath(); g.arc(S / 2 + Math.cos(a) * S * 0.44, S / 2 + Math.sin(a) * S * 0.44, 4, 0, 7); g.fill();
  }
  // big stencilled number
  g.fillStyle = '#dde1cf';
  g.font = 'bold 58px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), S / 2, S / 2 + 2);
  // wear specks
  let seed = 91 + n * 29;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(18,20,14,${0.08 + rnd() * 0.18})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _haloCapTexs.set(n, t);
  return t;
}

// vertical soot/heat gradient wrap (dark at v=1 / top of geometry) for muzzles
let _tubeHeatTex = null;
function tubeHeatTexture() {
  if (_tubeHeatTex) return _tubeHeatTex;
  const W = 64, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, 'rgba(14,11,9,0.88)');
  grad.addColorStop(0.3, 'rgba(52,36,26,0.55)');
  grad.addColorStop(0.62, 'rgba(66,60,92,0.26)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  let seed = 55;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(8,7,5,${0.12 + rnd() * 0.24})`;
    g.fillRect(rnd() * W, rnd() * H * 0.45, 1 + rnd() * 3, 2 + rnd() * 7);
  }
  _tubeHeatTex = new THREE.CanvasTexture(c);
  return _tubeHeatTex;
}

// small red-header warning placard plate
const _placardTexs = new Map();
function placardTexture(top, bottom) {
  const key = top + '|' + bottom;
  if (_placardTexs.has(key)) return _placardTexs.get(key);
  const W = 256, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#d6d2c2'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8f2f26'; g.fillRect(0, 0, W, 52);
  g.strokeStyle = '#2a2a24'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  g.fillStyle = '#efe9da';
  g.font = 'bold 34px "Arial Narrow", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(top, W / 2, 28);
  g.fillStyle = '#26261f';
  g.font = 'bold 19px "Arial Narrow", sans-serif';
  g.fillText(bottom, W / 2, 82);
  // corner screws + grime
  g.fillStyle = '#4a4c48';
  for (const px of [10, W - 10]) for (const py of [10, H - 10]) {
    g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill();
  }
  let seed = 17 + key.length * 7;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(40,36,26,${0.05 + rnd() * 0.12})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _placardTexs.set(key, t);
  return t;
}

// ---- hydraulic ram helpers ------------------------------------------------
// Static parts of a ram (outer barrel, gland collar, base block) merged into
// the surrounding kit; only the piston is a live mesh. Piston geometry is
// anchored at its base so Battery.update's `piston.scale.y = 1 + e * stretch`
// extends it out of the barrel instead of stretching about its centre.
function ramBarrel(kit, M, x, y, z, rx, outerLen, outerR) {
  const dy = Math.cos(rx), dz = Math.sin(rx);
  kit.cyl(M.steel, outerR, outerR * 1.12, outerLen, 10,
    x, y + dy * outerLen / 2, z + dz * outerLen / 2, rx, 0, 0);
  kit.cyl(M.dark, outerR * 1.24, outerR * 1.24, 0.09, 10,
    x, y + dy * (outerLen - 0.05), z + dz * (outerLen - 0.05), rx, 0, 0);
  kit.cyl(M.dark, outerR * 1.28, outerR * 1.4, 0.16, 10,
    x, y + dy * 0.08, z + dz * 0.08, rx, 0, 0);
}

function makePiston(parent, M, x, y, z, rx, len, r) {
  const geo = new THREE.CylinderGeometry(r, r, len, 8);
  geo.translate(0, len / 2 + 0.05, 0);
  const piston = new THREE.Mesh(geo, M.piston);
  piston.position.set(x, y, z);
  piston.rotation.x = rx;
  parent.add(piston);
  return piston;
}

// ---------------------------------------------------------------- PAC-X
// Towed trailer running along +z (hitch at -z), 2x2 canister pack elevating
// over the rear (+z) to ~39 deg. Muzzles fire along local +z as before.
function buildPatriot(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  M.chevron = new THREE.MeshStandardMaterial({ map: chevronBandTexture(), roughness: 0.85, metalness: 0.15 });
  const kit = new Kit();
  const g = bat.group;

  // ---- trailer chassis: twin rails, cross members, deck plate
  for (const rx2 of [-0.58, 0.58]) {
    kit.box(M.oliveDark, 0.24, 0.34, 7.6, rx2, 0.88, -0.25);
  }
  for (const cz of [-3.6, -2.2, -0.8, 0.6, 1.6, 3.2]) {
    kit.box(M.oliveDark, 2.15, 0.16, 0.14, 0, 0.88, cz);
  }
  kit.box(M.olive, 2.3, 0.1, 7.4, 0, 1.1, -0.3);            // deck plate
  kit.box(M.dark, 2.3, 0.03, 0.5, 0, 1.16, 1.3);            // anti-skid strip at pedestal
  // hitch A-frame + ring + parking jack
  kit.box(M.oliveDark, 0.16, 0.2, 1.6, -0.45, 0.84, -4.65, 0, 0.28, 0);
  kit.box(M.oliveDark, 0.16, 0.2, 1.6, 0.45, 0.84, -4.65, 0, -0.28, 0);
  kit.box(M.steel, 0.3, 0.14, 0.5, 0, 0.82, -5.35);
  kit.torus(M.steel, 0.13, 0.045, 6, 12, 0, 0.82, -5.62, Math.PI / 2, 0, 0);
  kit.cyl(M.steel, 0.05, 0.05, 0.6, 8, 0.35, 0.5, -4.6);
  kit.cyl(M.dark, 0.09, 0.11, 0.08, 8, 0.35, 0.18, -4.6);
  kit.cyl(M.steel, 0.02, 0.02, 0.26, 5, 0.48, 0.86, -4.6, 0, 0, Math.PI / 2);
  // rear twin axles + leaf spring blocks
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.4, 16);
  const wheels = [];
  for (const wz of [1.9, 2.9]) {
    kit.cyl(M.dark, 0.07, 0.07, 2.7, 8, 0, 0.52, wz, 0, 0, Math.PI / 2);
    for (const wx of [-1.32, 1.32]) {
      wheels.push({ x: wx, y: 0.52, z: wz, rz: Math.PI / 2 });
      kit.cyl(M.steel, 0.2, 0.2, 0.44, 10, wx, 0.52, wz, 0, 0, Math.PI / 2);
    }
  }
  for (const wx of [-0.85, 0.85]) kit.box(M.dark, 0.24, 0.22, 1.7, wx, 0.68, 2.4);
  g.add(instanced(wheelGeo, M.rubber, wheels));
  // mudguards over the tandem axles: top plate + sloped ends + flaps
  for (const fx of [-1.34, 1.34]) {
    kit.box(M.olive, 0.56, 0.06, 1.9, fx, 1.17, 2.4);
    kit.box(M.olive, 0.56, 0.06, 0.5, fx, 1.06, 1.32, 0.5, 0, 0);
    kit.box(M.olive, 0.56, 0.06, 0.5, fx, 1.06, 3.48, -0.5, 0, 0);
    kit.box(M.rubber, 0.5, 0.42, 0.03, fx, 0.72, 3.72);
  }
  // ---- 4 corner leveling jacks: housing + animated screw + ground pad
  const jackPos = [[-1.14, -3.45], [1.14, -3.45], [-0.98, 3.66], [0.98, 3.66]];
  for (const [jx, jz] of jackPos) {
    kit.box(M.oliveDark, 0.5, 0.16, 0.2, jx * 0.72, 0.95, jz);            // outboard arm
    kit.box(M.steel, 0.18, 0.62, 0.18, jx, 0.85, jz);                     // screw housing
    kit.cyl(M.dark, 0.11, 0.11, 0.1, 8, jx, 0.5, jz);                     // gland nut
    kit.cyl(M.steel, 0.016, 0.016, 0.3, 5, jx, 1.08, jz, 0, 0, Math.PI / 2); // crank
    kit.cyl(M.dark, 0.17, 0.21, 0.1, 8, jx, 0.1, jz);                     // foot
    kit.box(M.dark, 0.38, 0.04, 0.38, jx, 0.03, jz);
  }
  const jk = new Kit();
  const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8);
  shaftGeo.translate(0, -0.275, 0);
  for (const [jx, jz] of jackPos) jk.addGeo(shaftGeo, M.piston, jx, 0, jz);
  const jackGroup = jk.build({ name: 'pac-jacks' });
  jackGroup.position.y = 1.02;
  g.add(jackGroup);
  bat.hydraulics = [];
  bat.hydraulics.push({ piston: jackGroup.children[0], stretch: 0.68 });
  // ---- side toolboxes + stowage under the deck
  kit.box(M.olive, 0.42, 0.55, 1.6, 1.14, 0.66, -0.7);
  kit.box(M.dark, 0.03, 0.4, 1.44, 1.36, 0.64, -0.7);
  kit.box(M.tanPanel, 0.42, 0.5, 1.1, -1.14, 0.64, -1.1);
  kit.box(M.dark, 0.03, 0.36, 0.96, -1.36, 0.62, -1.1);
  for (const lz of [-1.25, -0.55, -0.15]) kit.box(M.dark, 0.05, 0.1, 0.12, 1.37, 0.48, lz - 0.05);
  kit.box(M.olive, 0.4, 0.4, 0.8, -1.13, 0.6, 0.35);
  // ---- generator / ECS cabinet on the deck front
  kit.box(M.olive, 1.9, 1.2, 1.5, 0, 1.76, -2.9);
  kit.box(M.oliveDark, 1.96, 0.1, 1.56, 0, 2.4, -2.9);
  for (const vx of [-0.55, 0.1]) {                       // louver panels
    kit.box(M.dark, 0.5, 0.72, 0.05, vx, 1.72, -2.13);
    for (let s = -2; s <= 2; s++) kit.box(M.galv, 0.46, 0.045, 0.03, vx, 1.72 + s * 0.15, -2.1);
  }
  kit.cyl(M.dark, 0.06, 0.06, 0.5, 6, 0.7, 2.6, -3.3);   // gen exhaust stub
  kit.cyl(M.dark, 0.045, 0.06, 0.14, 6, 0.7, 2.9, -3.24, 0.4, 0, 0);
  kit.box(M.dark, 0.5, 0.42, 0.16, 0.62, 1.6, -2.1);     // control panel
  kit.box(M.dark, 0.56, 0.5, 0.2, 0, 2.62, -2.9);        // AZ data antenna
  // ---- pivot pedestal (A-frame cheeks + trunnion) at z=+1.3
  for (const px2 of [-0.7, 0.7]) {
    kit.box(M.oliveDark, 0.16, 0.95, 0.75, px2, 1.6, 1.3);
    kit.box(M.oliveDark, 0.16, 0.2, 1.3, px2, 1.2, 1.05);
    kit.box(M.oliveDark, 0.14, 0.5, 0.16, px2, 1.35, 0.72, 0.5, 0, 0); // gusset
  }
  kit.cyl(M.steel, 0.1, 0.1, 1.62, 10, 0, 2.0, 1.3, 0, 0, Math.PI / 2); // trunnion
  kit.cyl(M.dark, 0.14, 0.14, 0.1, 8, -0.78, 2.0, 1.3, 0, 0, Math.PI / 2);
  kit.cyl(M.dark, 0.14, 0.14, 0.1, 8, 0.78, 2.0, 1.3, 0, 0, Math.PI / 2);
  // ---- junction box + cable bundle drooping from the pack pivot area
  // (kept forward of z=0 so the pack rear clears it when elevated)
  kit.box(M.dark, 0.4, 0.34, 0.26, 0.92, 1.32, -0.6);
  kit.box(M.dark, 0.3, 0.24, 0.2, -0.9, 1.28, -0.4);
  kit.cyl(M.rubber, 0.035, 0.035, 0.34, 5, 0.92, 1.02, -0.6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.68, 2.02, 1.12), new THREE.Vector3(0.92, 1.51, -0.52), 0.34), 12, 0.034, 6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.75, 1.96, 1.28), new THREE.Vector3(0.99, 1.51, -0.46), 0.42), 12, 0.03, 6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(-0.68, 1.98, 1.18), new THREE.Vector3(-0.9, 1.42, -0.32), 0.32), 12, 0.032, 6);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.92, 1.13, -0.68), new THREE.Vector3(0.3, 1.28, -2.35), 0.16), 12, 0.03, 6);
  kit.torus(M.rubber, 0.22, 0.03, 5, 12, -0.9, 1.4, 0.1, 0, 0.35, 0, Math.PI * 1.4);

  // ---- elevating launcher pack: 4 distinct canisters (2 cells each)
  const elev = new THREE.Group();
  elev.position.set(0, 2.0, 1.3);
  g.add(elev);
  bat.elevGroup = elev;
  bat.travelAngle = -0.02;
  bat.deployAngle = -0.68; // ~39 deg, Patriot-like

  const ek = new Kit();
  // tilt frame under the canisters
  for (const fx of [-0.62, 0.62]) ek.box(M.oliveDark, 0.2, 0.26, 4.6, fx, -0.2, 1.0);
  ek.box(M.oliveDark, 1.5, 0.24, 0.34, 0, -0.18, -1.15);
  ek.box(M.oliveDark, 1.5, 0.24, 0.34, 0, -0.18, 2.9);
  ek.box(M.oliveDark, 1.5, 0.2, 0.3, 0, -0.18, 0.6);
  // pivot lugs at the trunnion
  for (const fx of [-0.5, 0.5]) ek.box(M.steel, 0.12, 0.5, 0.6, fx, -0.15, 0.0);
  // ram clevis under the frame
  for (const fx of [-0.11, 0.11]) ek.box(M.steel, 0.06, 0.3, 0.42, fx, -0.4, 1.5);
  ek.cyl(M.steel, 0.05, 0.05, 0.36, 6, 0, -0.45, 1.5, 0, 0, Math.PI / 2);

  const canW = 1.0, canH = 1.0, canL = 5.0;
  const zC = 1.1;                       // canister centre (rear -1.4, face +3.6)
  const faceZ = zC + canL / 2;
  const openTex = blowoutCoverTexture(true);
  const heatTex = heatTexture();
  const canisterGeo = new THREE.BoxGeometry(canW - 0.05, canH - 0.05, canL);
  const canisters = [];
  const bolts = [];
  const heat = new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1.5 });
  let cell = 0;
  for (let cx = 0; cx < 2; cx++) {
    for (let cy = 0; cy < 2; cy++) {
      // visible gap of ~0.22 between the 4 canisters
      const px = (cx - 0.5) * (canW + 0.22);
      const py = cy * (canH + 0.22) + 0.62;
      canisters.push({ x: px, y: py, z: zC });
      // front + rear ring frames (slightly proud of the tube body)
      ek.box(M.oliveDark, canW + 0.1, canH + 0.1, 0.16, px, py, faceZ - 0.09);
      ek.box(M.oliveDark, canW + 0.1, canH + 0.1, 0.16, px, py, zC - canL / 2 + 0.1);
      // mid ribs
      for (const rz of [zC - 1.3, zC + 0.5]) ek.box(M.olive, canW + 0.05, canH + 0.05, 0.09, px, py, rz);
      // corner bolts on both ring frames
      for (const bz of [faceZ - 0.02, zC - canL / 2 + 0.1]) {
        for (const bxs of [-1, 1]) for (const bys of [-1, 1]) {
          bolts.push({ x: px + bxs * (canW / 2 + 0.028), y: py + bys * (canH / 2 + 0.028), z: bz, rx: Math.PI / 2 });
        }
      }
      // recessed front face plate + hazard chevron band across the top
      ek.box(M.oliveDark, canW - 0.04, canH - 0.04, 0.06, px, py, faceZ - 0.015);
      ek.box(M.chevron, canW - 0.06, 0.17, 0.05, px, py + 0.37, faceZ + 0.005);
      // rear closure + exhaust ring
      ek.box(M.dark, canW - 0.1, canH - 0.1, 0.06, px, py, zC - canL / 2 + 0.03);
      ek.torus(M.dark, 0.3, 0.03, 6, 12, px, py, zC - canL / 2 + 0.01, 0, 0, 0);
      // two square numbered blowout covers per canister face
      for (let c = 0; c < 2; c++) {
        cell++;
        const cellX = px + (c - 0.5) * 0.47;
        const cellY = py - 0.09;
        const coverMat = new THREE.MeshStandardMaterial({ map: pacCoverTexture(cell), roughness: 0.78 });
        const openMat = new THREE.MeshStandardMaterial({ map: openTex, roughness: 0.9 });
        const cover = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), coverMat);
        cover.position.set(cellX, cellY, faceZ + 0.018);
        elev.add(cover);
        bat.tubes.push({
          covered: true, coverMesh: cover, closedMat: coverMat, openMat,
          muzzleLocal: new THREE.Vector3(cellX, cellY, faceZ + 0.1),
          dirLocal: new THREE.Vector3(0, 0, 1),
          parent: elev,
        });
        // heat discoloration on the top surface behind each muzzle
        ek.plane(heat, 0.85, 0.4, cellX, py + canH / 2 + 0.006, faceZ - 0.55, -Math.PI / 2, 0, Math.PI / 2);
      }
      // heat wash down the outer flank of each canister
      if (cx === 0) ek.plane(heat, 0.85, 0.7, px - canW / 2 - 0.006, py, faceZ - 0.55, 0, -Math.PI / 2, Math.PI);
      else ek.plane(heat, 0.85, 0.7, px + canW / 2 + 0.006, py, faceZ - 0.55, 0, Math.PI / 2, 0);
    }
  }
  elev.add(instanced(canisterGeo, M.olive, canisters.map(c => ({ ...c }))));
  elev.add(instanced(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6), M.steel, bolts));
  // rear blast frame + lifting lugs
  ek.box(M.oliveDark, 2.35, 2.4, 0.12, 0, 1.23, zC - canL / 2 - 0.08);
  ek.box(M.steel, 0.1, 2.9, 0.1, -0.75, 1.23, zC - canL / 2 - 0.1, 0, 0, 0.42);
  ek.box(M.steel, 0.1, 2.9, 0.1, 0.75, 1.23, zC - canL / 2 - 0.1, 0, 0, -0.42);
  for (const lx of [-0.61, 0.61]) ek.torus(M.steel, 0.09, 0.028, 5, 10, lx, 2.42, zC - 0.4, 0, Math.PI / 2, 0, Math.PI);
  // umbilical plate on the left flank + pigtail toward the pivot
  ek.box(M.dark, 0.06, 0.34, 0.5, -1.14, 0.62, 0.1);
  ek.tube(M.rubber, cableCurve(new THREE.Vector3(-1.12, 0.5, -0.1), new THREE.Vector3(-0.68, 0.05, -0.9), 0.22), 10, 0.028, 5);
  elev.add(ek.build({ name: 'pac-frame' }));

  // stencils + serials on canister flanks
  addDecal(elev, stencilTexture('PAC-X', { size: 36 }), 1.4, 0.4, -1.16, 1.84, 1.1, -Math.PI / 2);
  addDecal(elev, stencilTexture('SN 0114-A8', { size: 20 }), 1.0, 0.26, -1.16, 0.42, 0.9, -Math.PI / 2);
  addDecal(elev, stencilTexture('NO STEP', { size: 24 }), 0.95, 0.24, 1.16, 0.42, 1.4, Math.PI / 2);
  addDecal(elev, stencilTexture('LOT 7 INERT TRNG', { size: 18 }), 1.15, 0.25, 1.16, 1.84, 1.0, Math.PI / 2);

  // ---- big erection ram: deck bracket -> pack clevis (visibly connected when up)
  const ramA = 1.1; // tilt toward +z
  for (const fx of [-0.12, 0.12]) kit.box(M.steel, 0.07, 0.3, 0.4, fx, 1.2, -0.15);
  kit.cyl(M.steel, 0.05, 0.05, 0.4, 6, 0, 1.26, -0.15, 0, 0, Math.PI / 2);
  ramBarrel(kit, M, 0, 1.22, -0.15, ramA, 1.55, 0.105);
  const pacPiston = makePiston(g, M, 0, 1.22, -0.15, ramA, 1.15, 0.06);
  bat.hydraulics.push({ piston: pacPiston, stretch: 1.5 });

  // status lamp mast at the front right deck corner + placard on the cabinet
  bat._statusLampStack(kit, 0.95, -3.8);
  addDecal(g, placardTexture('DANGER', 'STAND CLEAR WHEN ARMED'), 0.72, 0.36, -0.2, 1.32, -2.12);

  g.add(kit.build({ name: 'pac-body' }));

  // small engagement-radar trailer parked beside (kept in place)
  const rk = new Kit();
  rk.box(M.oliveDark, 2.6, 1.1, 1.9, 8.4, 1.15, 2.4, 0, 0.5, 0);
  rk.box(M.olive, 2.3, 1.8, 0.3, 8.4, 2.4, 2.4, -0.42, 0.5, 0);
  rk.box(M.dark, 1.9, 1.4, 0.06, 8.4, 2.42, 2.58, -0.42, 0.5, 0);
  rk.cyl(M.rubber, 0.4, 0.4, 0.3, 12, 7.4, 0.4, 3.1, Math.PI / 2, 0.5, 0);
  rk.cyl(M.rubber, 0.4, 0.4, 0.3, 12, 9.3, 0.4, 1.9, Math.PI / 2, 0.5, 0);
  rk.box(M.steel, 0.14, 0.7, 0.14, 7.55, 0.35, 1.55);
  rk.box(M.steel, 0.14, 0.7, 0.14, 9.2, 0.35, 3.4);
  rk.tube(M.rubber, cableCurve(new THREE.Vector3(7.2, 1.0, 2.0), new THREE.Vector3(1.6, 0.35, 0.6), 0.5), 14, 0.04, 6);
  g.add(rk.build({ name: 'pac-radar' }));

  bat.collider = new BoxCollider(bat.pos.x, bat.pos.z, 1.9, 5.1, bat.yaw, 2.6, 'patriot');
  bat.extraColliders = [new BoxCollider(
    bat.pos.x + Math.cos(-bat.yaw) * 8.4 - Math.sin(-bat.yaw) * 2.4,
    bat.pos.z + Math.sin(-bat.yaw) * 8.4 + Math.cos(-bat.yaw) * 2.4,
    1.6, 1.2, bat.yaw + 0.5, 3, 'pac-radar')];
}

// ---------------------------------------------------------------- HALO (THAAD-like)
// 8x8 truck running along +z (cab at +z), 2x4 tube rack pivoting at the rear
// and elevating to ~60 deg. Muzzles fire along local +z as before.
function buildThaad(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  M.heatWrap = new THREE.MeshBasicMaterial({
    map: tubeHeatTexture(), transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1.5, side: THREE.DoubleSide,
  });
  const kit = new Kit();
  const g = bat.group;

  // ---- chassis: twin rails + cross members + deck plate (deck ends at z=-3.4
  // so the elevated rack's blast end swings clear of it)
  for (const rx2 of [-0.6, 0.6]) kit.box(M.dark, 0.26, 0.36, 9.6, rx2, 0.95, 0);
  for (const cz of [-4.5, -3.4, -2.4, -0.9, 0.6, 1.9]) kit.box(M.dark, 2.3, 0.16, 0.16, 0, 0.95, cz);
  kit.box(M.tanPanel, 2.6, 0.16, 5.3, 0, 1.36, -0.8);
  kit.box(M.dark, 2.4, 0.04, 0.6, 0, 1.45, -2.9); // anti-skid at pedestal
  // ---- wheels: 4 axles, hubs, axle tubes
  const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.5, 16);
  const wheels = [];
  for (const wz of [3.6, 2.2, -1.7, -3.1]) {
    kit.cyl(M.dark, 0.08, 0.08, 2.8, 8, 0, 0.58, wz, 0, 0, Math.PI / 2);
    for (const wx of [-1.38, 1.38]) {
      wheels.push({ x: wx, y: 0.58, z: wz, rz: Math.PI / 2 });
      kit.cyl(M.steel, 0.22, 0.22, 0.54, 10, wx, 0.58, wz, 0, 0, Math.PI / 2);
    }
  }
  g.add(instanced(wheelGeo, M.rubber, wheels));
  // fenders + mudflaps over both axle pairs
  for (const [fz, flapZ] of [[2.9, 1.5], [-2.4, -3.8]]) {
    for (const fx of [-1.44, 1.44]) {
      kit.box(M.tanPanel, 0.6, 0.07, 2.7, fx, 1.33, fz);
      kit.box(M.tanPanel, 0.6, 0.07, 0.45, fx, 1.24, fz + 1.5, -0.45, 0, 0);
      kit.box(M.tanPanel, 0.6, 0.07, 0.45, fx, 1.24, fz - 1.5, 0.45, 0, 0);
      kit.box(M.rubber, 0.52, 0.42, 0.03, fx, 0.85, flapZ);
    }
  }
  // ---- cab (armored LVSR-style) at +z
  kit.box(M.tanPanel, 2.5, 1.5, 2.3, 0, 2.75, 3.75);            // cab body
  kit.box(M.tanPanel, 2.3, 0.6, 1.05, 0, 1.85, 5.22);           // hood
  kit.box(M.tanPanel, 2.56, 0.12, 2.4, 0, 3.56, 3.75);          // roof slab
  kit.box(M.tanPanel, 2.44, 0.13, 0.5, 0, 3.47, 4.94, 0.2, 0, 0); // brow visor
  // windshield inset: recessed dark frame + raked split glass + pillars
  kit.box(M.dark, 2.34, 0.86, 0.1, 0, 3.02, 4.87);
  kit.plane(M.glass, 0.98, 0.62, -0.53, 3.03, 4.94, -0.1, 0, 0);
  kit.plane(M.glass, 0.98, 0.62, 0.53, 3.03, 4.94, -0.1, 0, 0);
  kit.box(M.tanPanel, 0.1, 0.86, 0.12, 0, 3.02, 4.9);
  kit.box(M.tanPanel, 0.16, 0.95, 0.18, -1.2, 3.05, 4.86, 0, 0, 0.05);
  kit.box(M.tanPanel, 0.16, 0.95, 0.18, 1.2, 3.05, 4.86, 0, 0, -0.05);
  // wipers
  kit.box(M.dark, 0.025, 0.4, 0.02, -0.62, 2.85, 4.97, 0, 0, 0.5);
  kit.box(M.dark, 0.025, 0.4, 0.02, 0.44, 2.85, 4.97, 0, 0, 0.5);
  // door seams, handles, windows, steps, grab rails (both sides)
  for (const s of [-1, 1]) {
    kit.box(M.dark, 0.03, 1.32, 0.03, s * 1.26, 2.62, 3.28);
    kit.box(M.dark, 0.03, 1.32, 0.03, s * 1.26, 2.62, 4.36);
    kit.box(M.dark, 0.03, 0.03, 1.1, s * 1.26, 3.28, 3.82);
    kit.box(M.dark, 0.05, 0.06, 0.22, s * 1.27, 2.62, 3.44);
    kit.box(M.glass, 0.05, 0.52, 0.82, s * 1.255, 3.08, 3.92);
    kit.box(M.dark, 0.06, 0.6, 0.06, s * 1.26, 2.6, 2.72); // rear cab pillar trim
    kit.box(M.galv, 0.42, 0.05, 0.38, s * 1.42, 1.06, 3.82);
    kit.box(M.galv, 0.42, 0.05, 0.38, s * 1.36, 0.62, 3.82);
    kit.box(M.dark, 0.05, 0.5, 0.04, s * 1.42, 0.84, 3.64);
    kit.cyl(M.steel, 0.02, 0.02, 0.85, 6, s * 1.28, 2.72, 4.52);
  }
  // side mirrors on forward arms
  for (const s of [-1, 1]) {
    kit.bar(M.galv, s * 1.15, 3.38, 4.8, s * 1.64, 3.34, 5.14, 0.022, 6);
    kit.bar(M.galv, s * 1.15, 2.95, 4.8, s * 1.64, 2.82, 5.14, 0.022, 6);
    kit.box(M.dark, 0.1, 0.52, 0.28, s * 1.66, 3.06, 5.12);
    kit.box(M.glass, 0.04, 0.42, 0.2, s * 1.66, 3.06, 4.97);
  }
  // front: bumper, winch, tow shackles, grille + slats, headlights, brush guard
  kit.box(M.dark, 2.75, 0.34, 0.3, 0, 1.22, 5.85);
  kit.box(M.steel, 0.7, 0.26, 0.24, 0, 1.5, 5.8);
  kit.box(M.steel, 0.12, 0.2, 0.12, -0.78, 1.06, 5.94);
  kit.box(M.steel, 0.12, 0.2, 0.12, 0.78, 1.06, 5.94);
  kit.box(M.dark, 1.5, 0.55, 0.08, 0, 1.9, 5.72);
  for (const gy of [1.74, 1.9, 2.06]) kit.box(M.galv, 1.38, 0.05, 0.04, 0, gy, 5.77);
  for (const s of [-1, 1]) {
    kit.box(M.dark, 0.36, 0.26, 0.06, s * 0.88, 1.9, 5.74);
    kit.box(M.white, 0.26, 0.16, 0.05, s * 0.88, 1.9, 5.78);
  }
  for (const bx of [-1.05, -0.55, 0.55, 1.05]) kit.cyl(M.galv, 0.028, 0.028, 1.0, 6, bx, 1.95, 5.95);
  kit.box(M.galv, 2.3, 0.05, 0.05, 0, 1.62, 5.95);
  kit.box(M.galv, 2.3, 0.05, 0.05, 0, 2.3, 5.95);
  // roof: marker lights, AC pack, hatch, antennas
  for (let i = -2; i <= 2; i++) kit.box(M.white, 0.09, 0.05, 0.05, i * 0.3, 3.64, 4.94);
  kit.box(M.oliveDark, 0.8, 0.2, 0.85, -0.55, 3.7, 3.3);
  kit.box(M.dark, 0.62, 0.07, 0.62, 0.5, 3.65, 3.3);
  kit.cyl(M.steel, 0.03, 0.04, 0.14, 6, -1.02, 3.68, 2.85);
  kit.cyl(M.dark, 0.012, 0.012, 1.3, 5, -1.02, 4.4, 2.85);
  kit.cyl(M.steel, 0.03, 0.04, 0.14, 6, 1.02, 3.68, 3.05);
  kit.cyl(M.dark, 0.012, 0.012, 1.05, 5, 1.02, 4.28, 3.05);
  // exhaust stack (left, behind cab) + heat shield + rain cap
  kit.cyl(M.dark, 0.085, 0.085, 2.5, 8, -1.34, 2.62, 2.42);
  kit.cyl(M.dark, 0.06, 0.085, 0.2, 8, -1.34, 3.96, 2.48, 0.5, 0, 0);
  kit.box(M.galv, 0.07, 1.9, 0.38, -1.52, 2.62, 2.42);
  kit.torus(M.steel, 0.1, 0.02, 5, 10, -1.34, 1.9, 2.42, Math.PI / 2, 0, 0);
  kit.torus(M.steel, 0.1, 0.02, 5, 10, -1.34, 3.2, 2.42, Math.PI / 2, 0, 0);
  // air intake snorkel (right, behind cab)
  kit.box(M.galv, 0.2, 1.6, 0.34, 1.32, 2.9, 2.6);
  kit.box(M.galv, 0.34, 0.42, 0.42, 1.32, 3.9, 2.6);
  for (let s2 = -1; s2 <= 1; s2++) kit.box(M.dark, 0.36, 0.05, 0.36, 1.32, 3.9 + s2 * 0.13, 2.62);
  // saddle fuel tank (right, between axles) + straps + fill cap + step
  kit.cyl(M.metal, 0.32, 0.32, 1.7, 14, 1.42, 0.85, 0.55, Math.PI / 2, 0, 0);
  kit.torus(M.steel, 0.33, 0.025, 6, 14, 1.42, 0.85, 0.15, 0, 0, 0);
  kit.torus(M.steel, 0.33, 0.025, 6, 14, 1.42, 0.85, 0.98, 0, 0, 0);
  kit.cyl(M.steel, 0.06, 0.06, 0.1, 8, 1.42, 1.2, 0.35);
  kit.box(M.galv, 0.5, 0.05, 1.1, 1.42, 1.24, 0.55);
  // battery/tool boxes (left) + air tanks
  kit.box(M.dark, 0.5, 0.6, 1.3, -1.4, 0.82, 0.5);
  kit.box(M.galv, 0.03, 0.44, 1.14, -1.66, 0.8, 0.5);
  kit.cyl(M.steel, 0.11, 0.11, 0.85, 10, -1.05, 0.5, -0.7, Math.PI / 2, 0, 0);
  kit.cyl(M.steel, 0.11, 0.11, 0.85, 10, -1.05, 0.78, -0.7, Math.PI / 2, 0, 0);
  // deck gear: equipment cabinet behind cab, cable drum, hydraulic manifold
  kit.box(M.olive, 2.2, 0.85, 1.1, 0, 1.88, 1.75);
  kit.box(M.dark, 0.6, 0.5, 0.06, -0.6, 1.85, 1.18);
  for (let s2 = -1; s2 <= 1; s2++) kit.box(M.galv, 0.54, 0.045, 0.03, -0.6, 1.85 + s2 * 0.15, 1.15);
  kit.box(M.dark, 0.5, 0.4, 0.14, 0.6, 1.85, 1.16);
  kit.cyl(M.dark, 0.42, 0.42, 0.34, 12, -0.85, 1.85, 0.55, 0, 0, Math.PI / 2);
  kit.torus(M.rubber, 0.36, 0.05, 5, 12, -0.85, 1.85, 0.55, 0, Math.PI / 2, 0);
  kit.box(M.steel, 0.1, 0.5, 0.4, -1.06, 1.6, 0.55);
  kit.box(M.dark, 0.55, 0.32, 0.7, 0.7, 1.6, -1.5);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.55, 1.72, -1.75), new THREE.Vector3(0.14, 1.5, -1.1), 0.14), 10, 0.03, 5);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.7, 1.72, -1.85), new THREE.Vector3(0.1, 1.42, -1.02), 0.2), 10, 0.028, 5);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(0.85, 1.68, -1.7), new THREE.Vector3(0.55, 1.9, 1.18), 0.24), 12, 0.028, 5);
  // rear bumper + taillights + outrigger stabilizers (extended)
  kit.box(M.oliveDark, 2.5, 0.24, 0.24, 0, 0.9, -4.86);
  for (const s of [-1, 1]) {
    kit.box(M.dark, 0.22, 0.16, 0.08, s * 0.95, 0.9, -4.99);
    kit.box(M.steel, 1.15, 0.2, 0.24, s * 1.32, 1.02, -3.95);
    kit.cyl(M.piston, 0.065, 0.065, 0.75, 6, s * 1.85, 0.55, -3.95);
    kit.cyl(M.dark, 0.2, 0.24, 0.1, 8, s * 1.85, 0.1, -3.95);
    kit.box(M.dark, 0.42, 0.04, 0.42, s * 1.85, 0.03, -3.95);
  }

  // ---- pivot pedestal at the rear (z=-3.2)
  for (const s of [-1, 1]) {
    kit.box(M.oliveDark, 0.22, 1.2, 0.95, s * 0.74, 1.72, -3.2);
    kit.box(M.oliveDark, 0.2, 0.16, 1.1, s * 0.74, 1.5, -2.62, 0.4, 0, 0);
  }
  kit.cyl(M.steel, 0.11, 0.11, 1.7, 10, 0, 2.2, -3.2, 0, 0, Math.PI / 2);
  kit.cyl(M.dark, 0.15, 0.15, 0.1, 8, -0.82, 2.2, -3.2, 0, 0, Math.PI / 2);
  kit.cyl(M.dark, 0.15, 0.15, 0.1, 8, 0.82, 2.2, -3.2, 0, 0, Math.PI / 2);

  // ---- elevating tube rack (2x4 round tubes, numbered caps)
  const elev = new THREE.Group();
  elev.position.set(0, 2.2, -3.2);
  g.add(elev);
  bat.elevGroup = elev;
  bat.travelAngle = 0.03;
  bat.deployAngle = -1.05; // ~60 deg, THAAD-like

  const ek = new Kit();
  // cradle rails + cross members + pivot lugs + ram clevis
  for (const s of [-0.52, 0.52]) ek.box(M.oliveDark, 0.18, 0.16, 6.3, s, 0.16, 2.0);
  for (const cz of [-0.9, 0.6, 4.2]) ek.box(M.oliveDark, 1.3, 0.2, 0.3, 0, 0.14, cz);
  for (const s of [-0.62, 0.62]) ek.box(M.steel, 0.16, 0.5, 0.62, s, 0, 0);
  for (const s of [-0.1, 0.1]) ek.box(M.steel, 0.06, 0.32, 0.44, s, -0.14, 2.2);
  ek.cyl(M.steel, 0.045, 0.045, 0.34, 6, 0, -0.16, 2.2, 0, 0, Math.PI / 2);
  const tubeGeo = new THREE.CylinderGeometry(0.3, 0.3, 6.2, 16);
  tubeGeo.rotateX(Math.PI / 2);
  const tubes = [];
  const capGeo = new THREE.CircleGeometry(0.285, 18);
  const zC = 2.0, muzZ = zC + 3.1;
  let tubeNo = 0;
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 4; cy++) {
    tubeNo++;
    const px = (cx - 0.5) * 0.75;
    const py = cy * 0.7 + 0.55;
    tubes.push({ x: px, y: py, z: zC });
    const capMat = new THREE.MeshStandardMaterial({ map: haloCapTexture(tubeNo), roughness: 0.8 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(px, py, muzZ + 0.012);
    elev.add(cap);
    if (bat.tubes.length < 6) {
      bat.tubes.push({
        covered: true, coverMesh: cap, closedMat: capMat, openMat: capMat,
        muzzleLocal: new THREE.Vector3(px, py, muzZ + 0.06),
        dirLocal: new THREE.Vector3(0, 0, 1),
        parent: elev,
      });
    }
    // muzzle lip + collar + muted hazard band + heat discoloration wrap
    ek.torus(M.oliveDark, 0.325, 0.035, 6, 14, px, py, muzZ - 0.04, 0, 0, 0);
    ek.torus(M.oliveDark, 0.32, 0.03, 6, 14, px, py, muzZ - 0.42, 0, 0, 0);
    ek.cyl(M.hazMuted, 0.315, 0.315, 0.2, 14, px, py, muzZ - 0.68, Math.PI / 2, 0, 0);
    ek.addGeo(new THREE.CylinderGeometry(0.318, 0.318, 0.62, 14, 1, true), M.heatWrap, px, py, muzZ - 0.75, Math.PI / 2, 0, 0);
    // rear closure + exhaust ring
    ek.cyl(M.dark, 0.29, 0.29, 0.05, 14, px, py, zC - 3.08, Math.PI / 2, 0, 0);
    ek.torus(M.dark, 0.3, 0.028, 5, 14, px, py, zC - 3.06, 0, 0, 0);
  }
  elev.add(instanced(tubeGeo, M.olive, tubes));
  // retaining ring frames at two stations + inter-tube webs + tie rods
  for (const fz of [4.2, -0.4]) {
    ek.box(M.steel, 1.74, 0.16, 0.3, 0, 3.03, fz);
    ek.box(M.steel, 1.74, 0.16, 0.3, 0, 0.17, fz);
    ek.box(M.steel, 0.16, 3.15, 0.3, -0.83, 1.6, fz);
    ek.box(M.steel, 0.16, 3.15, 0.3, 0.83, 1.6, fz);
    for (const wy of [0.9, 1.6, 2.3]) ek.box(M.steel, 1.45, 0.06, 0.26, 0, wy, fz);
    ek.box(M.steel, 0.06, 2.75, 0.26, 0, 1.6, fz);
  }
  for (const ty of [0.3, 2.9]) for (const tx of [-0.76, 0.76]) {
    ek.cyl(M.galv, 0.032, 0.032, 4.6, 6, tx, ty, 1.9, Math.PI / 2, 0, 0);
  }
  elev.add(ek.build({ name: 'halo-rack' }));

  addDecal(elev, stencilTexture('HALO-9', { size: 30 }), 1.6, 0.4, -0.93, 1.6, 1.9, -Math.PI / 2);
  addDecal(elev, stencilTexture('HL-9 BAT 2', { size: 24 }), 1.4, 0.34, 0.93, 1.6, 1.9, Math.PI / 2);
  addDecal(elev, stencilTexture('NO LIFT', { size: 26, fg: '#e8ecdf' }), 0.44, 0.15, -0.92, 2.6, 4.2, -Math.PI / 2);
  addDecal(elev, stencilTexture('NO LIFT', { size: 26, fg: '#e8ecdf' }), 0.44, 0.15, 0.92, 2.6, 4.2, Math.PI / 2);

  // ---- the big single elevation ram: chassis bracket -> rack clevis
  const ramA = -0.33;
  for (const s of [-0.13, 0.13]) kit.box(M.steel, 0.08, 0.34, 0.46, s, 1.32, -1.05);
  kit.cyl(M.steel, 0.055, 0.055, 0.44, 6, 0, 1.36, -1.05, 0, 0, Math.PI / 2);
  ramBarrel(kit, M, 0, 1.28, -1.05, ramA, 1.85, 0.155);
  const haloPiston = makePiston(g, M, 0, 1.28, -1.05, ramA, 1.2, 0.09);
  bat.hydraulics = [{ piston: haloPiston, stretch: 1.4 }];

  bat._statusLampStack(kit, 1.7, 1.0);
  addDecal(g, placardTexture('DANGER', 'STAND CLEAR — ELEVATING RACK'), 0.72, 0.36, 1.265, 2.4, 3.35, Math.PI / 2);
  g.add(kit.build({ name: 'halo-body' }));

  bat.collider = new BoxCollider(bat.pos.x, bat.pos.z, 2.0, 5.4, bat.yaw, 3, 'thaad');
  bat.extraColliders = [];
}

// ---------------------------------------------------------------- SENTINEL
// Fictional vertical-launch test rig: one large cylindrical launch canister
// (hinged dome cap, ring stiffeners, umbilical conduit) inside a 4-leg lattice
// gantry with X bracing, service platform ring, floods and aviation beacon.
// Both rounds launch from the twin-cell canister; the dome opens on round 1,
// each service arm swings clear as its round fires.
function buildSentinel(bat) {
  const M = bat.mats = commonMats();
  M.hazMuted = new THREE.MeshStandardMaterial({ map: mutedHazardTex(), roughness: 0.85, metalness: 0.15 });
  M.oliveCan = new THREE.MeshStandardMaterial({ map: metalPanelTexture('#4a5243', 57), roughness: 0.82, metalness: 0.3 });
  M.heatWrap = new THREE.MeshBasicMaterial({
    map: tubeHeatTexture(), transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1.5, side: THREE.DoubleSide,
  });
  const kit = new Kit();
  const g = bat.group;
  bat.perTubeAnim = true;

  // ---- blast pen walls (kept: colliders + context)
  const hzTex = hazardStripesTexture();
  const hzMat = new THREE.MeshStandardMaterial({ map: hzTex, roughness: 0.8 });
  kit.box(M.concrete, 14, 2.6, 1.2, 0, 1.3, -6.5);
  kit.box(M.concrete, 1.2, 2.6, 8, -6.5, 1.3, -2.2);
  kit.box(M.concrete, 1.2, 2.6, 8, 6.5, 1.3, -2.2);
  kit.box(hzMat, 14, 0.35, 1.24, 0, 2.75, -6.5);

  // ---- octagonal launch pad
  kit.cyl(M.concrete, 3.7, 3.85, 0.5, 8, 0, 0.25, 0);
  const padScorch = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: scorchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  padScorch.rotation.x = -Math.PI / 2;
  padScorch.position.set(0, 0.515, 0);
  g.add(padScorch);

  // ---- launch canister: cylinder + skirt + ring stiffeners + top collar
  kit.cyl(M.oliveCan, 1.35, 1.35, 9.2, 20, 0, 5.1, 0);
  kit.cyl(M.oliveDark, 1.55, 1.62, 0.7, 20, 0, 0.85, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    kit.box(M.steel, 0.16, 0.24, 0.16, Math.cos(a) * 1.62, 0.62, Math.sin(a) * 1.62, 0, -a, 0);
  }
  for (const ry2 of [2.2, 4.2, 6.2, 8.2]) kit.torus(M.oliveDark, 1.39, 0.05, 6, 24, 0, ry2, 0, Math.PI / 2, 0, 0);
  kit.cyl(M.oliveDark, 1.42, 1.42, 0.35, 20, 0, 9.5, 0);
  kit.box(M.hazMuted, 0.16, 0.26, 2.86, 0, 9.55, 0, 0, 0, 0); // rim tab marks
  kit.box(M.hazMuted, 2.86, 0.26, 0.16, 0, 9.55, 0, 0, 0, 0);
  // heat discoloration below the mouth + dark bore inside
  kit.addGeo(new THREE.CylinderGeometry(1.37, 1.37, 1.0, 20, 1, true), M.heatWrap, 0, 8.95, 0);
  kit.cyl(M.dark, 1.12, 1.12, 8.8, 16, 0, 5.0, 0);

  // ---- hinged dome cap (animated lid, hinge on -z rim)
  const lid = new THREE.Group();
  lid.position.set(0, 9.72, -1.36);
  const domeGeo = new THREE.SphereGeometry(1.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.scale(1, 0.55, 1);
  const dome = new THREE.Mesh(domeGeo, M.olive);
  dome.position.set(0, 0.1, 1.36);
  const lidRim = new THREE.Mesh(new THREE.CylinderGeometry(1.41, 1.41, 0.14, 20), M.oliveDark);
  lidRim.position.set(0, 0.03, 1.36);
  lid.add(dome, lidRim);
  lid.userData = { open: 0, targetOpen: 0 };
  g.add(lid);
  kit.box(M.steel, 0.34, 0.28, 0.42, -0.55, 9.58, -1.42);
  kit.box(M.steel, 0.34, 0.28, 0.42, 0.55, 9.58, -1.42);
  const lid2 = new THREE.Group(); // hidden pivot driving the second service arm
  lid2.userData = { open: 0, targetOpen: 0 };
  g.add(lid2);

  // ---- umbilical conduit mast running up the +x side
  kit.box(M.oliveDark, 0.42, 8.9, 0.36, 1.63, 4.95, 0);
  for (const pz of [-0.1, 0, 0.1]) kit.cyl(M.galv, 0.042, 0.042, 8.6, 6, 1.86, 4.8, pz);
  for (const jy of [1.9, 5.0, 7.6]) kit.box(M.dark, 0.3, 0.44, 0.44, 1.78, jy, 0);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(1.8, 9.15, -0.08), new THREE.Vector3(1.16, 9.42, -0.14), 0.16), 10, 0.035, 5);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(1.8, 9.15, 0.08), new THREE.Vector3(1.2, 9.4, 0.14), 0.2), 10, 0.035, 5);
  kit.tube(M.rubber, cableCurve(new THREE.Vector3(1.72, 0.75, 0.4), new THREE.Vector3(1.35, 0.62, 2.35), 0.12), 10, 0.04, 5);

  // ---- two service arms hinged on the mast; rotation.x=-PI/2 turns the
  // animated umbilical rotation.z into a horizontal swing away from the tube
  const mkArm = (ay) => {
    const umb = new THREE.Group();
    umb.position.set(1.95, ay, 0);
    umb.rotation.x = -Math.PI / 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.15), M.steel);
    arm.position.x = -0.33;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.32), M.dark);
    head.position.x = -0.62;
    umb.add(arm, head);
    g.add(umb);
    kit.box(M.steel, 0.16, 0.5, 0.22, 1.88, ay, 0);
    kit.cyl(M.dark, 0.055, 0.055, 0.56, 6, 1.95, ay, 0);
    return umb;
  };
  const armHigh = mkArm(6.6);
  const armLow = mkArm(4.3);

  // ---- tube records: both rounds from the twin-cell canister
  bat.tubes.push({
    covered: true, coverMesh: null, lid, umbilical: armHigh,
    muzzleLocal: new THREE.Vector3(0.42, 9.8, 0),
    dirLocal: new THREE.Vector3(0, 1, 0),
    parent: g,
  });
  bat.tubes.push({
    covered: true, coverMesh: null, lid: lid2, umbilical: armLow,
    muzzleLocal: new THREE.Vector3(-0.42, 9.8, 0),
    dirLocal: new THREE.Vector3(0, 1, 0),
    parent: g,
  });

  // ---- 4-leg lattice gantry with X cross-bracing
  const legs = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
  for (const [lx, lz] of legs) {
    kit.box(M.steel, 0.26, 10.7, 0.26, lx, 5.85, lz);
    kit.box(M.steel, 0.52, 0.12, 0.52, lx, 0.56, lz);          // base plate
    kit.box(M.hazMuted, 0.34, 1.0, 0.34, lx, 1.05, lz);        // warning stripes, lower 1m
  }
  const beltYs = [2.7, 5.0, 9.55, 11.2];
  for (const by of beltYs) {
    kit.box(M.steel, 5.0, 0.16, 0.16, 0, by, -2.5);
    kit.box(M.steel, 5.0, 0.16, 0.16, 0, by, 2.5);
    kit.box(M.steel, 0.16, 0.16, 5.0, -2.5, by, 0);
    kit.box(M.steel, 0.16, 0.16, 5.0, 2.5, by, 0);
  }
  // X braces (thin cylinders) on all 4 faces, 4 bays
  const bays = [[0.6, 2.7], [2.7, 5.0], [5.0, 7.3], [7.3, 9.55]];
  for (const [y0, y1] of bays) {
    for (const s of [-2.5, 2.5]) {
      kit.bar(M.galv, -2.5, y0, s, 2.5, y1, s, 0.045, 5);
      kit.bar(M.galv, -2.5, y1, s, 2.5, y0, s, 0.045, 5);
      kit.bar(M.galv, s, y0, -2.5, s, y1, 2.5, 0.045, 5);
      kit.bar(M.galv, s, y1, -2.5, s, y0, 2.5, 0.045, 5);
    }
  }
  // top frame cross beams
  kit.bar(M.steel, -2.5, 11.2, -2.5, 2.5, 11.2, 2.5, 0.06, 6);
  kit.bar(M.steel, -2.5, 11.2, 2.5, 2.5, 11.2, -2.5, 0.06, 6);

  // ---- service platform ring with handrails at 2/3 height
  kit.box(M.galv, 5.4, 0.08, 1.3, 0, 7.3, -2.05);
  kit.box(M.galv, 5.4, 0.08, 1.3, 0, 7.3, 2.05);
  kit.box(M.galv, 1.3, 0.08, 5.4, -2.05, 7.31, 0);
  kit.box(M.galv, 1.3, 0.08, 5.4, 2.05, 7.31, 0);
  for (const s of [-2.71, 2.71]) {
    kit.box(M.oliveDark, 5.46, 0.14, 0.03, 0, 7.4, s);
    kit.box(M.oliveDark, 0.03, 0.14, 5.46, s, 7.4, 0);
  }
  const postR = 0.022;
  for (const [hx, hz] of [[-2.68, -2.68], [0, -2.68], [2.68, -2.68], [-2.68, 2.68], [0, 2.68], [2.68, 2.68],
    [-2.68, 0], [2.68, 0], [-1.34, -2.68], [1.34, -2.68], [-1.34, 2.68], [1.34, 2.68]]) {
    kit.cyl(M.galv, postR, postR, 1.05, 5, hx, 7.86, hz);
  }
  for (const ry2 of [8.38, 8.02]) {
    kit.box(M.galv, 5.42, 0.045, 0.045, 0, ry2, -2.68);
    kit.box(M.galv, 5.42, 0.045, 0.045, 0, ry2, 2.68);
    kit.box(M.galv, 0.045, 0.045, 5.42, -2.68, ry2, 0);
    kit.box(M.galv, 0.045, 0.045, 5.42, 2.68, ry2, 0);
  }
  // access ladder up the -z face with cage hoops
  for (let ly = 0.7; ly < 7.25; ly += 0.41) kit.box(M.steel, 0.4, 0.03, 0.03, -1.7, ly, -2.62);
  kit.box(M.steel, 0.035, 6.9, 0.035, -1.9, 3.85, -2.62);
  kit.box(M.steel, 0.035, 6.9, 0.035, -1.5, 3.85, -2.62);
  for (const hy of [3.2, 4.1, 5.9, 6.8]) kit.torus(M.galv, 0.38, 0.018, 4, 12, -1.7, hy, -2.45, Math.PI / 2, 0, 0);

  // ---- floodlight heads on two top corners, aimed at the canister
  bat.gantryLamps = [];
  for (const [fx, fz] of [[-2.5, -2.5], [2.5, 2.5]]) {
    kit.box(M.steel, 0.12, 0.4, 0.12, fx, 11.4, fz);
    const lm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff0cc, emissiveIntensity: 0 });
    bat.gantryLamps.push(lm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.3), lm);
    lamp.position.set(fx * 0.94, 11.62, fz * 0.94);
    lamp.rotation.order = 'YXZ';
    lamp.rotation.y = Math.atan2(-fx, -fz);
    lamp.rotation.x = 0.6;
    g.add(lamp);
  }
  // blinking red aviation lamp on the remaining top corner
  kit.cyl(M.dark, 0.03, 0.03, 0.5, 6, -2.5, 11.5, 2.5);
  kit.cyl(M.dark, 0.075, 0.095, 0.1, 8, -2.5, 11.78, 2.5);
  bat.beaconMat = new THREE.MeshStandardMaterial({ color: 0x2a0605, emissive: 0xff2216, emissiveIntensity: 1.8, roughness: 0.4 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.24, 10), bat.beaconMat);
  beacon.position.set(-2.5, 11.94, 2.5);
  g.add(beacon);

  // ---- cable tray from the gantry base toward the pad edge + interface cabinet
  kit.box(M.galv, 0.55, 0.05, 1.5, 1.35, 0.58, 2.75);
  kit.box(M.galv, 0.55, 0.05, 0.75, 1.35, 0.38, 3.78, 0.5, 0, 0);
  kit.box(M.galv, 0.55, 0.05, 2.9, 1.35, 0.16, 5.55);
  for (const [ty, tz, tl] of [[0.61, 2.75, 1.5], [0.19, 5.55, 2.9]]) {
    kit.box(M.galv, 0.05, 0.12, tl, 1.1, ty, tz);
    kit.box(M.galv, 0.05, 0.12, tl, 1.6, ty, tz);
  }
  for (const cz of [2.3, 3.1, 4.6, 5.4, 6.2]) kit.box(M.galv, 0.55, 0.05, 0.06, 1.35, cz < 4 ? 0.63 : 0.21, cz);
  for (const [cxo, cr] of [[-0.14, 0.038], [0, 0.045], [0.14, 0.038]]) {
    kit.cyl(M.rubber, cr, cr, 2.8, 5, 1.35 + cxo, 0.24, 5.5, Math.PI / 2, 0, 0);
    kit.cyl(M.rubber, cr, cr, 1.4, 5, 1.35 + cxo, 0.65, 2.72, Math.PI / 2, 0, 0);
  }
  kit.box(M.dark, 0.9, 1.05, 0.45, 1.35, 0.62, 7.25);
  kit.box(M.dark, 1.0, 0.08, 0.55, 1.35, 0.06, 7.25);
  kit.cyl(M.rubber, 0.05, 0.05, 0.5, 5, 1.2, 0.2, 6.95, 0.5, 0, 0);

  bat._statusLampStack(kit, 5.8, 4.2, 2.4);

  // sign board on the platform edge + placards + stencils
  kit.box(M.oliveDark, 0.05, 0.55, 2.7, 2.74, 7.72, 0);
  addDecal(g, stencilTexture('SENTINEL LR-1', { size: 24, w: 320 }), 2.55, 0.48, 2.78, 7.72, 0, Math.PI / 2);
  addDecal(g, stencilTexture('TEST ARTICLE', { size: 22, w: 320 }), 2.2, 0.42, 2.8, 1.6, -5.87);
  addDecal(g, stencilTexture('LR-1', { size: 34 }), 0.7, 0.32, 1.87, 3.1, 0, Math.PI / 2);
  addDecal(g, placardTexture('DANGER', 'HIGH VOLTAGE UMBILICAL'), 0.62, 0.31, 1.81, 0.85, 7.24, Math.PI / 2);

  g.add(kit.build({ name: 'sentinel-body' }));

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
