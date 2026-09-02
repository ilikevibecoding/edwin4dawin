# Forest terminal `m=1`: exact `R=Rmax` balanced-center cap

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**  This note does not by itself
prove a terminal-payment sign.

## Equality structure

Let `G` be a forest without isolated components, with marked vertex `w`,
and put

```text
F=G-w,  H=G-N_G[w],  d=deg_G(w),
h=c(G)-1,  N=|G|-1,
R=sum_(u~w)(deg_G(u)-1),  Rmax=N-2h-d.
```

If `R=Rmax`, then every one of the other `h` components is `K2`, and every
non-root edge in the marked component is incident with a neighbor of `w`.
Consequently there are integers `r_1,...,r_d>=0`, with `sum r_i=R`, such
that

```text
H = R*K1 disjoint_union h*K2,
F = (disjoint union_i K_(1,r_i)) disjoint_union h*K2.   (1)
```

Indeed, the other components consume at least `h` edges, so the marked
component has at most `N-2h` edges.  Its `d` root edges leave at most
`N-2h-d` further edges, while `R` counts a subset of those further edges.
Equality forces equality at every step, which gives (1).

## Balanced-center cap

Define

```text
L_t(x,h)=[z^t](1+z)^x(1+2z)^h
        =sum_ell C(x,t-ell) C(h,ell) 2^ell.             (2)
```

The `H` row in rank `j` is `L_j(R,h)`.  In addition to all sets from `H`,
`F` has the pairwise disjoint classes formed by choosing exactly the center
of arm `i` and then an independent `(j-1)`-set from

```text
(R-r_i)*K1 disjoint_union h*K2.
```

Therefore

```text
i_j(F)>=L_j(R,h)+sum_i L_(j-1)(R-r_i,h).               (3)
```

For fixed `t,h`, the sequence `x -> L_t(x,h)` is discretely convex, since

```text
Delta^2 L_t(x,h)=L_(t-2)(x,h)>=0                       (4)
```

with the usual zero convention below rank zero.  Because
`sum_i(R-r_i)=(d-1)R`, the sum in (3) is minimized when the `r_i` differ by
at most one.

Write `R=d*q+s`, where `0<=s<d`, and put

```text
Bcenter=s*L_(j-1)(R-q-1,h)+(d-s)*L_(j-1)(R-q,h).       (5)
```

For every supported target, the exact endpoint cap is

```text
y=i_j(H)/i_j(F)
 <= L_j(R,h)/(L_j(R,h)+Bcenter).                       (6)
```

## Scope

The cap applies only on the structural equality face `R=Rmax`.  It is
intended to replace the unrealizable relaxed endpoint `y=1` in the fixed-
rank forest `m=1` cone.  It does not cover interior `R`, forest `m=0`, the
full terminal payment, unimodality, or Erdos Problem 993.
