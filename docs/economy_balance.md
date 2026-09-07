# Economy balance (rubric 08 #10)

Currency: Republic credits (`player.credits`, integer, 250 on a fresh world). Everything below is in real minutes of
survival play; one game day is 12 real minutes (`DAY_LENGTH_SECONDS`). The numbers come from a simulation of a greedy
player working the real, deterministic job boards of the seed-1337 city (`generateBoard` for all 17 terminals, day
after day) with movement speeds measured in the game (walk 4.4 blocks/s, sprint 5.7 blocks/s), a 1.35 street-detour
factor, 12 s to find each door and 8 s per air-taxi pickup. Creative mode shows prices but never charges; jobs still
pay there, so the creative wallet is cosmetic.

## Price book

Rubric prices are the base; the district multiplier applies to goods (never to ships): undercity / entertainment 0.8,
market 0.9, industrial 0.95, residential 1.0, financial and spaceport 1.1, senate 1.4. Vendors buy at 45% of what
they would sell for; pawn brokers and scrapyards buy anything with a book value at 30%.

| Item | Base | Undercity | Senate | Vendor pays (45%) |
|---|---|---|---|---|
| Apple | 4 | 3 | 6 | 2 |
| Bread | 8 | 6 | 11 | 4 |
| Cooked chicken / steak | 12 / 16 | 10 / 13 | 17 / 22 | 5 / 7 |
| Wheat / seeds | 3 / 1 | 2 / 1 | 4 / 1 | 1 / - |
| Raw beef / leather / feather | 9 / 9 / 2 | 7 / 7 / 2 | 13 / 13 / 3 | 4 / 4 / 1 |
| Planks / torch / wool | 2 / 3 / 6 | 2 / 2 / 5 | 3 / 4 / 8 | 1 / 1 / 3 |
| Chest / door / bed | 40 / 25 / 45 | 32 / 20 / 36 | 56 / 35 / 63 | 18 / 11 / 20 |
| Iron ore / gold ore | 14 / 40 | 11 / 32 | 20 / 56 | 6 / 18 |
| Air-taxi ride | 15 | 12 | 21 | - |
| Room for the night | 60 | 48 | 84 | - |
| Bacta shot | 20 | 16 | 28 | - |
| Ships: speeder / shuttle / freighter / yacht | 4,000 / 14,000 / 32,000 / 60,000 | flat | flat | trade-in 60% |

Design rules behind the table:

- 45% sell ratio kills district arbitrage: the best buy-low/sell-high pair is undercity 0.8 to senate 1.4 x 0.45 =
  0.63 of base, always a loss.
- Offers below 0.75 cr are not made at all. Cobblestone, stone, dirt and grass seeds have no resale value and blocks
  the book does not price (city cladding) have no scrap value, so "dig up the city and sell it" earns nothing. Without
  this rule a pawn broker paid 1 cr per dug block, about 60 cr/min - faster than any job.
- Stock is per vendor per day (apples 40, bread 24, chests 6 ...) and restocks at dawn, so a player cannot drain the
  city's food in one visit; delivery jobs are only generated for goods with stock >= 8.

## Food

Hunger follows the Minecraft rules in `player.js`: 0.01 exhaustion per block walked, 0.1 per block sprinted, 0.05 per
jump, 6 per heart regenerated; 4 exhaustion costs one saturation/food point. Food value per credit: apple 6.4 points
for 4 cr (0.63 cr/point), bread 11 for 8 (0.73), steak 20.8 for 16 (0.77), cooked chicken 13.2 for 12 (0.91).

| Day (12 real minutes) | Points burnt | Cheapest food | Cost |
|---|---|---|---|
| Idle / building near home | 3-6 | 1 apple | 4 cr |
| Walking everywhere (~2,200 blocks) | 6-8 | 1-2 apples | 4-8 cr |
| Courier sprinting everywhere (~2,200 blocks) | 50-60 | 9 apples or 3 steaks | 36-48 cr |
| Same, buying in the undercity | 50-60 | 9 apples | 27 cr |

Rule of thumb: a working courier spends about 35 cr a day on food plus 60 cr a night on a room, i.e. 95 cr a day, which
one courier run covers. Ten minutes of play earns a meal several times over.

## Jobs: earnings per minute

Payout formulas (`src/economy/jobs.js`, checked by `scripts/test-economy.mjs`):

- Courier: 30 + 90 x sqrt((distance - 100) / 500), clamped to 30-120 cr for 100-600 blocks. The curve is concave so
  the typical 250-400 block run pays 90-105 cr; the ends of the rubric range hold (30 at 100 blocks, 120 at 600).
- Delivery: buy 2-8 items worth 60-240 cr at a named vendor 80-400 blocks away, hand them in at the terminal, paid
  cost + 40%. Needs capital (the 250 starting credits cover any order).
- Ship repair: 40 cr per part, 3-5 parts, a -40..0 jitter, clamped 80-200. Only at customs and depot terminals.
- Cleanup: 5 cr per scorched / ash / charred block, 4-8 blocks within 64 of the terminal - only after a disaster.
- Harvest: 8 cr per wheat or 18 per raw meat plus 15, for 6-12 wheat or 3-6 meat delivered to a named kitchen.
  Bought wheat (3 cr) still leaves 5 cr per unit; farmed wheat is all profit and beats selling it to a grocer (1 cr).

Measured by the simulation (average over a run to 4,000 cr; the minutes include walking to the next board):

| Job | Avg reward | Avg profit | Minutes | cr / min | Notes |
|---|---|---|---|---|---|
| Courier, air taxi to the door | 100 | 85 | 1.2 | 70 | 15 cr fare; the best loop |
| Courier, on foot | 87 | 87 | 2.2 | 40 | |
| Ship repair | 155-160 | 155 | 2.2-2.5 | 60-70 | needs a customs / depot board |
| Harvest (buying the wheat) | 90-100 | 45-70 | 1.8-3.0 | 22-26 | free if farmed |
| Delivery | 127 | 21 | 2.8 | 8 | variety job; profit is the 40% margin |
| Cleanup | 20-40 | 20-40 | ~2 | 10-20 | disaster-dependent |

The air taxi lists the active job's next stop as a destination (`economy.destinations()`), which is what makes the
courier loop efficient: accept, walk to the nearest taxi stand, ride to the door, collect, walk to the nearest
terminal. Boards are deterministic per (seed, day, terminal) and refresh daily, 17 terminals x 3-6 jobs gives about
75 jobs a day, one active at a time, each expiring a day after it is accepted.

## Time to the first ship (4,000 cr light speeder)

| Play style | Real minutes | Game days | Net rate |
|---|---|---|---|
| Mixed jobs, air taxi for courier runs | 64 | 5.4 | 56 cr/min after food |
| Mixed jobs on foot (no taxi) | 95 | 7.9 | 36 cr/min |
| Courier runs only, on foot | ~110 | ~9 | 30 cr/min |

The target band (45-70 minutes of jobs) is met by the intended loop and missed by a player who never takes a taxi or
only runs couriers; that is deliberate - the taxi and the repair jobs are the "learn the city" reward. Beyond the
speeder: shuttle (14,000) about 4 hours, light freighter (32,000) about 9, star yacht (60,000) about 17 hours at the
mixed rate; trade-ins return 60% of the old ship.

## Other income and sinks

- Selling to vendors that trade the category: a stack of 64 wheat is 64 cr at a grocer (one courier run); a cow is
  4-12 cr of beef plus 4 cr of leather; iron ore 6, gold ore 18 at a bank, jeweler, foundry or depot; hides at a butcher, tailor or armourer. Hunting and farming are
  a supplement, not a replacement for jobs.
- Sinks: rent 60 a night (the sleep skips to 06:00 and prepays the next night), bacta 20, taxi 15, building materials
  for a home (a bed, chest, door and 64 planks are about 240 cr), and the ships.
- Admin (F4, Developer footer): "Grant 10,000 credits" and "Reset economy" (wallet 250, ships, apartment, stock
  deltas and the active job cleared) for testing.

## Multiplayer

The economy is per client: wallet, owned ships, rented apartment, vendor stock deltas, the active job and the day
counter are saved in the world save (`save.economy`) and never sent over the wire. Two players on one server see the
same deterministic job boards and prices but keep separate wallets and stock ledgers; nothing they buy or sell affects
each other.
