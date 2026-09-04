import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Batch, bladeGeometry, deckGeometry, fairedStrutGeometry, gridGeometry, halfWidthAt, humpGeometry, inBlock, insetSections, keyedRing, loft, loftGrid,
  partsMaterial, placement, revealGeometry, sectionAt, sectionPerimeter, strutGeometry, tOfHeight, wingLowerY, wingPanel, wingUpperY, wingXLE, wingXTE, withStations,
  type QuadBlock, type Section, type Surf, type WingSpec,
} from './geometry';
import { CHEAT_LINE, floatMaps, fuselageMaps, LIVERY, panelTexture, propDiscTexture, wingMaps, type FuselageLayout } from './textures';

/** fuselage skin thickness: the cabin interior is the exterior loft offset inwards by this much */
const SKIN = 0.05;
/** window band heights (body space): sill, top of the side windows, bottom of the windshield side-lights */
const SILL = 0.40, WIN_TOP = 1.00, WS_BASE = 0.78;
/** cabin interior extent (firewall .. rear bulkhead) */
const CABIN_FRONT = 2.30, CABIN_REAR = -1.60;
const WING_POS = new THREE.Vector3(0.55, 1.285, 0);

/** Finishes of the untextured parts; all of them share one `partsMaterial` (colour/roughness/metalness per vertex). */
const SURF = {
  metal: { color: 0x8e949a, roughness: 0.38, metalness: 0.9 },
  darkMetal: { color: 0x2c2f33, roughness: 0.45, metalness: 0.8 },
  exhaust: { color: 0x5a4a3c, roughness: 0.6, metalness: 0.9 },
  rubber: { color: 0x111214, roughness: 0.92, metalness: 0.0 },
  cabin: { color: 0x9c9ea2, roughness: 0.85, metalness: 0.0 },
  frame: { color: 0x3a3d42, roughness: 0.6, metalness: 0.2 },
  plastic: { color: 0x3a3d42, roughness: 0.7, metalness: 0.0 },
  leather: { color: 0x7a5535, roughness: 0.55, metalness: 0.0 },
  carpet: { color: 0x35302b, roughness: 0.95, metalness: 0.0 },
  prop: { color: 0x1e1f22, roughness: 0.5, metalness: 0.6 },
  propTip: { color: 0xf2c230, roughness: 0.5, metalness: 0.0 },
  shirt: { color: 0x2f4f6f, roughness: 0.85, metalness: 0.0 },
  skin: { color: 0xc8956c, roughness: 0.7, metalness: 0.0 },
  headset: { color: 0x1a1a1c, roughness: 0.5, metalness: 0.0 },
  throttle: { color: 0x222222, roughness: 0.6, metalness: 0.0 },
  mixture: { color: 0xc0392b, roughness: 0.6, metalness: 0.0 },
} satisfies Record<string, Surf>;

/**
 * Procedural bush floatplane "Garza 7". Local axes: +X nose, +Y up, +Z starboard. Origin at the
 * fuselage datum roughly under the wing's 30% chord; the floats' keels sit near y = -2.25.
 *
 * Static parts are merged per material (one draw call each); only the animated parts (propeller, control
 * surfaces, water rudders, wheels, yokes, lights) are separate meshes.
 */
export class PlaneModel {
  readonly root = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly glassMaterial: THREE.MeshPhysicalMaterial;
  readonly paintMaterial: THREE.MeshPhysicalMaterial;
  // animated parts
  readonly propeller = new THREE.Group();
  readonly propDisc: THREE.Mesh;
  /** spinner + hub (always turning) and the three blades (hidden at speed, when the blur disc takes over) */
  readonly propHub: THREE.Mesh;
  readonly propBlades: THREE.Mesh;
  readonly aileronL: THREE.Group;
  readonly aileronR: THREE.Group;
  readonly flapL: THREE.Group;
  readonly flapR: THREE.Group;
  readonly elevator: THREE.Group;
  readonly rudder: THREE.Group;
  readonly waterRudders: THREE.Group[] = [];
  readonly wheels: THREE.Group;
  readonly navRed: THREE.Mesh;
  readonly navGreen: THREE.Mesh;
  readonly strobe: THREE.Mesh;
  readonly beacon: THREE.Mesh;
  readonly yokeL: THREE.Group;
  readonly yokeR: THREE.Group;
  readonly throttleLever: THREE.Mesh;
  /** hardpoints in local space */
  readonly exhaustPos = new THREE.Vector3(2.6, -0.55, 0.66);
  readonly floatSternL = new THREE.Vector3(-2.2, -2.15, -1.25);
  readonly floatSternR = new THREE.Vector3(-2.2, -2.15, 1.25);
  readonly floatBowL = new THREE.Vector3(2.6, -2.0, -1.25);
  readonly floatBowR = new THREE.Vector3(2.6, -2.0, 1.25);
  readonly wingTipL = new THREE.Vector3(-0.04, 1.435, -7.5);
  readonly wingTipR = new THREE.Vector3(-0.04, 1.435, 7.5);
  readonly cockpitEye = new THREE.Vector3(1.05, 0.86, -0.36);
  readonly exteriorMeshes: THREE.Mesh[] = [];
  readonly interiorMeshes: THREE.Object3D[] = [];
  readonly spanHalf = 7.5;

  constructor() {
    // ------------------------------------------------------------ fuselage loft
    // Upper exponent rises through the cabin so the roof is flat enough to carry the wing; the windshield runs
    // from the cowl (x 2.30, y 0.81) up to the roof line (x 1.85, y 1.17).
    const base: Section[] = [
      { x: 4.55, yc: 0.02, w: 0.30, top: 0.30, bot: 0.30, n: 2.0 },
      { x: 4.35, yc: 0.02, w: 0.55, top: 0.55, bot: 0.55, n: 2.0 },
      { x: 3.90, yc: 0.02, w: 0.72, top: 0.70, bot: 0.70, n: 2.1 },
      { x: 3.20, yc: 0.03, w: 0.75, top: 0.72, bot: 0.70, n: 2.3 },
      { x: 2.60, yc: 0.04, w: 0.77, top: 0.74, bot: 0.70, n: 3.0, nBot: 2.4 },
      { x: 2.30, yc: 0.05, w: 0.78, top: 0.76, bot: 0.70, n: 6.0, nBot: 2.4 },
      { x: 2.15, yc: 0.05, w: 0.79, top: 0.88, bot: 0.70, n: 4.4, nBot: 2.4 },
      { x: 2.00, yc: 0.05, w: 0.80, top: 1.01, bot: 0.70, n: 3.8, nBot: 2.4 },
      { x: 1.85, yc: 0.05, w: 0.80, top: 1.12, bot: 0.70, n: 3.6, nBot: 2.4 },
      { x: 1.73, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 3.6, nBot: 2.4 },
      { x: 0.95, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 3.6, nBot: 2.4 },
      { x: 0.00, yc: 0.05, w: 0.80, top: 1.13, bot: 0.68, n: 3.6, nBot: 2.4 },
      { x: -0.40, yc: 0.05, w: 0.79, top: 1.12, bot: 0.66, n: 3.5, nBot: 2.4 },
      { x: -0.90, yc: 0.05, w: 0.76, top: 1.08, bot: 0.62, n: 3.3, nBot: 2.4 },
      { x: -1.25, yc: 0.055, w: 0.70, top: 1.00, bot: 0.56, n: 3.0, nBot: 2.3 },
      { x: -1.60, yc: 0.06, w: 0.62, top: 0.90, bot: 0.50, n: 2.7, nBot: 2.2 },
      { x: -2.60, yc: 0.10, w: 0.44, top: 0.62, bot: 0.34, n: 2.3, nBot: 2.1 },
      { x: -3.70, yc: 0.16, w: 0.28, top: 0.42, bot: 0.20, n: 2.1 },
      { x: -4.70, yc: 0.24, w: 0.15, top: 0.30, bot: 0.10, n: 2.0 },
      { x: -5.35, yc: 0.30, w: 0.06, top: 0.22, bot: 0.04, n: 2.0 },
    ];
    // side windows [front x, aft x, top height]; pillars are the strips left between them
    const sideWindows: [number, number, number][] = [[1.77, 0.95, WIN_TOP], [0.85, -0.42, WIN_TOP], [-0.52, -1.25, WS_BASE]];
    const sections = withStations(base, [CABIN_FRONT, CABIN_REAR, ...sideWindows.flatMap(([a, b]) => [a, b])]);
    const si = (x: number): number => sections.findIndex((s) => Math.abs(s.x - x) < 1e-6);
    // livery sill line (bottom of the white upper body): level along the cabin, drooping toward the tail
    const sillY = (x: number): number => (x >= CABIN_REAR ? SILL : SILL - ((CABIN_REAR - x) / (5.35 + CABIN_REAR)) * 0.10);
    // ring vertices land exactly on the window heights (straight cut-out edges) and on the cheat line edges (the
    // texture's v is the ring parameter, so the paint bands stay at their heights on the boxy cabin sections too)
    const ring = keyedRing([
      { y: WIN_TOP, segs: 3, fallbackT: 0.10 }, { y: WS_BASE, segs: 2, fallbackT: 0.146 }, { y: (s) => sillY(s.x), segs: 4, fallbackT: 0.2125 },
      { y: (s) => sillY(s.x) - CHEAT_LINE.top, segs: 1, fallbackT: 0.23 }, { y: (s) => sillY(s.x) - CHEAT_LINE.bottom, segs: 1, fallbackT: 0.26 },
      { y: (s) => sillY(s.x) - CHEAT_LINE.pin, segs: 1, fallbackT: 0.27 },
    ], 8);
    const jA = 3, jB = 5, jC = 9;
    const outer = loftGrid(sections, ring);
    const R = outer.R;
    // interior shell: same stations and ring parameters, sections shrunk by the skin thickness
    const inner = loftGrid(insetSections(sections, SKIN), (_s, i) => outer.t[i]);
    const blocks: QuadBlock[] = [];
    for (const [xf, xa, top] of sideWindows) {
      const jTop = top === WIN_TOP ? jA : jB;
      blocks.push({ i0: si(xf), i1: si(xa), j0: jTop, j1: jC });
      blocks.push({ i0: si(xf), i1: si(xa), j0: R - jC, j1: R - jTop });
    }
    // wraparound windshield: the top of the loft (across the ring seam) from the port to the starboard WS_BASE height
    blocks.push({ i0: si(CABIN_FRONT), i1: si(1.85), j0: R - jB, j1: R + jB });
    const isWindow = (i: number, j: number) => blocks.some((b) => inBlock(b, R, i, j));
    const iFront = si(CABIN_FRONT), iRear = si(CABIN_REAR);

    const noseX = sections[0].x, length = noseX - sections[sections.length - 1].x;
    // v of height y between stations the way the mesh maps it: the ring parameter at each bracketing station,
    // interpolated linearly along x (a section interpolated first would put the paint edges off the vertex rows)
    const vBetween = (x: number, y: number): number | null => {
      let i = 0;
      while (i < sections.length - 2 && sections[i + 1].x > x) i++;
      const a = sections[i], b = sections[i + 1];
      const f = THREE.MathUtils.clamp((a.x - x) / Math.max(a.x - b.x, 1e-6), 0, 1);
      const ta = tOfHeight(a, y), tb = tOfHeight(b, y);
      if (ta === null && tb === null) return null;
      if (ta === null) return tb;
      if (tb === null) return ta;
      return ta + (tb - ta) * f;
    };
    const layout: FuselageLayout = {
      length,
      uOf: (x) => (noseX - x) / length,
      xOf: (u) => noseX - u * length,
      vOf: vBetween,
      topV: (x, z) => {
        const s = sectionAt(sections, x), n = s.n ?? 2.2;
        const r = Math.min(Math.abs(z) / s.w, 0.999);
        return tOfHeight(s, s.yc + s.top * Math.pow(1 - Math.pow(r, n), 1 / n) * 0.999) ?? 0;
      },
      perimeter: (x) => sectionPerimeter(sectionAt(sections, x)),
      sillY,
    };

    // ------------------------------------------------------------ materials
    const fus = fuselageMaps(layout), wing = wingMaps(), flt = floatMaps();
    const paint = new THREE.MeshPhysicalMaterial({
      map: fus.map, roughnessMap: fus.roughnessMap, normalMap: fus.normalMap, normalScale: new THREE.Vector2(0.55, 0.55),
      color: 0xffffff, roughness: 1.0, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.0,
    });
    // vertexColors: wingPanel() shades the faces inside the hinge gaps dark so the gap reads as a line
    const wingPaint = new THREE.MeshPhysicalMaterial({
      map: wing.map, roughnessMap: wing.roughnessMap, normalMap: wing.normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
      color: 0xffffff, roughness: 1.0, metalness: 0.0, clearcoat: 0.65, clearcoatRoughness: 0.14, envMapIntensity: 1.0, vertexColors: true,
    });
    const floatPaint = new THREE.MeshPhysicalMaterial({
      map: flt.map, roughnessMap: flt.roughnessMap, normalMap: flt.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
      color: 0xffffff, roughness: 1.0, metalness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 1.0,
    });
    // Thin glass: a faint cool tint at low alpha; the reflection comes from the physically based specular terms and
    // is composited on top with premultiplied blending so it does not depend on the opacity. The Fresnel term also
    // reduces the transmitted background. Front faces only: the outer pane is seen from outside, the inner (flipped)
    // pane from the pilot seat, so no back faces are ever drawn.
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x9fc3d2, transparent: true, opacity: 0.12, roughness: 0.04, metalness: 0.0, envMapIntensity: 1.0,
      side: THREE.FrontSide, depthWrite: false, specularIntensity: 1.0, ior: 1.52, premultipliedAlpha: true,
    });
    glass.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <opaque_fragment>', /* glsl */ `
          float glassNdv = saturate(dot(normalize(normal), normalize(vViewPosition)));
          float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
          float glassA = clamp(diffuseColor.a + glassF * 0.85, 0.0, 1.0);
          gl_FragColor = vec4(totalDiffuse * diffuseColor.a + totalSpecular, glassA);
        `)
        .replace('#include <premultiplied_alpha_fragment>', '');
    };
    glass.customProgramCacheKey = () => 'cockpit-glass-v2';
    const plainPaint = new THREE.MeshPhysicalMaterial({ color: LIVERY.upper, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    const parts = partsMaterial();
    const panelTex = panelTexture();
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex.map, emissiveMap: panelTex.emissive, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.7 });
    this.materials.push(paint, wingPaint, floatPaint, glass, plainPaint, parts, panelMat);
    this.glassMaterial = glass;
    this.paintMaterial = paint;

    /** finished mesh of a batch (or single geometry) with shadow flags, registered as exterior or interior */
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, o: { parent?: THREE.Object3D; exterior?: boolean; cast?: boolean; receive?: boolean } = {}): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
      (o.parent ?? this.root).add(m);
      if (o.exterior ?? true) this.exteriorMeshes.push(m); else this.interiorMeshes.push(m);
      return m;
    };
    const at = placement;

    // ------------------------------------------------------------ fuselage shell, cabin, glass
    mesh(gridGeometry(outer, { quad: (i, j) => !isWindow(i, j), capStart: true, capEnd: true }), paint);
    // fixed cabin surfaces that must not cast shadows (the skin already does): shell, window reveals, floor, glare shield
    const cabinFixed = new Batch();
    cabinFixed.add(gridGeometry(inner, { i0: iFront, i1: iRear, quad: (i, j) => !isWindow(i, j), flip: true, capStart: true, capEnd: true }), undefined, SURF.cabin);
    for (const b of blocks) cabinFixed.add(revealGeometry(outer, inner, b), undefined, SURF.frame);
    const innerSections = insetSections(sections, SKIN);
    cabinFixed.add(deckGeometry(innerSections, -0.50, -1.55, 1.95, 0.01), undefined, SURF.carpet);
    cabinFixed.add(deckGeometry(innerSections, 0.74, 1.94, CABIN_FRONT - 0.005, 0.005), undefined, SURF.plastic);
    // both panes in one mesh: the outer pane first (seen from outside), then the flipped inner pane (pilot seat)
    const glassGeo = mergeGeometries([gridGeometry(outer, { quad: isWindow }), gridGeometry(inner, { i0: iFront, i1: iRear, quad: isWindow, flip: true })]);
    const glassMesh = mesh(glassGeo, glass, { cast: false, receive: false });
    glassMesh.renderOrder = 20;
    // cabin furniture (casts shadows inside the cabin)
    const cabinKit = new Batch();
    // windshield centre post between the two panes along the glass centreline
    const wsBase = new THREE.Vector3(CABIN_FRONT, 0.81, 0), wsTop = new THREE.Vector3(1.85, 1.17, 0);
    const postPos = wsBase.clone().add(wsTop).multiplyScalar(0.5); postPos.y -= SKIN * 0.5;
    cabinKit.add(new THREE.BoxGeometry(wsBase.distanceTo(wsTop) + 0.04, 0.028, 0.026), at(postPos, [0, 0, Math.atan2(wsTop.y - wsBase.y, wsTop.x - wsBase.x)]), SURF.plastic);

    // ------------------------------------------------------------ exterior fittings (one merged mesh)
    const fittings = new Batch();
    // door steps
    for (const side of [-1, 1]) fittings.add(new THREE.BoxGeometry(0.3, 0.04, 0.22), at([1.3, -0.45, side * 0.72]), SURF.darkMetal);
    // engine exhaust stubs
    for (let i = 0; i < 2; i++) fittings.add(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 10), at([2.75 - i * 0.22, -0.5, 0.62 + i * 0.03], [0.6, 0, 1.2]), SURF.exhaust);
    // intake scoop on the cowl top, cowl flaps (white paint batch)
    const white = new Batch();
    white.add(new THREE.BoxGeometry(0.5, 0.12, 0.28), at([3.7, 0.70, 0]));
    for (let i = 0; i < 2; i++) white.add(new THREE.BoxGeometry(0.28, 0.04, 0.22), at([3.0, -0.62, (i === 0 ? -1 : 1) * 0.35], [(i === 0 ? -1 : 1) * 0.35, 0, 0]));

    // ------------------------------------------------------------ propeller: spinner + hub, 3 blades, blur disc
    this.propeller.position.set(4.62, 0.02, 0);
    this.root.add(this.propeller);
    const hub = new Batch();
    hub.add(new THREE.ConeGeometry(0.26, 0.55, 20), at([0.27, 0, 0], [0, 0, -Math.PI / 2]), SURF.metal);
    hub.add(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 20), at([-0.02, 0, 0], [0, 0, Math.PI / 2]), SURF.darkMetal);
    this.propHub = mesh(hub.build(), parts, { parent: this.propeller, receive: false });
    const blades = new Batch();
    const bladeGeo = bladeGeometry(1.32, 0.19, 0.11), tipGeo = new THREE.BoxGeometry(0.02, 0.14, 0.12);
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Matrix4().makeRotationX((i / 3) * Math.PI * 2);
      blades.add(bladeGeo, pivot.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.16, 0)), SURF.prop);
      blades.add(tipGeo, pivot.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.4, 0)), SURF.propTip);
    }
    this.propBlades = mesh(blades.build(), parts, { parent: this.propeller, receive: false });
    const discMat = new THREE.MeshStandardMaterial({ map: propDiscTexture(), transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6, color: 0x888888 });
    this.materials.push(discMat);
    this.propDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), discMat);
    this.propDisc.rotation.y = Math.PI / 2;
    this.propDisc.position.x = 0.05;
    this.propDisc.renderOrder = 15;
    this.propeller.add(this.propDisc);

    // ------------------------------------------------------------ wing
    // straight trailing edge (sweep chosen so xTE is constant), gentle taper, 13% airfoil with washout
    const wingSpec: WingSpec = { span: 7.3, rootChord: 1.95, tipChord: 1.55, sweep: -0.28, dihedral: 0.02, thickness: 0.13, twist: -0.03, camber: 0.02 };
    const xte = wingXTE(wingSpec, 0);
    const flapHinge = xte + 0.52, ailHinge = xte + 0.46;
    const wingGeo = mergeGeometries([
      wingPanel(wingSpec, { z0: 0, z1: 0.85, segments: 2, part: 'full', hingeX: flapHinge, capEnd: 'rear' }),
      wingPanel(wingSpec, { z0: 0.85, z1: 3.55, segments: 6, part: 'front', hingeX: flapHinge }),
      wingPanel(wingSpec, { z0: 3.55, z1: 3.65, segments: 1, part: 'full', hingeX: flapHinge, capStart: 'rear', capEnd: 'rear' }),
      wingPanel(wingSpec, { z0: 3.65, z1: 6.90, segments: 7, part: 'front', hingeX: ailHinge }),
      wingPanel(wingSpec, { z0: 6.90, z1: 7.30, segments: 1, part: 'full', hingeX: ailHinge, capStart: 'rear', tipRound: 0.22 }),
    ]);
    // every fixed lifting surface (wings, stabiliser, fin) shares the wing paint: one mesh
    const airframe = new Batch();
    for (const side of [1, -1]) airframe.add(wingGeo, at(WING_POS, undefined, [1, 1, side]));
    // centre-section fairing: a smooth hump on the roof. Between the leading and trailing edges its crest runs just
    // inside the wing (on the camber line where the wing is thin, so it meets the edges exactly); ahead and behind it
    // tapers tangentially into the roof. Its underside is sunk into the skin so nothing shows inside the cabin.
    const roofY = (x: number, z: number) => {
      const s = sectionAt(sections, x), n = s.n ?? 2.2;
      return s.yc + s.top * Math.pow(Math.max(1 - Math.pow(Math.min(Math.abs(z) / s.w, 1), n), 0), 1 / n);
    };
    const wl = (x: number) => WING_POS.y + wingLowerY(wingSpec, x - WING_POS.x, 0);
    const wu = (x: number) => WING_POS.y + wingUpperY(wingSpec, x - WING_POS.x, 0);
    const inWing = (x: number) => { const lo = wl(x), hi = wu(x); return lo + Math.min(0.05, 0.5 * (hi - lo)); };
    const xLE = WING_POS.x + wingXLE(wingSpec, 0), xTE = WING_POS.x + xte;
    const FAIR_FWD = 0.45, FAIR_AFT = 0.62;
    const hLE = inWing(xLE - 0.01) - roofY(xLE, 0), hTE = inWing(xTE + 0.01) - roofY(xTE, 0);
    const fairF = (x: number) => {
      const d = x > xLE ? (x - xLE) / FAIR_FWD : x < xTE ? (xTE - x) / FAIR_AFT : 0;
      const f = 1 - Math.min(d, 1);
      return f * f * (3 - 2 * f);
    };
    const fairW = (x: number) => 0.28 + 0.42 * Math.sqrt(fairF(x));
    const crestH = (x: number) => (x > xLE ? hLE * fairF(x) : x < xTE ? hTE * fairF(x) : inWing(x) - roofY(x, 0));
    const bump = (r: number) => Math.pow(Math.max(1 - Math.pow(Math.min(r, 1), 4), 0), 1.6);
    const fairXs = [0.45, 0.33, 0.22, 0.13, 0.06].map((d) => xLE + d)
      .concat([0, 0.03, 0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.82, 0.91, 0.97, 1].map((f) => xLE - f * wingSpec.rootChord))
      .concat([0.07, 0.16, 0.27, 0.4, 0.52, 0.62].map((d) => xTE - d));
    white.add(humpGeometry(
      fairXs.map((x) => ({ x, w: fairW(x) })),
      (x, z) => roofY(x, z) - 0.012 + crestH(x) * bump(Math.abs(z) / fairW(x)),
      (x, z) => roofY(x, z) - 0.03,
    ));
    // control surfaces: rear airfoil segments hinged in the notches, tilted with the dihedral so the hinge is straight
    const mkSurface = (z0: number, z1: number, hingeX: number, segments: number): [THREE.Group, THREE.Group] => {
      const geo = wingPanel({ ...wingSpec, dihedral: 0 }, { z0, z1, segments, part: 'rear', hingeX, gap: 0.02, capStart: 'rear', capEnd: 'rear' });
      geo.translate(-hingeX, 0, 0);
      const out: THREE.Group[] = [];
      for (const side of [1, -1]) {
        const hinge = new THREE.Group();
        hinge.position.set(WING_POS.x + hingeX, WING_POS.y, 0);
        hinge.rotation.x = -side * wingSpec.dihedral;
        hinge.scale.z = side;
        const g = new THREE.Group();
        mesh(geo, wingPaint, { parent: g });
        hinge.add(g); this.root.add(hinge);
        out.push(g);
      }
      return [out[0], out[1]];
    };
    [this.flapR, this.flapL] = mkSurface(0.87, 3.53, flapHinge, 5);
    [this.aileronR, this.aileronL] = mkSurface(3.67, 6.88, ailHinge, 6);
    // wingtip nav lights
    this.navRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1a1a, emissiveIntensity: 3 }));
    this.navRed.position.copy(this.wingTipL); this.root.add(this.navRed);
    this.navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x1aff44, emissiveIntensity: 3 }));
    this.navGreen.position.copy(this.wingTipR); this.root.add(this.navGreen);
    this.materials.push(this.navRed.material as THREE.Material, this.navGreen.material as THREE.Material);
    // pitot tube under the port wing
    fittings.add(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), at([WING_POS.x + 0.45, wl(WING_POS.x + 0.25) - 0.06, -3.2], [0, 0, Math.PI / 2]), SURF.metal);

    // ------------------------------------------------------------ tail
    const hstabSpec: WingSpec = { span: 2.55, rootChord: 1.05, tipChord: 0.80, sweep: -0.175, dihedral: 0, thickness: 0.09, twist: 0, camber: 0 };
    const elevHinge = wingXTE(hstabSpec, 0) + 0.34;
    const hsGeo = mergeGeometries([
      wingPanel(hstabSpec, { z0: 0, z1: 0.10, segments: 1, part: 'full', hingeX: elevHinge, capEnd: 'rear', n: 9 }),
      wingPanel(hstabSpec, { z0: 0.10, z1: 2.40, segments: 4, part: 'front', hingeX: elevHinge, n: 9 }),
      wingPanel(hstabSpec, { z0: 2.40, z1: 2.55, segments: 1, part: 'full', hingeX: elevHinge, capStart: 'rear', tipRound: 0.12, n: 9 }),
    ]);
    const HSTAB = new THREE.Vector3(-4.25, 0.42, 0);
    for (const side of [-1, 1]) airframe.add(hsGeo, at(HSTAB, undefined, [1, 1, side]));
    this.elevator = new THREE.Group();
    this.elevator.position.set(HSTAB.x + elevHinge, HSTAB.y, 0);
    this.root.add(this.elevator);
    const elGeo = wingPanel(hstabSpec, { z0: 0.12, z1: 2.38, segments: 4, part: 'rear', hingeX: elevHinge, gap: 0.015, capStart: 'rear', capEnd: 'rear', n: 9 });
    elGeo.translate(-elevHinge, 0, 0);
    const elevBatch = new Batch();
    for (const side of [-1, 1]) elevBatch.add(elGeo, at(undefined, undefined, [1, 1, side]));
    mesh(elevBatch.build(), wingPaint, { parent: this.elevator });
    // vertical fin: a wing profile rotated upright, rudder hinged in its notch
    const finSpec: WingSpec = { span: 1.55, rootChord: 1.5, tipChord: 0.75, sweep: -0.55, dihedral: 0, thickness: 0.09, twist: 0, camber: 0 };
    const rudHinge = wingXTE(finSpec, 0) + 0.48;
    const finGeo = mergeGeometries([
      wingPanel(finSpec, { z0: 0, z1: 0.06, segments: 1, part: 'full', hingeX: rudHinge, capEnd: 'rear', n: 9 }),
      wingPanel(finSpec, { z0: 0.06, z1: 1.45, segments: 3, part: 'front', hingeX: rudHinge, n: 9 }),
      wingPanel(finSpec, { z0: 1.45, z1: 1.55, segments: 1, part: 'full', hingeX: rudHinge, capStart: 'rear', tipRound: 0.10, n: 9 }),
    ]);
    const FIN = new THREE.Vector3(-4.35, 0.45, 0);
    airframe.add(finGeo, at(FIN, [-Math.PI / 2, 0, 0]));
    mesh(airframe.build(), wingPaint);
    white.add(new THREE.BoxGeometry(1.4, 0.32, 0.08), at([-3.4, 0.55, 0], [0, 0, -0.25]));
    mesh(white.build(), plainPaint);
    this.rudder = new THREE.Group();
    this.rudder.position.set(FIN.x + rudHinge, FIN.y, 0);
    this.root.add(this.rudder);
    const rudGeo = wingPanel(finSpec, { z0: 0.08, z1: 1.43, segments: 3, part: 'rear', hingeX: rudHinge, gap: 0.015, capStart: 'rear', capEnd: 'rear', n: 9 });
    rudGeo.translate(-rudHinge, 0, 0);
    mesh(new Batch().add(rudGeo, at(undefined, [-Math.PI / 2, 0, 0])).build(), wingPaint, { parent: this.rudder });
    this.strobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 }));
    this.strobe.position.set(-5.0, 2.02, 0); this.root.add(this.strobe);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2200, emissiveIntensity: 0 }));
    this.beacon.position.set(-1.55, 1.0, 0); this.root.add(this.beacon);
    this.materials.push(this.strobe.material as THREE.Material, this.beacon.material as THREE.Material);
    fittings.add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), at([-2.0, 0.9, 0], [0, 0, 0.5]), SURF.metal);

    // ------------------------------------------------------------ floats & struts
    const floatSections: Section[] = [
      { x: 2.95, yc: -1.85, w: 0.06, top: 0.08, bot: 0.06, n: 2.0 },
      { x: 2.6, yc: -1.9, w: 0.2, top: 0.15, bot: 0.18, n: 2.2, nBot: 1.5 },
      { x: 1.9, yc: -1.95, w: 0.33, top: 0.18, bot: 0.28, n: 2.6, nBot: 1.4 },
      { x: 0.8, yc: -1.95, w: 0.37, top: 0.19, bot: 0.32, n: 2.8, nBot: 1.4 },
      { x: -0.2, yc: -1.95, w: 0.37, top: 0.19, bot: 0.30, n: 2.8, nBot: 1.4 },
      { x: -0.35, yc: -1.95, w: 0.36, top: 0.19, bot: 0.22, n: 2.8, nBot: 1.5 }, // step
      { x: -1.3, yc: -1.92, w: 0.33, top: 0.18, bot: 0.2, n: 2.7, nBot: 1.6 },
      { x: -2.3, yc: -1.86, w: 0.25, top: 0.15, bot: 0.12, n: 2.5, nBot: 1.8 },
      { x: -2.75, yc: -1.8, w: 0.12, top: 0.1, bot: 0.05, n: 2.2 },
    ];
    const floatGeo = loft(floatSections, 20);
    const floats = new Batch();
    // wing strut attachment points sit on the wing's lower surface
    const strutZ = 2.9;
    const strutTop = (xLocal: number) => new THREE.Vector3(WING_POS.x + xLocal, WING_POS.y + wingLowerY(wingSpec, xLocal, strutZ) + 0.03, 0);
    const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    for (const side of [-1, 1]) {
      floats.add(floatGeo, at([0, 0, side * 1.25]));
      // rubber bumper at the bow
      fittings.add(new THREE.SphereGeometry(0.09, 10, 8), at([2.98, -1.85, side * 1.25]), SURF.rubber);
      // struts: front pair & rear pair from float deck to fuselage belly, plus diagonal braces
      const deckY = -1.76;
      const belly = -0.62;
      fittings.add(fairedStrutGeometry(V3(1.6, deckY, side * 1.25), V3(1.4, belly, side * 0.55), 0.14, 0.05), undefined, SURF.metal);
      fittings.add(fairedStrutGeometry(V3(-0.9, deckY, side * 1.25), V3(-0.7, belly, side * 0.5), 0.14, 0.05), undefined, SURF.metal);
      fittings.add(strutGeometry(V3(1.6, deckY, side * 1.25), V3(-0.7, belly, side * 0.5), 0.025), undefined, SURF.metal);
      fittings.add(strutGeometry(V3(-0.9, deckY, side * 1.25), V3(1.4, belly, side * 0.55), 0.025), undefined, SURF.metal);
      // wing struts (V) from float deck to wing underside
      const frontTop = strutTop(0.25).setZ(side * strutZ), rearTop = strutTop(-0.85).setZ(side * strutZ);
      fittings.add(fairedStrutGeometry(V3(1.3, deckY + 0.1, side * 1.3), frontTop, 0.12, 0.045), undefined, SURF.metal);
      fittings.add(fairedStrutGeometry(V3(-0.2, deckY + 0.1, side * 1.3), rearTop, 0.12, 0.045), undefined, SURF.metal);
      fittings.add(strutGeometry(frontTop.clone().setY(frontTop.y - 0.05), rearTop.clone().setY(rearTop.y - 0.05), 0.03), undefined, SURF.metal);
      // water rudder at the stern
      const wr = new THREE.Group();
      wr.position.set(-2.7, -1.85, side * 1.25);
      mesh(new Batch().add(new THREE.BoxGeometry(0.22, 0.32, 0.03), at([0, -0.18, 0]), SURF.darkMetal).build(), parts, { parent: wr, cast: false, receive: false });
      this.root.add(wr);
      this.waterRudders.push(wr);
      // cleats & hand rails on the deck
      for (const cx of [2.0, 0.4, -1.4]) fittings.add(new THREE.BoxGeometry(0.14, 0.05, 0.05), at([cx, deckY + 0.03, side * 1.25 + 0.2 * side]), SURF.metal);
    }
    fittings.add(fairedStrutGeometry(V3(1.6, -1.72, -1.25), V3(1.6, -1.72, 1.25), 0.1, 0.06), undefined, SURF.metal);
    fittings.add(fairedStrutGeometry(V3(-0.9, -1.72, -1.25), V3(-0.9, -1.72, 1.25), 0.1, 0.06), undefined, SURF.metal);
    mesh(floats.build(), floatPaint);
    mesh(fittings.build(), parts);

    // amphibious wheels (retract into the floats): main wheels aft of the step, nose wheels at the bows
    this.wheels = new THREE.Group();
    this.root.add(this.wheels);
    const tyre = new THREE.TorusGeometry(0.2, 0.09, 8, 16);
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12);
    const wheelKit = new Batch();
    for (const side of [-1, 1]) {
      for (const [x, r] of [[-0.9, 1.0], [2.3, 0.7]] as [number, number][]) {
        wheelKit.add(tyre, at([x, -2.28, side * 1.25], undefined, r), SURF.rubber);
        wheelKit.add(hubGeo, at([x, -2.28, side * 1.25], [Math.PI / 2, 0, 0], r), SURF.metal);
      }
    }
    mesh(wheelKit.build(), parts, { parent: this.wheels, receive: false });

    // ------------------------------------------------------------ cockpit interior (everything sized to the cabin width)
    const innerHalf = (x: number, y: number) => halfWidthAt(sectionAt(innerSections, x), y);
    const panelHalf = innerHalf(2.0, 0.74) - 0.03;
    cabinKit.add(new THREE.BoxGeometry(0.16, 0.42, panelHalf * 2), at([2.0, 0.53, 0]), SURF.plastic);
    const face = mesh(new THREE.PlaneGeometry(panelHalf * 2 - 0.02, 0.40), panelMat, { exterior: false });
    face.position.set(1.915, 0.54, 0); face.rotation.y = -Math.PI / 2;
    cabinKit.add(new THREE.BoxGeometry(0.7, 0.32, 0.22), at([1.7, -0.34, 0]), SURF.plastic);
    this.throttleLever = mesh(new Batch().add(new THREE.BoxGeometry(0.04, 0.22, 0.03), undefined, SURF.throttle).build(), parts, { exterior: false });
    this.throttleLever.position.set(1.75, -0.08, -0.04);
    cabinKit.add(new THREE.BoxGeometry(0.04, 0.2, 0.03), at([1.72, -0.08, 0.04]), SURF.mixture);
    const mkYoke = (z: number): THREE.Group => {
      const g = new THREE.Group();
      const yoke = new Batch();
      yoke.add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), at([0.25, 0, 0], [0, 0, Math.PI / 2]), SURF.darkMetal);
      yoke.add(new THREE.TorusGeometry(0.15, 0.02, 8, 24, Math.PI * 1.3), at(undefined, [Math.PI * 0.85, Math.PI / 2, 0]), SURF.plastic);
      yoke.add(new THREE.BoxGeometry(0.03, 0.03, 0.26), undefined, SURF.plastic);
      const m = new THREE.Mesh(yoke.build(), parts);
      g.add(m);
      g.position.set(1.55, 0.25, z);
      this.root.add(g);
      this.interiorMeshes.push(g);
      return g;
    };
    this.yokeL = mkYoke(-0.35);
    this.yokeR = mkYoke(0.35);
    const seatGeo = new THREE.BoxGeometry(0.46, 0.12, 0.46), backGeo = new THREE.BoxGeometry(0.1, 0.55, 0.46), frameGeo = new THREE.BoxGeometry(0.26, 0.24, 0.26);
    for (const [x, z] of [[1.0, -0.34], [1.0, 0.34], [-0.2, -0.34], [-0.2, 0.34], [-1.0, 0]]) {
      cabinKit.add(seatGeo, at([x, -0.2, z]), SURF.leather);
      cabinKit.add(backGeo, at([x - 0.25, 0.12, z], [0, 0, 0.15]), SURF.leather);
      cabinKit.add(frameGeo, at([x, -0.38, z]), SURF.darkMetal);
    }
    // pilot: torso, head with headset, arms toward the yoke
    cabinKit.add(new THREE.BoxGeometry(0.28, 0.5, 0.42), at([0.95, 0.12, -0.34]), SURF.shirt);
    cabinKit.add(new THREE.SphereGeometry(0.11, 12, 10), at([0.98, 0.5, -0.34]), SURF.skin);
    cabinKit.add(new THREE.TorusGeometry(0.115, 0.018, 6, 16, Math.PI), at([0.98, 0.53, -0.34], [0, Math.PI / 2, 0]), SURF.headset);
    for (const side of [-1, 1]) cabinKit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), at([0.98, 0.5, -0.34 + side * 0.12], [Math.PI / 2, 0, 0]), SURF.headset);
    for (const side of [-1, 1]) cabinKit.add(new THREE.CylinderGeometry(0.04, 0.045, 0.5, 8), at([1.25, 0.2, -0.34 + side * 0.16], [0, 0, Math.PI / 2 - 0.35]), SURF.shirt);
    for (const z of [-0.5, -0.2, 0.2, 0.5]) cabinKit.add(new THREE.BoxGeometry(0.12, 0.18, 0.08), at([1.9, -0.36, z], [0, 0, 0.5]), SURF.darkMetal);
    // overhead switch panel & compass on the glare shield
    cabinKit.add(new THREE.BoxGeometry(0.6, 0.05, 0.4), at([1.3, 1.09, 0]), SURF.plastic);
    cabinKit.add(new THREE.BoxGeometry(0.08, 0.07, 0.09), at([2.05, 0.775, 0]), SURF.plastic);
    mesh(cabinFixed.build(), parts, { exterior: false, cast: false });
    mesh(cabinKit.build(), parts, { exterior: false });

    for (const m of this.materials) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
  }

  /** Animate control surfaces, propeller, lights. Inputs in [-1,1], flaps 0..1, rpm 0..1. */
  animate(pitch: number, roll: number, yaw: number, flaps: number, rpm: number, dt: number, time: number, night: number, gearDown: boolean): void {
    this.aileronR.rotation.z = -roll * 0.35;
    this.aileronL.rotation.z = roll * 0.35;
    this.flapR.rotation.z = flaps * 0.6;
    this.flapL.rotation.z = flaps * 0.6;
    this.elevator.rotation.z = pitch * 0.4;
    this.rudder.rotation.y = -yaw * 0.45;
    for (const wr of this.waterRudders) wr.rotation.y = -yaw * 0.5;
    this.propeller.rotation.x += rpm * 2600 * (Math.PI * 2 / 60) * dt;
    const disc = this.propDisc.material as THREE.MeshBasicMaterial;
    disc.opacity = THREE.MathUtils.clamp((rpm - 0.15) * 1.6, 0, 0.75);
    for (const pivot of this.propeller.children) if (pivot !== this.propDisc) pivot.visible = rpm < 0.55;
    // strobes and beacon
    const strobeOn = (time % 1.2) < 0.06 || ((time + 0.15) % 1.2) < 0.06;
    (this.strobe.material as THREE.MeshStandardMaterial).emissiveIntensity = strobeOn ? 30 : 0;
    (this.beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + 12 * Math.max(0, Math.sin(time * 4.5));
    (this.navRed.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + 6 * night;
    (this.navGreen.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + 6 * night;
    this.wheels.visible = gearDown;
    this.wheels.position.y = gearDown ? 0 : 0.3;
    this.yokeL.rotation.x = roll * 0.8; this.yokeR.rotation.x = roll * 0.8;
    this.yokeL.position.x = 1.55 - pitch * 0.08; this.yokeR.position.x = 1.55 - pitch * 0.08;
  }
}
