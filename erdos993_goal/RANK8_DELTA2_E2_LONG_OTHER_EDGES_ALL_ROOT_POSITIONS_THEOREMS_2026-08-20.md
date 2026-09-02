# Rank-8 Delta2: two scoped e=2 root-position theorems

## Result

Two exact coefficient packages prove strict positivity of the rank-8
terminal-broom Delta2 coefficient for the following rooted double-claw
subfamilies, for every order allowed by the stated length conditions.

1. **Pendant-root subfamily.**  The root may occupy any vertex of the selected
   pendant arm, and that selected arm has arbitrary positive length.  The
   paired arm and both pendant arms at the opposite branch have length at
   least 7, and the central bridge has length at least 8.
2. **Bridge-interior subfamily.**  The root may occupy any internal vertex of
   an arbitrary positive central bridge.  All four pendant arms have length at
   least 7.

These scopes are no-gap in the root position.  They do **not** prove Delta2
for all e=2 pendant or bridge roots: configurations having short non-selected
edges remain outside the package.

## Pendant-root certificate

`run_rank8_delta2_e2_pendant_other_edges_long_root_position_cells.py`

- SHA-256: `02AAF522C01D1D98CCFA9FF73DD26177E6A4248F0E212323F92B603C6BE82B8D`
- report: `rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json`
- report SHA-256: `67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D`
- status: `PASS_EXACT_RANK8_DELTA2_E2_PENDANT_OTHER_EDGES_LONG_ALL_ROOT_POSITIONS`
- exact split: the vertices strictly between root and branch (`near`) and
  between root and leaf (`tail`) are each fixed in 0..6 or are `X+7`.
- coverage: 8 x 8 = 64 ordered near/tail keys; 64 positive symbolic cells;
  no signed cells.

The root-position split is exhaustive because `near,tail` are nonnegative
integers and the selected-arm length is `near+tail+1`.  The two coordinates
are ordered: branch and leaf ends are not interchanged by the fixed rooted
description.

## Bridge-interior certificate

`run_rank8_delta2_e2_bridge_all_long_arms_gap_cells.py`

- SHA-256: `0DFC2FD9C10FF53F7232D319774F5224A6ABBC4ED19523D8EEB574A83D2B888A`
- report: `rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json`
- report SHA-256: `8826E88AB861F06731C7C8F6A913F6F27E54FC869EB8F48B53B8EE5053247C09`
- status: `PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_LONG_ARMS_ALL_ROOT_POSITIONS`
- exact split: the two numbers of vertices strictly between the root and the
  branch vertices are each fixed in 0..5 or are `X+6`.
- coverage: 28 unordered gap-state keys; 28 positive symbolic cells; no
  signed cells.

The gap split is exhaustive for internal roots, and reversal of the bridge
makes the two gap states unordered.  The paired pendant-arm sum variables are
swapped under the same reversal, so the 28 triangular keys are no-gap.

## Independent audit

`audit_rank8_delta2_e2_long_other_edges_root_positions.py`

- SHA-256: `7D05739567CCE0DD47FE701EAE72BB315D95BA72FA2E735A3FCE3673EDD27EE1`
- report: `rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json`
- report SHA-256: `AA143B4263215636C5E1984BC0295C4A6F7CFA385A777C8D0894550E22AB423C`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_OTHER_EDGES_ROOT_POSITIONS`

The audit pins every input hash, independently regenerates all 28 and 64
coverage keys, rebuilds every constant coefficient from literal double-claw
matching formulas, and rejects any missing, duplicate, signed, or nonpositive
cell.

## Dependencies

The packages use the exact sum-only identity for the two pendant arms incident
with a branch.  Its independent audit is:

- `audit_rank8_delta2_e2_long_pair_sum_identity.py`
- source SHA-256: `A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B`
- report SHA-256: `3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46`

The literal rank-8 coefficient construction is also pinned through
`probe_rank8_delta2_e2_symmetric_long_cells.py`, SHA-256
`4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36`.
