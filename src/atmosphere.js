import * as THREE from 'three';

// Dust motes and a few god-ray cards anchored on the Jeep, not the world
// origin-as-empty-field. Previous trail demos hid both effects 200 m away.

export function createAtmosphere() {
  const root = new THREE.Group();
  root.name = 'atmosphere';

  const moteCount = 220;
  const positions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = 0.3 + Math.random() * 4.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xffe2b8,
    size: 0.045,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  root.add(motes);

  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffd8a0,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 6; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9), shaftMat);
    shaft.position.set(-2 + i * 0.85, 4.2, -1 + (i % 3) * 1.4);
    shaft.rotation.x = 0.55;
    shaft.rotation.y = 0.35;
    root.add(shaft);
  }

  function update(dt, origin) {
    if (origin) root.position.set(origin.x, 0, origin.z);
    motes.rotation.y += dt * 0.03;
  }

  return { mesh: root, update };
}
