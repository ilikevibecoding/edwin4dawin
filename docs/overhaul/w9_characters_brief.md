# W9 brief — character appearance: faces, genders, species, outfits (spec sections 11, 13, 14; user note)

The user: "design and reiterate on dozens of Star Wars outfits, genders, all sorts of stuff. Make a hundred different
faces and swap them all out. Some need to be alien, like Star Wars aliens. Coruscant officers, Coruscant guards, their
blue traditional outfits. Go all out."

Owner files: new `src/npc/appearance/**` (faces, species, outfits, ranks, wear, the composer, contact sheet), a new
`scripts/skin-sheet.mjs` (renders contact sheets for the critic) and `scripts/test-appearance.mjs`. Read-only: the
existing `src/npc/skins.js` (the face rules a critic signed off: two separated eyes with iris + white, brow above, no
cyclops), `src/npc/model.js` (voxel humanoid: head/body/arms/legs boxes, UV layout, `buildStaticLOD`), `src/npc/blink.js`,
the population builder's `src/npc/skins-sw.js` and `src/npc/coruscant/**` when they land (W4). No edits to those files;
expose a clean API the integrator wires into W4's archetypes:
`composeAppearance(seed, { archetype, species, gender, age, rank, faction, wear })` -> `{ skin: canvas 64x64 (or the
model's UV size), overlays: [{ part, canvas }], geometry: [{ kind: 'lekku'|'montrals'|'horns'|'snout'|'antennae'|
'head_tendrils'|'crest'|'helmet'|'hat'|'backpack'|'satchel'|'cape'|'skirt', params }], palette, tags, id }` plus
`describeAppearance(id)` (a one-line description for dialog/critic use) and `APPEARANCE_STATS` (counts).

## Requirements

1. **Faces: >= 100 distinct human faces** from a combinatorial generator (skin tone x 12, eye colour x 8, eye shape x 5,
   brow x 5, nose x 4, mouth x 5, facial hair x 8 incl. none, hair style x 14 incl. none/bun/braids/mohawk/ponytail,
   hair colour x 10, age wrinkles/greying x 4, markings: freckles/scars/tattoos/face paint x 6). Faces must be
   distinct in pixels (test: pairwise Hamming distance of the face region >= 12% for the 100 canonical seeds) and must
   obey the eye rules. Genders: feminine/masculine/androgynous silhouettes through hair, brow, jaw shading, body
   proportions (the model supports per-NPC scale/width if `model.js` exposes params; otherwise shoulder/hip shading and
   hair only, documented), plus children (smaller scale) for residential/school archetypes.
2. **Species: >= 12 aliens** with recognisable Star Wars silhouettes done in voxel geometry + skin: Twi'lek (lekku, two
   head-tails; blue/green/red/yellow skins), Togruta (montrals + head-tails, white/red patterns), Zabrak (horn crown,
   facial tattoos), Rodian (green, snout, antennae, large dark eyes), Duros (blue-grey, large red eyes, no nose),
   Nautolan (green, head tendrils, black eyes), Mon Calamari (salmon, high domed head, bulging eyes), Bothan (furry,
   snout), Sullustan (jowls, large eyes), Gran (three eyes on stalks - keep it readable), Aqualish (tusks), Ithorian
   (hammerhead - long curved head, readable at 2 blocks), Weequay (leathery, braided topknot), Chagrian (horns + lethorns),
   Pantoran (blue skin, gold facial marks), Mirialan (green-tinged skin, diamond tattoos). Alien eyes follow their own
   rules (Rodian/Duros/Nautolan: two large dark eyes, still separated). Species distribution by district and archetype
   (senators from many worlds; undercity mixed; Coruscant Guard clones are human).
3. **Outfits: >= 40 named outfits** with role/faction meaning, including these uniforms (colours from the 501st
   costume references and Wookieepedia, fetched 2026-09-06):
   - **Senate Guard** (non-clone): deep blue robes over blue armour, large blue helmet with an open faceplate and a
     double plume (Clone Wars: robes worn open showing the armour; late war: plume removed, dark visor); a Senate
     Commando variant with armour only and helmet.
   - **Coruscant Guard** (clone shock troopers, human): white Phase I/II armour with dark scarlet markings - helmet
     dome fin, scarlet band above the brow, two vertical scarlet diamonds on the front, scarlet shoulder rings, black
     T-visor; weathered with grey scuffs; officer variant with red mohawk and forehead stripes; they patrol streets,
     guard government buildings and the detention centre and escort senators.
   - **Coruscant Security Force (civilian police)**: blue-grey / navy tunic and trousers with yellow, grey or white
     tactical gear by role (patrol officer, detective in a long coat, riot gear with a visored helmet), plus the
     GU-series police droid (grey humanoid droid with a visor slit) as a droid outfit.
   - **Coruscant Underworld Police**: grey armour plates over a dark jumpsuit, helmet with a wide visor, shoulder lamp.
   - Jedi: Knight (brown/cream layered robes, tabards, obi, boots), Padawan (braid), Master (long cloak), Temple Guard
     (gold/tan robes, featureless mask); Senators: 6 planetary styles (Naboo-style headdress, Alderaan-style gown,
     Chandrilan simple robe, Corellian formal jacket, Rodian trader sash, Mon Cala admiral-cut); Senate aide (grey
     tunic with a data pad); Chancellor's staff (dark red); journalist (jacket + holocam); medic (white with a red-cross
     armband); patient gown; pilot (orange or olive flight suit, chest box, helmet under the arm); mechanic (coveralls,
     goggles, tool belt); dock worker (vest, gloves, hard hat); cook (apron, cap); bartender (vest, sleeves); vendor
     (apron over street clothes); office worker (tunic, trousers, 4 colourways); resident (6 casual sets); tourist (loud
     patterns, camera); courier (satchel, cap); undercity jacket (patched, hood); Black Sun front manager (sharp dark
     suit, gold pin); Pyke contact (long coat, breathing mask); bounty hunter (mixed armour, helmet); performer (opera
     stage costume, sequins); child (school tunic); protocol droid (gold or silver plating, glowing eyes); astromech
     (domed cylinder, 3 colourways); sweeper droid (low box with brushes); GU police droid.
   Every outfit has 2-4 colourways and a wear level (clean government, working scuffs, undercity patches) that shows
   as texture detail, not colour swaps only.
4. **Composer**: deterministic by seed; picks species/gender/age/outfit consistent with the archetype and district
   rules given as options; produces the skin canvas by layering base skin -> face -> hair -> outfit -> insignia/wear ->
   overlays; geometry list for the species/outfit parts. Same seed -> same appearance (test).
5. **Contact sheets**: `scripts/skin-sheet.mjs` renders (offline, with `canvas` if available in node - check
   `node -e "require('canvas')"`; otherwise a CDP page that mounts the composer and screenshots) three sheets: 100
   faces (front view heads at 8x), 16 species (full body, front + side), 40+ outfits (front + back). Save under
   `/tmp/w9-sheets/` and copy the final three to `/opt/cursor/artifacts/skins_faces_sheet.png`,
   `skins_species_sheet.png`, `skins_outfits_sheet.png`.
6. **Tests**: `scripts/test-appearance.mjs` - counts (>= 100 faces distinct, >= 12 species, >= 40 outfits), eye-rule
   assertions on every human face (two eye regions, white + iris + pupil pixels, brow row above, no merged eyes),
   determinism, every outfit has >= 2 colourways and a wear variant, composer coverage for every archetype the
   population uses (read `docs/rubrics/07_city_life.md` criterion 5 for the list), texture memory estimate (target: one
   shared 2048x2048 atlas of 64x64 skins = 1024 slots, or documented per-NPC canvases with a cap).
7. **Performance**: composing an appearance <= 2 ms; the population spawns <= 150 live NPCs, so cache composed skins by
   id (LRU 512) and never allocate per frame.

## Verification
Sheets reviewed by eye (read the PNGs) and iterated until faces are varied and readable, species are recognisable at
a glance, uniforms match the descriptions above. Then a critic pass (integrator). Report with counts, sheet paths,
API, and the mapping table archetype -> allowed species/outfits.
