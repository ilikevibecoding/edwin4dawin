import * as THREE from 'three';
import { RAIL, PartsBuilder, railClampShape, extrude, rbox, cylX, cylY, cylZ, knurlY, knurlZ } from './lib.js';

/**
 * AN/PEQ-15 style laser / illuminator box on the handguard's RIGHT side rail (3 o'clock), so nothing rises
 * into the holo sight line. Built in the device's own frame (+Y = its top, -Z = front, +X = its right) and
 * rotated so its base clamps the side rail and its left face looks up at the shooter. mm.
 */
export function buildLaserBox(game, rig, mats, atlas, { zCentre = -0.2395 } = {}) {
  const group = new THREE.Group();
  group.name = 'LaserBox';
  group.position.set(RAIL.sideX, RAIL.sideY, zCentre);
  group.rotation.z = -Math.PI / 2; // device +Y → gunRoot +X
  rig.attachments.add(group);

  const b = new PartsBuilder('PEQ');
  const BW = 71; // width (across the rail when top-mounted → vertical here)
  const BH = 41; // height off the rail
  const BL = 117;
  const baseTop = 5;
  const bodyY = baseTop + BH / 2;

  // rail clamp (side rails on this handguard are plain 13.8 × 3.8 mm strips → straight jaws)
  b.add(extrude(railClampShape({ halfWidth: 15, height: baseTop + 1, flangeHalf: 8.95, hookDepth: 4.3, jawDepth: 4.6, jawInner: 8.7 }), 72, { bevel: 0.8 }), mats.anod, {
    pos: [0, 0, 4],
    wear: 0.45,
  });
  for (const z of [-20, 28]) {
    b.add(cylX(2.4, 30), mats.steel, { pos: [1, -2.2, z] });
    b.add(cylX(5.0, 3.6, 24), mats.steel, { pos: [15 + 1.8, -2.2, z] }); // slotted thumb screws (face down on the gun)
    b.add(rbox(1.3, 7.5, 1.0, 0.25), mats.matte, { pos: [15 + 3.6, -2.2, z] });
    b.add(cylX(3.6, 1.8, 6), mats.steel, { pos: [-(15 + 0.9), -2.2, z] });
  }

  // body: main block + a slightly narrower rear cap + front bezel plate
  b.add(rbox(BW, BH, BL - 14, 4.5, 3), mats.anod, { pos: [0, bodyY, -7], wear: 0.5 });
  b.add(rbox(BW - 6, BH - 4, 22, 3.5), mats.anod, { pos: [0, bodyY - 1, BL / 2 - 11 + 1], wear: 0.5 });
  b.add(rbox(BW - 4, BH - 3, 3.0, 2.0), mats.anod, { pos: [0, bodyY, -BL / 2 - 0.4], wear: 0.55 });
  // front: illuminator with knurled focus ring + two laser apertures
  b.add(knurlZ(9.6, 6.5, 30, 0.5), mats.anod, { pos: [-19, 21, -BL / 2 - 3.2] });
  b.add(cylZ(8.2, 1.4, 28), mats.matte, { pos: [-19, 21, -BL / 2 - 6.6] });
  b.add(cylZ(6.0, 0.6, 24), mats.lens, { pos: [-19, 21, -BL / 2 - 7.1] });
  for (const x of [8, 24]) {
    b.add(cylZ(4.4, 3.2, 20), mats.anod, { pos: [x, 33, -BL / 2 - 1.6] });
    b.add(cylZ(3.2, 0.8, 16), mats.matte, { pos: [x, 33, -BL / 2 - 3.4] });
    b.add(cylZ(2.2, 0.4, 12), mats.lens, { pos: [x, 33, -BL / 2 - 3.8] });
  }
  // top: two adjustment turrets with slotted caps, mode-selector knob with pointer, rubber pressure pad
  for (const z of [-24, -8]) {
    b.add(cylY(5.6, 3.6, 24), mats.anod, { pos: [18, baseTop + BH + 1.6, z] });
    b.add(cylY(4.4, 0.8, 20), mats.steel, { pos: [18, baseTop + BH + 3.6, z] });
    b.add(rbox(1.2, 0.8, 6.5, 0.25), mats.matte, { pos: [18, baseTop + BH + 4.1, z] });
  }
  b.add(knurlY(7.6, 5.5, 20, 0.6), mats.anod, { pos: [-18, baseTop + BH + 2.6, 34] });
  b.add(rbox(2.2, 1.2, 7.5, 0.4), mats.steel, { pos: [-18, baseTop + BH + 5.6, 31.5] });
  b.add(rbox(15, 3.4, 10, 1.6), mats.rubber, { pos: [16, baseTop + BH + 1.2, 34] });
  // left face (looks up at the shooter): battery door + cable jack; rear: remote port
  b.add(rbox(1.6, 22, 30, 1.2), mats.anod, { pos: [-BW / 2 - 0.3, bodyY - 2, 28], wear: 0.45 });
  b.add(cylX(2.4, 1.2, 14), mats.steel, { pos: [-BW / 2 - 1.3, bodyY - 2, 40] });
  b.add(cylZ(3.6, 3.0, 18), mats.steel, { pos: [-20, 26, BL / 2 + 1.2] });
  b.add(cylZ(2.4, 0.8, 12), mats.matte, { pos: [-20, 26, BL / 2 + 2.9] });
  b.build(group);

  // Labels on the up-facing (device-left) side. Text runs along the barrel, letters' top toward the shooter.
  const labels = new PartsBuilder('PEQLabels');
  const upFace = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0)));
  const lx = -BW / 2 - 0.12;
  labels.add(
    atlas.decal(30, 11, (ctx, w, h, ppm) => {
      ctx.fillStyle = '#d8b437';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, w, h * 0.3);
      ctx.fillStyle = '#d8b437';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${2.1 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('DANGER', w / 2, h * 0.15);
      ctx.fillStyle = '#141414';
      ctx.font = `bold ${1.35 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('INVISIBLE LASER RADIATION', w / 2, h * 0.47);
      ctx.font = `${1.2 * ppm}px Arial, Helvetica, sans-serif`;
      ctx.fillText('AVOID DIRECT EYE EXPOSURE', w / 2, h * 0.66);
      ctx.fillText('CLASS 3B LASER PRODUCT', w / 2, h * 0.84);
      // laser burst symbol
      ctx.beginPath();
      ctx.arc(w * 0.09, h * 0.62, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.91, h * 0.62, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }),
    atlas.material,
    { pos: [lx, 14, -14], quat: upFace },
  );
  labels.add(atlas.text(40, 6, ['AN/PEQ-15  ATPIAL', 'NSN 5855-01-534-5931'], { size: 1.9, color: '#80848a', align: 'left' }), atlas.material, { pos: [lx, 34, -14], quat: upFace });
  labels.add(atlas.text(14, 4, 'REMOTE', { size: 1.6, color: '#6f7378' }), atlas.material, { pos: [-20, 32, BL / 2 + 1 + 0.12], rot: [0, 0, 0] });
  labels.build(group, { castShadow: false });

  return { group };
}
