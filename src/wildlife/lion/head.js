import * as THREE from 'three';
import { EYE, EYE_LIDS, HEAD_KINDS, KINDS } from './spec.js';
import { ATLAS } from './textures.js';
import { FACE, HEAD_ROWS, HEAD_SPLIT, HEAD_Z0, HEAD_Z1, JAW_ROWS, almondOpen, headBump, headPoint, ringAngles, rowsAt, topTaper } from './headspec.js';
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
    // (round 7: 72 around at the near tier, placed by headspec.js ringAngles —
    // dense along the mouth line and over the bridge's crest, where the lip
    // crease and the ridge are cut — and two more sections over the last two
    // centimetres, where the front rounds off)
    const fine = D.head >= 2;
    const around = Math.max(10, Math.round(D.around * (fine ? 1.64 : 1)));
    const angles = ringAngles(around);
    const rings = [];
    const zs = [];
    // sections are sparse over the braincase, densest across the brow, eyes
    // and stop (z 0.12 to 0.21), where the sockets are carved, then even along
    // the muzzle
    const spans = [
      [HEAD_Z0, 0.12, fine ? 10 : 5],
      [0.12, 0.21, fine ? 18 : 4],
      [0.21, HEAD_Z1, fine ? 16 : 5],
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
      const [cy, rx, ryTop, ryBot, n, taper, bot = 0, nBot = n, tp = 1.6] = rowsAt(HEAD_ROWS, z);
      const ring = [];
      for (let k = 0; k <= around; k++) {
        // mirrored around: both sides read the same texel column
        const { a, um } = angles[k];
        const ca = Math.sin(a);
        const sa = -Math.cos(a);
        // round 8: the lower half has its own exponent (a rounder lip under a
        // flatter bridge, a rounder jaw line under a squarer crown)
        const e = 2 / (sa >= 0 ? n : nBot);
        const ry = sa >= 0 ? ryTop : ryBot;
        const tf = topTaper(sa, taper, bot, tp);
        const px = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * tf;
        const py = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
        // outward normal of the underlying ellipse, for the sculpt (the taper
        // leans the upper sides inward)
        _n.set(ca / (rx * tf), sa / ry, 0);
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
          // round 6: inside the almond the dip does not fade with the
          // distance — skin whose direction from the ball's centre lies
          // within the lid rims goes to the floor however far out on the
          // loft it started. With the dip weighted by `w`, loft between
          // `floor` and `rim` ahead of the sunk ball (the muzzle root's top
          // corner) was left hovering at 1.0-1.4 radii across the lower
          // iris: a flap of skin in front of the eye rather than a socket.
          const wd = Math.max(w, smoothstep(SOCKET.rim * 1.6, SOCKET.floor * 1.6, de));
          const k = lerp(r0, SOCKET.floorR, open * wd) * id;
          hx = sx * (ex + dx * k);
          hy = ey + dy * k;
          hz = ez + dz * k;
        }
        _a.set(hx * s, hy * s, zOf(hz) * s).applyMatrix4(headFrame);
        const uv = region === 'skull' ? ATLAS.skull : ATLAS.muzzle;
        // both regions: around the head across u (under the lip 0, crown 1),
        // along the head up v (skull: occiput to the split; muzzle: split to
        // the nose). Round 7 turned the skull region this way round — it ran
        // along the head across u, which put the coat normal map's strands
        // (long along v) around the skull like hoops, and stretched its
        // texels 4:1; now the hair grain runs from the nose back over the
        // skull on both regions and a texel is about a millimetre each way.
        const tu = um;
        const tv = region === 'skull' ? (z - HEAD_Z0) / (HEAD_SPLIT - HEAD_Z0) : (z - HEAD_SPLIT) / (HEAD_Z1 - HEAD_SPLIT);
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
        region === 'skull' ? [(uv[0] + uv[2]) / 2, uv[1] + (uv[3] - uv[1]) * UV_INSET] : [(uv[0] + uv[2]) / 2, uv[3] - (uv[3] - uv[1]) * UV_INSET],
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
    // (round 7: a block, not a bead — each coordinate of the sphere is pushed
    // toward the cube's faces, so the leather has a flat top, a flat front
    // for the nostrils and rounded edges, and stands on the rounded muzzle
    // end as a lion's does)
    const nose = new THREE.SphereGeometry(1, Math.max(10, ws * 0.6 | 0), Math.max(6, hs * 0.6 | 0));
    const np = nose.attributes.position;
    const cube = (c) => Math.sign(c) * Math.pow(Math.abs(c), 0.62);
    for (let i = 0; i < np.count; i++) {
      const x = cube(np.getX(i));
      const y = cube(np.getY(i));
      const z = cube(np.getZ(i));
      np.setX(i, x * lerp(0.6, 1.0, smoothstep(-1, 0.6, y)));
      np.setY(i, y);
      np.setZ(i, z > 0 ? z * 0.5 : z);
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
        // caps, so they sink under the skin. Up is -Z in lid space. The rims'
        // axis is rolled about the gaze (EYE_LIDS.roll, the same roll as the
        // skin's almond in headspec.js EYE_FRAME) so the outer corner sits a
        // little higher than the inner: the lid bone's +X is the animal's
        // right, so the roll mirrors between the two eyes.
        const sgn = side === 'lidL' ? 1 : -1;
        const cap = (pitch, bones, rimSign, half) => {
          const g = new THREE.SphereGeometry(eyeR * LID_R, ws, Math.max(6, hs * 0.6 | 0), 0, Math.PI * 2, 0, Math.PI * 0.5);
          g.rotateX(rimSign * -Math.PI / 2);
          g.rotateX(pitch);
          g.rotateY(-sgn * (EYE_LIDS.roll ?? 0));
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
        // Round 9: the lateral canthus — a third cap over the temporal side
        // of the ball. The two lid rims are great circles through the eye's
        // lateral axis, so between them the ball was bare out to 90 degrees
        // to the side and, in the near-profile face view, its limbus met the
        // cheek's skin with no lid over it (the socket skin closes over 46-60
        // degrees but the ball is at 1.0 radii to its 1.12). The cap sits at
        // 1.05 radii — on the ball, under the socket skin's 1.12 and the lid
        // caps' 1.1 (a cap outside the skin left the socket's wall, skin from
        // 1.12 down to the ball, as a sliver between the limb and the lid in
        // every oblique view) — with its pole 20 degrees below the lateral
        // axis (the lower-temporal quadrant is where the ball met bare skin;
        // the upper lid covers the upper-temporal quadrant already) and
        // reaching 62 degrees in, so the ball's temporal limb is bounded by
        // lid wherever the almond opens and the outer corner is a dark lid
        // margin, as on the animal. Twelve segments on a 1.7 cm cap — 84
        // triangles a side.
        {
          const g = new THREE.SphereGeometry(eyeR * 1.05, 12, 4, 0, Math.PI * 2, 0, Math.PI * 0.345);
          g.rotateZ(-sgn * Math.PI / 2);
          g.rotateY(-sgn * 0.35);
          b.addGeometry(g, {
            matrix: lf,
            uvRect: ATLAS.lid,
            uvFn: (u, v) => [u * 0.5, clamp(v)],
            bones: headBones,
          });
        }
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
        // rooted in four rows across the whisker pad, from under the nose's
        // level down to just over the lip
        const baseP = new THREE.Vector3(sd * (wx + 0.004 + row * 0.002) * s, (wy + 0.018 - row * 0.008) * s, zOf(wz - 0.016 + col * 0.018) * s);
        const len = (0.1 + (i % 2) * 0.03 + row * 0.01 + col * 0.01) * s;
        // whiskers sweep out and back from the pad, the upper rows a little
        // up, the lower ones level and drooping toward the tip
        const dir = new THREE.Vector3(sd * (0.85 + row * 0.05), 0.12 - row * 0.07 + col * 0.03, -0.05 - col * 0.14 + row * 0.03).normalize();
        const sag = new THREE.Vector3(0, -0.05, 0);
        strandQuad(alpha, headFrame, baseP, dir, len, 0.0009 * s, sag, headBones, 3);
      }
      // superciliary whiskers: three long hairs over each eye, rooted on the brow ledge
      for (let i = 0; i < 3; i++) {
        const baseP = new THREE.Vector3(sd * (0.058 + i * 0.006) * s, (0.106 - i * 0.003) * s, (0.166 - i * 0.012) * s);
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
 * One ear: a cupped shell whose rim is a rounded triangle, wider at the base
 * than the tip, the cup toward the front and the back convex. Built in the
 * ear bone's frame (+Y along the ear, +Z forward, +X lateral). The outer
 * surface carries the dark ear-back; the inner lining is a second surface
 * ahead of it. Round 7: at the near tier the lining is inset from the outer
 * rim and stands 9 mm ahead of it, and a band of quads joins the two rims,
 * so the edge has the thickness of a rolled rim (about 8 mm) instead of the
 * zero-thickness leaf edge every round-5 critic read as a disc; the cup is
 * a bowl (steep toward the rim, 3 cm deep) and the lining darkens toward
 * the canal, so the ear reads as a cup from the front. The far tiers keep
 * the closed leaf (same triangle count as round 6).
 */
function addEar(b, frame, bones, s, D, sgn) {
  const around = Math.max(8, Math.round(D.around * 0.45));
  const shell = D.head >= 2;
  const rings = shell ? 6 : 3;
  // base to tip and across: 0.25 L by 0.2 L on a 0.404 head (round 4 took a
  // fifth off round 3's, which the critics measured at 1.4 times a lion's;
  // round 5's are measured against the head length instead of eyeballed)
  const H = 0.105 * s;
  const W = 0.084 * s;
  // the bone leans out 30 degrees; a touch more so the tip stands clear
  const lean = -sgn * 0.05;
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  // and the cup faces forward-out at about 35 degrees, so from the front the
  // lining shows with the dark back along the outer rim
  const yaw = sgn * 0.6;
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const depth = 0.03 * s;
  const cy = H * 0.5;
  // the lining sits inside the outer rim by this fraction of the radius (a
  // rim 6.5-8 mm wide) and its rim is lifted by `rimUp`, which — against the
  // bowl's 11 mm fall at that radius — puts it 2-3 mm ahead of the outer
  // edge, so the band between them faces forward and outward: a rolled rim
  // seen from the front and a lip of thickness seen from the side
  const inset = shell ? 0.84 : 1.0;
  const rimUp = shell ? 0.014 * s : 0;
  const point = (rho, a, inner, out) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // rim: a rounded triangle, broad at the base and two thirds as wide
    // at the tip (round 5: the ovoid of round 4 was a teddy bear's round
    // ear from the front; a lion's is a cupped triangle with a soft tip)
    const tipward = Math.max(0, sa);
    const w = W * 0.5 * (1 - 0.36 * tipward * tipward) * (1 + 0.08 * Math.max(0, -sa));
    const h = sa >= 0 ? H * 0.5 : H * 0.46;
    // the outer edge of the ear is the straighter one: flatten the lateral side
    const lateral = ca * sgn > 0;
    const px0 = rho * w * ca * (lateral ? 1.0 : 0.94);
    const py0 = cy + rho * h * sa;
    const px1 = px0 * cl - py0 * sl;
    const py = px0 * sl + py0 * cl;
    // cupped: the centre sits back, the rim forward — a bowl, shallow over
    // the middle and steep toward the rim (rho^2.6, where the round-6
    // paraboloid was steepest at the centre and flat at the edge, which is
    // a dish seen as a leaf); the tip leans back a little, and the outer
    // edge folds back on itself along the lower half of the lateral rim —
    // the marginal pouch a cat's ear has, which thickens the edge and turns
    // the dark back toward the front
    let pz1 = -depth * (1 - Math.pow(rho, 2.6)) - 0.12 * H * Math.max(0, sa) * rho;
    const fold = smoothstep(0.7, 1.0, rho) * (lateral ? 1 : 0.25) * (0.35 + 0.65 * smoothstep(0.6, -0.2, sa)) * Math.abs(ca);
    pz1 -= 0.012 * s * fold;
    if (inner) pz1 += 0.0045 * s * (1 - Math.pow(rho, 6)) + rimUp * smoothstep(0.5, 1.0, rho);
    const px = px1 * cyw + pz1 * syw;
    const pz = -px1 * syw + pz1 * cyw;
    return out.set(px, py, pz).applyMatrix4(frame);
  };
  const surface = (inner) => {
    const grid = [];
    for (let j = 0; j <= rings; j++) {
      const rho = j / rings; // 0 centre, 1 rim (of this surface)
      const row = [];
      for (let k = 0; k <= around; k++) {
        const a = (k / around) * Math.PI * 2;
        point(inner ? rho * inset : rho, a, inner, _a);
        // polar UV: v = 1 at the centre of the cup, 0 at the rim; the tip at u = 0.25, the base at 0.75
        const u = ((a / (Math.PI * 2)) + 1) % 1;
        const uv = inner ? ATLAS.earIn : ATLAS.earOut;
        // the lining is in the cup's own shade (the round-3 near-white tint
        // was the hot pink ear at dusk), darkening into the bowl toward the
        // canal so the cup reads as a hollow and not a pale plate
        const deep = inner ? smoothstep(0.55, 0.95, 1 - rho) : 0;
        const col = inner ? [lerp(0.8, 0.42, deep), lerp(0.76, 0.38, deep), lerp(0.72, 0.36, deep)] : [1, 1, 1];
        row.push(b.vertex(_a, [uv[0] + (uv[2] - uv[0]) * u, uv[1] + (uv[3] - uv[1]) * (1 - rho)], bones, col, 0));
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
    return grid;
  };
  const outer = surface(false);
  if (D.head >= 1) {
    surface(true);
    if (shell) {
      // the rim: a band from the outer surface's edge to the lining's edge,
      // facing outward, in the ear-back tile's pale rim colour
      const uv = ATLAS.earOut;
      const rim = [];
      for (let k = 0; k <= around; k++) {
        const a = (k / around) * Math.PI * 2;
        point(inset, a, true, _a);
        const u = ((a / (Math.PI * 2)) + 1) % 1;
        rim.push(b.vertex(_a, [uv[0] + (uv[2] - uv[0]) * u, uv[1] + (uv[3] - uv[1]) * 0.02], bones, [1, 1, 1], 0));
      }
      const edge = outer[rings];
      for (let k = 0; k < around; k++) {
        b.tri(edge[k], edge[k + 1], rim[k]);
        b.tri(edge[k + 1], rim[k + 1], rim[k]);
      }
    }
  }
}

/**
 * One lock of the mane as a card: a tapered strip of `segs` quads from `base`
 * along `dir`, sagging by `sag` (× len t²) so it falls under its own weight,
 * `width` the half-width at the root (0.65 of it at the tip), its face
 * square to `face` — the surface normal for a lock seen flat from the side,
 * the animal's forward axis for one that frames the face from the front —
 * and twisted `twist` radians about its own axis. Reads one of the two lock
 * columns of the alpha atlas (STRANDS.mane), tag 4.
 */
export function lockCard(alpha, base, dir, len, width, sag, bones, variant, face, twist = 0, segs = 3) {
  const [u0, u1] = STRANDS.mane[variant % 2];
  const side = new THREE.Vector3().crossVectors(face, dir);
  if (side.lengthSq() < 1e-4) side.crossVectors(dir, Y);
  if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
  side.normalize();
  side.applyAxisAngle(dir, twist);
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
}

/**
 * Where a mane lock points, given the surface normal `n` where it roots (rest
 * space, +Y up), the animal's forward axis `fwd` and a random source: out
 * along the normal a little, then down under gravity — the more the further
 * the root is from the crest — and back along the neck, most over the crest
 * where the hair is swept back between the ears; with ±15° of jitter. Round
 * 9: rounds 5-8 pointed every card out along the normal of the ring it sat
 * on, which from the front is a wheel of spokes ("radial ribbons").
 */
export function lockDir(n, fwd, rnd, { out = 0.4, down = 1.0, back = 0.3, crestBack = 0.9, crestUp = 0.15 } = {}) {
  const top = Math.max(0, n.y);
  const bottom = Math.max(0, -n.y);
  const dir = n
    .clone()
    .multiplyScalar(out * (1 + 0.4 * bottom))
    .addScaledVector(Y, -down * (1 - 0.85 * top * top) + crestUp * top * top)
    .addScaledVector(fwd, -(back + (crestBack - back) * top))
    .normalize();
  // ±15°: a random vector across the direction, its length the tangent of the angle
  const j = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
  j.addScaledVector(dir, -j.dot(dir));
  if (j.lengthSq() > 1e-8) dir.addScaledVector(j.normalize(), Math.tan(0.26) * rnd()).normalize();
  return dir;
}

/**
 * The mane's face ruff for the male: locks rooted on the skull's outline
 * behind the cheeks and over the crown, hanging down the sides of the face
 * and under the jaw and swept back over the crown between the ears, faced
 * toward the front so they frame the face head-on (from the side they are
 * edge-on and the neck's locks, geometry.js addManeLocks, show instead).
 * Round 9: rounds 5-8's three rings of cards radiating from the face centre
 * along the section normals were the "radial ribbons"; the neck and chest
 * locks moved to geometry.js, on the ruff shell itself.
 */
function addMane(alpha, skel, K, D, sHead, headFrame, rnd) {
  const s = K.scale;
  const idx = (n) => skel.index.get(n);
  const full = D.head >= 2;
  const segs = full ? 3 : 2;
  const step = full ? 1 : 2;
  const headBones = [[idx('head'), 1]];
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(headFrame);
  const hp = [0, 0, 0];
  let variant = 0;
  // roots on the skull section at z, a little inside the skin, `count` round
  // it from under the jaw over the side and the crown
  const ring = (z, count, { len, lenJaw, lenCrown, width, skipCrown = 0, faceFwd = 1.0, root = 0.92 }) => {
    for (let i = 0; i < count; i += step) {
      const a = ((i + 0.5 + (rnd() - 0.5) * 0.5) / count) * Math.PI * 2;
      headPoint(z, a, hp);
      const [cy] = rowsAt(HEAD_ROWS, z);
      // outward: from the section's centre, in head space
      const nh = new THREE.Vector3(hp[0], hp[1] - cy, 0).normalize();
      const n = nh.clone().transformDirection(headFrame);
      const top = Math.max(0, n.y);
      if (skipCrown > 0 && top > 0.6 && rnd() < skipCrown) continue;
      const base = new THREE.Vector3(hp[0] * root, cy + (hp[1] - cy) * root, hp[2]).multiplyScalar(sHead).applyMatrix4(headFrame);
      const bottom = Math.max(0, -n.y);
      const dir = lockDir(n, fwd, rnd, { out: 0.45, down: 1.0, back: 0.2, crestBack: 1.0, crestUp: 0.25 });
      const face = n.clone().addScaledVector(fwd, faceFwd).normalize();
      const L = lerp(lerp(len, lenJaw, bottom), lenCrown, top * top) * (0.8 + rnd() * 0.4) * s;
      lockCard(alpha, base, dir, L, width * (0.85 + rnd() * 0.3) * s, new THREE.Vector3(0, -0.35, 0), headBones, variant++, face, (rnd() - 0.5) * 0.5, segs);
    }
  };
  // the ruff proper: behind the jaw angle and the ears, the long locks
  ring(0.06, 22, { len: 0.17, lenJaw: 0.24, lenCrown: 0.1, width: 0.026, skipCrown: 0.3 });
  // and forward of it, behind the cheeks: shorter, the mane's front edge
  // under the ear and along the jaw
  ring(0.11, 16, { len: 0.12, lenJaw: 0.17, lenCrown: 0.08, width: 0.022, skipCrown: 0.7, root: 0.94 });
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
