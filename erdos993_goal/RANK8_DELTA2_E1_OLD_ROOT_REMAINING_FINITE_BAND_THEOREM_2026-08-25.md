# Rank-eight Delta2 e=1 old-root remaining finite-band theorem

Date: 2026-08-25

Status: **proved with an independent exact include/exclude tree-message replay
and literal adjacency-list/full-forest-DP checks**.  This theorem covers the
previously unsealed finite distance set `near in {0,3,4,...,18}`; it does not
duplicate the separately sealed `near=1,2` packages.

## Theorem

Let `T` be a subdivided claw of source order at least 23, rooted on one arm.
Suppose the number of vertices strictly between the center and the old root is

```text
near in {0,3,4,5,...,18}.
```

Extending any one of the three arms by one new leaf strictly increases the
`Delta2` coefficient of the rank-eight terminal residual at the old root.

Order the two arms not containing the root and write the source arm lengths as

```text
(near+tail+1, short+1, short+difference+1),
```

where `tail,short,difference` are nonnegative.  The source order condition is
exactly

```text
tail + 2*short + difference >= 19-near.        (1)
```

The root-arm, shorter-other-arm, and longer-other-arm labels cover all three
extension choices.  Equality of the two other arms only introduces symmetry.

## Exact grouped certificate

For each of the seventeen distances, the proof first partitions the
nonnegative triples into the same disjoint branch-stable cells:

- `tail>=6`, or fixed `tail=0..5`;
- `short>=6,difference>=0`, or fixed `short=s` in `0..5` and either
  `difference>=6-s` or fixed `difference=0..5-s`.

It then intersects every cell with (1) by an exact weighted-cone recursion
with weights `(1,2,1)`.  The recursion divides the first active coordinate
into the shifted ray whose minimum suffices and each smaller fixed prefix,
then continues through the remaining active coordinates.  This is disjoint
and exhaustive by induction on that coordinate list.  A separate bounded
multiplicity check verifies zero-or-one membership at all `21^3=9,261`
points for every distance, totaling 157,437 coverage points.

The rank-two residual has 22 exact integer monomials and maximum
rank-weighted coordinate degree 27.  Thus 28 samples in every active
coordinate give the complete Newton tensor.  Across all seventeen distances
and all three extension orbits, the producer certifies:

| exact item | count |
|---|---:|
| root distances | 17 |
| extension orbits | 51 |
| routed regions | 6,636 |
| dimension-0 regions | 2,835 |
| dimension-1 regions | 3,135 |
| dimension-2 regions | 615 |
| dimension-3 regions | 51 |
| exact Newton coefficients | 1,692,327 |
| positive coefficients | 467,286 |
| zero coefficients | 1,225,041 |
| negative coefficients | 0 |
| bounded coverage points | 157,437 |

Every region origin and every sampled increment is positive.  The minimum
sampled increment is `161919118059799481472`, at `near=0` in the
shorter-other-arm extension orbit.

## Independent replay

The audit imports no producer refinement or closed path-polynomial formula.
It freshly extracts the 22 integer monomials of the canonical Delta2 residual,
rebuilds the branch cells and weighted-cone routing, and evaluates every
coefficient using independently derived include/exclude path messages.  It
then applies a fresh shape-driven exact integer forward-difference transform.

The replay matched all 6,636 stored region keys, all 1,692,327 ordered
coefficient digests, every stored minimum, and all 157,437 coverage
multiplicities.  At every unique tensor corner of every routing region it
also built the subdivided claw as a literal adjacency list and ran generic
include/exclude forest DP through rank eight.  This supplied 10,437 literal
increment checks and 13,916 literal core/root-deletion profile checks.

Audit status:

```text
PASS_INDEPENDENT_TREE_DP_DELTA2_E1_OLD_ROOT_REMAINING_FINITE
```

## Exact evidence

```text
prove_rank8_delta2_e1_old_root_remaining_finite_band_agent_20260825.py
  B7CF39C845A81F8B7BE07A5FC965D748F1FBC77570EDA2EF7FC87CB43D99A637
rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json
  8C0261ECA0C07D6AA5F21C465FABA5C1D51AA38BF231EC8B758D65D17F5C38F5

audit_rank8_delta2_e1_old_root_remaining_finite_band_agent_20260825.py
  FEA27FAE85C7CB52DA193C0E2358AEE22CD4532B17724C174F7783196A71AD50
rank8_delta2_e1_old_root_remaining_finite_band_independent_audit_agent_20260825.json
  C6F0F2C3B697611BE6448FEDAE81A557D7020A5B7F8901F4E1F255C794811B73
```

## Boundary

This theorem closes only the Delta2 `e=1` subdivided-claw strict-increment
distances `near in {0,3,...,18}`, for old roots on an arm, all source orders at
least 23, and all three arm extensions.  It explicitly excludes the separately
sealed `near=1,2` packages, the uniform `near>=19` tail, center roots,
inserted-new-leaf roots, arbitrary trees, full `Q8/PGC`, forest independence-
sequence unimodality, and Erdős Problem 993.
