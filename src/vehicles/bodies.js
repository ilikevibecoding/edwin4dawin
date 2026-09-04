import * as THREE from 'three';
import { archCut, bend, bolt, cyl, cylX, cylZ, decal, gbox, jit, paneGeo, pbox, rectLamp, roundLamp, sidePanel, tube } from './parts.js';
import { grime } from './kit.js';

// ---------------------------------------------------------------------------
// Bodies: the bonneted 4x4 family (wagon, pickup, open jeep, medium truck), the
// cab-over truck cab, cargo boxes, flat decks, roll cages and interiors.
// Everything here is a parametric silhouette; the kinds in kinds.js pick the
// proportions and the gear.
// ---------------------------------------------------------------------------

const SKIN = 0.05;
const BEVEL = 0.012;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Dark shut line: a thin recessed strip in the panel. */
export function shutLine(k, { x, y0, y1, z, w = 0.03, tint = 0x0c0d0e }) {
  k.add('gap', pbox(0.006, y1 - y0, w), { pos: [x, (y0 + y1) * 0.5, z], tint });
}

function hShut(k, { x, y, z0, z1, w = 0.03 }) {
  k.add('gap', pbox(0.006, w, z1 - z0), { pos: [x, y, (z0 + z1) * 0.5], tint: 0x0c0d0e });
}

/** Wheel opening: dark tub inside, moulded flare round the lip. */
function archTub(k, { z, r, hw, flare = true, flareKey = 'trim', flareTint = 0x383c41, width = 0.5 }) {
  k.addMirrored('gap', cylX(r - 0.005, r - 0.005, width, 18, true), { pos: [hw - width * 0.5 - 0.02, r * 0.98, z], tint: 0x0b0c0d });
  k.addMirrored('gap', cylX(r - 0.006, 0.05, 0.02, 18), { pos: [hw - width - 0.02, r * 0.98, z], tint: 0x0b0c0d });
  if (flare) {
    k.addMirrored(flareKey, bend(r + 0.02, 0.03, Math.PI, 14), { pos: [hw + 0.005, r * 0.98, z], rot: [0, Math.PI / 2, 0], tint: flareTint });
    k.addMirrored(flareKey, bend(r + 0.03, 0.012, Math.PI, 14), { pos: [hw + 0.03, r * 0.98, z], rot: [0, Math.PI / 2, 0], tint: flareTint });
  }
}

/** A door mirror on an arm off the A pillar. */
export function doorMirror(k, { x, y, z, side, arm = 0.14, big = false, tint = 0x383c41, frame = false }) {
  const w = big ? 0.26 : 0.19;
  const h = big ? 0.32 : 0.13;
  const mx = x + side * arm;
  if (frame) {
    // truck mirror: a tubular frame off two stalks, the head hung inside it
    k.add('steel', tube([[x, y + h * 0.5 + 0.06, z], [mx + side * 0.03, y + h * 0.5 + 0.06, z], [mx + side * 0.03, y - h * 0.5 - 0.06, z], [x, y - h * 0.5 - 0.06, z]], 0.011, 8, 0.1), { tint: 0x3a3d40 });
    k.add('steel', gbox(0.03, h + 0.16, 0.03, 0.005), { pos: [mx + side * 0.03, y, z], tint: 0x3a3d40 });
  } else {
    k.add('steel', gbox(arm + 0.04, 0.02, 0.035, 0.005), { pos: [x + side * arm * 0.5, y + 0.02, z], tint: 0x3a3d40 });
  }
  k.add('trim', gbox(0.05, h, w, 0.014), { pos: [mx, y, z], tint });
  k.add('chrome', pbox(0.006, h - 0.03, w - 0.03), { pos: [mx - side * 0.024, y, z], tint: 0xdfe6ea });
}

/** Wiper arm and blade lying across the base of a screen. */
function wipers(k, { x0, y, z, rake, n = 2, len = 0.45 }) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 0.55;
    k.add('trim', pbox(0.015, 0.012, len), { pos: [x, y + 0.03, z - 0.01], rot: [rake, 0, i ? -1.15 : -1.0], tint: 0x2e3135 });
    k.add('trim', pbox(0.012, 0.02, len * 0.9), { pos: [x + 0.02, y + 0.05, z - 0.02], rot: [rake, 0, i ? -1.15 : -1.0], tint: 0x2e3135 });
  }
}

/** Two front seats and, optionally, a rear bench. Coarse: seen through glass. */
export function cabin(k, { hw, floorY, belt = null, z, rhd = true, rear = false, seatTint = 0x4a4438, dashTint = 0x3a3631, wheelZ = null, open = false }) {
  // the dash hangs from the belt line (the screen's sill); the seats stand on the floor
  const dashTop = (belt ?? floorY + 0.75) - 0.03;
  const seatH = clamp(dashTop + 0.4 - (floorY + 0.42), 0.4, 0.62);
  const seat = (x, zz, w = 0.5) => {
    k.add('fabric', gbox(w, 0.12, 0.5, 0.03), { pos: [x, floorY + 0.36, zz], shade: grime(seatTint, { up: 0.35, down: 0.3 }) });
    k.add('fabric', gbox(w, seatH, 0.1, 0.03), { pos: [x, floorY + 0.42 + seatH * 0.5, zz - 0.28], rot: [-0.18, 0, 0], shade: grime(seatTint, { up: 0.35, down: 0.3 }) });
    k.add('fabric', gbox(0.24, 0.16, 0.08, 0.03), { pos: [x, floorY + 0.5 + seatH, zz - 0.36], shade: grime(seatTint, { up: 0.3, down: 0.3 }) });
    k.add('steel', gbox(w - 0.1, 0.24, 0.42, 0.02), { pos: [x, floorY + 0.14, zz], tint: 0x3a3d40 });
  };
  const sx = hw * 0.5;
  seat(sx, z);
  seat(-sx, z);
  if (rear) {
    k.add('fabric', gbox(hw * 2 - 0.3, 0.12, 0.5, 0.03), { pos: [0, floorY + 0.36, z - 0.85], shade: grime(seatTint, { up: 0.35 }) });
    k.add('fabric', gbox(hw * 2 - 0.3, seatH, 0.1, 0.03), { pos: [0, floorY + 0.42 + seatH * 0.5, z - 1.12], rot: [-0.15, 0, 0], shade: grime(seatTint, { up: 0.35 }) });
  }
  // dash, binnacle, wheel: the dash ends just behind the screen base (wheelZ)
  const dz = wheelZ ?? z + 0.85;
  const dashH = clamp(dashTop - floorY - 0.42, 0.14, 0.3);
  k.add('vinyl', gbox(hw * 2 - 0.12, dashH, 0.44, 0.04), { pos: [0, dashTop - 0.03 - dashH * 0.5, dz - 0.22], shade: grime(dashTint, { up: 0.6, dust: 0x8d7f63 }) });
  k.add('vinylFaded', gbox(hw * 2 - 0.16, 0.03, 0.4, 0.01), { pos: [0, dashTop - 0.015, dz - 0.22], shade: grime(0x4a423a, { up: 0.7, dust: 0x9a8b6b }) });
  const wx = rhd ? sx : -sx;
  const wy = dashTop - 0.1;
  k.add('vinyl', new THREE.TorusGeometry(0.19, 0.02, 8, 22), { pos: [wx, wy, dz - 0.5], rot: [-0.45, 0, 0], tint: 0x2b2926 });
  k.add('vinyl', cyl(0.05, 0.05, 0.05, 10), { pos: [wx, wy, dz - 0.5], rot: [-0.45 + Math.PI / 2, 0, 0], tint: 0x2b2926 });
  k.add('steel', cyl(0.02, 0.02, 0.32, 8), { pos: [wx, wy - 0.08, dz - 0.34], rot: [-0.9, 0, 0], tint: 0x3a3d40 });
  // floor mats and a transmission tunnel, from behind the seats to the bulkhead
  const matZ0 = z - 0.55;
  const matZ1 = dz - 0.06;
  k.add('vinyl', gbox(hw * 2 - 0.2, 0.03, matZ1 - matZ0, 0.01), { pos: [0, floorY + 0.02, (matZ0 + matZ1) * 0.5], shade: grime(0x3c3935, { up: 0.5, dust: 0x7a6d55 }) });
  if (!open) k.add('vinyl', gbox(0.36, 0.22, matZ1 - matZ0 - 0.1, 0.05), { pos: [0, floorY + 0.12, (matZ0 + matZ1) * 0.5], tint: 0x3a3631 });
}

/**
 * The bonneted 4x4 family.
 *
 *  style 'wagon'  : closed body to the tail, tailgate with glass
 *  style 'pickup' : cab, bulkhead, open bed
 *  style 'open'   : cut-down flanks, no roof, fold-flat screen frame
 *  style 'truck'  : tall upright cab with a bonnet, for the medium truck
 */
export function bonnetBody(k, o) {
  const {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail, front, rear, r,
    style = 'wagon', doors = 4, paintKey = 'paint', paint, glassKey = 'glass', brokenPane = false,
    lightsOn = false, markersOn = lightsOn, rhd = true, rake = 0.32, roundLamps = true, flareKey = 'trim', flareTint = 0x383c41,
    interior = true, seatTint = 0x4a4438, bedFloor = null, roofRailKey = null, bullbar = false, cabW = null,
    missingPanel = false, crackedLens = false, edge = 0,
  } = o;
  const P = paint; // shade fn
  const ar = r + 0.11;
  const skinX = hw - SKIN * 0.5 - BEVEL;
  const open = style === 'open';
  const fenderTop = hood - 0.04;
  const flankTop = open ? belt - 0.22 : belt;
  const bedTop = style === 'pickup' ? belt - 0.04 : flankTop;
  const bedStart = style === 'pickup' ? cabRear - 0.04 : null;

  // --- flank outline, nose to tail along the sill and back over the top ------
  const truck = style === 'truck';
  const pts = [[nose - 0.02, sill]];
  pts.push(...archCut(front, ar, sill));
  if (!truck) pts.push(...archCut(rear, ar, sill));
  pts.push([tail + 0.01, sill]);
  if (style === 'pickup') {
    pts.push([tail + 0.01, bedTop], [bedStart, bedTop], [bedStart, flankTop]);
  } else {
    pts.push([tail + 0.01, flankTop]);
  }
  pts.push([cabFront + 0.06, flankTop], [cabFront + 0.06, fenderTop], [nose - 0.02, fenderTop - 0.02]);
  const flank = sidePanel(pts, SKIN, BEVEL);
  k.addMirrored(paintKey, flank, { pos: [skinX, 0, 0], shade: P });

  // --- arches -----------------------------------------------------------------
  archTub(k, { z: front, r: ar, hw, flareKey, flareTint });
  if (!truck) archTub(k, { z: rear, r: ar, hw, flareKey, flareTint });

  // --- floor and structure ------------------------------------------------------
  const floorY = sill + 0.04;
  k.add('trim', gbox(hw * 2 - 0.12, 0.04, nose - tail - 0.3, 0.01), { pos: [0, sill + 0.02, (nose + tail) * 0.5], tint: 0x32363b });
  // sills / rock sliders
  k.addMirrored('steel', gbox(0.06, 0.07, cabFront - cabRear + (style === 'wagon' ? 1.2 : 0.4), 0.014), {
    pos: [hw - 0.02, sill - 0.02, (cabFront + cabRear) * 0.5 - (style === 'wagon' ? 0.4 : 0.1)],
    shade: grime(0x3d4043, { up: 0.5, down: 0.4 }),
  });

  // --- nose: grille, lamps, bumper ------------------------------------------------
  const noseH = fenderTop - sill - 0.06;
  k.add(paintKey, gbox(hw * 2 - 0.1, noseH, 0.08, 0.02), { pos: [0, sill + 0.03 + noseH * 0.5, nose - 0.04], shade: P });
  // grille recess with horizontal slats
  const gh = Math.min(0.32, noseH * 0.5);
  const gy = fenderTop - 0.12 - gh * 0.5;
  const gw = hw * 0.9;
  k.add('gap', pbox(gw, gh, 0.03), { pos: [0, gy, nose + 0.002], tint: 0x0a0b0c });
  const slats = style === 'truck' ? 7 : 5;
  if (missingPanel) {
    // the grille is gone: the radiator core and its two hoses show through the hole
    k.add('steel', pbox(gw - 0.1, gh - 0.06, 0.02), { pos: [0, gy, nose - 0.05], shade: grime(0x2e3134, { up: 0.5, down: 0.6 }) });
    for (let i = 0; i < 9; i++) k.add('gap', pbox(0.008, gh - 0.08, 0.01), { pos: [-gw * 0.4 + i * gw * 0.1, gy, nose - 0.038], tint: 0x101112 });
    k.add('rubber', tube([[-gw * 0.42, gy + gh * 0.4, nose - 0.06], [-gw * 0.3, gy + gh * 0.55, nose - 0.02], [-gw * 0.18, gy + gh * 0.52, nose - 0.005]], 0.018, 6), { tint: 0x26272a });
    k.add('trim', gbox(0.05, 0.03, 0.02, 0.004), { pos: [gw * 0.5 - 0.02, gy - gh * 0.45, nose + 0.01], tint: 0x3c4045 });
  } else {
    for (let i = 0; i < slats; i++) {
      k.add('trim', gbox(gw - 0.02, 0.022, 0.03, 0.004), { pos: [0, gy - gh * 0.5 + (i + 0.5) * (gh / slats), nose + 0.012], tint: 0x3c4045 });
    }
  }
  k.add('trim', gbox(gw + 0.05, gh + 0.05, 0.04, 0.008), { pos: [0, gy, nose - 0.01], tint: 0x32363b });
  k.add('gap', pbox(gw - 0.02, gh - 0.02, 0.03), { pos: [0, gy, nose + 0.004], tint: 0x0a0b0c });
  const lampY = gy + 0.02;
  const lampX = hw - 0.3;
  if (roundLamps) {
    // the kerb-side lamp takes the stone strikes on a left-hand road
    for (const s of [-1, 1]) roundLamp(k, { pos: [s * lampX, lampY, nose + 0.02], r: style === 'truck' ? 0.11 : 0.095, on: lightsOn, bezel: 'chrome', bezelTint: 0xb8bcbf, cracked: crackedLens && s < 0 });
  } else {
    for (const s of [-1, 1]) rectLamp(k, { pos: [s * lampX, lampY, nose + 0.03], w: 0.3, h: 0.14, kind: 'head', on: lightsOn, segments: ['head', 'amber'] });
  }
  for (const s of [-1, 1]) roundLamp(k, { pos: [s * (hw - 0.14), lampY - 0.22, nose + 0.02], r: 0.035, kind: 'amber', on: markersOn, depth: 0.03 });
  // bumper
  k.add('steel', gbox(hw * 2 + 0.06, 0.15, 0.14, 0.02), { pos: [0, sill - 0.02, nose + 0.04], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
  k.add('steel', gbox(hw * 2 - 0.4, 0.04, 0.16, 0.008), { pos: [0, sill - 0.12, nose + 0.06], shade: grime(0x3d4144, { up: 0.6, down: 0.45 }) });
  if (bullbar) {
    const bz = nose + 0.22;
    const by = sill + 0.22;
    const bar = grime(0x3a3e42, { up: 0.55, down: 0.4 });
    k.add('steel', tube([[-hw - 0.02, by, bz - 0.12], [-hw + 0.1, by, bz], [hw - 0.1, by, bz], [hw + 0.02, by, bz - 0.12]], 0.032, 10), { shade: bar });
    k.add('steel', tube([[-hw + 0.3, by + 0.02, bz - 0.02], [-hw + 0.3, hood - 0.02, bz - 0.06], [-hw + 0.5, hood + 0.02, bz - 0.14]], 0.028, 10), { shade: bar });
    k.add('steel', tube([[hw - 0.3, by + 0.02, bz - 0.02], [hw - 0.3, hood - 0.02, bz - 0.06], [hw - 0.5, hood + 0.02, bz - 0.14]], 0.028, 10), { shade: bar });
    k.add('steel', tube([[-hw + 0.3, hood - 0.14, bz - 0.04], [0, hood - 0.14, bz - 0.02], [hw - 0.3, hood - 0.14, bz - 0.04]], 0.026, 10), { shade: bar });
    k.addMirrored('steel', gbox(0.05, by - sill + 0.3, 0.06, 0.01), { pos: [hw - 0.3, sill + 0.05, bz - 0.09], shade: bar });
  }

  // --- bonnet -----------------------------------------------------------------
  const bonnetLen = nose - cabFront - 0.06;
  k.add(paintKey, gbox(hw * 2 - 0.14, 0.07, bonnetLen, 0.03), { pos: [0, hood - 0.035, cabFront + 0.04 + bonnetLen * 0.5], rot: [0.02, 0, 0], shade: P });
  // bonnet shut lines
  for (const s of [-1, 1]) k.add('gap', pbox(0.006, 0.006, bonnetLen - 0.06), { pos: [s * (hw - 0.09), hood + 0.002, cabFront + 0.04 + bonnetLen * 0.5], tint: 0x0c0d0e });
  k.add('gap', pbox(hw * 2 - 0.2, 0.006, 0.006), { pos: [0, hood + 0.002, nose - 0.1], tint: 0x0c0d0e });
  // cowl / scuttle and wipers
  k.add(paintKey, gbox(hw * 2 - 0.1, 0.05, 0.16, 0.012), { pos: [0, hood - 0.01, cabFront + 0.02], shade: P });
  k.add('trim', pbox(hw * 2 - 0.4, 0.012, 0.09), { pos: [0, hood + 0.016, cabFront + 0.02], tint: 0x32363b });
  wipers(k, { x0: -hw * 0.4, y: hood, z: cabFront - 0.02, rake: -rake * 1.2 });

  // --- glasshouse -------------------------------------------------------------
  const wsBottom = belt + 0.02;
  const wsTop = open ? belt + 0.55 : roof - 0.05;
  const wsH = Math.hypot(wsTop - wsBottom, rake);
  const wsAng = Math.atan2(rake, wsTop - wsBottom);
  const wsZ = cabFront - rake * 0.5;
  const wsY = (wsBottom + wsTop) * 0.5;
  const pillarW = 0.07;
  const cw = cabW ?? hw;
  k.pane(brokenPane ? 'glassCracked' : glassKey, paneGeo(cw * 2 - 0.2, wsH - 0.04, 0.02), { pos: [0, wsY, wsZ], rot: [-wsAng, 0, 0] });
  // A pillars and header
  k.addMirrored(paintKey, gbox(pillarW, wsH + 0.02, 0.09, 0.012), { pos: [cw - 0.07, wsY, wsZ], rot: [-wsAng, 0, 0], shade: P });
  k.add(paintKey, gbox(cw * 2 - 0.08, 0.07, 0.1, 0.012), { pos: [0, wsTop + 0.02, cabFront - rake - 0.03], shade: P });
  k.add('gap', pbox(cw * 2 - 0.24, 0.02, 0.02), { pos: [0, wsBottom - 0.005, cabFront + 0.005], tint: 0x0c0d0e });

  if (!open) {
    // roof over the closed section
    const roofRear = style === 'wagon' ? tail + 0.04 : cabRear;
    const roofFront = cabFront - rake - 0.06;
    const roofLen = roofFront - roofRear;
    k.add(paintKey, gbox(cw * 2 - 0.1, 0.06, roofLen, 0.03), { pos: [0, roof - 0.03, (roofFront + roofRear) * 0.5], shade: P });
    if (roofLen > 0.6) k.add(paintKey, gbox(cw * 2 - 0.5, 0.03, roofLen - 0.3, 0.012), { pos: [0, roof + 0.005, (roofFront + roofRear) * 0.5], shade: P });
    // drip rails
    k.addMirrored('trim', pbox(0.02, 0.02, roofLen - 0.1), { pos: [cw - 0.04, roof - 0.04, (roofFront + roofRear) * 0.5], tint: 0x32363b });
    // side glass: door panes divided by the B pillar, quarter glass on a wagon
    const doorSplit = doors === 4 ? cabFront - 0.05 - (cabFront - cabRear) * 0.5 : cabRear + 0.05;
    const glassBottom = belt + 0.03;
    const glassTop = roof - 0.08;
    const gy2 = (glassBottom + glassTop) * 0.5;
    const gh2 = glassTop - glassBottom;
    const paneAt = (z0, z1, key = glassKey) => {
      for (const s of [-1, 1]) {
        k.pane(key, paneGeo(z1 - z0 - 0.02, gh2 - 0.02), { pos: [s * (cw - 0.03), gy2, (z0 + z1) * 0.5], rot: [0, s * Math.PI / 2, 0] });
      }
    };
    const pillar = (z, w = pillarW) => {
      k.addMirrored(paintKey, gbox(0.06, gh2 + 0.06, w, 0.01), { pos: [cw - 0.04, gy2, z], shade: P });
    };
    // front door glass
    paneAt(doorSplit + 0.04, cabFront - rake * 0.35);
    pillar(doorSplit);
    if (doors === 4) {
      paneAt(cabRear + 0.05, doorSplit - 0.04);
      pillar(cabRear + 0.02);
    } else {
      pillar(cabRear + 0.02);
    }
    if (style === 'wagon') {
      paneAt(tail + 0.16, cabRear - 0.02, glassKey);
      pillar(tail + 0.13, 0.1);
      // tailgate: panel, glass, hinge line, handle, lamps
      k.add(paintKey, gbox(cw * 2 - 0.12, belt - sill - 0.08, 0.06, 0.02), { pos: [0, (belt + sill) * 0.5 + 0.02, tail + 0.01], shade: P });
      k.pane(glassKey, paneGeo(cw * 2 - 0.34, gh2 - 0.04), { pos: [0, gy2, tail], rot: [0, Math.PI, 0] });
      k.add(paintKey, gbox(cw * 2 - 0.12, 0.08, 0.06, 0.012), { pos: [0, roof - 0.08, tail + 0.01], shade: P });
      k.addMirrored(paintKey, gbox(0.1, gh2, 0.06, 0.012), { pos: [cw - 0.1, gy2, tail + 0.01], shade: P });
      k.add('chrome', gbox(0.2, 0.03, 0.02, 0.006), { pos: [0.3, belt - 0.1, tail - 0.03], tint: 0xb9bec2 });
      for (const s of [-1, 1]) rectLamp(k, { pos: [s * (cw - 0.24), sill + 0.5, tail - 0.02], w: 0.16, h: 0.3, dir: -1, on: markersOn, segments: ['tail', 'amber'] });
      decal(k, 'plate', { w: 0.42, h: 0.1, pos: [0, sill + 0.3, tail - 0.045], rot: [0, Math.PI, 0] });
    } else if (style === 'pickup' || style === 'truck') {
      // cab back wall and rear window
      k.add(paintKey, gbox(cw * 2 - 0.1, roof - belt - 0.05, 0.06, 0.02), { pos: [0, (roof + belt) * 0.5 - 0.02, cabRear - 0.02], shade: P });
      k.pane(glassKey, paneGeo(cw * 2 - 0.6, gh2 - 0.14), { pos: [0, gy2, cabRear - 0.06], rot: [0, Math.PI, 0] });
      k.add('gap', pbox(cw * 2 - 0.58, gh2 - 0.12, 0.01), { pos: [0, gy2, cabRear - 0.04], tint: 0x0a0b0c });
    }
    // door mirrors
    for (const s of [-1, 1]) doorMirror(k, { x: s * (cw + 0.02), y: belt + 0.22, z: cabFront - rake * 0.55 - 0.1, side: s, big: style === 'truck' });
  } else {
    // open body: a fold-down screen frame, no roof
    k.add(paintKey, gbox(cw * 2 - 0.1, 0.05, 0.06, 0.01), { pos: [0, wsBottom, cabFront], shade: P });
    for (const s of [-1, 1]) doorMirror(k, { x: s * (cw + 0.02), y: belt + 0.28, z: cabFront - 0.1, side: s });
  }

  // --- doors: shut lines, handles, hinges -------------------------------------
  const doorZs = doors === 4 ? [cabFront - 0.02, cabFront - 0.02 - (cabFront - cabRear) * 0.5, cabRear] : [cabFront - 0.02, cabRear];
  const doorTop = flankTop - 0.03;
  for (const z of doorZs) {
    for (const s of [-1, 1]) shutLine(k, { x: s * (hw + 0.002), y0: sill + 0.06, y1: doorTop, z });
  }
  if (!open) for (const s of [-1, 1]) hShut(k, { x: s * (hw + 0.002), y: doorTop, z0: cabRear, z1: cabFront - 0.02 });
  for (let i = 0; i + 1 < doorZs.length; i++) {
    const hz = doorZs[i + 1] + 0.18;
    for (const s of [-1, 1]) {
      k.add('trim', gbox(0.02, 0.03, 0.15, 0.006), { pos: [s * (hw + 0.006), belt - 0.16, hz], tint: 0x32363b });
      k.add('chrome', gbox(0.014, 0.022, 0.1, 0.004), { pos: [s * (hw + 0.016), belt - 0.16, hz + 0.01], tint: 0xb4b8bb });
    }
  }
  // swage line along the flank
  for (const s of [-1, 1]) k.add(paintKey, pbox(0.012, 0.03, (style === 'pickup' ? tail : cabRear) * -1 + cabFront - 0.1), { pos: [s * (hw + 0.004), sill + (flankTop - sill) * 0.42, ((style === 'pickup' ? tail : cabRear) + cabFront) * 0.5 - 0.05], shade: P });

  // --- pickup bed ---------------------------------------------------------------
  if (style === 'pickup') {
    const bf = bedFloor ?? sill + 0.3;
    const bz = (bedStart + tail) * 0.5;
    const bl = bedStart - tail - 0.06;
    k.add('trim', gbox(hw * 2 - 0.14, 0.04, bl, 0.01), { pos: [0, bf, bz], shade: grime(0x32363b, { up: 0.6, dust: 0x6f6350 }) });
    k.addMirrored('trim', gbox(0.05, bedTop - bf - 0.03, bl, 0.01), { pos: [hw - 0.1, (bf + bedTop) * 0.5, bz], shade: grime(0x32363b, { up: 0.5, dust: 0x6f6350 }) });
    // bulkhead behind the cab
    k.add(paintKey, gbox(hw * 2 - 0.1, bedTop - sill - 0.06, 0.05, 0.012), { pos: [0, (bedTop + sill) * 0.5, bedStart - 0.03], shade: P });
    // tailgate with a hinge line and latch handle
    k.add(paintKey, gbox(hw * 2 - 0.12, bedTop - bf - 0.02, 0.05, 0.012), { pos: [0, (bedTop + bf) * 0.5, tail + 0.01], shade: P });
    k.add('gap', pbox(hw * 2 - 0.16, 0.012, 0.01), { pos: [0, bf + 0.02, tail - 0.018], tint: 0x0c0d0e });
    k.add('trim', gbox(0.2, 0.05, 0.03, 0.008), { pos: [0, bedTop - 0.1, tail - 0.03], tint: 0x32363b });
    // bed rail caps
    k.addMirrored('trim', gbox(0.1, 0.03, bl + 0.06, 0.008), { pos: [hw - 0.06, bedTop + 0.005, bz], tint: 0x32363b });
    // wheel tubs inside the bed
    const tub = new THREE.CylinderGeometry(ar - 0.02, ar - 0.02, 0.3, 14, 1, true, 0, Math.PI);
    tub.rotateZ(Math.PI / 2);
    k.addMirrored('trim', tub, { pos: [hw - 0.22, r * 0.98, rear], shade: grime(0x32363b, { up: 0.6, dust: 0x6f6350 }) });
    for (const s of [-1, 1]) rectLamp(k, { pos: [s * (hw - 0.2), bf + 0.26, tail - 0.02], w: 0.14, h: 0.34, dir: -1, on: markersOn, segments: ['tail', 'amber'] });
    // rear bumper / step
    k.add('steel', gbox(hw * 2 + 0.02, 0.12, 0.14, 0.02), { pos: [0, sill - 0.03, tail - 0.06], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
    decal(k, 'plate2', { w: 0.42, h: 0.1, pos: [0, bf + 0.1, tail - 0.04], rot: [0, Math.PI, 0] });
  }
  if (open) {
    // rear panel and the cut-down tail
    k.add(paintKey, gbox(hw * 2 - 0.12, flankTop - sill - 0.06, 0.05, 0.012), { pos: [0, (flankTop + sill) * 0.5, tail + 0.01], shade: P });
    k.add('steel', gbox(hw * 2 + 0.02, 0.1, 0.12, 0.02), { pos: [0, sill - 0.02, tail - 0.05], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
    for (const s of [-1, 1]) roundLamp(k, { pos: [s * (hw - 0.22), sill + 0.28, tail - 0.02], r: 0.055, dir: -1, kind: 'tail', on: markersOn, depth: 0.04 });
  }
  if (style === 'wagon') {
    k.add('steel', gbox(hw * 2 + 0.02, 0.12, 0.14, 0.02), { pos: [0, sill - 0.03, tail - 0.06], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
  }
  if (truck) {
    // the cab's own back wall below the window, down to the frame
    k.add(paintKey, gbox(hw * 2 - 0.12, belt - sill - 0.04, 0.05, 0.012), { pos: [0, (belt + sill) * 0.5, tail + 0.01], shade: P });
  }

  // --- interior -----------------------------------------------------------------
  if (interior) cabin(k, { hw, floorY, belt, z: cabFront - 0.95, rhd, rear: doors === 4 || style === 'wagon', seatTint, wheelZ: cabFront - 0.05, open });

  return { floorY, ar, wsTop, wsZ, wsAng, flankTop, bedTop, bedFloor: bedFloor ?? sill + 0.3 };
}

/**
 * Cab-over truck cab: a tall flat front with a two-piece screen, the doors set
 * high over the wheel, steps up to them, big mirrors on arms. Ground floor is
 * the frame top, `floorY`.
 */
export function cabOverCab(k, o) {
  const {
    hw, floorY, roof, front, rear, wheelZ, r, paintKey = 'paint', paint: P, glassKey = 'glass', lightsOn = false, markersOn = lightsOn, rhd = true, seatTint = 0x4a4438,
    skirt = 0.42, bumperY = floorY - 0.32, beltUp = 0.95, brokenPane = false, big = true,
    missingPanel = false, crackedLens = false, bevel = BEVEL, roofPaint = null,
  } = o;
  const h = roof - floorY;
  const belt = floorY + beltUp;
  const cz = (front + rear) * 0.5;
  const len = front - rear;
  const PR = roofPaint ?? P;
  // shell: front panel, flanks with the arch cut into the lower skirt, roof
  k.add(paintKey, gbox(hw * 2 - 0.08, belt - floorY + skirt, 0.08, bevel), { pos: [0, floorY + (belt - floorY + skirt) * 0.5 - skirt, front - 0.04], shade: P });
  k.add(paintKey, gbox(hw * 2 - 0.08, 0.14, 0.08, bevel), { pos: [0, roof - 0.1, front - 0.04], shade: PR });
  const ar = r + 0.12;
  const sill = floorY - skirt;
  // The flank is stamped up to the belt; above it the glasshouse is framed
  // out of pillars, a header and a belt strip, so the door window is an
  // opening with a pane in it rather than a rectangle drawn on the skin.
  const doorF = front - 0.42;
  const doorR = rear + 0.1;
  const gB = belt + 0.05;
  const gT = roof - 0.24;
  const pts = [[front - 0.02, sill], ...archCut(wheelZ, ar, sill), [rear + 0.01, sill], [rear + 0.01, belt + 0.01], [front - 0.02, belt + 0.01]];
  const skinX = hw - SKIN * 0.5 - bevel;
  k.addMirrored(paintKey, sidePanel(pts, SKIN, bevel), { pos: [skinX, 0, 0], shade: P });
  const upper = (z0, z1, y0, y1) => k.addMirrored(paintKey, gbox(SKIN + bevel * 2, y1 - y0, z0 - z1, bevel), { pos: [skinX, (y0 + y1) * 0.5, (z0 + z1) * 0.5], shade: P });
  const winF = doorF - 0.07;
  const winR = doorR + 0.07;
  upper(front - 0.02, winF, belt, roof - 0.02); // A pillar and the front corner
  upper(winR, rear + 0.01, belt, roof - 0.02); // B pillar back to the rear corner
  upper(winF, winR, gT, roof - 0.02); // cant rail over the door glass
  upper(winF, winR, belt, gB); // belt strip under it
  k.addMirrored('gap', cylX(ar - 0.005, ar - 0.005, 0.5, 18, true), { pos: [hw - 0.27, ar * 0.98, wheelZ], tint: 0x0b0c0d });
  k.addMirrored('trim', bend(ar + 0.02, 0.028, Math.PI, 14), { pos: [hw + 0.004, ar * 0.98, wheelZ], rot: [0, Math.PI / 2, 0], tint: 0x383c41 });
  k.add(paintKey, gbox(hw * 2 - 0.1, 0.06, len - 0.06, bevel), { pos: [0, roof - 0.03, cz], shade: PR });
  k.add(paintKey, gbox(hw * 2 - 0.1, h - 0.1, 0.06, bevel), { pos: [0, floorY + h * 0.5, rear + 0.02], shade: P });
  k.add('trim', gbox(hw * 2 - 0.2, 0.05, len - 0.2, 0.01), { pos: [0, floorY + 0.02, cz], tint: 0x32363b });
  // two-piece screen with a centre divider and a deep sun visor
  const wsB = belt + 0.02;
  const wsT = roof - 0.2;
  const wsH = wsT - wsB;
  for (const s of [-1, 1]) {
    k.pane(brokenPane && s > 0 ? 'glassCracked' : glassKey, paneGeo(hw - 0.12, wsH - 0.02), { pos: [s * (hw * 0.5 - 0.02), (wsB + wsT) * 0.5, front + 0.005], rot: [-0.06, 0, 0] });
  }
  k.add(paintKey, gbox(0.07, wsH + 0.02, 0.08, 0.01), { pos: [0, (wsB + wsT) * 0.5, front - 0.02], shade: P });
  k.addMirrored(paintKey, gbox(0.09, wsH + 0.02, 0.08, 0.01), { pos: [hw - 0.05, (wsB + wsT) * 0.5, front - 0.02], shade: P });
  k.add(paintKey, gbox(hw * 2 - 0.02, 0.05, 0.36, 0.01), { pos: [0, roof - 0.16, front + 0.14], rot: [0.16, 0, 0], shade: P });
  k.add('gap', pbox(hw * 2 - 0.2, 0.02, 0.02), { pos: [0, wsB - 0.01, front + 0.01], tint: 0x0c0d0e });
  wipers(k, { x0: -hw * 0.6, y: wsB - 0.05, z: front + 0.02, rake: 0.1, n: 2, len: 0.55 });
  // grille band low on the front, lamps in the bumper
  const gBand = big ? 0.3 : 0.2;
  k.add('gap', pbox(hw * 2 - 0.5, gBand, 0.03), { pos: [0, floorY + 0.28, front + 0.006], tint: 0x0a0b0c });
  for (let i = 0; i < (big ? 6 : 4); i++) k.add('trim', gbox(hw * 2 - 0.52, 0.024, 0.03, 0.004), { pos: [0, floorY + 0.28 - gBand * 0.5 + 0.02 + i * 0.05, front + 0.016], tint: 0x3c4045 });
  k.add('chrome', gbox(0.5, 0.08, 0.02, 0.006), { pos: [0, belt - 0.2, front + 0.03], tint: 0xb4b8bb });
  k.add('steel', gbox(hw * 2 + 0.1, big ? 0.24 : 0.16, big ? 0.22 : 0.14, 0.02), { pos: [0, bumperY, front + 0.02], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
  const lampY = big ? bumperY : floorY + 0.28 + gBand * 0.5 + 0.16;
  const lampZ = big ? front + 0.13 : front + 0.02;
  for (const s of [-1, 1]) {
    roundLamp(k, { pos: [s * (hw - 0.34), lampY, lampZ], r: big ? 0.1 : 0.085, on: lightsOn, bezel: 'steel', bezelTint: 0x3a3e42, missing: missingPanel && s > 0, cracked: crackedLens && s < 0 });
    roundLamp(k, { pos: [s * (hw - 0.12), lampY, lampZ], r: 0.045, kind: 'amber', on: markersOn, depth: 0.03 });
  }
  if (missingPanel) {
    // the lower corner skirt panel has been torn off on the passenger side, showing the frame rail behind
    k.add('gap', pbox(0.42, skirt * 0.7, 0.05), { pos: [hw - 0.02, sill + skirt * 0.36, rear + 0.5], tint: 0x0b0c0d });
    k.add('steel', gbox(0.06, 0.1, 0.36, 0.01), { pos: [hw - 0.12, sill + skirt * 0.36, rear + 0.5], shade: grime(0x3a3c3f, { up: 0.5, down: 0.6 }) });
  }
  // doors: shut lines, a window each, a handle, steps
  for (const s of [-1, 1]) {
    shutLine(k, { x: s * (hw + 0.002), y0: floorY - 0.2, y1: roof - 0.1, z: doorF });
    shutLine(k, { x: s * (hw + 0.002), y0: floorY - 0.2, y1: roof - 0.1, z: doorR });
    // the pane sits 3 cm inside the skin, oversize so the frame overlaps its edge
    k.pane(glassKey, paneGeo(winF - winR + 0.04, gT - gB + 0.04), { pos: [s * (hw - 0.03), (gB + gT) * 0.5, (winF + winR) * 0.5], rot: [0, s * Math.PI / 2, 0] });
    k.add('chrome', gbox(0.014, 0.022, 0.14, 0.004), { pos: [s * (hw + 0.016), belt - 0.25, doorR + 0.25], tint: 0xb4b8bb });
    // two steps and a grab handle
    for (const [i, sy] of [floorY - 0.55, floorY - 0.2].entries()) {
      if (sy < 0.2) continue;
      k.add('plate', gbox(0.12, 0.03, 0.42, 0.006), { pos: [s * (hw + 0.04 - i * 0.02), sy, (doorF + doorR) * 0.5], tint: 0x8a8d88 });
    }
    if (big) k.add('steel', gbox(0.03, 0.9, 0.03, 0.008), { pos: [s * (hw + 0.03), belt + 0.1, doorF + 0.06], tint: 0x3a3e42 });
    doorMirror(k, { x: s * (hw + 0.02), y: belt + 0.55, z: front - 0.1, side: s, arm: big ? 0.3 : 0.24, big, frame: true });
    // corner marker light up top
    roundLamp(k, { pos: [s * (hw - 0.14), roof - 0.1, front + 0.03], r: 0.03, kind: 'amber', on: markersOn, depth: 0.03 });
  }
  cabin(k, { hw, floorY: floorY + 0.05, belt, z: rear + 0.7, rhd, seatTint, wheelZ: front - 0.05 });
  return { belt, sill };
}

/**
 * A cargo / living box: rounded shell with panel seams, framed windows, a
 * rear door, hatch lids, and a roof edge rail.
 */
export function boxBody(k, { hw, y0, h, z0, z1, key = 'paint', paint: P, windows = [], doorZ = null, hatches = [], glassKey = 'glassDark', roofRail = true, seams = 3, cornerR = 0.06 }) {
  const cz = (z0 + z1) * 0.5;
  const len = z0 - z1;
  const yc = y0 + h * 0.5;
  k.add(key, gbox(hw * 2, h, len, cornerR), { pos: [0, yc, cz], shade: P });
  // panel seams: vertical recesses down the flanks and across the roof
  for (let i = 1; i < seams; i++) {
    const z = z0 - (len * i) / seams;
    for (const s of [-1, 1]) k.add('gap', pbox(0.006, h - 0.2, 0.012), { pos: [s * (hw + 0.002), yc, z], tint: 0x0c0d0e });
    k.add('gap', pbox(hw * 2 - 0.2, 0.006, 0.012), { pos: [0, y0 + h + 0.002, z], tint: 0x0c0d0e });
  }
  // windows with a raised frame
  for (const w of windows) {
    for (const s of w.sides ?? [-1, 1]) {
      k.add('trim', gbox(0.03, w.h + 0.06, w.w + 0.06, 0.012), { pos: [s * (hw + 0.008), w.y, w.z], tint: 0x32363b });
      k.add('gap', pbox(0.02, w.h + 0.01, w.w + 0.01), { pos: [s * (hw + 0.01), w.y, w.z], tint: 0x0a0b0c });
      k.pane(w.glass ?? glassKey, paneGeo(w.w, w.h), { pos: [s * (hw + 0.026), w.y, w.z], rot: [0, s * Math.PI / 2, 0] });
    }
  }
  if (doorZ !== null) {
    // rear door in the back wall
    const dw = 0.7;
    const dh = h - 0.3;
    k.add('gap', pbox(dw + 0.02, dh + 0.02, 0.01), { pos: [0.25, y0 + 0.1 + dh * 0.5, z1 - 0.006], tint: 0x0c0d0e });
    k.add(key, gbox(dw - 0.02, dh - 0.02, 0.03, 0.01), { pos: [0.25, y0 + 0.1 + dh * 0.5, z1 - 0.012], shade: P });
    k.add('chrome', gbox(0.03, 0.14, 0.02, 0.006), { pos: [0.25 - dw * 0.4, y0 + 0.1 + dh * 0.45, z1 - 0.035], tint: 0xb4b8bb });
    k.pane(glassKey, paneGeo(0.36, 0.3), { pos: [0.25, y0 + 0.1 + dh * 0.72, z1 - 0.03], rot: [0, Math.PI, 0] });
    k.add('trim', gbox(0.42, 0.36, 0.02, 0.008), { pos: [0.25, y0 + 0.1 + dh * 0.72, z1 - 0.02], tint: 0x32363b });
  }
  for (const hh of hatches) {
    for (const s of hh.sides ?? [-1, 1]) {
      k.add('gap', pbox(0.01, hh.h + 0.01, hh.w + 0.01), { pos: [s * (hw + 0.002), hh.y, hh.z], tint: 0x0c0d0e });
      k.add(hh.key ?? key, gbox(0.02, hh.h - 0.02, hh.w - 0.02, 0.008), { pos: [s * (hw + 0.01), hh.y, hh.z], shade: P, tint: hh.tint });
      k.add('chrome', gbox(0.02, 0.03, 0.12, 0.005), { pos: [s * (hw + 0.024), hh.y + hh.h * 0.35, hh.z], tint: 0xb4b8bb });
    }
  }
  if (roofRail) {
    k.addMirrored('alu', gbox(0.04, 0.05, len - 0.2, 0.01), { pos: [hw - 0.06, y0 + h + 0.03, cz], tint: 0x8d9398 });
    for (const z of [z0 - 0.1, z1 + 0.1]) k.add('alu', gbox(hw * 2 - 0.16, 0.05, 0.04, 0.01), { pos: [0, y0 + h + 0.03, z], tint: 0x8d9398 });
  }
  return { top: y0 + h };
}

/** Flat deck with drop sides, a headboard and rope rails. */
export function flatDeck(k, { hw, y, z0, z1, sides = 0.4, headboard = 0.8, key = 'steel', tint = 0x5a5e62, paint: P, plateDeck = true }) {
  const cz = (z0 + z1) * 0.5;
  const len = z0 - z1;
  const shade = P ?? grime(tint, { up: 0.55, down: 0.4, jitter: 0.1 });
  k.add(plateDeck ? 'plate' : 'rust', gbox(hw * 2, 0.05, len, 0.006), { pos: [0, y, cz], shade: plateDeck ? grime(0x7d807a, { up: 0.7, dust: 0x8a7c5e }) : grime(0x6a5a48, { up: 0.6 }) });
  // cross bearers under the deck
  for (let i = 0; i <= 6; i++) k.add('steel', gbox(hw * 2 - 0.1, 0.09, 0.05, 0.008), { pos: [0, y - 0.06, z0 - 0.1 - (i / 6) * (len - 0.2)], shade: grime(0x4a4e52, { up: 0.5, down: 0.4 }) });
  k.add('steel', gbox(hw * 2 + 0.04, 0.12, 0.06, 0.01), { pos: [0, y - 0.04, z1 + 0.03], shade: grime(0x4a4e52, { up: 0.5 }) });
  if (sides > 0) {
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < n; i++) {
      const zl = len / n - 0.03;
      const zc = z0 - (i + 0.5) * (len / n);
      k.addMirrored(key, gbox(0.04, sides, zl, 0.01), { pos: [hw - 0.02, y + sides * 0.5 + 0.02, zc], shade });
      // pressed ribs on the drop side
      for (const rz of [-0.3, 0.3]) k.addMirrored(key, gbox(0.02, sides - 0.08, 0.05, 0.006), { pos: [hw + 0.01, y + sides * 0.5 + 0.02, zc + rz * zl], shade });
      // hinge and latch hardware
      k.addMirrored('rust', gbox(0.06, 0.05, 0.08, 0.01), { pos: [hw - 0.02, y + 0.04, zc - zl * 0.5 + 0.02], tint: 0x5c4a3a });
    }
    k.add(key, gbox(hw * 2, sides, 0.04, 0.01), { pos: [0, y + sides * 0.5 + 0.02, z1 + 0.02], shade });
    // corner posts
    for (const z of [z0 - 0.02, z1 + 0.02]) k.addMirrored('steel', gbox(0.06, sides + 0.08, 0.06, 0.01), { pos: [hw - 0.03, y + sides * 0.5 + 0.02, z], shade: grime(0x4a4e52, { up: 0.5 }) });
  }
  if (headboard > 0) {
    k.add('steel', gbox(hw * 2, headboard, 0.05, 0.01), { pos: [0, y + headboard * 0.5, z0 - 0.02], shade: grime(0x4a4e52, { up: 0.5 }) });
    for (let i = 0; i < 5; i++) k.add('steel', gbox(0.03, headboard - 0.04, 0.03, 0.006), { pos: [-hw + 0.1 + i * ((hw * 2 - 0.2) / 4), y + headboard * 0.5, z0 - 0.06], shade: grime(0x4a4e52, { up: 0.5 }) });
  }
  // mud flaps at the back
  k.addMirrored('trim', gbox(0.36, 0.34, 0.02, 0.006), { pos: [hw - 0.25, y - 0.3, z1 + 0.05], tint: 0x32363b });
  return { deckY: y + 0.025 };
}

/**
 * Roll cage over an open body: front hoop, main hoop, rear hoop, longitudinal
 * top rails, a diagonal, and optionally a canvas roof laced to the rails.
 */
export function rollCage(k, { hw, y0, top, hoops, canvas = true, canvasTint = 0x8b8064, tubeR = 0.026, sway = 0.012, seed = 1 }) {
  const shade = grime(0x2f3336, { up: 0.5, down: 0.4, jitter: 0.08 });
  const x = hw - 0.08;
  const first = hoops[0];
  const last = hoops[hoops.length - 1];
  for (const [i, z] of hoops.entries()) {
    const t = top - (i === 0 ? 0.02 : 0);
    k.add('steel', tube([[-x, y0, z], [-x, t - 0.15, z], [-x + 0.12, t, z], [x - 0.12, t, z], [x, t - 0.15, z], [x, y0, z]], tubeR, 10, 0.3), { shade });
  }
  k.addMirrored('steel', tube([[x - 0.02, top - 0.02, first], [x - 0.02, top + 0.005, (first + last) * 0.5], [x - 0.02, top - 0.02, last]], tubeR, 10), { shade });
  // diagonal in the rear bay and grab handles on the front hoop
  if (hoops.length > 2) {
    const a = hoops[hoops.length - 2];
    k.add('steel', tube([[-x + 0.05, y0 + 0.3, a], [x - 0.05, top - 0.2, last]], tubeR * 0.85, 8), { shade });
  }
  k.addMirrored('steel', bend(0.09, 0.012, Math.PI), { pos: [x - 0.25, top - 0.08, first + 0.03], rot: [0, Math.PI / 2, 0], tint: 0x2f3336 });
  if (canvas) {
    // sheet laced over the rails: a subdivided plane with a sag between hoops
    const len = first - last;
    const g = new THREE.PlaneGeometry(x * 2 + 0.06, len, 6, 14);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      const pz = p.getZ(i);
      let sag = 0;
      for (let h = 0; h + 1 < hoops.length; h++) {
        const z0 = hoops[h];
        const z1 = hoops[h + 1];
        if (pz <= z0 + 1e-3 && pz >= z1 - 1e-3) {
          const u = (pz - z1) / (z0 - z1);
          sag = Math.sin(u * Math.PI) * 0.045 * (1 - (px / x) ** 2 * 0.5);
        }
      }
      p.setY(i, top + tubeR + 0.01 - sag);
    }
    g.translate(0, 0, (first + last) * 0.5);
    g.computeVertexNormals();
    k.add('canvas', g, {
      shade: grime(canvasTint, { up: 0.3, dust: 0x9a8e70, jitter: 0.06 }),
      flap: (px, py, pz) => [sway * (0.3 + 0.7 * (1 - Math.abs((pz - (first + last) * 0.5) / (len * 0.5)) ** 2)), pz * 2 + seed],
    });
    // lacing along the rails and a rolled rear flap
    k.addMirrored('canvas', gbox(0.05, 0.03, len - 0.1, 0.008), { pos: [x + 0.01, top + 0.03, (first + last) * 0.5], tint: canvasTint });
    k.add('canvas', cylX(0.06, 0.06, x * 2, 12), { pos: [0, top - 0.06, last + 0.02], shade: grime(canvasTint, { up: 0.3, dust: 0x9a8e70 }) });
  }
}

/** Tiered bench seats, each row a step higher than the one in front. */
export function benchTiers(k, { hw, rows, tint = 0x5b4f3a, frameTint = 0x2f3336 }) {
  for (const { z, y } of rows) {
    const w = hw * 2 - 0.24;
    const sh = grime(tint, { up: 0.4, dust: 0x9a8b6b, jitter: 0.08 });
    k.add('fabric', gbox(w, 0.11, 0.48, 0.03), { pos: [0, y + 0.3, z], shade: sh });
    k.add('fabric', gbox(w, 0.48, 0.09, 0.03), { pos: [0, y + 0.58, z - 0.26], rot: [-0.14, 0, 0], shade: sh });
    // seat frame and the step it stands on
    k.add('steel', gbox(w - 0.1, 0.22, 0.4, 0.02), { pos: [0, y + 0.13, z], tint: frameTint });
    k.add('plate', gbox(hw * 2 - 0.16, 0.04, 0.5, 0.006), { pos: [0, y, z + 0.48], shade: grime(0x7d807a, { up: 0.7, dust: 0x8a7c5e }) });
    for (const s of [-1, 1]) k.add('steel', gbox(0.03, y - 0.05, 0.03, 0.006), { pos: [s * (w * 0.5 - 0.05), y * 0.5 + 0.02, z], tint: frameTint });
  }
}

/** Exposed hinges, tie-downs and a few bolts along an edge. */
export function edgeBolts(k, { from, to, n = 5, key = 'chrome', tint = 0xb0b4b7, r = 0.01, seed = 1 }) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    k.add(key, bolt(r, r * 0.7), { pos: p, rot: [Math.PI / 2, 0, 0], tint: jit(i, seed) > 0.7 ? 0x8a7a5c : tint });
  }
}

export { cylZ };
