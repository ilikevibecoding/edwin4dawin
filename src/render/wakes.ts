import * as THREE from 'three';
import { clamp, smoothstep } from '../core/noise';

/** tan(19.47 deg): half-angle of the Kelvin wake envelope */
const TAN_KELVIN = 0.3536;

/**
 * Top-down render targets holding foam (R) and surface slope (GB, 0.5 = flat) for boat and float wakes.
 * Anything that disturbs the water is a ribbon of the shared WakeBatch (one draw per map):
 *  - the far map covers a few kilometres around the camera at ~1.6 m per texel (boat wakes from altitude),
 *  - the near map covers the water around the aircraft at a few centimetres per texel, so the bow wave,
 *    waterline foam and fresh float wake survive the close aircraft views instead of blurring into a smear.
 * The water shader samples the near map where it is defined and the far map elsewhere.
 */
export class WakeMap {
  readonly rt: THREE.WebGLRenderTarget;
  readonly nearRt: THREE.WebGLRenderTarget;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly nearCamera: THREE.OrthographicCamera;
  readonly center = new THREE.Vector2();
  readonly nearCenter = new THREE.Vector2();
  readonly size: number;
  readonly nearSize: number;
  private readonly texel: number;
  private readonly nearTexel: number;
  /** every wake ribbon (boats, floats) in one draw; trails are created with it as their target */
  readonly batch = new WakeBatch();

  constructor(resolution = 1024, size = 3200, nearResolution = 1024, nearSize = 64) {
    this.size = size;
    this.nearSize = nearSize;
    this.texel = size / resolution;
    this.nearTexel = nearSize / nearResolution;
    const make = (res: number, mips: boolean) => {
      const rt = new THREE.WebGLRenderTarget(res, res, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: mips });
      rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
      return rt;
    };
    // the far map is minified from altitude (a texel-wide arm falls between pixel centres and reads as a dashed
    // line without mipmaps); the near map is only ever magnified
    this.rt = make(resolution, true);
    this.nearRt = make(nearResolution, false);
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 400);
    this.camera.up.set(0, 0, -1);
    this.nearCamera = new THREE.OrthographicCamera(-nearSize / 2, nearSize / 2, nearSize / 2, -nearSize / 2, 1, 400);
    this.nearCamera.up.set(0, 0, -1);
    this.scene.add(this.batch.mesh);
  }

  get texture(): THREE.Texture { return this.rt.texture; }
  get nearTexture(): THREE.Texture { return this.nearRt.texture; }

  /** Render both maps: the far one around the camera, the near one around (nearX, nearZ), the aircraft. */
  render(renderer: THREE.WebGLRenderer, camX: number, camZ: number, nearX = camX, nearZ = camZ): void {
    this.batch.upload();
    this.center.set(Math.round(camX / 8) * 8, Math.round(camZ / 8) * 8);
    const nt = this.nearTexel;
    this.nearCenter.set(Math.round(nearX / nt) * nt, Math.round(nearZ / nt) * nt);
    const prev = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x008080, 0);
    this.pass(renderer, this.rt, this.camera, this.center, this.texel);
    this.pass(renderer, this.nearRt, this.nearCamera, this.nearCenter, nt);
    renderer.setClearColor(prevClear, prevAlpha);
    renderer.setRenderTarget(prev);
  }

  private pass(renderer: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, cam: THREE.OrthographicCamera, c: THREE.Vector2, texel: number): void {
    cam.position.set(c.x, 200, c.y);
    cam.lookAt(c.x, 0, c.y);
    cam.updateMatrixWorld();
    this.batch.setTexel(texel);
    renderer.setRenderTarget(rt);
    renderer.clear(true, false, false);
    renderer.render(this.scene, cam);
  }
}

/**
 * Wake ribbon shader. The ribbon of a hull runs from a little ahead of its bow to the end of its trail;
 * per vertex it carries the distance behind the transom (negative over the hull), the ribbon half-width,
 * the travel direction, age, side, fade and the speed at emission; per trail the strength, the hull's
 * half-beam, the transom-to-bow length and the length over which the turbulent lane dies out.
 * Output: r = foam, gb = surface gradient (0.5 flat), a = coverage.
 *
 * Behind the transom: a turbulent centre lane about a beam wide (widening slowly, brightest in the first
 * hull lengths, dying over the lane length with noise breakup) between the two diverging arms of the
 * Kelvin pattern, each a foam-streaked crest at 19.5 deg from the track that widens with distance, plus
 * the transverse stern waves (wavelength 2 pi v^2 / g) as slope only. Over the hull: a waterline meniscus
 * hugging the hull outline and the bow wave, a crest wrapping the stem and sweeping aft along the forward
 * hull, with a foam lip once the hull moves at a few metres per second.
 */
export const WAKE_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    attribute vec4 aA;      // age (0 fresh .. 1 old), side (-1 .. 1 across), fade (0 at a gap), speed (m/s)
    attribute vec4 aGeom;   // distance behind the transom (m), ribbon half-width (m), travel direction xz
    attribute vec4 aTrail;  // strength, hull half-beam (m), transom-to-bow length (m), lane length (m)
    varying vec4 vA; varying vec4 vGeom; varying vec2 vWp; flat varying vec4 vTrail;
    void main() { vA = aA; vGeom = aGeom; vTrail = aTrail; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying vec4 vA; varying vec4 vGeom; varying vec2 vWp; flat varying vec4 vTrail;
    uniform float uTexel;   // metres per texel of the map being rendered
    const float TANK = ${TAN_KELVIN};
    const float COSK = 0.9428, SINK = 0.3333;
    // lattice hash without sin(): the sin-based hash loses its precision on world coordinates in the
    // thousands and turned into per-texel static in the centimetre map (a 1 km period keeps the input small)
    float h21(vec2 q) { q = mod(q, 1024.0); vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    // waterline half-beam of a hull at 'ax' metres behind its bow (fullest a little aft of midships)
    float hullHalfBeam(float ax, float w0, float len) {
      float u = clamp(ax / len, 0.0, 1.0);
      float bow = 1.0 - pow(1.0 - smoothstep(0.0, 0.55, u), 1.6);
      float stern = 1.0 - 0.35 * smoothstep(0.7, 1.0, u);
      return w0 * bow * stern;
    }
    void main() {
      float age = vA.x, side = vA.y, fade = vA.z, speed = vA.w;
      float d = vGeom.x, hw = max(vGeom.y, 1e-3);
      vec2 fwd = normalize(vGeom.zw);
      vec2 right = vec2(-fwd.y, fwd.x);           // side +1 of the ribbon
      float strength = vTrail.x, w0 = vTrail.y, lead = vTrail.z;
      // the churned lane lasts a few tens of seconds of foam, so its length scales with the speed it was laid at
      float laneLen = vTrail.w * clamp(speed / 8.0, 0.5, 1.6);
      float y = side * hw;                         // signed metres across the track
      float ay = abs(y);
      float s = sign(side);
      float life = 1.0 - age;
      float spd = smoothstep(0.6, 5.0, speed);     // how hard the hull is pushing water
      float fine = 1.0 - smoothstep(0.25, 1.2, uTexel);   // 1 in the centimetre map, 0 in the metre map
      // world-anchored breakup so foam reads as churned patches, never a chalk line
      // the finer octaves never go below ~3 texels of the map being rendered (sub-texel noise samples into
      // dashes and dots along the arms in the coarse map)
      float n1 = vn(vWp * 0.35), n2 = vn(vWp * min(1.3, 0.35 / uTexel) + 4.0), n3 = vn(vWp * min(3.1, 0.35 / uTexel) + 11.0);
      float breakup = 0.35 + 0.65 * n1 * (0.6 + 0.8 * n2);
      float foam = 0.0;
      vec2 g = vec2(0.0);
      float cover = 0.0;
      if (d >= 0.0) {
        // ---- turbulent lane behind the transom: a beam wide at the transom, spreading like a turbulent wake
        //      (with the square root of the distance) while its foam thins as it spreads
        float laneHalf0 = w0 * 1.05;
        float laneHalf = laneHalf0 + 0.45 * sqrt(d * max(w0, 0.15));
        // drawn at least a texel wide (a speedboat's lane is narrower than a far-map texel) with the foam spread
        // over the wider band so the streak keeps its brightness seen from altitude
        float laneHalfR = max(laneHalf, 0.9 * uTexel);
        float laneMask = 1.0 - smoothstep(laneHalfR * 0.45, laneHalfR, ay);
        float laneFade = 1.0 - smoothstep(0.0, laneLen, d);
        float fresh = exp(-d / (10.0 * w0 + 6.0));
        // churned patches scaled to the lane (a float's lane is patchy at 30 cm, a ship's at metres), streaked
        // along the track, on top of the coarse world breakup; the hard-edged streaks only where the map
        // resolves them (in the coarse map they would sample into a dotted line)
        float ls = 1.0 / max(laneHalf, 0.3);
        float nl = vn(vec2(dot(vWp, fwd) * min(ls * 0.3, 0.35 / uTexel), dot(vWp, right) * min(ls * 1.4, 0.35 / uTexel)) + 3.0);
        float streaks = mix(0.3 + 0.7 * nl, smoothstep(0.3, 0.85, nl), fine);
        float grain = mix(breakup * (0.25 + 1.2 * streaks), 0.6 + 0.6 * streaks * (0.8 + 0.2 * n3), fresh);
        float lane = laneMask * laneFade * grain * (0.85 + 0.9 * fresh) * (0.15 + 0.85 * spd) * pow(laneHalf0 / laneHalf, 0.2) * (laneHalf / laneHalfR);
        // ---- Kelvin arms: crest lines at 19.5 deg from the track, thickening and fading with distance
        float armLen = laneLen * 2.5;
        float armY = w0 * 0.8 + (d + lead) * TANK;
        // never thinner than a texel of the map being rendered (a sub-texel line samples into dots); the foam
        // is spread over the wider line so its total stays the same seen from altitude
        float armW0 = 0.45 + 0.3 * w0 + 0.012 * d;
        float armW = max(armW0, 0.8 * uTexel);
        float dy = ay - armY;
        float armEnv = 1.0 - smoothstep(armLen * 0.45, armLen, d);
        float armBump = exp(-dy * dy / (armW * armW));
        // the arms are glassy crests at taxi speed and only carry broken foam streaks once the bow wave breaks
        // (a few metres per second); none on the first metres where the arm is still inside the hull's bow wave
        float sn = vn(vec2(dot(vWp, fwd) * min(0.5, 0.35 / uTexel), dot(vWp, right) * min(1.5, 0.35 / uTexel)) + 7.0);
        // in the coarse map the modulation stays shallow: a texel-wide line modulated by half its depth is a
        // dashed line from altitude
        float streak = mix(0.85 + 0.15 * sn * n2, (0.3 + 0.7 * smoothstep(0.3, 0.8, sn)) * (0.5 + 0.5 * n2), fine);
        float arm = armBump * armEnv * streak * smoothstep(0.8, 2.0, speed) * (0.5 + 0.5 * smoothstep(2.5, 8.5, speed)) * smoothstep(-lead * 0.5, lead * 0.5, d) * (armW0 / armW);
        // from altitude the arms are mostly glassy lines beside a white lane, so they carry less foam there
        foam = lane * 1.0 + arm * mix(0.35, 0.8, fine);
        // arm crest slope: a raised crest, outward normal of the arm line
        vec2 armOut = s * right * COSK + fwd * SINK;
        float crestSlope = -2.0 * dy / (armW * armW) * armBump * (0.05 + 0.05 * spd) * armEnv * min(armW / uTexel, 1.0);
        g += armOut * crestSlope;
        // transverse stern waves: crests across the track, wavelength 2 pi v^2 / g, decaying down the lane
        float lam = max(6.2832 * speed * speed / 9.81, 0.5);
        float tw = smoothstep(2.0 * uTexel, 4.0 * uTexel, lam) * exp(-d / (laneLen * 0.6)) * (1.0 - smoothstep(laneHalf * 1.2, laneHalf * 3.0, ay)) * spd;
        g += -fwd * (0.07 * tw * sin(6.2832 * d / lam));
        cover = max(max(laneMask * laneFade, armBump * armEnv), min(foam * 3.0, 1.0)) * 0.9 + 0.1;
      } else {
        // ---- hull zone: ax metres behind the bow (negative ahead of the stem)
        float ax = lead + d;
        float hb = hullHalfBeam(ax, w0, lead);
        float insideX = step(0.0, ax) * step(ax, lead);
        float outside = ax < 0.0 ? length(vec2(ax * 1.4, ay)) : (ax > lead ? length(vec2(ax - lead, max(ay - hb, 0.0))) : max(ay - hb, 0.0));
        float inside = insideX * max(hb - ay, 0.0);
        // meniscus: a soft bright line hugging the waterline, fed by the bow wave and thinning aft
        float bowT = 1.0 - smoothstep(0.0, lead * 0.6, ax);
        float lw0 = (0.06 + 0.08 * spd) * (0.5 + 0.5 * bowT) + 0.02 * w0;
        float lw = max(lw0, 0.6 * uTexel);
        float meniscus = exp(-outside * outside / (lw * lw)) * (0.35 + 0.4 * bowT) * (0.5 + 0.7 * n3) * (0.3 + 0.7 * spd) * (lw0 / lw);
        // bow wave: a crest line wrapping the stem and diverging aft along the forward hull at ~20 deg plus the
        // hull's flare; it stops growing at hull speed and the whole hull zone dies away as a planing hull lifts
        // its bow clear
        float sp = min(speed, 9.0);
        float planing = smoothstep(11.0, 19.0, speed);
        float bowLift = 0.12 + 0.09 * sp;
        float c = bowLift + max(ax, 0.0) * 0.27 + hb;
        float cx = ax < 0.0 ? sqrt(ax * ax + ay * ay) : ay;     // ahead of the stem the crest is round
        float dc = ax < 0.0 ? cx - bowLift : ay - c;
        float bowW0 = 0.18 + 0.05 * sp + 0.04 * w0;
        float bowW = max(bowW0, 0.7 * uTexel);
        float bowReach = 1.0 - smoothstep(lead * 0.25, lead * 0.65, ax);
        float bowBump = exp(-dc * dc / (bowW * bowW)) * bowReach * smoothstep(0.8, 3.5, speed);
        float lip = bowBump * (0.5 + 0.8 * n3) * (0.35 + 0.65 * smoothstep(1.5, 5.0, speed)) * (bowW0 / bowW);
        // the hull covers the inside: fade there so nothing shows through a gap at bow or stern
        float coverage = (1.0 - smoothstep(0.0, 0.08, inside)) * (1.0 - 0.85 * planing);
        foam = (meniscus + lip * 0.75) * coverage;
        // crest slope of the bow wave (raised toward the hull side of the crest)
        vec2 outDir = ax < 0.0 ? normalize(vec2(-fwd * ax + s * right * ay)) : s * right;
        float slope = -2.0 * dc / (bowW * bowW) * bowBump * (0.1 + 0.05 * spd) * bowW;
        g += outDir * slope * coverage;
        cover = coverage * max(exp(-outside * 3.0), bowBump);
      }
      // ribbon edge softening (no hard rectangle edges in the map)
      float edge = 1.0 - smoothstep(0.9, 1.0, abs(side));
      foam *= life * life * edge * strength * fade;
      g *= life * edge * fade;
      vec2 enc = clamp(g, -0.5, 0.5);
      gl_FragColor = vec4(clamp(foam, 0.0, 1.0), 0.5 + enc.x, 0.5 + enc.y, clamp(cover * life * edge * fade, 0.0, 1.0));
    }
  `,
  uniforms: { uTexel: { value: 1.56 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});

/** Contrail ribbon drawn in the main scene: soft white, fading with age, slightly hazy. */
export const CONTRAIL_MATERIAL = new THREE.ShaderMaterial({
  // drawn in the main scene: must write/compare log depth like every other material there
  vertexShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    attribute vec4 aA;
    varying float vAge; varying float vSide; varying float vFade;
    void main() {
      vAge = aA.x; vSide = aA.y; vFade = aA.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide; varying float vFade;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge) * vFade;
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,
  uniforms: { uStrength: { value: 0.7 } },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/**
 * Every wake ribbon of the wake maps in one draw. Each trail keeps its own ribbon arrays; before the maps
 * are rendered the batch copies the live vertices of every trail, in the order the trails were added,
 * into shared buffers and builds the index for the quads that exist this frame.
 */
export class WakeBatch {
  readonly mesh: THREE.Mesh;
  private readonly trails: WakeTrail[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private capacity = 0;
  private positions = new Float32Array(0);
  private a = new Float32Array(0);
  private geom = new Float32Array(0);
  private trail = new Float32Array(0);
  private index = new Uint32Array(0);

  constructor() {
    this.material = WAKE_MATERIAL.clone();
    this.geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  setTexel(t: number): void { this.material.uniforms.uTexel.value = t; }

  add(trail: WakeTrail): void {
    this.trails.push(trail);
    this.capacity += trail.capacity + 4;
  }

  /** Gather the ribbons of every trail into the shared buffers. */
  upload(): void {
    if (this.positions.length !== this.capacity * 6) this.allocate();
    let v = 0, n = 0;
    const { positions, a, geom, trail, index } = this;
    for (const t of this.trails) {
      const pts = t.count;
      if (pts === 0) continue;
      const verts = pts * 2;
      positions.set(t.positions.subarray(0, verts * 3), v * 3);
      a.set(t.a.subarray(0, verts * 4), v * 4);
      geom.set(t.geom.subarray(0, verts * 4), v * 4);
      for (let i = v; i < v + verts; i++) { trail[i * 4] = t.strength; trail[i * 4 + 1] = t.halfWidth; trail[i * 4 + 2] = t.lead; trail[i * 4 + 3] = t.laneLen; }
      for (let i = 0; i < pts - 1; i++) {
        const q = v + i * 2, b = q + 1, c = q + 2, e = q + 3;
        index[n++] = q; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = e;
      }
      v += verts;
    }
    const g = this.geo;
    for (const name of ['position', 'aA', 'aGeom', 'aTrail']) {
      const attr = g.getAttribute(name) as THREE.BufferAttribute;
      attr.clearUpdateRanges();
      if (v > 0) attr.addUpdateRange(0, v * attr.itemSize);
      attr.needsUpdate = true;
    }
    const idx = g.index!;
    idx.clearUpdateRanges();
    if (n > 0) idx.addUpdateRange(0, n);
    idx.needsUpdate = true;
    g.setDrawRange(0, n);
  }

  private allocate(): void {
    const cap = this.capacity;
    this.positions = new Float32Array(cap * 6);
    this.a = new Float32Array(cap * 8);
    this.geom = new Float32Array(cap * 8);
    this.trail = new Float32Array(cap * 8);
    this.index = new Uint32Array(Math.max(6, cap * 6));
    const g = this.geo;
    g.dispose();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aGeom', new THREE.BufferAttribute(this.geom, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTrail', new THREE.BufferAttribute(this.trail, 4).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage));
  }
}

interface TrailPoint { x: number; z: number; dx: number; dz: number; t: number; fade: number; speed: number; }

/**
 * Fixed-capacity ribbon following an emitter. Positions are in world space. Standalone trails (contrails,
 * wingtip vortices in the main scene) own a mesh; trails given a WakeBatch are drawn by it as wakes and
 * carry the wake geometry: the ribbon widens with the distance behind the emitter along the Kelvin
 * envelope while the arms last, and a live head runs from the emitter (the transom) forward over the hull
 * to just ahead of the bow so the map also holds the bow wave and waterline of the hull itself.
 */
export class WakeTrail {
  /** null for a batched trail */
  readonly mesh: THREE.Mesh | null = null;
  readonly capacity: number;
  /** foam strength multiplier of the trail */
  strength: number;
  /** hull half-beam (wakes) or ribbon half-width (contrails), m */
  readonly halfWidth: number;
  /** transom-to-bow length of the hull (wakes) */
  readonly lead: number;
  /** distance over which the turbulent lane dies out */
  readonly laneLen: number;
  readonly positions: Float32Array;
  readonly a: Float32Array;
  readonly geom: Float32Array;
  /** live points (vertices = 2 * count, quads = count - 1) */
  count = 0;
  private readonly points: TrailPoint[] = [];
  private lastX = NaN;
  private lastZ = NaN;
  /** points still to emit at reduced strength after a trail start or a gap */
  private ramp = 0;
  private readonly geo: THREE.BufferGeometry | null = null;
  private readonly wake: boolean;
  /** emission spacing (m); a slow emitter is sampled every spacing metres, a fast one every quarter second */
  private readonly spacing: number;

  constructor(capacity: number, halfWidth: number, private lifetime: number, strength = 1, target: THREE.ShaderMaterial | WakeBatch = CONTRAIL_MATERIAL, lead = 0, spacing = 2) {
    this.capacity = capacity;
    this.strength = strength;
    this.halfWidth = halfWidth;
    this.lead = lead;
    this.spacing = spacing;
    this.laneLen = clamp(60 + halfWidth * 50, 80, 300);
    this.wake = target instanceof WakeBatch;
    // extra vertex pairs for the live head of a wake ribbon (gap markers, transom, bow)
    const slots = capacity + 4;
    this.positions = new Float32Array(slots * 2 * 3);
    this.a = new Float32Array(slots * 2 * 4);
    this.geom = new Float32Array(slots * 2 * 4);
    if (target instanceof WakeBatch) { target.add(this); return; }
    const idx: number[] = [];
    for (let i = 0; i < slots - 1; i++) {
      const q = i * 2, b = q + 1, c = q + 2, e = q + 3;
      idx.push(q, c, b, b, c, e);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aA', new THREE.BufferAttribute(this.a, 4));
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    const mat = target.clone();
    mat.uniforms.uStrength.value = strength;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Ribbon half-width at distance d behind the transom: the Kelvin envelope (arm crest plus its skirt) while
   *  the arms show, narrowing to the turbulent lane once the shader has faded them out. */
  private wakeHalf(d: number): number {
    const w0 = this.halfWidth;
    const lane = (w0 * 1.05 + 0.45 * Math.sqrt(Math.max(d, 0) * Math.max(w0, 0.15))) * 1.15;
    const armLen = this.laneLen * 2.5 * 1.6;   // the shader's arm length at the fastest speed factor
    const armY = w0 * 0.8 + (d + this.lead) * TAN_KELVIN + (0.45 + 0.3 * w0 + 0.012 * d) * 3.0;
    const env = 1 - smoothstep(armLen, armLen * 1.15, d);
    // never narrower than the far map's texel-wide minimum lane
    return Math.max(lane, armY * env, 2.0);
  }

  /** A jump longer than this between samples is the emitter leaving the water and coming back, not motion
   *  along it; it must stay well above the emission spacing (a ship samples every 12 m) or every sample of a
   *  large hull would read as a gap and chop its ribbon into invisible pieces. */
  private gapDist(speed: number): number {
    return Math.max(12, speed * 1.5, this.spacing * 3);
  }

  /** Pull point i toward the midpoint of its neighbours: the emitter (a float on a rolling, yawing hull, a boat
   *  in waves) wanders a few centimetres between samples and, drawn at centimetre texels, that made the lane
   *  centreline a zigzag with the sample period instead of the smooth track water actually keeps. */
  private relax(i: number): void {
    const pts = this.points;
    if (i < 1 || i >= pts.length - 1) return;
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    if (a.fade === 0 || p.fade === 0 || b.fade === 0) return;
    p.x = 0.5 * p.x + 0.25 * (a.x + b.x);
    p.z = 0.5 * p.z + 0.25 * (a.z + b.z);
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    if (l > 1e-6) { p.dx = dx / l; p.dz = dz / l; }
  }

  private writeVertexPair(i: number, x: number, z: number, dx: number, dz: number, w: number, age: number, fade: number, speed: number, dist: number): void {
    const nx = -dz * w, nz = dx * w;
    const p = this.positions, a = this.a, g = this.geom;
    p[i * 6] = x - nx; p[i * 6 + 1] = 0.05; p[i * 6 + 2] = z - nz;
    p[i * 6 + 3] = x + nx; p[i * 6 + 4] = 0.05; p[i * 6 + 5] = z + nz;
    for (let k = 0; k < 2; k++) {
      const v = (i * 2 + k) * 4;
      a[v] = age; a[v + 1] = k === 0 ? -1 : 1; a[v + 2] = fade; a[v + 3] = speed;
      g[v] = dist; g[v + 1] = w; g[v + 2] = dx; g[v + 3] = dz;
    }
  }

  /**
   * Call every frame with the emitter's world position and travel direction (xz, need not be normalised).
   * `active` false lets the trail fade out and hides the hull head; `speed` in m/s.
   */
  update(x: number, z: number, dx: number, dz: number, time: number, active: boolean, speed: number): void {
    const RAMP = 2;
    const dl = Math.hypot(dx, dz);
    if (dl > 1e-6) { dx /= dl; dz /= dl; } else { dx = 1; dz = 0; }
    const fresh = Number.isNaN(this.lastX);
    const dist = fresh ? 0 : Math.hypot(x - this.lastX, z - this.lastZ);
    if (active && (fresh || dist > Math.max(this.spacing, speed * 0.25))) {
      let pdx = dx, pdz = dz;
      if (!fresh) { const l = dist || 1; pdx = (x - this.lastX) / l; pdz = (z - this.lastZ) / l; }
      // the emitter left the surface (bounce, skip, take-off) and came back: close the old ribbon with a
      // zero-length invisible quad and start a new one here instead of bridging the gap with foam
      const gap = !fresh && dist > this.gapDist(speed);
      if (gap) {
        // two invisible markers (at the old end and at the new start) so the bridging quad carries no foam
        const last = this.points[this.points.length - 1];
        if (last) { this.points.push({ ...last, fade: 0 }); this.points.push({ ...last, x, z, dx: pdx, dz: pdz, t: time, fade: 0 }); }
      }
      if (fresh || gap) this.ramp = RAMP;
      if (fresh && this.wake && speed > 1) {
        // an emitter placed already under way (a boat spawned on its route, the aircraft set up taxiing) has
        // been moving for a while: seed the trail it would have left along its track behind it
        const step = Math.max(this.spacing, speed * 0.25);
        const nBack = Math.min(this.capacity - 1, Math.floor(Math.min(this.lifetime * 0.6, 60) * speed / step));
        for (let i = nBack; i >= 1; i--) this.points.push({ x: x - dx * step * i, z: z - dz * step * i, dx, dz, t: time - (step * i) / speed, fade: 1, speed });
        this.ramp = 0;
      }
      const fade = this.ramp > 0 ? 1 - this.ramp-- / (RAMP + 1) : 1;
      // the first point of a ribbon had no motion to take its direction from: align it with the second
      const prev = this.points[this.points.length - 1];
      if (prev && !gap && prev.fade > 0) {
        const before = this.points[this.points.length - 2];
        if (!before || before.fade === 0) { prev.dx = pdx; prev.dz = pdz; }
      }
      this.points.push({ x, z, dx: pdx, dz: pdz, t: time, fade, speed });
      if (this.wake) this.relax(this.points.length - 2);
      while (this.points.length > this.capacity) this.points.shift();
      this.lastX = x; this.lastZ = z;
    }
    // drop expired
    while (this.points.length && time - this.points[0].t > this.lifetime) this.points.shift();
    const n = this.points.length;
    // a fast emitter fills the point buffer long before its oldest point expires: the oldest third of the
    // buffer ages out by position as well once the buffer is (nearly) full, so every trail tail fades
    const tailSpan = Math.max(1, Math.floor(this.capacity * 0.35));
    const full = smoothstep(0.6, 1.0, n / this.capacity);
    if (!this.wake) {
      for (let i = 0; i < n; i++) {
        const p = this.points[i];
        const tailAge = full * (1 - Math.min(1, (i + 0.5) / tailSpan));
        const age = Math.min(1, Math.max((time - p.t) / this.lifetime, tailAge));
        this.writeVertexPair(i, p.x, p.z, p.dx, p.dz, this.halfWidth * (0.6 + 1.8 * age), age, p.fade, p.speed, 0);
      }
      this.count = n;
      const geo = this.geo!;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aA.needsUpdate = true;
      geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
      return;
    }
    // wake ribbon: distances behind the emitter, accumulated from the newest point
    const head = active;
    let d = head ? Math.hypot(x - (n ? this.points[n - 1].x : x), z - (n ? this.points[n - 1].z : z)) : 0;
    for (let i = n - 1; i >= 0; i--) {
      const p = this.points[i];
      if (i < n - 1) { const q = this.points[i + 1]; d += Math.hypot(q.x - p.x, q.z - p.z); }
      const tailAge = full * (1 - Math.min(1, (i + 0.5) / tailSpan));
      const age = Math.min(1, Math.max((time - p.t) / this.lifetime, tailAge));
      this.writeVertexPair(i, p.x, p.z, p.dx, p.dz, this.wakeHalf(d), age, p.fade, p.speed, d);
    }
    let count = n;
    if (head) {
      // live head: transom pair at the emitter, then the bow pair ahead of the stem; a gap point just before
      // the head (emitter back on the water this frame) keeps the head from bridging to the old ribbon
      const last = n ? this.points[n - 1] : null;
      const w = this.wakeHalf(0);
      const bridge = last && (last.fade === 0 || Math.hypot(x - last.x, z - last.z) > this.gapDist(speed));
      if (bridge && last) {
        // invisible markers at both ends of the bridging quad
        this.writeVertexPair(count++, last.x, last.z, last.dx, last.dz, w, 0, 0, speed, 0);
        this.writeVertexPair(count++, x, z, dx, dz, w, 0, 0, speed, 0);
      }
      const bowMargin = 0.6 + 0.15 * speed + 0.4 * this.halfWidth;
      this.writeVertexPair(count, x, z, dx, dz, w, 0, 1, speed, 0);
      const hx = x + dx * (this.lead + bowMargin), hz = z + dz * (this.lead + bowMargin);
      this.writeVertexPair(count + 1, hx, hz, dx, dz, w, 0, 1, speed, -(this.lead + bowMargin));
      count += 2;
    }
    this.count = count;
  }

  reset(): void {
    this.points.length = 0;
    this.lastX = NaN; this.lastZ = NaN;
    this.ramp = 0;
    this.count = 0;
    this.geo?.setDrawRange(0, 0);
  }
}
