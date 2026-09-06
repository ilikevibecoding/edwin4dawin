# CORUSCANT: COMPLETE CITY, INTERIOR, SHIP, NPC, AND ECONOMY OVERHAUL

(User brief, received Sunday Sep 6, 2026. This is the governing specification for round 6; `docs/ROUND6_PLAN.md`
and rubrics 07-13 are the workstream contracts that implement it. The requirement-to-implementation-to-test matrix
is `docs/overhaul/matrix.md`.)

Work inside the **EXISTING project**. This is a follow-up implementation assignment, not a request for a new prototype, a concept document, or another empty city.

We already have a visually promising Minecraft-like Coruscant skeleton. Its weaknesses are repeated rooms, shallow interiors, buildings without convincing purposes, an ugly orange/lava-like sea, thin-looking spacecraft that cannot be entered, underdeveloped spaceports, and an unimpressive Senate. Preserve the successful city layout, recognizable landmarks, working controls, and existing functionality while comprehensively rebuilding the weak parts.

The intended result is a dense, coherent, explorable Star Wars city where I can follow a person, a shipment, a political decision, or a maintenance problem through multiple buildings and discover that the connections actually exist.

**Do the implementation.** Inspect the actual project before choosing techniques. Do not assume its engine, file organization, rendering pipeline, or existing capabilities. Do not replace the project with a smaller demonstration. Work through complete, testable passes, then extend the standard throughout the existing playable city.

## 1. Setting and nonnegotiable design direction

Default to late-Republic/Clone Wars-era Coruscant, before Order 66, so an active Jedi Order and functioning Republic Senate belong together. Preserve a deliberately established alternate timeline if the project already has one; otherwise remove accidental era mixing. Later-era reference images may inform architecture and lighting without importing their political situation or characters.

Retain the project's block-built identity. Improve silhouettes, proportions, depth, material language, lighting, and purposeful detail instead of abandoning the style for unrelated photorealistic assets. Translate curves into intentional stepped geometry. Use finer detail where the existing engine supports it, with one coherent scale language.

Build three readable scales: monumental silhouettes from far away, architectural structure at street distance, and believable objects and wear at arm's length. Detail must explain use: abrasion where cargo slides, repairs around access panels, queues at popular counters, cleaner government floors, patched utility walls. Random pipes and colored blocks do not count as meaningful detail.

Give districts different sounds, social behavior, wealth, circulation, and lighting. Monumental civic spaces need breathing room. Working districts need clutter organized around work. The undercity needs depth and legibility, not darkness that conceals unfinished geometry.

Do not make every surface glossy, every corridor neon, every inhabitant a criminal, or every interesting room a secret laboratory. Ordinary life, beauty, humor, care, bureaucracy, and entertainment matter as much as danger.

## 2. Inspect, inventory, and freeze the real scope

Before altering the city, inspect the runtime and source. Identify the orange surface's actual mesh/material/generator and any gameplay dependencies. Record the current movement, interaction, collision, save/load, NPC, economy, vehicle, lighting, and audio systems.

Create a stable-ID manifest of every existing reachable building, accessible room, landed spacecraft, spaceport, named/interactable NPC, and landmark. Record coordinates, entrances, current problems, dependencies, intended role, and implementation status. Count what actually exists; do not invent completion percentages.

Distinguish playable structures from genuinely distant skyline scenery at baseline. **Do not reclassify existing playable buildings as scenery, remove weak NPCs, close existing interiors, or hide problem districts to make the completion numbers improve.** Skyline scenery may use simplified geometry; player-reachable buildings require believable entrances and purposeful interiors.

Capture at least 24 baseline views across the Senate, spaceports, ordinary streets, interiors, ships, upper city, and undercity. Save camera positions, resolution, time, world state, and seed. Also record normal walking routes and actual frame-time measurements where available.

Preserve saves and authored world edits through explicit migrations. Keep a recoverable checkpoint before destructive changes. Produce a requirement-to-implementation-to-test matrix so no major request disappears during execution.

## 3. Reference library: study specific things

Use the official references below. Open their images, galleries, and available clips; do not merely read titles. Record what you actually inspected. Do not claim to have watched inaccessible footage. For each building family, major ship family, and landmark, associate references for silhouette, interior/spatial organization, and material/atmosphere where available. When an exact interior is not documented, label your layout as an original game design.

**Planetary scale and city organization:** Coruscant Databank (https://www.starwars.com/databank/coruscant), Inside Intel: Coruscant (https://www.starwars.com/news/star-wars-inside-intel-coruscant), and Coruscant History Gallery (https://www.starwars.com/coruscant-history-gallery). Study layered city depth, skyline variety, traffic threading between buildings, and the relationship between civic monuments and ordinary neighborhoods. Do not use one futuristic tower as the template for the entire city.

**Senate and government:** Galactic Senate (https://www.starwars.com/databank/galactic-senate), Senate District (https://www.starwars.com/databank/senate-district), Senate Guard (https://www.starwars.com/databank/senate-guard), and The Clone Conspiracy concept-art gallery (https://www.starwars.com/the-clone-conspiracy-concept-art-gallery). Study the rotunda's curved walls and delegation platforms, monumental approaches, controlled circulation, and civic architectural mass. The *Bad Batch* material is a later-era visual reference, not this project's timeline.

**Jedi spaces:** Jedi Temple (https://www.starwars.com/databank/jedi-temple), Jedi Archives Tour (https://www.starwars.com/video/jedi-archives-tour), and Jedi Temple Guard (https://www.starwars.com/databank/jedi-temple-guard). Preserve the Temple's five-spire identity. Distinguish learning, contemplation, administration, training, and restricted archives. Do not turn the Temple into another nightclub or a generic military barracks.

**Undercity and working life:** Level 1313 (https://www.starwars.com/databank/level-1313), Coruscant Underworld Police (https://www.starwars.com/databank/coruscant-underworld-police), and Gone with a Trace episode guide and galleries (https://www.starwars.com/series/clone-wars/gone-with-a-trace-episode-guide). Study layered pedestrian routes, repair spaces, overhead infrastructure, occupied industrial architecture, and the contrast between public movement and back-of-house activity.

**Food, leisure, and cultural identity:** Dex's Diner (https://www.starwars.com/databank/dexs-diner) and Galaxies Opera House (https://www.starwars.com/databank/galaxies-opera-house). Use these as contrasting references for ordinary social life and elite entertainment. They must produce radically different circulation, furniture, acoustics, staff routines, and social encounters.

**Docks and spacecraft:** Coruscant Docks Pursuit (https://www.starwars.com/video/coruscant-docks-pursuit), AA-9 Coruscant freighter (https://www.starwars.com/databank/aa-9-coruscant-freighter), Twilight (https://www.starwars.com/databank/twilight), Republic Cruiser (https://www.starwars.com/databank/republic-cruiser), Republic Attack Shuttle (https://www.starwars.com/databank/republic-attack-shuttle), Republic Attack Gunship (https://www.starwars.com/databank/republic-attack-gunship), and Coruscant Air Taxi (https://www.starwars.com/databank/coruscant-air-taxi). Study volumetric hulls, engine assemblies, landing configurations, cargo handling, boarding, and distinct transport purposes. Do not flatten recognizable craft into decorative silhouettes.

**Institutions and organized crime:** Coruscant Guard (https://www.starwars.com/databank/coruscant-guard), Black Sun (https://www.starwars.com/databank/black-sun), and Pyke Syndicate (https://www.starwars.com/databank/pyke-syndicate). Use the sources to distinguish institutions and broad faction identity. The local branches, named operatives, businesses, and conflicts proposed below are original scenario content, not claims about established canon.

**Clinical equipment:** Bacta Tank (https://www.starwars.com/databank/bacta-tank). Translate its visual and fictional treatment role into a functioning game clinic with staff, supplies, patient flow, and service access.

Create a reference ledger containing source URL, inspected view, three concrete observations, the asset/building informed, and the implemented decisions. Gather at least **30 distinct reference views** across these sources. Research must lead to visible changes; collecting links is not completion. Build project assets rather than embedding screenshots as scenery or relying on remote image hotlinks at runtime.

## 4. Replace the orange sea with a believable lower city

Completely remove the accidental ocean-sized orange/lava appearance, including inappropriate emission, reflections, lighting spill, particles, and any leftover terrain behavior. **Do not simply recolor a flat plane gray.**

Replace it with constructed urban depth: descending building masses, service decks, freight trenches, utility conduits, ventilation wells, bridge supports, maintenance balconies, traffic lanes, occasional enclosed industrial activity, and localized haze. Openings should reveal lower structures through multiple depth layers rather than an obvious bottom plane.

Create at least three playable vertical connections between layers: a public lift, a freight/service route, and an unofficial route. Their entrances and exits must agree spatially. A fall must have a clear consequence and reliable recovery, never an endless void or unavoidable save corruption.

Keep orange light only where it has a local source and purpose, such as a warning beacon or contained industrial furnace. The city's base must read as more city.

## 5. Districts must form a connected urban system

Organize the existing footprint into recognizable districts without unnecessarily bulldozing successful work.

**Civic/Senate:** ceremonial approaches, delegation offices, public petition access, restrained materials, archives, journalists, discreet security, and service circulation beneath the prestige.

**Jedi precinct:** Temple access, training and study spaces, guest reception, dispatch, gardens, maintenance, and diplomatic connections to the Senate. Keep the Temple its own institution.

**Commercial/residential:** food, repairs, apartments, deliveries, clinics, laundries, rooftops, small businesses, neighborhood shortcuts, and residents with routines.

**Spaceport/logistics:** passenger arrivals, cargo processing, customs, repair hangars, freight handling, crew amenities, and distribution into the city.

**Entertainment:** diners, clubs, performance venues, food vendors, late shifts, quieter back rooms, and a visible difference between cheap local entertainment and prestigious culture.

**Undercity/industrial:** salvage, utility maintenance, affordable housing, informal markets, independent repair workers, criminal fronts, and legitimate community organizations.

Each district needs a recognizable arrival, two useful destinations, a transport connection, a quieter place, and a visible dependency on another district. Design walking distances so ordinary play encounters something useful, inhabited, or surprising regularly; do not stretch travel with empty corridors.

## 6. Every building needs a design dossier

Before furnishing a building, define its name/address; owner/operator; primary purpose; district/class; opening hours; staff and residents; customers; suppliers; public/private/service circulation; floor/room graph; material identity; interactions; economic inputs/outputs; local problem; and at least one connection to another location.

Design the exterior and interior together. Windows must correspond to plausible floors. Freight doors must fit their loads. Exhaust must lead somewhere. Stairs and lifts need destinations. Room dimensions must accommodate the player, furniture, doors, and NPC movement simultaneously.

Every room needs an occupant or operational reason, a dominant activity, appropriate equipment, lighting logic, storage/service needs, and an explanation for its connection to neighboring rooms. Not every room needs a quest or secret.

Use player collider dimensions as the scale reference. Test doorway clearance, standing height, turning space, ramps, stairs, and furniture access with actual movement. A beautifully decorated room the player cannot navigate is unfinished.

**Stop repetitive interiors at the design level.** Vary topology, floor height, window placement, public/private relationship, furniture orientation, resident history, work process, and the view outside. Swapping wall colors or rotating the same furniture is not a distinct room.

Detect repetition using normalized room graphs, door/window placement, furniture-role relationships, and circulation - not names, object IDs, colors, or random rotations. Review the closest-matching occupied interiors side by side.

Reusable structural modules are encouraged. Identical occupied room arrangements are not. Standardized apartments can share a shell while showing genuinely different households and adaptations. For every pair of same-family buildings, require at least four meaningful differences, including one spatial and one functional difference.

Large reachable towers need multiple distinct occupied floor programs, not one lobby beneath an implied mountain of identical apartments. Lift menus must list real destinations. Record any intentionally inaccessible structural floors honestly; never imply they are finished playable interiors.

## 7. Required building programs and their completion tests

Apply these programs to existing buildings, combining compatible uses where necessary. Do not create twenty disconnected showcase boxes and leave the rest unchanged. Room counts should follow function and footprint; a kiosk and a hospital must not be forced into the same template.

**Galactic Senate complex.** Include the chamber, public approach, security screening, delegation circulation, several distinct delegation suites, committee/hearing rooms, petition office, press gallery, records area, diplomatic reception, staff services, and maintenance access. Test a complete visitor route and a separate staff/service route. See the dedicated Senate specification below.

**Delegation office building.** Give different delegations genuinely different reception, meeting, research, staff, and private areas. Include visiting constituents and a clerk who handles actual appointments or records. A player should identify whose office they entered without reading the map.

**Jedi Temple or substantial Temple precinct.** Include a reception threshold, training hall, archive access, meditation space, briefing room, healer's room, simple living/service quarters, garden, and hangar connection. Restrict sensitive areas through real permissions. Implement a training interaction, a research interaction, and a diplomatic or investigative assignment.

**Commercial passenger terminal.** Include arrivals, departures, a staffed ticket/charter counter, baggage handling, waiting areas, information, refreshments, sanitation, customs where appropriate, and actual boarding connections. Buy a ticket, reach the correct craft, board, travel, and arrive at the advertised destination.

**Cargo terminal and warehouse.** Include manifest processing, inspection, bonded storage, ordinary storage, sorting, loading access, dispatch, and staff facilities. Separate people from freight paths. A labeled shipment must be traceable from ship to storage to its final recipient.

**Ship repair hangar.** Include a correctly scaled work bay, part storage, tool stations, diagnostics, hoist/service access, crew office, and crew break area. A repair must consume a relevant part, change a fault state, alter the craft's appearance or behavior, and produce an invoice/payment event.

**Droid workshop.** Include intake, diagnosis, disassembly/repair, parts sorting, testing, charging, and pickup. Show differences between active work and idle machines. A repaired droid must leave or resume a real job instead of remaining a prop forever.

**Neighborhood diner.** Include dining/counter seating, a working kitchen, ingredient storage, washing, deliveries, staff belongings, and an owner with local knowledge. Staff take orders, prepare/serve, clear, and restock. Shortages should alter a menu item, not just a notification.

**Cantina or club.** Include a distinct entrance, serving area, seating with sightline variety, performance/music source, service storage, staff space, and at least one private conversation area. Patrons arrive, socialize, order, and leave. A back room may have faction relevance, but do not make every venue a gang headquarters.

**Opera/performance venue.** Include foyer, ticket desk, auditorium, differentiated public/private seating, backstage, dressing rooms, technical access, and a functioning performance schedule. Buying admission must change access. Staff preparation and cleanup should bracket the event.

**Market arcade.** Create genuinely different vendors: food, parts, textiles, domestic equipment, navigation/data services, and salvage. Match displays to stock. Include deliveries, bargaining or fixed-price identity, shared circulation, and different closing routines. Six identical stalls with renamed sellers fail.

**Clinic.** Include reception/triage, examination, treatment, recovery, medical storage, staff station, sanitation, and emergency access. Staff behavior, patient occupancy, and supplies must support a visible treatment loop. Keep treatment fictional and game-oriented, not real-world medical instruction.

**Worker apartment building.** Include household variation, shared circulation, utilities, mail/deliveries, communal services, and a roof or courtyard where appropriate. Give homes evidence of specific lives: a night-shift worker's blackout panels, a mechanic's half-repaired appliance, a musician's practice corner. Residents actually use these homes.

**Affluent residential building.** Use proportion, privacy, materials, views, art, and service separation rather than merely enlarging the cheap apartment. Include visitor reception, domestic/service spaces, and believable staff access. A resident's social schedule should connect to civic or cultural life.

**Transit interchange.** Include legible destinations, boarding areas, ticket/access mechanisms, service control, waiting, and maintenance. Timetables and vehicles must agree. Provide an understandable alternative when a route is disrupted.

**Security station.** Include public reporting, dispatch, evidence/records, briefing, rest space, equipment storage, and secure holding appropriate to the game. Reports and witnessed incidents must create inspectable case states and responses, not omniscient citywide aggression.

**Utility/reclamation plant.** Include control, intake, processing, distribution, maintenance, storage, and safe walkways. Connect it to named customers. A repair or outage must affect an identifiable downstream service and allow recovery.

**Salvage yard.** Sort material by actual use, with unloading, assessment, disassembly, reusable parts, scrap, and outgoing orders. Avoid random heap generation. Salvage should supply repairs and reclamation through real inventory transfers.

**Criminal-front business.** Give the public operation a credible service and workforce, then layer a concealed illicit activity into compatible back-of-house space. Include access rules, evidence, staff disagreements, and at least two ways to resolve its associated conflict. It must continue to resemble a functioning business.

**Community hall and rooftop garden.** Include a gathering space, mutual-aid storage or shared services, caretakers, a noticeboard, and a tangible neighborhood benefit. Provide peaceful interactions and changing social activity. These places should be worth visiting without combat or loot.

For every building, prove its advertised purpose through normal play. A sign saying "workshop," a vendor menu without inventory, or a room containing a desk is insufficient.

## 8. Make the Senate a true centerpiece

Rebuild its silhouette and approach deliberately. The chamber needs a convincing monumental volume, curved enclosing walls, layered delegation-platform rings, a central speaking focus, suspended depth, disciplined lighting, and strong scale references. Avoid a shallow bowl with a few boxes around its rim.

Use instancing/detail levels for distant platforms, while keeping the player's route and a substantial set of delegations fully physical. Represent distant scale honestly; decorative platforms must not be counted as playable offices or simulated named delegates.

Provide at least **twelve differentiated playable delegation suites or equivalent delegation spaces** distributed through the complex. Give them different policy concerns, visiting constituents, artifacts, staff, and economic connections. Offices must feel staffed rather than museum exhibits.

Stage scheduled sessions with arrivals, a published agenda, speakers, reactions, voting, departure, and post-session conversations. Implement at least three original policy scenarios: cargo inspection priorities, lower-level utility repairs, and transit support. Each must have visible consequences in affected districts.

The player may gather evidence, assist constituents, obtain access, and influence a limited decision through understandable conditions. Do not make one conversation magically control the entire Republic. Show which votes are individually simulated and which are aggregated so the tally remains coherent.

Give Jedi present at the Senate specific reasons to be there: a diplomatic briefing, mediation, an investigation, or an escort. Give them scheduled arrivals and departures and appropriate access. They must not stand permanently beside random doors as generic guards.

Build a memorable approach-to-chamber reveal and a second, less glamorous service route. Both must function. Test evacuation, access denial, moving platforms, occupied seating, and leaving midway through a session without breaking the state machine.

## 9. Spaceports must operate; ships must have volume

Overhaul every existing port. Differentiate a public/commercial hub, a diplomatic/security facility, and an undercity freight/repair operation where the map supports them. They should differ in geometry, procedures, traffic, crews, cleanliness, and clientele.

Add control facilities, credible landing clearances, gate identifiers, fuel/service equipment, docking access, cargo machinery, crew circulation, and emergency routes. Equipment should serve the actual craft using that bay. Avoid enormous empty pads with tiny decorative ships.

Build at least six meaningfully different vehicle families across the world: bulk freight, light freighter, passenger shuttle, diplomatic transport, security/troop transport, and local taxi/courier. Paint variations do not count as families.

For every player-reachable landed ship, fix front/side/top proportions, hull depth, underside, cockpit scale, engines, landing support, and boarding configuration. A ship must look substantial from ground level, not just from one overhead camera.

Design interiors within the exterior envelope. A medium/large freighter needs a connected cockpit, access route, cargo space, service machinery, and appropriate crew facilities. A passenger shuttle needs boarding and usable seating. A compact fighter or taxi needs a functional cockpit/seat entry, not an impossible walkable lounge.

**Every reachable medium/large landed craft must be enterable when access is permitted.** Locked craft need a real access condition and a real interior behind it. No fake door to nowhere. Purely distant airborne scenery can remain nonboardable, but it cannot stand in for the promised explorable fleet.

Make at least one complete route playable: approach ship, open ramp, board, move inside, use a meaningful interior interaction, travel or participate in its existing supported transport system, arrive, and disembark. Extend this boarding/access standard across applicable craft. Do not introduce full orbital flight at the expense of finishing city interiors.

Implement a port cycle:

**Reservation -> approach -> landing/docking -> safe shutdown -> doors/ramp -> passengers/cargo -> servicing -> closure -> departure.**

Interlocks must prevent walking through closed doors or a ship departing with an invalid player state. Passenger position must remain stable relative to moving craft.

Visible cargo and passenger activity must match simulation events. If offscreen traffic is aggregated, reconcile its logical inventory and schedule before materializing it near the player. Never visibly teleport cargo or people to fake the cycle.

## 10. A small but real city economy

Create a readable local economy, not a spreadsheet masquerading as gameplay. All prices and organizations introduced here are original balancing choices, not canonical economic facts.

Start with a manageable goods catalog: staple ingredients, prepared food, clean water, fuel/energy supplies, standard machine parts, electronic components, medical supplies, textiles/domestic goods, reusable salvage, and waste. Add specialized goods only when a building or mission actually uses them.

Give participating businesses inventory, capacity, suppliers, customers, opening hours, service capability, cash/budget state, and reorder rules. Model household demand in understandable batches rather than simulating every meal of an entire planet.

Implement these linked chains: imported ingredients -> warehouse -> diner/market -> residents; parts -> workshop -> ship/droid repair -> port capacity; medical supplies -> terminal -> clinic -> patients; salvage -> reclamation -> usable components -> maintenance; and public funds -> utility/transit work -> improved service.

Treat each transaction as an atomic transfer. Check stock, reserved inventory, funds, capacity, and permissions; update both sides exactly once. Repeated interaction, interrupted animation, loading a save, and simultaneous customers must not duplicate items or credits.

A simple starting price rule is sufficient: asking price equals base price multiplied by a clamped factor derived from available stock relative to target stock, plus a bounded disruption modifier. Use a configurable 0.75-1.75 multiplier range initially. Distinguish sell and buy quotes, include stock/funds limits, and test repeatable arbitrage loops. Document the rule instead of concealing random prices behind economic terminology.

Track economic sources and sinks honestly: offworld imports/exports, public allocations, service payments, consumed goods, wages, maintenance, and disposal. Do not claim a closed economy while silently spawning stock or currency. Stabilize essential services through explicit restocking/public support rules so one mistake cannot permanently destroy the city.

Starting balance targets: a basic meal around 10 credits; a local ride around 5-15; a useful small component around 25; a short delivery around 60-150. Tune from playtests, not canon. The first fifteen minutes should permit earning money, buying something useful, traveling, and seeing a consequence without grinding.

Money should unlock repaired equipment, transport, lodging, information, workspace, and relationships. Avoid mandatory hunger, rent timers, or survival chores unless already central to the game. Material consequences should create opportunities, not trap the player in accounting.

Make economic state visible: shelves change, a cook alters the menu, a mechanic waits for a component, a freighter remains docked, a noticeboard shows a delayed route. Pair numerical changes with spatial and behavioral evidence.

## 11. NPCs are persistent people with jobs

Every real NPC - vendors, residents, pilots, guards, workers, officials, and Jedi - needs a stable identity, role, home/base, workplace, schedule, current task, relevant needs, relationships, knowledge limits, disposition, and persistent interaction history. Distant crowd impostors may provide scale, but cannot replace these characters or count toward their completion.

Build explicit behavior states such as commuting, working, serving, eating, resting, conversing, investigating, waiting for resources, fleeing, and recovering. Only apply states appropriate to that character. Resolve conflicts: a person cannot simultaneously serve a customer, sleep at home, and attend the Senate.

Ground work in actual stations and objects. Cooks use kitchens; dockworkers handle shipments; mechanics inspect and repair; clerks process requests; guards respond to assigned incidents; residents visit services they need. Offscreen simulation may be simplified, but positions and consequences must reconcile when observed.

Use believable navigation, door use, queues, obstacle recovery, and animation alignment. Do not teleport a watched NPC or let a worker perform an animation through a wall. Provide task fallback when equipment, a route, or a supplier becomes unavailable.

Give relationships practical effects. A mechanic recommends a supplier; a clerk recognizes a returning courier; a diner owner worries about a missing regular; a guard remembers a resolved incident. Knowledge must come from perception, conversation, records, or a defined broadcast, not universal telepathy.

Create varied silhouettes and appropriate human, alien, and droid inhabitants without assigning morality solely by species. Social class should emerge through work, surroundings, resources, and individual attitudes.

## 12. At least thirty distinct voice lines per NPC

Every persistent NPC described above needs at least **thirty meaningfully distinct authored lines**, not thirty name-swapped templates. Use this minimum distribution: five greeting/recognition lines; six work/service lines; five personal or neighborhood lines; five current-event/world-state reactions; four trust/faction/access responses; three task/quest responses; and two interruption/farewell lines. Add more where the role warrants it.

Each line needs a stable ID, speaker, text, delivery/emotion, trigger conditions, priority, cooldown, relevant state references, and audio routing. All thirty must be reachable through legitimate scenarios; unreachable strings do not count.

NPCs must not announce fictional shortages, completed repairs, or political results unless the underlying state supports the claim. Personal knowledge and rumor may be imperfect, but mark rumor as rumor in the character's delivery and data.

Filter by eligibility before selecting a line. Track recently heard lines, avoid immediate repetition, vary conversations over time, and use shared local audio budgets so a market does not become twenty simultaneous monologues. Important conversations should temporarily suppress nearby incidental speech.

Write original dialogue with personality and job-specific vocabulary. Examples of desired specificity: a mechanic says, "That coupling fits the loader, not your ship"; a clerk says, "Your petition is filed. The hearing is tomorrow"; a resident says, "The lift's working again. My mother finally went upstairs." Such lines require matching circumstances. Do not copy film scripts or fill the bank with catchphrases.

Voice lines should actually be audible through an available, authorized speech/audio pipeline, with subtitles and separate dialogue-volume controls. Use original fictional-character voices. **Do not label text-only dialogue as fully voiced.** If audio generation or playback is unavailable, implement and test the dialogue system with an explicitly identified unvoiced fallback, retain the audio manifest, and report that specific completion blocker.

## 13. An interconnected starting cast

Create original characters with enough specificity to carry the systems. These examples define desired interconnections; adapt names to existing project characters rather than duplicating people unnecessarily.

**Vela Marr, dockmaster:** runs the commercial port; needs inspections to stop blocking legitimate cargo; clashes with a customs supervisor and trusts one veteran pilot.

**Brin Tal, freighter captain:** owns a battered working ship; owes a repair bill; can carry clinic supplies or accept a more profitable questionable charter.

**Tessa Venn, mechanic:** runs a repair hangar; depends on a components vendor; teaches practical repairs and recognizes parts diverted from city infrastructure.

**D4-LT, repair droid:** works at the utility plant; knows the maintenance topology; requests help because its authorization no longer covers a failing circuit.

**Seli Noor, diner owner:** buys ingredients from the market; feeds night-shift workers; notices missing people and delayed deliveries before officials do.

**Dr. Nera Vos, clinic operator:** needs reliable supplies; treats residents regardless of faction; can explain the local effects of customs policy.

**Ilen Rook, Senate clerk:** processes petitions and hearing schedules; follows procedure but can connect genuine evidence to the right committee.

**Senator Asha Merin, original delegation leader:** supports an infrastructure proposal; must balance constituent need, budget limits, and competing votes.

**Jedi Knight Seran Vale, liaison:** moves between Temple and Senate; handles mediation and investigates a specific disruption rather than policing everything.

**Tavi Renn, neighborhood courier:** uses transit and service routes; has family in the worker apartments; introduces ordinary cross-district jobs.

**Koro Den, salvage cooperative organizer:** supplies legitimate reclaimed parts; disputes access with a local gang; wants repairable equipment kept in circulation.

**Mira Sol, community caretaker:** manages the shared garden and noticeboard; connects several residents; provides peaceful stories and visible neighborhood improvement.

**Ral Drenn, criminal-front manager:** operates a real freight brokerage while diverting selected cargo; maintains respectable clients and is vulnerable to records, testimony, or a negotiated alternative.

Add staff, residents, officials, entertainers, customers, and rivals around these anchors. Every additional actual NPC inherits the schedule, purpose, and thirty-line requirements. Do not use a large headcount to substitute for depth.

## 14. Factions and conflict should grow out of the city

Differentiate the Republic's civic administration, Senate Guard, Coruscant Guard, underworld police, Jedi, businesses, residents, and neighborhood organizations. Do not merge them into one omniscient "good faction." Give each jurisdiction, priorities, limitations, and relationships.

Use an original Black Sun-linked local commercial front and a Pyke-linked smuggling contact as optional criminal layers. Their existence and local details are game inventions informed by the broad references, not assertions of canonical addresses or personnel.

Add two original local groups with distinct motives: a freight-level gang that pressures delivery routes, and an independent salvage cooperative that resists exploitation. The cooperative is not secretly evil just because it operates below the skyline. Include internal disagreements and opportunities for cooperation.

Track reputation separately from immediate suspicion and active warrants. A witnessed theft, a completed favor, a leaked document, and a resolved dispute should have different effects. Information spreads through defined reports and communication, with limited scope and delay.

Give conflicts multiple supported approaches: lawful work, negotiation, evidence, alternative suppliers/routes, discretion, and combat only where existing mechanics support it. Avoid making repetitive fights the only way to engage with city systems.

## 15. Build surprises with causes and aftermaths

Implement at least eight of the following as discoverable, stateful experiences integrated into existing locations, not isolated scripted screenshots.

A detained medical shipment connects a freighter, warehouse, clinic, clerk, and Senate hearing; resolution changes shelves, treatment availability, dialogue, and later inspections.

A worker shares a maintenance shortcut that becomes a genuine navigation route through buildings the player already knows.

A repaired service droid returns to its assigned job; on a later visit, that area is visibly functioning better and the droid recognizes the player.

A scheduled power diversion darkens a specific market, triggers backup lighting, changes shop behavior, and leads to a plant-level repair or allocation decision. Essential routes remain recoverable.

A departing passenger turns out to be someone previously met at the diner; their travel has a real destination and affects another NPC's routine.

A small rooftop performance attracts residents after their shifts, with setup, arrival, music, audience behavior, and cleanup. It can happen without the player accepting a quest.

A confiscated cargo record contradicts a public shipping notice; checking the physical containers and talking to workers opens several resolutions.

A quiet garden gradually improves through delivered materials and volunteer labor, becoming a social destination rather than merely a collectible reward.

A freighter's cargo hold changes between visits because it completed different jobs. Its crew comments on the actual latest route.

A Senate vote is heard in the chamber, then reported on neighborhood screens, then discussed differently by a mechanic, a resident, and a port official as its effects arrive.

A public lift repair lets an isolated resident resume a normal routine, creating a small emotional payoff without a grand heroic cutscene.

An apparently incidental cleaning or delivery route reveals an overlooked service entrance, but only because the building's circulation genuinely connects.

For each experience define preconditions, participants, locations, state transitions, alternative outcomes, persistence, and recovery from interruption. Give the world quiet intervals; do not fire every event simultaneously on spawn.

## 16. Presentation, interaction, and performance

Use district-specific ambience, localized machinery, spatial dialogue, footsteps appropriate to surfaces, interior/exterior sound transitions, and restrained music. Sound must come from plausible places. Give a ship interior, crowded diner, Temple room, and cargo trench different acoustic identities.

Use readable interaction affordances and one consistent control scheme. Clearly distinguish open, locked, restricted, busy, and unavailable states. Provide understandable prices, destinations, quest consequences, subtitles, volume settings, and reduced flashing/shake options. Essential directions must be readable even when environmental signage uses Aurebesh-inspired styling.

Preserve existing traversal, camera, save/load, and any working multiplayer. If multiplayer exists, make shared transactions and world events authoritative and idempotent; never assume a single-player fix is safe for shared state.

Use the actual engine's suitable mechanisms for batching, instancing, spatial indexing, streaming, material reuse, light budgets, NPC update tiers, and distant simulation. Do not add arbitrary dependencies before inspecting the stack. Keep editable buildings, dialogue, schedules, goods, and encounters data-driven with validation and stable references.

Declare the test machine, browser/runtime, resolution, settings, and population. Target a stable 60 FPS at 1080p on the declared desktop target where feasible, and report median and tail frame times. A renderer without accessible GPU measurements must report that limitation instead of inventing results.

Do not improve benchmark numbers by silently shrinking draw distance, removing NPCs, lowering resolution, closing interiors, or changing the test route. Compare like with like. Quality presets may be explicit player options, not hidden evaluation shortcuts.

## 17. Building rubric: score evidence, not confidence

Score **EVERY manifested playable building**. Use the same frozen weights throughout. Rate each category 0-5:

**0** absent/broken; **1** placeholder; **2** recognizable but shallow; **3** coherent and functional; **4** detailed and robust; **5** distinctive, polished, and verified under varied conditions.

Weighted score = sum of weight x rating/5.

| Category | Weight | Required evidence |
|---|---:|---|
| Identity and exterior architecture | 12 | Recognizable function/district, purposeful silhouette, depth, coherent scale; verified from several normal viewpoints. |
| Floor plan and room purpose | 18 | Connected public/private/service graph; every room has a reason; no copied occupied layout disguised by colors. |
| Interior specificity and materials | 12 | Function-specific equipment, believable storage/wear, household/workplace identity, reference-informed visual decisions. |
| Working interactions | 10 | Advertised services and important props change real state and survive interruption/reload. |
| NPC purpose and behavior | 12 | Correct staff/residents, schedules, work stations, navigation, relationships, thirty eligible unique lines per NPC. |
| Economic and city integration | 10 | At least one appropriate dependency, resource/service flow, and observable external consequence; no fake transactions. |
| Story and discoverability | 8 | Distinct local situation and details that can be understood through play without compulsory exposition. |
| Lighting and sound | 8 | Purposeful lighting, readable spaces, plausible sound sources, appropriate district/interior character. |
| Access and navigation | 6 | Working entrances, doors, stairs/lifts, camera clearance, clear permissions, no trapped player or inaccessible required room. |
| Technical integrity | 4 | Stable identifiers, clean runtime, valid saves, bounded resource use, reproducible evidence. |

Ordinary buildings require at least **85/100**, no category below **3/5**, and at least **4/5** in room purpose, interactions, and NPC behavior. The Senate, major ports, Jedi precinct, and principal explorable ships require at least **90/100** and no category below **4/5**. Apply the building rubric to ships with floor plan interpreted as deck/access organization.

Missing advertised interiors, broken traversal, fake transactions, lost saves, or major runtime failures are **hard failures regardless of score**. Missing required audio remains explicitly incomplete; never bury it in an average. A kiosk is judged against its legitimate function, not the square footage of a hospital.

A screenshot alone cannot prove a schedule, economy, dialogue bank, or usable door. Source code alone cannot prove a beautiful or navigable room. Require visual evidence plus behavior/state evidence as appropriate. Object counts, line counts, brighter lighting, and extra particles do not automatically earn points.

## 18. Anti-cheating quality gauntlet

Maintain separate world-level assessments for **visual/spatial quality**, **temporal/systemic quality**, and **engineering integrity**. Do not allow a high visual score to conceal an inert economy or broken saves. Each must reach at least 85/100 with all hard gates passed. A geometric mean may summarize progress, but cannot override any minimum.

Derive the world assessments from frozen, weighted acceptance groups registered at baseline. Use the anchored rubric for visual judgment and reproducible pass/fail evidence for behavior and integrity. Report tested coverage separately; untested work earns no verified credit. Do not invent an overall score without publishing its inputs.

Use this loop:

**Triage observed failures -> implement materially different fixes where useful -> evaluate against frozen criteria -> reproduce the claimed improvement -> test unrelated locations and states -> regression gate -> retain the better change -> update failure memory -> repeat.**

Where multiple agents are available, separate builders from evaluators and use blind candidate labels. Otherwise use reproducible checks and explicitly label subjective review as self-assessment; do not pretend independent judging occurred.

Reserve roughly 25% of location/state combinations for held-out regression checks. Include ordinary buildings, awkward views, crowded periods, closed businesses, adverse event states, and unusual player actions. If the implementing agent can inspect this set, call it held-out regression coverage rather than genuinely blind evaluation.

For each major change, test at least five unrelated locations or scenarios beyond the target. Reject severe artifacts, broken behavior, lost functionality, or systematic regression. A successful pass must resolve named failures with evidence; "looks two points better" is not sufficient.

Freeze scope, denominators, rubric weights, camera settings, and test conditions. Never edit tests merely to permit the current implementation. Document legitimate specification changes and preserve the old evidence rather than erasing it.

Inspect the worst buildings and bottom-decile results, not only averages. **Do not stop after polishing the Senate while ordinary apartments still repeat.** Keep a failure log with root cause, attempted fix, regression risks, and the test that would have caught it.

## 19. Acceptance tests that must actually run

Verify every manifested reachable building has valid access and its promised room program. Audit room graphs, duplicate arrangements, door clearance, lift destinations, functional props, and important world references. Pair automated checks with normal player traversal.

Run a complete city-day schedule test and inspect representative people at multiple times. Follow a worker from home to work, through a meaningful task, to a service or social stop, and back. Test route blockage and recovery without visible teleportation.

Audit every persistent NPC for thirty distinct reachable lines. Sample playback across roles, test state-ineligible lines, repeat suppression, subtitles, interruptions, and busy crowd audio. Report text coverage and audible coverage separately.

Track a physical shipment through docking, warehouse storage, distribution, business consumption, and resulting service availability. Check inventory and credit conservation at every transfer. Repeat after saving/loading midway.

Play a Senate session, leave and return, influence an eligible local issue, verify the tally, and observe downstream effects. Test both success and nonintervention outcomes.

Board every reachable craft class through its actual entrance, inspect its interior/cockpit, and disembark. Complete transport with the player aboard. Test denied access, departure timing, occupied ramps, and save/load inside a craft.

Run an accelerated multi-day simulation, including shortages, restocking, route disruption, repair, and recovery. Check negative stock, duplicate payouts, permanent deadlocks, invalid schedules, and compounding errors. Restore a clean test save afterward.

Run an uninterrupted normal-play session of at least thirty minutes, without teleporting between demonstrations or invoking developer-only interactions. Capture frame-time behavior and runtime errors. Test both a fresh world and a migrated existing save.

Maintain stable before/after captures of the original orange-sea views, ordinary repeated-room locations, thin ships, Senate approach/chamber, and each spaceport. The improvement must be visible from the original unflattering cameras, not only newly selected hero shots.

## 20. Execution order and final deliverables

First establish the baseline, scope manifest, reference ledger, and failure list. Then remove the orange-sea defect and repair city-scale structure, traversal, and proportion problems before decorating around them.

Build one **COMPLETE connected slice**:

**Port -> warehouse -> workshop/diner -> residences/clinic -> civic connection.**

Include real interiors, distinct NPCs, thirty-line dialogue banks, transactions, schedules, and one consequential event. This is the calibration slice, **not the final deliverable**.

Use the slice to validate the reusable systems, then overhaul the Senate and principal ships and roll the established standard across **EVERY building, craft, port, and NPC in the frozen playable scope**. Finish the remaining district variety, factions, and surprises. Run the full gauntlet and fix the lowest-scoring work.

Deliver the functioning updated project, an honest implementation summary, per-building/ship scorecards, scope completion counts with explicit denominators, NPC text/audio coverage, economy and navigation test results, fixed-camera before/after evidence, reference ledger, and a practical normal-play route that demonstrates the city.

Do not finish with only a plan, a list of intended features, or screenshots of a few beautiful corners. Do not claim testing that did not run. If an actual execution/resource/access limit stops the work, preserve the playable build and provide a precise handoff with remaining IDs, failures, and next actions; mark the result incomplete rather than inflating scores or shrinking scope.

**The standard is this:** I can enter an ordinary building, understand why it exists, meet people who belong there, use its services, follow its connections elsewhere, and return later to find that something meaningful has changed. Coruscant should reward curiosity in the street, inside a ship, behind a service door, at the Senate, and in the lives of people who are not waiting around solely for me.
