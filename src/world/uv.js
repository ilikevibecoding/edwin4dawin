// World-space UV baking (lead infrastructure).
// Merged/batched geometry gets UVs projected from vertex positions along the
// dominant normal axis, so textures tile at true meter scale across faces of
// any size (1 UV unit = 1 meter by default; per-material scale comes from
// MATERIAL_TILE_METERS via getUvScale()).

export function bakeWorldUvs(geometry, metersPerTile = 1) {
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  if (!pos || !nor) return geometry;
  const uv = new Float32Array(pos.count * 2);
  const s = 1 / metersPerTile;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }        // floors/ceilings
    else if (nx >= nz) { u = z; v = y; }               // east/west faces
    else { u = x; v = y; }                             // north/south faces
    uv[i * 2] = u * s;
    uv[i * 2 + 1] = v * s;
  }
  geometry.setAttribute('uv', new (Object.getPrototypeOf(pos).constructor)(uv, 2));
  return geometry;
}
