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
  const lw = size * 0.024;
  const tick = size * 0.032;
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
    ctx.arc(cx, cy, size * 0.02 + widen * 0.5, 0, Math.PI * 2);
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

  // --- mount: clamp base + two cross-bolts with slotted thumb nuts (right) and hex nuts (left)
  const clamp = railClampShape({ halfWidth: 12.5, height: H.lowerY0 + 1.5, jawDepth: 5.9, hookDepth: 5.3 });
  b.add(extrude(clamp, 64, { bevel: 0.8 }), mats.anod, { pos: [0, 0, 8], wear: 0.5 });
  for (const z of [22, -8]) {
    b.add(cylX(3.0, 31), mats.steel, { pos: [1.5, -3.0, z] });
    b.add(cylX(6.2, 4.5, 24), mats.steel, { pos: [12.5 + 2.4, -3.0, z] });
    b.add(rbox(1.4, 9.5, 1.2, 0.3), mats.matte, { pos: [12.5 + 4.7, -3.0, z] }); // screwdriver slot
    b.add(cylX(4.2, 2.2, 6), mats.steel, { pos: [-(12.5 + 1.1), -3.0, z] });
  }

  // --- lower housing (electronics + battery), slightly narrower at the rear third
  b.add(rbox(H.lowerW, H.lowerY1 - H.lowerY0, H.length - 30, 3.2), mats.anod, { pos: [0, (H.lowerY0 + H.lowerY1) / 2, -15], wear: 0.45 });
  b.add(rbox(H.lowerW - 6, H.lowerY1 - H.lowerY0 - 2, 36, 3.0), mats.anod, { pos: [0, (H.lowerY0 + H.lowerY1) / 2 - 1, half - 18], wear: 0.45 });
  // hood base "sill" (0.3 mm proud of the housing top so no face is coplanar)
  b.add(rbox(H.hoodW + 2, 3.3, H.length - 2, 1.0), mats.anod, { pos: [0, H.lowerY1 - 1.35, 0], wear: 0.4 });

  // --- hood: rounded-top tube with a rectangular channel, front and rear frame plates (raised bezels) with apertures
  // bottom corners sit inside the sill; their radius must stay >= the extrude bevel (see lib.extrude)
  const hoodOuter = (shape, inset = 0) =>
    roundedRect(H.hoodW - inset * 2, H.hoodY1 - H.hoodY0 - inset, [9 - inset, 9 - inset, 1.8 - inset, 1.8 - inset], shape, 0, (H.hoodY0 + H.hoodY1) / 2 - inset / 2);
  const tube = hoodOuter(new THREE.Shape(), 0.35);
  tube.holes.push(roundedRect(H.winW + 1, H.winH + 1.5, [8.5, 8.5, 1.2, 1.2], new THREE.Path(), 0, H.winCY + 0.25));
  b.add(extrude(tube, H.length - 2 * H.frameT + 2, { bevel: 0.5, curveSegments: 8 }), mats.anod, { pos: [0, 0, 0], wear: 0.5 });
  const bezelZ = half - H.frameT / 2 + 0.4;
  const front = hoodOuter(new THREE.Shape());
  front.holes.push(roundedRect(H.winW, H.winH, [8, 8, 1.6, 1.6], new THREE.Path(), 0, H.winCY));
  b.add(extrude(front, H.frameT, { bevel: 1.1, curveSegments: 10 }), mats.anod, { pos: [0, 0, -bezelZ], wear: 0.6 });
  const rear = hoodOuter(new THREE.Shape());
  rear.holes.push(roundedRect(H.rearW, H.rearH, [8, 8, 1.6, 1.6], new THREE.Path(), 0, H.winCY));
  b.add(extrude(rear, H.frameT, { bevel: 1.1, curveSegments: 10 }), mats.anod, { pos: [0, 0, bezelZ], wear: 0.6 });
  // roof rib + screws
  b.add(rbox(7, 1.6, 62, 0.6), mats.anod, { pos: [0, H.hoodY1 + 0.5, 4], wear: 0.6 });
  for (const z of [-30, 30]) {
    for (const x of [-15, 15]) {
      b.add(cylY(2.0, 1.2, 12), mats.steel, { pos: [x, H.hoodY1 + 0.5, z] });
      b.add(cylY(0.9, 0.6, 6), mats.matte, { pos: [x, H.hoodY1 + 1.05, z] });
    }
  }
  // hood interior: matte black liner (sits inside the channel, hides the anodised interior walls)
  const liner = roundedRect(H.winW + 0.9, H.winH + 1.4, [8.4, 8.4, 1.2, 1.2], new THREE.Shape(), 0, H.winCY + 0.25);
  liner.holes.push(roundedRect(H.winW - 0.4, H.winH - 0.2, [8.2, 8.2, 1.0, 1.0], new THREE.Path(), 0, H.winCY + 0.25));
  b.add(extrude(liner, H.length - 2 * H.frameT - 1, { bevel: 0 }), mats.matte, { pos: [0, 0, 0] });

  // --- left side: control panel with two arrow buttons + ON / OFF etching (as on the reference)
  const px = -H.lowerW / 2; // -27
  b.add(rbox(48, 17, 1.8, 1.6), mats.anod, { pos: [px - 0.6, 19, -12], wear: 0.45 });
  const btnY = 17.6;
  for (const z of [-22, -2]) {
    b.add(rbox(10.5, 10.5, 2.6, 2.4), mats.rubber, { pos: [px - 2.2, btnY, z] });
  }
  // --- right side: model label plate + battery compartment bulge with a knurled cap
  b.add(rbox(38, 12, 1.4, 1.0), mats.anod, { pos: [-px + 0.4, 21, -8], wear: 0.4 });
  b.add(cylX(9.0, 6, 32), mats.anod, { pos: [-px - 1, 18.5, -half + 12], wear: 0 });
  b.add(knurlX(9.3, 3.2, 30, 0.45), mats.anod, { pos: [-px + 3.4, 18.5, -half + 12] });
  b.add(rbox(14, 2.6, 2.0, 0.6), mats.steel, { pos: [-px + 5.4, 18.5, -half + 12] });
  // --- front face: battery latch lever, sensor window
  b.add(rbox(16, 6, 3.0, 1.2), mats.anod, { pos: [12, 14, -half - 1.0], wear: 0.5 });
  b.add(cylZ(2.2, 1.2, 16), mats.matte, { pos: [-14, 18, -half - 0.4] });
  // --- rear face: NV button (rubber) and a small recessed label plate
  b.add(cylZ(4.6, 2.4, 24), mats.rubber, { pos: [17, 19, half + 0.6] });
  b.add(rbox(20, 5.2, 1.0, 0.6), mats.anod, { pos: [-8, 13.2, half + 0.3], wear: 0.3 });

  b.build(group);

  // --- labels (decals in the shared atlas)
  const labels = new PartsBuilder('HoloLabels');
  const etch = '#aeb2b8';
  const arrow = (dir) => (ctx, w, h) => {
    ctx.fillStyle = '#c9ccd1';
    ctx.beginPath();
    const cx = w / 2;
    const cy = h / 2;
    const s = Math.min(w, h) * 0.34;
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
  const leftFace = px - 2.2 - 1.3 - 0.12;
  labels.add(atlas.decal(8, 8, arrow('down')), atlas.material, { pos: [leftFace, btnY, -22], rot: [0, -Math.PI / 2, 0] });
  labels.add(atlas.decal(8, 8, arrow('up')), atlas.material, { pos: [leftFace, btnY, -2], rot: [0, -Math.PI / 2, 0] });
  const panelFace = px - 0.6 - 0.9 - 0.12;
  labels.add(atlas.text(10, 4, 'ON', { size: 2.6, color: etch }), atlas.material, { pos: [panelFace, 25.2, -2], rot: [0, -Math.PI / 2, 0] });
  labels.add(atlas.text(12, 4, 'OFF', { size: 2.6, color: etch }), atlas.material, { pos: [panelFace, 25.2, -22], rot: [0, -Math.PI / 2, 0] });
  labels.add(atlas.text(20, 3.2, 'NV   -   BRT', { size: 1.7, color: etch }), atlas.material, { pos: [panelFace, 12.2, -12], rot: [0, -Math.PI / 2, 0] });
  const rightFace = -px + 0.4 + 0.7 + 0.12;
  labels.add(atlas.text(36, 10, ['HWS 553  -  68 MOA / 1 MOA', 'HOLOGRAPHIC WEAPON SIGHT', 'S/N 1147-A03  -  CR123 3V'], { size: 1.9, color: etch }), atlas.material, {
    pos: [rightFace, 21, -8],
    rot: [0, Math.PI / 2, 0],
  });
  labels.add(atlas.text(19, 4.4, ['CAUTION - LASER RADIATION', 'CLASS 2   DO NOT STARE'], { size: 1.0, color: '#8f8a6e' }), atlas.material, {
    pos: [-8, 13.2, half + 0.8 + 0.12],
    rot: [0, 0, 0],
  });
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
