/** Dumps every scene's marks and bounds so staging can be checked without rendering. */
import * as THREE from 'three';
import type { Stage } from '../engine/Stage';
import { buildApartmentScene } from '../world/ApartmentScene';
import { buildInterrogationScene } from '../world/InterrogationScene';
import { buildStreetScene } from '../world/StreetScene';
import type { SceneBuild } from '../world/SceneTypes';

const BUILDERS: Record<string, (s: Stage) => SceneBuild> = {
  street: buildStreetScene,
  apartment: buildApartmentScene,
  interrogation: buildInterrogationScene,
};

export function dumpMarks(stage: Stage) {
  const out: Record<string, unknown> = {};
  for (const [name, build] of Object.entries(BUILDERS)) {
    const b = build(stage);
    const marks: Record<string, number[]> = {};
    for (const [k, m] of Object.entries(b.marks)) {
      marks[k] = [
        Number(m.position.x.toFixed(2)),
        Number(m.position.y.toFixed(2)),
        Number(m.position.z.toFixed(2)),
        Number(THREE.MathUtils.radToDeg(m.yaw).toFixed(0)),
      ];
    }
    const box = new THREE.Box3().setFromObject(b.root);
    out[name] = {
      marks,
      clues: (b.clues ?? []).map((c) => c.id),
      rain: b.rain,
      hasBounds: !!b.cameraBounds,
      bounds: [
        [Number(box.min.x.toFixed(1)), Number(box.min.y.toFixed(1)), Number(box.min.z.toFixed(1))],
        [Number(box.max.x.toFixed(1)), Number(box.max.y.toFixed(1)), Number(box.max.z.toFixed(1))],
      ],
    };
  }
  (window as unknown as { __MARKS__?: unknown }).__MARKS__ = out;
}
