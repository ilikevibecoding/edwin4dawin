import * as THREE from 'three';
import { bladeGeometry, fairedStrut, loft, plateGeometry, strut, wingGeometry, type Section } from './geometry';
import { floatMaps, fuselageMaps, panelTexture, propDiscTexture, wingMaps } from './textures';

/**
 * Procedural bush floatplane "Garza 7". Local axes: +X nose, +Y up, +Z starboard. Origin at the
 * fuselage datum roughly under the wing's 30% chord; the floats' keels sit near y = -2.25.
 */
export class PlaneModel {
  readonly root = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly glassMaterial: THREE.MeshPhysicalMaterial;
  readonly paintMaterial: THREE.MeshPhysicalMaterial;
  // animated parts
  readonly propeller = new THREE.Group();
  readonly propDisc: THREE.Mesh;
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
  readonly exhaustPos = new THREE.Vector3(2.65, -0.45, 0.42);
  readonly floatSternL = new THREE.Vector3(-2.2, -2.15, -1.25);
  readonly floatSternR = new THREE.Vector3(-2.2, -2.15, 1.25);
  readonly floatBowL = new THREE.Vector3(2.6, -2.0, -1.25);
  readonly floatBowR = new THREE.Vector3(2.6, -2.0, 1.25);
  readonly wingTipL = new THREE.Vector3(0.2, 1.35, -7.3);
  readonly wingTipR = new THREE.Vector3(0.2, 1.35, 7.3);
  readonly cockpitEye = new THREE.Vector3(1.05, 0.86, -0.36);
  readonly exteriorMeshes: THREE.Mesh[] = [];
  readonly interiorMeshes: THREE.Object3D[] = [];
  readonly spanHalf = 7.3;

  constructor() {
    const fus = fuselageMaps(), wing = wingMaps(), flt = floatMaps();
    const paint = new THREE.MeshPhysicalMaterial({
      map: fus.map, roughnessMap: fus.roughnessMap, normalMap: fus.normalMap, normalScale: new THREE.Vector2(0.55, 0.55),
      color: 0xffffff, roughness: 1.0, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.0,
    });
    const wingPaint = new THREE.MeshPhysicalMaterial({
      map: wing.map, roughnessMap: wing.roughnessMap, normalMap: wing.normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
      color: 0xffffff, roughness: 1.0, metalness: 0.0, clearcoat: 0.65, clearcoatRoughness: 0.14, envMapIntensity: 1.0,
    });
    const floatPaint = new THREE.MeshPhysicalMaterial({
      map: flt.map, roughnessMap: flt.roughnessMap, normalMap: flt.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
      color: 0xffffff, roughness: 1.0, metalness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 1.0,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x9fbdd0, transparent: true, opacity: 0.32, roughness: 0.03, metalness: 0.0, envMapIntensity: 1.4,
      side: THREE.DoubleSide, depthWrite: false, specularIntensity: 1.0, ior: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.02,
    });
    const plainPaint = new THREE.MeshPhysicalMaterial({ color: 0xf4f0e6, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x8e949a, roughness: 0.38, metalness: 0.9 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.45, metalness: 0.8 });
    const exhaust = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.6, metalness: 0.9 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.92, metalness: 0.0 });
    const interior = new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.85, metalness: 0.0, envMapIntensity: 2.0 });
    const interiorPlastic = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7, envMapIntensity: 2.0 });
    const seatLeather = new THREE.MeshStandardMaterial({ color: 0x7a5535, roughness: 0.55 });
    const carpet = new THREE.MeshStandardMaterial({ color: 0x35302b, roughness: 0.95 });
    const panelTex = panelTexture();
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex.map, emissiveMap: panelTex.emissive, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.7 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.5, metalness: 0.6 });
    const propTipMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 });
    this.materials.push(paint, wingPaint, floatPaint, glass, plainPaint, metal, darkMetal, exhaust, rubber, interior, interiorPlastic, seatLeather, carpet, panelMat, propMat, propTipMat);
    this.glassMaterial = glass;
    this.paintMaterial = paint;

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = this.root, exterior = true): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      if (exterior) this.exteriorMeshes.push(m); else this.interiorMeshes.push(m);
      return m;
    };

    // ------------------------------------------------------------ fuselage
    const sections: Section[] = [
      { x: 4.55, yc: 0.02, w: 0.30, top: 0.30, bot: 0.30, n: 2.0 },
      { x: 4.35, yc: 0.02, w: 0.55, top: 0.55, bot: 0.55, n: 2.0 },
      { x: 3.9, yc: 0.02, w: 0.72, top: 0.72, bot: 0.70, n: 2.1 },
      { x: 3.2, yc: 0.03, w: 0.75, top: 0.74, bot: 0.70, n: 2.2 },
      { x: 2.6, yc: 0.04, w: 0.76, top: 0.80, bot: 0.70, n: 2.3 },
      { x: 2.15, yc: 0.05, w: 0.78, top: 1.02, bot: 0.70, n: 2.4 },
      { x: 1.75, yc: 0.05, w: 0.80, top: 1.12, bot: 0.70, n: 2.5 },
      { x: 0.9, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 2.5 },
      { x: 0.0, yc: 0.05, w: 0.80, top: 1.12, bot: 0.68, n: 2.5 },
      { x: -0.9, yc: 0.05, w: 0.74, top: 1.06, bot: 0.62, n: 2.4 },
      { x: -1.6, yc: 0.06, w: 0.62, top: 0.92, bot: 0.52, n: 2.3 },
      { x: -2.6, yc: 0.10, w: 0.44, top: 0.62, bot: 0.34, n: 2.2 },
      { x: -3.7, yc: 0.16, w: 0.28, top: 0.42, bot: 0.20, n: 2.1 },
      { x: -4.7, yc: 0.24, w: 0.15, top: 0.30, bot: 0.10, n: 2.0 },
      { x: -5.35, yc: 0.30, w: 0.06, top: 0.22, bot: 0.04, n: 2.0 },
    ];
    const fusGeo = loft(sections, 36);
    // split the cabin surface into body and window glass
    const { body: bodyGeo, glass: glassGeo } = splitGlass(fusGeo, (x, y, z) => {
      const sill = 0.36, roof = 1.0;
      if (x > 1.72 && x < 2.6 && y > 0.68) return true; // windshield (wraparound)
      if (x > -1.45 && x <= 1.72 && y > sill && y < roof && Math.abs(z) > 0.42) {
        // pillars between panes
        for (const px of [1.72, 0.85, -0.45]) if (Math.abs(x - px) < 0.05) return false;
        return true;
      }
      return false;
    });
    add(bodyGeo, paint);
    const glassMesh = add(glassGeo, glass);
    glassMesh.renderOrder = 20;
    glassMesh.castShadow = false;
    // cabin interior: an explicit room (walls below the window sill, ceiling, bulkheads, floor) so the view
    // from the pilot seat is bounded by lit interior surfaces instead of the exterior shell
    const floor = add(new THREE.BoxGeometry(3.6, 0.06, 1.5), carpet, this.root, false);
    floor.position.set(0.35, -0.55, 0);
    const wallMat = interior;
    for (const side of [-1, 1]) {
      const wall = add(new THREE.BoxGeometry(3.5, 1.0, 0.05), wallMat, this.root, false);
      wall.position.set(0.3, -0.12, side * 0.77);
      // upper cabin wall between the window band and the ceiling
      const upper = add(new THREE.BoxGeometry(3.3, 0.1, 0.05), wallMat, this.root, false);
      upper.position.set(0.15, 1.02, side * 0.72);
    }
    const ceiling = add(new THREE.BoxGeometry(3.3, 0.05, 1.5), wallMat, this.root, false);
    ceiling.position.set(0.15, 1.08, 0);
    const firewall = add(new THREE.BoxGeometry(0.06, 1.3, 1.6), wallMat, this.root, false);
    firewall.position.set(2.12, 0.03, 0);
    const rearWall = add(new THREE.BoxGeometry(0.06, 1.55, 1.5), wallMat, this.root, false);
    rearWall.position.set(-1.5, 0.28, 0);
    // engine cowl behind the windshield seen from inside: a dark deck so the view over the nose reads correctly
    const cowlDeck = add(new THREE.BoxGeometry(0.5, 0.05, 1.5), interiorPlastic, this.root, false);
    cowlDeck.position.set(2.4, 0.66, 0);
    // window posts
    for (const px of [1.72, 0.85, -0.45, -1.45]) {
      for (const side of [-1, 1]) {
        const post = add(new THREE.BoxGeometry(0.06, 0.66, 0.05), interiorPlastic);
        post.position.set(px, 0.7, side * 0.74);
      }
    }
    // windshield centre post and frame
    const centrePost = add(new THREE.BoxGeometry(0.94, 0.035, 0.035), interiorPlastic);
    centrePost.position.set(2.17, 0.92, 0); centrePost.rotation.z = -0.44;
    // door handles / steps / fuel filler
    for (const side of [-1, 1]) {
      const step = add(new THREE.BoxGeometry(0.35, 0.04, 0.25), darkMetal);
      step.position.set(1.2, -0.85, side * 0.85);
    }
    // ------------------------------------------------------------ engine & propeller
    // exhaust stubs (two short pipes lower right)
    for (let i = 0; i < 2; i++) {
      const pipe = add(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 10), exhaust);
      pipe.position.set(2.75 - i * 0.22, -0.45, 0.42 + i * 0.05);
      pipe.rotation.set(0.6, 0, 1.2);
    }
    // intake scoop on the cowl top and cowl flaps
    const scoop = add(new THREE.BoxGeometry(0.5, 0.12, 0.28), plainPaint);
    scoop.position.set(3.7, 0.72, 0);
    for (let i = 0; i < 2; i++) {
      const flap = add(new THREE.BoxGeometry(0.28, 0.04, 0.22), plainPaint);
      flap.position.set(3.0, -0.62, (i === 0 ? -1 : 1) * 0.35);
      flap.rotation.x = (i === 0 ? -1 : 1) * 0.35;
    }
    // propeller: spinner + 3 blades + blur disc
    this.propeller.position.set(4.62, 0.02, 0);
    this.root.add(this.propeller);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 20), metal);
    spinner.rotation.z = -Math.PI / 2; spinner.position.x = 0.27;
    spinner.castShadow = true; this.propeller.add(spinner); this.exteriorMeshes.push(spinner);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 20), darkMetal);
    hub.rotation.z = Math.PI / 2; hub.position.x = -0.02; this.propeller.add(hub); this.exteriorMeshes.push(hub);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(bladeGeometry(1.32, 0.19, 0.11), propMat);
      blade.castShadow = true;
      const pivot = new THREE.Group();
      pivot.rotation.x = (i / 3) * Math.PI * 2;
      blade.position.y = 0.16;
      pivot.add(blade);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.12), propTipMat);
      tip.position.set(0, 1.4, 0.0);
      pivot.add(tip);
      this.propeller.add(pivot);
      this.exteriorMeshes.push(blade);
    }
    const discMat = new THREE.MeshStandardMaterial({ map: propDiscTexture(), transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6, color: 0x888888 });
    this.materials.push(discMat);
    this.propDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), discMat);
    this.propDisc.rotation.y = Math.PI / 2;
    this.propDisc.position.x = 0.05;
    this.propDisc.renderOrder = 15;
    this.propeller.add(this.propDisc);

    // ------------------------------------------------------------ wing
    const wingSpec = { span: 7.3, rootChord: 1.95, tipChord: 1.35, sweep: -0.05, dihedral: 0.02, thickness: 0.15, twist: -0.03 };
    const wingR = add(wingGeometry(wingSpec, 9), wingPaint);
    wingR.position.set(0.55, 1.22, 0.0);
    const wingL = add(wingGeometry(wingSpec, 9), wingPaint);
    wingL.position.set(0.55, 1.22, 0.0);
    wingL.scale.z = -1;
    // wing centre section fairing over the cabin
    const fairing = add(new THREE.BoxGeometry(2.0, 0.22, 1.7), plainPaint);
    fairing.position.set(0.55, 1.2, 0);
    // control surfaces: flaps (inboard) and ailerons (outboard) hinged at the trailing edge
    const mkSurface = (spanZ: number, chordRoot: number, chordTip: number, zStart: number, side: number, mat: THREE.Material): THREE.Group => {
      const g = new THREE.Group();
      const plate = new THREE.Mesh(plateGeometry(spanZ, chordRoot, chordTip, 0.11), mat);
      plate.castShadow = true;
      g.add(plate);
      this.exteriorMeshes.push(plate);
      g.position.set(0.55 - 0.7 * 1.9 + 0.02, 1.22 + 0.02, side * zStart);
      g.scale.z = side;
      this.root.add(g);
      return g;
    };
    this.flapR = mkSurface(2.6, 0.55, 0.5, 0.9, 1, wingPaint);
    this.flapL = mkSurface(2.6, 0.55, 0.5, 0.9, -1, wingPaint);
    this.aileronR = mkSurface(3.2, 0.48, 0.38, 3.6, 1, wingPaint);
    this.aileronL = mkSurface(3.2, 0.48, 0.38, 3.6, -1, wingPaint);
    // wingtip nav lights & tips
    this.navRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1a1a, emissiveIntensity: 3 }));
    this.navRed.position.copy(this.wingTipL); this.root.add(this.navRed);
    this.navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x1aff44, emissiveIntensity: 3 }));
    this.navGreen.position.copy(this.wingTipR); this.root.add(this.navGreen);
    this.materials.push(this.navRed.material as THREE.Material, this.navGreen.material as THREE.Material);
    // pitot tube
    const pitot = add(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), metal);
    pitot.rotation.z = Math.PI / 2; pitot.position.set(1.5, 1.05, -3.2);

    // ------------------------------------------------------------ tail
    const hstabSpec = { span: 2.55, rootChord: 1.05, tipChord: 0.7, sweep: -0.12, dihedral: 0, thickness: 0.09, twist: 0 };
    for (const side of [-1, 1]) {
      const hs = add(wingGeometry(hstabSpec, 5), wingPaint);
      hs.position.set(-4.25, 0.42, 0); hs.scale.z = side;
    }
    this.elevator = new THREE.Group();
    this.elevator.position.set(-4.25 - 0.7 * 1.0, 0.44, 0);
    this.root.add(this.elevator);
    for (const side of [-1, 1]) {
      const el = new THREE.Mesh(plateGeometry(2.5, 0.42, 0.3, 0.09), wingPaint);
      el.scale.z = side; el.castShadow = true;
      this.elevator.add(el); this.exteriorMeshes.push(el);
    }
    // vertical fin: a wing profile rotated upright
    const finSpec = { span: 1.55, rootChord: 1.5, tipChord: 0.75, sweep: -0.55, dihedral: 0, thickness: 0.09, twist: 0 };
    const fin = add(wingGeometry(finSpec, 5), wingPaint);
    fin.position.set(-4.35, 0.45, 0);
    fin.rotation.x = -Math.PI / 2;
    const dorsal = add(new THREE.BoxGeometry(1.4, 0.32, 0.08), wingPaint);
    dorsal.position.set(-3.4, 0.55, 0); dorsal.rotation.z = -0.25;
    this.rudder = new THREE.Group();
    this.rudder.position.set(-4.35 - 0.7 * 1.5 + 0.05, 0.45, 0);
    this.root.add(this.rudder);
    const rud = new THREE.Mesh(plateGeometry(1.5, 0.6, 0.4, 0.1), wingPaint);
    rud.rotation.x = -Math.PI / 2; rud.castShadow = true;
    this.rudder.add(rud); this.exteriorMeshes.push(rud);
    this.strobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 }));
    this.strobe.position.set(-5.0, 2.0, 0); this.root.add(this.strobe);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2200, emissiveIntensity: 0 }));
    this.beacon.position.set(-1.0, 1.36, 0); this.root.add(this.beacon);
    this.materials.push(this.strobe.material as THREE.Material, this.beacon.material as THREE.Material);
    // fixed leading-edge / dorsal antenna
    const antenna = add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), metal);
    antenna.position.set(-2.0, 0.9, 0); antenna.rotation.z = 0.5;

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
    for (const side of [-1, 1]) {
      const f = add(floatGeo.clone(), floatPaint);
      f.position.z = side * 1.25;
      // rubber bumper at the bow
      const bumper = add(new THREE.SphereGeometry(0.09, 10, 8), rubber);
      bumper.position.set(2.98, -1.85, side * 1.25);
      // spreader bars between floats
      // struts: front pair & rear pair from float deck to fuselage belly, plus diagonal braces
      const deckY = -1.76;
      const belly = -0.62;
      this.root.add(fairedStrut(new THREE.Vector3(1.6, deckY, side * 1.25), new THREE.Vector3(1.4, belly, side * 0.55), 0.14, 0.05, metal));
      this.root.add(fairedStrut(new THREE.Vector3(-0.9, deckY, side * 1.25), new THREE.Vector3(-0.7, belly, side * 0.5), 0.14, 0.05, metal));
      this.root.add(strut(new THREE.Vector3(1.6, deckY, side * 1.25), new THREE.Vector3(-0.7, belly, side * 0.5), 0.025, metal));
      this.root.add(strut(new THREE.Vector3(-0.9, deckY, side * 1.25), new THREE.Vector3(1.4, belly, side * 0.55), 0.025, metal));
      // wing struts (V) from float deck to wing underside
      this.root.add(fairedStrut(new THREE.Vector3(1.3, deckY + 0.1, side * 1.3), new THREE.Vector3(1.05, 1.1, side * 2.9), 0.12, 0.045, metal));
      this.root.add(fairedStrut(new THREE.Vector3(-0.2, deckY + 0.1, side * 1.3), new THREE.Vector3(-0.05, 1.1, side * 2.9), 0.12, 0.045, metal));
      this.root.add(strut(new THREE.Vector3(1.05, 1.08, side * 2.9), new THREE.Vector3(-0.05, 1.08, side * 2.9), 0.03, metal));
      // water rudder at the stern
      const wr = new THREE.Group();
      wr.position.set(-2.7, -1.85, side * 1.25);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.03), darkMetal);
      blade.position.y = -0.18; wr.add(blade); this.exteriorMeshes.push(blade);
      this.root.add(wr);
      this.waterRudders.push(wr);
      // cleats & hand rails on the deck
      for (const cx of [2.0, 0.4, -1.4]) { const cleat = add(new THREE.BoxGeometry(0.14, 0.05, 0.05), metal); cleat.position.set(cx, deckY + 0.03, side * 1.25 + 0.2 * side); }
    }
    this.root.add(fairedStrut(new THREE.Vector3(1.6, -1.72, -1.25), new THREE.Vector3(1.6, -1.72, 1.25), 0.1, 0.06, metal));
    this.root.add(fairedStrut(new THREE.Vector3(-0.9, -1.72, -1.25), new THREE.Vector3(-0.9, -1.72, 1.25), 0.1, 0.06, metal));

    // amphibious wheels (retract into the floats): main wheels aft of the step, nose wheels at the bows
    this.wheels = new THREE.Group();
    this.root.add(this.wheels);
    const tyre = new THREE.TorusGeometry(0.2, 0.09, 8, 16);
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12);
    for (const side of [-1, 1]) {
      for (const [x, r] of [[-0.9, 1.0], [2.3, 0.7]] as [number, number][]) {
        const w = new THREE.Mesh(tyre, rubber); w.scale.setScalar(r); w.position.set(x, -2.28, side * 1.25); w.castShadow = true; this.wheels.add(w);
        const h = new THREE.Mesh(hubGeo, metal); h.scale.setScalar(r); h.rotation.x = Math.PI / 2; h.position.copy(w.position); this.wheels.add(h);
      }
    }

    // ------------------------------------------------------------ cockpit interior
    const panel = add(new THREE.BoxGeometry(0.16, 0.42, 1.36), interiorPlastic, this.root, false);
    panel.position.set(2.0, 0.55, 0);
    const face = add(new THREE.PlaneGeometry(1.34, 0.4), panelMat, this.root, false);
    face.position.set(1.915, 0.56, 0); face.rotation.y = -Math.PI / 2;
    const glareShield = add(new THREE.BoxGeometry(0.5, 0.04, 1.4), interiorPlastic, this.root, false);
    glareShield.position.set(2.15, 0.78, 0);
    const pedestal = add(new THREE.BoxGeometry(0.7, 0.32, 0.22), interiorPlastic, this.root, false);
    pedestal.position.set(1.7, -0.36, 0);
    this.throttleLever = add(new THREE.BoxGeometry(0.04, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }), this.root, false);
    this.throttleLever.position.set(1.75, -0.1, -0.04);
    const mixture = add(new THREE.BoxGeometry(0.04, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 }), this.root, false);
    mixture.position.set(1.72, -0.1, 0.04);
    const mkYoke = (z: number): THREE.Group => {
      const g = new THREE.Group();
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), darkMetal);
      column.rotation.z = Math.PI / 2; column.position.x = 0.25; g.add(column);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 24, Math.PI * 1.3), interiorPlastic);
      wheel.rotation.set(Math.PI * 0.85, Math.PI / 2, 0); g.add(wheel);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26), interiorPlastic); g.add(bar);
      g.position.set(1.55, 0.25, z);
      this.root.add(g);
      this.interiorMeshes.push(g);
      return g;
    };
    this.yokeL = mkYoke(-0.35);
    this.yokeR = mkYoke(0.35);
    const seatGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5), backGeo = new THREE.BoxGeometry(0.1, 0.55, 0.5);
    for (const [x, z] of [[1.0, -0.36], [1.0, 0.36], [-0.2, -0.36], [-0.2, 0.36], [-1.0, 0]]) {
      const cushion = add(seatGeo, seatLeather, this.root, false); cushion.position.set(x, -0.2, z);
      const back = add(backGeo, seatLeather, this.root, false); back.position.set(x - 0.25, 0.12, z); back.rotation.z = 0.15;
      const frame = add(new THREE.BoxGeometry(0.4, 0.3, 0.4), darkMetal, this.root, false); frame.position.set(x, -0.42, z);
    }
    // pilot: torso, head with headset, arms toward the yoke
    const shirt = new THREE.MeshStandardMaterial({ color: 0x2f4f6f, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc8956c, roughness: 0.7 });
    const headset = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.5 });
    this.materials.push(shirt, skin, headset);
    const torso = add(new THREE.BoxGeometry(0.28, 0.5, 0.42), shirt, this.root, false); torso.position.set(0.95, 0.12, -0.36);
    const head = add(new THREE.SphereGeometry(0.11, 12, 10), skin, this.root, false); head.position.set(0.98, 0.5, -0.36);
    const band = add(new THREE.TorusGeometry(0.115, 0.018, 6, 16, Math.PI), headset, this.root, false); band.position.set(0.98, 0.53, -0.36); band.rotation.set(0, Math.PI / 2, 0);
    for (const side of [-1, 1]) { const cup = add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), headset, this.root, false); cup.position.set(0.98, 0.5, -0.36 + side * 0.12); cup.rotation.x = Math.PI / 2; }
    for (const side of [-1, 1]) { const arm = add(new THREE.CylinderGeometry(0.04, 0.045, 0.5, 8), shirt, this.root, false); arm.position.set(1.25, 0.2, -0.36 + side * 0.16); arm.rotation.z = Math.PI / 2 - 0.35; }
    for (const z of [-0.5, -0.2, 0.2, 0.5]) { const pedal = add(new THREE.BoxGeometry(0.12, 0.18, 0.08), darkMetal, this.root, false); pedal.position.set(1.9, -0.36, z); pedal.rotation.z = 0.5; }
    // overhead switch panel & compass
    const overhead = add(new THREE.BoxGeometry(0.6, 0.05, 0.4), interiorPlastic, this.root, false);
    overhead.position.set(1.3, 1.1, 0);
    const compass = add(new THREE.BoxGeometry(0.08, 0.07, 0.09), interiorPlastic, this.root, false);
    compass.position.set(2.05, 0.82, 0);

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

/** Split an indexed loft into two geometries using a predicate on the triangle centroid. */
function splitGlass(geo: THREE.BufferGeometry, isGlass: (x: number, y: number, z: number) => boolean): { body: THREE.BufferGeometry; glass: THREE.BufferGeometry } {
  const pos = geo.getAttribute('position'), nrm = geo.getAttribute('normal'), uv = geo.getAttribute('uv');
  const index = geo.getIndex()!;
  const bodyIdx: number[] = [], glassIdx: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    (isGlass(cx, cy, cz) ? glassIdx : bodyIdx).push(a, b, c);
  }
  const mk = (idx: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', pos.clone());
    g.setAttribute('normal', nrm.clone());
    g.setAttribute('uv', uv.clone());
    g.setIndex(idx);
    return g;
  };
  return { body: mk(bodyIdx), glass: mk(glassIdx) };
}
