import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import {
  recentre, glowRig, sym, RED,
  PLATE, BRICK, P, C, FINISH,
} from './_util.js';

/*
 * TIE/ln space superiority fighter. 18 studs across the panels, 11 deep.
 *
 * Ball cockpit at the origin, stubby pylons out to +/-3.4, and a flat
 * hexagonal solar array on each end. Nose (viewport) at +Z.
 *
 * The panels are their own builders so the wing surface merges into one black
 * mesh each instead of being smeared across the hull buckets.
 */

const HULL = C.darkBluishGray;
const DARK = C.darkGray;
const PANEL = C.black;
// The arrays are black-on-black in the film; the frame has to be a shade up or
// the whole wing turns into a silhouette under space lighting.
const FRAME = C.darkBluishGray;

const PANEL_X = 8.1;        // centre of each solar array
const PANEL_HALF = 5.2;     // hexagon half-height
const PANEL_WAIST = 3.4;    // half-height at the leading/trailing points
const PANEL_Z = 4.6;        // hexagon half-depth
const BALL_R = 3.1;

/** Cockpit ball, viewport, hatch and the guns. */
function hull(bb) {
  // ---- ball ------------------------------------------------------------
  // Deliberately coarse: a LEGO TIE builds this out of a ring of curved
  // slopes, so visible facets read better than a smooth sphere would.
  bb.sphere(0, 0, 0, BALL_R, { seg: 10, rings: 6, sz: 0.9, color: HULL });
  // banding: an equator plate and a spine plate, the seams of the build
  bb.cyl(0, -0.34, 0, BALL_R * 1.0, 0.68, { seg: 12, color: DARK, stud: false, ry: Math.PI / 12 });
  bb.cyl(0, 0, -0.15, BALL_R * 0.8, 0.55, { axis: 'z', seg: 8, color: HULL, stud: false });
  sym(bb, (b, s) => {
    b.brick(s * 1.45, -0.2, 0, 0.5, BALL_R * 1.55, { h: 0.4, color: DARK, studs: false, free: true });
  });

  // ---- front viewport --------------------------------------------------
  const vz = BALL_R * 0.86;
  bb.cyl(0, 0, vz, 1.95, 0.55, { axis: 'z', color: DARK, seg: 12, stud: false });
  bb.cyl(0, 0, vz + 0.42, 1.72, 0.3, { axis: 'z', color: C.black, seg: 12, stud: false });
  bb.cyl(0, 0, vz + 0.5, 1.5, 0.34, {
    axis: 'z', color: C.transLightBlue, finish: FINISH.TRANS, seg: 12, stud: false,
  });
  // window mullions: the TIE viewport is a spoked hexagon, not a plain disc.
  // Three bars at 60 degrees, each a thin slab rolled about its own Z axis.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    bb.prism([[-1.62, -0.08], [1.62, -0.08], [1.62, 0.08], [-1.62, 0.08]], P(1), {
      rz: a, y: 0, z: vz + 0.62, color: C.black,
    });
  }
  // hexagonal rim frame
  bb.cyl(0, 0, vz + 0.2, 2.1, 0.4, { axis: 'z', color: C.black, seg: 6, stud: false, rz: Math.PI / 6 });

  // ---- top hatch + dorsal fin -------------------------------------------
  bb.cyl(0, BALL_R * 0.72, -0.2, 1.5, P(2), { color: DARK, seg: 8, stud: false });
  bb.cyl(0, BALL_R * 0.72 + P(2), -0.2, 1.15, P(1), { color: HULL, seg: 8, stud: false });
  bb.brick(0, -BALL_R * 0.86, -0.4, 1.6, 2.2, { h: P(2), color: DARK, studs: false });

  // ---- laser cannons under the chin ------------------------------------
  sym(bb, (b, s) => {
    b.brick(s * 1.05, -2.55, 1.5, 1.2, 2.6, { h: P(4), color: DARK, studs: false });
    b.cyl(s * 1.05, -2.1, 3.4, 0.44, 3.0, { axis: 'z', color: C.black, seg: 8, stud: false });
    b.cyl(s * 1.05, -2.1, 4.6, 0.5, 0.5, { axis: 'z', color: DARK, seg: 8, stud: false });
    b.cyl(s * 1.05, -2.1, 5.4, 0.26, 1.6, {
      axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 6, stud: false,
    });
  });
  bb.node('gunL', -1.05, -2.1, 6.3);
  bb.node('gunR', 1.05, -2.1, 6.3);
  bb.node('cockpit', 0, 0.3, 0.4);

  // ---- ion engine block at the back ------------------------------------
  bb.cyl(0, 0, -BALL_R * 0.84, 1.8, 0.6, { axis: 'z', color: DARK, seg: 8, stud: false });
  sym(bb, (b, s) => {
    b.cyl(s * 0.85, 0, -BALL_R - 0.15, 0.62, 0.5, { axis: 'z', color: C.black, seg: 10, stud: false });
    b.cyl(s * 0.85, 0, -BALL_R - 0.42, 0.5, 0.3, {
      axis: 'z', color: C.transLightBlue, finish: FINISH.GLOW, seg: 10, stud: false,
    });
  });
  bb.node('engineL', -0.85, 0, -BALL_R - 0.7);
  bb.node('engineR', 0.85, 0, -BALL_R - 0.7);

  // ---- pylons out to the panels ----------------------------------------
  // The run has to close the gap between the ball (x ~ 2.6) and the panel hub
  // (PANEL_X - 0.65), or the arrays float loose.
  sym(bb, (b, s) => {
    b.cyl(s * 5.3, 0, 0, 1.1, 5.2, { axis: 'x', color: DARK, seg: 10, stud: false });
    b.cyl(s * 2.9, 0, 0, 1.42, 0.7, { axis: 'x', color: HULL, seg: 10, stud: false });
    b.cyl(s * 7.3, 0, 0, 1.35, 0.9, { axis: 'x', color: HULL, seg: 8, stud: false });
    // shoulder bracket where the pylon meets the ball
    b.brick(s * 3.8, -0.72, 0, 1.8, 2.4, { h: P(3), color: DARK, studs: false, free: true });
    b.brick(s * 4.6, 0.86, 0, 3.2, 1.4, { h: P(1), color: HULL, tile: true, studs: false, free: true });
  });
}

/**
 * One solar array, built in local coordinates around x = 0 so the group can be
 * mirrored with a negative scale. A LEGO TIE panel is a flat hexagonal frame:
 * dark grey ribs on the outside, black cell blocks filling the middle.
 */
function solarPanel(side) {
  const bb = new BrickBuilder({ studs: false, bevel: true, cullStuds: false });
  const H = PANEL_HALF, W = PANEL_WAIST, Z = PANEL_Z;
  const T = P(2);           // panel thickness

  // hexagon outline in (z, y): pointed front and back, flat top and bottom.
  const hexPts = [
    [Z, 0], [Z * 0.42, H], [-Z * 0.42, H], [-Z, 0], [-Z * 0.42, -H], [Z * 0.42, -H],
  ];
  const frame = hexPts.map(([z, y]) => [z, y]);
  // black cell field: the hexagon inset by one plate all round
  const inset = hexPts.map(([z, y]) => [z * 0.86, y * 0.86]);

  // outer frame ring: draw the hexagon, then punch it back with the inset in
  // black so the frame shows only as a border
  bb.prism(frame, T, { ry: Math.PI / 2, x: 0, color: FRAME });
  bb.prism(inset, T + 0.06, { ry: Math.PI / 2, x: 0, color: PANEL });

  // vertical cell ribs across the face, both sides
  for (const s of [-1, 1]) {
    const fx = s * (T / 2 + P(1) * 0.5);
    for (let i = -2; i <= 2; i++) {
      const z = i * (Z * 0.34);
      const half = H * 0.86 * (1 - Math.abs(z) / (Z * 1.34));
      if (half < 0.6) continue;
      bb.brick(fx, -half, z, P(1), 0.34, { h: half * 2, color: FRAME, studs: false, free: true });
    }
    // horizontal edge ribs top and bottom
    bb.brick(fx, H * 0.86 - P(1), 0, P(1), Z * 0.9, { h: P(1), color: FRAME, studs: false, free: true });
    bb.brick(fx, -H * 0.86, 0, P(1), Z * 0.9, { h: P(1), color: FRAME, studs: false, free: true });
  }

  // corner caps: little grey blocks on the six vertices, the way a LEGO panel
  // gets clipped together
  for (const [z, y] of hexPts) {
    bb.cyl(0, y * 0.93, z * 0.93, 0.42, T + 0.14, { axis: 'x', color: HULL, seg: 6, stud: false });
  }
  // leading- and trailing-edge spars, the panel's most legible feature
  for (const sz of [1, -1]) {
    bb.prism([
      [sz * Z * 0.9, 0], [sz * Z * 0.34, H * 0.9], [sz * Z * 0.34, H * 0.9 - 0.55], [sz * Z * 0.62, 0],
    ], T + 0.12, { ry: Math.PI / 2, x: 0, color: HULL });
    bb.prism([
      [sz * Z * 0.9, 0], [sz * Z * 0.34, -H * 0.9], [sz * Z * 0.34, -H * 0.9 + 0.55], [sz * Z * 0.62, 0],
    ], T + 0.12, { ry: Math.PI / 2, x: 0, color: HULL });
  }
  // hub where the pylon lands
  bb.cyl(0, 0, 0, 1.5, T + 0.5, { axis: 'x', color: HULL, seg: 8, stud: false });
  bb.cyl(0, 0, 0, 0.75, T + 0.9, { axis: 'x', color: DARK, seg: 8, stud: false });
  // squadron flash on the inboard face, just above the hub
  bb.brick(-side * (T / 2 + P(1) * 0.5), 1.7, Z * 0.18, P(1), 1.2, {
    h: 0.5, ...RED, studs: false, free: true,
  });

  const g = bb.build();
  const grp = new THREE.Group();
  grp.name = side > 0 ? 'panelR' : 'panelL';
  grp.position.x = side * PANEL_X;
  grp.add(g);
  return grp;
}

function buildTie() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  hull(bb);
  const shell = bb.build();

  const inner = new THREE.Group();
  inner.add(shell);
  const pL = solarPanel(-1), pR = solarPanel(1);
  inner.add(pL, pR);

  const nodes = { ...shell.userData.nodes };
  nodes.panelL = pL;
  nodes.panelR = pR;
  inner.userData.nodes = nodes;

  const model = recentre(inner, { y: 'centre' });
  const glow = glowRig(shell);
  model.userData.update = (t) => {
    glow.set(0.85 + Math.sin(t * 5.1) * 0.12);
  };
  return model;
}

register('tiefighter', () => buildTie(), {
  notes: 'TIE/ln fighter, 18 studs across, hexagonal solar arrays on stub pylons. '
    + 'nodes gunL, gunR, engineL, engineR, cockpit, panelL, panelR',
});
