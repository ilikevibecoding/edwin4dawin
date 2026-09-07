import * as THREE from 'three';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Live door mirrors.
//
// From outside the truck at `fast` the mirror face is a flat metal on the
// scene's PMREM with an analytic horizon graded under it
// (`materials.mirrorGlass`), which from three metres is a plausible pane. At
// `high` and `ultra` each main pane is a real mirror within six metres: the
// scene is rendered into a small target from the camera's reflection in the
// pane's plane, and the pane shows that. From the seats the pane is live at
// every tier (round 7): the glass gauntlet's `mirror` view had the painted
// plate a metre from the eye — a dune horizon, one acacia and a bare plain
// where the window beside it showed a hill ridge over straw — and all three
// round-5 critics read it as a plate. At `fast` the pass runs only for a
// camera inside the cab volume within 1.5 m of the pane, into a 120 x 160
// target, so the exterior views keep the plate and pay nothing.
//
// What keeps it cheap:
//
//  - The reflection camera's frustum is fitted to the pane. Three's `Reflector`
//    mirrors the whole camera frustum and then projects the pane's corner of it
//    back onto the pane, so a 136 mm mirror seen from 3 m gets a few dozen
//    texels of a full-frame pass. Here the near plane *is* the pane rectangle
//    (an off-axis `makePerspective`), so every texel of the target lands on the
//    glass and the lookup is the pane's own uv. The eye is imaged the way the
//    convex glass images it (see the pass), so the frustum is the pane's own
//    field — some fifty degrees from the seat — and culling still throws away
//    most of the scene before it is drawn: what survives is the sky, the
//    terrain, the trees, the far swaths and the truck's own flank, which is
//    what a door mirror shows.
//  - One pane renders per frame, alternating sides, so each mirror updates
//    every second frame. A pane only renders at all while the camera is within
//    `NEAR` metres of it (which is also every interior camera); beyond that the
//    pane goes back to the env-map material and nothing is rendered.
//  - The target is 192 x 224 at half float (120 x 160 at `fast`), no
//    multisample. Shadow maps are not re-rendered for the pass.
//  - The near ground cover stays out of it. The forest scatters its grass,
//    scrub, forbs and litter as some five hundred instanced buckets whose
//    bounds are tens of metres across, so a third of them survive even a five
//    degree frustum test and were two thirds of the pass's draw calls
//    (measured: 234 of 321) for a texel or two of colour the terrain under
//    them already carries. The light shafts and the cabin interior (behind
//    near-black glass, never in a door mirror) go with them. Trees, rocks,
//    the camp, the truck's own flank and the mid-distance swaths all stay:
//    the swaths are the straw plain from 16 m out, four buckets of cards, and
//    without them the pane's plain was bare where the window beside it
//    showed straw (round 7).
//
// The render happens inside the pane's own `onBeforeRender`, the way
// `Reflector` does it, so it costs nothing while the pane is culled or the
// scene is being drawn with an override material (the AO g-buffer and SSR
// passes both do that, and both bail here).
// ---------------------------------------------------------------------------

const QUALITY_ALIAS = { low: 'fast', fast: 'fast', high: 'high', ultra: 'ultra' };
// The target, per tier. The `fast` pane is only ever seen from the seat, where
// it is a hundred pixels tall at 640 x 360, and 120 x 160 texels (the brief's
// 160 x 120 turned to the pane's own portrait) cover that.
const RT_SIZE = { fast: [120, 160], high: [192, 224], ultra: [192, 224] };
// Camera within `near` of the pane: live; back to the env-map past `far`. At
// `fast` the range is the cab's own — a seat camera to its door mirror is 1.27 m
// — and the camera must also stand inside the cab volume, so a camera beside
// the truck a metre from the housing (the gauntlet's `side_sun`) keeps the
// plate.
const RANGE = { fast: { near: 1.5, far: 1.7, cab: true }, high: { near: 5.0, far: 6.0, cab: false }, ultra: { near: 5.0, far: 6.0, cab: false } };
// The near plane sits this far past the glass on the world side. The alu and
// gasket lips stand up to 9 mm proud of the pane's base plane and lap its
// edge, so a `Reflector`-style 3 mm clip bias would put their edges in the
// image; 20 mm clips them and nothing the mirror is meant to show is nearer.
const CLIP_BIAS = 0.02;
// what the pass leaves out, by scene-graph name (see the header)
const SKIP_NAME = /^(grass|scrub|forb|litter)_|^shafts$|^cabin_/;
// and at `fast`, where the pass is budgeted at a hundred draw calls on top of
// the seat's frame: things a texel or less across in a 120 x 160 mirror —
// ground litter and outcrops (logs, termite mounds, kopjes, road stones), the
// decals, the panes' 6 mm rims and gaskets, the shut lines, the brakes and
// axles behind the wheels, the lamp lenses and the rack's mesh; then the
// forest's boulders, the camp's fire and worn ground, the roadside posts and
// the wheel nuts and the rims' dark inner (the spokes stay). Measured from
// the seat with the convex field: 133 calls with the lot, 104 without the
// first set, 90 without the second; the swaths (17) stay because they are the
// straw the pane shows.
const SKIP_FAST =
  /^(log|logEnd|termite|kopje|brakes|axles|rock|roadside)_|^(roadStones|fireFlames|fireEmbers|fireSmoke|campWear)$|_(decal\w*|glassEdge|gasket|gap|mesh|reflector|barReflector|headlight|taillight|amber|reverseLamp|reflectorRed|machined|void)(_|$)/;
// A pane re-renders out of turn when its eye has moved this far in the pane's
// own frame: the alternation is for a camera riding with the truck, where the
// eye sits still against the glass and the world moves behind it; a view
// switch would otherwise show the previous camera's reflection for a frame.
const MOVE_EPS = 0.02;
const SKIP_RESCAN = 300; // frames between walks of the scene for new buckets
// post.js keeps its screen-space reflectors on this layer. A pane showing a real
// reflection must not have a second one marched over it, so it leaves the layer
// while it is live and rejoins when it hands back to the env-map material.
const SSR_LAYER = 20;

/** The tier the page booted at, from the same URL parameter main.js reads. */
export function pageQuality() {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? '').get('quality');
    return QUALITY_ALIAS[q] ?? 'high';
  } catch {
    return 'high';
  }
}

/**
 * Whether the tier renders live mirrors at all — at every tier since round 7
 * (`fast` from the seats only, see RANGE). `?mirrors=off` keeps the painted
 * plate everywhere, for the A/B; it also skips the per-pane mesh split, so a
 * frame with it is the round-6 frame.
 */
export function liveMirrorsWanted(quality = pageQuality()) {
  try {
    if (new URLSearchParams(globalThis.location?.search ?? '').get('mirrors') === 'off') return false;
  } catch {
    /* no location: a worker or a test */
  }
  return quality === 'fast' || quality === 'high' || quality === 'ultra';
}

function liveMaterial(texture) {
  const mat = new THREE.ShaderMaterial({
    name: 'mirrorLive',
    uniforms: {
      tMirror: { value: texture },
      // silvered glass returns most of what hits it, cooled a touch by the tint
      uTint: { value: new THREE.Color(0.86, 0.88, 0.9) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    // The reflection camera looks out through the glass with the pane's +u to
    // its left, so the image is mirrored across u here; that is the one flip a
    // mirror has to have. The target is linear HDR like the main pass it is
    // drawn into, so no colour-space work.
    fragmentShader: /* glsl */ `
      uniform sampler2D tMirror;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D( tMirror, vec2( 1.0 - vUv.x, vUv.y ) ).rgb;
        gl_FragColor = vec4( c * uTint, 1.0 );
      }`,
  });
  return mat;
}

/**
 * The pane's frame from its own geometry. The pane is a `PlaneGeometry` that
 * has been curved, rotated and baked, so its corners are found through the uvs
 * it kept: (0,0), (1,0) and (0,1) are three of them, and the corners lie on the
 * pane's base plane (only the middle bulges).
 */
function paneFrame(geo) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const find = (u, v) => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < uv.count; i++) {
      const d = Math.abs(uv.getX(i) - u) + Math.abs(uv.getY(i) - v);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return new THREE.Vector3().fromBufferAttribute(pos, best);
  };
  const p00 = find(0, 0);
  const p10 = find(1, 0);
  const p01 = find(0, 1);
  const pmid = find(0.5, 0.5);
  const right = p10.clone().sub(p00);
  const up = p01.clone().sub(p00);
  const w = right.length();
  const h = up.length();
  right.normalize();
  up.normalize();
  const centre = p00.clone().addScaledVector(right, w * 0.5).addScaledVector(up, h * 0.5);
  // The pane's radius of curvature, from the bulge of its middle over the
  // corners' plane: a spherical cap of half-chord a and sagitta b has
  // R = (a^2 + b^2) / 2b. Infinity for a flat pane.
  const normal = new THREE.Vector3().crossVectors(right, up).normalize();
  const b = Math.abs(pmid.clone().sub(centre).dot(normal));
  const a = Math.hypot(w, h) * 0.5;
  const radius = b > 1e-5 ? (a * a + b * b) / (2 * b) : Infinity;
  return { centre, right, up, w, h, radius };
}

/**
 * Attach live mirrors to the door-mirror panes under `body`. Returns a handle
 * with the per-pass cost of the last mirror render, for the perf tools.
 */
export function createLiveMirrors(body, materials, { quality = pageQuality() } = {}) {
  const stats = { passes: 0, calls: 0, triangles: 0 };
  const handle = { stats, panes: [], enabled: false, dispose() {} };
  if (!liveMirrorsWanted(quality)) return handle;

  // the main pane a side: the tall one. The spotter under it stays on the
  // env-map, which is what a wide-angle convex spotter looks like anyway.
  const panes = [];
  body.traverse((o) => {
    if (!o.isMesh || !o.name.startsWith('body_mirrorGlass')) return;
    o.geometry.computeBoundingBox();
    const size = o.geometry.boundingBox.getSize(new THREE.Vector3());
    if (Math.max(size.x, size.y, size.z) > 0.12 && size.y > 0.1) panes.push(o);
  });
  if (!panes.length) return handle;
  handle.enabled = true;

  const envMat = materials.mirrorGlass;
  const tier = QUALITY_ALIAS[quality] ?? 'high';
  const range = RANGE[tier] ?? RANGE.high;
  const [RT_W, RT_H] = RT_SIZE[tier] ?? RT_SIZE.high;
  const _eye = new THREE.Vector3();
  const _cabEye = new THREE.Vector3();
  const _inv = new THREE.Matrix4();
  const _c = new THREE.Vector3();
  const _r = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _e2 = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _nm = new THREE.Matrix3();
  let lastFrame = -1;
  let turn = 0;
  let rendering = false;

  // The per-pane live/plate decisions, run from the scene's own hook before
  // the render list is built (see `decide`). The scene is not known until the
  // truck is in one, so the hook is installed on the first pane draw and any
  // hook the scene already had is kept in the chain. The mirror pass's own
  // nested render and the override-material passes (AO, SSR) pass through:
  // neither draws the pane with its own material.
  const deciders = [];
  let hookedScene = null;
  const hookScene = (scene) => {
    if (hookedScene === scene) return;
    hookedScene = scene;
    const prevScene = Object.hasOwn(scene, 'onBeforeRender') ? scene.onBeforeRender : null;
    scene.onBeforeRender = (renderer, sc, camera, ...rest) => {
      if (prevScene) prevScene(renderer, sc, camera, ...rest);
      if (rendering || camera.userData.mirrorCam || sc.overrideMaterial) return;
      for (const d of deciders) d(camera);
    };
  };

  // Is the camera inside the cab? The body's frame is the truck's own, so the
  // cab is an axis-aligned box there: between the door skins, the floor and
  // the roof, the rear wall and the base of the screen. The same volume
  // `index.js` gates the screen's grazing sky on.
  const inCab = (eyeWorld) => {
    _inv.copy(body.matrixWorld).invert();
    _cabEye.copy(eyeWorld).applyMatrix4(_inv);
    return (
      Math.abs(_cabEye.x) < S.bodyHalfWidth &&
      _cabEye.y > S.floorY &&
      _cabEye.y < S.roofY + 0.05 &&
      _cabEye.z > S.cabRearZ &&
      _cabEye.z < S.windshieldBottomZ
    );
  };

  // the exclusion list, re-walked now and then so buckets added after boot are
  // caught; the walk is a couple of thousand nodes and runs once in 300 frames
  const skip = [];
  const hidden = [];
  let skipScanned = -Infinity;
  const skipFast = tier === 'fast';
  const collectSkips = (scene, frameId) => {
    if (frameId - skipScanned < SKIP_RESCAN) return;
    skipScanned = frameId;
    skip.length = 0;
    scene.traverse((o) => {
      if (SKIP_NAME.test(o.name) || (skipFast && SKIP_FAST.test(o.name))) skip.push(o);
    });
  };

  panes.forEach((pane, side) => {
    const frame = paneFrame(pane.geometry);
    const rt = new THREE.WebGLRenderTarget(RT_W, RT_H, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const live = liveMaterial(rt.texture);
    const cam = new THREE.PerspectiveCamera(30, RT_W / RT_H, 0.1, 500);
    cam.matrixAutoUpdate = false;
    cam.matrixWorldAutoUpdate = false;
    cam.userData.mirrorCam = true;
    const state = { far: true, rendered: false, eye: new THREE.Vector3(Infinity, Infinity, Infinity) };

    const setLive = (on) => {
      if (on === !state.far) return;
      state.far = !on;
      pane.material = on ? live : envMat;
      if (on) pane.layers.disable(SSR_LAYER);
      else if (pane.userData.__ssr) pane.layers.enable(SSR_LAYER);
    };
    // Live or plate for this camera. Decided in `scene.onBeforeRender` (below),
    // ahead of the render list: three records each object's material while it
    // projects the scene, before any object's own `onBeforeRender`, so a
    // material swapped there is drawn a frame late — the first frame of a
    // view showed the plate over a pass that had already rendered.
    const decide = (camera) => {
      _c.copy(frame.centre).applyMatrix4(pane.matrixWorld);
      _eye.setFromMatrixPosition(camera.matrixWorld);
      const dist = _eye.distanceTo(_c);
      const on = dist <= (state.far ? range.near : range.far) && (!range.cab || inCab(_eye));
      setLive(on);
      return on;
    };
    deciders.push(decide);

    // The kit's piece split hands each pane's recentring offset to the plate
    // material's object-space shader through this hook (`emitPieces`), so it
    // is kept in the chain: the plate paints the truck's flank by truck-space
    // ray, and without the offset every piece read its own centre as the
    // truck's origin.
    const prev = Object.hasOwn(pane, 'onBeforeRender') ? pane.onBeforeRender : null;
    pane.onBeforeRender = (renderer, scene, camera, ...rest) => {
      if (prev) prev(renderer, scene, camera, ...rest);
      if (rendering || camera.userData.mirrorCam || scene.overrideMaterial) return;
      hookScene(scene);
      if (!decide(camera)) return;
      const mw = pane.matrixWorld;

      _nm.getNormalMatrix(mw);
      _r.copy(frame.right).applyMatrix3(_nm).normalize();
      _u.copy(frame.up).applyMatrix3(_nm).normalize();
      _n.crossVectors(_r, _u).normalize();

      // One pane a frame, sides alternating: a pane whose turn it is not waits,
      // unless it has never rendered, since a live material over an empty
      // target is worse than a frame's extra pass — or unless its eye has
      // moved against the glass (MOVE_EPS), which is a camera change, not the
      // drive.
      const frameId = renderer.info.render.frame;
      if (frameId !== lastFrame) {
        lastFrame = frameId;
        turn = (turn + 1) & 1;
      }
      _d.subVectors(_eye, _c);
      _e2.set(_d.dot(_r), _d.dot(_u), _d.dot(_n));
      const moved = _e2.distanceToSquared(state.eye) > MOVE_EPS * MOVE_EPS;
      if (turn !== side && state.rendered && !moved) return;
      state.eye.copy(_e2);
      // the world scale of the pane, for the frustum
      const sx = _d.setFromMatrixColumn(mw, 0).length();
      const w = frame.w * sx;
      const h = frame.h * sx;

      // eye distance in front of the glass; behind it there is nothing to show
      const depth = _d.subVectors(_eye, _c).dot(_n);
      if (depth < 0.05) return;
      // The eye's image in the glass. A flat mirror puts it `depth` behind the
      // plane; this pane is a spherical cap (`convexPane`, R 0.32 m on the
      // main pane), and a convex mirror images an eye at distance d to
      // d' = dR / (2d + R) behind it, its offset from the axis scaled by the
      // same d'/d — so from the seat (d 1.3 m) the picture is drawn from
      // 0.14 m behind the glass and the pane spans some fifty degrees, the
      // way the convex plate beside it does. Rendered as a flat mirror the
      // same pane was a six-degree telescope down the bed side, and from the
      // seat it held the jerry cans and nothing else (round 7). Paraxial:
      // the mapping across the pane is taken as linear, which for a picture
      // a hundred pixels tall it is.
      const R = frame.radius * sx;
      const dv = Number.isFinite(R) ? (depth * R) / (2 * depth + R) : depth;
      _e2.copy(_eye).addScaledVector(_n, -depth).sub(_c).multiplyScalar(dv / depth).add(_c).addScaledVector(_n, -dv);

      // camera basis: looks out through the glass (-Z = +n), y up the pane,
      // which puts the pane's +right on the camera's -x — hence the flip in the
      // material
      const e = cam.matrixWorld.elements;
      e[0] = -_r.x; e[1] = -_r.y; e[2] = -_r.z; e[3] = 0;
      e[4] = _u.x; e[5] = _u.y; e[6] = _u.z; e[7] = 0;
      e[8] = -_n.x; e[9] = -_n.y; e[10] = -_n.z; e[11] = 0;
      e[12] = _e2.x; e[13] = _e2.y; e[14] = _e2.z; e[15] = 1;
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      cam.position.copy(_e2);
      // off-axis frustum through the pane's corners; near a little past the
      // glass so the bezel lip standing proud of it is clipped, not mirrored
      _d.subVectors(_c, _e2);
      const cx = -_d.dot(_r);
      const cy = _d.dot(_u);
      const near = dv + CLIP_BIAS;
      const s = near / dv;
      cam.near = near;
      cam.far = camera.far;
      cam.projectionMatrix.makePerspective(
        (cx - w * 0.5) * s,
        (cx + w * 0.5) * s,
        (cy + h * 0.5) * s,
        (cy - h * 0.5) * s,
        near,
        cam.far,
        renderer.coordinateSystem,
        camera.reversedDepth,
      );
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

      // --- the pass -----------------------------------------------------
      rendering = true;
      const info = renderer.info.render;
      const calls0 = info.calls;
      const tris0 = info.triangles;
      const prevTarget = renderer.getRenderTarget();
      const prevXr = renderer.xr.enabled;
      const prevShadow = renderer.shadowMap.autoUpdate;
      for (const p of panes) p.visible = false;
      collectSkips(scene, frameId);
      for (const o of skip) {
        if (o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      }
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, cam);
      // the nested render reset the frame's counters; put the outer pass back
      // and keep the mirror's own cost where the perf tools can read it
      stats.calls = info.calls;
      stats.triangles = info.triangles;
      stats.passes++;
      info.calls += calls0;
      info.triangles += tris0;
      lastFrame = info.frame;
      renderer.xr.enabled = prevXr;
      renderer.shadowMap.autoUpdate = prevShadow;
      renderer.setRenderTarget(prevTarget);
      for (const o of hidden) o.visible = true;
      hidden.length = 0;
      for (const p of panes) p.visible = true;
      rendering = false;
      state.rendered = true;
    };

    handle.panes.push({ pane, rt, cam, live, state, prev });
  });

  handle.dispose = () => {
    for (const p of handle.panes) {
      if (p.prev) p.pane.onBeforeRender = p.prev;
      else delete p.pane.onBeforeRender;
      p.pane.material = envMat;
      p.rt.dispose();
      p.live.dispose();
    }
    handle.panes.length = 0;
  };
  Object.defineProperty(stats, 'live', {
    get: () => handle.panes.filter((p) => !p.state.far).length,
  });
  return handle;
}
