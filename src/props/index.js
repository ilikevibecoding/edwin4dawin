// Prop system entry (Fable 3 domain). The mission calls placeProps() once during build, after
// the map exists and BEFORE the navgrid bakes (props with blockMove colliders shape navigation).
export function placeProps(scene, world, map) {
  // Filled by the Fable 3 work package: per-room furniture, electronics, utility objects,
  // clutter, signage, decals — registered via registerAsset() with collision where appropriate.
}
