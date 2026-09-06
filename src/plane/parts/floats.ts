import * as THREE from 'three';
import { Batch, fairedStrutGeometry, floatHull, sectionAt, strutGeometry, wingLowerY, type FloatStation, type WingSpec } from '../geometry';
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
  /** deck crown height at station x */
  const deckAt = (x: number) => {
    const s = sectionAt(floatSections.map((f) => ({ x: f.x, yc: f.yc, w: f.w, top: f.top, bot: f.bot, n: f.n })), x);
    return s.yc + s.top;
  };
  const floats = new Batch();
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
    floats.add(floatGeo, at([0, 0, side * 1.25]));
    // rubber bumper at the bow
    fittings.add(new THREE.SphereGeometry(0.085, 10, 8), at([2.97, -1.85, side * 1.25]), SURF.rubber);
    // main struts: front and rear pairs from the deck shoes to pads under the belly, plus diagonal braces
    const fDeck = V3(FX, deckAt(FX), side * 1.25), rDeck = V3(RX, deckAt(RX), side * 1.25);
    const fBelly = V3(1.4, belly, side * 0.55), rBelly = V3(-0.7, belly, side * 0.5);
    fittings.add(fairedStrutGeometry(fDeck, fBelly, 0.14, 0.05), undefined, SURF.strut);
    fittings.add(fairedStrutGeometry(rDeck, rBelly, 0.14, 0.05), undefined, SURF.strut);
    fittings.add(strutGeometry(fDeck.clone().add(V3(0.05, 0.03, 0)), rBelly, 0.022), undefined, SURF.strut);
    fittings.add(strutGeometry(rDeck.clone().add(V3(-0.05, 0.03, 0)), fBelly, 0.022), undefined, SURF.strut);
    shoe(fDeck, UPV, 0.22); shoe(rDeck, UPV, 0.22);
    shoe(fBelly, DOWNV, 0.16); shoe(rBelly, DOWNV, 0.16);
    // wing struts (V) from shoes on the outboard deck edge to the wing underside, with a jury strut between them
    const fWing = V3(1.25, deckAt(1.25), side * 1.36), rWing = V3(-0.3, deckAt(-0.3), side * 1.36);
    const frontTop = strutTop(0.25).setZ(side * strutZ), rearTop = strutTop(-0.85).setZ(side * strutZ);
    fittings.add(fairedStrutGeometry(fWing, frontTop, 0.12, 0.045), undefined, SURF.strut);
    fittings.add(fairedStrutGeometry(rWing, rearTop, 0.12, 0.045), undefined, SURF.strut);
    fittings.add(strutGeometry(frontTop.clone().setY(frontTop.y - 0.05), rearTop.clone().setY(rearTop.y - 0.05), 0.03), undefined, SURF.strut);
    shoe(fWing, UPV, 0.16); shoe(rWing, UPV, 0.16);
    // wing strut root fittings under the wing
    for (const top of [frontTop, rearTop]) fittings.add(new THREE.BoxGeometry(0.16, 0.03, 0.10), at(top.clone().setY(top.y - 0.02)), SURF.darkMetal);
    // water rudder at the stern: blade on a hinge post with a tiller arm
    const wr = new THREE.Group();
    wr.position.set(-2.72, -1.83, side * 1.25);
    mesh(new Batch()
      .add(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), at([0, 0.02, 0]), SURF.metal)
      .add(new THREE.BoxGeometry(0.20, 0.30, 0.022), at([-0.06, -0.19, 0]), SURF.darkMetal)
      .add(new THREE.BoxGeometry(0.10, 0.02, 0.02), at([-0.05, 0.09, 0]), SURF.metal)
      .build(), parts, { parent: wr, cast: false, receive: false });
    root.add(wr);
    waterRudders.push(wr);
    // cleats & hand rails on the deck, a mooring cleat at the bow
    for (const cx of [2.0, 0.4, -1.4]) fittings.add(new THREE.BoxGeometry(0.14, 0.05, 0.05), at([cx, deckAt(cx) + 0.025, side * 1.25 + 0.2 * side]), SURF.metal);
    fittings.add(new THREE.BoxGeometry(0.05, 0.05, 0.12), at([2.55, deckAt(2.55) + 0.025, side * 1.25]), SURF.metal);
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
