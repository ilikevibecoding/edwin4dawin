import * as THREE from 'three';
import { Batch, deckHeight, fairedStrutGeometry, floatHull, halfWidthAt, sectionAt, sprayRailGeometry, strutGeometry, wingLowerY, type FloatStation, type WingSpec } from '../geometry';
import { SURF } from '../textures';
import { at, V3, WING_POS, type BuildContext } from './context';

export interface FloatsBuild {
  /** water rudder groups (port, starboard), hinged at the sterns */
  waterRudders: THREE.Group[];
  /** amphibious wheels (retract into the floats) */
  wheels: THREE.Group;
}

/**
 * Float hulls, main and wing struts with their shoes, spreader bars and bracing wires, water rudders, deck cleats
 * and the amphibious wheels. The floats are the last part to add to `fittings`, so this also merges the fittings
 * batch into its mesh, at the point in the build order where it was always created.
 */
export function buildFloats(ctx: BuildContext, wingSpec: WingSpec): FloatsBuild {
  const { mesh, root, fittings } = ctx;
  const { floatPaint, parts } = ctx.mat;
  const { sections } = ctx.fuselage;
  const waterRudders: THREE.Group[] = [];
  // ------------------------------------------------------------ floats & struts
  // EDO-style hull: hard chine at yc, V bottom (deadrise) to the keel, near-vertical sides, crowned deck; the
  // forebody deepens to the step at x -0.35 (a real vertical step: two stations at one x), the afterbody keel
  // sweeps up to the stern. Keel heights match the physics stations (bow -2.08 at x 2.6, -2.25 ahead of the
  // step, -1.98 at x -2.3); at the rest datum (y 1.96) the waterline runs ~1-6 cm under the chine along the hull.
  const floatSections: FloatStation[] = [
    { x: 2.95, yc: -1.86, w: 0.05, top: 0.07, bot: 0.05, n: 2.4, vee: 1.5 },
    { x: 2.6, yc: -1.90, w: 0.20, top: 0.15, bot: 0.18, n: 2.6, vee: 1.4 },
    { x: 1.9, yc: -1.95, w: 0.33, top: 0.18, bot: 0.28, n: 3.0, vee: 1.25 },
    { x: 0.8, yc: -1.95, w: 0.37, top: 0.19, bot: 0.32, n: 3.2, vee: 1.15 },
    { x: -0.2, yc: -1.95, w: 0.37, top: 0.19, bot: 0.30, n: 3.2, vee: 1.12 },
    { x: -0.35, yc: -1.95, w: 0.365, top: 0.19, bot: 0.295, n: 3.2, vee: 1.12, split: true }, // step: forebody keel
    { x: -0.35, yc: -1.95, w: 0.365, top: 0.19, bot: 0.215, n: 3.2, vee: 1.15, split: true }, // step: afterbody keel
    { x: -1.3, yc: -1.92, w: 0.33, top: 0.18, bot: 0.20, n: 3.0, vee: 1.2 },
    { x: -2.3, yc: -1.86, w: 0.25, top: 0.15, bot: 0.12, n: 2.8, vee: 1.3 },
    { x: -2.75, yc: -1.80, w: 0.11, top: 0.09, bot: 0.05, n: 2.4, vee: 1.5 },
  ];
  const floatGeo = floatHull(floatSections, 8, 5);
  /** deck height at station x, `dz` off the float's centreline (crown line by default) */
  const deckAt = (x: number, dz = 0) => deckHeight(floatSections, x, dz);
  const floats = new Batch();
  // spray rails along both forebody chines, bow to the step (one strip, mirrored for the inboard side of the hull)
  const rail = sprayRailGeometry(floatSections, 2.55, -0.36, 0.04, 0.012, 0.005, 14);
  /**
   * frame of a deck fitting at station x, `dz` off the float centreline (float centre at zc): sits on the deck and
   * leans with the deck's crown there (a cleat 20 cm off centre tilts ~8 degrees outboard)
   */
  const onDeck = (x: number, dz: number, zc: number) => {
    const slope = (deckAt(x, dz + 0.005) - deckAt(x, dz - 0.005)) / 0.01;
    return new THREE.Matrix4().makeTranslation(x, deckAt(x, dz), zc + dz).multiply(new THREE.Matrix4().makeRotationX(-Math.atan(slope)));
  };
  /** horn cleat on the deck: base plate, stem, horn bar with upturned tapered tips; `alongX` = bar fore-and-aft */
  const cleat = (frame: THREE.Matrix4, alongX: boolean) => {
    const rotY = alongX ? 0 : Math.PI / 2;
    const add = (geo: THREE.BufferGeometry, p: [number, number, number], r?: [number, number, number]) => fittings.add(geo, frame.clone().multiply(at(p, r)), SURF.metal);
    add(new THREE.BoxGeometry(0.11, 0.012, 0.06), [0, 0.006, 0], [0, rotY, 0]);
    add(new THREE.CylinderGeometry(0.014, 0.019, 0.036, 8), [0, 0.03, 0]);
    add(new THREE.CylinderGeometry(0.013, 0.013, 0.13, 8), [0, 0.056, 0], [0, rotY, Math.PI / 2]);
    for (const e of [-1, 1]) {
      const d = alongX ? [e * 0.08, 0] : [0, -e * 0.08];
      add(new THREE.CylinderGeometry(0.007, 0.013, 0.04, 8), [d[0], 0.064, d[1]], [0, rotY, -e * (Math.PI / 2 - 0.4)]);
    }
  };
  /** flush pump-out / inspection cover on the deck: rubber seal ring, aluminium cap with its screwdriver slot */
  const hatch = (frame: THREE.Matrix4) => {
    fittings.add(new THREE.CylinderGeometry(0.052, 0.052, 0.004, 16), frame.clone().multiply(at([0, 0.002, 0])), SURF.rubber);
    fittings.add(new THREE.CylinderGeometry(0.042, 0.042, 0.007, 16), frame.clone().multiply(at([0, 0.0055, 0])), SURF.metal);
    fittings.add(new THREE.BoxGeometry(0.05, 0.003, 0.007), frame.clone().multiply(at([0, 0.0095, 0], [0, 0.6, 0])), SURF.darkMetal);
  };
  /** steel cable between two points */
  const cable = (a: THREE.Vector3, b: THREE.Vector3, r = 0.004) => fittings.add(strutGeometry(a, b, r, 5), undefined, SURF.wire);
  // wing strut attachment points sit on the wing's lower surface
  const strutZ = 2.9;
  const strutTop = (xLocal: number) => new THREE.Vector3(WING_POS.x + xLocal, WING_POS.y + wingLowerY(wingSpec, xLocal, strutZ) + 0.03, 0);
  /** strut end fitting: a shoe on the deck (or a pad under the belly) with a bolt boss, so no tube pierces a skin bare */
  const shoe = (p: THREE.Vector3, dir: THREE.Vector3, size: number) => {
    fittings.add(new THREE.BoxGeometry(size, 0.035, size * 0.75), at(p.clone().addScaledVector(dir, 0.012)), SURF.darkMetal);
    fittings.add(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 10), at(p.clone().addScaledVector(dir, 0.045)), SURF.darkMetal);
  };
  const UPV = V3(0, 1, 0), DOWNV = V3(0, -1, 0);
  const belly = -0.62;
  const FX = 1.6, RX = -0.9;   // main strut stations on the float decks
  for (const side of [-1, 1]) {
    const zc = side * 1.25;
    floats.add(floatGeo, at([0, 0, zc]));
    fittings.add(rail, at([0, 0, zc]), SURF.strut);
    fittings.add(rail, at([0, 0, zc], undefined, [1, 1, -1]), SURF.strut);
    // rubber bumper at the bow
    fittings.add(new THREE.SphereGeometry(0.085, 10, 8), at([2.97, -1.85, zc]), SURF.rubber);
    // main struts: front and rear pairs from the deck shoes to pads under the belly, plus diagonal braces
    const fDeck = V3(FX, deckAt(FX), side * 1.25), rDeck = V3(RX, deckAt(RX), side * 1.25);
    const fBelly = V3(1.4, belly, side * 0.55), rBelly = V3(-0.7, belly, side * 0.5);
    fittings.add(fairedStrutGeometry(fDeck, fBelly, 0.14, 0.05), undefined, SURF.strut);
    fittings.add(fairedStrutGeometry(rDeck, rBelly, 0.14, 0.05), undefined, SURF.strut);
    fittings.add(strutGeometry(fDeck.clone().add(V3(0.05, 0.03, 0)), rBelly, 0.022), undefined, SURF.strut);
    fittings.add(strutGeometry(rDeck.clone().add(V3(-0.05, 0.03, 0)), fBelly, 0.022), undefined, SURF.strut);
    shoe(fDeck, UPV, 0.22); shoe(rDeck, UPV, 0.22);
    shoe(fBelly, DOWNV, 0.16); shoe(rBelly, DOWNV, 0.16);
    // Lift strut: one streamlined strut per side from the lower longeron just behind the door's aft post up to the
    // wing's front-spar fitting at 40 % span, braced by a jury-strut pair (a shallow V in side view) from the strut's
    // upper third to the wing. The earlier pair of struts rose from the float decks: nothing on a production
    // floatplane carries wing loads through the floats, the floats hang on their own struts.
    // (the fitting sits under the doors' bottom line, y -0.42, on the post between the pilot's and the rear door)
    const rootFit = V3(0.90, -0.51, side * (halfWidthAt(sectionAt(sections, 0.90), -0.51) - 0.01));
    const topFit = strutTop(0.0).setZ(side * strutZ); // 24 % chord at z 2.9: the front spar
    fittings.add(fairedStrutGeometry(rootFit, topFit, 0.15, 0.055), undefined, SURF.strut);
    const strutDir = topFit.clone().sub(rootFit).normalize();
    // root fitting: a hinge block on the skin with the strut's end in a saddle; wing end: a cuff plate under the skin
    fittings.add(new THREE.BoxGeometry(0.16, 0.12, 0.05), at(rootFit.clone().add(V3(0, 0.02, side * 0.005)), [0, 0, 0]), SURF.darkMetal);
    fittings.add(new THREE.BoxGeometry(0.22, 0.03, 0.14), at(topFit.clone().setY(topFit.y - 0.025)), SURF.darkMetal);
    for (const t of [0.05, 0.94]) fittings.add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), new THREE.Matrix4().compose(rootFit.clone().lerp(topFit, t), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), strutDir), V3(1, 1, 1)), SURF.darkMetal);
    // jury struts: from the strut at 62 % of its length up to the wing underside at 10 % and 63 % chord
    const jury = rootFit.clone().lerp(topFit, 0.62);
    for (const dx of [0.24, -0.70]) {
      const jz = Math.abs(jury.z) + 0.02;
      const up = V3(WING_POS.x + dx, WING_POS.y + wingLowerY(wingSpec, dx, jz) + 0.02, side * jz);
      fittings.add(strutGeometry(jury, up, 0.013, 6), undefined, SURF.strut);
      fittings.add(new THREE.BoxGeometry(0.05, 0.02, 0.06), at(up.clone().setY(up.y - 0.012)), SURF.darkMetal);
    }
    fittings.add(new THREE.BoxGeometry(0.07, 0.06, 0.08), new THREE.Matrix4().compose(jury, new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), strutDir), V3(1, 1, 1)), SURF.darkMetal);
    // water rudder hung off the stern on two transom brackets: a vertical hinge post carrying a balanced blade
    // below the keel line and a steering cross-horn above the deck; the whole assembly yaws with the rudder pedals
    const WR = V3(-2.81, -1.80, zc);
    for (const [y, len] of [[0.085, 0.13], [-0.045, 0.10]] as const) fittings.add(new THREE.BoxGeometry(len, 0.024, 0.05), at([WR.x + len / 2 - 0.01, WR.y + y, zc]), SURF.darkMetal);
    const blade = new THREE.Shape();
    blade.moveTo(0.045, -0.02); blade.lineTo(0.045, -0.30); blade.lineTo(0.0, -0.36); blade.lineTo(-0.15, -0.35);
    blade.lineTo(-0.19, -0.26); blade.lineTo(-0.17, -0.10); blade.lineTo(-0.12, -0.02); blade.closePath();
    const wr = new THREE.Group();
    wr.position.copy(WR);
    mesh(new Batch()
      .add(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), at([0, 0.0, 0]), SURF.metal)
      .add(new THREE.ExtrudeGeometry(blade, { depth: 0.018, bevelEnabled: false }), at([0, 0, -0.009]), SURF.darkMetal)
      .add(new THREE.BoxGeometry(0.03, 0.03, 0.03), at([0, 0.02, 0]), SURF.darkMetal)
      .add(new THREE.BoxGeometry(0.022, 0.014, 0.13), at([0, 0.125, 0]), SURF.metal)
      .build(), parts, { parent: wr, cast: false, receive: false });
    root.add(wr);
    waterRudders.push(wr);
    // steering cables from both horn ends forward along the deck to fairleads by the rear strut, the inboard one
    // continuing up alongside the rear main strut to the belly (the retract / steering run into the cabin)
    const fairX = -1.08, fairY = deckAt(fairX, 0.05) + 0.018;
    for (const e of [-1, 1]) {
      const z = zc + e * 0.05;
      cable(V3(WR.x, WR.y + 0.125, z), V3(fairX, fairY + 0.01, z));
      fittings.add(new THREE.BoxGeometry(0.05, 0.03, 0.024), at([fairX, fairY, z]), SURF.darkMetal);
    }
    cable(V3(fairX, fairY + 0.01, zc - side * 0.05), rBelly.clone().add(V3(-0.08, -0.01, -side * 0.02)));
    // deck fittings: horn cleats at the bow and stern (fore-and-aft) and two on the outboard deck edge (athwart)
    cleat(onDeck(2.5, 0, zc), true);
    cleat(onDeck(-2.42, 0, zc), true);
    for (const cx of [1.1, -1.55]) cleat(onDeck(cx, side * 0.2, zc), false);
    // flush pump-out covers, one per watertight compartment, along the inboard edge of the walkway
    for (const hx of [2.2, 0.85, 0.2, -0.55, -1.3, -2.15]) hatch(onDeck(hx, -side * 0.14, zc));
  }
  // spreader bars between the floats (faired tubes) with saddle fittings on the deck edges
  for (const x of [FX, RX]) {
    const y = deckAt(x) + 0.05;
    fittings.add(fairedStrutGeometry(V3(x, y, -1.25), V3(x, y, 1.25), 0.10, 0.06), undefined, SURF.strut);
    for (const side of [-1, 1]) fittings.add(new THREE.BoxGeometry(0.18, 0.06, 0.16), at([x, deckAt(x) + 0.03, side * 1.16]), SURF.darkMetal);
  }
  // horizontal bracing wires crossing between the two spreader bars
  fittings.add(strutGeometry(V3(FX, deckAt(FX) + 0.05, -1.1), V3(RX, deckAt(RX) + 0.05, 1.1), 0.008), undefined, SURF.wire);
  fittings.add(strutGeometry(V3(FX, deckAt(FX) + 0.05, 1.1), V3(RX, deckAt(RX) + 0.05, -1.1), 0.008), undefined, SURF.wire);
  // transverse cross wires at both strut stations: from each belly pad down to the opposite float's spreader-bar
  // saddle, so the rig shows the classic X between the floats from ahead and astern; a turnbuckle on each
  for (const [x, xb, zb] of [[FX, 1.4, 0.5], [RX, -0.7, 0.45]] as const) {
    for (const side of [-1, 1]) {
      const a = V3(xb, belly - 0.025, side * zb), b = V3(x, deckAt(x) + 0.06, -side * 1.10);
      fittings.add(strutGeometry(a, b, 0.006, 5), undefined, SURF.wire);
      fittings.add(strutGeometry(a.clone().lerp(b, 0.66), a.clone().lerp(b, 0.74), 0.014, 6), undefined, SURF.metal);
    }
  }
  mesh(floats.build(), floatPaint);
  mesh(fittings.build(), parts);

  // amphibious wheels (retract into the floats): main wheels aft of the step, nose wheels at the bows
  const wheels = new THREE.Group();
  root.add(wheels);
  const tyre = new THREE.TorusGeometry(0.2, 0.09, 6, 16);
  const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12);
  const wheelKit = new Batch();
  for (const side of [-1, 1]) {
    for (const [x, r] of [[-0.9, 1.0], [2.3, 0.7]] as [number, number][]) {
      wheelKit.add(tyre, at([x, -2.28, side * 1.25], undefined, r), SURF.rubber);
      wheelKit.add(hubGeo, at([x, -2.28, side * 1.25], [Math.PI / 2, 0, 0], r), SURF.metal);
    }
  }
  mesh(wheelKit.build(), parts, { parent: wheels, receive: false });
  return { waterRudders, wheels };
}
