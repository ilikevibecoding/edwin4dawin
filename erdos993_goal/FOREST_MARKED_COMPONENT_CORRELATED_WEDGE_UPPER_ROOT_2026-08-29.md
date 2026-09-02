# Forest marked-component correlated wedge upper bound

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**

## Statement

Let `G` be a forest without isolated components, of order `N+1`, with
`c(G)=h+1`.  Mark a vertex `w` and put

```text
d=deg_G(w),
R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2).
```

Then

```text
W <= C(d,2)+C(R+1,2)+C(N-2h-d-R+1,2).              (1)
```

## Proof

Let the component containing `w` have `e` edges.  The other `h`
nontrivial components consume at least `h` edges, while `G` has `N-h`
edges in total.  Thus

```text
d+R <= e <= N-2h.                                   (2)
```

For every non-root vertex `v` in the marked component, put
`x_v=deg_G(v)-1`.  The total non-root excess is `e-d`; the root neighbors
carry total excess `R`, and the remaining non-root vertices carry
`e-d-R`.  The elementary superadditivity identity

```text
C(a+b+1,2)-C(a+1,2)-C(b+1,2)=a*b>=0                (3)
```

therefore gives

```text
W(marked)<=C(d,2)+C(R+1,2)+C(e-d-R+1,2).            (4)
```

A tree component with `e_i` edges has wedge count at most `C(e_i,2)`.
At fixed positive sum, convex concentration over the other `h` components
gives

```text
W(other)<=C(N-2h-e+1,2).                            (5)
```

Set `L=N-2h-d-R` and `t=e-d-R`.  By (2), `0<=t<=L`.  Adding (4)--(5),
the only variable part is

```text
C(t+1,2)+C(L-t+1,2).
```

This is convex in `t`, so its maximum on `[0,L]` occurs at an endpoint and
equals `C(L+1,2)`.  Substitution proves (1).

## Scope

The lemma sharpens the uncorrelated bound `W<=C(N-2h,2)` whenever the
marked degree and neighbor excess are fixed.  It does not prove a terminal
Newton coefficient, forest `m=0`, the full terminal payment, unimodality,
or Erdos Problem 993.
