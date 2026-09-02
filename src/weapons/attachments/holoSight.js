import * as THREE from 'three';
import { MM, RAIL, PartsBuilder, railClampShape, extrude, rbox, cylX, cylY, cylZ, knurlX, knurlZ, roundedRect, flatShape, plane, glassMaterial, neverCastShadow } from './lib.js';

/**
 * EOTech 553 / EXPS-style holographic weapon sight.
 *
 * Sight-local frame: origin at the rail top surface on the rail centreline, mid-length of the housing;
 * +Y up, -Z forward, +X right. All dimensions in mm (real: 95 long, 54 wide, 60 tall to the hood roof,
 * window 30 × 24 with a round top, optical centre 43 mm above the rail).
 */
export const HOLO = {
  length: 95,
  lowerW: 54,
  lowerY0: 8,
  lowerY1: 30,
  hoodW: 44,
  hoodY0: 28,
  hoodY1: 60,
  winW: 30,
  winH: 24,
  winY0: 31,
  rearW: 30, // the 553's rear window matches the front one, so the tunnel walls stay out of the sight picture
  rearH: 24,
  frameT: 5, // front / rear frame plate thickness
  glassInset: 2.2, // glass behind the front face
  reticleInset: 3.3, // reticle plane behind the front face
};
HOLO.winCY = HOLO.winY0 + HOLO.winH / 2;

/* --------------------------------------------------------------------------------- reticle */

const RETICLE_VERT = /* glsl */ `
uniform float uRefDist;
varying vec2 vUv;
varying vec2 vPos;
void main() {
	vUv = uv;
	// Eye position in reticle space. A hologram is collimated: the pattern sits where the eye's ray parallel to
	// the optical axis meets the window plane, at a constant angular size (scaled by eye distance).
	vec3 camObj = ( inverse( modelViewMatrix ) * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
	float dist = max( 0.03, abs( camObj.z ) );
	float s = clamp( dist / uRefDist, 0.4, 3.0 );
	vec2 p = position.xy * s + camObj.xy;
	vPos = p;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( p, position.z, 1.0 );
}`;

const RETICLE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uIntensity;
uniform vec2 uHalf;
uniform vec2 uRadii;
varying vec2 vUv;
varying vec2 vPos;
float sdRounded( vec2 p, vec2 b, float rTop, float rBot ) {
	float r = p.y > 0.0 ? rTop : rBot;
	vec2 q = abs( p ) - b + r;
	return min( max( q.x, q.y ), 0.0 ) + length( max( q, 0.0 ) ) - r;
}
void main() {
	float d = sdRounded( vPos, uHalf, uRadii.x, uRadii.y );
	if ( d > 0.0 ) discard;
	vec4 t = texture2D( uMap, vUv );
	float a = t.a * smoothstep( 0.0, -0.0012, d );
	gl_FragColor = vec4( uColor * ( uIntensity * a ), 1.0 );
}`;

/** EOTech pattern: 68 MOA ring, 4 ticks (6 o'clock extended), 1 MOA dot — with a soft speckle halo. */
function reticleTexture(game, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.33;
  const lw = size * 0.015;
  const tick = size * 0.03;
  const drawPattern = (alpha, widen) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = lw + widen;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    const seg = (x0, y0, x1, y1) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    seg(cx, cy - R - tick, cx, cy - R + tick);
    seg(cx + R - tick, cy, cx + R + tick, cy);
    seg(cx - R - tick, cy, cx - R + tick, cy);
    seg(cx, cy + R - tick, cx, cy + R + tick * 2.4);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.014 + widen * 0.5, 0, Math.PI * 2);
    ctx.fill();
  };
  // halo (laser speckle glow) then the crisp core
  ctx.filter = `blur(${size * 0.012}px)`;
  drawPattern(0.55, lw * 1.2);
  ctx.filter = 'none';
  drawPattern(1.0, 0);
  ctx.globalAlpha = 1;
  const tex = game.assets.canvasTexture(c, { srgb: false });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = game.assets.anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------------------------------------------------------------- housing */

/**
 * Build the sight. `mats` = shared materials { anod, steel, rubber, matte }, `atlas` = LabelAtlas.
 * Returns { group, aimLocal (Vector3, gunRoot), setVisible, setBrightness, reticle }.
 */
export function buildHoloSight(game, rig, mats, atlas, { zFront = -0.100 } = {}) {
  const H = HOLO;
  const group = new THREE.Group();
  group.name = 'HoloSight';
  group.position.set(RAIL.x, RAIL.topY, zFront + H.length * 0.5 * MM);
  rig.attachments.add(group);

  const b = new PartsBuilder('Holo');
  const half = H.length / 2;

  // --- mount: clamp base + two cross-bolts with slotted thumb nuts (right) and hex nuts (left), QD lever (left)
  const clamp = railClampShape({ halfWidth: 12.5, height: H.lowerY0 + 1.5, jawDepth: 5.9, hookDepth: 5.3 });
  b.add(extrude(clamp, 64, { bevel: 0.8 }), mats.anod, { pos: [0, 0, 8], wear: 0.5 });
  for (const z of [22, -8]) {
    b.add(cylX(3.0, 31), mats.steel, { pos: [1.5, -3.0, z] });
    b.add(cylX(6.2, 4.5, 24), mats.steel, { pos: [12.5 + 2.4, -3.0, z] });
    b.add(rbox(1.4, 9.5, 1.2, 0.3), mats.matte, { pos: [12.5 + 4.7, -3.0, z] }); // screwdriver slot
    b.add(cylX(4.2, 2.2, 6), mats.steel, { pos: [-(12.5 + 1.1), -3.0, z] });
  }
  // QD throw lever along the left jaw (pivots on the front bolt, latched at the rear)
  b.add(rbox(3.0, 6.5, 30, 1.0), mats.anod, { pos: [-(12.5 + 2.4), -1.8, 7], wear: 0.7 });
  b.add(cylX(4.6, 3.4, 20), mats.anod, { pos: [-(12.5 + 2.4), -3.0, -8], wear: 0.5 });

  // --- lower housing (electronics + battery), slightly narrower at the rear third
  b.add(rbox(H.lowerW, H.lowerY1 - H.lowerY0, H.length - 30, 3.2), mats.anod, { pos: [0, (H.lowerY0 + H.lowerY1) / 2, -15], wear: 0.45 });
  b.add(rbox(H.lowerW - 6, H.lowerY1 - H.lowerY0 - 2, 36, 3.0), mats.anod, { pos: [0, (H.lowerY0 + H.lowerY1) / 2 - 1, half - 18], wear: 0.45 });
  // hood base "sill" (0.3 mm proud of the housing top so no face is coplanar)
  b.add(rbox(H.hoodW + 2, 3.3, H.length - 2, 1.0), mats.anod, { pos: [0, H.lowerY1 - 1.35, 0], wear: 0.4 });

  // --- hood: arch-topped tube with a rectangular channel; thick front / rear frames with 45° chamfers on both
  // the outer edge and the window edge (EXPS look). Bottom corners sit inside the sill; corner radii must stay
  // >= the extrude bevel (see lib.extrude).
  const hoodOuter = (shape, inset = 0) =>
    roundedRect(H.hoodW - inset * 2, H.hoodY1 - H.hoodY0 - inset, [14 - inset, 14 - inset, 2.6 - inset, 2.6 - inset], shape, 0, (H.hoodY0 + H.hoodY1) / 2 - inset / 2);
  const tube = hoodOuter(new THREE.Shape(), 0.35);
  tube.holes.push(roundedRect(H.winW + 1, H.winH + 1.5, [8.5, 8.5, 2.6, 2.6], new THREE.Path(), 0, H.winCY + 0.25));
  b.add(extrude(tube, H.length - 2 * H.frameT + 2, { bevel: 0.5, curveSegments: 9 }), mats.anod, { pos: [0, 0, 0], wear: 0.5 });
  const frameT = H.frameT + 1.5;
  const bezelZ = half - frameT / 2 + 0.4;
  const front = hoodOuter(new THREE.Shape());
  front.holes.push(roundedRect(H.winW, H.winH, [8, 8, 2.6, 2.6], new THREE.Path(), 0, H.winCY));
  b.add(extrude(front, frameT, { bevel: 2.2, bevelSeg: 1, curveSegments: 10 }), mats.anod, { pos: [0, 0, -bezelZ], wear: 0.5 });
  const rear = hoodOuter(new THREE.Shape());
  rear.holes.push(roundedRect(H.rearW, H.rearH, [8, 8, 2.6, 2.6], new THREE.Path(), 0, H.winCY));
  b.add(extrude(rear, frameT, { bevel: 2.2, bevelSeg: 1, curveSegments: 10 }), mats.anod, { pos: [0, 0, bezelZ], wear: 0.5 });
  // hood seam: shallow raised band a third of the way back (the 553's bolt-on front hood section)
  const band = hoodOuter(new THREE.Shape(), -0.25);
  band.holes.push(hoodOuter(new THREE.Path(), 0.6));
  b.add(extrude(band, 2.2, { bevel: 0.25, bevelSeg: 1, curveSegments: 9 }), mats.anod, { pos: [0, 0, -14], wear: 0.4 });
  // roof: shallow rib + four cap screws
  b.add(rbox(9, 1.6, 60, 0.6), mats.anod, { pos: [0, H.hoodY1 + 0.5, 3], wear: 0.7 });
  for (const z of [-28, 28]) {
    for (const x of [-13.5, 13.5]) {
      b.add(cylY(2.0, 1.2, 14), mats.steel, { pos: [x, H.hoodY1 + 0.35, z] });
      b.add(cylY(1.0, 0.6, 6), mats.matte, { pos: [x, H.hoodY1 + 0.95, z] });
    }
  }
  // hood interior: matte black liner (sits inside the channel, hides the anodised interior walls)
  const liner = roundedRect(H.winW + 0.9, H.winH + 1.4, [8.4, 8.4, 2.4, 2.4], new THREE.Shape(), 0, H.winCY + 0.25);
  liner.holes.push(roundedRect(H.winW - 0.4, H.winH - 0.2, [8.2, 8.2, 2.0, 2.0], new THREE.Path(), 0, H.winCY + 0.25));
  b.add(extrude(liner, H.length - 2 * H.frameT - 1, { bevel: 0 }), mats.matte, { pos: [0, 0, 0] });

  // --- rear face: control panel below the window — two round brightness buttons (▼ ▲) with bevelled bezels, a
  // rectangular NV button between them, ON / OFF legends, corner screws (as on the EXPS reference)
  const rearZ = half; // rear face of the housing
  const panelW = H.hoodW + 2;
  b.add(rbox(panelW, 19.5, 3.4, 2.4), mats.anod, { pos: [0, 18.6, rearZ + 1.0], wear: 0.55 });
  const panelZ = rearZ + 1.0 + 1.7; // panel front face
  const btnY = 17.8;
  const btnX = 12.5;
  for (const x of [-btnX, btnX]) {
    b.add(cylZ(5.6, 1.8, 28), mats.anod, { pos: [x, btnY, panelZ + 0.9], wear: 0.6 }); // bezel ring
    b.add(cylZ(4.4, 2.4, 28), mats.rubber, { pos: [x, btnY, panelZ + 1.9] }); // rubber cap
  }
  b.add(rbox(11, 6.4, 2.4, 1.4), mats.rubber, { pos: [0, 21.2, panelZ + 1.0] }); // NV button
  b.add(rbox(12.4, 7.8, 1.2, 1.6), mats.anod, { pos: [0, 21.2, panelZ + 0.5], wear: 0.5 }); // its surround
  for (const [x, y] of [
    [-19.5, 11.2],
    [19.5, 11.2],
    [-19.5, 26.4],
    [19.5, 26.4],
  ]) {
    b.add(cylZ(1.5, 0.8, 12), mats.steel, { pos: [x, y, panelZ + 0.3] });
    b.add(rbox(0.6, 2.2, 0.5, 0.15), mats.matte, { pos: [x, y, panelZ + 0.75] });
  }

  // --- right side: battery compartment bulge with a knurled cap and a coin slot, product label plate
  const px = -H.lowerW / 2; // -27
  b.add(cylX(9.0, 6, 32), mats.anod, { pos: [-px - 1, 18.5, -half + 14], wear: 0 });
  b.add(knurlX(9.3, 3.4, 30, 0.45), mats.anod, { pos: [-px + 3.5, 18.5, -half + 14] });
  b.add(rbox(1.0, 2.6, 14, 0.3), mats.steel, { pos: [-px + 5.5, 18.5, -half + 14] }); // coin slot, proud of the cap face
  b.add(rbox(1.4, 12, 30, 0.6), mats.anod, { pos: [-px + 0.4, 19.5, 0], wear: 0.4 }); // label plate (thin in X)
  // --- left side: laser warning sticker plate + serial label plate + side screws
  b.add(rbox(1.2, 12.5, 34, 0.6), mats.anod, { pos: [px - 0.4, 19.5, -10], wear: 0.4 });
  for (const z of [-40, 12]) {
    b.add(cylX(1.8, 0.8, 12), mats.steel, { pos: [px - 0.3, 26.5, z] });
    b.add(cylX(1.8, 0.8, 12), mats.steel, { pos: [-px + 0.3, 26.5, z] });
  }
  // --- front face: battery latch lever, sensor window
  b.add(rbox(16, 6, 3.0, 1.2), mats.anod, { pos: [12, 14, -half - 1.0], wear: 0.5 });
  b.add(cylZ(2.2, 1.2, 16), mats.matte, { pos: [-14, 18, -half - 0.4] });

  b.build(group);

  // --- labels (decals in the shared atlas)
  const labels = new PartsBuilder('HoloLabels');
  const etch = '#b4b8be';
  const arrow = (dir) => (ctx, w, h) => {
    ctx.fillStyle = '#d2d5da';
    ctx.beginPath();
    const cx = w / 2;
    const cy = h / 2;
    const s = Math.min(w, h) * 0.3;
    if (dir === 'up') {
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy + s * 0.75);
      ctx.lineTo(cx - s, cy + s * 0.75);
    } else {
      ctx.moveTo(cx, cy + s);
      ctx.lineTo(cx + s, cy - s * 0.75);
      ctx.lineTo(cx - s, cy - s * 0.75);
    }
    ctx.closePath();
    ctx.fill();
  };
  const capZ = panelZ + 1.9 + 1.2 + 0.12;
  labels.add(atlas.decal(7, 7, arrow('down')), atlas.material, { pos: [-btnX, btnY, capZ] });
  labels.add(atlas.decal(7, 7, arrow('up')), atlas.material, { pos: [btnX, btnY, capZ] });
  const panelFace = panelZ + 0.12;
  labels.add(atlas.text(8, 3.4, 'ON', { size: 2.3, color: etch }), atlas.material, { pos: [btnX + 3.5, 25.6, panelFace] });
  labels.add(atlas.text(9, 3.4, 'OFF', { size: 2.3, color: etch }), atlas.material, { pos: [0, 12.9, panelFace] });
  labels.add(atlas.text(7, 3.0, 'NV', { size: 2.0, color: etch }), atlas.material, { pos: [-btnX - 3.2, 25.6, panelFace] });
  const rightFace = -px + 0.4 + 0.7 + 0.12;
  labels.add(atlas.text(28, 10, ['EXPS3-0  -  68 MOA / 1 MOA', 'HOLOGRAPHIC WEAPON SIGHT', 'S/N 1147-A03  -  CR123 3V'], { size: 1.7, color: etch }), atlas.material, {
    pos: [rightFace, 19.5, 0],
    rot: [0, Math.PI / 2, 0],
  });
  const leftFace = px - 0.4 - 0.6 - 0.12;
  labels.add(
    atlas.decal(32, 10.5, (ctx, w, h, ppm) => {
      // laser warning sticker: pale label with a red header band
      ctx.fillStyle = '#d9d6c8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b3261e';
      ctx.fillRect(0, 0, w, h * 0.32);
      ctx.fillStyle = '#f2efe6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${2.0 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('CAUTION', w / 2, h * 0.16);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `bold ${1.15 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('LASER RADIATION - DO NOT STARE', w / 2, h * 0.5);
      ctx.font = `${1.05 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('INTO BEAM   CLASS II LASER PRODUCT', w / 2, h * 0.68);
      ctx.fillText('MADE IN USA   ' + String.fromCharCode(0x2022) + '   IEC 60825-1', w / 2, h * 0.86);
    }),
    atlas.material,
    { pos: [leftFace, 19.5, -10], rot: [0, -Math.PI / 2, 0] },
  );
  labels.build(group, { castShadow: false });

  // --- glass: front window (holographic) + rear window
  const glass = glassMaterial(game);
  const frontGlass = new THREE.Mesh(flatShape(roundedRect(H.winW + 0.6, H.winH + 0.6, [8.2, 8.2, 1.7, 1.7], new THREE.Shape(), 0, H.winCY)), glass);
  frontGlass.position.set(0, 0, (-half + H.glassInset) * MM);
  frontGlass.name = 'HoloFrontGlass';
  neverCastShadow(frontGlass);
  group.add(frontGlass);
  const rearGlass = new THREE.Mesh(flatShape(roundedRect(H.rearW + 0.6, H.rearH + 0.6, [8.2, 8.2, 1.7, 1.7], new THREE.Shape(), 0, H.winCY)), glass);
  rearGlass.position.set(0, 0, (half - H.glassInset) * MM);
  rearGlass.name = 'HoloRearGlass';
  neverCastShadow(rearGlass);
  group.add(rearGlass);

  // --- reticle: additive, collimated, clipped to the window aperture in the shader
  const reticleMat = new THREE.ShaderMaterial({
    vertexShader: RETICLE_VERT,
    fragmentShader: RETICLE_FRAG,
    uniforms: {
      uMap: { value: reticleTexture(game) },
      uColor: { value: new THREE.Color(1.0, 0.16, 0.035) },
      uIntensity: { value: 9.0 },
      uRefDist: { value: 0.21 },
      uHalf: { value: new THREE.Vector2((H.winW / 2 - 0.4) * MM, (H.winH / 2 - 0.4) * MM) },
      uRadii: { value: new THREE.Vector2(7.6 * MM, 1.4 * MM) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  reticleMat.name = 'holoReticle';
  const ringDiameter = 12.5; // mm on the window plane at the reference eye distance (0.21 m) — ≈ 3.4°, game-readable
  const quad = ringDiameter / 0.66; // the pattern spans 66 % of the texture
  const reticle = new THREE.Mesh(plane(quad, quad), reticleMat);
  reticle.name = 'HoloReticle';
  reticle.position.set(0, H.winCY * MM, (-half + H.reticleInset) * MM);
  neverCastShadow(reticle);
  group.add(reticle);

  const aimLocal = new THREE.Vector3(0, H.winCY * MM, (-half + H.reticleInset) * MM);
  group.updateMatrix();
  aimLocal.applyMatrix4(group.matrix); // → gunRoot space (attachments group is identity)

  return {
    group,
    aimLocal,
    reticle,
    glass: [frontGlass, rearGlass],
    setVisible(v) {
      group.visible = v;
    },
    setBrightness(v) {
      reticleMat.uniforms.uIntensity.value = 9.0 * v;
    },
    setEyeRelief(d) {
      reticleMat.uniforms.uRefDist.value = d;
    },
  };
}
