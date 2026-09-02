# Rank-eight Delta3 e=1 old-root all-arm-distances theorem

Date: 2026-08-25

Status: **proved by three disjoint, independently audited exact coverage
packages**.  This is an all-distance theorem only for old roots lying on an
arm of an `e=1` subdivided claw.  It is not a proof of Erdős Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Root `T` at any
vertex lying on one of its arms, and extend any one of the three arms by one
new leaf.  Then the `Delta3` coefficient of the rank-eight terminal residual
at the old root increases strictly.

If `near` denotes the number of vertices strictly between the claw center and
the old root, then `near` is an arbitrary nonnegative integer and the root is
at arm distance `near+1`.

## Exact all-distance coverage

The nonnegative integer distance domain is partitioned into three pairwise
disjoint exact scopes:

| distance scope | proof package |
|---|---|
| `near=0..4` | five separately sealed exact certificates and independent literal-tree audits |
| `near=5..18` | one grouped branch-stable weighted-cone certificate and independent tree-DP replay |
| `near>=19` | one uniform four-variable transfer certificate and independent tree-DP replay |

There is no gap between 4 and 5 or between 18 and 19, and the union is every
integer `near>=0`.

For the grouped finite band, the exact replay covers 42 extension orbits,
5,793 routing regions, and 1,262,139 ordered Newton coefficients.  It also
checks 129,654 finite coverage points, 8,754 literal adjacency-list increment
values, and 11,672 literal core/root-deletion profiles.

For the uniform tail, the exact replay covers three extension orbits, 588
routing regions, and 2,437,776 ordered Newton coefficients.  It also checks
1,176 literal adjacency-list increment values and 1,568 literal
core/root-deletion profiles.

The individual `near=0..4` packages are imported only through their
hash-pinned exact coverage ledger; no distance is inferred from a neighboring
one.

Combined ledger status:

```text
PASS_EXACT_SCOPE_AUDIT_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES
```

## Exact evidence

```text
# Individual near=0..4 plus uniform-tail precursor ledger
audit_rank8_e1_old_root_coverage_near0_4_and_19plus_agent_20260825.py
  1E738352C92E89C2747074FFCBF2CE74228F06BFC1511ED6F5C54F5B2850D5DA
rank8_e1_old_root_coverage_near0_4_and_19plus_exact_audit_agent_20260825.json
  05CB9D87E2678ECD74D577C7198CAFD1ECF266750FC6D6B9DFC1BFBB15E1950C

# Grouped finite band near=5..18
prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py
  9B17B28E683714325B6D6D2907F9FA4069BB7CF36AD03BCC51B2A30BAB4B2488
rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json
  DB26C61571FE388D7FFA6DC756100648A3EE086133E8C428126633F1C253F75C
audit_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py
  5F0C0E107165AC72EF48CC83B69BC77233D5B52F16BC5FB9C989795A9D1F7EA3
rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json
  A3B15AD8B9F21630D765E11591A95C1A9D5E22FD210FE7560AB06F6674FCD2AA
RANK8_DELTA3_E1_OLD_ROOT_NEAR5_18_GROUPED_THEOREM_2026-08-25.md
  D1C04ABAD89A803A33BE1958D6F7F26CAC5A824EAB3E1E51C0ECE056797B6502

# Uniform tail near>=19
rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json
  518C5EEA283E687F2C1466844220D504EBEEB44331EE7E04FB86365F4D4760A9
rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json
  CA56791020E62B290C266470FFF1E36C3F0FA097126BB975C1131F6BF74B2AA9
RANK8_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_UNIFORM_TAIL_THEOREM_2026-08-25.md
  ED8DAD01AAFF28BEE11B7BB8E00288FBB932C37F71292399CBC917691F3ECC36

# Final all-distance coverage audit
audit_rank8_delta3_e1_old_root_all_distance_coverage_agent_20260825.py
  877150F25550D8BB551F9240C3ABD516CDEF580EA24F31D7385CB4ADACA3DA78
rank8_delta3_e1_old_root_all_distance_coverage_exact_audit_agent_20260825.json
  938DF343611686DF075B38550FE7F99C660AA59BB0BBFA9C95FFFF07D9F077D9
```

## Boundary

This theorem closes only the Delta3 strict arm-extension increment gate for
`e=1` subdivided claws rooted at an old vertex lying on an arm, for source
orders at least 23.  It does **not** include the claw center root,
inserted-new-leaf roots, arbitrary trees, Delta2 strict increments outside
their separately certified scopes, full `Q8/PGC`, forest
independence-sequence unimodality, or Erdős Problem 993.
