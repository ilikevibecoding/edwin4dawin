import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Save the ship as a .glb so she can be dropped into Blender, Unity, a game
 * engine or an <model-viewer> tag. The clone is flattened to a neutral pose and
 * stripped of runtime userData (which holds live object references).
 */
export function exportShip(ship, filename = 'pirate-ship.glb') {
  const clone = ship.root.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);

  const lights = [];
  clone.traverse((object) => {
    object.userData = {};
    // Object3D.clone() shares geometry with the live scene, so the runtime
    // animation data has to be dropped on a copy rather than in place.
    if (object.geometry && Object.keys(object.geometry.userData).length > 0) {
      object.geometry = object.geometry.clone();
      object.geometry.userData = {};
    }
    if (object.isLight) lights.push(object);
  });
  for (const light of lights) light.removeFromParent();
  clone.updateMatrixWorld(true);

  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      clone,
      (result) => {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve(blob.size);
      },
      reject,
      { binary: true, onlyVisible: true },
    );
  });
}
