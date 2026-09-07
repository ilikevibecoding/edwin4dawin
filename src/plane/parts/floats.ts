import * as THREE from 'three';
import { airfoilStrutGeometry, Batch, bottomHeight, deckHeight, floatHull, halfWidthAt, sectionAt, sprayRailGeometry, strutGeometry, wingLowerY, type FloatStation, type Surf, type WingSpec } from '../geometry';
import { SURF } from '../textures';
import { at, UP, V3, WING_POS, type BuildContext } from './context';

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
  // EDO 4930-type hull: hard chine at yc, V bottom (deadrise) to the keel, vertical topsides to a rolled deck edge
  // and a near-flat deck (n 4-5), 0.88 m beam and 0.66 m deep amidships, so about 60 % of the hull stands above the
  // resting waterline. The forebody deepens to the step at x -0.35 (a real vertical step: two stations at one x),
  // the afterbody keel sweeps up to a flat transom carrying the water rudder; the bow rounds down from the deck
  // over a short nose to a bluff stem face with the bumper. Keel and chine heights are the physics datum and are
  // untouched (bow keel -2.08 at x 2.6, -2.25 ahead of the step, -1.98 at x -2.3; at the rest datum y 1.96 the
  // waterline runs ~1-6 cm under the chine along the hull, and the spray sheets root on the chine).
  const floatSections: FloatStation[] = [
    { x: 2.95, yc: -1.86, w: 0.06, top: 0.16, bot: 0.05, n: 2.6, vee: 1.5 },   // stem face
    { x: 2.84, yc: -1.875, w: 0.15, top: 0.27, bot: 0.11, n: 2.9, vee: 1.45 }, // bow nose rounding over
    { x: 2.6, yc: -1.90, w: 0.24, top: 0.32, bot: 0.18, n: 3.4, vee: 1.4 },
    { x: 1.9, yc: -1.95, w: 0.38, top: 0.34, bot: 0.28, n: 4.4, vee: 1.25 },
    { x: 0.8, yc: -1.95, w: 0.44, top: 0.345, bot: 0.32, n: 5.0, vee: 1.15 },
    { x: -0.2, yc: -1.95, w: 0.44, top: 0.345, bot: 0.30, n: 5.0, vee: 1.12 },
    { x: -0.35, yc: -1.95, w: 0.435, top: 0.34, bot: 0.295, n: 5.0, vee: 1.12, split: true }, // step: forebody keel
    { x: -0.35, yc: -1.95, w: 0.435, top: 0.34, bot: 0.215, n: 5.0, vee: 1.15, split: true }, // step: afterbody keel
    { x: -1.3, yc: -1.92, w: 0.40, top: 0.31, bot: 0.20, n: 4.6, vee: 1.2 },
    { x: -2.3, yc: -1.86, w: 0.29, top: 0.235, bot: 0.12, n: 4.0, vee: 1.3 },
    { x: -2.75, yc: -1.80, w: 0.15, top: 0.17, bot: 0.05, n: 3.6, vee: 1.5 },  // transom
  ];
  const floatGeo = floatHull(floatSections, 14, 5);
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
  // ------------------------------------------------------------ float rig
  // Finishes of the rig (per-vertex in the fittings batch): float struts, spreader bars and the ladder are painted
  // the dark grey of the hulls' topsides, semi-matte enamel; their end fittings are dark cadmium-plated steel.
  const RIG: Surf = { color: 0x2f3337, roughness: 0.52, metalness: 0.1 };
  const FIT = SURF.darkMetal;
  /** point on the fuselage's lower skin at station x, half-width z (bisection on the section's lower half) */
  const bellySkin = (x: number, z: number): THREE.Vector3 => {
    const s = sectionAt(sections, x);
    let lo = s.yc - s.bot + 1e-4, hi = s.yc - 1e-4;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (halfWidthAt(s, mid) < Math.abs(z)) lo = mid; else hi = mid; }
    return V3(x, (lo + hi) / 2, z);
  };
  /** outward normal of the lower skin at that point */
  const bellyNormal = (p: THREE.Vector3): THREE.Vector3 => {
    const s = sectionAt(sections, p.x);
    const dzdy = (halfWidthAt(s, p.y + 0.005) - halfWidthAt(s, p.y - 0.005)) / 0.01;
    return V3(0, -dzdy, Math.sign(p.z)).normalize();
  };
  /**
   * Strut root on the fuselage: a doubler plate on the skin turned to the local normal with a clevis block standing
   * on it; the strut itself ends 4 cm inside the skin so its flared cuff meets the plate without a bare cap.
   */
  const bellyFitting = (p: THREE.Vector3, plateX: number, plateZ: number, dx = 0): THREE.Vector3 => {
    const n = bellyNormal(p);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, n);
    // the plate is tangent to a convex skin: centred on the surface so its edges stay flush instead of lifting off
    fittings.add(new THREE.BoxGeometry(plateX, 0.016, plateZ), new THREE.Matrix4().compose(p.clone().add(V3(dx, 0, 0)), q, V3(1, 1, 1)), FIT);
    fittings.add(new THREE.BoxGeometry(0.14, 0.05, 0.10), new THREE.Matrix4().compose(p.clone().addScaledVector(n, 0.03), q, V3(1, 1, 1)), FIT);
    return p.clone().addScaledVector(n, -0.04);
  };
  /**
   * Strut foot on a float: the spreader-bar end fitting, a forged block bolted through the deck with the bar's end
   * inside it and the strut's flared cuff landing on its top; returns where the strut ends (1 cm inside the block).
   */
  const deckFitting = (x: number, zc: number): THREE.Vector3 => {
    const y = deckAt(x);
    fittings.add(new THREE.BoxGeometry(0.38, 0.02, 0.30), at([x, y + 0.008, zc]), FIT);
    fittings.add(new THREE.BoxGeometry(0.34, 0.12, 0.24), at([x, y + 0.07, zc]), FIT);
    for (const dx of [-0.125, 0.125]) for (const dz of [-0.095, 0.095]) fittings.add(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 8), at([x + dx, y + 0.02, zc + dz]), SURF.metal);
    return V3(x, y + 0.12, zc);
  };
  const FX = 1.6, RX = -0.9;   // spreader bar / strut stations on the float decks
  const SPREADER_Y = (x: number) => deckAt(x) + 0.075;
  /** belly attachment points (on the skin) per station: the front pair under the firewall bay, the rear pair under the aft cabin */
  const bellyAt = (side: number) => ({ f: bellySkin(1.4, side * 0.55), r: bellySkin(-0.7, side * 0.5) });
  for (const side of [-1, 1]) {
    const zc = side * 1.25;
    floats.add(floatGeo, at([0, 0, zc]));
    fittings.add(rail, at([0, 0, zc]), FIT);
    fittings.add(rail, at([0, 0, zc], undefined, [1, 1, -1]), FIT);
    // rubber bow bumper: a vertical D-block down the stem face (keel -1.91 .. nose -1.70) with a cap over the nose
    fittings.add(new THREE.CapsuleGeometry(0.048, 0.17, 4, 10), at([2.965, -1.80, zc]), SURF.rubber);
    fittings.add(new THREE.BoxGeometry(0.06, 0.05, 0.12), at([2.945, -1.685, zc]), SURF.rubber);
    // Float struts, an N-truss per side (EDO / DHC-2 arrangement): front and rear main struts of 12 x 4.5 cm
    // streamlined section from the spreader-bar end fittings on the deck up and inboard to the lower skin, flared
    // into root fairings at both ends, and one diagonal from the front fuselage fitting down and aft to the rear
    // float fitting. The earlier rig used 5 cm elliptical tubes that vanished against the water from 30 m.
    const { f: fSkin, r: rSkin } = bellyAt(side);
    // the front plate also carries the diagonal's lug 12 cm aft and 9 cm inboard of the main strut
    const fBelly = bellyFitting(fSkin, 0.42, 0.30, -0.06), rBelly = bellyFitting(rSkin, 0.30, 0.18);
    const fDeck = deckFitting(FX, zc), rDeck = deckFitting(RX, zc);
    fittings.add(airfoilStrutGeometry(fDeck.clone().setY(fDeck.y - 0.01), fBelly, 0.12, 0.045, { flareA: 1.55, flareB: 1.45, cuff: 0.14 }), undefined, RIG);
    fittings.add(airfoilStrutGeometry(rDeck.clone().setY(rDeck.y - 0.01), rBelly, 0.12, 0.045, { flareA: 1.55, flareB: 1.45, cuff: 0.14 }), undefined, RIG);
    // the diagonal's section stands with its chord in the vertical plane of the airflow, so its footprints on the
    // skin and the deck block are long slivers along x: it lands beside the main struts, inboard, not on them
    const dTop = bellySkin(1.4 - 0.12, side * 0.46), dTopN = bellyNormal(dTop);
    fittings.add(new THREE.BoxGeometry(0.12, 0.05, 0.08), new THREE.Matrix4().compose(dTop.clone().addScaledVector(dTopN, 0.03), new THREE.Quaternion().setFromUnitVectors(UP, dTopN), V3(1, 1, 1)), FIT);
    fittings.add(airfoilStrutGeometry(dTop.clone().addScaledVector(dTopN, -0.04), rDeck.clone().add(V3(0.06, -0.01, -side * 0.08)), 0.09, 0.034, { flareA: 1.2, flareB: 1.0, cuff: 0.10 }), undefined, RIG);
    // Lift strut: one streamlined strut per side from the lower longeron just behind the door's aft post up to the
    // wing's front-spar fitting at 40 % span, braced by a jury-strut pair (a shallow V in side view) from the strut's
    // upper third to the wing. The earlier pair of struts rose from the float decks: nothing on a production
    // floatplane carries wing loads through the floats, the floats hang on their own struts.
    const rootFit = V3(0.88, -0.43, side * (halfWidthAt(sectionAt(sections, 0.88), -0.43) - 0.01));
    const topFit = strutTop(0.0).setZ(side * strutZ); // 24 % chord at z 2.9: the front spar
    fittings.add(airfoilStrutGeometry(rootFit, topFit, 0.15, 0.055, { flareA: 1.25, flareB: 1.25, cuff: 0.12 }), undefined, SURF.strut);
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
    // (transom face x -2.75, keel -1.85 .. deck -1.63): the post runs from the lower bracket up past the deck so the
    // horn and its cables sit 3-4 cm above the afterbody deck, not inside the hull
    const WR = V3(-2.81, -1.80, zc), HORN = 0.215;
    for (const [y, len] of [[0.10, 0.13], [-0.04, 0.10]] as const) fittings.add(new THREE.BoxGeometry(len, 0.024, 0.05), at([WR.x + len / 2 - 0.01, WR.y + y, zc]), SURF.darkMetal);
    const blade = new THREE.Shape();
    blade.moveTo(0.045, -0.02); blade.lineTo(0.045, -0.30); blade.lineTo(0.0, -0.36); blade.lineTo(-0.15, -0.35);
    blade.lineTo(-0.19, -0.26); blade.lineTo(-0.17, -0.10); blade.lineTo(-0.12, -0.02); blade.closePath();
    const wr = new THREE.Group();
    wr.position.copy(WR);
    mesh(new Batch()
      .add(new THREE.CylinderGeometry(0.014, 0.014, 0.44, 8), at([0, 0.05, 0]), SURF.metal)
      .add(new THREE.ExtrudeGeometry(blade, { depth: 0.018, bevelEnabled: false }), at([0, 0, -0.009]), SURF.darkMetal)
      .add(new THREE.BoxGeometry(0.03, 0.03, 0.03), at([0, 0.02, 0]), SURF.darkMetal)
      .add(new THREE.BoxGeometry(0.022, 0.014, 0.13), at([0, HORN, 0]), SURF.metal)
      .build(), parts, { parent: wr, cast: false, receive: false });
    root.add(wr);
    waterRudders.push(wr);
    // steering cables from both horn ends forward along the deck to fairleads by the rear strut, the inboard one
    // continuing up alongside the rear main strut to the belly (the retract / steering run into the cabin)
    const fairX = -1.08, fairY = deckAt(fairX, 0.05) + 0.018;
    for (const e of [-1, 1]) {
      const z = zc + e * 0.05;
      cable(V3(WR.x, WR.y + HORN, z), V3(fairX, fairY + 0.01, z));
      fittings.add(new THREE.BoxGeometry(0.05, 0.03, 0.024), at([fairX, fairY, z]), SURF.darkMetal);
    }
    cable(V3(fairX, fairY + 0.01, zc - side * 0.05), rSkin.clone().add(V3(-0.10, 0, -side * 0.03)));
    // deck fittings: horn cleats at the bow and stern (fore-and-aft) and two on the outboard deck edge (athwart)
    cleat(onDeck(2.5, 0, zc), true);
    cleat(onDeck(-2.42, 0, zc), true);
    for (const cx of [1.1, -1.55]) cleat(onDeck(cx, side * 0.3, zc), false);
    // flush pump-out covers, one per watertight compartment, along the inboard edge of the walkway
    for (const hx of [2.2, 0.85, 0.2, -0.55, -1.3, -2.15]) hatch(onDeck(hx, -side * 0.14, zc));
    // Boarding ladder from the inboard float deck up to the door step (the tread under the door's bottom line at
    // x 1.3, y -0.45; buildFittings): two 17 mm tube rails 32 cm apart standing on deck plates 20 cm inboard of the
    // float's centreline and leaning 6 degrees in to end inside the step's underside, two ribbed treads (the step
    // is the third), and a grab hoop on the front strut's inboard face at shoulder height for the climb. Rails stop
    // at the step: anything higher would stand in the swing of the front-hinged door.
    const LZ = zc - side * 0.20, TZ = side * 0.93, LY0 = deckAt(1.2, -side * 0.20), LY1 = -0.455;
    for (const lx of [1.06, 1.38]) {
      const foot = V3(lx, LY0, LZ), top = V3(lx, LY1, TZ);
      fittings.add(new THREE.BoxGeometry(0.07, 0.012, 0.07), at([lx, LY0 + 0.006, LZ]), FIT);
      fittings.add(strutGeometry(foot.clone().setY(LY0 + 0.005), top, 0.017, 8), undefined, RIG);
    }
    for (const f of [0.335, 0.67]) {
      const y = LY0 + (LY1 - LY0) * f, z = LZ + (TZ - LZ) * f;
      fittings.add(new THREE.BoxGeometry(0.34, 0.022, 0.075), at([1.22, y, z]), RIG);
      for (const dz of [-0.022, 0.022]) fittings.add(new THREE.BoxGeometry(0.30, 0.008, 0.008), at([1.22, y + 0.014, z + dz]), FIT);
    }
    // grab hoop: a U of 12 mm tube standing 6 cm off the front strut's inboard face at 55-70 % of its height
    const hoopA = fDeck.clone().lerp(fBelly, 0.55), hoopB = fDeck.clone().lerp(fBelly, 0.70);
    const off = V3(0, 0, -side * 0.065);
    fittings.add(strutGeometry(hoopA.clone().add(off), hoopB.clone().add(off), 0.012, 8), undefined, SURF.metal);
    for (const p of [hoopA, hoopB]) fittings.add(strutGeometry(p.clone().add(V3(0, 0, -side * 0.02)), p.clone().add(off), 0.012, 8), undefined, SURF.metal);
  }
  // spreader bars: 22 x 7.5 cm streamlined box beams from one deck fitting to the other, their ends inside the blocks
  for (const x of [FX, RX]) {
    const y = SPREADER_Y(x);
    fittings.add(airfoilStrutGeometry(V3(x, y, -1.25), V3(x, y, 1.25), 0.22, 0.075), undefined, RIG);
  }
  /** bracing wire with a turnbuckle (barrel and two fork ends) a third of the way from `a` */
  const braceWire = (a: THREE.Vector3, b: THREE.Vector3) => {
    fittings.add(strutGeometry(a, b, 0.0055, 5), undefined, SURF.wire);
    const t0 = 0.30, t1 = t0 + 0.16 / a.distanceTo(b);
    fittings.add(strutGeometry(a.clone().lerp(b, t0), a.clone().lerp(b, t1), 0.011, 6), undefined, SURF.metal);
    for (const t of [t0 - 0.02 / a.distanceTo(b), t1 + 0.02 / a.distanceTo(b)]) fittings.add(strutGeometry(a.clone().lerp(b, t - 0.015 / a.distanceTo(b)), a.clone().lerp(b, t + 0.015 / a.distanceTo(b)), 0.014, 6), undefined, FIT);
  };
  // horizontal bracing wires crossing between the two spreader bars (attached at the bars' inboard fittings)
  const barY = (x: number) => SPREADER_Y(x) + 0.04;
  for (const side of [-1, 1]) {
    braceWire(V3(FX, barY(FX), side * 1.02), V3(RX, barY(RX), -side * 1.02));
    for (const x of [FX, RX]) fittings.add(new THREE.BoxGeometry(0.05, 0.03, 0.04), at([x, SPREADER_Y(x) + 0.045, side * 1.02]), FIT);
  }
  // transverse cross wires at both strut stations: from each belly fitting down to the opposite float's deck block,
  // so the rig shows the classic X between the floats from ahead and astern
  for (const side of [-1, 1]) {
    const { f, r } = bellyAt(side);
    braceWire(f.clone().addScaledVector(bellyNormal(f), 0.03).add(V3(0.06, 0, 0)), V3(FX + 0.10, deckAt(FX) + 0.12, -side * 1.19));
    braceWire(r.clone().addScaledVector(bellyNormal(r), 0.03).add(V3(-0.06, 0, 0)), V3(RX - 0.10, deckAt(RX) + 0.12, -side * 1.19));
  }
  mesh(floats.build(), floatPaint);
  mesh(fittings.build(), parts);

  // Amphibious gear (retracts into the hulls; hidden when up): main wheels on trailing arms out of the afterbody
  // keel just behind the step, nose wheels on forks out of the forefoot. Tyre bottoms are the physics contact
  // points (mains r 0.29 at y -2.28 -> -2.57, nose r 0.20 -> -2.48); the old kit was a bare torus and a puck.
  const wheels = new THREE.Group();
  root.add(wheels);
  const wheelKit = new Batch();
  /** wheel: fat tyre (tread shoulders), rim dish, hub cap with lug nuts, brake drum on the inboard side */
  const wheel = (x: number, y: number, zc: number, side: number, R: number, width: number) => {
    const tube = width / 2, ring = R - tube;
    wheelKit.add(new THREE.TorusGeometry(ring, tube, 10, 24), at([x, y, zc]), SURF.rubber);
    // tread band: a slightly larger flat-sided ring over the crown of the torus
    wheelKit.add(new THREE.CylinderGeometry(R + 0.004, R + 0.004, width * 0.55, 24, 1, true), at([x, y, zc], [Math.PI / 2, 0, 0]), SURF.rubber);
    wheelKit.add(new THREE.CylinderGeometry(ring * 0.98, ring * 0.98, width * 0.5, 16), at([x, y, zc], [Math.PI / 2, 0, 0]), SURF.metal);
    wheelKit.add(new THREE.CylinderGeometry(ring * 0.42, ring * 0.42, width * 0.66, 12), at([x, y, zc], [Math.PI / 2, 0, 0]), SURF.metal);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      wheelKit.add(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 6), at([x + Math.cos(a) * ring * 0.26, y + Math.sin(a) * ring * 0.26, zc - side * width * 0.34], [Math.PI / 2, 0, 0]), SURF.darkMetal);
    }
    wheelKit.add(new THREE.CylinderGeometry(ring * 0.8, ring * 0.8, width * 0.3, 16), at([x, y, zc + side * width * 0.3], [Math.PI / 2, 0, 0]), SURF.darkMetal);
  };
  /** rubber boot sealing a gear leg's slot in the keel: two blocks following the deadrise either side of the keel */
  const keelBoot = (x: number, zc: number, len: number, halfW: number) => {
    const y0 = bottomHeight(floatSections, x, 0), y1 = bottomHeight(floatSections, x, halfW);
    const tilt = Math.atan2(y1 - y0, halfW);
    for (const e of [-1, 1]) wheelKit.add(new THREE.BoxGeometry(len, 0.05, halfW * 1.04), at([x, (y0 + y1) / 2 - 0.018, zc + e * halfW / 2], [-e * tilt, 0, 0]), SURF.rubber);
  };
  /** gear leg: a flat bar from a pivot inside the hull down to the axle */
  const leg = (a: THREE.Vector3, b: THREE.Vector3, depth: number, thick: number) => {
    const dir = b.clone().sub(a);
    wheelKit.add(new THREE.BoxGeometry(dir.length() + 0.06, depth, thick), new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(V3(1, 0, 0), dir.normalize()), V3(1, 1, 1)), SURF.darkMetal);
  };
  for (const side of [-1, 1]) {
    const zc = side * 1.25;
    // main gear: axle, trailing arms from a pivot inside the hull (keel -2.16 at x -0.55) through a rubber boot in
    // the keel, hydraulic retract jack from the arms' mid-point up into the hull behind them
    wheel(-0.9, -2.28, zc, -side, 0.29, 0.20);
    wheelKit.add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), at([-0.9, -2.28, zc], [Math.PI / 2, 0, 0]), SURF.metal);
    const pivot = V3(-0.55, -2.10, zc), axle = V3(-0.9, -2.28, zc);
    for (const dz of [-0.125, 0.125]) leg(pivot.clone().add(V3(0, 0, dz)), axle.clone().add(V3(0, 0, dz)), 0.07, 0.03);
    wheelKit.add(new THREE.BoxGeometry(0.05, 0.04, 0.25), at([-0.72, -2.19, zc]), SURF.darkMetal); // cross tube between the arms
    keelBoot(-0.64, zc, 0.16, 0.16);
    const jackTop = V3(-1.2, -2.13, zc), jackBot = pivot.clone().lerp(axle, 0.6).add(V3(0, 0.03, 0));
    wheelKit.add(strutGeometry(jackTop, jackBot, 0.018, 10), undefined, SURF.metal);
    wheelKit.add(strutGeometry(jackTop, jackTop.clone().lerp(jackBot, 0.5), 0.03, 10), undefined, SURF.darkMetal);
    keelBoot(-1.2, zc, 0.10, 0.07);
    // nose gear: a fork from a pivot inside the forefoot (keel -2.09 at x 2.55) down to the axle, boot at the keel
    wheel(2.3, -2.28, zc, -side, 0.20, 0.13);
    wheelKit.add(new THREE.CylinderGeometry(0.022, 0.022, 0.20, 8), at([2.3, -2.28, zc], [Math.PI / 2, 0, 0]), SURF.metal);
    const nPivot = V3(2.55, -2.05, zc), nAxle = V3(2.3, -2.28, zc);
    for (const dz of [-0.085, 0.085]) leg(nPivot.clone().add(V3(0, 0, dz)), nAxle.clone().add(V3(0, 0, dz)), 0.05, 0.022);
    keelBoot(2.49, zc, 0.12, 0.11);
  }
  mesh(wheelKit.build(), parts, { parent: wheels, receive: false });
  return { waterRudders, wheels };
}
