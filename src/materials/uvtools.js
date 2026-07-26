// UV tooling (Fable 3 domain, shared interface): world-scale planar UV projection so tileable
// textures map at 1 texture-repeat per `metersPerTile` meters regardless of geometry size.
export function worldUVs(geometry, metersPerTile = 1, offset = { x: 0, y: 0, z: 0 }) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  if (!pos || !nor || !uv) return geometry;
  const s = 1 / metersPerTile;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i) + offset.x, y = pos.getY(i) + offset.y, z = pos.getZ(i) + offset.z;
    if (ny >= nx && ny >= nz) uv.setXY(i, x * s, z * s);
    else if (nx >= nz) uv.setXY(i, z * s, y * s);
    else uv.setXY(i, x * s, y * s);
  }
  uv.needsUpdate = true;
  return geometry;
}
