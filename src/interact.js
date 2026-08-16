// Raycast interaction system: hover highlight, prompt, E to use.
// Owner: player agent. Rooms register interactables with stable ids.

import * as THREE from 'three';
import * as C from './collision.js';

export function createInteract(camera, hud) {
  const registry = []; // {id, prompt(), onUse, root, highlightMats: [{mat, base}]}
  const raycaster = new THREE.Raycaster();
  raycaster.far = 2.5;
  const center = new THREE.Vector2(0, 0);
  let hovered = null;
  let enabled = true;

  function register({ id, prompt, onUse, root, highlight = [] }) {
    const highlightMats = [];
    for (const mesh of highlight) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat.emissive !== undefined) {
          highlightMats.push({ mat, base: mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 1 });
          mat.userData.noMerge = true;
        }
      }
    }
    registry.push({ id, prompt, onUse, root, highlightMats, hover: 0, ignore: null });
  }

  // collision boxes that overlap the interactable's own bounds don't occlude it
  const _bb = new THREE.Box3();
  function ignoreSetFor(entry) {
    if (entry.ignore) return entry.ignore;
    entry.root.updateWorldMatrix(true, true);
    _bb.setFromObject(entry.root);
    _bb.expandByScalar(0.12);
    const set = new Set();
    const boxes = C.getBoxes();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.minX <= _bb.max.x && b.maxX >= _bb.min.x &&
          b.minY <= _bb.max.y && b.maxY >= _bb.min.y &&
          b.minZ <= _bb.max.z && b.maxZ >= _bb.min.z) set.add(i);
    }
    entry.ignore = set;
    return set;
  }

  // occlusion: does any collision box block segment cam->point (rough)
  const _dir = new THREE.Vector3();
  function occluded(camPos, point, dist, ignoreSet) {
    _dir.copy(point).sub(camPos).normalize();
    const allBoxes = C.getBoxes();
    for (let bi = 0; bi < allBoxes.length; bi++) {
      const b = allBoxes[bi];
      if (b.walkable) continue;
      if (ignoreSet && ignoreSet.has(bi)) continue;
      // slab test
      let tmin = 0, tmax = dist - 0.12;
      let ok = true;
      const p = [camPos.x, camPos.y, camPos.z];
      const d = [_dir.x, _dir.y, _dir.z];
      const mn = [b.minX + 0.02, b.minY + 0.02, b.minZ + 0.02];
      const mx = [b.maxX - 0.02, b.maxY - 0.02, b.maxZ - 0.02];
      for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-8) {
          if (p[i] < mn[i] || p[i] > mx[i]) { ok = false; break; }
        } else {
          let t1 = (mn[i] - p[i]) / d[i], t2 = (mx[i] - p[i]) / d[i];
          if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
          tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
          if (tmin > tmax) { ok = false; break; }
        }
      }
      if (ok && tmin < tmax && tmin > 0.05 && tmin < dist - 0.1) return true;
    }
    return false;
  }

  const camPos = new THREE.Vector3();
  function update(dt, playerEnabled) {
    let target = null;
    if (enabled && playerEnabled) {
      raycaster.setFromCamera(center, camera);
      camera.getWorldPosition(camPos);
      let best = null, bestDist = 1e9;
      for (const entry of registry) {
        const hits = raycaster.intersectObject(entry.root, true).filter((h) => !h.object.userData.noRaycast);
        if (hits.length && hits[0].distance < bestDist) {
          best = entry; bestDist = hits[0].distance;
          best._hitPoint = hits[0].point;
        }
      }
      if (best && !occluded(camPos, best._hitPoint, bestDist, ignoreSetFor(best))) target = best;
    }
    if (target !== hovered) {
      hovered = target;
      hud.setPrompt(hovered ? (typeof hovered.prompt === 'function' ? hovered.prompt() : hovered.prompt) : null);
    } else if (hovered) {
      // prompt may change (toggles)
      hud.setPrompt(typeof hovered.prompt === 'function' ? hovered.prompt() : hovered.prompt);
    }
    // hover pulse on highlight materials
    for (const entry of registry) {
      const want = entry === hovered ? 1 : 0;
      entry.hover += (want - entry.hover) * Math.min(1, dt * 8);
      if (entry.hover > 0.003) {
        const pulse = 1 + entry.hover * (0.5 + 0.22 * Math.sin(performance.now() * 0.006));
        for (const { mat, base } of entry.highlightMats) mat.emissiveIntensity = base * pulse;
      } else {
        for (const { mat, base } of entry.highlightMats) mat.emissiveIntensity = base;
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && hovered && enabled) {
      hovered.onUse();
    }
  });

  return {
    register,
    update,
    trigger(id) {
      const entry = registry.find((r) => r.id === id);
      if (!entry) return false;
      entry.onUse();
      return true;
    },
    getHoveredId: () => (hovered ? hovered.id : null),
    setEnabled(v) { enabled = v; if (!v) { hovered = null; hud.setPrompt(null); } },
    list: () => registry.map((r) => r.id),
  };
}
