import * as THREE from 'three';
import type { KsServices } from './KillstreakSystem';
import type { IActor } from '../core/Contracts';
import { KS, ensureKillstreakStyles } from './killstreaks.css';
import { TAU, clamp, DEG } from '../core/MathX';

/**
 * TargetingTablet.ts — the rugged tactical tablet the player raises to call the
 * strike, and the interaction the reviewer judges.
 *
 * Two coordinated presentations:
 *  1. A first-person **viewmodel** (procedural cased tablet with grab handles,
 *     buttons, an antenna and a slightly reflective screen) whose screen is a
 *     live `CanvasTexture` SATCOM map — the level footprint is derived from the
 *     real level geometry, with player/enemy blips, a scan sweep, a grid, a
 *     movable cursor and full CRT treatment.
 *  2. A **world-space** designator projected on the ground (target box + dashed
 *     run-in line for the chosen heading) so the strike feels integrated.
 *
 * Camera look drives the cursor; A/D (or the analog) swing the run heading; LMB
 * confirms, RMB/Escape aborts. A crisp DOM chrome layer frames it all.
 */

export type TabletAction = 'none' | 'confirm' | 'cancel';

const MAP = 480; // canvas resolution
const _wp = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _off = new THREE.Vector3();

export class TargetingTablet {
  open = false;

  readonly target = new THREE.Vector3();
  headingAngle = 0;
  private headingVec = new THREE.Vector3(0, 0, -1);
  private selected = 'AIRSTRIKE';

  private group: THREE.Group | null = null;
  private screenCanvas: HTMLCanvasElement | null = null;
  private screenCtx: CanvasRenderingContext2D | null = null;
  private screenTex: THREE.CanvasTexture | null = null;
  private ownGeo: THREE.BufferGeometry[] = [];
  private ownMat: THREE.Material[] = [];

  // Cached static footprint of the level (drawn once).
  private footprint: HTMLCanvasElement | null = null;
  private minX = -42;
  private maxX = 42;
  private minZ = -72;
  private maxZ = 74;
  private mapScale = 1;
  private mapOx = 0;
  private mapOz = 0;

  // World-space overlay.
  private overlay: THREE.Group | null = null;
  private cursorMesh: THREE.Group | null = null;

  // DOM chrome.
  private dom: HTMLDivElement | null = null;
  private domStatus: HTMLDivElement | null = null;
  private domReadout: HTMLDivElement | null = null;
  private domPrompt: HTMLDivElement | null = null;

  private sweep = 0;
  private flick = 0;
  private time = 0;

  constructor(private sv: KsServices) {}

  // -------------------------------------------------------------------------
  // Open / close
  // -------------------------------------------------------------------------

  raise(selected: string, initialTarget: THREE.Vector3, heading?: number) {
    if (this.open) return;
    this.open = true;
    this.selected = selected;
    this.target.copy(initialTarget);
    this.target.y = this.sv.groundAt(initialTarget.x, initialTarget.z);
    if (heading !== undefined) this.headingAngle = heading;

    this.computeMapping();
    this.buildViewmodel();
    this.buildOverlay();
    this.buildDom();
    if (this.group) this.group.visible = true;
    if (this.overlay) this.overlay.visible = true;
    if (this.dom) this.dom.classList.add(KS.show);

    // Lock the player camera but keep raw look/buttons flowing to the cursor.
    this.sv.player?.setInputEnabled(false);
    this.sv.ctx.input.enabled = true;
    if (this.sv.weapons) this.sv.weapons.setEnabled(false);
    this.buildFootprint();
  }

  lower() {
    if (!this.open) return;
    this.open = false;
    if (this.group) this.group.visible = false;
    if (this.overlay) this.overlay.visible = false;
    if (this.dom) this.dom.classList.remove(KS.show);
    this.sv.player?.setInputEnabled(true);
    if (this.sv.weapons) this.sv.weapons.setEnabled(true);
  }

  setSelected(name: string) {
    this.selected = name;
  }

  heading(): THREE.Vector3 {
    return this.headingVec.set(Math.sin(this.headingAngle), 0, -Math.cos(this.headingAngle));
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number, eta: number): TabletAction {
    if (!this.open) return 'none';
    this.time += dt;
    this.sweep = (this.sweep + dt * 1.1) % TAU;
    this.flick += dt;

    const input = this.sv.ctx.input;

    // Cursor: driven by raw look deltas over the tactical map.
    const [dx, dy] = input.consumeLook();
    const k = 0.03;
    this.target.x = clamp(this.target.x + dx * k, this.minX + 2, this.maxX - 2);
    this.target.z = clamp(this.target.z + dy * k, this.minZ + 2, this.maxZ - 2);
    this.target.y = this.sv.groundAt(this.target.x, this.target.z);

    // Heading: A/D swing the run-in; wheel is reserved for streak cycling.
    const swing = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    if (swing !== 0) this.headingAngle += swing * dt * 1.6;
    this.headingAngle = (this.headingAngle + TAU) % TAU;

    this.updateOverlay();
    this.drawScreen(eta);
    this.updateDom(eta);

    // Confirm / abort.
    if (input.pressed('fire')) return 'confirm';
    if (input.pressed('ads') || input.pressed('pause')) return 'cancel';
    return 'none';
  }

  /** Position the viewmodel relative to the (fresh) view camera. */
  positionViewmodel() {
    if (!this.group) return;
    const vc = this.sv.viewCamera;
    vc.updateMatrixWorld();
    _off.set(0.05, -0.16, -0.4);
    this.group.position.copy(_off).applyMatrix4(vc.matrixWorld);
    _q.setFromEuler(new THREE.Euler(0.62, 0.12, -0.04));
    this.group.quaternion.copy(vc.quaternion).multiply(_q);
    // Subtle idle sway.
    this.group.position.y += Math.sin(this.time * 1.6) * 0.004;
    this.group.rotateZ(Math.sin(this.time * 0.9) * 0.01);
  }

  // -------------------------------------------------------------------------
  // Viewmodel geometry
  // -------------------------------------------------------------------------

  private buildViewmodel() {
    if (this.group) return;
    const g = new THREE.Group();
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.ownGeo.push(x), x);
    const mat = <T extends THREE.Material>(x: T) => (this.ownMat.push(x), x);

    const shell = mat(new THREE.MeshStandardMaterial({ color: 0x1b2128, roughness: 0.72, metalness: 0.25 }));
    const rubber = mat(new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.9, metalness: 0.05 }));
    const trim = mat(new THREE.MeshStandardMaterial({ color: 0x39434c, roughness: 0.5, metalness: 0.6 }));
    const btn = mat(new THREE.MeshStandardMaterial({ color: 0x6a7075, roughness: 0.4, metalness: 0.7, emissive: 0x113322, emissiveIntensity: 0.6 }));

    const W = 0.32;
    const H = 0.22;

    // Case body (rugged, slightly beveled by stacking two boxes).
    const body = new THREE.Mesh(geo(new THREE.BoxGeometry(W, H, 0.03)), shell);
    g.add(body);
    const backPad = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.98, H * 0.98, 0.045)), rubber);
    backPad.position.z = -0.012;
    g.add(backPad);

    // Corner bumpers.
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const bump = new THREE.Mesh(geo(new THREE.BoxGeometry(0.05, 0.05, 0.05)), rubber);
        bump.position.set(sx * (W / 2 - 0.005), sy * (H / 2 - 0.005), 0.005);
        g.add(bump);
      }

    // Screen bezel + the live screen.
    const bezel = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.82, H * 0.8, 0.006)), rubber);
    bezel.position.z = 0.017;
    g.add(bezel);

    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = this.screenCanvas.height = MAP;
    this.screenCtx = this.screenCanvas.getContext('2d');
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = mat(new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));
    const screen = new THREE.Mesh(geo(new THREE.PlaneGeometry(W * 0.76, H * 0.72)), screenMat);
    screen.position.z = 0.021;
    g.add(screen);

    // Slightly reflective glass over the screen (faint additive glare).
    const glareMat = mat(
      new THREE.MeshBasicMaterial({
        color: 0x2a3a44,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const glare = new THREE.Mesh(geo(new THREE.PlaneGeometry(W * 0.76, H * 0.72)), glareMat);
    glare.position.z = 0.023;
    glare.rotation.z = 0.02;
    g.add(glare);

    // Grab handles (rounded bars, left + right).
    for (const sx of [-1, 1]) {
      const handle = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.014, H * 0.6, 4, 8)), rubber);
      handle.position.set(sx * (W / 2 + 0.012), 0, 0.006);
      g.add(handle);
    }

    // Buttons + a small speaker grille of dots along the bottom bezel.
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 10)), btn);
      b.rotation.x = Math.PI / 2;
      b.position.set(-W / 2 + 0.03 + i * 0.026, -H / 2 + 0.018, 0.02);
      g.add(b);
    }
    const dpad = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.03, 0.006)), trim);
    dpad.position.set(W / 2 - 0.03, -H / 2 + 0.02, 0.02);
    g.add(dpad);

    // Stubby antenna with a tip bead.
    const ant = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.004, 0.006, 0.11, 8)), trim);
    ant.position.set(W / 2 - 0.02, H / 2 + 0.05, 0);
    ant.rotation.z = -0.18;
    g.add(ant);
    const bead = new THREE.Mesh(geo(new THREE.SphereGeometry(0.008, 8, 8)), btn);
    bead.position.set(W / 2 - 0.03, H / 2 + 0.105, 0);
    g.add(bead);

    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.renderOrder = 10;
      }
    });
    g.visible = false;
    this.sv.viewScene.add(g);
    this.group = g;
  }

  // -------------------------------------------------------------------------
  // World-space overlay (ground designator + moving cursor)
  // -------------------------------------------------------------------------

  private buildOverlay() {
    if (this.overlay) return;
    const g = new THREE.Group();
    const mat = this.sv.mats.overlay;
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.ownGeo.push(x), x);

    // Target box (corner brackets).
    const arm = 1.5;
    const gap = 4.5;
    const seg = geo(new THREE.BoxGeometry(arm, 0.1, 0.1));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const a = new THREE.Mesh(seg, mat);
        a.position.set(sx * gap, 0.06, sz * (gap - arm / 2));
        g.add(a);
        const b = new THREE.Mesh(seg, mat);
        b.rotation.y = Math.PI / 2;
        b.position.set(sx * (gap - arm / 2), 0.06, sz * gap);
        g.add(b);
      }

    // Dashed run-in line (rebuilt orientation each frame via the group child).
    const line = new THREE.Group();
    line.name = 'runin';
    const dash = geo(new THREE.BoxGeometry(2.4, 0.06, 0.3));
    for (let i = 1; i <= 8; i++) {
      const d = new THREE.Mesh(dash, mat);
      d.position.set(-(gap + 1.5 + i * 3.6), 0.05, 0);
      line.add(d);
    }
    g.add(line);

    // Moving cursor reticle (a spinning diamond + dot).
    const cur = new THREE.Group();
    const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.7, 0.06, 6, 20)), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    cur.add(ring);
    const dot = new THREE.Mesh(geo(new THREE.BoxGeometry(0.18, 0.18, 0.18)), mat);
    dot.position.y = 0.1;
    cur.add(dot);
    g.add(cur);
    this.cursorMesh = cur;

    this.sv.scene.add(g);
    g.visible = false;
    this.overlay = g;
  }

  private updateOverlay() {
    if (!this.overlay) return;
    this.overlay.position.set(this.target.x, this.target.y + 0.05, this.target.z);
    const line = this.overlay.getObjectByName('runin');
    if (line) line.rotation.y = -this.headingAngle;
    if (this.cursorMesh) this.cursorMesh.rotation.y += 0.05;
    // Pulse the overlay opacity.
    const p = 0.6 + 0.4 * Math.sin(this.time * 5);
    (this.sv.mats.overlay as THREE.MeshBasicMaterial).opacity = 0.5 + p * 0.5;
  }

  // -------------------------------------------------------------------------
  // Level footprint (derived from real geometry, drawn once)
  // -------------------------------------------------------------------------

  private computeMapping() {
    const b = this.sv.level?.bounds;
    if (b) {
      this.minX = b.min.x;
      this.maxX = b.max.x;
      this.minZ = b.min.z;
      this.maxZ = b.max.z;
    }
    const rx = this.maxX - this.minX;
    const rz = this.maxZ - this.minZ;
    const pad = 24;
    this.mapScale = Math.min((MAP - pad) / rx, (MAP - pad) / rz);
    this.mapOx = (MAP - rx * this.mapScale) / 2;
    this.mapOz = (MAP - rz * this.mapScale) / 2;
  }

  private mapPx(x: number, z: number): [number, number] {
    return [this.mapOx + (x - this.minX) * this.mapScale, this.mapOz + (z - this.minZ) * this.mapScale];
  }

  private buildFootprint() {
    if (this.footprint) return;
    const fc = document.createElement('canvas');
    fc.width = fc.height = MAP;
    const g = fc.getContext('2d')!;
    g.clearRect(0, 0, MAP, MAP);

    const level = this.sv.level;
    if (level) {
      const mapArea = (this.maxX - this.minX) * (this.maxZ - this.minZ);
      const box = new THREE.Box3();
      const size = new THREE.Vector3();
      g.fillStyle = 'rgba(90,220,130,0.20)';
      g.strokeStyle = 'rgba(150,255,180,0.55)';
      g.lineWidth = 1;
      let drawn = 0;
      for (const obj of level.collidables) {
        if (drawn > 600) break;
        box.setFromObject(obj);
        if (box.isEmpty()) continue;
        box.getSize(size);
        // Keep wall/building-scale solids; skip the ground and tiny debris.
        if (size.y < 1.6) continue;
        const area = size.x * size.z;
        if (area > mapArea * 0.5 || area < 0.4) continue;
        const [x0, z0] = this.mapPx(box.min.x, box.min.z);
        const [x1, z1] = this.mapPx(box.max.x, box.max.z);
        g.fillRect(x0, z0, x1 - x0, z1 - z0);
        g.strokeRect(x0, z0, x1 - x0, z1 - z0);
        drawn++;
      }
    }
    this.footprint = fc;
  }

  // -------------------------------------------------------------------------
  // Screen render (CanvasTexture) — the SATCOM tactical map + CRT dressing
  // -------------------------------------------------------------------------

  private drawScreen(eta: number) {
    const g = this.screenCtx;
    if (!g || !this.screenTex) return;
    const S = MAP;

    // Phosphor background with vignette.
    g.fillStyle = '#03170a';
    g.fillRect(0, 0, S, S);
    const bg = g.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.62);
    bg.addColorStop(0, 'rgba(20,80,40,0.5)');
    bg.addColorStop(1, 'rgba(0,10,4,0.9)');
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);

    // Grid + coordinate ticks.
    g.strokeStyle = 'rgba(80,210,120,0.16)';
    g.lineWidth = 1;
    g.font = '10px monospace';
    g.fillStyle = 'rgba(120,240,150,0.4)';
    const cells = 8;
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * S;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, S);
      g.moveTo(0, p);
      g.lineTo(S, p);
      g.stroke();
      if (i < cells) {
        g.fillText(String.fromCharCode(65 + i), p + 3, 12);
        g.fillText(String(i + 1).padStart(2, '0'), 3, p + 14);
      }
    }

    // Static footprint.
    if (this.footprint) g.drawImage(this.footprint, 0, 0);

    // Scan sweep (rotating wedge + trailing fade).
    const cx = S / 2;
    const cy = S / 2;
    const R = S * 0.62;
    const sg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    sg.addColorStop(0, 'rgba(120,255,160,0.10)');
    sg.addColorStop(1, 'rgba(120,255,160,0)');
    g.save();
    g.translate(cx, cy);
    g.rotate(this.sweep);
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, R, -0.5, 0.02);
    g.closePath();
    g.fillStyle = sg;
    g.fill();
    g.strokeStyle = 'rgba(160,255,180,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(R, 0);
    g.stroke();
    g.restore();

    // Enemy blips.
    const hostiles = this.sv.ai?.hostiles() ?? [];
    for (const h of hostiles as IActor[]) {
      const [ex, ez] = this.mapPx(h.position.x, h.position.z);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6 + ex);
      g.fillStyle = `rgba(255,90,70,${0.55 + pulse * 0.4})`;
      g.beginPath();
      g.arc(ex, ez, 3.5, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,140,110,0.5)';
      g.beginPath();
      g.arc(ex, ez, 6 + pulse * 3, 0, TAU);
      g.stroke();
    }

    // Player marker (triangle facing yaw).
    const player = this.sv.player;
    if (player) {
      const [px, pz] = this.mapPx(player.position.x, player.position.z);
      g.save();
      g.translate(px, pz);
      g.rotate(player.yaw);
      g.fillStyle = 'rgba(150,255,180,0.95)';
      g.beginPath();
      g.moveTo(0, -8);
      g.lineTo(6, 7);
      g.lineTo(-6, 7);
      g.closePath();
      g.fill();
      g.restore();
    }

    // Target cursor + heading vector.
    const [tx, tz] = this.mapPx(this.target.x, this.target.z);
    g.strokeStyle = 'rgba(255,230,120,0.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(tx - 14, tz);
    g.lineTo(tx - 5, tz);
    g.moveTo(tx + 5, tz);
    g.lineTo(tx + 14, tz);
    g.moveTo(tx, tz - 14);
    g.lineTo(tx, tz - 5);
    g.moveTo(tx, tz + 5);
    g.lineTo(tx, tz + 14);
    g.stroke();
    g.strokeRect(tx - 9, tz - 9, 18, 18);
    // heading arrow
    const hx = Math.sin(this.headingAngle);
    const hz = -Math.cos(this.headingAngle);
    g.strokeStyle = 'rgba(255,180,80,0.9)';
    g.setLineDash([5, 4]);
    g.beginPath();
    g.moveTo(tx, tz);
    g.lineTo(tx + hx * 40, tz + hz * 40);
    g.stroke();
    g.setLineDash([]);

    // CRT: scanlines + flicker + chromatic header text.
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
    const flick = 0.05 + 0.05 * Math.sin(this.flick * 40);
    g.fillStyle = `rgba(120,255,150,${flick})`;
    g.fillRect(0, 0, S, S);

    // Header + footer HUD text.
    g.fillStyle = 'rgba(180,255,200,0.95)';
    g.font = 'bold 15px monospace';
    g.fillText('◤ SATCOM LINK ACTIVE', 12, 26);
    g.font = '12px monospace';
    g.fillStyle = 'rgba(150,255,170,0.85)';
    g.fillText(this.selected, 12, S - 40);
    g.fillText(`GRID ${this.gridRef(this.target.x, this.target.z)}   ETA ${eta.toFixed(1)}s`, 12, S - 22);
    g.fillStyle = 'rgba(255,220,120,0.95)';
    g.fillText('LMB CONFIRM   RMB ABORT   A/D HEADING', 12, S - 6);

    this.screenTex.needsUpdate = true;
  }

  private gridRef(x: number, z: number): string {
    const gx = clamp(Math.floor(((x - this.minX) / (this.maxX - this.minX)) * 8), 0, 7);
    const gz = clamp(Math.floor(((z - this.minZ) / (this.maxZ - this.minZ)) * 8), 0, 7);
    return `${String.fromCharCode(65 + gx)}${gz + 1}`;
  }

  // -------------------------------------------------------------------------
  // DOM chrome
  // -------------------------------------------------------------------------

  private buildDom() {
    if (this.dom || typeof document === 'undefined') return;
    ensureKillstreakStyles();
    const root = document.createElement('div');
    root.className = KS.root;
    const t = document.createElement('div');
    t.className = `${KS.targeting}`;
    t.innerHTML = `
      <div class="${KS.scan}"></div>
      <div class="${KS.brackets}"><i></i></div>
      <div class="${KS.status}"><span class="${KS.statusDot}"></span><span>SATCOM LINK ACTIVE</span></div>
      <div class="${KS.readout}"></div>
      <div class="${KS.prompt}"><kbd>LMB</kbd> DESIGNATE &nbsp; <span class="${KS.abort}"><kbd>RMB</kbd> ABORT</span></div>`;
    root.appendChild(t);
    document.body.appendChild(root);
    this.dom = root;
    this.domStatus = t.querySelector(`.${KS.status}`);
    this.domReadout = t.querySelector(`.${KS.readout}`);
    this.domPrompt = t.querySelector(`.${KS.prompt}`);
    // targeting layer needs the shown class to fade in
    requestAnimationFrame(() => t.classList.add(KS.show));
  }

  private updateDom(eta: number) {
    if (!this.domReadout) return;
    this.domReadout.innerHTML =
      `${this.selected}\n` +
      `GRID <b>${this.gridRef(this.target.x, this.target.z)}</b>\n` +
      `X <b>${this.target.x.toFixed(0)}</b>  Z <b>${this.target.z.toFixed(0)}</b>\n` +
      `HDG <b>${Math.round((this.headingAngle / DEG) % 360).toString().padStart(3, '0')}°</b>\n` +
      `ETA <b>${eta.toFixed(1)}s</b>`;
    if (this.domStatus) void this.domStatus;
    if (this.domPrompt) void this.domPrompt;
  }

  // -------------------------------------------------------------------------

  dispose() {
    if (this.group) this.sv.viewScene.remove(this.group);
    if (this.overlay) this.sv.scene.remove(this.overlay);
    for (const g of this.ownGeo) g.dispose();
    for (const m of this.ownMat) m.dispose();
    this.ownGeo.length = 0;
    this.ownMat.length = 0;
    this.screenTex?.dispose();
    if (this.dom) this.dom.remove();
    this.dom = null;
  }
}
