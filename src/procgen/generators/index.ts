import type { MaterialId } from '../../core/Contracts';
import type { MaterialSpec } from './types';
import { CONCRETE_SPECS } from './concrete';
import { MASONRY_SPECS } from './masonry';
import { METAL_SPECS } from './metal';
import { WOOD_SPECS } from './wood';
import { GROUND_SPECS } from './ground';
import { MISC_SPECS } from './misc';

export type { MaterialSpec, MaterialParams, PhysicalParams, ResolutionClass } from './types';
export { RESOLUTION_SCALE } from './types';

const ALL: MaterialSpec[] = [
  ...CONCRETE_SPECS,
  ...MASONRY_SPECS,
  ...METAL_SPECS,
  ...WOOD_SPECS,
  ...GROUND_SPECS,
  ...MISC_SPECS,
];

export const MATERIAL_SPECS: ReadonlyMap<MaterialId, MaterialSpec> = new Map(
  ALL.map((spec) => [spec.id, spec] as const),
);

export const MATERIAL_ORDER: readonly MaterialId[] = ALL.map((spec) => spec.id);
