// ---------------------------------------------------------------------------
// Where things are, in one place.
//
// The route is: hero truck on the spur -> the junction -> out along the graded
// mainline -> the campground beside it -> on into open savanna -> the lions.
// Every module that puts something in the world reads its anchor from here, in
// road parameters rather than world coordinates, so the layout survives the road
// being re-drawn and so nothing has to know anything about anything else's
// geometry.
//
// `road` is 'trail' (the spur the truck starts on, terrain.roadPoint) or 'main'
// (the graded mainline, terrain.mainPoint). `side` is the sign of the lateral
// offset: +1 is the road's left as you drive with increasing t.
// ---------------------------------------------------------------------------

export const WORLD = {
  /** Where the drive starts, and where every beauty view is shot from. */
  start: { road: 'trail', t: 0.42 },

  /**
   * The campground. A graded clearing beside the mainline, a short drive past
   * the junction, big enough for a dozen vehicles and their camp without any of
   * it standing in the road.
   */
  camp: { road: 'main', t: 0.6, side: -1, offset: 34, radius: 40 },

  /** Where the trees thin out and the grassland opens. */
  savanna: { road: 'main', tFrom: 0.7 },

  /** The pride. Off the road on the open side, in sight of it. */
  lions: { road: 'main', t: 0.84, side: 1, offset: 26, spread: 22 },
};

/** World position for an anchor, using whichever road it names. */
export function anchorPoint(terrain, a, { offset = a.offset ?? 0, side = a.side ?? 1, t = a.t } = {}) {
  const point = a.road === 'main' && terrain.mainPoint ? terrain.mainPoint(t) : terrain.roadPoint(t);
  const tan = a.road === 'main' && terrain.mainTangent ? terrain.mainTangent(t) : terrain.roadTangent(t);
  // lateral is the tangent turned a quarter left
  const lx = -tan.z;
  const lz = tan.x;
  const x = point.x + lx * offset * side;
  const z = point.z + lz * offset * side;
  return { x, y: terrain.heightAt(x, z), z, tx: tan.x, tz: tan.z, lx, lz };
}
