# Rank-five edge-local theorem for degree-two--degree-two edges

Date: 2026-08-25

Status: **proved all-order theorem**.  This closes endpoint-degree type
`(2,2)` in the rank-five token-sliding route.  Six low-degree endpoint types
remain.  This note does not prove the full component-surplus inequality,
connected `Q8`, or Erdős Problem 993.

## 1. Setup and exact coefficient decomposition

Let `uv` be an edge of an `n`-vertex tree `T` with
`deg(u)=deg(v)=2`.  Let `p` and `q` be the other neighbors of `u` and `v`,
respectively.  Delete `u,v,p,q` and call the remaining forest `H`; put

```text
h=|H|=n-4,              I(H;x)=sum a_j x^j.
```

In `T-{u,v}`, the vertices `p,q` root two different components.  Let
`C_1` be the children of `p` and `C_2` the children of `q`, so every
component of `H` has exactly one distinguished root in

```text
C=C_1 union C_2.
```

For an independent set `S` of `H`, define

```text
z(S)=|S intersect C|,
g(S)=number of groups C_i hit by S,
r(S)=2-g(S).
```

Thus `r(S)` is the number of `p,q` that can be added to `S`.  Put

```text
Z=sum_(S in I4(H)) z(S),
X=sum_(S in I4(H)) r(S),
Y=sum_(S in I3(H)) [r(S)+C(r(S),2)].
```

Deleting the adjacent pair `u,v` gives

```text
I(T;x)=I(K;x)+xI(K-p;x)+xI(K-q;x),
```

where `K=T-{u,v}`.  Sorting the rank-five terms by their intersection
with `H` yields the exact identity

```text
i5(T)=a5+2a4+X+Y.                                      (1)
```

There are no lower-rank terms because only the two roots `p,q` are outside
`H` inside `K`.

## 2. Prescribed-root extension bound

Orient every component of `H` away from its distinguished root in `C`.
For all independent four-sets, let `U` be the total number of selected
nonroots and `D` the total selected-degree sum.

The downward-to-upward incidence injection from
`RANK5_EDGE_LOCAL_LEAF_DEGREE2_THEOREM_2026-08-25.md` applies verbatim with
these prescribed roots.  Hence

```text
D<=2U,                    Z+U=4a4.
```

Double counting one-vertex extensions in `H` therefore gives

```text
5a5 >=(h-4)a4-D
     >=(h-4)a4-2U
      =(h-12)a4+2Z.                                    (2)
```

## 3. Two-group pointwise lemma

The key inequality is

```text
2Z+5X+5Y >=6a4.                                        (3)
```

Let `B=H-C`.  Fix an independent `s`-set `A` of `B`, and let `x,y` be
the numbers of distinguished roots in `C_1,C_2` compatible with `A`.
Every independent set of `H` over `A` is obtained by choosing compatible
roots.  Sum its contribution to the left side of (3) minus `6a4`, using
rank four and rank three together.  For `s=4,3,2,1,0`, respectively, the
five pointwise slacks are

```text
P4 = 4,

P3 = x+y+15,

P2 = 3[C(x,2)+C(y,2)]-2xy+5(x+y)
   = 3(x-y)^2/2+xy+7(x+y)/2,

P1 = 5[C(x,3)+C(y,3)+C(x,2)+C(y,2)],

P0 = 7[C(x,4)+C(y,4)]
     +2[xC(y,3)+C(x,2)C(y,2)+C(x,3)y]
     +5[C(x,3)+C(y,3)].
```

Every expression is nonnegative for integers `x,y>=0`.  Summing over all
independent sets of `B` proves (3).  Notice that the only negative raw
rank-four contribution occurs when exactly one root from each group is
selected; its rank-three shadow is retained in the displayed `P_s` sums.

## 4. Completion of the edge theorem

Equations (1)--(3) give

```text
5i5(T)
 =5a5+10a4+5X+5Y
 >=(h-2)a4+2Z+5X+5Y
 >=(h+4)a4.                                             (4)
```

The edge-local target is

```text
(n-2)(n-3)a4 <=5(n-4)i5(T).
```

For `h>0`, divide by `h` and use

```text
(n-2)(n-3)/h=(h+2)(h+1)/h=h+3+2/h.
```

When `h>=2`, this is at most `h+4`, so (4) proves the target.  When
`h=0` or `h=1`, `a4=0`, and the target is immediate.

The remaining endpoint-degree pairs are now

```text
(1,3), (1,4), (2,3), (1,5), (2,4), (3,3).
```

## 5. Exact replay and proof boundary

`verify_rank5_edge_local_degree2_degree2_theorem_root.py` symbolically
reconstructs all five `P_s` expressions.  On every requested
nonisomorphic-tree order it also checks (1), builds the prescribed-root
incidence injection literally, and verifies both (3) and the original
edge-local margin in integer arithmetic.

Sections 1--4 are the all-order proof.  The bounded census is an independent
audit, not a finite substitute for the proof.
