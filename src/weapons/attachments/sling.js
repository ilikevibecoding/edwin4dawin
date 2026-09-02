import * as THREE from 'three';
import { MM, RAIL, PartsBuilder, railClampShape, extrude, rbox, cylX, cylY, torusZ, ribbon, curveFrame } from './lib.js';

/**
 * Two-point sling hardware: a rail-mounted QD socket on the handguard's left rail (front), an ambidextrous
 * QD end-plate socket at the rear of the receiver, two push-button QD swivels with oblong loops, and a slack
 * of 25 mm nylon webbing (ribbon along a CatmullRom curve) hanging under the receiver on the left side,
 * with a tri-glide and an adjuster slider. Static.
 */
export function buildSling(game, rig, mats, atlas) {
  const group = new THREE.Group();
  group.name = 'Sling';
  rig.attachments.add(group);
  const b = new PartsBuilder('Sling');

  // --- front QD socket block clamped to the left side rail (frame: rail face y = 0 → rotate +Y to gunRoot -X)
  const frontZ = -0.278;
  const qFront = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  const frontM = new THREE.Matrix4().compose(new THREE.Vector3(-RAIL.sideX, RAIL.sideY, frontZ), qFront, new THREE.Vector3(1, 1, 1));
  const clampGeo = extrude(railClampShape({ halfWidth: 10, height: 6.5, flangeHalf: 8.95, hookDepth: 4.3, jawDepth: 4.6, jawInner: 8.7 }), 24, { bevel: 0.8 });
  const local = (geo, pos, extraRot = null) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(pos[0] * MM, pos[1] * MM, pos[2] * MM), extraRot || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    return geo.applyMatrix4(m);
  };
  b.add(local(clampGeo, [0, 0, 0]), mats.anod, { matrix: frontM, wear: 0.5 });
  b.add(local(cylY(5.4, 1.4, 24), [0, 6.7, 0]), mats.steel, { matrix: frontM }); // socket insert ring
  b.add(local(cylX(2.2, 22), [0, -2.2, 0]), mats.steel, { matrix: frontM }); // clamp bolt
  b.add(local(cylX(4.2, 3.0, 24), [10 + 1.4, -2.2, 0]), mats.steel, { matrix: frontM });
  b.add(local(cylX(3.2, 1.6, 6), [-(10 + 0.7), -2.2, 0]), mats.steel, { matrix: frontM });

  // --- rear QD end-plate socket on the receiver's rear-left face
  const rearPos = new THREE.Vector3(-0.0185, -0.006, 0.113);
  b.add(rbox(7, 18, 7, 1.4), mats.anod, { pos: [rearPos.x / MM, rearPos.y / MM, rearPos.z / MM], wear: 0.45 });
  b.add(cylX(5.2, 1.2, 24), mats.steel, { pos: [(rearPos.x - 0.0035) / MM - 0.4, rearPos.y / MM, rearPos.z / MM] });

  // --- QD swivels: stem (starts inside the socket) + oblong loop hanging from the stem end
  const swivel = (stemStartX, y, z, stemLen) => {
    const stemEnd = stemStartX - stemLen;
    b.add(cylX(4.3, stemLen, 20), mats.steel, { pos: [stemStartX - stemLen / 2, y, z] });
    b.add(cylX(3.0, 1.0, 16), mats.matte, { pos: [stemEnd - 0.4, y, z] }); // push button
    const loopX = stemEnd - 1.6;
    const loop = torusZ(8, 1.7, 8, 36).rotateY(Math.PI / 2);
    loop.scale(1, 1, 1.85);
    b.add(loop, mats.steel, { pos: [loopX, y - 6.8, z] });
    return new THREE.Vector3(loopX * MM, (y - 6.8 - 8 + 1.7 + 0.9) * MM, z * MM); // strap pass-through point (loop bottom)
  };
  const frontLoop = swivel(-(RAIL.sideX / MM) - 6.5 + 0.5, RAIL.sideY / MM, frontZ / MM, 9.0);
  const rearLoop = swivel(rearPos.x / MM - 3.5 + 0.5, rearPos.y / MM, rearPos.z / MM, 8.0);

  // --- webbing
  const pts = [
    frontLoop.clone().add(new THREE.Vector3(0, 0.006, 0)),
    frontLoop.clone(),
    new THREE.Vector3(-0.050, -0.030, -0.270),
    new THREE.Vector3(-0.041, -0.088, -0.222),
    new THREE.Vector3(-0.030, -0.116, -0.150),
    new THREE.Vector3(-0.025, -0.113, -0.070),
    new THREE.Vector3(-0.024, -0.090, 0.015),
    new THREE.Vector3(-0.027, -0.054, 0.082),
    rearLoop.clone(),
    rearLoop.clone().add(new THREE.Vector3(0, 0.006, 0)),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const strap = new THREE.Mesh(ribbon(curve, 0.025, 0.0018, 110), mats.nylon);
  strap.name = 'SlingStrap';
  strap.castShadow = true;
  strap.receiveShadow = true;
  group.add(strap);

  // tri-glide + adjuster slider, oriented by the strap frame
  const glide = (u, along, thick) => {
    const f = curveFrame(curve, u);
    const m = f.matrix.clone();
    b.add(rbox(thick, along, 30, 1.0), mats.polymer, { matrix: m });
    b.add(rbox(thick + 0.4, 2.2, 30.4, 0.6), mats.polymer, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, along * 0.5 * MM - 1.1 * MM, 0)) });
    b.add(rbox(thick + 0.4, 2.2, 30.4, 0.6), mats.polymer, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -along * 0.5 * MM + 1.1 * MM, 0)) });
  };
  glide(0.36, 34, 4.2);
  glide(0.68, 24, 3.8);
  b.build(group);

  return { group, curve };
}
