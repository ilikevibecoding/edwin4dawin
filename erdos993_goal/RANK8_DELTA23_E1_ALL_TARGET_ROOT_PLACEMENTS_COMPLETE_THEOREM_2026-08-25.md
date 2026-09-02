# Rank-eight Delta2/Delta3 e=1 all-target-root-placement theorem

Date: 2026-08-25

Status: **proved by a complete exact placement ledger whose component gates
all have independent literal adjacency-list/include-exclude tree-DP replays**.

## Theorem

Let `T` be an `e=1` subdivided claw of source order at least 23, and form
`T+` by extending any one arm with one new endpoint leaf.  Then every vertex
of `T+` satisfies the appropriate rank-eight `Delta2` and `Delta3` terminal
gate:

- If the root was already a vertex of `T`, the corresponding coefficient
  strictly increases from `T` to `T+`.
- If the root is the inserted leaf, the corresponding coefficient of `T+` is
  strictly positive.

## Exact placement partition

The vertex set of the target tree is the disjoint union

```text
V(T+) = V(T) disjoint union {inserted leaf}.
```

For both Delta2 and Delta3, the old-root ledgers cover every source vertex:
the center and every arm vertex at every integer distance, for all three arm
extensions.  The new inserted-leaf package covers the second placement class
for both ranks and all three extensions.  Thus the union is exhaustive and no
target-root placement remains unresolved.

The inserted-leaf replay alone covers 270 rank/extension routing cells,
162,783 ordered exact Newton coefficients, 540 literal core/root-deletion
profile checks, and 540 literal terminal-value checks.

Final ledger status:

```text
PASS_EXACT_SCOPE_AUDIT_DELTA23_E1_ALL_TARGET_ROOT_PLACEMENTS
```

## Exact evidence

```text
# Delta2 every old root
audit_rank8_delta2_e1_all_old_roots_complete_agent_20260825.py
  C0B0232B577545B45940BA0B620F88793A4F521E2B4B8B065446D168E5354BD9
rank8_delta2_e1_all_old_roots_complete_audit_agent_20260825.json
  09786DEAF69A54960CCD4AE0CEA6965A73E3364B0E8A9961951D9AFF0D4D56C3
RANK8_DELTA2_E1_ALL_OLD_ROOT_PLACEMENTS_COMPLETE_THEOREM_2026-08-25.md
  CC800E6199919DD939D7A17392007B176A98B3087D0DEF7162A4BB5FEA1CD79E

# Delta3 every old root
audit_rank8_delta3_e1_all_old_roots_complete_agent_20260825.py
  A3B7896071711D5D0CD62BCE322C85A7B1DBBD7F0674B86D7951D0020D57C2FA
rank8_delta3_e1_all_old_roots_complete_audit_agent_20260825.json
  84CC527DE97C605D4B7A7807A8E841FA4D842C5AE77A50C9927E710EE161F2E8

# Delta2/Delta3 inserted new leaf
prove_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py
  517FD645FCECEFAB1AE40811EF337797B5402B8375E42C51A7942A0819C165CD
rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json
  930B8F2E985B07B54B5AFB7422DF0510AAE2DF6D11E88418527B0111D1368CD0
audit_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py
  C1D5EA228D583C43AC74339C80D93D8EC93C23D3C6ADDE3614CD950A83991E67
rank8_delta23_e1_inserted_new_leaf_complete_independent_audit_agent_20260825.json
  B2B97CBC67021A53FF422A8CEC877E4CA832D21C01754AAF4016C2015565C3F5
RANK8_DELTA23_E1_INSERTED_NEW_LEAF_COMPLETE_THEOREM_2026-08-25.md
  8277DFC6A65F0E8818229696F4341A29A161DEAAE3DE4150CCFDEA2DC13A97A2

# Final target-placement ledger
audit_rank8_delta23_e1_all_target_root_placements_complete_agent_20260825.py
  9115F23207B1BFD9299AB518FEEEAF6F0B606499687AE7C0F155458402361FD7
rank8_delta23_e1_all_target_root_placements_complete_audit_agent_20260825.json
  7D29E059ADD1279315ED190897076865DADAF41EA0FD446AF5E73C74D1D93F3E
```

## Boundary

This theorem closes only the Delta2/Delta3 `e=1` subdivided-claw
root-placement gate for a one-arm endpoint-leaf extension from source order at
least 23.  It does not cover arbitrary trees, other structural-excess
families, full `Q8/PGC`, forest independence-sequence unimodality, or Erdős
Problem 993.
