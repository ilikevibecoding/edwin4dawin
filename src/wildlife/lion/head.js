import * as THREE from 'three';
import { EYE, EYE_LIDS, HEAD_KINDS, KINDS } from './spec.js';
import { ATLAS } from './textures.js';
import { FACE, HEAD_ROWS, HEAD_SPLIT, HEAD_Z0, HEAD_Z1, JAW_ROWS, almondOpen, headBump, rowsAt, topTaper } from './headspec.js';
import { clamp, lerp, mulberry32, smoothstep } from '../../textures/core.js';

// ---------------------------------------------------------------------------
// The lion's head, built in the rest pose on the head bone (and the jaw, ear
// and lid bones) and skinned to them.
//
// The upper head is one loft along the skull's axis — occiput, braincase,
// brow, cheeks, muzzle and upper lip in a single surface — with the anatomy
// sculpted into it (headspec.js), so there is no seam where a muzzle meets a
// skull. The lower jaw is a second loft on the jaw bone with a chin; the ears
// are cupped, rounded-triangular dishes on their bones; the eyes are balls in
// sockets under a brow, with lids on the lid bones for the blink. Whiskers,
// the tail tuft and the male's mane cards go into the cutout `alpha` builder.
//
// `D` is the detail tier; tiers 1 and 2 keep the same silhouette with fewer
// sections and drop the nose leather, inner ears, lids and strands in turn.
// ---------------------------------------------------------------------------

const _a = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);
// a lion's eye is large for its head: the ball, lids and socket are EYE.r
// scaled up (EYE_LIDS.scale); the lid angles and the blink are unchanged
const EYE_R = EYE.r * EYE_LIDS.scale;
const LID_UP = EYE_LIDS.up ?? EYE.lidUp;
const LID_DOWN = EYE_LIDS.down;

/**
 * Eye socket carved into the head loft, head metres from the eye centre: skin
 * nearer than `r` (half a millimetre over the lid caps, so the two never
 * fight; the ball is EYE_R, the lids LID_R of it) is laid onto that sphere,
 * so the lids are under the skin and show only as rims around the almond,
 * where the surface dips to `floorR`, inside the ball, and the iris shows;
 * the dip fades out between `floor` and `rim`. Skin within `hug` radians of
 * the almond is eased down onto the same sphere over a wide band, so the lids
 * are flush with an orbital mound instead of a bead with a crease around it
 * (round 3's 3 mm draw-in zone), and the skin's opening starts `start`
 * radians past the lid rims, so the caps' own rims draw the eyeline.
 */
const SOCKET = { r: EYE_R * 1.12, floor: EYE_R * 1.45, rim: EYE_R * 2.3, floorR: EYE_R * 0.6, soft: 0.16, start: 0.05, hug: 0.55 };
/**
 * The lid caps' radius over the ball: just under the socket skin and a
 * couple of millimetres over the ball, so the lids hug the eye instead of
 * standing off it as a visor with a shadowed gap under the rim.
 */
const LID_R = 1.1;

/** Head UVs stop this far (fraction of a tile) inside the atlas tile's edges. */
const UV_INSET = 0.006;

/** Alpha atlas columns (see textures.js alphaAtlas): tuft, two mane cards, the whisker. */
const STRANDS = {
  tuft: [0.0, 0.25],
  mane: [
    [0.26, 0.55],
    [0.56, 0.85],
  ],
  whisker: 0.93,
  whiskerHalf: 0.04,
};

/** Skull, brow, cheeks, muzzle, nose, jaw, ears, eyes, lids, whiskers and mane. */
export function addHead(b, alpha, skel, K, D) {
  const s = K.scale * K.head;
  const kindName = Object.keys(KINDS).find((k) => KINDS[k] === K);
  const HK = HEAD_KINDS[kindName] || HEAD_KINDS.lioness;
  const rest = skel.rest;
  const headIdx = skel.index.get('head');
  const headBones = [[headIdx, 1]];
  const hr = rest.get('head');
  const frame = new THREE.Matrix4().compose(hr.pos, hr.quat, new THREE.Vector3(1, 1, 1));
  // head bone +Y is forward, +Z is down; work in a forward = +Z, up = +Y frame instead
  const headFrame = new THREE.Matrix4().multiplyMatrices(frame, new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  const local = (x, y, z, rot, scale) => {
    _m.compose(new THREE.Vector3(x, y, z), rot ? _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])) : _q.identity(), scale || new THREE.Vector3(1, 1, 1));
    return new THREE.Matrix4().multiplyMatrices(headFrame, _m);
  };
  const toHead = new THREE.Matrix4().copy(headFrame).invert();
  const ws = D.sphere[0];
  const hs = D.sphere[1];
  const rnd = mulberry32(4471);

  // muzzle length by kind: a cub's face is short
  const mz = HK.muzzle;
  const zOf = (z) => (z <= HEAD_SPLIT ? z : HEAD_SPLIT + (z - HEAD_SPLIT) * mz);

  // --- upper head: one loft from the occiput to the nose ----------------------
  {
    // the near tier is tessellated finely enough (about 8 mm) to carve a
    // 4 cm socket into the loft; the far tiers keep the silhouette only
    const fine = D.head >= 2;
    const around = Math.max(10, Math.round(D.around * (fine ? 1.45 : 1)));
    const rings = [];
    const zs = [];
    // sections are sparse over the braincase, densest across the brow, eyes
    // and stop (z 0.12 to 0.21), where the sockets are carved, then even along
    // the muzzle
    const spans = [
      [HEAD_Z0, 0.12, fine ? 10 : 5],
      [0.12, 0.21, fine ? 18 : 4],
      [0.21, HEAD_Z1, fine ? 14 : 5],
    ];
    for (const [za, zb, n0] of spans) {
      const n = Math.max(2, Math.round(n0 * (fine ? 1 : Math.pow(D.along / 0.55, 0.8))));
      for (let i = 0; i < n; i++) zs.push(lerp(za, zb, i / n));
    }
    zs.push(HEAD_Z1);
    // the ring at the region split is built twice, once in each atlas region
    const split = zs.findIndex((z) => z > HEAD_SPLIT);
    zs.splice(split, 0, HEAD_SPLIT, HEAD_SPLIT);
    const ringAt = (z, region) => {
      const [cy, rx, ryTop, ryBot, n, taper, bot = 0] = rowsAt(HEAD_ROWS, z);
      const e = 2 / n;
      const ring = [];
      for (let k = 0; k <= around; k++) {
        // mirrored around: both sides read the same texel column
        const u = k / around;
        const a = u * Math.PI * 2;
        const ca = Math.sin(a);
        const sa = -Math.cos(a);
        const ry = sa >= 0 ? ryTop : ryBot;
        const tp = topTaper(sa, taper, bot);
        const px = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * tp;
        const py = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
        // outward normal of the underlying ellipse, for the sculpt (the taper
        // leans the upper sides inward)
        _n.set(ca / (rx * tp), sa / ry, 0);
        if (_n.lengthSq() < 1e-8) _n.set(0, sa >= 0 ? 1 : -1, 0);
        _n.normalize();
        const o = headBump(px, py, z);
        let hx = px + _n.x * o;
        let hy = py + _n.y * o;
        let hz = z;
        // the eye socket: near the eye the surface is pulled onto a sphere
        // hugging the ball, so the cornea and the lids stand a measured few
        // millimetres proud of the skin instead of sinking under it; the cup
        // blends back to the skull over the socket rim
        const [ex, ey, ez] = FACE.eye;
        const sx = Math.sign(hx) || 1;
        const dx = Math.abs(hx) - ex;
        const dy = hy - ey;
        const dz = hz - ez;
        const de = Math.hypot(dx, dy, dz);
        if (de < SOCKET.rim) {
          const w = smoothstep(SOCKET.rim, SOCKET.floor, de);
          // skin the lids would break through is laid just over them; skin
          // already clear of them — the brow ledge, the cheek — is eased down
          // toward the same sphere the nearer it lies to the almond, so the
          // lids sit flush in a soft orbital mound. Between the lid rims the
          // skin must not wrap the ball: inside the almond (the lune between
          // the two rim planes, which both hold the eye's lateral axis) the
          // surface dips well inside the ball, so what shows there is the
          // iris.
          const id = 1 / Math.max(de, 1e-4);
          // the skin's opening is a little larger than the lids' (`start` past
          // the rim planes) and closes over the next `soft` radians, so the
          // step where it turns in toward the ball lies under the lid caps
          // and the smooth rims of the lids draw the almond, not the facets
          const open = almondOpen(dx, dy, dz, SOCKET.soft, SOCKET.start);
          const hug = almondOpen(dx, dy, dz, SOCKET.hug, SOCKET.start) * w;
          const r0 = lerp(Math.max(de, SOCKET.r), SOCKET.r, hug);
          const k = lerp(r0, SOCKET.floorR, open * w) * id;
          hx = sx * (ex + dx * k);
          hy = ey + dy * k;
          hz = ez + dz * k;
        }
        _a.set(hx * s, hy * s, zOf(hz) * s).applyMatrix4(headFrame);
        const um = u <= 0.5 ? u * 2 : (1 - u) * 2;
        const uv = region === 'skull' ? ATLAS.skull : ATLAS.muzzle;
        // skull region: along the head across the region's u, around up its v;
        // muzzle region: around across u, toward the nose up v
        const tu = region === 'skull' ? (z - HEAD_Z0) / (HEAD_SPLIT - HEAD_Z0) : um;
        const tv = region === 'skull' ? um : (z - HEAD_SPLIT) / (HEAD_Z1 - HEAD_SPLIT);
        // a few texels in from the region's edge, so bilinear and mip sampling
        // never pull the neighbouring tile's colour onto the seams (the mirror
        // seam along the crown and under the lip, and the ring at the split)
        ring.push(b.vertex(_a, [uv[0] + (uv[2] - uv[0]) * clamp(tu, UV_INSET, 1 - UV_INSET), uv[1] + (uv[3] - uv[1]) * clamp(tv, UV_INSET, 1 - UV_INSET)], headBones, [1, 1, 1], 0));
      }
      return ring;
    };
    for (let i = 0; i < zs.length; i++) rings.push(ringAt(zs[i], i <= split ? 'skull' : 'muzzle'));
    for (let i = 0; i < rings.length - 1; i++) {
      if (i === split) continue; // the duplicate ring: no band between the two copies
      for (let k = 0; k < around; k++) {
        const a = rings[i][k];
        const c = rings[i][k + 1];
        const d = rings[i + 1][k];
        const e = rings[i + 1][k + 1];
        b.tri(a, c, d);
        b.tri(c, e, d);
      }
    }
    // caps: the occiput (hidden in the neck) and the front of the muzzle
    const cap = (z, ring, flip, region) => {
      const [cy] = rowsAt(HEAD_ROWS, z);
      _a.set(0, cy * s, zOf(z) * s).applyMatrix4(headFrame);
      const uv = region === 'skull' ? ATLAS.skull : ATLAS.muzzle;
      const centre = b.vertex(
        _a,
        region === 'skull' ? [uv[0] + (uv[2] - uv[0]) * UV_INSET, (uv[1] + uv[3]) / 2] : [(uv[0] + uv[2]) / 2, uv[3] - (uv[3] - uv[1]) * UV_INSET],
        headBones,
        [1, 1, 1],
        0,
      );
      for (let k = 0; k < around; k++) {
        if (flip) b.tri(centre, ring[k + 1], ring[k]);
        else b.tri(centre, ring[k], ring[k + 1]);
      }
    };
    cap(zs[0], rings[0], true, 'skull');
    cap(zs[zs.length - 1], rings[rings.length - 1], false, 'muzzle');
  }

  // --- nose leather ---------------------------------------------------------
  if (D.head >= 1) {
    // broad across the top, the nostril wings flaring, nearly flat on the front
    const nose = new THREE.SphereGeometry(1, Math.max(10, ws * 0.6 | 0), Math.max(6, hs * 0.6 | 0));
    const np = nose.attributes.position;
    for (let i = 0; i < np.count; i++) {
      const y = np.getY(i);
      np.setX(i, np.getX(i) * lerp(0.6, 1.0, smoothstep(-1, 0.6, y)));
      if (np.getZ(i) > 0) np.setZ(i, np.getZ(i) * 0.5);
    }
    nose.computeVertexNormals();
    nose.scale(FACE.noseW * 0.5 * s, FACE.noseH * 0.5 * s, 0.022 * s);
    const [nx, ny, nz] = FACE.nose;
    b.addGeometry(nose, {
      matrix: local(nx, ny * s, zOf(nz) * s, [0.5, 0, 0]),
      uvRect: ATLAS.nose,
      uvFn: (u, v, p) => {
        _c.copy(p).applyMatrix4(toHead);
        return [clamp(_c.x / (FACE.noseW * s) + 0.5), clamp((_c.y - ny * s) / (FACE.noseH * 1.1 * s) + 0.5)];
      },
      bones: headBones,
    });
  }

  // --- lower jaw on the jaw bone --------------------------------------------
  {
    const jawIdx = skel.index.get('jaw');
    const around = Math.max(8, Math.round(D.around * 0.45));
    const n = Math.max(3, Math.round(D.along * 7));
    const stations = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const z = lerp(JAW_ROWS[0][0], JAW_ROWS[JAW_ROWS.length - 1][0], f);
      const [cy, rx, ryTop, ryBot] = rowsAt(JAW_ROWS, z);
      stations.push({
        c: new THREE.Vector3(0, cy * s, zOf(z) * s).applyMatrix4(headFrame),
        ax: new THREE.Vector3(1, 0, 0).transformDirection(headFrame),
        ay: new THREE.Vector3(0, 1, 0).transformDirection(headFrame),
        rx: rx * s,
        ryTop: ryTop * s,
        ryBot: ryBot * s,
        v: f,
        bones: [[jawIdx, 1]],
      });
    }
    b.loft(stations, around, { uvRect: ATLAS.jaw, capStart: true, capEnd: true });
  }

  // --- ears: cupped, rounded-triangular dishes on the ear bones ---------------
  for (const side of ['earL', 'earR']) {
    const er = rest.get(side);
    const ei = skel.index.get(side);
    const ef = new THREE.Matrix4().compose(er.pos, er.quat, new THREE.Vector3(1, 1, 1));
    const sgn = side === 'earL' ? 1 : -1;
    addEar(b, ef, [[ei, 1]], s, D, sgn);
  }

  // --- eyes on the head bone, lids on their own bones ----------------------
  if (D.eyes) {
    const eyeR = EYE_R * s;
    for (const side of ['lidL', 'lidR']) {
      const lr = rest.get(side);
      const li = skel.index.get(side);
      const lf = new THREE.Matrix4().compose(lr.pos, lr.quat, new THREE.Vector3(1, 1, 1));
      // the middle tier has no lids and no socket to speak of: a coarser ball
      const eye = D.lids ? new THREE.SphereGeometry(eyeR, ws, hs) : new THREE.SphereGeometry(eyeR, Math.max(8, Math.round(ws * 0.7)), Math.max(6, Math.round(hs * 0.7)));
      b.addGeometry(eye, { matrix: lf, uvRect: ATLAS.eye, bones: headBones, color: [1, 1, 1] });
      if (D.lids) {
        // Each lid is a hemisphere over the ball and just outside the socket
        // skin, its rim a great circle through the eye's lateral axis. The
        // upper one is pitched back so its edge sits LID_UP above the gaze, the
        // lower one LID_DOWN below; what shows between two such rims is an
        // almond that pinches to the corners, which is the shape of a cat's
        // eye. Away from the eye the skull surface is further out than the
        // caps, so they sink under the skin. Up is -Z in lid space.
        const cap = (pitch, bones, rimSign, half) => {
          const g = new THREE.SphereGeometry(eyeR * LID_R, ws, Math.max(6, hs * 0.6 | 0), 0, Math.PI * 2, 0, Math.PI * 0.5);
          g.rotateX(rimSign * -Math.PI / 2);
          g.rotateX(pitch);
          // a partial sphere's v runs over its own rings: 0 at the rim, 1 at
          // the pole, which is the lid tile's layout (eyeline at v = 0); the
          // upper lid reads the left half of the tile, the lower the right
          // (the pale stroke under the eye)
          b.addGeometry(g, {
            matrix: lf,
            uvRect: ATLAS.lid,
            uvFn: (u, v) => [half * 0.5 + u * 0.5, clamp(v)],
            bones,
          });
        };
        cap(-LID_UP, [[li, 1]], 1, 0);
        cap(LID_DOWN, headBones, -1, 1);
      }
    }
  }

  // --- whiskers: strands fanning from the whisker pads, and over the eyes ------
  if (D.whiskers && alpha) {
    const [wx, wy, wz] = FACE.whiskerPad;
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const row = i % 4;
        const col = (i / 4) | 0;
        // rooted in four rows across the whisker pad, well above the lip
        const baseP = new THREE.Vector3(sd * (wx + 0.004 + row * 0.002) * s, (wy + 0.03 - row * 0.01) * s, zOf(wz - 0.016 + col * 0.018) * s);
        const len = (0.1 + (i % 2) * 0.03 + row * 0.01 + col * 0.01) * s;
        // whiskers sweep out and back from the pad, the upper rows a little
        // up, the lower ones level and drooping toward the tip
        const dir = new THREE.Vector3(sd * (0.85 + row * 0.05), 0.12 - row * 0.07 + col * 0.03, -0.05 - col * 0.14 + row * 0.03).normalize();
        const sag = new THREE.Vector3(0, -0.05, 0);
        strandQuad(alpha, headFrame, baseP, dir, len, 0.0009 * s, sag, headBones, 3);
      }
      // superciliary whiskers: three long hairs over each eye
      for (let i = 0; i < 3; i++) {
        const baseP = new THREE.Vector3(sd * (0.048 + i * 0.006) * s, (0.098 - i * 0.003) * s, (0.14 - i * 0.012) * s);
        const dir = new THREE.Vector3(sd * 0.55, 0.55, 0.45 - i * 0.2).normalize();
        strandQuad(alpha, headFrame, baseP, dir, (0.09 + i * 0.015) * s, 0.0018 * s, new THREE.Vector3(0, -0.05, 0), headBones, 2);
      }
    }
  }

  // --- tail tuft: three crossed cards hanging from the last tail bone ---------
  if (alpha) {
    const tr = rest.get('tail5');
    const ti = skel.index.get('tail5');
    const tf = new THREE.Matrix4().compose(tr.pos, tr.quat, new THREE.Vector3(1, 1, 1));
    const L = tr.len;
    const tuft = K.tuft * K.scale;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const g = new THREE.PlaneGeometry(0.11 * tuft, 0.2 * tuft);
      // hang from the tip: plane centre below the bone end along +Y (the bone axis)
      g.translate(0, 0.1 * tuft, 0);
      g.rotateY(a);
      g.translate(0, L * 0.7, 0);
      const [u0, u1] = STRANDS.tuft;
      alpha.addGeometry(g, { matrix: tf, uvRect: [u0, 0, u1, 1], uvFn: (u, v) => [u, 1 - v], bones: [[ti, 1]], tag: 1 });
    }
  }

  // --- mane: hair cards framing the face, over the crown, down the neck --------
  if (K.mane && alpha && D.head >= 1) addMane(alpha, skel, K, D, s, headFrame, rnd);
}

/**
 * One ear: a dish whose rim is a rounded triangle, wider at the base than the
 * tip, cupped toward the front, with the back convex. Built in the ear bone's
 * frame (+Y along the ear, +Z forward, +X lateral). The outer surface carries
 * the dark ear-back; the inner lining is a second surface a few millimetres
 * ahead of it that meets the outer at the rim, so the edge is closed.
 */
function addEar(b, frame, bones, s, D, sgn) {
  const around = Math.max(8, Math.round(D.around * 0.45));
  const rings = D.head >= 2 ? 5 : 3;
  // base to tip and across: round 4 took a fifth off each (critics measured the
  // round-3 ear at 1.4 times a lion's relative to the skull)
  const H = 0.09 * s;
  const W = 0.074 * s;
  // the bone already leans well out; a touch more so the tip stands clear
  const lean = -sgn * 0.05;
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  // and the cup faces out as much as forward, so from the front the lining
  // shows obliquely with the dark back along the outer rim
  const yaw = sgn * 0.7;
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const depth = 0.026 * s;
  const cy = H * 0.5;
  const surface = (inner) => {
    const grid = [];
    for (let j = 0; j <= rings; j++) {
      const rho = j / rings; // 0 centre, 1 rim
      const row = [];
      for (let k = 0; k <= around; k++) {
        const a = (k / around) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        // rim: an ovoid, a little narrower toward the tip and fuller at the
        // base, so the outline is a rounded egg standing on its wide end and
        // not a disc
        const tipward = Math.max(0, sa);
        const w = W * 0.5 * (1 - 0.14 * tipward * tipward) * (1 + 0.06 * Math.max(0, -sa));
        const h = sa >= 0 ? H * 0.5 : H * 0.46;
        // the outer edge of the ear is the straighter one: flatten the lateral side
        const lateral = ca * sgn > 0;
        const px0 = rho * w * ca * (lateral ? 1.0 : 0.94);
        const py0 = cy + rho * h * sa;
        const px1 = px0 * cl - py0 * sl;
        const py = px0 * sl + py0 * cl;
        // cupped: the centre sits back, the rim forward; the tip leans back a
        // little, and the outer edge folds back on itself along the lower
        // half of the lateral rim — the marginal pouch a cat's ear has, which
        // thickens the edge and turns the dark back toward the front
        let pz1 = -depth * (1 - rho * rho) - 0.12 * H * Math.max(0, sa) * rho;
        const fold = smoothstep(0.7, 1.0, rho) * (lateral ? 1 : 0.25) * (0.35 + 0.65 * smoothstep(0.6, -0.2, sa)) * Math.abs(ca);
        pz1 -= 0.012 * s * fold;
        if (inner) pz1 += 0.0045 * s * (1 - Math.pow(rho, 6));
        const px = px1 * cyw + pz1 * syw;
        const pz = -px1 * syw + pz1 * cyw;
        _a.set(px, py, pz).applyMatrix4(frame);
        // polar UV: v = 1 at the centre of the cup, 0 at the rim; the tip at u = 0.25, the base at 0.75
        const u = ((a / (Math.PI * 2)) + 1) % 1;
        const uv = inner ? ATLAS.earIn : ATLAS.earOut;
        // the lining is in the cup's own shade; the round-3 near-white tint
        // was the hot pink ear at dusk
        row.push(b.vertex(_a, [uv[0] + (uv[2] - uv[0]) * u, uv[1] + (uv[3] - uv[1]) * (1 - rho)], bones, inner ? [0.78, 0.74, 0.7] : [1, 1, 1], 0));
      }
      grid.push(row);
    }
    for (let j = 0; j < rings; j++) {
      for (let k = 0; k < around; k++) {
        const a = grid[j][k];
        const c = grid[j][k + 1];
        const d = grid[j + 1][k];
        const e = grid[j + 1][k + 1];
        // the outer surface faces -Z (the back of the head), the lining +Z
        if (inner) {
          b.tri(a, d, c);
          b.tri(c, d, e);
        } else {
          b.tri(a, c, d);
          b.tri(c, e, d);
        }
      }
    }
  };
  surface(false);
  if (D.head >= 1) surface(true);
}

/**
 * Mane cards for the male. Rings of tapered strips rooted just under the
 * surface — around the face behind the cheeks, over the crown between the
 * ears, around the neck at two stations and the shoulders — plus a fringe
 * hanging under the chest. Each card points out along the surface normal and
 * falls under its own weight, so the hair frames the face and hangs at the
 * throat the way a mane does; the cutout texture breaks the outline into
 * strands, darker toward the tips.
 */
function addMane(alpha, skel, K, D, sHead, headFrame, rnd) {
  const s = K.scale;
  const rest = skel.rest;
  const idx = (n) => skel.index.get(n);
  const P = (n) => rest.get(n).pos;
  const full = D.head >= 2;
  const segs = full ? 3 : 2;
  const step = full ? 1 : 2;
  const jitter = (k) => (rnd() - 0.5) * 2 * k;
  const card = (base, dir, len, width, sag, bones, variant, face = null) => {
    const [u0, u1] = STRANDS.mane[variant % 2];
    // the card's face lies along the coat (its width across the surface
    // tangent) so a hanging card is seen flat from the side, not edge on
    const side = face ? new THREE.Vector3().crossVectors(face, dir) : new THREE.Vector3().crossVectors(dir, Y);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    // twist the card about its own axis so no two catch the light alike
    side.applyAxisAngle(dir, jitter(0.6));
    const prev = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = base.clone().addScaledVector(dir, len * t).addScaledVector(sag, len * t * t);
      const w = width * (1 - t * 0.35);
      const l = p.clone().addScaledVector(side, w);
      const r = p.clone().addScaledVector(side, -w);
      const il = alpha.vertex(l, [u0, 1 - t], bones, [1, 1, 1], 4);
      const ir = alpha.vertex(r, [u1, 1 - t], bones, [1, 1, 1], 4);
      if (prev.length) {
        alpha.tri(prev[0], il, prev[1]);
        alpha.tri(prev[1], il, ir);
      }
      prev[0] = il;
      prev[1] = ir;
    }
  };

  // A ring of cards around a centre: `rx`, `ryTop`, `ryBot` the ellipse the roots
  // sit on (a little inside the coat), `back` how much the cards lean toward
  // the tail, `down` how much they hang, `len` in metres of the animal.
  let variant = 0;
  const ring = (centre, axes, rx, ryTop, ryBot, count, { len, width, back = 0.3, down = 0.5, out = 1.0, skipTop = 0, bones, lenFn = null }) => {
    for (let i = 0; i < count; i += step) {
      const u = (i + 0.5) / count;
      const a = -Math.PI / 2 + u * Math.PI * 2 + jitter(0.06);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // the crown carries short hair: leave the top of the ring thin
      const top = Math.max(0, sa);
      if (skipTop > 0 && top > 1 - skipTop && rnd() < 0.6) continue;
      const ry = sa >= 0 ? ryTop : ryBot;
      const base = centre.clone().addScaledVector(axes.x, rx * ca).addScaledVector(axes.y, ry * sa);
      const normal = axes.x.clone().multiplyScalar(ca / rx).addScaledVector(axes.y, sa / ry).normalize();
      // hair leaves the skin a little, then falls: down the sides and the
      // throat, swept back over the crown
      // each lock goes its own way a little: lengths and directions vary so
      // the ring does not read as spokes
      const dir = normal
        .clone()
        .multiplyScalar(out * (0.3 + 0.35 * top))
        .addScaledVector(axes.z, -back * (0.3 + 0.7 * top) + jitter(0.15))
        .addScaledVector(Y, -down * (1 - 0.85 * top) - 0.05 + jitter(0.12))
        .addScaledVector(axes.x, jitter(0.12))
        .normalize();
      const L = (lenFn ? lenFn(u, sa) : len) * (0.7 + rnd() * 0.6);
      card(base, dir, L, width * (0.8 + rnd() * 0.4), new THREE.Vector3(0, -0.4, 0), bones, variant++, normal);
    }
  };

  const headAxes = {
    x: new THREE.Vector3(1, 0, 0).transformDirection(headFrame),
    y: new THREE.Vector3(0, 1, 0).transformDirection(headFrame),
    z: new THREE.Vector3(0, 0, 1).transformDirection(headFrame),
  };
  const headC = (z, y = 0.02) => new THREE.Vector3(0, y * sHead, z * sHead).applyMatrix4(headFrame);
  const headBones = [[idx('head'), 1]];
  // the face ruff: behind the cheeks, from the jaw angle up past the ears
  // the face ruff radiates from the outline of the face — out to the sides,
  // down under the jaw, leaning a little back — the way a mane frames a
  // male's face from the front; it also screens the open ends of the shell
  // layers behind it
  ring(headC(0.1, 0.03), headAxes, 0.1 * sHead, 0.08 * sHead, 0.105 * sHead, 22, {
    len: 0.2 * s,
    width: 0.024 * s,
    back: 0.7,
    down: 0.25,
    out: 1.0,
    skipTop: 0.2,
    bones: headBones,
    lenFn: (u, sa) => (0.16 + 0.1 * Math.max(0, -sa) - 0.05 * Math.max(0, sa)) * s, // longest under the jaw, shortest over the brow
  });
  // a second, deeper ruff behind the first, swept further back, for depth
  ring(headC(0.04, 0.03), headAxes, 0.105 * sHead, 0.09 * sHead, 0.11 * sHead, 18, {
    len: 0.22 * s,
    width: 0.024 * s,
    back: 1.0,
    down: 0.5,
    out: 0.8,
    skipTop: 0.25,
    bones: headBones,
    lenFn: (u, sa) => (0.18 + 0.08 * Math.max(0, -sa)) * s,
  });
  // the crown and the back of the skull: shorter, swept back between the ears
  ring(headC(-0.01, 0.04), headAxes, 0.1 * sHead, 0.085 * sHead, 0.1 * sHead, 22, {
    len: 0.17 * s,
    width: 0.02 * s,
    back: 1.2,
    down: 0.6,
    out: 0.5,
    bones: headBones,
    lenFn: (u, sa) => (0.13 + 0.08 * Math.max(0, -sa)) * s,
  });
  // the neck: two rings of long hair, the throat the longest
  const neckRing = (name, next, rx, ryTop, ryBot, count, len, dropZ = 0) => {
    const c = P(name).clone();
    const zAxis = P(next).clone().sub(c).normalize();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    if (yAxis.y < 0) yAxis.negate();
    c.addScaledVector(zAxis, dropZ * s);
    ring(c, { x: xAxis, y: yAxis, z: zAxis }, rx * s, ryTop * s, ryBot * s, count, {
      len: len * s,
      width: 0.025 * s,
      back: 0.45,
      down: 0.9,
      out: 0.8,
      bones: [[idx(name), 1]],
      lenFn: (u, sa) => len * (0.7 + 0.5 * Math.max(0, -sa)) * s,
    });
  };
  neckRing('neck2', 'head', 0.1, 0.065, 0.18, 24, 0.22);
  neckRing('neck1', 'neck2', 0.13, 0.07, 0.3, 26, 0.26);
  neckRing('chest', 'neck1', 0.21, 0.07, 0.42, 28, 0.24, 0.02);
  // the chest fringe: hanging from the brisket between the forelegs
  const chest = P('chest');
  const chestBones = [[idx('chest'), 1]];
  for (let i = 0; i < 10; i += step) {
    const x = (i / 9 - 0.5) * 0.3 * s;
    const base = new THREE.Vector3(chest.x + x, chest.y - 0.56 * s + Math.abs(x) * 0.4, chest.z + 0.16 * s + jitter(0.03) * s);
    const dir = new THREE.Vector3(x * 1.2, -1, 0.15).normalize();
    card(base, dir, (0.2 + rnd() * 0.08) * s, 0.024 * s, new THREE.Vector3(0, -0.2, 0.1), chestBones, variant++, new THREE.Vector3(0, 0, 1));
  }
}

/** A tapered strand as a chain of quads, for whiskers. */
function strandQuad(b, frame, base, dir, len, width, sag, bones, segs) {
  const side = new THREE.Vector3().crossVectors(dir, Y).normalize();
  if (side.lengthSq() < 0.5) side.set(1, 0, 0);
  const prev = [];
  const u0 = STRANDS.whisker - STRANDS.whiskerHalf;
  const u1 = STRANDS.whisker + STRANDS.whiskerHalf;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = base.clone().addScaledVector(dir, len * t).addScaledVector(sag, len * t * t);
    const w = width * (1 - t * 0.85);
    const l = p.clone().addScaledVector(side, w).applyMatrix4(frame);
    const r = p.clone().addScaledVector(side, -w).applyMatrix4(frame);
    // the whisker column of the alpha atlas: a single pale strand rooted at the top
    const il = b.vertex(l, [u0, 1 - t], bones, [1, 1, 1], 2);
    const ir = b.vertex(r, [u1, 1 - t], bones, [1, 1, 1], 2);
    if (prev.length) {
      b.tri(prev[0], il, prev[1]);
      b.tri(prev[1], il, ir);
      b.tri(prev[0], prev[1], il);
      b.tri(prev[1], ir, il);
    }
    prev[0] = il;
    prev[1] = ir;
  }
}
