# Rank-eight Delta2 e=1 old-root all-arm-distances theorem

Date: 2026-08-25

Status: **proved by four disjoint, independently audited exact coverage
packages**.  This is an all-distance theorem only for old roots lying on an
arm of an `e=1` subdivided claw.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Root `T` at any old
vertex lying on one of its arms, and extend any one of the three arms by one
new leaf.  Then the `Delta2` coefficient of the rank-eight terminal residual
at the old root increases strictly.

If `near` is the number of vertices strictly between the center and the old
root, then the root is at arm distance `near+1` and `near` is an arbitrary
nonnegative integer.

## Exact all-distance partition

The arm-distance domain is partitioned into four pairwise-disjoint scopes:

| exact distance scope | proof package |
|---|---|
| `near in {0,3,4,...,18}` | grouped branch-stable finite certificate and literal-DP replay |
| `near=1` | separately sealed exact refinement certificate and generic tree-DP audit |
| `near=2` | separately sealed exact refinement certificate and generic tree-DP audit |
| `near>=19` | uniform four-variable transfer certificate and literal-DP replay |

The first three rows are disjoint and their union is exactly every integer
from 0 through 18.  The tail begins at 19, so the complete union is every
integer `near>=0` with no gap or overlap.

The grouped finite package replays 6,636 regions and 1,692,327 ordered Newton
coefficients, plus 10,437 literal adjacency-list increment checks and 13,916
literal core/root-deletion profile checks.  The uniform tail replays 588
regions and 2,778,888 ordered coefficients, plus 1,176 literal increments and
1,568 literal profiles.  The separately sealed `near=1,2` packages each use
their own exact refinements and independent generic adjacency-list/tree-DP
audits; neither is inferred from a neighboring distance.

Combined wrapper status:

```text
PASS_FINAL_WRAPPER_DELTA2_E1_OLD_ROOT_ALL_ARM_DISTANCES
```

## Exact evidence

```text
# Separately sealed near=1
rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json
  744FA3670F7573592E1C30171ED4E5BF8472B99ED2F688C8E11B9FF8EE666F9F
rank8_delta2_e1_old_root_near1_complete_independent_audit_agent_20260825.json
  65BB63C3B89438C5E37B37E945718E2EB6C335A76BE17EAE50AE5CAE1463DC12
RANK8_DELTA2_E1_OLD_ROOT_NEAR1_COMPLETE_THEOREM_2026-08-25.md
  3030D275C101395881C6364E3E7BC9BDB971558DA095213E527C89EAC285903A

# Separately sealed near=2
rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json
  3EA6C013BFFA1BD91DAB4471B710482AE92F3B0737C021E9280D9DF16DDD009D
rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json
  68F2A137EE7BF9253F4B964C52E3E7A45D683960D3C631997A9170D549D770FE
RANK8_DELTA2_E1_OLD_ROOT_NEAR2_COMPLETE_THEOREM_2026-08-25.md
  3DED65AFBA854E50840685CB6919F68BB943B74668FFF0BE9A5E84ABCF965D65

# Remaining finite set near in {0,3,...,18}
rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json
  8C0261ECA0C07D6AA5F21C465FABA5C1D51AA38BF231EC8B758D65D17F5C38F5
rank8_delta2_e1_old_root_remaining_finite_band_independent_audit_agent_20260825.json
  C6F0F2C3B697611BE6448FEDAE81A557D7020A5B7F8901F4E1F255C794811B73
RANK8_DELTA2_E1_OLD_ROOT_REMAINING_FINITE_BAND_THEOREM_2026-08-25.md
  4BC6225DA34065EAA4BFA0570BB4FEB4056C1F61F6B6BE7092E9430D9327C0CB

# Uniform tail near>=19
rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json
  D384FCC3B463CF9158CC0AC3912F88028D5968BEB664DDE5AAD2F9B772451D5F
rank8_delta2_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json
  D892691E1A27824F637C0F5E77AAEDEAF79AB92BB3BF74A708F6F7CF715FB698
RANK8_DELTA2_E1_OLD_ROOT_NEAR19_PLUS_UNIFORM_TAIL_THEOREM_2026-08-25.md
  F780155D4DF9A3BBC260A2E1AC45384001527959AEA1BE74619A4F28FEAE8F33

# Final exact distance wrapper
audit_rank8_delta2_e1_old_root_all_arm_distances_complete_agent_20260825.py
  32F65F86BF4A6C349D1F0E31161CE8B3AB74089F92F641466A2F1A3FD99854CA
rank8_delta2_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json
  E69EEA49DB3D58846772106F62779BD1437AAA3842472A46F19DB848B32A74A8
```

## Boundary

This theorem closes only the Delta2 strict arm-extension increment gate for
`e=1` subdivided claws rooted at an old arm vertex, for source orders at least
23.  It does not include the claw center, an inserted new leaf as root,
arbitrary trees, full `Q8/PGC`, forest independence-sequence unimodality, or
Erdős Problem 993.
