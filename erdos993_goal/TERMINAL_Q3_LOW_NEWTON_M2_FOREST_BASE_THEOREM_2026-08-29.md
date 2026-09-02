# Terminal q3 payment: Newton degree 2 over every forest base

Date: 2026-08-29

Status: **proved, with an exact independently replayable symbolic certificate
and a complete finite disconnected-forest census.**

Correction record: the final verifier keeps the entire terminal q3 low block
fixed at every target rank: the adverse coefficient is `3`,
`P=i_3(G disjoint_union tK1)`, `R` is the one-edge rank-4 row,
`a2=i_2(G-w)`, and `c=z2+h2+t*a2`.  Only `b=i_j(G-w)`, `U=i_(j+1)`, and
`e=zj+hj+t*b` use the target `j`.  This supersedes every earlier generalized
forest-m2 hash set announced on 2026-08-29; those sets used at least one
target-dependent quantity in the fixed low block and are retracted.

## Statement

Let `G` be any finite forest, mark a vertex `w`, and form the normalized,
untruncated terminal included-payment margin at any supported target rank
`j>=3`.  Its coefficient of `binom(t-1,2)` is nonnegative.

This is only the Newton-degree-2 terminal payment.  It does not prove degrees
0 or 1, the complete terminal payment, the global q3 envelope, unimodality, or
Erdos Problem 993.

## Forest coordinates

Write

```text
|G|=N+1,       h=c(G)-1,       m=|E(G)|=N-h.
```

For target `j=3`, also put

```text
d=deg_G(w),
W=sum_v C(deg_G(v),2),
V=# connected four-vertex subtrees of G,
X=sum_(v~w)(deg_G(v)-1),
B=sum_(v~w) C(deg_G(v)-1,2),
Y=sum_(dist(w,u)=2)(deg_G(u)-1).
```

Literal inclusion-exclusion gives the independent-set and one-edge rows from
these seven coordinates.  The verifier reconstructs the complete degree-2
terminal coefficient from those rows and cross-checks it against 48,256
literal rooted small-forest cells.

## Target j=3

Let `L=Delta_2/a`, where `a=i_2(G-w)`.  Exact differentiation shows that the
coefficient of `V` in `L` is negative for `N>=13`, whereas the coefficients of
`B` and `Y` are positive.  Thus an upper bound for `V` and the substitutions
`B=Y=0` give a valid lower bound.

For a nontrivial tree component with `p` edges, put

```text
beta=W_component-(p-1).
```

The component inequality used is

```text
V_component <= p + (p/3) beta.                     (1)
```

For `p>=14`, the pinned Zagreb inequality gives the stronger bound

```text
V_component <= p-2+(p/3) beta.
```

For `1<=p<=13`, (1) is checked on every unlabeled tree.  If `s` is the number
of nontrivial components, summing (1), using `p_i<=m`, and then
`s<=min(m,h+1)` gives

```text
V <= m + (m/3)(W-m+min(m,h+1)).                    (2)
```

For disconnected forests with `m>=2`, split into

```text
A: h=1+u,   m=u+v+2, N=2u+v+3;   (m>=h+1)
B: h=1+u+v, m=u+2,   N=2u+v+3.   (m<=h+1)
```

Here `u,v>=0`, and `N>=13` is exactly `2u+v>=10`.  The structural domain is

```text
0<=d<=m,
0<=X<=m-d,
C(d,2)+X <= W <= C(m,2).                           (3)
```

The lower polynomial is concave in `X`.  For fixed `W`, its minimum therefore
lies on `X=0`, on `X=W-C(d,2)`, or on `X=m-d`.  The first and third boundaries
are concave in `W` and reduce to their interval endpoints.  The diagonal is
convex in `W`; its `W^2` coefficient is certified positive, so that positive
term is discarded and the remaining affine lower bound again reduces to two
endpoints.  Every resulting expression has a positive Bernstein certificate
on `0<=d<=m`, followed by positive-coefficient cone and strip certificates on
`2u+v>=10`.  The zero- and one-edge cases factor directly and are positive.

## Targets j>=4

Put `r=N-j` and `y=h_j/i_j(G-w)`.  The tree proof used
`h_(j-1)/b>=j y/r`; that is not valid when the marked vertex is isolated,
because then the terminal `H` may have all `N` vertices.  The correct
all-forest shadow is

```text
h_(j-1)/b >= j y/(r+1).                             (4)
```

The rooted extension floor remains valid: orient each component from a root,
adding arbitrary roots in untouched components.  The terminal `H` contains
the forest obtained by deleting all of those roots, which only weakens the
required lower bound in the correct direction.

The exact forest low rows are

```text
P1=P1(tree)+h,
R1=N(N-h)-2W,
R2=N-h.
```

The retained anchor floors are

```text
A1/a2 >= p0+2p1-R1,
A2/a2 >= N^2+3N+8+3h.
```

For a disconnected forest,

```text
a2=i_2(G-w) >= C(N-1,2)+h-1,                       (5)
0<=W<=C(N-h,2).                                     (6)
```

After the adverse high row is replaced by its correlated incidence upper
bound, the normalized lower expression is affine in the fixed `a2` and
bilinear in `(W,y)`.  Both its `a2`-slope and its value at (5) are certified at the four
corners of (6) and `0<=y<=1`.  Bernstein expansion in `h`, followed by the
cone `j=4+k`, `N=j+r`, `k+r>=9`, has nonnegative coefficients and a positive
base value in every case.  The omitted `A0` term is nonnegative by the pinned
all-forest terminal-anchor theorem.

## Finite and connected partitions

- Connected bases use the pinned all-order tree degree-2 theorem together
  with its exact all-tree finite audit through order 15.
- Disconnected bases of order at most 13 are covered by a complete
  component-multiset census, every inequivalent marked component, and every
  supported `j>=3`.  In every such cell, all fixed-low and target-high fields
  and the resulting `m=2` value are compared to a direct call of the pinned
  canonical `terminal_rows` implementation.
- Disconnected bases of order at least 14 have `N>=13` and are covered by the
  symbolic arguments above.

## Exact replay

```powershell
python .\audit_terminal_q3_low_newton_m2_forest_base_agent.py
```

The command must print

```text
PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2
```

and writes `terminal_q3_low_newton_m2_forest_base_audit_20260829.json`.
