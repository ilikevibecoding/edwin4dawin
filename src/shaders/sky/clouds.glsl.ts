/**
 * Raymarched volumetric clouds.
 *
 * Density is Perlin-Worley fBm from a tiling 3D volume, carved by a weather map
 * (coverage / type / precipitation) and a per-type vertical profile, then eroded
 * on the edges by a second high-frequency volume. Lighting is Beer's law along
 * a cone toward the sun, a dual-lobe Henyey-Greenstein phase for the forward
 * silver lining and the backward wash, a powder term for the dark edges of
 * front-lit clouds, and three energy-conserving multiple-scattering octaves
 * (Wrenninge's approximation) so thick cloud interiors are not black.
 *
 * The march runs at a fraction of screen resolution with a per-frame dithered
 * start offset and is accumulated temporally; see composite.glsl.ts.
 */
export const CLOUD_COMMON_GLSL = /* glsl */ `
#ifndef SKY_CLOUDS_INCLUDED
#define SKY_CLOUDS_INCLUDED

uniform sampler3D uCloudShape;
uniform sampler3D uCloudDetail;
uniform sampler2D uWeatherTex;

uniform float uCloudBottom;
uniform float uCloudTop;
uniform float uCloudCoverage;
/** Measured threshold on the coverage field for the current cover setting. */
uniform float uCloudCoverLo;
uniform float uCloudTypeBias;
uniform float uCloudTypeVariance;
uniform float uCloudExtinction;
uniform float uCloudDensity;
uniform float uCloudShapeScale;
uniform float uCloudDetailScale;
uniform float uCloudErosion;
uniform float uCloudWeatherScale;
uniform vec3 uCloudWind;
uniform vec3 uCloudWind2;
/** Kilometres the coverage lookup slides between layer base and top. */
uniform vec2 uCloudShear;
uniform vec2 uWeatherOffset;
uniform vec2 uWeatherOffset2;
uniform float uCloudEvolve;
uniform float uCloudSteps;
uniform float uCloudLightSteps;
uniform float uCloudMaxDist;
uniform vec3 uCloudAmbient;
uniform vec3 uCloudGroundBounce;
uniform vec3 uCloudHorizonLight;
uniform vec3 uCloudSunRadiance;
/** Downwelling irradiance at the top of the layer: sun plus sky above the deck. */
uniform vec3 uCloudTopLight;
uniform float uCloudPowder;
uniform float uCloudPhaseG;
uniform float uCloudBackG;
uniform float uCloudMultiScatter;
uniform float uCloudAnvil;
/** Camera world position in kilometres, so the field stays put as we walk. */
uniform vec2 uCamWorldXZ;
/** 0 off, 1 air transmittance, 2 hit range, 3 cloud opacity. See CLOUD_MARCH_FRAG. */
uniform float uCloudDebug;

/* -------------------------------- fields -------------------------------- */

vec4 cloudWeather(vec2 xz) {
  vec2 uv0 = (xz + uWeatherOffset) * uCloudWeatherScale;
  vec2 uv1 = (xz * 0.61 + uWeatherOffset2) * uCloudWeatherScale;
  vec4 a = texture2D(uWeatherTex, uv0);
  vec4 b = texture2D(uWeatherTex, uv1);
  vec4 w = a;
  /* Two scrolls at different rates and scales, so the field grows and dissolves
     instead of sliding past as a rigid pattern. The second layer *modulates* the
     first rather than adding to it: added, its mean becomes a floor under the
     whole map, the clear lanes fill in, and every cover setting above a third
     reads as unbroken overcast.
     
     Every combination here stays inside (0,1) by construction rather than by a
     clamp, for the same reason the bake avoids one: a clamp makes plateaus, and a
     plateau in a field of x and z is a cloud with vertical sides. */
  w.r = a.r * (0.42 + 0.58 * b.b);
  w.g = a.g * 0.7 + b.g * 0.3;
  w.a = a.a * 0.7 + b.a * 0.3;
  return w;
}

/**
 * Local coverage from the weather field and the global cover setting.
 *
 * Cover biases the field rather than scaling it. Scaling (\`weather.r * cover\`)
 * is the obvious formulation and it is wrong: at cover 0.25 it multiplies the
 * whole field down to a quarter, the erosion threshold then rejects all of it,
 * and a "light cloud" setting renders an empty sky. Sliding a threshold instead
 * thins the field from its edges inward, so low cover leaves a few isolated
 * cells at full local density — a scattered-cumulus sky — and only high cover
 * fills in. Above 0.7 a floor rises under it, because overcast is a lid rather
 * than a pattern and must not keep the field's holes.
 */
float cloudCoverageAt(float w) {
  float g = uCloudCoverage;
  /* The threshold is measured rather than fitted: calibrateCover in CloudVolume
     bisects it against the baked field so that the covered fraction comes out
     equal to the cover setting. See the note there. */
  float lo = uCloudCoverLo;
  float local = clamp((w - lo) / max(1.0 - lo, 0.12), 0.0, 1.0);
  /* The floor under an overcast lid has to leave room for the deck to *thin*.
     Raise it too far and every column saturates at the same optical depth, and a
     stratus deck then renders as one flat fill — which is a thing no photograph
     of an overcast sky has ever looked like. */
  return clamp(mix(local * 0.85, 0.46 + local * 0.54, smoothstep(0.7, 1.0, g)), 0.0, 1.0);
}

/** Vertical density profile per cloud type: 0 cirrus, 0.5 cumulus, 1 stratus. */
float cloudHeightGradient(float h, float type) {
  float cirrus = smoothstep(0.42, 0.62, h) * (1.0 - smoothstep(0.70, 0.96, h));
  /* The cumulus base turns on inside seven per cent of the layer — 150 metres of
     a two-kilometre one. Condensation happens at the lifting condensation level,
     which is a property of the air mass rather than of the cloud, so a whole field
     of them shares one base plane; a soft ramp instead gives every cloud a fuzzy
     underside and the field loses the flat bottoms that identify it on sight. */
  float cumulus = smoothstep(0.0, 0.07, h) * (1.0 - smoothstep(0.52, 0.96, h));
  float stratus = smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.30, 0.62, h));
  return type < 0.5 ? mix(cirrus, cumulus, type * 2.0) : mix(cumulus, stratus, (type - 0.5) * 2.0);
}

/**
 * Vertical squash on the shape lookup.
 *
 * A cell of the coverage field is a *column*, and the shape volume sampled
 * isotropically at the cell's own scale varies barely once over the depth of the
 * layer. Both facts point the same way: the density becomes a slab with a flat
 * top and a flat bottom, which is the most artificial thing a cloud layer can
 * do. Sampling the volume faster in y than in xz gives every cell two or three
 * bubbles stacked inside it, which is what a cumulus tower actually is.
 *
 * Modest, though. Past about 1.5 the field varies faster vertically than
 * horizontally and the towers come out as vertical fingers — a cumulus is wider
 * than it is tall, and so are the billows inside it.
 */
const float CLOUD_Y_SQUASH = 1.35;

/**
 * Cloud density at a world-space point in kilometres. \`hFrac\` is the
 * normalised height inside the layer; the caller computes it because the screen
 * march works on a curved shell while the shadow map treats the layer as flat.
 */
/**
 * Horizontal offset of the coverage lookup with height: the layer shears, so a
 * cell is a leaning column rather than an upright one.
 *
 * Real convective cloud leans downwind — the base sits in slower air than the
 * top — and the lean is worth having for a reason beyond accuracy: an upright
 * column has a vertical silhouette from every direction, and vertical is the one
 * edge orientation that reads as artificial. \`uCloudWind\` already carries the
 * accumulated drift, so its direction is free.
 */
vec2 cloudShear(float hFrac) {
  return uCloudShear * (hFrac - 0.35);
}

float cloudDensity(vec3 wp, float hFrac, vec4 weather, bool detail, float lod) {
  if (hFrac <= 0.0 || hFrac >= 1.0) return 0.0;

  vec3 p = wp + uCloudWind;
  vec3 sp = vec3(p.x, p.y * CLOUD_Y_SQUASH, p.z) * uCloudShapeScale
          + vec3(0.0, uCloudEvolve, 0.0);
  vec4 shape = texture(uCloudShape, sp);

  float lowFbm = shape.g * 0.625 + shape.b * 0.25 + shape.a * 0.125;
  float base = remap(shape.r, lowFbm - 1.0, 1.0, 0.0, 1.0);

  float type = clamp(uCloudTypeBias + (weather.g - 0.5) * uCloudTypeVariance, 0.0, 1.0);
  /* Tower height varies cell to cell: real cumulus in one field differ by a
     factor of two in depth, and a single cutoff height gives every cloud in the
     sky the same ceiling. The base rides up and down with it, because seen from
     underneath a deck whose base is a mathematical plane has no shading variation
     whatsoever — which is precisely why a flat overcast otherwise renders as a
     flat fill. Rain and a low ragged base go together, so the precipitation
     channel is the right one to drive it. */
  /* Wide, and it has to be the *weather* field that drives it rather than the
     shape volume. A ray grazing the layer at ten degrees crosses ten kilometres
     and a dozen shape cells, so anything varying at shape-cell scale integrates
     to its own upper tail along that ray — every column comes out the same height
     and the skyline is a straight line. Only relief at or above the along-ray
     path length survives, and that is the weather map's scale.
     
     The top of the range stays *below* one. This is the single most important
     number in the far field. Let it exceed one and the vertical profile no longer
     closes inside the layer: the cell fills to \`uCloudTop\` and stops there
     because hFrac runs out, so its ceiling is the layer's ceiling rather than its
     own. Near the camera that is invisible. Twenty kilometres out, where the
     whole column is optically thick and the silhouette is therefore exactly the
     boundary of the support, every cell that saturates shares one ceiling — and a
     shared ceiling at constant altitude is a line of constant elevation angle.
     That is the row of flat-topped grey blocks along the horizon, and no amount
     of erosion detail touches it, because erosion is interior and this is
     geometry. */
  float topScale = mix(0.34, 0.95, weather.b);
  /* The base barely moves. Condensation happens at the lifting condensation
     level, which is a property of the air mass and not of the individual cloud,
     and the flat bases of a cumulus field all sitting in one plane is one of the
     most recognisable things about a sky. Give the base a couple of hundred
     metres of relief for shading and no more; hang it half a kilometre lower in
     one cell than its neighbour and the field grows stalactites. Ragged
     precipitating cells are the exception, so the rain channel drives it. */
  float lift = (weather.a - 0.5) * 0.14 * mix(0.3, 1.0, type);
  /* Stratocumulus lumps. A lid seen from below is not a plane and it is not
     smooth: it is a field of shallow bulges a few hundred metres across, and that
     mottling is the *only* scale an overcast sky has to offer. Without it the
     deck saturates to one optical depth everywhere and renders as a flat fill,
     which no photograph of an overcast day resembles. Shifting the whole profile
     rather than only the base is deliberate — the bulges hang below the mean and
     thin the deck above them at the same time, so they read as relief lit from
     above rather than as a texture painted on a plane. Gated to stratus: a
     cumulus base really is a plane, for the reason given above. */
  lift += (lowFbm - 0.5) * 0.34 * smoothstep(0.55, 0.9, type);
  /* Displace the height coordinate by the shape field, weighted to zero at the
     base so only the top moves.
     
     Without this, a distant deck renders as a row of boxes, and the reason is
     worth stating because it is not obvious from a near view: a ray that grazes
     the layer spends ten kilometres inside one coverage cell, so *everything*
     within the cell integrates to opaque and the silhouette collapses onto the
     cell's own outline — vertical sides from a coverage map that is a function of
     x and z, a flat top at whatever altitude the vertical profile runs out.
     Interior detail cannot fix that; only moving the boundary can. Half a
     kilometre of noise on the ceiling turns the row of boxes into a row of
     turrets, and it is the same field that shapes the near clouds, so the two
     agree about where the cloud is.

     The displacement has to be at *turret* scale, which is a good deal finer
     than a coverage cell. Driven by the volume's lowest octave alone the ceiling
     undulates once every two or three kilometres, so a three-kilometre cloud gets
     one bump and reads as a slab with a lump on it. The third channel runs two to
     eight times finer — cells of a few hundred metres — and it is already in the
     fetch.
     
     And it fades out with the sample's own footprint, because past a certain step
     length it stops being relief and becomes noise. The shape volume's coarsest
     octave is a cell about \`1 / (4 * shapeScale)\` across — six hundred metres for
     cumulus — so a half-kilometre step samples it below its Nyquist rate, the
     values decorrelate between neighbouring samples, and decorrelated noise
     integrated along twenty kilometres of ray converges on its mean. Keeping it
     buys nothing there and costs a flicker as the wind moves it. Far relief comes
     from \`topScale\` instead, which rides the weather map at two kilometres a cell
     and is comfortably resolved. */
  float ceiling = lowFbm * 0.4 + shape.b * 0.6;
  float hp = hFrac + (ceiling - 0.5) * 0.5 * (1.0 - lod) * smoothstep(0.05, 0.55, hFrac);
  float grad = cloudHeightGradient((hp - lift) / topScale, type);
  /* Cumulus towers widen with height; flatten the profile toward stratus. */
  grad *= mix(1.0, mix(0.75, 1.25, hFrac), uCloudAnvil);
  base *= grad;

  float coverage = cloudCoverageAt(weather.r);
  /* The threshold carves the cloud out of the shape field, normalised over the
     whole headroom above it.
     
     Saturating earlier than that is tempting — it makes the cloud opaque sooner
     and the silhouette crisper — and it is a trap. An opaque cloud's silhouette
     is an iso-surface of its density, so the *shape* of the edge is whatever
     shape the density gradient has near it. Clip the gradient away and the only
     thing left varying across the boundary is the coverage map, which is a
     function of x and z alone: every cloud becomes a column with vertical sides
     and a flat top, and a distant deck reads as a row of grey boxes. Keeping the
     full gradient costs some opacity, which the density multiplier pays back. */
  float thr = 1.0 - coverage;
  float d = clamp((base - thr) / max(1.0 - thr, 0.12), 0.0, 1.0);
  if (d <= 0.0) return 0.0;

  /* Erosion runs on the *normalised* density, before cover thins it. The other
     order looks equivalent and is not: the erosion threshold is an absolute
     number, cover has already scaled the density down to a quarter by then, and
     the subtraction takes the whole cloud with it. That is what an "isolated
     cumulus" made of translucent veil actually is. */
  /* Erosion is the finest field in the march and therefore the first to alias, so
     it is gated on the footprint outright rather than faded. A detail volume
     sampled well below its Nyquist rate does not soften an edge, it cuts a
     different one on every sample, and along a grazing ray the cuts land in
     different places on neighbouring pixels — which is the rash of speckle that
     used to trim every distant silhouette. */
  if (detail && lod < 0.85) {
    vec3 dp = (p + uCloudWind2) * uCloudDetailScale;
    vec3 det = texture(uCloudDetail, dp).rgb;
    /* Weighted toward the channels the volume can actually reconstruct. The
       standard 0.625/0.25/0.125 ladder puts an eighth of the modulator on the
       finest octave, which is where the texels run out first, and an eighth of an
       aliased field is still enough to cut a straight edge. */
    float detFbm = det.r * 0.7 + det.g * 0.22 + det.b * 0.08;
    /* Wispy at the base, billowy on top: invert the erosion with height. */
    float modulate = mix(detFbm, 1.0 - detFbm, clamp(hFrac * 4.0, 0.0, 1.0));
    /* Stretch the fBm about its mean before it erodes anything. Raw Worley fBm
       occupies barely the middle third of its range, so it thins a cloud evenly
       instead of carving it; the cauliflower edge that identifies a cumulus is a
       *boundary* displacement, and only a full-range modulator produces one. */
    modulate = clamp((modulate - 0.5) * 1.7 + 0.5, 0.0, 1.0);
    d = remap(d, modulate * uCloudErosion * (1.0 - lod / 0.85), 1.0, 0.0, 1.0);
    if (d <= 0.0) return 0.0;
  }

  /* Thin the field with cover, but only partly. Scaling density by cover in full
     is the textbook form and it makes an isolated fair-weather cumulus
     translucent, when the thing that identifies one is that it is brilliant
     white and optically thick — how much of the sky its neighbours cover has no
     bearing on how much water is in *this* one. */
  d *= 0.45 + 0.55 * coverage;

  return max(d, 0.0) * uCloudDensity;
}

/* ------------------------------- lighting ------------------------------- */

/** Golden-angle disc points, used to widen the shadow cone with distance. */
vec3 coneOffset(float i, float count, vec3 t0, vec3 t1) {
  float a = i * 2.3999632;
  float r = sqrt((i + 0.5) / count);
  return (t0 * cos(a) + t1 * sin(a)) * r;
}

/**
 * Mean density of a column at this local coverage, as a fraction of the
 * profile's peak. The field is normalised over the whole headroom above the
 * coverage threshold so it averages a third of its cores, and the vertical
 * profile takes off about half again. Used wherever an *expectation* over a
 * column is wanted instead of a sample of it.
 */
float cloudColumnDensity(float cov) {
  return 0.4 * cov * cov * uCloudDensity;
}

/**
 * Optical depth from a sample toward the sun.
 *
 * Split in two, because the two things this number is asked to be have nothing
 * in common. The near field decides the cloud's *form* — a sunlit top over a
 * shaded base, a bright rim — and that is a local, high-contrast, few-hundred-
 * metre question, so it is marched against real samples of the density field.
 *
 * The far field decides how *buried* the sample is. For a sun six degrees up
 * that is a question about twenty kilometres of broken layer, and marching it
 * with four samples kilometres apart is worse than not marching it at all: each
 * sample stands in for five kilometres of path, one that lands in a neighbouring
 * tower puts the entire cloud in shadow, and the field goes dark in patches that
 * move with the wind. The coverage map is the estimator that belongs here — it
 * *is* the expectation of the density over a column, it is smooth, and it costs
 * one 2D tap.
 *
 * The far path is capped at a couple of layer thicknesses. Two real effects say
 * it should be: over a long path through a broken field the mean transmission is
 * set by the clear lanes rather than by the mean optical depth — the average of
 * exp(-tau) is nothing like exp of the average — and a droplet phase function is
 * forward enough that most of what leaves the beam is still travelling with it.
 * Integrate the geometric path in full instead and every sunset is a silhouette.
 */
float cloudLightOpticalDepth(vec3 wp, float layerBottom, float layerSpan,
                             vec3 sunDir, vec4 weather, vec3 t0, vec3 t1, float lod) {
  float toTop = (layerBottom + layerSpan - wp.y) / max(sunDir.y, 0.035);
  if (toTop <= 0.0) return 0.0;

  /* Enough to cross a billow, not a whole tower. */
  float near = min(toTop, layerSpan * 0.42);
  const float G = 1.7;
  float gn = pow(G, uCloudLightSteps);
  float stepLen = near * (G - 1.0) / max(gn - 1.0, 1e-3);

  float od = 0.0;
  float dist = 0.0;
  for (float i = 0.0; i < uCloudLightSteps; i += 1.0) {
    /* Midpoint of the segment, pushed off-axis by a cone that widens with
       distance: a soft shadow from a half-degree source, for free. */
    vec3 p = wp + sunDir * (dist + stepLen * 0.5)
           + coneOffset(i, uCloudLightSteps, t0, t1) * dist * 0.35;
    float h = (p.y - layerBottom) / layerSpan;
    od += cloudDensity(p, h, weather, i < 2.0, lod) * stepLen;
    dist += stepLen;
    stepLen *= G;
  }

  float far = min(toTop, layerSpan * 2.2) - near;
  if (far > 0.0) {
    vec3 q = wp + sunDir * (near + far * 0.5);
    od += cloudColumnDensity(cloudCoverageAt(cloudWeather(q.xz).r)) * far;
  }
  return od;
}

/**
 * Fraction of the irradiance falling on the layer that emerges at a sample
 * buried tau optical depths along the sun's ray, out of a column whose total
 * optical depth is tauColumn.
 *
 * Two-stream diffusion for a conservative medium: transmission falls as
 * 1 / (1 + (3/4)(1-g)tau), which for droplets at g = 0.85 is the 0.09 below.
 * CLOUD_ALBEDO is the near-surface value, a shade under the 0.8 a semi-infinite
 * water cloud reflects because the single-scattering octaves supply the rest.
 *
 * The ramp on the *column* is what keeps a cirrus wisp translucent. It cannot be
 * a ramp on tau, which is the mistake this replaced: a ramp that starts at zero
 * denies the term to exactly the samples that need it — the ones on the sunlit
 * face, whose depth to the sun is nil — and hands its peak to a shell a few
 * optical depths in. The cloud then comes out *brighter* inside than on top and
 * a cumulus reads as a flat cutout, which is precisely backwards: a real one is
 * five times brighter on its sunlit crown than on its base, and that ratio is
 * most of what makes it look like a solid object.
 */
const float CLOUD_ALBEDO = 0.55;
/** (3/4)(1 - g) at the g = 0.85 of a water-droplet phase function. */
const float CLOUD_DIFFUSION_K = 0.1125;

float cloudEmergent(float tau, float tauColumn) {
  return CLOUD_ALBEDO * (1.0 - exp(-tauColumn * 0.4)) / (1.0 + tau * CLOUD_DIFFUSION_K);
}

/**
 * Sun radiance reaching the eye from one cloud sample: three Beer octaves with
 * geometrically decaying extinction, contribution and phase eccentricity for the
 * first few scattering orders, plus the diffusion term above for everything
 * deeper than they can follow.
 */
vec3 cloudSunLight(float od, float localOd, float cosTheta, float tauColumn) {
  float sigma = uCloudExtinction;
  float a = 1.0;
  float b = 1.0;
  float c = 1.0;
  float powderMix = uCloudPowder * clamp(0.5 - 0.5 * cosTheta, 0.0, 1.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float beer = exp(-od * sigma * a);
    float phase = mix(phaseHG(cosTheta, uCloudPhaseG * c), phaseHG(cosTheta, uCloudBackG * c), 0.4);
    float powder = 1.0 - exp(-localOd * sigma * 2.0 * a);
    sum += vec3(b * beer * phase * mix(1.0, powder * 2.0, powderMix));
    a *= 0.52;
    b *= 0.58;
    c *= 0.7;
  }

  /* Deep multiple scattering. Cloud droplets have a single-scattering albedo of
     about 0.9999, so an optically thick deck does not go black — it becomes a
     diffuser, and a stratus of optical depth 60 still passes a seventh of what
     falls on it. Three Beer octaves cannot express that: the third still decays
     exponentially, an overcast lid reaches optical depth 60 to 150, the term
     goes to 1e-7, the base ends up lit only by bounce off the ground and the
     result is a brown ceiling instead of a luminous grey one.
     
     Driven by the irradiance *entering the layer* — the beam plus the sky above
     it, unmodified by the sun's elevation, because the foreshortening is already
     in the optical depth along the sun ray and charging for it twice is what
     makes a cloud at golden hour a grey lump with a warm outline instead of a
     warm cloud. The sky term is a quarter of the total under a mid-height sun and
     is the reason a real overcast is grey and not amber. */
  return sum * uCloudSunRadiance
       + uCloudTopLight * (cloudEmergent(od * sigma, tauColumn)
                           * uCloudMultiScatter * (1.0 / PI));
}

/* ------------------------------- raymarch ------------------------------- */

struct CloudHit {
  vec3 lum;
  float transmittance;
  float distance;
  /** How far the step schedule *could* reach. The far feather is tied to this,
      not to a constant: a march that stops short of its fade ends in a hard line
      across the sky, and the reach depends on the layer thickness and the budget.
      It is computed in closed form rather than read off the loop, because a loop
      that breaks early breaks precisely where a cloud went opaque — and feathering
      against that erases the cloud that stopped it. */
  float reach;
};

/** Sum of the geometric step schedule below, capped at dtFar. */
float cloudScheduleReach(float steps, float dtNear, float dtFar, float growth) {
  float k = min(ceil(log(dtFar / dtNear) / log(growth)), steps);
  return dtNear * (pow(growth, k) - 1.0) / (growth - 1.0) + (steps - k) * dtFar;
}

CloudHit marchClouds(vec3 ro, vec3 rd, vec3 sunDir, float jitter, float steps) {
  CloudHit hit;
  hit.lum = vec3(0.0);
  hit.transmittance = 1.0;
  hit.distance = uCloudMaxDist;
  hit.reach = uCloudMaxDist;

  float rBot = PLANET_R + uCloudBottom;
  float rTop = PLANET_R + uCloudTop;
  float r0 = length(ro);

  /* Anything below the horizon is behind the planet, not under the clouds. */
  if (raySphere(ro, rd, PLANET_R) > 0.0) return hit;

  float tIn, tOut;
  if (r0 < rBot) {
    tIn = raySphere(ro, rd, rBot);
    tOut = raySphere(ro, rd, rTop);
    if (tIn < 0.0 || tOut < 0.0) return hit;
  } else if (r0 < rTop) {
    tIn = 0.0;
    float down = raySphere(ro, rd, rBot);
    tOut = down > 0.0 ? down : raySphere(ro, rd, rTop);
    if (tOut < 0.0) return hit;
  } else {
    tIn = raySphere(ro, rd, rTop);
    if (tIn < 0.0) return hit;
    float down = raySphere(ro, rd, rBot);
    tOut = down > 0.0 ? down : tIn + (uCloudTop - uCloudBottom) * 4.0;
  }
  if (tIn > uCloudMaxDist) return hit;
  tOut = min(tOut, uCloudMaxDist);
  float span = tOut - tIn;
  if (span <= 0.0) return hit;

  float layerBottom = uCloudBottom;
  float layerSpan = uCloudTop - uCloudBottom;

  /* Step schedule. Steps start at a fraction of the layer thickness and grow
     geometrically so the horizon is reached without a thousand samples, but the
     growth is *capped*: an unbounded ratio is what turns a distant deck into
     stacked slabs, because past about a kilometre one sample decides an entire
     column and the shells of constant range read as hard horizontal bands
     across the sky. Inside cloud the step shortens again, which is where the
     budget belongs — that is where transmittance is still high enough for a
     sample to matter. */
  float dtNear = clamp(layerSpan * 0.04, 0.025, 0.14);
  /* Capped in absolute terms as well as relative: a five-kilometre congestus
     layer at 0.22 asks for a step over a kilometre long, which is wider than a
     coverage cell — one sample then decides a whole cloud. */
  float dtFar = min(layerSpan * 0.22, 0.45);
  float dt = dtNear;
  float growth = 1.0 + 5.5 / steps;
  hit.reach = min(tIn + cloudScheduleReach(steps, dtNear, dtFar, growth), uCloudMaxDist);

  vec3 t0 = normalize(abs(sunDir.y) > 0.95 ? cross(sunDir, vec3(1.0, 0.0, 0.0))
                                           : cross(sunDir, vec3(0.0, 1.0, 0.0)));
  vec3 t1 = cross(sunDir, t0);
  float cosTheta = dot(rd, sunDir);

  float t = tIn;
  float distSum = 0.0;
  float distWeight = 0.0;
  float emptyRun = 0.0;
  float inside = 0.0;
  float rewinds = 0.0;

  for (int i = 0; i < 192; i++) {
    if (float(i) >= steps || hit.transmittance < 0.015 || t >= tOut) break;

    /* Shorten inside cloud, stride ahead once clear for a while. The stride is
       deliberately modest: at twice the step a jittered ray skips clean over a
       thin edge on some pixels and not on others, and the result is a rash of
       dark speckle along every silhouette. */
    float seg = dt * (inside > 0.5 ? 0.62 : (emptyRun > 5.0 ? 1.45 : 1.0));
    /* Jitter *within* the current segment rather than only offsetting the start.
       A single start offset decorrelates nothing once the steps have grown by a
       factor of twenty: the offset has to scale with the step, and then the
       banding becomes per-pixel noise that the history buffer integrates away. */
    vec3 p = ro + rd * (t + seg * jitter);
    float alt = length(p) - PLANET_R;
    vec3 wp = vec3(p.x + uCamWorldXZ.x, alt, p.z + uCamWorldXZ.y);
    float hFrac = (alt - layerBottom) / layerSpan;

    /* How much of the field this one sample is standing in for, against the
       coarsest octave the shape volume has: 0 while the step resolves it, 1 once
       the step is long enough that it does not. Everything that reads the volume
       at or below that scale is faded out over this, because a field sampled
       below its Nyquist rate contributes noise rather than shape and the noise
       averages away along the ray, leaving the smooth separable part — a column
       with vertical sides and a flat top. */
    float footprint = seg * uCloudShapeScale * 4.0;
    float lod = smoothstep(0.45, 1.3, footprint);

    vec4 weather = cloudWeather(wp.xz + cloudShear(hFrac));
    float density = cloudDensity(wp, hFrac, weather, true, lod);
    bool wasInside = inside > 0.5;
    inside = density > 0.0005 ? 1.0 : 0.0;

    if (density > 0.0005) {
      /* Crossing into cloud on a long stride puts the first sample deep inside,
         where the sun has already been extinguished — and since that same step
         is optically thick enough to take the transmittance to zero on its own,
         the pixel ends up the colour of a cloud interior. Distant towers come
         out flat and dark, and the silhouette quantises to the range shells of
         the step schedule. Drop back to the fine step and walk in properly; the
         budget comes from the empty air behind, which needed none of it. */
      if (!wasInside && seg > dtNear * 1.7 && rewinds < 4.0) {
        rewinds += 1.0;
        dt = dtNear;
        emptyRun = 0.0;
        continue;
      }
      emptyRun = 0.0;
      /* Optical depth of the whole column here, which the diffuse terms need
         twice over: to know whether there is enough cloud for one at all, and to
         know how much of it is between this sample and the sky above. */
      float tauColumn = cloudColumnDensity(cloudCoverageAt(weather.r))
                      * uCloudExtinction * layerSpan;
      float od = cloudLightOpticalDepth(wp, layerBottom, layerSpan, sunDir, weather, t0, t1, lod);
      vec3 sun = cloudSunLight(od, density * seg, cosTheta, tauColumn);

      /* Sky from overhead, cut by the water between this sample and it — two
         kilometres of stratus passes a tenth, a cirrus wisp at the same relative
         height passes nearly all, and height alone cannot tell those apart. The
         quantity wanted is the column *above* the sample, which has nothing to do
         with where the sun is; the floor is there because part of the hemisphere
         is always low enough to come in under the cloud rather than through it. */
      float tauUp = tauColumn * (1.0 - clamp(hFrac, 0.0, 1.0));
      float skyReach = mix(0.28, 1.0, 1.0 / (1.0 + tauUp * CLOUD_DIFFUSION_K));
      float ao = mix(0.42, 1.0, smoothstep(0.0, 0.8, hFrac)) * skyReach;

      /* What the base looks down and out at: the ground, and the ring of sky
         around the horizon — which is three times the zenith's radiance at noon
         and fifteen times it at sunset, and is not blocked by the cloud
         overhead. This is the term that decides whether a cumulus base reads as
         grey cloud or as a hole punched through to the sky behind, and a
         cosine-weighted hemisphere average cannot supply it. */
      vec3 below = uCloudGroundBounce * 0.22 + uCloudHorizonLight;
      vec3 ambient = uCloudAmbient * ao + below * (1.0 - hFrac * 0.55);
      ambient *= mix(1.0, 0.45, clamp(weather.a * 1.4, 0.0, 1.0));

      float ext = density * uCloudExtinction;
      float segT = exp(-ext * seg);
      vec3 src = (sun + ambient) * ext;
      hit.lum += hit.transmittance * (src - src * segT) / max(ext, 1e-6);
      float absorbed = hit.transmittance * (1.0 - segT);
      distSum += t * absorbed;
      distWeight += absorbed;
      hit.transmittance *= segT;
    } else {
      emptyRun += 1.0;
    }

    t += seg;
    dt = min(dt * growth, dtFar);
  }

  if (distWeight > 1e-5) hit.distance = distSum / distWeight;
  return hit;
}

/**
 * The air in front of the cloud, and the feather on the end of the march.
 *
 * Returns premultiplied radiance in rgb and the fraction of the sky behind that
 * survives in a — so the caller's composite is always \`rgb + sky * a\`.
 *
 * Two things happen here and both are load-bearing. The atmosphere between the
 * eye and the cloud attenuates what the cloud sends and replaces it with its own
 * inscatter, which is the entire reason a tower thirty kilometres off is a pale
 * wash and the identical tower three kilometres off is white with a grey base.
 * And the march has a finite reach, so its far end is feathered rather than cut;
 * without it the layer stops at a range shell, which reads as a horizontal line
 * ruled across the sky.
 *
 * Every path that draws clouds goes through here. They used to each carry their
 * own copy and they drifted apart, which is a bad failure to debug: the screen
 * and the probe disagree, and the numbers then say the picture is fine.
 */
vec4 cloudOverAir(vec3 ro, vec3 rd, vec3 sunDir, CloudHit hit, float samples) {
  if (hit.transmittance >= 0.999) return vec4(0.0, 0.0, 0.0, 1.0);
  Scatter ap = integrateScatter(ro, rd, sunDir, samples, hit.distance, false, true, 0.5);
  vec3 inscatter = (ap.lum + ap.lumMie * phaseAerosol(dot(rd, sunDir))) * uSunIrradiance;
  vec3 lum = hit.lum * ap.transmittance + inscatter * (1.0 - hit.transmittance);
  float fade = 1.0 - smoothstep(hit.reach * 0.72, hit.reach, hit.distance);
  return vec4(lum * fade, mix(1.0, hit.transmittance, fade));
}

#endif
`;

/**
 * Screen pass. Marches the layer for this pixel and applies the atmosphere in
 * front of the cloud so distant towers wash into the haze instead of hanging in
 * front of it like decals.
 */
export const CLOUD_MARCH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform mat4 uInvViewProj;
uniform vec3 uCamWorld;
uniform float uFrameIndex;

/** Interleaved gradient noise: blue-noise-like spectrum, no texture needed. */
float ignNoise(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 rayFromUv(vec2 uv) {
  vec4 h = uInvViewProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  return normalize(h.xyz / h.w - uCamWorld);
}

void main() {
  vec3 dir = rayFromUv(vUv);
  vec3 ro = cameraPlanetPos();

  /* Golden-ratio temporal offset on top of the spatial pattern; the history
     buffer integrates it into a clean image over a handful of frames. */
  float jitter = fract(ignNoise(gl_FragCoord.xy) + uFrameIndex * 0.6180339887);

  CloudHit hit = marchClouds(ro, dir, uSunDir, jitter, uCloudSteps);

  /* Debug views. "The far clouds are wrong" has three unrelated causes that look
     identical in a screenshot — coarse steps making boxes, the march running out
     of reach, and the haze in front not being applied — and these separate them
     in one capture each. Values land in the colour buffer and go through the
     grade, so read them as ordering rather than as absolutes. */
  if (uCloudDebug > 0.5) {
    Scatter ap = integrateScatter(ro, dir, uSunDir, 8.0, hit.distance, false, true, 0.5);
    float v = uCloudDebug < 1.5 ? dot(ap.transmittance, vec3(0.3333))
            : uCloudDebug < 2.5 ? hit.distance / max(uCloudMaxDist, 1e-3)
            : 1.0 - hit.transmittance;
    gl_FragColor = vec4(vec3(v * 4.0), hit.transmittance >= 0.999 ? 1.0 : 0.0);
    return;
  }

  gl_FragColor = cloudOverAir(ro, dir, uSunDir, hit, 8.0);
}
`;

/**
 * Coarse cloud shadow map: transmittance of sunlight down to the ground, in a
 * sun-aligned column above each ground texel. Sampled by the lighting rig so
 * the key light dims when a cloud crosses the sun.
 */
export const CLOUD_SHADOW_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2 uShadowCenter;
uniform float uShadowExtent;

void main() {
  vec2 xz = uShadowCenter + (vUv * 2.0 - 1.0) * uShadowExtent;
  vec3 sunDir = uSunDir;
  if (sunDir.y < 0.03) {
    gl_FragColor = vec4(1.0);
    return;
  }

  float layerBottom = uCloudBottom;
  float layerSpan = uCloudTop - uCloudBottom;
  /* Walk the sun ray from the ground through the slab. */
  float tStart = layerBottom / sunDir.y;
  float tEnd = uCloudTop / sunDir.y;
  const float STEPS = 10.0;
  float dt = (tEnd - tStart) / STEPS;

  float od = 0.0;
  for (float i = 0.5; i < STEPS; i += 1.0) {
    vec3 p = vec3(xz.x, 0.0, xz.y) + sunDir * (tStart + dt * i);
    float h = (p.y - layerBottom) / layerSpan;
    od += cloudDensity(p, h, cloudWeather(p.xz + cloudShear(h)), false, 0.0) * dt;
  }

  gl_FragColor = vec4(vec3(exp(-od * uCloudExtinction)), 1.0);
}
`;
