import * as THREE from 'three';

// Dust motes and a few god-ray cards anchored on the Jeep, not the world
// origin-as-empty-field. Previous trail demos hid both effects 200 m away.

export function createAtmosphere() {
  const root = new THREE.Group();
  root.name = 'atmosphere';

  const moteCount = 80;
  const positions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = 0.3 + Math.random() * 4.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xe8d2a8,
    size: 0.028,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  root.add(motes);

  const capture = typeof location !== 'undefined' && /capture=1/.test(location.search);
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe2b4,
    transparent: true,
    opacity: capture ? 0 : 0.016,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 7), shaftMat);
    shaft.position.set(-1.2 + i * 1.15, 5.2, 1.2 + i * 0.4);
    shaft.rotation.x = 0.62;
    shaft.rotation.y = 0.28;
    root.add(shaft);
  }

  function update(dt, origin) {
    if (origin) root.position.set(origin.x, 0, origin.z);
    motes.rotation.y += dt * 0.03;
  }

  return { mesh: root, update };
}
