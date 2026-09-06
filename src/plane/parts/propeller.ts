import * as THREE from 'three';
import { Batch, bladeGeometry, partsMaterial, spinnerGeometry, type Surf } from '../geometry';
import { propDiscTexture, SURF } from '../textures';
import { at, type BuildContext } from './context';

export interface PropellerBuild {
  /** spinner + hub (always turning) */
  propHub: THREE.Mesh;
  /** the three blades (hidden at speed, when the blur disc takes over) */
  propBlades: THREE.Mesh;
  /** blur disc on its own slow pivot */
  propDisc: THREE.Mesh;
}

/** Spinner + hub and the three blades on the `propeller` group, the blur disc on `propDiscPivot` (both groups are the model's). */
export function buildPropeller(ctx: BuildContext, propeller: THREE.Group, propDiscPivot: THREE.Group): PropellerBuild {
  const { mesh, root, materials } = ctx;
  const { parts } = ctx.mat;
  // ------------------------------------------------------------ propeller: spinner + hub, 3 blades, blur disc
  propeller.position.set(4.62, 0.02, 0);
  root.add(propeller);
  // ogival polished spinner over a dark hub barrel; the blade shanks emerge from the barrel's rim
  const hub = new Batch();
  hub.add(spinnerGeometry(0.27, 0.58, 28), at([0.0, 0, 0]), SURF.spinner);
  hub.add(new THREE.CylinderGeometry(0.27, 0.29, 0.18, 28), at([-0.09, 0, 0], [0, 0, Math.PI / 2]), SURF.darkMetal);
  const propHub = mesh(hub.build(), parts, { parent: propeller, receive: false });
  // three blades: round shank at the hub, widest chord around 40 % radius, elliptically rounded tips; the outer
  // 0.17 m of each blade is painted yellow (per-vertex, so the tip band follows the rounded planform)
  const blades = new Batch();
  const BLADE_L = 1.32, BLADE_ROOT = 0.16;
  const bladeGeo = bladeGeometry(BLADE_L, 0.17, 0.10);
  const bladeSurf = (_x: number, y: number, z: number): Surf => (Math.hypot(y, z) > BLADE_ROOT + BLADE_L - 0.17 ? SURF.propTip : SURF.prop);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Matrix4().makeRotationX((i / 3) * Math.PI * 2);
    blades.add(bladeGeo, pivot.clone().multiply(new THREE.Matrix4().makeTranslation(0, BLADE_ROOT, 0)), bladeSurf);
  }
  // the blades get their own parts material so they can fade as the RPM rises (animate() cross-fades them with
  // the blur disc between ~500 and ~1200 RPM); drawn just before the disc so the disc composites over them
  const bladeMat = partsMaterial();
  bladeMat.transparent = true;
  materials.push(bladeMat);
  const propBlades = mesh(blades.build(), bladeMat, { parent: propeller, receive: false });
  propBlades.renderOrder = 14;
  const discMat = new THREE.MeshStandardMaterial({ map: propDiscTexture(), transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.0, color: 0xffffff });
  materials.push(discMat);
  // The disc hangs off its own pivot at the hub, not off the spinning propeller group: rotating a texture
  // with ghost sectors and a tip glint at 2500 RPM turns ~250 degrees per 60 Hz frame and strobed as a
  // flicker at the nose. The pivot turns slowly so the blur pattern still drifts.
  const propDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), discMat);
  propDisc.rotation.y = Math.PI / 2;
  propDisc.position.x = 0.05;
  propDisc.renderOrder = 15;
  propDiscPivot.position.copy(propeller.position);
  propDiscPivot.add(propDisc);
  root.add(propDiscPivot);
  return { propHub, propBlades, propDisc };
}
