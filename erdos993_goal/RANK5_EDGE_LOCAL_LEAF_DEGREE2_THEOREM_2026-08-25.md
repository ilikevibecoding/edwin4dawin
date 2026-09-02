# Rank-five edge-local theorem for leaf--degree-two edges

Date: 2026-08-25

Status: **proved all-order theorem**.  This closes endpoint-degree type
`(1,2)` in the rank-five token-sliding route.  Together with the
high-degree-sum theorem, seven low-degree endpoint types remain.  This note
does not prove the full component-surplus inequality, connected `Q8`, or
Erdős Problem 993.

## 1. Edge setup

Let `uv` be an edge of an `n`-vertex tree `T`, where `v` is a leaf and
`deg(u)=2`.  Let `w` be the other neighbor of `u`, and put

```text
K=T-{u,v},             H=K-w,             J=K-N_K[w].
```

Write

```text
I(H;x)=sum a_j x^j,    I(J;x)=sum b_j x^j,
h=|H|=n-3.
```

Deleting along the terminal path `w-u-v` gives the exact identity

```text
I(T;x)=(1+2x)I(H;x)+x(1+x)I(J;x),
```

and hence

```text
i5(T)=a5+2a4+b4+b3.                                  (1)
```

The edge-local target at `uv` is

```text
(n-2)(n-3)a4 <=5(n-3)i5(T).
```

When `h=0` this is immediate.  Otherwise it is equivalent to

```text
(h+1)a4 <=5i5(T).                                     (2)
```

## 2. A prescribed-root incidence bound

The components of `H` have distinguished roots: the neighbors of `w` in
`K`.  Let `R` be this root set, so `J=H-R`.  For all independent four-sets
`S` of `H`, put

```text
U=sum_S |S intersect V(J)|,
D=sum_S sum_(z in S) deg_H(z).
```

Orient each component away from its distinguished root.  Every selected
nonroot contributes one upward incidence, so the total number of upward
incidences is exactly `U`.  Map downward incidences to upward incidences as
follows.

For a downward edge `p->c` with `p` selected, if `c` has no selected child,
replace `p` by `c` and charge the upward edge `c->p`.  Otherwise charge the
upward edge from the least selected child of `c` to `c`, without changing
the independent set.  The target recovers the source in the first case by
swapping back, and in the second case by the deterministic least-child rule.
The cases cannot collide: a second-case target retains `parent(c)`, while a
putative first-case preimage would contain adjacent vertices.

Thus downward incidences are injected into upward incidences, and

```text
D <=2U.                                                  (3)
```

The number of one-vertex extensions of an independent four-set `S` is at
least `h-4-sum_(z in S)deg_H(z)`.  Double counting extensions and using
(3) gives

```text
5a5 >=(h-4)a4-2U.                                      (4)
```

## 3. Rooted-forest auxiliary lemma

We prove

```text
2U <=5(a4+b4+b3).                                      (5)
```

Let `q=|R|`, `m=|J|`, and let `A_j` count the independent four-sets of `H`
that contain exactly `j` roots.  Then `A_0=b4` and

```text
U=sum_(j=0)^4 (4-j)A_j.
```

Consequently the slack in (5) is exactly

```text
2b4+5b3-A1+A2+3A3+5A4.                                (6)
```

For an independent set in `J`, each selected vertex forbids at most one
root, because the distinguished roots lie in different components.  It
follows that

```text
A1 <= q b3,
A2 >= C(q-2,2)b2,
A3 >= C(q-1,3)m,
A4 =  C(q,4).                                           (7)
```

If `q<=5`, (6)--(7) prove (5) immediately.  Assume `q>=6`.

### Large `m`

Apply the same downward-to-upward injection to the independent three-sets of
`J`.  If `U_3` is their selected-nonroot count and `D_3` their selected-degree
sum, then

```text
D_3<=2U_3<=6b3.
```

Every independent three-set has at least `m-3-D(S)` one-vertex extensions.
Double counting those extensions therefore gives the self-contained bound

```text
4b4 >=(m-9)b3.                                         (8)
```

If `m>=2q-1`, then

```text
m-9 >=2(q-5),
```

so `2b4>=(q-5)b3`.  Equations (6)--(7) now prove (5).

### Small `m`

Suppose `0<=m<=2q-2`.  Because `J` is a forest,

```text
b3<=C(m,3),             b2>=C(m-1,2)                   (9)
```

for `m>=1`; the case `m=0` is immediate.  Discarding `2b4` from (6), its
remaining lower bound is

```text
L_q(m)=-(q-5)C(m,3)+C(q-2,2)C(m-1,2)
       +3C(q-1,3)m+5C(q,4).                            (10)
```

Regard (10) as a cubic in real `m` on `[1,2q-2]`.  Exact differentiation
gives

```text
L_q'''(m)=5-q<0,
L_q''(1)=(q-3)(q-2)/2>0,
L_q'(1)=(6q^3-39q^2+83q-64)/12>0.                     (11)
```

For `q=6+t`, the numerator in the last expression is

```text
6t^3+69t^2+263t+326,
```

which is positive.  Thus `L_q'` first increases and then decreases, and can
change sign at most once, from positive to negative.  The minimum of `L_q`
on the interval is therefore at an endpoint.  Both endpoints are positive:

```text
L_q(1)=(q-3)(q-2)(q-1)(5q+12)/24,

L_q(2q-2)=(q-2)(21q^3-56q^2+59q-48)/24.              (12)
```

At `q=6+t`, the cubic in the second line is

```text
21t^3+322t^2+1655t+2826.
```

This proves (5) in the remaining case.

## 4. Completion of the edge theorem

Combining (1), (4), and (5),

```text
5i5(T)
 =5a5+10a4+5b4+5b3
 >=(h+6)a4-2U+5b4+5b3
 >=(h+1)a4.
```

This is (2), so every `(1,2)` edge satisfies the rank-five edge-local
inequality.

Together with
`RANK5_EDGE_LOCAL_HIGH_DEGREE_SUM_REDUCTION_2026-08-25.md`, the only
remaining endpoint-degree pairs are

```text
(1,3), (2,2), (1,4), (2,3), (1,5), (2,4), (3,3).
```

## 5. Exact replay and proof boundary

`verify_rank5_edge_local_leaf_degree2_theorem_root.py` replays the cubic,
derivatives, and endpoint factorizations symbolically.  On every requested
nonisomorphic-tree order it also verifies the terminal-path polynomial
identity, constructs the prescribed-root incidence injection literally,
and checks both (5) and the edge-local margin exactly.

The all-order proof is Sections 1--4.  The bounded census is an independent
sanity check, not the reason the theorem holds.
