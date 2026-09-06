# Rubric 8 — Economy: Republic credits, work, trade, ships

Goal: money exists, is earned by doing things in the world, and buys things worth having — food, tools, a room, a
ship. Prices and payouts are balanced so ten minutes of play earns a meal and an hour earns a starter ship.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Wallet: `player.credits` (integer, Republic credits ₡), shown on the HUD next to the hotbar with a credit-chip icon; persisted in the save; starts at 250 | Reload test |
| 2 | Vendors: every `sells`-bearing purpose (caf, diner, cantina, market stall, general store, pharmacy, speeder/ship dealer, droid parts, tailor) has a vendor NPC at a counter; right-click opens a Minecraft-styled shop screen: goods grid with icons, price, stock; buy with left-click, sell your items from the bottom inventory (vendor buys only categories it trades) | CDP buy/sell test; stock restocks daily |
| 3 | Price book: `src/economy/prices.js` with base prices (apple 4, bread 8, cooked meat 12-18, seeds 1, planks 2, torch 3, wool 6, chest 40, door 25, speeder ride 15, apartment night 60, ships 4,000-60,000) and per-district multipliers (undercity 0.8, senate district 1.4); sell price = 45% of buy | Unit test on the book |
| 4 | Earning — jobs board: at every transport hub and cantina a job terminal (holo console) lists 3-6 procedurally generated jobs: courier (carry a package from A to B, 30-120 ₡ by distance), delivery (buy N items at a vendor and bring them, pays cost + 40%), ship repair (right-click 3-5 marked damaged parts on a docked ship with a tool, 80-200 ₡), cleanup (break N marked debris blocks after a disaster, 5 ₡ each), harvest (bring wheat/meat to a kitchen) | Complete each job type in a CDP test; payout matches the book |
| 5 | Earning — selling: harvested wheat, meat, leather, feathers, mined ores sell at vendors that trade them | Sell test |
| 6 | Spending — housing: rent an apartment (bed you can sleep in, chest that persists) for 60 ₡/night in a residential tower; the door sign shows "Your apartment" | Rent + sleep test |
| 7 | Spending — ships: the spaceport ship dealer sells 4 ship classes (light speeder 4,000, shuttle 14,000, freighter 32,000, yacht 60,000); a purchased ship is parked on your pad, boardable (rubric 09), listed in the wallet screen; only one owned at first | Purchase test with credits granted by the admin panel |
| 8 | Admin: the F4 panel has "Grant 10,000 ₡" and "Reset economy"; survival mode only — creative mode shows prices but never charges | Panel test |
| 9 | Save/multiplayer: wallet, owned ships, rented apartment and vendor stock deltas persist per world; multiplayer keeps economy per client (documented) | Reload test |
| 10 | Balance table documented: expected earnings per job per minute, cost of a day's food, time-to-first-ship (target 45-70 min of jobs) | `docs/economy_balance.md` |

## Design notes

- Jobs are generated deterministically from `(seed, day, terminal)` so all clients see the same board; progress is
  per player. A job has `{ id, kind, from, to, items, reward, expiresAt }`; the HUD shows the active job under the
  hotbar with a compass arrow to the target.
- Purpose catalogue entries carry `sells: [{ item, price, stock }]`; the vendor NPC is the `role` `vendor` of the
  purpose and stands at the counter spot.
- Ship ownership hooks into rubric 09's `ShipVehicle`: an owned ship is a `ShipVehicle` parked at the player's pad
  with `owner = playerId`; flying it is the "later" project (route picker from pad to pad first).
