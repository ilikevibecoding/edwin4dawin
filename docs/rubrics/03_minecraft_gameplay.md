# Rubric 3 — Minecraft-faithful movement and interaction

Goal: the basics must behave exactly like Minecraft: you can jump onto the next block, open doors and chests, eat when
hungry, fight/harvest for food, and store things. "One-on-one" means a Minecraft player should not notice a difference
in these systems.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Jumping: a Space tap reaches 1.25 blocks; walking into a 1-block ledge mounts it (auto-jump, Bedrock-style) without hopping in place; double-tap flight never triggers while bunny-hopping up steps (second tap must be airborne) | Per-tick input tests (ledge mount in ≤ 1 hop) ✔ fixed |
| 2 | Doors: right-click toggles open/closed (2-block door, hinge side preserved, collision follows the state, NPC pathfinding treats closed doors as passable-for-them by opening); trapdoors/fence gates optional | Toggle test + collision test |
| 3 | Chests: right-click opens a 27-slot inventory UI (Minecraft layout: chest grid above the player inventory + hotbar), drag/drop, shift-click quick move, stack splitting, double chests optional; contents persist in the save and survive reload; chest breaking drops contents | UI test + reload test |
| 4 | Items beyond blocks: an item registry with procedural pixel icons: apple, bread, wheat, raw/cooked beef, pork, chicken, seeds, bone, leather, sticks, planks-as-items; hotbar/inventory render item icons; item stacks max 64 | Icon sheet screenshot |
| 5 | Food: hunger drains as today; holding right-click with food eats it in 1.6 s (chewing animation + sound), restoring hunger/saturation per Minecraft values; eating is not possible at full hunger; starvation stops at 1 HP (as Minecraft normal difficulty) | Eat test with HUD readout |
| 6 | Food sources: animals have health and drop meat/leather/feathers when killed (left-click damage with knockback, hurt flash, death animation); wheat in the ranch field can be harvested (drops wheat + seeds) and replanted on farmland; oak leaves drop apples occasionally when broken; a furnace-less "campfire cooking" or a crafting recipe turns raw meat into cooked | Hunt + harvest test |
| 7 | Crafting (may land after 2–6): a 2×2 inventory crafting grid and a 3×3 crafting table with a recipe list covering planks, sticks, crafting table, chest, doors, bread (3 wheat), torches | Recipe test |
| 8 | Block placement rules already Minecraft-like stay intact; sneaking edge protection, swimming, ladders (add if missing), fall damage unchanged | Regression test |
| 9 | Save: inventory, chest contents, door states, player position/health/hunger persist per world seed | Reload test |
| 10 | Multiplayer: chest/door state changes replicate through the server as block-entity edits; two clients see the same chest contents | mp-test extension |

## Design notes

- Introduce `blockEntities` in `World` (map posKey → {type, data}) with journaling for disasters and save/network support.
- Door state = separate block ids (open/closed × hinge) or a state byte; collision boxes depend on state; NPCs open doors on approach and close behind (optional).
- Item ids share the inventory `id` space with blocks (ids ≥ 1000 are items); `items.js` gets `ITEMS` definitions with `food` values, icons drawn into a second atlas page.
- Eating: player state `eating` with a progress timer; HUD shows the item; Minecraft values: apple 4/2.4, bread 5/6, cooked beef 8/12.8, cooked porkchop 8/12.8, cooked chicken 6/7.2, raw beef 3/1.8.
- Animals: `health` per species (cow 10, pig 10, chicken 4, horse 15), knockback impulse, red flash, drops via `drops.spawn`.
