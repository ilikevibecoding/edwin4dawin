# Rank-eight rooted-deletion extension floor

Date: 2026-08-25

## Theorem

Let `T` be an `n`-vertex tree, let `q` have degree `d`, and fix `k>=2`.
Set

```text
s=k-1,   H=T-N[q],   m=n-d-1,
a=i_s(H),             h=i_k(T-q).
```

If `a>0`, then

```text
k h >= a [n-1-3s+2s/m-min(s,d)].                    (1)
```

Consequently, whenever the bracket `R_d` in (1) is positive,

```text
h/(h+a) >= R_d/(R_d+k).                              (2)
```

This can be combined with the earlier exact binomial floor

```text
h/(h+a) >= C(n-k,k)/[C(n-k,k)+C(n-d-1,k-1)].         (3)
```

## Proof

Choose a uniform independent `s`-set `R` of the `m`-vertex forest `H`.
The forest selected-degree incidence injection gives

```text
E[sum_(v in R) deg_H(v)] <= 2s-2s/m.                 (4)
```

For completeness, root every component of `H`. Map every downward
selected-edge incidence injectively to an upward one: either slide the
selected parent to its unoccupied child, or, if that child has selected
children, charge the least selected child. Choose the root of each component
to maximize its number of occurrences among the independent `s`-sets. The
total number of selected root occurrences is at least `s i_s(H)/m`, which
sharpens the usual `2s` bound to (4).

Let `B=N_T(q)`. A vertex of `H` cannot be adjacent to two vertices of `B`,
because those two edges together with their edges to `q` would form a cycle.
Therefore `R` meets at most `min(s,d)` distinct vertices of `B`. The number
of vertices that extend `R` to an independent `k`-set of `T-q` is at least

```text
n-1-s-sum_(v in R)deg_H(v)-min(s,d).
```

Averaging and applying (4) gives the bracket on the right of (1). Summing
these extension counts over all `R` counts any independent `k`-set of `T-q`
at most `k` times: a set with all `k` vertices in `H` is counted `k` times,
a set with exactly one vertex in `B` is counted once, and a set with two or
more vertices in `B` is not counted. Hence the extension-pair sum is at most
`k h`, proving (1). Dividing by `a` and applying the increasing map
`x -> x/(1+x)` proves (2).

## Rank-eight corollary

For the live rank-eight coordinate

```text
Z=h7/c7=i_7(T-q)/i_7(T)
```

and every `n>=28`, split on the degree of `q`.

If `d<=3`, the extension floor is minimized at `d=3`, and (2) gives

```text
Z >= E3=(n^2-26n+100)/(n^2-19n+72).                  (5)
```

If `d>=4`, (3) and monotonicity of the binomial coefficient give

```text
Z >= B4=(n-11)(n-12)(n-13)
        /[(n-11)(n-12)(n-13)+7(n-5)(n-6)].           (6)
```

Thus the following single degree-free bound is valid:

```text
Z >= min(E3,B4).                                     (7)
```

Exact cross multiplication shows that `E3<=B4` precisely when

```text
n^3-53n^2+520n-1288 <= 0.
```

For integer `n>=28`, this holds through `n=41`; the cubic is positive at
`42` and strictly increasing thereafter. Therefore (7) is equivalently

```text
Z >= E3,  28<=n<=41;
Z >= B4,  n>=42.                                     (8)
```

At `n=28`, this improves the previous degree-free floor from
`11628/34651` to

```text
Z >= 13/27 = 0.481481...
```

## Exact replay and independent audit

The producer verifies 77,211 exact degree/order algebra cells, all 2,287
nonisomorphic trees through order 13 (172,302 active extension cells), and
4,284 live rank-seven roots in deterministic larger families.

```text
verify_rank8_root_deletion_extension_floor_root.py
2BB6CE48D9A8B49BCDE3B65FF07AB8F11FACC6397CC2A4E6064B6B5F5AEB76B3

rank8_root_deletion_extension_floor_exact_root_20260825.json
BEE275224112110FEFBE2985EC3F58C039CF158371F58C3FC23AF89DD58D31D9
```

The independent audit imports no producer code. It literally enumerates
382,045 independent subsets, checks every selected degree and extension,
and separately replays the live bound with a fresh include/exclude tree DP.

```text
audit_rank8_root_deletion_extension_floor_root.py
5C9FABCFEB4EE4987B85F361600525CD2D62121C9423872C2B6E634BDFA92920

rank8_root_deletion_extension_floor_independent_audit_root_20260825.json
B2B3F3994D683582DCBF91BD403D3C130588BDBE4405A94F6E847A70B3AB7281
```

This theorem is a stronger all-order realizability constraint. It does not
by itself prove a pending `Delta0..Delta3` tensor, connected `Q8`, forest
`Q8`, rank-eight PGC, or Erdos Problem 993.
