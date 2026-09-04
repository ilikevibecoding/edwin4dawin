// In-page half of tools/qa_walk.mjs. Evaluated once in the app page (Vite dev server) after
// window.debugAPI.ready; installs window.__qa with the walking / door / lift / stairs / fighter probes.
// Everything here runs against debugAPI.simulate() (no rendering) so it is fast under software GL.
// Plain script (not a module): the file is read by qa_walk.mjs and passed to page.evaluate as a string.
(async () => {
  const api = window.debugAPI;
  const spec = await import("/src/spec.js");
  const { DOORS, ROOMS, ROOM_BY_ID, DECKS, DECK_ORDER, LIFT_SHAFTS, LIFT_SHAFTS_E, HANGAR, HULL, roomBounds, hullBottomY, hullTopY, hullHalfWidth } = spec;

  const r2 = (v) => Math.round(v * 100) / 100;
  const P = () => api.player.position;
  const posArr = () => [r2(P().x), r2(P().y), r2(P().z)];
  const cellId = () => (api.cells.current ? api.cells.current.id : null);
  const deg = (rad) => (rad * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;
  function bounds(id) {
    const b = roomBounds(ROOM_BY_ID[id]);
    return { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z };
  }
  /** How far (m) point p lies outside the XZ rectangle of bounds b (0 when inside). */
  function outsideXZ(p, b) {
    return r2(Math.max(b.x0 - p.x, p.x - b.x1, b.z0 - p.z, p.z - b.z1, 0));
  }
  /** Enabled colliders touching the player capsule footprint (+margin): evidence for "stuck" results. */
  function blockers(margin = 0.12) {
    const p = P();
    const R = 0.32 + margin;
    const out = [];
    for (const c of api.cells.colliders) {
      if (c.disabled) continue;
      if (c.max.y < p.y + 0.05 || c.min.y > p.y + 1.8) continue;
      const dx = p.x - Math.min(Math.max(p.x, c.min.x), c.max.x);
      const dz = p.z - Math.min(Math.max(p.z, c.min.z), c.max.z);
      if (dx * dx + dz * dz > R * R) continue;
      if (c.walkable && c.max.y <= p.y + 0.55) continue;
      out.push({ tag: c.tag, cell: c.cell || null, min: c.min.toArray().map(r2), max: c.max.toArray().map(r2) });
      if (out.length >= 6) break;
    }
    return out;
  }
  /** Disable / re-enable every collider with one of the given tags (in-memory only; proves a fix). */
  function setCollidersDisabled(tags, disabled) {
    let n = 0;
    for (const c of api.cells.colliders) {
      if (tags.includes(c.tag)) {
        c.disabled = disabled;
        n++;
      }
    }
    return n;
  }
  /** Turn the player toward a world point (feet stay put). */
  function faceTo(tx, tz) {
    const p = P();
    api.player.yaw = Math.atan2(-(tx - p.x), -(tz - p.z)); // forward is (-sin yaw, -cos yaw)
  }
  /** Walk toward a world point, re-aiming every slice; stops within tol, on stuck, or on timeout. */
  function walkTo(tx, tz, { maxS = 14, tol = 0.3, slice = 0.1 } = {}) {
    let t = 0;
    let stuck = 0;
    const last = P().clone();
    let minY = P().y;
    let maxY = P().y;
    while (t < maxS) {
      faceTo(tx, tz);
      api.simulate(slice, ["KeyW"]);
      t += slice;
      const p = P();
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d < tol) return { ok: true, t: r2(t), pos: posArr(), minY: r2(minY), maxY: r2(maxY) };
      const moved = Math.hypot(p.x - last.x, p.z - last.z);
      stuck = moved < 0.015 ? stuck + slice : 0;
      last.copy(p);
      if (stuck > 0.6) return { ok: false, reason: "stuck", t: r2(t), pos: posArr(), remaining: r2(d), minY: r2(minY), maxY: r2(maxY), blockers: blockers() };
    }
    return { ok: false, reason: "timeout", t: r2(t), pos: posArr(), remaining: r2(Math.hypot(tx - P().x, tz - P().z)), minY: r2(minY), maxY: r2(maxY) };
  }
  const doorObj = (id) => api.cells.doors.get(id);

  // ---------------------------------------------------------------------------------------------
  // 1. Doors: cross every non-lift door A -> B then B -> A by walking straight through it
  // ---------------------------------------------------------------------------------------------
  /** Which side of the door plane (+1 / -1 along the door axis) a room lies on. */
  function doorSide(d, room) {
    if (d.kestrel) return room.id === "kestrel" ? 1 : -1; // the ramp runs aft (-z) from the Kestrel's door
    const k = d.axis === "x" ? 0 : 2;
    return Math.sign(room.origin[k] - d.pos[k]) || 1;
  }
  /**
   * Walk from `from` through door d into `to`. When place=true the player is teleported to a point
   * 3 m in front of the door on the `from` side (clamped inside the room), facing the door.
   */
  function crossDoor(d, from, to, place = true) {
    const kk = d.axis === "x" ? "x" : "z";
    const k = kk === "x" ? 0 : 2;
    const side = doorSide(d, from);
    const bFrom = bounds(from.id);
    const bTo = bounds(to.id);
    const doorC = d.pos[k];
    const yaw = kk === "z" ? (side > 0 ? 0 : 180) : side > 0 ? 90 : -90;
    let start = doorC + side * 3;
    const lo = (kk === "x" ? bFrom.x0 : bFrom.z0) + 0.5;
    const hi = (kk === "x" ? bFrom.x1 : bFrom.z1) - 0.5;
    if (d.kestrel && from.id === "hangar") start = doorC - 9.5; // foot of the boarding ramp on the deck
    else start = Math.min(hi, Math.max(lo, start));
    const y = d.kestrel && from.id === "hangar" ? DECKS.E.y : d.pos[1];
    if (place) {
      api.teleport(from.id);
      api.player.setPose(kk === "x" ? start : d.pos[0], kk === "z" ? start : d.pos[2], yaw, 0, y);
      api.cells.setCurrent(from.id);
      api.simulate(0.3, []);
    } else {
      api.player.yaw = rad(yaw);
    }
    // progress past the door plane needed to be 1.2 m inside `to` (its inner wall face nearest the door)
    let required;
    if (d.kestrel) required = to.id === "hangar" ? 9.0 : 1.6;
    else {
      const faces = kk === "x" ? [bTo.x0, bTo.x1] : [bTo.z0, bTo.z1];
      required = Math.min(...faces.map((f) => Math.abs(f - doorC))) + 1.2;
    }
    const dobj = doorObj(d.id);
    const startPos = posArr();
    const startCell = cellId();
    const cells = [startCell];
    let maxOpen = dobj ? dobj.openness : -1;
    let openAtCross = null;
    let crossed = false;
    let stuck = 0;
    let done = false;
    let t = 0;
    const last = P().clone();
    let minY = P().y;
    while (t < 9) {
      api.simulate(0.1, ["KeyW"]);
      t += 0.1;
      const p = P();
      minY = Math.min(minY, p.y);
      const o = dobj ? dobj.openness : -1;
      maxOpen = Math.max(maxOpen, o);
      const past = (p[kk] - doorC) * -side;
      if (!crossed && past > 0) {
        crossed = true;
        openAtCross = r2(o);
      }
      const c = cellId();
      if (cells[cells.length - 1] !== c) cells.push(c);
      if (c === to.id && past >= required) {
        done = true;
        break;
      }
      const moved = p.distanceTo(last);
      last.copy(p);
      stuck = moved < 0.01 ? stuck + 1 : 0;
      if (stuck >= 6) break;
    }
    const p = P();
    const outXZ = outsideXZ(p, bTo);
    const yOk = p.y >= bTo.y0 - 0.1 && p.y <= bTo.y1;
    const insideTo = outXZ <= 0.05 && yOk;
    const pass = done && maxOpen >= 0.95 && insideTo && cellId() === to.id;
    const row = { door: d.id, type: d.type, from: from.id, to: to.id, start: startPos, yawDeg: yaw, end: posArr(), maxOpen: r2(maxOpen), openAtCross, crossed, cells, seconds: r2(t), required: r2(required), reachedTo: done, insideTo, outsideXZ: outXZ, minY: r2(minY), stuck: stuck >= 6, pass };
    if (stuck >= 6) row.blockers = blockers();
    return row;
  }
  function runDoors() {
    const rows = [];
    for (const d of DOORS) {
      if (d.type === "lift") continue;
      const A = ROOM_BY_ID[d.a];
      const B = ROOM_BY_ID[d.b];
      const there = crossDoor(d, A, B, true);
      // let the door close again (hold 1.1 s + travel) so the return trip re-triggers it; big doors keep
      // the player inside their 9 m trigger and stay open, which is fine
      let waited = 0;
      const dobj = doorObj(d.id);
      while (dobj && dobj.openness > 0 && waited < 4) {
        api.simulate(0.25, []);
        waited += 0.25;
      }
      const back = crossDoor(d, B, A, false);
      back.closedBeforeReturn = dobj ? dobj.openness === 0 : null;
      rows.push({ door: d.id, type: d.type, w: d.w, pos: d.pos, axis: d.axis, there, back, pass: there.pass && back.pass });
    }
    return rows;
  }

  // ---------------------------------------------------------------------------------------------
  // 2. Spawns: forward / back / left / right for 2 s each, walls must hold, floor must hold
  // ---------------------------------------------------------------------------------------------
  function runSpawns() {
    const rows = [];
    for (const r of ROOMS) {
      api.teleport(r.id);
      const b = bounds(r.id);
      const spawn = posArr();
      const floorY = r.origin[1] + (r.spawn.y || 0);
      let maxOut = 0;
      let minY = Infinity;
      let maxY = -Infinity;
      let leftBounds = null;
      const legs = {};
      for (const [key, name] of [["KeyW", "fwd"], ["KeyS", "back"], ["KeyA", "left"], ["KeyD", "right"]]) {
        const a = P().clone();
        for (let i = 0; i < 20; i++) {
          api.simulate(0.1, [key]);
          const p = P();
          const out = outsideXZ(p, b);
          maxOut = Math.max(maxOut, out);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
          if (out > 0.6 && !leftBounds) leftBounds = { leg: name, pos: posArr(), cell: cellId(), at: r2((i + 1) * 0.1) };
        }
        legs[name] = { moved: r2(P().distanceTo(a)), end: posArr() };
      }
      const stuck = legs.fwd.moved < 0.5 && r.kind !== "lift";
      const belowFloor = minY < floorY - 0.1;
      const aboveCeil = maxY > floorY + 4;
      rows.push({ room: r.id, kind: r.kind, spawn, floorY, legs, maxOutside: r2(maxOut), minY: r2(minY), maxY: r2(maxY), leftBounds, stuckAtSpawn: stuck, belowFloor, aboveCeil, finalCell: cellId(), pass: maxOut <= 0.6 && !belowFloor && !aboveCeil && !stuck });
    }
    return rows;
  }

  // ---------------------------------------------------------------------------------------------
  // 3. Turbolifts: lobby -> car (door opens on approach) -> ride to every other deck -> walk out
  // ---------------------------------------------------------------------------------------------
  /**
   * opts.disableTags: collider tags switched off for the run (in-memory workaround used to prove a fix).
   * When the walk-in through the lift door fails, the player is teleported into the car so the ride /
   * arrival / walk-out steps are still exercised; `pass` requires the real walk-in, `ridePass` does not.
   */
  function runLifts(opts = {}) {
    const lobbies = ROOMS.filter((r) => r.kind === "lobby");
    const lobbyOfDeck = Object.fromEntries(lobbies.map((l) => [l.deck, l]));
    const rows = [];
    const disabled = opts.disableTags ? setCollidersDisabled(opts.disableTags, true) : 0;
    for (const lobby of lobbies) {
      const shafts = lobby.deck === "E" ? LIFT_SHAFTS_E : LIFT_SHAFTS;
      for (const s of shafts) {
        const carId = `lift_${s.id}_${lobby.deck}`;
        const car = ROOM_BY_ID[carId];
        const doorId = `${lobby.id}__${carId}`;
        for (const dest of DECK_ORDER) {
          if (dest === lobby.deck) continue;
          const row = { lobby: lobby.id, shaft: s.id, from: lobby.deck, to: dest, car: carId, disabledColliders: disabled };
          api.teleport(lobby.id);
          api.player.setPose(s.x, lobby.origin[2] + 3.5, 180, 0, lobby.origin[1]);
          api.cells.setCurrent(lobby.id);
          row.start = posArr();
          const din = doorObj(doorId);
          let maxOpenIn = 0;
          for (let i = 0; i < 30; i++) {
            api.simulate(0.1, ["KeyW"]);
            maxOpenIn = Math.max(maxOpenIn, din ? din.openness : -1);
            if (cellId() === carId && P().z > car.origin[2] - 0.3) break;
          }
          row.entryDoorMaxOpen = r2(maxOpenIn);
          row.entered = cellId() === carId;
          row.posAfterWalkIn = posArr();
          if (!row.entered) {
            row.walkInBlockers = blockers();
            // fall back: put the player in the car so the ride itself still gets tested
            api.player.setPose(car.origin[0], car.origin[2] + 0.4, 180, 0, car.origin[1]);
            api.cells.setCurrent(carId);
            row.enteredBy = "teleport";
          } else row.enteredBy = "walk";
          row.posInCar = posArr();
          // stand still: the car door closes (0.9 s hold + travel) and the deck menu appears
          api.simulate(2.0, []);
          row.doorClosedBeforeSelect = din ? r2(din.openness) : null;
          row.menuVisible = !document.getElementById("lift-menu").classList.contains("hidden");
          row.selected = api.liftSelect(dest);
          const st0 = api.liftState();
          row.rideDur = st0.ride ? null : null;
          api.simulate(7.0, []);
          const st = api.liftState();
          const destCar = `lift_${s.id}_${dest}`;
          row.stateAfter = st;
          row.cellAfter = cellId();
          row.posAfter = posArr();
          row.yExpected = DECKS[dest].y;
          row.arrived = st.state === "idle" && row.cellAfter === destCar && Math.abs(P().y - DECKS[dest].y) < 0.05;
          // walk out through the car door into the destination lobby
          const destLobby = lobbyOfDeck[dest];
          const dout = doorObj(`${destLobby.id}__${destCar}`);
          row.exitDoorOpenAtArrival = dout ? r2(dout.openness) : null;
          if (opts.patchArrivalDoor && dout && row.arrived && dout.openness < 0.5) {
            // test-only runtime patch standing in for the fix "keep the car door open after arrival":
            // LiftSystem.update() closes it on the next frame because closeTimer is 0 at arrival
            dout.close = () => {};
            dout.open();
            row.arrivalDoorPatched = true;
          }
          let maxOpenOut = dout ? dout.openness : -1;
          api.player.yaw = 0; // the car door is on the car's -z (lobby) side
          for (let i = 0; i < 40; i++) {
            api.simulate(0.1, ["KeyW"]);
            maxOpenOut = Math.max(maxOpenOut, dout ? dout.openness : -1);
            if (cellId() === destLobby.id && P().z < destLobby.origin[2] + destLobby.size[2] / 2 - 0.8) break;
          }
          row.exitDoorMaxOpen = r2(maxOpenOut);
          row.exited = cellId() === destLobby.id;
          row.posExit = posArr();
          if (!row.exited) row.exitBlockers = blockers();
          if (row.arrivalDoorPatched) {
            delete dout.close; // back to Door.prototype.close
            dout.close();
            api.simulate(1.0, []);
          }
          row.ridePass = row.selected && row.arrived;
          row.pass = row.entered && row.ridePass && row.exited;
          rows.push(row);
        }
      }
    }
    if (disabled) setCollidersDisabled(opts.disableTags, false);
    return rows;
  }

  // ---------------------------------------------------------------------------------------------
  // 4. Stairs / raised floors: scripted waypoint walks, report the y reached at every waypoint
  // ---------------------------------------------------------------------------------------------
  // Waypoints are world [x, z, expectedY|null]; keys-scripts hold keys for `seconds` and check `expect`
  // (y = final y within 0.1; xMax / xMin = final x bound; yMin = never below).
  const STAIR_SCRIPTS = [
    { name: "bridge: E pit stair down (246 -> 244.2), along the pit lane, back up", room: "bridge", start: [4.8, 246, 243.5], yaw: 0, wps: [[4.8, 236.5, 244.2], [7, 236.5, 244.2], [7, 223, 244.2], [7, 236.5, 244.2], [4.8, 236.8, 244.2], [4.8, 243.5, 246]] },
    { name: "bridge: W pit stair down, along the pit lane, back up", room: "bridge", start: [-4.8, 246, 243.5], yaw: 0, wps: [[-4.8, 236.5, 244.2], [-7, 236.5, 244.2], [-7, 223, 244.2], [-7, 236.5, 244.2], [-4.8, 236.8, 244.2], [-4.8, 243.5, 246]] },
    { name: "bridge: walkway railing holds (strafe toward the pit)", room: "bridge", start: [0, 246, 235], yaw: 0, keys: ["KeyD"], seconds: 2.0, expect: { xMax: 3.9, y: 246 } },
    { name: "hangar: E stair tower (9 flights) -> flight-control catwalk -> door", room: "hangar", start: [60.4, -40, -12.8], yaw: 0, wps: [[60.4, -21.6, -36.8], [62.6, -21.6, -36.8], [62.6, -12.8, -33.6], [60.4, -12.8, -33.6], [60.4, -21.6, -30.4], [62.6, -21.6, -30.4], [62.6, -12.8, -27.2], [60.4, -12.8, -27.2], [60.4, -21.6, -24], [61.5, -27, -24], [62.6, -30, -24], [68.5, -30, -24]], expectCell: "flight_control" },
    { name: "hangar: W stair tower (9 flights) -> service gantry y -10", room: "hangar", start: [-60.4, -40, -40.3], yaw: 0, wps: [[-60.4, -49.2, -36.67], [-62.6, -49.2, -36.67], [-62.6, -40.3, -33.33], [-60.4, -40.3, -33.33], [-60.4, -49.2, -30], [-62.6, -49.2, -30], [-62.6, -40.3, -26.67], [-60.4, -40.3, -26.67], [-60.4, -49.2, -23.33], [-62.6, -49.2, -23.33], [-62.6, -40.3, -20], [-60.4, -40.3, -20], [-60.4, -49.2, -16.67], [-62.6, -49.2, -16.67], [-62.6, -40.3, -13.33], [-60.4, -40.3, -13.33], [-60.4, -49.2, -10], [-57.7, -49.2, -10], [-57.7, -60, -10]] },
    { name: "hangar: walk at the floor opening: coaming step (+0.5) then the containment field must stop us (no fall)", room: "hangar", start: [-36, -40, 5], yaw: -90, keys: ["KeyW"], seconds: 4.0, expect: { xMax: -29.5, yMin: -40.0 } },
    { name: "hyperdrive: N stair -> W catwalk run -> N catwalk run (y +3.6)", room: "hyperdrive", start: [10.7, 48, 265.7], yaw: 180, wps: [[10.7, 273.6, 51.6], [20, 273.6, 51.6], [33, 273.6, 51.6]] },
    { name: "hyperdrive: S stair -> W catwalk run", room: "hyperdrive", start: [10.7, 48, 290.3], yaw: 0, wps: [[10.7, 282.4, 51.6]] },
    { name: "reactor: E switchback stair -> landing 4.5 -> upper ring y +9", room: "reactor", start: [10.5, 48, 361.8], yaw: -90, wps: [[20.2, 361.8, 52.5], [20.2, 364.4, 52.5], [11.2, 364.4, 57], [9.3, 364.9, 57], [0, 371.6, 57]] },
    { name: "reactor: W switchback stair -> upper ring", room: "reactor", start: [-10.5, 48, 361.8], yaw: 90, wps: [[-20.2, 361.8, 52.5], [-20.2, 364.4, 52.5], [-11.2, 364.4, 57], [-9.3, 364.9, 57]] },
    { name: "reactor: entry walkway edge (strafe off the walkway over the grating at 47.4)", room: "reactor", start: [0, 48, 335], yaw: 180, keys: ["KeyA"], seconds: 2.0, expect: { y: 48 } },
    { name: "briefing: aisle steps up three tiers (+0.35 / +0.7 / +1.05)", room: "briefing", start: [4.4, 232, 273], yaw: -90, wps: [[12, 273, 232], [16.6, 273, 232.35], [20.1, 273, 232.7], [26, 273, 233.05]] },
    { name: "briefing: dais steps (+0.3)", room: "briefing", start: [10, 232, 268.4], yaw: 90, wps: [[6.2, 268.4, 232.3]] },
    { name: "observation: spawn -> forward viewport wall (flat gallery)", room: "observation", start: [0, 232, 232], yaw: 0, wps: [[0, 219.6, 232]] },
    { name: "flight_control: upper tier -> lower tier at the window -> back up (+0.45)", room: "flight_control", start: [83.4, -24, -30], yaw: 90, wps: [[67, -30, -24], [81.5, -30, -23.55]] },
    { name: "comms: platform steps (+0.42)", room: "comms", start: [-12, 246, 298], yaw: 90, wps: [[-18, 298, 246.42]] },
    { name: "tactical: holo dais (+0.36) via W stair, off the dais, up to the N gallery (+0.36)", room: "tactical", start: [4.4, 246, 298], yaw: -90, wps: [[13.5, 298, 246.36], [10.5, 298, 246], [16.4, 292.3, 246], [16.4, 288.6, 246.36]] },
    { name: "shuttle_bay: boarding platform stair (+3.2)", room: "shuttle_bay", start: [115.5, -40, -61.5], yaw: 90, wps: [[108.6, -61.5, -36.8]] },
    { name: "fighter_bay: cradle platform stair (+4.3)", room: "fighter_bay", start: [-97.3, -40, -69.5], yaw: 0, wps: [[-97.3, -79, -35.7]] },
  ];
  function runStairs() {
    const rows = [];
    for (const sc of STAIR_SCRIPTS) {
      api.teleport(sc.room);
      api.player.setPose(sc.start[0], sc.start[2], sc.yaw, 0, sc.start[1]);
      api.cells.setCurrent(sc.room);
      api.simulate(0.2, []);
      const row = { name: sc.name, room: sc.room, start: posArr(), steps: [], pass: true };
      if (sc.keys) {
        const a = P().clone();
        let minY = a.y;
        for (let t = 0; t < sc.seconds; t += 0.1) {
          api.simulate(0.1, sc.keys);
          minY = Math.min(minY, P().y);
        }
        const p = P();
        row.end = posArr();
        row.moved = r2(p.distanceTo(a));
        row.minY = r2(minY);
        if (sc.expect.xMax !== undefined && p.x > sc.expect.xMax) row.pass = false;
        if (sc.expect.xMin !== undefined && p.x < sc.expect.xMin) row.pass = false;
        if (sc.expect.y !== undefined && Math.abs(p.y - sc.expect.y) > 0.1) row.pass = false;
        if (sc.expect.yMin !== undefined && minY < sc.expect.yMin - 0.05) row.pass = false;
        row.expect = sc.expect;
        row.blockers = blockers();
      } else {
        for (const [x, z, yExp] of sc.wps) {
          const w = walkTo(x, z);
          const step = { target: [x, z], reached: w.ok, reason: w.reason, pos: w.pos, y: w.pos[1], yExpected: yExp, t: w.t, cell: cellId(), blockers: w.blockers };
          step.yOk = yExp === null || yExp === undefined ? null : Math.abs(w.pos[1] - yExp) < 0.15;
          if (!w.ok || step.yOk === false) row.pass = false;
          row.steps.push(step);
          if (!w.ok) break;
        }
        if (sc.expectCell) {
          row.expectCell = sc.expectCell;
          row.finalCell = cellId();
          if (row.finalCell !== sc.expectCell) row.pass = false;
        }
      }
      row.finalY = r2(P().y);
      rows.push(row);
    }
    return rows;
  }

  // ---------------------------------------------------------------------------------------------
  // 6. Fighters: step traffic.update() for N simulated seconds, check hull clearance + cycles + state
  // ---------------------------------------------------------------------------------------------
  function runFighters(seconds) {
    const tr = api.traffic;
    if (!tr) return { error: "traffic unavailable" };
    const cam = api.rig.camera;
    const dt = 1 / 60;
    let T = tr.getState().t || 0;
    const T0 = T;
    const phases = [];
    const prevHook = tr.hooks.onPhase;
    tr.hooks.onPhase = (f, p) => phases.push([r2(T - T0), f.id, p]);
    const inHull = (p) => p.z > HULL.zBow && p.z < HULL.zStern && Math.abs(p.x) < hullHalfWidth(p.z) && p.y > hullBottomY(p.z) && p.y < hullTopY(p.z);
    const inHangarBox = (p) => p.x > -65 && p.x < 65 && p.y > -40.01 && p.y < 0 && p.z > -140 && p.z < 80;
    const o = HANGAR.opening;
    const inMouthWell = (p) => p.x > o.x0 - 1 && p.x < o.x1 + 1 && p.z > o.z0 - 1 && p.z < o.z1 + 1 && p.y <= -40.01;
    let violations = 0;
    let wellSamples = 0;
    let nan = false;
    const samples = [];
    let maxAirborne = 0;
    const phaseSeen = {};
    const steps = Math.round(seconds / dt);
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) {
      T += dt;
      tr.update(dt, T, cam);
      maxAirborne = Math.max(maxAirborne, tr.airborne);
      if (i % 6) continue;
      for (const f of tr.fighters) {
        phaseSeen[f.phase] = (phaseSeen[f.phase] || 0) + 1;
        if (f.phase === "docked" || f.phase === "parked") continue;
        const p = f.position;
        if (!Number.isFinite(p.x + p.y + p.z) || !Number.isFinite(f.quaternion.x + f.quaternion.w)) {
          nan = true;
          samples.push({ t: r2(T - T0), id: f.id, phase: f.phase, nan: true });
          break;
        }
        if (inHull(p) && !inHangarBox(p)) {
          if (inMouthWell(p)) wellSamples++;
          else {
            violations++;
            if (samples.length < 15) samples.push({ t: r2(T - T0), id: f.id, phase: f.phase, pos: [r2(p.x), r2(p.y), r2(p.z)], hullBottomY: r2(hullBottomY(p.z)), hullTopY: r2(hullTopY(p.z)), halfWidth: r2(hullHalfWidth(p.z)) });
          }
        }
      }
      if (nan) break;
    }
    const ms = performance.now() - t0;
    const launches = new Map();
    const cycles = [];
    for (const [t, id, ph] of phases) {
      if (ph === "release") launches.set(id, t);
      else if (ph === "docked" && launches.has(id)) {
        cycles.push({ id, launchedAt: launches.get(id), dockedAt: t, seconds: r2(t - launches.get(id)) });
        launches.delete(id);
      }
    }
    const s1 = tr.getState();
    tr.setState(JSON.parse(JSON.stringify(s1)));
    const s2 = tr.getState();
    const stateRoundTrip = JSON.stringify(s1.fighters) === JSON.stringify(s2.fighters) && s1.k === s2.k && s1.next === s2.next;
    tr.hooks.onPhase = prevHook;
    const counts = {};
    for (const [, , ph] of phases) counts[ph] = (counts[ph] || 0) + 1;
    return { seconds, steps, simMs: Math.round(ms), usPerStep: r2((ms / steps) * 1000), phaseTransitions: counts, cycles, completeCycles: cycles.length, dockEvents: counts.docked || 0, releaseEvents: counts.release || 0, maxAirborne, hullViolations: violations, hullViolationSamples: samples, mouthWellSamples: wellSamples, nan, stateRoundTrip, stateBytes: JSON.stringify(s1).length, fleet: { fighters: tr.fighters.length, finalPhases: tr.fighters.map((f) => f.phase).reduce((a, p) => ((a[p] = (a[p] || 0) + 1), a), {}) }, phaseLog: phases.slice(0, 80) };
  }

  // ---------------------------------------------------------------------------------------------
  // 7. Runtime material keys + room api hooks (for the hygiene / extensibility sections)
  // ---------------------------------------------------------------------------------------------
  function materialKeys() {
    const m = api.materials;
    return Object.keys(m).filter((k) => m[k] && m[k].isMaterial);
  }
  function cellApis() {
    const out = {};
    for (const [id, c] of api.cells.cells) if (c.api) out[id] = Object.keys(c.api);
    return out;
  }
  /** Spec-level room volume overlaps + colliders of other cells intruding into lift cars. */
  function roomOverlaps() {
    const overlaps = [];
    for (let i = 0; i < ROOMS.length; i++)
      for (let j = i + 1; j < ROOMS.length; j++) {
        const a = roomBounds(ROOMS[i]);
        const b = roomBounds(ROOMS[j]);
        const ix = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
        const iy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
        const iz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
        if (ix <= 0.01 || iy <= 0.01 || iz <= 0.01) continue;
        overlaps.push({ a: ROOMS[i].id, b: ROOMS[j].id, overlap: [r2(ix), r2(iy), r2(iz)], liftCar: ROOMS[i].kind === "lift" || ROOMS[j].kind === "lift" });
      }
    const intrusions = [];
    for (const car of ROOMS.filter((r) => r.kind === "lift")) {
      const b = roomBounds(car);
      for (const c of api.cells.colliders) {
        if (!c.cell || c.cell === car.id || c.cell === car.lobby) continue;
        if (c.max.x <= b.min.x || c.min.x >= b.max.x || c.max.z <= b.min.z || c.min.z >= b.max.z || c.max.y <= b.min.y || c.min.y >= b.max.y) continue;
        intrusions.push({ car: car.id, tag: c.tag, cell: c.cell, min: c.min.toArray().map(r2), max: c.max.toArray().map(r2) });
      }
    }
    return { overlaps, intrusions };
  }

  window.__qa = { spec, r2, posArr, cellId, bounds, outsideXZ, blockers, setCollidersDisabled, faceTo, walkTo, crossDoor, runDoors, runSpawns, runLifts, runStairs, runFighters, materialKeys, cellApis, roomOverlaps, STAIR_SCRIPTS, deg };
  return true;
})();
