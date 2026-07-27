import * as THREE from 'three';
import { getMaterialLib } from '../world/textures.js';

/**
 * CAS-9 air strike: targeting tablet → marker smoke → 3-jet flyby →
 * bomb release → a 2-3-2 clustered stick of heavy detonations walking the
 * target line, with dark gaps between the three fire columns.
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
   *  inline SVG glued to #tablet-frame (so it inherits the device tilt/sway).
   *  Geometry (sized last round: fingers ≤33px, ~72%) is untouched — this
   *  round is a full re-materialization so the hand reads as a DARK TACTICAL
   *  GLOVE instead of bare skin:
   *  - Base ramps swapped from beige skin to coyote-brown/dark-olive
   *    (#6b5c46 dorsal → #55483a finger mid → #3b3227 under-curl); the camo
   *    sleeve (olive base + 3-tone blob pattern) sits a step darker still.
   *  - Each finger stays ONE smooth capsule path — no segment seams. Joints
   *    are two short knuckle-crease arcs per finger at 15-20% alpha with a
   *    paired ~7% light pinch line, plus 1px/18% stitch dashes on the seams.
   *  - Fabric pass: 3px cordura cross-hatch + a pre-baked speckle grain tile
   *    + a low-frequency tonal blotch tile (canvas data-URLs, see
   *    _bakeHandNoise), all clipped to the glove; a molded TPR knuckle plate
   *    (weave-free so it reads as smooth polymer against fabric) with flex
   *    grooves, domed MCP highlights and a stitched border; a lighter suede
   *    thenar patch; a dark webbing wrist cinch with buckle.
   *  - Contact grounding: 22% blurred shadow column down the bezel, a soft
   *    seat ellipse + crescent AO hook + crisp 3px contact strip per tip,
   *    and a userSpace 'wrap' gradient that multiplies every digit darker
   *    exactly where it rolls over the bezel edge (svg x≈680).
   *  - Screen bounce: green wash gradient over the last ~20px of each digit
   *    plus a soft green rim (1.5px crisp + blurred glow) along the tip
   *    edges that face the glass.
   *  Clipped at svg x=705 so nothing can ever touch the glass (frame x0 =
   *  svg x680, glass starts at x706). */
  /** Bake the glove's fabric grain + tonal blotch tiles ONCE into data-URL
   *  canvases. (Live feTurbulence filters were tried first but re-rasterise
   *  every frame under the tablet's animated 3D transform, which stalled
   *  software-GL captures; pre-baked tiles are visually identical and free.) */
  _bakeHandNoise() {
    let s = 421;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const grain = document.createElement('canvas');
    grain.width = grain.height = 96;
    const g = grain.getContext('2d');
    const img = g.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const r = rnd();
      if (r < 0.24) {        // dark flecks
        img.data[i] = 12; img.data[i + 1] = 9; img.data[i + 2] = 5;
        img.data[i + 3] = 16 + rnd() * 22;
      } else if (r < 0.38) { // light flecks
        img.data[i] = 214; img.data[i + 1] = 206; img.data[i + 2] = 184;
        img.data[i + 3] = 6 + rnd() * 10;
      } else img.data[i + 3] = 0;
    }
    g.putImageData(img, 0, 0);
    const blot = document.createElement('canvas');
    blot.width = blot.height = 256;
    const b = blot.getContext('2d');
    if ('filter' in b) b.filter = 'blur(22px)';
    for (let i = 0; i < 16; i++) {
      const dark = i % 3 !== 2;
      b.fillStyle = dark ? `rgba(8,6,3,${0.05 + rnd() * 0.05})` : `rgba(222,212,190,${0.02 + rnd() * 0.015})`;
      b.beginPath();
      b.ellipse(rnd() * 256, rnd() * 256, 26 + rnd() * 46, 20 + rnd() * 40, rnd() * 3.14, 0, 7);
      b.fill();
    }
    return { grain: grain.toDataURL(), blot: blot.toDataURL() };
  }

  _buildHand() {
    const noise = this._bakeHandNoise();
    const hand = document.createElement('div');
    hand.id = 'tablet-hand';
    hand.innerHTML = `
<svg viewBox="0 0 720 940" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="th-dorsal" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="#554938"/><stop offset="0.5" stop-color="#493f31"/><stop offset="1" stop-color="#3c3327"/>
    </linearGradient>
    <linearGradient id="th-fing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d503e"/><stop offset="0.55" stop-color="#483d30"/><stop offset="1" stop-color="#332b21"/>
    </linearGradient>
    <linearGradient id="th-thumb" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#544736"/><stop offset="0.55" stop-color="#43392c"/><stop offset="1" stop-color="#302920"/>
    </linearGradient>
    <linearGradient id="th-turn" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(18,14,9,0)"/><stop offset="0.52" stop-color="rgba(18,14,9,0)"/><stop offset="0.82" stop-color="rgba(16,12,8,0.30)"/><stop offset="1" stop-color="rgba(14,10,7,0.46)"/>
    </linearGradient>
    <linearGradient id="th-ao" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(8,6,3,0)"/><stop offset="1" stop-color="rgba(5,4,2,0.5)"/>
    </linearGradient>
    <linearGradient id="th-wrap" gradientUnits="userSpaceOnUse" x1="636" y1="0" x2="705" y2="0">
      <stop offset="0" stop-color="rgba(8,6,3,0)"/><stop offset="0.52" stop-color="rgba(8,6,3,0.05)"/>
      <stop offset="0.65" stop-color="rgba(7,5,3,0.34)"/><stop offset="0.8" stop-color="rgba(7,5,3,0.12)"/>
      <stop offset="1" stop-color="rgba(7,5,3,0.04)"/>
    </linearGradient>
    <linearGradient id="th-tip" gradientUnits="userSpaceOnUse" x1="682" y1="0" x2="705" y2="0">
      <stop offset="0" stop-color="rgba(126,240,178,0)"/><stop offset="1" stop-color="rgba(126,240,178,0.13)"/>
    </linearGradient>
    <linearGradient id="th-sleeve" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#4c4d3a"/><stop offset="0.5" stop-color="#37382a"/><stop offset="1" stop-color="#21221a"/>
    </linearGradient>
    <linearGradient id="th-plate" x1="0" y1="0" x2="1" y2="0.85">
      <stop offset="0" stop-color="#3b362d"/><stop offset="0.55" stop-color="#2d2923"/><stop offset="1" stop-color="#1e1b16"/>
    </linearGradient>
    <pattern id="th-weave" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="3" height="1" fill="rgba(10,8,5,0.14)"/>
      <rect x="0" y="0" width="1" height="3" fill="rgba(10,8,5,0.12)"/>
      <rect x="0" y="1.5" width="3" height="1" fill="rgba(216,208,188,0.025)"/>
      <rect x="1.5" y="0" width="1" height="3" fill="rgba(216,208,188,0.02)"/>
    </pattern>
    <pattern id="th-grain" width="96" height="96" patternUnits="userSpaceOnUse"><image href="${noise.grain}" width="96" height="96"/></pattern>
    <pattern id="th-blotp" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${noise.blot}" width="256" height="256"/></pattern>
    <filter id="th-b2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="th-b3" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <filter id="th-b4" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="th-b7" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="7"/></filter>
    <clipPath id="th-clip"><rect x="0" y="0" width="705" height="940"/></clipPath>
    <clipPath id="th-slv"><path d="M490 556 C412 622 296 702 174 786 C110 830 60 882 32 928 L26 940 L462 940 C450 858 498 768 564 698 C608 652 642 620 660 596 C620 572 544 560 490 556 Z"/></clipPath>
    <clipPath id="th-back"><path d="M624 186 C606 188 592 198 584 212 C572 236 566 276 567 318 C568 360 573 402 579 440 C583 472 585 508 589 538 C593 566 603 584 620 590 C638 594 656 588 666 572 C676 556 681 532 681 506 C681 474 679 438 678 404 C677 372 674 346 669 330 C663 300 658 268 654 240 C650 216 640 194 624 186 Z"/></clipPath>
    <clipPath id="th-digits">
      <path d="M621 188 C645 184.5 666 186 678 192 C686 196 690 201.5 689 206 C688 210.5 682 214.5 674 216 C657 218.5 636 218 622 214 C612 208.5 613 193.5 621 188 Z"/>
      <path d="M616 221 C647 216.5 675 218.5 689 225 C698 229.5 702 235 701 240 C700 245.5 693 250 683 252 C663 255.5 637 255 620 250.5 C609 244.5 610 226.5 616 221 Z"/>
      <path d="M612 258 C646 253.5 678 255.5 692 262 C701 266.5 705 272.5 704 278 C703 283.5 696 288 686 290 C665 293.5 638 293 620 288.5 C608 282 609 263.5 612 258 Z"/>
      <path d="M615 297 C647 292.5 676 294.5 690 301 C699 305.5 703 311 702 316 C701 321.5 694 326 684 328 C664 331.5 639 331 622 326.5 C610 320.5 611 302.5 615 297 Z"/>
      <path d="M652 470 C660 446 668 420 678 398 C682 389 690 384 696 389 C702 394 703 405 700 417 C695 439 690 462 687 484 C685 507 680 529 668 545 C656 558 634 561 618 553 C606 546 602 528 606 510 C611 489 630 475 652 470 Z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#th-clip)">
    <g clip-path="url(#th-slv)">
      <path d="M490 556 C412 622 296 702 174 786 C110 830 60 882 32 928 L26 940 L462 940 C450 858 498 768 564 698 C608 652 642 620 660 596 C620 572 544 560 490 556 Z" fill="url(#th-sleeve)"/>
      <ellipse cx="150" cy="880" rx="55" ry="34" transform="rotate(-25 150 880)" fill="rgba(40,40,26,0.5)"/>
      <ellipse cx="300" cy="782" rx="48" ry="30" transform="rotate(-30 300 782)" fill="rgba(40,40,26,0.5)"/>
      <ellipse cx="452" cy="690" rx="44" ry="26" transform="rotate(-32 452 690)" fill="rgba(40,40,26,0.45)"/>
      <ellipse cx="560" cy="626" rx="36" ry="20" transform="rotate(-35 560 626)" fill="rgba(40,40,26,0.45)"/>
      <ellipse cx="240" cy="932" rx="60" ry="30" transform="rotate(-24 240 932)" fill="rgba(40,40,26,0.5)"/>
      <ellipse cx="210" cy="838" rx="40" ry="24" transform="rotate(-28 210 838)" fill="rgba(74,64,42,0.4)"/>
      <ellipse cx="376" cy="738" rx="42" ry="24" transform="rotate(-30 376 738)" fill="rgba(74,64,42,0.4)"/>
      <ellipse cx="508" cy="664" rx="34" ry="18" transform="rotate(-33 508 664)" fill="rgba(74,64,42,0.36)"/>
      <ellipse cx="120" cy="928" rx="44" ry="24" transform="rotate(-22 120 928)" fill="rgba(74,64,42,0.4)"/>
      <ellipse cx="256" cy="806" rx="30" ry="16" transform="rotate(-28 256 806)" fill="rgba(128,124,88,0.2)"/>
      <ellipse cx="420" cy="712" rx="28" ry="14" transform="rotate(-31 420 712)" fill="rgba(128,124,88,0.18)"/>
      <ellipse cx="330" cy="868" rx="34" ry="16" transform="rotate(-26 330 868)" fill="rgba(128,124,88,0.18)"/>
      <ellipse cx="548" cy="678" rx="22" ry="12" transform="rotate(-34 548 678)" fill="rgba(128,124,88,0.16)"/>
      <path d="M430 690 C466 716 494 748 512 784" stroke="rgba(14,16,10,0.44)" stroke-width="6" fill="none" filter="url(#th-b2)"/>
      <path d="M336 756 C376 782 410 814 432 852" stroke="rgba(14,16,10,0.38)" stroke-width="7" fill="none" filter="url(#th-b2)"/>
      <path d="M240 822 C284 848 322 882 346 920" stroke="rgba(14,16,10,0.32)" stroke-width="8" fill="none" filter="url(#th-b2)"/>
      <path d="M472 656 C508 686 536 720 554 756" stroke="rgba(206,208,176,0.09)" stroke-width="4" fill="none" filter="url(#th-b2)"/>
      <path d="M296 790 C338 818 372 852 394 890" stroke="rgba(206,208,176,0.07)" stroke-width="5" fill="none" filter="url(#th-b2)"/>
      <path d="M418 702 C452 728 480 760 498 794" stroke="rgba(10,9,5,0.06)" stroke-width="16" stroke-linecap="round" fill="none" filter="url(#th-b4)"/>
      <path d="M320 772 C360 800 394 834 416 872" stroke="rgba(10,9,5,0.055)" stroke-width="19" stroke-linecap="round" fill="none" filter="url(#th-b4)"/>
      <path d="M226 838 C266 864 300 894 322 926" stroke="rgba(10,9,5,0.05)" stroke-width="14" stroke-linecap="round" fill="none" filter="url(#th-b4)"/>
      <path d="M504 646 C524 662 538 678 546 694" stroke="rgba(10,9,5,0.055)" stroke-width="12" stroke-linecap="round" fill="none" filter="url(#th-b4)"/>
      <rect x="20" y="540" width="690" height="400" fill="url(#th-weave)" opacity="0.8"/>
      <rect x="20" y="540" width="690" height="400" fill="url(#th-blotp)"/>
      <ellipse cx="600" cy="606" rx="86" ry="30" transform="rotate(-18 600 606)" fill="rgba(0,0,0,0.3)" filter="url(#th-b7)"/>
    </g>
    <path d="M496 564 C556 566 620 578 656 594" stroke="rgba(188,182,158,0.16)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>
    <rect x="678" y="190" width="27" height="380" fill="rgba(0,0,0,0.22)" filter="url(#th-b7)"/>
    <ellipse cx="694" cy="214" rx="9" ry="6" fill="rgba(3,2,1,0.32)" filter="url(#th-b3)"/>
    <ellipse cx="702" cy="248" rx="9" ry="6.5" fill="rgba(3,2,1,0.32)" filter="url(#th-b3)"/>
    <ellipse cx="704" cy="286" rx="9" ry="6.5" fill="rgba(3,2,1,0.32)" filter="url(#th-b3)"/>
    <ellipse cx="703" cy="324" rx="9" ry="6.5" fill="rgba(3,2,1,0.32)" filter="url(#th-b3)"/>
    <ellipse cx="702" cy="452" rx="6" ry="24" fill="rgba(3,2,1,0.3)" filter="url(#th-b3)"/>
    <path d="M672 214 Q685 216 691 207" stroke="rgba(4,3,2,0.45)" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#th-b3)"/>
    <path d="M676 251 Q692 253 700 243" stroke="rgba(4,3,2,0.45)" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#th-b3)"/>
    <path d="M678 290 Q696 292 704 280" stroke="rgba(4,3,2,0.45)" stroke-width="7.5" stroke-linecap="round" fill="none" filter="url(#th-b3)"/>
    <path d="M676 328 Q694 330 702 318" stroke="rgba(4,3,2,0.45)" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#th-b3)"/>
    <path d="M700 398 C703 424 699 452 692 478" stroke="rgba(4,3,2,0.42)" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#th-b3)"/>
    <path d="M690 484 C686 510 678 532 664 550" stroke="rgba(4,3,2,0.32)" stroke-width="9" stroke-linecap="round" fill="none" filter="url(#th-b4)"/>
    <path d="M624 186 C606 188 592 198 584 212 C572 236 566 276 567 318 C568 360 573 402 579 440 C583 472 585 508 589 538 C593 566 603 584 620 590 C638 594 656 588 666 572 C676 556 681 532 681 506 C681 474 679 438 678 404 C677 372 674 346 669 330 C663 300 658 268 654 240 C650 216 640 194 624 186 Z" fill="url(#th-dorsal)"/>
    <path d="M624 186 C606 188 592 198 584 212 C572 236 566 276 567 318 C568 360 573 402 579 440 C583 472 585 508 589 538 C593 566 603 584 620 590 C638 594 656 588 666 572 C676 556 681 532 681 506 C681 474 679 438 678 404 C677 372 674 346 669 330 C663 300 658 268 654 240 C650 216 640 194 624 186 Z" fill="url(#th-turn)"/>
    <rect x="664" y="320" width="18" height="200" fill="url(#th-ao)"/>
    <path d="M584 212 C572 236 566 276 567 318 C568 360 573 402 579 440 C583 472 585 508 589 538" stroke="rgba(10,7,5,0.3)" stroke-width="6" fill="none" filter="url(#th-b4)"/>
    <path d="M624 186 C606 188 592 198 584 212" stroke="rgba(212,206,190,0.13)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M597 350 C594 400 596 452 604 500" stroke="rgba(14,10,6,0.17)" stroke-width="3" fill="none" filter="url(#th-b2)"/>
    <path d="M626 352 C625 400 628 448 636 492" stroke="rgba(14,10,6,0.13)" stroke-width="2.5" fill="none" filter="url(#th-b2)"/>
    <path d="M609 348 C606 400 609 452 618 500" stroke="rgba(206,198,176,0.07)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M581 246 C575 320 577 396 587 462" stroke="rgba(190,182,160,0.15)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>
    <path d="M592 526 C610 536 634 540 656 534" stroke="rgba(14,10,6,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M594 542 C612 551 634 554 654 549" stroke="rgba(14,10,6,0.2)" stroke-width="1.5" fill="none" filter="url(#th-b2)"/>
    <g clip-path="url(#th-back)">
      <rect x="560" y="180" width="130" height="420" fill="url(#th-weave)"/>
      <rect x="560" y="180" width="130" height="420" fill="url(#th-grain)"/>
      <rect x="560" y="180" width="130" height="420" fill="url(#th-blotp)"/>
      <ellipse cx="612" cy="300" rx="26" ry="64" fill="rgba(224,214,192,0.03)" filter="url(#th-b7)"/>
      <ellipse cx="596" cy="486" rx="24" ry="34" fill="rgba(224,214,192,0.02)" filter="url(#th-b7)"/>
    </g>
    <path d="M584 550 l42 10 -5 16 -42 -10 Z" fill="#3b3427"/>
    <path d="M584 550 l42 10" stroke="rgba(214,206,184,0.16)" stroke-width="1.2" fill="none"/>
    <path d="M586.5 554.5 l37 9" stroke="rgba(190,182,160,0.2)" stroke-width="1" stroke-dasharray="2.5 3" fill="none"/>
    <rect x="602" y="557" width="9" height="9" rx="1.5" fill="none" stroke="rgba(12,10,6,0.75)" stroke-width="2"/>
    <g clip-path="url(#th-back)">
      <path d="M597 197 C614 193.5 632 196 642 203 C648 208 650 217 650.5 228 C652 254 654 282 655.5 306 C656.5 321 652 333 640 337.5 C627 341.5 611 340 603 334.5 C596 330 592.5 321 591.5 309 C589 281 588 252 588.5 226 C589 212 591 201.5 597 197 Z" fill="url(#th-plate)"/>
      <path d="M592 224 C610 220.5 630 221.5 648 226" stroke="rgba(6,5,3,0.4)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
      <path d="M591 261 C610 257.5 632 258.5 651 263" stroke="rgba(6,5,3,0.4)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
      <path d="M592 299 C611 295.5 633 296.5 653 301" stroke="rgba(6,5,3,0.4)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
      <path d="M592 228 C610 224.5 630 225.5 648 230" stroke="rgba(212,202,180,0.07)" stroke-width="1" fill="none"/>
      <path d="M591 265 C610 261.5 632 262.5 651 267" stroke="rgba(212,202,180,0.07)" stroke-width="1" fill="none"/>
      <path d="M592 303 C611 299.5 633 300.5 653 305" stroke="rgba(212,202,180,0.07)" stroke-width="1" fill="none"/>
      <ellipse cx="634" cy="208" rx="10" ry="7" fill="rgba(216,206,184,0.1)" filter="url(#th-b2)"/>
      <ellipse cx="637" cy="245" rx="10" ry="7" fill="rgba(216,206,184,0.1)" filter="url(#th-b2)"/>
      <ellipse cx="638" cy="282" rx="10" ry="7" fill="rgba(216,206,184,0.09)" filter="url(#th-b2)"/>
      <ellipse cx="636" cy="316" rx="10" ry="7" fill="rgba(216,206,184,0.09)" filter="url(#th-b2)"/>
      <ellipse cx="601" cy="240" rx="18" ry="7.5" fill="rgba(232,224,204,0.04)" transform="rotate(-75 601 240)" filter="url(#th-b4)"/>
      <path d="M597 197 C614 193.5 632 196 642 203" stroke="rgba(222,212,190,0.3)" stroke-width="1.2" fill="none"/>
      <path d="M600.5 202.5 C615 199.5 630.5 201.5 639 207 C643.5 211 645.5 219 646 228.5 C647.5 253 649.5 280 651 303.5 C651.8 316 648 326.5 638 330.5 C627.5 334 613.5 333 606 328.5 C600 324.5 597.5 317 596.8 307 C594.5 280 593.6 253 594 227.5 C594.4 215 596 206.5 600.5 202.5 Z" fill="none" stroke="rgba(190,182,160,0.2)" stroke-width="1" stroke-dasharray="2.5 2.5"/>
      <path d="M604 336 C617 340.5 631 341 641 338" stroke="rgba(6,4,2,0.32)" stroke-width="3" fill="none" filter="url(#th-b3)"/>
    </g>
    <path d="M621 188 C645 184.5 666 186 678 192 C686 196 690 201.5 689 206 C688 210.5 682 214.5 674 216 C657 218.5 636 218 622 214 C612 208.5 613 193.5 621 188 Z" fill="url(#th-fing)"/>
    <path d="M624 214.5 C641 217 660 217.5 675 215" stroke="rgba(12,9,5,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M645 190.5 Q649.5 201.5 645.5 212" stroke="rgba(12,9,5,0.2)" stroke-width="1.6" fill="none"/>
    <path d="M666.5 192 Q670 202 666.5 212.5" stroke="rgba(12,9,5,0.17)" stroke-width="1.4" fill="none"/>
    <path d="M642.5 190.8 Q647 201.5 643 211.5" stroke="rgba(208,198,174,0.07)" stroke-width="1" fill="none"/>
    <path d="M623 190.5 C644 187 664 188 676.5 193.5" stroke="rgba(205,195,172,0.13)" stroke-width="1.5" fill="none"/>
    <path d="M625 189.5 C645 186.5 664 187.5 677 193" stroke="rgba(192,184,162,0.18)" stroke-width="1" stroke-dasharray="2.5 3.5" fill="none"/>
    <path d="M621 188 C645 184.5 666 186 678 192 C686 196 690 201.5 689 206 C688 210.5 682 214.5 674 216 C657 218.5 636 218 622 214 C612 208.5 613 193.5 621 188 Z" fill="url(#th-wrap)"/>
    <path d="M621 188 C645 184.5 666 186 678 192 C686 196 690 201.5 689 206 C688 210.5 682 214.5 674 216 C657 218.5 636 218 622 214 C612 208.5 613 193.5 621 188 Z" fill="url(#th-tip)"/>
    <path d="M616 221 C647 216.5 675 218.5 689 225 C698 229.5 702 235 701 240 C700 245.5 693 250 683 252 C663 255.5 637 255 620 250.5 C609 244.5 610 226.5 616 221 Z" fill="url(#th-fing)"/>
    <path d="M622 251 C642 254 665 254 684 251" stroke="rgba(12,9,5,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M648 223 Q652.5 236 648.5 249.5" stroke="rgba(12,9,5,0.2)" stroke-width="1.6" fill="none"/>
    <path d="M672 225.5 Q675.5 236.5 672 248.5" stroke="rgba(12,9,5,0.17)" stroke-width="1.4" fill="none"/>
    <path d="M645.5 223.4 Q650 236 646 249" stroke="rgba(208,198,174,0.07)" stroke-width="1" fill="none"/>
    <path d="M620 223.5 C647 219.5 673 221 687.5 227" stroke="rgba(205,195,172,0.13)" stroke-width="1.5" fill="none"/>
    <path d="M620 222.5 C646 218.5 672 220 688 226" stroke="rgba(192,184,162,0.18)" stroke-width="1" stroke-dasharray="2.5 3.5" fill="none"/>
    <path d="M616 221 C647 216.5 675 218.5 689 225 C698 229.5 702 235 701 240 C700 245.5 693 250 683 252 C663 255.5 637 255 620 250.5 C609 244.5 610 226.5 616 221 Z" fill="url(#th-wrap)"/>
    <path d="M616 221 C647 216.5 675 218.5 689 225 C698 229.5 702 235 701 240 C700 245.5 693 250 683 252 C663 255.5 637 255 620 250.5 C609 244.5 610 226.5 616 221 Z" fill="url(#th-tip)"/>
    <path d="M612 258 C646 253.5 678 255.5 692 262 C701 266.5 705 272.5 704 278 C703 283.5 696 288 686 290 C665 293.5 638 293 620 288.5 C608 282 609 263.5 612 258 Z" fill="url(#th-fing)"/>
    <path d="M622 289 C644 292 668 292 687 289" stroke="rgba(12,9,5,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M650 260 Q654.5 273.5 650.5 287.5" stroke="rgba(12,9,5,0.2)" stroke-width="1.6" fill="none"/>
    <path d="M674 262.5 Q677.5 274 674 286.5" stroke="rgba(12,9,5,0.17)" stroke-width="1.4" fill="none"/>
    <path d="M647.5 260.4 Q652 273.5 648 287" stroke="rgba(208,198,174,0.07)" stroke-width="1" fill="none"/>
    <path d="M616 261 C646 256.5 674 258 690.5 264" stroke="rgba(205,195,172,0.13)" stroke-width="1.5" fill="none"/>
    <path d="M616 260 C646 255.5 674 257 691 263" stroke="rgba(192,184,162,0.18)" stroke-width="1" stroke-dasharray="2.5 3.5" fill="none"/>
    <path d="M612 258 C646 253.5 678 255.5 692 262 C701 266.5 705 272.5 704 278 C703 283.5 696 288 686 290 C665 293.5 638 293 620 288.5 C608 282 609 263.5 612 258 Z" fill="url(#th-wrap)"/>
    <path d="M612 258 C646 253.5 678 255.5 692 262 C701 266.5 705 272.5 704 278 C703 283.5 696 288 686 290 C665 293.5 638 293 620 288.5 C608 282 609 263.5 612 258 Z" fill="url(#th-tip)"/>
    <path d="M615 297 C647 292.5 676 294.5 690 301 C699 305.5 703 311 702 316 C701 321.5 694 326 684 328 C664 331.5 639 331 622 326.5 C610 320.5 611 302.5 615 297 Z" fill="url(#th-fing)"/>
    <path d="M624 327 C644 330 667 330 685 327" stroke="rgba(12,9,5,0.3)" stroke-width="2" fill="none" filter="url(#th-b2)"/>
    <path d="M649 299 Q653.5 312 649.5 325.5" stroke="rgba(12,9,5,0.2)" stroke-width="1.6" fill="none"/>
    <path d="M672 301.5 Q675.5 312.5 672 324.5" stroke="rgba(12,9,5,0.17)" stroke-width="1.4" fill="none"/>
    <path d="M646.5 299.4 Q651 312 647 324.5" stroke="rgba(208,198,174,0.07)" stroke-width="1" fill="none"/>
    <path d="M619 300 C647 295.5 673 297 688.5 303" stroke="rgba(205,195,172,0.13)" stroke-width="1.5" fill="none"/>
    <path d="M619 299 C647 294.5 673 296 689 302" stroke="rgba(192,184,162,0.18)" stroke-width="1" stroke-dasharray="2.5 3.5" fill="none"/>
    <path d="M615 297 C647 292.5 676 294.5 690 301 C699 305.5 703 311 702 316 C701 321.5 694 326 684 328 C664 331.5 639 331 622 326.5 C610 320.5 611 302.5 615 297 Z" fill="url(#th-wrap)"/>
    <path d="M615 297 C647 292.5 676 294.5 690 301 C699 305.5 703 311 702 316 C701 321.5 694 326 684 328 C664 331.5 639 331 622 326.5 C610 320.5 611 302.5 615 297 Z" fill="url(#th-tip)"/>
    <path d="M614 208 Q652 213 690 208.5 Q652 217.5 614 223 Z" fill="rgba(0,0,0,0.32)" filter="url(#th-b2)"/>
    <path d="M612 245 Q654 251 700 245.5 Q654 256 612 261 Z" fill="rgba(0,0,0,0.32)" filter="url(#th-b2)"/>
    <path d="M611 284 Q654 290 701 284.5 Q654 295 611 300 Z" fill="rgba(0,0,0,0.32)" filter="url(#th-b2)"/>
    <path d="M652 470 C660 446 668 420 678 398 C682 389 690 384 696 389 C702 394 703 405 700 417 C695 439 690 462 687 484 C685 507 680 529 668 545 C656 558 634 561 618 553 C606 546 602 528 606 510 C611 489 630 475 652 470 Z" fill="url(#th-thumb)"/>
    <path d="M652 472 C662 480 670 494 674 512" stroke="rgba(14,10,6,0.3)" stroke-width="2.5" fill="none" filter="url(#th-b2)"/>
    <path d="M686 490 C683 512 677 531 666 544" stroke="rgba(12,9,5,0.28)" stroke-width="3" fill="none" filter="url(#th-b2)"/>
    <path d="M680 428 Q688 433 695 428" stroke="rgba(12,9,5,0.2)" stroke-width="1.6" fill="none"/>
    <path d="M679 441 Q687 446 694 441" stroke="rgba(12,9,5,0.14)" stroke-width="1.2" fill="none"/>
    <path d="M626 544 C644 520 661 492 675 464" stroke="rgba(18,13,8,0.22)" stroke-width="1.2" fill="none"/>
    <path d="M628 546 C646 522 663 494 677 466" stroke="rgba(196,188,166,0.15)" stroke-width="1" stroke-dasharray="2.5 3" fill="none"/>
    <path d="M616 544 C610 522 618 500 638 490 C658 482 673 490 678 507 C671 533 649 551 626 552 Z" fill="rgba(138,120,90,0.15)"/>
    <path d="M622 548 C616 526 622 504 640 494" stroke="rgba(12,9,5,0.2)" stroke-width="2.5" fill="none" filter="url(#th-b2)"/>
    <path d="M612 520 C616 500 628 486 646 478" stroke="rgba(12,9,5,0.16)" stroke-width="3" fill="none" filter="url(#th-b2)"/>
    <path d="M616 544 C610 522 618 500 638 490 C658 482 673 490 678 507" stroke="rgba(20,15,9,0.16)" stroke-width="1" fill="none"/>
    <path d="M619 541 C614 522 621 503 639 494 C657 487 670 494 675 508" stroke="rgba(196,188,166,0.14)" stroke-width="1" stroke-dasharray="2.5 3" fill="none"/>
    <path d="M659 462 C668 438 677 414 686 397" stroke="rgba(192,184,162,0.18)" stroke-width="1" stroke-dasharray="2.5 3.5" fill="none"/>
    <path d="M652 470 C660 446 668 420 678 398 C682 389 690 384 696 389 C702 394 703 405 700 417 C695 439 690 462 687 484 C685 507 680 529 668 545 C656 558 634 561 618 553 C606 546 602 528 606 510 C611 489 630 475 652 470 Z" fill="url(#th-wrap)"/>
    <path d="M652 470 C660 446 668 420 678 398 C682 389 690 384 696 389 C702 394 703 405 700 417 C695 439 690 462 687 484 C685 507 680 529 668 545 C656 558 634 561 618 553 C606 546 602 528 606 510 C611 489 630 475 652 470 Z" fill="url(#th-tip)"/>
    <g clip-path="url(#th-digits)">
      <rect x="604" y="180" width="16" height="390" fill="rgba(8,6,3,0.14)" filter="url(#th-b4)"/>
      <rect x="600" y="180" width="110" height="390" fill="url(#th-weave)"/>
      <rect x="600" y="180" width="110" height="390" fill="url(#th-grain)"/>
      <rect x="600" y="180" width="110" height="390" fill="url(#th-blotp)"/>
      <ellipse cx="640" cy="520" rx="26" ry="20" fill="rgba(10,7,4,0.06)" filter="url(#th-b7)"/>
      <ellipse cx="688" cy="424" rx="8" ry="15" fill="rgba(16,10,5,0.18)" transform="rotate(12 688 424)" filter="url(#th-b3)"/>
    </g>
    <path d="M687 226 C695 229.5 699.8 234.5 699.8 240 C699 245 693.5 248.8 685.5 250.6 C688.8 246.4 690.3 242.8 690.3 238.8 C690.3 234.3 689.2 230 687 226 Z" fill="rgba(120,106,82,0.25)" stroke="rgba(14,10,6,0.5)" stroke-width="1"/>
    <path d="M690 263.5 C698 267 702.8 272.5 702.8 278 C702 283 696.5 286.8 688.5 288.6 C691.8 284.2 693.3 280.4 693.3 276.4 C693.3 272 692.2 267.6 690 263.5 Z" fill="rgba(120,106,82,0.25)" stroke="rgba(14,10,6,0.5)" stroke-width="1"/>
    <path d="M681 192.5 C688 196 691.5 201 690.5 206.5 C689.3 211.8 684.5 215.4 677.5 217.2" stroke="rgba(3,2,1,0.5)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M690.5 225.2 C699 229.3 703.2 234.8 702.2 240.6 C701 246.2 695.4 250.2 687.6 252.4" stroke="rgba(3,2,1,0.5)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M692.5 263 C700 267 703.4 272.4 702.6 278 C701.6 283.6 696.6 287.4 689.4 289.4" stroke="rgba(3,2,1,0.5)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M691.5 301.5 C699.5 305.5 703.4 311 702.4 316.6 C701.2 322.2 696 326.2 688.6 328.2" stroke="rgba(3,2,1,0.5)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M698.5 399 C701.5 423 698 449 691.5 473" stroke="rgba(3,2,1,0.45)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M679.5 193.8 C686 197.2 689.6 201.8 688.7 206.2 C687.7 210.6 683 214 676.5 215.8" stroke="rgba(120,236,170,0.2)" stroke-width="3.6" fill="none" filter="url(#th-b2)"/>
    <path d="M679.5 193.8 C686 197.2 689.6 201.8 688.7 206.2 C687.7 210.6 683 214 676.5 215.8" stroke="rgba(150,246,188,0.32)" stroke-width="1.5" fill="none"/>
    <path d="M688.5 226.4 C697 230.4 700.9 235.2 700 240 C699.1 245 692.8 248.9 684.5 250.9" stroke="rgba(120,236,170,0.2)" stroke-width="3.6" fill="none" filter="url(#th-b2)"/>
    <path d="M688.5 226.4 C697 230.4 700.9 235.2 700 240 C699.1 245 692.8 248.9 684.5 250.9" stroke="rgba(150,246,188,0.32)" stroke-width="1.5" fill="none"/>
    <path d="M691.5 263.4 C700.2 267.6 703.9 272.8 703 278 C702.1 283.2 695.6 286.9 687.5 288.9" stroke="rgba(120,236,170,0.2)" stroke-width="3.6" fill="none" filter="url(#th-b2)"/>
    <path d="M691.5 263.4 C700.2 267.6 703.9 272.8 703 278 C702.1 283.2 695.6 286.9 687.5 288.9" stroke="rgba(150,246,188,0.32)" stroke-width="1.5" fill="none"/>
    <path d="M689.5 302.4 C698.2 306.5 701.9 311.2 701 316 C700.1 321 693.6 324.9 685.5 326.9" stroke="rgba(120,236,170,0.2)" stroke-width="3.6" fill="none" filter="url(#th-b2)"/>
    <path d="M689.5 302.4 C698.2 306.5 701.9 311.2 701 316 C700.1 321 693.6 324.9 685.5 326.9" stroke="rgba(150,246,188,0.32)" stroke-width="1.5" fill="none"/>
    <path d="M699.2 394.5 C702 402 702.6 409.5 700.6 418.5 C696.4 437.5 691.9 458 689 478" stroke="rgba(120,236,170,0.14)" stroke-width="3.6" fill="none" filter="url(#th-b2)"/>
    <path d="M699.2 394.5 C702 402 702.6 409.5 700.6 418.5 C696.4 437.5 691.9 458 689 478" stroke="rgba(150,246,188,0.2)" stroke-width="1.2" fill="none"/>
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
    // Strike-wide surface wind (1.8-2.7 m/s, random heading): rides the
    // falling-bomb smoke puffs so each trail bends downwind instead of
    // hanging as a ruler-straight plumb line.
    const windA = Math.random() * Math.PI * 2;
    this.wind = new THREE.Vector3(Math.cos(windA), 0, Math.sin(windA)).multiplyScalar(1.8 + Math.random() * 0.9);
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

    // Refresh sweep — drawn INTO the feed, UNDER every symbology layer, so
    // the reticle/aircraft/labels keep full contrast (the old CSS overlay
    // parked two hard bands over the glass). ONE ~60px band at 14% white
    // with 20px feathered edges, plus a ~10%-opacity ghost echo trailing
    // 30px behind the leading edge. Wall-clock so it sweeps while frozen.
    const sweepLead = ((now % 3.8) / 3.8) * (H + 210) - 105;
    for (const [lead, peak] of [[sweepLead, 0.14], [sweepLead - 30, 0.05]]) {
      const sg = c.createLinearGradient(0, lead - 60, 0, lead);
      sg.addColorStop(0, 'rgba(235, 255, 244, 0)');
      sg.addColorStop(0.33, `rgba(235, 255, 244, ${peak})`);
      sg.addColorStop(0.67, `rgba(235, 255, 244, ${peak})`);
      sg.addColorStop(1, 'rgba(235, 255, 244, 0)');
      c.fillStyle = sg;
      c.fillRect(0, lead - 60, W, 60);
    }

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
    // Stick pattern: 7 bombs in THREE discrete clusters (2-3-2). Offsets
    // are metres of jet travel between releases which — with identical
    // ballistics per bomb — equal metres between impacts: 4 m inside a
    // cluster, 18 m centre-to-centre across cluster boundaries. With the
    // fireball reaching ~4.9 m from each impact that leaves ~7-9 m of dark
    // ground between the three fire columns, so the strike reads as
    // separate bombs instead of one continuous napalm carpet.
    const STICK_M = [0, 4, 22, 26, 30, 48, 52];
    for (let i = 0; i < STICK_M.length; i++) {
      this.bombs.push({
        mesh: null,
        jet,
        delay: (STICK_M[i] + (Math.random() - 0.5) * 1.2) / jet.speed,
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
    // Per-bomb wind sample: shared strike heading, ±20% strength plus a
    // small kick, so the trails all lean the same way without cloning.
    b.wind = this.wind.clone().multiplyScalar(0.8 + Math.random() * 0.4);
    b.wind.x += (Math.random() - 0.5) * 0.6;
    b.wind.z += (Math.random() - 0.5) * 0.6;
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
      // Bomb release ~163m short of target: 137m ballistic lead + 26m so
      // the 52m clustered stick straddles the mark (centre cluster on it)
      if (!j.dropped && j.mesh.position.x > this.target.x - 163) {
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
        // De-ruler the trail: ±0.35m lateral spawn jitter per puff, and the
        // per-bomb wind rides the puff velocity so older (higher) puffs have
        // drifted further downwind — each column bends instead of hanging
        // as a dead-straight vertical line.
        p.x += (Math.random() - 0.5) * 0.7;
        p.z += (Math.random() - 0.5) * 0.7;
        this.fx.contrail.spawn({
          pos: p,
          vel: spd > 1e-3
            ? new THREE.Vector3(b.vel.x / spd * 0.3 + b.wind.x, b.vel.y / spd * 0.3 + 0.25, b.vel.z / spd * 0.3 + b.wind.z)
            : new THREE.Vector3(b.wind.x, 0.3, b.wind.z),
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
