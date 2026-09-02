# Rank-eight rooted-deletion ratio floor

Date: 2026-08-25

## Theorem

Let `T` be an `n`-vertex tree, let `q` have degree `d`, and let `k>=2` with
`i_k(T)>0`.  Put

```text
L = C(n-k,k),             A = C(n-d-1,k-1).
```

Then

```text
i_k(T-q)/i_k(T) >= L/(L+A).
```

Since `d>=1` for a nontrivial tree, the universal form is

```text
i_k(T-q)/i_k(T)
 >= C(n-k,k)/[C(n-k,k)+C(n-2,k-1)].                 (1)
```

At the live rank-eight root coordinate `Z=h7/c7`, (1) gives

```text
Z >= C(n-7,7)/[C(n-7,7)+C(n-2,6)].                 (2)
```

The right side of (2) is `11628/34651 > 0.3355` at `n=28` and tends to one
with increasing order.

## Proof

Every `m`-vertex forest `F` satisfies the coefficientwise path-minimality
bound

```text
i_k(F) >= i_k(P_m)=C(m-k+1,k).                      (3)
```

For completeness, induct on `m`.  If `F` is edgeless, (3) is immediate.  If
`v` is a leaf in a nontrivial component, then `N[v]` has exactly two vertices
and

```text
i_k(F)=i_k(F-v)+i_(k-1)(F-N[v]).
```

The induction hypothesis and Pascal's identity give

```text
C(m-k,k)+C(m-k,k-1)=C(m-k+1,k).
```

Now write

```text
h=i_k(T-q),          a=i_(k-1)(T-N[q]).
```

The deletion recurrence is `i_k(T)=h+a`.  The graph `T-q` is an
`(n-1)`-vertex forest, so (3) gives `h>=L`.  The graph `T-N[q]` has
`n-d-1` vertices, hence the trivial subset ceiling gives `a<=A`.  Since
`h/(h+a)` increases with `h` and decreases with `a`,

```text
i_k(T-q)/i_k(T)=h/(h+a) >= L/(L+A),
```

as claimed.

## Exact replay

The verifier checks both Pascal inductions and independently enumerates all
2,287 nonisomorphic trees through order 13.  Across 27,918 roots it checks
180,576 active rank/root cells directly from tree DP, with no violation.

```text
verify_rank8_root_deletion_ratio_floor_root.py
53B98D1ACC7F216A638CA2CEACEB03D2C054AD6957AF511475275220A4948C1F

rank8_root_deletion_ratio_floor_exact_root_20260825.json
D7C629DDC696647839165C4FC5BB9082DDDE90BB51F6B27DC120ECC3DBCAD3B6
```

This theorem supplies a new all-order realizability constraint for the four
live `Delta2` and corresponding `Delta3` root paths.  It does not alone prove
those tensors, connected `Q8`, forest `Q8`, rank-eight PGC, or Problem 993.
