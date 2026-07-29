import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY } from '../core/Config';
import type { PlayerSystem } from '../player/Player';
import type { PhysicsSystem } from '../physics/Physics';
import type { LevelSystem } from '../world/Level';
import { buildJet, JET_STORES, type JetModel } from './Jet';
import { RibbonTrail } from './Trail';
import { DustField } from './Dust';
import { JetShadows } from './Shadow';

type Phase = 'idle' | 'targeting' | 'inbound' | 'impact' | 'aftermath';
export type TargetingStage = 'point' | 'heading';

/**
 * Flight profile of the attack run, in metres and seconds.
 *
 * Every number in here is set by one measurement: the projected width of the
 * airframe, as a fraction of the frame, at the moment it is nearest — and
 * whether that moment is inside the picture and in front of open sky.
 *
 * The camera is an 80-degree *vertical* perspective, so at 16:9 it spans 112
 * degrees across. That is very wide, and it is the reason this was hard: the
 * frame is 2.99 units of width per unit of depth, so a 16.4 m span covers a
 * seventh of it at 37 m and a twentieth at 110 m. There is no rendering
 * available that makes an aeroplane at 200 m read as an aeroplane, and the
 * honest conclusion after three attempts is that the *choreography* had to
 * change rather than the model.
 *
 * What finally made this tractable was measuring the *pose* rather than the
 * aeroplane. A 40x20 raycast of the shipped capture view returns, for every
 * screen direction, how far the player can see, and it says something the
 * previous four attempts were all quietly fighting:
 *
 *  - the market gate stands 18–23 m away and fills the middle of the frame,
 *    from 42% to 80% of its width, everywhere below 29 degrees of elevation;
 *  - the left-hand block is 10–13 m away and covers the first sixth of the
 *    width below 33 degrees;
 *  - above about 31 degrees the whole picture is open sky, and the top of the
 *    frame is at 42 degrees.
 *
 * So the sky the player can see an aeroplane against is a band eleven degrees
 * tall. Everything below it is a wall twenty metres away. That single fact
 * explains every symptom the review reported: the flight was descending from
 * 86 m to 22 m across the run-in, so its elevation from the eye *fell* from 21
 * degrees to 10 as it closed, and it spent the entire event behind a wall. It
 * was not too small. It was not there.
 *
 * Hence the profile below: the descent is a straight glide down a fixed
 * elevation *from the player's eye*, so the aeroplane holds one height in the
 * frame for the whole run-in and grows without ever crossing a roofline —
 * `elev` is not a dive angle, it is a screen position, and the ladder in
 * `ELEV_STEPS` is a search over where in the picture to put the aircraft. The
 * bearing is canted so the pass crosses the view instead of going over the
 * player's head, because how big the airframe gets at its closest is set by
 * how far to one side it goes by, and the frame is 2.99 units of width per
 * unit of depth: a 16.4 m span is a seventh of the frame at 37 m and a
 * twentieth at 110 m.
 *
 * Measured on the same pose after the change: in clear sky and inside the
 * picture continuously from 240 m to the break, 2.3% of frame width rising to
 * 13.8% at the nearest point, with the stores released from 55–70 m — high
 * enough to be a credible delivery and near enough to be seen leaving.
 */
const PROFILE = {
  /**
   * Length of the run-in, measured from where the flight appears to the point
   * it passes closest to the player's eye.
   *
   * Anchoring it on the *overflight* rather than on the mark is the whole
   * point. The pass is the one moment in the event where the aircraft is large
   * enough to be an aeroplane rather than a shape, and everything else — how
   * long the anticipation runs, where the stores come off, which of the beats
   * the reviewer looks at lands on the money frame — is measured backwards
   * from it. Hung off the mark instead, the same number moves the pass by
   * however far the player happened to designate, so the event is a different
   * event on every map.
   *
   * 200 m at 82 m/s is 2.4 s from the radio call to the point the aircraft is
   * abeam, and the descent and the delivery both happen inside that. Longer
   * was tried and is worse rather than merely slower: at 240 m the pair spend
   * the first second and a half between 250 m and 350 m, where the airframe is
   * three per cent of frame width and nothing it does can be read. An empty
   * first act is not anticipation. What carries the opening beat is the wake
   * off the street, the shadow where the sun allows one, and the sound — all
   * of which are cues in the world rather than a distant speck.
   */
  runIn: 200,
  /**
   * Ceiling on the run-in altitude.
   *
   * The approach is flown as a glide down the player's own line of sight (see
   * `profileAltitude`), so its height at any range is solved rather than
   * chosen — but the solution has to be bounded or a blocked sightline puts
   * the flight at four hundred metres, where it is six pixels of grey and the
   * anticipation beat is empty again for a completely new reason.
   */
  ceiling: 168,
  /**
   * Floor the glide is not allowed through, in metres above the mark.
   *
   * The descent is a straight line down a fixed elevation from the eye, so its
   * height where it passes the player is `miss * elev` and nothing else — which
   * is the right answer whenever the flight goes by at a decent distance, and a
   * collision when it does not. This is the floor that stops it: a run-in whose
   * ground track goes nearly over the player's head levels out rather than
   * flying into them.
   *
   * It has to be *low*, and getting that wrong cost a whole iteration. The
   * floor does not merely clamp the bottom of the glide, it bends the approach
   * to it over `flare` metres — so a floor set anywhere near the height the
   * glide would naturally reach lifts the aeroplane at exactly the moment it is
   * closest, which raises its elevation, which pushes it through the top edge of
   * the picture. Measured with the floor at 26 m, the winning candidates all
   * peaked with the airframe centred *above* the top of frame: 23% of frame
   * width, of which most was outside the picture. At 18 m the same candidates
   * peak fully inside it at 24%.
   *
   * 18 m is also a laydown height with retarded stores — the ballutes exist so
   * the aircraft can be this low and still outrun its own frag pattern — and it
   * is four metres over the tallest thing on the map.
   */
  passAlt: 18,
  /**
   * Metres of height over which the glide is rounded onto the floor.
   *
   * The floor has to be soft: a corner in the altitude profile is a step in
   * vertical speed, the model is oriented off its own velocity vector, and the
   * store's ballistics are solved from that vertical speed. A hard join reads
   * as the aircraft snapping level in one frame *and* puts a discontinuity in
   * the middle of the release solution.
   */
  flare: 9,
  /**
   * Ground speed through the run, m/s (≈220 kt).
   *
   * Down from 380 kt, then from 290, and the second cut is the one that pays
   * for the first act.
   *
   * The overflight has to happen about two seconds after the call — earlier
   * and the strike has no anticipation, later and the player is watching an
   * empty street. That fixes the *time* the aircraft has to spend on the
   * run-in, so speed alone decides how far away it is for all of it: at any
   * moment t before the pass the range is simply v(2.11 − t). At 195 m/s the
   * pair are half a kilometre out when the countdown starts and a quarter of
   * one at the halfway mark, which is beyond the range at which anything they
   * do can be seen — no resolvable airframe, a shadow twenty pixels across two
   * hundred and eighty metres up the road, and not a grain of dust off the
   * street because the wake is spent before it gets near the player. Two
   * entire beats of the event with nothing in them.
   *
   * At 112 the same two beats put the flight at 200 m and then 120, the shadow
   * on market paving a hundred metres out, and the wash tearing a line of dust
   * down the street the player is standing in. Nothing else was changed to get
   * that; it is the same aeroplane flown slower.
   *
   * Cut again, to 160 kt, and the third cut is not about the picture at all —
   * it is what makes the stick *walk*. A store's time of flight shrinks as the
   * aircraft descends, at the rate the aircraft is descending divided by the
   * speed the store falls at; so if the aeroplane comes down faster than its own
   * bombs, every store released after the first one lands *earlier* relative to
   * the one before, and past parity the whole stick arrives in the same
   * instant. Measured at 112 m/s on a 22-degree approach: sink rate 45 m/s
   * against a retarded store's 62, and the four craters landed 0.017, 0.033 and
   * 0.017 seconds apart. Eight separate events on the ground and two bangs to
   * the ear.
   *
   * Sink rate is the approach angle times the speed, and the angle is solved
   * against the skyline and so cannot be given away. Speed is the term that is
   * free. At 82 m/s the same approach sinks at 34 m/s against a store's 82, and
   * the stick walks at 0.13 s a crater — which is separate to the eye, separate
   * to the ear, and the whole reason for dropping four rather than one.
   *
   * 160 kt is an attack speed for a heavy aircraft laying retarded stores down
   * a street, not a dash, and it buys a longer first act as well: the run-in is
   * 2.7 s instead of 2.0, all of it with the pair in sight and growing.
   */
  speed: 82,
  /**
   * Seconds between stores coming off the rack.
   *
   * This is the single number that decides whether the strike reads as a
   * carpet or as a bang, and it is bounded from *both* sides.
   *
   * Below about 0.06 s all four arrive inside the ear's fusion window and the
   * stick collapses into one indistinct thump. But the upper bound turned out
   * to matter far more: at 0.22 s the craters land 43 m apart, so a stick of
   * four walks 130 m and the pair together cover a 150 m box. On paper that is
   * a textbook ripple. On screen, from the eye height of a man standing fifty
   * metres from the mark, it means one crater in the street and seven behind
   * roofs at the far end of the district — the player hears eight bangs and
   * sees one. The whole event has to fit inside a single field of view.
   *
   * Eight metres between craters is still visibly separate at the ranges
   * involved, still distinctly eight events to the ear, and the four fit in
   * 24 m of street with all of them in frame.
   *
   * Down from 11.2, and the reason is the *pocket*. The visible ground from a
   * standing eye in a built-up street is not a field, it is a keyhole: from the
   * capture pose it is the near paving out to thirty metres plus whatever shows
   * through the market gate, which is about twenty degrees wide at forty
   * metres. A stick laid along a run-in sixty degrees off the sightline walks
   * out of that keyhole quickly — measured, at 11.2 m spacing half the craters
   * detonated behind the block to the right of the gate; at 8.4 m all but the
   * first are inside it.
   *
   * Stated as a *distance* rather than as a rack interval, which is the fix
   * for a defect that outlived three attempts at the release gate. A stick
   * timed off a stopwatch only walks evenly if every store in it has the same
   * time of flight, and on a descending run-in they do not: the aircraft is
   * six metres lower for each tenth of a second, so the fourth store falls
   * from twenty metres less height than the first and lands short of where the
   * rhythm says it should. Every previous attempt to fix that ended up
   * demanding a level segment before the pickle — which is exactly the
   * segment that has to be deleted, because level flight at pass altitude is
   * flight behind the rooflines.
   *
   * Spacing the *impacts* instead inverts the dependency. Each store leaves
   * the rack on its own solution, so the craters land where they were asked to
   * whatever the aeroplane is doing, and the rack interval becomes an output.
   */
  stickSpacing: 8,
  /**
   * Floor on the interval between stores, in seconds.
   *
   * Only a guard: with the release driven by the solution rather than by a
   * clock, a steep enough dive sweeps the computed impact point down the
   * street faster than the aircraft flies, and without a floor the whole stick
   * would leave the rack in two frames.
   */
  stickMin: 0.06,
  /**
   * Delay before the wingman's run.
   *
   * The lead's four stores are off the rack inside a third of a second, so
   * without a stagger the eight impacts are one continuous tearing noise and
   * the second aircraft is wasted. Two thirds of a second leaves an audible
   * hole in the middle of the barrage, which is what the ear reads as a second
   * aeroplane arriving — the entire reason for sending two.
   *
   * Shortened from 0.95 s once the passes were measured. Each aircraft is at
   * its largest on screen for about a fifth of a second, and the two moments
   * are exactly one stagger apart; at 0.95 the second one landed in the gap
   * between two of the beats the event is reviewed on, so half the delivery's
   * best frame was never seen. This is fine tailoring, but the pass is the
   * headline of the whole killstreak and it costs nothing to put it where
   * somebody is looking. 0.90 s puts the lead's best frame at 1.83 s and the
   * wingman's at 2.67 s, which are the third and fourth beats of the event.
   * It is not the same as the interval between those beats, because the
   * wingman flies a different bearing and crosses at a different offset, so
   * his pass peaks a few frames earlier in his own run than the lead's does.
   */
  wingStagger: 0.9,
  /** Wingman's attack bearing offset — a split attack, not a follow-me. */
  wingHeadingOffset: 0.34,
  /**
   * Lateral offset of each aircraft's line from the designated point.
   *
   * The lead flies straight down it. The player picked that spot and watched a
   * marker sit on it for several seconds, so the round that ends the stick has
   * to be there — offsetting the lead by ten metres was enough, on a street
   * this width, to put it through a roof next door instead. Only the wingman
   * is displaced, which is all that is needed to keep the two lines apart.
   */
  lead: 0,
  wing: 17,
  /**
   * Along-track offset of the wingman's stick from the lead's.
   *
   * Small and negative: his line stops short of the mark rather than running
   * through it, so the second wave lands *on the same ground* as the first
   * instead of extending the carpet a step nearer the player. Nothing in the
   * package is allowed past the point they designated.
   */
  wingAlong: -9,
  /**
   * Metres past the player's eye before the egress breaks away.
   *
   * Far enough that the aircraft has unambiguously gone over the top —
   * anything less and the roll starts while it is still the biggest thing in
   * frame, which reads as flinching away rather than as an overflight — and
   * close enough that the break itself is still in earshot behind them.
   */
  breakPast: 55,
};

/**
 * Along-track offset of the *first* store relative to the designated point.
 *
 * The stick is hung so that the *last* store lands on the mark and every one
 * before it lands further out along the run-in — which, since the flight runs
 * in from the far side, means the line of craters walks *toward* the player
 * and stops on the spot they designated.
 *
 * This is the whole reason the run-in was turned around. Anchored the other
 * way, with the first crater on the mark and the rest receding, the aircraft
 * have to come from the player's own hemisphere to keep the footprint off
 * them — and an aircraft that comes from behind your shoulder at three hundred
 * metres and forty degrees off your line of sight is never once in frame.
 * Measured against the real camera, a player looking at their own mark saw the
 * lead aircraft for nine tenths of a second, on the egress, and the wingman
 * not at all. Half the ordnance in the package arrived from nowhere.
 *
 * Running in from beyond the target inverts every part of that: the flight is
 * dead ahead and descending for the whole approach, the release happens in
 * front of the player, the stick walks toward them and stops on the mark, and
 * the pair go over their head on the way out. The player is no less safe —
 * nothing lands on the near side of the point they chose — but they see all
 * of it.
 */
const stickBase = (): number => -(JET_STORES - 1) * PROFILE.stickSpacing;

/**
 * Camera shake budget for the whole event.
 *
 * Gameflow sums every live shake and turns amplitude into camera *rotation* at
 * up to 2.2x — so an amplitude of 0.3 is two thirds of a radian of roll. The
 * rest of the game works in a much smaller register: a rifle shot is about
 * 0.05 for 70 ms, taking a bullet in the chest peaks at 0.06. Eight stores
 * landing inside two seconds, each asking for 0.3, do not read as a heavy
 * barrage; they read as a camera tumbling end over end, and the motion blur
 * resolves the result to grey mush.
 *
 * So the strike gets an allowance rather than a free hand: requests are pooled
 * into one emission per window and clamped against what is still ringing. The
 * player feels one continuous ground roll that each impact tops back up, which
 * is also what standing near artillery actually feels like.
 */
/**
 * Widest run-in bearing, either side of the line running from the target
 * directly away from the player, that still keeps the footprint off them —
 * and, now, that keeps the flight inside the frame. See `safeHeading`.
 *
 * It used to be 1.3 rad, on the grounds that anything short of square-on to
 * the sightline is safe, and the second constraint went unnoticed until a
 * review looked for the aeroplanes in a capture and could not find them.
 *
 * The arithmetic is unforgiving. The camera is 112 degrees wide, so the half
 * angle is 56 degrees, and the flight spawns 368 m out along the run-in
 * bearing from a mark 44 m in front of the player. At an offset of 1.3 rad
 * that puts the spawn 68 degrees off the sightline: the pair are *outside the
 * frame* for the whole of the approach, appear from behind the left-hand edge
 * with a second to run, and cross to the right. Every anticipation cue the
 * event has in the world happens where the player cannot see it. At 0.8 the
 * same spawn is 41 degrees off — the pair are in frame from the moment they
 * appear, grow for two and a half seconds, and still cross the view at enough
 * of an angle to present three-quarters on rather than nose-first.
 *
 * The footprint argument points the same way. The stick is laid along the
 * ground track, so the wider the arc the further the line of craters swings
 * off the street the player designated in, and past about 45 degrees the
 * opening rounds are landing on the block rather than in the road.
 *
 * Reopened to 0.95 once the footprint was being *scored* rather than assumed,
 * and then to 1.15, which is the value the whole scale problem turned on.
 *
 * A run-in near the friendly axis passes over the player's head, and the
 * geometry of that is unforgiving in a way that took a while to see. The
 * aircraft's projected width goes as the reciprocal of its distance *along the
 * view axis*, and its height in the frame goes as the reciprocal of the same
 * quantity — so as it closes, size and elevation angle grow together, and it
 * leaves through the top edge at exactly the moment it becomes large. Measured
 * on the shipped run: the airframe passed 15% of frame width and the top of the
 * picture within four frames of each other. There is nothing to tune there; a
 * pass over the player's head cannot be watched.
 *
 * Swinging the axis off the sightline separates the two. At 56 degrees off, the
 * nearest point of the track is 36 m from the eye but only 25 m along the view
 * axis and 30 degrees off it — 21% of frame width, three fifths of the way up
 * the picture, and held there for a third of a second because the aircraft is
 * crossing rather than closing. That is the pass the review asked for, and 0.95
 * rad cut it off by six degrees.
 *
 * What makes the arc safe to widen is `DANGER_CLOSE`, which rejects outright
 * any bearing that swings a crater inside 30 m of the eye, and the footprint
 * term, which declines to reward rounds landing on a roof. The arc is a bound
 * on how far a *request* can be honoured, not the thing standing between the
 * player and their own ordnance.
 */
const SAFE_ARC = 1.15;

/**
 * Nearest a crater is allowed to be to the eye, in metres. Twice the store's
 * 15 m lethal radius, less a little: close enough to be frightening and far
 * enough that the strike cannot kill the man who called it. Enforced in
 * `scoreRun`, which is what lets `SAFE_ARC` be as wide as it now is.
 */
const DANGER_CLOSE = 30;

/**
 * Candidate approach elevations, as tangents: 7 to 41 degrees.
 *
 * The run-in holds one of these all the way in (see `profileAltitude`), so the
 * choice is the single biggest lever on whether the event is watchable, and it
 * pulls in two directions at once.
 *
 * Low is better in every way except one. Elevation sets where the aircraft
 * sits vertically in the frame — 19 degrees puts the money frame a third of
 * the way down the picture, 33 puts it a hand's breadth from the top edge —
 * and it also sets slant range, because a flight held at angle φ over ground
 * distance D is at D·tan φ, so a shallow approach is a *closer* approach at
 * the same point in the run and therefore a bigger one. It decides the shadow
 * as well: the sun here is 26 degrees up, so the shape is thrown about 2.3
 * times the aircraft's altitude *back down the approach*, and a steep run is
 * therefore one whose shadow is behind the player's head for the entire event.
 *
 * The exception is the skyline, and it is absolute: below the roofline there
 * is no aeroplane at all. Measured from the shipped capture pose, a run flown
 * at 12 degrees is behind masonry for 48 of its 56 samples, and the same run
 * at 21 degrees is clear for 47 of them. So the angle cannot be chosen; it has
 * to be *solved* against the bearing, jointly, which is what `scoreRun` does.
 *
 * The ladder used to stop at 27 degrees, on the argument that anything steeper
 * put the money frame against the top edge of the picture. That argument is
 * sound and the ladder was still wrong, because it was measured against the
 * frame and not against the level. The 40x20 depth cast of the capture pose
 * quoted at the top of this file settles it: the market gate stands 29 degrees
 * high and the top of the frame is at 42, so the band that is both inside the
 * picture and in front of open sky is *eleven degrees tall*, from 31 to 42, and
 * the entire original ladder was below it. Every rung the solver had to choose
 * from flew the pair into a wall, so it picked the least bad one and the review
 * reported, correctly, that there was no aeroplane.
 *
 * So it spans 6 to 43 degrees, and the rungs are closer together than they were
 * because an eleven-degree band is not something a four-rung ladder can find.
 * The top rungs are not a preference — a flight at 43 degrees is against the top
 * edge and `framing` marks it down hard for it — they are there so that on a
 * pose hemmed in by architecture there is *something* to pick that is not behind
 * it. On an open pose the low rungs still win on size, which is correct: they
 * are closer at the same point in the run.
 */
const ELEV_STEPS = [
  0.10, 0.16, 0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70, 0.78, 0.86, 0.94,
];

/** Wingtip to wingtip, in metres, as traced off the model in `buildJet`. */
const SPAN = 16.4;
/**
 * Nose to tail, the same — measured off the built hull rather than guessed at,
 * which moved it from the 16 m that was here to 21.5. The number matters
 * because it is half of what decides apparent width on a canted approach, and
 * a third under-estimate of it is a third under-estimate of every hero frame
 * flown at an angle.
 */
const LENGTH = 21.5;
/** Fin tip above the wing plane; the airframe's vertical extent is mostly this. */
const FIN_HEIGHT = 4.2;

/**
 * Points sampled down a store's trajectory when asking whether the player can
 * see the ordnance. Four is enough to tell a fall that happens in open sky from
 * one that happens behind a wall, and the arc is short enough that a fifth
 * changes no ranking.
 */
const STORE_SAMPLES = 4;

/**
 * Radius the airframe is probed at when asking whether it can be seen, in
 * metres. A little inside the 8.2 m half-span, so the probe measures the
 * fuselage and the inboard wing rather than the wingtips.
 */
const AIRFRAME_RADIUS = 6;

/**
 * Along-track positions at which a candidate run is sampled, as fractions of
 * the run-in measured back from the overflight.
 *
 * Weighted heavily toward the end, and the weighting is not an optimisation —
 * it is where the whole judgement lives. The aeroplane is under 60 px for the
 * first two thirds of any run-in on any bearing, so out there the candidates
 * are indistinguishable and sampling them only adds noise. Everything that
 * separates a good approach from a bad one happens inside the last 70 m, which
 * is the interval these samples resolve to about six metres.
 *
 * Nothing nearer than 6% either: inside that the aircraft is passing overhead
 * and outside the top of the frame by construction, and asking for the
 * impossible is what makes a solver return its fallback for every candidate
 * and stop discriminating at all.
 */
const RUN_SAMPLES = [
  1.0, 0.88, 0.77, 0.67, 0.58, 0.50, 0.43, 0.37, 0.31, 0.26,
  0.22, 0.185, 0.155, 0.13, 0.11, 0.09, 0.075, 0.06,
];

/**
 * Apparent span, in radians, at which the airframe stops being a speck and
 * starts being an aeroplane.
 *
 * 0.22 rad is 110 px at capture width — about an eighth of the frame — and it
 * is where the twin tails and the wing kink separate. Below it the silhouette
 * is a dash and the player cannot tell a jet from a bird; above it they can
 * read the planform, the bank angle and the stores under the wing. Measured
 * off the model at 490 px per radian, the airframe crosses it at 73 m slant
 * range, so it is also a statement about how close the pass has to be.
 */
const LEGIBLE_SPAN = 0.22;

/**
 * Points at which the *approach* is sampled, spread evenly from 95% to 15% of
 * the run-in.
 *
 * Even, unlike `RUN_SAMPLES`, and the two schedules answer different questions.
 * `RUN_SAMPLES` crowds the end of the run because that is where the airframe is
 * large enough for its exact size and framing to matter. These ask whether
 * there is an approach at all — whether the flight is in sight on the way in
 * and whether its shadow crosses ground the player can see — and both of those
 * live at the far end, where an end-weighted schedule has almost no samples.
 * Measured, two candidates whose approaches were visible for 83% and 50% of
 * their length scored within a point of each other while the score was reading
 * continuity off `RUN_SAMPLES`.
 */
const APPROACH_SAMPLES = 9;

/**
 * Metres of separation from the level at which a flight path stops being
 * penalised for how near it is.
 *
 * Deliberately small, because the intended pass is already inside it: the
 * market gate stands eighteen metres to the parapet and `passAlt` is 21, so the
 * money shot of the whole event clears the tallest thing on the map by three.
 * That margin is the *point* — a pass that reads as low has to be low against
 * something the player recognises. So this is not a safety envelope. Its job is
 * to stop the solver, which is now free to choose approach angles as shallow as
 * nine degrees, from routing the flight *through* a building on the way in.
 *
 * Below zero separation the candidate scores nothing at all; between there and
 * three metres it is scaled down, so a graze is worse than a clearance and both
 * are better than an aeroplane inside a wall.
 */
const CLEARANCE = 3;

/**
 * Samples taken along the low part of a candidate path to check it clears the
 * level. Even spacing, and more of them than the score itself uses: a parapet
 * is narrow, and `RUN_SAMPLES` walked straight over a four-metre graze.
 */
const CLEARANCE_SAMPLES = 16;

/**
 * Run-in bearing the heading stage opens on, as an offset from the axis running
 * from the target directly away from the player.
 *
 * Deliberately small, and it took measuring both ends to understand why.
 *
 * A near-sightline run-in is genuinely the worse *presentation*: the airframe is
 * foreshortened to its own cross-section, so the pair are four or five pixels
 * across for the whole ingress; the contrails run away down the view ray and
 * project to a smudge; and the aircraft hold one screen position from spawn to
 * overhead, so nothing appears to move. Opening at 0.75 rad fixes all three —
 * the pair present three-quarters on, both navigation lights show, and they
 * sweep three hundred pixels across the frame on the way in.
 *
 * And it is still the wrong default, because the footprint is not free to rotate
 * with the aircraft. The stick is laid along the ground track, so swinging the
 * run-in forty degrees swings a sixty-metre stick forty degrees with it: the aim
 * points measured out at 43 m to one side of the mark, which on a carriageway
 * this wide is inside the building block. The first store then detonated on a
 * roof half a second before the rest of its own stick, and the walking impacts —
 * the thing the whole delivery exists to show — were happening out of sight
 * behind a parapet.
 *
 * What makes the small offset work is an accident worth keeping on purpose: the
 * player is standing in a street looking down it, so the line from them to the
 * mark is very nearly the line of the street. Following it keeps eight heavy
 * stores in the open where they can be seen. The presentation problem is real
 * but it is cheaper to solve on the aircraft — see `LIGHT_MIN_ANGLE` in `Jet` —
 * than to solve by throwing the footprint into a wall. The player can still
 * sweep anywhere inside `SAFE_ARC` if they want the prettier pass.
 */
const DEFAULT_OFFSET = 0.22;

const SHAKE = {
  /**
   * Ceiling on summed live amplitude.
   *
   * Gameflow multiplies amplitude by 2.2 to get roll, so this is the number
   * that decides how far the horizon tips. At 0.11 it was fourteen degrees,
   * which on a still looks like the camera has come off its mount — and
   * because the shake runs at 19 rad/s the frame-to-frame delta was four
   * degrees, which the motion blur turned into forty pixels of smear across
   * every impact frame in the sequence. Half of it reads as a heavy barrage;
   * all of it read as a broken camera.
   */
  cap: 0.062,
  /**
   * Radians per second of the shake carrier.
   *
   * Slower than the default 26. Eight heavy stores landing across a street is
   * a ground roll, not a buzz, and the low rate also keeps the per-frame delta
   * small enough that motion blur resolves the frame instead of smearing it.
   */
  frequency: 13,
  /** Minimum seconds between emissions, so a stick pools instead of stacking. */
  gap: 0.26,
  /** Assumed bleed-off rate of an emitted shake, per second. */
  recover: 0.17,
  /** Below this the request is not worth an event. */
  floor: 0.008,
};

/** Retarded bomb model. Terminal velocity is sqrt(g / kRetard). */
const BOMB = {
  /**
   * Well above 9.81, and deliberately.
   *
   * A store dropped from forty metres takes 2.9 real seconds to arrive, which
   * on top of the run-in puts five and a half seconds between the call and the
   * first crater — and for most of it there is nothing on screen but four
   * specks getting slowly larger. Weighting gravity keeps the *shape* of the
   * fall (visible separation off the racks, ballutes snapping open, a stick
   * hanging in the air) inside a beat that a player will actually watch.
   *
   * Eased from 80, which had gone too far the other way. The delivery is now
   * flown from 22 m rather than from 88 (see `PROFILE.levelLead`), and at 80 the
   * fall from that height lasts 0.75 s — which is *less* time than the ballutes
   * take to read as ballutes. The review's third finding was that no ordnance
   * was visible anywhere, and part of that fix is simply leaving the stores in
   * the air long enough to be seen: 55 gives 1.1 s, which is four tenths of a
   * second of tumbling and seven of a stick of four hanging in front of the
   * player under canopies.
   */
  gravity: 55,
  /** Drag before the ballute inflates: essentially a clean ballistic arc. */
  kClean: 0.00025,
  /**
   * Drag once retarded. Terminal velocity is sqrt(gravity / this) — 45 m/s.
   *
   * Tightened from 0.012, and this is a delivery number rather than a look-of-
   * the-thing number. The forward throw of a store decides where the aircraft
   * has to be when the racks open, and therefore whether the release is inside
   * the frame at all: at 0.012 a store released from 22 m is thrown 58 m, at
   * 0.04 it is thrown 47. Eleven metres does not sound like much and it is the
   * difference between the pickle happening at the edge of the picture and
   * happening inside it, because the run-in crosses the view at sixty degrees
   * and every metre back along the track is most of a metre further out to the
   * side.
   *
   * It is also what a ballute is *for*. A 45 m/s terminal is a store that has
   * genuinely been slowed by the thing hanging off its tail, which is the point
   * of retarded ordnance and the reason the aircraft can deliver from 22 m
   * without flying through its own frag pattern.
   */
  kRetard: 0.04,
  /** Seconds from release to full ballute inflation. */
  retardDelay: 0.18,
  radius: 15,
  damage: 340,
  /**
   * Least acceptable interval between two craters, in seconds.
   *
   * The stick is aimed by where each store lands (see `PROFILE.stickSpacing`)
   * and this is the one thing that aiming cannot express. Four craters eleven
   * metres apart is a walk on paper and a single bang to the ear if they arrive
   * together, and whether they do is set by the profile rather than by the
   * spacing — so it needs its own gate, held against the *predicted* impact of
   * the store before rather than against the rack clock, because the rack clock
   * is what the collapsing time of flight defeats.
   *
   * A twelfth of a second is about twice the ear's fusion window for two
   * impulses of this weight, so it is the point at which four detonations stop
   * being a texture and become four events.
   *
   * Relaxed from 0.14 to match the tighter stick. Craters 8 m apart laid down
   * from an aircraft doing 82 m/s arrive a tenth of a second apart by
   * construction, so a gate at 0.14 was holding every release back and then
   * dumping it on the `late` override — which walked the whole stick long. A
   * gate that is always fighting the geometry is not a guard, it is a bug.
   */
  impactGap: 0.085,
};

interface Bomb {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Group;
  ballute: THREE.Mesh;
  age: number;
  index: number;
}

/**
 * A blast front on its way from a crater to the player.
 *
 * The flash arrives at the speed of light and everything else arrives at
 * 343 m/s, and the gap between the two is the whole reason a distant explosion
 * reads as distant. The audio already honoured it. Nothing else did: the
 * camera kicked, the screen warped and the dust jumped at the player's feet on
 * the same frame the fireball appeared eighty metres away, which is the single
 * clearest tell that an effect is a screen effect rather than a thing that
 * happened in the world.
 *
 * So the physical half of a detonation — shake, overpressure, and the grit it
 * lifts off the street the player is standing on — is queued here and fired
 * when the front actually gets there. At eighty metres that is a quarter of a
 * second late, which is long enough to feel and short enough that it still
 * reads as the same event.
 */
interface PressureWave {
  /** Seconds until the front reaches the camera. */
  eta: number;
  /** 0..1 proximity weight the detonation was scored at. */
  near: number;
  /** Where it came from, so the dust it lifts moves away from the crater. */
  readonly from: THREE.Vector3;
}

const DOWN = new THREE.Vector3(0, -1, 0);

type JetPhase = 'hold' | 'run' | 'pull' | 'gone';

interface Jet {
  model: JetModel;
  trail: RibbonTrail;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  /** Unit vector along this aircraft's attack bearing. */
  readonly axis: THREE.Vector3;
  readonly side: THREE.Vector3;
  /** Origin of the run: the target, shifted by the aircraft's lateral offset. */
  readonly origin: THREE.Vector3;
  /** Signed along-track position; negative is short of the target. */
  s: number;
  /**
   * This aircraft's own overflight: the along-track position at which its
   * track passes closest to the eye, and how far to one side it goes by.
   *
   * Per-aircraft rather than shared, because the wingman flies a different
   * bearing on a lateral offset and therefore crosses the player at a
   * different point and a different distance. Sharing the lead's numbers put
   * his round-out twenty metres out of position, which on a profile defined
   * against the line of sight is twenty metres of altitude error at exactly
   * the moment he is closest.
   */
  passS: number;
  miss: number;
  /** Whether the contrail has been back-filled for this run. */
  trailPrimed: boolean;
  bank: number;
  bankTarget: number;
  climb: number;
  climbTarget: number;
  heading: number;
  phase: JetPhase;
  delay: number;
  bombsLeft: number;
  releaseTimer: number;
  aim: number;
  storeIndex: number;
  /** Seconds since the last store came off; times the break turn. */
  pullTime: number;
  /** Set once the aircraft is past the player and has started the break. */
  broke: boolean;
  /** Seconds since the break began; drives the roll into it. */
  breakTime: number;
  /** 0 approach, 1 near, 2 passing, 3 departed. Gates the flyby one-shots. */
  audioStage: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  age: number;
  life: number;
  maxRadius: number;
}

/**
 * Airstrike killstreak.
 *
 * Three acts. The player designates a point and an attack bearing; a two-ship
 * ingresses high on that bearing, rolls in, and lays a stick of retarded bombs
 * that *walks* across the target; then the aircraft pull off under g and the
 * player is left standing in the dust with their ears ringing.
 *
 * The details that make it land, in rough order of how much they matter:
 *
 *  - **The impacts walk.** Each aircraft releases four stores on a timer, so
 *    the craters march down the attack axis roughly 36 m and a fifth of a
 *    second apart, and the wingman's stick arrives half a second behind on a
 *    different bearing. Five simultaneous bangs read as one explosion; eight
 *    sequenced ones read as an aircraft doing a job.
 *  - **The release is aimed, not timed.** The aircraft runs a continuously
 *    computed impact point and pickles when the predicted impact crosses its
 *    aim point, exactly as a real bomb-fall line works. That means the stick
 *    lands where it was asked to regardless of how the profile is tuned, and
 *    it cannot silently drift 80 m short the way a fixed release timer does.
 *  - **Sound lags light.** The flash is instantaneous, the report arrives at
 *    343 m/s. At 90 m that is a quarter of a second, and the brain reads it
 *    immediately as distance.
 *  - **The aftermath is a state, not a particle.** Concussion, ear-ring daze
 *    and an exposure duck are held and decayed by this system rather than
 *    poked once, because the gameflow system rewrites the exposure target
 *    every frame and a single write never survives to the pipeline.
 */
export class AirstrikeSystem implements System {
  readonly name = 'airstrike';
  readonly order = 35;

  phase: Phase = 'idle';
  get targeting(): boolean {
    return this.phase === 'targeting';
  }
  /** True from the radio call until the dust has begun to settle. */
  get active(): boolean {
    return this.phase === 'inbound' || this.phase === 'impact' || this.phase === 'aftermath';
  }

  /**
   * Confirmed impact point, and the bearing the flight attacks *from*.
   *
   * Run-in is expressed as the bearing the aircraft appear on rather than the
   * course they steer, because that is the question the player is actually
   * answering when they set it: "where do I want to watch them come in from".
   * A bearing of 0 is +Z, matching the compass.
   */
  readonly target = new THREE.Vector3();
  heading = 0;

  /** Which half of the two-stage designation the player is in. */
  targetingStage: TargetingStage = 'point';
  /** Whether the point currently under the crosshair can be struck. */
  markerValid = false;

  /** 0..1 from the radio call to the first detonation, for the HUD. */
  inboundProgress = 0;
  /** Seconds until the first bomb lands; counts down, 0 once it has. */
  inboundSeconds = 0;
  /** Stores still in the air or on the rack. */
  ordnanceLeft = 0;
  /**
   * Seconds since a store last came off a rack, or -1 before the first.
   *
   * The release is the one beat of the run that the world cannot show. It
   * happens at forty metres and two hundred and thirty out, where the aircraft
   * is eight pixels wide and a 900 kg bomb is less than one, so from the ground
   * the visual difference between an aeroplane that has just pickled and one
   * that has not is nothing at all. The HUD says it instead, which is what the
   * radio is for.
   */
  sinceRelease = -1;
  /** Stores in the whole package, for the HUD's impact tally. */
  readonly ordnanceTotal = JET_STORES * 2;
  /**
   * Seconds since the last store detonated, or -1 before the first.
   *
   * The strike stays `active` while the flight egresses, which is several
   * seconds after the last bang; the HUD uses this to retire the inbound
   * banner once the event is actually over instead of leaving it pinned up
   * while two dots climb out of frame.
   */
  sinceLastImpact = -1;
  /** Where the stick is predicted to land — drawn by the HUD and the marker. */
  readonly aimPoints: THREE.Vector3[] = [];

  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private physics!: PhysicsSystem;
  private level!: LevelSystem;

  private readonly group = new THREE.Group();
  private readonly jets: Jet[] = [];
  private readonly bombs: Bomb[] = [];
  private bombGeometry!: THREE.BufferGeometry;
  private balluteGeometry!: THREE.BufferGeometry;
  private bombMaterial!: THREE.Material;
  private balluteMaterial!: THREE.MeshBasicMaterial;
  /** One wake per store in the package, indexed by `Bomb.index`. */
  private readonly bombTrails: RibbonTrail[] = [];
  /** Scratch: which wakes had a live store on them this frame. */
  private readonly bombTrailFed: boolean[] = [];

  private markerGroup!: THREE.Group;
  private markerRing!: THREE.Mesh;
  private markerArrow!: THREE.Mesh;
  private markerBeam!: THREE.Mesh;
  private readonly previewRings: THREE.Mesh[] = [];
  private markerMaterial!: THREE.ShaderMaterial;

  private readonly shockwaves: Shockwave[] = [];
  private shockGeometry!: THREE.BufferGeometry;
  private shockMaterial!: THREE.MeshBasicMaterial;
  // Twenty puffs per detonation and eight stores, so anything under 160 slots
  // means the last aircraft's craters evict the first aircraft's columns and
  // the aftermath thins out exactly as the player turns to look at it. The
  // margin over 160 is for the grenades and vehicle cooks that share the
  // field: eviction is oldest-first, and the one thing that must never be
  // recycled is the column standing over the target.
  private readonly dust = new DustField(240);
  private readonly shadows = new JetShadows(2);
  /** Along-track distance since each aircraft last tore dust off the street. */
  private readonly washMark: number[] = [0, 0];
  /** Pressure fronts in transit from a detonation to the camera. */
  private readonly waves: PressureWave[] = [];

  private timer = 0;
  private groundY = 0;
  /**
   * Tangent of the approach elevation the run-in holds above the player's eye.
   * Solved jointly with the bearing at launch; see `scoreRun`.
   */
  private elev = 0.34;
  /**
   * Along-track position of the overflight — where the lead's track passes
   * closest to the eye. The whole profile is measured backwards from it.
   */
  private passS = 0;
  /**
   * Perpendicular distance from the eye to the lead's ground track, and the
   * eye it was measured from.
   *
   * Frozen at launch rather than read live. The profile is defined against the
   * player's line of sight, so tracking a moving camera would have the flight
   * climb and sink in response to the player walking about — and the run is
   * only two seconds long, so there is nothing to gain and a pumping altitude
   * trace to lose.
   */
  private miss = 0;
  private readonly eye = new THREE.Vector3();
  private detonations = 0;
  private aftermathTimer = 0;
  private warnedClose = false;
  /**
   * Predicted arrival of the last store to leave a rack, in strike time, or -1
   * before the first. Shared by both aircraft so the guarantee covers the whole
   * barrage rather than each stick separately. See `BOMB.impactGap`.
   */
  private lastPredicted = -1;
  /** Which side of the lead's axis the wingman splits to. See `solveWingSide`. */
  private wingSide = 1;

  /** Held screen-effect state, applied to the pipeline every late update. */
  private blastConcussion = 0;
  private blastDaze = 0;
  private blastDuck = 0;
  private jetWash = 0;

  /** Pooled shake request, flushed once per window. See `requestShake`. */
  private shakeWant = 0;
  private shakeWantDur = 0;
  /** Estimate of the shake amplitude still ringing out in gameflow. */
  private shakeLive = 0;
  private shakeGap = 0;

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _v4 = new THREE.Vector3();
  private readonly _v5 = new THREE.Vector3();
  /**
   * Scratch for `legibility`, which is called between `inView` and `framing`
   * and so must not touch the projection those two share in `_v4`.
   */
  private readonly _probeTo = new THREE.Vector3();
  private readonly _probeSide = new THREE.Vector3();
  private readonly _probeUp = new THREE.Vector3();
  private readonly _probeAt = new THREE.Vector3();
  private readonly _probeDir = new THREE.Vector3();
  private readonly _sizeRight = new THREE.Vector3();
  private readonly _sizeUp = new THREE.Vector3();
  private readonly _fwd = new THREE.Vector3();
  private readonly _q = new THREE.Quaternion();
  private readonly _m = new THREE.Matrix4();

  // ------------------------------------------------------------------ init --

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.level = ctx.get<LevelSystem>('level')!;

    this.group.name = 'airstrike';
    ctx.scene.add(this.group);

    this.buildBombAssets();
    this.buildShockwaves();
    this.buildMarker();
    this.group.add(this.dust.mesh);
    this.group.add(this.shadows.mesh);

    for (let i = 0; i < 2; i++) {
      const model = buildJet(this.level.materials);
      model.group.visible = false;
      this.group.add(model.group);
      // Exhaust smoke, not a contrail. The trail is what the player reads the
      // attack axis off once the aircraft themselves have shrunk to a dot or
      // gone behind a rooftop — but these are running in at seventy metres in
      // a desert, where nothing condenses, and the width has to stay in that
      // register too. A 15 m half-width over six hundred metres of sky is a
      // thirty-metre-wide opaque band: from the ground it stopped reading as a
      // trail at all and became a white sheet hanging over the town.
      //
      // Sampled every six metres rather than every fourteen. Rib spacing only
      // has to be invisible relative to the ribbon's own width, and this one
      // is between half a metre and three and a half wide — so at fourteen the
      // ribs were four to twenty times further apart than the ribbon was
      // thick. At altitude that is a smooth line; during the overflight, with
      // the aircraft forty metres over the player's head, each segment
      // subtended eight degrees and the trail photographed as a chain of
      // separate white lozenges hanging in the sky behind the jet. The
      // capacity goes up to match so the trail keeps its length.
      const trail = new RibbonTrail(110);
      trail.spacing = 6;
      trail.life = 4.5;
      // Sized so the ribbon survives the range it has to be seen at.
      //
      // A 0.6 m half-width is a metre and a bit across, which four hundred
      // metres away is one pixel — and four hundred metres away, with the
      // aircraft themselves five pixels long, the trail is the only thing in the
      // sky with enough screen area to say "there, and coming from there". It
      // was drawn as a hairline for exactly the two seconds it was the whole
      // cue. Two metres reads as a contrail at run-in range and is kept from
      // being a white sheet at the overflight by `density` below, not by width.
      trail.widthStart = 2.8;
      trail.widthEnd = 11;
      // Up from a quarter, because the ribbon now carries its density in the
      // centre line and falls to nothing at both edges: the same number spread
      // over a soft cross-section is roughly half as dense as it was flat.
      trail.opacity = 0.52;
      // Brighter than the sky it is drawn on, and the number is not a taste
      // call — it is what the tone curve costs.
      //
      // This was 0.8, chosen as "off-white", and it was invisible in every
      // capture. The composite runs AgX over the whole frame: linear 0.8 comes
      // out around a two-thirds grey, while a lit desert sky sits well above
      // one and the cloud tops several times that. A contrail darker than the
      // sky is not a subtle contrail, it is a smudge — and the one still where
      // it had to carry the entire anticipation beat, at four hundred metres
      // with the aircraft eighteen pixels long, had nothing in it at all.
      //
      // 3.1 puts it above the cloud deck and a shade over the bloom threshold,
      // so it picks up the same faint veil the sunlit parapets do. That is
      // also physically what a contrail is: not a pale object, a *bright* one,
      // ice crystals forward-scattering the sun.
      trail.tint.setRGB(3.1, 3.15, 3.35);
      this.group.add(trail.mesh);
      this.jets.push({
        model,
        trail,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        axis: new THREE.Vector3(0, 0, 1),
        side: new THREE.Vector3(1, 0, 0),
        origin: new THREE.Vector3(),
        s: 0,
        passS: 0,
        miss: 0,
        bank: 0,
        bankTarget: 0,
        climb: 0,
        climbTarget: 0,
        heading: 0,
        phase: 'gone',
        delay: 0,
        trailPrimed: false,
        bombsLeft: 0,
        releaseTimer: 0,
        aim: 0,
        storeIndex: 0,
        pullTime: 0,
        broke: false,
        breakTime: 0,
        audioStage: 0,
      });
    }

    Signals.on('killstreak:armed', ({ id }) => {
      if (id === 'airstrike') this.beginTargeting();
    });
    Signals.on('killstreak:cancelled', ({ id }) => {
      if (id === 'airstrike') this.cancelTargeting();
    });
  }

  private buildBombAssets(): void {
    // Mk-83 sized: 3 m of body plus an ogive nose and a boxed retarder.
    //
    // Up from a 2.2 m Mk-82, and the reason is legibility rather than
    // armament policy. A store is at its most visible in the last third of its
    // fall, 60 to 100 m from the player and coming down into the street in
    // front of them; at 2.2 m that is seven pixels of dark grey and the review
    // that measured it recorded no ordnance in frame at all. The real weapon
    // for this delivery is a thousand-pounder on a ballute anyway, and three
    // metres of it with fins that actually project is the difference between a
    // speck and a recognisable shape falling.
    const parts: THREE.BufferGeometry[] = [];
    const body = new THREE.CylinderGeometry(0.23, 0.23, 2.5, 10);
    body.rotateX(Math.PI / 2);
    parts.push(body);
    const nose = new THREE.ConeGeometry(0.23, 0.8, 10);
    nose.rotateX(-Math.PI / 2);
    nose.translate(0, 0, -1.64);
    parts.push(nose);
    const tail = new THREE.CylinderGeometry(0.16, 0.23, 0.55, 10);
    tail.rotateX(Math.PI / 2);
    tail.translate(0, 0, 1.52);
    parts.push(tail);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.BoxGeometry(0.04, 0.62, 0.6);
      fin.translate(0, 0.38, 1.46);
      fin.rotateZ((i / 4) * Math.PI * 2);
      parts.push(fin);
    }

    const flat = parts.map((g) => g.toNonIndexed());
    let total = 0;
    for (const g of flat) total += (g.getAttribute('position') as THREE.BufferAttribute).count;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const uv = new Float32Array(total * 2);
    let o = 0;
    for (const g of flat) {
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const n = g.getAttribute('normal') as THREE.BufferAttribute;
      pos.set(p.array as Float32Array, o * 3);
      nor.set(n.array as Float32Array, o * 3);
      const u = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
      if (u) uv.set(u.array as Float32Array, o * 2);
      o += p.count;
      g.dispose();
    }
    for (const g of parts) g.dispose();
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.bombGeometry = merged;

    this.bombMaterial = this.level.materials.get('paintedMetalGreen', {
      scale: 0.5,
      color: 0x8b9080,
      roughness: 0.62,
      metalness: 0.85,
    });

    // The ballute. It inflates a fifth of a second after release and is the
    // single clearest signal that ordnance is in the air: a bare bomb at 120 m
    // is three pixels, a bomb with a drogue behind it is a recognisable shape.
    //
    // 2.6 m inflated, which is what a real retarder for this class of store
    // measures, and it is now the widest part of the assembly by a factor of
    // five. Held one calibre clear of the tail on an inflation stem so the
    // silhouette is a bomb *and* a balloon with daylight between them rather
    // than one lozenge — the gap is what the eye reads as a chute.
    const bal = new THREE.SphereGeometry(1.3, 12, 8);
    bal.scale(1, 1, 1.35);
    bal.translate(0, 0, 3.15);
    this.balluteGeometry = bal;
    // Pale, not black. The stores spend the whole fall against a bright desert
    // sky, and a dark drogue on a dark body is one silhouette; a light canopy
    // behind a dark bomb has internal contrast and survives being four pixels
    // across. It is also what ballute fabric actually looks like.
    //
    // Set in linear working space rather than as a hex, and that is the whole
    // fix. `0x4a4b47` looks like a mid grey written down; three treats a hex as
    // sRGB and converts, so it reached the shader as 0.068 linear, and AgX then
    // put it at the bottom of the curve. The canopy that exists to be the
    // bright half of the silhouette was rendering darker than the bomb. These
    // numbers are radiance, not paint: 1.9 is roughly what a sunlit pale fabric
    // returns in this level, which is what it should look like.
    this.balluteMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.balluteMaterial.color.setRGB(1.95, 1.9, 1.7);

    // A short dark wake behind each store.
    //
    // This is the deceleration made visible. A ballute takes a store from
    // 150 m/s to about 60 in half a second — a violent enough event to shed
    // the retarder's packing and drag a wake of street dust and disturbed air
    // behind it — and it is also the only way eight objects two metres wide
    // read as a *stick* rather than as eight unrelated specks. Sixteen metres
    // of tapering smear turns a 7 px dot into a 60 px stroke pointing at where
    // it came from, which is the same trick the aircraft's contrail plays at
    // the other end of the event.
    //
    // Pale rather than dark, which is a reversal. The wake was authored as
    // soot on the theory that the stores are seen against a bright sky, and
    // for the first third of the fall that is true. It is the wrong third. A
    // store is invisible when it is high and far; it becomes worth drawing in
    // the last forty metres, and by then it is below the rooflines with a
    // market behind it, where a near-black smear is nothing at all. Dust and
    // vapour torn off an inflating retarder is pale in either case, and pale
    // survives both backgrounds — the sky here is a mid blue, not a white-out.
    for (let i = 0; i < JET_STORES * 2; i++) {
      const t = new RibbonTrail(24);
      t.spacing = 1.9;
      t.life = 1.1;
      t.widthStart = 0.34;
      t.widthEnd = 2.4;
      t.opacity = 0.62;
      t.formTime = 0.04;
      t.tint.setRGB(2.6, 2.55, 2.4);
      this.bombTrails.push(t);
      this.bombTrailFed.push(false);
      this.group.add(t.mesh);
    }
  }

  /**
   * The ring of dust a ground burst throws out along the deck.
   *
   * Two things this must not be, both learned the hard way. It must not be
   * *additive*: added light over a sunlit desert street can only travel toward
   * white, so a pale annulus rendered that way stops being a dust front and
   * becomes an opaque plate laid across the town. And it must not be *thick* —
   * an annulus whose hole is half its radius reads as a filled disc from any
   * shallow angle, which is every angle a first-person camera ever has.
   *
   * So: a narrow band of translucent tan dust, normal-blended, fading out at
   * both rims, sized at roughly one blast radius rather than five.
   */
  private buildShockwaves(): void {
    const geo = new THREE.RingGeometry(0.82, 1.0, 48, 1);
    geo.rotateX(-Math.PI / 2);
    const p = geo.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      const t = THREE.MathUtils.clamp((r - 0.82) / 0.18, 0, 1);
      // Dirtier and denser at the trailing edge, thinning to nothing at the
      // front, which is how a dust front actually presents.
      col[i * 4 + 0] = THREE.MathUtils.lerp(0.62, 0.78, t);
      col[i * 4 + 1] = THREE.MathUtils.lerp(0.52, 0.68, t);
      col[i * 4 + 2] = THREE.MathUtils.lerp(0.40, 0.55, t);
      col[i * 4 + 3] = Math.sin(t * Math.PI) * 0.9;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.shockGeometry = geo;
    this.shockMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      opacity: 1,
    });
  }

  private buildMarker(): void {
    this.markerGroup = new THREE.Group();
    this.markerGroup.visible = false;
    this.ctx.scene.add(this.markerGroup);

    const ringGeo = new THREE.RingGeometry(0.965, 1.035, 64);
    ringGeo.rotateX(-Math.PI / 2);
    // Depth tested. Drawn through the world, a twenty-metre ring laid on the
    // street carries on across the shopfronts either side of it and up the
    // player's own rifle — eight of those stacked along the run-in axis is a
    // solid amber band over half the frame, which is what the overlay looked
    // like for its entire life. Occluded, the same rings read as light thrown
    // on the ground, which is what a designator is.
    // Opaque hazard tape, not a glow.
    //
    // Additive was the wrong tool twice over. Added light can only travel
    // toward white, so on a sunlit street — which is where a designation is
    // most often put and always most needed — an amber mark at half strength
    // arrives as a barely-warmer patch of the same sand; measured off the
    // capture, the ring was within four per cent of the road it was drawn on.
    // Alternating a bright dash with a near-black one instead guarantees the
    // contrast comes from the mark itself rather than from whatever it happens
    // to be lying on, and reads on tarmac, on rubble and in shadow alike.
    this.markerMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        // Amber, not the usual designator green. Every other mark this game
        // draws is amber on near-black, and a lone spring-green reticle in the
        // middle of that is the one element that looks borrowed from a
        // different game.
        uColor: { value: new THREE.Color(1.0, 0.72, 0.26) },
        uTime: { value: 0 },
        uValid: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uValid;
        void main() {
          float dash = step(0.42, fract(vUv.x * 48.0 + uTime * 0.35));
          vec3 c = mix(vec3(1.0, 0.22, 0.14), uColor, uValid);
          float pulse = 0.82 + 0.18 * sin(uTime * 6.0);
          // Scene radiance here runs around two, so the lit dash has to be
          // written well above one to survive the tone curve as *bright*
          // rather than as mid-grey.
          vec3 lit = mix(c * 0.10, c * 3.4 * pulse, dash);
          gl_FragColor = vec4(lit, 0.94);
        }
      `,
    });
    this.markerRing = new THREE.Mesh(ringGeo, this.markerMaterial);
    this.markerRing.renderOrder = 900;
    this.markerGroup.add(this.markerRing);

    // Preview of where the stick is going to walk. Showing the player the
    // footprint before they commit is the difference between "call a strike"
    // and "aim a strike".
    for (let i = 0; i < JET_STORES * 2; i++) {
      const g = new THREE.RingGeometry(1, 1.1, 28);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, this.markerMaterial);
      m.renderOrder = 899;
      m.visible = false;
      this.markerGroup.add(m);
      this.previewRings.push(m);
    }

    // A drawn line with an arrowhead, not a painted taxiway. Seen from eye
    // height the axis is almost edge-on, so every extra centimetre of width
    // becomes a metre of amber smeared along the street; the shaft is kept at
    // roughly a road marking's width and the head does the work of pointing.
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 3.4);
    arrowShape.lineTo(-0.85, 2.0);
    arrowShape.lineTo(-0.22, 2.0);
    arrowShape.lineTo(-0.22, -3.4);
    arrowShape.lineTo(0.22, -3.4);
    arrowShape.lineTo(0.22, 2.0);
    arrowShape.lineTo(0.85, 2.0);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(-Math.PI / 2);
    // Depth tested, unlike the beam. It lies flat on the street, and drawn
    // through the world it was a fifty-square-metre additive slab painted over
    // the sandbags, the road and the player's own rifle — the single ugliest
    // thing in the feature, and the first thing anyone sees of it.
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffb84a,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.markerArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.markerArrow.position.y = 0.06;
    this.markerArrow.renderOrder = 901;
    this.markerGroup.add(this.markerArrow);

    // Vertical beam so the designated point is visible from behind cover.
    const beamGeo = new THREE.CylinderGeometry(0.16, 0.16, 60, 8, 1, true);
    beamGeo.translate(0, 30, 0);
    {
      const p = beamGeo.getAttribute('position') as THREE.BufferAttribute;
      const col = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const t = THREE.MathUtils.clamp(p.getY(i) / 60, 0, 1);
        col[i * 4 + 0] = 1.0;
        col[i * 4 + 1] = 0.72;
        col[i * 4 + 2] = 0.26;
        col[i * 4 + 3] = Math.pow(1 - t, 2.2) * 0.45;
      }
      beamGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    }
    this.markerBeam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        // The one part of the marker that is allowed through the world: a
        // designation the player loses the moment they step behind the wall
        // they are sheltering against is not a designation. It is a third of
        // a metre across, so drawn over the street it is a line, not a slab.
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.markerBeam.renderOrder = 898;
    this.markerGroup.add(this.markerBeam);
  }

  // ------------------------------------------------------------- targeting --

  beginTargeting(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'targeting';
    this.targetingStage = 'point';
    this.markerGroup.visible = true;
    Signals.emit('ui:notify', {
      title: 'CAS ON STATION',
      subtitle: 'DESIGNATE IMPACT POINT',
      tone: 'good',
    });
    Signals.emit('audio:oneshot', { id: 'ks_arm', volume: 0.8 });
  }

  cancelTargeting(): void {
    if (this.phase !== 'targeting') return;
    this.phase = 'idle';
    this.targetingStage = 'point';
    this.markerGroup.visible = false;
    Signals.emit('ui:notify', { title: 'STRIKE ABORTED', tone: 'bad' });
  }

  private updateTargeting(ctx: EngineContext): void {
    const cam = ctx.camera;
    const dir = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = this.physics.trace(cam.position, dir, 400);

    this.markerValid = hit.hit && hit.normal.y > 0.45 && this.level.bounds.containsPoint(hit.point);

    if (hit.hit && this.targetingStage === 'point') {
      this.target.copy(hit.point);
    }
    this.markerGroup.position.copy(this.target).add(this._v2.set(0, 0.08, 0));

    const time = ctx.time.elapsed;
    this.markerMaterial.uniforms.uTime.value = time;
    this.markerMaterial.uniforms.uValid.value = this.markerValid || this.targetingStage === 'heading' ? 1 : 0;
    // The lethal radius, drawn at life size so "danger close" is a distance
    // the player can see rather than a word the HUD says.
    this.markerRing.scale.setScalar(BOMB.radius);

    if (this.targetingStage === 'heading') {
      if (hit.hit) {
        const to = this._v2.copy(hit.point).sub(this.target);
        if (to.lengthSq() > 4) this.heading = this.safeHeading(Math.atan2(to.x, to.z));
      }
      this.markerArrow.rotation.y = this.heading;
      this.markerArrow.visible = true;
      // A run-in indicator, not a runway. The shape is 6.6 units long, so at
      // the old half-a-blast-radius it came out twenty-five metres nose to
      // tail and swallowed the street it was drawn on.
      this.markerArrow.scale.setScalar(BOMB.radius * 0.2);
      this.refreshAimPoints();
      for (let i = 0; i < this.previewRings.length; i++) {
        const ring = this.previewRings[i];
        const p = this.aimPoints[i];
        if (!p) {
          ring.visible = false;
          continue;
        }
        ring.visible = true;
        ring.position.copy(p).sub(this.target).setY(0.04);
        // Aim points, not blast circles. At the lethal radius the eight of
        // them overlap into one continuous ellipse eighty metres long and the
        // footprint stops being readable as a *sequence*; at a third of it
        // they read as a row of marks walking up the axis, which is the thing
        // the preview exists to show.
        ring.scale.setScalar(BOMB.radius * 0.42);
      }
    } else {
      this.markerArrow.visible = false;
      for (const r of this.previewRings) r.visible = false;
    }

    const input = ctx.input;
    if (input.pressed('ads')) {
      this.cancelTargeting();
      return;
    }
    if (input.pressed('fire')) {
      if (!this.markerValid && this.targetingStage === 'point') {
        Signals.emit('audio:oneshot', { id: 'ui_error', volume: 0.6 });
        Signals.emit('ui:notify', { title: 'NO VALID IMPACT POINT', tone: 'bad' });
        return;
      }
      if (this.targetingStage === 'point') {
        this.targetingStage = 'heading';
        // Open the second stage on a run-in that comes back down the player's
        // own line of sight, canted a fifth of a radian off so the pair pass
        // beside them rather than exactly over their head. That is the most
        // legible delivery there is — the flight is dead ahead and descending
        // the whole way in — and it is already a legal heading, so the player
        // can commit immediately and still get a good pass.
        this.heading = this.safeHeading(
          Math.atan2(
            this.target.x - this.ctx.camera.position.x,
            this.target.z - this.ctx.camera.position.z,
          ) + DEFAULT_OFFSET,
        );
        Signals.emit('ui:notify', {
          title: 'SET ATTACK HEADING',
          subtitle: 'SWEEP TO AIM — CONFIRM TO COMMIT',
          tone: 'neutral',
        });
        Signals.emit('audio:oneshot', { id: 'ui_confirm', volume: 0.7 });
      } else {
        this.launch();
      }
    }
  }

  /**
   * Constrains a run-in bearing so the stick can never walk onto the player.
   *
   * The stick ends on the mark and everything before it lands further up the
   * run-in axis, so the question is which side of the target the flight comes
   * from: come in from the player's own side and the whole footprint is laid
   * out behind the mark, on top of them.
   *
   * Real close air support solves this with a run-in restriction — the FAC
   * gives an attack heading that keeps the aircraft, and therefore the stick,
   * off the friendly axis. Same rule here: the bearing the flight comes *from*
   * is clamped into the hemisphere away from the player, so the craters always
   * walk toward them and stop short. The player still has a hundred and fifty
   * degrees to choose from and never has to know the rule exists, because the
   * only headings it takes away are the ones that would have killed them.
   *
   * Measured against the player body rather than the camera. They are the same
   * place a frame after the player has moved, but `launch` can be called
   * before the transform has ever been written — a capture harness sets a
   * spawn and calls straight into the killstreak — and then the camera is
   * still at the world origin. The same fire mission then came out on a
   * different bearing depending on whether a frame had run yet, which made the
   * safety rule the least predictable thing about the strike.
   */
  private safeHeading(desired: number): number {
    const awayFromPlayer = Math.atan2(
      this.target.x - this.player.position.x,
      this.target.z - this.player.position.z,
    );
    let delta = desired - awayFromPlayer;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return awayFromPlayer + THREE.MathUtils.clamp(delta, -SAFE_ARC, SAFE_ARC);
  }

  /**
   * Picks the run-in the player can actually watch.
   *
   * `safeHeading` answers "will this kill the man who called it". This answers
   * the question that turned out to matter just as much and had never been
   * asked at all: *can he see it happen*.
   *
   * The player is standing in a street. A street is a slot: from eye level the
   * sky is open down the carriageway and behind a two-storey parapet
   * everywhere else, and the ground is visible for thirty metres ahead and
   * nowhere to the sides. Measured from the shipped capture pose, the sky is
   * clear from one degree up along the run of the street and from twenty-four
   * degrees up across the block — so an attack axis forty-five degrees off the
   * carriageway puts the entire delivery behind a roofline. It photographed
   * exactly like that: an aeroplane the review could not find, a stick of eight
   * that detonated out of sight, and a market that filled with dust from
   * nowhere. Every one of those is a geometry problem and none of them is a
   * rendering problem.
   *
   * So the axis is *solved* rather than clamped. Candidates across the safe arc
   * are scored by how much of the run-in and how much of the footprint is in
   * the clear from the player's own eye, weighted by how big each is on screen,
   * and the requested bearing wins ties by a wide margin — a player who has
   * swept a heading and watched a preview sit on it gets that heading unless it
   * is genuinely blind, in which case the flight is re-tasked onto something
   * they can see. That is also what a controller with eyes on the target does,
   * and for the same reason.
   */
  private solveRunIn(requested: number): number {
    const away = Math.atan2(
      this.target.x - this.player.position.x,
      this.target.z - this.player.position.z,
    );
    let asked = requested - away;
    while (asked > Math.PI) asked -= Math.PI * 2;
    while (asked < -Math.PI) asked += Math.PI * 2;
    // Whether the request survived the safety clamp, which decides later
    // whether it is treated as a choice at all.
    const chosen = Math.abs(asked) <= SAFE_ARC;
    asked = THREE.MathUtils.clamp(asked, -SAFE_ARC, SAFE_ARC);

    // The safety clamp deliberately measures off the player body because the
    // camera transform may not have been written yet. This one cannot: it is
    // a question about a view. If the two disagree there is no view to reason
    // about, so it declines rather than solving against the world origin.
    if (this.ctx.camera.position.distanceToSquared(this.player.position) > 25) {
      this.setProfile(away + asked, 0.34);
      return away + asked;
    }

    this.eye.copy(this.ctx.camera.position);

    // Bearing and elevation are solved together because they are not
    // separable: the angle a bearing can be flown at is set by its skyline,
    // and how good that bearing is is mostly set by the angle it forces.
    let bestElev = ELEV_STEPS[ELEV_STEPS.length - 1];
    const rate = (off: number): number => {
      let top = -1;
      for (const elev of ELEV_STEPS) {
        const score = this.scoreRun(away + off, elev);
        if (score > top) { top = score; bestElev = elev; }
      }
      return top;
    };

    let bestBearing = 0;
    let bestScore = -1;
    let elevAt = bestElev;
    const steps = 8;
    for (let i = -steps; i <= steps; i++) {
      const off = (i / steps) * SAFE_ARC;
      const score = rate(off);
      if (score > bestScore) { bestScore = score; bestBearing = off; elevAt = bestElev; }
    }
    // Then refine, because the gaps in a skyline are narrower than a tenth of
    // a radian. Measured across the safe arc from the shipped capture pose,
    // the score goes 2.1, 8.1, 5.2 over three consecutive coarse steps — a
    // corridor between two rooflines about four degrees wide with the best
    // approach of the whole search inside it. A sweep that can only land on
    // multiples of six degrees finds that by luck or not at all.
    for (const d of [SAFE_ARC / 16, SAFE_ARC / 32]) {
      for (const off of [bestBearing - d, bestBearing + d]) {
        if (Math.abs(off) > SAFE_ARC) continue;
        const score = rate(off);
        if (score > bestScore) { bestScore = score; bestBearing = off; elevAt = bestElev; }
      }
    }

    const askedScore = chosen ? rate(asked) : -1;
    const askedElev = bestElev;
    // Only re-task if the requested axis is genuinely poorer. The score is
    // roughly "how much of the event the player is shown", so the threshold is
    // how much of their own strike they are asked to give up in exchange for
    // getting the axis they swept. A fifth is a fair price and a third is not.
    // The *elevation* is never theirs to ask for — they designate a point and a
    // direction, not a profile — so their bearing still gets flown at whichever
    // angle best suits it.
    //
    // A bearing that the safety clamp had to move is not a request. It used to
    // be treated as one, and the effect was to hand the whole solve to whatever
    // sat at the edge of the safe arc: the capture harness asks for an axis 90
    // degrees off, the clamp pins it to exactly `SAFE_ARC`, that lands within a
    // fifth of the best approach available and is therefore kept — so the arc
    // *boundary* got flown every time, and the search across the other
    // eighty-nine degrees was decoration. The two runs are close on points and
    // not close in the frame: measured, the boundary axis passes three degrees
    // from the sun with nine frames of shadow, and the axis the search actually
    // wanted passes seven degrees clear of it with twenty-five.
    const keep = chosen && askedScore >= bestScore * 0.8;
    this.setProfile(away + (keep ? asked : bestBearing), keep ? askedElev : elevAt);
    return away + (keep ? asked : bestBearing);
  }

  /**
   * Fixes everything about the profile that depends on where the flight is
   * coming from: where it crosses the player, how far off it crosses, and how
   * high it rides on the way in.
   */
  private setProfile(bearing: number, elev: number): void {
    this.eye.copy(this.ctx.camera.position);
    this.passS = this.passAlong(bearing);
    this.miss = this.missDistance(bearing, this.passS);
    this.elev = elev;
  }

  /**
   * Where along the track a store aimed at `aim` actually leaves the rack, on a
   * glide of slope `elev` that passes the eye at `passS` and misses it by
   * `miss`. Returns the release point, the height it happens at and the forward
   * throw from there.
   *
   * A fixed point iteration on the ballistics: guess a release, see where the
   * store lands, move the guess by the error. It converges in three passes
   * because the throw varies slowly with height — the derivative is about 1.4 m
   * of throw per metre of release, so the error contracts by a factor of three
   * each time.
   *
   * This exists because the release altitude is no longer a constant anybody can
   * write down. On a line-of-sight glide the aircraft is at whatever height the
   * profile gives it when the solution comes up, which is 55–70 m on the capture
   * pose and would be 30 on an open one, and both the solver's ordnance term and
   * the run-in scoring need to know which.
   */
  private solveRelease(
    aim: number, elev: number, passS: number, miss: number,
  ): { s: number; alt: number; along: number } {
    let s = aim - 60;
    let alt = 0;
    let along = 0;
    for (let i = 0; i < 3; i++) {
      alt = this.altitudeAt(elev, Math.hypot(passS - s, miss));
      const ahead = 2;
      const vy = (this.altitudeAt(elev, Math.hypot(passS - s - ahead, miss)) - alt)
        / (ahead / PROFILE.speed);
      along = this.solveImpact(0, alt, PROFILE.speed, vy).along;
      s = aim - along;
    }
    return { s, alt, along };
  }

  /** Along-track position at which a run-in on `bearing` passes the eye. */
  private passAlong(bearing: number): number {
    const cam = this.eye;
    return -(cam.x - this.target.x) * Math.sin(bearing)
      - (cam.z - this.target.z) * Math.cos(bearing);
  }

  /** How far to one side of the eye that run-in's ground track passes. */
  private missDistance(bearing: number, passS: number): number {
    const cam = this.eye;
    const dx = this.target.x - Math.sin(bearing) * passS - cam.x;
    const dz = this.target.z - Math.cos(bearing) * passS - cam.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * How much of a delivery flown on this bearing, at this approach angle, the
   * player would actually see. 0 upward.
   *
   * This is an integral of apparent size over the run rather than a
   * feasibility test, and that change is what fixed the event. The previous
   * solver asked "is this bearing blocked" and, on a map where every bearing
   * is blocked somewhere, answered yes to all seventeen and fell through to a
   * fixed steep approach — which is how the flight ended up riding a parapet
   * for two thirds of its run-in. Scoring what the player is shown, in units
   * they can be shown more or less of, discriminates even when nothing is
   * perfect, and it takes framing, occlusion, distance and the shadow in one
   * quantity instead of four rules that disagree.
   *
   * What it must *not* be is an integral, and that mistake cost a whole review
   * cycle. Summed over the approach, two seconds of a forty-pixel aeroplane
   * scraping along the top edge of the picture outscores nine tenths of a
   * second of a two-hundred-pixel one crossing the upper third — so the solver
   * dutifully picked the first, and the reviewer wrote that the aircraft was
   * "a handful of dark pixels clipped by the top edge of frame" and that they
   * had to hunt for it. Both descriptions are of a run that won on points.
   *
   * A flypast is not an amount of aeroplane-seconds. It is one moment that
   * lands, with a build-up to it. So:
   *
   * The **hero** term is the single best frame the run offers — the largest
   * apparent span at any sample that is legible, inside the picture and not in
   * front of the sun. A max, not a sum, so a run cannot buy its way to a good
   * score with duration, and the only way to raise it is to put a bigger
   * aeroplane somewhere a player is looking.
   *
   * "Legible" rather than "unoccluded", and that distinction cost a review of
   * its own. Every sample is now weighed by `legibility`, which asks both how
   * much of the airframe something is in front of *and how far away whatever is
   * behind it is*. Nothing else in the score could express the difference
   * between a silhouette and a dark grey aeroplane ten metres in front of a
   * shaded wall, and the second one is what the solver kept choosing: measured
   * on the run this replaces, the flight was in frame, unoccluded and four per
   * cent of frame width across the whole approach, against the face of a
   * three-storey block, and it cannot be found in the capture.
   *
   * The **dwell** term counts how many samples clear `LEGIBLE_SPAN`, which
   * stops the hero term from being satisfied by a single frame. Weighted well
   * below hero: a run that is legible for a third of a second at 200 px beats
   * one that is legible for a second at 110.
   *
   * The **shadow** term is the reason the elevation ladder exists at all. The
   * shape is thrown 2.3 times the aircraft's altitude back down the approach,
   * so a steep run's shadow is behind the player's head for the whole event
   * and a shallow one's sweeps up the street in front of them. That is the
   * difference between the strongest scale cue available being present and
   * being a line of code that has never once put a pixel on the screen.
   *
   * The **footprint** term does the same for the aim points, traced to the
   * height of a fireball rather than to the deck — what has to clear the
   * roofline is the burst, not the crater.
   *
   * Zero if the path does not clear the level by `CLEARANCE`.
   */
  private scoreRun(bearing: number, elev: number): number {
    const cam = this.eye;
    const axis = this._v2.set(-Math.sin(bearing), 0, -Math.cos(bearing));
    const probe = this._v;
    const passS = this.passAlong(bearing);
    const miss = this.missDistance(bearing, passS);
    const sun = this.ctx.engine.pipeline.sunDirection;
    const shadowRun = sun.y > 0.12 ? 1 / sun.y : 0;

    // Clearance first, on its own even schedule, because it can reject the
    // candidate outright and the rest of the score is not cheap.
    const room = this.clearanceOf(bearing, elev, passS, miss);
    if (room <= 0) return 0;

    // Then the one rule that is not a preference. The stick is laid along the
    // ground track, so a wide run-in swings the far end of it toward the player
    // even though every crater is still at or beyond the mark they designated:
    // measured at the widest bearing the arc allows, the opening round lands
    // 37 m from the eye against a 15 m lethal radius. That is close and it is
    // meant to be. Inside 30 m it is a fire mission that can kill the man who
    // called it, so it scores nothing at all and the search moves on.
    for (let i = 0; i < JET_STORES; i++) {
      const along = stickBase() + i * PROFILE.stickSpacing;
      probe.set(
        this.target.x + axis.x * along, this.target.y, this.target.z + axis.z * along,
      );
      if (probe.distanceToSquared(cam) < DANGER_CLOSE * DANGER_CLOSE) return 0;
    }

    let hero = 0;
    let dwell = 0;
    let shade = 0;
    let shown = 0;
    let offered = 0;
    let airLo = Infinity;
    let airHi = -Infinity;
    for (let k = 0; k < RUN_SAMPLES.length; k++) {
      const d = PROFILE.runIn * RUN_SAMPLES[k];
      const s = passS - d;
      const alt = this.altitudeAt(elev, Math.hypot(d, miss));
      probe.set(this.target.x + axis.x * s, alt, this.target.z + axis.z * s);
      // Accumulated before anything can reject the sample, because the
      // denominator of the continuity term is what the run *had to offer* and a
      // sample the player cannot see still offered it.
      const span = this.apparentSize(probe, axis);
      offered += span;
      if (!this.inView(probe)) continue;
      const seen = this.legibility(probe, AIRFRAME_RADIUS);
      if (seen <= 0) continue;
      // Framed at the airframe's *own* angular size, which is the whole point of
      // the test and was being left at the default. At the pass the aeroplane
      // subtends about a fifth of a radian and the default is a fiftieth, so
      // clipping was under-detected by an order of magnitude: a sample whose
      // centre was inside the top edge scored full marks with three quarters of
      // the aircraft above it. That is, precisely, "a handful of dark pixels
      // clipped by the top edge of frame".
      const frame = this.framing(span * 0.5, this.apparentHeight * 0.5);
      const show = span * frame * seen * this.glare(probe, sun);
      shown += show;
      if (show > hero) hero = show;
      if (span > LEGIBLE_SPAN && frame > 0.6 && seen > 0.5) dwell++;
      const b = this.bearingOf(probe);
      airLo = Math.min(airLo, b);
      airHi = Math.max(airHi, b);
    }

    // The approach, on its own evenly spaced schedule. Both terms taken here
    // are about the *run-in* rather than about the pass, and reading either of
    // them off `RUN_SAMPLES` gets the wrong answer for the same reason.
    //
    // The shadow especially: the shape is thrown 2.3 times the aircraft's
    // altitude back down the run, so it lands in front of the player while the
    // flight is still far out and high, and it has swung behind their head long
    // before the pass. Measured on the axis this now flies, it is on visible
    // ground from 222 m to 106 m, and only two of the six samples the score
    // used to take fell inside that window. The strongest scale cue in the file
    // was being scored at a third of its worth for that reason alone.
    for (let i = 0; i < APPROACH_SAMPLES; i++) {
      const d = PROFILE.runIn * (0.95 - (i / (APPROACH_SAMPLES - 1)) * 0.8);
      const s = passS - d;
      const alt = this.altitudeAt(elev, Math.hypot(d, miss));
      const altitude = alt - this.groundY;
      probe.set(this.target.x + axis.x * s, alt, this.target.z + axis.z * s);
      if (shadowRun <= 0) continue;
      // Matches the fade in `JetShadows.place`: a shape thrown from cruise
      // altitude is too faint to count as a cue even where it is in shot.
      const density = 1 - THREE.MathUtils.smoothstep(altitude, 40, 140);
      if (density < 0.12) continue;
      probe.addScaledVector(sun, -altitude * shadowRun).setY(this.groundY + 0.5);
      if (!this.inView(probe)) continue;
      const frame = this.framing();
      if (this.blocked(probe, 2)) continue;
      shade += density * frame
        * Math.min(1, 40 / Math.max(20, probe.distanceTo(cam)));
    }

    let ground = 0;
    let lo = Infinity;
    let hi = -Infinity;
    const step = PROFILE.stickSpacing;
    for (let i = 0; i < JET_STORES; i++) {
      const along = stickBase() + i * step;
      probe.set(
        this.target.x + axis.x * along,
        this.target.y + 7,
        this.target.z + axis.z * along,
      );
      if (!this.inView(probe)) continue;
      // Probed at the width of a fireball rather than as a point, so a burst
      // half behind a market stall counts for half rather than for nothing.
      const seen = this.legibility(probe, 8);
      if (seen <= 0) continue;
      ground += seen * Math.min(0.6, 30 / Math.max(20, probe.distanceTo(cam)));
      const b = this.bearingOf(probe);
      lo = Math.min(lo, b);
      hi = Math.max(hi, b);
    }

    // The ordnance itself, which nothing in this score used to ask about.
    //
    // "At STORES AWAY 00.4s there is no ordnance anywhere in the frame. No
    // bodies, no fins, no retard chutes, no motion streaks." That was true, and
    // it was true for a geometric reason the score had no term for: a store is
    // a three-metre object, so it is legible inside about seventy metres and
    // invisible beyond it, and the axis decides which.
    //
    // Sampled down the *actual* trajectory rather than at a nominal release
    // point, because on a dive delivery the two are nowhere near each other —
    // the release is 55 to 70 m up and the fall is a second and a half long, so
    // where the store is when the player looks for it is a question about the
    // arc and not about the rack.
    const release = this.solveRelease(stickBase(), elev, passS, miss);
    let stores = 0;
    for (let i = 0; i < STORE_SAMPLES; i++) {
      const f = (i + 0.5) / STORE_SAMPLES;
      probe.set(
        this.target.x + axis.x * (release.s + release.along * f),
        THREE.MathUtils.lerp(release.alt, this.groundY, f * f),
        this.target.z + axis.z * (release.s + release.along * f),
      );
      if (!this.inView(probe)) continue;
      const frame = this.framing();
      // Radius of a store with its ballute streamed, and the range at which
      // three metres stops being a smudge.
      stores += this.legibility(probe, 1.6) * frame
        * Math.min(1, 70 / Math.max(30, probe.distanceTo(cam))) / STORE_SAMPLES;
    }

    // Both halves also have to *spread*, and leaving that out is what made the
    // solver reliably choose the dullest axis available.
    //
    // Visibility alone has a degenerate maximum: a run-in straight down the
    // player's sightline keeps every sample in the middle of the frame and
    // clear of every rooftop, so it wins on both terms of the score above by a
    // distance. What it produces is a stick of eight that walks directly away
    // from the eye. Measured on the axis this used to pick, the eight craters
    // landed inside seventy pixels of each other — a barrage the player hears
    // as eight events and sees as one smudge — while the aeroplane held a
    // single screen position from four hundred metres to overhead, growing but
    // never *moving*, which reads as a zoom rather than as a flypast.
    //
    // Measuring the horizontal bearing swept by the visible samples fixes both
    // at once, and it cannot run away with the answer, because a wider axis
    // swings the footprint off the carriageway and the samples that end up
    // behind a parapet stop being counted at all. The widest bearing whose
    // rounds are still in the open wins, which is the actual thing wanted.
    const spread = (a: number, b: number): number => (a > b ? 0 : Math.min(1.5, b - a));
    // Weights, and the ordering of them is the argument of the whole file: the
    // aeroplane first, then the cue that tells the player how big and how fast
    // it is, then where the bombs land.
    //
    // `hero` is a span in radians capped at 0.6, so it contributes up to about
    // 7 and in practice 4 to 5. A shadow seen across most of its window is
    // worth 3, which is deliberately large for a "supporting" cue: it is the
    // only thing in the entire event that happens in the world *before* the
    // aircraft is legible, and an airstrike with no anticipation was one of the
    // three headline failures of the last review. It cannot run away with the
    // solve because it is bounded and because `glare` independently vetoes the
    // approaches that fly up-sun to get it.
    //
    // The footprint was weighted at 1.4, then cut to 0.6 on the argument that
    // the mark is in front of the player by construction so whether they can see
    // the bursts is close to a given. That argument is wrong on any pose with
    // something standing between the player and the mark, and this one has a
    // market gate eighteen metres away. Measured across the safe arc: two axes
    // with *identical* aircraft geometry — same peak, same continuity, same
    // release — put one crater and four craters respectively in the clear, and
    // the score preferred the one with one. Four visible bursts against one is
    // not a nudge, it is the difference between a strike landing and a strike
    // happening somewhere else, so it is back up to 1.3.
    // Continuity of the approach. `hero` is a maximum and `dwell` a count near
    // the pass, so between them they cannot tell a flight that is in sight for
    // the whole run-in from one that appears from behind a roof at the last
    // moment. The second is a worse event for a reason that has nothing to do
    // with its best frame: there is no *approach*, so there is no anticipation,
    // and the aeroplane arrives already overhead.
    //
    // A factor rather than a term, because added it was worth at most a point
    // out of twelve while the fraction of the approach a player could see varied
    // between a half and nine tenths — the ranking was decided by hero frames a
    // pixel or two apart and was blind to whether there was an approach at all.
    //
    // Weighted by apparent size, and that correction is what this iteration
    // turned on. Counting samples equally makes a blind spot 190 m out cost
    // exactly as much as one at 40 m, and they are not remotely the same defect:
    // measured on the axis this replaces, the flight was clear for seven of nine
    // approach samples — a continuity of 0.78, near the top of the field — and
    // the two it lost were the two where it was largest. It went behind the
    // market gate at 12% of frame width, crossed 37 m of masonry, and came out
    // the other side at 41%, so the frame the review would have sampled at
    // STORES AWAY was a wall. Dividing what the player was *shown* by what the
    // run *offered* prices that correctly: the gap is charged at the size of the
    // aeroplane that was in it.
    const continuity = shown / Math.max(1e-6, offered);
    return (hero * 12 * (1 + spread(airLo, airHi) * 0.5)
      + dwell * 0.5
      + Math.min(1, shade / 3.4) * 3
      + stores * 1.6
      + ground * 1.3 * (1 + spread(lo, hi) * 1.6))
      * room * (0.15 + 0.85 * continuity);
  }

  /**
   * Angular *width* of the airframe at `point` on course `axis`, in radians —
   * the quantity a reviewer means by "the airframe fills n% of frame width",
   * which is the only figure of merit anyone has ever quoted at this file.
   * `apparentHeight` is written alongside it.
   *
   * The two things it has to get right are aspect and foreshortening, and the
   * two previous versions each got one of them.
   *
   * `span / range` was blind to aspect: it scored an aeroplane seen end-on,
   * presenting a fuselage cross-section and two wings edge-on, identically to
   * one crossing the view with its whole planform showing.
   *
   * The three-plane box model that replaced it fixed that and introduced a
   * subtler error, because it returned the square root of a projected *area*.
   * An aeroplane is not square: 16 m of span and 16 m of length across 30 m² of
   * planform means the root of the area is 5.5 m where the silhouette is 16 m
   * wide, and the error is not a constant factor because it depends on how much
   * of the planform is turned toward the eye. Measured across the safe arc it
   * inverted the ranking of two candidates whose true silhouettes were 46% and
   * 28% of frame width — it preferred the 28%.
   *
   * So the airframe is treated as a flat cross of `SPAN` across by `LENGTH`
   * along, and each arm is projected onto the screen axes at the object. That
   * is exact for the extent of a cross and within a few per cent of the traced
   * planform, which is all it has to be: it is choosing between candidates, not
   * drawing them.
   *
   * Bank is ignored. The roll schedule is cosmetic and finished before the
   * pass, and folding it in would make the score depend on the release solution
   * that the score is being used to choose.
   */
  private apparentSize(point: THREE.Vector3, axis: THREE.Vector3): number {
    const to = this._probeTo.copy(point).sub(this.eye);
    const range = to.length();
    if (range < 8) { this.apparentHeight = 0.6; return 0.6; }
    to.divideScalar(range);
    // Screen axes *at the object*: `right` is across the line of sight and
    // level, `up` completes the frame. Foreshortening falls out of the dot
    // products — an aeroplane directly overhead has its length along `up`.
    const right = this._sizeRight.set(-to.z, 0, to.x);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = this._sizeUp.crossVectors(right, to).normalize();
    const side = this._probeSide.set(-axis.z, 0, axis.x);
    const w = Math.hypot(SPAN * side.dot(right), LENGTH * axis.dot(right));
    const h = Math.hypot(SPAN * side.dot(up), LENGTH * axis.dot(up), FIN_HEIGHT);
    this.apparentHeight = Math.min(0.6, h / range);
    return Math.min(0.6, w / range);
  }

  /** Angular half-height of the last `apparentSize` probe. */
  private apparentHeight = 0;

  /**
   * How much room a candidate path has over the level, as a factor: 0 if it
   * touches anything, ramping to 1 at `CLEARANCE` metres.
   *
   * Each sample is traced from well above the path straight down, rather than
   * from the path itself, and that is deliberate: a ray starting *inside* a
   * building leaves through a back face and most raycasters report no hit at
   * all, so the cheap version of this test passes exactly the paths it exists
   * to reject. From above, the first surface found is the topmost thing over
   * the track, and a negative gap means the aeroplane is threading a roof or
   * flying under an arch.
   *
   * Samples above 55 m are skipped, where nothing on a street map can be in
   * the way, which on a steep candidate is all of them.
   */
  private clearanceOf(
    bearing: number, elev: number, passS: number, miss: number,
  ): number {
    const ax = -Math.sin(bearing);
    const az = -Math.cos(bearing);
    const down = this._v3.set(0, -1, 0);
    let room = 1;
    // Out past the overflight as well as short of it: the glide bottoms out at
    // the pass and the ground beyond the player is no flatter than the ground
    // before them.
    for (let i = 0; i < CLEARANCE_SAMPLES; i++) {
      const d = PROFILE.runIn * (1 - i / (CLEARANCE_SAMPLES - 1)) * 0.98
        - PROFILE.breakPast * (i / (CLEARANCE_SAMPLES - 1));
      const alt = this.altitudeAt(elev, Math.hypot(d, miss));
      if (alt - this.groundY > 55) continue;
      const s = passS - d;
      this._v5.set(this.target.x + ax * s, alt + 90, this.target.z + az * s);
      const hit = this.physics.trace(this._v5, down, 130);
      if (!hit.hit) continue;
      const gap = alt - hit.point.y;
      if (gap <= 0) return 0;
      room = Math.min(room, THREE.MathUtils.smoothstep(gap, 0, CLEARANCE));
    }
    return room;
  }

  /**
   * How much of an object at the point `inView` last projected is inside the
   * picture, 0..1. `size` is its angular half-extent in radians.
   *
   * Two things, and they used to be conflated into one falloff that got both
   * slightly wrong.
   *
   * The first is *clipping*, which is a fact: an object whose apparent radius
   * is bigger than its distance from the edge is partly outside the frame, and
   * how much is arithmetic. Scoring that off the centre point alone is how a
   * solver measuring visibility kept choosing approaches that put the aeroplane
   * along the top edge — a sample four degrees outside the edge and one four
   * degrees inside scored the same.
   *
   * The second is *composition*, which is a preference: all else equal, a pass
   * through the middle of the picture is better than one along the top of it.
   * That was previously worth so much — nothing above two thirds of the way up
   * scored at all — that it vetoed the only passes the architecture allows.
   * From a standing eye in a built-up street the sky below about thirty degrees
   * is roofline, so an aeroplane that is *visible at all* is in the top third of
   * the frame; a term that refuses to score it is not expressing taste, it is
   * refusing to look at the only candidates there are. So it is now a 45% swing
   * on top of a floor rather than a gate.
   *
   * `vsize` is the half-extent to use vertically, and passing it separately
   * matters more than it looks. An aeroplane is about twice as wide as it is
   * tall, and the clipping test was using the width for both axes — so at the
   * pass, where the airframe subtends fifty degrees across and thirty up, the
   * vertical test was asking whether something half again as tall as the
   * aircraft fitted under the top edge. That reads as clipping where there is
   * none and, worse, is the same wrong answer for every candidate, so the term
   * stopped discriminating exactly where the event is decided.
   */
  private framing(size = 0.02, vsize = size): number {
    const p = this._v4;
    const cam = this.ctx.camera as THREE.PerspectiveCamera;
    const tanV = Math.tan((cam.fov * Math.PI) / 360);
    const hy = vsize / tanV;
    const hx = size / (tanV * Math.max(0.2, cam.aspect));
    const inside = (c: number, h: number): number => THREE.MathUtils.clamp(
      (1 - Math.abs(c)) / (2 * Math.max(1e-4, h)) + 0.5, 0, 1,
    );
    const centre = THREE.MathUtils.smoothstep(1.0 - Math.abs(p.y), 0, 0.3)
      * THREE.MathUtils.smoothstep(1.04 - Math.abs(p.x), 0, 0.14);
    return inside(p.x, hx) * inside(p.y, hy) * (0.55 + 0.45 * centre);
  }

  /**
   * How much of an aircraft at `point` survives the sun behind it, 0..1.
   *
   * The first solve that scored visibility properly flew the pair seven
   * degrees from the sun for the whole run-in, and the capture is the argument
   * for this function: a correctly sized, correctly framed, entirely
   * unoccluded aeroplane that cannot be seen, because the twenty degrees of
   * sky around a desert sun is a white field after bloom and tone mapping and
   * a dark grey silhouette in front of it has nothing to be dark against.
   *
   * Nothing else in the score can express that. Occlusion says clear, framing
   * says centred, size says thirty pixels, and all three are true. This is
   * a contrast term, and it is the reason a real director of photography
   * would never put the hero shot into the sun either.
   *
   * Full marks past about twenty degrees of separation, nothing inside seven.
   */
  private glare(point: THREE.Vector3, sun: THREE.Vector3): number {
    if (sun.y < 0.02) return 1;
    const to = this._v3.copy(point).sub(this.eye).normalize();
    return 1 - THREE.MathUtils.smoothstep(to.dot(sun), 0.94, 0.992);
  }

  /** Horizontal angle of a point off the view axis, signed, in radians. */
  private bearingOf(point: THREE.Vector3): number {
    this._v3.copy(point).sub(this.ctx.camera.position);
    const f = this.viewForward();
    return Math.atan2(this._v3.x * f.z - this._v3.z * f.x, this._v3.x * f.x + this._v3.z * f.z);
  }

  /** Whether a world point is inside the player's field of view. */
  private inView(point: THREE.Vector3): boolean {
    const cam = this.ctx.camera;
    if (point.distanceToSquared(cam.position) > 520 * 520) return false;
    // Projected, not coned.
    //
    // This used to be a dot product against the view axis with a threshold
    // set from the *horizontal* half-angle, 56 degrees. The frame is only 40
    // degrees tall, so the test passed anything up to sixteen degrees above
    // the top edge — which is exactly where a steep approach lives. The
    // solver was therefore scoring, as visible, aircraft that were off the
    // top of the picture, and reliably preferring the steepest axis on offer.
    this._v4.copy(point).project(cam);
    return this._v4.z < 1
      && Math.abs(this._v4.x) < 1.1
      && Math.abs(this._v4.y) < 1.04;
  }

  private viewForward(): THREE.Vector3 {
    return this._fwd.set(0, 0, -1).applyQuaternion(this.ctx.camera.quaternion);
  }

  /** Whether the level stands between the camera and a point. */
  private blocked(point: THREE.Vector3, slack: number): boolean {
    const cam = this.ctx.camera.position;
    this._v3.copy(point).sub(cam);
    const len = this._v3.length();
    this._v3.divideScalar(len);
    return this.physics.trace(cam, this._v3, len - slack).hit;
  }

  /**
   * Fraction of the last `legibility` probe that was not behind anything.
   * Read straight after the call, in the manner of `framing`.
   */
  private clearFrac = 0;

  /**
   * How much of an object of radius `radius` at `point` the player can actually
   * make out, 0..1. Two factors, and the second one is new.
   *
   * **Coverage.** Five rays across the apparent disc rather than one at its
   * centre. A single ray is a question about a point, and almost nothing that
   * hides an aeroplane is a point: a market street is strung with cables and
   * awning poles that a centre ray reports as solid wall, and measured from the
   * shipped capture pose there are power lines nine metres up at nineteen
   * metres range which vetoed every approach through the one gap in the skyline
   * that the run-in could actually use. The same test, five rays wide, scores
   * those as four fifths visible, which is what they are. It also stops working
   * the other way round: a sample two metres inside a parapet edge used to
   * count for nothing and now counts for most of itself.
   *
   * **Contrast.** An aeroplane needs something to be dark *against*. The score
   * used to treat "no geometry between here and the eye" as visible, and it is
   * not the same thing — measured on the run this replaces, the flight spent
   * the whole approach unoccluded and in frame at four per cent of frame width
   * against the shaded face of a three-storey block forty metres away, and the
   * review could not find it. Ten metres of clear air in front of a wall is
   * not a silhouette. So the same five rays report how far away the *backdrop*
   * is, and a sample only counts fully when what is behind it is several times
   * further off than it is, which in practice means sky, or the far end of the
   * street.
   */
  private legibility(point: THREE.Vector3, radius: number): number {
    const cam = this.ctx.camera.position;
    const to = this._probeTo.copy(point).sub(cam);
    const range = to.length();
    if (range < 1) { this.clearFrac = 0; return 0; }
    to.divideScalar(range);
    // Basis across the apparent disc. `to` is never vertical enough for the
    // world up vector to be a degenerate choice here — a strike aircraft
    // directly overhead is outside the frame by construction.
    const side = this._probeSide.set(-to.z, 0, to.x);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const up = this._probeUp.crossVectors(side, to).normalize();
    const slack = Math.max(2, radius * 0.6);

    let clear = 0;
    let backdrop = 0;
    for (let i = 0; i < 5; i++) {
      const at = this._probeAt.copy(point);
      if (i === 1) at.addScaledVector(side, radius);
      else if (i === 2) at.addScaledVector(side, -radius);
      else if (i === 3) at.addScaledVector(up, radius);
      else if (i === 4) at.addScaledVector(up, -radius);
      const dir = this._probeDir.copy(at).sub(cam);
      const len = dir.length();
      dir.divideScalar(len);
      if (this.physics.trace(cam, dir, len - slack).hit) continue;
      clear++;
      // What is behind it. A miss is sky, which is the best backdrop there is.
      const far = this.physics.trace(cam, dir, 600);
      backdrop += far.hit ? far.distance : 600;
    }
    this.clearFrac = clear / 5;
    if (clear === 0) return 0;
    const ratio = backdrop / clear / range;
    return this.clearFrac * THREE.MathUtils.smoothstep(ratio, 1.2, 2.4);
  }

  /**
   * Course flown by aircraft `index`: the reciprocal of its run-in bearing.
   * Writes into `axis`, and the matching starboard vector into `side`.
   */
  private courseFor(index: number, axis: THREE.Vector3, side: THREE.Vector3): number {
    const bearing = this.heading
      + (index === 0 ? 0 : PROFILE.wingHeadingOffset * this.wingSide);
    axis.set(-Math.sin(bearing), 0, -Math.cos(bearing));
    side.set(axis.z, 0, -axis.x);
    return bearing;
  }

  /**
   * Picks the side of the lead's axis the wingman splits to.
   *
   * It used to be starboard, always, and half the ordnance in the package was
   * consequently delivered by an aeroplane nobody saw. The lead's bearing is
   * solved out of a corridor in the skyline, so it sits *near an edge of that
   * corridor as often as not*, and a fixed twenty-degree offset from it is a
   * coin toss between the same corridor and the masonry beside it. Measured on
   * the shipped capture pose: the lead was clear for four fifths of its run-in
   * and the wingman, nineteen degrees to starboard, was behind the market gate
   * for all of his.
   *
   * Two extra calls to the score at launch settle it, which is nothing next to
   * the sweep the lead's own bearing costs. The elevation is deliberately the
   * lead's: the pair fly the same profile, and a split attack is a split in
   * bearing rather than two separate solutions.
   */
  private solveWingSide(): void {
    const plus = this.scoreRun(this.heading + PROFILE.wingHeadingOffset, this.elev);
    const minus = this.scoreRun(this.heading - PROFILE.wingHeadingOffset, this.elev);
    this.wingSide = minus > plus ? -1 : 1;
  }

  /** Recomputes the predicted impact footprint for the current heading. */
  private refreshAimPoints(): void {
    this.aimPoints.length = 0;
    const step = PROFILE.stickSpacing;
    const axis = this._v2;
    const side = this._v3;
    for (let jetIndex = 0; jetIndex < 2; jetIndex++) {
      this.courseFor(jetIndex, axis, side);
      const aimBase = stickBase() + (jetIndex === 0 ? 0 : PROFILE.wingAlong);
      const lateral = jetIndex === 0 ? PROFILE.lead : PROFILE.wing;
      for (let i = 0; i < JET_STORES; i++) {
        const along = aimBase + i * step;
        this.aimPoints.push(
          new THREE.Vector3(
            this.target.x + axis.x * along + side.x * lateral,
            this.target.y,
            this.target.z + axis.z * along + side.z * lateral,
          ),
        );
      }
    }
  }

  // ---------------------------------------------------------------- launch --

  launch(): void {
    if (this.phase === 'inbound' || this.phase === 'impact') return;
    this.phase = 'inbound';
    this.timer = 0;
    this.detonations = 0;
    this.aftermathTimer = 0;
    this.warnedClose = false;
    this.sinceLastImpact = -1;
    this.sinceRelease = -1;
    this.lastPredicted = -1;
    this.shakeWant = 0;
    this.shakeWantDur = 0;
    this.shakeLive = 0;
    this.shakeGap = 0;
    this.markerGroup.visible = false;
    this.groundY = this.target.y;
    // Clamped here as well as in the targeting sweep, because the sweep is not
    // the only way in. Anything that sets a bearing and calls `launch` — the
    // capture harness does exactly that — gets whatever run-in it asked for,
    // and a bearing pointed at the player walks the stick over them: measured
    // from the shipped `airstrike` scenario, the opening store landed fourteen
    // metres in front of the caller, well inside a fifteen-metre lethal
    // radius. A fire mission that can kill the man who called it is a bug
    // wherever the bearing came from.
    this.heading = this.solveRunIn(this.heading);
    this.solveWingSide();
    this.refreshAimPoints();

    // Ordnance from a previous run is only possible in the capture harness,
    // which relaunches without tearing the world down — but a stale bomb would
    // detonate under the next strike's countdown, so clear it out.
    for (const b of this.bombs) this.group.remove(b.mesh);
    this.bombs.length = 0;
    for (const w of this.shockwaves) {
      w.age = w.life;
      w.mesh.visible = false;
    }
    this.dust.clear();
    this.shadows.clear();
    for (const t of this.bombTrails) t.clear();
    this.waves.length = 0;
    this.washMark[0] = -Infinity;
    this.washMark[1] = -Infinity;

    for (let i = 0; i < this.jets.length; i++) {
      const jet = this.jets[i];
      const bearing = this.courseFor(i, jet.axis, jet.side);
      // Course, not bearing: `heading` is where they come from.
      jet.heading = bearing + Math.PI;
      // Mirrored with the bearing split, or a wingman sent to port would be
      // displaced back across the lead's track instead of away from it.
      const lateral = i === 0 ? PROFILE.lead : PROFILE.wing * this.wingSide;
      jet.origin.copy(this.target).addScaledVector(jet.side, lateral);
      // Where this aircraft's own line goes past the eye. Solved off its own
      // origin and axis, so the wingman's offset track rounds out over the
      // player rather than over where the lead's would have.
      const dx = this.eye.x - jet.origin.x;
      const dz = this.eye.z - jet.origin.z;
      jet.passS = dx * jet.axis.x + dz * jet.axis.z;
      jet.miss = Math.hypot(dx - jet.axis.x * jet.passS, dz - jet.axis.z * jet.passS);
      // Backwards from the overflight, not forwards from the mark: the pass is
      // the beat everything else is timed against.
      jet.s = jet.passS - PROFILE.runIn;
      jet.bank = 0;
      jet.bankTarget = 0;
      jet.climb = 0;
      jet.climbTarget = 0;
      jet.phase = 'run';
      jet.delay = i * PROFILE.wingStagger;
      jet.bombsLeft = JET_STORES;
      jet.releaseTimer = 0;
      jet.aim = stickBase() + (i === 0 ? 0 : PROFILE.wingAlong);
      jet.storeIndex = i * JET_STORES;
      jet.pullTime = 0;
      jet.broke = false;
      jet.breakTime = 0;
      jet.audioStage = 0;
      jet.model.setStores(JET_STORES);
      jet.model.setAfterburner(0.45);
      jet.model.setLoad(0);
      jet.model.flybyPlayed = false;
      jet.model.group.visible = false;
      jet.trail.clear();
      jet.trailPrimed = false;
      this.placeJet(jet, 0);
    }
    this.primeTrail(this.jets[0]);

    this.ordnanceLeft = JET_STORES * this.jets.length;
    this.inboundSeconds = this.predictTimeToImpact();
    this.inboundProgress = 0;

    Signals.emit('killstreak:called', {
      id: 'airstrike',
      target: this.target.clone(),
      heading: this.heading,
    });
    Signals.emit('airstrike:inbound', {
      seconds: this.inboundSeconds,
      target: this.target.clone(),
      heading: this.heading,
    });
    // No centre-screen banner for the call.
    //
    // There was one, reading AIRSTRIKE INBOUND / DANGER CLOSE — TAKE COVER,
    // and it was wrong twice over. It said what the inbound strip at the top
    // of the frame already says, less well: the strip carries the countdown
    // and the run-in bearing, and this carried neither. And it was two hundred
    // pixels of black across the middle of the sky for the first two and a
    // half seconds of the event — which is precisely the window in which the
    // aircraft are visible, dead ahead, descending. Photographed at the
    // release, the banner was sitting on the wingman. The one thing the player
    // is supposed to be looking at during the anticipation beat was behind the
    // caption announcing it.
    //
    // The genuine warning still fires, from `detonate`, at the point a store
    // actually lands inside the player's fragmentation envelope.
    Signals.emit('audio:oneshot', { id: 'radio_airstrike', volume: 1 });
    Signals.emit('audio:music', { cue: 'danger' });

    // The approach is audible long before it is visible, which is the whole
    // anticipation beat. Volume is low: this is a jet a third of a kilometre
    // out, not overhead.
    Signals.emit('audio:oneshot', {
      id: 'jet_flyby',
      position: this.jets[0].position.clone(),
      volume: 0.55,
      pitch: 0.82,
    });
  }

  /**
   * Hands an aircraft the contrail it would already have been drawing.
   *
   * Density is sampled at the cruise altitude the ribbon was notionally laid
   * at, which is where the aircraft is at the moment this runs — the run-in is
   * level until the push-over, so the primed section is a straight line at a
   * constant height and the altitude term is constant along it.
   */
  private primeTrail(jet: Jet): void {
    if (jet.trailPrimed) return;
    jet.trailPrimed = true;
    jet.trail.density = 0.14 + 0.86 * THREE.MathUtils.smoothstep(
      jet.position.y - this.groundY, 32, 86,
    );
    // Three and a half seconds of it — half a kilometre, most of the way to
    // the ribbon's own life. The primed section is the only part of the trail
    // that exists during the beat it matters for, and a stub reads as a jet
    // that materialised rather than one that came from somewhere.
    jet.trail.prime(
      jet.position, this._v.copy(jet.axis).negate(), 3.4, PROFILE.speed,
    );
  }

  /** Forward-simulates the lead aircraft to time the HUD countdown. */
  private predictTimeToImpact(): number {
    const dt = 1 / 60;
    let s = this.passS - PROFILE.runIn;
    for (let i = 0; i < 600; i++) {
      const alt = this.profileAltitude(s);
      const vy = (this.profileAltitude(s + PROFILE.speed * dt) - alt) / dt;
      const solved = this.solveImpact(s, alt, PROFILE.speed, vy);
      if (solved.along >= stickBase()) return i * dt + solved.time;
      s += PROFILE.speed * dt;
    }
    return 4;
  }

  // ---------------------------------------------------------------- update --

  update(dt: number, ctx: EngineContext): void {
    switch (this.phase) {
      case 'targeting':
        this.updateTargeting(ctx);
        break;
      case 'inbound':
      case 'impact':
      case 'aftermath':
        this.updateStrike(dt, ctx);
        break;
      default:
        break;
    }
    this.updateBombs(dt);
    this.updateShockwaves(dt);
    // Outside the phase switch, both of them: a front still in transit when
    // the strike retires has to arrive anyway, and the shadow buffer has to be
    // emptied on the frame the last aircraft leaves rather than left holding a
    // silhouette on the street.
    this.updateWaves(dt);
    this.shadows.commit();
    this.fadeTrails(dt, ctx);
    // Outside the phase switch: the columns are the aftermath, and they have
    // to keep standing and drifting long after the strike itself has retired
    // to idle.
    this.dust.update(dt, ctx.camera, ctx.engine.pipeline.sunDirection);
  }

  /**
   * Contrails outlive the aircraft — they are the record of the attack axis,
   * and they are still dissipating long after the flight has left. They are
   * aged here rather than inside the strike update so that a trail hanging in
   * the sky cannot hold the killstreak "active" and pin the HUD banner up for
   * the fifteen seconds it takes to disperse.
   */
  private fadeTrails(dt: number, ctx: EngineContext): void {
    for (const jet of this.jets) {
      if (jet.phase === 'gone' && jet.trail.mesh.visible) {
        jet.trail.update(dt, null, ctx.camera.position, false);
      }
    }
  }

  /**
   * Screen-space consequences are applied here rather than in `update`.
   *
   * The gameflow system rewrites `pipeline.exposureTarget` from the camera
   * pitch every frame at order 99, so anything written during a normal update
   * at order 35 is discarded before it reaches the composite. Late update runs
   * after every system's update and before the render, which is the only place
   * a gameplay-driven exposure duck actually survives.
   */
  lateUpdate(dt: number, ctx: EngineContext): void {
    const pipeline = ctx.engine.pipeline;

    this.flushShake(dt);

    this.blastConcussion = Math.max(0, this.blastConcussion - dt * 1.15);
    // Slow. This is the ringing, and it is the only part of the aftermath the
    // player carries with them once the dust is behind them.
    this.blastDaze = Math.max(0, this.blastDaze - dt * 0.2);
    this.blastDuck = Math.max(0, this.blastDuck - dt * 0.75);
    this.jetWash = Math.max(0, this.jetWash - dt * 1.6);

    const concussion = Math.max(this.blastConcussion, this.jetWash);
    if (concussion > 0.001) {
      pipeline.concussion = Math.max(pipeline.concussion, concussion);
    }
    if (this.blastDaze > 0.001) {
      // Reads as the muffled, tunnelled few seconds after a big detonation.
      pipeline.suppression = Math.max(pipeline.suppression, this.blastDaze);
    }
    if (this.blastDuck > 0.001) {
      pipeline.exposureTarget = Math.max(
        pipeline.exposureMin,
        pipeline.exposureTarget - this.blastDuck,
      );
    }
  }

  /** Ask for shake. See `SHAKE` for why this is pooled rather than emitted. */
  private requestShake(amplitude: number, duration: number): void {
    if (amplitude <= 0) return;
    this.shakeWant = Math.max(this.shakeWant, amplitude);
    this.shakeWantDur = Math.max(this.shakeWantDur, duration);
  }

  private flushShake(dt: number): void {
    this.shakeLive = Math.max(0, this.shakeLive - dt * SHAKE.recover);
    this.shakeGap -= dt;
    if (this.shakeWant <= 0 || this.shakeGap > 0) return;

    const amplitude = Math.min(this.shakeWant, SHAKE.cap - this.shakeLive);
    const duration = this.shakeWantDur;
    this.shakeWant = 0;
    this.shakeWantDur = 0;
    if (amplitude < SHAKE.floor) return;

    Signals.emit('camera:shake', { amplitude, duration, frequency: SHAKE.frequency });
    this.shakeLive += amplitude;
    this.shakeGap = SHAKE.gap;
  }

  // ------------------------------------------------------------ flight path --

  /**
   * Altitude of the run-in profile at along-track position `s`.
   *
   * The flight descends down the player's own line of sight.
   *
   * Every previous version of this was a cruise-dive-level profile with the
   * three heights written down as constants, and every one of them failed the
   * same way for a reason that has nothing to do with the numbers chosen. A
   * fixed altitude is an elevation angle that *falls* with range: an aeroplane
   * at 62 m is 35 degrees above the eye at 90 m out and 12 at 300, and there
   * is a roofline somewhere between those two. So the anticipation beat — the
   * one that happens while the flight is furthest away — is precisely the beat
   * the profile guarantees will be behind a building. Measured on the shipped
   * capture: at the first two sample beats the lead was at 594,213 and 567,231
   * on screen, both inside the market gate's masonry, and the reviewer wrote
   * that no aircraft was visible. They were right, and no amount of rendering
   * would have changed it.
   *
   * Holding a constant elevation angle *from the eye* instead inverts that.
   * The aircraft comes down a straight line aimed at the player's head, so it
   * sits a fixed number of degrees above the horizon for the whole run-in and
   * clears whatever the skyline is on that bearing from the first frame to the
   * last. It grows from twenty pixels to a third of the frame without ever
   * going behind anything, and it does it while holding one screen height,
   * which is what an aeroplane coming at you actually does.
   *
   * The version after that anchored the descent on the *pickle* instead — get
   * down to delivery height before the racks open, so the stores are released
   * from somewhere the player can see. It fixed the release and reintroduced
   * the original fault behind it, because a profile that is level for the last
   * hundred and twenty metres of its run-in is a fixed altitude again for all
   * of that, and a fixed altitude is an elevation that falls. Measured: the
   * lead's elevation from the eye went 21 degrees down to 10 across the run-in
   * and the market gate stands at 29, so the flight sank behind the gate
   * exactly as it became large enough to see, and every frame of the sweep came
   * back with the aeroplane behind masonry.
   *
   * So the geometry is written the way it is described, and this time nothing
   * else is allowed to move it: `hd` is the horizontal distance from the *eye*
   * to the along-track position, altitude is `eye.y + tan φ · hd`, and that is
   * the entire profile. `elev` is therefore not a dive angle — it is a screen
   * height, held for the whole run-in by construction, and `ELEV_STEPS` is a
   * search over where in the picture to put the aeroplane.
   *
   * Floored at `passAlt` with a quadratic knee so vertical speed stays
   * continuous through the round-out, and capped at `ceiling` so a steep
   * solution does not put the spawn in the stratosphere. The floor is what
   * stops a track that goes nearly over the player's head from flying into
   * them; on a canted run-in it is never reached.
   *
   * Nothing here says where the stores come off. They come off wherever the
   * continuously computed impact solution reaches each aim point, which on this
   * profile is 55–70 m up and still descending — a dive delivery. The release
   * gate integrates the aircraft's vertical speed, so it does not care.
   */
  private profileAltitude(s: number, passS = this.passS, miss = this.miss): number {
    return this.altitudeAt(this.elev, Math.hypot(passS - s, miss));
  }

  /**
   * Height in world Y of a glide held `elev` above the horizontal from the eye,
   * at horizontal distance `hd` from it.
   *
   * Held, and the temptation to let it decay toward the pass has now been
   * measured and rejected. The case for decaying it is real — the frame reaches
   * 42 degrees, the airframe subtends fifty at the pass, so the money frame on a
   * 32-degree glide is centred a fifth of a frame above the top edge and is cut
   * in half by it. Trading entry angle for delivery angle looks like it should
   * buy the whole event.
   *
   * It does not, because the property being spent is the one that makes the
   * approach work at all. A held angle is a straight line from the eye, so the
   * openness of the entire run-in is a single question about a single ray, and a
   * bearing whose sky is clear at that angle is clear at it from four hundred
   * metres to overhead. Decay makes it a different question at every range, and
   * the answers are not the same: at `dive` 0.68, with everything else identical,
   * continuity across the field fell from 0.72 to 0.42 and the largest fully
   * framed moment fell from 46% of frame width to 26%. The flight was buying
   * headroom at the pass by sinking into the roofline for the two seconds
   * before it.
   *
   * The clipping is real and is the price of an aeroplane that is genuinely
   * close: at the pass the floor holds it 18 m up and the ground track goes by
   * 24 m away, which is 28 m from the eye, and nothing 21 m long at 28 m fits
   * inside an 80-degree frame. `framing` prices that honestly and the solve
   * still prefers it, which is the right answer — a 46% airframe four fifths
   * inside the picture is a low fast pass, and a 26% one entirely inside it,
   * bought by hiding the approach, is not.
   */
  private altitudeAt(elev: number, hd: number): number {
    const floor = this.groundY + PROFILE.passAlt;
    const over = this.eye.y + elev * hd - floor;
    const k = PROFILE.flare;
    const soft = over > k ? over
      : over > -k ? ((over + k) * (over + k)) / (4 * k)
        : 0;
    return Math.min(this.groundY + PROFILE.ceiling, floor + soft);
  }

  /** 0 at the spawn, 1 at the overflight. Drives the roll schedule. */
  private runProgress(jet: Jet): number {
    return THREE.MathUtils.clamp(
      1 - (jet.passS - jet.s) / PROFILE.runIn, 0, 1,
    );
  }

  private placeJet(jet: Jet, dt: number): void {
    const alt = this.profileAltitude(jet.s, jet.passS, jet.miss);
    jet.position.copy(jet.origin).addScaledVector(jet.axis, jet.s).setY(alt);
    const ahead = Math.max(dt, 1 / 120) * PROFILE.speed;
    const vy = (this.profileAltitude(jet.s + ahead, jet.passS, jet.miss) - alt)
      / Math.max(dt, 1 / 120);
    jet.velocity.copy(jet.axis).multiplyScalar(PROFILE.speed).setY(vy);
  }

  private updateStrike(dt: number, ctx: EngineContext): void {
    this.timer += dt;
    if (this.sinceLastImpact >= 0) this.sinceLastImpact += dt;
    if (this.sinceRelease >= 0) this.sinceRelease += dt;
    const camPos = ctx.camera.position;
    let anyFlying = false;
    this.shadows.reset();

    for (const jet of this.jets) {
      if (jet.phase === 'gone') continue;
      if (jet.delay > 0) {
        jet.delay -= dt;
        anyFlying = true;
        continue;
      }
      anyFlying = true;
      jet.model.group.visible = true;
      // The wingman's ribbon is primed the frame he appears rather than at the
      // call, or a contrail hangs in the sky for two thirds of a second with
      // no aeroplane on the end of it.
      this.primeTrail(jet);

      if (jet.phase === 'run') {
        jet.s += PROFILE.speed * dt;
        this.placeJet(jet, dt);

        const diving = jet.velocity.y < -6;
        // Bank held through the approach, wings level for the delivery.
        //
        // This is not decoration, it is the only answer to a geometric problem
        // the new profile creates. The flight descends down the player's own
        // sightline, so the angle between the airframe's nose and the line of
        // sight is close to zero for the whole run-in: the pair are seen
        // exactly end-on, which is the aspect at which an aeroplane presents
        // the least of itself. Rolling turns the planform toward the eye and
        // hands back most of the area — the wing is the part of an aeroplane
        // that says how big it is, and until it is banked the player is not
        // being shown it.
        //
        // Half a radian is a purposeful-looking twenty-eight degrees. It is
        // free during the approach, because the run-in path is scripted and
        // the roll is cosmetic, and it is *not* free during the pass — bank
        // rolls the span out of the screen horizontal, so projected width goes
        // as its cosine. Hence the roll-out, which is finished well before the
        // aircraft is large.
        //
        // Wings level at the pickle matters for its own reason: the pylons are
        // four metres out from the centreline, so a bank turns the alternating
        // left-right rack sequence into an alternating high-low one and the
        // stick lands as a flam instead of a walk.
        //
        // So the roll-out is scheduled against the *solution* rather than
        // against a fraction of the run, and that is not tidiness. A fixed
        // schedule has to be conservative, and a conservative one held the
        // wings past the pickle: with the bank still bleeding off through
        // 0.14 rad the release gate stayed shut, the computed impact point
        // ran on past all four aim points while it waited, and when the gate
        // finally opened the whole stick came off in four consecutive frames
        // and landed in a heap. Measured: eight craters inside 17 m of each
        // other instead of walking 34 m up the street.
        const solved = this.solveImpact(
          jet.s, jet.position.y, PROFILE.speed, jet.velocity.y,
        );
        const toPickle = jet.aim - solved.along;
        const u = this.runProgress(jet);
        const roll = THREE.MathUtils.smoothstep(u, 0.03, 0.16)
          * THREE.MathUtils.smoothstep(toPickle, 22, 95);
        jet.bankTarget = (jet === this.jets[0] ? -0.5 : 0.5) * roll;
        // A real CAS aircraft is at military power on the run and the nozzles
        // are dark. But at the ranges the player sees this from, the airframe
        // is thirty pixels of dark grey against a bright sky and the burner is
        // the only part of it that is *emissive* — it is what makes the shape
        // resolve as an aeroplane rather than a bird. Held low enough through
        // the descent that lighting it fully once the rack is empty still
        // reads as a change, which is the moment that has to sell.
        jet.model.setAfterburner(
          jet.bombsLeft === 0 ? 1 : (diving ? 0.4 : 0.5),
        );
        // Vapour off the wing, and the second term is the low pass showing
        // its work. A hard-manoeuvring aeroplane pulls condensation off the
        // leading edge, and so does one running at 290 kt through the thick,
        // damp air twenty-six metres above a river town — which is convenient,
        // because the contrail has to be thinning out at exactly the altitude
        // the airframe becomes the biggest thing in the frame, and the tip
        // vortices are what keeps the shape reading against a bright sky once
        // it has. Streamers off both wingtips also *state the span*, which is
        // the one measurement the eye needs to size the aeroplane.
        const deck = 1 - THREE.MathUtils.smoothstep(jet.position.y - this.groundY, 30, 78);
        jet.model.setLoad(Math.max(Math.abs(jet.bank) * 0.7, deck * 0.55));

        // Pickle on the computed solution, not on a level-off flag.
        //
        // This gate used to be "no longer descending", which sounds like the
        // real procedure and behaves nothing like it. The aircraft finishes
        // levelling off about forty metres *past* the point its own solution
        // calls for, and the trigger fires on the first frame the solution is
        // at or beyond the aim point — so the release was always late and the
        // whole stick landed long. Measured: first crater 44 m past the mark,
        // second 65 m, and the fourth 105 m past it and seventeen metres up
        // the side of a building, which is why the street the player was
        // looking at stayed clean through eight detonations.
        //
        // Every store on its own solution, and this is what finally deleted
        // the level segment.
        //
        // The gate used to demand that the descent had *finished*, because on
        // a fixed rack interval the four stores are released from four
        // different heights and land four uneven distances apart. That is a
        // real defect and the level segment did fix it — at the cost of
        // putting the whole delivery down at pass altitude, below the
        // rooflines, which is why the review could not find the aeroplane or
        // the bombs.
        //
        // Solving each store separately removes the dependency instead of
        // paying for it. The aim points are fixed on the ground, spaced by
        // `stickSpacing`; store *i* comes off the first frame on which the
        // continuously computed solution reaches *its* aim point. What the
        // aircraft is doing at that moment does not matter, because the
        // solution already integrates its vertical speed. The craters land
        // evenly however the run-in is flown, and the run-in is free to be a
        // dive from end to end.
        //
        // Wings level is the one condition left, and it is about the racks
        // rather than about the ballistics: the pylons are four metres out
        // from the centreline, so releasing in a bank alternates the stores
        // high and low as well as left and right.
        if (jet.bombsLeft > 0 && Math.abs(jet.bank) < 0.14) {
          jet.releaseTimer -= dt;
          const aim = jet.aim + (JET_STORES - jet.bombsLeft) * PROFILE.stickSpacing;
          // Where it lands, and then *when*.
          //
          // Aiming each store separately fixed the spacing of the craters and
          // did nothing at all for their rhythm, because the two are not the
          // same problem: on a descending run-in the time of flight shrinks
          // almost as fast as the clock advances, so four correctly spaced aim
          // points can still be four simultaneous bangs. `PROFILE.speed` and
          // `BOMB.kRetard` are set so that they are not, and this is the gate
          // that guarantees it on a profile they do not cover — an unusually
          // steep solve on a hemmed-in pose, say.
          //
          // Held against the previous store's predicted impact rather than
          // against a rack interval, which is the quantity the collapsing time
          // of flight defeats. Waiting walks the crater long, so it is bounded:
          // once the solution has run a full spacing past the aim point the
          // store goes anyway, because a stick that is a metre out is better
          // than a stick that arrives in a heap and better than one that never
          // leaves the aircraft.
          const late = solved.along >= aim + PROFILE.stickSpacing;
          const rhythm = this.lastPredicted < 0
            || this.timer + solved.time >= this.lastPredicted + BOMB.impactGap;
          if (jet.releaseTimer <= 0 && solved.along >= aim && (rhythm || late)) {
            jet.releaseTimer = PROFILE.stickMin;
            this.lastPredicted = Math.max(
              this.lastPredicted, this.timer + solved.time,
            );
            this.releaseBomb(jet);
            if (this.detonations === 0 && this.bombs.length === 1) {
              // First store away: the countdown stops being an estimate and
              // becomes the actual time of flight of the round in the air.
              this.inboundSeconds = solved.time;
            }
            jet.bombsLeft--;
            jet.model.setStores(jet.bombsLeft);
          }
        }

        // The pass is not over when the rack is. The aircraft stays on the
        // profile — which is level at pass altitude by now — until it has
        // genuinely crossed the player, and only then breaks. Handing it to
        // free flight at the pickle was the old behaviour and it climbed away
        // from two hundred metres out, so the one moment the airframe is
        // large enough to be an aeroplane never happened.
        const gone = -this._v3.copy(camPos).sub(jet.position).dot(jet.axis);
        if (gone > PROFILE.breakPast) {
          jet.phase = 'pull';
          jet.pullTime = 0;
          jet.broke = true;
          jet.breakTime = 0;
          jet.climb = Math.asin(
            THREE.MathUtils.clamp(jet.velocity.y / PROFILE.speed, -1, 1),
          );
          jet.climbTarget = 0.3;
        }
      } else if (jet.phase === 'pull') {
        // Straight over the player's head, *then* the break. The hold is what
        // turns two separate moments — the stick walking in, and a fast jet
        // going over at forty metres — into one continuous pass.
        jet.pullTime += dt;
        // The break is triggered by geometry, not by a stopwatch. Timing it
        // meant the aircraft turned away wherever it happened to be when the
        // clock ran out: measured, the lead rolled into the break thirteen
        // metres *short* of the player and departed without ever crossing
        // them, which is the single beat the whole egress exists for. Now it
        // holds course until it is genuinely past, however long that takes.
        // The clock survives only as a backstop for a geometry that cannot
        // reach the player at all.
        const past = -this._v3.copy(camPos).sub(jet.position).dot(jet.axis);
        if (!jet.broke && (past > PROFILE.breakPast || jet.pullTime > 2.6)) jet.broke = true;
        if (jet.broke) jet.breakTime += dt;
        const hand = jet === this.jets[0] ? 1 : -1;
        // Roll on as soon as the rack is empty, a long beat before the break.
        //
        // Two things this fixes, and the first one is the whole reason the
        // pass was hard to read. From the ground the aircraft is ahead of the
        // player and below the top of the frame, so it is seen close to
        // end-on: measured, the projected span came out at three quarters of
        // the real one for the entire in-frame portion of the run. Rolling
        // even thirty degrees turns the planform toward the eye and hands
        // back most of that — the wing is the part of an aeroplane that says
        // how big it is, and until it is banked the player is not being shown
        // it.
        //
        // The second is that a bank is a turn. A shallow one held from the
        // pickle to the overflight walks the track about fifteen metres off
        // the player's head, which does not spoil the crossing but does drop
        // the elevation angle at the closest point — so the airframe leaves
        // through the corner of the frame having been large in it, rather
        // than straight out of the top.
        //
        // Physically this is just the pull-off starting where it really would.
        // Nothing is on the racks any more; there is no reason to hold wings
        // level except the one that no longer applies.
        //
        // Kept shallow, and the ceiling is measured rather than chosen. Bank
        // rolls the span out of the screen horizontal, so the projected width
        // of the airframe — the number this whole profile is tuned against —
        // goes as its cosine. Half a radian looked purposeful and cost thirteen
        // per cent of the pass; 0.3 reads as clearly rolling and costs four.
        const ease = 0.3 * THREE.MathUtils.smoothstep(jet.pullTime, 0.12, 0.85);
        jet.bankTarget = hand * Math.max(
          ease, 1.05 * THREE.MathUtils.smoothstep(jet.breakTime, 0, 0.42),
        );
        // Free flight: a hard climbing break turn away from the target. Turn
        // rate follows from the bank angle, so the harder it rolls the tighter
        // it comes round. The 3.4 is the load factor the pilot is pulling —
        // a level 1 g turn at 380 kt takes twelve seconds to come through
        // ninety degrees, which is true and completely unreadable.
        const turn = (Math.tan(jet.bank) * 9.81 * 3.4) / PROFILE.speed;
        jet.heading -= turn * dt;
        jet.axis.set(Math.sin(jet.heading), 0, Math.cos(jet.heading));
        const horizontal = Math.cos(jet.climb) * PROFILE.speed;
        jet.velocity.copy(jet.axis).multiplyScalar(horizontal);
        jet.velocity.y = Math.sin(jet.climb) * PROFILE.speed;
        jet.position.addScaledVector(jet.velocity, dt);
        jet.climbTarget = jet.broke ? 0.3 : 0.05;
        // Vapour bleeds off as the g comes down out of the pull.
        jet.model.setLoad(THREE.MathUtils.clamp(Math.abs(jet.bank) * 0.9, 0, 1));
        if (jet.position.y > this.groundY + 420 || jet.position.distanceTo(this.target) > 900) {
          jet.phase = 'gone';
          jet.model.group.visible = false;
        }
      }

      jet.bank = THREE.MathUtils.damp(jet.bank, jet.bankTarget, 3.4, dt);
      jet.climb = THREE.MathUtils.damp(jet.climb, jet.climbTarget, 1.9, dt);
      this.orientJet(jet);
      jet.model.update(dt, jet.position, jet.velocity, camPos);

      const index = this.jets.indexOf(jet);
      this.shadows.place(
        index, jet.position, jet.heading,
        ctx.engine.pipeline.sunDirection, this.groundY, this.physics, camPos,
      );
      this.washDust(jet, index, camPos);

      jet.model.exhaustWorld(this._v3);
      // Contrails are an altitude phenomenon, and leaning on that solves a
      // problem that width alone could not: the same ribbon has to be a hard
      // line across the sky at a hundred and fifty metres, where it is the only
      // thing the player can see, and nearly nothing at forty, where the
      // aircraft is about to fill a third of the frame and a band of white
      // hanging off its tail is just something in front of the aeroplane.
      // 32–86 m: solid at the cruise altitude the pair ingress at, thinned to
      // a token by the time they are down on the deck for the run. The band
      // has to bracket the *descent* rather than the cruise, because the
      // descent is the whole of the anticipation beat — the pair are twenty
      // pixels across out there and the ribbon is the only thing with any
      // length to it.
      jet.trail.density = 0.14 + 0.86 * THREE.MathUtils.smoothstep(
        jet.position.y - this.groundY, 32, 86,
      );
      jet.trail.update(dt, this._v3, camPos, jet.phase !== 'gone');

      // ---- flyby pressure and noise ----
      // Three beats, because that is what a fast jet passing overhead sounds
      // like: a rising rumble ahead of it, the pass itself, and the reheat
      // tearing away afterwards, pitched down as it goes.
      const distToPlayer = jet.position.distanceTo(camPos);
      if (distToPlayer < 380) {
        // Out to 380 m rather than 300, because the pair now spend a second
        // and a half of the approach between those two ranges and the point of
        // the beat is that the player can feel them coming before they can
        // make them out. Squared, so it is a swell rather than a step.
        const near = 1 - distToPlayer / 380;
        this.jetWash = Math.max(this.jetWash, near * near * 0.22);
        if (jet.audioStage === 0 && distToPlayer < 330) {
          jet.audioStage = 1;
          Signals.emit('audio:oneshot', {
            id: 'jet_flyby', position: jet.position.clone(), volume: 0.7, pitch: 1.12,
          });
        } else if (jet.audioStage === 1 && distToPlayer < 130) {
          jet.audioStage = 2;
          Signals.emit('audio:oneshot', {
            id: 'jet_flyby', position: jet.position.clone(), volume: 1, pitch: 1,
          });
          // A low, long rumble rather than a jolt — the airframe passing is
          // pressure on the chest, not an impact. Bigger than it was, because
          // the pass is now at twenty-six metres rather than forty-two and a
          // player standing under that would feel it in the ground.
          this.requestShake(0.034, 1.4);
        }
        Signals.emit('airstrike:flyby', {
          position: jet.position.clone(),
          velocity: jet.velocity.clone(),
        });
      } else if (jet.audioStage === 2) {
        jet.audioStage = 3;
        Signals.emit('audio:oneshot', {
          id: 'jet_flyby', position: jet.position.clone(), volume: 0.8, pitch: 0.78,
        });
      }
    }

    // ---- HUD countdown ----
    if (this.detonations === 0) {
      this.inboundSeconds = Math.max(0, this.inboundSeconds - dt);
      const total = Math.max(0.001, this.timer + this.inboundSeconds);
      this.inboundProgress = THREE.MathUtils.clamp(this.timer / total, 0, 1);
    } else {
      this.inboundSeconds = 0;
      this.inboundProgress = 1;
    }

    if (this.bombs.length > 0) this.phase = 'impact';

    if (!anyFlying && this.bombs.length === 0) {
      this.aftermathTimer += dt;
      this.phase = 'aftermath';
      // The strike is not over when the last bang stops. Holding the state for
      // a few seconds keeps the music, the HUD banner and the ear-ring alive
      // through the part of the event the player actually spends looking at
      // the smoke.
      if (this.aftermathTimer > 5) {
        this.phase = 'idle';
        this.inboundProgress = 0;
        this.inboundSeconds = 0;
        this.ordnanceLeft = 0;
        Signals.emit('audio:music', { cue: 'combat' });
      }
    }
  }

  /**
   * Grit torn off the street by an aircraft passing low over it.
   *
   * A jet at 26 m and 290 kt drags a wake down onto the deck behind it, and in
   * a dusty market town that wake is *visible* — a rolling line of pale dust
   * lifting off the paving a beat after the aeroplane has gone through. It is
   * the world acknowledging the aircraft, which is the thing the strike was
   * missing: everything that happened before the first crater happened in the
   * sky and on the HUD, and nothing at all happened on the ground the player
   * was standing on.
   *
   * Spawned by distance flown rather than by time, so the line has even
   * spacing at any speed, and only near the camera — dust the player cannot
   * resolve is dust spent out of a pool the aftermath needs.
   */
  private washDust(jet: Jet, index: number, camPos: THREE.Vector3): void {
    const altitude = jet.position.y - this.groundY;
    if (altitude > 74 || jet.phase === 'gone') return;
    // Falls off hard with height: this is a ground effect, and at seventy
    // metres there is barely any. The ceiling is above the cruise altitude on
    // purpose, so the line of disturbed dust starts being drawn down the
    // street from the beginning of the run rather than from the level-off.
    const strength = 1 - THREE.MathUtils.smoothstep(altitude, 21, 74);
    const along = jet.position.dot(jet.axis);
    // Every eighteen metres rather than every twenty-six. The wake has to read
    // as a *line* being drawn down the street ahead of the aircraft, and at
    // the ranges it is seen from, puffs a full second and a half of flying
    // time apart read as three unrelated smudges.
    if (along - this.washMark[index] < 18) return;
    this.washMark[index] = along;

    // Down onto the deck under the aircraft, not at it: the wake takes about a
    // fifth of a second to reach the ground from this height, by which time
    // the aeroplane is thirty metres further on.
    this._v.copy(jet.position).addScaledVector(jet.axis, -18).setY(this.groundY + 1.2);
    if (this._v.distanceToSquared(camPos) > 280 * 280) return;

    const hit = this.physics.trace(
      this._v2.copy(this._v).setY(this.groundY + 26), DOWN, 40,
    );
    if (hit.hit) this._v.copy(hit.point).setY(hit.point.y + 1);

    this.dust.wash(this._v, jet.axis, strength);
  }

  private orientJet(jet: Jet): void {
    const forward = this._v.copy(jet.velocity);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const worldUp = this._v2.set(0, 1, 0);
    const right = this._v3.crossVectors(forward, worldUp);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    up.applyAxisAngle(forward, -jet.bank);
    right.crossVectors(forward, up).normalize();
    this._m.makeBasis(right, up, forward.clone().negate());
    this._q.setFromRotationMatrix(this._m);
    jet.model.group.position.copy(jet.position);
    jet.model.group.quaternion.copy(this._q);
    jet.model.group.updateMatrixWorld();
  }

  // ----------------------------------------------------------- ordnance ----

  /**
   * Continuously computed impact point.
   *
   * Integrates the same drag model the live bombs use, from a hypothetical
   * release at the given state, and reports where and when it would land.
   * ~90 steps at a sixtieth of a second; two of these per frame is nothing,
   * and it is what makes the stick land where the player asked.
   */
  private solveImpact(
    s: number,
    altitude: number,
    speed: number,
    verticalSpeed: number,
  ): { along: number; time: number } {
    const dt = 1 / 60;
    let along = s;
    let y = altitude;
    let vs = speed;
    let vy = verticalSpeed;
    let t = 0;
    for (let i = 0; i < 480 && y > this.groundY; i++) {
      const k = t < BOMB.retardDelay ? BOMB.kClean : BOMB.kRetard;
      const sp = Math.hypot(vs, vy);
      vs -= k * sp * vs * dt;
      vy -= k * sp * vy * dt;
      vy -= BOMB.gravity * dt;
      along += vs * dt;
      y += vy * dt;
      t += dt;
    }
    return { along, time: t };
  }

  private releaseBomb(jet: Jet): void {
    this.sinceRelease = 0;
    const holder = new THREE.Group();
    const body = new THREE.Mesh(this.bombGeometry, this.bombMaterial);
    body.frustumCulled = false;
    holder.add(body);
    const ballute = new THREE.Mesh(this.balluteGeometry, this.balluteMaterial);
    ballute.frustumCulled = false;
    ballute.scale.setScalar(0.05);
    holder.add(ballute);
    holder.frustumCulled = false;
    this.group.add(holder);

    // Come off an actual pylon rather than the aircraft's centreline.
    const rackSide = jet.bombsLeft % 2 === 0 ? 1 : -1;
    const rackOut = jet.bombsLeft > 2 ? 4.7 : 2.9;
    const local = this._v.set(rackSide * rackOut, -1.05, 1.9);
    local.applyMatrix4(jet.model.group.matrixWorld);

    const bomb: Bomb = {
      position: local.clone(),
      velocity: jet.velocity.clone(),
      mesh: holder,
      ballute,
      age: 0,
      index: jet.storeIndex++,
    };
    this.bombs.push(bomb);

    Signals.emit('audio:oneshot', {
      id: 'bomb_release',
      position: bomb.position.clone(),
      volume: 0.4,
    });
  }

  private updateBombs(dt: number): void {
    const camPos = this.ctx.camera.position;
    this.bombTrailFed.fill(false);

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.age += dt;

      // Snaps open rather than swells: the whole point of the ballute is that
      // it is instantaneous, and a canopy that grows over an eighth of a
      // second reads as a balloon being inflated. The stem stays short until
      // it fills so the store does not tow an invisible pole off the rack.
      const retard = THREE.MathUtils.clamp((b.age - BOMB.retardDelay) / 0.06, 0, 1);
      const bloom = retard * (1 + 0.22 * Math.exp(-retard * 6) * Math.sin(retard * 24));
      b.ballute.scale.setScalar(0.06 + bloom * 0.94);
      b.ballute.position.z = -2.1 * (1 - retard);

      const k = b.age < BOMB.retardDelay ? BOMB.kClean : BOMB.kRetard;
      const speed = b.velocity.length();
      b.velocity.addScaledVector(this._v.copy(b.velocity).normalize(), -k * speed * speed * dt);
      b.velocity.y -= BOMB.gravity * dt;

      const step = this._v2.copy(b.velocity).multiplyScalar(dt);
      const len = step.length();
      const dir = this._v.copy(step).divideScalar(Math.max(len, 1e-5));
      const hit = this.physics.trace(b.position, dir, len + 0.8);

      if (hit.hit) {
        this.detonate(hit.point.clone(), b.index);
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      b.position.add(step);
      if (b.position.y < this.groundY - 14) {
        this.detonate(b.position.clone().setY(this.groundY), b.index);
        this.group.remove(b.mesh);
        this.bombs.splice(i, 1);
        continue;
      }

      // Nose into the airflow.
      const forward = this._v.copy(b.velocity).normalize();
      const worldUp = Math.abs(forward.y) > 0.985
        ? this._v2.set(1, 0, 0)
        : this._v2.set(0, 1, 0);
      const right = this._v3.crossVectors(forward, worldUp).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      this._m.makeBasis(right, up, forward.clone().negate());
      b.mesh.position.copy(b.position);
      b.mesh.quaternion.setFromRotationMatrix(this._m);

      const slot = b.index % this.bombTrails.length;
      this.bombTrailFed[slot] = true;
      // Emitted from the tail rather than the nose, so the smear starts where
      // the drogue is instead of running through the middle of the store.
      this.bombTrails[slot].update(
        dt, this._v.copy(b.position).addScaledVector(forward, -1.6), camPos, true,
      );
    }

    // Wakes outlive their stores by the ribbon's own life, which is how the
    // fall stays legible through the detonation that ends it: eight strokes
    // still hanging over the street, pointing at eight craters.
    for (let i = 0; i < this.bombTrails.length; i++) {
      if (!this.bombTrailFed[i]) this.bombTrails[i].update(dt, camPos, camPos, false);
    }
  }

  // -------------------------------------------------------------- effects --

  private detonate(point: THREE.Vector3, index: number): void {
    this.detonations++;
    this.sinceLastImpact = 0;
    this.ordnanceLeft = Math.max(0, this.ordnanceLeft - 1);

    // `scale` multiplies particle *size* in the VFX system, against a damage
    // radius that is already 15 m. At 2.9 the fireball came out twenty-two
    // metres across, and eight of them overlapping turned the whole street
    // into one flat brick-red mass with hard edges that was still standing
    // there a second and a half after the last store landed — not a fireball,
    // a wall. Half again over natural size is as far as this can be pushed
    // before the effect stops being an explosion and starts being a colour.
    //
    // This signal is also what applies the damage: `AISystem` hangs
    // `onExplosion` off it, which hurts the enemies *and* the player. Calling
    // `applyAreaDamage` alongside it, as this used to, is the same function
    // again — every store was doing double damage and firing two directional
    // damage flashes.
    Signals.emit('explosion:spawn', {
      position: point,
      radius: BOMB.radius,
      damage: BOMB.damage,
      cause: 'airstrike',
      scale: 2,
    });

    // No light of its own. The VFX system already spawns two per explosion —
    // a two-frame flash and a longer fireball glow sized off the sun — and the
    // dynamic pool holds six. A third light per store, at an intensity several
    // times theirs, did not add anything except evict them.

    this.spawnShockwave(point);
    // Over natural size. Half the footprint lands behind the shopfronts on
    // either side of the street, so what the player actually sees of a
    // detonation eighty metres out is whatever clears a two-storey roofline —
    // and at unity scale most of it did not.
    this.dust.burst(point, 1.3);

    const camDist = point.distanceTo(this.ctx.camera.position);
    // Blast overpressure falls off roughly with distance, not with distance
    // squared, over the range that matters here.
    const near = THREE.MathUtils.clamp(1 - (camDist - 18) / 110, 0, 1);

    // The eye's response to the fireball is the only part that is allowed to
    // be instantaneous, because light is. Everything mechanical — the shake,
    // the overpressure warp, the grit off the street — goes in the queue and
    // arrives when 343 m/s says it does. Topped up rather than summed:
    // accumulating across a stick pins the effect at its ceiling for the whole
    // barrage, and an effect that is always at maximum has stopped being one.
    this.blastDuck = Math.max(this.blastDuck, near * 0.44);
    this.waves.push({
      eta: camDist / 343,
      near,
      from: point.clone(),
    });

    // Danger close. Worth calling out explicitly: the player is inside the
    // fragmentation envelope of their own strike and should be told so, once.
    if (camDist < BOMB.radius * 2.6 && !this.warnedClose) {
      this.warnedClose = true;
      Signals.emit('ui:notify', { title: 'DANGER CLOSE', subtitle: 'GET DOWN', tone: 'bad' });
    }

    // Sound travels at 343 m/s. The audio system already fires a near-field
    // blast off `explosion:spawn`, so what is delayed here is the report
    // rolling back off the buildings — audible as a separate event only when
    // the impact is far enough away for the transit time to be perceptible,
    // which is exactly the cue that makes a distant strike read as distant.
    if (camDist > 70) {
      window.setTimeout(() => {
        Signals.emit('audio:oneshot', {
          id: 'explosion_large',
          position: point.clone(),
          volume: THREE.MathUtils.clamp(camDist / 260, 0.35, 1),
        });
      }, Math.min((camDist / 343) * 1000, 2500));
    }

    // Secondary cook-off on alternate impacts. Every impact spawning one makes
    // the barrage uniform, which is the opposite of what a real one sounds or
    // looks like — and each explosion pushes a volumetric smoke puff into a
    // six-slot list, so doubling up would evict the columns that matter.
    if (QUALITY.tier !== 'low' && index % 2 === 1) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 9,
        0.6,
        (Math.random() - 0.5) * 9,
      );
      window.setTimeout(() => {
        Signals.emit('explosion:spawn', {
          position: point.clone().add(offset),
          radius: BOMB.radius * 0.42,
          damage: 0,
          cause: 'airstrike',
          scale: 1.0,
        });
      }, 140 + Math.random() * 220);
    }
  }

  /**
   * Lands the mechanical half of every detonation whose front has arrived.
   *
   * The numbers are the ones that used to fire inside `detonate`; what has
   * changed is only *when*. Concussion is kept low deliberately: the composite
   * turns it into a radial UV wobble and multiplies chromatic aberration by up
   * to seven, and past about a third it stops reading as overpressure and
   * starts drawing a visible standing ring across the sky.
   */
  private updateWaves(dt: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.eta -= dt;
      if (w.eta > 0) continue;
      this.waves.splice(i, 1);

      this.requestShake(0.012 + w.near * 0.05, 0.55 + w.near * 0.55);
      this.blastConcussion = Math.max(this.blastConcussion, 0.08 + w.near * 0.2);
      this.blastDaze = Math.max(this.blastDaze, w.near * 0.34);

      // And the front is visible where it arrives, not only where it started.
      // Dust jumping off the paving between the player and the crater, a beat
      // after the flash, is the cue that the thing that just went off had a
      // physical extent — and it puts something in the bottom half of the
      // frame during a beat that is otherwise entirely sky.
      //
      // Sited well out in front rather than at the player's feet, and small.
      // Spawned close it is not a dust front, it is a lens cap: a puff whose
      // radius grows to eleven metres, six metres from the eye, covers the
      // whole frame in tan, and eight stores' worth of them fogged the market
      // solid for the last two seconds of the event.
      if (w.near < 0.12) continue;
      const cam = this.ctx.camera.position;
      this._v2.copy(cam).sub(w.from).setY(0);
      if (this._v2.lengthSq() < 1e-4) continue;
      this._v2.normalize();
      const side = this._v3.set(this._v2.z, 0, -this._v2.x);
      for (let k = -1; k <= 1; k++) {
        this._v.copy(cam)
          .addScaledVector(this._v2, -17 - Math.abs(k) * 9)
          .addScaledVector(side, k * 11)
          .setY(this.groundY + 0.5);
        this.dust.lift(this._v, this._v2, 0.45 + w.near * 0.55);
      }
    }
  }

  private spawnShockwave(point: THREE.Vector3): void {
    let wave = this.shockwaves.find((w) => w.age >= w.life);
    if (!wave) {
      if (this.shockwaves.length >= 8) return;
      const mesh = new THREE.Mesh(this.shockGeometry, this.shockMaterial);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      wave = { mesh, age: 0, life: 0.7, maxRadius: 18 };
      this.shockwaves.push(wave);
    }
    wave.age = 0;
    wave.life = 0.7;
    wave.maxRadius = 16 + Math.random() * 5;
    wave.mesh.position.copy(point).setY(point.y + 0.35);
    wave.mesh.visible = true;
    wave.mesh.scale.set(3, 1, 3);
  }

  private updateShockwaves(dt: number): void {
    for (const w of this.shockwaves) {
      if (w.age >= w.life) continue;
      w.age += dt;
      const t = THREE.MathUtils.clamp(w.age / w.life, 0, 1);
      // Fast leading edge that decelerates: a pressure front losing energy.
      const r = 3 + (w.maxRadius - 3) * (1 - Math.pow(1 - t, 2.2));
      w.mesh.scale.set(r, 1, r);
      // Barely lifts. A flat ring that climbs is a flat ring you can see the
      // underside of, and it starts intersecting first-floor windows.
      w.mesh.position.y += dt * 0.5;
      if (t >= 1) w.mesh.visible = false;
    }
    // One material for every ring, so they share a fade. They are spawned
    // within a second of each other during a stick anyway.
    let peak = 0;
    for (const w of this.shockwaves) {
      if (w.age >= w.life) continue;
      peak = Math.max(peak, Math.pow(1 - w.age / w.life, 1.4));
    }
    this.shockMaterial.opacity = peak * 0.5;
  }

  dispose(): void {
    for (const j of this.jets) {
      j.model.dispose();
      j.trail.dispose();
    }
    this.bombGeometry.dispose();
    this.balluteGeometry.dispose();
    this.balluteMaterial.dispose();
    this.dust.dispose();
    this.shockGeometry.dispose();
    this.shockMaterial.dispose();
    this.markerMaterial.dispose();
  }
}
