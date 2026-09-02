# Rank-eight terminal-broom `Delta^5` all-order theorem

Date: 2026-08-17

Status: **PROVED FOR EVERY ROOTED TREE CORE, conditional only on the already-proved rank-seven `Q7` theorem in its target range `alpha>=12`.**  The analytic certificate starts at order 23 and exact WROM censuses close orders 1 through 22.  This proves one Newton coefficient, not the complete terminal residual or `Q8`.

## Theorem

Assume the rank-seven inequality

```text
Q7(A)=14c7^2-c6c7-16c6c8 >= 0
```

for tree cores with `alpha(A)>=12`.  For the rank-eight terminal-broom residual `R_t` attached to every rooted tree core `A`,

```text
Delta^5 R_1 >= 0.
```

Consequently every terminal coefficient `Delta^5` through `Delta^15` is proved all-order.

## Rank-seven endpoint and its exact guard

Write `c_j=i_j(A)` and `h_j=i_j(A-q)`.  Direct differentiation gives

```text
d Delta^5/dc8
= -16h6(54c1c7+16c1c8+83c2c7+16c2c8+29c3c7) <= 0.
```

The rank-seven hypothesis therefore supplies the safe upper endpoint

```text
c8 = c7(14c7-c6)/(16c6).
```

Where this endpoint is larger than the ordinary extension ceiling, it remains a safe overbound because `Delta^5` decreases in `c8`.  The earlier `c7`/rank-six defect reduction also survives: after this substitution its exact second derivative is `-S/c6` times a polynomial with positive coefficients.

Every tree is bipartite, so for `n>=23`,

```text
alpha(A) >= ceil(n/2) >= 12.
```

Thus the rank-seven theorem is available throughout the analytic range.  Orders 21 and 22 can have `alpha=11`; they are not covered by this induction step and are closed separately by the exact finite census below.

## Exact `q`-`D5` polygon

Put `a=n-7`, `x5=c4/c5`, and let `k in {1,7}` denote the two rank-six defect endpoints.  Retaining the full `D5` interval gives

```text
(2+x5)/12 <= D5 <= 1/6+x5/2,
c6/c5 = (7aq+3k)/36,
q = 6c7/(ac6).
```

The induced interval in `q` has exact width `15/(7a)`.  Intersecting it jointly with both root-capacity inequalities produces four boundary pieces: lower-zero, lower-cross, upper-capacity, and upper-`c7`.  For `q<=6/7` these are exact; for larger `q` the adopted pieces are safe supersets of the true boundary.

The exact coefficient is concave in `h7`.  Therefore, for each fixed feasible `h6`, its minimum lies on the lower or upper boundary of the two-sided capacity polygon

```text
7h7 <= (n-7)h6,
6(c7-h7) <= (n-7)(c6-h6).
```

This justifies reducing the whole feasible root polygon to the four parameterized boundary pieces; no independent root box is used.

With the `Q7` endpoint, the two expensive crossing pieces are concave in their boundary parameter `Z`.  The upper-`c7` curvature is

```text
-16c7(c2+19c3+18c4)(ac6-7c7)^2/a^2 <= 0.
```

The lower-cross curvature is `-12c7^3/a^2` times

```text
c1(21n^2-295n+1036)
+ c2(21n^2-551n+2876)
+ c3(2704-256n)+864c4.
```

Sharp tree ratio bounds prove this bracket positive for `n>=23`; its exact two-variable Bernstein tensor has degrees `(6,2)`, 21 coefficients, and minimum `847680768`.  The endpoints identify with lower-zero, upper-capacity, and the full root `h6=c6,h7=c7`.  Hence only three analytic pieces per value of `k` are required.

## Exact analytic certificate for `n>=23`

Normalize `c3=1` and map the full remaining `D4,D5,q` cone to `[0,1]^6` with coordinates `(T,W,A,U,V,Z)`, using `n=23/T`, sharp tree ratio intervals, the full `D4` interval, and the linked full `D5` interval above.

For each `k in {1,7}`, exact denominator clearing and unsplit rational Bernstein transforms prove the lower-zero, upper-capacity, and full-root pieces nonnegative.  The two six-dimensional boundary tensors have degrees

```text
(56,26,12,11,8,2)
```

and 6,482,268 coefficients each.  The full-root tensor has degrees

```text
(50,24,11,10,7,0)
```

and 1,346,400 coefficients.  Every reported exact minimum is zero at the excluded `T=0` boundary; no subdivision is used.  Across both defect endpoints, the certificate checks 28,621,872 exact rational Bernstein coefficients.

## Exact finite complement

The finite checker streams every canonical WROM free tree of orders 1 through 22 and checks every possible root with exact integer dynamic programming.

For orders 1 through 20:

```text
free trees:        1,346,024
rooted cores:     26,056,124
negative values:           0
```

For the guarded orders 21 and 22:

```text
free trees:        7,768,261
rooted cores:    168,757,237
negative values:           0
```

The order-21 minimum is `3034271423612028600`; the order-22 minimum is `15004232688025701120`.  This census includes every `alpha=11` core and is stronger than the slice needed to close the rank-seven guard.

## Preserved relaxation no-gos

The tempting `D5` endpoint reduction is invalid.  On the feasible path `P18` jet `(c3,c4,c5,c6)=(560,1365,2002,1716)`, the exact negative of the second `c6` derivative on branch `(E,k)=(0,1)` is

```text
-4921832860648/2401 < 0.
```

Thus that branch is locally convex in the proposed reduction variable.  The analytic certificate retains the complete interior `D5` interval.

The extension-only `c8=(n-7)c7/8` shortcut has exact negative relaxed jets on the lower-zero, upper-capacity, and full-root faces at orders 44, 46, and 43.  Every one violates `Q7`; they are counterexamples to that relaxed cone, not rooted-tree counterexamples and not counterexamples to `Delta^5>=0`.  The theorem retains the full `D5` interval and both exact root capacities.

## Replay and scope

Run

```powershell
python .\replay_rank8_q8_terminal_delta5_all_order.py
```

Expected marker:

```text
RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_REPLAY_PASS
```

Use `--rebuild-finite` to rerun the long orders-21-and-22 census, and `--rebuild-analytic` to recompute all six Bernstein tensors rather than validating their exact reports and hashes.

This theorem does not prove `Delta^0` through `Delta^4`, the complete terminal residual, or the all-tree `Q8` theorem.  The standalone `Q8` target range remains `alpha>=14`.
