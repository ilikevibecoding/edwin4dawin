# Rank-eight Delta3 e=1 old-root uniform tail theorem (`near>=19`)

Date: 2026-08-25

Status: **proved with an independent exact include/exclude tree-message replay
and literal adjacency-list/full-forest-DP checks in every routing region**.
This is a uniform all-distance tail theorem, not a claim about the remaining
finite band or about Erdős Problem 993.

## Theorem

Let `T` be a subdivided claw rooted on one arm.  Suppose at least nineteen
vertices lie strictly between the center and the old root (`near>=19`).
Extend any one of the three arms by one new leaf.  Then the `Delta3`
coefficient of the rank-eight terminal residual at the old root increases
strictly.

Order the two arms not containing the root and write the source arm lengths as

```text
(near+tail+1, short+1, short+difference+1),
```

where all four parameters are nonnegative and `near>=19`.  The old root is at
distance `near+1` from the center.  The source order is

```text
n = near + tail + 2*short + difference + 4.
```

Thus `near>=19` makes `n>=23` automatic.  The root-arm,
shorter-other-arm, and longer-other-arm labels cover every extension choice;
equality of the other arms only introduces symmetry.

## Finite transfer certificate

The path independence polynomial obeys the include/exclude transfer

```text
I(P_m;x) = I(P_(m-1);x) + x I(P_(m-2);x).
```

At rank `r`, its coefficient is `C(m-r+1,r)`.  The partition below fixes all
small path orders and leaves active only stable binomial-polynomial branches:

- `near>=19` in every region;
- `tail>=6`, or one fixed value `tail=0..5`;
- `short>=6,difference>=0`, or one fixed `short=s` in `0..5` and either
  `difference>=6-s` or one fixed value `difference=0..5-s`.

These alternatives are pairwise disjoint and exhaustive.  Per extension they
give exactly

| dimension | regions |
|---:|---:|
| 4 | 1 |
| 3 | 12 |
| 2 | 57 |
| 1 | 126 |
| **total** | **196** |

The exact Delta3 residual has 26 monomials.  Giving each `c_r` coordinate
degree at most `r` and `H6,H7` degree at most `6,7`, the largest
rank-weighted monomial degree is 26.  Hence 27 samples in every active
coordinate give the complete Newton tensor, not a truncation.

The exact coefficient count per extension is

```text
27^4 + 12*27^3 + 57*27^2 + 126*27 = 812,592.
```

Across the three extension orbits, the producer certifies 588 regions and
2,437,776 exact integer Newton coefficients.  All are nonnegative; every
region origin and every sampled increment is strictly positive.

| extension | positive coefficients | zero coefficients | minimum sampled increment |
|---|---:|---:|---:|
| root arm | 77,250 | 735,342 | `265075289414422047366` |
| shorter other arm | 77,250 | 735,342 | `224837039577972626350` |
| longer other arm | 77,250 | 735,342 | `224837039577972626350` |

## Independent replay and coverage ledger

The audit imports no producer, refinement, closed path-polynomial, or prior
near-distance theorem.  From the canonical terminal residual alone it derives
fresh generic include/exclude messages for a path attached at one end.  It
uses those messages to rebuild every one of the 2,437,776 values and fresh
multidimensional integer forward differences, then matches every stored
ordered coefficient digest and minimum.

To tie the message recurrence independently to literal trees, at both opposite
tensor corners of every one of the 196 routing regions it also constructs the
subdivided claw as a literal adjacency list and runs full generic
include/exclude forest DP through rank eight.  This supplies 1,176 literal
increment checks and 1,568 literal core/root-deletion profile checks.

The audit separately rebuilt the expected region keys and proved:

```text
near: near>=19;
tail: {0,1,2,3,4,5} disjoint union {tail>=6};
short/difference:
  {short>=6,difference>=0}
  disjoint union over s=0..5 of
  {short=s,difference=0..5-s} and {short=s,difference>=6-s}.
```

The stored and expected key sets agree for all three extension orbits, so
there is no gap or overlap.

Audit status:

```text
PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR19_PLUS
```

## Exact evidence

```text
probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py
  682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5
rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json
  65B14D169B3A0C54225DA272473CFE7E3AC93152AC4B0EFBA5CCD21E932EC3B5

prove_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py
  D6FC6E831E71B28C58D4E6103DDB169C92BFE831FC555FB54B7DA3263DDD00E1
rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json
  518C5EEA283E687F2C1466844220D504EBEEB44331EE7E04FB86365F4D4760A9

audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py
  51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3
rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json
  CA56791020E62B290C266470FFF1E36C3F0FA097126BB975C1131F6BF74B2AA9
```

## Boundary

This theorem closes only the Delta3 `e=1` subdivided-claw old-root
arm-extension tail `near>=19`.  Combined with the separate sealed packages at
`near=0,1,2,3,4`, the remaining individual distance band is finite:
`near=5..18`.  That bookkeeping does not import the earlier proofs here.
Other root families, arbitrary trees, inserted-new-leaf gates, full `Q8/PGC`,
forest independence-sequence unimodality, and Erdős Problem 993 remain open.
