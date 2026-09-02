# Rank-five edge-local theorem for leaf--degree-three edges

Date: 2026-08-25

Status: **proved all-order corollary**.  This closes endpoint-degree type
`(1,3)` in the rank-five token-sliding route.  Five low-degree endpoint
types remain.  This note does not prove the full component-surplus
inequality, connected `Q8`, or Erdős Problem 993.

## Setup

Let `vu` be an edge of an `n`-vertex tree `T`, where `v` is a leaf and
`deg(u)=3`.  Let `p,q` be the other neighbors of `u`.  Put

```text
K=T-{u,v},             H=K-{p,q},             h=|H|=n-4,
I(H;x)=sum a_j x^j.
```

The two components of `K` are rooted at `p,q`.  After deleting those
vertices, let `C_1,C_2` be their child sets in `H`.  These are precisely the
two distinguished-root groups used in
`RANK5_EDGE_LOCAL_DEGREE2_DEGREE2_THEOREM_2026-08-25.md`.

For an independent set `S` of `H`, let

```text
r(S)=2-number of groups C_i hit by S.
```

Define `Z,X,Y` exactly as in the two-group theorem:

```text
Z=sum_(S in I4(H)) |S intersect (C_1 union C_2)|,
X=sum_(S in I4(H)) r(S),
Y=sum_(S in I3(H)) [r(S)+C(r(S),2)].
```

That theorem proves, all-order,

```text
2Z+5X+5Y >=6a4,                                        (1)
```

and the prescribed-root incidence injection proves

```text
5a5 >=(h-12)a4+2Z.                                     (2)
```

## Exact leaf--degree-three decomposition

Deleting along `vu` gives

```text
I(T;x)=(1+x)I(K;x)+xI(H;x).                            (3)
```

Expand the coefficients of `K` by compatible choices from `p,q`.  At rank
five, (3) yields

```text
i5(T)=a5+2a4+X+Y+L,                                   (4)
```

where

```text
L=sum_(S in I2(H)) C(r(S),2) >=0.                     (5)
```

The term `L` is the only addition to the degree-two--degree-two
decomposition; it comes from selecting both `p,q` over a rank-two set of
`H` inside the `xI(K;x)` summand.

Combining (1)--(5),

```text
5i5(T)
 >=(h-2)a4+2Z+5X+5Y
 >=(h+4)a4.                                             (6)
```

The edge-local target is

```text
(n-2)(n-3)a4 <=5(n-4)i5(T).
```

For `h>=2`, divide by `h` and use

```text
(n-2)(n-3)/h=h+3+2/h <=h+4.
```

For `h=0,1`, `a4=0`.  Thus (6) proves the target for every `(1,3)`
edge.

The remaining endpoint-degree pairs are

```text
(1,4), (2,3), (1,5), (2,4), (3,3).
```

## Exact replay and proof boundary

`verify_rank5_edge_local_leaf_degree3_theorem_root.py` independently checks
the decomposition (4), including `L`, on every requested nonisomorphic-tree
order.  It also reconstructs the prescribed-root incidence injection and
checks the original edge-local margin exactly.

The all-order proof is the two-group lemma plus equations (2)--(6).  The
bounded census is an audit only.
