# Nonadjacent retained-isolate `G4..G10` cone search run and marked-parent `CR6/G4` adaptation — 2026-09-02

Handoff `HANDOFF_2026-09-02.md`, Section 10 steps 3 and 4. Correctness rules of
Section 0 apply verbatim: LP infeasibility is a **cone obstruction only**; LP
feasibility would not be a theorem until an exact rational replay passes.

## Part 1 — step 3: prepared strengthened nonadjacent search, now run

Producer (unchanged, hash verified before the run against the pristine copy):

```text
search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py
  SHA256 130A63B41776C4FD009FF495942996304D502AFE83E5C0CC4DBAF246C9D1E000
```

Pre-run source review: the script imports
`search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_root`
(9FAE7B53E374EB8189C47ACA511A7A559E9FD0BED170D3EA28B9F4CB43A866DA, which in turn
configures the sparse solver
`search_iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_ipm_root.py`,
1FF4512F7711B51DC182A9AF10FCD1BE0EC7EDBC4B5DBFD9A6021E2C095C44A6) and
`derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py`
(EDF3FDE4DF9633805221A63634A386E96945892186AD493AF678F360233BB4E9). No
hard-coded Windows paths (all paths are `Path(__file__).resolve().parent`
relative); no thread/env settings in the codebase (only `HANDELMAN_BRANCH`);
input pinned to `iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json`
(239ED96A...). Its `OUTPUT` constant is
`iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_root_20260901.json`
(date fixed by the producer on 2026-09-01); that file did not exist anywhere, so
nothing was overwritten. The producer was nevertheless run in a scratch copy
`/tmp/g4_ws` (`cp -a /tmp/gdrive/x /tmp/g4_ws`) so the working copy was not
touched by the run; the resulting report was copied back unchanged under the
producer's own output name (kept so the report name matches the pinned
producer's `OUTPUT`; content hash below identifies it).

Run parameters: tmux session `g4-ipm-search`, pid 15862,
`OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 PYTHONDONTWRITEBYTECODE=1`,
`python3 -u`, HiGHS IPM via scipy 1.18 `linprog(method="highs-ipm", presolve=True)`.
Start 06:23:45 UTC, end 06:56:19 UTC.

Result (report copied verbatim from the scratch run):

```text
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_root_20260901.json
  SHA256 7C812A6CC0A6FEC19E40942C33CF34CE4AE8E7D494937DF34E697DFBD05B6CB8
  marker SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_NONADJACENT_COMMON_G4_FROZEN_IPM_ROOT
  branch nonadjacent_u0_v0
  success false, status 2
  message "The problem is infeasible. (HiGHS Status 8: model_status is Infeasible; primal_status is None)"
  variables 26: CA2..CA7, CB2..CB7, CR6, CW2..CW7, CZ3..CZ7, HX, s
  coefficient_rows 27405
  atoms 545691
  matrix_nonzeros 32503580
  linear 40, quadratic 32, cubic 17, quartic 15, frozen_cells 271 (249 + 22 G4), equalities 4
  positive_atoms []
  source_sha256 130A63B4...E000, input_sha256 239ED96A...84FE
```

Runtime and memory: `real 32m33s` (`user 32m25s`); sparse assembly finished
at about 2.5 min, HiGHS ran about 30 min single-threaded. `VmRSS` sampled every
120 s from `/proc/15862/status`: peak `VmHWM` 5,090,316 kB (~4.9 GB) during
presolve/factorization, steady 4.2–4.3 GB afterwards; never near the 9 GB kill
threshold, so the process was not killed. Comparison: the older `G5..G10`
nonadjacent cone had 433,700 atoms / 22,770,856 nonzeros / 23,751 rows.

```text
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_stdout_20260902.txt
  SHA256 BB1EDF65EAE1A483B3C358B99FC38BEAF48131274980F0C2EC00234659F61679
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_rss_monitor_20260902.txt
  SHA256 CA9AECA7EAFF79412EAF154352AFED67FC08EEDDBBA0A5B357A80259CE45F33E
```

**Verdict: INFEASIBLE — cone obstruction only.** The degree-four
product-closed Handelman cone over the nonadjacent common-compatible minor
with all frozen `G4..G10` cells and the `CR6=i_6(R)` coordinate does not
contain the `nonadjacent_u0_v0` q-free lower target. This is not a negative
forest cell, not a counterexample, and not evidence against the conjecture. No
exact replay is applicable (nothing to reconstruct); no PASS marker was
written. Add this report to the Section 9 obstruction list.

Anomalies / caveats noted:

- The report's dependency hashes (inherited from the base `main`) record only
  the mark-neighborhood and mark-cross-edge sources; they do not embed the
  `nonadjacent_common_frozen_cells` (4FF5F0E2...) or `nonadjacent_common_g4`
  (EDF3FDE4...) derive sources. They are pinned here instead.
- The producer's `OUTPUT` name carries the date `20260901` although the run
  happened on `20260902`; content hash `7C812A6C...` and the stdout log are the
  authoritative record.

## Part 2 — step 4: marked-parent nonadjacent cores adapted to `CR6/G4`

New producers, following exactly the way
`search_iso_n6_bundle_g1_marked_parent_pair_t0_adjacent_common_low_frozen_ipm_root.py`
extends its retained-isolate analog: import the strengthened retained-isolate
module as `configured`; reuse `configured.enhanced_frozen_cells` (adds the 22
`G4` cells), `configured.enhanced_build_constraints` (adds the four linear
`R6_in_A7, R6_in_B7, R6_in_W6, R6_AB_union_W6` and the quadratic
`extension_R6`), and `configured.solve_with_cr6` (keeps `CR6` in the variable
tuple); the marked wrappers additionally zero-augment `CB2` and `CZ3` as the
unrun `..._nonadjacent_common_frozen_ipm_root.py` sources do. One deliberate
addition to the pattern: `main()` refuses to run if its `OUTPUT` already
exists (never-overwrite convention).

```text
search_iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_g4_frozen_ipm_root.py  (2053 bytes)
  SHA256 828D1233800D1D4D3FF71BBFDEAD409D512289EBEBB78EE9BF9D785545126850
  branch nonadjacent_t0_u0_v0
  OUTPUT iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_g4_frozen_ipm_search_root_20260902.json
  MARKER SEARCHED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_T0_NONADJACENT_COMMON_G4_FROZEN_IPM_ROOT
search_iso_n6_bundle_g1_marked_parent_pair_t1_nonadjacent_common_g4_frozen_ipm_root.py  (2062 bytes)
  SHA256 F7D5841DFE538802AFEE1247886ABD562E0214F7CE7C582B25E9654BD0C515FE
  branch nonadjacent_t1_u0_v0
  OUTPUT iso_n6_bundle_g1_marked_parent_pair_t1_nonadjacent_common_g4_frozen_ipm_search_root_20260902.json
  MARKER SEARCHED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_T1_NONADJACENT_COMMON_G4_FROZEN_IPM_ROOT
  INPUT iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json
        (715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F, pinned)
```

Verification performed WITHOUT solving (no LP was launched for these):

1. Both scripts import cleanly; `main()` was executed with `base.main`
   stubbed to a no-op to confirm the configuration it installs:
   `base.solve -> <script>.solve_with_full_coordinates`,
   `base.build_constraints -> ..._g4_frozen_ipm_root.enhanced_build_constraints`,
   `base.frozen_cells -> ..._g4_frozen_ipm_root.enhanced_frozen_cells`.
2. Generator build (`build_constraints(..., generators_only=True)`): 26
   variables (`CA2..CA7, CB2..CB7, CR6, CW2..CW7, CZ3..CZ7, HX, s`), 40 linear,
   32 quadratic, 17 cubic, 15 quartic, 271 frozen cells (35 of them `G4`:
   13 base pairs + 22 common-minor cells), 4 equalities — identical counts to
   the Part 1 cone. An assumption-free hash of every generator (`Poly.terms()`
   keyed by variable name) is identical for the retained-isolate `G4` cone and
   both marked cones: `AF2F6444384B981657EEC3BA2CB3D9E4F9F84E3B1D9C4CF0F99535733AB23D09`.
   Only the right-hand side differs (target has 81 nonzero coefficients for
   `t0`, 82 for `t1`, 96 for the retained-isolate target).
3. Full sparse matrix assembly with `base.linprog` replaced by a stub (HiGHS
   never invoked): for `t0` and for `t1`, `shape=(27405, 545691)`,
   `nnz=32503580`, `frozen_cells=271`, assembly 155 s each, ~2 GB RSS. No file
   was written into the workspace by these dry runs.

Consequence: the marked `t0/t1` cones are the same 545,691-atom /
32,503,580-nonzero matrix as the Part 1 cone that just solved in ~30 min at
~5 GB peak, so each marked solve should cost about the same. Since the
Part 1 LP was infeasible with the retained-isolate right-hand side, this says
nothing yet about the marked right-hand sides; they must be solved separately
(one at a time on this machine). Not launched here.

## Files added to `erdos993_goal` on 2026-09-02 (this task)

```text
search_iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_g4_frozen_ipm_root.py
  828D1233800D1D4D3FF71BBFDEAD409D512289EBEBB78EE9BF9D785545126850
search_iso_n6_bundle_g1_marked_parent_pair_t1_nonadjacent_common_g4_frozen_ipm_root.py
  F7D5841DFE538802AFEE1247886ABD562E0214F7CE7C582B25E9654BD0C515FE
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_root_20260901.json
  7C812A6CC0A6FEC19E40942C33CF34CE4AE8E7D494937DF34E697DFBD05B6CB8
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_stdout_20260902.txt
  BB1EDF65EAE1A483B3C358B99FC38BEAF48131274980F0C2EC00234659F61679
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_rss_monitor_20260902.txt
  CA9AECA7EAFF79412EAF154352AFED67FC08EEDDBBA0A5B357A80259CE45F33E
ISO_N6_BUNDLE_G1_NONADJACENT_G4_SEARCH_RUN_2026-09-02.md  (this note)
```

No existing file was modified or overwritten. The pristine original at
`/tmp/gdrive/x` was not modified. Scratch copy `/tmp/g4_ws` contains the same
report plus `__pycache__`-free state and can be deleted.
