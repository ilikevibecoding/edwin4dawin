# Independent audit of the rank-seven `Delta0` small-`J` upper-`b` certificate

Date: 2026-08-20

Status: **PASSED CODE/REPORT/ALGEBRA AUDIT WITHOUT A FRESH BERNSTEIN
REPLAY.**  This corrected replacement package includes a non-null structural
audit of every source report.  The source certificates cover

```text
27<=n<=38,
0<=m=|J|<=4, both q endpoints, all b/d endpoints (b=0,d=1),
5<=m=|J|<=17, both active upper-b faces and both q endpoints.
```

The completed orders-28--38 small-J report has 572 cells, its order-27 report
has 52, and the very-small-J report has 120, for 744 exact cells total.

## Replay restriction

Free RAM was 2.62 GiB at the start of the audit.  The parent required at least
5 GiB before replaying the Bernstein jobs, so no prover job was rerun.  This
audit instead checks the immutable source/report hash chain, every recorded
result, the exact Cartesian key scope, and the algebra and constraint
directions independently.

## Structural result parsing

The batch runners originally marked rows with a substring test.  The
independent audit does not trust that flag alone.  For each of the 624 rows it

1. splits exactly four key fields `(n,m,face,q)` from the recorded standard
   output;
2. requires those fields to equal the enclosing JSON row;
3. parses the remaining object with `ast.literal_eval`;
4. requires exactly the keys
   `status,nodes,passed,discarded,worst`;
5. checks `status=PASS`, `worst=None`, nonnegative integer counts, and the
   exact full-binary-tree identity

```text
nodes=2(passed+discarded)-1.
```

The ordered key lists equal all three independently regenerated Cartesian
products exactly: no duplicate, omission, or off-scope row occurs.

For orders 28--38 the aggregates are

```text
572 jobs,
572 Bernstein nodes,
286 passed leaves,
286 discarded leaves.
```

For order 27 they are

```text
52 jobs,
52 Bernstein nodes,
26 passed leaves,
26 discarded leaves.
```

Every containment-face box is discarded immediately as infeasible under the
retained opposing capacity; every extension-face box passes immediately.
Thus none of the 624 rows required subdivision.

For `0<=m<=4`, all 120 rows pass in one Bernstein node, with 120 passed leaves
and zero discarded leaves.

## Very-small-J endpoint completeness

If `m<=4`, then there is no five-subset of `J`, so

```text
b=i5(J)=0,
d=1-bz/c5=1.
```

Consequently the lower- and upper-`b` endpoints coincide and there is no
missing `b/d` face.  Half retention is the tautology `c6-2b=c6>0`, and the
literal ceiling is the equality `C(m,5)-b=0`.  For `m<4`, `a=i4(J)=0`
exactly.  At `m=4`, the prover certifies the stronger continuous relaxation
`0<=a<=1`, which contains both literal forest possibilities.  The same
nonpositive `q` curvature makes the two recorded `q` endpoints complete.

## Exact face completeness

Write

```text
a=i4(J),                 b=i5(J),
z=c5/c6,
s=1-a/c5,               d=1-bz/c5.
```

For `5<=m<=17`, the retained lower bound and upper capacities are

```text
b >= C(m,5)-((m-4)/3)(C(m,4)-a),
b <= c5-a,
b <= ((m-4)/5)a.
```

At the upper-`b`, lower-`d` endpoint,

```text
b=max feasible b=min(c5-a,((m-4)/5)a).
```

Therefore the two exact active possibilities are

```text
b=c5-a                    containment face,
b=((m-4)/5)a              extension face.
```

On each face the other upper capacity is retained with sign
`other_upper-b>=0`, and the bad-set lower bound is retained with sign
`b-badset_lower>=0`.  Their union includes the tie and leaves no upper-`b`
gap.

The additional constraints have the correct directions:

```text
b>=0,
C(m,5)-b>=0,
c5-2bz=(c5/c6)(c6-2b)>=0,
C(n,6)z-c5=(c5/c6)(C(n,6)-c6)>=0.
```

No third upper face is missing.  The extension cap reaches the literal
ceiling because

```text
((m-4)/5)C(m,4)=C(m,5),
```

and `z<1/2` makes `c6/2>c5>=c5-a`, so half retention cannot beat containment
at the maximum feasible `b`.

The normalized objective has

```text
d^2/dq^2 = -196s(s+1)<=0,
d^2/dd^2 = 4((s-48)z-48)<0.
```

Thus the two recorded `q` endpoints cover the full `q` interval, and the
present certificate correctly covers the lower-`d` endpoint selected by
maximizing `b`.  It does not prove the opposite lower-`b`, upper-`d`
endpoint.

## Scope guard

This audit certifies only the provenance and exact scope of the completed
very-small-`J` reports and small-`J` upper-`b` reports.  It does not add claims
for

```text
m>=18,
the lower-b/upper-d endpoint,
orders n>=39.
```

The `lower-b/upper-d` exclusion above applies only to `5<=m<=17`; for `m<=4`
that endpoint is included because `b=0,d=1` is unique.

## Audited source hashes

```text
prove_rank7_delta0_joint_capacity_faces_small_j_finite.py
0A9B1304559FFADF1CBA51174A0E97BC4E051FBBCBC5C228D8C122A135EFB098

run_rank7_delta0_joint_capacity_faces_small_j_batch.py
F4FAB5A10D2B6E0F8F5638D6981CD53C4C2C119992C060D089D52B9D6DD3359D

rank7_delta0_joint_capacity_faces_small_j_n28_n38_exact_20260820.json
03589B656CB02BFE4B093931814E880BA2AC13FA0E25A8B9021FF504D5BAE083

run_rank7_delta0_joint_capacity_faces_small_j_n27_batch.py
5F192D964446B36C309ED5EDD8BAE05425F083FF58ECBD0BFEC58683DC4FABD3

rank7_delta0_joint_capacity_faces_small_j_n27_exact_20260820.json
DA6B3B78B364CC37B32C6A128B9B347A09B4B86313D955BDD9F527A2B51026FE

prove_rank7_delta0_very_small_j_finite.py
79ADE232595082A9F5C0F9C1D52B3605562249769F4CA7A9860ED1792223FC19

run_rank7_delta0_very_small_j_batch.py
801B7F5B21DC65C25E43E71AFBC234DFEA8D9BAF2FFE17F34A79372856641E3F

rank7_delta0_very_small_j_n27_n38_exact_20260820.json
3D9D0BC70EDDB50B43C0A1CE7A27554833C32DE18340A3CF1AF67D17649138F4
```

Run the low-memory audit itself with

```powershell
python .\audit_rank7_delta0_small_j_upper_b_certificate.py
```

The expected marker is

```text
PASS_CODE_REPORT_AUDIT_NO_FRESH_REPLAY_LOW_RAM
```
