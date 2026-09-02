# Linux replay audit of the Erdős #993 certified assemblers/audits (2026-09-02)

Independent replay, on Ubuntu / Python 3.12.3 (sympy 1.14.0, numpy 2.4.4, scipy 1.18.1, networkx 3.6.1, python-flint 0.9.0), of the top-level `assemble_*` / `audit_*` / `census_*` / `derive_*` producers named in `docs/HANDOFF_2026-09-02.md`. Everything ran inside a scratch copy `/tmp/replay_ws` (`cp -a /tmp/gdrive/x`); the pristine transfer `/tmp/gdrive/x` and the repo copy `erdos993_goal/` were never written. After each run the replayed report was copied to `/tmp/replay_out/<id>/` and the pristine file was restored so that later hash-pinned scripts saw the original inputs. Machine-readable version: `reports/replay_audit_linux_20260902.json`.

## Headline

- 18 scripts replayed, 18 exit 0, 0 timeouts, 0 failures; all 18 emitted their expected PASS marker.
- 7 reports byte-identical (SHA256) to the originals; 11 identical after normalising Windows CRLF line endings (or one trailing newline for the stdout-only script); 0 with any numerical/content difference.
- All 11 report hashes quoted in the handoff for these scripts match the pristine files (0 mismatches).
- No script needed a `_linuxwrap` copy: no hard-coded `C:\Users\chris` paths, multiprocessing or platform calls; every script re-hashed itself to its pinned `source_sha256`.
- 7 of the 18 scripts are hash-only dependency assemblers/audits (no mathematics recomputed); 11 recompute exact symbolic identities and/or finite censuses.
- Longest run 76.7 s, peak RSS 101.9 MB (pinned to 2 cores, nice 5).

## Results table

| # | Script | Kind | Exit | Wall (s) | Marker | Original SHA256 (pristine) | Replayed SHA256 (Linux) | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | `assemble_iso_n6_bundle_g2_g10_root.py` | hash-only | 0 | 0.1 | yes | `6AE97573C08C…` | `6AE97573C08C…` | byte-identical |
| 2 | `audit_iso_n6_bundle_g2_g10_independent_root.py` | hash-only | 0 | 0.09 | yes | `DEA1F857E6AD…` | `DEA1F857E6AD…` | byte-identical |
| 3 | `assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py` | hash-only | 0 | 0.09 | yes | `775797AE5909…` | `775797AE5909…` | byte-identical |
| 4 | `audit_iso_n6_bundle_g2_complete_independent_root.py` | hash-only | 0 | 0.09 | yes | `139408F0ACA2…` | `139408F0ACA2…` | byte-identical |
| 5 | `assemble_iso_all_forest_n4_bundle_induction_root.py` | recompute | 0 | 1.46 | yes | `28682176B3A1…` | `22340B9ADAF8…` | identical modulo CRLF->LF |
| 6 | `assemble_iso_all_forest_n4_independent_g1_bernstein.py` | recompute | 0 | 4.26 | yes | `7F342F94B55F…` | `AFDED2319AF0…` | identical modulo one trailing newline (stdout capture) |
| 7 | `audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py` | recompute | 0 | 1.56 | yes | `0D341C165A35…` | `967692590EA3…` | identical modulo CRLF->LF |
| 8 | `assemble_pointed_hall_full_payment_forest_wr_root.py` | recompute | 0 | 4.89 | yes | `B5363CE23A80…` | `EA40555EF797…` | identical modulo CRLF->LF |
| 9 | `assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py` | symbolic | 0 | 0.43 | yes | `A8342E886D4C…` | `A8342E886D4C…` | byte-identical |
| 10 | `audit_rank7_final_integration.py` | hash-only | 0 | 0.23 | yes | `3052B52A9AB7…` | `EECA614E0C96…` | identical modulo CRLF->LF |
| 11 | `assemble_rank8_forest_q8_pgc_complete_root.py` | hash-only | 0 | 0.14 | yes | `262B9D9C1B72…` | `83ED2EE43A5E…` | identical modulo CRLF->LF |
| 12 | `audit_rank8_forest_q8_pgc_complete_root.py` | hash-only | 0 | 0.12 | yes | `C46C4D3868AB…` | `3BF6E472A236…` | identical modulo CRLF->LF |
| 13 | `audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py` | recompute | 0 | 3.37 | yes | `44C73A646B5D…` | `44C73A646B5D…` | byte-identical |
| 14 | `audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py` | recompute | 0 | 76.65 | yes | `E5008550DB27…` | `E5008550DB27…` | byte-identical |
| 15 | `audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py` | recompute | 0 | 0.56 | yes | `00CF63EF72E4…` | `5235E5EEE0C2…` | identical modulo CRLF->LF |
| 16 | `audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py` | recompute | 0 | 7.64 | yes | `338225DD6409…` | `067A0CA95E4B…` | identical modulo CRLF->LF |
| 17 | `census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root.py` | recompute | 0 | 74.87 | yes | `08CD091C18BF…` | `D69391793F53…` | identical modulo CRLF->LF |
| 18 | `derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py` | recompute | 0 | 8.62 | yes | `D9A60761BF75…` | `DD66B355F6F0…` | identical modulo CRLF->LF |

Full 64-hex hashes, commands, report paths and diff summaries are in the JSON deliverable. Handoff-quoted hashes (items 1–4 and the six G1 files, plus the rank-8 theorem report) all matched the pristine copy.

## Per-script detail

### 1. rank-six G2..G10

**1. `assemble_iso_n6_bundle_g2_g10_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_iso_n6_bundle_g2_g10_root.py`  
Exit 0 in 0.1 s; marker `PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT` printed: True; report: `iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json`  
Original SHA256 `6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1`  
Replayed SHA256 `6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1`  
Handoff hash `6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1` matches pristine: True  
Byte-identical: **True** — none  
What it does: Rechecks SHA256 of 5 pinned producer scripts + 5 pinned reports, asserts their marker/field strings, emits a coefficient-partition record {2},{3},{4},{5..10}. No polynomial is evaluated.

**2. `audit_iso_n6_bundle_g2_g10_independent_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g2_g10_independent_root.py`  
Exit 0 in 0.09 s; marker `PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT` printed: True; report: `iso_n6_bundle_g2_g10_independent_audit_exact_root_20260831.json`  
Original SHA256 `DEA1F857E6AD61ACE3035E6D1BA93E09E363B0A86706458FB85EA029200F2C82`  
Replayed SHA256 `DEA1F857E6AD61ACE3035E6D1BA93E09E363B0A86706458FB85EA029200F2C82`  
Handoff hash `DEA1F857E6AD61ACE3035E6D1BA93E09E363B0A86706458FB85EA029200F2C82` matches pristine: True  
Byte-identical: **True** — none  
What it does: Rechecks assembler+assembly hashes and 5 report pins; verifies the closed-coefficient blocks are disjoint and union to {2..10}. Set arithmetic only; no mathematics recomputed.

**3. `assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py`  
Exit 0 in 0.09 s; marker `PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_ALL_PARENT_MODES_ROOT` printed: True; report: `iso_n6_bundle_g2_all_geometries_all_parent_modes_assembled_exact_root_20260831.json`  
Original SHA256 `775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645`  
Replayed SHA256 `775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645`  
Handoff hash `775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645` matches pristine: True  
Byte-identical: **True** — none  
What it does: Rechecks 2 pinned geometry assemblers + 2 reports (adjacent / nonadjacent marks), asserts markers. No mathematics recomputed.

**4. `audit_iso_n6_bundle_g2_complete_independent_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g2_complete_independent_root.py`  
Exit 0 in 0.09 s; marker `PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT` printed: True; report: `iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json`  
Original SHA256 `139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70`  
Replayed SHA256 `139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70`  
Handoff hash `139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70` matches pristine: True  
Byte-identical: **True** — none  
What it does: Rechecks assembler/assembly hashes, transitively re-hashes every file pinned by the two geometry reports (18 files), checks the 5 parent-mode labels per geometry. No mathematics recomputed.

### 2. rank-four N4 chain

**5. `assemble_iso_all_forest_n4_bundle_induction_root.py`** — hash-pinned + finite exact recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_iso_all_forest_n4_bundle_induction_root.py`  
Exit 0 in 1.46 s; marker `PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT` printed: True; report: `iso_all_forest_n4_bundle_induction_exact_root_20260829.json`  
Original SHA256 `28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C`  
Replayed SHA256 `22340B9ADAF8051FEF5ED08498B4C2375CF34A07A68C5615FB8FCB9A2F29AE78`  
Byte-identical: **False** — original has 148 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Rechecks 9 dependency report/source hash pairs (the all-order theorem is dependency-pinned). Then genuinely recomputes, with exact integers on every forest of order 2..6 (452 marked cells, 296 bundle cells), the deepest-support classifier, the Gamma telescope and all seven forward differences (g5=50, g6=0, g4>=33|C|+12 asserted). This finite census is an implementation audit, not the proof.

**6. `assemble_iso_all_forest_n4_independent_g1_bernstein.py`** — hash-pinned + symbolic recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_iso_all_forest_n4_independent_g1_bernstein.py`  
Exit 0 in 4.26 s; marker `PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN` printed: True; report: `iso_all_forest_n4_independent_assembly_g1_bernstein_20260829.json`  
Original SHA256 `7F342F94B55F185878AF42CFBC37C30D391880E515B882D2EBF599518AE895DA`  
Replayed SHA256 `AFDED2319AF0935CAC728DCDE77C0C52E2A3602881258E63333423D750294AE4`  
Byte-identical: **False** — script writes no file; its stdout JSON (before the marker line) was compared with the stored capture iso_all_forest_n4_independent_assembly_g1_bernstein_20260829.json, which has one extra trailing blank line. Parsed JSON identical (incl. source_sha256 30AF98FB...).  
What it does: Independent assembler (does not import the root). Rechecks 9 pinned dependency pairs and audits the root report as a target; rebuilds the generic whole-bundle Gamma polynomial in SymPy and compares with the pinned symbolic report; exact atlas census orders 2..7 (78 forest types, 2448 ordered marked cells, 0 negative N4). Writes nothing: the report is printed to stdout.

**7. `audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py`** — hash-pinned + symbolic recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py`  
Exit 0 in 1.56 s; marker `PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12` printed: True; report: `iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json`  
Original SHA256 `0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21`  
Replayed SHA256 `967692590EA33E7C5E4EC7EC7C09C4DCEC1A9708F274A608D7847A5D9E8AF10C`  
Byte-identical: **False** — original has 224 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Pins the root assembler (9A11F120...) and its Windows-produced report (28682176...); re-derives the generic Gamma certificate coefficients in SymPy, the g4 remainder identity, low-rank N2/N3 path formulas, and re-runs a finite census. The all-order statement remains the pinned induction.

### 3. WR / ISO bridge

**8. `assemble_pointed_hall_full_payment_forest_wr_root.py`** — hash-pinned + finite exact recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_pointed_hall_full_payment_forest_wr_root.py`  
Exit 0 in 4.89 s; marker `PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO` printed: True; report: `pointed_hall_full_payment_forest_wr_exact_root_20260829.json`  
Original SHA256 `B5363CE23A80DA7161DAE1DECC0BA78C99F35C074E42B96614454D9071EC6F85`  
Replayed SHA256 `EA40555EF797C52ED883650BF66F996E21F284D178100A2A0934801773FBEB3A`  
Byte-identical: **False** — original has 46 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Rechecks 3 producer/report pin pairs, then exactly recomputes: binomial-capacity arithmetic for every alpha<=10000 with alpha mod 3 in {0,2} (6666 cells), and on all 79 forests of order <=7 the maximal-set bound m_k<=2^k, leaf/isolate recurrences, all 181 pointed maximum-set instances, boundary-set payment allocation (max load ratio 1/3). The all-order WR theorem is the displayed argument + pins, not the atlas.

**9. `assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py`** — symbolic identity only; dependencies are prose, not hash pins  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py`  
Exit 0 in 0.43 s; marker `PASS_EXACT_FIXED_RANK_THREE_HALVES_TO_ISO_BRIDGE_R3_R6` printed: True; report: `fixed_rank_three_halves_to_iso_bridge_r3_r6_root_20260829.json`  
Original SHA256 `A8342E886D4CF6F248F797E8017A070497534DB55B1245646FFD7DE2B649C426`  
Replayed SHA256 `A8342E886D4CF6F248F797E8017A070497534DB55B1245646FFD7DE2B649C426`  
Byte-identical: **True** — none  
What it does: Verifies in SymPy the identity ISO_r = S_r/2 + p_{r-1}^2 + p_{r-1}p_r/2, the prefix thresholds {3:6,4:7,5:9,6:10} against the cutoff for alpha<1000, and the 9K1 rank-5 boundary numbers. Its four rank-3..6 three-halves dependencies are cited by markdown file name only; nothing is hashed or loaded.

### 4. rank-7 / rank-8

**10. `audit_rank7_final_integration.py`** — hash-only + stored-result bookkeeping  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_rank7_final_integration.py`  
Exit 0 in 0.23 s; marker `PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP` printed: True; report: `rank7_final_integration_independent_audit_exact_20260820.json`  
Original SHA256 `3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE`  
Replayed SHA256 `EECA614E0C969FC6EBB9825B56E410857A81CA05A97B82141EEBF9D9BDEF33C3`  
Byte-identical: **False** — original has 213 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Re-hashes 43 immutable inputs of the rank-7 integration; checks that the 8 stored Delta0 job tables contain exactly the expected (n,m,face,q) key sets for n=27..38 with every row pass=True/returncode 0; checks the m-partition 120+312+324=756; asserts 9 sub-audit status strings. No inequality is recomputed. Three of the accepted sub-audit statuses are themselves labelled *_NO_FRESH_REPLAY_LOW_RAM / NO_REPLAY.

**11. `assemble_rank8_forest_q8_pgc_complete_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 assemble_rank8_forest_q8_pgc_complete_root.py --low-low-theorem rank8_low_low_a23_full_bridge_root_20260826.json --expected-low-low-theorem-sha256 9B08A867837B31147A88E6D458288EB813D8D28FB8770EC3ECDC45E73642FAE8 --low-low-audit rank8_low_low_a23_full_bridge_independent_audit_root_20260826.json --expected-low-low-audit-sha256 1550684D641A605FB67E921E9A3C22878E7DA501C98F45F7C572BA8E90DCAF47`  
Exit 0 in 0.14 s; marker `PASS_EXACT_AND_INDEPENDENT_RANK8_FOREST_Q8_AND_PGC_COMPLETE` printed: True; report: `rank8_forest_q8_pgc_complete_root_20260826.json`  
Original SHA256 `262B9D9C1B7248468EBC45942896CA5693BA756DFFC2D74054343D68012EB4DC`  
Replayed SHA256 `83ED2EE43A5E4FF80C60C66CD0F108421719B7BA289AE10D4ED28418258E08D7`  
Handoff hash `262B9D9C1B7248468EBC45942896CA5693BA756DFFC2D74054343D68012EB4DC` matches pristine: True  
Byte-identical: **False** — original has 57 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Requires CLI arguments (low/low theorem+audit paths and their hashes, reconstructed from the original report's immutable_inputs). Rechecks 22 pinned reports and asserts status/field strings (1215 jets, 4900+2159=7059 cells, 521-position universe). No mathematics recomputed.

**12. `audit_rank8_forest_q8_pgc_complete_root.py`** — hash-only  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_rank8_forest_q8_pgc_complete_root.py --theorem rank8_forest_q8_pgc_complete_root_20260826.json --expected-theorem-sha256 262B9D9C1B7248468EBC45942896CA5693BA756DFFC2D74054343D68012EB4DC`  
Exit 0 in 0.12 s; marker `PASS_INDEPENDENT_FAIL_CLOSED_RANK8_FOREST_Q8_AND_PGC_NO_PARTITION_GAP` printed: True; report: `rank8_forest_q8_pgc_complete_independent_audit_root_20260826.json`  
Original SHA256 `C46C4D3868AB842EA17F80CA690429F110514B967DCD98E24148B84DA5F6E396`  
Replayed SHA256 `3BF6E472A23698BF9086F2675B687793B612ACD908B81B6494651587EE3767AD`  
Byte-identical: **False** — original has 20 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Requires --theorem/--expected-theorem-sha256. Rechecks all 22 immutable inputs of the theorem report and asserts field strings/booleans (problem_993_solved=False). No mathematics recomputed.

### 5. rank-six G1 (2026-09-01)

**13. `audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py`** — symbolic recomputation (input hash-pinned)  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py`  
Exit 0 in 3.37 s; marker `PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_REDUCTION_ROOT` printed: True; report: `iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_audit_root_20260901.json`  
Original SHA256 `44C73A646B5DD55ACB38B92689481C6F6A0217C47897575385FCE36004E368F2`  
Replayed SHA256 `44C73A646B5DD55ACB38B92689481C6F6A0217C47897575385FCE36004E368F2`  
Handoff hash `44C73A646B5DD55ACB38B92689481C6F6A0217C47897575385FCE36004E368F2` matches pristine: True  
Byte-identical: **True** — none  
What it does: Pins the coarse-q-lower input report; reconstructs G1 from the frozen bundle polynomial, forms the retained-isolate increment, proves affine D-dependence, rebuilds all 8 q-free branch lower bounds and compares exactly with the recorded expressions; checks retained-mark branch domination coefficientwise. Proves the reduction to two cores, not the cores' signs.

**14. `audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py`** — symbolic + finite exact recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py`  
Exit 0 in 76.65 s; marker `PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT` printed: True; report: `iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_audit_root_20260901.json`  
Original SHA256 `E5008550DB27119C99142F1007B69C37C57D509D9538D1F2AA958EC1864821B2`  
Replayed SHA256 `E5008550DB27119C99142F1007B69C37C57D509D9538D1F2AA958EC1864821B2`  
Handoff hash `E5008550DB27119C99142F1007B69C37C57D509D9538D1F2AA958EC1864821B2` matches pristine: True  
Byte-identical: **True** — none  
What it does: Pins the pair-lower input; reconstructs both eta=0/1 coupled increments symbolically, rebuilds the 16 branch lowers and their class hashes; then evaluates every actual coupled increment against its lower on all forests of order 2..7, all ordered mark pairs and all 2^n induced-minor masks (490,048 cells, min slack 0, 0 failures). Proves the reduction only.

**15. `audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py`** — symbolic recomputation from stored expressions  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py`  
Exit 0 in 0.56 s; marker `PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_MASK_DOMINANCE_ROOT` printed: True; report: `iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_audit_root_20260901.json`  
Original SHA256 `00CF63EF72E4C8A1E60F6A3732D58492E167BDA4210519878F3C5D94A1D76411`  
Replayed SHA256 `5235E5EEE0C2CF343157B3AC70CF22D9EAF380763BD47D1870D44A1CE01974F3`  
Handoff hash `00CF63EF72E4C8A1E60F6A3732D58492E167BDA4210519878F3C5D94A1D76411` matches pristine: True  
Byte-identical: **False** — original has 33 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Pins pair report + dominance certificate; recomputes the one-mark and two-mark increments from the stored branch expressions and compares coefficient-by-coefficient with the certificate (all coefficients strictly positive). Reduces 8 classes to 4 sign cores; proves no core sign.

**16. `audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py`** — symbolic recomputation from stored expressions  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py`  
Exit 0 in 7.64 s; marker `PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT` printed: True; report: `iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_audit_root_20260901.json`  
Original SHA256 `338225DD6409F8107C3967267F9ABF6C734BD494E7F62A8BFC9A7DFA0978222C`  
Replayed SHA256 `067A0CA95E4B309CE8602CFCBCE96776DC50188C84DC25B03F58D711B9276A8D`  
Handoff hash `338225DD6409F8107C3967267F9ABF6C734BD494E7F62A8BFC9A7DFA0978222C` matches pristine: True  
Byte-identical: **False** — original has 15 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Pins the H-K lower report + J-mask certificate; recomputes the j01/j10/j11 minus j00 differences for all 64 (geometry,e,t,k-mask) prefixes and checks coefficientwise nonnegativity against the certificate. Reduces 56 classes to 24 cores; proves no core sign.

**17. `census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root.py`** — finite exact recomputation (order 8 only)  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root.py`  
Exit 0 in 74.87 s; marker `PASS_EXACT_N8_CENSUS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_LOWER_ROOT` printed: True; report: `iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json`  
Original SHA256 `08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE`  
Replayed SHA256 `D69391793F53948389E0D8A6839ADA54AB53EF8E2EF5C7D8D60DAF2B9C46E4FC`  
Handoff hash `08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE` matches pristine: True  
Byte-identical: **False** — original has 664 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Pins the H-K lower report; enumerates all 76 nonisomorphic forests of order 8, all 2715 attachable deletion sets, all mark pairs, evaluating the applicable class lowers: 745,564 cells, 0 negative, global minimum 2751 (matches the handoff). Finite evidence only; no all-order statement.

**18. `derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py`** — symbolic + finite exact recomputation  
Command: `cd /tmp/replay_ws && timeout 1800 /usr/bin/python3 derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py`  
Exit 0 in 8.62 s; marker `PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON_G4_FROZEN_CELLS_ROOT` printed: True; report: `iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_exact_root_20260901.json`  
Original SHA256 `D9A60761BF7590BBA2E662E7D9BF960F2DAAA2CA669C9F34FEF114037642152F`  
Replayed SHA256 `DD66B355F6F0C472F86D7161693076ACCD0881FEB42A506AB5B7E7F846D19335`  
Handoff hash `D9A60761BF7590BBA2E662E7D9BF960F2DAAA2CA669C9F34FEF114037642152F` matches pristine: True  
Byte-identical: **False** — original has 82 CRLF line endings (Windows text-mode write_text without newline='\n'); Linux writes LF. Parsed JSON identical: every number, hash and string equal.  
What it does: Rebuilds the 22 nonadjacent common-minor G4 frozen cells (9 C-to-M, 13 M-internal) and the CR6 constraints from the frozen G4 coefficient in SymPy, then checks every cell and constraint on every nonisomorphic forest of orders 8 and 9 with every nonadjacent pair (0 negative, 0 row-formula failures). Also hashes the frozen G2..G10 assembly as a dependency.

## What these replays establish

- All 18 scripts run to completion on Linux with exit code 0 and emit their expected PASS marker.
- Every produced report is semantically identical (parsed JSON, including every numeric census value, symbolic expression hash, source_sha256 and input_sha256) to the report in the transferred workspace.
- 7 reports are byte-identical; 10 differ only because the Windows originals were written with CRLF line endings (write_text without newline='\n'); 1 script writes no file and its stdout matches the stored capture up to one trailing newline.
- All 11 report hashes quoted in the handoff for these scripts match the pristine files.

## What these replays do not establish (read this before quoting any PASS marker)

- No theorem is established by the 7 hash-only assemblers/audits (items 1-4, rank-7 audit, both rank-8 scripts): they prove that the pinned files are unchanged and that the recorded PASS strings/partition labels are present. The mathematical content lives in the leaf producers, which were not replayed here.
- The genuine recomputations (N4 chain, WR, the six G1 scripts) recompute exact symbolic identities and finite censuses (orders <= 9). Finite censuses are implementation audits and falsification evidence, never all-order proofs; the all-order N4 and WR theorems rest on the displayed structural inductions plus pinned dependencies.
- The rank-6 G1 coefficient remains open: the six 2026-09-01 scripts prove reductions/dominance and finite collars only, exactly as their scope guards state.
- assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py cites its rank-3..6 three-halves dependencies by markdown file name; it hashes nothing. 'ISO ranks 3-6' is therefore conditional on certificates this replay never touched.
- audit_rank7_final_integration.py accepts three sub-audits whose own status strings say NO_FRESH_REPLAY / NO_REPLAY (low RAM); the rank-7 chain has therefore not been fully re-derived from scratch either originally or here.
- Byte-identity of the CRLF reports cannot be reproduced on Linux without changing the scripts, and the downstream hash pins (e.g. the N4 audit pins 28682176... for the root report) are pins on Windows-produced bytes: re-running a producer in place on Linux would break every downstream pin even though the content is unchanged.
- Nothing here bears on Erdos Problem #993 being solved; the workspace's own status (4 of 6 gates, G1 open) is unchanged.

## Anomalies and observations

1. **CRLF reports.** Ten original reports were produced by `Path.write_text(...)` without `newline='\n'` on Windows and therefore contain CRLF. The handoff's phrase "replayed byte-identically" is true only on Windows for those ten; on Linux the same content hashes differently. Every downstream hash pin on such a report (e.g. `audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py` pins `28682176…` for the N4 root report, `assemble_rank8_forest_q8_pgc_complete_root.py` pins the rank-7 audit `3052B52A…`) is a pin on the Windows bytes. An in-place Linux re-run of any producer would invalidate every dependent assembler without any mathematical change. The scripts that used `newline='\n'` or `write_bytes` (items 1–4, 9, 13, 14) are platform-stable.
2. **`assemble_iso_all_forest_n4_independent_g1_bernstein.py` writes no report.** Its JSON goes to stdout; the stored `iso_all_forest_n4_independent_assembly_g1_bernstein_20260829.json` is a manual capture with one extra trailing newline. Content identical.
3. **Rank-8 scripts need CLI arguments** that are not recorded anywhere except implicitly in the original report's `immutable_inputs`; they were reconstructed from there (`rank8_low_low_a23_full_bridge_root_20260826.json` = `9B08A867…`, its audit = `1550684D…`, theorem = `262B9D9C…`).
4. **Seven of the eighteen scripts recompute nothing mathematical.** Items 1–4 (rank-six G2..G10), the rank-7 final audit and both rank-8 scripts only re-hash pinned files and check marker/partition strings. Their PASS on Linux confirms file integrity, not theorems. The rank-7 audit additionally accepts inputs whose own status strings say `NO_FRESH_REPLAY_LOW_RAM`.
5. **`assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py` has no hash pins at all**; its dependencies are prose references to four markdown theorem files. It is the only script in the set whose stated dependencies cannot be integrity-checked from the report.
6. Nothing failed, timed out, or produced a numerical difference. The finite census values quoted in the handoff (76 forests, 2,715 relation instances, 745,564 cells, minimum 2751; 22 G4 cells; 490,048 marked-parent cells) were reproduced exactly.

Artifacts kept outside the repository: `/tmp/replay_harness.py`, `/tmp/replay_results.json`, `/tmp/replay_logs/*.log`, `/tmp/replay_out/<id>/`.
