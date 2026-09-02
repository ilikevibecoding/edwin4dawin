# Rank-seven terminal-broom theorem for pure-cubic `B2=5` trees

Date: 2026-08-20

Status: **PROVED EXACTLY FOR BOTH PURE-CUBIC SKELETONS, EVERY ORDER
`23<=n<=38`, AND EVERY ROOT.** Together with the separately proved mixed
`B2=5` theorem, this closes the complete `B2=5` terminal-broom band. It does
not close the remaining `B2>=6` band.

## Theorem

Let `A` be a tree of order `23<=n<=38` with

```text
B2(A)=sum_v binom(deg_A(v)-1,2)=5,
```

and suppose every branch vertex has degree three. For every root `q` of `A`,
all fourteen Newton coefficients of the rank-seven terminal-broom residual
are nonnegative. In particular,

```text
R_t(A,q)>=0
```

for every integer `t>=1`.

## Exhaustive structural class

The contribution partition of `B2=5` is `1+1+1+1+1`, so suppressing all
degree-two vertices leaves five degree-three branch vertices and seven leaves.
There are exactly two compatible suppressed skeletons: the branch-vertex tree
is either `P5` or the five-vertex `T`. Roots have degree `r` in `{1,2,3}`.

Write the eleven positive skeleton-edge lengths as `L_e`. Let

```text
p = number of branch--branch channels with L_e>=2,
q = number of branch--leaf channels with L_e>=2.
```

The all-length identity proved in
`RANK7_B2_5_PURE_CUBIC_C4_IDENTITY_2026-08-17.md` is

```text
i4(A)=binom(n-3,4)+5n-32+p-q.                    (1)
```

Every formula and feasibility constraint in the endpoint proof depends on
`p,q` only through

```text
k=p-q in {-7,-6,...,4}.                          (2)
```

The finite audit independently verifies that the full rectangle
`0<=p<=4,0<=q<=7` maps onto exactly these twelve values.

## Exact endpoint cone

Put `J=A-N[q]`, `m=|J|`, `a=i4(J)`, and `b=i5(J)`. The exact bad-set
double counts, the proved forest rank-(4,5) ratio, ordinary extension
counting, literal containment `J subset A-q`, and the fixed-`e(J)`
edge--bad-four incidence bound give the affine interval implemented by
`prove_rank7_pure_cubic_b2_5_joint_bernstein.py`.

The twelve rooted profiles are the three values `r=1,2,3` together with every
feasible neighbor mass `1<=m-e(J)<=2r`. Balancing the neighbor excesses in
`{0,1,2}` weakens the local `B2` exclusion and the retained single-neighbor
payment, so the implemented cells are safe supersets of all literal roots.

After `h5=c5-a` and `h6=c6-b`, the seven low coefficients are strictly
concave in `b`. Their exact second derivatives are those proved in
`RANK7_TERMINAL_BROOM_JOINT_BRANCHING_SURPLUS_REDUCTION_2026-08-17.md`.
Thus every minimum occurs on an active affine lower or upper endpoint.

For each order, value of `k`, rooted profile, active endpoint, and Newton rank,
the verifier maps the remaining exact rational cell to `[0,1]^4`. It either
discards an empty endpoint from a Bernstein-negative feasibility constraint or
certifies the objective by exact rational Bernstein coefficients, subdividing
at dyadic midpoints only when the initial coefficient box is inconclusive.
No floating-point sign decision is used.

## Complete no-gap sweep

The final coverage is

```text
orders                         23..38
k=p-q                          -7..4
rooted profiles per (n,k)      12
Newton ranks                   0..6
order-k blocks                 192
endpoint-rank branches         96,768
adaptive Bernstein nodes       187,814
unresolved or negative         0.
```

The four order-23 reports and the two checkpointed long-range reports cover
the disjoint ranges

```text
n=23, k=-7, rank 0;
n=23, k=-7, ranks 1..6;
n=23, k=-6, ranks 0..6;
n=23, k=-5..4, ranks 0..6;
n=24..30, k=-7..4, ranks 0..6;
n=31..38, k=-7..4, ranks 0..6.
```

The no-gap verifier asserts every parameter range, every completed `(n,k)`
block, the expected profile/endpoint/branch counts, all PASS statuses, and all
artifact hashes. It prints

```text
PASS_EXACT_RANK7_PURE_CUBIC_B2_5_ALL_ORDERS_23_38
```

when run as

```powershell
python .\verify_rank7_pure_cubic_b2_5_parameter_reduction.py
python .\verify_rank7_pure_cubic_b2_5_final.py
```

The assembled exact report is
`rank7_pure_cubic_b2_5_final_exact_20260820.json`, whose SHA-256 is
`D8E3B2BB3E55D7528819B625DBF8224069BD3CFE81D93D8313DE41D9BBAB8DB0`.

## Consequence and remaining cut

The universal high-Newton theorem already proves `Delta^7` through
`Delta^13`. Therefore the seven low-coefficient sweep above proves the full
terminal residual for every pure-cubic `B2=5` tree. Combined with
`RANK7_TERMINAL_BROOM_B2_5_MIXED_FINITE_THEOREM_2026-08-16.md`, the entire
`B2=5` band at orders 23 through 38 is closed.

The exact remaining rank-seven terminal band is now `B2>=6`. The independent
full WROM certificates additionally close all roots at orders 23 and 24, so
after those are replay-packaged the live finite cut is

```text
25<=n<=38, B2>=6.
```

