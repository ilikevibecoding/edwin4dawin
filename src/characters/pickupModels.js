// Pickup prop models — owner: Fable 4. Replaces the primitive pickup blocks.
// Contract: buildPickupModel(type) -> THREE.Group, floor pivot, ≤0.4m tall.
// Types: 'medkit' | 'ammo' | 'armor' | 'keycard'

import * as THREE from 'three';

export function buildPickupModel(type) {
  // PLACEHOLDER (PROP-000): simple tinted blocks until the pickup art pass
  const colors = { medkit: 0xd8dee2, ammo: 0x4e5a44, armor: 0x39525c, keycard: 0xd8b74a };
  const sizes = { medkit: [0.34, 0.16, 0.24], ammo: [0.3, 0.2, 0.2], armor: [0.36, 0.1, 0.3], keycard: [0.16, 0.02, 0.1] };
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...(sizes[type] || sizes.ammo)),
    new THREE.MeshStandardMaterial({ color: colors[type] || 0x888888, roughness: 0.55, emissive: type === 'keycard' ? 0x84621a : 0x000000, emissiveIntensity: 0.3 }),
  );
  mesh.position.y = (sizes[type] || sizes.ammo)[1] / 2;
  mesh.castShadow = true;
  g.add(mesh);
  return g;
}
