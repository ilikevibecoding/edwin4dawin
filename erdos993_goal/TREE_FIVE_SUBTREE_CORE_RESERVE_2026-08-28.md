# Tree five-subtree core reserve

Date: 2026-08-28

Status: **proved for every finite nonstar tree; exact producer pass,
independent audit pending**.

## Statement

Let `T` be an `n`-vertex nonstar tree and put

```text
x_v=d(v)-1,
B_k=sum_v C(x_v,k),
X=sum_(uv in E(T)) x_u x_v-(n-3).
```

Let `V5(T)` be the number of connected induced five-vertex subtrees.  Then

```text
V5(T) >= B4+B3+B2+X.                                  (1)
```

Equivalently, with `Omega=V5(T)-(n-4)`,

```text
Omega >= B4+B3+B2+X-(n-4).                            (2)
```

The inequality is sharp on every once-subdivided star.  It is an all-order
structural theorem, not a finite extrapolation.

## Shape decomposition

Every connected five-vertex subtree has one of the three tree shapes
`K1,4`, the degree-sequence `(3,2,1,1,1)` shape, or `P5`.  Their counts are

```text
S = sum_v C(d(v),4)=B4+B3,

Y = sum_(uv in E(T)) [C(x_u,2)x_v+x_u C(x_v,2)],

Z = sum_v sum_({u,w} subset N(v)) x_u x_w.
```

Thus

```text
V5=B4+B3+Y+Z.                                         (3)
```

It remains to show `Y>=B2+X`; the path term `Z` is already nonnegative.

## Exact core identity

Delete all leaves of `T` and call the remaining nonleaf core `K`.  Because
`T` is not a star, `K` is a tree with at least two vertices.  For `v in K`,
write

```text
delta_v=deg_K(v),       a_v=x_v-1>=0.
```

The exact identity is

```text
2(Y-B2-X)
 = sum_(v in K) (delta_v-1)a_v(a_v-1)
   +sum_(uv in E(K)) a_u a_v(a_u+a_v).                (4)
```

Every term on the right is nonnegative: `delta_v>=1` in the nontrivial core
and `a_v(a_v-1)>=0` for integer `a_v>=0`.  Hence `Y>=B2+X`, and (1) follows
from (3).

For completeness, (4) comes from two one-line expansions.  On a core edge,

```text
2[C(a_u+1,2)(a_v+1)+(a_u+1)C(a_v+1,2)]
 =a_u^2+a_u+a_v^2+a_v
  +a_u a_v(a_u+a_v)+2a_u a_v.
```

Also

```text
X=sum_v(delta_v-1)a_v+sum_(uv in E(K))a_u a_v.
```

Summing the edge expansion and subtracting `2B2+2X` gives (4).

## Two companion bounds

The same coordinates give two useful all-order restrictions for the pending
`q4/q3` margin.

First, let `N=n-2=sum_v x_v` and `m=max_v x_v`.  Root `T` at a vertex with
weight `m`.  Every nonroot vertex contributes one parent edge, so

```text
sum_(uv in E(T))x_u x_v
 <=m sum_(v != root)x_v
 =m(N-m).
```

Because `X>=0` for nonstars by the displayed core formula,

```text
0<=X<=m(N-m)-(N-1).                                   (5)
```

Second, if `B2>0`, use weights `w_v=C(x_v,2)` and `y_v=x_v-2`.  Then

```text
sum w_v=B2,
sum w_v y_v=3B3,
sum w_v y_v^2=12B4+3B3.
```

Cauchy--Schwarz yields

```text
4B2 B4 >= B3(3B3-B2).                                (6)
```

The case `B2=0` is immediate.

## Replayable evidence

Run

```powershell
python .\verify_tree_five_subtree_core_reserve_root.py
```

The producer symbolically reconstructs the local expansion and the core
identity.  It then checks all structural formulas and margins on every
unlabeled tree through order 18, while also literally enumerating connected
five-subsets on the configured small-order audit range.

## Scope boundary

This supplies a new sharp lower bound for the five-vertex coordinate in
`4i4*s3-3i3*s4`.  It does **not** by itself prove `q4<=q3`, the later-rank
envelope, independence-sequence unimodality, or Erdős Problem 993.
