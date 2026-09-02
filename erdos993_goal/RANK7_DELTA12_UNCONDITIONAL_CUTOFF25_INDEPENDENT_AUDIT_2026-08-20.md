# Independent audit of the unconditional rank-seven `Delta1`/`Delta2` cutoff-25 package

Date: 2026-08-20

Status: **PASSED CODE, REPORT, COVERAGE-JOIN, AND EXACT STRUCTURAL AUDIT
WITHOUT A FULL BERNSTEIN REPLAY.**

The audited theorem is exactly

```text
Delta^1 R_1(A,q) >= 0 and Delta^2 R_1(A,q) >= 0
for every rooted tree core A of order n>=25.
```

It is a theorem about the rank-seven terminal-broom residual.  It is not a
claim about `Delta0`, connected-tree `Q7`, or the full Erdős Problem #993.

## Replay restriction

Free RAM was below the parent-specified 5 GiB threshold, so no Bernstein
tensor was rebuilt.  The independent audit instead regenerated every finite
key and structural row, parsed every stored result field, reassembled the
coverage join, and verified the complete source/report/log hash chain.

## The 472 fixed keys

The rooted-`C7` residual cut was regenerated from its exact rational formulas,
not copied from the batch report.  The regenerated full cut has

```text
83 (n,r) cells and 18,517 integer B2 levels in orders 23..38.
```

Its order-25--38 slice has

```text
69 distinct (n,r) cells,
16,290 integer B2 levels,
49 cells with r<=4,
20 cells with r>=5,
and no root degree above 7.
```

For each rank and each residual pair, `r<=4` needs two capacity faces and
`r>=5` needs one; every face has two `q` endpoints.  Thus the independently
regenerated count per rank is

```text
49*2*2 + 20*1*2 = 236,
```

and both ranks give exactly 472 keys.

The stored list equals that ordered Cartesian list, not merely its set.  It
has zero duplicates, omissions, or off-scope rows.  Its exact totals are

```text
rank 1:          236
rank 2:          236
containment:     196
extension:       196
extension_mass:   80
q lower:         236
q upper:         236.
```

Every recorded numerator minimum and denominator minimum is strictly
positive.  For every cell, the reported tensor coefficient count equals the
product of `(degree+1)` over its axes, and every minimum index lies within its
reported degree box.

## Complementary capacities and exact switch

Let

```text
J=A-N[q],  m=|J|,  a=i4(J),  b=i5(J),
y=c4/c5,  z=c5/c6,  s=1-a/c5,  d=1-b/c6.
```

The three unconditional counts are

```text
a<=c4,
5b<=(m-4)a,
b<=h5=c5-a.
```

The second inequality double-counts incidences between independent
four-sets and independent five-sets of `J`; the third follows because `J` is
an induced subgraph of `H=A-q`.  After normalization,

```text
d >= max(1-z*(m-4)*(1-s)/5, 1-z*s).
```

The two lost-mass bounds agree exactly when

```text
s=(m-4)(1-s)/5,
```

so the unique switch is

```text
s0=(m-4)/(m+1).
```

Below `s0`, containment `b<=h5` is active; above `s0`, extension counting is
active.  The audit regenerated all 98 `(n,r)` structural rows and all 154
branch intervals byte-for-byte.  For `r<=4`, `s>=1-y` reaches the switch and
both faces are needed.  For `r>=5`, the path/root-mass floor is already above
the switch, so only `extension_mass` is needed.

## Half retention

On either active lower-`d` face, the maximum possible normalized loss at the
switch is `z*s0`.  The exact universal `y/z` band gives

```text
d-1/2 >= 31/480,
s-1/2 >= 43/306,
s >= 98/153,
```

with all three weakest margins at `(n,r)=(25,1)`.  Thus every realizable
point used by the endpoint reduction is safely in the required
half-retention domain.

A precision point matters here: the rank-two Bernstein box is deliberately a
larger positivity relaxation than the realizable universal `y` band.  Some
nonrealizable corners of that enlarged box need not retain `d>=1/2`.  This
does not create a proof gap: concavity restricts the realizable domain to its
capacity endpoint first, and the Bernstein certificate then proves
positivity on a larger set.  The half-retention claim should therefore be
read as a claim about the realizable coefficient domain, not every artificial
corner of the relaxed rank-two box.

## Coverage join

The audit checked more than the original assembler:

1. It verified all 16 rank-one/rank-two cutoff boxes in the otherwise
   incomplete `Delta0`--`Delta2` inventory, including each exact log tail and
   hash.  There are eight rooted-`C7` lower-`d` boxes and eight unconditional
   upper-`d` boxes.  The inventory is globally marked incomplete only because
   of two rank-zero failures; its rank-one/rank-two subset is 16/16 PASS.
2. It independently regenerated the 83-cell rooted-`C7` residual cut and
   verified all three prerequisite report hashes and statuses.
3. It explicitly verified the large-order rooted-`C7` report, whose status is
   `PASS_EXACT_RANK7_ROOTED_CROSS_FOR_ALL_TREES_N_AT_LEAST_39` with minimum
   order 39.
4. It structurally parsed all 21 rank/coordinate rows in the cutoff-25 root
   concavity log and required zero negative coefficients and the exact final
   marker.

The exhaustive join is therefore:

```text
n>=39:
  large-order rooted C7 + 8 lower-d boxes + 8 upper-d boxes;

25<=n<=38, rooted-C7-covered complement:
  exact residual complement + the same 16 prior boxes;

25<=n<=38, rooted-C7 residual:
  472 new lower-d face/rank/q cells + 8 unconditional upper-d boxes.
```

The new fixed prover has no `B2` variable, so each of its 69 `(n,r)` cells
covers the entire listed `B2` interval, including all 16,290 integer levels.
There is no remaining order, root-degree, `B2`, `d`, or `q` gap in this
`Delta1`/`Delta2` theorem.

## Primary immutable hashes

```text
rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json
81B99AC71502FBC48077D3600855C6AA22B61BE49129755C38FD1EFEA56BE0C9

verify_rank7_terminal_broom_delta12_unconditional_cutoff25.py
230A7132A0491DE26BA423168D04DB189F2CFBB733086E9E82B4E16F27C462E8

rank7_delta12_complementary_capacity_fixed_exact_20260820.json
3851B082A8AD23194DD36E4866F3556BE2F43F972BCE951658E8C76FAB49473F

prove_rank7_delta12_complementary_capacity_fixed.py
E40E3AA63FB6D357ABF258E09F4F4A6BD115FB50D745E37545CD74172FF9E5B8

run_rank7_delta12_complementary_capacity_fixed_batch.py
9FFB30B735D7446B00FEAAA46902DECC012AADBED9BFF9ACF7D09EE070C907C4

rank7_delta12_complementary_capacity_structure_exact_20260820.json
FB06CE7BAEC5D9A40EF1988252EA2072FD5A2CEE46CE7C6B05FB11DC3D524AB9

rank7_rooted_cross_residual_after_b2_4_exact_20260816.json
EBF9369561D528A94FA08846E6BF465DB7485D3DF271E462C63DF48E5473587D

rank7_delta012_cutoff25_inventory_20260820.json
6FB609317E30E2802F95B38F3EDB8939524628545B65702FC4DB8C11D6F188D3

rank7_root_z_concavity_cutoff25_exact_20260820.log
94B480ED5777982C95D74A0A1CD2759A67FD3DFA0FBD5887445EF0A17FF4EE0F

rank7_rooted_cross_large_order_exact_20260816.json
094FDAAA63B21F845B7265377246C2F3FB56998F1F61012851065EA30A05AADA
```

Run the low-memory independent audit with

```powershell
python .\audit_rank7_delta12_unconditional_cutoff25_certificate.py
```

The expected marker is

```text
PASS_INDEPENDENT_CODE_REPORT_COVERAGE_AUDIT_NO_FULL_REPLAY_LOW_RAM
```
