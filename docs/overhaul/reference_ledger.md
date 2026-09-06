# Reference Ledger — Coruscant Overhaul (SPEC §3)

Compiled Sunday Sep 6, 2026 by the round-6 reference librarian. Governing requirement: `docs/overhaul/SPEC.md` §3 ("Reference library: study specific things") — source URL, inspected view, three concrete observations, asset informed, implemented decision; ≥30 distinct views. This file is the only deliverable of the research pass; no source files were edited.

## 0. Method, honesty notes, notation

- Every URL listed in SPEC §3 (26 URLs) was opened with the web fetch tool. Gallery and video pages render their images client-side, so the readable fetch returned no captions; the raw HTML of those pages was then downloaded and the embedded gallery JSON (`"caption"`/`"image"` pairs), `og:description`, `alt` attributes, and `video:duration` metadata were parsed. Two Databank pages (Galactic Senate, Jedi Temple) turned out to embed their own history galleries (27 and 37 captions), which were parsed the same way.
- **No image pixels and no video frames were accessed at any point.** Every "view" below is text: a Databank entry, an article section, a gallery caption, alt text, or a video description. Where a page is a gallery or video, the inspected-type says so explicitly ("caption only", "description only; clip not watched").
- A **view** = one Databank entry text, one article section describing a distinct thing, one gallery caption (or a tight group of captions describing one place), or one video description. 57 views are recorded (V01–V57) out of 157 captions + 26 entry/article/video texts read.
- Observations come from the fetched text unless marked **†**: a design assumption based on the subject's widely reproduced on-screen look that could NOT be verified in this fetch. Builders must confirm † items against the cited image before relying on them.
- **LATER-ERA** = Imperial era or later (Bad Batch, Return of the Jedi, Book of Boba Fett, Andor). Such items are visual/architectural reference only; no politics, naming ("Imperial Senate District"), or characters are imported into the late-Republic timeline.
- Fetch log (listed URLs): 26/26 returned HTTP 200. Readable fetch gave usable entry text for all 20 Databank pages, the Inside Intel article, and the episode-guide page headers. Gallery pages: Coruscant History Gallery → "nothing usable" via readable fetch, 41 captions via raw JSON; Clone Conspiracy concept-art gallery → nothing usable / 12 captions via JSON; Gone with a Trace episode guide → four gallery titles only / 40 captions via JSON (12 episode, 8 trivia, 8 commentary, 12 concept art). Video pages: Jedi Archives Tour → description + duration 0:57 only; Coruscant Docks Pursuit → description + duration 1:03 only; no transcripts.
- Supplementary official pages fetched to deepen thin subjects: `databank/coruscant-senate-building` (OK), `news/who-are-the-pykes` (OK), `news/clone-wars-declassified-5-highlights-from-gone-with-a-trace` (OK), `news/the-clone-wars-rewatch-gone-with-a-trace` (OK, no new spatial facts), `video/a-wretched-hive-the-coruscant-underworld` (description only). One failure: `databank/senate-office-building` → 404; alternative `databank/coruscant-senate-building` used instead (V11).

## 1. Summary table

| Theme (SPEC §3) | Views inspected | Assets / systems informed |
|---|---|---|
| Planetary scale & city organization | V01–V09 (9) | Level/district signage, vertical wealth gradient, entertainment stack, civic district composition, neighborhood plaza, VIP landing platform, industrial district, unofficial vertical route, Temple staff commute |
| Senate & government | V10–V20 (11) | Senate chamber (drum, pod rings, speaker focus), Senate dome LOD, Senate approach promenade + service deck, Senate Guard skins, session state machine, Chancellor's suite + apron + lockdown, policy scenario framing, pod prop, CoCo Town lighting preset, warehouse, speeder variants |
| Jedi spaces | V21–V34 (14) | Five-spire silhouette, school/monastery zoning, Council chamber, processional approach, mezzanine corridors, briefing/dispatch, security station, civilian staff, landing platforms, hangar + freight prep, archives + vault, analysis lab + healer's room, quarters, duct route, training hall, garden/judgment/memorial, Temple Guard skin |
| Undercity & working life | V35–V44 (10) | Level 1313 signage/population, subway interchange, Underworld Police skin + station + detention, shaft platforms + fall recovery, repair/mech bay, gang pressure loop, two-level streets + pipes, wharf port, resident attitudes, laundromat front, loadlifter droid |
| Food, leisure, cultural identity | V45–V46 (2) | Dex's Diner interior/exterior + staff loop; Opera House auditorium, boxes, foyer, performance schedule |
| Docks & spacecraft | V47–V53 (7) | Cargo docks hazards, AA-9 bulk freighter, Twilight light freighter + fault loop, Republic cruiser diplomatic transport, Republic attack shuttle, LAAT gunship, air taxi |
| Institutions & organized crime | V54–V56 (3) | Coruscant Guard skin/jurisdiction/escorts, Black Sun front layering, Pyke smuggling contact + courier charter |
| Clinical equipment | V57 (1) | Bacta tank clinic treatment room + supply loop |

## 2. Planetary scale and city organization

### V01 Coruscant — Databank entry
- Source: https://www.starwars.com/databank/coruscant · Inspected: entry text (394 chars); hero-image alt "Coruscant" (alt only, image not viewed); related tiles titled "Battle Over Coruscant", "A Wretched Hive: The Coruscant Underworld", "Coruscant Docks Pursuit", "Coruscant Speeder Chase" (titles only).
- Obs: (1) The city is "spread over hundreds of levels" with "a diverse mix of cultures and citizens" — depth and population variety are the defining facts, not any one tower type. (2) The Jedi Temple is "the central hub of Jedi training and learning" and "the repository of the Jedi Archives" — its identity is school + archive, never fortress. (3) LATER-ERA: the entry is written from the "age of the Empire" viewpoint; use the geography only.
- Informs: city layering, district mix, Jedi Temple archives · Decision: every playable address carries a level number and district tag in signage and lift menus; the Temple room program is led by archives + classrooms and its in-game placard uses the "training and learning" framing.

### V02 Inside Intel: Coruscant — §Ecumenopolis and levels
- Source: https://www.starwars.com/news/star-wars-inside-intel-coruscant · Inspected: article text, paragraphs on levels/social geography.
- Obs: (1) "some 5,000 levels ... home to trillions"; "which level a person lives on" is pivotal — vertical position is social position. (2) The lower levels' "seedy underworld ... manages to thrive beneath the very capital" — the underworld is productive and commercial, not dead. (3) The wealthy "afford penthouses overlooking the colossal city" and one High Republic figure owned "an entire building" — wealth reads as height, view, and single-owner towers.
- Informs: city organization, affluent residential, undercity · Decision: wealth gradient is vertical — affluent residential at the top with wraparound views and one single-owner tower variant, worker housing mid-level, undercity kept commercially alive (lit shopfronts, open stalls) rather than abandoned.

### V03 Inside Intel — §Districts (Uscru, Entertainment District, CoCo Town)
- Source: same article · Inspected: district paragraph.
- Obs: (1) Galaxies Opera House is in the Uscru District and "Beneath Uscru is the Entertainment District and its buzzing nightlife" (Outlander Club) — elite culture literally sits above cheap nightlife in one vertical stack. (2) Dex's Diner is in "the Collective Commerce District, also known as CoCo Town" — a working commerce/industrial district, not an entertainment strip. (3) Districts carry a formal name and a nickname — signage should show both.
- Informs: Opera House, cantina/club, Dex's Diner exterior, district system · Decision: entertainment district is a two-tier stack (opera/culture level above, club/nightlife level below, public lift between); the diner is placed in the commercial/industrial district among workshops and freight streets under a sign "Collective Commerce District (CoCo Town)".

### V04 Inside Intel — §Federal District
- Source: same article · Inspected: Federal District paragraph.
- Obs: (1) "One of the more expansive districts"; "the most prominent building ... is the Galactic Senate Building". (2) The chambers "held over a thousand delegations" — thousand-pod order of scale, so most pods must be instanced. (3) The district also holds Padmé Amidala's apartment (a senatorial residence), the Senate Office Building, and "most notably, the Jedi Temple"; nicknamed "the Core of Coruscant" — civic, administrative, religious, and elite residential programs share one district.
- Informs: Senate chamber, Senate approach, civic district composition, affluent residential · Decision: civic district = Senate dome + separate Senate Office Building (delegation suites live there, not in the dome) + Jedi Temple precinct + ≥1 senatorial residential tower within one walkable district; the chamber implies ~1,000 pods with instanced far rings while ≥12 near pods are physical.

### V05 Inside Intel — §Monument Plaza / Umate
- Source: same article · Inspected: Monument Plaza paragraph.
- Obs: (1) "the only uncovered mountain peak on the planet" (Umate, Manari range), "surrounded by shops and restaurants" — a natural landmark framed by ordinary commerce. (2) "citizens are welcome to visit and touch the peak" — a tactile public destination, not a fenced monument. (3) LATER-ERA: the plaza riot/celebration is the Return of the Jedi scene — visual reference only.
- Informs: neighborhood plaza, community destinations · Decision: adopt the pattern (exposed rock outcrop + ring of shops/restaurants + touchable focal point) for one neighborhood plaza, labeled an original game design and not claimed to be Monument Plaza; no riot scripting.

### V06 Coruscant History Gallery — caption 2 (Valorum welcomes the Jedi on a landing platform)
- Source: https://www.starwars.com/coruscant-history-gallery · Inspected: caption text of image 2/41 (caption only; image not viewed).
- Obs: (1) The reception happens "on a platform surrounded by Coruscant's endless skyscrapers and ceaseless whirl of traffic" — VIP arrival is outdoors, elevated, with traffic lanes visible around it. (2) The Chancellor comes out to the platform — the reception line forms at the ship, not in a lobby. (3) The platform is the first step of the Senate approach sequence.
- Informs: Senate approach, diplomatic/security spaceport, Republic Cruiser docking · Decision: the Senate district gets a dedicated open-air VIP landing platform with a marked reception line, an exposed edge, and traffic lanes threaded at eye level around it; arrivals trigger a reception-NPC formation before the walk to the Senate.

### V07 Coruscant History Gallery — caption 12 (Dooku meets Sidious in a rundown industrial area)
- Source: same gallery · Inspected: caption 12/41 (caption only).
- Obs: (1) A "rundown industrial area" exists on Coruscant within reach of the civic core — industry is not confined to the undercity. (2) It serves as a secret meeting place: low occupancy, poor lighting, large disused volumes. (3) Era: opening of the Clone Wars — fits the timeline.
- Informs: utility/reclamation plant, salvage yard, faction meeting spots · Decision: the industrial district includes one visibly disused hall (stripped equipment, a single working light) used as a faction meeting spot; labeled original design (no canonical "Works" claim).

### V08 Coruscant History Gallery — captions 18–20, 23 (underlevel routes used by Satine and Padmé)
- Source: same gallery · Inspected: captions 18, 19, 20, 23 of 41 (captions only).
- Obs: (1) Satine "traveled into Coruscant's dangerous underlevels to meet with an informant" and later "made it to the Senate building" — a continuous route exists from the underlevels to the Senate. (2) She "fled through the underlevels, pursued by Death Watch and Republic forces alike" — the routes branch and are used by both sides of the law. (3) Padmé was "pursued through Coruscant's underlevels by thugs seeking to intimidate" senators — senators do pass through, and thugs ambush there.
- Informs: unofficial vertical route, undercity, Senate service route, security cases · Decision: the unofficial vertical route exits into the Senate district's service level, has ≥2 branch points and one ambush pocket, and an intimidation incident there creates an inspectable case at the security station.

### V09 Coruscant History Gallery — caption 25 (Letta Turmond, widow of a Temple maintenance worker)
- Source: same gallery · Inspected: caption 25/41 (caption only).
- Obs: (1) The Jedi Temple employs civilian maintenance workers with families. (2) Such a household lives in an ordinary "Coruscant apartment" reached from the street — Temple staff commute. (3) Era: Clone Wars; the bombing itself is not reproduced.
- Informs: Temple service circulation, worker apartment building, NPC schedules · Decision: at least one worker-apartment household is a Temple maintenance employee who commutes to a real Temple service door separate from the processional stair.

## 3. Senate and government

### V10 Galactic Senate — Databank entry
- Source: https://www.starwars.com/databank/galactic-senate · Inspected: entry text (625 chars); locations list "Senate Office Building", "Coruscant Senate Building"; video tiles "Palpatine's Politics", "So This is How Liberty Dies" (descriptions only).
- Obs: (1) "Within the cavernous Senate rotunda, hundreds of politicians would fill the viewing platforms that lined the curved walls" — platforms are wall-mounted in rings on a curved enclosure; the room reads as a hollow drum, not an amphitheater floor. (2) The body was "sharply divided between supporters of the war and those seeking peace" — blocs exist and can color reactions. (3) The Senate Office Building is a separate location from the chamber building.
- Informs: Senate chamber, delegation office building · Decision: chamber is a vertical drum with ≥3 stacked pod rings on the curved wall, an open central volume, and a raised Chancellor's podium as speaking focus; delegation suites are in a separate Senate Office Building linked by a covered walkway; delegations are tagged pro-war / peace / unaligned for agenda reactions.

### V11 Coruscant Senate Building — Databank entry (supplementary; linked from V10)
- Source: https://www.starwars.com/databank/coruscant-senate-building · Inspected: entry text (298 chars); hero alt only.
- Obs: (1) "dome shaped building ... in the heart of Coruscant's senate district" — the dome is the district centerpiece. (2) It "cuts a massive, rounded silhouette in the Coruscant skyline, visible for kilometers all around" — a far-LOD landmark from every district. (3) It is "the home of the Galactic Senate chamber" — one dome, one chamber; offices elsewhere.
- Informs: Senate silhouette, skyline LOD · Decision: the Senate dome is the widest low landmark in the city with a far-distance impostor visible from the undercity mouths, both spaceports, and the Temple platforms; verify from ≥4 district cameras.

### V12 Senate District — Databank entry (LATER-ERA source: The Bad Batch)
- Source: https://www.starwars.com/databank/senate-district · Inspected: entry text (298 chars); hero alt only.
- Obs: (1) "On the highest levels of Coruscant, elected officials ... stroll ... en route to business appointments and official hearings" — pedestrian promenades with scheduled walking officials. (2) "well-manicured section" — planting, clean paving, maintained facades. (3) "a pristine facade that conceals levels of corruption and greed below" — service and lower levels lie directly beneath. LATER-ERA: the entry calls it the "Imperial Senate District"; take the promenade/planting/underside pattern only and keep Republic signage.
- Informs: Senate approach, civic district, service route · Decision: the Senate approach is a manicured promenade with planters, hedges, and benches; official NPCs walk hearing-to-office on schedules; a maintenance stair drops from the promenade to a service deck with cleaner-crew NPCs.

### V13 Senate Guard — Databank entry
- Source: https://www.starwars.com/databank/senate-guard · Inspected: entry text (453 chars); weapons list (blaster pistol, blaster rifle); hero alt only.
- Obs: (1) "For centuries, the Senate Guards have kept the galaxy's legislators from harm" — an ancient institution with ceremonial, formal posture. (2) "the blue guards" — blue is the identity color († tall-crested full helmet and long robe not verifiable here). (3) Elite "Senate Commandos ... carry out secret government missions" — a second tactical variant exists. The stormtrooper/red-guard phase-out is LATER-ERA: no red.
- Informs: Senate Guard skins, Senate security posts · Decision: two skins — ceremonial blue robed guard (pistol, fixed posts at chamber doors and promenade) and Senate Commando (rifle, armored, appears only for escort/lockdown events); no red guard anywhere in the game.

### V14 Galactic Senate — embedded history gallery, captions 1–3 (Amidala's address; no-confidence vote)
- Source: https://www.starwars.com/databank/galactic-senate (embedded gallery JSON, 27 captions) · Inspected: captions 1, 2, 3 (captions only; images not viewed).
- Obs: (1) A petitioner speaks, an opposing senator "protested that there was no proof", and the Chancellor proposes "a commission to investigate" — debate has motion, objection, and deferral outcomes. (2) A "no-confidence vote" can be called from the floor — votes are triggered by members. (3) Outcomes are announced in-chamber and change who holds office — decisions have visible consequences.
- Informs: Senate session state machine, records area · Decision: session states = agenda item → speaker → objection → commission/defer or vote → announcement; a deferred motion spawns a "commission" clerk task in the records area that the player can read.

### V15 Galactic Senate — embedded gallery, captions 6, 11–12 (Chancellor's office, gunships outside, hostage lockdown)
- Source: same embedded gallery · Inspected: captions 6, 11, 12 (captions only).
- Obs: (1) The Zillo Beast sought Palpatine "in his Senate office" and "Republic gunships brought the mighty creature down outside the Senate Building" — the Chancellor's office is inside the Senate building and an open apron large enough for gunship operations surrounds it. (2) Bounty hunters "invaded the Senate ... taking several senators hostage" — interior circulation can be seized and sealed. (3) "Clone troopers secured Palpatine in his office" — lockdown posts clones (Coruscant Guard) at the office and closes zones.
- Informs: Senate complex plan, LAAT gunship landing, Coruscant Guard posts · Decision: the Senate building has an exterior apron with a gunship-rated pad; the Chancellor's suite is a restricted office off the chamber level; a lockdown event closes blast doors and posts Coruscant Guard clones — this is where access denial and evacuation are tested.

### V16 Galactic Senate — embedded gallery, caption 18 (Padmé's speech on eroding basic services)
- Source: same embedded gallery · Inspected: caption 18 (caption only).
- Obs: (1) Padmé "warned that the war was eroding basic services relied on by regular citizens" — appropriation debates are about utilities and services. (2) "the Senate voted against the bills" — votes can go against the executive. (3) Era: Clone Wars — fits the timeline.
- Informs: Senate policy scenarios · Decision: the "lower-level utility repairs" scenario is framed as a services-vs-military appropriation vote; the outcome changes the reclamation plant's repair budget and a neighborhood-screen headline.

### V17 Coruscant History Gallery — caption 3 (Amidala speaks "from the pod of Naboo's Senator Palpatine")
- Source: https://www.starwars.com/coruscant-history-gallery · Inspected: caption 3/41 (caption only).
- Obs: (1) A pod belongs to a delegation ("the pod of Naboo's Senator") and holds the senator plus guests (a queen and her party) — one pod per member world, 4–6 occupants. (2) Speaking is done from the pod itself — the pod is the speaking position († it detaches and floats toward the center; not verifiable here). (3) "committees bickered and produced useless reports" — committee rooms and reports are part of the process.
- Informs: Senate pods, committee rooms, records area · Decision: pods are delegation-owned with 4–6 seats; the active speaker's pod moves toward the central focus; committee/hearing rooms generate report items that appear in the records area.

### V18 "The Clone Conspiracy" concept-art gallery — captions 6, 8, 9 (repulsor pod; Senate district ×2) — LATER-ERA
- Source: https://www.starwars.com/the-clone-conspiracy-concept-art-gallery · Inspected: caption text only ("Repulsor pod concept art by Dawn Carlos"; "Coruscant Senate district concept art by Christian Piccolo" ×2); readable fetch returned nothing usable, raw HTML JSON gave 12 captions; images not viewed.
- Obs: (1) Two separate Senate-district paintings were made for one episode — the district was designed as an environment, not a facade. (2) A "repulsor pod" has its own concept sheet — the floating Senate pod is a distinct prop. (3) LATER-ERA (Bad Batch); nothing visual was accessible, so no material or lighting claim is made from this page.
- Informs: Senate pod prop, Senate approach · Decision: the pod is a standalone prop asset with its own geometry, wall dock, and lighting; no architectural decision is taken from these captions beyond that.

### V19 "The Clone Conspiracy" concept-art gallery — captions 7, 11, 12 (Coco Town; lighting concepts) — LATER-ERA
- Source: same gallery · Inspected: captions only ("Coco Town concept art by Scott Zenteno"; "Coruscant lighting concept by Molly Denmark"; "Coruscant coco town lighting concept by Molly Denmark").
- Obs: (1) CoCo Town received dedicated environment and lighting concepts — the district has an intended lighting identity distinct from the Senate district. (2) A separate city-wide "Coruscant lighting concept" exists — lighting was designed as its own pass, per district. (3) LATER-ERA; images not viewed — no color/value claims.
- Informs: Dex's Diner exterior, CoCo Town lighting, district ambience · Decision: CoCo Town gets its own lighting preset distinct from the Senate preset; lighting is authored as a per-district table (key color, fill, fog density, lamp spacing), not per building.

### V20 "The Clone Conspiracy" concept-art gallery — captions 10, 5 (warehouse; air speeder) — LATER-ERA
- Source: same gallery · Inspected: captions only ("Coruscant warehouse concept art by Clinton Felker"; "Air speeder concept art by Andre Kirk"). Remaining captions (Senator Pamlo, Rex, Mas Amedda, clone trooper) are character sheets and are not used.
- Obs: (1) A Coruscant warehouse was designed as a set — a warehouse interior is an established Coruscant location type. (2) An episode-specific civilian air speeder was designed — speeder variety is expected in traffic. (3) LATER-ERA; images not viewed.
- Informs: cargo terminal/warehouse, air taxi/speeder variants · Decision: the warehouse is a full interior program per SPEC §7; skyline traffic uses ≥2 civilian speeder silhouettes besides the air taxi.

## 4. Jedi spaces

### V21 Jedi Temple — Databank entry
- Source: https://www.starwars.com/databank/jedi-temple · Inspected: entry text (606 chars); hero alt only; video tiles "Fear is the Path to the Dark Side", "Jedi Archives Tour", "Wayward Planet" (titles only).
- Obs: (1) "Instantly recognizable by its distinctive crown of five spires" — the silhouette is the five-spire crown († four corner spires around a taller central spire on a broad stepped base; not verifiable here). (2) "Part school and part monastery" — two programs: teaching (classrooms, training halls, archives) and contemplative (quarters, gardens, meditation). (3) LATER-ERA: Order 66 and the Imperial Palace conversion are excluded; the spires "still rose", so the silhouette is era-stable.
- Informs: Jedi Temple spires, Temple zoning · Decision: keep five spires; zone the Temple into a school wing and a monastery wing with the Great Hall between; no barracks, no club.

### V22 Jedi Temple — embedded gallery caption 16 (Council chamber in a spire)
- Source: https://www.starwars.com/databank/jedi-temple (embedded gallery JSON, 37 captions) · Inspected: caption 16 (caption only).
- Obs: (1) "The Jedi Council met in one of the Temple's soaring spires" — the Council room is at spire height. (2) "the body's twelve masters looking out over the massive buildings and endless traffic" — twelve seats with panoramic glazing over live traffic. (3) It is a debating room — a circle, no stage.
- Informs: Temple spire interiors, restricted areas · Decision: one spire top is a circular Council chamber with 12 seats in a ring and 360° glazing over live traffic, reached by a Council-permission lift; a second spire top is a public lookout so the spires are not hollow.

### V23 Jedi Temple — gallery captions 17–18 (processional stair, pillars, founders' statues, Great Hall; corridors and mezzanines)
- Source: same embedded gallery · Inspected: captions 17, 18 (captions only).
- Obs: (1) On-foot visitors "approached from a long processional staircase, passing between massive pillars and sculptures of the Temple's ancient founders before entering the Great Hall" — a linear ceremonial sequence: stair → pillar avenue → statues → hall. (2) The Great Hall is the first interior — the reception threshold. (3) "graceful corridors and mezzanines were places for Jedi to reflect ... or catch up with colleagues returning from missions" — wide, double-height corridors used socially.
- Informs: Temple approach, reception threshold, corridors · Decision: build the stair–pillars–statues–Great Hall axis as the public entrance with a reception desk in the Hall; main corridors are double-height with a mezzanine walkway; "returning Jedi" NPC pairs converse on the mezzanine on schedule.

### V24 Jedi Temple — gallery captions 19, 11, 20 (situation rooms, war room, central security station)
- Source: same embedded gallery · Inspected: captions 19, 11, 20 (captions only).
- Obs: (1) "situation rooms were the site of meetings with Jedi called to other star systems" and used to "prepare for new missions" — a dispatch/briefing function. (2) The "war room" received field reports from Utapau — remote holo-communication is central († holotable). (3) The "central security station" holds "powerful transmitters ... to contact all members of the Order" — a restricted comms/security nerve center.
- Informs: Temple briefing room, dispatch, security station · Decision: one briefing room with a central holo-display and a mission board (dispatch interaction assigns the diplomatic/investigative assignment); one restricted security/comms station near the hangars with a Temple Guard post.

### V25 Jedi Temple — gallery caption 21 (non-Jedi staff and labs)
- Source: same embedded gallery · Inspected: caption 21 (caption only).
- Obs: (1) "The Temple was home to more than Jedi – doctors, technicians, maintenance crews and researchers worked in the massive structure's numerous labs and facilities." (2) A named civilian researcher (Doctor Gubacher, a Parwan) "ran one of the Temple's technological research-and-development labs" — labs are staffed by varied species. (3) "numerous labs" — the technical/service program is large, not a closet.
- Informs: Temple staff NPCs, service quarters, research interaction · Decision: the Temple roster includes ≥4 civilian staff (technician, doctor, maintenance worker, researcher) with lockers and a break room in the service wing; one R&D lab room hosts a research interaction.

### V26 Jedi Temple — gallery captions 22–23 (landing platforms extending from the walls)
- Source: same embedded gallery · Inspected: captions 22, 23 (captions only).
- Obs: (1) "Visitors to the Temple arriving from the air landed on platforms extending from the Temple walls" — cantilevered platforms projecting from the facade. (2) Dignitaries such as Bail Organa "enjoyed a dignified reception" — a reception party meets arrivals at the platform door. (3) "Jedi used the Temple's landing platforms to depart on missions, with younglings eagerly awaiting ... a training ship" — platforms double as youngling gathering spots.
- Informs: Temple platform/hangar, guest reception, Senate–Temple diplomatic link · Decision: two cantilevered platforms — a guest platform (reception NPC, shuttle stand) and a mission platform (training-ship slot; younglings queue on schedule); the Senate liaison Jedi departs and returns here.

### V27 Jedi Temple — gallery captions 24–25 (internal hangars; carbon-freezing chamber)
- Source: same embedded gallery · Inspected: captions 24, 25 (captions only).
- Obs: (1) "Hangars inside the Temple housed airspeeders and shuttles"; in wartime "starfighters and gunships" — a mixed civilian/military park inside the mass. (2) The wartime crowding is called "a sign of the Order's transformation" — hangar contents tell the era story. (3) "A carbon-freezing chamber near the hangars was used to prepare goods for transport" — a freight-prep room adjoins the hangar.
- Informs: Temple hangar connection, Temple logistics · Decision: the Temple hangar is an interior bay holding one shuttle, one airspeeder, and one starfighter, with an adjoining freight-prep room (crates, a freezing rig as a prop) and a door to the maintenance corridor.

### V28 Jedi Temple — gallery captions 26–27 + Jedi Archives Tour (Archives; Holocron Vault)
- Source: same embedded gallery captions 26, 27; https://www.starwars.com/video/jedi-archives-tour — description text and duration 0:57 only, clip not watched.
- Obs: (1) "The Jedi Archives contained the accumulated knowledge of the Order", with librarians saying "if something wasn't recorded in the Archives, it didn't exist" — a librarian NPC with exactly that attitude. (2) "The Holocron Vault ... access ... was limited to members of the Jedi Council" — a hard permission gate. (3) Video description: Ahsoka is "charged with guarding the Jedi Archives" and Jocasta Nu "shows her the entrance" to the vault — the vault entrance sits inside the archive hall and has a guard post.
- Informs: Jedi archives, restricted vault, research interaction · Decision: an Archives hall with stack aisles and a librarian desk (research interaction: query → record found/absent); the vault door is inside the hall with Council-only permission, a guard position, and a visible duct grille nearby (V31).

### V29 Jedi Temple — gallery captions 28–29 (analysis labs; medical center)
- Source: same embedded gallery · Inspected: captions 28, 29 (captions only).
- Obs: (1) "Analysis labs ... allowed Jedi to get help identifying objects recovered during missions ... with analysis droids assisting" — an evidence bench with a droid analyst. (2) "The Temple's medical center was equipped to handle not just physical and mental maladies" — beds plus a quiet consult space. (3) Doctors were "trained to help Jedi who had lost their connection to the Force" — treatment includes counsel, not only equipment.
- Informs: Temple healer's room, investigative assignment · Decision: an analysis lab whose droid identifies a recovered item (one investigation step); a healer's room with 2 beds, a consult alcove, and a Temple doctor NPC.

### V30 Jedi Temple — gallery captions 30–31 (quarters: sparse vs personalized)
- Source: same embedded gallery · Inspected: captions 30, 31 (captions only).
- Obs: (1) "Jedi quarters were typically simple and sparsely furnished" — small rooms, a sleeping ledge, a meditation spot. (2) Yoda "retreated to their quarters to rest and meditate" — quarters double as meditation space. (3) Anakin's were "decorated with old Podracing posters and full of machinery that he tinkered with" — personalization is allowed and reveals character.
- Informs: Temple living quarters · Decision: quarters share one sparse shell, but each of ≥3 shows distinct personal evidence (tinkering bench, plant, star chart); one belongs to the liaison Jedi.

### V31 Jedi Temple — gallery caption 32 (conduits, ducts, laser grid)
- Source: same embedded gallery · Inspected: caption 32 (caption only).
- Obs: (1) "The Temple was riddled with conduits, ducts, pipes and vents" — a real service layer behind the walls. (2) The ventilation system was "secured by a laser grid" — infrastructure carries visible security. (3) Cad Bane used it to reach the Holocron Vault — the duct route genuinely connects to a restricted room.
- Informs: Temple maintenance route, unofficial route · Decision: a crawl duct links the service corridor to the Archives level; a laser-grid gate blocks it unless a maintenance permission is held; the Temple maintenance NPC uses it on schedule.

### V32 Jedi Temple — gallery captions 33–34 (youngling instruction rooms)
- Source: same embedded gallery · Inspected: captions 33, 34 (captions only).
- Obs: (1) Instruction "took place in rooms throughout the Temple, with the lessons and the rooms themselves tailored" — several small classrooms shaped for their lesson. (2) Lessons range "from quiet meditation exercises to practice with training lightsabers" — a padded training room and a quiet meditation room are separate. (3) "Master Yoda ... greatly enjoyed his time teaching" — senior Jedi teach on schedule.
- Informs: Jedi training hall, meditation space · Decision: a training hall (practice-saber sparring interaction with remotes) and a separate youngling meditation room with low seats in a circle; a Master NPC teaches at fixed hours.

### V33 Jedi Temple — gallery captions 35–37 (gardens; Chamber of Judgment; funerary hall)
- Source: same embedded gallery · Inspected: captions 35, 36, 37 (captions only).
- Obs: (1) "Courtyards and gardens in the Temple provided serene spaces for Jedi to meditate and discuss" — open-air courtyards inside the mass. (2) The "Chamber of Judgment" hears cases "with the Jedi Temple Guard present" — a formal hearing room with a guard position. (3) The dead are "laid to rest in the Temple, with beams of light lit to mark their passage" — a memorial hall lit by vertical light shafts.
- Informs: Temple garden, restricted judgment chamber, lighting language · Decision: one planted courtyard with water and benches; a Chamber of Judgment (restricted, Temple Guard posted); a small memorial hall whose only light is vertical beams.

### V34 Jedi Temple Guard — Databank entry
- Source: https://www.starwars.com/databank/jedi-temple-guard · Inspected: entry text (600 chars); hero alt only.
- Obs: (1) "anonymous sentinels ... formal robes and identity-concealing masks" — uniform, faceless, robed. (2) "imposing lightsaber pikes – thick, double-bladed weapons that produced a rare and distinctive yellow blade" — the yellow pike is the read at distance. (3) They report to Cin Drallig, head of security — Temple security, distinct from Senate Guard and clones.
- Informs: Jedi Temple Guard skin, Temple restricted posts · Decision: Temple Guard skin = pale robe, featureless mask, yellow double-bladed pike held vertical at idle; posted at the vault, Chamber of Judgment, and security station; never outside the precinct.

## 5. Undercity and working life

### V35 Level 1313 — Databank entry (+ supplementary video description)
- Source: https://www.starwars.com/databank/level-1313 · Inspected: entry text (362 chars); hero alt only. Supplementary: https://www.starwars.com/video/a-wretched-hive-the-coruscant-underworld — description only ("the seedy underworld levels of Coruscant, from scale to subways"); clip not watched.
- Obs: (1) "so called because it was 1,313 levels from the planet's core" — level numbers count up from the core and belong on signage. (2) "a haven for bounty hunters, gangsters and other galactic scum, with the strong preying on those struggling to make a living" — predators and working poor share the level; the majority are workers. (3) The underworld has "subways" — mass transit exists at depth.
- Informs: Level 1313 undercity, transit interchange · Decision: undercity signage reads "LEVEL 1313" (Aurebesh-styled plus a readable numeral); population mix ≥70% workers/residents, ≤30% criminal-affiliated; the undercity's transport connection is a subway-style transit interchange.

### V36 Coruscant Underworld Police — Databank entry (+ longer og:description)
- Source: https://www.starwars.com/databank/coruscant-underworld-police · Inspected: entry text (401 chars) and the longer og:description (779 chars); hero alt only.
- Obs: (1) "Completely swathed in ... leather and metal uniforms, with mechanical eyes poking through their fully wrapped heads" — dark leather wraps, metal plates, glowing optics; species ambiguous ("droids, humanoids, or something in between"). (2) They keep order "far from the prying eyes of clone troopers and police droids" — a separate jurisdiction from the Coruscant Guard. (3) "the tug-of-war of law enforcement and criminal activity keeps these different sides of the city planet connected" — their cases link up and down the levels.
- Informs: Underworld Police skins, undercity security station · Decision: Underworld Police skin = wrapped dark-leather head, metal chest plate, a row of glowing optics, "standard weapons and gear"; they staff the undercity security station and never patrol above the industrial district; case files can be handed up to the Coruscant Guard.

### V37 "Gone with a Trace" — episode gallery caption 1 + Declassified §1–2 (crash landing on a Level 1313 platform)
- Source: https://www.starwars.com/series/clone-wars/gone-with-a-trace-episode-guide (embedded gallery JSON, 40 captions in 4 galleries) caption 1; https://www.starwars.com/news/clone-wars-declassified-5-highlights-from-gone-with-a-trace §1–2 · Inspected: caption and article text only.
- Obs: (1) A failing speeder bike falls from the upper city and "crash lands on a platform in Level 1313" — open vertical shafts connect sky to 1313, and platforms jut into them. (2) Ahsoka is "running downward along walls" — shaft walls are continuous surfaces, not open lattice. (3) She pauses "at the hangar platform, gazing upward" — from 1313 the view up the shaft is part of the place.
- Informs: Level 1313 undercity, vertical connections, fall consequence · Decision: 1313 has an open shaft with a hangar platform at its edge; looking up shows ≥3 lit layers; a fall from above lands on a recoverable platform (damage + respawn), never a void.

### V38 "Gone with a Trace" — episode captions 2, 3, 6, 7, 11 + concept captions "Coruscant Portal Mech Bay by Pat Presley" ×2 (Trace's repair shop)
- Source: same episode guide · Inspected: captions only.
- Obs: (1) A mechanic repairs a customer's speeder bike in a street-facing shop and negotiates payment ("she wants payment for the service") — a repair counter with pricing. (2) "Ahsoka and Trace work in the rear of the shop" on three hulking loadlifter droids delivered by a client — a rear droid bay behind the vehicle bay, taking outside jobs. (3) The concept sheet is titled "Portal Mech Bay" — the shop opens through a large portal onto the street/platform.
- Informs: Level 1313 repair shop, droid workshop, small repair hangar · Decision: undercity repair shop = front vehicle bay with a wide portal door to the platform, a counter with a price board, and a rear droid bay with a restraining-bolt bench; a repair job consumes a part, changes the fault state, and produces an invoice.

### V39 "Gone with a Trace" — episode captions 4–5 (gangster Pintu collects a debt)
- Source: same episode guide · Inspected: captions 4, 5 (captions only).
- Obs: (1) "a gangster named Pintu enters Trace's shop. He's looking for money owed by Trace's sister" — debt collection happens on the shop floor during business hours. (2) "his goons corner Trace" — a boss plus two muscle. (3) "Pintu promises that matters are far from over" — a persistent pressure state, not a one-off fight.
- Informs: freight-level gang, criminal-front conflict, security cases · Decision: the freight-level gang runs a debt/pressure loop on ≥2 businesses: a collector NPC visits on schedule; the player can pay, witness (creates a case), negotiate, or deter — and the state persists across visits.

### V40 "Gone with a Trace" — episode captions 8–10 + Declassified §5 (loadlifter chase geometry)
- Source: same episode guide and article · Inspected: captions 8, 9, 10; article §5 — text only.
- Obs: (1) The droid "jumps, climbs, and barrels through the streets" and "scale[s] a wall" to reach "the above platform" — streets are stacked platforms linked by sheer or climbable walls. (2) A speeder's "tow cable to a pipe" holds a droid's weight — overhead pipes are structural-scale, not decorative. (3) "Restraining bolts exist for a reason" — droid safety hardware is a working prop.
- Informs: Level 1313 street section, overhead infrastructure, droid workshop · Decision: undercity streets are two-level — a lower lane and an upper platform 4–6 m above, joined by ladders/stairs; pipes ≥0.6 m in diameter run overhead and are walkable in places; the restraining bolt is an inventory item the workshop uses.

### V41 "Gone with a Trace" — episode caption 12 + concept captions "Warf by Carlos Sanchez", "Wharf lighting concept by Jason Boesch"
- Source: same episode guide · Inspected: caption 12; concept captions 7 and 12 — captions only.
- Obs: (1) "Later at the wharf, Rafa meets up" — the undercity has a wharf: a freight-loading edge where deals are settled. (2) Rafa "charged her client double, paying off Pintu and earning enough for new tools" — cash flows client → courier → gang debt + tool purchase. (3) A dedicated wharf lighting concept exists — the wharf has its own lighting identity (image not viewed; no color claim).
- Informs: undercity freight/repair spaceport, economy loop · Decision: the undercity port is a "wharf" — a linear freight edge with tie-downs, a broker's kiosk, and a distinct lighting preset; the courier job pays out here and the money can be routed to debt or tools.

### V42 "Gone with a Trace" — trivia captions 3–4 + commentary captions 1–3 (social layering; Jedi out of touch)
- Source: same episode guide · Inspected: trivia captions 3, 4; commentary captions 1, 2, 3 — captions only.
- Obs: (1) Coruscant "was built in layers, with the most privileged citizens living in the highest levels and the lower levels becoming dangerous slums run by the criminal underworld." (2) The Martez sisters "represent the average citizen that's going about their daily lives" — residents have routines, not quests. (3) "the Jedi are out of touch with those people" — undercity residents speak of Jedi with distance or resentment; the sisters live on Level 1313.
- Informs: NPC dialogue banks, district social behavior · Decision: undercity residents get a rumor-tagged "Jedi out of touch" line family and daily routines; the liaison Jedi's undercity visits trigger cool reactions, not deference.

### V43 "Gone with a Trace" — trivia caption 7 + concept caption "Rafa's laundry by Chris Glenn" (laundromat as a front)
- Source: same episode guide · Inspected: trivia caption 7; concept caption 6 — captions only.
- Obs: (1) "Rafa Martez runs a laundromat as a front for her more nefarious schemes" — a credible service business hides the illicit layer. (2) "The interior features Star Wars versions of machines and signage seen in real-world laundromats" — rows of machines, price/instruction signage, folding tables. (3) A concept sheet exists for the laundry — a designed interior, not viewed here.
- Informs: criminal-front business, worker apartments (laundry service) · Decision: one criminal front is a working laundromat — ≥8 machines residents actually use, signage, a folding counter, and a back room reachable only through the staff door; the illicit layer is a brokerage ledger (SPEC §7).

### V44 "Gone with a Trace" — concept captions "Coruscant Industrial Zone Detention Center by Wayne Lo", "Type II Loadlifter by JP Balmet"
- Source: same episode guide · Inspected: concept captions 3, 8 — captions only.
- Obs: (1) An "Industrial Zone Detention Center" exists — holding facilities sit in the industrial zone, not the civic core. (2) The "Type II Loadlifter" is a designed cargo-droid class — a hulking lifter for freight (episode captions call it "hulking", able to climb). (3) Both are named sets/props — reusable across warehouse and security station.
- Informs: security station (secure holding), cargo terminal, droid workshop · Decision: the undercity security station includes a small detention wing; the loadlifter droid is a warehouse asset seen at the wharf and terminal and is a valid workshop repair job.

## 6. Food, leisure, and cultural identity

### V45 Dex's Diner — Databank entry
- Source: https://www.starwars.com/databank/dexs-diner · Inspected: entry text (og:description, 619 chars); hero alt only.
- Obs: (1) "on the streets of Coco Town, a dilapidated industrial area"; "a quaint and outdated eatery" — a small, dated, domestic-scale building among worn industrial frontage († streamlined chrome-and-glass diner shell not verifiable here). (2) "hard-working laborers come for a quick and home-style meal or a cup of freshly brewed Jawa juice or ardees, and idly chatter about local politics, sports, or current events" — quick counter service, hot-drink urns, ambient chatter topics. (3) Staff: "a pair of regular waitresses, the whirring and wheeled WA-7 [droid] and ... Hermione Bagwa" plus cook-proprietor Dexter Jettster, "a hulking alien" — one wheeled server droid, one human server, one large cook needing a kitchen sized for him.
- Informs: Dex's Diner interior/exterior, neighborhood diner program · Decision: single-story diner with counter + booths, a pass-through to a kitchen scaled for a bulky cook, a wheeled server droid on a floor track, a human server, hot-drink urns on the counter; patrons are laborers on shift breaks with politics/sports/current-event lines; exterior is a small dated box between industrial walls.

### V46 Galaxies Opera House — Databank entry + video description
- Source: https://www.starwars.com/databank/galaxies-opera-house · Inspected: entry text (437 chars); video "The Legend of Darth Plagueis" description (1:41; clip not watched); hero alt only.
- Obs: (1) "upper levels of the Uscru District ... favored by the elite" — height plus exclusivity, door control, dress. (2) "an acrobatic performance of Squid Lake as performed by a Mon Calamari troupe" — the stage program is aquatic/acrobatic († a suspended water-sphere stage; not verifiable here). (3) The Chancellor's "private box was visited upon" for a confidential conversation — boxes are private rooms with their own access.
- Informs: Opera House foyer/auditorium, private conversation area · Decision: auditorium with a central acrobatic stage and tiered seating; ≥2 enclosed private boxes with their own doors and an attendant; a foyer with a ticket desk; a scheduled acrobatic performance state; the box is the venue's private conversation area.

## 7. Docks and spacecraft

### V47 Coruscant Docks Pursuit — video page description
- Source: https://www.starwars.com/video/coruscant-docks-pursuit · Inspected: description text + duration (1:03) only; clip not watched.
- Obs: (1) "the Coruscant loading docks" with senators present — docks are reachable from civic circulation. (2) "knocked down by a dislodged freight container and nearly plunges to his death" — containers are stacked/suspended at height above open edges. (3) A two-person pursuit runs through the docks — long sightlines and a chase route exist between stacks.
- Informs: cargo terminal, commercial spaceport, fall consequence · Decision: docks have container stacks ≥3 high, a crane rail, an open edge with partial railing, and a marked fall-recovery ledge below; a container-dislodge hazard is a scripted event with recovery.

### V48 AA-9 Coruscant freighter — Databank entry
- Source: https://www.starwars.com/databank/aa-9-coruscant-freighter · Inspected: entry text (545 chars); dimensions "Length: 390.0m"; hero alt only; video tile "Episode II Teaser Trailer: Forbidden Love" (description only).
- Obs: (1) 390 m long — the largest hull family; must read as a wall of hull from the pad, so only a section can be playable. (2) "favored by refugees ... since travelers had no need to register themselves" — boarding without registration: a cheap-passage lane with no identity check, contrasting with the terminal's customs. (3) "outfitted with everything needed to carry a massive amount of people of various species ... including cafeterias and various servant droids" — a passenger deck with a cafeteria, service droids, and mixed-scale seating.
- Informs: AA-9 bulk freighter, commercial passenger terminal · Decision: AA-9 is built as a partial hull (nose + one boarding section, ≥120 m visible) docked at the commercial hub; the interior slice has a steerage passenger deck with mixed-scale benches, a cafeteria counter, one servant droid, and a cargo hold; boarding uses an unregistered gangway lane distinct from the ticketed gate.

### V49 Twilight — Databank entry
- Source: https://www.starwars.com/databank/twilight · Inspected: entry text (805 chars); dimensions "Length: 34.1m"; hero alt only.
- Obs: (1) A 34.1 m "battered spice freighter", "nondescript" — a light freighter with visible wear and no livery. (2) "surprisingly maneuverable" and "plenty of opportunities for tinkering with machinery" — exposed access panels and engine bays inside. (3) "difficult to keep spaceworthy ... barely held together long enough to land" — a persistent fault state is its identity.
- Informs: Twilight light freighter, ship repair hangar, Brin Tal's ship · Decision: the captain's light freighter is ~34 m with a forward cockpit, an amidships hold, one crew bunk, and an open engine-access corridor with patched plating; it always carries ≥1 active fault the repair hangar can fix (visible panel/behavior change + invoice).

### V50 Republic Cruiser — Databank entry
- Source: https://www.starwars.com/databank/republic-cruiser · Inspected: entry text (610 chars) + og:description (721 chars); dimensions "Length: 115.0m"; hero alt only.
- Obs: (1) "distinctive shape and hue ... indicating a vessel on a mission for the Galactic Senate, the Supreme Chancellor, or the Jedi Order" — color is the diplomatic signal († deep red; not verifiable here). (2) 115 m; it "docked within a ... cavernous landing bay" — it docks inside enclosed bays, not on open pads. (3) It carries "two important Jedi ambassadors" with a separate crew — a diplomatic salon distinct from the crew deck.
- Informs: Republic cruiser diplomatic transport, diplomatic/security spaceport · Decision: the diplomatic transport is ~115 m, docked inside the diplomatic facility's enclosed bay with a boarding tube; interior has a cockpit/crew deck and a separate diplomatic salon seating 6; its livery color is reserved for official craft.

### V51 Republic Attack Shuttle — Databank entry
- Source: https://www.starwars.com/databank/republic-attack-shuttle · Inspected: entry text (626 chars); dimensions "Length: 18.9m, Height: 24.34m"; hero alt only.
- Obs: (1) Height (24.34 m) exceeds length (18.9 m) — the listed configuration is tall, consistent only with upright wings († three-wing layout with side wings folding up when landed; not verifiable here). (2) "roomy interior lined with benches" — a cabin with bench seating both sides. (3) "ball-mounted swivel laser cannons that flank the ship's forward snout, as well as fixed laser cannon emplacements along the wing joints"; used as "principal transport for Republic officers, Senators and Jedi Knights" — armed but a VIP shuttle.
- Informs: Republic attack shuttle · Decision: shuttle = three-wing configuration, wings fold vertical on landing, boarding ramp under the nose, bench cabin for 8–10, two ball turrets flanking the snout, fixed cannons at the wing roots; it serves the Senate–Temple and diplomatic-facility routes.

### V52 Republic Attack Gunship (LAAT) — Databank entry (+ longer og:description)
- Source: https://www.starwars.com/databank/republic-attack-gunship · Inspected: entry text (628 chars) + og:description (1,125 chars); dimensions "Length: 17.69m, Height: 6.94m"; hero alt only.
- Obs: (1) "hunchback-style cockpit bubbles, wherein the gunship pilot and copilot/gunner sit in single file" — two tandem bubble canopies on the top-front. (2) Weapon callouts: "chin-mounted ... a pair of laser cannon turrets"; "dorsal surface ... two massive rocket launchers fed by a rear-mounted missile belts"; "splayed wings have a pair of automated bubble-turrets"; optional "bubble-turret cannons ... on articulated arms next to the troop cabin"; "air-to-air rockets ... on the ventral surface of each wing"; "a single tail-cannon that provides covering fire for troops ... leaving the gunship". (3) 17.69 × 6.94 m "infantry transport" — an open-sided troop cabin amidships; troops exit under tail-cannon cover. LATER-ERA note: Bad Batch appearance listed; use Clone Wars livery.
- Informs: LAAT gunship (security/troop transport) · Decision: gunship built to these callouts — tandem hunchback canopies, chin turrets, two dorsal launchers with rear belts, wing bubble turrets, ventral rockets, tail cannon, side-door troop cabin for 8 with grab rails; parked at the diplomatic/security facility and the Senate apron (V15).

### V53 Coruscant Air Taxi — Databank entry
- Source: https://www.starwars.com/databank/coruscant-air-taxi · Inspected: entry text (295 chars); dimensions "Length: 8.0m"; hero alt only.
- Obs: (1) "small open-air speeders that carry passengers" — no canopy; step-in boarding. (2) 8.0 m long — a driver plus 2–4 passengers, not a walkable interior. (3) "weaving between the towering buildings" — routes thread between towers at mid-height, so stands sit on building ledges.
- Informs: air taxi (local taxi/courier family), transit connections · Decision: the air taxi is an 8 m open-top speeder with a driver seat and a 3-seat bench; boarding is a seat-entry interaction (no walkable interior); taxi stands are ledge platforms on ≥4 buildings; fare 5–15 credits per SPEC §10.

## 8. Institutions and organized crime

### V54 Coruscant Guard — Databank entry (+ Coruscant History Gallery caption 15)
- Source: https://www.starwars.com/databank/coruscant-guard · Inspected: entry text (654 chars); location "Senate Office Building"; height 1.83 m; weapons pistol/rifle/RPS-6 rocket launcher; hero alt only. Plus https://www.starwars.com/coruscant-history-gallery caption 15 ("the elite Coruscant Guard" rescued Padmé from Ziro's club after a droid's call).
- Obs: (1) "elite group of clones ... led by Clone Commander Fox"; tasks: "keep the peace on Coruscant, to protect important buildings, and to supplement the job of the Senate Guard" — clone armor († red markings; not verifiable here), building posts, secondary to the Senate Guard inside the chamber. (2) They "escorted Jedi and other senatorial dignitaries" and hunted a fugitive across the city — escort and response roles; based at the Senate Office Building. (3) A protocol droid's call brought them to a club — they respond to reports citywide. LATER-ERA: pursuit of Yoda/Vader — ignore.
- Informs: Coruscant Guard skins, security station dispatch, escorts · Decision: Coruscant Guard skin = clone trooper, 1.83 m, faction-color markings, pistol/rifle; a squad room in the Senate Office Building; they escort the Jedi liaison and answer reported incidents in upper/mid districts only (the undercity is Underworld Police jurisdiction, V36).

### V55 Black Sun — Databank entry
- Source: https://www.starwars.com/databank/black-sun · Inspected: entry text (832 chars); hero alt "Black Sun syndicate" (alt only).
- Obs: (1) "Many of the organization's operatives had no idea that they were benefiting Black Sun, so layered and intricate were the fronts" — fronts within fronts; staff can be innocent. (2) Led by "a cabal of Falleen nobles" from a Mustafar fortress — leadership is offworld and aristocratic; local presence is via brokers. (3) "an underworld dispute between Black Sun and the Pyke Syndicate" over captives — the two syndicates are rivals.
- Informs: Black Sun faction identity, criminal-front business (Ral Drenn's brokerage) · Decision: the freight brokerage's staff are mostly unaware; only the manager and one clerk know; the illicit ledger points to an offworld Falleen contact (name original); Black Sun and Pyke contacts are rivals, and that rivalry is one of the two resolution paths.

### V56 Pyke Syndicate — Databank entry + "Who are the Pykes?" (supplementary)
- Source: https://www.starwars.com/databank/pyke-syndicate (entry text 501 chars; affiliations "Pyke Sentinels", "Kessel miners"; hero alt only) and https://www.starwars.com/news/who-are-the-pykes (article text).
- Obs: (1) "funneling illicit substances to Coruscant's most influential crime families" — Pykes are suppliers to Coruscant, so their presence is a smuggling contact, not a landlord. (2) Article: "they worked with couriers like the Martez sisters to move their cargo" and "had connections in the Galactic Senate who turned a blind eye" — courier jobs and a Senate-level blind spot are the hooks. (3) Appearance: an "odd fishlike" elongated head; the head-to-foot protective suits are Kessel-specific and LATER-ERA — use the head silhouette only.
- Informs: Pyke smuggling contact, Brin Tal's questionable charter, Senate cargo-inspection scenario · Decision: one Pyke contact NPC (fish-like head silhouette, no Kessel suit) at the undercity wharf offers a "questionable charter" courier job; the Senate cargo-inspection scenario can expose or protect this route.

## 9. Clinical equipment

### V57 Bacta Tank — Databank entry
- Source: https://www.starwars.com/databank/bacta-tank · Inspected: entry text (487 chars); hero alt "Bacta Tank" (hero image file is from The Book of Boba Fett — LATER-ERA; alt only).
- Obs: (1) "large vessels filled with a liquid healing agent" — a translucent cylinder taller than a person, lit from within. (2) "patients were completely submerged and used breathing masks" — the patient floats upright with mask and hose while staff monitor from outside. (3) Clone-era precedent: "Clone troopers were treated in bacta at facilities such as the Kaliida Shoals Medical Center"; Hoth and Boba's pod are LATER-ERA.
- Informs: bacta tank clinic (Dr. Nera Vos) · Decision: the clinic treatment room has 1–2 upright translucent tanks with mask/hose rig, a monitoring console, a staff step platform, and a rear drain/service hatch (service access); treatment consumes medical supplies and occupies a tank for a timed state.

## 10. Original designs (no documented interior in the inspected sources)

Per SPEC §3, layouts for the following are labeled **original game design**; the fetched text gives purpose, staff, or occupancy at most, never a floor plan.

- Senate: delegation suites (≥12), committee/hearing rooms, petition office, press gallery, records area, security screening, diplomatic reception, staff services, the full service route, and the Senate Office Building interior (text gives only that the building exists, houses offices, and bases the Coruscant Guard).
- Senate chamber pod geometry, ring count, and podium detail beyond "viewing platforms that lined the curved walls" (V10) — pod movement marked †.
- Jedi Temple: exact plans of the Great Hall, briefing room, security station, labs, hangar, archives stacks, vault door, healer's room, quarters, training hall, garden, Chamber of Judgment, memorial hall, and the service wing (all attested as rooms in V22–V33; none with documented dimensions); guest reception desk and dispatch board are original.
- Dex's Diner kitchen, ingredient storage, washing area, delivery door, and staff belongings (only the dining room, staff, and menu drinks are attested, V45).
- Galaxies Opera House foyer, ticket desk, backstage, dressing rooms, technical access, and tiering (only "private box", elite clientele, and an acrobatic Mon Calamari performance are attested, V46).
- AA-9 interior plan (only "cafeterias and various servant droids" and unregistered passage are attested); Twilight interior (only tinkering-friendly machinery and fragility); Republic Cruiser interior (only crew + ambassadors); attack shuttle cabin beyond "benches"; LAAT cabin layout beyond the listed weapons and "troop cabin"; air taxi seat count.
- Level 1313 repair shop back rooms and living quarters; wharf program (broker kiosk, tie-downs); laundromat back-of-house illicit layer; Underworld Police station interior (only an "Industrial Zone Detention Center" is attested by title); Coruscant Guard squad room.
- Black Sun local front, Pyke contact location, freight-level gang, and salvage cooperative — original scenario content per SPEC §14; only broad faction identity is sourced (V55–V56).
- Bacta clinic reception/triage, examination, recovery, storage, staff station, and emergency access (only the tank and its use are attested, V57).
- All other SPEC §7 programs — passenger terminal, cargo terminal/warehouse (V20 attests a warehouse set exists, LATER-ERA, not viewed), repair hangar, droid workshop, market arcade, worker and affluent apartments, transit interchange (V35 attests "subways"), security station, utility/reclamation plant, salvage yard, community hall and rooftop garden — are original.
- The five-spire arrangement, Senate Guard helmet/robe, Republic Cruiser hue, attack shuttle wing fold, Coruscant Guard markings, diner shell, and opera stage form are marked † above: widely known on-screen looks that this text-only pass could not verify and that must be checked against the cited images before final art.
