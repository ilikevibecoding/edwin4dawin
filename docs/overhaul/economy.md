# Economy v2 - a small but real city economy (spec section 10, rubric 15)

Pass 2 of the economy (workstream P2). Pass 1 (W5) gave the player a wallet, a price book with district multipliers,
vendor shelves with a dawn restock, a shop / jobs UI, rent, sleep and a ship dealer. Pass 2 turns the city itself into
an economy: every trading or serving lot is a business with stock, funds, suppliers and customers; goods move between
them in physical shipments; every credit and every unit of stock is accounted for in one journal; prices follow a
documented rule; and the state is visible in the world and in the UI.

Everything below is an original balancing choice for this game, not a canonical fact.

## 1. Architecture

| file | owns |
| --- | --- |
| `src/economy/prices.js` | the goods catalogue (`GOODS`), the nine wholesale goods, district multipliers, the price rule (`scarcityFactor`, `askPrice`, `bidPrice`, the clamps) |
| `src/coruscant/purposes.js` | `tradeFor(kind)`: the economic role of every purpose kind (terminal / wholesale / producer / retail / service / workshop / medical / utility / transit / housing), what it supplies, consumes, produces, its capacity, staff-based income and household count |
| `src/economy/sim.js` | `EconomySim`: businesses, households, the five chains, atomic `transfer`, quotes, shipments, imports bound to freighters, holds, detain / release, notices, service levels, stabilisers, batching, serialize / restore |
| `src/economy/ledger.js` | `Journal`: one entry per applied transfer, source / sink / internal classification, running totals per category and per day, idempotency keys, conservation helpers |
| `src/economy/arrivals.js` | read-only adapter over the ship traffic (`src/ships/` is not modified): cargo ships, their pad, hold, phase at any port time, pose, next phase; `gameArrivals(game)` in the game, `offlineArrivals(...)` for headless runs |
| `src/economy/crates.js` | `CrateLayer`: one instanced mesh (one draw call) for crate stacks at loading bays, cargo in freighter holds and courier / conveyor shipments in flight; registered with `game.vehicles` |
| `src/economy/economy.js` | the `Economy` facade the game and the UI talk to: wallet, shop / jobs / rent / ships from pass 1 rerouted through the sim, the read API, events, save key `economy` |
| `src/economy/jobs.js` | job boards; payouts go through `economy.earn(..., lotId, 'job:<id>')` so they are journaled and idempotent; a finished ship repair consumes a machine part at the nearest workshop |
| `src/ui/shop.js`, `src/ui/shop.css` | live quotes, stock / target, scarcity trend, market line (menu, waiting parts, district notice, till) |
| `src/ui/adminPanel.js` | the Economy city report in the Developer section |
| `scripts/sim-economy.mjs` | multi-day headless run with scripted disruptions and acceptance checks |
| `scripts/test-economy.mjs` | offline + CDP verification (rubrics 07, 08, 15) |

The sim is deterministic: it never calls `Math.random`; everything derives from the layout seed, the purposes, the
game-day clock (`game.sky`) and the vehicle clock (`game.vehicles.tickCount / 20`, the freighter schedule). It is on
by default and switched off with `?economy=0` (pass-1 behaviour: wallet, book prices, dawn restock).

Time: the sim advances once a game second (`Economy.tick`, `tickCount % TICK_RATE === 0`), never per frame. Each
advance visits at most `TUNING.batch` (60) due businesses / households (sorted by how long they have waited; a business
is due every `visitInterval` = 2 game hours), then runs the shipments pass, the imports pass and the price notes. The
first advance of a fresh city visits everyone at once; at a day change every business and household is due again and
is seen within the next nine batches. Offscreen work is therefore coarse (a business is simulated in 2-hour steps)
while the player-facing state (quotes, stock, shipments) is exact whenever it is read.

## 2. Goods catalogue

Retail items (inventory ids, sold over the counter or by pass-1 vendors) and services keep their pass-1 entries.
Pass 2 adds the wholesale goods of spec section 10 as bulk units that move between businesses in shipments and are
turned into retail items or services on site. Bulk goods have no inventory id and can never enter the player's
inventory (`transfer` refuses `to: 'player'` for them).

| key | label | unit | base | role in the city |
| --- | --- | --- | --- | --- |
| `staples` | Staple ingredients | crate | 3 | one crate = one meal's ingredients; unpacked into bread / cooked meat / produce on diner and market shelves |
| `water` | Clean water | canister | 2 | produced by the power plant (3,000 / day), consumed by every staffed business and by clinics |
| `fuel` | Fuel cells | cell | 12 | burnt by utilities, transit, depots, foundries; drives the utility / transit service level |
| `parts` | Machine parts | part | 25 | the "useful small component" (~25 cr): workshops, hangars, ship repairs, maintenance of utilities and transit |
| `components` | Electronic components | board | 30 | droid shops, the cybernetics clinic, the droid factory, the customs terminal |
| `medical` | Medical supplies | kit | 20 | clinics, pharmacies, bacta wards - one kit per treatment batch |
| `textiles` | Textiles & domestic goods | bale | 8 | unpacked into wool, beds, tables, lanterns... on general-store / tailor shelves |
| `salvage` | Reusable salvage | crate | 5 | output of the recycling plant (from waste), input of foundries, droid factories and droid shops (-> parts) |
| `waste` | Waste | bin | 0 | collected from households (200 / day, `wasteCollected`), disposed of or recycled |

`BULK_OF_CAT` maps retail categories to the bulk good a shelf is unpacked from (`food` / `meat` / `produce` / `hide`
-> `staples`, `material` -> `textiles`, `ore` -> `parts`). Retail items keep their book prices as `base`; a vendor
entry's `price` overrides the book, as in pass 1. The catalogue has 63 entries: 9 bulk goods, 7 services and 47 retail
items.

## 3. Businesses and households

Every lot whose purpose trades or serves is a business (433 on the seed-1337 layout: 61 housing towers are the
households' homes, 372 trading / serving lots):

```
Business { id (lot id), name, kind, category, district, role, hours, staff,
           stock: Map<good, qty>, target: Map<good, qty>, reserved: Map<good, qty>, capacity, funds,
           serviceCapability: { kind, level }, suppliers: [lotId | 'offworld'], customers: [lotId],
           reorderRule: [{ good, min, qty, from }], flags: { overdue, detained, unpaidWages, waiting, held } }
```

Roles come from `tradeFor(kind)`:

- **terminal** (`customs`): the only importer. Holds three days of the whole city's bulk demand (target 5,133
  staples on seed 1337), reorders from `offworld` when under half.
- **wholesale** (`depot`, `warehouse`, `refinery`): buys bulk from the terminal, sells to the retailers, workshops,
  clinics and utilities of its neighbourhood. Targets are three days (`daysCover`) of the customers' consumption.
- **producer** (`foundry`, `droid_factory`, `recycling_plant`): turns an input into an output on site (salvage ->
  parts at 4:1 or 5:1, waste -> salvage at 2:1, water from the plant) and exports what exceeds `exportAbove` (80 %) of
  its target at `exportPrice` (60 % of base) - an honest sink for over-production.
- **retail / food** (groceries, diners, markets, bakeries, tailors...): unpack bulk into shelf items (`_restockShelves`)
  when a shelf is half empty or once a day; sell to the player and to households.
- **workshop** (`repair_shop`, `droid_shop`, `hangar`): repair capability requires parts in stock; a repair job
  consumes one part; `repairBerths()` counts the workshops that can work right now (port capacity).
- **medical**, **utility**, **transit**: the essential services with uptime tracking and stabilisers (section 7).
- **service**, **housing**: offices earn galactic-client income per staff member (a source, levied 10 % for the
  treasury), towers house the residents.

Endowment: every business starts with 75 % of its targets in stock (`endowment`) and `max(300, 60 x staff)` credits,
all journaled as the `endowment` source at day 0.

Wages: `wage` = 18 cr per staff member per day, paid at 06:00 into the household pool; an essential business that cannot
pay receives a bounded public allocation; others flag `unpaidWages` (a visible consequence, not a crash).

Households: one per residential tower (61 towers, 1,063 residents). Demand is modelled in batches per visit, not per
person: `mealsPerResident` 1 meal / day (one batch purchase of the cheapest prepared food at the nearest food
businesses, rotating between the three nearest), `treatmentsPerResident` 0.1 / day (a treatment consumes a medical
kit and pays `treatmentFee` 24), `domesticPerResident` 0.35, `leisurePerResident` 0.4 (`leisureFee` 8),
`ridesPerResident` 0.4 (`ridePrice` 10), `utilityPerResident` 0.5 and `rentPerResident` 3 credits / day to the tower.
The household pool is funded by wages (and starts at `householdStart` 30 cr per resident). Unmet meals are counted
(`stats.unmetMeals`) and reported by the sim.

## 4. The five chains

Every link is a supplier -> customer relation with a scheduled reorder (a business reorders a good when
`stock + inbound < min` = half its target, ordering up to the target from its assigned supplier, or from the
next-nearest supplier that has the good when the assigned one is empty) and a physical shipment (section 8).

1. **Imported ingredients -> terminal -> depot / warehouse -> diner / market -> residents.** `staples` come off the
   freighters at the customs terminal, ride couriers to the neighbourhood wholesale node, then to food retailers who
   unpack them onto shelves that households and the player buy from.
2. **Parts -> workshop -> ship / droid repair -> port capacity.** Foundries and the droid factory make `parts` from
   `salvage`; depots carry them to repair shops and hangars (droid shops rebuild their own from a recycling yard's
   salvage). A workshop without parts is "waiting for a component" (`waitingFor(lotId)` names the shipment that will
   bring them) and `repairBerths()` drops.
3. **Medical supplies -> terminal -> clinic -> patients.** `medical` is imported, distributed by the wholesale nodes,
   consumed per treatment; the clinics' targets include `staff x 4 x daysCover` treatments so the shelves cover demand.
4. **Salvage -> reclamation -> usable components -> maintenance.** Households' `waste` is collected by the recycling
   plant, refined into `salvage`, sold to the foundries / droid factory / droid shops, whose `parts` maintain
   utilities and transit (`maintenance` sink).
5. **Public funds -> utility / transit work -> improved service.** The treasury (`treasuryStart` 60,000 cr, refilled by
   the 10 % levy on office income) grants bounded allocations (`allocationCap` 600 cr / business / day) to essential
   businesses that cannot pay for wages or their essential input; utilities and transit publish a `serviceLevel(lotId)`
   in 0..1 from their fuel and parts stock.

`scripts/test-economy.mjs` traces each chain on the real layout (supplier paths end at a producer or offworld) and
`scripts/sim-economy.mjs` counts the shipments moved on every link.

## 5. Atomic transfers

```
economy.transfer({ from, to, good, qty, credits, reason, key, payer, payee, useReserved }) -> true | 'reason'
```

Accounts: a lot id, `'player'`, `'households'`, `'treasury'`, `'offworld'`, `'admin'`, `'void'` (consumption /
production), `'shipment:<id>'` (goods in transit). The transfer checks, before any change: integers >= 0 and not both
zero; known accounts; stock (`available = stock - reserved`, or the reservation when `useReserved`); the payer's funds;
the receiver's capacity (`room()`); permissions (bulk never to the player; a business only sells what it lists and only
buys what its category accepts; a detained shipment cannot be moved; goods can only be loaded into an `ordered` or
`loaded` shipment). Then both legs are applied exactly once, one journal entry is written, `economy:transfer`
(and `economy:stock` when a shelf empties or refills) is emitted. Failure returns a reason string (`no-stock`,
`no-funds`, `no-capacity`, `not-permitted`, `bad-request`) and nothing changes.

Idempotency: a transfer with a `key` that the journal has already applied is a no-op that returns `true`. Job payouts
(`job:<id>`), import bills (`bill:<shipment>`) and bonds (`bond:<shipment>`) are keyed, so a repeated interaction, an
interrupted animation or a reloaded save can never pay twice. The applied keys are persisted (bounded at 600).

All player money paths use it: buying (`player buy`), selling (`player sale`), services (`service:<item>`), rent,
the ship dealer (the dealer's till receives the price), job payouts (`job`, from the posting terminal's funds, or from
`offworld` if the terminal is broke), admin grants (`grant`, an `admin` source) and creative-mode takes (`creative`
sink: the shelf drops, nobody pays, the journal says so).

## 6. Price rule

```
asking price = round( base x districtMult x clamp(target / available, 0.75, 1.75) + disruption )
factor       = clamp(target / available, FACTOR_MIN = 0.75, FACTOR_MAX = 1.75)   (1 when target is 0, 1.75 when empty)
disruption   = clamp(0.1 x min(2, overdue orders) + 0.15 if inbound cargo is detained + 0.05 if the district reported
               a route delay in the last half day - 0.1 when stock exceeds 1.5 x target, DISRUPTION_MIN = -0.25, DISRUPTION_MAX = 0.35)
bid (what a business pays the player) = ask evaluated at available + 1, x SELL_RATIO 0.45 (PAWN_RATIO 0.3 at a pawn shop), null under the minimum offer
```

`quote(lotId, good) -> { buy, sell, stock, available, target, factor, disruption, base }` (`buy` / `sell` null when the
business does not trade the good that way). Buying raises the next ask (less available), selling lowers the next bid,
so the arbitrage loop buy-at-A / sell-at-B converges: `test-economy.mjs` runs 40 round trips between the cheapest and
dearest grocer and checks that the spread closes, that the player ends with fewer credits than they started with, and
that credits + stock value are conserved to the credit. Services are priced at `base x districtMult` (ships at the
book price). The rule's constants live in `prices.js` and are exported for the tests.

## 7. Sources and sinks (the ledger)

The accounting boundary is: all businesses' funds and stock (at base value), the player's wallet, the goods riding in
shipments, the household pool and the treasury. Everything else is outside (`offworld`, `admin`, `void`). Every
journal entry carries `dCredits` and `dStock` for the boundary; `dW = dCredits + dStock` classifies it as a source
(> 0), a sink (< 0) or internal (0, e.g. a courier delivery or a player purchase's stock leg + credit leg netting to a
sink of the retail margin).

| sources | sinks |
| --- | --- |
| `import` (cargo taken off a freighter), `allocation` (public funds to an essential business), `household` (residents' spending), `clients` (offices' galactic income), `fees` (port fee per unloading), `from_player`, `production` (a producer's output), `waste_collection`, `endowment` (day 0), `admin` (grants), `export_sale` (credits for exported surplus), `jobs`, `other` | `consumption`, `wages`, `maintenance` (parts and fuel used up), `disposal`, `export` (goods leaving), `import_payment` (the bill paid offworld), `retail` (goods sold to the player - they leave the boundary), `levy`, `creative`, `processing` (inputs turned into outputs), `fees` (player fees with no receiving business), `other` |

Conservation, checked every sim step and on every save / restore:

```
sum(sources) - sum(sinks) == W(now) - W(journal start),   W = funds + stock value + wallet + goods in shipments + household pool + treasury
```

`economy.v2.drift()` returns the difference (0 in every test and every step of the 7-day run). The starting wallet and
anything before the journal began are outside the identity by construction (they are the `W(start)` term).

Stabilisers (explicit, bounded, logged): public `allocation` for essential wages and inputs (600 cr / business / day),
an import `bond` for essential cargo the terminal cannot pay (`bondCap` 4,000 cr / day), and alternative suppliers
when the assigned one is empty. Nothing else spawns stock or credits; the sim's `negativeStock()` and the harness both
report any negative stock or funds (none observed).

## 8. Physical shipments

```
Shipment { id: 'S-n', goods: [{ good, qty }], qty, from: lotId | 'offworld', to: lotId, state, carrier: { kind: 'courier' | 'ship' | 'conveyor', id, name?, pad? },
           position: { x, y, z }, eta, history: [[state, dayTime]], bill, paid, held, detained (reason) }
states: ordered -> loaded -> in_transit -> arrived -> unloaded -> delivered | detained (paused) | cancelled
```

- **Courier shipments** (between lots): the goods are moved from the supplier into the `shipment:<id>` account when
  loaded (`loadDelay` half an hour after the order), travel at `courierSpeed` 4,320 blocks / day along the straight
  line between the two loading bays, and are delivered into the customer's stock (an internal entry). Wholesale
  deliveries are paid to the supplier when loaded.
- **Imports**: the terminal collects one open `ordered` shipment per shortfall; the imports pass binds it to the next
  cargo freighter that is in its `fly` phase with at least `importLead` 30 s of flight left, scales the order to the
  ship's hold, journals `import` (goods appear in the shipment account, the boundary grows) and `loaded` /
  `in_transit`. At touchdown it is `arrived`; when the doors open it is unloaded: the terminal pays the bill
  (`importCost` 70 % of base value, `import_payment` sink) and earns the `portFee` 120 cr (`fees` source); the cargo
  rides the conveyor (`conveyorSpeed`) to the terminal and is `delivered`. A terminal that cannot pay holds the
  freighter on its pad (`holdFor(shipIndex)` -> `{ bill, reason, since }`, a `held` notice); the ship stays visibly
  docked until the bill is paid.
- **detain(id, reason) / release(id)**: a detained shipment stops moving, cannot be unloaded or transferred, raises the
  receiver's disruption modifier (+0.15) and posts a district notice; release resumes it with its eta pushed back by
  the time held.
- Every state change emits `economy:shipment` with the public record. `shipments()` returns the live records;
  `shipments(true)` adds the recently completed ones.

Crates: `CrateLayer` draws every crate in one instanced draw call - stacks at the loading bays of businesses holding
bulk (coarse: one crate per N units, capped per bay), the cargo of an `arrived` freighter in its hold (following the
ship's pose), courier boxes and conveyor stacks along their paths. `game.economy.crates.stats` reports
`{ instances, stacks, holds, couriers, drawCalls }`. Only crates within `DRAW_DIST` of the camera are placed; the
layer is culled as one object (a bounding sphere over the crates placed this frame), uploads only the used slice of
its instance buffers, is hidden entirely when it holds nothing and compiles its program at load so the first crate
that comes into view does not stall the frame. Conveyor and courier paths keep their starting height until the last
30 % of the route, so a stack coming down from the spaceport deck rides along the deck rather than through it.

## 9. Visible economic state

- Shop cards show the live ask (`N cr` with an arrow when the scarcity factor is above / below 1), `available in
  stock / target` and `buys at N`; the market line shows the till, the units in stock, the supplier count, today's
  menu (`menuFor(lotId)` -> `{ on, off, text }`: a diner takes an item off the menu when it runs out), what the
  workshop is waiting for (`waitingFor(lotId)` -> the missing good and the shipment bringing it) and the district
  notice (`noticeFor(district)` -> spikes, shortages, delays, detained cargo, held freighters, outages).
- A freighter with an unpaid bill stays on its pad; crates sit in its hold until it is unloaded.
- The admin panel's Developer section carries an **Economy** report (`cityReport()`): day / hour, businesses,
  households, W, ledger sources - sinks with the conservation drift, today's meals / treatments / deliveries /
  unloadings, richest and poorest businesses, biggest stocks, shipments by state, crate stats, quotes, notices.
- Toasts for held freighters, detained cargo and outages (at most one per 30 s).

## 10. Balance

`basic meal` bread 8 (6..14 across factors and districts), cooked meat 12-18; `local ride` air taxi 15 x district
(12 in a residential district), household rides 10; `useful small component` parts 25, door 25, holo sign 24;
`short delivery` courier / delivery jobs 60-150 (cost + 40 %), courier runs 30-120. A first-time player starts with
250 cr, rides for 12, completes a courier run for ~74, buys food for 4-8, rents a room for 60 and sees a shelf drop,
a price climb and a freighter unload within 15 minutes.

## 11. Multi-day simulation

`node scripts/sim-economy.mjs --days 7` (1.9 s wall clock on seed 1337, 96 steps / day) runs the real layout,
purposes and freighter schedule headless with three scripted disruptions (a closed freighter route on day 2, a
detained medical shipment on day 3, a halved waste collection on day 4) and reports conservation (every step), negative
stock, price bounds over every quote, essential-service uptime, shipments created / delivered / cancelled / detained,
imports loaded / unloaded / delivered, the five chains' link counts, a per-day table (meals, unmet, treatments,
shipments, imports, wages, sources, sinks, W, pool, treasury) and a determinism hash of the journal stream. The
7-day acceptance run: conservation OK over 672 checks (worst drift 0 cr), 0 negative stock, factor 1.00..1.75 and
disruption 0..0.20 over 260,064 quotes, uptime medical 98.9 % / utility 100 % / transit 100 %, 2,787 shipments
created / 2,728 delivered (97.9 %), 18 imports aboard freighters, ~1,050 meals a day for 1,063 residents with 0 unmet,
journal hash identical on the second run.

## 12. Save format

Everything persists under the `economy` save key. Pass-1 fields (`credits`, `day`, `stock`, `ownedShips`,
`apartment`, `job`, `stats`) are unchanged; `v2` carries `{ v: 2, dayTime, portTime, nextShipmentId, businesses
[id, funds, stock pairs, lastVisit, lastWageDay, lastRestockDay, acc, flags, uptime, level, openOrders], households
{ funds, lots }, treasury, shipments, recentShipments, recentImports, holds, notices, stats, journal { seq, totals,
applied keys, days, recent } }` (~120-170 KB). A pass-1 save or garbage restores to a fresh, consistent city. The
restored sim continues identically to the uninterrupted one (same journal stream). The blob is written when dirty on
the 1 Hz autosave and always on a flush-now (`game.persistNow()`, page hide / unload).

## 13. Hooks for other workstreams

- `game.economy.business(lotId)`, `quote(lotId, good)`, `shipments()`, `ledger` (`sources`, `sinks`, `net`, `count`,
  `entries(n, filter)`, `has(key)`, `wealth()`, `day()`), `transfer(t)`, `detain(id, reason)`, `release(id)`,
  `menuFor(lotId)`, `waitingFor(lotId)`, `holdFor(shipIndex)`, `noticeFor(district)`, `repairBerths()`,
  `serviceLevel(lotId)`, `cityReport()`, `earn(n, why, lotId, key)`, `charge(n, why, lotId)`.
- Events on `game.events`: `economy:transfer` `{ id, from, to, good, qty, credits, reason, flow, dW }`,
  `economy:shipment` (public shipment record on every state change), `economy:stock` `{ business, good, empty }`
  when a shelf empties or refills, `economy:notice` `{ district, kind, text, lotId }`.
- NPC / dialogue (W9, W4): a cook's menu is `menuFor`, a mechanic's "waiting for a coupling" is `waitingFor`, a
  dockmaster's held freighter is `holdFor`, the noticeboard is `noticeFor`; all derive from real state, so a line
  gated on them is never a fictional shortage.
- Ships (W6): the sim only reads the traffic through `arrivals.js`; a freighter held for an unpaid bill is a state the
  ships module may choose to honour (keep the ship on the pad) by reading `holdFor(index)`.
- `game.js`: `persistState(force)` / `persistNow()` force the economy blob on a flush-now (two-line change).

## 14. Budget (spec: <= +4 ms JS / frame, <= +20 draw calls, <= +40 MB heap against `?economy=0`)

Measured headless at the Senate view (`x=2975 z=120 y=97.2`, `quality=light rd=10`, SwiftShader; the VM is shared with
other builders' Chrome instances, so absolute frame times are noisy and the attribution below is the reliable part):

| what | cost |
| --- | --- |
| `Economy.tick` (once a game second, `tickCount % 20`) | 0.03 ms / frame averaged |
| `EconomySim.advance` (60 due businesses / households, shipments, imports, price notes) | median 0.01 ms, p95 0.4 ms, p99 1.8 ms, worst 7 ms (a GC pause; 7 us per business visit, 22 us per household, 0.9 ms worst visit = the terminal reordering) - once a game second |
| first pass of a fresh city (all 494 visited at once, during load) | 12 ms once |
| `CrateLayer.update` (every frame, ~30 crates in view) | 0.15 ms / frame |
| save blob (`serialize` + `JSON.stringify`, 155 KB) | 1.4 ms, at most once per 10 s when dirty and on a flush-now |
| draw calls | +1 (the crate layer, only while crates are in view; culled as one object) |
| heap | within run-to-run noise (medians 497-500 MB on vs 504-510 MB off; peaks 521-543 vs 519-529) |

`scripts/bench.mjs` 40 s runs, steady-state (after the first 8 s) median JS per frame: off 5.63 / 4.70 / 5.75 ms, on 7.70 /
4.00 / 3.62 ms over three pairs - the sim is inside the +/-2 ms run-to-run noise of this VM. A 8.7 s single-frame stall
seen in one early "on" run was the crate program compiling lazily under software GL; the layer now compiles it at load.

## 15. Known gaps

- Holds are economic state only: the freighter's own animation is not stopped (no edits under `src/ships/`); the
  crates in its hold stay while it is `arrived` and disappear when it is unloaded or leaves.
- Household demand is per tower and per visit (2-hour batches), not per resident; population NPCs (W4) do not yet
  walk to the shops they buy from.
- 67 of 433 businesses end the 7-day run with unpaid wages (mostly small offices without client income and shops
  in the undercity); the visible consequence is a flag and a notice, not closure.
- Notices are kept per district (8 most recent); there is no in-world noticeboard mesh, the text is in the shop UI
  and the admin report.
- Service level only reacts to fuel / parts stock; allocations improve it indirectly (through purchases), there is no
  explicit "work order" object.
