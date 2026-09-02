# Fixed-edge upper bound for independent triples in a forest

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**

Let `X` be a forest on `n` vertices with `e` edges.  Then

```text
i3(X)<=C(n,3)-e*(n-2)+C(e,2).                       (1)
```

Indeed, inclusion-exclusion over edges is exact at rank three:

```text
i3(X)=C(n,3)-e*(n-2)+W(X),
W(X)=sum_v C(deg_X(v),2).                            (2)
```

A tree component with `e_i` edges has wedge count at most `C(e_i,2)`:
write `x_v=deg(v)-1`, use `sum_v x_v=e_i-1`, and concentrate the
nonnegative excesses.  Superadditivity of `C(x,2)` across components then
gives

```text
W(X)<=sum_i C(e_i,2)<=C(sum_i e_i,2)=C(e,2).         (3)
```

Combining (2)--(3) proves (1).  The bound is sharp for a star with `e`
edges together with `n-e-1` isolates.

For `H=G-N[w]` in the marked-forest setup,

```text
|H|=N-d,  e(H)=N-h-d-R,
```

so (1) supplies an exact parameter-only upper endpoint for `i3(H)`.

This lemma alone does not prove a terminal Newton sign, forest `m=0`, the
full terminal payment, unimodality, or Erdos Problem 993.
