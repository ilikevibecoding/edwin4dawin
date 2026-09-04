import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Batch, bladeGeometry, deckGeometry, fairedStrutGeometry, glareShieldGeometry, gridGeometry, halfWidthAt, humpGeometry, inBlock, insetSections, keyedRing, loft, loftGrid,
  paneGeometry, partsMaterial, placement, quadGeometry, revealGeometry, sectionAt, sectionPerimeter, strapGeometry, strutGeometry, tOfHeight, wingLowerY, wingPanel, wingUpperY, wingXLE, wingXTE, withStations,
  type QuadBlock, type Section, type Surf, type WingSpec,
} from './geometry';
import {
  CHEAT_LINE, DIAL, floatMaps, fuselageMaps, GAUGES, glassDirtTexture, GPS_SCREEN, GpsScreen, INSTRUMENT_ATLAS, instrumentAtlas, LIVERY, PANEL, PANEL_UV, panelTexture, propDiscTexture, wingMaps,
  type FuselageLayout, type GaugeDef, type UvRect,
} from './textures';
import type { FlightTelemetry } from './physics';

/** fuselage skin thickness: the cabin interior is the exterior loft offset inwards by this much */
const SKIN = 0.05;
/** window band heights (body space): sill, top of the side windows, bottom of the windshield side-lights */
const SILL = 0.40, WIN_TOP = 1.07, WS_BASE = 0.78;
/** cabin interior extent (firewall .. rear bulkhead) */
const CABIN_FRONT = 2.30, CABIN_REAR = -1.60;
/** cabin floor height; seats and pedals stand on it, the pilot's eye ends up ~0.7 m above the cushion */
const FLOOR = -0.25;
/** instrument panel: top edge station (under the glare shield's rear edge) and its lean toward the pilot */
const PANEL_X = 2.05, PANEL_TILT = 0.3;
const WING_POS = new THREE.Vector3(0.55, 1.285, 0);
/** live instrument channels (index into the needle shader's angle/shift arrays) */
const CH = { fixed: 0, asi: 1, adi: 2, alt100: 3, alt1000: 4, tc: 5, tcBall: 6, hdg: 7, vsi: 8, rpm: 9, map: 10, oilp: 11, oilt: 12, egt: 13, fuell: 14, fuelr: 15, adiBank: 16 } as const;
const N_CHANNELS = 17;
/** instrument canvases (GPS screen) are redrawn at most this often (simulated seconds) */
const CANVAS_PERIOD = 1 / 15;

/** Finishes of the untextured parts; all of them share one `partsMaterial` (colour/roughness/metalness per vertex). */
const SURF = {
  metal: { color: 0x8e949a, roughness: 0.38, metalness: 0.9 },
  darkMetal: { color: 0x2c2f33, roughness: 0.45, metalness: 0.8 },
  /** polished spinner: picks up a tight sun highlight */
  spinner: { color: 0xc4c8ce, roughness: 0.16, metalness: 0.95 },
  exhaust: { color: 0x5a4a3c, roughness: 0.6, metalness: 0.9 },
  rubber: { color: 0x111214, roughness: 0.92, metalness: 0.0 },
  /** cabin lining: light matte headliner over the windows, dark window-band trim, grey sidewall panels below the sill */
  headliner: { color: 0xc9c5bd, roughness: 0.92, metalness: 0.0 },
  bow: { color: 0xdad6ce, roughness: 0.85, metalness: 0.0 },
  trim: { color: 0x2e3136, roughness: 0.82, metalness: 0.04 },
  sidewall: { color: 0x8a857d, roughness: 0.88, metalness: 0.0 },
  doorTrim: { color: 0x9d988f, roughness: 0.86, metalness: 0.0 },
  plastic: { color: 0x3a3d42, roughness: 0.7, metalness: 0.0 },
  lightPlastic: { color: 0xbfbcb4, roughness: 0.6, metalness: 0.0 },
  leather: { color: 0x7a5535, roughness: 0.55, metalness: 0.0 },
  carpet: { color: 0x35302b, roughness: 0.95, metalness: 0.0 },
  belt: { color: 0x3c3f44, roughness: 0.9, metalness: 0.0 },
  prop: { color: 0x1e1f22, roughness: 0.5, metalness: 0.6 },
  propTip: { color: 0xf2c230, roughness: 0.5, metalness: 0.0 },
  shirt: { color: 0x2f4f6f, roughness: 0.85, metalness: 0.0 },
  skin: { color: 0xc8956c, roughness: 0.7, metalness: 0.0 },
  headset: { color: 0x1a1a1c, roughness: 0.5, metalness: 0.0 },
  throttle: { color: 0x151618, roughness: 0.5, metalness: 0.0 },
  propKnob: { color: 0x2a5fb0, roughness: 0.5, metalness: 0.0 },
  mixture: { color: 0xc0392b, roughness: 0.6, metalness: 0.0 },
  flapKnob: { color: 0xe8e6e0, roughness: 0.5, metalness: 0.0 },
  extinguisher: { color: 0xc0392b, roughness: 0.4, metalness: 0.3 },
} satisfies Record<string, Surf>;

/** channels of the navigation-light mesh (index into `lightPower`) */
const LIGHT = { red: 0, green: 1, tail: 2, beacon: 3, strobe: 4 } as const;

const DEG = Math.PI / 180;

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

/**
 * Procedural bush floatplane "Garza 7". Local axes: +X nose, +Y up, +Z starboard. Origin at the
 * fuselage datum roughly under the wing's 30% chord; the floats' keels sit near y = -2.25.
 *
 * Static parts are merged per material (one draw call each); only the animated parts (propeller, control
 * surfaces, water rudders, wheels, yokes, pedals, levers, lights, instruments) are separate meshes.
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
  /**
   * All navigation lights in one mesh: lens caps by day, emissive points at night. Per-channel power
   * (red/green wingtips, white tail, red beacon, white strobes) is driven through `lightPower`.
   */
  readonly lights: THREE.Mesh;
  private readonly lightPower = { value: new Float32Array(5) };
  readonly yokeL: THREE.Group;
  readonly yokeR: THREE.Group;
  readonly throttleLever: THREE.Mesh;
  readonly flapLever: THREE.Mesh;
  /** rudder pedals: the two left pedals (pilot + copilot) swing together, likewise the two right ones */
  readonly pedalsL: THREE.Mesh;
  readonly pedalsR: THREE.Mesh;
  /** live instrument parts (needles, cards) and the moving-map screen */
  readonly instruments: THREE.Mesh;
  readonly gpsMesh: THREE.Mesh;
  private readonly gps = new GpsScreen();
  private readonly instAngle = { value: new Float32Array(N_CHANNELS) };
  private readonly instShift = { value: new Float32Array(N_CHANNELS * 2) };
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly instMat: THREE.MeshStandardMaterial;
  private readonly gpsMat: THREE.MeshStandardMaterial;
  private canvasAcc = CANVAS_PERIOD;
  /** current gauge readings in display units (for the bench's verification) */
  readonly gaugeState = { kt: 0, ft: 0, fpm: 0, hdg: 0, bankDeg: 0, pitchDeg: 0, rpm: 0, map: 0, turnRateDps: 0, slip: 0 };
  /** hardpoints in local space */
  readonly exhaustPos = new THREE.Vector3(2.6, -0.55, 0.66);
  readonly floatSternL = new THREE.Vector3(-2.2, -2.15, -1.25);
  readonly floatSternR = new THREE.Vector3(-2.2, -2.15, 1.25);
  readonly floatBowL = new THREE.Vector3(2.6, -2.0, -1.25);
  readonly floatBowR = new THREE.Vector3(2.6, -2.0, 1.25);
  readonly wingTipL = new THREE.Vector3(-0.04, 1.435, -7.5);
  readonly wingTipR = new THREE.Vector3(-0.04, 1.435, 7.5);
  /** pilot's eye: left seat, 0.13 m under the headliner (inner crest 1.13), at the windshield's vertical centre (0.99) */
  readonly cockpitEye = new THREE.Vector3(1.0, 1.0, -0.30);
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
      { x: 2.15, yc: 0.05, w: 0.79, top: 0.88, bot: 0.70, n: 5.0, nBot: 2.4 },
      { x: 2.00, yc: 0.05, w: 0.80, top: 1.01, bot: 0.70, n: 4.7, nBot: 2.4 },
      { x: 1.85, yc: 0.05, w: 0.80, top: 1.12, bot: 0.70, n: 4.5, nBot: 2.4 },
      { x: 1.73, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 4.5, nBot: 2.4 },
      { x: 0.95, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 4.5, nBot: 2.4 },
      { x: 0.00, yc: 0.05, w: 0.80, top: 1.13, bot: 0.68, n: 4.5, nBot: 2.4 },
      { x: -0.40, yc: 0.05, w: 0.79, top: 1.12, bot: 0.66, n: 4.3, nBot: 2.4 },
      { x: -0.90, yc: 0.05, w: 0.76, top: 1.08, bot: 0.62, n: 3.8, nBot: 2.4 },
      { x: -1.25, yc: 0.055, w: 0.70, top: 1.00, bot: 0.56, n: 3.3, nBot: 2.3 },
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
    // texture's v is the ring parameter, so the paint bands stay at their heights on the boxy cabin sections too);
    // the roof shoulder gets enough segments to read as a smooth headliner from the pilot seat
    const SEG_ROOF = 9, SEG_WS = 2, SEG_WIN = 3;
    const ring = keyedRing([
      { y: WIN_TOP, segs: SEG_ROOF, fallbackT: 0.10 }, { y: WS_BASE, segs: SEG_WS, fallbackT: 0.146 }, { y: (s) => sillY(s.x), segs: SEG_WIN, fallbackT: 0.2125 },
      { y: (s) => sillY(s.x) - CHEAT_LINE.top, segs: 1, fallbackT: 0.23 }, { y: (s) => sillY(s.x) - CHEAT_LINE.bottom, segs: 1, fallbackT: 0.26 },
      { y: (s) => sillY(s.x) - CHEAT_LINE.pin, segs: 1, fallbackT: 0.27 },
    ], 7);
    const jA = SEG_ROOF, jB = jA + SEG_WS, jC = jB + SEG_WIN;
    const outer = loftGrid(sections, ring);
    const R = outer.R;
    // interior shell: same stations and ring parameters, sections shrunk by the skin thickness
    const innerSections = insetSections(sections, SKIN);
    const inner = loftGrid(innerSections, (_s, i) => outer.t[i]);
    const blocks: QuadBlock[] = [];
    for (const [xf, xa, top] of sideWindows) {
      const jTop = top === WIN_TOP ? jA : jB;
      blocks.push({ i0: si(xf), i1: si(xa), j0: jTop, j1: jC });
      blocks.push({ i0: si(xf), i1: si(xa), j0: R - jC, j1: R - jTop });
    }
    // wraparound windshield: the top of the loft (across the ring seam) from the port to the starboard WS_BASE height
    const windshield: QuadBlock = { i0: si(CABIN_FRONT), i1: si(1.85), j0: R - jB, j1: R + jB };
    blocks.push(windshield);
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
    // clearcoat roughness comes from the texture: the cowl is a little glossier than the body, the glare panel is dull
    const paint = new THREE.MeshPhysicalMaterial({
      map: fus.map, roughnessMap: fus.roughnessMap, normalMap: fus.normalMap, normalScale: new THREE.Vector2(0.55, 0.55),
      color: 0xffffff, roughness: 1.0, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 1.0, clearcoatRoughnessMap: fus.clearcoatRoughnessMap, envMapIntensity: 1.0,
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
    // pane from the pilot seat, so no back faces are ever drawn. Every pane carries its own [0,1]^2 UV and physical
    // size (`aPane`, see paneGeometry) from which the shader draws a rubber seal of constant width, a soft vignette
    // toward the frame and a faint smudge film that only shows where the sun catches it.
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x9fc3d2, transparent: true, opacity: 0.10, roughness: 0.25, metalness: 0.0, envMapIntensity: 1.0,
      side: THREE.FrontSide, depthWrite: false, specularIntensity: 1.0, ior: 1.52, premultipliedAlpha: true,
    });
    const glassUniforms = { uDirt: { value: glassDirtTexture() }, uEnvGain: { value: 3.0 }, uDirtAmount: { value: 0.35 } };
    glass.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, glassUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aPane;\nvarying vec4 vPane;\nvarying vec2 vPaneUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPane = aPane;\nvPaneUv = uv;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uDirt;\nuniform float uEnvGain;\nuniform float uDirtAmount;\nvarying vec4 vPane;\nvarying vec2 vPaneUv;')
        .replace('#include <opaque_fragment>', /* glsl */ `
          // distance to the nearest pane edge in metres (and to the centre post seal on the windshield)
          vec2 dm = vec2(min(vPaneUv.x, 1.0 - vPaneUv.x) * vPane.x, min(vPaneUv.y, 1.0 - vPaneUv.y) * vPane.y);
          float dEdge = min(dm.x, dm.y);
          if (vPane.z > 0.5) dEdge = min(dEdge, abs(vPaneUv.y - 0.5) * vPane.y - 0.006);
          float seal = 1.0 - smoothstep(0.008, 0.019, dEdge);
          float vig = 1.0 - smoothstep(0.0, 0.26, dEdge);
          // the cabin side of the glass carries half the smudge film and catches no sun (the roof shades it)
          float inner = vPane.w;
          float dirt = texture2D(uDirt, vPaneUv * vPane.xy * 1.6).r * uDirtAmount * (1.0 - 0.5 * inner);
          vec3 glassN = normalize(normal), glassV = normalize(vViewPosition);
          float glassNdv = saturate(dot(glassN, glassV));
          float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
          // smudge film: a broad glossy lobe around the sun's mirror direction (the haze a dirty windshield shows
          // around the sun), strongest where the film is thick; the mirror highlight itself is the GGX term
          vec3 filmSheen = vec3(0.0);
          #if NUM_DIR_LIGHTS > 0
            vec3 sunL = directionalLights[0].direction;
            float sunNdh = saturate(dot(glassN, normalize(sunL + glassV)));
            filmSheen = directionalLights[0].color * pow(sunNdh, 8.0) * (0.10 + dirt * 0.9) * saturate(dot(glassN, sunL) * 4.0) * (1.0 - 0.7 * inner);
          #endif
          // the film only shows where it scatters light (sun sheen, a little of the sky reflection): as a diffuse
          // haze it would frost the panes and make them glow at night
          vec3 glassSpec = reflectedLight.directSpecular * (1.0 + dirt * 2.0) + filmSheen + reflectedLight.indirectSpecular * uEnvGain * (1.0 + dirt * 1.5);
          // soft knee: the sun's mirror image stays bright but never clips to white
          glassSpec = 1.0 - exp(-glassSpec);
          float glassA = clamp(diffuseColor.a + glassF * 0.85 + vig * 0.14 + dirt * 0.08, 0.0, 1.0);
          vec3 glassCol = totalDiffuse * (diffuseColor.a + dirt * 0.08) + glassSpec * (1.0 - 0.5 * vig);
          glassCol = mix(glassCol, totalDiffuse * 0.10, seal);
          glassA = mix(glassA, 1.0, seal);
          gl_FragColor = vec4(glassCol, glassA);
        `)
        .replace('#include <premultiplied_alpha_fragment>', '');
    };
    glass.customProgramCacheKey = () => 'cockpit-glass-v7';
    const plainPaint = new THREE.MeshPhysicalMaterial({ color: LIVERY.upper, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    const parts = partsMaterial();
    const panelTex = panelTexture();
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex.map, emissiveMap: panelTex.emissive, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.75, metalness: 0.0 });
    // live instrument parts: the atlas gives the ball / card art and flat colours, the vertex shader rotates each
    // channel about its gauge centre (uInstAngle, radians CCW) after an optional shift (uInstShift, attitude pitch)
    const atlas = instrumentAtlas();
    const instMat = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.0 });
    instMat.onBeforeCompile = (shader) => {
      shader.uniforms.uInstAngle = this.instAngle;
      shader.uniforms.uInstShift = this.instShift;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nattribute vec3 aPivot;\nattribute float aChan;\nattribute float aClip;\nvarying vec2 vInstLocal;\nvarying float vInstClip;\nuniform float uInstAngle[${N_CHANNELS}];\nuniform vec2 uInstShift[${N_CHANNELS}];`)
        .replace('#include <begin_vertex>', /* glsl */ `
          int instCh = int(aChan + 0.5);
          float instC = cos(uInstAngle[instCh]), instS = sin(uInstAngle[instCh]);
          vec2 instQ = position.xy + uInstShift[instCh];
          vec3 transformed = vec3(aPivot.x + instC * instQ.x - instS * instQ.y, aPivot.y + instS * instQ.x + instC * instQ.y, aPivot.z + position.z);
          vInstLocal = transformed.xy - aPivot.xy;
          vInstClip = aClip;
        `);
      // dial aperture: the attitude ball is larger than its window so it can shift for pitch; clip it to the bezel
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vInstLocal;\nvarying float vInstClip;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vInstClip > 0.0 && dot(vInstLocal, vInstLocal) > vInstClip * vInstClip) discard;');
    };
    instMat.customProgramCacheKey = () => 'cockpit-instruments-v2';
    const gpsMat = new THREE.MeshStandardMaterial({ map: this.gps.texture, emissiveMap: this.gps.texture, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.0 });
    this.materials.push(paint, wingPaint, floatPaint, glass, plainPaint, parts, panelMat, instMat, gpsMat);
    this.glassMaterial = glass;
    this.paintMaterial = paint;
    this.panelMat = panelMat; this.instMat = instMat; this.gpsMat = gpsMat;

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
    // fixed cabin surfaces that must not cast shadows (the skin already does): shell, window reveals, floor.
    // The shell is lined by height: headliner above the window tops, dark trim through the window band (so the
    // pillars between the panes read as slim dark posts) and grey sidewall panels below the sill.
    const cabinFixed = new Batch();
    // the headliner darkens a little toward the window tops (soft shading where the fabric meets the trim)
    const headlinerAt = (y: number): Surf => {
      const f = THREE.MathUtils.smoothstep(y, WIN_TOP, WIN_TOP + 0.045);
      return { ...SURF.headliner, color: new THREE.Color(SURF.headliner.color).multiplyScalar(0.78 + 0.22 * f).getHex() };
    };
    const lining = (_x: number, y: number) => (y >= WIN_TOP - 0.005 ? headlinerAt(y) : y >= SILL - 0.005 ? SURF.trim : SURF.sidewall);
    cabinFixed.add(gridGeometry(inner, { i0: iFront, i1: iRear, quad: (i, j) => !isWindow(i, j), flip: true, capStart: true, capEnd: true }), undefined, lining);
    for (const b of blocks) cabinFixed.add(revealGeometry(outer, inner, b), undefined, SURF.trim);
    cabinFixed.add(deckGeometry(innerSections, FLOOR, -1.55, 1.95, 0.01), undefined, SURF.carpet);
    // every pane with its own UV / size, outer panes first (seen from outside) then the flipped inner panes
    const glassGeo = mergeGeometries([
      ...blocks.map((b) => paneGeometry(outer, b, false, b === windshield)),
      ...blocks.map((b) => paneGeometry(inner, b, true, b === windshield)),
    ]);
    // the mesh origin sits at the windshield centre: transparent objects sort by their origin's depth, and with
    // the origin at the datum (behind the pilot's eye) the panes sorted as the farthest object from the cockpit
    // and the propeller blur disc was drawn over them. Same renderOrder as the disc so the two sort by depth:
    // from the seat the disc is beyond the windshield, from ahead of the aircraft it is in front of it.
    const glassOrigin = new THREE.Vector3(2.05, 1.0, 0);
    glassGeo.translate(-glassOrigin.x, -glassOrigin.y, -glassOrigin.z);
    const glassMesh = mesh(glassGeo, glass, { cast: false, receive: false });
    glassMesh.position.copy(glassOrigin);
    glassMesh.renderOrder = 15;
    // cabin furniture (casts shadows inside the cabin)
    const cabinKit = new Batch();
    // windshield centre post between the two panes along the glass centreline
    const wsBase = new THREE.Vector3(CABIN_FRONT, 0.81, 0), wsTop = new THREE.Vector3(1.85, 1.17, 0);
    const postPos = wsBase.clone().add(wsTop).multiplyScalar(0.5); postPos.y -= SKIN * 0.5;
    cabinKit.add(new THREE.BoxGeometry(wsBase.distanceTo(wsTop) + 0.04, 0.028, 0.026), at(postPos, [0, 0, Math.atan2(wsTop.y - wsBase.y, wsTop.x - wsBase.x)]), SURF.trim);

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
    hub.add(new THREE.ConeGeometry(0.26, 0.55, 20), at([0.27, 0, 0], [0, 0, -Math.PI / 2]), SURF.spinner);
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
    // straight trailing edge (sweep chosen so xTE is constant), gentle taper, thin 11% airfoil with washout
    const wingSpec: WingSpec = { span: 7.3, rootChord: 1.95, tipChord: 1.55, sweep: -0.28, dihedral: 0.02, thickness: 0.11, twist: -0.03, camber: 0.02 };
    const xte = wingXTE(wingSpec, 0);
    const flapHinge = xte + 0.52, ailHinge = xte + 0.46;
    const wingGeo = mergeGeometries([
      wingPanel(wingSpec, { z0: 0, z1: 0.85, segments: 2, part: 'full', hingeX: flapHinge, capEnd: 'rear' }),
      wingPanel(wingSpec, { z0: 0.85, z1: 3.55, segments: 5, part: 'front', hingeX: flapHinge }),
      wingPanel(wingSpec, { z0: 3.55, z1: 3.65, segments: 1, part: 'full', hingeX: flapHinge, capStart: 'rear', capEnd: 'rear' }),
      wingPanel(wingSpec, { z0: 3.65, z1: 6.90, segments: 6, part: 'front', hingeX: ailHinge }),
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
    fittings.add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), at([-2.0, 0.9, 0], [0, 0, 0.5]), SURF.metal);

    // ------------------------------------------------------------ navigation lights (one mesh)
    // Lens caps: tinted glossy plastic lit like any other part by day (no emission, so nothing glows in daylight);
    // at night each channel's emissive power comes from `lightPower` and the bloom pass turns them into soft points.
    const lightsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.0, vertexColors: true });
    lightsMat.onBeforeCompile = (shader) => {
      shader.uniforms.uLightPower = this.lightPower;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aLight;\nvarying float vLight;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = aLight;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLightPower[5];\nvarying float vLight;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];');
    };
    lightsMat.customProgramCacheKey = () => 'plane-lights-v1';
    this.materials.push(lightsMat);
    const lens = (r: number, tint: number, channel: number): THREE.BufferGeometry => {
      const g = new THREE.SphereGeometry(r, 8, 6);
      const n = g.getAttribute('position').count, c = new THREE.Color(tint);
      const col = new Float32Array(n * 3), ch = new Float32Array(n);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; ch[i] = channel; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aLight', new THREE.BufferAttribute(ch, 1));
      return g;
    };
    // wingtip lenses sit just outboard of the rounded tip (span ends at z 7.52) so they are not buried in the wing
    const lightKit = new Batch();
    for (const [tip, tint, channel] of [[this.wingTipL, 0xd81c1c, LIGHT.red], [this.wingTipR, 0x18c848, LIGHT.green]] as const) {
      const zOut = Math.sign(tip.z) * 7.55;
      lightKit.add(lens(0.06, tint, channel), at([tip.x, tip.y, zOut]));
      lightKit.add(lens(0.035, 0xf2f4ff, LIGHT.strobe), at([tip.x - 0.12, tip.y, zOut - Math.sign(tip.z) * 0.02]));
    }
    lightKit.add(lens(0.04, 0xf2f4ff, LIGHT.tail), at([-5.37, 0.30, 0]));
    lightKit.add(lens(0.05, 0xd81c1c, LIGHT.beacon), at([-4.80, 2.07, 0]));
    this.lights = mesh(lightKit.build(), lightsMat, { cast: false, receive: false });

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
    const tyre = new THREE.TorusGeometry(0.2, 0.09, 6, 16);
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12);
    const wheelKit = new Batch();
    for (const side of [-1, 1]) {
      for (const [x, r] of [[-0.9, 1.0], [2.3, 0.7]] as [number, number][]) {
        wheelKit.add(tyre, at([x, -2.28, side * 1.25], undefined, r), SURF.rubber);
        wheelKit.add(hubGeo, at([x, -2.28, side * 1.25], [Math.PI / 2, 0, 0], r), SURF.metal);
      }
    }
    mesh(wheelKit.build(), parts, { parent: this.wheels, receive: false });

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
    // textured cabin parts share the panel atlas: the face, the glare shield with its rolled lip, placards, the
    // compass card and the dome-light lens
    const textured: THREE.BufferGeometry[] = [];
    // crop the atlas symmetrically when the cabin is narrower than the painted face: the pixel scale must stay exact
    // so the live needles land on the painted dials
    const faceUv: UvRect = { ...PANEL_UV.face };
    const cropU = (1 - PANEL_W / PANEL.W) * 0.5 * (faceUv.u1 - faceUv.u0);
    faceUv.u0 += cropU; faceUv.u1 -= cropU;
    const faceGeo = quadGeometry(PANEL_W, PANEL_H, faceUv); faceGeo.applyMatrix4(panelFrame); textured.push(faceGeo);
    textured.push(glareShieldGeometry(innerSections, 0.745, PANEL_X - 0.02, CABIN_FRONT - 0.005, 0.005, 0.02, PANEL_UV.grain));
    /** placard quad: centre, size, facing direction (unit), up direction */
    const decal = (uv: UvRect, w: number, h: number, centre: THREE.Vector3, facing: THREE.Vector3, up: THREE.Vector3) => {
      const g = quadGeometry(w, h, uv);
      const zAxis = facing.clone().normalize(), yAxis = up.clone().addScaledVector(zAxis, -up.dot(zAxis)).normalize(), xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
      g.applyMatrix4(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(centre));
      textured.push(g);
    };
    const UP = new THREE.Vector3(0, 1, 0);
    // yoke placards on the hubs are part of the yokes (they move); the nameplate sits on the glare shield lip
    decal(PANEL_UV.nameplate, 0.16, 0.035, new THREE.Vector3(PANEL_X - 0.041, 0.725, 0.34), new THREE.Vector3(-1, 0, 0), UP);
    // magnetic compass on the glare shield ahead of the centre post: housing, bracket and the card window
    cabinKit.add(new THREE.BoxGeometry(0.075, 0.055, 0.07), at([PANEL_X + 0.09, 0.80, 0]), SURF.plastic);
    cabinKit.add(new THREE.BoxGeometry(0.02, 0.035, 0.024), at([PANEL_X + 0.09, 0.762, 0]), SURF.darkMetal);
    decal(PANEL_UV.compass, 0.05, 0.024, new THREE.Vector3(PANEL_X + 0.052, 0.80, 0), new THREE.Vector3(-1, 0, 0), UP);
    // dome light in the headliner over the front seats
    cabinKit.add(new THREE.BoxGeometry(0.12, 0.024, 0.10), at([0.30, 1.117, 0]), SURF.lightPlastic);
    decal(PANEL_UV.domeLens, 0.075, 0.06, new THREE.Vector3(0.30, 1.1045, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
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
    this.instruments = mesh(kit.build(), instMat, { exterior: false, cast: false });
    panelFrame.decompose(this.instruments.position, this.instruments.quaternion, this.instruments.scale);
    const gpsGeo = quadGeometry(GPS_SCREEN.w, GPS_SCREEN.h, { u0: 0, v0: 0, u1: 1, v1: 1 });
    gpsGeo.translate(GPS_SCREEN.x, GPS_SCREEN.y, 0.0008);
    gpsGeo.applyMatrix4(panelFrame);
    this.gpsMesh = mesh(gpsGeo, gpsMat, { exterior: false, cast: false });

    // ------------------------------------------------------------ cockpit: controls
    // pedestal between the seats with the throttle / propeller / mixture quadrant and the flap lever
    cabinKit.add(new THREE.BoxGeometry(0.7, 0.32, 0.22), at([1.7, FLOOR + 0.16, 0]), SURF.plastic);
    cabinKit.add(new THREE.BoxGeometry(0.22, 0.02, 0.16), at([1.62, FLOOR + 0.33, 0]), SURF.darkMetal);
    const lever = (knob: Surf, knobGeo: THREE.BufferGeometry, len: number): THREE.BufferGeometry => new Batch()
      .add(new THREE.CylinderGeometry(0.009, 0.011, len, 8), at([0, len / 2, 0]), SURF.metal)
      .add(knobGeo, at([0, len + 0.012, 0]), knob).build();
    const knobBall = new THREE.SphereGeometry(0.022, 12, 8);
    this.throttleLever = mesh(lever(SURF.throttle, knobBall, 0.16), parts, { exterior: false, cast: false, receive: false });
    this.throttleLever.position.set(1.62, FLOOR + 0.34, -0.05);
    for (const [z, surf] of [[0.0, SURF.propKnob], [0.05, SURF.mixture]] as [number, Surf][]) cabinKit.add(lever(surf, knobBall, 0.15), at([1.62, FLOOR + 0.34, z], [0, 0, -0.35]), surf);
    // flap lever: a bar on the pedestal's right flank, up = flaps retracted, back toward the pilot = full flap
    this.flapLever = mesh(lever(SURF.flapKnob, new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), 0.26), parts, { exterior: false, cast: false, receive: false });
    this.flapLever.position.set(1.42, FLOOR + 0.30, 0.10);
    // rudder pedals: two pairs standing on the floor ahead of each front seat; each mesh holds one pedal per seat
    const pedalPair = (dz: number): THREE.BufferGeometry => {
      const b = new Batch();
      for (const seat of [-0.34, 0.34]) {
        const z = seat + dz;
        b.add(new THREE.CylinderGeometry(0.011, 0.011, 0.20, 8), at([0.02, 0.10, z], [0, 0, -0.2]), SURF.metal);
        b.add(new THREE.BoxGeometry(0.02, 0.15, 0.085), at([0.06, 0.21, z], [0, 0, -0.35]), SURF.darkMetal);
        b.add(new THREE.BoxGeometry(0.03, 0.03, 0.03), at([0, 0.015, z]), SURF.darkMetal);
      }
      return b.build();
    };
    this.pedalsL = mesh(pedalPair(-0.12), parts, { exterior: false, cast: false, receive: false });
    this.pedalsR = mesh(pedalPair(0.12), parts, { exterior: false, cast: false, receive: false });
    for (const p of [this.pedalsL, this.pedalsR]) p.position.set(1.93, FLOOR, 0);
    // pedal torque tube across the floor
    cabinKit.add(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), at([1.93, FLOOR + 0.02, 0], [Math.PI / 2, 0, 0]), SURF.metal);

    // seats: cushion top ~0.46 m over the floor so a seated pilot's eye lands at cockpitEye
    const SEAT_Y = FLOOR + 0.40;
    // yokes: shaft entering the panel below the switch row, hub with a placard, ram's-horn wheel with grips
    // hub ~0.66 m ahead of and 0.48 m below the eye (chest height), so the horns show at the bottom of the view
    const YOKE_HUB = new THREE.Vector3(1.66, 0.52, 0);
    const shaftIn = inPanel(0, -0.175, 0.0).setZ(0);
    const mkYoke = (z: number, hands: boolean): THREE.Group => {
      const g = new THREE.Group();
      const yoke = new Batch();
      const shaftEnd = shaftIn.clone().sub(YOKE_HUB).setZ(0);
      const shaftDir = shaftEnd.clone().normalize();
      yoke.add(strutGeometry(new THREE.Vector3(0, 0, 0), shaftEnd.clone().addScaledVector(shaftDir, 0.16), 0.018), undefined, SURF.darkMetal);
      yoke.add(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), at(shaftEnd.clone().addScaledVector(shaftDir, -0.01), [0, 0, Math.PI / 2 - Math.atan2(shaftDir.y, shaftDir.x)]), SURF.rubber);
      yoke.add(new THREE.BoxGeometry(0.05, 0.09, 0.075), undefined, SURF.plastic);
      // wheel: 250-degree arc open at the top, three spokes, grips angled up and outward at the horn tips
      yoke.add(new THREE.TorusGeometry(0.15, 0.013, 8, 36, Math.PI * 1.39), at(undefined, [0, Math.PI / 2, Math.PI * 0.805]), SURF.plastic);
      yoke.add(new THREE.BoxGeometry(0.022, 0.15, 0.03), at([0, -0.075, 0]), SURF.plastic);
      for (const s of [-1, 1]) {
        yoke.add(new THREE.BoxGeometry(0.022, 0.03, 0.15), at([0, 0, s * 0.075]), SURF.plastic);
        const tip = new THREE.Vector3(0, 0.15 * Math.sin(Math.PI * 0.195), s * 0.15 * Math.cos(Math.PI * 0.195));
        const grip = tip.clone().add(new THREE.Vector3(0, 0.08, s * 0.03));
        yoke.add(strutGeometry(tip, grip, 0.017, 10), undefined, SURF.rubber);
        if (hands) {
          // pilot's hands wrapped around the grips
          yoke.add(new THREE.BoxGeometry(0.06, 0.085, 0.055), at(tip.clone().lerp(grip, 0.5).add(new THREE.Vector3(-0.012, 0, 0))), SURF.skin);
          yoke.add(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), at(tip.clone().lerp(grip, 0.75).add(new THREE.Vector3(0.028, 0.0, -s * 0.01)), [0, 0, Math.PI / 2]), SURF.skin);
        }
      }
      const m = new THREE.Mesh(yoke.build(), parts);
      m.castShadow = false;
      g.add(m);
      g.position.set(YOKE_HUB.x, YOKE_HUB.y, z);
      this.root.add(g);
      this.interiorMeshes.push(g);
      return g;
    };
    this.yokeL = mkYoke(-0.34, true);
    this.yokeR = mkYoke(0.34, false);
    // yoke hub placards
    for (const z of [-0.34, 0.34]) decal(PANEL_UV.yoke, 0.036, 0.024, new THREE.Vector3(YOKE_HUB.x - 0.026, YOKE_HUB.y + 0.015, z), new THREE.Vector3(-1, 0, 0), UP);

    // ------------------------------------------------------------ cockpit: seats, belts, pilot, door trim, headliner
    const seatGeo = new THREE.BoxGeometry(0.46, 0.12, 0.46), backGeo = new THREE.BoxGeometry(0.1, 0.55, 0.46), frameGeo = new THREE.BoxGeometry(0.26, 0.34, 0.26);
    const seats: [number, number][] = [[1.0, -0.34], [1.0, 0.34], [-0.2, -0.34], [-0.2, 0.34], [-1.0, 0]];
    for (const [x, z] of seats) {
      cabinKit.add(seatGeo, at([x, SEAT_Y, z]), SURF.leather);
      cabinKit.add(backGeo, at([x - 0.25, SEAT_Y + 0.33, z], [0, 0, 0.15]), SURF.leather);
      cabinKit.add(frameGeo, at([x, FLOOR + 0.17, z]), SURF.darkMetal);
    }
    const cushionTop = SEAT_Y + 0.06;
    const strap = (a: [number, number, number], b: [number, number, number], n: [number, number, number] = [0, 1, 0]) => cabinKit.add(strapGeometry(V3(...a), V3(...b), 0.045, 0.005, V3(...n)), undefined, SURF.belt);
    const buckle = (p: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => cabinKit.add(new THREE.BoxGeometry(0.055, 0.016, 0.06), at(p, rot), SURF.metal);
    // lap belts on the empty seats lie across the cushions; the pilot wears his, with a shoulder strap
    for (const [x, z] of seats.slice(1)) {
      const yb = cushionTop + 0.004;
      strap([x, yb, z - 0.24], [x, yb, z - 0.04]); strap([x, yb, z + 0.24], [x, yb, z + 0.04]);
      buckle([x, yb + 0.004, z]);
    }
    strap([0.96, cushionTop + 0.01, -0.60], [1.07, 0.30, -0.36], [0.35, 1, 0]); strap([0.96, cushionTop + 0.01, -0.08], [1.07, 0.30, -0.32], [0.35, 1, 0]);
    buckle([1.075, 0.30, -0.34], [0, 0, 0.35]);
    strap([1.10, 0.78, -0.50], [1.09, 0.31, -0.32], [1, 0.1, 0]);           // across the chest
    strap([1.0, 0.80, -0.50], [0.52, 0.96, -0.68], [0, 1, -0.3]);            // over the shoulder back to the sidewall anchor
    strap([0.52, 0.96, 0.68], [0.74, 0.70, 0.46], [0, 1, 0.3]);              // copilot's shoulder strap draped over the seat back
    for (const s of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.05, 0.05, 0.02), at([0.52, 0.96, s * 0.69]), SURF.darkMetal);
    // pilot: torso, head with headset (eyes at cockpitEye), arms from the shoulders to the yoke grips
    const headY = this.cockpitEye.y - 0.03;
    cabinKit.add(new THREE.BoxGeometry(0.28, 0.58, 0.42), at([0.95, SEAT_Y + 0.06 + 0.29, -0.34]), SURF.shirt);
    cabinKit.add(new THREE.SphereGeometry(0.11, 12, 10), at([0.98, headY, -0.34]), SURF.skin);
    cabinKit.add(new THREE.TorusGeometry(0.115, 0.018, 6, 16, Math.PI), at([0.98, headY + 0.03, -0.34], [0, Math.PI / 2, 0]), SURF.headset);
    for (const side of [-1, 1]) cabinKit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), at([0.98, headY, -0.34 + side * 0.12], [Math.PI / 2, 0, 0]), SURF.headset);
    for (const side of [-1, 1]) {
      const shoulder = V3(0.98, 0.74, -0.34 + side * 0.20), elbow = V3(1.20, 0.52, -0.34 + side * 0.23), wrist = V3(YOKE_HUB.x - 0.04, YOKE_HUB.y + 0.12, -0.34 + side * 0.165);
      cabinKit.add(strutGeometry(shoulder, elbow, 0.045, 8), undefined, SURF.shirt);
      cabinKit.add(strutGeometry(elbow, wrist, 0.04, 8), undefined, SURF.shirt);
      cabinKit.add(new THREE.SphereGeometry(0.045, 8, 6), at(elbow), SURF.shirt);
    }
    // legs to the pedals
    for (const side of [-1, 1]) {
      cabinKit.add(strutGeometry(V3(1.05, SEAT_Y + 0.10, -0.34 + side * 0.11), V3(1.45, SEAT_Y + 0.12, -0.34 + side * 0.12), 0.07, 8), undefined, SURF.plastic);
      cabinKit.add(strutGeometry(V3(1.45, SEAT_Y + 0.12, -0.34 + side * 0.12), V3(1.90, FLOOR + 0.06, -0.34 + side * 0.12), 0.055, 8), undefined, SURF.plastic);
    }
    // doors: an inner door skin 15 mm proud of the sidewall (with the gap around it) from the sill down to the
    // door's bottom line, an armrest, the interior handle and a map pocket; an exit placard above the window
    const doorSections = insetSections(sections, SKIN + 0.015);
    const doorGrid = loftGrid(doorSections, (_s, i) => outer.t[i]);
    const jDoorBot = (() => {
      const s = sectionAt(sections, 1.3), t = tOfHeight(s, -0.42) ?? 0.4;
      const ts = outer.t[si(1.77)];
      let best = jC, bestD = Infinity;
      for (let j = jC; j <= R / 2; j++) { const d = Math.abs(ts[j] - t); if (d < bestD) { bestD = d; best = j; } }
      return best;
    })();
    const doorBlocks: QuadBlock[] = [{ i0: si(1.77), i1: si(0.95), j0: jC, j1: jDoorBot }, { i0: si(1.77), i1: si(0.95), j0: R - jDoorBot, j1: R - jC }];
    for (const b of doorBlocks) {
      cabinFixed.add(gridGeometry(doorGrid, { i0: b.i0, i1: b.i1, quad: (i, j) => inBlock(b, R, i, j), flip: true }), undefined, SURF.doorTrim);
      cabinFixed.add(revealGeometry(inner, doorGrid, b), undefined, SURF.trim);
    }
    const doorHalf = (x: number, y: number) => halfWidthAt(sectionAt(doorSections, x), y);
    for (const s of [-1, 1]) {
      cabinKit.add(new THREE.BoxGeometry(0.34, 0.045, 0.07), at([1.32, 0.17, s * (doorHalf(1.32, 0.17) - 0.035)]), SURF.plastic);
      cabinKit.add(new THREE.BoxGeometry(0.05, 0.05, 0.012), at([1.06, 0.06, s * (doorHalf(1.06, 0.06) - 0.006)]), SURF.metal);
      cabinKit.add(new THREE.BoxGeometry(0.10, 0.018, 0.02), at([1.10, 0.05, s * (doorHalf(1.06, 0.06) - 0.025)], [0, 0, -0.25]), SURF.metal);
      cabinKit.add(new THREE.BoxGeometry(0.30, 0.16, 0.02), at([1.30, -0.16, s * (doorHalf(1.30, -0.16) - 0.012)]), SURF.trim);
      // placards on the flat door skin just under the sill (the roof line above the window curves inward)
      decal(PANEL_UV.exit, 0.10, 0.036, new THREE.Vector3(1.15, 0.33, s * (doorHalf(1.15, 0.33) - 0.002)), new THREE.Vector3(0, 0, -s), UP);
      decal(PANEL_UV.belts, 0.10, 0.030, new THREE.Vector3(1.55, 0.33, s * (doorHalf(1.55, 0.33) - 0.002)), new THREE.Vector3(0, 0, -s), UP);
    }
    // headliner bows over the window pillars, eyeball vents, fire extinguisher by the copilot door
    for (const x of [1.81, 0.90]) {
      const bowSections = [sectionAt(insetSections(sections, SKIN + 0.004), x + 0.012), sectionAt(insetSections(sections, SKIN + 0.004), x - 0.012)];
      const bowGrid = loftGrid(bowSections, (s) => ring(s));
      cabinFixed.add(gridGeometry(bowGrid, { flip: true, quad: (_i, j) => j < jA || j >= R - jA }), undefined, SURF.bow);
    }
    // eyeball vents: flush housings let into the headliner outboard of each front seat (roof inner surface ~1.09 at
    // z 0.50), dark ball inside; they protrude about a centimetre
    for (const s of [-1, 1]) {
      cabinKit.add(new THREE.CylinderGeometry(0.028, 0.028, 0.024, 12), at([1.60, 1.092, s * 0.50]), SURF.lightPlastic);
      cabinKit.add(new THREE.CylinderGeometry(0.015, 0.015, 0.028, 10), at([1.60, 1.091, s * 0.50]), SURF.plastic);
    }
    cabinKit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10), at([0.55, FLOOR + 0.14, 0.62], [0, 0, 0.1]), SURF.extinguisher);
    cabinKit.add(new THREE.BoxGeometry(0.06, 0.08, 0.04), at([0.55, FLOOR + 0.06, 0.66]), SURF.darkMetal);

    mesh(cabinFixed.build(), parts, { exterior: false, cast: false });
    mesh(cabinKit.build(), parts, { exterior: false });
    const texturedGeo = mergeGeometries(textured);
    if (!texturedGeo) throw new Error('cockpit: textured parts have incompatible attributes');
    mesh(texturedGeo, panelMat, { exterior: false, cast: false });

    for (const m of this.materials) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
    this.setInstruments(null, 0, 0);
  }

  /**
   * Animate control surfaces, propeller, lights, cockpit controls and instruments. Inputs in [-1,1], flaps 0..1,
   * rpm 0..1. With `telemetry` the gauges read the live flight state (`throttle` drives the throttle lever).
   */
  animate(pitch: number, roll: number, yaw: number, flaps: number, rpm: number, dt: number, time: number, night: number, gearDown: boolean, telemetry: FlightTelemetry | null = null, throttle = rpm): void {
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
    // at speed the blur disc stands in for the blades; the spinner keeps turning
    this.propBlades.visible = rpm < 0.55;
    // position lights, rotating beacon and strobes: only emissive after dusk (`night` 0 by day .. 1 at night)
    const strobeOn = (time % 1.2) < 0.06 || ((time + 0.15) % 1.2) < 0.06;
    const glow = Math.pow(night, 0.6);
    const P = this.lightPower.value;
    P[LIGHT.red] = P[LIGHT.green] = 7 * glow;
    P[LIGHT.tail] = 6 * glow;
    P[LIGHT.beacon] = (2 + 12 * Math.max(0, Math.sin(time * 4.5))) * glow;
    P[LIGHT.strobe] = (strobeOn ? 30 : 0) * glow;
    this.wheels.visible = gearDown;
    this.wheels.position.y = gearDown ? 0 : 0.3;
    // controls: the yoke turns with roll (right roll = clockwise seen by the pilot) and slides fore/aft with pitch
    // (pull = toward the pilot), pedals swing with the rudder, the throttle and flap levers follow their inputs
    for (const y of [this.yokeL, this.yokeR]) { y.rotation.x = roll * 0.9; y.position.x = 1.50 - pitch * 0.08; }
    this.pedalsL.rotation.z = yaw * 0.32;
    this.pedalsR.rotation.z = -yaw * 0.32;
    this.throttleLever.rotation.z = (0.5 - THREE.MathUtils.clamp(throttle, 0, 1)) * 0.9;
    this.flapLever.rotation.z = -(1.75 + THREE.MathUtils.clamp(flaps, 0, 1) * 1.05) + Math.PI / 2;
    // instrument lighting: the dials, the screen and the panel legends glow after dusk
    this.panelMat.emissiveIntensity = 0.1 + 1.3 * glow;
    this.instMat.emissiveIntensity = 0.15 + 1.4 * glow;
    this.gpsMat.emissiveIntensity = 0.55 + 1.2 * glow;
    this.canvasAcc += dt;
    this.setInstruments(telemetry, rpm, throttle);
  }

  /** Gauge readings from the flight state (deterministic: everything derives from the telemetry). */
  private setInstruments(t: FlightTelemetry | null, rpm01: number, throttle: number): void {
    const A = this.instAngle.value, S = this.instShift.value;
    const G = GAUGES, s = this.gaugeState;
    const kt = t ? t.airspeed * 1.9438 : 0, ft = t ? t.altitude * 3.2808 : 0, fpm = t ? t.verticalSpeed * 196.85 : 0;
    const hdg = t ? t.heading : 0, bank = t ? t.bank : 0, pitch = t ? t.pitchAngle : 0, beta = t ? t.beta : 0;
    const V = t ? Math.max(t.airspeed, 15) : 15;
    // coordinated turn rate for the turn coordinator: standard rate (3 deg/s) puts the wing on the mark
    const turnRate = t && !t.onWater && !t.onGround ? (9.81 * Math.tan(bank) / V) / DEG : 0;
    const rpmVal = 600 + rpm01 * 2000;
    const map = THREE.MathUtils.clamp(11 + 19 * throttle - (t ? t.altitude : 0) / 300, 10, 35);
    s.kt = kt; s.ft = ft; s.fpm = fpm; s.hdg = hdg; s.bankDeg = bank / DEG; s.pitchDeg = pitch / DEG; s.rpm = rpmVal; s.map = map; s.turnRateDps = turnRate; s.slip = beta;
    A[CH.fixed] = 0;
    A[CH.asi] = -DIAL.asi(kt) * DEG;
    A[CH.adi] = bank; A[CH.adiBank] = bank;
    S[CH.adi * 2] = 0; S[CH.adi * 2 + 1] = -THREE.MathUtils.clamp(pitch / DEG, -25, 25) * (G.adi.r / 30);
    A[CH.alt100] = -DIAL.alt100(ft) * DEG;
    A[CH.alt1000] = -DIAL.alt1000(ft) * DEG;
    A[CH.tc] = -THREE.MathUtils.clamp(turnRate / 3, -1.6, 1.6) * 20 * DEG;
    const ballX = THREE.MathUtils.clamp(beta * 5, -1, 1) * 0.36 * G.tc.r;
    S[CH.tcBall * 2] = ballX; S[CH.tcBall * 2 + 1] = (ballX * ballX) / (2.3 * G.tc.r);
    A[CH.hdg] = hdg * DEG;
    A[CH.vsi] = -DIAL.vsi(fpm) * DEG;
    A[CH.rpm] = -DIAL.rpm(rpmVal) * DEG;
    A[CH.map] = -DIAL.map(map) * DEG;
    A[CH.oilp] = -DIAL.small(rpm01 > 0.05 ? 0.55 + 0.25 * rpm01 : 0) * DEG;
    A[CH.oilt] = -DIAL.small(0.35 + 0.35 * rpm01) * DEG;
    A[CH.egt] = -DIAL.small(0.15 + 0.6 * rpm01) * DEG;
    A[CH.fuell] = -DIAL.small(0.62) * DEG;
    A[CH.fuelr] = -DIAL.small(0.57) * DEG;
    // the moving map is a canvas: redraw at most 15 times per simulated second, and only when its numbers change
    if (this.canvasAcc >= CANVAS_PERIOD) {
      this.canvasAcc = 0;
      this.gps.draw(t ? t.groundSpeed * 1.9438 : 0, hdg, ft, fpm);
    }
  }

  /** current gauge readings (display units) for verification against the HUD */
  debugGauges(): typeof this.gaugeState { return { ...this.gaugeState }; }
}
