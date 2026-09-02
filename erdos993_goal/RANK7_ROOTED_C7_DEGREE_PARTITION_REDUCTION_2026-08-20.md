# Rank-seven rooted-`C7` excess-degree-partition reduction

Date: 2026-08-20

Status: **PROVED PARTIAL ANALYTIC REDUCTION.** This certifies `C7>0` on
110,859 exact excess-degree-partition/root-degree profiles inside the old
orders-24--38 residual. It leaves 103,608 profiles and is not a universal
rooted-`C7` theorem.

## Statement

Let `T` be a tree of order `24<=n<=38`, rooted at a vertex of degree `r`.
For every nonleaf vertex put `x_v=deg(v)-1`, and let `lambda` be the
descending partition of `n-2` formed by the positive `x_v`. Define

```text
Bj = sum_v binom(x_v,j),       j=2,3,4,
M  = max(lambda),
q  = number of parts of lambda.
```

The exact verifier computes the rational scalar `G(n,r,lambda)` below. If

```text
G(n,r,lambda)>0,
```

then, for every placement of that degree sequence and every root of degree
`r`,

```text
C7(T,p)=i5(T)(i6(T)^2-i5(T)i7(T))
        -2i6(T)(i6(T)i5(T-p)-i5(T)i6(T-p)) > 0.
```

Thus the check is over degree partitions, not over selected sample trees.

## Exact retained motif bounds

Put `N=n-2`, `E=sum_(uv in E(T)) x_u x_v`, `X=E-(n-3)`, and let `W` be the
number of connected four-edge subtrees minus `n-4`. The proved rank-(4,5)
motif identity is

```text
L := 5(n-3)i5-(n-7)(n-8)i4
   = A B2-B B3-C X+D W,

A=(3n^3-40n^2+133n-40)/2,
B=4n^2-35n+49,
C=4n^2-30n+34,
D=5(n-3).
```

This reduction retains more of that identity than the earlier `B2`-only
cut. The Zagreb inequality and the maximum-excess rooting bound give

```text
X <= X* := min((2(n-4)B2-6B3)/7, M(N-M)-(n-3)).
```

The connected-subtree inequalities and the literal degree-four stars give

```text
W >= B2+B3+max(0,X),
W >= B3+B4-(n-4).
```

Because `C-D=B>0`, the resulting lower expression is decreasing in `X`.
Consequently a valid exact lower bound is

```text
W* = max(B2+B3+max(0,X*), B3+B4-(n-4)),
L* = A B2-B B3-C X*+D W*.
```

The positive-excess vertices induce a connected tree. Hence `E>=q-1`, and
the exact four-set motif formula gives

```text
i4 <= I4* := min(
  binom(n-1,4),
  binom(n,4)-(n-1)binom(n-2,2)
  +(n-2+B2)(n-4)+binom(n-1,2)
  -(B2+B3+q-1)).
```

It follows that

```text
mu4=5i5/i4
 >= (n-7)(n-8)/(n-3) + L*/((n-3)I4*) =: mu4*.
```

Apply the proved piecewise-sharp transfer

```text
mu5 >= 2 Phi(mu4)/mu4,
```

where `Phi` linearly interpolates `Phi(j)=binom(j-1,2)`. This transfer is
increasing on every integer interval, so `x=i6/i5` is bounded below by

```text
x* = 2 Phi(mu4*)/(6mu4*).
```

Finally, the exact root-deletion argument with
`F=T-N[p]`, `a=i4(F)`, `b=i5(F)`, and
`Lr=(n-r-5)/5` gives

```text
S7/d^2 >= G(n,r,lambda)
        := 1+2x*-28(Lr-x*)/(1+Lr).
```

The identity `14C7=i6*S7+i5*Q6` and the proved `Q6>=0` finish every profile
with `G>0`.

## Exact finite reduction

Order 23 is excluded here because it is separately closed by a full all-root
WROM census. Within the previous 76 order/root cells at orders 24--38, exact
partition enumeration gives

```text
old residual degree-partition profiles   214,467
newly certified                           110,859
remaining                                 103,608
certified fraction                 110859/214467
largest B2 in the new residual                  196
```

The compact report records orderwise counts, the complete residual `B2`
histogram, the exact worst relaxed scalar at each order, and a SHA-256 digest
of the canonical list of all 103,608 remaining triples
`(n,r,lambda)`. Re-running the verifier regenerates that list and digest.

The relaxed minima start with low-curvature partitions such as

```text
(3,2,2,1,...,1),   B2=5,
```

so the surviving obstruction is now explicitly root-neighborhood placement
coupling. Merely adding another global `B2` floor does not address it.

## Exact no-go retained

The already proved pure-cubic terminal coefficient cone cannot simply be
reused to prove rooted `C7`. In the exact outer cell

```text
n=23, k=-7, r=1, edge_e=20,
(U,V,Z,A)=(17/20,0,0,0),
b=(m-4)a/5,
```

every cone constraint is nonnegative but the formal raw rooted-cross value
is

```text
-353565691207652162916141205148456829411186834919
--------------------------------------------------- < 0.
 2798854216026576331681512000000000000
```

This is a counterexample to that relaxed proof route, not a tree
counterexample. It is stored so the same unsafe shortcut is not retried.

## Replay

```powershell
python .\verify_rank7_rooted_c7_degree_partition_reduction.py
python .\verify_rank7_rooted_c7_pure_cubic_relaxation_obstruction.py
```

The expected markers are

```text
PASS_EXACT_ROOTED_C7_DEGREE_PARTITION_REDUCTION_ORDERS_24_THROUGH_38
PASS_EXACT_ROOTED_C7_PURE_CUBIC_RELAXATION_OBSTRUCTION
```
