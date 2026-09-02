# Forest terminal `m=1`: all-`R` balanced-neighbor shadow cap

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**  This is a structural cap, not
by itself a proof of a remaining terminal-payment sign.

## Path floor for every forest

For integers `n,k>=0`, put

```text
P_k(n)=C(n-k+1,k) if n>=2k-1, and P_k(n)=0 otherwise.
```

Every `n`-vertex forest `X` satisfies

```text
i_k(X)>=P_k(n).                                      (1)
```

This follows by induction on `n`.  If `v` is a leaf with neighbor `u`,

```text
i_k(X)=i_k(X-v)+i_(k-1)(X-N[v])
      >=P_k(n-1)+P_(k-1)(n-2)=P_k(n).
```

An isolated vertex gives an at least as strong recurrence, and the
edgeless case is immediate.  The final equality is Pascal's identity with
the zero convention above.

## Exactly-one-neighbor classes

Let `G` be a forest, mark `w`, and put

```text
F=G-w,  H=G-N_G[w],  d=deg_G(w),  S=|H|,
r_i=deg_G(u_i)-1 for the d neighbors u_i of w,
R=sum_i r_i.
```

The root neighbors are independent.  Moreover, the sets `N_F(u_i)` are
pairwise disjoint subsets of `H`; otherwise `G` would contain a 4-cycle
through `w`.  In particular, `|H-N_F(u_i)|=S-r_i`.

For each `i`, choosing `u_i` together with an independent `(j-1)`-set of
`H-N_F(u_i)` gives an independent `j`-set of `F`.  These classes are
pairwise disjoint and disjoint from the sets lying wholly in `H`.  Hence,
with `h_j=i_j(H)` and `b=i_j(F)`, (1) gives

```text
b>=h_j+sum_i P_(j-1)(S-r_i).                         (2)
```

## Balancing and the cap

For `j>=3`, the integer sequence

```text
r -> P_(j-1)(S-r)
```

is discretely convex: with the same zero convention, its second difference
is `P_(j-3)(S-r-4)>=0` (equivalently the relevant binomial coefficient is
`C(S-r-j,j-3)>=0`).  Therefore the sum in (2), at fixed
`sum r_i=R`, is minimized when the `r_i` differ by at most one.

Write

```text
R=d*q+s,  0<=s<d,
Bneighbor=s*P_(j-1)(S-q-1)+(d-s)*P_(j-1)(S-q).       (3)
```

Since `h_j<=C(S,j)` and `x/(x+Bneighbor)` is increasing in `x`, every
supported target satisfies

```text
y=i_j(H)/i_j(F)
 <= C(S,j)/(C(S,j)+Bneighbor),                       (4)
```

with `y=0` when `h_j=0`.

## Scope

The cap (4) is valid for every root-excess value `R` and is intended to
replace the unrealizable independent endpoint `y=1` in the fixed-rank
forest `m=1` cone.  It does not prove the cone sign, forest `m=0`, the full
terminal payment, unimodality, or Erdos Problem 993.
