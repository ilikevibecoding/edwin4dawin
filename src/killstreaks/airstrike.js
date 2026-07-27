import * as THREE from 'three';
import { getMaterialLib } from '../world/textures.js';

/**
 * CAS-9 air strike: targeting tablet → marker smoke → 3-jet flyby →
 * bomb release → walking stick of heavy detonations across the target line.
 */

function buildJet() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x5a636b, roughness: 0.38, metalness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.4, metalness: 0.6 });

  // Fuselage
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 9.5, 12), body);
  fus.rotation.x = Math.PI / 2;
  g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 12), body);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -6;
  g.add(nose);
  // Canopy
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshStandardMaterial({ color: 0x161c22, roughness: 0.06, metalness: 0.9 }));
  can.scale.set(0.72, 0.55, 1.7);
  can.position.set(0, 0.5, -3.4);
  g.add(can);
  // Wings (swept)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(4.6, -2.6); wingShape.lineTo(4.6, -3.6); wingShape.lineTo(0, -2.4); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(wingGeo, body);
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = s;
    wing.position.set(s * 0.4, 0, 1.2);
    g.add(wing);
  }
  // Tail fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(1.4, -0.5); finShape.lineTo(1.4, -1.1); finShape.lineTo(0, -1.6); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: false });
  for (const s of [1, -1]) {
    const vfin = new THREE.Mesh(finGeo, dark);
    vfin.rotation.z = Math.PI / 2 - s * 0.35;
    vfin.rotation.x = 0;
    vfin.position.set(s * 0.5, 0.35, 3.6);
    vfin.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0);
    vfin.rotation.y = Math.PI / 2;
    g.add(vfin);
    const hfin = new THREE.Mesh(finGeo, body);
    hfin.rotation.x = Math.PI / 2;
    hfin.scale.x = s;
    hfin.position.set(s * 0.4, -0.05, 3.4);
    g.add(hfin);
  }
  // Engine nozzles + glow
  for (const s of [0.32, -0.32]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 10), dark);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(s, 0, 4.9);
    g.add(noz);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10), new THREE.MeshBasicMaterial({ color: 0xff8830, toneMapped: false }));
    glow.position.set(s, 0, 5.32);
    g.add(glow);
  }
  // Underwing ordnance
  for (const s of [1.6, -1.6, 2.8, -2.8]) {
    const bomb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8), dark);
    bomb.rotation.x = Math.PI / 2;
    bomb.position.set(s, -0.5, 1.1);
    g.add(bomb);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class AirstrikeSystem {
  constructor({ scene, fx, explosions, decals, audio, enemies, hud, getPlayerPos, onPlayerDamage, minimapShapes, halfSize }) {
    this.scene = scene;
    this.fx = fx;
    this.explosions = explosions;
    this.decals = decals;
    this.audio = audio;
    this.enemies = enemies;
    this.hud = hud;
    this.getPlayerPos = getPlayerPos;
    this.onPlayerDamage = onPlayerDamage;
    this.minimapShapes = minimapShapes;
    this.halfSize = halfSize;
    this.onKillsScored = null;

    this.state = 'idle';   // idle | targeting | inbound
    this.charges = 1;
    this.timeline = 0;
    this.target = new THREE.Vector3();
    this.jets = [];
    this.bombs = [];
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.trailAcc = 0;

    this.tablet = document.getElementById('tablet');
    this.tabletMap = document.getElementById('tablet-map');
    // Uniform px-per-metre on BOTH axes. The canvas is 858x586 but the world
    // is square: normalising z by canvas height stretched every N-S feature
    // ~46% too wide (the 'vertical road smear'). X spans the full map width;
    // Z shows a ±zHalf crop at the same scale.
    this.zHalf = this.halfSize * (this.tabletMap.height / this.tabletMap.width);
    this.coordEl = document.getElementById('tablet-coord');
    this.coordEl.textContent = this._gridRef(0, 0); // map center until the cursor moves
    // Targeting reticle is drawn INTO the map canvas each frame (crisp 1px
    // lines, brackets can key off enemy dot positions); it defaults to the
    // map centre so the tablet never shows a targeting UI with no reticle.
    // The old #tablet-reticle DOM overlay stays hidden.
    this.cursorPx = null;
    this.onClose = null;
    this._buildDeviceChrome();
    this._buildRoadMask();
    this._buildSatUnderlay();
    this._buildNoise();

    this.tabletMap.parentElement.addEventListener('mousemove', (e) => {
      if (this.state !== 'targeting') return;
      const rect = this.tabletMap.getBoundingClientRect();
      this.cursorPx = {
        x: ((e.clientX - rect.left) / rect.width) * this.tabletMap.width,
        y: ((e.clientY - rect.top) / rect.height) * this.tabletMap.height,
      };
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.zHalf * 2;
      this.coordEl.textContent = this._gridRef(wx, wz);
    });
    this.tabletMap.parentElement.addEventListener('mousedown', (e) => {
      if (this.state !== 'targeting' || e.button !== 0) return;
      const rect = this.tabletMap.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width - 0.5) * this.halfSize * 2;
      const wz = ((e.clientY - rect.top) / rect.height - 0.5) * this.zHalf * 2;
      this.confirmTarget(new THREE.Vector3(wx, 0, wz));
    });
  }

  get ready() { return this.charges > 0 && this.state === 'idle'; }

  /** Format world coords as a 4+4 grid reference, e.g. "GRID 0421 0863". */
  _gridRef(wx, wz) {
    const S = this.halfSize;
    const g = (v) => String(Math.max(0, Math.min(9999, Math.round(((v + S) / (2 * S)) * 9999)))).padStart(4, '0');
    return `GRID ${g(wx)} ${g(wz)}`;
  }

  /** Wrap the stock #tablet-frame markup in a physical device: the existing
   *  head/map/foot move into a #tablet-screen pane, and the frame gains a
   *  26px bezel with corner rubber bumpers bolted down by torx screws,
   *  recessed side buttons + a port cutout, an etched model label, and the
   *  operator's gloved left hand clamping the left bezel (all DOM/inline-SVG
   *  built here so index.html stays untouched; styling lives in styles.css). */
  _buildDeviceChrome() {
    const frame = document.getElementById('tablet-frame');
    if (!frame || document.getElementById('tablet-screen')) {
      this.stampEl = document.getElementById('tablet-stamp');
      return;
    }
    const screen = document.createElement('div');
    screen.id = 'tablet-screen';
    while (frame.firstChild) screen.appendChild(frame.firstChild);
    frame.appendChild(screen);
    // Rubber corner bumpers first (a block + two edge arms each), then the
    // torx screws that bolt them to the chassis on top.
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const b = document.createElement('div');
      b.className = `t-bumper t-bumper-${corner}`;
      frame.appendChild(b);
    }
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const s = document.createElement('div');
      s.className = `t-screw t-screw-${corner}`;
      frame.appendChild(s);
    }
    // Recessed side buttons + port cutout on the right edge (hand owns the left).
    for (const cls of ['t-btn t-btn-1', 't-btn t-btn-2', 't-port']) {
      const el = document.createElement('div');
      el.className = cls;
      frame.appendChild(el);
    }
    const etch = document.createElement('div');
    etch.className = 't-etch';
    etch.textContent = 'CAS-9';
    frame.appendChild(etch);
    frame.appendChild(this._buildHand());
    // 'STRIKE CONFIRMED' stamp overlay: lives over the map, shown ~0.6 s by
    // confirmTarget before the tablet drops.
    const stamp = document.createElement('div');
    stamp.id = 'tablet-stamp';
    stamp.innerHTML = '<div class="ts-box"><div class="ts-title">STRIKE CONFIRMED</div><div class="ts-grid">GRID 0000 0000</div></div>';
    (document.getElementById('tablet-map-wrap') ?? screen).appendChild(stamp);
    this.stampEl = stamp;
  }

  /** Operator's gloved LEFT hand + forearm clamping the left bezel, as one
   *  inline SVG glued to #tablet-frame (so it inherits the device tilt/sway):
   *  four fingertips wrap the back edge onto the front-left bezel, the thumb
   *  pad rests ON the bezel (clipped so it can never touch the glass, which
   *  starts at frame x=26 → svg x=706), knuckle/palm silhouette + cuff, and
   *  a coyote-tan sleeve exiting the viewport bottom-left. Baked contact
   *  shadows sit under the thumb and each fingertip. Frame x0 = svg x680. */
  _buildHand() {
    const hand = document.createElement('div');
    hand.id = 'tablet-hand';
    hand.innerHTML = `
<svg viewBox="0 0 720 940" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="th-glove" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9d8763"/><stop offset="0.55" stop-color="#82704e"/><stop offset="1" stop-color="#55462f"/>
    </linearGradient>
    <linearGradient id="th-fing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a38d67"/><stop offset="0.55" stop-color="#8a7650"/><stop offset="1" stop-color="#61503a"/>
    </linearGradient>
    <linearGradient id="th-thumb" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0" stop-color="#96805c"/><stop offset="0.6" stop-color="#84714d"/><stop offset="1" stop-color="#6a583e"/>
    </linearGradient>
    <linearGradient id="th-ao" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(16,11,6,0)"/><stop offset="1" stop-color="rgba(10,7,3,0.55)"/>
    </linearGradient>
    <linearGradient id="th-sleeve" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#5d5e4a"/><stop offset="0.5" stop-color="#43442f"/><stop offset="1" stop-color="#2b2c21"/>
    </linearGradient>
    <radialGradient id="th-knuck" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0" stop-color="rgba(228,208,170,0.2)"/><stop offset="1" stop-color="rgba(228,208,170,0)"/>
    </radialGradient>
    <filter id="th-b2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="th-b4" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="th-b7" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="7"/></filter>
    <clipPath id="th-clip"><rect x="0" y="0" width="705" height="940"/></clipPath>
  </defs>
  <g clip-path="url(#th-clip)">
    <path d="M548 620 C500 660 440 706 372 754 C296 806 196 850 96 902 L40 990 L420 990 C438 928 484 872 540 820 C592 772 640 718 664 668 C670 656 668 648 660 646 C622 640 582 630 548 620 Z" fill="url(#th-sleeve)"/>
    <path d="M470 720 C512 748 548 782 572 818" stroke="rgba(18,20,12,0.42)" stroke-width="7" fill="none" filter="url(#th-b2)"/>
    <path d="M380 786 C428 812 470 848 498 886" stroke="rgba(18,20,12,0.36)" stroke-width="8" fill="none" filter="url(#th-b2)"/>
    <path d="M282 850 C336 876 384 914 410 952" stroke="rgba(18,20,12,0.3)" stroke-width="9" fill="none" filter="url(#th-b2)"/>
    <path d="M508 696 C548 730 578 766 596 802" stroke="rgba(212,214,180,0.1)" stroke-width="4" fill="none" filter="url(#th-b2)"/>
    <path d="M330 812 C378 840 420 876 446 914" stroke="rgba(212,214,180,0.08)" stroke-width="5" fill="none" filter="url(#th-b2)"/>
    <path d="M642 136 C608 140 590 160 585 194 C578 238 579 290 587 338 C581 372 571 412 563 454 C555 500 557 550 575 594 C589 624 614 646 650 652 L680 654 L680 150 C670 140 656 135 642 136 Z" fill="url(#th-glove)"/>
    <rect x="656" y="146" width="24" height="508" fill="url(#th-ao)"/>
    <ellipse cx="612" cy="168" rx="17" ry="21" fill="url(#th-knuck)"/>
    <ellipse cx="607" cy="230" rx="18" ry="23" fill="url(#th-knuck)"/>
    <ellipse cx="609" cy="292" rx="17" ry="22" fill="url(#th-knuck)"/>
    <ellipse cx="616" cy="350" rx="14" ry="18" fill="url(#th-knuck)"/>
    <path d="M596 384 C604 432 600 490 588 538" stroke="rgba(58,46,30,0.35)" stroke-width="3" fill="none" filter="url(#th-b2)"/>
    <path d="M612 390 C618 436 614 488 604 532" stroke="rgba(58,46,30,0.25)" stroke-width="2.5" fill="none" filter="url(#th-b2)"/>
    <path d="M590 372 C598 428 594 498 580 556" stroke="rgba(206,184,142,0.4)" stroke-width="1.4" stroke-dasharray="4 3.5" fill="none"/>
    <path d="M574 556 C596 576 626 592 656 598" stroke="rgba(58,46,30,0.4)" stroke-width="2.5" fill="none" filter="url(#th-b2)"/>
    <path d="M560 598 C590 626 626 646 668 654 L656 692 C612 684 574 662 542 632 Z" fill="#6b5a40"/>
    <path d="M560 598 C590 626 626 646 668 654" stroke="rgba(58,46,30,0.5)" stroke-width="3" fill="none"/>
    <path d="M548 618 C580 646 618 666 662 674" stroke="rgba(202,180,140,0.35)" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>
    <path d="M596 636 l38 12 -5 18 -38 -12 Z" fill="#4e4130"/>
    <rect x="612" y="644" width="10" height="10" rx="1.5" fill="none" stroke="rgba(30,24,14,0.7)" stroke-width="2"/>
    <ellipse cx="692" cy="193" rx="14" ry="6.5" fill="rgba(0,0,0,0.5)" filter="url(#th-b4)"/>
    <ellipse cx="694" cy="258" rx="15" ry="7" fill="rgba(0,0,0,0.5)" filter="url(#th-b4)"/>
    <ellipse cx="691" cy="318" rx="14" ry="6.5" fill="rgba(0,0,0,0.5)" filter="url(#th-b4)"/>
    <ellipse cx="684" cy="372" rx="12" ry="6" fill="rgba(0,0,0,0.45)" filter="url(#th-b4)"/>
    <path d="M612 149 C646 144 668 146 682 153 C694 159 701 165 700 172 C699 182 692 188 680 191 C660 195 632 195 613 191 C601 183 601 157 612 149 Z" fill="url(#th-fing)"/>
    <path d="M676 155 Q682 171 677 187" stroke="rgba(64,50,34,0.55)" stroke-width="1.6" fill="none"/>
    <path d="M667 153 Q672 171 668 189" stroke="rgba(64,50,34,0.35)" stroke-width="1.2" fill="none"/>
    <path d="M618 153 C646 148 668 150 684 158" stroke="rgba(202,180,140,0.45)" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/>
    <ellipse cx="691" cy="167" rx="7" ry="4" fill="rgba(238,222,190,0.14)" transform="rotate(-18 691 167)"/>
    <path d="M697 160 C701 165 701 176 697 183" stroke="rgba(150,255,200,0.12)" stroke-width="2" fill="none"/>
    <path d="M610 209 C648 204 672 206 686 213 C698 219 704 226 703 234 C702 244 695 250 681 253 C659 257 630 257 611 252 C599 244 599 217 610 209 Z" fill="url(#th-fing)"/>
    <path d="M680 215 Q686 232 681 249" stroke="rgba(64,50,34,0.55)" stroke-width="1.6" fill="none"/>
    <path d="M671 213 Q676 232 672 251" stroke="rgba(64,50,34,0.35)" stroke-width="1.2" fill="none"/>
    <path d="M616 213 C648 208 672 210 688 218" stroke="rgba(202,180,140,0.45)" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/>
    <ellipse cx="694" cy="228" rx="7.5" ry="4.5" fill="rgba(238,222,190,0.14)" transform="rotate(-18 694 228)"/>
    <path d="M700 222 C704 227 704 239 700 246" stroke="rgba(150,255,200,0.12)" stroke-width="2" fill="none"/>
    <path d="M611 272 C647 267 668 269 682 276 C694 282 700 289 699 296 C698 306 691 311 678 314 C658 318 631 318 612 314 C600 306 600 280 611 272 Z" fill="url(#th-fing)"/>
    <path d="M676 278 Q682 294 677 310" stroke="rgba(64,50,34,0.55)" stroke-width="1.6" fill="none"/>
    <path d="M667 276 Q672 294 668 312" stroke="rgba(64,50,34,0.35)" stroke-width="1.2" fill="none"/>
    <path d="M617 276 C647 271 668 273 684 281" stroke="rgba(202,180,140,0.45)" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/>
    <ellipse cx="690" cy="290" rx="7" ry="4" fill="rgba(238,222,190,0.13)" transform="rotate(-18 690 290)"/>
    <path d="M618 335 C648 331 666 333 677 339 C687 344 691 350 690 356 C689 364 683 368 672 370 C655 373 634 373 619 370 C608 363 608 341 618 335 Z" fill="url(#th-fing)"/>
    <path d="M670 340 Q675 353 671 366" stroke="rgba(64,50,34,0.5)" stroke-width="1.4" fill="none"/>
    <path d="M623 339 C648 335 666 337 679 343" stroke="rgba(202,180,140,0.4)" stroke-width="1.1" stroke-dasharray="3 3" fill="none"/>
    <ellipse cx="682" cy="352" rx="6" ry="3.5" fill="rgba(238,222,190,0.12)" transform="rotate(-16 682 352)"/>
    <ellipse cx="692" cy="486" rx="20" ry="52" fill="rgba(0,0,0,0.28)" filter="url(#th-b7)"/>
    <ellipse cx="697" cy="468" rx="12" ry="34" fill="rgba(0,0,0,0.48)" filter="url(#th-b4)" transform="rotate(-10 697 468)"/>
    <path d="M648 598 C638 566 644 532 660 504 C670 486 678 466 683 448 C686 434 694 428 700 434 C705 441 705 456 700 470 C694 490 686 514 677 538 C668 562 660 584 658 602 C654 610 650 606 648 598 Z" fill="url(#th-thumb)"/>
    <path d="M682 486 Q690 493 698 488" stroke="rgba(64,50,34,0.5)" stroke-width="1.5" fill="none"/>
    <path d="M678 502 Q687 509 696 503" stroke="rgba(64,50,34,0.35)" stroke-width="1.2" fill="none"/>
    <ellipse cx="695" cy="450" rx="6" ry="13" fill="rgba(238,222,190,0.15)" transform="rotate(9 695 450)"/>
    <path d="M654 574 C662 540 673 508 684 476" stroke="rgba(202,180,140,0.4)" stroke-width="1.2" stroke-dasharray="3.5 3.5" fill="none"/>
    <path d="M701 444 C703 452 702 462 699 470" stroke="rgba(150,255,200,0.12)" stroke-width="2" fill="none"/>
    <path d="M652 594 C648 570 650 544 660 520" stroke="rgba(58,46,30,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
  </g>
</svg>`;
    return hand;
  }

  /** All roads flattened into ONE offscreen mask (solid phosphor pixels on
   *  transparent), baked once. drawTabletMap composites it in a single
   *  drawImage at ~0.07 alpha, so crossing roads can never double-blend
   *  into a bright band. */
  _buildRoadMask() {
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const S = this.halfSize, ZH = this.zHalf;
    g.fillStyle = 'rgb(140, 235, 180)';
    for (const s of this.minimapShapes) {
      if (s.type !== 'road') continue;
      g.fillRect(((s.x - s.w / 2 + S) / (S * 2)) * W, ((s.z - s.d / 2 + ZH) / (ZH * 2)) * H,
        (s.w / (S * 2)) * W, (s.d / (ZH * 2)) * H);
    }
    this.roadMask = c;
  }

  /** Procedural satellite-style underlay baked once from minimapShapes:
   *  dusty ground, lighter road slab, building footprints as noisy blocks
   *  with SE-offset soft shadows, vehicles as dark blobs, fine grain, then
   *  a green multiply pass. NOT a live render — pure canvas paint. */
  _buildSatUnderlay() {
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const S = this.halfSize, ZH = this.zHalf;
    const toX = (x) => ((x + S) / (S * 2)) * W;
    const toY = (z) => ((z + ZH) / (ZH * 2)) * H;
    let seed = 137;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // Ground: dark dusty base broken by large soft patches.
    g.fillStyle = '#1c2418';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${(34 + rand() * 30) | 0}, ${(44 + rand() * 26) | 0}, ${(28 + rand() * 16) | 0}, 0.14)`;
      const pw = 40 + rand() * 180, ph = 30 + rand() * 140;
      g.beginPath();
      g.ellipse(rand() * W, rand() * H, pw / 2, ph / 2, rand() * 3.14, 0, 7);
      g.fill();
    }
    // Roads slightly lighter — flattened road mask, composited once.
    g.save();
    g.globalAlpha = 0.14;
    g.drawImage(this.roadMask, 0, 0);
    g.restore();
    // Vehicles / street props: small dark blobs, like a real sat photo.
    for (const s of this.minimapShapes) {
      if (s.type !== 'p') continue;
      const x = toX(s.x - s.w / 2), y = toY(s.z - s.d / 2);
      const w = (s.w / (S * 2)) * W, h = (s.d / (ZH * 2)) * H;
      g.fillStyle = 'rgba(6, 10, 6, 0.55)';
      g.fillRect(x + 1.5, y + 1.5, w, h);
      g.fillStyle = 'rgba(70, 82, 60, 0.8)';
      g.fillRect(x, y, w, h);
    }
    // Building shadows first (soft, offset SE), then the blocks.
    g.save();
    if ('filter' in g) g.filter = 'blur(3px)';
    g.fillStyle = 'rgba(0, 0, 0, 0.42)';
    for (const s of this.minimapShapes) {
      if (s.type !== 'b') continue;
      g.fillRect(toX(s.x - s.w / 2) + 5, toY(s.z - s.d / 2) + 5, (s.w / (S * 2)) * W, (s.d / (ZH * 2)) * H);
    }
    g.restore();
    for (const s of this.minimapShapes) {
      if (s.type !== 'b' && s.type !== 'w') continue;
      const x = toX(s.x - s.w / 2), y = toY(s.z - s.d / 2);
      const w = Math.max(2, (s.w / (S * 2)) * W), h = Math.max(2, (s.d / (ZH * 2)) * H);
      if (s.type === 'w') { // boundary walls: thin pale lines
        g.fillStyle = 'rgba(96, 106, 82, 0.5)';
        g.fillRect(x, y, w, h);
        continue;
      }
      const v = 0.72 + rand() * 0.56; // per-building value variation
      g.fillStyle = `rgb(${(54 * v) | 0}, ${(66 * v) | 0}, ${(48 * v) | 0})`;
      g.fillRect(x, y, w, h);
      // Rooftop clutter: a few lighter/darker patches inside the footprint.
      const n = 3 + (rand() * 4) | 0;
      for (let k = 0; k < n; k++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(190,205,165,0.13)';
        const rw = 2 + rand() * w * 0.4, rh = 2 + rand() * h * 0.4;
        g.fillRect(x + rand() * (w - rw), y + rand() * (h - rh), rw, rh);
      }
      // Sun-facing NW edges catch a sliver of light.
      g.fillStyle = 'rgba(215, 228, 190, 0.14)';
      g.fillRect(x, y, w, 1.5);
      g.fillRect(x, y, 1.5, h);
    }
    // Fine grain scatter.
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(190,210,170,0.05)';
      g.fillRect(rand() * W, rand() * H, 1 + rand(), 1 + rand());
    }
    // Green phosphor multiply over everything.
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(104, 158, 112)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    this.satCanvas = c;
  }

  /** 128px green noise tile, redrawn each frame at a random offset for the
   *  ~1.5% animated grain over the feed. */
  _buildNoise() {
    const n = document.createElement('canvas');
    n.width = n.height = 128;
    const g = n.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v * 0.45;
      img.data[i + 1] = v;
      img.data[i + 2] = v * 0.55;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.noiseCanvas = n;
  }

  openTargeting() {
    if (!this.ready) return false;
    this.state = 'targeting';
    this.cursorPx = { x: this.tabletMap.width / 2, y: this.tabletMap.height / 2 };
    this.coordEl.textContent = this._gridRef(0, 0);
    // Station clock: drives the inbound CAS-9 glyph track + ON STN countdown.
    this._stnStart = performance.now() * 0.001;
    this.tablet.classList.remove('hidden');
    this.drawTabletMap();
    this.audio.uiClick();
    this.audio.radio();
    return true;
  }

  cancelTargeting() {
    if (this.state !== 'targeting') return;
    this.state = 'idle';
    this.tablet.classList.add('hidden');
    if (this.onClose) this.onClose(false);
  }

  confirmTarget(worldPos) {
    this.charges--;
    this.state = 'inbound';
    this.timeline = 0;
    this.target.copy(worldPos);
    // Stamp state: 'STRIKE CONFIRMED' + grid coords hold over the frozen map
    // for ~0.6 s before the tablet drops (input passes through immediately).
    this._showStamp(worldPos);
    this.audio.uiClick(true);
    this.audio.radio();
    this.hud.centerMessage('AIR STRIKE INBOUND — DANGER CLOSE', 2.6);
    this.hud.killfeed('OVERLORD', 'CAS-9 STRIKE PACKAGE EN ROUTE', true);
    this.bombsDropped = false;
    this.explosionsFired = 0;
    this.bombs = [];
    if (this.onClose) this.onClose(true);

    // Red marker smoke at target
    this.markerT = 0;
  }

  /** Show the confirmation stamp, then hide the tablet. Pointer events are
   *  cut instantly so the lingering overlay can't shadow gameplay input;
   *  when confirmTarget is scripted with the tablet closed (photo runs) the
   *  stamp lives inside the hidden #tablet and never paints. */
  _showStamp(worldPos) {
    if (!this.stampEl) { this.tablet.classList.add('hidden'); return; }
    this.stampEl.querySelector('.ts-grid').textContent = this._gridRef(worldPos.x, worldPos.z);
    this.stampEl.classList.add('show');
    this.tablet.style.pointerEvents = 'none';
    clearTimeout(this._stampTimer);
    this._stampTimer = setTimeout(() => {
      this.stampEl.classList.remove('show');
      this.tablet.classList.add('hidden');
      this.tablet.style.pointerEvents = '';
    }, 620);
  }

  drawTabletMap() {
    const c = this.tabletMap.getContext('2d');
    const W = this.tabletMap.width, H = this.tabletMap.height;
    const S = this.halfSize, ZH = this.zHalf;
    const toX = (x) => ((x + S) / (S * 2)) * W;
    const toY = (z) => ((z + ZH) / (ZH * 2)) * H;
    const now = performance.now() * 0.001;
    const MONO = "Consolas, Menlo, 'DejaVu Sans Mono', 'Liberation Mono', monospace";

    // Satellite underlay (baked once), phosphor instrument layers on top.
    c.drawImage(this.satCanvas, 0, 0);

    // Grid: every 4th line heavier, 9px mono numerals along both axes.
    c.lineWidth = 1;
    c.font = `9px ${MONO}`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    for (let i = 0; i <= 14; i++) {
      const heavy = i % 4 === 0;
      c.strokeStyle = heavy ? 'rgba(110, 220, 160, 0.22)' : 'rgba(110, 220, 160, 0.09)';
      const gx = Math.round((i / 14) * W) + 0.5;
      const gy = Math.round((i / 14) * H) + 0.5;
      c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke();
      c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
      if (i > 0 && i < 14) {
        const lbl = String(Math.round((i / 14) * 99)).padStart(2, '0');
        c.fillStyle = 'rgba(140, 235, 180, 0.4)';
        c.fillText(lbl, gx + 3, 11);       // eastings along the top
        c.fillText(lbl, 4, gy - 3);        // northings down the left
      }
    }

    // Roads: pre-flattened offscreen mask composited ONCE at 0.07 alpha —
    // no additive double-blend where roads cross — plus 1px phosphor centre
    // dashes on both axes.
    c.save();
    c.globalAlpha = 0.07;
    c.drawImage(this.roadMask, 0, 0);
    c.restore();
    c.strokeStyle = 'rgba(170, 250, 200, 0.3)';
    c.lineWidth = 1;
    c.setLineDash([7, 9]);
    for (const s of this.minimapShapes) {
      if (s.type !== 'road') continue;
      c.beginPath();
      if (s.w >= s.d) { c.moveTo(toX(s.x - s.w / 2), toY(s.z)); c.lineTo(toX(s.x + s.w / 2), toY(s.z)); }
      else { c.moveTo(toX(s.x), toY(s.z - s.d / 2)); c.lineTo(toX(s.x), toY(s.z + s.d / 2)); }
      c.stroke();
    }
    c.setLineDash([]);

    // Buildings: faint fill + phosphor outline; walls outline only.
    for (const s of this.minimapShapes) {
      if (s.type === 'road' || s.type === 'p') continue;
      const x = Math.round(toX(s.x - s.w / 2));
      const y = Math.round(toY(s.z - s.d / 2));
      const w = Math.max(2, Math.round((s.w / (S * 2)) * W));
      const h = Math.max(2, Math.round((s.d / (ZH * 2)) * H));
      if (s.type === 'b') {
        c.fillStyle = 'rgba(120, 230, 170, 0.05)';
        c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(140, 255, 190, 0.5)';
      } else {
        c.strokeStyle = 'rgba(140, 255, 190, 0.22)';
      }
      c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Corner brackets.
    c.strokeStyle = 'rgba(160, 255, 200, 0.55)';
    c.lineWidth = 2;
    const B = 18, M = 10;
    for (const [cx, cy, sx, sy] of [[M, M, 1, 1], [W - M, M, -1, 1], [M, H - M, 1, -1], [W - M, H - M, -1, -1]]) {
      c.beginPath();
      c.moveTo(cx + sx * B, cy);
      c.lineTo(cx, cy);
      c.lineTo(cx, cy + sy * B);
      c.stroke();
    }

    // Hostiles: 5px pulsing rotated squares.
    let hi = 0;
    for (const e of this.enemies.enemies) {
      if (!e.alive) continue;
      const pulse = 0.7 + 0.3 * Math.sin(now * 5 + hi * 1.7);
      const size = 5 + pulse * 1.6;
      c.save();
      c.translate(toX(e.pos.x), toY(e.pos.z));
      c.rotate(Math.PI / 4);
      c.globalAlpha = 0.65 + pulse * 0.35;
      c.shadowColor = 'rgba(255, 70, 50, 0.8)';
      c.shadowBlur = 5;
      c.fillStyle = '#ff5040';
      c.fillRect(-size / 2, -size / 2, size, size);
      c.restore();
      hi++;
    }

    // Player: heading chevron (yaw published by the HUD compass).
    const p = this.getPlayerPos();
    const yaw = this.hud && this.hud.lastYaw ? this.hud.lastYaw : 0;
    c.save();
    c.translate(toX(p.x), toY(p.z));
    c.rotate(-yaw);
    c.fillStyle = '#8af0b8';
    c.beginPath();
    c.moveTo(0, -8);
    c.lineTo(5.5, 6);
    c.lineTo(0, 3);
    c.lineTo(-5.5, 6);
    c.closePath();
    c.fill();
    c.restore();

    // Labels
    c.fillStyle = 'rgba(150, 240, 190, 0.6)';
    c.font = `700 11px ${MONO}`;
    c.fillText('MAIN ST', toX(-40), toY(0) - 10);
    c.fillText('N', 12, 30);

    // --- Inbound CAS-9 bird: smoothed ingress track from the SW corner to a
    // holding point, then a racetrack orbit; dashed course line ahead, wake
    // dots behind, 'ON STN' countdown ticking top-right. All wall-clock
    // driven so it stays alive even when the sim is frozen. ---
    const stn = this._stnStart != null ? now - this._stnStart : 8;
    const hx = W * 0.67, hy = H * 0.32;
    let ax, ay, hdg;
    const ingT = 22;
    if (stn < ingT) {
      const k0 = stn / ingT;
      const k = k0 * k0 * (3 - 2 * k0);
      const u = 1 - k;
      const x0 = W * 0.045, y0 = H * 0.93, cx1 = W * 0.2, cy1 = H * 0.55;
      ax = u * u * x0 + 2 * u * k * cx1 + k * k * hx;
      ay = u * u * y0 + 2 * u * k * cy1 + k * k * hy;
      hdg = Math.atan2(2 * u * (cy1 - y0) + 2 * k * (hy - cy1), 2 * u * (cx1 - x0) + 2 * k * (hx - cx1));
      c.strokeStyle = 'rgba(150, 240, 195, 0.3)';
      c.lineWidth = 1;
      c.setLineDash([3, 7]);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(hx, hy); c.stroke();
      c.setLineDash([]);
    } else {
      const th = ((stn - ingT) / 16) * Math.PI * 2 - Math.PI / 2;
      ax = hx + Math.cos(th) * 36; ay = hy + Math.sin(th) * 22;
      hdg = Math.atan2(Math.cos(th) * 22, -Math.sin(th) * 36);
    }
    // Holding-point diamond
    c.save();
    c.translate(hx, hy); c.rotate(Math.PI / 4);
    c.strokeStyle = 'rgba(150, 240, 195, 0.4)';
    c.lineWidth = 1;
    c.strokeRect(-4, -4, 8, 8);
    c.restore();
    // Wake dots
    for (let i = 1; i <= 3; i++) {
      c.fillStyle = `rgba(190, 255, 220, ${0.3 - i * 0.08})`;
      c.fillRect(ax - Math.cos(hdg) * i * 11 - 1, ay - Math.sin(hdg) * i * 11 - 1, 2, 2);
    }
    // Aircraft glyph (nose = -y before rotation), bloomed
    c.save();
    c.translate(ax, ay);
    c.rotate(hdg + Math.PI / 2);
    c.shadowColor = 'rgba(140, 255, 200, 0.9)';
    c.shadowBlur = 7;
    c.fillStyle = '#dcffec';
    c.beginPath();
    c.moveTo(0, -8); c.lineTo(1.7, -2.4); c.lineTo(7.5, 1.6); c.lineTo(7.5, 3.4);
    c.lineTo(1.5, 2.2); c.lineTo(3, 6.6); c.lineTo(0, 5.2); c.lineTo(-3, 6.6);
    c.lineTo(-1.5, 2.2); c.lineTo(-7.5, 3.4); c.lineTo(-7.5, 1.6); c.lineTo(-1.7, -2.4);
    c.closePath();
    c.fill();
    c.restore();
    c.font = `9px ${MONO}`;
    c.fillStyle = 'rgba(190, 255, 220, 0.85)';
    c.fillText('CAS-9', ax + 12, ay + 3);
    // ON STN countdown, top-right, with emissive bloom
    const remain = Math.max(0, Math.ceil(32 - stn));
    c.save();
    c.textAlign = 'right';
    c.font = `700 11px ${MONO}`;
    c.shadowColor = 'rgba(140, 255, 200, 0.8)';
    c.shadowBlur = 6;
    c.fillStyle = remain > 0 ? '#c8ffe2' : (Math.sin(now * 6) > 0 ? '#eafff3' : '#8ef0bc');
    c.fillText(remain > 0 ? `CAS-9 ON STN 00:${String(remain).padStart(2, '0')}` : 'CAS-9 ON STATION', W - 14, 34);
    c.restore();

    // --- Targeting reticle (cursor-tracked, defaults to map centre) ---
    // Sub-pixel sensor jitter keeps the reticle + GRID digits ticking even
    // with the mouse still; display-only, clicks use raw event coords.
    const base = this.cursorPx ?? { x: W / 2, y: H / 2 };
    const cur = {
      x: base.x + Math.sin(now * 1.7) * 1.4 + Math.sin(now * 4.3 + 1.2) * 0.6,
      y: base.y + Math.cos(now * 1.3 + 0.6) * 1.3 + Math.sin(now * 3.6) * 0.5,
    };
    // Full-span crosshair: two 1px lines intersecting at the cursor.
    c.strokeStyle = 'rgba(190, 255, 220, 0.15)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, Math.round(cur.y) + 0.5); c.lineTo(W, Math.round(cur.y) + 0.5);
    c.moveTo(Math.round(cur.x) + 0.5, 0); c.lineTo(Math.round(cur.x) + 0.5, H);
    c.stroke();
    // 48px blast-radius ring with 4 cardinal tick marks + centre dot,
    // with a 1-2px emissive halo so the hot glyph blooms like a real panel.
    c.save();
    c.shadowColor = 'rgba(255, 80, 58, 0.7)';
    c.shadowBlur = 6;
    c.strokeStyle = 'rgba(255, 96, 76, 0.85)';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(cur.x, cur.y, 48, 0, 7); c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    for (const [tx, ty] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      c.moveTo(cur.x + tx * 42, cur.y + ty * 42);
      c.lineTo(cur.x + tx * 54, cur.y + ty * 54);
    }
    c.stroke();
    c.fillStyle = 'rgba(255, 96, 76, 0.9)';
    c.fillRect(cur.x - 1, cur.y - 1, 2, 2);
    c.restore();
    // Live grid readout rides the ring; the footer DOM readout is synced
    // every frame so its digits tick with the sensor jitter too.
    const cwx = (cur.x / W - 0.5) * S * 2;
    const cwz = (cur.y / H - 0.5) * ZH * 2;
    c.save();
    c.shadowColor = 'rgba(120, 255, 190, 0.6)';
    c.shadowBlur = 4;
    c.font = `9px ${MONO}`;
    c.fillStyle = 'rgba(170, 255, 205, 0.75)';
    c.fillText(this._gridRef(cwx, cwz), cur.x > W - 160 ? cur.x - 148 : cur.x + 56, cur.y - 8);
    c.restore();
    this.coordEl.textContent = this._gridRef(cwx, cwz);
    // Red corner brackets snap onto any hostile dot hovered within 14px.
    c.strokeStyle = 'rgba(255, 70, 52, 0.95)';
    c.lineWidth = 1.5;
    for (const e of this.enemies.enemies) {
      if (!e.alive) continue;
      const ex = toX(e.pos.x), ey = toY(e.pos.z);
      if (Math.hypot(ex - cur.x, ey - cur.y) > 14) continue;
      const R = 9, L = 4;
      c.beginPath();
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        c.moveTo(ex + sx * (R - L), ey + sy * R);
        c.lineTo(ex + sx * R, ey + sy * R);
        c.lineTo(ex + sx * R, ey + sy * (R - L));
      }
      c.stroke();
    }

    // Animated green noise (~1.5%): random tile offset each frame.
    c.save();
    c.globalAlpha = 0.03;
    const pat = c.createPattern(this.noiseCanvas, 'repeat');
    c.translate(-((Math.random() * 128) | 0), -((Math.random() * 128) | 0));
    c.fillStyle = pat;
    c.fillRect(0, 0, W + 128, H + 128);
    c.restore();
  }

  _spawnJets() {
    const dir = new THREE.Vector3(1, 0, 0); // strike run west→east
    this.strikeDir = dir;
    const startX = this.target.x - 420;
    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      jet.scale.setScalar(1.45);
      const off = i === 0 ? 0 : i === 1 ? -19 : 19;
      const lag = i === 0 ? 0 : 30;
      jet.position.set(startX - lag, 46 + i * 2.5, this.target.z + off);
      jet.rotation.y = -Math.PI / 2; // nose toward +X
      this.scene.add(jet);
      this.jets.push({ mesh: jet, speed: 170, dropped: i !== 0 });
      // Only lead jet drops in a strafe line; wingmen escort
    }
    this.audio.jetFlyby(4.2);
  }

  _dropBombs(jet) {
    for (let i = 0; i < 7; i++) {
      this.bombs.push({
        mesh: null,
        jet,
        delay: i * 0.085,
        pos: null,
        vel: null,
        exploded: false,
        idx: i,
      });
    }
    this.audio.bombWhistle(1.9);
  }

  _activateBomb(b) {
    b.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x30363b, roughness: 0.4, metalness: 0.6 })
    );
    b.mesh.rotation.z = Math.PI / 2;
    this.scene.add(b.mesh);
    b.pos = b.jet.mesh.position.clone();
    b.pos.y -= 1.4;
    b.vel = new THREE.Vector3(b.jet.speed * 0.5, -10, 0);
  }

  update(dt) {
    if (this.state === 'targeting') {
      this.drawTabletMap();
      return;
    }
    if (this.state !== 'inbound') return;

    const prevT = this.timeline;
    this.timeline += dt;
    const t = this.timeline;

    // Marker smoke (red) rising at target
    if (t < 4.2) {
      this.markerT -= dt;
      if (this.markerT <= 0) {
        this.markerT = 0.08;
        this.fx.smoke.spawn({
          pos: this.target.clone().add(new THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5)),
          vel: new THREE.Vector3(0.5, 3.2 + Math.random() * 1.5, 0.2),
          life: 2.6, size0: 0.5, size1: 2.6,
          color0: new THREE.Color(0.75, 0.1, 0.08), color1: new THREE.Color(0.5, 0.12, 0.1),
          alpha0: 0.6, alpha1: 0, fadeIn: 0.1,
        });
      }
      if (prevT === 0) {
        this.fx.lights.flash(this.target.clone().add(new THREE.Vector3(0, 1, 0)), { color: 0xff3020, intensity: 30, life: 3.5, distance: 14 });
      }
    }

    // Jets in at t=2
    if (prevT < 2 && t >= 2) this._spawnJets();

    // Move jets + contrails
    for (const j of this.jets) {
      j.mesh.position.x += j.speed * dt;
      // Bomb release ~184m short of target (ballistic lead for the stick)
      if (!j.dropped && j.mesh.position.x > this.target.x - 184) {
        j.dropped = true;
        this._dropBombs(j);
      }
      // Wingtip contrails — sub-stepped along the flight segment: at 170 m/s
      // an interval timer left ~5m dashes, so instead emit overlapping
      // velocity-stretched ribbon segments every 2.4m of travel (carry kept
      // per jet so spacing survives frame boundaries).
      if (j.trailCarry === undefined) j.trailCarry = 0;
      j.trailCarry += j.speed * dt;
      while (j.trailCarry >= 2.4) {
        j.trailCarry -= 2.4;
        const tx = j.mesh.position.x - 1.5 - j.trailCarry;
        for (const s of [-4.7, 4.7]) {
          this.fx.contrail.spawn({
            pos: new THREE.Vector3(tx, j.mesh.position.y + (Math.random() - 0.5) * 0.15, j.mesh.position.z + s),
            vel: new THREE.Vector3(0.4, 0.05, 0), // stretch axis ~ flight path, near-zero drift
            life: 4 + Math.random() * 2,
            size0: 0.25, size1: 0.6, stretch: 11,
            color0: new THREE.Color(0.96, 0.96, 0.98), color1: new THREE.Color(0.9, 0.9, 0.94),
            alpha0: 0.25, alpha1: 0, fadeIn: 0.06,
          });
        }
      }
    }

    // Bombs fall
    for (const b of this.bombs) {
      if (b.exploded) continue;
      if (!b.mesh) {
        b.delay -= dt;
        if (b.delay <= 0) this._activateBomb(b);
        continue;
      }
      b.vel.y -= 22 * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.z = Math.atan2(-b.vel.y, b.vel.x);
      // Bomb trail — sub-stepped every 0.4m along the fall segment, each
      // puff a ribbon stretched along the fall direction with length
      // proportional to speed*dt (>=30% overlap of the 0.4m spacing even at
      // terminal velocity) so no residual stepping shows at max fall speed.
      if (b.trailCarry === undefined) b.trailCarry = 0;
      const spd = b.vel.length();
      const segLen = spd * dt;
      b.trailCarry += segLen;
      while (b.trailCarry >= 0.4) {
        b.trailCarry -= 0.4;
        const p = b.pos.clone();
        if (segLen > 1e-6) p.addScaledVector(b.vel, -(b.trailCarry / segLen) * dt);
        this.fx.contrail.spawn({
          pos: p,
          vel: spd > 1e-3
            ? new THREE.Vector3(b.vel.x / spd * 0.3, b.vel.y / spd * 0.3, b.vel.z / spd * 0.3)
            : new THREE.Vector3(0, 0.3, 0),
          life: 1.1 + Math.random() * 0.5,
          size0: 0.28, size1: 0.95,
          stretch: Math.max(1.9, (spd * dt * 1.5) / 0.28),
          color0: new THREE.Color(0.52, 0.5, 0.48), color1: new THREE.Color(0.58, 0.56, 0.54),
          alpha0: 0.32, alpha1: 0, drag: 0.6, fadeIn: 0.02,
        });
      }
      if (b.pos.y <= 0.4) {
        b.exploded = true;
        this.scene.remove(b.mesh);
        const ep = new THREE.Vector3(b.pos.x, 0, this.target.z + (Math.random() - 0.5) * 9);
        this.explosions.spawn(ep, { radius: 9, big: true });
        const playerPos = this.getPlayerPos();
        const distToPlayer = ep.distanceTo(playerPos);
        this.audio.explosion({ dist: distToPlayer, big: true });
        const kills = this.enemies.damageInRadius(ep, 11, 320, true, 'CAS-9');
        if (kills > 0 && this.onKillsScored) this.onKillsScored(kills);
        if (distToPlayer < 12 && this.onPlayerDamage) {
          this.onPlayerDamage(Math.max(10, 90 - distToPlayer * 7), ep);
        }
        this.explosionsFired++;
      }
    }

    // Cleanup
    if (t > 6) {
      for (const j of this.jets) {
        if (j.mesh.position.x > this.target.x + 480) {
          this.scene.remove(j.mesh);
        }
      }
    }
    if (t > 11) {
      for (const j of this.jets) this.scene.remove(j.mesh);
      this.jets = [];
      for (const b of this.bombs) if (!b.exploded) this.scene.remove(b.mesh);
      this.bombs = [];
      this.state = 'idle';
    }
  }
}
