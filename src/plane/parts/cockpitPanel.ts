import * as THREE from 'three';
import { glareShieldGeometry, halfWidthAt, quadGeometry, sectionAt, strutGeometry } from '../geometry';
import { GAUGES, GPS_SCREEN, INSTRUMENT_ATLAS, OVERHEAD, PANEL, PANEL_UV, SURF, type GaugeDef, type UvRect } from '../textures';
import { at, CABIN_FRONT, CH, DEG, PANEL_TILT, PANEL_X, UP, type BuildContext } from './context';

/**
 * Builds the geometry of the live instrument parts (needles, cards, symbols) in panel space: x to starboard, y up,
 * z toward the pilot, origin at the face centre. Every vertex carries the gauge centre it rotates about (`aPivot`)
 * and its channel (`aChan`); the vertex shader applies the channel's rotation and shift, so all the moving parts
 * of every instrument are one static mesh and one draw call.
 */
class InstrumentKit {
  private readonly pos: number[] = [];
  private readonly nrm: number[] = [];
  private readonly uv: number[] = [];
  private readonly pivot: number[] = [];
  private readonly chan: number[] = [];
  private readonly clip: number[] = [];
  private readonly idx: number[] = [];

  /** `clipR` > 0: the fragment shader discards the part outside that radius about the pivot (dial aperture) */
  private vertex(px: number, py: number, x: number, y: number, z: number, u: number, v: number, ch: number, clipR = 0): number {
    this.pos.push(x, y, z); this.nrm.push(0, 0, 1); this.uv.push(u, v); this.pivot.push(px, py, 0); this.chan.push(ch); this.clip.push(clipR);
    return this.pos.length / 3 - 1;
  }

  /** radial tick mark at `deg` clockwise from 12 o'clock, from radius r0 to r1 (fractions of the aperture) */
  tick(g: GaugeDef, deg: number, r0: number, r1: number, w: number, z: number, ch: number, patch: string): void {
    const a = (90 - deg) * DEG, c = Math.cos(a), s = Math.sin(a), R0 = g.r * r0, R1 = g.r * r1;
    // rectangle along the radial direction, half-width w across it
    const nx = -s * w / 2, ny = c * w / 2;
    this.poly(g, [[c * R0 - nx, s * R0 - ny], [c * R0 + nx, s * R0 + ny], [c * R1 + nx, s * R1 + ny], [c * R1 - nx, s * R1 - ny]], z, ch, patch);
  }

  private patchUv(key: string): [number, number] {
    const [px, py] = INSTRUMENT_ATLAS.patches[key];
    return [px / INSTRUMENT_ATLAS.size, 1 - py / INSTRUMENT_ATLAS.size];
  }

  /** convex polygon (local coordinates relative to the pivot) in a flat colour */
  poly(g: GaugeDef, pts: [number, number][], z: number, ch: number, patch: string): void {
    const [u, v] = this.patchUv(patch);
    const base = this.pos.length / 3;
    for (const [x, y] of pts) this.vertex(g.x, g.y, x, y, z, u, v, ch);
    for (let i = 1; i < pts.length - 1; i++) this.idx.push(base, base + i, base + i + 1);
  }

  /** needle pointing at 12 o'clock: `len` from the pivot, a short tail, tapered */
  needle(g: GaugeDef, len: number, w: number, z: number, ch: number, patch = 'white', tail = 0.18): void {
    const L = g.r * len, T = g.r * tail;
    this.poly(g, [[-w / 2, -T], [w / 2, -T], [w * 0.22, L], [-w * 0.22, L]], z, ch, patch);
  }

  /** hub cap over the needle */
  cap(g: GaugeDef, r: number, z: number, ch: number, patch = 'black'): void {
    this.disc(g, r, z, ch, patch, 14);
  }

  disc(g: GaugeDef, r: number, z: number, ch: number, patch: string, segs = 40, region?: { x: number; y: number; s: number }, clipR = 0): void {
    const S = INSTRUMENT_ATLAS.size;
    const [pu, pv] = this.patchUv(patch);
    const base = this.pos.length / 3;
    const uvOf = (lx: number, ly: number): [number, number] => {
      if (!region) return [pu, pv];
      return [(region.x + region.s / 2 + (lx / r) * (region.s / 2)) / S, 1 - (region.y + region.s / 2 - (ly / r) * (region.s / 2)) / S];
    };
    const [cu, cv] = uvOf(0, 0);
    this.vertex(g.x, g.y, 0, 0, z, cu, cv, ch, clipR);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2, lx = Math.cos(a) * r, ly = Math.sin(a) * r;
      const [u, v] = uvOf(lx, ly);
      this.vertex(g.x, g.y, lx, ly, z, u, v, ch, clipR);
    }
    for (let i = 0; i < segs; i++) this.idx.push(base, base + 1 + i, base + 2 + i);
  }

  ring(g: GaugeDef, r0: number, r1: number, z: number, ch: number, patch: string, segs = 40): void {
    const [u, v] = this.patchUv(patch);
    const base = this.pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      this.vertex(g.x, g.y, c * r0, s * r0, z, u, v, ch);
      this.vertex(g.x, g.y, c * r1, s * r1, z, u, v, ch);
    }
    for (let i = 0; i < segs; i++) { const a = base + i * 2; this.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }

  /** axis-aligned bar (local centre, size) */
  bar(g: GaugeDef, cx: number, cy: number, w: number, h: number, z: number, ch: number, patch: string): void {
    this.poly(g, [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]], z, ch, patch);
  }

  build(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('aPivot', new THREE.Float32BufferAttribute(this.pivot, 3));
    geo.setAttribute('aChan', new THREE.Float32BufferAttribute(this.chan, 1));
    geo.setAttribute('aClip', new THREE.Float32BufferAttribute(this.clip, 1));
    geo.setIndex(this.idx);
    return geo;
  }
}

export interface CockpitPanelBuild {
  /** live instrument parts (needles, cards) */
  instruments: THREE.Mesh;
  /** the moving-map screen */
  gpsMesh: THREE.Mesh;
  /** panel space (x to starboard, y up the face, z toward the pilot, origin at the face centre) to body space */
  inPanel: (px: number, py: number, pz: number) => THREE.Vector3;
}

/**
 * Instrument panel box and face, glare shield, nameplate, compass, dome light, sun visors, overhead console, grab
 * handles (into `cabinKit` / `textured`) and the live instruments + GPS screen meshes.
 */
export function buildCockpitPanel(ctx: BuildContext): CockpitPanelBuild {
  const { mesh, decal, cabinKit, textured } = ctx;
  const { instMat, gpsMat } = ctx.mat;
  const { innerSections, innerHalfAt } = ctx.fuselage;
  // ------------------------------------------------------------ cockpit: instrument panel
  const innerHalf = (x: number, y: number) => halfWidthAt(sectionAt(innerSections, x), y);
  const panelHalf = innerHalf(2.1, 0.74) - 0.03;
  // the panel hangs from the glare shield's rear edge with its bottom pushed forward (PANEL_TILT), which keeps the
  // lower gauge row inside the frame from the seat; the face sits 5 mm ahead of the box front.
  const PANEL_H = PANEL.H, PANEL_W = Math.min(PANEL.W, panelHalf * 2 - 0.02);
  const down = new THREE.Vector3(Math.sin(PANEL_TILT), -Math.cos(PANEL_TILT), 0), fwd = new THREE.Vector3(Math.cos(PANEL_TILT), Math.sin(PANEL_TILT), 0);
  const panelTop = new THREE.Vector3(PANEL_X, 0.735, 0);
  const faceCentre = panelTop.clone().addScaledVector(down, PANEL_H / 2);
  // panel space: x to starboard, y up the face, z toward the pilot
  const panelFrame = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), down.clone().negate(), fwd.clone().negate()).setPosition(faceCentre);
  const inPanel = (px: number, py: number, pz: number): THREE.Vector3 => new THREE.Vector3(px, py, pz).applyMatrix4(panelFrame);
  cabinKit.add(new THREE.BoxGeometry(0.16, PANEL_H + 0.02, panelHalf * 2), at(faceCentre.clone().addScaledVector(fwd, 0.085), [0, 0, PANEL_TILT]), SURF.plastic);
  // crop the atlas symmetrically when the cabin is narrower than the painted face: the pixel scale must stay exact
  // so the live needles land on the painted dials
  const faceUv: UvRect = { ...PANEL_UV.face };
  const cropU = (1 - PANEL_W / PANEL.W) * 0.5 * (faceUv.u1 - faceUv.u0);
  faceUv.u0 += cropU; faceUv.u1 -= cropU;
  const faceGeo = quadGeometry(PANEL_W, PANEL_H, faceUv); faceGeo.applyMatrix4(panelFrame); textured.push(faceGeo);
  textured.push(glareShieldGeometry(innerSections, 0.745, PANEL_X - 0.02, CABIN_FRONT - 0.005, 0.005, 0.02, PANEL_UV.grain));
  // yoke placards on the hubs are part of the yokes (they move); the nameplate sits on the glare shield lip
  decal(PANEL_UV.nameplate, 0.16, 0.035, new THREE.Vector3(PANEL_X - 0.041, 0.725, 0.34), new THREE.Vector3(-1, 0, 0), UP);
  // magnetic compass on the glare shield ahead of the centre post: housing, bracket and the card window
  cabinKit.add(new THREE.BoxGeometry(0.075, 0.055, 0.07), at([PANEL_X + 0.09, 0.80, 0]), SURF.plastic);
  cabinKit.add(new THREE.BoxGeometry(0.02, 0.035, 0.024), at([PANEL_X + 0.09, 0.762, 0]), SURF.darkMetal);
  decal(PANEL_UV.compass, 0.05, 0.024, new THREE.Vector3(PANEL_X + 0.052, 0.80, 0), new THREE.Vector3(-1, 0, 0), UP);
  // dome light in the headliner over the front seats
  cabinKit.add(new THREE.BoxGeometry(0.12, 0.024, 0.10), at([0.30, 1.117, 0]), SURF.lightPlastic);
  decal(PANEL_UV.domeLens, 0.075, 0.06, new THREE.Vector3(0.30, 1.1045, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
  // sun visors: vinyl-covered boards hinged on a rod across the headliner behind the header, stowed forward
  // along the roof (the pilot's drooping a few degrees from its clip)
  for (const s of [-1, 1]) {
    const hinge = new THREE.Vector3(1.58, 1.072, s * 0.42), swing = s < 0 ? 0.08 : 0.02;
    cabinKit.add(new THREE.CylinderGeometry(0.006, 0.006, 0.20, 8), at(hinge, [Math.PI / 2, 0, 0]), SURF.visorArm);
    for (const e of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.03, 0.02, 0.016), at([hinge.x, hinge.y + 0.008, hinge.z + e * 0.095]), SURF.darkMetal);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -swing));
    const centre = new THREE.Vector3(0.15, -0.008, 0).applyQuaternion(q).add(hinge);
    const bm = new THREE.Matrix4().compose(centre, q, new THREE.Vector3(1, 1, 1));
    cabinKit.add(new THREE.BoxGeometry(0.28, 0.006, 0.15), bm, SURF.bow);
    const face = new THREE.Vector3(0, -0.0035, 0).applyMatrix4(bm);
    decal(PANEL_UV.visor, 0.28, 0.15, face, new THREE.Vector3(0, -1, 0).applyQuaternion(q), new THREE.Vector3(0, 0, -s));
  }
  // overhead console on the centreline just behind the header (Beaver style: fuel selector, cabin switches, trim
  // indicator with its crank wheel on the port flank, the flap hand pump lever on the starboard flank)
  const OC_X = 1.60, OC_LEN = 0.38, OC_Y = 1.074;
  cabinKit.add(new THREE.BoxGeometry(OC_LEN, 0.024, 0.17), at([OC_X, OC_Y, 0]), SURF.plastic);
  cabinKit.add(new THREE.BoxGeometry(OC_LEN + 0.02, 0.012, 0.19), at([OC_X, OC_Y + 0.010, 0]), SURF.trim);
  decal(PANEL_UV.overhead, OVERHEAD.w, OVERHEAD.h, new THREE.Vector3(OC_X, OC_Y - 0.0125, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0));
  cabinKit.add(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 20), at([OC_X - 0.06, OC_Y - 0.004, -0.092], [Math.PI / 2, 0, 0]), SURF.rubber);
  cabinKit.add(new THREE.CylinderGeometry(0.010, 0.010, 0.02, 10), at([OC_X - 0.06, OC_Y - 0.004, -0.102], [Math.PI / 2, 0, 0]), SURF.metal);
  // flap pump handle stowed forward along the ceiling from its pivot on the starboard flank
  { const pivot = new THREE.Vector3(OC_X - 0.08, OC_Y - 0.016, 0.095), dir = new THREE.Vector3(0.97, -0.24, 0.05).normalize();
    cabinKit.add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), at(pivot, [0, 0, 0]), SURF.darkMetal);
    cabinKit.add(strutGeometry(pivot, pivot.clone().addScaledVector(dir, 0.15), 0.008, 8), undefined, SURF.metal);
    cabinKit.add(new THREE.SphereGeometry(0.016, 10, 8), at(pivot.clone().addScaledVector(dir, 0.16)), SURF.throttle); }
  // grab handles on the B-pillars behind the doors
  for (const s of [-1, 1]) {
    const z = s * (innerHalfAt(0.90, 0.85) - 0.025);
    cabinKit.add(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 8), at([0.90, 0.85, z]), SURF.plastic);
    for (const e of [-1, 1]) cabinKit.add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), at([0.90, 0.85 + e * 0.07, z + s * 0.012], [Math.PI / 2, 0, 0]), SURF.plastic);
  }
  // live instrument parts on the face (all one mesh, animated in the vertex shader)
  const kit = new InstrumentKit();
  const G = GAUGES;
  const Z1 = 0.0015, Z2 = 0.0025, Z3 = 0.0035, Z4 = 0.0045;
  kit.needle(G.asi, 0.86, 0.004, Z3, CH.asi); kit.cap(G.asi, 0.005, Z4, CH.asi);
  // attitude: ball (1.3 apertures wide, so it stays behind the bezel when shifted for pitch), bezel mask ring,
  // fixed orange aircraft symbol
  kit.disc(G.adi, G.adi.r * INSTRUMENT_ATLAS.ballRadius, Z1, CH.adi, 'white', 48, INSTRUMENT_ATLAS.ball, G.adi.r * 0.995);
  // fixed bank scale at the rim (10/20/30/60 deg) and the sky pointer that rolls with the ball (no pitch shift)
  for (const d of [-60, -30, -20, -10, 10, 20, 30, 60]) kit.tick(G.adi, d, Math.abs(d) % 30 ? 0.9 : 0.84, 0.98, 0.0022, Z2, CH.fixed, 'white');
  kit.poly(G.adi, [[-0.055 * G.adi.r, 0.98 * G.adi.r], [0.055 * G.adi.r, 0.98 * G.adi.r], [0, 0.82 * G.adi.r]], Z2, CH.fixed, 'white');
  kit.poly(G.adi, [[-0.05 * G.adi.r, 0.66 * G.adi.r], [0.05 * G.adi.r, 0.66 * G.adi.r], [0, 0.80 * G.adi.r]], Z2, CH.adiBank, 'orange');
  kit.bar(G.adi, -0.40 * G.adi.r, 0, 0.42 * G.adi.r, 0.004, Z3, CH.fixed, 'orange'); kit.bar(G.adi, 0.40 * G.adi.r, 0, 0.42 * G.adi.r, 0.004, Z3, CH.fixed, 'orange');
  kit.bar(G.adi, -0.19 * G.adi.r, -0.05 * G.adi.r, 0.004, 0.10 * G.adi.r, Z3, CH.fixed, 'orange'); kit.bar(G.adi, 0.19 * G.adi.r, -0.05 * G.adi.r, 0.004, 0.10 * G.adi.r, Z3, CH.fixed, 'orange');
  kit.disc(G.adi, 0.003, Z3, CH.fixed, 'orange', 10);
  // altimeter: long hundreds hand, short thousands hand
  kit.needle(G.alt, 0.62, 0.007, Z3, CH.alt1000, 'white', 0.12);
  kit.needle(G.alt, 0.86, 0.0035, Z3, CH.alt100); kit.cap(G.alt, 0.005, Z4, CH.alt100);
  // turn coordinator: miniature aircraft banks with the turn rate, ball slides in its tube
  kit.bar(G.tc, 0, 0, 1.3 * G.tc.r, 0.005, Z3, CH.tc, 'white'); kit.bar(G.tc, 0, 0.11 * G.tc.r, 0.006, 0.26 * G.tc.r, Z3, CH.tc, 'white');
  kit.bar(G.tc, 0, -0.02 * G.tc.r, 0.24 * G.tc.r, 0.008, Z4, CH.tc, 'white');
  kit.disc({ x: G.tc.x, y: G.tc.y - 0.53 * G.tc.r, r: G.tc.r }, 0.0032, Z3, CH.tcBall, 'black', 14);
  // heading: rotating compass card, fixed aircraft symbol and lubber line on top
  kit.disc(G.hdg, G.hdg.r * 0.92, Z1, CH.hdg, 'white', 48, INSTRUMENT_ATLAS.card);
  kit.bar(G.hdg, 0, 0.05 * G.hdg.r, 0.004, 0.5 * G.hdg.r, Z3, CH.fixed, 'white'); kit.bar(G.hdg, 0, 0.05 * G.hdg.r, 0.46 * G.hdg.r, 0.004, Z3, CH.fixed, 'white'); kit.bar(G.hdg, 0, -0.15 * G.hdg.r, 0.18 * G.hdg.r, 0.004, Z3, CH.fixed, 'white');
  kit.poly(G.hdg, [[-0.04 * G.hdg.r, 0.99 * G.hdg.r], [0.04 * G.hdg.r, 0.99 * G.hdg.r], [0, 0.82 * G.hdg.r]], Z3, CH.fixed, 'orange');
  kit.needle(G.vsi, 0.84, 0.004, Z3, CH.vsi); kit.cap(G.vsi, 0.005, Z4, CH.vsi);
  kit.needle(G.rpm, 0.84, 0.0035, Z3, CH.rpm); kit.cap(G.rpm, 0.004, Z4, CH.rpm);
  kit.needle(G.map, 0.84, 0.0035, Z3, CH.map); kit.cap(G.map, 0.004, Z4, CH.map);
  for (const [g, ch] of [[G.oilp, CH.oilp], [G.oilt, CH.oilt], [G.fuell, CH.fuell], [G.fuelr, CH.fuelr], [G.egt, CH.egt]] as [GaugeDef, number][]) { kit.needle(g, 0.8, 0.0028, Z3, ch); kit.cap(g, 0.003, Z4, ch); }
  for (const g of [G.amp, G.cht]) { kit.needle(g, 0.8, 0.0028, Z3, CH.fixed); kit.cap(g, 0.003, Z4, CH.fixed); }
  // the kit geometry stays in panel space (the shader rotates about `aPivot` there); the mesh transform is the frame
  const instruments = mesh(kit.build(), instMat, { exterior: false, cast: false });
  panelFrame.decompose(instruments.position, instruments.quaternion, instruments.scale);
  const gpsGeo = quadGeometry(GPS_SCREEN.w, GPS_SCREEN.h, { u0: 0, v0: 0, u1: 1, v1: 1 });
  gpsGeo.translate(GPS_SCREEN.x, GPS_SCREEN.y, 0.0008);
  gpsGeo.applyMatrix4(panelFrame);
  const gpsMesh = mesh(gpsGeo, gpsMat, { exterior: false, cast: false });
  return { instruments, gpsMesh, inPanel };
}
