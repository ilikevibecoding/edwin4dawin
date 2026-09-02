# Terminal-q3 Newton m=1, target j=3, marked leaf

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M1_J3_MARKED_LEAF`

## Theorem

Let `G` be a tree of order `n>=15` and let the marked vertex `w` be a
leaf.  At terminal target `j=3`, the coefficient of `binom(t-1,1)` in the
normalized, untruncated included-payment margin is nonnegative.

This proves one exact sector of Newton degree `m=1`.  It does not cover a
marked vertex of degree at least two, targets `j>=4`, degree `m=0`, the
complete terminal payment, unimodality, or Erdos Problem 993.

## Common-motif reduction

Put `F=G-w` and `N=|F|`.  Since `w` is a leaf, `F` is a tree.  Root `F`
at the unique neighbor of `w` and define

```
R   = root degree in F,
Y   = sum_(u adjacent root)(deg_F(u)-1),
e   = sum_v C(deg_F(v)-1,2),
tau = T4(F)-(N-3),
y   = i3(F-root)/i3(F).
```

Adding the leaf gives the exact shared-surplus identity

```
tau_G = tau + C(R,2) + Y - 1.
```

The verifier reconstructs the exact Newton coefficient from the tree
rank-three and rank-four motif formulas.  The same `tau` is retained in
all four locations where it occurs: `A0`, `R0`, the terminal one-edge
count `z3`, and `i4(F)`.  Taking independent extrema in those locations is
invalid and produces false negative relaxations.

After division by the positive `i3(F)`, the exact margin is affine in
`Y,tau,y`.  The necessary all-order bounds are

```
1 <= R <= N-1,
C(R-1,2) <= e <= C(N-2,2),
0 <= Y <= N-R-1,
0 <= tau <= (N-1)e/3,
0 <= y <= 1.
```

The rank-four bound is the pinned quantitative path-surplus theorem.
Exact tensor-Bernstein certificates prove that the margin decreases in
each of `Y,tau,y`.  It therefore suffices to set

```
Y=N-R-1,  tau=(N-1)e/3,  y=1.
```

The verifier also identifies and checks the three cleared derivative
denominators exactly: `6 i3(F)`, `12 i3(F)`, and `12`, respectively.
Thus the Bernstein certificates are applied only after a fail-closed
positive-denominator check, rather than an unsigned rational clearing.

Write `N=15+q`, map `R` affinely to the unit interval, and map `e` between
`C(R-1,2)` and `C(N-2,2)` to a second unit interval.  The cleared worst
margin has bidegree `(6,3)`.  All 28 tensor-Bernstein coefficients are
polynomials in `q` with strictly positive power coefficients.  The three
adverse derivative certificates use 6 coefficients each and are also
strictly positive.

At the endpoint-rooted path the formula specializes exactly to

```
(N-1)(N^8+38N^7+30N^6-436N^5-1119N^4
      +1214N^3+4400N^2+5664N+6912)
/ [24(N-4)(N-3)],
```

which is positive and matches the literal Newton coefficient divided by
`i3(F)`.  This is the asymptotically tight compensation family found by
the independent adversarial census.

## Independent literal audit

The verifier separately enumerates subsets rather than importing the
terminal-payment producer.  On every unlabeled tree of orders 4 through
10 and every leaf root, it recomputes the two required payment values and
checks the exact motif formula.  All 952 formula checks pass after 679,012
subset masks; the ordered value-stream SHA256 is
`59CA3FCF6FA9746EA228F95E59C0C13BFF1880AAB0FADDF2ACD7BD944026ABC0`.

The symbolic proof covers `N>=15`, equivalently `n>=16`.  The pinned exact
all-tree census through order 15 supplies the `n=15` boundary.

## Frozen replay

- `prove_terminal_q3_low_newton_m1_j3_leaf_independent_agent.py`
  SHA256 `A2B0BCF7A3DD5DC9D9EC2D19123AB4191B4291B955AC26BFB254D2BBF7D86517`
- `terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json`
  SHA256 `20521722242C30C421568E2CA6336F56AB4EDFE7A36DE3692E38AB03DCCD20F4`

Run the Python verifier.  It fails closed on every pinned dependency,
motif identity, literal value, derivative sign, Bernstein coefficient, or
finite-boundary status mismatch.
