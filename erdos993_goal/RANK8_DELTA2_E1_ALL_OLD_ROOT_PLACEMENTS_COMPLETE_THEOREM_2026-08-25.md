# Rank-eight Delta2 e=1 all-old-root-placement theorem

Date: 2026-08-25

Status: **proved with exact center and all-arm-distance packages, each backed
by an independent literal adjacency-list/include-exclude tree-DP replay**.

## Theorem

Let `T` be a subdivided claw of source order at least 23, rooted at any vertex
already present in `T`.  Extend any one of the three arms by one new leaf.
Then the `Delta2` coefficient of the rank-eight terminal residual at the old
root increases strictly.

Every old vertex belongs to exactly one of two disjoint placement classes:

1. the unique claw center; or
2. a vertex on exactly one arm, at distance `near+1` for a unique integer
   `near>=0`.

The center package covers the first class and all three extension orbits.  The
all-arm-distance wrapper covers the second class, every integer `near>=0`, and
all three extension orbits.  Their union is therefore every old root
placement, with no overlap and no unresolved placement.

Final ledger status:

```text
PASS_EXACT_SCOPE_AUDIT_DELTA2_E1_ALL_OLD_ROOT_PLACEMENTS
```

## Exact evidence

```text
# Center placement
prove_rank8_delta2_e1_center_root_complete_agent_20260825.py
  96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F
rank8_delta2_e1_center_root_complete_exact_agent_20260825.json
  5C434FD92F74E09BC75A2C71F796E92DB8D3EBCA6449DC851A1D82CBCDEE840B
audit_rank8_delta2_e1_center_root_complete_agent_20260825.py
  0DA0656ACF8C474D44EBDF31DE5BFDD155030DBE6FE4F051459510839B32AFCE
rank8_delta2_e1_center_root_complete_independent_audit_agent_20260825.json
  469A00A739612BB3C6444F2955A3BAD0565CB9890F24206A6E04E4E2AB022795
RANK8_DELTA2_E1_CENTER_ROOT_COMPLETE_THEOREM_2026-08-25.md
  46883C26C8D81C2079777A741B02FE3EA82E8E8692FE8C192A49888C508417AB

# Every arm placement
audit_rank8_delta2_e1_old_root_all_arm_distances_complete_agent_20260825.py
  32F65F86BF4A6C349D1F0E31161CE8B3AB74089F92F641466A2F1A3FD99854CA
rank8_delta2_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json
  E69EEA49DB3D58846772106F62779BD1437AAA3842472A46F19DB848B32A74A8
RANK8_DELTA2_E1_OLD_ROOT_ALL_ARM_DISTANCES_COMPLETE_THEOREM_2026-08-25.md
  E2D4EF3FEAB842EE7B8FCCE691CF76C5F39A6248EE08490DA14E9A282B70CCFC

# Final root-placement ledger
audit_rank8_delta2_e1_all_old_roots_complete_agent_20260825.py
  C0B0232B577545B45940BA0B620F88793A4F521E2B4B8B065446D168E5354BD9
rank8_delta2_e1_all_old_roots_complete_audit_agent_20260825.json
  09786DEAF69A54960CCD4AE0CEA6965A73E3364B0E8A9961951D9AFF0D4D56C3
```

## Boundary

This theorem closes only the Delta2 `e=1` subdivided-claw strict increment
gate for roots already present in the source tree.  It does not include the
newly inserted leaf as root, arbitrary trees, full `Q8/PGC`, forest
independence-sequence unimodality, or Erdős Problem 993.
