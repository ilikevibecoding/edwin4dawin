# Rank-five edge-local high-degree-sum reduction

Date: 2026-08-25

Status: **proved all-order theorem**.  This closes every edge whose endpoint
degree-sum is at least seven in the rank-five token-sliding route.  It does
not prove the eight remaining low-degree endpoint types, the full
component-surplus inequality, connected `Q8`, or Erdős Problem 993.

## Theorem

Let `T` be an `n`-vertex tree and let `uv` be an edge.  Put

```text
H_uv = T-(N[u] union N[v]),
h_uv = |H_uv| = n-deg(u)-deg(v),
c_uv = deg(u)+deg(v)-2.
```

If `c_uv>=5`, then

```text
(n-2)(n-3) i4(H_uv) <= 5 h_uv i5(T).                 (1)
```

Thus the rank-five edge-local inequality holds at every edge with
`deg(u)+deg(v)>=7`.

## Proof

If `h_uv<4`, then `i4(H_uv)=0` and (1) is immediate.  Assume henceforth
that `h_uv>=4`.  We first record the elementary coefficientwise
path-minimality lemma

```text
i5(T) >= i5(P_n) = C(n-4,5).                          (2)
```

For completeness, here is a self-contained induction.  Every `m`-vertex
forest `F` can have its components joined by edges to form an `m`-vertex tree
`T'`, so `i_k(F)>=i_k(T')`.  It is therefore enough to induct on trees.  If
`v` is a leaf with neighbor `u`, then

```text
i_k(T)=i_k(T-v)+i_(k-1)(T-{u,v}).
```

The first graph is an `(n-1)`-vertex tree and the second is an `(n-2)`-vertex
forest.  Induction and Pascal's identity give

```text
i_k(T) >= C(n-k,k)+C(n-k,k-1)=C(n-k+1,k).
```

The empty and one-vertex bases are immediate.  This proves the lemma, and
specializing to `k=5` gives (2), without any external theorem dependency.

Trivially,

```text
i4(H_uv) <= C(h_uv,4).                                (3)
```

Because `c_uv>=5`,

```text
h_uv=n-c_uv-2 <= n-7.                                 (4)
```

For integral `h>=4`, the function

```text
C(h,4)/h = (h-1)(h-2)(h-3)/24
```

is increasing.  Hence (2)--(4) reduce (1) to the single endpoint
inequality

```text
(n-2)(n-3) C(n-7,4)/(n-7) <= 5 C(n-4,5).             (5)
```

The assumption `h_uv>=4` and (4) imply `n>=11`.  Clearing the positive
factor `n-7`, the right side minus the left side in (5) is

```text
5(n-7)C(n-4,5)-(n-2)(n-3)C(n-7,4)
 = (n-8)(n-7)(n^3-6n^2-37n+150)/12.                  (6)
```

Writing `n=11+t`, the cubic in (6) is

```text
t^3+27t^2+194t+348,
```

which is strictly positive for every integer `t>=0`.  This proves (1).

## Consequence for the token-sliding target

Let `W=C(n-2,2)`.  The number of token-sliding edges is

```text
|E(TS5(T))| = sum_(uv in E(T)) i4(H_uv).
```

Also

```text
sum_(uv in E(T)) h_uv = 2m2,
```

where `m2` is the number of unordered pairs of disjoint tree edges.
Therefore, if (1) is proved for the remaining edges and summed, it gives

```text
W |E(TS5(T))| <= 5m2 i5(T),
```

which is exactly the component-surplus candidate from
`RANK5_COMPONENT_SURPLUS_TOKEN_SLIDING_REDUCTION_2026-08-25.md`.

The all-order residue now consists only of the endpoint-degree pairs

```text
(1,2),
(1,3), (2,2),
(1,4), (2,3),
(1,5), (2,4), (3,3).
```

The leaf-leaf pair `(1,1)` occurs only in the two-vertex tree and is
irrelevant at rank five.

## Exact replay

`verify_rank5_edge_local_high_degree_sum_reduction_root.py` independently
checks the factorization and its positive shifted cubic.  It also constructs
independence coefficients by a literal rooted-forest dynamic program and
audits every edge of every nonisomorphic tree through the requested bounded
order.  That finite census is diagnostic only for the low-degree residue.

The all-order proof includes the coefficientwise path-minimality induction
used in (2); no external theorem and no bounded computation is used to
establish (1).
