// ---------------------------------------------------------------------------
// Where everything in the camp goes, in camp coordinates (u along the road,
// v away from it; the mainline's centreline is at v = -34 and its graded
// platform ends near v = -27).
//
// The plan is one object rather than code in each builder so that the ground
// wear, the footpaths, the parking and the lights all agree on where a thing
// is. Every position has a practical reason:
//
//   - the gate sits on the road side, the apron and its parking just inside it,
//     so vehicles never have to drive through the living area;
//   - the fire is the centre of the camp; the mess tent and the kitchen sit on
//     its west side with the water tank behind the kitchen, downwind of nothing;
//   - the guest tents stand in an arc on the far side facing the fire, with the
//     savanna at their backs;
//   - the ranger cabin is by the parking with its radio mast behind it and the
//     solar array beside it, where the ranger's vehicle can leave in a hurry;
//   - fuel is at the far west end, thirty metres from the fire, next to where
//     the supply truck unloads; the workshop is at the east end by the trailer;
//   - showers and the latrine are in the far east corner, downwind and out of
//     sight of the tents, on a path.
// ---------------------------------------------------------------------------

export const ROAD_V = -34;
export const ROAD_EDGE_V = -27;

export function buildPlan() {
  const gate = { u: -6, v: -23, width: 5.2 };
  const lane = { v: -16.5, from: -27, to: 27 };
  const fire = { u: 2, v: 6, radius: 1.15 };
  const fire2 = { u: -22, v: 6, radius: 0.7 };
  const mess = { u: -8.5, v: 8.5, w: 9, d: 6, ridge: 3.3, eave: 2.3, facing: [0, -1] };
  const kitchen = { u: -17.5, v: 11, w: 5.5, d: 4.2, ridge: 3.0, eave: 2.2, facing: [1, 0] };
  const tank = { u: -21.5, v: 14.5 };
  const wood = { u: -12.5, v: 2.5 };
  const cabin = { u: 17, v: 3, w: 5.2, d: 4.2, facing: [0, -1] };
  const store = { u: -25, v: 0, w: 4.2, d: 3.2, facing: [1, 0] };
  const mast = { u: 22.5, v: 7.5, height: 12.5 };
  const solar = { u: 23.5, v: 1.0, facing: [0, -1] };
  // the watchtower stands at the west end by the gate, where whoever is on it
  // sees the road both ways and the plain behind the camp
  const lookout = { u: -33.5, v: -3.5, height: 5.2 };
  const latrine = { u: 26.5, v: 17, facing: [-1, 0] };
  const fuel = { u: -27.5, v: -6, facing: [1, 0] };
  const workshop = { u: 24.5, v: -4.5 };
  const mapBoard = { u: 12, v: -2.5, facing: [0, -1] };
  const flag = { u: 13.5, v: 6.5 };
  const laundry = { a: [-14.5, 23.5], b: [-5, 24] };

  // The spur passes behind this arc, closest at its west end (v ≈ 26 at
  // u ≈ -18). The first tent is pulled in so its fly clears the road by a
  // truck's width: at (-19.5, 21.5) the eave hung a metre off the centreline.
  const tents = [
    { u: -18.6, v: 19.4, facing: [0.28, -1], kind: 'khaki' },
    { u: -9.5, v: 19.8, facing: [0.1, -1], kind: 'sand' },
    { u: 0.8, v: 19.2, facing: [0, -1], kind: 'khaki' },
    { u: 11, v: 19.8, facing: [-0.12, -1], kind: 'sand' },
    { u: 20.5, v: 21.5, facing: [-0.3, -1], kind: 'khaki' },
  ];
  // staff tents: smaller ridge tents behind the store, out of the guests' view
  const staffTents = [
    { u: -30.5, v: 6.5, facing: [1, -0.2] },
    { u: -31, v: 11, facing: [1, 0.1] },
  ];

  // Parking. `heading` is the direction the nose points in camp coordinates;
  // nose-in slots face +v (into the camp), the long vehicles lie along the
  // lane at either end where they can pull straight out, and the ranger's
  // vehicle is backed in beside the office so it leaves forwards.
  //
  // Nobody parks on a painted line here: each driver stopped where the last
  // one left room. Spacing runs 3.9–5.6 m, yaw wanders up to ±12° off square,
  // one jeep is a metre short of the line and the pickup a metre past it.
  // `yaw` is degrees off the nose-in axis, turned into the heading vector.
  const noseIn = (u, v, yawDeg, kind) => {
    const a = (yawDeg * Math.PI) / 180;
    return { u, v, heading: [Math.sin(a), Math.cos(a)], kind };
  };
  const parking = [
    { u: -23.9, v: -12.9, heading: [1, 0.09], kind: 'supply-truck' },
    noseIn(-15.9, -10.4, 7, 'expedition-truck'),
    noseIn(-10.6, -11.2, -11, 'safari-jeep'),
    noseIn(-6.6, -10.1, 4, 'safari-jeep'),
    noseIn(-2.1, -10.5, 12, 'suv'),
    noseIn(2.6, -9.4, -6, 'pickup'),
    noseIn(8.0, -10.6, 9, 'safari-jeep'),
    noseIn(12.1, -10.2, -3, 'utility'),
    { u: 16.4, v: -9.2, heading: [Math.sin(Math.PI + 0.14), Math.cos(Math.PI + 0.14)], kind: 'ranger' },
    { u: 22.3, v: -12.6, heading: [1, -0.12], kind: 'camper' },
    noseIn(27.2, -8.4, 15, 'trailer'),
    { u: 15.4, v: -4.9, heading: [0.55, -1], kind: 'motorcycle' },
  ];

  // Pole lanterns over the parking row, between the lane and the vehicles'
  // tails, so the camp's light reaches the cars at night (the fleet measured
  // none did). The arm and the lamp hang out toward the vehicles (+v).
  // Round 4: a pole between the two jeeps and one between the third jeep and
  // the utility — over the dark vehicles, off every slot's ruts — rather than
  // at the row's centre; the supply truck, camper and trailer at the ends are
  // past both and stay dark.
  const rowLamps = [
    { u: -8.6, v: -14.5, height: 3.0, facing: [0, 1] },
    { u: 10.0, v: -13.5, height: 3.0, facing: [0.3, 1] },
  ];

  // Ground wear, as polylines the overlay paints. Tyre tracks run from the
  // road to the lane and from the lane into each slot; footpaths link the
  // places people actually walk between.
  const trackIn = [
    [-20, ROAD_V + 1],
    [-15, -27.5],
    [-9.5, -24.5],
    [gate.u, gate.v],
    [-3.5, -19.5],
    [-1.5, lane.v],
  ];
  const laneLine = [
    [lane.from, lane.v],
    [lane.to, lane.v],
  ];
  // Ruts run from the lane through the slot and on past the vehicle's far end,
  // so they show in front of a nose-in vehicle and behind a backed-in one; a
  // track that stopped at the slot centre lay wholly under the body (round 2).
  const slotTracks = parking.map((p) => {
    const h = p.heading;
    const along = Math.abs(h[1]) < 0.5;
    const back = h[1] > 0.5 ? [p.u - h[0] * 5, lane.v] : h[1] < -0.5 ? [p.u + h[0] * 2, lane.v] : [p.u - h[0] * 9, lane.v];
    const through = along ? [p.u - h[0] * 3.5, p.v] : [p.u, p.v];
    const beyond = along ? [p.u + h[0] * 4.5, p.v + h[1] * 4.5] : h[1] > 0.5 ? [p.u + h[0] * 2.8, p.v + h[1] * 2.8] : [p.u - h[0] * 2.8, p.v - h[1] * 2.8];
    return [back, through, beyond];
  });
  // The trunk routes: the ones walked a hundred times a day, wide and pale.
  // Fire to mess, mess to the parking, fire to the tents, tents to the mess.
  const heavyPaths = [
    [[fire.u - 1.2, fire.v - 0.4], [mess.u + 3.5, mess.v - 1.5], [mess.u + 1.5, mess.v - 2.6]],
    [[mess.u + 1, mess.v - 3.6], [mess.u + 2.5, -3], [-3.2, lane.v + 1.2]],
    [[fire.u + 0.4, fire.v + 2.4], [fire.u - 0.5, 12.5], [fire.u - 1, 15.8]],
    [[mess.u + 0.5, mess.v + 3.6], [mess.u - 0.5, 14.5], [mess.u - 1, 16.2]],
    [[fire.u + 1.0, fire.v - 2.6], [fire.u + 1.5, -5], [1.5, lane.v + 1.5]],
  ];
  const paths = [
    // fire to mess to kitchen to tank
    [[fire.u, fire.v], [mess.u + 2, mess.v - 1], [mess.u - 3, mess.v]],
    // the mess to the far end of the parking, the cabin to the ranger's vehicle,
    // the tent line's east end down to the lane
    [[mess.u - 3, mess.v - 3.5], [-14, -6], [-16, lane.v + 1.5]],
    [[cabin.u - 1, cabin.v - 3], [cabin.u - 1.5, -8], [16, lane.v + 4]],
    [[22, 17.5], [24, 9], [21.5, -2], [17, -9]],
    [[mess.u - 4, mess.v], [kitchen.u + 2, kitchen.v], [tank.u + 1, tank.v - 1]],
    [[kitchen.u, kitchen.v - 2], [wood.u, wood.v]],
    [[wood.u, wood.v], [fire.u - 1, fire.v]],
    // the tent line, and a spur from each tent to it
    [[-21, 17.5], [-10, 16.2], [0, 15.6], [10, 16.2], [22, 17.5]],
    ...tents.map((t) => [[t.u, t.v - 2.5], [t.u - t.facing[0] * 2, 16.2 + Math.abs(t.u) * 0.06]]),
    [[fire.u, fire.v + 1], [fire.u - 1, 15.8]],
    // cabin to fire, cabin to parking, cabin to map board, cabin to latrine
    [[cabin.u - 1, cabin.v - 3], [cabin.u - 6, fire.v - 1], [fire.u + 1.5, fire.v]],
    [[cabin.u - 1, cabin.v - 3], [mapBoard.u, mapBoard.v - 1], [8, -8.5]],
    [[cabin.u + 3, cabin.v], [latrine.u - 4, latrine.v - 3], [latrine.u - 1.5, latrine.v]],
    [[22, 17.5], [latrine.u - 1.5, latrine.v]],
    // staff to kitchen, store to fuel, gate to cabin
    [[staffTents[0].u + 2, staffTents[0].v], [store.u, store.v + 2], [kitchen.u - 2, kitchen.v - 3]],
    [[store.u, store.v - 1.5], [fuel.u + 2, fuel.v]],
    [[gate.u + 2, gate.v + 2], [3, -8], [cabin.u - 3, cabin.v - 3]],
    // lookout, from the store and from the gate
    [[store.u - 1, store.v - 1.5], [lookout.u + 1.8, lookout.v + 1.2]],
    [[gate.u - 3, gate.v + 2.5], [-24, -20.5], [lookout.u + 1, lookout.v - 2.5]],
  ];
  // Game trail: animals skirt the camp along the far edge and cross to the road
  const gameTrail = [
    [-46, 30],
    [-34, 33],
    [-18, 31],
    [0, 34],
    [16, 32],
    [30, 35],
    [40, 30],
    [46, 22],
  ];

  return {
    gate,
    lane,
    fire,
    fire2,
    mess,
    kitchen,
    tank,
    wood,
    cabin,
    store,
    mast,
    solar,
    lookout,
    latrine,
    fuel,
    workshop,
    mapBoard,
    flag,
    laundry,
    tents,
    staffTents,
    parking,
    rowLamps,
    wear: { trackIn, laneLine, slotTracks, paths, heavyPaths, gameTrail },
    // the fence runs along the road side with the gate in it, and turns up both ends
    fence: [
      [[-38, -23], [gate.u - gate.width / 2, -23]],
      [[gate.u + gate.width / 2, -23], [38, -23]],
      [[38, -23], [39, -4], [38, 10]],
      [[-38, -23], [-39, -6], [-37, 8]],
    ],
  };
}
