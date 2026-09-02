# Rank-eight Delta2 e=1 center-root strict-increment theorem

Date: 2026-08-25

Status: **proved with an independent exact tree-message replay and literal
adjacency-list/full-forest-DP checks**.

## Theorem

Let `T` be a subdivided claw of source order at least 23, rooted at its center.
Extending any one of its three arms by one new leaf strictly increases the
`Delta2` coefficient of the rank-eight terminal residual at the old center
root.

For ordered arm lengths

```text
(base+1, base+middle_gap+1, base+middle_gap+long_gap+1),
```

the order condition is exactly

```text
3*base + 2*middle_gap + long_gap >= 19.
```

The branch-stable weighted-cone routing has 45 regions per extension.  With
degree bound 27 in every active coordinate, the exact producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| routed regions | 135 |
| exact Newton coefficients | 85,428 |
| negative coefficients | 0 |
| bounded coverage points | 9,261 |

Every origin and sampled increment is positive.  The independent audit
rebuilds every routing key and ordered coefficient digest with a fresh
canonical 22-term Delta2 evaluator, and matches 270 literal adjacency-list
increment checks plus 360 literal core/root-deletion profile checks.

Audit status:

```text
PASS_INDEPENDENT_TREE_DP_DELTA2_E1_CENTER_ROOT_COMPLETE
```

## Exact evidence

```text
prove_rank8_delta2_e1_center_root_complete_agent_20260825.py
  96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F
rank8_delta2_e1_center_root_complete_exact_agent_20260825.json
  5C434FD92F74E09BC75A2C71F796E92DB8D3EBCA6449DC851A1D82CBCDEE840B

audit_rank8_delta2_e1_center_root_complete_agent_20260825.py
  0DA0656ACF8C474D44EBDF31DE5BFDD155030DBE6FE4F051459510839B32AFCE
rank8_delta2_e1_center_root_complete_independent_audit_agent_20260825.json
  469A00A739612BB3C6444F2955A3BAD0565CB9890F24206A6E04E4E2AB022795
```

## Boundary

This theorem is a strict arm-extension increment theorem only for the Delta2
`e=1` center-root gate.  It is distinct from the older all-root Delta2 value
theorem.  It does not cover inserted-new-leaf roots, arbitrary trees, full
`Q8/PGC`, forest independence-sequence unimodality, or Erdős Problem 993.
