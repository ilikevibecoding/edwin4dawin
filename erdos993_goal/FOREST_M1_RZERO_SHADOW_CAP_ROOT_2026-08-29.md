# Forest terminal `m=1`: exact `R=0` shadow cap

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**  This note does not by itself
prove any remaining terminal-payment sign.

## Statement

Let `G` be a forest with marked vertex `w`, put

```text
F=G-w,  H=G-N_G[w],  d=deg_G(w),  S=|H|,
R=sum_(u~w)(deg_G(u)-1).
```

Fix `j>=1`, set `b=i_j(F)`, and, when `b>0`, set
`y=i_j(H)/b`.  On the face `R=0`,

```text
y <= (S-j+1)/(S-j+1+d*j)                          (1)
```

whenever `i_j(H)>0`.  If `i_j(H)=0`, then `y=0`.

## Proof

When `R=0`, every neighbor of `w` is a leaf of `G`.  After deleting `w`
these `d` vertices are isolated, so there is an exact disjoint-union
identity

```text
F = H disjoint_union d*K1.
```

Writing `h_k=i_k(H)`, coefficient extraction gives

```text
b=sum_(t=0)^min(d,j) C(d,t) h_(j-t)
 >= h_j+d*h_(j-1).                                 (2)
```

Count pairs `(A,x)` in which `A` is an independent `(j-1)`-set of `H`
and `A union {x}` is an independent `j`-set.  Every independent `j`-set
produces exactly `j` pairs, while a fixed `A` has at most `S-j+1`
extensions.  Hence

```text
j*h_j <= (S-j+1)*h_(j-1).                          (3)
```

If `h_j>0`, then `S>=j`, so the denominator is positive.  Combining
(2)--(3) and dividing by `b` gives (1).  The case `h_j=0` is immediate.

## Scope

The cap is exact for the `R=0` structural face and is intended to replace
the unrealizable relaxed endpoint `y=1` in the fixed-rank forest `m=1`
cone.  It says nothing about `R>0`, forest `m=0`, the full terminal
payment, unimodality, or Erdos Problem 993.
